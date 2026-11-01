/* 出征の物差し（core/shussei.js・govern/month.js 出征の見立て）。

   遊ぶ側の申し出は「そもそも、旗頭が出す軍が少な過ぎます。あえて1.6倍とか2倍の設定をする
   からだと思います。連戦することも考慮してできるだけ軍を集結させて挑むべきです。また、一つの
   軍だけでなく、攻められそうな城があれば複数の軍を立てることになっても攻めるべきで、そのときの
   考え方としては、最低3倍の兵が集められるのであれば積極的に出征すべきです。他方で、野戦によって
   相手の軍を削り、後続の本隊で一気にけりをつけることも考えられます。武将の優秀さによっては
   3倍を下回る場合でも軍を出していいと思います。これは、旗頭だけでなく、AIとしての判断で
   共通させていいと思います。」であった。ここで確かめること。
     一、物差し   … 城攻めは城兵の三倍。器量（統率五分・武勇三分・知略二分）七十を超える将が
                    率いれば下がり、九十五で二.四倍。野で当たる敵には一.三倍
     二、見立て   … 要る兵＝城兵×城攻めの比＋（来うる後詰＋城に陣を張る軍）×野で当たる比。
                    望む兵（寄せ集める上限）はその一.三倍
     三、采配の出陣 … 月送りを回すと、他家の攻めの軍は要る兵を揃えてから発ち（先手と奇襲の
                    ほかは城兵の二.四倍を下回らない）、別々の城へ幾つも軍を立てる家がある
     四、寄せを返す … 揃わずに取りやめたとき、寄せた城へ地の兵・兵糧・名簿・将を返す */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const 巡検 = require(path.join(__dirname, '..', 'tools', 'junken.cjs'));
const { initState, 出征の見立て, 城攻めの比, 野で当たる比, 将の利, 将の器量, 近隣から兵を寄せる, 寄せを返す } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 将 = (器) => ({ lead: 器, valor: 器, wit: 器 });
const 近い = (a, b2, e = 1e-6) => Math.abs(a - b2) < e;

console.log('── 一　物差し');
{
  確('器量は統率五分・武勇三分・知略二分', 近い(将の器量({ lead: 80, valor: 60, wit: 50 }), 68));
  確('器量七十までの将なら三倍', 近い(城攻めの比([将(60)]), 3) && 近い(城攻めの比([将(70)]), 3) && 近い(城攻めの比([]), 3));
  確('器量八十で二.七三倍、九十で二.五倍', 近い(城攻めの比([将(80)]), 3 / 1.1) && 近い(城攻めの比([将(90)]), 2.5),
    `${城攻めの比([将(80)]).toFixed(3)}・${城攻めの比([将(90)]).toFixed(3)}`);
  確('九十五より上は二.四倍で止まる', 近い(城攻めの比([将(95)]), 2.4) && 近い(城攻めの比([将(100)]), 2.4));
  確('率いる将のうち、器量のいちばん高い者で決まる', 近い(城攻めの比([将(50), 将(90), 将(60)]), 2.5));
  確('野で当たる敵には一.三倍（将の利で下がる）', 近い(野で当たる比([将(60)]), 1.3) && 近い(野で当たる比([将(90)]), 1.3 / 1.2));
  確('将の利は一から一.二五', 近い(将の利([将(40)]), 1) && 近い(将の利([将(99)]), 1.25));
}

console.log('── 二　見立て');
{
  const s = initState('oda');
  /* 尾張の外の、将のいる他家の城を一つ選ぶ */
  const 的 = s.castles.find((c) => c.faction !== 'oda' && s.generals.some((g) => g.at === c.id && g.faction === c.faction && !g.captive));
  const 守 = 的.local + s.generals.filter((g) => g.at === 的.id && g.faction === 的.faction && !g.captive).reduce((a, g) => a + g.retinue, 0);
  const 見 = 出征の見立て(s, 'oda', 的, [将(60)]);
  確('守は城の地の兵と、城にいる将の手勢', 見.守 === 守, `${的.name} ${見.守}`);
  確('要る兵は、守×三倍＋後詰×一.三倍', 見.要る === Math.round(守 * 3 + 見.後詰 * 1.3) && 見.野の敵 === 0,
    `要る${見.要る}・後詰${見.後詰}`);
  確('望む兵は要る兵の一.三倍', 見.望む === Math.round(見.要る * 1.3));
  s.armies.push({ id: 'zz1', faction: 的.faction, from: 的.id, gens: [], men: 3000, local: 3000, at: 的.id, 在陣: 的.id, path: [], prog: 0, food: 999 });
  const 見2 = 出征の見立て(s, 'oda', 的, [将(60)]);
  確('城に陣を張る相手方の軍は野の敵に数え、その一.三倍を足す', 見2.野の敵 === 3000 && 見2.要る === Math.round(守 * 3 + (見2.後詰 + 3000) * 1.3),
    `野の敵${見2.野の敵}・要る${見2.要る}`);
  const 見3 = 出征の見立て(s, 'oda', 的, [将(95)]);
  確('優れた将が率いれば、要る兵は少なくて済む', 見3.要る < 見2.要る && 見3.要る === Math.round(守 * 2.4 + (見3.後詰 + 3000) * 1.04),
    `${見2.要る} → ${見3.要る}`);
}

console.log('── 三　采配の出陣（月送りを五年）');
{
  巡検.賽を据える(0x51000);
  let s = initState('oda'); s.autoPlay = true;
  const 見た = new Set((s.armies || []).map((a) => a.id));
  const 発 = [];
  let 幾手の月 = 0;
  for (let i = 0; i < 60; i++) {
    if (s.warSettle) { const w = s.warSettle; try { H.滅んだ家を始末する(s, w.faction, w.winner, w.castleId); } catch (e) { /* 進む */ } s.warSettle = null; }
    s = H.advanceMonth(s);
    for (let q = 0; q < 60 && (s.clashes || []).length; q++) s = H.resolveClashOffscreen(s);
    for (let q = 0; q < 120 && (s.pendingArrivals || []).length; q++) {
      const id = s.pendingArrivals[0];
      const a = (s.armies || []).find((x) => x.id === id);
      const 的 = a && s.castles.find((c) => c.id === a.at);
      if (!a || !的) { s.pendingArrivals = s.pendingArrivals.slice(1); continue; }
      s = H.resolveOffscreen(s, a.id, 的.id);
    }
    const 手 = new Map();
    for (const a of s.armies || []) if (a.要り != null && a.target && !a.relief && !a.aid) {
      if (!手.has(a.faction)) 手.set(a.faction, new Set());
      手.get(a.faction).add(a.target);
    }
    if ([...手.values()].some((t) => t.size >= 2)) 幾手の月++;
    for (const a of s.armies || []) {
      if (見た.has(a.id)) continue;
      見た.add(a.id);
      if (a.要り != null) 発.push({ ...a, 月: `${s.year}-${s.month}` });
    }
  }
  const 常 = 発.filter((a) => !a.先手 && !a.奇襲 && !a.本隊);
  const 足りぬ = 常.filter((a) => a.men < a.要り);
  確('他家の攻めの軍は、要る兵を揃えてから発つ', 常.length > 0 && !足りぬ.length,
    `${常.length}軍${足りぬ.length ? `（足りぬまま ${足りぬ.slice(0, 3).map((a) => `${a.men}/${a.要り}`).join('・')}）` : ''}`);
  const 薄い = 常.filter((a) => a.的の守 > 0 && a.men < a.的の守 * 2.4 - 1);
  const 比ら = 常.filter((a) => a.的の守 > 0).map((a) => a.men / a.的の守).sort((x, y) => x - y);
  確('先手・奇襲・先手の後の本隊のほかは、城兵の二.四倍を下回って発たない', !薄い.length,
    `比の中ほど ${比ら.length ? 比ら[Math.floor(比ら.length / 2)].toFixed(2) : '-'}倍`);
  確('奇襲の目で減らしても、城兵の一.七倍を下回って発たない', 発.filter((a) => a.奇襲 && a.的の守 > 0 && a.men < a.的の守 * 1.7 - 1).length === 0,
    `奇襲 ${発.filter((a) => a.奇襲).length}軍`);
  確('別々の城へ攻めの軍を同時に二つ以上出していた家がある', 幾手の月 > 0, `${幾手の月}か月`);
  const 的ら = new Map();
  let 重ね = 0;
  for (const a of 常) { const k = `${a.faction}|${a.月}|${a.target}`; if (的ら.has(k)) 重ね++; 的ら.set(k, 1); }
  確('同じ月に同じ家が同じ城へ二つの軍を向けない（先手の後の本隊は別）', 重ね === 0, `${重ね}`);
  console.log(`    （五年で攻めの軍 ${常.length}・先手 ${発.filter((a) => a.先手).length}・奇襲 ${発.filter((a) => a.奇襲).length}）`);
}

console.log('── 四　寄せを返す');
{
  const s = initState('oda');
  const 城ら = s.castles.filter((c) => c.faction === 'oda');
  const 発 = 城ら[0];
  const 兵の和 = (r) => (r || []).reduce((a, q) => a + (q.m || 0), 0);
  const 前 = new Map(s.castles.map((c) => [c.id, { local: c.local, food: c.food, rost: c.rost ? 兵の和(c.rost) : null }]));
  const 軍 = { id: 'tt', faction: 'oda', from: 発.id, gens: [], local: 0, men: 0, food: 0, rost: [] };
  const 寄 = 近隣から兵を寄せる(s, 'oda', 発, 軍, { 道: H.軍の道, 限り: 6, 歩: 6, 要る: 99999 });
  確('近隣から兵を寄せられる（試しの軍）', 寄.length > 0 && 軍.men > 0, `${寄.length}城・${軍.men}人`);
  寄せを返す(寄);
  const 戻った = 寄.every((q) => {
    const p = 前.get(q.城.id);
    return q.城.local === p.local && Math.round(q.城.food) === Math.round(p.food)
      && (p.rost == null || 兵の和(q.城.rost) === p.rost) && (!q.将 || q.将.at === q.城.id);
  });
  確('返せば、地の兵・兵糧・名簿（兵の和）・将がもとの城に戻る', 戻った);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
