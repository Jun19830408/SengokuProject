/* 城の守り手の動き（battle/ai.js 守り手の動き・engine.js 夜を明かす）。

   遊ぶ側の申し出は「門が破られたあともしばらくは門の前で戦い、士気や兵数が2割を切ったり
   した場合により内側に向かうようにするのはどうでしょうか？よりリアルな守勢側の動きが出来ると
   いい」「3倍くらいあって初めて落とせる確率が60%くらいになるようにしたい」であった。測ると、
   寄せ手は一つの門に集まって攻め、城兵の半ばは寄せ手の来ない門で遊んだまま、通り道の隊が
   一隊ずつ討たれていた。持ち場を移る隊は内の輪の塀に突き当たって動けなかった。ここで確かめること。
     一、加勢       … 寄せ手の来ない門の将の隊は、寄せ手の群がる同じ輪の門へ回る。守備隊は動かない
     二、破れ口     … 門が破れても、その門の隊は門の内で戦う。士気が二十を切れば内の輪へ引き取る
     三、輪の固め直し … 同じ輪のどこかが破れたら、ほかの門の隊は内の輪の門へ引き取る（塀に貼りつかず、
                      内の輪に入る）
     四、夜の組み直し … 夜のうちに、破れた輪の門を受け持っていた采配の城方は、寄せ手が次に寄せる輪の
                      門に就く（破れ口に向いた門から二隊ずつ）
     五、本丸まで   … 城方は、本丸の門が破れるまで「兵が五分の一を切った」で退かない */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'mamorite-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { buildCastleMap, layoutCastleField, setBattleMap, 寄せ手の陣, inLayer, gatePos, 門の輪 } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen, corpsMax } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle, stepBattle, 夜を明かす } from "../src/battle/engine.js";\n'
+ 'export { FIELD, fieldScale, setFieldKind } from "../src/battle/field.js";\n'
+ 'export { 持ち場を並べる } from "../src/battle/defense.js";\n');
const out = path.join(ROOT, 'build', 'mamorite.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x7a11;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const 将 = (i, 器 = 60) => ({ id: `g${i}`, name: `将${i}`, lead: 器 + 2, valor: 器, wit: 58, gov: 55, retinue: 500, retTrain: 70, unity: 60 });

/* 清洲城（輪三重・門六つ）を広い盤に据え、遊ぶ側を寄せ手（P、委ねる）、采配を城方（E）にする。
   城方は外の輪の三つの門に将の隊、内の門に守備隊を置く */
function 仕立てる(寄せ手の数 = 4) {
  A.setFieldKind('街道');
  const m = A.layoutCastleField(A.buildCastleMap({ id: 'kiyosu', name: '清洲城', def: 55, local: 1200, localTrain: 70, najimi: 70, rost: null }),
    { 広く: true, 城id: 'kiyosu', 種: 0xdeadbeef });
  A.setBattleMap(m);
  const atk = [...Array(寄せ手の数).keys()].map((k) => {
    const sp = A.寄せ手の陣(m, k, 寄せ手の数);
    const c = A.makeCorps('P', 将(k), 500, 1500, 75, 75, sp.x, sp.y, sp.f, '#2F5D8C');
    c.formation = '方陣'; A.placeSquads(c, true); c.auto = true;
    return c;
  });
  const 持 = A.持ち場を並べる(m).filter((p) => p.gate);
  const def = 持.map((p, k) => {
    const 将の隊 = p.gate.layer === 0;
    const c = A.makeCorps('E', 将の隊 ? 将(100 + k) : { id: `gar${k}`, name: '守備隊', lead: 50, valor: 30, wit: 28, gov: 30, retinue: 0, retTrain: 58, unity: 45 },
      将の隊 ? 500 : 0, 将の隊 ? 600 : 250, 72, 72, p.x, p.y, p.f, '#B0483C');
    c.holdGate = p.gate; if (!将の隊) c.守備隊 = true;
    return c;
  });
  const b = A.createBattle(atk, def, 'P');
  b.mode = 'castle'; b.map = m; b.phase = 'fight';
  return { m, b, atk, def };
}
const 進める = (b, 秒) => { for (let t = 0; t < 秒 && b.phase === 'fight'; t += 0.03) A.stepBattle(b, 0.03); };
const 外の門 = (m, 名) => m.gates.find((g) => g.layer === 0 && g.key.includes(名));

console.log('■ 一、加勢');
{
  const { m, b, atk, def } = 仕立てる();
  const 大手 = 外の門(m, '大手');
  /* 寄せ手を大手門の前に集める（ほかの門には寄せない） */
  const gp = A.gatePos(m, A.門の輪(m, 大手), 大手);
  for (const [k, c] of atk.entries()) { c.x = gp.x + (k - 1.5) * 60; c.y = gp.y + 260; c.tx = c.x; c.ty = c.y; A.placeSquads(c, true); c.auto = false; c.order = '待機'; }
  進める(b, 20);
  const 加勢した = def.filter((c) => !c.守備隊 && c.holdGate === 大手);
  const 動かぬ守備隊 = def.filter((c) => c.守備隊).every((c) => c.holdGate && c.holdGate.layer > 0);
  確('寄せ手の来ない外の門の将の隊は、寄せ手の群がる大手門へ加勢に回る', 加勢した.length >= 2,
    `大手門を受け持つ将の隊 ${加勢した.length}隊（${def.filter((c) => !c.守備隊).map((c) => c.holdGate ? c.holdGate.key : '-').join('・')}）`);
  確('守備隊は持ち場を離れない', 動かぬ守備隊);
}

console.log('■ 二、破れ口で戦い、弱れば内の輪へ');
{
  const { m, b, atk, def } = 仕立てる();
  const 大手 = 外の門(m, '大手');
  大手.hp = 0; 大手.broken = true;
  const 守 = def.find((c) => c.holdGate === 大手);
  for (const c of atk) { c.auto = false; c.order = '待機'; }
  進める(b, 6);
  確('門が破れても、受け持っていた隊は持ち場に残る（内の輪へ走らない）', 守.holdGate === 大手 && !守.引き取り,
    `持ち場 ${守.holdGate ? 守.holdGate.key : 'なし'}`);
  守.morale = 15;
  進める(b, 2);
  const 内へ = (守.引き取り && 守.引き取り.次 && 守.引き取り.次.layer > 0) || (守.holdGate && 守.holdGate.layer > 0);
  確('士気が二十を切れば、内の輪へ引き取る', 内へ, `持ち場 ${守.holdGate ? 守.holdGate.key : 'なし'}${守.引き取り ? '（引き取りの途中）' : ''}`);
}

console.log('■ 三、輪の固め直し');
{
  const { m, b, atk, def } = 仕立てる();
  const 大手 = 外の門(m, '大手');
  大手.hp = 0; 大手.broken = true;
  for (const c of atk) { c.auto = false; c.order = '待機'; }
  const ほか = def.filter((c) => c.holdGate && c.holdGate.layer === 0 && c.holdGate !== 大手);
  進める(b, 120);
  const 二の輪 = A.門の輪(m, m.gates.find((g) => g.layer === 1));
  const 入った = ほか.filter((c) => c.holdGate && c.holdGate.layer >= 1 && A.inLayer(m, 二の輪, c.x, c.y));
  確('同じ輪の門が破れたら、ほかの門の隊は内の輪の門を固めに回り、内の輪に入る', 入った.length === ほか.length,
    `${ほか.length}隊のうち${入った.length}隊（${ほか.map((c) => `${c.holdGate ? c.holdGate.key : '-'}${A.inLayer(m, 二の輪, c.x, c.y) ? '・内' : '・外'}`).join('／')}）`);
}

console.log('■ 四、夜の組み直し');
{
  const { m, b, atk, def } = 仕立てる();
  const 大手 = 外の門(m, '大手');
  大手.hp = 0; 大手.broken = true;
  b.日数 = 3; b.日 = 1; b.phase = 'night'; b.夜 = { 日: 1 };
  A.夜を明かす(b);
  const 将の隊 = def.filter((c) => !c.守備隊);
  確('夜のうちに、破れた輪の門を受け持っていた将の隊は、内の輪の門に就く',
    将の隊.every((c) => c.holdGate && c.holdGate.layer >= 1 && !c.holdGate.broken),
    将の隊.map((c) => (c.holdGate ? c.holdGate.key : '-')).join('・'));
  const 二の輪 = A.門の輪(m, m.gates.find((g) => g.layer === 1));
  確('朝には持ち場（内の輪の内）に立っている', 将の隊.every((c) => A.inLayer(m, 二の輪, c.x, c.y)));
}

console.log('■ 五、城方は本丸の門が破れるまで退かない');
{
  const { m, b, atk, def } = 仕立てる();
  for (const c of atk) { c.auto = false; c.order = '待機'; }
  for (const c of def) for (const q of c.squads) q.men = Math.max(1, Math.round(q.men * 0.15));
  進める(b, 5);
  確('城方の兵が五分の一を切っても、本丸の門が保つうちは退かない', !b.result, `${b.result || '続く'}`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
