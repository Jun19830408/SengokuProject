// 目方を測り、仕来りを確かめるための取り出し口。画面を描かずに月送りだけを回す。
import { advanceMonth } from "../src/govern/month.js";
import { resolveClashOffscreen, resolveOffscreen } from "../src/govern/war.js";

export { initState } from "../src/core/state.js";
export { advanceMonth } from "../src/govern/month.js";
export { checkUnified } from "../src/govern/unify.js";
export { resolveClashOffscreen, resolveOffscreen } from "../src/govern/war.js";
// 仕来りの確かめに使う。画面を通さずに可否だけを問う。
export { captiveRecruit } from "../src/core/capture.js";
export { withdrawArmy, homeFor, restoreStrays } from "../src/govern/war.js";

/* 画面のない一月。
   月送りのあと、その月に着いた軍の始末をつけるところまでを一つにまとめる。
   画面のある側（MapScreen）では、着いた軍を一つずつ取り出して解いている。
   見物（autoPlay）のときと同じ道筋をここで辿る。 */
export function 画面なしの一月(s) {
  let st = advanceMonth(s, s);
  let 番 = 0;
  // 街道での行き合いは、城攻めより先に決する
  while (st.clashes && st.clashes.length && 番++ < 200) st = resolveClashOffscreen(st);
  番 = 0;
  while (st.pendingArrivals && st.pendingArrivals.length && 番++ < 400) {
    const id = st.pendingArrivals[0];
    const a = st.armies.find((x) => x.id === id);
    const dest = a && st.castles.find((c) => c.id === a.at);
    if (!a || !dest) { st = { ...st, pendingArrivals: st.pendingArrivals.slice(1) }; continue; }
    st = resolveOffscreen(st, a.id, dest.id);
  }
  return st;
}
