import { 守備隊の統率 } from "./rank.js";

/* ==========================================================================
   城門の割り付け（GDD 9.3）

   城攻めが始まるとき、どの門に誰を置き、兵をどう分けるかを決める。
   遊ぶ側はこれを手で組み替えられる。采配（敵方）は下の案をそのまま使う。

   案の立て方は単純である。
     ・外の輪の門ほど厚く（先に当たるのはそこである）
     ・大手門は搦手より厚く（寄せ手はたいてい大手から来る）
     ・将は器量の高い順に、厚い門から
     ・将の足りぬ門は守備隊が守る
   ========================================================================== */

export const 門の重み = (gt) => (gt.layer === 0 ? 3.6 : gt.layer === 1 ? 1.5 : 0.85)
  * (gt.face === "S" ? 1.3 : gt.face === "N" ? 1.0 : 0.85);

export function 守りの割り付け(s, castle, gates) {
  const 順 = [...gates].sort((a, b) => a.layer - b.layer || 門の重み(b) - 門の重み(a));
  const 将 = s.generals
    .filter((x) => x.at === castle.id && x.faction === castle.faction && !x.captive)
    .sort((a, b) => (b.lead * 1.4 + b.valor) - (a.lead * 1.4 + a.valor));
  const 兵 = Math.max(0, Math.round(castle.local));
  const 重 = 順.map(門の重み);
  const 和 = 重.reduce((a, x) => a + x, 0) || 1;
  const 門 = {};
  let 残 = 兵;
  順.forEach((gt, i) => {
    const n = i === 順.length - 1 ? 残 : Math.min(残, Math.round(兵 * 重[i] / 和));
    残 -= n;
    門[gt.key] = { genId: 将[i] ? 将[i].id : null, men: Math.max(0, n) };
  });
  const 本丸 = {};
  for (let i = 順.length; i < 将.length; i++) 本丸[将[i].id] = 0;   // 余った将は本丸に控える
  return { 門, 本丸, 統: 守備隊の統率(s, castle) };
}

// 割り付けの兵の総和（帳の上で城兵と突き合わせる）
export const 割り付けの兵 = (割) => {
  if (!割) return 0;
  let n = 0;
  for (const k in (割.門 || {})) n += Math.max(0, Math.round(割.門[k].men || 0));
  for (const k in (割.本丸 || {})) n += Math.max(0, Math.round(割.本丸[k] || 0));
  return n;
};
