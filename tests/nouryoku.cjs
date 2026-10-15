/* 能力の幅（GDD 6.1）。

   統率・武勇・知略・政務とも、平均六十六ほど・ばらつき七から八しかなく、八割の者が
   五十六から七十八の間に収まっていた。遊ぶ側の申し出は「能力にそれほど差がない。
   上杉謙信は武勇百・統率九十九のように、しっかり違いが出るように」であった。
   並びと中ほどの値を変えずに、上と下へ引き伸ばした（core/util.js 能力を広げる）。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'nouryoku-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { 能力を広げる, 能力の欄 } from "../src/core/util.js";\n'
+ 'export { initState, migrateSave } from "../src/core/state.js";\n'
+ 'export { GENERALS } from "../src/data/generals.js";\n'
+ 'export { NEWCOMERS } from "../src/data/newcomers.js";\n');
const out = path.join(ROOT, 'build', 'nouryoku.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

const 帳 = [...A.GENERALS, ...A.NEWCOMERS];
const 名 = { lead: '統率', valor: '武勇', wit: '知略', gov: '政務' };

console.log('── 一　武将帳の値の散らばり');
for (const k of A.能力の欄) {
  const v = 帳.map((g) => g[k]);
  const n = v.length, 平 = v.reduce((a, b) => a + b, 0) / n;
  const 偏 = Math.sqrt(v.reduce((a, b) => a + (b - 平) ** 2, 0) / n);
  確(`${名[k]}のばらつきが十二を越える`, 偏 > 12, `平均${平.toFixed(1)}・ばらつき${偏.toFixed(1)}`);
  確(`${名[k]}の最上は百、最下は二十五`, Math.max(...v) === 100 && Math.min(...v) === 25,
    `${Math.min(...v)}〜${Math.max(...v)}`);
  確(`${名[k]}は百を越えず、整数である`, v.every((x) => Number.isInteger(x) && x >= 5 && x <= 100));
}

console.log('\n── 二　名高い者');
{
  const 者 = (n) => 帳.find((g) => g.name === n);
  const 謙 = 者('長尾景虎');
  確('上杉謙信（長尾景虎）は統率百・武勇百', 謙.lead === 100 && 謙.valor === 100, `統${謙.lead} 武${謙.valor}`);
  const 忠 = 者('本多忠勝');
  確('本多忠勝は武勇百', 忠.valor === 100, `武${忠.valor}`);
  const 元 = 者('毛利元就');
  確('毛利元就は知略百', 元.wit === 100, `知${元.wit}`);
  const 氏 = 者('今川氏真');
  確('今川氏真は統率・武勇とも四十に届かない', 氏.lead < 40 && 氏.valor < 40, `統${氏.lead} 武${氏.valor}`);
}

console.log('\n── 三　写しは並びを変えない');
for (const k of A.能力の欄) {
  let 崩れ = 0;
  for (let v = 30; v < 100; v++) if (A.能力を広げる(v + 1, k) < A.能力を広げる(v, k)) 崩れ++;
  確(`${名[k]}の写しは単調に増える`, 崩れ === 0);
}

console.log('\n── 四　古い記録は一度だけ写す');
{
  const s = A.initState('oda');
  確('新しい盤には印がある（二度写さない）', s.能力を広げた === true);
  const 前 = s.generals.find((g) => g.id === 'kagetora').lead;
  A.migrateSave(s);
  確('印のある盤は読み直しても値が変わらない', s.generals.find((g) => g.id === 'kagetora').lead === 前);
  // 印の無い古い記録（狭い尺度）
  const 古 = A.initState('oda');
  delete 古.能力を広げた;
  const g = 古.generals.find((x) => x.id === 'kagetora');
  g.lead = 97; g.valor = 88; g.wit = 86; g.gov = 80;
  const h = 古.generals.find((x) => !x.lord && x.faction === 'oda');
  h.lead = 60; h.valor = 60; h.wit = 58; h.gov = 56;
  A.migrateSave(古);
  確('古い記録は広い尺度へ写る（謙信の武勇は武将帳の改めに合わせる）', g.lead === 100 && g.valor === 100, `謙信 統${g.lead} 武${g.valor}`);
  確('並の者は並に、低い者は下へ', h.lead === 47 && h.wit === 47, `統${h.lead} 知${h.wit}`);
  const 二度 = g.lead;
  A.migrateSave(古);
  確('二度読んでも写し直さない', g.lead === 二度 && 古.能力を広げた === true);
}

console.log(`\nエラー: ${咎.length ? 咎.join(' | ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
