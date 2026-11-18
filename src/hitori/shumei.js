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
   世界（城・軍・町）には手を入れない。ここは s.風雲 を読み書きするだけである。
   ========================================================================== */
import { TOWNS } from "../data/castles.js";
import { px, py } from "../data/geo.js";
import { 特殊勢力の可否 } from "../core/town.js";
import { setBattleMap } from "../battle/castleMap.js";
import { FIELD, layoutField, setFieldKind, setFieldSeed } from "../battle/field.js";
import { makeCorps, placeSquads } from "../battle/corps.js";
import { createBattle } from "../battle/engine.js";
import { 記す, 限, 段の番, 取り立てを見る } from "./fuun.js";

/* 主命の重さ。山賊の数と、果たしたときの褒美 */
export const 主命の重さ = {
  軽: { 賊: 24, 勲功: 1, 覚え: 4, 金: 1 },
  並: { 賊: 38, 勲功: 2, 覚え: 6, 金: 2 },
  重: { 賊: 42, 勲功: 3, 覚え: 9, 金: 3 },
};
export const 主命の下る目 = 0.45;          // 主命の無い月が明けたとき、新たに下される見込み
export const 主命の組 = "fuun-kumi", 山賊の隊 = "fuun-sanzoku";
const 期限の月 = { 山賊退治: 2, 特殊勢力への働きかけ: 3 };
const 町の種の名 = { 港: "湊", 水軍衆: "水軍衆", 商業都市: "商人衆", 町: "町衆", 寺社: "寺社", 忍びの里: "忍びの里", 鉱山: "鉱山衆" };

export const 月を足す = (年月, n) => { const k = 年月.年 * 12 + (年月.月 - 1) + n; return { 年: Math.floor(k / 12), 月: (k % 12) + 1 }; };
const 月の番 = (年, 月) => 年 * 12 + 月;

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
  if (乱() >= 主命の下る目) return null;
  const 城 = (s.castles || []).find((c) => c.id === f.城);
  const 町 = 手の届く町ら(s)[0];
  const 種 = 町 && 乱() < 0.3 ? "特殊勢力への働きかけ" : "山賊退治";
  const r = 乱(), 重さ = r < 0.4 ? "軽" : r < 0.8 ? "並" : "重";
  const 期限 = 月を足す({ 年: s.year, 月: s.month }, 期限の月[種]);
  const 文 = 種 === "山賊退治"
    ? `${城 ? 城.name : "城"}の近在の山に出る山賊（およそ${主命の重さ[重さ].賊}人）を討て`
    : `${町.name}の${町の種の名[町.kind] || "衆"}へ使いし、誼を通じる下地をつくれ`;
  f.主命 = { 種, 重さ, 文, 上司: 上.id, 城: f.城, 町: 種 === "特殊勢力への働きかけ" ? 町.id : null,
    出: { 年: s.year, 月: s.month }, 期限 };
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
export function 山賊の盤を組む(s) {
  const f = s.風雲, m = f.主命;
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
  b.notices = [{ t: 0, kind: "info", text: `主命：${m.文}` }];
  return b;
}

/* 山賊退治の盤のあと：主人公の働き（b.一人働き）を勲功に積み、勝てば主命を果たす。負ければしくじり */
export function 山賊退治の果て(s, b) {
  const f = s.風雲; if (!f || !f.主命 || !b) return s;
  const 働 = b.一人働き || {}, 討 = 働.討ち取り || 0;
  f.討ち取り += 討; f.勲功 += 討;
  if (働.体力 != null) f.体力 = 限(Math.round(働.体力), 0, 100);
  if (働.討死) {
    f.討死 = { 年: s.year, 月: s.month, 場所: "山賊退治" };
    記す(s, `山賊退治の主命のさなかに討死した。生涯の討ち取り${f.討ち取り}・勲功${f.勲功}。`);
    f.主命 = null;
    return s;
  }
  /* 持ち場を離れた咎（ふだんの合戦と同じ。hitori/senaka.js 持ち場を見る）。山賊の頭を討てば記す */
  const 咎 = Math.round(働.咎 || 0);
  if (咎 > 0) f.覚え = 限(f.覚え - 咎, 0, 100);
  if ((働.首 || []).some((k) => k && k.山賊)) 記す(s, "山賊の頭を討ち取った。");
  if (b.result === "P") 果たす(s, `山賊を討ち払った（討ち取り${討}）。`);
  else しくじる(s, `山賊を討ち漏らし（討ち取り${討}）、`, 5);
  if (咎 > 0) 記す(s, `持ち場を離れたため、上司の覚えが${咎}下がった。`);
  取り立てを見る(s);
  return s;
}
