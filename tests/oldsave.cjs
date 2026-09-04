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
const { createRoot, act, App, React, initState, findPath, migrateSave, troopCap } = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

/* ------------------------------------------- 盤をこしらえる
   直す前の記録を模す。味方の城を狙う「戦役」が残り、その軍が既に着いている形。
   これが残っていると、直したあとも軍議が開かれ、味方を攻めることになる。 */
const s = initState('oda');
const 自城 = s.castles.filter((x) => x.faction === s.player);
const 出陣元 = 自城[0], 味方先 = 自城[1] || 自城[0];

const gens = s.generals.filter((x) => x.at === 出陣元.id && x.faction === s.player && !x.captive).slice(0, 2);
for (const t of gens) t.at = null;
s.armies.push({
  id: 'oldArmy', faction: s.player, from: 出陣元.id, gens: gens.map((x) => x.id),
  local: 2000, localTrain: 70, rost: null,
  men: 2000 + gens.reduce((a, x) => a + x.retinue, 0), at: 味方先.id,
  path: [味方先.id], prog: 0, food: 5000, target: 味方先.id, sieging: true,
});
// 直す前の作りでは、味方の城にもこれが立てられていた
s.campaigns = [{
  id: 'oldCamp', target: 味方先.id, from: 出陣元.id,
  leader: gens[0].id, leaderName: gens[0].name,
  armies: ['oldArmy'], arrived: ['oldArmy'], y: s.year, m: s.month, decided: null, waited: 0,
}];

const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s })]]);
dom.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
};
console.log(`仕込み: 直す前の記録を模す。味方の ${味方先.name} を狙う戦役が残り、軍は既に着陣している`);

const root = createRoot(document.getElementById('r'));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 5)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 450, clientY: 300 }));
const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
const btn = (t) => [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t) && !b.disabled);
const rc = async (t) => { const el = btn(t); if (!el) return false; await click(el); return true; };

(async () => {
  let 咎 = 0;
  const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎++; };

  /* ---------------------------------------- 石高の三段と軍役の器を繕う（GDD 4.6）

     田畑可能地・慶長の高・元禄の高は、盤を立てるときに据えている。ところが
     記録から読み込んだ盤には、書き込まれた当時の値がそのまま入っている。
     繕わなければ、続きから遊ぶ限り、田畑可能地は石高の一.一二五倍のまま、
     慶長の高は田畑可能地と同じままで、治水は永久に空打ちになる。
     遊ぶ側からは「直したはずのものが直っていない」と映る。実際そうなった。

     三段は「天文十五年の把握」を元に決まる。いまの石高ではない。開墾で
     増えたぶんまで元に取ると、開くほど天井が逃げていく。 */
  {
    const 旧 = initState('chosokabe');
    for (const c of 旧.castles) {
      c.kokuBase = Math.round(c.koku * 1.125);      // 昔の記録の姿に戻す
      c.kokuMax = Math.round(c.koku * 1.125);
      c.kokuCap = c.kokuMax;
      delete c.kokuGen;
    }
    for (const g of 旧.generals) delete g.retCap;
    const c0 = 旧.castles.find((c) => c.faction === 'chosokabe');
    const 元 = c0.koku;
    c0.koku = Math.round(元 * 1.06);                // 少し開墾が進んでいるものとする
    const 開いた田 = c0.koku;

    migrateSave(旧);

    確('古い記録でも、治水の余地が出る（限り＞田畑可能地）', c0.kokuCap > c0.kokuMax,
      `田畑可能地 ${c0.kokuMax} ／ 慶長の高 ${c0.kokuCap}`);
    確('古い記録でも、元禄の高が与えられる', c0.kokuGen > c0.kokuCap,
      `元禄の高 ${c0.kokuGen}`);
    確('三段は「元の石高」から決まる（開いた田で天井が逃げない）',
      Math.abs(c0.kokuGen - Math.round(元 * 2.051)) <= 2,
      `元の石高 ${元} × 2.051 ＝ ${Math.round(元 * 2.051)}`);
    確('繕いで、開いた田を取り上げない', c0.koku === 開いた田 && c0.kokuMax >= c0.koku,
      `石高 ${c0.koku}`);
    確('古い記録の武将に、軍役の器が与えられる',
      旧.generals.every((g) => g.retCap != null && g.retCap >= g.retinue),
      `${旧.generals.length}名`);

    /* 将のいない軍が浮いたまま残っている記録を繕う（GDD 6.4）。

       落とした城に将を残らず置くと、地の兵だけの軍が在陣し続けていた。
       すでにできてしまった軍は記録の中に残るので、読み込みのときに解く。
       兵は失わせない――出陣元へ返す。 */
    const 旧2 = initState('oda');
    const 城 = 旧2.castles.find((c) => c.faction === 'oda');
    const 元の兵 = 城.local;
    旧2.armies.push({ id: '浮いた軍', faction: 'oda', from: 城.id, gens: [],
      local: 1200, localTrain: 70, rost: null, men: 1200,
      at: 城.id, path: [城.id], prog: 0, food: 3000, target: null, 在陣: 城.id });
    旧2.sieges = [{ castleId: 城.id, armyId: '浮いた軍', months: 1, decided: null }];
    migrateSave(旧2);
    確('将のいない軍は、読み込みのときに解かれる',
      !(旧2.armies || []).some((a) => a.id === '浮いた軍'),
      (旧2.armies || []).some((a) => a.id === '浮いた軍') ? '残っている' : '解けた');
    確('その兵は失われず、城へ返る',
      旧2.castles.find((c) => c.id === 城.id).local >= 元の兵 + 1200,
      `${城.name} ${元の兵}人 → ${旧2.castles.find((c) => c.id === 城.id).local}人`);
    確('囲みの控えも一緒に片づく',
      !(旧2.sieges || []).some((x) => x.armyId === '浮いた軍'));
  }

  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
  await rc('続きから'); await flush(); await flush(); await flush();

  const 文 = document.body.textContent;
  確('続きから開ける', /1546年/.test(文));
  確('味方の城に軍議（攻めかかる）が出ない', !/攻めかかる/.test(文),
    /攻めかかる/.test(文) ? (文.match(/[^。]{0,50}攻めかかる/) || [''])[0] : '');

  // 月を送っても出てこないこと
  for (let m = 0; m < 3; m++) {
    if (!(await rc('次月へ'))) break;
    await flush(); await flush();
    for (const b of ['閉じる', '了']) if (await rc(b)) break;
  }
  確('月を送っても軍議が出ない', !/攻めかかる/.test(document.body.textContent));

  console.log('確かめ:', 咎 ? `★${咎}件が通らなかった` : 'すべて通った');
  console.log('エラー:', errs.length ? errs.slice(0, 2).join(' | ') : 'なし');
  process.exit(咎 ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
