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

export function 高さ図を据える(高, w, h, 単, 丈単) {
  let 最 = 0;
  for (let i = 0; i < 高.length; i++) if (高[i] > 最) 最 = 高[i];
  図 = { 高, w, h, 単, 丈単, 最: 最 * 丈単 };             // 最 … いちばん高い所（歩）
}
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

/* ---- 向き（GDD 8.10）----

   遊ぶ側の申し出は「山の向こう側をどう見えるようにするか。マップを回せるように
   して奥も見えるようにするのか」であった。盤を九十度ずつ回して眺める。
     0 … 南から北を見る（いつもの向き）
     1 … 西から東を見る
     2 … 北から南を見る
     3 … 東から西を見る
   盤の理（隊の居場所・向き）は回さない。絵を描くときだけ、盤の所を「視」の所へ写す。
   視の所は、回した盤を真上から見たときの所（横 vx・縦 vy）である。 */
let 向き = 0;
let 野 = { w: 1, h: 1 };
export function 向きを据える(r, w, h) { 向き = ((r % 4) + 4) % 4; 野 = { w, h }; return 向き; }
export const 今の向き = () => 向き;
export const 向きの角 = () => 向き * Math.PI / 2;
// 回した盤の寸法
export const 視の寸 = () => (向き % 2 ? { w: 野.h, h: 野.w } : { w: 野.w, h: 野.h });
// 盤の所 → 視の所
export function 視(x, y) {
  switch (向き) {
    case 1: return [野.h - y, x];
    case 2: return [野.w - x, 野.h - y];
    case 3: return [y, 野.w - x];
    default: return [x, y];
  }
}
// 視の所 → 盤の所
export function 視から盤(vx, vy) {
  switch (向き) {
    case 1: return [vy, 野.h - vx];
    case 2: return [野.w - vx, 野.h - vy];
    case 3: return [野.w - vy, vx];
    default: return [vx, vy];
  }
}
/* 筆を回す。傾けた筆（scale(s, s×縮)）のあとに掛けると、盤の所のまま描いたものが
   回した眺めに写る（地・枠・跡のように地べたに貼るもの）。 */
const 回しの式 = () => [[1, 0, 0, 1, 0, 0], [0, 1, -1, 0, 野.h, 0], [-1, 0, 0, -1, 野.w, 野.h], [0, -1, 1, 0, 0, 野.w]][向き];
export function 盤の筆を回す(ctx) { if (向き) ctx.transform(...回しの式()); }
// 回した筆を、視の所で描く筆へ戻す（立つもの・斜めに焼いた地を描くとき）
export function 視の筆へ(ctx) {
  if (!向き) return;
  const [a, b, c, d, e, f] = 回しの式();
  const det = a * d - b * c;
  ctx.transform(d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det);
}
/* 地の高さぶんの持ち上げを、回して傾けた筆の上のずれ（盤の歩）で返す。
   画面の上へ持ち上げる向きは、回し方によって盤の上では東西にも南北にもなる。 */
export function 揚げ(x, y) {
  const L = 浮き(x, y) / 縦の縮み();
  if (!L) return [0, 0];
  switch (向き) {
    case 1: return [-L, 0];
    case 2: return [0, L];
    case 3: return [L, 0];
    default: return [0, -L];
  }
}

/* ---- 地の札 ----
   地に焼いていた字（峰・村・渡し・曲輪・門・堀の名）。地と一緒に回すと、北から
   見れば逆さ、東西からは横倒しになって読めない。焼くときは控えるだけにして、
   描くたびに画面に向けて立てる。控えていないとき（旧い絵）はその場で書く。 */
export const 地の札 = { 野: [], 城: [] };
let 札の控え = null;
export function 札を控える(先) { 先.length = 0; 札の控え = 先; }
export function 札を控え止める() { 札の控え = null; }
// 筆の今の書体・色のまま字を置く。縁 を立てれば縁取りもする
export function 地の字(g, s, x, y, 縁) {
  if (札の控え) {
    札の控え.push({ s, x, y, font: typeof g.font === "string" ? g.font : "13px serif", align: g.textAlign || "start", lw: g.lineWidth, st: g.strokeStyle, fi: g.fillStyle, 縁 });
    return;
  }
  if (縁) g.strokeText(s, x, y);
  g.fillText(s, x, y);
}

/* 画の所。盤の（x, y）を、斜めの眺めの横と縦（歩の単位のまま）へ写す。 */
export const 画の横 = (x, y) => 視(x, y)[0];
export const 画の縦 = (x, y) => 視(x, y)[1] * 縦の縮み() - 浮き(x, y);

/* 画の上の所（視の横 vx・画の縦）から、盤の所を求める（押した所を盤へ戻す）。
   持ち上げは盤の所しだいなので、二、三度回して寄せる。 */
export function 盤へ戻す(vx, 画y) {
  const k = 縦の縮み();
  let vy = 画y / k;
  for (let i = 0; i < 4; i++) { const [x, y] = 視から盤(vx, vy); vy = (画y + 浮き(x, y)) / k; }
  const [x, y] = 視から盤(vx, vy);
  return { x, y };
}

/* 盤の所（x, y）を画面の真ん中に映すカメラの所。カメラは平らな面で持つので、
   山の上の所はその高さぶん上に映る。真ん中に据えるときは、持ち上げを見込んで
   カメラを手前へずらす（山頂の隊へ寄ると、隊が画面の上へ逃げていた）。 */
export function 真ん中に据える(x, y) {
  const k = 縦の縮み();
  const [x2, y2] = 視から盤(画の横(x, y), 画の縦(x, y) / k);
  return { x: x2, y: y2 };
}

/* 盤の所（x, y）が、持ち上げたうえで画面に映るか。余 は画面の外へ許す点の数。
   山の上の隊は地べたの所より上に映るので、地べたの所で量ると取りこぼす。 */
export function 画面に映るか(x, y, cam, W, H, 余 = 0) {
  const k = 縦の縮み();
  const [cvx, cvy] = 視(cam.x, cam.y);
  const sx = (画の横(x, y) - cvx) * cam.s + W / 2;
  const sy = (画の縦(x, y) - cvy * k) * cam.s + H / 2;
  return sx > -余 && sx < W + 余 && sy > -余 && sy < H + 余;
}
// 画面の真ん中からの隔たり（点）。持ち上げたうえで量る
export function 画面の真ん中から(x, y, cam, W, H) {
  const k = 縦の縮み();
  const [cvx, cvy] = 視(cam.x, cam.y);
  return Math.hypot((画の横(x, y) - cvx) * cam.s, (画の縦(x, y) - cvy * k) * cam.s);
}

/* 見えている盤の範囲（盤の所の外枠）。画面の四隅を盤へ戻して囲む。 */
export function 見える範囲(cam, W, H, 余 = 0) {
  const k = 縦の縮み();
  const [cvx, cvy] = 視(cam.x, cam.y);
  const vx0 = cvx - W / 2 / cam.s - 余, vx1 = cvx + W / 2 / cam.s + 余;
  const vy0 = cvy - H / 2 / (cam.s * k) - 余, vy1 = cvy + H / 2 / (cam.s * k) + 余 + 揚げ代();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [vx, vy] of [[vx0, vy0], [vx1, vy0], [vx0, vy1], [vx1, vy1]]) {
    const [x, y] = 視から盤(vx, vy);
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, x1, y0, y1 };
}

/* ---- 地を斜めに焼く ----

   真上から焼いた地の画布（src）を、斜めの眺めへ写した画布を返す。
   列ごとに、手前（下）から奥（上）へ辿り、まだ塗っていない所だけを塗る。
   手前を向いた斜面は縦に伸び、向こう側の斜面は手前の丘に隠れる。

   返す 上 は、画布の上の端より上へせり出した分（歩）である。貼るときは
   （0, −上）から、縦 src高×傾き＋上 の大きさで貼る。 */
/* ---- 切り立った面の肌（城の石垣・空堀の切岸）----
   斜めに起こすと、段の手前の面（石垣の正面）が見えてくる。地の画は真上から
   描いたものなので、その面の色を持たない。引き伸ばすと、天端の色が縦に流れた
   だけの帯になる。城の地を焼く側が、どこが石垣でどこが土の切岸かを教える。
   面の型(盤x, 盤y) … 0 何もなし（なだらかに伸ばす）・1 石垣・2 土の切岸 */
let 面の型 = null;
export function 面を据える(fn) { 面の型 = fn || null; }
// 石垣の正面。石を横に寝かせて積み、段ごとに縦目地をずらす。上ほど明るい
function 石垣の色(o, di, x, u, 伸, 明) {
  const 段 = Math.floor(u / 3.2), 段内 = u - 段 * 3.2;
  const 目地 = 段内 < 0.9 || ((x + (段 % 2) * 4) % 8) < 1;
  const 斑 = ((x * 7 + 段 * 13) % 5) * 4;
  let v = 178 - (u / Math.max(1, 伸)) * 46 + 斑;
  if (u < 1) v = 214;                                      // 天端の照り
  if (目地 && u >= 1) v -= 34;
  v *= 明;
  o[di] = Math.min(255, v * 0.98); o[di + 1] = Math.min(255, v * 0.95); o[di + 2] = Math.min(255, v * 0.86); o[di + 3] = 255;
}
function 切岸の色(o, di, x, u, 伸, 明) {
  const v = (150 - (u / Math.max(1, 伸)) * 40 + ((x * 5 + u * 3) % 7) * 3) * 明;
  o[di] = Math.min(255, v * 1.0); o[di + 1] = Math.min(255, v * 0.84); o[di + 2] = Math.min(255, v * 0.62); o[di + 3] = 255;
}

/* 地の上に重ねる画（城の石垣・門・櫓）を、地と同じく持ち上げて写す。
   面は伸ばさない（石垣の正面は地の側が描く）。地に隠れる所は隠す。 */
export function 斜めに写す(src0, 野w, 野h) { return 斜めに焼く(src0, 野w, 野h, true); }

export function 斜めに焼く(src0, 野w, 野h, 重ね) {
  const k = 縦の縮み();
  const 倍 = src0.width / 野w;                        // 画素あたりの歩の逆
  /* 回した眺めでは、真上の地をまず回して写す（九十度ずつなので画素は崩れない） */
  let src = src0;
  if (向き) {
    const 寸 = 視の寸();
    src = document.createElement("canvas");
    src.width = Math.round(寸.w * 倍); src.height = Math.round(寸.h * 倍);
    const g = src.getContext("2d");
    const [a, b, c, d, e, f] = 回しの式();
    g.setTransform(a, b, c, d, e * 倍, f * 倍);
    g.drawImage(src0, 0, 0);
  }
  const sw = src.width, sh = src.height;
  // せり出しの最大を測る
  let 最 = 0;
  if (図) for (let i = 0; i < 図.高.length; i++) { const v = 図.高[i] * 図.丈単; if (v > 最) 最 = v; }
  const 上 = 最 * 斜め.持ち上げ + 4;                   // 歩
  const 上px = Math.ceil(上 * 倍);
  const dh = Math.ceil(sh * k) + 上px + 2;
  const out = document.createElement("canvas");
  out.width = sw; out.height = dh;
  const sctx = src.getContext("2d");
  const 画素 = sctx.getImageData(0, 0, sw, sh);
  const sd = 画素 && 画素.data;
  if (!sd) return { 画: null, 上: 0, 縦: 0, 横: 0 };   // 画素を読めぬ場（試しの画面など）では焼かず、真上の地を貼る
  const og = out.getContext("2d");
  const od = og.createImageData(sw, dh);
  const o = od.data;
  // 行ごとの持ち上げ（画素）。列ごとに同じ表を使い回さぬよう、列の中で引く
  const 丈px = new Float32Array(sh);
  const 面 = 重ね ? null : 面の型;
  for (let x = 0; x < sw; x++) {
    const vx = (x + 0.5) / 倍;
    for (let y = 0; y < sh; y++) { const [wx, wy] = 視から盤(vx, (y + 0.5) / 倍); 丈px[y] = 浮き(wx, wy) * 倍; }
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
      if (重ね) {
        /* 重ねる画は一行だけ置く。面を伸ばすのは地の役目である */
        if (sd[si + 3] > 0 && yp >= 0) {
          const di = (yp * sw + x) * 4;
          o[di] = sd[si]; o[di + 1] = sd[si + 1]; o[di + 2] = sd[si + 2]; o[di + 3] = sd[si + 3];
          if (伸 >= 2 && yp + 1 < 下) { const d2 = di + sw * 4; o[d2] = sd[si]; o[d2 + 1] = sd[si + 1]; o[d2 + 2] = sd[si + 2]; o[d2 + 3] = sd[si + 3]; }
        }
        頂 = Math.max(0, yp);
        if (頂 === 0) break;
        continue;
      }
      /* 切り立った面（石垣・切岸）は、その肌で塗る */
      let 型 = 0;
      if (面 && 伸 > 2.2) { const [wx, wy] = 視から盤((x + 0.5) / 倍, (y + 0.5) / 倍); 型 = 面(wx, wy); }
      if (型) {
        for (let yy = Math.max(0, yp); yy < 下; yy++) {
          const di = (yy * sw + x) * 4;
          if (型 === 1) 石垣の色(o, di, x, yy - yp, 伸, 1); else 切岸の色(o, di, x, yy - yp, 伸, 1);
        }
        pr = r; pg = gg; pb = bb;
        頂 = Math.max(0, yp);
        if (頂 === 0) break;
        continue;
      }
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
  return { 画: out, 上, 縦: dh / 倍, 横: sw / 倍 };
}

/* 見えている盤の縦の範囲を量るときの余り（歩）。丘の上の者は持ち上がって、
   盤の所より上（手前の下の端より内）に見える。 */
/* 余りは、いちばん高い所の持ち上げを縦の縮みで割ったもの（盤の縦の歩）。
   百六十歩で決め打ちにしていたころは、関ヶ原の山の上の隊が「画面の外」と量られ、
   画面の真ん中に映っているのに一人ずつ描く隊から漏れて、駒のまま残った
   （遊ぶ側がスマホで大谷吉継隊を見て気づいた）。 */
export const 揚げ代 = () => (図 && 斜め.入 ? (図.最 * 斜め.持ち上げ) / 縦の縮み() + 20 : 0);
