/* ==========================================================================
   背中越しの視点の城（一人働き・風雲モードの城攻めと籠城）

   遊ぶ人の申し出は「BC をいずれも入れれば」（C＝城攻め・籠城にも主人公が出られるようにする）。
   盤の城（battle/castleMap.js の縄張り）を、背中越しの視点（hitori/senaka.js）で立てて描くための
   箱と屋根を集める。置き方と寸法は、盤の斜めの眺め（battle/tachimono.js 城の物を集める）に合わせた：
     石垣と塀 … 曲輪ごとに、壁の帯（曲輪の縁から外へ t）を石垣の箱にし、外の縁に白壁の塀を載せる。
                 門の口は抜く（破れた門は口が広がる）
     櫓門     … 門柱（石の袖）二本の上に櫓を渡す。閉じた門は扉で塞ぐ
     枡形     … 門の外の袖と正面の石塁（門が破れれば崩れて無い）
     矢倉・陣鐘櫓・御殿・蔵・馬屋・天守、出城の土塁と板塀、付城の柵と井楼
   盤の当たり（壁・門の居場所と強さ）には触れない。絵のためだけに読む。
   返すのは盤の所（x, y）の矩 r と、地からの高さ（m）。世界の所への写しは senaka.js が行う。
   ========================================================================== */
import { axisOf, fromUV, gatePos, gateOpenU, 出城の塀, 付城の柵, 枡形の切れ目 } from "../battle/castleMap.js";
import { 天守の置き場 } from "../battle/tachimono.js";

export const 城の色 = {
  石: [158, 152, 138], 白壁: [236, 230, 214], 笠: [78, 86, 98], 扉: [92, 66, 44], 木: [106, 84, 56],
  土: [138, 118, 88], 瓦: [104, 110, 122], 板葺: [150, 128, 96], 腰板: [74, 66, 57],
};
/* 箱 … { k:"箱", r:[x0,y0,x1,y1]（盤）, 底, 丈（m）, 色, 石?, 窓? } ／ 屋根 … { k:"屋根", r（軒の矩）, 底, 丈（m）, 色 } */
const 箱 = (r, 底, 丈, 色, 添 = {}) => ({ k: "箱", r, 底, 丈, 色, ...添 });
const 屋根 = (r, 底, 丈, 色) => ({ k: "屋根", r, 底, 丈, 色 });
const 広げる = (r, e) => [r[0] - e, r[1] - e, r[2] + e, r[3] + e];
const 中 = (r) => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];

/* 一つの立つもの（奥行きで並べる単位）。部品をまとめ、芯の所を持つ */
const 物 = (部品) => { const r = 部品[0].r; const [x, y] = 中(r); return { x, y, 部品 }; };

/* 長い矩を、長さ len（盤）ごとに切る */
function 切る(r, len) {
  const 横 = r[2] - r[0] >= r[3] - r[1], L = 横 ? r[2] - r[0] : r[3] - r[1];
  const n = Math.max(1, Math.ceil(L / len)), out = [];
  for (let i = 0; i < n; i++) {
    out.push(横 ? [r[0] + L * i / n, r[1], r[0] + L * (i + 1) / n, r[3]] : [r[0], r[1] + L * i / n, r[2], r[1] + L * (i + 1) / n]);
  }
  return out;
}

export function 城の箱を集める(m, 尺) {
  if (!m || !m.layers) return [];
  const t = m.t, 並 = [];
  const 石丈 = (i) => 2.3 + 0.6 * i, 塀丈 = 1.8, 塀厚 = 1.6;      // 内の曲輪ほど石垣が高い（曲輪の段の代わり）
  /* 石垣と塀。面 face の外の縁に塀を載せる */
  const 石垣と塀 = (r, face, 石h, 木 = false) => {
    const 塀r = face === "S" ? [r[0], r[3] - 塀厚, r[2], r[3]] : face === "N" ? [r[0], r[1], r[2], r[1] + 塀厚]
      : face === "E" ? [r[2] - 塀厚, r[1], r[2], r[3]] : [r[0], r[1], r[0] + 塀厚, r[3]];
    return 物([
      箱(r, 0, 石h, 木 ? 城の色.土 : 城の色.石, { 石: !木 }),
      箱(塀r, 石h, 塀丈, 木 ? 城の色.木 : 城の色.白壁, { 腰: !木 }),
      箱(広げる(塀r, 0.35), 石h + 塀丈, 0.28, 木 ? 城の色.木 : 城の色.笠),
    ]);
  };
  m.layers.forEach((l) => {
    const lx = m.cx + (l.ox || 0), ly = m.cy + (l.oy || 0);
    const x0 = lx - l.hw - t, x1 = lx + l.hw + t, y0 = ly - l.hh - t, y1 = ly + l.hh + t;
    const h = 石丈(l.i || 0);
    for (const face of ["S", "N", "E", "W"]) {
      const 横 = face === "S" || face === "N";
      const 帯 = face === "S" ? [x0, ly + l.hh, x1, y1] : face === "N" ? [x0, y0, x1, ly - l.hh]
        : face === "E" ? [lx + l.hw, y0, x1, y1] : [x0, y0, lx - l.hw, y1];
      const gs = l.gates.filter((g) => g.face === face).sort((a, b) => a.off - b.off);
      let cur = 横 ? 帯[0] : 帯[1];
      const end = 横 ? 帯[2] : 帯[3];
      const 置く = (a, b) => {
        if (b - a < 1) return;
        const r = 横 ? [a, 帯[1], b, 帯[3]] : [帯[0], a, 帯[2], b];
        for (const rr of 切る(r, 12)) 並.push(石垣と塀(rr, face, h));
      };
      for (const g of gs) {
        const wid = g.w + (g.broken ? 20 : 0), c0 = (横 ? lx : ly) + g.off - wid / 2;
        置く(cur, c0); cur = c0 + wid;
      }
      置く(cur, end);
    }
    for (const g of l.gates) {
      並.push(...櫓門(m, l, g, h, 尺));
      if (!g.broken) 並.push(...枡形(m, l, g, 尺));
    }
  });
  /* 出城。土塁に板塀、前に木の櫓門 */
  if (m.出城) {
    for (const { face, r } of 出城の塀(m)) for (const rr of 切る(r, 12)) 並.push(石垣と塀(rr, face, 1.6, true));
    for (const g of m.出城.gates) 並.push(...櫓門(m, m.出城, g, 1.6, 尺, true));
  }
  /* 付城。柵と井楼 */
  for (const f of m.付城 || []) {
    for (const { face, r } of 付城の柵(f)) {
      const 横 = face === "N" || face === "S";
      const 芯 = 横 ? (r[1] + r[3]) / 2 : (r[0] + r[2]) / 2;
      const 細 = 横 ? [r[0], 芯 - 1.2, r[2], 芯 + 1.2] : [芯 - 1.2, r[1], 芯 + 1.2, r[3]];
      for (const rr of 切る(細, 12)) 並.push(物([箱(rr, 0, 2.2, 城の色.木)]));
    }
    const ix = f.x + f.hw * 0.55, iy = f.y - f.hh * 0.45, ir = 8, rr = [ix - ir, iy - ir, ix + ir, iy + ir];
    並.push(物([箱(rr, 0, ir * 2.6 * 尺, 城の色.木), 屋根(広げる(rr, 1.2), ir * 2.6 * 尺, ir * 0.6 * 尺, 城の色.板葺)]));
  }
  /* 施設。矢倉は二重の櫓、陣鐘は鐘楼（落ちたものは立てない） */
  for (const f of m.fac || []) {
    if (!(f.hp > 0)) continue;
    const r = f.r;
    if (f.kind === "矢倉") {
      const rr = [f.x - r * 0.8, f.y - r * 0.8, f.x + r * 0.8, f.y + r * 0.8], H = r * 1.5 * 尺;
      並.push(物([箱(rr, 0, H, 城の色.白壁, { 腰: true, 窓: true }), 屋根(広げる(rr, 1.8), H, r * 0.75 * 尺, 城の色.瓦)]));
    } else {
      const rr = [f.x - r * 0.7, f.y - r * 0.7, f.x + r * 0.7, f.y + r * 0.7], H = r * 0.9 * 尺;
      並.push(物([箱(rr, 0, H, 城の色.木), 屋根(広げる(rr, 1.6), H, r * 0.6 * 尺, 城の色.瓦)]));
    }
  }
  /* 普請。御殿・蔵・馬屋（井戸は立てない） */
  for (const f of m.普請 || []) {
    const { x, y, w, h, kind } = f;
    if (!Number.isFinite(x) || !(w > 2) || !(h > 2) || kind === "井戸") continue;
    const s = Math.min(w, h), rr = [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
    if (kind === "御殿") 並.push(物([箱(rr, 0, Math.max(3.2, s * 0.22 * 尺), 城の色.白壁, { 窓: true }),
      屋根(広げる(rr, 2.4), Math.max(3.2, s * 0.22 * 尺), s * 0.42 * 尺 * 0.7, 城の色.瓦)]));
    else if (kind === "蔵") 並.push(物([箱(rr, 0, s * 0.9 * 尺, 城の色.白壁, { 腰: true }), 屋根(広げる(rr, 1.4), s * 0.9 * 尺, s * 0.45 * 尺, 城の色.瓦)]));
    else 並.push(物([箱(rr, 0, s * 0.5 * 尺, 城の色.木), 屋根(広げる(rr, 1.4), s * 0.5 * 尺, s * 0.4 * 尺, 城の色.板葺)]));
  }
  /* 天守。石の天守台に、重ごとに一回り小さな白壁を積み、重ごとに屋根を回す */
  const 天 = 天守の置き場(m);
  if (天) {
    const 部品 = [];
    const 台丈 = 天.半 * 0.42 * 尺;
    部品.push(箱([天.x - 天.半, 天.y - 天.半, 天.x + 天.半, 天.y + 天.半], 0, 台丈, 城の色.石, { 石: true }));
    let L = 台丈, 半 = 天.半 * 0.94;
    const 重丈 = 天.半 * (天.重 >= 4 ? 0.36 : 0.44) * 尺;
    for (let i = 0; i < 天.重; i++) {
      const 上 = i === 天.重 - 1, rr = [天.x - 半, 天.y - 半, 天.x + 半, 天.y + 半];
      部品.push(箱(rr, L, 重丈, 城の色.白壁, { 窓: true, 腰: i === 0 }));
      L += 重丈;
      部品.push(屋根(広げる(rr, 半 * (上 ? 0.2 : 0.16)), L, (上 ? 半 * 0.75 : 半 * 0.3) * 尺, 城の色.瓦));
      半 *= 0.8;
    }
    並.push(物(部品));
  }
  return 並;
}

/* 櫓門（tachimono.js 櫓門と同じ所）。h … 取り付く石垣の高さ（m） */
function 櫓門(m, l, g, h, 尺, 木 = false) {
  const t = m.t, a = axisOf(l, g), gp = gatePos(m, l, g), along = a.along === "x";
  const 柱 = 6, 厚 = t + 6, w = g.w + 柱 * 2;
  const r = along ? [gp.x - w / 2, gp.y - 厚 / 2, gp.x + w / 2, gp.y + 厚 / 2] : [gp.x - 厚 / 2, gp.y - w / 2, gp.x + 厚 / 2, gp.y + w / 2];
  const 通丈 = Math.max(h + 1.6, t * 1.25 * 尺), 櫓丈 = t * 0.85 * 尺, 屋丈 = t * 0.75 * 尺;
  const 柱ら = along ? [[r[0], r[1], r[0] + 柱, r[3]], [r[2] - 柱, r[1], r[2], r[3]]] : [[r[0], r[1], r[2], r[1] + 柱], [r[0], r[3] - 柱, r[2], r[3]]];
  const 部品 = 柱ら.map((c) => 箱(c, 0, 通丈, 木 ? 城の色.木 : 城の色.石, { 石: !木 }));
  if (!g.broken) {
    const 扉 = along ? [r[0] + 柱, gp.y - 0.8, r[2] - 柱, gp.y + 0.8] : [gp.x - 0.8, r[1] + 柱, gp.x + 0.8, r[3] - 柱];
    const 傷 = Math.max(0, Math.min(1, g.hp / (g.max || 1)));
    部品.push(箱(扉, 0, 通丈 * 0.96, [Math.round(74 + 66 * 傷), Math.round(53 + 53 * 傷), Math.round(36 + 33 * 傷)], { 扉: true }));
  }
  部品.push(箱(r, 通丈, 櫓丈, 木 ? 城の色.木 : 城の色.白壁, { 腰: !木, 窓: true }));
  部品.push(屋根(広げる(r, 2.4), 通丈 + 櫓丈, 屋丈, 木 ? 城の色.板葺 : 城の色.瓦));
  /* 部品の並べ替えの芯は、門の真ん中（通りの中の兵と前後が合う） */
  return [{ x: gp.x, y: gp.y, 部品 }];
}

/* 枡形の袖と正面の石塁（tachimono.js 枡形と同じ所） */
function 枡形(m, l, g, 尺) {
  const t = m.t, a = axisOf(l, g), along = a.along === "x", 並 = [];
  const h = 2.0;
  const put = (u, v0, wu, wv) => {
    const q = fromUV(m, a, u, v0);
    const r = along ? [q.x - wu / 2, a.sgn > 0 ? q.y : q.y - wv, q.x + wu / 2, a.sgn > 0 ? q.y + wv : q.y]
      : [a.sgn > 0 ? q.x : q.x - wv, q.y - wu / 2, a.sgn > 0 ? q.x + wv : q.x, q.y + wu / 2];
    for (const rr of 切る(r, 12)) {
      const 塀r = [(rr[0] + rr[2]) / 2 - Math.min(0.8, (rr[2] - rr[0]) / 2), (rr[1] + rr[3]) / 2 - Math.min(0.8, (rr[3] - rr[1]) / 2),
        (rr[0] + rr[2]) / 2 + Math.min(0.8, (rr[2] - rr[0]) / 2), (rr[1] + rr[3]) / 2 + Math.min(0.8, (rr[3] - rr[1]) / 2)];
      const 長r = (rr[2] - rr[0]) >= (rr[3] - rr[1]) ? [rr[0], 塀r[1], rr[2], 塀r[3]] : [塀r[0], rr[1], 塀r[2], rr[3]];
      並.push(物([箱(rr, 0, h, 城の色.石, { 石: true }), 箱(長r, h, 1.7, 城の色.白壁), 箱(広げる(長r, 0.35), h + 1.7, 0.26, 城の色.笠)]));
    }
  };
  put(g.off - g.w / 2, a.half + t, t, g.masu);
  put(g.off + g.w / 2, a.half + t, t, g.masu);
  const [c0, c1] = 枡形の切れ目(g);
  const seg = (u0, u1) => { if (u1 > u0) put((u0 + u1) / 2, a.half + t + g.masu, u1 - u0, t); };
  seg(g.off - g.w * 1.05, c0); seg(c1, g.off + g.w * 1.05);
  return 並;
}

/* 堀（地に敷く帯）と橋。外の曲輪のまわり（castleMap.js castleTerrainAt の堀と同じ所）。
   帯は senaka.js 帯を描く の形（節・幅。盤の所）で返す */
export function 堀の帯(m) {
  if (!m || !m.layers || !m.layers.length || !m.moat) return { 堀: [], 橋: [], 空堀: false };
  const o = m.layers[0], t = m.t, band = m.moat.band, out = (o.masu || 0) + t + 8;
  const A = o.hw + t + out + band / 2, B = o.hh + t + out + band / 2, cx = m.cx, cy = m.cy;
  const 堀 = [{ 節: [[cx - A, cy - B], [cx + A, cy - B], [cx + A, cy + B], [cx - A, cy + B], [cx - A, cy - B]], 幅: band }];
  const 橋 = [];
  for (const g of o.gates) {
    const a = axisOf(o, g), u = gateOpenU(g);
    const p0 = fromUV(m, a, u, o.hh * 0 + (a.along === "x" ? o.hh : o.hw) + t + out - 2);
    const p1 = fromUV(m, a, u, (a.along === "x" ? o.hh : o.hw) + t + out + band + 2);
    橋.push({ 節: [[p0.x, p0.y], [p1.x, p1.y]], 幅: Math.min(g.w * 0.6, 40) });
  }
  return { 堀, 橋, 空堀: !!m.moat.空堀 };
}
