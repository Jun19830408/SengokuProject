/* 戦の終わり方と、城の防備（GDD 8.8 / 9.3）。

   一、勝手に囲みを解かないこと

   「寄せ手の兵が三割を切ったら攻めきれず退く」「城方が二割二分を切ったら城を
   開く」という決まりがあった。日はまだ高く、士気も七割あるのに、盤のほうで
   勝手に囲みを解いてしまう。退くか退かぬかは采配を預かる者の決めることである。

   終わるのは次のいずれかに限る。
     一、日が暮れる
     二、片方の兵が尽きる
     三、片方の士気が尽きる
     四、片方の隊がひとつ残らず盤を去る（撤退・潰走・壊滅）、あるいは
         残る隊がみな崩れたまま三十秒が過ぎる（総崩れ）
   城攻めではこれに「本丸を押さえる」が加わる。

   二、城の防備と門の堅さ

   門の堅さは「三百八十＋防備×八」であった。防備二十の砦で五百四十、九十の
   城で千百――二倍しか違わない。土塁に板戸を掛けただけの砦と、石垣に鉄鋲を
   打った城門が、ほぼ同じ手間で破れる勘定である。
   「百十＋防備×十六」に改め、三倍半の開きをつけた。

   攻めのあいだに壊された割に応じて、城の防備そのものも下がる。門は次の攻めまでに
   直るが、直せるのはその城の防備なりのものである。普請で上げておかねば、
   脆い門しか建て直せない。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'shirokatame-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { layoutField, setFieldSeed, FIELD } from "../src/battle/field.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen, corpsMax } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle, stepBattle } from "../src/battle/engine.js";\n'
+ 'export { setBattleMap, buildCastleMap, layoutCastleField, axisOf, fromUV, 寄せ口 } from "../src/battle/castleMap.js";\n');
const out = path.join(ROOT, 'build', 'shirokatame.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 0;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 62, valor: 60, wit: 58, gov: 55,
  retinue: 400, retTrain: 70, unity: 60 });

/* ------------------------------- 一、門の堅さは防備に連なる */
{
  const 堅さ = (def) => {
    const m = A.buildCastleMap({ id: `k${def}`, name: '試の城', def, local: 1000, localTrain: 70, najimi: 70, rost: null });
    const g = m.gates.filter((x) => x.layer === 0);
    return g.reduce((a, x) => a + x.max, 0) / g.length;
  };
  const 低 = 堅さ(20), 中 = 堅さ(55), 高 = 堅さ(90);
  確('防備が高いほど門は堅い', 低 < 中 && 中 < 高,
    `防備二十 ${Math.round(低)}／五十五 ${Math.round(中)}／九十 ${Math.round(高)}`);
  確('低い城と高い城で、門の堅さが三倍以上違う', 高 > 低 * 3,
    `${Math.round(高 / 低 * 10) / 10}倍（もとの決まりでは二倍）`);
}

/* ------------- 二、兵が減っただけでは戦は終わらない（勝手に囲みを解かない） */
function 城を攻める(i, opt = {}) {
  種 = 0x9000 + i * 631;
  const map = A.layoutCastleField(A.buildCastleMap(
    { id: `s${i}`, name: `城${i}`, def: opt.def || 62, local: opt.守 || 3000, localTrain: 70, najimi: 70, rost: null }));
  A.setBattleMap(map);
  const 外 = map.layers[0], og = 外.gates;
  const atk = [0, 1, 2].map((k) => {
    const sp = A.寄せ口(map, og[k % og.length], Math.floor(k / og.length));
    const c = A.makeCorps('P', 将(k), 400, opt.寄 || 1400, 75, 75, sp.x, sp.y, sp.f, '#2F5D8C');
    c.formation = '方陣'; A.placeSquads(c, true); c.auto = true; return c;
  });
  const 持 = [];
  for (const l of map.layers) for (const gt of l.gates) {
    const a = A.axisOf(l, gt), p = A.fromUV(map, a, gt.off, a.half - 40);
    持.push({ x: p.x, y: p.y, f: 0, gate: gt });
  }
  const def = [0, 1, 2, 3].map((k) => {
    const sp = 持[Math.min(持.length - 1, k)];
    const c = A.makeCorps('E', 将(10 + k), 300, Math.round((opt.守 || 3000) / 4), 70, 70, sp.x, sp.y, sp.f, '#B0483C');
    c.holdGate = sp.gate; A.placeSquads(c, true); c.auto = true; return c;
  });
  const b = A.createBattle(atk, def, 'P');
  b.mode = 'castle'; b.map = map; b.phase = 'fight'; b.dusk = 1700;
  const 初 = { P: b.initial.P, E: b.initial.E };
  let 三割を切った刻 = null;
  for (let k = 0; k < 9000; k++) {
    A.stepBattle(b, 0.25);
    if (k % 3 === 0) A.battleAI(b);
    const 寄兵 = atk.reduce((a, c) => a + A.corpsMen(c), 0);
    if (三割を切った刻 === null && 寄兵 < 初.P * 0.3) 三割を切った刻 = b.t;
    if (b.result) break;
  }
  const 門 = map.gates;
  return { b, map, 三割を切った刻, 終: b.t, 結: b.result,
    日暮: b.dusk, 破: 門.filter((g) => g.broken).length, 門数: 門.length,
    門の傷: 1 - 門.reduce((a, g) => a + Math.max(0, g.hp), 0) / 門.reduce((a, g) => a + g.max, 0) };
}
{
  const 出 = [];
  for (let i = 0; i < 10; i++) 出.push(城を攻める(i));
  const 早じまい = 出.filter((r) => r.三割を切った刻 != null && r.終 - r.三割を切った刻 < 3).length;
  確('寄せ手の兵が三割を切っても、そこで戦は終わらない', 早じまい === 0,
    `十戦のうち、三割を切った直後に終わった戦 ${早じまい}`);
  const 訳 = {};
  for (const r of 出) {
    const 記 = r.b.log.map((x) => x.text).join(' ');
    const k = /総崩れ/.test(記) ? '総崩れ' : /士気が尽きた/.test(記) ? '士気尽き'
      : /兵が尽きた|隊が尽きた/.test(記) ? '兵尽き'
        : r.b.captured ? '本丸を押さえた' : r.終 >= r.日暮 ? '日暮れ' : 'その他';
    訳[k] = (訳[k] || 0) + 1;
  }
  確('戦の終わりは、日暮れ・兵尽き・士気尽き・総崩れ・落城のいずれか',
    !訳['その他'], JSON.stringify(訳));
  確('攻めきれずとも、日暮れまでは戦が続く',
    出.every((r) => r.終 > 120 || r.b.captured), `いちばん短い戦 ${Math.round(Math.min(...出.map((r) => r.終)))}秒`);
}

/* ------------- 二のニ、崩れた城方は、内の門へ下がって立て直す（GDD 9.3）

   野なら敵の来ない所まで走ればよいが、城の中でそれをやると、壁を背にした隅で
   息をつくことになり、門はがら空きになる。城方が崩れたら、内の曲輪へ下がって
   門を背に息をつき、立ち直ったらそのままその門を守る。 */
{
  let 崩 = 0, 内へ = 0, 門を受け持つ = 0;
  for (let i = 0; i < 8; i++) {
    種 = 0xB000 + i * 419;
    const map = A.layoutCastleField(A.buildCastleMap(
      { id: `u${i}`, name: `城${i}`, def: 66, local: 2600, localTrain: 70, najimi: 70, rost: null }));
    A.setBattleMap(map);
    const 外 = map.layers[0], og = 外.gates;
    const atk = [0, 1, 2].map((k) => {
      const sp = A.寄せ口(map, og[k % og.length], 0);
      const c = A.makeCorps('P', 将(k), 400, 2200, 75, 75, sp.x, sp.y, sp.f, '#2F5D8C');
      c.formation = '方陣'; A.placeSquads(c, true); c.auto = true; return c;
    });
    const 持 = [];
    for (const l of map.layers) for (const gt of l.gates) {
      const a = A.axisOf(l, gt), p = A.fromUV(map, a, gt.off, a.half - 40);
      持.push({ x: p.x, y: p.y, f: 0, gate: gt });
    }
    const def = [0, 1, 2, 3].map((k) => {
      const sp = 持[Math.min(持.length - 1, k)];
      const c = A.makeCorps('E', 将(10 + k), 300, 650, 70, 70, sp.x, sp.y, sp.f, '#B0483C');
      c.holdGate = sp.gate; A.placeSquads(c, true); c.auto = true; return c;
    });
    const b = A.createBattle(atk, def, 'P');
    b.mode = 'castle'; b.map = map; b.phase = 'fight'; b.dusk = 1700;
    for (let k = 0; k < 9000; k++) {
      A.stepBattle(b, 0.25);
      if (k % 3 === 0) A.battleAI(b);
      for (const c of def) {
        if (c.routed && !c.見た) {
          c.見た = true; 崩++;
          c.崩れ位置 = Math.hypot(c.x - map.cx, c.y - map.cy);
        }
        if (c.見た && !c.測った && c.立て直し) {
          c.測った = true;
          const d = Math.hypot(c.立て直し.x - map.cx, c.立て直し.y - map.cy);
          if (d < c.崩れ位置 - 20) 内へ++;
          if (c.holdGate) 門を受け持つ++;
        }
      }
      if (b.result) break;
    }
  }
  確('城方が崩れる戦がある（測れている）', 崩 > 0, `${崩}隊`);
  確('崩れた城方は、内へ下がって立て直す', 崩 === 0 || 内へ === 崩,
    `${内へ}／${崩}隊が城の中心へ寄った`);
  確('下がった先の門を受け持つ', 崩 === 0 || 門を受け持つ === 崩,
    `${門を受け持つ}／${崩}隊`);
  A.setBattleMap(null);
}

/* --------------- 三、脆い城は早く破れ、堅い城は容易には破れない */
{
  const 破るまで = (def) => {
    const 刻 = [];
    for (let i = 0; i < 6; i++) {
      種 = 0xA000 + i * 337;
      const map = A.layoutCastleField(A.buildCastleMap(
        { id: `d${def}_${i}`, name: '城', def, local: 2000, localTrain: 70, najimi: 70, rost: null }));
      A.setBattleMap(map);
      const 外 = map.layers[0], og = 外.gates;
      const atk = [0, 1, 2].map((k) => {
        const sp = A.寄せ口(map, og[k % og.length], 0);
        const c = A.makeCorps('P', 将(k), 400, 2000, 75, 75, sp.x, sp.y, sp.f, '#2F5D8C');
        c.formation = '方陣'; A.placeSquads(c, true); c.auto = true; return c;
      });
      const 持 = [];
      for (const l of map.layers) for (const gt of l.gates) {
        const a = A.axisOf(l, gt), p = A.fromUV(map, a, gt.off, a.half - 40);
        持.push({ x: p.x, y: p.y, f: 0, gate: gt });
      }
      const def2 = [0, 1, 2, 3].map((k) => {
        const sp = 持[Math.min(持.length - 1, k)];
        const c = A.makeCorps('E', 将(10 + k), 300, 500, 70, 70, sp.x, sp.y, sp.f, '#B0483C');
        c.holdGate = sp.gate; A.placeSquads(c, true); c.auto = true; return c;
      });
      const b = A.createBattle(atk, def2, 'P');
      b.mode = 'castle'; b.map = map; b.phase = 'fight'; b.dusk = 2400;
      let 破 = null;
      for (let k = 0; k < 9000 && 破 === null; k++) {
        A.stepBattle(b, 0.25);
        if (k % 3 === 0) A.battleAI(b);
        if (map.layers[0].gates.some((g) => g.broken)) 破 = b.t;
        if (b.result) break;
      }
      刻.push(破 == null ? b.dusk : 破);
    }
    return 刻.reduce((a, x) => a + x, 0) / 刻.length;
  };
  const 脆 = 破るまで(25), 堅 = 破るまで(85);
  確('防備の低い城は、門が早く破れる', 脆 < 堅 * 0.75,
    `防備二十五 ${Math.round(脆)}秒 ／ 防備八十五 ${Math.round(堅)}秒`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
