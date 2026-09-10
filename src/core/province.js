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

/* その家の旗の下にあるか（自家・臣従）。位階と惣無事令はこの数え方で見る。
   従属は貢を納めるだけの間柄であって、旗の下に完全に入ってはいない。 */
export const 旗の下か = (s, fid, other) => {
  if (fid === other) return true;
  const r = (s.relations || {})[[fid, other].sort().join("|")];
  return !!r && r.state === "臣従" && r.master === fid;
};

/* その国を旗の下に収めているか（自家＋臣従の城で満たしているか）。 */
export const 国を旗の下に = (s, fid, kuni) => {
  const cs = s.castles.filter((c) => c.kuni === kuni);
  return cs.length > 0 && cs.every((c) => 旗の下か(s, fid, c.faction));
};

/* 旗の下（従属も含む）に置く城の数。三割の目安はこれで数える。 */
export const 旗の下の城数 = (s, fid) => s.castles.filter((c) => {
  if (c.faction === fid) return true;
  const r = (s.relations || {})[[fid, c.faction].sort().join("|")];
  return !!r && (r.state === "臣従" || r.state === "従属") && r.master === fid;
}).length;

/* 天下人の目安（GDD 12.5）。

   秀吉の直轄は二百二十万石であった。全国千八百五十万石に対して一割二分にあたる。
   絶対の石高で言うと、年を追うごとに易しくなる――竿を入れ、田を拓くので、
   盤の全国石高は二十五年で千二百五十八万石から千九百二十四万石へ膨らむ。
   実測では、絶対値で二百万石としたなら十年目に通ってしまう。割合で言う。 */
export const 天下人の直轄 = 0.12;                  // 直轄が全国石高に占める割合
export const 天下人の版図 = 0.30;                  // 旗の下（従属を含む）が全城に占める割合

/* 位階（GDD 12.5）。

   五畿を制した者が天下人である。これは古来の見立てであって、盤でもそれに倣う。

   秀吉は征夷大将軍になれなかった。源氏ではなかったからで、代わりに関白を取り、
   それで天下に号令した。家康は源氏を名乗って幕府を開いた。ゆえに天下への道は
   二筋ある――関白の道と、将軍の道である。号令はどちらでも通る。

     右大臣　　… 五畿を旗の下に（自家と臣従で満たせばよい）
     内大臣　　… 加えて四十城
     関白　　　… 加えて直轄が全国の一割二分・旗の下が全城の三割
     征夷大将軍… 加えて相模・武蔵を旗の下に

   四割としなかったのは、測ったからである。最大の勢力は三十年で三割六分五厘、
   四十年で三割七分三厘までしか伸びない。四割では幕府が永久に開かず、号令が
   一度も使えないままになる。 */
export function courtRank(s, fid) {
  const gokinai = GOKINAI.every((k) => 国を旗の下に(s, fid, k));
  if (!gokinai) return null;
  const n = s.castles.filter((c) => c.faction === fid).length;
  const 全国石高 = s.castles.reduce((a, c) => a + c.koku, 0);
  const 直轄 = s.castles.filter((c) => c.faction === fid).reduce((a, c) => a + c.koku, 0);
  /* 一度得た位は、少々の目減りでは落ちない（GDD 12.5）。

     全国石高は竿を入れ田を拓くたびに増える。関門を割合で置いてあるので、
     何も失っていないのに足下から関門が迫り上がってくる――実際、直轄百五十四万石
     のまま一月を送っただけで関白が右大臣に落ちた。位を保つ関門は、得るときより
     一割ほど低くする。上がるのは難く、落ちるのは易い、では官位の意味がない。 */
  const 既 = (s.courtRanks || {})[fid];
  const 保 = 既 === "関白" || 既 === "征夷大将軍" ? 0.9 : 1;
  const 天下人 = 直轄 >= 全国石高 * 天下人の直轄 * 保
    && 旗の下の城数(s, fid) >= s.castles.length * 天下人の版図 * 保;
  if (天下人) {
    const kanto = KANTO_KEY.every((k) => 国を旗の下に(s, fid, k));
    if (kanto) return { key: "征夷大将軍", desc: "幕府を開き、天下に号令する",
      troop: 1.45, diplo: 22, prestige: 30, 号令: true };
    return { key: "関白", desc: "関白に任ぜられ、天下に号令する",
      troop: 1.38, diplo: 20, prestige: 26, 号令: true };
  }
  if (n >= 40) return { key: "内大臣", desc: "五畿を制し、朝廷より内大臣に叙せられた",
    troop: 1.3, diplo: 16, prestige: 22 };
  return { key: "右大臣", desc: "五畿を制し、朝廷より右大臣に叙せられた",
    troop: 1.22, diplo: 12, prestige: 16 };
}

/* 天下に号令できるか。関白か征夷大将軍のみ。 */
export const 号令できるか = (s, fid) => !!(courtRank(s, fid) || {}).号令;

export const rankBonus = (s, fid) => courtRank(s, fid) || { troop: 1, diplo: 0, prestige: 0 };

