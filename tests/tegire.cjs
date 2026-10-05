/* 手切れ（GDD 12.1 / 12.2）。

   結んだ約束を自ら切る道が無かった。同盟も不可侵も、結んだら最後、相手の城へ
   兵を出すまで切れない。旗の下に入れた家を攻めるには解き放つほかなく、それは
   威信の上がる善行なので、攻める気で解いても咎めが無い。

   遊ぶ側の申し出は三つあった。
     一、臣従大名を攻めようとすると、兵だけがその城に吸収される
     二、外交関係を手切れできるようにしてほしい
     三、親睦値の低い従属・臣従大名も反旗を翻さなかった

   一は、旗の下の城へ兵を出せば後詰（援軍）と読まれるからである。攻めるには
   まず手切れが要る――その道を開いた。三は、AIの「独立」が、遊ぶ側が主の
   ときだけ「申し入れ」に回っていたからである。断ればそれまでであった。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'tegire-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState, 同じ旗の下, underMyBanner, relKey, relOf } from "../src/core/state.js";\n'
+ 'export { 外交を結ぶ } from "../src/govern/commands.js";\n'
+ 'export { 外交の采配 } from "../src/govern/aiDiplo.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { DIPLO } from "../src/data/diplo.js";\n');
const out = path.join(ROOT, 'build', 'tegire.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

let 種 = 0x31F7;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* 間柄を直に置く。結ぶ筋（石高差・信用）は外交の試験が見ているので、
   ここでは「切れるか」だけを測る。 */
const 間柄を置く = (s, a, b, state, { master = null, trust = 60 } = {}) => {
  s.relations[A.relKey(a, b)] = { trust, state, until: null, master };
  return s.relations[A.relKey(a, b)];
};

console.log('── 一　手切れという下知が立つ');
{
  確('下知の一覧に手切れがある', !!A.DIPLO.find((d) => d.key === '手切れ'));
  const d = A.DIPLO.find((d2) => d2.key === '手切れ');
  const 問 = (state, 下) => d.need({ state, trust: 50 }, {}, {}, 下);
  確('同盟は切れる', 問('同盟', null) === true);
  確('不可侵も切れる', 問('不可侵', null) === true);
  確('中立は切るものがない', 問('中立', null) === false);
  確('旗の下は、上からなら切れる', 問('臣従', false) === true);
  確('下からは切れない（それは独立である）', 問('臣従', true) === false);
}

console.log('\n── 二　同盟を手切れすれば、敵に戻る');
{
  const s = A.initState('oda');
  const 相 = Object.keys(s.factions).find((x) => x !== 'oda');
  間柄を置く(s, 'oda', 相, '同盟', { trust: 70 });
  const 前威 = s.factions.oda.prestige == null ? 50 : s.factions.oda.prestige;
  const r = A.外交を結ぶ(s, 'oda', 相, '手切れ', null);
  const rel = A.relOf(s, 'oda', 相);
  確('手切れが通る', r.ok, r.文 || r.why);
  確('敵対に戻る', rel.state === '敵対', `${rel.state}`);
  確('信用は尽きる', Math.round(rel.trust) === 0, `${Math.round(rel.trust)}`);
  確('威信が下がる', (s.factions.oda.prestige || 0) < 前威,
    `${Math.round(前威)} → ${Math.round(s.factions.oda.prestige)}`);
}

console.log('\n── 三　旗の下の家を手切れすれば、旗を離れる（攻められるようになる）');
{
  const s = A.initState('oda');
  const 臣 = Object.keys(s.factions).find((x) => x !== 'oda' && s.castles.some((c) => c.faction === x));
  間柄を置く(s, 'oda', 臣, '臣従', { master: 'oda', trust: 40 });
  確('手切れの前は旗の下にある', A.underMyBanner(s, 'oda', 臣) === true);
  確('その城は味方の城と読まれる', A.同じ旗の下(s, 'oda', 臣) === true,
    '（だから兵を出しても後詰になり、兵だけ吸われていた）');
  const r = A.外交を結ぶ(s, 'oda', 臣, '手切れ', null);
  確('手切れが通る', r.ok, r.文 || r.why);
  確('旗の下から外れる', A.underMyBanner(s, 'oda', 臣) === false);
  確('もう味方の城ではない（攻められる）', A.同じ旗の下(s, 'oda', 臣) === false);
  確('主の札も外れる', !A.relOf(s, 'oda', 臣).master);
}

console.log('\n── 四　誼の尽きた旗の下の家は、遊ぶ側が主でも旗を翻す');
{
  /* 独立は一方的な行いである。申し入れに回してはならない。 */
  let 翻った = 0, 申し入れ = 0;
  for (let i = 0; i < 40; i++) {
    const s = A.initState('oda');
    const 臣 = Object.keys(s.factions).find((x) => x !== 'oda' && s.castles.some((c) => c.faction === x));
    間柄を置く(s, 'oda', 臣, '臣従', { master: 'oda', trust: 2 });
    for (let m = 0; m < 6; m++) {
      A.外交の采配(s, 臣, { 告げる: () => {}, 申し入れる: () => { 申し入れ++; } });
      if (A.relOf(s, 'oda', 臣).state === '敵対') { 翻った++; break; }
    }
  }
  確('誼が尽きれば旗を翻す', 翻った > 0, `四十度のうち ${翻った} 度`);
  確('独立は申し入れに回らない（断れる形にしない）', 申し入れ === 0, `申し入れ ${申し入れ} 度`);
}

console.log('\n── 五　旗の下の誼は、下が肥えれば薄れる');
{
  const s = A.initState('oda');
  /* 遊ぶ側を小さな家にして、旗の下に大きな家を置く――下が主に並ぶ形を作る。 */
  const 大 = Object.keys(s.factions)
    .map((f) => ({ f, koku: s.castles.filter((c) => c.faction === f).reduce((a, c) => a + c.koku, 0) }))
    .sort((a, b) => b.koku - a.koku)[0].f;
  const 主 = Object.keys(s.factions).find((x) => x !== 大 && s.castles.some((c) => c.faction === x));
  const r = 間柄を置く(s, 主, 大, '臣従', { master: 主, trust: 45 });
  const 前 = r.trust;
  let t = s;
  for (let m = 0; m < 6; m++) t = A.advanceMonth(t, t);
  const 後 = A.relOf(t, 主, 大).trust;
  確('主より大きい家の誼は薄れていく', 後 < 前 || A.relOf(t, 主, 大).state === '敵対',
    `信用 ${Math.round(前)} → ${Math.round(後)}（${A.relOf(t, 主, 大).state}）`);
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
