/* ============================================================
   一人働きの合戦の身分と下知（ui/BattleScreen.jsx 身分・hitori/senaka.js 物頭を据える）の試験

   遊ぶ人の申し出：「背中視点でできるのは物頭未満の指示、物頭以降は背中視点できるが、それまでの指示は
   逆にできず、部隊としての通常（全軍指示はできない）の指示という分け方」。下知は、見ている視点でなく
   身分で決まる。合戦の画面を jsdom に描き出して、
     一、ふだんの合戦（総大将）：これまでどおり。背中の視点の釦は出ない（一人働きだけのもの）
     二、足軽：合戦は自ずと始まり（布陣・合戦開始は総大将の役）、微速。盤の視点でも隊を選べない（見るだけ）。
         右の欄は足軽の欄で、一括命令は出ない。速さは、盤の視点ではどれも選べ、背中越しでは停止と微速だけ
         （遊ぶ人の申し出：「視点を盤にしたときはスピードを速いものも選べるように。一人視点では微速のみのままで」）
     三、物頭：合戦は自ずと始まり、預かる隊を選んだ形。右の欄はその隊の下知だけ（一括命令・全軍の鼓舞は
         出ない）。ほかの隊は選べず、預かる隊は外れない。下知はその隊に効く
     四、物頭の背中の視点：名札に預かる隊が出て、方向キー・突く・受ける・駆けるは出ない。右の欄はその隊の
         下知のまま。物頭は自分では動かず、組のうしろに立って組と一緒に動く
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
let 種 = 0x3B5A;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* 野の戦を一つ仕立てる（布陣の段から）。味方三隊・敵二隊 */
const 仕立てる = (種名) => {
  H.setBattleMap(null); H.setFieldSeed(種名, 'y'); H.layoutField(7000, 6);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 65, valor: 65, wit: 58, gov: 55, retinue: 500, retTrain: 70, unity: 62 });
  const P = [0, 1, 2].map((k) => H.makeCorps('P', 将(k), 0, 900, 75, 75, W * (0.3 + k * 0.2), Hh * 0.7, -Math.PI / 2, '#2F5D8C'));
  const E = [0, 1].map((k) => H.makeCorps('E', 将(10 + k), 0, 900, 75, 75, W * (0.35 + k * 0.3), Hh * 0.3, Math.PI / 2, '#B0483C'));
  for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
  const b = H.createBattle(P, E, 'P');
  b.mode = 'field'; b.phase = 'deploy'; b.dusk = 1100; b.face = 'S'; b.myFar = false;
  return { b, P, E };
};

(async () => {
  const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 8)); }); };
  const 釦 = (t) => [...document.querySelectorAll('.mbtn,button')].find((x) => (x.textContent || '').includes(t));
  const 押 = async (el) => { await act(async () => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }); await flush(); };
  /* 背中の視点・盤の視点の釦は、地へなめらかに降りる・盤へ昇る（合戦の画面の刻みで進む）。jsdom では刻みが
     回らないので、撮る道具の覗き口（window.__降り）で降りきらせる・昇りきらせる */
  const 降りきる = async (u) => { await act(async () => { window.__降り(u); }); await flush(); };
  const 速さの釦 = () => [...document.querySelectorAll('.hayasa button')];
  const 選ばれた = () => (速さの釦().find((x) => x.classList.contains('on')) || {}).textContent || '';
  const 押せない = () => 速さの釦().filter((x) => x.disabled).map((x) => x.textContent);
  const 欄 = () => (document.querySelector('.bpanel') || {}).textContent || '';
  const 札 = () => (document.querySelector('.snk') || {}).textContent || '';
  /* 盤の上で、その隊の真上を押す（カメラをその隊に据えてから、盤の真ん中を押して離す） */
  const 隊を押す = async (c) => {
    await act(async () => { window.__カメラ(c.x, c.y, 1.4); }); await flush();
    const wrap = document.querySelector('.fieldwrap');
    await act(async () => {
      wrap.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, clientX: 480, clientY: 300 }));
      wrap.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, clientX: 480, clientY: 300 }));
    });
    await flush();
  };
  const 描く = async (b, ctx) => {
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(BattleScreen, { ctx, land: true, onEnd: () => {} })); });
    await flush();
    return root;
  };
  const ctxを作る = (b, 一人) => ({ b, pName: '織田家', eName: '今川家', pColor: '#2F5D8C', eColor: '#B0483C', place: '桶狭間', mode: 'field', 一人 });

  console.log('── 一　ふだんの合戦（総大将）はこれまでどおり。背中の視点の釦は出ない');
  {
    const { b, P } = 仕立てる('mibun1');
    const root = await 描く(b, ctxを作る(b, null));
    確('布陣の段のまま始まる（合戦開始は遊ぶ人が押す）', b.phase === 'deploy' && !!釦('合戦開始'));
    await 押(釦('合戦開始'));
    確('一括命令が出る', /一括命令/.test(欄()) && /全軍前進/.test(欄()));
    確('速さの釦はどれも押せる', 押せない().length === 0, 押せない().join('・'));
    確('背中の視点の釦は出ない（一人働きだけのもの）', !釦('背中の視点'));
    await 隊を押す(P[1]);
    確('盤の上で味方の隊を押せば選べる', /の命令/.test(欄()) && 欄().includes(P[1].name), P[1].name);
    await act(async () => { root.unmount(); }); await flush();
  }

  console.log('\n── 二　足軽：合戦は自ずと始まり、盤の視点でも隊を選べない（見るだけ）');
  {
    const { b, P } = 仕立てる('mibun2');
    const root = await 描く(b, ctxを作る(b, { 身分: '足軽' }));
    確('布陣を待たずに合戦が始まる（布陣・合戦開始は総大将の役）', b.phase === 'fight' && !釦('合戦開始'));
    確('速さは微速で始まり、盤の視点では低速・通常・早送りも押せる', 選ばれた() === '微速' && 押せない().length === 0, `選ばれた「${選ばれた()}」・押せない：${押せない().join('・') || 'なし'}`);
    確('右の欄は足軽の欄（一括命令は出ない）', /足軽の身では、全軍への下知も隊の差配もできない/.test(欄()) && !/一括命令|全軍前進|全部隊選択/.test(欄()));
    確('委ねて結果を見るは出る', !!釦('委ねて結果を見る'));
    await 隊を押す(P[1]);
    確('盤の上で味方の隊を押しても選べない', !/の命令/.test(欄()) && /足軽の身では/.test(欄()));
    確('背中の視点の釦が出る', !!釦('背中の視点'));
    await 押(釦('背中の視点')); await 降りきる(1);
    確('背中越しの札（足軽 与平・体力・気力）と、突くの釦が出る', /足軽/.test(札()) && /体力/.test(札()) && !!document.querySelector('.snk-tsuku'));
    確('背中越しでは、速さは停止と微速だけ', 選ばれた() === '微速' && 押せない().join('・') === '低速・通常・早送り', `選ばれた「${選ばれた()}」・押せない：${押せない().join('・')}`);
    await 押(釦('盤の視点')); await 降りきる(0);
    確('盤の視点へ戻っても、足軽の欄のまま（下知は身分で決まる）', /足軽の身では/.test(欄()) && !/一括命令/.test(欄()));
    確('盤の視点へ戻れば、速さの釦はどれも押せる（微速のまま）', 選ばれた() === '微速' && 押せない().length === 0, `選ばれた「${選ばれた()}」・押せない：${押せない().join('・') || 'なし'}`);
    await act(async () => { root.unmount(); }); await flush();
  }

  console.log('\n── 三　物頭：預かる隊への通常の下知だけ（全軍への下知はできない）');
  let 物頭の隊 = null;
  {
    const { b, P } = 仕立てる('mibun3');
    const root = await 描く(b, ctxを作る(b, { 身分: '物頭' }));
    物頭の隊 = P.find((c) => 欄().includes(`${c.name} の命令`));
    確('布陣を待たずに合戦が始まり、預かる隊を選んだ形で始まる', b.phase === 'fight' && !!物頭の隊, 物頭の隊 ? `${物頭の隊.name}` : '選ばれていない');
    確('一括命令（全軍委任・全軍前進・全部隊選択など）は出ない', !/一括命令|全軍委任|全軍前進|全部隊選択|全軍撤退/.test(欄()));
    確('全軍の鼓舞は出ない（自部隊の鼓舞は出る）', !/鼓舞（全軍）/.test(欄()) && /鼓舞（自部隊/.test(欄()));
    確('盤の視点では、速さの釦はどれも押せる', 押せない().length === 0, 押せない().join('・') || '押せない釦なし');
    const ほか = P.find((c) => c !== 物頭の隊);
    await 隊を押す(ほか);
    確('ほかの味方の隊を押しても選べない（預かる隊のまま）', 欄().includes(`${物頭の隊.name} の命令`) && !欄().includes(`${ほか.name} の命令`), ほか.name);
    await 隊を押す(物頭の隊);
    確('預かる隊を押し直しても外れない', 欄().includes(`${物頭の隊.name} の命令`));
    const 前進 = [...document.querySelectorAll('.bpanel button')].find((x) => (x.textContent || '').trim() === '前進');
    確('前進の釦がある', !!前進);
    await 押(前進);
    確('前進の下知が預かる隊に効く（委任が解け、下知が前進になる）', 物頭の隊.auto === false && (物頭の隊.order === '前進' || (物頭の隊.pending && 物頭の隊.pending.o === '前進') || /前進/.test(JSON.stringify(物頭の隊.pending || {}))),
      `委任 ${物頭の隊.auto}・下知 ${物頭の隊.order}${物頭の隊.pending ? '（伝令中）' : ''}`);
    確('ほかの隊は委任のまま（諸将の采配で動く）', P.filter((c) => c !== 物頭の隊).every((c) => c.auto === true));

    console.log('\n── 四　物頭の背中の視点：自分では動かず、隊への下知は右の欄から');
    await 押(釦('背中の視点')); await 降りきる(1);
    const 名札 = (document.querySelector('.snk-me') || {}).textContent || '';
    確('名札に物頭と預かる隊が出る', /物頭/.test(名札) && 名札.includes(`${物頭の隊.name}の隊を預かる`), 名札.slice(0, 40));
    確('方向キーの案内・突く・受ける・駆けるは出ない', !document.querySelector('.snk-tsuku') && !document.querySelector('.snk-ukeru') && !document.querySelector('.snk-kakeru') && !document.querySelector('.snk-hint'));
    確('右の欄は預かる隊の下知のまま', 欄().includes(`${物頭の隊.name} の命令`) && !/足軽の身では/.test(欄()));
    確('物頭の背中越しでも、速さは停止と微速だけ', 押せない().join('・') === '低速・通常・早送り', 押せない().join('・'));
    await act(async () => { root.unmount(); }); await flush();
  }

  /* 物頭を据える（hitori/senaka.js）：組のうしろに立ち、組と一緒に動く */
  {
    const { b, P } = 仕立てる('mibun4');
    b.phase = 'fight';
    for (let k = 0; k < 40; k++) { b.t += 0.05; H.新絵状態を進める(b, 0, null); }
    const 態 = H.背中を始める(b, P[1].id, '物頭');
    const 鈍 = () => ({ addColorStop() {} });
    const 筆 = { canvas: { width: 960, height: 540 }, setTransform() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
      beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() {}, arc() {}, ellipse() {}, rect() {}, fill() {}, stroke() {}, clip() {},
      fillRect() {}, strokeRect() {}, drawImage() {}, setLineDash() {}, createLinearGradient: 鈍, createRadialGradient: 鈍, measureText: () => ({ width: 10 }), fillText() {} };
    let 今 = 1; for (let k = 0; k < 3; k++) { 今 += 1 / 60; H.背中を描く(筆, b, 態, 960, 540, 1, 今, false); }
    const 組 = 態.組, x0 = 態.我.x, z0 = 態.我.z;
    態.入.jy = -1; 態.入.keys.add('u');                         // 方向キーを押しても
    for (let k = 0; k < 30; k++) { 今 += 1 / 60; H.背中を描く(筆, b, 態, 960, 540, 1, 今, false); }
    const 所 = H.与平の所(組);
    確('物頭は方向キーでは動かない（組のうしろに立ったまま）', Math.hypot(態.我.x - 所.x * H.歩の尺, 態.我.z + 所.y * H.歩の尺) < 1e-6 && Math.hypot(態.我.x - x0, 態.我.z - z0) < 1e-6);
    確('物頭は突けない（突く を呼んでも突かない）', H.突く(態) === false && 態.我.撃 == null);
    /* 組を北へ二十歩動かし、見た目を進めると、物頭も組のうしろについて動く */
    for (const q of P[1].squads) q.y -= 20;
    for (let k = 0; k < 60; k++) { b.t += 0.05; H.新絵状態を進める(b, 0, null); 今 += 1 / 60; H.背中を描く(筆, b, 態, 960, 540, 1, 今, false); }
    const 所2 = H.与平の所(態.組);
    確('組が動けば、物頭も組のうしろについて動く', Math.hypot(態.我.x - 所2.x * H.歩の尺, 態.我.z + 所2.y * H.歩の尺) < 1e-6 && Math.hypot(態.我.x - x0, 態.我.z - z0) > 1, `${Math.hypot(態.我.x - x0, 態.我.z - z0).toFixed(1)}m 動いた`);
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
