/* 試作版を一枚にする。node tools/shisaku.cjs <出す先> [版]

   遊ぶ側の申し出は「本編には入れずに、sengokuproject.netlify.app に試作版として
   置けないか」であった。本編と同じ住所（オリジン）に置くので、ブラウザの記憶
   （localStorage）も大きな蔵（IndexedDB）も本編と同じ所を指してしまう。試作版が
   新しい形で記録を書けば、本編の記録を壊しかねない。

   そこで、頁の頭に小さな仕掛けを差し込んで、記録の置き場を本編から分ける。
     ・ブラウザの記憶の鍵 sengoku… → shisaku:sengoku…
     ・大きな蔵の名 sengoku → sengoku-shisaku
   ゲームの中身には手を入れない。右上に「試作版」の札を出す。

   郡の導入は大きな変更なので、いまの試作版とも分けて試したい、というのが遊ぶ側の
   申し出であった。版に shisaku2 を渡せば第二試作版を作る。記録の置き場は本編とも
   試作版とも分ける（鍵 shisaku2:sengoku…、蔵 sengoku-shisaku2）。札の色も変える。 */
const fs = require('fs');
const path = require('path');
const 元 = path.join(__dirname, '..', 'dist', 'index.html');
const 先 = process.argv[2];
const 版 = process.argv[3] || 'shisaku';
if (!先) { console.error('出す先を渡してください'); process.exit(1); }
const 版の形 = {
  shisaku: { 名: '試作版', 札: '試作版（記録は本編と別）', 色: 'rgba(160,40,30,.88)' },
  shisaku2: { 名: '第二試作版', 札: '第二試作版（記録は本編・試作版と別）', 色: 'rgba(40,70,140,.88)' },
}[版];
if (!版の形) { console.error(`版は shisaku か shisaku2 です（${版}）`); process.exit(1); }
const 分ける = `<script>(function(){try{
var P="${版}:",S=Storage.prototype,g=S.getItem,s=S.setItem,r=S.removeItem;
var m=function(x){x=String(x);return x.indexOf("sengoku")===0?P+x:x;};
S.getItem=function(x){return g.call(this,m(x));};
S.setItem=function(x,v){return s.call(this,m(x),v);};
S.removeItem=function(x){return r.call(this,m(x));};
if(window.IDBFactory){var F=IDBFactory.prototype,o=F.open,d=F.deleteDatabase,n=function(x){return x==="sengoku"?"sengoku-${版}":x;};
F.open=function(x,v){return v===undefined?o.call(this,n(x)):o.call(this,n(x),v);};
F.deleteDatabase=function(x){return d.call(this,n(x));};}
}catch(e){}})();</script>`;
const 札 = `<div style="position:fixed;top:4px;right:6px;z-index:2147483647;background:${版の形.色};color:#fff;font:600 12px sans-serif;padding:2px 8px;border-radius:4px;pointer-events:none">${版の形.札}</div>`;
let html = fs.readFileSync(元, 'utf8');
if (!/<head[^>]*>/.test(html) || !/<body[^>]*>/.test(html)) { console.error('頁の形が想定と違う'); process.exit(1); }
html = html.replace(/<head[^>]*>/, (m) => m + 分ける).replace(/<body[^>]*>/, (m) => m + 札);
html = html.replace(/<title>([^<]*)<\/title>/, `<title>$1（${版の形.名}）</title>`);
fs.mkdirSync(path.dirname(先), { recursive: true });
fs.writeFileSync(先, html);
console.log(`${先}　${Math.round(html.length / 1024)} KB`);
