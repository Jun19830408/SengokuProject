#!/usr/bin/env node
/* 政務の地図で、道具立て・小図・帯が重なっていないかを測る（GDD 15.1）。 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { CHROME, ROOT, 頁を組む } = require('./ban.cjs');
const TMP = path.join(ROOT, 'build', 'kasanari');
fs.mkdirSync(TMP, { recursive: true });

const 検分 = `
(async () => {
  const 眠 = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const 釦 = (t) => [...document.querySelectorAll('button,.mbtn,.btn')]
    .filter((b) => !b.disabled && b.offsetParent !== null)
    .find((b) => (b.textContent || '').includes(t));
  const 押 = async (t) => { for (let i = 0; i < 40; i++) { const el = 釦(t); if (el) { el.click(); await 眠(0.25); return true; } await 眠(0.2); } return false; };
  const 報 = { 幅: document.documentElement.clientWidth, 高: document.documentElement.clientHeight, 咎: [], 釦: [] };
  try {
    await 眠(0.9);
    await 押('続きから'); await 眠(1.6);
    const 枠 = (el) => { const r = el.getBoundingClientRect(); return { 左: Math.round(r.left), 上: Math.round(r.top), 右: Math.round(r.right), 下: Math.round(r.bottom) }; };
    const 重 = (a, b) => a && b && a.左 < b.右 && b.左 < a.右 && a.上 < b.下 && b.上 < a.下;
    const 盤 = document.querySelector('.mapwrap');
    報.盤 = 盤 ? 枠(盤) : null;
    報.盤の丈 = 報.盤 ? 報.盤.下 - 報.盤.上 : 0;
    const mini = document.querySelector('.mini');
    報.小図 = mini ? 枠(mini) : null;
    /* 道具立ての釦を一つずつ検める。小図と重なっていないか、盤に収まっているか、押せるか。 */
    for (const el of document.querySelectorAll('.mapctl .mbtn')) {
      const 名 = (el.textContent || '').replace(/[＋−◎⛶⤢▤⚐璽⚔⚑☗◇◈？]/g, '').trim();
      const r = 枠(el);
      const 中 = document.elementFromPoint((r.左 + r.右) / 2, (r.上 + r.下) / 2);
      const 届 = !!中 && (el.contains(中) || 中 === el || (中.closest && 中.closest('.mbtn') === el));
      const 収 = !!報.盤 && r.上 >= 報.盤.上 - 1 && r.下 <= 報.盤.下 + 1;
      const 小図と重なる = 重(r, 報.小図);
      報.釦.push({ 名, 上: r.上, 下: r.下, 届, 収, 小図と重なる });
      if (!収) 報.咎.push('釦「' + 名 + '」が盤からはみ出す（下' + r.下 + ' 対 ' + (報.盤 ? 報.盤.下 : '?') + '）');
      if (!届) 報.咎.push('釦「' + 名 + '」は押しても届かぬ（上に ' + (中 ? (中.className || 中.tagName) : '無し') + '）');
      if (小図と重なる) 報.咎.push('釦「' + 名 + '」が日本全土の小図と重なる');
    }
    if (報.盤 && 報.盤の丈 < 報.高 * 0.45) 報.咎.push('盤が狭すぎる（丈 ' + 報.盤の丈 + ' ／ 画面 ' + 報.高 + '）');
  } catch (e) { 報.咎.push('検分そのものが転んだ：' + (e && e.message)); }
  parent.postMessage({ 検分: 報 }, '*');
})();
`;

function 測る(幅, 高) {
  const 中 = 頁を組む('素') + '<script>' + 検分 + '</script>';
  fs.writeFileSync(path.join(TMP, `naka-${幅}x${高}.html`), 中);
  const 親 = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#888}
iframe{width:${幅}px;height:${高}px;border:0;display:block}</style>
<iframe src="naka-${幅}x${高}.html"></iframe>
<script>
addEventListener('message', (e) => { if (!e.data || !e.data.検分) return;
  const pre = document.createElement('pre'); pre.id='shirase'; pre.textContent = JSON.stringify(e.data.検分);
  document.body.appendChild(pre); document.title='DONE'; });
setTimeout(() => { if (document.title !== 'DONE') { const pre=document.createElement('pre'); pre.id='shirase';
  pre.textContent = JSON.stringify({ 幅:${幅}, 咎:['検分が返らぬ（間に合わず）'], 釦:[] }); document.body.appendChild(pre); document.title='DONE'; } }, 40000);
</script>`;
  const 親の道 = path.join(TMP, `oya-${幅}x${高}.html`);
  fs.writeFileSync(親の道, 親);
  const out = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox',
    `--window-size=${Math.max(520, 幅 + 40)},${高 + 60}`, '--virtual-time-budget=46000',
    '--dump-dom', 'file://' + 親の道], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const m = out.match(/<pre id="shirase">([\s\S]*?)<\/pre>/);
  return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')) : { 咎: ['報せが取れぬ'], 釦: [] };
}

const 組ら = (process.env.KASA_WH || '393x852,844x390,844x330').split(',')
  .map((x) => x.split('x').map(Number)).map(([w, h]) => ({ 幅: w, 高: h }));
if (require.main === module) {
  let 咎 = 0;
  for (const { 幅, 高 } of 組ら) {
    const r = 測る(幅, 高);
    console.log(`\n── ${幅}×${高}　盤の丈 ${r.盤の丈}／画面 ${r.高}　釦 ${(r.釦 || []).length}`);
    const 悪 = (r.釦 || []).filter((b) => !b.収 || !b.届 || b.小図と重なる);
    for (const b of 悪) console.log(`   ★ ${b.名}　上${b.上} 下${b.下}${b.収 ? '' : '／はみ出す'}${b.届 ? '' : '／押せぬ'}${b.小図と重なる ? '／小図と重なる' : ''}`);
    if (!悪.length) console.log('   すべて盤に収まり、押せ、小図と重ならない');
    for (const x of r.咎 || []) { if (!/釦「/.test(x)) console.log('   ★ ' + x); }
    咎 += (r.咎 || []).length;
  }
  console.log(`\n════ 咎 ${咎} 件`);
  process.exit(咎 ? 1 : 0);
}
module.exports = { 測る };
