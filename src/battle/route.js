import { FIELD, TERRAIN, 地形の代, terrainAt } from "./field.js";

/* ==========================================================================
   野の道さがし（GDD 8.1 / 8.6）

   隊は行き先へ真っすぐ歩いていた。あいだに川があれば押し渡り、森があれば
   突っ切る。足は落ち、隊列は乱れ、川の中で槍を合わせて負ける。
   橋を目指す道理は入れてあったが、渡り場ひとつを見て曲がるだけの当て推量で
   あったから、蛇行や森や丘がからむと、たちまち破れた。

   道理で曲がるのをやめ、道を引くことにした。野を升目に割り、地物ごとに
   「通りにくさ」を与えて、いちばん安い道を探す（A*）。橋が近ければ橋を通り、
   遠ければ浅瀬へ回り、どちらも法外なら押し渡る。森も丘も湿地も、同じ勘定で
   避けたり抜けたりする。道理を書き足さずに済むのがよい。

   通りにくさは、足の遅さに、そこで戦う危うさを足したもの。
     橋   … 平地よりわずかに高い（狭いので隊が伸びる）
     浅瀬 … 高い。それでも淵よりはるかに安い
     淵   … 法外。塞いではいないので、渡り場が遥かに遠ければ押し渡る
     丘   … 少し高い。ただし登れば見晴らしと戦う力を得るので、法外にはしない
     森・林・湿地・集落 … 足の遅さなり
   ========================================================================== */
export const 通りにくさ = {
  plain: 1.0,
  bridge: 1.15,
  village: 1.6,
  wood: 1.7,
  hill: 2.0,
  forest: 2.6,
  marsh: 4.0,
  ford: 3.2,
  deep: 26,
};

// 押し渡ると決めた隊のための目。水を厭わず、地物だけを避ける。
const 押し渡る目 = { ...通りにくさ, deep: 2.2, ford: 1.4 };

const 費 = (t, 目) => 目[t] || (TERRAIN[t] ? 1 / Math.max(0.08, TERRAIN[t].speed) : 1);

const 升 = 48;
let 網 = null, 網の印 = "";

function 網を張る() {
  const 印 = `${FIELD.w}x${FIELD.h}:${地形の代()}`;
  if (網 && 網の印 === 印) return 網;
  const w = Math.ceil(FIELD.w / 升), h = Math.ceil(FIELD.h / 升);
  const 地 = new Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) 地[j * w + i] = terrainAt(i * 升 + 升 / 2, j * 升 + 升 / 2);
  }
  網 = { w, h, 地 }; 網の印 = 印;
  return 網;
}

/* 小さな二分ヒープ。升目が一万を超えるので、開いた表を舐めていては間に合わない。 */
function ヒープ() {
  const k = [], f = [];
  return {
    len: () => k.length,
    push(key, val) {
      k.push(key); f.push(val);
      let i = k.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (f[p] <= f[i]) break;
        [k[p], k[i]] = [k[i], k[p]]; [f[p], f[i]] = [f[i], f[p]]; i = p;
      }
    },
    pop() {
      const top = k[0];
      const lk = k.pop(), lf = f.pop();
      if (k.length) {
        k[0] = lk; f[0] = lf;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1, r = l + 1;
          let m = i;
          if (l < k.length && f[l] < f[m]) m = l;
          if (r < k.length && f[r] < f[m]) m = r;
          if (m === i) break;
          [k[m], k[i]] = [k[i], k[m]]; [f[m], f[i]] = [f[i], f[m]]; i = m;
        }
      }
      return top;
    },
  };
}

/* 野を行く道。行き着けなければ null（そのときは真っすぐ行くほかない）。

   返すのは曲がり角だけ。隊はこれを順に辿る（engine の c.wp）。 */
export function 野の道(x0, y0, x1, y1, opt = {}) {
  const g = 網を張る();
  const { w, h, 地 } = g;
  const 目 = opt.押し渡る ? 押し渡る目 : 通りにくさ;
  const ix = (x) => Math.max(0, Math.min(w - 1, Math.floor(x / 升)));
  const iy = (y) => Math.max(0, Math.min(h - 1, Math.floor(y / 升)));
  const S = iy(y0) * w + ix(x0), T = iy(y1) * w + ix(x1);
  if (S === T) return null;
  const N = w * h;
  const gc = new Float32Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const 済 = new Uint8Array(N);
  const tx = T % w, ty = (T / w) | 0;
  const 見 = (k) => {
    const i = k % w, j = (k / w) | 0;
    const dx = Math.abs(i - tx), dy = Math.abs(j - ty);
    return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
  };
  const 開 = ヒープ();
  gc[S] = 0; 開.push(S, 見(S));
  let 着 = false, 番 = 0;
  while (開.len() && 番++ < 40000) {
    const cur = 開.pop();
    if (cur === T) { 着 = true; break; }
    if (済[cur]) continue;
    済[cur] = 1;
    const ci = cur % w, cj = (cur / w) | 0;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
        const nk = nj * w + ni;
        if (済[nk]) continue;
        // 斜めは、縦横どちらかが同じくらい安いときだけ（角を舐めて淵へ落ちぬように）
        const 歩 = di && dj ? Math.SQRT2 : 1;
        const c2 = gc[cur] + ((費(地[cur], 目) + 費(地[nk], 目)) / 2) * 歩;
        if (c2 < gc[nk]) { gc[nk] = c2; prev[nk] = cur; 開.push(nk, c2 + 見(nk)); }
      }
    }
  }
  if (!着) return null;
  const 列 = [];
  for (let k = T; k !== -1; k = prev[k]) { 列.push(k); if (k === S) break; }
  列.reverse();
  // 曲がり角だけを残す。まっすぐな区間に地点を置いても意味がない。
  const 道 = [];
  let 前の向き = null;
  for (let n = 1; n < 列.length; n++) {
    const a = 列[n - 1], z = 列[n];
    const v = `${(z % w) - (a % w)},${((z / w) | 0) - ((a / w) | 0)}`;
    if (v !== 前の向き) {
      前の向き = v;
      道.push({ x: (z % w) * 升 + 升 / 2, y: ((z / w) | 0) * 升 + 升 / 2, r: 52 });
    }
  }
  道.push({ x: x1, y: y1, r: 40 });
  return 道;
}

/* この道は、真っすぐ行くのと比べてどれほど高くつくか。
   回り道が法外なら、道さがしを捨てて真っすぐ行かせる目安に使う。 */
export function 道のり(道, x0, y0) {
  let d = 0, px = x0, py = y0;
  for (const p of 道) { d += Math.hypot(p.x - px, p.y - py); px = p.x; py = p.y; }
  return d;
}
