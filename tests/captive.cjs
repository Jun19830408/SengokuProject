// 捕虜の仕来りが守られているかを見る試験。
//
// 城が落ちたとき、敗れた者が「その場で勝者の家中に加わる」のは、
// 心が既に旧主から離れていた者だけである。
//   ・当主は決して降らぬ
//   ・旧主と血を分けた一門も降らぬ
//   ・旧主への忠誠が篤い者も降らぬ
// 降らぬ者は捕虜となり、扶持を与えて月を重ねねば召し抱えられぬ。
//
// 画面を描かずに三十年ぶん走らせ、その間に起きた陥落をすべて数える。
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const 月数 = Number(process.argv[2] || 360);

const out = path.join(ROOT, 'build', 'bench.cjs');
fs.mkdirSync(path.dirname(out), { recursive: true });
esbuild.buildSync({
  entryPoints: [path.join(__dirname, '..', 'tools', 'bench-entry.js')],
  bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error',
});
const { initState, 画面なしの一月 } = require(out);

// 賽の目を固定する（同じ結果が出るように）
let 種 = 0x1546_5A1;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

let s = initState('oda');
s.autoPlay = true;
const 咎 = [];
// 戦国記は直近四百件で打ち切られる。月ごとに拾って取り置く。
const 記録 = new Set();
const 拾う = () => { for (const x of s.chronicle) 記録.add(`${x.y}|${x.m}|${x.text}`); };

for (let i = 0; i < 月数; i++) {
  const 前 = new Map(s.generals.map((g) => [g.id, { f: g.faction, lord: !!g.lord, cap: !!g.captive, loy: g.loyal }]));
  s = 画面なしの一月(s);
  拾う();

  // 一、家を移った者を洗い、その筋道が通っているかを見る
  for (const g of s.generals) {
    const b = 前.get(g.id);
    if (!b || b.f === g.faction) continue;
    if (b.cap || g.captive) continue;                    // 捕虜まわりは別の道筋
    // 当主がそのまま他家の者になっていたら、仕来りに背いている
    if (b.lord && !g.lord) {
      // 家督を譲って捕らわれた者は、この時点で captive のはずである
      咎.push(`${s.year}年${s.month}月：当主 ${g.name} が捕虜にならず ${(s.factions[g.faction] || {}).name} へ移った`);
    }
    if (b.lord && g.lord) {
      咎.push(`${s.year}年${s.month}月：当主 ${g.name} が当主のまま ${(s.factions[g.faction] || {}).name} へ移った`);
    }
  }

  // 二、当主の座が空いた家がないか（捕らわれたのに跡目が立っていない）
  for (const fid of new Set(s.castles.map((c) => c.faction))) {
    const 当主 = s.generals.filter((x) => x.faction === fid && x.lord && !x.captive);
    if (当主.length > 1) 咎.push(`${s.year}年${s.month}月：${(s.factions[fid] || {}).name} に当主が${当主.length}人いる`);
  }
}

// 三、取り置いた戦国記から、陥落のたびに何が起きたかを数える
const 記 = [...記録].join('\n');
const 数 = (re) => (記.match(re) || []).length;
const 降った = 数(/は降り、/g);
const 捕らえ = 数(/捕らえられた。|生け捕りにされた。/g);
const 討死 = 数(/討死した。/g);
const 落ち延び = 数(/へ落ち延びた。|へ逃れた。/g);
const 家督 = 数(/敵手に捕らわれた。/g);

console.log(`${月数 / 12}年ぶんを走らせた（${s.year}年${s.month}月まで）`);
console.log('');
console.log('  城が落ちたときの、敗れた者の行方');
console.log(`    討死            ${String(討死).padStart(4)} 件`);
console.log(`    捕らわれた      ${String(捕らえ).padStart(4)} 件`);
console.log(`    落ち延びた      ${String(落ち延び).padStart(4)} 件`);
console.log(`    その場で降った  ${String(降った).padStart(4)} 件`);
console.log(`    当主が捕らわれ、家督が移った  ${家督} 件`);
console.log('');

// 捕虜がまったく出ないのでは、仕来りが働いていない
if (捕らえ === 0) 咎.push('捕虜が一人も出ていない');
// その場で降る者ばかりでは、以前の不具合のままである
if (降った > 捕らえ) 咎.push(`その場で降った者(${降った})が、捕らわれた者(${捕らえ})より多い`);

// いま捕らわれている者の様子
const 囚 = s.generals.filter((x) => x.captive);
console.log(`  いま囚われている者 ${囚.length} 名`);
for (const q of 囚.slice(0, 3)) {
  console.log(`    ${q.name}（${(s.factions[q.captive.by] || {}).name}の手に・旧${(s.factions[q.captive.from] || {}).name}）`);
}
// 囚われた者が、そのまま捕らえた家の者になっていないこと
for (const q of 囚) {
  if (q.faction === q.captive.by) 咎.push(`${q.name} が捕虜のまま捕らえた家の者になっている`);
  if (q.lord) 咎.push(`${q.name} が捕虜のまま当主の座にある`);
}

/* ---------------------------------------- 旧主が滅んだ捕虜と、登用の関門

   旧主の家が絶えたとき、捕虜はどうなるか。
   かつては、その場で捕らえた家の者にしていた。だがそれでは、
   旧主と血を分けた一門も、忠義の篤い者も、問答無用で家臣になる。
   捕虜の一覧からも消えるので、遊ぶ側からは「捕虜がいなくなった」と映る。 */
{
  const H = require(path.join(ROOT, 'build', 'bench.cjs'));
  let t = H.initState('oda');
  const 敵家 = t.castles.find((c) => c.faction !== t.player).faction;
  const 敵将 = t.generals.filter((x) => x.faction === 敵家).slice(0, 3);
  const 城 = t.castles.find((c) => c.faction === t.player);
  for (const q of 敵将) { q.captive = { by: t.player, from: 敵家, at: 城.id, since: { y: 1546, m: 1 } }; q.at = 城.id; q.retinue = 0; }
  for (const c of t.castles.filter((c2) => c2.faction === 敵家)) c.faction = t.player;   // 滅亡させる
  const 記の前 = t.chronicle.length;
  t = H.画面なしの一月(t);
  const 記 = t.chronicle.slice(記の前).map((e) => e.text).join('');
  const 後 = 敵将.map((q) => t.generals.find((x) => x.id === q.id)).filter(Boolean);
  console.log('');
  console.log(`  旧主（${(s.factions[敵家] || {}).name || 敵家}）が滅んだ捕虜 ${後.length} 名`);
  for (const q of 後) {
    console.log(`    ${q.name}: ${q.captive ? `捕虜のまま（忠誠${Math.round(q.loyal)}）` : '★' + ((t.factions[q.faction] || {}).name || '') + 'の家臣になった'}`);
    if (!q.captive) 咎.push(`${q.name} が旧主の滅亡だけで勝手に家臣になった`);
  }
  /* 捕虜であっても齢は取る。その一月に病没した者は、消えたうちに入らない。

     もとは「三人とも残っていること」で判じていた。これは仕様ではなく、
     選んだ三人がたまたま長生きすることに賭けていただけである。初めの間柄を
     書き足して賽の位置がずれた途端、五十一歳の鳥居忠吉が病没して倒れた。
     守りたいのは「旧主が滅んだというだけで捕虜が黙って消えないこと」である
     から、没した記が残っているかで判ずる。 */
  const 黙って消えた = 敵将.filter((q) => !t.generals.find((x) => x.id === q.id)
    && !記.includes(`${q.name}が病没`));
  if (黙って消えた.length) 咎.push(`旧主が滅んだ捕虜が黙って消えた（${黙って消えた.map((q) => q.name).join('・')}）`);
  for (const q of 敵将) {
    if (t.generals.find((x) => x.id === q.id)) continue;
    if (記.includes(`${q.name}が病没`)) console.log(`    ${q.name}: その月に病没した（消えたうちに入らない）`);
  }

  // 登用の関門。一門は忠誠がいくら下がっても降らぬ。
  const u = H.initState('oda');
  const f2 = u.castles.find((c) => c.faction !== u.player).faction;
  const 主 = u.generals.find((x) => x.faction === f2 && x.lord);
  const 一門 = u.generals.find((x) => x.faction === f2 && !x.lord && x.name.slice(0, 2) === 主.name.slice(0, 2));
  const 家臣 = u.generals.find((x) => x.faction === f2 && !x.lord && x.name.slice(0, 2) !== 主.name.slice(0, 2));
  const c2 = u.castles.find((c) => c.faction === u.player);
  const 判 = (q, loy) => {
    if (!q) return null;
    q.captive = { by: u.player, from: f2, at: c2.id }; q.at = c2.id; q.loyal = loy;
    return H.captiveRecruit(u, q);
  };
  const a1 = 判(一門, 10), b1 = 判(家臣, 10), c1 = 判(家臣, 60);
  console.log(`  登用の関門（旧主 ${主.name}）`);
  if (a1) console.log(`    一門 ${一門.name}（忠誠10）: ${a1.ok ? '★登用できてしまう' : '降らぬ'}`);
  if (b1) console.log(`    家臣 ${家臣.name}（忠誠10）: ${b1.ok ? '登用できる' : '★登用できない'}`);
  if (c1) console.log(`    家臣 ${家臣.name}（忠誠60）: ${c1.ok ? '★登用できてしまう' : '降らぬ'}`);
  if (a1 && a1.ok) 咎.push('旧主と血を分けた一門を登用できてしまう');
  if (b1 && !b1.ok) 咎.push('忠誠が下がった家臣を登用できない');
  if (c1 && c1.ok) 咎.push('忠誠が下がっていない者を登用できてしまう');
}

console.log('');
if (咎.length) {
  console.log('★仕来りに背いた事:');
  for (const x of 咎.slice(0, 8)) console.log('   ' + x);
}
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
