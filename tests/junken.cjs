/* 巡検（盤の不変式）を、恒久の試験として据える。

   tools/junken.cjs は「あり得ぬ盤面」を探す道具である。手で回すだけでは、
   直したものが後の直しで壊れても気づけない。短い巡検を試験に組み入れておけば、
   盤の道理が崩れた月に必ず止まる。

   ここで見る事柄（tools/junken.cjs に一覧がある）:
     将は自家の城か軍中にいる／将は二つの軍に属さない／軍に幽霊の将がいない／
     本領は自家の城である／本拠は自家の城である／城主はその城にいる自家の将である／
     数が負にならない／軍の出どころと居所が実在する／滅んだ家に軍が残らない／
     囲みと戦役が実在の軍と城を指す／家の名と当主が保たれる

   長く回すほど深い乱れが出るが、試験は速さも要る。ここでは一つの種を六年。
   深く見たいときは手で `node tools/junken.cjs 8 30` を回す。 */
const path = require('path');
const 巡検 = require(path.join(__dirname, '..', 'tools', 'junken.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

console.log('── 一　不変式が揃っている');
確('見る事柄が十一ある', 巡検.不変式.length >= 11, `${巡検.不変式.length}件`);

console.log('\n── 二　六年走らせて、道理に背く盤が出ない');
{
  const 種 = 0x51000;
  const t0 = Date.now();
  const r = 巡検.走らせる(種, 6, false);
  console.log(`  種 ${種}　${r.果て}まで　残る家 ${r.家数}　${Math.round((Date.now() - t0) / 1000)}秒`);
  for (const x of r.見つけた.slice(0, 8)) console.log(`     ［${x.名}］${x.いつ}　${x.事}`);
  確('背きなし', r.見つけた.length === 0, `${r.見つけた.length}種`);
  確('盤が進んでいる（走り切っている）', Number(String(r.果て).replace(/\D/g, '')) >= 1551, r.果て);
  確('家が減っている（戦が起きている）', r.家数 < 137, `${r.家数}家`);
}

console.log('\n── 三　別の種でも同じ');
{
  const 種 = 0x63a11;
  const r = 巡検.走らせる(種, 6, false);
  console.log(`  種 ${種}　${r.果て}まで　残る家 ${r.家数}`);
  for (const x of r.見つけた.slice(0, 8)) console.log(`     ［${x.名}］${x.いつ}　${x.事}`);
  確('背きなし', r.見つけた.length === 0, `${r.見つけた.length}種`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
