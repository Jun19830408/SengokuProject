/* ==========================================================================
   新しい合戦の絵（GDD 8.11）── まず関ヶ原だけで試す

   淡彩の野に、一駒＝五十人組をほどいて一人ずつの足軽を立てる描き手である。
   引き（倍率1.6未満）はこれまでの絵のまま。深く寄ったときだけ、組が五十人に
   ほどけ、八方向の型紙で立ち、いちばん寄れば（5.4超）型紙を貼らずその場で
   連続の位相で描く――槍は溜めて突き、弓は引き絞って放ち、鉄砲は跳ね上がる。

   肝は三つ。
   一、理には指一本触れない。ここにあるのは読みと描きだけで、組や隊への
       書き込みは一切ない。見た目の状態（兵の足・倒れた場所）は WeakMap に
       置くので、記録（セーブ）にも載らない。
   二、兵には「足」がある。組の持ち場が変わっても、一人ずつが歩幅の上限の
       なかで歩いて動く。瞬間移動は見た目から消える。
   三、見える分しか描かない。一隊三万でも、画面に映る組だけをほどくので、
       軍勢の大きさに費えは比例しない。

   まず関ヶ原（筋書き sekigahara）だけで使い、実機の重さと操作感を測ってから
   広げる。切りたいときは棚に sengoku:旧絵 を「入」で置けば元の絵に戻る。
   ========================================================================== */
import { FIELD, HILLS, MOUNTAINS, FORESTS, WOODS, MARSH, VILLAGES, RIVERS, ROADS, ROAD,
  RIVER, hasRiver } from "./field.js";

/* どの盤でも新しい絵で描く。棚の sengoku:旧絵 が「入」なら使わない（逃げ道）。

   はじめは関ヶ原だけに掛けて重さを測り、作りが固まってから野戦へ、
   そして城攻めへ広げた。城攻めの地は縄張りを読んで焼く（新絵の城の地）。 */
export function 新絵か(b) {
  if (!b) return false;
  try { if (typeof localStorage !== "undefined" && localStorage.getItem("sengoku:旧絵") === "入") return false; }
  catch { /* 棚が無い場でも絵は出す */ }
  return true;
}
export const 個人閾 = 1.6;        // これより寄れば一人ずつ
export const 滑閾 = 5.4;          // これより寄れば連続の位相で直接描く
export const 新絵の寄り限り = 7.2;

/* 一人ずつ描くか（GDD 8.11）。

   予算は「画面に映っている組」で数える。隊の中ほどで数えていたころは、
   旗本三万（六百組）が一つ映るだけで溢れ、槍を合わせた只中へ寄るほど
   駒へ戻るという逆さまなことになった。組ひとつずつ見れば、寄るほど
   数は減る――寄るほど絵が細かくなる。 */
export const 組の予算 = 400;                 // 画面に四百組＝二万人まで
export function 個人で描くか(b, cam, W, H) {
  if (!新絵か(b) || cam.s < 個人閾) return false;
  return 見える組数(b, cam, W, H) <= 組の予算;
}
export function 見える組数(b, cam, W, H) {
  const vx0 = cam.x - W / 2 / cam.s - 60, vx1 = cam.x + W / 2 / cam.s + 60;
  const vy0 = cam.y - H / 2 / cam.s - 80, vy1 = cam.y + H / 2 / cam.s + 60;
  let n = 0;
  for (const c of b.corps) {
    if (c.dead || c.destroyed) continue;
    for (const q of c.squads) {
      if (q.men <= 0) continue;
      if (q.x < vx0 || q.x > vx1 || q.y < vy0 || q.y > vy1) continue;
      if (++n > 組の予算) return n;
    }
  }
  return n;
}

/* ---- 筆の下ごしらえ ---- */
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16),
  r = (n >> 16) & 255, g = (n >> 8) & 255, b2 = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(r)},${f(g)},${f(b2)})`; };
const 肌 = "#C9A47E", 柄 = "#7A5A34", 布 = "#4A4034";
/* 具足の地色。鋼は脛当と籠手の金物、革は籠手と胴の下地 */
const 鋼 = "#3A3E45", 革 = "#2E2922";
const 馬毛ら = ["#5A4030", "#6B4A33", "#3E2E20"];
/* 具足の色（GDD 8.11）。

   はじめは中くらいの明るさの青赤にしていた。遊ぶ側から「青と赤で膨張して
   見えるのがよくないのか」との見立てをいただき、同じ形のまま色だけ三段に
   変えて比べたところ、そのとおりであった。明るく彩度の高い色は、小さく
   描くと膨らんで、面に付けた明暗を呑み込む。一人ひとりが「色の点」になり、
   具足に見えなくなる。

   そこで具足は漆の濃紺・暗赤まで落とし、家の色は帯（指物・陣笠の紐・胸紐）
   に回した。これは史実の着け方でもある――遠目には指物の群れが隊の色になり、
   寄れば具足の艶が見える。隊ごとの青赤の見分けは、実寸でも保たれている。 */
const 具側 = { P: { 濃: "#14203C", 中: "#1E3056", 帯: "#5FA0FF" },
               E: { 濃: "#3C120B", 中: "#5A1C12", 帯: "#FF6B4A" },
               Y: { 濃: "#3A2C08", 中: "#53410F", 帯: "#F2CE48" } };
let 種 = 11;
const R = () => { 種 = (種 * 1103515245 + 12345) & 0x7fffffff; return 種 / 0x7fffffff; };


const 線8=(g,x0,y0,x1,y1,w,色)=>{ g.strokeStyle=色; g.lineWidth=w; g.lineCap='round';
  g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke(); };
const 穂8=(g,x,y,a,s)=>{ const cs=Math.cos(a),sn=Math.sin(a);
  const 長=0.26*(s||6.2), 半=0.09*(s||6.2);     /* 穂先も縮尺に乗せる（固定だと直接描きで膨らむ） */
  g.fillStyle='#E8EAE6';
  g.beginPath(); g.moveTo(x+cs*長,y+sn*長);
  g.lineTo(x-sn*半,y+cs*半); g.lineTo(x+sn*半,y-cs*半);
  g.closePath(); g.fill(); };
const 腕8=(g,sx,sy,gx,gy,s,K)=>{ 線8(g,sx,sy,gx,gy,0.8*s,shade(K.濃,1.1));
  g.fillStyle=肌; g.beginPath(); g.arc(gx,gy,0.42*s,0,7); g.fill(); };
/* ---- 骨と具足（GDD 8.11）----------------------------------------------

   「兵の動きの見本（写実寄り）」と同じ作りにする。棒きれに笠を載せた形では
   なく、腰・膝・肩・肘を関節で動かし、その上に具足――草摺・胴・袖・佩楯・
   脛当・籠手・陣笠――を部位ごとに着せる。遊ぶ側の申し出は「やはり兵が人形
   みたいに見える。以前の見本ぐらいの人型に近いものにしたい」であった。

   逆運動（IK）：腰と足先を与えれば膝の位置が決まる。歩みも突きも、
   足先を動かすだけで膝が勝手に曲がるので、拍ごとに関節を書かずに済む。 */
const 逆運動 = (x0, y0, x1, y1, l1, l2, 側) => {
  const dx = x1 - x0, dy = y1 - y0;
  let d = Math.hypot(dx, dy);
  d = Math.min(d, (l1 + l2) * 0.999);
  d = Math.max(d, Math.abs(l1 - l2) * 1.001);
  const a = Math.atan2(dy, dx);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const A = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const ax = a + A * 側;
  return [x0 + Math.cos(ax) * l1, y0 + Math.sin(ax) * l1];
};
const 緩 = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : p * p * (3 - 2 * p));
/* 拍の譜。[時, 値] を並べ、あいだを緩めて繋ぐ */
const 譜 = (t, keys) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const p = 緩((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
      return keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * p;
    }
  }
  return keys[keys.length - 1][1];
};
/* 脚。腰から足先までを二節で繋ぎ、佩楯と脛当を着せる */
const 脚具 = (g, hx, hy, fx, fy, s, 近, K) => {
  const l = 2.65 * s;
  const [kx, ky] = 逆運動(hx, hy, fx, fy, l, l, -1);
  const 基 = 近 ? 布 : shade(布, 0.6);
  線8(g, hx, hy, kx, ky, 1.5 * s, 基);                                  // 腿
  線8(g, kx, ky, fx, fy, 1.15 * s, 基);                                 // 脛
  線8(g, hx + (kx - hx) * 0.15, hy + (ky - hy) * 0.15,
    hx + (kx - hx) * 0.72, hy + (ky - hy) * 0.72, 1.9 * s,
    近 ? shade(K.中, 0.9) : shade(K.中, 0.55));                          // 佩楯
  線8(g, kx + (fx - kx) * 0.2, ky + (fy - ky) * 0.2, fx, fy, 1.3 * s,
    近 ? 鋼 : shade(鋼, 0.6));                                           // 脛当
  g.fillStyle = 近 ? '#241E16' : shade('#241E16', 0.7);
  g.beginPath(); g.ellipse(fx + 0.5 * s, fy + 0.08 * s, 0.9 * s, 0.4 * s, 0, 0, 7); g.fill();
};
/* 腕。肩から手までを二節で繋ぎ、籠手と手を置く */
const 腕具 = (g, sx, sy, gx, gy, s, 近, 肘側, K) => {
  const l = 2.05 * s;
  const [ex, ey] = 逆運動(sx, sy, gx, gy, l, l, 肘側);
  線8(g, sx, sy, ex, ey, 1.25 * s, 近 ? shade(K.中, 1.25) : shade(K.中, 0.72));
  線8(g, ex, ey, gx, gy, 1.0 * s, 近 ? shade(革, 1.7) : shade(革, 1.1)); // 籠手
  g.fillStyle = 近 ? 肌 : shade(肌, 0.75);
  g.beginPath(); g.arc(gx, gy, 0.6 * s, 0, 7); g.fill();
};
/* 胴着。草摺（腰の板）・胴・威しの段・袖（肩の板） */
const 胴具 = (g, hx, hy, sx, sy, s, 前傾, K, 幅増) => {
  const a = Math.atan2(sy - hy, sx - hx);
  const nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2);
  for (let i = -2; i <= 1; i++) {                                       // 草摺
    g.save(); g.translate(hx + (i + 0.5) * 0.8 * s * 幅増, hy + 0.3 * s); g.rotate(前傾 * 0.4 + i * 0.09);
    g.fillStyle = i % 2 ? shade(K.中, 0.62) : shade(K.中, 0.85);
    g.fillRect(-0.62 * s, 0, 1.24 * s, 1.7 * s);
    g.strokeStyle = 'rgba(20,22,16,0.5)'; g.lineWidth = 0.5;
    g.strokeRect(-0.62 * s, 0, 1.24 * s, 1.7 * s);
    g.restore();
  }
  const w0 = 1.35 * s * 幅増, w1 = 1.6 * s * 幅増;                       // 胴
  g.beginPath();
  g.moveTo(hx + nx * w0, hy + ny * w0); g.lineTo(sx + nx * w1, sy + ny * w1);
  g.lineTo(sx - nx * w1, sy - ny * w1); g.lineTo(hx - nx * w0, hy - ny * w0);
  g.closePath();
  const g2 = g.createLinearGradient(hx - nx * w1, hy - ny * w1, hx + nx * w1, hy + ny * w1);
  g2.addColorStop(0, shade(K.濃, 0.72)); g2.addColorStop(0.45, K.濃); g2.addColorStop(1, shade(K.濃, 1.45));
  g.fillStyle = g2; g.fill();
  g.strokeStyle = 'rgba(16,14,10,0.7)'; g.lineWidth = 0.8; g.stroke();
  for (const k of [0.3, 0.52, 0.74]) {                                  // 威しの段
    const mx = hx + (sx - hx) * k, my = hy + (sy - hy) * k;
    線8(g, mx + nx * w0 * 0.82, my + ny * w0 * 0.82, mx - nx * w0 * 0.82, my - ny * w0 * 0.82,
      0.34 * s, shade(K.帯, 1.0));
  }
  for (const 側 of (幅増 > 1.2 ? [-1, 1] : [1])) {                      // 袖
    g.save(); g.translate(sx + 側 * (幅増 > 1.2 ? 1.25 * s : 0), sy + 0.3 * s);
    g.rotate(前傾 + 0.15 * 側);
    const g袖 = g.createLinearGradient(0, -0.6 * s, 0, 1.6 * s);
    g袖.addColorStop(0, shade(K.中, 1.2)); g袖.addColorStop(1, shade(K.中, 0.6));
    g.fillStyle = g袖;
    g.beginPath(); g.moveTo(-0.95 * s, -0.5 * s); g.lineTo(0.95 * s, -0.5 * s);
    g.lineTo(1.1 * s, 1.5 * s); g.lineTo(-1.1 * s, 1.5 * s); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(16,18,14,0.6)'; g.lineWidth = 0.5; g.stroke();
    g.strokeStyle = 'rgba(20,22,26,0.45)';
    for (const yy of [0.1, 0.7]) { g.beginPath(); g.moveTo(-1.0 * s, yy * s); g.lineTo(1.0 * s, yy * s); g.stroke(); }
    g.restore();
  }
};
/* 陣笠。伏せた円錐に家の色の帯 */
const 笠具 = (g, hx, hy, s, 俯, K) => {
  g.save(); g.translate(hx - 0.05 * s, hy); g.rotate(俯 * 0.4);
  const g2 = g.createLinearGradient(-1.6 * s, -1.2 * s, 1.3 * s, 0.3 * s);
  g2.addColorStop(0, '#6E6455'); g2.addColorStop(0.55, '#443C31'); g2.addColorStop(1, '#2B2620');
  g.beginPath();
  g.moveTo(-1.75 * s, 0.28 * s);
  g.quadraticCurveTo(-0.6 * s, -1.5 * s, 0.15 * s, -1.55 * s);
  g.quadraticCurveTo(0.9 * s, -1.5 * s, 1.75 * s, 0.28 * s);
  g.closePath(); g.fillStyle = g2; g.fill();
  g.strokeStyle = 'rgba(20,16,10,0.75)'; g.lineWidth = 0.6; g.stroke();
  g.beginPath(); g.ellipse(0, 0.3 * s, 1.85 * s, 0.5 * s, 0, 0, 7);
  g.fillStyle = '#38312A'; g.fill();
  g.strokeStyle = 'rgba(20,16,10,0.75)'; g.lineWidth = 0.5; g.stroke();
  g.strokeStyle = shade(K.中, 1.35); g.lineWidth = 0.34 * s;
  g.beginPath(); g.ellipse(0, -0.05 * s, 1.15 * s, 0.34 * s, 0, Math.PI * 1.02, Math.PI * 1.98); g.stroke();
  g.fillStyle = 'rgba(235,226,196,0.5)';
  g.beginPath(); g.ellipse(-0.55 * s, -0.75 * s, 0.55 * s, 0.2 * s, -0.35, 0, 7); g.fill();
  g.restore();
};
/* 頭。首・顔・目・顎紐・陣笠。横顔と正面・背面で輪郭を変える */
const 頭具 = (g, sx, sy, s, 俯, K, 面) => {
  const hx = sx + (面 === '横' ? 0.35 * s : 面 === '斜前' || 面 === '斜後' ? 0.2 * s : 0);
  const hy = sy - 1.75 * s + 俯 * s;
  g.strokeStyle = 面 === '後' || 面 === '斜後' ? shade(肌, 0.8) : 肌;
  g.lineWidth = 0.9 * s;
  g.beginPath(); g.moveTo(sx, sy - 0.2 * s); g.lineTo(hx - 0.1 * s, hy + 0.9 * s); g.stroke();
  if (面 === '後' || 面 === '斜後') {
    g.fillStyle = '#8A6E52';                                            // 首布
    g.beginPath(); g.arc(hx, hy + 0.45 * s, 0.95 * s, 0, 7); g.fill();
    g.fillStyle = shade(肌, 0.85);
    g.beginPath(); g.arc(hx, hy + 0.1 * s, 0.82 * s, 0, 7); g.fill();
  } else if (面 === '前') {
    g.fillStyle = 肌; g.beginPath(); g.arc(hx, hy + 0.15 * s, 0.86 * s, 0, 7); g.fill();
    g.fillStyle = '#2A2218';
    g.fillRect(hx - 0.42 * s, hy + 0.0 * s, 0.22 * s, 0.3 * s);
    g.fillRect(hx + 0.2 * s, hy + 0.0 * s, 0.22 * s, 0.3 * s);
  } else {
    g.fillStyle = 肌;                                                   // 横顔
    g.beginPath();
    g.moveTo(hx - 0.9 * s, hy - 0.7 * s);
    g.quadraticCurveTo(hx + 0.9 * s, hy - 0.9 * s, hx + 1.05 * s, hy + 0.1 * s);
    g.lineTo(hx + 0.85 * s, hy + 0.35 * s);
    g.quadraticCurveTo(hx + 0.5 * s, hy + 0.9 * s, hx - 0.3 * s, hy + 0.95 * s);
    g.quadraticCurveTo(hx - 1.0 * s, hy + 0.6 * s, hx - 0.9 * s, hy - 0.7 * s);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(60,44,30,0.5)'; g.lineWidth = 0.5; g.stroke();
    g.fillStyle = '#2A2218';
    g.beginPath(); g.ellipse(hx + 0.42 * s, hy - 0.18 * s, 0.14 * s, 0.2 * s, 0, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(90,52,36,0.6)'; g.lineWidth = 0.3 * s;          // 顎紐
  g.beginPath(); g.moveTo(hx - 0.7 * s, hy - 0.3 * s);
  g.quadraticCurveTo(hx, hy + 1.05 * s, hx + 0.75 * s, hy - 0.35 * s); g.stroke();
  笠具(g, hx, hy - 0.9 * s, s, 俯, K);
};
/* 槍。柄に影を敷いてから穂を付ける */
const 槍具 = (g, x0, y0, x1, y1, w) => {
  線8(g, x0, y0, x1, y1, w + 0.12 * w, 'rgba(30,24,16,0.7)');
  線8(g, x0, y0, x1, y1, w, 柄);
  穂8(g, x1, y1, Math.atan2(y1 - y0, x1 - x0), w * 13);
};

/* 向きは十六に割る（GDD 8.11）。八方向では、斜めへ進む隊がかくかくと向きを
   変えて見えた。右半分（東向き）の型を鏡で返して十六を作る。

   拍は 〇＝立ち、一・二＝歩み、三〜六＝働き（突き・引き放ち・放ち）。
   整数なら型紙の拍、小数なら連続の位相で、同じ譜の上を滑る。 */
function 姿八(g, x, y, s, dir, fr, 型, K, 乱) {
  const N = 16;
  const d16 = ((dir % N) + N) % N;
  const 反 = d16 > 4 && d16 < 12;                    // 西向きは鏡で返す
  const 右 = 反 ? (8 - d16 + 16) % 16 : d16;          // 0=東 … 4=南 12=北
  const a16 = 右 * Math.PI / 8;
  const 面 = 右 === 0 || 右 === 15 || 右 === 1 ? '横'
    : 右 <= 3 ? '斜前' : 右 <= 5 ? '前' : 右 <= 7 ? '斜前' : 右 <= 9 ? '前'
      : 右 <= 11 ? '斜後' : 右 <= 13 ? '後' : '斜後';
  const 横系 = 面 === '横' || 面 === '斜前' || 面 === '斜後';
  const j = 乱 || 0;
  /* 接地影。これが無いと兵は地面の上に浮いて見える */
  g.fillStyle = '#1C1E14';
  const 影a = g.globalAlpha; g.globalAlpha = 影a * 0.26;
  g.beginPath();
  g.ellipse(x, y + 0.18 * s, (型 === 'kiba' ? 1.9 : 1.2) * s, (型 === 'kiba' ? 0.62 : 0.44) * s, 0, 0, 7);
  g.fill(); g.globalAlpha = 影a;
  g.save(); g.translate(x, y); if (反) g.scale(-1, 1);
  if (型 === 'kiba') { 騎八(g, s, 面, fr, K, j); g.restore(); return; }
  /* 斜めは少しだけ細る。正面・背面は正面の形で別に描く */
  if (面 === '斜前' || 面 === '斜後') g.scale(0.9, 1);

  const 構 = fr >= 3;
  /* 働きの位相。整数の拍（三〜六）も、小数の位相も、同じ輪の上に乗せる */
  const T = 構 ? (((fr - 3) / 4) % 1 + 1) % 1 : 0;
  /* 歩みの位相。一で踏み出し、二で逆足 */
  const W = Number.isInteger(fr) ? (fr === 1 ? 0.25 : fr === 2 ? 0.75 : 0)
    : (((fr - 1) / 2) % 1 + 1) % 1;
  const 歩く = !構 && (Number.isInteger(fr) ? fr === 1 || fr === 2 : fr > 0.02);

  /* 拍ごとの値。見本（兵の動きの見本）の譜をそのまま使う */
  let 突 = 0, 沈 = 0, 引 = 0, 放 = 0, 備 = 0, 反動 = 0, 火 = false;
  if (構) {
    if (型 === 'yari') {
      突 = 譜(T, [[0, 0], [0.30, 0], [0.42, -0.18], [0.50, 1], [0.72, 1], [0.9, 0], [1, 0]]);
      沈 = 譜(T, [[0, 0], [0.42, 0.5], [0.5, 0.9], [0.72, 0.9], [0.9, 0], [1, 0]]);
    } else if (型 === 'yumi') {
      引 = 譜(T, [[0, 0], [0.18, 0], [0.52, 1], [0.70, 1], [0.74, 0], [0.9, 0], [1, 0]]);
      放 = T > 0.70 && T < 0.92 ? (T - 0.70) / 0.22 : 0;
    } else {
      備 = 譜(T, [[0, 0], [0.15, 1], [0.95, 1], [1, 0]]);
      反動 = 譜(T, [[0, 0], [0.42, 0], [0.5, 1], [0.68, 0], [1, 0]]);
      火 = T > 0.42 && T < 0.58;
    }
  }
  const 出 = Math.max(0, 突);
  /* 腰と肩。突けば沈んで前へ、鉄砲は膝を突いて低い */
  const 膝立 = 構 && 型 === 'teppo';
  const 揺 = 歩く ? Math.abs(Math.cos(W * 6.283)) * 0.45 * s : 0;
  const hx = (横系 ? 出 * 0.6 * s : 0) - (構 && 型 === 'teppo' ? 反動 * 0.2 * s : 0);
  const hy = (膝立 ? -3.6 * s : -5.05 * s + 沈 * 0.5 * s - 引 * 0.05 * s) - 揺;
  const 前傾 = !横系 ? 0.04
    : 膝立 ? 0.14 * 備 - 反動 * 0.06
      : 0.10 + 出 * 0.16 + (突 < 0 ? -0.06 : 0) + (歩く ? -0.03 : 0);
  const sx = hx + Math.sin(前傾) * 4.1 * s, sy = hy - Math.cos(前傾) * 4.1 * s;

  /* ---- 脚 ---- */
  const 脚を置く = (近) => {
    if (!横系) {
      /* 正面・背面。左右に開いて立ち、歩みでは前後に浮く */
      const 側 = 近 ? 1 : -1;
      const 振 = 歩く ? Math.sin(W * 6.283 + (近 ? 0 : Math.PI)) : 0;
      const fx = 側 * 0.85 * s;
      const fy = -Math.max(0, -振) * 0.9 * s;
      脚具(g, hx + 側 * 0.5 * s, hy, fx, fy, s, 近, K);
      return;
    }
    if (膝立 && !近) {                                   // 後ろ脚は膝を地に突く
      const kx = hx - 1.7 * s, ky = -0.55 * s;
      線8(g, hx - 0.2 * s, hy, kx, ky, 1.5 * s, shade(布, 0.6));
      線8(g, kx, ky, kx - 2.5 * s, ky + 0.2 * s, 1.15 * s, shade(布, 0.6));
      線8(g, hx - 0.34 * s, hy + (ky - hy) * 0.5, kx + 0.4 * s, ky - 0.4 * s, 1.8 * s, shade(K.中, 0.55));
      g.fillStyle = shade('#241E16', 0.7);
      g.beginPath(); g.ellipse(kx - 3.1 * s, ky + 0.3 * s, 0.9 * s, 0.4 * s, 0, 0, 7); g.fill();
      return;
    }
    const 振 = 歩く ? Math.sin(W * 6.283 + (近 ? 0 : Math.PI)) : 0;
    let fx, fy = 0;
    if (構 && 型 === 'yari') fx = 近 ? 2.5 * s + 出 * 2.1 * s : -2.5 * s + 出 * 0.3 * s;
    else if (膝立) fx = 2.7 * s;
    else if (構) fx = 近 ? 1.5 * s : -1.4 * s;
    else if (歩く) { fx = 振 * 2.0 * s; fy = -Math.max(0, -振) * 1.1 * s; }
    else fx = 近 ? 0.9 * s : -0.9 * s;
    脚具(g, hx + (近 ? 0.2 : -0.2) * s, hy, fx, fy, s, 近, K);
  };

  /* ---- 得物と腕 ---- */
  const 手 = { 奥: null, 前: null };          // [x,y,肘側]
  const 得物を描く = (層) => {
    if (型 === 'yari') {
      if (!横系) {
        const px = (面 === '後' || 面 === '斜後') ? -1.4 * s : 1.4 * s;
        if (構) {                                  /* こちらへ（向こうへ）突き出す。縮んで見える */
          const 伸 = 0.8 + 出 * 1.9;
          if (層 === '前') {
            槍具(g, px * 0.7, hy - 1.2 * s, px * (0.9 + 出 * 0.5), hy + 伸 * s, 0.42 * s);
            手.前 = [px * 0.8, hy - 0.9 * s, 1]; 手.奥 = [px * 0.55, hy - 2.0 * s, 1];
          }
        } else if (層 === '前') {
          槍具(g, px, -1.2 * s, px, -11.2 * s, 0.38 * s);
          手.前 = [px, hy - 1.0 * s, 1]; 手.奥 = [px * 0.8, sy + 0.6 * s, 1];
        }
        return;
      }
      if (構) {
        if (層 === '間') {
          const 柄a = -0.06 - 出 * 0.02, 長 = 9.2 * s, ex = 出 * 4.4 * s;
          const gx = hx + 1.4 * s + ex * 0.4, gy = hy - 1.5 * s;
          const 先x = gx + Math.cos(柄a) * (長 * 0.62 + ex), 先y = gy + Math.sin(柄a) * (長 * 0.62 + ex);
          const 尻x = gx - Math.cos(柄a) * (長 * 0.38 - ex * 0.25), 尻y = gy - Math.sin(柄a) * (長 * 0.38 - ex * 0.25);
          槍具(g, 尻x, 尻y, 先x, 先y, 0.45 * s);
          手.奥 = [尻x + (gx - 尻x) * 0.25, 尻y + (gy - 尻y) * 0.25, 1];
          手.前 = [gx + ex * 0.5, gy, 1];
          if (突 > 0.6) {                                   // 突きの風
            g.strokeStyle = `rgba(238,240,236,${((突 - 0.6) * 1.2).toFixed(2)})`;
            g.lineWidth = 0.14 * s;
            for (const dy of [-0.45, 0, 0.45]) {
              g.beginPath(); g.moveTo(先x - 2.4 * s, 先y + dy * s);
              g.lineTo(先x - 0.6 * s, 先y + dy * 0.4 * s); g.stroke();
            }
          }
        }
      } else if (歩く) {
        if (層 === '間') {                                  /* 行軍。肩へ担ぐ */
          const 柄a = -2.62, gx = sx + 0.9 * s, gy = sy + 0.1 * s;
          槍具(g, gx - Math.cos(柄a) * 3.0 * s, gy - Math.sin(柄a) * 3.0 * s,
            gx + Math.cos(柄a) * 7.6 * s, gy + Math.sin(柄a) * 7.6 * s, 0.4 * s);
          手.前 = [gx, gy, -1];
          手.奥 = [hx - 1.1 * s - Math.sin(W * 6.283) * 1.0 * s, hy - 0.4 * s, 1];
        }
      } else if (層 === '間') {                             /* 立ち。石突を地に突く */
        槍具(g, hx + 1.0 * s, -0.6 * s, hx + 1.35 * s, -10.9 * s, 0.4 * s);
        手.前 = [hx + 1.15 * s, hy - 1.4 * s, -1];
        手.奥 = [hx + 0.2 * s, hy - 0.3 * s, 1];
      }
      return;
    }
    if (型 === 'yumi') {
      if (!横系) {
        const px = (面 === '後' || 面 === '斜後') ? -1.5 * s : 1.5 * s;
        if (層 === '前') {
          g.strokeStyle = '#5E4426'; g.lineWidth = 0.45 * s;
          g.beginPath(); g.moveTo(px, -9.2 * s);
          g.quadraticCurveTo(px * 1.5, -5.4 * s, px, -1.8 * s); g.stroke();
          手.前 = [px * 0.95, sy + 0.4 * s, -1];
          手.奥 = [構 ? px * 0.2 : px * 0.5, sy + 0.5 * s, 1];
          if (面 === '後' || 面 === '斜後') {                 // 箙（矢筒）
            g.fillStyle = '#4A3A26'; g.fillRect(0.6 * s, -6.3 * s, 1.0 * s, 2.2 * s);
            g.strokeStyle = '#8A6E46'; g.lineWidth = 0.22 * s;
            for (const dx of [0.75, 1.05, 1.35]) {
              g.beginPath(); g.moveTo(dx * s, -6.3 * s); g.lineTo(dx * s + 0.25 * s, -8.2 * s); g.stroke();
            }
            g.fillStyle = '#E8EAE6';
            for (const dx of [0.75, 1.05, 1.35]) { g.beginPath(); g.arc(dx * s + 0.27 * s, -8.3 * s, 0.16 * s, 0, 7); g.fill(); }
          }
        }
        return;
      }
      const 弓x = sx + 3.5 * s, 弓y = sy - 0.2 * s, 上y = 弓y - 4.3 * s, 下y = 弓y + 4.3 * s;
      const 反り = 1.0 * s + 引 * 1.4 * s;
      const 弦x = 弓x - 引 * 3.3 * s + 放 * 0.5 * s;
      if (層 === '後') {
        g.strokeStyle = 'rgba(230,228,214,0.9)'; g.lineWidth = Math.max(0.35, 0.07 * s);
        g.beginPath(); g.moveTo(弓x - 反り * 0.25, 上y); g.lineTo(弦x, 弓y + 0.1 * s);
        g.lineTo(弓x - 反り * 0.25, 下y); g.stroke();
        if (引 > 0.12 && 放 === 0) {                          // 番えた矢
          線8(g, 弦x, 弓y + 0.1 * s, 弓x + 2.4 * s, 弓y - 0.1 * s, 0.3 * s, '#8A6E46');
          g.fillStyle = '#E8EAE6';
          g.beginPath(); g.moveTo(弓x + 3.1 * s, 弓y - 0.14 * s);
          g.lineTo(弓x + 2.3 * s, 弓y - 0.5 * s); g.lineTo(弓x + 2.3 * s, 弓y + 0.3 * s);
          g.closePath(); g.fill();
        }
        if (放 > 0) {                                         // 放たれた矢
          g.strokeStyle = `rgba(120,96,60,${(1 - 放).toFixed(2)})`; g.lineWidth = 0.3 * s;
          const fx = 弓x + 3 * s + 放 * 7 * s;
          g.beginPath(); g.moveTo(fx - 1.6 * s, 弓y - 0.2 * s); g.lineTo(fx, 弓y - 0.3 * s); g.stroke();
        }
        手.奥 = [弦x, 弓y + 0.1 * s, 1];
      }
      if (層 === '前') {
        g.strokeStyle = '#5E4426'; g.lineWidth = 0.5 * s;
        g.beginPath(); g.moveTo(弓x - 反り * 0.25, 上y);
        g.quadraticCurveTo(弓x + 反り, 弓y - 2.0 * s, 弓x + 反り * 0.5, 弓y);
        g.quadraticCurveTo(弓x + 反り, 弓y + 2.0 * s, 弓x - 反り * 0.25, 下y); g.stroke();
        g.strokeStyle = 'rgba(220,200,150,0.5)'; g.lineWidth = 0.18 * s;
        g.beginPath(); g.moveTo(弓x - 反り * 0.22, 上y + 1 * s);
        g.quadraticCurveTo(弓x + 反り * 0.9, 弓y - 1.9 * s, 弓x + 反り * 0.45, 弓y); g.stroke();
        手.前 = [弓x + 0.3 * s, 弓y, -1];
      }
      return;
    }
    /* 鉄砲 */
    if (!横系) {
      const px = (面 === '後' || 面 === '斜後') ? -1.2 * s : 1.2 * s;
      if (層 === '前') {
        線8(g, px * 0.5, -5.2 * s, px * 1.9, -9.0 * s, 0.5 * s, '#241E16');
        線8(g, px * 0.2, -4.4 * s, px * 0.9, -6.0 * s, 0.6 * s, '#6E5636');
        手.前 = [px * 0.8, sy + 0.5 * s, -1]; 手.奥 = [px * 0.35, sy + 0.6 * s, 1];
        if (火) {
          g.fillStyle = 'rgba(255,214,120,0.95)';
          g.beginPath(); g.arc(px * 1.9, -9.0 * s, 0.5 * s, 0, 7); g.fill();
        }
      }
      return;
    }
    if (!構) {                                   /* 構えぬ間は肩に担ぐ */
      if (層 === '前') {
        const gx = sx + 0.7 * s, gy = sy + 0.2 * s;
        線8(g, gx - 1.6 * s, gy + 2.2 * s, gx + 1.9 * s, gy - 3.6 * s, 0.45 * s, '#241E16');
        線8(g, gx - 1.5 * s, gy + 2.0 * s, gx - 0.2 * s, gy - 0.2 * s, 0.6 * s, '#6E5636');
        手.前 = [gx, gy + 0.3 * s, -1];
        手.奥 = [hx - 0.9 * s - (歩く ? Math.sin(W * 6.283) * 0.9 * s : 0), hy - 0.4 * s, 1];
      }
      return;
    }
    const 銃y = sy + 0.45 * s, 銃x0 = sx - 1.9 * s - 反動 * 1.6 * s, 銃x1 = sx + 5.6 * s - 反動 * 1.6 * s;
    if (層 === '前') {
      線8(g, 銃x0, 銃y + 0.5 * s, 銃x0 + 2.6 * s, 銃y + 0.06 * s, 0.85 * s, '#6E5636');   // 台尻
      線8(g, 銃x0 + 2.2 * s, 銃y + 0.02 * s, 銃x1 + 1.2 * s, 銃y - 0.04 * s, 0.42 * s, '#241E16'); // 銃身
      線8(g, 銃x0 + 2.2 * s, 銃y + 0.14 * s, 銃x1 - 1.1 * s, 銃y + 0.1 * s, 0.5 * s, '#8A6E46');  // 台木
      g.fillStyle = '#8A6E1E'; g.fillRect(sx + 0.4 * s, 銃y - 0.5 * s, 0.5 * s, 0.4 * s);        // 火挟
      手.前 = [sx + 3.0 * s, 銃y + 0.2 * s, -1];
      手.奥 = [sx + 0.6 * s, 銃y + 0.5 * s, 1];
      if (火) {                                                                           // 火花
        g.save(); g.translate(銃x1 + 1.4 * s, 銃y - 0.05 * s);
        g.fillStyle = 'rgba(255,214,120,0.95)';
        g.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * 6.283, r1 = (i % 2 ? 0.8 : 0.32) * s;
          g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r1, Math.sin(a) * r1 * 0.7);
        }
        g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,246,220,0.95)';
        g.beginPath(); g.arc(0, 0, 0.26 * s, 0, 7); g.fill();
        g.restore();
      }
    }
  };

  /* ---- 重ね順。奥の脚と腕 → 得物（奥）→ 胴 → 前の脚 → 得物（間）→ 前の腕 → 頭 ---- */
  const 幅増 = 横系 ? 1 : 1.35;
  得物を描く('後');
  脚を置く(false);
  if (手.奥) 腕具(g, sx - 0.25 * s, sy + 0.4 * s, 手.奥[0], 手.奥[1], s, false, 手.奥[2], K);
  胴具(g, hx, hy, sx, sy, s, 前傾, K, 幅増);
  脚を置く(true);
  得物を描く('間');
  得物を描く('前');
  if (手.前) 腕具(g, sx + 0.25 * s, sy + 0.35 * s, 手.前[0], 手.前[1], s, true, 手.前[2], K);
  頭具(g, sx, sy, s, (構 ? 0.12 : 0.03) + 出 * 0.12 + 備 * 0.1, K, 面);
  g.restore();
}

/* 騎馬（GDD 8.11）。

   見本（兵の動きの見本）の騎馬武者と同じ作りにする。馬の脚は骨で繋いで
   駆けの拍で振り、体・首・頭・鬣・尾を形で描く。乗り手は前傾して膝で挟み、
   槍を小脇に構える。元は胴長の塊に棒を立てただけで、馬に見えなかった。 */
function 騎八(g, s, 面, fr, K, j) {
  const 毛 = 馬毛ら[(j * 7 | 0) % 3];
  const 構 = fr >= 3;
  /* 駆けの位相。立ちは〇、歩み・駆けは輪を回す */
  const T = 構 ? (((fr - 3) / 4) % 1 + 1) % 1
    : Number.isInteger(fr) ? (fr === 1 ? 0.25 : fr === 2 ? 0.75 : 0)
      : (((fr - 1) / 2) % 1 + 1) % 1;
  const 動く = 構 || fr >= 1;
  const 弾 = 動く ? Math.sin(T * 6.283 * 2) * 0.22 * s : 0;
  const by = -4.6 * s + 弾;
  if (面 === '横' || 面 === '斜前' || 面 === '斜後') {
    if (面 !== '横') g.scale(0.92, 1);
    /* 尾 */
    g.strokeStyle = shade(毛, 0.5); g.lineCap = 'round';
    for (const k of [-0.25, 0, 0.25]) {
      g.lineWidth = 0.5 * s;
      g.beginPath(); g.moveTo(-4.6 * s, by - 0.6 * s);
      g.quadraticCurveTo(-6.4 * s, by - 0.2 * s + k * 2 * s + (動く ? Math.sin(T * 9 + k * 7) * 0.5 * s : 0),
        -7.3 * s, by + 1.2 * s + k * 3 * s);
      g.stroke();
    }
    /* 脚。腰（肩）と足先を骨で繋ぐ */
    const 脚馬 = (px, py, ph, 近, 前脚) => {
      const sw = 動く ? Math.sin(T * 6.283 + ph) : (前脚 ? 0.25 : -0.25);
      const lift = 動く ? Math.max(0, Math.sin(T * 6.283 + ph + Math.PI / 2)) : 0;
      const fx = px + sw * 2.2 * s, fy = -lift * 1.5 * s;
      const l = 前脚 ? 2.5 * s : 2.7 * s;
      const [kx, ky] = 逆運動(px, py, fx, fy, l, l, 前脚 ? -1 : 1);
      const 色 = 近 ? shade(毛, 0.95) : shade(毛, 0.55);
      線8(g, px, py, kx, ky, 1.0 * s, 色); 線8(g, kx, ky, fx, fy, 0.68 * s, 色);
      g.fillStyle = '#1E1812';
      g.beginPath(); g.ellipse(fx, fy + 0.1 * s, 0.48 * s, 0.34 * s, 0, 0, 7); g.fill();
    };
    脚馬(2.8 * s, by + 1.2 * s, 0, false, true);
    脚馬(-3.0 * s, by + 1.0 * s, Math.PI * 0.9, false, false);
    /* 馬体 */
    g.beginPath();
    g.moveTo(-4.7 * s, by - 0.4 * s);
    g.quadraticCurveTo(-4.2 * s, by - 2.2 * s, -1.6 * s, by - 2.0 * s);
    g.quadraticCurveTo(0.8 * s, by - 1.8 * s, 2.8 * s, by - 2.1 * s);
    g.quadraticCurveTo(4.6 * s, by - 1.7 * s, 4.7 * s, by - 0.2 * s);
    g.quadraticCurveTo(3.6 * s, by + 1.8 * s, -0.5 * s, by + 1.9 * s);
    g.quadraticCurveTo(-4.2 * s, by + 1.8 * s, -4.7 * s, by - 0.4 * s);
    g.closePath();
    const g2 = g.createLinearGradient(0, by - 2.4 * s, 0, by + 2 * s);
    g2.addColorStop(0, shade(毛, 1.35)); g2.addColorStop(0.55, 毛); g2.addColorStop(1, shade(毛, 0.55));
    g.fillStyle = g2; g.fill();
    g.strokeStyle = 'rgba(20,16,10,0.7)'; g.lineWidth = 0.6; g.stroke();
    /* 首と頭。駆けると前へ伸びる */
    const 伸 = 構 ? 0.5 : 0;
    g.beginPath();
    g.moveTo(2.6 * s, by - 1.9 * s);
    g.quadraticCurveTo((4.9 + 伸) * s, by - (3.3 - 伸 * 0.5) * s, (6.1 + 伸) * s, by - (3.6 - 伸 * 0.7) * s);
    g.lineTo((6.5 + 伸) * s, by - (2.7 - 伸 * 0.7) * s);
    g.quadraticCurveTo((5.2 + 伸) * s, by - 1.6 * s, 4.2 * s, by - 0.4 * s);
    g.closePath(); g.fillStyle = shade(毛, 1.05); g.fill();
    g.strokeStyle = 'rgba(20,16,10,0.7)'; g.lineWidth = 0.55; g.stroke();
    g.fillStyle = shade(毛, 0.85);
    g.beginPath(); g.ellipse((7.0 + 伸) * s, by - (3.05 - 伸 * 0.7) * s, 1.0 * s, 0.58 * s, 0.25, 0, 7); g.fill();
    g.strokeStyle = 'rgba(20,16,10,0.7)'; g.lineWidth = 0.45; g.stroke();
    g.strokeStyle = shade(毛, 0.4); g.lineWidth = 0.45 * s;                 // 鬣
    for (const k of [0, 0.4, 0.8]) {
      g.beginPath();
      g.moveTo((2.8 + k * 1.4 + 伸 * k) * s, by - (1.9 + k * 0.55) * s);
      g.quadraticCurveTo((2.4 + k * 1.4 + 伸 * k) * s, by - (0.9 + k * 0.5) * s,
        (2.0 + k * 1.4 + 伸 * k) * s, by - (0.4 + k * 0.4) * s);
      g.stroke();
    }
    g.fillStyle = '#1E1812';
    g.beginPath(); g.arc((6.5 + 伸) * s, by - (3.35 - 伸 * 0.7) * s, 0.18 * s, 0, 7); g.fill();
    /* 手綱と鞍 */
    g.strokeStyle = '#5A452E'; g.lineWidth = 0.26 * s;
    g.beginPath(); g.moveTo((6.2 + 伸) * s, by - (2.9 - 伸 * 0.7) * s);
    g.quadraticCurveTo(3.4 * s, by - 1.6 * s, 1.2 * s, by - 1.9 * s); g.stroke();
    g.fillStyle = '#3A2C1C';
    g.beginPath(); g.ellipse(-0.3 * s, by - 1.95 * s, 1.45 * s, 0.5 * s, 0, 0, 7); g.fill();
    /* 手前の脚 */
    脚馬(2.9 * s, by + 1.3 * s, Math.PI * 0.45, true, true);
    脚馬(-3.1 * s, by + 1.1 * s, Math.PI * 1.35, true, false);
    /* 乗り手。前傾して膝で挟む */
    const rhx = -0.3 * s, rhy = by - 2.5 * s;
    const 前傾 = 構 ? 0.42 : 0.2;
    const rs = s * 0.9;
    const rsx = rhx + Math.sin(前傾) * 3.6 * rs, rsy = rhy - Math.cos(前傾) * 3.6 * rs;
    線8(g, rhx, rhy, rhx + 1.4 * rs, rhy + 1.9 * rs, 1.1 * rs, 布);           // 曲げた脚
    線8(g, rhx + 1.4 * rs, rhy + 1.9 * rs, rhx + 1.2 * rs, rhy + 3.2 * rs, 0.85 * rs, 鋼);
    if (構) {                                                                 // 騎槍を小脇に
      const 柄a = -0.1;
      槍具(g, rsx - Math.cos(柄a) * 3.0 * rs, rsy + 0.6 * rs - Math.sin(柄a) * 3.0 * rs,
        rsx + Math.cos(柄a) * 9.0 * rs, rsy + 0.6 * rs + Math.sin(柄a) * 9.0 * rs, 0.42 * rs);
    } else {
      槍具(g, rsx + 0.6 * rs, rsy + 2.6 * rs, rsx + 1.1 * rs, rsy - 6.6 * rs, 0.38 * rs);
    }
    胴具(g, rhx, rhy, rsx, rsy, rs, 前傾, K, 1);
    腕具(g, rsx + 0.2 * rs, rsy + 0.3 * rs,
      構 ? rsx + 2.4 * rs : rsx + 1.0 * rs, rsy + (構 ? 0.7 : 1.4) * rs, rs, true, -1, K);
    頭具(g, rsx, rsy, rs, 0.12, K, 面 === '横' ? '横' : 面);
    return;
  }
  /* 正面・背面。馬は胸（尻）から見るので、体は狭く脚は四本縦に並ぶ */
  const 後向 = 面 === '後' || 面 === '斜後';
  for (const dx of [-1.0, 1.0]) {
    const sw = 動く ? Math.sin(T * 6.283 + (dx > 0 ? 0 : Math.PI)) * 0.35 * s : 0;
    線8(g, dx * s, by + 1.4 * s, dx * s + sw, -0.1 * s, 0.6 * s, shade(毛, 0.55));
  }
  g.beginPath(); g.ellipse(0, by, 1.85 * s, 1.6 * s, 0, 0, 7);
  const g3 = g.createLinearGradient(-1.5 * s, 0, 1.5 * s, 0);
  g3.addColorStop(0, shade(毛, 0.6)); g3.addColorStop(0.5, 毛); g3.addColorStop(1, shade(毛, 1.2));
  g.fillStyle = g3; g.fill();
  g.strokeStyle = 'rgba(18,14,8,0.7)'; g.lineWidth = 0.5; g.stroke();
  if (後向) {
    g.strokeStyle = shade(毛, 0.42); g.lineWidth = 0.5 * s;                   // 尾
    g.beginPath(); g.moveTo(0, by - 0.3 * s);
    g.quadraticCurveTo(0.3 * s, by + 1.5 * s, 0.1 * s, by + 2.9 * s); g.stroke();
  } else {
    g.fillStyle = shade(毛, 1.05);                                            // 顔
    g.beginPath(); g.ellipse(0, by - 1.1 * s, 0.7 * s, 1.5 * s, 0, 0, 7); g.fill();
    g.fillStyle = shade(毛, 0.7);
    g.beginPath(); g.ellipse(0, by + 0.1 * s, 0.48 * s, 0.5 * s, 0, 0, 7); g.fill();
    for (const e of [-1, 1]) {
      g.beginPath();
      g.moveTo(e * 0.55 * s, by - 2.0 * s); g.lineTo(e * 0.85 * s, by - 3.0 * s); g.lineTo(e * 0.2 * s, by - 2.2 * s);
      g.closePath(); g.fillStyle = shade(毛, 0.9); g.fill();
    }
    g.fillStyle = '#1E1812';
    for (const e of [-1, 1]) { g.beginPath(); g.arc(e * 0.38 * s, by - 1.3 * s, 0.15 * s, 0, 7); g.fill(); }
  }
  /* 乗り手 */
  const rs2 = s * 0.9;
  const rhy2 = by - 2.6 * s, rsy2 = rhy2 - 3.5 * rs2;
  if (構) {                                                                   // 突き出した槍（縮んで見える）
    const px = 後向 ? -1.1 * s : 1.1 * s;
    槍具(g, px * 0.7, rhy2 - 1.0 * rs2, px * 1.5, rhy2 + (後向 ? -2.6 : 2.2) * rs2, 0.4 * rs2);
  } else {
    槍具(g, (後向 ? -1.3 : 1.3) * s, rhy2 + 1.4 * rs2, (後向 ? -1.35 : 1.35) * s, rhy2 - 5.4 * rs2, 0.36 * rs2);
  }
  胴具(g, 0, rhy2, 0, rsy2, rs2, 0.05, K, 1.3);
  頭具(g, 0, rsy2, rs2, 0.08, K, 面);
}

/* 型紙。使う分だけその場で焼く（十六方向×七拍×四兵科×三側を先に焼くと重い） */
const 札帳={};
function 札取り(side,型,dir,fr){
  const key=side+型+dir+'_'+fr;
  let n=札帳[key];
  if(n===undefined){
    if(typeof document==='undefined'){ 札帳[key]=null; return null; }
    /* 画布の広さ（GDD 8.11）。

       六十四では、突き出した槍も、肩へ担いだ槍も端で切れていた――構えを
       描いていても、画布から出たぶんは消える。拍と得物で要るだけ広げる。
       縦は変えない（貼る所は 幅/2・高-8 で測るので、広げても足元は動かない）。 */
    const 構=fr>=3;
    const 幅=型==='kiba'?(構?164:112)
      :型==='yari'?(構?152:(fr===1||fr===2?112:72))
      :構?104:72;
    const 高=型==='kiba'?120:110;
    n=document.createElement('canvas'); n.width=幅; n.height=高;
    姿八(n.getContext('2d'),幅/2,高-10,型==='kiba'?6.2:6.0,dir,fr,型,具側[side],(dir*3+fr)*0.37%1);
    札帳[key]=n;
  }
  return n;
}
function 倒れ札(side){
  const key=side+'fallen';
  let n=札帳[key];
  if(n===undefined){
    if(typeof document==='undefined'){ 札帳[key]=null; return null; }
    n=document.createElement('canvas'); n.width=64; n.height=64;
    const g=n.getContext('2d'); const K=具側[side];
    g.translate(32,36);
    g.fillStyle='rgba(24,26,18,0.3)'; g.beginPath(); g.ellipse(0,2,16,6,0,0,7); g.fill();
    g.rotate(0.5);
    g.fillStyle=shade(K.濃,0.75); g.fillRect(-9,-4,18,8);
    g.strokeStyle=shade(布,0.7); g.lineWidth=4; g.lineCap='round';
    g.beginPath(); g.moveTo(8,2); g.lineTo(15,7); g.moveTo(6,4); g.lineTo(10,11); g.stroke();
    g.fillStyle=shade(肌,0.9); g.beginPath(); g.arc(-12,-2,4,0,7); g.fill();
    g.rotate(-0.5);
    g.strokeStyle='#7A5A34'; g.lineWidth=2;
    g.beginPath(); g.moveTo(-14,10); g.lineTo(16,-6); g.stroke();
    札帳[key]=n;
  }
  return n;
}
function 札を焼く(){ /* 先焼きはしない。使う分だけ 札取り が焼く */ }
/* 型紙を外から取る窓口。姿と拍を並べて目で検めるための道具である
   （scratchpad の 姿見 がこれを使う）。盤には触れない。 */
export const 姿の札 = (側, 型, dir, fr) => 札取り(側, 型, dir, fr);

/* 将と旗持の型紙。毎コマ筆で描くと、小さく潰れたうえに費えも嵩む。
   兵と同じように一度だけ焼いて、あとは貼る。 */
function 将札(side, 格) {
  const key = side + "将" + 格;
  let n = 札帳[key];
  if (n === undefined) {
    if (typeof document === "undefined") { 札帳[key] = null; return null; }
    n = document.createElement("canvas"); n.width = 150; n.height = 190;
    武将図(n.getContext("2d"), 75, 178, 11, 具側[side], 2, 0);
    札帳[key] = n;
  }
  return n;
}
function 旗持札(side, 形) {
  const key = side + "旗" + 形;
  let n = 札帳[key];
  if (n === undefined) {
    if (typeof document === "undefined") { 札帳[key] = null; return null; }
    /* 馬印は遠くから見えてこそのもの。竿も標も大きく取る */
    n = document.createElement("canvas"); n.width = 260; n.height = 420;
    旗持図(n.getContext("2d"), 130, 404, 19, 具側[side], 形, 0);
    札帳[key] = n;
  }
  return n;
}
const 札貼=(g,key,x,y,倍,alpha)=>{ const n=札帳[key]; if(!n) return;
  if(alpha!=null) g.globalAlpha=alpha;
  g.drawImage(n, x-n.width/2*倍, y-(n.height-8)*倍, n.width*倍, n.height*倍);
  if(alpha!=null) g.globalAlpha=1; };



/* ---- 淡彩の野を焼く。drawFieldTerrain の代わり（世界座標で描く契約は同じ） ---- */
function 揺点(pts, step, 幅) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const x0 = pts[i].x, y0 = pts[i].y, x1 = pts[i + 1].x, y1 = pts[i + 1].y;
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, n = Math.max(2, (L / step) | 0);
    const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    for (let k = 0; k < n; k++) { const t = k / n, off = (R() - 0.5) * 幅;
      out.push([x0 + (x1 - x0) * t + nx * off, y0 + (y1 - y0) * t + ny * off]); } }
  const L2 = pts[pts.length - 1]; out.push([L2.x, L2.y]);
  return out;
}
function 線引(g, pts, lw, st) { g.strokeStyle = st; g.lineWidth = lw;
  g.lineJoin = "round"; g.lineCap = "round";
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
const 名札 = (g, x, y, s) => {
  g.save(); g.font = '600 13px "Hiragino Mincho ProN","Yu Mincho",serif'; g.textAlign = "center";
  g.lineWidth = 3.5; g.strokeStyle = "rgba(238,232,214,0.85)"; g.strokeText(s, x, y);
  g.fillStyle = "rgba(56,50,36,0.95)"; g.fillText(s, x, y); g.restore(); };

/* ===== 野を、画素ごとに塗る（GDD 8.11）=====

   面（楕円や矩形）を重ねる描き方では、どこまで行っても図形の匂いが抜けない。
   地面は「高さの場」から色を決める。高い所と低い所、急な所と緩い所、乾いた
   所と湿った所で色が変わる――それが本物の地面の見え方である。

   立体に見えるのは、次の四つが揃うからである。
     一、日影    …… 高い所が低い所に影を落とす（光線を地形に当てて調べる）
     二、環境遮蔽…… 窪みは空が狭いので暗い
     三、水の底  …… 浅い所は底が透け、深い所は空を映す
     四、林の梢  …… 林は塊として高さを持ち、自ら影を落とす

   費えは焼く時の一度きりで、遊ぶ間は一切変わらない。
   ただし二千万画素を画素ごとに回すのは重すぎるので、新しい野は三百万画素で
   焼く。細かさは近景の肌理（寄ったときに画面の縮尺で重ねる）が持つ。
   影と遮蔽は、さらに半分の寸法で焼いて引き伸ばす――どちらも滑らかな量なので
   見た目は変わらず、速さは四倍になる。 */
/* 画布の上限。三百二十万画素では、いちばん広い野（三万の兵）で焼きに
   二.四秒かかった（算だけで。携帯ではその二〜四倍）。二百二十万へ抑える。
   寄ったときの細かさは近景の肌理が持つので、引きでも寄りでも差は出ない。 */
export const 新絵の画布上限 = 2.2e6;
/* 城攻めの画布は別に取る。

   城には石垣・門・櫓・天守という「作ったもの」が立つ。草や土と違い、
   これが寝ぼけると城が壊れて見える。そこで地だけ二百二十万画素で焼いて
   引き伸ばし、立つものはこの寸法の画布へ直に描く。
   九百万画素で三十六MB――元の城の画布（二千万画素・七十六MB）の半分である。 */
export const 城の画布上限 = 9.0e6;

/* 焼きの内訳（GDD 8.11）。どこで時を食っているかは、推し量らずに測る。
   頁からは window.__焼き内訳 で読める。費えは performance.now() の十数回だけ。 */
const 内訳 = [];
let 内訳刻 = 0;
const 刻む計 = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const 計始 = () => { 内訳.length = 0; 内訳刻 = 刻む計(); };
const 計 = (名) => { const t = 刻む計(); 内訳.push(名 + " " + Math.round(t - 内訳刻) + "ms"); 内訳刻 = t;
  if (typeof window !== "undefined") window.__焼き内訳 = 内訳.join(" / "); };
export const 焼きの内訳 = () => 内訳.join(" / ");

/* 値の雑音。盤の賽（Math.random）は使わない――同じ種から同じ盤が出なくなる */
const 雑格寸 = 256;
const 雑格 = new Float32Array(雑格寸 * 雑格寸);
(() => { let v = 1013904223;
  for (let i = 0; i < 雑格.length; i++) {
    v = (Math.imul(v, 1664525) + 1013904223) | 0;
    雑格[i] = ((v >>> 8) & 0xffff) / 65535; } })();
const 滑曲 = (t) => t * t * (3 - 2 * t);
function 粒音(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = 滑曲(x - xi), yf = 滑曲(y - yi);
  const i0 = (xi & 255), i1 = ((xi + 1) & 255);
  const j0 = (yi & 255) * 雑格寸, j1 = (((yi + 1) & 255)) * 雑格寸;
  const a = 雑格[j0 + i0], b = 雑格[j0 + i1], c = 雑格[j1 + i0], d = 雑格[j1 + i1];
  const t = a + (b - a) * xf;
  return t + ((c + (d - c) * xf) - t) * yf;
}
function 襞(x, y, 段 = 3) {
  let s = 0, a = 1, f = 1, w = 0;
  for (let i = 0; i < 段; i++) { s += 粒音(x * f, y * f) * a; w += a; a *= 0.5; f *= 2.03; }
  return s / w;
}
let 野種 = 20250915;
const 野乱 = () => { 野種 = (野種 * 1103515245 + 12345) & 0x7fffffff; return 野種 / 0x7fffffff; };
const 野種を置く = (n) => { 野種 = n; };
const 挟 = (v, a, b) => (v < a ? a : v > b ? b : v);
const 混色 = (c1, c2, t) => [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t,
  c1[2] + (c2[2] - c1[2]) * t];

/* 折れ線までの隔たり */
function 筋まで(x, y, 節) {
  let 最 = 1e9;
  for (let i = 0; i < 節.length - 1; i++) {
    const x0 = 節[i][0], y0 = 節[i][1], x1 = 節[i + 1][0], y1 = 節[i + 1][1];
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
    let t = ((x - x0) * dx + (y - y0) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t));
    if (d < 最) 最 = d;
  }
  return 最;
}

/* 焼きを帯に割る（GDD 8.11）。

   地を焼くのに一秒以上かかる。一息で焼けば、そのあいだ頁は固まる――
   城攻めでは門の様子が変わるたびに焼き直していたので、攻めている間じゅう
   止まっていた。焼き手を生成子（止められる関数）にして、描き直しの輪から
   一コマ十ミリ秒ずつ汲む。帯の数は、一帯がおよそ二〜四ミリ秒になるよう選ぶ。 */
const 帯幅 = (n, 割) => Math.max(1, Math.ceil(n / 割));

/* 日影。光の来る向きへ地形を辿り、遮られていれば影。縁は半影でぼかす */
function* 日影を焼く(高, W, H, 光x, 光y, 光高, 歩, 回) {
  const 影 = new Float32Array(W * H);
  const 帯 = 帯幅(H, 90);
  for (let y = 0; y < H; y++) {
    if (y % 帯 === 0) yield;
    for (let x = 0; x < W; x++) {
      const i = y * W + x, h0 = 高[i];
      let 遮 = 0;
      for (let k = 1; k <= 回; k++) {
        const sx = Math.round(x - 光x * 歩 * k), sy = Math.round(y - 光y * 歩 * k);
        if (sx < 0 || sy < 0 || sx >= W || sy >= H) break;
        const hs = 高[sy * W + sx];
        const 要 = h0 + 光高 * 歩 * k;
        if (hs > 要) { 遮 = Math.max(遮, Math.min(1, (hs - 要) * 0.3)); if (遮 > 0.95) break; }
      }
      影[i] = 遮;
    }
  }
  const 出 = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
   if (y % 帯 === 0) yield;
   for (let x = 0; x < W; x++) {
    let s = 0, n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      s += 影[yy * W + xx]; n++;
    }
    出[y * W + x] = s / n;
   }
  }
  return 出;
}
/* 環境遮蔽。周り八方が高いほど暗い */
function* 遮蔽を焼く(高, W, H, 距) {
  const 遮 = new Float32Array(W * H);
  const 向 = [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]];
  const 帯 = 帯幅(H, 90);
  for (let y = 0; y < H; y++) { if (y % 帯 === 0) yield; for (let x = 0; x < W; x++) {
    const i = y * W + x, h0 = 高[i];
    let s = 0;
    for (let v = 0; v < 向.length; v++) {
      const dx = 向[v][0], dy = 向[v][1];
      let 最 = 0;
      for (let k = 2; k <= 距; k += 2) {
        const sx = Math.round(x + dx * k), sy = Math.round(y + dy * k);
        if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
        const t = (高[sy * W + sx] - h0) / k;
        if (t > 最) 最 = t;
      }
      s += Math.min(1, Math.max(0, 最));
    }
    遮[i] = s / 向.length;
  } }
  return 遮;
}
/* 半分の寸法で焼いた場を、双一次で引き伸ばして読む */
const 引伸 = (場, hw, hh, x, y, 半) => {
  const u = x / 半, v = y / 半;
  const x0 = Math.min(hw - 1, Math.max(0, Math.floor(u))), y0 = Math.min(hh - 1, Math.max(0, Math.floor(v)));
  const x1 = Math.min(hw - 1, x0 + 1), y1 = Math.min(hh - 1, y0 + 1);
  const fx = u - x0, fy = v - y0;
  const a = 場[y0 * hw + x0], b = 場[y0 * hw + x1], c = 場[y1 * hw + x0], d = 場[y1 * hw + x1];
  const t = a + (b - a) * fx;
  return t + ((c + (d - c) * fx) - t) * fy;
};

/* ---- 寄棟の瓦屋根。棟を一本通し、四方へ流れが落ちる ---- */
function 瓦屋根(q, cx, cy, w, d, 向, 明, 倍) {
  q.save(); q.translate(cx, cy); q.rotate(向);
  const hw = w / 2, hd = d / 2, 棟 = hw * 0.42, 出 = d * 0.26;
  const 基 = [128, 142, 146];
  const c = (k) => `rgb(${(基[0] * k * 明) | 0},${(基[1] * k * 明) | 0},${(基[2] * k * 明) | 0})`;
  const 面 = (p, k1, k2) => {
    const gr = q.createLinearGradient(p[0][0], p[0][1], p[2] ? p[2][0] : p[1][0], p[2] ? p[2][1] : p[1][1]);
    gr.addColorStop(0, c(k1)); gr.addColorStop(1, c(k2));
    q.fillStyle = gr; q.beginPath(); q.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) q.lineTo(p[i][0], p[i][1]);
    q.closePath(); q.fill();
  };
  面([[-hw, -hd], [hw, -hd], [棟, -出], [-棟, -出]], 1.5, 1.1);
  面([[-hw, hd], [hw, hd], [棟, -出], [-棟, -出]], 0.82, 0.64);
  面([[-hw, -hd], [-hw, hd], [-棟, -出]], 1.22, 0.92);
  面([[hw, -hd], [hw, hd], [棟, -出]], 0.92, 0.74);
  q.strokeStyle = `rgba(214,222,226,${0.85 * 明})`; q.lineWidth = Math.max(1, 1.8 * 倍); q.lineCap = "round";
  q.beginPath(); q.moveTo(-棟, -出); q.lineTo(棟, -出); q.stroke();
  q.strokeStyle = `rgba(34,40,42,${0.6 * 明})`; q.lineWidth = Math.max(0.8, 1.2 * 倍);
  q.strokeRect(-hw, -hd, w, d);
  q.restore();
}
/* ---- 茅葺きの寄棟屋根 ---- */
function 茅屋根(q, cx, cy, w, d, 向, 明, 倍) {
  q.save(); q.translate(cx, cy); q.rotate(向);
  const hw = w / 2, hd = d / 2, 棟 = hw * 0.34, 出 = d * 0.3;
  const 茅 = [168, 142, 92];
  const c = (k) => `rgb(${(茅[0] * k * 明) | 0},${(茅[1] * k * 明) | 0},${(茅[2] * k * 明) | 0})`;
  const 面 = (p, k1, k2) => {
    const gr = q.createLinearGradient(p[0][0], p[0][1], p[2] ? p[2][0] : p[1][0], p[2] ? p[2][1] : p[1][1]);
    gr.addColorStop(0, c(k1)); gr.addColorStop(1, c(k2));
    q.fillStyle = gr; q.beginPath(); q.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) q.lineTo(p[i][0], p[i][1]);
    q.closePath(); q.fill();
  };
  面([[-hw, -hd], [hw, -hd], [棟, -出], [-棟, -出]], 1.42, 1.12);
  面([[-hw, hd], [hw, hd], [棟, -出], [-棟, -出]], 0.74, 0.54);
  面([[-hw, -hd], [-hw, hd], [-棟, -出]], 1.2, 0.94);
  面([[hw, -hd], [hw, hd], [棟, -出]], 0.88, 0.66);
  q.strokeStyle = `rgb(${(126 * 明) | 0},${(104 * 明) | 0},${(66 * 明) | 0})`;
  q.lineWidth = Math.max(1.4, 2.6 * 倍); q.lineCap = "round";
  q.beginPath(); q.moveTo(-棟, -出); q.lineTo(棟, -出); q.stroke();
  q.strokeStyle = `rgba(66,52,30,${0.5 * 明})`; q.lineWidth = Math.max(0.8, 1.2 * 倍);
  q.strokeRect(-hw, -hd, w, d);
  q.restore();
}
/* ---- 繁った木。型紙に焼いて貼る。

   房を六つ重ねるので、木ごとに勾配を六つ作ると一枚の野で数万回になる。
   丈と色味と日の当たりを刻んで型紙に焼き、あとは貼るだけにする。 ---- */
const 木帳 = {};
function 木札(r, 振, 日) {
  const 丈 = Math.max(3, Math.round(r));
  const i振 = 振 < 0.45 ? 0 : 1;
  const i日 = Math.max(0, Math.min(3, Math.round(日 * 3)));
  const key = 丈 + "_" + i振 + "_" + i日;
  let n = 木帳[key];
  if (n === undefined) {
    if (typeof document === "undefined") { 木帳[key] = null; return null; }
    const 幅 = Math.ceil(丈 * 4.2), 高2 = Math.ceil(丈 * 4.4);
    n = document.createElement("canvas"); n.width = 幅; n.height = 高2;
    繁木を描く(n.getContext("2d"), 幅 / 2, 高2 - 丈 * 0.9, 丈, i振 ? 0.6 : 0.2, i日 / 3);
    n.根x = 幅 / 2; n.根y = 高2 - 丈 * 0.9;
    木帳[key] = n;
  }
  return n;
}
function 繁木(q, x, y, r, 振, 日) {
  const n = 木札(r, 振, 日);
  if (!n) { 繁木を描く(q, x, y, r, 振, 日); return; }
  q.drawImage(n, x - n.根x, y - n.根y);
}
function 繁木を描く(q, x, y, r, 振, 日) {
  q.fillStyle = `rgba(46,62,30,${(0.34 * (0.5 + 日 * 0.5)).toFixed(2)})`;
  q.beginPath(); q.ellipse(x + r * 0.78, y + r * 0.2, r * 1.05, r * 0.34, 0.2, 0, 7); q.fill();
  q.strokeStyle = "#5E4B2E"; q.lineWidth = Math.max(0.6, r * 0.2); q.lineCap = "round";
  q.beginPath(); q.moveTo(x, y); q.lineTo(x - r * 0.06, y - r * 0.55); q.stroke();
  const 寒 = 振 < 0.45;
  const 明 = 寒 ? [120, 152, 70] : [150, 174, 72], 暗 = 寒 ? [40, 66, 32] : [52, 76, 30];
  const 房 = [[-0.5, -0.56, 0.52], [0.52, -0.52, 0.5], [-0.26, -0.9, 0.52],
    [0.3, -0.88, 0.5], [0, -1.16, 0.48], [0, -0.72, 0.56]];
  for (let k = 0; k < 房.length; k++) {
    const ax = x + 房[k][0] * r, ay = y + 房[k][1] * r, rr = r * 房[k][2];
    const gr = q.createRadialGradient(ax - rr * 0.45, ay - rr * 0.5, rr * 0.08, ax, ay, rr * 1.12);
    const m = 0.72 + 0.28 * 日 + (k >= 4 ? 0.12 : 0);
    gr.addColorStop(0, `rgb(${(明[0] * m) | 0},${(明[1] * m) | 0},${(明[2] * m) | 0})`);
    gr.addColorStop(0.55, `rgb(${((明[0] + 暗[0]) / 2 * m) | 0},${((明[1] + 暗[1]) / 2 * m) | 0},${((明[2] + 暗[2]) / 2 * m) | 0})`);
    gr.addColorStop(1, `rgb(${(暗[0] * m) | 0},${(暗[1] * m) | 0},${(暗[2] * m) | 0})`);
    q.fillStyle = gr; q.beginPath(); q.ellipse(ax, ay, rr, rr * 0.92, 0, 0, 7); q.fill();
  }
}
/* ---- 集落。道を一本通し、その両側に茅葺きの家と白壁の蔵を並べ、生垣で囲う ---- */
function 集落(q, cx, cy, r, 種, 明関, 倍) {
  野種を置く(種);
  const 向 = 野乱() * 6.283, ux = Math.cos(向), uy = Math.sin(向);
  const 長 = r * 1.5;
  q.lineCap = "round"; q.lineJoin = "round";
  q.strokeStyle = "rgba(176,152,124,0.5)"; q.lineWidth = Math.max(2, 5 * 倍);
  q.beginPath(); q.moveTo(cx - ux * 長, cy - uy * 長 * 0.72); q.lineTo(cx + ux * 長, cy + uy * 長 * 0.72); q.stroke();
  q.strokeStyle = "rgba(206,186,164,0.7)"; q.lineWidth = Math.max(1.4, 3 * 倍);
  q.beginPath(); q.moveTo(cx - ux * 長, cy - uy * 長 * 0.72); q.lineTo(cx + ux * 長, cy + uy * 長 * 0.72); q.stroke();
  const 垣 = [];
  for (let i = 0; i <= 26; i++) {
    const a = (i / 26) * 6.283, rr = r * (0.95 + Math.sin(a * 3 + 種) * 0.1);
    垣.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.76]);
  }
  const 垣引 = (ox, oy, 幅, 色) => {
    q.strokeStyle = 色; q.lineWidth = 幅;
    q.beginPath(); q.moveTo(垣[0][0] + ox, 垣[0][1] + oy);
    for (let i = 1; i < 垣.length; i++) q.lineTo(垣[i][0] + ox, 垣[i][1] + oy);
    q.stroke();
  };
  垣引(2 * 倍, 3 * 倍, Math.max(2.4, 5 * 倍), "rgba(46,70,32,0.34)");
  垣引(0, 0, Math.max(2, 4 * 倍), "#5A7A36");
  垣引(-0.8 * 倍, -1.4 * 倍, Math.max(0.8, 1.4 * 倍), "rgba(150,180,96,0.6)");
  const 家ら = [];
  const n = Math.max(9, Math.round(r / (3.6 * 倍)));
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1) - 0.5) * 1.7, 側 = (i % 2) ? 1 : -1;
    const 寄 = (0.18 + 野乱() * 0.5) * r * 側;
    const x = cx + ux * 長 * t - uy * 寄 * 0.8 + (野乱() - 0.5) * 6 * 倍;
    const y = cy + uy * 長 * t * 0.72 + ux * 寄 * 0.6 + (野乱() - 0.5) * 5 * 倍;
    if (Math.hypot((x - cx) / r, (y - cy) / (r * 0.76)) > 0.94) continue;
    家ら.push([x, y, 野乱() < 0.22 ? "蔵" : "家", 野乱()]);
  }
  家ら.sort((a, b) => a[1] - b[1]);
  for (const [x, y, 種類, rr] of 家ら) {
    const m = 明関(x, y);
    const w2 = (種類 === "蔵" ? 10 + rr * 4 : 14 + rr * 8) * 倍;
    const d2 = (種類 === "蔵" ? 8 + rr * 3 : 11 + rr * 4) * 倍;
    q.fillStyle = `rgba(40,56,26,${0.42 * (0.5 + m * 0.5)})`;
    q.beginPath(); q.ellipse(x + w2 * 0.34, y + d2 * 0.3, w2 * 0.72, d2 * 0.46, 0.2, 0, 7); q.fill();
    q.save(); q.translate(x, y); q.rotate(向);
    if (種類 === "蔵") {
      q.fillStyle = `rgb(${(236 * m) | 0},${(230 * m) | 0},${(216 * m) | 0})`;
      q.fillRect(-w2 * 0.46, -d2 * 0.34, w2 * 0.92, d2 * 0.8);
    } else {
      q.fillStyle = `rgb(${(176 * m) | 0},${(160 * m) | 0},${(132 * m) | 0})`;
      q.fillRect(-w2 * 0.44, -d2 * 0.3, w2 * 0.88, d2 * 0.74);
    }
    q.restore();
    if (種類 === "蔵") 瓦屋根(q, x, y, w2 * 1.06, d2, 向, m, 倍);
    else 茅屋根(q, x, y, w2, d2, 向, m, 倍);
  }
  for (let i = 0; i < Math.max(6, (r / (6 * 倍)) | 0); i++) {
    const a = 野乱() * 6.283, dd = r * (0.5 + 野乱() * 0.42);
    const x = cx + Math.cos(a) * dd, y = cy + Math.sin(a) * dd * 0.76;
    繁木(q, x, y, (4 + 野乱() * 3) * 倍, 野乱(), 明関(x, y));
  }
}

/* ============ 野を焼く ============
   g は画布の筆。画k ＝ 野の寸法から画布の画素への倍。 */
export function 新絵の野(g, 画k) { const it = 野を焼く(g, 画k); while (!it.next().done) { /* 一息で焼く */ } }
/* 帯で止められる焼き手。頁はこちらを汲み、試験や道具は上の一息版を使う。 */
export function* 野を焼く(g, 画k) {
  計始();
  const k = 画k || 1;
  const W = Math.max(1, Math.round(FIELD.w * k)), H = Math.max(1, Math.round(FIELD.h * k));
  const 倍 = Math.max(0.5, Math.min(2, k * 3.2));      /* 筆の太さの目安 */
  const PX = (x) => x * k, PY = (y) => y * k;
  g.setTransform(1, 0, 0, 1, 0, 0);

  /* 峰。盤の持つ高さ（m）を、画素の尺度へ直す（丘の丈＝半径の三割四分） */
  const 峰 = [];
  for (const o of HILLS) 峰.push({ x: PX(o.x), y: PY(o.y), r: PX(o.r), h: 山高m(o) / 200, 山: false });
  for (const o of MOUNTAINS) 峰.push({ x: PX(o.x), y: PY(o.y), r: PX(o.r), h: 山高m(o) / 200, 山: true });
  const 川ら = (RIVERS && RIVERS.length ? RIVERS : (hasRiver() ? [{
    幅: Math.max(20, RIVER.bot - RIVER.top),
    節: [[0, (RIVER.top + RIVER.bot) / 2], [FIELD.w, (RIVER.top + RIVER.bot) / 2]],
  }] : [])).map((r) => ({ 幅: PX(r.幅 || 50), 節: (r.節 || []).map((p) => [PX(p.x != null ? p.x : p[0]), PY(p.y != null ? p.y : p[1])]) }))
    .filter((r) => r.節.length > 1);
  const 道ら = (ROADS && ROADS.length ? ROADS : (ROAD ? [ROAD] : []))
    .map((r) => ({ 幅: PX(r.幅 || 30), 節: (r.節 || []).map((p) => [PX(p.x != null ? p.x : p[0]), PY(p.y != null ? p.y : p[1])]) }))
    .filter((r) => r.節.length > 1);

  /* ---- 高さの場。半分の寸法で持つ（影と遮蔽はここで焼く） ---- */
  const 半 = 2;
  const hw = Math.max(2, Math.ceil(W / 半)), hh = Math.max(2, Math.ceil(H / 半));
  const 高 = new Float32Array(hw * hh);
  const 川深 = new Float32Array(hw * hh), 川岸 = new Float32Array(hw * hh);
  const 道度 = new Float32Array(hw * hh), 川谷 = new Float32Array(hw * hh);
  /* 地のうねり */
  { const 帯 = 帯幅(hh, 48);
    for (let y = 0; y < hh; y++) {
      if (y % 帯 === 0) yield;
      for (let x = 0; x < hw; x++) {
        高[y * hw + x] = ((襞(x * 半 / (150 * 倍), y * 半 / (150 * 倍), 3) - 0.5) * 7 * 倍) / 半;
      }
    }
  }
  /* 峰。毎画素で全部の峰を測ると二十三倍の手間になる。峰のほうを辿って盛る */
  for (const o of 峰) {
    yield;
    const cx2 = o.x / 半, cy2 = o.y / 半, rr = o.r / 半;
    const ax0 = Math.max(0, Math.floor(cx2 - rr)), ax1 = Math.min(hw - 1, Math.ceil(cx2 + rr));
    const ay0 = Math.max(0, Math.floor(cy2 - rr)), ay1 = Math.min(hh - 1, Math.ceil(cy2 + rr));
    const 丈 = o.r * 0.34 * o.h / 半, 指 = o.山 ? 1.25 : 1.5;
    const 峰帯 = 帯幅(ay1 - ay0 + 1, 28);
    for (let y = ay0; y <= ay1; y++) { if ((y - ay0) % 峰帯 === 0) yield;
     for (let x = ax0; x <= ax1; x++) {
      const d = Math.hypot(x - cx2, y - cy2);
      if (d >= rr) continue;
      高[y * hw + x] += 丈 * Math.cos((d / rr) * Math.PI / 2) ** 指;
     }
    }
  }
  /* 川と道の場。線を辿って刻む（焼き付ける）。

     毎画素で全区間までの隔たりを測ると、一画素あたり百七十回の判じになり、
     それだけで三秒かかった（実測）。線のほうを辿って、その周りに円を
     重ねて行くほうが桁違いに速い。歩幅を細かく取れば隔たりも正しく出る。 */
  const 刻む = function* (節, 幅, 場, 伸, 深さ) {
    const r = 幅 / 2 + 伸;
    for (let i = 0; i < 節.length - 1; i++) {
      yield;
      const x0 = 節[i][0] / 半, y0 = 節[i][1] / 半, x1 = 節[i + 1][0] / 半, y1 = 節[i + 1][1] / 半;
      const L = Math.hypot(x1 - x0, y1 - y0);
      const 歩 = Math.max(1, Math.ceil(L));
      /* 区間の初めだけで止めていたころは、野を横切る一本の川が
         四百ミリ秒の一帯になっていた。歩みの途中でも止める。 */
      const 歩帯 = Math.max(1, Math.ceil(歩 / Math.max(1, Math.ceil((歩 * r * r) / 16000))));
      for (let k = 0; k <= 歩; k++) {
        if (k % 歩帯 === 0) yield;
        const t = k / 歩, cx2 = x0 + (x1 - x0) * t, cy2 = y0 + (y1 - y0) * t;
        const rr = r / 半;
        const ax0 = Math.max(0, Math.floor(cx2 - rr)), ax1 = Math.min(hw - 1, Math.ceil(cx2 + rr));
        const ay0 = Math.max(0, Math.floor(cy2 - rr)), ay1 = Math.min(hh - 1, Math.ceil(cy2 + rr));
        for (let y = ay0; y <= ay1; y++) for (let x = ax0; x <= ax1; x++) {
          const d = Math.hypot(x - cx2, y - cy2) * 半;
          if (d > 幅 / 2 + 伸) continue;
          const j = y * hw + x;
          const t2 = 深さ(d);
          if (t2 > 場[j]) 場[j] = t2;
        }
      }
    }
  };
  for (const r of 川ら) {
    const 半幅 = r.幅 / 2;
    yield* 刻む(r.節, r.幅, 川深, 0, (d) => (d < 半幅 ? 1 - d / 半幅 : 0));
    yield* 刻む(r.節, r.幅, 川岸, 3 * 倍, (d) => (d > 半幅 ? (半幅 + 3 * 倍 - d) / (3 * 倍) : 0));
    /* 谷を刻む。高さを下げるので、別の場へ取ってから引く */
    const 谷 = r.幅 * 2.4;
    yield* 刻む(r.節, 谷 * 2, 川谷, 0, (d) => (d < 谷 ? (1 - d / 谷) ** 2 * r.幅 * 0.5 : 0));
  }
  for (const r of 道ら) {
    const 半幅 = r.幅 / 2 + 2 * 倍;
    yield* 刻む(r.節, r.幅, 道度, 2 * 倍, (d) => Math.min(1, (半幅 - d) / (2.5 * 倍)));
  }
  for (let i = 0; i < 高.length; i++) if (川谷[i] > 0) 高[i] -= 川谷[i] / 半;
  /* 林。梢の塊として高さを持たせ、自ら影を落とさせる */
  const 林 = new Float32Array(hw * hh);
  for (const f of [...FORESTS, ...WOODS]) {
    yield;
    const fx = PX(f.x) / 半, fy = PY(f.y) / 半, r = PX(f.r) / 半 * 1.08;
    const x0 = Math.max(0, (fx - r) | 0), x1 = Math.min(hw - 1, Math.ceil(fx + r));
    const y0 = Math.max(0, (fy - r) | 0), y1 = Math.min(hh - 1, Math.ceil(fy + r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - fx, y - fy) / r;
      const ほつれ = (襞(x / (4.5 * 倍), y / (4.5 * 倍), 3) - 0.5) * 0.52;
      const t = 1 - (d + ほつれ);
      if (t > 0) 林[y * hw + x] = Math.max(林[y * hw + x], Math.min(1, t * 2.2));
    }
  }
  { const 林帯 = 帯幅(hh, 20) * hw;
    for (let i = 0; i < 林.length; i++) {
      if (i % 林帯 === 0) yield;
      if (林[i] < 0.01) continue;
      const x = i % hw, y = (i / hw) | 0;
      const 梢 = 襞(x / (1.7 * 倍), y / (1.7 * 倍), 2);
      高[i] += 林[i] * (3.5 * 倍 + 梢 * 2.5 * 倍);
    }
  }
  const 光x = -0.62, 光y = -0.72, 光高 = 0.52;
  計("高さ");
  yield;
  const 影 = yield* 日影を焼く(高, hw, hh, 光x, 光y, 光高, Math.max(1.4, 1.3 * 倍), 30);
  計("日影");
  const 遮 = yield* 遮蔽を焼く(高, hw, hh, Math.max(5, (7 * 倍) | 0));
  計("遮蔽");

  /* ---- 色を塗る ---- */
  const im = g.createImageData(W, H), d = im.data;
  const 色帯 = 帯幅(H, 360);
  for (let y = 0; y < H; y++) {
    if (y % 色帯 === 0) yield;
    for (let x = 0; x < W; x++) {
      const p = (y * W + x) * 4;
      const hh2 = 引伸(高, hw, hh, x, y, 半);
      const gx = 引伸(高, hw, hh, x + 半, y, 半) - 引伸(高, hw, hh, x - 半, y, 半);
      const gy = 引伸(高, hw, hh, x, y + 半, 半) - 引伸(高, hw, hh, x, y - 半, 半);
      const 傾 = Math.hypot(gx, gy) * 0.5 / 半;
      const 乾 = 挟(0.38 + hh2 / (24 * 倍) + (襞(x / (40 * 倍), y / (40 * 倍), 3) - 0.5) * 0.85, 0, 1);
      let c = 混色([104, 154, 60], [208, 206, 116], 乾);
      const n1 = 襞(x / (1.8 * 倍), y / (1.8 * 倍), 2) - 0.5, n2 = 襞(x / (6 * 倍), y / (6 * 倍), 2) - 0.5;
      c = [c[0] * (1 + n1 * 0.1 + n2 * 0.13), c[1] * (1 + n1 * 0.07 + n2 * 0.11), c[2] * (1 + n1 * 0.2 + n2 * 0.2)];
      /* 林の梢 */
      const fr = 引伸(林, hw, hh, x, y, 半);
      if (fr > 0.01) {
        const 葉 = 襞(x / (2.6 * 倍), y / (2.6 * 倍), 2);
        c = 混色(c, 混色([58, 92, 40], [104, 134, 54], 葉), Math.min(0.96, fr * 1.3));
      }
      /* 急な所は土 */
      const 露 = 挟((傾 - 0.72) * 1.1, 0, 1);
      if (露 > 0.01) c = 混色(c, 混色([186, 170, 130], [156, 140, 106], 襞(x / (3.6 * 倍), y / (3.6 * 倍), 2)), 露 * 0.62);
      /* 道 */
      const 道t = 引伸(道度, hw, hh, x, y, 半);
      if (道t > 0.01) {
        const t = 挟(道t + (襞(x / (2.6 * 倍), y / (2.6 * 倍), 2) - 0.5) * 0.5, 0, 1);
        c = 混色(c, [214, 182, 162], t * 0.92);
      }
      /* 川。岸の砂、浅い所は底が透け、深い所は空を映す */
      const 岸t = 引伸(川岸, hw, hh, x, y, 半);
      if (岸t > 0.01) c = 混色(c, [202, 194, 166], 岸t * 0.85);
      const 深 = 引伸(川深, hw, hh, x, y, 半);
      if (深 > 0.004) {
        const 底 = 混色([152, 142, 112], [100, 104, 86], 襞(x / (3 * 倍), y / (3 * 倍), 2));
        const 透 = Math.exp(-深 * 3.2);
        let 面 = 混色(混色([120, 154, 190], [62, 96, 148], 挟(深 * 1.1, 0, 1)), 底, 透 * 0.72);
        面 = 混色(面, [178, 200, 230], 0.26);
        const 波 = 襞(x / (2.6 * 倍), y / (1.2 * 倍), 2);
        if (波 > 0.68) 面 = 混色(面, [240, 248, 255], (波 - 0.68) * 2.2);
        c = 混色(c, 面, 挟(深 * 7, 0, 1));
      }
      /* 光。日影・環境遮蔽・面の向き */
      const nx = -gx * 0.5 / 半, ny = -gy * 0.5 / 半, nl = Math.hypot(nx, ny, 1);
      const 直 = 挟((nx * 光x + ny * 光y + 光高) / nl, 0, 1);
      const 日 = 1 - 引伸(影, hw, hh, x, y, 半) * 0.6;
      const 空 = 1 - 引伸(遮, hw, hh, x, y, 半) * 0.26;
      const 明 = 0.58 * 空 + 0.6 * 直 * 日;
      c = [c[0] * 明, c[1] * 明 * 1.01, c[2] * 明 * (1 + (1 - 日) * 0.22 + (1 - 空) * 0.1)];
      d[p] = 挟(c[0], 0, 255); d[p + 1] = 挟(c[1], 0, 255); d[p + 2] = 挟(c[2], 0, 255); d[p + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  計("色");

  const 明関 = (x, y) => 1 - 引伸(影, hw, hh, Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y)), 半) * 0.5;

  /* 草の穂。短く、多く、薄く */
  野種を置く(31337);
  g.lineCap = "butt";
  const 穂数 = Math.min(160000, Math.round(W * H * 0.035));
  const 穂帯 = 帯幅(穂数, 48);
  for (let i = 0; i < 穂数; i++) {
    if (i % 穂帯 === 0) yield;
    const x = 野乱() * W, y = 野乱() * H;
    const 日 = 明関(x, y);
    const t = 野乱(), a = (0.09 + 野乱() * 0.06) * 日;
    g.strokeStyle = t < 0.45 ? `rgba(82,114,46,${a.toFixed(3)})`
      : t < 0.82 ? `rgba(144,172,78,${a.toFixed(3)})` : `rgba(196,204,128,${a.toFixed(3)})`;
    g.lineWidth = Math.max(0.6, 0.8 * 倍);
    const ang = -1.5 + (野乱() - 0.5) * 0.9, L = (0.7 + 野乱() * 1.4) * 倍;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * L, y + Math.sin(ang) * L); g.stroke();
  }

  計("草");
  /* 沼 */
  for (const m of MARSH) {
    const mx = PX(m.x), my = PY(m.y), r = PX(m.r);
    const gr = g.createRadialGradient(mx, my, r * 0.2, mx, my, r);
    gr.addColorStop(0, "rgba(86,112,92,0.55)"); gr.addColorStop(1, "rgba(86,112,92,0)");
    g.fillStyle = gr; g.beginPath(); g.ellipse(mx, my, r, r * 0.8, 0, 0, 7); g.fill();
  }

  /* 集落 */
  for (const v of VILLAGES) 集落(g, PX(v.x), PY(v.y), PX(v.r || 40) * 0.95, Math.round(v.x + v.y), 明関, 倍);

  計("沼と集落");
  /* 木。林の只中は塊で描いたので、木は縁と野にだけ立てる */
  野種を置く(606);
  const 木 = [];
  const 試 = Math.min(200000, Math.round(W * H * 0.05));
  const 試帯 = 帯幅(試, 40);
  for (let i = 0; i < 試; i++) {
    if (i % 試帯 === 0) yield;
    const x = 野乱() * W, y = 野乱() * H;
    const fr = 引伸(林, hw, hh, x, y, 半);
    const 群 = 襞(x / (20 * 倍), y / (20 * 倍), 3);
    let 生 = false;
    if (fr > 0.5) 生 = false;
    else if (fr > 0.08) 生 = 野乱() < 0.1;
    else if (群 > 0.58) 生 = 野乱() < 0.05;
    else 生 = 野乱() < 0.008;
    if (!生) continue;
    if (引伸(川深, hw, hh, x, y, 半) > 0.004) continue;
    if (引伸(川岸, hw, hh, x, y, 半) > 0.1) continue;
    if (引伸(道度, hw, hh, x, y, 半) > 0.05) continue;
    木.push([x, y, (2.6 + 野乱() * 3.2) * 倍, 野乱(), 明関(x, y)]);
  }
  木.sort((a, b) => a[1] - b[1]);
  for (const [x, y, r, 振, 日] of 木) 繁木(g, x, y, r, 振, 日);
  計("木");

  /* 名のある峰と村の札。野の座標で描く */
  g.setTransform(k, 0, 0, k, 0, 0);
  for (const o of [...HILLS, ...MOUNTAINS]) if (o.札 && o.名) 名札(g, o.x, o.y - o.r * 0.36, o.名);
  for (const v of VILLAGES) if (v.札 && v.名) 名札(g, v.x, v.y + (v.r || 40) + 12, v.名);
  g.setTransform(1, 0, 0, 1, 0, 0);
}

/* ============ 城攻めの野を焼く（GDD 8.11・9.3） ============

   野戦の野と同じ筆で、城攻めの地を塗る。ただし地形は賽で起こすのではなく、
   盤の持つ縄張り（m.layers の曲輪、m.moat の堀、m.坂、門の位置）を読んで
   起こす。読む先は一つきりで、絵のためにもう一つ縄張りを作ったりはしない。
   曲輪の段は図のうえでも高さのうえでも同じ所に立つので、石垣の根に落ちる影が
   そのまま段差の影になる。

   立てるもの（石垣・門・櫓・天守）は、戦の間に破れたり燃えたりする。
   それは今までどおり drawCastleTerrain と drawBattle に描かせ、ここでは
   地だけを焼く。地は一度焼けば動かぬものである。                        */
export function 新絵の城の地(g, m, 画k) { const it = 城の地を焼く(g, m, 画k); while (!it.next().done) { /* 一息で焼く */ } }
/* 帯で止められる焼き手。頁はこちらを汲む（上の一息版は試験と道具のため）。 */
export function* 城の地を焼く(g, m, 画k) {
  const k = 画k || 1;
  const W = Math.max(1, Math.round(FIELD.w * k)), H = Math.max(1, Math.round(FIELD.h * k));
  const 倍 = Math.max(0.5, Math.min(2, k * 3.2));
  const PX = (v) => v * k;
  g.setTransform(1, 0, 0, 1, 0, 0);

  計始();
  const t = m.t, band = m.moat.band, 空堀 = !!m.moat.空堀;
  const o0 = m.layers[0], ob = o0.masu + t + 8;
  /* 曲輪。石垣の厚みぶん外へ出した矩形が、その曲輪の天端である */
  const 郭ら = m.layers.map((l, i) => ({
    i, x: PX(m.cx + (l.ox || 0)), y: PX(m.cy + (l.oy || 0)),
    hw: PX(l.hw + t), hh: PX(l.hh + t),
  }));
  const 堀外 = { x: PX(m.cx), y: PX(m.cy),
    hw: PX(o0.hw + t + ob + band), hh: PX(o0.hh + t + ob + band) };
  const 堀幅 = Math.max(2, PX(band));
  const 堀内 = { x: 堀外.x, y: 堀外.y, hw: 堀外.hw - 堀幅, hh: 堀外.hh - 堀幅 };

  const 半 = 2;
  const gw = Math.max(2, Math.ceil(W / 半)), gh = Math.max(2, Math.ceil(H / 半));
  const 高 = new Float32Array(gw * gh);
  const 郭 = new Float32Array(gw * gh);            // 曲輪の段数（内へ行くほど多い）
  /* 堀は「域」と「深さ」を分けて持つ。
     山城の空堀は二十二歩しかない。切岸の傾きだけで深さを決めると、
     狭い堀は端から端まで傾きになって、どこにも堀が無いことになる。
     域（どこが堀か）と深さ（どれだけ掘れているか）は別物である。 */
  const 堀域 = new Float32Array(gw * gh);
  const 堀深 = new Float32Array(gw * gh);
  const 岸 = new Float32Array(gw * gh);            // 堀の縁の土居。明るい砂が乗る
  const 道度 = new Float32Array(gw * gh);
  const 林 = new Float32Array(gw * gh);
  /* 矩形までの隔たり。内は負、外は正（半分の寸法で測る） */
  const 矩距 = (px, py, r) => {
    const dx = Math.abs(px - r.x / 半) - r.hw / 半, dy = Math.abs(py - r.y / 半) - r.hh / 半;
    return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  };
  const 枠 = (r, 伸) => ({
    x0: Math.max(0, Math.floor((r.x - r.hw) / 半 - 伸)), x1: Math.min(gw - 1, Math.ceil((r.x + r.hw) / 半 + 伸)),
    y0: Math.max(0, Math.floor((r.y - r.hh) / 半 - 伸)), y1: Math.min(gh - 1, Math.ceil((r.y + r.hh) / 半 + 伸)),
  });

  /* 地のうねりと、城の立つ峰。
     山城は尾根の上、平山城は小高い丘、平城は平らな地に建つ（m.坂 がそれを持つ）。
     峰の天は平らにしたいので、余弦の鈍った形で盛る。 */
  const 坂R = (Math.max(堀外.hw, 堀外.hh) + 堀幅) * (m.坂 >= 1 ? 1.55 : 1.85);
  const 坂丈 = (m.坂 >= 1 ? 0.26 : m.坂 > 0 ? 0.10 : 0) * 坂R;
  const ccx = 堀外.x / 半, ccy = 堀外.y / 半, 坂r2 = 坂R / 半;
  const 高帯 = 帯幅(gh, 48);
  for (let y = 0; y < gh; y++) {
    if (y % 高帯 === 0) yield;
    for (let x = 0; x < gw; x++) {
      let h = (襞(x * 半 / (150 * 倍), y * 半 / (150 * 倍), 3) - 0.5) * 9 * 倍
        + (襞(x * 半 / (430 * 倍) + 11, y * 半 / (430 * 倍) + 7, 2) - 0.5) * 22 * 倍;   // 大きなうねり
      if (坂丈 > 0) {
        /* 真円の丘は作り物に見える。尾根と谷で縁を崩す */
        const 崩 = 0.82 + 襞(x / (46 * 倍), y / (46 * 倍), 3) * 0.42;
        const d = Math.hypot(x - ccx, y - ccy) / (坂r2 * 崩);
        if (d < 1) h += 坂丈 * Math.cos(d * Math.PI / 2) ** 1.35;
      }
      高[y * gw + x] = h / 半;
    }
  }
  /* 曲輪の段。外から内へ、一段ずつ盛り上がる */
  const 段 = 5.5 * 倍;
  for (const r of 郭ら) {
    const b = 枠(r, 2);
    const 段帯 = 帯幅(b.y1 - b.y0 + 1, 28);
    for (let y = b.y0; y <= b.y1; y++) { if ((y - b.y0) % 段帯 === 0) yield;
     for (let x = b.x0; x <= b.x1; x++) {
      const d = 矩距(x, y, r);
      if (d >= 0) continue;
      const w = Math.min(1, -d / 1.4);
      const j = y * gw + x;
      郭[j] += w; 高[j] += (段 / 半) * w;
     }
    }
  }
  /* 堀。水堀でも空堀でも、掘り下げるのは同じ。切岸の傾きだけ違う */
  const 深 = (空堀 ? 12 : 10) * 倍;
  const 切 = Math.max(1.5, Math.min(堀幅 * 0.34, 7 * 倍));
  {
    const b = 枠(堀外, 4 * 倍 / 半 + 2);
    const 堀帯 = 帯幅(b.y1 - b.y0 + 1, 28);
    for (let y = b.y0; y <= b.y1; y++) { if ((y - b.y0) % 堀帯 === 0) yield;
     for (let x = b.x0; x <= b.x1; x++) {
      const d1 = -矩距(x, y, 堀外), d2 = 矩距(x, y, 堀内);
      const j = y * gw + x;
      if (d1 > 0 && d2 > 0) {
        const e = Math.min(d1, d2) * 半;                 // 縁からの隔たり（画素）
        堀域[j] = Math.min(1, e / Math.max(0.8, 倍));
        堀深[j] = Math.min(1, e / 切);
        高[j] -= (深 / 半) * 堀深[j];
      } else {
        /* 土居。堀の両岸に土を盛る。ここが明るく出ると堀が堀に見える */
        const e2 = Math.min(d1 > 0 ? 1e9 : -d1, d2 > 0 ? 1e9 : -d2) * 半;
        if (e2 < 4 * 倍) 岸[j] = Math.max(岸[j], 1 - e2 / (4 * 倍));
      }
     }
    }
  }
  /* 大手道。門の前から盤の外へ伸びる。寄せ手が上ってくる道である */
  const 刻む = function* (x0, y0, x1, y1, 幅, 場, 深さ) {
    yield;
    const L = Math.hypot(x1 - x0, y1 - y0) / 半, 歩 = Math.max(1, Math.ceil(L));
    const r = 幅 / 2 + 3 * 倍;
    const 歩帯 = Math.max(1, Math.ceil(歩 / Math.max(1, Math.ceil((歩 * r * r) / 16000))));
    for (let s = 0; s <= 歩; s++) {
      if (s % 歩帯 === 0) yield;
      const u = s / 歩, px = (x0 + (x1 - x0) * u) / 半, py = (y0 + (y1 - y0) * u) / 半;
      const rr = r / 半;
      const ax0 = Math.max(0, Math.floor(px - rr)), ax1 = Math.min(gw - 1, Math.ceil(px + rr));
      const ay0 = Math.max(0, Math.floor(py - rr)), ay1 = Math.min(gh - 1, Math.ceil(py + rr));
      for (let y = ay0; y <= ay1; y++) for (let x = ax0; x <= ax1; x++) {
        const dd = Math.hypot(x - px, y - py) * 半;
        if (dd > r) continue;
        const j = y * gw + x, v = 深さ(dd);
        if (v > 場[j]) 場[j] = v;
      }
    }
  };
  /* 門の口。石垣の内側、曲輪に降りた所 */
  const 門の口 = (l, q) => {
    const 横 = q.face === "S" || q.face === "N";
    const lx = PX(m.cx + (l.ox || 0)), ly = PX(m.cy + (l.oy || 0));
    const hwp = PX(l.hw + t), hhp = PX(l.hh + t);
    return 横 ? { x: lx + PX(q.off), y: ly + (q.face === "S" ? hhp - PX(t) * 2 : -hhp + PX(t) * 2) }
      : { x: lx + (q.face === "E" ? hwp - PX(t) * 2 : -hwp + PX(t) * 2), y: ly + PX(q.off) };
  };
  const 大手 = o0.gates.find((q) => q.face === "S") || o0.gates[0] || null;
  const 道口 = [];
  for (const q of o0.gates) {
    const 横 = q.face === "S" || q.face === "N";
    const u = PX(q.off), 幅 = PX(q.w) * 0.95;
    const x0 = 堀外.x + (横 ? u : (q.face === "E" ? 堀外.hw : -堀外.hw));
    const y0 = 堀外.y + (横 ? (q.face === "S" ? 堀外.hh : -堀外.hh) : u);
    const x1 = 横 ? x0 : (q.face === "E" ? W + 20 : -20);
    const y1 = 横 ? (q.face === "S" ? H + 20 : -20) : y0;
    const 半幅 = 幅 / 2 + 2 * 倍;
    yield* 刻む(x0, y0, x1, y1, 幅, 道度, (d) => Math.min(1, (半幅 - d) / (3 * 倍)));
    道口.push({ q, x0, y0, x1, y1, 横 });
  }
  /* 曲輪の中の踏み道。門から次の曲輪の門へ、人の通う筋が付く。
     砂ばかりの広間では、どこが通り道か分からなかった。 */
  for (let i = 0; i < m.layers.length; i++) {
    const l = m.layers[i], 次 = m.layers[i + 1] || null;
    for (const q of l.gates) {
      const a = 門の口(l, q);
      let b2;
      if (次) {
        let 最 = null, nd = Infinity;
        for (const q2 of 次.gates) {
          const p2 = 門の口(次, q2), dd = Math.hypot(p2.x - a.x, p2.y - a.y);
          if (dd < nd) { nd = dd; 最 = p2; }
        }
        b2 = 最;
      } else {
        b2 = { x: PX(m.cx + (l.ox || 0)), y: PX(m.cy + (l.oy || 0)) };   // 本丸は中ほどへ
      }
      if (!b2) continue;
      const 幅 = Math.max(4 * 倍, PX(q.w) * 0.55);
      const 半幅 = 幅 / 2 + 2 * 倍;
      /* 曲がり角を一つ入れる。真っ直ぐ斜めに横切る道は城に無い */
      const 折 = { x: b2.x, y: a.y };
      yield* 刻む(a.x, a.y, 折.x, 折.y, 幅, 道度, (d) => Math.min(0.72, (半幅 - d) / (3 * 倍)));
      yield* 刻む(折.x, 折.y, b2.x, b2.y, 幅, 道度, (d) => Math.min(0.72, (半幅 - d) / (3 * 倍)));
    }
  }

  /* 林。堀の外にだけ生やす。山城の坂は木が多い */
  野種を置く(Math.round(Math.abs(m.cx * 7 + m.cy * 13 + m.layers.length * 101)) % 1e6 + 11);
  const 群数 = Math.max(4, Math.round((W * H) / (300 * 300 * 倍 * 倍)) + (m.坂 >= 1 ? 6 : 0));
  for (let i = 0; i < 群数; i++) {
    yield;
    const cx2 = 野乱() * W, cy2 = 野乱() * H;
    if (矩距(cx2 / 半, cy2 / 半, 堀外) < 24 * 倍 / 半) continue;   // 城と堀の際には生やさぬ
    const r = (46 + 野乱() * 90) * 倍;
    const fx = cx2 / 半, fy = cy2 / 半, rr = r / 半;
    const x0 = Math.max(0, (fx - rr) | 0), x1 = Math.min(gw - 1, Math.ceil(fx + rr));
    const y0 = Math.max(0, (fy - rr) | 0), y1 = Math.min(gh - 1, Math.ceil(fy + rr));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (矩距(x, y, 堀外) < 0) continue;
      const d = Math.hypot(x - fx, y - fy) / rr;
      const ほつれ = (襞(x / (4.5 * 倍), y / (4.5 * 倍), 3) - 0.5) * 0.52;
      const v = 1 - (d + ほつれ);
      if (v > 0) 林[y * gw + x] = Math.max(林[y * gw + x], Math.min(1, v * 2.2));
    }
  }
  const 林帯 = 帯幅(gh, 20) * gw;
  for (let i = 0; i < 林.length; i++) {
    if (i % 林帯 === 0) yield;
    if (林[i] < 0.01) continue;
    if (道度[i] > 0.2) { 林[i] = 0; continue; }                 // 道は木で塞がない
    const x = i % gw, y = (i / gw) | 0;
    高[i] += 林[i] * (3.5 * 倍 + 襞(x / (1.7 * 倍), y / (1.7 * 倍), 2) * 2.5 * 倍);
  }

  計("高さ");
  yield;
  const 光x = -0.62, 光y = -0.72, 光高 = 0.52;
  const 影 = yield* 日影を焼く(高, gw, gh, 光x, 光y, 光高, Math.max(1.4, 1.3 * 倍), 34);
  計("日影");
  const 遮 = yield* 遮蔽を焼く(高, gw, gh, Math.max(5, (7 * 倍) | 0));
  計("遮蔽");

  /* ---- 色を塗る ---- */
  const im = g.createImageData(W, H), dd = im.data;
  const 色帯 = 帯幅(H, 360);
  for (let y = 0; y < H; y++) {
    if (y % 色帯 === 0) yield;
    for (let x = 0; x < W; x++) {
      const p = (y * W + x) * 4;
      const h2 = 引伸(高, gw, gh, x, y, 半);
      const gx = 引伸(高, gw, gh, x + 半, y, 半) - 引伸(高, gw, gh, x - 半, y, 半);
      const gy = 引伸(高, gw, gh, x, y + 半, 半) - 引伸(高, gw, gh, x, y - 半, 半);
      const 傾 = Math.hypot(gx, gy) * 0.5 / 半;
      const 郭t = 引伸(郭, gw, gh, x, y, 半);
      const 堀m = 引伸(堀域, gw, gh, x, y, 半);
      const 堀t = 引伸(堀深, gw, gh, x, y, 半);
      const 岸t = 引伸(岸, gw, gh, x, y, 半);
      const n1 = 襞(x / (1.8 * 倍), y / (1.8 * 倍), 2) - 0.5, n2 = 襞(x / (6 * 倍), y / (6 * 倍), 2) - 0.5;
      /* 城の外の地。野と同じ草に、田畑の割りを薄く入れる */
      const 乾 = 挟(0.36 + h2 / (24 * 倍) + (襞(x / (40 * 倍), y / (40 * 倍), 3) - 0.5) * 0.8, 0, 1);
      let c = 混色([104, 154, 60], [206, 204, 116], 乾);
      c = [c[0] * (1 + n1 * 0.1 + n2 * 0.13), c[1] * (1 + n1 * 0.07 + n2 * 0.11), c[2] * (1 + n1 * 0.2 + n2 * 0.2)];
      const 外d = 矩距(x / 半, y / 半, 堀外);
      if (外d > 2 && 郭t < 0.02 && 堀m < 0.02 && 傾 < 0.55) {
        /* 田畑。城下の地は耕されている。畦で割り、区ごとに色を変える */
        const 田 = 襞(x / (46 * 倍), y / (46 * 倍), 2);
        if (田 > 0.46) {
          const 回x = x * 0.985 + y * 0.174, 回y = y * 0.985 - x * 0.174;   // 畦は少し斜めに走る
        const 割x = 回x / (24 * 倍), 割y = 回y / (18 * 倍);
          const 区 = 粒音(Math.floor(割x) * 7.31 + 0.5, Math.floor(割y) * 5.17 + 0.5);
          const 畑 = 混色([150, 162, 84], [186, 182, 118], 区);
          c = 混色(c, 畑, Math.min(0.5, (田 - 0.46) * 1.9));
          const 畦 = Math.max(Math.abs((割x % 1) - 0.5), Math.abs((割y % 1) - 0.5));
          if (畦 > 0.44) c = 混色(c, [172, 160, 118], 0.28);
        }
      }
      /* 林の梢 */
      const fr = 引伸(林, gw, gh, x, y, 半);
      if (fr > 0.01) {
        c = 混色(c, 混色([58, 92, 40], [104, 134, 54], 襞(x / (2.6 * 倍), y / (2.6 * 倍), 2)), Math.min(0.96, fr * 1.3));
      }
      /* 急な所は土が出る。山城の切岸がこれで見える */
      const 露 = 挟((傾 - 0.70) * 1.1, 0, 1);
      if (露 > 0.01) c = 混色(c, 混色([186, 170, 130], [152, 136, 102], 襞(x / (3.6 * 倍), y / (3.6 * 倍), 2)), 露 * 0.66);
      /* 曲輪の地。踏み固められた砂に、隅だけ草が残る */
      if (郭t > 0.01) {
        const 砂 = 混色([200, 188, 156], [176, 162, 128], 襞(x / (3.4 * 倍), y / (3.4 * 倍), 2));
        const 層明 = 1 + Math.min(3, 郭t) * 0.014;
        let s = [砂[0] * 層明, 砂[1] * 層明, 砂[2] * 層明];
        const 斑 = 襞(x / (16 * 倍), y / (16 * 倍), 2);
        if (斑 > 0.68) s = 混色(s, [140, 160, 92], (斑 - 0.68) * 1.1);   // 隅に残った草
        s = [s[0] * (1 + n1 * 0.07), s[1] * (1 + n1 * 0.07), s[2] * (1 + n1 * 0.09)];
        c = 混色(c, s, Math.min(1, 郭t * 1.8));
      }
      /* 堀の縁の土居。掘った土を両岸に盛る */
      if (岸t > 0.01) c = 混色(c, [204, 194, 164], 岸t * 0.5);
      /* 道。城下から門へ、曲輪では門から門へ続く踏み道 */
      const 道t = 引伸(道度, gw, gh, x, y, 半);
      if (道t > 0.01 && 堀m < 0.3) {
        const v = 挟(道t + (襞(x / (2.6 * 倍), y / (2.6 * 倍), 2) - 0.5) * 0.5, 0, 1);
        c = 混色(c, [214, 182, 162], v * 0.9);
      }
      /* 堀 */
      if (堀m > 0.01) {
        if (空堀) {
          /* 空堀。水の張れぬ山城の堀。掘った土の色がそのまま出る */
          let 土 = 混色([178, 162, 128], [128, 114, 88], 挟(堀t * 1.15, 0, 1));
          土 = [土[0] * (1 + n1 * 0.08), 土[1] * (1 + n1 * 0.08), 土[2] * (1 + n1 * 0.1)];
          const 筋 = 襞(x / (2.2 * 倍), y / (5 * 倍), 2);
          if (筋 > 0.66) 土 = 混色(土, [150, 136, 104], (筋 - 0.66) * 1.2);
          c = 混色(c, 土, 堀m);
        } else {
          /* 水堀。浅い縁は底が透け、深い所は空を映す。野の川と同じ手である */
          /* 堀の水は濁っている。空を映しすぎると泳げる池に見えた。
             藻の緑を下地に置き、空の映りは縁の照りだけに留める。 */
          const 底 = 混色([140, 134, 104], [84, 92, 74], 襞(x / (3 * 倍), y / (3 * 倍), 2));
          const 透 = Math.exp(-堀t * 3.8);
          let 面 = 混色(混色([96, 124, 118], [44, 72, 84], 挟(堀t * 1.2, 0, 1)), 底, 透 * 0.72);
          面 = 混色(面, [150, 176, 198], 0.14 + (1 - 堀t) * 0.1);
          const 波 = 襞(x / (2.6 * 倍), y / (1.2 * 倍), 2);
          if (波 > 0.74) 面 = 混色(面, [226, 236, 244], (波 - 0.74) * 1.5);
          c = 混色(c, 面, 堀m);
        }
      }
      /* 光。日影・環境遮蔽・面の向き。石垣の根にはここで影が落ちる */
      const nx = -gx * 0.5 / 半, ny = -gy * 0.5 / 半, nl = Math.hypot(nx, ny, 1);
      const 直 = 挟((nx * 光x + ny * 光y + 光高) / nl, 0, 1);
      const 日 = 1 - 引伸(影, gw, gh, x, y, 半) * 0.6;
      const 空 = 1 - 引伸(遮, gw, gh, x, y, 半) * 0.28;
      const 明 = 0.58 * 空 + 0.6 * 直 * 日;
      c = [c[0] * 明, c[1] * 明 * 1.01, c[2] * 明 * (1 + (1 - 日) * 0.22 + (1 - 空) * 0.1)];
      dd[p] = 挟(c[0], 0, 255); dd[p + 1] = 挟(c[1], 0, 255); dd[p + 2] = 挟(c[2], 0, 255); dd[p + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  計("色");

  const 明関 = (x, y) => 1 - 引伸(影, gw, gh, Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y)), 半) * 0.5;
  const 外か = (x, y) => 矩距(x / 半, y / 半, 堀外) > 0;

  /* 草の穂。城の外と、曲輪の隅に */
  野種を置く(24601);
  g.lineCap = "butt";
  const 穂数 = Math.min(140000, Math.round(W * H * 0.03));
  const 穂帯 = 帯幅(穂数, 48);
  for (let i = 0; i < 穂数; i++) {
    if (i % 穂帯 === 0) yield;
    const x = 野乱() * W, y = 野乱() * H;
    const 郭t = 引伸(郭, gw, gh, x, y, 半), 堀t = 引伸(堀域, gw, gh, x, y, 半);
    if (堀t > 0.06) continue;
    if (郭t > 0.02 && 野乱() > 0.14) continue;                  // 曲輪は踏み固められている
    if (引伸(道度, gw, gh, x, y, 半) > 0.4) continue;
    const 日 = 明関(x, y);
    const u = 野乱(), a = (0.09 + 野乱() * 0.06) * 日;
    g.strokeStyle = u < 0.45 ? `rgba(82,114,46,${a.toFixed(3)})`
      : u < 0.82 ? `rgba(144,172,78,${a.toFixed(3)})` : `rgba(196,204,128,${a.toFixed(3)})`;
    g.lineWidth = Math.max(0.6, 0.8 * 倍);
    const ang = -1.5 + (野乱() - 0.5) * 0.9, L = (0.7 + 野乱() * 1.4) * 倍;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * L, y + Math.sin(ang) * L); g.stroke();
  }

  計("草");
  /* 城下の町。大手の道沿いに、堀から少し離して置く */
  if (大手) {
    const 口 = 道口.find((o) => o.q === 大手);
    if (口) {
      const ux = 口.x1 - 口.x0, uy = 口.y1 - 口.y0, uL = Math.hypot(ux, uy) || 1;
      const r = Math.min(W, H) * 0.075;
      const 寄 = Math.min(uL * 0.62, 堀幅 * 3 + 170 * 倍);
      /* 盤の縁からはみ出すなら押し戻す。捨てていたころは、
         道の長さが足りない城で城下が丸ごと消えていた。 */
      const mx = 挟(口.x0 + (ux / uL) * 寄, r + 6, W - r - 6);
      const my = 挟(口.y0 + (uy / uL) * 寄, r + 6, H - r - 6);
      if (矩距(mx / 半, my / 半, 堀外) > r * 0.5 / 半) {
        集落(g, mx, my, r, Math.round(m.cx + m.cy), 明関, 倍);
      }
    }
  }

  計("城下");
  /* 木。林の只中は塊で描いたので、縁と野にだけ立てる */
  野種を置く(8086);
  const 木 = [];
  const 試 = Math.min(160000, Math.round(W * H * 0.04));
  const 試帯 = 帯幅(試, 40);
  for (let i = 0; i < 試; i++) {
    if (i % 試帯 === 0) yield;
    const x = 野乱() * W, y = 野乱() * H;
    let 生 = false;
    if (!外か(x, y)) {
      /* 城の中。三層より多い城の外曲輪（惣構）は広すぎて砂の原に見えたので、
         そこにだけ木をまばらに立てる。内の曲輪は空けておく――戦場である。 */
      if (郭ら.length < 3) continue;
      if (引伸(郭, gw, gh, x, y, 半) < 0.5) continue;
      if (矩距(x / 半, y / 半, 郭ら[1]) < 0) continue;
      生 = 野乱() < 0.02;
    } else {
      const fr = 引伸(林, gw, gh, x, y, 半);
      const 群 = 襞(x / (20 * 倍), y / (20 * 倍), 3);
      if (fr > 0.5) 生 = false;
      else if (fr > 0.08) 生 = 野乱() < 0.1;
      else if (群 > 0.60) 生 = 野乱() < 0.035;
      else 生 = 野乱() < 0.006;
    }
    if (!生) continue;
    if (引伸(道度, gw, gh, x, y, 半) > 0.05) continue;
    if (引伸(堀域, gw, gh, x, y, 半) > 0.02) continue;
    木.push([x, y, (2.6 + 野乱() * 3.2) * 倍, 野乱(), 明関(x, y)]);
  }
  木.sort((a, b) => a[1] - b[1]);
  for (const [x, y, r, 振, 日] of 木) 繁木(g, x, y, r, 振, 日);
  計("木");

  g.setTransform(1, 0, 0, 1, 0, 0);
}

/* ---- 組の中の持ち場（戦列の形：前列が組の前縁、後ろへ五列） ---- */
/* 散らばりは、定規で引いた格子に見えぬ程度に広く取る（GDD 8.11）。

   人の列は真っ直ぐには並ばない。端は遅れ、中ほどは押し出される。
   散らばりを ±〇.四歩から ±〇.八歩へ広げ、列そのものも弓なりに撓ませる。
   それでも前列は前列のまま（row は変えない）なので、戦列の読みは崩れない。 */
const 持場 = [];
{ 種 = 13;
  for (let i = 0; i < 50; i++) { const col = i % 10, row = (i / 10) | 0;
    const 弓 = Math.cos(((col - 4.5) / 4.5) * (Math.PI / 2)) * 0.95;   // 中ほどが前へ出る
    持場.push([(col - 4.5) * 1.9 + (row % 2) * 0.8 + (R() - 0.5) * 1.6,
      -8 + row * 2.6 - 弓 + (R() - 0.5) * 1.5, row]); } }
const 馬持場 = [];
{ 種 = 29;
  for (let i = 0; i < 50; i++) { const col = i % 10, row = (i / 10) | 0;
    const 弓 = Math.cos(((col - 4.5) / 4.5) * (Math.PI / 2)) * 1.3;
    馬持場.push([(col - 4.5) * 3.1 + (row % 2) * 1.2 + (R() - 0.5) * 2.2,
      -8 + row * 3.6 - 弓 + (R() - 0.5) * 2.0, row]); } }

/* ---- 高さ。丘山の持ち上がり（歩）。寄りの見た目だけに使う ---- */
const 山高m = (o) => o.高 || Math.min(200, (o.r || 60) * 0.4);
/* 城攻めの盤では、野の丘山（HILLS）は城の地とは無縁である。
   盤を移っても field.js の丘は残っているので、ここで断たねば
   曲輪の兵が有りもしない丘の上に浮く。 */
let 城盤 = false;
export function 持上高(x, y) {
  if (城盤) return 0;
  let v = 0;
  for (const o of [...HILLS, ...MOUNTAINS]) {
    const d = Math.hypot(x - o.x, y - o.y);
    if (d < o.r) { const h = Math.min(16, 山高m(o) * 0.08) * Math.cos((d / o.r) * Math.PI / 2);
      if (h > v) v = h; } }
  return v;
}

/* ---- 見た目の状態。盤には書かない（WeakMapは記録にも載らない） ---- */
const 組態 = new WeakMap();
const 盤態 = new WeakMap();
const 組の態 = (q) => { let s = 組態.get(q);
  if (!s) { s = { dx: q.x, dy: q.y, sx: new Float32Array(50), sy: new Float32Array(50),
    借り: 0, 前qx: q.x, 前qy: q.y,
    生: new Uint8Array(50), 歩距: new Float32Array(50), 速: new Float32Array(50),
    進x: new Float32Array(50), 進y: new Float32Array(50),
    初: false, prevMen: q.men, prevCool: q.cool || 0, 撃刻: -99, 向: q.facing || 0 };
    組態.set(q, s); }
  return s; };
const 盤の態 = (b) => { let s = 盤態.get(b);
  if (!s) { s = { 倒れ: [], 前t: b.t, 飛び数: 0 }; 盤態.set(b, s); }
  return s; };

/* ---- 近景の肌理（GDD 8.11）----

   野の地は、盤いっぱいの一枚に焼いて拡大して映している。寄り七倍で見ると、
   草の一筋は七倍に伸びて滲み、地面はのっぺりした色面になる。兵だけが輪郭の
   はっきりした絵なので、平らな下敷きに紙を貼ったように見えた――遊ぶ側から
   「兵がマップの上に貼り付けられているだけに見える」との申し出はこれである。

   そこで、寄ったときだけ、地の肌理を「画面の縮尺で」刻む。草の丈も石の粒も
   画面の上で同じ大きさに保つので、寄るほど細かくなる。兵と同じ寸法の肌理が
   足元にあれば、兵は地面の中に立って見える。

   貼り方は型紙である。はじめは一本ずつ筆で引いたが、一コマに七千本では絵が
   重くなった（撮りの実測で三倍遅くなった）。細かい粒だけの型紙を一枚焼いて
   敷き詰めれば、貼るのは六枚で済む。型紙は野の原点に合わせて並べるので、
   画面を動かしても地から浮かない。 */
const 肌理の寸 = 512;
let 肌理札 = undefined;
/* 肌理の型紙を一枚だけ焼く。細かい粒だけで作るので、敷き詰めても継ぎ目が出ない。
   一本ずつ筆で引いていたころは、一コマに七千本を引いて絵が重くなった
   （撮りの実測で三倍遅くなった）。型紙なら貼るのは六枚で済む。 */
function 肌理の型紙() {
  if (肌理札 !== undefined) return 肌理札;
  if (typeof document === "undefined") { 肌理札 = null; return null; }
  const n = document.createElement("canvas");
  n.width = 肌理の寸; n.height = 肌理の寸;
  const g = n.getContext("2d");
  種 = 4649;
  g.lineWidth = 1; g.lineCap = "butt";
  const 色 = ["rgba(86,96,54,0.46)", "rgba(126,134,80,0.40)", "rgba(198,200,142,0.34)"];
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = 色[k];
    g.beginPath();
    for (let i = 0; i < 2600; i++) {
      const x = R() * 肌理の寸, y = R() * 肌理の寸;
      const a = -1.45 + (R() - 0.5) * 0.7, L = 2 + R() * 3.4;
      g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
    }
    g.stroke();
  }
  /* 小石と土くれ */
  g.fillStyle = "rgba(118,110,88,0.34)";
  g.beginPath();
  for (let i = 0; i < 900; i++) {
    const x = R() * 肌理の寸, y = R() * 肌理の寸;
    g.rect(x, y, 1 + (R() < 0.3 ? 1 : 0), 1);
  }
  g.fill();
  肌理札 = n;
  return n;
}
/* 曲輪の肌理。踏み固められた砂である。草ではなく、小石と掃いた筋を刻む。 */
let 砂札;
function 砂の型紙() {
  if (砂札 !== undefined) return 砂札;
  if (typeof document === "undefined") { 砂札 = null; return null; }
  const n = document.createElement("canvas");
  n.width = 肌理の寸; n.height = 肌理の寸;
  const g = n.getContext("2d");
  種 = 2255;
  g.lineWidth = 1; g.lineCap = "butt";
  for (const 色 of ["rgba(146,132,104,0.30)", "rgba(222,212,186,0.28)"]) {
    g.strokeStyle = 色;
    g.beginPath();
    for (let i = 0; i < 1800; i++) {
      const x = R() * 肌理の寸, y = R() * 肌理の寸;
      const a = (R() - 0.5) * 0.5, L = 3 + R() * 7;        // 掃いた筋は横に寝る
      g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
    }
    g.stroke();
  }
  g.fillStyle = "rgba(106,98,80,0.34)";                     // 小石
  g.beginPath();
  for (let i = 0; i < 1500; i++) {
    const x = R() * 肌理の寸, y = R() * 肌理の寸;
    g.rect(x, y, 1 + (R() < 0.26 ? 1 : 0), 1);
  }
  g.fill();
  g.fillStyle = "rgba(240,234,214,0.26)";                   // 日の当たる砂粒
  g.beginPath();
  for (let i = 0; i < 900; i++) g.rect(R() * 肌理の寸, R() * 肌理の寸, 1, 1);
  g.fill();
  砂札 = n;
  return n;
}
/* m を渡せば城攻めの地として貼る（曲輪は砂、外は草、堀には貼らない）。 */
export function 近景の肌理(ctx, cam, W, H, dpr, m) {
  const s = cam.s;
  /* 一人ずつ描き始める寄り（個人閾）に合わせて出す。別の閾にすると、
     兵が人型になる寄りと肌理の出る寄りがずれて、地面だけが後から変わる。 */
  if (s < 個人閾) return;
  const 濃 = Math.min(1, (s - 個人閾) / 1.4);            // 寄るほど濃く出す
  const 草 = 肌理の型紙(); if (!草) return;
  /* 画面の座標で貼る。こうすれば草の丈は寄りによらず同じ太さに保たれ、
     盤の原点に合わせて位置を決めるので、画面を動かしても地から浮かない。 */
  const sx = W / 2 - cam.x * s, sy = H / 2 - cam.y * s;   // 野の原点の画面座標
  const 左 = Math.max(0, sx), 上 = Math.max(0, sy);
  const 右 = Math.min(W, sx + FIELD.w * s), 下 = Math.min(H, sy + FIELD.h * s);
  if (右 <= 左 || 下 <= 上) return;
  ctx.save();
  /* 画面の座標へ戻す。画素の倍（dpr）を掛け忘れると、画素の細かい画面では
     三分の一しか貼られない――携帯はたいてい三倍である。 */
  ctx.setTransform(dpr || 1, 0, 0, dpr || 1, 0, 0);
  ctx.globalAlpha = 濃;
  const T = 肌理の寸;
  const 敷 = (n) => {
    const 始x = 左 - (((左 - sx) % T) + T) % T;
    const 始y = 上 - (((上 - sy) % T) + T) % T;
    for (let x = 始x; x < 右; x += T) for (let y = 始y; y < 下; y += T) ctx.drawImage(n, x, y);
  };
  if (!m || !m.layers || !m.layers.length) {
    ctx.beginPath(); ctx.rect(左, 上, 右 - 左, 下 - 上); ctx.clip();
    敷(草);
  } else {
    /* 城攻め。内側の曲輪は外側の曲輪の中に入れ子であるから、
       いちばん外の曲輪ひとつを切り抜けば、曲輪はすべて砂になる。 */
    const l0 = m.layers[0], t = m.t, ob = l0.masu + t + 8;
    const 郭x = sx + (m.cx + (l0.ox || 0) - l0.hw - t) * s, 郭y = sy + (m.cy + (l0.oy || 0) - l0.hh - t) * s;
    const 郭w = (l0.hw + t) * 2 * s, 郭h = (l0.hh + t) * 2 * s;
    const 外幅 = l0.hw + t + ob + m.moat.band, 外奥 = l0.hh + t + ob + m.moat.band;
    const 堀x = sx + (m.cx - 外幅) * s, 堀y = sy + (m.cy - 外奥) * s;
    /* 草を貼る所。偶奥の規矩（evenodd）で、入れ子の矩形を一筆で抜く。
         城の外 … 一重 → 貼る
         堀     … 二重 → 抜く（水や空堀に草は生えない）
         犬走り … 三重 → 貼る（堀と石垣の間の帯。ここは草地である）
         曲輪   … 四重 → 抜く（砂の型紙を別に貼る） */
    const 内幅 = l0.hw + t + ob, 内奥 = l0.hh + t + ob;
    ctx.save();
    ctx.beginPath(); ctx.rect(左, 上, 右 - 左, 下 - 上);
    ctx.rect(堀x, 堀y, 外幅 * 2 * s, 外奥 * 2 * s);
    ctx.rect(sx + (m.cx - 内幅) * s, sy + (m.cy - 内奥) * s, 内幅 * 2 * s, 内奥 * 2 * s);
    ctx.rect(郭x, 郭y, 郭w, 郭h);
    ctx.clip("evenodd");
    敷(草);
    ctx.restore();
    const 砂 = 砂の型紙();
    if (砂) {
      ctx.save(); ctx.beginPath(); ctx.rect(郭x, 郭y, 郭w, 郭h); ctx.clip();
      敷(砂);
      ctx.restore();
    }
  }
  ctx.restore();
}

/* ---- 本陣衆（将・旗持・馬廻）の見た目 ---- */
const 本陣態 = new WeakMap();
const 本陣の数 = 25;                       /* 五×五。中が将、その隣が旗持 */
/* 馬廻の席順。将（十二番）に近いほうから埋める。

   番の若い順に埋めていたころは、馬廻が六騎の小勢だと上の一列だけが埋まり、
   「将の前に一列が並ぶ」形になって本陣に見えなかった。近い席から埋めれば、
   何騎であっても将を囲む輪になる。 */
const 馬廻の席順 = (() => {
  const a = [];
  for (let k = 0; k < 本陣の数; k++) {
    if (k === 12 || k === 13) continue;            // 将と旗持の席
    a.push(k);
  }
  const d = (k) => Math.hypot((k % 5) - 2, ((k / 5) | 0) - 2);
  a.sort((x, z) => d(x) - d(z) || x - z);
  return a;
})();
const 本陣の態 = (c) => { let t = 本陣態.get(c);
  if (!t) { t = { x: new Float32Array(本陣の数), y: new Float32Array(本陣の数),
    歩距: new Float32Array(本陣の数), 速: new Float32Array(本陣の数),
    進x: new Float32Array(本陣の数), 進y: new Float32Array(本陣の数),
    数: 0, 初: false, 前x: 0, 前y: 0 };
    本陣態.set(c, t); }
  return t; };

/* 本陣の居所を外へ渡す窓口（GDD 8.11）。

   かつては c.本陣 に書き込んで draw.js へ渡していたが、それは盤への書き込み
   である。見た目の都合を盤に残せば、記録にも載るし、絵を外した版と盤が
   食い違う（tests/shinga.cjs の「盤に書かない」が咎めた）。棚から引く。 */
export function 本陣の所(c) {
  const t = 本陣態.get(c);
  return t && t.初 ? { x: t.前x, y: t.前y } : null;
}

/* 本陣衆を進める。塊として本陣に据え、隊と一緒に動く。
   描くぶんの兵は、本陣に近い組から少しずつ借りて差し引く（絵は盤を偽らない）。 */
function 本陣衆を進める(c, b, dt, 本x, 本y) {
  const t = 本陣の態(c);
  const 兵 = c.squads.reduce((a, q) => a + (q.men > 0 ? q.men : 0), 0);
  /* 馬廻の数は隊の大きさに見合わせる。小勢に四十騎の馬廻は立たない。 */
  const 廻 = Math.max(10, Math.min(23, Math.round(兵 / 260)));
  t.数 = 2 + 廻;
  /* 借りを割り当て直す。本陣に近い組から、一組につき六人まで。 */
  for (const q of c.squads) 組の態(q).借り = 0;
  {
    let 残 = 廻;
    const 近い = c.squads.filter((q) => q.men > 0)
      .sort((a, z) => (Math.hypot(a.x - 本x, a.y - 本y) - Math.hypot(z.x - 本x, z.y - 本y)));
    for (const q of 近い) {
      if (残 <= 0) break;
      const n = Math.min(6, 残, Math.max(0, Math.min(50, Math.round(q.men)) - 4));
      組の態(q).借り = n; 残 -= n;
    }
  }
  /* 盤が隊を飛ばしたら、塊も同じだけ平行移動する */
  if (t.初) {
    const jx = 本x - t.前x, jy = 本y - t.前y;
    if (Math.hypot(jx, jy) > 56 * dt * 1.6 + 1.5) {
      for (let n = 0; n < 本陣の数; n++) { t.x[n] += jx; t.y[n] += jy; }
    }
  }
  t.前x = 本x; t.前y = 本y;
  const 向 = c.facing || 0;
  const lx = Math.cos(向 + Math.PI / 2), ly = Math.sin(向 + Math.PI / 2);
  const bx = -Math.cos(向), by = -Math.sin(向);
  for (let n = 0; n < t.数; n++) {
    /* 席。五×五の二十五席のうち、十二番が将、十三番が旗持。
       残りが馬廻で、将に近い席から埋める（馬廻の席順）。 */
    const 席 = n === 0 ? 12 : n === 1 ? 13 : 馬廻の席順[Math.min(馬廻の席順.length - 1, n - 2)];
    const 列 = 席 % 5, 行 = (席 / 5) | 0;
    /* 間合いは詰める。広いと歩兵の列に紛れて、本陣の塊として読めない */
    const tx = 本x + lx * (列 - 2) * 4.6 + bx * (行 - 2) * 4.2;
    const ty = 本y + ly * (列 - 2) * 4.6 + by * (行 - 2) * 4.2;
    if (!t.初) { t.x[n] = tx; t.y[n] = ty; t.速[n] = 0; continue; }
    const vx = tx - t.x[n], vy = ty - t.y[n], d = Math.hypot(vx, vy);
    let mv = 0;
    if (d > 100) { t.x[n] = tx; t.y[n] = ty; }
    else if (d > 0.02) {
      mv = Math.min(d, 130 * dt);
      t.x[n] += vx / d * mv; t.y[n] += vy / d * mv;
      t.進x[n] += (vx / d - t.進x[n]) * Math.min(1, dt * 3);
      t.進y[n] += (vy / d - t.進y[n]) * Math.min(1, dt * 3);
    }
    t.歩距[n] += mv;
    t.速[n] += ((dt > 0 ? mv / dt : 0) - t.速[n]) * Math.min(1, dt * 6);
  }
  t.初 = true;
}

/* ---- 見た目の状態を進める。読みは盤から、書きは WeakMap だけ ----
   nowSec は実時間（秒）。viewRect {x0,y0,x1,y1} の外の組は飛ばす（null なら全部）。 */
export function 新絵状態を進める(b, nowSec, viewRect) {
  const 態 = 盤の態(b);
  /* 刻は盤のもの（b.t）を使う（GDD 8.11）。

     実時間で足を動かしていたころは、盤を通常で進めると隊のほうが速く、
     兵がついて行けずに瞬間移動していた――これが「ヌメっと動く」の正体である。
     盤の刻で動かせば、どの速さでも兵は隊と同じ歩調で歩く。
     盤を止めれば兵も止まる。それが道理である。 */
  const dt = Math.max(0, Math.min(0.25, b.t - 態.前t));
  態.前t = b.t;
  /* 刻がゼロでも、下ごしらえだけは回す（GDD 8.11）。

     かつては刻がゼロなら何もせず戻っていた。盤を止めて画面を動かすと、
     新しく画面に入った組は見た目の状態を持たないまま描く側へ回るので、
     兵が一人も出なかった（地面だけが映る）。刻がゼロなら誰も動かないが、
     初めての組を持ち場に据える仕事は要る。 */
  for (const c of b.corps) {
    if (c.dead || c.destroyed) continue;
    if (viewRect && (c.x < viewRect.x0 - 160 || c.x > viewRect.x1 + 160
      || c.y < viewRect.y0 - 160 || c.y > viewRect.y1 + 160)) continue;
    /* 本陣衆――将・旗持・馬廻を一つの塊にする（GDD 8.11）。

       かつては「馬廻のための方陣」を別に組み、本陣の近くにいる騎馬の組から
       兵を連れてきて並べ直していた。これが三つの不具合を生んだ。

         一、連れてくる組が本陣から七十歩より遠いと、一騎も来ない（将が独り）
         二、来ても、組の持ち場と方陣とで引っぱり合うので、隊列から浮く
         三、馬印は将とは別に置いていたので、離れて漂う

       いまは、将・旗持・馬廻を一つの塊として本陣に据え、塊ごと動かす。
       組から兵を連れてくるのではなく、この塊のぶんだけ兵を描き、そのぶんを
       近くの組から差し引く（下の 借り）。数は増えも減りもしないし、
       塊は何があっても離れようがない。 */
    const 本x = c.gx == null ? c.x : c.gx, 本y = c.gy == null ? c.y : c.gy;
    本陣衆を進める(c, b, dt, 本x, 本y);

    /* 馬廻の陣（五×五）が占める四角。ほかの兵はこの四角を避ける。
       崩れた隊・退く隊では避けない（陣形どころではない）。 */
    const 本x2 = 本x, 本y2 = 本y;
    const 陣向2 = c.facing || 0;
    const 陣fx = Math.cos(陣向2), 陣fy = Math.sin(陣向2);
    const 陣横半 = 2 * 4.6 + 3.4, 陣奥半 = 2 * 4.2 + 3.4;
    const 本陣よけ = !(c.routed || c.withdraw);
    for (const q of c.squads) {
      const s = 組の態(q);
      /* 発砲の刻。cool が跳ね上がったら、いま放った */
      if ((q.cool || 0) > s.prevCool + 0.4) s.撃刻 = b.t;
      s.prevCool = q.cool || 0;
      /* 盤が組を飛ばしたときは、兵も組ごと同じだけ平行移動する（GDD 8.11）。

         盤は組をときどき飛ばす（陣形の組み直し、はぐれの繕い、盤に収める）。
         絵の兵が一人ずつ歩いて追うと、近い者から順に着くので、隊が
         「打ち寄せる波」のように現れる――遊ぶ側の申し出はこれである。
         塊ごと同じだけ動かせば、並びを保ったまま移る。歩幅は積まない
         （歩いていないのだから、足も出ない）。 */
      {
        const jx2 = q.x - s.前qx, jy2 = q.y - s.前qy;
        const j = Math.hypot(jx2, jy2);
        const 歩ける = (q.type === "kiba" ? 56 : 34) * dt * 1.6 + 1.5;
        if (s.初 && j > 歩ける) {
          態.飛び数++;
          s.dx += jx2; s.dy += jy2;
          for (let n = 0; n < 50; n++) { s.sx[n] += jx2; s.sy[n] += jy2; }
        }
        s.前qx = q.x; s.前qy = q.y;
      }
      /* 組の足：目標（盤の位置）へ、歩幅の上限で寄る */
      { const ddx = q.x - s.dx, ddy = q.y - s.dy, d = Math.hypot(ddx, ddy);
        /* 組を追う点は、組より速くなければ置いて行かれる。
           遅く取っていたころは、絵の兵が組から六十六歩も遅れた。
           組の足（騎馬五十六・徒三十四）の三倍を取り、瞬間移動だけを均す。 */
        if (!s.初 || d > 200) { s.dx = q.x; s.dy = q.y; }
        else if (d > 0.02) { const mv = Math.min(d, (q.type === "kiba" ? 170 : 110) * dt);
          s.dx += ddx / d * mv; s.dy += ddy / d * mv; } }
      /* 向きの均し */
      { let df = (q.facing || 0) - s.向;
        while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2;
        s.向 += df * Math.min(1, dt * 2.2); }
      /* 倒れ：減ったぶんは、立っていた場所に倒れて残る */
      const alive = Math.max(0, Math.min(50, Math.round(q.men)));
      const 前alive = Math.max(0, Math.min(50, Math.round(s.prevMen)));
      if (alive < 前alive && s.初) {
        for (let n = alive; n < 前alive && 態.倒れ.length < 1600; n++)
          態.倒れ.push({ x: s.sx[n] || q.x, y: s.sy[n] || q.y,
            s: c.日和見 ? "P" : (c.side === "P" ? "P" : "E") });
      }
      s.prevMen = q.men;
      /* 一人ずつの足 */
      const 場 = q.type === "kiba" ? 馬持場 : 持場;
      const th = s.向, lx = Math.cos(th + Math.PI / 2), ly = Math.sin(th + Math.PI / 2);
      const bx = -Math.cos(th), by = -Math.sin(th);
      /* 噛み合っていれば、前列は敵との中間まで伸びる（槍合わせの線） */
      const 前 = q.engaged && q.foe ? Math.max(8, Math.min(17, q.foe.d / 2 - 2)) : 8;
      const 刻み = (前 + 2.8) / 4;
      const 押 = q.engaged ? 0.6 - Math.sin(b.t * 0.9 + (q.seed || 0)) * 1.2 : 0;
      for (let n = 0; n < alive; n++) {
        const o = 場[n];
        const 深 = q.engaged
          ? (-前 + o[2] * 刻み + (o[1] - (-8 + o[2] * (q.type === "kiba" ? 3.6 : 2.6))))
          : o[1];
        let tx = s.dx + lx * o[0] + bx * (深 + 押), ty = s.dy + ly * o[0] + by * (深 + 押);
        /* 本陣の陣に、ほかの兵を被せない（GDD 8.11）。

           将と馬廻を本陣に据えたところ、そこは隊の只中なので歩兵の列に埋もれた
           ――遊ぶ側から「武将と馬廻役が埋もれている」との申し出はこれである。

           馬廻は五×五の四角い陣を組む。その四角のぶんだけ、ほかの兵を外へ
           よける（いちど円に避けさせたが、地面に定規の円が浮かび上がって
           かえって作り物に見えた）。よけ方は「いちばん近い辺へ」。
           絵の上だけの話で、盤の組の居場所は動かさない。 */
        if (本陣よけ) {
          const dx3 = tx - 本x2, dy3 = ty - 本y2;
          const 奥3 = dx3 * 陣fx + dy3 * 陣fy;              // 前後（陣の向き）
          const 横3 = -dx3 * 陣fy + dy3 * 陣fx;             // 左右
          if (Math.abs(奥3) < 陣奥半 && Math.abs(横3) < 陣横半) {
            if (陣横半 - Math.abs(横3) <= 陣奥半 - Math.abs(奥3)) {
              const 先 = 横3 >= 0 ? 陣横半 : -陣横半, 差 = 先 - 横3;
              tx += -陣fy * 差; ty += 陣fx * 差;
            } else {
              const 先 = 奥3 >= 0 ? 陣奥半 : -陣奥半, 差 = 先 - 奥3;
              tx += 陣fx * 差; ty += 陣fy * 差;
            }
          }
        }
        if (!s.生[n] || !s.初) { s.sx[n] = tx; s.sy[n] = ty; s.生[n] = 1; s.速[n] = 0; continue; }
        const vx = tx - s.sx[n], vy = ty - s.sy[n], d = Math.hypot(vx, vy);
        let mv = 0;
        /* 飛びは上で組ごと平行移動して捌いた。ここで瞬間移動させるのは、
           よほど離れたとき（盤の繕いの取りこぼし）だけである。 */
        if (d > 100) { s.sx[n] = tx; s.sy[n] = ty; }
        /* 兵の足は、組の足（騎馬五十六・徒三十四）より速く取る。
           遅いと、組が走り続けるあいだ兵が置いて行かれ、百八十歩も遅れた。 */
        else if (d > 0.02) { mv = Math.min(d, (q.type === "kiba" ? 130 : 90) * dt);
          s.sx[n] += vx / d * mv; s.sy[n] += vy / d * mv;
          /* 進む向き。均しておかないと、持ち場の細かな直しで体がくるくる回る */
          s.進x[n] += (vx / d - s.進x[n]) * Math.min(1, dt * 3);
          s.進y[n] += (vy / d - s.進y[n]) * Math.min(1, dt * 3); }
        /* 歩いた距離で拍を回す（GDD 8.11）。

           時計で回していたころは、盤を微速にすると体だけ止まり、位置だけが
           滑っていった――遊ぶ側の目には「ヌメっと動く」と映る。
           足は踏んだ地べたのぶんだけ出るのが道理である。歩幅で回せば、
           どんな速さでも足が地に着き、滑りは消える。 */
        /* 歩幅に積むのは、踏んだ地べたのぶん――そのまま mv である。

           いちど「組の足（騎馬五十六・徒三十四）より速いぶんは積まない」と
           蓋をしてみたが、これは逆であった。置いて行かれた兵が駆けて追いつく
           とき、足はその速さで回らねばならない。蓋をすると足が地面より遅く
           回り、かえって滑って見える（盤の刻を細かく取ったとき、歩幅と
           道のりの見合いが一.〇〇から〇.四五まで落ちた）。 */
        s.歩距[n] += mv;
        s.速[n] += ((dt > 0 ? mv / dt : 0) - s.速[n]) * Math.min(1, dt * 6);
      }
      for (let n = alive; n < 50; n++) s.生[n] = 0;
      s.初 = true;
    }
  }
  return dt;
}

/* 試験のための覗き窓。見た目の状態（歩いた距離・足の速さ）を読むだけ。 */
export function 組の見た目(q) { return 組態.get(q) || null; }
export function 盤の見た目(b) { return 盤態.get(b) || null; }

const 向き八 = (vx, vy) => { const a = Math.atan2(vy, vx);
  return ((Math.round(a / (Math.PI / 8)) % 16) + 16) % 16; };

/* ---- 将と旗持（GDD 8.11）----

   隊の本陣（gx, gy＝兵の重心から後ろ二列目。名札もここに出る）に、
   兜と甲冑の将が馬上にある。大きさは馬廻と同じで、鍬形の前立て・面頬・
   大袖・馬鎧だけで足軽と見分ける。

   将は指物（背旗）を負わない――背の指物は足軽・母衣衆・使番の印であって、
   隊を率いる将のものではない。将の居場所は、かたわらの旗持が掲げる馬印で
   示す。馬印は格で分ける。
     一般の将 … 長旗（家の色の幟）
     総大将   … 金の扇
     大名     … 金の唐傘（一段。縁に白熊の毛を回す）
   ここにあるのは描きだけで、理には一切関わらない。 */
function 武将図(g, x, y, s, K, 案, t) {
  const 毛 = "#3E2E20";
  const 影 = (fn) => { g.save(); g.shadowColor = "rgba(24,22,16,0.4)"; g.shadowBlur = 0.5 * s;
    g.shadowOffsetX = -0.3 * s; g.shadowOffsetY = 0.4 * s; fn(); g.restore(); };
  /* ── 馬（横向き・右を向く）。足軽の馬を下敷きに、ひと回り大きく ── */
  g.fillStyle = "rgba(24,26,18,0.32)";
  g.beginPath(); g.ellipse(x + 0.3 * s, y + 0.25 * s, 4.0 * s, 1.1 * s, 0, 0, 7); g.fill();
  /* 奥の脚 */
  g.strokeStyle = shade(毛, 0.45); g.lineCap = "round";
  for (const [dx, 曲] of [[2.5, 0.25], [-2.3, -0.2]]) {
    g.lineWidth = 0.52 * s;
    g.beginPath(); g.moveTo(x + dx * s, y - 2.6 * s);
    g.lineTo(x + (dx + 曲) * s, y - 1.2 * s); g.stroke();
    g.lineWidth = 0.34 * s;
    g.beginPath(); g.moveTo(x + (dx + 曲) * s, y - 1.2 * s);
    g.lineTo(x + (dx + 曲 * 1.6) * s, y - 0.1 * s); g.stroke(); }
  /* 尾 */
  g.strokeStyle = shade(毛, 0.4);
  for (const k of [-0.2, 0, 0.2]) { g.lineWidth = 0.22 * s;
    g.beginPath(); g.moveTo(x - 3.5 * s, y - 4.4 * s);
    g.quadraticCurveTo(x - 4.5 * s, y - 3.0 * s + k * s, x - 4.2 * s, y - 0.9 * s + k * 0.6 * s);
    g.stroke(); }
  /* 胴（尻と肩の二つの山） */
  const g馬 = g.createLinearGradient(x, y - 5.6 * s, x, y - 2.0 * s);
  g馬.addColorStop(0, shade(毛, 1.34)); g馬.addColorStop(0.55, 毛); g馬.addColorStop(1, shade(毛, 0.55));
  影(() => {
    g.beginPath();
    g.moveTo(x - 3.6 * s, y - 3.6 * s);
    g.quadraticCurveTo(x - 3.4 * s, y - 5.4 * s, x - 1.6 * s, y - 5.3 * s);
    g.quadraticCurveTo(x + 0.2 * s, y - 5.0 * s, x + 1.6 * s, y - 5.4 * s);
    g.quadraticCurveTo(x + 2.9 * s, y - 5.7 * s, x + 3.3 * s, y - 4.6 * s);
    g.quadraticCurveTo(x + 3.6 * s, y - 3.6 * s, x + 3.2 * s, y - 2.6 * s);
    g.quadraticCurveTo(x + 1.2 * s, y - 1.7 * s, x - 1.4 * s, y - 1.8 * s);
    g.quadraticCurveTo(x - 3.2 * s, y - 1.9 * s, x - 3.6 * s, y - 3.6 * s);
    g.closePath(); g.fillStyle = g馬; g.fill(); });
  g.strokeStyle = "rgba(18,14,8,0.65)"; g.lineWidth = 0.08 * s; g.stroke();
  /* 馬鎧（胴に掛ける家の色の布。胴の形に沿わせる） */
  g.save();
  g.beginPath();
  g.moveTo(x - 3.4 * s, y - 3.5 * s);
  g.quadraticCurveTo(x - 1.4 * s, y - 2.0 * s, x + 1.4 * s, y - 2.0 * s);
  g.quadraticCurveTo(x + 2.9 * s, y - 2.2 * s, x + 3.2 * s, y - 2.8 * s);
  g.lineTo(x + 3.0 * s, y - 2.2 * s);
  g.quadraticCurveTo(x + 1.2 * s, y - 1.2 * s, x - 1.5 * s, y - 1.3 * s);
  g.quadraticCurveTo(x - 3.0 * s, y - 1.4 * s, x - 3.5 * s, y - 2.8 * s);
  g.closePath(); g.clip();
  g.fillStyle = shade(K.中, 0.95);
  g.fillRect(x - 4 * s, y - 4 * s, 8 * s, 4 * s);
  g.strokeStyle = "rgba(240,232,210,0.5)"; g.lineWidth = 0.12 * s;
  for (const dy of [-2.6, -2.0]) {
    g.beginPath(); g.moveTo(x - 4 * s, y + dy * s); g.lineTo(x + 4 * s, y + dy * s); g.stroke(); }
  g.restore();
  g.strokeStyle = "#B8442F"; g.lineWidth = 0.18 * s;          // 房
  for (let i = -3; i <= 3; i++) {
    g.beginPath(); g.moveTo(x + (i * 0.8 - 0.2) * s, y - 1.5 * s);
    g.lineTo(x + (i * 0.8 - 0.2) * s, y - 0.9 * s); g.stroke(); }
  /* 手前の脚 */
  g.strokeStyle = shade(毛, 0.72);
  for (const [dx, 曲] of [[2.9, 0.3], [-2.7, -0.25]]) {
    g.lineWidth = 0.6 * s;
    g.beginPath(); g.moveTo(x + dx * s, y - 2.4 * s);
    g.lineTo(x + (dx + 曲) * s, y - 1.1 * s); g.stroke();
    g.lineWidth = 0.38 * s;
    g.beginPath(); g.moveTo(x + (dx + 曲) * s, y - 1.1 * s);
    g.lineTo(x + (dx + 曲 * 1.7) * s, y); g.stroke();
    g.fillStyle = "#241C14";
    g.beginPath(); g.ellipse(x + (dx + 曲 * 1.7) * s, y + 0.05 * s, 0.3 * s, 0.18 * s, 0, 0, 7); g.fill(); }
  /* 首と頭（前へ伸ばす） */
  影(() => {
    g.beginPath();
    g.moveTo(x + 2.5 * s, y - 5.0 * s);
    g.quadraticCurveTo(x + 4.0 * s, y - 6.2 * s, x + 4.7 * s, y - 7.1 * s);
    g.lineTo(x + 5.5 * s, y - 6.6 * s);
    g.quadraticCurveTo(x + 4.6 * s, y - 5.2 * s, x + 3.5 * s, y - 3.6 * s);
    g.closePath(); g.fillStyle = shade(毛, 1.08); g.fill(); });
  g.strokeStyle = "rgba(18,14,8,0.6)"; g.lineWidth = 0.08 * s; g.stroke();
  g.save(); g.translate(x + 5.3 * s, y - 7.0 * s); g.rotate(0.55);
  g.fillStyle = shade(毛, 0.9);
  g.beginPath(); g.ellipse(0, 0, 1.15 * s, 0.52 * s, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(18,14,8,0.6)"; g.lineWidth = 0.08 * s; g.stroke();
  g.fillStyle = "#8F8A7A";                                     // 馬面（鉄の面当て）
  g.beginPath(); g.ellipse(0.25 * s, 0, 0.72 * s, 0.34 * s, 0, 0, 7); g.fill();
  g.fillStyle = "#1E1812";
  g.beginPath(); g.ellipse(-0.42 * s, -0.16 * s, 0.13 * s, 0.16 * s, 0, 0, 7); g.fill();
  for (const e of [-1, 1]) {                                   // 耳
    g.beginPath(); g.moveTo(-0.75 * s + e * 0.1 * s, -0.3 * s);
    g.lineTo(-0.85 * s + e * 0.3 * s, -0.95 * s); g.lineTo(-0.5 * s + e * 0.15 * s, -0.3 * s);
    g.closePath(); g.fillStyle = shade(毛, 0.85); g.fill(); }
  g.restore();
  g.strokeStyle = shade(毛, 0.4); g.lineWidth = 0.26 * s;       // たてがみ
  g.beginPath(); g.moveTo(x + 2.7 * s, y - 5.2 * s);
  g.quadraticCurveTo(x + 3.8 * s, y - 6.2 * s, x + 4.6 * s, y - 7.0 * s); g.stroke();
  /* 鞍と乗り手の脚 */
  g.fillStyle = "#3A2C1C";
  g.beginPath(); g.ellipse(x - 0.2 * s, y - 5.3 * s, 1.3 * s, 0.42 * s, 0, 0, 7); g.fill();
  g.strokeStyle = 布; g.lineWidth = 0.5 * s; g.lineCap = "round";
  g.beginPath(); g.moveTo(x - 0.1 * s, y - 5.1 * s); g.lineTo(x + 0.7 * s, y - 3.3 * s); g.stroke();
  g.strokeStyle = "#5A5448"; g.lineWidth = 0.34 * s;            // 脛当
  g.beginPath(); g.moveTo(x + 0.7 * s, y - 3.3 * s); g.lineTo(x + 0.95 * s, y - 2.4 * s); g.stroke();
  /* ── 甲冑の胴（黒漆に家の色の威し）と草摺 ── */
  for (let i = -1; i <= 1; i++) {                              // 草摺
    g.fillStyle = i ? shade(K.中, 0.6) : shade(K.中, 0.78);
    g.beginPath();
    g.moveTo(x + (i * 0.9 - 0.65) * s, y - 5.5 * s);
    g.lineTo(x + (i * 0.9 + 0.25) * s, y - 5.5 * s);
    g.lineTo(x + (i * 1.0 + 0.3) * s, y - 4.3 * s);
    g.lineTo(x + (i * 1.0 - 0.7) * s, y - 4.3 * s);
    g.closePath(); g.fill();
    g.strokeStyle = "rgba(16,14,10,0.5)"; g.lineWidth = 0.06 * s; g.stroke(); }
  const g胴 = g.createLinearGradient(x - 1.4 * s, y - 8.6 * s, x + 1.4 * s, y - 5.4 * s);
  g胴.addColorStop(0, "#241F1A"); g胴.addColorStop(0.5, "#322C24"); g胴.addColorStop(1, "#1C1814");
  影(() => {
    g.beginPath();
    g.moveTo(x - 1.25 * s, y - 8.3 * s);
    g.quadraticCurveTo(x - 0.1 * s, y - 8.7 * s, x + 1.15 * s, y - 8.3 * s);
    g.lineTo(x + 1.35 * s, y - 5.5 * s);
    g.quadraticCurveTo(x - 0.1 * s, y - 5.1 * s, x - 1.45 * s, y - 5.5 * s);
    g.closePath(); g.fillStyle = g胴; g.fill(); });
  g.strokeStyle = "rgba(10,8,6,0.75)"; g.lineWidth = 0.08 * s; g.stroke();
  g.strokeStyle = shade(K.帯, 1.3); g.lineWidth = 0.14 * s;      // 威し（色の紐）
  for (const yy of [-7.8, -7.2, -6.6, -6.0]) {
    g.beginPath(); g.moveTo(x - 1.2 * s, y + yy * s); g.lineTo(x + 1.2 * s, y + yy * s); g.stroke(); }
  /* 大袖（肩の板）。足軽には無い */
  for (const 側 of [-1, 1]) {
    const g袖 = g.createLinearGradient(x + 側 * 1.1 * s, y - 8.2 * s, x + 側 * 2.2 * s, y - 6.2 * s);
    g袖.addColorStop(0, shade(K.中, 側 < 0 ? 0.8 : 1.3)); g袖.addColorStop(1, shade(K.中, 側 < 0 ? 0.5 : 0.85));
    g.beginPath();
    g.moveTo(x + 側 * 1.05 * s, y - 8.2 * s); g.lineTo(x + 側 * 2.1 * s, y - 7.9 * s);
    g.lineTo(x + 側 * 2.0 * s, y - 6.2 * s); g.lineTo(x + 側 * 1.1 * s, y - 6.5 * s);
    g.closePath(); g.fillStyle = g袖; g.fill();
    g.strokeStyle = "rgba(14,12,8,0.6)"; g.lineWidth = 0.07 * s; g.stroke();
    g.strokeStyle = "rgba(16,14,10,0.35)"; g.lineWidth = 0.05 * s;
    for (const k of [0.4, 0.75]) {
      g.beginPath();
      g.moveTo(x + 側 * 1.05 * s, y - 8.2 * s + 1.8 * k * s);
      g.lineTo(x + 側 * 2.1 * s, y - 7.9 * s + 1.75 * k * s); g.stroke(); } }
  /* ── 首・顔・面頬 ── */
  g.strokeStyle = 肌; g.lineWidth = 0.42 * s;
  g.beginPath(); g.moveTo(x - 0.05 * s, y - 8.3 * s); g.lineTo(x + 0.1 * s, y - 8.9 * s); g.stroke();
  g.fillStyle = 肌;
  g.beginPath(); g.ellipse(x + 0.12 * s, y - 9.25 * s, 0.6 * s, 0.66 * s, 0, 0, 7); g.fill();
  g.fillStyle = "#2A2218";
  g.beginPath(); g.ellipse(x + 0.42 * s, y - 9.35 * s, 0.1 * s, 0.13 * s, 0, 0, 7); g.fill();
  if (案 === 2) {                                              // 面頬（鉄の覆面）
    g.fillStyle = "rgba(84,50,34,0.92)";
    g.beginPath();
    g.moveTo(x - 0.46 * s, y - 9.2 * s);
    g.quadraticCurveTo(x + 0.14 * s, y - 8.5 * s, x + 0.72 * s, y - 9.2 * s);
    g.lineTo(x + 0.6 * s, y - 8.95 * s);
    g.quadraticCurveTo(x + 0.12 * s, y - 8.35 * s, x - 0.34 * s, y - 8.95 * s);
    g.closePath(); g.fill(); }
  /* ── 兜 ── */
  const 兜y = y - 10.0 * s, 兜r = 1.0 * s;
  for (let i = 2; i >= 0; i--) {                               // 錣
    g.beginPath();
    g.ellipse(x + 0.1 * s, 兜y + (0.5 + i * 0.26) * s,
      (0.85 + i * 0.2) * s, (0.34 + i * 0.1) * s, 0, 0.1, Math.PI - 0.1);
    g.fillStyle = i % 2 ? "#332E26" : "#453E33"; g.fill();
    g.strokeStyle = "rgba(14,12,8,0.6)"; g.lineWidth = 0.05 * s; g.stroke();
    g.strokeStyle = shade(K.帯, 1.25); g.lineWidth = 0.08 * s;
    g.beginPath();
    g.ellipse(x + 0.1 * s, 兜y + (0.5 + i * 0.26) * s,
      (0.76 + i * 0.2) * s, (0.27 + i * 0.1) * s, 0, 0.35, Math.PI - 0.35); g.stroke(); }
  const g鉢 = g.createRadialGradient(x - 0.25 * s, 兜y - 0.6 * s, 0.1 * s, x + 0.1 * s, 兜y, 兜r * 1.3);
  g鉢.addColorStop(0, "#7A7162"); g鉢.addColorStop(0.5, "#453E33"); g鉢.addColorStop(1, "#272219");
  影(() => {
    g.beginPath();
    g.moveTo(x + 0.1 * s - 兜r, 兜y + 0.26 * s);
    g.quadraticCurveTo(x + 0.1 * s - 兜r * 1.05, 兜y - 兜r * 1.15, x + 0.1 * s, 兜y - 兜r * 1.28);
    g.quadraticCurveTo(x + 0.1 * s + 兜r * 1.05, 兜y - 兜r * 1.15, x + 0.1 * s + 兜r, 兜y + 0.26 * s);
    g.closePath(); g.fillStyle = g鉢; g.fill(); });
  g.strokeStyle = "rgba(12,10,8,0.8)"; g.lineWidth = 0.07 * s; g.stroke();
  g.strokeStyle = "rgba(210,200,170,0.35)"; g.lineWidth = 0.05 * s;    // 筋
  for (const k of [-0.5, 0, 0.5]) {
    g.beginPath();
    g.moveTo(x + 0.1 * s + k * 兜r, 兜y + 0.2 * s);
    g.quadraticCurveTo(x + 0.1 * s + k * 兜r * 0.68, 兜y - 兜r * 0.8,
      x + 0.1 * s + k * 兜r * 0.28, 兜y - 兜r * 1.18); g.stroke(); }
  for (const 側 of [-1, 1]) {                                   // 吹返し
    g.beginPath();
    g.moveTo(x + 0.1 * s + 側 * 兜r * 0.9, 兜y + 0.2 * s);
    g.quadraticCurveTo(x + 0.1 * s + 側 * 兜r * 1.6, 兜y - 0.15 * s,
      x + 0.1 * s + 側 * 兜r * 1.5, 兜y - 0.78 * s);
    g.lineTo(x + 0.1 * s + 側 * 兜r * 0.95, 兜y - 0.42 * s);
    g.closePath(); g.fillStyle = "#453E33"; g.fill();
    g.strokeStyle = "rgba(14,12,8,0.7)"; g.lineWidth = 0.05 * s; g.stroke();
    g.strokeStyle = shade(K.帯, 1.3); g.lineWidth = 0.06 * s;
    g.beginPath();
    g.moveTo(x + 0.1 * s + 側 * 兜r * 1.0, 兜y - 0.02 * s);
    g.lineTo(x + 0.1 * s + 側 * 兜r * 1.4, 兜y - 0.55 * s); g.stroke(); }
  g.strokeStyle = "#1E1A14"; g.lineWidth = 0.16 * s;             // 眉庇
  g.beginPath(); g.ellipse(x + 0.1 * s, 兜y - 兜r * 0.14, 兜r * 0.98, 兜r * 0.4, 0,
    Math.PI * 1.06, Math.PI * 1.94); g.stroke();
  /* ── 前立て（案ごとに形を変える） ── */
  const 眉y = 兜y - 兜r * 0.55, 立x = x + 0.1 * s;
  g.fillStyle = "#E8C24A"; g.strokeStyle = "#8A6E1E"; g.lineWidth = 0.05 * s;
  if (案 === 1) {                                               // 三日月
    g.beginPath();
    g.arc(立x, 眉y - 0.85 * s, 1.25 * s, Math.PI * 1.12, Math.PI * 1.88, false);
    g.arc(立x, 眉y - 1.32 * s, 0.95 * s, Math.PI * 1.84, Math.PI * 1.16, true);
    g.closePath(); g.fill(); g.stroke();
  } else if (案 === 2) {                                        // 鍬形
    for (const 側 of [-1, 1]) {
      g.beginPath();
      g.moveTo(立x + 側 * 0.22 * s, 眉y - 0.05 * s);
      g.quadraticCurveTo(立x + 側 * 1.15 * s, 眉y - 0.8 * s, 立x + 側 * 0.95 * s, 眉y - 2.1 * s);
      g.lineTo(立x + 側 * 0.55 * s, 眉y - 1.72 * s);
      g.quadraticCurveTo(立x + 側 * 0.62 * s, 眉y - 0.7 * s, 立x + 側 * 0.04 * s, 眉y + 0.04 * s);
      g.closePath(); g.fill(); g.stroke(); }
    g.beginPath(); g.arc(立x, 眉y - 0.12 * s, 0.3 * s, 0, 7); g.fill(); g.stroke();
  } else {                                                      // 輪貫
    g.lineWidth = 0.3 * s; g.strokeStyle = "#E8C24A";
    g.beginPath(); g.arc(立x, 眉y - 1.25 * s, 1.0 * s, 0, 7); g.stroke();
    g.lineWidth = 0.06 * s; g.strokeStyle = "#8A6E1E";
    g.beginPath(); g.arc(立x, 眉y - 1.25 * s, 1.15 * s, 0, 7); g.stroke();
    g.beginPath(); g.arc(立x, 眉y - 1.25 * s, 0.85 * s, 0, 7); g.stroke(); }
  /* ── 采配。肩から肘・手・柄・紙房へ順に繋ぐ ── */
  const 肩x = x + 1.1 * s, 肩y = y - 7.9 * s;
  const 振 = Math.sin(t * 1.8) * 0.2;
  const 肘x = 肩x + Math.cos(-0.6 + 振) * 1.15 * s, 肘y = 肩y + Math.sin(-0.6 + 振) * 1.15 * s;
  const 手x = 肘x + Math.cos(-1.45 + 振) * 1.05 * s, 手y = 肘y + Math.sin(-1.45 + 振) * 1.05 * s;
  g.strokeStyle = shade(K.中, 0.9); g.lineWidth = 0.4 * s; g.lineCap = "round";
  g.beginPath(); g.moveTo(肩x, 肩y); g.lineTo(肘x, 肘y); g.stroke();
  g.strokeStyle = "#2E2922"; g.lineWidth = 0.32 * s;
  g.beginPath(); g.moveTo(肘x, 肘y); g.lineTo(手x, 手y); g.stroke();
  g.fillStyle = 肌; g.beginPath(); g.arc(手x, 手y, 0.24 * s, 0, 7); g.fill();
  const 棒 = -1.05 + 振 * 1.2;
  const 先x = 手x + Math.cos(棒) * 1.5 * s, 先y = 手y + Math.sin(棒) * 1.5 * s;
  g.strokeStyle = "#6E4F2C"; g.lineWidth = 0.16 * s;
  g.beginPath(); g.moveTo(手x, 手y); g.lineTo(先x, 先y); g.stroke();
  g.strokeStyle = "rgba(246,242,230,0.95)"; g.lineWidth = 0.09 * s;
  for (let i = 0; i < 7; i++) {
    const a2 = 棒 - 0.5 + i * 0.17 + Math.sin(t * 4 + i) * 0.06;
    g.beginPath(); g.moveTo(先x, 先y);
    g.quadraticCurveTo(先x + Math.cos(a2) * 0.7 * s, 先y + Math.sin(a2) * 0.7 * s,
      先x + Math.cos(a2) * 1.3 * s, 先y + Math.sin(a2) * 1.5 * s); g.stroke(); }
  /* 将は指物（背旗）を負わない。
     背の指物は足軽・母衣衆・使番の印であって、隊を率いる将のものではない。
     将の居場所は、かたわらの旗持が掲げる馬印で示す（下の 旗持 を見よ）。 */
}

/* 旗持（はたもち）。将のかたわらで馬印を掲げる騎馬。
   馬印は家ごとに形が違う――ここでは三つの形を見せる。 */
function 旗持図(g, x, y, s, K, 形, t) {
  const n = 札取り("P", "kiba", 0, 0);
  if (n) g.drawImage(n, x - n.width / 2 * (s / 6.2), y - (n.height - 8) * (s / 6.2),
    n.width * (s / 6.2), n.height * (s / 6.2));
  /* 馬印の竿。乗り手の肩から高く掲げる */
  const 竿x = x - 0.5 * s, 根 = y - 7.0 * s;
  const 先 = y - (形 === "金の唐傘" ? 17.0 : 15.5) * s;
  g.strokeStyle = "#3A2C1A"; g.lineWidth = 0.2 * s; g.lineCap = "round";
  g.beginPath(); g.moveTo(竿x, 根); g.lineTo(竿x, 先); g.stroke();
  const ゆ = Math.sin(t * 1.5) * 0.12 * s;
  g.fillStyle = "#E8C24A"; g.strokeStyle = "#8A6E1E"; g.lineWidth = 0.07 * s;
  if (形 === "金の扇") {
    g.beginPath();
    g.moveTo(竿x, 先 + 0.3 * s);
    g.arc(竿x, 先 + 0.3 * s, 2.0 * s, Math.PI * 1.15, Math.PI * 1.85);
    g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = "rgba(120,92,20,0.6)"; g.lineWidth = 0.05 * s;
    for (let i = 1; i < 5; i++) { const a = Math.PI * (1.15 + 0.7 * i / 5);
      g.beginPath(); g.moveTo(竿x, 先 + 0.3 * s);
      g.lineTo(竿x + Math.cos(a) * 2.0 * s, 先 + 0.3 * s + Math.sin(a) * 2.0 * s); g.stroke(); }
  } else if (形 === "朱の円") {
    g.beginPath(); g.arc(竿x + ゆ, 先 + 1.1 * s, 1.5 * s, 0, 7);
    g.fillStyle = "#C0392B"; g.fill();
    g.strokeStyle = "rgba(246,242,230,0.8)"; g.lineWidth = 0.12 * s; g.stroke();
  } else if (形 === "金の唐傘") {
    /* 大名の馬印。唐傘の形は一段――二段に重ねるのは仏具の天蓋であって
       馬印には見ない。派手さは大きさと、縁に回した白熊（はぐま）の毛で出す。
       白熊は唐牛の毛を染めた飾りで、兜にも馬印にも実際に使われた。 */
    const 揺 = Math.sin(t * 1.3) * 0.1 * s;
    const 傘y = 先 + 2.4 * s, r = 4.2 * s;
    g.save(); g.translate(揺, 0);
    /* 傘の面。中央が高く、縁へ向かって垂れる */
    const g傘 = g.createRadialGradient(竿x - r * 0.3, 傘y - r * 0.6, r * 0.1, 竿x, 傘y - r * 0.1, r * 1.1);
    g傘.addColorStop(0, "#FBE79A"); g傘.addColorStop(0.55, "#EFCB4E"); g傘.addColorStop(1, "#C9A227");
    g.beginPath();
    g.moveTo(竿x - r, 傘y);
    g.quadraticCurveTo(竿x - r * 0.72, 傘y - r * 0.92, 竿x, 傘y - r * 1.02);
    g.quadraticCurveTo(竿x + r * 0.72, 傘y - r * 0.92, 竿x + r, 傘y);
    g.quadraticCurveTo(竿x + r * 0.5, 傘y + 0.5 * s, 竿x, 傘y + 0.38 * s);
    g.quadraticCurveTo(竿x - r * 0.5, 傘y + 0.5 * s, 竿x - r, 傘y);
    g.closePath(); g.fillStyle = g傘; g.fill();
    g.strokeStyle = "#8A6E1E"; g.lineWidth = 0.08 * s; g.stroke();
    /* 骨 */
    g.strokeStyle = "rgba(140,108,24,0.5)"; g.lineWidth = 0.05 * s;
    for (const k of [-0.82, -0.5, -0.17, 0.17, 0.5, 0.82]) {
      g.beginPath(); g.moveTo(竿x, 傘y - r * 0.98);
      g.quadraticCurveTo(竿x + k * r * 0.72, 傘y - r * 0.45, 竿x + k * r, 傘y + 0.08 * s); g.stroke(); }
    /* 白熊（はぐま）の毛。縁をぐるりと回す */
    for (let i = -8; i <= 8; i++) {
      const t2 = i / 8;
      const px = 竿x + t2 * r * 0.98;
      const py = 傘y + 0.3 * s - Math.abs(t2) * Math.abs(t2) * 0.45 * s;
      const 長 = (0.9 + Math.cos(t2 * 1.4) * 0.45) * s;
      const ゆ2 = Math.sin(t * 2.1 + i * 0.7) * 0.1 * s;
      g.strokeStyle = "rgba(248,246,240,0.95)"; g.lineWidth = 0.17 * s; g.lineCap = "round";
      g.beginPath(); g.moveTo(px, py);
      g.quadraticCurveTo(px + ゆ2, py + 長 * 0.6, px + ゆ2 * 1.6, py + 長); g.stroke();
      g.strokeStyle = "rgba(214,208,196,0.8)"; g.lineWidth = 0.07 * s;
      g.beginPath(); g.moveTo(px, py);
      g.quadraticCurveTo(px + ゆ2, py + 長 * 0.6, px + ゆ2 * 1.6, py + 長 * 0.92); g.stroke(); }
    /* てっぺんの露（小さな玉）。宝珠のような火炎は付けない */
    g.fillStyle = "#F6DC7A"; g.strokeStyle = "#8A6E1E"; g.lineWidth = 0.07 * s;
    g.beginPath(); g.arc(竿x, 傘y - r * 1.12, 0.3 * s, 0, 7); g.fill(); g.stroke();
    g.restore();
  } else if (形 === "千成瓢箪") {                   // 大名の馬印・その二
    g.fillStyle = "#E8C24A"; g.strokeStyle = "#8A6E1E"; g.lineWidth = 0.06 * s;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.283 + t * 0.4;
      const px = 竿x + Math.cos(a) * (0.9 + (i % 2) * 0.5) * s;
      const py = 先 + 1.4 * s + Math.sin(a) * (0.7 + (i % 2) * 0.4) * s;
      g.beginPath();
      g.ellipse(px, py - 0.45 * s, 0.34 * s, 0.4 * s, 0, 0, 7); g.fill(); g.stroke();
      g.beginPath();
      g.ellipse(px, py + 0.3 * s, 0.52 * s, 0.6 * s, 0, 0, 7); g.fill(); g.stroke(); }
  } else {                                        // 長旗（幟）
    g.fillStyle = shade(K.帯, 1.25);
    g.beginPath();
    g.moveTo(竿x + 0.12 * s, 先);
    g.lineTo(竿x + 2.0 * s + ゆ, 先 + 0.25 * s);
    g.lineTo(竿x + 1.9 * s + ゆ, 先 + 5.2 * s);
    g.lineTo(竿x + 0.12 * s, 先 + 4.9 * s);
    g.closePath(); g.fill();
    g.fillStyle = shade(K.濃, 1.06);
    g.beginPath();
    g.moveTo(竿x + 0.12 * s, 先 + 2.8 * s);
    g.lineTo(竿x + 1.95 * s + ゆ, 先 + 3.0 * s);
    g.lineTo(竿x + 1.9 * s + ゆ, 先 + 5.2 * s);
    g.lineTo(竿x + 0.12 * s, 先 + 4.9 * s);
    g.closePath(); g.fill();
    g.strokeStyle = "rgba(246,242,230,0.6)"; g.lineWidth = 0.07 * s;
    g.beginPath();
    g.moveTo(竿x + 0.12 * s, 先); g.lineTo(竿x + 2.0 * s + ゆ, 先 + 0.25 * s);
    g.lineTo(竿x + 1.9 * s + ゆ, 先 + 5.2 * s); g.lineTo(竿x + 0.12 * s, 先 + 4.9 * s);
    g.closePath(); g.stroke(); }
}


/* 将の格を見分ける。大名＞総大将＞一般の将 */
function 将の格(b, c) {
  if (c.gen && c.gen.lord) return "大名";
  if (c.筋 && (c.筋.家康 || c.筋.大将)) return "総大将";
  if (c.大将) return "総大将";
  return "将";
}
const 馬印の形 = { 大名: "金の唐傘", 総大将: "金の扇", 将: "長旗" };

/* ---- 一人ずつを描く。drawBattle の世界座標の中で呼ばれる ---- */
export function 新絵の兵描き(ctx, b, 隊ら, cam, W, H, nowSec) {
  札を焼く();
  城盤 = !!(b && b.map);
  const dt = 新絵状態を進める(b, nowSec, {
    x0: cam.x - W / 2 / cam.s, x1: cam.x + W / 2 / cam.s,
    y0: cam.y - H / 2 / cam.s, y1: cam.y + H / 2 / cam.s });
  const 態 = 盤の態(b);
  /* 直接描き（連続位相）は型紙貼りより費えが重い。見える組が絞れたときだけ使う */
  let 見組 = 0;
  { const px0 = cam.x - W / 2 / cam.s - 40, px1 = cam.x + W / 2 / cam.s + 40;
    const py0 = cam.y - H / 2 / cam.s - 60, py1 = cam.y + H / 2 / cam.s + 40;
    for (const c of 隊ら) for (const q of c.squads) {
      if (q.men > 0 && q.x > px0 && q.x < px1 && q.y > py0 && q.y < py1) 見組++; } }
  const 骨度 = (見組 <= 28) ? Math.max(0, Math.min(1, (cam.s - 滑閾) / 0.7)) : 0;
  const x0 = cam.x - W / 2 / cam.s - 40, x1 = cam.x + W / 2 / cam.s + 40;
  const y0 = cam.y - H / 2 / cam.s - 60, y1 = cam.y + H / 2 / cam.s + 40;
  const 見える = (x, y) => x > x0 && x < x1 && y > y0 && y < y1;
  /* 倒れた者 */
  for (const e of 態.倒れ) {
    if (!見える(e.x, e.y)) continue;
    { const n = 倒れ札(e.s);
      if (n) { ctx.globalAlpha = 0.85;
        ctx.drawImage(n, e.x - n.width / 2 * 0.056, e.y - 持上高(e.x, e.y) - (n.height - 8) * 0.056,
          n.width * 0.056, n.height * 0.056);
        ctx.globalAlpha = 1; } }
  }
  const 並 = [];
  for (const c of 隊ら) {
    const 側 = c.日和見 ? "Y" : (c.side === "P" ? "P" : "E");
    for (const q of c.squads) {
      if (q.men <= 0) continue;
      const s = 組態.get(q); if (!s || !s.初) continue;
      /* 本陣衆へ貸したぶんは、この組では描かない（数を増やさないため） */
      const alive = Math.max(0, Math.min(50, Math.round(q.men)) - (s.借り || 0));
      const th = s.向;
      const dir基 = 向き八(Math.cos(th), Math.sin(th));
      const 撃 = (b.t - s.撃刻) / 1.5;
      for (let n = 0; n < alive; n++) {
        if (!s.生[n]) continue;
        if (並.length > 12000) break;
        const wx = s.sx[n], wy = s.sy[n];
        if (!見える(wx, wy)) continue;
        /* 拍：歩き・突き・斉射。寄りが深ければ割り切れない拍で滑らかに */
        let fr = 0, dir = dir基;
        const 場 = q.type === "kiba" ? 馬持場 : 持場;
        const 歩速 = s.速[n];
        /* 働きの順（GDD 8.11）。

           歩みを先に見ていたころは、槍を合わせた前列が持ち場を直すたびに
           「歩き」と見なされ、突きが一度も出なかった。
           槍を合わせているなら突く。放ったなら構えを解く。それ以外で
           足が出ているときだけ歩く――働きのほうが先である。 */
        if (q.engaged && 場[n][2] < 2 && 歩速 < 14) {
          /* 突き：合戦の刻で回す。盤を遅くすれば、槍もゆっくり繰り出される */
          const ph = (b.t * 0.55 + (q.seed || 0) + n * 0.17) % 1;
          fr = 骨度 > 0 ? 3 + ph * 3.999 : 3 + Math.min(3, (ph * 4) | 0);
        } else if (撃 >= 0 && 撃 < 1 && (q.type === "yumi" || q.type === "teppo")) {
          fr = 骨度 > 0 ? 3 + Math.min(3.999, 撃 * 4) : 3 + Math.min(3, (撃 * 4) | 0);
        } else if (歩速 > 2.5) {
          /* 歩み：歩幅（騎馬は十四歩、徒は九歩）ごとに一周 */
          const 歩幅 = q.type === "kiba" ? 14 : 9;
          const w = (s.歩距[n] / 歩幅) % 1;
          if (Math.hypot(s.進x[n], s.進y[n]) > 0.3) dir = 向き八(s.進x[n], s.進y[n]);
          fr = 骨度 > 0 ? 1 + w * 2 : 1 + (w < 0.5 ? 0 : 1);
        }
        /* 丈を少しずつ変える（GDD 8.11）。

           型紙を色ちがいで焼けば具足の幅は出せるが、十六方向×七拍ぶん増える
           ので三十MBが六十MBになる。携帯では危うい。丈を〇.九五〜一.〇六の
           あいだで散らすだけなら費えは零で、「同じ判を押した」感じはほどけ
           る。馬の毛色は型紙の側で既に三色に散っている。 */
        const 丈 = 0.95 + (((q.seed || 0) * 31 + n * 7) % 12) / 100;
        並.push({ wx, wy, 地y: wy, 側, 型: q.type, dir: Math.round(dir), fr: Math.round(fr), 丈,
          直: 骨度 > 0 ? { dir, fr, 型: q.type, 側, 乱: ((q.seed || 0) * 31 + n * 7) % 97 / 97 } : null });
      }
      /* 組の小旗（後列に二本）。側の色でまとまりを示す */
      if (cam.s > 2.2) {
        const lx = Math.cos(th + Math.PI / 2), ly = Math.sin(th + Math.PI / 2);
        const bx = -Math.cos(th), by = -Math.sin(th);
        for (const fx of [-6, 6]) {
          const wx = s.dx + lx * fx + bx * 12, wy = s.dy + ly * fx + by * 12;
          if (!見える(wx, wy)) continue;
          並.push({ wx, wy, 地y: wy, 旗: 側 });
        }
      }
    }
  }
  /* 本陣衆――将・旗持・馬廻。一つの塊として本陣に立つ（GDD 8.11）。
     並びの中へ入れて、前後を正しく重ねる。 */
  for (const c of 隊ら) {
    const 側 = c.日和見 ? "Y" : (c.side === "P" ? "P" : "E");
    const t = 本陣態.get(c); if (!t || !t.初) continue;
    for (let n = 0; n < t.数; n++) {
      const wx = t.x[n], wy = t.y[n];
      if (!見える(wx, wy)) continue;
      if (n === 0) { 並.push({ wx, wy, 地y: wy + 0.1, 将: { c, 側 } }); continue; }
      if (n === 1) { 並.push({ wx, wy, 地y: wy + 0.08, 旗持: { c, 側 } }); continue; }
      /* 馬廻。一騎ずつ家の色の指物を立てるので、遠目にも「旗の群れ」として読める */
      const 進 = Math.hypot(t.進x[n], t.進y[n]) > 0.3
        ? 向き八(t.進x[n], t.進y[n]) : 向き八(Math.cos(c.facing || 0), Math.sin(c.facing || 0));
      let fr = 0;
      if (t.速[n] > 2.5) { const w = (t.歩距[n] / 14) % 1; fr = 1 + (w < 0.5 ? 0 : 1); }
      並.push({ wx, wy, 地y: wy, 側, 型: "kiba", dir: 進, fr, 直: null,
        丈: 0.96 + ((n * 13) % 10) / 100 });
      並.push({ wx, wy, 地y: wy + 0.05, 指: 側 });
    }
  }
  並.sort((a, z) => a.地y - z.地y);
  for (const p of 並) {
    const y = p.wy - 持上高(p.wx, p.wy);
    if (p.指) {                                    // 馬廻の指物
      const K2 = 具側[p.指];
      ctx.strokeStyle = "#3A2C1A"; ctx.lineWidth = 0.1;
      ctx.beginPath(); ctx.moveTo(p.wx - 1.4, y - 3.2); ctx.lineTo(p.wx - 1.6, y - 7.4); ctx.stroke();
      ctx.fillStyle = shade(K2.帯, 1.25);
      ctx.fillRect(p.wx - 1.58, y - 7.4, 0.85, 1.6);
      continue;
    }
    if (p.旗) {
      ctx.strokeStyle = "#3A2C1A"; ctx.lineWidth = 0.12;
      ctx.beginPath(); ctx.moveTo(p.wx, y); ctx.lineTo(p.wx, y - 2.0); ctx.stroke();
      /* 組の小旗は家の色（帯）で描く。具足を暗く落としたので、中では沈む */
      ctx.fillStyle = shade(具側[p.旗].帯, 1.02);
      ctx.fillRect(p.wx + 0.06, y - 2.0, 0.55, 1.05);
      continue;
    }
    if (p.将) {
      const c2 = p.将.c, 側2 = p.将.側;
      const 格 = 将の格(b, c2);
      /* 将は馬廻と同じ丈。型紙の丈（百九十）を兵の丈（百四）に合わせる */
      const 倍2 = 0.062 * (104 / 190) * 1.18;
      const n2 = 将札(側2, 格);
      if (n2) ctx.drawImage(n2, p.wx - n2.width / 2 * 倍2, y - (n2.height - 12) * 倍2,
        n2.width * 倍2, n2.height * 倍2);
      continue;
    }
    if (p.旗持) {                                   // 馬印を掲げる旗持。将の隣に立つ
      const 格 = 将の格(b, p.旗持.c);
      const n3 = 旗持札(p.旗持.側, 馬印の形[格]);
      const 倍3 = 0.062 * (104 / 190) * 1.18 * (11 / 19);   // 乗り手の丈は将と同じに保つ
      if (n3) ctx.drawImage(n3, p.wx - n3.width / 2 * 倍3, y - (n3.height - 12) * 倍3,
        n3.width * 倍3, n3.height * 倍3);
      continue;
    }
    const 丈 = p.丈 || 1;
    if (p.直) 姿八(ctx, p.wx, y, (p.直.型 === "kiba" ? 6.2 : 6.4) * 0.062 * 丈,
      p.直.dir, p.直.fr, p.直.型, 具側[p.直.側], p.直.乱);
    else { const n = 札取り(p.側, p.型, p.dir, p.fr);
      const k2 = 0.062 * 丈;
      if (n) ctx.drawImage(n, p.wx - n.width / 2 * k2, y - (n.height - 8) * k2,
        n.width * k2, n.height * k2); }
  }
  return dt;
}
