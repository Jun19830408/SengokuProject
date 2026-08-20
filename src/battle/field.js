import { MAP, castleTerrainAt } from "./castleMap.js";
import { clamp, makeRng } from "../core/util.js";

/* ==========================================================================
   戦闘エンジン
   ========================================================================== */
// 一方の陣に並べられる武将隊の数と、一隊が抱えられる兵の上限。
// 関ヶ原では東西あわせて六十余隊が参陣し、最大の隊（徳川家康の本隊）が約三万であった。
// 参加隊数は史料により差があるため、片軍32隊を上限とする。
export const MAX_CORPS = 32;

export const MAX_CORPS_MEN = 30000;


// 戦場の広さは兵数で決まる。大軍ほど広い野が要る。
export const BASE = { w: 1080, h: 720 };

export const FIELD = { w: 1080, h: 720 };

// 戦場の地形は街道ごとに決まる。両端の城の名から種を作り、毎回同じ野を再現する。
export const RIVER = { top: 0, bot: 0, bridge: [0, 0], ford: [0, 0], wave: 0, ph: 0, k: 1 };

// 川は蛇行する。判定も描画もこの一つの式から出す（見た目と当たりを食い違わせない）。
export function riverShift(x) {
  if (!RIVER.wave) return 0;
  return Math.sin(x * RIVER.k + RIVER.ph) * RIVER.wave;
}

export const FORESTS = [], WOODS = [], HILLS = [], MARSH = [];

/* 集落。野には人が住んでいる。

   いまのところ見た目だけのもので、地形としての効きは持たない
   （terrainAt は集落の上でも「平地」を返す）。屋根と生垣を描くだけである。
   隠れられる・馬の足が鈍る・焼ける、といった効きを持たせるなら、
   TERRAIN に一つ足し、terrainAt と AI の両方を直す要がある。 */
export const VILLAGES = [];

export let FIELD_SEED = 0;

// 城の名から種を作る（同じ街道なら何度戦っても同じ野になる）
export function seedOf(aId, bId) {
  const key = [String(aId || ""), String(bId || "")].sort().join("|");
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// 街道の性格から野を組み立てる（GDD 8.1）
export function genTerrain(seed) {
  const rnd = makeRng(seed);
  const W = FIELD.w, H = FIELD.h;
  RIVER.top = 0; RIVER.bot = 0; RIVER.bridge = [0, 0]; RIVER.ford = [0, 0]; RIVER.wave = 0;
  FORESTS.length = 0; WOODS.length = 0; HILLS.length = 0; MARSH.length = 0; VILLAGES.length = 0;
  const kind = rnd();
  // 川。六割の野に一本流れる。橋と浅瀬の位置も野ごとに違う。
  if (kind > 0.4) {
    /* 川と、その渡り場（GDD 8.1）。

       橋も浅瀬も、盤の幅の何割、として取っていた。標準の野が千八十歩だった
       ころは橋が八十九歩で、一隊の幅（二百十六歩）の半ばに満たない――
       つまり隘路であった。ところが野を広げたので、七千歩の野では橋が
       五百四十歩、一隊の二.五倍になった。隊がそのまま横に並んで渡れる橋は、
       もはや橋ではない。ただの平地である。

       橋は隘路でなければならない。盤がどれだけ広がろうと、板を渡した幅は
       変わらない。ほぼ絶対の寸法で取り、野の広さぶんは僅かに効かせるに留める。
       川幅も同じ考えで、際限なく広がらぬよう歯止めを入れる。 */
    const 幅倍 = clamp(Math.pow(W / 1080, 0.3), 1, 1.7);
    const cy = H * (0.36 + rnd() * 0.28);
    const wide = clamp(H * (0.045 + rnd() * 0.035), 52, 190);
    RIVER.top = Math.round(cy - wide / 2); RIVER.bot = Math.round(cy + wide / 2);
    const bw = (74 + rnd() * 26) * 幅倍;               // 橋。一隊の半ばに満たない
    const bx = W * (0.15 + rnd() * 0.7);
    RIVER.bridge = [Math.round(bx - bw / 2), Math.round(bx + bw / 2)];
    let fx = W * (0.1 + rnd() * 0.8);
    if (Math.abs(fx - bx) < W * 0.2) fx = bx > W / 2 ? bx - W * 0.28 : bx + W * 0.28;
    const fw = (150 + rnd() * 60) * 幅倍;              // 浅瀬。橋より広いが、なお狭い
    RIVER.ford = [Math.round(clamp(fx - fw / 2, 10, W - fw - 10)), 0];
    RIVER.ford[1] = Math.round(RIVER.ford[0] + fw);
    RIVER.wave = H * (0.02 + rnd() * 0.05);          // 蛇行の振れ
    RIVER.k = (1.4 + rnd() * 1.6) * Math.PI / W;     // 蛇行の細かさ
    RIVER.ph = rnd() * Math.PI * 2;
  }
  // 丘・森・林・湿地。数も場所も野ごとに違う。
  const put = (list, n, rMin, rMax) => {
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0, ok = false;
      const r0 = rMin + rnd() * (rMax - rMin);
      const mx = r0 + 24, my = r0 + 24;               // 盤からはみ出さない
      if (mx * 2 > W - 40 || my * 2 > H - 40) continue;
      for (let k = 0; k < 24 && !ok; k++) {
        x = mx + rnd() * (W - mx * 2); y = my + rnd() * (H - my * 2);
        // 川の上と、他の地形の上には置かない
        if (RIVER.bot > RIVER.top && y > RIVER.top - 40 && y < RIVER.bot + 40) continue;
        ok = ![...FORESTS, ...WOODS, ...HILLS, ...MARSH].some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r0 + 30);
      }
      if (ok) list.push({ x: Math.round(x), y: Math.round(y), r: Math.round(r0), seed: Math.floor(rnd() * 1e9) });
    }
  };
  /* 地物の大きさと数（GDD 8.1）。

     野の広さに合わせる。かつては一.六倍で頭打ちにしていた。標準の野が
     千八十歩だったころはそれでよかったが、隊数で野を広げたので、
     七千歩の野に百三十歩の丘が点在するという有様になった。
     遠目には見えず、隊の脇をすり抜けてしまう。

     頭打ちを外し、野の広さにそのまま比例させる。数も増やす。
     広い野に地物が二つ三つでは、ただ広いだけの原っぱである。
     回り込む目印になり、伏せる場所になり、拠って戦う高みになってこそ、
     広さが効いてくる。 */
  const sc = clamp(FIELD.w / 1080, 1, 4.6);
  /* 広い野には、必ずいくらか地物を置く。
     倍を掛けるだけでは、賽が零を出した野は七千歩の原っぱになる。
     見渡す限り何も無い野では、回り込む目印も、伏せる場所もない。 */
  const 底 = sc >= 2.4 ? 2 : sc >= 1.6 ? 1 : 0;
  const 数 = (基, 要) => Math.max(要 ? 底 : 0, Math.round(基 * (0.6 + sc * 0.62)));
  put(HILLS, 数(Math.floor(rnd() * 3), true), 80 * sc, 130 * sc);
  put(FORESTS, 数(Math.floor(rnd() * 4), true), 70 * sc, 115 * sc);
  put(WOODS, 数(Math.floor(rnd() * 3) + 1), 50 * sc, 85 * sc);
  put(MARSH, 数(rnd() > 0.6 ? 1 : 0), 65 * sc, 100 * sc);
  put(VILLAGES, 数(Math.floor(rnd() * 3)), 34 * sc, 58 * sc);

  /* 丘の高さ。裾の広い丘ほど高く盛り上がる。
     地形としてはどれも「丘」であって、効きは変わらない。見た目の起伏だけである。 */
  for (const h of HILLS) h.rise = Math.round(h.r * (0.20 + (h.seed % 100) / 100 * 0.14));
}

export const hasRiver = () => RIVER.bot > RIVER.top + 4;

export const hasHill = () => HILLS.length > 0;

export const hasForest = () => FORESTS.length > 0;

export const nearestOf = (list, x, y) => (list.length
  ? list.reduce((a, o) => (Math.hypot(o.x - x, o.y - y) < Math.hypot(a.x - x, a.y - y) ? o : a), list[0])
  : null);

export function layoutField(totalMen, 隊数) {
  /* 野の広さ（GDD 8.1）。

     兵数だけで決めていたが、それでは狭すぎた。五隊も出せば戦場が一杯になり、
     横に並べて前へ出るのが精一杯で、回り込むことも取っておくこともできない。

     戦の面白さは、兵の数ではなく隊の数で決まる。隊が多いほど、翼を伸ばし、
     伏せ、迂回する余地が要る。隊数でも広げる。

     三千人・二隊を標準とし、
       兵数の平方根に比例して広げ（大軍ほど広い野が要る）、
       隊数の平方根にも比例して広げる（五隊なら一.六倍、八隊なら二倍）。 */
  const 隊 = clamp(隊数 || 2, 2, 24);
  const 隊広 = Math.sqrt(隊 / 2);
  const w = clamp(Math.round(1180 * Math.sqrt(Math.max(600, totalMen) / 3000) * 隊広), 1100, 7200);
  const h = Math.round(w * 0.667);
  FIELD.w = w; FIELD.h = h;
  genTerrain(FIELD_SEED);
}

export function setFieldSeed(aId, bId) { FIELD_SEED = seedOf(aId, bId); }
layoutField(3000);


export const BLOCKED = { wall: 1, gate: 1 };

export function passable(x, y) { return !BLOCKED[terrainAt(x, y)]; }

// 城方は自分の城の門を通れる。ただし内へ入るときだけ（外へ出るのは「打って出る」）。
export function passableFor(c, b, x, y) {
  if (passable(x, y)) return true;
  if (!b || !b.map || !c || c.side === b.attacker) return false;
  if (c.sortie) return true;                      // 打って出ている間は外へも抜けられる
  if (terrainAt(x, y) !== "gate") return false;
  const m = b.map;
  return Math.hypot(x - m.cx, y - m.cy) < Math.hypot(c.x - m.cx, c.y - m.cy);
}


export function terrainAt(x, y) {
  if (MAP) return castleTerrainAt(x, y);
  if (hasRiver()) {
    const sh = riverShift(x);
    if (y > RIVER.top + sh && y < RIVER.bot + sh) {
      if (x > RIVER.bridge[0] && x < RIVER.bridge[1]) return "bridge";
      if (x > RIVER.ford[0] && x < RIVER.ford[1]) return "ford";
      return "deep";
    }
  }
  for (const f of FORESTS) if ((x - f.x) ** 2 + (y - f.y) ** 2 < f.r ** 2) return "forest";
  for (const f of WOODS) if ((x - f.x) ** 2 + (y - f.y) ** 2 < f.r ** 2) return "wood";
  for (const m of MARSH) if ((x - m.x) ** 2 + (y - m.y) ** 2 < m.r ** 2) return "marsh";
  for (const h of HILLS) if ((x - h.x) ** 2 + (y - h.y) ** 2 < h.r ** 2) return "hill";
  return "plain";
}

/* ------------------------------------------- 地物に踏み込んだか（GDD 8.6）

   これまでは一点で判じていた。組の代表点が川の帯に一歩でも掛かれば、その組は
   「川の中」となり、足が三割に落ち、陣形が十四削られる。組は五十人の塊であって
   点ではないのだから、爪先が水に触れただけで隊が渡渉しているとは言えない。

   林の縁をかすめただけで足が鈍り、隊が伸び、伸びたがゆえに隊全体が待たされる。
   盤の上では「避けて通ったはずなのに、なぜか遅い」としか見えなかった。

   そこで、組の踏み場（半径十三歩ほど）を見て、それが丸ごとその地に収まって
   初めて、その地にいると判ずる。爪先や踵が野に残っているうちは、まだ入って
   いない。地物の縁を十三歩ばかり内へ詰めた、と考えればよい。

   橋だけは別に扱う。橋は狭く、両脇はすぐ淵であるから、割で測れば決して
   「橋の上」にならない。芯が橋なら、渡っているのは橋である。

   城内（MAP）はこの限りではない。塀も門も堀も薄く、割で測れば消えてしまう。
   石垣の内と外は、一歩の違いが生死を分ける。点で判ずるままとする。 */
export const 踏み場 = 13;
export function 踏み込んだ地(x, y, r = 踏み場) {
  if (MAP) return terrainAt(x, y);
  const 芯 = terrainAt(x, y);
  if (芯 === "bridge") return 芯;
  let 外 = 0;
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI * k) / 3;
    if (terrainAt(x + Math.cos(a) * r, y + Math.sin(a) * r) !== 芯) 外++;
  }
  return 外 <= 1 ? 芯 : "plain";               // 踏み場がおおむね収まっていること
}

/* 隊がその地にかかっているか。

   隊長が踏み込んでいるか、隊の四割が踏み込んでいれば、隊はその地にかかっている。
   翼の一組が水を跳ねているだけでは、隊が川を渡っているとは言わない。 */
export const 隊のかかり = 0.4;
export function 隊の地(c) {
  const 芯 = c.地芯 !== undefined ? c.地芯 : 踏み込んだ地(c.x, c.y);
  if (芯 !== "plain") return 芯;                    // 隊長が踏み込んでいる
  let 総 = 0;
  const 別 = {};
  for (const q of c.squads || []) {
    if (q.men <= 0) continue;
    総 += q.men;
    const t = q.地 !== undefined ? q.地 : 踏み込んだ地(q.x, q.y);
    if (t !== "plain") 別[t] = (別[t] || 0) + q.men;
  }
  if (!総) return "plain";
  let 名 = "plain", 多 = 0;
  for (const k in 別) if (別[k] > 多) { 多 = 別[k]; 名 = k; }
  return 多 / 総 >= 隊のかかり ? 名 : "plain";
}

// 速度・戦闘力・陣形維持・視界・騎馬適性を一つの表で管理する（GDD 8.6）
export const TERRAIN = {
  plain: { speed: 1.0, fight: 1.0, cohesion: 0, sight: 260, horse: 1.0, charge: true, label: "平地" },
  forest: { speed: 0.65, fight: 0.85, cohesion: -6, sight: 95, horse: 0.6, charge: false, label: "森" },
  wood: { speed: 0.82, fight: 0.92, cohesion: -3, sight: 165, horse: 0.85, charge: true, label: "林" },
  marsh: { speed: 0.5, fight: 0.8, cohesion: -9, sight: 240, horse: 0.45, charge: false, label: "湿地" },
  hill: { speed: 0.7, fight: 1.15, cohesion: -2, sight: 360, horse: 0.8, charge: true, label: "丘" },
  bridge: { speed: 0.95, fight: 0.85, cohesion: -5, sight: 260, horse: 0.9, charge: false, label: "橋" },
  ford: { speed: 0.3, fight: 0.7, cohesion: -14, sight: 260, horse: 0.5, charge: false, label: "浅瀬" },
  deep: { speed: 0.1, fight: 0.5, cohesion: -24, sight: 260, horse: 0.25, charge: false, label: "深い川" },
  wall: { speed: 0.01, fight: 1.0, cohesion: 0, sight: 300, horse: 0.1, charge: false, label: "城壁" },
  gate: { speed: 0.01, fight: 1.0, cohesion: 0, sight: 300, horse: 0.1, charge: false, label: "城門" },
  gateopen: { speed: 0.8, fight: 0.75, cohesion: -12, sight: 200, horse: 0.6, charge: false, label: "破れた門" },
  moat: { speed: 0.28, fight: 0.65, cohesion: -16, sight: 260, horse: 0.3, charge: false, label: "堀" },
  // 空堀。水は無いが、切岸を登り降りせねばならない。水堀ほどではないが足は鈍る。
  karabori: { speed: 0.42, fight: 0.78, cohesion: -10, sight: 260, horse: 0.45, charge: false, label: "空堀" },
  /* 峰の坂（GDD 9.3）。山城の外はこれである。
     駆け上がる側の足は半ばに落ち、隊列も崩れる。守る側は上から見下ろす。 */
  sakamichi: { speed: 0.52, fight: 0.86, cohesion: -8, sight: 300, horse: 0.5, charge: false, label: "坂" },
  surface: { speed: 0.82, fight: 0.95, cohesion: -3, sight: 280, horse: 0.85, charge: true, label: "緩斜面" },
  bridge2: { speed: 0.9, fight: 0.8, cohesion: -6, sight: 260, horse: 0.85, charge: false, label: "土橋" },
  tower: { speed: 0.55, fight: 1.3, cohesion: -2, sight: 430, horse: 0.3, charge: false, label: "櫓" },
  kuruwa: { speed: 0.92, fight: 1.0, cohesion: -3, sight: 210, horse: 0.75, charge: true, label: "曲輪" },
  honmaru: { speed: 0.88, fight: 1.12, cohesion: -3, sight: 230, horse: 0.7, charge: false, label: "本丸" },
};

// 天候（GDD 8.8：悪天候は疲労を増やす）
export const WEATHER = {
  晴: { sight: 1.0, speed: 1.0, fatigue: 1.0, teppo: 1.0, note: "視界も足場も良い。" },
  曇: { sight: 0.9, speed: 1.0, fatigue: 1.05, teppo: 1.0, note: "遠くが見えにくい。" },
  雨: { sight: 0.72, speed: 0.85, fatigue: 1.45, teppo: 0.12, note: "火縄が湿り、鉄砲がほぼ使えない。足場も悪い。" },
};

export const ARM_STATS = {
  yari: { melee: 1.2, range: 0, rof: 0, vol: 0, speed: 34, color: "#6E7A55", label: "槍" },
  yumi: { melee: 0.45, range: 190, rof: 1.5, vol: 1.0, speed: 34, color: "#7E9A52", label: "弓" },
  teppo: { melee: 0.4, range: 150, rof: 4.2, vol: 3.2, speed: 30, color: "#B07B3A", label: "鉄砲" },
  kiba: { melee: 1.9, range: 0, rof: 0, vol: 0, speed: 56, color: "#A2604A", label: "騎馬" },
};

// 戦場の広さは兵数と城の規模で変わる。指揮圏と伝令もそれに合わせて伸ばす。
// これを怠ると、広い戦場では隊が軒並み指揮圏外になり、命令が届かなくなる。
export const fieldScale = () => Math.max(1, FIELD.w / BASE.w);
