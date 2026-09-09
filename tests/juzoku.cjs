/* 旗の下（従属・臣従）の要件（GDD 12.1 / 12.5）。

   従属とは、独りでは立ち行かぬ家が身を守るために選ぶ道である。対等に近い相手が
   選ぶ道ではない。ゆえに大きな石高の差が要る。

   もとは従属が一.六七倍、臣従が二.八六倍であった。測ると、従属十五組のうち四組が
   二倍を割っていた――松平が今川に一.三四倍で、百四十万石の三好が北条に二.〇二倍で
   従っていた。三つを直した。

     甲　関門を上げる　　従属 二.五倍／臣従 四倍
     乙　結んだ後も検める　石高の比は結ぶ瞬間にしか見ていなかった。主が力を
                           失えば旗は保てない。月ごとに検め直す
     丙　連鎖を断つ　　　旗の下の家は、さらに他家を従えられない

   そのうえで天下人には別の道を開く。秀吉の直轄は二百二十万石、家康は二百五十万石で、
   直轄だけを比べれば家康のほうが大きい。それでも家康は豊臣に従った。天下人の力は
   直轄の石高ではなく、五畿を押さえ官位を帯びたことに由来する。ゆえに官位を
   「外交の格」として効かせる。ただし臣従だけは、自分より大きい家には決して及ばない。
   家康はそこまでは屈しなかった。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { initState, diploStat, 従える比, 臣従させる比, 天下人の目安, 旗の下を検め直す, courtRank } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 命 = (key) => H.DIPLO.find((d) => d.key === key);
const 結べるか = (s, 我, 相, key) => {
  const d = 命(key);
  const r = (s.relations || {})[[我, 相].sort().join('|')] || { state: '中立', trust: 100 };
  return !!d && d.need(r, diploStat(s, 我), diploStat(s, 相), null);
};
/* 二つの家の石高を、比だけ思い通りにして測る。 */
const 場 = (我石, 相石) => {
  const s = initState('oda');
  const 我 = s.castles.find((c) => c.faction === 'oda');
  const 相 = s.castles.find((c) => c.faction !== 'oda');
  for (const c of s.castles) c.faction = c === 我 ? 'oda' : (c === 相 ? 'imagawa' : 'x_none');
  我.koku = 我石; 相.koku = 相石;
  s.relations[['oda', 'imagawa'].sort().join('|')] = { state: '中立', trust: 100, master: null };
  return s;
};

console.log('── 一　甲　関門は石高の大きな差を要る');
{
  確('二倍では従属させられない', !結べるか(場(200000, 100000), 'oda', 'imagawa', '従属させる'), '2.0倍');
  確('二.五倍なら従属させられる', 結べるか(場(255000, 100000), 'oda', 'imagawa', '従属させる'), '2.55倍');
  確('三倍では臣従させられない', !結べるか(場(300000, 100000), 'oda', 'imagawa', '臣従させる'), '3.0倍');
  確('四倍なら臣従させられる', 結べるか(場(410000, 100000), 'oda', 'imagawa', '臣従させる'), '4.1倍');
  /* 膝を屈する側も同じ差を要る。頭を下げるのに金は要らぬが、相手が十分に
     大きくなければ、そもそも下げる相手ではない。 */
  確('二倍では自ら従属しない', !結べるか(場(100000, 200000), 'oda', 'imagawa', '従属する'), '相手が2.0倍');
  確('二.五倍なら自ら従属する', 結べるか(場(100000, 255000), 'oda', 'imagawa', '従属する'), '相手が2.55倍');
  確('四倍なら自ら臣従する', 結べるか(場(100000, 410000), 'oda', 'imagawa', '臣従する'), '相手が4.1倍');
}

console.log('\n── 二　丙　旗の下の家は、さらに他家を従えられない');
{
  const s = 場(500000, 100000);
  確('旗の下でなければ従えられる', 結べるか(s, 'oda', 'imagawa', '従属させる'));
  // 織田を他家の旗の下に入れる
  s.factions.takeda = s.factions.takeda || { name: '武田家' };
  s.relations[['oda', 'takeda'].sort().join('|')] = { state: '従属', trust: 90, master: 'takeda' };
  確('旗の下に入れば、他家を従えられない', !結べるか(s, 'oda', 'imagawa', '従属させる'),
    '従属の又貸しはできない');
  確('旗の下の家は、自ら他家に従うこともできない',
    !結べるか(場(100000, 500000), 'oda', 'imagawa', '従属する')
    || (() => { const t = 場(100000, 500000);
      t.relations[['oda', 'takeda'].sort().join('|')] = { state: '従属', trust: 90, master: 'takeda' };
      return !結べるか(t, 'oda', 'imagawa', '従属する'); })());
}

console.log('\n── 三　天下人の道（官位で外交の格が上がる）');
{
  const s = initState('oda');
  const 五畿 = ['山城', '大和', '河内', '和泉', '摂津'];
  const 位なし = 従える比(diploStat(s, 'oda'));
  for (const c of s.castles.filter((x) => 五畿.includes(x.kuni))) c.faction = 'oda';
  const 大臣 = 従える比(diploStat(s, 'oda'));
  for (const c of s.castles.filter((x) => ['相模', '武蔵'].includes(x.kuni))) c.faction = 'oda';
  const me = diploStat(s, 'oda');
  const 将軍 = 従える比(me);
  確('五畿を制せば関門が緩む', 大臣 > 位なし, `${位なし.toFixed(2)} → ${大臣.toFixed(2)}`);
  確('幕府を開けば、自家より大きい家も従属させられる', 将軍 > 1,
    `${大臣.toFixed(2)} → ${将軍.toFixed(2)}（＝自家の${将軍.toFixed(2)}倍まで）`);
  確('その位は征夷大将軍である', me.官位 === '征夷大将軍', String(me.官位));
  確('直轄が全国の一割を超えている', me.koku >= me.全国 * 天下人の目安,
    `${Math.round(me.koku / 10000)}万石／全国${Math.round(me.全国 / 10000)}万石 ＝ ${(me.koku / me.全国 * 100).toFixed(1)}%`);
  /* 史実の比。秀吉二百二十万石に対し家康二百五十万石＝一.一四倍。
     幕府を開いた者は、この比の相手を従属させられねばならない。 */
  確('秀吉と家康の比（1.14倍）を従属させられる', 将軍 >= 1.14, `${将軍.toFixed(2)} ≧ 1.14`);
  /* ただし臣従は別。自分より大きい家を旗の下へ完全に入れることは、
     天下人にもできない。家康はそこまでは屈しなかった。 */
  確('天下人でも、自家より大きい家は臣従させられない', 臣従させる比(me) < 1,
    臣従させる比(me).toFixed(2));
}

console.log('\n── 四　直轄が細ければ、将軍でも緩まない');
{
  const s = initState('oda');
  const 五畿 = ['山城', '大和', '河内', '和泉', '摂津', '相模', '武蔵'];
  for (const c of s.castles.filter((x) => 五畿.includes(x.kuni))) c.faction = 'oda';
  // 全国の石高だけを十倍に膨らませ、直轄の割合を一割未満に落とす
  for (const c of s.castles.filter((x) => x.faction !== 'oda')) c.koku *= 10;
  const me = diploStat(s, 'oda');
  確('位は征夷大将軍のまま', me.官位 === '征夷大将軍');
  確('直轄が一割に満たない', me.koku < me.全国 * 天下人の目安,
    `${(me.koku / me.全国 * 100).toFixed(1)}%`);
  確('それでは自家より大きい家は従えられない', 従える比(me) <= 1,
    `${従える比(me).toFixed(2)}　（幕府の権威も、身代を背負ってこそ意味を持つ）`);
}

console.log('\n── 五　乙　結んだ後も検め直す');
{
  const s = 場(300000, 100000);
  s.relations[['oda', 'imagawa'].sort().join('|')] = { state: '従属', trust: 90, master: 'oda' };
  確('三倍を保つあいだは離れない', 旗の下を検め直す(s).length === 0, '3.0倍');
  // 下の家が育ち、比が二倍を割る
  s.castles.find((c) => c.faction === 'imagawa').koku = 200000;
  const 解 = 旗の下を検め直す(s);
  確('二倍を割れば旗の下を離れる', 解.length === 1, `1.5倍　${解.length}組が解けた`);
  確('従属は中立に戻る', s.relations[['oda', 'imagawa'].sort().join('|')].state === '中立',
    s.relations[['oda', 'imagawa'].sort().join('|')].state);
  確('離れた後も、まったくの他人ではない',
    s.relations[['oda', 'imagawa'].sort().join('|')].trust >= 40,
    `信用 ${Math.round(s.relations[['oda', 'imagawa'].sort().join('|')].trust)}`);
}

console.log('\n── 六　臣従は一段下って従属になる（いきなり中立には戻らない）');
{
  const s = 場(500000, 100000);
  s.relations[['oda', 'imagawa'].sort().join('|')] = { state: '臣従', trust: 100, master: 'oda' };
  確('五倍を保つあいだは離れない', 旗の下を検め直す(s).length === 0);
  s.castles.find((c) => c.faction === 'imagawa').koku = 250000;   // 二倍に落ちる
  旗の下を検め直す(s);
  確('三倍を割れば臣従は従属に下がる',
    s.relations[['oda', 'imagawa'].sort().join('|')].state === '従属',
    s.relations[['oda', 'imagawa'].sort().join('|')].state);
}

console.log('\n── 七　結びと崩れに幅を置く（境目で行き来しない）');
{
  /* 結ぶ関門（二.五倍）と崩れる目安（二倍）を同じ数にすると、境目で結んでは
     離れるを繰り返す。あいだに幅を置く。 */
  const s = 場(220000, 100000);                     // 二.二倍。結べぬが、崩れもせぬ
  確('二.二倍では新たに結べない', !結べるか(s, 'oda', 'imagawa', '従属させる'));
  s.relations[['oda', 'imagawa'].sort().join('|')] = { state: '従属', trust: 90, master: 'oda' };
  確('しかし既に結んだ旗の下は保たれる', 旗の下を検め直す(s).length === 0, '2.2倍');
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
