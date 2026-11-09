/* 攻められる城へ采配が集めた後詰を、画面から通しで確かめる（core/engun.js 城方の後詰ら・
   ui/MapScreen.jsx startBattle・finishBattle・startAssault・finishAssault・battle/ai.js 前に構える）。

   遊ぶ側の申し出は「…現在は、攻められた城の兵のみが野戦に出るだけなので、攻め落としやすくなっています。
   援軍（特に自軍からの援軍）を活用するようにしてください」、そして「援軍がいる場合で城攻めとなったら、
   その援軍は城攻めにも参加し、城の外で相手を待ち構えるような布陣（城の前面等で布陣して城攻めを防ぐ）」
   であった。遊ぶ側が他家の城を攻める。その城の下には、その家の後詰が陣を張っている。
     一、城下の野戦 … 着いた月の野戦に、城の兵と並んで後詰が立つ（盤の記に「城方には…後詰…が加わって
                       いる」）。戦のあと、後詰の損は後詰の軍から引かれ、城の兵の帳に紛れない。城方が勝てば
                       後詰は城の下に陣を張ったまま、城が囲まれても兵が残れば踏みとどまる
     二、城攻めの盤 … 囲んで強攻を選ぶと、後詰は城の前に構えて寄せ手を待ち構える（盤の記に「城の前には…」）。
                       戦のあと、後詰の働きが戦国記に残り、損は後詰の軍から引かれる */
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
let 種 = 0x4a7e;
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


/* 場を探す。遊ぶ側の城から一月で着く他家の城と、その家のほかの城（後詰の出どころ） */
function 場を探す(s) {
  for (const 自 of s.castles.filter((x) => x.faction === s.player)) {
    for (const 的 of s.castles) {
      if (!的.faction || 的.faction === s.player || 的.faction.startsWith('_')) continue;
      const 道 = H.軍の道 ? H.軍の道(s, s.player, 自.id, 的.id) : findPath(自.id, 的.id);
      if (!道 || 道.length < 2 || 道.length > 3) continue;
      const 援 = s.castles.find((e) => e.id !== 的.id && e.faction === 的.faction
        && s.generals.filter((x) => x.at === e.id && x.faction === e.faction && !x.captive && !x.lord).length >= 2);
      const 将 = s.generals.filter((x) => x.at === 自.id && x.faction === 自.faction && !x.captive);
      if (援 && 将.length >= 2) return { 自, 的, 援, 道 };
    }
  }
  return null;
}
/* 盤を仕込む。囲む = true なら、遊ぶ側の軍はもう城を囲んでいる（強攻を選べる）。さもなくば着いたところ */
function 仕込む({ 寄兵, 城兵, 後兵, 囲む }) {
  const s = initState('oda');
  const 場 = 場を探す(s);
  if (!場) return null;
  const { 自, 的, 援 } = 場;
  const 将 = s.generals.filter((x) => x.at === 自.id && x.faction === 自.faction && !x.captive).slice(0, 3);
  for (const t of 将) t.at = null;
  s.armies.push({
    id: 'atkArmy', faction: 自.faction, from: 自.id, gens: 将.map((x) => x.id),
    local: 寄兵, localTrain: 72, rost: null, men: 寄兵 + 将.reduce((a, x) => a + x.retinue, 0),
    at: 的.id, path: [的.id], prog: 0, food: 99999, target: 的.id, sieging: !!囲む,
  });
  的.local = 城兵; 的.food = 90000;
  const 後将 = s.generals.filter((x) => x.at === 援.id && x.faction === 援.faction && !x.captive && !x.lord).slice(0, 2);
  for (const t of 後将) t.at = null;
  s.armies.push({
    id: 'reliefArmy', faction: 援.faction, from: 援.id, gens: 後将.map((x) => x.id),
    local: 後兵, localTrain: 70, rost: null, men: 後兵 + 後将.reduce((a, x) => a + x.retinue, 0),
    at: 的.id, path: [的.id], prog: 0, food: 9000, target: null, relief: 的.id, 在陣: 的.id,
  });
  if (囲む) s.sieges = [{ castleId: 的.id, armyId: 'atkArmy', months: 1, decided: null }];
  else s.pendingArrivals = ['atkArmy'];
  return { s, 自, 的, 援, 寄兵, 城兵, 後兵, 後将, 囲む };
}

async function 通す(仕) {
  蔵.clear();
  蔵.set('sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: 仕.s }));
  document.body.innerHTML = '<div id="r"></div>';
  const root = createRoot(document.getElementById('r'));
  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
  await rc('続きから'); await flush(); await flush();
  const 出た = {};
  if (仕.囲む) {
    出た.強攻 = !!btn('強攻');
    if (!出た.強攻) { await act(async () => { root.unmount(); }); return 出た; }
    await rc('強攻'); await flush(); await flush();
  }
  if (btn('正面から当たる')) { await rc('正面から当たる'); await flush(); await flush(); }
  if (btn('自ら采を執る')) { await rc('自ら采を執る'); await flush(); await flush(); }
  出た.始めの文 = txt();
  出た.盤 = !!btn('合戦開始');
  await rc('合戦開始'); await flush();
  出た.始めた文 = txt();
  await rc('委ねて結果を見る');
  let 刻み = 0;
  for (let k = 0; k < 60000; k++) {
    const q = [...rafMap.entries()]; rafMap.clear();
    if (q.length) { const ts = 2000 + (刻み++) * 90; await act(async () => { q.forEach(([, cb]) => cb(ts)); }); } else await flush();
    if (btn('戦場を離れる')) break;
  }
  出た.決着 = !!btn('戦場を離れる');
  出た.終わりの文 = txt();
  await rc('戦場を離れる'); await flush(); await flush();
  for (let k = 0; k < 6; k++) { if (await rc('承知') || await rc('閉じる')) continue; break; }
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
  console.log('■ 一、城下の野戦');
  {
    const 仕 = 仕込む({ 寄兵: 6000, 城兵: 1500, 後兵: 3000, 囲む: false });
    if (!仕) { console.log('エラー: 仕込める城の並びが無い'); process.exit(1); }
    const 出 = await 通す(仕);
    確('城下の野戦の盤が開く', 出.盤, `${仕.自.name}の軍${仕.寄兵}人が${仕.的.name}（城兵${仕.城兵}人）に着き、城の下には${仕.援.name}から来た後詰${仕.後兵}人が陣を張る`);
    確('盤の記に、城方に後詰が加わっていると出る', /城方には.*後詰.*加わっている/.test(出.始めた文 + 出.始めの文 + 出.終わりの文));
    確('決着がついた', 出.決着);
    確('月を送らずに記録が読める', !!出.st);
    if (出.st) {
      const st = 出.st;
      const 城 = st.castles.find((c) => c.id === 仕.的.id);
      const ra = st.armies.find((a) => a.id === 'reliefArmy');
      const 記 = (st.chronicle || []).map((e) => e.text);
      const 囲まれた = (st.sieges || []).some((x) => x.castleId === 仕.的.id);
      console.log(`    結び：${城.faction === 仕.自.faction ? '城は落ちた' : 囲まれた ? '城は囲まれた' : '寄せ手は退いた'}・後詰 ${ra ? `${ra.men}人（在陣 ${ra.在陣 || 'なし'}）` : '退いた'}`);
      確('後詰の働きが戦国記に残る', 記.some((t) => /後詰は.*城下の野戦に加わ/.test(t)), 記.filter((t) => /後詰/.test(t)).slice(-1)[0] || '');
      確('城の兵の帳に後詰の兵が紛れ込まない', 城.local <= 仕.城兵, `城兵 ${城.local}人（もと${仕.城兵}人）`);
      if (ra) {
        確('後詰の損は後詰の軍から引かれる', ra.men < 仕.後兵 + 仕.後将.reduce((a, x) => a + x.retinue, 0), `${ra.men}人`);
        確('残った後詰は城の下に陣を張る', ra.在陣 === 仕.的.id && ra.at === 仕.的.id, JSON.stringify({ at: ra.at, 在陣: ra.在陣 }));
      }
      確('同じ月に二度は戦わない（着いた軍の控えに残らない）', !(st.pendingArrivals || []).includes('reliefArmy'));
    }
  }
  console.log('■ 二、城攻めの盤');
  {
    const 仕 = 仕込む({ 寄兵: 9000, 城兵: 1500, 後兵: 2500, 囲む: true });
    const 出 = await 通す(仕);
    確('強攻を選べる', 出.強攻);
    if (出.強攻) {
      確('盤の記に、城の前に後詰が構えていると出る', /城の前には.*後詰.*構え/.test(出.始めた文 + 出.始めの文 + 出.終わりの文));
      確('決着がついた', 出.決着);
      確('月を送らずに記録が読める', !!出.st);
      if (出.st) {
        const st = 出.st;
        const 城 = st.castles.find((c) => c.id === 仕.的.id);
        const ra = st.armies.find((a) => a.id === 'reliefArmy');
        const 記 = (st.chronicle || []).map((e) => e.text);
        const 落ちた = 城.faction === 仕.自.faction;
        console.log(`    結び：${落ちた ? '城は落ちた' : '城は保った'}・後詰 ${ra ? `${ra.men}人（在陣 ${ra.在陣 || 'なし'}）` : '退いた'}`);
        確('城の前に構えた後詰の働きが戦国記に残る', 記.some((t) => /城の前に構え/.test(t)), 記.filter((t) => /後詰/.test(t)).slice(-1)[0] || '');
        確('城の兵の帳に後詰の兵が紛れ込まない', 城.local <= 仕.城兵, `城兵 ${城.local}人（もと${仕.城兵}人）`);
        if (落ちた) 確('城が落ちれば、後詰は退く', !ra);
        else 確('城が保てば、後詰は城の下に陣を張ったまま', !!ra && ra.在陣 === 仕.的.id, ra ? JSON.stringify({ at: ra.at, 在陣: ra.在陣 }) : '軍が無い');
      }
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
