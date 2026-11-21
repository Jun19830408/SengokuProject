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
import { succeed, 取り立てる, makePromotion } from "../core/house.js";
import { 盤を開かずに裁く } from "../govern/aiWakeme.js";
import { 縁談を断る } from "../core/hime.js";
import { 旗頭に許す, 城の実入り, 預けの率 } from "../core/inin.js";
import { runCommand } from "../govern/commands.js";
import { 旗頭を継がせる, rankOf, 身分を控える, 家の尺, fiefRoom, stipendOf, castellanOf, 次の身分 as 禄の次の身分,
  城主を据え替える, 城主を控える, 外された城主の忠誠を下げる, 国の国主, 国の旗頭, 軍役の増,
  国主に任じる, 旗頭に任じる, 寄騎に取れるか, 寄騎に取る, 城主を外された忠誠の減り } from "../core/rank.js";
import { 組の鍵, newRoster } from "../core/roster.js";
import { 風雲の主のid, atPeace, underMyBanner } from "../core/state.js";
import { 攻められるか } from "../core/yurushi.js";
import { 新しい城主の寄親を定める } from "../govern/war.js";
import { 総大将か } from "./tsunagi.js";
import { isKin, isMainClan } from "../core/house.js";
import { 風雲の上司表 } from "./fuun_joushi.js";
import { 手勢の数 } from "./tezei.js";
import { 手勢の名簿を整える, 手勢の統率を量る, 手勢の武勇を量る, 戦の損を名簿に移す, 名簿の形を見る, 名簿の素質, 練れを伸ばす, 統率の伸びを量る,
  統率に足す, 伸びの倍を見る } from "./tezei_meibo.js";

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
  /* 物頭から上は、勲功の目安（要）でなく禄高で上がる（下の 禄高の身分を見る）。住まいの絵は館のまま */
  { 名: "侍大将", 要: null, 住まい: "館", 禄: true },
  { 名: "家老", 要: null, 住まい: "館", 禄: true },
  { 名: "宿老", 要: null, 住まい: "館", 禄: true },
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
  /* 手勢の統率と武勇（雇い入れの名簿から。hitori/tezei_meibo.js）。名簿がまだ無ければ渡さず、盤の側で 手勢の統率の初め とする。
     手勢の数は名簿の今の人数（合戦で討たれた欠員を埋めていなければ、そのぶん少ない手勢で出る）。名簿が無ければ身分の数 */
  const 名簿 = f.手勢 && f.手勢.身分 === f.身分 ? f.手勢.名簿 : null;
  return { 身分: 盤の身分(f.身分), 隊id: f.上司, 体力: f.体力, 武勇: f.武勇, 統率: f.統率, 一度きり: true, 名: f.名, 風雲: true, 首の勲功,
    雑兵の端: f.雑兵の端 || 0, 段: f.身分, 手勢: 名簿 ? 名簿.reduce((a, m) => a + Math.max(0, m.人 || 0), 0) : (手勢の数[f.身分] || 0),
    手勢の定め: 手勢の数[f.身分] || 0,     // 身分の定めの人数（欠員があっても、馬上か・組頭を立てるかはこれで決める）
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
  const f = s.風雲; if (!f || f.討死 || f.身分 === "大名") return s;
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
  論功行賞を見る(s);                                             // 物頭から上：勲功を加増に換える（下の 武将の段）
  f.政務の文 = null;
  if (城主の段か(f.身分)) { 城主に任じる(s); 主人公の武将を写す(s); 城の預けを積む(s); 宿老の役を見る(s); }   // 家老から上：城を失っていれば、また城主に。政務の金を預かる（下の 城主の段・城主の政務）
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
  /* 物頭から上（遊ぶ人の申し出：「物頭以上は上司が城主になる」）：上司は住む城の城主。城主のいない城や、当主の居る城
     （城主の札が要らない）なら当主。住む城は城主が移っても変えない */
  /* 家老から上で城主なら（遊ぶ人の申し出：「プレイヤーが城主になれば、上司は国主か旗頭か大名のいずれかになります（国主が
     いれば上司は国主。国主がおらず旗頭のみなら旗頭が上司、どちらもいなければ大名が上司）」）：その城の国の国主、いなければ
     その国を受け持つ旗頭、どちらもいなければ当主 */
  const 我が城 = 城主の段か(f.身分) ? 主人公の城(s) : null;
  if (我が城) {
    const 当主 = (s.generals || []).find((x) => x.faction === s.player && x.lord && !x.captive);
    const 国主 = 国の国主(s, s.player, 我が城.kuni), 旗 = 国の旗頭(s, s.player, 我が城.kuni);
    const 新 = (国主 && !国主.風雲の主 ? 国主 : null) || (旗 && !旗.風雲の主 ? 旗 : null) || 当主;
    f.城 = 我が城.id;
    if (新 && 新.id !== f.上司) { f.上司 = 新.id; 記す(s, `${新.name}（${新.lord ? "当主" : 新.役}）を上司とする。`); }
    return;
  }
  if (武将の段か(f.身分)) {
    const 住む = (s.castles || []).find((c) => c.id === f.城);
    const 主 = 住む ? castellanOf(s, 住む) : null;
    const 当主 = (s.generals || []).find((x) => x.faction === s.player && x.lord && !x.captive);
    const 新 = 主 && !主.captive && 主.faction === s.player ? 主 : 当主;
    if (新 && 新.id !== f.上司) { f.上司 = 新.id; 記す(s, `${新.name}の手に属した（${住む ? 住む.name : ""}の${新.lord ? "主" : "城主"}）。`); }
    return;
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
/* 家老から上（武将の帳に入った主人公）：主人公が自ら率いる軍の戦か、主人公のいる城が受ける戦。自ら … 総大将の差配で
   戦う（盤の身分は無し。キャンペーンのふだんの合戦と同じ下知。ui/MapScreen.jsx） */
function 主人公の戦の隊(s, army, dest, foe) {
  const g = 主人公の武将(s); if (!g || g.captive) return null;
  const 我 = { 隊id: g.id, 陣借り: false, 自ら: true };
  const 居る = (a) => !!a && (a.gens || []).includes(g.id);
  if (foe) return 居る(army) || 居る(foe) ? 我 : null;
  if (!dest) return null;
  if (居る(army)) return dest.faction !== army.faction ? 我 : null;
  return g.at === dest.id && dest.faction === s.player && army.faction !== s.player ? 我 : null;
}
export function 風雲の隊を選ぶ(s, army, dest, foe) {
  const f = s && s.風雲; if (!f || f.討死 || !army || f.身分 === "大名") return null;   // 大名ならキャンペーンの合戦（hitori/daimyo.js）
  /* 城主（武将の帳に入った主人公）は、自ら率いる戦と自城の守りの戦だけに出る（上司の戦・陣借りには出ない） */
  if (主人公の武将(s)) return 主人公の戦の隊(s, army, dest, foe);
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
  const f = s && s.風雲; if (!f || f.討死 || !army || !castle || f.身分 === "大名") return null;
  /* 城主（武将の帳に入った主人公）：自ら率いる軍の城攻めか、主人公のいる城の籠城だけ（上の 主人公の戦の隊） */
  if (主人公の武将(s)) return 主人公の戦の隊(s, army, castle, null);
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
  if (武将の段か(f.身分)) {
    /* 物頭から上：預かる隊の戦果を勲功に積む（下の 預かる隊の勲功）。論功行賞で加増に換わる */
    const 隊 = 預かる隊の勲功(b, 添.隊id || f.上司, 添);
    /* 自ら率いた戦（家老から上）は、総大将の隊の働きの半ばを数える（遊ぶ人の申し出：「（家老からの勲功の速さは）遅めが
       いいです」。自ら率いる隊は軍の大きな兵を抱えるので、組を多く破る。上の 自ら率いた勲功の倍） */
    if (添.自ら) 隊.勲功 = Math.round(隊.勲功 * 自ら率いた勲功の倍);
    f.勲功 += 隊.勲功;
    記す(s, `${借り ? `${借り.name}の陣を借りて、` : ""}${場所 ? `${場所}の` : ""}${勝}に${添.自ら ? `${f.身分}として自ら兵を率いて` : `${f.身分}として`}出た。${隊.文}勲功${隊.勲功}${添.自ら ? "（総大将の隊の働きは半ばを数える）" : ""}。`);
  } else 記す(s, `${借り ? `${借り.name}の陣を借りて、` : ""}${場所 ? `${場所}の` : ""}${勝}に足軽として出た。討ち取り${討}${内訳の文(功)}。勲功${功.勲功}。`);
  首と咎を記す();
  合戦ののちの伸び(s, b, 働, "合戦", 添.隊id || f.上司);
  取り立てを見る(s);
  return s;
}

/* 合戦ののちの伸び（討死でない合戦のあと。ふだんの合戦・城攻め・陣借りは hitori/fuun.js 戦の勲功を記す、山賊退治と
   威力偵察は hitori/shumei.js から呼ぶ）。種 … "合戦"・"威力偵察"・"山賊退治"（伸びの倍。hitori/tezei_meibo.js
   戦の伸びの倍）。隊id … 与平が出た隊（物頭なら預かる隊）。
     十人長から三百人長 … 手勢の損と伸び（下）
     物頭から上（大名を除く） … 遊ぶ人の申し出（「能力は大名になるまでは上がり続けるのがいい」）により、預かる隊を
                率いた合戦ごとに与平の統率を伸ばす（下の 預かる隊の伸び） */
export function 合戦ののちの伸び(s, b, 働, 種 = "合戦", 隊id = null) {
  const f = s && s.風雲; if (!f || f.討死 || !b) return;
  if (名簿の形を見る(f.身分)) 手勢の損と伸び(s, b, 働 || {}, 種);
  else if (段の番(f.身分) >= 段の番("物頭") && f.身分 !== "大名") 預かる隊の伸び(s, b, 隊id || f.上司, 種);
}
/* 合戦ののちの手勢（十人長から三百人長。hitori/tezei_meibo.js）。討たれた兵のぶんを欠員にし（扶持もそのぶん下がる。
   埋めるのは屋敷の補充か雇い入れ）、合戦に出た名簿の者の練れと、与平の統率を伸ばす（案の③。伸びは種の倍を掛ける）。
   盤に手勢が立っていなければ（名簿の無い古い記録・欠員ばかりで手勢が出なかった）何もしない */
function 手勢の損と伸び(s, b, 働, 種) {
  const f = s.風雲, 手 = b && b.手勢;
  if (!f || !手 || !名簿の形を見る(f.身分) || !f.手勢 || f.手勢.身分 !== f.身分) return;
  const 倍 = 伸びの倍を見る(種);
  const 残 = (手.squads || []).reduce((a, q) => a + Math.max(0, q.men || 0), 0);
  const 率いた素質 = 名簿の素質(f.手勢.名簿);                    // 合戦に出た顔ぶれの素質（討たれて欠ける前）
  const 損 = 戦の損を名簿に移す(f, 残);
  const 戦った = 損.減 > 0 || (働.手勢の討ち || 0) > 0 || (働.手勢の討たれ || 0) > 0;
  練れを伸ばす(f, 戦った, 損.欠けた, 倍);
  const 前 = f.統率, 上げ = 統率に足す(f, 統率の伸びを量る(前, 戦った, 率いた素質, 倍));
  if (損.減 > 0) 記す(s, `手勢の兵${損.減}人が討たれ、欠員となった（扶持もそのぶん下がる。屋敷で補充できる）。`);
  記す(s, `手勢を率いて${戦った ? "槍を合わせ" : "戦に出"}、手勢の練れが上がった。${上げ ? `統率が${上げ}上がった（${前}→${f.統率}）。` : ""}`);
}
/* 物頭から上：預かる隊（上司の隊）を率いた合戦ののち、与平の統率を伸ばす。物頭には名簿が無いので、素質の足しは無く、
   伸びは 統率の伸び.基、預かる隊が損を受けた（槍を合わせた）戦なら 統率の伸び.戦 を足す（鈍り・上限・種の倍は手勢と同じ） */
function 預かる隊の伸び(s, b, 隊id, 種) {
  const f = s.風雲;
  const c = (b.corps || []).find((x) => x.id === 隊id);
  if (!c) return;
  const 損 = Object.values(c.loss || {}).reduce((a, v) => a + (Number(v) || 0), 0);
  const 戦った = 損 > 0.5;
  const 前 = f.統率, 上げ = 統率に足す(f, 統率の伸びを量る(前, 戦った, 0, 伸びの倍を見る(種)));
  if (上げ) 記す(s, `預かる隊を率いて${戦った ? "槍を合わせ" : "戦に出"}、統率が${上げ}上がった（${前}→${f.統率}）。`);
}

/* ---- 物頭から上（武将の段）。遊ぶ人の申し出：身分は「勲功を加増（禄）に換え、禄高で決まる（キャンペーンと同じ）」「禄高を
   上げるために勲功をあげる必要がある。その仕組みを検討してください」（案を「それでお願いします」）・「物頭以上は上司が城主になる」。
   物頭・侍大将のあいだは武将の帳（s.generals）には載せず、禄高と身分だけをキャンペーンの決まりで量る（城主になる家老で
   帳に入れる。それまでAIの差配――出陣の将・城替え・城代の継ぎ――に取られないように）。
     勲功     … 預かる隊の戦果（下の 武将の勲功）を f.勲功 に積む。まだ賞されていないぶん（f.勲功 − f.賞した勲功）を
                 論功行賞で加増に換える。主命・務めの褒美の勲功も同じに数える
     論功行賞 … 勲功を得たのちの月送りか、正月・七月の月送りに。加増（石）＝ まだ賞されていない勲功 × 加増の石 × 家の尺
                 × 覚えの倍（覚え五十で一倍・百で一.三倍・〇で〇.七倍）。家の配れる知行の余地（core/rank.js fiefRoom から、
                 主人公の知行を引いたもの）のうちで与え、足りなければ残りは金で（勲功一につき一貫）
     身分     … 禄高（知行。帳に載らぬあいだは余禄の取り分は無い）が身分の境（core/rank.js 身分の境。家の尺を掛け、
                 就いたときの境で据え置く）に届けば上がる（core/rank.js rankOf）。下がりはしない
     上司     … 住む城の城主（上の 上司を見直す）
   値はみな仮 ---- */
export const 武将の勲功 = { 組: 1, 勝ち: 2, 槍を合わせた勝ち: 4, 隊を潰す: 5, 総大将の隊を潰す: 10, 落城: 3, 門を破る: 5, 守り切る: 3 };
export const 武将の始めの知行 = 200, 加増の石 = 150;
export const 自ら率いた勲功の倍 = 0.5;                            // 家老から上の自ら率いた戦の勲功（上の 戦の勲功を記す。値は仮）
export const 覚えの倍 = (覚え) => 0.7 + 0.6 * 限(覚え == null ? 50 : 覚え, 0, 100) / 100;
export const 武将の段か = (身分) => 段の番(身分) >= 段の番("物頭");
/* 禄高と身分を量るための仮の武将（帳には載せない。本領も居所も持たせないので、禄高は知行そのもの） */
export function 主人公の仮の武将(s) {
  const f = s.風雲;
  /* 城主になって武将の帳に入っていれば、帳の武将で量る（本領の城の余禄の取り分も禄高に入る。下の 城主の段） */
  const g = 主人公の武将(s); if (g) return 主人公の武将を写す(s);
  return { id: 風雲の主のid, name: f.名, faction: s.player, fief: f.知行 || 0, 身分控: f.身分控 || null,
    lead: f.統率, valor: f.武勇, wit: f.知略, gov: f.政務, lord: false };
}
export const 主人公の禄高 = (s) => stipendOf(s, 主人公の仮の武将(s));
/* 次の身分と、それに要る禄高（屋敷に出す。core/rank.js 次の身分）。宿老なら null */
export const 主人公の次の身分 = (s) => 禄の次の身分(s, 主人公の仮の武将(s));
/* 物頭に取り立てられたときの支度：知行を賜り、それまでの勲功は取り立てに使ったものとする */
export function 武将の支度(s) {
  const f = s.風雲;
  f.知行 = Math.round(武将の始めの知行 * 家の尺(s, s.player));
  f.賞した勲功 = f.勲功; f.前の勲功 = f.勲功; f.身分控 = null;
  記す(s, `物頭として知行${f.知行}石を賜った。以後は勲功が論功行賞で加増に換わり、禄高で身分が上がる。`);
  return s;
}
/* 禄高で身分を見る（上がるだけ）。上がれば記し、知らせる。身分の境を控える（就いたときの境で据え置くため） */
export function 禄高の身分を見る(s) {
  const f = s.風雲; if (!f || !武将の段か(f.身分)) return s;
  const 仮 = 主人公の仮の武将(s);
  const 新 = rankOf(仮, s).key;
  if (風雲の段.some((x) => x.名 === 新) && 段の番(新) > 段の番(f.身分)) {
    f.身分 = 新;
    記す(s, `禄高が${主人公の禄高(s)}石に届き、${新}となった。`);
    f.知らせ = [...(f.知らせ || []), `禄高が届き、${新}となった`];
  }
  身分を控える(s, 仮);
  if (仮.身分控) f.身分控 = 仮.身分控;
  if (城主の段か(f.身分)) 城主に任じる(s);                       // 家老に届けば必ず城主に（下の 城主の段）
  宿老の役を見る(s);                                               // 宿老に届けば国主・旗頭に（下の 宿老の段）
  return s;
}
/* 論功行賞（月送りの初めに見る。上の 風雲の月の初め） */
export function 論功行賞を見る(s) {
  const f = s.風雲; if (!f || f.討死 || !武将の段か(f.身分)) return s;
  if (f.知行 == null) 武将の支度(s);                               // 物頭になっていた古い記録
  const 未賞 = Math.max(0, (f.勲功 || 0) - (f.賞した勲功 == null ? f.勲功 || 0 : f.賞した勲功));
  const 得た = (f.勲功 || 0) > (f.前の勲功 == null ? f.勲功 || 0 : f.前の勲功);
  f.前の勲功 = f.勲功;
  if (!未賞 || !(得た || s.month === 1 || s.month === 7)) return s;
  const k = 家の尺(s, s.player), 倍 = 覚えの倍(f.覚え), 一つ = 加増の石 * k * 倍;
  const 望 = Math.round(未賞 * 一つ);
  /* 帳に載らぬあいだは、主人公の知行は家の配った知行に数えられていないので引く（帳に入れば数えられている） */
  const 余 = Math.max(0, fiefRoom(s, s.player).left - (主人公の武将(s) ? 0 : f.知行 || 0));
  const 地 = Math.min(望, 余), 金 = 望 > 地 ? Math.round((望 - 地) / 一つ) : 0;
  const 前 = f.知行 || 0;
  f.知行 = 前 + 地; f.金 = (f.金 || 0) + 金; f.賞した勲功 = f.勲功;
  主人公の武将を写す(s);
  記す(s, `論功行賞：勲功${未賞}（覚え${f.覚え}）により、知行${地}石を加増された（${前}→${f.知行}石）。`
    + (金 ? `家の配れる知行が足りず、残りは金${金}貫で賜った。` : ""));
  禄高の身分を見る(s);
  return s;
}
/* 預かる隊の勲功（物頭から上。上の 武将の勲功）。b … 盤。隊id … 預かる隊。添.城攻め … "攻め"・"守り"（城の盤）。
     敵の組を破った数 … 盤の武功（battle/engine.js。組の長の手柄の数）を、預かる隊の組の分だけ足す
     敵の隊を潰した … 盤の 隊を潰した（最後に損害を与えた隊の手柄）。総大将の隊なら重い
     勝ち戦 … 預かる隊が損を受けたか組を破っていれば「槍を合わせた勝ち」
     城攻め … 城が落ちれば 落城、預かる隊が門を破っていれば さらに 門を破る。籠城で守り切れば 守り切る
   返すのは { 勲功, 文 } */
export function 預かる隊の勲功(b, 隊id, 添 = {}) {
  const c = ((b && b.corps) || []).find((x) => x.id === 隊id);
  if (!c) return { 勲功: 0, 文: "" };
  const W = 武将の勲功, 功 = b.武功 || {};
  const 鍵ら = new Set((c.squads || []).map((q) => 組の鍵(q.src)).filter(Boolean));
  const 組 = [...鍵ら].reduce((a, k) => a + (功[k] || 0), 0);
  const 損 = Object.values(c.loss || {}).reduce((a, v) => a + (Number(v) || 0), 0);
  const 潰 = Object.entries(b.隊を潰した || {}).filter(([, by]) => by === c.id)
    .map(([id]) => (b.corps || []).find((x) => x.id === id)).filter(Boolean);
  const 総 = 潰.filter((e) => 総大将か(b, e)).length, 他 = 潰.length - 総;
  const 勝 = b.result === c.side, 槍 = 損 > 0.5 || 組 > 0;
  const 落ちた = 添.城攻め === "攻め" && (!!b.captured || 勝);
  const 守った = 添.城攻め === "守り" && 勝 && !b.captured;
  const 破った = 落ちた && (b.門を破った || []).some((x) => x.隊 === c.id);
  const 項 = [];
  if (組) 項.push([`敵の組を${組}つ破り`, 組 * W.組]);
  if (他) 項.push([`敵の隊を${他}つ潰し`, 他 * W.隊を潰す]);
  if (総) 項.push(["敵の総大将の隊を潰し", 総 * W.総大将の隊を潰す]);
  if (勝) 項.push([槍 ? "槍を合わせて勝ち" : "勝ち戦に加わり", 槍 ? W.槍を合わせた勝ち : W.勝ち]);
  if (落ちた) 項.push(["城を落とし", W.落城]);
  if (破った) 項.push(["城門を破り", W.門を破る]);
  if (守った) 項.push(["城を守り切り", W.守り切る]);
  const 勲功 = 項.reduce((a, x) => a + x[1], 0);
  return { 勲功, 文: 項.length ? `預かる隊で${項.map((x) => x[0]).join("、")}、` : "預かる隊は手柄を立てられなかった。" };
}

/* ---- 家老から上（城主の段）。遊ぶ人の申し出：「家老となれば必ず城主に任命（その大名のうち最もステータスの低い城主と
   交代する）」「（物差しは）器量です。当主は除くのは当然ですが、一門は必ずしも除かなくてもいいと思います。ただし、城主の
   交代によって元城主の忠誠は下げた方がいい」「家老となったら城を任されて城とその周囲（今あるシステムのとおりで）の城で
   合戦をしかけることができる」「プレイヤーが城主になれば、上司は国主か旗頭か大名のいずれか」。
     城主に任じる … 家老に届けば、家の城主（城代も含む。当主の居る城・本拠と、囲まれている城は除く。一門は除かない）のうち
                   器量（上の 器量：統率四割・武勇三割・知略二割・政務一割）のいちばん低い者と交代する。城主のいる城が
                   無ければ、城主のいない城に入る。交代された元の城主はその城に残り、忠誠が下がる（core/rank.js
                   外された城主の忠誠を下げる）。城の寄親（国主・旗頭）の筋に繋ぐ（govern/war.js 新しい城主の寄親を定める）
     武将の帳 … 城主に任じられるとき、主人公を武将の帳（s.generals）に入れる（id は 風雲の主のid、印 風雲の主）。能力・知行は
                 毎月、風雲の値から写す。手勢は知行の軍役の器の半ばを連れて入る。齢は仕えた年から数える（二十から）。
                 AIの差配はこの武将とその城に手を出さない（core/state.js 風雲の主の城か。出陣・兵を寄せる・援軍・後詰・
                 内政・調略・忠誠・寿命・家督・恩賞）
     上司     … 国主がいれば国主、国主がおらず旗頭のみなら旗頭、どちらもいなければ当主（上の 上司を見直す）
     城を失えば … 城が落ちても討たれも捕らわれもせず、自家の城へ落ち延びる（govern/war.js）。月の初めに、また城主に任じられる
   値はみな仮 ---- */
export const 城主の段か = (身分) => 段の番(身分) >= 段の番("家老");
export const 主人公の武将 = (s) => ((s && s.generals) || []).find((x) => x.id === 風雲の主のid) || null;
export const 主人公の城 = (s) => ((s && s.castles) || []).find((c) => c.lordId === 風雲の主のid && c.faction === s.player) || null;
const 主人公の齢 = (s) => 20 + Math.max(0, (s.year || 0) - ((s.風雲 && s.風雲.始め && s.風雲.始め.年) || s.year || 0));
/* 城主にする城と、交代する元の城主（無ければ null）を選ぶ */
export function 城主にする城を選ぶ(s) {
  const fid = s.player;
  const 当主 = (s.generals || []).find((x) => x.faction === fid && x.lord && !x.captive);
  const 本拠 = (s.factions[fid] || {}).本拠;
  const 囲まれた = (c) => (s.sieges || []).some((sg) => sg.castleId === c.id);
  const 城ら = (s.castles || []).filter((c) => c.faction === fid && c.id !== 本拠 && !(当主 && 当主.at === c.id) && !囲まれた(c));
  const 主の居る = 城ら.map((c) => ({ c, 主: c.lordId ? (s.generals || []).find((x) => x.id === c.lordId && x.faction === fid && !x.captive && !x.lord) : null }))
    .filter((o) => o.主 && !o.主.風雲の主);
  if (主の居る.length) {
    const 低い = [...主の居る].sort((a, z) => 器量(a.主) - 器量(z.主) || String(a.c.id).localeCompare(String(z.c.id)))[0];
    return { 城: 低い.c, 元: 低い.主 };
  }
  const 空き = 城ら.find((c) => !c.lordId);
  return 空き ? { 城: 空き, 元: null } : null;
}
/* 主人公の武将（帳の）に、風雲の値（能力・知行・齢）を写す。帳に無ければ null */
export function 主人公の武将を写す(s) {
  const f = s.風雲, g = 主人公の武将(s); if (!f || !g) return null;
  if (f.身分 === "大名") return g;                                  // 大名ならキャンペーンの当主のまま（hitori/daimyo.js）
  g.name = f.名; g.lead = f.統率; g.valor = f.武勇; g.wit = f.知略; g.gov = f.政務; g.fief = f.知行 || 0;
  g.loyal = 100; g.faction = s.player; g.風雲の主 = true; g.lord = false; g.age = 主人公の齢(s);
  if (f.身分控) g.身分控 = f.身分控;
  return g;
}
/* 主人公を武将の帳に入れる（無ければ作る） */
export function 主人公を武将の帳に入れる(s, 城) {
  const f = s.風雲;
  let g = 主人公の武将(s);
  if (!g) {
    g = { id: 風雲の主のid, name: f.名, faction: s.player, lord: false, 風雲の主: true, loyal: 100,
      at: 城.id, 本領: 城.id, retTrain: 60, unity: 70, merit: 0, fief: f.知行 || 0, 身分控: f.身分控 || null };
    g.lead = f.統率; g.valor = f.武勇; g.wit = f.知略; g.gov = f.政務;
    g.retCap = 軍役の増(g, g.fief);
    g.retinue = Math.round(g.retCap * 0.5);
    g.rost = newRoster(g.retinue, `ret-${風雲の主のid}`);
    s.generals.push(g);
  }
  return 主人公の武将を写す(s);
}
/* 城主に任じる（家老に届いたとき・城を失ったのちの月の初め）。任じた城を返す（すでに城主ならその城。任じられなければ null） */
export function 城主に任じる(s) {
  const f = s.風雲; if (!f || f.討死 || !城主の段か(f.身分)) return null;
  const 今 = 主人公の城(s); if (今) return 今;
  const 選 = 城主にする城を選ぶ(s);
  if (!選) {
    if (!f.城を待つ) 記す(s, "家老に届いたが、任されるべき城が家に無い。城が空くのを待つ。");
    f.城を待つ = true;
    return null;
  }
  f.城を待つ = false;
  const 城 = 選.城, g = 主人公を武将の帳に入れる(s, 城);
  const 控え = 城主を控える(s, s.player);
  g.at = 城.id; g.本領 = 城.id;
  城主を据え替える(s, 城, g.id, { 城代: false });
  for (const x of 外された城主の忠誠を下げる(s, 控え)) 記す(s, `${x.g.name}は${x.城.name}の城主を解かれた（忠誠${Math.round(x.前)}→${Math.round(x.g.loyal)}）。`);
  新しい城主の寄親を定める(s, 城, g.id, null);
  f.城 = 城.id;
  記す(s, `家老として${城.name}の城主に任じられた${選.元 ? `（${選.元.name}に代わる）` : ""}。`);
  f.知らせ = [...(f.知らせ || []), `${城.name}の城主に任じられた`];
  上司を見直す(s);
  return 城;
}

/* ---- 宿老の段（国主・旗頭）。案「宿老で国主・旗頭」に、遊ぶ人の答え「（主人公の城が当主と同じ国にあって国主になれない
   ときは）国主になれる時が来るまで、城主のまま待つ」。
     国主 … 主人公の城の国に国主を置けるなら（キャンペーンの決まり：当主のいない国。core/rank.js 国主に任じる）、宿老に
             届いたとき、またはのちの月の初めに、その国の国主に任じる。すでに国主がいれば交代し、元の国主の忠誠を下げる
             （城主の交代と同じく 城主を外された忠誠の減り）。その国の城主のうち寄親の無い者（または元の国主の寄騎）を寄騎に取る
     旗頭 … 国主の主人公は、家の旗頭の枠（キャンペーンの決まり：四国につき一人。core/rank.js 旗頭の枠）が空いていれば旗頭に
             任じる
     上司 … 国主なら、その国を受け持つ旗頭、いなければ当主。旗頭なら当主（上の 上司を見直す）
   値はみな仮 ---- */
export const 宿老か = (身分) => 身分 === "宿老";
export function 宿老の役を見る(s) {
  const f = s && s.風雲; if (!f || f.討死 || !宿老か(f.身分)) return null;
  const g = 主人公の武将(s), 城 = 主人公の城(s); if (!g || !城) return null;
  let 成 = null;
  if (g.役 !== "国主" && g.役 !== "旗頭") {
    const 先の国主 = 国の国主(s, s.player, 城.kuni);
    const r = 国主に任じる(s, s.player, 城.kuni, g.id);
    if (r.ok) {
      成 = "国主";
      const 先 = r.先 && r.先.id !== g.id ? r.先 : null;
      if (先) {
        const 前 = 先.loyal == null ? 60 : 先.loyal;
        先.loyal = Math.max(0, 前 - 城主を外された忠誠の減り);
        記す(s, `${先.name}は${城.kuni}の国主を解かれた（忠誠${Math.round(前)}→${Math.round(先.loyal)}）。`);
      }
      /* その国の城主を寄騎に取る（寄親の無い者と、元の国主の寄騎） */
      for (const c of (s.castles || []).filter((x) => x.faction === s.player && x.kuni === 城.kuni && x.lordId && x.id !== 城.id)) {
        const 主 = (s.generals || []).find((x) => x.id === c.lordId);
        if (!主 || 主.lord || 主.風雲の主 || (主.寄親 && !(先 && 主.寄親 === 先.id) && 主.寄親 !== (先の国主 || {}).id)) continue;
        if (寄騎に取れるか(s, g, 主).ok) 寄騎に取る(s, g.id, 主.id);
      }
      記す(s, `宿老として${城.kuni}の国主に任じられた${先 ? `（${先.name}に代わる）` : ""}。`);
      f.知らせ = [...(f.知らせ || []), `${城.kuni}の国主に任じられた`];
    }
  }
  if (g.役 === "国主") {
    const r = 旗頭に任じる(s, s.player, g.id);
    if (r.ok) {
      成 = "旗頭";
      記す(s, `${(r.国 || [城.kuni]).join("・")}を受け持つ旗頭に任じられた。`);
      f.知らせ = [...(f.知らせ || []), "旗頭に任じられた"];
    }
  }
  if (成) 上司を見直す(s);
  return 成;
}

/* ---- 城主の政務（遊ぶ人の申し出：「あとは、政務をどうするかですね」。案：家老（城主）は自城の内政を執り、金は家から
   預かる）。
     預かる金 … 月ごとに、その城の実入り（core/inin.js 城の実入り。月送りと同じ数え方）に、家の預けの目盛り（並で一倍）を
                掛けた金を預かる（f.城の預け）。使わなければ三月ぶんまで溜まる
     下知     … 開墾・治水・商業・築城・訓練・徴募。キャンペーンの城の下知（govern/commands.js runCommand）をそのまま使う。
                費えは家の蔵から払うが、預かった金の内に限る。城にいる将（主人公と、その城の家臣）が月に一つずつ行える
   値はみな仮 ---- */
export const 城の政務 = ["開墾", "治水", "商業", "築城", "訓練", "徴募"];
/* 主人公の城から兵を出せる先（出陣の画面の行き先の篩）。家の敵で、和を結んでいない家の城に限る（家老は家の外交を破らない。
   臣従の主の許しの要る城も外す）。道と月数の縛りは、キャンペーンの出陣の画面のまま（ui/panels.jsx SortieDialog） */
export const 風雲の攻め先か = (s, x) => !!x && x.faction !== s.player && !underMyBanner(s, s.player, x.faction)
  && !atPeace(s, s.player, x.faction) && 攻められるか(s, s.player, x.id);
export const 城の預けの月分 = (s) => { const c = 主人公の城(s); return c ? Math.round(城の実入り(c) * 預けの率(s.factions[s.player])) : 0; };
/* 月の初めに預かる（上の 風雲の月の初め） */
export function 城の預けを積む(s) {
  const f = s.風雲, 月分 = 城の預けの月分(s);
  if (!f || !月分) return s;
  f.城の預け = Math.min(月分 * 3, (f.城の預け || 0) + 月分);
  return s;
}
/* 城の政務を行う。新しい盤を返す。行えたか・行えなかった訳は f.政務の文 に書く（屋敷の城の政務の欄に出す。月を送れば消す） */
const 政務の文を置く = (prev, 文) => ({ ...prev, 風雲: { ...prev.風雲, 政務の文: 文 } });
export function 城の政務を行う(prev, 命, genId) {
  const f0 = prev && prev.風雲, 城 = 主人公の城(prev);
  if (!f0 || !城 || !城の政務.includes(命)) return prev;
  const 将 = (prev.generals || []).find((x) => x.id === genId && x.at === 城.id && x.faction === prev.player && !x.captive);
  if (!将) return 政務の文を置く(prev, "その将は城にいない。");
  if ((prev.orders || {})[genId]) return 政務の文を置く(prev, `${将.name}は今月もう働いた。`);
  const 前の金 = (prev.factions[prev.player] || {}).gold || 0;
  const s = runCommand(prev, 城.id, 命, genId, prev);
  if (s === prev) return 政務の文を置く(prev, `${命}を行えなかった（家の蔵の金が足りぬ）。`);
  const 費え = 前の金 - ((s.factions[s.player] || {}).gold || 0);
  if (!(s.orders || {})[genId]) return 政務の文を置く(prev, s.msg || `${命}を行えなかった。`);   // 囲まれている・家の蔵の金が足りぬ（訳は s.msg）
  if (費え > (f0.城の預け || 0)) return 政務の文を置く(prev, `預かった金が足りぬ。${命}には${費え}貫が要る（預かり${Math.round(f0.城の預け || 0)}貫）。`);
  s.風雲.城の預け = Math.round(((f0.城の預け || 0) - 費え) * 10) / 10;
  s.風雲.政務の文 = `${将.name}が${命}を行った（費え${費え}貫）。`;
  記す(s, `${城.name}で${将.name}が${命}を行った（費え${費え}貫）。`);
  return s;
}

/* 取り立て：勲功が次の段の目安に届けば上げる（一度に一段ずつ。届けば続けて上げる） */
export function 取り立てを見る(s) {
  const f = s.風雲; if (!f || f.討死) return s;
  for (let k = 0; k < 風雲の段.length; k++) {
    const 次 = 次の段(f.身分);
    if (!次 || 次.要 == null || f.勲功 < 次.要) break;          // 物頭から上は禄高で上がる（下の 禄高の身分を見る）
    f.身分 = 次.名;
    const 上 = (s.generals || []).find((x) => x.id === f.上司);
    記す(s, `勲功により${次.名}に取り立てられた${上 ? `（${上.name}の推挙）` : ""}。住まいは${次.住まい}。`);
    f.知らせ = [...(f.知らせ || []), `${次.名}に取り立てられた`];
    if (次.名 === "物頭") { 武将の支度(s); 上司を見直す(s); 名乗りの支度(s); }
  }
  /* 手勢を率いる身分なら、名簿を今の身分の形に整える（取り立てなら、前の手勢を引き継ぐ。hitori/tezei_meibo.js） */
  if (名簿の形を見る(f.身分)) 手勢の名簿を整える(f, s.year, s.month);
  return s;
}

/* ---- 名乗り（遊ぶ人の申し出：「物頭のタイミングで自分で姓名ともに考えるか、自動（キャンペーンの物頭昇進と同じように）かを
   選べるようにしたいです」）。物頭に取り立てられたら、屋敷で名乗りを定める（hitori/FuunYashiki.jsx）。
     自分で … 姓と名を入れる
     自動   … キャンペーンの物頭昇進（core/house.js makePromotion）と同じく、姓の候補に当主の名の一字（偏諱）を添えた
               名乗りを四つ起こし、その中から選ぶ
   定めるまでは、通称（足軽のときの名）のまま。値はみな仮 ---- */
export function 名乗りの支度(s) {
  const f = s.風雲; if (!f || f.姓) return s;
  const 当主 = (s.generals || []).find((x) => x.faction === s.player && x.lord && !x.captive) || { name: "", faction: s.player };
  const 取 = makePromotion(当主, s.generals || [], { faction: s.player });
  const 姓 = 取.candidates.length ? 取.candidates[0].slice(0, -2) : "";     // 候補はみな 姓＋二字（偏諱と一字）
  f.名乗りを待つ = { 旧名: f.名, 偏諱: 取.henki, 当主: 当主.name || "",
    候補: 取.candidates.map((n) => ({ 姓, 名: n.slice(姓.length) })) };
  return s;
}
export const 名乗りの限り = 4;                                     // 姓・名それぞれの字の数の限り（値は仮）
/* 名乗りを定める（自分で決めた姓と名、または自動の候補）。定められなければ同じ s（訳は 返す.訳） */
export function 名乗りを定める(s, 姓, 名) {
  const f = s && s.風雲; if (!f) return { ok: false, 訳: "風雲ではない" };
  const 姓2 = String(姓 || "").trim(), 名2 = String(名 || "").trim();
  if (!姓2 || !名2) return { ok: false, 訳: "姓と名をどちらも入れてください" };
  if (姓2.length > 名乗りの限り || 名2.length > 名乗りの限り) return { ok: false, 訳: `姓と名は、それぞれ${名乗りの限り}字までです` };
  const 旧 = f.名;
  f.姓 = 姓2; f.名乗り = 名2; f.名 = 姓2 + 名2; f.通称 = f.通称 || 旧; f.名乗りを待つ = null;
  主人公の武将を写す(s);
  記す(s, `${旧}は名乗りを${f.名}と定めた。`);
  return { ok: true };
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
