/* 駒の長（組頭）。手柄を数え、階を登る（GDD 6.2 / 6.4）。

   盤の駒は五十人組であり、名簿の一組と一対一である（corps.js が組の id を
   駒の src に持たせている）。ならば組ひとつに長がひとり居る、と見てよい。

   長の名は組の id から起こす。控えに文字を持たなくてよいし、同じ組なら
   何度数えても同じ名が出る。補充されても組の id は変わらないので、長は
   生き続けて部下だけが入れ替わる。組が名簿から落ちれば、長も死ぬ。

   手柄は「敵の駒を討ち取った数」で数える。人数で数えると、大きな駒を削った
   だけの隊が上位に来る。討ち取ってこそ手柄である。

   十人長・五十人長といっても、盤の駒はつねに五十人組である。人数そのもの
   ではなく位の名と受け取る。駒を五分割すれば人数どおりになるが、合戦の
   当たり判定は駒数の二乗に効くので、十倍以上重くなる。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 0;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

console.log('\n── 一　長の名は組から起きる');
{
  確('同じ組なら、何度数えても同じ名', H.長の名('ret-x-12') === H.長の名('ret-x-12'),
    H.長の名('ret-x-12'));
  確('割って連れ出した組も、元の長へ帰る', H.長の名('ret-x-12') === H.長の名('ret-x-12b'),
    `ret-x-12 と ret-x-12b がともに ${H.長の名('ret-x-12')}`);
  確('別の組は別の長', H.長の名('ret-x-12') !== H.長の名('ret-x-13'),
    `${H.長の名('ret-x-12')} ／ ${H.長の名('ret-x-13')}`);
  // 名が一つの家の中でぶつからないこと
  const s = H.initState('oda');
  const 組 = [];
  for (const g of s.generals) if (g.faction === 'oda' && g.rost) for (const q of g.rost) 組.push(q.id);
  for (const c of s.castles) if (c.faction === 'oda' && c.rost) for (const q of c.rost) 組.push(q.id);
  const 名 = new Set(組.map((id) => H.長の名(id)));
  確('一つの家の中で、名の重なりが二割を超えない', (組.length - 名.size) / 組.length <= 0.20,
    `織田 ${組.length}組で重なり ${組.length - 名.size}件`);
}

console.log('\n── 二　階は勲功で上がる');
{
  const 段 = H.階の段;
  確('階は五つ', 段.length === 5, 段.map((x) => `${x.要}＝${x.名}`).join('　'));
  確('勲功が上がれば階も上がる',
    H.長の階(0) === '十人長' && H.長の階(段[1].要) === '五十人長'
    && H.長の階(段[4].要) === '物頭',
    `0→${H.長の階(0)} ／ ${段[4].要}→${H.長の階(段[4].要)}`);
  確('段の要は昇順である', 段.every((x, i) => i === 0 || x.要 > 段[i - 1].要));
}

console.log('\n── 三　合戦で手柄が付き、組へ書き戻される');
{
  const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 65, valor: 65, wit: 58, gov: 55,
    retinue: 400, retTrain: 70, unity: 62 });
  種 = 0x4321;
  const 我将 = [0, 1, 2].map((k) => { const g = 将(k); g.rost = H.newRoster(1500, `ret-P${k}`); return g; });
  const 一戦 = (i) => {
    種 = 0x4321 + i * 97;
    H.setBattleMap(null); H.setFieldSeed('k' + i, 'y'); H.layoutField(7500, 6);
    const W = H.FIELD.w, Hh = H.FIELD.h;
    const P = 我将.map((g, k) => H.makeCorps('P', g, 0, 1500, 75, 75, W * (0.3 + k * 0.2), Hh * 0.84, -Math.PI / 2, '#2F5D8C'));
    const E = [0, 1, 2].map((k) => {
      const g = 将(10 + k); g.rost = H.newRoster(1000, `ret-Q${i}-${k}`);
      return H.makeCorps('E', g, 0, 1000, 75, 75, W * (0.3 + k * 0.2), Hh * 0.16, Math.PI / 2, '#B0483C');
    });
    for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
    const b = H.createBattle(P, E, 'P');
    b.mode = 'field'; b.phase = 'fight'; b.dusk = 1100; b.face = 'S'; b.myFar = false;
    let k = 0;
    while (b.phase === 'fight' && k < 12000) { if (k % 3 === 0) H.battleAI(b); H.stepBattle(b, 0.25); k++; }
    // 画面がしている書き戻しと同じもの（core/roster.js の 戦の跡／戦の跡を記す）
    const 跡 = H.戦の跡(b.corps, b);
    for (const g of 我将) if (g.rost) g.rost = H.戦の跡を記す(g.rost, 跡);
    return b;
  };
  const b1 = 一戦(0);
  /* 名簿から立てた駒は、組の id を src に持つ。名簿を渡さずに立てた駒
     （地域家臣団を人数だけで立てた場合など）は持たない。手柄が付くのは
     名簿から立てた駒だけである――誰の手柄か辿れないものは数えない。 */
  /* 盤に残る隊の組に加え、散った組（分遣が畳まれるときに兵の尽きた組）も
     「実在した組」と数える。これを外すと、討ち死にした組の手柄が
     「在りもしない組の手柄」に見えてしまう。 */
  const 名簿駒 = [...b1.corps, ...(b1.散った || [])].flatMap((c) => c.squads).filter((q) => q.src);
  確('名簿から立てた駒は、組の id を持つ', 名簿駒.length > 0,
    `${名簿駒.length}駒／全${b1.corps.reduce((a, c) => a + c.squads.length, 0)}駒`);
  const 実在 = new Set(名簿駒.map((q) => H.組の鍵(q.src)));
  確('手柄が付いた鍵は、みな実在の組である',
    Object.keys(b1.武功 || {}).every((k) => 実在.has(k)),
    `${Object.keys(b1.武功 || {}).length}件を検めた`);
  確('一戦で手柄が付く', Object.keys(b1.武功 || {}).length > 0,
    `${Object.keys(b1.武功 || {}).length}組が討ち取った`);
  /* 戦のあと、組には「誰の隊で戦ったか」が刻まれていること。
     これが無いと、城へ戻った組頭が誰の隊の者か辿れなくなる。 */
  {
    const 全組 = 我将.flatMap((g) => g.rost || []);
    const 手柄組 = 全組.filter((q) => q.功);
    確('手柄を立てた組には、率いた武将が刻まれている',
      手柄組.length > 0 && 手柄組.every((q) => q.将),
      `${手柄組.length}組のうち ${手柄組.filter((q) => q.将).length}組に刻みがある`);
    確('刻まれた将は、その組を抱えていた将である',
      手柄組.every((q) => 我将.some((g) => g.id === q.将 && (g.rost || []).includes(q))),
      手柄組.slice(0, 3).map((q) => `${H.長の名(q.id)}→${q.将}`).join('　'));
  }

  /* 分遣が畳まれるとき、兵の尽きた組は本隊へ戻さない（戻せば空の組ぶん陣形が
     広がる）。かといって黙って捨てると、その組はどの隊にも属さぬまま戦を終え、
     名簿への書き戻しから漏れる。漏れれば損害が書かれず、討ち死にした組が
     古い人数のまま城へ帰り、誰の隊で戦ったかの刻みも付かない。 */
  {
    const 散 = (b1.散った || []).flatMap((c) => c.squads).filter((q) => q.src);
    if (散.length) {
      const 生き残っている = 散.filter((q) => 我将.some((g) => (g.rost || []).some((r) => r.id === q.src)));
      確('分遣で兵が尽きた組は、名簿からも落ちる（紙の上で生き返らない）',
        生き残っている.length === 0,
        `散った組 ${散.length}　名簿に残った ${生き残っている.length}`);
    } else {
      console.log('  （この戦では分遣で尽きた組は出なかった）');
    }
  }

  確('手柄は駒の数であって、人数ではない',
    Object.values(b1.武功 || {}).every((n) => Number.isInteger(n) && n < 60),
    `いちばん多い組で ${Math.max(...Object.values(b1.武功 || {}))}駒`);

  /* 四十戦を重ねる。戦のあいだには国許で兵を補う。

     はじめ、この節は損害を書き戻さずに手柄だけを積んでいた。書き戻しを
     core/roster.js へ出して実物と同じにしたところ、四十戦のあいだに組が
     次々と死に、勲功を積む者が一人も残らなくなった。それが実際の姿である。

     遊びのほうでは、戦から戻れば国許で兵を補う。補わずに四十戦を続ける
     ことはない。ゆえに、ここでも戦のたびに軍役の器まで補う。
     補充は手柄の重い組から入るので（rosterAdd）、擦り減った古参は生き延び、
     勲功を積み上げてゆく。二つの仕掛けは、そうして噛み合う。 */
  const 補う = () => {
    for (const g of 我将) if (g.rost) H.rosterSync(g, 'rost', 1500, `ret-${g.id}`);
  };
  /* 頂は上下する。名を挙げた組が全滅すれば、その勲功も消えて振り出しに戻る
     （四十戦ごとに測ると 19 → 11 → 25 → 16 → 30 と揺れた）。終わりの一点で
     判ずると、たまたま頂が死んだ回に倒れる。通してのいちばんで見る。 */
  補う();
  let 頂 = 0, 頂の名 = '';
  const 測る = () => {
    for (const g of 我将) for (const q of g.rost || []) {
      if ((q.功 || 0) > 頂) { 頂 = q.功; 頂の名 = H.長の名(q.id); }
    }
  };
  測る();
  for (let i = 1; i < 40; i++) { 一戦(i); 補う(); 測る(); }
  const 帳 = [];
  for (const g of 我将) for (const q of g.rost || []) if (q.功) 帳.push({ 名: H.長の名(q.id), 功: q.功, 階: H.長の階(q.功), 兵: q.m });
  帳.sort((a, b) => b.功 - a.功);
  確('戦を重ねると手柄が積み上がる', 帳.length > 0 && 頂 >= 10,
    `${帳.length}名／四十戦を通してのいちばんは ${頂の名} 勲功${頂}（${H.長の階(頂)}）`);
  確('四十戦のうちに百人長が現れる', 頂 >= H.階の段[2].要,
    `いちばんの勲功 ${頂}／百人長は ${H.階の段[2].要}`);
  確('名を挙げた組が、擦り減ったまま放置されない',
    帳.slice(0, 5).every((x) => x.兵 >= 40),
    `上位五名の兵 ${帳.slice(0, 5).map((x) => x.兵 + '人').join('・')}`);
  確('手柄を挙げた組は、組の数を超えない',
    帳.length <= 我将.reduce((a, g) => a + (g.rost || []).length, 0),
    `${帳.length}名／全組 ${我将.reduce((a, g) => a + (g.rost || []).length, 0)}`);
}

console.log('\n── 四　名の知られた組が、先に呼ばれる');
{
  const 名簿 = H.newRoster(500, 'ret-t');
  名簿[名簿.length - 1].功 = 12;                       // いちばん後ろの組に手柄を持たせる
  const 手柄の組 = 名簿[名簿.length - 1].id;
  const tk = H.rosterTake(名簿, 100);                   // 二組ぶんだけ連れ出す
  確('手柄のある組が、真っ先に連れ出される',
    tk.taken.some((q) => H.組の鍵(q.id) === 手柄の組),
    `連れ出した ${tk.taken.length}組のうち、手柄の組が入っている`);
  確('連れ出した組が手柄を持って行く',
    tk.taken.some((q) => (q.功 || 0) >= 12));
}

console.log('\n── 五　物頭に届いた者を、名指しで取り立てる');
{
  /* 組頭は敵の駒を討ち取るたびに手柄を重ね、勲功が物頭に届けば武将に
     取り立てる資格を得る。そのとき提示するのは「名も無き者」ではなく、
     盤の上で手柄を重ねてきたその人である。

     取り立てられた者は組を離れる。組はそのまま残るので、代を一つ進めて
     次の長を立てる。代を進めなければ、同じ名の者がもう一度そこに現れる。 */
  const r = H.newRoster(200, 'ret-z');
  確('手柄の足りぬうちは、取り立てるべき組は無い', !H.取り立てるべき組(r));
  r[1].功 = H.階の段[H.階の段.length - 1].要 + 2;
  const q = H.取り立てるべき組(r);
  確('物頭に届いた組が見つかる', !!q && H.長の階(q.功) === '物頭',
    q ? `${H.長の名(q.id, q.代)}（勲功${q.功}）` : 'なし');
  const 旧名 = H.長の名(q.id, q.代);
  const p = H.makePromotion({ name: '織田信長', faction: 'oda', at: 'nagoya' }, [], { 旧名 });
  確('取り立ての場に、その者の名が出る', p.oldName === 旧名,
    `${p.oldName} → ${p.candidates[0]}`);
  // 取り立てたあと、組には次の長が立つ
  const 前 = H.長の名(q.id, q.代);
  q.代 = (q.代 || 0) + 1; q.功 = 0;
  確('取り立てのあと、組には別の長が立つ', H.長の名(q.id, q.代) !== 前,
    `${前} → ${H.長の名(q.id, q.代)}`);
  確('次の長の勲功は零から', H.長の階(q.功) === '十人長');
}

console.log('\n── 六　その日いちばん働いた組頭を、戦国記に残す');
{
  /* 遊ぶ側には盤の上の一人ひとりの働きは見えない。だが数字は動いている。
     その日いちばん討ち取った組の長を、名を挙げて記す。

     討ち取った相手は、敵の組頭ではなく、敵の隊を率いた武将の名で書く。
     他家の組頭まで控えれば記録が膨らむし、そこまでは要らない。 */
  const s = H.initState('oda');
  const gen = s.generals.find((x) => x.faction === 'oda' && x.rost && x.rost.length);
  const 組 = gen.rost[0];
  const b = { 武功: { [H.組の鍵(組.id)]: 3 }, corps: [
    { side: 'P', id: gen.id, gen: { name: gen.name }, loss: {} },
    { side: 'E', id: 'x', gen: { name: '福留親政' }, loss: { 地域: 900 } },
  ] };
  const 前 = s.chronicle.length;
  H.組頭の働きを記す(s, b, 'P', '岡崎城');
  const 記 = s.chronicle.slice(前).map((x) => x.text).join(' ');
  確('いちばん働いた組頭が、戦国記に載る', s.chronicle.length > 前, 記 || '（載らなかった）');
  確('その者の通称で書かれる', 記.includes(H.長の名(組.id, 組.代)), H.長の名(組.id, 組.代));
  確('討ち取った相手は、敵の隊を率いた武将の名で書く', 記.includes('福留親政'));
  確('討ち取った駒の数が出る', /一隊を3つまで破った/.test(記));
  確('いまの階が添えられる', /十人長|五十人長|百人長|三百人長|物頭/.test(記));

  // 一駒では、まだ記すに足りない
  const t = H.initState('oda');
  const g2 = t.generals.find((x) => x.faction === 'oda' && x.rost && x.rost.length);
  const 前2 = t.chronicle.length;
  H.組頭の働きを記す(t, { 武功: { [H.組の鍵(g2.rost[0].id)]: 1 }, corps: [] }, 'P', null);
  確('一駒では記さない（帳面が埋まらぬように）', t.chronicle.length === 前2);

  // 城や軍の名簿から出た組も拾う
  const u = H.initState('oda');
  const 城 = u.castles.find((c) => c.faction === 'oda' && c.rost && c.rost.length);
  const 前3 = u.chronicle.length;
  H.組頭の働きを記す(u, { 武功: { [H.組の鍵(城.rost[0].id)]: 4 }, corps: [] }, 'P', null);
  確('城の地域家臣団から出た組も拾う', u.chronicle.length > 前3,
    u.chronicle.slice(前3).map((x) => x.text).join(' ') || '（拾えない）');
}

/* ------------------------------------ 兵を補うときは、手柄の重い組から埋める

   幾度も戦って擦り減った古参の組が、名簿の後ろに埋もれたまま十人で放置され、
   次の戦で消えていた。名を挙げた者ほど死にやすい、という逆さまなことである。

   兵を減らすときは手柄の無い組から削っている（rosterCut）。足すときも同じ
   理屈で、手柄の重い組から埋めるのが筋である。 */
{
  const 盤 = () => {
    const r = H.newRoster(1000, 't');
    // 古参は名簿の後ろに埋もれている（幾度も削られ、継ぎ足されてきた組である）
    const 槍 = r.filter((q) => q.t === 'yari');
    const 古 = [槍[槍.length - 1], 槍[槍.length - 2], 槍[槍.length - 3]];
    古[0].功 = 62; 古[1].功 = 31; 古[2].功 = 9;
    for (const q of 古) q.m = 10;
    for (const q of r) if (!古.includes(q)) q.m = Math.max(18, q.m - 20);
    return { r, 古 };
  };

  const a = 盤();
  H.rosterAdd(a.r, 150, 't');
  確('少しの補充でも、手柄の重い組から満ちる',
    a.古[0].m === 50 && a.古[1].m === 50,
    `百五十人を補って　物頭 10→${a.古[0].m}人／百人長 10→${a.古[1].m}人／五十人長 10→${a.古[2].m}人`);
  確('手柄の重い順に埋まる（軽い組が先に満ちることはない）',
    a.古[0].m >= a.古[1].m && a.古[1].m >= a.古[2].m,
    `功62 ${a.古[0].m}人 ≧ 功31 ${a.古[1].m}人 ≧ 功9 ${a.古[2].m}人`);

  const b = 盤();
  H.rosterAdd(b.r, 600, 't');
  確('十分に補えば、手柄のある組はみな満ちる',
    b.古.every((q) => q.m === 50), `六百人を補って　${b.古.map((q) => q.m + '人').join('／')}`);

  // 徴募の道（rosterSync）を通しても同じであること
  const c = 盤();
  const 城 = { rost: c.r };
  H.rosterSync(城, 'rost', H.rosterSum(c.r) + 150, 't');
  確('徴募の道（rosterSync）を通しても、古参から満ちる',
    c.古[0].m === 50, `物頭 10→${c.古[0].m}人`);
}

/* ------------------------------------ 帳に「どの武将の隊か」が出る

   組は三つの居場所のいずれかにある。武将の名簿（直属）、城の名簿（地域家臣団）、
   軍の名簿（連れ出した地域家臣団）である。手柄を立てた組頭を探しに行くには、
   誰の下にいるかが読めねばならない。 */
{
  const v = H.initState('oda');
  const gen = v.generals.find((x) => x.faction === 'oda' && !x.captive && x.rost && x.rost.length);
  gen.rost[0].功 = 12;                                   // 直属の組が手柄を立てた
  const 城 = v.castles.find((c) => c.faction === 'oda' && c.rost && c.rost.length);
  城.rost[0].功 = 7;                                     // 城の地の兵も手柄を立てた
  // 軍を一つ仕立て、そこにも手柄のある組を入れる
  const 将 = v.generals.filter((x) => x.faction === 'oda' && x.at === 城.id && x.id !== gen.id)[0];
  const 軍名簿 = H.newRoster(300, `loc-${城.id}`);
  軍名簿[0].功 = 5;
  v.armies.push({ id: 'x1', faction: 'oda', from: 城.id, gens: 将 ? [将.id] : [],
    local: 300, men: 300, rost: 軍名簿, at: 城.id, path: [城.id], prog: 0, target: 城.id });

  const 帳 = H.組頭の帳(v);
  const 拾 = (功) => 帳.find((x) => x.功 === 功);
  /* いずれの組にも、預かる武将の名が出ること。

     はじめ、城の兵にはただ「地域家臣団」とだけ出していた。帳を開く者が
     知りたいのは「誰の隊か」であって兵の種別ではない、と指摘を受けて改めた。
     城の兵にも預かる者はいる（城主である）。 */
  const 城主 = H.castellanOf(v, 城);
  確('直属の組は、その武将の名が出る',
    (拾(12) || {}).属 === gen.name && (拾(12) || {}).種 === '直属',
    `功12 → ${(拾(12) || {}).属}（${(拾(12) || {}).種}）`);

  /* 組に刻まれた将が、居場所より先に読まれること。

     城の兵であっても、盤の上では誰かの隊に組み込まれて戦っている。
     戦のあとにその将を組へ刻んであるので（q.将）、城へ戻っても
     「誰の隊の組頭か」が読める。居場所から当てるのは、刻みの無い
     古い記録に限る。 */
  const 別将 = v.generals.find((x) => x.faction === 'oda' && !x.captive
    && x.id !== gen.id && (!城主 || x.id !== 城主.id));
  城.rost[0].将 = 別将.id;                              // 別の将の隊で戦った、と刻む
  const 帳2 = H.組頭の帳(v);
  const 拾2 = (功) => 帳2.find((x) => x.功 === 功);
  確('組に刻まれた将が、居場所より先に読まれる',
    (拾2(7) || {}).属 === 別将.name,
    `城の兵だが ${別将.name} の隊で戦った → ${(拾2(7) || {}).属}`
    + `（城主は ${城主 ? 城主.name : 'なし'}）`);

  確('刻みの無い組は、居場所から当てる（城なら城主）',
    !!城主 && (拾(7) || {}).属 === 城主.name && (拾(7) || {}).種 === '城の兵',
    `功7 → ${(拾(7) || {}).属}（${(拾(7) || {}).種}）／${(拾(7) || {}).所}`);
  確('連れ出した地の兵は、率いる将の名が出る',
    !将 || ((拾(5) || {}).属 === 将.name && (拾(5) || {}).種 === '軍の兵'),
    将 ? `功5 → ${(拾(5) || {}).属}（${(拾(5) || {}).種}）` : '（将がおらず測れない）');
  確('どの組にも、預かる武将の名がある（「地域家臣団」で済ませない）',
    帳.every((x) => x.属 && !/^地域家臣団$/.test(x.属)),
    帳.slice(0, 3).map((x) => `${x.名}→${x.属}`).join('　'));
  確('手柄の重い順に並ぶ', 帳.length >= 3 && 帳[0].功 >= 帳[1].功 && 帳[1].功 >= 帳[2].功,
    帳.slice(0, 3).map((x) => `${x.名}(功${x.功}・${x.属})`).join('　'));
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
