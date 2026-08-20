/* 寄せ道の試験（GDD 9.3）。

   城攻めは、寄せ手が城の際に湧いて出るところから始まっていた。堀の外、門まで
   九十六歩――手を伸ばせば門に届く所である。野戦から移って来たのだから、
   まずは遠くに陣を敷き、そこから寄せるのが順である。

   寄せ道に入れたもの。
     一、寄せ口を野の縁近くに取る（堀の外に残された余地の七割ほど）
     二、城の外を渡るあいだ、寄せ手は足を緩める（楯を並べ、隊列を整えて進む）
         盤が広がるほど足も速くなる決まり（fieldScale）のせいで、これが無いと
         どれだけ遠くに構えても数秒で門に着き、坂も矢も意味を成さない
     三、城方は狭間から射かける。矢倉だけでなく、塀の兵も撃つ
   山城は坂で足が鈍るので、そのぶん長く撃たれる。

   気をつけたのは、寄せ道が長すぎて日が暮れることと、城が落ちなくなること。
   測ったところ、寄せ道は日暮れの一分に満たず、城は落ちている。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'yosemichi-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { buildCastleMap, layoutCastleField, setBattleMap, axisOf, fromUV, gateOpenU,'
+ ' 寄せ口, 城の構え } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle, stepBattle } from "../src/battle/engine.js";\n'
+ 'export { FIELD } from "../src/battle/field.js";\n');
const out = path.join(ROOT, 'build', 'yosemichi.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

// 賽の目を固定する
let 種 = 0x71c3;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 62, valor: 60, wit: 55, gov: 55,
  retinue: 500, retTrain: 70, unity: 60 });

/* 一戦こしらえて、寄せ道のあいだに何が起きたかを返す。 */
function 攻める(id, def, 賽, opt = {}) {
  種 = 賽;
  const map = A.layoutCastleField(A.buildCastleMap(
    { id, name: `${id}城`, def, local: 900, localTrain: 70, najimi: 70, rost: null }));
  A.setBattleMap(map);
  const outer = map.layers[0], og = outer.gates;
  const atk = [0, 1, 2].map((i) => {
    const gt = og[i % og.length];
    const sp = opt.際
      ? (() => {                                   // 昔どおり堀の際に構える
        const a = A.axisOf(outer, gt);
        const p = A.fromUV(map, a, A.gateOpenU(gt), a.half + map.moat.band + outer.masu + map.t + 96);
        return { x: p.x, y: p.y, f: Math.atan2(map.cy - p.y, map.cx - p.x) };
      })()
      : A.寄せ口(map, gt, Math.floor(i / og.length));
    const c = A.makeCorps('P', 将(i), 500, 2200, 75, 75, sp.x, sp.y, sp.f, '#2F5D8C');
    c.formation = '方陣'; A.placeSquads(c, true);
    if (opt.kit) c.kit = opt.kit;
    return c;
  });
  const 持 = [];
  for (const l of map.layers) for (const gt of l.gates) {
    const a = A.axisOf(l, gt), p = A.fromUV(map, a, gt.off, a.half - 40);
    持.push({ x: p.x, y: p.y, f: Math.atan2(p.y - map.cy, p.x - map.cx) + Math.PI, gate: gt });
  }
  const def2 = [0, 1, 2, 3].map((i) => {
    const sp = 持[Math.min(持.length - 1, i)];
    const c = A.makeCorps('E', 将(100 + i), 250, 225, 70, 70, sp.x, sp.y, sp.f, '#B0483C');
    c.holdGate = sp.gate; return c;
  });
  const b = A.createBattle(atk, def2, 'P');
  b.mode = 'castle'; b.map = map; b.phase = 'fight';
  b.dusk = Math.round(1080 * clamp(Math.pow(A.FIELD.w / 1600, 0.62), 1, 3.2));
  const 兵 = () => atk.reduce((a2, c) => a2 + A.corpsMen(c), 0);
  const 気 = () => atk.reduce((a2, c) => a2 + c.morale, 0) / atk.length;
  const 隔 = Math.round(atk.reduce((a2, c) =>
    a2 + Math.max(Math.abs(c.x - map.cx) - outer.hw, Math.abs(c.y - map.cy) - outer.hh), 0) / atk.length);
  const 初兵 = 兵(), 初気 = 気();
  const 門 = map.layers[0].gates;
  let 着 = null, 着兵 = 初兵, 着気 = 初気, 破 = null, 着射 = 0, 着射気 = 0;
  for (let k = 0; k < 9000; k++) {
    A.stepBattle(b, 0.25);
    if (k % 4 === 0) A.battleAI(b);
    if (着 === null && 門.some((g) => g.hp < g.max * 0.995)) {
      着 = b.t; 着兵 = 兵(); 着気 = 気(); 着射 = b.射損 || 0; 着射気 = b.射気 || 0;
    }
    if (破 === null && 門.some((g) => g.broken)) 破 = b.t;
    if (b.result || b.t > b.dusk) break;
  }
  return { 構: map.構, 隔, 着: 着 == null ? b.dusk : 着, 破, 日暮: b.dusk,
    損: 初兵 - 着兵, 気落ち: 初気 - 着気, 射損: 着射, 射気: 着射気,
    総射損: b.射損 || 0, 決: !!b.result, 刻: b.t };
}

const 城々 = [['a', 60], ['bb', 72], ['ccc', 45], ['dddd', 66], ['ee', 38], ['fff', 80], ['gg', 52], ['hhhh', 58]];
const 賽 = [0x1111, 0x2222];
const 走らす = (opt) => {
  const 出 = [];
  for (const [id, d] of 城々) for (const s of 賽) 出.push(攻める(id, d, s, opt));
  return 出;
};
const 均 = (a, f) => a.reduce((x, y) => x + f(y), 0) / a.length;

/* ------------------------------------------ 一、寄せ口は城から離れている */
{
  const 遠 = 走らす({});
  const 際 = 走らす({ 際: true });
  const d遠 = 均(遠, (r) => r.隔), d際 = 均(際, (r) => r.隔);
  確('寄せ手は城の際ではなく、野から寄せる', d遠 > d際 * 2.5,
    `壁から ${Math.round(d際)}歩 → ${Math.round(d遠)}歩`);

  /* 寄せ道に刻がかかること。ただし日暮れを食い潰さないこと。 */
  const t遠 = 均(遠, (r) => r.着), t際 = 均(際, (r) => r.着);
  const 割 = 均(遠, (r) => r.着 / r.日暮);
  確('門に取り付くまでに刻がかかる', t遠 > t際 + 2.5,
    `${t際.toFixed(1)}秒 → ${t遠.toFixed(1)}秒`);
  確('それでも寄せ道は一日のうちのわずかである', 割 < 0.12,
    `日暮れの${(割 * 100).toFixed(1)}％（${Math.round(均(遠, (r) => r.日暮))}秒のうち${t遠.toFixed(1)}秒）`);

  /* 寄せ道のあいだに削られること。

     削られた数は、城から射かけて当てた兵で数える（b.射損）。手元の兵の増減で
     測ると、門の押し合いの損と混ざって読めない。

     堀の際に構えた場合と数を比べても意味がない。あちらは初手から門に取り付いて
     いるので、「取り付くまで」がほとんど無いためである。ここで見るのは、
     寄せ道のあいだに撃たれているか、山城ではより多く撃たれているか、
     竹束が効くか、の三つである。

     矢の届く間合いは弓で百九十歩（盤の広さに応じて伸びる）。寄せ口は壁から
     五百七十歩ほどなので、寄せ道の後ろ半分が的場になる。手前の半分は
     悠々と歩ける。城の前に開けた地があるとは、そういうことである。

     この試験の城は守兵九百と小さい。大城を攻めれば射手も増え、寄せ道の損は
     数倍になる（守兵六千で測ると、取り付くまでに三十〜六十人が倒れた）。 */
  const 射遠 = 均(遠, (r) => r.射損);
  const 気遠 = 均(遠, (r) => r.射気);
  確('寄せ道のあいだに矢と鉄砲で兵が削られる', 射遠 >= 5,
    `門に取り付くまでに ${Math.round(射遠)}人（守兵九百の小城で）`);
  確('士気も削られる', 気遠 > 2, `寄せ道のあいだに延べ ${気遠.toFixed(1)}`);
  確('城攻めのあいだ、城方は撃ち続ける', 均(遠, (r) => r.総射損) > 射遠 * 2,
    `一戦で延べ ${Math.round(均(遠, (r) => r.総射損))}人`);

  /* それでも城は落ちる。寄せ道が長すぎて詰む、ということが無いように。 */
  const 破れた = 遠.filter((r) => r.破 != null).length;
  確('それでも門は破れる（城攻めが詰まない）', 破れた >= 遠.length * 0.8,
    `${破れた}／${遠.length}戦で惣構の門が破れた`);
  確('日暮れまでに決着がつく', 遠.every((r) => r.決 || r.刻 <= r.日暮),
    `いちばん長い戦で ${Math.round(Math.max(...遠.map((r) => r.刻)))}秒`);

  /* 山城は坂を登るので、寄せ道が長引き、そのぶん長く撃たれる。 */
  const 山 = 遠.filter((r) => r.構 === '山城');
  const 平 = 遠.filter((r) => r.構 !== '山城');
  if (山.length && 平.length) {
    確('山城は坂を登るぶん、寄せ道に手間どる', 均(山, (r) => r.着) > 均(平, (r) => r.着) * 1.15,
      `平地 ${均(平, (r) => r.着).toFixed(1)}秒 ／ 山城 ${均(山, (r) => r.着).toFixed(1)}秒`);
    確('山城では寄せ道の損も大きい', 均(山, (r) => r.射損) > 均(平, (r) => r.射損),
      `平地 ${Math.round(均(平, (r) => r.射損))}人 ／ 山城 ${Math.round(均(山, (r) => r.射損))}人`);
  }

  /* 竹束は矢を防ぐ。道具を選ぶ意味がここに出る。 */
  const 竹 = 走らす({ kit: '竹束' });
  確('竹束を担げば寄せ道の損が軽くなる', 均(竹, (r) => r.射損) < 射遠 * 0.75,
    `${Math.round(射遠)}人 → ${Math.round(均(竹, (r) => r.射損))}人`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
