// 書き出したものを GitHub Pages 用の枝（gh-pages）へ送る道具。
//
//   npm run deploy
//
// なぜ枝を分けるか。
// Pages が配れるのは「枝の根」か「docs の中」だけである。dist をそのまま配れない。
// かといって根に置けば、遊ぶ物と設計図が混ざる。
// gh-pages という別の枝を立て、そこには出来上がりだけを置く。
// 設計図の枝（main）は汚れない。
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const 仮 = path.join(os.tmpdir(), 'sengoku-gh-pages');

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });

// まず書き出す（古いものを配らぬように）
require('./build.cjs');

// 使い終えた仮置きが残っていれば片づける
try { git('worktree', 'remove', '--force', 仮); } catch (e) { /* 無ければよい */ }
fs.rmSync(仮, { recursive: true, force: true });

// gh-pages の枝を仮置きに開く
git('worktree', 'add', '-B', 'gh-pages', 仮);

// 中身を入れ替える（.git は触らない）
for (const f of fs.readdirSync(仮)) {
  if (f === '.git') continue;
  fs.rmSync(path.join(仮, f), { recursive: true, force: true });
}
for (const f of fs.readdirSync(DIST)) {
  fs.copyFileSync(path.join(DIST, f), path.join(仮, f));
}
// Pages に余計な下ごしらえをさせない印
fs.writeFileSync(path.join(仮, '.nojekyll'), '');

const gitAt = (...a) => execFileSync('git', a, { cwd: 仮, encoding: 'utf8' });
gitAt('add', '-A');
try {
  gitAt('-c', 'user.name=jm', '-c', 'user.email=matsui.a.link@gmail.com',
    'commit', '-q', '-m', '遊ぶ形を新しくする');
} catch (e) {
  console.log('（変わりがないので、そのまま）');
}
gitAt('push', '-f', '-u', 'origin', 'gh-pages');

git('worktree', 'remove', '--force', 仮);
console.log('');
console.log('gh-pages の枝へ送りました。');
console.log('  https://jun19830408.github.io/SengokuProject/');
