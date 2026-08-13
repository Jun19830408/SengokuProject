import { nodeById } from "./paths.js";
import { rosterCut } from "./roster.js";
import { atPeace } from "./state.js";
import { clamp } from "./util.js";
import { TOWNS } from "../data/castles.js";
import { COAST, px, py } from "../data/geo.js";

/* ------------------------------------------------------ 海戦（GDD 10章）
   海を渡る軍は、渡りきるまで岸に足をつけられぬ。
   水軍を持つ側が海路を扼せば、船ごと沈められる。
   船戦は陸戦と別物で、兵の数より船と水主の技量がものを言う。 */
export const SEA_UNIT = { name: "船手", per: 60 };        // 一艘あたりの乗り手

// 海に面した城かどうかは、実際の海岸線からの近さで判ずる。
// 海路が引かれていなくとも、岸に近ければ船は出せる。
export const COASTAL = new Map();

export function isCoastal(c) {
  if (COASTAL.has(c.id)) return COASTAL.get(c.id);
  // 海岸線の点は粗いので、線分への距離で測る
  let near = 1e9;
  for (const seg of COAST) {
    for (let i = 1; i < seg.length; i++) {
      const [x1, y1] = seg[i - 1], [x2, y2] = seg[i];
      const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
      const t = L2 ? clamp(((c.x - x1) * dx + (c.y - y1) * dy) / L2, 0, 1) : 0;
      const d = Math.hypot(x1 + dx * t - c.x, y1 + dy * t - c.y);
      if (d < near) near = d;
    }
    if (near < 9) break;
  }
  const ok = near < 13;
  COASTAL.set(c.id, ok);
  return ok;
}


// その勢力が持つ水軍の力。水軍衆を従えていれば大きい。
export function navalPower(s, fid) {
  let ships = 0, skill = 55;
  // 海に面した城でなければ船は出せぬ。山国に水軍はない。
  for (const c of s.castles.filter((x) => x.faction === fid)) {
    if (!isCoastal(c)) continue;
    const port = (TOWNS || []).some((t) => {
      const st = s.specials[t.id];
      return (t.kind === "港" || t.kind === "水軍衆") && st && st.owner === fid
        && Math.hypot(px(t.lon) - c.x, py(t.lat) - c.y) < 90;
    });
    ships += Math.round((c.comm / 100) * (port ? 22 : 6));
  }
  // 水軍衆を抱えていれば技量が上がる
  for (const t of TOWNS || []) {
    if (t.kind !== "水軍衆") continue;
    const st = s.specials[t.id];
    if (st && st.owner === fid && (st.state === "保護" || st.state === "支援")) {
      ships += st.state === "支援" ? 22 : 12;
      skill += st.state === "支援" ? 22 : 12;
    }
  }
  return { ships: Math.max(2, ships), skill: clamp(skill, 30, 100) };
}

// 海路を渡る軍が迎え撃たれるか。相手が海に面していて水軍を持つなら起こる。
export function seaInterception(s, army, roadKind) {
  if (roadKind !== "海路") return null;
  const foes = [...new Set(s.castles.map((c) => c.faction))]
    .filter((f) => f !== army.faction && !atPeace(s, army.faction, f));
  if (!foes.length) return null;
  const mine = navalPower(s, army.faction);
  // その海域に船を出せる家のうち、もっとも水軍の強い家が迎え撃つ。
  // 航路の両端を結ぶ線の近くに湊を持たぬ家は、そこまで船を出せない。
  const A = nodeById(army.path[0]), B = nodeById(army.path[1]);
  if (!A || !B) return null;
  const nearRoute = (c) => {
    const dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy;
    const t = L2 ? clamp(((c.x - A.x) * dx + (c.y - A.y) * dy) / L2, 0, 1) : 0;
    return Math.hypot(A.x + dx * t - c.x, A.y + dy * t - c.y);
  };
  let best = null;
  for (const f of foes) {
    const np = navalPower(s, f);
    if (np.ships < 3) continue;
    // 航路のそばに海の城を持つ家だけが出てこられる
    const near = s.castles.some((c) => c.faction === f && isCoastal(c) && nearRoute(c) < 120);
    if (!near) continue;
    const score = np.ships * (0.6 + np.skill / 160);
    if (!best || score > best.score) best = { fid: f, np, score };
  }
  if (!best) return null;
  // 相手が明らかに弱ければ出てこない
  if (best.score < mine.ships * (0.6 + mine.skill / 160) * 0.45) return null;
  if (Math.random() > 0.20) return null;               // 海で待ち伏せるのは容易でない
  return { by: best.fid, foe: best.np, mine };
}

// 海戦の帰趨。船と水主の技量で決まり、負ければ兵が海に沈む。
export function resolveSeaBattle(s, army, inter) {
  const a = inter.mine, d = inter.foe;
  // 船数は平方根で効かせる。数を揃えれば勝てる、という戦ではない。
  const av = Math.sqrt(a.ships) * (0.5 + a.skill / 110) * (0.72 + Math.random() * 0.56);
  const dv = Math.sqrt(d.ships) * (0.5 + d.skill / 110) * (0.72 + Math.random() * 0.56);
  const win = av > dv;
  const r = Math.min(av, dv) / Math.max(av, dv);
  // 負ければ大きく沈む。海の上に退き場はない。
  const lost = Math.round(army.men * (win ? 0.04 + r * 0.05 : 0.16 + r * 0.16));
  army.men = Math.max(0, army.men - lost);
  army.local = Math.max(0, army.local - lost);
  if (army.rost) rosterCut(army.rost, lost);
  return { win, lost, foeName: s.factions[inter.by].name };
}

