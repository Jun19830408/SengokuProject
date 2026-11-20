/* ============================================================
   手勢の雇い入れと統率の伸び方（hitori/tezei_meibo.js・hitori/fuun.js 手勢の損と伸び・hitori/FuunYashiki.jsx 手勢の欄）の試験

   遊ぶ人の申し出：「部隊のメンバーですが、自分で雇えるようにしたいですね。10人長のときはメンバー10人を選べる。で、30人長と
   50人長になったら10人隊を選べる、100人以上だと50人隊を選べるようにしたいです。選べる人や部隊については、統率力が示されて
   おり、これによってプレイヤーの部隊の統率力も決まる」「戦の経験値によってプレイヤーの統率力もあがっていく」
   「部隊のポテンシャルと経験値によって統率力が成長する」。案への答え：縛りは「両方」（扶持の枠と候補の数）、統率は「数字」、
   与平の統率が低いと良い兵を活かしきれない作りで「はい」、作る順「①②③で（はい）」。
     一、名簿の形：十人長は足軽十人、三十人長・五十人長は十人隊三つ・五つ、百人長・三百人長は五十人隊二つ・六つ
     二、候補：月と身分と主人公の名から決まる（同じ月なら同じ候補、月が変われば入れ替わる）。数は身分ごと
     三、雇う・暇を出す：新参の枠に入る。扶持の枠を超えては雇えない。空きが無ければ先に暇を出す。雇った候補は消える
     四、手勢の統率：名簿の今の統率（素質×練れ）を人数で均す。盤へ渡す（風雲の一人）
     五、取り立て：十人長から三十人長で十人を一つの十人隊に、五十人長から百人長で十人隊五つを一つの五十人隊にまとめる
     六、合戦のあと：討たれた兵を新参で埋め、合戦に出た者の練れが上がり、与平の統率が伸びる（素質の高い隊ほど速い）
     七、屋敷の画面：手勢の欄に名簿と候補を出し、雇う・暇を出すができる。統率は数字
   を確かめる。値はみな仮。
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
let 種 = 0x3A61;
const 乱 = () => { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = 乱;
const 新しい風雲 = (身分) => { const s = initState('oda'); H.風雲を始める(s); s.風雲.身分 = 身分; return s; };

(async () => {
  console.log('── 一　名簿の形');
  {
    const 形 = (k) => H.名簿の形を見る(k);
    確('十人長は足軽を一人ずつ十人（候補十四・扶持の枠三十二）', 形('十人長').種 === '足軽' && 形('十人長').人 === 1 && 形('十人長').数 === 10 && 形('十人長').候補 === 14 && 形('十人長').枠 === 32);
    確('三十人長・五十人長は十人隊を三つ・五つ', 形('三十人長').種 === '十人隊' && 形('三十人長').人 === 10 && 形('三十人長').数 === 3 && 形('五十人長').数 === 5);
    確('百人長・三百人長は五十人隊を二つ・六つ', 形('百人長').種 === '五十人隊' && 形('百人長').人 === 50 && 形('百人長').数 === 2 && 形('三百人長').数 === 6);
    確('名簿の人数は、盤の手勢の数と同じ', ['十人長', '三十人長', '五十人長', '百人長', '三百人長'].every((k) => 形(k).人 * 形(k).数 === H.手勢の数[k]));
    確('足軽・物頭には名簿が無い', !形('足軽') && !形('物頭'));
  }

  console.log('\n── 二　候補（月ごとに入れ替わる）');
  {
    const a = H.候補を作る('十人長', 1550, 3, '与平'), b = H.候補を作る('十人長', 1550, 3, '与平'), c = H.候補を作る('十人長', 1550, 4, '与平');
    確('同じ月なら同じ候補', JSON.stringify(a) === JSON.stringify(b));
    確('月が変われば入れ替わる', JSON.stringify(a.map((x) => [x.名, x.素質])) !== JSON.stringify(c.map((x) => [x.名, x.素質])));
    確('十人長の候補は十四人', a.length === 14 && a.every((x) => x.人 === 1 && x.種 === '足軽'));
    確('素質は二十〜八十五、練れは五割五分〜九割五分、一人の扶持は一〜八', a.every((x) => x.素質 >= 20 && x.素質 <= 85 && x.練れ >= 0.55 && x.練れ <= 0.95 && x.扶持 >= 1 && x.扶持 <= 8),
      a.slice(0, 3).map((x) => `${x.名} 統率${H.今の統率(x)}（素質${x.素質}・練れ${Math.round(x.練れ * 100)}%）武勇${x.武勇} 扶持${x.扶持}`).join('／'));
    const 隊 = H.候補を作る('五十人長', 1550, 3, '与平');
    確('五十人長の候補は十人隊が七つ。扶持は十人ぶん', 隊.length === 7 && 隊.every((x) => x.人 === 10 && x.扶持 === H.一人の扶持(x.素質, x.練れ, x.武勇) * 10 && /の十人$/.test(x.名)), 隊[0].名);
  }

  console.log('\n── 三　雇う・暇を出す（扶持の枠と候補の数が縛り）');
  {
    const s = 新しい風雲('十人長'), f = s.風雲;
    H.手勢の名簿を整える(f, s.year, s.month);
    const 手 = f.手勢;
    確('はじめの名簿は新参十人（統率は素質三十×練れ五割五分）', 手.名簿.length === 10 && 手.名簿.every((m) => m.新参 && H.今の統率(m) === Math.round(30 * 0.55)), `手勢の統率 ${H.手勢の統率を量る(手.名簿)}`);
    確('今月の候補が十四人並ぶ', 手.候補.length === 14);
    const 候 = [...手.候補].sort((x, z) => z.扶持 - x.扶持);
    H.手勢を雇う(f, 候[0].id);
    確('雇えば新参の枠に入り、その候補は雇った印が付く', 手.名簿.some((m) => m.名 === 候[0].名 && !m.新参) && 手.名簿.filter((m) => m.新参).length === 9 && 手.雇った.includes(候[0].id));
    確('同じ候補は二度は雇えない', H.雇えるか(f, 候[0].id) === 'もう雇った候補');
    /* 扶持の高い者を雇い続ければ、枠を超える */
    let 断り = null;
    for (const c of 候.slice(1)) { const 訳 = H.雇えるか(f, c.id); if (訳) { 断り = 訳; break; } H.手勢を雇う(f, c.id); }
    確('扶持の枠（三十二）を超えては雇えない', /扶持の枠（32）を超える/.test(断り || '') && H.名簿の扶持(手.名簿) <= 32, `扶持の和 ${H.名簿の扶持(手.名簿)}・断り「${断り}」`);
    /* 安い者で枠を埋めきる */
    const 安い = H.候補を作る('十人長', 1600, 1, '試し').map((x, i) => ({ ...x, id: `安${i}`, 扶持: 1 }));
    手.候補 = 安い; 手.雇った = [];
    for (const c of 安い) if (!H.雇えるか(f, c.id)) H.手勢を雇う(f, c.id);
    確('空き（新参の枠）が無くなれば、先に暇を出さねば雇えない', !手.名簿.some((m) => m.新参) && /空き（新参の枠）が無い/.test(H.雇えるか(f, 安い[13].id) || ''));
    const 出す = 手.名簿[0];
    H.暇を出す(f, 出す.id);
    確('暇を出せば、その枠は新参に戻る', 手.名簿[0].新参 && !手.名簿.some((m) => m.id === 出す.id));
    確('暇を出せば、また雇える', H.雇えるか(f, 安い[13].id) === null);
  }

  console.log('\n── 四　手勢の統率は名簿の今の統率（素質×練れ）を人数で均す。盤へ渡す');
  {
    const s = 新しい風雲('十人長'), f = s.風雲;
    H.手勢の名簿を整える(f, s.year, s.month);
    f.手勢.名簿 = f.手勢.名簿.map((m, i) => ({ ...m, 新参: false, 素質: i < 5 ? 80 : 40, 練れ: 0.5, 武勇: i < 5 ? 70 : 30 }));
    確('名簿の今の統率を人数で均す', H.手勢の統率を量る(f.手勢.名簿) === 30, `${H.手勢の統率を量る(f.手勢.名簿)}（素質八十と四十が五人ずつ・練れ五割）`);
    const 一人 = H.風雲の一人(s);
    確('風雲の一人で、盤へ手勢の統率と武勇を渡す', 一人.手勢の統率 === 30 && 一人.手勢の武勇 === 50, `手勢の統率 ${一人.手勢の統率}・武勇 ${一人.手勢の武勇}`);
    const s2 = 新しい風雲('十人長');
    確('名簿がまだ無ければ渡さない（盤の側で五十とする）', H.風雲の一人(s2).手勢の統率 === undefined && H.手勢の統率の初め === 50);
  }

  console.log('\n── 五　取り立て：前の手勢をまとめて引き継ぐ');
  {
    const s = 新しい風雲('十人長'), f = s.風雲;
    H.手勢の名簿を整える(f, s.year, s.month);
    f.手勢.名簿 = f.手勢.名簿.map((m, i) => ({ ...m, 新参: false, 素質: 50 + i, 練れ: 0.8, 武勇: 40, 扶持: 3 }));
    f.身分 = '三十人長'; H.手勢の名簿を整える(f, s.year, s.month);
    const 名 = f.手勢.名簿;
    確('三十人長では、十人を一つの十人隊にまとめ、残り二つは新参の十人隊', 名.length === 3 && 名[0].継ぎ && 名[0].人 === 10 && 名[0].素質 === 55 && 名[0].扶持 === 30 && 名[1].新参 && 名[2].新参 && 名[1].人 === 10,
      `${名[0].名} 素質${名[0].素質}・練れ${名[0].練れ}・扶持${名[0].扶持}`);
    f.身分 = '五十人長'; H.手勢の名簿を整える(f, s.year, s.month);
    確('五十人長では、十人隊三つを引き継ぎ、二つの新参の十人隊を足す', f.手勢.名簿.length === 5 && f.手勢.名簿[0].継ぎ && f.手勢.名簿.filter((m) => m.新参).length === 4);
    f.身分 = '百人長'; H.手勢の名簿を整える(f, s.year, s.month);
    確('百人長では、十人隊五つを一つの五十人隊にまとめ、残り一つは新参の五十人隊', f.手勢.名簿.length === 2 && f.手勢.名簿[0].人 === 50 && f.手勢.名簿[0].継ぎ && f.手勢.名簿[1].新参 && f.手勢.名簿[1].人 === 50);
    /* 取り立てを見る が名簿を整える */
    const s3 = 新しい風雲('足軽'); s3.風雲.勲功 = 25; H.取り立てを見る(s3);
    確('勲功で十人長に取り立てられれば、名簿（新参十人）と候補ができる', s3.風雲.身分 === '十人長' && s3.風雲.手勢 && s3.風雲.手勢.名簿.length === 10 && s3.風雲.手勢.候補.length === 14);
  }

  console.log('\n── 六　合戦のあと：討たれた兵を新参で埋め、練れが上がり、与平の統率が伸びる');
  {
    const s = 新しい風雲('十人長'), f = s.風雲;
    H.手勢の名簿を整える(f, s.year, s.month);
    f.手勢.名簿 = f.手勢.名簿.map((m, i) => ({ ...m, id: `者${i}`, 新参: false, 名: `者${i}`, 素質: 60, 練れ: 0.6, 武勇: 20 + i * 6, 扶持: 3 }));
    const 統0 = f.統率;
    const b = { result: 'P', 一人働き: { 討ち取り: 2, 雑兵: 2, 侍: 0, 体力: 90, 討死: false, 首: [], 咎: 0, 手勢の討ち: 4, 手勢の討たれ: 3 },
      手勢: { squads: [{ men: 7 }] } };
    種 = 0x3A61;
    H.戦の勲功を記す(s, b, '試しの野');
    const 名 = f.手勢.名簿, 新 = 名.filter((m) => m.新参);
    確('討たれた三人ぶんが新参に替わる', 新.length === 3, 新.map((m) => m.id).join('・'));
    確('合戦に出た者の練れが上がる（六割から、槍を合わせたので一割八分ぶん近づいて六割七分）', 名.filter((m) => !m.新参).every((m) => Math.abs(m.練れ - 0.67) < 0.011), 名.filter((m) => !m.新参).map((m) => m.練れ).join('・'));
    確('新参に替わった者の練れは上がらない（五割五分のまま）', 新.every((m) => m.練れ === 0.55));
    確('与平の統率が伸びる（率いて一・槍を合わせて一・素質の高い隊（素質六十）で一）', f.統率 === 統0 + 3, `${統0}→${f.統率}`);
    確('記に、討たれた兵と統率の伸びを記す', (f.記 || []).some((x) => /手勢の兵3人が討たれ、新参で埋めた/.test(x.文)) && (f.記 || []).some((x) => /統率が3上がった/.test(x.文)));
    確('統率の伸びは、七十より上では半ば（切り上げ）、上限九十', H.統率の伸びを量る(70, true, 60) === 2 && H.統率の伸びを量る(89, true, 60) === 1 && H.統率の伸びを量る(90, true, 60) === 0 && H.統率の伸びを量る(30, false, 40) === 1);
    /* 隊の名簿：減りを割り振り、その隊の素質・練れが新参のぶん下がる */
    const s2 = 新しい風雲('三十人長'), f2 = s2.風雲; H.手勢の名簿を整える(f2, s2.year, s2.month);
    f2.手勢.名簿 = f2.手勢.名簿.map((m, i) => ({ ...m, 新参: false, 素質: 70, 練れ: 0.9, 武勇: 60 }));
    const 損 = H.戦の損を名簿に移す(f2, 24);
    確('隊の名簿では、討たれた六人を隊ごとに割り振り、素質と練れが新参のぶん下がる', 損.減 === 6 && f2.手勢.名簿.every((m) => m.素質 < 70 && m.練れ < 0.9),
      f2.手勢.名簿.map((m) => `素質${m.素質}・練れ${m.練れ}`).join('／'));
  }

  console.log('\n── 七　屋敷の画面の手勢の欄');
  {
    const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
    const s = 新しい風雲('十人長');
    let 今 = s;
    function 包む() {
      const [g, setG] = React.useState(s);
      今 = g;
      return React.createElement('div', { style: { display: 'flex' } }, React.createElement(H.FuunYashiki, { g, land: true, onTitle: () => {}, on月送り: () => {}, on知らせを閉じる: () => {},
        on風雲を改める: (改) => setG((p) => { const n = structuredClone(p); 改(n.風雲, n); return n; }) }));
    }
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(包む)); }); await flush(); await flush();
    const 文 = () => document.body.textContent;
    確('手勢の欄が出る（足軽十人の名簿と、今月の候補）', /手勢（足軽10人）/.test(文()) && /今月の候補（14人/.test(文()) && 今.風雲.手勢 && 今.風雲.手勢.名簿.length === 10);
    確('統率を数字で出す（手勢の統率・与平の統率・合戦での統率）', /手勢の統率 17/.test(文()) && /合戦での統率 18/.test(文()), (文().match(/手勢の統率[^。]{0,40}/) || [''])[0]);
    const 雇う = [...document.querySelectorAll('button')].filter((x) => x.textContent === '雇う' && !x.disabled);
    確('雇える候補には「雇う」の釦がある', 雇う.length > 0);
    await act(async () => { 雇う[0].click(); }); await flush();
    確('雇うを押せば名簿に入り、暇を出す釦が出る', 今.風雲.手勢.名簿.filter((m) => !m.新参).length === 1 && [...document.querySelectorAll('button')].some((x) => x.textContent === '暇を出す'));
    const 暇 = [...document.querySelectorAll('button')].find((x) => x.textContent === '暇を出す');
    await act(async () => { 暇.click(); }); await flush();
    確('暇を出すを押せば新参に戻る', 今.風雲.手勢.名簿.every((m) => m.新参));
    await act(async () => { root.unmount(); }); await flush();
    const s2 = 新しい風雲('足軽'); let 出 = false;
    const root2 = createRoot(document.getElementById('r'));
    await act(async () => { root2.render(React.createElement(H.FuunYashiki, { g: s2, land: true, onTitle: () => {}, on月送り: () => {}, on知らせを閉じる: () => {}, on風雲を改める: () => { 出 = true; } })); }); await flush();
    確('足軽のときは手勢の欄を出さない', !/手勢（/.test(文()) && !出);
    await act(async () => { root2.unmount(); }); await flush();
  }

  const 拾う = errs.filter((e) => !/act\(|not wrapped|ReactDOMTestUtils/.test(e));
  if (拾う.length) console.log('\n咎めの書き出し:', 拾う.slice(0, 3));
  console.log(咎.length ? `\n★ ${咎.length}件の咎：${咎.join('／')}` : '\n確かめ：みな通った');
  console.log(`エラー: ${拾う.length ? 拾う.length + '件' : 'なし'}`);
  process.exit(咎.length || 拾う.length ? 1 : 0);
})().catch((e) => { console.log('★ 試しが途中で止まった', e && e.stack); process.exit(1); });
