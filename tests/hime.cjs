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
  s.relations[k] = { ...r0, trust: 80, state: '中立', until: null };
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
  確('外交の高い姫ほど低い信用で結べる',
    A.婚姻の要る信用({ dip: 88 }, { state: '中立' }) < A.婚姻の要る信用({ dip: 40 }, { state: '中立' }),
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
