// 敗れた軍が、ちゃんと城へ帰るかを見る試験。
//
// 出陣元だけを探して見つからなければ何もしない、という書き方があちこちにあった。
// これには二つの穴がある。
//   一、留守に出陣元を奪われていると、城は「見つかる」が敵の城である
//   二、出陣元が失われていると城は見つからず、軍だけ消えて将が宙に浮く
// 二つ目のとき、将は盤にも城の帳面にも現れない。遊ぶ側からは「武将が消えた」と映る。
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const out = path.join(ROOT, 'build', 'bench.cjs');
fs.mkdirSync(path.dirname(out), { recursive: true });
esbuild.buildSync({
  entryPoints: [path.join(ROOT, 'tools', 'bench-entry.js')],
  bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error',
});
const H = require(out);
const 咎 = [];

const 軍を立てる = (s, from, at, n) => {
  const gens = s.generals.filter((x) => x.at === from.id && x.faction === from.faction).slice(0, 2);
  for (const t of gens) t.at = null;
  const a = { id: `t${Math.round(Math.random() * 1e9)}`, faction: from.faction, from: from.id,
    gens: gens.map((x) => x.id), local: n, localTrain: 70, rost: null, men: n + 400,
    at: at.id, path: [at.id], prog: 0, food: 9999, target: at.id };
  s.armies.push(a);
  return { a, gens };
};

/* 一、出陣元を奪われていても、別の自領へ帰れること */
{
  const s = H.initState('oda');
  const 自城 = s.castles.filter((x) => x.faction === s.player);
  const A = 自城[0], 別 = 自城[1];
  const { a, gens } = 軍を立てる(s, A, 別, 800);
  A.faction = 'kounotori';                      // 留守に奪われた
  const 前 = 別.local;
  const home = H.withdrawArmy(s, a);
  const 居所 = gens.map((q) => (s.generals.find((x) => x.id === q.id) || {}).at);
  console.log('一、出陣元を奪われた軍');
  console.log('  帰り先: ' + (home ? home.name : '★見つからない'));
  console.log('  将の居場所: ' + 居所.map((id) => (s.castles.find((c) => c.id === id) || {}).name || `★${id}`).join(' / '));
  console.log('  兵が城へ入った数: ' + (別.local - 前));
  if (!home) 咎.push('出陣元を奪われた軍の帰り先が見つからない');
  if (居所.some((id) => !s.castles.some((c) => c.id === id))) 咎.push('将が城にいない（消えている）');
  if (home && home.faction !== s.player) 咎.push('敵の城へ帰ってしまった');
  if (s.armies.some((x) => x.id === a.id)) 咎.push('軍が解かれていない');
}

/* 二、出陣元が敵の手にあるとき、そこへ兵を足さないこと */
{
  const s = H.initState('oda');
  const 自城 = s.castles.filter((x) => x.faction === s.player);
  const A = 自城[0], 別 = 自城[1];
  const { a } = 軍を立てる(s, A, 別, 900);
  A.faction = 'kounotori';
  const 敵城の前 = A.local;
  H.withdrawArmy(s, a);
  console.log('\n二、奪われた出陣元へ兵を足さないこと');
  console.log('  奪われた城の兵: ' + 敵城の前 + ' → ' + A.local);
  if (A.local > 敵城の前) 咎.push('敵の手に渡った城へ、自軍の兵を足してしまった');
}

/* 三、迷子の見回り。軍にも属さず城にもいない将を拾うこと */
{
  const s = H.initState('oda');
  const 迷子 = s.generals.filter((x) => x.faction === s.player).slice(0, 2);
  for (const q of 迷子) q.at = null;
  const 戻した = H.restoreStrays(s);
  console.log('\n三、迷子の見回り');
  console.log('  戻した将: ' + (戻した.length
    ? 戻した.map((q) => `${q.name}→${(s.castles.find((c) => c.id === q.at) || {}).name}`).join(' / ')
    : '★戻していない'));
  if (戻した.length !== 2) 咎.push('迷子の将を戻せていない');

  // 出陣中の将は迷子ではない。触ってはならぬ。
  const u = H.initState('oda');
  const 出 = u.generals.filter((x) => x.faction === u.player).slice(0, 1);
  出[0].at = null;
  const c0 = u.castles[0];
  u.armies.push({ id: 'm', faction: u.player, from: c0.id, gens: [出[0].id],
    local: 100, men: 100, at: c0.id, path: [c0.id], prog: 0, food: 1, target: c0.id });
  const 誤 = H.restoreStrays(u);
  console.log('  出陣中の将に触っていないか: ' + (誤.length ? '★触った' : '触っていない'));
  if (誤.length) 咎.push('出陣中の将を城へ戻してしまった');
}

/* 四、長く走らせても、宙に浮いた将が出ないこと */
{
  let s = H.initState('oda');
  s.autoPlay = true;
  let 最悪 = 0;
  for (let i = 0; i < 120; i++) {
    s = H.画面なしの一月(s);
    const 出陣中 = new Set();
    for (const a of s.armies) for (const gid of a.gens) 出陣中.add(gid);
    const 宙 = s.generals.filter((q) => !q.captive && !出陣中.has(q.id)
      && (!q.at || !s.castles.some((c) => c.id === q.at))
      && s.castles.some((c) => c.faction === q.faction));
    最悪 = Math.max(最悪, 宙.length);
  }
  console.log('\n四、十年走らせて、宙に浮いた将の最多');
  console.log('  ' + 最悪 + ' 名');
  if (最悪 > 0) 咎.push(`長期走行で宙に浮いた将が出た（最多 ${最悪} 名）`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
