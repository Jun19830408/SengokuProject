/* ============================================================
   風雲モード（五の三の骨組み）の試験
     hitori/fuun.js（風雲の理）・hitori/FuunYashiki.jsx（屋敷の画面）・
     ui/MapScreen.jsx の風雲の分かれ道・ui/Title.jsx と ui/App.jsx の三つのモード

   遊ぶ人の申し出：「キャンペーンモード 風雲モード 合戦モード でいきましょうか」。風雲モードは、
   大名ではなく一人の侍（はじめは足軽）としてキャンペーンの世界に生きる。この段で作った骨組み：
     一、理（画面なし）：始め方・月の行い・合戦のあとの勲功と取り立て・討死・上司の戦の見分け・
         大名に宛てた問いの自動の答え
     二、背中の理の備え：主人公の体力で立ち、盤に b.一人働き（討ち取り・体力・討死）を書く。
         備えを渡さぬ一人働き（関ヶ原の試し入り口）はこれまでどおり
     三、題の画面：三つのモード。風雲モードで仕える家を選び、屋敷の画面で月の行いを選んで月を送る
     四、上司の野戦：見物と同じに諸家をAIに任せていても、上司のいる城へ敵が着けば盤が開き、
         出陣前の問いを経ずに足軽として戦う。戦場を離れれば、働きが勲功に積まれて取り立てられる
   を確かめる。
   ============================================================ */
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
  if (p === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
  return () => ({ addColorStop: () => {} });
} });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 960; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 600; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, width: 960, height: 600, right: 960, bottom: 600 };
};
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 200));
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, App, React, initState } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎.push(名); };
let 種 = 0x5F11;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* 記録の置き場（jsdom には無いので、Map で据える） */
const 蔵 = new Map();
dom.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
  list: async (p) => ({ keys: [...蔵.keys()].filter((k) => !p || k.startsWith(p)) }),
};

const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 480, clientY: 300 }));
const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
const btn = (t) => [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t) && !b.disabled);
const btnAny = (t) => [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t));
const rc = async (t) => { const el = btn(t); if (!el) return false; await click(el); return true; };
const 文 = () => document.body.textContent;
const openFaction = async (nm) => {
  const el = [...document.querySelectorAll('.mn')].find((e) => e.textContent.trim() === nm);
  if (!el) return false;
  await click(el.parentElement);
  return true;
};

(async () => {
  /* ======================================================= 一、理（画面なし） */
  console.log('\n── 一　風雲の理（画面なし）');
  {
    const s = initState('oda');
    H.風雲を始める(s);
    const f = s.風雲;
    const 上 = s.generals.find((x) => x.id === f.上司);
    確('足軽として始まる（勲功〇・身分 足軽）', f.身分 === '足軽' && f.勲功 === 0 && f.討死 === null);
    確('住む城は家の本拠', f.城 === s.factions.oda.本拠, f.城);
    確('上司は家の者で、本拠にいる', !!上 && 上.faction === 'oda' && 上.at === f.城, 上 ? 上.name : 'なし');
    確('諸家も主家もAIに任せる（見物と同じ）', s.autoPlay === true);
    確('始めの記が一つ', (f.記 || []).length === 1, (f.記[0] || {}).文);

    /* 月の行い：入りを先に、出を後に（選んだ順は問わない） */
    f.金 = 2; f.武勇 = 45; f.政務 = 20; f.覚え = 50; f.体力 = 90;
    f.行い = ['上納', '稽古', '開墾・商い'];
    H.風雲の月の初め(s);
    確('開墾・商いで金二貫を得て、稽古（一貫）と上納（二貫）を同じ月に行える', f.金 === 1 && f.武勇 === 46 && f.政務 === 21 && f.覚え === 55,
      `金${f.金}・武勇${f.武勇}・政務${f.政務}・覚え${f.覚え}`);
    確('月を越せば体力が戻る（百まで）', f.体力 === 100, `体力${f.体力}`);
    f.金 = 0; f.行い = ['上納', '稽古']; H.風雲の月の初め(s);
    確('金が足りなければ、金の要る行いは行えない', f.金 === 0 && f.武勇 === 46 && f.覚え === 55);
    f.行い = ['稽古', '開墾・商い', '上納', '交流']; f.金 = 10; H.風雲の月の初め(s);
    確('行いは三つまで（四つ目は行わない）', f.知略 === 25, `知略${f.知略}`);

    /* 盤へ渡す主人公 */
    const 一人 = H.風雲の一人(s);
    確('盤へ渡す主人公：足軽・上司の隊・体力・武勇・一度きり', 一人.身分 === '足軽' && 一人.隊id === f.上司 && 一人.体力 === f.体力
      && 一人.武勇 === f.武勇 && 一人.一度きり === true && 一人.風雲 === true);
    確('盤の身分：物頭に届くまでは足軽と同じ', H.盤の身分('百人長') === '足軽' && H.盤の身分('物頭') === '物頭');

    /* 合戦のあと：討ち取りが勲功に積まれ、目安に届けば取り立てる */
    H.戦の勲功を記す(s, { result: 'P', 一人働き: { 討ち取り: 3, 体力: 64, 討死: false } }, '那古野城');
    確('討ち取りが勲功に積まれ、手傷が体力に残る', f.勲功 === 3 && f.合戦 === 1 && f.討ち取り === 3 && f.体力 === 64,
      `勲功${f.勲功}・合戦${f.合戦}・体力${f.体力}`);
    確('まだ十人長ではない（目安 五）', f.身分 === '足軽');
    H.戦の勲功を記す(s, { result: 'E', 一人働き: { 討ち取り: 2, 体力: 40, 討死: false } }, '鳴海城');
    確('勲功が五に届けば十人長に取り立てられる', f.身分 === '十人長' && (f.知らせ || []).length === 1, `${f.身分}・知らせ「${(f.知らせ || [])[0]}」`);
    確('取り立ての記が残る（住まいも替わる）', /十人長に取り立てられた.*小さな家/.test((f.記[f.記.length - 1] || {}).文 || ''), (f.記[f.記.length - 1] || {}).文);
    H.戦の勲功を記す(s, { result: 'P' }, '');
    確('一人視点に降りずに終えた合戦は、討ち取り〇で数える', f.合戦 === 3 && f.勲功 === 5);

    /* 上司の戦の見分け */
    const 敵城 = s.castles.find((c) => c.faction !== 'oda' && !String(c.faction).startsWith('_'));
    const 自城 = s.castles.find((c) => c.faction === 'oda' && c.id !== f.城);
    const 我軍 = { id: 'A1', faction: 'oda', gens: [f.上司], at: 敵城.id };
    const 敵軍 = { id: 'B1', faction: 敵城.faction, gens: [], at: f.城 };
    確('上司の軍が敵の城へ着けば戦', H.風雲の戦か(s, 我軍, 敵城, null) === true);
    確('上司の軍が自家の城へ着いても戦ではない', H.風雲の戦か(s, { ...我軍, at: 自城.id }, 自城, null) === false);
    確('行き合いは、上司がどちらかの軍にいれば戦', H.風雲の戦か(s, 敵軍, null, 我軍) === true && H.風雲の戦か(s, 我軍, null, 敵軍) === true);
    確('上司のいない軍の行き合いは戦ではない', H.風雲の戦か(s, 敵軍, null, { ...我軍, gens: [] }) === false);
    確('上司のいる自家の城へ敵が着けば戦', H.風雲の戦か(s, 敵軍, s.castles.find((c) => c.id === f.城), null) === true);

    /* 大名に宛てた問いは、AIと同じ答えを自動で返す */
    const 捕 = s.generals.find((x) => x.faction !== 'oda' && !x.captive);
    捕.captive = { by: 'oda', from: 捕.faction, y: s.year, m: s.month };
    s.captives = [捕.id];
    const 他家 = Object.keys(s.factions).find((k) => k !== 'oda' && !k.startsWith('_'));
    s.申し入れ = { fid: 他家, key: '同盟' };
    s.国平定 = { kuni: '尾張', castleId: f.城, 城数: 1, y: s.year, m: s.month };
    const r = H.風雲の問いに答える(s);
    確('捕虜・申し入れ・一国平定の札が片づく', r.変えた && !(s.captives || []).length && !s.申し入れ && !s.国平定);
    確('捕虜は留め置く（札の「留め置く」と同じ）', !!捕.captive && 捕.faction !== 'oda');
    確('問いが無ければ何もしない', H.風雲の問いに答える(s).変えた === false);

    /* 討死すれば、そこで終わる */
    H.戦の勲功を記す(s, { result: 'E', 一人働き: { 討ち取り: 1, 体力: 0, 討死: true } }, '清洲城');
    確('討死すれば記され、風雲は終わる', !!f.討死 && f.討死.場所 === '清洲城' && /討死/.test(f.記[f.記.length - 1].文), f.記[f.記.length - 1].文);
    const 前 = JSON.stringify(f);
    f.行い = ['稽古']; f.金 = 5; H.風雲の月の初め(s); H.取り立てを見る(s);
    確('討死ののちは、月の行いも取り立ても行わない', f.金 === 5 && f.身分 === '十人長');
    void 前;
  }

  /* ======================================================= 二、背中の理の備え */
  console.log('\n── 二　背中の理の備え（主人公の体力・一人働きの記録）');
  {
    H.setBattleMap(null); H.setFieldSeed('fuun', 'y'); H.layoutField(7000, 6);
    const W = H.FIELD.w, Hh = H.FIELD.h;
    const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 65, valor: 65, wit: 58, gov: 55, retinue: 500, retTrain: 70, unity: 62 });
    const 仕立てる = () => {
      const P = [0, 1].map((k) => H.makeCorps('P', 将(k), 0, 900, 75, 75, W * (0.35 + k * 0.3), Hh * 0.7, -Math.PI / 2, '#2F5D8C'));
      const E = [0, 1].map((k) => H.makeCorps('E', 将(10 + k), 0, 900, 75, 75, W * (0.35 + k * 0.3), Hh * 0.3, Math.PI / 2, '#B0483C'));
      for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
      const b = H.createBattle(P, E, 'P'); b.mode = 'field'; b.phase = 'fight'; b.dusk = 1100;
      return b;
    };
    const b = 仕立てる();
    const 態 = H.背中を始める(b, 'g1', '足軽', null, { 体力: 60, 武勇: 45, 一度きり: true, 名: '与平' });
    確('上司の隊（隊の id）の組のうしろに立つ', 態 && 態.隊 && 態.隊.id === 'g1', 態 && 態.隊 && 態.隊.id);
    確('主人公の体力で立つ（満ちていない）', 態.我.hp === 60, `体力${態.我.hp}`);
    /* 盤の見た目（一人ずつの絵）はまだ描いていないので、まわりに兵のいない眺めで一コマ進める */
    H.与平を進める(b, 態, 0.05, { 兵: [], 倒れ: [] });
    確('盤に一人働き（討ち取り・体力・討死）を書く', !!b.一人働き && b.一人働き.討ち取り === 0 && b.一人働き.体力 === 60 && b.一人働き.討死 === false,
      JSON.stringify(b.一人働き));
    const b2 = 仕立てる();
    const 態2 = H.背中を始める(b2, null, '足軽');
    H.与平を進める(b2, 態2, 0.05, { 兵: [], 倒れ: [] });
    確('備えを渡さぬ一人働き（試し入り口）は、満ちた体力で立ち、盤に書かない', 態2.我.hp === 100 && b2.一人働き === undefined);
  }

  /* ======================================================= 三、題の画面と屋敷 */
  console.log('\n── 三　題の三つのモード・仕える家を選ぶ・屋敷の画面で月を送る');
  {
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
    確('題に三つのモードが並ぶ', !!btn('キャンペーンモード') && !!btn('風雲モード') && !!btn('合戦モード'),
      [...document.querySelectorAll('button')].map((x) => x.textContent.trim()).slice(0, 5).join('／'));
    await rc('風雲モード'); await flush(); await flush();
    確('風雲モードは「仕える家を選ぶ」', /仕える家を選ぶ/.test(文()));
    await openFaction('織田家');
    確('家を開くと「この家に足軽として仕える」が出て、見物は出ない', !!btn('この家に足軽として仕える') && !btn('見物する'));
    await rc('この家に足軽として仕える'); await flush(); await flush();
    確('屋敷の画面が出る（地図の代わり）', /風雲/.test(文()) && /今月の行い/.test(文()) && !!btn('月を送る'), '');
    確('足軽・長屋で始まる', /与平足軽/.test(文().replace(/\s/g, '')) && /住まい：長屋/.test(文()));
    確('始めの記が出る', /織田家に足軽として仕えた/.test(文()));
    await rc('稽古'); await rc('開墾・商い');
    const 選 = [...document.querySelectorAll('button.on')].map((x) => x.textContent);
    確('月の行いを選べる', 選.some((t) => /稽古/.test(t)) && 選.some((t) => /開墾/.test(t)), 選.length + 'つ');
    await rc('交流'); await rc('上納');
    確('四つ目は選べない（三つまで）', [...document.querySelectorAll('button.on')].length === 3);
    await rc('上納');
    await rc('月を送る（1546年4月）');
    for (let i = 0; i < 20; i++) await flush();
    確('月が送られる', /1546年5月/.test(文()), (文().match(/\d{4}年\d+月/) || [''])[0]);
    確('月の行いが効く（金 二→二＋二−一＝三、武勇 四十五→四十六、知略 二十五→二十六）', /3 貫/.test(文()) && /武勇 46/.test(文()) && /知略 26/.test(文()),
      (文().match(/武勇 \d+・統率 \d+・知略 \d+・政務 \d+/) || [''])[0] + '・' + (文().match(/\d+ 貫/) || [''])[0]);
    await act(async () => { root.unmount(); }); await flush();

    /* 記録：見出しで風雲と分かる（見物と取り違えない） */
    const root2 = createRoot(document.getElementById('r'));
    await act(async () => { root2.render(React.createElement(App)); }); await flush(); await flush(); await flush();
    確('題の「続きから」に風雲と出る', /続きから（.*風雲）/.test(文()), (文().match(/続きから（[^）]*）/) || [''])[0]);
    確('記録の札に「風雲・足軽」と出る（見物ではない）', /風雲・足軽/.test(文()) && !/見物/.test((文().match(/1546年5月[^消]*/) || [''])[0]));
    await act(async () => { root2.unmount(); }); await flush();
  }

  /* ======================================================= 四、上司の野戦 */
  console.log('\n── 四　上司のいる城へ敵が着けば、盤が開いて足軽として戦う');
  {
    蔵.clear();
    const s = initState('oda');
    H.風雲を始める(s);
    const f = s.風雲;
    const 本拠 = s.castles.find((c) => c.id === f.城);
    const 敵城 = s.castles.find((d) => d.faction !== 'oda' && !String(d.faction).startsWith('_') && (H.findPath(本拠.id, d.id) || []).length >= 2);
    const 敵将 = s.generals.filter((x) => x.faction === 敵城.faction && !x.captive && x.at === 敵城.id).slice(0, 2);
    for (const t of 敵将) t.at = null;
    const 敵軍 = { id: 'foe-army', faction: 敵城.faction, from: 敵城.id, gens: 敵将.map((x) => x.id),
      local: 1500, localTrain: 60, rost: null, men: 1500 + 敵将.reduce((a, x) => a + x.retinue, 0),
      at: 本拠.id, path: [本拠.id], prog: 0, food: 9000, target: 本拠.id };
    s.armies.push(敵軍); s.pendingArrivals = [敵軍.id]; s.monthEvents = [];
    /* 敵が着いた城の同じ月に、ほかに着く味方の軍が無いことを確かめておく（後詰の戦は盤の外で裁く筋） */
    蔵.set('sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s }));
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
    await rc('続きから'); for (let i = 0; i < 6; i++) await flush();
    確('盤が開く（見物でも、上司の戦は盤の外で裁かない）', !!btnAny('委ねて結果を見る'), '');
    確('出陣前の問い（自ら采を執るか委ねるか）を経ない', !/自ら采を執る/.test(文()));
    確('足軽の欄が出る（全軍への下知はできない）', /足軽の身では/.test(文()));
    const b = window.__合戦;
    確('合戦は布陣を待たずに始まる', b && b.phase === 'fight', b && b.phase);
    const 上司の隊 = b && b.corps.find((c) => c.id === f.上司);
    確('上司の隊が味方の側に立つ', !!上司の隊 && 上司の隊.side === 'P', 上司の隊 ? `${上司の隊.name}・${上司の隊.side}` : 'なし');
    /* 一人視点で討ち取ったことにする（jsdom では刻みを回さないので、盤の記録を直に置く） */
    b.一人働き = { 討ち取り: 5, 体力: 72, 討死: false };
    await click(btnAny('委ねて結果を見る'));
    for (let i = 0; i < 600 && b.phase === 'fight'; i++) await flush();
    確('委ねれば決着まで進む', b.phase !== 'fight', b.phase);
    await rc('戦場を離れる'); for (let i = 0; i < 12; i++) await flush();
    確('戦場を離れると屋敷へ戻る', /今月の行い/.test(文()) && !!btnAny('月を送る'));
    確('働きが勲功に積まれ、十人長に取り立てられる', /取り立て/.test(文()) && /十人長/.test(文()), '');
    確('合戦の記が残る', /足軽として出た。討ち取り5/.test(文()), (文().match(/[^。]*足軽として出た。討ち取り\d+/) || [''])[0]);
    await rc('了'); await flush();
    確('取り立ての札を閉じると、住まいが小さな家になる', /住まい：小さな家/.test(文()) && !/取り立て\s*十人長/.test(文()));
    const 敵 = window.__合戦;
    void 敵;
    await act(async () => { root.unmount(); }); await flush();
  }

  console.log(咎.length ? `\n★ ${咎.length}件の咎：${咎.join('／')}` : '\nすべて ○');
  const 本の咎 = errs.filter((e) => !/not wrapped in act|Warning/.test(e));
  console.log('エラー:', 本の咎.slice(0, 2).join(' | ') || 'なし');
  process.exit(咎.length || 本の咎.length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
