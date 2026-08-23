/* 旗の下（GDD 12.2）。従属と臣従の掟。

   膝を屈するのは、その家の一生を決める。二人の主は持てず、主を替えるには
   いったん旗を翻さねばならない。主に付けば、それまでの誼は解け、以後の外交は
   主のものに従う（自ら結べるのは不可侵まで）。毎月の実入りからは貢を納める。

   他家がこれを勝手に決めてはならない。遊ぶ側へは申し入れ、諾否を待つ。
   （尾張と美濃を平らげた途端に神戸と北畠が勝手に臣従してきた、という声から） */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'hata-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState, relOf, relKey, 主を探す, factionKoku, 旗の下の家 } from "../src/core/state.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { 外交を結ぶ } from "../src/govern/commands.js";\n'
+ 'export { 外交の采配 } from "../src/govern/aiDiplo.js";\n'
+ 'export { 婚姻できるか, 家の姫 } from "../src/core/hime.js";\n');
const out = path.join(ROOT, 'build', 'hata.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 11;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const 置 = (s, a, b, st, tr, 主) => { s.relations[A.relKey(a, b)] = { trust: tr, state: st, until: null, master: 主 || null }; };

/* ------------------------------------------- 一、旗の下に入るということ */
{
  const s = A.initState('oda');
  for (const f of Object.values(s.factions)) f.gold = 20000;
  置(s, 'mizuno', 'saito', '同盟', 80);
  置(s, 'mizuno', 'imagawa', '不可侵', 70);
  置(s, 'mizuno', 'oda', '中立', 70);
  const r = A.外交を結ぶ(s, 'mizuno', 'oda', '従属する');
  確('小さい家は大きい家に従属できる', r.ok && A.relOf(s, 'mizuno', 'oda').state === '従属',
    A.relOf(s, 'mizuno', 'oda').state);
  確('上下の間柄に期限はない', A.relOf(s, 'mizuno', 'oda').until === null, '');
  確('どちらが上かを書き留める', A.relOf(s, 'mizuno', 'oda').master === 'oda', '');
  確('それまでの同盟は解ける', A.relOf(s, 'mizuno', 'saito').state === '中立',
    A.relOf(s, 'mizuno', 'saito').state);
  確('それまでの不可侵も解ける', A.relOf(s, 'mizuno', 'imagawa').state === '中立',
    A.relOf(s, 'mizuno', 'imagawa').state);
  確('主が定まる', A.主を探す(s, 'mizuno') === 'oda', A.主を探す(s, 'mizuno') || 'なし');
  確('主の側からは旗の下の家が見える', A.旗の下の家(s, 'oda').includes('mizuno'), '');

  // 二人の主は持てない
  const r2 = A.外交を結ぶ(s, 'mizuno', 'imagawa', '従属する');
  確('二人の主は持てない', !r2.ok && A.relOf(s, 'mizuno', 'imagawa').state === '中立', r2.why || '');
  const r3 = A.外交を結ぶ(s, 'imagawa', 'mizuno', '臣従させる');
  確('他家が横から旗の下に入れることもできない', !r3.ok, r3.why || '');

  // 自ら結べるのは不可侵まで
  置(s, 'mizuno', 'kanbe', '中立', 90);
  const r4 = A.外交を結ぶ(s, 'mizuno', 'kanbe', '同盟');
  確('旗の下の家は自ら同盟を結べない', !r4.ok, r4.why || '');
  const r5 = A.外交を結ぶ(s, 'mizuno', 'kanbe', '不可侵');
  確('不可侵までは結べる', r5.ok && A.relOf(s, 'mizuno', 'kanbe').state === '不可侵', r5.why || '');
  置(s, 'oda', 'saito', '敵対', 10);
  const r6 = A.外交を結ぶ(s, 'mizuno', 'saito', '不可侵');
  確('主が敵と見ている家とは結べない', !r6.ok, r6.why || '');

  // 他家からの同盟も入らない
  const r7 = A.外交を結ぶ(s, 'kanbe', 'mizuno', '同盟');
  確('旗の下の家には他家も同盟を持ちかけられない', !r7.ok, r7.why || '');

  // 姫の縁も同じ
  const h = A.家の姫(s, 'mizuno')[0];
  if (h) {
    h.dip = 90;
    確('旗の下の家は姫の縁も結べない', !A.婚姻できるか(s, h, 'kanbe').ok,
      A.婚姻できるか(s, h, 'kanbe').why);
  }

  // 主を替えるには、まず独立
  const r8 = A.外交を結ぶ(s, 'mizuno', 'oda', '独立');
  確('旗を翻せば主から離れる', r8.ok && A.主を探す(s, 'mizuno') === null,
    A.relOf(s, 'mizuno', 'oda').state);
  確('独立の代償は大きい（信用と威信）', A.relOf(s, 'mizuno', 'oda').trust <= 30
    && s.factions.mizuno.prestige <= 38,
    `信用 75→${Math.round(A.relOf(s, 'mizuno', 'oda').trust)}・威信 50→${Math.round(s.factions.mizuno.prestige)}`);
}

/* ------------------------------------------- 二、貢（毎月の実入りから） */
{
  const s = A.initState('oda');
  置(s, 'mizuno', 'oda', '従属', 70, 'oda');
  s.factions.oda.gold = 0; s.factions.mizuno.gold = 0;
  const t = A.advanceMonth(s, s);
  確('旗の下の家は主へ貢を納める', (t.factions.mizuno.貢 || 0) > 0,
    `金${Math.round(t.factions.mizuno.貢 || 0)}貫`);
  確('納めたぶん主の蔵が増える', t.factions.oda.gold > 0, `${Math.round(t.factions.oda.gold)}貫`);
}

/* ------------------------------------------- 三、他家は遊ぶ側に申し入れる */
{
  const s = A.initState('oda');
  s.卓 = '試の卓';
  // 織田を大きくし、水野を細らせて狙う
  for (const c of s.castles.filter((x) => ['yamato', 'ise', 'saito'].includes(x.faction))) c.faction = 'oda';
  const 水城 = s.castles.filter((c) => c.faction === 'mizuno');
  for (const c of 水城.slice(1)) c.faction = 'oda';
  置(s, 'mizuno', 'oda', '中立', 70);
  s.factions.oda.aim = { target: 水城[0].id };
  s.factions.mizuno.gold = 4000;
  let 申 = null, 結 = false;
  for (let i = 0; i < 60 && !申; i++) {
    s.month = (s.month % 12) + 1; if (s.month === 1) s.year++;
    A.外交の采配(s, 'mizuno', { 申し入れる: (x) => { 申 = x; } });
    if (['従属', '臣従'].includes(A.relOf(s, 'mizuno', 'oda').state)) 結 = true;
  }
  確('他家は遊ぶ側に勝手に膝を屈しない', !結, A.relOf(s, 'mizuno', 'oda').state);
  確('そのかわり申し入れてくる', !!申, 申 ? `${申.key}` : '来ない');
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
