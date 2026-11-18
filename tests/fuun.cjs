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
     五、主命（申し出「BC をいずれも入れれば」の B）：上司から期限と重さつきで下され、山賊退治は盤の小さな
         野戦で足軽として戦い、特殊勢力への働きかけは知略と政務で決まる。果たせば褒美、しくじれば覚えが下がる
     六、城攻め・籠城（同じく C）：上司が関わる強攻は月送りが積み、城の盤で足軽として戦う。背中越しの城の
         造作・堀・壁と門の当たり
   を確かめる。上司は家ごとの表（hitori/fuun_joushi.js。一門でない若手の家臣）から決まる（一の段）。
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
    /* 遊ぶ人の申し出：「当主所属なんてあり得ない」「その大名を選ぶ＝その武将の下につく」「若くて有能な武将の下に」 */
    const 当主 = s.generals.find((x) => x.faction === 'oda' && x.lord);
    確('上司は家ごとの表の将（織田家なら柴田勝家）で、当主でも一門でもない', !!上 && 上.id === 'katsuie' && !上.lord && !H.isKin(上, 当主) && !H.isMainClan(s, 上), 上 ? `${上.name}（${上.age}歳）` : 'なし');
    確('住む城は上司の城', f.城 === 上.at, f.城);
    /* 表のすべての家：上司は始めの盤にいて、その家の者で、当主でも一門でもなく、十六歳以上 */
    {
      const 表 = H.風雲の上司表; let 数 = 0; const 咎の家 = [];
      for (const [fid, id] of Object.entries(表)) {
        if (id === null) continue; 数++;
        const q = s.generals.find((x) => x.id === id);
        const 主 = s.generals.find((x) => x.faction === fid && x.lord);
        if (!q || q.faction !== fid || q.lord || (主 && H.isKin(q, 主)) || H.isMainClan(s, q) || (q.age || 0) < 16
          || !s.castles.some((c) => c.id === q.at && c.faction === fid)) 咎の家.push(fid);
      }
      確('表のすべての家の上司が、当主でも一門でもない十六歳以上の、城にいる家臣', 咎の家.length === 0 && 数 > 100, `${数}家${咎の家.length ? '・咎 ' + 咎の家.join(',') : ''}`);
      確('一門でない家臣がいない家は、風雲では選べない', H.風雲で選べるか('mizuno') === false && H.風雲で選べるか('oda') === true);
      const 外 = ['mo_takaie', 'motokiyo', 'watari', 'kizawa', 'sekiyado'];
      確('ゲームの見分けで漏れる近い縁者（娘婿・養子に出た子など）は上司にしない', 外.every((id) => !Object.values(表).includes(id)));
    }
    {
      /* 上司が捕われれば、住む城の者から同じ決まりで選び直す（当主には付けない） */
      const s2 = initState('oda'); H.風雲を始める(s2);
      const 前 = s2.generals.find((x) => x.id === s2.風雲.上司); 前.captive = { by: 'saito', from: 'oda', y: 1546, m: 4 };
      H.上司を見直す(s2);
      const 新 = s2.generals.find((x) => x.id === s2.風雲.上司);
      const 主2 = s2.generals.find((x) => x.faction === 'oda' && x.lord);
      確('上司が捕われれば、住む城の一門でない将を選び直す', !!新 && 新.id !== 前.id && !新.lord && !H.isKin(新, 主2) && 新.at === s2.風雲.城,
        新 ? `${新.name}（${新.age}歳・${s2.castles.find((c) => c.id === 新.at).name}）` : 'なし');
    }
    確('諸家も主家もAIに任せる（見物と同じ）', s.autoPlay === true);
    確('始めの記が一つ（上司の城に住み、上司の手に属する）', (f.記 || []).length === 1 && /勝幡城に住み、柴田勝家の手に属する/.test(f.記[0].文), (f.記[0] || {}).文);

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
    確('仕える将（その家を選ぶ＝この将の下に付く）が出る', /仕える将柴田勝家（24歳）・勝幡城/.test(文().replace(/\s/g, '')), (文().match(/仕える将.{0,16}/) || [''])[0]);
    await rc('この家に足軽として仕える'); await flush(); await flush();
    確('屋敷の画面が出る（地図の代わり）', /風雲/.test(文()) && /今月の行い/.test(文()) && !!btn('月を送る'), '');
    確('足軽・長屋で始まる', /与平足軽/.test(文().replace(/\s/g, '')) && /住まい：長屋/.test(文()));
    確('始めの記が出る', /織田家に足軽として仕えた。勝幡城に住み、柴田勝家の手に属する/.test(文()));
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

  /* ======================================================= 五、主命 */
  console.log('\n── 五　主命（上司から下される務め。山賊退治は盤の小さな戦・特殊勢力への働きかけ）');
  {
    /* 理（画面なし） */
    const s = initState('oda'); H.風雲を始める(s); const f = s.風雲;
    const 列 = (xs) => { let i = 0; return () => xs[Math.min(i++, xs.length - 1)]; };
    const 命 = H.主命を下す(s, 列([0.1, 0.9, 0.5]));          // 下る（〇.一<〇.四五）・山賊退治（〇.九≧〇.三）・並（〇.五）
    確('主命は上司から、期限と重さをつけて下される', !!命 && 命.種 === '山賊退治' && 命.重さ === '並' && 命.上司 === f.上司
      && 命.期限.年 === 1546 && 命.期限.月 === 6 && /主命を受けた/.test(f.記[f.記.length - 1].文), 命 && `${命.文}（期限 ${命.期限.年}年${命.期限.月}月）`);
    確('主命のあるあいだは、新たな主命は下されない', H.主命を下す(s, () => 0) === null);
    const b = H.山賊の盤を組む(s);
    const 組 = b.corps.find((c) => c.id === H.主命の組), 賊 = b.corps.find((c) => c.id === H.山賊の隊);
    const 数 = (c) => c.squads.reduce((a, q) => a + q.men, 0);
    確('山賊退治の盤：主人公の組（足軽なら四十人）と山賊（並なら三十八人）の野戦', !!組 && !!賊 && 組.side === 'P' && 賊.side === 'E'
      && 数(組) === 40 && 数(賊) === 38 && b.mode === 'field', 組 && 賊 && `${組.name} ${数(組)}人 対 ${賊.name} ${数(賊)}人`);
    const 前 = { 勲功: f.勲功, 覚え: f.覚え, 金: f.金 };
    H.山賊退治の果て(s, { result: 'P', 一人働き: { 討ち取り: 2, 体力: 80, 討死: false } });
    確('勝てば主命を果たし、討ち取りと褒美（並：勲功二・覚え六・金二貫）を得る', !f.主命 && f.勲功 === 前.勲功 + 2 + 2 && f.覚え === 前.覚え + 6
      && f.金 === 前.金 + 2 && f.主命の数.果たした === 1 && f.体力 === 80, `勲功${f.勲功}・覚え${f.覚え}・金${f.金}`);
    H.主命を下す(s, 列([0.1, 0.9, 0.1]));
    const 覚え前 = f.覚え;
    H.山賊退治の果て(s, { result: 'E', 一人働き: { 討ち取り: 0, 体力: 50, 討死: false } });
    確('負ければしくじり、覚えが五下がる', !f.主命 && f.覚え === 覚え前 - 5 && f.主命の数.しくじった === 1);
    /* 期限を過ぎれば、しくじり（覚え八下がる） */
    H.主命を下す(s, 列([0.1, 0.9, 0.1]));
    const 覚え前2 = f.覚え;
    s.year = 1546; s.month = 9;
    H.主命の月が明けた(s, () => 0.99);
    確('期限を過ぎた主命はしくじりとなり、覚えが八下がる', !f.主命 && f.覚え === 覚え前2 - 8 && /期限を過ぎ/.test(f.記[f.記.length - 1].文));
    /* 特殊勢力への働きかけ：手の届く町へ使いし、知略と政務でまとまるかが決まる */
    const 町ら = H.手の届く町ら(s);
    確('手の届く町（家がいちばん近い城を押さえる町）がある', 町ら.length > 0, 町ら.slice(0, 3).map((x) => x.name).join('・'));
    H.主命を下す(s, 列([0.1, 0.1, 0.5]));
    確('特殊勢力への働きかけの主命が下される', f.主命 && f.主命.種 === '特殊勢力への働きかけ' && f.主命.町 === 町ら[0].id, f.主命 && f.主命.文);
    f.行い = ['稽古'];
    H.主命の月の初め(s, () => 0);
    確('主命に励まない月は、働きかけない', !!f.主命);
    f.行い = ['主命に励む'];
    H.主命の月の初め(s, () => 0.99);
    確('まとまらなければ、期限まで続く', !!f.主命 && /話はまとまらなかった/.test(f.記[f.記.length - 1].文));
    H.主命の月の初め(s, () => 0);
    確('まとまれば主命を果たす（褒美の勲功で取り立ても見る）', !f.主命 && f.主命の数.果たした === 2 && f.記.slice(-2).some((x) => /誼を通じる下地ができた/.test(x.文)),
      f.記.slice(-2).map((x) => x.文).join(' ／ '));
  }
  {
    /* 画面：主命の札・主命に励む・山賊退治の盤・戦のあとに月が送られる */
    蔵.clear();
    const s = initState('oda'); H.風雲を始める(s);
    s.風雲.主命 = { 種: '山賊退治', 重さ: '軽', 文: '勝幡城の近在の山に出る山賊（およそ30人）を討て', 上司: s.風雲.上司, 城: s.風雲.城, 町: null,
      出: { 年: 1546, 月: 4 }, 期限: { 年: 1546, 月: 6 } };
    蔵.set('sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s }));
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
    await rc('続きから'); for (let i = 0; i < 4; i++) await flush();
    確('屋敷に主命の札が出る（中身・期限・褒美）', /主命（柴田勝家より）・山賊退治/.test(文()) && /期限 1546年6月/.test(文()) && /果たせば 勲功1・覚え4・金1貫/.test(文()));
    確('月の行いに「主命に励む」が加わる', !!btn('主命に励む'));
    await rc('主命に励む');
    確('主命に励む月は、月を送る前に山賊退治に出る', !!btn('山賊退治に出て、月を送る'));
    await rc('山賊退治に出て、月を送る'); for (let i = 0; i < 4; i++) await flush();
    const b = window.__合戦;
    確('山賊退治の盤が開く（足軽として、出陣前の問いなし）', !!b && b.phase === 'fight' && /足軽の身では/.test(文()) && !/自ら采を執る/.test(文()) && /山賊/.test(文()));
    確('主人公は主命の組に立つ', !!b && b.corps.some((c) => c.id === H.主命の組 && c.side === 'P'));
    b.一人働き = { 討ち取り: 2, 体力: 70, 討死: false };
    await click(btnAny('委ねて結果を見る'));
    for (let i = 0; i < 600 && b.phase === 'fight'; i++) await flush();
    await rc('戦場を離れる'); for (let i = 0; i < 12; i++) await flush();
    確('戦のあとで、その月が送られる', /1546年5月/.test(文()) && /今月の行い/.test(文()), (文().match(/\d{4}年\d+月/) || [''])[0]);
    確('主命の果てが記される（果たした・しくじった のいずれか）', /主命を果たした（山賊退治）|主命（山賊退治）を果たせなかった/.test(文()),
      (文().match(/主命を果たした[^。]*。|[^。]*主命（山賊退治）を果たせなかった/) || [''])[0]);
    確('討ち取りが勲功に積まれる', /討ち取り 2/.test(文()) || /討ち取り2/.test(文()));
    await act(async () => { root.unmount(); }); await flush();
  }

  /* ======================================================= 六、城攻め・籠城 */
  console.log('\n── 六　城攻め・籠城（上司が寄せ手か籠る側にいる強攻は、城の盤で足軽として戦う）');
  const 囲みを仕込む = () => {
    const s = initState('oda'); H.風雲を始める(s);
    const f = s.風雲, 上 = s.generals.find((x) => x.id === f.上司);
    const 敵城 = s.castles.find((d) => d.faction !== 'oda' && !String(d.faction).startsWith('_') && (H.findPath(f.城, d.id) || []).length === 2)
      || s.castles.find((d) => d.faction !== 'oda' && !String(d.faction).startsWith('_'));
    上.at = null;
    const 軍 = { id: 'fuun-army', faction: 'oda', gens: [上.id], local: 6000, localTrain: 66, rost: null,
      men: 6000 + (上.retinue || 0), at: 敵城.id, from: f.城, path: [敵城.id], prog: 0, sieging: true, food: 90000, target: 敵城.id };
    s.armies.push(軍);
    s.sieges.push({ castleId: 敵城.id, armyId: 軍.id, months: 1, decided: null });
    s.monthEvents = [];
    return { s, f, 上, 敵城, 軍 };
  };
  {
    const { s, f, 敵城, 軍 } = 囲みを仕込む();
    確('上司の軍が敵の城を囲めば、主人公の城攻め', H.風雲の城攻めか(s, 軍, 敵城) === true);
    確('上司のいない軍の城攻めは、主人公の城攻めではない', H.風雲の城攻めか(s, { ...軍, gens: ['nobunaga'] }, 敵城) === false);
    const 家の城 = s.castles.find((c) => c.id === f.城);
    const s2 = initState('oda'); H.風雲を始める(s2);
    確('上司が籠る家の城を敵が囲めば、主人公の籠城', H.風雲の城攻めか(s2, { id: 'e', faction: 'saito', gens: [] }, 家の城) === true);
    /* 月送り：上司の軍の強攻は、式で裁かずに城攻めを待つ列へ積む（落ちるかどうかは盤で決まる） */
    let 積んだ = null, 月 = 0;
    let st = s;
    for (; 月 < 10 && !積んだ; 月++) {
      st = H.advanceMonth(st, st);
      if ((st.風雲の城攻め || []).length) 積んだ = st.風雲の城攻め[0];
      st.風雲の城攻め = [];
    }
    const 城の今 = st.castles.find((c) => c.id === 敵城.id);
    確('上司の軍が囲む城への強攻は、月送りが盤の城攻めとして積む', !!積んだ && 積んだ.castleId === 敵城.id && 積んだ.armyId === 'fuun-army', 積んだ ? `${月}か月目に積んだ` : '積まれない');
    確('積んだ強攻は、式では裁かない（城は盤で落ちるまで敵の手にある）', !!城の今 && 城の今.faction === 敵城.faction, 城の今 && 城の今.faction);
  }
  {
    蔵.clear();
    const { s, 敵城 } = 囲みを仕込む();
    s.風雲の城攻め = [{ castleId: 敵城.id, armyId: 'fuun-army' }];
    蔵.set('sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s }));
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
    await rc('続きから'); for (let i = 0; i < 8; i++) await flush();
    const b = window.__合戦;
    確('城攻めの盤が開く（見物でも、上司の城攻めは盤で戦う）', !!b && !!b.map && b.phase === 'fight', b ? `${b.phase}・城の盤 ${!!b.map}` : '開かない');
    確('足軽として出る（出陣前の問い・門の割り付けを経ない）', /足軽の身では/.test(文()) && !/自ら采を執る|城門の割り付け/.test(文()));
    確('上司の隊が寄せ手の側に立つ', !!b && b.corps.some((c) => c.id === 'katsuie' && c.side === 'P'));
    /* 背中越しの城（hitori/shiro_senaka.js）：造作を集め、壁の当たりを持ち、描いて落ちない */
    {
      const m = b.map, o = m.layers[0], g = o.gates.find((x) => x.face === 'S') || o.gates[0];
      const 箱ら = H.城の箱を集める(m, H.歩の尺);
      const 扉の数 = (xs) => xs.reduce((n, x) => n + x.部品.filter((p) => p.扉).length, 0);
      const 閉じた門 = m.layers.reduce((n, l) => n + l.gates.filter((x) => !x.broken).length, 0);
      確('城の造作が集まる（石垣と塀・櫓門・枡形・矢倉など）', 箱ら.length > 50 && 扉の数(箱ら) === 閉じた門, `${箱ら.length}の物・扉${扉の数(箱ら)}／閉じた門${閉じた門}`);
      const 堀 = H.堀の帯(m);
      確('堀と橋が地に敷かれる', 堀.堀.length === 1 && 堀.橋.length === o.gates.length);
      const 寄せ = b.corps.find((c) => c.id === 'katsuie');
      const 尺 = H.歩の尺, 世 = (x, y) => [x * 尺, -y * 尺];
      /* 大手（南の面）の門で確かめる。門の脇の外（枡形にも堀にも掛からない所）と、枡形の内（袖の石塁のあいだ） */
      const 南 = g.face === 'S';
      const [gx, gy] = [m.cx + g.off, m.cy + o.hh + m.t / 2];
      const 脇の外 = [m.cx + g.off + g.w * 1.6, m.cy + o.hh + m.t + 20], 壁 = [脇の外[0], gy];
      const 枡形の内 = [gx, m.cy + o.hh + m.t + o.masu / 2];
      const 通る = (from, to) => H.城で通れるか(b, 寄せ, ...世(...from), ...世(...to));
      確('石垣の帯は通れない（門の脇の外から壁へ）', 南 && !通る(脇の外, 壁) && 通る(脇の外, [脇の外[0] + 4, 脇の外[1]]),
        南 ? `壁へ ${通る(脇の外, 壁)}・外で ${通る(脇の外, [脇の外[0] + 4, 脇の外[1]])}・地 ${H.terrainAt(...壁)}/${H.terrainAt(...脇の外)}` : '南の門が無い');
      確('閉じた門は寄せ手には通れない（枡形の内から門へ）', 南 && !g.broken && !通る(枡形の内, [gx, gy]), `地 ${H.terrainAt(...枡形の内)}/${H.terrainAt(gx, gy)}`);
      g.broken = true;
      確('破れた門は通れる', 通る(枡形の内, [gx, gy]), `地 ${H.terrainAt(gx, gy)}`);
      確('破れた門には扉が無い', 扉の数(H.城の箱を集める(m, 尺)) === 閉じた門 - 1);
      g.broken = false;
      const 態 = H.背中を始める(b, 'katsuie', '足軽', null, { 体力: 100, 武勇: 45, 一度きり: true, 名: '与平' });
      態.我.x = 脇の外[0] * 尺; 態.我.z = -脇の外[1] * 尺;
      let 落ちた = null, 描いた = null;
      try { for (let k = 0; k < 4; k++) 描いた = H.背中を描く(ctxStub, b, 態, 960, 600, 1, 10 + k * 0.05); } catch (e) { 落ちた = e.message; }
      確('城の盤で背中越しに描いて落ちない', !落ちた && !!描いた, 落ちた || `兵${描いた.兵}`);
    }
    b.一人働き = { 討ち取り: 3, 体力: 66, 討死: false };
    await click(btnAny('委ねて結果を見る'));
    for (let i = 0; i < 1500 && b.phase !== 'over'; i++) await flush();
    確('委ねれば城攻めの決着まで進む（夜も采配の思案で越す）', b.phase === 'over', b.phase);
    await rc('戦場を離れる'); for (let i = 0; i < 12; i++) await flush();
    確('戦場を離れると屋敷へ戻る', /今月の行い/.test(文()));
    確('城攻めの記が残り、討ち取りが勲功に積まれる', new RegExp(`${敵城.name}攻めの(勝ち戦|負け戦|引き分け)に足軽として出た。討ち取り3`).test(文()),
      (文().match(/[^。]*攻めの[^。]*に足軽として出た。討ち取り\d+/) || [''])[0]);
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
