/* 崩れと立て直し（GDD 8.7）。

   隊は早々に崩れ、崩れたら盤の外へ走り去って二度と戻らなかった。まだ三分の二の
   兵を抱えたまま戦場から消えるので、野戦も城攻めも尻すぼみに終わっていた。

   崩れるとは、その場で戦えなくなることであって、国へ帰ることではない。
   直したのは三つ。

     一、損害で削れる士気を緩め、統率で堪えられるようにした。
         もとは「失った兵の割 × 二.二」。一割失えば士気が二十二も落ちるので、
         五分の勝負をしているうちに崩れた。いまは一.一五倍に統率ぶんを掛ける。
     二、士気は戦の綾で動く。押していれば上がり、押されていれば下がる。
         戦っていなければ少しずつ戻り、将の器量（統率五分・武勇三分・知略二分）が
         高いほど早く戻る。
     三、崩れた隊は盤の外へは出ない。敵の来ない所まで退いて息をつき、
         士気が三十八まで戻れば戦列に復する。逃げ場がなく、追われて士気も兵も
         尽きたときだけ、盤の外へ落ちる（潰走）。落ちた将は捕らわれやすい。

   直す前と後とを、同じ二十戦（同じ賽・同じ野・六隊）で測った。

                            直す前    直したあと
     崩れたときに残る兵      66%        42%
     立ち直って戦列に戻る     0隊        9隊
     戦の終わりに盤に残る隊  4.8／6     5.4／6
     決着                  20/20      20/20（七十一秒→百十七秒） */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'haisou-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { layoutField, setFieldSeed, FIELD, terrainAt } from "../src/battle/field.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen, corpsMax, 退き場 } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle, stepBattle, applyDamage } from "../src/battle/engine.js";\n'
+ 'export { setBattleMap, buildCastleMap, layoutCastleField } from "../src/battle/castleMap.js";\n');
const out = path.join(ROOT, 'build', 'haisou.cjs');
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
const 将 = (i, o = {}) => ({ id: `g${i}`, name: `将${i}`, lead: o.lead || 62, valor: o.valor || 60,
  wit: o.wit || 55, gov: 55, retinue: 400, retTrain: 70, unity: 60 });

/* -------------------------------------- 一、野戦で崩れ、退いて、立ち直る */
function 一戦(i) {
  種 = 0x4000 + i * 733;
  A.setBattleMap(null); A.setFieldSeed('x' + i, 'y'); A.layoutField(9000, 6);
  const W = A.FIELD.w, H = A.FIELD.h;
  const P = [0, 1, 2].map((k) => A.makeCorps('P', 将(k), 400, 1100, 75, 75,
    W * (0.3 + k * 0.2), H * 0.84, -Math.PI / 2, '#2F5D8C'));
  const E = [0, 1, 2].map((k) => A.makeCorps('E', 将(10 + k), 400, 1100, 75, 75,
    W * (0.3 + k * 0.2), H * 0.16, Math.PI / 2, '#B0483C'));
  for (const c of [...P, ...E]) { c.formation = '横陣'; A.placeSquads(c, true); c.auto = true; }
  const b = A.createBattle(P, E, 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1100; b.face = 'S'; b.myFar = false;
  const 皆 = [...P, ...E];
  const 崩れ済 = new Set();
  let 崩 = 0, 立ち直り = 0, 潰 = 0, 兵尽き = 0;
  const 兵割 = [];
  for (let k = 0; k < 5000; k++) {
    A.stepBattle(b, 0.25);
    if (k % 3 === 0) A.battleAI(b);
    for (const c of 皆) {
      if (c.routed && !崩れ済.has(c)) {
        崩れ済.add(c); 崩++;
        兵割.push(A.corpsMen(c) / Math.max(1, A.corpsMax(c)));
      }
      if (!c.routed && 崩れ済.has(c) && !c.潰) { 崩れ済.delete(c); 立ち直り++; }
      if (c.潰 && !c.数えた) { c.数えた = true; 潰++; if (A.corpsMen(c) <= 1) 兵尽き++; }
    }
    if (b.result) break;
  }
  return { 崩, 立ち直り, 潰, 兵尽き, 兵割, 決: !!b.result, t: b.t,
    残: 皆.filter((c) => !c.dead && !c.destroyed).length };
}
{
  const 出 = [];
  for (let i = 0; i < 20; i++) 出.push(一戦(i));
  const 和 = (f) => 出.reduce((a, r) => a + f(r), 0);
  const 兵割 = 出.flatMap((r) => r.兵割);
  const 平均兵割 = 兵割.reduce((a, x) => a + x, 0) / Math.max(1, 兵割.length);
  console.log(`  （${出.length}戦、一方三隊ずつ）`);
  確('十分な兵を抱えたまま崩れない', 平均兵割 < 0.55,
    `崩れたときに残っていた兵 平均${Math.round(平均兵割 * 100)}%（直す前は66%）`);
  確('崩れた隊は盤の外へ走り去らない', 和((r) => r.潰) < 和((r) => r.崩) * 0.6,
    `崩れた${和((r) => r.崩)}隊のうち、盤を落ちたのは${和((r) => r.潰)}隊`);
  確('退いて息をつけば、立ち直って戦列に戻る', 和((r) => r.立ち直り) > 0,
    `${和((r) => r.立ち直り)}隊が立ち直った（直す前は0隊）`);
  確('戦の終わりに、盤に隊が残っている', 和((r) => r.残) / 出.length > 5.0,
    `平均 ${(和((r) => r.残) / 出.length).toFixed(1)}／6隊（直す前は4.8）`);
  確('それでも日暮れまでに決着はつく', 出.every((r) => r.決),
    `${出.filter((r) => r.決).length}／${出.length}戦（平均${Math.round(和((r) => r.t) / 出.length)}秒）`);
}

/* ---------------------------- 二、士気の上げ下げ（GDD 8.7） */
{
  種 = 0x811;
  A.setBattleMap(null); A.setFieldSeed('m1', 'y'); A.layoutField(6000, 4);
  const W = A.FIELD.w, H = A.FIELD.h;
  // 戦っていない隊は、少しずつ士気が戻る。器量が高いほど早い。
  const 戻り = (器) => {
    const c = A.makeCorps('P', 将(1, 器), 400, 900, 75, 75, W * 0.3, H * 0.8, -Math.PI / 2, '#2F5D8C');
    const e = A.makeCorps('E', 将(9), 400, 900, 75, 75, W * 0.3, H * 0.1, Math.PI / 2, '#B0483C');
    for (const x of [c, e]) { A.placeSquads(x, true); }
    const b = A.createBattle([c], [e], 'P');
    b.mode = 'field'; b.phase = 'fight'; b.dusk = 4000; b.face = 'S'; b.myFar = false;
    c.auto = false; e.auto = false;
    c.morale = 30; c.order = '待機'; c.tx = c.x; c.ty = c.y;
    const 前 = c.morale;
    for (let k = 0; k < 80; k++) A.stepBattle(b, 0.25);
    return c.morale - 前;
  };
  const 凡 = 戻り({ lead: 45, valor: 45, wit: 45 });
  const 傑 = 戻り({ lead: 92, valor: 88, wit: 90 });
  確('戦っていない隊は士気が戻る', 凡 > 0, `二十秒で ${凡.toFixed(1)}`);
  確('器量の高い将ほど早く立て直す', 傑 > 凡 * 1.5,
    `二十秒で 凡将${凡.toFixed(1)} ／ 器量者${傑.toFixed(1)}`);

  // 損害で削れる士気は、統率で堪えられる
  const 削れ = (統) => {
    const c = A.makeCorps('P', 将(1, { lead: 統 }), 400, 900, 75, 75, W * 0.3, H * 0.8, -Math.PI / 2, '#2F5D8C');
    A.placeSquads(c, true);
    const e = A.makeCorps('E', 将(9), 400, 900, 75, 75, W * 0.3, H * 0.7, Math.PI / 2, '#B0483C');
    A.placeSquads(e, true);
    const b = A.createBattle([c], [e], 'P');
    const 前 = c.morale;
    A.applyDamage(b, c, c.squads[0], 120, 1, 60, e);
    return 前 - c.morale;
  };
  const 弱 = 削れ(40), 強 = 削れ(95);
  確('同じ損害でも、統率の高い将の隊は士気が保つ', 強 < 弱 * 0.92,
    `統率四十 ${弱.toFixed(2)} ／ 統率九十五 ${強.toFixed(2)}`);
  確('百二十人を失って落ちる士気は、一割にも満たない', 弱 < 10,
    `${弱.toFixed(2)}（もとの決まりでは${(弱 * 2.2 / 1.15).toFixed(1)}ほど）`);
}

/* ------------------------- 三、退き場は敵から離れ、盤の中にとどまる */
{
  種 = 0x333;
  A.setBattleMap(null); A.setFieldSeed('r9', 'y'); A.layoutField(9000, 6);
  const W = A.FIELD.w, H = A.FIELD.h;
  const c = A.makeCorps('P', 将(1), 400, 900, 75, 75, W * 0.5, H * 0.5, -Math.PI / 2, '#2F5D8C');
  const 敵 = [0, 1, 2].map((k) => A.makeCorps('E', 将(20 + k), 400, 900, 75, 75,
    W * (0.4 + k * 0.1), H * 0.42, Math.PI / 2, '#B0483C'));
  for (const x of [c, ...敵]) A.placeSquads(x, true);
  const b = A.createBattle([c], 敵, 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 4000; b.face = 'S'; b.myFar = false;
  const p = A.退き場(b, c);
  const 今の近さ = Math.min(...敵.map((o) => Math.hypot(o.x - c.x, o.y - c.y)));
  const 先の近さ = Math.min(...敵.map((o) => Math.hypot(o.x - p.x, o.y - p.y)));
  確('退き場は盤の中にある', p.x > 0 && p.y > 0 && p.x < A.FIELD.w && p.y < A.FIELD.h,
    `${Math.round(p.x)},${Math.round(p.y)}（野は${A.FIELD.w}×${A.FIELD.h}）`);
  確('退き場は、いまいる所より敵から遠い', 先の近さ > 今の近さ,
    `${Math.round(今の近さ)}歩 → ${Math.round(先の近さ)}歩`);
  確('退き場は遠すぎない（立ち直って戦に戻れる）', Math.hypot(p.x - c.x, p.y - c.y) < 900,
    `${Math.round(Math.hypot(p.x - c.x, p.y - c.y))}歩`);
}

/* --------------------- 四、城攻めでも同じであること（壁の中を退き場にしない） */
{
  種 = 0x515;
  const map = A.layoutCastleField(A.buildCastleMap(
    { id: 'z', name: '試の城', def: 62, local: 900, localTrain: 70, najimi: 70, rost: null }));
  A.setBattleMap(map);
  const 中 = { x: map.cx, y: map.cy };
  const c = A.makeCorps('E', 将(1), 300, 500, 70, 70, 中.x, 中.y, 0, '#B0483C');
  const 敵 = A.makeCorps('P', 将(9), 300, 900, 70, 70, 中.x, 中.y + 260, -Math.PI / 2, '#2F5D8C');
  for (const x of [c, 敵]) A.placeSquads(x, true);
  const b = A.createBattle([敵], [c], 'P');
  b.mode = 'castle'; b.map = map; b.phase = 'fight';
  const p = A.退き場(b, c);
  確('城攻めでも退き場は盤の中にある',
    p.x > 0 && p.y > 0 && p.x < A.FIELD.w && p.y < A.FIELD.h,
    `${Math.round(p.x)},${Math.round(p.y)}`);
  確('退き場に石垣を選ばない', A.terrainAt(p.x, p.y) !== 'wall' && A.terrainAt(p.x, p.y) !== 'gate',
    A.terrainAt(p.x, p.y));
  A.setBattleMap(null);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
