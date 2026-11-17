/* ==========================================================================
   背中越しの視点（一人働きの一人視点）

   盤の合戦の兵を、与平の背中越しに描く。兵は新しく作らない。一人ずつの絵
   （battle/shinga.js）が組ごとに持っている兵――居所（sx・sy）・向き（描）・
   歩いた道のり（歩距）・足の速さ（速）・生き死に（生）――をそのまま読み、組の
   噛み合い（噛）・構え（構）・放った刻（撃刻）で、突き・構え・放ち・歩みを決める。
   一人ずつの揺らぎ（背丈・体格・被り物・立ち所のずれ）も、寄って描くときと同じ式
   （shinga.js 新絵の兵描き）で付ける。だから、盤で寄って見る兵と、背中越しに見える
   兵は、同じ兵が同じ拍子で動く。倒れた者も、盤の倒れ（盤の見た目(b).倒れ）を描く。

   ここは読むだけで、盤にも組にも書かない（shinga.js と同じ決まり）。ただし、盤の画面が
   描いていないあいだも与平のまわりの組の見た目は進めたいので、盤の画面が呼ぶのと
   同じ 新絵状態を進める を、与平のまわりの範囲で呼ぶ。

   長さ：一歩＝〇.四六m。組の持ち場の間隔（横一.九歩・前後二.六歩、shinga.js 持場）を、
   槍足軽の間隔（横およそ〇.九m・前後およそ一.二m）に合わせた見立てである。
   世界の座標（m）：東が x、北が z、上が y。盤の座標（x 右・y 下）から x＝盤x×尺、z＝−盤y×尺。

   まだ描かないもの：丘・山の高さ（地は平らに描く）、本陣衆（将・旗持・馬廻）、町家。
   ========================================================================== */
import { 組の見た目, 盤の見た目, 新絵状態を進める, 野の川筋 } from "../battle/shinga.js";
import { FORESTS, WOODS, ROADS, fieldScale } from "../battle/field.js";

export const 歩の尺 = 0.46;
const 尺 = 歩の尺;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, u) => a + (b - a) * u;
const sm = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const 世へ = (bx, by) => [bx * 尺, -by * 尺];                         // 盤 → 世界（m）
const 向きを世へ = (th) => [Math.cos(th), -Math.sin(th)];             // 盤の角 → 世界の向き（単位の長さ）
const 鳴 = (a, b2) => ((Math.imul(a | 0, 2654435761) ^ Math.imul((b2 | 0) + 1, 40503)) >>> 0);

/* ---------- 与平の組と、与平の立ち所 ---------- */
/* 与平の組：選んだ隊（無ければ、敵の組にいちばん近い組を持つ味方の隊）のうち、敵にいちばん近い組 */
export function 与平の組を選ぶ(b, 隊id) {
  const 生 = (c) => !c.dead && !c.destroyed && (c.squads || []).some((q) => q.men > 0);
  const 我ら = (b.corps || []).filter((c) => c.side === "P" && !c.日和見 && 生(c));
  const 敵組 = []; for (const c of b.corps || []) if (c.side !== "P" && 生(c)) for (const q of c.squads || []) if (q.men > 0) 敵組.push(q);
  const 敵までの隔 = (q) => { let m = 1e12; for (const e of 敵組) { const d = (e.x - q.x) ** 2 + (e.y - q.y) ** 2; if (d < m) m = d; } return m; };
  let 隊 = 我ら.find((c) => c.id === 隊id) || null;
  if (!隊) { let m = 1e13; for (const c of 我ら) for (const q of c.squads || []) if (q.men > 0) { const d = 敵までの隔(q); if (d < m) { m = d; 隊 = c; } } }
  if (!隊) return null;
  let 組 = null, m2 = 1e13; for (const q of 隊.squads || []) if (q.men > 0) { const d = 敵までの隔(q); if (d < m2) { m2 = d; 組 = q; } }
  return 組 ? { 隊, 組 } : null;
}
/* 与平の立ち所：組の後ろの列のさらに一歩半うしろ、真ん中。組の向きを向く（盤の座標と角）。
   いまは見るための仮の立ち所で、組と一緒に動く（自分で動かすのは次の段） */
export function 与平の所(q) {
  const s = 組の見た目(q);
  if (!s || !s.初) return { x: q.x, y: q.y, 向: q.facing || 0, 初: false };
  const th = s.向, 後 = 2.4 + 1.5;                       // 五の列（持場の奥 二.四歩）のうしろ一.五歩
  return { x: s.dx - Math.cos(th) * 後, y: s.dy - Math.sin(th) * 後, 向: th, 初: true };
}

/* ---------- 眺めを集める（読むだけ。試験からも呼ぶ） ----------
   我 … { x, y }（盤の座標）。半径 R（m）のうちの、立っている兵と倒れた者を、世界の座標で返す。
   兵の働き：突（噛み合って前の二列）・構（構えて前の二列）・放（弓・鉄砲を放って一.五秒のうち）・歩・立 */
export function 眺めを集める(b, 我, R = 110) {
  const 兵 = [], 倒れ = [];
  const [wx0, wz0] = 世へ(我.x, 我.y), R歩 = R / 尺, 尺2 = fieldScale();
  for (const c of b.corps || []) {
    if (c.dead || c.destroyed) continue;
    const 側 = c.日和見 ? "Y" : (c.side === "P" ? "P" : "E");
    for (const q of c.squads || []) {
      if (!(q.men > 0)) continue;
      if (Math.abs(q.x - 我.x) > R歩 + 60 || Math.abs(q.y - 我.y) > R歩 + 60) continue;
      const s = 組の見た目(q); if (!s || !s.初) continue;
      const alive = Math.max(0, Math.min(50, Math.round(q.men)) - (s.借り || 0));
      const 撃 = (b.t - s.撃刻) / 1.5, 型 = q.type || "yari", 歩幅 = (型 === "kiba" ? 14 : 9) * 尺2;
      for (let n = 0; n < alive; n++) {
        if (!s.生[n]) continue;
        const h = (Math.imul((q.seed || 0) + 7, 2654435761) ^ Math.imul(n + 1, 40503)) >>> 0;
        const [x, z] = 世へ(s.sx[n] + (((h >>> 21) % 7) - 3) * 0.22, s.sy[n] + (((h >>> 24) % 7) - 3) * 0.22);
        if (Math.hypot(x - wx0, z - wz0) > R) continue;
        const [fx, fz] = 向きを世へ(s.描[n]), 列 = (n / 10) | 0, 歩速 = s.速[n];
        let 働 = "立", 相 = 0;
        if (s.噛 && 列 < 2 && 歩速 < 14 * 尺2) { 働 = "突"; 相 = (b.t * 0.55 + (q.seed || 0) + n * 0.17) % 1; }
        else if (s.構 && 列 < 2 && 歩速 < 14 * 尺2) 働 = "構";
        else if (撃 >= 0 && 撃 < 1 && (型 === "yumi" || 型 === "teppo")) { 働 = "放"; 相 = 撃; }
        else if (歩速 > 2.5 * 尺2) 働 = "歩";
        const 癖r = (h >>> 27) % 16;
        兵.push({ x, z, fx, fz, 側, 型, 働, 相, 歩: (s.歩距[n] / 歩幅) % 1, v: 歩速 * 尺,
          丈: 0.9 + ((h >>> 3) % 21) / 100, 幅: 0.92 + ((h >>> 9) % 17) / 100, 癖: 癖r < 8 ? 0 : 癖r < 12 ? 1 : 癖r < 15 ? 2 : 3, 鍵: h, 組: q, 番: n });
      }
    }
  }
  for (const e of 盤の見た目(b).倒れ) { const [x, z] = 世へ(e.x, e.y); if (Math.hypot(x - wx0, z - wz0) <= R) 倒れ.push({ x, z, 側: e.s, 鍵: 鳴(Math.round(e.x * 7), Math.round(e.y * 7)) }); }
  return { 兵, 倒れ };
}

/* ---------- 背中の眺めを始める・描く ---------- */
export function 背中を始める(b, 隊id) {
  const 選 = 与平の組を選ぶ(b, 隊id);
  if (!選) return null;
  return { 隊: 選.隊, 組: 選.組, 名: 選.隊.name, cam: null, 前秒: 0, 我歩: 0, 我前: null };
}

/* 写し（カメラ）。与平の後ろ上から、組の向きに合わせて見る（右の肩越し） */
const 引き = 5.0, 高 = 3.3, 俯 = 13 * Math.PI / 180, 肩 = 0.85;
let C = null, W = 0, H = 0, F = 0;
function 写しを据える(cam, w, h) {
  W = w; H = h; F = w * 0.6;
  C = { x: cam.x, z: cam.z, fx: cam.fx, fz: cam.fz, rx: cam.fz, rz: -cam.fx, cs: Math.cos(俯), sn: Math.sin(俯) };
}
function P(x, y, z) {
  const dx = x - C.x, dz = z - C.z; const rx = dx * C.rx + dz * C.rz, rz = dx * C.fx + dz * C.fz, ry = y - 高;
  const yc = ry * C.cs + rz * C.sn, zc = -ry * C.sn + rz * C.cs;
  return [W / 2 + F * rx / zc, H / 2 - F * yc / zc, zc];
}
const 奥 = (x, z) => (x - C.x) * C.fx + (z - C.z) * C.fz;            // カメラの前へどれだけ奥か（m）
const 水平 = () => H / 2 - F * Math.tan(俯);
const 霞色 = [198, 202, 200];
function 霞(rgb, d, k = 90) { const t = 1 - Math.exp(-Math.max(0, d - 6) / k); return `rgb(${Math.round(rgb[0] + (霞色[0] - rgb[0]) * t)},${Math.round(rgb[1] + (霞色[1] - rgb[1]) * t)},${Math.round(rgb[2] + (霞色[2] - rgb[2]) * t)})`; }
const 色 = {
  P: { 縅: [56, 96, 156], 布: [42, 52, 76], 旗: [40, 72, 130] },
  E: { 縅: [176, 72, 58], 布: [76, 56, 46], 旗: [178, 64, 50] },
  Y: { 縅: [196, 160, 62], 布: [92, 80, 50], 旗: [200, 168, 70] },
};

export function 背中を描く(ctx, b, 態, w, h, dpr, nowSec) {
  if (!態.組 || !(態.組.men > 0)) { const 選 = 与平の組を選ぶ(b, 態.隊 && 態.隊.id); if (選) { 態.組 = 選.組; 態.隊 = 選.隊; 態.名 = 選.隊.name; } }
  const q = 態.組;
  /* 与平のまわりの組の見た目を進める（盤の画面が描いていないあいだも、同じ関数で） */
  const R歩 = 300;
  if (q) 新絵状態を進める(b, nowSec, { x0: q.x - R歩, x1: q.x + R歩, y0: q.y - R歩, y1: q.y + R歩 });
  const 我盤 = q ? 与平の所(q) : { x: 0, y: 0, 向: -Math.PI / 2 };
  const [mx, mz] = 世へ(我盤.x, 我盤.y), [mfx, mfz] = 向きを世へ(我盤.向);
  const dt = 態.前秒 ? clamp(nowSec - 態.前秒, 0, 0.1) : 0; 態.前秒 = nowSec;
  if (態.我前) 態.我歩 += Math.hypot(mx - 態.我前[0], mz - 態.我前[1]); const 我速 = 態.我前 && dt > 0 ? Math.hypot(mx - 態.我前[0], mz - 態.我前[1]) / dt : 0; 態.我前 = [mx, mz];
  /* カメラはなめらかに寄せる（揺らさない）。向きも角で均す */
  const 的 = { x: mx - mfx * 引き + mfz * 肩, z: mz - mfz * 引き - mfx * 肩, a: Math.atan2(mfz, mfx) };
  if (!態.cam) 態.cam = { x: 的.x, z: 的.z, a: 的.a };
  else { const k = 1 - Math.exp(-dt * 4); 態.cam.x += (的.x - 態.cam.x) * k; 態.cam.z += (的.z - 態.cam.z) * k;
    let da = 的.a - 態.cam.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; 態.cam.a += da * (1 - Math.exp(-dt * 2.5)); }
  const fx = Math.cos(態.cam.a), fz = Math.sin(態.cam.a);
  筆 = ctx; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  写しを据える({ x: 態.cam.x, z: 態.cam.z, fx, fz }, w, h);
  空と地を描く(ctx, 態.cam.a);
  草を描く(ctx);
  帯を描く(ctx, 野の川筋(), [92, 132, 160], 0.62);
  帯を描く(ctx, ROADS, [172, 152, 116], 1);
  /* 立つもの（木・兵・倒れた者・与平）を奥から描く */
  const 眺 = 眺めを集める(b, 我盤, 110);
  const 物 = [];
  木を集める(物);
  const [psx, , pzc] = P(mx, 0, mz), 我幅 = 0.5 * F / Math.max(0.5, pzc);
  let 兵ら = 眺.兵.map((p) => ({ p, d: 奥(p.x, p.z) })).filter((o) => o.d > 0.8);
  if (兵ら.length > 1500) { 兵ら.sort((a, z) => a.d - z.d); 兵ら = 兵ら.slice(0, 1500); }
  for (const { p, d } of 兵ら) {
    const [sx, , zc] = P(p.x, 0, p.z); if (sx < -200 || sx > W + 200) continue;
    const 透 = d < pzc - 0.3 && Math.abs(sx - psx) < 0.42 * F / zc + 我幅;
    物.push({ d, f: () => 一人を描く(ctx, p, nowSec, 透 ? 0.32 : 1) });
  }
  for (const e of 眺.倒れ) { const d = 奥(e.x, e.z); if (d > 0.8) 物.push({ d, f: () => 倒れを描く(ctx, e) }); }
  物.push({ d: 奥(mx, mz), f: () => { 輪(ctx, mx, mz, 0.55, 0.55); 一人を描く(ctx, { x: mx, z: mz, fx: mfx, fz: mfz, 側: "P", 型: "yari", 働: q && 組の見た目(q) && 組の見た目(q).噛 ? "構" : (我速 > 0.6 ? "歩" : "立"), 相: 0, 歩: (態.我歩 / (9 * fieldScale() * 尺)) % 1, v: 我速, 丈: 1.02, 幅: 1.02, 癖: 0, 鍵: 7, 我: true }, nowSec, 1); } });
  物.sort((a, z) => z.d - a.d).forEach((o) => o.f());
  霞の帯(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { 兵: 眺.兵.length, 倒れ: 眺.倒れ.length, 描いた: 兵ら.length };
}

/* ---------- 空・地・草・帯（街道と川）・木 ---------- */
function 空と地を描く(ctx, a) {
  const hz = 水平();
  const gr = ctx.createLinearGradient(0, 0, 0, hz + 10); gr.addColorStop(0, "#97A3AA"); gr.addColorStop(0.65, "#C0C6C6"); gr.addColorStop(1, "#D2D5D0");
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, hz + 12);
  /* 遠山は向きにつれて横へ流れる（一回りで元へ戻る形） */
  const 山 = (amp, col, 周, ph) => { ctx.beginPath(); ctx.moveTo(0, hz + 2); const off = a * F * 0.9;
    for (let x = 0; x <= W + 8; x += 8) { const u = (x + off) / 周; ctx.lineTo(x, hz - amp * (0.5 + 0.5 * Math.sin(u * 0.8 + ph)) * (0.55 + 0.45 * Math.sin(u * 0.33 + ph * 2))); }
    ctx.lineTo(W, hz + 2); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
  山(46, "rgba(118,130,138,.55)", 70, 1.3); 山(24, "rgba(100,114,116,.72)", 52, 0.4);
  const gg = ctx.createLinearGradient(0, hz, 0, H); gg.addColorStop(0, "#A7AD95"); gg.addColorStop(0.2, "#8C9668"); gg.addColorStop(1, "#6A6A43");
  ctx.fillStyle = gg; ctx.fillRect(0, hz, W, H - hz);
}
/* 草：地の升目ごとに一本（升目の番から決めるので、カメラが動いても地に据わったまま） */
const 草色 = [[186, 176, 98], [120, 138, 76], [90, 102, 58]];
function 草を描く(ctx) {
  const 帯 = [[0.55, 15], [1.8, 42], [5.5, 120]];
  const 束 = [[], [], []];
  let 下 = 0;
  for (const [升, 遠] of 帯) {
    const i0 = Math.floor((C.x - 遠) / 升), i1 = Math.floor((C.x + 遠) / 升), j0 = Math.floor((C.z - 遠) / 升), j1 = Math.floor((C.z + 遠) / 升);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const h = 鳴(i * 7919 + 下, j * 104729); const x = (i + (h & 1023) / 1024) * 升, z = (j + ((h >>> 10) & 1023) / 1024) * 升;
      const d = 奥(x, z); if (d < Math.max(0.6, 下) || d > 遠) continue;
      const [sx, sy, zc] = P(x, 0, z); if (sy > H + 4 || sx < -20 || sx > W + 20) continue;
      const hh = (0.14 + ((h >>> 20) & 255) / 255 * 0.3) * F / zc, lean = (((h >>> 28) & 15) / 15 - 0.5) * hh * 0.5;
      束[(h >>> 13) % 3].push(sx, sy, sx + lean, sy - hh, d);
    }
    下 = 遠 * 0.92;
  }
  ctx.lineCap = "butt";
  for (let c = 0; c < 3; c++) { const s = 束[c];
    for (const [d0, d1] of [[0, 8], [8, 20], [20, 45], [45, 130]]) {
      ctx.beginPath(); let n = 0;
      for (let i = 0; i < s.length; i += 5) { const d = s[i + 4]; if (d < d0 || d >= d1) continue; ctx.moveTo(s[i], s[i + 1]); ctx.lineTo(s[i + 2], s[i + 3]); n++; }
      if (!n) continue; const mid = (d0 + d1) / 2; ctx.strokeStyle = 霞(草色[c], mid, 60); ctx.lineWidth = Math.max(0.6, 2.6 / Math.sqrt(Math.max(1, mid))); ctx.stroke(); } }
}
/* 街道・川：折れ線を短く刻んで、カメラの前にある切れだけを地に塗る */
function 帯を描く(ctx, 帯ら, rgb, 濃) {
  for (const r of 帯ら || []) {
    const 節 = r.節 || []; if (節.length < 2) continue;
    const 半 = (r.幅 || 40) * 尺 / 2;
    ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${濃})`;
    for (let i = 0; i < 節.length - 1; i++) {
      const p0 = 節[i], p1 = 節[i + 1]; const ax = (p0[0] ?? p0.x) * 尺, az = -(p0[1] ?? p0.y) * 尺, bx = (p1[0] ?? p1.x) * 尺, bz = -(p1[1] ?? p1.y) * 尺;
      const L = Math.hypot(bx - ax, bz - az); if (!L) continue;
      if (Math.min(Math.hypot(ax - C.x, az - C.z), Math.hypot(bx - C.x, bz - C.z)) > 220 + L) continue;
      const nx = -(bz - az) / L * 半, nz = (bx - ax) / L * 半, 刻 = Math.max(1, Math.ceil(L / 3));
      ctx.beginPath(); let 有 = false;
      for (let k = 0; k < 刻; k++) {
        const u0 = k / 刻, u1 = (k + 1) / 刻; const x0 = lerp(ax, bx, u0), z0 = lerp(az, bz, u0), x1 = lerp(ax, bx, u1), z1 = lerp(az, bz, u1);
        const 角 = [[x0 + nx, z0 + nz], [x1 + nx, z1 + nz], [x1 - nx, z1 - nz], [x0 - nx, z0 - nz]];
        if (角.some(([x, z]) => 奥(x, z) < 0.6) || 角.every(([x, z]) => 奥(x, z) > 200)) continue;
        const pts = 角.map(([x, z]) => P(x, 0, z)); ctx.moveTo(pts[0][0], pts[0][1]); for (let m = 1; m < 4; m++) ctx.lineTo(pts[m][0], pts[m][1]); ctx.closePath(); 有 = true;
      }
      if (有) ctx.fill();
    }
  }
}
function 木を集める(物) {
  for (const 群 of [FORESTS, WOODS]) for (const o of 群) {
    const cx = o.x * 尺, cz = -o.y * 尺, r = o.r * 尺; if (Math.hypot(cx - C.x, cz - C.z) - r > 130) continue;
    const 間 = 群 === FORESTS ? 5.5 : 8;
    const i0 = Math.floor((cx - r) / 間), i1 = Math.floor((cx + r) / 間), j0 = Math.floor((cz - r) / 間), j1 = Math.floor((cz + r) / 間);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const h = 鳴(i * 31 + 5, j * 17 + (群 === FORESTS ? 1 : 2)); const x = (i + (h & 255) / 256) * 間, z = (j + ((h >>> 8) & 255) / 256) * 間;
      if (Math.hypot(x - cx, z - cz) > r) continue; const d = 奥(x, z); if (d < 1.5 || d > 130) continue;
      const 丈 = 8 + ((h >>> 16) & 255) / 255 * 5; 物.push({ d, f: () => 杉(x, z, 丈, d) });
    }
  }
}
let 筆 = null;                                            // いま描いている画布（背中を描く が据える）
function 杉(x, z, h, d) { const ctx = 筆; const [sx, sy, zc] = P(x, 0, z); if (zc < 1 || sx < -250 || sx > W + 250) return; const s = F / zc;
  const 幹 = 霞([70, 58, 44], d, 70), 葉 = 霞([44, 68, 50], d, 65), 葉2 = 霞([60, 88, 62], d, 65);
  ctx.fillStyle = 幹; ctx.fillRect(sx - 0.13 * s, sy - h * 0.36 * s, 0.26 * s, h * 0.36 * s);
  for (let k = 0; k < 5; k++) { const y0 = sy - h * (0.22 + k * 0.155) * s, ww = (1.7 - k * 0.27) * s; ctx.fillStyle = k % 2 ? 葉2 : 葉; ctx.beginPath(); ctx.moveTo(sx - ww, y0); ctx.lineTo(sx, y0 - h * 0.3 * s); ctx.lineTo(sx + ww, y0); ctx.closePath(); ctx.fill(); } }
function 霞の帯(ctx) { const hz = 水平(); const gr = ctx.createLinearGradient(0, hz - 40, 0, hz + 60); gr.addColorStop(0, "rgba(214,216,210,0)"); gr.addColorStop(0.5, "rgba(214,216,210,.3)"); gr.addColorStop(1, "rgba(214,216,210,0)"); ctx.fillStyle = gr; ctx.fillRect(0, hz - 40, W, 100);
  const v = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.4, W / 2, H * 0.55, W * 0.78); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.34)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }
function 輪(ctx, x, z, rx, rz) { ctx.beginPath(); for (let k = 0; k <= 40; k++) { const a = (k / 40) * Math.PI * 2; const [sx, sy] = P(x + Math.cos(a) * rx, 0, z + Math.sin(a) * rz); k ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); } ctx.closePath(); ctx.strokeStyle = "rgba(240,214,130,.95)"; ctx.lineWidth = 2.6; ctx.stroke(); }

/* ---------- 一人を描く ----------
   体は平らな絵（カメラに向けて立てる）。背中が見えるか顔が見えるかは、兵の向きとカメラの向きで決める。
   槍・鉄砲・弓は、兵の向きに沿って長さを持つ線として遠近で描く。騎馬は馬の上に人を描く。 */
function 線3(ctx, a, b2, w0, w1, rgb, d) {
  const [ax, ay, az] = P(...a), [bx, by, bz] = P(...b2); if (az < 0.5 || bz < 0.5) return null;
  const wa = Math.max(0.7, w0 * F / az), wb = Math.max(0.6, w1 * F / bz); const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  ctx.fillStyle = 霞(rgb, d, 120); ctx.beginPath(); ctx.moveTo(ax + nx * wa / 2, ay + ny * wa / 2); ctx.lineTo(bx + nx * wb / 2, by + ny * wb / 2); ctx.lineTo(bx - nx * wb / 2, by - ny * wb / 2); ctx.lineTo(ax - nx * wa / 2, ay - ny * wa / 2); ctx.closePath(); ctx.fill();
  return [bx, by, bz, nx, ny];
}
function 槍(ctx, a, b2, d) { const r = 線3(ctx, a, b2, 0.05, 0.04, [64, 48, 32], d); if (!r) return; const [bx, by, bz, nx, ny] = r;
  const t = 0.3 / Math.hypot(b2[0] - a[0], b2[1] - a[1], b2[2] - a[2]); const [mx, my, mz] = P(b2[0] - (b2[0] - a[0]) * t, b2[1] - (b2[1] - a[1]) * t, b2[2] - (b2[2] - a[2]) * t); const wm = Math.max(1, 0.07 * F / mz);
  ctx.fillStyle = 霞([206, 212, 218], d, 120); ctx.beginPath(); ctx.moveTo(mx + nx * wm / 2, my + ny * wm / 2); ctx.lineTo(bx, by); ctx.lineTo(mx - nx * wm / 2, my - ny * wm / 2); ctx.closePath(); ctx.fill(); }
const 突きの伸び = (ph) => (ph < 0.45 ? -0.35 * Math.sin((ph / 0.45) * Math.PI / 2) : ph < 0.6 ? lerp(-0.35, 1, (ph - 0.45) / 0.15) : lerp(1, 0, sm((ph - 0.6) / 0.4)));
function 一人を描く(ctx, p, t, al) {
  筆 = ctx;
  const d = 奥(p.x, p.z); const [sx, sy, zc] = P(p.x, 0, p.z); if (zc < 0.9) return;
  const s = (sy - P(p.x, 1, p.z)[1]) * p.丈; if (s < 1.2) return;
  const 近 = p.我 ? 1 : clamp((zc - 1.6) / 1.4, 0, 1); if (近 <= 0.01) return;
  ctx.globalAlpha = al * 近;
  const 前 = p.fx * C.fx + p.fz * C.fz < 0;              // 顔がカメラを向いているか
  const 色組 = 色[p.側] || 色.P;
  const c = (rgb) => 霞(rgb, d, 120);
  const 漆 = c(p.我 ? [26, 25, 30] : [30, 30, 35]), 縅 = c(色組.縅), 布 = c(色組.布), 脛 = c([156, 146, 122]), 肌 = c([204, 166, 132]), 髪 = c([26, 24, 24]), 金 = c([226, 196, 110]);
  const 騎 = p.型 === "kiba";
  const 下 = 騎 ? 1.12 : 0;                                  // 騎馬は人を馬の背に載せる
  const X = (v) => sx + v * s * p.幅, Y = (v) => sy - (v + 下) * s;
  const 線 = (pts, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.8, w * s); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); pts.forEach(([a, b2], i) => (i ? ctx.lineTo(X(a), Y(b2)) : ctx.moveTo(X(a), Y(b2)))); ctx.stroke(); };
  const 細 = s > 16, 粗 = s < 6;
  /* 右手の所（世界）：兵から見て右。槍は兵の向きに沿う */
  const rx = p.fz, rz = -p.fx;
  const 手 = (前後, 高さ) => [p.x + rx * 0.3 * p.幅 + p.fx * 前後, (高さ + 下) * p.丈, p.z + rz * 0.3 * p.幅 + p.fz * 前後];
  /* 馬 */
  if (騎) {
    const 馬 = c([92, 66, 44]), 馬暗 = c([58, 42, 30]), sw = Math.sin((p.歩 || 0) * Math.PI * 2) * (p.働 === "歩" ? 0.12 : 0);
    const MX = (v) => sx + v * s, MY = (v) => sy - v * s;
    ctx.strokeStyle = 馬暗; ctx.lineWidth = Math.max(0.8, 0.07 * s); ctx.lineCap = "round";
    for (const [lx, ph] of [[-0.17, 0], [0.17, 1], [-0.11, 1], [0.11, 0]]) { ctx.beginPath(); ctx.moveTo(MX(lx), MY(1.0)); ctx.lineTo(MX(lx + (ph ? sw : -sw) * 0.3), MY(0.04 + (ph ? Math.max(0, sw) : Math.max(0, -sw)))); ctx.stroke(); }
    ctx.fillStyle = 馬; ctx.beginPath(); ctx.ellipse(MX(0), MY(1.22), 0.27 * s, 0.27 * s, 0, 0, 7); ctx.fill();
    if (前) { ctx.fillStyle = 馬暗; ctx.beginPath(); ctx.ellipse(MX(0), MY(1.55), 0.1 * s, 0.26 * s, 0, 0, 7); ctx.fill(); ctx.fillStyle = 馬; ctx.beginPath(); ctx.ellipse(MX(0), MY(1.32), 0.09 * s, 0.17 * s, 0, 0, 7); ctx.fill(); }
    else { ctx.strokeStyle = 馬暗; ctx.lineWidth = Math.max(0.8, 0.06 * s); ctx.beginPath(); ctx.moveTo(MX(0), MY(1.2)); ctx.quadraticCurveTo(MX(0.05), MY(0.9), MX(0.02), MY(0.7)); ctx.stroke(); }
  }
  /* 指物（背の小旗）：背中が見えるなら体の後で、顔が見えるなら体の前に描く */
  const 旗 = () => { if (粗) return; const 高 = (p.我 ? 2.75 : 2.45); let sg = 前 ? -1 : 1; if (p.我) sg = -sg; const 旗色 = c(色組.旗);
    線([[0.02 * sg, 1.2], [0.02 * sg, 高]], 0.03, c([58, 46, 32]));
    ctx.fillStyle = 旗色; ctx.beginPath(); ctx.moveTo(X(0.02 * sg), Y(高)); ctx.lineTo(X(0.34 * sg), Y(高)); ctx.lineTo(X(0.34 * sg), Y(高 - 0.62)); ctx.lineTo(X(0.02 * sg), Y(高 - 0.62)); ctx.closePath(); ctx.fill();
    if (p.我) { ctx.strokeStyle = 金; ctx.lineWidth = Math.max(1.2, 0.035 * s); ctx.stroke(); }   // 与平の小旗は金の縁で見分ける
    if (s > 22) { ctx.fillStyle = c([238, 232, 216]); ctx.beginPath(); ctx.arc(X(0.18 * sg), Y(高 - 0.31), 0.08 * s, 0, 7); ctx.fill(); } };
  if (前) 旗();
  /* 脚（騎馬の人は鞍の上で、脚は短く垂らす） */
  if (!騎) {
    const A = lerp(0.055, 0.13, clamp((p.v - 2) / 1.5, 0, 1)) * clamp(p.v / 0.5, 0, 1) * (p.働 === "歩" || p.我 ? 1 : 0.4), φ = (p.歩 || 0) * Math.PI * 2;
    for (const k of [-1, 1]) { const lift = A * Math.max(0, Math.sin(φ + (k < 0 ? 0 : Math.PI)));
      線([[k * 0.1, 0.86], [k * 0.12, 0.48 + lift * 0.6], [k * 0.13, 0.1 + lift]], 0.12, 布);
      if (!粗) 線([[k * 0.12, 0.42 + lift * 0.8], [k * 0.13, 0.12 + lift]], 0.105, 脛);
      ctx.fillStyle = 漆; ctx.beginPath(); ctx.ellipse(X(k * 0.13), Y(0.05 + lift), 0.08 * s, 0.04 * s, 0, 0, 7); ctx.fill(); }
  } else { for (const k of [-1, 1]) 線([[k * 0.2, 0.86], [k * 0.3, 0.5]], 0.1, 布); }
  /* 胴・草摺・腕 */
  ctx.fillStyle = 漆; ctx.fillRect(X(-0.26), Y(0.98), 0.52 * s * p.幅, 0.3 * s);
  ctx.beginPath(); ctx.moveTo(X(-0.22), Y(0.97)); ctx.lineTo(X(-0.26), Y(1.36)); ctx.quadraticCurveTo(X(0), Y(1.47), X(0.26), Y(1.36)); ctx.lineTo(X(0.22), Y(0.97)); ctx.closePath(); ctx.fill();
  if (細) { for (let k = 0; k < 4; k++) 線([[-0.22, 1.04 + k * 0.085], [0.22, 1.04 + k * 0.085]], 0.032, 縅); for (let k = 1; k < 5; k++) 線([[-0.26 + k * 0.104, 0.97], [-0.26 + k * 0.104, 0.69]], 0.012, 縅); }
  else if (!粗) 線([[-0.22, 1.12], [0.22, 1.12]], 0.06, 縅);
  const 腕型 = p.働 === "突" || p.働 === "構" ? "構" : p.働 === "歩" && p.型 === "yari" ? "肩" : "立";
  if (!粗) { const 腕 = 前 ? [[[0.26, 1.36], [0.34, 1.12], [0.22, 1.02]], [[-0.26, 1.36], [-0.32, 1.12], [-0.06, 1.04]]]
      : 腕型 === "肩" ? [[[0.26, 1.36], [0.4, 1.2], [0.3, 1.4]], [[-0.26, 1.36], [-0.33, 1.12], [-0.3, 0.92]]]
      : 腕型 === "構" ? [[[0.26, 1.36], [0.36, 1.14], [0.24, 1.04]], [[-0.26, 1.36], [-0.3, 1.14], [-0.04, 1.08]]]
      : [[[0.26, 1.36], [0.35, 1.12], [0.33, 0.98]], [[-0.26, 1.36], [-0.32, 1.1], [-0.3, 0.92]]];
    for (const a of 腕) { 線(a.slice(0, 2), 0.1, 布); 線(a.slice(1), 0.085, 漆); } }
  /* 頭と被り物（癖：〇・一 陣笠、二 鉢巻、三 頭形兜） */
  if (前) { ctx.fillStyle = 肌; ctx.beginPath(); ctx.ellipse(X(0), Y(1.55), 0.1 * s, 0.12 * s, 0, 0, 7); ctx.fill(); }
  else { ctx.fillStyle = 髪; ctx.beginPath(); ctx.ellipse(X(0), Y(1.55), 0.1 * s, 0.115 * s, 0, 0, 7); ctx.fill(); }
  if (p.癖 === 2) { 線([[-0.1, 1.6], [0.1, 1.6]], 0.035, c([236, 232, 220])); }
  else if (p.癖 === 3) { ctx.fillStyle = 漆; ctx.beginPath(); ctx.ellipse(X(0), Y(1.62), 0.15 * s, 0.14 * s, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(X(-0.2), Y(1.62), 0.4 * s * p.幅, 0.08 * s); }
  else { ctx.fillStyle = 漆; ctx.beginPath(); ctx.moveTo(X(-0.36), Y(1.6)); ctx.quadraticCurveTo(X(-0.1), Y(1.7), X(0), Y(1.79)); ctx.quadraticCurveTo(X(0.1), Y(1.7), X(0.36), Y(1.6)); ctx.quadraticCurveTo(X(0), Y(1.53), X(-0.36), Y(1.6)); ctx.fill();
    if (p.癖 === 1 && !粗) 線([[-0.3, 1.6], [0.3, 1.6]], 0.02, 縅); }
  if (!前) 旗();
  /* 得物 */
  if (p.型 === "yari" || 騎) {
    if (p.働 === "突" || p.働 === "構") { const e = p.働 === "突" ? 突きの伸び(p.相) : 0;
      槍(ctx, 手(-1.3 + e * 0.85, 0.92), 手(2.6 + e * 0.85, 1.25 - 0.04 * e), d); }
    else if (腕型 === "肩" && !騎) { const el = 0.61; 槍(ctx, 手(-0.95 * Math.cos(el), 1.4 - 0.95 * Math.sin(el)), 手(4.6 * Math.cos(el), 1.4 + 4.6 * Math.sin(el)), d); }
    else 槍(ctx, 手(0, 0.04), 手(0.02, 騎 ? 3.4 : 4.4), d);
  } else if (p.型 === "teppo") {
    if (p.働 === "放") { const 反 = p.相 < 0.15 ? -0.12 * Math.sin(p.相 / 0.15 * Math.PI) : 0; const 先 = 手(1.25 + 反, 1.42);
      線3(ctx, 手(-0.1 + 反, 1.38), 先, 0.05, 0.035, [40, 36, 34], d);
      if (p.相 < 0.4) { const [px, py, pz] = P(...先); if (pz > 0.5) { const k = p.相 / 0.4, r = (0.15 + k * 0.6) * F / pz; ctx.save(); ctx.globalAlpha *= (1 - k) * 0.8; ctx.fillStyle = "rgb(236,236,230)"; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); ctx.restore(); } } }
    else 線3(ctx, 手(0, 0.3), 手(0.02, 1.6), 0.05, 0.035, [40, 36, 34], d);
  } else if (p.型 === "yumi") {
    /* 弓：左手に持つ。放つあいだは顔の前に上げる */
    const lx = -p.fz, lz = p.fx, 上 = p.働 === "放" && p.相 < 0.6;
    const 弓芯 = [p.x + lx * 0.32 + p.fx * (上 ? 0.4 : 0.05), (上 ? 1.45 : 1.2) * p.丈, p.z + lz * 0.32 + p.fz * (上 ? 0.4 : 0.05)];
    const [bx, by, bz] = P(...弓芯); if (bz > 0.5) { const L = 0.85 * F / bz; ctx.strokeStyle = c([70, 50, 30]); ctx.lineWidth = Math.max(0.8, 0.035 * F / bz); ctx.beginPath(); ctx.moveTo(bx, by - L); ctx.quadraticCurveTo(bx + (前 ? 0.25 : -0.25) * L, by, bx, by + L * 0.85); ctx.stroke(); }
  }
  if (p.我) { ctx.strokeStyle = "#141416"; ctx.lineCap = "round"; ctx.lineWidth = 0.055 * s; ctx.beginPath(); ctx.moveTo(X(-0.16), Y(0.92)); ctx.lineTo(X(-0.36), Y(0.79)); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function 倒れを描く(ctx, e) {
  const d = 奥(e.x, e.z); const [sx, sy, zc] = P(e.x, 0, e.z); if (zc < 0.9 || sx < -200 || sx > W + 200) return;
  const s = sy - P(e.x, 1, e.z)[1]; if (s < 1) return;
  const 色組 = 色[e.側] || 色.E, 向 = (e.鍵 & 1) ? 1 : -1;
  ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.55); ctx.rotate(向 * 1.48);
  ctx.fillStyle = 霞([30, 30, 35], d, 120); ctx.fillRect(-0.26 * s, -1.4 * s, 0.52 * s, 0.6 * s);
  ctx.fillStyle = 霞(色組.布, d, 120); ctx.fillRect(-0.18 * s, -0.86 * s, 0.36 * s, 0.86 * s);
  ctx.fillStyle = 霞([30, 30, 35], d, 120); ctx.beginPath(); ctx.ellipse(0, -1.62 * s, 0.32 * s, 0.1 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 霞(色組.旗, d, 120); ctx.fillRect(0.3 * s, -1.9 * s, 0.32 * s, 0.5 * s);
  ctx.restore();
}
