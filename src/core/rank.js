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

/* 城を守るに要る兵。周囲の長さと民の心で決まる（GDD 9.2）。

   この数は「目安」であって、縛りではない。城を空にして野に出るのも
   一つの決断である。桶狭間の今川方も、姉川の浅井方も、城に兵を残して
   野に出た。残さずに出た者もいる。決めるのは遊ぶ側であって、掟ではない。

   ──ただし目安が縛りとして効く場所がある。援軍を出せるか、AIが出陣するか
   を、この数を引いた残りで判じている。ゆえに数そのものが狂うと盤が凍る。

   壁の要りだけで決めていたころは、物差しが動かなかった。

     守るに要る兵　四百十〜八百六十　（二.一倍）
     城の兵　　　　五十三〜三千九百二十七　（七十四倍）

   城の大きさが七十四倍ちがうのに、要る兵は二倍しか動かぬ。結果、
   二百七十一城のうち七十九城で、居る兵より多くの守兵を求めていた。

     香宗城　　城兵 九十二　守るに要る兵 五百六十　→　出せる兵 ゼロ
     岡豊城　　城兵 百九十九　守るに要る兵 六百四十　→　出せる兵 ゼロ

   長宗我部が本拠から一兵も動かせなかったのは、これである。援軍の候補にも
   上がらず、采配も出陣を諦めていた。

   そこで、壁の要りがその城の器に見合わぬ城だけ、器のほうで量り直す。
   壁を人で埋める数ではなく、その地の身代に見合った在番である。貧しい国の
   城が向き合うのは貧しい国の軍勢であり、要る守りもそれに応じる。

   触るのは立ち行かぬ城だけにした。壁の要りが平時の軍役の半ばを超える城が
   それである。二百七十一城のうち百三十城が下がり、百四十一城は元のまま
   据え置かれる。小田原も那古野も清洲も一乗谷も動かない。器で一律に量ると
   一乗谷が七百十から千九十五へ跳ね、大大名の初動まで鈍るからである。

   境目で値が跳ぶのは承知のうえである。この数は目安であって、どちらの側の
   数にもそれぞれ理屈が通っている。 */
export const minGarrison = (c) => {
  const 壁の要り = Math.round(c.def * 10 + (100 - c.min) * 5);
  const 器 = (c.koku / 10000) * 300 * 軍役の割増(c.koku);
  if (壁の要り <= 器 * 0.55) return 壁の要り;          // 身代に見合っている。元のまま
  const 割 = Math.max(0.12, Math.min(0.55, 0.20 + (c.def - 45) / 400 + (70 - c.min) / 400));
  return Math.max(40, Math.round(器 * 割));
};

/* 小身ほど、村を丸ごと駆り出せる（GDD 6.4）。

   軍役の器は、これまで家の大小を問わず一万石に三百八十人であった。
   ところが盤の実際はそうなっていない。

     三万石未満の家（三十二家）  兵 六百二十二人／万石
     二十万石超の家（十五家）    兵 二百四十三人／万石

   大家の二百四十三人は史実の軍役（一万石に二百五十〜三百人）に近い。
   外れているのは小勢のほうである。一律三百八十人では、小勢には低すぎて
   徴募が一人も効かず、大家には高すぎて縛りにならない。

   理屈も立つ。国人領主は在地に密着し、村を丸ごと駆り出せた。広域を治める
   大名は耕作と行政を残さねばならず、率は下がる。三万石を境として、
   小さいほど厚く見る。三万石を超える城は、これまでと変わらない。

     五千石   ×一.七五   六百六十五人／万石
     八千五百石 ×一.六五   六百二十五人／万石（岡豊城）
     一万三千五百石 ×一.五〇 五百六十八人／万石（本山城）
     二万石   ×一.三〇   四百九十四人／万石
     三万石以上 ×一.〇〇   三百八十人／万石（もとのまま） */
export const 軍役の割増 = (koku) =>
  Math.max(1, Math.min(1.9, 1 + (30000 - koku) / 30000 * 0.9));

export const troopCap = (c, p, s) => Math.round((c.koku / 10000) * MOB_POLICY[p].per
  * 軍役の割増(c.koku)
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
  { key: "宿老", min: 20000, desc: "複数の国を束ね、大名に代わって総大将を務める" },
  { key: "家老", min: 8000, desc: "旗頭として一国を預かり、その国の城主を寄騎に取る" },
  { key: "侍大将", min: 2500, desc: "城主となり、一手の兵を率いる" },
  { key: "物頭", min: 0, desc: "一手の兵を預かる。城代にはなれる" },
];

/* 身分の決まり方（GDD 6.4）。

   物頭と侍大将は禄高で定まる。知行だけでなく、余禄も身代のうちである。

   家老はそうではない。大名が任じる役――旗頭である。家が城を持つ国につき
   一人まで置ける。新しい国へ進出すれば、そこにもう一人任じられる。

   もとは家老も禄高で決めていた（八千石以上）。しかし織田家は尾張の一角から
   始まるのに、初手から家老が五人もいた。国を一つしか持たぬ家に家老が五人
   いては、旗頭という意味を成さない。逆に大身の家では家老が十人を超え、
   侍大将との段差も消えていた。

     三好家　八国に家老十五名　　北条家　三国に家老十二名
     織田家　一国に家老五名

   役として任じる形にすれば、家老は国の数だけとなり、国を取るたびに一人ずつ
   増える。侍大将との間に、はっきりした隔たりが生まれる。

   宿老も同じく役である（複数国を束ねる軍団長）。こちらは第四段で扱う。
   いまは禄高でも宿老になれる形を残してある。 */
export function rankOf(gen, s) {
  if (!gen) return RANKS[RANKS.length - 1];
  if (gen.lord) return { key: "当主", min: 0, desc: "一家の主" };
  if (s && isGuardian(s, gen)) return { key: "後見", min: 0, desc: "幼き当主に代わって家を差配する" };
  const f = s ? stipendOf(s, gen) : fiefOf(gen);
  /* 宿老は禄高でも役でも就ける。二万石を超える身代の者は、旗頭を務めて
     いようがいまいが宿老である。役として任じる形は第四段で入れる。 */
  if (gen.役 === "宿老" || f >= RANKS[0].min) return RANKS[0];
  // 家老は役である。禄高では就けない（禄高で就けるのは侍大将まで）
  if (gen.役 === "家老") return RANKS[1];
  return f >= RANKS[2].min ? RANKS[2] : RANKS[3];
}

/* 家老を置ける数＝その家が城を持つ国の数（GDD 6.4）。
   新しい国へ進出すれば、一人ぶん枠が増える。国を失えば減る。 */
export function 家老の枠(s, fid) {
  const 国 = new Set(s.castles.filter((c) => c.faction === fid).map((c) => c.kuni));
  return 国.size;
}

// いま任じてある家老（その家の）
export const 家老たち = (s, fid) => s.generals.filter((g) =>
  g.faction === fid && !g.captive && g.役 === "家老");

/* 旗頭に任じる（GDD 6.4）。

   旗頭（はたがしら）とは、その旗のもとに人が集まる者である。武田家の
   先方衆にも、織田家の方面軍にも使われた語で、柴田勝家は「北国の旗頭」と
   呼ばれた。寄騎（与力）を預かる側を、史実では寄親とも言う。

   はじめ「国主」と呼んでいたが、これは江戸期に国持大名を指す格付けであって、
   大名が家臣に与える役ではない。「その国の主」という語感なので、主君から
   預かる立場とは意味が逆になる。守護代は意味としては正しいが、この盤では
   織田大和守家が尾張守護代を名乗っているので衝突する。

   任じられるのはその国に根を持つ者だけである。国を預かるのだから、根を
   持たぬ者では務まらない。すでにその国に旗頭がいれば、置き換える。

   一人が二国の旗頭を兼ねることはない。別の国の旗頭であれば、その役を解いて
   から移る（国替えである）。 */
export function 家老に任じる(s, fid, kuni, genId) {
  const g = s.generals.find((x) => x.id === genId);
  if (!g || g.faction !== fid || g.captive) return { ok: false, why: "その者はいない。" };
  if (g.lord) return { ok: false, why: "当主は家老に任じられない。" };
  const 城 = s.castles.find((c) => c.id === (g.本領 || g.at));
  if (!城 || 城.kuni !== kuni) {
    return { ok: false, why: `${g.name}は${kuni}に根を持たない。旗頭はその国に本領を持つ者から選ぶ。` };
  }
  if (身分の位(g, s) < 2) {
    return { ok: false, why: `${g.name}は${rankName(g, s)}。旗頭となるには侍大将以上の身分が要る。` };
  }
  const 先 = 国の家老(s, fid, kuni);
  if (先 && 先.id !== g.id) { 先.役 = null; 先.役国 = null; }
  if (g.役 === "家老" && g.役国 && g.役国 !== kuni) { g.役国 = null; }   // 国替え
  g.役 = "家老"; g.役国 = kuni;
  return { ok: true, 先: 先 || null };
}

/* 枠を超えた旗頭を解く。国を失えば、その国の旗頭は役を離れる。
   国は持っているが枠が足りぬ、ということは起きない（枠＝国の数だから）。 */
export function 家老を繕う(s, fid) {
  const 持つ国 = new Set(s.castles.filter((c) => c.faction === fid).map((c) => c.kuni));
  const 解いた = [];
  for (const g of s.generals) {
    if (g.faction !== fid || g.役 !== "家老") continue;
    if (!g.役国 || !持つ国.has(g.役国)) { g.役 = null; g.役国 = null; 解いた.push(g); }
  }
  return 解いた;
}

/* ------------------------------------------- 寄親と寄騎（GDD 6.4）

   寄騎（与力）とは、大名が家臣に預ける武士のことである。預かる側を寄親と
   いう。ここが肝心なのだが、寄騎はあくまで**大名の直臣**であって、寄親の
   家臣ではない。柴田勝家に付けられた府中三人衆（前田利家・佐々成政・
   不破光治）は信長の直臣であり、信長の一存で付け替えられた。

   ゆえに寄騎とは所有ではなく差配である。大名はいつでも解ける。

   この盤では、旗頭（家老）がその国の城主を寄騎に取る。旗頭が出陣すれば
   寄騎も従い、一手の軍となって動く。国を一つ預けるとは、その国の城主たちを
   一人の下に束ねるということである。

     取れるのは　その国に本領を持つ城主（侍大将以上）
     取る側は　　その国の旗頭
     解けるのは　大名（いつでも）

   一人の寄騎が二人の寄親に付くことはない。 */
export const 寄騎たち = (s, 寄親id) => s.generals.filter((g) =>
  !g.captive && g.寄親 === 寄親id);

/* 寄騎に取れるか。同じ国に本領を持ち、城主となれる身分の者だけである。 */
export function 寄騎に取れるか(s, 寄親, gen) {
  if (!寄親 || !gen || gen.captive) return { ok: false, why: "その者はいない。" };
  if (寄親.役 !== "家老" || !寄親.役国) return { ok: false, why: `${寄親.name}は旗頭ではない。` };
  if (gen.id === 寄親.id) return { ok: false, why: "己を寄騎にはできない。" };
  if (gen.lord) return { ok: false, why: "当主は寄騎にならない。" };
  if (gen.faction !== 寄親.faction) return { ok: false, why: "家が違う。" };
  if (gen.役 === "家老") return { ok: false, why: `${gen.name}は旗頭である。旗頭は寄騎にならない。` };
  if (身分の位(gen, s) < 2) {
    return { ok: false, why: `${gen.name}は${rankName(gen, s)}。寄騎となるには侍大将以上の身分が要る。` };
  }
  const 城 = s.castles.find((c) => c.id === (gen.本領 || gen.at));
  if (!城 || 城.kuni !== 寄親.役国) {
    return { ok: false, why: `${gen.name}は${寄親.役国}に本領を持たない。旗頭が束ねられるのは一国のうちである。` };
  }
  if (gen.寄親 && gen.寄親 !== 寄親.id) {
    const 先 = s.generals.find((x) => x.id === gen.寄親);
    return { ok: false, why: `${gen.name}はすでに${先 ? 先.name : "他の者"}の寄騎である。` };
  }
  return { ok: true };
}

// 寄騎に取る／解く
export function 寄騎に取る(s, 寄親id, genId) {
  const 寄親 = s.generals.find((x) => x.id === 寄親id);
  const g = s.generals.find((x) => x.id === genId);
  const r = 寄騎に取れるか(s, 寄親, g);
  if (!r.ok) return r;
  g.寄親 = 寄親id;
  return { ok: true };
}
export function 寄騎を解く(s, genId) {
  const g = s.generals.find((x) => x.id === genId);
  if (g) g.寄親 = null;
  return s;
}

/* 寄親でなくなった者の寄騎を解く。旗頭を離れれば、束ねる者ではなくなる。
   本領が国を出た寄騎も解ける（旗頭が束ねられるのは一国のうちだからである）。 */
export function 寄騎を繕う(s, fid) {
  const 解いた = [];
  for (const g of s.generals) {
    if (g.faction !== fid || !g.寄親) continue;
    const 親 = s.generals.find((x) => x.id === g.寄親);
    const 城 = s.castles.find((c) => c.id === (g.本領 || g.at));
    const 良 = 親 && !親.captive && 親.役 === "家老" && 親.役国
      && 城 && 城.kuni === 親.役国 && 城.faction === fid;
    if (!良) { g.寄親 = null; 解いた.push(g); }
  }
  return 解いた;
}

// その国の旗頭（いれば）
export const 国の家老 = (s, fid, kuni) => s.generals.find((g) =>
  g.faction === fid && !g.captive && g.役 === "家老" && g.役国 === kuni) || null;

export const rankName = (gen, s) => rankOf(gen, s).key;

// その城の城主。当主がいれば当主、なければ禄高の最も高い家老。
export function castellanOf(s, c) {
  const gs = s.generals.filter((x) => x.at === c.id && x.faction === c.faction && !x.captive);
  if (!gs.length) return null;
  const lord = gs.find((x) => x.lord);
  if (lord) return lord;                       // 当主のいる城は当主が城主である
  /* 任じた者が預かれるかは canHoldCastle で判ずる。ここだけ禄高で測っていたため、
     一門を任じても黙って別の者が城主とみなされていた。

     城代（c.城代）はそのまま預かる者である。城主の資格には届かぬが、留守を
     任された以上その者が城を預かっている。ここで拾わねば、任じた本人ではなく
     禄高の高い別の者が城を預かっていることになり、守備隊の統率も食い違う。 */
  const named = c.lordId && gs.find((x) => x.id === c.lordId);
  if (named && (c.城代 || canHoldCastle(named, s, c))) return named;
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
  /* 城主になれるのは侍大将以上である（GDD 6.4）。

     もとは禄高だけで測っていた。城の要りは高くても八千石で頭打ちなので、
     禄高がたまたま届いた物頭でも城主になれてしまう。城を預かるのは
     一手の兵を任される身分になってからのことで、物頭は城代にとどまる。 */
  if (身分の位(gen, s) < 2) return false;
  const need = c ? castleRankNeed(c) : 8000;
  return (s ? stipendOf(s, gen) : fiefOf(gen)) >= need;
};

/* 城代になれるか（GDD 6.4）。

   城主が置けぬ城を預かる者である。物頭でも務まる。門番と足軽を束ねて
   留守を守るのが役目であって、その城を知行として与えられたわけではない。
   ゆえに本領は移らない。

   守備隊の統率はこの者の統率が映る。誰も置かねば四十に落ちる。 */
export const canBeKeeper = (gen) => !!gen && !gen.captive;

// 城主か城代か。身分で決まる（一門と当主は身分を問わず城主）
export const 預かりの格 = (gen, s, c) =>
  (canHoldCastle(gen, s, c) ? "城主" : (canBeKeeper(gen) ? "城代" : null));

// 総大将を務められるのは当主か宿老。
export const canBeSupreme = (gen, s) => !!gen && (gen.lord || (s ? stipendOf(s, gen) : fiefOf(gen)) >= 20000);

/* 軍を率いるのは誰か（GDD 6.4）。

   侍大将の下に家老は付かない。軍中にその家の家老がいるなら家老が、宿老が
   いるなら宿老が総大将である。当主が出れば当主が率いる。身分とはそういう
   ものであって、遊ぶ側が選ぶ順で決まるものではない。

   もとは出陣の画面で「選んだ順の先頭」を総大将としていた。物頭を先に選べば
   物頭が宿老を指揮することになり、身分が意味を持たなかった。

   同じ身分が並べば禄高の高い者、それも同じなら統率の高い者が率いる。 */
const 身分の順 = { 当主: 5, 宿老: 4, 家老: 3, 侍大将: 2, 物頭: 1 };
export const 身分の位 = (gen, s) => (gen && gen.lord ? 5 : (身分の順[rankName(gen, s)] || 1));

export function 総大将を定める(s, 将ら) {
  const 並 = (将ら || []).filter(Boolean);
  if (!並.length) return null;
  return [...並].sort((a, b) =>
    身分の位(b, s) - 身分の位(a, s)
    || stipendOf(s, b) - stipendOf(s, a)
    || (b.lead || 0) - (a.lead || 0))[0];
}

/* 陣触れの届く先（GDD 6.4）。

   総大将の身分が、軍の大きさそのものを決める。

     侍大将　自らの城の兵だけ。近隣の小競り合いはこれで足りる
     家老　　一国のうちの城から参陣させられる
     宿老・当主　どこからでも。全国の兵を集められる

   柴田を北国へ、明智を丹波へ――方面軍の芽はここにある。宿老を立てねば
   天下の兵は動かぬ、という形になる。

   物頭は総大将になれない（軍を率いるには侍大将以上が要る）。 */
export const 陣触れの届き = (gen, s) => {
  if (!gen) return "無し";
  const 位 = 身分の位(gen, s);
  if (位 >= 4) return "天下";      // 当主・宿老
  if (位 === 3) return "一国";      // 家老
  if (位 === 2) return "自城";      // 侍大将
  return "無し";                    // 物頭
};

/* その城が陣触れに応じられるか。総大将の身分と、城の在り処で判ずる。 */
export function 陣触れに応じる(s, 大将, 本陣, 城) {
  if (!大将 || !城) return false;
  const 届 = 陣触れの届き(大将, s);
  if (届 === "天下") return true;
  if (届 === "一国") return !!本陣 && 城.kuni === 本陣.kuni;
  if (届 === "自城") return !!本陣 && 城.id === 本陣.id;
  return false;
}

/* 総大将を先頭に据えた並び。出陣はこの順で軍に渡す（先頭が大将になる）。 */
export function 大将を先頭に(s, 将ら) {
  const 主 = 総大将を定める(s, 将ら);
  if (!主) return [...(将ら || [])];
  return [主, ...(将ら || []).filter((x) => x && x.id !== 主.id)];
}

// 出陣そのものは物頭でもできる。ただし率いられる兵に限りがある。
export const canLeadArmy = () => true;

/* 軍役（GDD 6.4）。知行を与えれば、その高に応じた兵を出す。

   これまで手勢（直属家臣団）は初めの値のまま一切動かなかった。加増しても
   増えない。つまり「国が富めば兵が増える」という道が、ここで切れていた。

   知行を加増したその分だけ、出すべき軍役――手勢の器――が増える。
   一万石につき五百人を目安とし、統率の高い将ほど多くを抱えられる。
   器が増えても兵はその月に湧かない。募って調えるには時が要る。

   減らす向きにも働く。知行を召し上げれば軍役も軽くなる。ただし初めから
   抱えている手勢を、この理屈で削りはしない。 */
export const 軍役の率 = 500;                     // 一万石あたりの兵
export const 軍役の器 = (gen) => (gen && gen.retCap != null ? gen.retCap : (gen ? gen.retinue : 0));
export const 軍役の増 = (gen, d) =>
  Math.round((d / 10000) * 軍役の率 * (0.7 + ((gen && gen.lead) || 60) / 200));

/* 身分ごとの兵の限り。

   いまはどこからも呼ばれていない。史実で武将が連れてきた兵は知行高で決まる
   （軍役）。身分が決めたのは何人を束ねられるかであって、自らの手勢の数では
   ない――そう改めたので、この縛りは外した。

   残してあるのは、古い記録や外の道具が呼んでいるかもしれぬためである。 */
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
/* その城が背負っている知行の高。余禄の分け前を割るのに使う。

   ここも本領で数える。居場所（at）で数えていたころは、一人が出陣するたびに
   その城の背負いが軽くなり、留守の者の禄高がひとりでに上がっていた。
   知行は土地に結びつくものであって、出かけたからといって消えはしない。 */
export function fiefBurden(s, castleId) {
  return s.generals
    .filter((g) => (g.本領 || g.at) === castleId && !g.captive && !g.lord)
    .reduce((a, g) => a + fiefOf(g), 0);
}

// 武将の禄高＝知行＋その城の余禄の分け前
export function stipendOf(s, gen) {
  if (!gen) return 0;
  // 若年の者に大禄は与えられぬ。齢を重ねてこそ身代も増す。
  const age = gen.age == null ? 30 : gen.age;
  /* 身代は本領から出る。いま居る所からではない（GDD 6.4）。

     もとは gen.at（いま居る城）で数えていた。ゆえに出陣しただけで禄高が
     動いた。八百三十七名を測ると、出陣で平均九百十八石が目減りしていた。
     余禄は本領の湊や市から入るものであって、遠征先の余禄が懐に入る道理はない。

     もう一つ、出陣中は城が見つからず fief をそのまま返していた。齢の頭打ちを
     素通りするので、天文十五年の織田信長（十三歳）は在城で二千四百石、
     出陣すると三万二千六百石になっていた。本領で数えれば、どちらも同じである。 */
  const c = s.castles.find((x) => x.id === (gen.本領 || gen.at));
  if (!c) {
    // 本領も居所も無い（城を失った、取り立て直後など）。知行だけで数える
    if (gen.lord || age >= 20) return fiefOf(gen);
    const cap0 = age < 13 ? 2400 : age < 15 ? 4000 : age < 18 ? 9000 : 16000;
    return Math.min(fiefOf(gen), cap0);
  }
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

/* 配れる知行の余地。

   当主の身代は数に入れない。禄高の説き書きにあるとおり「大名の身代は
   家臣に配る知行ではないので、直轄領と余禄を合わせて御料と呼ぶ」。
   ところがここでは当主の知行まで「配り済み」に数えていた。

   小身の家ほど当主の取り分が家の石高に近いので、これが効く。長宗我部は
   石高八千五百石に対し配り済み二万三千百三十三石――余地が負であって、
   加増が永久にできなかった。当主の一万五千六十六石を御料として除けば、
   家臣に配ったのは六千八百石。余地は千七百石になる。
   （二万一千九百九十七石であった岡豊を八千五百石に改めたとき、
     家臣の知行を直さなかったのも重なっていた） */
export function fiefRoom(s, fid) {
  const koku = s.castles.filter((c) => c.faction === fid).reduce((a, c) => a + c.koku, 0);
  const used = s.generals.filter((x) => x.faction === fid && !x.captive && !x.lord)
    .reduce((a, x) => a + fiefOf(x), 0);
  const cap = Math.round(koku * FIEF_SHARE);
  return { cap, used, left: cap - used };
}

