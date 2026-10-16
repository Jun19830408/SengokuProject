/* ==========================================================================
   出奔して自立する（GDD 6.1）

   遊ぶ側の申し出は「出奔した場合、武将のいない城に入り独立するのはどうか」で
   あった。もとの出奔は、近隣の家へ走るか、盤から消えるかのどちらかで、天下を
   統べたあとは忠誠の低い者がただ消えていった。

   心の離れた者が、守る将のいない城に入って旗を揚げる。家は盤に定めた百三十四家の
   ほかに、こうして新しく興る（謀反の寄親が敵の隣家へ走るのとは別の筋である。
   core/muhon.js）。

   入る城の決まり。
     一、旧主の城であること（出奔する者が勝手を知る城）
     二、出奔する者の居る城から、道で三つまでの城
     三、城に将が一人もいないこと（城代を含む）。囲まれておらず、本拠でもないこと
     四、その者がその城の城主になれる格であること（侍大将以上。core/rank.js canHoldCastle）
   入れる城が無ければ、もとのとおり近隣の家へ走る。

   興した家は旧主と敵対し、ほかの家とは中立から始まる。城の兵は新しい主に従う。
   ========================================================================== */
import { relKey, 本拠を追う, 奪われた本領を繕う } from "./state.js";
import { canHoldCastle } from "./rank.js";
import { ROAD_ADJ } from "./paths.js";
import { 姓 } from "./util.js";

export const 自立の道のり = 3;

// 新しい家の色。盤の色と紛れぬよう、くすんだ中間の色を順に使う。
const 色の帳 = ["#7A5C8E", "#5E7F6B", "#8C6A4F", "#4F6F8C", "#8E5A5A", "#6B7A3E",
  "#5A5A8E", "#7E6E3A", "#3E7A7A", "#8A4F7A", "#6A5240", "#4A6A50"];

/* 入れる城。近いものから。 */
export function 自立に入る城(s, gen) {
  if (!gen || gen.captive || gen.lord) return null;
  const 起 = gen.at || gen.本領;
  if (!起) return null;
  const 本拠 = (s.factions[gen.faction] || {}).本拠;
  const 囲まれ = new Set((s.sieges || []).map((q) => q.castleId));
  const 将の居る = new Set(s.generals.filter((g) => !g.captive && g.at && g.id !== gen.id).map((g) => g.at));
  const 隔 = new Map([[起, 0]]);
  const 列 = [起];
  while (列.length) {
    const a = 列.shift();
    if (隔.get(a) >= 自立の道のり) continue;
    for (const b of ROAD_ADJ[a] || []) {
      if (隔.has(b)) continue;
      隔.set(b, 隔.get(a) + 1);
      列.push(b);
    }
  }
  const 候補 = s.castles.filter((c) => 隔.has(c.id) && c.id !== 起
    && c.faction === gen.faction && c.id !== 本拠 && !囲まれ.has(c.id)
    && !将の居る.has(c.id) && canHoldCastle(gen, s, c));
  if (!候補.length) return null;
  return [...候補].sort((a, b) => 隔.get(a.id) - 隔.get(b.id) || b.koku - a.koku)[0];
}

/* 家を興す。興した家の id を返す。 */
export function 自立する(s, gen, 城) {
  const 旧 = gen.faction;
  const 旧の名 = (s.factions[旧] || {}).name || "";
  let id = `jiritsu_${gen.id}`;
  for (let i = 2; s.factions[id]; i++) id = `jiritsu_${gen.id}_${i}`;
  const 名の頭 = 姓(gen.name);
  const 名ら = new Set(Object.values(s.factions).map((f) => f.name));
  let name = `${名の頭}家`;
  if (名ら.has(name)) name = `${名の頭}家（${城.name.replace(/城$/, "")}）`;
  const 使った色 = new Set(Object.values(s.factions).map((f) => f.color));
  const color = 色の帳.find((c) => !使った色.has(c)) || 色の帳[Object.keys(s.factions).length % 色の帳.length];
  s.factions[id] = {
    id, name, color, mon: null,
    gold: Math.round(300 + 城.koku * 0.01), prestige: 20, mobilization: 1,
    desc: `${旧の名}を出奔した${gen.name}が、${城.name}に拠って自立した家。`,
    自立: { from: 旧, by: gen.id, y: s.year, m: s.month },
  };
  // 間柄。旧主とは敵対、ほかとは中立から
  for (const f of Object.keys(s.factions)) {
    if (f === id) continue;
    s.relations[relKey(id, f)] = f === 旧
      ? { trust: 5, state: "敵対", until: null }
      : { trust: 45, state: "中立", until: null };
  }
  // 将。役を解き、家の主となる
  for (const c of s.castles) if (c.lordId === gen.id) c.lordId = null;
  for (const a of s.armies || []) if ((a.gens || []).includes(gen.id)) a.gens = a.gens.filter((g) => g !== gen.id);
  for (const g of s.generals) if (g.寄親 === gen.id) g.寄親 = null;
  Object.assign(gen, {
    faction: id, lord: true, at: 城.id, 本領: 城.id, loyal: 100,
    役: null, 役国: null, 方面: null, 的家: null, 寄親: null, guardian: null, 謀反支度: null,
  });
  // 城。兵は新しい主に従う
  城.faction = id;
  城.lordId = gen.id;
  城.城代 = false;
  城.najimi = Math.min(城.najimi ?? 70, 40);
  城.intrigue = false; 城.intrigueBy = null; 城.intrigueOwner = null;
  本拠を追う(s);
  奪われた本領を繕う(s);
  return id;
}
