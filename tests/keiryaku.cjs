/* 城攻めの三つの計略と、囲みの輪の試験（GDD 9.4 / 11.2）。

   遊ぶ側の申し出は「計略として、内応（事前の調略必要）、水の手、焼き働きの三つを用意して、
   内応は寝返ってその場で相手側に色が変わり相手方の軍になる（もちろん、指示も相手方にうつる）、
   水の手は上手くいけば士気が減る、焼き働きは上手くいけば兵と士気、防御力が減る。大幅に
   減らすと良くないが、ややこしくならないようにある程度一律に、仕掛ける武将の能力値によって
   減らしていくのがいい」と「イ（後詰）とハ（囲みの輪）は入れたい」であった。確かめること。
     一、見込みと減り … 成る見込みは仕掛け手と城方の目付の知略の差で決まり、一割五分から
                        八割五分に収まる。井戸の傷んだ城は水の手が断ちやすい。減り方は
                        仕掛け手の知略だけで決まり、控えめである
     二、仕掛ける     … 水の手は城兵の士気を、焼き働きは城兵の兵と士気、門と櫓を減らす。
                        しくじれば仕掛けた隊が少し損をする。一日に一度ずつで、夜を越せばまた
                        仕掛けられる。内応は密約が無ければ仕掛けられず、密約があれば旗も
                        色も下知も寄せ手へ移る。采配の寄せ手も、知略のある将がいれば仕掛ける
     三、囲みの輪     … 四方を寄せ手が押さえれば囲み四方。城が傾けば城兵は死兵となり、士気で
                        崩れない。一方でも空いていれば、崩れて気の尽きた城兵はそこから
                        落ち延びて盤を去る */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'keiryaku-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { buildCastleMap, layoutCastleField, setBattleMap, 寄せ手の陣 } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen, 内応させる } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle, stepBattle, 夜を明かす, 囲みを測る, 囲みの方ら } from "../src/battle/engine.js";\n'
+ 'export { 計略を仕掛ける, 計略の見込み, 計略の減り, 采配の計略, 仕掛けた, 内応の者 } from "../src/battle/keiryaku.js";\n'
+ 'export { FIELD, fieldScale, setFieldKind } from "../src/battle/field.js";\n'
+ 'export { 持ち場を並べる } from "../src/battle/defense.js";\n');
const out = path.join(ROOT, 'build', 'keiryaku.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x6b6b;
const 賽 = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
Math.random = 賽;
/* 賽を一度だけ決め打ちにして仕掛ける（成るか否かを選ぶ） */
const 決めて = (値, f) => { Math.random = () => 値; try { return f(); } finally { Math.random = 賽; } };

const 将 = (i, o = {}) => ({ id: `g${i}`, name: `将${i}`, lead: 62, valor: 60, wit: 58, gov: 55,
  retinue: 400, retTrain: 70, unity: 60, ...o });

/* 城攻めの盤を仕立てる。寄せ手は四隊（遊ぶ側か采配か）、城方は持ち場ごとに一隊 */
function 仕立てる({ 寄せ手 = 'P', 寄知 = [80, 60, 50, 40], 城知 = 40, 種の野 = 0x9e3779b1 } = {}) {
  A.setFieldKind('街道');
  const castle = { id: 'kiyosu', name: '清洲城', def: 60, local: 1600, localTrain: 70, najimi: 70, rost: null, 出城: null };
  const m = A.layoutCastleField(A.buildCastleMap(castle), { 広く: true, 城id: 'kiyosu', 種: 種の野 });
  A.setBattleMap(m);
  const 城側 = 寄せ手 === 'P' ? 'E' : 'P';
  const atk = 寄知.map((w, k) => {
    const sp = A.寄せ手の陣(m, k, 寄知.length);
    const c = A.makeCorps(寄せ手, 将(k, { wit: w }), 400, 1600, 72, 72, sp.x, sp.y, sp.f, '#2F5D8C');
    c.auto = true; return c;
  });
  const 持 = A.持ち場を並べる(m).filter((p) => p.gate).slice(0, 4);
  const def = 持.map((p, k) => {
    const c = A.makeCorps(城側, 将(100 + k, { wit: 城知 }), 300, 500, 70, 70, p.x, p.y, p.f, '#B0483C');
    c.holdGate = p.gate; return c;
  });
  const b = A.createBattle(寄せ手 === 'P' ? atk : def, 寄せ手 === 'P' ? def : atk, 寄せ手);
  b.mode = 'castle'; b.map = m; b.phase = 'fight';
  b.日の長さ = 900; b.dusk = 900; b.日数 = 3; b.日 = 1; b.日の始め = 0; b.城の井戸 = 100;
  return { b, m, atk, def };
}
const 兵 = (c) => A.corpsMen(c);

/* ---------------------------------------------- 一、見込みと減り */
console.log('── 一　成る見込みと減り方');
{
  const 隊 = (side, wit, 守備隊) => ({ side, gen: { wit }, squads: [], 守備隊: !!守備隊, dead: false });
  const 盤 = (寄知, 城知, 井戸 = 100) => ({ attacker: 'P', 城の井戸: 井戸,
    corps: [隊('P', 寄知), 隊('E', 城知), 隊('E', 99, true)] });
  const 見 = (寄知, 城知, kind = '焼き働き', 井戸) => { const b = 盤(寄知, 城知, 井戸); return A.計略の見込み(b, kind, b.corps[0]); };
  確('知略の差で見込みが決まる（八十対四十なら七割八分ほど）', Math.abs(見(80, 40) - (0.45 + 40 / 120)) < 1e-9, 見(80, 40).toFixed(3));
  確('見込みは八割五分を超えない', 見(100, 10) === 0.85);
  確('見込みは一割五分を下らない', 見(10, 100) === 0.15);
  確('城方の目付は、名も無き守備隊を数えない（知略九十九の守備隊がいても下がらない）', Math.abs(見(60, 40) - (0.45 + 20 / 120)) < 1e-9);
  確('井戸の傷んだ城（六十未満）は、水の手が一割五分断ちやすい',
    Math.abs(見(60, 60, '水の手', 50) - 見(60, 60, '水の手', 100) - 0.15) < 1e-9 && 見(60, 60, '焼き働き', 50) === 見(60, 60, '焼き働き', 100));
  確('内応は密約があれば必ず成る', A.計略の見込み(盤(10, 99), '内応', { gen: { wit: 10 } }) === 1);
  const 水 = (w) => A.計略の減り('水の手', { gen: { wit: w } }), 焼 = (w) => A.計略の減り('焼き働き', { gen: { wit: w } });
  確('水の手の減りは知略で決まる（五十で十一、百で十六、三十以下は九）', 水(50).士気 === 11 && 水(100).士気 === 16 && 水(20).士気 === 9,
    `${水(20).士気}・${水(50).士気}・${水(100).士気}`);
  確('焼き働きの減りは控えめ（知略百でも兵三分五厘・士気九・門一割四分・櫓一割六分）',
    Math.abs(焼(100).兵 - 0.035) < 1e-9 && 焼(100).士気 === 9 && Math.abs(焼(100).門 - 0.14) < 1e-9 && Math.abs(焼(100).櫓 - 0.16) < 1e-9);
}

/* ---------------------------------------------- 二、仕掛ける */
console.log('── 二　計略を仕掛ける');
{
  const { b, m, atk, def } = 仕立てる();
  const 気 = () => def.map((c) => c.morale);
  const 前 = 気();
  const r1 = 決めて(0.01, () => A.計略を仕掛ける(b, '水の手', null));
  const 減 = A.計略の減り('水の手', atk[0]);
  確('水の手が成れば、城兵の士気が知略なりに落ちる', r1.ok && r1.成 && def.every((c, k) => Math.abs(c.morale - Math.max(0, 前[k] - 減.士気)) < 1e-9),
    r1.文);
  確('仕掛けるのは寄せ手でいちばん知略の高い将', /将0/.test(r1.文));
  確('水の手を断った数を控える（戦のあと城の井戸が傷む）', b.水の手 === 1);
  const r2 = 決めて(0.01, () => A.計略を仕掛ける(b, '水の手', null));
  確('水の手は一日に一度', !r2.ok && /今日はもう/.test(r2.文), r2.文);
  // 焼き働き
  const 兵前 = def.map(兵), 門前 = m.gates.map((g) => g.hp), 櫓前 = m.fac.map((f) => f.hp), 気前 = 気();
  const r3 = 決めて(0.01, () => A.計略を仕掛ける(b, '焼き働き', null));
  const 減3 = A.計略の減り('焼き働き', atk[0]);
  const 兵後 = def.map(兵);
  確('焼き働きが成れば、城兵の兵と士気が減る',
    r3.ok && r3.成 && 兵後.every((v, k) => v < 兵前[k] && v >= 兵前[k] * (1 - 減3.兵) - def[k].squads.length) && def.every((c, k) => c.morale < 気前[k]),
    r3.文);
  確('焼き働きで門と櫓が傷む（割で減り、焼け落ちはしない）',
    m.gates.every((g, k) => g.broken || (g.hp < 門前[k] && g.hp >= 1)) && m.fac.every((f, k) => f.hp <= 0 || (f.hp < 櫓前[k] && f.hp >= 1)));
  const 兵の減り = 兵前.reduce((a, v) => a + v, 0) - 兵後.reduce((a, v) => a + v, 0);
  確('減りは大きすぎない（城兵の五分の内）', 兵の減り <= 兵前.reduce((a, v) => a + v, 0) * 0.05,
    `${兵の減り}人／${兵前.reduce((a, v) => a + v, 0)}人`);
  // しくじり
  const { b: b2, atk: atk2, def: def2 } = 仕立てる();
  const 仕兵 = 兵(atk2[0]), 仕気 = atk2[0].morale, 城気 = def2.map((c) => c.morale);
  const r4 = 決めて(0.999, () => A.計略を仕掛ける(b2, '焼き働き', null));
  確('しくじれば、仕掛けた隊が二分の兵と三の士気を失い、城方は無傷', r4.ok && !r4.成 && 兵(atk2[0]) < 仕兵 && 兵(atk2[0]) >= 仕兵 * 0.98 - atk2[0].squads.length
    && Math.abs(atk2[0].morale - (仕気 - 3)) < 1e-9 && def2.every((c, k) => c.morale === 城気[k]), r4.文);
  確('しくじりも戦の記に残る', b2.log.some((l) => /見破られた/.test(l.text)));
  // 選んだ隊が仕掛ける
  const { b: b3, atk: atk3 } = 仕立てる();
  const r5 = 決めて(0.01, () => A.計略を仕掛ける(b3, '水の手', atk3[2]));
  確('遊ぶ側が隊を選んでいれば、その隊の将が仕掛ける', r5.ok && /将2/.test(r5.文), r5.文);
  // 夜を越せば、また
  b.phase = 'night'; b.夜 = { 日: 1 };
  A.夜を明かす(b);
  const r6 = 決めて(0.01, () => A.計略を仕掛ける(b, '水の手', null));
  確('夜を越せば、また仕掛けられる', b.日 === 2 && r6.ok && r6.成, r6.文);
  確('城攻めのさなかでなければ仕掛けられない', !A.計略を仕掛ける({ ...b, phase: 'night' }, '水の手', null).ok);
}
{
  /* 内応 */
  const { b, atk, def } = 仕立てる();
  const r0 = A.計略を仕掛ける(b, '内応', null);
  確('密約が無ければ内応は仕掛けられない', !r0.ok && /密約/.test(r0.文), r0.文);
  const 者 = def[1];
  者.内応 = true; 者.内応の主 = 'P';
  確('密約の者が見つかる', A.内応の者(b, 'P') === 者);
  const 色前 = 者.color;
  const r1 = A.計略を仕掛ける(b, '内応', null);
  確('内応させれば、その隊は寄せ手の側へ移る（下知も移る）', r1.ok && 者.side === 'P' && 者.寝返り && !者.auto, r1.文);
  確('旗の色も寄せ手の色に替わる', 者.color === atk[0].color && 色前 !== 者.color, `${色前} → ${者.color}`);
  確('寝返った者は、もう一度は寝返らない', !A.計略を仕掛ける(b, '内応', null).ok);
  /* 采配の側の密約は遊ぶ側が押せない（采配が頃合いを計る） */
  const { b: b2, def: d2 } = 仕立てる();
  d2[0].内応 = true; d2[0].内応の主 = 'E';
  確('相手方の密約は、遊ぶ側の内応にならない', !A.計略を仕掛ける(b2, '内応', null).ok);
}
{
  /* 采配の寄せ手。寄せて四十秒ののち、知略五十五以上の将がいれば一日一度ずつ仕掛ける */
  const 采 = 仕立てる({ 寄せ手: 'E', 寄知: [70, 50, 50, 50] });
  const b = 采.b;
  b.t = 30;
  確('寄せて四十秒までは仕掛けない', A.采配の計略(b) === null);
  b.t = 41;
  const r1 = 決めて(0.01, () => A.采配の計略(b));
  const r2 = 決めて(0.01, () => A.采配の計略(b));
  const r3 = 決めて(0.01, () => A.采配の計略(b));
  確('采配の寄せ手は、水の手と焼き働きを一日一度ずつ仕掛ける', r1 && r1.ok && r2 && r2.ok && r3 === null && A.仕掛けた(b, '水の手') && A.仕掛けた(b, '焼き働き'),
    [r1, r2].map((r) => r && r.文).join(' ／ '));
  const 凡 = 仕立てる({ 寄せ手: 'E', 寄知: [54, 50, 50, 50] });
  凡.b.t = 60;
  確('知略五十五に満たぬ将しかいなければ仕掛けない', A.采配の計略(凡.b) === null);
  const 遊 = 仕立てる({ 寄せ手: 'P' });
  遊.b.t = 60;
  確('遊ぶ側の寄せ手には、采配は仕掛けない', A.采配の計略(遊.b) === null);
}

/* ---------------------------------------------- 三、囲みの輪 */
console.log('── 三　囲みの輪（囲師必闕）');
{
  const { b, m, atk, def } = 仕立てる();
  const R = m.域.r;
  const 置く = (c, 角, 遠 = 1.1) => { c.x = m.cx + Math.cos(角) * R * 遠; c.y = m.cy + Math.sin(角) * R * 遠; c.mx = c.x; c.my = c.y; A.placeSquads(c, true); };
  A.囲みの方ら.forEach(([, 角], k) => 置く(atk[k], 角));
  const 四 = A.囲みを測る(b, atk);
  確('四方を寄せ手が押さえれば、囲み四方', 四.数 === 4 && 四.空き.length === 0, JSON.stringify(四));
  置く(atk[0], A.囲みの方ら[0][1], 2.0);              // 北の隊を遠くへ
  const 三 = A.囲みを測る(b, atk);
  確('城山から遠い隊は囲みに数えない（一方が空く）', 三.数 === 3 && 三.空き.includes('北'), JSON.stringify(三));
  置く(atk[0], A.囲みの方ら[0][1], 1.1);
  for (const q of atk[0].squads) q.men = Math.min(q.men, 2);   // 二百人に満たない
  const 小 = A.囲みを測る(b, atk);
  確('二百人に満たない隊は囲みに数えない', 小.数 === 3 && 小.空き.includes('北'), `${A.corpsMen(atk[0])}人`);
}
{
  /* 四方を囲み、城が傾けば死兵となる */
  const { b, m, atk, def } = 仕立てる();
  const R = m.域.r;
  A.囲みの方ら.forEach(([, 角], k) => { const c = atk[k]; c.x = m.cx + Math.cos(角) * R * 1.1; c.y = m.cy + Math.sin(角) * R * 1.1;
    A.placeSquads(c, true); c.不戦 = true; c.order = '待機'; c.tx = c.x; c.ty = c.y; });
  for (const l of m.layers.slice(0, 2)) for (const g of l.gates) { g.hp = 0; g.broken = true; }   // 外の二つの輪の門が破れた
  m.nav = null;
  for (let k = 0; k < 120; k++) A.stepBattle(b, 0.03);
  確('四方を囲まれて城が傾けば、城兵は死兵となる', !!b.死兵 && b.log.some((l) => /死兵/.test(l.text)), `城の傾き ${(b.press || 0).toFixed(2)}`);
  def[0].morale = 5;                                     // 死兵になってから気を落とす
  for (let k = 0; k < 120; k++) A.stepBattle(b, 0.03);
  確('死兵は士気では崩れない（士気三十より下がらない）', def[0].morale >= 30 && !def[0].routed, `士気 ${def[0].morale.toFixed(1)}`);
}
{
  /* 一方が空いていれば、崩れて気の尽きた城兵は空いた方へ落ち延びる */
  const { b, m, atk, def } = 仕立てる();
  const R = m.域.r;
  A.囲みの方ら.slice(1).forEach(([, 角], k) => { const c = atk[k + 1]; c.x = m.cx + Math.cos(角) * R * 1.1; c.y = m.cy + Math.sin(角) * R * 1.1;
    A.placeSquads(c, true); c.不戦 = true; c.order = '待機'; c.tx = c.x; c.ty = c.y; });
  atk[0].不戦 = true; atk[0].x = m.cx; atk[0].y = A.FIELD.h - 200; A.placeSquads(atk[0], true);   // 北は空いている（一隊は南の野に）
  const 者 = def[0];
  者.morale = 10; 者.routed = true; 者.order = '敗走'; 者.崩れた刻 = 0;
  let 始 = null, 落 = false;
  for (let k = 0; k < 900 && !落; k++) {
    A.stepBattle(b, 0.03);
    if (始 === null && 者.落ち延び) 始 = b.t;
    if (者.落ちた) 落 = true;
  }
  確('囲みの空いた方へ落ち延びようとする', !!者.落ち延び && 者.落ち延び.方 === '北' && b.log.some((l) => /落ち延びようとしている/.test(l.text)),
    者.落ち延び ? `${者.落ち延び.方}へ` : '動かず');
  確('十秒ほど走ったのち盤を去る（討たれも捕らわれもしない印が付く）', 落 && 者.dead && b.log.some((l) => /落ち延びた/.test(l.text)),
    始 != null ? `走り出して${(b.t - 始).toFixed(1)}秒` : '');
  /* 死兵なら落ち延びない */
  const { b: b2, m: m2, atk: a2, def: d2 } = 仕立てる();
  b2.死兵 = true; b2.囲み = { 数: 3, 空き: ['北'], 刻: 1e9 };
  d2[0].morale = 10; d2[0].routed = true; d2[0].order = '敗走';
  for (const c of a2) { c.不戦 = true; }
  for (let k = 0; k < 120; k++) A.stepBattle(b2, 0.03);
  確('死兵は落ち延びない', !d2[0].落ち延び);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
