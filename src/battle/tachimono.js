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
export const 瓦 = { 奥: "#8A919C", 左: "#7B838F", 右: "#525A66", 前: "#646C78", 縁: "rgba(36,38,44,0.55)" };
export const 板葺 = { 奥: "#A89272", 左: "#9A8462", 右: "#6E5D44", 前: "#806C50", 縁: "rgba(52,42,30,0.55)" };
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
export function 棟(x0, y0, x1, y1, 丈, 屋丈, 軒, 種) {
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
  return { 鍵: v.y1 - 0.01, 描: (ctx, k) => 塀を描く(ctx, k, v, 足元(x0, y0, x1, y1), 丈) };
}
function 塀を描く(ctx, k, v, L, 丈) {
  箱(ctx, k, v, L, 丈, 白壁, 白壁陰, (x, y, w, h) => {
    ctx.fillStyle = "rgba(52,46,40,0.62)"; ctx.fillRect(x, y + h * 0.66, w, h * 0.34);   // 下見板
    ctx.fillStyle = "rgba(40,36,30,0.7)";                                             // 狭間
    for (let u = x + 4; u < x + w - 2; u += 9) ctx.fillRect(u, y + h * 0.3, 1.4, h * 0.2);
  });
  /* 瓦の笠。真上から見た塀は笠の面しか見えないので、南北に延びる塀が太い灰色の板に
     見えた（遊ぶ側の四枚目）。笠は壁の厚みより少し張り出すだけの細い棟にし、
     真ん中に棟の照りを一筋通す */
  const 縦長 = (v.y1 - v.y0) * k > (v.x1 - v.x0);
  const top = v.y0 * k - L - 丈;
  ctx.fillStyle = "#4E5662";
  ctx.fillRect(v.x0 - 0.5, top - 0.9, v.x1 - v.x0 + 1.0, (v.y1 - v.y0) * k + 1.6);
  ctx.fillStyle = "rgba(220,224,230,0.4)";                                         // 笠の照り
  if (縦長) ctx.fillRect((v.x0 + v.x1) / 2 - 0.3, top - 0.9, 0.6, (v.y1 - v.y0) * k + 1.6);
  else ctx.fillRect(v.x0 - 0.5, top - 0.9, v.x1 - v.x0 + 1.0, 0.6);
}

/* 城壁をよける（絵だけ。盤の組の居場所は動かさない）。
   城壁に取り付いた組は、持ち場の一部が曲輪の内へ掛かる。そこに立つ兵は曲輪の天端の
   高さまで持ち上がり、石垣の面の途中に立って見えた。兵は自分の組のいる側（外か内か）に
   とどめる。破れた門の間口は通す（門をくぐるのは盤が決める）。閉じた門は壁と同じ。
   (qx, qy) は組の所、(x, y) は兵の所。よけるなら [x, y]、そのままなら null */
export function 城壁をよける(m, qx, qy, x, y) {
  if (!m || !m.layers) return null;
  const t = m.t;
  let r = null;
  for (const l of m.layers) {
    const cx = m.cx + (l.ox || 0), cy = m.cy + (l.oy || 0), hw = l.hw + t, hh = l.hh + t;
    const px = r ? r[0] : x, py = r ? r[1] : y;
    const 組内 = Math.abs(qx - cx) < hw && Math.abs(qy - cy) < hh;
    if ((Math.abs(px - cx) < hw && Math.abs(py - cy) < hh) === 組内) continue;
    // 越えた面。際までの隔たりの近いほう
    const 南北 = Math.abs(Math.abs(py - cy) - hh) < Math.abs(Math.abs(px - cx) - hw);
    const u = 南北 ? px - cx : py - cy;
    const 面 = 南北 ? (py > cy ? "S" : "N") : (px > cx ? "E" : "W");
    // 破れた門の間口だけは通す。閉じた門まで通していたころは、敵味方の兵が門をすり抜けて見えた
    if (l.gates.some((g) => g.broken && g.face === 面 && Math.abs(u - g.off) < g.w / 2 + 10)) continue;
    if (南北) { const s = py > cy ? 1 : -1; r = [px, cy + s * (組内 ? hh - 1.5 : hh + 1.2)]; }
    else { const s = px > cx ? 1 : -1; r = [cx + s * (組内 ? hw - 1.5 : hw + 1.2), py]; }
  }
  return r;
}

/* 視の矩の四隅を、足元 L・高さ h から画へ写した四角として塗る（地に置く物） */
function 地の四角(ctx, k, v, L, 色) {
  ctx.fillStyle = 色;
  ctx.fillRect(v.x0, v.y0 * k - L, v.x1 - v.x0, (v.y1 - v.y0) * k);
}
const 石色 = "#A39C8C";
function 石の目(ctx) {
  return (x, y, w, h) => {
    ctx.strokeStyle = "rgba(80,76,66,0.42)"; ctx.lineWidth = 0.45;
    for (let u = 2.6; u < h; u += 2.6) { ctx.beginPath(); ctx.moveTo(x, y + u); ctx.lineTo(x + w, y + u); ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(x, y, w, 0.6);
  };
}

/* 櫓門。遊ぶ側の申し出は「門をくぐる様子が分からない、兵が門にめり込む」であった。
   門を開口を塞ぐ箱として描いていたからである。

   両脇の門柱（石の袖）の上に櫓を渡し、その下を通れる形にする。間口は盤の門の幅
   （兵が実際に通る幅）にそのまま合わせる。重ねの順は部分ごとに分ける：
     通りの陰 … 通りの奥の端で（通る兵より先に）
     扉       … 扉の所で（扉の向こうの兵は隠れ、手前の兵は扉の前に立つ）
     門柱・櫓 … 門の手前の端で（通りの中の兵の頭に、手前の櫓が掛かる）
   破れた門は扉が倒れて地に落ち、通りが開く。 */
function 櫓門(m, l, g) {
  const t = m.t;
  const a = axisOf(l, g), gp = gatePos(m, l, g);
  const along = a.along === "x";
  const 柱 = 6, 厚 = t + 6, w = g.w + 柱 * 2;
  const r = along ? [gp.x - w / 2, gp.y - 厚 / 2, gp.x + w / 2, gp.y + 厚 / 2]
    : [gp.x - 厚 / 2, gp.y - w / 2, gp.x + 厚 / 2, gp.y + w / 2];
  const v = 視の矩(...r);
  // 通りが画の縦（手前と奥）に抜けるか、横に抜けるか
  const [p0x, p0y] = 視(gp.x, gp.y), [p1x, p1y] = 視(gp.x + (along ? 0 : 1), gp.y + (along ? 1 : 0));
  const 縦通 = Math.abs(p1y - p0y) > Math.abs(p1x - p0x);
  const 通丈 = t * 1.25, 櫓丈 = t * 0.85, 屋丈 = t * 0.75;
  const 傷 = Math.max(0, Math.min(1, g.hp / g.max));
  const 扉色 = `rgb(${Math.round(74 + 66 * 傷)},${Math.round(53 + 53 * 傷)},${Math.round(36 + 33 * 傷)})`;
  let L = null;
  const 足 = () => (L == null ? (L = 足元(...r)) : L);
  // 門柱と通り・扉の矩（視の所）
  const 柱ら = 縦通
    ? [{ ...v, x1: v.x0 + 柱 }, { ...v, x0: v.x1 - 柱 }]
    : [{ ...v, y1: v.y0 + 柱 }, { ...v, y0: v.y1 - 柱 }];
  const 通 = 縦通 ? { ...v, x0: v.x0 + 柱, x1: v.x1 - 柱 } : { ...v, y0: v.y0 + 柱, y1: v.y1 - 柱 };
  const 中 = 縦通 ? (v.y0 + v.y1) / 2 : (v.x0 + v.x1) / 2;
  const 扉矩 = 縦通 ? { ...通, y0: 中 - 0.8, y1: 中 + 0.8 } : { ...通, x0: 中 - 0.8, x1: 中 + 0.8 };
  const 物 = [];
  // 通りの陰。櫓の下は暗い
  物.push({ 鍵: v.y0 - 0.3, 描: (ctx, k) => 地の四角(ctx, k, 通, 足(), "rgba(30,26,20,0.30)") });
  if (!g.broken) {
    物.push({ 鍵: 扉矩.y1, 描: (ctx, k) => {
      箱(ctx, k, 扉矩, 足(), 通丈 * 0.96, 扉色, 扉色, (x, y, w2, h) => {
        ctx.strokeStyle = "rgba(20,14,8,0.8)"; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(x + w2 / 2, y); ctx.lineTo(x + w2 / 2, y + h); ctx.stroke();
        ctx.fillStyle = "rgba(226,214,182,0.6)";                  // 鋲
        if (w2 > 6) for (let i = 1; i < 4; i++) for (const s2 of [0.25, 0.75]) ctx.fillRect(x + w2 * s2 - 0.5, y + h * i / 4, 1, 1);
      });
    } });
  } else {
    // 破れた扉。二枚が通りの奥へ倒れている
    物.push({ 鍵: v.y0 - 0.2, 描: (ctx, k) => {
      const L0 = 足();
      ctx.fillStyle = "rgba(72,52,34,0.9)";
      const 半 = 縦通 ? (通.x1 - 通.x0) / 2 : (通.y1 - 通.y0) / 2;
      for (const s2 of [-1, 1]) {
        ctx.save();
        if (縦通) { ctx.translate((通.x0 + 通.x1) / 2 + s2 * 半 * 0.5, (中 - 2) * k - L0); ctx.rotate(s2 * 0.25); ctx.fillRect(-半 * 0.45, -2.2 * k, 半 * 0.9, 4.4 * k); }
        else { ctx.translate(中 - 1, ((通.y0 + 通.y1) / 2 + s2 * 半 * 0.5) * k - L0); ctx.rotate(s2 * 0.2); ctx.fillRect(-2.6, -半 * 0.45 * k, 5.2, 半 * 0.9 * k); }
        ctx.restore();
      }
    } });
  }
  // 門柱（石の袖）。それぞれの手前の端で
  for (const c of 柱ら) 物.push({ 鍵: c.y1, 描: (ctx, k) => 箱(ctx, k, c, 足(), 通丈, 石色, "#B4AD9C", 石の目(ctx)) });
  // 櫓。門柱の上に渡す
  物.push({ 鍵: v.y1 + 0.01, 描: (ctx, k) => {
    const L0 = 足() + 通丈;
    箱(ctx, k, v, L0, 櫓丈, 白壁, null, (x, y, w2, h) => {
      ctx.fillStyle = 腰板; ctx.fillRect(x, y + h * 0.6, w2, h * 0.4);
      ctx.fillStyle = "rgba(40,36,30,0.78)";                      // 格子窓
      const n = Math.max(2, Math.round(w2 / 9));
      for (let i = 0; i < n; i++) ctx.fillRect(x + (i + 0.3) * w2 / n, y + h * 0.2, Math.min(3, w2 / n * 0.45), h * 0.26);
      ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(x + w2 * 0.55, y, w2 * 0.45, h);
    });
    屋根(ctx, k, v, L0 + 櫓丈, 屋丈, 2.4, 瓦);
  } });
  return 物;
}

/* 枡形の袖と正面。石塁の上に塀を載せる。真上の絵（draw.js 城の立つものを描く）と同じ所 */
function 枡形(m, l, g) {
  const t = m.t, a = axisOf(l, g), along = a.along === "x";
  const 物 = [];
  const put = (u, v0, wu, wv) => {
    const q = fromUV(m, a, u, v0);
    const r = along ? [q.x - wu / 2, a.sgn > 0 ? q.y : q.y - wv, q.x + wu / 2, a.sgn > 0 ? q.y + wv : q.y]
      : [a.sgn > 0 ? q.x : q.x - wv, q.y - wu / 2, a.sgn > 0 ? q.x + wv : q.x, q.y + wu / 2];
    // 長い石塁は切って並べる（塀と同じ理由）
    const 長 = Math.max(r[2] - r[0], r[3] - r[1]), n = Math.max(1, Math.ceil(長 / 24));
    const 横長 = r[2] - r[0] >= r[3] - r[1];
    for (let i = 0; i < n; i++) {
      const rr = 横長 ? [r[0] + (r[2] - r[0]) * i / n, r[1], r[0] + (r[2] - r[0]) * (i + 1) / n, r[3]]
        : [r[0], r[1] + (r[3] - r[1]) * i / n, r[2], r[1] + (r[3] - r[1]) * (i + 1) / n];
      物.push(石塁(...rr, t * 0.9, Math.max(5, t * 0.8)));
    }
  };
  put(g.off - g.w / 2, a.half + t, t, g.masu);
  put(g.off + g.w / 2, a.half + t, t, g.masu);
  const gL = g.off - g.w / 2, gR = g.off + g.w / 2;
  const from = g.open > 0 ? gR - g.w * 0.1 : gL - g.w * 0.9;
  const seg = (u0, u1) => { if (u1 > u0) put((u0 + u1) / 2, a.half + t + g.masu, u1 - u0, t); };
  seg(g.off - g.w * 1.05, from); seg(from + g.w, g.off + g.w * 1.05);
  return 物;
}
/* 石塁。石を積んだ低い土台に、細い塀を載せる */
function 石塁(x0, y0, x1, y1, 石丈, 塀丈) {
  const v = 視の矩(x0, y0, x1, y1);
  return { 鍵: v.y1, 描: (ctx, k) => {
    const L = 足元(x0, y0, x1, y1);
    箱(ctx, k, v, L, 石丈, 石色, "#B4AD9C", 石の目(ctx));
    const w2 = Math.min(3, (v.x1 - v.x0) * 0.4), h2 = Math.min(3, (v.y1 - v.y0) * 0.4);
    const 細 = (v.x1 - v.x0) > (v.y1 - v.y0) ? { ...v, y0: (v.y0 + v.y1) / 2 - h2 / 2, y1: (v.y0 + v.y1) / 2 + h2 / 2 }
      : { ...v, x0: (v.x0 + v.x1) / 2 - w2 / 2, x1: (v.x0 + v.x1) / 2 + w2 / 2 };
    塀を描く(ctx, k, 細, L + 石丈, 塀丈);
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
  const 物 = 城の物を集める(m);
  物.sort((a, b) => a.鍵 - b.鍵);
  ctx.save(); 視の筆へ(ctx); ctx.scale(1, 1 / k);
  for (const o of 物) o.描(ctx, k);
  ctx.restore();
}
/* 兵と前後を重ねて描く（遊ぶ側の申し出：兵が門の屋根や塀の上に乗って見える）。
   兵を一人ずつ描く寄りでは、drawBattle が城をここへ預け、新絵の兵描きが兵と一緒に
   奥から手前へ並べる。塀の向こうの兵は塀に隠れ、手前の兵は塀の前に立つ。
   兵描きが呼ばれなかったときは、drawBattle が残りを立てる。 */
let 預かり = null;
export function 城を預ける(m) { 預かり = m || null; }
export function 城の物を並べる(並) {
  if (!預かり) return;
  for (const o of 城の物を集める(預かり)) 並.push({ 棟: o, 鍵: o.鍵 });
  預かり = null;
}
export function 預けた城を立てる(ctx) { if (預かり) { const m = 預かり; 預かり = null; 城を立てて描く(ctx, m); } }

function 城の物を集める(m) {
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
      /* 長い塀は二十四歩ごとに切って並べる。一本のまま奥から手前へ並べると、
         南北に延びる塀は南の端の所で一度に描かれ、その北の脇に立つ兵まで覆った */
      const 置く = (a, b) => {
        if (b - a < 1) return;
        const n = Math.max(1, Math.ceil((b - a) / 24));
        for (let i = 0; i < n; i++) {
          const a2 = a + (b - a) * i / n, b2 = a + (b - a) * (i + 1) / n;
          物.push(horiz ? 塀(a2, fixed, b2, fixed + 厚, 丈) : 塀(fixed, a2, fixed + 厚, b2, 丈));
        }
      };
      for (const g of gs) {
        const wid = g.w + (g.broken ? 20 : 0);
        const c0 = (horiz ? lx : ly) + g.off - wid / 2;
        置く(cur, c0); cur = c0 + wid;
      }
      置く(cur, end);
    }
    /* 門。櫓門（下を通り抜け、上に櫓を載せる）として立てる。虎口の袖と正面も石塁で */
    for (const g of l.gates) {
      物.push(...櫓門(m, l, g));
      if (!g.broken) 物.push(...枡形(m, l, g));
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
  return 物;
}
