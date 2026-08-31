#!/usr/bin/env node
/* ==========================================================================
   紹介資料を三つの形に落とす。

     dist/センゴク盤_紹介資料.pdf    紙で配る形（Chrome に印刷させる）
     dist/センゴク盤_紹介資料.docx   Word（手を入れて使う形）
     dist/センゴク盤_紹介資料.pptx   PowerPoint（映して話す形）

   中身はいずれも src/data/shiryo.js ひとつから取る。三つに分けて書けば、
   必ずどれかが古くなる。

     node tools/shiryo-all.cjs

   Word と PowerPoint は python で組む（python-docx / python-pptx）。
   入っていなければ、その二つは飛ばして PDF だけを作る。
   ========================================================================== */
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

const 走らす = (cmd, args) =>
  execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }).trim();

console.log(走らす('node', [path.join(__dirname, 'shiryo.cjs')]));
console.log(走らす('node', [path.join(__dirname, 'shiryo-json.cjs')]));

const 揃っているか = spawnSync('python3', ['-c', 'import docx, pptx'], { stdio: 'ignore' });
if (揃っているか.status !== 0) {
  console.log('（python-docx / python-pptx が無いので Word と PowerPoint は作らない。');
  console.log('　  python3 -m pip install python-docx python-pptx  で入る）');
  process.exit(0);
}
for (const 本 of ['shiryo_docx.py', 'shiryo_pptx.py']) {
  console.log(走らす('python3', [path.join(__dirname, 'py', 本)]));
}
