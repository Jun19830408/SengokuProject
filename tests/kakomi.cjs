/* 囲みの札（GDD 9.2）。

   城が囲まれている、あるいはこちらが囲んでいる――そのとき盤の上で何が起きて
   いるのかは、月送りの中にしか書かれていなかった。城の帳を開いても「囲まれて
   います」の一行だけで、寄せ手が何人か、兵糧があと何月もつか、後詰が向かって
   いるかは、どこにも出ない。遊ぶ側の申し出は「包囲している、されている軍の
   情報をわかりやすく城のアラート情報として記載する」であった。

   札は城の名のすぐ下に置き、どの欄を開いていても目に入るようにした。

   ここで縛るのは二つ。見通しが月送りと同じ式から出ていること（見せる数と盤を
   動かす数とが食い違っては、知らせる意味がない）。そして、他家の城の内を
   偵察もせずに読ませないこと。 */
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>',
  { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
let rafId = 0; const rafMap = new Map();
global.requestAnimationFrame = (cb) => { rafId++; rafMap.set(rafId, cb); return rafId; };
global.cancelAnimationFrame = (id) => rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT = true; dom.window.IS_REACT_ACT_ENVIRONMENT = true;
const ctxStub = new Proxy({}, { get: () => () => ({ addColorStop: () => {} }) });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
if (!dom.window.structuredClone) dom.window.structuredClone = structuredClone;
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { React, createRoot, act, CastleSheet, initState, advanceMonth, newRoster,
  囲みの様子, 囲んでいる様子, 城の保ち, 寄せ手の保ち, 城の兵, 守りの寄親 } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 0x4C21;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* 囲まれた城の場を組む。

   見通しを測るときは、他家どうしの囲みを使う。遊ぶ側の城の囲みは、守りを
   旗頭に預けていないかぎり月送りでは進まない――退くか戦うかを大名が決めるまで
   待つ決まりだからである（core/inin.js の 守りを旗頭に任せるか）。進まぬ囲みで
   「何月で落ちるか」は測れない。札の見え方を検めるときだけ、自家の城を使う。 */
const 囲ませる = (opt = {}) => {
  const s = initState('oda');
  const 我が城 = !!opt.我が城;
  const c = 我が城
    ? s.castles.find((x) => x.faction === 'oda' && x.id !== s.factions.oda.本拠)
    : s.castles.find((x) => x.faction !== 'oda');
  const 敵城 = s.castles.find((x) => x.faction !== 'oda' && x.faction !== c.faction);
  const 将 = s.generals.find((x) => x.faction === 敵城.faction && !x.captive && !x.lord);
  if (将) 将.at = null;
  const 兵 = opt.寄せ手 == null ? 9000 : opt.寄せ手;
  const a = { id: 'S1', faction: 敵城.faction, from: 敵城.id, gens: 将 ? [将.id] : [],
    local: 兵, localTrain: 70, rost: newRoster(兵, 'arm-S1'), men: 兵 + (将 ? 将.retinue : 0),
    at: c.id, path: [c.id], prog: 0, food: opt.寄せ手の糧 == null ? 400000 : opt.寄せ手の糧,
    target: c.id, sieging: true };
  s.armies.push(a);
  s.sieges = [{ castleId: c.id, armyId: 'S1', months: 0, decided: null, enc: 60 }];
  if (opt.糧 != null) c.food = opt.糧;
  if (opt.民 != null) c.min = opt.民;
  return { s, c, a, 敵城 };
};

console.log('── 一　見通しは月送りと同じ式から出る');
{
  /* まず目盛りそのものを合わせる。一月送って、城の兵糧と民心が式どおりに
     減るかを見る。ここが合っていなければ、何月もつかの見通しは嘘になる。 */
  const { s, c, a } = 囲ませる({ 寄せ手: 4000, 糧: 40000, 民: 80 });
  const 保 = 城の保ち(s, c);
  const 前糧 = c.food, 前民 = c.min, 前寄糧 = a.food, 前寄兵 = a.men;
  const t = advanceMonth(s, s);
  const c2 = t.castles.find((x) => x.id === c.id);
  const a2 = (t.armies || []).find((x) => x.id === 'S1');
  確('城の食い扶持は封鎖の扶持と囲みの食い潰しの和である',
    !!c2 && Math.abs((前糧 - c2.food) - 保.食) <= 1,
    `減り ${Math.round(前糧 - c2.food)}／式 ${保.食}`);
  確('民心は月に六.二ずつ離れる（囲みで五、封鎖で一.二）',
    !!c2 && Math.abs((前民 - c2.min) - H.民の離れ) <= 0.01,
    `${前民} → ${c2.min.toFixed(1)}`);
  確('寄せ手の食い扶持は「総勢×〇.〇九」を月に二度（道中と囲み）',
    !!a2 && Math.abs((前寄糧 - a2.food) - Math.round(前寄兵 * 0.09) * 2) <= 2,
    `減り ${Math.round(前寄糧 - a2.food)}／式 ${Math.round(前寄兵 * 0.09) * 2}`);
}
{
  /* 城の保ち。札は「このままなら」と断ってある――強攻や後詰で早まることは
     あっても、何も起きずに見通しを越えて持ちこたえることはない。 */
  const { s, c } = 囲ませる({ 寄せ手: 4000, 糧: 4000, 民: 100 });
  const 保 = 城の保ち(s, c);
  確('兵糧の尽きるほうが早い', 保.訳 === '兵糧が尽きる',
    `兵糧${保.兵糧}ヶ月／民心${保.民心}ヶ月`);
  let t = s, 落ちた = null;
  for (let m = 1; m <= 保.月 + 2 && !落ちた; m++) {
    t = advanceMonth(t, t);
    const c2 = t.castles.find((x) => x.id === c.id);
    if (!c2 || c2.faction !== c.faction) 落ちた = m;
  }
  確('見通しの月を越えて持ちこたえはしない', 落ちた != null && 落ちた <= 保.月 + 1,
    `見通し ${保.月}ヶ月／実際 ${落ちた == null ? '落ちず' : 落ちた + 'ヶ月'}`);
}
{
  const { s, c } = 囲ませる({ 糧: 900000, 民: 40 });
  const 保 = 城の保ち(s, c);
  確('民の離れるほうが早い', 保.訳 === '民が離れる',
    `兵糧${保.兵糧}ヶ月／民心${保.民心}ヶ月`);
  確('民心の見通しは月に六.二の目減りで出る',
    保.民心 === Math.floor((40 - 25) / H.民の離れ) + 1, `${保.民心}ヶ月（民心40）`);
}
{
  const { a } = 囲ませる({ 寄せ手: 6000, 寄せ手の糧: 2000 });
  確('寄せ手の保ちは総勢の〇.〇九の二倍で割って出る',
    寄せ手の保ち(a) === Math.floor(2000 / (Math.round(a.men * 0.09) * 2)),
    `${寄せ手の保ち(a)}ヶ月（兵${a.men}・糧2,000）`);
}

console.log('\n── 二　札に要る事柄が揃う');
{
  const { s, c, a, 敵城 } = 囲ませる({ 我が城: true, 糧: 24000, 民: 68 });
  /* 後詰を一手、向かわせておく */
  const 他 = s.castles.find((x) => x.faction === c.faction && x.id !== c.id);
  s.armies.push({ id: 'R1', faction: c.faction, from: 他.id, gens: [], local: 4200,
    localTrain: 70, rost: newRoster(4200, 'arm-R1'), men: 4200, at: 他.id,
    path: [他.id, c.id], prog: 0, food: 9000, target: c.id, relief: c.id });
  s.sieges[0].relief = 'R1';
  const 様 = 囲みの様子(s, c, { 守りの寄親, 月数: H.marchMonthsOf });
  確('囲まれているとわかる', !!様 && 様.囲まれている === true);
  確('寄せ手の家・大将・兵がわかる',
    !!様.寄せ手 && 様.寄せ手.家.name === s.factions[敵城.faction].name && 様.寄せ手.兵 === a.men,
    `${様.寄せ手.家.name}・${様.寄せ手.大将 ? 様.寄せ手.大将.name : '—'}・${様.寄せ手.兵}人`);
  確('寄せ手の兵糧の保ちがわかる', 様.寄せ手.保ち === 寄せ手の保ち(a), `${様.寄せ手.保ち}ヶ月`);
  確('城方の兵がわかる', 様.城方.兵 === 城の兵(s, c), `${様.城方.兵}人`);
  確('城の保ちと訳がわかる', 様.城方.月 === 城の保ち(s, c).月 && !!様.城方.訳,
    `あと${様.城方.月}ヶ月（${様.城方.訳}）`);
  確('強攻の目がわかる', 様.寄せ手.強攻 === (a.men > 城の兵(s, c) * 1.6),
    様.寄せ手.強攻 ? '数で押される' : '押しきれない');
  確('後詰が向かっているとわかる', 様.後詰ら.length === 1 && 様.後詰ら[0].兵 === 4200,
    様.後詰ら.map((r) => `${r.兵}人・あと${r.月}ヶ月`).join('／') || 'なし');
}
{
  /* 囲まれてはいないが、敵が向かっている城 */
  const s = initState('oda');
  const c = s.castles.find((x) => x.faction === 'oda');
  const 敵城 = s.castles.find((x) => x.faction !== 'oda');
  s.armies.push({ id: 'M1', faction: 敵城.faction, from: 敵城.id, gens: [], local: 7000,
    localTrain: 70, rost: newRoster(7000, 'arm-M1'), men: 7000, at: 敵城.id,
    path: [敵城.id, c.id], prog: 0, food: 9000, target: c.id });
  const 様 = 囲みの様子(s, c, { 守りの寄親, 月数: H.marchMonthsOf });
  確('迫る軍がわかる', !!様 && !様.囲まれている && 様.迫る.length === 1,
    様 ? 様.迫る.map((q) => `${q.家.name}${q.兵}人・あと${q.月}ヶ月`).join('／') : 'なし');
}

console.log('\n── 三　こちらが囲んでいる城');
{
  const s = initState('oda');
  const 的 = s.castles.find((x) => x.faction !== 'oda');
  const 将 = s.generals.find((x) => x.faction === 'oda' && !x.captive && !x.lord);
  将.at = null;
  s.armies.push({ id: 'A1', faction: 'oda', from: s.factions.oda.本拠, gens: [将.id],
    local: 9000, localTrain: 72, rost: newRoster(9000, 'arm-A1'), men: 9000 + 将.retinue,
    at: 的.id, path: [的.id], prog: 0, food: 60000, target: 的.id, sieging: true });
  s.sieges = [{ castleId: 的.id, armyId: 'A1', months: 2, decided: null }];
  const 攻 = 囲んでいる様子(s, 的, 'oda', { 月数: H.marchMonthsOf, 見える: () => false });
  確('囲んでいるとわかる', !!攻 && 攻.囲んでいる === true && 攻.月数 === 2);
  確('味方の兵と兵糧の保ちがわかる', 攻.兵 > 9000 && 攻.保ち > 0,
    `${攻.兵}人・兵糧あと${攻.保ち}ヶ月`);
  確('偵察していなければ城の内は読めない', 攻.見えている === false && 攻.城方 === null);
  const 攻2 = 囲んでいる様子(s, 的, 'oda', { 月数: H.marchMonthsOf, 見える: () => true });
  確('偵察していれば城の内が読める', 攻2.見えている === true && !!攻2.城方,
    攻2.城方 ? `城方${攻2.城方.兵}人・あと${攻2.城方.月}ヶ月` : 'なし');
}

console.log('\n── 四　城の帳に札が出る');
{
  const { s, c } = 囲ませる({ 我が城: true, 糧: 24000, 民: 68 });
  const root = createRoot(document.getElementById('r'));
  const 文 = (() => {
    act(() => { root.render(React.createElement(CastleSheet, {
      g: s, castle: c, land: false, tab: '内政', setTab: () => {}, onClose: () => {},
    })); });
    return document.body.textContent.replace(/\s+/g, ' ');
  })();
  確('「囲まれている」の札が立つ', /【囲まれている】/.test(文));
  確('寄せ手の兵が読める', /寄せ手/.test(文) && /人/.test(文));
  確('落ちるまでの見通しが読める', /あと\d+ヶ月で落ちる/.test(文),
    (文.match(/あと\d+ヶ月で落ちる（[^）]*）/) || ['—'])[0]);
  確('内政の欄を開いていても出る（どの欄でも目に入る）', /【囲まれている】/.test(文));
  /* 他家の城では、内を読ませない */
  const 的 = s.castles.find((x) => x.faction !== 'oda');
  s.sieges.push({ castleId: 的.id, armyId: 'S1', months: 1, decided: null });
  const 文2 = (() => {
    act(() => { root.render(React.createElement(CastleSheet, {
      g: s, castle: 的, land: false, tab: '内政', setTab: () => {}, onClose: () => {},
    })); });
    return document.body.textContent.replace(/\s+/g, ' ');
  })();
  確('他家の城に「囲まれている」の札は出ない', !/【囲まれている】/.test(文2));
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
