/* ============================================================
   一人視点（背中越し）の速さは固定、もしくは委ねる（ui/BattleScreen.jsx）の試験

   遊ぶ人の申し出：「一人視点ではスピードは固定、もしくは委ねるで操作できなくして進めるという2択」。
   背中越しのあいだは、盤の速さを微速（hitori/senaka.js 背中の速さ）に固定し、ほかの速さの釦は
   押せなくする。委ねて結果を見るは使える。合戦の画面を jsdom に描き出して、
     一、合戦の前（布陣）に背中越しに入れば、合戦は止まったまま。札に「合戦が止まっている」と出る
     二、合戦開始で微速になる（合戦開始はふつう低速にする）。微速のほかの速さの釦は押せない
     三、委ねて結果を見るは使える。委ねているあいだは微速へ戻さない。手綱を取り戻せば微速へ戻る
     四、盤だけを広げたときの速さの釦も、微速のほかは押せない
     五、盤の視点へ戻れば、速さの釦はまた押せる（速さは微速のまま）
     六、背中越しに入り直せば微速へ戻り、委ねれば手を離したまま決着まで進む
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
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 960; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 600; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 960, height: 600, right: 960, bottom: 600 }; };
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 180));
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, React, BattleScreen } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎.push(名); };
let 種 = 0x4A5A;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

(async () => {
  const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 8)); }); };
  /* 野の戦を一つ仕立てる（布陣の段から） */
  H.setBattleMap(null); H.setFieldSeed('hayasa', 'y'); H.layoutField(7000, 6);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 65, valor: 65, wit: 58, gov: 55, retinue: 500, retTrain: 70, unity: 62 });
  const P = [0, 1].map((k) => H.makeCorps('P', 将(k), 0, 1200, 75, 75, W * (0.35 + k * 0.3), Hh * 0.84, -Math.PI / 2, '#2F5D8C'));
  const E = [0, 1].map((k) => H.makeCorps('E', 将(10 + k), 0, 1000, 75, 75, W * (0.35 + k * 0.3), Hh * 0.16, Math.PI / 2, '#B0483C'));
  for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
  const b = H.createBattle(P, E, 'P');
  b.mode = 'field'; b.phase = 'deploy'; b.dusk = 1100; b.face = 'S'; b.myFar = false;
  const ctx = { b, pName: '織田家', eName: '今川家', pColor: '#2F5D8C', eColor: '#B0483C', place: '桶狭間', mode: 'field' };
  const root = createRoot(document.getElementById('r'));
  await act(async () => { root.render(React.createElement(BattleScreen, { ctx, land: true, onEnd: () => {} })); });
  await flush();

  const 釦 = (t) => [...document.querySelectorAll('.mbtn,button')].find((x) => (x.textContent || '').includes(t));
  const 押 = async (el) => { await act(async () => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }); await flush(); };
  const 速さの釦 = () => [...document.querySelectorAll('.hayasa button')];
  const 選ばれた = () => (速さの釦().find((x) => x.classList.contains('on')) || {}).textContent || '';
  const 押せない = () => 速さの釦().filter((x) => x.disabled).map((x) => x.textContent);

  console.log('── 一　合戦の前（布陣）に背中越しに入れば、合戦は止まったまま');
  await 押(釦('背中の視点'));
  確('背中越しの札が出る（与平の名札）', !!document.querySelector('.snk') && /与平/.test(document.querySelector('.snk').textContent));
  確('合戦は始まらない（布陣のまま）', b.phase === 'deploy');
  確('札に「合戦が止まっている」と出る', /合戦が止まっている/.test(document.querySelector('.snk').textContent));

  console.log('\n── 二　合戦開始で微速になる。微速のほかの速さの釦は押せない');
  await 押(釦('合戦開始'));
  確('合戦が始まる', b.phase === 'fight');
  確('速さは微速（合戦開始はふつう低速にするが、背中越しのあいだは微速へ戻す）', 選ばれた() === '微速', `選ばれた釦「${選ばれた()}」`);
  確('停止・低速・通常・早送りは押せない', ['停止', '低速', '通常', '早送り'].every((t) => 押せない().includes(t)) && !押せない().includes('微速'), `押せない：${押せない().join('・')}`);
  await 押(速さの釦().find((x) => x.textContent === '通常'));
  await 押(速さの釦().find((x) => x.textContent === '停止'));
  確('押せない釦を押しても、微速のまま', 選ばれた() === '微速', `選ばれた釦「${選ばれた()}」`);
  確('札の「合戦が止まっている」は消える', !/合戦が止まっている/.test(document.querySelector('.snk').textContent));

  console.log('\n── 三　委ねて結果を見るは使える。委ねているあいだは微速へ戻さない。手綱を取り戻せば微速へ戻る');
  const 委ねる釦 = () => [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === '委ねて結果を見る');
  const 委 = 委ねる釦();
  確('委ねて結果を見るの釦が押せる', !!委 && !委.disabled);
  /* この小さな合戦は、委ねると試験の待ちのあいだに決着まで進んでしまう。委ねている最中を見るため、
     ここでは時計（Date.now）を一回ごとに二十五ミリ秒進め、委ねる仕組みの一区切り（二十四ミリ秒）に一刻も踏ませない */
  const 元の時計 = Date.now; let 偽の今 = 元の時計(); Date.now = () => (偽の今 += 25);
  await 押(委);
  確('委ねている（諸将に委ねている）', /諸将に委ねている/.test(document.body.textContent));
  確('委ねているあいだは盤の速さを止めたまま（委ねる仕組みが速さを〇にする。微速へ戻さない）', 選ばれた() === '停止', `選ばれた釦「${選ばれた()}」`);
  await 押(釦('手綱を取り戻す'));
  Date.now = 元の時計;
  確('手綱を取り戻すと、微速へ戻る（取り戻すはふつう通常にする）', 選ばれた() === '微速' && !/諸将に委ねている/.test(document.body.textContent), `選ばれた釦「${選ばれた()}」`);

  console.log('\n── 四　盤だけを広げたときの速さの釦も、微速のほかは押せない');
  await 押(釦('広く'));
  const 小釦 = [...document.querySelectorAll('button')].filter((x) => ['停', '微', '低', '通', '早'].includes((x.textContent || '').trim()));
  確('広げたときの速さの釦が出る', 小釦.length === 5, `${小釦.length}つ`);
  確('「微」のほかは押せない', 小釦.filter((x) => x.disabled).map((x) => x.textContent).join('') === '停低通早', 小釦.map((x) => `${x.textContent}${x.disabled ? '×' : '○'}`).join(' '));
  await 押(document.querySelector('.grip'));

  console.log('\n── 五　盤の視点へ戻れば、速さの釦はまた押せる（速さは微速のまま）');
  await 押(釦('盤の視点'));
  確('背中越しの札が消える', !document.querySelector('.snk'));
  確('速さは微速のまま', 選ばれた() === '微速', `選ばれた釦「${選ばれた()}」`);
  確('どの速さの釦も押せる', 押せない().length === 0, 押せない().join('・'));
  await 押(速さの釦().find((x) => x.textContent === '通常'));
  確('通常を押せば通常になる', 選ばれた() === '通常', `選ばれた釦「${選ばれた()}」`);

  console.log('\n── 六　背中越しに入り直せば微速へ戻り、委ねれば手を離したまま決着まで進む');
  await 押(釦('背中の視点'));
  確('入り直すと微速へ戻る（通常から）', 選ばれた() === '微速', `選ばれた釦「${選ばれた()}」`);
  await 押(委ねる釦());
  for (let i = 0; i < 400 && b.phase === 'fight'; i++) await flush();
  確('委ねれば決着まで進む', b.phase !== 'fight', `合戦の段「${b.phase}」・戦場の刻 ${Math.round(b.t)}秒`);
  確('決着ののちは止まったまま（微速へ戻さない）', 選ばれた() !== '微速', `選ばれた釦「${選ばれた() || 'なし'}」`);

  console.log('');
  console.log('エラー:', errs.filter((e) => !/not wrapped in act|Warning/.test(e)).slice(0, 2).join(' | ') || 'なし');
  process.exit(咎.length || errs.filter((e) => !/not wrapped in act|Warning/.test(e)).length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
