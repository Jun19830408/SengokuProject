/* 合戦の道具立てをしまう（GDD 8.1）。

   縦に持った携帯では、上の帯と下の欄に挟まれて盤が狭い。指で操るのだから
   釦は要るが、戦の運びを見たいときには邪魔になる。

   もとは「収納」（下の欄）と「広く」（上の帯）が別々であった。二度押さねば
   広くならず、しかも左の釦の列は残ったままである。

   一つにまとめた。「広く」を押せば、帯も欄も左の釦もまとめて引っ込み、盤だけが
   残る。残るのは隅の取っ手一つで、押せば同じ道を通って戻ってくる。 */
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
  return () => ({ addColorStop: () => {} });
} });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 430; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 830; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 430, height: 830, right: 430, bottom: 830 }; };
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 180));
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, React, BattleScreen } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 0x2468;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

(async () => {
  const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 8)); }); };

  // 野の戦を一つ仕立てる
  H.setBattleMap(null); H.setFieldSeed('shimau', 'y'); H.layoutField(7000, 6);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 65, valor: 65, wit: 58, gov: 55,
    retinue: 500, retTrain: 70, unity: 62 });
  const P = [0, 1].map((k) => H.makeCorps('P', 将(k), 0, 1200, 75, 75, W * (0.35 + k * 0.3), Hh * 0.84, -Math.PI / 2, '#2F5D8C'));
  const E = [0, 1].map((k) => H.makeCorps('E', 将(10 + k), 0, 1000, 75, 75, W * (0.35 + k * 0.3), Hh * 0.16, Math.PI / 2, '#B0483C'));
  for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
  const b = H.createBattle(P, E, 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1100; b.face = 'S'; b.myFar = false;

  const ctx = { b, pName: '織田家', eName: '今川家', pColor: '#2F5D8C', eColor: '#B0483C',
    place: '桶狭間', mode: 'field' };
  const root = createRoot(document.getElementById('r'));
  // land = false（縦に持った携帯）
  await act(async () => {
    root.render(React.createElement(BattleScreen, { ctx, land: false, onEnd: () => {} }));
  });
  await flush();

  const 釦 = (t) => [...document.querySelectorAll('.mbtn,button')]
    .find((x) => (x.textContent || '').includes(t));
  const 押 = async (el) => { await act(async () => {
    el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  }); await flush(); };

  console.log('── 一　出しているとき');
  確('上の帯が出ている', !!document.querySelector('.bar'));
  確('左の道具立てが出ている',
    !!document.querySelector('.mapctl.l') && !document.querySelector('.mapctl.l.hid'));
  確('下の欄が出ている', !!document.querySelector('.bpanel'));
  確('「広く」がある', !!釦('広く'));

  console.log('\n── 二　しまったとき');
  await 押(釦('広く'));
  確('上の帯が消える', !document.querySelector('.bar'));
  確('下の欄が消える', !document.querySelector('.bpanel'));
  確('左の道具立ても引っ込む',
    !!document.querySelector('.mapctl.l.hid') || !document.querySelector('.mapctl.l'),
    document.querySelector('.mapctl.l') ? 'hid が付いた（滑って外へ）' : '消えた');
  確('取っ手だけが残る', !!document.querySelector('.grip'));
  確('盤（canvas）は残っている', !!document.querySelector('canvas'));
  確('戦の運びは読める（兵と刻の要約が浮く）',
    /対/.test(document.body.textContent) && /\d+:\d\d/.test(document.body.textContent));

  console.log('\n── 三　取っ手を押せば戻る');
  await 押(document.querySelector('.grip'));
  確('上の帯が戻る', !!document.querySelector('.bar'));
  確('下の欄が戻る', !!document.querySelector('.bpanel'));
  確('左の道具立てが戻る',
    !!document.querySelector('.mapctl.l') && !document.querySelector('.mapctl.l.hid'));
  確('取っ手は消える', !document.querySelector('.grip'));

  console.log('\n── 四　下の欄だけをしまうこともできる');
  await 押(釦('収納'));
  確('下の欄だけ消える', !document.querySelector('.bpanel') && !!document.querySelector('.bar'));
  確('左の道具立ては残る', !document.querySelector('.mapctl.l.hid'));

  console.log('');
  console.log('エラー:', errs.filter((e) => !/not wrapped in act|Warning/.test(e)).slice(0, 2).join(' | ') || 'なし');
  process.exit(咎.length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
