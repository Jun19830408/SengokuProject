/* 城攻めの日の引き際（battle/engine.js 日の引き際・引き鉦を打つ・寄せ手の夜の思案）。

   遊ぶ側の申し出は「1は尼子の吉田郡山攻めの失敗や大内の月山富田攻めをモチーフにしています。
   ただ、8割は大きすぎるので、史実に従ったかたちに修正してください」であった。測ると、強攻に
   敗れた寄せ手は一日目のうちに初めの兵の八割を失って総崩れになっていた。城から射られても士気が
   戻り続け、どの隊も兵の八割を失って崩れるまで門へ寄せていた。ここで確かめること。
     一、攻めあぐね   … 采配の寄せ手は、攻めが進まぬまま（門を破れず、削れてもいない）その日に
                        寄せた兵の二割を失えば、引き鉦を打って陣へ退き、夜の段に移る
     二、押している日 … 門を削っているうちは二割では退かない。三割を失えば退く
     三、崩れ         … 寄せ手の兵の半ばが崩れれば、損が二割に届かずとも退く
     四、本丸         … 本丸の門が破れていれば退かない（あと一押しで落ちる）
     五、手ずから     … 手ずから率いる遊ぶ側は盤が退かせない。一括命令の引き鉦で同じことができる
     六、最後の日     … 強攻の日数の尽きた日に引き鉦を打てば、兵糧攻めに移る
     七、数の利       … 盤の兵が城方の三倍あるうちは、攻めあぐねても二割では引かない。四倍あるうちは
                        三割でも引かない（城方のほうが速く減っている）。ただし城攻めを通して兵の半ばを
                        失えば、四倍に届かぬ限り引く
     八、夜の思案     … 盤の兵が城方の三倍あれば翌日も攻め、二倍に届かねば兵糧攻めに移る。その間なら、
                        この日に門を破っていれば攻め、破れていなければ兵糧攻めに移る。士気が三十を
                        切るか、城攻めを通して兵の半ばを失えば（四倍に届かぬ限り）兵糧攻めに移る */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'hikigane-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { buildCastleMap, layoutCastleField, setBattleMap, 寄せ手の陣, 門の輪 } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen } from "../src/battle/corps.js";\n'
+ 'export { createBattle, stepBattle, 夜を明かす, 日の引き際, 引き鉦を打つ, 寄せ手の夜の思案, この日の損, 通しの損 } from "../src/battle/engine.js";\n'
+ 'export { setFieldKind } from "../src/battle/field.js";\n'
+ 'export { 持ち場を並べる } from "../src/battle/defense.js";\n');
const out = path.join(ROOT, 'build', 'hikigane.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x41ce;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const 将 = (i, 器 = 60) => ({ id: `g${i}`, name: `将${i}`, lead: 器 + 2, valor: 器, wit: 58, gov: 55, retinue: 500, retTrain: 70, unity: 60 });

/* 清洲城を広い盤に据え、寄せ手（E＝他家の采配）四隊が城方（P）六隊を攻める。三日がかり。
   寄せ手は待機させ、損や門の傷みは手で与える（引き際の判じだけを見る） */
function 仕立てる({ 寄せ手 = 'E', 隊数 = 4 } = {}) {
  A.setFieldKind('街道');
  const m = A.layoutCastleField(A.buildCastleMap({ id: 'kiyosu', name: '清洲城', def: 55, local: 1200, localTrain: 70, najimi: 70, rost: null }),
    { 広く: true, 城id: 'kiyosu', 種: 0xdeadbeef });
  A.setBattleMap(m);
  const 受け = 寄せ手 === 'E' ? 'P' : 'E';
  const atk = [...Array(隊数).keys()].map((k) => {
    const sp = A.寄せ手の陣(m, k, 隊数);
    const c = A.makeCorps(寄せ手, 将(k), 500, 1500, 75, 75, sp.x, sp.y, sp.f, '#2F5D8C');
    c.formation = '方陣'; A.placeSquads(c, true); c.auto = false; c.order = '待機';
    return c;
  });
  const def = A.持ち場を並べる(m).filter((p) => p.gate).map((p, k) => {
    const c = A.makeCorps(受け, 将(100 + k), 500, 600, 72, 72, p.x, p.y, p.f, '#B0483C');
    c.holdGate = p.gate; c.auto = false; c.order = '待機';
    return c;
  });
  const b = A.createBattle(寄せ手 === 'E' ? def : atk, 寄せ手 === 'E' ? atk : def, 寄せ手 === 'E' ? 'E' : 'P');
  b.attacker = 寄せ手;
  b.mode = 'castle'; b.map = m; b.phase = 'fight';
  b.日数 = 3; b.日 = 1; b.日の始め = 0; b.dusk = 99999; b.日の長さ = 99999;
  b.鼓舞なし = true;
  A.stepBattle(b, 0.03);                    // 朝の構え（この日の寄せ手の兵）を控えさせる
  return { m, b, atk, def };
}
/* 寄せ手の兵を、どの隊も同じ割だけ減らす */
const 削る = (atk, 割) => { for (const c of atk) for (const q of c.squads) q.men = Math.round(q.men * (1 - 割)); };
const 進める = (b, 秒) => { for (let t = 0; t < 秒 && b.phase === 'fight'; t += 0.03) A.stepBattle(b, 0.03); };
const 外の門 = (m) => m.gates.find((g) => g.layer === 0 && !g.出城);

console.log('■ 一、攻めあぐね');
{
  const { b, atk } = 仕立てる();
  削る(atk, 0.19);
  進める(b, 3);
  確('二割に届かぬうちは退かない', b.phase === 'fight', `この日の損 ${Math.round(A.この日の損(b) * 100)}％`);
  削る(atk, 0.03);
  進める(b, 3);
  確('攻めが進まぬまま二割を失えば、引き鉦を打って夜の段に移る', b.phase === 'night' && !!(b.夜 && b.夜.引き鉦),
    `${b.phase}・損 ${Math.round(A.この日の損(b) * 100)}％`);
  const 文 = (b.log || []).map((x) => x.text).find((t) => /引き鉦/.test(t)) || '';
  確('報せに訳と損が出る', /攻めあぐねて/.test(文) && /この日の寄せ手の損/.test(文), 文);
}

console.log('■ 二、押している日');
{
  const { m, b, atk } = 仕立てる();
  const 門 = 外の門(m);
  /* 門を削り続ける（二十秒で門の固さの一割余り）。そのあいだに兵が二割二分減る */
  for (let t = 0; t < 20 && b.phase === 'fight'; t += 0.5) { 門.hp -= 門.max * 0.0035; 進める(b, 0.5); }
  削る(atk, 0.22);
  for (let t = 0; t < 5 && b.phase === 'fight'; t += 0.5) { 門.hp -= 門.max * 0.0035; 進める(b, 0.5); }
  確('門を削っているうちは、二割を失っても退かない', b.phase === 'fight', `損 ${Math.round(A.この日の損(b) * 100)}％`);
  削る(atk, 0.12);
  for (let t = 0; t < 4 && b.phase === 'fight'; t += 0.5) { 門.hp -= 門.max * 0.0035; 進める(b, 0.5); }
  確('三割を失えば、押していても退く', b.phase === 'night', `${b.phase}・損 ${Math.round(A.この日の損(b) * 100)}％`);
}

console.log('■ 三、崩れ');
{
  const { b, atk } = 仕立てる();
  削る(atk, 0.05);
  for (const c of atk.slice(0, 2)) { c.routed = true; c.morale = 30; }
  進める(b, 2);
  確('寄せ手の兵の半ばが崩れれば、損が二割に届かずとも退く', b.phase === 'night', `${b.phase}`);
}

console.log('■ 四、本丸');
{
  const { m, b, atk } = 仕立てる();
  const 本 = m.layers[m.layers.length - 1].gates[0];
  本.hp = 0; 本.broken = true;
  削る(atk, 0.35);
  進める(b, 3);
  確('本丸の門が破れていれば、三割を失っても退かない', b.phase === 'fight', `${b.phase}`);
}

console.log('■ 五、手ずから');
{
  const { b, atk } = 仕立てる({ 寄せ手: 'P' });
  削る(atk, 0.4);
  進める(b, 3);
  確('手ずから率いる遊ぶ側の寄せ手は、盤が退かせない', b.phase === 'fight', `${b.phase}`);
  const 打てた = A.引き鉦を打つ(b);
  確('引き鉦を打てば、夜の段に移る', 打てた && b.phase === 'night' && b.夜.引き鉦, `${b.phase}`);
  const v = 仕立てる({ 寄せ手: 'P' });
  v.b.委ねた = true;
  削る(v.atk, 0.22);
  進める(v.b, 3);
  確('委ねた寄せ手には、他家と同じ引き際が効く', v.b.phase === 'night', `${v.b.phase}`);
}

console.log('■ 六、最後の日');
{
  const { b, atk } = 仕立てる();
  b.日 = 3;
  削る(atk, 0.22);
  進める(b, 3);
  確('強攻の日数の尽きた日に引き鉦を打てば、兵糧攻めに移る（城方の勝ち）', b.phase === 'over' && b.兵糧攻めへ && b.result === 'P',
    `${b.phase}・${b.result}`);
}

console.log('■ 七、数の利');
{
  /* 十四隊二万八千 対 城方六千六百（四.二倍） */
  const 多 = 仕立てる({ 隊数: 14 });
  削る(多.atk, 0.22);
  進める(多.b, 3);
  確('盤の兵が城方の三倍あるうちは、攻めあぐねても二割では引かない', 多.b.phase === 'fight', `損 ${Math.round(A.この日の損(多.b) * 100)}％`);
  const 大 = 仕立てる({ 隊数: 20 });             // 四万 対 六千六百（六.一倍）
  削る(大.atk, 0.31);
  進める(大.b, 3);
  確('四倍あるうちは、三割を失っても引かない', 大.b.phase === 'fight', `損 ${Math.round(A.この日の損(大.b) * 100)}％`);
  /* 十四隊二万八千。前の日までに兵を減らしてきた形にする（初めの兵を六万とみなす） */
  const 半 = 仕立てる({ 隊数: 14 });
  半.b.initial.E = 60000;
  削る(半.atk, 0.15);
  進める(半.b, 3);
  確('城攻めを通して兵の半ばを失えば、四倍に届かぬ限り引く（この日の損が二割に届かずとも）', 半.b.phase === 'night',
    `${半.b.phase}・通しの損 ${Math.round(A.通しの損(半.b) * 100)}％`);
}

console.log('■ 八、夜の思案');
{
  /* 四隊八千のうち二割を失い、城方は六隊六千六百のまま。門は一つも破れていない */
  const { b, atk } = 仕立てる();
  削る(atk, 0.22);
  進める(b, 3);
  確('盤の兵が城方の二倍に届かなければ、兵糧攻めに移る', b.phase === 'night' && A.寄せ手の夜の思案(b) === '退く',
    `寄せ手 ${Math.round(atk.reduce((a, c) => a + A.corpsMen(c), 0))}`);
  const 多 = 仕立てる({ 隊数: 14 });
  削る(多.atk, 0.22);
  確('三倍あれば、翌日も攻める', A.寄せ手の夜の思案(多.b) === '続ける',
    `寄せ手 ${Math.round(多.atk.reduce((a, c) => a + A.corpsMen(c), 0))}`);
  /* 十隊二万のうち二割を失う（二.三六倍） */
  const 中 = 仕立てる({ 隊数: 10 });
  削る(中.atk, 0.22);
  進める(中.b, 3);
  確('二倍から三倍の間で、この日に門を破れていなければ兵糧攻めに移る', 中.b.phase === 'night' && A.寄せ手の夜の思案(中.b) === '退く');
  外の門(中.m).broken = true;
  確('この日に門を破っていれば、翌日も攻める', A.寄せ手の夜の思案(中.b) === '続ける');
  多.b.initial.E = 50000;
  確('城攻めを通して兵の半ばを失えば、三倍あっても兵糧攻めに移る', A.寄せ手の夜の思案(多.b) === '退く',
    `通しの損 ${Math.round(A.通しの損(多.b) * 100)}％`);
  多.b.initial.E = 28000;
  for (const c of 多.atk) c.morale = 25;
  確('士気が三十を切れば、三倍あっても兵糧攻めに移る', A.寄せ手の夜の思案(多.b) === '退く');
  中.b.phase = 'night'; 中.b.夜 = { 日: 1 };
  A.夜を明かす(中.b);
  確('翌朝は、この日の損を数え直す', 中.b.phase === 'fight' && A.この日の損(中.b) === 0, `${Math.round(A.この日の損(中.b) * 100)}％`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
