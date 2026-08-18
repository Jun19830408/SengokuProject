// 出陣の画面の試験。
//
// 一、味方の城を目標に選べること（城から城へ武将と兵を移す、基本の操作）
// 二、囲まれた味方の城を選べば、囲みを解くための野戦になると分かること
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

/* 賽の目を固定する。
   自城が囲まれているので、月送りの前に城方の腹を決めねばならない。
   そこで三割ほどの目で寄せ手が攻めかかり、防戦の盤が開く。
   目が定まっていないと、その日の運で通ったり落ちたりする。 */
let 種 = 0x50D71E;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
dom.window.Math.random = Math.random;
const { createRoot, act, App, React, initState, findPath } = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

/* ------------------------------------------- 盤をこしらえる
   自家の城を二つ選び、片方を「囲まれた城」にする。
   出陣元は、その両方へ道の通じた城とする。 */
const s = initState('oda');
const 自城 = s.castles.filter((x) => x.faction === s.player);
let 出陣元 = null, 味方先 = null;
for (const a of 自城) {
  for (const b of 自城) {
    if (a.id === b.id) continue;
    const p = findPath(a.id, b.id);
    if (p && p.length >= 2) { 出陣元 = a; 味方先 = b; break; }
  }
  if (出陣元) break;
}
if (!出陣元) { console.log('★自家の城が二つ以上つながっていない'); console.log('エラー: 仕込めず'); process.exit(1); }

// 味方先を敵に囲ませる
let 敵 = null;
for (const d of s.castles) { if (d.faction !== s.player) { const p = findPath(d.id, 味方先.id); if (p && p.length <= 3) { 敵 = d; break; } } }
if (敵) {
  const eg = s.generals.filter((x) => x.at === 敵.id && x.faction === 敵.faction && !x.captive).slice(0, 2);
  for (const t of eg) t.at = null;
  s.armies.push({
    id: 'besieger', faction: 敵.faction, from: 敵.id, gens: eg.map((x) => x.id),
    local: 5000, localTrain: 70, rost: null,
    men: 5000 + eg.reduce((t, x) => t + x.retinue, 0), at: 味方先.id,
    path: [味方先.id], prog: 0, food: 99999, target: 味方先.id, sieging: true,
  });
  s.sieges = [{ castleId: 味方先.id, armyId: 'besieger', months: 2, decided: null }];
}
// 出陣元に兵と将を十分に置く
出陣元.local = 6000; 出陣元.food = 90000;

const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s })]]);
dom.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
};
console.log(`仕込み: ${出陣元.name}（自家）から出陣。味方の ${味方先.name} は${敵 ? `${s.factions[敵.faction].name}に囲まれている` : '無事'}`);

const root = createRoot(document.getElementById('r'));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 5)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 450, clientY: 300 }));
const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
const btn = (t) => [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t) && !b.disabled);
const rc = async (t) => { const el = btn(t); if (!el) return false; await click(el); return true; };

(async () => {
  let 咎 = 0;
  const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎++; };

  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
  await rc('続きから'); await flush(); await flush();

  // 出陣元の城を開く。城は地図を押さずとも、城の一覧から選べる。
  // ここでは記録に仕込んだ城を直に選ぶため、地図の当たりに頼らない。
  const 城名 = [...document.querySelectorAll('.mn')].find((e) => e.textContent.trim() === 出陣元.name);
  if (城名) await click(城名.parentElement);
  if (!btn('軍事')) {
    // 地図を押して選ぶ
    const cv = document.querySelector('.mapwrap canvas');
    for (const [x, y] of [[450, 300], [450, 290], [460, 310], [440, 320]]) {
      await act(async () => { cv.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y })); });
      await act(async () => { cv.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y })); });
      await flush(); if (btn('軍事')) break;
    }
  }
  確('城の帳面が開く', !!btn('軍事'));
  if (!btn('軍事')) { console.log('エラー: 城を選べない'); process.exit(1); }
  await rc('軍事');
  確('「出陣」が押せる', !!btn('出陣'));
  await rc('出陣');

  const sel = document.querySelector('.modal select.sel');
  確('出陣の画面が開く', !!sel);
  if (!sel) { console.log('エラー: 出陣の画面が開かない'); process.exit(1); }

  const 選択肢 = [...sel.options].map((o) => ({ v: o.value, t: o.textContent }));
  console.log(`  目標の選択肢 ${選択肢.length} 件`);
  for (const o of 選択肢.slice(0, 6)) console.log('    ' + o.t);

  const 味方 = 選択肢.filter((o) => /［味方］|【急】/.test(o.t));
  確('味方の城を目標に選べる', 味方.length > 0, `${味方.length}件`);
  if (敵) 確('囲まれた味方の城が【急】として出る', 選択肢.some((o) => /【急】/.test(o.t) && o.v === 味方先.id));

  // 味方の城を選んでみて、進発できるか
  if (味方.length) {
    const 的 = 味方[0];
    await act(async () => {
      sel.value = 的.v;
      sel.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    });
    await flush();
    const 進発 = [...document.querySelectorAll('button')].find((b) => /人で進発/.test(b.textContent));
    確('味方の城を選んでも進発できる', !!進発 && !進発.disabled, 進発 ? 進発.textContent.trim() : 'なし');
  }

  /* ここからが肝心。選べるだけでは足りぬ。
     味方の城へ着いたとき、軍議（攻めかかる）が開かれてはならない。
     以前はここを見ておらず、味方を攻める形になっていた。 */
  const 移す先 = [...sel.options].find((o) => /［味方］/.test(o.textContent));
  if (移す先) {
    await act(async () => { sel.value = 移す先.value; sel.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    await flush();
    const 出た = await rc('人で進発');
    確('味方の城へ進発できる', 出た);

    // 戦国記に「攻める」と書かれていないこと
    await rc('戦国記'); await flush();
    const 記 = (document.querySelector('.card') || { textContent: '' }).textContent.replace(/\s+/g, ' ');
    const 攻めると書かれた = /を攻める。/.test(記);
    確('記録に「攻める」と書かれない', !攻めると書かれた, 記.slice(0, 100));
    await rc('閉じる'); await flush();

    // 着くまで月を送り、軍議が出ないこと・合流できることを見る
    /* 盤が開いたら委ねて片づける。
       「籠城して待つ」を選ぶと三割ほどの目で寄せ手が攻めかかり、防戦の盤が開く。
       これは正しい振る舞いなので、決着させてから月送りを続ける。 */
    const 戦を片づける = async () => {
      if (!btn('合戦開始')) return false;
      await rc('合戦開始');
      await rc('委ねて結果を見る');
      for (let k = 0; k < 3000; k++) {
        const q = [...rafMap.entries()]; rafMap.clear();
        if (q.length) await act(async () => { q.forEach(([, cb]) => cb(2000 + k * 90)); });
        else await flush();
        if (btn('戦場を離れる')) break;
      }
      await rc('戦場を離れる');
      await flush(); await flush();
      return true;
    };
    let 着 = false, 軍議 = false;
    for (let m = 0; m < 12 && !着; m++) {
      // 包囲の段は、城方なら「籠城して待つ」、寄せ手なら「兵糧攻め」。
      for (const t of ['籠城して待つ', '耐える', '守りを固める', '兵糧攻め']) if (await rc(t)) break;
      await 戦を片づける();
      if (!(await rc('次月へ'))) {
        if (await 戦を片づける()) { m--; continue; }
        break;
      }
      await flush(); await flush();
      const t = document.body.textContent;
      if (/攻めかかる/.test(t)) { 軍議 = true; break; }
      if (/城へ合流した|援軍.*を入れた/.test(t)) { 着 = true; break; }
      // 月初報告を閉じる釦は「評定を開く」である。挙げ忘れると翌月へ進めなくなる。
      for (const b of ['評定を開く', '閉じる', '了']) if (await rc(b)) break;
    }
    確('味方の城で軍議（攻めかかる）が開かれない', !軍議);
    確('味方の城へ着いて合流する', 着);
  }

  console.log('確かめ:', 咎 ? `★${咎}件が通らなかった` : 'すべて通った');
  // 通らなかった確かめがあるのに「エラー: なし」と出しては、一覧で見落とす。
  console.log('エラー:', 咎 ? `${咎}件が通らなかった`
    : (errs.length ? errs.slice(0, 2).join(' | ') : 'なし'));
  process.exit(咎 ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
