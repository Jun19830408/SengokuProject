/* 計略「鼓舞」（battle/kobu.js）。

   遊ぶ側の申し出は「計略に士気を追加したいです。大名または総大将なら全体または自部隊の
   士気を上げるもの、普通の武将は自部隊のみの士気を上げるもの(統率が85以上の武将は近くの
   自軍の部隊の士気もあげる)を追加したいです。統率か知略が70以上なら2回、それ以下なら1回
   行え、成功率と成功した時の士気の上がり方は最大50%回復くらいにして、統率か知略の
   パラメータによって割合的に上がる感じにしたいです。」であった。ここで確かめること。
     一、回数・見込み・上がり方 … 器（統率と知略の高いほう）七十以上で二度、未満は一度。
                                  見込みは器の百分率、上がり方は失った士気×〇.五×器／百
     二、届く先 … 大名・総大将は全軍、統率八十五以上は自部隊と三百歩の内の味方、ほかは自部隊
     三、采配   … 采配の隊は士気が四十五を切れば鼓舞し、四十秒は間を空ける。遊ぶ側の手ずから
                  率いる隊には使わない。大将は味方の三隊が五十を切れば全軍を鼓舞する */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'kobu-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { setBattleMap } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, commandPost } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle } from "../src/battle/engine.js";\n'
+ 'export { FIELD, fieldScale, layoutField, setFieldKind, setFieldSeed } from "../src/battle/field.js";\n'
+ 'export * from "../src/battle/kobu.js";\n');
const out = path.join(ROOT, 'build', 'kobu.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 賽 = 0;
Math.random = () => 賽;          // 〇なら必ず成り、〇.九九なら必ずしくじる（見込みは九割五分まで）

const 将 = (i, lead, wit, lord = false) => ({ id: `g${i}`, name: `将${i}`, lead, valor: 60, wit, gov: 50,
  retinue: 0, retTrain: 66, lord });
/* 野に、遊ぶ側（P）と敵（E）の隊を並べる。並びは [統率, 知略, 大名か, x のずれ] */
function 盤(Pら, Eら = [[60, 60, false, 0]]) {
  A.setBattleMap(null);
  A.setFieldSeed('nagoya', 'kiyosu');
  A.setFieldKind('街道');
  A.layoutField(8000, 6);
  const cx = A.FIELD.w / 2, cy = A.FIELD.h / 2;
  const P = Pら.map(([l, w, lord, dx], i) => A.makeCorps('P', 将(i, l, w, lord), 0, 800, 70, 68, cx + dx, cy + 500, -Math.PI / 2, '#2F5D8C'));
  const E = Eら.map(([l, w, lord, dx], i) => A.makeCorps('E', 将(100 + i, l, w, lord), 0, 800, 70, 66, cx + dx, cy - 500, Math.PI / 2, '#B0483C'));
  const b = A.createBattle(P, E, 'P');
  b.phase = 'fight'; b.mode = 'field';
  return { b, P, E };
}

console.log('■ 一、回数・見込み・上がり方は、統率と知略の高いほうで決まる');
{
  const { b, P } = 盤([[80, 50, false, 0], [60, 65, false, 600]]);
  const [甲, 乙] = P;
  確('統率八十の将は一つの合戦で二度', A.鼓舞の回数(甲) === 2, `${A.鼓舞の回数(甲)}度`);
  確('統率六十・知略六十五の将は一度', A.鼓舞の回数(乙) === 1, `${A.鼓舞の回数(乙)}度`);
  確('見込みは器の百分率（八十なら八割、六十五なら六割五分）',
    Math.abs(A.鼓舞の見込み(甲) - 0.8) < 1e-9 && Math.abs(A.鼓舞の見込み(乙) - 0.65) < 1e-9,
    `${A.鼓舞の見込み(甲)}・${A.鼓舞の見込み(乙)}`);
  賽 = 0;
  甲.morale = 40;
  const r1 = A.鼓舞する(b, 甲);
  確('士気四十の隊に器八十の将が成せば、失った六十の四割（二十四）を取り戻して六十四',
    r1.成 && Math.abs(甲.morale - 64) < 1e-6, `士気 ${甲.morale.toFixed(1)}`);
  甲.morale = 0;
  const r2 = A.鼓舞する(b, 甲);
  確('上がり方は最大で失った士気の五割まで（器百なら五割。器八十は四割）', r2.成 && Math.abs(甲.morale - 40) < 1e-6,
    `士気〇から ${甲.morale.toFixed(1)}`);
  const r3 = A.鼓舞する(b, 甲);
  確('二度使えば、三度目は使えない', !r3.ok && A.鼓舞の残り(甲) === 0, r3.文);
  賽 = 0.99;
  乙.morale = 30;
  const r4 = A.鼓舞する(b, 乙);
  確('しくじれば士気は動かず、回数だけが減る', r4.ok && !r4.成 && 乙.morale === 30 && A.鼓舞の残り(乙) === 0,
    `士気 ${乙.morale}・残り${A.鼓舞の残り(乙)}`);
  const 丁 = 盤([[90, 90, false, 0]]);
  丁.P[0].routed = true; 丁.P[0].morale = 10;
  const r5 = A.鼓舞する(丁.b, 丁.P[0]);
  確('崩れている隊の将は鼓舞できない（回数も減らない）', !r5.ok && A.鼓舞の残り(丁.P[0]) === 2, r5.文);
  b.phase = 'deploy';
  const 丙 = 盤([[90, 90, false, 0]]).P[0];
  確('合戦のさなかでなければ鼓舞できない', !A.鼓舞する(b, 丙).ok);
}

console.log('■ 二、届く先');
{
  賽 = 0;
  /* 大名（当主）。遠くの隊（二千歩先）にも届く */
  const { b, P, E } = 盤([[70, 60, true, 0], [60, 60, false, 2000], [60, 60, false, -2000]]);
  for (const c of P) c.morale = 40;
  E[0].morale = 40;
  A.鼓舞する(b, P[0], { 全軍: true });
  確('大名が全軍を鼓舞すれば、遠くの隊にも届く', P.every((c) => c.morale > 40),
    P.map((c) => Math.round(c.morale)).join('・'));
  確('敵の隊には届かない', E[0].morale === 40, `敵の士気 ${Math.round(E[0].morale)}`);
}
{
  賽 = 0;
  /* 総大将（大名のいない側では、統率のいちばん高い将が本陣） */
  const { b, P } = 盤([[78, 60, false, 0], [60, 60, false, 2000]]);
  for (const c of P) c.morale = 40;
  確('大名のいない側では、統率のいちばん高い将が総大将', A.鼓舞の大将か(b, P[0]) && !A.鼓舞の大将か(b, P[1]));
  A.鼓舞する(b, P[0], { 全軍: true });
  確('総大将も全軍を鼓舞できる', P.every((c) => c.morale > 40), P.map((c) => Math.round(c.morale)).join('・'));
}
{
  賽 = 0;
  /* 普通の将（統率八十四）。近くの味方がいても届くのは自部隊だけ。全軍を選んでも同じ */
  const { b, P } = 盤([[95, 60, true, -2500], [84, 60, false, 0], [60, 60, false, 150]]);
  for (const c of P) c.morale = 40;
  A.鼓舞する(b, P[1], { 全軍: true });
  確('普通の将は自部隊だけ（全軍を選んでも、近くの味方にも届かない）',
    P[1].morale > 40 && P[0].morale === 40 && P[2].morale === 40, P.map((c) => Math.round(c.morale)).join('・'));
}
{
  賽 = 0;
  /* 統率八十八の将。百五十歩の味方には届き、二千歩の味方には届かない */
  const { b, P } = 盤([[95, 60, true, -2500], [88, 60, false, 0], [60, 60, false, 150], [60, 60, false, 2000]]);
  for (const c of P) c.morale = 40;
  const R = A.鼓舞の近さ();
  A.鼓舞する(b, P[1]);
  確('統率八十五以上の将は、自部隊と三百歩の内の味方に届く',
    P[1].morale > 40 && P[2].morale > 40 && P[3].morale === 40 && P[0].morale === 40,
    `${P.map((c) => Math.round(c.morale)).join('・')}（近さ${Math.round(R)}歩）`);
}

console.log('■ 三、采配の鼓舞');
{
  賽 = 0;
  const { b, P, E } = 盤([[60, 60, false, 0]], [[75, 60, false, 0], [60, 60, false, 900]]);
  E[1].morale = 40;          // 総大将でない敵の隊
  P[0].morale = 40; P[0].auto = false;
  A.battleAI(b);
  確('采配の隊は士気が四十五を切れば鼓舞する', E[1].morale > 40 && A.鼓舞の残り(E[1]) === 0,
    `士気 ${Math.round(E[1].morale)}・残り${A.鼓舞の残り(E[1])}`);
  確('遊ぶ側の手ずから率いる隊には、采配は鼓舞を使わない', P[0].morale === 40 && A.鼓舞の残り(P[0]) === 1);
  P[0].auto = true;
  A.battleAI(b);
  確('遊ぶ側の委ねた隊には、采配が鼓舞を使う', P[0].morale > 40, `士気 ${Math.round(P[0].morale)}`);
  const 崩 = 盤([[60, 60, false, 0]], [[75, 60, false, 0], [60, 60, false, 900]]);
  崩.E[1].morale = 20; 崩.E[1].routed = true;
  A.battleAI(崩.b);
  確('采配は、崩れて逃げている隊の将には鼓舞させない', 崩.E[1].morale === 20 && A.鼓舞の残り(崩.E[1]) === 1);
}
{
  賽 = 0;
  const { b, E } = 盤([[60, 60, false, 0]], [[75, 75, false, 0], [60, 60, false, 900], [60, 60, false, -900], [60, 60, false, 1800]]);
  for (const c of E) c.morale = 44;
  E[0].morale = 80;
  A.battleAI(b);
  確('大将は、味方の三隊が五十を切れば全軍を鼓舞する', E.slice(1).every((c) => c.morale > 44) && A.鼓舞の残り(E[0]) === 1,
    `${E.map((c) => Math.round(c.morale)).join('・')}・大将の残り${A.鼓舞の残り(E[0])}`);
  for (const c of E) c.morale = 44;
  E[0].morale = 80;
  const 前 = A.鼓舞の残り(E[0]);
  A.battleAI(b);
  確('鼓舞したあと四十秒は、同じ将は続けて鼓舞しない', A.鼓舞の残り(E[0]) === 前, `残り${前}→${A.鼓舞の残り(E[0])}`);
  b.t += 41;
  for (const c of E.slice(1)) c.morale = 44;
  A.battleAI(b);
  確('四十秒を過ぎれば、二度目を使う（器七十五は二度）', A.鼓舞の残り(E[0]) === 0, `残り${A.鼓舞の残り(E[0])}`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
