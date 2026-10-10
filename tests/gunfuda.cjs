/* 地図の軍の印を押せば、軍の帳が開く（GDD 7.3 / 13.1）。

   地図には進んでいる軍が「軍」の印で出ていたが、押しても何も起きなかった。
   総勢の数だけが印の脇に添えてあるきりで、誰が率いているのか、何を積んで
   どこへ向かっているのかは読めない。遊ぶ側の申し出は「軍勢が城に到着する前の
   段階で、政務マップには『軍』という表記で進軍している様子がわかりますが、
   これをタップしたら軍の内容（武将や兵数など）がわかるようにもしてほしい」で
   あった。

   当たりは城より狭く取り、城を外したときだけ見る。在陣の軍は城の印に重なって
   いるので、城の帳の「この城に在る軍」が受け持つ――押せば城が開く。 */
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>',
  { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
let rafId = 0; const rafMap = new Map();
global.requestAnimationFrame = (cb) => { rafId++; rafMap.set(rafId, cb); return rafId; };
global.cancelAnimationFrame = (id) => rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT = true; dom.window.IS_REACT_ACT_ENVIRONMENT = true;
const ctxStub = new Proxy({}, { get: (t, p) => {
  if (p === 'measureText') return () => ({ width: 30 });
  if (p === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
  return () => ({ addColorStop: () => {} }); } });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 1200; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 800; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, width: 1200, height: 800, right: 1200, bottom: 800 }; };
if (!dom.window.structuredClone) dom.window.structuredClone = structuredClone;
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { React, createRoot, act, MapScreen, initState, newRoster, findPath, nodeById } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 0x6A17;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* 道の半ばに軍を一つ立てた盤を組む。 */
const 盤 = () => {
  const s = initState('oda');
  const 本拠 = s.castles.find((x) => x.id === s.factions.oda.本拠);
  const 的 = s.castles.find((x) => x.faction !== 'oda');
  const 将ら = s.generals.filter((x) => x.faction === 'oda' && x.at === 本拠.id && !x.lord).slice(0, 2);
  for (const g2 of 将ら) g2.at = null;
  const 全道 = findPath(本拠.id, 的.id) || [本拠.id, 的.id];
  /* 城から離れた区間の半ばに立たせる。城の印に重なっていては、押しても
     城が開く（当たりは城が先である）。 */
  let 道 = 全道, 遠 = -1;
  for (let i = 0; i + 1 < 全道.length; i++) {
    const p0 = nodeById(全道[i]), p1 = nodeById(全道[i + 1]);
    if (!p0 || !p1) continue;
    const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
    const d = Math.min(...s.castles.map((c) => Math.hypot(c.x - mx, c.y - my)));
    if (d > 遠) { 遠 = d; 道 = 全道.slice(i); }
  }
  const a = { id: 'G1', faction: 'oda', from: 本拠.id, gens: 将ら.map((x) => x.id),
    local: 4800, localTrain: 72, rost: newRoster(4800, 'arm-G1'),
    men: 4800 + 将ら.reduce((t, x) => t + x.retinue, 0), at: 道[0], path: 道, prog: 0.5,
    food: 16000, target: 的.id };
  s.armies.push(a);
  return { s, a, 本拠, 的, 将ら };
};

const root = createRoot(document.getElementById('r'));
/* 地図は rAF の中で描かれる。jsdom では自分で回さねば一度も描かれない。 */
const 描かせる = () => {
  for (let i = 0; i < 6; i++) {
    const ら = [...rafMap.entries()]; rafMap.clear();
    act(() => { for (const [, cb] of ら) { try { cb(performance.now ? performance.now() : Date.now()); } catch (e) { /* よい */ } } });
  }
};
const 文 = () => document.body.textContent.replace(/\s+/g, ' ');
const 押す = (x, y) => {
  const cv = document.querySelector('.mapwrap canvas');
  if (!cv) return false;
  for (const t of ['mousedown', 'mouseup']) {
    act(() => { cv.dispatchEvent(new dom.window.MouseEvent(t,
      { bubbles: true, clientX: x, clientY: y })); });
  }
  return true;
};

console.log('── 一　道を行く軍の印を押せば、軍の帳が開く');
{
  const { s, a, 的, 将ら } = 盤();
  let 盤面 = s;
  act(() => { root.render(null); });            // 前の検めの控えを残さない
  act(() => { root.render(React.createElement(MapScreen, {
    g: 盤面, setG: (f) => { 盤面 = typeof f === 'function' ? f(盤面) : f; },
    terrain: {}, land: false, onSave: () => {}, saves: [], onTitle: () => {},
  })); });
  描かせる();
  const 地図 = dom.window.__地図;
  確('地図が描かれている', !!地図 && !!document.querySelector('.mapwrap canvas'),
    地図 ? `寄り×${地図.見.s.toFixed(2)}` : 'なし');
  /* 軍の印の世界座標（描き手と同じ出し方で出す） */
  const n0 = nodeById(a.path[0]), n1 = a.path.length > 1 ? nodeById(a.path[1]) : n0;
  const wx = n0.x + (n1.x - n0.x) * a.prog, wy = n0.y + (n1.y - n0.y) * a.prog;
  const [sx, sy] = 地図.画面(wx, wy);
  確('軍の印が画面のうちにある', sx > 0 && sx < 1200 && sy > 0 && sy < 800,
    `（${Math.round(sx)},${Math.round(sy)}）`);
  確('押せた', 押す(sx, sy));
  const t = 文();
  確('軍の帳が開く', /率いる将/.test(t), (t.match(/[^ ]*の軍/) || ['—'])[0]);
  確('総勢が読める', t.includes('総勢'), (t.match(/総勢[^人]{0,12}人/) || ['—'])[0]);
  確('率いる将の名が読める', 将ら.every((x) => t.includes(x.name)),
    将ら.map((x) => x.name).join('・'));
  確('行き先が読める', t.includes(的.name), 的.name);
}

console.log('\n── 二　城の印を押せば、これまでどおり城が開く');
{
  const { s, 本拠 } = 盤();
  let 盤面 = s;
  act(() => { root.render(null); });            // 前の検めの控えを残さない
  act(() => { root.render(React.createElement(MapScreen, {
    g: 盤面, setG: (f) => { 盤面 = typeof f === 'function' ? f(盤面) : f; },
    terrain: {}, land: false, onSave: () => {}, saves: [], onTitle: () => {},
  })); });
  描かせる();
  const 地図 = dom.window.__地図;
  const [sx, sy] = 地図.画面(本拠.x, 本拠.y);
  押す(sx, sy);
  const t = 文();
  確('城の帳が開く', t.includes(本拠.name) && /城主/.test(t), 本拠.name);
  確('軍の帳は開かない', !/率いる将/.test(t));
}

console.log('\n── 三　何も無い所を押せば、どちらも開かない');
{
  const { s } = 盤();
  let 盤面 = s;
  act(() => { root.render(null); });            // 前の検めの控えを残さない
  act(() => { root.render(React.createElement(MapScreen, {
    g: 盤面, setG: (f) => { 盤面 = typeof f === 'function' ? f(盤面) : f; },
    terrain: {}, land: false, onSave: () => {}, saves: [], onTitle: () => {},
  })); });
  押す(4, 4);
  const t = 文();
  確('軍の帳も城の帳も開かない', !/率いる将/.test(t) && !/城主の格/.test(t));
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
