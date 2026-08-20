/* 縄張り（曲輪の並べ方）の試験。

   これまで、どの城も本丸を中心に据えた同心の三重であった。山城も平城も、
   門の数も堀の広さも同じで、図の上でも戦の上でも城が城を見分けられない。

   縄張りには三つの基本形がある。
     輪郭式 … 本丸を中心に、二の丸・三の丸が同心に取り巻く（二条城・駿府城）
     連郭式 … 本丸・二の丸を一列に並べる。尾根の城はこの形（月山富田城・七尾城）
     梯郭式 … 本丸を一隅に寄せ、二方を川や崖に預ける（岡山城・熊本城）
   これに渦を巻く渦郭式（姫路城・江戸城）を加えて四つとする。

   層ごとに寄せを持たせるということは、「城は同心の矩形である」という
   前提を崩すということである。当たり判定も、門への道筋も、絵も、
   みなその前提の上に立っていたので、そこを検める。

   あわせて、城が城として閉じているかを検める。作りながら測ったところ、
   二百四十九城のうち二百三十五城は門を一つも破らずに本丸まで歩いて入れた。
     ・矢倉を曲輪の隅ちょうどに据えていたので、櫓の周り二十二歩ぶん壁が消えていた
     ・道さがしの格子が二十二歩四方で、十歩の壁が升目と升目のあいだをすり抜けていた
   城攻めとは門を破ることなのだから、これでは城ではない。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'nawabari-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { buildCastleMap, layoutCastleField, setBattleMap, castleTerrainAt, axisOf, fromUV,'
+ ' gateOpenU, gatePos, navPath, buildNav, inLayer, siegeUnit, 城の構え, 城の縄張 } from "../src/battle/castleMap.js";\n'
+ 'export { FIELD, passable } from "../src/battle/field.js";\n'
+ 'export { CASTLES } from "../src/data/castles.js";\n');
const out = path.join(ROOT, 'build', 'nawabari.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

const 城々 = A.CASTLES.filter((c) => c.def != null);
const 図る = (c) => {
  const m = A.buildCastleMap(c);
  A.layoutCastleField(m);
  A.setBattleMap(m);
  return m;
};

/* ------------------------------------------- 一、史実に伝わる形をあてている */
{
  const 検 = [['gassan', '月山富田城', '連郭式'], ['nanao', '七尾城', '連郭式'],
    ['odani', '小谷城', '連郭式'], ['mito', '水戸城', '連郭式'],
    ['nijo', '二条御所', '輪郭式'], ['sunpu', '駿府城', '輪郭式'],
    ['ishiyama_bz', '岡山城', '梯郭式'], ['kumamoto', '隈本城', '梯郭式'],
    ['odawara', '小田原城', '梯郭式'], ['himeji', '姫路城', '渦郭式']];
  let 合 = 0;
  const 違 = [];
  for (const [id, 名, 形] of 検) {
    const c = 城々.find((x) => x.id === id);
    if (!c) { 違.push(`${名}が無い`); continue; }
    const m = 図る(c);
    if (m.縄張 === 形) 合++; else 違.push(`${名}は${m.縄張}`);
  }
  確('名の知れた城は史実に伝わる縄張りになる', 合 === 検.length,
    違.length ? 違.join('／') : `${合}城を検めた`);

  // 名の伝わらぬ城も、構えに応じて形が割れる（どれか一色にならない）
  const 形 = {};
  for (const c of 城々) 形[図る(c).縄張] = (形[図る(c).縄張] || 0) + 1;
  const 種 = Object.keys(形).length;
  const 最多 = Math.max(...Object.values(形));
  確('全国の城が四つの形に分かれる', 種 >= 3 && 最多 < 城々.length * 0.6,
    JSON.stringify(形));
}

/* ---------------------------------------- 二、寄せが形どおりに効いている */
{
  const 寄せ = (id) => {
    const m = 図る(城々.find((x) => x.id === id));
    const h = m.layers[m.layers.length - 1];
    return { m, x: Math.abs(h.ox), y: Math.abs(h.oy) };
  };
  const 輪 = 寄せ('nijo');
  確('輪郭式の曲輪は同心である', 輪.x < 1 && 輪.y < 1, `寄せ ${Math.round(輪.x)},${Math.round(輪.y)}`);
  const 連 = 寄せ('gassan');
  確('連郭式は一方向にだけ寄る', (連.x > 20) !== (連.y > 20),
    `寄せ ${Math.round(連.x)},${Math.round(連.y)}`);
  const 梯 = 寄せ('ishiyama_bz');
  確('梯郭式は縦横の両方へ寄る（本丸が一隅に立つ）', 梯.x > 20 && 梯.y > 20,
    `寄せ ${Math.round(梯.x)},${Math.round(梯.y)}`);
  const 渦 = 寄せ('himeji');
  const 向 = 渦.m.layers.slice(1).map((l, i) =>
    `${Math.round(l.ox - 渦.m.layers[i].ox)},${Math.round(l.oy - 渦.m.layers[i].oy)}`);
  確('渦郭式は層ごとに向きが変わる', new Set(向).size === 向.length, 向.join(' → '));
}

/* --------------------- 三、曲輪の帯は、痩せた側でも隊が一つ通れること

   虎口が収まるだけでは足りない。隊は幅二百十六・奥行八十八の塊であるから、
   奥行きぶんの余地が無ければ帯を通れず、壁に挟まれて左右に揺れる。 */
{
  const U = A.siegeUnit();
  const 狭 = [];
  let 最細 = Infinity;
  for (const c of 城々) {
    const m = 図る(c);
    for (let i = 1; i < m.layers.length; i++) {
      const p = m.layers[i - 1], l = m.layers[i];
      const 帯 = [(l.oy - l.hh) - (p.oy - p.hh), (p.oy + p.hh) - (l.oy + l.hh),
        (l.ox - l.hw) - (p.ox - p.hw), (p.ox + p.hw) - (l.ox + l.hw)];
      const 細 = Math.min(...帯) - m.t * 2;               // 壁の厚みを除いた通り道
      if (細 < 最細) 最細 = 細;
      if (細 < U.d) 狭.push(`${c.name}${l.name} ${Math.round(細)}歩`);
    }
  }
  確('いちばん痩せた帯でも、隊の奥行きぶんの道が残る', !狭.length,
    狭.length ? 狭.slice(0, 4).join('／') : `最も細い帯 ${Math.round(最細)}歩（隊の奥行 ${U.d}歩）`);
}

/* ------------------------------- 四、門は縄張りを崩しても開いていること */
{
  const 詰 = [];
  for (const c of 城々) {
    const m = 図る(c);
    for (const l of m.layers) for (const g of l.gates) {
      const a = A.axisOf(l, g);
      const q = A.fromUV(m, a, A.gateOpenU(g), a.half + m.t + g.masu + m.t + 14);
      const t = A.castleTerrainAt(q.x, q.y);
      if (t === 'wall' || t === 'gate') 詰.push(`${c.name}${g.key}が${t}`);
    }
  }
  確('どの門の出口も塞がっていない', !詰.length,
    詰.length ? 詰.slice(0, 4).join('／') : `${城々.length}城ぶんを検めた`);
}

/* ---------------------------------- 五、城が城として閉じていること

   細かい目（五歩）で塗りつぶし、外から本丸へ歩いて入れるかを見る。
   門を破らぬうちは入れず、門を破れば入れる。それが城である。 */
{
  const 標 = [];
  for (let k = 0; k < 城々.length; k += Math.ceil(城々.length / 20)) 標.push(城々[k]);
  const 通れる = (m, 破る) => {
    if (破る) for (const g of m.gates) { g.broken = true; g.hp = 0; }
    const CS = 5, w = Math.ceil(A.FIELD.w / CS), h = Math.ceil(A.FIELD.h / CS);
    const ok = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      ok[j * w + i] = A.passable(i * CS + CS / 2, j * CS + CS / 2) ? 1 : 0;
    }
    const seen = new Uint8Array(w * h);
    const hon = m.layers[m.layers.length - 1];
    const tx = Math.round((m.cx + hon.ox) / CS), ty = Math.round((m.cy + hon.oy) / CS);
    const st = [6 * w + 6]; seen[st[0]] = 1;
    while (st.length) {
      const k = st.pop(), i = k % w, j = (k / w) | 0;
      if (i === tx && j === ty) return true;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
        const nk = nj * w + ni;
        if (seen[nk] || !ok[nk]) continue;
        seen[nk] = 1; st.push(nk);
      }
    }
    return false;
  };
  const 漏 = [], 詰 = [];
  for (const c of 標) {
    if (通れる(図る(c), false)) 漏.push(`${c.name}`);
    if (!通れる(図る(c), true)) 詰.push(`${c.name}`);
  }
  確('門を破らぬうちは、外から本丸へ入れない', !漏.length,
    漏.length ? 漏.slice(0, 5).join('／') : `${標.length}城を細かい目で検めた`);
  確('門を破れば、外から本丸まで通れる', !詰.length,
    詰.length ? 詰.slice(0, 5).join('／') : `${標.length}城`);

  /* 道さがしの格子でも同じでなければならない。
     升目の真ん中だけを見ていたので、十歩の壁は升目のあいだをすり抜けていた。
     格子の上で壁を突っ切る道が見つかると、隊は行けもしない地点を目指す。 */
  const 抜 = [];
  for (const c of 標) {
    const m = 図る(c);
    m.nav = null; A.buildNav(m);
    const hon = m.layers[m.layers.length - 1];
    if (A.navPath(m, 30, 30, m.cx + hon.ox, m.cy + hon.oy)) 抜.push(c.name);
  }
  確('道さがしの格子も壁を抜けない', !抜.length,
    抜.length ? `${抜.length}城（例 ${抜.slice(0, 3).join('／')}）` : `${標.length}城`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
