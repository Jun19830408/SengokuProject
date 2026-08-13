// 月送りの目方を測る。画面を描かずに月だけを回す。
//
//   node tools/bench.cjs [月数]
//
// 月送りを画面から切り離したので、これが測れるようになった。
// 「50年走らせても天下が定まらぬ」の検証も、ここを足がかりにする。
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const 月数 = Number(process.argv[2] || 120);

const out = path.join(ROOT, 'build', 'bench.cjs');
fs.mkdirSync(path.dirname(out), { recursive: true });
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'bench-entry.js')],
  bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error',
});
const { initState, advanceMonth } = require(out);

let s = initState('oda');
s.autoPlay = true;                       // 自家も含め、すべてをAIに任せる
const 刻 = [];
const t0 = process.hrtime.bigint();
for (let i = 0; i < 月数; i++) {
  const a = process.hrtime.bigint();
  s = advanceMonth(s, s);
  刻.push(Number(process.hrtime.bigint() - a) / 1e6);
}
const 総 = Number(process.hrtime.bigint() - t0) / 1e6;

刻.sort((a, b) => a - b);
const 中 = 刻[Math.floor(刻.length / 2)];
const 上位 = 刻[Math.floor(刻.length * 0.95)];
const 最大 = 刻[刻.length - 1];

console.log(`月送りを${月数}回（${(月数 / 12).toFixed(0)}年ぶん）`);
console.log(`  合わせて   ${総.toFixed(0)} ミリ秒`);
console.log(`  一月あたり 中央 ${中.toFixed(1)} / 上位5% ${上位.toFixed(1)} / 最も重い ${最大.toFixed(1)} ミリ秒`);
console.log(`  盤の大きさ ${(JSON.stringify(s).length / 1024).toFixed(0)} KB`);
console.log(`  ${s.year}年${s.month}月まで進んだ`);
const 家 = {};
for (const c of s.castles) 家[c.faction] = (家[c.faction] || 0) + 1;
const 上 = Object.entries(家).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log('  城の多い家:', 上.map(([f, n]) => `${(s.factions[f] || {}).name || f} ${n}城`).join(' / '));
