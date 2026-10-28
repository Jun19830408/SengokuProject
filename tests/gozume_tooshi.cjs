/* 城攻めの盤に現れる後詰を、画面から通しで確かめる（GDD 9.2 / 9.4）。

   遊ぶ側が敵の城を囲んで強攻を選ぶ。その城の家の後詰が、ひと月の道のりの内まで
   来ている。城攻めの盤のさなかに後詰が盤の端から現れ、戦のあとには
     ・城が保てば、後詰は城の下に陣を張る（在陣）。損は後詰の軍から引かれる
     ・城が落ちれば、後詰は退く
   のいずれかになり、戦国記に残る。城の兵の帳に後詰の兵が紛れ込まないこと。
   後詰の盤の上の働きは tests/gozume_ban.cjs が見る。ここでは画面の流れと帳尻を見る。 */
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>',
  { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
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
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 900; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 600; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, width: 900, height: 600, right: 900, bottom: 600 };
};
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 200));
let 種 = 0x2b2b;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
dom.window.Math.random = Math.random;
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, App, React, initState, findPath, 解す } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* ------------------------------------------ 囲んだ盤と、近くまで来た後詰を仕込む

   組は二通り。
     落ちる組 … 寄せ手三万で囲む。城兵九百・城防三十。後詰千二百が来ても城は落ちる見込み
     保つ組   … 寄せ手三千で囲む。城兵三千五百・城防八十五。後詰六千が来る */
function 仕込む({ 寄兵, 城兵, 城防, 後兵, 寄将数 }) {
  const s = initState('oda');
  let 自 = null, 的 = null, 援 = null;
  for (const c of s.castles.filter((x) => x.faction === s.player)) {
    for (const d of s.castles) {
      if (!d.faction || d.faction === c.faction || d.faction.startsWith('_')) continue;
      if ((findPath(c.id, d.id) || []).length !== 2) continue;
      const r = s.castles.find((e) => e.id !== d.id && e.faction === d.faction && (findPath(e.id, d.id) || []).length === 2
        && s.generals.some((x) => x.at === e.id && x.faction === e.faction && !x.captive));
      if (r) { 自 = c; 的 = d; 援 = r; break; }
    }
    if (自) break;
  }
  if (!自) return null;
  const 将 = s.generals.filter((x) => x.at === 自.id && x.faction === 自.faction && !x.captive).slice(0, 寄将数);
  for (const t of 将) t.at = null;
  s.armies.push({
    id: 'siegeArmy', faction: 自.faction, from: 自.id, gens: 将.map((x) => x.id),
    local: 寄兵, localTrain: 72, rost: null, men: 寄兵 + 将.reduce((a, x) => a + x.retinue, 0),
    at: 的.id, path: [的.id], prog: 0, food: 99999, target: 的.id, sieging: true,
  });
  的.local = 城兵; 的.food = 90000; 的.min = 80; if (城防) 的.def = 城防;
  s.sieges = [{ castleId: 的.id, armyId: 'siegeArmy', months: 1, decided: null }];
  // 後詰。援の城の将を二人出す。道の残りはひと月の内（城攻めの一日目のうちに着く）
  const 後将 = s.generals.filter((x) => x.at === 援.id && x.faction === 援.faction && !x.captive).slice(0, 2);
  for (const t of 後将) t.at = null;
  const 道 = findPath(援.id, 的.id);
  s.armies.push({
    id: 'reliefArmy', faction: 援.faction, from: 援.id, gens: 後将.map((x) => x.id),
    local: 後兵, localTrain: 70, rost: null, men: 後兵 + 後将.reduce((a, x) => a + x.retinue, 0),
    at: 道[0], path: 道, prog: 0.97, food: 9000, target: 的.id, relief: 的.id,
  });
  s.sieges[0].relief = 'reliefArmy';
  return { s, 自, 的, 援, 将, 後将, 寄兵, 城兵, 後兵 };
}

const 蔵 = new Map();
dom.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
};
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 5)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 450, clientY: 300 }));
const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
const btns = () => [...document.querySelectorAll('button,.mbtn')];
const btn = (t) => btns().find((b) => b.textContent.trim().includes(t) && !b.disabled);
const rc = async (t) => { const el = btn(t); if (!el) return false; await click(el); return true; };
const txt = () => [...document.querySelectorAll('body *:not(style)')]
  .map((e) => (e.children.length ? '' : e.textContent)).join(' ').replace(/\s+/g, ' ');

/* 画面から強攻を起こして委ね、決着のあと月を送らずに記録の枠一へ書き出して、盤を読む */
async function 通す(仕) {
  蔵.clear();
  蔵.set('sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: 仕.s }));
  document.body.innerHTML = '<div id="r"></div>';
  const root = createRoot(document.getElementById('r'));
  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
  await rc('続きから'); await flush(); await flush();
  const 出た = { 強攻: !!btn('強攻') };
  if (!btn('強攻')) { await act(async () => { root.unmount(); }); return 出た; }
  await rc('強攻'); await flush(); await flush();
  if (btn('自ら采を執る')) { await rc('自ら采を執る'); await flush(); await flush(); }
  出た.始めの文 = txt();
  await rc('合戦開始'); await flush();
  await rc('委ねて結果を見る');
  出た.見えた = false;
  for (let k = 0; k < 60000; k++) {
    const q = [...rafMap.entries()]; rafMap.clear();
    if (q.length) await act(async () => { q.forEach(([, cb]) => cb(2000 + k * 90)); }); else await flush();
    if (!出た.見えた && /後詰着到/.test(txt())) 出た.見えた = true;
    if (btn('戦場を離れる')) break;
  }
  出た.決着 = !!btn('戦場を離れる');
  出た.結び = (txt().match(/城は落ちた|寄せ手は退けられた|囲みへ戻った|城は落ちなかった/) || [''])[0];
  await rc('戦場を離れる'); await flush(); await flush();
  for (let k = 0; k < 6; k++) { if (await rc('承知') || await rc('閉じる')) continue; break; }
  // 月を送らずに書き出す（帯の「記録」→ 枠一）
  const 記録釦 = btns().find((b) => /^記録/.test(b.textContent.trim()) && b.textContent.trim().length < 30 && !b.disabled);
  if (記録釦) { await click(記録釦); await flush(); }
  const 枠 = btns().find((b) => /記録 一/.test(b.textContent));
  if (枠) { await click(枠); await flush(); await flush(); }
  await act(async () => { root.unmount(); });
  const raw = 蔵.get('sengoku:slot1');
  出た.st = raw ? JSON.parse(解す(raw)).state : null;
  return 出た;
}

(async () => {
  for (const [名, 設定] of [
    ['落ちる組', { 寄兵: 30000, 城兵: 900, 城防: 30, 後兵: 1200, 寄将数: 3 }],
    ['保つ組', { 寄兵: 3000, 城兵: 3500, 城防: 85, 後兵: 6000, 寄将数: 2 }],
  ]) {
    console.log(`── ${名}`);
    const 仕 = 仕込む(設定);
    if (!仕) { console.log('エラー: 仕込める城の並びが無い'); process.exit(1); }
    const 出 = await 通す(仕);
    確('盤を仕込めた', 出.強攻,
      `${仕.自.name}の軍${仕.寄兵}人が${仕.的.name}（城兵${仕.城兵}人）を囲み、${仕.援.name}から後詰${仕.後兵}人が近くまで来ている`);
    if (!出.強攻) continue;
    確('寄せ手（遊ぶ側）には、後詰の来ることは知らされない', !/後詰（/.test(出.始めの文) && !/後詰 一日目|後詰 二日目|後詰 三日目/.test(出.始めの文));
    確('盤のさなかに後詰が現れる（上の帯に「後詰着到」）', 出.見えた);
    確('決着がついた', 出.決着, 出.結び);
    確('月を送らずに記録が読める', !!出.st);
    if (!出.st) continue;
    const st = 出.st;
    const 記 = (st.chronicle || []).map((e) => e.text);
    const 後記 = 記.filter((t) => /の後詰/.test(t) && /駆けつけ/.test(t));
    確('後詰の働きが戦国記に残る', 後記.length >= 1, 後記.slice(-1)[0] || 記.slice(-6).join(' ／ '));
    const 城 = st.castles.find((c) => c.id === 仕.的.id);
    const 落ちた = 城 && 城.faction === 仕.自.faction;
    const ra = st.armies.find((a) => a.id === 'reliefArmy');
    console.log(`    結び：${落ちた ? '城は落ちた' : '城は保った'}`);
    if (名 === '保つ組') 確('保つ組では城が保つ', !落ちた);
    if (落ちた) {
      確('城が落ちれば、後詰は退く（軍は盤から消える）', !ra, ra ? JSON.stringify({ at: ra.at, 在陣: ra.在陣 }) : '退いた');
    } else {
      確('城が保てば、後詰は城の下に陣を張る', !!ra && ra.在陣 === 仕.的.id && ra.at === 仕.的.id,
        ra ? JSON.stringify({ at: ra.at, 在陣: ra.在陣, men: ra.men }) : '軍が無い');
      確('後詰の損は後詰の軍から引かれる（盤に出た兵の内に収まる）', !!ra && ra.men > 0 && ra.men < 仕.後兵 + 2000, ra ? `${ra.men}人` : '');
      確('城の兵の帳に後詰の兵が紛れ込まない', 城.local <= 仕.城兵, `城兵 ${城.local}人（もと${仕.城兵}人）`);
      確('城の下に陣を張ったことが戦国記に残る', 後記.some((t) => /城の下に陣を張った/.test(t)));
    }
  }
  確('画面の例外が出ていない', !errs.some((e) => /Error|TypeError|undefined/.test(e)), errs.slice(0, 3).join(' ／ '));
  console.log('');
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 6).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
