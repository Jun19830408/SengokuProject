/* ============================================================
   一人視点の視点を回す（hitori/senaka.js 視を回す・hitori/SenakaFuda.jsx）と、盤の視点のあいだの与平
   （hitori/senaka.js 組と離れずにいる）の試験

   遊ぶ人の申し出：「一人視点で、視点を移動できるようにしてください。また、視点を盤にしたときはスピードを
   速いものも選べるようにしてください。一人視点では微速のみのままで」。速さの縛りは tests/hayasa.cjs で
   確かめる。ここで確かめるのは、
     一、写しは与平を芯に回る：回せば写しの向きがすぐ変わり（指に遅れない）、与平からの隔たりは変わらない。
         縦に回せば写しが上がり、俯く角も同じだけ増える（限りで止まる）
     二、方向キーは回した写しの前へ歩ませる
     三、Q・E は合戦を止めていても回せる。「視点を戻す」で元の肩越しへ戻る
     四、盤の視点のあいだに組が動けば、与平も組と一緒に動く（組との隔たり・向きの差はそのまま）。
         背中越しのあいだ組が動いても与平は引きずられない。止めていただけなら動かない。討死していれば動かさない
     五、札：右半分をなぞれば回り、「視点を戻す」が出て、押せば戻る。方向キーの輪は指を置いた所に留まる。方向キーを
         押さえたまま右半分をなぞっても回る（ピンチにならない）。右半分に二本の指を置けばピンチ（盤へ昇る）。Q・E。
         物頭はどこをなぞっても回る
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
  if (p === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
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
let 種 = 0x51A7;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 角差 = (x, y) => { let d = x - y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const 度 = (r) => `${Math.round(r * 180 / Math.PI)}度`;

/* ---- 野と両軍（敵は遠くに置く。与平のまわりに敵がいなければ、与平は歩む向きを向く） ---- */
const 名簿 = (総, 名) => { const out = []; let men = 総, i = 0; while (men > 0) { const m = Math.min(50, men); out.push({ m, t: 'yari', id: `${名}-組${i++}` }); men -= m; } return out; };
const 将 = (i, nm, 総, 名) => ({ id: 'g' + i, name: nm, lead: 70, valor: 70, wit: 60, gov: 55,
  retinue: 0, retTrain: 74, unity: 62, arms: { yari: 55, yumi: 20, teppo: 12, kiba: 13 }, locRost: 名簿(総, 名) });
function 野を仕立てる(種名) {
  H.setFieldSeed(種名, 'x'); H.setFieldKind('街道'); H.setBattleMap(null); H.layoutField(24000, 18);
  const cx = H.FIELD.w / 2, cy = H.FIELD.h * 0.5;
  for (const 群 of [H.FORESTS, H.WOODS, H.MARSH, H.HILLS, H.MOUNTAINS, H.VILLAGES]) {
    for (let i = 群.length - 1; i >= 0; i--) if (Math.hypot(群[i].x - cx, 群[i].y - cy) < 群[i].r + 900) 群.splice(i, 1);
  }
  const 甲 = H.makeCorps('P', 将(1, '与平の隊', 400, '甲'), 0, 400, 78, 78, cx, cy + 300, -Math.PI / 2, '#2F5D8C');
  const 乙 = H.makeCorps('E', 将(2, '敵の隊', 400, '乙'), 0, 400, 78, 78, cx, cy - 600, Math.PI / 2, '#B0483C');
  for (const c of [甲, 乙]) H.placeSquads(c, true);
  const b = H.createBattle([甲], [乙], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
  甲.squads.forEach((q, i) => { q.x = cx + (i - 3.5) * 60; q.y = cy; q.facing = -Math.PI / 2; });
  乙.squads.forEach((q, i) => { q.x = cx + (i - 3.5) * 60; q.y = cy - 700; q.facing = Math.PI / 2; });
  for (let k = 0; k < 50; k++) { b.t += 0.02; H.新絵状態を進める(b, 0, null); }
  return { b, 甲, 乙 };
}
const 鈍 = () => ({ addColorStop() {} });
const 筆 = { canvas: { width: 960, height: 540 }, setTransform() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
  beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, closePath() {}, arc() {}, ellipse() {}, rect() {}, fill() {}, stroke() {}, clip() {},
  fillRect() {}, strokeRect() {}, drawImage() {}, setLineDash() {}, createLinearGradient: 鈍, createRadialGradient: 鈍, measureText: () => ({ width: 10 }), fillText() {} };
const 尺 = H.歩の尺;

(async () => {
  const { b, 甲 } = 野を仕立てる('shiten');
  const 態 = H.背中を始める(b, 甲.id);
  let 今 = 1;
  const 描く = (秒, 止 = false, 毎 = null) => { const n = Math.round(秒 * 60); for (let i = 0; i < n; i++) { 今 += 1 / 60; H.背中を描く(筆, b, 態, 960, 540, 1, 今, 止); if (毎) 毎(i); } };
  const 肩の隔 = () => Math.hypot(態.cam.x - 態.我.x, 態.cam.z - 態.我.z);
  /* 組の向き（盤の角 th）から、写しの角（世界の角）は −th（hitori/senaka.js 向きを世へ） */
  const 組の角 = () => { const v = H.組の見た目(態.組); return -(v && v.初 ? v.向 : 態.組.facing); };

  console.log('── 一　写しは与平を芯に回る（横は指に遅れず、隔たりは変わらない。縦は上がって俯く）');
  描く(2);
  const 隔0 = 肩の隔(), 高0 = 態.cam.h, 俯0 = 態.cam.俯;
  確('回していなければ、これまでどおり組の向きの背中越し（与平のうしろ五m・右の肩〇.八五m・目の高さ三.三m・俯き十三度）',
    Math.abs(角差(態.cam.a, 組の角())) < 0.01 && Math.abs(隔0 - Math.hypot(5, 0.85)) < 0.02 && Math.abs(高0 - 3.3) < 1e-9 && Math.abs(俯0 - 13 * Math.PI / 180) < 1e-9,
    `向きの差 ${度(角差(態.cam.a, 組の角()))}・与平からの隔たり ${隔0.toFixed(2)}m・高さ ${高0.toFixed(2)}m・俯き ${度(俯0)}`);
  H.視を回す(態, Math.PI / 2, 0);
  描く(1 / 60);
  確('右へ九十度回せば、次のコマで写しの向きが九十度右へ回っている（均さない）', Math.abs(角差(態.cam.a, 組の角() - Math.PI / 2)) < 0.01,
    `組の向きからの差 ${度(角差(組の角(), 態.cam.a))}`);
  確('回しても、与平からの隔たりは変わらない（与平を芯に回る）', Math.abs(肩の隔() - 隔0) < 0.02, `${肩の隔().toFixed(2)}m`);
  確('写しは与平の左手（組から見て）へ回り込み、与平を右に見る', (() => { const fx = Math.cos(態.cam.a), fz = Math.sin(態.cam.a);
    const 前 = (態.我.x - 態.cam.x) * fx + (態.我.z - 態.cam.z) * fz; return 前 > 4.5; })());
  確('回しているあいだは「回している」とみなす（視点を戻すの釦を出す）', H.視を回しているか(態));
  H.視を回す(態, 0, 0.3);
  描く(1 / 60);
  const 腕 = Math.hypot(5, 3.3 - H.視の芯の高さ), 角0 = Math.atan2(3.3 - H.視の芯の高さ, 5);
  確('縦に回せば、写しは胸の高さを芯に上がり、俯く角も同じだけ増える',
    Math.abs(態.cam.h - (H.視の芯の高さ + 腕 * Math.sin(角0 + 0.3))) < 1e-9 && Math.abs(態.cam.俯 - (俯0 + 0.3)) < 1e-9 && 態.cam.h > 高0 + 1,
    `高さ ${高0.toFixed(2)}m → ${態.cam.h.toFixed(2)}m・俯き ${度(俯0)} → ${度(態.cam.俯)}・与平からの横の隔たり ${肩の隔().toFixed(2)}m`);
  H.視を回す(態, 0, 5); const 上 = 態.視.仰; H.視を回す(態, 0, -10); const 下 = 態.視.仰;
  確('縦の回しは限りで止まる', Math.abs(上 - H.視の仰の限り[1]) < 1e-9 && Math.abs(下 - H.視の仰の限り[0]) < 1e-9,
    `見下ろすほうは俯き${度(13 * Math.PI / 180 + 上)}まで、見上げるほうは${度(13 * Math.PI / 180 + 下)}まで`);
  H.視を回す(態, 0, -下);                                     // 仰を〇へ戻す

  console.log('\n── 二　方向キーは回した写しの前へ歩ませる');
  {
    const x0 = 態.我.x, z0 = 態.我.z, a = 態.cam.a;
    態.入.keys.add('u'); 描く(1); 態.入.keys.delete('u');
    const dx = 態.我.x - x0, dz = 態.我.z - z0, 歩 = Math.hypot(dx, dz);
    確('上を押せば、回した写しの向き（組の向きから右へ九十度）へ歩む', 歩 > 1.5 && Math.abs(角差(Math.atan2(dz, dx), a)) < 0.08,
      `一秒で${歩.toFixed(2)}m・歩んだ向きと写しの向きの差 ${度(角差(Math.atan2(dz, dx), a))}`);
    描く(1);
  }

  console.log('\n── 三　Q・E は合戦を止めていても回せる。「視点を戻す」で元へ戻る');
  {
    const 回0 = 態.視.回, x0 = 態.我.x;
    態.入.keys.add('視右'); 描く(0.5, true); 態.入.keys.delete('視右');
    確('E（視右）を押しているあいだ、止めていても回る（一秒におよそ九十度）', Math.abs(角差(態.視.回, 回0) - H.視の鍵の速さ * 0.5) < 0.05 && 態.我.x === x0,
      `半秒で ${度(角差(態.視.回, 回0))}`);
    態.入.keys.add('視左'); 描く(0.25, true); 態.入.keys.delete('視左');
    確('Q（視左）で左へ回る', Math.abs(角差(態.視.回, 回0) - H.視の鍵の速さ * 0.25) < 0.05, `いま組の向きから右へ ${度(態.視.回)}`);
    H.視を回す(態, 0, 0.2);
    H.視を戻す(態);
    描く(0.15);
    const 途 = Math.abs(態.視.回);
    描く(1);
    確('視点を戻せば、なめらかに元の背中越しへ戻る（〇.三秒ほど）', 途 > 0.01 && 態.視.回 === 0 && 態.視.仰 === 0 && !H.視を回しているか(態)
      && Math.abs(角差(態.cam.a, 組の角())) < 0.01 && Math.abs(態.cam.h - 3.3) < 1e-9,
      `〇.一五秒ののち残り ${度(途)}、一秒ののち組の向きからの差 ${度(角差(態.cam.a, 組の角()))}`);
    H.視を回す(態, 0.4, 0); H.視を戻す(態); H.視を回す(態, 0.1, 0);
    確('戻している途中に回し直せば、戻すのはやめる', !態.視.戻す && Math.abs(態.視.回 - 0.5) < 1e-9);
    H.視を回す(態, -0.5, 0);
  }

  console.log('\n── 四　盤の視点のあいだに組が動けば、与平も組と一緒に動く');
  {
    const q = 態.組;
    描く(0.5);
    const 盤の所 = () => ({ x: 態.我.x / 尺, y: -態.我.z / 尺 });
    const 組の中の所 = () => { const p = 盤の所(), ox = p.x - q.x, oy = p.y - q.y, c = Math.cos(-q.facing), s = Math.sin(-q.facing);
      return { u: ox * c - oy * s, v: ox * s + oy * c }; };
    const 与平の角 = () => Math.atan2(-態.我.fz, 態.我.fx);
    /* 背中越しのあいだに組が動いても、与平は引きずられない（自分で歩む） */
    const p0 = 盤の所();
    描く(0.5, false, () => { q.x += 0.3; });
    確('背中越しのあいだに組が動いても、与平はその場にいる', Math.hypot(盤の所().x - p0.x, 盤の所().y - p0.y) < 1e-9, `組は${(0.3 * 30 * 尺).toFixed(1)}m 動いた`);
    描く(1 / 60);                                               // 組を動かしたのは描いたあとなので、もう一コマ描いて組の控えを今の所にする
    /* 盤の視点へ昇る（背中越しを描かない）。そのあいだに組が動いて向きを変える。降りれば（BattleScreen 地の態を据える と同じく
       写しと前の秒を据え直して）描き始める */
    const 中0 = 組の中の所(), 角0 = 与平の角() - q.facing;
    q.x += 140; q.y -= 60; q.facing += 0.6;
    態.cam = null; 態.前秒 = 0;
    描く(2 / 60);
    const 中1 = 組の中の所(), 角1 = 与平の角() - q.facing;
    確('降りれば、与平は組と一緒に動いている（組の中の所はそのまま）', Math.hypot(中1.u - 中0.u, 中1.v - 中0.v) < 1e-6,
      `組の中の所 (${中0.u.toFixed(2)}, ${中0.v.toFixed(2)}) → (${中1.u.toFixed(2)}, ${中1.v.toFixed(2)})・盤の上で${(Math.hypot(140, 60) * 尺).toFixed(0)}m ほど`);
    確('与平の向きも、組が向きを変えたぶんだけ回る', Math.abs(角差(角1, 角0)) < 1e-6, `組の向きとの差 ${度(角0)} → ${度(角1)}`);
    確('写しの芯も同じだけ移る（元の所から滑ってこない）', Math.hypot(態.cam.芯x - 態.我.x, 態.cam.芯z - 態.我.z) < 0.05, `芯と与平の隔たり ${Math.hypot(態.cam.芯x - 態.我.x, 態.cam.芯z - 態.我.z).toFixed(3)}m`);
    /* 止めていただけ（組が動かない）なら、与平も動かない */
    const p1 = 盤の所();
    描く(1, true); 描く(0.2);
    確('止めていただけなら、与平は動かない', Math.hypot(盤の所().x - p1.x, 盤の所().y - p1.y) < 1e-9);
    /* 組から遠く（六十歩より）離れていれば、向きは回さず動いたぶんだけ移す */
    態.我.x += 80 * 尺; 描く(0.2);
    const p2 = 盤の所(), f2 = 与平の角();
    q.x += 30; q.facing += 0.5; 態.cam = null; 態.前秒 = 0; 描く(2 / 60);
    確('組から六十歩より遠く離れていたなら、向きは回さず、組の動いたぶんだけ移す', Math.abs(盤の所().x - (p2.x + 30)) < 1e-6 && Math.abs(盤の所().y - p2.y) < 1e-6 && Math.abs(角差(与平の角(), f2)) < 1e-6);
    /* 討死していれば動かさない */
    態.我.倒 = 態.t; const p3 = 盤の所();
    q.x += 50; 態.cam = null; 態.前秒 = 0; 描く(2 / 60);
    確('討死していれば、動かさない', Math.hypot(盤の所().x - p3.x, 盤の所().y - p3.y) < 1e-9);
    H.与平を立て直す(b, 態);
  }

  console.log('\n── 五　札：なぞって回す・視点を戻す・方向キーと一緒に・ピンチ・Q・E・物頭');
  for (const 身分 of ['足軽', '物頭']) {
    H.setBattleMap(null); H.setFieldSeed('shiten-ui', 'y'); H.layoutField(7000, 6);
    const W = H.FIELD.w, Hh = H.FIELD.h;
    const 将2 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 65, valor: 65, wit: 58, gov: 55, retinue: 500, retTrain: 70, unity: 62 });
    const P = [0, 1].map((k) => H.makeCorps('P', 将2(k), 0, 1200, 75, 75, W * (0.35 + k * 0.3), Hh * 0.84, -Math.PI / 2, '#2F5D8C'));
    const E = [0, 1].map((k) => H.makeCorps('E', 将2(10 + k), 0, 1000, 75, 75, W * (0.35 + k * 0.3), Hh * 0.16, Math.PI / 2, '#B0483C'));
    for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
    const b2 = H.createBattle(P, E, 'P');
    b2.mode = 'field'; b2.phase = 'deploy'; b2.dusk = 1100; b2.face = 'S'; b2.myFar = false;
    const ctx = { b: b2, pName: '織田家', eName: '今川家', pColor: '#2F5D8C', eColor: '#B0483C', place: '桶狭間', mode: 'field', 一人: { 身分 } };
    const root = createRoot(document.getElementById('r'));
    const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 8)); }); };
    await act(async () => { root.render(React.createElement(BattleScreen, { ctx, land: true, onEnd: () => {} })); });
    await flush();
    const 釦 = (t) => [...document.querySelectorAll('.mbtn,button')].find((x) => (x.textContent || '').includes(t));
    const 押 = async (el) => { await act(async () => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }); await flush(); };
    let 刻 = 50000;
    const 回す = async (秒) => { const n = Math.max(1, Math.round(秒 / 0.05));
      for (let i = 0; i < n; i++) await act(async () => { 刻 += 50; const cbs = [...rafMap.values()]; rafMap.clear(); for (const cb of cbs) cb(刻); }); await flush(); };
    await 押(釦('背中の視点')); await act(async () => { window.__降り(1); }); await flush();
    await 回す(0.3);
    const 態2 = window.__背中の態();
    const 根 = () => document.querySelector('.snk');
    const 指 = async (型, id, x, y, 先 = null) => { await act(async () => { (先 || 根()).dispatchEvent(new dom.window.PointerEvent(型, { bubbles: true, pointerId: id, clientX: x, clientY: y })); }); };
    const 戻す釦 = () => document.querySelector('.snk-modosu');
    console.log(`  〔${身分}〕`);
    確(`${身分}：背中越しに降りている`, !!態2 && !!根() && window.__降り() === 1);
    if (身分 === '足軽') {
      await 指('pointerdown', 1, 700, 300); await 指('pointermove', 1, 760, 300); await 指('pointermove', 1, 760, 360); await 指('pointerup', 1, 760, 360);
      確('右半分を右へなぞれば右へ回り、下へなぞれば見下ろす', Math.abs(態2.視.回 - 60 * H.視のなぞりの横) < 1e-9 && Math.abs(態2.視.仰 - 60 * H.視のなぞりの縦) < 1e-9 && 態2.入.jx === 0,
        `横 ${度(態2.視.回)}・縦 ${度(態2.視.仰)}`);
      await 回す(0.25);
      確('回していれば「視点を戻す」の釦が出る（右の釦の列の上）', !!戻す釦() && !戻す釦().classList.contains('low'));
      /* 方向キーの輪は、指を置いた所に出て、指を置いているあいだはその所に留まり、離せば消える（申し出「置いたところで
         固定してほしい。前進するためにカーソルを移動するとコントローラごと移動してしまう」） */
      const 輪 = () => document.querySelector('.snk-joy');
      const 輪の所 = () => ({ x: parseFloat(輪().style.left), y: parseFloat(輪().style.top), 出: 輪().style.display !== 'none', jx: 態2.入.jx, jy: 態2.入.jy });
      await 指('pointerdown', 6, 200, 400); const 置 = 輪の所();
      await 指('pointermove', 6, 200, 250); const 上へ = 輪の所();          // 輪の外（百五十px 上）まで
      await 指('pointermove', 6, 330, 400); const 右へ = 輪の所();          // 輪の外（百三十px 右）へ
      await 指('pointerup', 6, 330, 400); const 離 = 輪の所();
      確('方向キーの輪は指を置いた所に出て、指が輪の外へ出ても動かない（つまみが輪の縁で止まり、向きは指のほう）',
        置.出 && [置, 上へ, 右へ].every((o) => o.x === 200 && o.y === 400) && Math.abs(上へ.jy + 1) < 1e-9 && Math.abs(上へ.jx) < 1e-9
          && Math.abs(右へ.jx - 1) < 1e-9 && Math.abs(右へ.jy) < 1e-9,
        `輪の所 (${置.x}, ${置.y}) → 上へ (${上へ.x}, ${上へ.y}) → 右へ (${右へ.x}, ${右へ.y})・向き 上へ (${上へ.jx.toFixed(2)}, ${上へ.jy.toFixed(2)}) 右へ (${右へ.jx.toFixed(2)}, ${右へ.jy.toFixed(2)})`);
      確('指を離せば輪は消え、方向キーもやむ', !離.出 && 離.jx === 0 && 離.jy === 0);
      /* 方向キーを押さえたまま、右半分をなぞる */
      const 回0 = 態2.視.回;
      await 指('pointerdown', 2, 200, 400); await 指('pointermove', 2, 200, 350);
      await 指('pointerdown', 3, 700, 200); await 指('pointermove', 3, 650, 200);
      確('方向キーを押さえたまま右半分をなぞれば、歩みつつ回る（ピンチにならない）', Math.abs(態2.入.jy + 50 / 52) < 1e-9 && Math.abs(角差(態2.視.回, 回0) + 50 * H.視のなぞりの横) < 1e-9 && window.__降り() === 1,
        `方向キー ${態2.入.jy.toFixed(2)}・回し ${度(角差(態2.視.回, 回0))}・降り ${window.__降り()}`);
      await 指('pointerup', 3, 650, 200); await 指('pointerup', 2, 200, 350);
      確('指を離せば方向キーもやむ', 態2.入.jx === 0 && 態2.入.jy === 0);
      /* 右半分に二本の指：ピンチ */
      const 回1 = 態2.視.回;
      await 指('pointerdown', 4, 600, 300); await 指('pointerdown', 5, 800, 300); await 指('pointermove', 5, 700, 300);
      確('右半分に二本の指を置いて狭めれば、ピンチで盤のほうへ昇る（視点は回さない）', window.__降り() < 1 && 態2.視.回 === 回1, `降り ${window.__降り().toFixed(2)}`);
      await 指('pointerup', 5, 700, 300); await 指('pointerup', 4, 600, 300);
      await act(async () => { window.__降り(1); }); await flush(); await 回す(0.1);
      /* Q・E */
      const 回2 = 態2.視.回;
      await act(async () => { window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true })); });
      await 回す(0.5);
      await act(async () => { window.dispatchEvent(new dom.window.KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true })); });
      確('E を押しているあいだ右へ回る', 角差(態2.視.回, 回2) > 0.5 && !態2.入.keys.has('視右'), `${度(角差(態2.視.回, 回2))}`);
      /* 視点を戻す */
      await 指('pointerdown', 9, 900, 330, 戻す釦()); await 指('pointerup', 9, 900, 330, 戻す釦());
      await 回す(1);
      確('「視点を戻す」を押せば元へ戻り、釦は消える', 態2.視.回 === 0 && 態2.視.仰 === 0 && !戻す釦());
    } else {
      確('物頭には方向キーが無い（札に案内も出ない）', !document.querySelector('.snk-tsuku') && !document.querySelector('.snk-hint'));
      await 指('pointerdown', 1, 200, 300); await 指('pointermove', 1, 140, 300); await 指('pointerup', 1, 140, 300);
      確('物頭は左半分をなぞっても回る（方向キーが無いので）', Math.abs(態2.視.回 + 60 * H.視のなぞりの横) < 1e-9, `${度(態2.視.回)}`);
      await 回す(0.25);
      確('「視点を戻す」は右下の隅に出る', !!戻す釦() && 戻す釦().classList.contains('low'));
      const 回0 = 態2.視.回;
      await act(async () => { window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { code: 'KeyQ', key: 'q', bubbles: true })); });
      await 回す(0.5);
      await act(async () => { window.dispatchEvent(new dom.window.KeyboardEvent('keyup', { code: 'KeyQ', key: 'q', bubbles: true })); });
      確('物頭も Q・E で回せる', 角差(態2.視.回, 回0) < -0.5, `${度(角差(態2.視.回, 回0))}`);
    }
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
