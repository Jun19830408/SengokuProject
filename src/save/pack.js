/* ==========================================================================
   記録の包み方（圧しと解し）

   盤ひとつを文字に直すと一.二六MBある。将が七百八十一人、城が二百四十九、
   家と家の間柄が六千三百通り――どれも要るものである。

   ところがブラウザに預けられる量には限りがあり、iPhone の Safari では
   五MBほどしかない。枠は七つ（自動・一〜五・救出）あるから、そのままでは
   八.六MBとなって収まらない。三つ四つ収めたところで棚が一杯になり、
   以後は何を押しても「記録できない環境」と出る。記録そのものが取れなくなる。

   そこで、収める前に文字を圧す。同じ並びを辞書に写して短くするやり方
   （LZW）である。JSON は鍵の名が何度も出てくるので、よく縮む。
   一.二六MBが百二十KBほどになるので、七枠でも一MBに満たない。

   扱いを易しくするため、まず文字を UTF-8 の一連の byte に直してから圧す。
   こうすれば辞書に入るのは 0〜255 の値だけになり、漢字も絵文字も同じ扱いで
   済む。文字のまま扱うと、二百五十六以上の符号をどう辞書に入れるかで
   圧す側と解す側が食い違い、戻らなくなる（実際に一度そうなった）。

   出来上がった byte 列は、十五ビットずつ文字に詰めて文字列にする。
   0x20 から始めれば、どの置き場でもそのまま預けられる。

   解すときは頭の印を見て判ずる。印が無ければ、昔ながらの生の JSON として
   読む。これまでの記録が読めなくなることは無い。

   ここは記録の根であるから、試験で厳しく検める（tests/tsutsumi.cjs）。
   ========================================================================== */

export const 圧しの印 = "z1:";

const 終 = 256;                  // 終わりの印
const 幅 = 15;                   // 一文字に詰めるビット数
const 底 = 32;                   // 文字の始まり（制御文字を避ける）

function 文をbyteに(文) {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(文);
  // TextEncoder の無い所（古い環境）のための備え
  const out = [];
  for (let i = 0; i < 文.length; i++) {
    let c = 文.codePointAt(i);
    if (c > 0xffff) i++;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(out);
}

function byteを文に(b) {
  if (typeof TextDecoder !== "undefined") return new TextDecoder().decode(b);
  let s = "";
  for (let i = 0; i < b.length;) {
    const c = b[i];
    if (c < 0x80) { s += String.fromCharCode(c); i += 1; }
    else if (c < 0xe0) { s += String.fromCharCode(((c & 31) << 6) | (b[i + 1] & 63)); i += 2; }
    else if (c < 0xf0) { s += String.fromCharCode(((c & 15) << 12) | ((b[i + 1] & 63) << 6) | (b[i + 2] & 63)); i += 3; }
    else {
      const cp = ((c & 7) << 18) | ((b[i + 1] & 63) << 12) | ((b[i + 2] & 63) << 6) | (b[i + 3] & 63);
      s += String.fromCodePoint(cp); i += 4;
    }
  }
  return s;
}

export function 圧す(文) {
  if (文 == null) return "";
  const b = 文をbyteに(文);
  const 出 = [];
  let 溜 = 0, 溜数 = 0;
  const 吐く = (値, ビット) => {
    for (let i = ビット - 1; i >= 0; i--) {
      溜 = (溜 << 1) | ((値 >> i) & 1);
      if (++溜数 === 幅) { 出.push(String.fromCharCode(溜 + 底)); 溜 = 0; 溜数 = 0; }
    }
  };
  const 辞書 = new Map();          // 前の符号 × 256 ＋ byte → 新しい符号
  let 次 = 257, ビット = 9;
  let 前 = -1;
  for (let i = 0; i < b.length; i++) {
    const x = b[i];
    if (前 < 0) { 前 = x; continue; }
    const 鍵 = 前 * 256 + x;
    const 有 = 辞書.get(鍵);
    if (有 !== undefined) { 前 = 有; continue; }
    吐く(前, ビット);
    if (次 < 65536) {
      辞書.set(鍵, 次++);
      if (次 === (1 << ビット) && ビット < 16) ビット++;
    }
    前 = x;
  }
  if (前 >= 0) 吐く(前, ビット);
  吐く(終, ビット);
  while (溜数 > 0) { 溜 <<= 1; if (++溜数 === 幅) { 出.push(String.fromCharCode(溜 + 底)); 溜数 = 0; } }
  return 圧しの印 + 出.join("");
}

export function 解す(文) {
  if (文 == null) return null;
  if (typeof 文 !== "string" || !文.startsWith(圧しの印)) return 文;   // 昔ながらの生の記録
  const 体 = 文.slice(圧しの印.length);
  let 位 = 0, 溜 = 0, 溜数 = 0;
  const 読む = (ビット) => {
    let v = 0;
    for (let i = 0; i < ビット; i++) {
      if (溜数 === 0) {
        if (位 >= 体.length) return -1;
        溜 = 体.charCodeAt(位++) - 底; 溜数 = 幅;
      }
      溜数--;
      v = (v << 1) | ((溜 >> 溜数) & 1);
    }
    return v;
  };
  // 辞書は「前の符号」と「末尾の byte」と「長さ」で持つ。並びは後ろから辿って組み立てる。
  const 親 = new Int32Array(65536).fill(-1);
  const 尾 = new Uint8Array(65536);
  const 丈 = new Int32Array(65536);
  for (let i = 0; i < 256; i++) { 尾[i] = i; 丈[i] = 1; }
  let 次 = 257, ビット = 9;
  const 塊 = [];
  let 総 = 0;
  const 組む = (符) => {
    const n = 丈[符];
    const a = new Uint8Array(n);
    let k = n - 1, c = 符;
    while (c >= 0 && k >= 0) { a[k--] = 尾[c]; c = 親[c]; }
    return a;
  };
  let 前 = -1, 前の並び = null;
  for (;;) {
    const v = 読む(ビット);
    if (v < 0 || v === 終) break;
    let 並び;
    if (v < 256 || 丈[v] > 0) 並び = 組む(v);
    else if (前 >= 0 && v === 次 && 前の並び) {
      並び = new Uint8Array(前の並び.length + 1);
      並び.set(前の並び); 並び[前の並び.length] = 前の並び[0];
    } else break;                                   // 壊れている
    塊.push(並び); 総 += 並び.length;
    /* 幅の増やし方は、圧す側と一歩ずれる。解す側は辞書を一つ遅れて作るので、
       「次に入れる符号が、いまの幅で表せなくなる一つ手前」で増やさねばならない。
       ここを揃えないと、二百五十六個目の辞書ができた瞬間から読みが狂う。 */
    if (前 >= 0 && 次 < 65536) {
      親[次] = 前; 尾[次] = 並び[0]; 丈[次] = 丈[前] + 1;
      次++;
      if (次 + 1 === (1 << ビット) && ビット < 16) ビット++;
    }
    前 = v < 65536 && (v < 256 || 丈[v] > 0) ? v : 次 - 1;
    前の並び = 並び;
  }
  const b = new Uint8Array(総);
  let p = 0;
  for (const a of 塊) { b.set(a, p); p += a.length; }
  return byteを文に(b);
}
