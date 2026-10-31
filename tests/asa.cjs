/* 数日がかりの城攻めの朝の布陣（GDD 9.3）。

   遊ぶ側の申し出は「強行は最大３日連続として、１日の終わりまで勝負がつかない場合は、兵糧攻めに
   移るか、２日目の強行に移るか選べるようにする。…２日目の強行を選んだら、攻勢側は最初の布陣
   位置に戻って最初から城攻めを行う。…２日目の前に守勢側もあらためて布陣を整えられ、例えば、
   残った城門の一つに兵を集中するなどの方策や、逆に城外に出て決戦を挑むこともできる」であった。
   夜の選び（兵糧攻めに移る・はじめの陣へ戻る）は tests/hiroi_kojo の六が見る。ここで確かめること。
     一、受け持ち … 朝の布陣を終えると、城方の隊は置いた所で受け持ちが決まる。門のすぐ内に
                    置けばその門を受け持ち（一つの門に幾隊でも）、城の外に置けば野に出る
     二、城の外   … 城の外に出た城方は寄せ手に当たり、弱れば近い門から城の内へ引き取って、
                    その門を受け持つ
     三、寄せの刻 … 翌日の日暮れは、一日の長さに寄せる道のりの刻を足した先 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'asa-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { buildCastleMap, layoutCastleField, setBattleMap, axisOf, fromUV, 門の輪, 寄せ手の陣, inLayer } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle, stepBattle, 夜を明かす } from "../src/battle/engine.js";\n'
+ 'export { FIELD, passable, fieldScale, setFieldKind } from "../src/battle/field.js";\n'
+ 'export { 持ち場を並べる, 朝の受け持ちを決める } from "../src/battle/defense.js";\n');
const out = path.join(ROOT, 'build', 'asa.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x5a5a;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 62, valor: 60, wit: 58, gov: 55,
  retinue: 500, retTrain: 70, unity: 60 });

/* 平城の清洲城を広い盤に据え、遊ぶ側を城方（P）、采配を寄せ手（E）にする */
function 仕立てる() {
  A.setFieldKind('街道');
  const m = A.layoutCastleField(A.buildCastleMap({ id: 'kiyosu', name: '清洲城', def: 55, local: 1200, localTrain: 70, najimi: 70, rost: null }),
    { 広く: true, 城id: 'kiyosu', 種: 0xdeadbeef });
  A.setBattleMap(m);
  const atk = [0, 1, 2, 3].map((k) => {
    const sp = A.寄せ手の陣(m, k, 4);
    const c = A.makeCorps('E', 将(k), 500, 1500, 75, 75, sp.x, sp.y, sp.f, '#B0483C');
    c.formation = '方陣'; A.placeSquads(c, true); c.auto = true;
    return c;
  });
  const 持 = A.持ち場を並べる(m).filter((p) => p.gate);
  const def = [0, 1, 2, 3].map((k) => {
    const sp = 持[Math.min(持.length - 1, k)];
    const c = A.makeCorps('P', 将(100 + k), 400, 500, 72, 72, sp.x, sp.y, sp.f, '#2F5D8C');
    c.holdGate = sp.gate; c.auto = true;
    return c;
  });
  const b = A.createBattle(def, atk, 'E');
  b.mode = 'castle'; b.map = m; b.phase = 'fight';
  return { m, b, atk, def };
}
/* 門の持ち場（門のすぐ内） */
const 持ち場 = (m, g) => {
  const a = A.axisOf(A.門の輪(m, g), g);
  return A.fromUV(m, a, g.off, a.half - 14);
};
const 置く = (c, x, y) => { c.x = x; c.y = y; c.tx = x; c.ty = y; A.placeSquads(c, true); };

console.log('■ 一、朝の布陣を終えると、置いた所で受け持ちが決まる');
{
  const { m, b, def } = 仕立てる();
  const 外門 = m.layers[0].gates.filter((g) => !g.broken);
  const g0 = 外門[0];
  const p0 = 持ち場(m, g0);
  /* 二隊を一つの門の内に集め、一隊を城の外（城山の南の際の野）に出す */
  置く(def[0], p0.x + 20, p0.y);
  置く(def[1], p0.x - 20, p0.y);
  let 外 = null;
  for (let d = 1.15; d < 2.2 && !外; d += 0.05) {
    const x = m.域.x, y = m.域.y + m.域.r * d;
    if (A.passable(x, y) && !A.inLayer(m, m.layers[0], x, y)) 外 = { x, y };
  }
  if (外) 置く(def[2], 外.x, 外.y);
  A.朝の受け持ちを決める(b, m, 'P');
  確('一つの門の内に置いた二隊は、どちらもその門を受け持つ', def[0].holdGate === g0 && def[1].holdGate === g0,
    `${def[0].holdGate ? def[0].holdGate.key : 'なし'}・${def[1].holdGate ? def[1].holdGate.key : 'なし'}`);
  確('城の外に置いた隊は野に出る（門を受け持たない）', !!外 && def[2].城外 === true && !def[2].holdGate,
    外 ? `城外 ${def[2].城外}` : '城の外に置ける所が見つからない');
  確('門の内に置いた隊は野に出ない', !def[0].城外 && !def[1].城外);
}

console.log('■ 二、城の外の城方は寄せ手に当たり、弱れば近い門から城へ引き取る');
{
  const { m, b, atk, def } = 仕立てる();
  let 外 = null;
  for (let d = 1.2; d < 2.2 && !外; d += 0.05) {
    const x = m.域.x, y = m.域.y + m.域.r * d;
    if (A.passable(x, y) && !A.inLayer(m, m.layers[0], x, y)) 外 = { x, y };
  }
  const c = def[3];
  置く(c, 外.x, 外.y);
  A.朝の受け持ちを決める(b, m, 'P');
  const 近い寄せ手 = () => Math.min(...atk.filter((o) => !o.dead && !o.destroyed).map((o) => Math.hypot(o.x - c.x, o.y - c.y)));
  const 初め = 近い寄せ手();
  let 噛んだ = false;
  for (let k = 0; k < 2000 && !b.result; k++) {          // 六十秒
    A.stepBattle(b, 0.03);
    if (k % 8 === 0) A.battleAI(b);
    if (c.squads.some((q) => q.engaged)) 噛んだ = true;
  }
  確('城の外の城方は寄せ手に向かう（槍を合わせるか、間が縮む）', 噛んだ || 近い寄せ手() < 初め - 100,
    `はじめ${Math.round(初め)}歩 → ${Math.round(近い寄せ手())}歩${噛んだ ? '・槍を合わせた' : ''}`);
}
{
  /* 弱った城の外の城方。寄せ手がまだ遠いうちに士気を二十五に落とし、門まで引き取るのを見る
     （斬り合いの最中に弱った隊は、引き取る間に崩れることがある。それは崩れの決まりに任せる） */
  const { m, b, def } = 仕立てる();
  let 外 = null;
  for (let d = 1.2; d < 2.2 && !外; d += 0.05) {
    const x = m.域.x, y = m.域.y + m.域.r * d;
    if (A.passable(x, y) && !A.inLayer(m, m.layers[0], x, y)) 外 = { x, y };
  }
  const c = def[3];
  置く(c, 外.x, 外.y);
  A.朝の受け持ちを決める(b, m, 'P');
  c.morale = 25;
  for (let k = 0; k < 24 && !c.引き取り; k++) { A.stepBattle(b, 0.03); if (k % 8 === 0) A.battleAI(b); }
  確('弱った城の外の城方は、城へ引き取る', !!c.引き取り && !c.城外, c.引き取り ? `${c.引き取り.門.key}へ` : '引き取らない');
  const 門 = c.引き取り ? c.引き取り.門 : null;
  for (let k = 0; k < 6000 && c.引き取り && !c.dead && !c.destroyed && !c.routed && !b.result; k++) {   // 百八十秒まで
    A.stepBattle(b, 0.03);
    if (k % 8 === 0) A.battleAI(b);
  }
  確('引き取った隊は門の内に入り、その門を受け持つ',
    !c.引き取り && !!門 && c.holdGate === 門 && A.inLayer(m, m.layers[0], c.x, c.y, 30),
    `${c.引き取り ? '引き取りの途中' : c.holdGate ? c.holdGate.key : 'なし'}${c.routed ? '・崩れた' : ''}`);
}

console.log('■ 三、翌日の日暮れは、寄せる道のりのぶんだけ先');
{
  /* 寄せ手は動かさない（日暮れまで城を落とさせない）。止まった戦の見切り（三分）より短い日にする */
  const { b, atk } = 仕立てる();
  for (const c of atk) { c.auto = false; c.order = '待機'; c.tx = c.x; c.ty = c.y; }
  b.日数 = 3; b.日 = 1; b.日の始め = 0; b.日の長さ = 100; b.寄せの刻 = 40; b.dusk = 140;
  for (let k = 0; k < 40000 && b.phase === 'fight'; k++) { A.stepBattle(b, 0.05); if (k % 6 === 0) A.battleAI(b); }
  if (b.phase === 'night') {
    const t0 = b.t;
    A.夜を明かす(b);
    確('二日目の日暮れは、一日の長さに寄せる道のりの刻を足した先', Math.abs(b.dusk - (t0 + 100 + 40)) < 1e-6,
      `${Math.round(b.dusk - t0)}秒先（一日の長さ100・寄せの刻40）`);
  } else 確('一日目の日暮れに夜の段へ移る', false, `${b.phase}・${b.result || ''}`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
