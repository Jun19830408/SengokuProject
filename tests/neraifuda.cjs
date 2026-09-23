/* 狙い札 ─ 重なっていても敵を指せること（GDD 8.2）。

   味方の隊を選び、敵をタップして接戦に向かわせる――この指し方が、隊が重なると
   使えなかった。押した所に自軍の駒があれば自軍が選ばれ、槍を合わせている敵は
   味方の駒と重なって指が届かない。遊ぶ側からは「その敵だけは指せない」と映る。

   名札は、もともと重ならぬよう逃がして並べてある（draw.js の 札の場）。
   味方の隊を選んでいるあいだ、敵の名札をそのまま「狙い札」とする。的の輪を添え、
   押せばその隊へ差し向ける。ここでは、わざと敵と味方を重ねて置き、
   実際に札を押して下知が通ることを確かめる。 */
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
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 700; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 900, height: 700, right: 900, bottom: 700 }; };
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 180));
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, React, BattleScreen } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x5151;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

(async () => {
  const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 8)); }); };

  H.setBattleMap(null); H.setFieldSeed('nerai', 'z'); H.layoutField(6000, 4);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  const 将 = (i, nm) => ({ id: `g${i}`, name: nm, lead: 65, valor: 65, wit: 58, gov: 55,
    retinue: 400, retTrain: 70, unity: 62 });
  /* わざと重ねて置く。味方の駒の真上に敵を据え、指では選り分けられない形にする。 */
  const 味 = H.makeCorps('P', 将(1, '織田信長'), 0, 1200, 75, 75, W * 0.5, Hh * 0.5, -Math.PI / 2, '#2F5D8C');
  const 敵A = H.makeCorps('E', 将(11, '坂井大膳'), 0, 1000, 75, 75, W * 0.5 + 6, Hh * 0.5 - 8, Math.PI / 2, '#B0483C');
  const 敵B = H.makeCorps('E', 将(12, '坂井甚介'), 0, 900, 75, 75, W * 0.5 - 10, Hh * 0.5 + 4, Math.PI / 2, '#B0483C');
  for (const c of [味, 敵A, 敵B]) { c.formation = '横陣'; H.placeSquads(c, true); c.seen = true; }
  const b = H.createBattle([味], [敵A, 敵B], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1100; b.face = 'S'; b.myFar = false;
  for (const c of b.corps) c.seen = true;

  const ctx = { b, pName: '織田家', eName: '織田大和守家', pColor: '#2F5D8C', eColor: '#B0483C',
    place: '清洲', mode: 'field' };
  const root = createRoot(document.getElementById('r'));
  await act(async () => { root.render(React.createElement(BattleScreen, { ctx, land: true, onEnd: () => {} })); });
  await flush();

  const 盤 = document.querySelector('canvas');
  const 打つ = async (x, y) => {
    for (const t of ['mousedown', 'mouseup']) {
      await act(async () => {
        盤.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: x, clientY: y }));
      });
    }
    await flush();
  };
  const 刻む = async (n) => {
    for (let i = 0; i < n; i++) {
      const q = [...rafMap.entries()]; rafMap.clear();
      if (q.length) await act(async () => { q.forEach(([, cb]) => cb(1000 + i * 60)); });
      else await flush();
    }
  };
  await 刻む(6);

  console.log('■ 一、味方を選ばぬうちは、狙い札は出ない');
  確('選ぶ前に札は無い', !b.狙い札 || b.狙い札.length === 0, `${(b.狙い札 || []).length}枚`);

  console.log('■ 二、味方を選べば、敵にだけ札が立つ');
  // 味方の駒を押して選ぶ（重なっているので、味方が選ばれる）
  await 打つ(450, 350);
  await 刻む(4);
  const 札ら = b.狙い札 || [];
  const 敵id = new Set([敵A.id, 敵B.id]);
  確('敵の数だけ札が立つ', 札ら.length === 2, `${札ら.length}枚`);
  確('札はすべて敵のもの（味方に札は立たない）', 札ら.every((t) => 敵id.has(t.id)),
    札ら.map((t) => (t.id === 味.id ? '味方' : '敵')).join('・'));
  確('札どうしは重ならない', (() => {
    for (let i = 0; i < 札ら.length; i++) for (let j = i + 1; j < 札ら.length; j++) {
      const a = 札ら[i], c = 札ら[j];
      if (a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h) return false;
    }
    return true;
  })());

  console.log('■ 三、札を押せば、その隊へ差し向けられる');
  const 的 = 札ら.find((t) => t.id === 敵B.id) || 札ら[0];
  await 打つ(的.x + 的.w / 2, 的.y + 的.h / 2);
  await 刻む(4);
  確('押した隊が下知の的になる', 味.order === '接戦' || 味.order === '突撃',
    `下知は「${味.order}」`);
  const 向き先 = Math.hypot(味.tx - 敵B.x, 味.ty - 敵B.y);
  確('行き先は、押した敵のところ', 向き先 < 90, `押した敵まで ${Math.round(向き先)}歩`);

  console.log('■ 四、重なっていても選り分けられる');
  /* 同じ所を素で押せば、重なっている味方が選ばれてしまう――それでも札は押せる。 */
  const 札2 = (b.狙い札 || []).find((t) => t.id === 敵A.id);
  確('もう一方の敵の札も残っている', !!札2);
  if (札2) {
    await 打つ(札2.x + 札2.w / 2, 札2.y + 札2.h / 2);
    await 刻む(4);
    const 向き先2 = Math.hypot(味.tx - 敵A.x, 味.ty - 敵A.y);
    確('札を押し替えれば、狙いも移る', 向き先2 < 90, `押した敵まで ${Math.round(向き先2)}歩`);
  }

  console.log('');
  if (errs.length) console.log('（画面の咎）', errs.slice(0, 2).join(' / '));
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})();
