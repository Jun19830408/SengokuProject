#!/usr/bin/env node
/* ==========================================================================
   説明書に載せる絵を、実際のゲームから撮る

   絵は描き起こさない。dist/index.html をそのまま Chrome で開き、記録を仕込み、
   釦を押して目当ての画面まで進め、そこで写す。実物でなければ説明にならないし、
   絵だけ古くなることもない。

     npm run build && node tools/shots.cjs && npm run build

   一度目の build で遊びの本体を作り、それを開いて写しを撮り、src/data/shots.js に
   収める。二度目の build で、その写しが遊びの中の「遊び方」と PDF に入る。

   一つの場面につき Chrome を一度立ち上げる。仕込みと手順は下の「場面」にある。
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'tebiki');
const TMP = path.join(ROOT, 'build', 'shots');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'google-chrome', 'chromium',
].find((p) => { try { fs.accessSync(p); return true; } catch (e) { return /^[a-z]/.test(p); } });

// 盤を仕込むために、遊びの中身を Node からも触れるようにする
const 口 = path.join(ROOT, 'build', 'shots-entry.js');
fs.writeFileSync(口, 'export { initState } from "../src/core/state.js";\n'
  + 'export { findPath } from "../src/core/paths.js";\n');
const 束 = path.join(ROOT, 'build', 'shots-state.cjs');
esbuild.buildSync({ entryPoints: [口], bundle: true, format: 'cjs', outfile: 束, logLevel: 'error' });
const { initState, findPath } = require(束);

/* ------------------------------------------------------------ 盤の仕込み */
const 素の盤 = () => {
  const s = initState('oda');
  s.year = 1547; s.month = 6;
  return s;
};

// 敵の軍が自家の城の際まで来ている盤（城下の野戦になる）
const 野戦の盤 = () => {
  const s = 素の盤();
  const 自城 = s.castles.filter((c) => c.faction === s.player);
  let 狙 = null, 敵城 = null;
  for (const c of 自城) {
    const e = s.castles.find((d) => d.faction !== s.player && (findPath(c.id, d.id) || []).length === 2);
    if (e) { 狙 = c; 敵城 = e; break; }
  }
  const 敵将 = s.generals.filter((x) => x.at === 敵城.id && x.faction === 敵城.faction && !x.captive).slice(0, 3);
  for (const t of 敵将) t.at = null;
  s.armies.push({
    id: 'shot-foe', faction: 敵城.faction, from: 敵城.id, gens: 敵将.map((x) => x.id),
    local: 3200, localTrain: 72, rost: null,
    men: 3200 + 敵将.reduce((a, x) => a + x.retinue, 0),
    at: 狙.id, path: [狙.id], prog: 0, food: 9000, target: 狙.id,
  });
  s.pendingArrivals = ['shot-foe'];
  return s;
};

// 自軍が敵城を囲んでいる盤（強攻すれば城郭図に入る）
const 城攻めの盤 = () => {
  const s = 素の盤();
  const 自城 = s.castles.filter((c) => c.faction === s.player);
  let 出 = null, 敵城 = null;
  for (const c of 自城) {
    const e = s.castles.find((d) => d.faction !== s.player && (findPath(c.id, d.id) || []).length === 2);
    if (e) { 出 = c; 敵城 = e; break; }
  }
  敵城.local = 2600; 敵城.def = Math.max(58, 敵城.def);
  const 将 = s.generals.filter((x) => x.at === 出.id && x.faction === s.player && !x.captive).slice(0, 3);
  for (const t of 将) t.at = null;
  s.armies.push({
    id: 'shot-siege', faction: s.player, from: 出.id, gens: 将.map((x) => x.id),
    local: 5200, localTrain: 74, rost: null,
    men: 5200 + 将.reduce((a, x) => a + x.retinue, 0),
    at: 敵城.id, path: [敵城.id], prog: 0, food: 16000, target: 敵城.id, sieging: true,
  });
  s.sieges = [{ castleId: 敵城.id, armyId: 'shot-siege', months: 1, decided: null }];
  return s;
};

/* ------------------------------------------------------------ 場面の並び

   手順は文字列の配列。画面の中で走らせる。
     押:文字   … その文字を含む釦を押す
     図:x,y    … 地図（canvas）のその場所を押す
     待:秒     … 待つ
     鍵:...    … 記録を仕込む（盤の名。下の 盤たち にある） */
const 盤たち = { 素: 素の盤, 野戦: 野戦の盤, 城攻め: 城攻めの盤 };

const 場面 = [
  { key: 'title', 盤: null, 手: [], 幅: 1000, 高: 980, 説: 'タイトル画面' },
  { key: 'map', 盤: '素', 手: ['押:続きから', '待:0.8'], 幅: 1200, 高: 900, 説: '政務の地図' },
  { key: 'report', 盤: '素', 手: ['押:続きから', '待:0.6', '押:次月へ', '待:1.6'], 幅: 1000, 高: 980, 説: '月の報せ' },
  { key: 'castle', 盤: '素', 手: ['押:続きから', '待:0.6', '押:本拠', '待:0.4', '図:0,0', '待:0.6'],
    幅: 1000, 高: 1150, 説: '城の帳（内政）' },
  { key: 'sortie', 盤: '素', 手: ['押:続きから', '待:0.6', '押:本拠', '待:0.4', '図:0,0', '待:0.5',
    '押:軍事', '待:0.4', '押:出陣', '待:0.6'], 幅: 1000, 高: 1100, 説: '出陣の画面' },
  { key: 'manual', 盤: '素', 手: ['押:続きから', '待:0.6', '押:遊び方', '待:0.5'], 幅: 1000, 高: 1000, 説: '遊び方（画面の中）' },
  { key: 'field-deploy', 盤: '野戦', 手: ['押:続きから', '待:1.4', '押:正面から当たる', '待:0.8', '押:全体', '待:0.6'],
    幅: 1200, 高: 950, 説: '野戦の布陣' },
  { key: 'field-fight', 盤: '野戦', 手: ['押:続きから', '待:1.4', '押:正面から当たる', '待:0.8',
    '押:合戦開始', '待:0.5', '押:通常', '待:38', '押:全体', '待:0.8'], 幅: 1200, 高: 950, 説: '野戦（交戦）' },
  { key: 'siege-plan', 盤: '城攻め', 手: ['押:続きから', '待:1.2'], 幅: 1000, 高: 1000, 説: '包囲の段' },
  { key: 'siege-map', 盤: '城攻め', 手: ['押:続きから', '待:1.0', '押:強攻', '待:0.8', '押:合戦開始', '待:0.5',
    '押:通常', '待:16', '押:全体', '待:0.8'], 幅: 1200, 高: 950, 説: '城攻め（城郭図）' },
];

/* --------------------------------------------------- 画面の中で走らせる手 */
const 手順の書 = (手) => `
<script>
(async () => {
  const 眠 = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const 釦 = (t) => [...document.querySelectorAll('button,.mbtn,.btn')]
    .filter((b) => !b.disabled && b.offsetParent !== null)
    .find((b) => (b.textContent || '').includes(t));
  const 押 = async (t) => {
    for (let i = 0; i < 30; i++) { const el = 釦(t); if (el) { el.click(); await 眠(0.25); return true; } await 眠(0.2); }
    console.warn('釦が見つからぬ:', t); return false;
  };
  const 図 = async (dx, dy) => {
    const cv = document.querySelector('.mapwrap canvas');
    if (!cv) return false;
    const r = cv.getBoundingClientRect();
    const x = r.left + r.width / 2 + dx, y = r.top + r.height / 2 + dy;
    for (const type of ['mousedown', 'mouseup', 'click']) {
      cv.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
    }
    await 眠(0.4); return true;
  };
  await 眠(0.9);
  ${手.map((h) => {
    const [k, v] = [h.slice(0, h.indexOf(':')), h.slice(h.indexOf(':') + 1)];
    if (k === '押') return `await 押(${JSON.stringify(v)});`;
    if (k === '待') return `await 眠(${Number(v)});`;
    if (k === '図') { const [a, b] = v.split(','); return `await 図(${Number(a)}, ${Number(b)});`; }
    return '';
  }).join('\n  ')}
  document.title = 'READY';
})();
</script>`;

/* ------------------------------------------------------------------ 撮る */
const 元 = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
let 撮れた = 0;
for (const s of 場面) {
  const 盤 = s.盤 ? 盤たち[s.盤]() : null;
  const 仕込み = 盤
    ? `<script>try{localStorage.setItem('sengoku:save1', ${JSON.stringify(JSON.stringify({ v: 1, at: Date.now(), state: 盤 }))});}catch(e){}</script>`
    : `<script>try{localStorage.clear();}catch(e){}</script>`;
  // 仕込みは本体より先に、手順は本体より後に置く
  const html = 元.replace('<body>', '<body>' + 仕込み) + 手順の書(s.手);
  const p = path.join(TMP, `${s.key}.html`);
  fs.writeFileSync(p, html);
  const png = path.join(OUT, `${s.key}.png`);
  try {
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
      `--window-size=${s.幅},${s.高}`, '--virtual-time-budget=20000',
      `--screenshot=${png}`, `file://${p}`], { stdio: 'ignore' });
  } catch (e) { /* 撮れなくても次へ */ }
  const 有 = fs.existsSync(png) && fs.statSync(png).size > 3000;
  console.log(`  ${有 ? '○' : '★'} ${s.key.padEnd(13)} ${s.説}${有 ? `　${Math.round(fs.statSync(png).size / 1024)}KB` : '　撮れず'}`);
  if (有) 撮れた++;
}

/* ------------------------------------------------ 紙用と画面用に整える

   紙（PDF）は幅千、画面の中の遊び方は幅五百。画面のほうは遊びの本体へ埋め込むので、
   軽くしておかねばならない。JPEG に落として六割ほどの質にする。 */
const 整える = (key, 幅, 質, 先) => {
  const 元 = path.join(OUT, `${key}.png`);
  if (!fs.existsSync(元)) return null;
  fs.mkdirSync(path.dirname(先), { recursive: true });
  try {
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(質),
      '--resampleWidth', String(幅), 元, '--out', 先], { stdio: 'ignore' });
    return fs.existsSync(先) ? 先 : null;
  } catch (e) { return null; }
};

const 紙 = path.join(OUT, '大'), 画 = path.join(OUT, '小');
let 紙計 = 0, 画計 = 0;
const 埋め = {};
for (const s of 場面) {
  const a = 整える(s.key, 1000, 82, path.join(紙, `${s.key}.jpg`));
  const b = 整える(s.key, 500, 62, path.join(画, `${s.key}.jpg`));
  if (a) 紙計 += fs.statSync(a).size;
  if (b) { 画計 += fs.statSync(b).size; 埋め[s.key] = 'data:image/jpeg;base64,' + fs.readFileSync(b).toString('base64'); }
}

/* 画面用は遊びの本体へ埋め込む。生成物であることを断って src へ置く。 */
const 書 = '/* 説明書に載せる、実際の画面の写し。\n'
  + '   tools/shots.cjs が作る（node tools/shots.cjs）。手で編まないこと。\n'
  + '   遊びの本体へ埋め込むので、幅五百・質六割ほどの JPEG に落としてある。 */\n'
  + 'export const 写し = ' + JSON.stringify(埋め, null, 0) + ';\n';
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'shots.js'), 書);
/* 生の写し（PNG）は捨てる。紙用と画面用ができていれば用は足りる。
   置いておくと四MB余りが積もるだけで、撮り直せばまた作れる。 */
for (const s of 場面) { try { fs.unlinkSync(path.join(OUT, `${s.key}.png`)); } catch (e) { /* 無ければよい */ } }

console.log(`dist/tebiki/大   ${Math.round(紙計 / 1024)} KB  … 紙用（幅千）`);
console.log(`dist/tebiki/小   ${Math.round(画計 / 1024)} KB  … 画面用（幅五百・本体に埋め込む）`);
console.log(`dist/tebiki/  ${撮れた}／${場面.length} 枚`);
