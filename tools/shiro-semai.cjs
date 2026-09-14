#!/usr/bin/env node
/* 城攻めの盤で、道具立て（とくに「広く」）が押せるかを測る。
   tools/semai.cjs と同じ仕掛けを、城攻めの盤で回す。 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { CHROME, ROOT, 頁を組む } = require('./ban.cjs');
const TMP = path.join(ROOT, 'build', 'shiro-semai');
fs.mkdirSync(TMP, { recursive: true });

const 検分 = `
(async () => {
  const 眠 = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const 釦 = (t) => [...document.querySelectorAll('button,.mbtn,.btn')]
    .filter((b) => !b.disabled && b.offsetParent !== null)
    .find((b) => (b.textContent || '').includes(t));
  const 押 = async (t) => { for (let i = 0; i < 40; i++) { const el = 釦(t); if (el) { el.click(); await 眠(0.25); return true; } await 眠(0.2); } return false; };
  const 報 = { 幅: document.documentElement.clientWidth, 高: document.documentElement.clientHeight, 釦: [], 咎: [], 筋: [] };
  try {
    await 眠(0.9);
    報.筋.push('続きから:' + await 押('続きから')); await 眠(1.4);
    報.筋.push('強攻:' + await 押('強攻')); await 眠(1.0);
    報.筋.push('任せる:' + await 押('すべて任せる')); await 眠(1.2);
    報.筋.push('合戦開始:' + await 押('合戦開始')); await 眠(0.8);
    await 押('停止'); await 眠(0.5);
    const 盤 = document.querySelector('canvas');
    報.盤 = 盤 ? (() => { const r = 盤.getBoundingClientRect(); return { 上: Math.round(r.top), 下: Math.round(r.bottom) }; })() : null;
    if (!報.盤) 報.咎.push('盤（canvas）が見つからぬ');
    for (const 名 of ['拡大', '縮小', '全体', '広く']) {
      const el = 釦(名);
      if (!el) { 報.釦.push({ 名, 有: false }); 報.咎.push('釦 ' + 名 + ' が無い'); continue; }
      const r = el.getBoundingClientRect();
      const 中 = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      const 届 = !!中 && (el.contains(中) || 中 === el || (中.closest && 中.closest('.mbtn') === el));
      const 収 = !!報.盤 && r.top >= 報.盤.上 - 1 && r.bottom <= 報.盤.下 + 1 && r.left >= -1 && r.right <= 報.幅 + 1;
      報.釦.push({ 名, 有: true, 上: Math.round(r.top), 下: Math.round(r.bottom), 届, 収 });
      if (!収) 報.咎.push('釦 ' + 名 + ' が盤からはみ出す（下' + Math.round(r.bottom) + ' 対 ' + (報.盤 ? 報.盤.下 : '?') + '）');
      if (!届) 報.咎.push('釦 ' + 名 + ' は押しても届かぬ（上に ' + (中 ? (中.className || 中.tagName) : '何も無し') + '）');
    }
    const w = 釦('広く');
    if (w) { w.click(); await 眠(0.7);
      報.しまえた = !!document.querySelector('.mapctl.hid');
      if (!報.しまえた) 報.咎.push('「広く」を押しても道具立てがしまわれぬ');
      const g = document.querySelector('.grip');
      報.取っ手 = !!g;
      if (g) { g.click(); await 眠(0.6); 報.戻せた = !document.querySelector('.mapctl.hid');
        if (!報.戻せた) 報.咎.push('取っ手を押しても戻らぬ'); }
      else 報.咎.push('しまったあとの取っ手が無い');
    } else 報.咎.push('「広く」が見つからぬ');
  } catch (e) { 報.咎.push('検分そのものが転んだ：' + (e && e.message)); }
  parent.postMessage({ 検分: 報 }, '*');
})();
`;

function 測る(幅, 高) {
  const 中 = 頁を組む('城攻め') + '<script>' + 検分 + '</script>';
  fs.writeFileSync(path.join(TMP, `naka-${幅}x${高}.html`), 中);
  const 親 = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#888}
iframe{width:${幅}px;height:${高}px;border:0;display:block}</style>
<iframe src="naka-${幅}x${高}.html"></iframe>
<script>
addEventListener('message', (e) => { if (!e.data || !e.data.検分) return;
  const pre = document.createElement('pre'); pre.id='shirase'; pre.textContent = JSON.stringify(e.data.検分);
  document.body.appendChild(pre); document.title='DONE'; });
setTimeout(() => { if (document.title !== 'DONE') { const pre=document.createElement('pre'); pre.id='shirase';
  pre.textContent = JSON.stringify({ 幅:${幅}, 咎:['検分が返らぬ（間に合わず）'], 釦:[] }); document.body.appendChild(pre); document.title='DONE'; } }, 42000);
</script>`;
  const 親の道 = path.join(TMP, `oya-${幅}x${高}.html`);
  fs.writeFileSync(親の道, 親);
  const out = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox',
    `--window-size=${Math.max(520, 幅 + 40)},${高 + 60}`, '--virtual-time-budget=48000',
    '--dump-dom', 'file://' + 親の道], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const m = out.match(/<pre id="shirase">([\s\S]*?)<\/pre>/);
  return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')) : { 咎: ['報せが取れぬ'], 釦: [] };
}

const 組ら = (process.env.SHIRO_WH || '393x852,844x390').split(',')
  .map((x) => x.split('x').map(Number)).map(([w, h]) => ({ 幅: w, 高: h }));
const 結ら = 組ら.map(({ 幅, 高 }) => 測る(幅, 高));
if (require.main === module) {
  let 咎 = 0;
  結ら.forEach((r, i) => {
    console.log(`\n── ${組ら[i].幅}×${組ら[i].高}　筋 ${(r.筋 || []).join(' / ')}`);
    for (const b of r.釦 || []) console.log(`   ${b.名}　${b.有 ? `上${b.上} 下${b.下} ${b.収 ? '収' : '★はみ出す'} ${b.届 ? '押せる' : '★押せぬ'}` : '★無い'}`);
    console.log(`   しまえた:${r.しまえた ? '○' : '★'} 取っ手:${r.取っ手 ? '○' : '★'} 戻せた:${r.戻せた ? '○' : '★'}`);
    for (const x of r.咎 || []) { console.log('   ★ ' + x); 咎++; }
  });
  console.log(`\n════ 咎 ${咎} 件`);
  process.exit(咎 ? 1 : 0);
}
module.exports = { 測る };
