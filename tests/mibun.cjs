/* 身分の境と望む知行を家の大きさで動かす（GDD 6.4・6.1）。

   遊ぶ側の申し出を、ここで縛る。

     一　物頭の信長の望む石高が五万石を超えており、これに応えるとあっという間に
         宿老になる。望む石高を、能力だけでなく大名家の大きさに従って変えてほしい
     二　身分に要る石高を、大名家の大きさに応じて変えてほしい。ただし、小さいときに
         家老だった者が、家が大きくなると侍大将になるのはおかしい。昔からその家に
         いて家老になった者はそのまま、大きくなってから家臣になった者は、さらに
         多くの石高が要る
     三　それぞれの武将の知行について、どこに何石持っているのかを、武将一覧で
         わかるようにしてほしい

   あわせて、家督で控えが継がれること、家を移れば控えが効かぬこと、減封で
   就いたときの境を割れば身分が降りること、月送りで尺が改まること、尺の
   無かった頃の記録を読んでも身分が下がらぬことを確かめる。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>',
  { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
let rafId = 0; const rafMap = new Map();
global.requestAnimationFrame = (cb) => { rafId++; rafMap.set(rafId, cb); return rafId; };
global.cancelAnimationFrame = (id) => rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT = true; dom.window.IS_REACT_ACT_ENVIRONMENT = true;
const ctxStub = new Proxy({}, { get: () => () => ({ addColorStop: () => {} }) });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 200));

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'mibun-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { default as React, act } from "react";\n'
+ 'export { createRoot } from "react-dom/client";\n'
+ 'export { GeneralList } from "../src/ui/panels.jsx";\n'
+ 'export { initState, migrateSave } from "../src/core/state.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { grantFief } from "../src/govern/commands.js";\n'
+ 'export { inheritHouse } from "../src/core/house.js";\n'
+ 'export { RANKS, 尺を量る, 家の尺, 身分の境, 身分を控える, 家の尺を改める, 次の身分, rankName, stipendOf, fiefOf, fiefWanted, 家の石高, 国主に任じる, 国主を繕う } from "../src/core/rank.js";\n');
const out = path.join(ROOT, 'build', 'mibun.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, define: { 'process.env.NODE_ENV': '"development"' }, logLevel: 'error' });
const A = require(out);

let 種 = 0x3A7E;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 石 = (n) => `${Math.round(n).toLocaleString('ja-JP')}石`;

/* 家を大きくする。他家の城を織田家に移す（石高の高い順に、足りるまで）。 */
const 家を大きくする = (s, fid, 目当て) => {
  const 他 = s.castles.filter((c) => c.faction !== fid).sort((a, b) => b.koku - a.koku);
  for (const c of 他) {
    if (A.家の石高(s, fid) >= 目当て) break;
    c.faction = fid; c.lordId = null;
  }
};
/* 禄高が目当てを越えるまで知行を与える（余禄の分け前があるので、一度では決まらない）。 */
const 禄高を合わせる = (s, x, 目当て) => {
  for (let i = 0; i < 30 && A.stipendOf(s, x) < 目当て; i++) x.fief = A.fiefOf(x) + Math.max(50, Math.round((目当て - A.stipendOf(s, x)) * 0.8));
  for (let i = 0; i < 30 && A.stipendOf(s, x) > 目当て * 1.03; i++) x.fief = Math.max(0, A.fiefOf(x) - Math.round((A.stipendOf(s, x) - 目当て) * 0.5));
};
/* 二十を越えた、一門でない、役の無い家臣 */
const 家臣ら = (s, fid) => s.generals.filter((x) => x.faction === fid && !x.lord && !x.captive
  && (x.age || 30) >= 20 && !x.役 && !x.一門 && !s.generals.some((y) => y.guardian === x.id));

console.log('── 一　家の尺');
{
  確('三十万石の家で一', A.尺を量る(300000) === 1);
  確('五万石の家は〇.五で止まる', A.尺を量る(50000) === 0.5);
  確('百万石の家は一.八三', Math.abs(A.尺を量る(1000000) - 1.826) < 0.001, A.尺を量る(1000000).toFixed(3));
  確('三百万石の家は三で止まる', A.尺を量る(3000000) === 3);
  const s = A.initState('oda');
  const k = s.factions.oda.家の尺;
  確('盤を立てると家ごとに尺が控えられる', k != null && Math.abs(k - A.尺を量る(A.家の石高(s, 'oda'))) < 0.001,
    `織田家 ${石(A.家の石高(s, 'oda'))} 尺${k}`);
  const 境 = A.身分の境(s, { faction: 'oda' });
  確('身分の境は、三十万石の家の境に尺を掛けたもの',
    境.宿老 === Math.round(20000 * k) && 境.家老 === Math.round(8000 * k) && 境.侍大将 === Math.round(2500 * k),
    `宿老${石(境.宿老)}・家老${石(境.家老)}・侍大将${石(境.侍大将)}`);
  const 大 = Object.keys(s.factions).sort((a, b) => A.家の石高(s, b) - A.家の石高(s, a))[0];
  const 小 = Object.keys(s.factions).filter((f) => A.家の石高(s, f) > 0).sort((a, b) => A.家の石高(s, a) - A.家の石高(s, b))[0];
  確('大きな家ほど境が高い', A.身分の境(s, { faction: 大 }).家老 > 境.家老 && 境.家老 > A.身分の境(s, { faction: 小 }).家老,
    `${s.factions[大].name}${石(A.身分の境(s, { faction: 大 }).家老)}・織田家${石(境.家老)}・${s.factions[小].name}${石(A.身分の境(s, { faction: 小 }).家老)}`);
}

console.log('\n── 二　望む知行は家の大きさで変わる');
{
  const s = A.initState('oda');
  const 信長 = s.generals.find((x) => x.name === '織田信長');
  const w = A.fiefWanted(信長, s);
  確('十二歳の信長は、禄高の齢の頭打ち（二千四百石）を超えては望まない', w <= 2400, `望む${石(w)}（もとは五万九百四十七石）`);
  確('十二歳の信長は物頭のまま（小さな家で境が下がっても、十三に満たぬ者は物頭まで）',
    A.rankName(信長, s) === '物頭', `${A.rankName(信長, s)}・禄高${石(A.stipendOf(s, 信長))}／侍大将の境${石(A.身分の境(s, 信長).侍大将)}`);
  const 次 = A.次の身分(s, 信長);
  確('城の帳には「十三歳になれば侍大将」と出せる（禄高は足りている）', 次 && 次.key === '侍大将' && 次.齢 === 13,
    JSON.stringify(次));
  const 大人 = { ...信長, age: 30, faction: 'oda' };
  const 大人の望み = A.fiefWanted(大人, s);
  確('器量の頂でも、宿老の境の一.二五倍までしか望まない', 大人の望み <= Math.round(A.身分の境(s, { faction: 'oda' }).宿老 * 1.25) + 1,
    `三十歳なら${石(大人の望み)}／宿老の境${石(A.身分の境(s, { faction: 'oda' }).宿老)}`);
  const x = 家臣ら(s, 'oda').sort((a, b) => A.fiefWanted(b, s) - A.fiefWanted(a, s))[0];
  const 前 = A.fiefWanted(x, s);
  家を大きくする(s, 'oda', 1200000);
  A.家の尺を改める(s);
  const 後 = A.fiefWanted(x, s);
  確('家が大きくなれば、同じ者の望む知行も増える', 後 > 前 * 1.5,
    `${x.name}　${石(前)} → ${石(後)}（家 ${石(A.家の石高(s, 'oda'))}、尺${s.factions.oda.家の尺}）`);
}

console.log('\n── 三　古参の身分は据え置き、新参はいまの境で測る');
{
  const s = A.initState('oda');
  const [古, 新] = 家臣ら(s, 'oda');
  const 境0 = A.身分の境(s, { faction: 'oda' });
  禄高を合わせる(s, 古, 境0.家老 * 1.15);
  確('（下ごしらえ）小さな家で家老になる', A.rankName(古, s) === '家老', `${古.name} 禄高${石(A.stipendOf(s, 古))}／境${石(境0.家老)}`);
  A.家の尺を改める(s);                                   // 月を送るときと同じく、控えてから尺を改める
  確('家老に就いたときの境が控えられる', 古.身分控 && 古.身分控.家 === 'oda' && 古.身分控.家老 === 境0.家老,
    JSON.stringify(古.身分控));
  家を大きくする(s, 'oda', 1200000);
  A.家の尺を改める(s);
  const 境1 = A.身分の境(s, { faction: 'oda' });
  確('（下ごしらえ）家が大きくなり、家老の境が上がる', 境1.家老 > A.stipendOf(s, 古),
    `いまの境${石(境1.家老)}／${古.name}の禄高${石(A.stipendOf(s, 古))}`);
  確('昔から家老であった者は、家老のまま', A.rankName(古, s) === '家老', `${古.name} ${A.rankName(古, s)}`);
  // 新参：家が大きくなってから仕えた者には控えが無い
  新.身分控 = undefined;
  禄高を合わせる(s, 新, 境0.家老 * 1.15);
  確('大きくなってから仕えた者は、同じ禄高でも家老に届かない',
    A.stipendOf(s, 新) >= 境0.家老 && A.rankName(新, s) !== '家老',
    `${新.name} 禄高${石(A.stipendOf(s, 新))}は${A.rankName(新, s)}（いまの家老の境${石(境1.家老)}）`);
  禄高を合わせる(s, 新, 境1.家老 * 1.05);
  確('いまの境に届けば、新参も家老になる', A.rankName(新, s) === '家老', `${新.name} 禄高${石(A.stipendOf(s, 新))}`);
  // 宿老へ上がるのは、古参でもいまの境
  禄高を合わせる(s, 古, 境0.宿老 * 1.1);
  確('古参も、上の身分へはいまの境で上がる（控えはまだ就いていない身分には効かない）',
    A.stipendOf(s, 古) < 境1.宿老 && A.rankName(古, s) === '家老',
    `${古.name} 禄高${石(A.stipendOf(s, 古))}／いまの宿老の境${石(境1.宿老)}`);
  // 減封で就いたときの境を割れば降りる
  禄高を合わせる(s, 古, 境0.家老 * 0.85);
  確('減封されて就いたときの境を割れば、身分は降りる', A.rankName(古, s) !== '家老',
    `${古.name} 禄高${石(A.stipendOf(s, 古))}は${A.rankName(古, s)}`);
  // 家を移れば控えは効かない
  禄高を合わせる(s, 古, 境0.家老 * 1.15);
  確('（下ごしらえ）禄高を戻せば、また家老', A.rankName(古, s) === '家老');
  const 元の家 = 古.faction;
  古.faction = 'imagawa';
  const 境2 = A.身分の境(s, 古);
  確('家を移れば、控えは効かない（移った先のいまの境で測る）',
    境2.家老 === A.身分の境(s, { faction: 'imagawa' }).家老, `今川家の家老の境 ${石(境2.家老)}`);
  古.faction = 元の家;
}

console.log('\n── 四　家督を継いだ者は、親の控えを継ぐ');
{
  const s = A.initState('oda');
  const [親, 子] = 家臣ら(s, 'oda');
  const 境0 = A.身分の境(s, { faction: 'oda' });
  禄高を合わせる(s, 親, 境0.家老 * 1.2);
  親.house = true;
  A.家の尺を改める(s);
  s.親 = { ...(s.親 || {}), [子.id]: 親.id };
  子.身分控 = undefined;
  const 継 = A.inheritHouse(s, 親);
  確('（下ごしらえ）子が家督を継ぐ', 継 && 継.id === 子.id);
  確('子は親の控え（家老に就いたときの境）を継ぐ', 子.身分控 && 子.身分控.家老 === 親.身分控.家老,
    JSON.stringify(子.身分控));
}

console.log('\n── 五　月送りで尺が改まり、古参の役は剥がれない');
{
  const s0 = A.initState('oda');
  /* 織田家は尾張一国（当主の国）なので、初めは国主がいない。国主のいる家で確かめる。
     家老の境が国主の禄高を越えるまで、その家を大きくする。 */
  const 国主 = s0.generals.filter((x) => x.役 === '国主' && !x.captive)
    .sort((a, b) => A.stipendOf(s0, a) - A.stipendOf(s0, b))[0];
  確('（下ごしらえ）国主のいる家がある', !!国主, 国主 ? `${s0.factions[国主.faction].name}の${国主.name}（${国主.役国}）` : '');
  const fid = 国主.faction;
  const k0 = s0.factions[fid].家の尺;
  家を大きくする(s0, fid, 1500000);
  確('城を取っても、その月のうちは尺が動かない', s0.factions[fid].家の尺 === k0);
  const s1 = A.advanceMonth(s0, s0);
  const k1 = s1.factions[fid].家の尺;
  確('月を送れば、家の石高で尺が改まる', k1 > k0, `尺 ${k0} → ${k1}`);
  const 後 = s1.generals.find((x) => x.id === 国主.id);
  const 境1 = A.身分の境(s1, { faction: fid });
  確('（下ごしらえ）いまの家老の境は、その国主の禄高を越えている', 境1.家老 > A.stipendOf(s1, 後),
    `いまの家老の境${石(境1.家老)}／${後.name}の禄高${石(A.stipendOf(s1, 後))}`);
  確('古参の国主は、境が上がっても身分を保ち、役も剥がれない',
    後 && 後.役 === '国主' && ['家老', '宿老'].includes(A.rankName(後, s1)),
    `${後.name} ${A.rankName(後, s1)}・${後.役 || '役なし'}`);
}

console.log('\n── 六　家の尺の無かった頃の記録');
{
  const s0 = A.initState('oda');
  家を大きくする(s0, 'oda', 1200000);
  const 古 = JSON.parse(JSON.stringify(s0));
  for (const f of Object.values(古.factions)) delete f.家の尺;
  for (const x of 古.generals) delete x.身分控;
  // その頃の身分（境は家によらず一つ）
  for (const f of Object.values(古.factions)) f.家の尺 = 1;
  const 前 = new Map(古.generals.filter((x) => x.faction === 'oda').map((x) => [x.id, A.rankName(x, 古)]));
  for (const f of Object.values(古.factions)) delete f.家の尺;
  const 読 = A.migrateSave(古);
  確('読み込むと家ごとに尺が控えられる', 読.factions.oda.家の尺 > 1, `織田家 尺${読.factions.oda.家の尺}`);
  const 下がった = 読.generals.filter((x) => x.faction === 'oda' && 前.has(x.id)
    && ['物頭', '侍大将', '家老', '宿老'].indexOf(A.rankName(x, 読)) > ['物頭', '侍大将', '家老', '宿老'].indexOf(前.get(x.id))
    && ['物頭', '侍大将', '家老', '宿老'].includes(前.get(x.id)));
  確('大きな家でも、読み込んだとたんに身分の下がる者はいない', !下がった.length,
    下がった.map((x) => `${x.name} ${前.get(x.id)}→${A.rankName(x, 読)}`).join('・'));
}

console.log('\n── 七　武将一覧で、知行がどこに何石あるか分かる');
{
  const s = A.initState('oda');
  const root = A.createRoot(document.getElementById('r'));
  const 文 = () => document.body.textContent.replace(/\s+/g, ' ');
  let 開いた = null;
  A.act(() => { root.render(A.React.createElement(A.GeneralList, { g: s, onClose: () => {}, onYakume: () => {}, onOpenCastle: (id) => { 開いた = id; } })); });
  const x = 家臣ら(s, 'oda').find((y) => A.fiefOf(y) > 0);
  const 本 = s.castles.find((c) => c.id === x.本領);
  const 札 = `知行 ${A.fiefOf(x).toLocaleString('ja-JP')}石（本領 ${本.name}・${本.kuni}）`;
  確('家臣ごとに、知行の高と本領の城・国が出る', 文().includes(札), 札);
  確('禄高と望む知行も添えられる', 文().includes(`禄高 ${A.stipendOf(s, x).toLocaleString('ja-JP')}石`)
    && 文().includes(`望む ${A.fiefWanted(x, s).toLocaleString('ja-JP')}石`));
  確('この家の身分の境が書かれる', 文().includes(`家老 ${A.身分の境(s, { faction: 'oda' }).家老.toLocaleString('ja-JP')}石`));
  const 押す = (字) => {
    const b = [...document.querySelectorAll('button')].find((y) => y.textContent.trim() === 字);
    if (b) A.act(() => { b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
    return !!b;
  };
  確('「知行の多い順」に並べ替えられる', 押す('知行の多い順'));
  const 名の並び = () => [...document.querySelectorAll('.mn')].map((e) => e.textContent.replace(/〔.*?〕/g, '').trim());
  const 家臣の名 = s.generals.filter((y) => y.faction === 'oda' && !y.lord).sort((a, b) => A.fiefOf(b) - A.fiefOf(a)).map((y) => y.name);
  const 並 = 名の並び().filter((n) => 家臣の名.includes(n));
  確('知行の多い者から並ぶ', 並[0] === 家臣の名[0] && 並[1] === 家臣の名[1], 並.slice(0, 3).join('・'));
  確('「本領の城ごと」に並べられる', 押す('本領の城ごと'));
  const 負 = s.generals.filter((y) => (y.本領 || y.at) === 本.id && !y.captive && !y.lord).reduce((a, y) => a + A.fiefOf(y), 0);
  確('城ごとに、石高と家臣に配った知行の計が出る',
    文().includes(`石高 ${本.koku.toLocaleString('ja-JP')}石のうち 家臣の知行 ${負.toLocaleString('ja-JP')}石`), 本.name);
  確('城の名を押せば、その城の人事が開く', 押す(本.name) && 開いた === 本.id, String(開いた));
  A.act(() => { root.unmount(); });
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : (errs.length ? errs.slice(0, 2).join(' | ') : 'なし')}`);
process.exit(咎.length ? 1 : 0);
