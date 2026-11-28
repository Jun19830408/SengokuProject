/* ============================================================
   縦に持った画面の合戦の下の欄（ui/BattleScreen.jsx 下の欄）の試験

   遊ぶ人の申し出：「他のiphoneも含めて、フィールド部分を増やしてください。下の部分をフィールドを動かすと下に
   隠れるなどして、フィールドを見やすくしてください。フィールドが全てなはずで、今は説明も長いし、隠せもしないので
   操作しづらいです」。縦に持った画面（land＝false）では、盤を下まで広げ、欄は盤の上に重ねて下から出す。
     一、盤は欄のぶん狭まらない（欄は盤の上に重ねる）。一人働き（足軽）の合戦は、欄をしまって始める
     二、つまみ（▲展開／▼収納）を押せば出し入れできる。左の釦の列の「収納／展開」も同じ
     三、盤を指でなぞる・二本の指で摘む・車を回すと、欄は下へしまう。叩くだけではしまわない。欄・釦の上から始めた
         指は数えない
     四、背中越し（与平の札）でも、方向キーの指でなぞれば欄はしまう。札の場は、欄とつまみの上までにする
     五、手勢を率いる身の説明は、はじめの一文だけを出し、操作の説明は押せば開く
     六、ふだんの合戦（総大将）は、欄を出して始める（布陣と下知の欄）
     七、横に持った画面は、これまでどおり盤の右に欄を並べる（下の欄は出さない）
   を確かめる。
   ============================================================ */
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
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 390; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 700; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 390, height: 700, right: 390, bottom: 700 }; };
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 180));
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, React, BattleScreen } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎.push(名); };
let 種 = 0x5A7A;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const 仕立てる = (種名) => {
  H.setBattleMap(null); H.setFieldSeed(種名, 'y'); H.layoutField(7000, 6);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 65, valor: 65, wit: 58, gov: 55, retinue: 500, retTrain: 70, unity: 62 });
  const P = [0, 1].map((k) => H.makeCorps('P', 将(k), 0, 900, 75, 75, W * (0.4 + k * 0.2), Hh * 0.62, -Math.PI / 2, '#2F5D8C'));
  const E = [0, 1].map((k) => H.makeCorps('E', 将(10 + k), 0, 900, 75, 75, W * (0.4 + k * 0.2), Hh * 0.38, Math.PI / 2, '#B0483C'));
  for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
  const b = H.createBattle(P, E, 'P');
  b.mode = 'field'; b.phase = 'deploy'; b.dusk = 1100; b.face = 'S'; b.myFar = false;
  return b;
};

(async () => {
  const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 8)); }); };
  const 欄 = () => document.querySelector('.bsheet'), つまみ = () => document.querySelector('.bsheet-tab'), 盤 = () => document.querySelector('.fieldwrap');
  const 出ている = () => !!つまみ() && つまみ().getAttribute('aria-expanded') === 'true';
  const 指 = async (型, id, x, y, 先) => { await act(async () => { 先.dispatchEvent(new dom.window.PointerEvent(型, { bubbles: true, pointerId: id, clientX: x, clientY: y })); }); };
  const 押す = async (el) => { await act(async () => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }); await flush(); };
  const 描く = async (ctx, land) => {
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(BattleScreen, { ctx, land, onEnd: () => {} })); });
    await flush();
    return root;
  };

  console.log('── 一　縦に持った画面：盤を下まで広げ、欄は盤の上に重ねる。一人働き（足軽）は欄をしまって始める');
  const b1 = 仕立てる('shitaran1');
  const ctx1 = { b: b1, pName: '織田家', eName: '今川家', pColor: '#2F5D8C', eColor: '#B0483C', place: '桶狭間', mode: 'field', 一人: { 身分: '足軽' } };
  let root = await 描く(ctx1, false);
  確('下の欄がある（盤の上に重ねて置く）', !!欄() && 欄().style.position === 'absolute' && 欄().parentElement === 盤().parentElement && !!欄().querySelector('.bpanel'));
  確('盤は欄のぶん狭まらない（欄と並べて置かない）', 盤().style.flex.startsWith('1') && [...盤().parentElement.children].filter((x) => x !== 盤() && x !== 欄()).length === 0);
  確('一人働き（足軽）は、欄をしまって始める（つまみは「▲ 展開」）', !出ている() && /展開/.test(つまみ().textContent) && /translateY\(calc\(100%/.test(欄().style.transform),
    `${つまみ().textContent}・${欄().style.transform}`);
  確('しまっているあいだも、欄の中身（委ねて結果を見る）は置いてある（出せばすぐ使える）', /委ねて結果を見る/.test(欄().textContent));

  console.log('\n── 二　つまみと「収納／展開」で出し入れする');
  await 押す(つまみ());
  確('つまみを押せば欄が出る（「▼ 収納」）', 出ている() && /収納/.test(つまみ().textContent) && 欄().style.transform === 'translateY(0)', 欄().style.transform);
  await 押す(つまみ());
  確('もう一度押せばしまう', !出ている());
  const 列の釦 = () => [...document.querySelectorAll('.mapctl .mbtn')].find((x) => /収納|展開/.test(x.textContent));
  await 押す(列の釦());
  確('左の釦の列の「展開」でも出る（釦は「収納」に替わる）', 出ている() && /収納/.test(列の釦().textContent));
  await 押す(列の釦());
  確('「収納」でしまう', !出ている() && /展開/.test(列の釦().textContent));

  console.log('\n── 三　盤を動かせば欄はしまう。叩くだけではしまわない');
  const 画布 = () => 盤().querySelector('canvas');
  await 押す(つまみ());
  await 指('pointerdown', 1, 200, 300, 画布()); await 指('pointerup', 1, 200, 300, 画布()); await flush();
  確('盤を叩くだけでは、欄はしまわない（隊を選んで下知するため）', 出ている());
  await 指('pointerdown', 2, 200, 300, 画布()); await 指('pointermove', 2, 203, 304, 画布()); await flush();
  確('少しだけ（八画素のうち）動いた指では、まだしまわない', 出ている());
  await 指('pointermove', 2, 230, 330, 画布()); await 指('pointerup', 2, 230, 330, 画布()); await flush();
  確('盤を指でなぞれば、欄は下へしまう', !出ている());
  await 押す(つまみ());
  await 指('pointerdown', 3, 150, 300, 画布()); await 指('pointerdown', 4, 250, 300, 画布()); await flush();
  await 指('pointerup', 3, 150, 300, 画布()); await 指('pointerup', 4, 250, 300, 画布()); await flush();
  確('二本の指で摘めば、欄はしまう', !出ている());
  await 押す(つまみ());
  await act(async () => { 画布().dispatchEvent(new dom.window.WheelEvent('wheel', { bubbles: true, deltaY: -100, clientX: 200, clientY: 300 })); }); await flush();
  確('車を回せば、欄はしまう', !出ている());
  await 押す(つまみ());
  const 欄の釦 = [...欄().querySelectorAll('button')].find((x) => /委ねて結果を見る/.test(x.textContent));
  await 指('pointerdown', 5, 200, 650, 欄()); await 指('pointermove', 5, 200, 600, 欄()); await 指('pointerup', 5, 200, 600, 欄()); await flush();
  確('欄の上でなぞった指（中身を繰る）では、しまわない', 出ている());
  await 指('pointerdown', 6, 200, 650, 欄の釦); await 指('pointermove', 6, 230, 650, 欄の釦); await 指('pointerup', 6, 230, 650, 欄の釦); await flush();
  確('釦の上から始めた指では、しまわない', 出ている());

  console.log('\n── 四　背中越し（与平の札）でも、方向キーの指でなぞれば欄はしまう。札の場は欄とつまみの上まで');
  await act(async () => { window.__降り(1); }); await flush();
  const 札 = () => document.querySelector('.snk');
  確('背中越しへ降りても、下の欄とつまみはある', !!欄() && !!つまみ() && 出ている());
  const 札の場 = 札() && 札().parentElement;
  確('札の場の下は、欄の丈とつまみの丈の上まで（方向キー・釦が欄に隠れない）', !!札の場 && /var\(--sheet-h/.test(札の場.style.bottom) && /var\(--tab-h/.test(札の場.style.bottom), 札の場 && 札の場.style.bottom);
  const 外枠 = 盤().parentElement;
  確('つまみの丈（三十画素）を札の場・報せの持ち上げに使う', 外枠.style.getPropertyValue('--tab-h') === '30px', 外枠.style.getPropertyValue('--tab-h'));
  await 指('pointerdown', 7, 100, 400, 札()); await 指('pointermove', 7, 100, 360, 札()); await flush();
  await 指('pointerup', 7, 100, 360, 札()); await flush();
  確('背中越しで方向キーの指をなぞれば、欄はしまう', !出ている());
  確('欄をしまえば、持ち上げる丈は〇', 外枠.style.getPropertyValue('--sheet-h') === '0px', 外枠.style.getPropertyValue('--sheet-h'));
  await act(async () => { root.unmount(); }); await flush();

  console.log('\n── 五　手勢を率いる身の説明は、はじめの一文だけ。操作の説明は押せば開く');
  const b5 = 仕立てる('shitaran5');
  const ctx5 = { b: b5, pName: '織田家', eName: '今川家', pColor: '#2F5D8C', eColor: '#B0483C', place: '桶狭間', mode: 'field',
    一人: { 身分: '足軽', 段: '十人長', 手勢: 8, 名: '喜市', 風雲: true, 隊id: 'g0' } };
  root = await 描く(ctx5, false);
  const 欄の字 = () => (欄() || {}).textContent || '';
  確('手勢を率いる身なら、はじめの一文（十人長の身では…できない）を出す', /十人長の身では、全軍への下知も上司の隊の差配もできない。/.test(欄の字()), 欄の字().slice(0, 80));
  確('操作の説明（方向キー・一騎駆け…）は、はじめは畳んでおく', !/方向キーで与平が動き/.test(欄の字()) && /▸ 操作の説明/.test(欄の字()));
  const 説明の釦 = () => [...欄().querySelectorAll('button')].find((x) => /操作の説明/.test(x.textContent));
  await 押す(説明の釦());
  確('「操作の説明」を押せば開く', /方向キーで与平が動き/.test(欄の字()) && /▾ 操作の説明/.test(欄の字()));
  await 押す(説明の釦());
  確('もう一度押せば畳む', !/方向キーで与平が動き/.test(欄の字()));
  await act(async () => { root.unmount(); }); await flush();

  console.log('\n── 六　ふだんの合戦（総大将）は、欄を出して始める（布陣と下知の欄）');
  const b6 = 仕立てる('shitaran6');
  const ctx6 = { b: b6, pName: '織田家', eName: '今川家', pColor: '#2F5D8C', eColor: '#B0483C', place: '桶狭間', mode: 'field', 一人: null };
  root = await 描く(ctx6, false);
  確('ふだんの合戦は、欄を出して始める', 出ている() && /合戦開始/.test(欄().textContent));
  await 指('pointerdown', 8, 200, 300, 画布()); await 指('pointermove', 8, 260, 300, 画布()); await 指('pointerup', 8, 260, 300, 画布()); await flush();
  確('ふだんの合戦でも、盤をなぞれば欄はしまう', !出ている());
  await act(async () => { root.unmount(); }); await flush();

  console.log('\n── 七　横に持った画面は、これまでどおり盤の右に欄を並べる');
  const b7 = 仕立てる('shitaran7');
  const ctx7 = { b: b7, pName: '織田家', eName: '今川家', pColor: '#2F5D8C', eColor: '#B0483C', place: '桶狭間', mode: 'field', 一人: null };
  root = await 描く(ctx7, true);
  const 右の欄 = document.querySelector('.bpanel');
  確('横に持った画面では、下の欄もつまみも出さない', !欄() && !つまみ());
  確('盤の右に欄を並べる（幅二四六）', !!右の欄 && 右の欄.parentElement === 盤().parentElement && 右の欄.style.width === '246px');
  await 指('pointerdown', 9, 200, 300, 画布()); await 指('pointermove', 9, 260, 300, 画布()); await 指('pointerup', 9, 200, 300, 画布()); await flush();
  確('横に持った画面では、盤をなぞっても右の欄はしまわない', !!document.querySelector('.bpanel'));
  await act(async () => { root.unmount(); }); await flush();

  console.log('');
  const 本の咎 = errs.filter((e) => !/not wrapped in act|Warning/.test(e));
  console.log('エラー:', 本の咎.slice(0, 2).join(' | ') || 'なし');
  process.exit(咎.length || 本の咎.length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
