/* 討死・捕縛の目減りと、家名の継承、勢力一覧、架空の印。

   一、当主と器量者は、そう易々と討たれも捕らわれもしない
       城が落ちるたび一割余りの将が討たれ、名のある者から先に盤を去っていた。
       討死の判じには器量がまるで入っておらず、武勇はむしろ討死を増やす向きに
       働いていた（踏みとどまるからである）。当主の別も無かった。

   二、姓の違う者が継いだら、家の名も改まる
       六角の家督が松永久秀に移っても「六角家」のままであった。
       当主が松永で家が六角、というのは名としておかしい。

   三、城を一つも持たぬ家は、滅んだものとして扱う

   四、遊びの中で生まれた子には〔架空〕の印が付く
*/
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* --------------------------------- 一、難を逃れる力 */
{
  const 作 = (lead, valor, wit, lord) => ({ id: 'x', name: '某', lead, valor, wit, gov: 60, lord });
  const 凡 = 作(40, 40, 40, false);
  const 器 = 作(90, 90, 90, false);
  const 主 = 作(90, 90, 90, true);
  const 凡主 = 作(40, 40, 40, true);

  const a = H.難を逃れる(凡), b = H.難を逃れる(器), c = H.難を逃れる(主);
  確('器量の高い者ほど難を逃れる', b < a * 0.75,
    `凡才 ${a.toFixed(2)} ／ 器量者 ${b.toFixed(2)}（${Math.round((1 - b / a) * 100)}%減）`);
  確('当主は格段に逃れる', c < b * 0.4,
    `器量者 ${b.toFixed(2)} ／ 当主 ${c.toFixed(2)}（${Math.round((1 - c / b) * 100)}%減）`);
  確('凡才の当主でも、器量者の家臣より逃れる', H.難を逃れる(凡主) < b,
    `凡才の当主 ${H.難を逃れる(凡主).toFixed(2)}`);

  // 捕縛の見込みにも効く
  const p凡 = H.captureChance(凡), p器 = H.captureChance(器), p主 = H.captureChance(主);
  確('捕縛の見込みも器量で下がる', p器 < p凡 * 0.5,
    `凡才 ${(p凡 * 100).toFixed(1)}% ／ 器量者 ${(p器 * 100).toFixed(1)}%`);
  確('当主の捕縛はさらに稀', p主 < p器 * 0.45,
    `器量者 ${(p器 * 100).toFixed(2)}% ／ 当主 ${(p主 * 100).toFixed(2)}%`);
  確('それでも零にはならない（絶対はない）', p主 > 0, `${(p主 * 100).toFixed(3)}%`);
}

/* ------------------------- 城が落ちたときに、当主がどれほど生き延びるか */
{
  // 難を逃れる力そのものを、討死の判じに当てはめて数える
  const 試 = (gen, 回 = 40000) => {
    let 死 = 0;
    const k = H.難を逃れる(gen);
    for (let i = 0; i < 回; i++) {
      const r = Math.random() + gen.valor / 400 - 70 / 320;
      if (r > 0.86 && Math.random() < k) 死++;
    }
    return 死 / 回;
  };
  const 旧 = (gen, 回 = 40000) => {
    let 死 = 0;
    for (let i = 0; i < 回; i++) {
      const r = Math.random() + gen.valor / 400 - 70 / 320;
      if (r > 0.86) 死++;
    }
    return 死 / 回;
  };
  const 大名 = { id: 'a', name: '大名', lead: 82, valor: 80, wit: 78, gov: 70, lord: true };
  const 並 = { id: 'b', name: '並の将', lead: 58, valor: 58, wit: 55, gov: 55, lord: false };
  const d1 = 試(大名), d0 = 旧(大名), e1 = 試(並), e0 = 旧(並);
  確('大名の討死が大きく減った', d1 < d0 * 0.25,
    `一城落ちるごと ${(d0 * 100).toFixed(1)}% → ${(d1 * 100).toFixed(2)}%`);
  /* 並の将も少しは減る（器量が判じに入ったため）が、大名とは桁が違う。
     頼んだのは「大名と器量者を減らす」ことであって、戦を安全にすることではない。 */
  確('並の将も減るが、大名の三倍近くはなお討たれる', e1 < e0 && e1 > d1 * 2,
    `${(e0 * 100).toFixed(1)}% → ${(e1 * 100).toFixed(1)}%（大名の${(e1 / d1).toFixed(1)}倍）`);
  確('並の将はなお討たれうる（戦は死ぬものである）', e1 > 0.02, `${(e1 * 100).toFixed(1)}%`);
}

/* ------------------------------- 二、姓の違う者が継げば家名も改まる */
{
  const s = H.initState('oda');
  const 敵 = s.castles.find((x) => x.faction !== s.player).faction;
  const 当主 = s.generals.find((x) => x.faction === 敵 && x.lord);
  // 血筋の者をすべて他家へ移し、姓の違う者だけを残す
  const 姓 = 当主.name.slice(0, 2);
  for (const x of s.generals.filter((q) => q.faction === 敵 && q.id !== 当主.id && q.name.startsWith(姓))) {
    x.faction = s.player;
  }
  const 残 = s.generals.filter((x) => x.faction === 敵 && x.id !== 当主.id && !x.captive);
  if (!残.length) { console.log('  （姓の違う家臣がおらず、確かめを省く）'); }
  else {
    const 旧名 = s.factions[敵].name;
    const heir = H.pickHeir(s, 当主);
    const t = JSON.parse(JSON.stringify(s));
    const h2 = H.succeed(t, t.generals.find((x) => x.id === 当主.id), '討死した');
    確('姓の違う者が継いだ', !!h2 && !h2.name.startsWith(姓),
      `${当主.name}（${旧名}）→ ${h2 ? h2.name : '―'}`);
    確('家の名が継いだ者の姓に改まる', t.factions[敵].name === `${h2.name.slice(0, 2)}家`,
      `${旧名} → ${t.factions[敵].name}`);
    確('改名が戦国記に残る',
      (t.chronicle || []).some((x) => x.text.includes('以後') && x.text.includes(t.factions[敵].name)));
    確('代替わりが月送りの報せに回る',
      (t.代替わり || []).some((k) => k.faction === 敵 && k.当主 === h2.name));

    // 一門が継いだときは、家の名は変わらない
    const u = H.initState('oda');
    const 主2 = u.generals.find((x) => x.faction === u.player && x.lord);
    const 名2 = u.factions[u.player].name;
    const h3 = H.succeed(u, 主2, '没した');
    if (h3 && h3.name.startsWith(主2.name.slice(0, 2))) {
      確('一門が継げば家の名は変わらない', u.factions[u.player].name === 名2,
        `${名2}（${主2.name} → ${h3.name}）`);
    }
  }
}

/* ------------------------------- 三、城を持たぬ家は滅んだものとして扱う */
{
  const s = H.initState('oda');
  const 敵 = s.castles.find((x) => x.faction !== s.player).faction;
  for (const c of s.castles.filter((x) => x.faction === 敵)) c.faction = s.player;
  確('城を失えば家として立たない', !H.houseAlive(s, 敵), s.factions[敵].name);
  // 当主が捕虜でも同じ
  const 主 = s.generals.find((x) => x.faction === 敵 && x.lord);
  if (主) { 主.captive = { by: s.player, from: 敵, at: s.castles[0].id }; }
  確('当主が捕虜で身の振り方が決まらずとも、なお滅亡', !H.houseAlive(s, 敵));
}

/* ------------------------------------- 四、架空の印 */
{
  const s = H.initState('oda');
  const 信長 = s.generals.find((x) => x.name === '織田信長');
  確('史実の武将に架空の印は付かない', !H.is架空(信長), 信長.name);
  const 子 = H.bearChild(s, 信長);
  確('遊びの中で生まれた子が架空とされる', !!子 && H.is架空(子), 子 ? 子.name : '―');
  確('印の無い古い記録も、idの形から拾える',
    H.is架空({ id: 子.id, name: 子.name }), 子.id);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
