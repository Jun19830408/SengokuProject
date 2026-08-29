import { findPath } from "../core/paths.js";
import { atPeace, relKey, 軍の道 } from "../core/state.js";
import { clamp } from "../core/util.js";

/* ------------------------------------------------- 家の方針（GDD 13.2）
   隣を手当たり次第に攻めるだけでは、天下の形が動かない。
   家ごとに気性と狙いを持たせ、伸びる方角と敵と見る家を定める。 */
export const AI_TEMPER = ["進取", "堅実", "old", "陰謀"];   // old は互換のため残す

export function factionTemper(fid) {
  // 家の名から気性を決める（同じ家は常に同じ気性）
  let h = 0;
  for (let i = 0; i < fid.length; i++) h = (h * 31 + fid.charCodeAt(i)) >>> 0;
  return ["進取", "堅実", "陰謀"][h % 3];
}

// 家の狙い。もっとも与しやすく、実りの多い相手を選ぶ。
//
// 数え方は元のままである。ただし、城ごと・家ごとに変わらぬ数（守兵の数、
// 相手方の総兵力、和睦しているか）を、そのつど武将八百余名を数え直して
// 求めていた。城二百四十九 × 自城の数だけ繰り返すので、月送りの大半を
// ここに費やしていた。同じ数は一度だけ数え、控えておく。
export function factionAim(s, fid) {
  const mine = s.castles.filter((c) => c.faction === fid);
  if (!mine.length) return null;

  // 武将を「在る城ごと」「仕える家ごと」に一度だけ束ねる
  const 城の兵 = new Map();          // 城id → その城に在る直属家臣団の総数
  const 家の兵 = new Map();          // 家id → その家の直属家臣団の総数
  for (const x of s.generals) {
    if (x.captive) continue;
    家の兵.set(x.faction, (家の兵.get(x.faction) || 0) + x.retinue);
    if (x.at != null && x.faction != null) {
      const k = `${x.at}|${x.faction}`;
      城の兵.set(k, (城の兵.get(k) || 0) + x.retinue);
    }
  }
  // 家ごとの地の兵（城に置かれた地域家臣団）
  const 家の地兵 = new Map();
  for (const c of s.castles) 家の地兵.set(c.faction, (家の地兵.get(c.faction) || 0) + c.local);

  const myMen = mine.reduce((a, c) => a + c.local, 0) + (家の兵.get(fid) || 0);

  // 相手の家ごとに一度だけ定まるもの
  const 家の控え = new Map();
  const 家を見る = (f) => {
    let v = 家の控え.get(f);
    if (v) return v;
    const theirMen = (家の地兵.get(f) || 0) + (家の兵.get(f) || 0);
    v = {
      和睦: atPeace(s, fid, f),
      grudge: (() => { const rel = s.relations[relKey(fid, f)]; return rel ? (60 - rel.trust) / 60 : 0.4; })(),
      weak: clamp(1.6 - theirMen / Math.max(1, myMen), 0, 1.6),
    };
    家の控え.set(f, v);
    return v;
  };

  const best = { score: -1e9, target: null, from: null };
  for (const c of mine) {
    for (const t of s.castles) {
      if (t.faction === fid) continue;
      // 他家の領を素通りしては攻められない（GDD 7.1）
      const path = 軍の道(s, fid, c.id, t.id);
      if (!path) continue;
      const 相手 = 家を見る(t.faction);
      if (相手.和睦) continue;
      const foe = t.local + (城の兵.get(`${t.id}|${t.faction}`) || 0);
      const worth = t.koku / 20000 + t.comm / 40;                 // 実り
      const ease = clamp(myMen / Math.max(1, foe * 1.3), 0, 2.4);  // 与しやすさ
      const far = path.length;                                    // 遠さ
      // 弱った家には諸家が寄ってたかる。これがないと敗者も生き延び、天下が凍る。
      // 遠国を望むより、まず隣を切り取るのが常道である
      const score = worth * 1.1 + ease * 1.8 + 相手.grudge * 1.2 + 相手.weak * 2.2 - (far - 1) * 1.6;
      if (score > best.score) { best.score = score; best.target = t.id; best.from = c.id; }
    }
  }
  return best.target ? best : null;
}

// 方針を月ごとに見直す
export function reviewAim(s, fid) {
  const f = s.factions[fid];
  f.temper = f.temper || factionTemper(fid);
  const aim = factionAim(s, fid);
  if (!aim) { f.aim = null; return; }
  // 進取は狙いをよく変え、堅実は据える。陰謀は調略を先に行う。
  const stick = f.temper === "堅実" ? 0.85 : f.temper === "進取" ? 0.45 : 0.65;
  if (f.aim && f.aim.target && Math.random() < stick) {
    const t = s.castles.find((c) => c.id === f.aim.target);
    if (t && t.faction !== fid && !atPeace(s, fid, t.faction)) return;   // 狙いを保つ
  }
  f.aim = { target: aim.target, from: aim.from, score: aim.score };
}

