/* 城攻めの攻め口と矢倉（battle/engine.js 攻め口を選ぶ・城から射かける矢玉・控えの陰）。

   遊ぶ側の申し出は「城が強行で落とすのが困難」「特に城攻めでは敗走、撤退してしまい城攻めが
   さらに難しくなっている」であった（清洲城を七千で攻め、千五百の城方に一日目で落とせず、二日目で
   兵糧攻めに移った）。同じ形を組んで測ると、采配の寄せ手七隊がみな大手門ひとつに並び、門に
   取り付く前に矢倉の矢玉で二割三割を失って引き鉦を打っていた。門は二日で一つも破れなかった。
   ここで確かめること。
     一、攻め口   … 采配の寄せ手は外の門に分かれて攻め寄せる（いちばん近い門なら七隊がみな同じ門）
     二、矢倉     … 矢倉は己の曲輪の外の敵だけを射る（曲輪の内に入った敵には射かけない）
     三、控えの陰 … 門の順を待つ隊は竹束と仕寄りの陰に控え、浴びる矢玉は三割五分
     四、清洲城   … 采配に委ねて七千で千五百の清洲城を攻めれば、三日のうちに落ちる。寄せ手の損は
                     半ばに届かない */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'semeguchi-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { buildCastleMap, layoutCastleField, setBattleMap, 寄せ手の陣, 付城を据える, SIEGE_CORPS_CAP, nearestOpenGate, inLayer } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen, 寄せ手の隊数 } from "../src/battle/corps.js";\n'
+ 'export { createBattle, stepBattle, 夜を明かす, 寄せ手の夜の思案, 兵糧攻めに移る, 城攻めの日数, 攻め口を選ぶ, 控えの陰 } from "../src/battle/engine.js";\n'
+ 'export { FIELD, fieldScale, setFieldKind, setFieldSeed, 橋を落とす, MAX_CORPS } from "../src/battle/field.js";\n'
+ 'export { 城方の隊を立てる } from "../src/battle/defense.js";\n'
+ 'export { 天守を見る } from "../src/data/tenshu.js";\n'
+ 'export { roadBetween } from "../src/core/paths.js";\n'
+ 'export { initState } from "../src/core/state.js";\n');
const out = path.join(ROOT, 'build', 'semeguchi.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x5e9c;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const 将 = (i, 器 = 62) => ({ id: `g${i}`, name: `将${i}`, lead: 器 + 2, valor: 器, wit: 58, gov: 55, retinue: 400, retTrain: 70, unity: 60 });
const 清洲の盤 = () => {
  A.setFieldKind('街道');
  const m = A.layoutCastleField(A.buildCastleMap({ id: 'kiyosu', name: '清洲城', def: 54, local: 1200, localTrain: 70, najimi: 70, rost: null }),
    { 広く: true, 城id: 'kiyosu', 種: 0xdeadbeef });
  A.setBattleMap(m);
  return m;
};

console.log('■ 一、攻め口');
{
  const m = 清洲の盤();
  const atk = [...Array(7).keys()].map((k) => {
    const sp = A.寄せ手の陣(m, k, 7);
    return A.makeCorps('E', 将(k), 400, 600, 75, 75, sp.x, sp.y, sp.f, '#2F5D8C');
  });
  const 近い = new Set(atk.map((c) => A.nearestOpenGate(m, c.x, c.y)));
  確('いちばん近い門なら、七隊がみな同じ門に並ぶ（もとの選び方）', 近い.size === 1, `${[...近い].map((g) => g.key).join('・')}`);
  for (const c of atk) c.gate = A.攻め口を選ぶ(m, c, atk);
  const 数 = new Map();
  for (const c of atk) 数.set(c.gate.key, (数.get(c.gate.key) || 0) + 1);
  const 外 = m.gates.filter((g) => g.layer === 0 && !g.出城);
  確('采配の寄せ手は、外の門のどれにも分かれて攻め寄せる', 外.every((g) => 数.get(g.key) > 0),
    [...数].map(([k, n]) => `${k}${n}隊`).join('・'));
  確('一つの門に隊を偏らせない（多くて四隊）', Math.max(...数.values()) <= 4);
  確('攻め口は外の輪の門から選ぶ（内の門へは、外が破れてから）', atk.every((c) => c.gate.layer === 0));
}

/* 矢倉が一度射るかを見る。他の矢倉と狭間は黙らせ、狙う矢倉の冷えを零にして一刻だけ進める */
function 一度射るか(m, 矢倉, x, y, 控え = 0) {
  const 寄 = A.makeCorps('P', 将(1), 0, 600, 75, 75, x, y, 0, '#2F5D8C');
  寄.auto = false; 寄.order = '待機'; 寄.gate待ち = 控え;
  const 本丸 = m.layers[m.layers.length - 1];
  const 受 = A.makeCorps('E', 将(90), 0, 300, 72, 72, m.cx, m.cy, 0, '#B0483C');
  受.auto = false; 受.order = '待機'; 受.狭間 = 9999;
  const b = A.createBattle([寄], [受], 'P');
  b.attacker = 'P'; b.mode = 'castle'; b.map = m; b.phase = 'fight'; b.鼓舞なし = true;
  b.日数 = 3; b.日 = 1; b.日の始め = 0; b.dusk = 99999; b.日の長さ = 99999;
  for (const f of m.fac) f.cool = f === 矢倉 ? 0 : 9999;
  const 前 = A.corpsMen(寄);
  A.stepBattle(b, 0.02);
  return { 射た: 矢倉.cool > 0, 損: 前 - A.corpsMen(寄), 本丸 };
}

console.log('■ 二、矢倉');
{
  const m = 清洲の盤();
  const 外の矢倉 = m.fac.find((f) => f.kind === '矢倉' && f.layer === 0 && !f.出城);
  const ux = 外の矢倉.x - m.cx, uy = 外の矢倉.y - m.cy, ul = Math.hypot(ux, uy) || 1;
  const 内 = { x: 外の矢倉.x - (ux / ul) * 60, y: 外の矢倉.y - (uy / ul) * 60 };
  const 外 = { x: 外の矢倉.x + (ux / ul) * 70, y: 外の矢倉.y + (uy / ul) * 70 };
  確('試しの場（内の所は曲輪の内、外の所は曲輪の外）', A.inLayer(m, m.layers[0], 内.x, 内.y) && !A.inLayer(m, m.layers[0], 外.x, 外.y));
  const 外で = 一度射るか(m, 外の矢倉, 外.x, 外.y);
  確('曲輪の外へ寄せてくる敵は射る', 外で.射た && 外で.損 > 0, `損 ${Math.round(外で.損)}人`);
  const m2 = 清洲の盤();
  const 外の矢倉2 = m2.fac.find((f) => f.kind === '矢倉' && f.layer === 0 && !f.出城);
  const 内で = 一度射るか(m2, 外の矢倉2, 内.x, 内.y);
  確('己の曲輪の内に入った敵には射かけない（槍と刀の間合い）', !内で.射た && 内で.損 === 0, `損 ${Math.round(内で.損)}人`);
}

console.log('■ 三、控えの陰');
{
  const m = 清洲の盤();
  const 外の矢倉 = m.fac.find((f) => f.kind === '矢倉' && f.layer === 0 && !f.出城);
  const ux = 外の矢倉.x - m.cx, uy = 外の矢倉.y - m.cy, ul = Math.hypot(ux, uy) || 1;
  const 外 = { x: 外の矢倉.x + (ux / ul) * 70, y: 外の矢倉.y + (uy / ul) * 70 };
  const 素 = 一度射るか(m, 外の矢倉, 外.x, 外.y, 0);
  const m2 = 清洲の盤();
  const 外の矢倉2 = m2.fac.find((f) => f.kind === '矢倉' && f.layer === 0 && !f.出城);
  const 陰 = 一度射るか(m2, 外の矢倉2, 外.x, 外.y, 1);
  確('門の順を待つ隊が浴びる矢玉は三割五分', 素.損 > 0 && Math.abs(陰.損 / 素.損 - A.控えの陰) < 0.06,
    `${Math.round(陰.損)}人／${Math.round(素.損)}人（控えの陰 ${A.控えの陰}）`);
}

console.log('■ 四、清洲城（遊ぶ側の申し出の形）');
{
  /* 始めの盤の清洲城。城下の野戦に敗れて城兵が千五百に減った形にし、那古野城の織田勢七千が
     攻める。遊びの城攻めの組み方（ui/MapScreen.jsx startAssault）のとおりに組み、采配に委ねる */
  const 攻める = (k) => {
    種 = 0x777 + k * 7919;
    const s = A.initState('oda');
    const castle = s.castles.find((x) => x.id === 'kiyosu');
    const defGens = s.generals.filter((x) => x.at === castle.id && x.faction === castle.faction && !x.captive);
    const 総0 = castle.local + defGens.reduce((a, x) => a + (x.retinue || 0), 0);
    const 縮 = 1500 / 総0;
    castle.local = Math.round(castle.local * 縮); castle.rost = null;
    for (const g of defGens) { g.retinue = Math.round(g.retinue * 縮); g.rost = null; }
    const 名ら = ['織田信秀', '織田信長', '織田信光', '佐久間信盛', '佐々隼人正', '柴田勝家', '森可成'];
    let atkGens = 名ら.map((n) => s.generals.find((x) => x.name === n && !x.captive)).filter(Boolean);
    if (atkGens.length < 7) atkGens = [...atkGens, ...s.generals.filter((x) => x.at === 'nagoya' && !atkGens.includes(x))].slice(0, 7);
    const 手 = atkGens.reduce((a, x) => a + (x.retinue || 0), 0);
    const army = { from: 'nagoya', local: Math.max(0, 7000 - 手), localTrain: 66, men: 7000 };
    A.setFieldSeed(army.from, castle.id);
    { const r = A.roadBetween(army.from, castle.id); A.setFieldKind(r ? r[3] : '街道'); }
    const map = A.layoutCastleField(A.buildCastleMap(castle), { 広く: true, 城id: castle.id });
    map.天守 = A.天守を見る(s, castle);
    A.setBattleMap(map);
    A.橋を落とす();
    A.付城を据える(map, 0);
    const nAtk = A.寄せ手の隊数(atkGens.length, army.local + 手, A.SIEGE_CORPS_CAP, A.MAX_CORPS);
    const 寄せ手ら = atkGens.slice(0, nAtk);
    const per = Math.floor(Math.min(army.local, Math.max(0, A.SIEGE_CORPS_CAP * nAtk - 手)) / 寄せ手ら.length);
    const atk = 寄せ手ら.map((gen, i) => {
      const sp = A.寄せ手の陣(map, i, 寄せ手ら.length);
      const c = A.makeCorps('P', { ...gen, locRost: null }, gen.retinue, per, Math.round(gen.retTrain * 0.7 + (gen.unity || 60) * 0.3),
        Math.round(army.localTrain * 0.7 + (castle.najimi == null ? 70 : castle.najimi) * 0.3), sp.x, sp.y, sp.f, '#2F5D8C');
      c.formation = '方陣'; A.placeSquads(c, true); c.auto = true;
      return c;
    });
    const def = A.城方の隊を立てる(s, castle, map, { defGens, 割り付け: null, side: 'E', color: '#B0483C' });
    const b = A.createBattle(atk, def, 'P');
    b.mode = 'castle'; b.map = map; b.委ねた = true; b.phase = 'fight'; b.sortie = false;
    b.日の長さ = Math.round(1080 * Math.max(1, Math.min(3.2, Math.pow((map.旧 ? map.旧.w : A.FIELD.w) / 1600, 0.62))));
    b.dusk = b.日の長さ + Math.round((A.FIELD.h - map.cy) / (34 * A.fieldScale()) * 2.2);
    b.寄せの刻 = b.dusk - b.日の長さ;
    b.日数 = A.城攻めの日数; b.日 = 1; b.日の始め = 0;
    const 初 = atk.reduce((a, c) => a + A.corpsMen(c), 0);
    for (let st = 0; st < 2000000 && b.phase !== 'over' && !b.result; st++) {
      if (b.phase === 'night') {
        if (A.寄せ手の夜の思案(b) === '退く') { A.兵糧攻めに移る(b); break; }
        A.夜を明かす(b);
        continue;
      }
      A.stepBattle(b, 0.05);
    }
    const 残 = atk.reduce((a, c) => a + (c.dead || c.destroyed ? 0 : A.corpsMen(c)), 0);
    return { 落: b.result === 'P' || !!b.captured, 日: b.日 || 1, 損: 1 - 残 / 初 };
  };
  const 結果 = [0, 1].map(攻める);
  確('七千で千五百の清洲城を攻めれば、三日のうちに落ちる', 結果.every((r) => r.落),
    結果.map((r) => r.落 ? `${r.日}日目に落城・寄せ手の損${Math.round(r.損 * 100)}％` : `保つ・寄せ手の損${Math.round(r.損 * 100)}％`).join('／'));
  確('寄せ手の損は半ばに届かない', 結果.every((r) => r.損 < 0.5), 結果.map((r) => `${Math.round(r.損 * 100)}％`).join('・'));
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
