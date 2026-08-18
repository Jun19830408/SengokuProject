// 武将の値の見え方を見る試験（齢が並ぶこと、忠誠に小数が出ないこと）。
//
// 齢は前から盤の上にはあった（寿命・元服・子の誕生に使っている）。
// ただし画面に出ていたのは家督を継ぐ者を選ぶときと、滅んだ家の始末のときだけで、
// 武将一覧にも、城の武将の欄にも、出陣の将選びにも出ていなかった。
// 誰がいつまで働けるかは、統率や武勇と並ぶ基本の値である。
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
dom.window.storage = { get: async () => null, set: async (k, v) => ({ key: k, value: v }), delete: async () => ({}) };
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 180));
const { createRoot, act, App, React, initState, advanceMonth, 忠誠 } = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* ------------------------------- まず、盤の上に齢が揃っているかを確かめる */
{
  const s = initState('oda');
  const 無し = s.generals.filter((x) => x.age == null);
  const 齢 = s.generals.map((x) => x.age).filter((x) => x != null);
  確('すべての武将が齢を持つ', 無し.length === 0,
    `${s.generals.length}名／齢の幅 ${Math.min(...齢)}〜${Math.max(...齢)}歳`);
}

const root = createRoot(document.getElementById('r'));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 5)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 450, clientY: 300 }));
const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
const btn = (t) => [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t) && !b.disabled);
const rc = async (t) => { const el = btn(t); if (!el) return false; await click(el); return true; };
const txt = () => {
  const b = document.body.cloneNode(true);
  for (const x of b.querySelectorAll('style,script')) x.remove();
  return b.textContent.replace(/\s+/g, ' ');
};
// 「◯◯歳」が、武将の値の並びのそばに出ているか
const 齢が出るか = (範囲) => /\d{1,2}歳/.test(範囲);

(async () => {
  await act(async () => { root.render(React.createElement(App)); }); await flush();
  await rc('ゲームをはじめる');
  const 家 = [...document.querySelectorAll('.mn')].find((e) => e.textContent.trim() === '織田家');
  if (家) await click(家.parentElement);
  await rc('この勢力で開始'); await flush(); await flush();

  /* -------------------------------------------------- 一、武将一覧 */
  if (await rc('武将一覧')) {
    await flush();
    const 札 = document.querySelector('.modal .card');
    const 中 = 札 ? 札.textContent.replace(/\s+/g, ' ') : '';
    確('武将一覧に齢が出る', 齢が出るか(中), (中.match(/[^\s]{2,6}\s*\d{1,2}歳\s*統\d+/) || [])[0] || 中.slice(60, 130));
    await rc('閉じる'); await flush();
  } else 確('武将一覧を開ける', false);

  /* ---------------------------------------- 二、城の帳面（武将の欄） */
  await rc('本拠'); await flush();
  const cv = document.querySelector('.mapwrap canvas');
  if (!btn('軍事') && cv) {
    for (const [x, y] of [[450, 300], [450, 290], [460, 310], [440, 320]]) {
      await act(async () => { cv.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y })); });
      await act(async () => { cv.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y })); });
      await flush(); if (btn('軍事')) break;
    }
  }
  if (btn('人事')) {
    await rc('人事'); await flush();
    const 中 = txt();
    確('城の帳面（人事）に齢が出る', 齢が出るか(中), (中.match(/\d{1,2}歳\s*統\d+/) || [])[0] || '');
  } else 確('城の帳面を開ける', false);

  /* ---------------------------------------------------- 三、出陣の将選び */
  if (await rc('軍事')) {
    await flush();
    if (await rc('出陣')) {
      await flush();
      const 札 = document.querySelector('.modal .card');
      const 中 = 札 ? 札.textContent.replace(/\s+/g, ' ') : '';
      確('出陣の参加武将に齢が出る', 齢が出るか(中), (中.match(/\d{1,2}歳／統\d+/) || [])[0] || '');
      // 寄騎の将にも齢が並ぶこと（reinforceOffers が齢を渡していないと出ない）
      const 行 = [...document.querySelectorAll('.modal .aidrow')]
        .filter((r) => /自領|臣従/.test(r.textContent))[0];
      if (行) {
        const c0 = 行.querySelector('input[type=checkbox]');
        if (c0 && !c0.disabled) { await act(async () => { c0.click(); }); await flush(); }
        確('寄騎の将にも齢が出る', 齢が出るか(行.textContent),
          (行.textContent.replace(/\s+/g, ' ').match(/\d{1,2}歳／統\d+/) || [])[0] || '');
      } else 確('寄騎の欄がある', false);
      await rc('取りやめ'); await flush();
    } else 確('出陣の画面を開ける', false);
  }

  /* ------------------------------------- 四、忠誠に小数が出ないこと

     忠誠は月ごとに小数で動く（知行の過不足、幼き当主のもとでの揺れ）。
     生のまま出していたため「忠68.09999999999997」のような字が画面に出ていた。 */
  {
    let t = initState('oda');
    for (let i = 0; i < 6; i++) t = advanceMonth(t, t);
    const 小数 = t.generals.filter((x) => x.loyal != null && x.loyal % 1 !== 0);
    確('盤の上では忠誠が小数で動いている（丸めていない）', 小数.length > 0,
      `${小数.length}名／例 ${小数[0] ? 小数[0].loyal : ''}`);
    確('表に出す忠誠は整数になる',
      小数.every((x) => Number.isInteger(忠誠(x))),
      小数[0] ? `${小数[0].loyal} → ${忠誠(小数[0])}` : '');
    確('切り捨てである（実の値より高く見せない）',
      忠誠({ loyal: 39.6 }) === 39 && 忠誠({ loyal: 40.9 }) === 40,
      '39.6→39／40.9→40');
    確('値の無い者は既定の60とみなす', 忠誠({}) === 60 && 忠誠(null) === 60);
  }

  // 画面に小数が出ていないこと（武将一覧をもう一度開いて字を見る）
  {
    if (await rc('武将一覧')) {
      await flush();
      const 札 = document.querySelector('.modal .card');
      const 中 = 札 ? 札.textContent.replace(/\s+/g, ' ') : '';
      const 小数の字 = 中.match(/忠\d+\.\d+/g) || [];
      確('武将一覧に小数の忠誠が出ない', 小数の字.length === 0,
        小数の字.length ? `★${小数の字.slice(0, 2).join(' / ')}` : (中.match(/忠\d+/) || [])[0] || '');
      await rc('閉じる'); await flush();
    }
  }

  console.log('');
  console.log('エラー:', 咎.length ? `${咎.length}件が通らなかった`
    : (errs.filter((e) => !/not wrapped in act|Warning/.test(e)).slice(0, 2).join(' | ') || 'なし'));
  process.exit(咎.length ? 1 : 0);
})().catch((e) => { console.log('例外:', e.message.slice(0, 200)); console.log('エラー: 例外'); process.exit(1); });
