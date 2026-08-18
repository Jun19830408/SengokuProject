/* 同盟国へ差し向けた援軍が、その同盟国と戦ってしまわないこと。

   着いた城と戦うか否かを underMyBanner（旗の下＝自家か臣従の家）だけで測って
   いた。同盟はそこに入らない。対等の間柄であって、指図の通る相手ではないから
   である。そのため、同盟国の求めに応じて援軍を出すと、着いた月にその同盟国と
   野戦が始まった。援けに行った先で、援けるはずの相手と戦っていた。

   直したあとは、出したときの心づもり（助勢の印）で判ずる。
   不可侵の相手へ覚悟のうえで攻めかかる筋は残さねばならないので、
   「和を結んでいる家の城なら攻めない」とは決められない。

   盤の外で解く道（resolveOffscreen）と、画面で着く道（MapScreen）の
   両方を通す。直す前は両方とも合戦になった。 */
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
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, App, React, initState, findPath } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* ------------------------------------------------------ 盤をこしらえる

   同盟を結んだ家の城が攻められ、そこへ自家の城から援軍を出した形。
   援軍は城の隣まで来ており、あとは着くだけになっている。 */
function 仕込む() {
  const s = initState('oda');
  const 自城 = s.castles.filter((x) => x.faction === s.player);
  const 出す城 = 自城[0];

  // 近くの他家と同盟を結ぶ
  let 盟友 = null, 盟城 = null;
  for (const d of s.castles) {
    if (d.faction === s.player) continue;
    const p = findPath(出す城.id, d.id);
    if (p && p.length >= 2 && p.length <= 4) { 盟友 = d.faction; 盟城 = d; break; }
  }
  if (!盟友) return null;
  s.relations[[s.player, 盟友].sort().join('|')] = { trust: 82, state: '同盟', until: null };
  盟城.local = 3000; 盟城.food = 40000;

  // 援軍。城の隣まで来ている（path の残りが一つ＝着いた月）
  const 将 = s.generals.filter((x) => x.at === 出す城.id && x.faction === s.player && !x.captive).slice(0, 1);
  for (const t of 将) t.at = null;
  const 軍 = {
    id: 'aid-test', faction: s.player, from: 出す城.id, gens: 将.map((x) => x.id),
    local: 2000, localTrain: 70, rost: null,
    men: 2000 + 将.reduce((a, x) => a + x.retinue, 0), at: 盟城.id,
    path: [盟城.id], prog: 0, food: 3000,
    target: 盟城.id, aid: s.player, 助勢: true,
  };
  s.armies.push(軍);
  s.pendingArrivals = [軍.id];
  s.monthEvents = [];
  return { s, 盟友, 盟城, 出す城, 軍, 将 };
}

/* ------------------------------------- 一、盟の別を正しく見分けているか */
{
  const 仕 = 仕込む();
  if (!仕) { console.log('  （近くに同盟を結べる家がなく、仕込めない）'); process.exit(1); }
  const { s, 盟友, 盟城, 軍 } = 仕;
  console.log(`仕込み: ${s.factions[s.player].name} と ${s.factions[盟友].name} が同盟。`
    + `${盟城.name}へ援軍${軍.men}人が到着する。`);

  確('同盟の相手とは和を結んでいる', H.atPeace(s, s.player, 盟友),
    H.relOf(s, s.player, 盟友).state);
  確('助勢の印のある軍は、援けに着いたとみなす', H.援けに着く(s, 軍, 盟城));

  // 攻めるために出た軍（印なし）は、これまで通り攻める
  const 攻 = { ...軍, id: 'atk-test', aid: null, 助勢: undefined };
  確('印のない軍は、和を結んだ相手でも攻めに着く', !H.援けに着く(s, 攻, 盟城),
    '不可侵の相手へ覚悟のうえで攻める筋を残す');

  // 寄騎（敵城を攻める本隊への援軍）にも aid の印はつくが、助勢はつかない
  const 敵城 = s.castles.find((x) => x.faction !== s.player && x.faction !== 盟友);
  const 寄騎 = { ...軍, id: 'yoriki', 助勢: undefined, target: 敵城.id };
  確('寄騎は敵城を攻める', !H.援けに着く(s, 寄騎, 敵城), `${敵城.name}`);
}

/* ------------------------------ 二、盤の外で解くとき、同盟国と戦わないこと */
{
  const { s, 盟城, 軍, 将 } = 仕込む();
  const 前の兵 = 盟城.local;
  const t = H.resolveOffscreen(s, 軍.id, 盟城.id);
  const 後 = t.castles.find((x) => x.id === 盟城.id);
  確('城は同盟国のまま（攻め落としていない）', 後.faction === 盟城.faction,
    `${t.factions[後.faction].name}`);
  確('兵は城の守りに加わる', 後.local === 前の兵 + 軍.local,
    `${前の兵} → ${後.local}人`);
  確('援軍は盤から消える（合戦にならず入城した）', !t.armies.some((x) => x.id === 軍.id));
  if (将.length) {
    const q = t.generals.find((x) => x.id === 将[0].id);
    const 居 = t.castles.find((x) => x.id === q.at);
    確('将は他家の城に預けず、本国へ帰す', !!居 && 居.faction === t.player,
      `${q.name} → ${居 ? 居.name : '行方知れず'}`);
  }
  確('戦国記に同盟国との合戦が残らない',
    !(t.chronicle || []).some((x) => /合戦|野戦|攻め落と|落城/.test(x.text) && x.text.includes(盟城.name)));
}

/* ------------------------ 三、古い記録の、道中の援軍にも印をつけ直すこと */
{
  const { s, 盟城, 軍 } = 仕込む();
  const 印なし = s.armies.find((x) => x.id === 軍.id);
  delete 印なし.助勢;                                  // 直す前に出した軍
  const t = H.migrateSave(JSON.parse(JSON.stringify(s)));
  const a2 = t.armies.find((x) => x.id === 軍.id);
  確('道中の援軍に、遡って助勢の印がつく', !!a2 && a2.助勢 === true);
  確('印がついた軍は、援けに着くとみなされる',
    H.援けに着く(t, a2, t.castles.find((x) => x.id === 盟城.id)));
}

/* --------------------------------- 四、画面で着いたときに合戦が始まらないこと */
const 仕 = 仕込む();
const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: 仕.s })]]);
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

(async () => {
  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
  await rc('続きから'); await flush(); await flush(); await flush();

  const 文 = document.body.textContent;
  /* 合戦が始まったかは、盤の上の言葉で見る。
     直す前はここで「軍議」（城攻めの前）か野戦の画面へ移っていた。 */
  const 兆 = ['軍議', '采配', '鶴翼', '魚鱗', '備えを解いて退く'].filter((w) => 文.includes(w));
  確('着いても合戦が始まらない', !兆.length,
    兆.length ? `盤に「${兆.join('」「')}」が出ている` : '評定の画面のまま');

  await rc('戦国記'); await flush();
  const 記 = [...document.querySelectorAll('.card')].map((e) => e.textContent).join(' ').replace(/\s+/g, ' ');
  const 討った = new RegExp(`${仕.盟城.name}(を落と|の城下で|攻め)`).test(記);
  確('戦国記に同盟国を攻めた跡が残らない', !討った, 討った ? 記.slice(0, 200) : '');
  await rc('閉じる');

  console.log('');
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
