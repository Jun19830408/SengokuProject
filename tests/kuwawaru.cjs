/* 囲みに加わる・印の無い後詰（GDD 7.3 / 9.2）。

   遊ぶ側の申し出は二つあった。

   一　「軍勢をいくつか動かし、敵の城に攻めさせたとき、包囲するだけで全く操作できない」
       先に着いた軍が城を囲んだあと、遅れて着いた同じ家の軍が城下の野戦に勝つと、
       その城の囲みを自分のものに書き換えていた。先の軍は「囲み中」の印を負ったまま
       囲みの帳から外れ、月送りも画面も扱わなくなる。
   二　「敵が自軍の城を包囲しており、救援に向かわせても合戦にならず、自軍もその城に
       在陣するだけ、敵も包囲し続けるだけ」
       後詰の印（relief）は出陣のときに城が囲まれていた軍にしか付かない。出たあとで
       囲みが始まると、印の無い援軍は城の下に陣を張るだけだった。

   画面を組み、月を送って、どちらも操作できる形に収まるかを見る。 */
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
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 200));

let 種 = 0x9A11;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
dom.window.Math.random = Math.random;


const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, App, React, initState, 軍の道, 解す } = H;

const 盤を立てる = (型) => {
  const s = initState('oda');
  if (型 === '寄せ') {
    // 自家の城 F と、隣の敵城 E。先の軍は E を囲み、後の軍が F から向かう
    let F = null, E = null, P = null;
    for (const c of s.castles.filter((c) => c.faction === s.player)) {
      for (const e of s.castles.filter((x) => x.faction !== s.player)) {
        const p = 軍の道(s, s.player, c.id, e.id);
        if (p && p.length === 2 && s.generals.filter((g) => g.at === c.id && g.faction === s.player && !g.lord).length >= 4) { F = c; E = e; P = p; break; }
      }
      if (F) break;
    }
    const 将 = s.generals.filter((g) => g.at === F.id && g.faction === s.player && !g.lord).slice(0, 4);
    const 軍 = (id, gs, 着) => { for (const t of gs) t.at = null; return { id, faction: s.player, from: F.id, gens: gs.map((x) => x.id), local: 3000, localTrain: 70, rost: null,
      men: 3000 + gs.reduce((t, x) => t + x.retinue, 0), at: 着 ? E.id : P[0], path: 着 ? [E.id] : P, prog: 0, food: 20000, target: E.id, ...(着 ? { sieging: true } : {}) }; };
    s.armies.push(軍('先', 将.slice(0, 2), true));
    s.sieges = [{ castleId: E.id, armyId: '先', months: 1, decided: null, enc: 100 }];
    s.armies.push(軍('後', 将.slice(2, 4), false));
    return { s, 的: E };
  }
  // 自家の城 X が敵に囲まれている。援軍は F から向かう（印は無い）か、すでに X に在陣している
  let X = null, E = null, F = null;
  for (const c of s.castles.filter((c) => c.faction === s.player)) {
    const e = s.castles.find((e) => e.faction !== s.player && (軍の道(s, e.faction, e.id, c.id) || []).length === 2);
    const f = s.castles.find((f) => f.faction === s.player && f.id !== c.id && (軍の道(s, s.player, f.id, c.id) || []).length === 2);
    if (e && f) { X = c; E = e; F = f; break; }
  }
  const 敵将 = s.generals.filter((g) => g.at === E.id && !g.lord).slice(0, 2);
  for (const t of 敵将) t.at = null;
  s.armies.push({ id: '寄せ手', faction: E.faction, from: E.id, gens: 敵将.map((x) => x.id), local: 2500, localTrain: 60, rost: null,
    men: 2500 + 敵将.reduce((t, x) => t + x.retinue, 0), at: X.id, path: [X.id], prog: 0, food: 30000, target: X.id, sieging: true });
  /* 囲みは固く（囲み率百）。緩いと城方の家が自ら後詰を差し向け（month.js）、
     仕立てた援軍が戦わずとも囲みが解けてしまう。 */
  s.sieges = [{ castleId: X.id, armyId: '寄せ手', months: 1, decided: null, enc: 100 }];
  const 味方将 = s.generals.filter((g) => g.at === F.id && g.faction === s.player && !g.lord).slice(0, 2);
  for (const t of 味方将) t.at = null;
  const P = 軍の道(s, s.player, F.id, X.id);
  const 援 = { id: '援', faction: s.player, from: F.id, gens: 味方将.map((x) => x.id), local: 3500, localTrain: 70, rost: null,
    men: 3500 + 味方将.reduce((t, x) => t + x.retinue, 0), at: P[0], path: P, prog: 0, food: 20000, target: X.id };
  if (型 === '在陣') { 援.at = X.id; 援.path = [X.id]; 援.target = null; 援.在陣 = X.id; }
  s.armies.push(援);
  return { s, 的: X, 敵: E };
};

const 走らせる = async (s, 月数) => {
  const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s })]]);
  dom.window.storage = {
    get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
    set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
    delete: async (k) => { 蔵.delete(k); return {}; },
  };
  document.body.innerHTML = '<div id="r"></div>';
  const root = createRoot(document.getElementById('r'));
  const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 5)); }); };
  const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 450, clientY: 300 }));
  const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
  const btns = () => [...document.querySelectorAll('button,.mbtn')];
  const btn = (t) => btns().find((b) => b.textContent.trim().includes(t) && !b.disabled);
  const rc = async (t) => { const el = btn(t); if (!el) return false; await click(el); return true; };
  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
  await rc('続きから'); await flush(); await flush();
  let 送った = 0, 詰まり = false, 戦 = false;
  for (let step = 0; step < 80 && 送った < 月数; step++) {
    if (btn('自ら采を執る') || btn('合戦開始') || btn('籠もったまま')) 戦 = true;
    if (await rc('籠もったまま') || await rc('正面から当たる') || await rc('自ら采を執る') || await rc('合戦開始') || await rc('委ねて結果を見る')
      || await rc('戦場を離れる') || await rc('陣へ戻る') || await rc('承知') || await rc('閉じる')) continue;
    if (btn('兵糧攻め')) { await rc('兵糧攻め'); continue; }
    if (btn('籠城して待つ')) { await rc('籠城して待つ'); continue; }
    const 次 = btns().find((b) => b.textContent.includes('次月へ'));
    if (次 && !次.disabled) { await click(次); await flush(); await flush(); 送った++; continue; }
    詰まり = true; break;
  }
  await act(async () => { root.unmount(); });
  const raw = 蔵.get('sengoku:save1');
  return { st: JSON.parse(解す(raw)).state, 詰まり, 戦 };
};

(async () => {
  let 咎 = 0;
  const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎++; };

  console.log('── 一　囲んでいる城へ、遅れて味方が着く');
  {
    const { s, 的 } = 盤を立てる('寄せ');
    const 先兵 = s.armies.find((a) => a.id === '先').men, 後兵 = s.armies.find((a) => a.id === '後').men;
    const { st, 詰まり } = await 走らせる(s, 3);
    const 囲む = st.armies.filter((a) => a.faction === st.player && a.at === 的.id && a.sieging);
    const 帳に無い = 囲む.filter((a) => !st.sieges.some((x) => x.armyId === a.id));
    確('画面が詰まらない（次月へか囲みの帳が押せる）', !詰まり);
    確('取り残された「囲み中」の軍が無い', 帳に無い.length === 0, 帳に無い.map((a) => a.id).join('・') || 'なし');
    確('二つの軍は一つに束ねられた', st.armies.filter((a) => ['先', '後'].includes(a.id)).length <= 1,
      st.armies.filter((a) => ['先', '後'].includes(a.id)).map((a) => `${a.id}${a.men}`).join('・'));
    確('合流が戦国記に残る', st.chronicle.some((e) => /後から着いた.*人が加わった/.test(e.text)));
    確('後の軍の兵も囲みに加わる', 囲む.reduce((t, a) => t + a.men, 0) >= (先兵 + 後兵) * 0.85,
      `${先兵 + 後兵} → ${囲む.reduce((t, a) => t + a.men, 0)}`);
  }

  console.log('\n── 二　印の無い援軍が、囲まれた自家の城へ着く');
  {
    const { s, 的 } = 盤を立てる('道中');
    const { st, 詰まり, 戦 } = await 走らせる(s, 4);
    確('画面が詰まらない', !詰まり);
    確('囲みを衝く合戦が開いた', 戦);
    確('援軍が囲む敵と当たった', st.chronicle.some((e) => e.text.includes(`${的.name}の囲みで`)),
      (st.chronicle.find((e) => e.text.includes(的.name)) || {}).text || 'なし');
    確('寄せ手の囲みは解けた', !st.sieges.some((x) => x.castleId === 的.id && x.armyId === '寄せ手'),
      JSON.stringify(st.sieges.filter((x) => x.castleId === 的.id)));
    確('戦国記に囲みでの野戦が残る', st.chronicle.some((e) => e.text.includes(`${的.name}の囲み`)));
  }

  console.log('\n── 三　すでに在陣している軍が、囲まれた城の後詰に立つ');
  {
    const { s, 的 } = 盤を立てる('在陣');
    const { st, 詰まり, 戦 } = await 走らせる(s, 4);
    確('画面が詰まらない', !詰まり);
    確('在陣のまま眺めず、囲みを衝く合戦が開いた', 戦 && st.chronicle.some((e) => e.text.includes(`${的.name}の囲みで`)));
    確('寄せ手の囲みは解けた', !st.sieges.some((x) => x.castleId === 的.id && x.armyId === '寄せ手'));
  }

  console.log('\n── 四　古い記録の取り残された軍は、見回りで囲みに戻る');
  {
    const { s, 的 } = 盤を立てる('寄せ');
    // 後の軍も城の前に着いて「囲み中」の印だけ負い、囲みの帳は後の軍に書き換わった形
    const 後 = s.armies.find((a) => a.id === '後'); 後.at = 的.id; 後.path = [的.id]; 後.sieging = true;
    s.sieges = [{ castleId: 的.id, armyId: '後', months: 2, decided: null }];
    H.盤の乱れを繕う(s);
    const 囲む = s.armies.filter((a) => a.at === 的.id && a.sieging);
    確('囲み中の軍は、どれも囲みの帳に載る', 囲む.every((a) => s.sieges.some((x) => x.armyId === a.id)),
      囲む.map((a) => a.id).join('・'));
  }

  console.log('確かめ:', 咎 ? `★${咎}件が通らなかった` : 'すべて通った');
  console.log('エラー:', 咎 ? `${咎}件` : (errs.length ? errs.slice(0, 2).join(' | ') : 'なし'));
  process.exit(咎 ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
