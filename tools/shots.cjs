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

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'tebiki');
const TMP = path.join(ROOT, 'build', 'shots');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const { CHROME, 盤たち, 刻みの仕掛け } = require('./ban.cjs');

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

  /* ここから下は紹介資料のために足したもの。合戦の中身を見せる。
     盤を押して隊を選ぶと、その隊の様子（兵・士気・陣形・疲労・地形）と、
     下知と陣形の並びが出る。これが合戦の操作の芯である。 */
  /* 海戦の写しは、まだ撮れていない。別所を三木から洲本へ渡らせて三好の水軍に
     阻ませる盤（海戦の盤）は仕込んであるが、着いた月の「迎え撃つ」まで進めず、
     地図の画面のままになる。撮れていないものに海戦の名を付けるわけにはいかぬので、
     場面ごと外してある。盤の仕込みは残したので、進め方が分かれば足せる。 */
  { key: 'field-wide', 盤: '野戦', 手: ['押:続きから', '待:1.4', '押:正面から当たる', '待:0.8',
    '押:合戦開始', '待:0.5', '押:通常', '待:26', '押:停止', '待:0.4', '押:広く', '待:0.8'],
    幅: 430, 高: 932, 説: '合戦（道具立てをしまった縦画面）' },
  { key: 'field-show', 盤: '野戦', 手: ['押:続きから', '待:1.4', '押:正面から当たる', '待:0.8',
    '押:合戦開始', '待:0.5', '押:通常', '待:26', '押:停止', '待:0.8'],
    幅: 430, 高: 932, 説: '合戦（道具立てを出した縦画面）' },
  { key: 'siege-wide', 盤: '城攻め', 手: ['押:続きから', '待:1.0', '押:強攻', '待:0.8', '押:合戦開始',
    '待:0.5', '押:通常', '待:30', '押:停止', '待:0.4', '押:広く', '待:0.8'],
    幅: 430, 高: 932, 説: '城攻め（道具立てをしまった縦画面）' },
  { key: 'field-close', 盤: '野戦', 手: ['押:続きから', '待:1.4', '押:正面から当たる', '待:0.8',
    '押:合戦開始', '待:0.5', '押:通常', '待:30', '押:停止', '待:0.4', '押:拡大', '待:0.3',
    '押:拡大', '待:0.9'], 幅: 1200, 高: 950, 説: '野戦（駒の寄り）' },
  { key: 'field-late', 盤: '野戦', 手: ['押:続きから', '待:1.4', '押:正面から当たる', '待:0.8',
    '押:合戦開始', '待:0.5', '押:通常', '待:70', '押:全体', '待:0.8'],
    幅: 1200, 高: 950, 説: '野戦（崩れと追撃）' },
  { key: 'siege-gate', 盤: '城攻め', 手: ['押:続きから', '待:1.0', '押:強攻', '待:0.8', '押:合戦開始', '待:0.5',
    '押:通常', '待:52', '押:停止', '待:0.4', '押:拡大', '待:0.3', '押:拡大', '待:0.9'],
    幅: 1200, 高: 950, 説: '城攻め（門を破る）' },
  { key: 'siege-late', 盤: '城攻め', 手: ['押:続きから', '待:1.0', '押:強攻', '待:0.8',
    '押:合戦開始', '待:0.5', '押:通常', '待:80', '押:停止', '待:0.8'],
    幅: 1200, 高: 950, 説: '城攻め（門を破って中へ）' },
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
  /* 合戦の盤を押す。隊を選ぶと、その隊の様子と下知の並びが出る。
     盤の canvas は地図のそれとは別なので、見つけ方を分ける。 */
  /* 隊を選ぶ。どこに隊が居るかは戦の運びで変わるので、当たるまで盤を探る。
     選べたかどうかは「疲労」の欄が出たかで見分ける（隊を選んだときだけ出る）。 */
  const 陣 = async () => {
    /* 押しを受けているのは canvas ではなく、それを包む .fieldwrap である。
       押した所に隊が居なければ何も起きないので、当たるまで盤を細かく探る。 */
    const cv = document.querySelector('.fieldwrap');
    if (!cv) { console.warn('盤が無い'); return false; }
    const r = cv.getBoundingClientRect();
    const 押す = async (x, y) => {
      const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 1 };
      cv.dispatchEvent(new MouseEvent('mousedown', o));
      cv.dispatchEvent(new MouseEvent('mousemove', o));
      cv.dispatchEvent(new MouseEvent('mouseup', { ...o, buttons: 0 }));
      await 眠(0.12);
      return /疲労/.test(document.body.textContent);
    };
    for (let gy = -0.34; gy <= 0.36; gy += 0.045) {
      for (let gx = -0.44; gx <= 0.46; gx += 0.04) {
        if (await 押す(r.left + r.width * (0.5 + gx), r.top + r.height * (0.5 + gy))) {
          await 眠(0.6); return true;
        }
      }
    }
    console.warn('隊を選べなかった'); return false;
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
    if (k === '陣') return `await 陣();`;
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
  const 仕込み = (盤
    ? `<script>try{localStorage.setItem('sengoku:save1', ${JSON.stringify(JSON.stringify({ v: 1, at: Date.now(), state: 盤 }))});}catch(e){}</script>`
    : `<script>try{localStorage.clear();}catch(e){}</script>`) + 刻みの仕掛け;
  // 仕込みは本体より先に、手順は本体より後に置く
  const html = 元.replace('<body>', '<body>' + 仕込み) + 手順の書(s.手);
  const p = path.join(TMP, `${s.key}.html`);
  fs.writeFileSync(p, html);
  const png = path.join(OUT, `${s.key}.png`);

  /* Chrome の --window-size は、幅を五百より狭くできない。四三〇と書いても
     開くのは五百である。そのため「携帯の縦画面」と称した写しは、長らく
     五百幅で撮れていた。実機の三九三〜四三〇では道具立ての収まりが変わる
     ので、これでは説明にならない（tools/semai.cjs にいきさつを記した）。

     そこで狭い場面は、五百の窓の中に iframe を置き、その iframe を目当ての
     幅にする。差し金（media query）は iframe の幅で決まるので、中は本当の
     狭さになる。撮ったあと、余った右側を切り落とす。 */
  const 狭 = s.幅 < 500;
  let 撮る道 = p, 窓幅 = s.幅;
  if (狭) {
    /* iframe は真ん中に置く。sips の切り出しは真ん中を残すので（--cropOffset は
       効かなかった）、真ん中に置いておけば切り出しがそのまま iframe になる。 */
    const 親 = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#fff;overflow:hidden}
iframe{width:${s.幅}px;height:${s.高}px;border:0;display:block;position:absolute;top:0;left:50%;transform:translateX(-50%)}</style>
<iframe src="${s.key}.html"></iframe>`;
    撮る道 = path.join(TMP, `${s.key}-oya.html`);
    fs.writeFileSync(撮る道, 親);
    窓幅 = 500;
  }
  try {
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
      `--window-size=${窓幅},${s.高}`, '--virtual-time-budget=180000',
      `--screenshot=${png}`, `file://${撮る道}`], { stdio: 'ignore' });
    if (狭 && fs.existsSync(png)) {
      execFileSync('sips', ['-c', String(s.高), String(s.幅), png], { stdio: 'ignore' });
    }
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
