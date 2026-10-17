/* ==========================================================================
   森と川（GDD 8.10・8.11）── 斜めの眺めで、木を立て、川を流す

   遊ぶ側の申し出は「森や川も新しいマップに従ってリアルにできないか」であった。

   森の描き方は二つの案を持つ（naname.js 斜め.森）。
     塊 … 梢を一つの塊として持ち上げる（地の焼きの側で済む。ここでは何もしない）
     木 … 木を一本ずつ立てる。兵と同じく奥から手前へ重ね、隊は木の陰に隠れる
   川は、川床を掘り下げて岸を立てる（地の焼きの側）。ここでは水面の流れを
   毎コマ描く。流れの筋が下手へ動けば、どちらが上手か、浅いか深いかが目に入る。

   絵だけのものである。当たり（森の視界・川の足止め）には触れない。
   ========================================================================== */
import { FORESTS, WOODS } from "./field.js";
import { 揚げ, 画の横, 画の縦, 斜め, 見える範囲, 視の筆へ, 縦の縮み } from "./naname.js";
import { 野の川筋 } from "./shinga.js";

/* ---- 川の流れ ---- */
export function 川の流れを描く(ctx, 秒, 尺) {
  const 川ら = 野の川筋();
  if (!川ら.length) return;
  ctx.save();
  ctx.lineCap = "round";
  for (const r of 川ら) {
    const 節 = r.節;
    if (!節 || 節.length < 2) continue;
    const w = r.幅;
    for (const [横, 濃, 速] of [[-0.34, 0.12, 0.8], [-0.17, 0.16, 1.0], [0.0, 0.18, 1.2], [0.15, 0.15, 1.05], [0.32, 0.11, 0.85]]) {
      ctx.beginPath();
      for (let i = 0; i < 節.length; i++) {
        const [x, y] = 節[i];
        const [x2, y2] = 節[Math.min(節.length - 1, i + 1)], [x0, y0] = 節[Math.max(0, i - 1)];
        const dx = x2 - x0, dy = y2 - y0, L = Math.hypot(dx, dy) || 1;
        const px = x - dy / L * w * 横, py = y + dx / L * w * 横;
        const [ex, ey] = 揚げ(px, py);
        if (i) ctx.lineTo(px + ex, py + ey); else ctx.moveTo(px + ex, py + ey);
      }
      ctx.strokeStyle = `rgba(236,246,255,${濃})`;
      ctx.lineWidth = Math.max(0.4, w * 0.022);
      // 筋は短く、線ごとに長さと間をずらす（同じ型の繰り返しに見せない）
      ctx.setLineDash([w * (0.16 + Math.abs(横) * 0.3), w * (0.55 + 横 * 0.4 + 0.4), w * 0.08, w * 0.7]);
      ctx.lineDashOffset = -秒 * w * 0.9 * 速 * (尺 || 1) * 0.25;
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
}

/* ---- 木立 ---- */
let 木立 = null, 木立の鍵 = "";
function 種乱(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// 川の上には木を立てない
function 川の上か(川ら, x, y) {
  for (const r of 川ら) {
    const 節 = r.節, w = r.幅 * 0.75;
    for (let i = 1; i < 節.length; i++) {
      const [ax, ay] = 節[i - 1], [bx, by] = 節[i];
      const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / L2));
      if (Math.hypot(x - ax - vx * t, y - ay - vy * t) < w) return true;
    }
  }
  return false;
}
export function 木立を据える() {
  const 鍵 = [...FORESTS, ...WOODS].map((f) => `${Math.round(f.x)},${Math.round(f.y)},${Math.round(f.r)}`).join(";");
  if (木立 && 鍵 === 木立の鍵) return 木立;
  木立の鍵 = 鍵;
  const 川ら = 野の川筋();
  const 並 = [];
  for (const f of [...FORESTS, ...WOODS]) {
    const 濃 = FORESTS.includes(f);
    const 間 = 濃 ? 9 : 15;
    const n = Math.min(9000, Math.round(Math.PI * f.r * f.r / (間 * 間)));
    const R = 種乱(Math.round(f.x * 7 + f.y * 13 + f.r));
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, rr = f.r * Math.sqrt(R()) * 1.02;
      const x = f.x + Math.cos(a) * rr, y = f.y + Math.sin(a) * rr * 0.92;
      // 縁はまばらに
      if (rr > f.r * 0.82 && R() < 0.5) continue;
      if (川の上か(川ら, x, y)) continue;
      const 種 = 濃 ? (R() < 0.55 ? 0 : R() < 0.5 ? 1 : 2) : (R() < 0.7 ? 2 : 1);
      並.push({ x, y, 丈: (濃 ? 13 : 10) * (0.75 + R() * 0.55), 種 });
    }
  }
  木立 = 並;
  return 木立;
}

/* 木の型紙。〇 杉（細い円錐を重ねる）、一 松（横に張る）、二 広葉（丸い梢） */
let 型紙 = null;
function 木の型紙() {
  if (型紙 || typeof document === "undefined") return 型紙;
  const 作る = (描く) => { const c = document.createElement("canvas"); c.width = 48; c.height = 96; const g = c.getContext("2d"); if (!g || !g.beginPath) return null; 描く(g); return c; };
  const 幹 = (g, h) => { g.fillStyle = "#5A4532"; g.fillRect(22, 96 - h, 4, h); };
  型紙 = [
    作る((g) => { 幹(g, 26);
      for (let i = 0; i < 4; i++) { const y = 74 - i * 17, w = 22 - i * 4.5;
        g.fillStyle = i % 2 ? "#3F6233" : "#36572C"; g.beginPath(); g.moveTo(24, y - 26); g.lineTo(24 + w, y); g.lineTo(24 - w, y); g.closePath(); g.fill();
        g.fillStyle = "rgba(140,180,100,0.35)"; g.beginPath(); g.moveTo(24, y - 26); g.lineTo(24 - w * 0.2, y - 4); g.lineTo(24 - w, y); g.closePath(); g.fill(); } }),
    作る((g) => { 幹(g, 40);
      for (const [x, y, rx, ry, c] of [[16, 54, 14, 7, "#466B3A"], [32, 44, 15, 7, "#3E6134"], [22, 32, 13, 6, "#4D7540"], [30, 22, 9, 5, "#56804A"]]) {
        g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); } }),
    作る((g) => { 幹(g, 30);
      for (const [x, y, r, c] of [[16, 56, 13, "#4E7A3E"], [32, 54, 13, "#466F38"], [24, 42, 15, "#5B8848"], [20, 30, 11, "#679653"], [30, 32, 10, "#5E8C4C"]]) {
        g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
      g.fillStyle = "rgba(190,220,140,0.30)"; g.beginPath(); g.arc(20, 30, 6, 0, 7); g.fill(); }),
  ];
  if (型紙.some((c) => !c)) 型紙 = null;
  return 型紙;
}

/* 一本描く（視の筆・縦の縮みを戻した筆の中で。x は画の横、y は画の縦） */
export function 木を描く(ctx, t, x, y) {
  const 紙 = 木の型紙(); if (!紙) return;
  const c = 紙[t.種]; if (!c) return;
  const h = t.丈, w = h * 0.5;
  ctx.fillStyle = "rgba(30,34,20,0.22)";                       // 足元の影
  ctx.beginPath(); ctx.ellipse(x + w * 0.15, y, w * 0.45, w * 0.16, 0, 0, 7); ctx.fill();
  ctx.drawImage(c, x - w / 2, y - h, w, h);
}

/* 見えている木を、兵の並びへ入れる（新絵の兵描き から）。見える(x,y) は盤の所の判定 */
export function 木立を並べる(並, 見える) {
  if (斜め.森 !== "木") return;
  const 木ら = 木立を据える();
  for (const t of 木ら) if (見える(t.x, t.y)) 並.push({ wx: t.x, wy: t.y, 地y: t.y, 木: t });
}

/* 兵を一人ずつ描かない寄り（引いた眺め）でも、木は立てて描く */
export function 立木を描く(ctx, cam, W, H) {
  if (斜め.森 !== "木") return;
  const 木ら = 木立を据える();
  const { x0, x1, y0, y1 } = 見える範囲(cam, W, H, 30);
  const 並 = [];
  for (const t of 木ら) if (t.x > x0 && t.x < x1 && t.y > y0 && t.y < y1) 並.push([画の縦(t.x, t.y), 画の横(t.x, t.y), t]);
  並.sort((a, b) => a[0] - b[0]);
  ctx.save(); 視の筆へ(ctx); ctx.scale(1, 1 / 縦の縮み());
  for (const [y, x, t] of 並) 木を描く(ctx, t, x, y);
  ctx.restore();
}
