import { ARMS } from "../data/roads.js";

/* ------------------------------------------------------- 組の名簿（GDD 6.2）
   武将の直属も地域家臣団も、五十人組の名簿として持つ。
   合戦の損害はこの名簿に書き戻され、補充されない限り欠けたまま次の戦へ持ち越す。 */
export let ROSTER_SEQ = 0;

/* 五十人組の名簿を作る。

   mix を渡せば、その兵科の割り（一割きざみの百分率）で組を立てる。
   渡さなければ、これまで通り ARMS の定めの割りになる。
   隊の強さは兵科で変わる（騎馬は槍より白兵に強く、弓鉄砲は遠くへ届く）ので、
   割りを変えれば、そのまま盤の上の駒の形も戦い方も変わる。 */
export function 兵科の割り(mix) {
  if (!mix) return ARMS;
  const 和 = ARMS.reduce((a, x) => a + Math.max(0, mix[x.key] || 0), 0);
  if (和 <= 0) return ARMS;
  return ARMS.map((x) => ({ ...x, ratio: Math.max(0, mix[x.key] || 0) / 和 }));
}

/* 城の蓄えで、その兵科をどこまで立てられるか（GDD 6.3）。

   槍と弓は村々の百姓が自前で携えて出るので、いくらでも立つ。
   騎馬は馬が、鉄砲は鉄砲がなければ立たない。
   割りをそのまま呑めぬときは、足りぬぶんを槍に振り替える。 */
export function 蓄えに合わせる(mix, 人数, 蓄え) {
  const m = { yari: 0, yumi: 0, teppo: 0, kiba: 0, ...(mix || {}) };
  const 和 = ["yari", "yumi", "teppo", "kiba"].reduce((a, k) => a + Math.max(0, m[k]), 0) || 1;
  const 人 = (k) => Math.round(人数 * Math.max(0, m[k]) / 和);
  const 馬 = Math.max(0, Math.floor((蓄え && 蓄え.horse) || 0));
  const 砲 = Math.max(0, Math.floor((蓄え && 蓄え.gun) || 0));
  const 騎 = Math.min(人("kiba"), 馬);
  const 鉄 = Math.min(人("teppo"), 砲);
  const 弓 = 人("yumi");
  const 槍 = Math.max(0, 人数 - 騎 - 鉄 - 弓);      // 足りぬぶんは槍が埋める
  return { yari: 槍, yumi: 弓, teppo: 鉄, kiba: 騎,
    足りぬ馬: Math.max(0, 人("kiba") - 騎), 足りぬ鉄砲: Math.max(0, 人("teppo") - 鉄) };
}

// 名簿に含まれる兵科ごとの人数
export function rosterArms(rost) {
  const out = { yari: 0, yumi: 0, teppo: 0, kiba: 0 };
  for (const q of rost || []) if (out[q.t] != null) out[q.t] += q.m;
  return out;
}

export function newRoster(total, tag, mix) {
  const r = [];
  for (const a of 兵科の割り(mix)) {
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

