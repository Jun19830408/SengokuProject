/* 城攻めの広い盤の試験（GDD 9.3）。

   遊ぶ側の申し出は「城攻めにあたっては、もっと広いマップにしたい。野戦から
   移動して、城に向かっていくにあたって野戦に似たようなマップを移動して行って、
   城の近くまで行って、城に取りついて城門を壊す」であった。

   城は今のまま、そのまわりに野戦と同じ作りの野を敷く（castleMap.js 広い盤に据える）。
   確かめること。
     一、盤の作り … 城山（域）は盤の内にあり、その中には野の地物（森・林・丘・山・沼・村）を
                    置かない。川は城山より南を流れ、街道は城山を避け、大手から枝道が出る
     二、地の判定 … 城山の内は城の地（塀・門・堀・坂）、外は野の地（川・橋・道）
     三、足の尺   … 城の中の足と間合いは、これまでの城攻めの盤と同じ
     四、寄せ手   … 南の端に陣を敷き、城方は城の中にいる
     五、戦       … 寄せ手は川を渡り（淵に浸からず）、日暮れのうちに門へ取り付き、門を破る
     六、数日がかり … 日が暮れれば夜の段に移り、夜を明かせば翌朝また攻める（三日まで）。
                      夜のうちに士気が戻り、城方は門を繕い、寄せ手は矢の届かぬ所へ退き、
                      兵糧を一日ぶん食う。采配の寄せ手は、弱れば陣を払う */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'hiroi-kojo-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { buildCastleMap, layoutCastleField, setBattleMap, axisOf, fromUV, gateOpenU, 城の構え, 寄せ手の陣, 城の域か, buildNav } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle, stepBattle, 夜を明かす, 陣を払う, 寄せ手の夜の思案, 今の刻, 兵糧の日, 城攻めの日数 } from "../src/battle/engine.js";\n'
+ 'export { FIELD, ROAD, ROADS, RIVER, FORESTS, WOODS, HILLS, MOUNTAINS, MARSH, VILLAGES, terrainAt, fieldScale, setFieldKind, hasRiver, riverShift } from "../src/battle/field.js";\n'
+ 'export { 持ち場を並べる } from "../src/battle/defense.js";\n');
const out = path.join(ROOT, 'build', 'hiroi-kojo.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

// 賽の目を固定する
let 種 = 0x5eed;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 62, valor: 60, wit: 58, gov: 55,
  retinue: 500, retTrain: 70, unity: 60 });

/* 城の形（構え）を散らした八城。種は野の形を散らす（川のある野・無い野が混じる） */
const 城々 = [
  ['koriyama_a', '吉田郡山城', 72], ['odani', '小谷城', 70], ['kiyosu', '清洲城', 55], ['oka', '岡城', 62],
  ['zz1', '千鳥城', 44], ['zz2', '鷹巣ヶ城', 66], ['zz3', '芦田館', 38], ['zz4', '高森城', 58],
];
const 種ら = [0x9e3779b1, 0x2545f491, 0xdeadbeef, 0x51ed270b, 0x7f4a7c15, 0x632be5ab, 0x94d049bb, 0x1b873593];

function 組む(id, name, def, s) {
  A.setFieldKind('街道');
  const map = A.layoutCastleField(A.buildCastleMap({ id, name, def, local: 1200, localTrain: 70, najimi: 70, rost: null }),
    { 広く: true, 城id: id, 種: s });
  A.setBattleMap(map);
  return map;
}

/* ------------------------------------------ 一、盤の作り */
{
  let 盤内 = 0, 地物外 = 0, 川南 = 0, 川数 = 0, 道避け = 0, 枝道 = 0, 幅 = [];
  for (let i = 0; i < 城々.length; i++) {
    const [id, name, def] = 城々[i];
    const m = 組む(id, name, def, 種ら[i]);
    const W = A.FIELD.w, H = A.FIELD.h, z = m.域;
    幅.push(W);
    if (z.x - z.r >= 0 && z.x + z.r <= W && z.y - z.r >= 0 && z.y + z.r <= H) 盤内++;
    const 掛かる = [...A.FORESTS, ...A.WOODS, ...A.HILLS, ...A.MOUNTAINS, ...A.MARSH, ...A.VILLAGES]
      .filter((o) => Math.hypot(o.x - z.x, o.y - z.y) < z.r + o.r);
    if (!掛かる.length) 地物外++;
    if (A.hasRiver()) {
      川数++;
      let 南 = true;
      for (let x = 0; x <= W; x += 50) if (A.RIVER.top + A.riverShift(x) < z.y + z.r) 南 = false;
      if (南) 川南++;
    }
    let 避け = true;
    const 道 = A.ROAD.節;
    for (let k = 0; k + 1 < 道.length; k++) for (let t = 0; t <= 1; t += 0.05) {
      const x = 道[k].x + (道[k + 1].x - 道[k].x) * t, y = 道[k].y + (道[k + 1].y - 道[k].y) * t;
      if (Math.hypot(x - z.x, y - z.y) < z.r) 避け = false;
    }
    if (避け) 道避け++;
    const 枝 = A.ROADS.find((r) => r.名 === '大手道');
    if (枝 && Math.hypot(枝.節[0].x - z.x, 枝.節[0].y - z.y) < z.r * 1.02 && 枝.節[0].y > z.y) 枝道++;
  }
  const n = 城々.length;
  確('盤は九千〜一万二千歩', 幅.every((w) => w >= 9000 && w <= 12000), `横 ${Math.min(...幅)}〜${Math.max(...幅)}歩`);
  確('城山は盤の内に収まる', 盤内 === n, `${盤内}／${n}`);
  確('城山には野の地物を置かない', 地物外 === n, `${地物外}／${n}`);
  確('川は城山より南を流れる', 川南 === 川数, `川のある${川数}の盤のうち${川南}`);
  確('街道は城山を避けて通る', 道避け === n, `${道避け}／${n}`);
  確('大手の麓から枝道が出る', 枝道 === n, `${枝道}／${n}`);
}

/* ------------------------------------------ 二、地の判定 と 三、足の尺 */
{
  let 城の地 = 0, 野の地 = 0, 尺 = 0, 格子 = 0;
  for (let i = 0; i < 城々.length; i++) {
    const [id, name, def] = 城々[i];
    const 狭 = A.layoutCastleField(A.buildCastleMap({ id, name, def, local: 1200, localTrain: 70, najimi: 70, rost: null }));
    const 尺狭 = A.fieldScale();
    const m = 組む(id, name, def, 種ら[i]);
    if (Math.abs(A.fieldScale() - 尺狭) < 1e-9) 尺++;
    // 外の塀の上は塀、城山の外は野の地
    const o = m.layers[0];
    const 塀 = A.terrainAt(m.cx, m.cy - o.hh - m.t / 2);
    if (塀 === 'wall' || 塀 === 'gate') 城の地++;
    const 外 = A.terrainAt(m.域.x, Math.min(A.FIELD.h - 10, m.域.y + m.域.r + 120));
    if (['plain', 'road', 'deep', 'ford', 'bridge', 'forest', 'wood', 'hill', 'mountain', 'marsh', 'village'].includes(外)) 野の地++;
    const nv = A.buildNav(m);
    if (nv.w * nv.CS < m.域.r * 2 + 200 && nv.h * nv.CS < m.域.r * 2 + 200) 格子++;
    void 狭;
  }
  const n = 城々.length;
  確('城山の内は城の地（塀・門）', 城の地 === n, `${城の地}／${n}`);
  確('城山の外は野の地', 野の地 === n, `${野の地}／${n}`);
  確('足の尺はこれまでの城攻めの盤と同じ', 尺 === n, `${尺}／${n}`);
  確('城の中の道さがしの格子は城山の周りだけ', 格子 === n, `${格子}／${n}`);
}

/* ------------------------------------------ 四・五、寄せ手は南から寄せ、門を破る */
function 攻める(i, 賽) {
  種 = 賽;
  const [id, name, def] = 城々[i];
  const m = 組む(id, name, def, 種ら[i]);
  const n = 4;
  const atk = [0, 1, 2, 3].map((k) => {
    const sp = A.寄せ手の陣(m, k, n);
    const c = A.makeCorps('P', 将(k), 500, 2300, 75, 75, sp.x, sp.y, sp.f, '#2F5D8C');
    c.formation = '方陣'; A.placeSquads(c, true); c.auto = true;
    return c;
  });
  const 持 = A.持ち場を並べる(m);
  const def2 = [0, 1, 2, 3].map((k) => {
    const sp = 持[Math.min(持.length - 1, k)];
    const c = A.makeCorps('E', 将(100 + k), 250, 240, 70, 70, sp.x, sp.y, sp.f, '#B0483C');
    c.holdGate = sp.gate; return c;
  });
  const b = A.createBattle(atk, def2, 'P');
  b.mode = 'castle'; b.map = m; b.phase = 'fight';
  b.dusk = Math.round(1080 * Math.max(1, Math.min(3.2, Math.pow(m.旧.w / 1600, 0.62))))
    + Math.round((A.FIELD.h - m.cy) / (34 * A.fieldScale()) * 2.2);
  const 南 = atk.every((c) => c.y > A.FIELD.h - 1700);
  const 内 = def2.every((c) => A.城の域か(c.x, c.y));
  let 着 = null, 破 = null, 淵 = 0, 延 = 0, 域入 = null;
  const 門 = m.layers[0].gates;
  for (let k = 0; k < 12000; k++) {
    A.stepBattle(b, 0.25);
    if (k % 4 === 0) A.battleAI(b);
    for (const c of atk) for (const q of c.squads) {
      if (q.men <= 0) continue;
      延++;
      if (A.terrainAt(q.x, q.y) === 'deep') 淵++;
    }
    if (域入 === null && atk.some((c) => A.城の域か(c.x, c.y))) 域入 = b.t;
    if (着 === null && 門.some((g) => g.hp < g.max * 0.995)) 着 = b.t;
    if (破 === null && 門.some((g) => g.broken)) 破 = b.t;
    if (b.result || b.t > b.dusk) break;
  }
  return { 構: m.構, 南, 内, 域入, 着, 破, 日暮: b.dusk, 淵割: 延 ? 淵 / 延 : 0, 刻: b.t, 川: A.hasRiver() };
}
{
  const 出 = [];
  for (let i = 0; i < 城々.length; i++) 出.push(攻める(i, 0x1234 + i * 7));
  for (const r of 出) {
    console.log(`    ${r.構}${r.川 ? '・川あり' : ''}　城山に入る ${r.域入 == null ? '―' : r.域入.toFixed(0) + '秒'}`
      + `　門に取り付く ${r.着 == null ? '―' : r.着.toFixed(0) + '秒'}　門を破る ${r.破 == null ? '―' : r.破.toFixed(0) + '秒'}`
      + `　日暮れ ${r.日暮}秒　淵 ${(r.淵割 * 100).toFixed(2)}％`);
  }
  確('寄せ手は南の端に陣を敷く', 出.every((r) => r.南));
  確('城方は城山の中にいる', 出.every((r) => r.内));
  確('寄せ手は城山に入る', 出.every((r) => r.域入 != null), `${出.filter((r) => r.域入 != null).length}／${出.length}`);
  const 着いた = 出.filter((r) => r.着 != null);
  確('日暮れのうちに門へ取り付く', 着いた.length === 出.length, `${着いた.length}／${出.length}`);
  const 割 = 着いた.length ? 着いた.reduce((a, r) => a + r.着 / r.日暮, 0) / 着いた.length : 1;
  確('寄せ道は一日の三割までに収まる', 割 < 0.3, `平均で日暮れの${(割 * 100).toFixed(1)}％`);
  const 破れた = 出.filter((r) => r.破 != null).length;
  確('門は破れる（城攻めが詰まない）', 破れた >= 出.length * 0.75, `${破れた}／${出.length}`);
  const 淵 = Math.max(...出.map((r) => r.淵割));
  確('寄せ手は淵に浸からず、渡り場を通る', 淵 < 0.02, `淵に立つ兵はいちばん多い戦で ${(淵 * 100).toFixed(2)}％`);
}

/* ------------------------------------------ 六、数日がかりの城攻め */
{
  種 = 0x77aa;
  const m = 組む('zz9', '堅城', 84, 0x13579bdf);
  const atk = [0, 1, 2, 3].map((k) => {
    const sp = A.寄せ手の陣(m, k, 4);
    const c = A.makeCorps('P', 将(k), 500, 2300, 75, 75, sp.x, sp.y, sp.f, '#2F5D8C');
    c.formation = '方陣'; A.placeSquads(c, true); c.auto = true;
    return c;
  });
  const 持 = A.持ち場を並べる(m);
  const def2 = [0, 1, 2, 3].map((k) => {
    const sp = 持[Math.min(持.length - 1, k)];
    const c = A.makeCorps('E', 将(100 + k), 300, 400, 72, 72, sp.x, sp.y, sp.f, '#B0483C');
    c.holdGate = sp.gate; return c;
  });
  const b = A.createBattle(atk, def2, 'P');
  b.mode = 'castle'; b.map = m; b.phase = 'fight';
  b.日数 = A.城攻めの日数; b.日 = 1; b.日の始め = 0; b.日の長さ = 200; b.dusk = 200;
  b.兵糧 = { 寄せ手: { 石: 3000, 日に: 100, 食った: 0 }, 城方: { 石: 5000, 日に: 80, 食った: 0 } };
  確('日数は三日', A.城攻めの日数 === 3);
  確('夜明けは卯の刻', A.今の刻(b) === '卯');
  const 走る = () => { for (let k = 0; k < 20000 && b.phase === 'fight'; k++) { A.stepBattle(b, 0.25); if (k % 4 === 0) A.battleAI(b); } };
  走る();
  確('日が暮れれば夜の段に移る', b.phase === 'night', `${b.phase}・${Math.round(b.t)}秒`);
  if (b.phase === 'night') {
    確('日暮れは酉の刻', A.今の刻(b) === '酉');
    const 門 = m.gates.filter((g) => !g.broken);
    const 前 = 門.map((g) => g.hp);
    const 気前 = atk.map((c) => c.morale);
    for (const c of atk) c.morale = Math.min(c.morale, 40);
    確('弱っていなければ寄せ手（采配）は続ける', A.寄せ手の夜の思案(b) === '続ける');
    const t0 = b.t;
    A.夜を明かす(b);
    確('夜が明ければ二日目', b.日 === 2 && b.phase === 'fight');
    確('二日目の日暮れは一日の長さの先', Math.abs(b.dusk - (t0 + 200)) < 1e-6);
    確('城方は破れていない門を繕う', 門.every((g, i) => g.hp >= 前[i]) && 門.some((g, i) => g.hp > 前[i] || g.hp >= g.max),
      `繕った門 ${門.filter((g, i) => g.hp > 前[i]).length}／${門.length}`);
    確('夜のうちに士気が戻る', atk.every((c) => c.dead || c.destroyed || c.withdraw || c.morale > 40));
    確('兵糧を一日ぶん食う', b.兵糧.寄せ手.食った === 100 && b.兵糧.城方.食った === 80
      && A.兵糧の日(b, '寄せ手') === 29 && A.兵糧の日(b, '城方') === 61);
    const o = m.layers[0];
    const 塀まで = (c) => Math.max(Math.abs(c.x - m.cx - (o.ox || 0)) - o.hw, Math.abs(c.y - m.cy - (o.oy || 0)) - o.hh);
    確('塀の外の寄せ手は矢の届かぬ所へ退く', atk.every((c) => c.dead || c.destroyed || c.withdraw || 塀まで(c) <= 0
      || 塀まで(c) >= 190 * A.fieldScale() + 100), atk.map((c) => Math.round(塀まで(c))).join('・') + '歩');
    void 気前;
    走る();
    if (b.phase === 'night') { A.夜を明かす(b); 確('三日目の朝', b.日 === 3); 走る(); }
    確('三日目の日暮れか、城が落ちて城攻めは終わる（三日目の夜は無い）', b.phase === 'over' && b.日 <= 3, `${b.phase}・${b.日}日目・${b.result}`);
  }
  // 陣を払う：兵糧が尽きれば采配の寄せ手は退く
  b.phase = 'night'; b.兵糧.寄せ手.食った = 3000;
  確('兵糧が尽きれば寄せ手（采配）は陣を払う', A.寄せ手の夜の思案(b) === '退く');
  A.陣を払う(b);
  確('陣を払えば城方の勝ちで終わる', b.phase === 'over' && b.result === 'E');
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
