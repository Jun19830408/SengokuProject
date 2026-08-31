#!/usr/bin/env node
/* 資料の表を JSON に落とす（build/shiryo.json）。
   Word と PowerPoint は python で組むので、そこへ渡す橋である。
   出どころは src/data/shiryo.js のままで、ここでは形を変えるだけ。 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const ROOT = path.join(__dirname, '..');
const 口 = path.join(ROOT, 'build', 'shiryo-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(口,
  'export { 資料, 題名, 副題, 資料名, 添え書き } from "../src/data/shiryo.js";\n');
const 束 = path.join(ROOT, 'build', 'shiryo.cjs');
esbuild.buildSync({ entryPoints: [口], bundle: true, format: 'cjs', outfile: 束, logLevel: 'error' });
const M = require(束);
const out = path.join(ROOT, 'build', 'shiryo.json');
fs.writeFileSync(out, JSON.stringify({
  題名: M.題名, 副題: M.副題, 資料名: M.資料名, 添え書き: M.添え書き, 資料: M.資料,
}, null, 1));
console.log('build/shiryo.json　章' + M.資料.length);
