// 知行と城主の仕来りを見る試験。
//
// 一、加増が没収に化けないこと
//   配れる余地（石高の四割 − 配分済）は負にもなる。城を失えばすぐそうなるし、
//   初めから配りすぎている家もある。そこへ Math.min(加増, 余地) と書いていたため、
//   余地が負のときに「四千石を与える」が「八万石を召し上げる」に化けていた。
//
// 二、城主に任じられるのは、その城の身代に見合う禄高を持つ者だけであること
//   決まり（canHoldCastle）は前からあったのに、任じる側で通していなかった。
//   届かぬ者を任じても castellanOf が黙って別の者を城主とみなすので、
//   「任じた」と戦国記に残るのに実際の城主は違う、という食い違いになっていた。
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'fief-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState, migrateSave } from "../src/core/state.js";\n'
+ 'export { fiefRoom, fiefOf, stipendOf, fiefBurden, castleRankNeed, canHoldCastle, canBeKeeper, 預かりの格, castellanOf, rankName, 身分の位, 軍役の器, 家老の枠, 家老たち, 国の家老, 家老に任じる, 家老を繕う, 寄騎たち, 寄騎に取れるか, 寄騎に取る, 寄騎を解く, 寄騎を繕う, 総大将を定める, 大将を先頭に } from "../src/core/rank.js";\n'
+ 'export { grantFief, appoint, 旗頭に任じる } from "../src/govern/commands.js";\n'
+ 'export { isMainClan } from "../src/core/house.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n');
const out = path.join(ROOT, 'build', 'fief.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 挙げる = (配) => `${配.length}件 ─ ${配.slice(0, 5).join(' / ')}${配.length > 5 ? ` …ほか${配.length - 5}` : ''}`;
const 無し = (名, 配, 但し = '') => 確(名, 配.length === 0, 配.length ? 挙げる(配) : (但し || 'なし'));
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* ------------------------------------------- 一、加増が没収に化けないこと */
{
  const s = A.initState('oda');
  const r = A.fiefRoom(s, s.player);
  確('初めから加増できる余地がある', r.left > 0,
    `限り ${r.cap}石／配分済 ${r.used}石／余地 ${r.left}石`);

  // 配りすぎの局面（城を失って石高が減った形）でも、加増が没収に化けないこと
  const u = A.initState('oda');
  for (const c of u.castles.filter((x) => x.faction === u.player)) c.koku = Math.round(c.koku * 0.2);
  const r2 = A.fiefRoom(u, u.player);
  確('石高が減れば余地は負になりうる', r2.left < 0, `余地 ${r2.left}石`);
  const q = u.generals.find((x) => x.faction === u.player && !x.lord && A.fiefOf(x) > 1000);
  const 前 = A.fiefOf(q);
  const t = A.grantFief(u, q.id, 4000);
  const 後 = A.fiefOf(t.generals.find((x) => x.id === q.id));
  確('配りすぎのとき、加増しても減らない', 後 >= 前, `${q.name} ${前} → ${後}石`);
  確('知行が負にならない', 後 >= 0, `${後}石`);
  確('なぜ配れぬかを報せる', /配れる知行が残っていない/.test(t.msg || ''), t.msg || '（報せなし）');
}

/* ------------------------------- 余地があるときは、これまで通り加増できる */
{
  const s = A.initState('oda');
  for (const x of s.generals.filter((y) => y.faction === s.player)) x.fief = 0;
  const q = s.generals.find((x) => x.faction === s.player && !x.lord);
  確('余地があれば加増できる', (() => {
    const t = A.grantFief(s, q.id, 4000);
    return A.fiefOf(t.generals.find((x) => x.id === q.id)) === 4000;
  })(), '＋4,000石');
  確('減らすこともできる', (() => {
    let t = A.grantFief(s, q.id, 4000);
    t = A.grantFief(t, q.id, -1500);
    return A.fiefOf(t.generals.find((x) => x.id === q.id)) === 2500;
  })(), '−1,500石');
  確('持ち高より多くは召し上げられない', (() => {
    let t = A.grantFief(s, q.id, 1000);
    t = A.grantFief(t, q.id, -4000);
    return A.fiefOf(t.generals.find((x) => x.id === q.id)) === 0;
  })(), '0石で止まる');
}

/* ------------------------- 二、負の知行を抱えた古い記録を、読み込みで繕う */
{
  const s = A.initState('oda');
  const q = s.generals.find((x) => x.faction === s.player && !x.lord);
  q.fief = -9360;                                  // 直す前の不具合が書き込んだ値
  const t = A.migrateSave(JSON.parse(JSON.stringify(s)));
  const 後 = t.generals.find((x) => x.id === q.id);
  確('負の知行は読み込みで零に繕われる', 後.fief === 0, `-9,360 → ${後.fief}石`);
  確('繕ったあと禄高も負にならない', A.stipendOf(t, 後) >= 0, `${A.stipendOf(t, 後)}石`);
}

/* --------------------------- 三、城主に任じられるのは身代に見合う者だけ */
{
  const s = A.initState('oda');
  /* 当主のいない城を選ぶ。
     castellanOf は「当主のいる城は当主が城主である」と定めているので、
     当主の座す城で任命の効きめを測ることはできない。 */
  const c = s.castles.find((x) => x.faction === s.player
    && !s.generals.some((y) => y.lord && y.at === x.id && y.faction === s.player));
  const 要る = A.castleRankNeed(c);
  const ここ = s.generals.filter((x) => x.at === c.id && x.faction === s.player && !x.captive);
  const 足りる = ここ.find((x) => A.canHoldCastle(x, s, c) && !x.lord);
  const 足りぬ = ここ.find((x) => !A.canHoldCastle(x, s, c));
  console.log(`  （${c.name}を預かるには禄高 ${要る}石が要る）`);

  /* もとは、禄高の足りぬ者を任じようとすれば拒んでいた。

     いまは拒まず、城代として預ける。城主になれぬ者にも留守を任せる道は
     あるのだから、押せぬようにする筋はない。仕様が変わったので、測り直す。 */
  if (足りぬ) {
    const t = A.appoint(s, c.id, 足りぬ.id);
    const c2 = t.castles.find((x) => x.id === c.id);
    確('禄高の足りぬ者は城主にはならない', !(c2.lordId === 足りぬ.id && !c2.城代),
      `${足りぬ.name}（禄高${A.stipendOf(s, 足りぬ)}石／要り${要る}石）`);
    確('その者は城代として預かる', c2.lordId === 足りぬ.id && c2.城代 === true);
    確('城代に任じた旨が戦国記に残る',
      (t.chronicle || []).some((x) => x.text.includes(`${足りぬ.name}を${c.name}の城代に任じた`)),
      ((t.chronicle || []).filter((x) => x.text.includes(足りぬ.name)).slice(-1)[0] || {}).text || 'なし');
    確('城主に任じたとは書かない',
      !(t.chronicle || []).some((x) => x.text.includes(`${足りぬ.name}を${c.name}の城主に任じた`)));
  } else console.log('  （この城には禄高の足りぬ者がいないので、その確かめは省く）');

  if (足りる) {
    const t = A.appoint(s, c.id, 足りる.id);
    const c2 = t.castles.find((x) => x.id === c.id);
    確('禄高の足りる者は城主に任じられる', c2.lordId === 足りる.id,
      `${足りる.name}（禄高${A.stipendOf(s, 足りる)}石）`);
    確('任じた者が、実際にその城の城主とみなされる',
      (A.castellanOf(t, c2) || {}).id === 足りる.id);
  } else console.log('  （この城には禄高の足りる家臣がいないので、その確かめは省く）');
}

/* ------------------------------- 四、大名の一門は禄高を問わず城を預かれる

   血を分けた者は、禄高が伴わずとも家の名代として城を預かった。
   織田信長が十三で那古野を預かったのは、二千四百石だからではなく織田の子だからである。 */
{
  const s = A.initState('oda');
  // ここも当主のいない城を使う（当主の座す城は当主が城主となるため）
  const c = s.castles.find((x) => x.faction === s.player
    && !s.generals.some((y) => y.lord && y.at === x.id && y.faction === s.player));
  const 信長 = s.generals.find((x) => x.name === '織田信長');
  if (信長) 信長.at = c.id;                      // 一門をその城へ移す
  const 要る = A.castleRankNeed(c);
  確('一門は禄高が足りずとも預かれる',
    !!信長 && A.stipendOf(s, 信長) < 要る && A.canHoldCastle(信長, s, c),
    信長 ? `${信長.name} ${信長.age}歳／禄高${A.stipendOf(s, 信長)}石（要る禄高${要る}石）` : '');
  const t = A.appoint(s, c.id, 信長.id);
  const c2 = t.castles.find((x) => x.id === c.id);
  確('一門を城主に任じられる', c2.lordId === 信長.id);
  確('任じた一門が、実際にその城の城主とみなされる',
    (A.castellanOf(t, c2) || {}).id === 信長.id);
  確('戦国記に残る', (t.chronicle || []).some((x) => x.text.includes(`${信長.name}を${c.name}の城主に任じた`)));

  // 一門でも他家でもない者は、これまで通り禄高で測る
  const 他 = s.generals.find((x) => x.at === c.id && x.faction === s.player && !x.lord
    && !A.canHoldCastle(x, s, c));
  if (他) {
    const u = A.appoint(s, c.id, 他.id);
    const uc = u.castles.find((x) => x.id === c.id);
    確('一門でない者は、なお城主には禄高が要る（城代にはなれる）',
      uc.lordId === 他.id && uc.城代 === true,
      `${他.name}（禄高${A.stipendOf(s, 他)}石）→ 城代`);
  } else console.log('  （この城には禄高の足りぬ一門外の将がいないので、その確かめは省く）');
}

/* ------------------------------------------- 三、本領（GDD 6.4）

   武将は城とその城が抱える土地に根付く。持っていたのは「いま居る所」（at）
   だけだったので、出陣しただけで身代が動いた。

     出陣で禄高が動いた将　　八百三十七名（平均九百十八石の目減り）
     天文十五年の織田信長　　在城 二千四百石 ／ 出陣中 三万二千六百石

   信長が跳ねたのは、出陣中は城が見つからず知行をそのまま返しており、
   齢の頭打ち（十三歳は二千四百石まで）を素通りしていたからである。

   身代は本領から出る。余禄は本領の湊や市から入るものであって、遠征先の
   余禄が懐に入る道理はない。城の背負い（fiefBurden）も同じ理で本領で数える。
   居場所で数えていたころは、一人が出陣するたびに留守の者の禄高が
   ひとりでに上がっていた。 */
{
  const s = A.initState('oda');
  無し('本領の無い武将がいない', s.generals.filter((g) => !g.本領).map((g) => g.name));
  無し('本拠の無い家がない',
    Object.keys(s.factions).filter((f) => !s.factions[f].本拠));

  // 出陣しても禄高は動かない
  const 動いた = [];
  for (const x of s.generals.filter((q) => q.at && !q.lord)) {
    const 前 = A.stipendOf(s, x);
    const 控 = x.at; x.at = null;
    const 後 = A.stipendOf(s, x);
    x.at = 控;
    if (前 !== 後) 動いた.push(`${x.name} ${前}→${後}`);
  }
  無し('出陣しても禄高が動かない', 動いた, '八百三十七名が動いていた');

  // 齢の頭打ちは出陣中も効く
  const 若 = s.generals.find((g) => (g.age || 30) < 15 && g.本領);
  if (若) {
    const 在 = A.stipendOf(s, 若);
    const 控 = 若.at; 若.at = null;
    const 出 = A.stipendOf(s, 若);
    若.at = 控;
    確('若年の頭打ちは出陣中も効く', 在 === 出,
      `${若.name}（${若.age}歳）在城 ${在}石／出陣中 ${出}石`);
  }

  // 古い記録の繕い
  const 旧 = A.initState('oda');
  for (const g of 旧.generals) delete g.本領;
  for (const f of Object.values(旧.factions)) delete f.本拠;
  A.migrateSave(旧);
  無し('古い記録にも本領が入る', 旧.generals.filter((g) => !g.本領).map((g) => g.name));
  確('古い記録の本拠は当主の城になる',
    旧.factions.oda.本拠 === (旧.generals.find((g) => g.faction === 'oda' && g.lord) || {}).at,
    旧.castles.find((c) => c.id === 旧.factions.oda.本拠).name);
}

/* --------------------------------------- 四、総大将は身分で決まる（GDD 6.4）

   侍大将の下に家老は付かない。軍中にその家の家老がいるなら家老が、宿老が
   いるなら宿老が総大将である。当主が出れば当主が率いる。

   もとは出陣の画面で「選んだ順の先頭」を総大将としていた。物頭を先に選べば
   物頭が家老を指揮することになり、身分が意味を持たなかった。 */
{
  const s = A.initState('oda');
  const 我 = s.generals.filter((g) => g.faction === 'oda' && !g.captive);
  const 別 = {};
  for (const g of 我) { const r = A.rankName(g, s); (別[r] = 別[r] || []).push(g); }
  const 取 = (r, n) => (別[r] || []).slice(0, n);
  const 当主 = 我.find((g) => g.lord);

  console.log(`  （織田の家中 ${['宿老', '家老', '侍大将', '物頭']
    .map((r) => `${r} ${(別[r] || []).length}`).join('／')}）`);

  if ((別.家老 || []).length && (別.侍大将 || []).length) {
    const 組 = [...取('侍大将', 1), ...取('家老', 1)];
    const 主 = A.総大将を定める(s, 組);
    確('侍大将を先に選んでも、家老が総大将になる',
      A.rankName(主, s) === '家老',
      `${組.map((x) => `${x.name}(${A.rankName(x, s)})`).join(' → ')} ⇒ ${主.name}`);
    確('並びの先頭が総大将になる（軍は先頭を大将とする）',
      A.大将を先頭に(s, 組)[0].id === 主.id,
      A.大将を先頭に(s, 組).map((x) => x.name).join(' → '));
  }
  if ((別.物頭 || []).length && (別.家老 || []).length) {
    const 主 = A.総大将を定める(s, [...取('物頭', 1), ...取('家老', 1)]);
    確('物頭を先に選んでも、家老が総大将になる', A.rankName(主, s) === '家老', 主.name);
  }
  if (当主 && (別.家老 || []).length) {
    const 主 = A.総大将を定める(s, [...取('家老', 1), 当主]);
    確('当主が出れば当主が率いる', 主.id === 当主.id, `${主.name}（当主）`);
  }
  if ((別.侍大将 || []).length >= 3) {
    const 組 = 取('侍大将', 3);
    const 主 = A.総大将を定める(s, 組);
    確('同じ身分なら禄高の高い者が率いる',
      組.every((x) => A.stipendOf(s, 主) >= A.stipendOf(s, x)),
      `${主.name}（禄高${A.stipendOf(s, 主)}石）`);
  }
  確('誰も選ばねば総大将は立たない', A.総大将を定める(s, []) === null);
}

/* ------------------------------------- 五、城主と城代（GDD 6.4）

   もとは禄高だけで城主の可否を測っていた。城の要りは高くても八千石で
   頭打ちなので、禄高がたまたま届いた物頭でも城主になれてしまう。

   城を預かるのは一手の兵を任される身分になってからのことである。城主に
   なれるのは侍大将以上で、かつその城の身代に見合う禄高を持つ者。届かぬ者は
   城代として留守を預かる。門番と足軽を束ねるのが役目であって、その城を
   知行として与えられたわけではない（本領は移らない）。

   一門と当主は身分を問わず城主である。織田信長が十三で那古野を預かったのは
   二千四百石だからではなく、織田の子だからである。 */
{
  const s = A.initState('oda');
  const 我 = s.generals.filter((g) => !g.lord && !g.captive);
  const 城ら = s.castles.filter((c) => c.faction === 'oda');
  /* 当主のいる城は、誰を任じても当主が預かる（castellanOf）。
     城主と城代の別を測るには、当主のいない城を選ぶ。 */
  const 城 = 城ら.find((c) => !s.generals.some((g) => g.lord && g.faction === 'oda' && g.at === c.id))
    || 城ら[0];

  無し('物頭は城主になれない（一門を除く）',
    我.filter((g) => A.rankName(g, s) === '物頭' && !g.架空 && A.canHoldCastle(g, s, 城)
      && !A.isMainClan(s, g))
      .map((g) => `${g.name}（禄高${A.stipendOf(s, g)}石）`),
    '禄高が届いても、身分が足らねば城主にはなれぬ');

  const 一門物頭 = 我.find((g) => A.rankName(g, s) === '物頭' && A.isMainClan(s, g));
  if (一門物頭) {
    確('一門は身分を問わず城主になれる', A.canHoldCastle(一門物頭, s, 城),
      `${一門物頭.name}（${一門物頭.age}歳・${A.rankName(一門物頭, s)}・禄高${A.stipendOf(s, 一門物頭)}石）`);
  }

  const 侍 = 我.find((g) => g.at === 城.id && A.rankName(g, s) === '侍大将' && !A.canHoldCastle(g, s, 城));
  if (侍) {
    確('禄高の届かぬ侍大将は城代どまり', A.預かりの格(侍, s, 城) === '城代',
      `${侍.name}（禄高${A.stipendOf(s, 侍)}石／この城の要り${A.castleRankNeed(城)}石）`);
    // 城代として任じられること
    const u = A.appoint(s, 城.id, 侍.id);
    const c2 = u.castles.find((x) => x.id === 城.id);
    確('城代として任じられる', c2.lordId === 侍.id && c2.城代 === true,
      `${侍.name}を${城.name}の城代に`);
    確('城代の本領は移らない',
      (u.generals.find((x) => x.id === 侍.id) || {}).本領 === 侍.本領,
      `本領 ${(u.castles.find((x) => x.id === (u.generals.find((y) => y.id === 侍.id) || {}).本領) || {}).name}`);
    確('城代でも守備隊の統率は映る（その者が城を預かる）',
      A.castellanOf(u, c2) && A.castellanOf(u, c2).id === 侍.id,
      `${城.name}を預かるのは ${(A.castellanOf(u, c2) || {}).name}`);
  }

  const 家老 = 我.find((g) => g.at === 城.id && A.rankName(g, s) === '家老' && A.canHoldCastle(g, s, 城));
  if (家老) {
    const u = A.appoint(s, 城.id, 家老.id);
    const c2 = u.castles.find((x) => x.id === 城.id);
    確('家老は城主になれる', c2.lordId === 家老.id && !c2.城代, 家老.name);
    確('城主は根をその城へ移す',
      (u.generals.find((x) => x.id === 家老.id) || {}).本領 === 城.id,
      `${家老.name}の本領 → ${城.name}`);
  }

  // 盤ぜんたいの散らばり
  const 数 = {};
  for (const g of 我) {
    const r = A.rankName(g, s);
    const 自城 = s.castles.filter((c) => c.faction === g.faction);
    const 主か = 自城.some((c) => A.canHoldCastle(g, s, c));
    数[r] = 数[r] || [0, 0]; 数[r][主か ? 0 : 1]++;
  }
  console.log('  （身分ごと 城主になれる／城代どまり： '
    + ['宿老', '家老', '侍大将', '物頭'].filter((r) => 数[r])
      .map((r) => `${r} ${数[r][0]}／${数[r][1]}`).join('・') + '）');
}

/* ------------------------------------- 六、兵の数は身分で縛らない（GDD 6.4）

   もとは身分ごとに率いられる兵を定めていた（物頭五百・侍大将千六百・
   家老二千五百・宿老四千）。しかし史実で武将が連れてきた兵は知行高で決まる
   （軍役）。身分が決めたのは何人を束ねられるか――寄騎を何家付けられるか――
   であって、自らの手勢の数ではない。

   実のところ、この上限はほとんど効いてもいなかった。八百三十七名を測って、
   直属が切られていたのは一名（二十人）だけである。

   いま身分が効くのは二つ。軍を率いられるか（侍大将以上）と、陣触れがどこまで
   届くか（自城／一国／天下）である。 */
{
  const s = A.initState('oda');
  const 我 = s.generals.filter((g) => !g.lord && !g.captive);
  無し('手勢の器は知行なりで、身分では切られない',
    我.filter((g) => A.軍役の器(g) > 0 && A.軍役の器(g) < g.retinue)
      .map((g) => `${g.name}（器${A.軍役の器(g)}／手勢${g.retinue}）`),
    `${我.length}名を検めた`);

  // 月を送っても、手勢は軍役の器まで伸びる（身分で頭打ちにならない）
  let u = A.initState('oda');
  for (let i = 0; i < 24; i++) u = A.advanceMonth(u);
  const 伸 = u.generals.filter((g) => g.faction === 'oda' && !g.captive);
  無し('月を送っても、手勢が身分で頭打ちにならない',
    伸.filter((g) => g.retinue > A.軍役の器(g) + 1)
      .map((g) => `${g.name}（手勢${g.retinue}／器${A.軍役の器(g)}）`),
    伸.slice(0, 3).map((g) => `${g.name} ${A.rankName(g, u)} 手勢${g.retinue}＝器${A.軍役の器(g)}`).join('／'));

  // 軍を率いられるのは侍大将以上
  const 物 = 我.find((g) => A.rankName(g, s) === '物頭');
  const 侍 = 我.find((g) => A.rankName(g, s) === '侍大将');
  if (物) 確('物頭は軍を率いられない', A.身分の位(物, s) < 2,
    `${物.name}（${A.rankName(物, s)}・位${A.身分の位(物, s)}）`);
  if (侍) 確('侍大将は軍を率いられる', A.身分の位(侍, s) >= 2,
    `${侍.name}（位${A.身分の位(侍, s)}）`);
}

/* ------------------------------------- 七、家老は役である（旗頭／GDD 6.4）

   もとは家老も禄高で決めていた（八千石以上）。しかし織田家は尾張の一角から
   始まるのに、初手から家老が五人もいた。国を一つしか持たぬ家に家老が五人
   いては、旗頭という意味を成さない。逆に大身の家では家老が十人を超え、
   侍大将との段差も消えていた。

     三好家　八国に家老十五名　　北条家　三国に家老十二名　織田家　一国に家老五名

   役として任じる形にすれば、家老は国の数だけとなり、国を取るたびに一人ずつ
   増える。侍大将との間に、はっきりした隔たりが生まれる。

     直す前　宿老 7／家老191／侍大将581／物頭59
     いま　　宿老 8／家老138／侍大将629／物頭58（家老は一割六分）

   宿老は禄高でも就ける（二万石以上）。役として任じる形は第四段で扱う。 */
{
  const s = A.initState('oda');
  確('織田は一国ゆえ、家老は一人', A.家老たち(s, 'oda').length === 1,
    A.家老たち(s, 'oda').map((g) => `${g.name}（${g.役国}）`).join('・') || 'なし');
  確('家老の枠は持つ国の数', A.家老の枠(s, 'oda') === 1);

  無し('どの家も、家老は持つ国の数を超えない',
    Object.keys(s.factions)
      .filter((f) => A.家老たち(s, f).length > A.家老の枠(s, f))
      .map((f) => `${s.factions[f].name}（家老${A.家老たち(s, f).length}／枠${A.家老の枠(s, f)}）`));

  無し('家老はみな、その国に本領を持つ',
    s.generals.filter((g) => g.役 === '家老')
      .filter((g) => (s.castles.find((c) => c.id === (g.本領 || g.at)) || {}).kuni !== g.役国)
      .map((g) => `${g.name}（役国${g.役国}／本領${(s.castles.find((c) => c.id === g.本領) || {}).name}）`));

  // 新しい国へ進出すれば、枠が一つ増える
  const t = A.initState('oda');
  const 美濃 = t.castles.find((c) => c.kuni === '美濃');
  美濃.faction = 'oda';
  確('新しい国へ進出すれば枠が増える', A.家老の枠(t, 'oda') === 2,
    `尾張のみ 1 → 美濃へ進出 ${A.家老の枠(t, 'oda')}`);
  確('進出しただけでは家老は増えない（任じて初めて）',
    A.家老たち(t, 'oda').length === 1);

  // その国に根を持つ者しか任じられない
  const 余所 = t.generals.find((g) => g.faction === 'oda' && !g.lord
    && (t.castles.find((c) => c.id === (g.本領 || g.at)) || {}).kuni === '尾張'
    && A.身分の位(g, t) >= 2 && g.役 !== '家老');
  if (余所) {
    const r = A.家老に任じる(t, 'oda', '美濃', 余所.id);
    確('その国に根を持たぬ者は旗頭に任じられない', !r.ok, r.why || '（任じられてしまった）');
  }
  // 城を委ねて根を移せば、任じられる
  const 移す = t.generals.find((g) => g.faction === 'oda' && !g.lord && A.身分の位(g, t) >= 2 && g.役 !== '家老');
  移す.at = 美濃.id; 移す.本領 = 美濃.id;
  const r2 = A.家老に任じる(t, 'oda', '美濃', 移す.id);
  確('美濃に根を移せば、その者を旗頭に任じられる', r2.ok,
    r2.ok ? `${移す.name}（美濃）` : r2.why);
  確('二国になれば家老も二人', A.家老たち(t, 'oda').length === 2,
    A.家老たち(t, 'oda').map((g) => `${g.name}（${g.役国}）`).join('・'));
  確('任じられれば身分が家老になる', A.rankName(移す, t) === '家老',
    `${移す.name} → ${A.rankName(移す, t)}`);

  // 国を失えば役も解ける
  美濃.faction = 'saito';
  const 解 = A.家老を繕う(t, 'oda');
  確('国を失えば、その国の家老は役を離れる',
    解.some((g) => g.id === 移す.id) && A.家老たち(t, 'oda').length === 1,
    解.map((g) => g.name).join('・') || 'なし');
  確('役を離れれば身分も戻る', A.rankName(移す, t) !== '家老',
    `${移す.name} → ${A.rankName(移す, t)}`);

  // 下知（画面から呼ばれる道）でも同じこと
  const u = A.initState('oda');
  const 美濃2 = u.castles.find((c) => c.kuni === '美濃');
  美濃2.faction = 'oda';
  const 誰 = u.generals.find((g) => g.faction === 'oda' && !g.lord && A.身分の位(g, u) >= 2 && g.役 !== '家老');
  誰.at = 美濃2.id; 誰.本領 = 美濃2.id;
  const v = A.旗頭に任じる(u, '美濃', 誰.id);
  確('下知からも旗頭に任じられる', A.家老たち(v, 'oda').length === 2,
    (v.chronicle.slice(-1)[0] || {}).text || 'なし');
}

/* ------------------------------------------- 八、寄親と寄騎（GDD 6.4）

   寄騎（与力）とは、大名が家臣に預ける武士である。預かる側を寄親という。
   ここが肝心で、寄騎はあくまで大名の直臣であって、寄親の家臣ではない。
   柴田勝家に付けられた府中三人衆（前田利家・佐々成政・不破光治）は信長の
   直臣であり、信長の一存で付け替えられた。所有ではなく差配である。

   この盤では、旗頭（家老）がその国の城主を寄騎に取る。旗頭が出陣すれば
   寄騎も従い、一手の軍となって動く。国を一つ預けるとは、その国の城主たちを
   一人の下に束ねるということである。 */
{
  const s = A.initState('oda');
  const 旗 = A.家老たち(s, 'oda')[0];
  確('旗頭がいる', !!旗, 旗 ? `${旗.name}（${旗.役国}の旗頭）` : 'なし');

  const 同国 = s.generals.filter((g) => g.faction === 'oda' && !g.lord && !g.captive
    && g.id !== 旗.id && A.身分の位(g, s) >= 2
    && (s.castles.find((c) => c.id === (g.本領 || g.at)) || {}).kuni === 旗.役国);
  確('同じ国に本領を持つ侍大将以上は寄騎に取れる',
    同国.length > 0 && A.寄騎に取れるか(s, 旗, 同国[0]).ok,
    同国.length ? `${同国[0].name}（${A.rankName(同国[0], s)}）` : '候補なし');

  // 別の国の者は取れない
  const 他国 = s.generals.find((g) => g.faction === 'oda' && !g.lord && A.身分の位(g, s) >= 2
    && (s.castles.find((c) => c.id === (g.本領 || g.at)) || {}).kuni !== 旗.役国);
  if (他国) {
    const r = A.寄騎に取れるか(s, 旗, 他国);
    確('別の国に本領を持つ者は寄騎に取れない', !r.ok, r.why);
  }

  // 物頭は取れない
  const 物 = s.generals.find((g) => g.faction === 'oda' && !g.lord && A.rankName(g, s) === '物頭');
  if (物) {
    const r = A.寄騎に取れるか(s, 旗, 物);
    確('物頭は寄騎にならない', !r.ok, r.why);
  }

  // 旗頭どうしは寄騎にならない
  const t = A.initState('oda');
  const 美濃 = t.castles.find((c) => c.kuni === '美濃'); 美濃.faction = 'oda';
  const 移 = t.generals.find((g) => g.faction === 'oda' && !g.lord && A.身分の位(g, t) >= 2 && g.役 !== '家老');
  移.at = 美濃.id; 移.本領 = 美濃.id;
  A.家老に任じる(t, 'oda', '美濃', 移.id);
  const 旗2 = A.家老たち(t, 'oda').find((g) => g.役国 === '尾張');
  const r3 = A.寄騎に取れるか(t, 旗2, 移);
  確('旗頭は他の旗頭の寄騎にならない', !r3.ok, r3.why);

  // 取って、解く
  A.寄騎に取る(s, 旗.id, 同国[0].id);
  A.寄騎に取る(s, 旗.id, 同国[1].id);
  確('寄騎に取れる', A.寄騎たち(s, 旗.id).length === 2,
    A.寄騎たち(s, 旗.id).map((g) => g.name).join('・'));
  確('二人の寄親には付かない', !A.寄騎に取れるか(s, 旗, 同国[0]).ok
    || 同国[0].寄親 === 旗.id, `${同国[0].name}の寄親 ${同国[0].寄親}`);
  A.寄騎を解く(s, 同国[0].id);
  確('寄騎を解ける', A.寄騎たち(s, 旗.id).length === 1);

  /* 出陣で旗頭を選べば、その寄騎も従う。
     出陣の画面がしているのと同じ勘定をここで確かめる（画面の中に書くと
     実際に描いて字を拾わねば測れない）。 */
  {
    const u = A.initState('oda');
    const 旗u = A.家老たち(u, 'oda')[0];
    const 城 = u.castles.find((x) => x.id === 旗u.at);
    const 同城 = u.generals.filter((g) => g.faction === 'oda' && !g.lord && !g.captive
      && g.id !== 旗u.id && g.at === 城.id && A.身分の位(g, u) >= 2
      && (u.castles.find((c) => c.id === (g.本領 || g.at)) || {}).kuni === 旗u.役国);
    for (const g of 同城.slice(0, 2)) A.寄騎に取る(u, 旗u.id, g.id);
    const picked = [旗u.id];
    const gens = u.generals.filter((x) => x.at === 城.id && x.faction === 城.faction && !x.captive);
    const 選 = picked.map((id) => gens.find((x) => x.id === id)).filter(Boolean);
    const 従 = 選.filter((x) => x.役 === '家老')
      .flatMap((x) => A.寄騎たち(u, x.id))
      .filter((x) => x.at === 城.id && !picked.includes(x.id));
    確('旗頭を選べば、その寄騎も出陣に加わる', 従.length === 2,
      `${旗u.name}のみを選び → ${[...選, ...従].map((x) => x.name).join('・')}（寄騎${従.length}名）`);
  }

  // 旗頭でなくなれば、寄騎も解ける
  旗.役 = null; 旗.役国 = null;
  const 解 = A.寄騎を繕う(s, 'oda');
  確('旗頭を離れれば、その寄騎も解ける',
    解.length > 0 && A.寄騎たち(s, 旗.id).length === 0,
    解.map((g) => g.name).join('・') || 'なし');
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
