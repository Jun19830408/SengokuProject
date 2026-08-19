import { ROW, SP } from "./corps.js";
import { FIELD, passable } from "./field.js";
import { U, clamp } from "../core/util.js";

/* ==========================================================================
   城郭図（GDD 9.3）。惣構・二の丸・本丸の三層と、門・櫓・堀・狭い曲輪で構成する。
   写実的な城の絵は使わず、構造と通路が読める図式として描く。
   ========================================================================== */
export let MAP = null;                       // 城攻めのときだけ城郭図が入る

export function setBattleMap(m) { MAP = m; }


// 城攻めに立てられる一隊の兵。門は狭く、二万を城壁に押し付けても意味がない。
// あふれた兵は後詰として戦場の外に控える。
export const SIEGE_CORPS_CAP = 3000;

// 城の寸法は「一隊の見た目の大きさ」を単位にする。こうしないと、
// 兵が増えるほど隊が城を追い越し、本丸より一隊が大きいという事態になる。
export function siegeUnit() {
  const sq = Math.ceil(SIEGE_CORPS_CAP / 50);            // 60組
  const side = Math.ceil(Math.sqrt(sq));                 // 方陣なら8×8
  return { w: side * SP, d: side * ROW };                // 216 × 88
}

/* ------------------------------------------------ 城の構え（GDD 9.3）

   これまで、どの城も同じ正方形の三重であった。山城も平城も、堀の広さも
   門の数も同じで、地形との関わりがまるでない。

   城の構えは三つに分ける。

     山城   … 峰の上。曲輪は尾根に沿って細長く、門は少ない。堀は空堀。
              寄せ手は坂を駆け上がることになる（足が鈍り、城方が有利になる）
     平山城 … 丘の上。細長さも堀も中くらい。城下を抱える
     平城   … 平地。曲輪は広く四角く、門は多く、水堀が広く回る

   どれに当たるかは、城の名と防備から判ずる。標高（geo.js の elevationAt）でも
   測ってみたが、盤の稜線が粗く、平地の小田原城が〇.七八、清洲城が〇.六五と出て
   使いものにならなかった。名は嘘をつかない。「〜山城」と名乗る城は山城である。

   いくつかの名の知れた城は、史実に合わせて名指しで直す。 */
const 構えの例外 = {
  odawara: "平山城",        // 相模。丘城だが城下を抱える大城
  ishiyama: "平城",          // 石山本願寺。寺内町であって山城ではない
  gassan: "山城", kannonji: "山城", nanao: "山城", odani: "山城",
  iwamura: "山城", takato: "山城", tsukiyama: "山城", yoshida: "山城",
  kasugayama: "山城", inabayama: "山城", takeda_i: "山城",
  tsutsujigasaki: "平城", nijo: "平城", kiyosu: "平城", nagoya: "平城",
  sunpu: "平城", edo: "平城", kofu: "平城",
};

export function 城の構え(castle) {
  if (構えの例外[castle.id]) return 構えの例外[castle.id];
  const n = castle.name || "";
  if (/館$|御所$|居館|寺$|本願寺/.test(n)) return "平城";
  if (/山城$|ヶ城$|嶽|岳|城山|山$/.test(n)) return "山城";
  const d = castle.def || 50;
  return d >= 66 ? "山城" : d >= 50 ? "平山城" : "平城";
}

export function buildCastleMap(castle) {
  const U = siegeUnit();
  const k = 0.88 + castle.def / 420;                     // 城防で一割ほど前後する
  const t = 10;
  /* 城ごとに同じ形にならぬよう、城の名から種を起こす。
     同じ城を何度攻めても、いつも同じ縄張りである。 */
  const 種 = Math.abs(String(castle.id || castle.name || "x").split("")
    .reduce((a2, c) => (a2 * 33 + c.charCodeAt(0)) | 0, 7));
  const rnd = ((z) => () => {
    z = (z + 0x6D2B79F5) | 0;
    let x = Math.imul(z ^ (z >>> 15), 1 | z);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  })(種 >>> 0);
  const 構 = 城の構え(castle);
  /* 縄張りの癖。
       細長さ … 山城は尾根に沿って細長い。平城は四角い
       門の数 … 山城は少ない。平城は四方に開く
       堀     … 山城は空堀で狭く、平城は水堀が広く回る */
  const 癖 = 構 === "山城"
    ? { 縦横: 0.42 + rnd() * 0.24, 門: -1, 堀: 0.55, 広さ: 0.86, 空堀: true }
    : 構 === "平山城"
      ? { 縦横: 0.72 + rnd() * 0.3, 門: 0, 堀: 0.9, 広さ: 1.0, 空堀: false }
      : { 縦横: 0.94 + rnd() * 0.26, 門: 1, 堀: 1.35, 広さ: 1.18, 空堀: false };
  const 横長 = rnd() < 0.5;                              // 尾根の向き
  const n = castle.def >= 64 ? 4 : castle.def >= 40 ? 3 : 2;
  const names = n === 4 ? ["惣構", "三の丸", "二の丸", "本丸"]
    : n === 3 ? ["惣構", "二の丸", "本丸"] : ["二の丸", "本丸"];
  const base = 380 + castle.def * 8;
  const gn0 = clamp((castle.def >= 64 ? 4 : castle.def >= 40 ? 3 : 2) + 癖.門, 1, 4);
  const FACE = ["S", "N", "E", "W"];
  const GNAME = { S: "大手門", N: "搦手門", E: "東脇門", W: "西脇門" };
  const INAME = { S: "表門", N: "裏門", E: "東門", W: "西門" };
  // 本丸は一隊が数隊入れる広さ。曲輪の帯幅は一隊の奥行きより広く取る。
  /* 本丸の広さと曲輪の帯。構えによって細長さが変わる。
     山城は尾根に沿って細く長く、平城は広く四角い。 */
  const 基W = U.w * 1.2 * k * 癖.広さ, 基H = U.d * 2.0 * k * 癖.広さ;
  /* 細長さには歯止めが要る。
     初めは山城を尾根なりに細くしたところ、本丸が千十歩×百四十五歩になった。
     一隊は幅二百十六・奥行八十八であるから、これでは隊がまともに入らない。
     どの向きにも、一隊が二つ並ぶだけの幅は残す。 */
  const 下限W = U.w * 1.1, 下限H = U.d * 2.2;
  const honW = Math.max(下限W, 横長 ? 基W / 癖.縦横 : 基W * 癖.縦横);
  const honH = Math.max(下限H, 横長 ? 基H * 癖.縦横 : 基H / 癖.縦横);
  const band = (U.d * 1.5 + 74) * k * (0.86 + 癖.広さ * 0.2);
  const masu = 34 * k;
  const layers = names.map((name, i) => {
    const back = (n - 1 - i);                            // 外側ほど大きい
    const hw = honW + band * back, hh = honH + band * back;
    const cnt = Math.max(1, gn0 - i);
    const gates = FACE.slice(0, cnt).map((face, j) => {
      const along = (face === "S" || face === "N") ? "x" : "y";
      const span = along === "x" ? hw : hh;
      const w = (96 - i * 8) * k * (face === "S" ? 1 : 0.8);
      const hp = Math.round(base * (1 - i * 0.06) * (face === "S" ? 1 : 0.76));
      const nm = i === 0 ? GNAME[face] : INAME[face];
      return {
        face, layer: i, i: j, name: nm, key: `${name}${nm}`,
        // 門の位置。城ごとに散らす。いつも同じ所に開いていては縄張りにならない。
        off: span * (0.40 - 0.13 * ((j + 種) % 3)) * ((i + j + 種) % 2 ? 1 : -1),
        w, hp, max: hp, broken: false, masu, open: (i + j) % 2 ? 1 : -1,
        slot: null, hold: null, def: 0,
      };
    });
    return { name, i, hw, hh, masu, gates };
  });
  // 城内の施設。矢倉は曲輪の角、陣鐘櫓は曲輪の奥に一つ。
  const fac = [];
  layers.forEach((l, i) => {
    if (i >= layers.length - 1) return;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      fac.push({ kind: "矢倉", name: `${l.name}矢倉${sy > 0 ? "南" : "北"}${sx > 0 ? "東" : "西"}`,
        x: sx * l.hw, y: sy * l.hh, r: 15, hp: 260 + castle.def * 3, max: 260 + castle.def * 3, layer: i, cool: 0 });
    }
    const nx = layers[i + 1];
    fac.push({ kind: "陣鐘櫓", name: `${l.name}陣鐘`,
      x: (i % 2 ? -1 : 1) * l.hw * 0.5, y: -(l.hh + (nx ? nx.hh + t : 0)) / 2,
      r: 14, hp: 200 + castle.def * 2, max: 200 + castle.def * 2, layer: i, cool: 0 });
  });
  // 中心は戦場を決めたあとに据える（施設は相対座標で持っておく）
  return { cx: 0, cy: 0, t, layers, moat: { band: 38 * k * 癖.堀, 空堀: 癖.空堀 }, n,
    構: 構, 横長, 坂: 構 === "山城" ? 1 : 構 === "平山城" ? 0.55 : 0,
    gates: layers.flatMap((l) => l.gates), fac, unit: U };
}

// 城の外に、寄せ手が二列並べるだけの余地を取って戦場を決める
export function layoutCastleField(m) {
  const o = m.layers[0];
  const ext = { w: o.hw + m.t + o.masu + m.t + 8 + m.moat.band, h: o.hh + m.t + o.masu + m.t + 8 + m.moat.band };
  // 城の外に、寄せ手が展開して回り込めるだけの野を残す
  /* 城の外に、寄せ手が展開して回り込めるだけの野を残す。
     五隊も出せば城の周りが一杯になり、横に並べて門へ押すのが精一杯だった。
     山城なら坂を大きく取る。駆け上がる道のりが戦の要だからである。 */
  const 余 = m.坂 >= 1 ? 1.15 : m.坂 > 0 ? 0.95 : 0.82;
  FIELD.w = Math.round((ext.w + Math.max(m.unit.d * 3.4 + 240, ext.w * 余)) * 2);
  FIELD.h = Math.round((ext.h + Math.max(m.unit.d * 3.4 + 240, ext.h * 余)) * 2);
  m.cx = FIELD.w / 2; m.cy = FIELD.h / 2;
  for (const f of m.fac) { f.x += m.cx; f.y += m.cy; }   // 相対から絶対へ
  return m;
}

export const inRect = (dx, dy, hw, hh) => Math.abs(dx) <= hw && Math.abs(dy) <= hh;


/* 門は四方にあるので、壁沿いの座標 u と壁からの距離 v で扱う */
export function axisOf(l, g) {
  const along = (g.face === "S" || g.face === "N") ? "x" : "y";
  return { along, half: along === "x" ? l.hh : l.hw, sgn: (g.face === "S" || g.face === "E") ? 1 : -1 };
}

export const toUV = (a, dx, dy) => a.along === "x" ? { u: dx, v: dy * a.sgn } : { u: dy, v: dx * a.sgn };

export const fromUV = (m, a, u, v) =>
  a.along === "x" ? { x: m.cx + u, y: m.cy + a.sgn * v } : { x: m.cx + a.sgn * v, y: m.cy + u };

export const gatePos = (m, l, g) => { const a = axisOf(l, g); return fromUV(m, a, g.off, a.half + m.t / 2); };

export function gateOpenU(g) {
  const gL = g.off - g.w / 2, gR = g.off + g.w / 2;
  const from = g.open > 0 ? gR - g.w * 0.1 : gL - g.w * 0.9;
  return from + g.w / 2;
}

export function masuWall(m, l, g, dx, dy) {
  if (g.broken) return false;                        // 門が破れれば虎口も崩れる
  const a = axisOf(l, g), { u, v } = toUV(a, dx, dy), t = m.t;
  const v0 = a.half + t, v1 = v0 + g.masu;
  if (v < v0 - 1 || v > v1 + t) return false;
  const gL = g.off - g.w / 2, gR = g.off + g.w / 2;
  if (v <= v1) return Math.abs(u - gL) <= t / 2 || Math.abs(u - gR) <= t / 2;
  const from = g.open > 0 ? gR - g.w * 0.1 : gL - g.w * 0.9;
  return u > gL - g.w && u < gR + g.w && !(u > from && u < from + g.w);
}


export function castleTerrainAt(x, y) {
  const m = MAP, t = m.t;
  const dx = x - m.cx, dy = y - m.cy;
  for (const l of m.layers) for (const g of l.gates) if (masuWall(m, l, g, dx, dy)) return "wall";
  // 施設は壁より先に判定する。崩れた施設はもう塞がない。
  for (const f of m.fac) {
    if (f.hp > 0 && Math.hypot(x - f.x, y - f.y) < f.r * 1.5) return "tower";
  }
  for (const l of m.layers) {
    if (inRect(dx, dy, l.hw + t, l.hh + t) && !inRect(dx, dy, l.hw, l.hh)) {
      for (const g of l.gates) {
        const a = axisOf(l, g), { u, v } = toUV(a, dx, dy);
        if (v > a.half - 1 && Math.abs(u - g.off) <= g.w / 2 + (g.broken ? 10 : 0)) {
          return g.broken ? "gateopen" : "gate";
        }
      }
      return "wall";
    }
  }
  const o = m.layers[0], band = m.moat.band, out = o.masu + t + 8;
  if (!inRect(dx, dy, o.hw + t + out, o.hh + t + out)
      && inRect(dx, dy, o.hw + t + out + band, o.hh + t + out + band)) {
    for (const g of o.gates) {
      const a = axisOf(o, g), { u, v } = toUV(a, dx, dy);
      if (v > 0 && Math.abs(u - gateOpenU(g)) <= g.w * 0.8) return "bridge";
    }
    return m.moat.空堀 ? "karabori" : "moat";
  }
  /* 山城の坂（GDD 9.3）。
     堀の外は峰の斜面である。寄せ手は駆け上がることになるので足が鈍い。
     平城には坂がない。城下がそのまま城門の前まで続く。 */
  if (m.坂 > 0) {
    const b2 = o.hw + t + out + band;
    if (!inRect(dx, dy, b2, o.hh + t + out + band)) return m.坂 >= 1 ? "sakamichi" : "surface";
  }
  const inner = m.layers[m.layers.length - 1];
  if (inRect(dx, dy, inner.hw, inner.hh)) return "honmaru";
  for (const l of m.layers) if (inRect(dx, dy, l.hw, l.hh)) return "kuruwa";
  return "plain";
}

// 攻城の道具。槍組の一部を割いて担がせる。効くのは門を破る速さと、矢倉からの被害だけ。
export const SIEGE_KIT = {
  なし:   { gate: 1.0, guard: 1.0, note: "手勢のみ。" },
  破城槌: { gate: 3.0, guard: 1.0, note: "門の破壊が三倍。槍組の一部を割く。" },
  竹束:   { gate: 1.0, guard: 0.4, note: "城内からの射撃を四割に抑える。" },
  井楼:   { gate: 1.1, guard: 0.8, shoot: 1.7, note: "塀ごしに射かけられ、櫓を崩しやすい。" },
};

/* ------------------------------------------- 城内の最短経路（A*）
   壁と堀を避けて実際に通れる道を探す。回り込みの当て推量では、
   曲輪の中で壁をつたうだけになってしまう。 */
export function buildNav(m) {
  const CS = 22;
  const w = Math.ceil(FIELD.w / CS), h = Math.ceil(FIELD.h / CS);
  const ok = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      ok[j * w + i] = passable(i * CS + CS / 2, j * CS + CS / 2) ? 1 : 0;
    }
  }
  m.nav = { CS, w, h, ok };
  return m.nav;
}

export function navPath(m, x0, y0, x1, y1) {
  const nv = m.nav || buildNav(m);
  const { CS, w, h, ok } = nv;
  const ix = (x) => clamp(Math.floor(x / CS), 0, w - 1);
  const iy = (y) => clamp(Math.floor(y / CS), 0, h - 1);
  const near = (i0, j0) => {                       // 壁の中なら最寄りの通れる格子へ
    if (ok[j0 * w + i0]) return j0 * w + i0;
    for (let r = 1; r <= 6; r++) {
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = i0 + di, j = j0 + dj;
        if (i < 0 || j < 0 || i >= w || j >= h) continue;
        if (ok[j * w + i]) return j * w + i;
      }
    }
    return -1;
  };
  const S = near(ix(x0), iy(y0)), T = near(ix(x1), iy(y1));
  if (S < 0 || T < 0) return null;
  if (S === T) return [{ x: x1, y: y1, r: 24 }];
  const N = w * h;
  const g = new Float32Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const seen = new Uint8Array(N);
  const tx = T % w, ty = (T / w) | 0;
  const hOf = (k) => { const i = k % w, j = (k / w) | 0; const dx = Math.abs(i - tx), dy = Math.abs(j - ty);
    return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
  const open = [{ k: S, f: hOf(S) }];
  g[S] = 0;
  let found = false, guard = 0;
  while (open.length && guard++ < 60000) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0].k;
    if (cur === T) { found = true; break; }
    if (seen[cur]) continue;
    seen[cur] = 1;
    const ci = cur % w, cj = (cur / w) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
      const nk = nj * w + ni;
      if (!ok[nk] || seen[nk]) continue;
      if (di && dj && (!ok[cj * w + ni] || !ok[nj * w + ci])) continue;   // 角抜けは禁じる
      const cost = g[cur] + (di && dj ? Math.SQRT2 : 1);
      if (cost < g[nk]) { g[nk] = cost; prev[nk] = cur; open.push({ k: nk, f: cost + hOf(nk) }); }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let k = T; k !== -1; k = prev[k]) { cells.push(k); if (k === S) break; }
  cells.reverse();
  // 曲がり角だけを残す
  const pts = [];
  let lastDir = null;
  for (let n = 1; n < cells.length; n++) {
    const a = cells[n - 1], b2 = cells[n];
    const d = `${(b2 % w) - (a % w)},${((b2 / w) | 0) - ((a / w) | 0)}`;
    if (d !== lastDir) {
      lastDir = d;
      pts.push({ x: (a % w) * CS + CS / 2, y: ((a / w) | 0) * CS + CS / 2, r: 30 });
    }
  }
  pts.push({ x: x1, y: y1, r: 26 });
  return pts;
}


// 城の外周を回り込む道順。壁沿いに滑るだけでは門へ辿り着けない。
export function ringPath(m, hw, hh, fx, fy, target) {
  const pts = [
    { x: m.cx, y: m.cy + hh }, { x: m.cx + hw, y: m.cy + hh },
    { x: m.cx + hw, y: m.cy }, { x: m.cx + hw, y: m.cy - hh },
    { x: m.cx, y: m.cy - hh }, { x: m.cx - hw, y: m.cy - hh },
    { x: m.cx - hw, y: m.cy }, { x: m.cx - hw, y: m.cy + hh },
  ];
  const near = (x, y) => pts.reduce((bi, p, i) =>
    Math.hypot(p.x - x, p.y - y) < Math.hypot(pts[bi].x - x, pts[bi].y - y) ? i : bi, 0);
  const a = near(fx, fy), z = near(target.x, target.y);
  if (a === z) return [];
  const n = pts.length, fwd = (z - a + n) % n, back = (a - z + n) % n, out = [];
  if (fwd <= back) for (let k = 1; k <= fwd; k++) out.push(pts[(a + k) % n]);
  else for (let k = 1; k <= back; k++) out.push(pts[(a - k + n) % n]);
  return out;
}

export function routeToGate(m, l, g, fx, fy) {
  const t = m.t, a = axisOf(l, g), o = m.layers[0];
  let ring;
  if (l.i === 0) {
    const out = o.masu + t + 8 + m.moat.band + 40;
    ring = { hw: o.hw + t + out, hh: o.hh + t + out };
  } else {
    const par = m.layers[l.i - 1];
    ring = { hw: Math.min(l.hw + t + g.masu + t + 36, par.hw - 28),
             hh: Math.min(l.hh + t + g.masu + t + 36, par.hh - 28) };
  }
  const entry = a.along === "x"
    ? { x: m.cx + gateOpenU(g), y: m.cy + a.sgn * ring.hh }
    : { x: m.cx + a.sgn * ring.hw, y: m.cy + gateOpenU(g) };
  // すでに門の近くにいるなら、外周へ回らずそのまま取り付く（破れた門を抜けるとき）
  const gp0 = gatePos(m, l, g);
  if (Math.hypot(fx - gp0.x, fy - gp0.y) < 190) {
    return [
      { ...fromUV(m, a, gateOpenU(g), a.half + t + g.masu + t + 10), r: 40 },
      { ...fromUV(m, a, g.off, a.half + t + g.masu / 2), r: 26 },
      { ...fromUV(m, a, g.off, a.half + t + 14), r: 22 },
    ];
  }
  // 城壁に貼りついているなら、まず外周まで退がる。でなければ壁に沿って擦るだけになる。
  const wp = [];
  let sx0 = fx, sy0 = fy;
  const dx0 = fx - m.cx, dy0 = fy - m.cy;
  if (Math.abs(dx0) < ring.hw - 6 && Math.abs(dy0) < ring.hh - 6) {
    const kk = 1 / Math.max(Math.abs(dx0) / ring.hw, Math.abs(dy0) / ring.hh, 1e-6);
    const back = { x: m.cx + dx0 * kk, y: m.cy + dy0 * kk, r: 80 };
    if (passable(back.x, back.y)) { wp.push(back); sx0 = back.x; sy0 = back.y; }
  }
  // 到達とみなす半径。城を回り込む地点は大まかに、虎口の中は細かく。
  wp.push(...ringPath(m, ring.hw, ring.hh, sx0, sy0, entry).map((q) => ({ ...q, r: 150 })));
  wp.push({ ...entry, r: 110 });
  wp.push({ ...fromUV(m, a, gateOpenU(g), a.half + t + g.masu + t + 10), r: 40 });
  wp.push({ ...fromUV(m, a, g.off, a.half + t + g.masu / 2), r: 26 });
  wp.push({ ...fromUV(m, a, g.off, a.half + t + 14), r: 22 });
  return wp;
}

// 目標の門まで、破れた門を順に抜けて至る道順。通り過ぎた地点は落とす。
export function routeToCastleGate(m, g, cx, cy) {
  const a = axisOf(m.layers[g.layer], g), t = m.t;
  // 虎口の開き口までを最短経路で。そこから先は門までの短い道筋。
  const open = fromUV(m, a, gateOpenU(g), a.half + t + g.masu + t + 12);
  const tail = [
    { ...fromUV(m, a, g.off, a.half + t + g.masu / 2), r: 24 },
    { ...fromUV(m, a, g.off, a.half + t + 14), r: 20 },
  ];
  if (Math.hypot(cx - open.x, cy - open.y) < 46) return tail;
  const path = navPath(m, cx, cy, open.x, open.y);
  if (!path) return tail;
  return [...path, ...tail];
}

export const gateReachable = (m, g) => g.layer === 0 || m.layers[g.layer - 1].gates.some((x) => x.broken);

// 抜けられる門のうち、いちばん内側の層を選ぶ。同じ層なら近いほう。
// 外周の門をいくつ破っても城は落ちない。破ったら中へ進むのが筋である。
export function nearestOpenGate(m, x, y) {
  const c = m.gates.filter((g) => !g.broken && gateReachable(m, g));
  if (!c.length) return null;
  const deepest = c.reduce((a, g) => Math.max(a, g.layer), 0);
  const inner = c.filter((g) => g.layer === deepest);
  return inner.sort((a, b) => {
    const pa = gatePos(m, m.layers[a.layer], a), pb = gatePos(m, m.layers[b.layer], b);
    return Math.hypot(pa.x - x, pa.y - y) - Math.hypot(pb.x - x, pb.y - y);
  })[0];
}
