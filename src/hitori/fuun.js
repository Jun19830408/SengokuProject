/* ==========================================================================
   風雲モード（一人の侍の立身）の理

   遊ぶ人の申し出：題で「キャンペーンモード・風雲モード・合戦モード」の三つを選ぶ。風雲モードは、
   大名ではなく一人の侍（はじめは足軽）として、キャンペーンの世界に生きる遊び方である。
   以前の検討で決めた骨組み：
     身分の梯子 … 足軽→十人長→三十人長→五十人長→百人長→三百人長→物頭（武将に取り立て）→侍大将→家老・宿老→大名。
                   勲功の目安（仮）は 五・十二・二十・三十・四十五・六十
     物差しは二つ … 身分を上げる「勲功」と、引き立てに効く「上司の覚え」
     屋敷       … 住まいの絵（身分で替わる）、月の行い（三つほど選ぶ）、蔵
     主命       … 上司から月ごとに頼まれる（山賊退治の小さな戦・特殊勢力への働きかけ など）
   この段（五の三）で作るのは骨組みで、
     ・家を選び、その家の若手の将（一門でない）の下に足軽として付き、その将の城に住む（hitori/fuun_joushi.js。
       遊ぶ人の申し出：「当主所属なんてあり得ない」「その大名を選ぶ＝その武将の下につく」）
     ・月の行い（稽古・開墾と商い・上納・交流）を三つまで選んで、月を送る
     ・世界はキャンペーンと同じに一月ずつ動く。主家も含めて諸家はAI（キャンペーンの「見物」と同じ）
     ・上司の隊が野で戦うときだけ、主人公は足軽として盤の合戦に出る（ui/MapScreen.jsx が盤を開く）。
       勝ち負けと損害は、キャンペーンと同じ道で書き戻す
     ・合戦で討ち取った数を勲功に積み、目安に届けば取り立てる（十人長より上の合戦の動かし方は次の段）
     ・討死すれば、そこで終わる（遊ぶ人の申し出：討死もあり）
     ・大名（遊ぶ家）に宛てた問い（捕虜・身代金・仕官の願い・申し入れ・縁談・城の預け・滅んだ家の始末・
       取り立て・家督・天下分け目）は、主人公の手の届かぬことなので、AIと同じ答えを自動で返す
   世界の理（govern/month.js など）には手を入れない。ここは s.風雲 を読み書きし、問いを片づけるだけである。
   ========================================================================== */
import { 滅んだ家を始末する, 城を委ねる, 委ねる差配 } from "../govern/war.js";
import { succeed, 取り立てる } from "../core/house.js";
import { 盤を開かずに裁く } from "../govern/aiWakeme.js";
import { 縁談を断る } from "../core/hime.js";
import { 旗頭に許す } from "../core/inin.js";
import { 旗頭を継がせる } from "../core/rank.js";
import { isKin, isMainClan } from "../core/house.js";
import { 風雲の上司表 } from "./fuun_joushi.js";
import { 手勢の数 } from "./tezei.js";
import { 手勢の名簿を整える, 手勢の統率を量る, 手勢の武勇を量る, 戦の損を名簿に移す, 名簿の形を見る, 名簿の素質, 練れを伸ばす, 統率の伸びを量る } from "./tezei_meibo.js";

/* 身分の梯子（以前の検討の表）。十人長より上の合戦の動かし方は次の段で作る。
   勲功の目安は、遊ぶ人の申し出（「AもBも入れましょう。勲功は上がりにくいほうが長く遊べる」のB）により、
   五・十二・二十・三十・四十五・六十 から引き上げた。値は仮 */
export const 風雲の段 = [
  { 名: "足軽", 要: 0, 住まい: "長屋" },
  { 名: "十人長", 要: 20, 住まい: "小さな家" },
  { 名: "三十人長", 要: 50, 住まい: "庭のある家" },
  { 名: "五十人長", 要: 90, 住まい: "屋敷" },
  { 名: "百人長", 要: 140, 住まい: "門のある屋敷" },
  { 名: "三百人長", 要: 200, 住まい: "門のある屋敷" },
  { 名: "物頭", 要: 270, 住まい: "館" },
];
export const 段の番 = (身分) => Math.max(0, 風雲の段.findIndex((x) => x.名 === 身分));
export const 次の段 = (身分) => 風雲の段[段の番(身分) + 1] || null;
/* 合戦の盤での身分（ui/BattleScreen.jsx の 身分）。物頭に届くまでは足軽と同じに、自分を動かす。十人長から三百人長は、
   上司の隊から分けた手勢を率い、手勢は与平に従って歩み、与平の前の敵の組へ掛かる（hitori/tezei.js） */
export const 盤の身分 = (身分) => (段の番(身分) >= 段の番("物頭") ? "物頭" : "足軽");
/* 大将首の勲功（遊ぶ人の申し出：「その範囲を超えて一騎駆けや抜け駆けすることで敵の大将の首を取るなどしたら勲功が上がる」）。
   値は仮。総大将の首は二十、ほかの大将の首は十（物頭に届く勲功は六十）。首を取った一突きも、討ち取り一つに数える。
   山賊の頭（主命の山賊退治）は大将首に数えない（主命の褒美と釣り合わないため） */
export const 首の勲功 = { 総大将: 20, 大将: 10 };
export const 首の値 = (首) => (!首 || 首.山賊 || 首.物見 ? 0 : 首.総大将 ? 首の勲功.総大将 : 首の勲功.大将);
/* 討ち取りの勲功（遊ぶ人の申し出「AもBも入れましょう」のA）：雑兵は三人で勲功一（端は次の戦へ持ち越す）、
   名のある侍（馬廻・旗持・山賊の頭・威力偵察の敵の頭）は一人で一、大将首は 首の値。値は仮。
   働（盤の b.一人働き）に分けが無い古い形なら、討ち取りから侍と首を除いた者を雑兵とみなす */
export const 雑兵の勲功の割 = 3;
export function 討ち取りの勲功(f, 働) {
  const 首 = 働.首 || [], 首ら = 首.filter((k) => 首の値(k) > 0);
  const 侍 = 働.侍 || 0;
  const 雑 = 働.雑兵 != null ? 働.雑兵 : Math.max(0, (働.討ち取り || 0) - 侍 - 首.length);
  const 端 = (f.雑兵の端 || 0) + 雑;
  f.雑兵の端 = 端 % 雑兵の勲功の割;
  const 雑の功 = Math.floor(端 / 雑兵の勲功の割), 首の功 = 首ら.reduce((a, k) => a + 首の値(k), 0);
  return { 勲功: 雑の功 + 侍 + 首の功, 雑, 侍, 首ら, 雑の功, 首の功 };
}
/* 討ち取りの内訳の書き方（記に添える） */
export const 内訳の文 = (r) => (r.侍 ? `（雑兵${r.雑}・名のある侍${r.侍}）` : "");
/* 盤へ渡す主人公（ctx.一人）。隊は上司の隊（隊の id は将の id）。体力と武勇は風雲の値で、討死すれば二度目は無い。
   体力は前の合戦の手傷を持ち越す。月をまたげば二十五戻り、月の行いの養生でさらに戻る（下の 風雲の月の初め）。
   一度は「合戦ごとに満ちて始める」としたが、遊ぶ人の申し出（「戦さ終わりで完全回復はやめて、養生を入れましょう。
   その上で二十五戻るのも戻しましょう」）により、持ち越しに戻した。首の勲功は、背中越しの知らせ（hitori/senaka.js）に出すために渡す */
export function 風雲の一人(s) {
  const f = s && s.風雲; if (!f) return null;
  /* 手勢（十人長から三百人長）：合戦で上司の隊から分けて率いる兵の数（hitori/tezei.js）。段 … 名札に出す身分の名 */
  /* 手勢の統率と武勇（雇い入れの名簿から。hitori/tezei_meibo.js）。名簿がまだ無ければ渡さず、盤の側で 手勢の統率の初め とする */
  const 名簿 = f.手勢 && f.手勢.身分 === f.身分 ? f.手勢.名簿 : null;
  return { 身分: 盤の身分(f.身分), 隊id: f.上司, 体力: f.体力, 武勇: f.武勇, 統率: f.統率, 一度きり: true, 名: f.名, 風雲: true, 首の勲功,
    雑兵の端: f.雑兵の端 || 0, 段: f.身分, 手勢: 手勢の数[f.身分] || 0,
    手勢の統率: 名簿 ? 手勢の統率を量る(名簿) : undefined, 手勢の武勇: 名簿 ? 手勢の武勇を量る(名簿) : undefined };
}

/* 月の行い（以前の検討の「月の行い」のうち、この段で作るもの。武具・郎党・主命はのちの段）。
   三つまで選ぶ。金の使い道の悩み（上納すれば覚えが良くなるが、自分を鍛える金が減る）を芯にする */
/* 体力の戻り：月をまたげば 月の体力の戻り、月の行いに養生を選べば、さらに 養生の戻り（どちらも百まで）。値は仮 */
export const 月の体力の戻り = 25, 養生の戻り = 40;
export const 月の行い一覧 = [
  { 名: "稽古", 説: "武勇を一上げる（金一貫）" },
  { 名: "開墾・商い", 説: "金を二貫得て、政務を一上げる" },
  { 名: "上納", 説: "金二貫を上司に納め、覚えを五上げる" },
  { 名: "交流", 説: "知略を一上げ、覚えを一上げる" },
  /* 養生（遊ぶ人の申し出：「戦さ終わりで完全回復はやめて、養生を入れましょうか」）。合戦の手傷を癒やす。月をまたげば
     戻る二十五とは別に、さらに 養生の戻り だけ戻す。値は仮 */
  { 名: "養生", 説: `体力を${養生の戻り}戻す（月を越せば戻る${月の体力の戻り}とは別に）` },
  /* 陣借り（遊ぶ人の申し出：上司の戦が少ないので、家の他の将の戦に加わる）。この月に家の野戦や城攻めがあれば、
     上司の戦でなくても、その戦の家の将の隊に加わって一度出る（上司の戦があれば、そちらが先） */
  { 名: "陣借り", 説: "家の他の将の戦に加わる（この月に家の野戦や城攻めがあれば、その将の隊で一度出る）" },
];
export const 月の行いの数 = 3;

export const 限 = (v, a, b) => Math.min(b, Math.max(a, v));
export const 記す = (s, 文) => { const f = s.風雲; f.記 = [...(f.記 || []), { 年: s.year, 月: s.month, 文 }].slice(-60); };

/* 上司の選び方（hitori/fuun_joushi.js の表の決まりと同じ）：当主と一門を除き、城にいる十六〜三十五歳の者から、
   器量が高く若い者。城を渡せば、その城にいる者を先にする。若手がいなければ年長からも、一門でない者が
   いなければ一門からも選ぶ（当主にはできるだけ付けない） */
const 器量 = (x) => x.lead * 0.4 + x.valor * 0.3 + x.wit * 0.2 + x.gov * 0.1;
const 選びの点 = (x) => 器量(x) - Math.max(0, (x.age || 30) - 25) * 1.5;
export function 若手の上司を選ぶ(s, fid, 城id = null) {
  const 家 = (s.generals || []).filter((x) => x.faction === fid && !x.captive && x.at
    && (s.castles || []).some((c) => c.id === x.at && c.faction === fid));
  const 主 = (s.generals || []).find((x) => x.faction === fid && x.lord && !x.captive);
  const 一門 = (x) => x.lord || (主 && isKin(x, 主)) || isMainClan(s, x);
  const 並べる = (xs) => [...xs].sort((a, b) => 選びの点(b) - 選びの点(a) || String(a.id).localeCompare(String(b.id)));
  const 段 = [
    (x) => !一門(x) && (x.age || 30) >= 16 && (x.age || 30) <= 35,
    (x) => !一門(x) && (x.age || 30) >= 16,
    (x) => !x.lord && (x.age || 30) >= 16,
  ];
  for (const 合う of 段) {
    const 城の者 = 城id ? 家.filter((x) => x.at === 城id && 合う(x)) : [];
    if (城の者.length) return 並べる(城の者)[0];
    const 家の者 = 家.filter(合う);
    if (家の者.length) return 並べる(家の者)[0];
  }
  return 主 || null;
}
/* 風雲を始めるときの上司：家ごとの表（fuun_joushi.js）の将。表に無い・もう居ないときは、同じ決まりで選ぶ */
export function 風雲の上司を決める(s, fid) {
  const id = 風雲の上司表[fid];
  const 表の将 = id && (s.generals || []).find((x) => x.id === id && x.faction === fid && !x.captive && !x.lord && x.at);
  return 表の将 || (id === null ? null : 若手の上司を選ぶ(s, fid));
}
/* 風雲モードで選べる家か（一門でない家臣がいない家は表で null） */
export const 風雲で選べるか = (fid) => !!風雲の上司表[fid];
/* 上司を選び直す（上司が討たれた・捕われた・家を去ったとき）：主人公の住む城の者を先に、同じ決まりで */
export function 上司を選ぶ(s, 城id) { return 若手の上司を選ぶ(s, s.player, 城id); }

/* 風雲を始める。initState(fid) で作った盤に、主人公を据える。主家も諸家もAIで動かす（見物と同じ） */
export function 風雲を始める(s, 名 = "与平") {
  const 家 = s.factions[s.player];
  const 上 = 風雲の上司を決める(s, s.player);
  /* 住むのは上司の城（上司がいなければ家の本拠） */
  const 本拠 = (上 && 上.at) || (家 && 家.本拠) || ((s.castles || []).find((c) => c.faction === s.player) || {}).id;
  s.autoPlay = true;
  s.level = s.level || "普通";
  s.風雲 = { 名, 身分: "足軽", 勲功: 0, 覚え: 50, 体力: 100, 武勇: 45, 統率: 20, 知略: 25, 政務: 20, 金: 2,
    城: 本拠, 上司: 上 ? 上.id : null, 行い: [], 記: [], 合戦: 0, 討ち取り: 0, 討死: null, 始め: { 年: s.year, 月: s.month },
    /* 務めの予定（月番＝年×十二＋月）：山賊退治は二か月後から三か月ごと、威力偵察は四か月後から半年ごと（hitori/shumei.js） */
    予定: { 山賊: s.year * 12 + s.month + 2, 偵察: s.year * 12 + s.month + 4 } };
  const 城 = (s.castles || []).find((c) => c.id === 本拠);
  記す(s, `${家 ? 家.name : ""}に足軽として仕えた。${城 ? `${城.name}に住み、` : ""}${上 ? `${上.name}の手に属する。` : ""}`);
  return s;
}

/* 月の初め：月の行いを行い、上司を見直す（上司が討たれた・城を移ったなど）。返すのは同じ s */
export function 風雲の月の初め(s) {
  const f = s.風雲; if (!f || f.討死) return s;
  /* 選んだ順でなく、入りを先に、出を後に行う（開墾・商いで得た金で、同じ月に稽古や上納ができる） */
  const 選んだ = new Set((f.行い || []).slice(0, 月の行いの数));
  for (const 名 of ["開墾・商い", "交流", "稽古", "上納", "養生"].filter((x) => 選んだ.has(x))) {
    if (名 === "稽古") { if (f.金 >= 1) { f.金 -= 1; f.武勇 = 限(f.武勇 + 1, 0, 90); } }
    else if (名 === "開墾・商い") { f.金 += 2; f.政務 = 限(f.政務 + 1, 0, 90); }
    else if (名 === "上納") { if (f.金 >= 2) { f.金 -= 2; f.覚え = 限(f.覚え + 5, 0, 100); } }
    else if (名 === "交流") { f.知略 = 限(f.知略 + 1, 0, 90); f.覚え = 限(f.覚え + 1, 0, 100); }
    else if (名 === "養生") f.体力 = 限(f.体力 + 養生の戻り, 0, 100);
  }
  f.体力 = 限(f.体力 + 月の体力の戻り, 0, 100);                  // 月をまたげば手傷は癒える（養生を選べば、上でさらに戻る）
  /* 陣借り：この月（月送りで起こる戦）に一度だけ、家の他の将の戦に加わる。次の月の初めまで */
  f.陣借り = 選んだ.has("陣借り") ? { 済: false } : null;
  上司を見直す(s);
  return s;
}
export function 上司を見直す(s) {
  const f = s.風雲; if (!f) return;
  const 今 = (s.generals || []).find((x) => x.id === f.上司);
  /* 上司が討たれた・捕われた・家を去ったなら、主人公の住む城で選び直す。城が落ちていれば、家の本拠へ移る */
  const 城 = (s.castles || []).find((c) => c.id === f.城);
  if (!城 || 城.faction !== s.player) {
    const 本拠 = (s.factions[s.player] || {}).本拠 || ((s.castles || []).find((c) => c.faction === s.player) || {}).id;
    if (本拠 && 本拠 !== f.城) { const 新 = (s.castles || []).find((c) => c.id === 本拠); f.城 = 本拠; 記す(s, `${新 ? 新.name : "本拠"}へ移った。`); }
  }
  if (!今 || 今.captive || 今.faction !== s.player) {
    const 新 = 上司を選ぶ(s, f.城);
    if (新 && 新.id !== f.上司) { f.上司 = 新.id; 記す(s, `${新.name}の手に属した。`); }
    return;
  }
  /* 上司が家の別の城へ移ったなら、主人公も付いて移る（出陣のあいだは将の居所が空なので、移らない） */
  const 先 = 今.at && (s.castles || []).find((c) => c.id === 今.at);
  if (先 && 先.faction === s.player && 先.id !== f.城) { f.城 = 先.id; 記す(s, `${今.name}に従って${先.name}へ移った。`); }
}

/* 主人公の合戦か：上司の隊が野で戦うとき。
     行き合い（foe あり）… 上司が、どちらかの軍にいる
     着陣（foe なし）  … 上司の軍が敵の城へ着いた（城下の野戦）か、敵が上司のいる城へ着いた（城方の野戦）
   囲み・城攻め（城の盤）は、背中の視点が城に対応していないので、まだ盤の外で決める */
/* 陣を借りる将：その戦の家の将のうち、当主と一門でない者を先にする（当主には付けない。上司の表と同じ考え）。
   いなければ、その戦の家の将の先頭 */
function 陣を借りる将(s, ids) {
  const 主 = (s.generals || []).find((x) => x.faction === s.player && x.lord && !x.captive);
  const 将ら = ids.map((id) => (s.generals || []).find((x) => x.id === id)).filter((x) => x && !x.captive);
  const 外 = 将ら.find((x) => !x.lord && !(主 && isKin(x, 主)) && !isMainClan(s, x));
  return (外 || 将ら[0] || {}).id || null;
}
export function 風雲の隊を選ぶ(s, army, dest, foe) {
  const f = s && s.風雲; if (!f || f.討死 || !army) return null;
  const 上 = f.上司;
  if (上) {
    if (foe) { if ((army.gens || []).includes(上) || (foe.gens || []).includes(上)) return { 隊id: 上, 陣借り: false }; }
    else if (dest) {
      if ((army.gens || []).includes(上)) { if (dest.faction !== army.faction) return { 隊id: 上, 陣借り: false }; }
      else {
        const 上の将 = (s.generals || []).find((x) => x.id === 上);
        if (上の将 && 上の将.at === dest.id && dest.faction === s.player && army.faction !== s.player) return { 隊id: 上, 陣借り: false };
      }
    }
  }
  /* 陣借り：この月に一度だけ、家の戦なら、その戦の家の将（軍の先頭の将・城の主）の隊に加わる */
  if (f.陣借り && !f.陣借り.済) {
    const 家 = s.player;
    if (foe) {
      const 我軍 = army.faction === 家 ? army : foe.faction === 家 ? foe : null;
      const id = 我軍 && 陣を借りる将(s, 我軍.gens || []);
      if (id) return { 隊id: id, 陣借り: true };
    } else if (dest) {
      if (army.faction === 家 && dest.faction !== 家) { const id = 陣を借りる将(s, army.gens || []); if (id) return { 隊id: id, 陣借り: true }; }
      if (dest.faction === 家 && army.faction !== 家) {
        const 城将 = (s.generals || []).filter((x) => x.at === dest.id && x.faction === 家 && !x.captive).map((x) => x.id);
        const id = 陣を借りる将(s, 城将);
        if (id) return { 隊id: id, 陣借り: true };
      }
    }
  }
  return null;
}
export const 風雲の戦か = (s, army, dest, foe) => !!風雲の隊を選ぶ(s, army, dest, foe);

/* 主人公の城攻めか：上司が寄せ手の軍にいるか、囲まれた家の城に籠っているとき（遊ぶ人の申し出「BC をいずれも入れれば」の C）。
   月送り（govern/month.js）は、この強攻を式で裁かずに s.風雲の城攻め へ積み、地図画面が城の盤を開く */
export function 風雲の城攻めの隊(s, army, castle) {
  const f = s && s.風雲; if (!f || f.討死 || !army || !castle) return null;
  if (f.上司) {
    if ((army.gens || []).includes(f.上司)) { if (castle.faction !== army.faction) return { 隊id: f.上司, 陣借り: false }; }
    else {
      const 上 = (s.generals || []).find((x) => x.id === f.上司);
      if (上 && !上.captive && 上.at === castle.id && castle.faction === s.player && army.faction !== s.player) return { 隊id: f.上司, 陣借り: false };
    }
  }
  /* 陣借り：家の軍が寄せる城攻めか、家の城が受ける城攻め（この月に一度） */
  if (f.陣借り && !f.陣借り.済) {
    const 家 = s.player;
    if (army.faction === 家 && castle.faction !== 家) { const id = 陣を借りる将(s, army.gens || []); if (id) return { 隊id: id, 陣借り: true }; }
    if (castle.faction === 家 && army.faction !== 家) {
      const id = 陣を借りる将(s, (s.generals || []).filter((x) => x.at === castle.id && x.faction === 家 && !x.captive).map((x) => x.id));
      if (id) return { 隊id: id, 陣借り: true };
    }
  }
  return null;
}
export const 風雲の城攻めか = (s, army, castle) => !!風雲の城攻めの隊(s, army, castle);

/* 合戦のあと：与平の働きを書き戻す（盤の b.一人働き：討ち取り・体力・討死） */
export function 戦の勲功を記す(s, b, 場所, 添 = {}) {
  const f = s.風雲; if (!f || !b) return s;
  /* 陣借りの戦なら、その月の陣借りは済む（一月に一度） */
  if (添.陣借り && f.陣借り) f.陣借り.済 = true;
  const 借り = 添.陣借り ? (s.generals || []).find((x) => x.id === 添.隊id) : null;
  const 働 = b.一人働き || {};
  const 討 = 働.討ち取り || 0;
  /* 勲功は 討ち取りの勲功（雑兵は三人で一・名のある侍は一人で一・大将首）。持ち場を離れた咎は上司の覚えから引く
     （hitori/senaka.js 持ち場を見る） */
  const 功 = 討ち取りの勲功(f, 働), 首ら = 功.首ら;
  f.合戦 += 1; f.討ち取り += 討; f.勲功 += 功.勲功;
  if (働.体力 != null) f.体力 = 限(Math.round(働.体力), 0, 100);   // 手傷は持ち越す（上の 風雲の一人）
  const 咎 = Math.round(働.咎 || 0);
  if (咎 > 0) f.覚え = 限(f.覚え - 咎, 0, 100);
  const 首と咎を記す = () => {
    for (const k of 首ら) 記す(s, `${k.抜け駆け ? "持ち場を離れて抜け駆けし、" : ""}${k.名}${k.総大将 ? "（総大将）" : ""}の首を取った。勲功${首の値(k)}。`);
    if (咎 > 0) 記す(s, `持ち場を離れたため、上司の覚えが${咎}下がった。`);
  };
  const 勝 = b.result === "P" ? "勝ち戦" : b.result === "E" ? "負け戦" : "引き分け";
  if (働.討死) {
    f.討死 = { 年: s.year, 月: s.month, 場所: 場所 || "" };
    首と咎を記す();
    記す(s, `${場所 ? `${場所}の` : ""}${勝}で討死した。生涯の討ち取り${f.討ち取り}・勲功${f.勲功}。`);
    return s;
  }
  記す(s, `${借り ? `${借り.name}の陣を借りて、` : ""}${場所 ? `${場所}の` : ""}${勝}に足軽として出た。討ち取り${討}${内訳の文(功)}。勲功${功.勲功}。`);
  首と咎を記す();
  手勢の損と伸び(s, b, 働);
  取り立てを見る(s);
  return s;
}

/* 合戦ののちの手勢（十人長から三百人長。hitori/tezei_meibo.js）。討たれた兵のぶんを新参で埋め（案の②）、合戦に出た
   名簿の者の練れと、与平の統率を伸ばす（案の③）。盤に手勢が立っていなければ（足軽・物頭、名簿の無い古い記録）何もしない */
function 手勢の損と伸び(s, b, 働) {
  const f = s.風雲, 手 = b && b.手勢;
  if (!f || !手 || !名簿の形を見る(f.身分) || !f.手勢 || f.手勢.身分 !== f.身分) return;
  const 残 = (手.squads || []).reduce((a, q) => a + Math.max(0, q.men || 0), 0);
  const 率いた素質 = 名簿の素質(f.手勢.名簿);                    // 合戦に出た顔ぶれの素質（討たれて新参に替わる前）
  const 損 = 戦の損を名簿に移す(f, 残);
  const 戦った = 損.減 > 0 || (働.手勢の討ち || 0) > 0 || (働.手勢の討たれ || 0) > 0;
  練れを伸ばす(f, 戦った, 損.替えた);
  const 前 = f.統率, 伸 = 統率の伸びを量る(前, 戦った, 率いた素質);
  f.統率 = 前 + 伸;
  if (損.減 > 0) 記す(s, `手勢の兵${損.減}人が討たれ、新参で埋めた。`);
  記す(s, `手勢を率いて${戦った ? "槍を合わせ" : "戦に出"}、手勢の練れが上がった。${伸 ? `統率が${伸}上がった（${前}→${f.統率}）。` : ""}`);
}

/* 取り立て：勲功が次の段の目安に届けば上げる（一度に一段ずつ。届けば続けて上げる） */
export function 取り立てを見る(s) {
  const f = s.風雲; if (!f || f.討死) return s;
  for (let k = 0; k < 風雲の段.length; k++) {
    const 次 = 次の段(f.身分);
    if (!次 || f.勲功 < 次.要) break;
    f.身分 = 次.名;
    const 上 = (s.generals || []).find((x) => x.id === f.上司);
    記す(s, `勲功により${次.名}に取り立てられた${上 ? `（${上.name}の推挙）` : ""}。住まいは${次.住まい}。`);
    f.知らせ = [...(f.知らせ || []), `${次.名}に取り立てられた`];
  }
  /* 手勢を率いる身分なら、名簿を今の身分の形に整える（取り立てなら、前の手勢を引き継ぐ。hitori/tezei_meibo.js） */
  if (名簿の形を見る(f.身分)) 手勢の名簿を整える(f, s.year, s.month);
  return s;
}

/* 大名（遊ぶ家）に宛てた問いに、AIと同じ答えを自動で返す。主人公の手の届かぬことである。
   ui/MapScreen.jsx の札（捕虜・身代金・仕官の願い・申し入れ・縁談・城の預け・滅んだ家の始末・取り立て・家督）と、
   月送りが遊ぶ家の一戦として盤を待つ天下分け目を片づける。返すのは同じ s（手を入れたかどうかは 変えた）*/
export function 風雲の問いに答える(s) {
  if (!s || !s.風雲) return { s, 変えた: false };
  let 変えた = false;
  const 記 = (t) => s.chronicle.push({ y: s.year, m: s.month, text: t });
  /* 捕虜：留め置く（札の「留め置く」と同じ） */
  if ((s.captives || []).length) { for (const id of s.captives) { const q = s.generals.find((x) => x.id === id); if (q) 記(`${q.name}を捕虜として留め置いた。`); } s.captives = []; 変えた = true; }
  /* 身代金の申し出：退ける（札の「退ける」と同じ。信用が少し下がる） */
  if (s.ransomOffer) { const o = s.ransomOffer; const k = [s.player, o.from].sort().join("|"); const rel = (s.relations || {})[k];
    if (rel) rel.trust = Math.max(0, rel.trust - 6); 記(`${(s.factions[o.from] || {}).name || ""}の身代金の申し出を退けた。`); s.ransomOffer = null; 変えた = true; }
  /* 仕官の願い：断る（捕虜のまま） */
  if (s.仕官の願い) { const q = s.generals.find((x) => x.id === s.仕官の願い.genId); if (q && q.captive) q.captive = { ...q.captive, 断った: { y: s.year, m: s.month } }; s.仕官の願い = null; 変えた = true; }
  /* 他家からの申し入れ：断る（札の「断る」と同じ。信用が少し下がる） */
  if (s.申し入れ) { const 申 = s.申し入れ; const k = [s.player, 申.fid].sort().join("|"); const rel = (s.relations || {})[k];
    if (rel) rel.trust = Math.max(0, rel.trust - 6); 記(`${(s.factions[申.fid] || {}).name || ""}よりの「${申.key}」を断った。`); s.申し入れ = null; 変えた = true; }
  /* 縁談：断る */
  if (s.縁談) { try { 縁談を断る(s, s.縁談); } catch (e) { /* 断れぬ形なら捨てる */ } s.縁談 = null; 変えた = true; }
  /* 落とした城の預け：采配の案のまま委ねる */
  while ((s.委ねる待ち || []).length) {
    const 待ち = s.委ねる待ち[0];
    const c = s.castles.find((x) => x.id === 待ち.castleId), a = s.armies.find((x) => x.id === 待ち.armyId);
    try { if (c) 城を委ねる(s, 待ち.castleId, 待ち.armyId, 委ねる差配(s, c, a)); } catch (e) { /* 委ねられぬなら置かずに進む */ }
    s.委ねる待ち = (s.委ねる待ち || []).filter((x) => x.castleId !== 待ち.castleId);
    変えた = true;
  }
  /* 滅んだ家の始末：盤の外の始末と同じ（降る者は降り、残りは討つか捕える） */
  if (s.warSettle) { const ws = s.warSettle;
    const lord = ws.lordId ? s.generals.find((x) => x.id === ws.lordId) : null;
    const retainers = (ws.queue || []).map((id) => s.generals.find((x) => x.id === id)).filter((x) => x && x !== lord);
    try { 滅んだ家を始末する(s, ws.faction, ws.winner, ws.castleId, { lord, retainers }); } catch (e) { /* 始末できぬなら捨てる */ }
    s.warSettle = null; 変えた = true; }
  /* 組頭の取り立て：名の候補の頭で取り立てる */
  if (s.promo) { const p = s.promo; const 名 = (p.candidates && p.candidates[0]) || p.oldName; try { 取り立てる(s, p, 名); } catch (e) { /* 取り立てられぬなら捨てる */ } s.promo = null; 変えた = true; }
  /* 当主の死：家中から跡継ぎを選ぶ（盤の外の家督と同じ） */
  if (s.succession) { const su = s.succession; try { succeed(s, su.dead, su.cause); } catch (e) { /* 継げぬなら捨てる */ } s.succession = null; 変えた = true; }
  /* 旗頭からの攻めの願い：許す（他家の旗頭は願わずに攻める。それと同じになる） */
  if (s.旗頭の願い) { const 願 = s.旗頭の願い; s.旗頭の願い = null; try { 旗頭に許す(s, 願.旗頭, 願.castleId); } catch (e) { /* 許せぬなら捨てる */ } 変えた = true; }
  /* 方面の旗頭を継がせる者：候補の頭に継がせる */
  if (s.旗頭継ぎ待ち) { const w = s.旗頭継ぎ待ち; s.旗頭継ぎ待ち = null;
    const 候 = (w.候補 || []).find((x) => { const q = s.generals.find((y) => y.id === x.id); return q && !q.captive; });
    if (候) { try { 旗頭を継がせる(s, w.faction, 候.id, w.寄騎, w.先); } catch (e) { /* 継がせられぬなら捨てる */ } }
    変えた = true; }
  /* 一国平定の知らせ：年代記には載っている。札は閉じる */
  if (s.国平定) { s.国平定 = null; 変えた = true; }
  /* 天下分け目：遊ぶ家の一戦も、兵が集まった月に盤を開かずに裁く（AIどうしの一戦と同じ） */
  if (s.分け目 && (s.分け目.挑 === s.player || s.分け目.受 === s.player) && s.分け目.残り <= 0) {
    try { 盤を開かずに裁く(s, s.分け目, { 告げる: 記 }); } catch (e) { s.分け目 = null; }
    変えた = true;
  }
  return { s, 変えた };
}
