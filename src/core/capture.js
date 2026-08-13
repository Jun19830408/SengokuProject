import { canRecruit } from "./house.js";
import { clamp } from "./util.js";
import { houseAlive } from "./state.js";

/* --------------------------------------------- 捕縛と捕虜（GDD 12.3）
   捕らわれること自体は稀である。統率・武勇・知略に優れた者ほど、
   囲みを破り、あるいは供回りに守られて落ち延びる。 */
export const CAPTURE_BASE = 0.06;                 // 敗れた武将が捕らわれる基準の確率

export function captureChance(gen) {
  const able = (gen.lead + gen.valor + gen.wit) / 3;      // 三つの平均
  // 能力70で基準の半分、能力40で基準の倍ほど
  const k = clamp(1.9 - able / 55, 0.25, 2.2);
  return clamp(CAPTURE_BASE * k, 0.01, 0.2);
}

/* 身代金（GDD 12.3）。器量の高い者ほど高くつく。
   甲は金銭と兵糧の三分の一、乙は五分の一、丙は七分の一、丁は九分の一。 */
export function ransomRank(gen) {
  const t = gen.lead + gen.valor + gen.wit + gen.gov;
  return t >= 300 ? "甲" : t >= 250 ? "乙" : t >= 200 ? "丙" : "丁";
}

export const RANSOM_DIV = { 甲: 3, 乙: 5, 丙: 7, 丁: 9 };

// 支払う側（旧主の家）の金銭と兵糧から割り出す
export function ransomCost(s, gen) {
  const rank = ransomRank(gen);
  const div = RANSOM_DIV[rank];
  const payer = gen.captive ? gen.captive.from : gen.faction;
  const gold = s.factions[payer] ? s.factions[payer].gold : 0;
  const food = s.castles.filter((c) => c.faction === payer).reduce((a, c) => a + c.food, 0);
  return { rank, div, gold: Math.round(gold / div), food: Math.round(food / div), payer };
}

// 相手方が身代金に応じるか。器量が高く、払えるほど応じる。
// 家が滅んでいれば、応じる者がいない。
export function ransomAccept(s, gen) {
  const { gold, food, payer } = ransomCost(s, gen);
  const f = s.factions[payer];
  if (!f || !houseAlive(s, payer)) return false;
  const canPay = f.gold >= gold && s.castles.filter((c) => c.faction === payer).reduce((a, c) => a + c.food, 0) >= food;
  if (!canPay) return false;
  const worth = (gen.lead + gen.valor + gen.wit + gen.gov) / 400;    // 器量
  const loy = (gen.loyal == null ? 60 : gen.loyal) / 100;
  return Math.random() < clamp(worth * 0.9 + loy * 0.5 - 0.25, 0.05, 0.95);
}

// 身代金を支払わせ、武将を返す
export function payRansom(s, gen) {
  const { gold, food, payer } = ransomCost(s, gen);
  const f = s.factions[payer];
  // 滅んだ家へは返せない。帰る城がなく、他家の城へ置き去りにすることになる。
  if (!f || !houseAlive(s, payer)) return false;
  f.gold -= gold;
  let left = food;
  for (const c of s.castles.filter((c2) => c2.faction === payer)) {
    const take = Math.min(c.food, left);
    c.food -= take; left -= take;
    if (left <= 0) break;
  }
  s.factions[s.player].gold += gold;
  const mine = s.castles.filter((c) => c.faction === s.player);
  if (mine.length) mine[0].food += food;
  const home = s.castles.find((c) => c.faction === payer);
  if (!home) return false;                       // 帰る城がない（ここへは来ないはずだが念のため）
  gen.captive = null; gen.at = home.id;
  gen.retinue = Math.round(180 + Math.random() * 120);
  return { gold, food, home };
}


// 捕らえた武将を捕虜として城へ入れる
export function makePrisoner(s, gen, holderFaction, castleId) {
  gen.captive = { by: holderFaction, from: gen.faction, at: castleId, since: `${s.year}-${s.month}` };
  gen.at = castleId;
  gen.retinue = 0;
  return gen;
}

// 登用の可否（GDD 12.3）。忠誠40以下は降り、41〜70は運、71以上は決して降らない。
export function persuadeResult(gen) {
  const loy = gen.loyal == null ? 60 : gen.loyal;
  if (loy <= 40) return true;
  if (loy >= 71) return false;
  return Math.random() < (71 - loy) / 40;
}

/* 捕虜を登用できるか（GDD 12.3 / 12.4）。

   関門は二つある。忠誠が下がっていること、そして旧主との縁が切れていること。
   このうち後者を通していない入口が二つあった。城下で捕らえた直後に出る問いと、
   外交の欄の捕虜一覧である。そこでは忠誠さえ下がっていれば、旧主と血を分けた
   一門でも降った。要件を満たさぬのに登用できる、というのはこれである。

   旧主は、その家がまだ在れば当主。滅んでいれば、もはや縁を説く相手もいない。
   判じ方を一箇所にまとめ、画面の可否も、実際の処理も、同じここを通す。 */
export function captiveRecruit(s, gen) {
  if (!gen || !gen.captive) return { ok: false, why: "捕虜ではない" };
  const loy = gen.loyal == null ? 60 : gen.loyal;
  const 旧主 = s.generals.find((x) => x.faction === gen.captive.from && x.lord && !x.captive) || null;
  const rec = canRecruit(gen, 旧主);
  if (!rec.ok) return rec;                       // 一門、あるいは旧主への忠誠が篤すぎる
  if (loy > 40) return { ok: false, why: `旧主への忠誠${Math.round(loy)}。まだ心が離れていない（40以下で降る）` };
  return { ok: true, why: "" };
}


// 捕虜とする。戦後の始末を経た者は、月ごとに心を開いていく。
export function takeAsPrisoner(s, gen, winner, castleId) {
  const g2 = s.generals.find((x) => x.id === gen.id);
  if (!g2) return;
  g2.captive = { by: winner, from: g2.faction, at: castleId, since: { y: s.year, m: s.month }, ruin: true };
  // 家が絶え、身は敵手にある。もはや誰の当主でもない。
  // 札を持たせたままにすると、後にこの者が仕えたとき、その家に当主が二人立つ。
  g2.lord = false;
  g2.warLoyal = 0;                  // 勝った家への忠誠。ここから積み上げる。
  g2.retinue = Math.round(g2.retinue * 0.25);
  g2.at = castleId;
}

