/* 控えの兵（GDD 9.3）。

   城攻めの盤には、一隊三千までしか立てない。それを超える兵は戦場の外に控える。
   ところが城が落ちた途端、その控えが消えていた。

     if (won && army) { army.local = aLeft; sackCastle(...); }

   aLeft は「盤に立っていた隊の生き残り」である。すぐ上で控えを足し戻していたのに、
   勝った枝でそれを捨てていた。二万で寄せて城を落とすと、一万二千が忽然と失せる。
   大軍で攻めるほど大きく消えるので、遊ぶ側からは「勝ったのに兵が激減した」と映る。

   ここでは、画面から通しで城攻めを走らせ、戦の前後で家の兵数を突き合わせる。 */
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
let 種 = 0x77;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
dom.window.Math.random = Math.random;
const { createRoot, act, App, React, initState, findPath } = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* ------------------------------------------ 大軍で囲んだ盤を仕込む */
const s = initState('oda');
let 自 = null, 的 = null;
for (const c of s.castles.filter((x) => x.faction === s.player)) {
  for (const d of s.castles) {
    if (d.faction === c.faction) continue;
    const p = findPath(c.id, d.id);
    if (p && p.length === 2) { 自 = c; 的 = d; break; }
  }
  if (自) break;
}
const 将 = s.generals.filter((x) => x.at === 自.id && x.faction === 自.faction && !x.captive).slice(0, 3);
for (const t of 将) t.at = null;
const 地兵 = 20000;                                  // 三隊では盤に出きらない大軍
const 直属 = 将.reduce((a, x) => a + x.retinue, 0);
s.armies.push({
  id: 'siegeArmy', faction: 自.faction, from: 自.id, gens: 将.map((x) => x.id),
  local: 地兵, localTrain: 80, rost: null, men: 地兵 + 直属,
  at: 的.id, path: [的.id], prog: 0, food: 99999, target: 的.id, sieging: true,
});
的.local = 4000; 的.def = 80; 的.hp = 4000; 的.food = 90000; 的.min = 80;
s.sieges = [{ castleId: 的.id, armyId: 'siegeArmy', months: 1, decided: null }];

const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s })]]);
dom.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
};

const root = createRoot(document.getElementById('r'));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 5)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 450, clientY: 300 }));
const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
const btn = (t) => [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t) && !b.disabled);
const rc = async (t) => { const el = btn(t); if (!el) return false; await click(el); return true; };
const txt = () => [...document.querySelectorAll('body *:not(style)')]
  .map((e) => (e.children.length ? '' : e.textContent)).join(' ').replace(/\s+/g, ' ');
const 家の兵 = () => { const m = txt().match(/万石\s+([\d,]+)/); return m ? Number(m[1].replace(/,/g, '')) : null; };

(async () => {
  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
  await rc('続きから'); await flush(); await flush();
  const 前 = 家の兵();
  確('盤を仕込めた（大軍で囲んでいる）', !!btn('強攻') && 前 > 地兵,
    `家の兵 ${前}人（うち寄せ手 ${地兵 + 直属}人）`);
  if (!btn('強攻')) { console.log('エラー: 包囲の段が出ない'); process.exit(1); }

  await rc('強攻'); await flush(); await flush();
  const 盤の兵 = Number(((txt().match(/([\d,]+)\s+\d+\s+対/) || [])[1] || '0').replace(/,/g, ''));
  確('三千を超える兵は盤に出ない（残りは控え）', 盤の兵 > 0 && 盤の兵 < 地兵 * 0.75,
    `盤に ${盤の兵}人／寄せ手 ${地兵 + 直属}人`);

  await rc('合戦開始'); await flush();
  await rc('委ねて結果を見る');
  for (let k = 0; k < 40000; k++) {
    const q = [...rafMap.entries()]; rafMap.clear();
    if (q.length) await act(async () => { q.forEach(([, cb]) => cb(2000 + k * 90)); }); else await flush();
    if (btn('戦場を離れる')) break;
  }
  const 戦 = txt();
  const 損 = [...(戦.match(/損害\s*直属\s*([\d,]+)人.*?地域\s*([\d,]+)人/) || [])];
  確('決着がついた', !!btn('戦場を離れる'), (戦.match(/城は落ちた|寄せ手は退けられた/) || [''])[0]);
  await rc('戦場を離れる'); await flush(); await flush();

  const 後 = 家の兵();
  const 減 = 前 - 後;
  const 討たれた = 損.length >= 3 ? Number(損[1].replace(/,/g, '')) + Number(損[2].replace(/,/g, '')) : null;
  /* 城が落ちれば、その城の守兵が家の兵に加わる。だから減りは損害より小さくなる。
     控えが消えていたころは、二万で寄せて一万一千以上が失せていた。 */
  /* 控えが消えていたころは、二万で寄せて一万一千以上が失せた。
     盤の損害（四千前後）に収まっていれば、控えは帰っている。 */
  確('勝っても控えの兵が消えない', 減 < 7000,
    `家の兵 ${前} → ${後}（${減 >= 0 ? '減' : '増'}${Math.abs(減)}人／盤の損害 ${討たれた == null ? '―' : 討たれた + '人'}）`);
  確('減りは盤の損害の範囲に収まる', 討たれた == null || 減 <= 討たれた + 200,
    `減${減}人／損害${討たれた}人`);
  /* 損害帳の穴。城から射かけて削った兵（矢倉と狭間）は、長らく「損害」に
     一人も出ていなかった。三千人が消えて損害六百と出るので、
     遊ぶ側からは兵が理由もなく減ったようにしか見えない。 */
  確('城から射かけて削られた兵も損害に出る', 討たれた != null && 討たれた > 減 * 0.6,
    `損害${討たれた}人（実の減り${減}人）`);

  console.log('');
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 6).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
