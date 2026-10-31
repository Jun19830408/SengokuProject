import { commandPost, corpsMen, notify } from "./corps.js";
import { fieldScale } from "./field.js";
import { clamp } from "../core/util.js";

/* ==========================================================================
   計略「鼓舞」――将が兵を励まし、士気を取り戻させる（GDD 11.2 の計略に足す）

   遊ぶ側の申し出は「計略に士気を追加したいです。大名または総大将なら全体または自部隊の
   士気を上げるもの、普通の武将は自部隊のみの士気を上げるもの(統率が85以上の武将は近くの
   自軍の部隊の士気もあげる)を追加したいです。統率か知略が70以上なら2回、それ以下なら1回
   行え、成功率と成功した時の士気の上がり方は最大50%回復くらいにして、統率か知略の
   パラメータによって割合的に上がる感じにしたいです。」であった。

     器       … 将の統率と知略の高いほう。成否も上がり方もこれで決まる
     回数     … 器が七十以上なら一つの合戦で二度、それ未満は一度。城攻めの数日がかりも
                通して数える（夜を越しても戻らない）
     届く先   … 大名（当主）と総大将（本陣の将。corps.js commandPost）は「全軍」か「自部隊」
                を選べる。統率八十五以上の将は、自部隊と、三百歩の内の味方の隊に届く。
                それ以外の将は自部隊だけ
     成る見込み … 器を百分率にしたもの（器八十なら八割）。一割から九割五分に収める
     上がり方 … 失った士気（百からいまの士気を引いたもの）のうち、器の割合で最大五割を
                取り戻す（器百で五割、七十で三割五分）。士気四十の隊に器八十の将が成せば、
                六十の二割で二十四上がって六十四になる
     しくじれば … 回数だけが減る（兵に届かなかっただけで、士気は動かない）

   崩れた隊にも届く。崩れた隊の立ち直り（engine）は士気で決まるので、鼓舞は崩れた隊を
   早く立ち直らせる――将が馬を返して兵をまとめ直す形である。盤の外へ落ちた隊（潰）、
   去就の定まらぬ隊（日和見）、分遣した隊には届かない（分遣は本隊の将の手の内にある）。
   ========================================================================== */

const 器 = (c) => Math.max((c && c.gen && c.gen.lead) || 0, (c && c.gen && c.gen.wit) || 0);
export const 鼓舞の器 = 器;
export const 鼓舞の回数 = (c) => (器(c) >= 70 ? 2 : 1);
export const 鼓舞の残り = (c) => (c.鼓舞の残り == null ? 鼓舞の回数(c) : c.鼓舞の残り);
export const 鼓舞の見込み = (c) => clamp(器(c) / 100, 0.1, 0.95);
export const 鼓舞の割 = (c) => 0.5 * clamp(器(c) / 100, 0, 1);
/* 大名か総大将か。総大将は本陣の将（大名がいなければ統率のいちばん高い隊。伝令もここから出る） */
export const 鼓舞の大将か = (b, c) => !!(c.gen && c.gen.lord) || commandPost(b, c.side) === c;
export const 近くにも届くか = (c) => ((c.gen && c.gen.lead) || 0) >= 85;
export const 鼓舞の近さ = () => 300 * fieldScale();

const 届く隊か = (o, side) => o.side === side && !o.dead && !o.destroyed && !o.潰 && !o.日和見 && !o.detach
  && corpsMen(o) > 0;

/* 鼓舞の届く隊。全軍を選べるのは大名と総大将だけ（ほかの将が全軍を選んでも、届くのは己の手の内） */
export function 鼓舞の届く先(b, c, 全軍 = false) {
  const 味方 = b.corps.filter((o) => 届く隊か(o, c.side));
  if (全軍 && 鼓舞の大将か(b, c)) return 味方;
  if (近くにも届くか(c)) {
    const R = 鼓舞の近さ();
    return 味方.filter((o) => o === c || Math.hypot(o.x - c.x, o.y - c.y) < R);
  }
  return 味方.filter((o) => o === c);
}

/* 鼓舞する。返すのは { ok, 成, 文, 上 }（上 … 届いた隊の上がった士気の平均） */
export function 鼓舞する(b, c, { 全軍 = false } = {}) {
  if (!b || b.phase !== "fight") return { ok: false, 文: "合戦のさなかでなければ鼓舞できない。" };
  if (!c || !c.gen || !届く隊か(c, c.side)) return { ok: false, 文: "鼓舞する将がいない。" };
  if (鼓舞の残り(c) <= 0) return { ok: false, 文: `${c.gen.name}はこの合戦ではもう鼓舞できない。` };
  c.鼓舞の残り = 鼓舞の残り(c) - 1;
  c.鼓舞の刻 = b.t;
  const 先 = 鼓舞の届く先(b, c, 全軍);
  const 全 = 全軍 && 鼓舞の大将か(b, c);
  const 成 = Math.random() < 鼓舞の見込み(c);
  if (!成) {
    const 文 = `${c.gen.name}の鼓舞は兵に届かなかった。`;
    notify(b, 文, c.side === "P" ? "bad" : "good");
    return { ok: true, 成: false, 文, 上: 0 };
  }
  const 割 = 鼓舞の割(c);
  let 計 = 0;
  for (const o of 先) {
    const 上 = (100 - o.morale) * 割;
    o.morale = clamp(o.morale + 上, 0, 100);
    計 += 上;
    if (b.fx && b.fx.length < 220) b.fx.push({ k: "鼓舞", x: o.x, y: o.y, r: 46 * fieldScale(), t: 0, life: 1.6 });
  }
  const 平 = Math.round(計 / Math.max(1, 先.length));
  const 範 = 全 ? "全軍" : 先.length > 1 ? `自部隊と近くの${先.length - 1}隊` : "自部隊";
  const 文 = `${c.gen.name}が${範}を鼓舞した。士気が${平}上がった${先.length > 1 ? "（平均）" : ""}。`;
  notify(b, 文, c.side === "P" ? "good" : "bad");
  return { ok: true, 成: true, 文, 上: 平 };
}

/* 采配の鼓舞（ai.js battleAI から毎回呼ぶ）。

   采配の側の将（敵、遊ぶ側の委ねた隊）は、己の隊の士気が四十五を切れば鼓舞する。
   大名と総大将は、味方の三隊以上が士気五十を切っていれば全軍を鼓舞する。
   一隊ごとに四十秒は間を空ける（二度ある将が続けざまに使い切らない）。
   遊ぶ側の手ずから率いる隊には、遊ぶ側が鼓舞を下す。 */
export function 采配の鼓舞(b) {
  if (!b || b.phase !== "fight") return;
  for (const c of b.corps) {
    if (!c.gen || !届く隊か(c, c.side)) continue;
    if (c.side === "P" && !c.auto) continue;
    if (鼓舞の残り(c) <= 0) continue;
    if (c.鼓舞の刻 != null && b.t - c.鼓舞の刻 < 40) continue;
    if (鼓舞の大将か(b, c)) {
      const 弱 = b.corps.filter((o) => 届く隊か(o, c.side) && o.morale < 50).length;
      if (弱 >= 3) { 鼓舞する(b, c, { 全軍: true }); continue; }
    }
    if (c.morale < 45) 鼓舞する(b, c);
  }
}
