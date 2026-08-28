import { clamp } from "./util.js";
import { GOKINAI, KANTO_KEY } from "../data/provinces.js";

/* ------------------------------------------------ 検地（GDD 4.6）
   検地は一国を丸ごと押さえてはじめて行える。
   国境をまたいで竿を入れることはできず、他家の城が一つでも残っていれば、
   その国の帳簿は改まらない。
   竿を入れれば実りが正しく改まり、石高の限りが伸びる。
   ただし民には厳しい沙汰であり、民忠は下がる。 */
// その国を丸ごと押さえているか
export function holdsProvince(s, fid, kuni) {
  const cs = s.castles.filter((c) => c.kuni === kuni);
  return cs.length > 0 && cs.every((c) => c.faction === fid);
}

// その家が丸ごと押さえている国の一覧
export function provincesHeld(s, fid) {
  const out = [];
  for (const kuni of [...new Set(s.castles.map((c) => c.kuni))]) {
    if (kuni && holdsProvince(s, fid, kuni)) out.push(kuni);
  }
  return out;
}

// まだ検地を入れていない国
export const kenchiDone = (s, kuni) => (s.kenchi || []).includes(kuni);

export function kenchiCost(s, kuni) {
  const cs = s.castles.filter((c) => c.kuni === kuni);
  const koku = cs.reduce((a, c) => a + c.koku, 0);
  return { gold: Math.round(400 + koku / 260), months: Math.max(2, Math.min(6, cs.length)) };
}

// 検地を行う。国中の城の実りが改まり、石高の限りが伸びる。
export function runKenchi(s, fid, kuni, gov) {
  const cs = s.castles.filter((c) => c.kuni === kuni && c.faction === fid);
  const skill = 0.75 + (gov || 60) / 240;              // 奉行の政務が効く
  let before = 0, after = 0;
  for (const c of cs) {
    before += c.koku;
    /* 検地が改めるのは「限り」であって、石高そのものではない。

       竿を入れると、慶長の高で止まっていた限りが、元禄の高まで引き上がる。
       地の力が明らかになった、ということである。そこから先は、みずから
       治水して田畑可能地を広げ、開墾で田を開いていく。
       一国を丸ごと押さえた者への褒美は、この「伸ばせるようになること」に
       とどめる。竿を入れただけで実りが増えるわけではない。

       奉行の政務が良ければ、隠れていた田がいくらか表に出る（隠田の摘発）。
       これは限りの引き上げに比べれば小さい。 */
    const 元禄 = c.kokuGen || Math.round(c.koku * 2.051);
    c.kokuCap = Math.max(c.kokuCap || c.kokuMax, 元禄);
    const 隠田 = Math.round(Math.min(c.kokuMax - c.koku, c.koku * 0.03 * clamp(skill, 0.5, 1.2)));
    c.koku = Math.max(c.koku, c.koku + Math.max(0, 隠田));
    c.kokuMax = Math.max(c.kokuMax, c.koku);
    c.pop = Math.round(c.pop * 1.04);
    c.min = clamp(c.min - 9, 0, 100);                  // 民は苦しむ
    after += c.koku;
  }
  s.kenchi = [...(s.kenchi || []), kuni];
  return { cs, before, after, gain: after - before };
}


// その国のうち、その家が握っている割合
export function provinceGrip(s, fid, kuni) {
  const cs = s.castles.filter((c) => c.kuni === kuni);
  if (!cs.length) return 1;
  return cs.filter((c) => c.faction === fid).length / cs.length;
}

// 位階。五畿を制すれば高官、さらに関東まで及べば将軍。
export function courtRank(s, fid) {
  const gokinai = GOKINAI.every((k) => holdsProvince(s, fid, k));
  if (!gokinai) return null;
  const kanto = KANTO_KEY.every((k) => holdsProvince(s, fid, k));
  const n = s.castles.filter((c) => c.faction === fid).length;
  if (kanto) return { key: "征夷大将軍", desc: "幕府を開き、天下に号令する",
    troop: 1.45, diplo: 22, prestige: 30 };
  if (n >= 40) return { key: "内大臣", desc: "五畿を制し、朝廷より内大臣に叙せられた",
    troop: 1.3, diplo: 16, prestige: 22 };
  return { key: "右大臣", desc: "五畿を制し、朝廷より右大臣に叙せられた",
    troop: 1.22, diplo: 12, prestige: 16 };
}

export const rankBonus = (s, fid) => courtRank(s, fid) || { troop: 1, diplo: 0, prestige: 0 };

