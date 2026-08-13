// 折どうしの取り込み（import）を整える道具。
// 「使っているのに取り込んでいない名」を見つけて足す。すでにある行は消さない。
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

/* --------------------------- 注釈と文字列を落とす（名を数え違えぬため） */
function strip(src) {
  let out = '', i = 0, mode = 'code', depth = 0;
  const tpl = [];
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (mode === 'code') {
      if (c === '/' && d === '/') { mode = 'lc'; i += 2; continue; }
      if (c === '/' && d === '*') { mode = 'bc'; i += 2; continue; }
      if (c === "'") { mode = 'sq'; i++; out += ' '; continue; }
      if (c === '"') { mode = 'dq'; i++; out += ' '; continue; }
      if (c === '`') { mode = 'tpl'; i++; out += ' '; continue; }
      if (c === '(' || c === '[' || c === '{') depth++;
      if (c === ')' || c === ']' || c === '}') {
        depth--;
        if (c === '}' && tpl.length && depth === tpl[tpl.length - 1]) { tpl.pop(); mode = 'tpl'; i++; continue; }
      }
      out += c; i++; continue;
    }
    if (mode === 'lc') { if (c === '\n') { mode = 'code'; out += '\n'; } i++; continue; }
    if (mode === 'bc') { if (c === '*' && d === '/') { mode = 'code'; i += 2; continue; } i++; continue; }
    if (mode === 'sq' || mode === 'dq') {
      if (c === '\\') { i += 2; continue; }
      if ((mode === 'sq' && c === "'") || (mode === 'dq' && c === '"')) mode = 'code';
      i++; continue;
    }
    if (mode === 'tpl') {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { mode = 'code'; i++; continue; }
      if (c === '$' && d === '{') { tpl.push(depth); depth++; mode = 'code'; i += 2; out += ' '; continue; }
      i++; continue;
    }
    i++;
  }
  return out;
}

// 性質の参照（obj.name / obj?.name）は名として数えない。
// 名には日本語も使う（旗の下を狙う戦役を落とす、など）。英字だけを見ていては取り逃がす。
const 名の綴り = '[\\p{L}_$][\\p{L}\\p{N}_$]*';
function usedNames(text) {
  const s = strip(text);
  const out = new Set();
  const re = new RegExp(`((?:\\?\\.|\\.)\\s*)?(${名の綴り})`, 'gu');
  let m;
  while ((m = re.exec(s))) if (!m[1]) out.add(m[2]);
  return out;
}

// その折が外へ出している名（export しているもの）を拾う
const EXPORTED = new RegExp(`(?:^|\\n)export\\s+(?:async\\s+)?(const|let|var|function|class)\\s+(${名の綴り})`, 'gu');
function exportedNames(text) {
  const s = strip(text);
  const out = [];
  let m;
  const re = new RegExp(EXPORTED.source, 'gu');
  while ((m = re.exec(s))) {
    out.push(m[2]);
    // 一文で幾つも宣言している分（const A = 1, B = 2;）も拾う
    if (m[1] !== 'function' && m[1] !== 'class') {
      let i = re.lastIndex, depth = 0, expect = false;
      while (i < s.length) {
        const c = s[i];
        if (c === '(' || c === '[' || c === '{') { depth++; i++; continue; }
        if (c === ')' || c === ']' || c === '}') { depth--; i++; continue; }
        if (depth === 0 && c === ';') break;
        if (depth === 0 && c === ',') {
          const nm = s.slice(i + 1).match(new RegExp(`^\\s*(${名の綴り})`, 'u'));
          if (nm) out.push(nm[1]);
          i++; continue;
        }
        i++;
      }
    }
  }
  return [...new Set(out)];
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

// 折ごとの「出している名」の索引を作る
function buildIndex() {
  const owner = {};
  for (const f of walk(SRC)) {
    if (f.endsWith('index.jsx')) continue;
    const t = fs.readFileSync(f, 'utf8');
    for (const n of exportedNames(t)) owner[n] = f;
  }
  return owner;
}

// すでに取り込んでいる名を拾う
function importedNames(text) {
  const out = new Set();
  const re = /^import\s+(?:\*\s+as\s+([^\s]+)|(?:React\s*,\s*)?(?:\{([^}]*)\}|([\w$]+)))\s+from/gm;
  let m;
  while ((m = re.exec(text))) {
    if (m[1]) out.add(m[1]);                       // import * as 名 from …
    if (m[2]) for (const n of m[2].split(',')) { const s = n.trim().split(/\s+as\s+/).pop(); if (s) out.add(s); }
    if (m[3]) out.add(m[3]);
    if (/^import\s+React/.test(m[0])) out.add('React');
  }
  return out;
}

const rel = (from, to) => {
  let p = path.relative(path.dirname(from), to);
  if (!p.startsWith('.')) p = './' + p;
  return p;
};

// 一つの折の取り込みを整える。足りない分だけ足す。
function fixImports(file, owner) {
  const text = fs.readFileSync(file, 'utf8');
  const already = importedNames(text);
  const body = text.replace(/^(import[^\n]*\n)+/, '');
  const defined = new Set(exportedNames(text));
  // その折の中で名づけているもの。奥まった処理の中の名も数える。
  // 同じ名が折の中にあるなら、外から取り込んではならない（取り違えのもと）。
  for (const m of strip(body).matchAll(new RegExp(`(?:const|let|var|function|class)\\s+(${名の綴り})`, 'gu'))) defined.add(m[1]);

  const need = {};
  for (const n of usedNames(body)) {
    if (already.has(n) || defined.has(n)) continue;
    const o = owner[n];
    if (!o || o === file) continue;
    (need[rel(file, o)] ||= new Set()).add(n);
  }
  if (!Object.keys(need).length) return 0;

  const add = Object.keys(need).sort()
    .map((p) => `import { ${[...need[p]].sort().join(', ')} } from "${p}";`).join('\n');
  const head = (text.match(/^(import[^\n]*\n)+/) || [''])[0];
  fs.writeFileSync(file, head + add + '\n' + text.slice(head.length));
  return Object.values(need).reduce((a, s) => a + s.size, 0);
}

if (require.main === module) {
  const owner = buildIndex();
  let 総数 = 0;
  for (const f of walk(SRC)) {
    const n = fixImports(f, owner);
    if (n) { console.log(`${path.relative(ROOT, f)}: ${n}個の取り込みを足した`); 総数 += n; }
  }
  console.log(総数 ? `合わせて${総数}個` : '足すべき取り込みはなかった');
}

module.exports = { buildIndex, fixImports, usedNames, exportedNames, strip, walk, SRC, ROOT };
