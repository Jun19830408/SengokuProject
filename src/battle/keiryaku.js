import { MAP } from "./castleMap.js";
import { corpsMax, corpsMen, notify, 内応させる } from "./corps.js";
import { clamp } from "../core/util.js";

/* ==========================================================================
   城攻めの三つの計略（GDD 9.4 / 11.2）

   遊ぶ側の申し出は「計略として、内応（事前の調略必要）、水の手、焼き働きの三つを
   用意して、内応は寝返ってその場で相手側に色が変わり相手方の軍になる（もちろん、
   指示も相手方にうつる）、水の手は上手くいけば士気が減る、焼き働きは上手くいけば
   兵と士気、防御力が減るのでいい。大幅に減らすと良くないが、ややこしくならない
   ように、ある程度一律に、仕掛ける武将の能力値によって減らしていくのがいい」で
   あった。

     内応     … 調略で密約を交わした城方の将を、その場で寝返らせる（corps.js 内応させる）。
                旗の色も下知も寄せ手へ移る。密約が無ければ仕掛けられない
     水の手   … 城の水の手（井戸・水汲み道）を断つ。成れば城方の士気が落ちる
     焼き働き … 城下と外曲輪に火を掛ける。成れば城方の兵と士気が減り、門と櫓が傷む

   仕掛けるのは寄せ手の将のうち知略のいちばん高い者（遊ぶ側が隊を選んでいれば、その隊の将）。
   成る見込みは、仕掛け手の知略と城方の目付（知略のいちばん高い将）の差で決まり、
   一割五分から八割五分のあいだに収める。減らし方は仕掛け手の知略だけで決め、どの城でも
   同じ式による（大きく減らしはしない）。しくじれば、仕掛けた隊が少し兵と士気を失う。

   水の手と焼き働きは、一日に一度ずつである（夜を越せば、また仕掛けられる）。
   ========================================================================== */
export const 計略ら = ["内応", "水の手", "焼き働き"];

const 生きた = (c) => c && !c.dead && !c.destroyed && !c.routed && !c.withdraw && c.gen;
const 寄せ手 = (b) => b.corps.filter((c) => 生きた(c) && c.side === b.attacker);
/* 城方は城に籠る隊だけを数える。盤の外から来た後詰（engine.js 後詰を入れる）は、
   水の手を断たれても焼き働きを受けても揺らがない */
const 城方 = (b) => b.corps.filter((c) => 生きた(c) && c.side !== b.attacker && !c.後詰);
const 知 = (c) => (c && c.gen && c.gen.wit) || 50;

/* 仕掛け手。選ばれた寄せ手の隊があればその将、無ければ寄せ手でいちばん知略の高い将 */
export function 仕掛け手(b, 選んだ) {
  if (選んだ && 生きた(選んだ) && 選んだ.side === b.attacker && !選んだ.detach) return 選んだ;
  return 寄せ手(b).filter((c) => !c.detach).sort((a, z) => 知(z) - 知(a))[0] || null;
}
/* 城方の目付。城方でいちばん知略の高い将（名も無き守備隊は数えない） */
function 目付(b) {
  return 城方(b).filter((c) => !c.守備隊).sort((a, z) => 知(z) - 知(a))[0] || null;
}

/* 内応を約した城方の隊（遊ぶ側か采配か、仕掛ける側の密約に限る） */
export function 内応の者(b, 主) {
  return b.corps.find((c) => !c.dead && !c.destroyed && c.内応 && !c.寝返り && c.内応の主 === 主) || null;
}

/* 今日もう仕掛けたか */
export const 仕掛けた = (b, kind) => !!(b.計略 && b.計略[kind] === (b.日 || 1));

/* 成る見込み（〇〜一）。内応は密約があれば必ず成る */
export function 計略の見込み(b, kind, c) {
  if (kind === "内応") return 1;
  const 目 = 目付(b);
  let p = 0.45 + (知(c) - (目 ? 知(目) : 40)) / 120;
  // 井戸の傷んだ城（調略の「井戸への投げ込み」）は、水の手が断ちやすい
  if (kind === "水の手" && b.城の井戸 != null && b.城の井戸 < 60) p += 0.15;
  return clamp(p, 0.15, 0.85);
}

/* 成ったときの減り方。仕掛け手の知略だけで決める（〇.〇〜一.〇 の器） */
export function 計略の減り(kind, c) {
  const 器 = clamp(知(c) / 100, 0.3, 1);
  if (kind === "水の手") return { 士気: Math.round(6 + 器 * 10) };
  if (kind === "焼き働き") {
    return { 兵: 0.015 + 器 * 0.02, 士気: Math.round(3 + 器 * 6), 門: 0.06 + 器 * 0.08, 櫓: 0.08 + 器 * 0.08 };
  }
  return {};
}

/* 隊の兵を割で削る。組ごとに同じ割で減らし、損の帳にも付ける */
function 兵を削る(c, 割) {
  let 計 = 0;
  for (const q of c.squads) {
    if (q.men <= 0) continue;
    const 減 = Math.min(q.men, Math.round(q.men * 割));
    q.men -= 減; 計 += 減;
    if (c.loss) c.loss[q.origin] = (c.loss[q.origin] || 0) + 減;
  }
  return 計;
}

/* 仕掛ける。返すのは { ok, 成, 文 } */
export function 計略を仕掛ける(b, kind, 選んだ) {
  if (!b || !b.map || b.phase !== "fight") return { ok: false, 文: "城攻めのさなかでなければ仕掛けられない。" };
  if (kind === "内応") {
    const 主 = b.attacker;
    const 者 = 内応の者(b, 主);
    if (!者) return { ok: false, 文: "城中に密約を交わした者がいない（調略で密約を結んでおく）。" };
    内応させる(b, 者);
    return { ok: true, 成: true, 文: `${者.gen.name}が旗を翻し、寄せ手に付いた。` };
  }
  if (仕掛けた(b, kind)) return { ok: false, 文: `${kind}は今日はもう仕掛けた（夜を越せばまた仕掛けられる）。` };
  const c = 仕掛け手(b, 選んだ);
  if (!c) return { ok: false, 文: "仕掛ける将がいない。" };
  b.計略 = b.計略 || {};
  b.計略[kind] = b.日 || 1;
  const 成 = Math.random() < 計略の見込み(b, kind, c);
  const 減 = 計略の減り(kind, c);
  const 守 = 城方(b);
  let 文;
  if (!成) {
    const 失 = 兵を削る(c, 0.02);
    c.morale = Math.max(0, c.morale - 3);
    文 = `${c.gen.name}の${kind}は見破られた（${失}人を失った）。`;
  } else if (kind === "水の手") {
    for (const o of 守) o.morale = Math.max(0, o.morale - 減.士気);
    b.水の手 = (b.水の手 || 0) + 1;
    文 = `${c.gen.name}が城の水の手を断った。城兵は渇きに怯え、士気が${減.士気}落ちた。`;
  } else {
    let 失 = 0;
    for (const o of 守) { 失 += 兵を削る(o, 減.兵); o.morale = Math.max(0, o.morale - 減.士気); }
    const m = MAP || b.map;
    for (const g of [...(m.gates || []), ...(m.出城 && !m.出城.落ちた ? m.出城.gates : [])]) {
      if (!g.broken) g.hp = Math.max(1, g.hp - g.max * 減.門);
    }
    for (const f of m.fac || []) if (f.hp > 0) f.hp = Math.max(1, f.hp - f.max * 減.櫓);
    b.焼き働き = (b.焼き働き || 0) + 1;
    文 = `${c.gen.name}が城下と外曲輪に火を掛けた。城兵${失}人を失い、士気が${減.士気}落ち、門と櫓が焼けた。`;
  }
  notify(b, 文, (b.attacker === "P") === 成 ? "good" : "bad");          // 報せは戦の記にも残る
  return { ok: true, 成, 文 };
}

/* 采配の寄せ手の計略。寄せてから四十秒ほどのちに、一日一度ずつ仕掛ける。
   知略五十五に満たぬ将しかいなければ仕掛けない。内応は ai.js が頃合いを計る */
export function 采配の計略(b) {
  if (!b.map || b.phase !== "fight" || b.attacker === "P") return null;
  if (b.t - (b.日の始め || 0) < 40) return null;
  const c = 仕掛け手(b, null);
  if (!c || 知(c) < 55) return null;
  for (const kind of ["水の手", "焼き働き"]) {
    if (仕掛けた(b, kind)) continue;
    return 計略を仕掛ける(b, kind, c);
  }
  return null;
}

/* 城方の隊の数を戦のあとの帳に（試験と記録のため） */
export const 城方の兵 = (b) => 城方(b).reduce((a, c) => a + corpsMen(c), 0);
export const 城方の器 = (b) => 城方(b).reduce((a, c) => a + corpsMax(c), 0);
