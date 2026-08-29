import { CASTLES, TOWNS } from "../data/castles.js";
import { px, py } from "../data/geo.js";
import { MARCH_PER_MONTH, ROADS, ROAD_SPEED } from "../data/roads.js";

export const NODES = {};

// 町を先に入れ、城で上書きする。
// 同じ名を持つ町と城があっても、街道の端点は必ず城でなければならない。
for (const t of TOWNS) NODES[t.id] = { ...t, x: px(t.lon), y: py(t.lat), type: "town" };
for (const c of CASTLES) NODES[c.id] = { ...c, x: px(c.lon), y: py(c.lat), type: "castle" };
export function nodeById(id) { return NODES[id]; }


// 街道の繋がりは変わらないので、隣り合う城の表を一度だけ作る。
// 城が二百を超えると、毎回すべての街道を走査していては月送りが重くなる。
export const ROAD_ADJ = (() => {
  const m = {};
  for (const [a, b] of ROADS) {
    (m[a] = m[a] || []).push(b);
    (m[b] = m[b] || []).push(a);
  }
  return m;
})();

export const PATH_CACHE = new Map();

export const ROAD_MAP = (() => {
  const m = {};
  for (const r of ROADS) { m[`${r[0]}|${r[1]}`] = r; m[`${r[1]}|${r[0]}`] = r; }
  return m;
})();

// 一つの城から、他のすべての城への道筋を一度に求めて控えておく。
// 道は区間の数ではなく、かかる日数で選ぶ。
// 険しい山道を一区間で越えるより、平らな街道を三区間辿るほうが早い。
//
// もとは行き先ごとに一から辿り直していた。城が二百四十九もあるため、
// 六万通りの道をそれぞれ一から辿ることになり、月送りが重くなっていた。
// 出発地ごとに一度辿れば、その先はすべて分かる。道筋そのものは変わらない。
const TREE_CACHE = new Map();
function pathTree(from) {
  const got = TREE_CACHE.get(from);
  if (got) return got;
  const cost = new Map([[from, 0]]), prev = new Map([[from, null]]);
  const seen = new Set();
  // 費用の小さい順に取り出す。城が二百を超えるので、毎回すべてを見比べては遅い。
  const heap = [[0, from]];
  const push = (c2, id) => {
    heap.push([c2, id]);
    let i = heap.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (heap[par][0] <= heap[i][0]) break;
      [heap[par], heap[i]] = [heap[i], heap[par]]; i = par;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r2 = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r2 < heap.length && heap[r2][0] < heap[m][0]) m = r2;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [best, cur] = pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const nxt of ROAD_ADJ[cur] || []) {
      const r = ROAD_MAP[`${cur}|${nxt}`];
      const d = best + (r ? r[2] / (ROAD_SPEED[r[3]] || 1) : 20);
      if (!cost.has(nxt) || d < cost.get(nxt)) { cost.set(nxt, d); prev.set(nxt, cur); push(d, nxt); }
    }
  }
  const tree = { cost, prev };
  TREE_CACHE.set(from, tree);
  return tree;
}

export function findPath(from, to) {
  const key = `${from}>${to}`;
  if (PATH_CACHE.has(key)) return PATH_CACHE.get(key);
  const { cost, prev } = pathTree(from);
  let out = null;
  if (cost.has(to)) {
    out = [];
    for (let x = to; x != null; x = prev.get(x)) out.unshift(x);
  }
  PATH_CACHE.set(key, out);
  return out;
}


export const roadBetween = (a, b) => ROAD_MAP[`${a}|${b}`];

/* 通れる所だけを通る道を探す（GDD 7.1）。

   「吉田郡山城から月山富田城へ攻めようとしたが、街道が繋がって見えるのに
     出陣先に出てこない」との報せ。調べたところ、二つの城は難所（八十九里）で
     直に結ばれているのに、findPath は安いほうの道――山吹城・白鹿城を経る
     街道――を返していた。その二城は尼子のものであるから、
     「途中の城がすべて味方か同盟でなければ通れない」という決まりに引っかかる。
     直の道があるのに、通れないと判ぜられていた。

   全国を検めると、城どうしを直に結ぶ街道四百四十四本のうち、二十九本で
   findPath が迂回していた。難所と山道と海路――つまり「近いが険しい道」である。
   険しいからこそ迂回路のほうが安いのだが、通れるかどうかは別の話である。

   いちばん安い道を探してから通れるかを問うのでは順が逆である。
   はじめから、通れる所だけを通って探す。 */
/* 蝦夷の道は、地元の者だけが速い（GDD 7.1）。

   蝦夷の道は、書かれた距離が実際よりずっと短い。網走と宗谷の間は
   「七十八」と書いてあるが実は二百五十六キロある。石狩と網走で
   「九十六」に対し二百五十一キロ。地図の上で北海道が縮んでいるためで、
   そのぶん蝦夷の行軍は実際の二.五倍ほど速い。

   これを一律に直せば、蝦夷に住む家も一緒に遅くなる。そうではなく、
   蝦夷を知らぬ者だけが手間取るようにする。道なき地を、雪と川と熊を
   越えて進むのである。案内も宿もない。地元の者には勝手の知れた道でも、
   本州から来た軍にとってはそうではない。

   蝦夷に城を持って始まった家（蠣崎とアイヌ三家）は速いまま。それ以外の
   家は、蝦夷の中を進むあいだ二.六倍の日数がかかる。本州を統一した軍でも、
   北海道の統一には手間取る。それが蝦夷の地の利である。 */
const 蝦夷の城 = new Set(CASTLES.filter((c) => c.kuni === "蝦夷").map((c) => c.id));
export const 蝦夷の家 = new Set(CASTLES.filter((c) => c.kuni === "蝦夷").map((c) => c.faction));
export const 蝦夷の重み = (fid, a, b) =>
  // 家を指さずに道のりだけを測るときは、素の長さを返す。
  // 割増は「誰が進むか」の性質であって、道そのものの長さではない。
  (fid && 蝦夷の城.has(a) && 蝦夷の城.has(b) && !蝦夷の家.has(fid) ? 2.6 : 1);

export function findPathVia(from, to, 通れる, 道の可否) {
  if (from === to) return [from];
  if (!通れる && !道の可否) return findPath(from, to);
  const cost = new Map([[from, 0]]);
  const prev = new Map([[from, null]]);
  const seen = new Set();
  const heap = [[0, from]];
  const push = (d, n) => {
    heap.push([d, n]);
    let i = heap.length - 1;
    while (i > 0) {
      const p2 = (i - 1) >> 1;
      if (heap[p2][0] <= heap[i][0]) break;
      [heap[p2], heap[i]] = [heap[i], heap[p2]]; i = p2;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r2 = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r2 < heap.length && heap[r2][0] < heap[m][0]) m = r2;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [best, cur] = pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    if (cur === to) break;
    // 目当ての城そのものは通れずともよい。そこへ攻め入るのだから。
    if (cur !== from && cur !== to && 通れる && !通れる(cur)) continue;
    for (const nxt of ROAD_ADJ[cur] || []) {
      const r = ROAD_MAP[`${cur}|${nxt}`];
      if (道の可否 && !道の可否(r)) continue;     // 通れぬ種の道（水軍に山道など）
      const d = best + (r ? r[2] / (ROAD_SPEED[r[3]] || 1) : 20);
      if (!cost.has(nxt) || d < cost.get(nxt)) { cost.set(nxt, d); prev.set(nxt, cur); push(d, nxt); }
    }
  }
  if (!cost.has(to)) return null;
  const out = [];
  for (let x = to; x != null; x = prev.get(x)) out.unshift(x);
  return out;
}

// その道のりが何か月か。道を渡せば、その道で測る。
export function marchMonthsOf(path, fid) {
  if (!path || path.length < 2) return path ? 1 : null;
  let d = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const r = roadBetween(path[i], path[i + 1]);
    d += (r ? r[2] / ROAD_SPEED[r[3]] : 10) * 蝦夷の重み(fid, path[i], path[i + 1]);
  }
  return Math.max(1, Math.ceil(d / MARCH_PER_MONTH));
}

// 攻めるには、目標の城が自勢力のいずれかの城と街道でつながっていること（領地が隣接）
export function canAttack(g, targetId) {
  const t = g.castles.find((c) => c.id === targetId);
  if (!t || t.faction === g.player) return false;
  return g.castles.some((c) => c.faction === g.player && roadBetween(c.id, targetId));
}

// 到着までの月数。街道の種別で足の速さが変わる。
export function marchMonths(from, to, fid) {
  return marchMonthsOf(findPath(from, to), fid);
}

