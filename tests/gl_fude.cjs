/* ============================================================
   GL筆（src/hitori/gl_fude.js）の試験

   背中越しの立つもの（兵・木・家・葦・城の造作・矢玉）を WebGL で塗る筆は、2D の画布の筆を真似る。ここでは、
   小さな GL の真似（塗りの三角形を画素の真ん中で拾って塗る。描き先・テクスチャ・写しも真似る）の上で GL筆に
   描かせ、塗れた画素を、2D の画布で同じ命令を描いたときの形（面積・縁の所・色）と比べる。
     一、色の文字（#rgb・#rrggbb・#rrggbbaa・rgb()・rgba()・名）を読める
     二、矩形・姿勢（移す・伸ばす）・save と restore・凸でない形・閉じたあとの線・円・回した楕円・二次曲線を、
         2D の画布と同じ所に同じ面積で塗る
     三、線：幅・端（butt・square・round）・継ぎ目（miter・bevel）・点線・一画素より細い線（一画素の幅で薄く）
     四、切り抜き・濃淡（線形）・全体の濃さ（globalAlpha）
     五、層（薄めて描く兵を一度濃く描く別の描き先）：層に塗ったものを、濃さを掛けて重ねられる。重ねたあと消せる
     六、WebGL2 が無ければ作らない（これまでどおり 2D の画布で描く）
     七、どちらの筆で描くかを量って決める（筆の選び手）：兵の少ないコマでは量らない・速い方に決める・ほぼ同じなら
         2D・長すぎる間合いは捨てる・兵が大きく増えれば量り直す・GL筆が使えなければ 2D
   ============================================================ */
const H = require('../build/harness.cjs');
let 誤 = 0;
const 確 = (名, 可, 補) => { console.log(`  ${可 ? '○' : '★'} ${名}${補 ? '　' + 補 : ''}`); if (!可) 誤++; };
const 近い = (a, b, 許) => Math.abs(a - b) <= 許;

/* ---------- 小さな GL の真似（WebGL2 の、GL筆が使う分だけ） ---------- */
function GLの真似(画布) {
  const C = {}; let 番 = 1;
  for (const k of ['VERTEX_SHADER', 'FRAGMENT_SHADER', 'COMPILE_STATUS', 'LINK_STATUS', 'MAX_SAMPLES', 'FRAMEBUFFER', 'READ_FRAMEBUFFER', 'DRAW_FRAMEBUFFER',
    'ARRAY_BUFFER', 'STREAM_DRAW', 'FLOAT', 'UNSIGNED_BYTE', 'BLEND', 'ONE', 'ONE_MINUS_SRC_ALPHA', 'TRIANGLES', 'TEXTURE_2D', 'RGBA', 'RGBA8',
    'TEXTURE_MIN_FILTER', 'TEXTURE_MAG_FILTER', 'LINEAR', 'NEAREST', 'TEXTURE_WRAP_S', 'TEXTURE_WRAP_T', 'CLAMP_TO_EDGE', 'COLOR_ATTACHMENT0',
    'RENDERBUFFER', 'SCISSOR_TEST', 'COLOR_BUFFER_BIT', 'TEXTURE0', 'UNPACK_PREMULTIPLY_ALPHA_WEBGL']) C[k] = 番++;
  const 既 = { color: { w: 0, h: 0, d: null } };          // 画布そのもの（下が〇の行の並び。掛け合わせ済みの RGBA）
  const 色の器 = (o) => { if (o === 既) { if (既.color.w !== 画布.width || 既.color.h !== 画布.height) { 既.color.w = 画布.width; 既.color.h = 画布.height; 既.color.d = new Float32Array(画布.width * 画布.height * 4); } return 既.color; } return o.color; };
  let 読 = 既, 描 = 既, 配列 = null, 手順 = null, テク = null, 鋏 = false, 鋏矩 = [0, 0, 0, 0], 消色 = [0, 0, 0, 0], 混ぜ = false;
  const 指 = {};
  const gl = {
    ...C, 記: { 塗り: 0, 頂: 0, 枠: 0 },
    getParameter: (k) => (k === C.MAX_SAMPLES ? 4 : 0), getExtension: () => null, isContextLost: () => false,
    createShader: (t) => ({ t, src: '' }), shaderSource: (s, src) => { s.src = src; }, compileShader() {}, getShaderParameter: () => true, getShaderInfoLog: () => '',
    createProgram: () => ({ sh: [], 所: {}, u: {} }), attachShader: (p, s) => p.sh.push(s), bindAttribLocation: (p, i, n) => { p.所[n] = i; },
    linkProgram: (p) => { p.種 = p.sh.some((s) => /a_c/.test(s.src)) ? '塗り' : '絵'; }, getProgramParameter: () => true, getProgramInfoLog: () => '',
    getAttribLocation: (p, n) => p.所[n], getUniformLocation: (p, n) => ({ p, n }), useProgram: (p) => { 手順 = p; },
    uniform2f: (l, a, b) => { l.p.u[l.n] = [a, b]; }, uniform1i: (l, a) => { l.p.u[l.n] = a; }, uniform1f: (l, a) => { l.p.u[l.n] = a; },
    createBuffer: () => ({ d: null }), bindBuffer: (t, b) => { 配列 = b; },
    bufferData: (t, d) => { 配列.d = new Uint8Array(d.buffer, d.byteOffset, d.byteLength).slice().buffer; },
    enableVertexAttribArray() {}, disableVertexAttribArray() {}, vertexAttribPointer: (i, n, ty, no, st, of) => { 指[i] = { n, st, of }; },
    enable: (k) => { if (k === C.BLEND) 混ぜ = true; if (k === C.SCISSOR_TEST) 鋏 = true; }, disable: (k) => { if (k === C.BLEND) 混ぜ = false; if (k === C.SCISSOR_TEST) 鋏 = false; },
    blendFunc() {}, viewport() {}, scissor: (x, y, w, h) => { 鋏矩 = [x, y, w, h]; }, clearColor: (r, g, b, a) => { 消色 = [r, g, b, a]; },
    clear: () => { const c = 色の器(描); for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) { if (鋏 && !(x >= 鋏矩[0] && x < 鋏矩[0] + 鋏矩[2] && y >= 鋏矩[1] && y < 鋏矩[1] + 鋏矩[3])) continue; c.d.set(消色, (y * c.w + x) * 4); } },
    createTexture: () => ({ color: { w: 0, h: 0, d: null } }), bindTexture: (t, x) => { テク = x; }, texParameteri() {}, pixelStorei() {}, activeTexture() {},
    texImage2D: (...a) => {
      if (a.length >= 9) { const [, , , w, h] = a; テク.color = { w, h, d: new Float32Array(w * h * 4) }; return; }
      const img = a[5]; テク.color = { w: img.width, h: img.height, d: Float32Array.from(img.画素) };   // 絵は上の行から
    },
    createFramebuffer: () => { gl.記.枠++; return { color: null }; }, framebufferTexture2D: (t, at, tt, x) => { 描.color = x.color; },
    createRenderbuffer: () => ({ color: null }), bindRenderbuffer: (t, r) => { gl._rb = r; },
    renderbufferStorageMultisample: (t, s, f, w, h) => { gl._rb.color = { w, h, d: new Float32Array(w * h * 4) }; },
    framebufferRenderbuffer: (t, at, rt, r) => { 描.color = r.color; },
    bindFramebuffer: (t, f) => { const o = f || 既; if (t === C.FRAMEBUFFER) { 読 = o; 描 = o; } else if (t === C.READ_FRAMEBUFFER) 読 = o; else 描 = o; },
    blitFramebuffer: (sx0, sy0, sx1, sy1, dx0, dy0) => { const s = 色の器(読), d = 色の器(描); for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) d.d.set(s.d.subarray((y * s.w + x) * 4, (y * s.w + x) * 4 + 4), ((y - sy0 + dy0) * d.w + (x - sx0 + dx0)) * 4); },
    drawArrays: (m, 始, n) => {
      gl.記.塗り++; gl.記.頂 += n;
      const c = 色の器(描), u_r = 手順.u.u_r, buf = 配列.d, f = new Float32Array(buf), u8 = new Uint8Array(buf);
      const 頂 = [];
      for (let i = 始; i < 始 + n; i++) {
        const p = 指[0], q = 指[1], o = (i * p.st + p.of) / 4;
        const wx = f[o] / u_r[0] * c.w, wy = (1 - f[o + 1] / u_r[1]) * c.h;   // 窓の座標（下が〇）
        if (手順.種 === '塗り') { const b = i * q.st + q.of; 頂.push([wx, wy, [u8[b] / 255, u8[b + 1] / 255, u8[b + 2] / 255, u8[b + 3] / 255]]); }
        else { const o2 = (i * q.st + q.of) / 4; 頂.push([wx, wy, [f[o2], f[o2 + 1]]]); }
      }
      for (let t = 0; t + 2 < 頂.length; t += 3) 三角を塗る(c, 頂[t], 頂[t + 1], 頂[t + 2]);
    },
  };
  /* 三角形を、画素の真ん中が内にあるものだけ塗る（縁の上の点は左上の決まりで一方にだけ入れる） */
  function 三角を塗る(c, A, B, Cc) {
    let [a, b, d] = [A, B, Cc]; const 面 = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
    if (Math.abs(面) < 1e-12) return; if (面 < 0) [b, d] = [d, b];
    const 辺 = (p, q, x, y) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
    const 左上 = (p, q) => (q[1] === p[1] && q[0] < p[0]) || q[1] < p[1];
    const S = Math.abs(面);
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], d[0]))), x1 = Math.min(c.w - 1, Math.ceil(Math.max(a[0], b[0], d[0])));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], d[1]))), y1 = Math.min(c.h - 1, Math.ceil(Math.max(a[1], b[1], d[1])));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5, w0 = 辺(b, d, px, py), w1 = 辺(d, a, px, py), w2 = 辺(a, b, px, py);
      const 内 = (w, p, q) => w > 0 || (w === 0 && 左上(p, q));
      if (!(内(w0, b, d) && 内(w1, d, a) && 内(w2, a, b))) continue;
      if (鋏 && !(x >= 鋏矩[0] && x < 鋏矩[0] + 鋏矩[2] && y >= 鋏矩[1] && y < 鋏矩[1] + 鋏矩[3])) continue;
      const l0 = w0 / S, l1 = w1 / S, l2 = w2 / S;
      let 色;
      if (手順.種 === '塗り') 色 = [0, 1, 2, 3].map((k) => a[2][k] * l0 + b[2][k] * l1 + d[2][k] * l2);
      else {
        const tu = a[2][0] * l0 + b[2][0] * l1 + d[2][0] * l2, tv = a[2][1] * l0 + b[2][1] * l1 + d[2][1] * l2, t = テク.color;
        const tx = Math.min(t.w - 1, Math.max(0, Math.floor(tu * t.w))), ty = Math.min(t.h - 1, Math.max(0, Math.floor(tv * t.h))), k = (ty * t.w + tx) * 4, ua = 手順.u.u_a;
        色 = [t.d[k] * ua, t.d[k + 1] * ua, t.d[k + 2] * ua, t.d[k + 3] * ua];
      }
      const i = (y * c.w + x) * 4;
      if (混ぜ) for (let k = 0; k < 4; k++) c.d[i + k] = 色[k] + c.d[i + k] * (1 - 色[3]); else c.d.set(色, i);
    }
  }
  gl.画素 = (x, y) => { const c = 色の器(既), i = ((c.h - 1 - y) * c.w + x) * 4; return [c.d[i], c.d[i + 1], c.d[i + 2], c.d[i + 3]]; };   // 上が〇の画素
  gl.面積 = (下 = 0.5) => { const c = 色の器(既); let n = 0; for (let i = 3; i < c.d.length; i += 4) if (c.d[i] > 下) n++; return n; };
  gl.濃さの和 = () => { const c = 色の器(既); let s = 0; for (let i = 3; i < c.d.length; i += 4) s += c.d[i]; return s; };
  return gl;
}
/* GL筆を、真似の GL の上に作る（document を据えて作り、作ったら外す） */
function 筆を作る() {
  const 画布 = { width: 300, height: 150, addEventListener() {}, getContext: (t) => (t === 'webgl2' ? (画布.gl = 画布.gl || GLの真似(画布)) : null) };
  global.document = { createElement: () => 画布 };
  const 筆ら = H.GL筆を作る();
  delete global.document;
  return { 筆ら, gl: 画布.gl };
}
/* 一枚描く：w×h の画布に、描く(筆) で描いて、真似の GL を返す */
function 描く(描き, w = 64, h = 64) {
  const { 筆ら, gl } = 筆を作る();
  const 筆 = 筆ら.始め(w, h, 1);
  描き(筆, 筆ら);
  筆ら.終え();
  return gl;
}

console.log('一、色の文字を読む');
{
  const 同じ = (a, b) => a.length === b.length && a.every((v, i) => 近い(v, b[i], 0.002));
  確('#abc', 同じ(H.色を解く('#abc'), [0xaa / 255, 0xbb / 255, 0xcc / 255, 1]));
  確('#aabbcc80（濃さ 128/255）', 同じ(H.色を解く('#aabbcc80'), [0xaa / 255, 0xbb / 255, 0xcc / 255, 128 / 255]));
  確('rgba(10, 20, 30, .5)', 同じ(H.色を解く('rgba(10, 20, 30, .5)'), [10 / 255, 20 / 255, 30 / 255, 0.5]));
  確('rgba(10,20,30,50%)', 同じ(H.色を解く('rgba(10,20,30,50%)'), [10 / 255, 20 / 255, 30 / 255, 0.5]));
  確('rgb(255,0,0)', 同じ(H.色を解く('rgb(255,0,0)'), [1, 0, 0, 1]));
  確('名（white・transparent）', 同じ(H.色を解く('white'), [1, 1, 1, 1]) && 同じ(H.色を解く('transparent'), [0, 0, 0, 0]));
}

console.log('二、形を同じ所に同じ面積で塗る');
{
  let gl = 描く((p) => { p.fillStyle = '#ff0000'; p.fillRect(10, 10, 20, 10); });
  const 赤 = gl.画素(10, 10);
  確('矩形 fillRect(10,10,20,10) は二百画素', gl.面積() === 200, `面積 ${gl.面積()}`);
  確('矩形の縁の画素（内と外）', 赤[3] > 0.99 && 赤[0] > 0.99 && 赤[1] < 0.01 && gl.画素(29, 19)[3] > 0.99 && gl.画素(9, 10)[3] < 0.01 && gl.画素(30, 19)[3] < 0.01 && gl.画素(29, 20)[3] < 0.01);
  gl = 描く((p) => { p.fillStyle = '#fff'; p.translate(5, 5); p.scale(2, 2); p.fillRect(0, 0, 5, 5); });
  確('移して二倍に伸ばした矩形は 5〜14 の百画素', gl.面積() === 100 && gl.画素(5, 5)[3] > 0.99 && gl.画素(14, 14)[3] > 0.99 && gl.画素(15, 15)[3] < 0.01, `面積 ${gl.面積()}`);
  gl = 描く((p) => { p.fillStyle = '#fff'; p.save(); p.translate(30, 0); p.fillStyle = '#f00'; p.restore(); p.fillRect(0, 0, 4, 4); });
  確('restore で姿勢と色が戻る', gl.面積() === 16 && gl.画素(0, 0)[1] > 0.99 && gl.画素(30, 0)[3] < 0.01);
  gl = 描く((p) => { p.fillStyle = '#fff'; p.beginPath(); p.moveTo(0, 0); p.lineTo(20, 0); p.lineTo(20, 10); p.lineTo(10, 10); p.lineTo(10, 20); p.lineTo(0, 20); p.closePath(); p.fill(); });
  確('凸でない形（L字）は三百画素で、欠けた角は塗らない', gl.面積() === 300 && gl.画素(15, 15)[3] < 0.01 && gl.画素(5, 15)[3] > 0.99, `面積 ${gl.面積()}`);
  gl = 描く((p) => { p.fillStyle = '#fff'; p.beginPath(); p.moveTo(0, 0); p.lineTo(20, 0); p.lineTo(20, 20); p.closePath(); p.lineTo(0, 20); p.fill(); });
  確('閉じたあとの線は閉じた区の始めから引く（2D の画布と同じく三角形だけを塗る）', 近い(gl.面積(), 200, 12) && gl.画素(2, 18)[3] < 0.01, `面積 ${gl.面積()}`);
  gl = 描く((p) => { p.fillStyle = '#fff'; p.beginPath(); p.arc(32, 32, 20, 0, Math.PI * 2); p.fill(); });
  確('円（半径二十）の面積は π r² の三分のうち', Math.abs(gl.面積() - Math.PI * 400) / (Math.PI * 400) < 0.03, `面積 ${gl.面積()}（π r² ≒ ${Math.round(Math.PI * 400)}）`);
  gl = 描く((p) => { p.fillStyle = '#fff'; p.beginPath(); p.ellipse(32, 32, 20, 8, Math.PI / 4, 0, Math.PI * 2); p.fill(); });
  確('回した楕円：面積は π a b の四分のうち、長い軸の向きに伸びる', Math.abs(gl.面積() - Math.PI * 160) / (Math.PI * 160) < 0.04 && gl.画素(42, 42)[3] > 0.99 && gl.画素(42, 21)[3] < 0.01, `面積 ${gl.面積()}`);
  gl = 描く((p) => { p.fillStyle = '#fff'; p.beginPath(); p.moveTo(10, 50); p.quadraticCurveTo(30, 10, 50, 50); p.closePath(); p.fill(); });
  確('二次曲線で囲んだ形の面積（底四十・高さ二十の放物線の三分の二）', Math.abs(gl.面積() - 40 * 20 * 2 / 3) / (40 * 20 * 2 / 3) < 0.04, `面積 ${gl.面積()}`);
}

console.log('三、線');
{
  const 線 = (端, 幅 = 4) => 描く((p) => { p.strokeStyle = '#fff'; p.lineWidth = 幅; p.lineCap = 端; p.beginPath(); p.moveTo(10, 20); p.lineTo(50, 20); p.stroke(); });
  確('butt の線（長さ四十・幅四）は百六十画素', 線('butt').面積() === 160, `面積 ${線('butt').面積()}`);
  確('square の線は両端に幅の半分ずつ伸びて百七十六画素', 線('square').面積() === 176, `面積 ${線('square').面積()}`);
  確('round の線は両端に半円が付く（百六十＋π×四）', 近い(線('round').面積(), 160 + Math.PI * 4, 4), `面積 ${線('round').面積()}`);
  const 輪 = (継) => 描く((p) => { p.strokeStyle = '#fff'; p.lineWidth = 4; p.lineJoin = 継; p.beginPath(); p.rect(10, 10, 30, 30); p.stroke(); });
  確('閉じた四角の線（miter）は外の三十四角から内の二十六角を除いた四百八十画素', 輪('miter').面積() === 480, `面積 ${輪('miter').面積()}`);
  確('bevel の継ぎ目は四隅が欠ける（四百八十より少し少ない）', 輪('bevel').面積() < 480 && 輪('bevel').面積() >= 470, `面積 ${輪('bevel').面積()}`);
  let gl = 描く((p) => { p.strokeStyle = '#fff'; p.lineWidth = 1; p.setLineDash([5, 5]); p.beginPath(); p.moveTo(0, 40.5); p.lineTo(40, 40.5); p.stroke(); });
  確('点線（五画素ずつ）は長さ四十の半ば', 近い(gl.面積(), 20, 1), `面積 ${gl.面積()}`);
  gl = 描く((p) => { p.strokeStyle = '#fff'; p.lineWidth = 0.5; p.beginPath(); p.moveTo(10, 30.5); p.lineTo(50, 30.5); p.stroke(); });
  確('一画素より細い線（幅〇.五）は一画素の幅で、濃さ〇.五で引く', 近い(gl.画素(30, 30)[3], 0.5, 0.01) && gl.画素(30, 31)[3] < 0.01 && gl.画素(30, 29)[3] < 0.01, `濃さ ${gl.画素(30, 30)[3].toFixed(3)}`);
}

console.log('四、切り抜き・濃淡・全体の濃さ');
{
  let gl = 描く((p) => { p.fillStyle = '#fff'; p.save(); p.beginPath(); p.rect(0, 0, 10, 10); p.clip(); p.fillRect(0, 0, 64, 64); p.restore(); p.fillRect(40, 40, 2, 2); });
  確('切り抜きの内だけに塗り、restore で切り抜きが解ける', gl.面積() === 104, `面積 ${gl.面積()}`);
  gl = 描く((p) => { const g = p.createLinearGradient(0, 0, 40, 0); g.addColorStop(0, '#ff0000'); g.addColorStop(1, '#0000ff'); p.fillStyle = g; p.fillRect(0, 0, 40, 10); });
  const 左 = gl.画素(0, 5), 中 = gl.画素(20, 5), 右 = gl.画素(39, 5);
  確('線形の濃淡：左は赤、右は青、真ん中は混ぜた色', 左[0] > 0.97 && 左[2] < 0.03 && 右[2] > 0.97 && 右[0] < 0.03 && 近い(中[0], 0.49, 0.03) && 近い(中[2], 0.51, 0.03), `中 ${中.map((v) => v.toFixed(2)).join(',')}`);
  gl = 描く((p) => { p.fillStyle = '#fff'; p.globalAlpha = 0.5; p.fillRect(0, 0, 4, 4); p.globalAlpha = 1; p.fillStyle = 'rgba(0,0,0,.5)'; p.fillRect(10, 0, 4, 4); });
  確('全体の濃さ〇.五（掛け合わせ済みの白は〇.五）と、色の濃さ〇.五', 近い(gl.画素(1, 1)[3], 0.5, 0.01) && 近い(gl.画素(1, 1)[0], 0.5, 0.01) && 近い(gl.画素(11, 1)[3], 0.5, 0.01) && gl.画素(11, 1)[0] < 0.01);
}

console.log('五、層（薄めて描く兵を一度濃く描く別の描き先）');
{
  let 囲 = null;
  const gl = 描く((p, 筆ら) => {
    const r = 筆ら.層を用意する(); 囲 = r;
    r.筆.fillStyle = '#00ff00'; r.筆.fillRect(5, 5, 10, 10); r.筆.fillRect(40, 40, 10, 10);
    p.globalAlpha = 0.5; p.drawImage(r.画, 0, 0, 20, 20, 0, 0, 20, 20); p.globalAlpha = 1;   // 囲み（〇〜二十）だけを重ねる
    r.筆.clearRect(0, 0, 20, 20);
    p.globalAlpha = 1; p.drawImage(r.画, 0, 0, 20, 20, 0, 30, 20, 20);                      // 消したあとは何も重ならない
  });
  const 緑 = gl.画素(8, 8);
  確('層を用意すると、層の筆と重ねる画が出る', !!(囲 && 囲.筆 && 囲.画 && 囲.画.GL層));
  確('層に濃く塗ったものを、濃さ〇.五で重ねる', 近い(緑[3], 0.5, 0.01) && 近い(緑[1], 0.5, 0.01) && 緑[0] < 0.01, `画素 ${緑.map((v) => v.toFixed(2)).join(',')}`);
  確('重ねるのは読んだ囲みの内だけ（囲みの外に塗った四角は重ならない）', gl.画素(45, 45)[3] < 0.01);
  確('層の囲みを消したあとに重ねても、何も出ない', gl.画素(8, 38)[3] < 0.01);
  const 素 = 描く((p, 筆ら) => { 筆ら.層を用意する(); p.fillStyle = '#fff'; p.fillRect(0, 0, 1, 1); });
  確('塗らない層は GL の資を作らない（描き先が作られない）', 素.記.枠 === 0 && 素.記.塗り === 1, `描き先 ${素.記.枠}・塗りの回 ${素.記.塗り}`);
}

console.log('六、WebGL2 が無ければ作らない');
{
  global.document = { createElement: () => ({ width: 1, height: 1, addEventListener() {}, getContext: (t) => (t === 'webgl' ? {} : null) }) };
  const r = H.GL筆を作る();
  delete global.document;
  確('WebGL1 しか無い端末では作らない（2D の画布で描く）', r === null);
  確('document の無い所（Node）でも落ちずに null', H.GL筆を作る() === null);
}

console.log('七、どちらの筆で描くかを量って決める');
{
  /* 一コマずつ選ばせ、選んだ筆の重さ（ms）だけ刻を進める */
  const 回す = (選, 重さ, 数, コマ, 使える = true, 今0 = 0) => {
    let 今 = 今0; const 選んだ = [];
    for (let i = 0; i < コマ; i++) { const 種 = 選.選ぶ(今, 数, 使える); 選んだ.push(種); 今 += 重さ[種]; }
    return { 今, 選んだ };
  };
  const 新 = () => new H.筆の選び手({ 重い: 100, 窓: 6, 慣らし: 2, 回: 2, 差: 0.08, 見直し倍: 1.6, 見直し間: 5000 });
  let 選 = 新(); let r = 回す(選, { gl: 30, '2d': 30 }, 50, 60);
  確('兵の少ないコマ（重いに届かない）では量らず 2D で描く', r.選んだ.every((x) => x === '2d') && !選.様子().量り中 && 選.様子().決め === null);
  選 = 新(); r = 回す(選, { gl: 10, '2d': 25 }, 300, 60);
  確('GL筆の方が速ければ GL筆に決める', 選.様子().決め === 'gl' && r.選んだ.slice(-5).every((x) => x === 'gl'), JSON.stringify(選.様子().結果));
  確('量るあいだは GL筆と 2D を交互に使う', r.選んだ.includes('gl') && r.選んだ.slice(0, 40).includes('2d'));
  選 = 新(); 回す(選, { gl: 24, '2d': 25 }, 300, 60);
  確('ほぼ同じ速さ（差が八分に届かない）なら 2D に決める', 選.様子().決め === '2d', JSON.stringify(選.様子().結果));
  選 = 新(); 回す(選, { gl: 60, '2d': 25 }, 300, 60);
  確('GL筆の方が遅ければ 2D に決める', 選.様子().決め === '2d');
  /* 長すぎる間合い（盤の視点にいた・画面を離れた）は捨てる：2D のコマのあいだに長い間を挟んでも、GL筆に決まる */
  選 = 新(); { let 今 = 0, 回 = 0; for (let i = 0; i < 60; i++) { const 種 = 選.選ぶ(今, 300, true); 今 += 種 === 'gl' ? 10 : (++回 % 5 === 0 ? 4000 : 25); } }
  確('長すぎる間合いは量りに入れない', 選.様子().決め === 'gl', JSON.stringify(選.様子().結果));
  /* 量り直し：決めたあと、描く兵が一.六倍に増え、見直し間を過ぎれば量り直す */
  選 = 新(); r = 回す(選, { gl: 30, '2d': 25 }, 300, 60);
  確('決めたあとは量らない（同じ数のまま）', 選.様子().決め === '2d' && !回す(選, { gl: 30, '2d': 25 }, 300, 10, true, r.今).選んだ.includes('gl'));
  r = 回す(選, { gl: 30, '2d': 25 }, 600, 3, true, r.今 + 6000);
  確('描く兵が大きく増えれば量り直す', 選.様子().量り中 && r.選んだ.includes('gl'));
  let 問い = 0; 選 = 新(); r = 回す(選, { gl: 10, '2d': 25 }, 300, 60, () => { 問い++; return false; });
  確('GL筆が使えなければ 2D で描き、量らない', r.選んだ.every((x) => x === '2d') && 選.様子().決め === null);
  問い = 0; 選 = new H.筆の選び手({ 重い: 100 }); 回す(選, { gl: 10, '2d': 25 }, 50, 30, () => { 問い++; return true; });
  確('兵の少ないコマでは、GL筆が使えるかを問わない（GL の文脈を作らない）', 問い === 0, `問い ${問い}`);
}

console.log(誤 ? `\nエラー: ${誤}件` : '\nエラー: なし');
process.exit(誤 ? 1 : 0);
