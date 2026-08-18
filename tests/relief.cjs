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

   この試験は、囲みが解かれるまでに何月かを要する。その間に寄せ手が強攻に出るか、
   城が耐えるか、後詰が間に合うかが賽の目で変わり、十二回に一度ほど落ちていた。
   落ちるたびに「どこか壊れたのか」と調べ直すことになるので、目を固定する。

   ただし、合戦の仕組みに手を入れると賽の目の流れそのものが変わり、
   同じ種でも筋書きが変わる。ここが落ちたときは、まず種を変えて試されたい。
   （RELIEF_SEED=111 のように外から渡せる。いくつか試して大半で通るなら、
   壊れたのではなく巡り合わせである。壊れていれば、どの種でも通らない。） */
let 種 = Number(process.env.RELIEF_SEED || 111);
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
// いちばん近い組を選ぶ。遠いと、後詰が着く前に城が落ちてしまう。
let 最短 = 99;
for (const a of 自城) {
  for (const b of 自城) {
    if (a.id === b.id) continue;
    const p = findPath(a.id, b.id);
    if (p && p.length >= 2 && p.length < 最短) { 出陣元 = a; 味方先 = b; 最短 = p.length; }
  }
}
if (!出陣元) { console.log('★自家の城が二つ以上つながっていない'); console.log('エラー: 仕込めず'); process.exit(1); }

/* 味方先を敵に囲ませる。

   ただし、囲まれた城が後詰の着く前に落ちては、この試験は何も確かめられない。
   （以前はそれで五回に二回ほど落ちていた。戦国記を見ると、着いたころには
   その城がすでに寄せ手のものになっていた。）
   城には十分な兵糧と民忠を持たせ、寄せ手は強攻に踏み切れぬ程度の数に留める。
   強攻の目が立つのは「寄せ手が城方の一・六倍を超えるとき」である。 */
let 敵 = null;
for (const d of s.castles) { if (d.faction !== s.player) { const p = findPath(d.id, 味方先.id); if (p && p.length <= 3) { 敵 = d; break; } } }
味方先.local = 4000; 味方先.food = 90000; 味方先.def = 80; 味方先.min = 95; 味方先.hp = 4000;
if (敵) {
  const eg = s.generals.filter((x) => x.at === 敵.id && x.faction === 敵.faction && !x.captive).slice(0, 2);
  for (const t of eg) t.at = null;
  s.armies.push({
    id: 'besieger', faction: 敵.faction, from: 敵.id, gens: eg.map((x) => x.id),
    local: 3000, localTrain: 70, rost: null,
    men: 3000 + eg.reduce((t, x) => t + x.retinue, 0), at: 味方先.id,
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

  // 囲まれた味方の城を目標に選ぶ
  await act(async () => { sel.value = 味方先.id; sel.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
  await flush();
  確('囲まれた味方の城を目標にできる', sel.value === 味方先.id);
  const 出た = await rc('人で進発');
  確('後詰として進発できる', 出た);

  /* 盤が開いたら、委ねて片づける。

     自城が囲まれているので、月送りの前に城方の腹を決めねばならない。
     ところが「籠城して待つ」を選ぶと、三割ほどの目で寄せ手が攻めかかり、
     防戦の盤が開く（MapScreen の onSiegeChoice）。これは正しい振る舞いである。
     ここで諦めていたため、この試験は五回に二回ほど落ちていた。
     盤が開いたら委ねて決着させ、後詰が着くまで月を送り続ける。 */
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

  // 着くまで月を送る
  /* 開いている札をすべて閉じる。
     月初報告を閉じる釦は「評定を開く」である（panels.jsx の MonthReport）。
     一つ閉じたら止める、という書き方だと札が重なったときに閉じ残す。
     閉じるものが無くなるまで繰り返す。 */
  const 札を閉じる = async () => {
    for (let i = 0; i < 6; i++) {
      let 閉じた = false;
      for (const t of ['評定を開く', '閉じる', '了', '確かめた']) {
        if (await rc(t)) { 閉じた = true; break; }
      }
      if (!閉じた) break;
      await flush();
    }
  };
  /* 月を送る。
     「次月へ」は battle・openSiege・openCamp のいずれかが開いていると押せない。
     段の名前は仕組みを直すたびに変わりうるので（包囲の段は「籠城して待つ」の
     こともあれば「兵糧攻め」のこともある）、名を追いかけるのはやめ、
     押せるようになるまで、開いている段を片端から片づける。 */
  const 月を送る = async () => {
    for (let i = 0; i < 10; i++) {
      if (await rc('次月へ')) { await flush(); await flush(); return true; }
      if (await 戦を片づける()) continue;            // 盤が開いていた
      let 片づけた = false;
      for (const t of ['籠城して待つ', '耐える', '守りを固める', '兵糧攻め',
        '評定を開く', '閉じる', '了', '確かめた']) {
        if (await rc(t)) { 片づけた = true; break; }
      }
      if (!片づけた) return false;
      await flush();
    }
    return false;
  };
  let 着 = false;
  for (let m = 0; m < 14 && !着; m++) {
    if (!(await 月を送る())) {
      const 釦 = [...document.querySelectorAll('button')]
        .map((b) => b.textContent.trim().slice(0, 12) + (b.disabled ? '[不可]' : '')).filter(Boolean);
      console.log(`    [${m + 1}] 月を送れない。釦: ${釦.slice(0, 14).join(' / ')}`);
      break;
    }
    if (/討って出るか/.test(document.body.textContent)) { 着 = true; break; }
  }
  if (!着) {
    for (const t of ['評定を開く', '閉じる']) await rc(t);
    await rc('戦国記'); await flush();
    const card = document.querySelector('.card');
    const 記 = card ? card.textContent.replace(/\s+/g, ' ') : '';
    console.log('    戦国記: ' + 記.slice(0, 420));
    await rc('閉じる'); await flush();
  }
  確('着陣すると「討って出るか」を問われる', 着);
  if (!着) { console.log('エラー: 後詰が着かない'); console.log('エラー: なし'); process.exit(1); }

  const 文 = document.body.textContent;
  確('城を空にせぬ断りがある', /守備の最低数は城に残ります/.test(文));
  確('討って出る武将を選べる', document.querySelectorAll('.modal input[type=checkbox]').length > 0);

  const 出撃 = [...document.querySelectorAll('button')].find((b) => /人で討って出る/.test(b.textContent));
  確('討って出られる', !!出撃 && !出撃.disabled, 出撃 ? 出撃.textContent.trim() : 'なし');
  if (出撃) await click(出撃);
  await flush(); await flush();

  const 戦文 = document.body.textContent;
  確('囲みを解く野戦が始まる', /合戦開始|布陣/.test(戦文) || !!btn('合戦開始'));

  // 委ねて決着まで
  if (btn('委ねて結果を見る')) {
    await rc('委ねて結果を見る');
    let 待 = 0;
    while (!btn('戦場を離れる') && 待 < 900) { await flush(); 待++; }
    確('決着がつく', !!btn('戦場を離れる'));
    await rc('戦場を離れる'); await flush(); await flush();
    const 後 = document.body.textContent;
    確('城方が討って出た旨が記される', /討って出た/.test(後) || /囲み/.test(後));
  }

  console.log('確かめ:', 咎 ? `★${咎}件が通らなかった` : 'すべて通った');
  console.log('エラー:', errs.length ? errs.slice(0, 2).join(' | ') : 'なし');
  process.exit(咎 ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
