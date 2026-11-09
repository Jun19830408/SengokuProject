/* 城攻めの攻め口の振り分け（battle/castleMap.js 攻め口を割り振る・engine.js 攻め口を保つ・ai.js の寄せ手）。

   遊ぶ側の申し出は「城攻めのとき、城門が複数ある場合（それぞれの段ごと）、武将が複数いるので
   あれば、満遍なく城門ごとに攻めるように移動させてください」であった。もとは engine が道のりに
   「向かう隊の数×九百歩」を足して門を選び、采配（ai.js）は道順が尽きるたびにいちばん近い門を
   引き直していた。遠い門へは隊が回らず、回った隊も近い門の列へ引き戻された。
   ここで確かめること。
     一、割り振り … いま攻められる輪の門へ、向かう隊の少ない門から割り振る。門ごとの隊の数の
                     差は一つまで。門から見て近い隊を引き当てる（行き違わない）
     二、内の段へ … 外の門が一つ破れて内の輪へ進めるようになったら、取り付いて門を破っている隊の
                     ほかは、内の輪の門から選び直す（内の輪の門にも満遍なく分かれる）。遊ぶ側が
                     手ずから門を命じた隊は、その門が破れるまで向かい続ける
     三、采配     … 采配の寄せ手は割り振られた門へ向かう。近い門の列に吸い寄せられて待たない */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'kubari-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { buildCastleMap, layoutCastleField, setBattleMap, 寄せ手の陣, gatePos, 門の輪, 門の控え口, 攻め口を割り振る, 攻め口を選ぶ, 攻める輪 } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen } from "../src/battle/corps.js";\n'
+ 'export { createBattle, stepBattle } from "../src/battle/engine.js";\n'
+ 'export { FIELD, fieldScale, setFieldKind } from "../src/battle/field.js";\n');
const out = path.join(ROOT, 'build', 'kubari.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x6b62;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 64, valor: 62, wit: 58, gov: 55, retinue: 300, retTrain: 70, unity: 60 });
const 清洲の盤 = () => {
  A.setFieldKind('街道');
  const m = A.layoutCastleField(A.buildCastleMap({ id: 'kiyosu', name: '清洲城', def: 54, local: 1200, localTrain: 70, najimi: 70, rost: null }),
    { 広く: true, 城id: 'kiyosu', 種: 0xdeadbeef });
  A.setBattleMap(m);
  return m;
};
const 門の所 = (m, g) => A.gatePos(m, A.門の輪(m, g), g);
const 数える = (隊ら, 門ら) => 門ら.map((g) => 隊ら.filter((c) => c.gate === g).length);
const 隊 = (side, i, x, y) => {
  const c = A.makeCorps(side, 将(i), 300, 600, 75, 75, x, y, 0, side === 'E' ? '#B0483C' : '#2F5D8C');
  c.formation = '方陣'; A.placeSquads(c, true);
  return c;
};

console.log('■ 一、割り振り');
{
  const m = 清洲の盤();
  const 外 = m.gates.filter((g) => g.layer === 0);
  const atk = [...Array(7).keys()].map((k) => { const sp = A.寄せ手の陣(m, k, 7); return 隊('E', k, sp.x, sp.y); });
  const 決 = A.攻め口を割り振る(m, atk, atk);
  for (const c of atk) c.gate = 決.get(c);
  const 数 = 数える(atk, 外);
  確('七隊を外の三つの門へ割り振ると、門ごとの隊の数の差は一つまで', Math.max(...数) - Math.min(...数) <= 1 && 数.every((n) => n > 0),
    外.map((g, i) => `${g.key}${数[i]}隊`).join('・'));
  for (const c of atk) c.gate = null;
  for (const c of atk) c.gate = A.攻め口を選ぶ(m, c, atk);
  const 数2 = 数える(atk, 外);
  確('一隊ずつ選ばせても（攻め口を選ぶ）差は一つまで', Math.max(...数2) - Math.min(...数2) <= 1,
    外.map((g, i) => `${g.key}${数2[i]}隊`).join('・'));
  確('攻め口は外の輪の門から選ぶ（内の門へは、外が破れてから）', atk.every((c) => c.gate && c.gate.layer === 0));
  /* 門の外側に一隊ずつ置く。並びの順を変えても、どの隊も目の前の門へ割り振られる */
  const 外へ = (g, 足) => {
    const p = 門の所(m, g);
    const dx = p.x - m.cx, dy = p.y - m.cy, d = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / d) * 足, y: p.y + (dy / d) * 足 };
  };
  const 前 = 外.map((g, i) => { const p = 外へ(g, 420); const c = 隊('E', 20 + i, p.x, p.y); c.前の門 = g; return c; });
  const 決1 = A.攻め口を割り振る(m, 前, 前);
  const 決2 = A.攻め口を割り振る(m, [...前].reverse(), 前);
  確('門の前に一隊ずつ置けば、どの隊も目の前の門へ（行き違わない）',
    前.every((c) => 決1.get(c) === c.前の門) && 前.every((c) => 決2.get(c) === c.前の門),
    前.map((c) => `${c.前の門.key}の前→${決1.get(c).key}`).join('・'));
}

console.log('■ 二、内の段へ');
{
  const m = 清洲の盤();
  const 外 = m.gates.filter((g) => g.layer === 0);
  const 内 = m.gates.filter((g) => g.layer === 1);
  const 大手 = 外.find((g) => g.key.includes('大手')) || 外[0];
  const 東 = 外.find((g) => g.key.includes('東')), 北 = 外.find((g) => g.key.includes('搦手'));
  const 本丸 = m.layers[m.layers.length - 1];
  /* 大手門が破れた。東の門には取り付いて破っている隊と、その列に控える隊、北の門へは道中の隊 */
  大手.hp = 0; 大手.broken = true;
  確('大手門が破れれば、いま攻められる輪は二の丸', A.攻める輪(m) === 1);
  const p東 = 門の所(m, 東), p北 = 門の所(m, 北);
  const 取付 = 隊('E', 1, p東.x + (p東.x - m.cx) * 0.06, p東.y + (p東.y - m.cy) * 0.06);
  const 控え = 隊('E', 2, p東.x + (p東.x - m.cx) * 0.4, p東.y + (p東.y - m.cy) * 0.4);
  const 道中 = 隊('E', 3, p北.x + (p北.x - m.cx) * 1.2, p北.y + (p北.y - m.cy) * 1.2);
  取付.gate = 東; 控え.gate = 東; 道中.gate = 北;
  const atk = [取付, 控え, 道中];
  const d = A.makeCorps('P', { id: 'g9', name: '城の将', lead: 50, valor: 50, wit: 50, gov: 50, retinue: 30, retTrain: 60 }, 30, 0, 60, 60,
    m.cx + (本丸.ox || 0), m.cy + (本丸.oy || 0), 0, '#2F5D8C');
  d.auto = false; d.order = '待機';
  const b = A.createBattle([d], atk, 'E');
  b.mode = 'castle'; b.map = m; b.phase = 'fight'; b.日数 = 3; b.日 = 1; b.日の始め = 0; b.dusk = 99999; b.日の長さ = 99999; b.鼓舞なし = true;
  for (const f of m.fac) if (f.kind === '矢倉') f.hp = 0;
  A.stepBattle(b, 0.05);
  確('東の門に取り付いて破っている隊は、そのまま東の門を破る', 取付.gate === 東, `${取付.gate && 取付.gate.key}`);
  確('東の門の列に控えていた隊は、二の丸の門へ選び直す', !!控え.gate && 控え.gate.layer === 1, `${控え.gate && 控え.gate.key}`);
  確('北の門へ向かう道中の隊も、二の丸の門へ選び直す', !!道中.gate && 道中.gate.layer === 1, `${道中.gate && 道中.gate.key}`);
  確('二の丸の門にも満遍なく分かれる（二隊なら一隊ずつ）', 控え.gate && 道中.gate && 控え.gate !== 道中.gate,
    内.map((g) => `${g.key}${[控え, 道中].filter((c) => c.gate === g).length}隊`).join('・'));

  /* 遊ぶ側が手ずから北の門を命じた隊（委任していない）。別の盤で、遊ぶ側を寄せ手にして見る */
  const m2 = 清洲の盤();
  const 外2 = m2.gates.filter((g) => g.layer === 0);
  const 大手2 = 外2.find((g) => g.key.includes('大手')) || 外2[0];
  const 北2 = 外2.find((g) => g.key.includes('搦手'));
  大手2.hp = 0; 大手2.broken = true;
  const p北2 = 門の所(m2, 北2);
  const 手 = 隊('P', 5, p北2.x + (p北2.x - m2.cx) * 1.3, p北2.y + (p北2.y - m2.cy) * 1.3);
  手.auto = false; 手.siegeAuto = true; 手.gate = 北2;
  const d2 = A.makeCorps('E', { id: 'g8', name: '城の将', lead: 50, valor: 50, wit: 50, gov: 50, retinue: 30, retTrain: 60 }, 30, 0, 60, 60,
    m2.cx, m2.cy, 0, '#B0483C');
  d2.auto = false; d2.order = '待機';
  const b2 = A.createBattle([手], [d2], 'P');
  b2.mode = 'castle'; b2.map = m2; b2.phase = 'fight'; b2.日数 = 3; b2.日 = 1; b2.日の始め = 0; b2.dusk = 99999; b2.日の長さ = 99999; b2.鼓舞なし = true;
  for (const f of m2.fac) if (f.kind === '矢倉') f.hp = 0;
  A.stepBattle(b2, 0.05);
  確('遊ぶ側が手ずから門を命じた隊は、その門が破れるまで向かい続ける', 手.gate === 北2, `${手.gate && 手.gate.key}`);
}

console.log('■ 三、采配');
{
  const m = 清洲の盤();
  const 外 = m.gates.filter((g) => g.layer === 0);
  const 大手 = 外.find((g) => g.key.includes('大手')) || 外[0];
  const 東 = 外.find((g) => g.key.includes('東'));
  const 本丸 = m.layers[m.layers.length - 1];
  /* 大手門には先客が取り付いている。もう一隊は東の門へ割り振られているが、いまは大手門の列の
     先頭の所に立っている（道順は尽きた）。もとの采配は、ここでいちばん近い大手門の列に並んで待った */
  const p大 = 門の所(m, 大手);
  const 先客 = 隊('E', 1, p大.x + (p大.x - m.cx) * 0.05, p大.y + (p大.y - m.cy) * 0.05);
  先客.gate = 大手;
  const 控 = A.門の控え口(m, A.門の輪(m, 大手), 大手, 0);
  const 東へ = 隊('E', 2, 控.x, 控.y);
  東へ.gate = 東; 東へ.wp = null;
  const d = A.makeCorps('P', { id: 'g9', name: '城の将', lead: 50, valor: 50, wit: 50, gov: 50, retinue: 30, retTrain: 60 }, 30, 0, 60, 60,
    m.cx + (本丸.ox || 0), m.cy + (本丸.oy || 0), 0, '#2F5D8C');
  d.auto = false; d.order = '待機';
  const b = A.createBattle([d], [先客, 東へ], 'E');
  b.mode = 'castle'; b.map = m; b.phase = 'fight'; b.日数 = 3; b.日 = 1; b.日の始め = 0; b.dusk = 99999; b.日の長さ = 99999; b.鼓舞なし = true;
  for (const f of m.fac) if (f.kind === '矢倉') f.hp = 0;
  const p東 = 門の所(m, 東);
  const 始め = Math.hypot(東へ.x - p東.x, 東へ.y - p東.y);
  let 待った = 0;
  for (let t = 0; t < 40; t += 0.05) {
    A.stepBattle(b, 0.05);
    if (東へ.order === '待機' && Math.hypot(東へ.x - 控.x, 東へ.y - 控.y) < 60) 待った += 0.05;
  }
  const 後 = Math.hypot(東へ.x - p東.x, 東へ.y - p東.y);
  確('大手門に先客がいても、東の門へ割り振られた隊は東の門へ向かう', 東へ.gate === 東 && 後 < 始め * 0.6,
    `東の門まで ${Math.round(始め)}歩 → ${Math.round(後)}歩`);
  確('大手門の列に吸い寄せられて待たない', 待った < 3, `大手門の列で待った刻 ${待った.toFixed(1)}秒`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
