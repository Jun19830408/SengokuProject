/* ==========================================================================
   背中越しの矢玉（鉄砲の火と弾の筋・煙・矢・騎馬の砂煙）。hitori/senaka.js 背中を描く から呼ぶ

   遊ぶ人の申し出：「鉄砲や弓、騎馬の突撃などもこの視点で見たい」。盤は、放った矢玉を印（battle/engine.js
   放った跡。b.fx の shot・煙・arrow、騎馬の突撃の dust）として出し、盤の刻で消してゆく。背中越しは盤を微速で
   進めるので、盤の刻のままでは弾も矢もゆっくりと漂って見える。そこで、放ったのを見たときから、実の秒で描く。

   放ったことの見つけ方は二つ。
     一、与平のまわりに兵の見えている組（眺めを集める の兵）は、組の見た目の撃刻（battle/shinga.js。組が
         放つと盤の刻が入る）の変わり目で見つけ、見えている兵の立ち所から放つ。盤の印（b.fx）は盤じゅうで
         百八十までしか積まない（engine.js 放った跡）ので、関ヶ原のような大きな合戦では、与平のすぐ前の
         一斉射でも印が落ちることがある（測ると、黒田勢の鉄砲十二組が二十秒に放った六度のうち、印が出たのは
         三度）。兵の立ち所から放てば、火と煙が鉄砲足軽の筒先に、矢が弓足軽の手もとに出る。
         敵の組も同じに見つける（盤は、見えていない敵の組の印を出さない）。
     二、兵の見えていない遠くの組は、これまでどおり盤の印から描く（印の落ちる遠くは、もともと小さい）。

     筒先の火 … 〇.一二秒の黄白の閃き。鉄砲組は前の二列（二十人）が、〇.三五秒のうちにばらばらと放つ
     弾の筋   … 秒速三百五十mで的へ。細く明るい筋（長さ三m）。二人に一筋
     煙       … 一人に一つ、筒先に白い煙の塊（はじめ〇.六五〜一m。五〜七秒で二.七倍に広がり、薄れながら
                 昇り、撃った向きへゆっくり流れる）。重なって一斉射の白い帯になる
     矢       … 弓組は前の三列（三十人）が、〇.四秒のうちに放つ。射手から的のあたりへ弧を描いて（高さは
                 隔たりの〇.一八倍、三〜二十二m）秒速四十二mで飛ぶ。落ちた矢は二秒地に立つ
     砂煙     … 騎馬の突撃のうしろに、土の色の煙（一.二秒）。盤の印から

   盤の理（当たり・損害）には触れない。描くだけである。止めているあいだ（停止）は、実の秒も止める。
   環 … senaka.js が渡す写しの道具 { P, 奥, 霞, C, F }。尺 … 盤の一歩の m。兵ら … 眺めを集める の兵
   ========================================================================== */
import { 組の見た目 } from "../battle/shinga.js";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, u) => a + (b - a) * u;

/* 印を見たときに、実の秒で描く物を生む。態.矢玉 に控える */
export function 矢玉を集める(b, 態, 物, 環, 尺, nowSec, 止, 兵ら = null) {
  const 矢玉 = 態.矢玉 || (態.矢玉 = { 見た: new WeakSet(), 撃: new WeakMap(), 物ら: [], 時: 0, 前: null });
  const dt = 矢玉.前 == null ? 0 : clamp(nowSec - 矢玉.前, 0, 0.1); 矢玉.前 = nowSec;
  if (!止) 矢玉.時 += dt;
  const 時 = 矢玉.時, C = 環.C;
  const 世 = (x, y) => [x * 尺, -y * 尺];
  /* 一、兵の見えている鉄砲組・弓組の一斉射（撃刻の変わり目）。はじめて見た組は、いまの撃刻を覚えるだけ */
  const 組の兵 = new Map();
  if (兵ら) for (const p of 兵ら) {
    if (!p.組 || p.番 >= 100 || (p.型 !== "teppo" && p.型 !== "yumi")) continue;
    let a = 組の兵.get(p.組); if (!a) 組の兵.set(p.組, (a = [])); a.push(p);
  }
  for (const [q, ら] of 組の兵) {
    const s = 組の見た目(q); if (!s) continue;
    const 前 = 矢玉.撃.get(q); 矢玉.撃.set(q, s.撃刻);
    if (前 === undefined || !(s.撃刻 > 前) || 止) continue;
    一斉射(矢玉, q, ら, b, 尺, 時);
  }
  /* 二、兵の見えていない組は、盤の印から */
  for (const f of b.fx || []) {
    if (矢玉.見た.has(f)) continue;
    矢玉.見た.add(f);
    if (f.射手 && 組の兵.has(f.射手)) continue;          // 一で描いた（二重に描かない）
    const [x, z] = 世(f.x, f.y);
    if (Math.hypot(x - C.x, z - C.z) > 320) continue;
    const 乱 = f.乱 != null ? f.乱 : 0.5;
    if (f.k === "shot") {
      const [x2, z2] = 世(f.x2, f.y2), L = Math.hypot(x2 - x, z2 - z) || 1, ux = (x2 - x) / L, uz = (z2 - z) / L, 横x = -uz, 横z = ux;
      for (let i = 0; i < 5; i++) {
        const r = (乱 * (13 + i * 7)) % 1, 横 = (i - 2) * 1.6 + (r - 0.5) * 1.2, 遅 = r * 0.16;
        const 元 = [x + ux * 2.2 + 横x * 横, 1.45, z + uz * 2.2 + 横z * 横], 先 = [x2 + 横x * 横 * 0.6, 1.2, z2 + 横z * 横 * 0.6];
        矢玉.物ら.push({ 種: "火", 元, u: [ux, 0, uz], 始: 時 + 遅, 長: 0.08 });
        矢玉.物ら.push({ 種: "弾", 元, 先, 始: 時 + 遅, 長: Math.hypot(先[0] - 元[0], 先[2] - 元[2]) / 350 + 0.02 });
      }
    } else if (f.k === "煙") {
      const v = Math.hypot(f.vx || 0, f.vy || 0) || 1;
      矢玉.物ら.push({ 種: "煙", x, z, vx: ((f.vx || 0) / v) * 0.35, vz: (-(f.vy || 0) / v) * 0.35, r0: (f.r0 || 2) * 尺 * 1.1, 始: 時 + 乱 * 0.12, 長: 3.0 + 乱 * 1.2, 乱 });
    } else if (f.k === "arrow") {
      const [x2, z2] = 世(f.x2, f.y2), L = Math.hypot(x2 - x, z2 - z) || 1, ux = (x2 - x) / L, uz = (z2 - z) / L, 横x = -uz, 横z = ux;
      const 高 = clamp(L * 0.15, 3, 20), 秒 = clamp(L / 45, 0.5, 2.6);
      for (let i = 0; i < 7; i++) {
        const r = (乱 * (11 + i * 5)) % 1, 横 = (i - 3) * 1.3 + (r - 0.5) * 1.4, 遅 = r * 0.3, 落 = (r - 0.5) * 6;
        矢玉.物ら.push({ 種: "矢", 元: [x + 横x * 横, 1.55, z + 横z * 横], 先: [x2 + 横x * 横 * 1.4 + ux * 落, 0.15, z2 + 横z * 横 * 1.4 + uz * 落],
          高: 高 * (0.9 + r * 0.2), 始: 時 + 遅, 長: 秒 * (0.95 + r * 0.1), 立: 1.2 });
      }
    } else if (f.k === "dust") {
      矢玉.物ら.push({ 種: "砂", x, z, r0: 1.1 + 乱 * 1.2, 始: 時, 長: 1.2, 乱 });
    }
  }
  /* 消えた物を除き、描く物を奥行きと共に積む */
  矢玉.物ら = 矢玉.物ら.filter((o) => 時 < o.始 + o.長 + (o.立 || 0));
  for (const o of 矢玉.物ら) {
    const a = 時 - o.始; if (a < 0) continue;
    const 所 = 今の所(o, a); if (!所) continue;
    const d = 環.奥(所[0], 所[2]); if (d < 0.8) continue;
    物.push({ d, f: () => 描く(環.ctx, o, a, 所, d, 環) });
  }
}

/* 見えている組の一斉射。兵の立ち所（世界）から、狙った敵（q.aim。三秒より古ければ兵の向きの六十m先）へ放つ。
   ばらつきは兵ごとの鍵で決める（同じ兵はいつも同じ癖） */
function 一斉射(矢玉, q, ら, b, 尺, 時) {
  const 狙 = q.aim && b.t - q.aim.t < 3 ? [q.aim.x * 尺, -q.aim.y * 尺] : null, 鉄 = q.type === "teppo";
  for (const p of ら) {
    if (p.番 >= (鉄 ? 20 : 30)) continue;
    const r = ((p.鍵 >>> 5) % 1000) / 1000, r2 = ((p.鍵 >>> 15) % 1000) / 1000, 丈 = p.丈 || 1;
    let ux = p.fx, uz = p.fz, L = 60;
    if (狙) { const dx = 狙[0] - p.x, dz = 狙[1] - p.z; L = Math.hypot(dx, dz) || 1; ux = dx / L; uz = dz / L; }
    const 横x = -uz, 横z = ux;
    if (鉄) {
      const 遅 = r * 0.35, 元 = [p.x + ux * 1.25 * 丈, 1.42 * 丈, p.z + uz * 1.25 * 丈];
      const 散 = (r2 - 0.5) * 8, 奥 = (r - 0.5) * 6;
      const 先 = [p.x + ux * (L + 奥) + 横x * 散, 0.9 + r2 * 0.8, p.z + uz * (L + 奥) + 横z * 散];
      矢玉.物ら.push({ 種: "火", 元, u: [ux, 0, uz], 始: 時 + 遅, 長: 0.12 });
      if (p.番 % 2 === 0) 矢玉.物ら.push({ 種: "弾", 元, 先, 始: 時 + 遅, 長: Math.hypot(先[0] - 元[0], 先[2] - 元[2]) / 350 + 0.02 });
      矢玉.物ら.push({ 種: "煙", x: 元[0] + ux * 0.6, z: 元[2] + uz * 0.6, y0: 元[1], 昇: 0.16, vx: ux * 0.4 + (r2 - 0.5) * 0.25, vz: uz * 0.4 + (r - 0.5) * 0.25,
        r0: 0.65 + r2 * 0.35, 広: 1.7, 始: 時 + 遅, 長: 5 + r * 2.5, 乱: r });
    } else {
      const 遅 = r * 0.4, 元 = [p.x + ux * 0.4, 1.5 * 丈, p.z + uz * 0.4];
      const 散 = (r2 - 0.5) * 12, 奥 = (r - 0.5) * 10;
      const 先 = [p.x + ux * (L + 奥) + 横x * 散, 0.15, p.z + uz * (L + 奥) + 横z * 散], LL = Math.hypot(先[0] - 元[0], 先[2] - 元[2]);
      矢玉.物ら.push({ 種: "矢", 元, 先, 高: clamp(LL * 0.18, 3, 22) * (0.9 + r2 * 0.2), 始: 時 + 遅, 長: clamp(LL / 42, 0.6, 2.8) * (0.95 + r * 0.1), 立: 2.0 });
    }
  }
}

/* 物の今の所（世界）。矢は弧の上 */
function 今の所(o, a) {
  if (o.種 === "火") return o.元;
  if (o.種 === "弾") { const u = clamp(a / o.長, 0, 1); return [lerp(o.元[0], o.先[0], u), lerp(o.元[1], o.先[1], u), lerp(o.元[2], o.先[2], u)]; }
  if (o.種 === "煙") return [o.x + o.vx * a, (o.y0 != null ? o.y0 : 1.5) + (o.昇 != null ? o.昇 : 0.32) * a, o.z + o.vz * a];
  if (o.種 === "砂") return [o.x, 0.5 + 0.25 * a, o.z];
  if (o.種 === "矢") { const u = clamp(a / o.長, 0, 1); return 矢の所(o, u); }
  return null;
}
const 矢の所 = (o, u) => [lerp(o.元[0], o.先[0], u), lerp(o.元[1], o.先[1], u) + 4 * o.高 * u * (1 - u), lerp(o.元[2], o.先[2], u)];

/* 柔らかい塊の絵（中ほどが濃く、縁へ消える）。色ごとに一度だけ作る。画布の無い所（試験）では作らず、濃淡で描く */
const 塊の絵ら = new Map();
function 塊の絵(rgb) {
  const 鍵 = rgb.join(","); if (塊の絵ら.has(鍵)) return 塊の絵ら.get(鍵);
  let 絵 = null;
  if (typeof document !== "undefined" && document.createElement) {
    絵 = document.createElement("canvas"); 絵.width = 絵.height = 64;
    const c = 絵.getContext("2d"), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${鍵},1)`); g.addColorStop(0.45, `rgba(${鍵},0.75)`); g.addColorStop(1, `rgba(${鍵},0)`);
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  }
  塊の絵ら.set(鍵, 絵); return 絵;
}

function 描く(ctx, o, a, 所, d, 環) {
  const { P, F } = 環;
  const S = P(...所); if (S[2] < 0.5) return;
  const px = (m) => (m * F) / S[2];
  ctx.save();
  if (o.種 === "火") {
    const k = 1 - a / o.長, r = Math.max(1.8, px(0.42));
    ctx.globalAlpha = clamp(k, 0, 1);
    ctx.fillStyle = "rgb(255,236,170)"; ctx.beginPath(); ctx.arc(S[0], S[1], r, 0, 7); ctx.fill();
    ctx.fillStyle = "rgb(255,252,236)"; ctx.beginPath(); ctx.arc(S[0], S[1], r * 0.5, 0, 7); ctx.fill();
    const E = P(所[0] + o.u[0] * 0.9, 所[1], 所[2] + o.u[2] * 0.9);
    if (E[2] > 0.5) { ctx.strokeStyle = "rgb(255,226,150)"; ctx.lineWidth = Math.max(1, r * 0.5); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(E[0], E[1]); ctx.stroke(); }
  } else if (o.種 === "弾") {
    const L = Math.hypot(o.先[0] - o.元[0], o.先[2] - o.元[2]) || 1, u = clamp(a / o.長 - 3 / L, 0, 1);
    const 尾 = [lerp(o.元[0], o.先[0], u), lerp(o.元[1], o.先[1], u), lerp(o.元[2], o.先[2], u)], T = P(...尾);
    if (T[2] > 0.5) { ctx.globalAlpha = 0.75; ctx.strokeStyle = "rgb(255,238,190)"; ctx.lineWidth = Math.max(0.8, px(0.03)); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(T[0], T[1]); ctx.lineTo(S[0], S[1]); ctx.stroke(); }
  } else if (o.種 === "煙" || o.種 === "砂") {
    /* 縁のぼけた柔らかい塊を二つ重ねる（平たい円を重ねると、白い円盤が兵に被さって見えた）。写しのすぐ前（四m
       より手前）の煙は薄くして、画を塞がない。塊の絵は色ごとに一度だけ作って使い回す（一斉射のたびに二十の塊が
       出るので、塊ごとに濃淡を作り直すと重い） */
    const 煙 = o.種 === "煙", k = a / o.長, r = px(o.r0 * (1 + (o.広 != null ? o.広 : 煙 ? 0.75 : 1.1) * k));
    const al = (煙 ? 0.55 : 0.36) * Math.pow(1 - clamp(k, 0, 1), 1.3) * clamp(a / 0.12, 0, 1) * clamp((d - 1.5) / 2.5, 0, 1);
    if (r >= 0.8 && al > 0.01) {
      const 基 = 煙 ? [238, 238, 232] : [158, 138, 104], 絵 = 塊の絵(基);
      for (let i = 0; i < 2; i++) {
        const 角 = (o.乱 * 7 + i * 2.9) % 6.3, 寄 = r * 0.28, cx = S[0] + Math.cos(角) * 寄, cy = S[1] + Math.sin(角) * 寄 * 0.55, rr = r * (0.85 + 0.2 * i);
        if (絵) { ctx.globalAlpha = al; ctx.drawImage(絵, cx - rr, cy - rr, rr * 2, rr * 2); continue; }
        const 色 = 環.霞(基, d, 120), 色a = (α) => 色.replace("rgb(", "rgba(").replace(")", `,${α.toFixed(3)})`);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
        g.addColorStop(0, 色a(al)); g.addColorStop(0.45, 色a(al * 0.75)); g.addColorStop(1, 色a(0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.fill();
      }
    }
  } else if (o.種 === "矢") {
    const 飛ぶ = a < o.長, u = clamp(a / o.長, 0, 1), du = 0.02;
    const 前 = 矢の所(o, Math.max(0, u - du)), 後 = 矢の所(o, Math.min(1, u + du));
    let tx = 後[0] - 前[0], ty = 後[1] - 前[1], tz = 後[2] - 前[2]; const tL = Math.hypot(tx, ty, tz) || 1; tx /= tL; ty /= tL; tz /= tL;
    const 長 = 0.9, 頭 = 飛ぶ ? 所 : [所[0], 0.15, 所[2]], 尻 = [頭[0] - tx * 長, 頭[1] - ty * 長 + (飛ぶ ? 0 : 0.0), 頭[2] - tz * 長];
    const A = P(...頭), B = P(...尻); if (A[2] < 0.5 || B[2] < 0.5) { ctx.restore(); return; }
    ctx.globalAlpha = 飛ぶ ? 1 : clamp(1 - (a - o.長) / (o.立 || 1), 0, 1);
    ctx.strokeStyle = 環.霞([58, 46, 34], d, 120); ctx.lineWidth = Math.max(0.8, px(0.025)); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
    ctx.strokeStyle = 環.霞([236, 232, 220], d, 120); ctx.lineWidth = Math.max(0.8, px(0.05));     // 矢羽
    const 羽 = P(尻[0] + tx * 0.18, 尻[1] + ty * 0.18, 尻[2] + tz * 0.18); if (羽[2] > 0.5) { ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(羽[0], 羽[1]); ctx.stroke(); }
  }
  ctx.restore();
}
