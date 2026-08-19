/* 海戦の画面が、実際に描けること（GDD 10章）。

   別所で洲本を攻めたら白い画面になって進まなくなった、との報せ。
   原因は一行、ctx.eName と書くべきところを eName と書いていたことである。
   描画の最中に例外が飛び、React が画面ごと落とす。白い画面はそれである。

   模型（sea.js・naval.js）は試験で叩いていたが、画面そのものは一度も
   描いていなかった。だから通ってしまった。ここでは実際に画面を組み立て、
   布陣から決着まで通す。以後、この手の書き損じは画面の側で捕まる。 */
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
  // 知らぬ命には、addColorStop を持つ張りぼてを返す。濃淡でも模様でも受け流せる。
  if (p === 'createRadialGradient' || p === 'createLinearGradient' || p === 'createConicGradient') {
    return () => ({ addColorStop: () => {} });
  }
  return () => ({ addColorStop: () => {} });
} });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 1000; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 620; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 1000, height: 620, right: 1000, bottom: 620 }; };
/* 描画の最中の例外は React が飲み込んで console.error に出す。
   白い画面はそれで起きる。ここで拾って咎める。 */
const errs = [];
console.error = (...a) => errs.push(String(a[0]).slice(0, 400));

const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, React } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

(async () => {
  const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 8)); }); };
  const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 500, clientY: 310 }));
  const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
  const btn = (t) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(t) && !b.disabled);

  /* 別所で三木から洲本（三好）へ渡る。遊ぶ側が報せてきたそのままの局面。 */
  const s = H.initState('bessho');
  const 将 = s.generals.filter((g) => g.faction === 'bessho' && !g.captive).slice(0, 2);
  const army = { id: 'a1', faction: 'bessho', men: 3000, local: 3000,
    gens: 将.map((g) => g.id), path: ['miki', 'sumoto'], target: 'sumoto' };
  const inter = H.seaInterception(s, army, '海路');
  確('別所が洲本へ渡れば、三好の水軍に阻まれる', !!inter && inter.by === 'miyoshi',
    inter ? `別所${inter.mine.艘}艘（軍船${inter.mine.軍船}） 対 三好${inter.foe.艘}艘（軍船${inter.foe.軍船}）` : 'なし');
  if (!inter) { console.log('エラー: 迎え撃ちが起きず、画面を試せない'); process.exit(1); }

  const ctx = H.海戦を仕立てる(s, army, inter, '三木〜洲本',
    '#2F5D8C', '#B0483C', '別所家', '三好家');
  const root = createRoot(document.getElementById('r'));
  let 終 = null;
  await act(async () => {
    root.render(React.createElement(H.SeaScreen, { ctx, land: true, onEnd: (bb) => { 終 = bb; } }));
  });
  await flush();

  確('画面が描ける（例外で落ちない）', errs.length === 0, errs[0] || '');
  const 文 = document.body.textContent;
  確('布陣の口上が出る', /渡海を阻まれ/.test(文), 文.replace(/\s+/g, ' ').slice(0, 70));
  確('船立ての中身が読める', /軍船/.test(文) && /徴した小舟/.test(文),
    (文.match(/こちらの船立て[^風]*/) || [''])[0].replace(/\s+/g, ' ').slice(0, 70));
  確('相手の船立ても出る', /三好家の船立て/.test(文));

  // 船戦を始めて、しばらく進める
  const 始 = btn('船戦を始める');
  確('「船戦を始める」が押せる', !!始);
  if (始) await click(始);
  確('戦の最中も描ける', errs.length === 0, errs[0] || '');
  確('速さの札が出る', /停止/.test(document.body.textContent) && /通常/.test(document.body.textContent));

  // 何コマか進める（requestAnimationFrame を手で回す）
  for (let i = 0; i < 40; i++) {
    const cbs = [...rafMap.values()]; rafMap.clear();
    await act(async () => { for (const cb of cbs) cb(1000 + i * 260); });
  }
  確('コマを進めても描ける', errs.length === 0, errs[0] || '');

  // 委ねて決着させる
  const 委 = btn('委ねて結果を見る');
  確('「委ねて結果を見る」が押せる', !!委);
  if (委) await click(委);
  await flush();
  確('委ねれば決着する', ctx.b.phase === 'over',
    `${ctx.b.result}／${ctx.b.t | 0}秒`);
  確('決着しても日没引き分けにならない（動かぬまま終わらない）',
    ctx.b.result !== '日没' || ctx.b.t >= ctx.b.dusk - 1, ctx.b.result);
  const 文2 = document.body.textContent;
  確('決着の帳が出る', /勝ち鬨|敗れた|日暮れ/.test(文2),
    (文2.match(/勝ち鬨|敗れた|日暮れ[^。]*/) || [''])[0]);
  確('小舟ばかりの別所は、三好の軍船に阻まれる', ctx.b.result !== 'P',
    `${ctx.b.result}（別所は軍船${inter.mine.軍船}艘・小舟${inter.mine.徴船}艘）`);

  const 戻 = btn('陣へ戻る');
  確('「陣へ戻る」が押せる', !!戻);
  if (戻) await click(戻);
  確('戻ると始末が呼ばれる', !!終);
  確('最後まで例外が出ない', errs.length === 0, errs.slice(0, 2).join(' | '));

  console.log('');
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 6).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
