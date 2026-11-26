import { FIELD, RIVER, RIVERS, TERRAIN, hasRiver, 地形の代, terrainAt } from "./field.js";
import { MAP } from "./castleMap.js";

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
     山   … 丘よりずっと高い。迂回できるなら迂回する
     森・林・湿地・集落 … 足の遅さなり
   ========================================================================== */
export const 通りにくさ = {
  plain: 1.0,
  road: 0.82,          // 街道。踏み固められて歩きよい。道さがしもここを好む
  bridge: 1.15,
  village: 1.6,
  wood: 1.7,
  hill: 2.0,
  mountain: 3.4,      // 山。森より避けたいが、湿地ほどではない。越えられぬわけではない
  forest: 2.6,
  marsh: 4.0,
  ford: 3.2,
  deep: 26,
};

// 押し渡ると決めた隊のための目。水を厭わず、地物だけを避ける。
const 押し渡る目 = { ...通りにくさ, deep: 2.2, ford: 1.4 };
/* 城方が橋を落とした野の目（field.js 橋を落とす）。

   城攻めの盤では、橋は城山の脇に架けてある。橋があれば寄せ手は橋まで回り込み、
   橋が無ければ淵を真っすぐ押し渡った――淵は細いので、遠回りより早く着いてしまう。
   橋を落とした甲斐が無い。城の前の川を、大軍が具足のまま泳いで渡るものではない。
   橋の落ちた野では、淵をよほどのことがなければ渡らぬ重さにして、浅瀬へ回らせる */
const 落橋の目 = { ...通りにくさ, deep: 90 };

const 費 = (t, 目) => 目[t] || (TERRAIN[t] ? 1 / Math.max(0.08, TERRAIN[t].speed) : 1);

const 升 = 48;
export const 渡り場の輪 = 14;        // 渡り場（橋・浅瀬）の脇の曲がり角に着いたとみなす輪（歩。下の 野の道。値は仮）
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
  const 目 = opt.押し渡る ? 押し渡る目 : RIVER.落ちた橋 ? 落橋の目 : 通りにくさ;
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
  /* 渡り場（橋・浅瀬に接する升）の曲がり角は、着いたとみなす輪を狭める（渡り場の輪）。輪が升より広い（五十二歩）と、隊は
     橋の袂の角に着く前に「着いた」ことになり、次の地点（橋の上）へまっすぐ向かって袂の角の淵をかすめた（遊ぶ人の申し出：
     「川を橋などから渡らず川の中腹を渡ったりして止まり、そのまま動かなくなる」。淵の縁を伝って寄るのは battle/engine.js）。
     淵に接するだけの升（岸沿いの曲がり角）までは狭めない。狭めると、隊は角の芯まで寄ろうとして混み合い、森・林・湿地・
     集落にいる刻が増えた（tests/chikei。百分の十三を超えた） */
  const 渡り場の脇か = (k) => {
    const i = k % w, j = (k / w) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
      const t = 地[nj * w + ni];
      if (t === "bridge" || t === "ford") return true;
    }
    return false;
  };
  const 道 = [], 番ら = [];                             // 番ら … 道の地点が 列 の何番目の升か（下の 淵をかすめぬよう繕う）
  let 前の向き = null;
  for (let n = 1; n < 列.length; n++) {
    const a = 列[n - 1], z = 列[n];
    const v = `${(z % w) - (a % w)},${((z / w) | 0) - ((a / w) | 0)}`;
    if (v !== 前の向き) {
      前の向き = v;
      道.push({ x: (z % w) * 升 + 升 / 2, y: ((z / w) | 0) * 升 + 升 / 2, r: 渡り場の脇か(z) ? 渡り場の輪 : 52 }); 番ら.push(n);
    }
  }
  道.push({ x: x1, y: y1, r: 40 }); 番ら.push(列.length - 1);
  /* 城の盤（城山の外の野を含む）では繕わない。城の盤の道は城の道と継いで使い（battle/castleMap.js 継いだ道）、繕いの
     回り道は淵だけを避けて塀や堀を見ないので、橋を落とした城で寄せ手が城山へ着けなくなった（tests/tsukejiro） */
  return MAP ? 道 : 淵をかすめぬよう繕う(道, 番ら, 列, w, x0, y0, x1, y1);
}

/* 二点を結ぶ真っすぐな筋が淵（深い川）をかすめるか。両端は見ず、そのあいだを三歩ごとに見る。
   升は芯の一点で地を見るので、橋の脇の細い淵の角のような、升より細い淵も拾う */
export const 繕いの輪 = 8;          // 繕いで挟んだ地点に着いたとみなす輪（歩。ほぼ通り抜ける。値は仮）
export const 川がある = () => hasRiver() || RIVERS.length > 0;
export function 淵をかすめる(ax, ay, bx, by) {
  if (!川がある()) return false;
  const L = Math.hypot(bx - ax, by - ay), n = Math.ceil(L / 3);
  for (let s = 1; s < n; s++) { const t = s / n; if (terrainAt(ax + (bx - ax) * t, ay + (by - ay) * t) === "deep") return true; }
  return false;
}
/* 隊がいまの所（x, y）で地点 w0 に着いたとして曲がり、次の地点 w1 へ真っすぐ向かうと、淵の角を切るか（battle/engine.js 地点を
   辿る）。地点そのものから次の地点へはかすめない時に限る（道が淵を渡ると決めているなら止めない）。地点から次の地点への
   かすめは、地点に控える（同じ次の地点なら量り直さない）。いまの所からの筋は、はじめの百六十歩だけを見る（曲がる所の
   近くで切るので。長い筋を一刻みごとに舐めない） */
export function 角を切るか(x, y, w0, w1) {
  if (!w1 || !川がある()) return false;
  if (w0.次の印 !== w1 || w0.次の印x !== w1.x || w0.次の印y !== w1.y) { w0.次の印 = w1; w0.次の印x = w1.x; w0.次の印y = w1.y; w0.次かすめ = 淵をかすめる(w0.x, w0.y, w1.x, w1.y); }
  if (w0.次かすめ) return false;
  const L = Math.hypot(w1.x - x, w1.y - y); if (!(L > 0)) return false;
  const 長 = Math.min(L, 160);
  return 淵をかすめる(x, y, x + (w1.x - x) * 長 / L, y + (w1.y - y) * 長 / L);
}
/* 繕い（遊ぶ人の申し出：「5人組で移動していたところ、川でやはり先に進めなくなります。盤の視点でも同じです」）。

   道は曲がり角だけを残すので、角と角を結ぶ真っすぐな筋が、升の並びの通らない淵の端をかすめることがある。升は芯の
   一点で地を見るので、升の並びが淵を通らなくても、斜めに結んだ筋は橋の袂の脇の淵の角を切る。盤の刻みが〇.〇五秒なら
   隊の一歩は四歩ほどあり、その細い淵を跨ぎ越して橋へ乗っていたが、背中越し（微速。一刻み〇.〇〇〇七秒）や盤の微速では
   一歩が細かく、岸と橋の脇の淵とに挟まれた角へ入り込み、行き先へ寄るどの向きも淵で、そこから出られなくなった（量ると、
   同じ道を一刻み〇.〇一秒以下で歩ませると、上司の隊は橋の袂の角で止まって渡れなかった。手勢の有無に関わらない）。
   そこで、淵をかすめる筋は、そのあいだの升の芯を辿り直す。斜めの一歩そのものが淵の角を切るなら、縦横の隣の升の芯を
   挟む。そのうえで、淵をかすめずに真っすぐ結べるいちばん遠い所まで一息に結ぶ（地点を増やしすぎない）。挟んだ地点の
   輪は 繕いの輪 とする（早く「着いた」として角を切らない）。升の並びそのもの（どの橋・浅瀬を通るか）は変えない
   （道の重みを変えると、城攻めの寄せ手が橋を避けて浅瀬へ回った：tests/tsukejiro）。升の並びが淵を通る（押し渡ると決めた
   隊や、渡り場が無い野）なら繕わない */
/* 細かく回る：二点（どちらも淵でない）を、そのまわりだけの細かい升（八歩）で、淵を通らずに結ぶ。斜めの一歩は、縦横の
   隣がどちらも淵でないときだけ（淵の角を切らない）。見つかれば、淵をかすめずに真っすぐ結べるところは一息に結んだ
   あいだの地点（終わりの点は含めない）を返す。見つからなければ null */
const 細升 = 8;
export function 細かく回る(A, Z) {
  const 余 = 64;
  const x0 = Math.max(0, Math.min(A.x, Z.x) - 余), y0 = Math.max(0, Math.min(A.y, Z.y) - 余);
  const x1 = Math.min(FIELD.w, Math.max(A.x, Z.x) + 余), y1 = Math.min(FIELD.h, Math.max(A.y, Z.y) + 余);
  const w = Math.max(1, Math.ceil((x1 - x0) / 細升)), h = Math.max(1, Math.ceil((y1 - y0) / 細升)), N = w * h;
  if (N > 40000) return null;
  const 升の芯 = (k) => ({ x: x0 + (k % w) * 細升 + 細升 / 2, y: y0 + ((k / w) | 0) * 細升 + 細升 / 2 });
  const 番 = (p) => Math.min(h - 1, Math.max(0, ((p.y - y0) / 細升) | 0)) * w + Math.min(w - 1, Math.max(0, ((p.x - x0) / 細升) | 0));
  const S = 番(A), T = 番(Z);
  const 通れ = new Uint8Array(N);
  for (let k = 0; k < N; k++) { const c = 升の芯(k); 通れ[k] = terrainAt(c.x, c.y) !== "deep" ? 1 : 0; }
  通れ[S] = 1; 通れ[T] = 1;
  const gc = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), 済 = new Uint8Array(N);
  const tx = T % w, ty = (T / w) | 0;
  const 見 = (k) => Math.hypot((k % w) - tx, ((k / w) | 0) - ty);
  const 開 = ヒープ(); gc[S] = 0; 開.push(S, 見(S));
  let 着 = false, 回 = 0;
  while (開.len() && 回++ < 60000) {
    const cur = 開.pop();
    if (cur === T) { 着 = true; break; }
    if (済[cur]) continue; 済[cur] = 1;
    const ci = cur % w, cj = (cur / w) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
      const nk = nj * w + ni; if (済[nk] || !通れ[nk]) continue;
      if (di && dj && (!通れ[cj * w + ni] || !通れ[nj * w + ci])) continue;
      const c2 = gc[cur] + (di && dj ? Math.SQRT2 : 1);
      if (c2 < gc[nk]) { gc[nk] = c2; prev[nk] = cur; 開.push(nk, c2 + 見(nk)); }
    }
  }
  if (!着) return null;
  const 列 = [];
  for (let k = T; k !== -1; k = prev[k]) { 列.push(k); if (k === S) break; }
  列.reverse();
  const 並 = [A, ...列.slice(1, -1).map(升の芯), Z];
  const 出 = [];
  let i = 0;
  while (i < 並.length - 1) {
    let j = 並.length - 1;
    while (j > i + 1 && 淵をかすめる(並[i].x, 並[i].y, 並[j].x, 並[j].y)) j--;
    if (j < 並.length - 1) 出.push(並[j]);
    i = j;
  }
  return 出;
}
function 淵をかすめぬよう繕う(道, 番ら, 列, w, x0, y0, x1, y1) {
  const 芯 = (k) => ({ x: (k % w) * 升 + 升 / 2, y: ((k / w) | 0) * 升 + 升 / 2 });
  const 所 = (n) => (n === 0 ? { x: x0, y: y0 } : n === 列.length - 1 ? { x: x1, y: y1 } : 芯(列[n]));
  const 淵か = (p) => terrainAt(p.x, p.y) === "deep";
  const 出 = [];
  let 前 = { x: x0, y: y0 }, 前の番 = 0;
  for (let k = 0; k < 道.length; k++) {
    const 末 = 道[k], 末の番 = 番ら[k];
    let 繕う = 淵をかすめる(前.x, 前.y, 末.x, 末.y) && !淵か(前) && !淵か(末);
    for (let n = 前の番 + 1; 繕う && n < 末の番; n++) if (淵か(所(n))) 繕う = false;   // 升の並びが淵を通るなら、そのまま
    if (!繕う) { 出.push(末); 前 = 末; 前の番 = 末の番; continue; }
    /* あいだの升の芯を並べる（斜めの一歩が淵の角を切るなら、縦横の隣の升の芯を挟む） */
    const 並 = [前];
    for (let n = 前の番 + 1; n <= 末の番; n++) {
      const a = 列[n - 1], z = 列[n], di = (z % w) - (a % w), dj = ((z / w) | 0) - ((a / w) | 0);
      const A = 並[並.length - 1], Z = n === 末の番 ? 末 : 所(n);
      if (di && dj && 淵をかすめる(A.x, A.y, Z.x, Z.y)) {
        for (const 隣 of [a + di, a + dj * w]) {
          const C = 芯(隣);
          if (!淵か(C) && !淵をかすめる(A.x, A.y, C.x, C.y) && !淵をかすめる(C.x, C.y, Z.x, Z.y)) { 並.push(C); break; }
        }
      }
      並.push(Z);
    }
    /* 淵をかすめずに結べるいちばん遠い所まで、一息に結ぶ。隣の地点へさえ淵をかすめずに行けなければ（升より細い淵の
       割れ目が、岸の窪みと浅瀬・橋とのあいだにあるとき）、そのあいだを細かい升で探し直す（下の 細かく回る） */
    let i = 0;
    while (i < 並.length - 1) {
      let j = 並.length - 1;
      while (j > i + 1 && 淵をかすめる(並[i].x, 並[i].y, 並[j].x, 並[j].y)) j--;
      if (j === i + 1 && 淵をかすめる(並[i].x, 並[i].y, 並[j].x, 並[j].y)) {
        const 回り = 細かく回る(並[i], 並[j]);
        if (回り) for (const p of 回り) 出.push({ x: p.x, y: p.y, r: 繕いの輪 });
      }
      出.push(j === 並.length - 1 ? 末 : { x: 並[j].x, y: 並[j].y, r: 繕いの輪 });
      i = j;
    }
    前 = 末; 前の番 = 末の番;
  }
  return 出;
}

/* この道は、真っすぐ行くのと比べてどれほど高くつくか。
   回り道が法外なら、道さがしを捨てて真っすぐ行かせる目安に使う。 */
export function 道のり(道, x0, y0) {
  let d = 0, px = x0, py = y0;
  for (const p of 道) { d += Math.hypot(p.x - px, p.y - py); px = p.x; py = p.y; }
  return d;
}
