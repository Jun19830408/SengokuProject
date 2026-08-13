// 「委ねて結果を見る」の刻みを決めるための調べ。
//
// 合戦は一歩ずつ時を進めて解く。手ずから戦うときの一歩は、およそ 0.01 秒である
// （通常の速さ・毎秒60画で）。省略のときに一歩を粗く取れば速く済むが、
// 粗すぎれば手ずから戦った場合と結果が食い違う。
// 同じ布陣・同じ賽の目から、刻みだけを変えて何度も戦わせ、勝敗の食い違いを数える。
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const 回数 = Number(process.argv[2] || 20);
const 兵 = Number(process.argv[3] || 6000);

const out = path.join(ROOT, 'build', 'bench-battle.cjs');
fs.mkdirSync(path.dirname(out), { recursive: true });
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'bench-battle-entry.js')],
  bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error',
});
const { createBattle, stepBattle, makeCorps, layoutField, setFieldSeed, FIELD, setBattleMap } = require(out);

// 種から同じ目を出す賽
function 賽(seed) {
  let 種 = seed >>> 0;
  return function () {
    種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
    let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const 隊を立てる = (side, n, 総, color, 強さ) => {
  const 一隊 = Math.round(総 / n);
  return Array.from({ length: n }, (_, i) => {
    const x = FIELD.w / 2 + (i - (n - 1) / 2) * 170;
    const y = side === 'P' ? FIELD.h * 0.86 : FIELD.h * 0.14;
    const f = side === 'P' ? -Math.PI / 2 : Math.PI / 2;
    const gen = { id: `${side}${i}`, name: `${side}${i}`, lead: 強さ, valor: 強さ - 4, wit: 55, gov: 50,
      retinue: Math.round(一隊 * 0.3), retTrain: 62, unity: 60 };
    return makeCorps(side, gen, gen.retinue, 一隊 - gen.retinue, 62, 58, x, y, f, color);
  });
};

// 一戦。setup は同じ賽で組み、戦いは指定の刻みで解く。
function 一戦(seed, 刻み, 比) {
  Math.random = 賽(seed);
  setBattleMap(null);
  setFieldSeed('kiyosu', 'nagoya');
  layoutField(兵 * 2);
  const p = 隊を立てる('P', 4, Math.round(兵 * 比), '#2F5D8C', 62);
  const e = 隊を立てる('E', 4, 兵, '#9B3A34', 60);
  const b = createBattle(p, e, 'P');
  b.phase = 'fight';
  for (const c of b.corps) c.auto = true;
  Math.random = 賽(seed ^ 0x5bf03635);          // 戦いの賽は改めて同じ種から
  let 歩 = 0;
  const t0 = process.hrtime.bigint();
  while (b.phase === 'fight' && 歩 < 300000) { stepBattle(b, 刻み); 歩++; }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const 残 = (side) => b.corps.filter((c) => c.side === side && !c.dead && !c.destroyed)
    .reduce((a, c) => a + c.squads.reduce((s, q) => s + q.men, 0), 0);
  return { 勝: b.result, 味方: 残('P'), 敵: 残('E'), 刻: b.t, ms };
}

const 刻み一覧 = [0.01, 0.02, 0.033, 0.05];
const 本物 = 刻み一覧[0];
const 結果 = {};
for (const d of 刻み一覧) 結果[d] = [];

const 元の乱数 = Math.random;
for (let i = 0; i < 回数; i++) {
  const seed = 1000 + i * 7919;
  const 比 = 0.7 + (i % 5) * 0.15;               // 寡兵から優勢まで
  for (const d of 刻み一覧) 結果[d].push(一戦(seed, d, 比));
}
Math.random = 元の乱数;

console.log(`同じ布陣・同じ賽の目で ${回数} 戦、刻みだけを変えて比べる（片軍 ${兵} 人）`);
console.log('');
console.log('  刻み    勝敗の一致   兵の残りの差(中央)   一戦にかかる時間(中央)');
for (const d of 刻み一覧) {
  const a = 結果[d], 基 = 結果[本物];
  const 一致 = a.filter((x, i) => x.勝 === 基[i].勝).length;
  const 差 = a.map((x, i) => Math.abs(x.味方 - 基[i].味方) + Math.abs(x.敵 - 基[i].敵)).sort((p, q) => p - q);
  const ms = a.map((x) => x.ms).sort((p, q) => p - q);
  const 中 = (arr) => arr[Math.floor(arr.length / 2)];
  console.log(`  ${String(d).padEnd(6)} ${String(一致).padStart(6)}/${回数}${d === 本物 ? '（基準）' : '      '}`
    + `${String(Math.round(中(差))).padStart(12)} 人 ${String(Math.round(中(ms))).padStart(14)} ミリ秒`);
}
