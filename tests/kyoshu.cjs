/* 天下分け目の黄の隊の去就（battle/wakemeikusa.js 黄の去就を見る）。

   説明書き（docs/天下分け目.md）には「優勢になるまで動かない」とあるのに、盤には去就を決める
   仕組みが無く、黄の隊は戦が終わるまで盤の上に立ち尽くしていた。ここで確かめること。
     一、互角のうち … 黄の隊は動かない（撃ちも撃たれもしない）
     二、優勢       … 己の側の敵の減りが、己の減りを一割より多く上回る優勢が十秒続けば、旗色を
                      定めて加わる（色が戻り、采配が動かす）
     三、忠誠       … 忠誠の薄い将は、もっと大きな優勢を待つ
     四、劣勢       … 己の側が押されていれば加わらない */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'kyoshu-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { setBattleMap } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen } from "../src/battle/corps.js";\n'
+ 'export { createBattle, stepBattle } from "../src/battle/engine.js";\n'
+ 'export { FIELD, layoutField, setFieldKind, setFieldSeed } from "../src/battle/field.js";\n'
+ 'export { 黄の去就を見る, 去就の待ち } from "../src/battle/wakemeikusa.js";\n');
const out = path.join(ROOT, 'build', 'kyoshu.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x6b1;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const 将 = (i, loyal = 50) => ({ id: `g${i}`, name: `将${i}`, lead: 60, valor: 60, wit: 55, gov: 50, retinue: 0, retTrain: 66, loyal });

/* 野に、味方（P）三隊と敵（E）三隊。味方にも敵にも黄の隊を一つずつ置く。互いに遠く離して
   槍を合わせぬようにし、減りは手で与える */
function 盤(忠 = 50) {
  A.setBattleMap(null);
  A.setFieldSeed('nagoya', 'kiyosu');
  A.setFieldKind('街道');
  A.layoutField(12000, 8);
  const cx = A.FIELD.w / 2, cy = A.FIELD.h / 2;
  const P = [0, 1, 2].map((i) => A.makeCorps('P', 将(i), 0, 2000, 70, 68, cx - 1500 + i * 400, cy + 1600, -Math.PI / 2, '#2F5D8C'));
  const E = [0, 1, 2].map((i) => A.makeCorps('E', 将(10 + i), 0, 2000, 70, 66, cx - 1500 + i * 400, cy - 1600, Math.PI / 2, '#B0483C'));
  const 黄P = A.makeCorps('P', 将(5, 忠), 0, 1500, 70, 68, cx + 1500, cy + 1600, -Math.PI / 2, '#D9A62A');
  const 黄E = A.makeCorps('E', 将(15, 忠), 0, 1500, 70, 66, cx + 1500, cy - 1600, Math.PI / 2, '#D9A62A');
  for (const [c, 色] of [[黄P, '#2F5D8C'], [黄E, '#B0483C']]) {
    c.日和見 = true; c.order = '待機'; c.seen = true; c.分け目 = { 家: 'x', 色 };
  }
  for (const c of [...P, ...E]) { c.auto = false; c.order = '待機'; }
  const b = A.createBattle([...P, 黄P], [...E, 黄E], 'P');
  b.phase = 'fight'; b.mode = 'wakeme'; b.筋書き = true; b.分け目 = { 挑: 'a', 受: 'b', 私: 'a' };
  b.進行 = A.黄の去就を見る; b.dusk = 99999; b.鼓舞なし = true;
  return { b, P, E, 黄P, 黄E };
}
const 削る = (cs, 割) => { for (const c of cs) for (const q of c.squads) q.men = Math.round(q.men * (1 - 割)); };
const 進める = (b, 秒) => { for (let t = 0; t < 秒 && b.phase === 'fight'; t += 0.05) A.stepBattle(b, 0.05); };

console.log('■ 一、互角のうち');
{
  const { b, P, E, 黄P, 黄E } = 盤();
  進める(b, 1);                        // 初めの兵を控えさせる
  削る(P, 0.1); 削る(E, 0.15);
  進める(b, 30);
  確('互角のうち（優勢が一割に満たない）は、黄の隊は旗色を定めない', 黄P.日和見 && 黄E.日和見,
    `優 ${b.分け目.優.P.toFixed(2)}`);
}

console.log('■ 二、優勢');
{
  const { b, P, E, 黄P, 黄E } = 盤();
  進める(b, 1);                        // 初めの兵を控えさせる
  削る(E, 0.25); 削る(P, 0.05);
  進める(b, 9);
  確('優勢が十秒続くまでは、まだ加わらない', 黄P.日和見, `優 ${b.分け目.優 ? b.分け目.優.P.toFixed(2) : '-'}`);
  進める(b, 12);
  確('味方の優勢が十秒続けば、味方の黄の隊は旗色を定めて加わる', !黄P.日和見 && 黄P.auto && 黄P.color === '#2F5D8C',
    `日和見 ${黄P.日和見}・色 ${黄P.color}`);
  確('押されている敵の黄の隊は加わらない', 黄E.日和見);
  確('加わったことを報せる', (b.log || []).some((x) => /旗色を定め、味方に加わった/.test(x.text)));
}

console.log('■ 三、忠誠');
{
  確('忠誠の薄い将ほど大きな優勢を待つ', A.去就の待ち({ gen: { loyal: 30 } }) > A.去就の待ち({ gen: { loyal: 60 } })
    && Math.abs(A.去就の待ち({ gen: { loyal: 80 } }) - 0.10) < 1e-9 && Math.abs(A.去就の待ち({ gen: { loyal: 10 } }) - 0.25) < 1e-9,
    `${A.去就の待ち({ gen: { loyal: 80 } }).toFixed(3)}・${A.去就の待ち({ gen: { loyal: 45 } }).toFixed(3)}・${A.去就の待ち({ gen: { loyal: 10 } }).toFixed(3)}`);
  const { b, P, E, 黄P } = 盤(20);
  進める(b, 1);
  削る(E, 0.20); 削る(P, 0.05);           // 優勢は一割五分（忠誠二十の将は二割五分を待つ）
  進める(b, 25);
  確('忠誠二十の将は、一割五分の優勢では加わらない', 黄P.日和見, `優 ${b.分け目.優.P.toFixed(2)}`);
}

console.log('■ 四、劣勢');
{
  const { b, P, E, 黄P, 黄E } = 盤();
  進める(b, 1);
  削る(P, 0.3);
  進める(b, 25);
  確('己の側が押されていれば、黄の隊は加わらない', 黄P.日和見);
  確('押している側の黄の隊は加わる', !黄E.日和見 && 黄E.color === '#B0483C');
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
