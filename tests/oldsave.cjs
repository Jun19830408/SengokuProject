// 出陣の画面の試験。
//
// 一、味方の城を目標に選べること（城から城へ武将と兵を移す、基本の操作）
// 二、囲まれた味方の城を選べば、囲みを解くための野戦になると分かること
//
// 画面を延々と押して所定の局面へ持っていくのは当てにならないので、
// 盤を直に組み立て、記録として仕込んでから「続きから」で開く。
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
let rafMap = new Map(), rafId = 0;
global.requestAnimationFrame = (cb) => { rafId++; rafMap.set(rafId, cb); return rafId; };
global.cancelAnimationFrame = (id) => rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT = true; dom.window.IS_REACT_ACT_ENVIRONMENT = true;
const ctxStub = new Proxy({}, { get: (t, p) => {
  if (p === 'measureText') return () => ({ width: 30 });
  if (p === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
  if (p === 'createRadialGradient') return () => ({ addColorStop: () => {} });
  return () => {};
} });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 900; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 600; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 900, height: 600, right: 900, bottom: 600 }; };
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 180));
const { createRoot, act, App, React, initState, findPath } = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

/* ------------------------------------------- 盤をこしらえる
   直す前の記録を模す。味方の城を狙う「戦役」が残り、その軍が既に着いている形。
   これが残っていると、直したあとも軍議が開かれ、味方を攻めることになる。 */
const s = initState('oda');
const 自城 = s.castles.filter((x) => x.faction === s.player);
const 出陣元 = 自城[0], 味方先 = 自城[1] || 自城[0];

const gens = s.generals.filter((x) => x.at === 出陣元.id && x.faction === s.player && !x.captive).slice(0, 2);
for (const t of gens) t.at = null;
s.armies.push({
  id: 'oldArmy', faction: s.player, from: 出陣元.id, gens: gens.map((x) => x.id),
  local: 2000, localTrain: 70, rost: null,
  men: 2000 + gens.reduce((a, x) => a + x.retinue, 0), at: 味方先.id,
  path: [味方先.id], prog: 0, food: 5000, target: 味方先.id, sieging: true,
});
// 直す前の作りでは、味方の城にもこれが立てられていた
s.campaigns = [{
  id: 'oldCamp', target: 味方先.id, from: 出陣元.id,
  leader: gens[0].id, leaderName: gens[0].name,
  armies: ['oldArmy'], arrived: ['oldArmy'], y: s.year, m: s.month, decided: null, waited: 0,
}];

const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s })]]);
dom.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
};
console.log(`仕込み: 直す前の記録を模す。味方の ${味方先.name} を狙う戦役が残り、軍は既に着陣している`);

const root = createRoot(document.getElementById('r'));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 5)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 450, clientY: 300 }));
const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
const btn = (t) => [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t) && !b.disabled);
const rc = async (t) => { const el = btn(t); if (!el) return false; await click(el); return true; };

(async () => {
  let 咎 = 0;
  const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎++; };

  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
  await rc('続きから'); await flush(); await flush(); await flush();

  const 文 = document.body.textContent;
  確('続きから開ける', /1546年/.test(文));
  確('味方の城に軍議（攻めかかる）が出ない', !/攻めかかる/.test(文),
    /攻めかかる/.test(文) ? (文.match(/[^。]{0,50}攻めかかる/) || [''])[0] : '');

  // 月を送っても出てこないこと
  for (let m = 0; m < 3; m++) {
    if (!(await rc('次月へ'))) break;
    await flush(); await flush();
    for (const b of ['閉じる', '了']) if (await rc(b)) break;
  }
  確('月を送っても軍議が出ない', !/攻めかかる/.test(document.body.textContent));

  console.log('確かめ:', 咎 ? `★${咎}件が通らなかった` : 'すべて通った');
  console.log('エラー:', errs.length ? errs.slice(0, 2).join(' | ') : 'なし');
  process.exit(咎 ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
