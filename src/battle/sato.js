/* ==========================================================================
   集落と湿地（GDD 8.10・8.11）── 斜めの眺めで、家を立て、葦を立てる

   遊ぶ側の申し出は「森と川が終わったら、集落と湿地のリアルさへの修正も」であった。

   集落 … 地に描いた屋根は、斜めから見ると地に貼った札にしか見えない。
           家を一軒ずつ、壁の箱と屋根（茅葺・瓦の蔵・板葺の納屋）で立てる。
           大きさは兵に合わせる（一軒は兵六、七人の幅）。兵と同じく奥から手前へ
           重ねるので、家の陰に入った兵は隠れる。家並みは村の道に沿わせる。
   湿地 … 地には水溜まりと泥を焼く（shinga.js）。ここでは葦の株を立てて描く。

   絵だけのものである。当たり（集落・湿地の足止めや見通し）には触れない。
   兵は家をよけて通る（家をよける）。これも絵の上だけで、盤の組は動かさない。
   ========================================================================== */
import { VILLAGES, MARSH, ROADS, 水際まで, 節までの隔たり } from "./field.js";
import { 棟, 瓦, 板葺 } from "./tachimono.js";
import { 画の横, 画の縦, 斜め, 見える範囲, 視の筆へ, 縦の縮み } from "./naname.js";

const 茅 = { 奥: "#BBA36F", 左: "#AC935F", 右: "#7F6A45", 前: "#977E52", 縁: "rgba(74,60,38,0.5)" };

function 種乱(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* 村の道の向き。地の焼き（shinga.js 集落）と家並みとで同じ向きを使う */
/* 村の 横 が決まっていれば（戦場の型の町並み。battle/kata.js）、それに従う */
export function 村の道は横か(v) { return v.横 != null ? !!v.横 : 種乱(Math.round(v.x * 3 + v.y * 5))() < 0.5; }

/* ---- 家並み ---- */
let 家々 = null, 家々の鍵 = "", 家々の数 = -1, 家々の頭 = null;
export function 家々を据える() {
  /* 兵一人ずつの家よけ（家をよける）からも毎刻呼ばれる。野が変わらぬうちは、
     鍵の文字列を作らずに返す（作っていたころは関ヶ原の試しが何倍も遅くなった） */
  if (家々 && VILLAGES.length === 家々の数 && VILLAGES[0] === 家々の頭) return 家々;
  const 鍵 = VILLAGES.map((v) => `${Math.round(v.x)},${Math.round(v.y)},${Math.round(v.r || 40)}${v.横 == null ? "" : v.横 ? "横" : "縦"}`).join(";");
  家々の数 = VILLAGES.length; 家々の頭 = VILLAGES[0] || null;
  if (家々 && 鍵 === 家々の鍵) return 家々;
  家々の鍵 = 鍵;
  const 並 = [];
  for (const v of VILLAGES) {
    const R = 種乱(Math.round(v.x * 3 + v.y * 5));
    const r = (v.r || 40) * 0.92;
    const 道の賽 = R();
    const 横道 = v.横 != null ? !!v.横 : 道の賽 < 0.5;         // 村の道は東西か南北に通す（村の道は横か と同じ）
    /* 道に沿った家の間。斜めの眺めでは南北が縮んで見えるので、道が南北に通る村は
       間を広く取る（詰めると家が前後に重なり、柱が並んだように見えた） */
    const 間 = 横道 ? 32 : 46;
    for (let 段 = -1; 段 <= 1; 段 += 2) {                     // 道の両側
      for (let 列 = 0; 列 < 3; 列++) {                       // 道から奥へ三列まで（奥ほどまばら）
        const 奥 = 段 * (16 + 列 * 26 + R() * 5);
        for (let u = -r + (列 % 2) * 間 / 2; u <= r; u += 間) {   // 列ごとに互い違い
          if (R() < 0.28 + 列 * 0.12) continue;               // ところどころ空き地（畑）
          const 寄 = u + (R() - 0.5) * 8;
          const x = v.x + (横道 ? 寄 : 奥), y = v.y + (横道 ? 奥 : 寄);
          if (Math.hypot(x - v.x, (y - v.y) / 0.84) > r * 0.9) continue;
          const 種 = R() < 0.16 ? "蔵" : R() < 0.22 ? "納屋" : "家";
          const 長 = 種 === "蔵" ? 10 + R() * 3 : 種 === "納屋" ? 13 + R() * 4 : 15 + R() * 6;
          const 幅 = 種 === "蔵" ? 8 + R() * 2 : 10 + R() * 3;
          // 棟は道に沿わせる
          const hw = (横道 ? 長 : 幅) / 2, hh = (横道 ? 幅 : 長) / 2;
          /* 川べりの村では、水の上にも岸の際にも家を建てない（村の円が川に掛かると、
             家が川の中に立っていた）。家の対角の半ばに、岸の砂の幅を足して空ける */
          if (水際まで(x, y, 40) < Math.hypot(hw, hh) + 5) continue;
          並.push({ x, y, hw, hh, 種 });
        }
      }
    }
  }
  家々 = 並;
  return 家々;
}
/* 家をよける（絵だけ。盤の組の居場所は動かさない）。
   遊ぶ側の申し出は「集落を抜けるとき、兵が家を突き抜けるのは変。せめて各家を
   避けるように進まないと」であった。集落の足の遅さ（field.js village 〇.七八）は
   盤が持っている。ここでは、兵一人ずつの立ち所が家の中に入ったら、いちばん
   近い壁の外へ出す。持ち場（行き先）にも、歩いた後の所にも掛けるので、兵は
   家の角を回り込み、家と家の間の道や空き地へ寄って抜けて行く。 */
const 桝 = 40;
let 家の桝 = null, 家の桝の元 = null;
function 桝を据える() {
  const 家 = 家々を据える();
  if (家の桝 && 家の桝の元 === 家) return 家の桝;
  家の桝の元 = 家; 家の桝 = new Map();
  for (const h of 家) {
    const x0 = Math.floor((h.x - h.hw - 2) / 桝), x1 = Math.floor((h.x + h.hw + 2) / 桝);
    const y0 = Math.floor((h.y - h.hh - 2) / 桝), y1 = Math.floor((h.y + h.hh + 2) / 桝);
    for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
      const k = i * 100003 + j;
      if (!家の桝.has(k)) 家の桝.set(k, []);
      家の桝.get(k).push(h);
    }
  }
  return 家の桝;
}
// 家の中なら壁の外の所 [x, y] を、外なら null を返す。余 は壁からあける隙（歩）
export function 家をよける(x, y, 余 = 0.9) {
  if (!VILLAGES.length || !里を立てるか()) return null;
  const 桝ら = 桝を据える();
  const 中 = 桝ら.get(Math.floor(x / 桝) * 100003 + Math.floor(y / 桝));
  if (!中) return null;
  for (const h of 中) {
    const dx = x - h.x, dy = y - h.y, ax = h.hw + 余, ay = h.hh + 余;
    if (Math.abs(dx) >= ax || Math.abs(dy) >= ay) continue;
    // いちばん近い壁の外へ
    if (ax - Math.abs(dx) < ay - Math.abs(dy)) return [h.x + (dx >= 0 ? ax : -ax), y];
    return [x, h.y + (dy >= 0 ? ay : -ay)];
  }
  return null;
}
if (typeof window !== "undefined") window.__家々 = () => 家々を据える();   // 撮る道具・試しが覗く口
export function 家の棟(h) {
  const x0 = h.x - h.hw, x1 = h.x + h.hw, y0 = h.y - h.hh, y1 = h.y + h.hh;
  const s = Math.min(h.hw, h.hh) * 2;
  if (h.種 === "蔵") return 棟(x0, y0, x1, y1, s * 0.75, s * 0.42, 1.0, { 腰: true, 陰: true, 屋根: 瓦 });
  if (h.種 === "納屋") return 棟(x0, y0, x1, y1, s * 0.42, s * 0.5, 1.4, { 壁: "#7C6648", 陰: true, 屋根: 板葺 });
  // 家。土壁と板の壁に、厚い茅葺の寄棟
  return 棟(x0, y0, x1, y1, s * 0.38, s * 0.5, 1.8, { 壁: "#9C8A6C", 窓: true, 陰: true, 屋根: 茅 });
}

/* ---- 葦 ---- */
let 葦原 = null, 葦の鍵 = "";
export function 葦を据える() {
  const 鍵 = MARSH.map((m) => `${Math.round(m.x)},${Math.round(m.y)},${Math.round(m.r)},${m.葦 != null ? m.葦 : ""}`).join(";");
  if (葦原 && 鍵 === 葦の鍵) return 葦原;
  葦の鍵 = 鍵;
  const 並 = [];
  for (const m of MARSH) {
    const R = 種乱(Math.round(m.x * 11 + m.y * 7));
    /* 葦 … 間引きの割（戦場の型の深田は株をまばらにし、葦の数も頭打ちにする。battle/kata.js） */
    const n = Math.min(5000, Math.round(Math.PI * m.r * m.r / 120 * (m.葦 != null ? m.葦 : 1)));
    for (let i = 0; i < n; i++) {
      const a = R() * 6.283, rr = m.r * Math.sqrt(R());
      const x = m.x + Math.cos(a) * rr, y = m.y + Math.sin(a) * rr * 0.8;
      // 株は群れて生える。群れの外はまばら
      const 群 = Math.sin(x * 0.045 + m.x) * Math.cos(y * 0.05 + m.y);
      if (群 < -0.2 && R() < 0.75) continue;
      const 丈 = 4.5 + R() * 4, 種 = R();
      if (水際まで(x, y, 10) < -1.5) continue;                 // 川に掛かる沼でも、流れの中には生やさない（水際の浅みはよい）
      if (ROADS.some((r) => r.幅 > 0 && 節までの隔たり(r.節, x, y) < r.幅 / 2)) continue;   // 沼を抜ける街道の上にも生やさない
      並.push({ x, y, 丈, 種 });
    }
  }
  葦原 = 並;
  return 葦原;
}
// 葦の株を一つ（視の筆・縦の縮みを戻した筆の中で。x は画の横、y は画の縦）
export function 葦を描く(ctx, t, x, y) {
  const h = t.丈;
  ctx.strokeStyle = t.種 < 0.5 ? "#7A8A4A" : "#8E9858"; ctx.lineWidth = 0.35;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const dx = (i - 2.5) * 0.45, 傾 = (i - 2.5) * 0.35 + (t.種 - 0.5) * 0.8;
    ctx.moveTo(x + dx, y); ctx.quadraticCurveTo(x + dx + 傾 * 0.4, y - h * 0.6, x + dx + 傾, y - h * (0.8 + (i % 3) * 0.1));
  }
  ctx.stroke();
  ctx.fillStyle = "#9C7E52";                                 // 穂
  ctx.fillRect(x + (t.種 - 0.5) * 2 - 0.3, y - h * 1.02, 0.6, h * 0.16);
}

/* ---- 並べる・描く ---- */
/* 見えている家と葦を、兵の並び（新絵の兵描き）へ入れる */
export function 里を並べる(並, 見える) {
  if (!(縦の縮み() < 1)) return;
  for (const h of 家々を据える()) if (見える(h.x, h.y)) { const b = 家の棟(h); 並.push({ wx: h.x, wy: h.y, 地y: h.y, 棟: b, 鍵: b.鍵 }); }
  for (const t of 葦を据える()) if (見える(t.x, t.y)) 並.push({ wx: t.x, wy: t.y, 地y: t.y, 葦: t });
}
/* 兵を一人ずつ描かない寄りでも、家と葦は立てて描く */
export function 里を描く(ctx, cam, W, H) {
  if (!(縦の縮み() < 1)) return;
  const { x0, x1, y0, y1 } = 見える範囲(cam, W, H, 30);
  const 中 = (x, y) => x > x0 && x < x1 && y > y0 && y < y1;
  const 並 = [];
  for (const h of 家々を据える()) if (中(h.x, h.y)) { const b = 家の棟(h); 並.push([b.鍵, b]); }
  const k = 縦の縮み();
  for (const t of 葦を据える()) if (中(t.x, t.y)) 並.push([画の縦(t.x, t.y) / k, t]);
  並.sort((a, b) => a[0] - b[0]);
  ctx.save(); 視の筆へ(ctx); ctx.scale(1, 1 / k);
  for (const [, o] of 並) {
    if (o.描) o.描(ctx, k);
    else 葦を描く(ctx, o, 画の横(o.x, o.y), 画の縦(o.x, o.y));
  }
  ctx.restore();
}
export const 里を立てるか = () => 縦の縮み() < 1 && 斜め.入;
