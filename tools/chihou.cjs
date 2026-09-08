/* 地方の絞り ── 三十年四十年で、各地方が幾つの勢力に絞られたかを測る物差し。

   狙いはこうである（作者の言）。

     三十〜四十年で、九州・四国・中国・畿内〜北陸・中部・関東・奥羽の各地方に、
     最大三家ほどが争っている状態になっていてほしい。臣従・従属は主家に数える。

   数え方を決めておかねば、直したかどうかも分からない。ここでは

     「その地方の城の八割を覆うのに、幾つの勢力が要るか」

   を絞りの目安とする。一家が八割を持てば一、三家で八割なら三である。飛び地の
   小勢力がいくつ残っていても、八割を覆う数には響かない――「有力な大勢力が
   幾つ争っているか」を見たいのだから、これでよい。

   勢力は主家でまとめる。臣従・従属の家は、その主の勢力として数える。

   使い方:
     node tools/chihou.cjs            … 種一つ、四十年
     node tools/chihou.cjs 40 3       … 四十年を三つの種で
     --sonomama … 束ね直しを省く */
const path = require('path');
const { buildHarness } = require('./bundle.cjs');

const 引数 = process.argv.slice(2);
const 数字 = 引数.filter((x) => /^\d+$/.test(x)).map(Number);
const 年数 = 数字[0] || 40;
const 種の数 = 数字[1] || 1;
if (require.main === module && !引数.includes('--sonomama')) buildHarness('split');

const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const 巡検 = require(path.join(__dirname, 'junken.cjs'));
const { REGIONS } = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

/* 勢力のまとまり。臣従・従属は主家に数える。

   はじめ 主家(s, f) と呼んでいたが、これは組（a と b）を取る関数で、家を一つ
   渡しても主は返らない。束ねているつもりで、まったく束ねていなかった。
   膝を屈した家がそのまま別勢力として数えられていたので、絞りの値は
   実際より大きく出ていた。主を探す（state.js）で辿り直す。 */
const 束ねる = (s, fid) => {
  let f = fid;
  const 見た = new Set([f]);
  for (let i = 0; i < 6; i++) {                 // 主の主まで辿る。輪を踏まぬよう限りを置く
    const 主 = H.主を探す(s, f);
    if (!主 || 見た.has(主)) break;
    見た.add(主); f = 主;
  }
  return f;
};

/* その地方の城の八割を覆うのに要る勢力の数。 */
const 地方の絞り = (s, 地方) => {
  const 城 = s.castles.filter((c) => 地方.kuni.includes(c.kuni));
  if (!城.length) return null;
  const 勢 = new Map();
  for (const c of 城) {
    const f = 束ねる(s, c.faction);
    勢.set(f, (勢.get(f) || 0) + 1);
  }
  const 並 = [...勢.entries()].sort((a, z) => z[1] - a[1]);
  let 積 = 0, 数 = 0;
  for (const [, n] of 並) { 積 += n; 数++; if (積 >= 城.length * 0.8) break; }
  return { 城数: 城.length, 要る数: 数, 勢力数: 並.length, 頭: 並.slice(0, 3), 並 };
};

const 名 = (s, fid) => (s.factions[fid] || {}).name || fid;

const 走らせる = (種, 年数, 刻み = 10) => {
  巡検.賽を据える(種);
  let s = H.initState('oda'); s.autoPlay = true;
  const 節 = [];
  const 記す = () => {
    const 行 = { 年: s.year, 地方: [] };
    for (const r of REGIONS) {
      const q = 地方の絞り(s, r);
      if (q) 行.地方.push({ 名: r.name, ...q });
    }
    節.push(行);
  };
  記す();
  for (let i = 0; i < 年数 * 12; i++) {
    if (s.warSettle) {
      const w = s.warSettle;
      try { H.滅んだ家を始末する(s, w.faction, w.winner, w.castleId); } catch (e) { /* 進む */ }
      s.warSettle = null;
    }
    s = H.advanceMonth(s);
    // 着いた軍と行き合いの始末は画面が回している。巡検と同じく、ここで捌く
    for (let k = 0; k < 60 && (s.clashes || []).length; k++) s = H.resolveClashOffscreen(s);
    for (let k = 0; k < 120 && (s.pendingArrivals || []).length; k++) {
      const id = s.pendingArrivals[0];
      const a = (s.armies || []).find((x) => x.id === id);
      const 的 = a && s.castles.find((c) => c.id === a.at);
      if (!a || !的) { s.pendingArrivals = s.pendingArrivals.slice(1); continue; }
      s = H.resolveOffscreen(s, a.id, 的.id);
    }
    if (i % (刻み * 12) === 刻み * 12 - 1) 記す();
  }
  記す();
  return { 節, s };
};

if (require.main === module) {
  console.log(`地方の絞り　種 ${種の数} 通り × ${年数} 年`);
  console.log('（数字は「その地方の城の八割を覆うのに要る勢力の数」。狙いは三以下）\n');
  const 種ら = Array.from({ length: 種の数 }, (_, i) => 0x51000 + i * 7919);
  const 集 = new Map();
  for (const 種 of 種ら) {
    const t0 = Date.now();
    const { 節, s } = 走らせる(種, 年数);
    console.log(`── 種 ${種}　（${Math.round((Date.now() - t0) / 1000)}秒）`);
    const 幅 = 10;
    console.log('  年' + REGIONS.map((r) => r.name.padStart(4)).join('') + '　　残る家');
    for (const 行 of 節) {
      const 家 = new Set(s.castles.map((c) => c.faction)).size;
      console.log(`  ${行.年}` + REGIONS.map((r) => {
        const q = 行.地方.find((x) => x.名 === r.name);
        return String(q ? q.要る数 : '-').padStart(4);
      }).join(''));
      for (const q of 行.地方) {
        const 鍵 = `${行.年}|${q.名}`;
        if (!集.has(鍵)) 集.set(鍵, []);
        集.get(鍵).push(q.要る数);
      }
    }
    const 終 = 節[節.length - 1];
    console.log('  ── 終わりの顔ぶれ ──');
    for (const q of 終.地方) {
      console.log(`    ${q.名}（${q.城数}城）　${q.頭.map(([f, n]) => `${名(s, f)} ${n}城`).join('／')}`
        + `　　八割に要る勢力 ${q.要る数}　勢力の総数 ${q.勢力数}`);
    }
    console.log('');
  }
  if (種の数 > 1) {
    console.log('── 種をならした値 ──');
    const 年ら = [...new Set([...集.keys()].map((k) => k.split('|')[0]))];
    console.log('  年' + REGIONS.map((r) => r.name.padStart(6)).join(''));
    for (const y of 年ら) {
      console.log(`  ${y}` + REGIONS.map((r) => {
        const v = 集.get(`${y}|${r.name}`) || [];
        return (v.length ? (v.reduce((a, x) => a + x, 0) / v.length).toFixed(1) : '-').padStart(6);
      }).join(''));
    }
  }
  console.log('');
  console.log('エラー: なし');
}

module.exports = { 地方の絞り, 束ねる, 走らせる };
