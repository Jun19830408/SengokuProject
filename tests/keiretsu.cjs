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
+ 'export { battleAI, 岸 } from "../src/battle/ai.js";\n'
+ 'export { RIVER, hasRiver, terrainAt, riverShift, HILLS, FORESTS, WOODS, MARSH, VILLAGES, 踏み込んだ地, 隊の地, 踏み場 } from "../src/battle/field.js";\n'
+ 'export { createBattle, stepBattle } from "../src/battle/engine.js";\n'
+ 'export { setBattleMap, buildNav } from "../src/battle/castleMap.js";\n');
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

   震えは「一歩ごとの進む向きが逆へ折り返した回数」で測る。整然と進むなら
   折り返しはまばらにしか起きないので、一折り返しあたりに歩いた距離で見る。

   一つの城で測っていたが、それでは戦の転がり方に振り回される。同じ決まりの
   まま曲輪の寄せを変えるだけで、二十六歩とも六十一歩とも出た。
   八つの城を三つの賽で攻め、平均で見る。こうすると数字が落ち着く。

     いまの決まり（貼りついたときだけ押し返す） … 八十〜百八歩
     古い決まり（毎瞬押し返す）                 … 十二歩前後

   縄張りを入れて曲輪を隅へ寄せると、帯が痩せるぶん、わずかに折り返しが増える
   （九十七歩→八十歩）。これは壁ぎわを回る道が増えたためで、震えではない。 */
{
  const 将2 = (i) => ({ id: `h${i}`, name: `武将${i}`, lead: 62, valor: 60, wit: 55, gov: 55, retinue: 400, retTrain: 70, unity: 60 });
  const 一戦 = (id, def) => {
    const 図 = A.buildCastleMap({ id, name: `${id}城`, def, local: 600, localTrain: 70, najimi: 70, rost: null });
    A.layoutCastleField(図); A.setBattleMap(図);
    const 外 = 図.layers[0];
    const 寄 = 外.gates.slice(0, 3).map((gt, i) => {
      const a = A.axisOf(外, gt);
      const p = A.fromUV(図, a, gt.off, a.half + 図.moat.band + 外.masu + 図.t + 96);
      return A.makeCorps('P', 将2(i), 400, 900, 75, 75, p.x, p.y, Math.atan2(図.cy - p.y, 図.cx - p.x), '#2F5D8C');
    });
    const 持 = [];
    for (const l of 図.layers) for (const gt of l.gates) {
      const a = A.axisOf(l, gt), p = A.fromUV(図, a, gt.off, a.half - 30);
      持.push({ x: p.x, y: p.y, f: Math.atan2(p.y - 図.cy, p.x - 図.cx) + Math.PI, gate: gt });
    }
    const 守 = 持.slice(0, 4).map((sp, i) => {
      const c = A.makeCorps('E', 将2(100 + i), 300, 300, 70, 70, sp.x, sp.y, sp.f, '#B0483C');
      c.holdGate = sp.gate; return c;
    });
    const b = A.createBattle(寄, 守, 'P');
    b.mode = 'castle'; b.map = 図; b.dusk = 1080; b.phase = 'fight';
    for (const c of 寄) { c.formation = '方陣'; A.placeSquads(c, true); }
    let 折 = 0, 歩 = 0, 組折 = 0, 組歩 = 0;
    const 前 = new Map(), 組前 = new Map();
    for (let k = 0; k < 1400; k++) {
      const 位 = new Map(), 組位 = new Map();
      for (const c of [...寄, ...守]) {
        位.set(c, { x: c.x, y: c.y });
        for (const q of c.squads) 組位.set(q, { x: q.x, y: q.y });
      }
      A.stepBattle(b, 0.25);
      if (k % 4 === 0) A.battleAI(b);
      for (const c of [...寄, ...守]) {
        if (c.dead || c.destroyed) continue;
        const p0 = 位.get(c), vx = c.x - p0.x, vy = c.y - p0.y, d = Math.hypot(vx, vy);
        if (d >= 0.02) {
          歩 += d;
          const pv = 前.get(c);
          if (pv && pv.x * vx + pv.y * vy < 0) 折++;
          前.set(c, { x: vx / d, y: vy / d });
        }
        for (const q of c.squads) {
          if (q.men <= 0) continue;
          const r0 = 組位.get(q); if (!r0) continue;
          const ux = q.x - r0.x, uy = q.y - r0.y, e = Math.hypot(ux, uy);
          if (e < 0.02) continue;
          組歩 += e;
          const pu = 組前.get(q);
          if (pu && pu.x * ux + pu.y * uy < 0) 組折++;
          組前.set(q, { x: ux / e, y: uy / e });
        }
      }
      if (b.result) break;
    }
    return { 隊: 歩 / Math.max(1, 折), 組: 組歩 / Math.max(1, 組折), 形: 図.縄張, 落: b.result ? 1 : 0 };
  };
  const 城々 = [['a', 60], ['bb', 72], ['ccc', 45], ['dddd', 66], ['ee', 38], ['fff', 80], ['gg', 52], ['hhhh', 58]];
  let 隊和 = 0, 組和 = 0, n = 0, 落 = 0;
  const 形 = {};
  for (const [id, def] of 城々) for (const sd of [0x1111, 0x2222, 0x3333]) {
    種 = sd;
    const r = 一戦(id, def);
    隊和 += r.隊; 組和 += r.組; n++; 落 += r.落;
    形[r.形] = (形[r.形] || 0) + 1;
  }
  const 隊間隔 = 隊和 / n, 間隔 = 組和 / n;
  console.log(`  （${n}戦を平均。縄張りの内訳 ${JSON.stringify(形)}）`);
  確('城攻めで隊が左右に流れない', 隊間隔 >= 55,
    `一折り返しあたり ${隊間隔.toFixed(1)}px（毎瞬押し返す古い決まりでは12.2px）`);
  確('組も震えずに進む', 間隔 >= 30,
    `一折り返しあたり ${間隔.toFixed(1)}px（下限。ここは効きが鈍い）`);
  確('それでも城は落ちる（動けなくなっていない）', 落 >= n * 0.7, `${落}／${n}戦で落城`);
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

/* ------------------------ 地物に踏み込んだと判ずる目（GDD 8.6）

   もとは一点で判じていた。組の代表点が川の帯に一歩でも掛かれば、その組は
   「川の中」となり、足が三割に落ちる。組は五十人の塊であって点ではない。
   翼の一組が爪先を濡らしただけで、隊が渡渉しているとは言えない。

   これを繕うために、隘路にかかった隊を長蛇へ組み替える仕掛けを入れていたが、
   委任した隊の陣形がプレイヤーの指図と食い違うので取り止めた。かわりに、
   踏み込んだと判ずる目そのものを厳しくする。

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

  A.setFieldSeed('bridge' + 種, 'x'); A.layoutField(9000, 6); A.setBattleMap(null);
  const bx = (A.RIVER.bridge[0] + A.RIVER.bridge[1]) / 2;
  const 岸上 = (x) => A.RIVER.top + A.riverShift(x);
  const 岸下 = (x) => A.RIVER.bot + A.riverShift(x);
  const by = (岸上(bx) + 岸下(bx)) / 2;

  // 一、点で見た地と、踏み込んで見た地
  const 縁 = { x: bx + 4000, y: 岸上(bx + 4000) + 3 };        // 川の帯に三歩だけ掛かった所
  const 芯 = { x: bx + 4000, y: (岸上(bx + 4000) + 岸下(bx + 4000)) / 2 };
  確('点で見れば、縁に触れただけでも川である', A.terrainAt(縁.x, 縁.y) === 'deep',
    A.terrainAt(縁.x, 縁.y));
  確('踏み込んで見れば、縁に触れただけでは野である', A.踏み込んだ地(縁.x, 縁.y) === 'plain',
    A.踏み込んだ地(縁.x, 縁.y));
  確('川なかほどは、踏み込んで見ても川である', A.踏み込んだ地(芯.x, 芯.y) === 'deep',
    A.踏み込んだ地(芯.x, 芯.y));
  確('橋の上は、両脇が淵でも橋と判ずる', A.踏み込んだ地(bx, by) === 'bridge',
    A.踏み込んだ地(bx, by));

  /* 二、隊としての判じ。隊長か、隊の四割が踏み込んで初めて川である。 */
  const 立てる = (x, y, 陣) => {
    const c = A.makeCorps('P', 将(1), 700, 900, 80, 80, x, y, -Math.PI / 2, '#2F5D8C');
    c.formation = 陣; A.placeSquads(c, true);
    for (const q of c.squads) q.地 = A.踏み込んだ地(q.x, q.y);
    c.地芯 = A.踏み込んだ地(c.x, c.y);
    return c;
  };
  const 濡れ = (c) => c.squads.filter((q) => q.men > 0 && q.地 !== 'plain')
    .reduce((a, q) => a + q.men, 0) / c.squads.reduce((a, q) => a + q.men, 0);

  // 岸に沿って横陣で並び、翼だけが水に掛かっている隊
  const 翼 = 立てる(bx + 4000, 岸上(bx + 4000) - 26, '横陣');
  確('翼が水を跳ねる程度では、隊は川にいない', A.隊の地(翼) === 'plain',
    `濡れた組 ${Math.round(濡れ(翼) * 100)}％／判じ ${A.隊の地(翼)}`);

  // 隊長が川に踏み込んだ隊
  const 将入 = 立てる(bx + 4000, (岸上(bx + 4000) + 岸下(bx + 4000)) / 2, '横陣');
  確('隊長が踏み込めば、隊は川にいる', A.隊の地(将入) === 'deep', A.隊の地(将入));

  // 隊長は岸にいるが、四割以上が水に入っている隊
  let 半 = null;
  for (let d = 0; d < 120 && !半; d += 4) {
    const c = 立てる(bx + 4000, 岸上(bx + 4000) - d, '横陣');
    if (濡れ(c) >= 0.4 && A.踏み込んだ地(c.x, c.y) === 'plain') 半 = c;
  }
  if (半) {
    確('隊の四割が浸かっていれば、隊長が岸にいても川である', A.隊の地(半) === 'deep',
      `濡れた組 ${Math.round(濡れ(半) * 100)}％／判じ ${A.隊の地(半)}`);
  } else {
    確('隊の四割が浸かる形を作れる', false, '仕込めなかった');
  }

  /* 三、委任した隊の陣形を、勝手に組み替えないこと（この節の眼目）

     橋にかかると長蛇へ組み替える仕掛けがあった。プレイヤーが鶴翼を命じても、
     委任している限り橋の手前で長蛇に変わり、いつ戻るかも分からなかった。 */
  const c = 立てる(bx, by, '鶴翼');
  const e = A.makeCorps('E', 将(9), 700, 900, 80, 80, bx, by - 700, Math.PI / 2, '#B0483C');
  const b2 = A.createBattle([c], [e], 'P');
  b2.mode = 'field'; b2.dusk = 9999; b2.phase = 'fight'; b2.face = 'S'; b2.myFar = false;
  A.placeSquads(c, true); A.placeSquads(e, true);
  c.auto = true; c.formPicked = true; e.formPicked = true;
  for (let i = 0; i < 6; i++) A.battleAI(b2);
  確('委任した隊は、橋にかかっても命じられた陣形のまま', c.formation === '鶴翼', c.formation);
  確('元の陣を覚えておく必要もない', !c.元の陣, c.元の陣 || 'なし');

  // 森の中でも同じこと
  if (A.FORESTS.length) {
    const f = A.FORESTS[0];
    const c2 = 立てる(f.x, f.y, '魚鱗');
    c2.auto = true; c2.formPicked = true;
    b2.corps.push(c2); c2.side = 'P';
    for (let i = 0; i < 6; i++) A.battleAI(b2);
    確('森にかかっても陣形は変わらない', c2.formation === '魚鱗', c2.formation);
  }
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
