import { captureChance, makePrisoner, takeAsPrisoner } from "../core/capture.js";
import { canRecruit, loyaltyAfterRecruit, ruinedHouse } from "../core/house.js";
import { findPath, marchMonths, nodeById, roadBetween } from "../core/paths.js";
import { minGarrison, stipendOf, 陣触れに応じる, 陣触れの届き } from "../core/rank.js";
import { newRoster, rosterCut, rosterSync, rosterTake } from "../core/roster.js";
import { relOf } from "../core/state.js";
import { clamp, fmt } from "../core/util.js";
import { tryAmbush } from "../core/ambush.js";
import { persuadeResult } from "../core/capture.js";
import { succeed } from "../core/house.js";
import { ROAD_SPEED } from "../data/roads.js";
import { rankName, 軍役の器 } from "../core/rank.js";
import { isVassal } from "../core/state.js";
import { rosterArms } from "../core/roster.js";
import { holdsProvince } from "../core/province.js";
import { underMyBanner, 援けに着く } from "../core/state.js";
import { 難を逃れる } from "../core/capture.js";

// ------------------------------------------------ 援軍（GDD 7.3 / 7.4）
// 各城・各勢力は「守備最低数・距離・従属度」から派遣・減員・遅参・拒否を判断する。
/* 遠征の兵糧（GDD 7.3）。

   関ヶ原も大坂の陣も、全国から兵が集まった。主君の求めがあれば、九州の
   兵も奥羽の兵も出る。呼べる先を距離で切るのは、その姿に合わない。

   縛るのは兵糧である。軍は月に一人あたり〇.〇九石を食う。行程のぶんに
   陣中の二月を足して持たせる。遠ければ遠いほど蔵が空く。

     一月の道  一人〇.二七石
     六月の道  一人〇.七二石
     十二月の道 一人一.二六石

   加えて、城は自らの蔵を空にして援軍を出さない。留守の兵が半年食える
   だけは残す。攻められれば籠らねばならぬからである。

   これで、遠国から大軍を呼ぶには豊かな蔵が要ることになる。天下を統べる
   ほどの身代でなければ、全国からの動員はできない。 */
export const 遠征の兵糧 = (men, months) => Math.round(men * 0.09 * ((months || 1) + 2));

/* 兵糧の運び賃（GDD 7.3）。

   遠征の重みは、米そのものより運ぶ費えに出る。陸送は距離に比例して跳ね
   上がり、人足と馬と船を雇わねばならぬ。秀吉の遠征でも、最も金を食ったのは
   兵站であった。

   蔵の米だけを縛りにしても、大城の蔵は大きいので効かない（天下を持つ盤で
   薩摩へ攻めるとき、二百六十九城が並んで兵糧不足で出せぬ城は一つも無かった）。
   遠国から大軍を呼ぶには、運ぶ金が要る。

     一人・一月につき〇.〇二貫。
     三万を十か月かけて呼べば六千貫。天下を統べるほどの身代でなければ叶わない。

   隣国から呼ぶだけなら僅かである（千人を一月で二十貫）。近くの助けは
   これまで通り気軽に、遠国の動員は覚悟のいることになる。 */
export const 運び賃 = (men, months) => Math.round(men * ((months || 1)) * 0.02);

/* 呼んだ側の金蔵から運び賃を引く。払えぬぶんは引かず、蔵を空にするに留める。
   （画面の側で先に量っているので、ここまで来て足りぬことは普通は起きない） */
export function 運び賃を払う(s, men, months) {
  const f = s.factions[s.player];
  if (!f) return 0;
  const 賃 = Math.min(f.gold, 運び賃(men, months));
  f.gold = Math.round((f.gold - 賃) * 100) / 100;
  return 賃;
}
export const 留守の蓄え = (c) => Math.round((c.local || 0) * 0.08 * 6);

/* 呼べる寄騎（GDD 7.3）。

   縛りは三つある。蔵の兵糧、運び賃、そして総大将の身分である。

   身分の縛りは陣触れの届きによる（core/rank.js）。侍大将が率いる軍には
   自らの城の兵しか集まらず、家老なら一国、宿老と当主なら天下じゅうから
   集まる。柴田を北国へ、明智を丹波へ――方面軍の芽はここにある。

   大将を渡さねば、これまで通り身分では縛らない（援軍の要請など、総大将を
   立てぬ場面がある）。 */
export function reinforceOffers(g, from, target, 大将) {
  const out = [];
  const 本陣 = g.castles.find((x) => x.id === from);
  for (const c of g.castles) {
    if (c.id === from) continue;
    if (c.id === target) continue;              // 攻める相手の城から援軍は呼べない
    // 総大将の身分が、陣触れの届く先を決める
    if (大将 && c.faction === g.player && !陣触れに応じる(g, 大将, 本陣, c)) continue;
    const path = findPath(c.id, target);
    if (!path) continue;
    const legs = path.length - 1;
    const gens = g.generals.filter((x) => x.at === c.id && x.faction === c.faction && !x.captive);
    const avail = Math.max(0, c.local + gens.reduce((a, x) => a + x.retinue, 0) - minGarrison(c));
    /* 指図が通るか、頼むだけか。
       自家と臣従の家には下知が通る。どの将を何人で出すかまでこちらが決める。
       同盟・従属は対等か緩やかな結びつきゆえ、頼むことしかできぬ。
       出るか出ぬか、どれだけ出すかは相手が決める。 */
    let kind = null, ratio = 0, chance = 1, 指図 = false;
    if (c.faction === g.player) { kind = "自領"; ratio = 0.4; 指図 = true; }
    else if (isVassal(g, g.player, c.faction)) { kind = "臣従"; ratio = 0.35; chance = 1; 指図 = true; }
    else {
      const rel = relOf(g, g.player, c.faction);
      if (rel.state === "従属" || rel.state === "臣従") { kind = rel.state; ratio = 0.35; chance = 0.9; }
      else if (rel.state === "同盟") { kind = "同盟"; ratio = 0.25; chance = clamp(rel.trust / 100, 0.2, 0.9); }
      else continue;
    }
    const months = marchMonths(c.id, target, c.faction) || Math.max(1, legs);
    /* 遠いほど兵糧が要る。距離で人数を削るのではなく、蔵の続くかぎり出す。
       もとは遠さで人数を割り引いていたが、それでは「遠国の兵は役に立たぬ」
       ことになってしまう。関ヶ原へ向かった島津も、遠いから兵を減らした
       わけではない。減らすのではなく、出せるか出せないかである。 */
    const 蔵 = Math.max(0, (c.food || 0) - 留守の蓄え(c));
    const 出せる兵糧 = Math.floor(蔵 / Math.max(0.01, 0.09 * (months + 2)));
    const men = Math.min(Math.floor(avail * ratio), 出せる兵糧);
    out.push({
      castleId: c.id, name: c.name, faction: c.faction, kind, men, legs, chance, 指図, months,
      // 指図の通る城では、こちらが将と兵を選ぶ。そのための素材も添える。
      gens: 指図 ? gens.map((x) => ({ id: x.id, name: x.name, age: x.age, lead: x.lead, valor: x.valor, wit: x.wit,
        // 率いられる兵の限りは身分では置かない。手勢は知行なりである（GDD 6.4）
        retinue: x.retinue, rank: rankName(x, g), limit: Math.max(軍役の器(x), x.retinue) })) : [],
      local: c.local, avail, garrison: minGarrison(c),
      蔵, 一人の兵糧: Math.round(0.09 * (months + 2) * 100) / 100,
      /* 運び賃は城の蔵ではなく主家の財布から出る。ゆえに城ごとには縛らず、
         呼んだ先を足し合わせた額を、進発の際にまとめて量る（画面の側で見る）。 */
      一人の運び賃: Math.round(months * 0.02 * 100) / 100,
      賃: 運び賃(men, months),
      reason: avail < 400 ? "守備が手薄で出せない"
        : 出せる兵糧 < 200 ? `兵糧が足りぬ（${months}か月の道に蔵${Math.round(蔵)}石）`
        : men < 200 && !指図 ? "出せる兵が少なすぎる" : null,
    });
  }
  /* 指図の通る城は先に並べる。呼べる先が埋もれては困る。
     数でも距離でも切らない。全国から呼べることが、この仕掛けの眼目である。
     盤に並べられる隊は三十二までなので（関ヶ原の参陣数）、呼びすぎても
     戦場に立てるのはそこまでである。 */
  return out.filter((o) => o.men > 0 || o.reason || o.指図)
    .sort((a, z) => (z.指図 ? 1 : 0) - (a.指図 ? 1 : 0) || a.legs - z.legs);
}


/* -------------------------------------- 味方の城へ着いた軍（GDD 9.2）

   後詰は、味方の城を救うために差し向けられる。着いた先は味方の城である。
   ここで「攻め手と守り手」の理屈を当てると、味方どうしが戦うことになる。
   （戦国記に「六角家と六角家が戦い」と出ていたのは、これであった。）

   城が囲まれていれば、囲みを打ち払う戦になる。相手は城ではなく寄せ手の軍である。
   囲みがなければ、ただ城へ入って合流する。 */
function 味方の城へ着く(s, army, castle) {
  const 合流 = () => {
    castle.local += Math.max(0, army.local);
    castle.food += Math.max(0, army.food || 0);
    if (army.rost && army.rost.length) castle.rost = [...(castle.rost || []), ...army.rost];
    rosterSync(castle, "rost", castle.local, `loc-${castle.id}`);
    /* 他家の城であれば、兵だけ守りに加え、将は本国へ帰す。
       援軍のつもりで送った将を、そのまま他家の城へ預けてしまってはいけない。 */
    const 他家 = castle.faction !== army.faction;
    const 本国 = 他家
      ? (s.castles.find((x) => x.id === army.from && x.faction === army.faction)
        || s.castles.find((x) => x.faction === army.faction))
      : null;
    for (const gid of army.gens) {
      const x = s.generals.find((q) => q.id === gid);
      if (x) x.at = 他家 ? (本国 ? 本国.id : castle.id) : castle.id;
    }
    s.armies = s.armies.filter((x) => x.id !== army.id);
  };

  const sg = s.sieges.find((x) => x.castleId === castle.id);
  const bes = sg && s.armies.find((x) => x.id === sg.armyId);
  if (!bes || bes.faction === army.faction) { 合流(); return s; }

  // 囲みを打ち払う戦。城の壁は関わらぬ。野で軍と軍が当たる。
  const 将 = (ids) => ids.map((id) => s.generals.find((x) => x.id === id)).filter(Boolean);
  const 統 = (gs) => (gs.length ? gs.reduce((a, x) => a + x.lead, 0) / gs.length : 55);
  const rG = 将(army.gens), bG = 将(bes.gens);
  const 後詰 = army.men * (0.85 + army.localTrain / 250) * (1 + 統(rG) / 300) * (0.85 + Math.random() * 0.3);
  // 寄せ手は城を囲んだまま背後を衝かれる。備えは薄い。
  const 寄手 = bes.men * (0.80 + (bes.localTrain || 60) / 250) * (1 + 統(bG) / 300) * (0.85 + Math.random() * 0.3);
  const 勝 = 後詰 > 寄手;
  const r = Math.min(後詰, 寄手) / Math.max(後詰, 寄手);
  const 後詰損 = Math.round(army.men * (勝 ? 0.14 * r + 0.05 : 0.28 + 0.2 * r));
  const 寄手損 = Math.round(bes.men * (勝 ? 0.30 + 0.2 * r : 0.13 * r + 0.05));
  army.men = Math.max(0, army.men - 後詰損); army.local = Math.max(0, army.local - 後詰損);
  bes.men = Math.max(0, bes.men - 寄手損); bes.local = Math.max(0, bes.local - 寄手損);
  s.chronicle.push({ y: s.year, m: s.month,
    text: `${castle.name}の囲みを解こうと${s.factions[army.faction].name}の後詰が${s.factions[bes.faction].name}の陣を衝き、`
      + `${勝 ? "囲みを打ち払った" : "退けられた"}（後詰${fmt(後詰損)}人・寄せ手${fmt(寄手損)}人を失う）。` });

  if (勝) {
    // 寄せ手は囲みを解いて引き上げる
    const 本国 = s.castles.find((x) => x.id === bes.from) || s.castles.find((x) => x.faction === bes.faction);
    if (本国) {
      本国.local += Math.max(0, bes.local);
      if (bes.rost && bes.rost.length) 本国.rost = [...(本国.rost || []), ...bes.rost];
      rosterSync(本国, "rost", 本国.local, `loc-${本国.id}`);
      for (const gid of bes.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = 本国.id; }
    }
    s.armies = s.armies.filter((x) => x.id !== bes.id);
    s.sieges = s.sieges.filter((x) => x.castleId !== castle.id);
    合流();
  } else {
    // 後詰は退く。城は囲まれたままである。
    const 本国 = s.castles.find((x) => x.id === army.from);
    if (本国 && 本国.faction === army.faction) {
      本国.local += Math.max(0, army.local);
      for (const gid of army.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = 本国.id; }
    } else 合流();
    s.armies = s.armies.filter((x) => x.id !== army.id);
    if (sg) sg.relief = null;                 // 改めて後詰を差し向けうる
  }
  return s;
}

// 陥落の処理（GDD 9.5）。武将の身の振り方、地域家臣団の去就、戦災を扱う。
export function sackCastle(s, castle, army, hard) {
  // その家の最後の城か。最後なら、城内の者は散らさず戦後の始末に回す（GDD 12.4）
  const lastOne = s.castles.filter((c2) => c2.faction === castle.faction).length === 1;
  const oldF = castle.faction;
  // 城を守るのは、身が自由な者だけである。囚われの身は戦わぬ。
  const defGens = s.generals.filter((x) => x.at === castle.id && x.faction === oldF && !x.captive);
  // その城に囚われていた者。城が落ちれば身柄も動く。
  const 囚人 = s.generals.filter((x) => x.at === castle.id && x.captive);
  const winner = army.faction;
  const log = (t) => s.chronicle.push({ y: s.year, m: s.month, text: t });
  // 旧主。血を分けた者や忠義の篤い者が靡くかを見るのに要る。
  const oldLord = s.generals.find((x) => x.faction === oldF && x.lord && !x.captive);
  // 捕らえる。当主であれば、家督はその場で残った者へ移る。
  // 当主を捕らえたまま家が主なしでは、以後の差配が立たぬ。
  const 捕らえる = (gen, 文) => {
    const 当主か = !!gen.lord;
    makePrisoner(s, gen, winner, castle.id);
    log(文);
    if (winner === s.player) s.captives = [...(s.captives || []), gen.id];
    if (当主か) { gen.lord = false; succeed(s, gen, "敵手に捕らわれた"); }
  };
  for (const gen of defGens) {
    // 家の最後の城なら、ここで散らさず戦後の始末に回す。
    // 勝者が身の振り方を決めるのが道理であって、勝手に降ったり逃れたりはしない。
    if (lastOne) continue;
    // 統率・武勇が高いほど討死や抵抗に傾き、忠誠が低いほど降る
    const r = Math.random() + (hard ? 0.12 : 0) + gen.valor / 400 - gen.loyal / 320;
    /* 討死。踏みとどまる気概があっても、当主と器量者はそこで果てない。
       配下が殿を務めて落ち延びさせ、あるいは自らの手で斬り抜ける（難を逃れる）。
       ここを免れた者も、なお捕縛と落ち延びの判じには回る。 */
    if (r > 0.86 && Math.random() < 難を逃れる(gen)) {
      s.generals = s.generals.filter((x) => x.id !== gen.id);
      log(`${gen.name}は${castle.name}に踏みとどまり討死した。`);
    } else if (r > 0.70 && Math.random() < captureChance(gen) * 3.2) {
      捕らえる(gen, `${gen.name}は捕らえられた。`);
    } else if (r > 0.70) {
      const refuge = s.castles.find((c2) => c2.faction === oldF && c2.id !== castle.id);
      if (refuge) { gen.at = refuge.id; log(`${gen.name}は囲みを破って${refuge.name}へ逃れた。`); }
      else 捕らえる(gen, `${gen.name}は逃れる先なく、捕らえられた。`);
    } else if (r > 0.48) {
      // 城中で敵手に落ちた者。討死もせず、囲みも破れなかった。
      // その場で旗を替えるのは、心が既に旧主から離れている者だけである。
      //   ・当主は決して降らぬ。家を背負う者が、その場で人に仕えることはない
      //   ・旧主と血を分けた一門、忠誠の篤い者も靡かぬ（canRecruit）
      //   ・残る者も、心が離れていなければ肯んじない（persuadeResult：忠誠40以下は降り、
      //     41〜70は運、71以上は決して降らぬ）
      // 降らぬ者は、そのまま捕虜となる。扶持を与え、月を重ねて心を開かせるほかない。
      const 靡くか = !gen.lord && canRecruit(gen, oldLord).ok && persuadeResult(gen);
      if (靡くか) {
        gen.faction = winner; gen.loyal = loyaltyAfterRecruit(gen);
        gen.at = castle.id; gen.retinue = Math.round(gen.retinue * 0.5);
        log(`${gen.name}は降り、${s.factions[winner].name}に属した。`);
      } else {
        捕らえる(gen, gen.lord
          ? `${gen.name}は城を枕にすることも叶わず、生け捕りにされた。`
          : `${gen.name}は降らず、捕らえられた。`);
      }
    } else {
      const refuge = s.castles.find((c) => c.faction === oldF && c.id !== castle.id);
      // 当主は落ち延びるにも供が要る。逃れる先があっても、必ず落ち延びられるとは限らぬ。
      const 落ち延びる = refuge && (!gen.lord || Math.random() < 0.6);
      if (落ち延びる) { gen.at = refuge.id; gen.retinue = Math.round(gen.retinue * 0.6); log(`${gen.name}は${refuge.name}へ落ち延びた。`); }
      else 捕らえる(gen, `${gen.name}は落ち延びる先なく、捕らえられた。`);
    }
  }
  // 囚われの身の行方（GDD 12.3）。
  // 味方が城を落としたなら解き放たれ、そうでなければ新しい主の手に移る。
  for (const q of 囚人) {
    if (q.faction === winner) {
      q.captive = null; q.warLoyal = undefined;
      q.loyal = clamp((q.loyal == null ? 60 : q.loyal) + 8, 0, 100);   // 救われた恩は忘れぬ
      q.retinue = Math.round(120 + Math.random() * 100);
      log(`${castle.name}に囚われていた${q.name}が解き放たれた。`);
    } else if (q.captive.by !== winner) {
      q.captive = { ...q.captive, by: winner, at: castle.id };
      log(`${castle.name}に囚われていた${q.name}の身柄は${s.factions[winner].name}に移った。`);
      if (winner === s.player) s.captives = [...(s.captives || []), q.id];
    }
  }
  // 地域家臣団の去就
  const before = castle.local;
  const min0 = castle.min;
  const stay = Math.round(before * clamp(min0 / 260 + (hard ? 0 : 0.12), 0.05, 0.45));
  const yield_ = Math.round(before * clamp(0.30 - min0 / 400, 0.05, 0.3));
  const resist = Math.round(before * (hard ? 0.18 : 0.08));
  const scatter = Math.max(0, before - stay - yield_ - resist);
  log(`${castle.name}の地域家臣団${fmt(before)}人のうち、${fmt(stay)}人が残り、${fmt(yield_)}人が降り、`
    + `${fmt(resist)}人が抗い、${fmt(scatter)}人が散った。`);
  // 戦災
  castle.faction = winner;
  // 名簿。残った者と降った者は元の組のまま残り、攻め手の組が加わる
  const keepN = stay + yield_;
  castle.rost = rosterCut(castle.rost || newRoster(before, `loc-${castle.id}`), Math.max(0, before - keepN));
  /* 攻め手の兵は城に吸われない。軍は軍のまま、この城に在陣する（GDD 6.4）。

     もとは攻め手の地の兵をそのまま城兵に足していた。城を落とせば、連れて
     きた兵がその城の兵になってしまう。しかし在陣は城を与えられたことでは
     ないし、遠征軍の兵は遠征軍のものである。

     城に残るのは、元の守兵のうち留まった者と降った者だけである（三割から
     五割ほど。清洲城なら二千三十四人のうち約八百人）。空にはならないが、
     将は一人もいないので守備隊の統率は四十に落ちる。誰かを置くかどうかは、
     このあと大名が決める。 */
  castle.local = stay + yield_;
  rosterSync(castle, "rost", castle.local, `loc-${castle.id}`);
  castle.koku = Math.round(castle.koku * (hard ? 0.90 : 0.95));
  castle.comm = Math.round(castle.comm * (hard ? 0.80 : 0.90));
  castle.pop = Math.round(castle.pop * (hard ? 0.92 : 0.96));
  castle.food = Math.round(castle.food * (hard ? 0.35 : 0.6));
  castle.def = Math.round(castle.def * (hard ? 0.68 : 0.85));
  castle.hp = Math.round(castle.hp * (hard ? 0.55 : 0.8));
  castle.min = clamp(Math.round(min0 - (hard ? 28 : 16) - resist / Math.max(1, before) * 40), 8, 100);
  castle.najimi = 18;
  castle.lordId = null;
  castle.intrigue = false;
  castle.well = 100;
  /* 軍は解かれない。落とした城に在陣する（GDD 6.4）。

     もとはここで軍を消し、本軍の将を全員この城へ移していた。攻め取るたびに
     将がその城に住み着くので、遠征のたびに家中の者が散っていった。
     武将は本領に根付く。落とした城に居るのは在陣であって、移住ではない。

     在陣した軍は、そのまま次の城へ攻め寄せることも、解いて本領へ帰すことも
     できる。城主と所属を決めるのは、それとは別の下知である。 */
  army.at = castle.id;
  army.path = [castle.id];
  army.prog = 0;
  army.target = null;
  army.在陣 = castle.id;
  /* 囲みの印を落とす。城はもう落ちたのだから、囲んでいる軍ではない。

     残していると、その軍が次の城へ向かっても着陣の始末が回らない。
     月送りは「囲んでいない軍」だけを着いた軍として拾うからである
     （govern/month.js）。落とした城から次へ攻め寄せて、着いたきり
     何も起きぬ、というのはこれであった。 */
  army.sieging = false;
  army.reinforced = false;                 // 次の戦では、また寄騎を催せる
  army.seaDone = false;
  s.sieges = (s.sieges || []).filter((x) => x.armyId !== army.id);
  // 寄騎・後詰・同盟軍として来た軍は、それぞれの城へ帰る。
  // 助けに来た将まで奪った城に居着いては、元の城が空になってしまう。
  for (const a2 of s.armies.filter((x) => x.target === castle.id || x.at === castle.id)) {
    if (a2.faction === oldF) continue;                  // 旧主の軍はここでは扱わない
    if (a2.id === army.id) continue;                    // 本軍は在陣する。帰さない
    const home = s.castles.find((c2) => c2.id === a2.from)
      || s.castles.find((c2) => c2.faction === a2.faction);
    if (!home) continue;
    home.local += Math.max(0, a2.local);
    if (a2.rost && a2.rost.length) home.rost = [...(home.rost || []), ...a2.rost];
    rosterSync(home, "rost", home.local, `loc-${home.id}`);
    for (const gid of a2.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = home.id; }
    if (a2.faction === s.player) {
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${castle.name}攻めに加わった寄騎は${home.name}へ帰陣した。` });
    }
  }
  s.armies = s.armies.filter((x) => x.id === army.id
    || !(x.target === castle.id || x.at === castle.id) || x.faction === oldF);
  s.sieges = s.sieges.filter((x) => x.castleId !== castle.id);
  s.campaigns = (s.campaigns || []).filter((x) => x.target !== castle.id);
  log(`${castle.name}が落ち、${s.factions[winner].name}の手に渡った（旧領主：${s.factions[oldF].name}）。`);

  /* 采配（他家）はその場で差配を決める。遊ぶ側には、画面から問う。
     問うまでのあいだ、城は将のいないまま留守を守る（守備隊の統率は四十）。 */
  if (winner !== s.player) {
    城を委ねる(s, castle.id, army.id, 委ねる差配(s, castle, army));
  } else {
    s.委ねる待ち = [...(s.委ねる待ち || []).filter((x) => x.castleId !== castle.id),
      { castleId: castle.id, armyId: army.id }];
  }

  /* 一国を丸ごと押さえたら、その場で知らせる（GDD 12.5）。

     国がまとまってはじめて民は落ち着き、竿を入れられ、官位の目も出てくる。
     区切りとして大きいのに、これまでは何も出ず、月送りの民忠の動きから
     察するほかなかった。最後の城を取ったその時に告げる。 */
  if (castle.kuni && holdsProvince(s, winner, castle.kuni)) {
    const 国の城 = s.castles.filter((x) => x.kuni === castle.kuni);
    log(`${s.factions[winner].name}が${castle.kuni}を一国残らず手中にした（${国の城.length}城）。`);
    if (winner === s.player) {
      s.monthEvents = [...(s.monthEvents || []),
        `${castle.kuni}を平定した。国がまとまれば民は落ち着き、竿を入れられる。`];
      s.国平定 = { kuni: castle.kuni, castleId: castle.id, 城数: 国の城.length, y: s.year, m: s.month };
    }
  }
  // すべての城を失えば家は滅ぶ。残った者の始末は勝った側が決める（GDD 12.4）
  if (!s.castles.some((c2) => c2.faction === oldF)) {
    // 拠るべき城を失えば、野に出ている軍も散る。
    // これを残すと、滅んだはずの家が城を攻めてくる。
    for (const a2 of s.armies.filter((x) => x.faction === oldF)) {
      for (const gid of a2.gens) {
        const x = s.generals.find((q) => q.id === gid);
        if (x) x.at = castle.id;              // 将は落城の地へ引き据えられる
      }
    }
    s.armies = s.armies.filter((x) => x.faction !== oldF);
    s.sieges = s.sieges.filter((x) => {
      const bes = s.armies.find((a3) => a3.id === x.armyId);
      return !!bes;
    });
    s.campaigns = (s.campaigns || []).filter((x) => x.faction !== oldF);
    /* 捕虜になった者も、この時点で改めて処遇を問う。
       ただし「捕虜の処遇」と「滅亡の始末」の両方に載せてはならない。
       同じ者を二度問うことになるので、捕虜の列からは落とす。 */
    const 戻す = s.generals.filter((x) => x.faction === oldF && x.captive && x.captive.by === winner);
    for (const q of 戻す) q.captive = null;
    if (戻す.length) {
      const 済 = new Set(戻す.map((q) => q.id));
      s.captives = (s.captives || []).filter((id) => !済.has(id));
    }
    const { lord, retainers } = ruinedHouse(s, oldF);
    if (winner === s.player && (lord || retainers.length)) {
      // 遊ぶ側が勝ったなら、一人ずつ身の振り方を問う
      s.warSettle = { faction: oldF, winner, castleId: castle.id,
        lordId: lord ? lord.id : null,
        queue: [...(lord ? [lord.id] : []), ...retainers.map((x) => x.id)] };
    } else {
      // 他家同士なら自動で始末する。多くは召し抱えられ、一部は斬られる。
      for (const g2 of [lord, ...retainers].filter(Boolean)) {
        const rec = canRecruit(g2, lord);
        if (g2 === lord || !rec.ok || Math.random() < 0.25) {
          if (Math.random() < 0.4) { s.generals = s.generals.filter((x) => x.id !== g2.id); }
          else takeAsPrisoner(s, g2, winner, castle.id);
        } else {
          g2.faction = winner; g2.loyal = loyaltyAfterRecruit(g2); g2.lord = false;
          g2.at = castle.id;
        }
      }
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${s.factions[oldF].name}は最後の城を失い、滅亡した。` });
    }
    s.ruined = [...(s.ruined || []), oldF];
  }
}



// 画面外の合戦。兵数・練度・統率・城防から勝敗と損害を出す
/* 落とした城を誰に委ねるか（GDD 6.4）。

   在陣は城を与えられたことではない。城主を据え、所属の将を置いてはじめて、
   その城で内政ができる。空けたままにもできるが、将のいない城は守備隊の
   統率が四十に落ち、次に攻められれば脆い。

   置いた将は軍を離れ、その城を本領とする。連れていた直属もともに移るので、
   軍はそのぶん痩せる。取るか進むかの判断がここに出る。

     城主　　その城を預かる者。侍大将以上（身分の縛りは追って入れる）
     所属　　その城に根を移す者。城主のほかに何人でも
     兵　　　軍の地の兵から城へ残す数

   誰も置かねば、城は元の守兵だけで留守を守ることになる。 */
export function 城を委ねる(s, castleId, armyId, 差配) {
  const c = s.castles.find((x) => x.id === castleId);
  const a = (s.armies || []).find((x) => x.id === armyId);
  if (!c || !a) return s;
  const 置く = [...new Set([...(差配.所属 || []), ...(差配.城主 ? [差配.城主] : [])])];
  for (const gid of 置く) {
    if (!(a.gens || []).includes(gid)) continue;        // その軍にいない者は置けない
    const g = s.generals.find((x) => x.id === gid);
    if (!g) continue;
    g.at = c.id;
    g.本領 = c.id;                                      // 根を移す。以後の禄高もこの城から
    a.gens = a.gens.filter((x) => x !== gid);
  }
  if (差配.城主 && 置く.includes(差配.城主)) {
    if (c.lordId && c.lordId !== 差配.城主) c.najimi = 25;
    c.lordId = 差配.城主;
  }
  // 地の兵を残す。軍の名簿から割いて城の名簿へ移す
  const 残 = Math.max(0, Math.min(Math.round(差配.兵 || 0), a.local || 0));
  if (残 > 0) {
    const tk = rosterTake(a.rost || newRoster(a.local, `arm-${a.id}`), 残);
    a.rost = tk.rest;
    a.local = Math.max(0, a.local - 残);
    c.rost = [...(c.rost || []), ...tk.taken];
    c.local += 残;
    rosterSync(c, "rost", c.local, `loc-${c.id}`);
  }
  a.men = (a.local || 0) + (a.gens || []).reduce((t, id) => {
    const g = s.generals.find((x) => x.id === id); return t + (g ? g.retinue : 0);
  }, 0);
  /* 軍に将が一人も残らなければ、軍は解ける。

     もとは「将もおらず、地の兵も尽きたとき」に限って解いていた。ところが
     連れてきた将を残らず城へ置き、地の兵を半分だけ残す差配はごく普通にある。
     すると将のいない軍が兵だけ抱えて在陣し続け、城の帳には「将なし」の軍が並び、
     地図には数字だけが浮いた。遊ぶ側からは、解いたはずの軍が消えないように見える。

     率いる者のいない軍は軍ではない。残る兵は出陣元へ返す（軍を解くのと同じ）。 */
  if (!(a.gens || []).length) {
    const 帰り先 = withdrawArmy(s, a);
    if (帰り先 && (a.local || 0) > 0) {
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${c.name}に将を残らず置いたので軍は解け、残る兵${fmt(a.local)}人は${帰り先.name}へ返した。` });
    }
  }
  return s;
}

/* 将のいない軍を拾って解く（月ごとの見回りと、古い記録の繕い）。

   上の落とし穴は塞いだが、すでにできてしまった軍は残っている。
   将がいなければ率いる者がいないのだから、月が変わるたびにここで解く。 */
export function 将の無い軍を解く(s) {
  const 解いた = [];
  for (const a of [...(s.armies || [])]) {
    if ((a.gens || []).length) continue;
    const 帰り先 = withdrawArmy(s, a);
    解いた.push({ id: a.id, faction: a.faction, men: a.local || 0, 先: 帰り先 });
  }
  return 解いた;
}

/* 采配（他家と、遊ぶ側が委ねたとき）の既定の差配。

   いちばん身分の高い者を城主に据え、地の兵の半ばを残す。将が一人しか
   居らねば置かない――軍が空になっては次が続かないからである。 */
export function 委ねる差配(s, castle, army) {
  const 将ら = (army.gens || []).map((id) => s.generals.find((x) => x.id === id)).filter(Boolean);
  if (将ら.length <= 1) return { 城主: null, 所属: [], 兵: Math.round((army.local || 0) * 0.3) };
  const 主 = [...将ら].sort((a, b) => stipendOf(s, b) - stipendOf(s, a))[0];
  return { 城主: 主.id, 所属: [主.id], 兵: Math.round((army.local || 0) * 0.5) };
}

export function resolveOffscreen(prev, armyId, castleId) {
    const s = structuredClone(prev);
    const army = s.armies.find((x) => x.id === armyId);
    const castle = s.castles.find((x) => x.id === castleId);
    s.pendingArrivals = (s.pendingArrivals || []).slice(1);
    if (!army || !castle) return s;

    /* 味方の城に着いた軍は、味方と戦わない。
       後詰であれば囲みを打ち払う戦になり、そうでなければ城へ合流する。

       同盟の家へ差し向けた援軍もここに入る。faction を比べるだけでは
       他家の城なので、盤の外でも同盟国と戦うことになっていた。 */
    if (援けに着く(s, army, castle) || underMyBanner(s, army.faction, castle.faction)) {
      return 味方の城へ着く(s, army, castle);
    }

    const aGens = army.gens.map((id) => s.generals.find((x) => x.id === id)).filter(Boolean);
    const dGens = s.generals.filter((x) => x.at === castle.id && x.faction === castle.faction && !x.captive);
    const lead = (gs) => (gs.length ? gs.reduce((a, x) => a + x.lead, 0) / gs.length : 55);
    const dMen = castle.local + dGens.reduce((a, x) => a + x.retinue, 0);
    // 寡兵ならば奇襲を試みる。総大将を討てば、兵力比は意味を失う。
    const wx = s.weather || "晴";
    const amb = tryAmbush(s, army, castle, aGens, dGens, wx);
    /* 奇襲が当たったときの始末（GDD 8.7）。

       もとは当たれば必ず総大将が討たれた。桶狭間が毎年起こることになる。
       当たっても、たいていは本陣を突き崩して混乱させるまでである。首を取るのは、
       よほどの将が、よほどの機を得たときだけである（core/ambush.js の 奇襲の段）。

       兵の目減りは戦の前に効かせる。奇襲とは、当たる前に相手を削ることだからである。 */
    let 乱れ = 1, 勢い = 1;
    if (amb && amb.ok) {
      const 段 = amb.段;
      乱れ = 段.乱れ; 勢い = 段.勢い;
      const 主 = amb.target ? s.generals.find((x) => x.id === amb.target.id) : null;
      // 総大将の備え
      if (主 && 段.大将備え < 1) 主.retinue = Math.round(主.retinue * 段.大将備え);
      // 相手の兵ぜんたい（城の兵と、諸将の手勢）
      if (段.全体欠け > 0) {
        const 残 = 1 - 段.全体欠け;
        castle.local = Math.max(0, Math.round(castle.local * 残));
        for (const x of dGens) {
          if (主 && x.id === 主.id && 段.大将備え < 1) continue;   // 総大将は別に数えた
          x.retinue = Math.round(x.retinue * 残);
        }
      }
      let 文 = `${amb.by.name}が${castle.name}の本陣を衝いた。`;
      if (段.大将討死 && 主) {
        s.generals = s.generals.filter((x) => x.id !== 主.id);
        if (主.lord) {
          const nx = s.generals.filter((x) => x.faction === 主.faction && !x.captive).sort((a, z) => z.lead - a.lead)[0];
          if (nx) nx.lord = true;
        }
        文 += `${主.name}は討たれ、${s.factions[castle.faction].name}の軍は瓦解した。`;
        if (army.faction === s.player) s.msg = `${amb.by.name}が敵の本陣を衝き、${主.name}を討ち取った。`;
      } else if (段.大将退く && 主) {
        // 本陣は壊滅し、大将は身一つで退く。近い自領の城へ落ちる。
        const 落ち先 = s.castles.filter((x) => x.faction === 主.faction && x.id !== castle.id)
          .sort((a, z) => Math.hypot(a.lon - castle.lon, a.lat - castle.lat)
            - Math.hypot(z.lon - castle.lon, z.lat - castle.lat))[0];
        if (落ち先) 主.at = 落ち先.id;
        文 += `${主.name}の備えは壊滅し、本人は本陣を捨てて退いた。`;
      } else {
        文 += `${s.factions[castle.faction].name}の備えは乱れた。`;
      }
      s.chronicle.push({ y: s.year, m: s.month, text: 文 });
    } else if (amb && !amb.ok && army.faction === s.player) {
      s.chronicle.push({ y: s.year, m: s.month, text: `${amb.by.name}は敵の隙を窺ったが、機を得なかった。` });
    }
    // 奇襲で削れたあとの兵で戦う
    const dGens2 = s.generals.filter((x) => x.at === castle.id && x.faction === castle.faction && !x.captive);
    const dMen2 = castle.local + dGens2.reduce((a, x) => a + x.retinue, 0);
    let atk = army.men * (0.8 + army.localTrain / 250) * (1 + lead(aGens) / 300) * (0.85 + Math.random() * 0.3) * 勢い;
    let def = dMen2 * (0.85 + castle.localTrain / 250) * (1 + castle.def / 200 + lead(dGens2) / 300) * (0.85 + Math.random() * 0.3) * 乱れ;
    const atkWon = atk > def;
    const r = Math.min(atk, def) / Math.max(atk, def);
    const aLoss = Math.round(army.men * (atkWon ? 0.16 * r + 0.06 : 0.3 + 0.2 * r));
    const dLoss = Math.round(dMen2 * (atkWon ? 0.34 + 0.2 * r : 0.14 * r + 0.05));
    army.men = Math.max(0, army.men - aLoss); army.local = Math.max(0, army.local - aLoss);
    castle.local = Math.max(0, castle.local - dLoss);
    s.chronicle.push({ y: s.year, m: s.month,
      text: `${castle.name}下で${s.factions[army.faction].name}と${s.factions[castle.faction].name}が戦い、${atkWon ? "攻め手" : "守り手"}が勝った（攻${fmt(aLoss)}人・守${fmt(dLoss)}人を失う）。` });
    if (atkWon && castle.local < 200) {
      sackCastle(s, castle, army, true);
    } else if (atkWon) {
      army.sieging = true;
      s.sieges = [...s.sieges.filter((x) => x.castleId !== castle.id), { castleId: castle.id, armyId: army.id, months: 0, decided: null }];
    } else {
      withdrawArmy(s, army);        // 出陣元が奪われていても、必ずどこかの自領へ戻す
    }
    return s;
}


/* ================================================== 街道での行き合い（GDD 9.1）

   甲の城から乙の城へ兵を出し、同じ月に乙の城から甲の城へも兵が出る。
   両軍は同じ街道を逆に進むのだから、すれ違うことはない。
   途中のどこかで必ず行き合い、野で当たることになる。

   これを見ずに置くと、双方が留守の城へ入り、互いの城を同じ月に奪う、
   という理に合わぬことが起こる。行き合ったならば、まず野戦である。
   勝ったほうがそのまま道を進み、負けたほうの城を攻める。
   負けたほうは出陣元の城へ退く。 */

// 街道を辿った道のり（日数に直した長さ）
function 道のり(path) {
  let d = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const r = roadBetween(path[i], path[i + 1]);
    d += r ? r[2] / ROAD_SPEED[r[3]] : 10;
  }
  return d;
}

// その軍が、目指す先までに残している道のり。今いる区間の進み具合を含む。
function 残りの道のり(a) {
  if (!a.path || a.path.length < 2) return 0;
  let d = 0;
  for (let i = 0; i < a.path.length - 1; i++) {
    const r = roadBetween(a.path[i], a.path[i + 1]);
    const seg = r ? r[2] / ROAD_SPEED[r[3]] : 10;
    d += i === 0 ? seg * (1 - (a.prog || 0)) : seg;
  }
  return d;
}

// 出発地から測って at のところにある区間。行き合った場所を言い表すのに使う。
function 行き合う区間(path, at) {
  let d = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const r = roadBetween(path[i], path[i + 1]);
    const seg = r ? r[2] / ROAD_SPEED[r[3]] : 10;
    if (d + seg >= at || i === path.length - 2) return { u: path[i], v: path[i + 1] };
    d += seg;
  }
  return { u: path[0], v: path[path.length - 1] };
}

const 地名 = (id) => { const n = nodeById(id); return n ? n.name : ""; };

/* 行き合った軍の組を拾う。
   互いの出陣元を攻め合っていて、同じ街道を採り、すでにすれ違う地点を越えていること。
   別の道を通っているならば、行き合わずに入れ違うこともありうる。 */
export function marchClashes(s) {
  const out = [];
  const 済 = new Set();
  const 行軍 = (s.armies || []).filter((a) => a.from && a.target && !a.sieging && !a.dead && a.path);
  for (const a of 行軍) {
    if (済.has(a.id)) continue;
    const b = 行軍.find((x) => !済.has(x.id) && x.id !== a.id
      && x.faction !== a.faction && x.from === a.target && x.target === a.from);
    if (!b) continue;
    const pa = findPath(a.from, a.target), pb = findPath(b.from, b.target);
    if (!pa || !pb || pa.length !== pb.length) continue;
    if (!pa.every((id, i) => id === pb[pb.length - 1 - i])) continue;   // 同じ街道か
    const L = 道のり(pa);
    const ra = 残りの道のり(a), rb = 残りの道のり(b);
    const posA = L - ra, posB = rb;                 // どちらも a の出陣元から測る
    if (posA < posB) continue;                      // まだ行き合っていない
    const { u, v } = 行き合う区間(pa, clamp((posA + posB) / 2, 0, L));
    済.add(a.id); 済.add(b.id);
    out.push({ aId: a.id, bId: b.id, u, v, place: `${地名(u)}と${地名(v)}の間` });
  }
  return out;
}

// 野で当たる力。城の壁は関わらぬ。兵の数と練度と、率いる将の統率で決まる。
export function clashPower(s, army) {
  const gens = army.gens.map((id) => s.generals.find((x) => x.id === id)).filter(Boolean);
  const lead = gens.length ? gens.reduce((a, x) => a + x.lead, 0) / gens.length : 55;
  return army.men * (0.85 + (army.localTrain || 60) / 250) * (1 + lead / 300) * (0.85 + Math.random() * 0.3);
}

// 負けた軍は出陣元へ退く。将も兵も、もとの城へ戻る。
/* 退く先の城。出陣元がまだ自家のものならそこへ、そうでなければ手近な自領へ。

   出陣元だけを見て `s.castles.find((x) => x.id === army.from)` としていた箇所が
   あちこちにあった。これには二つの穴がある。

     一、留守の間に出陣元を奪われていると、城は「見つかる」が敵の城である。
         そこへ兵を足し、将を置いてしまう。
     二、出陣元が滅びて城ごと消えていると、城は見つからない。
         すると将は at が空のまま軍だけが消え、盤上のどこにもいなくなる。

   遊ぶ側が合戦に敗れて「武将が消えた」のは、二つ目である。 */
export function homeFor(s, army) {
  const 元 = s.castles.find((x) => x.id === army.from);
  if (元 && 元.faction === army.faction) return 元;
  // 出陣元が奪われたか失われた。同じ家の城のうち、いちばん近いところへ落ちる。
  const 自領 = s.castles.filter((x) => x.faction === army.faction);
  if (!自領.length) return null;
  const 近い = 自領
    .map((c) => ({ c, p: findPath(army.at || army.from, c.id) }))
    .filter((x) => x.p)
    .sort((a, z) => a.p.length - z.p.length)[0];
  return 近い ? 近い.c : 自領[0];
}

/* 軍を解く（GDD 6.4）。

   兵は出陣元（無ければ近い自領）へ返し、将はそれぞれの本領へ帰す。

   もとは将を「いま踏んでいる地の城」へ置いていた。落とした城に在陣したまま
   軍を解けば、攻めた将が全員その城に住み着く――在陣を入れる前と同じことに
   なってしまう。武将は本領に根付くのだから、帰る先は本領である。 */
export function 軍を解く(s, army) { return withdrawArmy(s, army); }

export function withdrawArmy(s, army) {
  const home = homeFor(s, army);
  if (home) {
    home.local += Math.max(0, army.local);
    // 生き残った騎馬と鉄砲の数だけ、馬と鉄砲が城へ戻る（GDD 6.3）
    const 残 = rosterArms(army.rost);
    home.horse = Math.max(0, (home.horse || 0) + 残.kiba);
    home.gun = Math.max(0, (home.gun || 0) + 残.teppo);
    if (army.rost && army.rost.length) home.rost = [...(home.rost || []), ...army.rost];
    rosterSync(home, "rost", home.local, `loc-${home.id}`);
  }
  /* 将はそれぞれの本領へ帰す。本領を失っていれば出陣元、それも無ければ
     いま踏んでいる地の城に預ける。at が空のまま残すと、盤にも城の帳面にも
     現れず、消えたのと同じになる。 */
  const 控 = home || s.castles.find((x) => x.id === army.at) || s.castles[0];
  for (const gid of army.gens) {
    const x = s.generals.find((q) => q.id === gid);
    if (!x || x.captive) continue;
    const 本領 = x.本領 && s.castles.find((c) => c.id === x.本領 && c.faction === x.faction);
    x.at = 本領 ? 本領.id : (控 ? 控.id : x.at);
    if (!本領 && 控) x.本領 = 控.id;          // 本領を失った者は、帰った先を新たな本領とする
  }
  s.armies = s.armies.filter((x) => x.id !== army.id);
  s.sieges = s.sieges.filter((x) => x.armyId !== army.id);
  s.pendingArrivals = (s.pendingArrivals || []).filter((id) => id !== army.id);
  s.campaigns = (s.campaigns || []).map((c) => ({
    ...c,
    armies: (c.armies || []).filter((id) => id !== army.id),
    arrived: (c.arrived || []).filter((id) => id !== army.id),
  })).filter((c) => c.armies.length);
  return home;
}

/* 迷子になった武将を城へ戻す（毎月の見回り）。

   軍にも属さず、城にもいない将は、盤のどこにも現れない。消えたのと同じである。
   落とし穴は一つずつ塞いだが、見落としがあっても月ごとにここで拾う。 */
export function restoreStrays(s) {
  const 出陣中 = new Set();
  for (const a of s.armies) for (const gid of a.gens) 出陣中.add(gid);
  const 戻した = [];
  for (const q of s.generals) {
    if (q.captive || 出陣中.has(q.id)) continue;
    if (q.at && s.castles.some((c) => c.id === q.at)) continue;
    const 自領 = s.castles.filter((c) => c.faction === q.faction);
    if (!自領.length) continue;                    // 城なき家は別のところで始末する
    q.at = 自領[0].id;
    戻した.push(q);
  }
  return 戻した;
}

/* 行き合いの野戦を画面の外で解く。勝った軍を返す。
   勝った軍は道をそのまま進む。もともと目指していたのは負けた側の城である。 */
export function resolveClash(s, aId, bId, place) {
  const a = s.armies.find((x) => x.id === aId), b = s.armies.find((x) => x.id === bId);
  if (!a || !b) return null;
  const pa = clashPower(s, a), pb = clashPower(s, b);
  const 勝 = pa >= pb ? a : b, 負 = pa >= pb ? b : a;
  const r = Math.min(pa, pb) / Math.max(pa, pb);
  const 勝損 = Math.round(勝.men * (0.13 * r + 0.05));
  const 負損 = Math.round(負.men * (0.30 + 0.2 * r));
  for (const [army, loss] of [[勝, 勝損], [負, 負損]]) {
    army.men = Math.max(0, army.men - loss);
    army.local = Math.max(0, army.local - loss);
    if (army.rost) rosterSync(army, "rost", army.local, `arm-${army.id}`);
  }
  s.chronicle.push({ y: s.year, m: s.month,
    text: `${place}で${s.factions[a.faction].name}と${s.factions[b.faction].name}の軍が行き合い、野戦となった。`
      + `${s.factions[勝.faction].name}が勝ち、${s.factions[負.faction].name}は兵を退いた`
      + `（勝ち手${fmt(勝損)}人・負け手${fmt(負損)}人を失う）。` });
  const home = withdrawArmy(s, 負);
  if (home) s.chronicle.push({ y: s.year, m: s.month,
    text: `${s.factions[負.faction].name}の軍は${home.name}へ退き、${s.factions[勝.faction].name}は${地名(勝.target)}へ道を進めた。` });
  return 勝;
}

// 画面を出さずに、控えている行き合いを一つ解く（見物・画面外用）
export function resolveClashOffscreen(prev) {
  const s = structuredClone(prev);
  const cl = (s.clashes || [])[0];
  if (!cl) return s;
  s.clashes = s.clashes.slice(1);
  const 勝 = resolveClash(s, cl.aId, cl.bId, cl.place);
  // 勝った軍がすでに敵城へ着いていたなら、そのまま城攻めに移る
  if (勝 && (!勝.path || 勝.path.length <= 1)) {
    s.pendingArrivals = [勝.id, ...(s.pendingArrivals || []).filter((id) => id !== 勝.id)];
  }
  return s;
}
