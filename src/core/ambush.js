import { clamp } from "./util.js";

// 城下に着いたときの献策。寡兵であり、策を献じうる者がいるときに限る。
export function ambushPlan(g, army, dest) {
  const atkIsPlayer = army.faction === g.player;
  const mine = atkIsPlayer
    ? army.gens.map((id) => g.generals.find((x) => x.id === id)).filter(Boolean)
    : g.generals.filter((x) => x.at === dest.id && x.faction === dest.faction && !x.captive);
  const theirs = atkIsPlayer
    ? g.generals.filter((x) => x.at === dest.id && x.faction === dest.faction && !x.captive)
    : army.gens.map((id) => g.generals.find((x) => x.id === id)).filter(Boolean);
  if (!mine.length || !theirs.length) return null;
  const myMen = atkIsPlayer ? army.men : dest.local + mine.reduce((a, x) => a + x.retinue, 0);
  const foeMen = atkIsPlayer ? dest.local + theirs.reduce((a, x) => a + x.retinue, 0) : army.men;
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

// 奇襲の首尾。当たれば敵の総大将を討ち、軍を瓦解させる。
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
  // 総大将を討った。守り手の大将と、その直属が崩れる。
  const cand = dGens.filter((x) => x.faction === castle.faction && !x.captive);
  const lord = [...cand].sort((a, b) => (b.lord ? 1 : 0) - (a.lord ? 1 : 0) || b.lead - a.lead)[0];
  return { ok: true, by: head, target: lord || null, p };
}

