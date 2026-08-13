// 身代金の仕来りを見る試験。
//
// 滅んだ大名家から身代金の申し出が来ていた。
// 家を滅ぼしても勢力の記録（名・色・金）は盤に残る。戦国記や捕虜の「旧主」を
// 名指すのに要るからである。ところが身代金の関門は「金が足りるか」「兵糧が足りるか」
// しか見ていなかった。
//   ・金は滅んでも残っている（二千六百貫のまま）
//   ・求める兵糧は「城の兵糧の何分の一」なので、城が無ければ零になる
//     → 「持ち高0 ≧ 求め0」で関門を素通りする
// 城を一つも持たぬ家が、使者を寄越して身請けを申し出る形になっていた。
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'ransom-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState, houseAlive } from "../src/core/state.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { ransomCost, ransomAccept, payRansom } from "../src/core/capture.js";\n'
+ 'export { doCaptive } from "../src/govern/commands.js";\n'
+ 'export { migrateSave } from "../src/core/state.js";\n');
const out = path.join(ROOT, 'build', 'ransom.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名 + (添 ? `（${添}）` : ''));
};

/* ------------------------------------------- 滅んだ家の捕虜をこしらえる */
const 仕込む = () => {
  const s = A.initState('oda');
  const 敵 = s.castles.find((c) => c.faction !== s.player).faction;
  const q = s.generals.find((g) => g.faction === 敵 && !g.lord);
  const 城 = s.castles.find((c) => c.faction === s.player);
  q.captive = { by: s.player, from: 敵, at: 城.id, since: { y: s.year, m: s.month } };
  q.at = 城.id; q.retinue = 0; q.loyal = 80;
  return { s, 敵, q };
};

/* ---------------------------------- 一、滅ぶ前は、これまで通り申し出が来る */
{
  const { s, 敵, q } = 仕込む();
  const cost = A.ransomCost(s, q);
  確('滅ぶ前は身代金の勘定が立つ', cost.gold > 0 && cost.food > 0,
    `${s.factions[敵].name}に 金${cost.gold}貫・兵糧${cost.food}石`);
  確('滅ぶ前は家が在ると判ずる', A.houseAlive(s, 敵) === true);
}

/* ------------------------------------ 二、滅んだあとは申し出が来ないこと */
{
  const { s, 敵, q } = 仕込む();
  for (const c of s.castles.filter((c2) => c2.faction === 敵)) c.faction = s.player;   // 滅ぼす
  s.ruined = [敵];
  確('滅んだ家は「在らず」と判ずる', A.houseAlive(s, 敵) === false);
  const cost = A.ransomCost(s, q);
  確('滅んでも金の記録は残っている（だから金だけ見てはいけない）',
    s.factions[敵].gold > 0, `金 ${s.factions[敵].gold}貫`);
  確('滅ぶと求める兵糧が零になる（だから兵糧だけ見てもいけない）',
    cost.food === 0, `求める兵糧 ${cost.food}石`);

  // 月を送っても、滅んだ家からの申し出が立たないこと
  let 出た = null;
  let t = s;
  for (let i = 0; i < 24 && !出た; i++) {
    t = A.advanceMonth(t, t);
    if (t.ransomOffer) 出た = t.ransomOffer;
    // 捕虜が別の始末をつけられていたら、そこで打ち切る
    const q2 = t.generals.find((x) => x.id === q.id);
    if (!q2 || !q2.captive) break;
  }
  確('滅んだ家から身代金の申し出が来ない', !出た,
    出た ? `★${(t.factions[出た.from] || {}).name}が 金${出た.gold}貫を申し出た` : '二年送っても来ない');
}

/* ------------------------ 三、こちらから求めても、話が立たないと分かること */
{
  const { s, 敵, q } = 仕込む();
  for (const c of s.castles.filter((c2) => c2.faction === 敵)) c.faction = s.player;
  s.ruined = [敵];
  確('滅んだ家は身代金に応じない', A.ransomAccept(s, q) === false);
  const 前の金 = s.factions[s.player].gold;
  const 払えたか = A.payRansom(s, q);
  確('滅んだ家からは取り立てられない', 払えたか === false);
  確('取り立てに失敗しても金が湧かない', s.factions[s.player].gold === 前の金,
    `${前の金} → ${s.factions[s.player].gold}貫`);
  const q2 = s.generals.find((x) => x.id === q.id);
  確('捕虜のまま留まる（他家の城へ放り出されない）', !!q2.captive,
    q2.captive ? `${(s.castles.find((c) => c.id === q2.at) || {}).name}に留め置き` : '★解かれた');

  // 命令の側でも塞がっていること
  const t = A.doCaptive(s, q.id, '身代金');
  const q3 = t.generals.find((x) => x.id === q.id);
  確('外交の欄から求めても捕虜のまま', !!q3.captive);
  確('求める相手がいない旨が伝わる', /滅んでいる/.test(t.msg || ''), t.msg || '（報せなし）');
}

/* ------------------------- 四、在る家からの申し出は、これまで通り成り立つ */
{
  const { s, 敵, q } = 仕込む();
  確('在る家は身代金の話が立つ', A.houseAlive(s, 敵) === true);
  const 前 = s.factions[s.player].gold;
  const 払 = A.payRansom(s, q);
  確('在る家からは取り立てられる', !!払, 払 ? `金${払.gold}貫・兵糧${払.food}石` : '★立たず');
  確('取り立てた金が入る', s.factions[s.player].gold > 前, `${前} → ${s.factions[s.player].gold}貫`);
  const q2 = s.generals.find((x) => x.id === q.id);
  確('身請けされた者は旧主の城へ帰る',
    !!q2 && !q2.captive && (s.castles.find((c) => c.id === q2.at) || {}).faction === 敵,
    q2 ? `${(s.castles.find((c) => c.id === q2.at) || {}).name}へ` : '');
}

/* --------------- 五、直す前の記録に残った申し出は、読み込むときに落とす

   遊びの途中で直しが入るのだから、直す前に書き込まれた申し送りが記録に残る。
   滅んだ家からの身代金の申し出がそれで、受けると取り立てが立たず、
   呼ぶ側が paid.gold を読んで落ちていた。読み込むときに繕う。 */
{
  const { s, 敵, q } = 仕込む();
  for (const c of s.castles.filter((c2) => c2.faction === 敵)) c.faction = s.player;
  s.ruined = [敵];
  // 直す前の仕組みが書き込んだ申し出を、そのまま記録に持たせる
  s.ransomOffer = { genId: q.id, gold: 520, food: 0, rank: '丙', from: 敵 };
  s.captives = [q.id, 'いない者'];
  s.warSettle = { faction: 敵, winner: s.player, castleId: s.castles[0].id,
    lordId: null, queue: ['討死した者', q.id] };
  const t = A.migrateSave(JSON.parse(JSON.stringify(s)));
  確('滅んだ家からの申し出は読み込みで落ちる', !t.ransomOffer,
    t.ransomOffer ? '★残っている' : '落ちた');
  確('捕虜の列から、もう捕虜でない者が落ちる', (t.captives || []).length === 1,
    `${(s.captives || []).length} → ${(t.captives || []).length}名`);
  確('滅亡の始末の列から、盤にいない者が落ちる',
    t.warSettle && t.warSettle.queue.length === 1,
    t.warSettle ? `${s.warSettle.queue.length} → ${t.warSettle.queue.length}名` : '★列ごと消えた');
  // 繕ったあとは、受けても落ちない
  const u = A.doCaptive(t, q.id, '身代金');
  確('繕ったあとに身代金を求めても落ちない', !!u && !!u.generals);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
