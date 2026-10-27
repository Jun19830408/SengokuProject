/* 野の地物――生まれるか、効くか、絵と理が重なるか（GDD 8.1 / 8.6）。

   野の絵を新しい筆で描き直した。描き直した筆が、盤の持つ地物を写し損ねれば、
   見えている野と、足を止める野とが食い違う。遊ぶ側の申し出は
   「川の判定位置がおかしかったり、橋や浅瀬がなくなっている」であり、
   併せて「マップを新しくした関係で、各オブジェクトがちゃんと生成されるかと、
   その効果も残っているか確認してほしい」であった。

   元は一つ。絵の川が真っ直ぐな一本であった。理の川は riverShift で蛇行する。
   蛇行は野の幅の一割ほどに及ぶので、絵の水と理の水は半分ほどしか重ならない。
   渡し場（橋・浅瀬）に至っては、絵には描かれてさえいなかった。

   ここで検めるのは三つ。
     一、生まれた野に地物が揃うこと（川・道・森・林・丘・山・沼・村）
     二、絵の川筋（野の川筋）が理の川（terrainAt）と重なり、渡し場も重なること
     三、地物の効き（足・戦・陣形・見通し）が表に残っていること

   のち、遊ぶ側の申し出「山と川の分け目や森と川の分け目が変」を受けて、二の三を
   足した。丘と村は川を跨がず、川べりの木・家・葦は水の上に立たないこと。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'jibutsu-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export * from "../src/battle/field.js";\n'
+ 'export { 野の川筋 } from "../src/battle/shinga.js";\n'
+ 'export { 木立を据える } from "../src/battle/mori.js";\n'
+ 'export { 家々を据える, 葦を据える } from "../src/battle/sato.js";\n'
+ 'export { 分け目の野 } from "../src/data/wakemeba.js";\n');
const out = path.join(ROOT, 'build', 'jibutsu.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

const 水か = (t) => t === 'deep' || t === 'bridge' || t === 'ford';

console.log('── 一　生まれた野に地物が揃う');
{
  const 数 = { 川: 0, 道: 0, 森: 0, 林: 0, 丘: 0, 山: 0, 沼: 0, 村: 0, 橋: 0, 浅瀬: 0 };
  const 野数 = 60;
  for (let i = 0; i < 野数; i++) {
    /* 山は山越えの街道にだけ立つ（道の質）。三つの質を順に巡る。 */
    A.setFieldKind(i % 3 === 0 ? '街道' : i % 3 === 1 ? '山道' : '難所');
    A.genTerrain(1000 + i * 7919);
    if (A.hasRiver()) {
      数.川++;
      if (A.RIVER.bridge[1] > A.RIVER.bridge[0]) 数.橋++;
      if (A.RIVER.ford[1] > A.RIVER.ford[0]) 数.浅瀬++;
    }
    if (A.ROAD.節.length > 1) 数.道++;
    if (A.FORESTS.length) 数.森++;
    if (A.WOODS.length) 数.林++;
    if (A.HILLS.length) 数.丘++;
    if (A.MOUNTAINS.length) 数.山++;
    if (A.MARSH.length) 数.沼++;
    if (A.VILLAGES.length) 数.村++;
  }
  for (const k of ['川', '道', '森', '林', '丘', '山', '沼', '村']) {
    確(`${k}が生まれる`, 数[k] > 0, `${野数}の野のうち ${数[k]}`);
  }
  確('川のある野には橋が架かる', 数.橋 === 数.川, `川${数.川}／橋${数.橋}`);
  確('川のある野には浅瀬がある', 数.浅瀬 === 数.川, `川${数.川}／浅瀬${数.浅瀬}`);
}

console.log('\n── 二　絵の川と、足を止める川とが重なる');
{
  let 検めた = 0, 外れ = 0, 渡し検め = 0, 渡し外れ = 0, 橋 = 0, 浅瀬 = 0, 蛇行 = 0;
  for (let i = 0; i < 24; i++) {
    A.genTerrain(2000 + i * 104729);
    if (!A.hasRiver()) continue;
    const 川ら = A.野の川筋();
    if (!川ら.length) { 外れ++; continue; }
    for (const r of 川ら) {
      const ys = r.節.map((p) => p[1]);
      if (Math.max(...ys) - Math.min(...ys) > 4) 蛇行++;
      for (const [x, y] of r.節) {
        if (x < 2 || x > A.FIELD.w - 2) continue;      // 端は野の外へ出る
        検めた++;
        if (!水か(A.terrainAt(x, y))) 外れ++;
      }
      for (const w of r.渡し || []) {
        渡し検め++;
        if (w.種 === '橋') 橋++; else 浅瀬++;
        const t = A.terrainAt(w.x, w.y);
        if (t !== (w.種 === '橋' ? 'bridge' : 'ford')) 渡し外れ++;
      }
    }
  }
  確('絵の川筋はすべて理の水の上にある', 検めた > 100 && 外れ === 0,
    `${検めた}点のうち外れ ${外れ}`);
  確('川は蛇行して描かれる', 蛇行 > 0, `${蛇行}本`);
  確('渡し場が橋と浅瀬の二つ描かれる', 橋 > 0 && 浅瀬 > 0, `橋${橋}／浅瀬${浅瀬}`);
  確('渡し場の位置も理と重なる', 渡し検め > 0 && 渡し外れ === 0,
    `${渡し検め}ヶ所のうち外れ ${渡し外れ}`);
}

console.log('\n── 二の二　筋書きの野（天下分け目）でも重なる');
{
  let 野 = 0, 検めた = 0, 外れ = 0, 渡し = 0, 渡し外れ = 0;
  for (const f of A.分け目の野) {
    if (!(f.川 || []).length) continue;
    A.筋書きの野を組む(f);
    野++;
    for (const r of A.野の川筋()) {
      for (const [x, y] of r.節) {
        if (x < 2 || y < 2 || x > A.FIELD.w - 2 || y > A.FIELD.h - 2) continue;
        検めた++;
        if (!水か(A.terrainAt(x, y))) 外れ++;
      }
      for (const w of r.渡し || []) {
        渡し++;
        const t = A.terrainAt(w.x, w.y);
        if (t !== (w.種 === '橋' ? 'bridge' : 'ford')) 渡し外れ++;
      }
    }
  }
  A.筋書きを解く();
  確('筋書きの野にも川がある', 野 > 0, `${野}の野`);
  確('その川筋も理の水の上にある', 検めた > 0 && 外れ / Math.max(1, 検めた) < 0.02,
    `${検めた}点のうち外れ ${外れ}`);
  確('筋書きの渡し場も重なる', 渡し === 0 || 渡し外れ === 0,
    `${渡し}ヶ所のうち外れ ${渡し外れ}`);
}

console.log('\n── 二の三　丘と村は川を跨がず、川べりの木・家・葦は水に立たない');
{
  /* 丘を置くとき、川を避けるのに中どころしか見ていなかったので、川のある野の丘の
     三割五分が川に掛かり、頂のそばを川が流れる丘もあった。斜めから見ると川が丘の
     稜線の上を流れ、村の家は川の中に立った。丘と村は置き終えてから、裾が岸に届く
     ところまで退ける（field.js 丘と村を川から退ける）。木と家と葦は、水際から間を
     空けて立てる（mori.js・sato.js）。 */
  let 川野 = 0, 丘 = 0, 丘跨ぎ = 0, 頂の水 = 0, 村 = 0, 村跨ぎ = 0;
  let 木 = 0, 水の木 = 0, 家 = 0, 水の家 = 0, 葦 = 0, 水の葦 = 0;
  for (let i = 0; i < 80; i++) {
    A.setFieldKind(i % 3 === 0 ? '街道' : i % 3 === 1 ? '山道' : '難所');
    A.setFieldSeed('k' + i, 'x');
    A.layoutField(3000 + (i % 4) * 9000, 2 + (i % 4) * 5);
    if (!A.hasRiver()) continue;
    川野++;
    for (const h of A.HILLS) {
      丘++;
      const e = A.水際まで(h.x, h.y, h.r);
      if (e < h.r) 丘跨ぎ++;
      if (e < h.r * 0.5) 頂の水++;
    }
    for (const v of A.VILLAGES) { 村++; if (A.水際まで(v.x, v.y, v.r) < v.r) 村跨ぎ++; }
    for (const t of A.木立を据える()) { 木++; if (A.水際まで(t.x, t.y, 10) < 2) 水の木++; }
    for (const h of A.家々を据える()) { 家++; if (A.水際まで(h.x, h.y, 40) < Math.hypot(h.hw, h.hh)) 水の家++; }
    for (const t of A.葦を据える()) { 葦++; if (A.水際まで(t.x, t.y, 10) < -1.5) 水の葦++; }
  }
  確('川のある野で試せている', 川野 >= 20 && 丘 >= 20 && 村 >= 10 && 木 > 1000,
    `川のある野 ${川野}・丘 ${丘}・村 ${村}・木 ${木}・家 ${家}・葦 ${葦}`);
  確('丘の頂のそばに水は無い', 頂の水 === 0, `頂から半径の半ばの内に水がある丘 ${頂の水}`);
  /* 退ける先が盤の端と他の地物で塞がれた丘は、試した中でいちばん川から離れる所に
     置く。そうした丘は二千に一つほどある（頂は水から離れている）。 */
  確('丘は川を跨がない（裾が岸に届くまで）', 丘跨ぎ <= Math.max(1, 丘 * 0.01), `川に掛かる丘 ${丘跨ぎ}／${丘}`);
  確('村は川を跨がない', 村跨ぎ === 0, `川に掛かる村 ${村跨ぎ}／${村}`);
  確('木は水の上と水際に立たない', 水の木 === 0, `${水の木}／${木}本`);
  確('家は水の上と岸の際に建たない', 水の家 === 0, `${水の家}／${家}軒`);
  確('葦は流れの中に生えない', 水の葦 === 0, `${水の葦}／${葦}株`);
}

console.log('\n── 三　地物の効きが残っている');
{
  const 種 = ['plain', 'road', 'forest', 'wood', 'marsh', 'hill', 'mountain',
    'village', 'bridge', 'ford', 'deep'];
  for (const k of 種) 確(`${k} の効きが表にある`, !!A.TERRAIN[k], A.TERRAIN[k] ? A.TERRAIN[k].label : '');
  const T = A.TERRAIN;
  確('森は足を鈍らせ、隊列を乱す', T.forest.speed < T.plain.speed && T.forest.cohesion < 0);
  確('林は森より通りやすい', T.wood.speed > T.forest.speed);
  確('丘は見晴らしが利く', T.hill.sight > T.plain.sight);
  確('山は丘の一段上', T.mountain.sight > T.hill.sight && T.mountain.speed < T.hill.speed);
  /* 高みの利は、地形の表ではなく engine が 地の高さ の差から出す。
     両方に持たせていたころは二重に効き、山へ登っただけで八割勝つ盤だった。
     表の fight は一に戻し、高低は一本の筋に束ねてある。 */
  確('丘と山の戦う力は、表では掛けない（高みの利は地の高さが担う）',
    T.hill.fight === 1 && T.mountain.fight === 1,
    `丘 ${T.hill.fight}・山 ${T.mountain.fight}`);
  {
    A.setFieldSeed('b', 'b'); A.setFieldKind('山道');
    A.layoutField(4000, 2);
    const 高み = A.高み || [];
    const 頂 = 高み.length ? A.地の高さ(高み[0].x, 高み[0].y) : 0;
    const 裾 = 高み.length ? A.地の高さ(高み[0].x + 高み[0].r * 1.4, 高み[0].y) : 0;
    確('高みの頂は、その裾より高い', 高み.length > 0 && 頂 > 0.8 && 裾 === 0,
      `頂 ${頂.toFixed(2)}・裾 ${裾.toFixed(2)}（高み ${高み.length}）`);
  }
  確('沼は騎馬を殺す', T.marsh.horse < 0.5 && T.marsh.charge === false);
  確('集落は見通しを塞ぐ', T.village.sight < T.plain.sight);
  確('街道は速い', T.road.speed > T.plain.speed);
  確('深い川はほとんど進めない', T.deep.speed < 0.2);
  確('浅瀬は深みよりまし、橋はさらにまし', T.ford.speed > T.deep.speed && T.bridge.speed > T.ford.speed);
}

console.log('\n── 四　踏み込んだ地が、地物の芯で正しく読める');
{
  let 良 = 0, 全 = 0;
  for (let i = 0; i < 40; i++) {
    A.genTerrain(3000 + i * 48611);
    const 試 = [];
    const 大きいの = (ら) => ら.filter((o) => o.r > 40).sort((a, b) => b.r - a.r)[0];
    const f = 大きいの(A.FORESTS); if (f) 試.push([f, 'forest']);
    const w = 大きいの(A.WOODS); if (w) 試.push([w, 'wood']);
    const h = 大きいの(A.HILLS); if (h) 試.push([h, 'hill']);
    const m = 大きいの(A.MARSH); if (m) 試.push([m, 'marsh']);
    const v = 大きいの(A.VILLAGES); if (v) 試.push([v, 'village']);
    for (const [o, t] of 試) {
      全++;
      if (A.踏み込んだ地(o.x, o.y) === t) 良++;
    }
    if (A.hasRiver()) {
      const cx = (A.RIVER.bridge[0] + A.RIVER.bridge[1]) / 2;
      const cy = (A.RIVER.top + A.RIVER.bot) / 2 + A.riverShift(cx);
      全++;
      if (A.踏み込んだ地(cx, cy) === 'bridge') 良++;
    }
  }
  確('地物の芯に立てば、その地にいると読まれる', 全 > 50 && 良 / 全 > 0.9,
    `${全}ヶ所のうち ${良}（${Math.round((良 / 全) * 100)}%）`);
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
