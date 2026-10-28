import { findPath, nodeById, roadBetween, 蝦夷の重み } from "./paths.js";
import { MARCH_PER_MONTH, ROAD_SPEED } from "../data/roads.js";
import { 同じ旗の下 } from "./state.js";

/* ==========================================================================
   城攻めの盤に現れる後詰（GDD 9.2 / 9.4）

   遊ぶ側の申し出は「イ（後詰）とハ（囲みの輪）は入れたい」であった。案の中身は
   「今月着く後詰は、城攻めの何日目・何刻に、来た方角の盤の端から現れる。城方は
   呼応して打って出る」である。

     選ぶ軍 … 囲まれた城を救いに向かっている軍。後詰の印（relief）のある軍か、
              城の身内（自家と旗の下の家）がその城を目指している軍。寄せ手の身内は除く。
              集結を待っている軍（待ち合わせ）は足を止めているので、間に合わない
     近さ   … 残りの道のりが、ひと月の行軍（兵糧が尽きていれば半ば。govern/month.js の
              行軍と同じ数え方）の内にあるもの。それより遠い軍はこの城攻めには間に合わず、
              これまでどおり月送りで着いて、囲みを衝く野戦になる
     着く刻 … 残りの道のりの割（〇〜一）を城攻めの三日に割り当てる。
              〇.三ならおよそ一日目の終わり、〇.九なら三日目の昼すぎ。
              城が先に落ちるか、寄せ手が陣を払えば、後詰はこの盤には間に合わない
     来る方 … 地図の上で、城から見て後詰が最後に通る宿の向き。城攻めの盤は、寄せ手の
              来た向きを南に据えるので、後詰の向きも同じだけ回して盤の端に置く。
              寄せ手と同じ方から来れば、寄せ手の背を衝く形になる
   ========================================================================== */

/* 残りの道のり（月送りの行軍と同じ尺）。いまの区間は進んだぶんを引く */
export function 残りの道のり(a) {
  const p = (a && a.path) || [];
  let d = 0;
  for (let i = 0; i + 1 < p.length; i++) {
    const r = roadBetween(p[i], p[i + 1]);
    const need = (r ? r[2] : 10) / ROAD_SPEED[r ? r[3] : "街道"] * 蝦夷の重み(a.faction, p[i], p[i + 1]);
    d += i === 0 ? need * (1 - (a.prog || 0)) : need;
  }
  return d;
}

/* ひと月に進める道のり（govern/month.js の行軍と同じ。兵糧が尽きていれば半ば） */
export const ひと月の道のり = (a) => MARCH_PER_MONTH * ((a && a.food > 0) ? 1 : 0.5);

/* 地図の上の向き（城から点へ）。点が見つからなければ null */
function 向き(城id, 点id) {
  const c = nodeById(城id), p = nodeById(点id);
  if (!c || !p || (c.x === p.x && c.y === p.y)) return null;
  return Math.atan2(p.y - c.y, p.x - c.x);
}

/* 八方の名（盤の上の角から）。盤は下が南 */
export function 方の名(角) {
  const 名 = ["東", "南東", "南", "南西", "西", "北西", "北", "北東"];
  const k = Math.round(((角 % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 4)) % 8;
  return 名[k];
}

/* 着く日と刻。割（〇〜一）を三日に割り当てる。刻は日のうちの割（〇.〇八〜〇.八五に収める
   ――夜明けすぐや日暮れ間際に着いても、盤の上ではすぐ夜になって戦にならない） */
export function 着く日と刻(割, 日数 = 3) {
  const x = Math.max(0, Math.min(0.999, 割)) * 日数;
  const 日 = Math.min(日数, 1 + Math.floor(x));
  const 刻 = Math.max(0.08, Math.min(0.85, x - (日 - 1)));
  return { 日, 刻 };
}

/* この城攻めの盤に現れる後詰を選ぶ。返すのは
   { 軍, 割, 日, 刻, 角（盤の上の角）, 方（八方の名） } の並び（着く早い順） */
export function 盤に来る後詰(s, castle, 寄せ手, 日数 = 3) {
  if (!s || !castle || !寄せ手) return [];
  /* 寄せ手の来た向き。寄せ手は着いているので道は残っていない。出陣元からの道の、
     城の一つ手前の宿で測る（盤の南はこの向きである） */
  const 寄道 = 寄せ手.from ? findPath(寄せ手.from, castle.id) : null;
  const 寄前 = 寄道 && 寄道.length >= 2 ? 寄道[寄道.length - 2] : 寄せ手.from;
  const 寄角 = 向き(castle.id, 寄前);
  const 出 = [];
  for (const a of s.armies || []) {
    if (!a || a.id === 寄せ手.id || a.dead || !(a.men > 0)) continue;
    if (!a.path || a.path.length < 2 || a.path[a.path.length - 1] !== castle.id) continue;   // まだ道中で、この城を目指している
    if (a.sieging || a.待ち合わせ) continue;
    const 救う = a.relief === castle.id || (a.target === castle.id && 同じ旗の下(s, a.faction, castle.faction));
    if (!救う) continue;
    if (a.faction === 寄せ手.faction || 同じ旗の下(s, a.faction, 寄せ手.faction)) continue;
    const 残 = 残りの道のり(a), 月 = ひと月の道のり(a);
    if (!(月 > 0) || 残 > 月) continue;
    const 割 = 残 / 月;
    const 前 = a.path[a.path.length - 2];
    const 後角 = 向き(castle.id, 前);
    /* 盤の南（π/2）が寄せ手の向き。後詰の向きを、寄せ手の向きとの差だけ回す。
       向きが分からなければ、寄せ手の背（南）から来るものとする */
    const 角 = Math.PI / 2 + (後角 != null && 寄角 != null ? 後角 - 寄角 : 0);
    const { 日, 刻 } = 着く日と刻(割, 日数);
    出.push({ 軍: a, 割, 日, 刻, 角, 方: 方の名(角) });
  }
  return 出.sort((x, y) => x.割 - y.割);
}
