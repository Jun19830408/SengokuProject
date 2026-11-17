/* ============================================================
   一人働きのつなぎ（src/hitori/tsunagi.js 兵を討つ）の試験

   合戦は三つの寄りで見える。駒（組の人数から）、一人ずつ（組を五十人にほどいた絵）、
   一人視点（与平の背中越し）。与平が討った兵が、
     一、理（組の人数）ではちょうど一人減り、
     二、一人ずつの絵（shinga.js）では、指名したその兵が倒れ、
     三、駒の数（人数を四捨五入して十で割って切り上げ。draw.js と同じ式）も
         同じ人数から決まる
   ことを確かめる。あわせて、ふだんの損害と同じ刻に重なっても数が合うこと、
   組を潰せば討ち手の組に武功が付くこと、空いた持ち場は討てないことを見る。
   ============================================================ */
const H = require('../build/harness.cjs');
let 誤 = 0;
const 確 = (名, 可, 補) => { console.log(`  ${可 ? '○' : '★'} ${名}${補 ? '　' + 補 : ''}`); if (!可) 誤++; };
const 種で固める = () => { let 種 = 0x7E57; Math.random = function () { 種 |= 0;
  種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/* ---- 野と両軍を仕立てる（shinga の試験 四 と同じ据え方。組は名簿の id を持たせ、武功の鍵が立つようにする） ---- */
種で固める();
const 名簿 = (総, 名) => { const out = []; let men = 総, i = 0; while (men > 0) { const m = Math.min(50, men); out.push({ m, t: 'yari', id: `${名}-組${i++}` }); men -= m; } return out; };
const 将 = (i, nm, 総, 名) => ({ id: 'g' + i, name: nm, lead: 70, valor: 70, wit: 60, gov: 55,
  retinue: 0, retTrain: 74, unity: 62, arms: { yari: 55, yumi: 20, teppo: 12, kiba: 13 }, locRost: 名簿(総, 名) });
H.setFieldSeed('tsunagi', 'x'); H.setFieldKind('街道'); H.setBattleMap(null); H.layoutField(24000, 18);
const cx = H.FIELD.w / 2, cy = H.FIELD.h * 0.5;
for (const 群 of [H.FORESTS, H.WOODS, H.MARSH, H.HILLS, H.MOUNTAINS, H.VILLAGES]) {
  for (let i = 群.length - 1; i >= 0; i--) if (Math.hypot(群[i].x - cx, 群[i].y - cy) < 群[i].r + 800) 群.splice(i, 1);
}
const 甲 = H.makeCorps('P', 将(1, '与平の隊', 400, '甲'), 0, 400, 78, 78, cx, cy + 300, -Math.PI / 2, '#2F5D8C');
const 乙 = H.makeCorps('E', 将(2, '敵の隊', 400, '乙'), 0, 400, 78, 78, cx, cy - 300, Math.PI / 2, '#B0483C');
for (const c of [甲, 乙]) H.placeSquads(c, true);
const b = H.createBattle([甲], [乙], 'P');
b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
/* 組だけを野の真ん中で向かい合わせる（甲は北向き、乙は南向き。槍を合わせる間合いの内） */
甲.squads.forEach((q, i) => { q.x = cx + (i - 3.5) * 60; q.y = cy; q.facing = -Math.PI / 2; });
乙.squads.forEach((q, i) => { q.x = cx + (i - 3.5) * 60; q.y = cy - 14; q.facing = Math.PI / 2; });
const dt = 0.02;
for (let k = 0; k < 1 / dt; k++) { b.t += dt; H.新絵状態を進める(b, 0, null); }   // 一人ずつの兵を持ち場に据える

const 生の数 = (q) => { const v = H.組の見た目(q); let n = 0; for (let i = 0; i < 50; i++) if (v.生[i]) n++; return n; };
const 駒の数 = (q) => Math.ceil(Math.max(0, Math.min(50, Math.round(q.men))) / 10);   // draw.js の駒と同じ式
const 討ち手 = (q) => ({ 隊: 甲, 組: q, 武勇: 70 });
const 倒れ = () => H.盤の見た目(b).倒れ;

console.log('\n── 一　指名した兵が倒れ、組の人数がちょうど一人減る');
{
  const q = 乙.squads[3];
  /* 与平が甲の四番目の組の前に立っていると見立て、いちばん近い敵の兵を討つ */
  const 我 = { x: 甲.squads[3].x, y: 甲.squads[3].y - 6 };
  const 兵 = H.組の兵を数える(q).sort((a, z) => Math.hypot(a.x - 我.x, a.y - 我.y) - Math.hypot(z.x - 我.x, z.y - 我.y))[0];
  const men0 = q.men, 生0 = 生の数(q), 倒0 = 倒れ().length;
  確('討てた', H.兵を討つ(b, q, 兵.番, 討ち手(甲.squads[3])) === true);
  確('理：組の人数がちょうど一人減る', Math.abs(men0 - q.men - 1) < 1e-9, `${men0.toFixed(2)}人 → ${q.men.toFixed(2)}人`);
  H.新絵状態を進める(b, 0, null);                    // 盤の刻は進めない（誰も歩かない）
  const 新 = 倒れ().slice(倒0);
  確('絵：倒れたのは一人', 新.length === 1, `${新.length}人`);
  確('絵：倒れたのは指名した兵（立っていた所が一致する）', 新.length === 1 && 新[0].x === 兵.x && 新[0].y === 兵.y,
    新.length ? `指名(${兵.x.toFixed(1)}, ${兵.y.toFixed(1)}) 倒れ(${新[0].x.toFixed(1)}, ${新[0].y.toFixed(1)})` : '');
  確('絵：立っている兵は一人減り、理の人数（四捨五入）と同じ', 生の数(q) === 生0 - 1 && 生の数(q) === Math.min(50, Math.round(q.men)), `${生0}人 → ${生の数(q)}人`);
}

console.log('\n── 二　駒の数も同じ人数から決まる');
{
  const q = 乙.squads[5];
  /* 試しのため人数を四十一人ちょうどに据える（駒は五つ）。据えた差は絵の側で倒れとして出るので、先に一度進めて落ち着かせる */
  q.men = 41; H.新絵状態を進める(b, 0, null);
  const 駒0 = 駒の数(q), 生0 = 生の数(q);
  const 兵 = H.組の兵を数える(q)[0];
  H.兵を討つ(b, q, 兵.番, 討ち手(甲.squads[5]));
  H.新絵状態を進める(b, 0, null);
  確('駒：四十一人（五つ）が四十人（四つ）になる', 駒0 === 5 && 駒の数(q) === 4, `${駒0}つ → ${駒の数(q)}つ`);
  確('一人ずつの兵：四十一人が四十人になる', 生0 === 41 && 生の数(q) === 40, `${生0}人 → ${生の数(q)}人`);
}

console.log('\n── 三　ふだんの損害と同じ刻に重なっても、指名した兵が倒れ、数が合う');
{
  /* 噛み合ったまま戦を一刻（〇.二秒）ずつ進める。刻ごとに、その前に二人を指名して討つ */
  let 指名 = 0, 倒れた = 0, 合わぬ = 0, 自然 = 0;
  const 総0 = 乙.squads.reduce((s, q) => s + q.men, 0);
  for (let k = 0; k < 25; k++) {
    const 敵組 = 乙.squads.filter((q) => q.men > 3);
    if (!敵組.length) break;
    const q = 敵組[k % 敵組.length];
    const 兵ら = H.組の兵を数える(q).slice(0, 2);
    const 倒0 = 倒れ().length;
    for (const 兵 of 兵ら) if (H.兵を討つ(b, q, 兵.番, 討ち手(甲.squads[0]))) 指名++;
    H.stepBattle(b, 0.2); H.新絵状態を進める(b, 0, null);
    const 新 = 倒れ().slice(倒0);
    for (const 兵 of 兵ら) if (新.some((e) => e.x === 兵.x && e.y === 兵.y)) 倒れた++;
    自然 += Math.max(0, 新.length - 兵ら.length);
    for (const q2 of [...甲.squads, ...乙.squads]) if (q2.men > 0 && 生の数(q2) !== Math.min(50, Math.round(q2.men))) 合わぬ++;
  }
  確('指名した兵は、どの刻でも倒れている', 指名 > 0 && 倒れた === 指名, `${倒れた}/${指名}人`);
  確('ふだんの損害でも兵が倒れている（つなぎがあっても戦は止まらない）', 自然 > 0, `ほかに ${自然}人`);
  確('どの組も、立っている兵の数＝理の人数（四捨五入）', 合わぬ === 0, 合わぬ ? `${合わぬ}件ずれ` : `敵の総数 ${Math.round(総0)} → ${Math.round(乙.squads.reduce((s, q) => s + q.men, 0))}人`);
}

console.log('\n── 四　組を潰せば、討ち手の組に武功が付く（ふだんの損害と同じ帳簿）');
{
  const q = 乙.squads.find((q2) => q2.men > 3);
  q.men = 2; H.新絵状態を進める(b, 0, null);
  const 鍵 = H.組の鍵(甲.squads[1].src), 前 = (b.武功 && b.武功[鍵]) || 0, 討0 = (b.一人働き && b.一人働き.討ち取り) || 0;
  for (const 兵 of H.組の兵を数える(q)) H.兵を討つ(b, q, 兵.番, 討ち手(甲.squads[1]));
  H.新絵状態を進める(b, 0, null);
  確('組の人数は零になる', q.men === 0, `${q.men}人`);
  確('討ち手の組に武功が一つ付く', ((b.武功 && b.武功[鍵]) || 0) === 前 + 1, `${鍵}：${前} → ${(b.武功 && b.武功[鍵]) || 0}`);
  確('与平の討ち取りの数が積まれる', b.一人働き && b.一人働き.討ち取り === 討0 + 2, `${討0} → ${b.一人働き && b.一人働き.討ち取り}人`);
}

console.log('\n── 五　空いた持ち場や外れた番では討てない（数は変わらない）');
{
  const q = 乙.squads.find((q2) => q2.men > 10 && q2.men < 49);
  const v = H.組の見た目(q); let 空 = -1; for (let n = 49; n >= 0; n--) if (!v.生[n]) { 空 = n; break; }
  const men0 = q.men;
  確('空いた持ち場の番では討てない', 空 >= 0 && H.兵を討つ(b, q, 空, 討ち手(甲.squads[2])) === false && q.men === men0, `番${空}`);
  確('番が外れていれば討てない', H.兵を討つ(b, q, 50, 討ち手(甲.squads[2])) === false && H.兵を討つ(b, q, -1, 討ち手(甲.squads[2])) === false && q.men === men0);
}

console.log(誤 ? `\nエラー: ${誤}件` : '\nエラー: なし');
process.exit(誤 ? 1 : 0);
