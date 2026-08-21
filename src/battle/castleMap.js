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
  /* 「〜山城」と名乗っていても山城とは限らない。名の末で測る仕掛けが
     取り違える城を、名指しで直す。岡山も富山も、平地に近い城である。 */
  ishiyama_bz: "平山城", toyama: "平城", inuyama: "平山城",
  koriyama: "平山城", matsuyama_m: "平山城",
  tsutsujigasaki: "平城", nijo: "平城", kiyosu: "平城", nagoya: "平城",
  sunpu: "平城", edo: "平城", kofu: "平城",
};

/* ------------------------------------------------ 縄張り（GDD 9.3）

   曲輪の並べ方には三つの基本形がある。

     輪郭式 … 本丸を中心に、二の丸・三の丸が同心に取り巻く。四方に守りが
              等しく、平地の城に多い。二条城・駿府城・山形城・松本城。
     連郭式 … 本丸・二の丸・三の丸を一列に並べる。尾根の上の城は、
              峰の形がそのまま縄張りになるのでこの形をとる。
              月山富田城・七尾城・小谷城・春日山城・水戸城・備中松山城。
     梯郭式 … 本丸を一隅に寄せ、二方または三方だけを曲輪で囲む。
              残る二方は川・崖・海に預ける。岡山城・熊本城・会津黒川城。

   これに、渦を巻くように曲輪を継ぐ渦郭（螺旋）式を加える。姫路城・江戸城。

   これまではどの城も同心の三重であった。図の上でも戦の上でも、
   どの城も同じ形をしている。城の性根は縄張りにあるのだから、そこを分ける。

   名の知れた城は史実に伝わる形をあて、それ以外は構えから起こす。
   尾根の城は峰なりに連ね、丘の城は背を崖に預け、平地の城は同心に囲う。 */
const 縄張の例外 = {
  nijo: "輪郭式", sunpu: "輪郭式", yamagata: "輪郭式", fukashi: "輪郭式",
  ishiyama: "輪郭式", kishiwada: "輪郭式", tsutsujigasaki: "輪郭式",
  gassan: "連郭式", nanao: "連郭式", odani: "連郭式", kasugayama: "連郭式",
  kannonji: "連郭式", takeda: "連郭式", inabayama: "連郭式", takato: "連郭式",
  iwamura: "連郭式", mito: "連郭式", kozukata: "連郭式", matsuyama_bc: "連郭式",
  koriyama_a: "連郭式", tottori: "連郭式", shigisan: "連郭式",
  ishiyama_bz: "梯郭式", kumamoto: "梯郭式", kurokawa: "梯郭式",
  okazaki: "梯郭式", odawara: "梯郭式", oka: "梯郭式", hitoyoshi: "梯郭式",
  himeji: "渦郭式", edo: "渦郭式",
};

export function 城の縄張(castle, 構) {
  if (縄張の例外[castle.id]) return 縄張の例外[castle.id];
  /* 名の伝わらぬ城は構えから起こす。ただし一色にはしない。
     尾根の城でも一隅に本丸を置く城はあり、丘の城でも同心に囲う城はある。
     城の名から起こした数で振り分け、同じ城はいつも同じ形になるようにする。 */
  const h = Math.abs(String(castle.id || castle.name || "x").split("")
    .reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 5));
  if (構 === "山城") return h % 4 === 0 ? "梯郭式" : "連郭式";
  if (構 === "平山城") return h % 3 === 0 ? "輪郭式" : h % 3 === 1 ? "連郭式" : "梯郭式";
  return h % 5 === 0 ? "梯郭式" : "輪郭式";
}

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
      : { 縦横: 0.94 + rnd() * 0.26, 門: 0, 堀: 1.35, 広さ: 1.18, 空堀: false };
  const 横長 = rnd() < 0.5;                              // 尾根の向き
  const n = castle.def >= 64 ? 4 : castle.def >= 40 ? 3 : 2;
  const names = n === 4 ? ["惣構", "三の丸", "二の丸", "本丸"]
    : n === 3 ? ["惣構", "二の丸", "本丸"] : ["二の丸", "本丸"];
  /* 門の堅さは、城の防備（def）そのものである（GDD 9.3）。

     もとは「三百八十＋防備×八」であった。防備二十の城で五百四十、九十の城で
     千百――二倍しか違わない。土塁に板戸を掛けただけの砦と、石垣に鉄鋲を打った
     城門とが、ほぼ同じ手間で破れることになる。

     「百十＋防備×十六」に改める。防備二十で四百三十、九十で千五百五十。
     三倍半の開きがつく。低い城は容易に破れ、高い城は容易には破れない。
     普請で防備を上げることに、城攻めの上でも意味が出る。 */
  const base = 110 + castle.def * 16;
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
  const 帯 = (U.d * 1.5 + 74) * k * (0.86 + 癖.広さ * 0.2);
  const masu = 34 * k;

  /* 曲輪の寄せ（縄張り）。

     層は入れ子の矩形である。内側の層をどちらへ寄せるかで形が決まる。
       輪郭式 … 寄せない。同心に取り巻く
       連郭式 … 尾根の向きへ一列に寄せる。本丸は端に立つ
       梯郭式 … 縦横の両方へ寄せる。本丸は一隅に立ち、二方は崖に背を預ける
       渦郭式 … 層ごとに向きを九十度ずつ回す。曲輪が渦を巻く

     痩せる側の帯には歯止めが要る。虎口（門の枡形）が収まるだけでは足りない。
     隊は幅二百十六・奥行八十八の塊であるから、奥行きぶんの余地が無ければ
     曲輪の帯を通れず、壁に挟まれて左右に揺れる。測ったところ、帯を虎口ぶんまで
     詰めると隊の折り返しが一折り返し四十九歩から三十歩に増えた。

     そこで、寄せたぶんの半分だけ帯そのものを広げ、痩せた側にも隊一つぶんの
     道を残す。太った側はそのぶん広くなるので、縄張りの偏りは図の上でも判る。 */
  const 縄張 = 城の縄張(castle, 構);
  const 隙 = t * 2 + masu + U.d + 24;
  const 太 = 0.6;                                        // 寄せたぶん、帯をどれだけ広げるか
  const 寄 = 縄張 === "輪郭式" ? 0
    : Math.max(0, Math.min(帯 * 0.7, (帯 - 隙) / (1 - 太)));
  const band = 帯 + 寄 * 太;
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
    return { name, i, hw, hh, masu, gates, ox: 0, oy: 0 };
  });
  const 向x = rnd() < 0.5 ? 1 : -1, 向y = rnd() < 0.5 ? 1 : -1;
  const 渦 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  let ox = 0, oy = 0;
  layers.forEach((l, i) => {
    if (i > 0) {
      if (縄張 === "連郭式") { if (横長) ox += 寄 * 向x; else oy += 寄 * 向y; }
      else if (縄張 === "梯郭式") { ox += 寄 * 向x; oy += 寄 * 向y; }
      else if (縄張 === "渦郭式") {
        const d = 渦[(i - 1 + (種 % 4)) % 4];
        ox += 寄 * d[0]; oy += 寄 * d[1];
      }
    }
    l.ox = ox; l.oy = oy;
  });
  // 城内の施設。矢倉は曲輪の角、陣鐘櫓は曲輪の奥に一つ。
  const fac = [];
  layers.forEach((l, i) => {
    if (i >= layers.length - 1) return;
    /* 矢倉は曲輪の隅に立てるが、壁そのものには重ねない。

       これまでは隅（hw, hh）にちょうど据えていた。ところが castleTerrainAt は
       施設を壁より先に見るので、櫓の周り二十二歩ぶんが「櫓」になり、壁が消える。
       櫓は通れる地であるから、そこが穴になる。数えたところ、二百四十九城のうち
       二百三十五城は門を一つも破らずに本丸まで歩いて入れた。
       城攻めとは門を破ることなのだから、これでは城ではない。

       櫓を内へ二十四歩引き、壁に掛からぬようにする。
       曲輪の隅に立ち、寄せ手を射るという役目はそのままである。 */
    const 引 = 24;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      fac.push({ kind: "矢倉", name: `${l.name}矢倉${sy > 0 ? "南" : "北"}${sx > 0 ? "東" : "西"}`,
        x: l.ox + sx * Math.max(8, l.hw - 引), y: l.oy + sy * Math.max(8, l.hh - 引),
        r: 15, hp: 260 + castle.def * 3, max: 260 + castle.def * 3, layer: i, cool: 0 });
    }
    /* 陣鐘櫓は、層と層のあいだのいちばん広い帯に据える。
       曲輪を片寄せすると、北の帯が痩せて南が太る。細った側へ据えると
       櫓が壁に埋まってしまうので、その城でいちばん空いている側を選ぶ。 */
    const nx = layers[i + 1];
    const 帯 = [
      { x: (l.ox + nx.ox) / 2, y: (l.oy - l.hh + nx.oy - nx.hh) / 2, 幅: (nx.oy - nx.hh) - (l.oy - l.hh) },
      { x: (l.ox + nx.ox) / 2, y: (l.oy + l.hh + nx.oy + nx.hh) / 2, 幅: (l.oy + l.hh) - (nx.oy + nx.hh) },
      { x: (l.ox - l.hw + nx.ox - nx.hw) / 2, y: (l.oy + nx.oy) / 2, 幅: (nx.ox - nx.hw) - (l.ox - l.hw) },
      { x: (l.ox + l.hw + nx.ox + nx.hw) / 2, y: (l.oy + nx.oy) / 2, 幅: (l.ox + l.hw) - (nx.ox + nx.hw) },
    ].sort((a, z) => z.幅 - a.幅)[0];
    fac.push({ kind: "陣鐘櫓", name: `${l.name}陣鐘`, x: 帯.x, y: 帯.y,
      r: 14, hp: 200 + castle.def * 2, max: 200 + castle.def * 2, layer: i, cool: 0 });
  });
  // 中心は戦場を決めたあとに据える（施設は相対座標で持っておく）
  return { cx: 0, cy: 0, t, layers, moat: { band: 38 * k * 癖.堀, 空堀: 癖.空堀 }, n,
    構: 構, 縄張, 横長, 坂: 構 === "山城" ? 1 : 構 === "平山城" ? 0.55 : 0,
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
  /* 城の外に、寄せ手が展開して回り込めるだけの野を残す。

     野戦の盤を広げたついでに、ここも大きく広げてみた。ところが寄せ手が門へ
     取り付く前に日が暮れ、一万四千の兵で守兵五百の城を落とせなくなった。
     城攻めは門の押し合いであって、野を駆け回る戦ではない。元の広さに戻す。
     山城だけは坂のぶん、わずかに広く取る。 */
  const 余 = m.坂 >= 1 ? 0.68 : 0.6;
  FIELD.w = Math.round((ext.w + Math.max(m.unit.d * 2.4 + 160, ext.w * 余)) * 2);
  FIELD.h = Math.round((ext.h + Math.max(m.unit.d * 2.4 + 160, ext.h * 余)) * 2);
  m.cx = FIELD.w / 2; m.cy = FIELD.h / 2;
  for (const f of m.fac) { f.x += m.cx; f.y += m.cy; }   // 相対から絶対へ
  return m;
}

/* 寄せ手が構える所（GDD 9.3）。

   これまでは堀の際――門まで九十六歩の所に湧いて出ていた。野戦から移って
   来たのだから、まずは遠くに陣を敷き、そこから城へ寄せるのが順である。
   山城なら坂を登ることになり、足は鈍る。その間、櫓と狭間から矢と鉄砲を浴びる。

   構えるのは、堀の外に残された余地の七割ほど退がった所。盤の縁までは
   下がらない。縁に貼りつくと回り込む道が無くなって隊が重なるためである。
   同じ門を目指す二番手・三番手は、さらに退がって列を成す。 */
export function 寄せ口(m, gt, rank = 0) {
  const o = m.layers[0], a = axisOf(o, gt);
  const 外構 = m.moat.band + o.masu + m.t + 96;
  const 端 = (a.along === "x" ? FIELD.h : FIELD.w) / 2
    - Math.abs(a.along === "x" ? a.oy : a.ox);
  const 余地 = Math.max(0, 端 - (a.half + 外構));
  const back = 外構 + Math.min(余地 * 0.94, 余地 * 0.72 + rank * 76);
  const 横 = ((rank % 2) ? 1 : -1) * (rank ? 44 : 0);
  const p = fromUV(m, a, gateOpenU(gt) + 横, a.half + back);
  return { x: p.x, y: p.y, f: Math.atan2(m.cy - p.y, m.cx - p.x), 隔たり: back - a.half * 0 };
}

export const inRect = (dx, dy, hw, hh) => Math.abs(dx) <= hw && Math.abs(dy) <= hh;

// その曲輪の中にいるか。曲輪の寄せを差し引いて測る。
export const inLayer = (m, l, x, y, pad = 0) =>
  inRect(x - m.cx - (l.ox || 0), y - m.cy - (l.oy || 0), l.hw + pad, l.hh + pad);


/* 門は四方にあるので、壁沿いの座標 u と壁からの距離 v で扱う */
/* 門は四方にあるので、壁沿いの座標 u と壁からの距離 v で扱う。
   曲輪ごとに寄せ（ox, oy）があるので、軸にそれを載せて持ち回る。
   こうしておけば、門を扱う側は縄張りの形を知らずに済む。 */
export function axisOf(l, g) {
  const along = (g.face === "S" || g.face === "N") ? "x" : "y";
  return { along, half: along === "x" ? l.hh : l.hw, sgn: (g.face === "S" || g.face === "E") ? 1 : -1,
    ox: l.ox || 0, oy: l.oy || 0 };
}

export const toUV = (a, dx, dy) => {
  const ex = dx - (a.ox || 0), ey = dy - (a.oy || 0);
  return a.along === "x" ? { u: ex, v: ey * a.sgn } : { u: ey, v: ex * a.sgn };
};

export const fromUV = (m, a, u, v) =>
  a.along === "x" ? { x: m.cx + (a.ox || 0) + u, y: m.cy + (a.oy || 0) + a.sgn * v }
    : { x: m.cx + (a.ox || 0) + a.sgn * v, y: m.cy + (a.oy || 0) + u };

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
    const lx = dx - l.ox, ly = dy - l.oy;
    if (inRect(lx, ly, l.hw + t, l.hh + t) && !inRect(lx, ly, l.hw, l.hh)) {
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
  if (inRect(dx - inner.ox, dy - inner.oy, inner.hw, inner.hh)) return "honmaru";
  for (const l of m.layers) if (inRect(dx - l.ox, dy - l.oy, l.hw, l.hh)) return "kuruwa";
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
  /* 格子は二十二歩四方。ところが城壁は十歩しかない。
     升目の真ん中だけを見ていたので、壁は升目と升目のあいだをすり抜け、
     格子の上では城が壁を持たなかった。道を探せば壁を突っ切る道が見つかり、
     隊は行けもしない地点を目指して壁に貼りついていた。

     升目そのものを厳しく見ると（升目に少しでも壁が掛かれば通れぬ、とすると）、
     堀と塀のあいだの帯（五十歩ほど）が丸ごと塞がってしまい、城の周りを
     回ることさえできなくなる。塞ぐべきは升目ではなく、升目と升目の継ぎ目である。

     そこで、隣り合う升目を結ぶ線の上に五歩ごとの目を打ち、そこに壁があれば
     その継ぎ目だけを断つ。升目は真ん中で判ずるまま、壁は越えられなくなる。 */
  const CS = 22, 刻 = 5;
  const w = Math.ceil(FIELD.w / CS), h = Math.ceil(FIELD.h / CS);
  const ok = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      ok[j * w + i] = passable(i * CS + CS / 2, j * CS + CS / 2) ? 1 : 0;
    }
  }
  // 継ぎ目。eR は右隣へ、eD は下隣へ渡れるか
  const 渡れる = (x0, y0, x1, y1) => {
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 刻));
    for (let k = 1; k < n; k++) {
      if (!passable(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n)) return 0;
    }
    return 1;
  };
  const eR = new Uint8Array(w * h), eD = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      if (!ok[k]) continue;
      const x = i * CS + CS / 2, y = j * CS + CS / 2;
      if (i + 1 < w && ok[k + 1]) eR[k] = 渡れる(x, y, x + CS, y);
      if (j + 1 < h && ok[k + w]) eD[k] = 渡れる(x, y, x, y + CS);
    }
  }
  m.nav = { CS, w, h, ok, eR, eD };
  return m.nav;
}

export function navPath(m, x0, y0, x1, y1) {
  const nv = m.nav || buildNav(m);
  const { CS, w, h, ok, eR, eD } = nv;
  // 升目から升目へ渡れるか。壁を跨ぐ継ぎ目は断たれている。
  const 継 = (i, j, di, dj) => {
    if (di > 0 && !eR[j * w + i]) return false;
    if (di < 0 && !eR[j * w + i - 1]) return false;
    if (dj > 0 && !eD[j * w + i]) return false;
    if (dj < 0 && !eD[(j - 1) * w + i]) return false;
    return true;
  };
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
      if (di && dj) {
        // 斜めは、縦横どちらの回り道でも壁を跨がぬときだけ許す
        const 縦横 = 継(ci, cj, di, 0) && 継(ni, cj, 0, dj);
        const 横縦 = 継(ci, cj, 0, dj) && 継(ci, nj, di, 0);
        if (!縦横 && !横縦) continue;
      } else if (!継(ci, cj, di, dj)) continue;
      const cost = g[cur] + (di && dj ? Math.SQRT2 : 1);
      if (cost < g[nk]) { g[nk] = cost; prev[nk] = cur; open.push({ k: nk, f: cost + hOf(nk) }); }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let k = T; k !== -1; k = prev[k]) { cells.push(k); if (k === S) break; }
  cells.reverse();

  /* 曲がり角だけを残す。

     一度は「見通せる限り先まで結び直す（縄をたぐる）」を試した。階段状の道を
     まっすぐに直す常套手段であるが、測ってみると震えは却って増えた。
     一折り返しあたり三十.三歩が二十四.二歩、寄せの無い城でも四十九歩が
     二十一.六歩になる。道が長い直線になるぶん、隊は壁の角へ大きく寄りかかり、
     そこで滑って揺れる。城の中は角だらけなので、この手は合わない。捨てた。 */
  const pts = [];
  let lastDir = null;
  for (let n = 1; n < cells.length; n++) {
    const a2 = cells[n - 1], b2 = cells[n];
    const d = `${(b2 % w) - (a2 % w)},${((b2 / w) | 0) - ((a2 / w) | 0)}`;
    if (d !== lastDir) {
      lastDir = d;
      pts.push({ x: (a2 % w) * CS + CS / 2, y: ((a2 / w) | 0) * CS + CS / 2, r: 30 });
    }
  }
  pts.push({ x: x1, y: y1, r: 26 });
  return pts;
}


/* かつては城の外周を回り込む道順（ringPath / routeToGate）を持っていたが、
   同心の矩形を前提とした当て推量であって、縄張りを崩すと通らない。
   いまは城内も外周も navPath（格子の A*）で解いている。用の無いものは残さない。 */

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
