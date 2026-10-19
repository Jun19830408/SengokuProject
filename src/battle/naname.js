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
export const 斜め = { 傾き: 0.58, 持ち上げ: 1.0, 入: true, 森: "木" };   // 森は遊ぶ側が選んだ「木を一本ずつ」

/* 森の描き方（見た目の案を比べるための切り替え。棚の sengoku:森の描き）
     塊 … 梢を一つの塊として持ち上げ、縁に幹と陰の面を見せる
     木 … 木を一本ずつ立てて描く（兵と前後を重ね合う）
     平 … 従来どおり、地に描いた梢のまま */
export function 森の描きを読む() {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem("sengoku:森の描き") : null;
    if (v === "塊" || v === "木" || v === "平") 斜め.森 = v;
  } catch (e) { /* 読めなければ既定 */ }
  return 斜め.森;
}
森の描きを読む();


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

/* 画高 … 絵を起こすときだけ使う高さ（梢の塊を含む）。隊は地べた（高）に立つ。
   森を梢の塊として持ち上げても、森に入った隊が梢の上に乗らないように分けて持つ。 */
export function 高さ図を据える(高, w, h, 単, 丈単, 画高) {
  let 最 = 0;
  const 上の図 = 画高 || 高;
  let 低 = Infinity;
  for (let i = 0; i < 上の図.length; i++) { if (上の図[i] > 最) 最 = 上の図[i]; if (上の図[i] < 低) 低 = 上の図[i]; }
  // 最 … いちばん高い所（歩）、低 … いちばん低い所（歩）
  図 = { 高, 画高: 画高 || null, w, h, 単, 丈単, 最: 最 * 丈単, 低: (Number.isFinite(低) ? 低 : 0) * 丈単 };
}
export function 高さ図を外す() { 図 = null; }
export const 高さ図があるか = () => !!図;

// その所の地の高さ（歩）。図が無ければ零。画 を立てれば梢まで含めた高さ
export function 地の丈(x, y, 画) {
  if (!図) return 0;
  const fx = x / 図.単, fy = y / 図.単;
  const x0 = Math.max(0, Math.min(図.w - 1, Math.floor(fx))), y0 = Math.max(0, Math.min(図.h - 1, Math.floor(fy)));
  const x1 = Math.min(図.w - 1, x0 + 1), y1 = Math.min(図.h - 1, y0 + 1);
  const tx = Math.max(0, Math.min(1, fx - x0)), ty = Math.max(0, Math.min(1, fy - y0));
  const H = (画 && 図.画高) || 図.高, w = 図.w;
  const a = H[y0 * w + x0], b = H[y0 * w + x1], c = H[y1 * w + x0], d = H[y1 * w + x1];
  return ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty) * 図.丈単;
}

if (typeof window !== "undefined") { window.__地の丈 = 地の丈; window.__隠れ = (x, y) => [隠れの際(x, y), 画の縦(x, y)]; }   // 撮る道具・試しが覗く口
// 画の上での持ち上げ（歩）。平らな所でも、うねりの分だけわずかに動く。
export const 浮き = (x, y) => (斜め.入 ? 地の丈(x, y) * 斜め.持ち上げ : 0);
// 絵の持ち上げ（梢の塊を含む）。斜めに焼くときと、梢を被せるときに使う
export const 画の浮き = (x, y) => (斜め.入 ? 地の丈(x, y, true) * 斜め.持ち上げ : 0);

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

// 梢の高さまで含めた持ち上げのずれ（森を梢の塊で描くとき、梢を被せる所）
export function 画の揚げ(x, y) {
  const L = 画の浮き(x, y) / 縦の縮み();
  if (!L) return [0, 0];
  switch (向き) {
    case 1: return [-L, 0];
    case 2: return [0, L];
    case 3: return [L, 0];
    default: return [0, -L];
  }
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
   面の型(盤x, 盤y) … 0 何もなし（なだらかに伸ばす）・1 石垣・2 土の切岸・3 林の縁・4 橋の側面 */
let 面の型 = null;
export function 面を据える(fn) { 面の型 = fn || null; }
// 石垣の正面。石を横に寝かせて積み、段ごとに縦目地をずらす。上ほど明るい。
// 高 は面の根からの高さ（画素）。一行ずつ起こした面を一枚の石垣として続けるため、
// 石の段はこの高さで刻む（行ごとに刻んでいたころは、行の数だけ天端の照りと目地が
// 重なって、石垣が何段もの階段に見えた）
function 石垣の色(o, di, x, 高, 伸, 明) {
  const 段 = Math.floor(高 / 3.2), 段内 = 高 - 段 * 3.2;
  const 目地 = 段内 < 0.8 || ((x + (段 % 2) * 4 + (段 % 3) * 1.5) % 8.5) < 0.9;
  const 斑 = ((x * 7 + 段 * 13) % 5) * 4 + ((段 * 7) % 3) * 3;
  let v = 138 + Math.min(1, 高 / 34) * 40 + 斑;
  if (目地) v -= 30;
  v *= 明;
  o[di] = Math.min(255, v * 0.98); o[di + 1] = Math.min(255, v * 0.95); o[di + 2] = Math.min(255, v * 0.86); o[di + 3] = 255;
}
// 林の縁。梢の下に幹が並び、奥は暗い。上ほど葉の緑
function 林縁の色(o, di, x, u, 伸, 明) {
  const t = u / Math.max(1, 伸);
  const 幹 = ((x * 13) % 7) < 1.3 && t > 0.35;
  let r = 58 - t * 26, g = 84 - t * 40, b = 40 - t * 18;
  if (t < 0.35) { r = 70 + (x * 7 % 5) * 3; g = 102 + (x * 11 % 7) * 3; b = 46; }   // 葉の裾
  if (幹) { r = 86; g = 70; b = 52; }
  o[di] = r * 明; o[di + 1] = g * 明; o[di + 2] = b * 明; o[di + 3] = 255;
}
// 橋の側面。板の縁に桁を通し、その下は橋脚の間から水が覗く（陰になって暗い）
function 橋桁の色(o, di, x, u, 伸, 明) {
  let r, g, b;
  if (u < 1.6) { r = 112; g = 84; b = 52; }                   // 桁
  else if ((x % 9) < 1.6) { r = 74; g = 56; b = 36; }          // 橋脚
  else { r = 46; g = 64; b = 72; }                            // 橋の下の陰と水
  o[di] = r * 明; o[di + 1] = g * 明; o[di + 2] = b * 明; o[di + 3] = 255;
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
  if (図) 最 = 図.最;
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
  // 天端の照り。続いた面の上の縁に一筋だけ引く
  const 天端 = (x, yy, 型) => {
    if (型 !== 1 || yy < 0 || yy >= dh) return;
    const di = (yy * sw + x) * 4;
    o[di] = Math.min(255, o[di] * 1.25 + 20); o[di + 1] = Math.min(255, o[di + 1] * 1.25 + 18); o[di + 2] = Math.min(255, o[di + 2] * 1.22 + 14);
  };
  for (let x = 0; x < sw; x++) {
    const vx = (x + 0.5) / 倍;
    for (let y = 0; y < sh; y++) { const [wx, wy] = 視から盤(vx, (y + 0.5) / 倍); 丈px[y] = 画の浮き(wx, wy) * 倍; }
    let 頂 = dh;                                      // まだ塗っていない一番下の行の一つ下
    let pr = -1, pg = 0, pb = 0;                      // 一つ手前に塗った行の色
    let 前型 = 0, 面底 = 0;                           // 続いている面の型と、その根（画素）
    let 隠数 = 0;                                     // いま手前の地に隠れている行の数
    let 前頂 = -1, 前覆 = 1;                          // 一つ手前に塗った行の上の画素と、その行が覆う割合
    for (let y = sh - 1; y >= 0; y--) {
      const ypf = y * k + 上px - 丈px[y];
      const yp = Math.floor(ypf);
      if (yp >= 頂) { 隠数++; continue; }              // 手前に隠れる
      /* 稜線。手前の丘の向こうが隠れたあと、その奥の地（低い川や野）が見えてくる所は、
         頂のすぐ上に奥の地が続けて塗られ、頂と奥が地続きに見えた（遊ぶ側の申し出）。
         境目（頂の縁）に暗い筋を一本引く */
      /* 筋の濃さは隠れた奥行き（行の数）に応じてなめらかに上げる。三行ほどで
         一律に引いていたころは、なだらかな丘の頂で列ごとに出たり消えたりして、
         点線の縞になった */
      if (隠数 > 8 && !重ね && 頂 < dh) {
        const 濃 = Math.min(1, (隠数 - 8) / 24) * 0.42;
        const di = (頂 * sw + x) * 4;
        o[di] *= 1 - 濃; o[di + 1] *= 1 - 濃; o[di + 2] *= 1 - 濃 * 0.85;
      }
      隠数 = 0;
      /* 縁をなめらかに。手前の行の上の画素は、その行が一部しか覆っていない。残りを
         奥のこの行の色で埋める（稜線が画素の段々に見えていた） */
      if (!重ね && 前頂 >= 0 && 前頂 < dh && yp < 前頂 && 前覆 < 1) {
        const di = (前頂 * sw + x) * 4, sj = (y * sw + x) * 4, a = 1 - 前覆;
        o[di] = o[di] * 前覆 + sd[sj] * a; o[di + 1] = o[di + 1] * 前覆 + sd[sj + 1] * a; o[di + 2] = o[di + 2] * 前覆 + sd[sj + 2] * a;
      }
      前頂 = yp; 前覆 = 1 - (ypf - yp);
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
      /* 切り立った面（石垣・切岸）は、その肌で塗る。
         面が何行にもまたがるとき（高さの図は升目なので、切り立った際も二、三行に
         分かれて起きる）、続きの行は伸びが小さくても同じ面として塗り、石の段は
         面の根からの高さで刻む。一枚の石垣になる */
      let 型 = 0;
      /* 続きの行も、平らな行（一行の伸びは切り捨てで〇か一）は面にしない。
         一で続けていたころは、橋の床がまるごと桁の色で塗られた */
      if (面 && (伸 > 2.2 || (前型 && 伸 > 1.5))) { const [wx, wy] = 視から盤((x + 0.5) / 倍, (y + 0.5) / 倍); 型 = 面(wx, wy); }
      if (型) {
        if (型 !== 前型) { 天端(x, 頂, 前型); 面底 = 下; }
        for (let yy = Math.max(0, yp); yy < 下; yy++) {
          const di = (yy * sw + x) * 4;
          if (型 === 1) 石垣の色(o, di, x, 面底 - yy, 伸, 1);
          else if (型 === 3) 林縁の色(o, di, x, yy - yp, 伸, 1);
          else if (型 === 4) 橋桁の色(o, di, x, yy - yp, 伸, 1);
          else 切岸の色(o, di, x, yy - yp, 伸, 1);
        }
        前型 = 型;
        pr = r; pg = gg; pb = bb;
        頂 = Math.max(0, yp);
        if (頂 === 0) break;
        continue;
      }
      if (前型) { 天端(x, 頂, 前型); 前型 = 0; }
      /* 引き伸ばす所は、手前の行の色へなだらかに移す（縦の筋を立てない） */
      const 滑 = 伸 > 1.5 && pr >= 0;
      /* 引き伸ばした面には、地肌の細かな斑を足す。二つの画素の色を伸ばしただけでは、
         手前を向いた斜面がのっぺりした色の帯になった */
      const 斑の強さ = 伸 > 2 ? Math.min(1, (伸 - 2) / 6) * 0.11 : 0;
      for (let yy = Math.max(0, yp); yy < 下; yy++) {
        const di = (yy * sw + x) * 4;
        if (滑) {
          const t = (yy - yp) / 伸;
          let m = 1;
          if (斑の強さ) { const h = (((x * 73856093) ^ (yy * 19349663)) >>> 0) % 1021 / 1021; m = 1 + (h - 0.5) * 斑の強さ * 2; }
          o[di] = (r + (pr - r) * t) * m; o[di + 1] = (gg + (pg - gg) * t) * m; o[di + 2] = (bb + (pb - bb) * t) * m;
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

/* 隠れの際。盤の所（x, y）に立つ者が、手前の高い地（城の石垣の天端など）に
   隠れるとき、その地の上の縁の画の縦を返す（隠れなければ Infinity）。
   地は列ごとに手前から奥へ塗り、手前の地が上へ伸びた所より下の奥は塗らない
   （斜めに焼く）。兵は地のあとに描くので、同じ理を兵にも当てる。
   遊ぶ側の申し出は「城門をすり抜けている兵が見受けられる」であった。城の裏から
   見ると、石垣の外の足元に立つ寄せ手が、天端の上に重ねて描かれ、城の中に
   いるように見えていた。 */
/* 野では山が大きく、隠す地は数百歩手前にあることもある。量る先は、盤のいちばん
   高い所と低い所の差を縦の縮みで割った長さまで（それより遠い地が隠すことはない）。
   近くは細かく、遠くは粗く辿る。兵一人ずつ毎コマ量ると重いので、六歩の升ごとに
   一度だけ量って覚えておく（地と向きが変われば覚え直す）。升の中の兵は升の中ほど
   より最大で半升手前にいるので、量り始めを半升ぶん手前へずらす（さもないと兵の
   背の上り坂を「手前の地」と取り違えて隠してしまう）。 */
const 際の升 = 6;
let 際の覚え = null, 際の鍵 = null;
export function 隠れの際(x, y) {
  if (!図 || !斜め.入) return Infinity;
  const k = 縦の縮み();
  const 鍵 = 図;
  if (際の鍵 !== 鍵 || !際の覚え || 際の覚え.向き !== 向き || 際の覚え.k !== k || 際の覚え.持 !== 斜め.持ち上げ) {
    const w = Math.ceil((野.w || 図.w * 図.単) / 際の升) + 1, h = Math.ceil((野.h || 図.h * 図.単) / 際の升) + 1;
    際の覚え = { 向き, k, 持: 斜め.持ち上げ, w, h, 値: new Float32Array(w * h).fill(NaN) };
    際の鍵 = 鍵;
  }
  const M = 際の覚え;
  const cx = Math.max(0, Math.min(M.w - 1, Math.round(x / 際の升))), cy = Math.max(0, Math.min(M.h - 1, Math.round(y / 際の升)));
  const j = cy * M.w + cx;
  let 際 = M.値[j];
  if (Number.isNaN(際)) {
    const [vx, vy] = 視(cx * 際の升, cy * 際の升);
    const 先 = Math.min(900, ((図.最 - 図.低) * 斜め.持ち上げ) / k + 12);
    際 = Infinity;
    for (let d = 際の升 * 0.75 + 2; d <= 先; d += Math.max(2, d * 0.05)) {
      const [wx, wy] = 視から盤(vx, vy + d);
      const yy = (vy + d) * k - 画の浮き(wx, wy);
      if (yy < 際) 際 = yy;
    }
    M.値[j] = 際;
  }
  /* 覚えた際は升の中ほどのもの。兵の所の縦の差だけは足し引きしない（際は手前の地の
     画の縦であって、兵の所には拠らない） */
  return 際;
}

/* 隠れの際に従って描く。盤の所（wx, wy）に立つものを、画の横 x・画の縦 y に描く fn を、
   丸ごと隠れるなら描かず、際に掛かるなら際で切って描く。丈 は立つものの高さ（歩）。
   筆は 視の筆へ と縦の縮みを戻した筆（画の横・画の縦で描く筆）であること。 */
export function 隠して描く(ctx, wx, wy, x, y, 丈, fn) {
  const 際 = 隠れの際(wx, wy);
  if (!(際 < y - 0.3)) { fn(); return; }
  const 濃 = 隠れの薄さ(y - 際, 丈);
  if (濃 <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 丈 * 2, 際 - 丈 * 4, 丈 * 4, 丈 * 4); ctx.clip();
  ctx.globalAlpha *= 濃;
  fn();
  ctx.restore();
}
/* 頂の向こうへ沈むほど薄く。際で切るだけでは、頂を越える兵の頭が稜線に貼りついた
   細い線に見えた。沈む深さが丈に近づくほど薄くして、すっと消えるようにする */
export const 隠れの薄さ = (深, 丈) => Math.max(0, Math.min(1, 1 - 深 / (丈 * 0.9)));

/* 見えている盤の縦の範囲を量るときの余り（歩）。丘の上の者は持ち上がって、
   盤の所より上（手前の下の端より内）に見える。 */
/* 余りは、いちばん高い所の持ち上げを縦の縮みで割ったもの（盤の縦の歩）。
   百六十歩で決め打ちにしていたころは、関ヶ原の山の上の隊が「画面の外」と量られ、
   画面の真ん中に映っているのに一人ずつ描く隊から漏れて、駒のまま残った
   （遊ぶ側がスマホで大谷吉継隊を見て気づいた）。 */
export const 揚げ代 = () => (図 && 斜め.入 ? (図.最 * 斜め.持ち上げ) / 縦の縮み() + 20 : 0);
