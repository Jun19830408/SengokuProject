// 折を一つに束ね直して書き出す道具。書き出し先は二つ。
//
//   dist/戦国.html              … これ一つを開けば遊べる。他のファイルは要らない
//   dist/sengoku-artifact.jsx   … いままで通り Artifacts に貼る形
//
//   npm run build
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
fs.mkdirSync(DIST, { recursive: true });

/* ------------------------------------------------ 一、ブラウザで開く形 */
// React ごと一つに束ねる。外から何も読みに行かないので、file:// で開いても動く。
const 束 = esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'browser-entry.jsx')],
  bundle: true, format: 'iife', write: false, minify: true,
  loader: { '.jsx': 'jsx' },
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'error',
}).outputFiles[0].text;

// <script> の中に置くので、閉じ札に見える並びだけは逃がす
const 中身 = 束.replace(/<\/script/gi, '<\\/script');

/* 書き出した日時。題名の画面に出して、置き場のものが古いままかを見分ける。

   必ず日本時間で刻む。手元では日本時間、Netlify の組み立て機では UTC、と
   ばらばらに刻んでいたため、配られたものが九時間古く見えた。
   「21時に送ったのに 12:00 と出る」では、新しいかどうかを判じられない。

   併せて、どの記録（commit）から作られたかも残す。
   Netlify は COMMIT_REF に入れてくれる。手元では git に尋ねる。 */
const 刻印 = (() => {
  const z = (n) => String(n).padStart(2, '0');
  const d = new Date(Date.now() + 9 * 3600 * 1000);      // UTC＋九時間＝日本時間
  const 時 = `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}`
    + ` ${z(d.getUTCHours())}:${z(d.getUTCMinutes())} JST`;
  let 印 = process.env.COMMIT_REF || '';
  if (!印) {
    try {
      印 = require('child_process')
        .execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch (e) { 印 = ''; }
  }
  return 印 ? `${時}　${印.slice(0, 7)}` : 時;
})();

/* ロゴ。栞の絵に使う。src/assets/logo から直に読む（生成した src/data/logo.js は
   遊びの中で使うためのもので、こちらは組み立ての側で要る）。 */
const ロゴ = (name) => fs.readFileSync(
  path.join(ROOT, 'src', 'assets', 'logo', name), 'utf8').replace(/\n\s*/g, ' ').trim();
const 印 = ロゴ('sengokuban-mark.svg');
const 印章 = ロゴ('sengokuban-seal.svg');

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<title>センゴク盤</title>
<!-- 「ホーム画面に追加」で、住所欄のない一枚の画面として開くための断り -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="センゴク盤">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#F4F1E8">
<!-- 印（GDD 1.1）。栞や見出しの脇に出る小さな絵である。
     小さく使うので、字なしの「印」のほうを充てる（字は潰れるため）。
     ホーム画面に置いたときの大きな絵には、字ありの「印章」を使う。 -->
<link rel="icon" type="image/svg+xml" href="${'data:image/svg+xml,' + encodeURIComponent(印)}">
<link rel="apple-touch-icon" href="${'data:image/svg+xml,' + encodeURIComponent(印章)}">
<!-- 石高や兵数を電話番号と見なして繋いでしまうのを止める -->
<meta name="format-detection" content="telephone=no">
<style>
  html,body{height:100%;margin:0;padding:0;background:#F4F1E8;overscroll-behavior:none}
  #root{height:100%}
  /* 記録はこのブラウザに残る。ファイルを気にする必要はない。 */
</style>
</head>
<body>
<div id="root"></div>
<!-- 書き出した日時。題名の画面の左下に出る。
     ネットに置いたものが古いままか、上げ直したものかを見分けるための一行である。 -->
<script>window.__BUILD__=${JSON.stringify(刻印)};</script>
<script>
// あまりに古いブラウザでは動かぬ。真っ白な画面で戸惑わぬよう、断りを出す。
if (typeof structuredClone !== "function") {
  document.getElementById("root").innerHTML =
    '<div style="padding:40px;font-family:sans-serif;line-height:2">'
    + '<div style="font-size:20px">このブラウザでは動きませぬ。</div>'
    + '<div style="color:#7C7668">Chrome・Edge・Safari・Firefox の、'
    + '2022年以降の版でお開きください。</div></div>';
}
</script>
<script>${中身}</script>
</body>
</html>
`;
const htmlPath = path.join(DIST, '戦国.html');
fs.writeFileSync(htmlPath, html);

/* 同じものを index.html としても置く。

   置き場（Netlify・GitHub Pages など）に上げたとき、住所の末尾に何も付けずに
   開けるのは index.html だけである。「戦国.html」は仮名を含むので、
   住所に直すと %E6%88%A6%E5%9B%BD.html という長い綴りになり、人には扱えない。

   中身は一字一句同じものなので、どちらを開いても同じである。
   ただし記録（セーブ）は住所ごとに分かれる。同じ置き場では index.html のほうで
   遊ぶと決めておくのが安全である。 */
fs.writeFileSync(path.join(DIST, 'index.html'), html);

/* ---------------------------------------------- 二、Artifacts に貼る形 */
// React だけは外に置く（Artifacts 側が持っているため）。
const 貼る形 = esbuild.buildSync({
  entryPoints: [path.join(ROOT, 'src/index.jsx')],
  bundle: true, format: 'esm', write: false, minify: false,
  loader: { '.jsx': 'jsx' },
  external: ['react', 'react-dom', 'react-dom/client'],
  logLevel: 'error',
}).outputFiles[0].text;

const 前書き = `// センゴク盤 ─ Artifacts に貼る形
// これは src/ の折を一つに束ね直したものである。直すときは src/ のほうを直し、
// npm run build で作り直すこと。この書き出しを直に編めば、次の書き出しで消える。
`;
const jsxPath = path.join(DIST, 'sengoku-artifact.jsx');
fs.writeFileSync(jsxPath, 前書き + 貼る形);

const 万 = (n) => (n / 1024).toFixed(0);
console.log(`dist/戦国.html              ${万(Buffer.byteLength(html))} KB  … 開けば遊べる`);
console.log(`dist/index.html             ${万(Buffer.byteLength(html))} KB  … 同じもの。ネットに置くならこちら`);
console.log(`dist/sengoku-artifact.jsx   ${万(Buffer.byteLength(前書き + 貼る形))} KB  … Artifacts に貼る`);

/* 説明書も一緒に作り直す。遊びの中の「遊び方」と同じ表から作るので、
   直したときに紙のほうだけが古くなることがない。 */
try { require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'manual.cjs')], { stdio: 'inherit' }); }
catch (e) { console.log('（説明書は作れなかった：' + e.message.slice(0, 60) + '）'); }
