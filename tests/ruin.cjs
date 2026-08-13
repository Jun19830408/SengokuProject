// 大名を滅ぼしたとき、残った者の身の振り方を問われるかを見る試験。
//
// 城攻めで最後の城を落とすと、
//   ・捕らえた武将は「捕虜の処遇」で問われる
//   ・残った当主と家臣は「滅亡の始末」で一人ずつ問われる（斬る／捕らえる／召し抱える）
// この二つが出ないまま滅亡だけが進んでいた。原因は三つ。
//   一、城攻めの決着が s.captives に積んでいなかった（野戦の側では積んでいた）
//   二、捕縛の処理が dest という在りもしない名を参照し、例外で始末が流れていた
//   三、討死の裁きが落城のあとにあり、滅亡の始末の列の先頭を消していた
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
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 200));

let 種 = 0x9A11;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
dom.window.Math.random = Math.random;

const { createRoot, act, App, React, initState, findPath } = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

/* ------------------------------- 城が一つだけの家を、包囲したところから始める */
const s = initState('oda');
const 数 = {};
for (const c of s.castles) 数[c.faction] = (数[c.faction] || 0) + 1;
const 相手 = Object.keys(数).filter((f) => 数[f] === 1 && f !== s.player
  && s.generals.filter((g) => g.faction === f).length >= 3)[0];
if (!相手) { console.log('エラー: 城が一つだけの家が見つからない'); process.exit(1); }
const 的 = s.castles.find((c) => c.faction === 相手);
const 出陣元 = s.castles.filter((c) => c.faction === s.player)
  .map((c) => ({ c, p: findPath(c.id, 的.id) })).filter((x) => x.p)
  .sort((a, z) => a.p.length - z.p.length)[0].c;
const 将 = s.generals.filter((x) => x.at === 出陣元.id && x.faction === s.player && !x.captive).slice(0, 3);
for (const t of 将) t.at = null;
s.armies.push({
  id: 'siegeArmy', faction: s.player, from: 出陣元.id, gens: 将.map((x) => x.id),
  local: 14000, localTrain: 90, rost: null,
  men: 14000 + 将.reduce((t, x) => t + x.retinue, 0), at: 的.id,
  path: [的.id], prog: 0, food: 99999, target: 的.id, sieging: true,
});
// 落とせるだけの差をつける。武将は城に残す（身の振り方を問う相手が要る）
的.local = 500; 的.def = 40; 的.hp = 400; 的.food = 500; 的.min = 40;
s.sieges = [{ castleId: 的.id, armyId: 'siegeArmy', months: 3, decided: null }];
const 城将 = s.generals.filter((x) => x.faction === 相手 && x.at === 的.id);
console.log(`仕込み: ${s.factions[相手].name}（残る城は ${的.name} ただ一つ）を ${出陣元.name} の軍が包囲`);
console.log(`  城にいる${s.factions[相手].name}の将 ${城将.length}名: ${城将.map((x) => x.name + (x.lord ? '【当主】' : '')).join(' / ')}`);

const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s })]]);
dom.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
};

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

(async () => {
  let 咎 = 0;
  const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎++; };

  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
  await rc('続きから'); await flush(); await flush();
  確('包囲の段が出る', !!btn('強攻'));
  if (!btn('強攻')) { console.log('エラー: 包囲の段が出ない'); process.exit(1); }
  await rc('強攻'); await flush(); await flush();
  確('城郭図に入る', /城攻め/.test(txt()));
  if (!(await rc('合戦開始'))) { console.log('エラー: 合戦を始められない'); process.exit(1); }
  await rc('委ねて結果を見る');
  for (let k = 0; k < 6000; k++) {
    const q = [...rafMap.entries()]; rafMap.clear();
    if (q.length) await act(async () => { q.forEach(([, cb]) => cb(2000 + k * 90)); });
    else await flush();
    if (btn('戦場を離れる')) break;
  }
  確('決着がつく', !!btn('戦場を離れる'));
  await rc('戦場を離れる'); await flush(); await flush();

  const 文1 = txt();
  確('城が落ちた', /が落ち、/.test(文1) || /滅亡/.test(文1) || /身の振り方/.test(文1),
    (文1.match(/[^\s。]{0,20}が落ち、[^。]{0,30}。/) || [])[0] || '');

  /* 滅亡の始末と、捕虜の処遇。どちらか、または両方が出るはず。 */
  let 始末 = 0, 捕虜 = 0, 見た = [];
  for (let i = 0; i < 30; i++) {
    const t = txt();
    if (/滅亡/.test(t) && /身の振り方を定めます/.test(t)) {
      始末++;
      const 名 = (t.match(/身の振り方を定めます。\s*([^\s（【]{2,8})/) || [])[1] || '';
      見た.push(`始末:${名}`);
      // 一人ずつ、召し抱えるか捕らえるかを選ぶ
      if (!(await rc('召し抱える') || await rc('仕えさせる') || await rc('捕らえる') || await rc('斬る'))) break;
      await flush(); continue;
    }
    if (/を捕らえた/.test(t) && /捕虜とする/.test(t)) {
      捕虜++;
      const 名 = (t.match(/([^\s]{2,8})を捕らえた/) || [])[1] || '';
      見た.push(`捕虜:${名}`);
      if (!(await rc('捕虜とする'))) break;
      await flush(); continue;
    }
    if (await rc('評定を開く')) { await flush(); continue; }
    break;
  }
  確('滅亡の始末を問われる', 始末 > 0, `${始末}名`);
  確('捕虜の処遇を問われる（捕らえた者がいれば）', 捕虜 > 0 || 始末 > 0, `捕虜 ${捕虜}名`);
  console.log('  問われた順: ' + (見た.join(' / ') || 'なし'));

  // 滅亡は戦国記に残る（画面に出る一言は月初報告に回る）
  await flush();
  for (const t of ['閉じる', '← 戻る']) await rc(t);
  await rc('戦国記'); await flush();
  const 文2 = txt();
  確('滅亡が戦国記に残る', /最後の城を失い、滅亡した/.test(文2),
    (文2.match(/[^\s。]{0,12}は最後の城を失い、滅亡した。/) || [])[0] || '');
  // 城が渡った先も残っていること
  確('落城が戦国記に残る', /が落ち、/.test(文2),
    (文2.match(/[^\s。]{0,20}が落ち、[^。]{0,30}。/) || [])[0] || '');
  await rc('閉じる'); await flush();

  確('問いのあと、画面が政略図へ戻る', /次月へ/.test(txt()));

  /* 滅んだ家の八名が、一人残らず行方の知れた状態になっていること。
     討死・捕縛・召し抱え・斬首・始末の問い、いずれかを通っているはずである。
     どれも通らずに残ると、滅んだ家の家臣のまま盤上をさまようことになる。 */
  await rc('戦国記'); await flush();
  const 記 = txt();
  await rc('閉じる'); await flush();
  const 行方知れず = 城将.filter((x) => !記.includes(x.name) && !見た.some((v) => v.includes(x.name)));
  確('滅んだ家の者は全員、行方が知れている', 行方知れず.length === 0,
    `${城将.length}名中 ${城将.length - 行方知れず.length}名`
    + (行方知れず.length ? `　★不明: ${行方知れず.map((x) => x.name).join('・')}` : ''));

  // 例外が起きていないこと（dest の参照はここで露見していた）
  const 例外 = errs.filter((e) => /is not defined|undefined/.test(e));
  確('例外が起きていない', 例外.length === 0, 例外[0] || '');

  console.log('');
  console.log('エラー:', 咎 ? `${咎}件` : 'なし');
  process.exit(咎 ? 1 : 0);
})().catch((e) => { console.log('例外:', e.message.slice(0, 200)); console.log('エラー: 例外'); process.exit(1); });
