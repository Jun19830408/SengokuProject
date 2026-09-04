/* 後詰（GDD 9.2）。

   自家の城へ敵の軍が向かい、同じ月に他の城から援軍を出した。ところが援軍は
   野戦に加わらず、黙って入城した。城下の野戦は城の守兵だけで戦って敗れ、
   城攻めに移ってから、援軍が城の中の守兵として現れた。
   援軍を出したのに、間に合わなかったようにしか見えない。

   訳は二つあった。
     一、着いた軍の捌き順が定まっておらず、味方の援軍が先に処理されると、
         その場で入城してしまい、あとの野戦には出られない。
     二、敵の到着を捌くとき、同じ城へ向かっている味方の軍を見ていなかった。

   直したのは、
     一、敵地への到着を先に捌く（月送りの pendingArrivals の並べ方）
     二、敵が自家の城へ着いたとき、同じ城へ着いた味方の軍があれば、
         そちらを主として城下の野戦にする。城方にも討って出る機会を与える
     三、敵の軍が自家の城へ向かい始めたら、着く前に告げる（危急の報せ）。
         行軍はどれも一月はかかるので、着いてから出したのでは間に合わない。 */
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
console.error = () => {};
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, App, React, initState, findPath } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* ---------------------------------------------------------- 盤を仕込む

   自家の城（狙われる城）へ敵の軍が着き、同じ月に別の自家の城から援軍も着く。
   どちらも道の残りが一区間なので、この月に両方が着く。 */
function 仕込む(在陣) {
  const s = initState('oda');
  const 自城 = s.castles.filter((x) => x.faction === s.player);
  let 狙 = null, 敵城 = null, 出城 = null;
  for (const c of 自城) {
    const e = s.castles.find((d) => d.faction !== s.player && !d.faction.startsWith('_')
      && (findPath(c.id, d.id) || []).length === 2);
    const 別 = 自城.find((d) => d !== c && (findPath(c.id, d.id) || []).length === 2);
    if (e && 別) { 狙 = c; 敵城 = e; 出城 = 別; break; }
  }
  if (!狙) return null;
  狙.local = 1500; 狙.food = 40000;

  // 敵の軍（狙われる城へ、あと一区間）
  const 敵将 = s.generals.filter((x) => x.at === 敵城.id && x.faction === 敵城.faction && !x.captive).slice(0, 2);
  for (const t of 敵将) t.at = null;
  const 敵軍 = {
    id: 'foe-army', faction: 敵城.faction, from: 敵城.id, gens: 敵将.map((x) => x.id),
    local: 2600, localTrain: 70, rost: null,
    men: 2600 + 敵将.reduce((a, x) => a + x.retinue, 0),
    at: 狙.id, path: [狙.id], prog: 0, food: 9000, target: 狙.id,
  };
  // 自家の援軍（同じ城へ、あと一区間）
  const 味将 = s.generals.filter((x) => x.at === 出城.id && x.faction === s.player && !x.captive).slice(0, 2);
  for (const t of 味将) t.at = null;
  const 援軍 = {
    id: 'aid-army', faction: s.player, from: 出城.id, gens: 味将.map((x) => x.id),
    local: 1800, localTrain: 70, rost: null,
    men: 1800 + 味将.reduce((a, x) => a + x.retinue, 0),
    at: 狙.id, path: [狙.id], prog: 0, food: 6000, target: 狙.id,
  };
  s.armies.push(援軍, 敵軍);                      // 味方を先に並べる（直す前はこの順で捌かれた）
  s.pendingArrivals = [援軍.id, 敵軍.id];
  if (在陣) {
    /* 二度目の寄せ。援軍は先月のうちに着き、城の下に陣を張ったまま留まっている。
       同じ月に着いた軍ではないので、着陣の列には並ばない。 */
    援軍.在陣 = 狙.id; 援軍.target = null;
    s.pendingArrivals = [敵軍.id];
  }
  s.monthEvents = [];
  return { s, 狙, 敵城, 出城, 敵軍, 援軍, 味将 };
}

/* ------------------------------- 一、盤を仕込めること */
{
  const 仕 = 仕込む();
  if (!仕) { console.log('  （仕込める城の並びが無い）'); process.exit(1); }
  確('盤を仕込めた', !!仕.狙 && !!仕.敵軍 && !!仕.援軍,
    `${仕.狙.name}へ 敵${仕.敵軍.men}人・味方${仕.援軍.men}人が同じ月に着く`
    + `（味方を先に並べてある。直す前はこの順で入城していた）`);
}

/* --------------- 二、画面で捌く。城下の野戦になり、援軍が加わること */
const 仕 = 仕込む();
const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: 仕.s })]]);
dom.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
};

const root = createRoot(document.getElementById('r'));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 450, clientY: 300 }));
const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
const btn = (t) => [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t) && !b.disabled);
const rc = async (t) => { const el = btn(t); if (!el) return false; await click(el); return true; };

(async () => {
  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
  await rc('続きから'); await flush(); await flush(); await flush();

  const 文 = document.body.textContent;
  確('城下の野戦の前に、討って出るかを問われる', /討って出るか/.test(文),
    /討って出るか/.test(文) ? '' : 文.slice(0, 160));
  確('その問いは「城下」の形で出る', /援軍とともに城下で迎え撃/.test(文),
    /援軍とともに城下で迎え撃/.test(文) ? '' : '囲みの文言のままになっている');

  // 討って出ずに、援軍だけで当たる
  確('討って出る釦がある', !!btn('討って出る'), btn('討って出る') ? btn('討って出る').textContent.trim() : 'ない');
  /* 討って出る。城方の兵も盤に出るはずである。
     ここで奇襲の献策が挟まると、相手の軍と出撃の兵が落ちていた（下の判じ）。 */
  const 出撃の釦 = btn('討って出る');
  const 出撃兵 = 出撃の釦 ? Number((出撃の釦.textContent.match(/([\d,]+)人/) || [0, '0'])[1].replace(/,/g, '')) : 0;
  await rc('討って出る');
  await flush(); await flush();
  // 寡兵であれば奇襲の献策が出る。ここでは正面から当たる。
  if (btn('正面から当たる')) { await rc('正面から当たる'); await flush(); await flush(); }

  const 文2 = document.body.textContent;
  const 見出し = [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter(Boolean).slice(0, 12);
  確('城下の野戦が始まる（城攻めではない）',
    /采配|鶴翼|魚鱗|合戦開始|布陣/.test(文2) && !/軍議/.test(文2),
    見出し.join('／').slice(0, 160));
  確('盤の名は城下である', /城下/.test(文2), '');

  /* 盤に立っているのは援軍か。上部の兵数で見る。
     討って出た城方の兵も同じ側に立つので、そのぶんを差し引いて援軍と突き合わせる
     （討って出るのが正しく働くようになったので、測り方を書き直した）。 */
  /* 上部の帯は style を含む body 全体の頭ではなく、帯そのものから読む。 */
  const 帯 = [...document.querySelectorAll('div')]
    .map((d) => d.textContent.replace(/\s+/g, ' '))
    .find((t) => /兵\s*[\d,]+.*対.*兵\s*[\d,]+/.test(t) && t.length < 400) || '';
  const 頭 = 帯;
  const 数 = [...頭.matchAll(/兵\s*([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, '')));
  確('盤に立っているのは援軍である（城の守兵だけではない）',
    数.length >= 2 && Math.abs((数[0] - 出撃兵) - 仕.援軍.men) < 仕.援軍.men * 0.25,
    数.length ? `味方${数[0]}人 － 討って出た${出撃兵}人 ＝ ${数[0] - 出撃兵}人（援軍${仕.援軍.men}人）` : 頭.slice(0, 80));
  /* 相手は城ではなく、寄せ手の軍である。

     もとの判じは「城の守兵より多いこと」しか見ておらず、相手が城になっていても
     通ってしまった（那古野城の守兵は将の手勢を合わせると寄せ手より多い）。
     人数ではなく、寄せ手の軍そのものと突き合わせる。 */
  const 敵家 = 仕.s.factions[仕.敵軍.faction].name;
  const 自家 = 仕.s.factions[仕.s.player].name;
  const 帯の家 = [...頭.matchAll(/(?:対)?\s*([一-龥ぁ-んァ-ヶ]{2,8}?家|[一-龥]{2,6}一向宗|[一-龥]{2,6}衆)\s*兵/g)]
    .map((m) => m[1].replace(/^対/, ''));
  確('帯の相手は、寄せ手の家である（自家同士の戦になっていない）',
    帯の家.length >= 2 && 帯の家[1] === 敵家,
    `帯：${帯の家.join(' 対 ') || '読めず'}（自家 ${自家}／寄せ手 ${敵家}）`);
  確('相手の兵は、寄せ手の軍の兵である（城の守兵ではない）',
    数.length >= 2 && Math.abs(数[1] - 仕.敵軍.men) < 仕.敵軍.men * 0.25,
    数.length >= 2 ? `敵${数[1]}人（寄せ手の軍${仕.敵軍.men}人・城の守兵${仕.狙.local}人）` : '');
  /* 討って出た兵は、こちらの側に立つ。
     奇襲の献策を挟むと、出撃そのものが落ちていた。 */
  確('討って出た城方の兵が、こちらの側に立っている',
    出撃兵 > 0 && 数.length >= 1 && 数[0] >= (仕.援軍.men + 出撃兵) * 0.8,
    `自軍${数[0]}人（援軍${仕.援軍.men}人＋討って出た${出撃兵}人）`);

  /* --------- 三、二度目の寄せ。すでに在陣している援軍が迎え撃つこと

     援軍は味方の城に着いても城には入らず、城の下に陣を張って留まる（GDD 6.4）。
     入ってしまえば城兵の一部になり、次の月にまた寄せられたときには
     「援軍を出した」ことの意味が消える。城攻めは幾度も繰り返されるのだから、
     在陣したまま、二度目にも城下で迎え撃たねばならない。

     着いた月の軍は着陣の列に並ぶが、在陣の軍は並ばない。列だけを見ていたので、
     在陣の軍は後詰に立てず、城が独りで受けることになっていた。 */
  console.log('\n── 三　すでに在陣している援軍が、二度目の寄せを迎え撃つ');
  {
    const 仕2 = 仕込む(true);
    蔵.set('sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: 仕2.s }));
    /* 一つ目の画面を畳んでから開き直す。畳まずに二つ目を出すと、釦を探すときに
       一つ目の盤の釦まで拾ってしまい、押したつもりのないものを押すことになる。 */
    await act(async () => { root.unmount(); });
    const el2 = document.createElement('div'); el2.id = 'r2'; document.body.appendChild(el2);
    const root2 = createRoot(el2);
    await act(async () => { root2.render(React.createElement(App)); }); await flush(); await flush();
    await rc('続きから'); await flush(); await flush(); await flush();
    const 文3 = document.body.textContent;
    確('在陣の軍がいれば、城下の野戦になる（討って出るかを問われる）',
      /討って出るか/.test(文3), /討って出るか/.test(文3) ? '' : '城が独りで受けている');
    確('その問いも「城下」の形で出る', /援軍とともに城下で迎え撃/.test(文3),
      /援軍とともに城下で迎え撃/.test(文3) ? '' : '囲みの文言になっている');
    await rc('籠もったまま'); await flush(); await flush();
    if (btn('正面から当たる')) { await rc('正面から当たる'); await flush(); await flush(); }
    const 帯3 = [...document.querySelectorAll('div')]
      .map((d) => d.textContent.replace(/\s+/g, ' '))
      .find((t) => /兵\s*[\d,]+.*対.*兵\s*[\d,]+/.test(t) && t.length < 400) || '';
    const 数3 = [...帯3.matchAll(/兵\s*([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, '')));
    確('盤に立っているのは在陣の援軍である',
      数3.length >= 2 && Math.abs(数3[0] - 仕2.援軍.men) < 仕2.援軍.men * 0.25,
      数3.length ? `味方${数3[0]}人（在陣の援軍${仕2.援軍.men}人・城の守兵${仕2.狙.local}人）` : 帯3.slice(0, 80));
  }

  console.log('');
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
