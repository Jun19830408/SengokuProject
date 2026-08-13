// 画面（MapScreen）の中に埋まっている政務の処理を、govern の折へ移す道具。
//
// 移すのは「盤の様子を受け取り、改めた盤の様子を返す」だけの処理である。
// 画面に触れる部分（どの帳面を開くか等）は画面に残す。
// 字句はそのまま写す。字下げも変えない（文言の中の空白を損なわぬため）。
const fs = require('fs');
const path = require('path');
const { buildIndex, fixImports, ROOT } = require('./imports.cjs');

const 画面 = path.join(ROOT, 'src/ui/MapScreen.jsx');
let lines = fs.readFileSync(画面, 'utf8').split('\n');

/* -------------------------------------------- 文の終わりを見つける */
function 文の終わり(from) {
  let depth = 0, seen = false, mode = 'code';
  const tpl = [];
  for (let i = from; i < lines.length; i++) {
    const l = lines[i];
    for (let j = 0; j < l.length; j++) {
      const c = l[j], d = l[j + 1];
      if (mode === 'code') {
        if (c === '/' && d === '/') break;
        if (c === '/' && d === '*') { mode = 'bc'; j++; continue; }
        if (c === "'") { mode = 'sq'; continue; }
        if (c === '"') { mode = 'dq'; continue; }
        if (c === '`') { mode = 'tpl'; continue; }
        if (c === '(' || c === '[' || c === '{') { depth++; seen = true; continue; }
        if (c === ')' || c === ']' || c === '}') {
          depth--;
          if (c === '}' && tpl.length && depth === tpl[tpl.length - 1]) { tpl.pop(); mode = 'tpl'; }
          continue;
        }
        if (c === ';' && depth === 0 && seen) return i;
      } else if (mode === 'bc') { if (c === '*' && d === '/') { mode = 'code'; j++; } }
      else if (mode === 'sq') { if (c === '\\') j++; else if (c === "'") mode = 'code'; }
      else if (mode === 'dq') { if (c === '\\') j++; else if (c === '"') mode = 'code'; }
      else if (mode === 'tpl') {
        if (c === '\\') j++;
        else if (c === '`') mode = 'code';
        else if (c === '$' && d === '{') { tpl.push(depth); depth++; mode = 'code'; j++; }
      }
    }
  }
  throw new Error(`${from + 1}行目から始まる文の終わりが見つからない`);
}

const 頭を探す = (name) => {
  const i = lines.findIndex((l) => l.startsWith(`  const ${name} = `));
  if (i < 0) throw new Error(`${name} が見つからない`);
  return i;
};

/* ------------------------------------------------------ 移す処理の目録 */
// かたち A：const 名 = (引数) => setG((prev) => { … });
// かたち B：const 名 = (引数) => { setG((prev) => { … }); };
const 移す = [
  { 名: 'runCommand', 新名: 'runCommand', 折: 'commands', 引数: 'castleId, cmd, genId', かたち: 'B', 盤も: true,
    説: '内政の下知（開墾・治水・商業・築城・訓練・徴募・調略）' },
  { 名: 'appoint', 新名: 'appoint', 折: 'commands', 引数: 'castleId, genId', かたち: 'A', 説: '城主を任ずる' },
  { 名: 'doKenchi', 新名: 'doKenchi', 折: 'commands', 引数: 'kuni, genId', かたち: 'A', 説: '検地（一国を丸ごと押さえたときのみ）' },
  { 名: 'settleCaptive', 新名: 'settleCaptive', 折: 'commands', 引数: 'genId, kind', かたち: 'A', 説: '戦後の始末（捕らえた将の遇し方）' },
  { 名: 'doRetire', 新名: 'doRetire', 折: 'commands', 引数: 'heirId', かたち: 'A', 説: '隠居して家督を譲る' },
  { 名: 'doCaptive', 新名: 'doCaptive', 折: 'commands', 引数: 'genId, how', かたち: 'A', 説: '捕虜の処遇' },
  { 名: 'doDiplo', 新名: 'doDiplo', 折: 'commands', 引数: 'fid, key', かたち: 'A', 説: '外交（親善・不可侵・同盟・従属・臣従・独立）' },
  { 名: 'doPlot', 新名: 'doPlot', 折: 'commands', 引数: 'castleId, type, genId', かたち: 'A', 説: '調略を仕掛ける' },
  { 名: 'doSpecial', 新名: 'doSpecial', 折: 'commands', 引数: 'townId, key', かたち: 'A', 説: '寺社・商人・水軍衆との取引' },
  { 名: 'grantFief', 新名: 'grantFief', 折: 'commands', 引数: 'genId, delta', かたち: 'A', 説: '知行を加増する／減らす' },
  { 名: 'reward', 新名: 'reward', 折: 'commands', 引数: 'genId', かたち: 'A', 説: '褒賞を与える' },
  { 名: 'nextMonth', 新名: 'advanceMonth', 折: 'month', 引数: '', かたち: 'B', 盤も: true, 尾: ['    setModal("report");'],
    説: '月を送る。天下じゅうの家が、この一手で動く' },
  { 名: 'autoResolve', 新名: 'resolveOffscreen', 折: 'war', 引数: 'armyId, castleId', かたち: 'A',
    説: '画面外の合戦。兵数・練度・統率・城防から勝敗と損害を出す' },
];

const 折の中身 = { commands: [], month: [], war: [] };

for (const t of 移す) {
  const s = 頭を探す(t.名);
  const e = 文の終わり(s);
  const 元 = lines.slice(s, e + 1);

  // かたちを確かめる。少しでも違えば手を止める。
  let 本文, 尾の残り = [];
  if (t.かたち === 'A') {
    if (!/=> setG\(\(prev\) => \{$/.test(元[0])) throw new Error(`${t.名}: 想定のかたち(A)と違う → ${元[0]}`);
    if (元[元.length - 1].trim() !== '});') throw new Error(`${t.名}: 末尾が想定と違う → ${元[元.length - 1]}`);
    本文 = 元.slice(1, -1);
  } else {
    if (!/=> \{$/.test(元[0])) throw new Error(`${t.名}: 想定のかたち(B)と違う → ${元[0]}`);
    if (元[1].trim() !== 'setG((prev) => {') throw new Error(`${t.名}: 二行目が想定と違う → ${元[1]}`);
    const 閉じ = 元.findIndex((l, i) => i > 1 && l === '    });');
    if (閉じ < 0) throw new Error(`${t.名}: setG の閉じが見つからない`);
    本文 = 元.slice(2, 閉じ);
    尾の残り = 元.slice(閉じ + 1, -1);          // setModal など、画面に残す部分
  }

  const 引数並び = ['prev', ...(t.引数 ? t.引数.split(', ') : []), ...(t.盤も ? ['g'] : [])].join(', ');
  折の中身[t.折].push(`// ${t.説}\nexport function ${t.新名}(${引数並び}) {\n${本文.join('\n')}\n}`);

  // 画面には、盤の様子を差し替えるだけの薄い呼び出しを残す
  const 呼び出し = `政務.${t.新名}(${引数並び})`;
  const 新 = t.かたち === 'A'
    ? [`  const ${t.名} = (${t.引数}) => setG((prev) => ${呼び出し});`]
    : [`  const ${t.名} = (${t.引数}) => {`,
       `    setG((prev) => ${呼び出し});`,
       ...(t.尾 || 尾の残り.map((x) => x)),
       `  };`];
  lines = [...lines.slice(0, s), ...新, ...lines.slice(e + 1)];
}

/* --------------------------------------------------------- 書き出す */
const 見出し = {
  commands: `/* ==========================================================================
   政務 ─ 城と家中への下知
   いずれも「いまの盤の様子（prev）を受け取り、改めた盤の様子を返す」だけの処理。
   画面には触れないので、画面を描かずとも試せる。
   ========================================================================== */`,
  month: `/* ==========================================================================
   月送り ─ 天下じゅうの一月
   この一手で、諸家の内政・調略・出陣・包囲・寿命・一揆・官位までが動く。
   画面から切り離してあるので、絵を描かずに何百年でも回せる。
   ========================================================================== */`,
  war: null,
};

for (const [折, 中身] of Object.entries(折の中身)) {
  if (!中身.length) continue;
  const f = path.join(ROOT, 'src/govern', `${折}.js`);
  if (折 === 'war') {
    fs.appendFileSync(f, '\n\n' + 中身.join('\n\n') + '\n');
  } else {
    fs.writeFileSync(f, 見出し[折] + '\n\n' + 中身.join('\n\n') + '\n');
  }
}

// 画面には、政務の折を呼ぶための一行を足す
const 取り込み = `import * as 政務 from "../govern/commands.js";
import * as 月送り from "../govern/month.js";
import * as 合戦裁定 from "../govern/war.js";
`;
let 画面本文 = lines.join('\n').replace(/政務\.advanceMonth/g, '月送り.advanceMonth')
  .replace(/政務\.resolveOffscreen/g, '合戦裁定.resolveOffscreen');
画面本文 = 取り込み + 画面本文;
fs.writeFileSync(画面, 画面本文);

// 足りない取り込みを補う
const owner = buildIndex();
for (const f of ['src/govern/commands.js', 'src/govern/month.js', 'src/govern/war.js', 'src/ui/MapScreen.jsx']) {
  const n = fixImports(path.join(ROOT, f), owner);
  console.log(`${f}: 取り込み${n}個を補った`);
}
console.log('画面に残った行:', 画面本文.split('\n').length);
