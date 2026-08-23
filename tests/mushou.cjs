/* 将のいない城と、城門の割り付け（GDD 9.2 / 9.3）。

   一、将のいない城は、城下の野戦をしない

   将のいない城でも、これまでは城兵が野へ出て陣を敷いていた。
   将のいない城が門を開いて野で当たる道理はない。城兵は籠るだけである。
   そういう城へ寄せ手が着いたら、野戦を飛ばしてそのまま囲みに入る。

   二、城攻めの前に、門の備えを問う

   城方が遊ぶ側であれば、どの門に誰を置き、兵をどう割るかを決めてから戦が始まる。
   武将のいない門は「◯◯城守備隊」が守る。名も無き者たちであるから器量は低く、
   統率だけが城を預かる者から来る。 */
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
const { createRoot, act, App, React, initState, findPath } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* --------------------------------------------------------- 盤を仕込む
   自家の城から将をすべて引き払い、そこへ敵の軍を着かせる。 */
function 仕込む() {
  const s = initState('oda');
  const 自城 = s.castles.filter((x) => x.faction === s.player);
  let 狙 = null, 敵城 = null;
  for (const c of 自城) {
    const e = s.castles.find((d) => d.faction !== s.player && !d.faction.startsWith('_')
      && (findPath(c.id, d.id) || []).length === 2);
    if (e) { 狙 = c; 敵城 = e; break; }
  }
  if (!狙) return null;
  狙.local = 2000; 狙.food = 40000; 狙.def = 55; 狙.rost = null;
  // 城から将を引き払う（別の自家の城へ移す）
  const 別 = 自城.find((x) => x !== 狙);
  for (const g of s.generals) if (g.at === 狙.id) g.at = 別.id;

  const 敵将 = s.generals.filter((x) => x.at === 敵城.id && x.faction === 敵城.faction && !x.captive).slice(0, 3);
  for (const t of 敵将) t.at = null;
  const 敵軍 = {
    id: 'foe-army', faction: 敵城.faction, from: 敵城.id, gens: 敵将.map((x) => x.id),
    local: 3200, localTrain: 70, rost: null,
    men: 3200 + 敵将.reduce((a, x) => a + x.retinue, 0),
    at: 狙.id, path: [狙.id], prog: 0, food: 12000, target: 狙.id,
  };
  s.armies.push(敵軍);
  s.pendingArrivals = [敵軍.id];
  s.monthEvents = [];
  return { s, 狙, 敵城, 敵軍 };
}

const 仕 = 仕込む();
if (!仕) { console.log('  （仕込める城の並びが無い）'); process.exit(1); }
const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: 仕.s })]]);
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
  await rc('続きから'); await flush(); await flush(); await flush();

  /* ------------------------------ 一、将のいない城は野戦をしない */
  確('城下の野戦は起きない', !/采配|布陣|合戦開始/.test(文()), '');
  確('そのまま囲みに入る', /包囲中/.test(文()), '');
  await rc('戦国記'); await flush();
  確('将がおらず籠ったと記される', /将がおらず/.test(文()),
    (文().match(/.{0,12}将がおらず.{0,34}/) || [''])[0]);
  await rc('閉じる'); await flush();

  /* ------------------------------ 二、城攻めの前に門の備えを問う
     寄せ手が攻めかかるかは向こうの判断（三度に一度）。ここでは必ず攻めかからせる。 */
  const 元 = Math.random;
  let 一度目 = true;
  let 種 = 91;
  Math.random = () => {
    if (一度目) { 一度目 = false; return 0.01; }   // 「攻めかかる」を引かせる
    種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
    let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const 出た = await rc('籠城して待つ');
  await flush(); await flush();
  Math.random = 元;
  確('城方の備えを選べる', 出た, '');
  確('城攻めの前に門の割り付けを問われる', /城門の割り付け/.test(文()), '');
  確('武将のいない門は守備隊が守ると示される', /守備隊/.test(文()), '');
  const 選 = [...document.querySelectorAll('select')];
  確('門の数だけ受け持ちが並ぶ', 選.length >= 4, `${選.length}門`);
  const 統 = (文().match(/統率(\d+)/) || [])[1];
  確('守備隊の統率が示される', 統 != null && +統 > 0, 統 ? `統率${統}` : '示されない');

  /* ------------------------------ 三、決めれば城攻めが始まる */
  await rc('この備えで迎え撃つ'); await flush(); await flush();
  確('城攻めが始まる', /城攻め/.test(文()) && /合戦開始|一括命令/.test(文()), '');
  const 数 = [...(文().match(/兵\s*([\d,]+)/g) || [])].map((t) => Number(t.replace(/[^\d]/g, '')));
  確('城の兵がそのまま盤に立つ', 数.length >= 1 && Math.abs(数[0] - 仕.狙.local) <= 2,
    `${数[0]}人／城兵 ${仕.狙.local}人`);
  確('門はすべて盤に出ている', (文().match(/門\s*100%/g) || []).length >= 6,
    `${(文().match(/門\s*100%/g) || []).length}門`);

  console.log('');
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 6).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
