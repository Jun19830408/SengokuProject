/* ============================================================
   率いる手勢の動き（hitori/tezei.js 手勢へ下知・手勢を親に付ける・hitori/senaka.js 与平をうしろに付ける・手勢の突き合い・
   battle/field.js 率いの刻比・battle/engine.js・battle/shinga.js・battle/draw.js）と、背中越しの名札の畳み
   （hitori/SenakaFuda.jsx）の試験

   遊ぶ人の申し出（一）：「10人隊になりましたが、移動がうまくできません。隊を持ったときでも一人のときと同様にスムースに移動
   できるよう修正してください。それから、左上のステータスですが大きすぎて前が見にくいです。閉じれるようにするか、
   小さくするかしてください。体力と気力は常に表示させるが、小さく表示するようにしてください」。
   遊ぶ人の申し出（二）：「まだ隊の挙動が怪しいです。ダッシュもできません。また、部隊が敵と戦うよう指示したら基本的に
   動けなくなってしまいますので、修正してください。掛かれはあくまでも一人のときに槍をついていたのを部隊全体で突くように
   するだけにするのはどうでしょうか？突く(全体)と受ける(全体)でもいいように思うのですが、どうでしょう？また、盤にした
   場合、10人組でも所属する武将とは別個として認識されていますが、動かせず、その場にとどまります。あくまでも武将に所属
   する部隊なので、別個にする必要はないと思います」。

   背中越しの盤は微速で進むので、盤の刻で決めた足の慣性・向き直り・兵の絵の均しが実の秒では十倍あまり鈍り、
   押しても兵が歩み出さず、横へ押しても手勢がほとんど向き直らなかった。背中越しの一コマ（六十分の一秒）を
   回して（背中を描く を筆の代わりで呼ぶ）、
     一、率いているあいだ、手勢に盤の刻と実の秒の比が据わり、率いなくなれば（盤が〇.二五秒進んでも据え直されな
         ければ）外れる
     二、前へ押せば、与平はすぐ歩み出し、兵は〇.八秒のうちに歩み出し、二秒ののちには毎秒一.四m より速く歩む。
         上司の隊に押されて横へ流れない。放せば兵は〇.八m のうちに止まり、与平は〇.五秒のうちに止まる
     三、右へ押せば、手勢は一秒のうちに右を向き、兵の絵も二秒のうちに右を向く。押しているあいだ写しの向きは保ち
         （手勢がその場で輪を描かない）、放せば手勢の向きへ寄る。与平は駆け足より速く回り込まない
     四、写しの手前へ押せば、手勢は前を向いたまま下がる（兵の絵も振り向かない）
     五、駆ける（全体）：押しながら動かせば、手勢は駆け足（歩みのおよそ倍）になり、与平の気力を使う。放せば歩みに
         戻り、下がるあいだは駆けない。息が上がれば、気力が一.〇に戻るまでは駆けない
     六、率いていない隊は、これまでの盤の刻の向き直り（盤の一秒に一.四）のまま
     七、十人長から三百人長のどれでも、前へ押せば兵が歩み出す
     八、名札：はじめは畳んで、身分と体力・気力だけ。押せば開いて討ち取り・手勢・持ち場が出て、もう一度押せば畳む。
         開け閉めは端末に覚える。畳んでいても、持ち場の外にいればその一行を出す。名札を押しても方向キーは出ない
     九、敵の兵と槍を合わせる：前へ押せば槍の間合いまで詰まって留まり、敵の兵の列の中へ入り込まない。盤の組どうしの
         斬り合いには入らない。突く（全体）で手勢の槍の兵がいっせいに突いて敵の兵を倒す（与平の討ち取りには数え
         ない）。受ける（全体）で敵の突きが当たりにくくなる。槍を合わせていても、うしろ・横へ押せば動ける
     十、盤の視点（背中越しで率いていないとき）：上司の隊が動けば、手勢はついて動く（深い川は上司の隊が渡った所を
         辿って渡る）。止まれば上司の隊の向きへ向き直る（十人長・百人長）
     十一、盤に手勢の旗・名・体力の筋を描かない（上司の隊の印は描く）
     十二、率いているあいだは、方向キーを放せば留まる（上司の隊が動いても付いて歩まない）。率いるのをやめれば
         （盤の視点）、上司の隊に付いて歩む
   を確かめる。値はみな仮。
   ============================================================ */
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
global.localStorage = dom.window.localStorage;          // 名札の開け閉めを覚える棚（ブラウザでは window の棚がそのまま見える）
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
let 種 = 0x7E2A;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 尺 = H.歩の尺;
const 鈍 = () => ({ addColorStop() {} });
const 筆 = { canvas: { width: 960, height: 540 }, setTransform() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
  beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {}, closePath() {}, arc() {}, ellipse() {}, rect() {}, fill() {}, stroke() {}, clip() {},
  fillRect() {}, strokeRect() {}, drawImage() {}, setLineDash() {}, createLinearGradient: 鈍, createRadialGradient: 鈍, measureText: () => ({ width: 10 }), fillText() {} };
const 角 = (d) => { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const 度 = (r) => Math.round(r * 180 / Math.PI);

/* 野の戦を一つ仕立て、上司の隊（g0）から手勢を分けて率いる（風雲の十一の試しと同じ形） */
const 将 = (i, lord) => ({ id: `g${i}`, name: `将${i}`, lead: 65, valor: 65, wit: 58, gov: 55, retinue: 500, retTrain: 70, unity: 62, lord: !!lord });
/* 揃.敵前 … 敵の隊を上司の隊の何歩先に置くか（無ければ遠くに置く）。揃.敵数 … 敵の兵の数。揃.槍 … 両方の隊を槍組だけにする
   （弓・鉄砲が射て兵が減ると、突き合いで倒した・倒された数が濁る）。揃.待つ … どの隊も待たせ、諸将の采配も止める */
function 野を仕立てる(種名, 段, 揃 = {}) {
  /* 野は風雲の十一の試しと同じ（手勢の歩む先が平らな野で、森や丘で足が鈍らない） */
  H.setBattleMap(null); H.setFieldSeed('fuun', 'tezei'); H.layoutField(7000, 6); void 種名;
  const W = H.FIELD.w, Hh = H.FIELD.h;
  const P = [H.makeCorps('P', 将(0, true), 0, 1200, 75, 75, W * 0.5, Hh * 0.7, -Math.PI / 2, '#2F5D8C')];
  const E = [H.makeCorps('E', 将(10, true), 0, 揃.敵数 || 900, 75, 75, W * 0.5, 揃.敵前 ? Hh * 0.7 - 揃.敵前 : Hh * 0.2, Math.PI / 2, '#B0483C')];
  if (揃.槍) for (const c of [...P, ...E]) for (const q of c.squads) q.type = 'yari';
  for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
  const b = H.createBattle(P, E, 'P'); b.mode = 'field'; b.phase = 'fight'; b.dusk = 99999;
  const 手 = H.手勢を組む(b, 'g0', { 手勢: H.手勢の数[段], 名: '与平', 武勇: 45, 統率: 20 });
  /* 待たせるときは、諸将の采配（battle/ai.js。〇.六秒ごと）も止める（敵の隊が接戦の下知で手勢の脇へ回り込まないように） */
  if (揃.待つ) { for (const c of b.corps) { c.auto = false; c.order = '待機'; c.tx = c.x; c.ty = c.y; } b.aiClock = 1e9; }
  for (let k = 0; k < 30; k++) { b.t += 0.02; H.新絵状態を進める(b, 0, null); }
  const 態 = H.背中を始める(b, 手.id, '足軽', null, { 体力: 100, 武勇: 45, 風雲: true, 段, 首の勲功: H.首の勲功 });
  const sp = H.背中の速さ / H.fieldScale();
  let 今 = 1;
  /* 一コマ：盤を微速で進め（合戦の画面と同じ）、背中を描く（写し・与平・手勢への下知） */
  const 回す = (秒, jx = 0, jy = 0, 駆 = false, 毎 = null) => {
    const n = Math.round(秒 * 60);
    for (let i = 0; i < n; i++) {
      態.入.jx = jx; 態.入.jy = jy; 態.入.駆 = 駆;
      H.stepBattle(b, sp / 60); 今 += 1 / 60;
      H.背中を描く(筆, b, 態, 960, 540, 1, 今, false);
      if (毎) 毎(i + 1);
    }
  };
  const 兵の芯 = () => { let x = 0, y = 0, n = 0; for (const q of 手.squads) { const v = H.組の見た目(q); if (!v) continue; for (let k = 0; k < Math.min(50, Math.round(q.men)); k++) if (v.生[k]) { x += v.sx[k]; y += v.sy[k]; n++; } } return { x: x / n, y: y / n }; };
  const 我の所 = () => ({ x: 態.我.x / 尺, y: -態.我.z / 尺 });
  const 隔m = (a, z) => Math.hypot(a.x - z.x, a.y - z.y) * 尺;
  return { b, 手, 態, sp, 回す, 兵の芯, 我の所, 隔m };
}

(async () => {
  console.log('── 一　率いているあいだ、手勢に盤の刻と実の秒の比が据わる');
  {
    const { b, 手, 態, sp, 回す } = 野を仕立てる('ugoki1', '十人長');
    回す(1);
    const 比 = H.率いの刻比(b, 手);
    確('率いているあいだ、手勢に盤の刻と実の秒の比（微速）が据わる', 比 != null && Math.abs(比 - sp) / sp < 0.25, `比 ${比 && 比.toFixed(4)}・微速 ${sp.toFixed(4)}`);
    確('率いている手勢のほかの隊には据わらない', b.corps.filter((c) => c !== 手).every((c) => H.率いの刻比(b, c) == null));
    b.t += 0.3;
    確('盤が〇.二五秒（盤の刻）より進んでも据え直されなければ、もう率いていないとみなす', H.率いの刻比(b, 手) == null);
    回す(0.05);
    確('背中越しに戻れば、また据わる', H.率いの刻比(b, 手) != null && H.率いている(態));
  }

  console.log('\n── 二　前へ押す：与平はすぐ、兵は〇.八秒のうちに歩み出す。放せばすぐ止まる');
  {
    const { 手, 態, 回す, 兵の芯, 我の所, 隔m } = 野を仕立てる('ugoki2', '十人長');
    回す(2);                                                   // 与平が うしろの所 に着くまで
    const 兵0 = 兵の芯(), 我0 = 我の所(), 隊0 = { x: 手.x, y: 手.y }, 写0 = 態.cam.a;
    let 与平の歩み出し = null, 兵の歩み出し = null, t = 0;
    回す(3, 0, -1, false, (i) => {
      t = i / 60;
      if (与平の歩み出し == null && 隔m(我の所(), 我0) > 0.05) 与平の歩み出し = t;
      if (兵の歩み出し == null && 隔m(兵の芯(), 兵0) > 0.14) 兵の歩み出し = t;
    });
    確('前へ押せば、与平は〇.一秒のうちに歩み出す（一人のときと同じく、写しがすぐ動く）', 与平の歩み出し != null && 与平の歩み出し <= 0.1, `${与平の歩み出し}秒`);
    確('兵は〇.八秒のうちに歩み出す（直す前は三秒押しても一歩も出なかった）', 兵の歩み出し != null && 兵の歩み出し <= 0.8, `${兵の歩み出し && 兵の歩み出し.toFixed(2)}秒`);
    const 兵a = 兵の芯(); 回す(1, 0, -1); const 兵b = 兵の芯();
    const 地 = H.terrainAt(手.x, 手.y);
    確('二秒ののちには、兵は毎秒一.四m より速く歩む（平らな野で）', 隔m(兵a, 兵b) > 1.4 && !['forest', 'wood', 'hill', 'mountain', 'marsh', 'ford', 'deep'].includes(地), `毎秒${隔m(兵a, 兵b).toFixed(2)}m・地 ${地}`);
    /* 写しの前（世界の角 写0。盤では x が cos、y が −sin）へまっすぐ進む */
    const 進x = 手.x - 隊0.x, 進y = 手.y - 隊0.y, 進L = Math.hypot(進x, 進y), 前x = Math.cos(写0), 前y = -Math.sin(写0);
    const 横ずれ = Math.abs(進x * 前y - 進y * 前x);
    確('上司の隊に押されて横へ流れない（写しの前へまっすぐ。四秒で横へ一歩より少ない）', 進L > 10 && 横ずれ < 1, `前へ${進L.toFixed(1)}歩・横へ${横ずれ.toFixed(2)}歩`);
    const 兵c = 兵の芯(), 我c = 我の所();
    let 与平の止まり = null;
    回す(2, 0, 0, false, (i) => { if (与平の止まり == null && (態.我.v || 0) < 0.1) 与平の止まり = i / 60; });
    確('放せば、兵は〇.八m のうちに止まる', 隔m(兵c, 兵の芯()) <= 0.8, `${隔m(兵c, 兵の芯()).toFixed(2)}m`);
    確('放せば、与平は〇.五秒のうちに止まる', 与平の止まり != null && 与平の止まり <= 0.5, `${与平の止まり}秒・${隔m(我c, 我の所()).toFixed(2)}m`);
  }

  console.log('\n── 三　右へ押す：一秒のうちに右を向く。写しの向きは押しているあいだ保つ');
  {
    const { 手, 態, 回す } = 野を仕立てる('ugoki3', '十人長');
    回す(2);
    const 写し0 = 態.cam.a, 右 = 角(手.facing + Math.PI / 2);   // 写しが組の向きのとき、右は盤の角で＋九十度
    let 隊の向き = null, 絵の向き = null, 速い = 0, 写しの振れ = 0;
    回す(2.5, 1, 0, false, (i) => {
      const t = i / 60;
      if (隊の向き == null && Math.abs(角(手.facing - 右)) < 10 * Math.PI / 180) 隊の向き = t;
      const v = H.組の見た目(態.組);
      if (絵の向き == null && v && Math.abs(角(v.向 - 右)) < 15 * Math.PI / 180) 絵の向き = t;
      速い = Math.max(速い, 態.我.v || 0); 写しの振れ = Math.max(写しの振れ, Math.abs(角(態.cam.a - 写し0)));
    });
    確('右へ押せば、手勢は一秒のうちに右を向く（直す前は三秒で九度）', 隊の向き != null && 隊の向き <= 1.0, `${隊の向き && 隊の向き.toFixed(2)}秒`);
    確('兵の絵も二秒のうちに右を向く', 絵の向き != null && 絵の向き <= 2.0, `${絵の向き && 絵の向き.toFixed(2)}秒`);
    確('押しているあいだ、写しの向きは保つ（手勢がその場で輪を描かない）', 写しの振れ < 2 * Math.PI / 180, `${(写しの振れ * 180 / Math.PI).toFixed(1)}度`);
    確('与平は駆け足（毎秒四.八m）より速く回り込まない', 速い <= 4.81, `いちばん速くて毎秒${速い.toFixed(2)}m`);
    回す(2);
    確('放せば、写しは手勢の向きへ寄る', Math.abs(角(態.cam.a - (-手.facing))) < 10 * Math.PI / 180, `写しと手勢の向きの差 ${Math.abs(度(角(態.cam.a + 手.facing)))}度`);
  }

  console.log('\n── 四　写しの手前へ押す：前を向いたまま下がる');
  {
    const { 手, 回す } = 野を仕立てる('ugoki4', '十人長');
    回す(2);
    const 向き0 = 手.facing, x0 = 手.x, y0 = 手.y, fx = Math.cos(向き0), fy = Math.sin(向き0);
    let 振り向き = 0;
    回す(2.5, 0, 1, false, (i) => {
      if (i < 60) return;                                     // 一秒ののち（兵が歩み出してから）
      for (const q of 手.squads) { const v = H.組の見た目(q); if (!v) continue; for (let k = 0; k < Math.min(50, Math.round(q.men)); k++) if (v.生[k]) 振り向き = Math.max(振り向き, Math.abs(角(v.描[k] - v.向))); }
    });
    const 下がり = -((手.x - x0) * fx + (手.y - y0) * fy);
    確('写しの手前へ押せば、向きを保つ（下がる）', 手.向きを保つ === true, `下がる押しの閾 ${H.下がる押し}`);
    確('前を向いたまま（三度のうち）', Math.abs(角(手.facing - 向き0)) < 3 * Math.PI / 180, `${Math.abs(度(角(手.facing - 向き0)))}度`);
    確('うしろへ一歩より多く下がる', 下がり > 1, `${(下がり * 尺).toFixed(2)}m`);
    確('下がるあいだ、兵の絵も振り向かない（組の向きから三十度のうち）', 振り向き < 30 * Math.PI / 180, `いちばん振れて${度(振り向き)}度`);
    回す(0.5);
    確('放せば、向きを保つのをやめる', 手.向きを保つ === false);
  }

  console.log('\n── 五　駆ける（全体）：手勢と与平が駆け足になり、与平の気力を使う');
  {
    const { 手, 態, 回す, 兵の芯, 隔m } = 野を仕立てる('ugoki5', '十人長');
    回す(2); 回す(2, 0, -1);                                   // 歩み出してから
    const 歩0 = 兵の芯(); 回す(2, 0, -1); const 歩 = 隔m(歩0, 兵の芯());
    const 気0 = 態.我.気; 回す(0.5, 0, -1, true);
    確('駆けるを押しながら動かせば、手勢は駆け足', 手.駆け足 === true && H.下知の名(手) === '駆けよ');
    const 駆0 = 兵の芯(); 回す(2, 0, -1, true); const 駆 = 隔m(駆0, 兵の芯());
    確('駆け足は歩みのおよそ倍（一.六倍より速い）', 駆 > 歩 * 1.6, `二秒で歩み${歩.toFixed(1)}m・駆け足${駆.toFixed(1)}m`);
    確('駆けるあいだ、与平の気力が減る（一人で駆けるときと同じ）', 態.我.気 < 気0 - 2, `気力 ${気0.toFixed(2)}→${態.我.気.toFixed(2)}`);
    回す(0.5, 0, -1, false);
    確('放せば歩みに戻る', 手.駆け足 === false);
    回す(1, 0, 1, true);
    確('下がるあいだは駆けない', 手.駆け足 === false && 手.向きを保つ === true);
    /* 息が上がれば、気力が 駆け直しの気 まで戻るまでは駆けない（駆け足と歩みを細かく繰り返さない） */
    回す(0.5, 0, -1); 態.我.気 = 0.1;
    let 入り切り = 0, 前 = 手.駆け足, 戻った = null;
    回す(4, 0, -1, true, (i) => { if (手.駆け足 !== 前) { 入り切り++; 前 = 手.駆け足; if (手.駆け足 && 戻った == null) 戻った = { t: i / 60, 気: 態.我.気 }; } });
    確(`息が上がれば、気力が${H.駆け直しの気}まで戻ってから駆け直す（駆け足と歩みを細かく繰り返さない）`,
      戻った != null && 戻った.気 >= H.駆け直しの気 - 0.05 && 入り切り <= 2, 戻った ? `${戻った.t.toFixed(1)}秒ののち気力${戻った.気.toFixed(2)}で駆け直した・入り切り${入り切り}度` : `駆け直さなかった・入り切り${入り切り}度`);
  }

  console.log('\n── 六　率いていない隊は、これまでの盤の刻の向き直り（盤の一秒に一.四）のまま');
  {
    const { b, 手 } = 野を仕立てる('ugoki6', '十人長');
    手.率い刻比 = null; 手.auto = false; 手.order = '移動'; 手.tx = 手.x + 300; 手.ty = 手.y; 手.狙い = null;
    const f0 = 手.facing; H.stepBattle(b, 0.05);
    確('率いていない手勢の向き直りは、盤の一秒に一.四まで', Math.abs(角(手.facing - f0)) <= 1.4 * 0.05 + 1e-6, `${(Math.abs(角(手.facing - f0)) / 0.05).toFixed(2)}/盤の秒`);
  }

  console.log('\n── 七　十人長から三百人長のどれでも、前へ押せば兵が歩み出す');
  for (const 段 of ['三十人長', '五十人長', '百人長', '三百人長']) {
    const { 回す, 兵の芯, 隔m } = 野を仕立てる('ugoki7' + 段, 段);
    回す(2);
    const 兵0 = 兵の芯(); let 出 = null;
    回す(3, 0, -1, false, (i) => { if (出 == null && 隔m(兵の芯(), 兵0) > 0.14) 出 = i / 60; });
    確(`${段}：前へ押せば、兵は一秒のうちに歩み出す`, 出 != null && 出 <= 1.0, `${出 && 出.toFixed(2)}秒`);
  }

  console.log('\n── 八　名札：はじめは畳んで、身分と体力・気力だけ。押せば開き、もう一度押せば畳む');
  {
    const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 8)); }); };
    try { localStorage.removeItem('sengoku:名札'); } catch (_) {}
    H.setBattleMap(null); H.setFieldSeed('ugoki8', 'y'); H.layoutField(7000, 6);
    const W = H.FIELD.w, Hh = H.FIELD.h;
    const P = [0, 1].map((k) => H.makeCorps('P', 将(k, k === 0), 0, 900, 75, 75, W * (0.4 + k * 0.2), Hh * 0.7, -Math.PI / 2, '#2F5D8C'));
    const E = [H.makeCorps('E', 将(10, true), 0, 900, 75, 75, W * 0.5, Hh * 0.3, Math.PI / 2, '#B0483C')];
    for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
    const b = H.createBattle(P, E, 'P'); b.mode = 'field'; b.phase = 'deploy'; b.dusk = 1100; b.face = 'S'; b.myFar = false;
    const 一人 = { 身分: '足軽', 隊id: 'g0', 体力: 80, 武勇: 45, 統率: 20, 一度きり: true, 名: '与平', 風雲: true, 首の勲功: H.首の勲功, 雑兵の端: 0, 段: '十人長', 手勢: 10 };
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(BattleScreen, { ctx: { b, pName: '織田家', eName: '今川家', pColor: '#2F5D8C', eColor: '#B0483C', place: '試しの野', mode: 'field', 一人 }, land: true, onEnd: () => {} })); });
    await flush();
    await act(async () => { window.__降り(1); }); await flush();
    const 札 = () => document.querySelector('.snk-me'), 釦 = () => document.querySelector('.snk-kai');
    const 文 = () => (札() || {}).textContent || '';
    確('背中越しの名札が出る', !!札() && !!釦());
    確('はじめは畳んで、身分と体力・気力だけ（討ち取り・手勢・持ち場の行は出さない）',
      札().classList.contains('snk-tatami') && /十人長/.test(文()) && /体力/.test(文()) && /気力/.test(文()) && !/討ち取り|手勢|持ち場/.test(文()), 文());
    確('畳んだ名札の体力の筋は体力の割合', (() => { const i = 札().querySelector('.snk-mg .tr i'); return !!i && i.style.width === '80%'; })());
    確('畳んだ名札の気力は五つの枡', 札().querySelectorAll('.snk-mg .snk-kiryoku i').length === 5);
    確('名札の釦は「開く」を名乗る（畳んでいる）', 釦().getAttribute('aria-expanded') === 'false' && /開く/.test(釦().getAttribute('aria-label') || ''));
    const 態 = window.__背中の態();
    await act(async () => { 釦().dispatchEvent(new dom.window.PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: 60, clientY: 30 })); });
    確('名札に指を置いても、方向キーは出ない（与平も手勢も動かない）', document.querySelector('.snk-joy').style.display === 'none' && !(態.入.jx || 態.入.jy));
    await act(async () => { 釦().dispatchEvent(new dom.window.PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientX: 60, clientY: 30 })); 釦().dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
    await flush();
    確('押せば開いて、討ち取り・手勢・持ち場が出る', !札().classList.contains('snk-tatami') && /討ち取り/.test(文()) && /手勢 10人を率いる/.test(文()) && 釦().getAttribute('aria-expanded') === 'true', 文().slice(0, 60));
    確('開けたことを端末に覚える', localStorage.getItem('sengoku:名札') === '開');
    /* 持ち場の外にいるとき（hitori/senaka.js 持ち場を見る が書く形）。開いていれば、これまでどおりの知らせ */
    態.持ち場 = { ...(態.持ち場 || {}), 内: false, 間: 9, 咎: 0.3 };
    await act(async () => { 釦().dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }); await flush();
    確('もう一度押せば畳む', 札().classList.contains('snk-tatami') && 釦().getAttribute('aria-expanded') === 'false' && localStorage.getItem('sengoku:名札') === '閉');
    const 外 = document.querySelector('.snk-mochiba.snk-tatami');
    確('畳んでいても、持ち場の外にいればその一行を出す（外へ何m・覚えの咎）', !!外 && /持ち場の外 9m/.test(外.textContent) && /覚え −0\.3/.test(外.textContent), 外 && 外.textContent);
    await act(async () => { 釦().dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }); await flush();
    確('開いていれば、持ち場の知らせは名札の中（畳んだ一行は出さない）', !document.querySelector('.snk-mochiba.snk-tatami') && /持ち場を離れている/.test(文()));
    await act(async () => { root.unmount(); }); await flush();
    /* 開けたまま次の合戦へ：覚えた開け閉めで出る */
    const root2 = createRoot(document.getElementById('r'));
    const b2 = H.createBattle([H.makeCorps('P', 将(0, true), 0, 900, 75, 75, W * 0.5, Hh * 0.7, -Math.PI / 2, '#2F5D8C')], [H.makeCorps('E', 将(10, true), 0, 900, 75, 75, W * 0.5, Hh * 0.3, Math.PI / 2, '#B0483C')], 'P');
    for (const c of b2.corps) { c.formation = '横陣'; H.placeSquads(c, true); }
    b2.mode = 'field'; b2.phase = 'deploy'; b2.dusk = 1100; b2.face = 'S'; b2.myFar = false;
    await act(async () => { root2.render(React.createElement(BattleScreen, { ctx: { b: b2, pName: '織田家', eName: '今川家', pColor: '#2F5D8C', eColor: '#B0483C', place: '試しの野', mode: 'field', 一人: { ...一人 } }, land: true, onEnd: () => {} })); });
    await flush(); await act(async () => { window.__降り(1); }); await flush();
    確('次の合戦では、覚えた開け閉め（開いた名札）で出る', !!札() && !札().classList.contains('snk-tatami'));
    await act(async () => { root2.unmount(); }); await flush();
    try { localStorage.removeItem('sengoku:名札'); } catch (_) {}
  }

  console.log('\n── 九　敵の兵と槍を合わせる：突く（全体）・受ける（全体）。槍を合わせていても、うしろや横へは動ける');
  {
    /* 敵（槍組だけ百人）を上司の隊の九十五歩先に置き、どの隊も待たせて、手勢を前へ押して槍の間合いまで詰める。
       同じ種から仕立て直せば同じ所まで同じに進む（受けるときと受けないときを、同じ所から比べる） */
    const 敵前で = () => {
      種 = 0x51A9;
      const 場 = 野を仕立てる('ugoki9', '十人長', { 敵前: 75, 敵数: 100, 槍: true, 待つ: true });
      const { b, 手, 回す } = 場;
      回す(1);
      let 詰刻 = null, 噛んだ = false;
      for (let i = 1; i <= 20 * 60 && 詰刻 == null; i++) {
        回す(1 / 60, 0, -1);
        if (手.squads.some((q) => q.engaged)) 噛んだ = true;
        if (手.詰まり && 手.詰まり.数 >= 3) 詰刻 = i / 60;
      }
      return { ...場, 敵: b.corps.find((c) => c.side === 'E'), 詰刻, 噛んだ: () => 噛んだ || 手.squads.some((q) => q.engaged) };
    };
    const 兵数 = (c) => c.squads.reduce((a, q) => a + Math.max(0, q.men), 0);
    /* 敵の兵が手勢の兵へ突いた数（敵の兵の状の 手突始 が改まれば一つ）と、手勢の兵が受けた手傷（味方の兵の状の 打 が
       改まれば一つ。受け止めれば 受打 が改まる）を、コマごとに数える */
    const 手傷を数える = (態, 手, 敵) => {
      const 見た = new WeakMap(); let 傷 = 0, 受け = 0, 突き = 0;
      const 見る = () => {
        for (const q of 手.squads) {
          const m = 態.味方.get(q); if (!m) continue;
          for (const st of m.values()) {
            const 前 = 見た.get(st);
            if (前) { if (st.打 !== 前.打) 傷++; if (st.受打 !== 前.受打) 受け++; }
            見た.set(st, { 打: st.打, 受打: st.受打 });
          }
        }
        for (const q of 敵.squads) for (const se of (態.敵.get(q) || new Map()).values()) {
          const 前 = 見た.get(se);
          if (前 && se.手突始 !== 前.手突始) 突き++;
          見た.set(se, { 手突始: se.手突始 });
        }
      };
      return { 見る, 数: () => ({ 傷, 受け, 突き }) };
    };
    const 場 = 敵前で();
    const { 手, 態, 回す, 兵の芯, 隔m, 敵 } = 場;
    確('前へ押せば、手勢の兵が敵の兵と槍の間合い（二.二m）まで詰まる（二十秒のうち）', 場.詰刻 != null, `${場.詰刻 && 場.詰刻.toFixed(1)}秒・詰まった兵 ${手.詰まり ? 手.詰まり.数 : 0}人`);
    /* 詰まってからも前へ押し続ける。手勢はその場に留まって槍を合わせ、敵の兵の列の中へ入り込まない
       （直す前は、敵の隊の角で触れると横へ逸れながら前へ歩み続け、敵の兵の列の中へ入り込んだ） */
    const 芯0 = 兵の芯(); 回す(3, 0, -1); const 芯1 = 兵の芯();
    確('詰まってから三秒前へ押し続けても、手勢は留まって槍を合わせる（兵の芯が一m より多く動かない）', 隔m(芯0, 芯1) < 1, `${隔m(芯0, 芯1).toFixed(2)}m`);
    確('率いているあいだ、手勢の組は盤の組どうしの斬り合いに入らない（足を止められない）', !場.噛んだ());
    /* 突く（全体）を〇.八秒ごとに十秒。与平が自ら討ち取れば知らせが出る（それを数える） */
    let 自ら = 0; const 元の押し = 態.知らせ.push;
    態.知らせ.push = function (o) { if (o && /討ち取|首を取った/.test(o.文 || '')) 自ら++; return 元の押し.call(this, o); };
    const 敵0 = 兵数(敵), 討0 = 態.手勢の討ち || 0, 勲0 = 態.我.勲;
    H.突く(態); 回す(1 / 60);
    const 組み = 態.総突き && 態.総突き.組み ? 態.総突き.組み.length : 0;
    確('突く（全体）を押せば、前に敵の兵がいる手勢の槍の兵がいっせいに突く', 組み >= 3, `突いた兵 ${組み}人`);
    回す(10, 0, 0, false, (i) => { if (i % 48 === 0) H.突く(態); });
    態.知らせ.push = 元の押し;
    const 討 = (態.手勢の討ち || 0) - 討0, 敵減 = 敵0 - 兵数(敵), 勲 = 態.我.勲 - 勲0;
    確('十秒突けば、手勢は敵の兵を二人より多く倒す（盤の敵の組の人数も減る）', 討 > 2 && 敵減 >= 討 + 勲 - 0.01, `手勢の討ち取り ${討}人・敵の兵 ${敵減.toFixed(0)}人減`);
    確('手勢が倒した兵は与平の討ち取り（勲功）に数えない（与平の討ち取りは、与平が自ら討ち取った数だけ）', 勲 === 自ら, `与平の討ち取り ${勲}・自ら討ち取った知らせ ${自ら}`);
    /* 槍を合わせたまま、うしろへ・横へ押す（遊ぶ人の申し出：「部隊が敵と戦うよう指示したら基本的に動けなくなってしまいます」） */
    const 前x = Math.cos(態.cam.a), 前y = -Math.sin(態.cam.a);   // 写しの前（盤の向き）
    const x0 = 手.x, y0 = 手.y; 回す(3, 0, 1);
    const 下 = -((手.x - x0) * 前x + (手.y - y0) * 前y) * 尺;
    確('槍を合わせていても、うしろへ押せば下がる（三秒で一.五m より多く）', 下 > 1.5, `${下.toFixed(1)}m 下がった`);
    回す(0.5, 0, -1); 回す(3, 0, -1);
    const x1 = 手.x, y1 = 手.y; 回す(3, 1, 0);
    const 横 = ((手.x - x1) * -前y + (手.y - y1) * 前x) * 尺;
    確('槍を合わせていても、横へ押せば横へ動く（三秒で二m より多く）', 横 > 2, `右へ ${横.toFixed(1)}m`);
    /* 受ける（全体）：同じ所から、十秒受けるのと、十秒何もしないのとを比べる */
    const 比べる = (受) => {
      const 場2 = 敵前で(), 数え = 手傷を数える(場2.態, 場2.手, 場2.敵), 討たれ0 = 場2.態.手勢の討たれ || 0, 人0 = 兵数(場2.手);
      if (受) H.受ける(場2.態, true);
      場2.回す(20, 0, 0, false, () => 数え.見る());
      if (受) H.受ける(場2.態, false);
      return { ...数え.数(), 討たれ: (場2.態.手勢の討たれ || 0) - 討たれ0, 減: 人0 - 兵数(場2.手) };
    };
    const 無 = 比べる(false), 受 = 比べる(true);
    const 割 = (o) => (o.突き ? o.傷 / o.突き : 0);
    確('受ける（全体）を押しているあいだ、敵の突きが当たる割合は受けないときの六割より低い', 無.突き >= 10 && 受.突き >= 10 && 割(受) < 割(無) * 0.6,
      `二十秒 受けない：突かれ ${無.突き}・当たり ${無.傷}（倒れた ${無.討たれ}人）／受ける：突かれ ${受.突き}・当たり ${受.傷}（倒れた ${受.討たれ}人・受け止めた ${受.受け}）`);
    確('受けずに二十秒槍を合わせていても、十人の手勢が討ち尽くされない（敵の兵ひとりずつが前の相手に突く）', 無.討たれ < 10, `倒れた ${無.討たれ}人`);
    確('手勢の兵が減るのは、槍を合わせて倒れた兵だけ（盤の斬り合いの損は付かない）', Math.abs(無.減 - 無.討たれ) < 0.01 && Math.abs(受.減 - 受.討たれ) < 0.01,
      `減った ${無.減}・${受.減}人`);
  }

  console.log('\n── 十　盤の視点（背中越しで率いていないとき）：上司の隊が動けば、手勢はついて動く');
  for (const 段 of ['十人長', '百人長']) {
    種 = 0x2C07;
    H.setBattleMap(null); H.setFieldSeed('fuun', 'tezei'); H.layoutField(7000, 6);
    const W = H.FIELD.w, Hh = H.FIELD.h;
    const P = [H.makeCorps('P', 将(0, true), 0, 1200, 75, 75, W * 0.5, Hh * 0.7, -Math.PI / 2, '#2F5D8C')];
    const E = [H.makeCorps('E', 将(10, true), 0, 900, 75, 75, W * 0.5, Hh * 0.15, Math.PI / 2, '#B0483C')];
    for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
    const b = H.createBattle(P, E, 'P'); b.mode = 'field'; b.phase = 'fight'; b.dusk = 99999;
    const 手 = H.手勢を組む(b, 'g0', { 手勢: H.手勢の数[段], 名: '与平', 武勇: 45, 統率: 20 });
    const 親 = b.corps.find((c) => c.id === 'g0');
    for (const c of b.corps) { c.auto = false; c.order = '待機'; c.tx = c.x; c.ty = c.y; }
    const 刻む = (秒, 毎) => { for (let k = 0; k < Math.round(秒 / 0.05); k++) { H.stepBattle(b, 0.05); if (毎) 毎(); } };
    const x0 = 手.x; let 付いた = false;
    親.order = '移動'; 親.tx = 親.x - 400; 親.ty = 親.y;
    刻む(8, () => { if (H.下知の名(手) === '上司の隊に付く') 付いた = true; });
    確(`${段}：上司の隊が西へ動けば、手勢もついて西へ動く（「上司の隊に付く」）`, 付いた && x0 - 手.x > 150, `西へ ${(x0 - 手.x).toFixed(0)}歩・上司の隊は ${(x0 - 親.x).toFixed(0)}歩`);
    /* 北には深い川がある。上司の隊は橋を渡る。手勢も上司の隊が来た道を辿って渡る */
    let 淵に入った = false;
    親.order = '移動'; 親.tx = 親.x; 親.ty = 親.y - 400;
    刻む(8, () => { if (H.terrainAt(手.x, 手.y) === 'deep') 淵に入った = true; });
    刻む(6);
    const 隔 = Math.hypot(手.x - 親.x, 手.y - 親.y);
    確(`${段}：上司の隊が川を渡れば、手勢も渡ってついて来る（止まって六秒ののち、上司の隊から三十歩のうち）`, 隔 < 30 && !淵に入った && 手.y < 親.y + 30, `上司の隊まで ${隔.toFixed(0)}歩`);
    const 向 = 親.陣向き != null ? 親.陣向き : 親.facing;
    確(`${段}：上司の隊が止まれば、手勢も止まり、上司の隊の向きへ向き直る（二十度のうち）`, H.下知の名(手) === '待て' && Math.abs(角(手.facing - 向)) < 20 * Math.PI / 180, `差 ${Math.abs(度(角(手.facing - 向)))}度`);
  }

  console.log('\n── 十一　盤に手勢の旗・名・体力の筋を描かない（上司の隊の印は描く）');
  {
    const { b, 手 } = 野を仕立てる('ugoki11', '十人長');
    const 字 = [];
    const 録 = new Proxy({ canvas: { width: 960, height: 540 } }, { get: (t, p) => {
      if (p in t) return t[p];
      if (p === 'fillText') return (s) => 字.push(String(s));
      if (p === 'measureText') return (s) => ({ width: String(s).length * 10 });
      if (p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createPattern') return 鈍;
      if (p === 'getImageData' || p === 'createImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4), width: w, height: h });
      if (p === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      return () => {};
    }, set: (t, p, v) => { t[p] = v; return true; } });
    const 描く = () => { 字.length = 0; H.drawBattle(録, b, null, null, { x: 手.x, y: 手.y, s: 1.2 }, 960, 540, 1, false, null, null, null, null); return 字.slice(); };
    const 描いた = 描く();
    確('盤に手勢の名（与平の手勢）を描かない。上司の隊の名は描く', !描いた.some((s) => /与平/.test(s)) && 描いた.includes('将0'), 描いた.join('・'));
    const 元 = 手.手勢; delete 手.手勢; const 対照 = 描く(); 手.手勢 = 元;
    確('（対照）手勢の印を外せば、名を描く（描き方の試しが効いている）', 対照.includes('与平の手勢'));
  }

  console.log('\n── 十二　率いているあいだは、方向キーを放せば留まる（上司の隊が動いても付いて歩まない）。率いるのをやめれば付く');
  {
    const { b, 手, 態, 回す } = 野を仕立てる('ugoki12', '十人長', { 待つ: true });
    回す(1);
    const 親 = b.corps.find((c) => c.id === 手.parentId);
    const x0 = 手.x, y0 = 手.y;
    const 親x0 = 親.x;
    親.order = '移動'; 親.tx = 親.x - 300; 親.ty = 親.y;
    回す(8, 0, 0, false, () => { H.突く(態); });
    確('率いているあいだ、方向キーを放していれば、上司の隊が動いても手勢はその場に留まる（突くを押していても）',
      親x0 - 親.x > H.付き従いの隔 + 1 && Math.hypot(手.x - x0, 手.y - y0) * 尺 < 1 && H.下知の名(手) === '待て',
      `手勢は ${(Math.hypot(手.x - x0, 手.y - y0) * 尺).toFixed(2)}m 動いた・上司の隊は西へ ${((親x0 - 親.x) * 尺).toFixed(1)}m 動いた`);
    /* 盤の視点へ昇る（背中を描かずに盤だけを進める）。率いの刻比が外れ、手勢は上司の隊の元の座へ戻って付く */
    const x1 = 手.x; let 付いた = false;
    for (let k = 0; k < 200; k++) { H.stepBattle(b, 0.05); if (H.下知の名(手) === '上司の隊に付く') 付いた = true; }
    const d1 = Math.hypot(手.x - 親.x, 手.y - 親.y);
    確('率いるのをやめれば（盤の視点）、手勢は上司の隊に付いて歩む', 付いた && x1 - 手.x > 200 && d1 < 40, `手勢は西へ ${(x1 - 手.x).toFixed(0)}歩・上司の隊まで ${d1.toFixed(0)}歩`);
  }

  const 拾う = errs.filter((e) => !/act\(|not wrapped|ReactDOMTestUtils/.test(e));
  if (拾う.length) console.log('\n咎めの書き出し:', 拾う.slice(0, 3));
  console.log(咎.length ? `\n★ ${咎.length}件の咎：${咎.join('／')}` : '\n確かめ：みな通った');
  console.log(`エラー: ${拾う.length ? 拾う.length + '件' : 'なし'}`);
  process.exit(咎.length || 拾う.length ? 1 : 0);
})().catch((e) => { console.log('★ 試しが途中で止まった', e && e.stack); process.exit(1); });
