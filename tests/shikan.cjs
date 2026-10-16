/* 捕虜の仕官の願い（GDD 12.4）。

   遊ぶ側の考えは「囚われたままの捕虜は勝手に登用を求めてくるのでいい」であった。
   もとは「心を移した。登用できる」と一度報せるだけで、一五八八年の記録には
   裁かれぬ捕虜が四十六人、最も長い者は三十三年囚われていた。また他家は捕虜を
   どうもしなかった。

     一、心を移した捕虜は、みずから仕官を願い出る（遊ぶ家には願いの札が立つ）
     二、願いの札から召し抱えれば家臣になり、断れば一年は願い出ない
     三、他家の捕虜は、心を移せば他家がそのまま召し抱える
     四、囚われた年は、古い記録の形（「1560-3」）でも読める */
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

let 種 = 0x51CA;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
dom.window.Math.random = Math.random;

const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, App, React, initState } = H;

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

/* 捕虜を一人こしらえる。心を移した（忠誠四十以下）者で、旧主の一門でない者を選ぶ。 */
function 捕らえておく(s, 主) {
  const 城 = s.castles.find((c) => c.faction === 主);
  for (const g of s.generals) {
    if (g.faction === 主 || g.lord || g.captive || !g.faction) continue;
    const 前 = g.loyal;
    g.captive = { by: 主, from: g.faction }; g.loyal = 30;
    const 可 = H.仕官を願えるか(s, g);
    g.captive = null; g.loyal = 前;
    if (!可) continue;
    H.makePrisoner(s, g, 主, 城.id);
    g.loyal = 30;
    return g;
  }
  throw new Error('捕虜にできる者がいない');
}

(async () => {
console.log('\n── 一　心を移した捕虜は、みずから仕官を願い出る');
let 願いの盤 = null;
{
  const s = initState('oda');
  const q = 捕らえておく(s, 'oda');
  確('心を移した捕虜は願い出られる', H.仕官を願えるか(s, q), `${q.name}（旧主への忠誠${q.loyal}）`);
  let t = s;
  /* 身代金の申し出が先に立つと、遊ぶ側が答えるまで願いの札は出ない。
     画面なしでは誰も答えないので、月ごとに申し出を退けておく。 */
  for (let i = 0; i < 24 && !t.仕官の願い; i++) { t.ransomOffer = null; t = H.advanceMonth(t, t); }
  確('願いの札が立つ', !!t.仕官の願い && t.仕官の願い.genId === q.id, t.仕官の願い ? `${t.year}年${t.month}月` : '立たない');
  確('月報に願いが出る', (t.monthEvents || []).some((x) => x.includes('仕官を願い出た')));
  願いの盤 = t;
}

console.log('\n── 二　願いの札から召し抱える／断る');
for (const 釦 of ['召し抱える', '断る（捕虜のまま）']) {   // 断るは他の札（縁談など）にもあるので、文言まで見る
  const s = structuredClone(願いの盤);
  const id = s.仕官の願い.genId;
  const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: 1, state: s })]]);
  let 最後 = null;
  dom.window.storage = {
    get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
    set: async (k, v) => { 蔵.set(k, v); 最後 = v; return { key: k, value: v }; },
    delete: async (k) => { 蔵.delete(k); return {}; },
  };
  await act(async () => { root.render(React.createElement(App, null)); });
  await flush();
  for (let i = 0; i < 20 && !btn(釦); i++) {
    const b = btn('続きから') || btn('はじめる') || btn('評定を開く') || btn('閉じる');
    if (!b) break;
    await click(b);
  }
  const b = btn(釦);
  確(`「${釦}」の釦が出る`, !!b);
  if (b) {
    await click(b);
    確('札は閉じる', !btn(釦));
    const 記 = btn('戦国記');
    if (記) await click(記);
    const 文 = document.body.textContent;
    const 名 = s.generals.find((g) => g.id === id).name;
    if (釦 === '召し抱える') 確('召し抱えたことが戦国記に残る', 文.includes(`${名}が降り`));
    else 確('退けたことが戦国記に残る', 文.includes(`${名}の仕官の願いを退けた`));
  }
  await act(async () => { root.render(null); });
}

console.log('\n── 三　断れば一年は重ねて願い出ない');
{
  const s = structuredClone(願いの盤);
  const q = s.generals.find((g) => g.id === s.仕官の願い.genId);
  q.captive = { ...q.captive, 断った: { y: s.year, m: s.month } };
  s.仕官の願い = null;
  確('断った直後は願い出ない', !H.仕官を願えるか(s, q));
  s.year += 1;
  確('一年たてばまた願い出られる', H.仕官を願えるか(s, q));
}

console.log('\n── 四　他家の捕虜は他家が召し抱える');
{
  const s = initState('oda');
  const 他 = s.castles.find((c) => c.faction === 'saito').faction;
  const q = 捕らえておく(s, 他);
  let t = s;
  for (let i = 0; i < 24; i++) {
    t = H.advanceMonth(t, t);
    const r = t.generals.find((g) => g.id === q.id);
    if (!r || !r.captive) break;
  }
  const r = t.generals.find((g) => g.id === q.id);
  確('他家が召し抱えた', !!r && !r.captive && r.faction === 他, r ? `${r.name}・${r.faction}・忠誠${r.loyal}` : '盤にいない');
  確('当主にはならない', !!r && !r.lord);
  確('戦国記に残る', (t.chronicle || []).some((x) => x.text.includes(q.name) && x.text.includes('仕えた')));

  /* 家の絶えた捕虜は、勝った家への忠誠が五十に達してから */
  const s2 = initState('oda');
  const q2 = 捕らえておく(s2, 他);
  H.takeAsPrisoner(s2, q2, 他, q2.at);
  確('家の絶えた捕虜は、心が開くまで願い出ない', !H.仕官を願えるか(s2, s2.generals.find((g) => g.id === q2.id)));
  s2.generals.find((g) => g.id === q2.id).warLoyal = 50;
  確('心が開けば願い出る', H.仕官を願えるか(s2, s2.generals.find((g) => g.id === q2.id)));
}

console.log('\n── 五　囚われた年の読み方');
{
  確('新しい形', H.囚われた年({ captive: { since: { y: 1560, m: 3 } } }) === 1560);
  確('古い形（「1560-3」）', H.囚われた年({ captive: { since: '1560-3' } }) === 1560);
  確('控えの無い者', H.囚われた年({ captive: {} }) === null);
}
})().then(() => {
  const 重い = errs.filter((e) => !/act\(|Warning: /.test(e));
  if (重い.length) console.log('　画面の咎:', 重い.slice(0, 3).join(' | '));
  console.log('エラー:', 咎.length || 重い.length ? [...咎, ...重い.slice(0, 3)].join(' | ') : 'なし');
  process.exit(咎.length || 重い.length ? 1 : 0);
});
