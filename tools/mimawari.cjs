/* 見回り ── 三つの検めを続けて回し、一枚の報せにまとめる。

   不具合を探す道具は三つあり、見ているものが違う。

     一　試験（tests/all.cjs）　　… 「こうあるべし」を先に書いて確かめる。
                                    六十八種。直したことが壊れれば、ここで止まる。
     二　巡検（tools/junken.cjs）　… 盤を自動で走らせ、毎月「あり得ぬ姿」を探す。
                                    月送りの筋だけを見る。画面には触れない。
     三　天下巡り（tools/tenka.cjs）… 本物の画面を押して遊び、倒れを拾う。
                                    出陣・合戦・在陣・委ねる問いなど、遊ぶ側の道。

   どれか一つでは足りない。試験は書いた事しか見ない。巡検は画面を見ない。
   天下巡りは踏んだ道しか見ない。三つ揃えて、はじめて網になる。

   使い方:
     node tools/mimawari.cjs          … 軽く（試験・巡検 2×8年・天下巡り 120か月）
     node tools/mimawari.cjs 重         … 重く（試験・巡検 6×25年・天下巡り 600か月）
     node tools/mimawari.cjs 巡検        … その一つだけ

   月に一度、あるいは大きな直しの前後に回すとよい。 */
const { execFileSync } = require('child_process');
const path = require('path');
const { buildHarness } = require('./bundle.cjs');

const ROOT = path.join(__dirname, '..');
const 引数 = process.argv.slice(2);
const 重い = 引数.includes('重');
const 選 = 引数.filter((x) => ['試験', '巡検', '天下巡り'].includes(x));
const やる = (名) => !選.length || 選.includes(名);

const 走らす = (名, 命, 添 = []) => {
  const t0 = Date.now();
  process.stdout.write(`\n──────── ${名}\n`);
  let 出 = '', 落ちた = false;
  try {
    出 = execFileSync(process.execPath, ['--max-old-space-size=3072', path.join(ROOT, 命), ...添],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) { 出 = (e.stdout || '') + (e.stderr || ''); 落ちた = true; }
  const 秒 = Math.round((Date.now() - t0) / 1000);
  const 末 = 出.trimEnd().split('\n');
  console.log(末.slice(-8).join('\n'));
  const 良 = !落ちた && /エラー: なし|不首尾 0 件/.test(出);
  console.log(`  （${秒}秒）`);
  return { 名, 良, 秒, 出 };
};

console.log('見回り。三つの検めを続けて回す。');
console.log('本体を束ね直しています…');
buildHarness('split');

const 結 = [];
if (やる('試験')) 結.push(走らす('一　試験（六十八種）', 'tests/all.cjs'));
if (やる('巡検')) {
  結.push(走らす(`二　巡検（盤の不変式・${重い ? '種六つ×二十五年' : '種二つ×八年'}）`,
    'tools/junken.cjs', 重い ? ['6', '25', '--sonomama'] : ['2', '8', '--sonomama']));
}
if (やる('天下巡り')) {
  結.push(走らす(`三　天下巡り（画面を押して遊ぶ・${重い ? '六百' : '百二十'}か月）`,
    'tools/tenka.cjs', [重い ? '600' : '120', '--sonomama']));
}

console.log('\n════════ 見回りの報せ');
for (const r of 結) console.log(`  ${r.良 ? '○' : '★'} ${r.名}　${r.秒}秒`);
const 悪 = 結.filter((r) => !r.良);
console.log('');
if (!悪.length) console.log('三つとも通った。いまの盤に、見える綻びはない。');
else {
  console.log(`★ ${悪.length} つで綻びが出た。上の出力を見て、次の順で当たること:`);
  console.log('   一　どの検めが背いたかを見る（試験なら名、巡検・天下巡りなら種と年月）');
  console.log('   二　その筋だけを回して再現させる（例: node tools/junken.cjs --seed N 30）');
  console.log('   三　直す前と後で同じ物差しを当てる（A/B）');
  console.log('   四　拾ったものを恒久の試験に落とす。落とすまでが仕事である');
}
console.log('');
console.log('エラー:', 悪.length ? `${悪.length}件` : 'なし');
process.exit(悪.length ? 1 : 0);
