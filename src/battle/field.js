import { MAP, castleTerrainAt } from "./castleMap.js";
import { clamp, makeRng } from "../core/util.js";

/* ==========================================================================
   戦闘エンジン
   ========================================================================== */
// 一方の陣に並べられる武将隊の数と、一隊が抱えられる兵の上限。
// 関ヶ原では東西あわせて六十余隊が参陣し、最大の隊（徳川家康の本隊）が約三万であった。
// 参加隊数は史料により差があるため、片軍32隊を上限とする。
export const MAX_CORPS = 32;

/* ただし筋書きのある一戦（関ヶ原など）はこの限りではない。
   布陣は史実で決まっており、東軍だけで三十四隊ある。kassen.js が直に組む。 */

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

/* 山（GDD 8.1）。

   盤には丘しか無かった。丘は「少し高いところ」であって、山ではない。
   南宮山のような四百mの山も、笹尾山の六十mの比高も、同じ「丘」として
   置くほかなかった。山越えの街道で戦っても、野に丘が二つ三つ立つだけである。

   山は丘とは別の地物とする。足は丘よりさらに鈍り（丘〇.七に対し〇.四二）、
   隊列は崩れ、騎馬はほとんど使えない。そのかわり登り切れば遠くまで見通せ、
   上から当たる強みは丘より大きい。道さがしは山を強く避ける――避けきれぬときは
   越えるが、それは軍勢にとって難儀な選択である。 */
export const MOUNTAINS = [];

/* この野を結ぶ街道の質（街道・山道・難所）。山が立つか否かはこれで決まる。 */
export let 道の質 = "街道";
export function setFieldKind(kind) { 道の質 = kind || "街道"; }

/* 街道（GDD 8.1）。

   この野は「二つの城を結ぶ街道の途中」である。種も両端の城名から作っている。
   ところが盤には道が無く、川と橋だけがあった。人の通う土地に見えないし、
   軍勢が道を辿って進むという、いちばん当たり前の姿も描けない。

   道は野を縦に貫き、川があれば橋で渡る。踏み固められた土であるから足が僅かに
   速く、道さがしもここを好んで通る（route.js の 通りにくさ）。 */
export const ROAD = { 節: [], 幅: 0 };

/* 街道は一本とは限らない（GDD 8.1）。

   街道ごとに作る野は一本で足りる。ところが筋書き（関ヶ原のような決まった戦場）
   には、中山道・北国街道・伊勢街道が交わっている。道を束で持てるようにする。
   街道ごとの野では、この束に ROAD ひとつが入る。 */
export const ROADS = [];

/* 折れ線の川（GDD 8.1）。

   街道ごとの野の川は、盤を横切る一本の帯（RIVER）である。筋書きの野では
   川が曲がり、幾筋にも分かれ、渡し場が決まった所にある。帯では表せない。 */
export const RIVERS = [];

// 点から道までの隔たり（線分の集まりとして測る）
export const 道までの隔たり = (x, y) => 節までの隔たり(ROAD.節, x, y);

export const 道の上か = (x, y) => {
  for (const r of ROADS) if (r.幅 > 0 && 節までの隔たり(r.節, x, y) < r.幅 / 2) return true;
  return false;
};

/* 折れ線までの隔たり（道までの隔たり の中身をそのまま切り出したもの） */
export function 節までの隔たり(節, x, y) {
  if (!節 || 節.length < 2) return Infinity;
  let best = Infinity;
  for (let i = 0; i < 節.length - 1; i++) {
    const a = 節[i], b = 節[i + 1];
    const vx = b.x - a.x, vy = b.y - a.y;
    const L = vx * vx + vy * vy;
    let t2 = L ? ((x - a.x) * vx + (y - a.y) * vy) / L : 0;
    t2 = t2 < 0 ? 0 : t2 > 1 ? 1 : t2;
    const dx = x - (a.x + vx * t2), dy = y - (a.y + vy * t2);
    const d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/* 集落。野には人が住んでいる。

   長らく見た目だけのものであったが、地形として効かせることにした。
   垣と屋根と畦が入り組んでいるので足は鈍り、隊列も少し乱れる。
   そのかわり身を隠せる（見通しが平地の半ばに落ちる）。
   委任した隊は、林や森と同じく、好んでは入らない。 */
export const VILLAGES = [];

export let FIELD_SEED = 0;

/* 野を組み直した回数。道さがしの網（route.js）は、これが変わったら張り直す。
   盤の広さだけを見ていると、同じ広さで地形だけ変わったときに古い網が残る。 */
let 代 = 0;
export const 地形の代 = () => 代;

// 城の名から種を作る（同じ街道なら何度戦っても同じ野になる）
export function seedOf(aId, bId) {
  const key = [String(aId || ""), String(bId || "")].sort().join("|");
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// 街道の性格から野を組み立てる（GDD 8.1）
export function genTerrain(seed) {
  代++;
  const rnd = makeRng(seed);
  const W = FIELD.w, H = FIELD.h;
  RIVER.top = 0; RIVER.bot = 0; RIVER.bridge = [0, 0]; RIVER.ford = [0, 0]; RIVER.wave = 0;
  FORESTS.length = 0; WOODS.length = 0; HILLS.length = 0; MARSH.length = 0; VILLAGES.length = 0;
  MOUNTAINS.length = 0;
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
  /* 置き直しの数（試み）は、既にある野を変えぬよう二十四のままとする。
     ここを増やすと賽の流れがずれ、街道の通る筋まで変わってしまう
     （それに気づかず、味方をすり抜けぬ試験が 24→107 に崩れた）。
     山だけは裾が広くて置き場を探しにくいので、山のときだけ多く試す。 */
  const put = (list, n, rMin, rMax, 丸ごと外へ, 試み = 24) => {
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0, ok = false;
      const r0 = rMin + rnd() * (rMax - rMin);
      const mx = r0 + 24, my = r0 + 24;               // 盤からはみ出さない
      if (mx * 2 > W - 40 || my * 2 > H - 40) continue;
      for (let k = 0; k < 試み && !ok; k++) {
        x = mx + rnd() * (W - mx * 2); y = my + rnd() * (H - my * 2);
        /* 川の上と、他の地形の上には置かない。

           川を避けるのに、中どころだけを見ていた。丘や森ならそれでよい――
           裾が岸に届くくらいは、むしろ野の姿である。ところが裾の広い山は、
           中どころが川から離れていても裾が川を跨ぐ。絵の上では川が山を貫いて
           流れ、地形としても山の中に淵があるという有様になった。
           山だけは、丸ごと川の外にあることを求める。 */
        const 際 = 丸ごと外へ ? r0 + 24 : 40;
        if (RIVER.bot > RIVER.top
          && y + 際 > RIVER.top - (丸ごと外へ ? RIVER.wave : 0)
          && y - 際 < RIVER.bot + (丸ごと外へ ? RIVER.wave : 0)) continue;
        ok = ![...FORESTS, ...WOODS, ...HILLS, ...MOUNTAINS, ...MARSH].some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r0 + 30);
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
  /* 山を立てる（GDD 8.1）。

     山越えの街道でのみ立つ。山道なら一つ、難所なら二つ。
     丘より一回り大きいので、ほかの地物より先に場所を取る――後から入れると
     置き場が残っていない。野の四分の一を塞ぐほどには大きくしない。
     塞いでしまえば戦場ではなく廊下になる。 */
  {
    const 数山 = 道の質 === "難所" ? 2 : 道の質 === "山道" ? 1 : 0;
    const 前 = HILLS.length;
    /* 山の裾は野の高さに縛る。野の半ばを埋める山は、戦場ではなく壁である。 */
    const 裾小 = clamp(120 * sc, 130, H * 0.145), 裾大 = clamp(175 * sc, 190, H * 0.205);
    if (数山) put(HILLS, 数山, 裾小, Math.max(裾小 + 10, 裾大), true, 60);
    for (const m of HILLS.splice(前)) {
      m.高 = Math.round(180 + (m.seed % 100) * 2.4);   // 比高の目安（m）。絵の起伏に使う
      m.rise = Math.round(m.r * 0.34);
      MOUNTAINS.push(m);
    }
  }
  put(HILLS, 数(Math.floor(rnd() * 3), true), 80 * sc, 130 * sc);
  put(FORESTS, 数(Math.floor(rnd() * 4), true), 70 * sc, 115 * sc);
  put(WOODS, 数(Math.floor(rnd() * 3) + 1), 50 * sc, 85 * sc);
  put(MARSH, 数(rnd() > 0.6 ? 1 : 0), 65 * sc, 100 * sc);
  put(VILLAGES, 数(Math.floor(rnd() * 3)), 34 * sc, 58 * sc);

  /* 丘の高さ。裾の広い丘ほど高く盛り上がる。
     地形としてはどれも「丘」であって、効きは変わらない。見た目の起伏だけである。 */
  for (const h of HILLS) h.rise = Math.round(h.r * (0.20 + (h.seed % 100) / 100 * 0.14));

  /* 街道を通す（GDD 8.1）。

     野を南北に貫く。川があれば橋で渡る――橋は元よりその街道のためにある。
     道幅は隊の幅より狭い。軍勢は道に沿って伸び、はみ出して野を行く。

     曲がりは二つ三つで足りる。真っすぐな道は人の手のものに見えず、曲がりすぎる
     道は野を分断する。丘があれば裾を巻き、森があれば縁を掠める。 */
  ROAD.節.length = 0;
  ROADS.length = 0; ROADS.push(ROAD);
  RIVERS.length = 0;
  ROAD.幅 = Math.round(clamp(36 * Math.sqrt(sc), 34, 86));
  if (RIVER.bot > RIVER.top) {
    // 道は橋より狭くなければならない。道幅のまま橋へ入れば、両端は水である。
    ROAD.幅 = Math.min(ROAD.幅, Math.max(24, (RIVER.bridge[1] - RIVER.bridge[0]) - 10));
  }
  {
    const 渡り = RIVER.bot > RIVER.top
      ? (RIVER.bridge[0] + RIVER.bridge[1]) / 2
      : W * (0.3 + rnd() * 0.4);
    const 南 = clamp(渡り + (rnd() - 0.5) * W * 0.3, W * 0.12, W * 0.88);
    const 北 = clamp(渡り + (rnd() - 0.5) * W * 0.3, W * 0.12, W * 0.88);
    const 川中 = RIVER.bot > RIVER.top ? (RIVER.top + RIVER.bot) / 2 : H * 0.5;
    /* 曲がりは、川へ近づくほど小さくする。橋の袂で道が揺れていては、道を辿った
       軍勢が橋から外れて淵へ踏み込む。渡り場へは真っすぐ入るのが道というものである。 */
    const 曲 = (y0, y1, x0, x1, n) => {
      const 出 = [];
      for (let i = 1; i < n; i++) {
        const u = i / n;
        const 川寄り = 1 - u;                      // 一に近いほど川から遠い
        const 揺 = (rnd() - 0.5) * W * 0.06 * 川寄り * 川寄り;
        出.push({ x: clamp(x0 + (x1 - x0) * u + 揺, 20, W - 20), y: y0 + (y1 - y0) * u });
      }
      return 出;
    };
    /* 渡り場の手前後は、道を真っすぐ立てる。橋に対して斜めに入る道は無い。 */
    const 川幅 = RIVER.bot > RIVER.top ? (RIVER.bot - RIVER.top) : 60;
    ROAD.節.push({ x: 南, y: H + 30 });
    ROAD.節.push(...曲(H + 30, 川中 + 川幅 * 1.6, 南, 渡り, 3));
    ROAD.節.push({ x: 渡り, y: 川中 + 川幅 * 1.6 });
    ROAD.節.push({ x: 渡り, y: 川中 - 川幅 * 1.6 });
    ROAD.節.push(...曲(川中 - 川幅 * 1.6, -30, 渡り, 北, 3));
    ROAD.節.push({ x: 北, y: -30 });
  }
}

/* ========================================================================== 
   筋書きの野（GDD 8.1）

   関ヶ原のような「決まった戦場」は、街道ごとに賽で組む野とは作りが違う。
   山も川も道も、実際の土地から写し取った形で置く。

   ところが terrainAt は、呼ばれるたびに地物を一つずつ当たっている。円が
   四十、川の折れ線が六十節ともなれば、一度の問い合わせに百五十からの
   勘定が要る。組は三千を超え、刻ごとに七度ずつ問うのだから、これでは
   一こま七十ミリ秒――戦が動かない。

   そこで、筋書きの野だけは地形を升目に焼いておく。十歩四方の升に地物の名を
   一つ入れ、問い合わせは升を引くだけにする。焼くのは戦の初めに一度きりで、
   地物の側から升を塗るので、野の広さなりの手間で済む。
   ========================================================================== */
const 格種 = ["plain", "road", "forest", "wood", "marsh", "mountain", "hill", "village", "deep", "ford", "bridge"];
export let 地形格 = null;

function 野を焼く(ce = 10) {
  const gw = Math.ceil(FIELD.w / ce), gh = Math.ceil(FIELD.h / ce);
  const d = new Uint8Array(gw * gh);
  const 丸 = (o, v) => {
    const x0 = Math.max(0, Math.floor((o.x - o.r) / ce)), x1 = Math.min(gw - 1, Math.ceil((o.x + o.r) / ce));
    const y0 = Math.max(0, Math.floor((o.y - o.r) / ce)), y1 = Math.min(gh - 1, Math.ceil((o.y + o.r) / ce));
    const rr = o.r * o.r;
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      const cx = i * ce + ce / 2, cy = j * ce + ce / 2;
      if ((cx - o.x) ** 2 + (cy - o.y) ** 2 <= rr) d[j * gw + i] = v;
    }
  };
  const 帯 = (節, 幅, v) => {
    const h2 = 幅 / 2;
    for (let k = 0; k + 1 < 節.length; k++) {
      const a = 節[k], b = 節[k + 1];
      const x0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - h2) / ce)), x1 = Math.min(gw - 1, Math.ceil((Math.max(a.x, b.x) + h2) / ce));
      const y0 = Math.max(0, Math.floor((Math.min(a.y, b.y) - h2) / ce)), y1 = Math.min(gh - 1, Math.ceil((Math.max(a.y, b.y) + h2) / ce));
      const vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy;
      for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
        const cx = i * ce + ce / 2, cy = j * ce + ce / 2;
        let t2 = L ? ((cx - a.x) * vx + (cy - a.y) * vy) / L : 0;
        t2 = t2 < 0 ? 0 : t2 > 1 ? 1 : t2;
        if ((cx - (a.x + vx * t2)) ** 2 + (cy - (a.y + vy * t2)) ** 2 <= h2 * h2) d[j * gw + i] = v;
      }
    }
  };
  /* 塗る順は「弱い地物から」。後から塗ったものが上に来る。
     山は森より上に置く――木の生えた山は、やはり山である。
     川はすべての上を流れ、渡し場（橋・浅瀬）はその川の上に架かる。 */
  for (const o of VILLAGES) 丸(o, 7);
  for (const o of HILLS) 丸(o, 6);
  for (const o of MARSH) 丸(o, 4);
  for (const o of WOODS) 丸(o, 3);
  for (const o of FORESTS) 丸(o, 2);
  for (const o of MOUNTAINS) 丸(o, 5);
  for (const r of ROADS) 帯(r.節, r.幅, 1);
  for (const r of RIVERS) 帯(r.節, r.幅, 8);
  for (const r of RIVERS) for (const w of r.渡し || []) 丸(w, w.種 === "橋" ? 10 : 9);
  return { ce, w: gw, h: gh, d };
}

/* 筋書きから野を組む。地物はすべて写し取った形で渡される。 */
export function 筋書きの野を組む(地) {
  代++;
  FIELD.w = 地.w; FIELD.h = 地.h;
  setFieldKind("街道");
  RIVER.top = 0; RIVER.bot = 0; RIVER.bridge = [0, 0]; RIVER.ford = [0, 0]; RIVER.wave = 0;
  FORESTS.length = 0; WOODS.length = 0; HILLS.length = 0; MARSH.length = 0;
  VILLAGES.length = 0; MOUNTAINS.length = 0; RIVERS.length = 0; ROADS.length = 0;
  const 種付 = (o, i) => ({ seed: ((o.x | 0) * 7919 + (o.y | 0) * 31 + i) >>> 0, ...o });
  (地.村 || []).forEach((o, i) => VILLAGES.push(種付(o, i)));
  (地.丘 || []).forEach((o, i) => HILLS.push({ ...種付(o, i), rise: o.rise || Math.round(o.r * 0.24) }));
  (地.沼 || []).forEach((o, i) => MARSH.push(種付(o, i)));
  (地.林 || []).forEach((o, i) => WOODS.push(種付(o, i)));
  (地.森 || []).forEach((o, i) => FORESTS.push(種付(o, i)));
  (地.山 || []).forEach((o, i) => MOUNTAINS.push({ ...種付(o, i), rise: o.rise || Math.round(o.r * 0.34) }));
  (地.道 || []).forEach((r) => ROADS.push({ 名: r.名, 節: r.節, 幅: r.幅 || 60 }));
  (地.川 || []).forEach((r) => RIVERS.push({ 名: r.名, 節: r.節, 幅: r.幅 || 40, 渡し: r.渡し || [] }));
  ROAD.節.length = 0; ROAD.幅 = 0;
  地形格 = 野を焼く(地.升 || 10);
}

/* 筋書きを畳む。街道ごとの野に戻す（升目を捨てる）。 */
export function 筋書きを解く() { 地形格 = null; RIVERS.length = 0; }

export const hasRiver = () => RIVER.bot > RIVER.top + 4;

export const hasHill = () => HILLS.length > 0;

export const hasMountain = () => MOUNTAINS.length > 0;

/* 山が見通しを遮るか（GDD 8.6）。

   丘や林は「そこに立つと遠くが見える／見えない」という地形であった。
   山は、そこに立たなくとも、向こう側を隠す。山の陰に回った隊は、
   麓の敵から見えない――これが伏せるということである。

   ただし、どちらかが山の上にいるなら遮られない。上から見下ろしているのに
   「山があるから見えない」では話が逆である。 */
export function 山が遮るか(x1, y1, x2, y2) {
  if (!MOUNTAINS.length) return false;
  /* どちらかが山に立っているなら、何も遮らない。
     山は幾つかの円を重ねて一つの尾根を作ることがあるので、「この円の中か」では
     なく「山の地に立っているか」で見る（南宮山の一峰に立つと、同じ南宮山の
     別の峰が視界を塞ぐ、という妙なことになっていた）。 */
  if (terrainAt(x1, y1) === "mountain" || terrainAt(x2, y2) === "mountain") return false;
  for (const m of MOUNTAINS) {
    const r = m.r * 0.82;                       // 頂の近くだけが本当に遮る
    const vx = x2 - x1, vy = y2 - y1, L = vx * vx + vy * vy;
    if (L <= 0) continue;
    let t = ((m.x - x1) * vx + (m.y - y1) * vy) / L;
    if (t <= 0 || t >= 1) continue;             // 線分の外に山がある
    const dx = m.x - (x1 + vx * t), dy = m.y - (y1 + vy * t);
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

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
  if (地形格) {                                   // 筋書きの野は升目を引くだけ
    const g = 地形格;
    const i = x < 0 ? 0 : x >= FIELD.w ? g.w - 1 : (x / g.ce) | 0;
    const j = y < 0 ? 0 : y >= FIELD.h ? g.h - 1 : (y / g.ce) | 0;
    return 格種[g.d[j * g.w + i]];
  }
  if (hasRiver()) {
    const sh = riverShift(x);
    if (y > RIVER.top + sh && y < RIVER.bot + sh) {
      if (x > RIVER.bridge[0] && x < RIVER.bridge[1]) return "bridge";
      if (x > RIVER.ford[0] && x < RIVER.ford[1]) return "ford";
      return "deep";
    }
  }
  if (道の上か(x, y)) return "road";                     // 街道は切り開かれている
  for (const f of FORESTS) if ((x - f.x) ** 2 + (y - f.y) ** 2 < f.r ** 2) return "forest";
  for (const f of WOODS) if ((x - f.x) ** 2 + (y - f.y) ** 2 < f.r ** 2) return "wood";
  for (const m of MARSH) if ((x - m.x) ** 2 + (y - m.y) ** 2 < m.r ** 2) return "marsh";
  for (const m of MOUNTAINS) if ((x - m.x) ** 2 + (y - m.y) ** 2 < m.r ** 2) return "mountain";
  for (const h of HILLS) if ((x - h.x) ** 2 + (y - h.y) ** 2 < h.r ** 2) return "hill";
  for (const v of VILLAGES) if ((x - v.x) ** 2 + (y - v.y) ** 2 < v.r ** 2) return "village";
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
  /* 街道。踏み固められた土で、隊列を崩さずに速く進める。戦う力は野と変わらない。 */
  road: { speed: 1.08, fight: 1.0, cohesion: 1, sight: 270, horse: 1.1, charge: true, label: "街道" },
  forest: { speed: 0.65, fight: 0.85, cohesion: -6, sight: 95, horse: 0.6, charge: false, label: "森" },
  wood: { speed: 0.82, fight: 0.92, cohesion: -3, sight: 165, horse: 0.85, charge: true, label: "林" },
  marsh: { speed: 0.5, fight: 0.8, cohesion: -9, sight: 240, horse: 0.45, charge: false, label: "湿地" },
  hill: { speed: 0.7, fight: 1.15, cohesion: -2, sight: 360, horse: 0.8, charge: true, label: "丘" },
  /* 山。丘の一段上。登るのに難儀し、隊列は崩れ、騎馬は用をなさない。
     そのかわり見晴らしは野の倍近く、上から当たる強みも丘より大きい。 */
  mountain: { speed: 0.42, fight: 1.28, cohesion: -7, sight: 470, horse: 0.35, charge: false, label: "山" },
  village: { speed: 0.78, fight: 0.95, cohesion: -3, sight: 130, horse: 0.7, charge: false, label: "集落" },
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
