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
     ・家を選び、その家の本拠で足軽として始める（上司は本拠の城の主）
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

/* 身分の梯子（以前の検討の表。勲功の目安は仮）。十人長より上の合戦の動かし方は次の段で作る */
export const 風雲の段 = [
  { 名: "足軽", 要: 0, 住まい: "長屋" },
  { 名: "十人長", 要: 5, 住まい: "小さな家" },
  { 名: "三十人長", 要: 12, 住まい: "庭のある家" },
  { 名: "五十人長", 要: 20, 住まい: "屋敷" },
  { 名: "百人長", 要: 30, 住まい: "門のある屋敷" },
  { 名: "三百人長", 要: 45, 住まい: "門のある屋敷" },
  { 名: "物頭", 要: 60, 住まい: "館" },
];
export const 段の番 = (身分) => Math.max(0, 風雲の段.findIndex((x) => x.名 === 身分));
export const 次の段 = (身分) => 風雲の段[段の番(身分) + 1] || null;
/* 合戦の盤での身分（ui/BattleScreen.jsx の 身分）。物頭に届くまでは足軽と同じに、自分を動かすだけである
   （十人長から五十人長が組へ下知する動かし方は次の段で作る） */
export const 盤の身分 = (身分) => (段の番(身分) >= 段の番("物頭") ? "物頭" : "足軽");
/* 盤へ渡す主人公（ctx.一人）。隊は上司の隊（隊の id は将の id）。体力と武勇は風雲の値で、討死すれば二度目は無い */
export function 風雲の一人(s) {
  const f = s && s.風雲; if (!f) return null;
  return { 身分: 盤の身分(f.身分), 隊id: f.上司, 体力: f.体力, 武勇: f.武勇, 一度きり: true, 名: f.名, 風雲: true };
}

/* 月の行い（以前の検討の「月の行い」のうち、この段で作るもの。武具・郎党・主命はのちの段）。
   三つまで選ぶ。金の使い道の悩み（上納すれば覚えが良くなるが、自分を鍛える金が減る）を芯にする */
export const 月の行い一覧 = [
  { 名: "稽古", 説: "武勇を一上げる（金一貫）" },
  { 名: "開墾・商い", 説: "金を二貫得て、政務を一上げる" },
  { 名: "上納", 説: "金二貫を上司に納め、覚えを五上げる" },
  { 名: "交流", 説: "知略を一上げ、覚えを一上げる" },
];
export const 月の行いの数 = 3;

const 限 = (v, a, b) => Math.min(b, Math.max(a, v));
const 記す = (s, 文) => { const f = s.風雲; f.記 = [...(f.記 || []), { 年: s.year, 月: s.month, 文 }].slice(-60); };

/* 上司：主人公の住む城の主（城主が居なければ、その城にいる者のうち禄の高い者。家の者が居なければ当主） */
export function 上司を選ぶ(s, 城id) {
  const f = s.player, c = (s.castles || []).find((x) => x.id === 城id);
  const 居る = (s.generals || []).filter((x) => x.faction === f && !x.captive && x.at === 城id);
  const 城主 = c && c.lordId ? 居る.find((x) => x.id === c.lordId) : null;
  if (城主) return 城主;
  if (居る.length) return [...居る].sort((a, b) => (b.fief || 0) - (a.fief || 0) || (b.lead || 0) - (a.lead || 0))[0];
  return (s.generals || []).find((x) => x.faction === f && x.lord && !x.captive) || null;
}

/* 風雲を始める。initState(fid) で作った盤に、主人公を据える。主家も諸家もAIで動かす（見物と同じ） */
export function 風雲を始める(s, 名 = "与平") {
  const 家 = s.factions[s.player];
  const 本拠 = (家 && 家.本拠) || ((s.castles || []).find((c) => c.faction === s.player) || {}).id;
  const 上 = 上司を選ぶ(s, 本拠);
  s.autoPlay = true;
  s.level = s.level || "普通";
  s.風雲 = { 名, 身分: "足軽", 勲功: 0, 覚え: 50, 体力: 100, 武勇: 45, 統率: 20, 知略: 25, 政務: 20, 金: 2,
    城: 本拠, 上司: 上 ? 上.id : null, 行い: [], 記: [], 合戦: 0, 討ち取り: 0, 討死: null, 始め: { 年: s.year, 月: s.month } };
  const 城 = (s.castles || []).find((c) => c.id === 本拠);
  記す(s, `${家 ? 家.name : ""}に足軽として仕えた。${城 ? `${城.name}に住み、` : ""}${上 ? `${上.name}の手に属する。` : ""}`);
  return s;
}

/* 月の初め：月の行いを行い、上司を見直す（上司が討たれた・城を移ったなど）。返すのは同じ s */
export function 風雲の月の初め(s) {
  const f = s.風雲; if (!f || f.討死) return s;
  /* 選んだ順でなく、入りを先に、出を後に行う（開墾・商いで得た金で、同じ月に稽古や上納ができる） */
  const 選んだ = new Set((f.行い || []).slice(0, 月の行いの数));
  for (const 名 of ["開墾・商い", "交流", "稽古", "上納"].filter((x) => 選んだ.has(x))) {
    if (名 === "稽古") { if (f.金 >= 1) { f.金 -= 1; f.武勇 = 限(f.武勇 + 1, 0, 90); } }
    else if (名 === "開墾・商い") { f.金 += 2; f.政務 = 限(f.政務 + 1, 0, 90); }
    else if (名 === "上納") { if (f.金 >= 2) { f.金 -= 2; f.覚え = 限(f.覚え + 5, 0, 100); } }
    else if (名 === "交流") { f.知略 = 限(f.知略 + 1, 0, 90); f.覚え = 限(f.覚え + 1, 0, 100); }
  }
  f.体力 = 限(f.体力 + 25, 0, 100);                              // 月をまたげば手傷は癒える
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
export function 風雲の戦か(s, army, dest, foe) {
  const f = s.風雲; if (!f || f.討死 || !f.上司 || !army) return false;
  const 上 = f.上司;
  if (foe) return (army.gens || []).includes(上) || (foe.gens || []).includes(上);
  if (!dest) return false;
  if ((army.gens || []).includes(上)) return dest.faction !== army.faction;
  const 上の将 = (s.generals || []).find((x) => x.id === 上);
  return !!(上の将 && 上の将.at === dest.id && dest.faction === s.player && army.faction !== s.player);
}

/* 合戦のあと：与平の働きを書き戻す（盤の b.一人働き：討ち取り・体力・討死） */
export function 戦の勲功を記す(s, b, 場所) {
  const f = s.風雲; if (!f || !b) return s;
  const 働 = b.一人働き || {};
  const 討 = 働.討ち取り || 0;
  f.合戦 += 1; f.討ち取り += 討; f.勲功 += 討;
  if (働.体力 != null) f.体力 = 限(Math.round(働.体力), 0, 100);
  const 勝 = b.result === "P" ? "勝ち戦" : b.result === "E" ? "負け戦" : "引き分け";
  if (働.討死) {
    f.討死 = { 年: s.year, 月: s.month, 場所: 場所 || "" };
    記す(s, `${場所 ? `${場所}の` : ""}${勝}で討死した。生涯の討ち取り${f.討ち取り}・勲功${f.勲功}。`);
    return s;
  }
  記す(s, `${場所 ? `${場所}の` : ""}${勝}に足軽として出た。討ち取り${討}。`);
  取り立てを見る(s);
  return s;
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
