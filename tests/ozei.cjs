/* 大軍の辻褄（GDD 7.4 / 8.4 / 8.5）。

   遊ぶ側の申し出は三つであった。

     一　合戦で多数の軍が出ると、委任しても動かなかったり変な方向に向かう軍がある
     二　陣触れで大軍で攻めて連戦し続けていると、なぜか兵が増える
     三　大名で出陣して軍を解いたのに、本拠地に戻らず、最後に攻めていた城に入城する
         ことがあった。しかも、大名でなくなり、大名となる者がいなくなる

   いずれも「隊が多い・戦が続く」ときにだけ出る綻びであった。

   一の元は二つ。伝令の届かぬ隊（指揮圏の外）に issueOrder が何も渡さず、隊が
   布陣のときの「待機」のまま立ち尽くしていたこと。もう一つは、先客が二隊いる敵に
   法外な費えを置いて事実上除いていたため、近くの敵がみな塞がると、隊が野を横切って
   空いた敵を探しに出ていたことである。

   二の元は、盤の外の戦（着陣の始末・囲みの強攻・後詰・海戦・行き合い）が損害を
   「総勢」と「地の兵」からしか引かず、将の直属に触れなかったこと。地の兵が尽きた
   軍は総勢だけが減り、総勢を数え直す筋（城を委ねる等）が回ると元に戻る。

   三の元は、采配の差配（委ねる差配）が当主を除いていなかったこと。当主の禄高は
   御料であるから、身代の重い者を選べば必ず当主が選ばれる。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'ozei-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState } from "../src/core/state.js";\n'
+ 'export { setBattleMap } from "../src/battle/castleMap.js";\n'
+ 'export { FIELD, setFieldSeed, setFieldKind, layoutField, fieldScale } from "../src/battle/field.js";\n'
+ 'export { makeCorps, issueOrder, outOfCommand, commandPost, commandRange } from "../src/battle/corps.js";\n'
+ 'export { createBattle, stepBattle } from "../src/battle/engine.js";\n'
+ 'export { 狙う敵を選ぶ, 先客たち, 噛みの間 } from "../src/battle/ai.js";\n'
+ 'export { newRoster, 軍の損を分ける } from "../src/core/roster.js";\n'
+ 'export { resolveOffscreen, 委ねる差配, 城を委ねる, 軍を解く } from "../src/govern/war.js";\n'
+ 'export { 軍の道 } from "../src/core/state.js";\n');
const out = path.join(ROOT, 'build', 'ozei.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

let 種 = 0x2B17;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const 賽を据える = (n) => { 種 = n; };

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* 片側 n 隊の横陣を向かい合わせに立てる。みな委任（auto）である。 */
const 盤を組む = (n, 兵 = 800) => {
  A.setBattleMap(null);
  A.setFieldSeed('nagoya', 'kiyosu');
  A.setFieldKind('街道');
  A.layoutField(兵 * n * 2, n);
  const 将 = (nm, i) => ({ id: 'g' + i, name: nm, lead: 62, valor: 60, wit: 52, gov: 50, retinue: 0, retTrain: 66 });
  const P = [], E = [];
  const cx = A.FIELD.w / 2, cy = A.FIELD.h / 2;
  const 幅 = Math.min(A.FIELD.w * 0.8, n * 260);
  for (let i = 0; i < n; i++) {
    const px = cx + ((i + 0.5) / n - 0.5) * 幅;
    P.push(A.makeCorps('P', 将('味方' + (i + 1), i), 0, 兵, 70, 68, px, cy + 620, -Math.PI / 2, '#2F5D8C'));
    E.push(A.makeCorps('E', 将('敵' + (i + 1), 100 + i), 0, 兵, 70, 66, px, cy - 620, Math.PI / 2, '#B0483C'));
  }
  const b = A.createBattle(P, E, 'P');
  b.phase = 'fight'; b.mode = 'field';
  for (const c of b.corps) c.auto = true;
  return b;
};

console.log('── 一　隊が多くても、委ねた隊は立ち尽くさない');
{
  for (const n of [16, 32]) {
    賽を据える(0x2B17);
    const b = 盤を組む(n);
    const 初 = new Map(b.corps.map((c) => [c.id, { x: c.x, y: c.y }]));
    for (let k = 0; k < 150; k++) A.stepBattle(b, 0.2);
    let 不動 = 0, 圏外 = 0, 検 = 0;
    const 名 = [];
    for (const c of b.corps) {
      if (c.dead || c.destroyed) continue;
      const s0 = 初.get(c.id);
      if (!s0) continue;                                 // 戦中に割いた分遣は数えない
      検++;
      if (A.outOfCommand(b, c)) 圏外++;
      const 動 = Math.hypot(c.x - s0.x, c.y - s0.y);
      if (動 < 40 && !(c.squads || []).some((q) => q.engaged)) { 不動++; 名.push(c.gen.name); }
    }
    確(`片側${n}隊でも、伝令の届かぬ隊が出る（検めが空でない）`, 圏外 > 0, `${検}隊のうち圏外 ${圏外}`);
    確(`片側${n}隊で、動かぬまま立ち尽くす隊がない`, 不動 === 0,
      不動 ? `${不動}隊（${名.slice(0, 4).join('・')}）` : `${検}隊すべて動いた`);
  }
}

console.log('\n── 一の二　近い敵を措いて、野を横切らない');
{
  /* 目の前に敵がいるが、すでに味方二隊が槍を合わせている。遠くに空いた敵がいる。
     元は「先客二隊の敵は法外」としていたので、どれほど遠くとも空いた敵を選んだ。 */
  賽を据える(0x51A3);
  const b = 盤を組む(4);
  const 倍 = A.fieldScale();
  const 我 = b.corps.find((c) => c.side === 'P');
  const 近敵 = b.corps.find((c) => c.side === 'E');
  const 遠敵 = b.corps.filter((c) => c.side === 'E')[1];
  我.x = 1000; 我.y = 1000;
  近敵.x = 1000 + 120 * 倍; 近敵.y = 1000;
  遠敵.x = 1000 + 2600 * 倍; 遠敵.y = 1000;
  /* 近い敵に味方を二隊、槍を合わせた形で付ける */
  const 先客 = b.corps.filter((c) => c.side === 'P' && c !== 我).slice(0, 2);
  for (const x of 先客) {
    x.x = 近敵.x + 20; x.y = 近敵.y + 20;
    for (const q of x.squads) q.engaged = true;
  }
  const foes = [近敵, 遠敵];
  確('先客が二隊いることを検めた', A.先客たち(b.corps, 我, 近敵).length === 2,
    `${A.先客たち(b.corps, 我, 近敵).length}隊`);
  const 的 = A.狙う敵を選ぶ(b.corps, 我, foes);
  確('塞がっていても、手近な敵に加わる（野を横切らない）', 的 === 近敵,
    的 === 近敵 ? `近い敵（${Math.round(120 * 倍)}歩）を選んだ`
      : `${Math.round(Math.hypot(的.x - 我.x, 的.y - 我.y))}歩先の敵を選んだ`);
  /* 遠くても手近なうちに空いた敵がいるなら、そちらへ回るのは元のままである */
  遠敵.x = 1000 + 300 * 倍;
  確('手近なうちに空いた敵がいれば、そちらへ回る', A.狙う敵を選ぶ(b.corps, 我, foes) === 遠敵);
}

console.log('\n── 二　損は地の兵と直属へ分ける（連戦で兵が増えない）');
{
  const s = A.initState('oda');
  const 将ら = s.generals.filter((g) => g.faction === 'oda' && !g.captive).slice(0, 4);
  for (const g of 将ら) { g.at = null; g.retinue = 300; }
  const a = { id: 'A1', faction: 'oda', from: s.factions.oda.本拠, gens: 将ら.map((g) => g.id),
    local: 1000, localTrain: 70, rost: A.newRoster(1000, 'arm-A1'),
    men: 1000 + 1200, at: null, path: [], prog: 0, food: 9000 };
  s.armies.push(a);
  const 直 = () => a.gens.reduce((t, id) => t + s.generals.find((g) => g.id === id).retinue, 0);
  確('はじめは辻褄が合っている', a.men === a.local + 直(), `${a.men} ＝ ${a.local}＋${直()}`);
  A.軍の損を分ける(s, a, 440);
  確('損は地の兵と直属の双方から引く', a.local < 1000 && 直() < 1200,
    `地 1000→${a.local}　直属 1200→${直()}`);
  確('引いたぶんの辻褄が合う', a.men === a.local + 直() && a.men === 2200 - 440,
    `総勢 ${a.men}（＝${a.local}＋${直()}）`);
  /* 地の兵を使い果たしてから、なお討たれる――元はここで総勢だけが減っていた */
  A.軍の損を分ける(s, a, a.local + 直() - 500);          // 残り五百まで削る
  確('地の兵が尽きても辻褄は崩れない', a.men === a.local + 直(),
    `総勢 ${a.men}　地 ${a.local}　直属 ${直()}`);
  const 前 = a.men;
  a.men = a.local + 直();                                // 総勢を数え直す筋（城を委ねる等）
  確('数え直しても兵は増えない', a.men === 前, `${前} → ${a.men}`);
  確('名簿も地の兵に合う', Math.abs(a.rost.reduce((t, q) => t + q.m, 0) - a.local) <= 2,
    `名簿 ${a.rost.reduce((t, q) => t + q.m, 0)}／地 ${a.local}`);
}

console.log('\n── 二の二　連戦しても、戦のたびに兵は減る');
{
  賽を据える(0x1234);
  let s = A.initState('oda');
  const 本拠 = s.castles.find((c) => c.id === s.factions.oda.本拠);
  const 将ら = s.generals.filter((g) => g.faction === 'oda' && g.at === 本拠.id && !g.captive && !g.lord);
  const 兵 = 3000;
  本拠.local = Math.max(本拠.local, 兵 + 500) - 兵;
  const a = { id: 'A1', faction: 'oda', from: 本拠.id, gens: 将ら.map((g) => g.id),
    local: 兵, localTrain: 本拠.localTrain, rost: A.newRoster(兵, 'arm-A1'),
    men: 兵 + 将ら.reduce((t, g) => t + g.retinue, 0),
    at: 本拠.id, path: [本拠.id], prog: 0, food: 120000, target: null,
    出どころ: [{ from: 本拠.id, local: 兵, gens: 将ら.map((g) => g.id) }] };
  s.armies.push(a);
  for (const g of 将ら) g.at = null;
  let 増えた = 0, 崩れ = 0, 戦 = 0;
  for (let k = 0; k < 10; k++) {
    const cur = s.armies.find((x) => x.id === 'A1');
    if (!cur) break;
    const 的 = s.castles.filter((c) => c.faction !== 'oda')
      .map((c) => ({ c, p: A.軍の道(s, 'oda', cur.at, c.id) }))
      .filter((v) => v.p).sort((x, y) => x.p.length - y.p.length)[0];
    if (!的) break;
    const 前 = cur.men;
    cur.at = 的.c.id; cur.path = [的.c.id]; cur.prog = 0; cur.target = 的.c.id;
    cur.sieging = false; cur.food = Math.max(cur.food, 60000);
    s.pendingArrivals = ['A1'];
    s = A.resolveOffscreen(s, 'A1', 的.c.id);
    const 待 = (s.委ねる待ち || []).find((w) => w.armyId === 'A1');
    if (待) {
      A.城を委ねる(s, 待.castleId, 'A1', { 城主: null, 所属: [], 兵: 0 });
      s.委ねる待ち = s.委ねる待ち.filter((w) => w.armyId !== 'A1');
    }
    const 後 = s.armies.find((x) => x.id === 'A1');
    if (!後) break;
    戦++;
    const 直 = 後.gens.reduce((t, id) => {
      const g = s.generals.find((x) => x.id === id); return t + (g ? g.retinue : 0); }, 0);
    if (後.men > 前 + 1) 増えた++;
    if (Math.abs(後.men - (後.local + 直)) > 1) 崩れ++;
  }
  確('連戦の場が組めた', 戦 >= 5, `${戦}戦`);
  確('どの戦でも兵は増えない', 増えた === 0, `増えた戦 ${増えた}`);
  確('総勢と「地の兵＋直属」が食い違わない', 崩れ === 0, `食い違い ${崩れ}件`);
}

console.log('\n── 三　采配は当主を城主に据えない');
{
  const s = A.initState('oda');
  const 当主 = s.generals.find((g) => g.faction === 'oda' && g.lord && !g.captive);
  const 供 = s.generals.filter((g) => g.faction === 'oda' && !g.lord && !g.captive).slice(0, 3);
  const 的 = s.castles.find((c) => c.faction !== 'oda');
  const a = { id: 'A1', faction: 'oda', from: s.factions.oda.本拠,
    gens: [当主.id, ...供.map((g) => g.id)], local: 2000, localTrain: 70,
    rost: A.newRoster(2000, 'arm-A1'), men: 2000, at: 的.id, path: [的.id], prog: 0, food: 9000 };
  s.armies.push(a);
  for (const g of [当主, ...供]) g.at = null;
  const 差 = A.委ねる差配(s, 的, a);
  確('軍に当主が乗っている', a.gens.includes(当主.id), 当主.name);
  確('差配は当主を城主に選ばない', 差.城主 !== 当主.id,
    差.城主 ? `${(s.generals.find((g) => g.id === 差.城主) || {}).name}を選んだ` : '誰も選ばなかった');
  確('当主は所属にも置かれない', !(差.所属 || []).includes(当主.id));
}

console.log('\n── 三の二　軍を解けば、当主は本拠へ帰る');
{
  const s = A.initState('oda');
  const 本拠 = s.castles.find((c) => c.id === s.factions.oda.本拠);
  const 当主 = s.generals.find((g) => g.faction === 'oda' && g.lord && !g.captive);
  const 的 = s.castles.find((c) => c.faction !== 'oda');
  当主.at = null;
  const a = { id: 'A1', faction: 'oda', from: 本拠.id, gens: [当主.id], local: 1500,
    localTrain: 70, rost: A.newRoster(1500, 'arm-A1'), men: 1500 + 当主.retinue,
    at: 的.id, path: [的.id], prog: 0, food: 9000, 在陣: 的.id,
    出どころ: [{ from: 本拠.id, local: 1500, gens: [当主.id] }] };
  s.armies.push(a);
  A.軍を解く(s, a);
  確('当主は本拠へ帰る', 当主.at === 本拠.id,
    `${(s.castles.find((c) => c.id === 当主.at) || {}).name || 'どこにもいない'}（本拠 ${本拠.name}）`);
  確('当主の座は残る', !!s.generals.find((g) => g.faction === 'oda' && g.lord && !g.captive));
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
