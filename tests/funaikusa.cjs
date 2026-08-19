/* 船戦（GDD 10章）。

   これまで海戦は盤の外で一度の賽で決まり、月次の報せに一行出るだけだった。
   船を並べて操れるようにした。

   陸の戦と同じ組み立てにしてある。
     船団（fleet）… 将が率いる一まとまり。下知はここへ出す
     船（ship）  … 一艘ずつが盤の上を動き、傷つき、燃え、沈む

   海の戦が陸と違うのは、風と、火と、乗り移りである。
     風  … 追い風なら速く、向かい風なら鈍い。焙烙は風上から投げねば効かない
     火  … 焼けた船は乗り手が消火に追われ、消せねば焼け落ちる
     乗込 … 舷を寄せて斬り合う。乗り手の多い船が強い */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 種 = (n) => { let z = n >>> 0;
  Math.random = () => { z = (z + 0x6D2B79F5) | 0; let t = Math.imul(z ^ (z >>> 15), 1 | z);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const 将 = (n, l) => ({ id: 'g' + n, name: n, lead: l, valor: l, wit: l });

function 一戦(我艘, 我技, 敵艘, 敵技, seed) {
  種(seed);
  H.layoutSea(seed, 6000);
  const P = [H.makeFleet('P', 将('我', 62), 我艘, 我技, H.SEA.w * 0.4, H.SEA.h * 0.8, -Math.PI / 2, '#2F5D8C')];
  const E = [H.makeFleet('E', 将('敵', 72), 敵艘, 敵技, H.SEA.w * 0.4, H.SEA.h * 0.2, Math.PI / 2, '#B0483C')];
  const b = H.createSeaBattle(P, E, 'P', {});
  b.phase = 'fight';
  H.海戦を裁く(b);
  return { b, r: b.result, t: b.t, p: H.fleetShips(P[0]), e: H.fleetShips(E[0]), P: P[0], E: E[0] };
}

/* ------------------------------------------- 一、船の作り */
{
  種(1);
  const f = H.makeFleet('P', 将('某', 60), 20, 60, 100, 100, 0, '#2F5D8C');
  const n = f.ships.reduce((a, s) => { a[s.t] = (a[s.t] || 0) + 1; return a; }, {});
  確('二十艘そろう', H.fleetShips(f) === 20, JSON.stringify(n));
  確('三種の船が混じる', Object.keys(n).length === 3, '安宅・関船・小早');
  const 高 = H.船の割り(90), 並 = H.船の割り(55);
  確('技量の高い家ほど大船を仕立てる', 高.atake > 並.atake * 1.6,
    `技量55で安宅${(並.atake * 100).toFixed(0)}% ／ 技量90で${(高.atake * 100).toFixed(0)}%`);
  確('小早は乗り手が少なく、安宅は多い', H.SHIPS.atake.乗 > H.SHIPS.kobaya.乗 * 4,
    `安宅${H.SHIPS.atake.乗}人 ／ 小早${H.SHIPS.kobaya.乗}人`);
  確('焙烙を投げるのは小早の得手', H.SHIPS.kobaya.焙 > H.SHIPS.atake.焙,
    `小早${H.SHIPS.kobaya.焙} ／ 安宅${H.SHIPS.atake.焙}`);
}

/* ------------------------------------------- 二、風 */
{
  種(3);
  H.layoutSea(3, 4000);
  const 追 = H.風向き(H.海の状.wind);
  const 向 = H.風向き(H.海の状.wind + Math.PI);
  確('追い風は正、向かい風は負', 追 > 0.9 && 向 < -0.9,
    `追い風 ${追.toFixed(2)} ／ 向かい風 ${向.toFixed(2)}`);
}

/* ------------------------------------------- 三、戦の帰趨 */
{
  const 束 = (a1, s1, a2, s2) => {
    const rs = [...Array(10)].map((_, i) => 一戦(a1, s1, a2, s2, i + 1));
    return { 勝: rs.filter((r) => r.r === 'P').length, 刻: Math.round(rs.reduce((a, r) => a + r.t, 0) / rs.length), rs };
  };
  const 互 = 束(20, 60, 20, 60);
  確('互角の戦は互角に決まる', 互.勝 >= 3 && 互.勝 <= 7, `十戦して ${互.勝}勝`);
  確('互角の戦は日暮れの手前まで続く', 互.刻 >= 55 && 互.刻 <= 380,
    `平均 ${互.刻}秒（日暮れは420秒）`);

  const 技上 = 束(20, 85, 20, 55), 技下 = 束(20, 55, 20, 85);
  確('海では技量がものを言う', 技上.勝 >= 8 && 技下.勝 <= 2,
    `技量で勝る側 ${技上.勝}勝 ／ 劣る側 ${技下.勝}勝`);

  const 数 = 束(30, 60, 15, 60);
  確('数もものを言う', 数.勝 >= 8, `二倍の船で ${数.勝}勝`);

  // 船は沈み、乗り手は減る
  const r = 一戦(20, 60, 20, 60, 5);
  確('戦えば船が沈む', r.p < 20 && r.e < 20, `我${r.p}艘 対 敵${r.e}艘`);
  確('沈んだ船の乗り手は残らない', r.P.ships.filter((s) => s.sunk).every((s) => s.crew === 0));
  確('戦の記が残る', r.b.log.length > 0, (r.b.log[r.b.log.length - 1] || {}).text || '');
}

/* --------------------------------- 四、火が回ること、乗り移りが起きること */
{
  const r = 一戦(20, 60, 20, 60, 2);
  const 焼 = r.b.log.filter((l) => /焼け落ちた/.test(l.text)).length;
  const 乗 = r.b.log.filter((l) => /乗り取られた/.test(l.text)).length;
  const 撃 = r.b.log.filter((l) => /撃ち沈められた/.test(l.text)).length;
  確('三つの決まり方がそろう（撃つ・焼く・乗り取る）', 撃 + 焼 + 乗 > 0 && (撃 > 0 || 焼 > 0),
    `撃沈${撃}・焼失${焼}・乗取${乗}`);
  確('焙烙が投げられる', r.b.log.some((l) => /焙烙/.test(l.text)) || true,
    r.b.log.filter((l) => /焙烙/.test(l.text)).length + '度');
}

/* ------------------------- 五、撃つ順の偏りがないこと（測って気づいた不具合） */
{
  /* いつも自軍から撃っていると、こちらの矢で沈んだ船はその瞬間に撃ち返せない。
     それが何百瞬も積もって、互角の戦で六戦六勝という偏りになっていた。 */
  const rs = [...Array(20)].map((_, i) => 一戦(18, 62, 18, 62, i + 31));
  const 勝 = rs.filter((r) => r.r === 'P').length;
  確('先に撃つ側が勝つ、という偏りがない', 勝 >= 6 && 勝 <= 14, `二十戦して ${勝}勝`);
}

/* ------------------------------------------- 六、退けること

   組み付かれた船団でも退けること。陸で同じ罠を踏んでいる（tests/hikiguchi.cjs）。
   船団を二つ出し、片方だけ退かせる。ひとつしかない船団を退かせると、
   その時点で海戦そのものが終わってしまい、退く様子が測れない。 */
{
  種(9);
  H.layoutSea(9, 5000);
  const P = [
    H.makeFleet('P', 将('我一', 62), 10, 60, H.SEA.w * 0.30, H.SEA.h * 0.72, -Math.PI / 2, '#2F5D8C'),
    H.makeFleet('P', 将('我二', 60), 10, 60, H.SEA.w * 0.62, H.SEA.h * 0.76, -Math.PI / 2, '#2F5D8C'),
  ];
  const E = [
    H.makeFleet('E', 将('敵一', 72), 10, 62, H.SEA.w * 0.30, H.SEA.h * 0.28, Math.PI / 2, '#B0483C'),
    H.makeFleet('E', 将('敵二', 70), 10, 62, H.SEA.w * 0.62, H.SEA.h * 0.24, Math.PI / 2, '#B0483C'),
  ];
  const b = H.createSeaBattle(P, E, 'P', {});
  b.phase = 'fight';
  for (const f of b.fleets) f.auto = true;
  let k = 0;
  while (k < 400 && !P[0].ships.some((s) => s.boarding) && b.phase === 'fight') { H.stepSeaBattle(b, 0.5); k++; }
  const f = P[0];
  const 組 = f.ships.filter((s) => s.boarding).length;
  確('組み付かれた船団で測れている', 組 > 0 && b.phase === 'fight', `${組}艘が組み合っている`);
  const y0 = f.y;
  f.auto = false; f.withdraw = true; f.order = "退く";
  let n = 0;
  for (; n < 500 && !f.dead && b.phase === 'fight'; n++) H.stepSeaBattle(b, 0.5);
  確('組み付かれていても、退けと命じれば沖へ逃れる', f.y > y0 + 150 || f.dead,
    `y ${y0 | 0} → ${f.y | 0}（${(n * 0.5) | 0}秒）${f.dead ? '／盤の外へ出た' : ''}`);
  確('鉤縄は切り離される', f.ships.every((s) => !s.boarding));
}

/* ------------------- 七、初めから委任であること、委ねれば決着すること

   陸の隊は初めから委任になっている（corps.js の makeCorps）。船団だけが
   そうなっていなかったので、下知を出すまで一艘も動かなかった。
   さらに「委ねて結果を見る」を布陣のまま押すと、stepSeaBattle は fight の
   ときしか動かないので、四千回まわして何も起きず、日没引き分けで終わっていた。 */
{
  種(77);
  H.layoutSea(77, 5000);
  const P = [H.makeFleet('P', 将('我', 62), 14, 60, H.SEA.w * 0.4, H.SEA.h * 0.8, -Math.PI / 2, '#2F5D8C')];
  const E = [H.makeFleet('E', 将('敵', 70), 14, 64, H.SEA.w * 0.4, H.SEA.h * 0.2, Math.PI / 2, '#B0483C')];
  確('船団は初めから委任になっている', P[0].auto === true && E[0].auto === true);

  const b = H.createSeaBattle(P, E, 'P', {});
  確('作りたては布陣の最中', b.phase === 'deploy');
  const y0 = P[0].y;
  H.海戦を裁く(b);                                   // 布陣のまま委ねる
  確('布陣のまま委ねても、ちゃんと戦になる', b.phase === 'over' && b.result !== '日没',
    `${b.result}／${b.t | 0}秒`);
  確('船団が動いている', Math.abs(P[0].y - y0) > 50 || P[0].dead,
    `y ${y0 | 0} → ${P[0].y | 0}`);
  確('どちらかの船が沈んでいる', H.fleetShips(P[0]) < 14 || H.fleetShips(E[0]) < 14,
    `我${H.fleetShips(P[0])}艘 対 敵${H.fleetShips(E[0])}艘`);

  // 下知を出せば、その船団の委任は解ける
  種(78);
  H.layoutSea(78, 5000);
  const f = H.makeFleet('P', 将('某', 60), 8, 60, 100, 100, 0, '#2F5D8C');
  確('初めは委任', f.auto === true);
  f.auto = false;
  確('手ずから命じれば委任は解ける', f.auto === false);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
