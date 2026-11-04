/* 天下の後の始末と、盤の繕い（GDD 6.4 / 12.4 / 12.5）。

   一五八八年に織田が天下を定めた記録を検めて、次の乱れが見つかった。
     一　滅んだ家（加賀一向衆・神保家）が「従属」のまま旗下に数えられた
     二　問う家の無い惣無事令が発せられた（〇家が従い〇家が拒んだ）
     三　自領になった城への密約が「不調に終わった」と残った
     四　「地域家臣団〇人のうち〇人が…」という空の報せが出た
     五　滅亡の控えに同じ家が二度載った
     六　上杉謙信が二人いた（長尾景虎と、後年に出る上杉政虎）
     七　出征中の者の元の城が分からず、人事ができなかった
     八　主のいない方面軍が在陣したまま残った
     九　物故の控えに載ったまま盤で仕える者がいた
     十　捕虜が三十三年も裁かれずに残った
   どれも直したので、ここで縛る。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'tenkago-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState, migrateSave, 出征の元 } from "../src/core/state.js";\n'
+ 'export { 盤の乱れを繕う, sackCastle, 将を除く } from "../src/govern/war.js";\n'
+ 'export { checkUnified } from "../src/govern/unify.js";\n'
+ 'export { 問われる家 } from "../src/core/sobuji.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { NEWCOMERS } from "../src/data/newcomers.js";\n');
const out = path.join(ROOT, 'build', 'tenkago.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 鍵 = (a, b) => [a, b].sort().join('|');

console.log('── 一　滅んだ家の約束は解け、旗下に数えない');
{
  const s = A.initState('oda');
  const 滅 = Object.keys(s.factions).find((f) => f !== 'oda' && !s.castles.some((c) => c.faction === f));
  // 遊ぶ側が天下を握り、城を持たぬ家が従属のまま残っている形
  for (const c of s.castles) c.faction = 'oda';
  const 落ちた = Object.keys(s.factions).find((f) => f !== 'oda' && f !== 滅);
  s.relations[鍵('oda', 落ちた)] = { trust: 45, state: '従属', until: null, master: 'oda' };
  const u = A.checkUnified(s);
  確('天下は定まる', !!u && u.fid === 'oda');
  確('城を持たぬ家を旗下に数えない', !!u && u.vassals.length === 0, JSON.stringify(u && u.vassals));
  A.盤の乱れを繕う(s);
  確('見回りで約束が解ける', s.relations[鍵('oda', 落ちた)].state === '中立', s.relations[鍵('oda', 落ちた)].state);
}

console.log('\n── 二　問う家が無ければ惣無事令は発しない');
{
  const s = A.initState('oda');
  for (const c of s.castles) c.faction = 'oda';
  確('天下を握れば、問う家は残らない', A.問われる家(s, 'oda').length === 0);
  s.autoPlay = true;
  // 天下人の位を与え、采配に月を送らせる
  s.courtRanks = { oda: '征夷大将軍' };
  const t = A.advanceMonth(s, s);
  確('采配は空の令を発しない', !t.chronicle.some((e) => /惣無事令を発した/.test(e.text)),
    t.chronicle.filter((e) => /惣無事令/.test(e.text)).map((e) => e.text).join(' / ') || 'なし');
}

console.log('\n── 三　自領になった城への調略は宙に浮く');
{
  const s = A.initState('oda');
  const 我城 = s.castles.find((c) => c.faction === 'oda');
  const 将 = s.generals.find((g) => g.faction === 'oda' && !g.lord);
  s.plots = [{ type: '密約', castleId: 我城.id, genId: 将.id, faction: 'oda', monthsLeft: 1 }];
  const t = A.advanceMonth(s, s);
  const 文 = [...t.chronicle.map((e) => e.text), ...(t.monthEvents || [])].filter((x) => x.includes(`${我城.name}への`));
  確('自領の城への調略は、成否を告げずに消える', 文.length === 0 && !(t.plots || []).some((p) => p.castleId === 我城.id && p.genId === 将.id),
    文.join(' / ') || 'なし');
}

console.log('\n── 四　守る者のいない城の去就は記さない');
{
  const s = A.initState('oda');
  const 的 = s.castles.find((c) => c.faction !== 'oda');
  的.local = 0;
  const 軍 = { id: 'X', faction: 'oda', from: s.castles.find((c) => c.faction === 'oda').id, gens: [], local: 1000, men: 1000,
    localTrain: 60, rost: null, at: 的.id, path: [的.id], prog: 0, food: 999, target: 的.id };
  s.armies.push(軍);
  A.sackCastle(s, 的, 軍, true);
  確('「〇人のうち」の報せが出ない', !s.chronicle.some((e) => /地域家臣団0人のうち/.test(e.text)));
}

console.log('\n── 五　滅亡の控えは重ならない');
{
  const s = A.initState('oda');
  s.ruined = ['isshiki', 'isshiki', 'yamato'];
  A.盤の乱れを繕う(s);
  確('同じ家は一度だけ', s.ruined.length === 2, s.ruined.join('・'));
}

console.log('\n── 六　上杉謙信は一人');
{
  確('後年に出る者の表に上杉政虎（kenshin）は無い', !A.NEWCOMERS.some((n) => n.id === 'kenshin'));
  const s = A.initState('oda');
  const 景虎 = s.generals.find((g) => g.id === 'kagetora');
  s.generals.push({ ...JSON.parse(JSON.stringify(景虎)), id: 'kenshin', name: '上杉政虎', at: 景虎.at, lord: false });
  s.emerged = ['kenshin'];
  A.migrateSave(s);
  確('古い記録の重なりは読み込みで除く', !s.generals.some((g) => g.id === 'kenshin') && s.generals.some((g) => g.id === 'kagetora'));
  確('除いた者は物故に載り、二度と出ない', (s.物故 || []).includes('kenshin') && s.emerged.includes('kenshin'));
}

console.log('\n── 七　出征中の者の元の城');
{
  const s = A.initState('oda');
  const 城 = s.castles.find((c) => c.faction === 'oda');
  const 将 = s.generals.find((g) => g.faction === 'oda' && g.at === 城.id && !g.lord) || s.generals.find((g) => g.faction === 'oda' && !g.lord);
  const 元 = 将.本領;
  将.at = null;
  s.armies.push({ id: 'Y', faction: 'oda', from: 城.id, gens: [将.id], local: 0, men: 100, at: 城.id, path: [城.id], 在陣: 城.id });
  const r = A.出征の元(s, 将);
  確('元の城が分かる', !!r && !!r.城 && r.城.id === (元 || 城.id), r && r.城 ? r.城.name : 'なし');
  確('いまの居所も分かる', !!r && !!r.居所 && r.居所.id === 城.id);
}

console.log('\n── 八　主のいない方面軍は在陣を解く');
{
  const s = A.initState('oda');
  const 城 = s.castles.find((c) => c.faction === 'oda');
  const 将 = s.generals.find((g) => g.faction === 'oda' && !g.lord && g.at === 城.id) || s.generals.find((g) => g.faction === 'oda' && !g.lord);
  将.at = null;
  s.armies.push({ id: 'Z', faction: 'oda', from: 城.id, gens: [将.id], local: 800, men: 800 + 将.retinue,
    localTrain: 60, rost: null, at: 城.id, path: [城.id], prog: 0, food: 999, target: null, 在陣: 城.id, 旗頭: 'いない者' });
  const t = A.advanceMonth(s, s);
  確('軍は解け、将は城へ帰る', !t.armies.some((a) => a.id === 'Z') && t.generals.find((g) => g.id === 将.id).at != null);
}

console.log('\n── 九　物故の控えに載ったまま仕える者は、生きている側を正とする');
{
  const s = A.initState('oda');
  const 将 = s.generals.find((g) => g.faction === 'oda' && !g.lord);
  s.物故 = [...(s.物故 || []), 将.id];
  A.盤の乱れを繕う(s);
  確('控えから外れ、盤に残る', !s.物故.includes(将.id) && s.generals.some((g) => g.id === 将.id));
  // 除くときは控えを作り直す（写しの間で帳を分け合わない）
  const 前 = s.物故;
  A.将を除く(s, 将.id);
  確('除けば控えは新しい帳になる', s.物故 !== 前 && s.物故.includes(将.id) && !前.includes(将.id));
}

console.log('\n── 十　裁きを待つ捕虜を年の初めに知らせる');
{
  const s = A.initState('oda');
  s.month = 1;
  const 捕 = s.generals.find((g) => g.faction !== 'oda' && !g.lord);
  捕.captive = { by: 'oda', from: 捕.faction, at: s.castles.find((c) => c.faction === 'oda').id, since: { y: 1540, m: 1 } };
  const t = A.advanceMonth(s, s);
  確('月の報せに捕虜の数と年数が出る', (t.monthEvents || []).some((x) => /裁きを待つ捕虜が1人いる（最も長い.+は6年）/.test(x)),
    (t.monthEvents || []).filter((x) => /捕虜/.test(x)).join(' / ') || 'なし');
}

console.log(`\nエラー: ${咎.length ? 咎.join(' | ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
