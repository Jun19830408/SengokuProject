/* 同じ種からは同じ盤が出る（賽の固定）。

   試験は Math.random を差し替えて賽を固定している。それでも★gaiko が時折
   倒れた。同じ種で二度回すと、二十五年後の盤がこれだけ食い違った。

     同盟 25/21　従属 60/56　臣従 11/15　武将 1036/1045　金 36198/34210

   因は二つあった。どちらも「遊びの外に置いた覚え」を盤の代わりに使っていた。

   一、bearChild が親子を PARENT へ書き込んでいた。PARENT は newcomers.js が
       持つ史実の帳面で、盤ごとのものではない。書き込めば卓を閉じても残る。
       同じ画面で二局目を始めると、一局目に生まれた子の親が混ざり、
       「すでに子がある」と見て子が生まれなくなる（武将の数が食い違う）。
       いまは s.親 に控える。記録にも乗るので、読み直しても親子が消えない。

   二、卓の印 s.卓 に Date.now() が入っていた。卓の印は置き場を守るための
       ものだが、外交・調略・縁組の賽は籤(s.卓, …) から起こしている。
       印に時計が混じっていれば、賽を固定しても外交だけが毎回ずれる。
       いまは賽から起こす（遊ぶ側にとっては Math.random が本物なので、
       卓ごとに違う印が出ることは変わらない）。

   直したあとは、同じ種で二度回して寸分違わない。
   ここを恒久の試験に据え、以後この道が塞がったままであることを見張る。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'onaji-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState } from "../src/core/state.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { PARENT } from "../src/data/newcomers.js";\n');
const out = path.join(ROOT, 'build', 'onaji.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 0;
const 種を据える = (v) => { 種 = v; };
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const 月数 = 36;                                   // 三年。外交も家督も動くだけの長さ

// 盤の姿を一本の文字に写す。ここが揃えば、盤は揃っている。
function 盤の写し(s) {
  const 状 = (f) => Object.values(s.relations).filter(f).length;
  return [
    `同${状((r) => r.state === '同盟')}`,
    `不${状((r) => r.state === '不可侵')}`,
    `従${状((r) => r.state === '従属')}`,
    `臣${状((r) => r.state === '臣従')}`,
    `将${s.generals.length}`,
    `金${Math.round(s.factions.oda.gold)}`,
    `城[${s.castles.map((c) => c.faction).join(',')}]`,
    `名[${s.generals.map((g) => g.id).sort().join(',')}]`,
  ].join('|');
}

function 走る(たね) {
  種を据える(たね);
  let s = A.initState('oda');
  s.autoPlay = true;
  const 卓 = s.卓;
  for (let i = 0; i < 月数; i++) s = A.advanceMonth(s, s);
  return { 写: 盤の写し(s), 卓, s };
}

console.log('\n── 一　同じ種からは同じ盤が出る');
const 親の数 = Object.keys(A.PARENT).length;
const 甲 = 走る(0x515);
const 乙 = 走る(0x515);

// 食い違った所を数えて見せる。ただ「違う」では、どこが揺れたのか分からない。
const 割 = (w) => w.split('|');
const a = 割(甲.写), b = 割(乙.写);
const 違い = a.filter((x, i) => x !== b[i]);
確('三年走らせて、盤が寸分違わない', 甲.写 === 乙.写,
  違い.length ? `食い違い ${違い.length}箇所` : `${月数}か月　${a.slice(0, 6).join(' ')}`);
if (甲.写 !== 乙.写) {
  a.forEach((x, i) => { if (x !== b[i]) console.log(`      ${x.slice(0, 40)} ／ ${b[i].slice(0, 40)}`); });
}
確('卓の印も同じ種からは同じ（時計が混じっていない）', 甲.卓 === 乙.卓, `${甲.卓} ／ ${乙.卓}`);

console.log('\n── 二　違う種からは違う盤が出る（凍っていない）');
const 丙 = 走る(0x777);
確('種を変えれば盤も変わる', 丙.写 !== 甲.写);
確('外交か家督のどちらかは必ず動いている',
  Object.values(甲.s.relations).some((r) => r.state !== '中立') && 甲.s.generals.length > 0);

console.log('\n── 三　遊びは module の帳面を汚さない');
確('史実の親子帳（PARENT）に、生まれた子が書き込まれていない',
  Object.keys(A.PARENT).length === 親の数,
  `${親の数} → ${Object.keys(A.PARENT).length}`);
const 生まれ = 甲.s.generals.filter((g) => /_c\d{4}$/.test(g.id));
確('生まれた子の親は盤（s.親）に控えてある',
  生まれ.length === 0 || 生まれ.every((g) => 甲.s.親 && 甲.s.親[g.id]),
  `${生まれ.length}名が生まれた`);
確('盤に控えた親子は、記録に包める（JSON に乗る）',
  JSON.parse(JSON.stringify({ 親: 甲.s.親 || {} })).親 != null
  && Object.keys(JSON.parse(JSON.stringify(甲.s.親 || {}))).length === Object.keys(甲.s.親 || {}).length);

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
