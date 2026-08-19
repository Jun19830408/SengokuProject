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

/* ---------------- 五、迎え撃つのは、攻められる家だけであること

   「小早川が三原から川之江の河野を攻めたら、関わりのない三好の水軍が出てきて
     船戦になった」との報せ。三好は畿内の海を扼しているが、この戦の当事者では
     ない。第三者が割って入るのでは、誰と戦っているのか分からなくなる。

   船戦は、渡る側と、渡られる側のあいだで起きる。 */
{
  const 三原 = s.castles.find((x) => x.name === "三原城");
  const 川之江 = s.castles.find((x) => x.name.includes("川之江"));
  確('三原と川之江は海路で結ばれている',
    !!三原 && !!川之江 && (H.roadBetween(三原.id, 川之江.id) || [])[3] === "海路");
  const army = { faction: 三原.faction, men: 4000, local: 4000,
    path: [三原.id, 川之江.id], target: 川之江.id };
  const 誰 = new Set();
  let 出 = 0;
  for (let i = 0; i < 3000; i++) { const r = H.seaInterception(s, army, "海路"); if (r) { 出++; 誰.add(r.by); } }
  確('関わりのない第三者は割って入らない', !誰.has("miyoshi"),
    `三好は${H.navalPower(s, "miyoshi").ships}艘を擁するが、この戦には出てこない`);
  確('迎え撃つのは攻められる家（河野）だけ',
    [...誰].every((f) => f === 川之江.faction),
    [...誰].map(名).join("・") || "誰も出てこなかった");
  console.log(`  （小早川 ${H.navalPower(s, 三原.faction).ships}艘 対 河野 ${H.navalPower(s, 川之江.faction).ships}艘`
    + `／迎え撃たれる割 ${(100 * 出 / 3000).toFixed(1)}%）`);

  // 攻める側が海を握っていれば、迎え撃つ船は出てこない
  const t = JSON.parse(JSON.stringify(s));
  for (const c of t.castles.filter((x) => x.faction === "miyoshi")) c.faction = 三原.faction;
  let 出2 = 0;
  for (let i = 0; i < 2000; i++) if (H.seaInterception(t, army, "海路")) 出2++;
  確('攻める側が海を握れば、迎え撃つ船は出てこない', 出2 === 0,
    `小早川が三好の海を併せると ${H.navalPower(t, 三原.faction).ships}艘。河野は湊に留まる`);
}

/* ------------- 六、どの家も渡海のときは船を出すこと（船が無いほうが得、を直す）

   水軍が三艘に満たなければ迎え撃たれず、そのまま渡って陸で戦えた。
   船が無いほうが得をするのでは、仕組みとして逆さまである。

   実際には、どの家も海を渡るときは船を出す。軍船が足りなければ浦の漁船を徴し、
   とにかく浮くものへ兵を乗せて渡った。だから船戦は必ず起きる。中身が違うだけである。 */
{
  const 淡路 = s.castles.find((x) => x.id === 'sumoto');
  const 別所立 = H.渡海の船立て(s, 'bessho', 6000);
  const 三好立 = H.迎え撃つ船立て(s, 'miyoshi', 淡路);
  確('船を持たぬ家でも、渡るなら船を出す', 別所立.艘 > 40,
    `別所 ${別所立.艘}艘（軍船${別所立.軍船}・徴した小舟${別所立.徴船}）技量${別所立.skill}`);
  確('徴した小舟ばかりでは、水主の技量が上がらない', 別所立.skill <= 40, `技量${別所立.skill}`);
  確('船の数は兵の数でも決まる', H.渡海の船立て(s, 'bessho', 1500).艘 < 別所立.艘 * 0.5,
    `兵1500で${H.渡海の船立て(s, 'bessho', 1500).艘}艘 ／ 兵6000で${別所立.艘}艘`);
  確('船立ての力は、艘数ではなく船の格で測る',
    H.船立ての力(別所立) < H.船立ての力(三好立),
    `別所${別所立.艘}艘の力 ${Math.round(H.船立ての力(別所立))} ＜ 三好${三好立.艘}艘の力 ${Math.round(H.船立ての力(三好立))}`);
  確('海を握っているかは、軍船だけで測る（漁船は海を制しない）',
    別所立.軍力 < 三好立.軍力 * 0.1,
    `別所の軍力 ${Math.round(別所立.軍力)} ／ 三好の軍力 ${Math.round(三好立.軍力)}`);

  const 別所軍 = { faction: 'bessho', men: 6000, local: 6000, path: ['miki', 'sumoto'], target: 'sumoto' };
  let 出1 = 0;
  for (let i = 0; i < 400; i++) if (H.seaInterception(s, 別所軍, '海路')) 出1++;
  確('船を持たぬ家が海を握る家へ渡れば、必ず阻まれる', 出1 === 400,
    `別所→洲本 ${(100 * 出1 / 400).toFixed(0)}%`);

  const 三好軍 = { faction: 'miyoshi', men: 6000, local: 6000, path: ['sumoto', 'miki'], target: 'miki' };
  let 出2 = 0;
  for (let i = 0; i < 400; i++) if (H.seaInterception(s, 三好軍, '海路')) 出2++;
  確('海を握る家が渡るなら、船は出てこない', 出2 === 0, `三好→三木 ${(100 * 出2 / 400).toFixed(0)}%`);

  // 互いに水軍を持つ家どうしは、どちらから渡っても阻まれる
  const 往 = { faction: 'kobayakawa', men: 4000, local: 4000, path: ['mihara', 'kawanoe'], target: 'kawanoe' };
  const 復 = { faction: 'kono', men: 4000, local: 4000, path: ['kawanoe', 'mihara'], target: 'mihara' };
  let 出3 = 0, 出4 = 0;
  for (let i = 0; i < 400; i++) { if (H.seaInterception(s, 往, '海路')) 出3++; if (H.seaInterception(s, 復, '海路')) 出4++; }
  確('水軍を持つ家どうしは、どちらから渡っても船戦になる', 出3 === 400 && 出4 === 400,
    `小早川→河野 ${(100 * 出3 / 400).toFixed(0)}% ／ 河野→小早川 ${(100 * 出4 / 400).toFixed(0)}%`);

  // 陸の道では海戦は起きない
  const 陸 = { faction: 'oda', men: 6000, local: 6000, path: ['nagoya', 'kiyosu'], target: 'kiyosu' };
  確('街道では海戦は起きない', !H.seaInterception(s, 陸, '街道'));
}

/* ------------------------------------- 七、海戦の帰趨 */
{
  const army = { faction: 'oda', men: 6000, local: 6000,
    path: ['miki', 'sumoto'], target: 'sumoto', rost: null };
  const inter = H.seaInterception(s, army, '海路');
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
