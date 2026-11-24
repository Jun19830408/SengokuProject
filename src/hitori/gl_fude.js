/* ==========================================================================
   GL筆（背中越しの立つもの——兵・木・家・葦・城の造作・矢玉——を WebGL で塗る筆）

   遊ぶ人の申し出：「写真の状況になった場合、一人称視点がめちゃくちゃ重くなります。できるだけ画質等を落とさずに、
   重くならないように工夫できませんか？」「そもそも、1000人〜2000人程度の戦さなので、これがもっと増えても耐えられる
   ようにしてほしいです」。

   背中越しの立つものは、一人ずつ多角形と線を 2D の画布（CanvasRenderingContext2D）に塗っていた。両軍が噛み合って
   千人ほどが目に入ると、一コマに塗り（fill）がおよそ二千八百、線（stroke）がおよそ二千二百になり、試しの頁（WebGL を
   使わせず、CPU の使い道を量った）では、一コマの重さのおよそ半ばが画素を埋める手間であった。この手間は目に入る兵の
   数と重なりにつれて増える。

   ここでは、2D の画布の筆のうち背中越しが使う分だけを真似る筆を WebGL の上に作る。道（moveTo・lineTo・二次曲線・
   円・楕円・矩形）を組み立て、塗り（fill）は三角形に、線（stroke）は幅のある帯に変えて、一コマぶんを一つの束に
   まとめ、GPU に一度に塗らせる。描く手順（何をどの色でどの順に塗るか）は 2D の画布のときと同じ（hitori/senaka.js・
   ningyo.js・yadama.js・shiro_senaka.js はそのまま）なので、絵柄は変わらない。違うのは縁の滑らかさの出し方だけで、
   2D の画布の縁取りの代わりに WebGL の多重標本（MSAA）で滑らかにする。

   真似る分：beginPath・moveTo・lineTo・quadraticCurveTo・bezierCurveTo・arc・ellipse・rect・closePath・fill・stroke・
   fillRect・clearRect・clip（矩形の切り抜き。背中越しは丘の陰と水面で矩形だけを使う）・save・restore・setTransform・
   translate・scale・rotate・globalAlpha・fillStyle・strokeStyle（CSS の色と、線形・円形の濃淡）・lineWidth・lineCap・
   lineJoin・miterLimit・setLineDash・drawImage（画布の絵と、下の 層）。
   層（薄めて描く兵を一度濃く描いて、まとめて薄めて重ねる別の画布。hitori/senaka.js 層を用意する）は、WebGL の
   別の描き先（フレームバッファ）で真似る。

   一画素より細い線（遠くの槍・旗竿など）は、一画素の幅で細さの割だけ薄く引く（2D の画布と同じ見え方にするため）。

   WebGL2 が使えない端末・試し（jsdom）では作れない（GL筆を作る が null を返す）ので、これまでどおり 2D の画布で描く。
   また、GL筆が 2D の画布より速いかは端末で違う（GPU の力、GL の絵を 2D の画布へ移す手間、JavaScript の速さによる）ので、
   兵の多いコマで両方を短く使って量り、速い方に決める（下の 筆の選び手）。
   ========================================================================== */

const 頂の幅 = 3;                                   // 一頂点：x・y（f32）、色（RGBA 八ビット四つを u32 に詰めて）
const 二π = Math.PI * 2;

/* ---------- 色 ---------- */
const 色の控え = new Map();
const 名の色 = { black: [0, 0, 0, 1], white: [1, 1, 1, 1], transparent: [0, 0, 0, 0], red: [1, 0, 0, 1] };
let 読み筆 = null;
function 色を読み解く(s) {
  s = String(s).trim();
  if (s[0] === "#") {
    const h = s.slice(1);
    const 十六 = (i, n) => parseInt(h.substr(i, n), 16) / (n === 1 ? 15 : 255);
    if (h.length === 3) return [十六(0, 1), 十六(1, 1), 十六(2, 1), 1];
    if (h.length === 4) return [十六(0, 1), 十六(1, 1), 十六(2, 1), 十六(3, 1)];
    if (h.length === 6) return [十六(0, 2), 十六(2, 2), 十六(4, 2), 1];
    if (h.length === 8) return [十六(0, 2), 十六(2, 2), 十六(4, 2), 十六(6, 2)];
  }
  const m = /^rgba?\(\s*([-+\d.eE]+)\s*,\s*([-+\d.eE]+)\s*,\s*([-+\d.eE]+)\s*(?:,\s*([-+\d.eE]+%?)\s*)?\)$/.exec(s);
  if (m) {
    const 限 = (v) => Math.min(1, Math.max(0, v));
    let a = m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [限(parseFloat(m[1]) / 255), 限(parseFloat(m[2]) / 255), 限(parseFloat(m[3]) / 255), 限(a)];
  }
  const 名 = 名の色[s.toLowerCase()]; if (名) return 名;
  /* そのほかの書き方は、2D の画布に読ませて #rrggbb か rgba() に直してから読む */
  try {
    if (!読み筆 && typeof document !== "undefined") 読み筆 = document.createElement("canvas").getContext("2d");
    if (読み筆) { 読み筆.fillStyle = "#000"; 読み筆.fillStyle = s; const t = 読み筆.fillStyle; if (t !== s) return 色を読み解く(t); }
  } catch (e) { /* 読めなければ黒 */ }
  return [0, 0, 0, 1];
}
/* CSS の色の文字を [r, g, b, a]（〇〜一、まっすぐの濃さ）に。同じ文字は控えから返す */
export function 色を解く(s) {
  let c = 色の控え.get(s);
  if (c) return c;
  c = 色を読み解く(s);
  if (色の控え.size > 6000) 色の控え.clear();
  色の控え.set(s, c);
  return c;
}
/* 色と濃さを、頂点に入れる u32（掛け合わせ済みの RGBA、小さい桁から R・G・B・A）に詰める */
const 詰める = (r, g, b, a) => {
  const A = Math.max(0, Math.min(1, a));
  return ((Math.round(A * 255) << 24) | (Math.round(b * A * 255) << 16) | (Math.round(g * A * 255) << 8) | Math.round(r * A * 255)) >>> 0;
};

/* 色の手（詰めた数か、所から色を取る手続き）を k 倍だけ薄める（掛け合わせ済みなので四つとも k 倍） */
function 薄める(色, k) {
  if (typeof 色 === "number") {
    const r = 色 & 255, g = (色 >>> 8) & 255, b = (色 >>> 16) & 255, a = (色 >>> 24) & 255;
    if (!(a * k >= 0.13)) return null;
    return ((Math.round(a * k) << 24) | (Math.round(b * k) << 16) | (Math.round(g * k) << 8) | Math.round(r * k)) >>> 0;
  }
  return (x, y) => 薄める(色(x, y), k) || 0;
}

/* ---------- 濃淡（線形・円形） ---------- */
class 濃淡 {
  constructor(種, a) { this.種 = 種; this.a = a; this.止め = []; }
  addColorStop(t, c) { this.止め.push([Math.min(1, Math.max(0, +t)), 色を解く(c)]); this.止め.sort((p, q) => p[0] - q[0]); }
  /* 利用者の座標 (x, y) での色 */
  色(x, y) {
    const a = this.a, 止 = this.止め; let t;
    if (!止.length) return [0, 0, 0, 0];
    if (this.種 === "線") { const dx = a[2] - a[0], dy = a[3] - a[1], L2 = dx * dx + dy * dy; t = L2 > 0 ? ((x - a[0]) * dx + (y - a[1]) * dy) / L2 : 0; }
    else { const d = Math.hypot(x - a[3], y - a[4]); t = a[5] - a[2] !== 0 ? (d - a[2]) / (a[5] - a[2]) : 1; }
    t = Math.min(1, Math.max(0, t));
    if (t <= 止[0][0]) return 止[0][1];
    for (let i = 1; i < 止.length; i++) {
      if (t <= 止[i][0]) {
        const [t0, c0] = 止[i - 1], [t1, c1] = 止[i], u = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
        return [c0[0] + (c1[0] - c0[0]) * u, c0[1] + (c1[1] - c0[1]) * u, c0[2] + (c1[2] - c0[2]) * u, c0[3] + (c1[3] - c0[3]) * u];
      }
    }
    return 止[止.length - 1][1];
  }
}

/* ---------- 頂点の束（描く順に積み、描き先・絵ごとに流す） ---------- */
class 束 {
  constructor() { this.n = 0; this.大 = 0; this.広げる(1 << 16); }
  広げる(要) {
    let 大 = this.大 || 1 << 16; while (大 < 要) 大 *= 2;
    if (大 === this.大) return;
    const buf = new ArrayBuffer(大 * 頂の幅 * 4), f = new Float32Array(buf), u = new Uint32Array(buf);
    if (this.f) f.set(this.f.subarray(0, this.n * 頂の幅));
    this.buf = buf; this.f = f; this.u = u; this.大 = 大;
  }
  頂(x, y, c) {
    if (this.n >= this.大) this.広げる(this.n + 1);
    const i = this.n * 頂の幅; this.f[i] = x; this.f[i + 1] = y; this.u[i + 2] = c; this.n++;
  }
}

/* ---------- 道（組み立て中の形。点は描き先の画素で持つ） ---------- */
class 道 {
  /* 点（x・y）と、区（moveTo で始まる一続きの線）の始めの番・閉じたか。beginPath ごとに数を〇に戻して使い回す */
  constructor() { this.x = new Float64Array(1024); this.y = new Float64Array(1024); this.n = 0; this.始 = new Int32Array(64); this.閉 = new Uint8Array(64); this.k = 0; this.戻 = false; this.rx = 0; this.ry = 0; }
  空に() { this.n = 0; this.k = 0; this.戻 = false; }
  点を足す(x, y) {
    if (this.n >= this.x.length) { const nx = new Float64Array(this.x.length * 2), ny = new Float64Array(this.y.length * 2); nx.set(this.x); ny.set(this.y); this.x = nx; this.y = ny; }
    this.x[this.n] = x; this.y[this.n] = y; this.n++;
  }
  区を始める(x, y) {
    if (this.k >= this.始.length) { const a = new Int32Array(this.始.length * 2), c = new Uint8Array(this.始.length * 2); a.set(this.始); c.set(this.閉); this.始 = a; this.閉 = c; }
    this.始[this.k] = this.n; this.閉[this.k] = 0; this.k++; this.点を足す(x, y); this.戻 = false;
  }
  /* いまの区に点を足す（区が無いか、閉じたあとなら、閉じた区の始めから新たな区を始める） */
  続ける(x, y) {
    if (!this.k) { this.区を始める(x, y); return; }
    if (this.戻) this.区を始める(this.rx, this.ry);
    this.点を足す(x, y);
  }
  /* いまの区を閉じる（2D の画布と同じく、このあとに足す線は閉じた区の始めから引く） */
  閉じる() { const k = this.k - 1; if (k < 0) return; this.閉[k] = 1; this.戻 = true; this.rx = this.x[this.始[k]]; this.ry = this.y[this.始[k]]; }
}

/* ---------- 形を三角形にする（点は xs・ys の o 番から n 個） ---------- */
/* 凸か（向きの揃い。並びの点がほぼ一直線のところは見ない） */
function 凸か(xs, ys, o, n) {
  let 符 = 0;
  for (let i = 0; i < n; i++) {
    const i1 = i + 1 < n ? i + 1 : i + 1 - n, i2 = i + 2 < n ? i + 2 : i + 2 - n;
    const ax = xs[o + i], ay = ys[o + i], bx = xs[o + i1], by = ys[o + i1], cx = xs[o + i2], cy = ys[o + i2];
    const cr = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
    if (Math.abs(cr) < 1e-9) continue;
    const s = cr > 0 ? 1 : -1;
    if (!符) 符 = s; else if (s !== 符) return false;
  }
  return true;
}
/* 耳を切る（凸でない形）。切れなければ扇に戻す。返すのは三つ組の番（〇から n−一）の並び */
function 耳を切る(xs0, ys0, o, n) {
  const xs = [], ys = [], 番 = [];
  for (let i = 0; i < n; i++) { xs.push(xs0[o + i]); ys.push(ys0[o + i]); 番.push(i); }
  let 面 = 0; for (let i = 0; i < n; i++) { const j = (i + 1) % n; 面 += xs[i] * ys[j] - xs[j] * ys[i]; }
  const 向 = 面 >= 0 ? 1 : -1, 三 = [];
  const 内か = (px, py, a, b, c) => {
    const d1 = (px - xs[b]) * (ys[a] - ys[b]) - (xs[a] - xs[b]) * (py - ys[b]);
    const d2 = (px - xs[c]) * (ys[b] - ys[c]) - (xs[b] - xs[c]) * (py - ys[c]);
    const d3 = (px - xs[a]) * (ys[c] - ys[a]) - (xs[c] - xs[a]) * (py - ys[a]);
    const 負 = d1 < 0 || d2 < 0 || d3 < 0, 正 = d1 > 0 || d2 > 0 || d3 > 0;
    return !(負 && 正);
  };
  let 守 = n * n + 8;
  while (番.length > 3 && 守-- > 0) {
    let 切った = false;
    for (let k = 0; k < 番.length; k++) {
      const a = 番[(k + 番.length - 1) % 番.length], b = 番[k], c = 番[(k + 1) % 番.length];
      const cr = ((xs[b] - xs[a]) * (ys[c] - ys[b]) - (ys[b] - ys[a]) * (xs[c] - xs[b])) * 向;
      if (cr <= 0) continue;
      let 入る = false;
      for (const q of 番) { if (q === a || q === b || q === c) continue; if (内か(xs[q], ys[q], a, b, c)) { 入る = true; break; } }
      if (入る) continue;
      三.push(a, b, c); 番.splice(k, 1); 切った = true; break;
    }
    if (!切った) break;
  }
  if (番.length === 3) 三.push(番[0], 番[1], 番[2]);
  else if (番.length > 3) for (let k = 1; k + 1 < 番.length; k++) 三.push(番[0], 番[k], 番[k + 1]);   // 切れ残り（ねじれた形）は扇で
  return 三;
}
/* 多角形を矩形 r（x0, y0, x1, y1）で切る（Sutherland–Hodgman）。返すのは新しい並び [xs, ys] */
function 矩で切る(xs, ys, o, n, r) {
  let px = [], py = [];
  for (let i = 0; i < n; i++) { px.push(xs[o + i]); py.push(ys[o + i]); }
  const 辺 = [[0, r[0], 1], [0, r[2], -1], [1, r[1], 1], [1, r[3], -1]];   // [軸, 値, 内の向き]
  for (const [軸, 値, 向] of 辺) {
    const ox = [], oy = [], m = px.length; if (!m) break;
    const 内 = (i) => ((軸 === 0 ? px[i] : py[i]) - 値) * 向 >= 0;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m, ii = 内(i), jj = 内(j);
      if (ii) { ox.push(px[i]); oy.push(py[i]); }
      if (ii !== jj) {
        const a = 軸 === 0 ? px[i] : py[i], b = 軸 === 0 ? px[j] : py[j], u = (値 - a) / (b - a);
        ox.push(px[i] + (px[j] - px[i]) * u); oy.push(py[i] + (py[j] - py[i]) * u);
      }
    }
    px = ox; py = oy;
  }
  return [px, py];
}

/* ---------- 描き手（GL の文脈・陰影の手順・描き先） ---------- */
const 塗りの頂 = `attribute vec2 a_p; attribute vec4 a_c; uniform vec2 u_r; varying vec4 v_c;
void main(){ gl_Position = vec4(a_p.x / u_r.x * 2.0 - 1.0, 1.0 - a_p.y / u_r.y * 2.0, 0.0, 1.0); v_c = a_c; }`;
const 塗りの片 = `precision mediump float; varying vec4 v_c; void main(){ gl_FragColor = v_c; }`;
const 絵の頂 = `attribute vec2 a_p; attribute vec2 a_t; uniform vec2 u_r; varying vec2 v_t;
void main(){ gl_Position = vec4(a_p.x / u_r.x * 2.0 - 1.0, 1.0 - a_p.y / u_r.y * 2.0, 0.0, 1.0); v_t = a_t; }`;
const 絵の片 = `precision mediump float; varying vec2 v_t; uniform sampler2D u_s; uniform float u_a; void main(){ gl_FragColor = texture2D(u_s, v_t) * u_a; }`;

function 手順を作る(gl, 頂, 片) {
  const 作 = (種, 文) => { const s = gl.createShader(種); gl.shaderSource(s, 文); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "影を作れない"); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, 作(gl.VERTEX_SHADER, 頂)); gl.attachShader(p, 作(gl.FRAGMENT_SHADER, 片));
  gl.bindAttribLocation(p, 0, "a_p");                         // 所は二つの手順で揃える（〇 所・一 色か絵の座標）
  if (/a_c/.test(頂)) gl.bindAttribLocation(p, 1, "a_c"); else gl.bindAttribLocation(p, 1, "a_t");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "手順を結べない");
  return p;
}

class 描き手 {
  constructor(canvas, gl, gl2) {
    this.canvas = canvas; this.gl = gl; this.gl2 = gl2; this.失 = false;
    this.塗り = 手順を作る(gl, 塗りの頂, 塗りの片);
    this.絵 = 手順を作る(gl, 絵の頂, 絵の片);
    this.塗りの所 = { p: gl.getAttribLocation(this.塗り, "a_p"), c: gl.getAttribLocation(this.塗り, "a_c"), r: gl.getUniformLocation(this.塗り, "u_r") };
    this.絵の所 = { p: gl.getAttribLocation(this.絵, "a_p"), t: gl.getAttribLocation(this.絵, "a_t"), r: gl.getUniformLocation(this.絵, "u_r"), s: gl.getUniformLocation(this.絵, "u_s"), a: gl.getUniformLocation(this.絵, "u_a") };
    this.vb = gl.createBuffer(); this.tb = gl.createBuffer();
    this.束 = new 束(); this.的 = null; this.絵の控え = new WeakMap();
    this.標本 = gl2 ? Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0) : 0;
    canvas.addEventListener && canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault && e.preventDefault(); this.失 = true; });
  }
  /* 描き先を替える（積んだ頂点は前の描き先へ流してから） */
  的にする(的) { if (this.的 !== 的) { this.流す(); this.的 = 的; } }
  的を結ぶ(的) {
    const gl = this.gl;
    if (!的) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height); return [this.canvas.width, this.canvas.height]; }
    if (!的.解fb) this.層の資を作る(的);
    gl.bindFramebuffer(gl.FRAMEBUFFER, 的.描fb); gl.viewport(0, 0, 的.w, 的.h); 的.汚 = true; return [的.w, 的.h];
  }
  /* 積んだ三角形を、いまの描き先へ一度に塗る */
  流す() {
    const b = this.束; if (!b.n || this.失) { b.n = 0; return; }
    const gl = this.gl, s = this.塗りの所;
    const [w, h] = this.的を結ぶ(this.的);
    gl.useProgram(this.塗り);
    gl.uniform2f(s.r, w, h);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
    gl.bufferData(gl.ARRAY_BUFFER, b.f.subarray(0, b.n * 頂の幅), gl.STREAM_DRAW);
    gl.enableVertexAttribArray(s.p); gl.vertexAttribPointer(s.p, 2, gl.FLOAT, false, 頂の幅 * 4, 0);
    gl.enableVertexAttribArray(s.c); gl.vertexAttribPointer(s.c, 4, gl.UNSIGNED_BYTE, true, 頂の幅 * 4, 8);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, b.n);
    gl.disableVertexAttribArray(s.c);
    b.n = 0;
  }
  /* 層（別の描き先）。多重標本の描き先に塗り、重ねる前に絵（テクスチャ）へ移す。GL の資（テクスチャ・描き先）は、
     初めて塗るときに作る（薄めて描く兵がいなければ作らない） */
  層を作る(w, h) { return { w, h, 汚: false, tex: null, 解fb: null, 描fb: null, rb: null }; }
  層の資を作る(層) {
    const gl = this.gl, w = 層.w, h = 層.h;
    層.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, 層.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    層.解fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, 層.解fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, 層.tex, 0);
    if (this.標本 > 1) {
      層.rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, 層.rb);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.標本, gl.RGBA8, w, h);
      層.描fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, 層.描fb);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, 層.rb);
    } else 層.描fb = 層.解fb;
    /* 作ったばかりの描き先は空にしておく */
    gl.bindFramebuffer(gl.FRAMEBUFFER, 層.描fb); gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (層.描fb !== 層.解fb) { gl.bindFramebuffer(gl.FRAMEBUFFER, 層.解fb); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  層を捨てる(層) {
    const gl = this.gl; if (!層 || !層.解fb) return;
    if (層.rb) { gl.deleteRenderbuffer(層.rb); gl.deleteFramebuffer(層.描fb); }
    gl.deleteFramebuffer(層.解fb); gl.deleteTexture(層.tex);
    層.tex = 層.解fb = 層.描fb = 層.rb = null;
  }
  /* 描き先（null なら画布）の矩形を消す（画素。上が〇） */
  消す(的, x0, y0, x1, y1) {
    if (的 && !的.解fb) return;                          // まだ塗っていない層は空のまま
    this.的にする(的); this.流す();
    const gl = this.gl, [w, h] = this.的を結ぶ(的);
    const a = Math.max(0, Math.floor(x0)), b = Math.max(0, Math.floor(y0)), c = Math.min(w, Math.ceil(x1)), d = Math.min(h, Math.ceil(y1));
    if (c <= a || d <= b) return;
    gl.enable(gl.SCISSOR_TEST); gl.scissor(a, h - d, c - a, d - b);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.disable(gl.SCISSOR_TEST);
  }
  /* 絵（テクスチャ）を、四隅 q（画素の [x, y] を四つ。左上・右上・右下・左下）に、uv（同じ順）で重ねる */
  絵を重ねる(的, tex, q, uv, 濃) {
    this.的にする(的); this.流す();
    const gl = this.gl, s = this.絵の所, [w, h] = this.的を結ぶ(的);
    gl.useProgram(this.絵); gl.uniform2f(s.r, w, h); gl.uniform1i(s.s, 0); gl.uniform1f(s.a, 濃);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    const d = new Float32Array([q[0][0], q[0][1], uv[0][0], uv[0][1], q[1][0], q[1][1], uv[1][0], uv[1][1], q[2][0], q[2][1], uv[2][0], uv[2][1],
      q[0][0], q[0][1], uv[0][0], uv[0][1], q[2][0], q[2][1], uv[2][0], uv[2][1], q[3][0], q[3][1], uv[3][0], uv[3][1]]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tb); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(s.p); gl.vertexAttribPointer(s.p, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(s.t); gl.vertexAttribPointer(s.t, 2, gl.FLOAT, false, 16, 8);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(s.t);
  }
  /* 画布の絵をテクスチャに（同じ絵は一度だけ移す。背中越しの矢玉の煙の絵は、作ったあと描き替えない） */
  絵のテクスチャ(img) {
    let o = this.絵の控え.get(img);
    if (o && o.w === img.width && o.h === img.height) return o;
    const gl = this.gl;
    if (!o) o = { tex: gl.createTexture() };
    o.w = img.width; o.h = img.height;
    gl.bindTexture(gl.TEXTURE_2D, o.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.絵の控え.set(img, o);
    return o;
  }
  /* 層の多重標本の描き先を、絵（テクスチャ）へ移す。移すのは矩形（画素。上が〇）x0, y0, x1, y1 の内だけ
     （層を重ねるときは描いた兵の囲みだけを読むので、層ぜんたいを移さない） */
  層を解く(層, x0 = 0, y0 = 0, x1 = 層.w, y1 = 層.h) {
    this.的にする(層); this.流す();
    if (!層.rb || !層.汚) return;
    const gl = this.gl, h = 層.h;
    const a = Math.max(0, Math.floor(x0) - 1), b = Math.max(0, Math.floor(y0) - 1), c = Math.min(層.w, Math.ceil(x1) + 1), d = Math.min(h, Math.ceil(y1) + 1);
    if (c <= a || d <= b) return;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, 層.描fb); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, 層.解fb);
    gl.blitFramebuffer(a, h - d, c, h - b, a, h - d, c, h - b, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}

/* ---------- 筆（2D の画布の筆を真似る） ---------- */
/* 一コマに数千の塗りと線を受けるので、受けるたびに新しい配列や物を作らない（下書きの配列・姿勢の積みは使い回す）。
   作るたびの手間と、捨てたものの掃除（ガベージコレクション）が、塗りそのものより重くなるため */
class 筆 {
  constructor(手, 的, 寸) {
    this.手 = 手; this.的 = 的; this.寸 = 寸;          // 寸 … { width, height }（描き先の画素）
    this.道 = new 道(); this.積み = []; this.深 = 0;
    this.m = new Float64Array(6);
    this.lx = new Float64Array(256); this.ly = new Float64Array(256);   // 線の下書き（重なった点を除いた点）
    this.法 = new Float64Array(1024);                                    // 線の区ごとの向きと法線
    this.四x = new Float64Array(4); this.四y = new Float64Array(4);     // 矩形の四隅
    this.前の様 = null; this.前の色 = null;
    this.既に戻す();
    this.GL筆 = true;
  }
  get canvas() { return this.寸; }
  既に戻す() {
    const m = this.m; m[0] = 1; m[1] = 0; m[2] = 0; m[3] = 1; m[4] = 0; m[5] = 0;
    this.fillStyle = "#000"; this.strokeStyle = "#000"; this.lineWidth = 1; this.lineCap = "butt"; this.lineJoin = "miter";
    this.miterLimit = 10; this.globalAlpha = 1; this.切 = null; this.点線 = null; this.lineDashOffset = 0; this.深 = 0;
    this.globalCompositeOperation = "source-over"; this.imageSmoothingEnabled = true;
  }
  /* ---- 姿勢 ---- */
  save() {
    let s = this.積み[this.深];
    if (!s) { s = { m: new Float64Array(6) }; this.積み[this.深] = s; }
    s.m.set(this.m);
    s.fillStyle = this.fillStyle; s.strokeStyle = this.strokeStyle; s.lineWidth = this.lineWidth; s.lineCap = this.lineCap; s.lineJoin = this.lineJoin;
    s.miterLimit = this.miterLimit; s.globalAlpha = this.globalAlpha; s.切 = this.切; s.点線 = this.点線;
    this.深++;
  }
  restore() {
    if (!this.深) return;
    const s = this.積み[--this.深];
    this.m.set(s.m);
    this.fillStyle = s.fillStyle; this.strokeStyle = s.strokeStyle; this.lineWidth = s.lineWidth; this.lineCap = s.lineCap; this.lineJoin = s.lineJoin;
    this.miterLimit = s.miterLimit; this.globalAlpha = s.globalAlpha; this.切 = s.切; this.点線 = s.点線;
  }
  setTransform(a, b, c, d, e, f) {
    const m = this.m;
    if (typeof a === "object" && a) { m[0] = a.a; m[1] = a.b; m[2] = a.c; m[3] = a.d; m[4] = a.e; m[5] = a.f; }
    else { m[0] = a; m[1] = b; m[2] = c; m[3] = d; m[4] = e; m[5] = f; }
  }
  resetTransform() { this.setTransform(1, 0, 0, 1, 0, 0); }
  transform(a, b, c, d, e, f) {
    const m = this.m, m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3];
    m[0] = m0 * a + m2 * b; m[1] = m1 * a + m3 * b; m[2] = m0 * c + m2 * d; m[3] = m1 * c + m3 * d;
    m[4] += m0 * e + m2 * f; m[5] += m1 * e + m3 * f;
  }
  translate(x, y) { const m = this.m; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; }
  scale(x, y) { const m = this.m; m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y; }
  rotate(a) { const c = Math.cos(a), s = Math.sin(a); this.transform(c, s, -s, c, 0, 0); }
  setLineDash(a) { this.点線 = a && a.length ? a.slice() : null; }
  getLineDash() { return this.点線 ? this.点線.slice() : []; }
  createLinearGradient(x0, y0, x1, y1) { return new 濃淡("線", [x0, y0, x1, y1]); }
  createRadialGradient(x0, y0, r0, x1, y1, r1) { return new 濃淡("円", [x0, y0, r0, x1, y1, r1]); }
  measureText() { return { width: 0 }; }
  /* 利用者の座標 → 描き先の画素 */
  X(x, y) { const m = this.m; return m[0] * x + m[2] * y + m[4]; }
  Y(x, y) { const m = this.m; return m[1] * x + m[3] * y + m[5]; }
  倍() { const m = this.m; return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1; }
  /* ---- 道 ---- */
  beginPath() { this.道.空に(); }
  moveTo(x, y) { const m = this.m; this.道.区を始める(m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]); }
  lineTo(x, y) { const m = this.m; this.道.続ける(m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]); }
  closePath() { this.道.閉じる(); }
  rect(x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); }
  /* 曲線の始め：区が無ければ制御点から、閉じたあとなら閉じた区の始めから、新たな区を始める */
  曲線の始め(cx, cy) { const p = this.道; if (!p.k) this.moveTo(cx, cy); else if (p.戻) p.区を始める(p.rx, p.ry); }
  quadraticCurveTo(cx, cy, x, y) {
    const p = this.道; this.曲線の始め(cx, cy);
    const x0 = p.x[p.n - 1], y0 = p.y[p.n - 1], qx = this.X(cx, cy), qy = this.Y(cx, cy), x1 = this.X(x, y), y1 = this.Y(x, y);
    const L = Math.hypot(qx - x0, qy - y0) + Math.hypot(x1 - qx, y1 - qy), n = Math.max(2, Math.min(16, Math.ceil(L / 5)));
    for (let i = 1; i <= n; i++) { const t = i / n, s = 1 - t; p.点を足す(s * s * x0 + 2 * s * t * qx + t * t * x1, s * s * y0 + 2 * s * t * qy + t * t * y1); }
  }
  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
    const p = this.道; this.曲線の始め(c1x, c1y);
    const x0 = p.x[p.n - 1], y0 = p.y[p.n - 1], ax = this.X(c1x, c1y), ay = this.Y(c1x, c1y), bx = this.X(c2x, c2y), by = this.Y(c2x, c2y), x1 = this.X(x, y), y1 = this.Y(x, y);
    const L = Math.hypot(ax - x0, ay - y0) + Math.hypot(bx - ax, by - ay) + Math.hypot(x1 - bx, y1 - by), n = Math.max(2, Math.min(24, Math.ceil(L / 5)));
    for (let i = 1; i <= n; i++) { const t = i / n, s = 1 - t; p.点を足す(s * s * s * x0 + 3 * s * s * t * ax + 3 * s * t * t * bx + t * t * t * x1, s * s * s * y0 + 3 * s * s * t * ay + 3 * s * t * t * by + t * t * t * y1); }
  }
  /* 円の弧（2D の画布と同じく、いまの点から弧の始めへ線を引いてから弧を描く） */
  arc(x, y, r, a0, a1, ccw = false) { this.ellipse(x, y, r, r, 0, a0, a1, ccw); }
  ellipse(x, y, rx, ry, rot, a0, a1, ccw = false) {
    if (!(rx >= 0) || !(ry >= 0)) return;
    let 振 = a1 - a0;
    if (!ccw) { if (振 >= 二π) 振 = 二π; else { 振 = ((振 % 二π) + 二π) % 二π; } }
    else { if (-振 >= 二π) 振 = -二π; else { 振 = -((((a0 - a1) % 二π) + 二π) % 二π); } }
    const R = Math.max(rx, ry) * this.倍(), n = Math.max(3, Math.min(72, Math.ceil(Math.abs(振) / 二π * (8 + Math.sqrt(R) * 3.2))));
    /* 弧の点は、真ん中を描き先へ移した所に、楕円の二つの軸（描き先へ移した向き）を cos・sin の重みで足して得る。
       cos・sin は一歩ずつの回し（加法定理）で進める */
    const m = this.m, cr = Math.cos(rot), sr = Math.sin(rot);
    const cx = m[0] * x + m[2] * y + m[4], cy = m[1] * x + m[3] * y + m[5];
    const ux = (m[0] * cr + m[2] * sr) * rx, uy = (m[1] * cr + m[3] * sr) * rx, vx = (m[2] * cr - m[0] * sr) * ry, vy = (m[3] * cr - m[1] * sr) * ry;
    const d = 振 / n, cd = Math.cos(d), sd = Math.sin(d);
    let c = Math.cos(a0), s = Math.sin(a0);
    const p = this.道;
    const px0 = cx + ux * c + vx * s, py0 = cy + uy * c + vy * s;
    if (p.k && p.戻) p.区を始める(p.rx, p.ry);
    if (p.k) p.点を足す(px0, py0); else p.区を始める(px0, py0);
    for (let i = 1; i <= n; i++) {
      const c2 = c * cd - s * sd; s = s * cd + c * sd; c = c2;
      p.点を足す(cx + ux * c + vx * s, cy + uy * c + vy * s);
    }
  }
  /* ---- 切り抜き（矩形。背中越しは矩形だけを使う。そのほかの形は、その囲みで切る） ---- */
  clip() {
    const p = this.道; if (!p.n) { this.切 = [0, 0, 0, 0]; return; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < p.n; i++) { const x = p.x[i], y = p.y[i]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const c = this.切;
    this.切 = c ? [Math.max(c[0], x0), Math.max(c[1], y0), Math.min(c[2], x1), Math.min(c[3], y1)] : [x0, y0, x1, y1];
  }
  /* ---- 塗る ---- */
  /* 色の手：一色なら詰めた数（u32）、濃淡なら頂点の所から色を取る手続き。塗るものが無ければ null */
  色の手(様) {
    const ga = this.globalAlpha;
    if (様 instanceof 濃淡) {
      /* 濃淡は、頂点ごとに利用者の座標へ戻して色を取る（頂点のあいだはまっすぐに混ぜる） */
      const m = this.m, m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3], m4 = m[4], m5 = m[5], det = m0 * m3 - m1 * m2 || 1;
      return (x, y) => { const dx = x - m4, dy = y - m5, ux = (m3 * dx - m2 * dy) / det, uy = (-m1 * dx + m0 * dy) / det; const c = 様.色(ux, uy); return 詰める(c[0], c[1], c[2], c[3] * ga); };
    }
    let c;
    if (様 === this.前の様) c = this.前の色; else { c = 色を解く(様); this.前の様 = 様; this.前の色 = c; }
    const a = c[3] * ga;
    if (!(a > 0.0005)) return null;
    if (ga === 1) { if (c.詰 === undefined) c.詰 = 詰める(c[0], c[1], c[2], c[3]); return c.詰; }
    return 詰める(c[0], c[1], c[2], a);
  }
  三角(ax, ay, bx, by, cx, cy, 色) {
    const b = this.手.束;
    if (typeof 色 === "number") { b.頂(ax, ay, 色); b.頂(bx, by, 色); b.頂(cx, cy, 色); }
    else { b.頂(ax, ay, 色(ax, ay)); b.頂(bx, by, 色(bx, by)); b.頂(cx, cy, 色(cx, cy)); }
  }
  /* 多角形（xs・ys の o 番から n 個の点）を塗る。切り抜きを掛け、凸なら扇、凸でなければ耳を切る */
  多角(xs, ys, o, n, 色) {
    if (n < 3) return;
    if (this.切) {
      const r = this.切; if (r[2] <= r[0] || r[3] <= r[1]) return;
      const [cx, cy] = 矩で切る(xs, ys, o, n, r); xs = cx; ys = cy; o = 0; n = cx.length; if (n < 3) return;
    }
    if (n === 3 || 凸か(xs, ys, o, n)) {
      const x0 = xs[o], y0 = ys[o];
      if (typeof 色 === "number") { const b = this.手.束; for (let i = 1; i + 1 < n; i++) { b.頂(x0, y0, 色); b.頂(xs[o + i], ys[o + i], 色); b.頂(xs[o + i + 1], ys[o + i + 1], 色); } }
      else for (let i = 1; i + 1 < n; i++) this.三角(x0, y0, xs[o + i], ys[o + i], xs[o + i + 1], ys[o + i + 1], 色);
      return;
    }
    const 三 = 耳を切る(xs, ys, o, n);
    for (let i = 0; i < 三.length; i += 3) { const a = o + 三[i], b = o + 三[i + 1], c = o + 三[i + 2]; this.三角(xs[a], ys[a], xs[b], ys[b], xs[c], ys[c], 色); }
  }
  fill() {
    const 色 = this.色の手(this.fillStyle); if (色 == null) return;
    this.手.的にする(this.的);
    const p = this.道, 始 = p.始, K = p.k;
    for (let k = 0; k < K; k++) {
      const s = 始[k], e = k + 1 < K ? 始[k + 1] : p.n;
      if (e - s >= 3) this.多角(p.x, p.y, s, e - s, 色);
    }
  }
  /* 矩形の四隅を描き先の画素で this.四x・this.四y に置く */
  四隅(x, y, w, h) {
    const m = this.m, xs = this.四x, ys = this.四y, ax = m[0] * w, ay = m[1] * w, bx = m[2] * h, by = m[3] * h;
    xs[0] = m[0] * x + m[2] * y + m[4]; ys[0] = m[1] * x + m[3] * y + m[5];
    xs[1] = xs[0] + ax; ys[1] = ys[0] + ay; xs[2] = xs[1] + bx; ys[2] = ys[1] + by; xs[3] = xs[0] + bx; ys[3] = ys[0] + by;
  }
  fillRect(x, y, w, h) {
    const 色 = this.色の手(this.fillStyle); if (色 == null) return;
    this.手.的にする(this.的);
    this.四隅(x, y, w, h);
    this.多角(this.四x, this.四y, 0, 4, 色);
  }
  strokeRect(x, y, w, h) { this.beginPath(); this.rect(x, y, w, h); this.stroke(); }
  clearRect(x, y, w, h) {
    this.四隅(x, y, w, h); const xs = this.四x, ys = this.四y;
    this.手.消す(this.的, Math.min(xs[0], xs[1], xs[2], xs[3]), Math.min(ys[0], ys[1], ys[2], ys[3]), Math.max(xs[0], xs[1], xs[2], xs[3]), Math.max(ys[0], ys[1], ys[2], ys[3]));
  }
  /* ---- 線 ---- */
  stroke() {
    let 色 = this.色の手(this.strokeStyle); if (色 == null) return;
    let w = this.lineWidth * this.倍(); if (!(w > 0)) return;
    /* 一画素より細い線（遠くの槍・旗竿など）は、一画素の幅で、細さの割だけ薄く引く。2D の画布も細い線を薄く引く
       （覆う割で濃さを決める）。細いまま多重標本で塗ると、標本の間に落ちて切れ切れに見えるため */
    if (w < 1) { 色 = 薄める(色, w); if (色 == null) return; w = 1; }
    this.手.的にする(this.的);
    const p = this.道, 始 = p.始, K = p.k;
    for (let k = 0; k < K; k++) {
      const s = 始[k], e = k + 1 < K ? 始[k + 1] : p.n;
      /* 重なった点を除いて、下書きへ写す */
      if (this.lx.length < e - s) { this.lx = new Float64Array((e - s) * 2); this.ly = new Float64Array((e - s) * 2); }
      const xs = this.lx, ys = this.ly; let n = 0;
      for (let i = s; i < e; i++) {
        const x = p.x[i], y = p.y[i];
        if (n && Math.abs(x - xs[n - 1]) <= 1e-6 && Math.abs(y - ys[n - 1]) <= 1e-6) continue;
        xs[n] = x; ys[n] = y; n++;
      }
      const 輪 = p.閉[k] === 1;
      if (輪 && n > 2 && Math.abs(xs[0] - xs[n - 1]) < 1e-6 && Math.abs(ys[0] - ys[n - 1]) < 1e-6) n--;
      if (n < 2) { if (this.lineCap === "round" && n === 1) this.丸(xs[0], ys[0], w / 2, 0, 二π, 色); continue; }
      if (this.点線) { this.点線で引く(Array.from(xs.subarray(0, n)), Array.from(ys.subarray(0, n)), 輪, w, 色); continue; }
      this.帯を引く(xs, ys, n, 輪, w, 色);
    }
  }
  /* 点線：道のりに沿って、点線の並び（倍を掛けた画素）で切って、切れた一つずつを線として引く */
  点線で引く(xs, ys, 輪, w, 色) {
    const 並 = this.点線.map((v) => Math.max(0.01, v * this.倍())); if (!並.reduce((a, v) => a + v, 0)) { this.帯を引く(xs, ys, xs.length, 輪, w, 色); return; }
    if (輪) { xs = [...xs, xs[0]]; ys = [...ys, ys[0]]; }
    let 番 = 0, 残 = 並[0], 描く = true, cx = [xs[0]], cy = [ys[0]];
    for (let i = 0; i + 1 < xs.length; i++) {
      let ax = xs[i], ay = ys[i]; const bx = xs[i + 1], by = ys[i + 1];
      let L = Math.hypot(bx - ax, by - ay);
      while (L > 0) {
        const step = Math.min(L, 残), u = step / L, nx = ax + (bx - ax) * u, ny = ay + (by - ay) * u;
        if (描く) { cx.push(nx); cy.push(ny); }
        ax = nx; ay = ny; L -= step; 残 -= step;
        if (残 <= 1e-9) {
          if (描く && cx.length > 1) this.帯を引く(cx, cy, cx.length, false, w, 色);
          番 = (番 + 1) % 並.length; 残 = 並[番]; 描く = !描く; cx = [ax]; cy = [ay];
        }
      }
    }
    if (描く && cx.length > 1) this.帯を引く(cx, cy, cx.length, false, w, 色);
  }
  /* 扇（真ん中 x, y・半径 r・始めの角 a0 から 振 だけ回る）を塗る。線の丸い端と丸い継ぎ目に使う */
  丸(x, y, r, a0, 振, 色) {
    const n = Math.max(4, Math.min(48, Math.ceil(Math.abs(振) / 二π * (8 + Math.sqrt(r) * 3.2))));
    const d = 振 / n, cd = Math.cos(d), sd = Math.sin(d);
    let c = Math.cos(a0), s = Math.sin(a0), px = x + c * r, py = y + s * r;
    const b = this.手.束, col = typeof 色 === "number" ? 色 : 色(x, y);
    for (let i = 1; i <= n; i++) {
      const c2 = c * cd - s * sd; s = s * cd + c * sd; c = c2;
      const qx = x + c * r, qy = y + s * r;
      if (this.切) this.多角([x, px, qx], [y, py, qy], 0, 3, 色);
      else { b.頂(x, y, col); b.頂(px, py, col); b.頂(qx, qy, col); }
      px = qx; py = qy;
    }
  }
  /* 幅 w の帯を引く（点は xs・ys の 〇 番から n 個。輪なら終わりから始めへも引く） */
  帯を引く(xs, ys, n, 輪, w, 色) {
    const h = w / 2, 段 = 輪 ? n : n - 1;
    if (this.法.length < 段 * 4) this.法 = new Float64Array(段 * 8);
    const 法 = this.法;                                  // 区ごとに：向き（ux, uy）・左の法線（nx, ny）
    for (let i = 0; i < 段; i++) {
      const j = i + 1 < n ? i + 1 : 0, dx = xs[j] - xs[i], dy = ys[j] - ys[i], L = Math.hypot(dx, dy) || 1, q = i * 4;
      法[q] = dx / L; 法[q + 1] = dy / L; 法[q + 2] = -dy / L; 法[q + 3] = dx / L;
    }
    const 角 = this.lineCap === "square" && !輪, 速 = !this.切 && typeof 色 === "number", b = this.手.束;
    for (let i = 0; i < 段; i++) {
      const j = i + 1 < n ? i + 1 : 0, q = i * 4, ux = 法[q], uy = 法[q + 1], nx = 法[q + 2] * h, ny = 法[q + 3] * h;
      let ax = xs[i], ay = ys[i], bx = xs[j], by = ys[j];
      if (角 && i === 0) { ax -= ux * h; ay -= uy * h; }
      if (角 && i === 段 - 1) { bx += ux * h; by += uy * h; }
      if (速) {
        const p0x = ax + nx, p0y = ay + ny, p2x = bx - nx, p2y = by - ny;
        b.頂(p0x, p0y, 色); b.頂(bx + nx, by + ny, 色); b.頂(p2x, p2y, 色); b.頂(p0x, p0y, 色); b.頂(p2x, p2y, 色); b.頂(ax - nx, ay - ny, 色);
      } else this.多角([ax + nx, bx + nx, bx - nx, ax - nx], [ay + ny, by + ny, by - ny, ay - ny], 0, 4, 色);
    }
    /* 継ぎ目 */
    for (let k = 1; k < n - 1; k++) this.継ぐ(xs[k], ys[k], k - 1, k, h, 色);
    if (輪 && n > 2) { this.継ぐ(xs[n - 1], ys[n - 1], n - 2, n - 1, h, 色); this.継ぐ(xs[0], ys[0], n - 1, 0, h, 色); }
    if (!輪 && this.lineCap === "round") {
      const q = (段 - 1) * 4;
      this.丸(xs[0], ys[0], h, Math.atan2(法[1], 法[0]) + Math.PI / 2, Math.PI, 色);
      this.丸(xs[n - 1], ys[n - 1], h, Math.atan2(法[q + 1], 法[q]) - Math.PI / 2, Math.PI, 色);
    }
  }
  /* 点 (x, y) で、前の区と後の区（法 の番）を継ぐ（丸・尖り・面取り） */
  継ぐ(x, y, 前, 後, h, 色) {
    const 法 = this.法, a = 前 * 4, c = 後 * 4;
    const ux0 = 法[a], uy0 = 法[a + 1], nx0 = 法[a + 2], ny0 = 法[a + 3], ux1 = 法[c], uy1 = 法[c + 1], nx1 = 法[c + 2], ny1 = 法[c + 3];
    const cr = ux0 * uy1 - uy0 * ux1; if (Math.abs(cr) < 1e-6) return;
    const 外 = cr > 0 ? -1 : 1;                           // 外側の法線の向き
    const p0x = x + nx0 * h * 外, p0y = y + ny0 * h * 外, p1x = x + nx1 * h * 外, p1y = y + ny1 * h * 外;
    if (this.lineJoin === "round") { const a0 = Math.atan2(p0y - y, p0x - x); let 振 = Math.atan2(p1y - y, p1x - x) - a0; while (振 > Math.PI) 振 -= 二π; while (振 < -Math.PI) 振 += 二π; this.丸(x, y, h, a0, 振, 色); return; }
    const 速 = !this.切 && typeof 色 === "number", b = this.手.束;
    if (this.lineJoin === "miter") {
      const mx = nx0 + nx1, my = ny0 + ny1, mL = Math.hypot(mx, my);
      if (mL > 1e-6) {
        const cosh = (mx * nx0 + my * ny0) / mL, 長 = h / Math.max(1e-6, cosh);
        if (長 / h <= this.miterLimit) {
          const qx = x + (mx / mL) * 長 * 外, qy = y + (my / mL) * 長 * 外;
          if (速) { b.頂(x, y, 色); b.頂(p0x, p0y, 色); b.頂(qx, qy, 色); b.頂(x, y, 色); b.頂(qx, qy, 色); b.頂(p1x, p1y, 色); }
          else this.多角([x, p0x, qx, p1x], [y, p0y, qy, p1y], 0, 4, 色);
          return;
        }
      }
    }
    if (速) { b.頂(x, y, 色); b.頂(p0x, p0y, 色); b.頂(p1x, p1y, 色); }
    else this.多角([x, p0x, p1x], [y, p0y, p1y], 0, 3, 色);
  }
  /* ---- 絵を貼る ---- */
  drawImage(img, ...a) {
    if (!img) return;
    const 層 = img.GL層 && typeof img.GL層 === "object" ? img.GL層 : null;
    let tex, iw, ih;
    if (層) { iw = 層.w; ih = 層.h; }
    else { if (!(img.width > 0 && img.height > 0)) return; const o = this.手.絵のテクスチャ(img); tex = o.tex; iw = o.w; ih = o.h; }
    let sx = 0, sy = 0, sw = iw, sh = ih, dx, dy, dw, dh;
    if (a.length >= 8) [sx, sy, sw, sh, dx, dy, dw, dh] = a;
    else if (a.length >= 4) [dx, dy, dw, dh] = a;
    else { [dx, dy] = a; dw = iw; dh = ih; }
    /* 層は、積んだ塗りを流してから（初めて塗るときに GL の資を作る）、読む囲みを絵へ移す。一度も塗っていなければ空 */
    if (層) { this.手.層を解く(層, sx, sy, sx + sw, sy + sh); if (!層.tex) return; tex = 層.tex; }
    const q = [[this.X(dx, dy), this.Y(dx, dy)], [this.X(dx + dw, dy), this.Y(dx + dw, dy)], [this.X(dx + dw, dy + dh), this.Y(dx + dw, dy + dh)], [this.X(dx, dy + dh), this.Y(dx, dy + dh)]];
    /* 層（フレームバッファの絵）は下が〇なので、縦を返して読む */
    const v = (y) => (層 ? 1 - y / ih : y / ih);
    const uv = [[sx / iw, v(sy)], [(sx + sw) / iw, v(sy)], [(sx + sw) / iw, v(sy + sh)], [sx / iw, v(sy + sh)]];
    if (this.切) {
      /* 切り抜きの中だけに貼る（矩形の切り抜きで、貼る矩形を縮め、uv も合わせて縮める） */
      const r = this.切, x0 = Math.max(r[0], Math.min(q[0][0], q[2][0])), x1 = Math.min(r[2], Math.max(q[0][0], q[2][0])), y0 = Math.max(r[1], Math.min(q[0][1], q[2][1])), y1 = Math.min(r[3], Math.max(q[0][1], q[2][1]));
      if (x1 <= x0 || y1 <= y0) return;
      const fx = (x) => (x - q[0][0]) / (q[2][0] - q[0][0]), fy = (y) => (y - q[0][1]) / (q[2][1] - q[0][1]);
      const uu = (t) => uv[0][0] + (uv[2][0] - uv[0][0]) * t, vv = (t) => uv[0][1] + (uv[2][1] - uv[0][1]) * t;
      this.手.絵を重ねる(this.的, tex, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], [[uu(fx(x0)), vv(fy(y0))], [uu(fx(x1)), vv(fy(y0))], [uu(fx(x1)), vv(fy(y1))], [uu(fx(x0)), vv(fy(y1))]], this.globalAlpha);
      return;
    }
    this.手.絵を重ねる(this.的, tex, q, uv, this.globalAlpha);
  }
}

/* ---------- どちらの筆で描くかを、この端末で量って決める ---------- */
/* GL筆が 2D の画布より速いかは、端末によって違い、前もっては分からない（GPU の力、GL の絵を 2D の画布へ移す手間、
   JavaScript の速さによる。この試しの機械では、GPU を持たず CPU で真似るので GL筆の方が遅かった）。
   そこで、描く兵の多いコマが続けば、GL筆と 2D の画布を短い間ずつ交互に使って一コマの間合い（前のコマのはじめから
   このコマのはじめまでの刻）を量り、速い方に決める。量りの中ほどの値で比べ、GL筆が「差」の割合より速くなければ、
   これまでどおり 2D の画布で描く。目に入る兵がそののち大きく増えれば、量り直す。
   兵の少ないコマ（「重い」に届かない）では量らず、決めた筆（決めていなければ 2D）で描く。 */
export class 筆の選び手 {
  constructor(o = {}) {
    this.重い = o.重い ?? 150;           // 描く兵がこの数に届くコマで量る
    this.窓 = o.窓 ?? 16;                // 一つの間で量るコマの数
    this.慣らし = o.慣らし ?? 3;         // 筆を替えた直後の、量らずに捨てるコマの数
    this.回 = o.回 ?? 2;                 // GL・2D を交互に幾回ずつ量るか
    this.差 = o.差 ?? 0.08;              // GL筆がこの割合より速ければ GL筆にする
    this.見直し倍 = o.見直し倍 ?? 1.6;   // 決めたときより描く兵がこの倍に増えれば量り直す
    this.見直し間 = o.見直し間 ?? 20000; // ただし決めてからこの刻（ms）は量り直さない
    this.長すぎ = o.長すぎ ?? 2000;      // これより長い間合いは、ほかの事（盤の視点にいた・画面を離れた）とみて捨てる
    this.決め = null; this.決めた数 = 0; this.決めた時 = -Infinity; this.結果 = null;
    this.試し = null; this.前の時 = null; this.前の種 = null; this.前の量る = false;
  }
  /* 毎コマのはじめに呼ぶ。今（ms）・前のコマで描いた兵の数・GL筆が使えるか（手続きでもよい。要るときだけ呼ぶ）。
     返すのはこのコマを描く筆（"gl" か "2d"） */
  選ぶ(今, 数, 使える) {
    const dt = this.前の時 == null ? null : 今 - this.前の時; this.前の時 = 今;
    const 試 = this.試し;
    if (試 && this.前の量る && dt != null && dt > 0 && dt < this.長すぎ) 試.量り[this.前の種].push(dt);
    const 使えるか = () => (typeof 使える === "function" ? !!使える() : !!使える);
    if (!試) {
      const 見直す = 数 >= this.重い && (this.決め == null || (数 >= this.決めた数 * this.見直し倍 && 今 - this.決めた時 >= this.見直し間));
      if (!見直す || !使えるか()) { this.前の量る = false; return (this.前の種 = this.決め || "2d"); }
      this.試し = { 順: [], 番: 0, コマ: 0, 量り: { gl: [], "2d": [] }, 数 };
      for (let i = 0; i < this.回; i++) this.試し.順.push("gl", "2d");
    } else if (!使えるか()) { this.試し = null; this.前の量る = false; return (this.前の種 = "2d"); }
    const t = this.試し;
    if (t.コマ >= this.慣らし + this.窓) { t.番++; t.コマ = 0; }
    if (t.番 >= t.順.length) {
      const 中 = (a) => { if (!a.length) return Infinity; const s = a.slice().sort((p, q) => p - q); return s[s.length >> 1]; };
      const g = 中(t.量り.gl), d = 中(t.量り["2d"]);
      this.決め = g < d * (1 - this.差) ? "gl" : "2d";
      this.決めた数 = t.数; this.決めた時 = 今; this.結果 = { gl: g, "2d": d };
      this.試し = null; this.前の量る = false;
      return (this.前の種 = this.決め);
    }
    this.前の量る = t.コマ >= this.慣らし; t.コマ++;
    return (this.前の種 = t.順[t.番]);
  }
  /* 量っている最中か・決めた筆・量りの結果（中ほどの間合い ms）。試しが覗く */
  様子() { return { 決め: this.決め, 量り中: !!this.試し, 結果: this.結果, 決めた数: this.決めた数 }; }
}

/* ---------- 作る ---------- */
/* GL筆を作る：{ 始め(w, h, dpr) → 筆, 終え() → 画布, 層を用意する(寸) → { 筆, 画（drawImage に渡す印） }, 失ったか() }。
   WebGL が使えなければ null */
export function GL筆を作る() {
  if (typeof document === "undefined") return null;
  let canvas, gl = null, gl2 = false;
  try {
    canvas = document.createElement("canvas");
    const 仕様 = { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false, preserveDrawingBuffer: false };
    /* WebGL2 に限る（薄めて描く兵の層を多重標本で滑らかに塗るため。WebGL1 しか無い古い端末は、これまでどおり 2D で描く） */
    gl = canvas.getContext("webgl2", 仕様); gl2 = !!gl;
  } catch (e) { gl = null; }
  if (!gl || typeof gl.createShader !== "function") return null;
  let 手;
  try { 手 = new 描き手(canvas, gl, gl2); } catch (e) { return null; }
  const 寸 = { width: 0, height: 0 };
  const 主 = new 筆(手, null, 寸);
  let 層 = null, 層の筆 = null; const 層の寸 = { width: 0, height: 0 };
  return {
    失ったか: () => 手.失 || (gl.isContextLost && gl.isContextLost()),
    canvas,
    始め(w, h, dpr) {
      const cw = Math.max(1, Math.round(w * dpr)), ch = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      寸.width = cw; 寸.height = ch;
      手.束.n = 0; 手.的 = null;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cw, ch);
      gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      主.既に戻す();
      /* 層はコマの初めにまとめて消す */
      if (層 && 層.w === cw && 層.h === ch) 手.消す(層, 0, 0, cw, ch);
      手.的にする(null);
      return 主;
    },
    /* 層（薄めて描く兵を濃く描く別の描き先）。描き先の大きさが替われば作り直す */
    層を用意する() {
      const cw = 寸.width, ch = 寸.height; if (!(cw > 0 && ch > 0)) return null;
      if (!層 || 層.w !== cw || 層.h !== ch) {
        if (層) 手.層を捨てる(層);
        層 = 手.層を作る(cw, ch); 層の寸.width = cw; 層の寸.height = ch; 層の寸.GL層 = 層;
        層の筆 = new 筆(手, 層, 層の寸);
        手.消す(層, 0, 0, cw, ch);
      }
      層の筆.既に戻す();
      return { 筆: 層の筆, 画: 層の寸 };
    },
    終え() { 手.的にする(null); 手.流す(); return canvas; },
    /* GL の資を手放す（この端末では 2D の画布で描くと決めたとき。画布と多重標本の描き先が、合わせて数十 MB になる） */
    捨てる() {
      try { if (層) 手.層を捨てる(層); 層 = null; 層の筆 = null; const ext = gl.getExtension && gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); } catch (e) { /* よい */ }
      canvas.width = 1; canvas.height = 1; 手.失 = true;
    },
  };
}
