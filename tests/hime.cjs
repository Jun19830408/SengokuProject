/* 姫（GDD 6.8）。

   大名家には姫がいる。武将としては数えない。戦場にも出ない。
   けれども、家と家を結ぶのは多く姫の縁である。信長の妹お市は浅井へ、
   信玄の娘は北条へ、元就の娘は宍戸へ嫁いだ。縁組は同盟そのものであった。

   姫にできることは四つ。
     一、婚姻同盟   … 他家へ輿入れし、その家と結ぶ。縁は姫の存命のあいだ続く
     二、外交の使者 … 姫が使いに立てば、ただの使者より遙かに重い
     三、家臣へ嫁ぐ … 婿は一門となり、忠誠は揺るがず、家督にも連なる
     四、家中の統率 … 城にあれば、その城の守備隊の統率に映る

   数は石高による。三十万石までは一人、七十万石までは二人、百万石までは三人、
   以後は五十万石ごとに一人を加え、十人を限りとする。十五で世に出る。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const { JSDOM } = require('jsdom');

/* 画面の分も見る（帳が開き、縁組が結べること）。JSDOM を先に立てておく。 */
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
  return () => ({ addColorStop: () => {} });
} });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 900; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 600; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, width: 900, height: 600, right: 900, bottom: 600 };
};
console.error = () => {};

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'hime-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export * from "../src/core/hime.js";\n'
+ 'export { HIME } from "../src/data/hime.js";\n'
+ 'export { initState, relOf, migrateSave } from "../src/core/state.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { 守備隊の統率 } from "../src/core/rank.js";\n'
+ 'export { canRecruit, heirCandidates, isMainClan, hasHouse } from "../src/core/house.js";\n');
const out = path.join(ROOT, 'build', 'hime.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* ---------------------------------------------- 一、姫が家に立つ */
{
  const s = A.initState('oda');
  確('盤の初めから姫がいる', (s.hime || []).length > 0, `${s.hime.length}人`);
  確('姫は武将には数えない', !s.generals.some((x) => (s.hime || []).some((h) => h.id === x.id)), '');
  const 名 = s.hime.map((h) => h.name);
  確('姫の名は重ならない', new Set(名).size === 名.length,
    `${new Set(名).size}/${名.length}`);
  確('みな十五以上である', s.hime.every((h) => s.year - h.born >= 15), '');
  確('居城が定まっている', s.hime.every((h) => s.castles.some((c) => c.id === h.at)), '');

  確('三十万石までは一人', A.姫の枠(290000) === 1, `${A.姫の枠(290000)}人`);
  確('七十万石までは二人', A.姫の枠(650000) === 2, `${A.姫の枠(650000)}人`);
  確('百万石までは三人', A.姫の枠(1000000) === 3, `${A.姫の枠(1000000)}人`);
  確('以後は五十万石ごとに一人', A.姫の枠(1500000) === 4 && A.姫の枠(2000000) === 5,
    `百五十万石 ${A.姫の枠(1500000)}人／二百万石 ${A.姫の枠(2000000)}人`);
  確('十人を限りとする', A.姫の枠(9000000) === 10, `${A.姫の枠(9000000)}人`);

  const 織 = A.家の姫(s, 'oda');
  const 枠 = A.姫の枠(s.castles.filter((c) => c.faction === 'oda').reduce((a, c) => a + c.koku, 0));
  確('家の姫は石高の枠に収まる', 織.length === 枠, `${織.length}人／枠${枠}`);

  // 名の伝わる姫は齢十五に達した年に世に出る（枠に関わらず）
  const s2 = A.initState('oda');
  s2.year = 1562;                                   // お市（1547年生）が十五になる年
  A.姫を整える(s2);
  const 市 = (s2.hime || []).find((h) => h.name === 'お市');
  確('名の伝わる姫は齢十五で世に出る', !!市 && 市.faction === 'oda',
    市 ? `${市.name}（外交${市.dip}・統率${市.lead}）` : '出ない');
  確('史実の姫には伝が添えてある', !!市 && !!市.伝 && !市.架空, 市 ? 市.伝 : '');
}

/* ---------------------------------------------- 二、婚姻同盟 */
{
  const s = A.initState('oda');
  const h = A.家の姫(s, 'oda')[0];
  h.dip = 80;
  const 相 = 'imagawa';
  const r0 = A.relOf(s, 'oda', 相);
  const k = ['oda', 相].sort().join('|');
  /* 婚姻に要る信用は満（百）である（GDD 12.1）。縁は姫の存命のあいだ続く、
     期限のある同盟より重い約束なのだから、誼を尽くし切った相手にしか嫁がせない。 */
  s.relations[k] = { ...r0, trust: 85, state: '中立', until: null };
  s.factions.oda.gold = 5000;

  const 前 = A.婚姻できるか(s, h, 相);
  確('信用が足りていれば結べる', 前.ok, 前.why || `要 ${前.要}`);
  const res = A.婚姻を結ぶ(s, h.id, 相);
  確('輿入れで同盟になる', res.ok && s.relations[k].state === '同盟',
    s.relations[k].state);
  確('婚姻の同盟に期限は無い', s.relations[k].until === null, String(s.relations[k].until));
  確('どの姫の縁かを控える', s.relations[k].婚姻 === h.id, '');
  確('輿入れした姫は盤を離れる', h.at === null && h.嫁 && h.嫁.種 === '婚姻', '');
  確('支度の金が要る', s.factions.oda.gold === 5000 - A.婚儀の礼, `${s.factions.oda.gold}貫`);

  // 姫が没すれば縁は切れる
  A.縁を解く(s, h);
  確('姫が世を去れば同盟も解ける', s.relations[k].state === '中立', s.relations[k].state);

  // 冷たい家とは結べない
  const s3 = A.initState('oda');
  const h3 = A.家の姫(s3, 'oda')[0];
  h3.dip = 40;
  const k3 = ['oda', 'imagawa'].sort().join('|');
  s3.relations[k3] = { trust: 30, state: '中立', until: null };
  確('信用の足りぬ家とは結べない', !A.婚姻できるか(s3, h3, 'imagawa').ok,
    A.婚姻できるか(s3, h3, 'imagawa').why);
  /* 婚姻に要る信用は満（百）である。姫の外交では緩まない（GDD 12.1）。

     もとは姫の外交で三十まで下がった（外交88なら三十、外交40なら四十五ほど）。
     縁は姫の存命のあいだ続く重い約束なので、誼を尽くし切った相手にしか
     嫁がせない、と改めた。姫の外交は、使者に立ったときの働きに効く。 */
  確('婚姻に要る信用は、姫の外交によらず八十五である',
    A.婚姻の要る信用({ dip: 88 }, { state: '中立' }) === 85
      && A.婚姻の要る信用({ dip: 40 }, { state: '中立' }) === 85,
    `外交88なら${A.婚姻の要る信用({ dip: 88 }, { state: '中立' })}／外交40なら${A.婚姻の要る信用({ dip: 40 }, { state: '中立' })}`);
}

/* ---------------------------------------------- 三、外交の使者 */
{
  const s = A.initState('oda');
  const h = A.家の姫(s, 'oda')[0];
  h.dip = 78;
  s.factions.oda.gold = 5000;
  const k = ['oda', 'imagawa'].sort().join('|');
  const 前 = A.relOf(s, 'oda', 'imagawa').trust;
  const res = A.使者に立てる(s, h.id, 'imagawa');
  確('姫を使者に立てられる', res.ok, res.why || '');
  確('信用が上がる（親善より重い）', s.relations[k].trust - 前 >= 9,
    `${Math.round(前)} → ${Math.round(s.relations[k].trust)}（＋${res.効}）`);
  確('三月のあいだ戻らない', !!h.務め && A.姫の役(s, h) === '使者',
    h.務め ? `${h.務め.迄.y}年${h.務め.迄.m}月まで` : '');
  確('出ているあいだは他の用に立てられない', !A.使える姫(s, h), '');
  s.month = h.務め.迄.m; s.year = h.務め.迄.y;
  A.使者の帰り(s);
  確('務めを終えれば戻る', !h.務め && A.使える姫(s, h), '');
}

/* ---------------------------------------------- 四、家臣へ嫁がせる（一門化） */
{
  const s = A.initState('oda');
  const h = A.家の姫(s, 'oda')[0];
  const gen = s.generals.find((x) => x.faction === 'oda' && !x.lord && (x.age || 30) >= 15);
  gen.loyal = 55;
  const res = A.家臣に嫁がせる(s, h.id, gen.id);
  確('家臣に嫁がせられる', res.ok, res.why || `${gen.name}`);
  確('婿は一門となる', gen.一門 === true && A.isMainClan(s, gen), '');
  確('忠誠が跳ね上がる', gen.loyal >= 92, `忠${Math.round(gen.loyal)}`);
  確('他家に靡かなくなる', !A.canRecruit(gen, null).ok, A.canRecruit(gen, null).why);
  確('姫は婿の城に入る', h.at === gen.at, '');
  const lord = s.generals.find((x) => x.faction === 'oda' && x.lord);
  const 候 = A.heirCandidates(s, lord).find((x) => x.gen.id === gen.id);
  確('家督の候補に連なる', !!候 && 候.blood, 候 ? '血筋として並ぶ' : '並ばない');
  確('一門は独立した家を持たない', !A.hasHouse(s, gen), '');
}

/* ---------------------------------------------- 五、守備隊の統率に映る */
{
  const s = A.initState('oda');
  const c = s.castles.find((x) => x.faction === 'oda');
  // 将のいない城
  for (const g of s.generals) if (g.at === c.id) g.at = null;
  s.hime = [];                                      // 盤の初めから居る姫を一度どける
  const 無 = A.守備隊の統率(s, c);
  s.hime = [{ id: 'hx', name: '試の姫', faction: 'oda', at: c.id, born: s.year - 20,
    dip: 60, lead: 74, 死: false, 嫁: null, 務め: null }];
  const 有 = A.守備隊の統率(s, c);
  確('将のいない城では姫の統率が守備隊に映る', 有 === 74 && 無 === 40, `姫なし${無} → 姫あり${有}`);

  // 将のいる城でも、姫のほうが束ねる力があれば高いほうを取る
  const s2 = A.initState('oda');
  const c2 = s2.castles.find((x) => x.faction === 'oda');
  const 元 = A.守備隊の統率(s2, c2);
  s2.hime = [{ id: 'hy', name: '試の姫', faction: 'oda', at: c2.id, born: s2.year - 20,
    dip: 60, lead: 99, 死: false, 嫁: null, 務め: null }];
  確('将のいる城でも、姫が勝れば姫が束ねる', A.守備隊の統率(s2, c2) === 99, `${元} → 99`);

  // 輿入れした姫は城にいない
  s2.hime[0].嫁 = { 種: '婚姻', 先: 'imagawa' };
  確('輿入れした姫はもう城を守らない', A.守備隊の統率(s2, c2) === 元, '');
}

/* ---------------------------------------------- 六、落城と、古い記録 */
{
  const s = A.initState('oda');
  const c = s.castles.find((x) => x.faction === 'oda');
  const h = (s.hime || []).find((x) => x.at === c.id);
  c.faction = 'imagawa';                            // 城が落ちた
  A.姫の居場所(s);
  確('城が落ちれば姫は他の城へ落ち延びる',
    h.at !== c.id && s.castles.some((x) => x.id === h.at && x.faction === 'oda'), '');
  for (const x of s.castles) if (x.faction === 'oda') x.faction = 'imagawa';
  A.姫の居場所(s);
  確('家が滅べば行方が知れなくなる', h.死 === true && h.訳 === '行方知れず', '');

  const 古 = A.initState('oda');
  delete 古.hime;
  A.migrateSave(古);
  確('姫のいない古い記録にも姫が立つ', Array.isArray(古.hime) && 古.hime.length > 0,
    `${(古.hime || []).length}人`);
}

/* ---------------------------------------------- 七、月を送っても崩れない */
{
  const s = A.initState('oda');
  let t = s;
  for (let i = 0; i < 30; i++) t = A.advanceMonth(t, t);
  確('二年半送っても姫は残る', (t.hime || []).length > 0, `${t.hime.length}人`);
  確('居場所の無い姫がいない',
    (t.hime || []).every((h) => h.死 || (h.嫁 && h.嫁.種 === '婚姻')
      || t.castles.some((c) => c.id === h.at)), '');
  確('姫は武将の欄に紛れ込まない',
    !(t.generals || []).some((x) => (t.hime || []).some((h) => h.id === x.id)), '');
}

/* ---------------------------------------------- 八の一、他家も姫を使う

   これまで遊ぶ側でない家は外交をしなかった。始めに定まった間柄がそのまま
   最後まで続いた。姫はその最初の一手である。 */
{
  const s = A.initState('oda');
  // 弱い隣家（松平）が、大きな隣家（今川）を恐れて縁を結ぶ形を作る
  const 弱 = 'matsudaira', 強 = 'imagawa';
  const k = [弱, 強].sort().join('|');
  s.relations[k] = { trust: 85, state: '中立', until: null };    // 婚姻に要る信用は八十五（GDD 12.1）
  s.factions[弱].gold = 4000;
  s.卓 = '試の卓';                                   // 采配の籤を定める（毎度同じ手になる）
  const h = A.家の姫(s, 弱)[0];
  h.dip = 80;
  /* 采配は年に一度、四度に一度ほどしか動かない（家々が片端から縁を結べば
     盤から戦が消える）。年を替えて繰り返せば、いずれ動く。 */
  let 手 = null;
  for (let i = 0; i < 20 && s.relations[k].state !== '同盟'; i++) { s.year++; 手 = A.姫の采配(s, 弱, {}) || 手; }
  確('他家も己より大きい隣家と縁を結ぶ', s.relations[k].state === '同盟',
    手 ? `${手.手}（${h.name}）` : '何もしない');
  確('その縁も姫の存命のあいだ続く', s.relations[k].until === null && !!s.relations[k].婚姻, '');

  // 縁は一つに限る（家々が片端から結べば、盤から戦が消える）
  const 他 = 'oda';
  const k2 = [弱, 他].sort().join('|');
  s.relations[k2] = { trust: 100, state: '中立', until: null };
  A.姫の采配(s, 弱, {});
  確('縁は一つに限る', s.relations[k2].state !== '同盟', s.relations[k2].state);
}

/* ---------------------------------------------- 八の二、遊ぶ側へは縁談として申し込む */
{
  const s = A.initState('oda');
  // 遊ぶ側（織田）を大きくして、隣家に恐れさせる
  for (const c of s.castles.filter((x) => x.faction === 'yamato' || x.faction === 'ise')) c.faction = 'oda';
  const 弱 = 'mizuno';
  const k = [弱, 'oda'].sort().join('|');
  s.relations[k] = { trust: 85, state: '中立', until: null };    // 婚姻に要る信用は八十五（GDD 12.1）
  s.factions[弱].gold = 4000;
  s.卓 = '試の卓';
  const h = A.家の姫(s, 弱)[0];
  h.dip = 84;
  let 談 = null;
  for (let i = 0; i < 20 && !談; i++) { s.year++; A.姫の采配(s, 弱, { 申し込む: (x) => { 談 = x; } }); }
  確('遊ぶ側へはこちらから決めず、縁談として申し込む',
    !!談 && s.relations[k].state !== '同盟', 談 ? `${s.factions[談.fid].name}より` : '申し込まれない');
  if (談) {
    const 断 = A.縁談を断る(structuredClone(s), 談);
    確('断れば信用が下がる', 断.ok, 断.文 || '');
    const r = A.縁談を受ける(s, 談);
    確('受ければ婚姻同盟になる', r.ok && s.relations[k].state === '同盟' && s.relations[k].until === null, '');
  }
}

/* ---------------------------------------------- 八の三、月を送れば他家が姫を使う */
{
  let t = A.initState('oda');
  t.autoPlay = true;
  for (let i = 0; i < 12 * 22; i++) t = A.advanceMonth(t, t);
  const 婚 = Object.values(t.relations).filter((r) => r.婚姻).length;
  const 一門 = (t.generals || []).filter((x) => x.一門).length;
  /* 婚姻に要る信用を満（百）と改めたので、他家が二十二年のうちに縁を結ぶことは
     稀になった（二十五年を走らせて測ると、九千三百十六組のうち信用八十以上は
     百十二組ほどである）。「二十二年に一度は起きる」を判じにすると、
     当たり外れを見ることになる。

     決まりそのものは下で直に測る――信用が満ちていれば、他家は縁を結ぶ。
     ここでは起きた数を控えとして出しておく。 */
  console.log(`  （二十二年のうちに他家が結んだ縁 ${婚}組。婚姻は信用八十五を要るので稀である）`);
  {
    // 信用を満たした形を作り、采配が縁を結ぶかを直に見る
    const u = A.initState('oda');
    const 弱 = 'matsudaira', 強 = 'imagawa';
    const k3 = [弱, 強].sort().join('|');
    u.relations[k3] = { trust: 85, state: '中立', until: null };
    u.factions[弱].gold = 4000;
    u.卓 = '試の卓';
    for (let i = 0; i < 20 && u.relations[k3].state !== '同盟'; i++) { u.year++; A.姫の采配(u, 弱, {}); }
    確('信用が満ちていれば、他家は縁を結ぶ', u.relations[k3].state === '同盟' && !!u.relations[k3].婚姻,
      `${u.relations[k3].state}${u.relations[k3].婚姻 ? '（婚姻）' : ''}`);
  }
  確('他家が家臣に姫を嫁がせて家中を固める', 一門 > 0, `${一門}人`);
  /* 家々が片端から縁を結べば、盤の上のどの家も攻められなくなる。
     結ぶ家は一部にとどまっていること。 */
  const 家数 = new Set(t.castles.map((c) => c.faction)).size;
  確('縁を結ぶ家は一部にとどまる', 婚 < 家数 * 0.5, `${婚}組／${家数}家`);
}

/* ---------------------------------------------- 八、画面から姫を使えること */
const H = require(path.join(ROOT, 'build', 'harness.cjs'));
const { createRoot, act, App, React } = H;
const s8 = A.initState('oda');
s8.factions.oda.gold = 8000;
const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s8 })]]);
dom.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
};
const root = createRoot(document.getElementById('r'));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 450, clientY: 300 }));
const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
const btn = (t) => [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t) && !b.disabled);
const rc = async (t) => { const el = btn(t); if (!el) return false; await click(el); return true; };
const 文 = () => { const b = document.body.cloneNode(true);
  for (const x of b.querySelectorAll('style,script')) x.remove();
  return b.textContent.replace(/\s+/g, ' '); };

(async () => {
  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
  await rc('続きから'); await flush(); await flush();
  確('地図に「姫」の釦がある', !!btn('姫'), '');
  await rc('姫'); await flush();
  const 姫名 = A.家の姫(s8, 'oda')[0].name;
  確('姫の帳が開く', /姫は武将ではありません/.test(文()), '');
  確('家の姫が並ぶ', 文().includes(姫名), 姫名);
  確('三つの使い道が出る',
    !!btn('輿入れ') && !!btn('使者に立てる') && !!btn('家臣に嫁がせる'), '');
  await rc('家臣に嫁がせる'); await flush();
  確('婿の候補が並ぶ', /婿|嫁がせますか/.test(文()), '');
  await rc('嫁がせる'); await flush(); await flush();
  const 決 = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '嫁がせる');
  const 婿 = 決 && 決.parentElement.querySelector('.mn').textContent.trim();
  if (決) await click(決);
  await flush(); await flush();
  確('画面から縁組を結べる（姫は婿の室となる）',
    new RegExp(`${婿}の室`).test(文()), 婿 ? `${姫名} → ${婿}` : '婿が選べない');

  console.log('');
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 6).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
