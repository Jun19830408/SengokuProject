/* ==========================================================================
   街道の性格（GDD 8.1）── 戦場の型（battle/kata.js）を選ぶための下調べ

   戦う街道について、次のことを地図の資料から調べる。
     質   … 街道・山道・難所・海路（data/roads.js）
     距   … 道のり（同じ表の値）
     大河 … 街道が大河（data/geo.js の RIVER_GEO。中部の十六の川）を渡るなら、その名
     湖   … 琵琶湖・浜名湖のそばを通るなら、その名と、寄せ手から見た左右
     海   … 両端の城がどちらも海に面し（core/naval.js isCoastal）、街道が海岸に沿って
            通るなら、海が寄せ手から見て左右どちらにあるか

   左右は盤の上の向き（攻め口。MapScreen attackFace）に沿って測る。寄せ手は攻め口の辺
   から向かいの辺へ進む。地図の上の湖や海の側を、その進む向きの左右に引き直すので、
   盤の上でも同じ側に水が来る。
   ========================================================================== */
import { nodeById, roadBetween } from "./paths.js";
import { isCoastal } from "./naval.js";
import { LAKES, RIVERS, LAND_POLYS, px, py } from "../data/geo.js";

/* 湖のそば・海沿いと見なす隔たり（地図の点。一点がおよそ半キロ余り） */
export const 湖の近さ = 9, 海の近さ = 16;

const 湖ら = LAKES.map((l) => {
  const 点 = l.pts.map(([lo, la]) => [px(lo), py(la)]);
  return { 名: l.name, 点, cx: 点.reduce((t, p) => t + p[0], 0) / 点.length, cy: 点.reduce((t, p) => t + p[1], 0) / 点.length };
});

/* 寄せ手が盤の上で進む向き（y は南が正）。S … 南の辺から北へ */
const 進む = { S: [0, -1], N: [0, 1], E: [-1, 0], W: [1, 0] };

const 点と線分 = (x, y, x1, y1, x2, y2) => {
  const vx = x2 - x1, vy = y2 - y1, L2 = vx * vx + vy * vy;
  let t = L2 ? ((x - x1) * vx + (y - y1) * vy) / L2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(x1 + vx * t - x, y1 + vy * t - y);
};
const 向きの符 = (ax, ay, bx, by, cx, cy) => Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
function 交わるか(p, q, r, s) {
  const d1 = 向きの符(r[0], r[1], s[0], s[1], p[0], p[1]), d2 = 向きの符(r[0], r[1], s[0], s[1], q[0], q[1]);
  const d3 = 向きの符(p[0], p[1], q[0], q[1], r[0], r[1]), d4 = 向きの符(p[0], p[1], q[0], q[1], s[0], s[1]);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
function 内か(x, y, 多角) {
  let 内 = false;
  for (let i = 0, j = 多角.length - 1; i < 多角.length; j = i++) {
    const [xi, yi] = 多角[i], [xj, yj] = 多角[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) 内 = !内;
  }
  return 内;
}
const 陸か = (x, y) => LAND_POLYS.some((p) => 内か(x, y, p));

export function 街道の性格(aId, bId, 向き = "S") {
  const 道 = roadBetween(aId, bId), A = nodeById(aId), B = nodeById(bId);
  if (!道 || !A || !B) return null;
  const [fx, fy] = 進む[向き] || 進む.S;
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
  /* 寄せ手から見て左か右か（左 −1・右 1）。y が南へ増える地図なので、外積の負が左 */
  const 左右 = (x, y) => (fx * (y - my) - fy * (x - mx) < 0 ? -1 : 1);

  let 大河 = null;
  for (const r of RIVERS) {
    for (let i = 0; i + 1 < r.pts.length && !大河; i++) if (交わるか([A.x, A.y], [B.x, B.y], r.pts[i], r.pts[i + 1])) 大河 = r.name;
    if (大河) break;
  }

  let 湖 = null;
  for (const l of 湖ら) {
    let d = 内か(A.x, A.y, l.点) || 内か(B.x, B.y, l.点) ? 0 : Infinity;
    for (let i = 0; i < l.点.length && d > 0; i++) {
      const p = l.点[i], q = l.点[(i + 1) % l.点.length];
      if (交わるか([A.x, A.y], [B.x, B.y], p, q)) { d = 0; break; }
      d = Math.min(d, 点と線分(p[0], p[1], A.x, A.y, B.x, B.y), 点と線分(A.x, A.y, p[0], p[1], q[0], q[1]),
        点と線分(B.x, B.y, p[0], p[1], q[0], q[1]));
    }
    if (d <= 湖の近さ) { 湖 = { 名: l.名, 側: 左右(l.cx, l.cy) }; break; }
  }

  /* 海。両端の城がどちらも海に面し、しかも街道が海岸に沿って通るときだけ海沿いとする。
     城が海に面するかは海路の有無でも決まる（naval.js）ので、それだけで見ると、内陸を
     抜ける街道まで海沿いになる（陸の街道の半ば近く）。街道の三か所から、進む向きの
     左右へ 海の近さ まで離れた所を見て、二か所以上で同じ側に海が出れば沿うと見る。
     側 … 海の出た数の多い側（同じなら零。型の側で種によって決める） */
  let 海 = null;
  if (isCoastal(A) && isCoastal(B)) {
    const rx = -fy, ry = fx;                       // 進む向きの右手
    let 左 = 0, 右 = 0;
    for (const t of [0.2, 0.5, 0.8]) {
      const x0 = A.x + (B.x - A.x) * t, y0 = A.y + (B.y - A.y) * t;
      let l = false, r = false;
      for (let d = 4; d <= 海の近さ; d += 4) {
        if (!r && !陸か(x0 + rx * d, y0 + ry * d)) r = true;
        if (!l && !陸か(x0 - rx * d, y0 - ry * d)) l = true;
      }
      if (r) 右++;
      if (l) 左++;
    }
    if (Math.max(左, 右) >= 2) 海 = { 側: 右 > 左 ? 1 : 左 > 右 ? -1 : 0 };
  }
  return { 質: 道[3], 距: 道[2], 大河, 湖, 海 };
}
