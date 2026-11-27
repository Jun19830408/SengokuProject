/* ============================================================
   盤から地へ降りる（hitori/senaka.js 降りの写し・ui/BattleScreen.jsx 降りRef）の試験

   遊ぶ人の申し出：「ピンチイン、アウトでスムーズに一人称視点までいけるようにしたい」「通常の
   キャンペーンモードでも、一人モードと同じような視点まで拡大できるとさらに迫力が増していい」。
   盤をいちばん寄せた所から、さらに寄せる（ピンチ・車）と地へ降り、引けば盤へ昇る。
     一、降りの写し：u＝〇では、盤の真ん中の点を、盤と同じ大きさ（真ん中で一歩が盤の倍の画素）・同じ向き
         （盤の上の方角）・同じ傾き（斜めの縦の縮み＝俯きの sin）で見る。u＝一では背中越しの写しそのもの。
         あいだは、目の高さが u につれて下がっていく（跳ばない）。目線はいつも見る点に届く
     二、降りてくる途中は、盤に近い所（hitori/senaka.js 寄りで動ける境 より下）では与平も敵の掛かりも止まる。地に近ければ
         （境より上）、背中越しと同じく方向キーで動き、前へ押せばいま描く写しの前へ歩む。描く手続きは最後まで通る
     三、一人働き（足軽）：盤を車で寄せきると降り始め（札は指と車を受けるだけ）、さらに寄せると地に着く
         （名札・釦が出る）。引けば昇って盤へ戻る。盤へ戻ってまた降りても、与平の居所・体力はそのまま
     五、一人働き（足軽）：寄りの途中でも、地に近ければ札（名札・釦）が出て方向キーで歩め、写しは与平に付く（降り始めの
         盤の写しの真ん中も盤の写しの真ん中も、与平が歩んだぶんだけ動く）。盤に近ければ札を出さず、与平も動かない
     四、ふだんの合戦（総大将）：寄せきると、真ん中にいちばん近い組のうしろへ降りて見物する（見るだけの札。
         突くの釦は無い）。下知（一括命令）も速さの釦も、ふだんどおり使える。引けば盤へ戻る
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
const 角 = (d) => { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const 度 = (r) => Math.round(r * 180 / Math.PI);
const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎.push(名); };
let 種 = 0x0A1B;
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
  return { b, P, E };
};

(async () => {
  console.log('── 一　降りの写し：盤の写しから背中越しの写しまで、なめらかに降りる');
  {
    const 尺 = H.歩の尺, w = 960, Fw = w * 0.6;
    const 盤 = { x: 3000, y: 2000, s: 7.2, 向き: 0, 傾き: 0.58 };
    const 肩 = { x: 1300, z: -950, a: 0.4 };
    const 写 = (u, 盤2 = 盤) => H.降りの写し(肩, { u, 盤: 盤2 }, w);
    const 零 = 写(0);
    const 届く = (c) => { const L = c.h / Math.tan(c.俯); return Math.hypot(c.x + Math.cos(c.a) * L - c.焦点[0], c.z + Math.sin(c.a) * L - c.焦点[1]); };
    確('u＝〇：見る点は盤の真ん中', Math.hypot(零.焦点[0] - 盤.x * 尺, 零.焦点[1] + 盤.y * 尺) < 1e-9);
    確('u＝〇：真ん中で一歩が盤の倍の画素（距＝F×尺÷倍）', Math.abs(Fw * 尺 / 零.距 - 盤.s) < 1e-9, `${(Fw * 尺 / 零.距).toFixed(3)}画素／歩`);
    確('u＝〇：俯きの sin は斜めの縦の縮み（〇.五八）', Math.abs(Math.sin(零.俯) - 0.58) < 1e-9, `${(零.俯 * 180 / Math.PI).toFixed(1)}度`);
    確('u＝〇：向きは盤の上の方角（向き〇は北）', Math.abs(零.a - Math.PI / 2) < 1e-9);
    確('u＝〇：向き一（東から西を見る）なら西を向く', Math.abs(写(0, { ...盤, 向き: 1 }).a - Math.PI) < 1e-9);
    確('u＝〇：真上の盤（傾き一）でも、俯きは六十五度で止める', Math.abs(写(0, { ...盤, 傾き: 1 }).俯 - 65 * Math.PI / 180) < 1e-9);
    const 一 = 写(1);
    確('u＝一：背中越しの写しそのもの（目の所・向き・高さ三.三m・俯き十三度）', Math.hypot(一.x - 肩.x, 一.z - 肩.z) < 1e-9 && Math.abs(一.a - 肩.a) < 1e-9
      && Math.abs(一.h - 3.3) < 1e-9 && Math.abs(一.俯 - 13 * Math.PI / 180) < 1e-9);
    let 下がる = true, 跳ばぬ = true, 届かぬ = 0, 前 = 写(0);
    for (let i = 1; i <= 200; i++) { const c = 写(i / 200); if (c.h > 前.h + 1e-9) 下がる = false;
      if (Math.hypot(c.x - 前.x, c.z - 前.z) > 2 || Math.abs(c.h - 前.h) > 1) 跳ばぬ = false; 届かぬ = Math.max(届かぬ, 届く(c)); 前 = c; }
    確('目の高さは u につれて下がり続ける', 下がる, `${零.h.toFixed(1)}m → ${一.h.toFixed(1)}m`);
    確('二百刻みのどこでも、目の所は跳ばない（一刻みに二m・高さ一m より動かない）', 跳ばぬ);
    確('目線はいつも見る点に届く', 届かぬ < 1e-6, `いちばん大きいずれ ${届かぬ.toExponential(1)}m`);
  }

  console.log('\n── 二　降りてくる途中：盤に近い所では与平も敵の掛かりも止まり、地に近ければ方向キーで動く。描く手続きは最後まで通る');
  {
    /* 遊ぶ人の申し出：「添付の視点のときにもコントローラーで動かせるといいなと思います」（寄りの途中で見下ろしているとき）。
       盤の向き一（東から西を見る）で降りるので、寄りの途中の写しの前は、肩の写しの向き（北）と盤の上の方角（西）のあいだにある */
    const { b } = 仕立てる('oriru2');
    b.phase = 'fight';
    for (let k = 0; k < 40; k++) { b.t += 0.05; H.新絵状態を進める(b, 0, null); }
    const 態 = H.背中を始める(b, null, '足軽');
    const 鈍 = () => ({ addColorStop() {} });
    const 筆 = { canvas: { width: 960, height: 540 }, setTransform() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
      beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() {}, arc() {}, ellipse() {}, rect() {}, fill() {}, stroke() {}, clip() {},
      fillRect() {}, strokeRect() {}, drawImage() {}, setLineDash() {}, createLinearGradient: 鈍, createRadialGradient: 鈍, measureText: () => ({ width: 10 }), fillText() {} };
    const 我盤 = H.与平の今(態);
    const 降り = { u: 0.5, 盤: { x: 我盤.x + 40, y: 我盤.y - 30, s: 7.2, 向き: 1, 傾き: 0.58 } };
    let 今 = 1, 咎め = null, r = null;
    const x0 = 態.我.x, z0 = 態.我.z, t0 = 態.t;
    態.入.jy = -1;
    try { for (let k = 0; k < 8; k++) { 今 += 1 / 60; 降り.u = 0.2 + k * 0.02; r = H.背中を描く(筆, b, 態, 960, 540, 1, 今, false, 降り); } } catch (e) { 咎め = e.message; }
    確(`盤に近い所（u〇.二〜〇.三四。寄りで動ける境 ${H.寄りで動ける境} より下）は、方向キーを押しても与平は動かない`, !咎め && Math.hypot(態.我.x - x0, 態.我.z - z0) < 1e-9 && !態.寄りで動ける, 咎め || '');
    確('盤に近い所は、与平の刻も進まない（敵の掛かりも止まる）', 態.t === t0);
    try { for (let k = 0; k < 30; k++) { 今 += 1 / 60; 降り.u = 0.4 + k * 0.0131; r = H.背中を描く(筆, b, 態, 960, 540, 1, 今, false, 降り); } } catch (e) { 咎め = e.message; }
    確('途中を描けた（u＝〇.二〜〇.七八）', !咎め && r && r.描いた > 0, 咎め || `一コマに ${r.描いた}人`);
    確('地に近い所（u〇.四〜〇.七八）は、背中越しと同じく、方向キーで与平が動き、刻も進む', Math.hypot(態.我.x - x0, 態.我.z - z0) > 0.3 && 態.t > t0 && 態.寄りで動ける === true,
      `${Math.hypot(態.我.x - x0, 態.我.z - z0).toFixed(2)}m 動いた`);
    /* u を〇.五五に据えたまま前へ押せば、いま描く写しの前（態.写しの角）へ歩む。肩の写しの向き（態.cam.a）とは違う */
    const x1 = 態.我.x, z1 = 態.我.z;
    for (let k = 0; k < 30; k++) { 今 += 1 / 60; 降り.u = 0.55; H.背中を描く(筆, b, 態, 960, 540, 1, 今, false, 降り); }
    const a = 態.写しの角, dx = 態.我.x - x1, dz = 態.我.z - z1, L = Math.hypot(dx, dz), 振れ = Math.abs(角(Math.atan2(dz, dx) - a));
    確('寄りの途中で前へ押せば、いま描く写しの前（画の上）へ歩む（肩の写しの向きへではない）', L > 0.3 && 振れ < 10 * Math.PI / 180 && Math.abs(角(a - 態.cam.a)) > 10 * Math.PI / 180,
      `半秒で${L.toFixed(2)}m・歩んだ向きと写しの前の差 ${度(振れ)}度・写しの前と肩の写しの向きの差 ${度(角(a - 態.cam.a))}度`);
    態.入.jy = 0;
    /* 盤のよそ（与平から六百歩）を寄せて降りてくる途中は、境より地に近くても止める（与平が見る所から遠く、まわりの兵と突き合えない） */
    const 態2 = H.背中を始める(b, null, '足軽'), x2 = 態2.我.x, z2 = 態2.我.z, 我盤2 = H.与平の今(態2);
    const 遠い降り = { u: 0.5, 盤: { x: 我盤2.x + 600, y: 我盤2.y, s: 7.2, 向き: 0, 傾き: 0.58 } };
    態2.入.jy = -1;
    for (let k = 0; k < 20; k++) { 今 += 1 / 60; H.背中を描く(筆, b, 態2, 960, 540, 1, 今, false, 遠い降り); }
    態2.入.jy = 0;
    確('盤のよそから降りてくる途中（与平が見る所から遠い）は、境より地に近くても与平は動かない', Math.hypot(態2.我.x - x2, 態2.我.z - z2) < 1e-9 && !態2.寄りで動ける);
  }

  console.log('\n── 三　一人働き（足軽）：車で寄せきると降り、さらに寄せると地に着く。引けば盤へ戻る');
  const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 8)); }); };
  const 車 = async (el, n, 前へ = true) => {
    for (let i = 0; i < n; i++) {
      await act(async () => { el.dispatchEvent(new dom.window.WheelEvent('wheel', { bubbles: true, deltaY: 前へ ? -100 : 100, clientX: 480, clientY: 300 })); });
    }
    await flush();
  };
  const 段 = () => document.querySelector('.snk') ? (document.querySelector('.snk-me') ? '地' : '途中') : '盤';
  /* 段が変わるまで車を回し、回した目盛りの数を返す（四十目盛りで諦める） */
  const 段が変わるまで = async (el, 前へ = true) => { const 前の段 = 段(); for (let i = 1; i <= 40; i++) { await 車(el(), 1, 前へ); if (段() !== 前の段) return i; } return -1; };
  const 欄 = () => (document.querySelector('.bpanel') || {}).textContent || '';
  const 盤 = () => document.querySelector('.fieldwrap'), 札 = () => document.querySelector('.snk');
  {
    const { b } = 仕立てる('oriru3');
    const ctx = { b, pName: '織田家', eName: '今川家', pColor: '#2F5D8C', eColor: '#B0483C', place: '桶狭間', mode: 'field', 一人: { 身分: '足軽' } };
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(BattleScreen, { ctx, land: true, onEnd: () => {} })); });
    await flush();
    確('はじめは盤', 段() === '盤');
    const 寄せ = await 段が変わるまで(盤);
    確('盤を寄せきると、降り始める（札は出るが、名札はまだ出ない）', 寄せ > 0 && 段() === '途中', `${寄せ}目盛りで降り始めた`);
    const 降り = await 段が変わるまで(札);
    確('さらに寄せると地に着く（名札・突くの釦が出る）', 降り > 0 && 段() === '地' && !!document.querySelector('.snk-tsuku'), `降り始めから${降り + 1}目盛りほど`);
    const 着いた所 = window.__背中();
    確('地に着くと、与平の居所が読める', !!着いた所 && 着いた所.体力 === 100);
    const 昇り = await 段が変わるまで(札, false);
    確('引けば、また途中に戻る（名札は消える）', 昇り === 1 && 段() === '途中');
    const 昇り2 = await 段が変わるまで(札, false);
    確('さらに引けば盤へ戻る（札も消える）', 昇り2 > 0 && 段() === '盤', `${昇り2 + 1}目盛りほどで盤へ`);
    確('盤へ戻っても、足軽の欄のまま（下知は身分で決まる）', /足軽の身では/.test(欄()));
    await 段が変わるまで(盤); await 段が変わるまで(札);
    const また = window.__背中();
    確('また降りても、与平の居所と体力はそのまま（盤のあいだは止まっている）', 段() === '地' && !!また && Math.hypot(また.x - 着いた所.x, また.y - 着いた所.y) < 1e-6 && また.体力 === 着いた所.体力,
      また ? `(${また.x.toFixed(1)}, ${また.y.toFixed(1)})` : '');
    await act(async () => { root.unmount(); }); await flush();
  }

  console.log('\n── 四　ふだんの合戦（総大将）：寄せきると、真ん中に近い組のうしろへ降りて見物する');
  {
    const { b } = 仕立てる('oriru4');
    const ctx = { b, pName: '織田家', eName: '今川家', pColor: '#2F5D8C', eColor: '#B0483C', place: '桶狭間', mode: 'field', 一人: null };
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(BattleScreen, { ctx, land: true, onEnd: () => {} })); });
    await flush();
    const 開始 = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('合戦開始'));
    await act(async () => { 開始.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }); await flush();
    await 段が変わるまで(盤); await 段が変わるまで(札);
    const 札の字 = (札() || {}).textContent || '';
    確('地に着くと、見物の札（地の眺め・盤へ戻る）が出る', 段() === '地' && /地の眺め/.test(札の字) && /盤へ戻る/.test(札の字));
    確('見物では、突く・受ける・駆けるの釦は出ない', !document.querySelector('.snk-tsuku') && !document.querySelector('.snk-ukeru'));
    確('下知（一括命令）はふだんどおり使える', /一括命令/.test(欄()) && /全軍前進/.test(欄()));
    確('速さの釦もふだんどおり（どれも押せる）', [...document.querySelectorAll('.hayasa button')].every((x) => !x.disabled));
    let n = 0; while (段() !== '盤' && n++ < 60) await 車(札(), 1, false);
    確('引けば盤へ戻る', 段() === '盤', `${n}目盛り`);
    await act(async () => { root.unmount(); }); await flush();
  }

  console.log('\n── 五　一人働き（足軽）：寄りの途中でも、地に近ければ札が出て方向キーで歩め、写しは与平に付く');
  {
    /* 遊ぶ人の申し出：「添付の視点のときにもコントローラーで動かせるといいなと思います」。合戦の画面の一コマ
       （requestAnimationFrame）を刻〇.〇五秒ずつ回す（tests/hayasa と同じ） */
    const { b } = 仕立てる('oriru5');
    const ctx = { b, pName: '織田家', eName: '今川家', pColor: '#2F5D8C', eColor: '#B0483C', place: '桶狭間', mode: 'field', 一人: { 身分: '足軽' } };
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(BattleScreen, { ctx, land: true, onEnd: () => {} })); });
    await flush();
    let 刻 = 30000;
    const 回す = async (n) => { for (let i = 0; i < n; i++) await act(async () => { const cbs = [...rafMap.values()]; rafMap.clear(); for (const cb of cbs) cb((刻 += 50)); }); };
    const 鍵 = async (種) => { await act(async () => { window.dispatchEvent(new dom.window.KeyboardEvent(種, { code: 'ArrowUp', key: 'ArrowUp', bubbles: true })); }); };
    const 降りを据える = async (u) => { await act(async () => { window.__降り(u); }); await flush(); await 回す(3); await flush(); };
    await 降りを据える(1);
    確('地に降りきると、名札と突くの釦が出る', !!document.querySelector('.snk-me') && !!document.querySelector('.snk-tsuku'));
    await 降りを据える(0.6);
    確('寄りの途中でも、地に近ければ（u〇.六）名札と突くの釦が出る（盤の真ん中から降りても、地に降りきれば写しを与平の上に据え直すので、引いても与平のまわりを見下ろす）', window.__背中の態().寄りで動ける === true && !!document.querySelector('.snk-me') && !!document.querySelector('.snk-tsuku'));
    const 前 = window.__背中(), 盤前 = window.__降りの盤();
    await 鍵('keydown'); await 回す(20); await 鍵('keyup'); await 回す(1);
    const 後 = window.__背中(), 盤後 = window.__降りの盤(), dx = 後.x - 前.x, dy = 後.y - 前.y;
    確('寄りの途中で方向キーを押せば、与平が歩む', Math.hypot(dx, dy) > 0.5, `${(Math.hypot(dx, dy) * H.歩の尺).toFixed(2)}m`);
    確('写しは与平に付く（降り始めの盤の写しの真ん中も、盤の写しの真ん中も、与平が歩んだぶんだけ動く）',
      Math.abs(盤後.x - 盤前.x - dx) < 1e-6 && Math.abs(盤後.y - 盤前.y - dy) < 1e-6 && Math.abs(盤後.盤x - 盤前.盤x - dx) < 1e-6 && Math.abs(盤後.盤y - 盤前.盤y - dy) < 1e-6,
      `与平 (${dx.toFixed(2)}, ${dy.toFixed(2)})歩・降り始めの盤 (${(盤後.x - 盤前.x).toFixed(2)}, ${(盤後.y - 盤前.y).toFixed(2)})歩・盤 (${(盤後.盤x - 盤前.盤x).toFixed(2)}, ${(盤後.盤y - 盤前.盤y).toFixed(2)})歩`);
    await 降りを据える(0.2);
    確('盤に近い所（u〇.二）では、名札も釦も出さない（札は指と車を受けるだけ）', !document.querySelector('.snk-me') && !document.querySelector('.snk-tsuku') && !!document.querySelector('.snk'));
    const 前2 = window.__背中();
    await 鍵('keydown'); await 回す(20); await 鍵('keyup');
    const 後2 = window.__背中();
    確('盤に近い所では、方向キーを押しても与平は動かない', Math.hypot(後2.x - 前2.x, 後2.y - 前2.y) < 1e-9);
    await act(async () => { root.unmount(); }); await flush();
  }

  console.log('');
  const 本の咎 = errs.filter((e) => !/not wrapped in act|Warning/.test(e));
  console.log('エラー:', 本の咎.slice(0, 2).join(' | ') || 'なし');
  process.exit(咎.length || 本の咎.length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
