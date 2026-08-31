#!/usr/bin/env node
/* ==========================================================================
   紹介資料を紙の形にする（dist/センゴク盤_紹介資料.pdf / .html）

   中身は src/data/shiryo.js ひとつから取る。Word も PowerPoint も同じ表から
   作るので、三つのどれかだけが古くなることはない。

   HTML を組み立て、Chrome に印刷させて PDF にする。外の道具は使わない。
   Chrome が無い環境では HTML だけを残す。

     node tools/shiryo.cjs
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
fs.mkdirSync(DIST, { recursive: true });

// 資料の表を読む（ES モジュールなので、いったん束ねてから取り込む）
const 口 = path.join(ROOT, 'build', 'shiryo-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(口,
  'export { 資料, 題名, 副題, 資料名, 添え書き } from "../src/data/shiryo.js";\n');
const 束 = path.join(ROOT, 'build', 'shiryo.cjs');
esbuild.buildSync({ entryPoints: [口], bundle: true, format: 'cjs', outfile: 束, logLevel: 'error' });
const { 資料, 題名, 副題, 資料名, 添え書き } = require(束);

const 題字 = fs.readFileSync(
  path.join(ROOT, 'src', 'assets', 'logo', 'sengokuban-title.svg'), 'utf8')
  .replace(/\n\s*/g, ' ').trim();
const 印 = fs.readFileSync(
  path.join(ROOT, 'src', 'assets', 'logo', 'sengokuban-mark.svg'), 'utf8')
  .replace(/\n\s*/g, ' ').trim();

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* 絵は data URI で埋め込む。紙に落とすとき、外のファイルを見に行かせない。 */
const 絵の道 = (key) => path.join(DIST, 'tebiki', '大', `${key}.jpg`);
const 絵を組む = (s) => {
  if (!s.絵) return '';
  const f = 絵の道(s.絵);
  if (!fs.existsSync(f)) return '';
  const b64 = fs.readFileSync(f).toString('base64');
  return `<figure><img src="data:image/jpeg;base64,${b64}">`
    + (s.絵の説 ? `<figcaption>${esc(s.絵の説)}</figcaption>` : '') + '</figure>';
};

const 図の道 = (key) => path.join(DIST, 'tebiki', 'zu', `${key}.jpg`);
const 図を組む = (s) => {
  if (!(s.図 || []).length) return '';
  const 行 = s.図.map(([key, 名, 説]) => {
    const f = 図の道(key);
    const 絵 = fs.existsSync(f)
      ? `<img src="data:image/jpeg;base64,${fs.readFileSync(f).toString('base64')}">` : '';
    return `<div class="zu"><div class="zu-e">${絵}</div>`
      + `<div class="zu-t"><b>${esc(名)}</b><span>${esc(説)}</span></div></div>`;
  }).join('');
  return `<div class="zukan">${行}</div>`;
};

/* 表。欄の数は表ごとに違うので、頭の数に合わせて組む。 */
const 表を組む = (t) => {
  if (!t || !(t.行 || []).length) return '';
  const 頭 = (t.頭 || []).some((x) => x)
    ? `<thead><tr>${t.頭.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>` : '';
  const 体 = t.行.map((r) =>
    `<tr>${r.map((c, i) => (i === 0 ? `<th class="k">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`
  ).join('');
  return `<table class="g${t.行[0].length}">${頭}<tbody>${体}</tbody></table>`;
};

/* 数の並び。名・値・添えの三つ組で、値だけを大きく見せる。 */
const 数を組む = (k) => {
  if (!(k || []).length) return '';
  return '<div class="kazu">' + k.map(([名, 値, 添]) =>
    `<div class="k1"><span class="kn">${esc(名)}</span>`
    + `<span class="kv">${esc(値)}</span>`
    + (添 ? `<span class="ka">${esc(添)}</span>` : '') + '</div>').join('') + '</div>';
};

const 節を組む = (s) => {
  const out = [];
  if (s.見出し) out.push(`<h3>${esc(s.見出し)}</h3>`);
  out.push(絵を組む(s));
  for (const t of s.文 || []) out.push(`<p>${esc(t)}</p>`);
  out.push(表を組む(s.表));
  out.push(数を組む(s.数));
  out.push(図を組む(s));
  if ((s.箇条 || []).length) {
    out.push('<ul>' + s.箇条.map((t) => `<li>${esc(t)}</li>`).join('') + '</ul>');
  }
  return out.filter(Boolean).join('\n');
};

const 章を組む = (c, i) => `
<section${i ? ' class="brk"' : ''}>
  <h2><span class="no">${i + 1}</span>${esc(c.題)}${c.副 ? `<span class="sub">${esc(c.副)}</span>` : ''}</h2>
  ${c.節.map(節を組む).join('\n')}
</section>`;

const 目次 = 資料.map((c, i) =>
  `<li><span class="no">${i + 1}</span>${esc(c.題)}${c.副 ? `<i>${esc(c.副)}</i>` : ''}</li>`).join('');

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>${esc(題名)}　${esc(資料名)}</title>
<link rel="icon" type="image/svg+xml" href="${'data:image/svg+xml,' + encodeURIComponent(印)}">
<style>
  @page { size: A4; margin: 18mm 16mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Hiragino Mincho ProN", "Yu Mincho", serif;
         color: #26262A; font-size: 10.5pt; line-height: 1.95; }
  .cover { height: 232mm; display: flex; flex-direction: column;
           align-items: center; justify-content: center; text-align: center;
           page-break-after: always; }
  .cover .logo { width: 122mm; height: auto; display: block; margin: 0 auto 4mm; }
  .cover .d { font-size: 12pt; letter-spacing: .3em; color: #26262A; margin-top: 16mm; }
  .cover .e { font-size: 10pt; color: #6E6A62; margin-top: 4mm; letter-spacing: .1em; }
  .toc { margin-top: 18mm; text-align: left; }
  .toc ul { list-style: none; padding: 0; margin: 0; column-count: 2; column-gap: 12mm; }
  .toc li { font-size: 10.5pt; padding: 1.4mm 0; }
  .toc i { font-style: normal; color: #8A8478; font-size: 9pt; margin-left: 2.5mm; }
  .no { display: inline-block; width: 7mm; color: #8A8478; font-family: sans-serif; font-size: 9pt; }
  section.brk { page-break-before: always; }
  h2 { font-size: 17pt; letter-spacing: .06em; margin: 0 0 5mm;
       padding-bottom: 2mm; border-bottom: 1.4pt solid #26262A; }
  h2 .sub { font-size: 10pt; letter-spacing: .16em; color: #8A8478;
            font-family: sans-serif; font-weight: 400; margin-left: 4mm; }
  h3 { font-size: 11.5pt; letter-spacing: .12em; color: #4A4640; margin: 7mm 0 2mm;
       font-family: sans-serif; font-weight: 600; page-break-after: avoid; }
  p { margin: 0 0 3mm; text-align: justify; }
  ul { margin: 1mm 0 3mm; padding-left: 5mm; }
  li { margin: 0.6mm 0; }
  table { width: 100%; border-collapse: collapse; margin: 1mm 0 4mm;
          page-break-inside: avoid; font-size: 9.8pt; }
  thead th { font-family: sans-serif; font-size: 8.6pt; letter-spacing: .1em;
             color: #6E6A62; font-weight: 600; border-bottom: .9pt solid #26262A;
             padding: 0 3mm 1.2mm 0; text-align: left; }
  th.k { text-align: left; font-weight: 600; vertical-align: top; white-space: nowrap;
         padding: 1.6mm 3mm 1.6mm 0; border-bottom: .4pt solid #D8D2C4; }
  td { padding: 1.6mm 3mm 1.6mm 0; color: #4A4640; vertical-align: top;
       border-bottom: .4pt solid #D8D2C4; }
  td:last-child { padding-right: 0; }
  table.g2 th.k { width: 32%; white-space: normal; }
  table.g3 th.k { width: 22%; }
  table.g4 th.k { width: 20%; }
  table.g5 th.k { width: 16%; }
  .kazu { display: flex; flex-wrap: wrap; gap: 0; margin: 2mm 0 4mm;
          border-top: .9pt solid #26262A; page-break-inside: avoid; }
  .k1 { width: 50%; padding: 2mm 4mm 2mm 0; border-bottom: .4pt solid #D8D2C4; }
  .kn { display: block; font-family: sans-serif; font-size: 8.4pt;
        letter-spacing: .12em; color: #8A8478; }
  .kv { display: block; font-size: 15pt; line-height: 1.3; }
  .ka { display: block; font-size: 8.8pt; color: #6E6A62; line-height: 1.6; }
  figure { margin: 2mm 0 4mm; page-break-inside: avoid; }
  figure img { width: 100%; border: .5pt solid #C8C2B4; display: block; }
  figcaption { font-size: 8.5pt; color: #6E6A62; margin-top: 1.2mm; line-height: 1.7; }
  .zukan { margin: 2mm 0 4mm; }
  .zu { display: flex; gap: 4mm; align-items: flex-start; margin-bottom: 2.5mm;
        page-break-inside: avoid; }
  .zu-e { flex: 0 0 26mm; }
  .zu-e img { width: 26mm; border: .5pt solid #C8C2B4; display: block; }
  .zu-t { flex: 1; }
  .zu-t b { display: block; font-size: 11.5pt; margin-bottom: 1mm; }
  .zu-t span { font-size: 9.5pt; color: #4A4640; line-height: 1.85; }
</style></head>
<body>
  <div class="cover">
    <img class="logo" src="${'data:image/svg+xml,' + encodeURIComponent(題字)}" alt="${esc(題名)}">
    <div class="d">${esc(資料名)}</div>
    <div class="e">${esc(添え書き)}</div>
    <div class="toc"><ul>${目次}</ul></div>
  </div>
  ${資料.map(章を組む).join('\n')}
</body></html>`;

const htmlPath = path.join(DIST, `${題名}_${資料名}.html`);
fs.writeFileSync(htmlPath, html);

const 候補 = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
];
const chrome = 候補.find((p) => fs.existsSync(p));
const pdfPath = path.join(DIST, `${題名}_${資料名}.pdf`);
const KB = (p) => `${Math.round(fs.statSync(p).size / 1024)} KB`;
if (chrome) {
  execFileSync(chrome, ['--headless', '--disable-gpu', '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`, '--virtual-time-budget=20000',
    `file://${encodeURI(htmlPath)}`], { stdio: 'ignore' });
  console.log(`dist/${path.basename(htmlPath)}   ${KB(htmlPath)}  … 開いて読める形`);
  console.log(`dist/${path.basename(pdfPath)}    ${KB(pdfPath)}  … 配る形`);
} else {
  console.log(`dist/${path.basename(htmlPath)}   ${KB(htmlPath)}`);
  console.log('（Chrome が見つからず PDF は作れなかった。HTML をブラウザで開き、印刷から PDF に保存できる）');
}
