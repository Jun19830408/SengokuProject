/* 終幕（GDD 15.5）。

   一局の終わりを告げているか。これまでは、天下が定まっても報せに一行流れるだけ、
   家が絶えても城のない地図が残るだけであった。いつ終わったのかが分からぬのでは、
   遊びとして収まりがつかない。

   終わりは二つ。
     天下が定まる … すべての城が自家の旗の下に入ったとき（位は四つに分かれる）
     家が絶える   … 拠るべき城を一つも持たなくなったとき

   告げたあとに閉じ込めはしない。閉じれば盤へ戻れる。 */
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
const { createRoot, act, App, React, initState } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* ---------------------- 一、城を一つも持たなくなったら、家は絶える */
{
  const s = initState('oda');
  // 自家の城をすべて他家に渡す
  const 他 = s.castles.find((c) => c.faction !== s.player).faction;
  for (const c of s.castles) if (c.faction === s.player) c.faction = 他;
  const t = H.advanceMonth(s, s);
  確('城が尽きれば「絶えた」と記される', !!t.滅び,
    t.滅び ? `${t.滅び.y}年${t.滅び.m}月` : '記されない');
  確('その報せが月の報せに出る', (t.monthEvents || []).some((x) => /絶える|絶え/.test(x)),
    (t.monthEvents || []).filter((x) => /絶/.test(x))[0] || '');
  確('戦国記にも残る', (t.chronicle || []).some((x) => /絶えた/.test(x.text)), '');
}

/* ---------------------- 三、画面で「終幕」が出ること */
const s2 = initState('oda');
s2.unified = { fid: s2.player, y: 1571, m: 9, vassals: ['imagawa'], direct: false,
  grade: '覇', mine: 120, total: s2.castles.length };
const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s2 })]]);
dom.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
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
  await rc('続きから'); await flush(); await flush();

  確('天下が定まれば「終幕」が出る', /天下、定まる/.test(文()), '');
  確('位が示される', /覇/.test(文()), '');
  確('直に治めた城の数が出る', /120/.test(文()), '');
  確('閉じ込めはしない（盤へ戻れる）', !!btn('盤へ戻る'), '');
  await rc('盤へ戻る'); await flush();
  確('閉じれば盤へ戻る', !/天下、定まる/.test(文()), '');
  await rc('次月へ'); await flush(); await flush();
  確('一度告げたら、月が替わっても出続けない', !/天下、定まる/.test(文()), '');

  console.log('');
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
