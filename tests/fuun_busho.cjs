/* ============================================================
   風雲モード：物頭から上（武将の段）の試験（hitori/fuun.js 武将の段・hitori/shumei.js・hitori/FuunYashiki.jsx・battle/engine.js）

   遊ぶ人の申し出：身分は「勲功を加増（禄）に換え、禄高で決まる（キャンペーンと同じ）」、「禄高を上げるために勲功をあげる
   必要がある。その仕組みを検討してください」（案に「それでお願いします」）、「物頭以上は上司が城主になる」。
     一、物頭に取り立てられれば知行を賜り、上司は住む城の城主になる（城主のいない城なら当主）
     二、預かる隊の勲功：敵の組を破る・敵の隊を潰す（総大将は重い）・勝ち戦（槍を合わせたか）・城を落とす・門を破る・守り切る
     三、盤の記録：最後に損害を与えた隊が、敵の隊を潰した手柄を持つ（battle/engine.js 隊を潰した）
     四、論功行賞：勲功を得たのちの月送りで、勲功 × 百五十石 × 家の尺 × 覚えの倍 を加増。正月・七月にも。余地が足りなければ金
     五、禄高で身分：境（家の尺を掛ける）に届けば侍大将・家老・宿老。下がらない。就いたときの境を控える
     六、物頭の合戦・山賊退治・威力偵察で、預かる隊の勲功が積まれ、記に残る
     七、屋敷：禄高・次の身分・まだ賞されていない勲功を出す
   値はみな仮。
   ============================================================ */
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
global.IS_REACT_ACT_ENVIRONMENT = true; dom.window.IS_REACT_ACT_ENVIRONMENT = true;
const ctxStub = new Proxy({}, { get: (t, p) => { if (p === 'measureText') return () => ({ width: 30 }); return () => ({ addColorStop: () => {} }); } });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 200));
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, React, initState } = H;
const 咎 = [];
const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎.push(名); };
let 種 = 0x7B21;
Math.random = () => { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 新しい風雲 = (身分 = '三百人長', 勲功 = 200) => { const s = initState('oda'); H.風雲を始める(s); s.風雲.身分 = 身分; s.風雲.勲功 = 勲功; return s; };
/* 物頭にしたばかりの風雲 */
const 物頭の風雲 = () => { const s = 新しい風雲('三百人長', 270); H.取り立てを見る(s); return s; };

(async () => {
  console.log('── 一　物頭に取り立てられれば知行を賜り、上司は住む城の城主になる');
  {
    const s = 物頭の風雲(), f = s.風雲;
    const k = H.家の尺(s, s.player);
    確('勲功二百七十で物頭に取り立てられる', f.身分 === '物頭');
    確(`知行 ${H.武将の始めの知行}石 × 家の尺 を賜る`, f.知行 === Math.round(H.武将の始めの知行 * k), `知行${f.知行}石（家の尺${k}）`);
    確('それまでの勲功は取り立てに使ったものとする（まだ賞されていない勲功は〇）', f.賞した勲功 === 270 && f.前の勲功 === 270);
    const 城 = s.castles.find((c) => c.id === f.城), 主 = H.castellanOf(s, 城);
    確('上司は住む城の城主（当主の城なら当主）', f.上司 === 主.id, `${城.name}・上司 ${主.name}${主.lord ? '（当主）' : ''}`);
    確('記に、知行を賜ったことと上司が改まったことを記す', (f.記 || []).some((x) => /物頭として知行\d+石を賜った/.test(x.文)));
    /* 城主のいない城に住めば、上司は当主 */
    const s2 = 物頭の風雲(), f2 = s2.風雲;
    const 他 = s2.castles.find((c) => c.faction === s2.player && c.id !== f2.城 && !s2.generals.some((x) => x.lord && x.at === c.id));
    if (他) {
      他.lordId = null; for (const x of s2.generals.filter((q) => q.at === 他.id)) x.at = null;
      f2.城 = 他.id; H.上司を見直す(s2);
      const 当主 = s2.generals.find((x) => x.faction === s2.player && x.lord);
      確('城主のいない城に住めば、上司は当主', f2.上司 === 当主.id, `${他.name}・上司 ${当主.name}`);
    }
    確('物頭の禄高は知行そのもの（帳に載らぬあいだは余禄の取り分は無い）', H.主人公の禄高(s) === f.知行);
    確('物頭は武将の帳に載らない', !s.generals.some((x) => x.id === 'fuun-hero'));
  }

  console.log('\n── 二　預かる隊の勲功');
  {
    const 隊 = (id, side, 鍵ら, 損 = 0) => ({ id, side, gen: { name: id, lord: false }, squads: 鍵ら.map((k) => ({ src: k, men: 10 })), loss: { 直属: 損, 地域: 0 } });
    const 我 = 隊('g1', 'P', ['r1', 'r2b', 'r3'], 12), 敵1 = 隊('e1', 'E', ['x1']), 敵2 = 隊('e2', 'E', ['x2']);
    敵2.gen.lord = true;
    const b = { corps: [我, 敵1, 敵2], result: 'P', 武功: { r1: 2, r2: 1, x9: 4 }, 隊を潰した: { e1: 'g1', e2: 'g1' }, 門を破った: [] };
    const r = H.預かる隊の勲功(b, 'g1', {});
    const W = H.武将の勲功;
    確('組を三つ破り（一つにつき一）、隊を一つ潰し（五）、総大将の隊を潰し（十）、槍を合わせて勝つ（四）', r.勲功 === 3 * W.組 + W.隊を潰す + W.総大将の隊を潰す + W.槍を合わせた勝ち, `勲功${r.勲功}・${r.文}`);
    const b2 = { corps: [隊('g1', 'P', ['r1']), 敵1], result: 'P', 武功: {} };
    確('損も手柄も無い勝ち戦は二', H.預かる隊の勲功(b2, 'g1', {}).勲功 === W.勝ち);
    const b3 = { corps: [隊('g1', 'P', ['r1'], 3), 敵1], result: 'E', 武功: {} };
    確('負け戦で手柄が無ければ〇', H.預かる隊の勲功(b3, 'g1', {}).勲功 === 0 && /手柄を立てられなかった/.test(H.預かる隊の勲功(b3, 'g1', {}).文));
    const b4 = { corps: [隊('g1', 'P', ['r1'], 5), 敵1], result: 'P', 武功: {}, captured: true, 門を破った: [{ 門: '大手門', 隊: 'g1' }] };
    確('城攻めで城が落ち、預かる隊が門を破っていれば 勝ち（四）＋落城（三）＋門（五）', H.預かる隊の勲功(b4, 'g1', { 城攻め: '攻め' }).勲功 === W.槍を合わせた勝ち + W.落城 + W.門を破る,
      H.預かる隊の勲功(b4, 'g1', { 城攻め: '攻め' }).文);
    const b5 = { corps: [隊('g1', 'P', ['r1'], 5), 敵1], result: 'P', 武功: {} };
    確('籠城で守り切れば 勝ち（四）＋守り切る（三）', H.預かる隊の勲功(b5, 'g1', { 城攻め: '守り' }).勲功 === W.槍を合わせた勝ち + W.守り切る);
    確('預かる隊が盤にいなければ〇', H.預かる隊の勲功(b5, 'なし', {}).勲功 === 0);
  }

  console.log('\n── 三　盤の記録：最後に損害を与えた隊が、敵の隊を潰した手柄を持つ');
  {
    H.setBattleMap(null); H.setFieldSeed('fuun', 'busho'); H.layoutField(2000, 4);
    const W = H.FIELD.w, Hh = H.FIELD.h;
    const 将 = (i, lord) => ({ id: `g${i}`, name: `将${i}`, lead: 65, valor: 65, wit: 58, gov: 55, retinue: 300, retTrain: 70, unity: 62, lord: !!lord });
    const P = H.makeCorps('P', 将(0, true), 0, 300, 75, 75, W * 0.5, Hh * 0.7, -Math.PI / 2, '#2F5D8C');
    const E = H.makeCorps('E', 将(10, false), 0, 60, 75, 75, W * 0.5, Hh * 0.3, Math.PI / 2, '#B0483C');
    const E2 = H.makeCorps('E', 将(11, true), 0, 300, 75, 75, W * 0.3, Hh * 0.2, Math.PI / 2, '#B0483C');
    for (const c of [P, E, E2]) { c.formation = '横陣'; H.placeSquads(c, true); }
    const b = H.createBattle([P], [E, E2], 'P'); b.mode = 'field'; b.phase = 'fight'; b.dusk = 1100;
    for (const q of E.squads) H.applyDamage(b, E, q, q.men + 1, 1, 60, P, P.squads[0], true);
    確('損害を与えた隊が控えられる', E.最後の手 === P.id);
    for (let i = 0; i < 40 && !E.destroyed; i++) H.stepBattle(b, 0.05);     // 崩れてから、次の刻で壊滅と見る
    確('隊が壊滅すれば、潰した隊として盤に残る', E.destroyed && b.隊を潰した && b.隊を潰した[E.id] === P.id, JSON.stringify(b.隊を潰した || {}));
    確('預かる隊の勲功に「敵の隊を潰し」が入る', /敵の隊を1つ潰し/.test(H.預かる隊の勲功(b, P.id, {}).文), H.預かる隊の勲功(b, P.id, {}).文);
  }

  console.log('\n── 四　論功行賞');
  {
    const s = 物頭の風雲(), f = s.風雲;
    const k = H.家の尺(s, s.player);
    s.month = 4; f.覚え = 50;
    f.勲功 += 10; const 前 = f.知行;
    H.論功行賞を見る(s);
    確(`勲功を得たのちの月送りで、勲功十 × 百五十石 × 家の尺 × 覚えの倍（覚え五十で一倍）を加増`, f.知行 === 前 + Math.round(10 * H.加増の石 * k * 1), `${前}→${f.知行}石`);
    確('賞した勲功が改まる（まだ賞されていない勲功は〇）', f.賞した勲功 === f.勲功);
    確('記に、論功行賞と加増の石を記す', (f.記 || []).some((x) => /論功行賞：勲功10（覚え50）により、知行\d+石を加増された/.test(x.文)));
    const 前2 = f.知行; H.論功行賞を見る(s);
    確('勲功を得ていなければ、次の月送りでは加増しない', f.知行 === 前2);
    /* 覚えの倍 */
    確('覚えの倍は 覚え〇で〇.七・五十で一・百で一.三', Math.abs(H.覚えの倍(0) - 0.7) < 1e-9 && Math.abs(H.覚えの倍(50) - 1) < 1e-9 && Math.abs(H.覚えの倍(100) - 1.3) < 1e-9);
    /* 正月・七月には、前の月に勲功を得ていなくても賞する */
    const s2 = 物頭の風雲(), f2 = s2.風雲; f2.勲功 += 4; f2.前の勲功 = f2.勲功; s2.month = 7;
    const 前3 = f2.知行; H.論功行賞を見る(s2);
    確('七月の論功行賞では、それまでに賞されていない勲功を賞する', f2.知行 > 前3 && f2.賞した勲功 === f2.勲功);
    /* 家の余地が足りなければ、残りは金 */
    const s3 = 物頭の風雲(), f3 = s3.風雲; f3.勲功 += 20; s3.month = 4;
    const 余 = H.fiefRoom(s3, s3.player).left; f3.知行 = 余 - 100;            // 余地は百石しか残っていない
    const 金前 = f3.金, 前4 = f3.知行; H.論功行賞を見る(s3);
    const 一つ = H.加増の石 * H.家の尺(s3, s3.player) * H.覚えの倍(f3.覚え);
    確('家の配れる知行の余地が足りなければ、余地のぶんだけ加増し、残りは金（勲功一につき一貫）', f3.知行 === 前4 + 100 && f3.金 === 金前 + Math.round((Math.round(20 * 一つ) - 100) / 一つ),
      `知行 +${f3.知行 - 前4}石・金 +${f3.金 - 金前}貫`);
  }

  console.log('\n── 五　禄高で身分が上がる');
  {
    const s = 物頭の風雲(), f = s.風雲;
    const 境 = H.身分の境(s, H.主人公の仮の武将(s));
    f.知行 = 境.侍大将 - 1; H.禄高の身分を見る(s);
    確('侍大将の境に一石足りなければ物頭のまま', f.身分 === '物頭', `境 ${境.侍大将}石`);
    f.知行 = 境.侍大将; H.禄高の身分を見る(s);
    確('侍大将の境に届けば侍大将', f.身分 === '侍大将' && (f.知らせ || []).some((x) => /侍大将となった/.test(x)) && (f.記 || []).some((x) => /禄高が\d+石に届き、侍大将となった/.test(x.文)));
    確('就いたときの境を控える', f.身分控 && f.身分控.侍大将 === 境.侍大将, JSON.stringify(f.身分控));
    f.知行 = 境.家老; H.禄高の身分を見る(s);
    確('家老の境に届けば家老', f.身分 === '家老');
    f.知行 = 境.宿老 + 10; H.禄高の身分を見る(s);
    /* 主人公は十三で仕え始める。二十に満たぬ者は家老まで（core/rank.js 身分に就ける齢。キャンペーンの決まり） */
    確('二十に満たなければ、宿老の境に届いても家老のまま', f.身分 === '家老' && H.主人公の齢(s) < 20, `${H.主人公の齢(s)}歳`);
    f.始め = { ...f.始め, 年: f.始め.年 - 7 }; H.禄高の身分を見る(s);
    確('宿老の境に届けば宿老（二十から）。次の身分は無い', f.身分 === '宿老' && H.主人公の次の身分(s) === null, `${H.主人公の齢(s)}歳`);
    f.知行 = 100; H.禄高の身分を見る(s);
    確('身分は下がらない', f.身分 === '宿老');
    /* 次の身分（屋敷に出す） */
    const s2 = 物頭の風雲(); const 次 = H.主人公の次の身分(s2);
    確('物頭の次の身分は侍大将（要る禄高と足りぬ石）', 次 && 次.key === '侍大将' && 次.足りぬ === 次.要る - s2.風雲.知行, JSON.stringify(次));
    /* 勲功で取り立てるのは物頭まで */
    const s3 = 物頭の風雲(); s3.風雲.勲功 = 99999; H.取り立てを見る(s3);
    確('物頭から上は、勲功が多くても取り立てでは上がらない（禄高で上がる）', s3.風雲.身分 === '物頭');
    確('風雲の段：物頭までは勲功、侍大将・家老・宿老は禄高', H.風雲の段.filter((x) => x.要 != null).map((x) => x.名).join('・') === '足軽・五人長・十人長・五十人長・百人長・三百人長・物頭'
      && H.風雲の段.filter((x) => x.禄).map((x) => x.名).join('・') === '侍大将・家老・宿老');
  }

  console.log('\n── 六　物頭の合戦・山賊退治・威力偵察で、預かる隊の勲功が積まれる');
  {
    const s = 物頭の風雲(), f = s.風雲;
    const 上 = f.上司, 勲前 = f.勲功;
    const 隊 = { id: 上, side: 'P', gen: { name: '上司' }, squads: [{ src: 'k1', men: 40 }], loss: { 直属: 6, 地域: 0 } };
    const b = { result: 'P', 一人働き: undefined, corps: [隊], 武功: { k1: 3 } };
    H.戦の勲功を記す(s, b, '試しの野', { 隊id: 上 });
    確('物頭の合戦：預かる隊の戦果（組三つ・槍を合わせた勝ち）で勲功七', f.勲功 === 勲前 + 3 + H.武将の勲功.槍を合わせた勝ち, `勲功 ${勲前}→${f.勲功}`);
    確('記に「物頭として出た」と預かる隊の戦果を記す', (f.記 || []).some((x) => /試しの野の勝ち戦に物頭として出た。預かる隊で敵の組を3つ破り、槍を合わせて勝ち、勲功7。/.test(x.文)),
      ((f.記 || []).slice(-3).map((x) => x.文).join('／')));
    /* 山賊退治 */
    const s2 = 物頭の風雲(), f2 = s2.風雲, 勲2 = f2.勲功;
    const 組 = { id: H.主命の組, side: 'P', gen: { name: '組' }, squads: [{ src: 'm1', men: 40 }], loss: { 直属: 2, 地域: 0 } };
    H.山賊退治の果て(s2, { result: 'P', 一人働き: {}, corps: [組], 武功: { m1: 1 } }, { 重さ: '並' });
    確('物頭の山賊退治：預かる隊の勲功（組一つ・槍を合わせた勝ち）と務めの褒美', f2.勲功 === 勲2 + 1 + H.武将の勲功.槍を合わせた勝ち + H.主命の重さ.並.勲功, `勲功 ${勲2}→${f2.勲功}`);
    /* 威力偵察 */
    const s3 = 物頭の風雲(), f3 = s3.風雲, 勲3 = f3.勲功;
    const 偵 = { id: H.偵察の組, side: 'P', gen: { name: '組' }, squads: [{ src: 't1', men: 90 }], loss: { 直属: 10, 地域: 0 } };
    H.偵察の果て(s3, { result: 'P', 一人働き: {}, 偵察: { 城: 'x', 家: 'y', 我の数: 100, 敵の数: 80 }, corps: [偵, { id: H.偵察の敵, side: 'E', squads: [{ men: 50 }] }], 武功: { t1: 2 } });
    確('物頭の威力偵察：預かる隊の勲功（組二つ・槍を合わせた勝ち）', f3.勲功 === 勲3 + 2 + H.武将の勲功.槍を合わせた勝ち, `勲功 ${勲3}→${f3.勲功}`);
    /* 次の月送りで論功行賞 */
    const 知前 = f.知行; s.month = 4; H.風雲の月の初め(s);
    確('合戦ののちの月送りで論功行賞があり、知行が増える', f.知行 > 知前, `${知前}→${f.知行}石`);
  }

  console.log('\n── 七　屋敷：禄高・次の身分・まだ賞されていない勲功');
  {
    const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
    const s = 物頭の風雲(); s.風雲.勲功 += 6; s.風雲.知らせ = [];
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(H.FuunYashiki, { g: s, land: true, onTitle: () => {}, on月送り: () => {}, on知らせを閉じる: () => {}, on風雲を改める: () => {} })); });
    await flush();
    const 文 = document.body.textContent;
    確('禄高と、次の身分（侍大将）までの石を出す', new RegExp(`禄高 ${s.風雲.知行} 石（侍大将まで \\d+石。あと\\d+石）`).test(文), (文.match(/禄高[^）]*）/) || [''])[0]);
    確('まだ賞されていない勲功を出す', /まだ賞されていない勲功 6/.test(文));
    確('知行を出す', new RegExp(`知行${s.風雲.知行} 石`).test(文));
    await act(async () => { root.unmount(); }); await flush();
  }

  const 拾う = errs.filter((e) => !/act\(|not wrapped|ReactDOMTestUtils/.test(e));
  if (拾う.length) console.log('\n咎めの書き出し:', 拾う.slice(0, 3));
  console.log(咎.length ? `\n★ ${咎.length}件の咎：${咎.join('／')}` : '\n確かめ：みな通った');
  console.log(`エラー: ${拾う.length ? 拾う.length + '件' : 'なし'}`);
  process.exit(咎.length || 拾う.length ? 1 : 0);
})().catch((e) => { console.log('★ 試しが途中で止まった', e && e.stack); process.exit(1); });
