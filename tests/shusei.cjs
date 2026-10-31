/* 出征中の者の人事（GDD 6.4）。

   軍にいる者は城に立たない（居所が空）。そのため、どの城の「人事」にも出ず、
   武将の帳には「出征中」としか出なかった。遊ぶ側の申し出は「出征中の武将を
   検索しても元の所属の城がわからず、人事ができない」であった。
   武将の帳には出た城といまの居所を出し、押せばその城の人事を開く。城の人事には
   その城から出征している者を並べ、褒賞と知行は与えられるようにする。 */
const path = require('path');
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
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { React, createRoot, act, CastleSheet, GeneralList, initState } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

const s = initState('oda');
const 城 = s.castles.find((c) => c.faction === 'oda' && s.generals.some((g) => g.at === c.id && g.faction === 'oda' && !g.lord));
const 将 = s.generals.find((g) => g.at === 城.id && g.faction === 'oda' && !g.lord);
const 的 = s.castles.find((c) => c.faction !== 'oda');
将.at = null;
s.armies.push({ id: 'shu', faction: 'oda', from: 城.id, gens: [将.id], local: 500, men: 500 + 将.retinue,
  localTrain: 60, rost: null, at: 的.id, path: [的.id], prog: 0, food: 999, target: 的.id, sieging: true });
s.sieges = [{ castleId: 的.id, armyId: 'shu', months: 1, decided: null }];

const root = createRoot(document.getElementById('r'));
const 文 = () => document.body.textContent.replace(/\s+/g, ' ');

console.log('── 一　武将の帳');
let 開いた = null;
act(() => { root.render(React.createElement(GeneralList, { g: s, onClose: () => {}, onYakume: () => {}, onOpenCastle: (id) => { 開いた = id; } })); });
確('出征中の者に、出た城が添えられる', 文().includes(`出征中（${城.name}より`), (文().match(/出征中（[^）]*）/) || ['なし'])[0]);
// 名で探すと、城の名でも当たる
const 釦 = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(`${城.name}より`));
確('押せる釦になっている', !!釦);
if (釦) act(() => { 釦.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
確('押せば元の城が開かれる', 開いた === 城.id, String(開いた));

console.log('\n── 二　城の人事');
act(() => { root.render(React.createElement(CastleSheet, {
  g: s, castle: 城, land: false, tab: '人事', setTab: () => {}, onClose: () => {},
  onReward: () => {}, onFief: () => {}, onAppoint: () => {},
})); });
確('この城から出征中の者が並ぶ', 文().includes(将.name), 将.name);
確('出征中と添えられ、城を預けるのは帰陣の後と分かる', /出征中.*城を預けるのは帰陣の後/.test(文()));
const 褒 = [...document.querySelectorAll('button')].filter((b) => b.textContent.includes('褒賞'));
確('褒賞の釦がある', 褒.length > 0);

console.log(`\nエラー: ${咎.length ? 咎.join(' | ') : (errs.length ? errs.slice(0, 2).join(' | ') : 'なし')}`);
process.exit(咎.length ? 1 : 0);
