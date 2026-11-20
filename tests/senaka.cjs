/* ============================================================
   一人働きの背中越しの視点（src/hitori/senaka.js）の試験

   背中越しの視点は兵を新しく作らず、一人ずつの絵（shinga.js）が持つ兵を
   そのまま写す。ここで確かめるのは、
     一、写した兵の数が、一人ずつの絵の立っている兵の数と一致する（組の兵と、本陣衆＝将・旗持・馬廻のそれぞれ）
     二、一人ひとりの居所が、盤の居所（揺らぎも同じ式）を一歩〇.四六mで写した所と一致する（本陣衆も同じ）
     三、与平は組のうしろに、組の向きを向いて立つ
     四、与平が一人を討てば（hitori/tsunagi.js）、背中越しにも立つ者が一人減り、その所に倒れた者が出る
     五、描く手続き（背中を描く）が、画布の真似で最後まで通る
     六、敵の兵は与平に気づいて振り向き、横や背からでも掛かる。与平が突けばまわりも気づく。味方の兵は加勢する。
         与平はいつも細かく描き、細かく描く者の境目は一息に縮まない（申し出「敵の背後に回ると簡単に打ち取れる。
         敵AI（味方も）の動きも対応するかたちに」「何秒かに一度突然画質が悪くなり、プレイヤーの人型が崩れる」）
     七、薄めて描く兵（与平の手前で透かす者・写しに近すぎて薄める者）と上から重ねる与平は、別の画布（層）に濃く
         描いてから一枚の絵として薄めて重ねる。部品ごとに薄めて塗らない（申し出「突く、駆けるなどの動作のとき、
         他の兵の画質？が下がるので修正してください」）
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

/* 本陣衆（将・旗持・馬廻）。一人ずつの絵では組の兵から借りて本陣に立てる（shinga.js 本陣衆を進める）。
   背中越しにも同じ数だけ立てる（大将首を取れるように。hitori/senaka.js 眺めを集める） */
const 本陣の数 = () => b.corps.reduce((n, c) => { const 本 = H.本陣衆を見る(c); return n + (本 ? 本.数 - (c.将討たれ ? 1 : 0) : 0); }, 0);
const 組の兵だけ = (兵) => 兵.filter((p) => !p.本陣);

console.log('\n── 一　写した兵の数が、一人ずつの絵の立っている兵の数と一致する');
{
  const 眺 = H.眺めを集める(b, { x: cx, y: cy }, 1e6);
  const 組兵 = 組の兵だけ(眺.兵), 本陣 = 眺.兵.filter((p) => p.本陣);
  確('組の兵の数が一致する', 組兵.length === 立つ数() && 組兵.length > 0, `背中越し ${組兵.length}人・一人ずつの絵 ${立つ数()}人`);
  確('本陣衆（将・旗持・馬廻）の数も一致する', 本陣.length === 本陣の数() && 本陣.length > 0, `背中越し ${本陣.length}人・一人ずつの絵 ${本陣の数()}人`);
  確('本陣衆は隊ごとに将一人・旗持一人', b.corps.every((c) => 本陣.filter((p) => p.本陣.c === c && p.将).length === 1 && 本陣.filter((p) => p.本陣.c === c && p.旗持).length === 1));
}

console.log('\n── 二　一人ひとりの居所は、盤の居所を一歩〇.四六mで写した所');
{
  const 眺 = H.眺めを集める(b, { x: cx, y: cy }, 1e6);
  let 最 = 0;
  for (const p of 組の兵だけ(眺.兵)) { const v = H.組の見た目(p.組), n = p.番, q = p.組;
    const h = (Math.imul((q.seed || 0) + 7, 2654435761) ^ Math.imul(n + 1, 40503)) >>> 0;     // shinga.js 新絵の兵描き と同じ揺らぎ
    const bx = v.sx[n] + (((h >>> 21) % 7) - 3) * 0.22, by = v.sy[n] + (((h >>> 24) % 7) - 3) * 0.22;
    最 = Math.max(最, Math.hypot(p.x - bx * 尺, p.z + by * 尺)); }
  確('どの兵も一致する（ずれ一ミリ未満）', 最 < 1e-3, `いちばん大きいずれ ${(最 * 1000).toFixed(3)}mm`);
  let 最本 = 0;
  for (const p of 眺.兵.filter((x) => x.本陣)) { const 本 = H.本陣衆を見る(p.本陣.c), n = p.本陣.n; 最本 = Math.max(最本, Math.hypot(p.x - 本.x[n] * 尺, p.z + 本.y[n] * 尺)); }
  確('本陣衆も、一人ずつの絵の居所と一致する（ずれ一ミリ未満）', 最本 < 1e-3, `いちばん大きいずれ ${(最本 * 1000).toFixed(3)}mm`);
  /* 一人ずつの絵の決まり（shinga.js 新絵の兵描き）：噛み合った組の前の二列で、足が止まっている（一秒に十四歩未満）者は突く */
  const 噛み = 組の兵だけ(眺.兵).filter((p) => { const v = H.組の見た目(p.組); return v.噛 && p.番 < 20 && v.速[p.番] < 14 * H.fieldScale(); });
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
  const 的 = 組の兵だけ(前眺.兵).filter((p) => p.側 === 'E').sort((a, z) => Math.hypot(a.x - 我.x * 尺, a.z + 我.y * 尺) - Math.hypot(z.x - 我.x * 尺, z.z + 我.y * 尺))[0];
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

console.log('\n── 六　敵の兵は気づいて振り向き、横や背からでも掛かる・突けばまわりも気づく・味方の加勢・与平はいつも細かく');
{
  const 態 = H.背中を始める(b, null);
  const 眺へ = () => H.眺めを集める(b, { x: 態.我.x / 尺, y: -態.我.z / 尺 }, 110);
  /* 盤の向きの筋（与平の古い掛かりの決まり）。この扇の外の与平には、もとは掛からなかった */
  const 古い扇の内 = (p) => { const rx = 態.我.x - p.x, rz = 態.我.z - p.z, a = rx * p.fx + rz * p.fz, dz = Math.abs(a), dx = Math.abs(rx * p.fz - rz * p.fx);
    return dz >= 0.35 && dz <= 3.6 && dx <= 0.75 + 0.32 * dz; };
  /* 敵の隊のいちばん後ろの兵の、左うしろ（向きから百二十度）二.四m に与平を置く。古い扇の外 */
  const 敵兵 = 組の兵だけ(眺へ().兵).filter((p) => p.側 === 'E' && p.型 === 'yari');
  const 後ろ = 敵兵.sort((a, z) => z.z - a.z)[0];
  const fa = Math.atan2(後ろ.fz, 後ろ.fx), a = fa + Math.PI * 2 / 3;
  態.我.x = 後ろ.x + Math.cos(a) * 2.4; 態.我.z = 後ろ.z + Math.sin(a) * 2.4;
  確('与平は、その兵の盤の向きの筋（古い掛かりの扇）の外にいる', !古い扇の内(後ろ));
  let 掛かった = null, 秒 = 0;
  for (let k = 0; k < 80 && !掛かった; k++) { H.与平を進める(b, 態, 0.05, 眺へ()); 秒 += 0.05; for (const st of 態.掛かり) { 掛かった = st; break; } }
  const 角差 = (x, y) => { let d = x - y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  確('背に回った与平に、敵の兵が気づいて振り向き、掛かってくる（四秒のうち）', !!掛かった && 掛かった.覚 != null
    && Math.abs(角差(Math.atan2(態.我.z - 掛かった.p.z, 態.我.x - 掛かった.p.x), 掛かった.顔)) < 0.65,
    掛かった ? `${秒.toFixed(2)}秒で掛かった（盤の向きから${Math.round(Math.abs(角差(Math.atan2(態.我.z - 掛かった.p.z, 態.我.x - 掛かった.p.x), Math.atan2(掛かった.p.fz, 掛かった.p.fx))) * 180 / Math.PI)}度うしろへ振り向いて）` : '掛からなかった');
  確('掛かってきた兵は、古い決まりでは掛からぬ所（盤の向きの筋の外）から掛かった', !!掛かった && !古い扇の内(掛かった.p));
  /* 与平が突けば、突かれた者のまわり（三m）の者も気づく */
  const 呼ばれ前 = [];
  for (const q of 乙.squads) { const m = 態.敵.get(q); if (m) for (const st of m.values()) if (st.呼ばれ != null) 呼ばれ前.push(st); }
  H.突く(態); for (let k = 0; k < 6; k++) H.与平を進める(b, 態, 0.05, 眺へ());
  let 呼ばれた = 0; for (const q of 乙.squads) { const m = 態.敵.get(q); if (m) for (const st of m.values()) if (st.呼ばれ != null && !呼ばれ前.includes(st)) 呼ばれた++; }
  確('与平が突けば、まわりの兵にも知らせが届く（気づく）', 呼ばれた > 0, `知らせが届いた兵 ${呼ばれた}人`);
  /* 味方の加勢：与平が前の列のそばで敵と突き合えば、そばの味方の兵が、与平に気づいた敵へ槍を入れる */
  const 眺1 = 眺へ(), 味方兵 = 組の兵だけ(眺1.兵).filter((p) => p.側 === 'P' && p.型 === 'yari');
  let 組 = null;
  for (const e of 組の兵だけ(眺1.兵).filter((p) => p.側 === 'E' && p.型 === 'yari')) {
    const 近 = 味方兵.find((m) => Math.hypot(m.x - e.x, m.z - e.z) < H.加勢の届き - 0.3); if (近) { 組 = { e, m: 近 }; break; } }
  確(`前の列で、敵の兵と味方の兵が加勢の届き（${H.加勢の届き}m）のうちで向き合っている`, !!組);
  if (組) {
    態.我.x = (組.e.x + 組.m.x) / 2 + 0.6; 態.我.z = (組.e.z + 組.m.z) / 2;
    let 加勢 = 0;
    for (let k = 0; k < 200; k++) { H.与平を進める(b, 態, 0.05, 眺へ());
      for (const c of [甲]) for (const q of c.squads) { const m = 態.味方.get(q); if (m) for (const st of m.values()) if (st.突始 > 0) 加勢 = Math.max(加勢, 1); } }
    確('与平に気づいて掛かる敵の兵へ、そばの味方の兵が槍を入れる（十秒のうち）', 加勢 > 0);
  }
  /* 与平はいつも細かく描く（数の限りに入れない）。ほかの兵は限りの奥なら中・粗に落とす */
  確('与平は、写しに近い兵が多くても細かい段で描く（ほかの兵は限りの奥なら粗い段）',
    H.人形の段(50, 10, { 細の奥: 1, 中の奥: 2 }, true) === 3 && H.人形の段(50, 10, { 細の奥: 1, 中の奥: 2 }, false) === 1 && H.人形の段(50, 1.5, { 細の奥: 2, 中の奥: 5 }, false) === 3);
  /* 細かく描く者の境目は、兵の群れの中へ入っても一息に縮まない */
  const 鈍 = () => ({ addColorStop() {} });
  const 筆 = { canvas: { width: 960, height: 540 }, setTransform() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, closePath() {}, arc() {}, ellipse() {}, rect() {}, fill() {}, stroke() {}, clip() {},
    fillRect() {}, strokeRect() {}, drawImage() {}, setLineDash() {}, createLinearGradient: 鈍, createRadialGradient: 鈍, measureText: () => ({ width: 10 }), fillText() {} };
  const 態2 = H.背中を始める(b, null); let 今 = 100;
  態2.我.x = cx * 尺; 態2.我.z = -(cy + 200) * 尺;                     // 合戦から離れた所（映る兵が少ない）
  for (let k = 0; k < 10; k++) H.背中を描く(筆, b, 態2, 960, 540, 1, (今 += 0.05));
  const 遠 = 態2.細の奥;
  態2.我.x = 後ろ.x; 態2.我.z = 後ろ.z - 3; 態2.cam = null;          // 兵の群れの中へ
  H.背中を描く(筆, b, 態2, 960, 540, 1, (今 += 0.05)); const 一コマ = 態2.細の奥;
  for (let k = 0; k < 80; k++) H.背中を描く(筆, b, 態2, 960, 540, 1, (今 += 0.05));
  const 四秒 = 態2.細の奥;
  確('群れの中へ入っても、細かく描く者の境目は一コマでは一割ほどしか縮まない（四秒かけて寄せる）',
    遠 > 四秒 && 一コマ > 四秒 && (遠 - 一コマ) < 0.12 * (遠 - 四秒), `境目 ${遠.toFixed(1)}m → 一コマ ${一コマ.toFixed(1)}m → 四秒 ${四秒.toFixed(1)}m`);
}

console.log('\n── 七　薄めて描く兵は、別の画布に濃く描いてから一枚の絵として重ねる（部品ごとに薄めて塗らない）');
{
  /* 描く筆の真似。塗った刻の濃さ（globalAlpha）と、画布を重ねた刻の濃さを覚える。save と restore は濃さも戻す */
  let 層の画布 = null;
  const 記す筆 = () => { const 記 = { 塗り: [], 重ね: [] }; const t = { canvas: { width: 960, height: 540 }, globalAlpha: 1, 棚: [] };
    const 筆 = new Proxy(t, { get: (o, k) => {
      if (k === '記') return 記;
      if (k in o) return o[k];
      if (k === 'fill' || k === 'stroke' || k === 'fillRect' || k === 'fillText') return () => 記.塗り.push(o.globalAlpha);
      if (k === 'drawImage') return (src) => 記.重ね.push({ 濃: o.globalAlpha, 層: src === 層の画布 });
      if (k === 'save') return () => o.棚.push(o.globalAlpha);
      if (k === 'restore') return () => { if (o.棚.length) o.globalAlpha = o.棚.pop(); };
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({ addColorStop() {} });
      return () => {};
    }, set: (o, k, v) => { o[k] = v; return true; } });
    return 筆; };
  /* 与平を隊の前の列に立たせる（写しは与平の五m うしろ。隊の兵が写しと与平のあいだに入る） */
  const 並べる = (態) => { const 前 = 組の兵だけ(H.眺めを集める(b, { x: cx, y: cy }, 1e6).兵).filter((p) => p.側 === 'P').sort((a, z) => z.z - a.z)[0];
    態.我.x = 前.x; 態.我.z = 前.z - 0.6; 態.cam = null; };
  const 描かせる = (主) => { const 態 = H.背中を始める(b, null); 並べる(態); let 今 = 300; for (let k = 0; k < 3; k++) H.背中を描く(主, b, 態, 960, 540, 1, (今 += 0.05)); return 主.記; };
  /* 対照：画布を作れない場（document が無い）では、これまでどおり部品ごとに薄めて塗る */
  const 前 = 描かせる(記す筆());
  const 前の薄塗り = 前.塗り.filter((a) => a > 0.3 && a < 0.33).length;
  確('（対照）別の画布を作れない場では、与平の手前の兵を部品ごとに濃さ〇.三二で塗る', 前の薄塗り > 0, `濃さ〇.三二で塗った部品 ${前の薄塗り}`);
  /* 画布を作れる場 */
  const 層筆 = 記す筆();
  層の画布 = { width: 0, height: 0, getContext: () => 層筆 };
  global.document = { createElement: () => 層の画布 };
  let 後 = null, 咎 = null;
  try { 後 = 描かせる(記す筆()); } catch (e) { 咎 = e.message; }
  delete global.document;
  確('別の画布を作れる場でも描き通せる', !咎 && !!後, 咎 || '');
  if (後) {
    const 重ね = 後.重ね.filter((o) => o.層), 後の薄塗り = 後.塗り.filter((a) => a > 0.3 && a < 0.33).length;
    確('与平の手前の兵は、部品ごとに薄めて塗らない（濃さ〇.三二で塗った部品が無い）', 後の薄塗り === 0, `濃さ〇.三二で塗った部品 ${後の薄塗り}`);
    確('与平の手前の兵は、別の画布に濃く描いて濃さ〇.三二で重ねる', 重ね.some((o) => Math.abs(o.濃 - 0.32) < 0.005), `重ねた濃さ ${[...new Set(重ね.map((o) => o.濃.toFixed(2)))].join('・')}`);
    確('別の画布には濃く塗る（部品を塗った濃さはみな一）', 層筆.記.塗り.length > 0 && 層筆.記.塗り.every((a) => a > 0.99), `別の画布に塗った部品 ${層筆.記.塗り.length}`);
    確('上から重ねる与平も、別の画布から濃さ〇.七二で重ねる', 重ね.some((o) => Math.abs(o.濃 - 0.72) < 0.005));
  }
  H.背中を描く(記す筆(), b, H.背中を始める(b, null), 960, 540, 1, 400);   // 画布を作れない場へ戻す
}

console.log(誤 ? `\nエラー: ${誤}件` : '\nエラー: なし');
process.exit(誤 ? 1 : 0);
