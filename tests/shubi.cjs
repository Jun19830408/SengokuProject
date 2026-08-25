/* 城門の守備隊と、将のいない城（GDD 9.2 / 9.3）。

   一、城のすべての門に守りを置く

   これまで城方の隊は「城にいる武将の数」しか立たなかった。武将が二人しか
   いなければ、門が七つあっても五つはがら空きで、寄せ手はそこを素通りできた。
   門には人がいる。門番、足軽小頭、駆り出された地侍――名は伝わらぬが、
   そこに人はいる。それを「◯◯城守備隊」として立てる。

   守備隊の器量は、その城を預かる者の統率だけを映す。武勇と知略は最低限とする。
   名も無き兵に、将の武辺や謀は望めない。動きは門に張り付いて射るだけで、
   門を開いて討って出ることはしない。兵も割かない（分遣を出さない）。

   誰をどの門に置き、兵をどう割るかは、城方が遊ぶ側なら手で決められる。
   決めなければ采配の案を用いる。案は外の輪の門を厚く、大手を搦手より厚くし、
   器量の高い将から厚い門に置く。

   二、将のいない城は、城下の野戦をしない

   将のいない城が門を開いて野で当たる道理はない。城兵は籠るだけである。
   そういう城へ寄せ手が着いたら、野戦を飛ばしてそのまま囲みに入る。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'shubi-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { 守りの割り付け, 割り付けの兵, 門の重み } from "../src/core/garrison.js";\n'
+ 'export { 守備隊の統率, castellanOf } from "../src/core/rank.js";\n'
+ 'export { makePromotion, 取り立てる } from "../src/core/house.js";\n'
+ 'export { initState } from "../src/core/state.js";\n'
+ 'export { buildCastleMap, layoutCastleField, setBattleMap, axisOf, fromUV, gatePos, 寄せ口 } from "../src/battle/castleMap.js";\n'
+ 'export { FIELD, MAX_CORPS } from "../src/battle/field.js";\n'
+ 'export { makeCorps, corpsMen, placeSquads } from "../src/battle/corps.js";\n'
+ 'export { createBattle, stepBattle } from "../src/battle/engine.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { 城方の隊を立てる, 持ち場を並べる } from "../src/battle/defense.js";\n');
const out = path.join(ROOT, 'build', 'shubi.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 7;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* ---------------------------------------------- 一、割り付けの案 */
{
  const s = A.initState('oda');
  const c = s.castles.find((x) => x.faction === s.player && x.id === 'nagoya')
    || s.castles.find((x) => x.faction === s.player);
  c.local = 3000;
  const map = A.buildCastleMap(c);
  const gates = map.layers.flatMap((l) => l.gates);
  const 案 = A.守りの割り付け(s, c, gates);

  確('門はひとつ残らず割り当てられる',
    gates.every((g) => 案.門[g.key] != null), `門 ${gates.length}`);
  const 和 = A.割り付けの兵(案);
  確('割り付けた兵の総和が城兵と合う', Math.abs(和 - 3000) <= 1, `${和} / 3000`);

  const 外 = gates.filter((g) => g.layer === 0), 内 = gates.filter((g) => g.layer > 0);
  const 平 = (ls) => ls.reduce((a, g) => a + 案.門[g.key].men, 0) / Math.max(1, ls.length);
  確('外の輪の門ほど厚く守る', !内.length || 平(外) > 平(内),
    `外 ${Math.round(平(外))}人／内 ${Math.round(平(内))}人`);

  const 大手 = 外.find((g) => g.face === 'S'), 搦手 = 外.find((g) => g.face === 'N');
  確('大手門は搦手より厚い', !大手 || !搦手 || 案.門[大手.key].men > 案.門[搦手.key].men,
    大手 && 搦手 ? `${大手.key} ${案.門[大手.key].men}人／${搦手.key} ${案.門[搦手.key].men}人` : '門が足りぬ');

  const 将 = s.generals.filter((x) => x.at === c.id && x.faction === c.faction && !x.captive)
    .sort((a, b) => (b.lead * 1.4 + b.valor) - (a.lead * 1.4 + a.valor));
  const 一 = 将[0];
  const 置かれた = Object.entries(案.門).find(([, d]) => d.genId === (一 || {}).id);
  確('器量の高い将から厚い門に置く',
    !一 || (置かれた && 案.門[置かれた[0]].men >= Math.max(...外.map((g) => 案.門[g.key].men)) - 1),
    一 ? `${一.name} → ${置かれた ? 置かれた[0] : 'どこにも置かれない'}` : '将がいない');

  const 空 = gates.filter((g) => !案.門[g.key].genId).length;
  確('将の足りぬ門は守備隊が守る', 将.length >= gates.length || 空 > 0,
    `将 ${将.length}／門 ${gates.length}／守備隊 ${空}`);

  // 守備隊の統率は城を預かる者から来る
  const 主 = A.castellanOf(s, c);
  確('守備隊の統率は城を預かる者の統率を映す', 案.統 === (主 ? 主.lead : 40),
    主 ? `${主.name}（統${主.lead}）→ 統${案.統}` : `城主なし → 統${案.統}`);
  const 空城 = { ...c, id: 'kara' };
  for (const g of s.generals) if (g.at === c.id) g.at = 'kara-none';
  確('将のいない城でも統率は決まる（低く）', A.守備隊の統率(s, 空城) <= 60,
    `統${A.守備隊の統率(s, 空城)}`);
}

/* ------------------------------- 一の二、門の数だけ隊が立つ（将が足りずとも） */
{
  const s = A.initState('oda');
  const c = s.castles.find((x) => x.faction === s.player);
  c.local = 2400; c.rost = null;
  const 他 = s.castles.find((x) => x.faction === s.player && x !== c);
  const 城将 = s.generals.filter((x) => x.at === c.id && x.faction === c.faction);
  for (const g of 城将.slice(1)) g.at = 他.id;      // 将を一人だけ残す
  const 残 = s.generals.filter((x) => x.at === c.id && x.faction === c.faction && !x.captive);

  const map = A.layoutCastleField(A.buildCastleMap(c));
  A.setBattleMap(map);
  const 門数 = map.layers.reduce((a, l) => a + l.gates.length, 0);
  const def = A.城方の隊を立てる(s, c, map, { defGens: 残, 割り付け: null, side: 'E', color: '#58a' });

  確('将が一人でも、門の数だけ隊が立つ', def.length >= 門数,
    `将 ${残.length}人／門 ${門数}／隊 ${def.length}`);
  確('受け持ちの門のない隊はない（本丸の控えを除く）',
    def.filter((x) => !x.holdGate).length <= 1, '');
  const 守 = def.filter((x) => x.守備隊);
  確('武将のいない門は守備隊が守る', 守.length === 門数 - Math.min(残.length, 門数),
    `守備隊 ${守.length}隊`);
  確('守備隊の名はその城の名を負う', 守.every((x) => x.gen.name === `${c.name}守備隊`),
    守.length ? 守[0].gen.name : '');
  const 主 = A.castellanOf(s, c);
  確('守備隊の統率は城を預かる者から、武勇と知略は低い',
    守.every((x) => x.gen.lead === (主 ? 主.lead : 40) && x.gen.valor <= 35 && x.gen.wit <= 30),
    守.length ? `統${守[0].gen.lead}・武${守[0].gen.valor}・知${守[0].gen.wit}` : '');
  const 兵 = def.reduce((a, x) => a + A.corpsMen(x), 0);
  const 直 = 残.reduce((a, x) => a + x.retinue, 0);
  確('城の兵はどこかの門に収まる', Math.abs(兵 - (2400 + 直)) <= 40 + def.length,
    `盤の兵 ${Math.round(兵)}人／城兵 2400＋直属 ${直}人`);
}

/* ------------------------------------- 二、守備隊は門を離れず、討って出ない */
{
  /* ここで賽を振り直す。この段より前に initState を二度呼んでおり、そこで
     使う乱数の数は武将の数に比例する。武将を増やすたびに、この段の縄張りが
     別のものに変わってしまう。段ごとに賽を据え直せば、盤の中身が増えても
     ここで測るものは変わらない。 */
  種 = 7;
  const 城 = { id: 'test', name: '試の城', def: 55, local: 2400, localTrain: 65, najimi: 70, rost: null, kind: '平山城' };
  const 仕立て = (守備隊) => {
    const map = A.layoutCastleField(A.buildCastleMap(城));
    A.setBattleMap(map);
    const og = map.layers[0].gates;
    /* 寄せ手の将は器量が低い。城方が「器量で一割四分上回る」頃合いである
       （GDD 9.4）。武将の隊ならここで門を開く。守備隊は開かない。 */
    const atk = [0, 1].map((i) => {
      const sp = A.寄せ口(map, og[i % og.length], 0);
      const c = A.makeCorps('P', { id: `a${i}`, name: `寄手${i}`, lead: 30, valor: 30, wit: 40, gov: 40, retinue: 200 },
        200, 700, 55, 55, sp.x, sp.y, sp.f, '#8a5');
      c.morale = 72;
      return c;
    });
    // 城方は門ごとに立つ
    const def = og.map((gt, i) => {
      const l = map.layers[0], a = A.axisOf(l, gt);
      const p = A.fromUV(map, a, gt.off, a.half - 30);
      const 将 = 守備隊
        ? { id: `d${i}`, name: '試の城守備隊', lead: 62, valor: 30, wit: 28, gov: 30, retinue: 0 }
        : { id: `d${i}`, name: `城将${i}`, lead: 62, valor: 74, wit: 60, gov: 55, retinue: 300 };
      const c = A.makeCorps('E', 将, 将.retinue, 700, 66, 66, p.x, p.y,
        Math.atan2(p.y - map.cy, p.x - map.cx) + Math.PI, '#58a');
      c.holdGate = gt;
      c.守備隊 = 守備隊;
      c.morale = 88;
      return c;
    });
    const b = A.createBattle(atk, def, 'P');
    b.mode = 'castle'; b.phase = 'fight'; b.map = map; b.dusk = 4000; b.委ねた = true;
    for (const c of b.corps) A.placeSquads(c, true);
    return b;
  };
  /* 「門を離れた」の数え方。

     持ち場の門は、戦の途中で付け替わることがある。守っていた門が破られれば、
     その隊は次の門へ回される。そのとき隊は動いていないのに、「いまの持ち場から
     の隔たり」だけが一瞬で跳ぶ。もとの数え方はこれを「門を離れた」と数えて
     いたので、付け替えの起きる縄張りに当たると倒れた。二十通りの縄張りで
     測ると、一つでこれが起きる。

     数えたいのは「守っている門を捨てて離れていく」ことであって、「新しい持ち場へ
     向かって歩いている」ことではない。付け替えの直後は、その門に着くまで数えない。 */
  const 走らす = (b) => {
    let 出た = 0, 離れ = 0, 分遣 = 0;
    for (let i = 0; i < 900; i++) {
      A.battleAI(b);
      A.stepBattle(b, 0.5);
      for (const c of b.corps) {
        if (c.side !== 'E' || c.detach) continue;
        if (c.sortie || c.sallied) 出た++;
        if (c.holdGate && !c.holdGate.broken && !c.routed && !c.withdraw) {
          const gp = A.gatePos(b.map, b.map.layers[c.holdGate.layer], c.holdGate);
          const d = Math.hypot(c.x - gp.x, c.y - gp.y);
          if (c.前の持ち場 !== c.holdGate) { c.前の持ち場 = c.holdGate; c.着任待ち = d > 150; }
          if (c.着任待ち && d <= 150) c.着任待ち = false;
          if (!c.着任待ち && d > 150) 離れ++;
        }
      }
      分遣 = Math.max(分遣, b.corps.filter((c) => c.detach && c.side === 'E').length);
      if (b.result) break;
    }
    return { 出た, 離れ, 分遣 };
  };
  const 守 = 走らす(仕立て(true));
  const 将 = 走らす(仕立て(false));

  確('守備隊は門を開いて討って出ない', 守.出た === 0, `守備隊 ${守.出た}回／武将 ${将.出た}回`);
  確('同じ頃合いなら、武将の隊は討って出る', 将.出た > 0, `${将.出た}回`);
  確('守備隊は門を離れない', 守.離れ === 0, `${守.離れ}回`);
  確('守備隊は兵を割かない（分遣を出さない）', 守.分遣 === 0, `${守.分遣}隊`);
}

/* ------------------------------------- 三、武功による取り立ては人を増やす */
{
  const s = A.initState('oda');
  const 主 = s.generals.find((x) => x.faction === s.player);
  const 前 = s.generals.length;
  const promo = A.makePromotion(主, s.generals, { at: 主.at, faction: 主.faction, 守備隊: true });
  確('取り立てには仕える先がついている', !!promo.仕官 && promo.仕官.at === 主.at, '');
  const 新 = A.取り立てる(s, promo, promo.candidates[0]);
  確('名が定まれば家中の人が増える', s.generals.length === 前 + 1 && !!新,
    新 ? `${新.name}（統${新.lead}・武${新.valor}）` : '増えない');
  確('取り立てられた者はその城に入る', 新 && 新.at === 主.at, 新 ? 新.at : '');
  確('取り立ての器量は名のある武将ほどではない', 新 && 新.lead < 70 && 新.valor < 75, '');
  確('架空の人物として印がつく', !!(新 && 新.架空), '');
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
