/* ==========================================================================
   風雲モードの主命（上司から下される務め）

   以前の検討で決めた骨組み：主命は上司から月ごとに、期限と重さをつけて下される。遊ぶ人が加えた
   ものは「山賊退治の小さな戦」と「特殊勢力への働きかけ」。今回の申し出は「BC をいずれも入れれば」
   （B＝主命を作って、戦の無い月にも戦う場をつくる）。この段で作るもの：
     山賊退治         … 上司の手の者（主人公の組）が、住む城の近在に出る山賊を討つ。盤の小さな野戦で、
                         主人公は足軽として戦う（一人視点。ふだんの合戦と同じ動かし方）
     特殊勢力への働きかけ … 家の手の届く町（寺社・商人・水軍衆など。core/town.js 特殊勢力の可否）へ使いし、
                         誼を通じる下地をつくる。まとまるかは知略と政務で決まる
   主命は、月の行いに「主命に励む」を選んだ月に行う（三つの行いの一つに数える）。果たせば勲功・覚え・金、
   しくじるか期限を過ぎれば覚えが下がる。主命のあるあいだは、新たな主命は下されない。

   務めの組み替え（遊ぶ人の申し出：「３ヶ月ごとに山賊との戦いと、半年に一度威力偵察として攻略対象の大名と小競り合いを
   する(勝てば実際に敵の兵が減る)」「その上で、敵の兵を減らして積極的に本来の野戦をしかける」）：
     山賊退治 … 主命から外し、三か月ごとの務めとした。その月に「月を送る」と、上司の手の者（主人公の組）として
                盤で戦う。勝てば褒美（重さ：軽・並・重。これまでの主命と同じ）、負ければ覚えが五下がる
     威力偵察 … 半年ごとの務め。上司の手勢で、家の狙う城（無ければ上司の城から道の近い敵の城）の兵と小競り合いを
                する。討たれた兵は世界から減る（敵は狙った城の兵、味方は上司の手勢）。勝てば、その城を半年のあいだ
                家の出陣の的として重く見る（govern/month.js）。上司が出陣中なら翌月へ、的が無ければ半年先へ見合わせる
     主命     … 特殊勢力への働きかけだけになった（下る見込みは、これまでの働きかけの割と同じ一割三分五厘）
   次の山賊退治・威力偵察の月（予定）は屋敷に出す（hitori/FuunYashiki.jsx）。
   ========================================================================== */
import { TOWNS } from "../data/castles.js";
import { px, py } from "../data/geo.js";
import { 特殊勢力の可否 } from "../core/town.js";
import { atPeace, 同じ旗の下, 軍の道 } from "../core/state.js";
import { rosterTake } from "../core/roster.js";
import { 出征の見立て, 寄せられる見込み } from "../govern/month.js";
import { setBattleMap } from "../battle/castleMap.js";
import { FIELD, layoutField, setFieldKind, setFieldSeed } from "../battle/field.js";
import { makeCorps, placeSquads } from "../battle/corps.js";
import { createBattle } from "../battle/engine.js";
import { 記す, 限, 段の番, 取り立てを見る, 討ち取りの勲功, 内訳の文 } from "./fuun.js";

/* 主命の重さ。山賊の数と、果たしたときの褒美 */
export const 主命の重さ = {
  軽: { 賊: 24, 勲功: 1, 覚え: 4, 金: 1 },
  並: { 賊: 38, 勲功: 2, 覚え: 6, 金: 2 },
  重: { 賊: 42, 勲功: 3, 覚え: 9, 金: 3 },
};
/* 主命（特殊勢力への働きかけ）の下る見込み。主命の無い月が明けたとき。これまで（四割五分のうち三割が働きかけ）と同じ割 */
export const 働きかけの下る目 = 0.135;
export const 主命の下る目 = 働きかけの下る目;
export const 主命の組 = "fuun-kumi", 山賊の隊 = "fuun-sanzoku", 偵察の組 = "fuun-teisatsu", 偵察の敵 = "fuun-monomi";
export const 山賊の間 = 3, 偵察の間 = 6;   // 務めの間（月）
const 期限の月 = { 山賊退治: 2, 特殊勢力への働きかけ: 3 };
const 町の種の名 = { 港: "湊", 水軍衆: "水軍衆", 商業都市: "商人衆", 町: "町衆", 寺社: "寺社", 忍びの里: "忍びの里", 鉱山: "鉱山衆" };

export const 月を足す = (年月, n) => { const k = 年月.年 * 12 + (年月.月 - 1) + n; return { 年: Math.floor(k / 12), 月: (k % 12) + 1 }; };
const 月の番 = (年, 月) => 年 * 12 + 月;
export const 今の月番 = (s) => 月の番(s.year, s.month);
export const 月番を年月に = (n) => ({ 年: Math.floor((n - 1) / 12), 月: ((n - 1) % 12) + 1 });

/* 予定（次の山賊退治と威力偵察の月番。年×十二＋月）。風雲を始めるときに据える（hitori/fuun.js 風雲を始める）。
   前の記録には無いので、見るときは翌月・三か月後とみなし、書くときにここで据える */
export const 予定を見る = (s) => {
  const f = s && s.風雲; if (!f) return null;
  const 今 = 今の月番(s);
  return f.予定 || { 山賊: 今 + 1, 偵察: 今 + 3 };
};
export function 予定を据える(s) {
  const f = s && s.風雲; if (!f) return null;
  if (!f.予定) f.予定 = { ...予定を見る(s) };
  return f.予定;
}
export const 山賊の月か = (s) => { const 予 = 予定を見る(s); return !!予 && !s.風雲.討死 && 今の月番(s) >= 予.山賊; };
export const 偵察の月か = (s) => { const 予 = 予定を見る(s); return !!予 && !s.風雲.討死 && 今の月番(s) >= 予.偵察; };

/* 家の手の届く町（その町にいちばん近い城を家が押さえている）。主人公の住む城に近い順 */
export function 手の届く町ら(s) {
  const f = s.風雲; const 城 = f && (s.castles || []).find((c) => c.id === f.城);
  if (!城) return [];
  return TOWNS.filter((t) => 特殊勢力の可否(s, t, s.player).ok)
    .map((t) => ({ t, d: Math.hypot(px(t.lon) - 城.x, py(t.lat) - 城.y) }))
    .sort((a, b) => a.d - b.d).map((x) => x.t);
}

/* 主命を下す（月が明けたとき。主命が無く、上司が家にいれば、四割五分で）。下した主命を返す */
export function 主命を下す(s, 乱 = Math.random) {
  const f = s.風雲; if (!f || f.討死 || f.主命) return null;
  const 上 = (s.generals || []).find((x) => x.id === f.上司);
  if (!上 || 上.captive || 上.faction !== s.player) return null;
  if (乱() >= 働きかけの下る目) return null;
  const 町 = 手の届く町ら(s)[0];
  if (!町) return null;
  const 種 = "特殊勢力への働きかけ";               // 山賊退治は三か月ごとの務めになった（下の 山賊の務めを決める）
  const r = 乱(), 重さ = r < 0.4 ? "軽" : r < 0.8 ? "並" : "重";
  const 期限 = 月を足す({ 年: s.year, 月: s.month }, 期限の月[種]);
  const 文 = `${町.name}の${町の種の名[町.kind] || "衆"}へ使いし、誼を通じる下地をつくれ`;
  f.主命 = { 種, 重さ, 文, 上司: 上.id, 城: f.城, 町: 町.id, 出: { 年: s.year, 月: s.month }, 期限 };
  記す(s, `${上.name}より主命を受けた：${文}（期限 ${期限.年}年${期限.月}月）。`);
  return f.主命;
}

/* 果たした・しくじった */
function 果たす(s, 添え) {
  const f = s.風雲, m = f.主命, 重 = 主命の重さ[m.重さ] || 主命の重さ.並;
  f.勲功 += 重.勲功; f.覚え = 限(f.覚え + 重.覚え, 0, 100); f.金 += 重.金;
  f.主命の数 = { 果たした: 0, しくじった: 0, ...(f.主命の数 || {}) }; f.主命の数.果たした += 1;
  記す(s, `主命を果たした（${m.種}）。${添え || ""}勲功${重.勲功}・覚え${重.覚え}・金${重.金}貫を得た。`);
  f.主命 = null;
  取り立てを見る(s);
}
function しくじる(s, 訳, 減り) {
  const f = s.風雲, m = f.主命;
  f.覚え = 限(f.覚え - 減り, 0, 100);
  f.主命の数 = { 果たした: 0, しくじった: 0, ...(f.主命の数 || {}) }; f.主命の数.しくじった += 1;
  記す(s, `${訳}主命（${m.種}）を果たせなかった。覚えが${減り}下がった。`);
  f.主命 = null;
}

/* 月の行いに「主命に励む」を選んだ月の、盤を開かない主命（特殊勢力への働きかけ）。
   まとまる見込みは知略と政務で決まる（知略二十五・政務二十・覚え五十で三割ほど）。まとまらなければ、期限まで続けられる */
export function 働きかけの見込み(f) {
  return 限(0.25 + ((f.知略 || 0) + (f.政務 || 0) - 45) * 0.008 + ((f.覚え || 50) - 50) * 0.002, 0.1, 0.8);
}
export function 主命の月の初め(s, 乱 = Math.random) {
  const f = s.風雲; if (!f || f.討死 || !f.主命) return s;
  if (!(f.行い || []).includes("主命に励む") || f.主命.種 !== "特殊勢力への働きかけ") return s;
  const t = TOWNS.find((x) => x.id === f.主命.町);
  if (乱() < 働きかけの見込み(f)) 果たす(s, `${t ? t.name : "町"}と誼を通じる下地ができた。`);
  else 記す(s, `${t ? t.name : "町"}へ使いしたが、話はまとまらなかった。`);
  return s;
}

/* 月が明けたとき：期限を過ぎた主命はしくじりとし、主命が無ければ新たに下される */
export function 主命の月が明けた(s, 乱 = Math.random) {
  const f = s.風雲; if (!f || f.討死) return s;
  if (f.主命 && 月の番(s.year, s.month) > 月の番(f.主命.期限.年, f.主命.期限.月)) しくじる(s, "期限を過ぎ、", 8);
  else if (f.主命 && f.主命.上司 !== f.上司) { 記す(s, "主命を下した上司が去り、主命は沙汰止みとなった。"); f.主命 = null; }
  if (!f.主命) 主命を下す(s, 乱);
  return s;
}

/* 山賊退治の盤を組む。上司の手の者（主人公の組。足軽なら四十人、身分が上がれば十人ずつ多い）が、
   山道で山賊に当たる。主人公の組は「主命の組」、山賊は「山賊の隊」の id を持つ */
const 名簿 = (数, 種ら, 頭) => {
  const out = []; let 残 = 数, k = 0;
  while (残 > 0) { const m = Math.min(50, 残); out.push({ id: `${頭}-${k}`, m, t: 種ら[k % 種ら.length] }); 残 -= m; k++; }
  return out;
};
/* 山賊退治の務め（重さと文）。盤を開く前に決め、合戦の札（ctx.務め）に持たせる（盤の側では s に書かない） */
export function 山賊の務めを決める(s, 乱 = Math.random) {
  const f = s.風雲, 城 = (s.castles || []).find((c) => c.id === f.城);
  const r = 乱(), 重さ = r < 0.4 ? "軽" : r < 0.8 ? "並" : "重";
  return { 種: "山賊退治", 重さ, 文: `${城 ? 城.name : "城"}の近在の山に出る山賊（およそ${主命の重さ[重さ].賊}人）を討て`, 上司: f.上司, 城: f.城 };
}
export function 山賊の盤を組む(s, 務め = null) {
  const f = s.風雲, m = 務め || f.主命;
  const 上 = (s.generals || []).find((x) => x.id === f.上司);
  const 家 = s.factions[s.player] || {};
  const 重 = 主命の重さ[m.重さ] || 主命の重さ.並;
  const 我の数 = 40 + 10 * 段の番(f.身分);
  setBattleMap(null);
  setFieldSeed(f.城, `sanzoku-${s.year}-${s.month}`);
  setFieldKind("山道");
  layoutField(我の数 + 重.賊, 2, null);
  const W = FIELD.w, Hh = FIELD.h;
  const 我将 = { id: 主命の組, name: `${上 ? 上.name : ""}の手の者`, lead: 55, valor: 58, wit: 45, gov: 40,
    retinue: 我の数, retTrain: 62, rost: 名簿(我の数, ["yari", "yari", "yumi"], "fk") };
  const 賊将 = { id: 山賊の隊, name: "山賊", lead: 38, valor: 60, wit: 30, gov: 10,
    retinue: 重.賊, retTrain: 40, rost: 名簿(重.賊, ["yari", "yumi", "yari"], "sz") };
  const P = makeCorps("P", 我将, 我の数, 0, 62, 60, W * 0.5, Hh * 0.7, -Math.PI / 2, 家.color || "#2F5D8C");
  const E = makeCorps("E", 賊将, 重.賊, 0, 40, 40, W * 0.5, Hh * 0.32, Math.PI / 2, "#6B5A48");
  for (const c of [P, E]) { c.formation = "横陣"; placeSquads(c, true); }
  E.山賊 = true;   // 山賊の頭の首は大将首に数えない（hitori/fuun.js 首の値）
  const b = createBattle([P], [E], "P");
  b.mode = "field"; b.face = "S"; b.myFar = false;
  b.notices = [{ t: 0, kind: "info", text: `${務め ? "務め" : "主命"}：${m.文}` }];
  return b;
}

/* 山賊退治の盤のあと：主人公の働き（b.一人働き）を勲功に積み、勝てば褒美、負ければ覚えが下がる。
   務め … 三か月ごとの務め（ctx.務め）。渡さなければ、前の記録の主命（山賊退治）として始末する */
export function 山賊退治の果て(s, b, 務め = null) {
  const f = s.風雲; if (!f || !b) return s;
  const 古い主命 = !務め && f.主命 && f.主命.種 === "山賊退治" ? f.主命 : null;
  if (!務め && !古い主命) return s;
  const 働 = b.一人働き || {}, 討 = 働.討ち取り || 0;
  const 功 = 討ち取りの勲功(f, 働);                  // 雑兵は三人で一・山賊の頭は一（hitori/fuun.js）
  f.討ち取り += 討; f.勲功 += 功.勲功;
  if (働.体力 != null) f.体力 = 限(Math.round(働.体力), 0, 100);
  const 次を据える = () => { if (!古い主命) { const 予 = 予定を据える(s); 予.山賊 = 今の月番(s) + 山賊の間; } };
  if (働.討死) {
    f.討死 = { 年: s.year, 月: s.month, 場所: "山賊退治" };
    記す(s, `山賊退治のさなかに討死した。生涯の討ち取り${f.討ち取り}・勲功${f.勲功}。`);
    if (古い主命) f.主命 = null;
    次を据える();
    return s;
  }
  /* 持ち場を離れた咎（ふだんの合戦と同じ。hitori/senaka.js 持ち場を見る）。山賊の頭を討てば記す */
  const 咎 = Math.round(働.咎 || 0);
  if (咎 > 0) f.覚え = 限(f.覚え - 咎, 0, 100);
  if ((働.首 || []).some((k) => k && k.山賊)) 記す(s, "山賊の頭を討ち取った。");
  const 討の文 = `討ち取り${討}${内訳の文(功)}・勲功${功.勲功}`;
  if (古い主命) {
    if (b.result === "P") 果たす(s, `山賊を討ち払った（${討の文}）。`);
    else しくじる(s, `山賊を討ち漏らし（${討の文}）、`, 5);
  } else {
    const 重 = 主命の重さ[務め.重さ] || 主命の重さ.並;
    f.主命の数 = { 果たした: 0, しくじった: 0, ...(f.主命の数 || {}) };
    if (b.result === "P") {
      f.勲功 += 重.勲功; f.覚え = 限(f.覚え + 重.覚え, 0, 100); f.金 += 重.金; f.主命の数.果たした += 1;
      記す(s, `山賊退治の務めを果たした。山賊を討ち払った（${討の文}）。褒美に勲功${重.勲功}・覚え${重.覚え}・金${重.金}貫を得た。`);
    } else {
      f.覚え = 限(f.覚え - 5, 0, 100); f.主命の数.しくじった += 1;
      記す(s, `山賊を討ち漏らし（${討の文}）、山賊退治の務めを果たせなかった。覚えが5下がった。`);
    }
  }
  if (咎 > 0) 記す(s, `持ち場を離れたため、上司の覚えが${咎}下がった。`);
  次を据える();
  取り立てを見る(s);
  return s;
}

/* ---- 威力偵察（半年ごとの務め） ---- */
const 城の兵 = (s, c) => (c.local || 0) + (s.generals || []).filter((x) => x.at === c.id && x.faction === c.faction && !x.captive)
  .reduce((a, x) => a + (x.retinue || 0), 0);
/* 威力偵察の的（遊ぶ人の申し出の「攻略対象の大名」）：上司の城から道（家と味方の領を通る道。四歩まで）の届く敵の城
   （和睦・同盟・同じ旗の下の家は除く）のうち、上司の城から出陣するとしたときに、攻めるに要る兵（出征の見立て。
   城の兵の三倍を将の質で加減）に寄せられる兵がいちばん近い城（兵を減らせば攻め落とせる見込みに届く城。家の出陣の
   決まりと同じ物差し）。家の狙う城（家の aim）は、足りない兵を三百少なく見て先にする（狙いでも、兵が多すぎて
   減らしても届かない城は選ばない）。並べば道の近い城。選べなければ { 訳 } を返す */
export function 偵察の的を選ぶ(s) {
  const f = s.風雲; if (!f || f.討死) return { 訳: "風雲でない" };
  const 上 = (s.generals || []).find((x) => x.id === f.上司);
  if (!上 || 上.captive || 上.faction !== s.player) return { 訳: "上司がいない" };
  if (!上.at) return { 訳: "上司が出陣中" };
  const 発つ = (s.castles || []).find((c) => c.id === 上.at && c.faction === s.player);
  if (!発つ) return { 訳: "上司がいない" };
  const 候 = [];
  for (const c of s.castles || []) {
    if (c.faction === s.player || !s.factions[c.faction]) continue;
    if (atPeace(s, s.player, c.faction) || 同じ旗の下(s, s.player, c.faction)) continue;
    const p = 軍の道(s, s.player, 発つ.id, c.id);
    if (!p || p.length - 1 > 4) continue;
    候.push({ c, 歩: p.length - 1, 兵: 城の兵(s, c) });
  }
  if (!候.length) return { 訳: "的が無い" };
  const aim = (s.factions[s.player] || {}).aim;
  const 率いる = (s.generals || []).filter((x) => x.at === 発つ.id && x.faction === s.player && !x.captive).sort((a, b) => b.lead - a.lead).slice(0, 2);
  const 将ら = 率いる.includes(上) ? 率いる : [上, ...率いる.slice(0, 1)];
  const 寄 = 寄せられる見込み(s, s.player, 発つ, { 道: 軍の道, 限り: 6, 歩: 5 });
  for (const o of 候) {
    o.不足 = Math.max(0, 出征の見立て(s, s.player, o.c, 将ら).要る - 寄);
    o.点 = o.不足 - (aim && aim.target === o.c.id ? 300 : 0);
  }
  const 選 = [...候].sort((a, b) => a.点 - b.点 || a.歩 - b.歩 || a.兵 - b.兵)[0];
  return { 城: 選.c, 家: 選.c.faction, 家名: (s.factions[選.c.faction] || {}).name || "", 兵: 選.兵, 不足: 選.不足, 上 };
}
/* 威力偵察の盤：上司の手勢（上司の手勢の六割。百五十〜四百五十人）と、的の城の物見の兵（手勢の〇.八〜一.二倍。
   城の兵の三割五分まで、百人を下回らない）が、街道で当たる。敵の頭は大将首に数えない（名のある侍と同じ） */
export function 偵察の盤を組む(s, 的, 乱 = Math.random) {
  const 上 = 的.上, 敵家 = s.factions[的.家] || {}, 家 = s.factions[s.player] || {};
  const 我の数 = 限(Math.round((上.retinue || 300) * 0.6), 150, 450);
  const 敵の数 = 限(Math.round(我の数 * (0.8 + 乱() * 0.4)), 100, Math.max(100, Math.round(的.兵 * 0.35)));
  setBattleMap(null);
  setFieldSeed(的.城.id, `teisatsu-${s.year}-${s.month}`);
  setFieldKind("街道");
  layoutField(我の数 + 敵の数, 2, null);
  const W = FIELD.w, Hh = FIELD.h;
  const 我将 = { id: 偵察の組, name: `${上.name}の手勢`, lead: 上.lead, valor: 上.valor, wit: 上.wit, gov: 上.gov,
    retinue: 我の数, retTrain: 64, rost: 名簿(我の数, ["yari", "yari", "yumi"], "ts") };
  const 敵将 = { id: 偵察の敵, name: `${敵家.name || ""}の物見`, lead: 52, valor: 56, wit: 48, gov: 40,
    retinue: 敵の数, retTrain: 58, rost: 名簿(敵の数, ["yari", "yumi", "yari"], "mm") };
  const P = makeCorps("P", 我将, 我の数, 0, 64, 60, W * 0.5, Hh * 0.7, -Math.PI / 2, 家.color || "#2F5D8C");
  const E = makeCorps("E", 敵将, 敵の数, 0, 58, 55, W * 0.5, Hh * 0.32, Math.PI / 2, 敵家.color || "#B0483C");
  for (const c of [P, E]) { c.formation = "横陣"; placeSquads(c, true); }
  E.物見 = true;
  const b = createBattle([P], [E], "P");
  b.mode = "field"; b.face = "S"; b.myFar = false;
  b.偵察 = { 城: 的.城.id, 家: 的.家, 我の数, 敵の数 };
  b.notices = [{ t: 0, kind: "info", text: `威力偵察：${的.城.name}（${敵家.name || ""}）の兵と小競り合い` }];
  return b;
}
/* 城の兵を減らす（地の兵から。足りなければ城にいる将の手勢から） */
function 城の兵を減らす(s, 城, n) {
  let 残 = Math.max(0, Math.round(n));
  const 地 = Math.min(城.local || 0, 残);
  if (地 > 0) { 城.local -= 地; if (城.rost) 城.rost = rosterTake(城.rost, 地).rest; 残 -= 地; }
  for (const x of (s.generals || []).filter((q) => q.at === 城.id && q.faction === 城.faction && !q.captive)) {
    if (残 <= 0) break;
    const d = Math.min(x.retinue || 0, 残); x.retinue -= d; 残 -= d;
  }
}
const 隊の兵 = (c) => ((c && c.squads) || []).reduce((a, q) => a + Math.max(0, q.men || 0), 0);
/* 威力偵察の盤のあと：討たれた兵を世界から減らし（敵は的の城の兵、味方は上司の手勢）、働きを勲功に積む。
   勝てば、的の城を半年のあいだ家の出陣の的として重く見る（f.偵察の的。govern/month.js） */
export function 偵察の果て(s, b) {
  const f = s.風雲; if (!f || !b || !b.偵察) return s;
  const 偵 = b.偵察, 城 = (s.castles || []).find((c) => c.id === 偵.城);
  const P = (b.corps || []).find((c) => c.id === 偵察の組), E = (b.corps || []).find((c) => c.id === 偵察の敵);
  const 我の損 = Math.max(0, Math.round(偵.我の数 - 隊の兵(P))), 敵の損 = Math.max(0, Math.round(偵.敵の数 - 隊の兵(E)));
  const 減らせた = !!城 && 城.faction === 偵.家;
  if (減らせた) 城の兵を減らす(s, 城, 敵の損);
  const 上 = (s.generals || []).find((x) => x.id === f.上司);
  if (上) 上.retinue = Math.max(0, Math.round((上.retinue || 0) - 我の損));
  const 働 = b.一人働き || {}, 討 = 働.討ち取り || 0, 功 = 討ち取りの勲功(f, 働);
  f.合戦 += 1; f.討ち取り += 討; f.勲功 += 功.勲功;
  if (働.体力 != null) f.体力 = 限(Math.round(働.体力), 0, 100);
  const 予 = 予定を据える(s); 予.偵察 = 今の月番(s) + 偵察の間;
  const 勝 = b.result === "P" ? "勝ち戦" : b.result === "E" ? "負け戦" : "引き分け";
  const 場 = `${城 ? 城.name : ""}（${(s.factions[偵.家] || {}).name || ""}）`;
  if (働.討死) {
    f.討死 = { 年: s.year, 月: s.month, 場所: `${城 ? 城.name : ""}への威力偵察` };
    記す(s, `${場}への威力偵察の${勝}で討死した。生涯の討ち取り${f.討ち取り}・勲功${f.勲功}。`);
    return s;
  }
  記す(s, `${場}へ威力偵察に出て${勝}。敵の兵${敵の損}人を${減らせた ? "減らし" : "討ち"}、味方の損は${我の損}人。討ち取り${討}${内訳の文(功)}・勲功${功.勲功}。`);
  const 咎 = Math.round(働.咎 || 0);
  if (咎 > 0) { f.覚え = 限(f.覚え - 咎, 0, 100); 記す(s, `持ち場を離れたため、上司の覚えが${咎}下がった。`); }
  if (b.result === "P" && 減らせた) {
    f.偵察の的 = { 城: 城.id, 迄: 今の月番(s) + 偵察の間 };
    記す(s, `家中では、兵の減った${城.name}を攻める的として重く見るようになった。`);
  }
  取り立てを見る(s);
  return s;
}
/* 威力偵察を見合わせる（上司が出陣中なら翌月に見直し、的が無い・上司がいないなら半年先へ） */
export function 偵察を見合わせる(s, 訳) {
  const 予 = 予定を据える(s); if (!予) return s;
  const 来月 = 訳 === "上司が出陣中";
  予.偵察 = 今の月番(s) + (来月 ? 1 : 偵察の間);
  記す(s, 来月 ? "上司が出陣中のため、威力偵察は見合わせた（来月に見直す）。" : "威力偵察の的が無く、見合わせた。");
  return s;
}
