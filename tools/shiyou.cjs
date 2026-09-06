#!/usr/bin/env node
/* ==========================================================================
   仕様書を紙の形にする（dist/センゴク盤_仕様書.pdf）

     node tools/shiyou.cjs

   中身は src/data/shiyou.js ひとつから取る。HTML を組み立て、Chrome に
   印刷させて PDF にする。外の道具は使わない。
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
fs.mkdirSync(DIST, { recursive: true });

const 口 = path.join(ROOT, 'build', 'shiyou-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(口, 'export * from "../src/data/shiyou.js";\nexport { 題字 } from "../src/data/logo.js";\n');
const 束 = path.join(ROOT, 'build', 'shiyou.cjs');
esbuild.buildSync({ entryPoints: [口], bundle: true, format: 'cjs', outfile: 束, logLevel: 'error' });
const { 題名, 章, 決めごと, 数の一覧, 題字 } = require(束);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const 表を組む = (rows) => `<table>${rows.map(([a, b]) =>
  `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</table>`;

const 節を組む = (n) => {
  const 見 = n.題 ? `<h3>${esc(n.題)}</h3>` : '';
  const 文 = n.文 ? `<p>${esc(n.文)}</p>` : '';
  const 表 = n.表 ? 表を組む(n.表) : '';
  return 見 + 文 + 表;
};

const 章を組む = (c, i) => `<section class="brk">
  <h2><span class="no">${i + 1}</span>${esc(c.題)}</h2>
  ${c.表 ? 表を組む(c.表) : ''}
  ${(c.節 || []).map(節を組む).join('\n')}
</section>`;

const 決めを組む = (d, i) => `<div class="kime">
  <b>${esc(d.題)}</b>
  <div class="ron">${esc(d.論)}</div>
  <table class="k">
    <tr><th>選択肢</th><td>${d.選.map((x) => (x === d.採
      ? `<b>${esc(x)}</b>` : `<span class="off">${esc(x)}</span>`)).join(' ／ ')}</td></tr>
    <tr><th>採った案</th><td><b>${esc(d.採)}</b></td></tr>
    <tr><th>理由</th><td>${esc(d.理)}${d.添 ? `<br><span class="soe">${esc(d.添)}</span>` : ''}</td></tr>
  </table>
</div>`;

const 目次 = [...章.map((c, i) => `<li><span class="no">${i + 1}</span>${esc(c.題)}</li>`),
  `<li><span class="no">${章.length + 1}</span>決めごとの記録</li>`,
  `<li><span class="no">${章.length + 2}</span>数の一覧</li>`].join('');

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<title>${esc(題名)}　仕様書</title>
<style>
  @page { size: A4; margin: 18mm 16mm 16mm; }
  body { font-family: "Hiragino Mincho ProN", serif; color: #26262A;
         font-size: 10.5pt; line-height: 1.95; margin: 0; }
  .cover { text-align: center; page-break-after: always; padding-top: 34mm; }
  .cover .logo { width: 108mm; height: auto; display: block; margin: 0 auto 8mm; }
  .cover .d { font-size: 10.5pt; color: #6E6A62; margin-top: 18mm; line-height: 2.1; }
  .toc { margin-top: 14mm; text-align: left; }
  .toc ul { list-style: none; padding: 0; margin: 0; column-count: 2; column-gap: 12mm; }
  .toc li { font-size: 11pt; padding: 1.4mm 0; }
  .no { display: inline-block; width: 7mm; color: #8A8478;
        font-family: sans-serif; font-size: 9pt; }
  section.brk { page-break-before: always; }
  h2 { font-size: 17pt; letter-spacing: .06em; margin: 0 0 5mm;
       padding-bottom: 2mm; border-bottom: 1.4pt solid #26262A; }
  h3 { font-size: 11.5pt; letter-spacing: .12em; color: #4A4640; margin: 6mm 0 1.5mm;
       font-family: sans-serif; font-weight: 600; }
  p { margin: 0 0 3mm; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 1mm 0 4mm; }
  th { text-align: left; width: 30%; font-weight: 600; vertical-align: top;
       padding: 1.5mm 3mm 1.5mm 0; border-bottom: .4pt solid #D8D2C4; }
  td { padding: 1.5mm 0; color: #4A4640; border-bottom: .4pt solid #D8D2C4; }
  .kime { page-break-inside: avoid; margin: 0 0 6mm; padding-left: 3mm;
          border-left: 2.4pt solid #8A6A34; }
  .kime > b { font-size: 12pt; display: block; margin-bottom: 1mm; }
  .ron { font-size: 9.5pt; color: #6E6A62; margin-bottom: 1.5mm; line-height: 1.85; }
  table.k th { width: 22%; font-size: 9.5pt; font-family: sans-serif; color: #6E6A62;
               border-bottom: none; padding: .8mm 3mm .8mm 0; }
  table.k td { font-size: 10pt; border-bottom: none; padding: .8mm 0; }
  .off { color: #A29C90; }
  .soe { color: #6E6A62; font-size: 9.5pt; }
</style></head>
<body>
  <div class="cover">
    <img class="logo" src="${'data:image/svg+xml,' + encodeURIComponent(題字)}" alt="${esc(題名)}">
    <div class="d">仕様書<br>盤の仕組みと、そう決めた理由</div>
    <div class="toc"><ul>${目次}</ul></div>
  </div>
  ${章.map(章を組む).join('\n')}
  <section class="brk">
    <h2><span class="no">${章.length + 1}</span>決めごとの記録</h2>
    <p>何を選び、なぜそれを採ったか。行き止まりだった案も残す。同じ議論を繰り返さぬための帳面である。</p>
    ${決めごと.map(決めを組む).join('\n')}
  </section>
  <section class="brk">
    <h2><span class="no">${章.length + 2}</span>数の一覧</h2>
    ${表を組む(数の一覧)}
  </section>
</body></html>`;

const htmlPath = path.join(DIST, `${題名}_仕様書.html`);
fs.writeFileSync(htmlPath, html);

const 候補 = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'google-chrome', 'chromium', 'chromium-browser',
];
const pdfPath = path.join(DIST, `${題名}_仕様書.pdf`);
let 出来た = false;
for (const bin of 候補) {
  try {
    execFileSync(bin, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer',
      `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`], { stdio: 'ignore' });
    出来た = fs.existsSync(pdfPath);
    if (出来た) break;
  } catch (e) { /* 次の候補を試す */ }
}
const 万 = (n) => Math.round(n / 1024);
console.log(`dist/${path.basename(htmlPath)}   ${万(fs.statSync(htmlPath).size)} KB  … 開いて読める形`);
if (出来た) console.log(`dist/${path.basename(pdfPath)}    ${万(fs.statSync(pdfPath).size)} KB  … 配る形`);
else console.log('（Chrome が見つからず PDF は作れなかった。HTML をブラウザで開き、印刷 → PDF に保存）');
