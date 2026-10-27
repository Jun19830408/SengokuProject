import { GUN } from "../data/gun.js";
import { castellanOf, 城を守る将 } from "./rank.js";
import { px, py } from "../data/geo.js";
import { 郡の境 } from "../data/gunkyou.js";

/* ==========================================================================
   郡（郡の導入の段階一）

   国と城のあいだに郡を置く。いまは見せるだけで、年貢にも兵にも響かせない。
   遊ぶ側の申し出は、郡を「城の石高の内訳」として扱い、郡の一覧と、地図の上の
   郡の名とを出すことであった。郡代の役は次の段で置く。

   郡は城に従う。城のある郡はその城に、城のない郡は同じ国でいちばん近い城に
   属させてある（data/gun.js）。城が落ちれば、属する郡もそのまま移る。
   蝦夷・琉球は郡の拠り所が無いので、城を最小の単位とする。
   ========================================================================== */

const 城ごと = new Map();
for (const x of GUN) {
  if (!城ごと.has(x.城)) 城ごと.set(x.城, []);
  城ごと.get(x.城).push(x);
}

// 城に属する郡（城のある郡を先に、村の多い順）
export const 城の郡ら = (城id) => 城ごと.get(城id) || [];

/* 地図の上の郡の地点（村の経度・緯度の中央の値を盤の座標に直したもの）。
   城ごとに分けた郡は、分ける前の名で出す。同じ名が二つ並んでも、位置で見分けがつく。
   名が重なるときは大きな郡を先に置くので、村の多い順に並べておく。 */
export const 郡の地点ら = GUN.map((x) => ({ 郡: x, x: px(x.lon), y: py(x.lat), 名: x.元 || x.名 }))
  .sort((a, b) => b.郡.村 - a.郡.村);

/* 郡の境の目安の線（盤の座標）。読み込みのときに一度だけ解く。
   村の点から引いた目安であって、まことの郡境ではない（data/gunkyou.js）。
   国境は地形の絵にあるので、ここにあるのは同じ国の中の郡の境だけである。
   同じ郡を城ごとに分けた所（新川郡の富山と松倉など）は、分け目として見分ける。 */
export const 郡の境の線ら = 郡の境.split("|").map((t) => {
  const n = t.split(" ").map(Number);
  const ps = [];
  let x = n[2], y = n[3];
  ps.push(x / 2, y / 2);
  for (let i = 4; i < n.length; i += 2) { x += n[i]; y += n[i + 1]; ps.push(x / 2, y / 2); }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < ps.length; i += 2) {
    x0 = Math.min(x0, ps[i]); x1 = Math.max(x1, ps[i]); y0 = Math.min(y0, ps[i + 1]); y1 = Math.max(y1, ps[i + 1]);
  }
  const A = GUN[n[0]], B = GUN[n[1]];
  return { ps, x0, y0, x1, y1, 分け目: !!(A && B && A.元 && A.元 === B.元) };
});

/* 郡の石高。城の石高を、郡の幕末の石高（村高の和）の比で割り振った目安である。
   丸めの端数は、城のいちばん大きな郡に寄せる。内訳の和が城の石高と合わねば、
   帳を読む側が戸惑う。 */
export function 郡の石高ら(c) {
  const 郡 = 城の郡ら(c ? c.id : null);
  if (!c || !郡.length) return [];
  const 高 = 郡.map((x) => Math.round(c.koku * x.割));
  let 大 = 0;
  for (let i = 1; i < 郡.length; i++) if (郡[i].割 > 郡[大].割) 大 = i;
  高[大] += Math.round(c.koku) - 高.reduce((a, b) => a + b, 0);
  return 郡.map((x, i) => ({ 郡: x, 石高: 高[i] }));
}

/* 郡を治める者。郡代の役はまだ無いので、城主がその城のすべての郡を兼ねる。
   城代しか置いていなければ城代が兼ねる。城主が出陣していれば、留守を預かる者も
   添える（城の帳の「城主」の欄と同じ見立てである）。 */
export function 郡の治め手(g, c) {
  if (!c) return null;
  const 者 = castellanOf(g, c);
  if (!者) return { 者: null, 役: null, 留守: null };
  return {
    者,
    役: c.城代 ? "城代" : "城主",
    留守: 者.at !== c.id ? 城を守る将(g, c) : null,
  };
}
