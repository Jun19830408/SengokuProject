// 分割の前と後を突き合わせる。
// 賽の目を固定して同じ年月を走らせ、月ごとの指紋が一字一句そろうかを見る。
//
//   npm run compare        （既定は60か月）
//   npm run compare -- 120
const { execFileSync } = require('child_process');
const path = require('path');
const { buildHarness } = require('./bundle.cjs');

const 月数 = Number(process.argv[2] || 60);

const 走らせる = (which) => {
  buildHarness(which);
  return execFileSync(process.execPath,
    ['--max-old-space-size=3072', path.join(__dirname, 'fingerprint.cjs'), which, String(月数)],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
};

const fs = require('fs');
const 控え = path.join(__dirname, 'baseline.txt');
const 控えと比べる = fs.existsSync(控え) && !process.argv.includes('--orig');

// 控えを取り直す（いまの振る舞いを「これが正しい」として記録する）
if (process.argv.includes('--save')) {
  const 出 = 走らせる('split');
  fs.writeFileSync(控え, 出);
  console.log(`いまの振る舞いを ${月数}か月ぶん、tools/baseline.txt に控えました。`);
  console.log('以後 npm run compare は、この控えと見比べます。');
  process.exit(0);
}

let a, b;
if (控えと比べる) {
  console.log(`賽の目を固定し、${月数}か月を走らせて、控え（tools/baseline.txt）と見比べます。`);
  console.log('（一）控え …');
  a = fs.readFileSync(控え, 'utf8').trimEnd().split('\n');
  console.log('（二）いまの src/ …');
  b = 走らせる('split').trimEnd().split('\n');
  if (a.length !== b.length) {
    console.log(`  ※控えは${a.length}行、いまは${b.length}行。月数が違えば食い違います（npm run compare -- --save で取り直せます）。`);
  }
} else {
  console.log(`賽の目を固定し、${月数}か月を二度走らせて突き合わせます。`);
  console.log('（一）原本 sengoku-prototype_1.jsx …');
  a = 走らせる('orig').trimEnd().split('\n');
  console.log('（二）分割後 src/ …');
  b = 走らせる('split').trimEnd().split('\n');
}

let 相違 = 0;
const n = Math.max(a.length, b.length);
for (let i = 0; i < n; i++) {
  if (a[i] === b[i]) continue;
  相違++;
  if (相違 <= 5) {
    console.log(`\n★${i + 1}行目が食い違う`);
    console.log(`  原本  : ${a[i] === undefined ? '（無し）' : a[i]}`);
    console.log(`  分割後: ${b[i] === undefined ? '（無し）' : b[i]}`);
  }
}

console.log('');
if (相違 === 0) {
  console.log(`════════ 一致。${月数}か月ぶん、${a.length}行がことごとく同じでした。`);
  console.log(控えと比べる ? '         直したことで、遊びの中身は変わっていません。'
                          : '         分割によって振る舞いは変わっていません。');
} else if (控えと比べる) {
  console.log(`════════ ★${相違}行が食い違いました。`);
  console.log('         直したつもりのないところが変わっていないか、上の食い違いをご覧ください。');
  console.log('         意図した直しであれば、npm run compare -- --save で控えを取り直します。');
} else {
  console.log(`════════ ★${相違}行が食い違いました。`);
  console.log('         これは分割前の原本との比べです。仕来りを直したのちは食い違って当然です。');
  console.log('         npm run compare -- --save で、いまの振る舞いを控えに取れます。');
}
process.exit(相違 ? 1 : 0);
