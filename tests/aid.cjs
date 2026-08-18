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
  return () => {};
} });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 900; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 600; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 900, height: 600, right: 900, bottom: 600 }; };
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 180));
const { createRoot, act, App, React, initState, findPath } = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

/* ------------------------------------------- 盤をこしらえる
   自家の城が敵に囲まれ、他の自家の城と、臣従した家の城が近くにある形。 */
const s = initState('oda');
const 自城 = s.castles.filter((x) => x.faction === s.player);
const 囲まれる = 自城[0];
const 助ける = 自城[1] || 自城[0];

// 近くの他家を臣従させる
let 臣従家 = null, 臣従城 = null;
for (const d of s.castles) {
  if (d.faction === s.player) continue;
  const p = findPath(d.id, 囲まれる.id);
  if (p && p.length <= 3) { 臣従家 = d.faction; 臣従城 = d; break; }
}
if (臣従家) {
  const k = [s.player, 臣従家].sort().join('|');
  s.relations[k] = { trust: 80, state: '臣従', until: null };
  臣従城.local = 5000; 臣従城.food = 50000;
}
// 囲む敵をこしらえる（臣従させた家とは別の家）
let 敵城 = null;
for (const d of s.castles) {
  if (d.faction === s.player || d.faction === 臣従家) continue;
  const p = findPath(d.id, 囲まれる.id);
  if (p && p.length <= 3) { 敵城 = d; break; }
}
if (敵城) {
  const eg = s.generals.filter((x) => x.at === 敵城.id && x.faction === 敵城.faction && !x.captive).slice(0, 2);
  for (const t of eg) t.at = null;
  s.armies.push({
    id: 'besieger', faction: 敵城.faction, from: 敵城.id, gens: eg.map((x) => x.id),
    local: 4000, localTrain: 70, rost: null,
    men: 4000 + eg.reduce((t, x) => t + x.retinue, 0), at: 囲まれる.id,
    path: [囲まれる.id], prog: 0, food: 99999, target: 囲まれる.id, sieging: true,
  });
  s.sieges = [{ castleId: 囲まれる.id, armyId: 'besieger', months: 2, decided: null }];
}
助ける.local = 6000; 助ける.food = 90000;

const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s })]]);
dom.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
};
console.log(`仕込み: ${囲まれる.name}（自家）を${敵城 ? s.factions[敵城.faction].name : '敵'}が包囲。`
  + `救援元 ${助ける.name}、臣従 ${臣従家 ? s.factions[臣従家].name + '（' + 臣従城.name + '）' : 'なし'}`);

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

  // 囲まれた城を開く
  const 城名 = [...document.querySelectorAll('.mn')].find((e) => e.textContent.trim() === 囲まれる.name);
  if (城名) await click(城名.parentElement);
  if (!btn('軍事')) {
    const cv = document.querySelector('.mapwrap canvas');
    for (const [x, y] of [[450, 300], [450, 290], [460, 310], [440, 320]]) {
      await act(async () => { cv.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y })); });
      await act(async () => { cv.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y })); });
      await flush(); if (btn('軍事')) break;
    }
  }
  確('囲まれた城の帳面が開く', !!btn('軍事'));
  if (!btn('軍事')) { console.log('エラー: 城を選べない'); process.exit(1); }
  await rc('軍事');

  確('「援軍を呼ぶ」が出る', !!btn('援軍を呼ぶ'));
  if (!btn('援軍を呼ぶ')) { console.log('エラー: 援軍を呼べない'); process.exit(1); }
  await rc('援軍を呼ぶ'); await flush();

  const 文 = document.body.textContent;
  確('下知の通る城の欄がある', /下知の通る城/.test(文));
  確('頼むだけの家の欄がある', /頼むだけの家/.test(文));
  確('指図できぬ理由が書かれている', /旗の下にない家には/.test(文));

  // 肝心のところ。臣従の家は「下知の通る城」に、同盟・従属は「頼むだけ」に入る。
  // 包囲の札も同じ「card」なので、援軍の画面そのものを名指しで拾う
  const card = [...document.querySelectorAll('.modal .card')].find((e) => /下知の通る城/.test(e.textContent));
  const 全文 = card ? card.textContent.replace(/\s+/g, ' ') : '';
  const 下知部 = 全文.split('頼むだけの家')[0];
  const 頼み部 = 全文.split('頼むだけの家')[1] || '';
  if (臣従城) {
    確(`臣従の家の城（${臣従城.name}）に下知が通る`, 下知部.includes(臣従城.name), 
      下知部.includes(臣従城.name) ? '' : `頼む側にある: ${頼み部.includes(臣従城.name)}`);
    確('臣従の札が出る', /臣従/.test(下知部));
  }
  確('下知の欄に同盟・従属が混じらない', !/同盟/.test(下知部));
  console.log('    [調べ] 下知部: ' + 下知部.split('下知の通る城')[1]?.slice(0, 180));

  // 下知の通る城を一つ選び、将と兵を選べること
  const 箱 = [...card.querySelectorAll('input[type=checkbox]')];
  確('呼べる城がある', 箱.length > 0, `${箱.length}件`);
  if (箱.length) {
    await act(async () => { 箱[0].click(); }); await flush();
    const 将箱 = [...card.querySelectorAll('input[type=checkbox]')];
    確('城を選ぶと武将が並ぶ', 将箱.length > 箱.length, `${将箱.length}件`);
    const 滑 = card.querySelector('input[type=range]');
    確('兵の数を選べる', !!滑);
    if (滑) {
      // React は range の変化を input の合図で受ける。change では届かない。
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
        setter.call(滑, 滑.max);
        滑.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
      await flush();
      確('選んだ兵の数が画面に反映される', /連れて行く地域家臣団/.test(card.textContent)
        && !/0 \/ /.test(card.textContent.match(/連れて行く地域家臣団[^人]*人/)?.[0] || '0 / '),
        (card.textContent.match(/連れて行く地域家臣団[^人]*人/) || [''])[0].replace(/\s+/g, ' '));
    }
  }
  const 送 = [...card.querySelectorAll('button')].find((b) => /人を差し向ける|使者を送る/.test(b.textContent));
  確('援軍を差し向けられる', !!送 && !送.disabled, 送 ? 送.textContent.trim() : 'なし');
  if (送) await click(送);
  await flush(); await flush();

  await rc('戦国記'); await flush();
  const 記 = (document.querySelector('.card') || { textContent: '' }).textContent.replace(/\s+/g, ' ');
  確('援軍が発した旨が記される', /援軍/.test(記), 記.slice(0, 120));
  await rc('閉じる');

  console.log('確かめ:', 咎 ? `★${咎}件が通らなかった` : 'すべて通った');
  console.log('エラー:', errs.length ? errs.slice(0, 2).join(' | ') : 'なし');
  process.exit(咎 ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
