

/* ==========================================================================
   センゴク盤 ─ 尾張・美濃 縦切り試作 v0.2
   GDD v2.0 準拠。地図は段彩陰影の明色系、合戦は10人駒／50人組／武将隊の三層。
   ========================================================================== */
/* ------------------------------------------------------------------ 配色 */
export const U = {
  paper: "#F4F1E8", card: "#FFFFFF", line: "#DED8CA", line2: "#EDE8DC",
  text: "#26262A", dim: "#7C7668", ink: "#1C1C1E",
  sea: "#A9C4D6", river: "#7FA8C4",
};

export const FC = {
  oda: "#2F5D8C", saito: "#9B3A34", yamato: "#8A6A34",
  ise: "#4F7A52", mizuno: "#6B5B7A",
};


export function hash2(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

export function segDist(qx, qy, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
  let t = L ? ((qx - x1) * dx + (qy - y1) * dy) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ax = x1 + t * dx - qx, ay = y1 + t * dy - qy;
  return Math.sqrt(ax * ax + ay * ay);
}


/* -------------------------------------------------------------- 汎用処理 */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const fmt = (n) => Math.round(n).toLocaleString("ja-JP");

export const man = (n) => (n / 10000).toFixed(1);

export const SEASON = (m) => (m <= 2 || m === 12 ? "冬" : m <= 5 ? "春" : m <= 8 ? "夏" : "秋");


export const monthsBetween = (y1, m1, y2, m2) => (y2 - y1) * 12 + (m2 - m1);

export function makeRng(seed) {
  let x = seed || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}

// 勢力色を暗く／明るくする。敵味方は色、直属・地域は明暗と縁で区別する（GDD 6.3）
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
