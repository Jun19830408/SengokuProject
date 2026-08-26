/* 盤の検め ── 城と国と道（GDD 7.1 / 12.2）。

   城と大名家を増やしていくにあたって作った試験である。武将を足すときに
   tests/bushou.cjs が幾度も写し違いを捕まえたのと同じ理で、城を足すときも
   目で見比べていては必ず漏れる。

   城には十七の欄がある（石高・最大石高・上限・人口・兵糧・防備・商・鉱・
   耐久・在地兵・練度・経緯度……）。石高を一つ書き換えれば、それに連なる
   五つの欄も直さねばならない。道は両端の城の id で書くので、城の名を
   改めれば道も切れる。どれも黙って壊れる類のものである。

   国ごとの石高は、慶長三年の検地高を目安に測る。盤の総石高は千二百十一万石
   で、慶長期の千八百六十万石の〇.六五倍にあたる。天文十五年（一五四六）は
   検地の前であり、新田も開かれていないので、この率は妥当と見る。
   国ごとの厚薄はこの率で測り、咎めずに書き出す。増補の折の目安である。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'shiro-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { CASTLES } from "../src/data/castles.js";\n'
+ 'export { ROADS } from "../src/data/roads.js";\n'
+ 'export { FACTIONS } from "../src/data/factions.js";\n'
+ 'export { initState } from "../src/core/state.js";\n');
const out = path.join(ROOT, 'build', 'shiro.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 挙げる = (配) => `${配.length}件 ─ ${配.slice(0, 6).join(' / ')}${配.length > 6 ? ` …ほか${配.length - 6}` : ''}`;
const 無し = (名, 配, 但し = '') => 確(名, 配.length === 0, 配.length ? 挙げる(配) : (但し || 'なし'));

const C = A.CASTLES, R = A.ROADS, F = A.FACTIONS;
const ids = new Set(C.map((c) => c.id));
const 国々 = [...new Set(C.map((c) => c.kuni))];
console.log(`  （城 ${C.length}／国 ${国々.length}／道 ${R.length}本／家 ${Object.keys(F).length}）`);

/* -------------------------------------------------------- 一、城の帳尻 */
{
  const 数 = {};
  for (const c of C) (数[c.id] = 数[c.id] || []).push(c.name);
  無し('城の id が重なっていない', Object.keys(数).filter((k) => 数[k].length > 1)
    .map((k) => `${k}(${数[k].join('・')})`));
  /* 同じ名の城は、国が違えば別の城でありうる。甲斐の勝山城と長門の勝山城、
     美作の岩屋城と筑前の岩屋城は、いずれも実在の別城である。武将の同名を
     家で見分けるのと同じ理で、城は国で見分ける。咎めるのは同じ国の中だけ。
     国を跨いだ同名は、盤の上で紛らわしくはあるので、並べて目に入れておく。 */
  無し('同じ国に同じ名の城が二つない', Object.entries(
    C.reduce((m, c) => { const k = `${c.kuni}/${c.name}`; (m[k] = m[k] || []).push(c.id); return m; }, {}))
    .filter(([, v]) => v.length > 1).map(([k, v]) => `${k}(${v.join(',')})`));
  const 跨城 = Object.entries(
    C.reduce((m, c) => { (m[c.name] = m[c.name] || []).push(`${c.kuni}`); return m; }, {}))
    .filter(([, v]) => v.length > 1);
  console.log(`  （国を跨いだ同名の城 ${跨城.length}組：${跨城.map(([n, v]) => `${n}(${v.join('・')})`).join(' ')}）`);
  無し('持ち主の家が実在する', C.filter((c) => c.faction && !F[c.faction]).map((c) => `${c.name}/${c.faction}`));
  無し('国の名がある', C.filter((c) => !c.kuni).map((c) => c.name));

  /* 石高に連なる欄。書き換えたときに直し忘れると、城が実らなくなったり、
     兵糧だけが桁違いになったりする。既存の書き方は次の比である。 */
  const 崩 = [];
  for (const c of C) {
    if (!(c.koku > 0)) { 崩.push(`${c.name}(石高なし)`); continue; }
    if (!(c.kokuMax >= c.koku)) 崩.push(`${c.name}(最大<現)`);
    if (!(c.kokuCap >= c.kokuMax)) 崩.push(`${c.name}(上限<最大)`);
    for (const [欄, 率] of [['pop', 0.820], ['food', 0.210], ['local', 0.02339]]) {
      const 期 = c.koku * 率;
      if (!(c[欄] >= 期 * 0.7 && c[欄] <= 期 * 1.4)) 崩.push(`${c.name}(${欄} ${c[欄]}／目安${Math.round(期)})`);
    }
  }
  無し('石高に連なる欄（最大・上限・人口・兵糧・在地兵）が釣り合う', 崩);

  無し('防備・商・鉱・耐久・練度が入っている',
    C.filter((c) => !(c.def > 0 && c.comm >= 0 && c.min >= 0 && c.hp > 0 && c.localTrain > 0))
      .map((c) => c.name));
  // 日本の版図（南は琉球、北は蝦夷、西は対馬）
  無し('経緯度が盤の内に収まる',
    C.filter((c) => !(c.lon > 122 && c.lon < 149 && c.lat > 23 && c.lat < 46))
      .map((c) => `${c.name}(${c.lon},${c.lat})`));
}

/* ---------------------------------------------------------- 二、道の帳尻 */
{
  無し('道の両端がいずれも実在する城である',
    R.filter(([a, b]) => !ids.has(a) || !ids.has(b)).map(([a, b]) => `${a}-${b}`));
  無し('道に長さと種類がついている',
    R.filter((r) => !(r[2] > 0) || !r[3]).map((r) => `${r[0]}-${r[1]}`));

  const 隣 = {};
  for (const [a, b] of R) { (隣[a] = 隣[a] || []).push(b); (隣[b] = 隣[b] || []).push(a); }
  無し('道の一本もない城がない', C.filter((c) => !隣[c.id]).map((c) => `${c.name}(${c.kuni})`));

  /* 盤は一つに繋がっていること。島（蝦夷・琉球・対馬・壱岐・佐渡・淡路）へも
     海路が引いてあるので、どの城からどの城へも辿り着けるはずである。
     繋がっていない城があると、その城へは永久に出陣できない。 */
  const 見 = new Set([C[0].id]); const 積 = [C[0].id];
  while (積.length) { const x = 積.pop(); for (const y of (隣[x] || [])) if (!見.has(y)) { 見.add(y); 積.push(y); } }
  無し('盤がひと繋がりである（どの城へも辿り着ける）',
    C.filter((c) => !見.has(c.id)).map((c) => `${c.name}(${c.kuni})`));

  const 重 = {};
  for (const [a, b] of R) { const k = [a, b].sort().join('|'); 重[k] = (重[k] || 0) + 1; }
  無し('同じ二城を結ぶ道が二本ない', Object.keys(重).filter((k) => 重[k] > 1));
  無し('自分と自分を結ぶ道がない', R.filter(([a, b]) => a === b).map(([a]) => a));
}

/* ------------------------------------------------ 三、盤が実際に立つこと */
{
  let s = null, 例 = '';
  try { s = A.initState('oda'); } catch (e) { 例 = e.message; }
  確('盤を立てられる', !!s, s ? `家${Object.keys(s.factions).length}／城${s.castles.length}／武将${s.generals.length}` : 例);
  if (s) {
    無し('立てた盤の城が、もとの城と同じ数だけある',
      s.castles.length === C.length ? [] : [`${s.castles.length}／${C.length}`]);
    // 二人の主に仕えている家がないこと（旗の下の掟）
    const 主 = {};
    for (const k of Object.keys(s.relations)) {
      const r = s.relations[k];
      if (!['従属', '臣従'].includes(r.state)) continue;
      const [a, b] = k.split('|');
      const 下 = r.master === a ? b : a;
      (主[下] = 主[下] || []).push(r.master === a ? a : b);
    }
    無し('二人の主に仕えている家がない',
      Object.keys(主).filter((k) => 主[k].length > 1).map((k) => `${k}→${主[k].join('・')}`));
    無し('主を書き留めていない上下の間柄がない',
      Object.keys(s.relations).filter((k) => ['従属', '臣従'].includes(s.relations[k].state)
        && !s.relations[k].master));
  }
}

/* ------------------------------------ 四、国ごとの石高（咎めず、書き出すだけ）

   慶長三年の検地高を目安に、盤の厚薄を測る。増補の折に「どの国に城を足せば
   史実に近づくか」を見るための帳面である。 */
{
  const 慶長 = { 陸奥: 167, 出羽: 32, 常陸: 53, 下野: 37, 上野: 49, 武蔵: 67, 相模: 19, 伊豆: 7,
    甲斐: 23, 信濃: 41, 越後: 39, 越中: 38, 能登: 21, 加賀: 36, 越前: 50, 若狭: 8.5, 飛騨: 4,
    美濃: 54, 尾張: 57, 三河: 29, 遠江: 26, 駿河: 15, 伊勢: 57, 志摩: 2, 伊賀: 10, 近江: 78,
    山城: 23, 大和: 45, 河内: 24, 和泉: 14, 摂津: 36, 丹波: 26, 丹後: 11, 但馬: 11, 因幡: 9,
    伯耆: 10, 出雲: 19, 石見: 11, 隠岐: 5, 播磨: 36, 美作: 19, 備前: 22, 備中: 18, 備後: 19,
    安芸: 19, 周防: 17, 長門: 13, 紀伊: 24, 淡路: 6, 阿波: 18, 讃岐: 13, 伊予: 37, 土佐: 10,
    筑前: 34, 筑後: 27, 豊前: 14, 豊後: 42, 肥前: 31, 肥後: 34, 日向: 12, 大隅: 18, 薩摩: 28,
    壱岐: 1, 対馬: 1, 佐渡: 2, 安房: 4.5, 上総: 38, 下総: 39 };
  const 盤 = {}, 城数 = {};
  for (const c of C) { 盤[c.kuni] = (盤[c.kuni] || 0) + (c.koku || 0); 城数[c.kuni] = (城数[c.kuni] || 0) + 1; }
  const 総盤 = Object.values(盤).reduce((a, x) => a + x, 0) / 10000;
  const 総慶 = Object.values(慶長).reduce((a, x) => a + x, 0);
  const 率 = 総盤 / 総慶;
  console.log(`  （総石高 ${総盤.toFixed(0)}万石。慶長期 ${総慶.toFixed(0)}万石の ${率.toFixed(2)}倍）`);
  const 行 = Object.keys(慶長).map((k) => ({ k, 期: 慶長[k] * 率, 実: (盤[k] || 0) / 10000, 城: 城数[k] || 0 }))
    .map((r) => ({ ...r, 差: r.実 - r.期 }));
  const 薄 = [...行].sort((a, z) => a.差 - z.差).slice(0, 6);
  const 厚 = [...行].sort((a, z) => z.差 - a.差).slice(0, 4);
  console.log(`  （史実より薄い国： ${薄.map((r) => `${r.k}${r.差.toFixed(1)}(${r.城}城)`).join('・')}）`);
  console.log(`  （史実より厚い国： ${厚.map((r) => `${r.k}+${r.差.toFixed(1)}(${r.城}城)`).join('・')}）`);
  // 咎めるのは、国そのものが盤から落ちているときだけである
  無し('慶長期に石高のある国が、すべて盤にある', Object.keys(慶長).filter((k) => !盤[k]));
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
