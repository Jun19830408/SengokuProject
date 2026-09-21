/* ==========================================================================
   天下分け目の画面（GDD 12.6）

   模型（core/wakeme.js）は tests/wakeme.cjs で叩いてある。ここでは実際に
   地図の画面を組み立て、釦を押して触れを出し、野へ出て、戦の跡まで通す。
   画面を通さぬ試験だけでは、ctx の綴り違いのような書き損じが捕まらない
   ――海戦の白い画面がそれであった。
   ========================================================================== */
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
  if (p === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
  if (p === 'createRadialGradient' || p === 'createLinearGradient' || p === 'createConicGradient') {
    return () => ({ addColorStop: () => {} });
  }
  if (p === 'canvas') return { width: 1000, height: 620 };
  return () => ({ addColorStop: () => {} });
} });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 1000; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 620; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 1000, height: 620, right: 1000, bottom: 620 }; };

const errs = [];
console.error = (...a) => errs.push(String(a[0]).slice(0, 300));
/* 描きの最中の例外は console.error に出るので、上で捕まえている。
   こちらの言い分は stdout へ直に書く（試験束ねが stdout を読む）。 */
const 元のerror = { call: (_, ...a) => process.stdout.write(a.join(' ') + '\n') };

const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, React, MapScreen } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  元のerror.call(console, `  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 言 = (t) => 元のerror.call(console, t);

/* 二つの大身の家に割った盤（tests/wakeme.cjs と同じこしらえ）。 */
function 大身の盤() {
  const s = H.initState('oda');
  const 甲 = 'oda', 乙 = 'imagawa';
  /* 試験は速さが要る。城はそのまま（国どうしの隣り合いが要る）にして、
     将を東西十二城だけに残す。盤に立つ隊は十二ずつで済む。 */
  const 並 = s.castles.slice().sort((a, b) => (a.x || 0) - (b.x || 0));
  const 半 = Math.floor(並.length / 2);
  並.forEach((c, i) => {
    c.faction = i < 半 ? 乙 : 甲;
    c.koku = Math.max(c.koku, 30000);
    c.local = 900;
    c.rost = null;
  });
  const 将持ち = new Set([...並.slice(半 - 12, 半), ...並.slice(半, 半 + 12)].map((c) => c.id));
  s.generals = s.generals.filter((g) => 将持ち.has(g.at));
  for (const g of s.generals) {
    const 城 = s.castles.find((c) => c.id === g.at);
    g.faction = 城 ? 城.faction : 甲;
    g.captive = null;
    g.retinue = Math.max(g.retinue || 0, 200);
  }
  for (const f of [甲, 乙]) {
    const 己 = s.generals.filter((g) => g.faction === f);
    for (const g of 己) g.lord = false;
    if (己[0]) 己[0].lord = true;
    s.factions[f].本拠 = (s.castles.find((c) => c.faction === f) || {}).id;
  }
  s.armies = [];
  s.player = 甲;
  return { s, 甲, 乙 };
}

(async () => {
  const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 8)); }); };
  const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 500, clientY: 310 }));
  const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
  const 釦 = (t) => [...document.querySelectorAll('button,.mbtn,.btn')]
    .filter((b) => !b.disabled).find((b) => (b.textContent || '').includes(t));
  const 文 = () => document.body.textContent.replace(/\s+/g, ' ');

  const { s, 甲, 乙 } = 大身の盤();
  let 盤 = s;
  const setG = (f) => { 盤 = typeof f === 'function' ? f(盤) : f; };
  const root = createRoot(document.getElementById('r'));
  const 描く = async () => {
    await act(async () => {
      root.render(React.createElement(MapScreen, { g: 盤, setG: (f) => { setG(f); },
        terrain: null, land: true, onSave: () => {}, saves: [], onTitle: () => {} }));
    });
    await flush();
  };

  言('── 一　触れを出す');
  await 描く();
  確('地図の画面が描ける（例外で落ちない）', errs.length === 0, errs[0] || '');
  const 挑釦 = 釦('天下分け目');
  確('「天下分け目」の釦が出る', !!挑釦);
  if (挑釦) await click(挑釦);
  await 描く();
  確('帳が開く', /肩を並べる家へ/.test(文()), 文().slice(0, 60));
  確('相手が並ぶ', 文().includes((盤.factions[乙] || {}).name));
  確('出す兵が選べないことを謳っている', /出す兵は選べません/.test(文()));
  const 決釦 = 釦('天下分け目を挑む');
  確('「挑む」が押せる', !!決釦);
  if (決釦) await click(決釦);
  await 描く();
  確('触れが立つ', !!盤.分け目 && 盤.分け目.挑 === 甲 && 盤.分け目.受 === 乙,
    盤.分け目 ? `野＝${盤.分け目.野}／あと${盤.分け目.残り}ヶ月` : 'なし');
  確('地図に触れの帯が出る', /兵が寄っている|兵が本拠に揃った/.test(文()));

  言('\n── 二　野へ出る');
  盤 = { ...盤, 分け目: { ...盤.分け目, 残り: 0 } };
  await 描く();
  const 出釦 = 釦('野へ出る');
  確('兵が揃えば「野へ出る」が出る', !!出釦);
  if (出釦) await click(出釦);
  await 描く();
  確('合戦の画面が描ける', errs.length === 0, errs[0] || '');
  確('布陣の段に入る', /合戦開始|布陣/.test(文()), 文().slice(0, 80));
  for (let i = 0; i < 20; i++) {
    const cbs = [...rafMap.values()]; rafMap.clear();
    await act(async () => { for (const cb of cbs) cb(1000 + i * 260); });
  }
  確('コマを進めても描ける', errs.length === 0, errs[0] || '');

  言('\n── 三　戦の跡（諸将に委ねて決着まで）');
  const 開 = 釦('合戦開始');
  確('「合戦開始」が押せる', !!開);
  if (開) await click(開);
  await flush();
  確('筋書きの覚え（関ヶ原の札）は出ない', !/筋書きの覚え/.test(文()));
  const 委 = 釦('委ねて結果を見る') || 釦('委ね');
  確('諸将に委ねられる', !!委);
  if (委) await click(委);
  for (let i = 0; i < 40; i++) await act(async () => { await new Promise((r) => setTimeout(r, 25)); });
  await flush();
  const 刻 = (文().match(/(\d+):(\d\d)／日没/) || [])[0] || '';
  確('委ねれば時が進む', /[1-9]/.test(刻.replace('0:0', '')), 刻);

  /* 決着までは長い。ここは盤を勝ちで畳み、跡の道を通す。 */
  await act(async () => {
    const bb = window.__合戦;
    if (bb) { bb.phase = 'over'; bb.result = 'P'; bb.orderly = false; }
  });
  for (let i = 0; i < 40 && !釦('戦場を離れる'); i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 25)); });
  }
  await flush();
  const 離 = 釦('戦場を離れる');
  確('戦が畳まれ「戦場を離れる」が出る', !!離);
  if (離) await click(離);
  await flush();
  const 跡出 = /天下分け目の跡/.test(文());
  確('戦の跡の帳が開く', 跡出, 文().slice(0, 60));
  if (跡出) {
    確('勝ち負けが出ている', /勝ち|負け/.test(文()));
    const 勝った = /勝ち/.test(文());
    const 取釦 = 釦('この国を取る') || 釦('受け入れる');
    確('国のやり取りが決められる', !!取釦);
    if (取釦) await click(取釦);
    await 描く();
    確('触れが畳まれる', 盤.分け目 == null);
    const 甲城 = 盤.castles.filter((c) => c.faction === 甲).length;
    const 乙城 = 盤.castles.filter((c) => c.faction === 乙).length;
    const 元甲 = s.castles.filter((c) => c.faction === 甲).length;
    確('勝った側の城が増えている', 勝った ? 甲城 > 元甲 : 甲城 < 元甲,
      `${元甲} → ${甲城}城（相手は${乙城}城）`);
    確('相手との信用が六十になる',
      Math.round(((盤.relations[[甲, 乙].sort().join('|')]) || {}).trust) === 60,
      String(Math.round(((盤.relations[[甲, 乙].sort().join('|')]) || {}).trust)));
    確('同じ相手への控えが残る', !!(盤.分け目の控え || {})[[甲, 乙].sort().join('|')]);
  }
  確('最後まで例外が出ない', errs.length === 0, errs[0] || '');

  元のerror.call(console, '');
  if (咎.length) { 元のerror.call(console, '★背いた事:'); for (const x of 咎) 元のerror.call(console, '   ' + x); }
  元のerror.call(console, `エラー: ${咎.length ? `${咎.length}件` : 'なし'}`);
  process.exit(咎.length ? 1 : 0);
})();
