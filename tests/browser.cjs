// ブラウザ版（dist/戦国.html）の試験。
// 開くだけで題名が出て、大名を選んで月が進み、記録がブラウザに残るかを見る。
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML = path.join(__dirname, '..', 'dist', '戦国.html');
if (!fs.existsSync(HTML)) { console.log('★dist/戦国.html がない。先に npm run build を。'); process.exit(1); }
const html = fs.readFileSync(HTML, 'utf8');

// 中の書き付けを順に取り出し、画面を組んでから流し込む（canvas の下ごしらえのため）
const 書き付け一式 = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((x) => x[1].replace(/<\\\/script/g, '</script'));
if (!書き付け一式.length) { console.log('★書き付けが見つからない'); process.exit(1); }
const 骨 = html.replace(/<script>[\s\S]*?<\/script>/g, '');

const dom = new JSDOM(骨, { pretendToBeVisual: true, url: 'http://localhost/', runScripts: 'outside-only' });
const w = dom.window;
global.window = w; global.document = w.document; global.navigator = w.navigator;

// 絵筆の代わり。jsdom は canvas を持たないので、受け流す当て木を置く。
const ctxStub = new Proxy({}, { get: (t, p) => {
  if (p === 'measureText') return () => ({ width: 30 });
  if (p === 'createImageData') return (a, b) => ({ data: new Uint8ClampedArray(a * b * 4), width: a, height: b });
  return () => {};
} });
w.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 1200; } });
Object.defineProperty(w.HTMLElement.prototype, 'clientHeight', { get() { return 800; } });
w.HTMLElement.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, width: 1200, height: 800, right: 1200, bottom: 800 };
};

// いまのブラウザはどれも備えている仕組み。jsdom には無いので与えておく。
if (!w.structuredClone) w.structuredClone = structuredClone;

const errs = [];
const 元のerror = console.error;
console.error = (...a) => errs.push(String(a[0]).slice(0, 160));
w.addEventListener('error', (e) => errs.push('窓の例外: ' + (e.message || '')));

const 待つ = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const 押す = async (文言) => {
  const el = [...w.document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(文言));
  if (!el || el.disabled) return false;
  for (const t of ['mousedown', 'mouseup', 'click']) {
    el.dispatchEvent(new w.MouseEvent(t, { bubbles: true, clientX: 600, clientY: 400 }));
  }
  await 待つ(); return true;
};
const 家を開く = async (名) => {
  const el = [...w.document.querySelectorAll('.mn')].find((e) => e.textContent.trim() === 名);
  if (!el) return false;
  for (const t of ['mousedown', 'mouseup', 'click']) {
    el.parentElement.dispatchEvent(new w.MouseEvent(t, { bubbles: true, clientX: 600, clientY: 400 }));
  }
  await 待つ(); return true;
};

(async () => {
  let 不首尾 = 0;
  const 確かめる = (名, 可) => { console.log(`  ${可 ? '○' : '★'} ${名}`); if (!可) 不首尾++; };

  // ブラウザ自身の記憶が使えること（これが無ければセーブが残らない）
  確かめる('ブラウザに記憶の場所がある', !!w.localStorage);

  for (const 書 of 書き付け一式) w.eval(書);
  await 待つ(120);

  const 文 = () => w.document.body.textContent;
  確かめる('題名が出る', /戦国プロジェクト/.test(文()));
  確かめる('「ゲームをはじめる」が出る', /ゲームをはじめる/.test(文()));

  await 押す('ゲームをはじめる');
  確かめる('大名を選ぶ画面へ進む', /織田家|勢力/.test(文()));

  await 家を開く('織田家');
  const 開始 = await 押す('この勢力で開始');
  確かめる('織田家で始められる', 開始);
  await 待つ(120);
  確かめる('政略図が出る（1546年）', /1546年/.test(文()));

  const 帯 = () => (w.document.querySelector('.bar') || { textContent: '' }).textContent;
  const 年月 = () => { const x = 帯().match(/(\d{4})年\s*(\d{1,2})月/); return x ? `${x[1]}-${x[2]}` : null; };
  const 前 = 年月();
  const 進めた = await 押す('次月へ');
  確かめる('月を進められる', 進めた);
  await 待つ(120);
  確かめる(`月がひとつ進む（${前} → ${年月()}）`, !!前 && !!年月() && 前 !== 年月());

  await 押す('評定を開く');
  await 待つ(400);

  const 記録 = w.localStorage.getItem('sengoku:save1');
  確かめる('記録がブラウザに残る', !!記録);
  if (記録) {
    let d = null;
    try { d = JSON.parse(記録); } catch (e) { /* 読めぬ */ }
    確かめる('記録の中身が読める', !!(d && d.state && d.state.year === 1546));
    確かめる('記録に城が入っている', !!(d && d.state && d.state.castles && d.state.castles.length > 200));
  }

  console.log(`  記録の大きさ: ${記録 ? Math.round(記録.length / 1024) : 0} KB`);
  console.error = 元のerror;
  // 描き手のいない当て木ゆえの警告は数えない
  const 実害 = errs.filter((e) => !/Not implemented|not wrapped in act/.test(e));
  console.log('確かめ:', 不首尾 ? `★${不首尾}件が通らなかった` : 'すべて通った');
  console.log('エラー:', 実害.length ? 実害.slice(0, 3).join(' | ') : 'なし');
  process.exit(不首尾 ? 1 : 0);
})().catch((e) => {
  console.error = 元のerror;
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 6).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
