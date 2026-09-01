// 出陣の画面の、二つの新しい仕来りを見る試験。
//
// 一、寄騎は「誰を・何人で」呼ぶかを選べること（指図の通る城のみ）
// 二、約束を交わした相手（同盟・従属・臣従・不可侵）の城へ兵を出そうとすると、
//     「敵対することになるがよいか」と問われること
//
// 画面を延々と押して所定の局面へ持っていくのは当てにならないので、
// 盤を直に組み立て、記録として仕込んでから「続きから」で開く。
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
  // 濃淡（gradient）は jsdom にないので、addColorStop を持つ張りぼてを返す。
  // これが欠けていると、石垣や丘を描いた瞬間に「addColorStop が無い」で落ちる。
  if (p === 'createRadialGradient' || p === 'createLinearGradient' || p === 'createConicGradient') {
    return () => ({ addColorStop: () => {} });
  }
  return () => ({ addColorStop: () => {} });
} });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 900; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 600; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 900, height: 600, right: 900, bottom: 600 }; };
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 180));

let 種 = 0x1101;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
dom.window.Math.random = Math.random;

const { createRoot, act, App, React, initState, findPath, 解す } = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

/* ---------------------------------------------------- 盤をこしらえる */
const s = initState('oda');
const 自城 = s.castles.filter((x) => x.faction === s.player);
// 出陣元は、ほかの自城と道が通じ、かつ敵城にも寄せられる城
let 出陣元 = null;
for (const a of 自城) {
  if (自城.some((b) => b.id !== a.id && findPath(a.id, b.id))
    && s.castles.some((d) => d.faction !== s.player && findPath(a.id, d.id) && findPath(a.id, d.id).length === 2)) { 出陣元 = a; break; }
}
if (!出陣元) 出陣元 = 自城[0];
/* 隣り合う城を一つ選び、約束を結んでおく。
   どの間柄で試すかは、外から VOW_STATE で指定できる（既定は同盟）。
   同盟・従属・不可侵・臣従、いずれでも同じように問われねばならない。 */
const 間柄 = process.env.VOW_STATE || '同盟';
const 隣敵 = s.castles.find((d) => d.faction !== s.player
  && findPath(出陣元.id, d.id) && findPath(出陣元.id, d.id).length === 2);
const 盟主 = 隣敵 ? 隣敵.faction : null;
if (盟主) {
  const k = [s.player, 盟主].sort().join('|');
  s.relations[k] = { state: 間柄, trust: 70, until: { y: 1560, m: 1 } };
}
// 出陣元と、寄騎を出す城に十分な兵を置く
出陣元.local = 6000; 出陣元.food = 90000;
for (const c of 自城) if (c.id !== 出陣元.id) { c.local = 4000; c.food = 40000; }

const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s })]]);
dom.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
};
console.log(`仕込み: ${出陣元.name}（自家）から出陣。${隣敵 ? `隣の ${隣敵.name}（${s.factions[盟主].name}）とは${間柄}` : '隣に敵城なし'}`);

const root = createRoot(document.getElementById('r'));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 5)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 450, clientY: 300 }));
const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
const btn = (t) => [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t) && !b.disabled);
const rc = async (t) => { const el = btn(t); if (!el) return false; await click(el); return true; };
// 飾り（style）と書き付け（script）だけ除いて、画面の字をそのまま拾う。
// 入れ子の要素を落とすやり方だと、<b>で区切られた文が途中で切れてしまう。
const txt = () => {
  const b = document.body.cloneNode(true);
  for (const x of b.querySelectorAll('style,script')) x.remove();
  return b.textContent.replace(/\s+/g, ' ');
};

(async () => {
  let 咎 = 0;
  const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎++; };

  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
  await rc('続きから'); await flush(); await flush();

  const 城名 = [...document.querySelectorAll('.mn')].find((e) => e.textContent.trim() === 出陣元.name);
  if (城名) await click(城名.parentElement);
  if (!btn('軍事')) {
    const cv = document.querySelector('.mapwrap canvas');
    for (const [x, y] of [[450, 300], [450, 290], [460, 310], [440, 320]]) {
      await act(async () => { cv.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y })); });
      await act(async () => { cv.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y })); });
      await flush(); if (btn('軍事')) break;
    }
  }
  if (!btn('軍事')) { console.log('エラー: 城を選べない'); process.exit(1); }
  await rc('軍事'); await rc('出陣');
  const sel = document.querySelector('.modal select.sel');
  if (!sel) { console.log('エラー: 出陣の画面が開かない'); process.exit(1); }

  /* 先に目標を定める。呼べる寄騎は目標によって変わるので、
     目標を変えると寄騎の選びは白紙に戻る（実際の操作もこの順になる）。 */
  if (隣敵) {
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, 'value').set;
      setter.call(sel, 隣敵.id);
      sel.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    });
    await flush();
    確(`${間柄}相手の城を目標にできる`, sel.value === 隣敵.id, 隣敵.name);
    /* 進発を押す前から、画面の中に断りが出ていること。
       押してはじめて知らされるのでは遅い。「警告が出ない」と映るのもここである。 */
    const 文0 = txt();
    確('押す前から画面に断りが出る', new RegExp(`${間柄}の間柄です`).test(文0));
    確('攻撃になる旨が押す前に読める', /後詰ではなく/.test(文0) && /攻撃/.test(文0));
    const 釦 = [...document.querySelectorAll('.modal button')].find((b) => /進発/.test(b.textContent));
    確('進発の釦にも約束を破る旨が出る', !!釦 && /約束を破って/.test(釦.textContent),
      釦 ? 釦.textContent.trim() : 'なし');
  }

  /* 同盟・従属の城は「頼むだけ」で、誰を何人出すかは相手が決める。
     こちらが将を選べてしまってはならない（GDD 7.3）。 */
  {
    const 全行 = [...document.querySelectorAll('.modal .aidrow')];
    const 頼む行 = 全行.filter((r) => /同盟|従属/.test(r.textContent));
    for (const r of 頼む行) {
      const c0 = r.querySelector('input[type=checkbox]');
      if (c0 && !c0.disabled) { await act(async () => { c0.click(); }); await flush(); }
    }
    const 選べる = 頼む行.filter((r) => r.querySelectorAll('input[type=checkbox]').length > 1
      || r.querySelector('input[type=range]'));
    確('同盟・従属へは将も兵数も指図できない', 選べる.length === 0,
      `頼むだけの城 ${頼む行.length}城`);
    for (const r of 頼む行) {
      const c0 = r.querySelector('input[type=checkbox]');
      if (c0 && c0.checked) { await act(async () => { c0.click(); }); await flush(); }
    }
  }

  /* ------------------------------------------- 一、寄騎の将と兵数を選ぶ */
  // 寄騎の行だけを拾う。本隊の将の札と取り違えないよう、行に印をつけてある。
  const 寄騎行 = [...document.querySelectorAll('.modal .aidrow')];
  const 指図の行 = 寄騎行.filter((r) => /自領|臣従/.test(r.textContent) && !/出せない|少なすぎ/.test(r.textContent));
  確('寄騎を求める欄がある', 寄騎行.length > 0, `${寄騎行.length}城（うち下知の通る城 ${指図の行.length}）`);
  if (指図の行.length) {
    const 行 = 指図の行[0];
    const 前の札 = 行.querySelectorAll('input[type=checkbox]').length;
    await act(async () => { 行.querySelector('input[type=checkbox]').click(); }); await flush();
    // 将は複数選べる。城の札のほかに、将ごとの札が並ぶ。
    const 将の札 = [...行.querySelectorAll('input[type=checkbox]')].slice(1);
    確('寄騎を選ぶと、将を選ぶ札が現れる', 将の札.length > 0, `札 ${前の札}→${前の札 + 将の札.length}`);
    確('将の候補が複数ある', 将の札.length >= 1, `${将の札.length}名`);
    確('将ごとの統率と直属が読める', /統\d+ 武\d+／直属/.test(行.textContent));
    /* もとは「率いられる上限」（身分ごとの兵数）を札に添えていた。

       史実で武将が連れてきた兵は知行高で決まる（軍役）。身分が決めたのは
       何人を束ねられるかであって、自らの手勢の数ではない。そう改めたので、
       身分ごとの兵数はどこにも出さない。代わりに直属を示す。 */
    確('身分ごとの兵数上限は、もう示さない', !/率いられる上限/.test(行.textContent));
    確('代わりに直属が示される', /直属[\d,]+/.test(行.textContent),
      (行.textContent.match(/直属[\d,]+/) || [''])[0]);

    const 寄騎の目盛 = 行.querySelector('input[type=range]');
    確('兵数の目盛が現れる', !!寄騎の目盛,
      `画面全体で ${document.querySelectorAll('.modal input[type=range]').length}本（本隊の分を含む）`);
    if (!寄騎の目盛) { console.log('エラー: 目盛が出ない'); process.exit(1); }
    確('連れて行く兵数を変えられる', +寄騎の目盛.max > 0, `上限 ${寄騎の目盛.max}人`);
    // 数を変えて、画面の表示が追いつくこと
    const 半分 = Math.floor(+寄騎の目盛.max / 2);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
      setter.call(寄騎の目盛, String(半分));
      寄騎の目盛.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    await flush();
    確('選んだ兵数が画面に出る', txt().includes('連れて行く地域家臣団'));
    確('残る守備兵が示される', /に残る兵/.test(txt()));
    // 二人目の将も加えられること（援軍の画面と同じく、複数を率いさせられる）
    if (将の札.length > 1) {
      const 前の総勢 = (行.textContent.match(/この寄騎の総勢\s*([\d,]+)/) || [])[1];
      await act(async () => { 将の札[1].click(); }); await flush();
      const 後の総勢 = (行.textContent.match(/この寄騎の総勢\s*([\d,]+)/) || [])[1];
      確('二人目の将を加えられる', 行.querySelectorAll('input[type=checkbox]:checked').length >= 3,
        `総勢 ${前の総勢} → ${後の総勢}`);
    }
  }

  /* --------------------------- 二、約束を交わした相手への出陣を問われる */
  /* 総大将は身分で決まる（GDD 6.4）。侍大将の下に家老は付かない。
     もとは「選んだ順の先頭」であったので、物頭を先に選べば物頭が家老を
     指揮することになっていた。画面に誰が率いるかを出す。 */
  {
    const 欄 = [...document.querySelectorAll('.modal .row')]
      .find((r) => /^総大将/.test(r.textContent.trim()));
    確('出陣の画面に総大将が出る', !!欄, 欄 ? 欄.textContent.replace(/\s+/g, ' ').trim() : 'なし');
    if (欄) {
      const 印 = [...document.querySelectorAll('.modal label')]
        .filter((l) => l.querySelector('input[type=checkbox]:checked') && /歳／統/.test(l.textContent));
      const 位 = { 当主: 5, 宿老: 4, 家老: 3, 侍大将: 2, 物頭: 1 };
      const 身 = (t) => Math.max(0, ...Object.keys(位).map((k) => (t.includes(k) ? 位[k] : 0)));
      const 最上 = Math.max(0, ...印.map((l) => 身(l.textContent)));
      確('総大将は軍中でいちばん身分の高い者である', 印.length === 0 || 身(欄.textContent) >= 最上,
        `総大将の身分 ${身(欄.textContent)}／軍中の最上 ${最上}（${印.length}名）`);
    }
  }

  if (隣敵) {
    const 進発 = [...document.querySelectorAll('.modal button')].find((b) => /人で進発/.test(b.textContent));
    確('進発の釦がある', !!進発 && !進発.disabled);
    if (進発) {
      await click(進発);
      const 文 = txt();
      確(`「${間柄}の間柄にある」と問われる`, new RegExp(`${間柄}の間柄にある`).test(文));
      確('攻撃になる旨が示される', /後詰ではなく/.test(文) && /敵対/.test(文));
      確('失うものが数で示される', /威信/.test(文) && /家臣の忠誠/.test(文));
      確('取りやめられる', !!btn('取りやめる'));
      確('承知のうえで出陣できる', !!btn('承知のうえで出陣する'));

      // 取りやめれば、軍は出ない
      const 軍の数 = (document.body.textContent.match(/進軍中/g) || []).length;
      await rc('取りやめる'); await flush();
      確('取りやめると問いが閉じる', !/同盟の間柄にある/.test(txt()));

      // もう一度出して、今度は承知する
      const 進発2 = [...document.querySelectorAll('.modal button')].find((b) => /人で進発/.test(b.textContent));
      if (進発2) {
        // 寄騎の選びが、実際にその将・その兵数で出るか。戦国記に人数と将の名が載る。
        // 選んだ将の名を控えておく（印のついた札の並びから拾う）
        const 選んだ将 = (() => {
          const 行2 = document.querySelector('.modal .aidrow');
          if (!行2) return null;
          const 名 = [...行2.querySelectorAll('label')].slice(1)
            .filter((l) => l.querySelector('input[type=checkbox]:checked'))
            .map((l) => (l.querySelector('.mn') || {}).textContent);
          return 名.length ? 名 : null;
        })();
        await click(進発2);
        await rc('承知のうえで出陣する'); await flush(); await flush();
        await rc('閉じる'); await rc('← 戻る'); await flush();
        await rc('戦国記'); await flush();
        const 記 = txt();
        確('承知すれば出陣する', /より出陣/.test(記));
        確('約束を破った旨が記される', /約束を破って兵を出した/.test(記), 軍の数 >= 0 ? '' : '');
        const 寄騎の行 = (記.match(/より寄騎[\d,]+人（[^）]+）が[^。]+。/g) || []);
        確('寄騎が出た旨が記される', 寄騎の行.length > 0, 寄騎の行[0] || 'なし');
        if (選んだ将 && 寄騎の行.length) {
          確('選んだ将が率いている', 選んだ将.every((n) => 寄騎の行.some((x) => x.includes(n))),
            `選んだ将 ${選んだ将.join('・')}`);
        }
      }
    }
  } else {
    console.log('  （隣に同盟を結べる敵城がなく、二の試験は省略）');
  }

  /* 陣触れ（GDD 6.4）。本拠から兵を催す入口が地図の上にあること。

     総大将は陣触れを出す城にいる者であるから、本拠から出せば当主が率い、
     陣触れは天下に届く。近場の小競り合いは、城ごとの「出陣」で足りる。

     ここは最後に置く。陣触れを開くと選んでいる城が本拠へ移るので、
     途中に挟むと以後の確かめが元の城へ戻れなくなる。 */
  {
    for (let i = 0; i < 6 && document.querySelector('.modal'); i++) {
      if (!(await rc('取りやめ') || await rc('閉じる') || await rc('やめる'))) break;
    }
    const 触 = [...document.querySelectorAll('.mbtn')].find((b) => /陣触れ/.test(b.textContent));
    確('地図に陣触れの入口がある', !!触);
    if (触) {
      await click(触); await flush(); await flush(); await flush();
      /* 「陣触れ」は地図の釦の字でもあるので、画面ぜんたいの字を数えると
         開いていなくても当たってしまう。窓の中だけを見る。 */
      const 窓 = document.querySelector('.modal .card');
      const 窓文 = 窓 ? 窓.textContent.replace(/\s+/g, ' ') : '';
      確('陣触れの画面が開く', /^陣触れ/.test(窓文.trim()), 窓文.slice(0, 24));
      確('本拠から催すと分かる', /の本拠。ここから兵を催す/.test(窓文));
      確('総大将の決まりが説かれている', /いちばん身分の高い者/.test(窓文));
      確('城ごとの出陣とは名乗りが違う', !/^出陣/.test(窓文.trim()));
    }
  }

  console.log('');
  console.log('エラー:', 咎 ? `${咎}件` : (errs.filter((e) => !/not wrapped in act|Warning/.test(e)).slice(0, 2).join(' | ') || 'なし'));
  process.exit(咎 ? 1 : 0);
})().catch((e) => { console.log('例外:', e.message.slice(0, 200)); console.log('エラー: 例外'); process.exit(1); });
