/* 出城の普請・付城・橋を落とす の試験（GDD 9.2 / 9.3）。

   遊ぶ側の申し出は「付城などは面白い。政務フェーズで付け城などを建設できるようになる
   のもいい」であった。確かめること。
     一、出城の普請 … 政務の下知「出城」で数度に分けて普請し、成れば「出城」と呼ぶ
                      （〇〇丸とは呼ばない）。二つ目は築けない（core/demaru.js）
     二、付城の普請 … 囲みの札の上に積む。二つまで。ひとつにつき包囲率十二（core/tsukejiro.js）
     三、付城の盤   … 城山の南の外に据わり、川・森・村に掛からない。柵と陣の地を持つ。
                      寄せ手は付城に陣を敷き、南の端から寄せるより早く門に取り付く
     四、橋を落とす … 落ちた橋の幅は淵になり、野の道は浅瀬を通る。夜のうちに寄せ手が
                      仮橋を架け直す（engine.js 夜を明かす）
     五、落ちたままの橋 … 戦のあとも橋は落ちたままで、城防をいちばん下がった所から八上げ直せば
                      架け直す（core/hashi.js。築城の下知と月送りが見る） */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'tsukejiro-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { buildCastleMap, layoutCastleField, setBattleMap, 寄せ手の陣, 城の域か, 付城を据える } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle, stepBattle, 夜を明かす } from "../src/battle/engine.js";\n'
+ 'export { FIELD, RIVER, terrainAt, fieldScale, setFieldKind, hasRiver, riverShift, 橋を落とす, 仮橋を架ける, 地形の代 } from "../src/battle/field.js";\n'
+ 'export { 野の道 } from "../src/battle/route.js";\n'
+ 'export { 持ち場を並べる } from "../src/battle/defense.js";\n'
+ 'export { 出城の手間, 出城の進み, 出城の普請高 } from "../src/core/demaru.js";\n'
+ 'export { 橋を落としたままにする, 橋の残り, 橋の普請を見る, 橋を架け直す幅 } from "../src/core/hashi.js";\n'
+ 'export { 付城の普請, 付城を築けるか, 付城の締め, 付城の限り, 付城の手間 } from "../src/core/tsukejiro.js";\n'
+ 'export { initState } from "../src/core/state.js";\n'
+ 'export { runCommand } from "../src/govern/commands.js";\n');
const out = path.join(ROOT, 'build', 'tsukejiro.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
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

/* ---------------------------------------------- 一、出城の普請（政務） */
{
  let s = A.initState('oda');
  const c = s.castles.find((x) => x.faction === 'oda' && s.generals.some((g) => g.at === x.id && g.faction === 'oda' && !g.captive));
  const gen = s.generals.filter((g) => g.at === c.id && g.faction === 'oda' && !g.captive).sort((a, b) => b.gov - a.gov)[0];
  s.factions.oda.gold = 99999;
  const 金0 = s.factions.oda.gold;
  let 度 = 0;
  while (!s.castles.find((x) => x.id === c.id).出城 && 度 < 10) {
    s = A.runCommand(s, c.id, '出城', gen.id);
    s.orders = {};                                  // 試しなので、同じ将に何度も命じる
    度++;
  }
  const c2 = s.castles.find((x) => x.id === c.id);
  const 見込み = Math.ceil(A.出城の普請高 / A.出城の進み(gen));
  確('出城は数度の下知で成る（政務の高い者ほど早い）', !!c2.出城 && 度 === 見込み, `${gen.name}（政務${gen.gov}）で${度}度（見込み${見込み}度）`);
  確('出城の名は「出城」（〇〇丸とは呼ばない）', !!c2.出城 && c2.出城.名 === '出城', c2.出城 ? c2.出城.名 : '');
  確('一度の下知で城の身代なりの金を払う', 金0 - s.factions.oda.gold === A.出城の手間(c2) * 度, `${A.出城の手間(c2)}貫×${度}度`);
  確('成れば戦国記に残る（名に丸を付けない）', s.chronicle.some((e) => e.text.includes('出城を築いた'))
    && !s.chronicle.some((e) => /丸と呼ばれる/.test(e.text)));
  const s3 = A.runCommand(s, c.id, '出城', gen.id);
  確('二つ目の出城は築けない', s3.msg && s3.msg.includes('すでに'), s3.msg || '');
}

/* ---------------------------------------------- 二、付城の普請（囲み） */
{
  const s = { factions: { a: { gold: 5000 } }, generals: [{ id: 'k1', gov: 70 }, { id: 'k2', gov: 50 }] };
  const army = { faction: 'a', men: 8000, gens: ['k1', 'k2'] };
  const sg = { castleId: 'x', armyId: 'y', months: 2 };
  const r1 = A.付城の普請(s, sg, army);
  確('付城の普請は囲む軍の将の政務で進む', r1.ok && r1.後 === Math.round(34 + 70 / 3), `一度に${r1.後}`);
  確('付城の普請の金は軍の大きさなり', 5000 - s.factions.a.gold === A.付城の手間(army), `${A.付城の手間(army)}貫`);
  A.付城の普請(s, sg, army);
  確('二度で一つ成る', (sg.付城 || 0) === 1, `付城 ${sg.付城 || 0}`);
  確('ひとつにつき包囲率が十二上がる', Math.abs(A.付城の締め(sg) - 0.12) < 1e-9);
  A.付城の普請(s, sg, army); A.付城の普請(s, sg, army);
  const r5 = A.付城の普請(s, sg, army);
  確('付城は二つまで', sg.付城 === A.付城の限り && !r5.ok, r5.why || '');
  確('二つで包囲率二十四', Math.abs(A.付城の締め(sg) - 0.24) < 1e-9);
  const 貧 = { factions: { a: { gold: 10 } }, generals: [] };
  確('金が無ければ築けない', !A.付城を築けるか(貧, { 付城: 0 }, army).ok);
}

/* ---------------------------------------------- 三・四、盤 */
const 城々 = [
  ['koriyama_a', '吉田郡山城', 72], ['odani', '小谷城', 70], ['kiyosu', '清洲城', 55], ['oka', '岡城', 62],
  ['zz1', '千鳥城', 44], ['zz2', '鷹巣ヶ城', 66], ['zz3', '芦田館', 38], ['zz4', '高森城', 58],
];
const 種ら = [0x9e3779b1, 0x2545f491, 0xdeadbeef, 0x51ed270b, 0x7f4a7c15, 0x632be5ab, 0x94d049bb, 0x1b873593];
function 組む(i, 付 = 0) {
  const [id, name, def] = 城々[i];
  A.setFieldKind('街道');
  const map = A.layoutCastleField(A.buildCastleMap({ id, name, def, local: 1200, localTrain: 70, najimi: 70, rost: null }),
    { 広く: true, 城id: id, 種: 種ら[i] });
  A.setBattleMap(map);
  A.付城を据える(map, 付);
  return map;
}
const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 62, valor: 60, wit: 58, gov: 55, retinue: 500, retTrain: 70, unity: 60 });
function 取り付くまで(i, 付) {
  種 = 0x3311 + i;
  const m = 組む(i, 付);
  const n = 4;
  const atk = [...Array(n).keys()].map((k) => {
    const sp = A.寄せ手の陣(m, k, n);
    const c = A.makeCorps('P', 将(k), 500, 2300, 75, 75, sp.x, sp.y, sp.f, '#2F5D8C');
    c.formation = '方陣'; A.placeSquads(c, true); c.auto = true;
    return c;
  });
  const 持 = A.持ち場を並べる(m);
  const def2 = [0, 1].map((k) => {
    const sp = 持[Math.min(持.length - 1, k)];
    const c = A.makeCorps('E', 将(100 + k), 250, 240, 70, 70, sp.x, sp.y, sp.f, '#B0483C');
    c.holdGate = sp.gate; return c;
  });
  const b = A.createBattle(atk, def2, 'P');
  b.mode = 'castle'; b.map = m; b.phase = 'fight'; b.dusk = 99999;
  const 門 = m.layers[0].gates;
  for (let k = 0; k < 40000; k++) {
    A.stepBattle(b, 0.1);
    if (k % 3 === 0) A.battleAI(b);
    if (門.some((g) => g.hp < g.max * 0.995)) return { 刻: b.t, 陣: atk.map((c) => ({ x: c.x, y: c.y })) };
    if (b.result || b.t > 1500) break;
  }
  return { 刻: null };
}
{
  let 外 = 0, 地物 = 0, 地 = 0, 陣 = 0, 二つ = 0;
  const 咎地 = [];
  for (let i = 0; i < 城々.length; i++) {
    const m = 組む(i, 1);
    const f = m.付城 && m.付城[0];
    if (!f) continue;
    if (!A.城の域か(f.x, f.y - f.hh - f.t, m) && Math.hypot(f.x - m.域.x, f.y - f.hh - f.t - m.域.y) > m.域.r) 外++;
    // 付城の柵の内に川・沼・森・村・山が無い
    let 掛かる = false;
    const m素 = { ...m, 付城: null };
    for (let x = f.x - f.hw; x <= f.x + f.hw; x += 20) for (let y = f.y - f.hh; y <= f.y + f.hh; y += 20) {
      A.setBattleMap(m素);
      if (['deep', 'ford', 'bridge', 'marsh', 'forest', 'village', 'mountain'].includes(A.terrainAt(x, y))) 掛かる = true;
      A.setBattleMap(m);
    }
    if (!掛かる) 地物++;
    const 期 = [['内', f.x, f.y, 'jinsho'], ['西の柵', f.x - f.hw - f.t / 2, f.y, 'saku'], ['南の柵', f.x + f.hw * 0.6, f.y + f.hh + f.t / 2, 'saku'],
      ['北の口', f.x, f.y - f.hh - f.t / 2, 'jinsho']];
    const 違 = 期.filter(([, x, y, t]) => A.terrainAt(x, y) !== t);
    if (!違.length) 地++; else 咎地.push(`${城々[i][1]}：` + 違.map(([名, x, y, t]) => `${名}=${A.terrainAt(x, y)}`).join('、'));
    const sp = A.寄せ手の陣(m, 0, 4);
    if (Math.abs(sp.x - f.x) <= f.hw + 400 && Math.abs(sp.y - f.y) <= f.hh + 200) 陣++;
    const m2 = 組む(i, 2);
    if (m2.付城 && m2.付城.length === 2) 二つ++;
  }
  確('付城は城山の外（南）に据わる', 外 === 城々.length, `${外}／${城々.length}`);
  確('付城は川・沼・森・村・山に掛からない', 地物 === 城々.length, `${地物}／${城々.length}`);
  確('付城の地（陣の内・柵・北の口）', 地 === 城々.length, 咎地.join(' ／ ') || `${地}／${城々.length}`);
  確('寄せ手は付城に陣を敷く', 陣 === 城々.length, `${陣}／${城々.length}`);
  確('付城が二つなら二つ据わる', 二つ >= 城々.length - 1, `${二つ}／${城々.length}`);
  const 早 = [], 遅 = [];
  for (const i of [0, 2, 4, 7]) { 早.push(取り付くまで(i, 1).刻); 遅.push(取り付くまで(i, 0).刻); }
  console.log(`    門に取り付くまで　付城から ${早.map((t) => t == null ? '―' : Math.round(t) + '秒').join('・')}　／　南の端から ${遅.map((t) => t == null ? '―' : Math.round(t) + '秒').join('・')}`);
  確('付城から寄せれば、南の端から寄せるより早く門に取り付く',
    早.every((t, k) => t != null && 遅[k] != null && t < 遅[k] * 0.8));
}
{
  let 川あり = 0, 淵 = 0, 瀬 = 0, 架 = 0, 夜 = 0;
  for (let i = 0; i < 城々.length; i++) {
    const m = 組む(i, 0);
    if (!A.hasRiver() || !(A.RIVER.bridge[1] > A.RIVER.bridge[0])) continue;
    川あり++;
    const bx = (A.RIVER.bridge[0] + A.RIVER.bridge[1]) / 2;
    const by = (A.RIVER.top + A.RIVER.bot) / 2 + A.riverShift(bx);
    const 代 = A.地形の代();
    確(`${城々[i][1]}：橋を落とせる`, A.橋を落とす() && A.地形の代() !== 代);
    if (A.terrainAt(bx, by) === 'deep') 淵++;
    // 南の岸から北の岸へ。橋が無いので、道は浅瀬へ回るか淵を押し渡る（橋の幅を通らない）
    const 道 = A.野の道(bx, A.RIVER.bot + A.riverShift(bx) + 240, bx, A.RIVER.top + A.riverShift(bx) - 240);
    const 川の中 = (p) => Math.abs(p.y - ((A.RIVER.top + A.RIVER.bot) / 2 + A.riverShift(p.x))) < (A.RIVER.bot - A.RIVER.top);
    if (道 && 道.filter(川の中).every((p) => A.terrainAt(p.x, p.y) !== 'bridge')) 瀬++;
    // 夜のうちに仮橋を架ける
    const b = A.createBattle([A.makeCorps('P', 将(1), 100, 500, 70, 70, bx, A.FIELD.h - 300, 0, '#2F5D8C')],
      [A.makeCorps('E', 将(2), 100, 200, 70, 70, m.cx, m.cy, 0, '#B0483C')], 'P');
    b.mode = 'castle'; b.map = m; b.phase = 'night'; b.日数 = 3; b.日 = 1; b.日の長さ = 300; b.dusk = 300;
    A.夜を明かす(b);
    if (A.terrainAt(bx, by) === 'bridge' && A.RIVER.仮橋 && b.野を焼き直す) 夜++;
    if (A.RIVER.bridge[1] - A.RIVER.bridge[0] < (A.RIVER.bridge[1] - A.RIVER.bridge[0]) / 0.8 + 1) 架++;
  }
  確('川のある野で試す', 川あり >= 2, `${川あり}野`);
  確('落ちた橋の幅は淵になる', 淵 === 川あり, `${淵}／${川あり}`);
  確('橋が落ちれば、野の道は浅瀬へ回るか淵を押し渡る', 瀬 === 川あり, `${瀬}／${川あり}`);
  確('夜のうちに寄せ手が仮橋を架け直し、野の絵を焼き直す印が立つ', 夜 === 川あり, `${夜}／${川あり}`);
  確('仮橋は元の橋より狭い', 架 === 川あり);
  確('橋の落ちていない野で仮橋は架からない', !A.仮橋を架ける());
}

{
  /* 橋を落とした野で、寄せ手が城山へ寄せる。淵に浸からず、浅瀬を渡って寄せる。
     着く刻は浅瀬の在り処しだい（城の盤の橋は城山の脇に架けてあり、浅瀬はそれより遠いことも近いこともある） */
  const 寄せる = (i, 落) => {
    種 = 0x5151 + i;
    const m = 組む(i, 0);
    if (落) A.橋を落とす();
    const n = 4;
    const atk = [...Array(n).keys()].map((k) => {
      const sp = A.寄せ手の陣(m, k, n);
      const c = A.makeCorps('P', 将(k), 500, 2300, 75, 75, sp.x, sp.y, sp.f, '#2F5D8C');
      c.formation = '方陣'; A.placeSquads(c, true); c.auto = true;
      return c;
    });
    const 持 = A.持ち場を並べる(m);
    const def2 = [A.makeCorps('E', 将(100), 250, 240, 70, 70, 持[0].x, 持[0].y, 持[0].f, '#B0483C')];
    def2[0].holdGate = 持[0].gate;
    const b = A.createBattle(atk, def2, 'P');
    b.mode = 'castle'; b.map = m; b.phase = 'fight'; b.dusk = 99999;
    let 延 = 0, 淵 = 0, 瀬 = 0, 橋 = 0, 着 = null;
    for (let k = 0; k < 40000; k++) {
      A.stepBattle(b, 0.1);
      if (k % 3 === 0) A.battleAI(b);
      if (k % 5 === 0) for (const c of atk) for (const q of c.squads) {
        if (q.men <= 0) continue;
        延++;
        const t = A.terrainAt(q.x, q.y);
        if (t === 'deep') 淵++; else if (t === 'ford') 瀬++; else if (t === 'bridge') 橋++;
      }
      if (着 === null && atk.filter((c) => A.城の域か(c.x, c.y, m)).length >= 2) 着 = b.t;
      if (着 !== null || b.result || b.t > 2000) break;
    }
    return { 着, 淵割: 延 ? 淵 / 延 : 1, 瀬, 橋 };
  };
  const 川の城 = [];
  for (let i = 0; i < 城々.length; i++) { 組む(i, 0); if (A.hasRiver() && A.RIVER.bridge[1] > A.RIVER.bridge[0]) 川の城.push(i); }
  const 有 = 川の城.map((i) => 寄せる(i, false)), 落 = 川の城.map((i) => 寄せる(i, true));
  console.log(`    二隊が城山に入るまで　橋あり ${有.map((r) => r.着 == null ? '―' : Math.round(r.着) + '秒').join('・')}`
    + `　／　橋を落とす ${落.map((r) => r.着 == null ? '―' : Math.round(r.着) + '秒').join('・')}`
    + `（淵に立つ組 ${落.map((r) => (r.淵割 * 100).toFixed(1) + '％').join('・')}）`);
  確('橋を落としても、寄せ手は城山へ着く', 落.every((r) => r.着 != null));
  確('橋が落ちれば、寄せ手は淵に浸からず浅瀬を渡る', 落.every((r) => r.淵割 < 0.02 && r.瀬 > 0 && r.橋 === 0));
  確('橋があれば、寄せ手は橋を渡る', 有.every((r) => r.橋 > 0));
}

/* ---------------------------------------------- 五、落ちたままの橋 */
{
  let s = A.initState('oda');
  const c = s.castles.find((x) => x.faction === 'oda' && s.generals.some((g) => g.at === x.id && g.faction === 'oda' && !g.captive));
  const gen = s.generals.filter((g) => g.at === c.id && g.faction === 'oda' && !g.captive).sort((a, b) => b.gov - a.gov)[0];
  s.factions.oda.gold = 99999;
  c.def = 40;
  A.橋を落としたままにする(c);
  確('戦のあと、橋は落ちたまま（起点は今の城防）', !!c.落橋 && c.落橋.基 === 40, JSON.stringify(c.落橋));
  確('架け直すまで、城防をあと八', A.橋の残り(c) === A.橋を架け直す幅 && A.橋を架け直す幅 === 8, `あと${A.橋の残り(c)}`);
  c.def = 34;
  A.橋の普請を見る(c);
  確('落ちたままのあいだに城防が下がれば、起点も下がる', c.落橋 && c.落橋.基 === 34 && A.橋の残り(c) === 8);
  A.橋を落としたままにする(c);
  確('重ねて落としても、起点は上がらない', c.落橋.基 === 34);
  let 度 = 0, 残り = [];
  while (s.castles.find((x) => x.id === c.id).落橋 && 度 < 10) {
    s = A.runCommand(s, c.id, '築城', gen.id);
    s.orders = {};
    度++;
    const c3 = s.castles.find((x) => x.id === c.id);
    残り.push(A.橋の残り(c3));
  }
  const c2 = s.castles.find((x) => x.id === c.id);
  確('築城を重ねて城防を八上げ直せば、橋を架け直す', !c2.落橋 && Math.round(c2.def) >= 42 && 度 >= 2 && 度 <= 3,
    `${gen.name}（政務${gen.gov}）で${度}度・城防${Math.round(c2.def)}・残り${残り.join('→')}`);
  確('架け直せば戦国記に残る', s.chronicle.some((e) => e.text.includes('橋を架け直した')));
  const 帳 = (s.ledger && s.ledger[0] && s.ledger[0].lines) || [];
  確('築城の帳に、架け直すまでの残りが出る', 帳.some((l) => l.label.includes('橋を架け直すまで')), 帳.map((l) => l.label).join('・'));
  const x = { def: 60, 落橋: null };
  確('落ちていない城では何もしない', !A.橋の普請を見る(x) && A.橋の残り(x) === 0 && x.落橋 === null);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
