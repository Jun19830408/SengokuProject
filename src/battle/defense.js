import { BASE, FIELD, MAX_CORPS } from "./field.js";
import { axisOf, fromUV } from "./castleMap.js";
import { makeCorps } from "./corps.js";
import { rosterTake } from "../core/roster.js";
import { 守りの割り付け } from "../core/garrison.js";
import { 守備隊の統率 } from "../core/rank.js";

/* ==========================================================================
   城方の隊立て（GDD 9.3）

   これまでは武将の数だけしか隊が立たず、残りの門はがら空きであった。
   武将のいない門にも兵は詰めている。門番、足軽小頭、駆り出された地侍――
   名は伝わらぬが、そこに人はいる。それを「◯◯城守備隊」として立てる。

   守備隊の器量は、その城を預かる者の統率だけを映す（rank.js の 守備隊の統率）。
   武勇と知略は最低限とする。名も無き兵に、将の武辺や謀は望めない。
   動きは門に張り付いて射るだけ。討って出ず、分遣も出さない（ai.js）。

   誰をどの門に置き、兵をどう割るかは、城方が遊ぶ側なら手で決められる。
   決めなければ采配の案（garrison.js の 守りの割り付け）を用いる。
   ========================================================================== */

// 門ごとの持ち場。門のすぐ内、一つ内側の曲輪との間に立つ。
export function 持ち場を並べる(map) {
  const guard = [];
  for (const l of map.layers) for (const gt of l.gates) {
    const a = axisOf(l, gt);
    const nx = map.layers[l.i + 1];
    const innerEdge = nx ? (a.along === "x" ? nx.hh : nx.hw) + map.t : 0;
    const band = Math.max(20, a.half - innerEdge);
    const inset = Math.min(44 * (FIELD.w / BASE.w), band * 0.5);
    const p = fromUV(map, a, gt.off, a.half - inset);
    // 立たせた場所だけでなく、受け持ちの門そのものを控えておく。
    // これを渡さないと、城方は戦の始まりに持ち場を捨てて奥へ引いてしまう。
    guard.push({ x: p.x, y: p.y, f: Math.atan2(p.y - map.cy, p.x - map.cx) + Math.PI, gate: gt });
  }
  guard.push({ x: map.cx, y: map.cy, f: Math.PI / 2, gate: null });   // 余った隊は本丸に控える
  return guard;
}

export function 城方の隊を立てる(s, castle, map, { defGens, 割り付け, side, color }) {
  const guard = 持ち場を並べる(map);
  const 門ら = guard.filter((x) => x.gate);
  const 本丸 = guard[guard.length - 1];
  const 守統 = 守備隊の統率(s, castle);
  const 割 = (割り付け && 割り付け.門)
    ? 割り付け : 守りの割り付け(s, castle, 門ら.map((x) => x.gate));

  // 誰がどの門を受け持つか
  const 配 = [];                                   // { gen, 兵, 場 }
  for (const sp of 門ら) {
    const 決 = 割.門[sp.gate.key] || {};
    const gen = 決.genId ? defGens.find((x) => x.id === 決.genId) || null : null;
    配.push({ gen, 兵: Math.max(0, Math.round(決.men || 0)), 場: sp });
  }
  const 置いた = new Set(配.filter((x) => x.gen).map((x) => x.gen.id));
  for (const gen of defGens) {                     // 門に置ききれない将は本丸に控える
    if (置いた.has(gen.id)) continue;
    配.push({ gen, 兵: Math.max(0, Math.round((割.本丸 && 割.本丸[gen.id]) || 0)), 場: 本丸 });
  }

  let 名簿 = castle.rost && castle.rost.length ? JSON.parse(JSON.stringify(castle.rost)) : null;
  const def = [];
  for (const 口 of 配) {
    const 兵 = Math.max(0, 口.兵);
    if (!口.gen && 兵 < 40) continue;               // 人のいない門は隊を立てない
    const slice = 名簿 ? (() => { const tk = rosterTake(名簿, 兵); 名簿 = tk.rest; return tk.taken; })() : null;
    const 将 = 口.gen || {
      id: `gar-${castle.id}-${口.場.gate ? 口.場.gate.key : "本丸"}`,
      name: `${castle.name}守備隊`, lead: 守統, valor: 30, wit: 28, gov: 30,
      retinue: 0, retTrain: Math.max(30, (castle.localTrain || 60) - 12), unity: 45, 守備隊: true,
    };
    const c = makeCorps(side, { ...将, locRost: slice }, 将.retinue || 0, 兵,
      Math.round((将.retTrain || 60) * 0.7 + (将.unity || 60) * 0.3),
      Math.round((castle.localTrain || 60) * 0.7 + (castle.najimi == null ? 70 : castle.najimi) * 0.3),
      口.場.x, 口.場.y, 口.場.f, color);
    c.守備隊 = !口.gen;                              // 名も無き隊の印
    if (口.場.gate) c.holdGate = 口.場.gate;
    def.push(c);
    if (def.length >= MAX_CORPS) break;
  }
  return def;
}
