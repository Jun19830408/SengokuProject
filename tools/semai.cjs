#!/usr/bin/env node
/* ==========================================================================
   狭い画面で、道具立てが盤の中に収まっているかを測る

   携帯の縦持ちで「釦が画面の途中で切れて、押しても何も起こらない」との報せが
   あった。調べると、私の検分そのものが狭さを見ていなかった。

     Chrome の --window-size は、幅を五百より狭くできない。
     四三〇と書いても、開くのは五百である（headless の新旧いずれも同じ）。

   つまり「縦画面」と称して撮っていた写しは、すべて五百幅であった。実機の
   三九三〜四三〇を一度も見ていない。道具立ては縦に五つ積むので、五百のときは
   盤が十分に高く収まるが、四三〇では下の「広く」が盤の外へ出て切れる。切れた
   釦は押せないので、しまうこともできなくなる――これが報せの正体である。

   そこで、遊びを iframe に入れ、iframe の幅を狭める。差し金（media query）は
   iframe の幅で決まるので、これなら本当の狭さを測れる。

     node tools/semai.cjs            … 三九三・四三〇・五〇〇で測って表に出す
     node tools/semai.cjs --json     … 判じに使う形で出す
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { CHROME, ROOT, 頁を組む } = require('./ban.cjs');

const TMP = path.join(ROOT, 'build', 'semai');
fs.mkdirSync(TMP, { recursive: true });

// 測る画面の幅（実機の縦持ち）。高さは iPhone のそれに合わせる
const 既定 = (process.env.SEMAI_W || '393,430').split(',').map(Number)
  .map((w) => ({ 幅: w, 高: Number(process.env.SEMAI_H || 852) }));

/* 中の頁でする手順。合戦の盤まで進め、道具立ての一つ一つを測る。
   測るのは三つ――盤からはみ出していないか、押した先が自分に届くか、
   しまう取っ手で戻せるか。 */
const 検分 = `
(async () => {
  const 眠 = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const 釦 = (t) => [...document.querySelectorAll('button,.mbtn,.btn')]
    .filter((b) => !b.disabled && b.offsetParent !== null)
    .find((b) => (b.textContent || '').includes(t));
  const 押 = async (t) => { for (let i = 0; i < 40; i++) { const el = 釦(t); if (el) { el.click(); await 眠(0.25); return true; } await 眠(0.2); } return false; };
  const 報 = { 幅: document.documentElement.clientWidth, 高: document.documentElement.clientHeight, 釦: [], 咎: [] };
  try {
    await 眠(0.9);
    await 押('続きから'); await 眠(1.4);
    await 押('正面から当たる'); await 眠(0.8);
    await 押('合戦開始'); await 眠(0.6);
    await 押('停止'); await 眠(0.5);

    const 盤 = document.querySelector('canvas');
    報.盤 = 盤 ? (() => { const r = 盤.getBoundingClientRect(); return { 左: Math.round(r.left), 上: Math.round(r.top), 右: Math.round(r.right), 下: Math.round(r.bottom) }; })() : null;
    if (!報.盤) 報.咎.push('盤（canvas）が見つからぬ');
    const 帯 = document.querySelector('.bar');
    報.帯の丈 = 帯 ? Math.round(帯.getBoundingClientRect().height) : 0;

    for (const 名 of ['拡大', '縮小', '全体', '収納', '広く']) {
      const el = 釦(名);
      if (!el) { 報.釦.push({ 名, 有: false }); 報.咎.push('釦 ' + 名 + ' が無い'); continue; }
      const r = el.getBoundingClientRect();
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
      const 中 = document.elementFromPoint(cx, cy);
      const 届 = !!中 && (el.contains(中) || 中 === el || (中.closest && 中.closest('.mbtn') === el));
      const 収 = !!報.盤 && r.top >= 報.盤.上 - 1 && r.bottom <= 報.盤.下 + 1
                 && r.left >= -1 && r.right <= 報.幅 + 1;
      報.釦.push({ 名, 有: true, 上: Math.round(r.top), 下: Math.round(r.bottom), 左: Math.round(r.left), 右: Math.round(r.right), 届, 収 });
      if (!収) 報.咎.push('釦 ' + 名 + ' が盤からはみ出す（下' + Math.round(r.bottom) + ' 対 盤の下' + (報.盤 ? 報.盤.下 : '?') + '・右' + Math.round(r.right) + ' 対 画面' + 報.幅 + '）');
      if (!届) 報.咎.push('釦 ' + 名 + ' は押しても届かぬ（上に ' + (中 ? (中.className || 中.tagName) : '何も無し') + '）');
    }

    // しまえるか、戻せるか
    const w = 釦('広く');
    if (w) {
      w.click(); await 眠(0.6);
      報.しまえた = !!document.querySelector('.mapctl.hid');
      if (!報.しまえた) 報.咎.push('「広く」を押しても道具立てがしまわれぬ');
      const g = document.querySelector('.grip');
      報.取っ手 = !!g;
      if (!g) 報.咎.push('しまったあとの取っ手が無い');
      else {
        const gr = g.getBoundingClientRect();
        const 中 = document.elementFromPoint((gr.left + gr.right) / 2, (gr.top + gr.bottom) / 2);
        if (!(中 && (g.contains(中) || 中 === g))) 報.咎.push('取っ手が押しても届かぬ');
        g.click(); await 眠(0.6);
        報.戻せた = !document.querySelector('.mapctl.hid');
        if (!報.戻せた) 報.咎.push('取っ手を押しても道具立てが戻らぬ');
      }
    }
    // 帯が盤を圧しすぎていないか（盤の高さは画面の半分は要る）
    if (報.盤) {
      報.盤の丈 = 報.盤.下 - 報.盤.上;
      if (報.盤の丈 < 報.高 * 0.42) 報.咎.push('盤が狭すぎる（丈 ' + 報.盤の丈 + ' ／ 画面 ' + 報.高 + '）');
    }
  } catch (e) { 報.咎.push('検分そのものが転んだ：' + (e && e.message)); }
  parent.postMessage({ 検分: 報 }, '*');
})();
`;

function 測る(幅, 高) {
  const 中 = 頁を組む('野戦') + '<script>' + 検分 + '</script>';
  const 中の道 = path.join(TMP, `naka-${幅}.html`);
  fs.writeFileSync(中の道, 中);
  /* 親は五百幅で開くほかないが、iframe を四三〇にすれば、中の差し金は
     四三〇として効く。測るのは中の座標なので、親の幅は関わらない。 */
  const 親 = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#888}
iframe{width:${幅}px;height:${高}px;border:0;display:block}</style>
<iframe src="naka-${幅}.html"></iframe>
<script>
addEventListener('message', (e) => {
  if (!e.data || !e.data.検分) return;
  const pre = document.createElement('pre'); pre.id = 'shirase';
  pre.textContent = JSON.stringify(e.data.検分);
  document.body.appendChild(pre);
  document.title = 'DONE';
});
setTimeout(() => { if (document.title !== 'DONE') {
  const pre = document.createElement('pre'); pre.id = 'shirase';
  pre.textContent = JSON.stringify({ 幅: ${幅}, 咎: ['検分が返らぬ（間に合わず）'], 釦: [] });
  document.body.appendChild(pre);
} }, 60000);
</script>`;
  const 親の道 = path.join(TMP, `oya-${幅}.html`);
  fs.writeFileSync(親の道, 親);
  let dom = '';
  try {
    dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--window-size=500,900', '--virtual-time-budget=120000',
      '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
      '--dump-dom', `file://${親の道}`],
      // Chrome は更新の報せなどを絶えず標準エラーに吐く。試験の判じを濁すので捨てる
      { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) { return { 幅, 咎: ['Chrome が立たぬ'], 釦: [] }; }
  const m = dom.match(/<pre id="shirase">([\s\S]*?)<\/pre>/);
  if (!m) return { 幅, 咎: ['測りが取れなんだ'], 釦: [] };
  const 生 = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  try { return JSON.parse(生); } catch (e) { return { 幅, 咎: ['測りが読めぬ'], 釦: [] }; }
}

function 検分する(組ら) {
  return (組ら || 既定).map((o) => 測る(o.幅, o.高));
}

if (require.main === module) {
  const 結 = 検分する();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(結)); process.exit(0); }
  let 咎 = 0;
  for (const r of 結) {
    console.log(`\n── 幅 ${r.幅}×${r.高}${r.盤 ? `（帯の丈 ${r.帯の丈} ／ 盤の丈 ${r.盤の丈}）` : ''}`);
    for (const b of r.釦) {
      console.log(b.有
        ? `   ${b.名.padEnd(3)} 上${String(b.上).padStart(4)} 下${String(b.下).padStart(4)} 右${String(b.右).padStart(4)}  ${b.収 ? '収' : '★はみ出す'} ${b.届 ? '押せる' : '★押せぬ'}`
        : `   ${b.名.padEnd(3)} ★無し`);
    }
    console.log(`   しまえた:${r.しまえた ? '○' : '×'} 取っ手:${r.取っ手 ? '○' : '×'} 戻せた:${r.戻せた ? '○' : '×'}`);
    for (const c of r.咎 || []) { console.log(`   ★ ${c}`); 咎++; }
  }
  console.log(`\n════ 咎 ${咎} 件`);
  process.exit(咎 ? 1 : 0);
}

module.exports = { 検分する };
