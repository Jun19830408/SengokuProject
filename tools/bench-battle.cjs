// 合戦を無描画で決着まで走らせ、目方を測る。
// 「委ねて結果を見る」の刻みをどれだけ細かく取れるかを決めるために使う。
//
//   node tools/bench-battle.cjs [刻み] [兵数]
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const 刻み = Number(process.argv[2] || 0.05);
const 兵 = Number(process.argv[3] || 8000);

const out = path.join(ROOT, 'build', 'bench-battle.cjs');
fs.mkdirSync(path.dirname(out), { recursive: true });
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'bench-battle-entry.js')],
  bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error',
});
const { createBattle, stepBattle, makeCorps, layoutField, setFieldSeed, FIELD, setBattleMap } = require(out);

setBattleMap(null);
setFieldSeed('kiyosu', 'nagoya');
layoutField(兵 * 2);

const 隊を立てる = (side, n, 総, color) => {
  const 一隊 = Math.round(総 / n);
  return Array.from({ length: n }, (_, i) => {
    const x = FIELD.w / 2 + (i - (n - 1) / 2) * 170;
    const y = side === 'P' ? FIELD.h * 0.86 : FIELD.h * 0.14;
    const f = side === 'P' ? -Math.PI / 2 : Math.PI / 2;
    const gen = { id: `${side}${i}`, name: `${side}${i}`, lead: 60 + i, valor: 58, wit: 55, gov: 50,
      retinue: Math.round(一隊 * 0.3), retTrain: 62, unity: 60 };
    return makeCorps(side, gen, gen.retinue, 一隊 - gen.retinue, 62, 58, x, y, f, color);
  });
};

const b = createBattle(隊を立てる('P', 5, 兵, '#2F5D8C'), 隊を立てる('E', 5, 兵, '#9B3A34'), 'P');
b.phase = 'fight';
for (const c of b.corps) c.auto = true;          // 全軍を委任する

const t0 = process.hrtime.bigint();
let 歩 = 0;
while (b.phase === 'fight' && 歩 < 400000) { stepBattle(b, 刻み); 歩++; }
const 実 = Number(process.hrtime.bigint() - t0) / 1e6;

console.log(`刻み ${刻み} 秒 ／ 片軍 ${兵} 人（5隊）`);
console.log(`  ${歩} 歩で決着（戦場の刻 ${b.t.toFixed(0)} 秒／日没は ${b.dusk} 秒）`);
console.log(`  かかった時間 ${実.toFixed(0)} ミリ秒（一歩あたり ${(実 / Math.max(1, 歩)).toFixed(3)} ミリ秒）`);
console.log(`  結果 ${b.result}`);
console.log(`  日没まで走らせたとすると ${(実 / Math.max(1, 歩) * (b.dusk / 刻み) / 1000).toFixed(1)} 秒`);
