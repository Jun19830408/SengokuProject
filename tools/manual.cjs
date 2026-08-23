#!/usr/bin/env node
/* ==========================================================================
   説明書を紙の形にする（dist/センゴク盤_説明書.pdf）

   中身は src/data/manual.js ひとつから取る。画面の中の「遊び方」と同じ表である。
   二つに分けて書くと、片方だけが古くなる。

   HTML を組み立て、Chrome に印刷させて PDF にする。外の道具は使わない。
   Chrome が無い環境では HTML だけを残す（それでも開いて読めるし、
   ブラウザから「印刷 → PDF に保存」もできる）。

     node tools/manual.cjs
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
fs.mkdirSync(DIST, { recursive: true });

// 説明書の表を読む（ES モジュールなので、いったん束ねてから取り込む）
const 口 = path.join(ROOT, 'build', 'manual-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(口, 'export { 説明書, 題名, 副題 } from "../src/data/manual.js";\n');
const 束 = path.join(ROOT, 'build', 'manual.cjs');
esbuild.buildSync({ entryPoints: [口], bundle: true, format: 'cjs', outfile: 束, logLevel: 'error' });
const { 説明書, 題名, 副題 } = require(束);

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* 絵は data URI で埋め込む。紙に落とすとき、外のファイルを見に行かせない。
   絵が無ければ、その節は字だけで出る。 */
const 絵の道 = (key) => path.join(DIST, 'tebiki', '大', `${key}.jpg`);
const 絵を組む = (s) => {
  if (!s.絵) return '';
  const f = 絵の道(s.絵);
  if (!fs.existsSync(f)) return '';
  const b64 = fs.readFileSync(f).toString('base64');
  return `<figure><img src="data:image/jpeg;base64,${b64}">`
    + (s.絵の説 ? `<figcaption>${esc(s.絵の説)}</figcaption>` : '') + '</figure>';
};

const 節を組む = (s) => {
  const out = [];
  if (s.見出し) out.push(`<h3>${esc(s.見出し)}</h3>`);
  out.push(絵を組む(s));
  for (const t of s.文 || []) out.push(`<p>${esc(t)}</p>`);
  if ((s.表 || []).length) {
    out.push('<table>' + s.表.map(([a, b]) =>
      `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join('') + '</table>');
  }
  if ((s.箇条 || []).length) {
    out.push('<ul>' + s.箇条.map((t) => `<li>${esc(t)}</li>`).join('') + '</ul>');
  }
  return out.join('\n');
};

const 章を組む = (c, i) => `
<section${i ? ' class="brk"' : ''}>
  <h2><span class="no">${i + 1}</span>${esc(c.題)}</h2>
  ${c.節.map(節を組む).join('\n')}
</section>`;

const 目次 = 説明書.map((c, i) => `<li><span class="no">${i + 1}</span>${esc(c.題)}</li>`).join('');

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>${esc(題名)}　説明書</title>
<style>
  @page { size: A4; margin: 18mm 16mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Hiragino Mincho ProN", "Yu Mincho", serif;
         color: #26262A; font-size: 10.5pt; line-height: 1.95; }
  .cover { height: 232mm; display: flex; flex-direction: column;
           align-items: center; justify-content: center; text-align: center;
           page-break-after: always; }
  .cover .t { font-size: 40pt; letter-spacing: .10em; }
  .cover .s { font-size: 10pt; letter-spacing: .42em; color: #6E6A62; margin-top: 8mm; }
  .cover .d { font-size: 10.5pt; color: #6E6A62; margin-top: 22mm; line-height: 2.1; }
  .toc { margin-top: 16mm; text-align: left; }
  .toc ul { list-style: none; padding: 0; margin: 0; column-count: 2; column-gap: 12mm; }
  .toc li { font-size: 11pt; padding: 1.5mm 0; }
  .no { display: inline-block; width: 7mm; color: #8A8478; font-family: sans-serif; font-size: 9pt; }
  section.brk { page-break-before: always; }
  h2 { font-size: 17pt; letter-spacing: .06em; margin: 0 0 5mm;
       padding-bottom: 2mm; border-bottom: 1.4pt solid #26262A; }
  h3 { font-size: 11.5pt; letter-spacing: .12em; color: #4A4640; margin: 7mm 0 2mm;
       font-family: sans-serif; font-weight: 600; }
  p { margin: 0 0 3mm; text-align: justify; }
  ul { margin: 1mm 0 3mm; padding-left: 5mm; }
  li { margin: 0.6mm 0; }
  table { width: 100%; border-collapse: collapse; margin: 1mm 0 4mm; }
  th { text-align: left; width: 34%; font-weight: 600; vertical-align: top;
       padding: 1.6mm 3mm 1.6mm 0; border-bottom: .4pt solid #D8D2C4; }
  td { padding: 1.6mm 0; color: #4A4640; border-bottom: .4pt solid #D8D2C4; }
  figure { margin: 2mm 0 4mm; page-break-inside: avoid; }
  figure img { width: 100%; border: .5pt solid #C8C2B4; display: block; }
  figcaption { font-size: 8.5pt; color: #6E6A62; margin-top: 1.2mm; line-height: 1.7; }
</style></head>
<body>
  <div class="cover">
    <div class="t">${esc(題名)}</div>
    <div class="s">${esc(副題)}</div>
    <div class="d">説明書<br>天文十五年（一五四六）</div>
    <div class="toc"><ul>${目次}</ul></div>
  </div>
  ${説明書.map(章を組む).join('\n')}
</body></html>`;

const htmlPath = path.join(DIST, `${題名}_説明書.html`);
fs.writeFileSync(htmlPath, html);

const 候補 = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'google-chrome', 'chromium', 'chromium-browser',
];
const pdfPath = path.join(DIST, `${題名}_説明書.pdf`);
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
console.log(`dist/${path.basename(htmlPath)}   ${万(Buffer.byteLength(html))} KB  … 開いて読める形`);
if (出来た) console.log(`dist/${path.basename(pdfPath)}    ${万(fs.statSync(pdfPath).size)} KB  … 配る形`);
else console.log('（Chrome が見つからず PDF は作れなかった。HTML をブラウザで開き、印刷から PDF に保存できる）');
