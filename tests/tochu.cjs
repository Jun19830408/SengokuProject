/* 月の途中に開く報せ（panels.jsx MonthReport の 途中・MapScreen の 兵糧攻めに移った）。

   城攻めで兵糧攻めに移ると、その月の兵糧攻めの結果を報せの板で見せる。もとは月初報告の板を
   そのまま開いたので、月の半ばに「月初報告」の見出しが出ていた。ここで確かめること。
     一、見出し … 月の途中に開けば「兵糧攻めの報せ」、月送りの後なら「月初報告」
     二、頭に出す … その月の途中の報せ（兵糧攻めの結果）を報せの頁の頭に置き、月初の報せは
                    その下に「この月の初めの報せ」として続ける（二度は載せない）
     三、閉じる釦 … 月の途中なら「閉じる」、月初なら「評定を開く」 */
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
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 900; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 600; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 900, height: 600, right: 900, bottom: 600 }; };
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 200));

let 種 = 0x5151;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
dom.window.Math.random = Math.random;

const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, React, initState, MonthReport } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const root = createRoot(document.getElementById('r'));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 5)); }); };
const 文字 = () => {
  const b = document.body.cloneNode(true);
  for (const x of b.querySelectorAll('style,script')) x.remove();
  return b.textContent.replace(/\s+/g, ' ');
};
const 釦 = (t) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === t);

(async () => {
  const g = initState('oda');
  const 兵糧 = '清洲城への強攻を打ち切り、兵糧攻めに移った。ひと月囲んだ（囲みの締め60％・囲んで1か月）。城の内は窺えない。';
  g.monthEvents = ['雑賀衆より貢が届いた（金191貫・米7,237石）。', 兵糧];
  g.途中の報せ = { y: g.year, m: g.month, 文: [兵糧] };

  console.log('■ 一、見出し・二、頭に出す・三、閉じる釦（月の途中）');
  await act(async () => { root.render(React.createElement(MonthReport, { g, 途中: true, onClose: () => {} })); });
  await flush();
  const t = 文字();
  確('月の途中に開けば、見出しは「兵糧攻めの報せ」', t.includes(`${g.year}年${g.month}月 兵糧攻めの報せ`) && !t.includes('月初報告'));
  const 頭 = t.indexOf('兵糧攻めに移った。'), 初め = t.indexOf('この月の初めの報せ'), 貢 = t.indexOf('貢が届いた');
  確('兵糧攻めの結果を頭に置き、月初の報せはその下に続ける', 頭 >= 0 && 初め > 頭 && 貢 > 初め, `${頭}・${初め}・${貢}`);
  確('兵糧攻めの結果は二度は載せない', t.split('兵糧攻めに移った。').length - 1 === 1);
  確('閉じる釦は「閉じる」', !!釦('閉じる') && !釦('評定を開く'));
  await act(async () => { root.render(null); });

  console.log('■ 月初（月送りの後）');
  await act(async () => { root.render(React.createElement(MonthReport, { g, onClose: () => {} })); });
  await flush();
  const t2 = 文字();
  確('月送りの後に開けば、見出しは「月初報告」', t2.includes(`${g.year}年${g.month}月 月初報告`));
  確('閉じる釦は「評定を開く」', !!釦('評定を開く'));
  await act(async () => { root.render(null); });

  const 他月 = { ...g, 途中の報せ: { y: g.year - 1, m: g.month, 文: [兵糧] } };
  await act(async () => { root.render(React.createElement(MonthReport, { g: 他月, 途中: true, onClose: () => {} })); });
  await flush();
  確('前の月の途中の報せは頭に出さない', !文字().includes('この月の初めの報せ'));
  await act(async () => { root.render(null); });

  console.log('');
  if (errs.length) console.log('（console.error）', errs.slice(0, 3));
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})();
