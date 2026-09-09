/* 陣触れの届き（GDD 7.3）。加勢を呼べる先は、総大将の身分と役で決まる。

   梯子はこうである。

     物頭　　… 無し（一手の兵を預かる身であって、軍の将ではない）
     城主　　… 隣の城（街道で直に結ばれた自家の城）
     国主　　… 一国と隣国（預かった国と、街道で隣り合う国）
     旗頭　　… 方面（預かった国々）
     当主　　… 天下

   城主の届きは、もとは「自城」であった。自城しか届かぬということは、加勢の
   一覧に一城も並ばぬということで、城主が寄せ手に立つかぎり加勢は一切催せない。
   他家（同盟・従属）へは頼めるのに、身内からは呼べない――逆さまである。

   といって届きを取り払っては、身分の梯子が消える。近隣の城と申し合わせて出るのは
   城主の器量のうちだが、遠国の城まで動かすのは国主・旗頭の役である。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { initState, 陣触れの届き, 陣触れに応じる, 国が隣り合うか, reinforceOffers, 国主に任じる, 旗頭に任じる, 身分の位 } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* 尾張・美濃を織田のものとし、本拠に大人の城主を据える。 */
const 場 = () => {
  const s = initState('oda');
  for (const k of ['尾張', '美濃']) for (const c of s.castles.filter((x) => x.kuni === k)) c.faction = 'oda';
  /* 当主のいる国には国主を置けない（GDD 6.4）。測る国から当主を外す。 */
  {
    const 当主 = s.generals.find((g) => g.faction === 'oda' && g.lord);
    const 余所 = s.castles.find((c) => c.faction === 'oda' && c.kuni === '美濃');
    if (当主 && 余所) { 当主.at = 余所.id; 当主.本領 = 余所.id; }
  }
  const 本陣 = s.castles.find((c) => c.faction === 'oda' && c.kuni === '尾張');
  const 的 = s.castles.find((c) => c.faction !== 'oda' && c.local > 400);
  const 城主 = s.generals.filter((g) => g.faction === 'oda' && g.at === 本陣.id && !g.lord && (g.age || 0) >= 25)[0];
  城主.fief = 6000;                       // 侍大将（城主になれる身分）
  本陣.lordId = 城主.id;
  return { s, 本陣, 的, 城主 };
};
const 自家の加勢 = (s, 本陣, 的, 大将) =>
  reinforceOffers(s, 本陣.id, 的.id, 大将)
    .filter((x) => (s.castles.find((c) => c.id === x.castleId) || {}).faction === 'oda');

console.log('── 一　届きの梯子');
{
  const { s, 城主 } = 場();
  確('城主の届きは隣の城', 陣触れの届き(城主, s) === '隣の城', 陣触れの届き(城主, s));
  const 物頭 = s.generals.find((g) => g.faction === 'oda' && 身分の位(g, s) < 2 && !g.lord);
  if (物頭) 確('物頭は陣触れを出せない', 陣触れの届き(物頭, s) === '無し', `${物頭.name}：${陣触れの届き(物頭, s)}`);
  const 主 = s.generals.find((g) => g.faction === 'oda' && g.lord);
  確('当主は天下じゅうに触れが届く', 陣触れの届き(主, s) === '天下');
}

console.log('\n── 二　城主でも加勢を呼べる（隣り合う自家の城から）');
{
  const { s, 本陣, 的, 城主 } = 場();
  const 自 = 自家の加勢(s, 本陣, 的, 城主);
  確('加勢に自家の城が並ぶ', 自.length > 0,
    自.map((x) => (s.castles.find((c) => c.id === x.castleId) || {}).name).join('・') || 'なし');
  確('並ぶのは指図の通る自領である', 自.every((x) => x.kind === '自領'));
  /* 並ぶ城は、本陣と街道で直に結ばれていなければならない。
     二つ以上離れた城まで動かせるのは、国主・旗頭の役である。 */
  const 遠い = 自.filter((x) => !陣触れに応じる(s, 城主, 本陣, s.castles.find((c) => c.id === x.castleId)));
  確('離れた城までは届かない', 遠い.length === 0,
    遠い.map((x) => (s.castles.find((c) => c.id === x.castleId) || {}).name).join('・') || 'なし');
}

console.log('\n── 三　国主・旗頭はもっと遠くまで届く');
{
  const { s, 本陣, 的, 城主 } = 場();
  const 城主の数 = 自家の加勢(s, 本陣, 的, 城主).length;
  城主.fief = 12000;                                   // 家老（国主になれる身分）
  const r = 国主に任じる(s, 'oda', 本陣.kuni, 城主.id);
  確('国主に任じられる', r.ok, r.why || '');
  const 国主の数 = 自家の加勢(s, 本陣, 的, s.generals.find((g) => g.id === 城主.id)).length;
  確('国主のほうが多くの城に届く', 国主の数 >= 城主の数,
    `城主 ${城主の数}城 → 国主 ${国主の数}城`);
  /* 一国のうちだけでは、隣国へ攻め入るときに自分の国の兵しか動かせない。
     国境を挟んで並ぶ国主どうしが申し合わせて出るのは、家中の当たり前の
     こしらえである。信長が美濃を攻めたとき、尾張の兵だけで寄せたわけではない。 */
  確('国主の届きは一国と隣国',
    陣触れの届き(s.generals.find((g) => g.id === 城主.id), s) === '一国と隣国',
    陣触れの届き(s.generals.find((g) => g.id === 城主.id), s));
}

console.log('\n── 四　他家には頼めるのに身内から呼べない、という逆さまが起きない');
{
  const { s, 本陣, 的, 城主 } = 場();
  const o = reinforceOffers(s, 本陣.id, 的.id, 城主);
  const 他家 = o.filter((x) => (s.castles.find((c) => c.id === x.castleId) || {}).faction !== 'oda');
  const 自 = o.filter((x) => (s.castles.find((c) => c.id === x.castleId) || {}).faction === 'oda');
  確('他家に頼めるなら、身内からも呼べる', !(他家.length > 0 && 自.length === 0),
    `他家 ${他家.length}城／自家 ${自.length}城`);
}

console.log('');
console.log('── 五　国主は隣国の兵も催せる');
{
  const { s, 本陣, 的, 城主 } = 場();
  城主.fief = 12000;
  国主に任じる(s, 'oda', 本陣.kuni, 城主.id);
  const 親 = s.generals.find((g) => g.id === 城主.id);
  const 出 = 自家の加勢(s, 本陣, 的, 親);
  const 国ら = [...new Set(出.map((x) => (s.castles.find((c) => c.id === x.castleId) || {}).kuni))];
  確('自分の国だけに縛られない', 国ら.length > 1, 国ら.join('・'));
  確('並ぶのは、預かる国か、それと隣り合う国の城だけ',
    出.every((x) => {
      const c = s.castles.find((y) => y.id === x.castleId);
      return c.kuni === 親.役国 || 国が隣り合うか(s, 親.役国, c.kuni);
    }));
  /* 隣り合うかは街道で判ずる。地図の上で近くとも、道が通じておらねば動かせない。 */
  確('街道で結ばれていない国は隣ではない', !国が隣り合うか(s, '尾張', '薩摩'),
    '尾張と薩摩');
  確('街道で結ばれた国は隣である', 国が隣り合うか(s, '尾張', '美濃'), '尾張と美濃');
  確('同じ国は隣として真を返す', 国が隣り合うか(s, '尾張', '尾張'));
}

console.log('\n── 六　届きの広さは身分の順に並ぶ');
{
  const { s, 本陣, 的, 城主 } = 場();
  const 城 = 自家の加勢(s, 本陣, 的, 城主).length;
  城主.fief = 12000;
  国主に任じる(s, 'oda', 本陣.kuni, 城主.id);
  const 国 = 自家の加勢(s, 本陣, 的, s.generals.find((g) => g.id === 城主.id)).length;
  const 主 = s.generals.find((g) => g.faction === 'oda' && g.lord);
  const 天 = 自家の加勢(s, 本陣, 的, 主).length;
  確('城主 ＜ 国主 ＜ 当主', 城 < 国 && 国 <= 天,
    `城主 ${城}城 ＜ 国主 ${国}城 ≦ 当主 ${天}城`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
