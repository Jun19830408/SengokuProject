/* ============================================================
   背中越しの地形（hitori/senaka.js・hitori/chi_gl.js・battle/naname.js 水面の丈）の試験

   遊ぶ人の申し出：「一人称視点のときの見え方で、川に入っているときの様子が変ですね。ちゃんとリンクさせて欲しいのと、
   川や山、森、林、集落などのオブジェクトもちゃんと一人称で反映してください。集落や城、木などのオブジェクトは物理的にも
   通れなかったりして、リアルにしてください」。
   地そのもの（起伏・水面・遠くの木）は WebGL で描くので、ここでは見えない（試し台の画で目で見る）。ここで確かめるのは、
     一、水面の図：盤の地を焼けば、川の水面の高さが引ける。浅瀬は浅く、淵は深い。川から遠い所に水は無い
     二、地の足：与平の歩みは盤と同じ地の足（浅瀬・深い川・森は遅く、街道は少し速い）
     三、家と木の幹は通り抜けない（壁や幹の手前で止まる。斜めに当たれば壁に沿って滑る）
     四、背中越しに描く兵は、家の中や幹に立たない（いちばん近い外へ出す）
     五、描く手続きが、家と木の並ぶ所でも最後まで通る（WebGL の無い場では平らな地のまま）
   ============================================================ */
const H = require('../build/harness.cjs');
let 誤 = 0;
const 確 = (名, 可, 補) => { console.log(`  ${可 ? '○' : '★'} ${名}${補 ? '　' + 補 : ''}`); if (!可) 誤++; };
let 種 = 0x2C1E; Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 尺 = H.歩の尺;
const 鈍 = () => ({ addColorStop() {} });
const 作り筆 = () => ({ canvas: { width: 0, height: 0 }, setTransform() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
  beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, closePath() {}, arc() {}, ellipse() {}, rect() {}, fill() {}, stroke() {}, clip() {},
  fillRect() {}, strokeRect() {}, drawImage() {}, setLineDash() {}, createLinearGradient: 鈍, createRadialGradient: 鈍, createPattern: () => null,
  measureText: () => ({ width: 10 }), fillText() {}, strokeText() {}, createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
  putImageData() {}, getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }) });

/* 川・浅瀬・丘・山・森・集落のそろった野（試し台と同じ種） */
H.setBattleMap(null); H.setFieldSeed('lab28', 'z山道'); H.setFieldKind('山道'); H.layoutField(9000, 8);
const k = Math.min(1, Math.sqrt(2.2e6 / Math.max(1, H.FIELD.w * H.FIELD.h)));
H.新絵の野(作り筆(), k);
const R = H.RIVER, 芯 = (R.top + R.bot) / 2, fx = (R.ford[0] + R.ford[1]) / 2;
const 川の芯 = (x) => { let y = 芯; for (let d = -200; d <= 200; d += 2) { /* 蛇行は field.js riverShift。盤の川の中なら terrainAt が浅瀬か淵 */ } return y; };
const 深さ = (x, y) => { const w = H.水面の丈(x, y); return w == null ? null : (w - H.地の丈(x, y)) * 尺; };
/* 浅瀬の芯の所（terrainAt が ford の所を、川の芯の近くで探す） */
const 探す = (x0, 種) => { for (let dy = -120; dy <= 120; dy += 2) { const y = 芯 + dy; if (H.terrainAt(x0, y) === 種) { let y1 = y; while (H.terrainAt(x0, y1 + 2) === 種) y1 += 2; return (y + y1) / 2; } } return null; };

console.log('── 一　水面の図：浅瀬は浅く、淵は深い。川から遠い所に水は無い');
{
  確('地を焼けば、高さの図と水面の図が据わる', H.高さ図があるか() && H.水図があるか());
  const 瀬y = 探す(fx, 'ford'), 淵x = R.ford[0] - 500, 淵y = 探す(淵x, 'deep');
  const 瀬 = 瀬y != null ? 深さ(fx, 瀬y) : null, 淵 = 淵y != null ? 深さ(淵x, 淵y) : null;
  確('浅瀬の芯は水に浸かる（膝から腿ほど）', 瀬 != null && 瀬 > 0.08 && 瀬 < 1.2, `深さ ${瀬 != null ? 瀬.toFixed(2) : '無'}m`);
  確('淵（浅瀬の外の川の芯）は浅瀬より深い', 淵 != null && 瀬 != null && 淵 > 瀬 + 0.15, `淵 ${淵 != null ? 淵.toFixed(2) : '無'}m・浅瀬 ${瀬 != null ? 瀬.toFixed(2) : '無'}m`);
  const 遠 = H.水面の丈(fx, 芯 - 900);
  確('川から遠い所には水が無い', 遠 == null);
  /* 川の縁（盤の川の地が終わる所）を、浅瀬の芯から北へ辿って探す。縁から先の岸は乾いている（水が盤の川より広がらない） */
  const 瀬y2 = 探す(fx, 'ford'); let 縁y = 瀬y2; while (['ford', 'deep', 'bridge'].includes(H.terrainAt(fx, 縁y - 1))) 縁y -= 1;
  let 濡れ = 0; for (let d = 1; d <= 60; d++) { const v = 深さ(fx, 縁y - d); if (v != null && v > 0.02) 濡れ = d; }
  const 岸 = 深さ(fx, 縁y - 30);
  確('川の縁から先の岸は乾いている（水は盤の川の縁から三m より外へ広がらない）', (岸 == null || 岸 <= 0.02) && 濡れ * 尺 <= 3,
    `縁から三十歩の深さ ${岸 != null ? 岸.toFixed(2) : '無'}m・縁の外で水に浸かる幅 ${(濡れ * 尺).toFixed(1)}m`);
}

/* 合戦（味方の隊を浅瀬の南に、敵は遠くに）と与平 */
const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 65, valor: 65, wit: 58, gov: 55, retinue: 1500, retTrain: 70, unity: 62 });
const P = [H.makeCorps('P', 将(0), 0, 1200, 75, 75, fx, 芯 + 160, -Math.PI / 2, '#2F5D8C')];
const E = [H.makeCorps('E', 将(10), 0, 1200, 75, 75, fx + 1500, 芯 - 1500, Math.PI / 2, '#B0483C')];
for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
const b = H.createBattle(P, E, 'P'); b.mode = 'field'; b.phase = 'fight'; b.dusk = 3000; b.face = 'S'; b.myFar = false;
for (let i = 0; i < 30; i++) { b.t += 0.02; H.新絵状態を進める(b, 0, null); }
const 態 = H.背中を始める(b, P[0].id);
const 空 = { 兵: [], 倒れ: [] };
const 据える = (x, z, fxw, fzw) => { 態.我.x = x; 態.我.z = z; 態.我.fx = fxw; 態.我.fz = fzw; 態.我.退x = 0; 態.我.退z = 0; 態.cam = null; 態.掛かり.clear(); };
const 歩む = (秒) => { 態.入.keys.add('u'); for (let i = 0; i < 秒 * 60; i++) H.与平を進める(b, 態, 1 / 60, 空); 態.入.keys.delete('u'); };

console.log('\n── 二　地の足：盤と同じ（浅瀬・深い川・森は遅く、街道は少し速い）');
{
  確('地の足は盤の地の速さ（浅瀬〇.三・森〇.六五・林〇.八二・野一。深い川は〇.二五より遅くしない）',
    Math.abs(H.地の足(fx, 探す(fx, 'ford')) - 0.3) < 1e-9 && H.地の足(R.ford[0] - 500, 探す(R.ford[0] - 500, 'deep')) === 0.25
      && Math.abs(H.TERRAIN.forest.speed - 0.65) < 1e-9);
  /* 野で一秒歩む距離と、浅瀬で一秒歩む距離 */
  let 野 = null;
  for (let dx = 0; dx < 3000 && !野; dx += 37) for (const y of [芯 + 400, 芯 + 700, 芯 + 1000]) {
    const x = 400 + dx; if (H.terrainAt(x, y) === 'plain' && !H.障りの内(x * 尺, -y * 尺, 6)) { 野 = [x, y]; break; }
  }
  据える(野[0] * 尺, -野[1] * 尺, 0, 1); const 野0 = [態.我.x, 態.我.z]; 歩む(1); const 野の歩 = Math.hypot(態.我.x - 野0[0], 態.我.z - 野0[1]);
  const 瀬y = 探す(fx, 'ford');
  据える(fx * 尺, -瀬y * 尺, 1, 0); const 瀬0 = [態.我.x, 態.我.z]; 歩む(0.5); const 瀬の歩 = Math.hypot(態.我.x - 瀬0[0], 態.我.z - 瀬0[1]) * 2;
  確('浅瀬では、野のおよそ三割の速さで歩む', 野の歩 > 2.2 && Math.abs(瀬の歩 / 野の歩 - 0.3) < 0.06, `野 ${野の歩.toFixed(2)}m/秒・浅瀬 ${瀬の歩.toFixed(2)}m/秒`);
}

console.log('\n── 三　家と木の幹は通り抜けない');
{
  const 家ら = H.家々を据える();
  確('野に家が並んでいる（盤の集落の家々）', 家ら.length > 20, `${家ら.length}軒`);
  /* まわりに他の家や木の無い家を選ぶ */
  const 一軒 = 家ら.find((h) => { const x = h.x * 尺, z = -(h.y + h.hh) * 尺 - 2.2;
    return !H.障りの内(x, z, 0.6) && 家ら.filter((o) => Math.hypot(o.x - h.x, o.y - h.y) < 60).length === 1; }) || 家ら[0];
  const x0 = (一軒.x - 一軒.hw) * 尺, x1 = (一軒.x + 一軒.hw) * 尺, z0 = -(一軒.y + 一軒.hh) * 尺;
  /* 家の南（z の小さい側）二.二m から北へ歩む */
  据える((x0 + x1) / 2, z0 - 2.2, 0, 1); 歩む(2);
  確('家の壁へまっすぐ歩めば、壁の手前で止まる', 態.我.z <= z0 - 0.29 && 態.我.z > z0 - 0.6, `壁 z=${z0.toFixed(2)}・与平 z=${態.我.z.toFixed(2)}`);
  据える((x0 + x1) / 2, z0 - 2.2, 0.5, 0.866); const xa = 態.我.x; 歩む(2);
  確('斜めに当たれば、壁に沿って滑る（中へは入らない）', 態.我.x > xa + 1.5 && 態.我.z <= z0 - 0.29, `横へ ${(態.我.x - xa).toFixed(2)}m`);
  /* 木の幹 */
  const 木ら = H.木立を据える();
  const 一本 = 木ら.find((t) => { const x = t.x * 尺, z = -t.y * 尺 - 1.5; return !H.障りの内(x, z, 0.5) && !H.障りの内(x, z - 1, 0.5); });
  const tx = 一本.x * 尺, tz = -一本.y * 尺;
  据える(tx, tz - 1.5, 0, 1); 歩む(1.5);
  const 隔 = Math.hypot(態.我.x - tx, 態.我.z - tz);
  確('木の幹へ歩めば、幹の手前で止まる（幹の半ば＋体の半ば より寄らない）', 隔 >= H.幹の半 + 0.29, `幹から ${隔.toFixed(2)}m（木立 ${木ら.length}本）`);
}

console.log('\n── 四　背中越しに描く兵は、家の中や幹に立たない');
{
  /* 集落の真ん中に味方の隊を立てる */
  const 村 = H.VILLAGES.slice().sort((a, z) => Math.hypot(a.x - fx, a.y - 芯) - Math.hypot(z.x - fx, z.y - 芯))[0];
  const P2 = [H.makeCorps('P', 将(20), 0, 1200, 75, 75, 村.x, 村.y, -Math.PI / 2, '#2F5D8C')];
  for (const c of P2) { c.formation = '横陣'; H.placeSquads(c, true); }
  const b2 = H.createBattle(P2, [H.makeCorps('E', 将(21), 0, 600, 75, 75, 村.x + 2000, 村.y - 2000, Math.PI / 2, '#B0483C')], 'P');
  b2.mode = 'field'; b2.phase = 'fight'; b2.dusk = 3000;
  for (let i = 0; i < 30; i++) { b2.t += 0.02; H.新絵状態を進める(b2, 0, null); }
  const 眺 = H.眺めを集める(b2, { x: 村.x, y: 村.y }, 160);
  const 中 = 眺.兵.filter((p) => H.障りの内(p.x, p.z, 0.25));
  const 村の兵 = 眺.兵.filter((p) => Math.hypot(p.x / 尺 - 村.x, -p.z / 尺 - 村.y) < (村.r || 60));
  確('集落の中の兵は、家の壁の内にも幹にも立たない', 村の兵.length > 30 && 中.length === 0, `集落の兵 ${村の兵.length}人・壁の内や幹に立つ兵 ${中.length}人`);
}

console.log('\n── 五　描く手続きが、家と木の並ぶ所でも最後まで通る（WebGL の無い場では平らな地のまま）');
{
  const 筆 = 作り筆();
  let r = null, 咎 = null;
  try { for (let i = 0; i < 6; i++) r = H.背中を描く(筆, b, 態, 960, 540, 1, 50 + i * 0.05, false, null, null, 0); } catch (e) { 咎 = e.message; }
  確('六コマ描けた', !咎 && r && r.描いた >= 0, 咎 || '');
}

console.log('');
console.log('エラー:', 誤 ? `${誤}件` : 'なし');
process.exit(誤 ? 1 : 0);
