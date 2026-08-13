// 進軍中に隊形が保たれるかを見る試験。
//
// 組は自分の兵科の速さでしか歩けず、隊そのものは兵科の平均で進んでいた。
// 槍三十四・鉄砲三十であれば平均は三十六ほどになるから、鉄砲は隊についていけない。
// 一度離されたら二度と追いつけず、進むほど隊が伸びて崩れ、崩れたまま戦に入っていた。
//
//   ・隊は、いちばん遅い兵科の足に合わせて進む（行軍とは遅い者に合わせて歩くこと）
//   ・持ち場から遅れた組は、追いつくぶんだけ足を速められる
//
// 組み打ちが始まれば隊が広がるのは当たり前なので、そこは縛らない。
// ここで測るのは、敵に触れる前の行軍のあいだだけである。
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'keiretsu-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { layoutField, setFieldSeed, FIELD } from "../src/battle/field.js";\n'
+ 'export { makeCorps, placeSquads, issueOrder } from "../src/battle/corps.js";\n'
+ 'export { createBattle, stepBattle } from "../src/battle/engine.js";\n'
+ 'export { setBattleMap } from "../src/battle/castleMap.js";\n');
const out = path.join(ROOT, 'build', 'keiretsu.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

// 賽の目を固定する（同じ行軍を何度でも繰り返せるように）
let 種 = 0x51234;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const 咎 = [];
const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 62, valor: 60, wit: 55, gov: 55, retinue: 400, retTrain: 70, unity: 60 });
const 隔たり = (c) => {
  const live = c.squads.filter((q) => q.men > 0);
  if (!live.length) return 0;
  return live.reduce((a, q) => a + Math.hypot(q.x - (c.x + q.slotX), q.y - (c.y + q.slotY)), 0) / live.length;
};

// 陣形ごとに、敵に触れぬ距離を歩かせて隔たりを測る
for (const 陣 of ['横陣', '魚鱗', '鶴翼', '方陣']) {
  A.setBattleMap(null);
  /* 川も森も湿地もない平地を選ぶ。
     悪路で隊形が乱れるのは仕来りどおりなので、ここでは測らない。
     測りたいのは「良い地を歩くだけで崩れてしまわないか」である。 */
  A.setFieldSeed('s82', 't82');
  A.layoutField(9000);
  const mk = (side, i, x, y, f) => A.makeCorps(side, 将(i), 400, 1400, 70, 70, x, y, f,
    side === 'P' ? '#2F5D8C' : '#B0483C');
  const P = [0, 1, 2].map((i) => mk('P', i, A.FIELD.w / 2 + (i - 1) * 190, A.FIELD.h * 0.88, -Math.PI / 2));
  const E = [0, 1, 2].map((i) => mk('E', i + 10, A.FIELD.w * 0.05 + (i - 1) * 60, A.FIELD.h * 0.02, Math.PI / 2));
  const b = A.createBattle(P, E, 'P');
  b.phase = 'fight';
  for (const c of [...P, ...E]) { c.formation = 陣; A.placeSquads(c, true); }
  // 敵に触れぬところまで歩かせる（触れれば隊が広がるのは当たり前なので測らない）
  for (const c of P) A.issueOrder(b, c, { order: '移動', tx: c.x, ty: A.FIELD.h * 0.45 });
  for (const c of E) A.issueOrder(b, c, { order: '待機', tx: c.x, ty: c.y });

  /* 敵に触れるまでの、純粋な行軍のあいだだけを測る。
     組み打ちが始まれば隊が広がるのは当たり前で、そこを縛っては戦にならない。 */
  const 初めの兵 = P.reduce((a, c) => a + c.squads.reduce((t, q) => t + q.men, 0), 0);
  let 最悪 = 0, 歩いた = 0;
  for (let k = 0; k < 160; k++) {
    A.stepBattle(b, 0.25);
    const 今の兵 = P.reduce((a, c) => a + c.squads.reduce((t, q) => t + q.men, 0), 0);
    if (今の兵 < 初めの兵 || [...P, ...E].some((c) => c.squads.some((q) => q.engaged))) break;
    歩いた = b.t;
    const d = P.filter((c) => !c.routed).reduce((a, c) => a + 隔たり(c), 0) / Math.max(1, P.length);
    if (d > 最悪) 最悪 = d;
  }
  /* 隊の幅はおよそ190px。良い地を歩くあいだの隔たりが、その一割（19px）を
     超えるようでは「崩れたまま進んでいる」ことになる。
     直す前は、鉄砲（足30）が隊の平均（36ほど）についていけず、
     十秒で127pxまで置き去りにされていた。 */
  const 良し = 最悪 <= 19 && 歩いた >= 8;
  console.log(`  ${良し ? '○' : '★'} ${陣}　行軍${Math.round(歩いた)}秒のあいだ、持ち場からの隔たり 最大 ${最悪.toFixed(1)}px`);
  if (歩いた < 8) 咎.push(`${陣}で行軍を測れなかった（${Math.round(歩いた)}秒で接敵）`);
  else if (最悪 > 19) 咎.push(`${陣}の行軍で隊形が崩れた（最大 ${最悪.toFixed(1)}px）`);
}

/* 組み打ちが始まれば広がってよい。縛りすぎて戦にならぬのでは困る。
   前へ出させて、隊が敵と噛み合うところまで進むことを確かめる。 */
{
  A.setBattleMap(null);
  A.setFieldSeed('a', 'b');
  A.layoutField(9000);
  const mk = (side, i, x, y, f) => A.makeCorps(side, 将(i), 400, 1400, 70, 70, x, y, f,
    side === 'P' ? '#2F5D8C' : '#B0483C');
  const P = [0, 1].map((i) => mk('P', i, A.FIELD.w / 2 + (i - 0.5) * 190, A.FIELD.h * 0.72, -Math.PI / 2));
  const E = [0, 1].map((i) => mk('E', i + 10, A.FIELD.w / 2 + (i - 0.5) * 190, A.FIELD.h * 0.28, Math.PI / 2));
  const b = A.createBattle(P, E, 'P');
  b.phase = 'fight';
  for (const c of [...P, ...E]) { c.formation = '横陣'; A.placeSquads(c, true); }
  for (const c of P) A.issueOrder(b, c, { order: '前進', tx: c.x, ty: A.FIELD.h * 0.28 });
  for (const c of E) A.issueOrder(b, c, { order: '前進', tx: c.x, ty: A.FIELD.h * 0.72 });
  let 噛んだ = false;
  for (let k = 0; k < 900 && !噛んだ; k++) {
    A.stepBattle(b, 0.25);
    噛んだ = [...P, ...E].some((c) => c.squads.some((q) => q.engaged));
  }
  console.log(`  ${噛んだ ? '○' : '★'} 前進すれば敵と噛み合う（足並みを揃えても戦になる）　刻 ${Math.round(b.t)}秒`);
  if (!噛んだ) 咎.push('足並みを揃えたせいで敵と噛み合わなくなった');
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
