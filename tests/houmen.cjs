/* 方面軍の顛末が、遊ぶ側に読める形で届くか（GDD 6.4）。

   旗頭に任せた戦は、これまで戦国記に一行残るだけであった。遊ぶ側の申し出は
   「攻めたこと等がよくわかるように、単なる記録ではなく、よりわかりやすい記載に
   したい」であった。月報に【方面軍】の段を立て、出陣から落城までをひとまとまりに
   して置く。合わせて、願いを却下したときに陣が払われるかを、釦を押して検める。 */
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
const { createRoot, act, App, React, initState, MonthReport, 国主に任じる, 旗頭に任じる } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const root = createRoot(document.getElementById('r'));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 5)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 450, clientY: 300 }));
const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
const btn = (t) => [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t) && !b.disabled);
const 文字 = () => {
  const b = document.body.cloneNode(true);
  for (const x of b.querySelectorAll('style,script')) x.remove();
  return b.textContent.replace(/\s+/g, ' ');
};

(async () => {
/* ------------------------------------------------ 一　月報に方面軍の段が立つ */
console.log('\n── 一　月報に「方面軍」の段が立ち、顛末がまとめて読める');
{
  const g = initState('oda');
  g.monthEvents = [
    '【方面軍】織田信長が観音寺城の陣を進め、松ヶ島城（北畠家）へ向かう／兵6,716人・要り6,176人・およそ2ヶ月。',
    '雑賀衆より貢が届いた（金191貫・米7,237石）。',
    '【方面軍】松ヶ島城（北畠家）を落とした。城に残った兵0人。手勢1,989人はそのまま城下に在陣する。',
  ];
  await act(async () => { root.render(React.createElement(MonthReport, { g, onClose: () => {} })); });
  await flush();
  const t = 文字();
  確('方面軍の段が立つ', /方面軍/.test(t));
  確('顛末が読める', /松ヶ島城（北畠家）を落とした/.test(t));
  確('【方面軍】の印は段に畳まれ、行には残らない', !/【方面軍】/.test(t));
  確('ほかの報せは報せの段に残る', /貢が届いた/.test(t));
  await act(async () => { root.render(null); });
}

/* ------------------------------------------------ 二　却下すれば陣を払う */
console.log('\n── 二　攻めの願いを却下すれば、在陣の陣を払って帰る');
{
  const s = initState('oda');
  for (const k of ['尾張', '美濃', '三河', '近江']) {
    for (const c of s.castles.filter((x) => x.kuni === k)) c.faction = 'oda';
  }
  const 当主 = s.generals.find((g) => g.faction === 'oda' && g.lord);
  const 尾張 = s.castles.find((c) => c.faction === 'oda' && c.kuni === '尾張');
  当主.at = 尾張.id; 当主.本領 = 尾張.id;
  const 城 = s.castles.find((c) => c.faction === 'oda' && c.kuni === '近江');
  const 旗 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.役);
  旗.age = 35; 旗.fief = 60000; 旗.at = 城.id; 旗.本領 = 城.id; 城.lordId = 旗.id;
  国主に任じる(s, 'oda', '近江', 旗.id);
  旗頭に任じる(s, 'oda', 旗.id);
  const 供 = s.generals.filter((x) => x.faction === 'oda' && !x.lord && x.id !== 旗.id).slice(0, 2);
  for (const g of 供) g.at = null;
  s.armies = [...(s.armies || []), {
    id: 'camp', faction: 'oda', from: 城.id, gens: 供.map((g) => g.id),
    local: 3000, localTrain: 70, rost: null, men: 3000 + 供.reduce((a, g) => a + g.retinue, 0),
    at: 城.id, path: [城.id], prog: 0, food: 4000, target: null, 旗頭: 旗.id, 在陣: 城.id,
  }];
  const 的 = s.castles.find((c) => c.faction !== 'oda');
  s.旗頭の願い = { 旗頭: 旗.id, castleId: 的.id, y: s.year, m: s.month };

  const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: 1, state: s })]]);
  dom.window.storage = {
    get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
    set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
    delete: async (k) => { 蔵.delete(k); return {}; },
  };
  await act(async () => { root.render(React.createElement(App, null)); });
  await flush();
  for (let i = 0; i < 20 && !btn('却下する'); i++) {
    const b = btn('続きから') || btn('はじめる') || btn('評定を開く') || btn('閉じる');
    if (!b) break;
    await click(b);
  }
  const 願 = btn('却下する');
  確('攻めの願いが画面に出る', !!願, 願 ? 文字().match(/よりの願い/) ? '願いの札' : '' : '出ない');
  if (願) {
    await click(願);
    確('願いの札は閉じる', !btn('却下する'));
    /* 顛末は戦国記に残る。開いて確かめる。 */
    const 記 = btn('戦国記');
    if (記) await click(記);
    const t = 文字();
    確('陣を払った旨が戦国記に残る', /陣を払/.test(t), (t.match(/[^。]*陣を払[^。]*。/) || [''])[0]);
  }
  await act(async () => { root.render(null); });
}

})().then(() => {
console.log(`\n════ 方面軍の報せ：咎 ${咎.length} 件`);
const 重い = errs.filter((e) => !/act\(|Warning: /.test(e));
if (重い.length) console.log('　画面の咎:', 重い.slice(0, 3).join(' | '));
console.log('エラー:', 咎.length || 重い.length ? [...咎, ...重い.slice(0, 3)].join(' | ') : 'なし');
process.exit(咎.length || 重い.length ? 1 : 0);
});
