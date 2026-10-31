/* 出奔して自立する（GDD 6.1・core/jiritsu.js）。

   遊ぶ側の申し出は「出奔した場合、武将のいない城に入り独立するのはどうか」であった。
     一、守る将のいない近くの城があれば、そこに入って家を興す
     二、興した家は旧主と敵対し、城と兵を持ち、その者が当主になる
     三、将のいる城や、遠い城、格の届かぬ者では興らない（もとのとおり他家へ走る）
     四、月送りの中で起き、興った家はそのあとも月を送れ、記録を読み直しても残る */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'jiritsu-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { 自立に入る城, 自立する } from "../src/core/jiritsu.js";\n'
+ 'export { initState, relOf, migrateSave } from "../src/core/state.js";\n'
+ 'export { canHoldCastle } from "../src/core/rank.js";\n'
+ 'export { ROAD_ADJ } from "../src/core/paths.js";\n'
+ 'export { 画面なしの一月 } from "../tools/bench-entry.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n');
const out = path.join(ROOT, 'build', 'jiritsu.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error' });

let 種 = 0x7171;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* 盤をこしらえる。家臣の居る城の隣に、将のいない城を一つ空けておく。 */
function 盤() {
  const s = A.initState('oda');
  for (const k of ['尾張', '美濃']) for (const c of s.castles.filter((x) => x.kuni === k)) c.faction = 'oda';
  const 主 = s.generals.find((g) => g.faction === 'oda' && g.lord);
  for (const c of s.castles.filter((x) => x.faction === 'oda')) {
    const 隣 = (A.ROAD_ADJ[c.id] || []).map((id) => s.castles.find((x) => x.id === id))
      .filter((x) => x && x.faction === 'oda' && x.id !== 主.at);
    for (const b of 隣) {
      const 者 = s.generals.find((g) => g.faction === 'oda' && !g.lord && g.at === c.id && A.canHoldCastle(g, s, b));
      if (!者) continue;
      for (const g of s.generals) if (g.at === b.id) g.at = c.id;     // 隣の城を空ける
      s.factions.oda.本拠 = 主.at;
      return { s, 者, 空: b, 居: c };
    }
  }
  throw new Error('盤をこしらえられない');
}

console.log('\n── 一　将のいない近くの城に入って家を興す');
{
  const { s, 者, 空 } = 盤();
  const 城 = A.自立に入る城(s, 者);
  確('入る城が見つかる', !!城 && 城.id === 空.id, 城 ? 城.name : 'なし');
  const 兵 = 空.local;
  const id = A.自立する(s, 者, 城);
  const f = s.factions[id];
  確('新しい家が立つ', !!f && /家/.test(f.name), f ? `${f.name}（${f.color}）` : '');
  確('その者が当主になる', 者.lord && 者.faction === id && 者.at === 空.id);
  確('城と兵を持つ', 空.faction === id && 空.lordId === 者.id && 空.local === 兵, `${空.name} 兵${空.local}`);
  確('旧主とは敵対', A.relOf(s, id, 'oda').state === '敵対');
  確('ほかの家とは中立', A.relOf(s, id, 'takeda').state === '中立');
  確('本拠はその城', f.本拠 === 空.id);
  確('名の色はほかの家と紛れない', Object.values(s.factions).filter((x) => x.color === f.color).length === 1);

  /* 興った家はそのあとも月を送れる */
  let t = s;
  let 落ちた = null;
  try { for (let i = 0; i < 12; i++) t = A.画面なしの一月(t); } catch (e) { 落ちた = e; }
  確('興った家のいる盤で一年送れる', !落ちた, 落ちた ? String(落ちた).slice(0, 120) : `${t.year}年${t.month}月`);
  /* 記録を読み直しても家は残る */
  const 読 = A.migrateSave(JSON.parse(JSON.stringify(s)));
  確('記録を読み直しても家は残る', !!(読.factions || {})[id] && 読.castles.find((c) => c.id === 空.id).faction === id);
}

console.log('\n── 二　興らない場合');
{
  const { s, 者, 空, 居 } = 盤();
  const 他 = s.generals.find((g) => g.faction === 'oda' && !g.lord && g.id !== 者.id);
  他.at = 空.id;
  確('将のいる城には入らない', A.自立に入る城(s, 者) === null || A.自立に入る城(s, 者).id !== 空.id);
  他.at = 居.id;
  const 弱 = s.generals.find((g) => g.faction === 'oda' && !g.lord && !A.canHoldCastle(g, s, 空));
  if (弱) { 弱.at = 居.id; }
  確('城主の格に届かぬ者は興せない', !!弱 && A.自立に入る城(s, 弱) === null, 弱 ? 弱.name : '格の届かぬ者がいない');
  const 当 = s.generals.find((g) => g.faction === 'oda' && g.lord);
  確('当主は出奔しない', A.自立に入る城(s, 当) === null);
}

console.log('\n── 三　月送りの中で起きる');
{
  const { s, 者, 空 } = 盤();
  者.loyal = 0; 者.fief = 0;
  let t = s;
  let 起 = null;
  for (let i = 0; i < 60 && !起; i++) {
    const r = t.generals.find((g) => g.id === 者.id);
    if (r) { r.loyal = 0; r.fief = 0; }
    t = A.advanceMonth(t, t);
    起 = (t.chronicle || []).find((x) => x.text.includes(`${者.name}が`) && x.text.includes('に入って自立した'));
  }
  確('出奔した者が城に入って自立する', !!起, 起 ? `${起.y}年${起.m}月　${起.text}` : 'なし');
  確('旧主の城が一つ減り、新しい家の城になる', !!起 && t.castles.find((c) => c.id === 空.id).faction !== 'oda');
  /* 年代記には一度だけ載る（月が途中で改まるので、前の月と今月に二度並んでいた） */
  t = A.advanceMonth(t, t);
  const 数 = (t.chronicle || []).filter((x) => x.text.includes(`${者.name}が`) && x.text.includes('に入って自立した')).length;
  確('自立の報せは年代記に一度だけ載る', 数 === 1, `${数}行`);
}

console.log(`\nエラー: ${咎.length ? 咎.join(' | ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
