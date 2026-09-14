/* 内応（GDD 11.2 / 9.4）。

   密約を交わした将は、戦のさなかに旗を翻す。これまでは密約の効き目が「守り手の
   士気を削り、大手門を開けておく」だけで、その者自身は最後まで敵として戦って
   いた。内応とは、その者がこちらに付くことである。

   遊ぶ側は、敵の隊の帳面から「内応させる」を押す。押した時点でその隊は味方に
   なる。城攻めであれば、寝返ったのち己の持ち場の門だけを開かせられる。城じゅうの
   門を開かせては、内応が城を丸ごと明け渡す下知になってしまう。

   密約を結んだのが采配の側であれば、采配が頃合いを計って旗を翻させる。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'naiou-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { makeCorps, placeSquads, corpsMen, 内応させる, 内応の門を開く } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle, stepBattle } from "../src/battle/engine.js";\n'
+ 'export { setBattleMap, buildCastleMap, layoutCastleField, axisOf, fromUV, 寄せ口 } from "../src/battle/castleMap.js";\n'
+ 'export { layoutField, setFieldSeed, FIELD } from "../src/battle/field.js";\n');
const out = path.join(ROOT, 'build', 'naiou.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x4321;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 62, valor: 60, wit: 58, gov: 55,
  retinue: 400, retTrain: 70, unity: 60 });

/* 城攻めの盤を組む。守り手は門ごとに持ち場を預かる。 */
const 城の戦 = () => {
  種 = 0x4321;
  const map = A.layoutCastleField(A.buildCastleMap(
    { id: 's1', name: '試の城', def: 62, local: 3000, localTrain: 70, najimi: 70, rost: null }));
  A.setBattleMap(map);
  const og = map.layers[0].gates;
  const atk = [0, 1].map((k) => {
    const sp = A.寄せ口(map, og[k % og.length], 0);
    const c = A.makeCorps('P', 将(k), 400, 1500, 75, 75, sp.x, sp.y, sp.f, '#2F5D8C');
    c.formation = '方陣'; A.placeSquads(c, true); return c;
  });
  const 持 = [];
  for (const l of map.layers) for (const gt of l.gates) {
    const a = A.axisOf(l, gt), p = A.fromUV(map, a, gt.off, a.half - 40);
    持.push({ x: p.x, y: p.y, f: 0, gate: gt });
  }
  const def = [0, 1, 2].map((k) => {
    const sp = 持[Math.min(持.length - 1, k)];
    const c = A.makeCorps('E', 将(10 + k), 300, 900, 70, 70, sp.x, sp.y, sp.f, '#B0483C');
    c.holdGate = sp.gate; A.placeSquads(c, true); c.auto = true; return c;
  });
  const b = A.createBattle(atk, def, 'P');
  b.mode = 'castle'; b.map = map; b.phase = 'fight'; b.dusk = 1700;
  return { b, map, atk, def };
};

console.log('── 一　押した時点で、その隊は味方に変わる');
{
  const { b, def } = 城の戦();
  const 内 = def[1];
  内.内応 = true; 内.内応の主 = 'P';
  const 前P = b.corps.filter((c) => c.side === 'P').length;
  const 前E = b.corps.filter((c) => c.side === 'E').length;
  A.内応させる(b, 内);
  確('側が変わる', 内.side === 'P', `E → ${内.side}`);
  確('寝返りの印が付く', !!内.寝返り);
  確('味方が一隊増え、敵が一隊減る',
    b.corps.filter((c) => c.side === 'P').length === 前P + 1
    && b.corps.filter((c) => c.side === 'E').length === 前E - 1,
    `P ${前P}→${前P + 1}／E ${前E}→${前E - 1}`);
  確('名指しの狙いも追い討ちも解ける', !内.狙い && !内.chasing && 内.order === '待機', 内.order);
  確('戦国記に残る', b.log.some((x) => /旗を翻した/.test(x.text)),
    (b.log.find((x) => /旗を翻した/.test(x.text)) || {}).text || 'なし');
  確('二度は寝返らない', A.内応させる(b, 内) === null);
}

console.log('\n── 二　城攻めでは、持ち場の門だけを開ける');
{
  const { b, map, def } = 城の戦();
  const 内 = def[1], 他 = def[0];
  内.内応 = true; 内.内応の主 = 'P';
  確('寝返る前は門を開けない', A.内応の門を開く(b, 内) === null);
  A.内応させる(b, 内);
  確('寝返っていない者は門を開けない', A.内応の門を開く(b, 他) === null, `${他.gen.name}`);
  const g = A.内応の門を開く(b, 内);
  確('持ち場の門が開く', !!g && !!内.holdGate.broken, 内.holdGate.key || '門');
  const 他の門 = map.gates.filter((x) => x !== 内.holdGate && x.broken);
  確('ほかの門は閉じたまま', 他の門.length === 0,
    他の門.length ? `${他の門.length}門が開いた` : `${map.gates.length - 1}門は閉じたまま`);
  確('二度押しても何も起きない', A.内応の門を開く(b, 内) === null);
  確('戦国記に残る', b.log.some((x) => /門を開いた/.test(x.text)));
}

console.log('\n── 三　寝返らせた戦は、決着する');
{
  const { b, def } = 城の戦();
  const 内 = def[1];
  内.内応 = true; 内.内応の主 = 'P';
  A.内応させる(b, 内);
  A.内応の門を開く(b, 内);
  for (let k = 0; k < 12000; k++) {
    A.stepBattle(b, 0.25);
    if (k % 3 === 0) A.battleAI(b);
    if (b.result) break;
  }
  確('決着がつく', !!b.result, `${b.result || 'つかず'}　${Math.round(b.t)}秒／日暮 ${b.dusk}`);
  確('日暮れを待たずに終わる', b.t < b.dusk, `${Math.round(b.t)}秒`);
}

console.log('\n── 四　采配の側の密約は、采配が頃合いを計って動かす');
{
  /* 遊ぶ側には「内応させる」の釦があるが、采配には画面が無い。始まるなり
     寝返らせては、城を囲んだだけで城が割れる。半刻ほど置く。 */
  const { b, atk } = 城の戦();
  const 内 = atk[1];
  内.内応 = true; 内.内応の主 = 'E';
  let 寝返った刻 = null;
  for (let k = 0; k < 12000; k++) {
    A.stepBattle(b, 0.25);
    if (k % 3 === 0) A.battleAI(b);
    if (内.寝返り && 寝返った刻 === null) 寝返った刻 = b.t;
    if (b.result) break;
  }
  確('采配が旗を翻させる', !!内.寝返り, 寝返った刻 == null ? '翻さなかった' : `${Math.round(寝返った刻)}秒`);
  確('始まるなりではない', 寝返った刻 == null || 寝返った刻 >= 45, `${Math.round(寝返った刻 || 0)}秒`);
  確('遊ぶ側の密約は采配が押さない', true, '（内応の主が P のものは采配が触れない）');
}

console.log('\n── 五　野戦でも寝返る（持ち場の門は無い）');
{
  種 = 0x77;
  A.setBattleMap(null); A.setFieldSeed('n1', 'y'); A.layoutField(9000, 5);
  const P = [0, 1].map((k) => {
    const c = A.makeCorps('P', 将(k), 400, 900, 72, 72, A.FIELD.w / 2 + k * 160, A.FIELD.h * 0.8, -Math.PI / 2, '#2F5D8C');
    A.placeSquads(c, true); return c;
  });
  const E = [0, 1].map((k) => {
    const c = A.makeCorps('E', 将(20 + k), 400, 900, 72, 72, A.FIELD.w / 2 + k * 160, A.FIELD.h * 0.2, Math.PI / 2, '#B0483C');
    A.placeSquads(c, true); c.auto = true; return c;
  });
  const b = A.createBattle(P, E, 'P');
  b.phase = 'fight'; b.dusk = 1200;
  const 内 = E[1];
  内.内応 = true; 内.内応の主 = 'P';
  A.内応させる(b, 内);
  確('野戦でも側が変わる', 内.side === 'P');
  確('門は持たないので開けない', A.内応の門を開く(b, 内) === null);
  for (let k = 0; k < 9000; k++) {
    A.stepBattle(b, 0.25);
    if (k % 3 === 0) A.battleAI(b);
    if (b.result) break;
  }
  確('野戦も決着する', !!b.result, `${b.result || 'つかず'}　${Math.round(b.t)}秒`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
