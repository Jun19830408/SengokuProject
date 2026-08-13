import { ARMS } from "../data/roads.js";

/* ------------------------------------------------------- 組の名簿（GDD 6.2）
   武将の直属も地域家臣団も、五十人組の名簿として持つ。
   合戦の損害はこの名簿に書き戻され、補充されない限り欠けたまま次の戦へ持ち越す。 */
export let ROSTER_SEQ = 0;

export function newRoster(total, tag) {
  const r = [];
  for (const a of ARMS) {
    let men = Math.round(total * a.ratio);
    while (men > 0) {
      const m = Math.min(50, men);
      r.push({ id: `${tag}-${++ROSTER_SEQ}`, t: a.key, m, max: 50 });
      men -= m;
    }
  }
  return r;
}

export const rosterSum = (r) => (r || []).reduce((a, q) => a + q.m, 0);

// 兵を足す。まず欠けた組を埋め、それでも余れば新しい組を立てる。
export function rosterAdd(r, n, tag) {
  if (!r || n <= 0) return r || [];
  let left = Math.round(n);
  for (const a of ARMS) {
    const want = Math.round(n * a.ratio);
    let give = want;
    for (const q of r) {
      if (give <= 0) break;
      if (q.t !== a.key || q.m >= q.max) continue;
      const add = Math.min(q.max - q.m, give);
      q.m += add; give -= add; left -= add;
    }
    while (give > 0) {
      const m = Math.min(50, give);
      r.push({ id: `${tag}-${++ROSTER_SEQ}`, t: a.key, m, max: 50 });
      give -= m; left -= m;
    }
  }
  if (left > 0) for (const q of r) { if (left <= 0) break; const add = Math.min(q.max - q.m, left); q.m += add; left -= add; }
  return r;
}

// 兵を減らす。人数の少ない組から消していく。
export function rosterCut(r, n) {
  let left = Math.round(n);
  const order = [...r].sort((a, b) => a.m - b.m);
  for (const q of order) {
    if (left <= 0) break;
    const take = Math.min(q.m, left);
    q.m -= take; left -= take;
  }
  return r.filter((q) => q.m > 0);
}

// 名簿から n 人ぶんを切り分けて持ち出す（出陣・寄騎）
export function rosterTake(src, n) {
  const out = [];
  let left = Math.round(n);
  // 充実した組から順に連れて行く
  const order = [...src].sort((a, b) => b.m - a.m);
  for (const q of order) {
    if (left <= 0) break;
    if (q.m <= left) { out.push({ id: q.id, t: q.t, m: q.m, max: q.max }); left -= q.m; q.m = 0; }
    else { out.push({ id: q.id + "b", t: q.t, m: left, max: q.max }); q.m -= left; left = 0; }
  }
  const rest = src.filter((q) => q.m > 0);
  return { taken: out, rest };
}

// 名簿を保つ。総数と食い違っていれば辻褄を合わせる。
export function rosterSync(holder, key, total, tag) {
  if (!holder[key] || !holder[key].length) holder[key] = newRoster(Math.max(0, total), tag);
  const d = Math.round(total) - rosterSum(holder[key]);
  if (d > 0) rosterAdd(holder[key], d, tag);
  else if (d < 0) holder[key] = rosterCut(holder[key], -d);
  return holder[key];
}

