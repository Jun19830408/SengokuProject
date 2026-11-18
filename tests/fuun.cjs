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
     五、務めと主命：山賊退治は三か月ごとの務め（申し出「３ヶ月ごとに山賊との戦い」）で、その月に月を送れば盤の小さな
         野戦で足軽として戦う。主命は特殊勢力への働きかけだけで、知略と政務でまとまるかが決まる
     六、城攻め・籠城（同じく C）：上司が関わる強攻は月送りが積み、城の盤で足軽として戦う。背中越しの城の
         造作・堀・壁と門の当たり
     七、陣借り：上司の戦でなくても、陣借りを選んだ月は家の他の将の戦に一度加わる
     八、持ち場と大将首（申し出「物頭未満のときは…範囲を決めてそこから出ると上司のおぼえが低くなる（時間とともに
         マイナスが増えていく感じ）一方で、その範囲を超えて一騎駆けや抜け駆けすることで敵の大将の首を取るなどしたら
         勲功が上がる」）：持ち場の外で咎が積もる早さ・戻れば止まること・本陣の将を突き伏せれば首となること・
         合戦のあとに勲功と覚えへ積むこと・首を取られた将は討死となること
     九、上司を軍に加えやすくする（申し出「2でいきましょう」）と、主人公の家だけ攻め気を上げること
         （申し出「プレイヤーの所属する大名家のみ、より攻め気を上げればいい」）：兵を寄せるとき上司のいる城から
         先に呼び、上司を将として呼ぶ。風雲でない盤と他家では、これまでどおり
     十、威力偵察（申し出「半年に一度威力偵察として攻略対象の大名と小競り合いをする(勝てば実際に敵の兵が減る)」）
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
    確('上司は家ごとの表の将。織田家だけは信長（申し出「織田家だけは信長の配下でもいい」）で、当主ではない', !!上 && 上.id === 'nobunaga' && !上.lord, 上 ? `${上.name}（${上.age}歳）` : 'なし');
    確('住む城は上司の城', f.城 === 上.at, f.城);
    /* 表のすべての家：上司は始めの盤にいて、その家の者で、当主でも一門でもなく、十六歳以上 */
    {
      const 表 = H.風雲の上司表; let 数 = 0; const 咎の家 = [];
      for (const [fid, id] of Object.entries(表)) {
        if (id === null) continue; 数++;
        if (fid === 'oda') continue;                       // 織田家は信長（一門・十六歳未満の例外。上で確かめた）
        const q = s.generals.find((x) => x.id === id);
        const 主 = s.generals.find((x) => x.faction === fid && x.lord);
        if (!q || q.faction !== fid || q.lord || (主 && H.isKin(q, 主)) || H.isMainClan(s, q) || (q.age || 0) < 16
          || !s.castles.some((c) => c.id === q.at && c.faction === fid)) 咎の家.push(fid);
      }
      確('表のすべての家の上司が、当主でも一門でもない十六歳以上の、城にいる家臣（織田家の信長を除く）', 咎の家.length === 0 && 数 > 100, `${数}家${咎の家.length ? '・咎 ' + 咎の家.join(',') : ''}`);
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
    確('始めの記が一つ（上司の城に住み、上司の手に属する）', (f.記 || []).length === 1 && /那古野城に住み、織田信長の手に属する/.test(f.記[0].文), (f.記[0] || {}).文);
    確('務めの予定：山賊退治は二か月後、威力偵察は四か月後', f.予定 && f.予定.山賊 === 1546 * 12 + 6 && f.予定.偵察 === 1546 * 12 + 8, JSON.stringify(f.予定));

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

    /* 合戦のあと：討ち取りが勲功に積まれ、目安に届けば取り立てる。
       申し出「AもBも入れましょう。勲功は上がりにくいほうが長く遊べる」：A 雑兵は三人で勲功一（端は持ち越す）・
       名のある侍は一人で一・大将首はそのまま、B 取り立ての目安を引き上げる */
    確('取り立ての目安を引き上げた（十人長二十・三十人長五十・五十人長九十・百人長百四十・三百人長二百・物頭二百七十）',
      H.風雲の段.map((x) => x.要).join(',') === '0,20,50,90,140,200,270');
    H.戦の勲功を記す(s, { result: 'P', 一人働き: { 討ち取り: 3, 体力: 64, 討死: false } }, '那古野城');
    確('雑兵の討ち取りは三人で勲功一。手傷が体力に残る', f.勲功 === 1 && f.合戦 === 1 && f.討ち取り === 3 && f.体力 === 64 && (f.雑兵の端 || 0) === 0,
      `勲功${f.勲功}・合戦${f.合戦}・体力${f.体力}`);
    H.戦の勲功を記す(s, { result: 'P', 一人働き: { 討ち取り: 5, 雑兵: 4, 侍: 1, 体力: 60, 討死: false } }, '鳴海城');
    確('名のある侍（馬廻・旗持など）は一人で勲功一。雑兵の端は次の戦へ持ち越す', f.勲功 === 3 && f.雑兵の端 === 1
      && /討ち取り5（雑兵4・名のある侍1）。勲功2。/.test((f.記[f.記.length - 1] || {}).文 || ''), `勲功${f.勲功}・端${f.雑兵の端}・${(f.記[f.記.length - 1] || {}).文}`);
    確('まだ十人長ではない（目安 二十）', f.身分 === '足軽');
    H.戦の勲功を記す(s, { result: 'E', 一人働き: { 討ち取り: 3, 雑兵: 2, 侍: 0, 首: [{ 名: '敵の総大将', 総大将: true }], 体力: 40, 討死: false } }, '鳴海城');
    確('総大将の首（二十）で目安に届き、十人長に取り立てられる', f.勲功 === 24 && f.身分 === '十人長' && (f.知らせ || []).length === 1,
      `勲功${f.勲功}・${f.身分}・知らせ「${(f.知らせ || [])[0]}」`);
    確('取り立ての記が残る（住まいも替わる）', /十人長に取り立てられた.*小さな家/.test((f.記[f.記.length - 1] || {}).文 || ''), (f.記[f.記.length - 1] || {}).文);
    H.戦の勲功を記す(s, { result: 'P' }, '');
    確('一人視点に降りずに終えた合戦は、討ち取り〇で数える', f.合戦 === 4 && f.勲功 === 24);

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
    確('仕える将（その家を選ぶ＝この将の下に付く）が出る', /仕える将織田信長（12歳）・那古野城/.test(文().replace(/\s/g, '')), (文().match(/仕える将.{0,16}/) || [''])[0]);
    await rc('この家に足軽として仕える'); await flush(); await flush();
    確('屋敷の画面が出る（地図の代わり）', /風雲/.test(文()) && /今月の行い/.test(文()) && !!btn('月を送る'), '');
    確('足軽・長屋で始まる', /与平足軽/.test(文().replace(/\s/g, '')) && /住まい：長屋/.test(文()));
    確('始めの記が出る', /織田家に足軽として仕えた。那古野城に住み、織田信長の手に属する/.test(文()));
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
    確('風雲の合戦は、始めから背中越しの視点（降りきった所）で始まる', window.__降り && window.__降り() === 1, `降り ${window.__降り && window.__降り()}`);
    const b = window.__合戦;
    確('合戦は布陣を待たずに始まる', b && b.phase === 'fight', b && b.phase);
    const 上司の隊 = b && b.corps.find((c) => c.id === f.上司);
    確('上司の隊が味方の側に立つ', !!上司の隊 && 上司の隊.side === 'P', 上司の隊 ? `${上司の隊.name}・${上司の隊.side}` : 'なし');
    /* 一人視点で討ち取ったことにする（jsdom では刻みを回さないので、盤の記録を直に置く） */
    b.一人働き = { 討ち取り: 6, 雑兵: 3, 侍: 2, 首: [{ 名: '敵の総大将', 総大将: true }], 体力: 72, 討死: false };   // 勲功 一＋二＋二十
    await click(btnAny('委ねて結果を見る'));
    for (let i = 0; i < 600 && b.phase === 'fight'; i++) await flush();
    確('委ねれば決着まで進む', b.phase !== 'fight', b.phase);
    await rc('戦場を離れる'); for (let i = 0; i < 12; i++) await flush();
    確('戦場を離れると屋敷へ戻る', /今月の行い/.test(文()) && !!btnAny('月を送る'));
    確('働きが勲功に積まれ、十人長に取り立てられる', /取り立て/.test(文()) && /十人長/.test(文()), '');
    確('合戦の記が残る（討ち取りの内訳と勲功）', /足軽として出た。討ち取り6（雑兵3・名のある侍2）。勲功23。/.test(文()), (文().match(/[^。]*足軽として出た。討ち取り[^。]*。勲功\d+/) || [''])[0]);
    await rc('了'); await flush();
    確('取り立ての札を閉じると、住まいが小さな家になる', /住まい：小さな家/.test(文()) && !/取り立て\s*十人長/.test(文()));
    const 敵 = window.__合戦;
    void 敵;
    await act(async () => { root.unmount(); }); await flush();
  }

  /* ======================================================= 五、主命 */
  console.log('\n── 五　務めと主命（三か月ごとの山賊退治・特殊勢力への働きかけの主命）');
  {
    /* 理（画面なし）。申し出「３ヶ月ごとに山賊との戦い」により、山賊退治は主命から三か月ごとの務めになった */
    const s = initState('oda'); H.風雲を始める(s); const f = s.風雲;
    const 列 = (xs) => { let i = 0; return () => xs[Math.min(i++, xs.length - 1)]; };
    const 今 = () => H.今の月番(s);
    確('山賊退治の月は、予定の月（始めの二か月後）から', !H.山賊の月か(s) && f.予定.山賊 === 今() + 2);
    s.month = 6;
    確('予定の月が来れば山賊退治の月', H.山賊の月か(s));
    const 務め = H.山賊の務めを決める(s, () => 0.5);
    確('務めの重さと中身は盤を開く前に決める（並なら山賊三十八人）', 務め.種 === '山賊退治' && 務め.重さ === '並' && /およそ38人/.test(務め.文), 務め.文);
    const b = H.山賊の盤を組む(s, 務め);
    const 組 = b.corps.find((c) => c.id === H.主命の組), 賊 = b.corps.find((c) => c.id === H.山賊の隊);
    const 数 = (c) => c.squads.reduce((a, q) => a + q.men, 0);
    確('山賊退治の盤：主人公の組（足軽なら四十人）と山賊（並なら三十八人）の野戦', !!組 && !!賊 && 組.side === 'P' && 賊.side === 'E'
      && 数(組) === 40 && 数(賊) === 38 && b.mode === 'field', 組 && 賊 && `${組.name} ${数(組)}人 対 ${賊.name} ${数(賊)}人`);
    const 前 = { 勲功: f.勲功, 覚え: f.覚え, 金: f.金 };
    H.山賊退治の果て(s, { result: 'P', 一人働き: { 討ち取り: 3, 雑兵: 3, 侍: 0, 体力: 80, 討死: false } }, 務め);
    確('勝てば務めを果たし、討ち取りの勲功（雑兵三人で一）と褒美（並：勲功二・覚え六・金二貫）を得る', f.勲功 === 前.勲功 + 1 + 2 && f.覚え === 前.覚え + 6
      && f.金 === 前.金 + 2 && f.主命の数.果たした === 1 && f.体力 === 80 && /山賊退治の務めを果たした/.test(f.記[f.記.length - 1].文),
      `勲功${f.勲功}・覚え${f.覚え}・金${f.金}`);
    確('次の山賊退治は三か月後', f.予定.山賊 === 今() + 3 && !H.山賊の月か(s), JSON.stringify(f.予定));
    const 覚え前 = f.覚え;
    H.山賊退治の果て(s, { result: 'E', 一人働き: { 討ち取り: 0, 体力: 50, 討死: false } }, H.山賊の務めを決める(s, () => 0.1));
    確('負ければ果たせず、覚えが五下がる', f.覚え === 覚え前 - 5 && f.主命の数.しくじった === 1);
    /* 主命は特殊勢力への働きかけだけ */
    const s2 = initState('oda'); H.風雲を始める(s2);
    確('主命の下る見込みは、これまでの働きかけの割（一割三分五厘）', H.働きかけの下る目 === 0.135 && H.主命を下す(s2, () => 0.2) === null);
    const 町ら = H.手の届く町ら(s);
    確('手の届く町（家がいちばん近い城を押さえる町）がある', 町ら.length > 0, 町ら.slice(0, 3).map((x) => x.name).join('・'));
    const 命 = H.主命を下す(s, 列([0.1, 0.5]));
    確('主命は上司から、期限と重さをつけて下される（特殊勢力への働きかけ）', !!命 && 命.種 === '特殊勢力への働きかけ' && 命.重さ === '並' && 命.上司 === f.上司
      && 命.町 === 町ら[0].id && /主命を受けた/.test(f.記[f.記.length - 1].文), 命 && `${命.文}（期限 ${命.期限.年}年${命.期限.月}月）`);
    確('主命のあるあいだは、新たな主命は下されない', H.主命を下す(s, () => 0) === null);
    f.行い = ['稽古'];
    H.主命の月の初め(s, () => 0);
    確('主命に励まない月は、働きかけない', !!f.主命);
    f.行い = ['主命に励む'];
    H.主命の月の初め(s, () => 0.99);
    確('まとまらなければ、期限まで続く', !!f.主命 && /話はまとまらなかった/.test(f.記[f.記.length - 1].文));
    H.主命の月の初め(s, () => 0);
    確('まとまれば主命を果たす', !f.主命 && f.主命の数.果たした === 2 && f.記.slice(-2).some((x) => /誼を通じる下地ができた/.test(x.文)),
      f.記.slice(-2).map((x) => x.文).join(' ／ '));
    H.主命を下す(s, 列([0.1, 0.1]));
    const 覚え前2 = f.覚え;
    s.year = 1546; s.month = 11;
    H.主命の月が明けた(s, () => 0.99);
    確('期限を過ぎた主命はしくじりとなり、覚えが八下がる', !f.主命 && f.覚え === 覚え前2 - 8 && /期限を過ぎ/.test(f.記[f.記.length - 1].文));
  }
  {
    /* 画面：務めの予定の札・務めの月に月を送ると山賊退治の盤が開く・戦のあとに月が送られる */
    蔵.clear();
    const s = initState('oda'); H.風雲を始める(s);
    s.風雲.予定 = { 山賊: 1546 * 12 + 4, 偵察: 1546 * 12 + 10 };       // 今月（一五四六年四月）が山賊退治
    蔵.set('sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s }));
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
    await rc('続きから'); for (let i = 0; i < 4; i++) await flush();
    const 見る的 = H.偵察の的を選ぶ(s);
    確('屋敷に務めの予定の札が出る（今月の山賊退治・次の威力偵察とその的）', /務めの予定/.test(文()) && /山賊退治（三か月ごと）：今月/.test(文())
      && /威力偵察（半年ごと）：1546年10月/.test(文()) && 文().includes(`的：${見る的.城.name}（${見る的.家名}`), (文().match(/務めの予定.{0,90}/) || [''])[0]);
    確('務めの月は、月を送る釦が「山賊退治に出て、月を送る」になる', !!btn('山賊退治に出て、月を送る'));
    await rc('山賊退治に出て、月を送る'); for (let i = 0; i < 4; i++) await flush();
    const b = window.__合戦;
    確('山賊退治の盤が開く（足軽として、出陣前の問いなし）', !!b && b.phase === 'fight' && /足軽の身では/.test(文()) && !/自ら采を執る/.test(文()) && /山賊/.test(文()));
    確('主人公は主命の組に立つ', !!b && b.corps.some((c) => c.id === H.主命の組 && c.side === 'P'));
    b.一人働き = { 討ち取り: 3, 雑兵: 3, 侍: 0, 体力: 70, 討死: false };
    await click(btnAny('委ねて結果を見る'));
    for (let i = 0; i < 600 && b.phase === 'fight'; i++) await flush();
    await rc('戦場を離れる'); for (let i = 0; i < 12; i++) await flush();
    確('戦のあとで、その月が送られる', /1546年5月/.test(文()) && /今月の行い/.test(文()), (文().match(/\d{4}年\d+月/) || [''])[0]);
    確('務めの果てが記される（果たした・果たせなかった のいずれか）', /山賊退治の務めを果たした|山賊退治の務めを果たせなかった/.test(文()),
      (文().match(/山賊退治の務めを果たし[^。]*。/) || [''])[0]);
    確('次の山賊退治は三か月後（一五四六年七月）', /山賊退治（三か月ごと）：1546年7月/.test(文()));
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
    const 他の将 = s.generals.find((x) => x.faction === 'oda' && x.id !== f.上司 && !x.lord);
    確('上司のいない軍の城攻めは、主人公の城攻めではない', H.風雲の城攻めか(s, { ...軍, gens: [他の将.id] }, 敵城) === false);
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
    const { s, 敵城, 上: 囲む上司 } = 囲みを仕込む();
    s.風雲の城攻め = [{ castleId: 敵城.id, armyId: 'fuun-army' }];
    蔵.set('sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s }));
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
    await rc('続きから'); for (let i = 0; i < 8; i++) await flush();
    const b = window.__合戦;
    確('城攻めの盤が開く（見物でも、上司の城攻めは盤で戦う）', !!b && !!b.map && b.phase === 'fight', b ? `${b.phase}・城の盤 ${!!b.map}` : '開かない');
    確('足軽として出る（出陣前の問い・門の割り付けを経ない）', /足軽の身では/.test(文()) && !/自ら采を執る|城門の割り付け/.test(文()));
    確('上司の隊が寄せ手の側に立つ', !!b && b.corps.some((c) => c.id === 囲む上司.id && c.side === 'P'));
    /* 背中越しの城（hitori/shiro_senaka.js）：造作を集め、壁の当たりを持ち、描いて落ちない */
    {
      const m = b.map, o = m.layers[0], g = o.gates.find((x) => x.face === 'S') || o.gates[0];
      const 箱ら = H.城の箱を集める(m, H.歩の尺);
      const 扉の数 = (xs) => xs.reduce((n, x) => n + x.部品.filter((p) => p.扉).length, 0);
      const 閉じた門 = m.layers.reduce((n, l) => n + l.gates.filter((x) => !x.broken).length, 0);
      確('城の造作が集まる（石垣と塀・櫓門・枡形・矢倉など）', 箱ら.length > 50 && 扉の数(箱ら) === 閉じた門, `${箱ら.length}の物・扉${扉の数(箱ら)}／閉じた門${閉じた門}`);
      const 堀 = H.堀の帯(m);
      確('堀と橋が地に敷かれる', 堀.堀.length === 1 && 堀.橋.length === o.gates.length);
      const 寄せ = b.corps.find((c) => c.id === 囲む上司.id);
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
      const 態 = H.背中を始める(b, 囲む上司.id, '足軽', null, { 体力: 100, 武勇: 45, 一度きり: true, 名: '与平' });
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

  /* ======================================================= 七、陣借り */
  console.log('\n── 七　陣借り（上司の戦でなくても、家の他の将の戦に一度加わる）');
  {
    const s = initState('oda'); H.風雲を始める(s); const f = s.風雲;
    const 他の城 = s.castles.find((c) => c.faction === 'oda' && c.id !== f.城 && s.generals.some((x) => x.at === c.id && x.faction === 'oda'));
    const 城主 = s.generals.find((x) => x.id === 他の城.lordId && x.at === 他の城.id) || s.generals.find((x) => x.at === 他の城.id && x.faction === 'oda');
    const 敵軍 = { id: 'E1', faction: 'saito', gens: ['yoshitatsu'], at: 他の城.id };
    const 家の軍 = { id: 'A2', faction: 'oda', gens: ['hidesada'], at: 'inabayama' };
    const 敵城 = s.castles.find((c) => c.id === 'inabayama');
    確('陣借りを選ばない月は、上司のいない家の戦には出ない', H.風雲の戦か(s, 敵軍, 他の城, null) === false && H.風雲の戦か(s, 家の軍, 敵城, null) === false);
    f.行い = ['陣借り']; H.風雲の月の初め(s);
    const 選 = H.風雲の隊を選ぶ(s, 敵軍, 他の城, null);
    const 借 = 選 && s.generals.find((x) => x.id === 選.隊id), 当主 = s.generals.find((x) => x.faction === 'oda' && x.lord);
    確('陣借りを選んだ月は、家の城を守る戦に、その城の将（当主と一門でない者を先に）の隊で出る', !!選 && 選.陣借り && !!借 && 借.at === 他の城.id
      && !借.lord && !H.isKin(借, 当主), 借 ? `${借.name}の隊` : 'なし');
    void 城主;
    const 選2 = H.風雲の隊を選ぶ(s, 家の軍, 敵城, null);
    確('家の軍が寄せる戦には、その軍の先頭の将の隊で出る', !!選2 && 選2.隊id === 'hidesada' && 選2.陣借り);
    const 選3 = H.風雲の城攻めの隊(s, 家の軍, 敵城);
    確('城攻めでも陣借りできる', !!選3 && 選3.隊id === 'hidesada' && 選3.陣借り);
    H.戦の勲功を記す(s, { result: 'P', 一人働き: { 討ち取り: 1, 体力: 90, 討死: false } }, '稲葉山城', { 陣借り: true, 隊id: 'hidesada' });
    確('陣借りの戦の記に、陣を借りた将の名が残る', /林秀貞の陣を借りて、稲葉山城の勝ち戦に足軽として出た/.test(f.記[f.記.length - 1].文), f.記[f.記.length - 1].文);
    確('陣借りは一月に一度（出たあとは、その月の家の戦には出ない）', H.風雲の戦か(s, 家の軍, 敵城, null) === false);
    f.行い = []; H.風雲の月の初め(s);
    確('次の月に陣借りを選ばなければ、陣借りは消える', !f.陣借り);
  }
  {
    /* 画面：上司のいない家の城へ敵が着いた月に陣借りしていれば、城主の隊で盤に出る */
    蔵.clear();
    const s = initState('oda'); H.風雲を始める(s); const f = s.風雲;
    const 他の城 = s.castles.find((c) => c.faction === 'oda' && c.id !== f.城 && s.generals.some((x) => x.at === c.id && x.faction === 'oda'));
    const 敵城 = s.castles.find((d) => d.faction !== 'oda' && !String(d.faction).startsWith('_') && (H.findPath(他の城.id, d.id) || []).length >= 2);
    const 敵将 = s.generals.filter((x) => x.faction === 敵城.faction && !x.captive && x.at === 敵城.id).slice(0, 2);
    for (const q of 敵将) q.at = null;
    const 敵軍 = { id: 'foe-army', faction: 敵城.faction, from: 敵城.id, gens: 敵将.map((x) => x.id), local: 1500, localTrain: 60, rost: null,
      men: 1500 + 敵将.reduce((a, x) => a + x.retinue, 0), at: 他の城.id, path: [他の城.id], prog: 0, food: 9000, target: 他の城.id };
    s.armies.push(敵軍); s.pendingArrivals = [敵軍.id]; s.monthEvents = [];
    f.陣借り = { 済: false };
    蔵.set('sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s }));
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
    await rc('続きから'); for (let i = 0; i < 6; i++) await flush();
    const b = window.__合戦;
    const 城の将 = s.generals.filter((x) => x.at === 他の城.id && x.faction === 'oda').map((x) => x.id);
    確('陣借りで、上司のいない家の城の戦に足軽として出る', !!b && /足軽の身では/.test(文()), b ? b.phase : '開かない');
    確('主人公はその城の将の隊に立つ', !!b && !!(window.__背中() || {}).組 && 城の将.some((id) => ((window.__背中() || {}).組 || '').startsWith(id)), (window.__背中() || {}).組);
    if (b) {
      await click(btnAny('委ねて結果を見る'));
      for (let i = 0; i < 600 && b.phase === 'fight'; i++) await flush();
      await rc('戦場を離れる'); for (let i = 0; i < 12; i++) await flush();
    }
    確('戦のあとの記に「陣を借りて」と残る', /の陣を借りて、/.test(文()), (文().match(/[^。]*の陣を借りて、[^。]*。/) || [''])[0]);
    await act(async () => { root.unmount(); }); await flush();
  }

  /* ======================================================= 八、持ち場と大将首 */
  console.log('\n── 八　持ち場（物頭未満）と、抜け駆けの大将首');
  {
    H.setBattleMap(null); H.setFieldSeed('fuun', 'mochiba'); H.layoutField(7000, 6);
    const W = H.FIELD.w, Hh = H.FIELD.h;
    const 将 = (i, lord) => ({ id: `g${i}`, name: `将${i}`, lead: 65, valor: 65, wit: 58, gov: 55, retinue: 500, retTrain: 70, unity: 62, lord: !!lord });
    const 仕立てる = () => {
      const P = [0, 1].map((k) => H.makeCorps('P', 将(k), 0, 900, 75, 75, W * (0.35 + k * 0.3), Hh * 0.7, -Math.PI / 2, '#2F5D8C'));
      const E = [0, 1].map((k) => H.makeCorps('E', 将(10 + k, k === 0), 0, 900, 75, 75, W * (0.35 + k * 0.3), Hh * 0.3, Math.PI / 2, '#B0483C'));
      for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
      const b = H.createBattle(P, E, 'P'); b.mode = 'field'; b.phase = 'fight'; b.dusk = 1100;
      return b;
    };
    const 備え = { 体力: 90, 武勇: 45, 一度きり: true, 名: '与平', 風雲: true, 首の勲功: H.首の勲功 };
    const 空 = { 兵: [], 倒れ: [] };
    /* 隊の組からの隔たり（m）。senaka.js の 持ち場を見る と同じ測り方 */
    const b = 仕立てる();
    const 態 = H.背中を始める(b, 'g1', '足軽', null, 備え);
    const 隊 = b.corps.find((c) => c.id === 'g1');
    H.与平を進める(b, 態, 0.05, 空);
    確('組のうしろに立てば持ち場の内（咎は無い）', !!態.持ち場 && 態.持ち場.内 && 態.持ち場.咎 === 0, 態.持ち場 && `組から${Math.round(態.持ち場.間)}m`);
    /* 持ち場の外（組から九十m ほど横）へ移す */
    const 元 = { x: 態.我.x, z: 態.我.z };
    態.我.x += 90;
    const 進める = (秒) => { for (let k = 0; k < Math.round(秒 / 0.25); k++) H.与平を進める(b, 態, 0.25, 空); };
    進める(10);
    const 咎10 = 態.持ち場.咎;
    確('持ち場の外にいれば咎が積もる（十秒で 咎の目(10)）', !態.持ち場.内 && Math.abs(咎10 - H.咎の目(10)) < 0.01,
      `組から${Math.round(態.持ち場.間)}m・咎${咎10.toFixed(2)}（持ち場は${H.持ち場の間}mまで）`);
    進める(10);
    const 咎20 = 態.持ち場.咎;
    確('外にいるほど咎の積もりが早くなる（次の十秒の咎は、はじめの十秒より多い）', 咎20 - 咎10 > 咎10 && Math.abs(咎20 - H.咎の目(20)) < 0.01,
      `十秒まで${咎10.toFixed(2)}・二十秒まで${咎20.toFixed(2)}`);
    確('盤の一人働きに咎が書かれる', b.一人働き && Math.abs(b.一人働き.咎 - 咎20) < 1e-9, b.一人働き && String(b.一人働き.咎));
    態.我.x = 元.x; 態.我.z = 元.z;
    進める(10);
    確('持ち場へ戻れば咎は増えない（積もった咎は残る）', 態.持ち場.内 && Math.abs(態.持ち場.咎 - 咎20) < 1e-9, 態.持ち場.咎.toFixed(2));
    態.我.x += 90;
    進める(10);
    確('また離れれば、離れた秒は一から数え直す', Math.abs(態.持ち場.咎 - (咎20 + H.咎の目(10))) < 0.01, 態.持ち場.咎.toFixed(2));
    /* 物頭は自分では動かず、持ち場の咎も無い */
    const b2 = 仕立てる();
    const 態2 = H.背中を始める(b2, 'g1', '物頭', null, 備え);
    if (態2 && 態2.我) { 態2.我.x += 90; for (let k = 0; k < 40; k++) H.与平を進める(b2, 態2, 0.25, 空); }
    確('物頭には持ち場の咎が無い', !!態2 && (!態2.持ち場 || 態2.持ち場.咎 === 0));

    /* 本陣の将を突き伏せる（持ち場の外で） */
    const 敵将の隊 = b.corps.find((c) => c.id === 'g10'), 隣 = b.corps.find((c) => c.id === 'g11'), 味方 = b.corps.find((c) => c.id === 'g0');
    確('総大将の見分け（当主の隊が総大将。ほかの隊は大将）', H.総大将か(b, 敵将の隊) === true && H.総大将か(b, 隣) === false);
    const 気前 = { 隣: 隣.morale, 味方: 味方.morale };
    const 将の姿 = { x: 態.我.x, z: 態.我.z + 1.5, fx: 0, fz: -1, 側: 'E', 型: 'kiba', 働: '立', 相: 0, 歩: 0, v: 0, 丈: 1.04, 幅: 1.06, 癖: 3,
      鍵: 7, 組: 敵将の隊, 番: 100, 本陣: { c: 敵将の隊, n: 0 }, 将: true };
    const 眺 = { 兵: [将の姿], 倒れ: [] };
    let 突いた = 0;
    for (let k = 0; k < 160 && !(態.首 && 態.首.length) && 態.我.倒 == null; k++) {
      if (H.突く(態)) 突いた++; H.与平を進める(b, 態, 0.25, 眺); H.与平を進める(b, 態, 0.3, 眺);
    }
    確('大将は二突きでは倒れない（武勇六十五の将は十二太刀。会心は二太刀に数える）', H.将の太刀(65) === 12 && 突いた >= 6, `${突いた}突きで首`);
    const 首 = (b.一人働き.首 || [])[0];
    確('本陣の将を突き伏せれば首を取る（盤の一人働きに首が書かれる）', !!首 && 首.名 === '将10' && 首.総大将 === true, JSON.stringify(b.一人働き.首));
    確('持ち場の外で取った首は「抜け駆け」と記される', !!首 && 首.抜け駆け === true);
    確('首を取られた隊は、将が討たれた印を持ち、士気が崩れる', !!敵将の隊.将討たれ && 敵将の隊.将討たれ.手 === '与平' && 敵将の隊.morale <= 10);
    確('総大将が討たれれば、同じ側の隊の士気は大きく下がり、相手の側は上がる', 隣.morale <= 気前.隣 - 27 && 味方.morale >= Math.min(100, 気前.味方 + 13),
      `隣 ${気前.隣}→${隣.morale}・味方 ${気前.味方}→${味方.morale}`);
    const 知 = (態.知らせ || []).find((o) => o.種 === 'kubi');
    確('背中越しの知らせに「総大将の首を取った」と勲功が出る', !!知 && 知.文 === '総大将の首を取った' && /勲功 \+20/.test(知.副), 知 && `${知.文} ${知.副}`);
    確('首の勲功は総大将二十・大将十、山賊の頭は数えない', H.首の値({ 総大将: true }) === 20 && H.首の値({ 総大将: false }) === 10 && H.首の値({ 総大将: true, 山賊: true }) === 0);

    /* 合戦のあと：勲功と覚えへ積む */
    const s = initState('oda'); H.風雲を始める(s); const f = s.風雲;
    const 前 = { 勲功: f.勲功, 覚え: f.覚え };
    H.戦の勲功を記す(s, { result: 'P', 一人働き: { 討ち取り: 4, 雑兵: 3, 侍: 0, 体力: 80, 討死: false, 首: [{ 名: '柴田勝家', 総大将: false, 抜け駆け: true }], 咎: 6.4 } }, '清洲城');
    const 記 = f.記.map((x) => x.文).join('／');
    確('大将首は勲功十（雑兵三人の一と合わせて十一）', f.勲功 === 前.勲功 + 11, `勲功 ${前.勲功}→${f.勲功}`);
    確('持ち場を離れた咎（六.四）は、覚えから六を引く', f.覚え === 前.覚え - 6, `覚え ${前.覚え}→${f.覚え}`);
    確('記に「抜け駆けし、首を取った」と「覚えが下がった」が残る', /持ち場を離れて抜け駆けし、柴田勝家の首を取った。勲功10。/.test(記) && /持ち場を離れたため、上司の覚えが6下がった。/.test(記), 記.slice(-80));
    確('勲功十一では、まだ足軽（十人長は二十から）', f.身分 === '足軽', f.身分);
    /* 山賊退治：咎は同じく引く。山賊の頭は大将首に数えず、名のある侍と同じに一 */
    const 覚え前 = f.覚え, 勲功前 = f.勲功, 端前 = f.雑兵の端 || 0;
    H.山賊退治の果て(s, { result: 'P', 一人働き: { 討ち取り: 1, 雑兵: 0, 侍: 1, 体力: 80, 討死: false, 首: [{ 名: '山賊', 総大将: true, 山賊: true }], 咎: 3.2 } },
      { 種: '山賊退治', 重さ: '軽', 文: '山賊を討て' });
    const 重 = H.主命の重さ.軽;
    確('山賊退治でも咎を覚えから引き、山賊の頭は名のある侍と同じに一（ほかは務めの褒美）',
      f.勲功 === 勲功前 + 1 + 重.勲功 && f.覚え === Math.min(100, 覚え前 - 3 + 重.覚え) && (f.雑兵の端 || 0) === 端前 && /山賊の頭を討ち取った。/.test(f.記.map((x) => x.文).join('')),
      `勲功 ${勲功前}→${f.勲功}・覚え ${覚え前}→${f.覚え}`);
  }
  {
    /* 画面：首を取られた将は、合戦のあと必ず討死となる */
    蔵.clear();
    const s = initState('oda'); H.風雲を始める(s); const f = s.風雲;
    const 本拠 = s.castles.find((c) => c.id === f.城);
    const 敵城 = s.castles.find((d) => d.faction !== 'oda' && !String(d.faction).startsWith('_') && (H.findPath(本拠.id, d.id) || []).length >= 2);
    const 敵将 = s.generals.filter((x) => x.faction === 敵城.faction && !x.captive && x.at === 敵城.id).slice(0, 2);
    for (const t of 敵将) t.at = null;
    const 敵軍 = { id: 'foe-army', faction: 敵城.faction, from: 敵城.id, gens: 敵将.map((x) => x.id),
      local: 1500, localTrain: 60, rost: null, men: 1500 + 敵将.reduce((a, x) => a + x.retinue, 0),
      at: 本拠.id, path: [本拠.id], prog: 0, food: 9000, target: 本拠.id };
    s.armies.push(敵軍); s.pendingArrivals = [敵軍.id]; s.monthEvents = [];
    蔵.set('sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s }));
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
    await rc('続きから'); for (let i = 0; i < 6; i++) await flush();
    const b = window.__合戦;
    const 的 = b && b.corps.find((c) => c.side === 'E' && 敵将.some((x) => x.id === c.id));
    確('敵の将の隊が盤に立つ', !!的, 的 ? 的.name : 'なし');
    if (b && 的) {
      const 首 = window.__一人働き.将を討つ(b, 的, { 名: f.名 });
      b.一人働き = { 討ち取り: 1, 体力: 80, 討死: false, 首: [{ ...首, 抜け駆け: true }], 咎: 5.6 };
      await click(btnAny('委ねて結果を見る'));
      for (let i = 0; i < 600 && b.phase === 'fight'; i++) await flush();
      await rc('戦場を離れる'); for (let i = 0; i < 12; i++) await flush();
      確('首を取られた将は、合戦のあと討死となる', (b.notices || []).some((n) => n.text === `${的.name}、討死。`),
        (b.notices || []).filter((n) => /討死|捕縛|討ち取/.test(n.text)).map((n) => n.text).join('／'));
      確('屋敷の記に、首の勲功と覚えの咎が残る', new RegExp(`持ち場を離れて抜け駆けし、${的.name}(（総大将）)?の首を取った。勲功(10|20)。`).test(文()) && /上司の覚えが6下がった/.test(文()),
        (文().match(/[^。]*の首を取った。勲功\d+。/) || [''])[0]);
    }
    await act(async () => { root.unmount(); }); await flush();
  }

  /* ======================================================= 九、上司を軍に加えやすくする */
  console.log('\n── 九　上司を軍に加えやすくする・主人公の家だけ攻め気を上げる');
  {
    const s = initState('oda'); H.風雲を始める(s); const f = s.風雲;
    確('主人公の家だけ上司を見る（他家・風雲でない盤では見ない）', H.風雲の主家の上司(s, 'oda') === f.上司 && H.風雲の主家の上司(s, 'saito') === null
      && H.風雲の主家の上司(initState('oda'), 'oda') === null);
    確('主人公の家の攻め気（腰一.五倍・好機は毎月・好機の見立て一.二倍）は、他家（一.四倍・八割五分まで）より強い',
      H.主家の腰の倍 > 1 && H.主家の好機の腰 > H.好機の腰 && H.主家の好機の余裕 < H.好機の余裕);
  }
  {
    /* 兵の寄せ（武田家。上司 飯富昌景の岩殿城とほかの城が、家の領を通ってつながっている。織田家は上司の勝幡城と
       那古野・鳴海のあいだに清洲（他家）があり、家の領だけでは道がつながらない） */
    const s = initState('takeda'); H.風雲を始める(s); const f = s.風雲;
    const 上 = s.generals.find((x) => x.id === f.上司), 上の城 = s.castles.find((c) => c.id === 上.at);
    const 歩 = (a, b2) => (H.軍の道(s, 'takeda', a, b2) || []).length - 1;
    const 発つ = s.castles.find((c) => c.faction === 'takeda' && c.id !== 上の城.id && 歩(上の城.id, c.id) >= 1 && 歩(上の城.id, c.id) <= 5
      && s.castles.some((y) => y.faction === 'takeda' && y.id !== c.id && y.id !== 上の城.id && 歩(y.id, c.id) >= 1 && 歩(y.id, c.id) < 歩(上の城.id, c.id)));
    確('試しの据え：上司の城より近い家の城のある、発つ城がある', !!発つ, 発つ ? `${発つ.name}（上司の城 ${上の城.name} まで${歩(上の城.id, 発つ.id)}歩）` : 'なし');
    if (発つ) {
      /* 上司の城に、上司より統率の高い家臣を置き、兵の余りも持たせる */
      s.generals.push({ ...上, id: 'fuun-rival', name: '統率の高い家臣', lead: 99, lord: false });
      上の城.local += 4000;
      const 軍 = () => ({ id: 'tst', faction: 'takeda', from: 発つ.id, gens: [], local: 0, men: 0, food: 0, rost: [] });
      const 寄 = H.近隣から兵を寄せる(s, 'takeda', 発つ, 軍(), { 道: H.軍の道, 限り: 1, 歩: 5 });
      確('兵を寄せるとき、上司のいる城から先に呼び（近い城があっても）、上司を将として呼ぶ', 寄.length === 1 && 寄[0].城.id === 上の城.id && 寄[0].将 && 寄[0].将.id === 上.id,
        寄.map((q) => `${q.城.name}・${q.将 ? q.将.name : '将なし'}`).join('／'));
      H.寄せを返す(寄); 上.at = 上の城.id;
      const 素 = structuredClone(s); delete 素.風雲;
      const 素の上の城 = 素.castles.find((c) => c.id === 上の城.id), 素の発つ = 素.castles.find((c) => c.id === 発つ.id);
      const 寄2 = H.近隣から兵を寄せる(素, 'takeda', 素の発つ, 軍(), { 道: H.軍の道, 限り: 1, 歩: 5 });
      確('風雲でない盤では、これまでどおり近い城から呼び、統率の高い将を呼ぶ', 寄2.length === 1 && 寄2[0].城.id !== 素の上の城.id,
        寄2.map((q) => `${q.城.name}・${q.将 ? q.将.name : '将なし'}`).join('／'));
    }
  }

  /* ======================================================= 十、威力偵察 */
  console.log('\n── 十　威力偵察（半年ごと。攻略対象の大名と小競り合いをし、勝てば敵の兵が実際に減る）');
  {
    const s = initState('oda'); H.風雲を始める(s); const f = s.風雲;
    const 上 = s.generals.find((x) => x.id === f.上司);
    const 城の兵 = (c) => c.local + s.generals.filter((x) => x.at === c.id && x.faction === c.faction && !x.captive).reduce((a, x) => a + x.retinue, 0);
    const 的 = H.偵察の的を選ぶ(s);
    確('偵察の的は、上司の城から道の届く敵の城のうち、攻めるに要る兵に寄せられる兵がいちばん近い城（家の狙う城があればそれ）',
      !!的.城 && 的.城.faction !== 'oda' && !!的.家名 && 的.不足 != null, 的.城 ? `${的.城.name}（${的.家名}・兵${Math.round(的.兵)}・足りない兵${Math.round(的.不足)}）` : 的.訳);
    const b = H.偵察の盤を組む(s, 的, () => 0.5);
    const 我 = b.corps.find((c) => c.id === H.偵察の組), 敵 = b.corps.find((c) => c.id === H.偵察の敵);
    確('偵察の盤：上司の手勢と、的の城の物見の兵の野戦（敵の頭は大将首に数えない）', !!我 && !!敵 && 我.side === 'P' && 敵.side === 'E' && 敵.物見 === true
      && b.偵察.我の数 >= 150 && b.偵察.敵の数 >= 100 && b.偵察.城 === 的.城.id, `${我.name} ${b.偵察.我の数}人 対 ${敵.name} ${b.偵察.敵の数}人`);
    const 減らす = (c, n) => { let r = n; for (const q of c.squads) { const d = Math.min(q.men, r); q.men -= d; r -= d; if (r <= 0) break; } };
    減らす(敵, 80); 減らす(我, 30); b.result = 'P';
    b.一人働き = { 討ち取り: 4, 雑兵: 3, 侍: 1, 体力: 75, 討死: false };
    const 城兵前 = 城の兵(的.城), 手勢前 = 上.retinue, 勲功前 = f.勲功, 今 = H.今の月番(s);
    H.偵察の果て(s, b);
    確('勝てば、敵の城の兵が討たれた分だけ実際に減る', 城の兵(的.城) === 城兵前 - 80, `${城兵前} → ${城の兵(的.城)}`);
    確('味方の損は上司の手勢から減る', 上.retinue === 手勢前 - 30, `${手勢前} → ${上.retinue}`);
    確('働きは勲功に積む（雑兵三人で一・名のある侍一）', f.勲功 === 勲功前 + 2 && f.合戦 === 1, `勲功 ${勲功前} → ${f.勲功}`);
    確('勝てば、その城を半年のあいだ家の出陣の的として重く見る', !!f.偵察の的 && f.偵察の的.城 === 的.城.id && f.偵察の的.迄 === 今 + 6);
    確('次の威力偵察は半年後', f.予定.偵察 === 今 + 6);
    確('記が残る（減らした敵の兵・味方の損・討ち取り・勲功）', f.記.some((x) => new RegExp(`${的.城.name}（${的.家名}）へ威力偵察に出て勝ち戦。敵の兵80人を減らし、味方の損は30人。討ち取り4（雑兵3・名のある侍1）・勲功2。`).test(x.文)),
      f.記.slice(-2).map((x) => x.文).join(' ／ '));
    上.at = null;
    確('上司が出陣中なら、偵察は見合わせて翌月に見直す', H.偵察の的を選ぶ(s).訳 === '上司が出陣中' && (H.偵察を見合わせる(s, '上司が出陣中'), f.予定.偵察 === H.今の月番(s) + 1));
  }
  {
    /* 画面：偵察の月に月を送ると、偵察の盤が開き、戦のあとで月が送られる */
    蔵.clear();
    const s = initState('oda'); H.風雲を始める(s);
    s.風雲.予定 = { 山賊: 1546 * 12 + 7, 偵察: 1546 * 12 + 4 };       // 今月（一五四六年四月）が威力偵察
    蔵.set('sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s }));
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
    await rc('続きから'); for (let i = 0; i < 4; i++) await flush();
    確('偵察の月は、月を送る釦が「威力偵察に出て、月を送る」になる', !!btn('威力偵察に出て、月を送る'));
    await rc('威力偵察に出て、月を送る'); for (let i = 0; i < 4; i++) await flush();
    const b = window.__合戦;
    確('偵察の盤が開く（足軽として、出陣前の問いなし）', !!b && !!b.偵察 && b.phase === 'fight' && /足軽の身では/.test(文()) && !/自ら采を執る/.test(文()));
    確('主人公は上司の手勢に立つ', !!b && b.corps.some((c) => c.id === H.偵察の組 && c.side === 'P'));
    if (b) {
      b.一人働き = { 討ち取り: 2, 雑兵: 2, 侍: 0, 体力: 80, 討死: false };
      await click(btnAny('委ねて結果を見る'));
      for (let i = 0; i < 900 && b.phase === 'fight'; i++) await flush();
      await rc('戦場を離れる'); for (let i = 0; i < 12; i++) await flush();
    }
    確('戦のあとで月が送られ、偵察の記が残る', /1546年5月/.test(文()) && /へ威力偵察に出て(勝ち戦|負け戦|引き分け)。敵の兵\d+人を減らし、味方の損は\d+人/.test(文()),
      (文().match(/[^。]*威力偵察に出て[^。]*。[^。]*。/) || [''])[0]);
    確('次の威力偵察は半年後（一五四六年十月）', /威力偵察（半年ごと）：1546年10月/.test(文()));
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
