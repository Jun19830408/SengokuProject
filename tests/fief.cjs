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
+ 'export { fiefRoom, fiefOf, stipendOf, fiefBurden, castleRankNeed, canHoldCastle, castellanOf, rankName, 総大将を定める, 大将を先頭に } from "../src/core/rank.js";\n'
+ 'export { grantFief, appoint } from "../src/govern/commands.js";\n');
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

  if (足りぬ) {
    const t = A.appoint(s, c.id, 足りぬ.id);
    const c2 = t.castles.find((x) => x.id === c.id);
    確('禄高の足りぬ者は城主に任じられない', c2.lordId !== 足りぬ.id,
      `${足りぬ.name}（禄高${A.stipendOf(s, 足りぬ)}石）`);
    確('なぜ任じられぬかを報せる', /預かれない/.test(t.msg || ''), t.msg || '（報せなし）');
    確('任じられなかったのに戦国記へ書かない',
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
    確('一門でない者は、なお禄高が要る', u.castles.find((x) => x.id === c.id).lordId !== 他.id,
      `${他.name}（禄高${A.stipendOf(s, 他)}石）`);
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

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
