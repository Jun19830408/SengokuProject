/* ==========================================================================
   背中越しの地（WebGL で描く）

   遊ぶ人の申し出：「一人称視点のときの見え方で、川に入っているときの様子が変ですね。ちゃんとリンクさせて
   欲しいのと、川や山、森、林、集落などのオブジェクトもちゃんと一人称で反映してください」。
   背中越しの地は、もとは平らな地（色の帯）に、川と街道を薄い色の帯で重ねただけであった。川には水面も深さも
   無く、兵は川の上に立って見えた。丘や山の高さも無かった。

   ここでは、盤が焼いた地（battle/shinga.js 野を焼く）をそのまま使う。
     地の膚 … 盤の地の画（草・街道・川・森の地・集落の地・湿地。盤で見るのと同じ色）を貼る
     高さ   … 盤の高さの図（battle/naname.js 地の丈。丘・山・川の谷と川床・浅瀬・橋の床）で地を起こす
     水面   … 盤の水面の図（naname.js 水面の丈。川ごとの水位）の高さに、透ける水を張る。地が水面より低い所だけ
   盤と同じ地なので、盤で浅瀬の所は一人視点でも浅瀬（膝ほどの水）で、淵は深い。
   網は二つ：近い網（二m ごと・芯のまわり百六十m 四方。写しが十六m 動けば張り直す）と、遠い網（野の全体と
   その外の六百m。野ごとに一度張る）。遠い網は、近い網の内側を抜いて描く（重ならないように）。
   写しの式は hitori/senaka.js の P と同じ（写しの所・向き・俯き・F）。地を描いた画を、背中越しの画布の
   地のところに重ねる（空は背中越しの画布が先に描く）。
   WebGL が使えない所（試験の場など）では使わない（地のGLで描く が null を返し、背中越しはこれまでどおり
   平らな地を描く）。
   ========================================================================== */
import { FIELD, FORESTS, WOODS } from "../battle/field.js";
import { 地の丈, 水面の丈, 高さ図があるか } from "../battle/naname.js";
import { 木立を据える } from "../battle/mori.js";

const 尺 = 0.46;
const 近の間 = 2, 近の半 = 160, 近の張り直し = 16;          // 近い網：二m ごと、芯から百六十m 四方。芯が十六m 動けば張り直す
const 遠の余白 = 600;                                         // 遠い網：野の外へも六百m 張る（野の縁が地の果てに見えないように）
/* 遠くの木。盤の木立（battle/mori.js 木立を据える）のうち、写しから 木の近 m より遠いものを、ここで縦に立つ板（木の絵）として
   描く（近い木は hitori/senaka.js が兵と前後を比べて描く）。写しのまわり 木の遠 m の木を束ね、写しが 木の張り直し m 動けば束ね直す */
export const 木の近 = 110;
const 木の遠 = 900, 木の張り直し = 220;

/* 影の書き付け（GLSL）。GLSL は英数字の名しか受け付けないので、ここだけは英字で書く。
   頂：世界の所（m）を、hitori/senaka.js の P と同じ式で写す（写しの所 u_cam・前と右 u_dir・俯きの cos と sin u_pc・
   2F/W と 2F/H u_k）。地の膚の所（u_fd：野の寸法 m）・霞までの隔たり・明るさ（法線と日の向き u_L）・近い網の穴の芯（u_hole）
   からの所・水の深さ（a_p.y − a_g。水の網だけ）を渡す */
const 頂の書 = `
attribute vec3 a_p; attribute vec3 a_n; attribute float a_g;
uniform vec3 u_cam; uniform vec4 u_dir; uniform vec2 u_pc; uniform vec2 u_k; uniform vec2 u_nf; uniform vec2 u_fd;
uniform vec2 u_hole; uniform vec3 u_L;
varying vec2 v_uv; varying float v_d; varying float v_sh; varying vec2 v_h; varying float v_dep;
void main() {
  float dx = a_p.x - u_cam.x, dz = a_p.z - u_cam.z, ry = a_p.y - u_cam.y;
  float rx = dx * u_dir.z + dz * u_dir.w;
  float rz = dx * u_dir.x + dz * u_dir.y;
  float yc = ry * u_pc.x + rz * u_pc.y;
  float zc = -ry * u_pc.y + rz * u_pc.x;
  float n = u_nf.x, f = u_nf.y;
  gl_Position = vec4(u_k.x * rx, u_k.y * yc, (f + n) / (f - n) * zc - 2.0 * f * n / (f - n), zc);
  v_uv = vec2(a_p.x / u_fd.x, -a_p.z / u_fd.y);
  v_d = sqrt(dx * dx + dz * dz);
  v_sh = 0.84 + 0.26 * max(dot(normalize(a_n), u_L), 0.0);
  v_h = vec2(a_p.x - u_hole.x, a_p.z - u_hole.y);
  v_dep = a_p.y - a_g;
}`;
const 精 = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;
const 地の書 = `${精}
uniform sampler2D u_tex; uniform vec3 u_haze; uniform float u_hz; uniform float u_holeHalf;
varying vec2 v_uv; varying float v_d; varying float v_sh; varying vec2 v_h; varying float v_dep;
void main() {
  if (u_holeHalf > 0.0 && abs(v_h.x) < u_holeHalf && abs(v_h.y) < u_holeHalf) discard;
  vec3 c = texture2D(u_tex, clamp(v_uv, 0.0, 1.0)).rgb;
  c = mix(c, vec3(dot(c, vec3(0.30, 0.59, 0.11))), 0.22) * 0.9 * v_sh;
  float t = 1.0 - exp(-max(0.0, v_d - 8.0) / u_hz);
  gl_FragColor = vec4(mix(c, u_haze, t), 1.0);
}`;
const 水の書 = `${精}
uniform vec3 u_haze; uniform float u_hz; uniform float u_holeHalf;
varying vec2 v_uv; varying float v_d; varying float v_sh; varying vec2 v_h; varying float v_dep;
void main() {
  if (u_holeHalf > 0.0 && abs(v_h.x) < u_holeHalf && abs(v_h.y) < u_holeHalf) discard;
  if (v_dep < 0.03) discard;
  float deep = clamp(v_dep / 1.3, 0.0, 1.0);
  vec3 c = mix(vec3(0.52, 0.62, 0.62), vec3(0.25, 0.37, 0.45), deep);
  float far = clamp(v_d / 160.0, 0.0, 1.0);
  c = mix(c, vec3(0.70, 0.76, 0.78), far * 0.45);
  float a = mix(0.42, 0.86, deep) * mix(1.0, 0.92, far);
  float t = 1.0 - exp(-max(0.0, v_d - 8.0) / u_hz);
  c = mix(c, u_haze, t);
  gl_FragColor = vec4(c * a, a);
}`;

function 影を組む(gl, 頂, 面) {
  const 作 = (種, 書) => { const s = gl.createShader(種); gl.shaderSource(s, 書); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const e = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(e || "影の書き損じ"); } return s; };
  const p = gl.createProgram();
  gl.attachShader(p, 作(gl.VERTEX_SHADER, 頂)); gl.attachShader(p, 作(gl.FRAGMENT_SHADER, 面));
  gl.bindAttribLocation(p, 0, "a_p"); gl.bindAttribLocation(p, 1, "a_n"); gl.bindAttribLocation(p, 2, "a_g");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "影の結び損じ");
  const u = {};
  for (const n of ["u_cam", "u_dir", "u_pc", "u_k", "u_nf", "u_fd", "u_hole", "u_L", "u_tex", "u_haze", "u_hz", "u_holeHalf"]) u[n] = gl.getUniformLocation(p, n);
  return { p, u };
}

/* 木の板の書き付け。板は写しの右へ広がり（u_right）、真上へ立つ。木の絵は三つの種（〇 杉・一 松・二 広葉）を横に並べた一枚 */
const 木の頂 = `
attribute vec3 a_b; attribute vec2 a_c; attribute vec2 a_s; attribute float a_t;
uniform vec3 u_cam; uniform vec4 u_dir; uniform vec2 u_pc; uniform vec2 u_k; uniform vec2 u_nf;
varying vec2 v_uv; varying float v_d;
void main() {
  vec3 p = a_b + vec3(u_dir.z * a_c.x * a_s.x, a_c.y * a_s.y, u_dir.w * a_c.x * a_s.x);
  float dx = p.x - u_cam.x, dz = p.z - u_cam.z, ry = p.y - u_cam.y;
  float rx = dx * u_dir.z + dz * u_dir.w;
  float rz = dx * u_dir.x + dz * u_dir.y;
  float yc = ry * u_pc.x + rz * u_pc.y;
  float zc = -ry * u_pc.y + rz * u_pc.x;
  float n = u_nf.x, f = u_nf.y;
  gl_Position = vec4(u_k.x * rx, u_k.y * yc, (f + n) / (f - n) * zc - 2.0 * f * n / (f - n), zc);
  v_uv = vec2((a_t + a_c.x + 0.5) / 3.0, 1.0 - a_c.y);
  v_d = length(vec2(a_b.x - u_cam.x, a_b.z - u_cam.z));
}`;
const 木の面 = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_tex; uniform vec3 u_haze; uniform float u_hz; uniform float u_near;
varying vec2 v_uv; varying float v_d;
void main() {
  if (v_d < u_near) discard;
  vec4 c = texture2D(u_tex, v_uv);
  if (c.a < 0.5) discard;
  float t = 1.0 - exp(-max(0.0, v_d - 8.0) / u_hz);
  gl_FragColor = vec4(mix(c.rgb, u_haze, t), 1.0);
}`;
function 木の影を組む(gl) {
  const 作 = (種, 書) => { const s = gl.createShader(種); gl.shaderSource(s, 書); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const e = gl.getShaderInfoLog(s); throw new Error(e || "木の影の書き損じ"); } return s; };
  const p = gl.createProgram();
  gl.attachShader(p, 作(gl.VERTEX_SHADER, 木の頂)); gl.attachShader(p, 作(gl.FRAGMENT_SHADER, 木の面));
  gl.bindAttribLocation(p, 0, "a_b"); gl.bindAttribLocation(p, 1, "a_c"); gl.bindAttribLocation(p, 2, "a_s"); gl.bindAttribLocation(p, 3, "a_t");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "木の影の結び損じ");
  const u = {};
  for (const n of ["u_cam", "u_dir", "u_pc", "u_k", "u_nf", "u_tex", "u_haze", "u_hz", "u_near"]) u[n] = gl.getUniformLocation(p, n);
  return { p, u };
}
/* 木の絵（三つの種を横に並べた一枚）。背中越しの近い木（hitori/senaka.js 木を描く）と同じ形と色 */
function 木の絵を作る(gl) {
  const c = document.createElement("canvas"); c.width = 192; c.height = 128;
  const g = c.getContext("2d");
  const 幹 = (cx, h) => { g.fillStyle = "#463A2C"; g.fillRect(cx - 2, 128 - h, 4, h); };
  // 〇 杉
  幹(32, 46);
  for (let k = 0; k < 5; k++) { const y0 = 128 - (0.22 + k * 0.155) * 128, ww = (1.7 - k * 0.27) / 13 * 128 * 0.9;
    g.fillStyle = k % 2 ? "#3C583E" : "#2C4432"; g.beginPath(); g.moveTo(32 - ww, y0); g.lineTo(32, y0 - 0.3 * 128); g.lineTo(32 + ww, y0); g.closePath(); g.fill(); }
  // 一 松
  幹(96, 100);
  for (let k = 0; k < 3; k++) { const y0 = 128 - (0.5 + k * 0.17) * 128, ww = (2.1 - k * 0.45) / 10 * 128 * 0.95;
    g.fillStyle = k % 2 ? "#3E5C38" : "#34502F"; g.beginPath(); g.ellipse(96 + (k - 1) * 4, y0, Math.min(30, ww), 9, 0, 0, 7); g.fill(); }
  // 二 広葉
  幹(160, 54);
  for (const [ox, oy, r, col] of [[0, 0.6, 0.3, "#4A7038"], [-0.2, 0.5, 0.24, "#426634"], [0.22, 0.52, 0.24, "#466A36"], [0.04, 0.78, 0.22, "#588044"]]) {
    g.fillStyle = col; g.beginPath(); g.arc(160 + ox * 100, 128 - oy * 128, Math.min(31, r * 100), 0, 7); g.fill(); }
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
/* 写しのまわりの木を束ねる（一束一万六千本まで。頂は一本に四つ） */
function 木を束ねる(gl, cx, cz) {
  const 木ら = 木立を据える(), 束ら = [];
  let 頂 = [], 角 = [], 寸 = [], 種 = [];
  const 締める = () => {
    if (!頂.length) return;
    const n = 頂.length / 3, idx = new Uint16Array((n / 4) * 6);
    for (let i = 0, q = 0; i < n; i += 4) { idx[q++] = i; idx[q++] = i + 1; idx[q++] = i + 2; idx[q++] = i + 2; idx[q++] = i + 1; idx[q++] = i + 3; }
    const 束 = (arr) => { const bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); return bf; };
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    束ら.push({ 頂: 束(頂), 角: 束(角), 寸: 束(寸), 種: 束(種), ib, 数: idx.length });
    頂 = []; 角 = []; 寸 = []; 種 = [];
  };
  for (const t of 木ら) {
    const x = t.x * 尺, z = -t.y * 尺;
    if (Math.abs(x - cx) > 木の遠 || Math.abs(z - cz) > 木の遠) continue;
    const y = 地の丈(t.x, t.y) * 尺, h = Math.max(4, (t.丈 || 12) * 0.8), w = h * (t.種 === 2 ? 0.62 : t.種 === 1 ? 0.6 : 0.42), k = t.種 | 0;
    for (const [ax, ay] of [[-0.5, 0], [0.5, 0], [-0.5, 1], [0.5, 1]]) { 頂.push(x, y - 0.2, z); 角.push(ax, ay); 寸.push(w, h); 種.push(k); }
    if (頂.length / 3 >= 64000) 締める();
  }
  締める();
  return { 束ら, cx, cz, 元: 木ら };
}
function 木を捨てる(gl, w) { if (!w) return; for (const b of w.束ら) { gl.deleteBuffer(b.頂); gl.deleteBuffer(b.角); gl.deleteBuffer(b.寸); gl.deleteBuffer(b.種); gl.deleteBuffer(b.ib); } }

let 状 = null, 試みた = false;
function 据える() {
  if (試みた) return 状;
  試みた = true;
  try {
    if (typeof document === "undefined" || typeof WebGLRenderingContext === "undefined") return null;
    const cv = document.createElement("canvas");
    const gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true, depth: true, preserveDrawingBuffer: false })
      || cv.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) return null;
    const 地 = 影を組む(gl, 頂の書, 地の書), 水 = 影を組む(gl, 頂の書, 水の書), 木 = 木の影を組む(gl), 木の絵 = 木の絵を作る(gl);
    const 斜 = gl.getExtension("EXT_texture_filter_anisotropic") || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
    cv.addEventListener && cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); if (状) 状.失 = true; });
    状 = { cv, gl, 地, 水, 木, 木の絵, 木束: null, 斜, 膚: null, 膚の元: null, 膚の版: -1, 遠: null, 遠の鍵: "", 近: null, 失: false, 膚の色: null };
    return 状;
  } catch (e) { 状 = null; if (typeof console !== "undefined") console.warn("背中越しの地（WebGL）を据えられなかった", e && e.message); return null; }
}

/* 網を張る：x0, z0 から nx×nz の頂を間 s で。地（高さ）・法線・水面（無ければ地の一m 下）を量る */
function 網を張る(gl, x0, z0, nx, nz, s) {
  const n = nx * nz, 地 = new Float32Array(n * 7), 水 = new Float32Array(n * 7);
  /* 高さは頂ごとに一度だけ引き、法線は隣の頂の高さから求める（張り直しを軽くする） */
  const 高ら = new Float32Array(n);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) 高ら[j * nx + i] = 地の丈((x0 + i * s) / 尺, -(z0 + j * s) / 尺) * 尺;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * s, z = z0 + j * s, k = (j * nx + i) * 7;
    const h = 高ら[j * nx + i];
    const hx = 高ら[j * nx + Math.min(nx - 1, i + 1)] - 高ら[j * nx + Math.max(0, i - 1)];
    const hz = 高ら[Math.min(nz - 1, j + 1) * nx + i] - 高ら[Math.max(0, j - 1) * nx + i];
    let ax = -hx, ay = 2 * s, az = -hz; const L = Math.hypot(ax, ay, az) || 1; ax /= L; ay /= L; az /= L;
    地[k] = x; 地[k + 1] = h; 地[k + 2] = z; 地[k + 3] = ax; 地[k + 4] = ay; 地[k + 5] = az; 地[k + 6] = h;
    const w = 水面の丈(x / 尺, -z / 尺);
    水[k] = x; 水[k + 1] = w == null ? h - 1 : w * 尺; 水[k + 2] = z; 水[k + 3] = 0; 水[k + 4] = 1; 水[k + 5] = 0; 水[k + 6] = h;
  }
  const idx = new Uint16Array((nx - 1) * (nz - 1) * 6);
  let q = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d;
  }
  const 束 = (arr) => { const bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); return bf; };
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  return { 地: 束(地), 水: 束(水), ib, 数: idx.length };
}
function 網を捨てる(gl, m) { if (!m) return; gl.deleteBuffer(m.地); gl.deleteBuffer(m.水); gl.deleteBuffer(m.ib); }

/* 地の膚：盤の地の画を、二の冪の寸法に写して貼る（遠くまで滑らかにするため mipmap を作る）。
   同じ画から、粗い写し（色を引くための小さな画素の並び）も控える（地の色：草を生やすか決めるのに使う） */
function 膚を貼る(st, 画) {
  const gl = st.gl;
  const 冪 = (v) => { let p = 256; while (p < v && p < 2048) p *= 2; return p; };
  const tw = 冪(画.width), th = 冪(画.height);
  const c = document.createElement("canvas"); c.width = tw; c.height = th;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = true; if ("imageSmoothingQuality" in g) g.imageSmoothingQuality = "high";
  g.drawImage(画, 0, 0, tw, th);
  if (!st.膚) st.膚 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, st.膚);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (st.斜) gl.texParameterf(gl.TEXTURE_2D, st.斜.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(st.斜.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1));
  /* 色を引くための粗い写し（一画素およそ三m） */
  const sw = Math.max(16, Math.min(1024, Math.round(FIELD.w * 尺 / 3))), sh = Math.max(16, Math.min(1024, Math.round(FIELD.h * 尺 / 3)));
  const s = document.createElement("canvas"); s.width = sw; s.height = sh;
  const sg = s.getContext("2d"); sg.drawImage(画, 0, 0, sw, sh);
  try { st.膚の色 = { 画素: sg.getImageData(0, 0, sw, sh).data, w: sw, h: sh }; } catch (e) { st.膚の色 = null; }
}

/* 地の色（盤の地の画から）。x, z は世界の所（m）。[r, g, b] か null */
export function 地の色(x, z) {
  const c = 状 && 状.膚の色; if (!c) return null;
  const i = Math.max(0, Math.min(c.w - 1, Math.floor(x / 尺 / FIELD.w * c.w))), j = Math.max(0, Math.min(c.h - 1, Math.floor(-z / 尺 / FIELD.h * c.h)));
  const k = (j * c.w + i) * 4, d = c.画素;
  return [d[k], d[k + 1], d[k + 2]];
}

/* 地を描く。写し（C：senaka.js 写しを据える の C）と画布の寸法で、地と水を描いた画布を返す。使えなければ null。
   画 … 盤の地の画（BattleScreen の terrainRef）。版 … 盤の地の画を貼り直した数（変われば膚を貼り直す） */
export function 地のGLで描く(C, W, H, F, dpr, 画, 版) {
  if (!高さ図があるか() || !画 || !(画.width > 0)) return null;
  const st = 据える(); if (!st || st.失) return null;
  const gl = st.gl;
  try {
    /* 地の画は細かすぎなくてよい（兵は背中越しの画布が細かく描く）。画素の倍は一.五まで、画素の数は二百五十万まで */
    let 倍 = Math.min(dpr, 1.5); if (W * H * 倍 * 倍 > 2.5e6) 倍 = Math.sqrt(2.5e6 / (W * H));
    const pw = Math.max(1, Math.round(W * 倍)), ph = Math.max(1, Math.round(H * 倍));
    if (st.cv.width !== pw || st.cv.height !== ph) { st.cv.width = pw; st.cv.height = ph; }
    if (st.膚の元 !== 画 || st.膚の版 !== 版) { 膚を貼る(st, 画); st.膚の元 = 画; st.膚の版 = 版; 網を捨てる(gl, st.遠); st.遠 = null; 網を捨てる(gl, st.近); st.近 = null; 木を捨てる(gl, st.木束); st.木束 = null; }
    /* 遠い網（野ごとに一度） */
    const Wm = FIELD.w * 尺, Hm = FIELD.h * 尺;
    const 遠鍵 = `${Math.round(Wm)}:${Math.round(Hm)}:${版}`;
    if (!st.遠 || st.遠の鍵 !== 遠鍵) {
      網を捨てる(gl, st.遠);
      const 幅 = Wm + 遠の余白 * 2, 奥 = Hm + 遠の余白 * 2;
      let s = 16; while ((Math.ceil(幅 / s) + 1) * (Math.ceil(奥 / s) + 1) > 65000) s += 4;
      const x0 = Math.floor(-遠の余白 / s) * s, z0 = Math.floor((-Hm - 遠の余白) / s) * s;
      st.遠 = 網を張る(gl, x0, z0, Math.ceil(幅 / s) + 2, Math.ceil(奥 / s) + 2, s);
      st.遠の鍵 = 遠鍵;
    }
    /* 近い網：写しの前四十m を芯に。芯は 近の間 の目に揃える（頂が地に据わったまま、網だけが入れ替わる） */
    const 芯x = Math.round((C.x + C.fx * 40) / 近の間) * 近の間, 芯z = Math.round((C.z + C.fz * 40) / 近の間) * 近の間;
    if (!st.近 || Math.hypot(芯x - st.近.cx, 芯z - st.近.cz) > 近の張り直し) {
      網を捨てる(gl, st.近);
      const n = Math.round(近の半 * 2 / 近の間) + 1;
      st.近 = { ...網を張る(gl, 芯x - 近の半, 芯z - 近の半, n, n, 近の間), cx: 芯x, cz: 芯z };
    }
    gl.viewport(0, 0, pw, ph);
    gl.clearColor(0, 0, 0, 0); gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    const 霞 = [198 / 255, 202 / 255, 200 / 255];
    /* 霞の尺（m）。地に立てば二百六十m で六割ほど霞む。盤から降りてくる途中の高い写しでは、高さに応じて薄める
       （高いところから見下ろすと、地はどこも遠いので、地べたの尺のままでは一面が白く霞んだ） */
    const 霞尺 = 260 + Math.max(0, C.h - 6) * 6;
    const L = [-0.42, 0.78, 0.46]; { const l = Math.hypot(...L); L[0] /= l; L[1] /= l; L[2] /= l; }
    const 共 = (P) => {
      gl.useProgram(P.p);
      gl.uniform3f(P.u.u_cam, C.x, C.h, C.z);
      gl.uniform4f(P.u.u_dir, C.fx, C.fz, C.rx, C.rz);
      gl.uniform2f(P.u.u_pc, C.cs, C.sn);
      gl.uniform2f(P.u.u_k, 2 * F / W, 2 * F / H);
      gl.uniform2f(P.u.u_nf, 0.3, 9000);
      gl.uniform2f(P.u.u_fd, Wm, Hm);
      gl.uniform3f(P.u.u_L, L[0], L[1], L[2]);
      gl.uniform3f(P.u.u_haze, 霞[0], 霞[1], 霞[2]);
      gl.uniform1f(P.u.u_hz, 霞尺);
    };
    const 網を描く = (P, m, 水か, 穴) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, 水か ? m.水 : m.地);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
      gl.uniform2f(P.u.u_hole, st.近.cx, st.近.cz);
      gl.uniform1f(P.u.u_holeHalf, 穴 ? 近の半 - 近の間 : 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
      gl.drawElements(gl.TRIANGLES, m.数, gl.UNSIGNED_SHORT, 0);
    };
    /* 地 */
    共(st.地);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, st.膚); gl.uniform1i(st.地.u.u_tex, 0);
    gl.disable(gl.BLEND); gl.depthMask(true);
    網を描く(st.地, st.遠, false, true);
    網を描く(st.地, st.近, false, false);
    /* 遠くの木（木の近 m より遠いもの。近いものは背中越しの側が描く） */
    if (FORESTS.length || WOODS.length) {
      if (!st.木束 || st.木束.元 !== 木立を据える() || Math.hypot(C.x - st.木束.cx, C.z - st.木束.cz) > 木の張り直し) { 木を捨てる(gl, st.木束); st.木束 = 木を束ねる(gl, C.x, C.z); }
      const T = st.木; gl.useProgram(T.p);
      gl.uniform3f(T.u.u_cam, C.x, C.h, C.z); gl.uniform4f(T.u.u_dir, C.fx, C.fz, C.rx, C.rz); gl.uniform2f(T.u.u_pc, C.cs, C.sn);
      gl.uniform2f(T.u.u_k, 2 * F / W, 2 * F / H); gl.uniform2f(T.u.u_nf, 0.3, 9000);
      gl.uniform3f(T.u.u_haze, 霞[0], 霞[1], 霞[2]); gl.uniform1f(T.u.u_hz, 霞尺); gl.uniform1f(T.u.u_near, 木の近);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, st.木の絵); gl.uniform1i(T.u.u_tex, 0);
      gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2);
      for (const B of st.木束.束ら) {
        gl.bindBuffer(gl.ARRAY_BUFFER, B.頂); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, B.角); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, B.寸); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, B.種); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.ib);
        gl.drawElements(gl.TRIANGLES, B.数, gl.UNSIGNED_SHORT, 0);
      }
      gl.disableVertexAttribArray(3);
    }
    /* 水（透かして重ねる。地の深さは書かない） */
    共(st.水);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    網を描く(st.水, st.遠, true, true);
    網を描く(st.水, st.近, true, false);
    gl.depthMask(true); gl.disable(gl.BLEND);
    return st.cv;
  } catch (e) {
    st.失 = true;
    if (typeof console !== "undefined") console.warn("背中越しの地（WebGL）を描けなかった", e && e.message);
    return null;
  }
}
/* WebGL の地を使えるか（はじめて呼ばれたときに画布を作って確かめる） */
export function 地のGLが使えるか() { const st = 据える(); return !!(st && !st.失); }
/* 試し・撮る道具の覗き口：WebGL の地を使っているか */
export const 地のGLの様子 = () => (状 ? { 使える: !状.失, 近: !!状.近, 遠: !!状.遠, 膚: !!状.膚 } : null);
