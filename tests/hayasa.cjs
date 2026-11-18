/* ============================================================
   一人視点（背中越し）の速さと下知（ui/BattleScreen.jsx）の試験

   遊ぶ人の申し出：「一人視点ではスピードは固定、もしくは委ねるで操作できなくして進めるという2択」
   「停止はできるように」「物頭未満はこれまでのコマンドは使えなくして、独自（自分自身を動かす、
   指揮下の部隊を動かす）のコマンドのみ」。背中越しのあいだは、盤の速さを微速（hitori/senaka.js
   背中の速さ）に固定し、停止のほかの速さの釦は押せなくする。委ねて結果を見るは使える。与平は足軽
   なので、これまでの下知は出さない。合戦の画面を jsdom に描き出して、
     一、合戦の前（布陣）には背中の視点の釦は出ない。合戦開始で出る
     二、速さは微速。停止と微速のほかは押せない。停止で止まり（遊ぶ人の申し出：停止はできるように）、微速で進む
     三、右の欄は足軽の欄（遊ぶ人の申し出：物頭未満は、これまでの下知は使えず、自分を動かす・指揮下の組を
         動かす独自の下知だけ）。一括命令も隊の選び方の説明も出さず、委ねて結果を見ると報せだけ
     四、委ねているあいだは微速へ戻さない。手綱を取り戻せば微速へ戻る
     五、盤だけを広げたときの速さの釦も、停止と微速のほかは押せない
     六、盤の視点へ戻れば、これまでの下知も速さの釦もまた使える（速さは微速のまま）
     七、背中越しに入り直せば微速へ戻り、委ねれば手を離したまま決着まで進む
     八、関ヶ原の好機の問い（総大将の判断）は、背中越しのあいだは出さず、盤の視点へ戻れば出る
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

  const 欄 = () => (document.querySelector('.bpanel') || {}).textContent || '';
  const 札 = () => (document.querySelector('.snk') || {}).textContent || '';

  console.log('── 一　合戦の前（布陣）には背中の視点の釦は出ない。合戦開始で出る');
  確('布陣のあいだは「背中の視点」の釦が無い（足軽の身では布陣も合戦開始もできない）', !釦('背中の視点'));
  await 押(釦('合戦開始'));
  確('合戦が始まり（速さは低速）、「背中の視点」の釦が出る', b.phase === 'fight' && 選ばれた() === '低速' && !!釦('背中の視点'), `選ばれた釦「${選ばれた()}」`);
  await 押(釦('背中の視点'));
  確('背中越しの札が出る（与平の名札）', !!document.querySelector('.snk') && /与平/.test(札()));

  console.log('\n── 二　速さは微速。停止と微速のほかは押せない。停止で止まり、微速で進む');
  確('入ると微速になる（低速から）', 選ばれた() === '微速', `選ばれた釦「${選ばれた()}」`);
  確('低速・通常・早送りは押せず、停止と微速は押せる', 押せない().join('・') === '低速・通常・早送り', `押せない：${押せない().join('・')}`);
  await 押(速さの釦().find((x) => x.textContent === '通常'));
  確('押せない釦（通常）を押しても、微速のまま', 選ばれた() === '微速', `選ばれた釦「${選ばれた()}」`);
  await 押(速さの釦().find((x) => x.textContent === '停止'));
  確('停止を押せば止まる（微速へ戻さない）', 選ばれた() === '停止', `選ばれた釦「${選ばれた()}」`);
  確('札に「合戦を止めている」と、進め方（微速）が出る', /合戦を止めている/.test(札()) && /微速/.test(札()));
  await 押(速さの釦().find((x) => x.textContent === '微速'));
  確('微速を押せば進む。札の知らせは消える', 選ばれた() === '微速' && !/合戦を止めている|合戦が止まっている/.test(札()), `選ばれた釦「${選ばれた()}」`);

  console.log('\n── 三　右の欄は足軽の欄：これまでの下知は出さず、委ねて結果を見ると報せだけ');
  確('一括命令（全軍委任・全軍前進・全軍撤退など）が出ない', !/一括命令|全軍委任|全軍前進|全軍接戦|全軍待機|全軍撤退|全部隊選択/.test(欄()));
  確('隊を選んで下知する説明が出ない', !/隊をタップして選ぶと/.test(欄()));
  確('足軽の身の説明が出る', /足軽の身では、全軍への下知も隊の差配もできない/.test(欄()));
  /* この試しの合戦では、まだ報せが一つも出ていない。試しの報せを一つ積み、描き直させてから見る */
  b.log.push({ t: b.t, text: '試しの報せ：味方の隊が槍を合わせた' });
  await 押(速さの釦().find((x) => x.textContent === '停止')); await 押(速さの釦().find((x) => x.textContent === '微速'));
  確('報せの一行は出る（下知でないので、ふだんの欄と同じく）', 欄().includes('試しの報せ：味方の隊が槍を合わせた'));
  const 委ねる釦 = () => [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === '委ねて結果を見る');
  const 委 = 委ねる釦();
  確('委ねて結果を見るの釦は押せる', !!委 && !委.disabled);

  console.log('\n── 四　委ねているあいだは微速へ戻さない。手綱を取り戻せば微速へ戻る');
  /* この小さな合戦は、委ねると試験の待ちのあいだに決着まで進んでしまう。委ねている最中を見るため、
     ここでは時計（Date.now）を一回ごとに二十五ミリ秒進め、委ねる仕組みの一区切り（二十四ミリ秒）に一刻も踏ませない */
  const 元の時計 = Date.now; let 偽の今 = 元の時計(); Date.now = () => (偽の今 += 25);
  await 押(委);
  確('委ねている（諸将に委ねている）', /諸将に委ねている/.test(document.body.textContent));
  確('委ねているあいだは盤の速さを止めたまま（委ねる仕組みが速さを〇にする。微速へ戻さない）', 選ばれた() === '停止', `選ばれた釦「${選ばれた()}」`);
  await 押(釦('手綱を取り戻す'));
  Date.now = 元の時計;
  確('手綱を取り戻すと、微速へ戻る（取り戻すはふつう通常にする）', 選ばれた() === '微速' && !/諸将に委ねている/.test(document.body.textContent), `選ばれた釦「${選ばれた()}」`);

  console.log('\n── 五　盤だけを広げたときの速さの釦も、停止と微速のほかは押せない');
  await 押(釦('広く'));
  const 小釦 = [...document.querySelectorAll('button')].filter((x) => ['停', '微', '低', '通', '早'].includes((x.textContent || '').trim()));
  確('広げたときの速さの釦が出る', 小釦.length === 5, `${小釦.length}つ`);
  確('「停」と「微」のほかは押せない', 小釦.filter((x) => x.disabled).map((x) => x.textContent).join('') === '低通早', 小釦.map((x) => `${x.textContent}${x.disabled ? '×' : '○'}`).join(' '));
  await 押(document.querySelector('.grip'));

  console.log('\n── 六　盤の視点へ戻れば、これまでの下知も速さの釦もまた使える（速さは微速のまま）');
  await 押(釦('盤の視点'));
  確('背中越しの札が消える', !document.querySelector('.snk'));
  確('右の欄に一括命令が戻る', /一括命令/.test(欄()) && /全軍前進/.test(欄()) && !/足軽の身では/.test(欄()));
  確('速さは微速のまま', 選ばれた() === '微速', `選ばれた釦「${選ばれた()}」`);
  確('どの速さの釦も押せる', 押せない().length === 0, 押せない().join('・'));
  await 押(速さの釦().find((x) => x.textContent === '通常'));
  確('通常を押せば通常になる', 選ばれた() === '通常', `選ばれた釦「${選ばれた()}」`);

  console.log('\n── 七　背中越しに入り直せば微速へ戻り、委ねれば手を離したまま決着まで進む');
  await 押(釦('背中の視点'));
  確('入り直すと微速へ戻る（通常から）', 選ばれた() === '微速', `選ばれた釦「${選ばれた()}」`);
  await 押(委ねる釦());
  for (let i = 0; i < 400 && b.phase === 'fight'; i++) await flush();
  確('委ねれば決着まで進む', b.phase !== 'fight', `合戦の段「${b.phase}」・戦場の刻 ${Math.round(b.t)}秒`);
  確('決着ののちは止まったまま（微速へ戻さない）', 選ばれた() !== '微速', `選ばれた釦「${選ばれた() || 'なし'}」`);
  確('決着ののちも「戦場を離れる」は出る（下知でなく、合戦を終える手）', !!釦('戦場を離れる'));
  await act(async () => { root.unmount(); }); await flush();

  console.log('\n── 八　関ヶ原：好機の問い（総大将の判断）は、背中越しのあいだは出さず、盤の視点へ戻れば出る');
  {
    const r2 = H.合戦を仕立てる('sekigahara', '東'), b2 = r2.b;
    const ctx2 = { b: b2, pName: '東軍', eName: '西軍', pColor: '#2F5D8C', eColor: '#B0483C', place: '関ヶ原', mode: 'field' };
    const root2 = createRoot(document.getElementById('r'));
    await act(async () => { root2.render(React.createElement(BattleScreen, { ctx: ctx2, land: true, onEnd: () => {} })); });
    await flush();
    await 押(釦('合戦開始'));
    await 押(釦('背中の視点'));
    確('背中越しに入れた', !!document.querySelector('.snk'));
    b2.筋書き.問い = { id: '試しの問い', 文: '試しの好機を問う', 諾文: 'そうする', 否文: 'やめておく' };
    await 押(速さの釦().find((x) => x.textContent === '停止'));          // 描き直させる
    確('背中越しのあいだは、好機の問いの札が出ない', !/試しの好機を問う/.test(document.body.textContent));
    await 押(釦('盤の視点'));
    確('盤の視点へ戻れば、好機の問いの札が出る', /試しの好機を問う/.test(document.body.textContent));
    await act(async () => { root2.unmount(); }); await flush();
  }

  console.log('');
  console.log('エラー:', errs.filter((e) => !/not wrapped in act|Warning/.test(e)).slice(0, 2).join(' | ') || 'なし');
  process.exit(咎.length || errs.filter((e) => !/not wrapped in act|Warning/.test(e)).length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
