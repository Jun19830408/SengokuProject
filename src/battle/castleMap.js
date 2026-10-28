import { ROW, SP } from "./corps.js";
import { FIELD, FIELD_SEED, ROAD, genTerrain, passable, terrainAt, 尺を据える } from "./field.js";
import { 野の道 } from "./route.js";
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
  /* 城の中の普請（GDD 9.3）。

     曲輪の中が空き地のままであった。城とは石垣と門だけのものではない――御殿があり、
     蔵が並び、井戸があり、馬屋がある。城攻めの図は何度も見る画面であるから、
     中身があるかないかで印象が大きく違う。

     これは絵だけのものである（当たりにも、門の押し合いにも関わらない）。
     施設（矢倉・陣鐘櫓）と混ぜぬよう、別の控えに置く。 */
  const 普請 = [];
  {
    const 奥 = layers[layers.length - 1];                 // 本丸
    const 二 = layers.length >= 2 ? layers[layers.length - 2] : null;
    /* 寸法は曲輪から取る。城の大きさはそのまま曲輪の大きさだからである。 */
    if (奥 && 奥.hw > 40 && 奥.hh > 40) {
      普請.push({ kind: "御殿", x: 奥.ox, y: 奥.oy + 奥.hh * 0.10,
        w: 奥.hw * 0.92, h: 奥.hh * 0.58 });
      普請.push({ kind: "蔵", x: 奥.ox - 奥.hw * 0.58, y: 奥.oy - 奥.hh * 0.58,
        w: 奥.hw * 0.30, h: 奥.hh * 0.20 });
      普請.push({ kind: "井戸", x: 奥.ox + 奥.hw * 0.56, y: 奥.oy - 奥.hh * 0.54,
        w: Math.min(奥.hw, 奥.hh) * 0.12, h: Math.min(奥.hw, 奥.hh) * 0.12 });
    }
    if (二 && 二.hw > 60 && 二.hh > 60) {
      普請.push({ kind: "馬屋", x: 二.ox - 二.hw * 0.72, y: 二.oy + 二.hh * 0.70,
        w: 二.hw * 0.40, h: 二.hh * 0.12 });
      普請.push({ kind: "蔵", x: 二.ox + 二.hw * 0.74, y: 二.oy + 二.hh * 0.66,
        w: 二.hw * 0.22, h: 二.hh * 0.10 });
      普請.push({ kind: "蔵", x: 二.ox + 二.hw * 0.74, y: 二.oy + 二.hh * 0.48,
        w: 二.hw * 0.22, h: 二.hh * 0.10 });
    }
  }
  const moat = { band: 38 * k * 癖.堀, 空堀: 癖.空堀 };
  /* 出城（下の 出城を組む）。普請を終えた城にだけ立つ。矢倉は施設と同じ控えに入れる */
  const 出城 = castle.出城 ? 出城を組む(castle, layers, moat, t, U, k) : null;
  if (出城) {
    for (const sx of [-1, 1]) {
      fac.push({ kind: "矢倉", name: `${出城.name}矢倉${sx > 0 ? "東" : "西"}`, 出城: true,
        x: 出城.ox + sx * (出城.hw - 22), y: 出城.oy + 出城.hh - 22,
        r: 13, hp: 260 + castle.def * 3, max: 260 + castle.def * 3, layer: 0, cool: 0 });
    }
  }
  // 中心は戦場を決めたあとに据える（施設は相対座標で持っておく）
  return { cx: 0, cy: 0, t, layers, moat, n, 普請, 出城,
    構: 構, 縄張, 横長, 坂: 構 === "山城" ? 1 : 構 === "平山城" ? 0.55 : 0,
    gates: layers.flatMap((l) => l.gates), fac, unit: U };
}

/* ------------------------------------------------ 出城（GDD 9.3）

   遊ぶ側の申し出は「付城などは面白い（例えば、真田丸的なものができるとも思います）。
   大阪の冬の陣のように野戦で負けても真田丸を中心に戦って撃退することも考えられる。
   政務フェーズで付け城などを建設できるようになるのもいい」であった。

   出城は、大手の堀の外に築く小さな曲輪である。空堀を回し、土塁に塀を載せ、
   前（南）に門を一つ、前の隅に矢倉を二つ立てる。背（城の側）には木戸を構え、
   守り手が大手の土橋へ引き取れるようにしておく（寄せ手はこの木戸を通れない）。

     据え所 … 大手の土橋の脇。大手へ寄せる道は、出城の横腹の前を通る
     寸法   … 中に一隊（三千）が構えられるだけ
     名     … 「出城」とだけ呼ぶ（遊ぶ側の申し出は「〇〇丸は変なので、出城でいい」であった）

   出城は層（曲輪）とは別に持つ。層は入れ子の矩形で、内へ行くほど深い――その
   決まりの上に城攻めの順（門を破れば次の輪へ）が乗っているので、出城を層に
   混ぜると崩れる。門だけは層の門と同じ形（face, off, w, hp, broken…）で持ち、
   門の輪（m, g）が層の代わりに出城を返す。出城の門の layer は −1 とする
   （どの層よりも外。内の門へ下がる勘定がそのまま通る）。 */
function 出城を組む(castle, layers, moat, t, U, k) {
  const o = layers[0];
  const 大手 = o.gates.find((g) => g.face === "S") || o.gates[0];
  if (!大手) return null;
  const 名 = "出城";                  // 古い記録に「〇〇丸」の名が残っていても、盤では「出城」と呼ぶ
  const hw = Math.round(U.w * 0.68), hh = Math.round(U.d * 1.15);
  const 堀 = Math.round(26 * Math.max(0.9, k));
  const 堀外 = o.hh + t + o.masu + t + 8 + moat.band;   // 城の堀の外の際（南）
  const ub = gateOpenU(大手);                             // 大手の土橋の真ん中
  const 側 = ub >= 0 ? -1 : 1;                            // 土橋の、城の真ん中寄りの側に据える
  const ox = Math.round(ub + 側 * (大手.w * 0.8 + 70 + 堀 + t + hw));
  const oy = Math.round(堀外 + 56 + 堀 + t + hh);
  /* 門は城の大手の九割の堅さ。板の門だが、出城は門を破らせるための曲輪ではない――
     門の前の土橋に寄せ手を集め、三方の狭間から射るための曲輪である */
  const hp = Math.round((110 + castle.def * 16) * 0.9);
  const 門 = { face: "S", layer: -1, i: 0, name: "門", key: `${名}の門`, 出城: true,
    off: 0, w: Math.round(58 * k), hp, max: hp, broken: false,
    masu: 0, open: 1, slot: null, hold: null, def: 0 };
  return { 出城: true, name: 名, i: -1, hw, hh, ox, oy, masu: 0, 堀, gates: [門],
    口: { off: Math.round(-側 * hw * 0.55), w: 40 }, 落ちた: false };
}

/* 門の輪。門の属する曲輪（出城の門なら出城）。層の門は m.layers[g.layer] と同じ */
export const 門の輪 = (m, g) => (g && g.出城 ? m.出城 : m.layers[g.layer]);
/* 出城がまだ保っているか（築かれていて、落ちていない） */
export const 出城が保つ = (m) => !!(m && m.出城 && !m.出城.落ちた);
/* その所が出城の内か（塀の内。pad だけ広げて測る） */
export function 出城の内か(m, x, y, pad = 0) {
  const 出 = m && m.出城;
  return !!出 && inRect(x - m.cx - 出.ox, y - m.cy - 出.oy, 出.hw + pad, 出.hh + pad);
}
/* 出城から城へ引き取る道（GDD 9.3）。背の口を出て、堀の外を大手の土橋まで回り、
   枡形を抜けて大手門の前まで。門が閉じていれば、門の前で城の内へ迎え入れる
   （ai.js 出城を守る）。返すのは { 道, 門 } */
export function 出城の退き道(m) {
  const 出 = m && m.出城;
  if (!出) return null;
  const 大手 = m.layers[0].gates.find((g) => g.face === "S") || m.layers[0].gates[0];
  const x = m.cx + 出.ox + 出.口.off;
  const 口内 = { x, y: m.cy + 出.oy - 出.hh + 22, r: 26 };
  const 口外 = { x, y: m.cy + 出.oy - 出.hh - m.t - 出.堀 - 24, r: 30 };
  return { 道: [口内, 口外, ...routeToCastleGate(m, 大手, 口外.x, 口外.y)], 門: 大手 };
}
/* 出城の塀の区切り（絵のため。draw.js と tachimono.js）。土塁の天端の帯を、門と背の口の
   間口を抜いて四方に返す。{ face, r: [x0, y0, x1, y1] }（盤の所） */
export function 出城の塀(m) {
  const 出 = m && m.出城;
  if (!出) return [];
  const t = m.t, X = m.cx + 出.ox, Y = m.cy + 出.oy;
  const x0 = X - 出.hw - t, x1 = X + 出.hw + t, y0 = Y - 出.hh - t, y1 = Y + 出.hh + t;
  const 門 = 出.gates[0], 門w = 門.w + (門.broken ? 20 : 0);
  const gL = X + 門.off - 門w / 2, gR = X + 門.off + 門w / 2;
  const kL = X + 出.口.off - 出.口.w / 2, kR = X + 出.口.off + 出.口.w / 2;
  return [
    { face: "S", r: [x0, y1 - t, gL, y1] }, { face: "S", r: [gR, y1 - t, x1, y1] },
    { face: "N", r: [x0, y0, kL, y0 + t] }, { face: "N", r: [kR, y0, x1, y0 + t] },
    { face: "W", r: [x0, y0 + t, x0 + t, y1 - t] }, { face: "E", r: [x1 - t, y0 + t, x1, y1 - t] },
  ].filter((o) => o.r[2] - o.r[0] > 0.5 && o.r[3] - o.r[1] > 0.5);
}
/* 出城の地（castleTerrainAt から）。外なら null */
function 出城の地(m, dx, dy) {
  const 出 = m.出城, t = m.t;
  const lx = dx - 出.ox, ly = dy - 出.oy;
  if (Math.abs(lx) > 出.hw + t + 出.堀 || Math.abs(ly) > 出.hh + t + 出.堀) return null;
  const 門 = 出.gates[0];
  if (Math.abs(lx) > 出.hw + t || Math.abs(ly) > 出.hh + t) {
    // 空堀。門の前と背の口の前は、堀を掘り残した土橋で渡る
    if (ly > 0 && Math.abs(lx - 門.off) <= 門.w * 0.8) return "bridge2";
    if (ly < 0 && Math.abs(lx - 出.口.off) <= 出.口.w * 0.8) return "bridge2";
    return "karabori";
  }
  if (Math.abs(lx) > 出.hw || Math.abs(ly) > 出.hh) {
    if (ly > 出.hh - 1 && Math.abs(lx - 門.off) <= 門.w / 2 + (門.broken ? 10 : 0)) return 門.broken ? "gateopen" : "gate";
    /* 背の口の木戸。城方は通れるが、寄せ手は通れない（field.js passableFor）。
       口を開けたままにしておくと、大手へ寄せる寄せ手が口から出城の中へ流れ込んだ */
    if (ly < -出.hh + 1 && Math.abs(lx - 出.口.off) <= 出.口.w / 2) return "kido";
    return "wall";
  }
  return "demaru";
}

// 城の外に、寄せ手が二列並べるだけの余地を取って戦場を決める
export function layoutCastleField(m, opt = {}) {
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
  const 旧w = Math.round((ext.w + Math.max(m.unit.d * 2.4 + 160, ext.w * 余)) * 2);
  const 旧h = Math.round((ext.h + Math.max(m.unit.d * 2.4 + 160, ext.h * 余)) * 2);
  m.旧 = { w: 旧w, h: 旧h };
  if (opt.広く) 広い盤に据える(m, ext, opt);
  else {
    /* 狭い盤には出城を据える余地が無い（堀の外の野は寄せ手の構える所である） */
    if (m.出城) { m.出城 = null; m.fac = m.fac.filter((f) => !f.出城); }
    FIELD.w = 旧w; FIELD.h = 旧h;
    尺を据える(0);                                      // 尺は盤の幅のまま
    m.cx = FIELD.w / 2; m.cy = FIELD.h / 2;
    m.域 = null; m.広い = false;
  }
  for (const f of m.fac) { f.x += m.cx; f.y += m.cy; }   // 相対から絶対へ
  for (const f of m.普請 || []) { f.x += m.cx; f.y += m.cy; }
  return m;
}

/* ------------------------------------------------ 城攻めの広い盤（GDD 9.3）

   遊ぶ側の申し出は「城攻めにあたっては、もっと広いマップにしたい。野戦から
   移動して、城に向かっていくにあたって野戦に似たようなマップを移動して行って、
   城の近くまで行って、城に取りついて城門を壊す」であった。

   城は今のまま（縄張りも寸法も変えない）、そのまわりに野戦と同じ作りの野を敷く。
     城山（域） … 城の外郭と堀に、構えに応じた裾を足した円。この内は城の地
                  （castleTerrainAt）で判じ、外は野の地（川・森・山・村・道）で判ずる
     城の据え所 … 盤の北寄り。寄せ手は南の端から入り、川を越えて寄せる
     盤の広さ   … 城山の大きさから決める（九千〜一万二千歩、縦は横の四分の三）
   足の尺は、これまでの城攻めの盤の幅で据える（field.js 尺を据える）。城の中の
   足も間合いも今までと同じで、城へ寄せるまでの道のりだけが延びる。 */
export const 広い盤の頭 = 12000;
function 広い盤に据える(m, ext, opt) {
  const 半 = Math.max(ext.w, ext.h) + m.moat.band;
  /* 城山の半径。山城は裾が広く、平山城はそれよりやや狭い。平城は堀の外に城下の
     ぶんを足すだけ */
  let 域r = Math.round(半 * (m.坂 >= 1 ? 1.34 : m.坂 > 0 ? 1.26 : 1.14) + 60);
  /* 出城は城山の内に収める。野の道と城の道の継ぎ目（半径の九割）より内に置かねば、
     寄せ手の道が出城の塀の中で継がれてしまう */
  if (m.出城) {
    const 出 = m.出城;
    const 遠 = Math.hypot(Math.abs(出.ox) + 出.hw + m.t + 出.堀, Math.abs(出.oy) + 出.hh + m.t + 出.堀);
    域r = Math.max(域r, Math.round((遠 + 70) / 0.88));
  }
  const W = Math.round(Math.max(9000, Math.min(広い盤の頭, 域r * 5.6)));
  const H = Math.round(W * 0.75);
  FIELD.w = W; FIELD.h = H;
  尺を据える(m.旧.w / 1080);
  /* 城の据え所は、城の名から起こした種で決める（同じ城はいつも同じ所に立つ）。
     城の後ろ（北）にも、搦手へ回り込むだけの野を残す */
  const 種 = Math.abs(String(opt.城id || "x").split("").reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 17));
  const 振 = (種 % 1000) / 1000;
  m.cx = Math.round(W * (0.3 + 振 * 0.4));
  m.cy = Math.round(域r + Math.max(600, H * 0.08));
  m.域 = { x: m.cx, y: m.cy, r: 域r };
  m.広い = true;
  /* 城の区。城山の円を囲む矩形（盤の内に収める）。城の地と石垣は、この区だけを細かく焼く */
  { const x0 = Math.max(0, Math.floor(m.cx - 域r - 8)), y0 = Math.max(0, Math.floor(m.cy - 域r - 8));
    const x1 = Math.min(W, Math.ceil(m.cx + 域r + 8)), y1 = Math.min(H, Math.ceil(m.cy + 域r + 8));
    m.区 = { x0, y0, w: x1 - x0, h: y1 - y0 }; }
  const o = m.layers[0];
  const 大手 = o.gates.find((g) => g.face === "S") || null;
  genTerrain(opt.種 != null ? opt.種 : FIELD_SEED, {
    城: { x: m.cx, y: m.cy, r: 域r,
      大手: 大手 ? { x: m.cx + (o.ox || 0) + gateOpenU(大手), y: m.cy + 域r * 0.94 } : null },
  });
}

/* ------------------------------------------------ 付城（GDD 9.3。core/tsukejiro.js）

   囲みのあいだに寄せ手が築いた砦。城山の南の縁の外、大手の麓の前に柵を回した陣を
   据える（二つあれば左右に並べる）。寄せ手は盤の南の端ではなく付城から寄せる――
   川を越え、城の目の前に陣を構えて囲んできたのだから。

     柵   … 丸太を立て並べた囲い。越えられぬほどではないが、足は鈍り、柵の際で戦う者は強い
     内   … 陣の地。踏み固められ、隊列を整えやすい
     口   … 城に向いた北の面に、広く開けておく（打って出る口）
   城山の外にあるので、地は castleTerrainAt の頭で判ずる（城の域の外でも付城は付城）。 */
export function 付城を据える(m, n) {
  m.付城 = null;
  if (!m || !m.広い || !(n > 0)) return null;
  const o = m.layers[0];
  const 大手 = o.gates.find((g) => g.face === "S") || o.gates[0];
  const x0 = m.cx + (o.ox || 0) + (大手 ? gateOpenU(大手) : 0);
  const y0 = m.域.y + m.域.r + 150;
  const hw = 150, hh = 80, t = 8;
  const 避ける = new Set(["deep", "ford", "bridge", "marsh", "forest", "village", "mountain"]);
  /* 柵の内と柵が、川・沼・森・村・山に掛からぬ所を探す（城の盤のうちに収める） */
  const 空き = (cx, cy) => {
    if (cx - hw - t < 80 || cx + hw + t > FIELD.w - 80 || cy - hh - t < 80 || cy + hh + t > FIELD.h - 80) return false;
    for (let i = 0; i <= 6; i++) for (let j = 0; j <= 4; j++) {
      const x = cx - hw - t + (hw + t) * 2 * i / 6, y = cy - hh - t + (hh + t) * 2 * j / 4;
      if (避ける.has(terrainAt(x, y))) return false;
    }
    return true;
  };
  const 列 = [];
  const 数 = Math.min(2, Math.round(n));
  for (let k = 0; k < 数; k++) {
    const 振 = 数 > 1 ? (k === 0 ? -1 : 1) * (hw + 90) : 0;
    let 置 = null;
    for (let r = 0; r <= 10 && !置; r++) {
      for (const [dx, dy] of r ? [[r, 0], [-r, 0], [0, r], [r, r], [-r, r]] : [[0, 0]]) {
        const cx = x0 + 振 + dx * 60, cy = y0 + dy * 40;
        if (列.some((f) => Math.abs(f.x - cx) < (hw + t) * 2 + 40 && Math.abs(f.y - cy) < (hh + t) * 2 + 20)) continue;
        if (空き(cx, cy)) { 置 = { x: cx, y: cy }; break; }
      }
    }
    if (置) 列.push({ ...置, hw, hh, t, 口: 120, name: 数 > 1 ? `付城（${k === 0 ? "西" : "東"}）` : "付城" });
  }
  m.付城 = 列.length ? 列 : null;
  return m.付城;
}
/* 付城の柵の区切り（絵のため）。北の口と南の木戸を抜いて、柵の帯を返す。{ face, r } */
export function 付城の柵(f) {
  const x0 = f.x - f.hw - f.t, x1 = f.x + f.hw + f.t, y0 = f.y - f.hh - f.t, y1 = f.y + f.hh + f.t;
  return [
    { face: "N", r: [x0, y0, f.x - f.口 / 2, y0 + f.t] }, { face: "N", r: [f.x + f.口 / 2, y0, x1, y0 + f.t] },
    { face: "S", r: [x0, y1 - f.t, f.x - 28, y1] }, { face: "S", r: [f.x + 28, y1 - f.t, x1, y1] },
    { face: "W", r: [x0, y0 + f.t, x0 + f.t, y1 - f.t] }, { face: "E", r: [x1 - f.t, y0 + f.t, x1, y1 - f.t] },
  ];
}
/* 付城の地。柵の帯なら saku、内なら jinsho（北の口は内と同じ）。外なら null */
function 付城の地(m, x, y) {
  for (const f of m.付城) {
    const lx = x - f.x, ly = y - f.y;
    if (Math.abs(lx) > f.hw + f.t || Math.abs(ly) > f.hh + f.t) continue;
    if (Math.abs(lx) <= f.hw && Math.abs(ly) <= f.hh) return "jinsho";
    if (ly < 0 && Math.abs(lx) <= f.口 / 2) return "jinsho";              // 北の口
    if (ly > 0 && Math.abs(lx) <= 28) return "jinsho";                   // 南の木戸（後ろの口）
    return "saku";
  }
  return null;
}

/* 広い盤の寄せ手の陣（GDD 9.3）。

   寄せ手は野戦から移ってきたのだから、城の堀の際に湧いて出るのではなく、盤の
   南の端――街道の入り口――に陣を敷き、そこから城へ寄せる。総大将（並びの先頭）を
   後ろの真ん中に据え、ほかの将はその前の段に、中央から外へ振り分けて並べる
   （野戦の布陣 MapScreen の lineup と同じ形）。川・森・沼・村には陣を敷かない。 */
export function 寄せ手の陣(m, i, n) {
  const W = FIELD.w, H = FIELD.h;
  /* 付城があれば、付城の中とその脇に陣を敷く。総大将（並びの先頭）は付城の中ほどに */
  if (m.付城 && m.付城.length) {
    const 置く = (x, y) => ({ x, y, f: Math.atan2(m.cy - y, m.cx - x) });
    if (i === 0) { const f0 = m.付城[0]; return 置く(f0.x, f0.y + f0.hh * 0.35); }
    const j = i - 1, 一つに = 5;
    const f = m.付城[Math.floor(j / 一つに) % m.付城.length];
    const 席 = j % 一つに;
    const 並 = [[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.45], [0.55, 0.45], [0, -0.55]];
    const 周 = Math.floor(j / (一つに * m.付城.length));
    const [ux, uy] = 並[席];
    const x = f.x + ux * f.hw + (周 ? (周 % 2 ? 1 : -1) * (f.hw + 160 + 220 * Math.floor((周 - 1) / 2)) : 0);
    const y = f.y + uy * f.hh + (周 ? f.hh * 0.6 : 0);
    const 避 = new Set(["forest", "wood", "village", "deep", "ford", "bridge", "marsh", "mountain"]);
    if (!避.has(terrainAt(x, y))) return 置く(x, y);
    for (let r = 1; r <= 8; r++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x2 = x + dx * r * 60, y2 = y + dy * r * 40;
      if (!避.has(terrainAt(x2, y2))) return 置く(x2, y2);
    }
    return 置く(x, y);
  }
  const 入 = ROAD.節 && ROAD.節.length ? ROAD.節[0].x : W / 2;   // 街道の南の端
  const 間 = 290, 段間 = 220;
  const 列 = Math.max(1, Math.min(6, n - 1));
  const 段数 = Math.ceil(Math.max(0, n - 1) / 列);
  let 段, 席;
  if (i === 0) { 段 = 段数; 席 = 0; }
  else {
    const j = i - 1;
    段 = Math.floor(j / 列);
    const 残 = Math.min(列, (n - 1) - 段 * 列);
    席 = (j - 段 * 列) - (残 - 1) / 2;
  }
  const 半幅 = (列 * 間) / 2 + 300;
  const cx = clamp(入, 半幅, W - 半幅);
  const 置く = (x, y) => ({ x, y, f: Math.atan2(m.cy - y, m.cx - x) });
  const x0 = cx + 席 * 間, y0 = H - 230 - (段数 - 段) * 段間;
  const 避ける = new Set(["forest", "wood", "village", "deep", "ford", "bridge", "marsh", "mountain", "hill"]);
  const 良 = (x, y) => x > 60 && y > 60 && x < W - 60 && y < H - 60 && !避ける.has(terrainAt(x, y));
  if (良(x0, y0)) return 置く(x0, y0);
  for (let r = 1; r <= 8; r++) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const x = x0 + dx * r * 70, y = y0 + dy * r * 50;
      if (良(x, y)) return 置く(x, y);
    }
  }
  return 置く(x0, y0);
}

/* その所が城山の内か（広い盤のときだけ意味を持つ。狭い盤なら盤じゅうが城） */
export function 城の域か(x, y, m = MAP) {
  if (!m) return false;
  if (!m.域) return true;
  const dx = x - m.域.x, dy = y - m.域.y;
  return dx * dx + dy * dy <= m.域.r * m.域.r;
}

/* 後詰の入り口（core/gotsume.js 盤に来る後詰・engine.js 後詰を入れる）。

   城の芯から 角 の向きへ延ばした先の、盤の端に隊を並べる。前の列は四隊まで、残りは
   その後ろ（端の側）に並ぶ。森・村・川・沼・山と城山を避け、敵の隊の間近（二百六十歩）
   にも立てない。避けきれなければ、端に沿って横へずらす。向きは城の芯へ向ける */
/* 城の芯から 角 の向きに、盤の際（端から百五十歩）までの長さ */
export function 盤の端まで(m, 角, 際 = 150) {
  const W = FIELD.w, H = FIELD.h, ux = Math.cos(角), uy = Math.sin(角);
  return Math.min(
    ux > 1e-6 ? (W - 際 - m.cx) / ux : ux < -1e-6 ? (際 - m.cx) / ux : Infinity,
    uy > 1e-6 ? (H - 際 - m.cy) / uy : uy < -1e-6 ? (際 - m.cy) / uy : Infinity);
}

export function 後詰の口(m, 角, i, n, 敵ら = []) {
  const W = FIELD.w, H = FIELD.h;
  const ux = Math.cos(角), uy = Math.sin(角), vx = -uy, vy = ux;
  const 長 = 盤の端まで(m, 角);
  const 列 = Math.max(1, Math.min(4, n)), 段数 = Math.ceil(n / 列);
  const 段 = Math.floor(i / 列), 残 = Math.min(列, n - 段 * 列);
  const 席 = (i - 段 * 列) - (残 - 1) / 2;
  const 内 = (段数 - 1 - 段) * 210;                       // 前の列ほど内へ
  const 避 = new Set(["forest", "wood", "village", "deep", "ford", "bridge", "marsh", "mountain", "saku"]);
  const 良 = (x, y) => x > 60 && y > 60 && x < W - 60 && y < H - 60 && passable(x, y) && !避.has(terrainAt(x, y))
    && !城の域か(x, y, m) && !敵ら.some((o) => Math.hypot(o.x - x, o.y - y) < 260);
  const 置く = (x, y) => ({ x, y, f: Math.atan2(m.cy - y, m.cx - x) });
  for (const 寄 of [0, 1, -1, 2, -2, 3, -3]) {
    for (let 入 = 0; 入 <= 6; 入++) {
      const d = Math.max(0, 長 - 内 - 入 * 120);
      const x = m.cx + ux * d + vx * (席 * 270 + 寄 * 360), y = m.cy + uy * d + vy * (席 * 270 + 寄 * 360);
      if (良(x, y)) return 置く(x, y);
    }
  }
  const d = Math.max(0, 長 - 内);
  return 置く(clamp(m.cx + ux * d + vx * 席 * 270, 80, W - 80), clamp(m.cy + uy * d + vy * 席 * 270, 80, H - 80));
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
  /* 門の前に並べる。段が深くなったら横へも開く（GDD 9.3）。

     もとは段ごとに七十六歩ずつ下げるだけで、下げ幅は野の余地で頭打ちだった。
     寄せ手が三十隊にもなると、門ごとに七段八段が同じ奥行きへ積み上がり、
     陣の枠が完全に重なる。遊ぶ側の申し出は「城攻めで兵数が多いと変になる」で
     あった（添えられた絵では、同じ所に備が幾重にも重なっていた）。

     三列の格子に組む。横は壁沿いの余地で頭打ちにし、足りなければ詰める。
     一隊の幅はおよそ百八十歩（三千の方陣）なので、それを目安に取る。 */
  const 列 = 3, 段数 = 4;
  const 周 = Math.floor(rank / (列 * 段数));            // 十二隊で一周し、横へずらす
  const r2 = rank % (列 * 段数);
  const 段 = Math.floor(r2 / 列), 列目 = r2 % 列;
  const 壁余地 = Math.max(120, (a.along === "x" ? FIELD.w : FIELD.h) / 2 - 120);
  const 横幅 = Math.min(190, 壁余地 / 2.2);
  /* 奥行きは余地を段で割る。固い歩幅（七十六歩）で下げていたころは、野の余地で
     頭打ちになったあと、何段ぶんもが同じ奥行きへ積み上がって完全に重なった
     （三十隊の城攻めで、構える所の最も近い隔たりが零歩）。
     先手の段（段〇）の位置は動かさない――ここを城へ寄せると、寄せ手が野から
     寄せる筋（tests/yosemichi 一）が死ぬ。後ろへだけ広げる。 */
  const back = 外構 + 余地 * (0.72 + 0.22 * (段 / Math.max(1, 段数 - 1)));
  const 横 = clamp((列目 - (列 - 1) / 2) * 横幅
    + 周 * 横幅 * 0.34 + (段 % 2 ? 横幅 * 0.17 : 0), -壁余地, 壁余地);
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
  if (g.出城) return g.off;                         // 出城の門に枡形は無い。正面がそのまま開き口
  const gL = g.off - g.w / 2, gR = g.off + g.w / 2;
  const from = g.open > 0 ? gR - g.w * 0.1 : gL - g.w * 0.9;
  return from + g.w / 2;
}

/* 門の控え口（GDD 9.3）。

   門の間口は狭く、取り付けるのは一隊だけである。ところが後続の隊も門へ寄せて
   いたので、堀も橋もお構いなしに前の隊へ重なり、押し合いに弾かれては寄せ直し、
   門前で行きつ戻りつしていた。盤の上では隊が瞬いて動くように見える。

   後続は橋の手前――堀の外に、門に近い者から順に列を作って待つ。
   立ち所は虎口の開き口の正面。取り付いた隊が退けば、次の隊がそのまま前へ出る。 */
export function 門の控え口(m, l, g, 順 = 0) {
  const a = axisOf(l, g);
  // 外周の門には堀が回る。内の門に堀は無い。出城の門の前には出城の空堀がある
  const 堀 = g.出城 ? (l.堀 || 0) + 8 : g.layer === 0 ? (m.moat ? m.moat.band : 0) + 8 : 0;
  const v0 = a.half + m.t + g.masu + m.t + 堀 + 54;
  順 = Math.max(0, 順);
  /* 内の門の前は、ひとつ外の曲輪の帯である。列を門の正面へ七十歩ずつ伸ばして
     いたので、三番手の控え口は外の塀の向こう（清洲の二の丸裏門なら惣構の塀の外、
     四番手は堀の中）に落ちた。そこを目指す隊は外の塀の内側に貼りつき、門へも
     進めず動かなくなる――遊ぶ側の「見えない壁があって進めない」はこれである。
     帯に収まる段だけ縦に並べ、あふれたぶんは塀沿いに横へ並べる。 */
  if (g.layer > 0) {
    const o = m.layers[g.layer - 1], U = m.unit || { w: 216, d: 88 };
    const 外 = a.along === "x" ? o.hh + a.sgn * ((o.oy || 0) - a.oy) : o.hw + a.sgn * ((o.ox || 0) - a.ox);
    const vmax = Math.max(a.half + m.t + g.masu + m.t + 8, 外 - U.d / 2 - 4);
    const 段数 = Math.max(1, Math.floor((vmax - v0) / 70) + 1);
    const 段 = 順 % 段数, 列 = Math.floor(順 / 段数);
    const 幅 = U.w * 0.7;
    const du = 列 ? (列 % 2 ? 1 : -1) * Math.ceil(列 / 2) * 幅 : 0;
    const 寄 = a.along === "x" ? (o.ox || 0) - a.ox : (o.oy || 0) - a.oy;
    const 半 = (a.along === "x" ? o.hw : o.hh) - U.w / 2 - 8;
    const u = clamp(gateOpenU(g) + du, 寄 - 半, 寄 + 半);
    return fromUV(m, a, u, Math.min(v0 + 段 * 70, vmax));
  }
  return fromUV(m, a, gateOpenU(g), v0 + 順 * 70);
}

/* 二点のあいだに塀や閉じた門が無いか。五歩ごとに見る。 */
export function 見通せる(x0, y0, x1, y1) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 5));
  for (let k = 1; k <= n; k++) {
    if (!passable(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n)) return false;
  }
  return true;
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
  if (m.付城) { const 付 = 付城の地(m, x, y); if (付) return 付; }   // 付城は城山の外にある
  /* 広い盤では、城山の外は野の地で判ずる（null を返せば field.js が野を引く） */
  if (m.域 && (x - m.域.x) ** 2 + (y - m.域.y) ** 2 > m.域.r * m.域.r) return null;
  for (const l of m.layers) for (const g of l.gates) if (masuWall(m, l, g, dx, dy)) return "wall";
  // 施設は壁より先に判定する。崩れた施設はもう塞がない。
  for (const f of m.fac) {
    if (f.hp > 0 && Math.hypot(x - f.x, y - f.y) < f.r * 1.5) return "tower";
  }
  if (m.出城) { const 出 = 出城の地(m, dx, dy); if (出) return 出; }
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
  return m.域 ? null : "plain";                       // 広い盤の平城の城下は野の地（道も通る）
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
  /* 広い盤では、格子は城山の周りだけに張る（城山の外は野の道さがし route.js に任せる）。
     盤じゅうに二十二歩の格子を張ると二十万升になり、門が破れるたびの張り直しで止まる */
  const 枠 = m.域
    ? { x0: Math.max(0, Math.floor((m.域.x - m.域.r - CS * 2) / CS) * CS), y0: Math.max(0, Math.floor((m.域.y - m.域.r - CS * 2) / CS) * CS),
        x1: Math.min(FIELD.w, m.域.x + m.域.r + CS * 2), y1: Math.min(FIELD.h, m.域.y + m.域.r + CS * 2) }
    : { x0: 0, y0: 0, x1: FIELD.w, y1: FIELD.h };
  const X0 = 枠.x0, Y0 = 枠.y0;
  const w = Math.ceil((枠.x1 - X0) / CS), h = Math.ceil((枠.y1 - Y0) / CS);
  const ok = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      ok[j * w + i] = passable(X0 + i * CS + CS / 2, Y0 + j * CS + CS / 2) ? 1 : 0;
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
      const x = X0 + i * CS + CS / 2, y = Y0 + j * CS + CS / 2;
      if (i + 1 < w && ok[k + 1]) eR[k] = 渡れる(x, y, x + CS, y);
      if (j + 1 < h && ok[k + w]) eD[k] = 渡れる(x, y, x, y + CS);
    }
  }
  m.nav = { CS, w, h, ok, eR, eD, x0: X0, y0: Y0 };
  return m.nav;
}

/* 格子の内か（広い盤では、城山の内で、かつ格子の張ってある所） */
const 格子の内 = (m, nv, x, y) => !m.域 || (x >= nv.x0 && y >= nv.y0 && x < nv.x0 + nv.w * nv.CS
  && y < nv.y0 + nv.h * nv.CS && 城の域か(x, y, m));

/* 城山の縁の継ぎ目。城山の外から内へ（内から外へ）向かう道は、ここで野の道と城の道を
   継ぐ。城の中ほどから、外の所の方角へ、城山の半径の九割の所 */
function 継ぎ目(m, x, y) {
  const a = Math.atan2(y - m.域.y, x - m.域.x), r = m.域.r * 0.9;
  return { x: m.域.x + Math.cos(a) * r, y: m.域.y + Math.sin(a) * r };
}
/* 野の道（route.js）。行き着けなければ真っすぐ */
const 野を行く = (x0, y0, x1, y1) => 野の道(x0, y0, x1, y1) || [{ x: x1, y: y1, r: 40 }];

/* 城山の外にかかる道。外→内は「野の道で継ぎ目まで、そこから城の道」、内→外はその逆、
   外→外は野の道だけ（城山を越える道は、塀と堀を高くつけてあるので回り込む） */
function 継いだ道(m, x0, y0, x1, y1) {
  const nv = m.nav || buildNav(m);
  const 始内 = 格子の内(m, nv, x0, y0), 終内 = 格子の内(m, nv, x1, y1);
  if (!始内 && !終内) return 野を行く(x0, y0, x1, y1);
  if (!始内) {
    const e = 継ぎ目(m, x0, y0);
    const 内 = navPath(m, e.x, e.y, x1, y1);
    return [...野を行く(x0, y0, e.x, e.y).map((p, i, a) => (i === a.length - 1 ? { ...p, r: 60 } : p)), ...(内 || [{ x: x1, y: y1, r: 26 }])];
  }
  const e = 継ぎ目(m, x1, y1);
  const 内 = navPath(m, x0, y0, e.x, e.y);
  return [...(内 || [{ x: e.x, y: e.y, r: 40 }]), ...野を行く(e.x, e.y, x1, y1)];
}

export function navPath(m, x0, y0, x1, y1) {
  const nv = m.nav || buildNav(m);
  if (m.域 && (!格子の内(m, nv, x0, y0) || !格子の内(m, nv, x1, y1))) return 継いだ道(m, x0, y0, x1, y1);
  const { CS, w, h, ok, eR, eD } = nv;
  const X0 = nv.x0 || 0, Y0 = nv.y0 || 0;
  // 升目から升目へ渡れるか。壁を跨ぐ継ぎ目は断たれている。
  const 継 = (i, j, di, dj) => {
    if (di > 0 && !eR[j * w + i]) return false;
    if (di < 0 && !eR[j * w + i - 1]) return false;
    if (dj > 0 && !eD[j * w + i]) return false;
    if (dj < 0 && !eD[(j - 1) * w + i]) return false;
    return true;
  };
  const ix = (x) => clamp(Math.floor((x - X0) / CS), 0, w - 1);
  const iy = (y) => clamp(Math.floor((y - Y0) / CS), 0, h - 1);
  /* 壁の中なら最寄りの通れる格子へ。

     最寄りは、元の所から塀を挟まずに見える格子のうちで選ぶ。塀の脇に立つ隊は、
     升目の中ほどが塀に掛かることがある。見通しを問わずに輪の順で拾うと、塀の
     向こうの升目から道が始まり、隊は塀の外から内の地点へ向かって塀に当たり、
     横へ滑った。委任した隊は道を毎秒引き直すので、そのたびにまた塀の向こうから
     始まり、観音寺城では外郭の塀の外を西へ這い続けた。見える格子が無いときだけ、
     これまでどおり輪の順で拾う。 */
  const near = (i0, j0, x, y) => {
    if (ok[j0 * w + i0]) return j0 * w + i0;
    let 見え = -1, 見え隔 = Infinity, 輪の先 = -1;
    for (let r = 1; r <= 6; r++) {
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = i0 + di, j = j0 + dj;
        if (i < 0 || j < 0 || i >= w || j >= h) continue;
        if (!ok[j * w + i]) continue;
        if (輪の先 < 0) 輪の先 = j * w + i;
        const cx = X0 + i * CS + CS / 2, cy = Y0 + j * CS + CS / 2, d = Math.hypot(cx - x, cy - y);
        if (d < 見え隔 && 見通せる(x, y, cx, cy)) { 見え隔 = d; 見え = j * w + i; }
      }
      if (見え >= 0) return 見え;
    }
    return 輪の先;
  };
  const S = near(ix(x0), iy(y0), x0, y0), T = near(ix(x1), iy(y1), x1, y1);
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
  const 中 = (k) => ({ x: X0 + (k % w) * CS + CS / 2, y: Y0 + ((k / w) | 0) * CS + CS / 2 });
  const 角 = [];
  let lastDir = null;
  for (let n = 1; n < cells.length; n++) {
    const a2 = cells[n - 1], b2 = cells[n];
    const d = `${(b2 % w) - (a2 % w)},${((b2 / w) | 0) - ((a2 / w) | 0)}`;
    if (d !== lastDir) { lastDir = d; 角.push(n - 1); }
  }
  /* 角と角を結ぶ線が塀を掠めないようにする。

     升目どうしの継ぎ目は縦横の線の上でしか検めていないので、斜めの並びの角を
     まっすぐ結ぶと、門柱や塀の端を掠めることがある。清洲の外の門では、破れた
     門の脇の一升を斜めに抜ける道が引かれ、隊は門柱の外で塀に当たり、次の角へ
     まっすぐ向かって塀の外を這っていた（遊ぶ側の申し出は「城門を破ったあと、
     攻撃側が門からうまく入れず、外側の壁を這うように移動してしまう」）。
     結ぶ線が塀に掛かる所は、あいだの升目の中ほどを残らず挟み、斜めの一歩も
     塀に掛かるなら、通れる側の折れ目を挟む。 */
  const 並 = [];
  for (let t = 0; t < 角.length; t++) {
    const n0 = 角[t], n1 = t + 1 < 角.length ? 角[t + 1] : cells.length - 1;
    並.push({ ...中(cells[n0]), r: 30 });
    const p0 = 中(cells[n0]), p1 = 中(cells[n1]);
    if (n1 > n0 + 1 && !見通せる(p0.x, p0.y, p1.x, p1.y)) {
      for (let n = n0 + 1; n < n1; n++) 並.push({ ...中(cells[n]), r: 22 });
    }
  }
  if (cells.length > 1) 並.push({ ...中(cells[cells.length - 1]), r: 22 });
  const pts = [];
  for (const p of 並) {
    const a = pts[pts.length - 1];
    if (a && Math.abs(a.x - p.x) === CS && Math.abs(a.y - p.y) === CS && !見通せる(a.x, a.y, p.x, p.y)) {
      const k1 = { x: p.x, y: a.y }, k2 = { x: a.x, y: p.y };
      if (見通せる(a.x, a.y, k1.x, k1.y) && 見通せる(k1.x, k1.y, p.x, p.y)) pts.push({ ...k1, r: 20 });
      else if (見通せる(a.x, a.y, k2.x, k2.y) && 見通せる(k2.x, k2.y, p.x, p.y)) pts.push({ ...k2, r: 20 });
    }
    pts.push(p);
  }
  pts.push({ x: x1, y: y1, r: 26 });
  return pts;
}


/* ------------------------------------------- 将への流れ（城の盤）

   遊ぶ側の申し出は「城門を破ったあと、攻撃側が門からうまく入れず、外側の壁を
   這うように移動してしまう」であった。清洲で測ると、門が破れて将が門をくぐった
   あと、外に残った組の半ば（四百組のうち二百組）が外郭の塀ぞいに並んでいた。
   わけは三つあった。
     一　組は持ち場（将からの陣形の席）へまっすぐ歩き、塀に当たれば塀ぞいに滑る。
         将が門をくぐって塀の内を横へ進めば、外の組は塀の外を同じ向きへ這う。
     二　持ち場そのものが塀の外に掛かれば、組は塀の外で将と並んで歩く。
     三　はぐれた組は隊の来た跡を辿るが、いちばん近い跡の点が塀の向こうにあれば
         やはり塀ぞいに滑る。跡は二十六点しか覚えないので、門をくぐった所は
         じきに忘れられてしまう。

   そこで、将のいる升目から通れる升目を四方へ広げ、升目ごとに「将まで何升か」を
   数えた図（流れ）を作る。壁を跨ぐ継ぎ目は断たれているので、数は門を回った
   道のりになる。
     ・その数が真っすぐの升数（縦横の升の差の和）より大きく膨らむ所は、将から
       見て「塀の向こう」である（回り道か）。
     ・持ち場が塀の向こうに掛かれば、将の側の塀の手前へ引き寄せる（塀のこちら）。
     ・組が塀の向こうにいれば、図を下って門へ回る（流れの先）。 */

// 所（x, y）の升目。升目の中ほどが壁や堀に掛かっていれば、塀を挟まずに見える
// 近くの升目を取る（塀の脇に立つ組を、塀の向こうの升目に数えないため）。
export function 流れの升(nv, x, y) {
  const { CS, w, h, ok } = nv;
  const X0 = nv.x0 || 0, Y0 = nv.y0 || 0;
  /* 格子の外（広い盤の城山の外）は升を持たない */
  if (x < X0 || y < Y0 || x >= X0 + w * CS || y >= Y0 + h * CS) return -1;
  const i0 = clamp(Math.floor((x - X0) / CS), 0, w - 1), j0 = clamp(Math.floor((y - Y0) / CS), 0, h - 1);
  if (ok[j0 * w + i0]) return j0 * w + i0;
  /* 見通しを量るので重い（小谷城のような山城では、城攻めの一刻の二割近くがここに
     掛かった）。四歩四方ごとに覚えておく。塀は十歩あるので、四歩の升が塀の両側に
     跨ることはない。門が破れて格子が作り直されれば、覚えも新しくなる。 */
  const 覚 = nv.升の覚え || (nv.升の覚え = new Map());
  const 鍵 = Math.floor(y / 4) * 8192 + Math.floor(x / 4);
  const 前 = 覚.get(鍵);
  if (前 !== undefined) return 前;
  let best = -1, bd = Infinity;
  for (let r = 1; r <= 2 && best < 0; r++) {
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const i = i0 + di, j = j0 + dj;
      if (i < 0 || j < 0 || i >= w || j >= h || !ok[j * w + i]) continue;
      const cx = X0 + i * CS + CS / 2, cy = Y0 + j * CS + CS / 2, d = Math.hypot(cx - x, cy - y);
      if (d < bd && 見通せる(x, y, cx, cy)) { bd = d; best = j * w + i; }
    }
  }
  覚.set(鍵, best);
  return best;
}

// 将の所（x, y）から広げた流れ。距 は升目ごとの将までの升数（着けない升目は −1）。
export function 流れを作る(m, x, y) {
  const nv = m.nav || buildNav(m);
  const { w, h, eR, eD } = nv;
  const S = 流れの升(nv, x, y);
  if (S < 0) return null;
  const 距 = new Int32Array(w * h).fill(-1);
  const 列 = new Int32Array(w * h);
  let 頭 = 0, 尾 = 0;
  距[S] = 0; 列[尾++] = S;
  while (頭 < 尾) {
    const k = 列[頭++], i = k % w, d = 距[k] + 1;
    if (i + 1 < w && eR[k] && 距[k + 1] < 0) { 距[k + 1] = d; 列[尾++] = k + 1; }
    if (i > 0 && eR[k - 1] && 距[k - 1] < 0) { 距[k - 1] = d; 列[尾++] = k - 1; }
    if (k + w < w * h && eD[k] && 距[k + w] < 0) { 距[k + w] = d; 列[尾++] = k + w; }
    if (k >= w && eD[k - w] && 距[k - w] < 0) { 距[k - w] = d; 列[尾++] = k - w; }
  }
  return { nv, S, si: S % w, sj: (S / w) | 0, 距 };
}

/* 将から見て、その所が塀の向こうか（門を回らねば着けないか）。
   櫓や虎口の角をよける程度の回り（三升まで）は、塀の向こうとしない。 */
export function 回り道か(流, x, y) {
  const k = 流れの升(流.nv, x, y);
  if (k < 0 || 流.距[k] < 0) return true;
  const w = 流.nv.w;
  return 流.距[k] > Math.abs((k % w) - 流.si) + Math.abs(((k / w) | 0) - 流.sj) + 3;
}

/* 塀の向こうに掛かった所を、将と結ぶ線の上で、将の側の塀の手前まで引き寄せる。
   的の側から十一歩ずつ将へ寄せ、初めて将の側に入った所を取る。将の側から外へ
   辿って初めの障りで止めると、櫓の向こうの持ち場まで将の脇へ縮み、隊が団子に
   なった（観音寺城で塀ぞいの組が三倍に増えた）。 */
export function 塀のこちら(流, cx, cy, x, y) {
  const n = Math.max(1, Math.ceil(Math.hypot(x - cx, y - cy) / 11));
  for (let s = n - 1; s >= 1; s--) {
    const px = cx + (x - cx) * s / n, py = cy + (y - cy) * s / n;
    if (passable(px, py) && !回り道か(流, px, py)) return { x: px, y: py };
  }
  return { x: cx, y: cy };
}

/* 図を下って将へ近づく道の、先の升目の中ほど。六升先まで辿り、組から塀を挟まずに
   見える限り先の升目を取る（升目ごとに曲がると、組が階段のように折れて歩く）。 */
export function 流れの先(流, x, y, 先まで = 6) {
  const { nv, 距 } = 流, { CS, w, h, eR, eD } = nv;
  const X0 = nv.x0 || 0, Y0 = nv.y0 || 0;
  let k = 流れの升(nv, x, y);
  if (k < 0 || 距[k] <= 0) return null;
  const 道 = [];
  for (let n = 0; n < 先まで && 距[k] > 0; n++) {
    const i = k % w, d = 距[k] - 1;
    let nk = -1;
    if (i + 1 < w && eR[k] && 距[k + 1] === d) nk = k + 1;
    else if (i > 0 && eR[k - 1] && 距[k - 1] === d) nk = k - 1;
    else if (k + w < w * h && eD[k] && 距[k + w] === d) nk = k + w;
    else if (k >= w && eD[k - w] && 距[k - w] === d) nk = k - w;
    if (nk < 0) break;
    道.push(nk); k = nk;
  }
  for (let n = 道.length - 1; n >= 0; n--) {
    const px = X0 + (道[n] % w) * CS + CS / 2, py = Y0 + ((道[n] / w) | 0) * CS + CS / 2;
    if (n === 0 || 見通せる(x, y, px, py)) return { x: px, y: py };
  }
  return null;
}

/* 門の前の列の順（engine の門の順番待ちと、采配 ai.js の両方で使う）。

   列に着いた順（先着）。門までの近さだけで並べると、近さの似た隊どうしが刻ごとに
   入れ替わり、そのたびに控え口が遠く離れた所へ移って道を引き直す。清洲では、
   外の塀の外にいた隊が四番目と五番目を行き来して、塀の外を東へ西へと這い続けた。
   まだ列に着いていない隊は、門に近い順に後ろへ並べる。engine と采配が別の順を
   使うと、委ねた隊は二つの控え口のあいだで揺れるので、順はここ一つで決める。
   列に着いた印（列の門・列に着いた刻・列に着いた隔）は engine の門の順番待ちが付ける。
   同じ刻に着いた隊どうしは、着いたときの門までの隔（動かない値）で並べる。いまの
   隔で並べると、やはり刻ごとに入れ替わる。門に取り付いた隊も、取り付いたときに
   印を付ける。取り付きを外れた隊が列のいちばん後ろへ回されると、門の間近から
   列の尻まで三百歩も歩いて戻った（稲葉山）。 */
export function 列に着く(c, g, gp, t) {
  if (c.列の門 === g) return;
  c.列の門 = g; c.列に着いた刻 = t;
  c.列に着いた隔 = Math.hypot((c.mx == null ? c.x : c.mx) - gp.x, (c.my == null ? c.y : c.my) - gp.y);
}
export function 列の順(g, gp) {
  const 隔 = (o) => (o.列の門 === g ? o.列に着いた隔
    : Math.hypot((o.mx == null ? o.x : o.mx) - gp.x, (o.my == null ? o.y : o.my) - gp.y));
  const 着 = (o) => (o.列の門 === g ? o.列に着いた刻 : Infinity);
  return (a, b2) => (着(a) - 着(b2)) || (隔(a) - 隔(b2));
}

/* かつては城の外周を回り込む道順（ringPath / routeToGate）を持っていたが、
   同心の矩形を前提とした当て推量であって、縄張りを崩すと通らない。
   いまは城内も外周も navPath（格子の A*）で解いている。用の無いものは残さない。 */

// 目標の門まで、破れた門を順に抜けて至る道順。通り過ぎた地点は落とす。
export function routeToCastleGate(m, g, cx, cy) {
  const l = 門の輪(m, g), a = axisOf(l, g), t = m.t;
  /* 虎口の開き口までを最短経路で。そこから先は門までの短い道筋。
     出城の門には枡形が無い。空堀の土橋の外が開き口で、土橋を渡ればすぐ門である */
  const open = g.出城 ? fromUV(m, a, g.off, a.half + t + (l.堀 || 0) + 16)
    : fromUV(m, a, gateOpenU(g), a.half + t + g.masu + t + 12);
  const tail = g.出城 ? [{ ...fromUV(m, a, g.off, a.half + t + 14), r: 20 }] : [
    { ...fromUV(m, a, g.off, a.half + t + g.masu / 2), r: 24 },
    { ...fromUV(m, a, g.off, a.half + t + 14), r: 20 },
  ];
  /* 破れた門は通り抜ける先まで導く。門の前で止めていたので、
     破った門の内へ入れず、その場で押し合っていた。 */
  if (g.broken) tail.push({ ...fromUV(m, a, g.off, a.half - 20), r: 22 });
  if (Math.hypot(cx - open.x, cy - open.y) < 46) return tail;
  const path = navPath(m, cx, cy, open.x, open.y);
  if (!path) return tail;
  /* いま居るところより後ろの地点は捨てる（GDD 9.3）。

     道は「いちばん近い節」から引かれるので、その節が隊の後ろにあることがある。
     引き直すたびに隊は一度後戻りし、着いてはまた引き直され――門前で行きつ戻りつ
     していた。実測では、この隊は百二十秒のあいだに三十八回も前後を繰り返していた。
     虎口の開き口へ近づかない地点は、通る意味がない。 */
  const 残り = Math.hypot(open.x - cx, open.y - cy);
  let i = 0;
  while (i < path.length - 1 && Math.hypot(open.x - path[i].x, open.y - path[i].y) >= 残り - 4) i++;
  /* ただし、塀を回り込む地点まで捨ててはならない。塀の外から内の門へ向かう隊は、
     いったん門から遠ざかって外の門をくぐる。そこを捨てると道は塀を突っ切り、
     詰まって引き直しても同じ道が返るので、隊は塀の外で永久に立ち尽くした。 */
  while (i > 0 && !見通せる(cx, cy, path[i].x, path[i].y)) i--;
  return [...path.slice(i), ...tail];
}

export const gateReachable = (m, g) => !!g.出城 || g.layer === 0 || m.layers[g.layer - 1].gates.some((x) => x.broken);

/* 本丸へ攻め入る道（GDD 9.3）。城攻めの第一の的は本丸に入ることである。
   本丸の門が一つでも破れていれば、近いほうの破れた門をくぐり、本丸の中ほどまで
   の道を返す。破れていなければ null（まだ破るべき門がある）。
   遊ぶ側の申し出は「本丸侵入についてちゃんと設定し、破ったら次の門への設定を
   ちゃんと行う」であった。門を破った隊が、本丸の門が開いているのに別の門を
   破りに引き返していた。 */
export function 本丸への道(m, x, y) {
  const hon = m.layers[m.layers.length - 1];
  const 破 = hon.gates.filter((g) => g.broken);
  if (!破.length) return null;
  const hg = 破.slice().sort((a, b) => {
    const pa = gatePos(m, hon, a), pb = gatePos(m, hon, b);
    return Math.hypot(pa.x - x, pa.y - y) - Math.hypot(pb.x - x, pb.y - y);
  })[0];
  const a = axisOf(hon, hg);
  return [...routeToCastleGate(m, hg, x, y), fromUV(m, a, hg.off, a.half - 40),
    { x: m.cx + (hon.ox || 0), y: m.cy + (hon.oy || 0) }];
}
export const 本丸が開いたか = (m) => m.layers[m.layers.length - 1].gates.some((g) => g.broken);

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
