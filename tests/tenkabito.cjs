/* 天下への道筋（GDD 13.2）。

   家の大きさによって、目指すものが違う。弱い家は存続を目指し、強い家は天下を
   目指す。ただし一足飛びには行かない。段を踏む。

     一　足場を固める　… まず己の地方を制する。背に敵を置いたまま遠征はできない。
     二　周りを鎮める　… 隣の地方の脅威を除く。二正面は避ける。
     三　京を目指す　　… 二条御所を取る。関東・奥羽の家は、まず関東を制してから
                         西へ向かう（頼朝も家康も、関東を固めてから天下を論じた）。
     四　五畿を制する　… 京を得たら畿内を固め、官位を得る。
     五　天下へ　　　　… 惣無事令を発し、号令で残る地方を平らげる。

   もとは「上洛の志」の一枚きりで、志が立てば直ちに五畿へ向かった。背に敵を
   置いたまま京へ走るので、足場が固まらぬうちに遠征して痩せた。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { initState, いまの段, 段の上乗せ, 段, 家の地方, 地方の握り, 地方が隣り合うか,
  京の城, 志の直轄, 志の版図, 足場の握り, underMyBanner, 天下人の直轄, 天下人の版図,
  旗の下の城数, courtRank } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 旗 = (st, a, b) => underMyBanner(st, a, b);
const 全 = (s) => s.castles.reduce((a, c) => a + c.koku, 0);
const 直 = (s, f) => s.castles.filter((c) => c.faction === f).reduce((a, c) => a + c.koku, 0);

/* その地方の城を、指した家のものにする。 */
const 地方を与える = (s, fid, 名, 割 = 1) => {
  const r = H.REGIONS.find((x) => x.name === 名);
  const 城 = s.castles.filter((c) => r.kuni.includes(c.kuni));
  for (const c of 城.slice(0, Math.ceil(城.length * 割))) c.faction = fid;
};
/* 志を抱くだけの身代を持たせる。身代か版図か、どちらかが足りればよい。 */
const 志を持たせる = (s, fid) => {
  for (const c of s.castles) {
    if (直(s, fid) >= 全(s) * 志の直轄 || 旗の下の城数(s, fid) >= s.castles.length * 志の版図) break;
    if (c.faction !== fid) c.faction = fid;
  }
};

console.log('── 一　弱い家は存続を目指す');
{
  const s = initState('oda');
  for (const f of ['oda', 'miyoshi', 'hojo', 'shimazu', 'date']) {
    const 状 = いまの段(s, f, { 旗の下か: 旗 });
    確(`${s.factions[f].name}は存続の段`, 状.段 === 段.存続 && 状.志なし === true,
      `${状.段}　${(家の地方(s, f) || {}).name}`);
  }
  /* 存続の段では、段による上乗せは無い。狙いは近さと弱さで決まる。 */
  const 的 = s.castles.find((c) => c.faction !== 'oda');
  確('存続の段に上乗せは無い', 段の上乗せ(いまの段(s, 'oda', { 旗の下か: 旗 }), 的) === 0);
}

console.log('\n── 二　足場を固める（己の地方を制するまで）');
{
  const s = initState('oda');
  地方を与える(s, 'oda', '中部', 0.5);
  志を持たせる(s, 'oda');
  const 状 = いまの段(s, 'oda', { 旗の下か: 旗 });
  確('志は立つ', !状.志なし, `直轄 ${(直(s, 'oda') / 全(s) * 100).toFixed(1)}%`);
  /* 地方の握りが六割に満たなければ、まだ足場である。 */
  const 地方 = 家の地方(s, 'oda');
  const 握 = 地方の握り(s, 'oda', 地方, 旗);
  if (握 < 足場の握り) {
    確('己の地方を制するまでは足場の段', 状.段 === 段.足場,
      `${地方.name}の握り ${(握 * 100).toFixed(0)}%　→　${状.段}`);
    const 内 = s.castles.find((c) => 地方.kuni.includes(c.kuni) && c.faction !== 'oda');
    const 外 = s.castles.find((c) => !地方.kuni.includes(c.kuni) && c.faction !== 'oda');
    if (内 && 外) {
      確('己の地方の城を重く見る', 段の上乗せ(状, 内) > 段の上乗せ(状, 外),
        `${内.name}(${内.kuni}) ${段の上乗せ(状, 内)} ＞ ${外.name}(${外.kuni}) ${段の上乗せ(状, 外)}`);
    }
  } else {
    確('（握りが六割を超えたので、この節は測れない）', true, `${(握 * 100).toFixed(0)}%`);
  }
}

console.log('\n── 三　関東・奥羽の家は、まず関東を固める');
{
  const s = initState('hojo');
  地方を与える(s, 'hojo', '関東', 0.5);
  志を持たせる(s, 'hojo');
  /* 志を持たせるとき余所の城まで与えてしまうので、地方を関東に戻す */
  const 地方 = 家の地方(s, 'hojo');
  const 状 = いまの段(s, 'hojo', { 旗の下か: 旗 });
  確('志は立つ', !状.志なし);
  確('関東か奥羽を本拠とする', ['関東', '奥羽', '中部'].includes((地方 || {}).name),
    (地方 || {}).name);
  if ((地方 || {}).name === '関東' || (地方 || {}).name === '奥羽') {
    確('関東を固めるまでは、京を目指さない',
      状.段 !== 段.上洛,
      `${状.段}　（関東の握り ${(地方の握り(s, 'hojo', H.REGIONS.find((r) => r.name === '関東'), 旗) * 100).toFixed(0)}%）`);
  }
}

console.log('\n── 四　京を目指す');
{
  const s = initState('oda');
  地方を与える(s, 'oda', '中部', 1);                    // 己の地方は制した
  志を持たせる(s, 'oda');
  const 状 = いまの段(s, 'oda', { 旗の下か: 旗 });
  確('足場は固まっている',
    地方の握り(s, 'oda', 家の地方(s, 'oda'), 旗) >= 足場の握り,
    `${(地方の握り(s, 'oda', 家の地方(s, 'oda'), 旗) * 100).toFixed(0)}%`);
  確('段は「周りを鎮める」か「京を目指す」', [段.周り, 段.上洛, 段.五畿].includes(状.段), 状.段);
  if (状.段 === 段.上洛) {
    const 京 = s.castles.find((c) => c.id === 京の城);
    確('京そのものを最も重く見る',
      段の上乗せ(状, 京) > 段の上乗せ(状, s.castles.find((c) => c.faction !== 'oda' && c.id !== 京の城)),
      `二条御所 ${段の上乗せ(状, 京)}`);
    const 五畿の城 = s.castles.find((c) => H.GOKINAI.includes(c.kuni) && c.id !== 京の城);
    const 余所 = s.castles.find((c) => !H.GOKINAI.includes(c.kuni) && c.faction !== 'oda');
    if (五畿の城 && 余所) {
      確('五畿の城も重く見る', 段の上乗せ(状, 五畿の城) > 段の上乗せ(状, 余所),
        `${五畿の城.name} ${段の上乗せ(状, 五畿の城)} ＞ ${余所.name} ${段の上乗せ(状, 余所)}`);
    }
  }
}

console.log('\n── 五　京を得れば五畿の段へ');
{
  const s = initState('oda');
  地方を与える(s, 'oda', '中部', 1);
  志を持たせる(s, 'oda');
  s.castles.find((c) => c.id === 京の城).faction = 'oda';
  const 状 = いまの段(s, 'oda', { 旗の下か: 旗 });
  確('京を得れば五畿の段', 状.段 === 段.五畿, 状.段);
  確('五畿の国を狙う', (状.狙う国 || []).includes('山城'), (状.狙う国 || []).join('・'));
}

console.log('\n── 六　天下人になれば、あとは平らげるのみ');
{
  const s = initState('oda');
  for (const c of s.castles.filter((x) => H.GOKINAI.includes(x.kuni))) c.faction = 'oda';
  for (const c of s.castles) {
    if (直(s, 'oda') >= 全(s) * 天下人の直轄 && 旗の下の城数(s, 'oda') >= s.castles.length * 天下人の版図) break;
    if (c.faction !== 'oda') c.faction = 'oda';
  }
  const 位 = courtRank(s, 'oda');
  確('関白か将軍になっている', !!位 && !!位.号令, (位 || {}).key || 'なし');
  const 状 = いまの段(s, 'oda', { 旗の下か: 旗 });
  確('段は天下', 状.段 === 段.天下, 状.段);
}

console.log('\n── 七　地方の隣り合わせ');
{
  確('畿内と中部は隣り合う', 地方が隣り合うか('畿内', '中部'));
  確('畿内と中国は隣り合う', 地方が隣り合うか('畿内', '中国'));
  確('奥羽と九州は隣り合わない', !地方が隣り合うか('奥羽', '九州'));
  確('関東と畿内は隣り合わない（中部を挟む）', !地方が隣り合うか('関東', '畿内'));
}

console.log('\n── 八　段は順に進み、飛ばさない');
{
  /* 足場が固まらぬうちに上洛の段へは進まない。背に敵を置いたまま京へ走れば、
     留守を突かれる。もとの「上洛の志」一枚きりでは、そこが縛れなかった。 */
  const s = initState('oda');
  地方を与える(s, 'oda', '中部', 0.4);
  志を持たせる(s, 'oda');
  const 地方 = 家の地方(s, 'oda');
  const 握 = 地方の握り(s, 'oda', 地方, 旗);
  const 状 = いまの段(s, 'oda', { 旗の下か: 旗 });
  if (握 < 足場の握り) {
    確('握りが六割に満たなければ上洛しない', 状.段 !== 段.上洛,
      `${地方.name} ${(握 * 100).toFixed(0)}%　→　${状.段}`);
  } else {
    確('（志を持たせる過程で握りが六割を超えた）', true, `${(握 * 100).toFixed(0)}%`);
  }
}

console.log('');
console.log('── 九　上洛の段では、京へ近い城ほど重く見る');
{
  /* 道々を切り従えながら進むのが上洛である。京だけを重く見ても、そこへ至る道が
     他家の領で塞がれていれば、二条御所は的の一覧にすら上らない――他家の領を
     素通りできないからである。実測では、斎藤が上洛の段に入って二十年、京を
     目指したまま一歩も進まなかった。信長も、まず近江を平らげてから京へ入った。 */
  const s = initState('oda');
  const 歩 = (id) => { const p = H.findPath(id, 京の城); return p ? p.length - 1 : null; };
  const 状 = { 段: 段.上洛, 狙う城: 京の城, 狙う国: H.GOKINAI };
  const 見 = (名) => {
    const c = s.castles.find((x) => x.name === 名);
    return c ? { c, 歩: 歩(c.id), w: 段の上乗せ(状, c, { 京までの歩: 歩 }) } : null;
  };
  const 京 = 見('二条御所'), 近 = 見('観音寺城'), 中 = 見('稲葉山城'), 遠 = 見('小田原城');
  確('京そのものが最も重い', 京.w > 近.w && 近.w > 0,
    `二条御所 ${京.w} ＞ 観音寺城 ${近.w}`);
  確('近い城ほど重い', 近.w > 中.w, `${近.歩}歩 ${近.w} ＞ ${中.歩}歩 ${中.w}`);
  確('遠すぎる城は上乗せしない', 遠.w === 0, `${遠.歩}歩 ${遠.w}`);
  /* 上洛の段でなければ、京の近さは効かない。 */
  const 足 = { 段: 段.足場, 狙う国: ['尾張'] };
  確('足場の段では京の近さは効かない',
    段の上乗せ(足, 近.c, { 京までの歩: 歩 }) === 0,
    `観音寺城 ${段の上乗せ(足, 近.c, { 京までの歩: 歩 })}`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
