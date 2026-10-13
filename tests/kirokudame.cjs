/* 記録が収まらなかったら、黙って進ませない（GDD 15.3）。

   遊ぶ側の申し出は「全く記録ができない。一五八四年まで進めたのに保存できず
   消えた」であった。棚が一杯であることは画面の帯に出ていたが、月送りの自動の
   記録は返り値を捨てていたので、撥ねられても何も起きなかった。遊ぶ側は収まって
   いるつもりで何年も進め、気づいたときには全部が無い。

   黙って失うのがいちばん悪い。収まらなかったら手を止めて告げる。 */
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
  if (p === 'createRadialGradient' || p === 'createLinearGradient' || p === 'createConicGradient') {
    return () => ({ addColorStop: () => {} });
  }
  if (p === 'createPattern') return () => ({});
  if (p === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
  if (p === 'canvas') return { width: 800, height: 600 };
  return () => {};
} });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;

/* 置き場を「一杯で何も収まらない」形にする（window.storage の口へ差し込む）。 */
global.window.storage = {
  get: async () => null,
  set: async () => { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; },
  delete: async () => {},
};

const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, App, React } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
const txt = () => document.body.textContent || '';
const btn = (t) => [...document.querySelectorAll('button,.mbtn')]
  .find((b) => b.textContent.trim().includes(t) && !b.disabled);
const click = async (el) => { await act(async () => { el.click(); }); await flush(); };
const rc = async (t) => { const el = btn(t); if (!el) return false; await click(el); return true; };

(async () => {
  const root = createRoot(document.getElementById('r'));
  await act(async () => { root.render(React.createElement(App)); });
  await flush(); await flush();
  await rc('ゲームをはじめる'); await flush(); await flush();
  /* 大名を一つ選んで始める（一覧の行は釦ではないので、押しの出来事を投げる）。 */
  const el = [...document.querySelectorAll('.mn')].find((e) => e.textContent.trim() === '織田家');
  if (el) {
    const p2 = el.parentElement;
    for (const k of ['mousedown', 'mouseup', 'click']) {
      await act(async () => { p2.dispatchEvent(new dom.window.MouseEvent(k, { bubbles: true, clientX: 600, clientY: 400 })); });
    }
    await flush();
  }
  await rc('この勢力で開始'); await flush(); await flush();
  確('盤に入れた', /次月へ/.test(txt()), txt().slice(0, 60));

  /* 月を送る。自動の記録は収まらない。 */
  await rc('次月へ'); await flush(); await flush(); await flush();
  for (let i = 0; i < 20 && !/記録が収まらなかった/.test(txt()); i++) await flush();

  console.log('    ◇釦:', [...document.querySelectorAll('button,.mbtn')].filter(b=>!b.disabled).map(b=>b.textContent.trim()).slice(0,12).join(' / '));
  console.log('    ◇記録の帯:', (txt().match(/記録[：:][^\n]{0,40}/) || ['（無し）'])[0]);
  確('収まらなかったことを告げる', /記録が収まらなかった/.test(txt()),
    (txt().match(/記録が収まらなかった[^]{0,60}/) || ['出ていない'])[0].replace(/\s+/g, ' '));
  確('訳が読める', /空き|記録できない/.test(txt()));
  確('記録所へ行ける口がある', !!btn('記録所をひらく'));
  確('そのまま続けることもできる', !!btn('このまま続ける'));

  await rc('このまま続ける'); await flush();
  確('閉じれば遊びは続く', !/記録が収まらなかった/.test(txt()));

  console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
  process.exit(咎.length ? 1 : 0);
})();
