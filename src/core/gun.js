import { GUN } from "../data/gun.js";
import { castellanOf, 城を守る将 } from "./rank.js";
import { 城の寄親 } from "./inin.js";
import { clamp } from "./util.js";
import { px, py } from "../data/geo.js";
import { 郡の境 } from "../data/gunkyou.js";

/* ==========================================================================
   郡（郡の導入）

   国と城のあいだに郡を置く。遊ぶ側の申し出は、郡を「城の石高の内訳」として扱い、
   郡の一覧と、地図の上の郡の名とを出すことであった（段階一）。

   郡は城に従う。城のある郡はその城に、城のない郡は同じ国でいちばん近い城に
   属させてある（data/gun.js）。城が落ちれば、属する郡もそのまま移る。
   蝦夷・琉球は郡の拠り所が無いので、城を最小の単位とする。

   段階二で郡代を置く（この書の後半）。
   ========================================================================== */

const 城ごと = new Map();
const 郡ごと = new Map();
for (const x of GUN) {
  if (!城ごと.has(x.城)) 城ごと.set(x.城, []);
  城ごと.get(x.城).push(x);
  郡ごと.set(x.id, x);
}

// 城に属する郡（城のある郡を先に、村の多い順）
export const 城の郡ら = (城id) => 城ごと.get(城id) || [];
export const 郡を引く = (id) => 郡ごと.get(id) || null;

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

/* ------------------------------------------------------- 郡代（段階二）

   遊ぶ側の申し出は二つであった。
     「郡代の任命ができないので、城を取ったときと、通常の政務フェーズにおいて
       人事で任命できるようにしてください」
     「郡代を任命したほうが収入が上がり、郡代の能力が良ければさらに収入が上がる
       仕組みを導入してください」

   決めごと（遊ぶ側と取り決めたもの）
     ・郡代は代官の役である。郡を知行として持つのではない（知行は今のまま城から配る）
     ・城主はその城の郡を兼ねる。郡代を置いた郡だけ、郡代が治める
     ・郡代はその城に属する者から選ぶ（ほかの城の者は、城替えで移してから任じる）
     ・一つの郡に郡代は一人。一人が二つの郡を兼ねることもしない
     ・郡代の役は家督で引き継がない。空けば城主が兼ね、また任じ直す
     ・任じるのは大名。差配を国主・旗頭に預けた城では、空いた郡を寄親が埋める
       （人事は大名の専権なので、大名が任じ直すこともできる）
     ・役の経験は残る（x.郡代歴）。順に役を上がる仕組みはのちの段で使う

   盤には s.郡代 として「郡の id → 郡代の id」を持つ。 */

/* 郡の年貢の割。治める者の政治で年貢が増減する。

     郡代が治める　1.00〜1.10（政治〇で1.00、百で1.10）
     城主が兼ねる　0.90〜1.00（政治〇で0.90、百で1.00）
     城代しかいない城は、兼ねる割をさらに一割減らす
     将のいない城は 0.80

   郡代を置けば、どれほど政治の拙い者でも、城主が兼ねるより下がることはない
   （1.00 は兼ねる割の上限と同じ）。能のある郡代ほど上がる。郡代のいない郡は少し
   下がる――遊ぶ側と取り決めた「郡代がいないと収入は少し下がる」である。

   はじめは兼ねる割を 0.95〜1.05、郡代の割を 1.05〜1.15 としていた。ところが他家は
   月ごとに空いた郡を埋めるので、二年送ると家々の蔵の和が二割六分も膨らんだ
   （年貢が一割増えても扶持は変わらぬので、手残りはその三倍ほど増える）。金の
   溜まり方は以前に整えてあるので、割を一段下げ、郡代を置いた家でもとの年貢と
   釣り合うようにした。 */
export const 郡代の割 = (政) => 1.0 + clamp(政 || 0, 0, 100) / 1000;
export const 兼ねる割 = (政) => 0.9 + clamp(政 || 0, 0, 100) / 1000;
export const 城代の減り = 0.9;
export const 将なしの割 = 0.8;

const 郡の城 = (s, 郡) => (郡 ? (s.castles || []).find((o) => o.id === 郡.城) : null) || null;

/* その郡の郡代。帳にあっても、家が違う・捕らわれた者は郡代とみなさない
   （整えるのは月の頭なので、そのあいだに崩れた者を拾わないため）。 */
export function 郡代の者(s, 郡) {
  const id = 郡 && (s.郡代 || {})[郡.id];
  if (!id) return null;
  const x = (s.generals || []).find((g) => g.id === id);
  const c = 郡の城(s, 郡);
  if (!x || !c || x.captive || x.faction !== c.faction) return null;
  return x;
}

// その者が郡代を務める郡（武将の画面に出す）
export function 郡代の郡(s, genId) {
  for (const [k, v] of Object.entries(s.郡代 || {})) if (v === genId) return 郡を引く(k);
  return null;
}

/* 郡を治める者と、その郡の年貢の割。
     役　… 郡代・城主・城代・当主（当主が城にいれば当主が兼ねる）。将がいなければ null
     留守 … 兼ねる城主が出陣していれば、留守を預かる者（城の帳の「城主」の欄と同じ見立て）
     出陣中の郡代 … 郡代が出陣していれば、その者（そのあいだは城主が兼ねる）

   郡代が城を離れて出陣すれば、そのあいだの年貢は城主が兼ねる割に落ちる。
   能のある者を戦に連れ出せば、領国の実入りが痩せる――ここに一つの判断が生まれる。 */
export function 郡の治め(s, c, 郡) {
  const 代 = 郡代の者(s, 郡);
  if (代 && 代.at === c.id) return { 者: 代, 役: "郡代", 割: 郡代の割(代.gov) };
  const 出陣中の郡代 = 代 && 代.at == null ? 代 : null;
  const 主 = castellanOf(s, c);
  if (!主) return { 者: null, 役: null, 割: 将なしの割, 出陣中の郡代 };
  return {
    者: 主,
    役: 主.lord ? "当主" : c.城代 ? "城代" : "城主",
    割: 兼ねる割(主.gov) * (c.城代 && !主.lord ? 城代の減り : 1),
    留守: 主.at !== c.id ? 城を守る将(s, c) : null,
    出陣中の郡代,
  };
}

/* 城の年貢の割。郡ごとの割を、郡の石高の割で重ねる。郡の無い城（蝦夷・琉球）は
   城主が兼ねる割とする。 */
export function 城の年貢の割(s, c) {
  if (!c) return 1;
  const 郡 = 城の郡ら(c.id);
  if (!郡.length) return 郡の治め(s, c, null).割;
  let 和 = 0, 割の和 = 0;
  for (const x of 郡) { 和 += x.割 * 郡の治め(s, c, x).割; 割の和 += x.割; }
  return 割の和 > 0 ? 和 / 割の和 : 1;
}

/* 郡代になれぬ訳（なれれば null）。

   郡代はその城に属する者から選ぶ。城主は郡を兼ねているので郡代にはしない。
   当主・役を預かる者（国主・旗頭）・ほかの城を預かる者も除く――それぞれ別の
   務めを負っている。出陣している者は、帰陣してから任じる。 */
export function 郡代になれぬ訳(s, c, x) {
  if (!x || !c) return "その者はいない";
  if (x.captive) return "捕らわれている";
  if (x.faction !== c.faction) return "他家の者";
  if (x.lord) return "当主は郡代にならない";
  if (x.at !== c.id) return x.at == null ? "出陣している（帰陣してから任じる）" : "この城にいない（城替えで移してから任じる）";
  const 主 = castellanOf(s, c);
  if (主 && 主.id === x.id) return "城主は城の郡を兼ねている";
  if (x.役 === "国主" || x.役 === "旗頭") return `${x.役}の役を預かっている`;
  if ((s.castles || []).some((o) => o.lordId === x.id)) return "ほかの城を預かっている";
  return null;
}

// その城で郡代になれる者（政治の高い順）
export const 郡代の候補 = (s, c) => (s.generals || [])
  .filter((x) => x.at === (c && c.id) && !郡代になれぬ訳(s, c, x))
  .sort((a, b) => (b.gov || 0) - (a.gov || 0));

/* 郡代を据える。一人一郡なので、その者がほかの郡の郡代なら、そちらは空く。
   なれぬ者なら { 訳 } を返す。 */
export function 郡代を据える(s, 郡id, genId) {
  const 郡 = 郡を引く(郡id);
  const c = 郡の城(s, 郡);
  if (!郡 || !c) return { 訳: "その郡はない" };
  const x = (s.generals || []).find((g) => g.id === genId);
  const 訳 = 郡代になれぬ訳(s, c, x);
  if (訳) return { 訳 };
  const 帳 = s.郡代 || (s.郡代 = {});
  let 前の郡 = null;
  for (const [k, v] of Object.entries(帳)) {
    if (v === genId && k !== 郡id) { delete 帳[k]; 前の郡 = 郡を引く(k); }
  }
  const 前の者id = 帳[郡id] && 帳[郡id] !== genId ? 帳[郡id] : null;
  帳[郡id] = genId;
  x.郡代歴 = true;
  return { 郡, c, x, 前の郡, 前の者: 前の者id ? (s.generals || []).find((g) => g.id === 前の者id) || null : null };
}

export function 郡代を解く(s, 郡id) {
  const 帳 = s.郡代 || {};
  const id = 帳[郡id] || null;
  delete 帳[郡id];
  return id;
}

/* 郡代を整える。務められなくなった郡代を帳から外す。

     盤から消えた（物故）・捕らわれた・家を移った・当主になった
     ほかの城へ移った（出陣中はそのまま。帰陣してほかの城に入れば外れる）
     城主・国主・旗頭になった、ほかの城を預かった
     城が他家の手に落ちた（郡代の家と城の家が違う）
     一人が二つの郡の帳に載っている（古い記録の乱れ）

   城主の札を繕うたびに併せて呼ぶ（govern/war.js）。将が家を移るのも城が落ちるのも
   月送りの外で起きるので、月の頭だけでは一月遅れる。 */
export function 郡代を整える(s) {
  const 帳 = s.郡代;
  if (!帳) return [];
  const 外した = [];
  const 見た = new Set();
  for (const [郡id, genId] of Object.entries(帳)) {
    const 郡 = 郡を引く(郡id);
    const c = 郡の城(s, 郡);
    const x = (s.generals || []).find((g) => g.id === genId);
    const 主 = c && castellanOf(s, c);
    const 外す = !郡 || !c || !x || x.captive || x.lord || x.faction !== c.faction
      || (x.at != null && x.at !== c.id)
      || (主 && 主.id === x.id)
      || x.役 === "国主" || x.役 === "旗頭"
      || (s.castles || []).some((o) => o.lordId === x.id)
      || 見た.has(genId);
    if (外す) { delete 帳[郡id]; 外した.push({ 郡id, genId }); }
    else 見た.add(genId);
  }
  return 外した;
}

/* 空いた郡に郡代を任じる（他家と、差配を預けた城）。

   他家の郡も同じ掟で治まらねば、遊ぶ側だけが郡代の利を得ることになる。
   郡の大きい順に、政治の高い者から据える。いったん据えた郡代は入れ替えない。

   遊ぶ側の城は、差配を国主・旗頭に預けた城だけを寄親が埋める。直轄の城は
   遊ぶ側が自ら任じる（郡の帳と城の帳の「郡代」に、空いた郡が出る）。 */
export function 郡代を任ずる差配(s) {
  const 任じた = [];
  const 帳 = s.郡代 || (s.郡代 = {});
  const 務め中 = new Set(Object.values(帳));
  for (const c of s.castles || []) {
    const 郡 = 城の郡ら(c.id);
    if (!郡.length) continue;
    if (c.faction === s.player && !城の寄親(s, c)) continue;
    const 空き = 郡.filter((x) => !帳[x.id]).sort((a, b) => b.割 - a.割);
    if (!空き.length) continue;
    const 候補 = 郡代の候補(s, c).filter((x) => !務め中.has(x.id));
    for (const 郡x of 空き) {
      const x = 候補.shift();
      if (!x) break;
      帳[郡x.id] = x.id;
      務め中.add(x.id);
      x.郡代歴 = true;
      任じた.push({ 郡: 郡x, x, c, 寄親: c.faction === s.player ? 城の寄親(s, c) : null });
    }
  }
  return 任じた;
}
