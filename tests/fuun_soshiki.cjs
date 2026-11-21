/* ============================================================
   風雲モード：十三歳の仕官・身分の並び（五人長から）・大名家の組織の木
   （hitori/fuun.js 仕官の物語・風雲の段、hitori/tezei.js 手勢の数、hitori/kakuu.js 架空の上役、hitori/soshiki.js 組織の木、
     hitori/Soshiki.jsx、hitori/FuunYashiki.jsx、core/state.js 風雲の段の名を繕う）

   遊ぶ人の申し出：「やっぱり13歳スタートにしましょう。少年が大志を抱いて貧しい農村から亡き父(足軽)の形見である槍を一本
   携えて大名の5人長に仕官するというストーリーでいいかなと思っています」「その大名家の組織ツリーを作りたいです。風雲のみで
   いいので。大名が一番上で、身分ごとに名前があり、プレイヤーがどの位置にいるかがわかるものです。上司の名前も武将でないものも
   架空で載せたいです」「組の最小単位は5人のほうがいいと感じています。…1→5→10→50→100→300→物頭(500人まで)→侍大将→家老→
   宿老→大名。騎馬は50人長から」。問いへの答え：仕官は「足軽で五人長の下に付く」、物頭は「今のまま上司の隊を預かる」、
   組織の木は「旗頭、国主、城主までは全員並べてそれ以下は自分の筋に当たる武将や上司を記載していく」。
     一、十三で始まり、始めの記と屋敷の札に仕官の物語が出る
     二、身分の並び：足軽→五人長→十人長→五十人長→百人長→三百人長→物頭（三十人長は無い）。目安は段の並びのまま
     三、古い記録の身分（十人長・三十人長）は段の並びのまま読み替える（記録の見出しも）
     四、組織の木：大名の下に旗頭・国主・城主をみな並べ、自分の城の城主の下に自分の筋（上司の武将・架空の上役・自分・同じ組）
     五、屋敷の画面：仕官の札（一度だけ）と「家中の組織」
   値はみな仮。
   ============================================================ */
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
global.IS_REACT_ACT_ENVIRONMENT = true; dom.window.IS_REACT_ACT_ENVIRONMENT = true;
const ctxStub = new Proxy({}, { get: (t, p) => { if (p === 'measureText') return () => ({ width: 30 }); return () => ({ addColorStop: () => {} }); } });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 200));
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, React, initState } = H;
const 咎 = [];
const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎.push(名); };
let 種 = 0x13A5;
Math.random = () => { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 始める = (家 = 'oda', 名 = '与平') => { const s = initState(家); H.風雲を始める(s, 名); return s; };
const 筋の文 = (木) => H.自分の筋(木).map((n) => `${n.身分}${n.名}`).join(' → ');
const 節を探す = (n, 合う) => { if (合う(n)) return n; for (const k of n.子) { const x = 節を探す(k, 合う); if (x) return x; } return null; };
const 節を数える = (n, 合う) => (合う(n) ? 1 : 0) + n.子.reduce((a, k) => a + 節を数える(k, 合う), 0);
const 家老の風雲 = () => {
  const s = 始める(); const f = s.風雲;
  f.身分 = '三百人長'; f.勲功 = 270; H.取り立てを見る(s); H.名乗りを定める(s, '木下', '藤吉郎');
  f.始め = { ...f.始め, 年: f.始め.年 - 2 };                                 // 十五に満たぬ者は侍大将まで（core/rank.js）
  const 境 = H.身分の境(s, H.主人公の仮の武将(s));
  f.知行 = 境.侍大将; H.禄高の身分を見る(s); f.知行 = 境.家老; H.禄高の身分を見る(s);
  f.知らせ = [];
  return s;
};

(async () => {
  console.log('── 一　十三で始まり、仕官の物語が出る');
  {
    const s = 始める(), f = s.風雲, 役 = H.架空の上役(s);
    確('十三で始まり、始めの齢を記録に控える', H.主人公の齢(s) === 13 && f.始めの齢 === 13 && H.主人公の始めの齢 === 13);
    確('足軽として始まる（五人長の組に入る）', f.身分 === '足軽' && f.勲功 === 0);
    const 文 = (f.記[0] || {}).文 || '';
    確('始めの記は仕官の物語（貧しい農村・十三の少年・足軽であった亡き父・形見の槍一本・大志）',
      /尾張の貧しい農村に、与平という十三の少年がいた。/.test(文) && /足軽であった父は、もうこの世にいない。/.test(文) && /父の形見の槍一本を携え、大志を抱いて村を出た。/.test(文), 文);
    確('織田家に仕官し、五人長（架空の上役）が率いる組の足軽となる。上司の武将の手に属する',
      文.includes(`織田家に仕官し、五人長の${役.五人長}が率いる組の足軽となる。`) && /那古野城に住み、織田信長の手に属する。/.test(文));
    確('仕官の物語は三つの文（屋敷の札に出す）', H.仕官の物語(s).length === 3 && H.仕官の物語(s).join('') === 文);
    確('屋敷の札はまだ見ていない（序を見た が偽）', f.序を見た === false);
    const 今川 = 始める('imagawa');
    確('国の名は住む城の国（今川家なら遠江）', /^遠江の貧しい農村に/.test(今川.風雲.記[0].文), 今川.風雲.記[0].文.slice(0, 16));
  }

  console.log('\n── 二　身分の並び（足軽→五人長→十人長→五十人長→百人長→三百人長→物頭→侍大将→家老→宿老）');
  {
    const 段 = H.風雲の段;
    確('身分の名の並び', 段.map((x) => x.名).join('・') === '足軽・五人長・十人長・五十人長・百人長・三百人長・物頭・侍大将・家老・宿老');
    確('勲功の目安は段の並びのまま（二十・五十・九十・百四十・二百・二百七十）', 段.filter((x) => x.要 != null).map((x) => x.要).join(',') === '0,20,50,90,140,200,270');
    確('住まいも段の並びのまま（長屋→小さな家→庭のある家→屋敷→門のある屋敷→館）', 段.slice(0, 7).map((x) => x.住まい).join('・') === '長屋・小さな家・庭のある家・屋敷・門のある屋敷・門のある屋敷・館');
    確('手勢の数は 五・十・五十・百・三百（三十人長は無い）', JSON.stringify(H.手勢の数) === JSON.stringify({ 五人長: 5, 十人長: 10, 五十人長: 50, 百人長: 100, 三百人長: 300 }));
    const s = 始める(), f = s.風雲;
    f.勲功 = 19; H.取り立てを見る(s);
    確('勲功十九では足軽のまま', f.身分 === '足軽');
    f.勲功 = 20; H.取り立てを見る(s);
    確('勲功二十で五人長に取り立てられ、手勢（足軽五人）の名簿ができる', f.身分 === '五人長' && f.手勢 && f.手勢.名簿.length === 5 && H.風雲の一人(s).手勢 === 5);
    f.勲功 = 50; H.取り立てを見る(s);
    確('勲功五十で十人長。手勢は五人隊二つ（前の五人は一つの五人隊にまとめて引き継ぐ）', f.身分 === '十人長' && f.手勢.名簿.length === 2 && f.手勢.名簿[0].継ぎ && f.手勢.名簿.every((m) => m.定 === 5) && H.風雲の一人(s).手勢 === 10);
    f.勲功 = 90; H.取り立てを見る(s);
    確('勲功九十で五十人長（十人隊五つ）', f.身分 === '五十人長' && f.手勢.名簿.length === 5 && f.手勢.名簿.every((m) => m.定 === 10));
    確('合戦の盤では、五人長から三百人長は足軽と同じく自分を動かし、手勢を率いる（物頭から預かる隊）', H.盤の身分('五人長') === '足軽' && H.盤の身分('三百人長') === '足軽' && H.盤の身分('物頭') === '物頭');
  }

  console.log('\n── 三　古い記録の身分は段の並びのまま読み替える');
  {
    const 古 = (身分, 版) => ({ state: { player: 'oda', year: 1550, month: 1, castles: [], factions: {}, 風雲: { 身分, ...(版 ? { 段の版: 版 } : {}) } } });
    確('記録の見出し：古い記録の十人長は五人長、三十人長は十人長と出す', H.記録の見出し(古('十人長'), {}).風雲 === '五人長' && H.記録の見出し(古('三十人長'), {}).風雲 === '十人長');
    確('記録の見出し：今の記録（段の版あり）はそのまま。ほかの身分も替えない', H.記録の見出し(古('十人長', H.風雲の段の版), {}).風雲 === '十人長' && H.記録の見出し(古('五十人長'), {}).風雲 === '五十人長' && H.記録の見出し(古('物頭'), {}).風雲 === '物頭');
    const s = 始める(); s.風雲.身分 = '三十人長'; delete s.風雲.段の版; H.migrateSave(s);
    確('読み込みの繕いで、三十人長は十人長になり、段の版が置かれる', s.風雲.身分 === '十人長' && s.風雲.段の版 === H.風雲の段の版);
  }

  console.log('\n── 四　組織の木（大名の下に旗頭・国主・城主をみな並べ、自分の城の城主の下に自分の筋）');
  {
    const s = 始める(), f = s.風雲, 木 = H.組織の木(s), 役 = H.架空の上役(s);
    const 当主 = s.generals.find((x) => x.faction === 'oda' && x.lord && !x.captive);
    確('いちばん上は大名（当主）', 木.身分 === '大名' && 木.名 === 当主.name && 木.筋, `${木.身分}${木.名}（${木.添}）`);
    const 城ら = s.castles.filter((c) => c.faction === 'oda');
    const 漏れ = 城ら.filter((c) => { const 主 = H.castellanOf(s, c); if (!主) return false;
      return 主.lord ? !木.城.includes(c.name) : !節を探す(木, (n) => n.名 === 主.name && n.身分.includes('城主') && (n.添 || '').includes(c.name)); });
    確('家の城の城主はみな木に出る（当主の城は大名に添える）', 漏れ.length === 0, 城ら.map((c) => `${c.name}:${(H.castellanOf(s, c) || {}).name}`).join('・'));
    const 筋 = H.自分の筋(木);
    確('自分の筋：大名 → 上司の武将（織田信長） → 三百人長 → 百人長 → 五十人長 → 十人長 → 五人長 → 自分（足軽）',
      筋.map((n) => n.身分).join('・') === '大名・物頭・三百人長・百人長・五十人長・十人長・五人長・足軽' && 筋[1].名 === '織田信長' && 筋[1].上司 && 筋[1].武将
      && 筋.slice(2, 7).every((n, i) => !n.武将 && n.名 === 役[['三百人長', '百人長', '五十人長', '十人長', '五人長'][i]]) && 筋[7].自分 && 筋[7].名 === f.名, 筋の文(木));
    確('上司の武将が物頭なら、架空の物頭は出さない', !筋.some((n) => n.身分 === '物頭' && !n.武将));
    const 五人長 = 筋[6];
    確('同じ組（五人長の組）に、自分と四人の足軽', 五人長.子.length === 5 && 五人長.子[0].自分 && 五人長.子.slice(1).every((n) => n.身分 === '足軽' && !n.自分) && 五人長.子.slice(1).map((n) => n.名).join('・') === 役.同輩.join('・'),
      五人長.子.map((n) => n.名).join('・'));
    確('架空の者の名は、何度組んでも同じ', JSON.stringify(H.架空の上役(s)) === JSON.stringify(役) && 筋の文(H.組織の木(s)) === 筋の文(木));
    const 武将の名 = new Set(s.generals.map((x) => x.name)), 名ら = [役.物頭, 役.三百人長, 役.百人長, 役.五十人長, 役.十人長, 役.五人長, ...役.同輩];
    確('架空の者の名は、武将の帳の名とも、互いとも重ならない', 名ら.every((n) => !武将の名.has(n)) && new Set(名ら).size === 名ら.length && !名ら.includes(f.名), 名ら.join('・'));
    const 今 = 始める('imagawa'), 今木 = H.組織の木(今), 今筋 = H.自分の筋(今木);
    確('上司の武将が侍大将なら、架空の物頭（姓と名）が上司の下に入る', 今筋.some((n) => n.身分 === '物頭' && !n.武将 && n.名 === H.架空の上役(今).物頭 && n.名.length >= 4)
      && 今筋[今筋.findIndex((n) => n.上司) + 1].身分 === '物頭', 筋の文(今木));
    確('自分の住む城の城主の下に筋が付く（今川家：遠江の国主・掛川城主 朝比奈泰能の下）', 今筋[1].名 === '朝比奈泰能' && /国主/.test(今筋[1].身分) && /掛川城/.test(今筋[1].添), `${今筋[1].身分}${今筋[1].名}（${今筋[1].添}）`);
    /* 取り立てれば、自分の身分より下の上役は筋から外れ、自分の下に手勢が出る */
    f.勲功 = 50; H.取り立てを見る(s);
    const 木2 = H.組織の木(s), 筋2 = H.自分の筋(木2), 我2 = 筋2[筋2.length - 1];
    確('十人長になれば、筋は 五十人長 → 自分（十人長）。十人長・五人長の上役は出ない', 筋2.map((n) => n.身分).join('・') === '大名・物頭・三百人長・百人長・五十人長・十人長' && 我2.自分 && !節を探す(木2, (n) => n.身分 === '五人長' && !n.武将), 筋の文(木2));
    確('自分の下に手勢（五人隊二つ）', 我2.子.length === 2 && 我2.子.every((n) => n.身分 === '五人隊'), 我2.子.map((n) => `${n.名}（${n.添}）`).join('・'));
    /* 物頭：上司は城主。架空の上役は無い */
    f.身分 = '三百人長'; f.勲功 = 270; H.取り立てを見る(s);
    const 筋3 = H.自分の筋(H.組織の木(s));
    確('物頭は城主の下に出る（架空の上役は無い）', 筋3[筋3.length - 1].自分 && 筋3[筋3.length - 1].身分 === '物頭' && 筋3.every((n) => n.武将 || n.自分), 筋の文(H.組織の木(s)));
    /* 家老：城主の一人として木に入る */
    const s4 = 家老の風雲(), 木4 = H.組織の木(s4), 我4 = 節を探す(木4, (n) => n.自分);
    確('家老は城主の一人として木に入る（あなたの印・筋）', s4.風雲.身分 === '家老' && 我4 && 我4.武将 && /城主/.test(我4.身分) && 我4.筋 && 節を数える(木4, (n) => n.自分) === 1, `${我4 && 我4.身分}${我4 && 我4.名}（${我4 && 我4.添}）`);
    /* 寄親の筋：国主の寄騎の城主は国主の下、旗頭の寄騎の国主は旗頭の下 */
    const s5 = 始める('imagawa'), 国主 = s5.generals.find((x) => x.faction === 'imagawa' && x.役 === '国主' && x.役国 === '遠江');
    const 城主 = s5.castles.filter((c) => c.faction === 'imagawa' && c.kuni === '遠江').map((c) => H.castellanOf(s5, c)).find((g) => g && !g.lord && g !== 国主);
    城主.寄親 = 国主.id;
    const 旗 = s5.generals.find((x) => x.faction === 'imagawa' && x.役 === '国主' && x.役国 === '三河');
    旗.役 = '旗頭'; 国主.寄親 = 旗.id;                 // 木の組み方を見るために、三河の国主を旗頭にして、遠江の国主をその寄騎にする
    const 木5 = H.組織の木(s5), 旗の節 = 木5.子.find((n) => n.名 === 旗.name), 国の節 = 旗の節 && 旗の節.子.find((n) => n.名 === 国主.name);
    確('旗頭は大名のすぐ下、寄騎の国主は旗頭の下、国主の寄騎の城主は国主の下', !!旗の節 && /旗頭/.test(旗の節.身分) && !!国の節 && !!国の節.子.find((n) => n.名 === 城主.name)
      && !木5.子.some((n) => n.名 === 国主.name || n.名 === 城主.name), `${旗.name} → ${国主.name} → ${城主.name}`);
    確('子は旗頭・国主・城主の順に並ぶ', (() => { const 順 = { 旗頭: 0, 国主: 1, 城主: 2 }; const v = 木5.子.map((n) => Math.min(...(n.役.length ? n.役.map((r) => 順[r]) : [3]))); return v.every((x, i) => i === 0 || v[i - 1] <= x); })());
  }

  console.log('\n── 五　屋敷の画面：仕官の札と「家中の組織」');
  {
    const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
    const s = 始める();
    let 今 = s;
    function 包む() {
      const [g, setG] = React.useState(s);
      今 = g;
      return React.createElement(H.FuunYashiki, { g, land: true, onTitle: () => {}, on月送り: () => {}, on知らせを閉じる: () => {},
        on風雲を改める: (改) => setG((p) => { const n = structuredClone(p); 改(n.風雲, n); return n; }) });
    }
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(包む)); }); await flush(); await flush();
    const 文 = () => document.body.textContent;
    const 釦 = (t) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === t);
    確('始めの月に仕官の札が出る（物語の三つの文と「仕官する」）', H.仕官の物語(s).every((t) => 文().includes(t)) && !!釦('仕官する'));
    await act(async () => { 釦('仕官する').click(); }); await flush();
    確('「仕官する」で札が閉じ、記録に見たことが残る（二度は出ない）', !釦('仕官する') && 今.風雲.序を見た === true);
    確('屋敷に「家中の組織」の釦がある', !!釦('家中の組織'));
    await act(async () => { 釦('家中の組織').click(); }); await flush();
    const 役 = H.架空の上役(今);
    確('家中の組織を開けば、家の名・大名・上司・架空の上役・自分（あなた）・同じ組の者が出る', /家中の組織/.test(文()) && 文().includes('織田家') && 文().includes('織田信秀') && 文().includes('織田信長')
      && 文().includes(役.五人長) && 文().includes(役.三百人長) && 役.同輩.every((n) => 文().includes(n)) && /あなた/.test(文()) && /上司/.test(文()));
    await act(async () => { 釦('閉じる').click(); }); await flush();
    確('「閉じる」で閉じる', !/家中の組織を|武将の帳に載らない家中の者/.test(文()) && !!釦('家中の組織'));
    await act(async () => { root.unmount(); }); await flush();
    /* 古い記録（序を見た の無い記録）には札を出さない */
    const s2 = 始める(); delete s2.風雲.序を見た;
    const root2 = createRoot(document.getElementById('r'));
    await act(async () => { root2.render(React.createElement(H.FuunYashiki, { g: s2, land: true, onTitle: () => {}, on月送り: () => {}, on知らせを閉じる: () => {}, on風雲を改める: () => {} })); }); await flush();
    確('札を見たかの控えの無い古い記録には、仕官の札を出さない', !釦('仕官する'));
    await act(async () => { root2.unmount(); }); await flush();
  }

  const 拾う = errs.filter((e) => !/act\(|not wrapped|ReactDOMTestUtils/.test(e));
  if (拾う.length) console.log('\n咎めの書き出し:', 拾う.slice(0, 3));
  console.log(咎.length ? `\n★ ${咎.length}件の咎：${咎.join('／')}` : '\n確かめ：みな通った');
  console.log(`エラー: ${拾う.length ? 拾う.length + '件' : 'なし'}`);
  process.exit(咎.length || 拾う.length ? 1 : 0);
})().catch((e) => { console.log('★ 試しが途中で止まった', e && e.stack); console.log('エラー: 例外'); process.exit(1); });
