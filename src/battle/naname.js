/* ==========================================================================
   斜めの眺め（GDD 8.10）

   遊ぶ側の申し出は「今の完全上からの目線というよりか、斜めから高低などがわかる
   ような視点にして、もう少しリアルな感じを表現したい」であった。

   盤の理は真上から見た平らな野のままにして、絵だけを斜めから見下ろす形に写す。
     一、縦の縮み … 野の奥行きを 傾き（cos θ）だけ縮める。手前が近く、奥が遠い
     二、高さの持ち上げ … 地の高さぶん、絵を上へ持ち上げる。丘の頂は上へせり出し、
                       手前を向いた斜面は引き伸ばされ、向こう側の斜面は丘に隠れる

   地は一度だけ斜めに焼き直す（斜めに焼く）。兵・駒・札は、描くときに
   画の縦（y×傾き−持ち上げ）で置く。どちらも同じ高さの図（高さ図）を引くので、
   丘の上の兵は丘の上に立つ。

   城攻めの盤は高さの図を持たせない（傾けるだけ）。石垣と曲輪は別の画布に
   平らに焼いてあり、持ち上げると地と食い違うからである。
   ========================================================================== */

const 棚の鍵 = "sengoku:視点";

/* 傾きと持ち上げ。真上（傾き一・持ち上げ零）にも戻せる。 */
/* 傾き〇.五八は、真上から五十五度ほど倒した眺め（遊ぶ側が三つの案から選んだもの）。
   持ち上げ一.〇は「普通」の盛り上がり。高さの図そのものが山の高さに比例しているので、
   高い山ほど大きく、低い丘ほど控えめにせり上がる。 */
export const 斜め = { 傾き: 0.58, 持ち上げ: 1.0, 入: true };


export function 視点を読む() {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(棚の鍵) : null;
    斜め.入 = v !== "真上";
  } catch (e) { /* 読めなければ斜め */ }
  return 斜め.入;
}
export function 視点を替える(入) {
  斜め.入 = !!入;
  try { if (typeof localStorage !== "undefined") localStorage.setItem(棚の鍵, 入 ? "斜め" : "真上"); } catch (e) { /* よい */ }
  return 斜め.入;
}

// いま効いている縦の縮み
export const 縦の縮み = () => (斜め.入 ? 斜め.傾き : 1);

/* ---- 高さの図。地を焼いたときに据える（野だけ） ---- */
let 図 = null;   // { 高: Float32Array, w, h, 単: 一升あたりの歩, 丈単: 値一あたりの歩 }

export function 高さ図を据える(高, w, h, 単, 丈単) { 図 = { 高, w, h, 単, 丈単 }; }
export function 高さ図を外す() { 図 = null; }
export const 高さ図があるか = () => !!図;

// その所の地の高さ（歩）。図が無ければ零。
export function 地の丈(x, y) {
  if (!図) return 0;
  const fx = x / 図.単, fy = y / 図.単;
  const x0 = Math.max(0, Math.min(図.w - 1, Math.floor(fx))), y0 = Math.max(0, Math.min(図.h - 1, Math.floor(fy)));
  const x1 = Math.min(図.w - 1, x0 + 1), y1 = Math.min(図.h - 1, y0 + 1);
  const tx = Math.max(0, Math.min(1, fx - x0)), ty = Math.max(0, Math.min(1, fy - y0));
  const H = 図.高, w = 図.w;
  const a = H[y0 * w + x0], b = H[y0 * w + x1], c = H[y1 * w + x0], d = H[y1 * w + x1];
  return ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty) * 図.丈単;
}

// 画の上での持ち上げ（歩）。平らな所でも、うねりの分だけわずかに動く。
export const 浮き = (x, y) => (斜め.入 ? 地の丈(x, y) * 斜め.持ち上げ : 0);

/* 画の縦。盤の（x, y）を、斜めの眺めの縦の位置へ写す（歩の単位のまま）。 */
export const 画の縦 = (x, y) => y * 縦の縮み() - 浮き(x, y);

/* 画の上の所から、盤の所を求める（押した所を盤へ戻す）。
   持ち上げは盤の所しだいなので、二、三度回して寄せる。 */
export function 盤へ戻す(x, 画y) {
  const k = 縦の縮み();
  let y = 画y / k;
  for (let i = 0; i < 4; i++) y = (画y + 浮き(x, y)) / k;
  return y;
}

/* ---- 地を斜めに焼く ----

   真上から焼いた地の画布（src）を、斜めの眺めへ写した画布を返す。
   列ごとに、手前（下）から奥（上）へ辿り、まだ塗っていない所だけを塗る。
   手前を向いた斜面は縦に伸び、向こう側の斜面は手前の丘に隠れる。

   返す 上 は、画布の上の端より上へせり出した分（歩）である。貼るときは
   （0, −上）から、縦 src高×傾き＋上 の大きさで貼る。 */
export function 斜めに焼く(src, 野w, 野h) {
  const k = 縦の縮み();
  const sw = src.width, sh = src.height;
  const 倍 = sw / 野w;                                // 画素あたりの歩の逆
  // せり出しの最大を測る
  let 最 = 0;
  if (図) for (let i = 0; i < 図.高.length; i++) { const v = 図.高[i] * 図.丈単; if (v > 最) 最 = v; }
  const 上 = 最 * 斜め.持ち上げ + 4;                   // 歩
  const 上px = Math.ceil(上 * 倍);
  const dh = Math.ceil(sh * k) + 上px + 2;
  const out = document.createElement("canvas");
  out.width = sw; out.height = dh;
  const sctx = src.getContext("2d");
  const sd = sctx.getImageData(0, 0, sw, sh).data;
  const og = out.getContext("2d");
  const od = og.createImageData(sw, dh);
  const o = od.data;
  // 行ごとの持ち上げ（画素）。列ごとに同じ表を使い回さぬよう、列の中で引く
  const 丈px = new Float32Array(sh);
  for (let x = 0; x < sw; x++) {
    const wx = (x + 0.5) / 倍;
    for (let y = 0; y < sh; y++) 丈px[y] = 浮き(wx, (y + 0.5) / 倍) * 倍;
    let 頂 = dh;                                      // まだ塗っていない一番下の行の一つ下
    let pr = -1, pg = 0, pb = 0;                      // 一つ手前に塗った行の色
    for (let y = sh - 1; y >= 0; y--) {
      const yp = Math.floor(y * k + 上px - 丈px[y]);
      if (yp >= 頂) continue;                          // 手前に隠れる
      const si = (y * sw + x) * 4;
      // 手前を向いた斜面は、少し明るく（日を受ける面）。奥を向く面は隠れる
      const 伸 = 頂 - yp;
      const 明 = 伸 > 1.6 ? Math.min(1.12, 1 + (伸 - 1) * 0.03) : 1;
      const r = Math.min(255, sd[si] * 明), gg = Math.min(255, sd[si + 1] * 明), bb = Math.min(255, sd[si + 2] * 明);
      const 下 = Math.min(頂, dh);
      /* 引き伸ばす所は、手前の行の色へなだらかに移す（縦の筋を立てない） */
      const 滑 = 伸 > 1.5 && pr >= 0;
      for (let yy = Math.max(0, yp); yy < 下; yy++) {
        const di = (yy * sw + x) * 4;
        if (滑) {
          const t = (yy - yp) / 伸;
          o[di] = r + (pr - r) * t; o[di + 1] = gg + (pg - gg) * t; o[di + 2] = bb + (pb - bb) * t;
        } else { o[di] = r; o[di + 1] = gg; o[di + 2] = bb; }
        o[di + 3] = sd[si + 3];
      }
      pr = r; pg = gg; pb = bb;
      頂 = Math.max(0, yp);
      if (頂 === 0) break;
    }
  }
  og.putImageData(od, 0, 0);
  return { 画: out, 上, 縦: dh / 倍 };
}

/* 見えている盤の縦の範囲を量るときの余り（歩）。丘の上の者は持ち上がって、
   盤の所より上（手前の下の端より内）に見える。 */
export const 揚げ代 = () => (図 && 斜め.入 ? 160 : 0);
