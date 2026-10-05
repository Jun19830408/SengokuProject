/* 軍を解いたときの帰り先（GDD 7.3 / 6.4）。

   陣触れを出せば、大名の城からも、他の城からも兵が出る。軍は一つになるが、
   出どころは幾つもある。解いたときに、兵も将も己の出た城へ帰らねばならない。

   遊ぶ側の申し出は「陣触れをして大名の城と他の城も合わせて出陣した後、城を
   落としたりしたあとに軍を解いた場合、参加した武将と兵が全て大名の城に
   所属してしまう」であった。元は二つ。

     一、月送りの合流（援軍が本隊へ入る筋）が、出どころを控えていなかった
     二、将の帰り先が「本隊の出陣元」止まりで、己の出た城を見ていなかった

   ここで確かめるのは、束ねる筋でも、合流の筋でも、兵と将が元の城へ帰ること。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'kaerisaki-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState } from "../src/core/state.js";\n'
+ 'export { sackCastle, 軍を解く, 着いた味方を束ねる } from "../src/govern/war.js";\n'
+ 'export { newRoster } from "../src/core/roster.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n');
const out = path.join(ROOT, 'build', 'kaerisaki.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* 陣触れの場を組む。本拠の本隊と、二つの城からの加勢。
   加勢に立てる将は、城主でも役持ちでもない者を選ぶ――そういう者こそ
   帰り先の当てが無く、大名の城へ流れていた。 */
const 場を組む = (fid = 'oda') => {
  const s = A.initState(fid);
  const 本拠 = s.castles.find((c) => c.id === s.factions[fid].本拠);
  const 的 = s.castles.find((c) => c.faction !== fid && c.local > 600);
  const 出す = (c, n, { 平 = false } = {}) => {
    let 候 = s.generals.filter((g) => g.faction === fid && g.at === c.id && !g.captive);
    if (平) 候 = 候.filter((g) => !g.lord && c.lordId !== g.id && g.役 !== '国主' && g.役 !== '旗頭');
    const gs = 候.slice(0, n);
    for (const g of gs) g.at = null;
    return gs;
  };
  const 本将 = 出す(本拠, 2);
  const 軍 = { id: 'A1', faction: fid, from: 本拠.id, gens: 本将.map((g) => g.id),
    local: 1500, localTrain: 70, rost: A.newRoster(1500, 'arm-A1'),
    men: 1500 + 本将.reduce((a, g) => a + g.retinue, 0),
    at: 的.id, path: [的.id], prog: 0, food: 9000, target: 的.id };
  s.armies.push(軍);
  const 加勢 = [];
  for (const c of s.castles.filter((x) => x.faction === fid && x.id !== 本拠.id)) {
    if (加勢.length >= 2) break;
    const gs = 出す(c, 1, { 平: true });
    if (!gs.length) continue;
    const 兵 = Math.min(600, c.local);
    c.local -= 兵;
    加勢.push({ 城: c, 将: gs[0], 兵,
      軍: { id: `R-${c.id}`, faction: fid, from: c.id, gens: [gs[0].id],
        local: 兵, localTrain: 65, rost: A.newRoster(兵, `arm-${c.id}`),
        men: 兵 + gs[0].retinue, at: 的.id, path: [的.id], prog: 0,
        food: 2000, target: 的.id, aid: fid } });
  }
  for (const q of 加勢) s.armies.push(q.軍);
  return { s, 本拠, 的, 軍, 本将, 加勢 };
};

console.log('── 一　束ねた軍を解けば、兵も将も元の城へ帰る');
{
  const { s, 本拠, 的, 軍, 本将, 加勢 } = 場を組む();
  確('加勢が二城から出ている', 加勢.length === 2,
    加勢.map((q) => `${q.城.name}（${q.将.name}・${q.兵}人）`).join('／'));
  const 前 = {}; for (const q of 加勢) 前[q.城.id] = q.城.local;
  const 本前 = 本拠.local;
  A.着いた味方を束ねる(s, 軍, 的);
  確('一つの軍に束ねられる', s.armies.length === 1 && 軍.gens.length === 2 + 加勢.length,
    `軍${s.armies.length}・将${軍.gens.length}名・兵${軍.local}`);
  確('出どころに将まで控える',
    (軍.出どころ || []).length === 1 + 加勢.length
    && (軍.出どころ || []).every((q) => Array.isArray(q.gens)),
    JSON.stringify((軍.出どころ || []).map((q) => `${q.from}:${q.local}:${(q.gens || []).length}名`)));
  A.sackCastle(s, 的, 軍, true);
  A.軍を解く(s, 軍);
  for (const q of 加勢) {
    確(`${q.城.name}の兵が戻る`, q.城.local >= 前[q.城.id] + Math.round(q.兵 * 0.9),
      `${前[q.城.id]} → ${q.城.local}（出した ${q.兵}）`);
    確(`${q.将.name}が${q.城.name}へ帰る`, q.将.at === q.城.id,
      `いま ${(s.castles.find((c) => c.id === q.将.at) || {}).name || 'どこにもいない'}`);
    確(`${q.将.name}の根は移らない`, q.将.本領 === q.城.id);
  }
  for (const g of 本将) {
    確(`${g.name}は本拠へ帰る`, g.at === 本拠.id || (s.castles.find((c) => c.lordId === g.id) || {}).id === g.at,
      `いま ${(s.castles.find((c) => c.id === g.at) || {}).name}`);
  }
  確('大名の城が膨れない（出した以上は増えない）', 本拠.local <= 本前 + 1600,
    `${本前} → ${本拠.local}`);
}

console.log('\n── 二　月送りで本隊へ合流した援軍も、出どころを失わない');
{
  const { s, 本拠, 的, 軍, 加勢 } = 場を組む();
  /* 月送りの合流は「同じ所にいて、同じ城を狙い、助勢の印を持つ軍」が
     本隊へ入る筋である。道中の始末を通さずに、その形だけを作って送る。 */
  for (const q of 加勢) { q.軍.at = 的.id; q.軍.path = [的.id]; }
  軍.at = 的.id; 軍.path = [的.id];
  const 前 = {}; for (const q of 加勢) 前[q.城.id] = q.城.local;
  const s2 = A.advanceMonth(s, s);
  const 本隊 = (s2.armies || []).find((x) => x.id === 'A1');
  確('援軍が本隊へ合流した', !!本隊 && !(s2.armies || []).some((x) => x.id.startsWith('R-')),
    本隊 ? `将${本隊.gens.length}名・兵${本隊.local}` : '本隊が消えた');
  確('合流しても出どころが残る',
    !!本隊 && (本隊.出どころ || []).length >= 1 + 加勢.length,
    JSON.stringify(((本隊 || {}).出どころ || []).map((q) => `${q.from}:${q.local}`)));
  if (本隊) {
    A.軍を解く(s2, 本隊);
    for (const q of 加勢) {
      const c2 = s2.castles.find((c) => c.id === q.城.id);
      const g2 = s2.generals.find((g) => g.id === q.将.id);
      確(`${q.城.name}へ兵が返る`, c2.local >= 前[q.城.id] + Math.round(q.兵 * 0.8),
        `${前[q.城.id]} → ${c2.local}`);
      確(`${q.将.name}が${q.城.name}へ帰る`, g2.at === q.城.id,
        `いま ${(s2.castles.find((c) => c.id === g2.at) || {}).name || 'どこにもいない'}`);
    }
  }
}

console.log('\n── 三　城主と役持ちの帰り先は変わらない');
{
  const { s, 的, 軍, 加勢 } = 場を組む();
  const 城主 = s.generals.find((g) => g.id === 加勢[0].城.lordId);
  if (城主) {
    城主.at = null;
    軍.gens = [...軍.gens, 城主.id];
    if (!軍.出どころ) 軍.出どころ = [{ from: 軍.from, local: 軍.local, gens: [...軍.gens] }];
  }
  A.着いた味方を束ねる(s, 軍, 的);
  A.軍を解く(s, 軍);
  if (城主) {
    確('城主は己の城へ帰る', 城主.at === 加勢[0].城.id,
      `${城主.name} → ${(s.castles.find((c) => c.id === 城主.at) || {}).name}`);
  } else {
    確('城主のいる場が組めた（この種では居らず、検めを飛ばす）', true);
  }
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
