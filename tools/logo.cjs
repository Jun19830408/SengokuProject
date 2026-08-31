#!/usr/bin/env node
/* ==========================================================================
   ロゴの SVG を、遊びの中から使える形（src/data/logo.js）に写す。

   遊びは一枚の HTML にまとめて配るので、外のファイルを見に行かせられない。
   ゆえに SVG の中身をそのまま字として持たせる。

   出どころは src/assets/logo/*.svg である。あちらを直したら、これを走らせて
   写し直すこと。

     node tools/logo.cjs
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const 蔵 = path.join(ROOT, 'src', 'assets', 'logo');

const 読む = (name) => fs.readFileSync(path.join(蔵, name), 'utf8')
  .replace(/\n\s*/g, ' ')          // 一行にまとめる（束ねたときの嵩を減らす）
  .replace(/'/g, "\\'")
  .trim();

const 出 = `/* ==========================================================================
   ロゴ（自動生成）

   tools/logo.cjs が src/assets/logo/*.svg から写したものである。
   手で書き換えないこと。直すなら SVG のほうを直し、走らせ直す。

   使い分けの決まり（作者の仕様書より）
     百二十ピクセル以上 … 字ありの 印章 を使う
     百二十ピクセル未満 … 字なしの 印 を使う（字が潰れるため）
     横に置くとき　　　 … 題字 を使う
   縦横の比を変えぬこと。駒の形を変えぬこと。色を変えぬこと。
   ========================================================================== */

export const 墨 = "#1C1E22";        // 地
export const 紙 = "#F4F1E8";        // 駒・字の抜き
export const 藍 = "#2F5D8C";        // 味方
export const 朱 = "#B0483C";        // 敵

export const 印章 = '${読む('sengokuban-seal.svg')}';
export const 印 = '${読む('sengokuban-mark.svg')}';
export const 題字 = '${読む('sengokuban-title.svg')}';
export const 題字紙 = '${読む('sengokuban-title-onpaper.svg')}';

/* 画像として貼りたいときの形。data URI にしておけば img の src に直に置ける。 */
export const 絵にする = (svg) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
`;

fs.writeFileSync(path.join(ROOT, 'src', 'data', 'logo.js'), 出);
console.log('src/data/logo.js を書いた（' + 出.length + ' 字）');
