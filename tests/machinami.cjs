/* 城下・宿場の町の町並み（battle/kata.js 町・sato.js 町家を並べる・field.js・shinga.js）。

   遊ぶ側の申し出は「添付のマップの川や城下町の雰囲気が不自然なので修正してください」であった。
   もとは区ごとに円い村を置いていたので、通りの間に生垣で囲った楕円の島が並び、家は区の真ん中を
   通る見えない村の道に沿って固まっていた。掘割は町の幅ほどの長さで、盤の途中で始まり途中で
   終わり、名札の付いた橋が三つ並んでいた。ここで確かめること。
     一、区は通りに挟まれた長方形（町割）で、街道か裏通りに面した辺（表）を持つ
     二、町家は区からはみ出さず、通りの上に建たない。表の辺の多くを、軒先を揃えた家並みが埋める
     三、区の内は集落の当たり（足が鈍り、騎馬は突けない）
     四、掘割は盤の端から端まで貫く。橋は五つ（通りの三つと町はずれの二つ）で、名札は街道の橋だけ
     五、寺の境内に本堂と山門が建つ
   どの攻め口（南北東西）・広さでも組めることも見る */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'machinami-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { layoutField, setFieldSeed, setFieldKind, FIELD, terrainAt, VILLAGES, RIVERS, ROADS, 節までの隔たり } from "../src/battle/field.js";\n'
+ 'export { setBattleMap } from "../src/battle/castleMap.js";\n'
+ 'export { 家々を据える } from "../src/battle/sato.js";\n');
const out = path.join(ROOT, 'build', 'machinami.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 組む = (向き, 兵, 隊, 種) => {
  A.setBattleMap(null);
  A.setFieldSeed('m' + 種, 'n' + 種);
  A.setFieldKind('街道');
  A.layoutField(兵, 隊, { 型: '町', 向き, 鏡: false, 名ら: {} });
};

const 盤ら = [];
for (const 向き of ['S', 'N', 'E', 'W']) for (const [兵, 隊] of [[8000, 6], [30000, 16]]) for (const 種 of [1, 2]) 盤ら.push({ 向き, 兵, 隊, 種 });

let 区の数 = [], 長方形 = 0, 表あり = 0, 盤の内 = 0, 家の外 = 0, 道の上 = 0, 埋め = [], 当たり = 0, 当たりの数 = 0;
let 貫く = 0, 橋五 = 0, 札一 = 0, 札は街道 = 0, 寺 = 0, 堂 = 0;
for (const o of 盤ら) {
  組む(o.向き, o.兵, o.隊, o.種);
  const W = A.FIELD.w, H = A.FIELD.h;
  const 区ら = A.VILLAGES.filter((v) => v.町割);
  区の数.push(区ら.length);
  if (区ら.every((v) => v.町割.x1 > v.町割.x0 + 30 && v.町割.y1 > v.町割.y0 + 30)) 長方形++;
  if (区ら.every((v) => v.町割.辺.some((e) => e.種 === '表'))) 表あり++;
  if (区ら.every((v) => v.町割.x0 >= 0 && v.町割.y0 >= 0 && v.町割.x1 <= W && v.町割.y1 <= H)) 盤の内++;
  /* 町家 */
  const 家 = A.家々を据える().filter((h) => h.種 === '町家' || h.種 === '蔵');
  for (const h of 家) {
    const 区 = 区ら.find((v) => h.x >= v.町割.x0 - 1 && h.x <= v.町割.x1 + 1 && h.y >= v.町割.y0 - 1 && h.y <= v.町割.y1 + 1);
    if (!区) { 家の外++; continue; }
    const m = 区.町割;
    if (h.x - h.hw < m.x0 - 1.5 || h.x + h.hw > m.x1 + 1.5 || h.y - h.hh < m.y0 - 1.5 || h.y + h.hh > m.y1 + 1.5) 家の外++;
    if (A.ROADS.some((r) => r.幅 > 0 && A.節までの隔たり(r.節, h.x, h.y) < r.幅 / 2 + Math.min(h.hw, h.hh) - 1)) 道の上++;
  }
  for (const v of 区ら) for (const e of v.町割.辺.filter((x) => x.種 === '表')) {
    const 横 = e.ny !== 0, 線 = 横 ? e.y0 : e.x0;
    const s0 = 横 ? Math.min(e.x0, e.x1) : Math.min(e.y0, e.y1), s1 = 横 ? Math.max(e.x0, e.x1) : Math.max(e.y0, e.y1);
    let 覆 = 0;
    for (const h of 家) {
      if (h.種 !== '町家') continue;
      const 軒 = 横 ? (e.ny > 0 ? h.y + h.hh : h.y - h.hh) : (e.nx > 0 ? h.x + h.hw : h.x - h.hw);
      if (Math.abs(軒 - 線) > 1.5) continue;
      const a0 = 横 ? h.x - h.hw : h.y - h.hh, a1 = 横 ? h.x + h.hw : h.y + h.hh;
      覆 += Math.max(0, Math.min(a1, s1) - Math.max(a0, s0));
    }
    埋め.push(覆 / Math.max(1, s1 - s0));
  }
  /* 当たり。区の芯は集落 */
  for (const v of 区ら) {
    const m = v.町割;
    当たりの数++;
    if (A.terrainAt((m.x0 + m.x1) / 2, (m.y0 + m.y1) / 2) === 'village') 当たり++;
  }
  /* 掘割と橋 */
  const 堀 = A.RIVERS.find((r) => r.名 === '掘割');
  if (堀) {
    const xs = 堀.節.map((p) => p.x), ys = 堀.節.map((p) => p.y);
    if ((Math.min(...xs) <= 0 && Math.max(...xs) >= W) || (Math.min(...ys) <= 0 && Math.max(...ys) >= H)) 貫く++;
    if ((堀.渡し || []).length === 5) 橋五++;
    const 札 = (堀.渡し || []).filter((w) => !w.札なし);
    if (札.length === 1) 札一++;
    const 街道 = A.ROADS.find((r) => r.名 === '街道') || A.ROADS[0];
    if (札.length === 1 && 街道 && A.節までの隔たり(街道.節, 札[0].x, 札[0].y) < 街道.幅) 札は街道++;
  }
  /* 寺 */
  if (A.VILLAGES.some((v) => v.寺)) 寺++;
  const 寺の建物 = A.家々を据える().filter((h) => h.種 === '本堂' || h.種 === '山門');
  if (寺の建物.some((h) => h.種 === '本堂') && 寺の建物.some((h) => h.種 === '山門')) 堂++;
}
const n = 盤ら.length;
const 中 = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };

console.log('■ 一、区は長方形で、通りに面した辺を持つ');
確('どの盤にも町の区が八つ以上ある', 区の数.every((k) => k >= 8), `区 ${Math.min(...区の数)}〜${Math.max(...区の数)}`);
確('区は長方形（円い村ではない）', 長方形 === n, `${長方形}/${n}盤`);
確('どの区にも、街道か裏通りに面した辺（表）がある', 表あり === n, `${表あり}/${n}盤`);
確('区は盤の内に収まる', 盤の内 === n, `${盤の内}/${n}盤`);

console.log('■ 二、町家は区の内に、通りに面して軒を連ねる');
確('町家と土蔵は区からはみ出さない', 家の外 === 0, `${家の外}軒`);
確('町家は通りの上に建たない', 道の上 === 0, `${道の上}軒`);
確('表の辺の多くを、軒先を揃えた町家が埋める（中ほどで七割以上）', 中(埋め) >= 0.7,
  `埋まる割 中ほど${Math.round(中(埋め) * 100)}％・下は${Math.round(Math.min(...埋め) * 100)}％`);

console.log('■ 三、区の内は集落');
確('区の芯は集落の当たり（足が鈍り、騎馬は突けない）', 当たり === 当たりの数, `${当たり}/${当たりの数}区`);

console.log('■ 四、掘割と橋');
確('掘割は盤の端から端まで貫く（途中で始まり途中で終わらない）', 貫く === n, `${貫く}/${n}盤`);
確('橋は五つ（通りの三つと町はずれの二つ）', 橋五 === n, `${橋五}/${n}盤`);
確('名札は一つだけ', 札一 === n, `${札一}/${n}盤`);
確('名札の付く橋は街道の橋', 札は街道 === n, `${札は街道}/${n}盤`);

console.log('■ 五、寺の境内');
確('寺の境内がある', 寺 === n, `${寺}/${n}盤`);
確('本堂と山門が建つ', 堂 === n, `${堂}/${n}盤`);

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
