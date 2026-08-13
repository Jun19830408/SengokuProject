

/* ------------------------------------------------------- 天下の趨勢
   統一とは、すべての城を自ら握ることだけではない。
   従属させ、臣従を受けた家もまた、その旗の下にある。 */
// 主従の表を組む。石高の大きいほうを主とする。
function 主従の表(s) {
  const koku = {};
  for (const c of s.castles) koku[c.faction] = (koku[c.faction] || 0) + c.koku;
  const under = {};                                  // 主 → 従の一覧
  for (const k of Object.keys(s.relations)) {
    const r = s.relations[k];
    if (r.state !== "従属" && r.state !== "臣従") continue;
    const [a, b] = k.split("|");
    const master = (koku[a] || 0) >= (koku[b] || 0) ? a : b;
    const vassal = master === a ? b : a;
    (under[master] = under[master] || []).push(vassal);
  }
  return under;
}

// 一つの家の旗の下にある家を辿る。従属の従属もまた旗の下にある。
function 旗を辿る(under, fid) {
  const set = new Set([fid]);
  const stack = [fid];
  while (stack.length) {
    const x = stack.pop();
    for (const v of under[x] || []) if (!set.has(v)) { set.add(v); stack.push(v); }
  }
  return set;
}

export function underBanner(s, fid) {
  return 旗を辿る(主従の表(s), fid);
}

// 天下が定まったか。旗の下にすべての城が入れば統一である。
export function checkUnified(s) {
  const alive = [...new Set(s.castles.map((c) => c.faction))];
  // 主従の表は家ごとに変わらぬ。百家ぶん組み直していたのを、一度で済ませる。
  const under = 主従の表(s);
  for (const fid of alive) {
    const banner = 旗を辿る(under, fid);
    if (s.castles.every((c) => banner.has(c.faction))) {
      const vassals = [...banner].filter((x) => x !== fid);
      // 統一の質。直に治めた城が多いほど、真の天下人である。
      const mine = s.castles.filter((c) => c.faction === fid).length;
      const grade = alive.length === 1 ? "一統"
        : mine / s.castles.length >= 0.7 ? "大成"
        : mine / s.castles.length >= 0.45 ? "覇" : "旗下";
      return { fid, direct: alive.length === 1, vassals, grade,
        mine, total: s.castles.length };
    }
  }
  return null;
}

