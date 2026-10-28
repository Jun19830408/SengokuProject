/* 出陣中の城主と留守の城代（GDD 6.4）。

   遊ぶ側の申し出は「大名（もしくは城主）が出陣している最中、その者の城の城主が別の者に
   変わっている。出陣中であれば、別の城に所属が変わらない限り、元の城の城主は変わらない
   はず。出陣中に元の城にとどまって預かる者は、出陣中のための城代という立場がよい。
   また、大名が軍を解いて元の城に戻ったのに、城主が大名以外の者になっている。大名がいる
   城の城主はいつでも大名。城主も、軍を解いて元の城に戻ったら城主のままでいるべき」で
   あった。

   測ったところ、一般の城主の札は出陣中も保たれていた。崩れていたのは当主の城である。
   当主が城を離れると、その城は「当主のいない城」として、月送りの札据えが残る者のうち
   身代の重い者に札を立て（織田家なら織田信光、または佐久間信盛を城代に）、当主が戻っても
   札は「生きている者」なので下ろさなかった。

   確かめること。
     一、当主が出陣しても、当主の城に札は立たず、城主は当主のまま。留守は残る者が預かる
     二、軍を解いて戻れば、城主は当主（札は無い）
     三、前に別の者へ立ってしまった札は、当主が城にいれば下ろす（古い記録の繕い）
     四、一般の城主は、出陣中も軍を解いて戻っても城主のまま。留守は残る者が預かる */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'rusui-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState, 城主の札を据える } from "../src/core/state.js";\n'
+ 'export { 軍を解く } from "../src/govern/war.js";\n'
+ 'export { newRoster } from "../src/core/roster.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { castellanOf, 城を守る将, 当主の城の主 } from "../src/core/rank.js";\n');
const out = path.join(ROOT, 'build', 'rusui.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* 織田家で、当主と一般の城主を一人ずつ出陣させる。月送りは新しい盤を返すので、
   城と将は id で引き直す。 */
const fid = 'oda';
let s = A.initState(fid);
s.player = fid;
const 当主id = s.generals.find((g) => g.faction === fid && g.lord).id;
const 本拠id = s.generals.find((g) => g.id === 当主id).at;
const 他城 = s.castles.find((c) => c.faction === fid && c.id !== 本拠id && c.lordId
  && !s.generals.find((g) => g.id === c.lordId).lord);
const 他城id = 他城.id, 他主id = 他城.lordId;
const G = (id) => s.generals.find((g) => g.id === id) || {};
const C = (id) => s.castles.find((c) => c.id === id);
const 名 = (g) => (g && g.name) || '―';
const 出す = (gid, cid) => {
  const g = G(gid), from = C(cid);
  g.at = null;
  const a = { id: 'A' + cid, faction: fid, from: cid, gens: [gid], local: 800, localTrain: 70,
    rost: A.newRoster(800, 'arm-' + cid), men: 800 + (g.retinue || 0),
    at: cid, path: [cid], prog: 0, food: 9000, target: null, 在陣: cid };
  from.local -= 800;
  s.armies.push(a);
  return a.id;
};
console.log(`仕込み：当主 ${G(当主id).name}（${C(本拠id).name}）と、${C(他城id).name}の城主 ${G(他主id).name}を出陣させる`);

console.log('── 一　当主が出陣しても、当主の城の城主は当主のまま');
const 軍1 = 出す(当主id, 本拠id), 軍2 = 出す(他主id, 他城id);
let 札が立った = null, 主が替わった = null, 留守 = null;
for (let m = 1; m <= 3; m++) {
  s = A.advanceMonth(s);
  const 拠 = C(本拠id);
  if (拠.lordId && 札が立った == null) 札が立った = `${m}か月目に${名(G(拠.lordId))}`;
  const 主 = A.castellanOf(s, 拠);
  if ((!主 || 主.id !== 当主id) && 主が替わった == null) 主が替わった = `${m}か月目に${名(主)}`;
  留守 = A.城を守る将(s, 拠);
}
確('出陣のあいだ、当主の城に札は立たない', 札が立った == null, 札が立った || '三か月とも札なし');
確('出陣のあいだも、城主は当主', 主が替わった == null, 主が替わった || `城主 ${名(A.castellanOf(s, C(本拠id)))}`);
確('留守は城に残る者が預かる（当主ではない）', !!留守 && 留守.id !== 当主id && 留守.at === 本拠id, `留守 ${名(留守)}`);

console.log('── 四　一般の城主は、出陣中も城主のまま');
{
  const c = C(他城id), 主 = A.castellanOf(s, c), 守 = A.城を守る将(s, c);
  確('出陣のあいだも札はその城主に残る', c.lordId === 他主id, `札 ${名(G(c.lordId))}`);
  確('出陣のあいだも、城の帳の城主はその城主', !!主 && 主.id === 他主id, `城主 ${名(主)}`);
  確('留守は城に残る者が預かる', !!守 && 守.id !== 他主id && 守.at === 他城id, `留守 ${名(守)}`);
}

console.log('── 二　軍を解いて戻れば、城主は当主');
for (const aid of [軍1, 軍2]) {
  const a = s.armies.find((x) => x.id === aid);
  if (a) A.軍を解く(s, a);
}
for (let m = 1; m <= 2; m++) s = A.advanceMonth(s);
{
  const 拠 = C(本拠id), 主 = A.castellanOf(s, 拠);
  確('当主は元の城へ戻っている', G(当主id).at === 本拠id, `居所 ${G(当主id).at}`);
  確('当主の城に札は無い', !拠.lordId, `札 ${名(G(拠.lordId))}`);
  確('城主は当主', !!主 && 主.id === 当主id, `城主 ${名(主)}`);
  const c = C(他城id), 主2 = A.castellanOf(s, c);
  確('一般の城主も元の城へ戻り、城主のまま', G(他主id).at === 他城id && c.lordId === 他主id && !!主2 && 主2.id === 他主id,
    `居所 ${G(他主id).at}・城主 ${名(主2)}`);
}

console.log('── 三　前に立ってしまった札は、当主が城にいれば下ろす');
{
  const 拠 = C(本拠id);
  const 留 = s.generals.find((g) => g.at === 本拠id && g.faction === fid && !g.lord && !g.captive);
  拠.lordId = 留.id; 拠.城代 = true;                 // 古い記録の姿（当主が出た月に立った札が残っている）
  確('札が残っていても、城の帳の城主は当主', (A.castellanOf(s, 拠) || {}).id === 当主id, `札 ${留.name}`);
  A.城主の札を据える(s);
  確('札を据え直せば、当主の城の札は下りる', !拠.lordId && !拠.城代, `札 ${名(G(拠.lordId))}`);
}

console.log(`\n════ 出陣中の城主と城代：咎 ${咎.length} 件`);
console.log('エラー:', 咎.length ? 咎.join(' | ') : 'なし');
process.exit(咎.length ? 1 : 0);
