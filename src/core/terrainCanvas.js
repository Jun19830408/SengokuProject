import { nodeById } from "./paths.js";
import { U, segDist, shade, vnoise } from "./util.js";
import { COAST, KUNI_LINES, LAKES, LAND_POLYS, MAPH, MAPW, RIDGES, px, py } from "../data/geo.js";
import { ROADS } from "../data/roads.js";

export function buildTerrainCanvas() {
  const RW = 500, RH = 534;
  const sx = MAPW / RW, sy = MAPH / RH;
  const H = new Float32Array(RW * RH);
  for (let j = 0; j < RH; j++) {
    const wy = j * sy;
    for (let i = 0; i < RW; i++) {
      const wx = i * sx;
      let h = 0;
      for (const r of RIDGES) {
        let d = 1e9;
        for (let k = 0; k < r.pts.length - 1; k++) {
          const p = r.pts[k], q = r.pts[k + 1];
          const dd = segDist(wx, wy, p[0], p[1], q[0], q[1]);
          if (dd < d) d = dd;
        }
        const t = d / r.w;
        if (t < 3) h = Math.max(h, r.amp * Math.exp(-t * t));
      }
      const n = vnoise(wx / 26, wy / 26) * 0.55 + vnoise(wx / 11, wy / 11) * 0.3 + vnoise(wx / 5, wy / 5) * 0.15;
      H[j * RW + i] = Math.max(0, h * (0.72 + n * 0.56));
    }
  }
  const RAMP = [
    [0.00, [222, 228, 200]], [0.04, [212, 222, 188]], [0.12, [193, 210, 166]],
    [0.28, [168, 194, 139]], [0.48, [140, 175, 114]], [0.70, [116, 156, 95]],
    [1.00, [96, 138, 80]],
  ];
  const ramp = (h) => {
    for (let i = 1; i < RAMP.length; i++) {
      if (h <= RAMP[i][0]) {
        const a = RAMP[i - 1], b = RAMP[i];
        const t = (h - a[0]) / (b[0] - a[0] || 1);
        return [a[1][0] + (b[1][0] - a[1][0]) * t, a[1][1] + (b[1][1] - a[1][1]) * t, a[1][2] + (b[1][2] - a[1][2]) * t];
      }
    }
    return RAMP[RAMP.length - 1][1];
  };

  const small = document.createElement("canvas");
  small.width = RW; small.height = RH;
  const sctx = small.getContext("2d");
  const img = sctx.createImageData(RW, RH);
  for (let j = 0; j < RH; j++) {
    for (let i = 0; i < RW; i++) {
      const h = H[j * RW + i];
      const hx = H[j * RW + Math.min(RW - 1, i + 1)] - H[j * RW + Math.max(0, i - 1)];
      const hy = H[Math.min(RH - 1, j + 1) * RW + i] - H[Math.max(0, j - 1) * RW + i];
      let shade = 1 + (-hx - hy) * 3.6;
      shade = Math.max(0.62, Math.min(1.34, shade));
      const c = ramp(Math.min(1, h));
      const o = (j * RW + i) * 4;
      img.data[o] = Math.min(255, c[0] * shade);
      img.data[o + 1] = Math.min(255, c[1] * shade);
      img.data[o + 2] = Math.min(255, c[2] * shade);
      img.data[o + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);

  const cv = document.createElement("canvas");
  cv.width = MAPW; cv.height = MAPH;
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, MAPW, MAPH);

  // 海を敷き、海岸線の内側にだけ陸を描く。
  // 線と塗りを別々に決めると、岸の形と陸の形が食い違う。
  ctx.fillStyle = U.sea;
  ctx.fillRect(0, 0, MAPW, MAPH);
  ctx.save();
  ctx.beginPath();
  for (const seg of LAND_POLYS) {
    seg.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  }
  ctx.clip();
  ctx.drawImage(small, 0, 0, MAPW, MAPH);
  ctx.restore();

  // 海岸線
  ctx.strokeStyle = "rgba(96,130,152,0.75)"; ctx.lineWidth = 1.8;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const seg of COAST) {
    ctx.beginPath();
    seg.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
  // 湖
  for (const lk of LAKES) {
    ctx.fillStyle = U.sea;
    ctx.beginPath();
    lk.pts.forEach(([lo, la], i) => (i ? ctx.lineTo(px(lo), py(la)) : ctx.moveTo(px(lo), py(la))));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(96,130,152,0.6)"; ctx.lineWidth = 1.4; ctx.stroke();
  }
  // 旧国界
  ctx.strokeStyle = "rgba(120,104,80,0.42)"; ctx.lineWidth = 1.2;
  ctx.setLineDash([7, 5]);
  for (const seg of KUNI_LINES) {
    ctx.beginPath();
    seg.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const [a, b, , kind] of ROADS) {
    if (kind === "海路") continue;
    const A = nodeById(a), B = nodeById(b);
    if (!A || !B) continue;
    // 街道は太い実線、山道は破線、難所はさらに細かい破線で細く
    ctx.strokeStyle = kind === "街道" ? "rgba(176,138,96,0.85)"
      : kind === "難所" ? "rgba(140,112,80,0.42)" : "rgba(176,138,96,0.5)";
    ctx.lineWidth = kind === "街道" ? 2.6 : kind === "難所" ? 1.4 : 2;
    ctx.setLineDash(kind === "街道" ? [] : kind === "難所" ? [3, 5] : [8, 6]);
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  }
  // 海路は波線で
  ctx.strokeStyle = "rgba(96,130,152,0.6)"; ctx.lineWidth = 1.8;
  ctx.setLineDash([4, 5]);
  for (const [a, b, , kind] of ROADS) {
    if (kind !== "海路") continue;
    const A = nodeById(a), B = nodeById(b);
    if (!A || !B) continue;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  }
  ctx.setLineDash([]);
  return cv;
}

