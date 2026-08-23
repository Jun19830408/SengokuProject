import { isGuardian, needsGuardian } from "./house.js";
import { isCoastal } from "./naval.js";
import { rankBonus } from "./province.js";
import { MOB_POLICY } from "../data/roads.js";
import { isMainClan } from "./house.js";

/* 外交の掛け合いに効く、家の格ひと揃い（GDD 12.1）。
   画面と処理で別々に組み立てると、押せるのに成らぬ、が起きる。ここ一つに拠る。 */
export function diploStat(g, fid) {
  return {
    koku: g.castles.filter((c) => c.faction === fid).reduce((a, c) => a + c.koku, 0),
    diplo: rankBonus(g, fid).diplo,
    prestige: ((g.factions || {})[fid] || {}).prestige == null ? 50 : g.factions[fid].prestige,
  };
}

export const minGarrison = (c) => Math.round(c.def * 10 + (100 - c.min) * 5);

export const troopCap = (c, p, s) => Math.round((c.koku / 10000) * MOB_POLICY[p].per
  * (0.75 + (c.najimi == null ? 70 : c.najimi) / 400)
  * (s ? rankBonus(s, c.faction).troop : 1));

export const foodDays = (food, troops) => (troops > 0 ? Math.round((food / (troops * 0.08)) * 30) : 999);


/* ------------------------------------------------ 武将の家（GDD 6.7）
   城を預かる者は家を興す。家は代を重ね、禄と身分が継がれる。
   家を持たぬ者は一代限りで、没すれば跡は残らない。
   これにより、城主となることが「家を興す」ことの意味を持つ。 */
export const HOUSE_RANK = 8000;                 // 家を興せる禄高（家老の格）

/* ------------------------------------------------ 身分（GDD 6.4）
   知行の高が、そのまま身分である。
   一隊を預かるだけの者と、城を任される者、家中を差配する宿老は違う。
   新たな数値を設けず、既にある知行で身分を定める。 */
export const RANKS = [
  { key: "宿老", min: 20000, desc: "大名に代わって総大将を務められる", cap: 4000 },
  { key: "家老", min: 8000, desc: "城を任され、その城の政を執れる", cap: 2500 },
  { key: "侍大将", min: 2500, desc: "千人を超える隊を率いられる", cap: 1600 },
  { key: "物頭", min: 0, desc: "五百人までの隊を預かる", cap: 500 },
];

// 身分は禄高で定まる。知行だけでなく、余禄も身代のうちである。
export function rankOf(gen, s) {
  if (!gen) return RANKS[RANKS.length - 1];
  if (gen.lord) return { key: "当主", min: 0, desc: "一家の主" };
  if (s && isGuardian(s, gen)) return { key: "後見", min: 0, desc: "幼き当主に代わって家を差配する" };
  const f = s ? stipendOf(s, gen) : fiefOf(gen);
  return RANKS.find((r) => f >= r.min) || RANKS[RANKS.length - 1];
}

export const rankName = (gen, s) => rankOf(gen, s).key;

// その城の城主。当主がいれば当主、なければ禄高の最も高い家老。
export function castellanOf(s, c) {
  const gs = s.generals.filter((x) => x.at === c.id && x.faction === c.faction && !x.captive);
  if (!gs.length) return null;
  const lord = gs.find((x) => x.lord);
  if (lord) return lord;                       // 当主のいる城は当主が城主である
  // 任じた者が預かれるかは canHoldCastle で判ずる。ここだけ禄高で測っていたため、
  // 一門を任じても黙って別の者が城主とみなされていた。
  const named = c.lordId && gs.find((x) => x.id === c.lordId);
  if (named && canHoldCastle(named, s, c)) return named;
  return [...gs].sort((a, b) => stipendOf(s, b) - stipendOf(s, a))[0];
}

/* ------------------------------------------- 城門の守備隊（GDD 9.3）

   城攻めでは、武将のいない城門にも兵は詰めている。門番、足軽小頭、寺に籠った
   僧兵――名は伝わらぬが、そこに人はいる。これまでは武将の数だけしか隊が立たず、
   残りの門はがら空きであった。

   守備隊の器量は、その城を預かる者の統率だけを映す。誰の下で守るかで、
   門の固さは変わる。武勇と知略は最低限とする。名も無き兵に、将の武辺や
   謀は望めない。

   城主がいなければ、位の高い者から選ぶ。同じ位なら家に長く仕えた者
   （仕えた年を控えていない古い盤では、齢の高いほうを古参とみなす）、
   それも同じなら能力の高い者。将が一人もおらず姫がいるなら、姫の統率を映す。
   誰もいなければ、四十とする。城代のいない城は、それだけ脆い。 */
export function 守備隊の統率(s, c) {
  /* 姫の家中統率（GDD 6.8）。城にある姫は、奥を束ね、門の兵をも束ねる。
     将のいない城では姫がそのまま守備隊の統率となり、将のいる城でも、
     その姫が城を預かる者より人を束ねるなら、高いほうを取る。
     姫は盤には出ない。数だけが門に残る。 */
  const 姫 = (s.hime || []).filter((h) => h.at === c.id && h.faction === c.faction && !h.死
    && !(h.嫁 && h.嫁.種 === "婚姻"));
  const 奥 = 姫.length ? Math.max(...姫.map((h) => h.lead || 50)) : 0;
  const gs = s.generals.filter((x) => x.at === c.id && x.faction === c.faction && !x.captive);
  if (gs.length) {
    const 主 = castellanOf(s, c);
    if (主) return Math.max(主.lead, 奥);
    const 位 = (x) => RANKS.findIndex((r) => r.key === rankOf(x, s).key);
    const 順 = [...gs].sort((a, b) => 位(b) - 位(a)
      || ((b.仕官 != null && a.仕官 != null) ? a.仕官 - b.仕官 : (b.age || 0) - (a.age || 0))
      || (b.lead + b.valor + b.wit) - (a.lead + a.valor + a.wit));
    return Math.max(順[0].lead, 奥);
  }
  if (奥) return 奥;
  return 40;
}

// 城を預かれるのは家老以上。ただし小城は、その城の身代に見合う禄高で足る。
// 一万石に満たぬ砦の主に八千石を求めるのは筋が通らない。
export function castleRankNeed(c) {
  if (!c) return 8000;
  const own = c.koku + extraIncome(c);
  return Math.min(8000, Math.max(1200, Math.round(own * 0.16)));
}

/* 城を預かれるか（GDD 6.4 / 12.1）。

   本来は、その城の身代に見合う禄高が要る。ただし大名の一門は別である。
   血を分けた者は、禄高が伴わずとも家の名代として城を預かった。
   織田信長が十三で那古野を預かったのは、二千四百石だからではなく
   織田の子だからである。 */
export const canHoldCastle = (gen, s, c) => {
  if (!gen) return false;
  if (gen.lord) return true;
  if (s && isGuardian(s, gen)) return true;
  if (s && isMainClan(s, gen)) return true;      // 大名の一門は無条件
  const need = c ? castleRankNeed(c) : 8000;
  return (s ? stipendOf(s, gen) : fiefOf(gen)) >= need;
};

// 総大将を務められるのは当主か宿老。
export const canBeSupreme = (gen, s) => !!gen && (gen.lord || (s ? stipendOf(s, gen) : fiefOf(gen)) >= 20000);

// 出陣そのものは物頭でもできる。ただし率いられる兵に限りがある。
export const canLeadArmy = () => true;

// 身分ごとの兵の限り
export function troopLimit(gen, s) {
  if (!gen) return 500;
  if (gen.lord) return needsGuardian(gen) ? 800 : 99999;   // 幼き当主は自ら率いられぬ
  if (s && isGuardian(s, gen)) return 99999;               // 後見は当主に代わる
  return (rankOf(gen, s) || {}).cap || 500;
}


/* ------------------------------------------------- 知行と忠誠（GDD 6.1）
   家臣は禄を食んで仕える。知行が器量に見合わなければ、忠誠は下がっていく。
   下がりきれば出奔し、あるいは敵の調略に応じる。 */
export function fiefWanted(gen) {
  // 器量に見合う知行（石）。器量の差が知行の桁に出るようにする。
  // 凡将は千石、一国を代表する将は二万石、傑物は五万石を望む。
  const able = (gen.lead + gen.valor + gen.wit + gen.gov) / 4;   // 平均の器量
  const base = Math.pow(Math.max(1, able - 42) / 12, 2.6) * 900;
  return Math.round(400 + base + (gen.merit || 0) * 900);
}

/* 知行。負の値は取らない。
   加増が没収に化ける不具合で、負の知行を抱えた記録が残っている。
   そのまま数えると、勢力全体の配分済も禄高も狂う。 */
export function fiefOf(gen) { return Math.max(0, gen && gen.fief != null ? gen.fief : 0); }

/* 禄高（GDD 6.4）
   知行は、城の石高から分け与えられる田の高である。城の石高がその限り。
   これに湊の運上・市の役銭・山の産などの余禄を加えたものが禄高であり、
   身分はこの禄高によって定まる。
   田の乏しい志摩や対馬でも、海と交易の余禄によって高い禄高が成り立つ。
   大名の身代は家臣に配る知行ではないので、直轄領と余禄を合わせて御料と呼ぶ。 */
// その城の余禄。田以外の実入り。
export function extraIncome(c) {
  if (!c) return 0;
  // 湊の運上・市の役銭・山の産。田の乏しい地ほど比重が大きいが、
  // 田の実りを凌ぐことはない。
  const trade = c.comm * 95;
  const sea = isCoastal(c) ? c.comm * 60 : 0;
  const mountain = Math.max(0, 40 - c.comm) * 70;
  return Math.min(Math.round(trade + sea + mountain), Math.round(c.koku * 0.55 + 4200));
}

// 城が家臣に配れる知行の限り。城の石高がそのまま限りとなる。
export function fiefCapacity(c) { return c ? c.koku : 0; }

// 城が配っている知行の総和。当主の身代は御料であって知行ではない。
export function fiefBurden(s, castleId) {
  return s.generals
    .filter((g) => g.at === castleId && !g.captive && !g.lord)
    .reduce((a, g) => a + fiefOf(g), 0);
}

// 武将の禄高＝知行＋その城の余禄の分け前
export function stipendOf(s, gen) {
  if (!gen) return 0;
  // 若年の者に大禄は与えられぬ。齢を重ねてこそ身代も増す。
  const age = gen.age == null ? 30 : gen.age;
  const c = s.castles.find((x) => x.id === gen.at);
  if (!c) return fiefOf(gen);
  const burden = fiefBurden(s, c.id);
  const share = burden > 0 ? fiefOf(gen) / burden : 0;
  const raw = Math.round(fiefOf(gen) + extraIncome(c) * share);
  if (gen.lord || age >= 20) return raw;
  // 十五で家老の格、十八で宿老の格に届きうる、という程度に抑える
  const capByAge = age < 13 ? 2400 : age < 15 ? 4000 : age < 18 ? 9000 : 16000;
  return Math.min(raw, capByAge);
}

// 大名の御料＝直轄領（配り残した石高の総和）＋全城の余禄
export function goryoOf(s, fid) {
  const cs = s.castles.filter((c) => c.faction === fid);
  let direct = 0, extra = 0;
  for (const c of cs) {
    direct += Math.max(0, c.koku - fiefBurden(s, c.id));
    extra += extraIncome(c);
  }
  return { direct, extra, total: direct + extra };
}

/* 表に出す忠誠（GDD 6.1）。

   忠誠は月ごとに小数で動く。知行の過不足も、幼き当主のもとでの揺れも、
   一月あたり 0.4 や 1.3 といった刻みで積み上がる。
   そのまま出すと「忠63.79999999999998」のような字になってしまう。

   出すときは小数点以下を切り捨てる。四捨五入だと、実の値より高く見えることがある。
   「忠39.6」を「40」と出すような読み替えはせず、届いた分だけを示す。
   忠68と出ていれば、その者の忠誠は六十八以上ある。

   値そのものは小数のまま持つ。刻みを丸めると、月々の細かな増減が積み上がらなくなる。

   （なお「忠誠40以下なら降る」の境目は、いまも小数の値で判ずる。
   ちょうど40と出ている者は、実の値が40.0なら降り、40.4なら降らぬ。
   目に見える数と判じ方をぴたりと揃えるなら、判ずる側もこの関数を通すことになる。） */
export const 忠誠 = (gen) => Math.floor(gen && gen.loyal != null ? gen.loyal : 60);

// 知行の過不足が忠誠をどう動かすか（毎月）
export function loyaltyDrift(gen) {
  const want = fiefWanted(gen), have = fiefOf(gen);
  if (want <= 0) return 0;
  const r = have / want;
  if (r >= 1.25) return 0.7;
  if (r >= 1.0) return 0.35;
  if (r >= 0.75) return 0;
  if (r >= 0.5) return -0.5;
  return -1.2;
}

/* 勢力が配れる知行の総量。

   知行は城の石高から分け与える田の高であるから、配れるのは石高までである。
   すぐ上の fiefCapacity が「城が配れる知行の限り＝その城の石高」と定めているのに、
   ここだけ四割で切っていた。同じ折の中で食い違っていたことになる。

   四割で切っていたころは、初手から二倍以上を配っている家がほとんどで
   （織田家は限り75,012石に対し157,728石）、一石も加増できなかった。
   知行を配るという仕組みそのものが、始めから使えぬ状態だった。

   十割まで配れば大名の直轄（御料）は無くなる。配りすぎれば自らの取り分が消える、
   という釣り合いで縛るのが筋であって、線引きで縛るものではない。 */
export const FIEF_SHARE = 1.0;                   // 配れるのは石高の十割まで

export function fiefRoom(s, fid) {
  const koku = s.castles.filter((c) => c.faction === fid).reduce((a, c) => a + c.koku, 0);
  const used = s.generals.filter((x) => x.faction === fid && !x.captive).reduce((a, x) => a + fiefOf(x), 0);
  const cap = Math.round(koku * FIEF_SHARE);
  return { cap, used, left: cap - used };
}

