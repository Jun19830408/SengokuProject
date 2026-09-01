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

const { createRoot, act, App, React, initState, findPath, 解す, CastleSheet, 攻め寄せる問い } = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

/* ------------------------------- 城を落とし、その城を誰に委ねるかを問う画面 */
const s = initState('oda');
const 的 = s.castles.filter((c) => c.faction !== s.player)
  .map((c) => ({ c, p: findPath(c.id, s.castles.find((x) => x.faction === s.player).id) }))
  .filter((x) => x.p).sort((a, z) => a.p.length - z.p.length)[0].c;
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
的.local = 400; 的.def = 30; 的.hp = 300; 的.food = 300; 的.min = 40;
s.sieges = [{ castleId: 的.id, armyId: 'siegeArmy', months: 3, decided: null }];
console.log(`仕込み: ${出陣元.name}の軍が${的.name}（${s.factions[的.faction].name}）を包囲。将${将.length}名`);

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

const fmtN = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

(async () => {
  let 咎 = 0;
  const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎++; };

  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
  await rc('続きから'); await flush(); await flush();
  // 強攻して城を落とす
  await rc('強攻'); await flush(); await flush();
  await rc('合戦開始'); await flush();
  await rc('委ねて結果を見る'); await flush(); await flush(); await flush();
  for (let i = 0; i < 40 && !/を誰に委ねるか/.test(txt()); i++) {
    // 決着の画面をひととおり閉じる（戦場を離れ、始末を閉じる）
    if (!(await rc('戦場を離れる') || await rc('陣へ戻る') || await rc('閉じる')
      || await rc('次へ') || await rc('承知'))) await flush();
  }

  確('落としたあと、城を委ねる問いが出る', /を誰に委ねるか/.test(txt()),
    /を誰に委ねるか/.test(txt()) ? 的.name : txt().slice(0, 90));
  確('在陣であることが説かれている', /在陣/.test(txt()));
  確('城主の候補にこの軍の将が並ぶ', 将.some((x) => btn(x.name)),
    将.map((x) => x.name).filter((n) => btn(n)).join('・') || 'なし');
  確('空けたまま進む道もある', !!btn('空けたまま進む'));

  // 城主を選んで委ねる
  const 選 = 将.find((x) => btn(x.name));
  if (選) { await click(btn(選.name)); }
  const 決 = btn('に委ねる') || btn('この差配で決める');
  確('委ねる釦が出る', !!決, 決 ? 決.textContent.trim() : 'なし');
  if (決) { await click(決); await flush(); await flush(); }

  確('問いが閉じる', !/を誰に委ねるか/.test(txt()));

  /* 委ねた結果が盤に入っているか。画面の字ではなく、記録から読み出して確かめる。
     ここを見ずに「問いが閉じた」だけで済ませると、押しても何も起きぬ釦を
     通してしまう。

     記録は月送りのときに書かれるので、一月送ってから読む。送らねば、
     落城より前の記録を読んで「主が変わっていない」と咎めることになる。 */
  await rc('次月へ'); await flush(); await flush(); await flush();
  for (let i = 0; i < 12 && !蔵.get('sengoku:save1'); i++) await flush();
  const 記 = 蔵.get('sengoku:save1');
  if (!記) { 確('記録が残っている', false); }
  else {
    // 記録は圧して収めてある（save/pack.js）。生の JSON ではない
    const 盤 = JSON.parse(記.startsWith('z1:') ? 解す(記) : 記).state;
    const c2 = 盤.castles.find((x) => x.id === 的.id);
    const 主 = c2 && c2.lordId && 盤.generals.find((x) => x.id === c2.lordId);
    確('城の主が変わっている', !!c2 && c2.faction === 盤.player, c2 ? 盤.factions[c2.faction].name : '—');
    確('城主が据わっている', !!主, 主 ? 主.name : 'なし');
    確('その者の本領がこの城へ移っている', !!主 && 主.本領 === 的.id,
      主 ? `${主.name}の本領 → ${(盤.castles.find((x) => x.id === 主.本領) || {}).name}` : '—');
    確('その者は城に入っている', !!主 && 主.at === 的.id);
    確('差配待ちが空になっている', !(盤.委ねる待ち || []).length,
      JSON.stringify(盤.委ねる待ち || []));
    確('戦国記に、誰に委ねたかが残る',
      盤.chronicle.some((x) => /に委ねた/.test(x.text)),
      (盤.chronicle.filter((x) => /に委ねた/.test(x.text)).slice(-1)[0] || {}).text || 'なし');
  }

  /* ------------------------------- 在陣の軍を動かせること

     盤に「陣」の印が出るのに、押しても何もできず軍が宙に浮いていた。
     次の城へ攻め寄せるか、軍を解いて本領へ帰すかを、城の軍事から決められる。

     ここは城の帳そのものを描いて見る。地図の当て判定を通すと、戦のあとの
     視点や被さる窓に振り回されて、確かめたいところに辿り着けない。 */
  {
    const 盤 = JSON.parse(解す(蔵.get('sengoku:save1'))).state;
    const c2 = 盤.castles.find((x) => x.id === 的.id);
    const 陣 = (盤.armies || []).filter((a) => a.在陣 === 的.id && a.faction === 盤.player);
    確('落とした城に軍が在陣している', 陣.length === 1,
      陣.length ? `${fmtN(陣[0].men)}人・将${(陣[0].gens || []).length}名` : 'いない');

    const r2 = createRoot(document.getElementById('r2') || (() => {
      const d = document.createElement('div'); d.id = 'r2'; document.body.appendChild(d); return d;
    })());
    let 攻めた = null, 解いた = null;
    await act(async () => {
      r2.render(React.createElement(CastleSheet, {
        g: 盤, castle: c2, land: true, tab: '軍事', setTab: () => {},
        onClose: () => {}, onCommand: () => {}, onTrade: () => {}, onAppoint: () => {},
        onSortie: () => {}, onMarchOn: (id) => { 攻めた = id; }, onDisband: (id) => { 解いた = id; },
        onCallAid: () => {}, onDiplo: () => {}, onPlot: () => {}, onSpecial: () => {},
        onReward: () => {}, onCaptive: () => {}, onFief: () => {}, onRetire: () => {},
        onSettle: () => {}, onKenchi: () => {}, onHime: () => {},
      }));
    });
    await flush();
    const 帳 = document.getElementById('r2').textContent.replace(/\s+/g, ' ');
    確('在陣の軍が城の軍事に出る', /この城に在陣する軍/.test(帳),
      (帳.match(/この城に在陣する軍.{0,36}/) || [''])[0]);
    確('総勢と将と兵糧が読める', /総勢/.test(帳) && /兵糧/.test(帳));
    const 釦 = (t) => [...document.getElementById('r2').querySelectorAll('button')]
      .find((b) => b.textContent.includes(t) && !b.disabled);
    確('次の城へ攻め寄せる道がある', !!釦('次の城へ攻め寄せる'));
    確('軍を解く道がある', !!釦('軍を解く'));
    if (釦('次の城へ攻め寄せる')) {
      await act(async () => { 釦('次の城へ攻め寄せる').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
      await flush();
      確('押せば、その軍を指して呼ばれる', 攻めた === 陣[0].id, String(攻めた));
    }
    if (釦('軍を解く')) {
      await act(async () => { 釦('軍を解く').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
      await flush();
      確('軍を解くも、その軍を指して呼ばれる', 解いた === 陣[0].id, String(解いた));
    }

    // 攻め寄せる画面が、行き先を並べられること
    const r3 = createRoot((() => {
      const d = document.createElement('div'); d.id = 'r3'; document.body.appendChild(d); return d;
    })());
    let 行った = null;
    await act(async () => {
      r3.render(React.createElement(攻め寄せる問い, {
        g: 盤, armyId: 陣[0].id, onClose: () => {}, onGo: (a, t, y) => { 行った = [a, t, y]; },
      }));
    });
    await flush();
    const 窓 = document.getElementById('r3');
    const 窓文 = 窓.textContent.replace(/\s+/g, ' ');
    確('攻め寄せる画面が組める', /攻め寄せる/.test(窓文), 窓文.slice(0, 30));
    const 札 = [...窓.querySelectorAll('input[type=radio]')];
    確('行き先が並ぶ', 札.length > 0, `${札.length}件`);
    if (札.length) {
      await act(async () => { 札[0].click(); }); await flush();
      /* 在陣から次を攻めるときも、他の城から兵を催せること（GDD 7.3）。
         届く先は、この軍の総大将の身分による。 */
      const 窓文2 = 窓.textContent.replace(/\s+/g, ' ');
      確('寄騎を催す欄が出る', /寄騎を催す/.test(窓文2),
        (窓文2.match(/寄騎を催す.{0,44}/) || [''])[0]);
      確('陣触れの届く先が示される', /陣触れの届く先は/.test(窓文2));
      const 寄騎札 = [...窓.querySelectorAll('input[type=checkbox]')];
      確('催せる城が並ぶ（または催せる城が無いと断る）',
        寄騎札.length > 0 || /催せる城がありません/.test(窓文2),
        寄騎札.length ? `${寄騎札.length}城` : '催せる城なし');
      if (寄騎札.length) {
        await act(async () => { 寄騎札[0].click(); }); await flush();
        確('選べば釦に寄騎の人数が出る',
          [...窓.querySelectorAll('button')].some((b) => /寄騎[\d,]+人/.test(b.textContent)),
          ([...窓.querySelectorAll('button')].map((b) => b.textContent.trim())
            .find((t) => /寄騎/.test(t))) || 'なし');
      }

      const 進 = [...窓.querySelectorAll('button')].find((b) => /へ攻め寄せる/.test(b.textContent.trim()));
      確('行き先を選べば進める', !!進 && !進.disabled, 進 ? 進.textContent.trim() : 'なし');
      if (進) {
        await act(async () => { 進.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
        await flush();
        確('進めば、軍と行き先が渡される', !!行った && 行った[0] === 陣[0].id && !!行った[1],
          `軍 ${行った && 行った[0]}／行き先 ${行った && 行った[1]}`);
        確('選んだ寄騎も一緒に渡される', !行った || Array.isArray(行った[2]),
          `寄騎 ${行った && 行った[2] ? 行った[2].length : 0}城`);
      }
    }
  }

  console.log('確かめ:', 咎 ? `★${咎}件が通らなかった` : 'すべて通った');
  console.log('エラー:', errs.length ? errs.slice(0, 2).join(' | ') : 'なし');
  process.exit(咎 ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
