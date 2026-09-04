import { clamp } from "./util.js";

// 城下に着いたときの献策。寡兵であり、策を献じうる者がいるときに限る。
/* foe を渡せば、向かい合うのは城ではなくその軍である（行き合い・城下の野戦）。
   渡さねば、これまで通り城の守りを相手と見る。 */
export function ambushPlan(g, army, dest, foe) {
  const atkIsPlayer = army.faction === g.player;
  const 城方 = foe
    ? (foe.gens || []).map((id) => g.generals.find((x) => x.id === id)).filter(Boolean)
    : g.generals.filter((x) => x.at === dest.id && x.faction === dest.faction && !x.captive);
  const 城方の兵 = foe ? foe.men : dest.local + 城方.reduce((a, x) => a + x.retinue, 0);
  const mine = atkIsPlayer
    ? army.gens.map((id) => g.generals.find((x) => x.id === id)).filter(Boolean)
    : 城方;
  const theirs = atkIsPlayer
    ? 城方
    : army.gens.map((id) => g.generals.find((x) => x.id === id)).filter(Boolean);
  if (!mine.length || !theirs.length) return null;
  const myMen = atkIsPlayer ? army.men : 城方の兵;
  const foeMen = atkIsPlayer ? 城方の兵 : army.men;
  const ratio = myMen / Math.max(1, foeMen);
  if (ratio > 0.62) return null;                       // 互角に近ければ正面から当たる
  const head = [...mine].sort((a, b) => (b.wit + b.lead) - (a.wit + a.lead))[0];
  if (!head || head.wit < 62) return null;             // 策を献じうる者がおらぬ
  const wx = g.weather || "晴";
  const terr = (dest.kuni === "信濃" || dest.kuni === "甲斐" || dest.kuni === "飛騨") ? "hill" : "forest";
  const p = ambushChance(head, wx, terr, ratio);
  if (p < 0.06) return null;
  const lord = [...theirs].sort((a, b) => (b.lord ? 1 : 0) - (a.lord ? 1 : 0) || b.lead - a.lead)[0];
  return { head, target: lord, p, myMen: Math.round(myMen), foeMen: Math.round(foeMen), weather: wx, terr, ratio };
}


/* --------------------------------------------- 奇襲と大将首（GDD 8.7）
   兵数だけで決まるなら、寡兵が大軍を破る道はない。
   総大将を突けば軍は瓦解する──桶狭間はその一戦であった。
   勝算は薄いが、当たれば兵力比を覆す。 */
export function ambushChance(gen, weather, terrain, ratio) {
  if (!gen) return 0;
  // 知略が要。統率がこれを支える。
  let p = (gen.wit - 55) / 340 + (gen.lead - 55) / 620;
  // 雨や霧は寄せ手を隠す
  p *= weather === "雨" ? 1.55 : weather === "雪" ? 1.35 : weather === "曇" ? 1.12 : 1;
  // 森・山・谷は伏せる場所がある
  p *= terrain === "forest" || terrain === "hill" ? 1.3 : 1;
  // 相手が大軍で油断しているほど付け入る隙がある
  p *= clamp(0.6 + (1 - ratio) * 1.4, 0.5, 2.0);
  return clamp(p, 0, 0.52);
}

/* 奇襲の首尾は、企てた将の知略で段が分かれる（GDD 8.7）。

   総大将が必ず討たれるのでは、桶狭間が毎年起こることになる。当たっても、
   たいていは本陣を突き崩して混乱させるまでである。首を取るのは、よほどの
   将が、よほどの機を得たときだけである。

     知略九十以上 … 総大将を討ち取る。軍は瓦解する
     知略八十五以上 … 総大将の備えは壊滅し、本人は本陣を捨てて退く。
                      相手の兵は半ばに減る
     知略八十以上 … 総大将の備えは四分の一に。相手の兵は四分の一を失う
     知略七十以上 … 総大将の備えは半ばに。相手の兵は六分の一を失う
     知略六十二以上 … 総大将の備えも含めて、相手の兵は八分の一を失う

   乱れ（守りの利かなさ）と勢い（寄せ手の勢い）は、段が上ほど大きい。
   兵の目減りは別に効くので、ここは控えめにしてある。 */
export function 奇襲の段(wit) {
  const w = wit || 0;
  if (w >= 90) return { 位: "大将討死", 大将討死: true, 大将備え: 0, 全体欠け: 0, 乱れ: 0.25, 勢い: 1.25 };
  if (w >= 85) return { 位: "本陣壊滅", 大将討死: false, 大将退く: true, 大将備え: 0, 全体欠け: 0.5, 乱れ: 0.5, 勢い: 1.18 };
  if (w >= 80) return { 位: "本陣崩し", 大将討死: false, 大将備え: 0.25, 全体欠け: 0.25, 乱れ: 0.72, 勢い: 1.12 };
  if (w >= 70) return { 位: "本陣衝き", 大将討死: false, 大将備え: 0.5, 全体欠け: 1 / 6, 乱れ: 0.84, 勢い: 1.08 };
  return { 位: "陣払い", 大将討死: false, 大将備え: 1, 全体欠け: 1 / 8, 乱れ: 0.92, 勢い: 1.05 };
}

// 奇襲の首尾。当たれば敵の本陣を衝く。首まで取れるかは、企てた将の知略による。
export function tryAmbush(s, army, castle, aGens, dGens, weather) {
  /* 奇襲を企てる者。将のいない軍は奇襲を仕掛けられない。
     将がみな討たれ、あるいは捕らわれた軍が城へ着くことはある。
     そのとき head が無いまま「機を得なかった」と書こうとして倒れていた。 */
  const head = [...aGens].sort((a, b) => (b.wit + b.lead) - (a.wit + a.lead))[0];
  if (!head) return null;
  const dMen = castle.local + dGens.reduce((a, x) => a + x.retinue, 0);
  const ratio = army.men / Math.max(1, dMen);
  if (ratio > 0.62) return null;                    // 互角に近ければ正面から戦う
  const terr = (castle.kuni === "信濃" || castle.kuni === "甲斐" || castle.kuni === "飛騨") ? "hill" : "forest";
  const p = ambushChance(head, weather, terr, ratio);
  if (Math.random() > p) return { ok: false, by: head, p };
  // 本陣を衝いた。どこまで及ぶかは、企てた将の知略による。
  const cand = dGens.filter((x) => x.faction === castle.faction && !x.captive);
  const lord = [...cand].sort((a, b) => (b.lord ? 1 : 0) - (a.lord ? 1 : 0) || b.lead - a.lead)[0];
  return { ok: true, by: head, target: lord || null, p, 段: 奇襲の段(head.wit) };
}

