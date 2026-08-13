// 折を一つに束ね直す道具。試験と書き出しの双方から呼ぶ。
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');

// 試験用の包みを束ねる。which は "split"（分割後）か "orig"（原本）。
function buildHarness(which = 'split') {
  const entry = path.join(ROOT, 'tools', which === 'orig' ? 'harness-orig.jsx' : 'harness.jsx');
  const out = path.join(ROOT, 'build', which === 'orig' ? 'harness-orig.cjs' : 'harness.cjs');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  esbuild.buildSync({
    entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
    loader: { '.jsx': 'jsx' },
    define: { 'process.env.NODE_ENV': '"development"' },
    logLevel: 'error',
  });
  return out;
}

module.exports = { buildHarness, ROOT };
