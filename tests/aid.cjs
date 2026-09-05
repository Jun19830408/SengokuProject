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
const { createRoot, act, App, React, initState, findPath, reinforceOffers, 運び賃を払う, 陣触れの届き, rankName, 国主に任じる } = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

/* ------------------------------------------- 盤をこしらえる
   自家の城が敵に囲まれ、他の自家の城と、臣従した家の城が近くにある形。 */
const s = initState('oda');
const 自城 = s.castles.filter((x) => x.faction === s.player);
const 囲まれる = 自城[0];
const 助ける = 自城[1] || 自城[0];

// 近くの他家を臣従させる
let 臣従家 = null, 臣従城 = null;
for (const d of s.castles) {
  if (d.faction === s.player) continue;
  const p = findPath(d.id, 囲まれる.id);
  if (p && p.length <= 3) { 臣従家 = d.faction; 臣従城 = d; break; }
}
if (臣従家) {
  const k = [s.player, 臣従家].sort().join('|');
  s.relations[k] = { trust: 80, state: '臣従', until: null };
  臣従城.local = 5000; 臣従城.food = 50000;
}
// 囲む敵をこしらえる（臣従させた家とは別の家）
let 敵城 = null;
for (const d of s.castles) {
  if (d.faction === s.player || d.faction === 臣従家) continue;
  const p = findPath(d.id, 囲まれる.id);
  if (p && p.length <= 3) { 敵城 = d; break; }
}
if (敵城) {
  const eg = s.generals.filter((x) => x.at === 敵城.id && x.faction === 敵城.faction && !x.captive).slice(0, 2);
  for (const t of eg) t.at = null;
  s.armies.push({
    id: 'besieger', faction: 敵城.faction, from: 敵城.id, gens: eg.map((x) => x.id),
    local: 4000, localTrain: 70, rost: null,
    men: 4000 + eg.reduce((t, x) => t + x.retinue, 0), at: 囲まれる.id,
    path: [囲まれる.id], prog: 0, food: 99999, target: 囲まれる.id, sieging: true,
  });
  s.sieges = [{ castleId: 囲まれる.id, armyId: 'besieger', months: 2, decided: null }];
}
助ける.local = 6000; 助ける.food = 90000;

const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s })]]);
dom.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
};
console.log(`仕込み: ${囲まれる.name}（自家）を${敵城 ? s.factions[敵城.faction].name : '敵'}が包囲。`
  + `救援元 ${助ける.name}、臣従 ${臣従家 ? s.factions[臣従家].name + '（' + 臣従城.name + '）' : 'なし'}`);

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

  // 囲まれた城を開く
  const 城名 = [...document.querySelectorAll('.mn')].find((e) => e.textContent.trim() === 囲まれる.name);
  if (城名) await click(城名.parentElement);
  if (!btn('軍事')) {
    const cv = document.querySelector('.mapwrap canvas');
    for (const [x, y] of [[450, 300], [450, 290], [460, 310], [440, 320]]) {
      await act(async () => { cv.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y })); });
      await act(async () => { cv.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y })); });
      await flush(); if (btn('軍事')) break;
    }
  }
  確('囲まれた城の帳面が開く', !!btn('軍事'));
  if (!btn('軍事')) { console.log('エラー: 城を選べない'); process.exit(1); }
  await rc('軍事');

  確('「援軍を呼ぶ」が出る', !!btn('援軍を呼ぶ'));
  if (!btn('援軍を呼ぶ')) { console.log('エラー: 援軍を呼べない'); process.exit(1); }
  await rc('援軍を呼ぶ'); await flush();

  const 文 = document.body.textContent;
  確('下知の通る城の欄がある', /下知の通る城/.test(文));
  確('頼むだけの家の欄がある', /頼むだけの家/.test(文));
  確('指図できぬ理由が書かれている', /旗の下にない家には/.test(文));

  // 肝心のところ。臣従の家は「下知の通る城」に、同盟・従属は「頼むだけ」に入る。
  // 包囲の札も同じ「card」なので、援軍の画面そのものを名指しで拾う
  const card = [...document.querySelectorAll('.modal .card')].find((e) => /下知の通る城/.test(e.textContent));
  const 全文 = card ? card.textContent.replace(/\s+/g, ' ') : '';
  const 下知部 = 全文.split('頼むだけの家')[0];
  const 頼み部 = 全文.split('頼むだけの家')[1] || '';
  if (臣従城) {
    確(`臣従の家の城（${臣従城.name}）に下知が通る`, 下知部.includes(臣従城.name), 
      下知部.includes(臣従城.name) ? '' : `頼む側にある: ${頼み部.includes(臣従城.name)}`);
    確('臣従の札が出る', /臣従/.test(下知部));
  }
  確('下知の欄に同盟・従属が混じらない', !/同盟/.test(下知部));
  console.log('    [調べ] 下知部: ' + 下知部.split('下知の通る城')[1]?.slice(0, 180));

  // 下知の通る城を一つ選び、将と兵を選べること
  const 箱 = [...card.querySelectorAll('input[type=checkbox]')];
  確('呼べる城がある', 箱.length > 0, `${箱.length}件`);
  if (箱.length) {
    await act(async () => { 箱[0].click(); }); await flush();
    const 将箱 = [...card.querySelectorAll('input[type=checkbox]')];
    確('城を選ぶと武将が並ぶ', 将箱.length > 箱.length, `${将箱.length}件`);
    const 滑 = card.querySelector('input[type=range]');
    確('兵の数を選べる', !!滑);
    if (滑) {
      // React は range の変化を input の合図で受ける。change では届かない。
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
        setter.call(滑, 滑.max);
        滑.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
      await flush();
      確('選んだ兵の数が画面に反映される', /連れて行く地域家臣団/.test(card.textContent)
        && !/0 \/ /.test(card.textContent.match(/連れて行く地域家臣団[^人]*人/)?.[0] || '0 / '),
        (card.textContent.match(/連れて行く地域家臣団[^人]*人/) || [''])[0].replace(/\s+/g, ' '));
    }
  }
  const 送 = [...card.querySelectorAll('button')].find((b) => /人を差し向ける|使者を送る/.test(b.textContent));
  確('援軍を差し向けられる', !!送 && !送.disabled, 送 ? 送.textContent.trim() : 'なし');
  if (送) await click(送);
  await flush(); await flush();

  await rc('戦国記'); await flush();
  const 記 = (document.querySelector('.card') || { textContent: '' }).textContent.replace(/\s+/g, ' ');
  確('援軍が発した旨が記される', /援軍/.test(記), 記.slice(0, 120));
  await rc('閉じる');

  console.log('確かめ:', 咎 ? `★${咎}件が通らなかった` : 'すべて通った');
  console.log('エラー:', errs.length ? errs.slice(0, 2).join(' | ') : 'なし');
  /* ------------------------------ 援軍は遠近を問わず呼べる。縛るのは兵糧

     はじめ、援軍の候補を近い順に十城で打ち切っていた。稲葉山から佐和山へ
     攻めるとき、十五城を持ちながら那古野の兵が呼べなかった。次に「半年で
     着く城まで／四十城まで」と改めたが、これもまだ数と距離の縛りである。

     関ヶ原も大坂の陣も島原の乱も、全国から兵が集まった。主君の求めがあれば
     九州の兵も奥羽の兵も出る。呼べる先を距離で切るのは、その姿に合わない。

     縛るのは兵糧である。軍は月に一人〇.〇九石を食い、行程のぶんに陣中の
     二月を足して持って出る。遠国から呼ぶほど蔵が空く。加えて、城は自らの
     蔵を空にしては出さない（留守の兵が半年食えるだけは残す）。
     盤に並べられる隊は三十二まで（関ヶ原の参陣数）であるから、呼びすぎても
     戦場に立てるのはそこまでである。 */
  {
    const t = initState('oda');
    for (const id of ['inabayama', 'sunomata', 'ogaki', 'kiyosu', 'iwakura', 'shobata',
      'narumi', 'nagashima', 'kuwana', 'kanbe', 'odani', 'yamamotoyama']) {
      const c = t.castles.find((x) => x.id === id);
      if (c) c.faction = 'oda';
    }
    const 我 = t.castles.filter((c) => c.faction === 'oda').length;
    const 出 = reinforceOffers(t, 'inabayama', 'sawayama');
    確('十を超える城を持てば、十を超えて並ぶ', 出.length > 10, `${我}城のうち ${出.length}城`);
    確('遠い自領の城も落ちない（那古野城）', 出.some((o) => o.name === '那古野城'),
      出.map((o) => o.name).slice(0, 6).join('・') + '…');
    確('攻める相手の城は、候補に混じらない', !出.some((o) => o.castleId === 'sawayama'));
    確('出陣元の城も、候補に混じらない', !出.some((o) => o.castleId === 'inabayama'));

    // 全国から呼べる。距離でも数でも切らない。
    const u = initState('oda');
    for (const c of u.castles) c.faction = 'oda';
    const 全 = reinforceOffers(u, 'nagoya', 'uchijo');      // 尾張から薩摩へ
    確('天下を持てば、全国の城が並ぶ', 全.length > 200,
      `${u.castles.length}城のうち ${全.length}城`);
    確('十か月かかる遠国の城も並ぶ', 全.some((o) => o.months >= 10),
      `いちばん遠くて ${Math.max(...全.map((o) => o.months))}か月`);

    // 兵糧は行程に応じて重くなる
    const 近 = 全.filter((o) => o.months <= 2), 遠 = 全.filter((o) => o.months >= 10);
    確('遠いほど、一人あたりの兵糧が重い',
      近.length && 遠.length && 遠[0].一人の兵糧 > 近[0].一人の兵糧 * 2,
      `${近[0].months}か月 ${近[0].一人の兵糧}石 ／ ${遠[0].months}か月 ${遠[0].一人の兵糧}石`);
    確('城は蔵を空にして出さない（留守のぶんを残す）',
      全.every((o) => o.蔵 <= (u.castles.find((c) => c.id === o.castleId) || {}).food),
      `留守の蓄えを差し引いた蔵で数えている`);
    確('蔵が尽きれば、その城は出せない',
      (() => {
        const v = initState('oda');
        for (const c of v.castles) c.faction = 'oda';
        for (const c of v.castles) c.food = 0;
        const w = reinforceOffers(v, 'nagoya', 'uchijo');
        return w.length > 0 && w.every((o) => o.men === 0 || o.reason);
      })(), '蔵を空にして測った');

    /* 運び賃（GDD 7.3）。
       蔵の米だけでは全国動員の縛りにならなかった（薩摩へ呼んで兵糧不足の城は皆無）。
       遠征の重みは、米そのものより人足と馬と船を雇う費えに出る。 */
    const 賃 = (a) => a.reduce((x, o) => x + o.賃, 0);
    const 出全 = 全.filter((o) => !o.reason && o.men > 0);
    確('遠い城ほど、一人あたりの運び賃が高い',
      近.length && 遠.length && 遠[0].一人の運び賃 > 近[0].一人の運び賃 * 2,
      `${近[0].months}か月 ${近[0].一人の運び賃}貫 ／ ${遠[0].months}か月 ${遠[0].一人の運び賃}貫`);

    // 近国だけなら僅か、全国から呼べば身代を超える
    const 近所 = reinforceOffers(initState('oda'), 'nagoya', 'kiyosu').filter((o) => !o.reason && o.men > 0);
    const 手元 = initState('oda').factions.oda.gold;
    確('隣国の助けは、運び賃を気にせず呼べる', 賃(近所) < 手元 * 0.1,
      `尾張の内で ${近所.length}城・${賃(近所)}貫（手元 ${Math.round(手元)}貫）`);
    確('全国から呼べば、運び賃が身代を超える', 賃(出全) > 手元 * 2,
      `${出全.length}城で ${賃(出全)}貫（手元 ${Math.round(手元)}貫）`);

    // 払えば実際に金蔵から減る
    確('運び賃は主家の金蔵から引かれる',
      (() => {
        const v = initState('oda');
        const 前 = v.factions.oda.gold;
        運び賃を払う(v, 10000, 10);
        return Math.round(前 - v.factions.oda.gold) === 2000;
      })(), '一万を十か月呼べば 2,000貫');
    確('手元より多くは引かれない（蔵が負にならない）',
      (() => {
        const v = initState('oda');
        v.factions.oda.gold = 100;
        運び賃を払う(v, 10000, 10);
        return v.factions.oda.gold === 0;
      })(), '手元100貫で 2,000貫の遠征を試みた');
  }

  /* ------------------------------------ 陣触れの届く先は、総大将の役で決まる

     加勢を全国から呼べるようにしたことで、こんどは誰が呼んでも天下じゅうの
     兵が集まるようになった。それでは身分も役も意味を持たない。

     城主が率いる軍には自らの城の兵しか集まらず、国主なら一国、旗頭と当主なら
     天下じゅうから集まる。柴田を北国へ、明智を丹波へ――方面軍の芽はここにある。

     届きを決めるのは身分（禄高で定まる格）ではなく役（大名が任じる職）である。
     禄が八千石あって家老の身分でも、国主に任じられていなければ自城までしか
     届かない。預かっていないものは動かせない、という道理である。

     大将を渡さぬときは縛らない（援軍の要請など、総大将を立てぬ場面があるため）。 */
  {
    const u = initState('oda');
    for (const c of u.castles) c.faction = 'oda';      // 天下を持つ盤
    const 我 = u.generals.filter((g) => g.faction === 'oda' && g.at && !g.captive);
    const 別 = {};
    for (const g of 我) { const r = rankName(g, u); (別[r] = 別[r] || []).push(g); }
    const 呼べる = (大将) => reinforceOffers(u, 'nagoya', 'uchijo', 大将)
      .filter((o) => !o.reason && o.men > 0);

    const 当主 = 我.find((x) => x.lord);
    /* 届きは役で決まるので、役を任じてから測る。
       国主となれるのは家老（禄高八千石）以上である。 */
    const 国主 = (別.家老 || []).concat(別.宿老 || [])
      .find((g) => !g.lord && (u.castles.find((c) => c.id === (g.本領 || g.at)) || {}).kuni === '尾張');
    if (国主) 国主に任じる(u, 'oda', '尾張', 国主.id);
    const 侍 = (別.侍大将 || []).find((g) => !g.役);
    const 物 = (別.物頭 || []).find((g) => !g.役);

    if (当主) {
      確('当主が率いれば、天下じゅうから集まる',
        陣触れの届き(当主, u) === '天下' && 呼べる(当主).length > 100,
        `${当主.name} → ${呼べる(当主).length}城・${呼べる(当主).reduce((a, o) => a + o.men, 0)}人`);
    }
    if (国主) {
      const 出 = 呼べる(国主);
      const 本陣 = u.castles.find((c) => c.id === 'nagoya');
      確('国主が率いれば、一国のうちに限られる',
        陣触れの届き(国主, u) === '一国'
        && 出.length > 0 && 出.every((o) => (u.castles.find((c) => c.id === o.castleId) || {}).kuni === 本陣.kuni),
        `${国主.name} → ${出.length}城（すべて${本陣.kuni}）`);
      if (当主) 確('国主の届きは、当主の届きより狭い', 出.length < 呼べる(当主).length,
        `国主 ${出.length}城／当主 ${呼べる(当主).length}城`);
    }
    if (侍) {
      確('役を持たぬ者が率いれば、自らの城の兵だけ',
        陣触れの届き(侍, u) === '自城' && 呼べる(侍).length === 0,
        `${侍.name}（${rankName(侍, u)}・役なし） → 呼べる城 ${呼べる(侍).length}`);
    }
    if (物) {
      確('物頭は軍を率いられない（陣触れが届かぬ）',
        陣触れの届き(物, u) === '無し' && 呼べる(物).length === 0, 物.name);
    }
    確('大将を渡さねば、役では縛らない（援軍の要請など）',
      reinforceOffers(u, 'nagoya', 'uchijo').filter((o) => !o.reason && o.men > 0).length > 100,
      `${reinforceOffers(u, 'nagoya', 'uchijo').filter((o) => !o.reason && o.men > 0).length}城`);
  }

  process.exit(咎 ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
