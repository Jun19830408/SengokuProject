/* 遊び方（説明書）が、遊びの中から読めること。

   説明書は src/data/manual.js ひとつから作る。画面の中の「遊び方」も、配る PDF も
   同じ表を見るので、片方だけが古くなることがない。ここでは、
     ・タイトル画面から読めること
     ・遊びの最中（地図の画面）からも読めること
     ・章を押せばその章が出ること
   を確かめる。中身そのものは表を見ればよいので、章の名が並ぶことだけ見る。 */
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>',
  { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
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
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 900; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 600; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, width: 900, height: 600, right: 900, bottom: 600 };
};
console.error = () => {};
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, App, React } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

const root = createRoot(document.getElementById('r'));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 450, clientY: 300 }));
const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
const btn = (t) => [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t) && !b.disabled);
const rc = async (t) => { const el = btn(t); if (!el) return false; await click(el); return true; };
const 文 = () => document.body.textContent;

(async () => {
  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();

  /* -------------------------------------------- 一、タイトル画面から読める */
  確('題名が「センゴク盤」になっている', /センゴク盤/.test(文()), '');
  確('タイトルに「遊び方を読む」がある', !!btn('遊び方を読む'), '');
  await rc('遊び方を読む'); await flush();
  確('遊び方が開く', /遊び方/.test(文()) && /はじめに/.test(文()), '');
  確('章が並ぶ', ['政務', '出陣と行軍', '合戦（野戦）', '合戦（城攻め）', '武将']
    .every((k) => 文().includes(k)),
    ['政務', '出陣と行軍', '合戦（野戦）', '合戦（城攻め）', '武将'].filter((k) => !文().includes(k)).join('／') || '');
  確('初めは「はじめに」の中身が出ている', /一月の流れ/.test(文()), '');

  // 章を押せば、その章が出る
  await rc('合戦（野戦）'); await flush();
  確('章を押すとその章が出る', /士気と崩れ|分遣と伏兵/.test(文()), '');
  確('前の章の中身は退く', !/一月の流れ/.test(文()), '');

  await rc('閉じる'); await flush();
  確('閉じればタイトルに戻る', !/一月の流れ/.test(文()) && !!btn('遊び方を読む'), '');

  /* -------------------------------------- 二、遊びの最中にも読める */
  await rc('ゲームをはじめる') || await rc('新しくはじめる'); await flush(); await flush();
  // 大名を選び、始める
  const 家札 = [...document.querySelectorAll('.mn')].find((e) => e.textContent.trim() === '織田家');
  if (家札) { await click(家札.parentElement); await flush(); }
  await rc('この勢力で開始'); await flush(); await flush();
  const 釦 = [...document.querySelectorAll('button,.mbtn')].map((b) => b.textContent.trim()).filter(Boolean);
  確('遊びの画面に「遊び方」がある', !!btn('遊び方'), 釦.slice(0, 14).join('／'));
  await rc('遊び方'); await flush();
  確('遊びの最中でも遊び方が開く', /一月の流れ|章/.test(文()) || /はじめに/.test(文()), '');
  await rc('閉じる'); await flush();
  確('閉じれば地図に戻る', !/一月の流れ/.test(文()), '');

  console.log('');
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
