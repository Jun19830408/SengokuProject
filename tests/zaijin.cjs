/* 在陣と、落とした城の人事（GDD 6.4）。

   これまでは、城を落とすと軍が消え、本軍の将が全員その城へ移っていた。
   攻め取るたびに家中の者が散っていくので、遠征を重ねるほど本領が空になる。
   連れてきた地の兵まで城兵に吸われるので、次の城へ進む兵も残らなかった。

   武将は城とその城が抱える土地に根付く。落とした城に居るのは在陣であって、
   移住ではない。軍は解かれるまで軍のまま、その城に留まる。

   在陣は城を与えられたことではないので、内政はできない。城主を据え、所属の
   将を置いてはじめて、その城は家のものとして動きだす。空けたままにもできる
   が、将のいない城は守備隊の統率が四十に落ちる。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'zaijin-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState, 本拠を追う } from "../src/core/state.js";\n'
+ 'export { sackCastle, 城を委ねる, 委ねる差配, resolveOffscreen, 軍を解く, 城に合流する, 在陣させる } from "../src/govern/war.js";\n'
+ 'export { stipendOf, castellanOf, 守備隊の統率 } from "../src/core/rank.js";\n'
+ 'export { newRoster, rosterSum } from "../src/core/roster.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { 軍の道 } from "../src/core/state.js";\n');
const out = path.join(ROOT, 'build', 'zaijin.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* 攻め手の軍を仕立てて、城を落とす場を作る */
const 場を組む = (fid = 'oda') => {
  const s = A.initState(fid);
  const 的 = s.castles.find((c) => c.faction !== fid && c.local > 800);
  const 我城 = s.castles.find((c) => c.faction === fid);
  const 将ら = s.generals.filter((g) => g.faction === fid && g.at === 我城.id && !g.captive).slice(0, 3);
  for (const g of 将ら) g.at = null;
  const 軍 = { id: 'A1', faction: fid, from: 我城.id, gens: 将ら.map((g) => g.id),
    local: 2000, localTrain: 70, rost: A.newRoster(2000, 'arm-A1'),
    men: 2000 + 将ら.reduce((a, g) => a + g.retinue, 0),
    at: 的.id, path: [的.id], prog: 0, food: 9000, target: 的.id };
  s.armies.push(軍);
  return { s, 的, 軍, 我城, 将ら };
};

console.log('── 一　城を落としても、軍は解けない');
{
  const { s, 的, 軍 } = 場を組む();
  const 前兵 = 的.local, 軍兵 = 軍.local, 将数 = 軍.gens.length;
  A.sackCastle(s, 的, 軍, true);
  const a = s.armies.find((x) => x.id === 'A1');
  確('城の主が変わる', 的.faction === 'oda', `${的.name}`);
  確('軍が残っている', !!a, a ? `将${a.gens.length}名・兵${a.local}` : '消えた');
  確('その城に在陣している', !!a && a.在陣 === 的.id);
  確('攻め手の兵は城に吸われない', !!a && a.local === 軍兵,
    `軍の兵 ${軍兵} → ${a ? a.local : 0}／城兵 ${前兵} → ${的.local}`);
  確('将は城に住み着かない（軍とともにある）',
    s.generals.filter((g) => g.at === 的.id && g.faction === 'oda').length === 0
    && !!a && a.gens.length === 将数, `在城の将 0名／軍の将 ${a ? a.gens.length : 0}名`);
  確('城には元の守兵が残る（空にはならない）', 的.local > 0 && 的.local < 前兵,
    `${前兵}人のうち ${的.local}人が留まり降った`);
  確('将がいないので守備隊の統率は四十', A.守備隊の統率(s, 的) === 40);
  確('遊ぶ側には差配を問う（待ちに積む）',
    (s.委ねる待ち || []).some((x) => x.castleId === 的.id), JSON.stringify(s.委ねる待ち || []));
}

console.log('\n── 二　城を委ねれば、その城は家のものとして動きだす');
{
  const { s, 的, 軍 } = 場を組む();
  A.sackCastle(s, 的, 軍, true);
  const a = s.armies.find((x) => x.id === 'A1');
  const 主 = s.generals.find((g) => g.id === a.gens[0]);
  const 前将 = a.gens.length, 前兵 = a.local;
  A.城を委ねる(s, 的.id, 'A1', { 城主: 主.id, 所属: [主.id], 兵: 600 });
  const b = s.armies.find((x) => x.id === 'A1');
  確('城主が据わる', 的.lordId === 主.id, 主.name);
  確('その者は城に入る', 主.at === 的.id);
  確('その者の本領が移る（根が移る）', 主.本領 === 的.id,
    `${主.name}の本領 → ${s.castles.find((c) => c.id === 主.本領).name}`);
  確('軍はそのぶん痩せる', b.gens.length === 前将 - 1 && b.local === 前兵 - 600,
    `将 ${前将}→${b.gens.length}名／兵 ${前兵}→${b.local}`);
  確('城兵が増える', 的.local >= 600);
  確('守備隊の統率が城主のものになる', A.守備隊の統率(s, 的) > 40,
    `40 → ${A.守備隊の統率(s, 的)}`);
}

console.log('\n── 三　采配（他家）は、その場で自ら差配する');
{
  const { s, 的, 軍 } = 場を組む('takeda');
  s.player = 'oda';                       // 遊ぶ側ではない家が落とす
  A.sackCastle(s, 的, 軍, true);
  確('他家が落とした城には、その場で城主が据わる', !!的.lordId,
    的.lordId ? s.generals.find((g) => g.id === 的.lordId).name : 'なし');
  確('遊ぶ側の差配待ちには積まれない',
    !(s.委ねる待ち || []).some((x) => x.castleId === 的.id));
  const a = s.armies.find((x) => x.id === 'A1');
  確('采配も軍を残す（次へ進める）', !!a && a.gens.length > 0,
    a ? `将${a.gens.length}名・兵${a.local}` : '消えた');
}

console.log('\n── 四　誰も置かねば、城は将のいないまま');
{
  const { s, 的, 軍 } = 場を組む();
  A.sackCastle(s, 的, 軍, true);
  const 前 = s.armies.find((x) => x.id === 'A1').gens.length;
  A.城を委ねる(s, 的.id, 'A1', { 城主: null, 所属: [], 兵: 0 });
  const a = s.armies.find((x) => x.id === 'A1');
  確('軍は痩せない（そのまま次へ進める）', a.gens.length === 前, `将${a.gens.length}名`);
  確('城主は空のまま', !的.lordId);
  確('守備隊の統率は四十のまま', A.守備隊の統率(s, 的) === 40);
}

console.log('\n── 四の二　将を残らず城へ置けば、軍は解ける');
{
  /* 落とした城の人事で、連れてきた将を全員その城に置くことがある。
     将が一人も残らねば、軍を率いる者がいない。ところが地の兵が残っていると
     軍は軍のまま盤に残り、「将なし」の軍として城の帳に並び、地図には数字だけが
     浮いていた。遊ぶ側からは、解いたはずの軍が消えないように見える。

     将が残らなければ軍は解ける。兵は出陣元へ返す（軍を解くのと同じ形）。 */
  const { s, 的, 軍 } = 場を組む();
  A.sackCastle(s, 的, 軍, true);
  const a0 = s.armies.find((x) => x.id === 'A1');
  const 将ら = [...a0.gens];
  const 出陣元 = s.castles.find((c) => c.id === a0.from);
  const 元の兵 = 出陣元.local, 残す = Math.round(a0.local * 0.5), 持ち帰り = a0.local - 残す;
  A.城を委ねる(s, 的.id, 'A1', { 城主: 将ら[0], 所属: 将ら, 兵: 残す });
  const a = s.armies.find((x) => x.id === 'A1');
  確('将を残らず置けば、軍は残らない', !a,
    a ? `将${a.gens.length}名・地の兵${a.local}人の軍が残っている` : '解けた');
  確('城主は据わっている', 的.lordId === 将ら[0], 的.lordId || 'なし');
  確('残す兵は城に入る', 的.local >= 残す, `城の兵 ${的.local}人（残す ${残す}人）`);
  確('残りの兵は出陣元へ返る（消えない）',
    出陣元.local >= 元の兵 + 持ち帰り * 0.9,
    `${出陣元.name} ${元の兵}人 → ${出陣元.local}人（持ち帰り ${持ち帰り}人）`);
}

console.log('\n── 五　在陣の兵糧は、尽きれば足下の城の蔵から食う');
{
  /* 城の蔵は同じ月に実りが入るので、「減ったか」では測れない。
     在陣の軍がいる場合といない場合を引き比べて、その差で見る。 */
  const 一月 = (在陣あり) => {
    const { s, 的, 軍 } = 場を組む();
    A.sackCastle(s, 的, 軍, true);
    const a = s.armies.find((x) => x.id === 'A1');
    a.food = 0;                                   // 持ってきた兵糧は尽きた
    的.food = 40000;                              // 城の蔵は満ちている
    if (!在陣あり) s.armies = s.armies.filter((x) => x.id !== 'A1');
    const u = A.advanceMonth(s);
    return { 蔵: u.castles.find((x) => x.id === 的.id).food,
      軍: (u.armies || []).find((x) => x.id === 'A1') };
  };
  const 有 = 一月(true), 無 = 一月(false);
  確('尽きた軍が、足下の城から兵糧を得る', !!有.軍 && 有.軍.food > 0,
    `軍の兵糧 0 → ${Math.round(有.軍 ? 有.軍.food : 0)}石`);
  確('そのぶん城の蔵が痩せる（在陣なしと引き比べて）', 有.蔵 < 無.蔵,
    `在陣あり ${Math.round(有.蔵)}石／在陣なし ${Math.round(無.蔵)}石　差 ${Math.round(無.蔵 - 有.蔵)}石`);
}

console.log('\n── 六　足下が自家の城でなければ、調達はできない');
{
  const { s, 的, 軍 } = 場を組む();
  A.sackCastle(s, 的, 軍, true);
  const a = s.armies.find((x) => x.id === 'A1');
  a.food = 0;
  a.在陣 = 'nowhere';                             // 足下に自家の城が無い形
  const 兵前 = a.men;
  const u = A.advanceMonth(s);
  const b = (u.armies || []).find((x) => x.id === 'A1');
  確('調達できねば兵が減る', !!b && b.men < 兵前, b ? `${兵前} → ${b.men}人` : '軍が消えた');
}

console.log('\n── 七　在陣の軍は、毎月あらためて着陣しない');
{
  const { s, 的, 軍 } = 場を組む();
  A.sackCastle(s, 的, 軍, true);
  /* 城主を据えてから月を送る。将を置かぬまま放っておくと、守備隊の統率が
     四十の城を旧主が奪い返すことがあり（それは意図した振る舞いである）、
     落城の記が増えて「在陣が着陣を繰り返した」のと見分けがつかなくなる。 */
  const a0 = s.armies.find((x) => x.id === 'A1');
  A.城を委ねる(s, 的.id, 'A1', { 城主: a0.gens[0], 所属: [a0.gens[0]], 兵: 900 });
  // その城についての落城の記だけを数える（他家の戦は数えない）
  const 落ち = (x) => x.chronicle.filter((y) => y.text.includes(的.name) && /が落ち/.test(y.text)).length;
  const 前 = 落ち(s);
  let u = s;
  for (let i = 0; i < 3; i++) u = A.advanceMonth(u);
  確('三月送っても、同じ城を何度も落とさない', 落ち(u) === 前,
    `${的.name}の落城の記 ${前}件 → ${落ち(u)}件`);
  const b = (u.armies || []).find((x) => x.id === 'A1');
  確('軍はその城に在陣したまま', !b || b.在陣 === 的.id,
    b ? `在陣 ${b.在陣}` : '（消えた）');
}

console.log('\n── 八　在陣を払って次の城へ向かえば、着陣の始末が回る');
{
  /* 落城のときに囲みの印（sieging）を落としていなかった。月送りは
     「囲んでいない軍」だけを着いた軍として拾うので、次の城へ向かっても
     着いたきり何も起きなかった。遊んでみて分かったことである。 */
  const { s, 的, 軍 } = 場を組む();
  軍.sieging = true;                              // 囲んでから落とす形にする
  s.sieges = [{ castleId: 的.id, armyId: 'A1', months: 2, decided: null }];
  A.sackCastle(s, 的, 軍, true);
  const a = s.armies.find((x) => x.id === 'A1');
  確('落城のとき、囲みの印が落ちる', a.sieging === false, `sieging = ${a.sieging}`);
  確('囲みの帳からも外れる', !(s.sieges || []).some((x) => x.armyId === 'A1'));

  // 次の城へ向ける（画面がしているのと同じこと）
  const 次 = s.castles.find((c) => c.faction !== 'oda' && A.軍の道(s, 'oda', 的.id, c.id));
  if (次) {
    const 道 = A.軍の道(s, 'oda', 的.id, 次.id);
    a.在陣 = null; a.target = 次.id; a.path = 道; a.prog = 0; a.at = 道[0];
    a.food = 30000;
    let u = s, 着 = false;
    for (let i = 0; i < 8 && !着; i++) {
      u = A.advanceMonth(u);
      着 = (u.pendingArrivals || []).includes('A1') || (u.sieges || []).some((x) => x.armyId === 'A1');
    }
    確('次の城に着けば、着陣の始末が回る', 着,
      着 ? `${次.name}へ着いた` : `${次.name}へ向かったが、着陣が起きない`);
  }
}

console.log('\n── 九　味方の城へ着いた援軍は、城に入らず在陣する');
{
  /* これまでは、援軍が味方の城に着くと軍が消え、将も兵もその城に吸われていた。
     出したほうの城は空になり、敵が次の月にまた寄せてきても、援軍はもう城兵の
     一部でしかない。落とした城に在陣するのと同じ形にする――軍は軍のまま城の
     下に留まり、連戦にも耐え、要らなくなれば解いて本領へ帰す。 */
  const s = A.initState('oda');
  s.year = 1547; s.month = 6;
  const 自城 = s.castles.filter((c) => c.faction === s.player);
  const 助ける城 = 自城[0], 出す城 = 自城.find((c) => c !== 助ける城);
  const 将ら = s.generals.filter((x) => x.at === 出す城.id && x.faction === s.player && !x.captive).slice(0, 2);
  for (const t of 将ら) t.at = null;
  s.armies.push({ id: 'AID', faction: s.player, from: 出す城.id, gens: 将ら.map((x) => x.id),
    local: 1800, localTrain: 70, rost: null, men: 1800 + 将ら.reduce((a, x) => a + x.retinue, 0),
    at: 助ける城.id, path: [助ける城.id], prog: 0, food: 6000, target: 助ける城.id });
  s.pendingArrivals = ['AID'];
  const 城の兵 = 助ける城.local;

  const u = A.resolveOffscreen(s, 'AID', 助ける城.id);
  const a = (u.armies || []).find((x) => x.id === 'AID');
  const c = u.castles.find((x) => x.id === 助ける城.id);
  確('援軍は軍のまま残る（城に吸われない）', !!a, a ? `${a.men}人` : '消えた');
  確('その城に在陣している', !!a && a.在陣 === 助ける城.id, a ? String(a.在陣) : '');
  確('城の兵は増えない（軍の兵は軍のもの）', c.local === 城の兵, `城 ${城の兵}人 → ${c.local}人`);
  確('将は城に入らず、軍とともにある',
    !!a && 将ら.every((g) => (a.gens || []).includes(g.id))
      && 将ら.every((g) => { const x = u.generals.find((q) => q.id === g.id); return x && x.at !== 助ける城.id; }),
    将ら.map((g) => { const x = u.generals.find((q) => q.id === g.id); return `${g.name}:${x ? (x.at || '軍中') : '不明'}`; }).join(' '));
  確('行き先は持たない（着いて留まっている）', !!a && !a.target);

  if (a) {
    const 前 = u.castles.find((x) => x.id === 出す城.id).local;
    A.軍を解く(u, a);
    確('解けば軍は消える', !(u.armies || []).some((x) => x.id === 'AID'));
    確('兵は出陣元へ返る', u.castles.find((x) => x.id === 出す城.id).local >= 前 + 1800 * 0.9,
      `${出す城.name} ${前}人 → ${u.castles.find((x) => x.id === 出す城.id).local}人`);
  }
}

/* ここから、軍を解いたときの帰り先。

   在陣を解けば将は本領へ帰る。ならば「城へ移す」ためには、根そのものを
   移さねばならない。移さずにいたので、味方の城へ兵を送って解くと、将が
   そろって元の城へ舞い戻っていた。移したはずが元通りになる筋である。 */
console.log('');
console.log('── 十　味方の城へ入れれば、根もそこへ移る');
{
  const s = A.initState('oda');
  const 自城 = s.castles.filter((c) => c.faction === 'oda');
  const 元 = 自城[0], 先 = 自城[1];
  const 将ら = s.generals.filter((x) => x.at === 元.id && x.faction === 'oda' && !x.captive).slice(0, 2);
  const 当主 = 将ら.find((x) => x.lord);
  for (const g of 将ら) g.at = null;
  const 軍 = { id: 'M1', faction: 'oda', from: 元.id, gens: 将ら.map((x) => x.id),
    local: 2000, localTrain: 70, rost: A.newRoster(2000, 'arm-M1'),
    men: 2000, at: 先.id, path: [先.id], prog: 0, food: 6000, target: 先.id };
  s.armies.push(軍);
  s.pendingArrivals = ['M1'];
  const u = A.resolveOffscreen(s, 'M1', 先.id);
  const a = (u.armies || []).find((x) => x.id === 'M1');
  確('味方の城へ着いた軍は在陣する（勝手に城へ入らない）', !!a && a.在陣 === 先.id);
  if (a) {
    A.城に合流する(u, a, u.castles.find((c) => c.id === 先.id));
    const 移った = 将ら.filter((g) => { const x = u.generals.find((q) => q.id === g.id); return x && x.at === 先.id; });
    確('城に入れれば、将はその城に居る', 移った.length === 将ら.length,
      `${移った.length}/${将ら.length}名`);
    const 根 = 将ら.filter((g) => { const x = u.generals.find((q) => q.id === g.id); return x && (x.lord ? true : x.本領 === 先.id); });
    確('当主を除き、本領もその城へ移る', 根.length === 将ら.length,
      将ら.map((g) => { const x = u.generals.find((q) => q.id === g.id);
        return `${g.name}:${(u.castles.find((c) => c.id === x.本領) || {}).name || '無'}`; }).join(' '));
    if (当主) 確('当主の本領は動かさない（本拠は別の下知で移す）',
      u.generals.find((q) => q.id === 当主.id).本領 === 元.id,
      `${当主.name}:${(u.castles.find((c) => c.id === u.generals.find((q) => q.id === 当主.id).本領) || {}).name}`);
  }
}

console.log('');
console.log('── 十一　帰り先は必ず自家の城');
{
  /* 家が城を全て失いながら、なお敵城を囲んでいる軍。以前は盤の先頭の城
     （たいてい他家のもの）へ将を落としていたので、解いた途端に敵城へ湧いた。 */
  const s = A.initState('oda');
  const 的 = s.castles.find((c) => c.faction !== 'oda' && c.local > 800);
  const 我城 = s.castles.find((c) => c.faction === 'oda');
  const 将ら = s.generals.filter((g) => g.faction === 'oda' && g.at === 我城.id && !g.captive).slice(0, 2);
  for (const g of 将ら) { g.at = null; g.本領 = 我城.id; }
  s.armies.push({ id: 'Z1', faction: 'oda', from: 我城.id, gens: 将ら.map((g) => g.id),
    local: 1500, localTrain: 70, rost: A.newRoster(1500, 'arm-Z1'), men: 1500,
    at: 的.id, path: [的.id], prog: 0, food: 6000, target: 的.id });
  for (const c of s.castles) if (c.faction === 'oda') c.faction = 'imagawa';   // 留守を突かれ、家の城は尽きた
  const a = s.armies.find((x) => x.id === 'Z1');
  const 前の本領 = new Map(将ら.map((g) => [g.id, s.generals.find((q) => q.id === g.id).本領]));
  A.軍を解く(s, a);
  const 湧いた = 将ら.filter((g) => { const x = s.generals.find((q) => q.id === g.id);
    const c = s.castles.find((y) => y.id === x.at); return c && c.faction !== 'oda'; });
  確('他家の城へ将が湧かない', 湧いた.length === 0,
    湧いた.map((g) => { const x = s.generals.find((q) => q.id === g.id);
      return `${g.name}→${(s.castles.find((y) => y.id === x.at) || {}).name}`; }).join(' ') || 'なし');
  /* 本領は元から奪われた城を指したままでよい（滅亡の始末は別の筋が受け持つ）。
     ここで見るのは「解いた拍子に他家の城へ書き換えないこと」である。 */
  const 根 = 将ら.filter((g) => { const x = s.generals.find((q) => q.id === g.id);
    if (x.本領 === 前の本領.get(g.id)) return false;
    const c = s.castles.find((y) => y.id === x.本領); return c && c.faction !== 'oda'; });
  確('他家の城を本領に書き換えない', 根.length === 0,
    根.map((g) => { const x = s.generals.find((q) => q.id === g.id);
      return `${g.name}→${(s.castles.find((y) => y.id === x.本領) || {}).name}`; }).join(' ') || 'なし');
}

console.log('');
console.log('── 十二　本領を失った将は、共に退く軍の帰り先へ落ちる');
{
  const s = A.initState('oda');
  const 自城 = s.castles.filter((c) => c.faction === 'oda');
  const 元 = 自城[0], 失 = 自城[1];
  const 的 = s.castles.find((c) => c.faction !== 'oda' && c.local > 800);
  const 将 = s.generals.find((g) => g.faction === 'oda' && !g.captive && !g.lord && g.at === 元.id);
  将.at = null; 将.本領 = 失.id;
  s.armies.push({ id: 'Y1', faction: 'oda', from: 元.id, gens: [将.id],
    local: 1200, localTrain: 70, rost: A.newRoster(1200, 'arm-Y1'), men: 1200,
    at: 的.id, path: [的.id], prog: 0, food: 6000, target: 的.id });
  失.faction = 'imagawa';                                    // 本領は留守に奪われた
  A.軍を解く(s, s.armies.find((x) => x.id === 'Y1'));
  const x = s.generals.find((q) => q.id === 将.id);
  確('出陣元へ落ちる', x.at === 元.id, `${将.name} → ${(s.castles.find((c) => c.id === x.at) || {}).name}`);
  確('落ちた先が新たな本領になる', x.本領 === 元.id);
}

console.log('');
console.log('── 十三　解けば、兵も将も出陣元へ帰る（当主は本拠へ）');
{
  /* もとは兵を出陣元へ返し、将は本領へ散らしていた。稲葉山から陣触れして城を
     落とし、軍を解くと、兵だけ稲葉山に入り、将は方々へ帰る形になっていた。
     連れて出た者が連れ帰られない。出陣元が「元の城」である。 */
  const s = A.initState('oda');
  for (const k of ['尾張', '美濃']) for (const c of s.castles.filter((x) => x.kuni === k)) c.faction = 'oda';
  const 自城 = s.castles.filter((c) => c.faction === 'oda');
  const 陣 = 自城[0], 別 = 自城[1], 城主の城 = 自城[2];
  s.factions.oda.本拠 = 陣.id;
  const 主 = s.generals.find((g) => g.faction === 'oda' && g.lord);
  主.at = 陣.id; 主.本領 = 別.id;                                  // 根がずれた古い記録
  const 供 = s.generals.find((g) => g.faction === 'oda' && !g.lord && !g.captive && g.at !== 主.at);
  供.at = 陣.id; 供.本領 = 別.id;
  const 城主 = s.generals.find((g) => g.faction === 'oda' && !g.lord && g.id !== 供.id && !g.captive);
  城主.at = 陣.id; 城主.本領 = 別.id; 城主の城.lordId = 城主.id;
  const 将ら = [主, 供, 城主];
  for (const g of 将ら) g.at = null;
  const 前 = 陣.local;
  s.armies.push({ id: 'W1', faction: 'oda', from: 陣.id, gens: 将ら.map((g) => g.id),
    local: 2500, localTrain: 70, rost: A.newRoster(2500, 'arm-W1'), men: 2500,
    at: 自城[0].id, path: [自城[0].id], prog: 0, food: 6000, target: null, 在陣: 自城[0].id });
  A.軍を解く(s, s.armies.find((x) => x.id === 'W1'));
  const 居 = (g) => (s.castles.find((c) => c.id === s.generals.find((q) => q.id === g.id).at) || {}).name;
  確('兵は出陣元へ返る', s.castles.find((c) => c.id === 陣.id).local >= 前 + 2400,
    `${陣.name} ${前}人 → ${s.castles.find((c) => c.id === 陣.id).local}人`);
  確('当主は本拠へ入る（本領がずれていても）', s.generals.find((q) => q.id === 主.id).at === 陣.id,
    `${主.name} → ${居(主)}（本拠 ${陣.name}）`);
  確('供の将も兵と同じ城へ帰る', s.generals.find((q) => q.id === 供.id).at === 陣.id,
    `${供.name} → ${居(供)}`);
  確('帰った城が、その者の根になる', s.generals.find((q) => q.id === 供.id).本領 === 陣.id);
  確('城主は己の城へ帰る', s.generals.find((q) => q.id === 城主.id).at === 城主の城.id,
    `${城主.name} → ${居(城主)}（城主を務めるのは ${城主の城.name}）`);
}

console.log('');
console.log('── 十四　加勢の兵と将は、それぞれの出た城へ帰る');
{
  const s = A.initState('oda');
  for (const k of ['尾張', '美濃']) for (const c of s.castles.filter((x) => x.kuni === k)) c.faction = 'oda';
  const 自城 = s.castles.filter((c) => c.faction === 'oda');
  const 陣 = 自城[0], B = 自城[1], C = 自城[2];
  s.factions.oda.本拠 = 陣.id;
  const 的 = s.castles.find((c) => c.faction !== 'oda');
  const 仕立てる = (id, 城, 兵) => {
    const 将 = s.generals.filter((g) => g.faction === 'oda' && g.at === 城.id && !g.captive).slice(0, 1);
    for (const g of 将) g.at = null;
    城.local -= 兵;
    const a = { id, faction: 'oda', from: 城.id, gens: 将.map((x) => x.id), local: 兵,
      localTrain: 70, rost: A.newRoster(兵, `arm-${id}`), men: 兵,
      at: 的.id, path: [的.id], prog: 0, food: 20000, target: 的.id, aid: 'oda' };
    s.armies.push(a); return { a, 将 };
  };
  const 主軍 = 仕立てる('M2', 陣, 3000);
  const 加1 = 仕立てる('R3', B, 1200);
  const 加2 = 仕立てる('R4', C, 1200);
  const 前 = { [陣.id]: 陣.local, [B.id]: B.local, [C.id]: C.local };
  A.sackCastle(s, 的, 主軍.a, true);
  const 増 = (c) => s.castles.find((x) => x.id === c.id).local - 前[c.id];
  確('加勢を出した城に兵が戻る', 増(B) >= 1100 && 増(C) >= 1100,
    `${B.name} +${増(B)}人／${C.name} +${増(C)}人`);
  const 場所 = (g) => (s.castles.find((c) => c.id === s.generals.find((q) => q.id === g.id).at) || {}).name;
  確('加勢の将も、出た城へ帰る',
    加1.将.every((g) => s.generals.find((q) => q.id === g.id).at === B.id)
      && 加2.将.every((g) => s.generals.find((q) => q.id === g.id).at === C.id),
    [...加1.将, ...加2.将].map((g) => `${g.name}:${場所(g)}`).join(' '));
  確('本軍は落とした城に在陣したままである',
    (s.armies || []).some((x) => x.id === 'M2' && x.在陣 === 的.id));
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
