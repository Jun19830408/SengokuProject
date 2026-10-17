/* ==========================================================================
   城に立つもの（GDD 8.10・9.3）── 斜めの眺めで、櫓・門・塀・御殿・蔵を立てて描く

   遊ぶ側の申し出は「城も五十五度の角度からにできないか。堀や壁、城門が
   リアルになると思う」であった。

   真上から描いた城は、石垣も櫓も門も平らな四角で、屋根の形で建物と分かる
   だけである。斜めから見下ろすと、建物には正面の壁と屋根の流れが見える。
   曲輪の段と堀は地の高さとして焼いてある（shinga.js 城の地を焼く）ので、
   ここでは、その上に立つものを一つずつ箱と屋根で描く。

   描き方は斜めの眺めと同じ写し方による。盤の所（x, y）と高さ h は、
     画の横 = 視の横、画の縦 = 視の縦 × 縮 − （地の持ち上げ ＋ h）
   で画面に写る。真上からの写しを傾けただけなので、見えるのは上の面と
   手前を向いた面だけである（横の面は見えない）。それで足りる。

   絵だけのものである。当たり（壁・門・施設の居場所と強さ）には触れない。
   ========================================================================== */
import { axisOf, fromUV, gatePos } from "./castleMap.js";
import { 視, 浮き, 縦の縮み, 視の筆へ } from "./naname.js";

// 光は左上から。屋根の面ごとの色（奥・左・右・手前）
const 瓦 = { 奥: "#8A919C", 左: "#7B838F", 右: "#525A66", 前: "#646C78", 縁: "rgba(36,38,44,0.55)" };
const 板葺 = { 奥: "#A89272", 左: "#9A8462", 右: "#6E5D44", 前: "#806C50", 縁: "rgba(52,42,30,0.55)" };
const 白壁 = "#ECE6D6", 白壁陰 = "#D4CCB8", 腰板 = "#4A4239";

/* 盤の矩形を、回した眺めの矩形（視の所）へ。九十度ずつなので矩形のままである */
function 視の矩(x0, y0, x1, y1) {
  const [a0, b0] = 視(x0, y0), [a1, b1] = 視(x1, y1);
  return { x0: Math.min(a0, a1), x1: Math.max(a0, a1), y0: Math.min(b0, b1), y1: Math.max(b0, b1) };
}
// 足元の地の高さ。段の際に建つものは、低いほうへ沈まぬよう五か所の高いほうを取る
function 足元(x0, y0, x1, y1) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return Math.max(浮き(cx, cy), 浮き(x0 + (x1 - x0) * 0.2, cy), 浮き(x0 + (x1 - x0) * 0.8, cy),
    浮き(cx, y0 + (y1 - y0) * 0.2), 浮き(cx, y0 + (y1 - y0) * 0.8));
}

/* 箱。上の面と手前の面を塗る。v は視の矩、L は足元の持ち上げ、H は丈 */
function 箱(ctx, k, v, L, H, 前色, 上色, 飾り) {
  const yb = v.y1 * k - L, yt = v.y1 * k - L - H;       // 手前の面の下と上
  ctx.fillStyle = 前色;
  ctx.fillRect(v.x0, yt, v.x1 - v.x0, yb - yt);
  if (飾り) 飾り(v.x0, yt, v.x1 - v.x0, yb - yt);
  if (上色) {
    ctx.fillStyle = 上色;
    ctx.fillRect(v.x0, v.y0 * k - L - H, v.x1 - v.x0, (v.y1 - v.y0) * k);
  }
  ctx.strokeStyle = "rgba(60,54,44,0.45)"; ctx.lineWidth = 0.6;
  ctx.strokeRect(v.x0, yt, v.x1 - v.x0, yb - yt);
}

/* 寄棟の屋根。軒は e だけ張り出し、棟の高さは R。棟は長い向きに通す */
function 屋根(ctx, k, v, L, R, e, 色) {
  const P = (x, y, h) => [x, y * k - L - h];
  const x0 = v.x0 - e, x1 = v.x1 + e, y0 = v.y0 - e, y1 = v.y1 + e;
  const 横長 = (x1 - x0) >= (y1 - y0);
  const 入 = (横長 ? (y1 - y0) : (x1 - x0)) / 2;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const r0 = 横長 ? [x0 + 入, cy] : [cx, y0 + 入], r1 = 横長 ? [x1 - 入, cy] : [cx, y1 - 入];
  const 面 = (pts, c) => {
    ctx.fillStyle = c; ctx.beginPath();
    pts.forEach(([x, y, h], i) => { const [a, b] = P(x, y, h); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); });
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 色.縁; ctx.lineWidth = 0.5; ctx.stroke();
  };
  const A = [x0, y0, 0], B = [x1, y0, 0], C = [x1, y1, 0], D = [x0, y1, 0];
  const S = [r0[0], r0[1], R], T = [r1[0], r1[1], R];
  // 棟（S は奥か左の端、T は手前か右の端）。奥・左・右・手前の順に重ねる
  if (横長) {
    面([A, B, T, S], 色.奥); 面([A, S, D], 色.左); 面([B, C, T], 色.右); 面([D, C, T, S], 色.前);
  } else {
    面([A, B, S], 色.奥); 面([A, S, T, D], 色.左); 面([B, C, T, S], 色.右); 面([D, C, T], 色.前);
  }
  // 大棟の照り
  const [a, b] = P(S[0], S[1], R), [c, d] = P(T[0], T[1], R);
  ctx.strokeStyle = "rgba(235,232,222,0.55)"; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
}

/* 一棟。足元を測り、白壁（または板）の箱に屋根を載せる。並べる鍵（視の縦）も返す */
function 棟(x0, y0, x1, y1, 丈, 屋丈, 軒, 種) {
  const v = 視の矩(x0, y0, x1, y1);
  return { 鍵: v.y1, 描: (ctx, k) => {
    const L = 足元(x0, y0, x1, y1);
    const 壁 = 種.壁 || 白壁;
    箱(ctx, k, v, L, 丈, 壁, null, (x, y, w, h) => {
      if (種.腰) { ctx.fillStyle = 腰板; ctx.fillRect(x, y + h * 0.62, w, h * 0.38); }
      if (種.窓) {
        ctx.fillStyle = "rgba(40,36,30,0.78)";
        const n = Math.max(2, Math.round(w / 7));
        for (let i = 0; i < n; i++) ctx.fillRect(x + (i + 0.35) * w / n, y + h * 0.22, Math.min(2.2, w / n * 0.4), h * 0.22);
      }
      if (種.扉) {
        ctx.fillStyle = 種.扉; ctx.fillRect(x + w * 0.18, y + h * 0.18, w * 0.64, h * 0.82);
        ctx.strokeStyle = "rgba(20,14,8,0.8)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(x + w / 2, y + h * 0.18); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
        ctx.fillStyle = "rgba(226,214,182,0.6)";
        for (let i = 1; i < 4; i++) for (const s of [0.32, 0.68]) ctx.fillRect(x + w * (0.18 + 0.64 * s) - 0.5, y + h * (0.18 + i * 0.2), 1, 1);
      }
      if (種.陰) { ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(x + w * 0.55, y, w * 0.45, h); }
    });
    if (屋丈 > 0) 屋根(ctx, k, v, L + 丈, 屋丈, 軒, 種.屋根 || 瓦);
  } };
}

/* 塀。石垣の天端の外寄りに、白い壁と瓦の笠を通す */
function 塀(x0, y0, x1, y1, 丈) {
  const v = 視の矩(x0, y0, x1, y1);
  return { 鍵: v.y1 - 0.01, 描: (ctx, k) => {
    const L = 足元(x0, y0, x1, y1);
    箱(ctx, k, v, L, 丈, 白壁, null, (x, y, w, h) => {
      ctx.fillStyle = "rgba(52,46,40,0.62)"; ctx.fillRect(x, y + h * 0.66, w, h * 0.34);   // 下見板
      ctx.fillStyle = "rgba(40,36,30,0.7)";                                             // 狭間
      for (let u = x + 4; u < x + w - 2; u += 9) ctx.fillRect(u, y + h * 0.3, 1.4, h * 0.2);
    });
    // 瓦の笠。少し張り出す
    ctx.fillStyle = "#4E5662";
    ctx.fillRect(v.x0 - 0.8, v.y0 * k - L - 丈 - 1.6, v.x1 - v.x0 + 1.6, (v.y1 - v.y0) * k + 3.0);
    ctx.fillStyle = "rgba(220,224,230,0.35)";                                       // 笠の照り
    ctx.fillRect(v.x0 - 0.8, v.y0 * k - L - 丈 - 1.6, v.x1 - v.x0 + 1.6, 0.8);
  } };
}

/* 天守の置き場。本丸の奥寄り（御殿の北、蔵と井戸のあいだ）。真上の絵と同じ所 */
export function 天守の置き場(m) {
  if (!m || !m.天守 || !m.layers || !m.layers.length) return null;
  const l = m.layers[m.layers.length - 1];
  const lx = m.cx + (l.ox || 0), ly = m.cy + (l.oy || 0);
  const 半 = Math.min(l.hw, l.hh) * 0.26;
  return { x: lx + l.hw * 0.02, y: ly - l.hh * 0.55, 半, 重: Math.max(1, Math.min(5, m.天守.重 || 3)) };
}

/* 天守。石の天守台に、重ごとに一回りずつ小さな白壁を積み、重ごとに庇の屋根を
   回す。最上重は棟の高い寄棟（入母屋の代わり）で葺く。 */
function 天守(p) {
  const v台 = 視の矩(p.x - p.半, p.y - p.半, p.x + p.半, p.y + p.半);
  return { 鍵: v台.y1 + 0.02, 描: (ctx, k) => {
    const L0 = 足元(p.x - p.半, p.y - p.半, p.x + p.半, p.y + p.半);
    const 台丈 = p.半 * 0.42;
    箱(ctx, k, v台, L0, 台丈, "#A39C8C", null, (x, y, w, h) => {      // 天守台の石垣
      ctx.strokeStyle = "rgba(80,76,66,0.45)"; ctx.lineWidth = 0.5;
      for (let u = 3; u < h; u += 3) { ctx.beginPath(); ctx.moveTo(x, y + u); ctx.lineTo(x + w, y + u); ctx.stroke(); }
    });
    let L = L0 + 台丈, 半 = p.半 * 0.94;
    const 重丈 = p.半 * (p.重 >= 4 ? 0.36 : 0.44);
    for (let i = 0; i < p.重; i++) {
      const 上 = i === p.重 - 1;
      const v = 視の矩(p.x - 半, p.y - 半, p.x + 半, p.y + 半);
      箱(ctx, k, v, L, 重丈, 白壁, null, (x, y, w, h) => {
        ctx.fillStyle = "rgba(40,36,30,0.78)";                    // 窓
        const n = Math.max(2, Math.round(w / 8));
        for (let j = 0; j < n; j++) ctx.fillRect(x + (j + 0.35) * w / n, y + h * 0.3, Math.min(2.4, w / n * 0.4), h * 0.3);
        if (i === 0) { ctx.fillStyle = 腰板; ctx.fillRect(x, y + h * 0.72, w, h * 0.28); }
        ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(x + w * 0.55, y, w * 0.45, h);
      });
      L += 重丈;
      屋根(ctx, k, v, L, 上 ? 半 * 0.75 : 半 * 0.3, 半 * (上 ? 0.2 : 0.16), 瓦);   // 軒は深く張り出す
      // 最上重の大棟に鯱
      if (上) {
        const cx = (v.x0 + v.x1) / 2, yy = ((v.y0 + v.y1) / 2) * k - L - 半 * 0.75;
        ctx.fillStyle = "#C9A64A";
        const 横 = (v.x1 - v.x0) >= (v.y1 - v.y0) * k ? (v.x1 - v.x0) / 2 - 半 * 0.4 : 0;
        for (const d of 横 ? [-横, 横] : [0]) ctx.fillRect(cx + d - 0.8, yy - 2.2, 1.6, 2.4);
      }
      半 *= 0.8;
    }
  } };
}

/* 城の立つものを集めて、奥から手前へ描く。drawBattle の世界の筆の中で呼ぶ */
export function 城を立てて描く(ctx, m) {
  if (!m) return;
  const k = 縦の縮み();
  const t = m.t, cx = m.cx, cy = m.cy;
  const 物 = [];
  /* 塀。曲輪ごとに、門の口を抜いて四方へ回す */
  m.layers.forEach((l) => {
    const lx = cx + (l.ox || 0), ly = cy + (l.oy || 0);
    const x0 = lx - l.hw - t, x1 = lx + l.hw + t, y0 = ly - l.hh - t, y1 = ly + l.hh + t;
    const 厚 = Math.max(2.5, t * 0.4), 丈 = Math.max(5, t * 0.8);   // 塀は人の丈より高い
    for (const face of ["S", "N", "E", "W"]) {
      const gs = l.gates.filter((g) => g.face === face).sort((p1, p2) => p1.off - p2.off);
      const horiz = face === "S" || face === "N";
      // 塀は石垣の外の縁に建つ
      const fixed = face === "S" ? y1 - 厚 : face === "N" ? y0 : face === "E" ? x1 - 厚 : x0;
      let cur = horiz ? x0 : y0;
      const end = horiz ? x1 : y1;
      const 置く = (a, b) => {
        if (b - a < 1) return;
        物.push(horiz ? 塀(a, fixed, b, fixed + 厚, 丈) : 塀(fixed, a, fixed + 厚, b, 丈));
      };
      for (const g of gs) {
        const wid = g.w + (g.broken ? 20 : 0);
        const c0 = (horiz ? lx : ly) + g.off - wid / 2;
        置く(cur, c0); cur = c0 + wid;
      }
      置く(cur, end);
    }
    /* 門。門櫓（二階の櫓門）として、扉の上に白壁と屋根を載せる */
    for (const g of l.gates) {
      if (g.broken) continue;
      const a = axisOf(l, g), gp = gatePos(m, l, g);
      const along = a.along === "x";
      const 厚 = t + 6, w = g.w + 12;
      const r = along ? [gp.x - w / 2, gp.y - 厚 / 2, gp.x + w / 2, gp.y + 厚 / 2]
        : [gp.x - 厚 / 2, gp.y - w / 2, gp.x + 厚 / 2, gp.y + w / 2];
      const 傷 = Math.max(0, Math.min(1, g.hp / g.max));
      const 扉 = `rgb(${Math.round(74 + 66 * 傷)},${Math.round(53 + 53 * 傷)},${Math.round(36 + 33 * 傷)})`;
      物.push(棟(...r, t * 2.0, t * 1.1, 2.6, { 扉, 腰: false, 窓: false, 陰: true }));
    }
  });
  /* 施設。矢倉は二重の櫓、陣鐘は鐘楼 */
  for (const f of m.fac) {
    if (f.hp <= 0) continue;
    const r = f.r;
    if (f.kind === "矢倉") 物.push(棟(f.x - r * 0.8, f.y - r * 0.8, f.x + r * 0.8, f.y + r * 0.8, r * 1.5, r * 0.75, 1.8, { 腰: true, 窓: true, 陰: true }));
    else 物.push(棟(f.x - r * 0.7, f.y - r * 0.7, f.x + r * 0.7, f.y + r * 0.7, r * 0.9, r * 0.6, 1.6, { 壁: "#9B7A50", 陰: true }));
  }
  /* 普請。御殿は入母屋の大屋根、蔵は白壁、馬屋は低い板葺き。井戸は地の上の絵のまま */
  for (const f of m.普請 || []) {
    const { x, y, w, h, kind } = f;
    if (!Number.isFinite(x) || !(w > 2) || !(h > 2) || kind === "井戸") continue;
    const s = Math.min(w, h);
    if (kind === "御殿") 物.push(棟(x - w / 2, y - h / 2, x + w / 2, y + h / 2, s * 0.22, s * 0.42, 2.4, { 腰: false, 窓: true, 陰: true }));
    else if (kind === "蔵") 物.push(棟(x - w / 2, y - h / 2, x + w / 2, y + h / 2, s * 0.9, s * 0.45, 1.4, { 腰: true, 陰: true }));
    else 物.push(棟(x - w / 2, y - h / 2, x + w / 2, y + h / 2, s * 0.5, s * 0.4, 1.4, { 壁: "#8C7452", 屋根: 板葺, 陰: true }));
  }
  const 天 = 天守の置き場(m);
  if (天) 物.push(天守(天));
  物.sort((a, b) => a.鍵 - b.鍵);
  ctx.save(); 視の筆へ(ctx); ctx.scale(1, 1 / k);
  for (const o of 物) o.描(ctx, k);
  ctx.restore();
}
