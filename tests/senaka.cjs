/* ============================================================
   一人働きの背中越しの視点（src/hitori/senaka.js）の試験

   背中越しの視点は兵を新しく作らず、一人ずつの絵（shinga.js）が持つ兵を
   そのまま写す。ここで確かめるのは、
     一、写した兵の数が、一人ずつの絵の立っている兵の数と一致する
     二、一人ひとりの居所が、盤の居所（揺らぎも同じ式）を一歩〇.四六mで写した所と一致する
     三、与平は組のうしろに、組の向きを向いて立つ
     四、与平が一人を討てば（hitori/tsunagi.js）、背中越しにも立つ者が一人減り、その所に倒れた者が出る
     五、描く手続き（背中を描く）が、画布の真似で最後まで通る
   ============================================================ */
const H = require('../build/harness.cjs');
let 誤 = 0;
const 確 = (名, 可, 補) => { console.log(`  ${可 ? '○' : '★'} ${名}${補 ? '　' + 補 : ''}`); if (!可) 誤++; };
const 種で固める = () => { let 種 = 0x5E7A; Math.random = function () { 種 |= 0;
  種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/* ---- 野と両軍（tests/hitori.cjs と同じ据え方） ---- */
種で固める();
const 名簿 = (総, 名) => { const out = []; let men = 総, i = 0; while (men > 0) { const m = Math.min(50, men); out.push({ m, t: 'yari', id: `${名}-組${i++}` }); men -= m; } return out; };
const 将 = (i, nm, 総, 名) => ({ id: 'g' + i, name: nm, lead: 70, valor: 70, wit: 60, gov: 55,
  retinue: 0, retTrain: 74, unity: 62, arms: { yari: 55, yumi: 20, teppo: 12, kiba: 13 }, locRost: 名簿(総, 名) });
H.setFieldSeed('senaka', 'x'); H.setFieldKind('街道'); H.setBattleMap(null); H.layoutField(24000, 18);
const cx = H.FIELD.w / 2, cy = H.FIELD.h * 0.5;
for (const 群 of [H.FORESTS, H.WOODS, H.MARSH, H.HILLS, H.MOUNTAINS, H.VILLAGES]) {
  for (let i = 群.length - 1; i >= 0; i--) if (Math.hypot(群[i].x - cx, 群[i].y - cy) < 群[i].r + 800) 群.splice(i, 1);
}
const 甲 = H.makeCorps('P', 将(1, '与平の隊', 400, '甲'), 0, 400, 78, 78, cx, cy + 300, -Math.PI / 2, '#2F5D8C');
const 乙 = H.makeCorps('E', 将(2, '敵の隊', 400, '乙'), 0, 400, 78, 78, cx, cy - 300, Math.PI / 2, '#B0483C');
for (const c of [甲, 乙]) H.placeSquads(c, true);
const b = H.createBattle([甲], [乙], 'P');
b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
甲.squads.forEach((q, i) => { q.x = cx + (i - 3.5) * 60; q.y = cy; q.facing = -Math.PI / 2; });
乙.squads.forEach((q, i) => { q.x = cx + (i - 3.5) * 60; q.y = cy - 14; q.facing = Math.PI / 2; });
for (let k = 0; k < 50; k++) { b.t += 0.02; H.新絵状態を進める(b, 0, null); }
for (let k = 0; k < 10; k++) { H.stepBattle(b, 0.2); H.新絵状態を進める(b, 0, null); }   // 噛み合わせる

const 尺 = H.歩の尺;
const 立つ数 = () => { let n = 0; for (const c of b.corps) for (const q of c.squads) { if (!(q.men > 0)) continue; const v = H.組の見た目(q); if (!v || !v.初) continue;
  const alive = Math.max(0, Math.min(50, Math.round(q.men)) - (v.借り || 0)); for (let i = 0; i < alive; i++) if (v.生[i]) n++; } return n; };

console.log('\n── 一　写した兵の数が、一人ずつの絵の立っている兵の数と一致する');
{
  const 眺 = H.眺めを集める(b, { x: cx, y: cy }, 1e6);
  確('数が一致する', 眺.兵.length === 立つ数() && 眺.兵.length > 0, `背中越し ${眺.兵.length}人・一人ずつの絵 ${立つ数()}人`);
}

console.log('\n── 二　一人ひとりの居所は、盤の居所を一歩〇.四六mで写した所');
{
  const 眺 = H.眺めを集める(b, { x: cx, y: cy }, 1e6);
  let 最 = 0;
  for (const p of 眺.兵) { const v = H.組の見た目(p.組), n = p.番, q = p.組;
    const h = (Math.imul((q.seed || 0) + 7, 2654435761) ^ Math.imul(n + 1, 40503)) >>> 0;     // shinga.js 新絵の兵描き と同じ揺らぎ
    const bx = v.sx[n] + (((h >>> 21) % 7) - 3) * 0.22, by = v.sy[n] + (((h >>> 24) % 7) - 3) * 0.22;
    最 = Math.max(最, Math.hypot(p.x - bx * 尺, p.z + by * 尺)); }
  確('どの兵も一致する（ずれ一ミリ未満）', 最 < 1e-3, `いちばん大きいずれ ${(最 * 1000).toFixed(3)}mm`);
  /* 一人ずつの絵の決まり（shinga.js 新絵の兵描き）：噛み合った組の前の二列で、足が止まっている（一秒に十四歩未満）者は突く */
  const 噛み = 眺.兵.filter((p) => { const v = H.組の見た目(p.組); return v.噛 && p.番 < 20 && v.速[p.番] < 14 * H.fieldScale(); });
  確('噛み合った組の前の二列で足の止まった者は、突いている', 噛み.length > 0 && 噛み.every((p) => p.働 === '突'), `${噛み.length}人`);
}

console.log('\n── 三　与平は組のうしろに、組の向きを向いて立つ');
{
  const 選 = H.与平の組を選ぶ(b, null);
  確('味方の組が選ばれる', 選 && 選.隊 === 甲 && 選.組.men > 0, 選 ? 選.組.id : '');
  const 我 = H.与平の所(選.組), v = H.組の見た目(選.組);
  const 前 = (我.x - v.dx) * Math.cos(v.向) + (我.y - v.dy) * Math.sin(v.向);
  確('組の芯より、組の向きでうしろ（三.九歩）', Math.abs(前 + 3.9) < 1e-6, `${前.toFixed(2)}歩`);
  確('組の向きを向く', Math.abs(我.向 - v.向) < 1e-9);
}

console.log('\n── 四　与平が一人を討てば、背中越しにも立つ者が一人減り、その所に倒れた者が出る');
{
  const 選 = H.与平の組を選ぶ(b, null), 我 = H.与平の所(選.組);
  const 前眺 = H.眺めを集める(b, 我, 110);
  const 的 = 前眺.兵.filter((p) => p.側 === 'E').sort((a, z) => Math.hypot(a.x - 我.x * 尺, a.z + 我.y * 尺) - Math.hypot(z.x - 我.x * 尺, z.z + 我.y * 尺))[0];
  const v = H.組の見た目(的.組), 盤x = v.sx[的.番], 盤y = v.sy[的.番];
  確('討てた', H.兵を討つ(b, 的.組, 的.番, { 隊: 甲, 組: 選.組, 武勇: 70 }) === true);
  H.新絵状態を進める(b, 0, null);
  const 後眺 = H.眺めを集める(b, 我, 110);
  確('立つ者が一人減る', 後眺.兵.length === 前眺.兵.length - 1, `${前眺.兵.length}人 → ${後眺.兵.length}人`);
  const 新 = 後眺.倒れ.filter((e) => !前眺.倒れ.some((f) => f.x === e.x && f.z === e.z));
  確('倒れた者が一人ふえ、討った兵の立っていた所にいる', 新.length === 1 && Math.abs(新[0].x - 盤x * 尺) < 1e-6 && Math.abs(新[0].z + 盤y * 尺) < 1e-6,
    新.length ? `ずれ ${(Math.hypot(新[0].x - 盤x * 尺, 新[0].z + 盤y * 尺) * 1000).toFixed(3)}mm` : '');
}

console.log('\n── 五　描く手続きが、画布の真似で最後まで通る');
{
  const 鈍 = () => ({ addColorStop() {} });
  const 筆 = { canvas: { width: 960, height: 540 }, setTransform() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() {}, arc() {}, ellipse() {}, rect() {}, fill() {}, stroke() {}, clip() {},
    fillRect() {}, strokeRect() {}, drawImage() {}, setLineDash() {}, createLinearGradient: 鈍, createRadialGradient: 鈍, measureText: () => ({ width: 10 }), fillText() {} };
  const 態 = H.背中を始める(b, null);
  let r = null, 咎 = null;
  try { for (let k = 0; k < 5; k++) r = H.背中を描く(筆, b, 態, 960, 540, 1, 1 + k * 0.05); } catch (e) { 咎 = e.message; }
  確('五コマ描けた', !咎 && r && r.描いた > 0, 咎 || `一コマに ${r.描いた}人（まわり百十mの立つ者 ${r.兵}人・倒れた者 ${r.倒れ}人）`);
  確('盤には書かない（与平の組は同じ組のまま）', 態.組 && 態.組.men > 0 && 甲.squads.includes(態.組));
}

console.log(誤 ? `\nエラー: ${誤}件` : '\nエラー: なし');
process.exit(誤 ? 1 : 0);
