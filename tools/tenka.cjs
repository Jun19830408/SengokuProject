/* 天下巡り ── 画面を通して実際に遊び、倒れるところを探す道具。

   巡検（tools/junken.cjs）は月送り（advanceMonth）だけを回す。盤の道理は検める
   が、画面には一度も触れない。ところが遊ぶ側が出会う不具合の多くは画面の側に
   ある。出陣の問い、合戦の盤、在陣の始末、城を委ねる問い、捕虜の処遇――
   どれも月送りには現れない。実際に「寄騎を出す」という無い名を呼んでいた筋も、
   巡検では永久に拾えなかった。

   そこでこの道具は、本物の画面（App）を jsdom に描き、釦を押して遊ぶ。
   投げられた例外、React の叫び、進めなくなった画面――そのすべてを控える。
   月が明けるたびに、巡検と同じ不変式で盤も検める。

   使い方:
     node tools/tenka.cjs                  … 織田家で 240 か月
     node tools/tenka.cjs 600 mori         … 毛利家で 600 か月
     --sonomama … 束ね直しを省く

   限りを、はっきり断っておく。

   一　jsdom には配置（layout）が無い。はみ出し・重なり・押せるか否かは見えない。
       それは tests/semai.cjs が本物の Chrome で見る。
   二　押す手は下の「手順」に書いた筋だけである。踏まぬ道の不具合は出てこない。
       実測の例：在陣から次の城へ攻め寄せる筋を六十一度踏ませても、寄騎の枠は
       いつも零であった。この軍の総大将が城主で、陣触れの届きが自城に限られる
       からである。だから、かつて必ず倒れた「寄騎を出す」の筋には届かなかった。
       道を増やすとは、手順を増やすことである。
   三　これは強さを測る道具でもない。勝ち方を知らぬので天下は統一しない。
       二十年遊ばせて自家は三城から四城になるだけである。倒れを探すのが仕事で
       あって、上手に遊ぶのは仕事ではない。

   つまり「あらゆる不具合が出る」道具ではなく、
   「踏んだ道で倒れたら必ず分かる」道具である。 */
const path = require('path');
const { JSDOM } = require('jsdom');
const { buildHarness } = require('./bundle.cjs');

const 引数 = process.argv.slice(2);
const 月数 = Number(引数.find((x) => /^\d+$/.test(x)) || 240);
const 家 = 引数.find((x) => /^[a-z_]+$/.test(x) && x !== 'sonomama') || 'oda';
if (!引数.includes('--sonomama')) buildHarness('split');

/* ── jsdom の設え（tests/run9.cjs と同じ） ────────────────── */
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
  if (['save', 'restore', 'translate', 'scale', 'setTransform', 'clip'].includes(p)) return () => {};
  return () => ({ addColorStop: () => {} });
} });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 1200; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 800; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, width: 1200, height: 800, right: 1200, bottom: 800 };
};
const store = new Map();
dom.window.storage = {
  get: async (k) => (store.has(k) ? { key: k, value: store.get(k) } : null),
  set: async (k, v) => { store.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { store.delete(k); return {}; },
};

/* 叫びを控える。React は倒れた組を console.error で知らせる。 */
const 叫び = [];
console.error = (...a) => 叫び.push(String(a[0]).replace(/\s+/g, ' ').slice(0, 200));
dom.window.addEventListener('error', (e) => 叫び.push(`window: ${e.message}`));

const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, App, React, 解す } = H;
const 巡検 = require(path.join(__dirname, 'junken.cjs'));

const root = createRoot(document.getElementById('r'));
const 息 = async (ms = 8) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 600, clientY: 400 }));
const 押す物 = async (el) => {
  if (!el || el.disabled) return false;
  await act(async () => { M('mousedown', el); });
  await act(async () => { M('mouseup', el); });
  await act(async () => { M('click', el); });
  await 息();
  return true;
};
const 釦ら = () => [...document.querySelectorAll('button,.mbtn')];
const 押す = async (文) => 押す物(釦ら().find((b) => !b.disabled && b.textContent.trim().includes(文)));
const 文面 = () => document.body.textContent || '';
/* 合戦の盤は毎こまの絵で進む。rAF を回してやらねば時が動かない。 */
let 時 = 1000;
const 時を進める = async (n) => {
  for (let i = 0; i < n; i++) {
    時 += 33; const q = [...rafMap.entries()]; rafMap.clear();
    await act(async () => { q.forEach(([, cb]) => cb(時)); });
  }
};

/* ── 盤を取り出す。月ごとの自動の記録から解く（画面に手を入れない） ── */
const 盤を読む = () => {
  const 文 = store.get('sengoku:save1');
  if (!文) return null;
  try { const d = JSON.parse(解す(文)); return d && d.state ? d.state : null; } catch (e) { return null; }
};

/* ── 押す手（決め事）────────────────────────────────────
   画面に出た問いに、順に答えていく。上から見て、当たった一つを押す。
   「何を選ぶか」は上手下手の話であって、ここでは問わない。踏むことが仕事である。 */
const 手順 = [
  // 合戦の盤。開いたら委ねて決着まで進める（engine は手ずからと同じ理屈で回る）
  // 戦の前後の問い
  ['攻めかかる', /遅参|軍議|攻めかかる/],
  ['打って出る', /打って出る/],
  ['兵糧攻め', /包囲|兵糧攻め/],
  ['籠城して待つ', /籠城して待つ/],
  ['この備えで迎え撃つ', /この備えで迎え撃つ/],
  // 落とした城の始末
  ['城主を置かずに進む', /城主を置かず|委ねる/],
  ['この差配で決める', /この差配で決める/],
  // 人の始末
  ['と名乗らせる', /名乗らせる/],
  ['召し抱える', /召し抱え/],
  ['捕虜とする', /捕虜とする/],
  ['受ける', /身代金の申し出/],
  ['家督を継がせる', /家督|跡目/],
  // 求めごと
  ['断る', /援軍の求め|加勢の求め/],
  ['許す', /攻めの許し|願い出/],
  // 出口
  ['閉じる', /./],
  ['取りやめる', /./],
  ['戻る', /./],
];

/* 陣触れを出す（GDD 7.2）。

   遊ぶ側が攻めねば、盤は他家だけが動いて終わる。合戦の盤も、落とした城を委ねる
   問いも、在陣の始末も、こちらから兵を出してはじめて通る道である。

   本拠だけでなく、どの城からも出す。城が増えても本拠からしか出さなければ、
   遠国の城は一度も兵を出さぬまま終わり、そこの道は踏まれない。 */
/* 合戦の盤を捌く（GDD 8.5）。

   「合戦開始」で陣を敷き、「委ねて結果を見る」で諸将に任せる。engine は手ずから
   戦っても委ねても同じ理屈で回るので、これで合戦の筋はひととおり通る。
   あとは決着（「戦場を離れる」が出る）まで、こまを送ってやればよい。 */
const 合戦の盤か = () => /合戦開始|委ねて結果を見る|手綱を取り戻す|全軍撤退/.test(文面());
const 合戦を捌く = async (控, いつ) => {
  if (!合戦の盤か()) return false;
  await 押す('合戦開始');
  await 押す('委ねて結果を見る');
  for (let i = 0; i < 400; i++) {
    if (釦ら().some((b) => /戦場を離れる/.test(b.textContent))) break;
    await 時を進める(25);
    if (i === 120) { await 押す('委ねて結果を見る'); await 押す('全軍撤退'); }
  }
  if (!(await 押す('戦場を離れる'))) {
    控('合戦の盤から出られない',
      釦ら().map((b) => b.textContent.trim()).filter(Boolean).slice(0, 10).join(' / '), いつ);
    return false;
  }
  return true;
};

const 選ばせる = async (sel, value) => {
  /* React の select は value を書き換えたうえで change を投げねば動かない。
     option を押しても何も起きない（jsdom でも本物の browser でも同じ）。 */
  const 元 = Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, 'value').set;
  await act(async () => {
    元.call(sel, value);
    sel.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
  await 息();
};

/* 城の帳を開く（GDD 13.1）。

   城の帳は盤の上の城を押して開く。盤は canvas なので、押す場所を自分で算えねば
   ならない。「⛶全体図」を押せば眺めが決め打ちになる（中央・倍率 0.30）ので、
   そこからは城の座標をそのまま画面の位置に直せる。当たりの幅は 26/倍率 ＝ 約87
   なので、狙いさえ合っていれば取り違えない。 */
const MAPW = 3700, MAPH = 3900;
const 城の帳を開く = async (城) => {
  if (!城) return false;
  await 押す('全体図');
  const cv = document.querySelector('canvas');
  if (!cv) return false;
  const x = (城.x - MAPW / 2) * 0.30 + 600;
  const y = (城.y - MAPH / 2) * 0.30 + 400;
  const 出す = (t) => act(async () => {
    cv.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: x, clientY: y }));
  });
  await 出す('mousedown'); await 出す('mouseup'); await 息();
  return 文面().includes(城.name);
};

/* 在陣の始末（GDD 6.4）。落とした城に留まる軍を、次へ進めるか、城に入れるか、解くか。
   遊ぶ側の不具合はここに集まっていたので、三つとも順ぐりに踏む。 */
let 在陣の順 = 0;
const 在陣を捌く = async (盤, 控, いつ) => {
  if (!盤) return 0;
  const 在 = (盤.armies || []).filter((a) => a.faction === 盤.player && a.在陣);
  if (引数.includes('--peek') && 在.length) console.log('  在陣', 在.length, '軍');
  let 踏んだ = 0;
  for (const a of 在.slice(0, 2)) {
    const 城 = 盤.castles.find((c) => c.id === a.在陣);
    const 開いた = await 城の帳を開く(城);
    if (!開いた) continue;
    await 押す('軍事');                        // 在陣の札は軍事の綴じにある
    if (引数.includes('--peek')) console.log('   帳', 城 && 城.name, '在陣の札',
      /この城に在陣する軍/.test(文面()), '／綴じ:',
      釦ら().map((b) => b.textContent.trim()).filter((t) => /内政|軍事|人事|外交|在陣|解く|攻め寄せ|城に入れる/.test(t)).join(' '));
    if (!/この城に在陣する軍/.test(文面())) { await 押す('閉じる'); continue; }
    const 手 = 引数.includes('--semeru') ? '次の城へ攻め寄せる'
      : ['軍を解く', '兵を城に入れる', '次の城へ攻め寄せる'][在陣の順++ % 3];
    if (引数.includes('--peek')) console.log('    とる手:', 手);
    try {
      if (await 押す(手)) {
        踏んだ++;
        if (手 === '次の城へ攻め寄せる') {
          /* 行き先は丸印（radio）で選ぶ。味方の城は避けて、敵の城を選ぶ。
             行き先を決めてはじめて寄騎の枠が現れる。 */
          const 行 = [...document.querySelectorAll('label')]
            .filter((l) => l.querySelector('input[type=radio]') && !/（味方）/.test(l.textContent));
          if (行.length) {
            await act(async () => { 行[0].querySelector('input[type=radio]').click(); });
            await 息();
          }
          /* 寄騎も催す。ここは、かつて「寄騎を出す」という無い名を呼んでいて
             選べば必ず倒れた道である。選ばずに押していては、その筋を踏めない。 */
          const 枠 = [...document.querySelectorAll('input[type=checkbox]')].filter((c) => !c.disabled);
          for (const cb of 枠.slice(0, 2)) { await act(async () => { cb.click(); }); await 息(); }
          if (引数.includes('--peek')) console.log('    攻め寄せ：行き先', 行.length, '／寄騎の枠', 枠.length);
          if (!(await 押す('へ攻め寄せる'))) await 押す('取りやめ');
        }
      }
    } catch (e) { 控(`在陣の始末（${手}）で倒れた`, e.message, いつ); }
    await 押す('閉じる');
  }
  return 踏んだ;
};

/* 出陣の問いを捌く。本拠なら「陣触れ」、他の城なら帳の軍事から「出陣」。
   目標は敵で、約束（同盟・従属・臣従・不可侵）を交わしていない相手を選ぶ。 */
const 出陣の問いを捌く = async () => {
  const sel = [...document.querySelectorAll('select')]
    .find((e) => [...e.options].some((o) => /［敵］/.test(o.textContent)));
  if (!sel) { await 押す('取りやめ'); await 押す('← 戻る'); return false; }
  const 敵 = [...sel.options].filter((o) => /［敵］/.test(o.textContent));
  for (const o of 敵) {
    await 選ばせる(sel, o.value);
    const 進 = 釦ら().find((b) => !b.disabled && /人で進発/.test(b.textContent) && !/約束を破って/.test(b.textContent));
    if (進) { await 押す物(進); return true; }
  }
  await 押す('取りやめ');
  await 押す('← 戻る');
  return false;
};

const 出陣する = async (盤) => {
  // まず本拠から。届かねば、他の城の帳を開いて出す。
  if (await 押す('陣触れ')) { if (await 出陣の問いを捌く()) return true; }
  const 我 = ((盤 && 盤.castles) || []).filter((c) => c.faction === 盤.player)
    .filter((c) => c.id !== (盤.factions[盤.player] || {}).本拠);
  for (const c of 我.slice(0, 3)) {
    if (!(await 城の帳を開く(c))) continue;
    await 押す('軍事');
    if (!(await 押す('出陣'))) { await 押す('閉じる'); continue; }
    if (await 出陣の問いを捌く()) { await 押す('閉じる'); return true; }
    await 押す('閉じる');
  }
  return false;
};

const 咎 = [];
const 控える = (名, 事, いつ) => {
  const 鍵 = `${名}｜${String(事).replace(/\d+/g, 'N').slice(0, 120)}`;
  const 有 = 咎.find((x) => x.鍵 === 鍵);
  if (有) { 有.数++; return; }
  咎.push({ 鍵, 名, 事: String(事).slice(0, 200), いつ, 数: 1 });
};

(async () => {
  await act(async () => { root.render(React.createElement(App)); });
  await 息(20);
  await 押す('ゲームをはじめる');
  await 息(20);

  /* 家を選ぶ。一覧から家名の札を開き、「この勢力で開始」を押す。
     「任せて見物する」ではない――委ねてしまえば、遊ぶ側の画面を通らない。 */
  const 家名 = { oda: '織田家', mori: '毛利家', takeda: '武田家', shimazu: '島津家',
    hojo: '北条家', uesugi: '上杉家', chosokabe: '長宗我部家', date: '伊達家' }[家] || '織田家';
  const 札 = [...document.querySelectorAll('.mn')].find((e) => e.textContent.trim() === 家名);
  if (札) await 押す物(札.parentElement);
  await 息(20);
  if (!(await 押す('この勢力で開始'))) {
    const 出 = 釦ら().map((b) => b.textContent.trim()).filter(Boolean).slice(0, 12);
    console.log('★ 始める入口が見つからない。出ている釦:', 出.join(' / '));
    process.exit(1);
  }
  await 息(30);
  console.log(`${家名}で遊ぶ。${月数}か月。\n`);

  let 月 = 0, 詰まり = 0, 統一 = null, 前の年月 = '';
  const 数 = { 出陣: 0, 不発: 0, 合戦: 0, 在陣: 0 };
  const 節目 = [];
  while (月 < 月数) {
    月++;
    const 盤 = 盤を読む();
    const いつ = 盤 ? `${盤.year}年${盤.month}月` : `${月}手目`;

    /* 一　出ている問いに答える。答えるたびに画面が変わるので、何度か回す。 */
    for (let i = 0; i < 12; i++) {
      if (合戦の盤か()) { 数.合戦++; await 合戦を捌く(控える, いつ); continue; }
      const t = 文面();
      let 押した = false;
      for (const [名, 条] of 手順) {
        if (!条.test(t)) continue;
        if (await 押す(名)) { 押した = true; break; }
      }
      if (!押した) break;
      await 時を進める(4);
    }

    /* 一の二　月報を開き、頃合いを見て兵を出す。 */
    await 押す('評定を開く');
    await 押す('閉じる');
    if (月 % 2 === 0) { try { (await 出陣する(盤)) ? 数.出陣++ : 数.不発++; } catch (e) { 控える('陣触れで倒れた', e.message, いつ); } }
    try { 数.在陣 += await 在陣を捌く(盤, 控える, いつ); } catch (e) { 控える('在陣の始末で倒れた', e.message, いつ); }
    // 陣触れの画面が残っていたら閉じる
    if (/陣触れ　/.test(文面())) { await 押す('取りやめ'); await 押す('← 戻る'); }

    /* 二　月を送る。送れなければ、何かに詰まっている。 */
    if (!(await 押す('次月へ'))) {
      詰まり++;
      await 時を進める(20);
      if (詰まり >= 3) {
        const 釦 = 釦ら().map((b) => b.textContent.trim() + (b.disabled ? '[不可]' : '')).filter(Boolean);
        const 札 = document.querySelector('.card');
        控える('画面が進まなくなった',
          `釦: ${釦.slice(0, 8).join(' / ')}　札: ${(札 ? 札.textContent : '').replace(/\s+/g, ' ').slice(0, 120)}`, いつ);
        break;
      }
      continue;
    }
    詰まり = 0;
    await 息(12);

    /* 三　月が明けた盤を、巡検と同じ不変式で検める。 */
    const 新 = 盤を読む();
    if (新) {
      const 年月 = `${新.year}年${新.month}月`;
      if (年月 !== 前の年月) {
        前の年月 = 年月;
        for (const [名, 検] of 巡検.不変式) {
          let 背 = [];
          try { 背 = 検(新) || []; } catch (e) { 背 = [`検めが倒れた: ${e.message}`]; }
          for (const x of 背) 控える(名, x, 年月);
        }
      }
      const 我 = 新.castles.filter((c) => c.faction === 新.player).length;
      const 家数 = new Set(新.castles.map((c) => c.faction)).size;
      if (月 % 60 === 0) 節目.push(`  ${年月}　自家 ${我}城　残る家 ${家数}`);
      if (家数 === 1) { 統一 = 年月; break; }
      if (!新.castles.some((c) => c.faction === 新.player)) {
        控える('滅んだ', `${年月}に遊ぶ側の城が尽きた`, 年月);
        break;
      }
    }
    /* 四　React が叫んでいれば控える（倒れた組・鍵の重なりなど）。 */
    while (叫び.length) 控える('画面が叫んだ', 叫び.shift(), いつ);
  }

  const 終 = 盤を読む();
  console.log(節目.join('\n'));
  console.log(`  陣触れ 成 ${数.出陣}／不発 ${数.不発}　合戦の盤 ${数.合戦}こま　在陣の始末 ${数.在陣}度`);
  const 記 = (終 && 終.chronicle || []).map((c) => c.text).join(' ');
  console.log(`  戦国記：落城 ${(記.match(/が落ち、/g) || []).length}件／出陣 ${(記.match(/出陣/g) || []).length}件`);
  console.log('');
  console.log(`${月}か月ぶん遊んだ。` + (終 ? `盤は ${終.year}年${終.month}月、`
    + `自家 ${終.castles.filter((c) => c.faction === 終.player).length}城、`
    + `残る家 ${new Set(終.castles.map((c) => c.faction)).size}。` : ''));
  if (統一) console.log(`★ ${統一}に天下が定まった。`);
  console.log('');
  if (!咎.length) console.log('倒れも、道理に背く盤も、見つからなかった。');
  else {
    console.log(`★ ${咎.length} 種の咎を見つけた\n`);
    for (const x of 咎.sort((a, b) => b.数 - a.数)) {
      console.log(`  ［${x.名}］${x.事}`);
      console.log(`      のべ ${x.数} 件　初めは ${x.いつ}`);
    }
  }
  console.log('');
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(0);
})().catch((e) => {
  console.log('\n★ 遊びの途中で倒れた:', e.message);
  console.log(String(e.stack || '').split('\n').slice(0, 8).join('\n'));
  console.log('\nエラー: 1件');
  process.exit(1);
});
