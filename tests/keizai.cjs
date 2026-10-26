/* 金の出入りと兵の数（GDD 6.2・core/keizai.js・core/rank.js）。

   遊ぶ側の申し出。
     「お金が溜まりすぎるため、もっと溜まりにくいほうがいい。ただ、最初があまりにも
       お金が少なすぎたので、普通の状態にしたい」
     「最終的に百万人超えの兵数になるのもどうか。朝鮮出兵が一つの基準になる。
       出征できる兵数についても検討してほしい」

     一、初めの蔵は、月の実入りのおよそ半年分を足したもの
     二、上がりの半年分（少なくとも一万貫）を超えた蓄えは、月に六分ずつ出ていく（頭打ちになる）
     三、大身の費え。五十万石を超えた家は、上がりの一部を治める費えに取られる
     四、軍役の器を超えた地の兵は、月に四分ずつ村へ帰る（帰農）
     五、出征の余地。家の兵の四割（通常の段）まで。超える出陣は画面で止まる。
         ただし十万石までの家は縛らず、三十万石まではなだらかに四割へ近づく
         （遊ぶ側の申し出「出陣の四割の縛りは、弱小大名では撤廃すべき」）
     六、来月の見通しに、大身の費えと蔵の目減りが載る */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'keizai-test-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export * from "../src/core/keizai.js";\n'
+ 'export { initState, forecast } from "../src/core/state.js";\n'
+ 'export { troopCap, 出征の余地, 出征の限り, 出征の割, 出征中の兵, 家の総兵, 家の石高, 軍役の割増, 大身の軍役 } from "../src/core/rank.js";\n'
+ 'export { MOB_POLICY } from "../src/data/roads.js";\n'
+ 'export { FACTIONS } from "../src/data/factions.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n');
const out = path.join(ROOT, 'build', 'keizai-test.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error' });

let 種 = 0x6060;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const A = require(out);
const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 月の実入り = (s, fid) => s.castles.filter((c) => c.faction === fid)
  .reduce((a, c) => a + A.城の上がり(c) - c.local * 0.075, 0);

console.log('\n── 一　初めの蔵');
{
  const s = A.initState('oda');
  const 入 = 月の実入り(s, 'oda');
  確('織田家の蔵は、もとの二千六百貫より多い', s.factions.oda.gold > A.FACTIONS.oda.gold,
    `${A.FACTIONS.oda.gold} → ${s.factions.oda.gold}貫（月の実入り${Math.round(入)}貫）`);
  確('月の実入りのおよそ半年分を足したもの', Math.abs(s.factions.oda.gold - (A.FACTIONS.oda.gold + 入 * 6)) <= 1);
  const 大 = Object.values(s.factions).sort((a, b) => b.gold - a.gold)[0];
  確('大きな家ほど蔵は厚い', 大.gold > s.factions.oda.gold, `${大.name} ${大.gold}貫`);
}

console.log('\n── 二　蔵の目減り');
{
  確('半年分の上がりまでは減らない', A.蔵の目減り(5000 * A.蔵の留め月, 5000) === 0);
  確('超えた分の六分が出ていく', A.蔵の目減り(5000 * A.蔵の留め月 + 10000, 5000) === Math.round(10000 * A.蔵の目減り率),
    `率 ${A.蔵の目減り率}`);
  確('小さな家は一万貫までは減らない', A.蔵の目減り(9999, 500) === 0);
  const s0 = A.initState('oda');
  確('初めの蔵は目減りしない', Object.values(s0.factions).every((f) => {
    const 上 = s0.castles.filter((c) => c.faction === f.id).reduce((a, c) => a + A.城の上がり(c), 0);
    return A.蔵の目減り(f.gold, 上) === 0;
  }));
  /* 月の手残りが一定なら、蔵は頭打ちになる */
  let 蔵 = 0;
  const 上がり = 10000, 手残り = 3000;   // 留めは上がり半年分（下限より大きい）
  for (let i = 0; i < 600; i++) { 蔵 += 手残り; 蔵 -= A.蔵の目減り(蔵, 上がり); }
  // 手残りを足したあとに目減りが掛かるので、頭打ちは「留め月ぶん＋手残り／率」から手残りを引いたところ
  const 頭 = 上がり * A.蔵の留め月 + 手残り / A.蔵の目減り率 - 手残り;
  確('蔵は頭打ちになる', Math.abs(蔵 - 頭) < 頭 * 0.01, `五十年で${Math.round(蔵)}貫（頭打ち${頭}貫）`);

  /* 月送りでも効く */
  const s = A.initState('oda');
  s.factions.oda.gold = 10000000;
  const t = A.advanceMonth(s, s);
  確('一千万貫の蔵は月送りで減る', t.factions.oda.gold < 10000000 * 0.97, `${t.factions.oda.gold}貫`);
}

console.log('\n── 三　大身の費え');
{
  確('五十万石までは掛からない', A.大身の割(500000) === 0);
  確('五百五十万石で四割', Math.abs(A.大身の割(5500000) - 0.4) < 1e-9);
  確('それより大きくても四割で止まる', A.大身の割(20000000) === 0.4);
  const s = A.initState('oda');
  for (const c of s.castles.filter((x) => ['尾張', '美濃', '三河', '近江', '伊勢', '山城'].includes(x.kuni))) c.faction = 'oda';
  const fc = A.forecast(s, 'oda');
  確('見通しに大身の費えが載る', fc.大身 > 0, `${fc.大身}貫`);
}

console.log('\n── 四　軍役の器を超えた地の兵は村へ帰る');
{
  const s = A.initState('oda');
  const c = s.castles.find((x) => x.faction === 'oda' && x.koku >= 30000);  // 器を超えて抱えさせる
  const 器 = A.troopCap(c, s.factions.oda.mobilization, s);
  c.local = 器 * 3;
  const 前 = c.local;
  const t = A.advanceMonth(s, s);
  const 後 = t.castles.find((x) => x.id === c.id).local;
  const 減 = 前 - 後;
  確('器を超えた分の四分ほどが帰る', 減 >= (前 - 器) * 0.03 && 減 <= (前 - 器) * 0.08 + 50,
    `${c.name} 器${器} 兵${前} → ${後}`);
  確('月報に帰農が出る', (t.monthEvents || []).some((x) => x.includes('帰農')));
  const s2 = A.initState('oda');
  const c2 = s2.castles.find((x) => x.id === c.id);
  c2.local = Math.round(A.troopCap(c2, s2.factions.oda.mobilization, s2) * 0.5);
  const 前2 = c2.local;
  const t2 = A.advanceMonth(s2, s2);
  確('器の内なら帰らない', t2.castles.find((x) => x.id === c.id).local >= 前2 - 5);
}

console.log('\n── 五　軍役の率');
{
  確('通常の段は一万石に三百人', A.MOB_POLICY[1].per === 300);
  確('小さな城ほど厚い（五千石で一万石に六百人）', Math.round(300 * A.軍役の割増(5000)) === 600, `${Math.round(300 * A.軍役の割増(5000))}人／万石`);
  確('三万石以上は割増なし', A.軍役の割増(30000) === 1 && A.軍役の割増(100000) === 1);
  確('五十万石までの家は率が下がらない', A.大身の軍役(500000) === 1);
  確('大きな家ほど率が下がり、六割で止まる', A.大身の軍役(5000000) < 1 && A.大身の軍役(20000000) === 0.6,
    `五百万石 ${A.大身の軍役(5000000).toFixed(2)}・二千万石 ${A.大身の軍役(20000000)}`);
  /* 天下を統べた家（二千万石）が抱えられる地の兵は百万に届かない */
  const 天下 = (p) => 20000000 / 10000 * A.MOB_POLICY[p].per * A.大身の軍役(20000000) * 1.1;
  確('二千万石・総動員・官位の割増を入れても、地の兵は百万人に届かない', 天下(3) < 1000000,
    `通常 ${Math.round(天下(1))}人・総動員 ${Math.round(天下(3))}人`);
  /* 遊びの初めは、ほとんどの城でまだ徴募ができる */
  const s = A.initState('oda');
  const 募れる = s.castles.filter((c) => A.troopCap(c, 1, s) > c.local).length;
  確('遊びの初めは、ほとんどの城で徴募ができる', 募れる >= s.castles.length * 0.8, `${募れる}／${s.castles.length}城`);
}

console.log('\n── 六　出征の余地');
{
  /* 三十万石を超える家は段の割（三好家 五十七万石）。
     遊ぶ側の申し出「出陣の四割の縛りは、弱小大名では撤廃すべき」により、
     十万石までの家は縛らず（毛利家 九万石）、そのあいだはなだらかに（織田家 十八万石）。 */
  const s = A.initState('oda');
  const 総 = A.家の総兵(s, 'miyoshi');
  確('三十万石を超える家は、通常の段で家の兵の四割', A.出征の限り(s, 'miyoshi') === Math.round(総 * 0.4),
    `家の兵${総}・限り${A.出征の限り(s, 'miyoshi')}`);
  確('十万石までの家は縛らない（家の兵を残らず出せる）', A.出征の限り(s, 'mori') === A.家の総兵(s, 'mori'),
    `石高${A.家の石高(s, 'mori')}・家の兵${A.家の総兵(s, 'mori')}・限り${A.出征の限り(s, 'mori')}`);
  const 割 = A.出征の割(s, 'oda');
  確('十万〜三十万石の家は、段の割と十割のあいだ', 割 > 0.4 && 割 < 1, `織田家 ${A.家の石高(s, 'oda')}石・${割.toFixed(3)}`);
  確('石高が大きいほど割は小さい', A.出征の割(s, 'imagawa') < 割 && 割 < A.出征の割(s, 'mori'),
    `今川 ${A.出征の割(s, 'imagawa').toFixed(3)}・織田 ${割.toFixed(3)}・毛利 ${A.出征の割(s, 'mori').toFixed(3)}`);
  s.armies.push({ id: 'x', faction: 'miyoshi', men: 1000, gens: [], local: 1000 });
  確('出ている軍のぶん余地は減る', A.出征の余地(s, 'miyoshi') === Math.max(0, A.出征の限り(s, 'miyoshi') - 1000));
  s.armies.push({ id: 'y', faction: 'miyoshi', men: 800, gens: [], local: 800, relief: 'nagoya' });
  確('後詰は数えない', A.出征中の兵(s, 'miyoshi') === 1000);
  s.factions.miyoshi.mobilization = 3;
  確('総動員なら六割', A.出征の限り(s, 'miyoshi') === Math.round(A.家の総兵(s, 'miyoshi') * 0.6));
  s.factions.mori.mobilization = 0;
  確('小身の家は平時でも縛らない', A.出征の限り(s, 'mori') === A.家の総兵(s, 'mori'));
}

console.log(`\nエラー: ${咎.length ? 咎.join(' | ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
