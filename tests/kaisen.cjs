/* 海路と水軍（GDD 10章）。

   「洲本城から三木城に攻めた際、海路なので海戦になるのではないかと思ったが、
     普通に野戦が始まった」との報せ。海路の引き方は正しかった
     （["miki","sumoto",52,"海路"]）。障りは水軍の力を数える側にあった。

   一、湊と水軍衆の持ち主を、盤にない欄で見ていた
       s.specials[t.id].owner を見ていたが、記録にそんな欄はない。
       誼を通じた家は st.faction に書かれる。つまり常に偽で、湊の験も
       水軍衆の験も一度も効いていなかった。

   二、瀬戸内と九州に、湊も水軍衆も一つも無かった
       全国で港十・水軍衆一、それも尾張から越前までの東国に固まっていた。
       戦国の海のうち最も船の行き交う瀬戸内が空白では、渡っても誰も出てこない。

   三、海に面した城の判じが、粗い海岸線に負けていた
       内陸の稲葉山城が「海に面する」に入り、伊予の湯築城が外れていた。
       大内十一城はすべて外れ、瀬戸内と九州の家に船が一艘も無かった。

   四、迎え撃つ見込みが、力の差に関わらず一律二割だった
       海を扼している家の目の前を、八割がた素通りできる。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const s = H.initState('oda');
const 名 = (f) => (s.factions[f] || {}).name || f;

/* ------------------------------------------- 一、海路そのもの */
{
  const r = H.roadBetween('sumoto', 'miki');
  確('洲本と三木は海路で結ばれている', !!r && r[3] === '海路', JSON.stringify(r));
}

/* ------------------------------- 二、海に面した城を取り違えないこと */
{
  const 城 = (n) => s.castles.find((x) => x.name === n);
  const 湯築 = 城('湯築城'), 稲葉山 = 城('稲葉山城'), 洲本 = 城('洲本城');
  確('伊予の湯築城は海に面する', !!湯築 && H.isCoastal(湯築));
  確('淡路の洲本城は海に面する', !!洲本 && H.isCoastal(洲本));
  const 大内 = s.castles.filter((x) => x.faction === 'ouchi');
  const 大内海 = 大内.filter((x) => H.isCoastal(x)).length;
  確('大内の城に海に面したものがある', 大内海 > 0, `${大内.length}城のうち${大内海}城`);
  const 河野 = s.castles.filter((x) => x.faction === 'kono');
  確('伊予の河野にも海に面した城がある', 河野.some((x) => H.isCoastal(x)),
    `${河野.filter((x) => H.isCoastal(x)).length}／${河野.length}城`);
}

/* ------------------------------ 三、瀬戸内と九州に湊と水軍衆があること */
{
  const 西 = H.TOWNS.filter((t) => (t.kind === '港' || t.kind === '水軍衆') && t.lon < 135.5);
  確('瀬戸内から西に、湊と水軍衆が置かれている', 西.length >= 8,
    `${西.length}か所：${西.slice(0, 6).map((t) => t.name).join('・')}…`);
  const 淡路 = H.TOWNS.find((t) => t.id === 'ataka_sui');
  確('淡路の海に水軍衆がいる', !!淡路 && H.湊の主(s, 淡路) === 'miyoshi',
    淡路 ? `${淡路.name} → ${名(H.湊の主(s, 淡路))}` : '');
}

/* ------------------------------- 四、湊の験が効くこと（持ち主の取り違え） */
{
  const 三好 = H.navalPower(s, 'miyoshi');
  const 織田 = H.navalPower(s, 'oda');
  const 武田 = H.navalPower(s, 'takeda');
  確('畿内の海を扼する三好に、相応の水軍がある', 三好.ships >= 40,
    `${三好.ships}艘・技量${三好.skill}`);
  確('水軍衆を抱える家は技量も高い', 三好.skill > 55, `技量${三好.skill}`);
  確('山国の武田に水軍はない', 武田.ships <= 3, `${武田.ships}艘`);
  確('海のある家と無い家で、はっきり差が付く', 三好.ships > 武田.ships * 8,
    `三好${三好.ships}艘 対 武田${武田.ships}艘`);
  console.log(`  （織田 ${織田.ships}艘・技量${織田.skill}）`);
}

/* --------------------- 五、海を扼する家の前を素通りできないこと */
{
  const army = { faction: 'oda', men: 6000, local: 6000, path: ['sumoto', 'miki'], rost: null };
  let 出た = 0; const 回 = 4000;
  for (let i = 0; i < 回; i++) if (H.seaInterception(s, army, '海路')) 出た++;
  const 割 = 100 * 出た / 回;
  確('三好の海を渡れば、まず迎え撃たれる', 割 >= 55,
    `洲本→三木を織田が渡るとき ${割.toFixed(1)}%（直す前は一律20%）`);

  // 陸の道では海戦は起きない
  const 陸 = { faction: 'oda', men: 6000, local: 6000, path: ['nagoya', 'kiyosu'], rost: null };
  確('街道では海戦は起きない', !H.seaInterception(s, 陸, '街道'));

  // 力の差で見込みが動く
  const t = JSON.parse(JSON.stringify(s));
  for (const c of t.castles.filter((x) => x.faction === 'miyoshi')) c.faction = 'oda';
  let 出た2 = 0;
  for (let i = 0; i < 2000; i++) if (H.seaInterception(t, { ...army }, '海路')) 出た2++;
  確('こちらが海を握れば、出てくる者はいない', 100 * 出た2 / 2000 < 割 * 0.5,
    `三好の城をすべて奪った後 ${(100 * 出た2 / 2000).toFixed(1)}%`);
}

/* ------------------------------------- 六、海戦の帰趨 */
{
  const army = { faction: 'oda', men: 6000, local: 6000, path: ['sumoto', 'miki'], rost: null };
  let inter = null;
  for (let i = 0; i < 200 && !inter; i++) inter = H.seaInterception(s, army, '海路');
  確('迎え撃ちの中身が読める', !!inter && !!inter.foe && !!inter.mine,
    inter ? `${名(inter.by)} ${inter.foe.ships}艘 対 織田 ${inter.mine.ships}艘` : '');
  if (inter) {
    const a2 = { ...army };
    const r = H.resolveSeaBattle(s, a2, inter);
    確('敗れれば兵が海に沈む', r.lost > 0 && a2.men < army.men,
      `${r.win ? '勝った' : '敗れた'}／${r.lost}人を失い ${a2.men}人`);
  }
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
