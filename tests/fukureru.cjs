/* 兵が膨れる（GDD 6.2）。

   遊ぶ側の申し出は「城攻めなどをすると不自然に兵数が多くなる。約五万七千で
   出陣したのに、城攻めが成功したところで二十一万の兵になっていた。その後
   軍を解いたら本拠に二十一万が入った」であった。

   元は、組の通し番号である。名簿の組の id は「ret-信長-12」のように通し番号で
   振るが、その番号は読み込みのたびに〇へ戻っていた。戻れば、次に立てた組は
   記録の中に既にある組と同じ名を名乗る。

   同じ id の組が二つあると、戦のあとの書き戻し（戦の跡を記す）が壊れる。
   跡.生 は「id ごとの生き残りの合計」であるから、重なった id にはその二つ分が
   入る。そしてその合計を、二つの組の どちらにも 書き込む。つまり戦のたびに
   倍になる。いただいた記録では、定員五十の組に十万二千六十八人が二つ、
   織田信長の直属は二十万四千七百三十四人になっていた。

   直しは三段。
     一、記録を読んだら、そこにある番号より先から振る（もう重ならない）
     二、既に膨れた記録を繕う。定員を超えた分を戻し、重なった id を振り直す
     三、書き戻しの側にも床を張る。五十人組に五十一人は入らない

   繕いは、人数を減らす向きにしか動かさない。名簿と控えが元から食い違う
   古い記録があるので、控えを名簿で上書きすると幻でない兵まで消える
   （実測で三十九万人が消えた）。取り除いた幻の分だけを引く。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let _s = 0x7171 >>> 0;
Math.random = function () { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

console.log('── 一　書き戻しは、五十人組に五十一人を入れない');
{
  const rost = [{ id: 'ret-x-1', t: 'yari', m: 40, max: 50 }];
  const 生 = new Map([['ret-x-1', 102068]]);
  const 残 = H.戦の跡を記す(rost, { 生, 将: new Map(), 功: {} });
  確('定員を超えては書き込まれない', 残[0].m === 50, `${残[0].m}人`);
}

console.log('\n── 二　名簿を繕えば、膨れた組も重なった id も直る');
{
  const rost = [
    { id: 'ret-x-1', t: 'yari', m: 102068, max: 50 },
    { id: 'ret-x-1', t: 'yumi', m: 102068, max: 50 },
    { id: 'ret-x-2', t: 'kiba', m: 41, max: 50 },
  ];
  const 戻 = H.名簿を繕う(rost, 'ret-x');
  確('戻した兵の数が返る', 戻 === (102068 - 50) * 2, `${戻}人`);
  確('どの組も定員の内に収まる', rost.every((q) => q.m <= q.max), rost.map((q) => q.m).join('・'));
  確('id の重なりが解ける', new Set(rost.map((q) => q.id)).size === 3, rost.map((q) => q.id).join('・'));
  確('触れずともよい組はそのまま', rost[2].m === 41);
}

console.log('\n── 三　読み込みで、膨れた記録が繕われる');
{
  const s = H.initState('oda');
  const g = s.generals.find((x) => x.faction === 'oda' && x.lord);
  const c = s.castles.find((x) => x.id === s.factions.oda.本拠);
  const 元直 = g.retinue, 元地 = c.local;
  // 同じ id の組を二つ立て、どちらにも十万人を入れる（起きていた姿そのもの）
  g.rost = [...(g.rost || []), { id: 'ret-oda-dup', t: 'yari', m: 102068, max: 50 },
    { id: 'ret-oda-dup', t: 'yumi', m: 102068, max: 50 }];
  g.retinue = 元直 + 102068 * 2;
  H.migrateSave(s);
  確('直属が元の数へ戻る', g.retinue === 元直 + 100, `${g.retinue}人（元 ${元直}人）`);
  確('名簿に定員超えは残らない', (g.rost || []).every((q) => q.m <= (q.max || 50)));
  確('id の重なりも残らない',
    new Set((g.rost || []).map((q) => q.id)).size === (g.rost || []).length);
  確('触っていない城の兵は動かない', c.local === 元地, `${c.local}人（元 ${元地}人）`);
}

console.log('\n── 四　読み込んだあとに立てる組は、記録の組と名が重ならない');
{
  const s = H.initState('oda');
  const g = s.generals.find((x) => x.faction === 'oda' && x.lord);
  const 名ら = new Set((g.rost || []).map((q) => q.id));
  // 記録の番号より手前から振り直されないこと。読み込みを通してから立てる
  H.migrateSave(s);
  const 新 = H.newRoster(500, `ret-${g.id}`);
  const 重 = 新.filter((q) => 名ら.has(q.id));
  確('新しく立てた組は、どれも記録の組と名が違う', 重.length === 0,
    重.length ? 重.map((q) => q.id).join('・') : `${新.length}組`);
}

console.log('\n── 五　繕いは、人数を増やす向きには動かない');
{
  const s = H.initState('oda');
  const c = s.castles.filter((x) => x.faction === 'oda')
    .sort((a, z) => H.rosterSum(z.rost) - H.rosterSum(a.rost))[0];
  // 名簿の和より控えが少ない、元から食い違っている城を作る（和の半分に落とす）
  c.local = Math.round(H.rosterSum(c.rost) / 2);
  const 前 = c.local;
  H.migrateSave(s);
  確('食い違いがあっても、兵は増えない', c.local <= 前, `${c.local}人（前 ${前}人）`);
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
