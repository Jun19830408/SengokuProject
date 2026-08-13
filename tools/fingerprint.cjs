// 賽の目を固定して長く走らせ、月ごとの「指紋」を書き出す道具。
//
// ゲームは賽の目（乱数）で動くが、これを固定すれば毎度まったく同じ展開になる。
// 分割の前と後で、この指紋が一字一句そろえば、振る舞いは変わっていない。
//
//   node tools/fingerprint.cjs orig  [月数]
//   node tools/fingerprint.cjs split [月数]
const path = require('path');
const crypto = require('crypto');

const WHICH = process.argv[2] === 'orig' ? 'orig' : 'split';
const MONTHS = Number(process.argv[3] || 60);

/* ---------------------------------------------- 賽の目を固定する
   同じ種から同じ目が出る、ごく単純な仕掛け（mulberry32）。 */
let 種 = 0x9E3779B9;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// 刻もまた固定する。軍の名づけに刻を使っているため。
let 刻 = 1546_000_000_000;
Date.now = () => (刻 += 1000);

/* ---------------------------------------------------------- 仮の画面 */
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>',
  { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
dom.window.Math.random = Math.random;
dom.window.Date.now = Date.now;
let rafMap = new Map(), rafId = 0;
global.requestAnimationFrame = (cb) => { rafId++; rafMap.set(rafId, cb); return rafId; };
global.cancelAnimationFrame = (id) => rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT = true; dom.window.IS_REACT_ACT_ENVIRONMENT = true;
const ctxStub = new Proxy({}, { get: (t, p) => {
  if (p === 'measureText') return () => ({ width: 30 });
  if (p === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
  return () => {};
} });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 1200; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 800; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, width: 1200, height: 800, right: 1200, bottom: 800 };
};
const store = new Map();
dom.window.storage = {
  get: async (k) => (store.has(k) ? { key: k, value: store.get(k) } : null),
  set: async (k, v) => { store.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { store.delete(k); return {}; },
};
const errs = [];
console.error = (...a) => errs.push(String(a[0]).slice(0, 120));

const { createRoot, act, App, React } = require(path.join(__dirname, '..', 'build',
  WHICH === 'orig' ? 'harness-orig.cjs' : 'harness.cjs'));
const root = createRoot(document.getElementById('r'));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 600, clientY: 400 }));
const 押す = async (t) => {
  const el = [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t));
  if (!el || el.disabled) return false;
  await act(async () => { M('mousedown', el); });
  await act(async () => { M('mouseup', el); });
  await act(async () => { M('click', el); });
  await flush(); return true;
};
const 家を開く = async (nm) => {
  const el = [...document.querySelectorAll('.mn')].find((e) => e.textContent.trim() === nm);
  if (!el) return false;
  const p = el.parentElement;
  for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, p); });
  await flush(); return true;
};
const 印 = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

// 画面から「ゲームが語ったこと」だけを取り出す。
// 釦の名や飾りの字は比べない（釦を足しただけで食い違うのでは、確かめにならぬ）。
// 出来事は必ず句点で終わる文として書かれるので、それを拾う。
// 画面の字。飾り（style）や書き付け（script）の中身は数えない。
function 画面の字() {
  const b = document.body.cloneNode(true);
  for (const x of b.querySelectorAll('style,script')) x.remove();
  return b.textContent;
}

function 語られたこと(t) {
  const 文 = t.match(/[^。\s][^。]{2,120}。/g) || [];
  const 数 = (t.match(/\d[\d,\.]*\s*(万石|貫|城|人|年|月)/g) || []);
  return 文.join('\n') + '\n---\n' + 数.join(' ');
}

(async () => {
  await act(async () => { root.render(React.createElement(App)); });
  await flush();
  await 押す('ゲームをはじめる');
  await 家を開く('新開家');
  const cards = [...document.querySelectorAll('button')].filter((b) => /この勢力を任せて見物する/.test(b.textContent));
  if (!cards.length) { console.log('★見物の入口が見つからない'); process.exit(1); }
  for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, cards[0]); });
  await flush();

  for (let m = 1; m <= MONTHS; m++) {
    if (!(await 押す('次月へ'))) { console.log(`${String(m).padStart(3)}: ★次月へ進めない`); break; }
    await 押す('評定を開く');
    const t = 画面の字();
    // 報せの中身をそのまま指紋にする。合戦の損害も、城の落ち方も、ここに出る。
    console.log(`${String(m).padStart(3)}: ${印(語られたこと(t))} ${(t.match(/石高 [\d.]+ 万石/) || [''])[0]} ${(t.match(/拠点 \d+ 城/) || [''])[0]}`);
    if (process.env.DUMP && Number(process.env.DUMP) === m) {
      require('fs').writeFileSync(`/tmp/dump_${WHICH}_${m}.txt`, 語られたこと(t));
    }
    if (/名乗らせる/.test(t)) await 押す('と名乗らせる');
    if (/を捕らえた/.test(t) && /登用する/.test(t)) await 押す('捕虜とする');
    if (/身代金の申し出/.test(t)) await 押す('受ける');
    if (/包囲中/.test(document.body.textContent)) await 押す('兵糧攻め');
    if (/籠城して待つ/.test(document.body.textContent)) await 押す('籠城して待つ');
    if (/軍議/.test(document.body.textContent)) await 押す('攻めかかる');
  }

  await 押す('戦国記');
  const ch = document.querySelector('.card');
  const log = ch ? ch.textContent.replace(/\s+/g, ' ') : '';
  console.log('戦国記の指紋:', 印(語られたこと(log)));
  console.log('落城:', (log.match(/が落ち、/g) || []).length, '件');
  console.log('本陣を衝いた:', (log.match(/本陣を衝いた/g) || []).length, '件');
  console.log('エラー:', errs.length ? errs.slice(0, 3).join(' | ') : 'なし');
  process.exit(0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', e.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
});
