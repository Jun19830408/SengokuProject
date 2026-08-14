// 馬・鉄砲・兵科の割り・商人・援軍の要請を見る試験。
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'arms-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState } from "../src/core/state.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { newRoster, rosterArms, 蓄えに合わせる } from "../src/core/roster.js";\n'
+ 'export { doTrade } from "../src/govern/commands.js";\n'
+ 'export { 相場, 買値, 売値 } from "../src/data/market.js";\n'
+ 'export { ARM_STATS } from "../src/battle/field.js";\n'
+ 'export { sackCastle } from "../src/govern/war.js";\n'
+ 'export { holdsProvince } from "../src/core/province.js";\n');
const out = path.join(ROOT, 'build', 'arms.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* --------------------------------------------- 一、城の馬と鉄砲（史実に沿う） */
{
  const s = A.initState('oda');
  const 合 = (f, k) => s.castles.filter((c) => c.faction === f).reduce((a, c) => a + (c[k] || 0), 0);
  const 石 = (f) => s.castles.filter((c) => c.faction === f).reduce((a, c) => a + c.koku, 0);
  確('すべての城が馬と鉄砲の値を持つ',
    s.castles.every((c) => typeof c.horse === 'number' && typeof c.gun === 'number'));

  // 牧のある国の家ほど、石高あたりの馬が多い
  const 率 = (f) => 合(f, 'horse') / (石(f) / 10000);
  確('武田は織田より石高あたりの馬が多い', 率('takeda') > 率('oda'),
    `武田 ${率('takeda').toFixed(0)}頭/万石 対 織田 ${率('oda').toFixed(0)}頭/万石`);
  確('南部（奥州の馬の産地）も多い', 率('nanbu') > 率('oda'),
    `南部 ${率('nanbu').toFixed(0)}頭/万石`);
  確('毛利（西国）は少ない', 率('mori') < 率('takeda'), `毛利 ${率('mori').toFixed(0)}頭/万石`);

  // 天文十五年。鉄砲は伝来三年目で、持つ家は限られる
  const 持つ城 = s.castles.filter((c) => c.gun > 0).length;
  確('鉄砲を持つ城はごく一部', 持つ城 > 0 && 持つ城 < s.castles.length * 0.3,
    `${持つ城}/${s.castles.length}城`);
  確('島津（種子島）は鉄砲を持つ', 合('shimazu', 'gun') > 0, `${合('shimazu', 'gun')}挺`);
  確('雑賀（根来・雑賀衆）も持つ', 合('saika', 'gun') > 0, `${合('saika', 'gun')}挺`);
  確('武田は鉄砲を持たない（史実どおり）', 合('takeda', 'gun') === 0);
  確('織田もこの年はまだ持たない', 合('oda', 'gun') === 0);
}

/* ------------------------------------------------- 二、兵科の割りと城の蓄え */
{
  確('割りのとおりに名簿が立つ', (() => {
    const r = A.rosterArms(A.newRoster(1000, 't', { yari: 20, yumi: 10, teppo: 0, kiba: 70 }));
    return r.kiba === 700 && r.yari === 200 && r.yumi === 100;
  })(), '20/10/0/70 → 槍200 弓100 騎馬700');

  // 馬が足りなければ、そのぶんは槍が埋める
  const 足りる = A.蓄えに合わせる({ yari: 20, yumi: 10, teppo: 0, kiba: 70 }, 1000, { horse: 900, gun: 0 });
  const 足りぬ = A.蓄えに合わせる({ yari: 20, yumi: 10, teppo: 0, kiba: 70 }, 1000, { horse: 200, gun: 0 });
  確('馬が足りれば望みどおり立つ', 足りる.kiba === 700 && !足りる.足りぬ馬);
  確('馬が足りねば槍が埋める', 足りぬ.kiba === 200 && 足りぬ.yari === 700 && 足りぬ.足りぬ馬 === 500,
    `騎馬200・槍700（馬が500頭足りぬ）`);
  const 砲 = A.蓄えに合わせる({ yari: 50, yumi: 10, teppo: 40, kiba: 0 }, 1000, { horse: 0, gun: 30 });
  確('鉄砲も蓄えが限りとなる', 砲.teppo === 30 && 砲.足りぬ鉄砲 === 370, `鉄砲30挺ぶんのみ`);
  確('人数の総和は必ず合う',
    [足りる, 足りぬ, 砲].every((x) => x.yari + x.yumi + x.teppo + x.kiba === 1000));

  // 兵科で戦い方が変わる（既にある ARM_STATS がそう定めている）
  確('騎馬は槍より白兵に強い', A.ARM_STATS.kiba.melee > A.ARM_STATS.yari.melee,
    `騎馬${A.ARM_STATS.kiba.melee} 対 槍${A.ARM_STATS.yari.melee}`);
  確('鉄砲は弓より一発が重い', A.ARM_STATS.teppo.vol > A.ARM_STATS.yumi.vol,
    `鉄砲${A.ARM_STATS.teppo.vol} 対 弓${A.ARM_STATS.yumi.vol}`);
}

/* ----------------------------------------------------------- 三、商人 */
{
  const s = A.initState('oda');
  const c = s.castles.find((x) => x.faction === s.player);
  const 買 = (m, k, n) => A.買値({ ...s, month: m }, c, k, n);
  確('兵糧は取り入れのあとが安く、端境が高い', 買(10, 'food', 1000) < 買(1, 'food', 1000),
    `10月 ${買(10, 'food', 1000)}貫 対 1月 ${買(1, 'food', 1000)}貫`);
  確('馬は秋に安く、冬から春に高い', 買(10, 'horse', 50) < 買(2, 'horse', 50),
    `10月 ${買(10, 'horse', 50)}貫 対 2月 ${買(2, 'horse', 50)}貫`);
  確('鉄砲は年を追って安くなる',
    A.買値({ ...s, year: 1566, month: 6 }, c, 'gun', 10) < A.買値({ ...s, year: 1546, month: 6 }, c, 'gun', 10),
    `1546年 ${A.買値({ ...s, year: 1546, month: 6 }, c, 'gun', 10)}貫 → 1566年 ${A.買値({ ...s, year: 1566, month: 6 }, c, 'gun', 10)}貫`);

  const 金前 = s.factions[s.player].gold, 馬前 = c.horse;
  const t = A.doTrade(s, c.id, 'horse', 50);
  const c2 = t.castles.find((x) => x.id === c.id);
  確('馬を買える', c2.horse === 馬前 + 50 && t.factions[t.player].gold < 金前,
    `馬 ${馬前}→${c2.horse}／金 ${金前}→${t.factions[t.player].gold}貫`);
  const u = A.doTrade(t, c.id, 'horse', -50);
  確('売り戻すと口銭のぶん損をする', u.factions[u.player].gold < 金前,
    `${金前} → ${u.factions[u.player].gold}貫`);
  const v = A.doTrade(s, c.id, 'gun', 100000);
  確('金が足りねば買えない', v.castles.find((x) => x.id === c.id).gun === c.gun,
    (v.msg || '').slice(0, 30));
  const w = A.doTrade(s, c.id, 'gun', -10);
  確('持たぬものは売れない', w.factions[w.player].gold === 金前, (w.msg || '').slice(0, 20));
}

/* ------------------------------------------------- 四、盟友からの援軍の要請 */
{
  let s = A.initState('oda');
  // 同盟の相手の城を、敵に囲ませる
  const 盟 = 'mizuno';                                    // 初めから織田と同盟
  const 的 = s.castles.find((c) => c.faction === 盟);
  const 敵 = s.castles.find((c) => c.faction !== 盟 && c.faction !== s.player);
  s.armies.push({ id: 'bes', faction: 敵.faction, from: 敵.id, gens: [],
    local: 3000, localTrain: 70, rost: null, men: 3000, at: 的.id,
    path: [的.id], prog: 0, food: 9999, target: 的.id, sieging: true });
  s.sieges = [{ castleId: 的.id, armyId: 'bes', months: 1, decided: null }];
  s = A.advanceMonth(s, s);
  確('同盟の城が囲まれると援軍を求められる', !!s.aidCall,
    s.aidCall ? `${s.factions[s.aidCall.faction].name}より ${(s.castles.find((c) => c.id === s.aidCall.castleId) || {}).name}へ` : '★来ない');
  if (s.aidCall) {
    確('同盟なら「頼み」であって下知ではない', s.aidCall.下知 === false, `間柄：${s.aidCall.state}`);
    確('囲まれている旨が伝わる', s.aidCall.囲まれ === true);
  }
  // 同じ城について、二度も三度も使者を寄越さない
  const 前 = s.aidCall;
  s.aidCall = null;
  s = A.advanceMonth(s, s);
  確('同じ城で繰り返し求められない', !s.aidCall || s.aidCall.castleId !== 前.castleId);
}

/* --------------------------------------- 五、直属の供回りには必ず馬が付く

   直属は武将が自前で養う手勢である。地域家臣団の割りをどう選ぼうと、
   供回りの騎馬は変わらない。騎馬の一騎もいない武将というものはいない。 */
{
  const s = A.initState('oda');
  const 手勢 = s.generals.filter((x) => x.retinue >= 50);
  const 無し = 手勢.filter((x) => A.rosterArms(x.rost).kiba === 0);
  確('直属五十人以上の武将に、騎馬のいない者はいない', 無し.length === 0,
    `${手勢.length}名を検めた`);
  const q = s.generals.find((x) => x.name === '織田信長');
  const r = A.rosterArms(q.rost);
  確('直属のうち二割五分ほどが騎馬',
    r.kiba / Math.max(1, q.retinue) > 0.2 && r.kiba / Math.max(1, q.retinue) < 0.3,
    `${q.name} 直属${q.retinue}人中 騎馬${r.kiba}・槍${r.yari}・弓${r.yumi}・鉄砲${r.teppo}`);
}

/* ------------------------------------- 六、一国を平定したら、その場で知らせる */
{
  const s = A.initState('oda');
  // 尾張の城を、最後の一つを残してすべて織田のものにする
  const 尾張 = s.castles.filter((c) => c.kuni === '尾張');
  const 最後 = 尾張.find((c) => c.faction !== s.player);
  for (const c of 尾張) if (c !== 最後) c.faction = s.player;
  確('最後の一城を残した時点では、まだ平定していない',
    !A.holdsProvince(s, s.player, '尾張'), `${尾張.length}城中 ${尾張.length - 1}城`);
  const army = { id: 'A', faction: s.player, from: s.castles.find((c) => c.faction === s.player).id,
    gens: [], local: 4000, men: 4000, rost: null, at: 最後.id, path: [最後.id],
    prog: 0, food: 9999, target: 最後.id };
  s.armies.push(army);
  A.sackCastle(s, 最後, army, true);
  確('最後の一城を落とすと平定になる', A.holdsProvince(s, s.player, '尾張'));
  確('その場で知らせが立つ', !!s.国平定 && s.国平定.kuni === '尾張',
    s.国平定 ? `${s.国平定.kuni}・${s.国平定.城数}城` : '★立たない');
  確('戦国記にも残る',
    (s.chronicle || []).some((x) => /尾張を一国残らず手中にした/.test(x.text)),
    (s.chronicle.find((x) => /一国残らず/.test(x.text)) || {}).text || '');
  確('月次の報せにも載る',
    (s.monthEvents || []).some((x) => /尾張を平定した/.test(x)));
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
