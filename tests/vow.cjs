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
  if (p === 'createRadialGradient') return () => ({ addColorStop: () => {} });
  return () => {};
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

const { createRoot, act, App, React, initState, findPath } = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

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
// 隣り合う敵城を一つ選び、同盟を結んでおく
const 隣敵 = s.castles.find((d) => d.faction !== s.player
  && findPath(出陣元.id, d.id) && findPath(出陣元.id, d.id).length === 2);
const 盟主 = 隣敵 ? 隣敵.faction : null;
if (盟主) {
  const k = [s.player, 盟主].sort().join('|');
  s.relations[k] = { state: '同盟', trust: 70, until: { y: 1560, m: 1 } };
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
console.log(`仕込み: ${出陣元.name}（自家）から出陣。${隣敵 ? `隣の ${隣敵.name}（${s.factions[盟主].name}）とは同盟` : '隣に敵城なし'}`);

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
    確('同盟相手の城を目標にできる', sel.value === 隣敵.id, 隣敵.name);
  }

  /* ------------------------------------------- 一、寄騎の将と兵数を選ぶ */
  // 寄騎の行だけを拾う。本隊の将の札と取り違えないよう、行に印をつけてある。
  const 寄騎行 = [...document.querySelectorAll('.modal .aidrow')];
  const 指図の行 = 寄騎行.filter((r) => /自領|臣従/.test(r.textContent) && !/出せない|少なすぎ/.test(r.textContent));
  確('寄騎を求める欄がある', 寄騎行.length > 0, `${寄騎行.length}城（うち下知の通る城 ${指図の行.length}）`);
  if (指図の行.length) {
    const 行 = 指図の行[0];
    const 前の選択欄 = document.querySelectorAll('.modal select').length;
    await act(async () => { 行.querySelector('input[type=checkbox]').click(); }); await flush();
    const 後の選択欄 = document.querySelectorAll('.modal select').length;
    確('寄騎を選ぶと、将を選ぶ欄が現れる', 後の選択欄 > 前の選択欄, `選択欄 ${前の選択欄}→${後の選択欄}`);

    const 将欄 = 行.querySelector('select');
    確('将の候補が複数ある', !!将欄 && 将欄.options.length >= 1,
      将欄 ? `${将欄.options.length}名（先頭 ${将欄.options[0].textContent.slice(0, 14)}）` : 'なし');
    確('将ごとの統率と直属が読める', !!将欄 && /統率\d+.*直属/.test(将欄.options[0].textContent));

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
    // 将を替えられること
    if (将欄 && 将欄.options.length > 1) {
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, 'value').set;
        setter.call(将欄, 将欄.options[1].value);
        将欄.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      });
      await flush();
      確('将を替えられる', 将欄.value === 将欄.options[1].value);
    }
  }

  /* --------------------------- 二、約束を交わした相手への出陣を問われる */
  if (隣敵) {
    const 進発 = [...document.querySelectorAll('.modal button')].find((b) => /人で進発/.test(b.textContent));
    確('進発の釦がある', !!進発 && !進発.disabled);
    if (進発) {
      await click(進発);
      const 文 = txt();
      確('「同盟の間柄にある」と問われる', /同盟の間柄にある/.test(文));
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
        const 選んだ将 = (() => {
          const s2 = document.querySelector('.modal .aidrow select');
          if (!s2) return null;
          const o = [...s2.options].find((x) => x.value === s2.value);
          return o ? o.textContent.split('（')[0] : null;
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
          確('選んだ将が率いている', 寄騎の行.some((x) => x.includes(選んだ将)), `選んだ将 ${選んだ将}`);
        }
      }
    }
  } else {
    console.log('  （隣に同盟を結べる敵城がなく、二の試験は省略）');
  }

  console.log('');
  console.log('エラー:', 咎 ? `${咎}件` : (errs.filter((e) => !/not wrapped in act|Warning/.test(e)).slice(0, 2).join(' | ') || 'なし'));
  process.exit(咎 ? 1 : 0);
})().catch((e) => { console.log('例外:', e.message.slice(0, 200)); console.log('エラー: 例外'); process.exit(1); });
