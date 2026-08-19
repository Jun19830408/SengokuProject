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
+ 'export { buildCastleMap, layoutCastleField, axisOf, fromUV } from "../src/battle/castleMap.js";\n'
+ 'export { battleAI, 岸, 隘路にかかる } from "../src/battle/ai.js";\n'
+ 'export { RIVER, hasRiver, terrainAt, riverShift, HILLS, FORESTS, WOODS, MARSH, VILLAGES } from "../src/battle/field.js";\n'
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
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
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
  /* 野を掃いて、何もない平地にする。

     もとは「川も森もない種」を決め打ちで選んでいた。ところが広い野には
     必ず地物を置くようにしたので、そんな種はもう無い。探しても見つからない。

     測りたいのは「良い地を歩くだけで隊形が崩れてしまわないか」である。
     悪路で乱れるのも、隘路で列を細めるのも、どちらも仕来りどおりであって、
     ここで測るものではない。地物を取り払ってから測る。 */
  A.setFieldSeed('s82', 't82');
  A.layoutField(9000, 2);
  A.HILLS.length = 0; A.FORESTS.length = 0; A.WOODS.length = 0;
  A.MARSH.length = 0; A.VILLAGES.length = 0;
  A.RIVER.top = 0; A.RIVER.bot = 0;
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

/* --------------------------- 城攻めで隊が震えないこと（GDD 8.2 / 9.3）

   城内は壁だらけである。かつては「遠くへ向かう途中」ならば毎瞬、壁から
   押し返す力を掛けていた。行き先へ引く力と押し返す力が押し合うので、
   隊は横へじりじりと流れ、その場に留まっていても左右に震えて見えた。

   震えは「一歩ごとの進む向きが逆へ折り返した回数」で測れる。
   整然と進むなら、折り返しはまばらにしか起きない。 */
{
  const 城 = { id: 'x', name: '試の城', def: 60, local: 600, localTrain: 70, najimi: 70, rost: null };
  const 図 = A.layoutCastleField(A.buildCastleMap(城));
  A.setBattleMap(図);
  const 外 = 図.layers[0];
  const 寄 = 外.gates.slice(0, 3).map((gt, i) => {
    const a = A.axisOf(外, gt);
    const p = A.fromUV(図, a, gt.off, a.half + 図.moat.band + 外.masu + 図.t + 96);
    return A.makeCorps('P', 将(i), 400, 900, 75, 75, p.x, p.y, Math.atan2(図.cy - p.y, 図.cx - p.x), '#2F5D8C');
  });
  const 持 = [];
  for (const l of 図.layers) for (const gt of l.gates) {
    const a = A.axisOf(l, gt);
    const p = A.fromUV(図, a, gt.off, a.half - 30);
    持.push({ x: p.x, y: p.y, f: Math.atan2(p.y - 図.cy, p.x - 図.cx) + Math.PI, gate: gt });
  }
  const 守 = 持.slice(0, 4).map((sp, i) => {
    const c = A.makeCorps('E', 将(100 + i), 300, 300, 70, 70, sp.x, sp.y, sp.f, '#B0483C');
    c.holdGate = sp.gate; return c;
  });
  const b = A.createBattle(寄, 守, 'P');
  b.mode = 'castle'; b.map = 図; b.dusk = 1080; b.phase = 'fight';
  for (const c of 寄) { c.formation = '方陣'; A.placeSquads(c, true); }

  const 前 = new Map(), 折返 = new Map(), 歩 = new Map();
  let 隊折返 = 0;
  const 隊前 = new Map(), 隊歩み = new Map();
  for (let k = 0; k < 1600; k++) {
    const 位 = new Map(), 隊位 = new Map();
    for (const c of [...寄, ...守]) { 隊位.set(c, { x: c.x, y: c.y }); for (const q of c.squads) 位.set(q, { x: q.x, y: q.y }); }
    A.stepBattle(b, 0.25);
    if (k % 4 === 0) A.battleAI(b);
    for (const c of [...寄, ...守]) {
      if (c.dead || c.destroyed) continue;
      for (const q of c.squads) {
        if (q.men <= 0) continue;
        const p0 = 位.get(q); if (!p0) continue;
        const vx = q.x - p0.x, vy = q.y - p0.y, d = Math.hypot(vx, vy);
        if (d < 0.02) continue;
        歩.set(q, (歩.get(q) || 0) + d);
        const pv = 前.get(q);
        if (pv && (pv.x * vx + pv.y * vy) < 0) 折返.set(q, (折返.get(q) || 0) + 1);
        前.set(q, { x: vx / d, y: vy / d });
      }
      const cp = 隊位.get(c);
      const cvx = c.x - cp.x, cvy = c.y - cp.y, cd = Math.hypot(cvx, cvy);
      if (cd >= 0.02) {
        隊歩み.set(c, (隊歩み.get(c) || 0) + cd);
        const pv = 隊前.get(c);
        if (pv && (pv.x * cvx + pv.y * cvy) < 0) 隊折返++;
        隊前.set(c, { x: cvx / cd, y: cvy / cd });
      }
    }
    if (b.result) break;
  }
  const 総折返 = [...折返.values()].reduce((a, x) => a + x, 0) || 1;
  const 総歩 = [...歩.values()].reduce((a, x) => a + x, 0);
  const 間隔 = 総歩 / 総折返;
  /* 隊の折り返しも、回数ではなく「何px歩くごとに一度か」で測る。
     回数で測っていたが、盤を広げたら道のりが伸び、当然のように増えた。
     広さに依らない尺度でなければ、盤を変えるたびに測り直すことになる。 */
  const 隊歩 = [...隊歩み.values()].reduce((a, x) => a + x, 0);
  const 隊間隔 = 隊歩 / Math.max(1, 隊折返);
  /* 一折り返しあたり何px歩けているか。震えていると数pxごとに折り返す。

     測る場所を二つ持っている。組（squad）と隊（corps）である。
     城の盤を広げ、山城に坂を入れたところ、組の測りは効きが鈍った。
     押し返しを毎瞬かける古い決まりで 43.6px、いまの決まりで 46.8px――
     ほとんど差がない。隊が壁際にいる時が減り、坂を登っている時が増えたためである。

     隊の測りは、いまも効いている。古い決まりで一折り返しあたり21.8px、
     いまの決まりで38.4px。震えを見るならこちらである。
     （隘路で長蛇に組み替えるようにしたので、堀を渡るときに隊が組み替わり、
       そのぶん折り返しが増えた。これは震えではなく、道理どおりの動きである。）
     組の測りは、ひどい震えを拾う下限としてだけ残す。 */
  console.log(`  ${間隔 >= 35 ? '○' : '★'} 組は震えずに進む　一折り返しあたり ${間隔.toFixed(1)}px（下限。押し返しを毎瞬かけても43.6pxで、ここは効きが鈍い）`);
  console.log(`  ${隊間隔 >= 33 ? '○' : '★'} 隊そのものが左右に流れない　一折り返しあたり ${隊間隔.toFixed(1)}px（毎瞬かけると21.8px）`);
  if (間隔 < 35) 咎.push(`城攻めで組が震える（一折り返しあたり ${間隔.toFixed(1)}px）`);
  if (隊間隔 < 33) 咎.push(`城攻めで隊が左右に流れる（一折り返しあたり ${隊間隔.toFixed(1)}px）`);
  A.setBattleMap(null);
}

/* ------------------------------ 川を避けて進むこと（GDD 8.1）

   川は足を三割にし、陣形を十四も削り、戦う力を七割に落とす。深みならなお悪い。
   川の中で当たれば、まず負ける。委任した隊が真っ直ぐ川へ踏み込んでいくのは、
   将の分別として有り得ない。橋か浅瀬を回るべきである。

   「川の中で過ごした時（組×瞬）の割」と「川の中で槍を合わせた割」で測る。
   零にはならない。渡らねば攻められぬ局面はあるし、半渡を撃たれることもある。 */
{
  Math.random = (() => { let z = 20260815 >>> 0;                 // 天候で測りがぶれるため
    return () => { z = (z + 0x6D2B79F5) | 0; let t = Math.imul(z ^ (z >>> 15), 1 | z);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  A.setBattleMap(null);
  let 川の野 = 0, 総 = 0, 中 = 0, 戦総 = 0, 戦中 = 0;
  for (let seed = 1; seed <= 24; seed++) {
    A.setFieldSeed(seed); A.layoutField(4200);
    if (!A.hasRiver()) continue;
    川の野++;
    const midx = A.FIELD.w / 2, 上 = A.FIELD.h * 0.10, 下 = A.FIELD.h * 0.90;
    const P = [], E = [];
    for (let i = 0; i < 3; i++) P.push(A.makeCorps('P', 将(i), 700, 700, 80, 80, midx - 200 + i * 200, 上, Math.PI / 2, '#2F5D8C'));
    for (let i = 0; i < 3; i++) E.push(A.makeCorps('E', 将(10 + i), 700, 700, 80, 80, midx - 200 + i * 200, 下, -Math.PI / 2, '#B0483C'));
    const b = A.createBattle(P, E, 'P');
    b.mode = 'field'; b.dusk = 1200; b.phase = 'fight';
    for (const c of [...P, ...E]) A.placeSquads(c, true);
    for (let k = 0; k < 2400; k++) {
      A.stepBattle(b, 0.25);
      if (k % 4 === 0) A.battleAI(b);
      for (const c of [...P, ...E]) {
        if (c.dead || c.destroyed) continue;
        for (const q of c.squads) {
          if (q.men <= 0) continue;
          const t = A.terrainAt(q.x, q.y), 水 = t === 'ford' || t === 'deep';
          総++; if (水) 中++;
          if (q.engaged) { 戦総++; if (水) 戦中++; }
        }
      }
      if (b.result) break;
    }
  }
  const 居 = 100 * 中 / Math.max(1, 総), 戦 = 100 * 戦中 / Math.max(1, 戦総);
  /* 拠りどころ（この九つの野で、川を避ける道理を入れたときと外したとき）。

       道理なし … 39.5% / 79.8%
       道理あり … 23.6% / 48.7%

     以前は 30.3% / 51.5% ＞ 21.9% / 36.2% と記していたが、これは退き口を直す前の
     数である。敗走する隊が「常に南へ」ではなく自陣の側へ逃げるようになったので、
     戦の運びそのものが変わり、値も動いた（tests/hikiguchi.cjs を参照）。

     大事なのは絶対の値ではなく、道理を外したときとの開きである。
     戦の運びが変われば数も動く。まず道理を外して測り直し、開きが残っているかを
     見ること。開きが失せていたら、そのときこそ壊れである。 */
  console.log(`  ${川の野 >= 8 ? '○' : '★'} 川のある野で測る　${川の野}／24`);
  console.log(`  ${居 <= 30 ? '○' : '★'} 川の中で過ごさない　${居.toFixed(1)}%（道理を外すと 39.5%）`);
  console.log(`  ${戦 <= 62 ? '○' : '★'} 川の中で槍を合わせない　${戦.toFixed(1)}%（道理を外すと 79.8%）`);
  if (川の野 < 8) 咎.push('川のある野が足りず、測れていない');
  if (居 > 30) 咎.push(`隊が川の中で過ごしすぎる（${居.toFixed(1)}%）`);
  if (戦 > 62) 咎.push(`川の中で槍を合わせすぎる（${戦.toFixed(1)}%）`);
}

/* ------------------------------ 隘路は縦陣で抜けること（GDD 8.3）

   橋を渡るとき、浅瀬を越すとき、森や丘の脇をすり抜けるとき、隊は横に広がった
   まま突っ込んでいた。翼が水に浸かり、木立に食い込み、足が鈍って隊列が崩れる。
   渡り場を選んだ甲斐がない。狭い所へ来れば列を細める。行軍の常である。

   あわせて、橋そのものの幅も検める。盤の幅の何割、として取っていたので、
   野を広げたら橋が一隊の二.五倍になった。隊がそのまま横に並んで渡れる橋は、
   もはや橋ではない。 */
{
  A.setBattleMap(null);
  let 種 = null;
  for (let i = 1; i < 60 && 種 === null; i++) {
    A.setFieldSeed('bridge' + i, 'x'); A.layoutField(9000, 6);
    if (A.hasRiver()) 種 = i;
  }
  const 橋幅 = A.RIVER.bridge[1] - A.RIVER.bridge[0];
  const 瀬幅 = A.RIVER.ford[1] - A.RIVER.ford[0];
  console.log(`  （野 ${A.FIELD.w}×${A.FIELD.h}／橋${Math.round(橋幅)}歩・浅瀬${Math.round(瀬幅)}歩／一隊の幅は約216歩）`);
  確('橋は一隊より狭い（隘路である）', 橋幅 < 216 * 0.9,
    `橋 ${Math.round(橋幅)}歩＝一隊の${(橋幅 / 216).toFixed(2)}倍`);
  確('浅瀬は橋より広いが、なお隘路である', 瀬幅 > 橋幅 && 瀬幅 < 216 * 2,
    `浅瀬 ${Math.round(瀬幅)}歩＝一隊の${(瀬幅 / 216).toFixed(2)}倍`);
  // 広い野でも橋が広がらないこと
  A.setFieldSeed('bridge' + 種, 'x'); A.layoutField(9000, 6);
  const 狭い野の橋 = A.RIVER.bridge[1] - A.RIVER.bridge[0];
  let 広い野の橋 = 狭い野の橋;
  for (let i = 1; i < 60; i++) {
    A.setFieldSeed('bridge' + i, 'x'); A.layoutField(40000, 20);
    if (A.hasRiver()) { 広い野の橋 = A.RIVER.bridge[1] - A.RIVER.bridge[0]; break; }
  }
  確('野を広げても、橋はさほど広がらない', 広い野の橋 < 狭い野の橋 * 2.2,
    `${Math.round(狭い野の橋)}歩 → ${Math.round(広い野の橋)}歩（野は${A.FIELD.w}歩）`);

  // 橋の上に置いた隊が、縦陣に組み替えること
  A.setFieldSeed('bridge' + 種, 'x'); A.layoutField(9000, 6); A.setBattleMap(null);
  const bx = (A.RIVER.bridge[0] + A.RIVER.bridge[1]) / 2;
  const by = (A.RIVER.top + A.RIVER.bot) / 2 + A.riverShift(bx);
  const c = A.makeCorps('P', 将(1), 700, 900, 80, 80, bx, by, -Math.PI / 2, '#2F5D8C');
  c.formation = '横陣'; A.placeSquads(c, true);
  確('橋の上は隘路と判ぜられる', A.隘路にかかる(c) === '橋', A.隘路にかかる(c) || 'かからない');
  // 抜けたと決めるまでには猶予がある（林の縁で陣形が行き来せぬように）
  const e = A.makeCorps('E', 将(9), 700, 900, 80, 80, bx, by - 700, Math.PI / 2, '#B0483C');
  const b2 = A.createBattle([c], [e], 'P');
  b2.mode = 'field'; b2.dusk = 9999; b2.phase = 'fight'; b2.face = 'S'; b2.myFar = false;
  A.placeSquads(c, true); A.placeSquads(e, true);
  c.auto = true;
  A.battleAI(b2);
  確('橋にかかれば縦陣に組み替える', c.formation === '長蛇', c.formation);
  確('元の陣形を覚えている', c.元の陣 === '横陣', c.元の陣 || 'なし');

  // 野へ出れば元へ戻ること
  c.x = bx; c.y = by + 620;
  A.placeSquads(c, true);
  確('野へ出れば隘路ではない', !A.隘路にかかる(c), A.隘路にかかる(c) || '');
  A.battleAI(b2);
  確('一度離れただけでは戻さない（縁で行き来しない）', c.formation === '長蛇', c.formation);
  for (let i = 0; i < 5; i++) A.battleAI(b2);
  確('開けた地が続けば元の陣形へ戻る', c.formation === '横陣', c.formation);

  // 槍を合わせている隊は組み替えない（側面を晒すため）
  c.x = bx; c.y = by; A.placeSquads(c, true);
  c.formation = '横陣'; c.元の陣 = null;
  for (const q of c.squads) q.engaged = true;
  A.battleAI(b2);
  確('槍を合わせている隊は、隘路でも組み替えない', c.formation === '横陣', c.formation);
  for (const q of c.squads) q.engaged = false;
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
