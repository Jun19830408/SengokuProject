/* 伏兵と奇襲（GDD 8.7）。

   一、合戦盤の伏兵

   森に兵を伏せ、寄せて来る敵の脇腹へ現れる。当たれば相手の士気は十六、
   隊列は十二削れる。長らくプレイヤーだけの手であり、しかも「森の上に立って
   いれば誰でも伏せられる」という決まりであった。

   伏せるとは、戦の前に戦場を読み、当たる所を見切って兵を置くことである。
   それだけの知恵者が軍にいなければ、献策すら出ない――知略七十八以上とした。
   伏せられるのは、森・林・集落のうち、自軍に近い半分にある所。敵陣の際に
   伏せても、着く前に見つかる。敵も、委ねられた味方も、同じように用いる。

   二、戦役の奇襲

   もとは当たれば必ず総大将が討たれた。桶狭間が毎年起こることになる。
   企てた将の知略で段を分けた（core/ambush.js の 奇襲の段）。
     九十以上   … 総大将を討ち取る
     八十五以上 … 総大将の備えは壊滅、本人は本陣を捨てて退く。相手の兵は半減
     八十以上   … 総大将の備えは四分の一。相手の兵は四分の一を失う
     七十以上   … 総大将の備えは半ば。相手の兵は六分の一を失う
     六十二以上 … 相手の兵は八分の一を失う */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'fuse-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { layoutField, setFieldSeed, FIELD, FORESTS, WOODS, VILLAGES, terrainAt } from "../src/battle/field.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen, 伏兵に置ける, 伏兵の策士, 伏せられる地, 伏せ場を探す, 伏兵の知略 } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle, stepBattle } from "../src/battle/engine.js";\n'
+ 'export { setBattleMap } from "../src/battle/castleMap.js";\n'
+ 'export { 奇襲の段, ambushChance } from "../src/core/ambush.js";\n');
const out = path.join(ROOT, 'build', 'fuse.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);
const H = require(path.join(ROOT, 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

const 素 = Math.random;
let 種 = 0;
const 賽 = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
Math.random = 賽;
const 将 = (i, wit) => ({ id: `g${i}`, name: `将${i}`, lead: 62, valor: 60,
  wit, gov: 55, retinue: 400, retTrain: 70, unity: 60 });

/* ------------------------------------ 一、伏兵は知略七十八以上の軍だけの策 */
function 一戦(i, 知) {
  種 = 0x7000 + i * 313;
  A.setBattleMap(null); A.setFieldSeed('f' + i, 'x'); A.layoutField(9000, 6);
  const W = A.FIELD.w, H = A.FIELD.h;
  const P = [0, 1, 2].map((k) => A.makeCorps('P', 将(k, k === 0 ? 知 : 55), 400, 1100, 75, 75,
    W * (0.3 + k * 0.2), H * 0.84, -Math.PI / 2, '#2F5D8C'));
  const E = [0, 1, 2].map((k) => A.makeCorps('E', 将(10 + k, k === 0 ? 知 : 55), 400, 1100, 75, 75,
    W * (0.3 + k * 0.2), H * 0.16, Math.PI / 2, '#B0483C'));
  for (const c of [...P, ...E]) { c.formation = '横陣'; A.placeSquads(c, true); c.auto = true; }
  const b = A.createBattle(P, E, 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1100; b.face = 'S'; b.myFar = false;
  b.委ねた = true;                       // 全軍委任を命じた戦とみなす
  const 地 = [], 側 = {};
  let 伏せた = 0, 自陣側 = 0;
  for (let k = 0; k < 3000; k++) {
    A.stepBattle(b, 0.25);
    if (k % 3 === 0) A.battleAI(b);
    for (const c of b.corps) {
      if (c.ambush && !c.数えた) {
        c.数えた = true; 伏せた++;
        地.push(A.terrainAt(c.x, c.y));
        側[c.side] = (側[c.side] || 0) + 1;
        if (A.伏せられる地(b, c.x, c.y, c.side)) 自陣側++;
      }
    }
    if (b.result) break;
  }
  return { 伏せた, 自陣側, 地, 側, 当たり: b.log.filter((x) => /伏兵が/.test(x.text)).length };
}
{
  const 集 = (知) => {
    const 出 = { 伏: 0, 自陣側: 0, 当: 0, 地: {}, 側: {} };
    for (let i = 0; i < 14; i++) {
      const r = 一戦(i, 知);
      出.伏 += r.伏せた; 出.自陣側 += r.自陣側; 出.当 += r.当たり;
      for (const t of r.地) 出.地[t] = (出.地[t] || 0) + 1;
      for (const k in r.側) 出.側[k] = (出.側[k] || 0) + r.側[k];
    }
    return 出;
  };
  const 凡 = 集(70), 知 = 集(80);
  確('知略七十八に満たぬ軍は伏兵を出さない', 凡.伏 === 0, `十四戦で${凡.伏}隊`);
  確('知略七十八以上の将がいれば伏兵を出す', 知.伏 > 0,
    `十四戦で${知.伏}隊（当たった${知.当}回）`);
  確('伏せるのは森・林・集落に限る',
    Object.keys(知.地).every((t) => t === 'forest' || t === 'wood' || t === 'village'),
    JSON.stringify(知.地));
  確('伏せるのは自軍に近い半分に限る', 知.自陣側 === 知.伏,
    `${知.自陣側}／${知.伏}隊`);
  確('敵も味方も同じように用いる', (知.側.P || 0) > 0 && (知.側.E || 0) > 0,
    `味方${知.側.P || 0}隊・敵${知.側.E || 0}隊`);
  確('全隊を伏せはしない（一軍に一隊まで）', 知.伏 <= 14 * 2,
    `十四戦・両軍で${知.伏}隊`);
}

/* ------------- 一のニ、委ねていない味方の隊を、采配が勝手に伏せないこと

   隊はもともと委任の形で始まる。そのまま采配が伏せると、「選んでもいないのに
   伏兵にされた」ことになる。伏兵はプレイヤーが選ぶ策である。
   采配に任せるのは、全軍委任（委ねて結果を見る）と命じたときだけ。 */
{
  const 走る = (委ねた) => {
    種 = 0x7000;
    A.setBattleMap(null); A.setFieldSeed('f0', 'x'); A.layoutField(9000, 6);
    const W = A.FIELD.w, H = A.FIELD.h;
    const P = [0, 1, 2].map((k) => A.makeCorps('P', 将(k, k === 0 ? 85 : 55), 400, 1100, 75, 75,
      W * (0.3 + k * 0.2), H * 0.84, -Math.PI / 2, '#2F5D8C'));
    const E = [0, 1, 2].map((k) => A.makeCorps('E', 将(10 + k, k === 0 ? 85 : 55), 400, 1100, 75, 75,
      W * (0.3 + k * 0.2), H * 0.16, Math.PI / 2, '#B0483C'));
    for (const c of [...P, ...E]) { c.formation = '横陣'; A.placeSquads(c, true); c.auto = true; }
    const b = A.createBattle(P, E, 'P');
    b.mode = 'field'; b.phase = 'fight'; b.dusk = 1100; b.face = 'S'; b.myFar = false;
    if (委ねた) b.委ねた = true;
    let 味方 = 0, 敵 = 0;
    for (let k = 0; k < 900; k++) {
      A.stepBattle(b, 0.25);
      if (k % 3 === 0) A.battleAI(b);
      for (const c of b.corps) {
        if ((c.ambush || c.伏せ場) && !c.数えた) { c.数えた = true; (c.side === 'P' ? 味方 : 敵); if (c.side === 'P') 味方++; else 敵++; }
      }
      if (b.result) break;
    }
    return { 味方, 敵 };
  };
  const 任せず = 走る(false), 任せた = 走る(true);
  確('全軍委任を命じていなければ、味方の隊は勝手に伏せられない', 任せず.味方 === 0,
    `味方${任せず.味方}隊`);
  確('それでも敵は伏兵を用いる', 任せず.敵 > 0, `敵${任せず.敵}隊`);
  確('全軍委任を命じれば、采配が味方の隊も伏せる', 任せた.味方 > 0, `味方${任せた.味方}隊`);
}

/* ------------------------------- 二、伏兵の可否（釦の判じもこれで決まる） */
{
  種 = 0x123;
  A.setBattleMap(null);
  let 見 = null;
  for (let i = 1; i < 80 && !見; i++) {
    A.setFieldSeed('g' + i, 'x'); A.layoutField(9000, 4);
    if (A.FORESTS.length) 見 = i;
  }
  const W = A.FIELD.w, H = A.FIELD.h;
  const 森 = A.FORESTS[0];
  const 置く = (知, x, y) => {
    const c = A.makeCorps('P', 将(1, 知), 400, 900, 75, 75, x, y, -Math.PI / 2, '#2F5D8C');
    const e = A.makeCorps('E', 将(9, 55), 400, 900, 75, 75, W * 0.5, H * 0.08, Math.PI / 2, '#B0483C');
    A.placeSquads(c, true); A.placeSquads(e, true);
    const b = A.createBattle([c], [e], 'P');
    b.mode = 'field'; b.phase = 'fight'; b.face = 'S'; b.myFar = false;
    // 自陣は盤の南（下）に置く
    b.陣 = { P: { x: W * 0.5, y: H * 0.9 }, E: { x: W * 0.5, y: H * 0.1 } };
    b.陣間 = Math.hypot(b.陣.P.x - b.陣.E.x, b.陣.P.y - b.陣.E.y);
    return { b, c };
  };
  // 自陣側の森
  const 南の森 = A.FORESTS.filter((f) => f.y > H * 0.5).sort((a, z) => z.y - a.y)[0];
  const 北の森 = A.FORESTS.filter((f) => f.y < H * 0.4).sort((a, z) => a.y - z.y)[0];
  if (南の森) {
    const { b, c } = 置く(85, 南の森.x, 南の森.y);
    確('知略七十八以上・自陣側の森なら伏せられる', A.伏兵に置ける(b, c),
      `${A.terrainAt(c.x, c.y)}／策士 ${A.伏兵の策士(b, 'P') ? 'あり' : 'なし'}`);
    const { b: b2, c: c2 } = 置く(60, 南の森.x, 南の森.y);
    確('策士がいなければ、同じ森でも伏せられない', !A.伏兵に置ける(b2, c2), '知略六十');
  }
  if (北の森) {
    const { b, c } = 置く(85, 北の森.x, 北の森.y);
    確('敵陣側の森には伏せられない', !A.伏兵に置ける(b, c),
      `盤の高さ${H}のうち y=${Math.round(北の森.y)}`);
  }
  {
    const { b, c } = 置く(85, W * 0.5, H * 0.86);
    確('野原には伏せられない', A.terrainAt(c.x, c.y) === 'plain' ? !A.伏兵に置ける(b, c) : true,
      A.terrainAt(c.x, c.y));
  }
  確('伏兵の敷居は知略七十八', A.伏兵の知略 === 78, `${A.伏兵の知略}`);
}

/* ------------------------------------- 三、奇襲の段（知略で首尾が変わる） */
{
  const 段 = (w) => A.奇襲の段(w);
  確('知略九十以上なら総大将を討ち取る', 段(90).大将討死 && 段(92).大将討死,
    段(90).位);
  確('知略八十五は、本陣を壊滅させ大将を退かせる（討ちはしない）',
    !段(85).大将討死 && 段(85).大将退く && Math.abs(段(85).全体欠け - 0.5) < 1e-9,
    `${段(85).位}／相手の兵は${Math.round(段(85).全体欠け * 100)}％が消える`);
  確('知略八十は、大将の備えを四分の一にし、全体の四分の一を削る',
    Math.abs(段(80).大将備え - 0.25) < 1e-9 && Math.abs(段(80).全体欠け - 0.25) < 1e-9, 段(80).位);
  確('知略七十は、大将の備えを半ばにし、全体の六分の一を削る',
    Math.abs(段(70).大将備え - 0.5) < 1e-9 && Math.abs(段(70).全体欠け - 1 / 6) < 1e-9, 段(70).位);
  確('知略六十二は、全体の八分の一を削るにとどまる',
    段(62).大将備え === 1 && Math.abs(段(62).全体欠け - 1 / 8) < 1e-9, 段(62).位);
  確('段が上ほど、守りの乱れも大きい',
    段(90).乱れ < 段(85).乱れ && 段(85).乱れ < 段(80).乱れ
    && 段(80).乱れ < 段(70).乱れ && 段(70).乱れ < 段(62).乱れ,
    [90, 85, 80, 70, 62].map((w) => `${w}:${段(w).乱れ}`).join(' '));
}

/* --------------------- 四、盤の外の戦役で、奇襲の段が実際に効くこと */
function 奇襲を仕掛ける(知) {
  const s = H.initState('oda');
  const 自城 = s.castles.find((x) => x.faction === s.player);
  const 敵城 = s.castles.filter((x) => x.faction !== s.player)
    .map((x) => ({ x, p: H.findPath(自城.id, x.id) }))
    .filter((o) => o.p && o.p.length === 2)[0].x;
  // 城方を厚くし、寄せ手を寡兵にする（奇襲は寡兵の策である）
  敵城.local = 6000;
  const 城将 = s.generals.filter((x) => x.at === 敵城.id && x.faction === 敵城.faction && !x.captive);
  const 主 = 城将.sort((a, z) => (z.lord ? 1 : 0) - (a.lord ? 1 : 0) || z.lead - a.lead)[0];
  if (!主) return null;
  主.retinue = 1200;
  const 将ら = s.generals.filter((x) => x.at === 自城.id && x.faction === s.player && !x.captive).slice(0, 1);
  for (const t of 将ら) { t.at = null; t.wit = 知; }
  const 軍 = {
    id: 'amb-test', faction: s.player, from: 自城.id, gens: 将ら.map((x) => x.id),
    local: 1200, localTrain: 70, rost: null, men: 1200 + 将ら.reduce((a, x) => a + x.retinue, 0),
    at: 敵城.id, path: [敵城.id], prog: 0, food: 3000, target: 敵城.id,
  };
  s.armies.push(軍);
  const 前 = { 城兵: 敵城.local, 主の手勢: 主.retinue, 主id: 主.id,
    総: 敵城.local + 城将.reduce((a, x) => a + x.retinue, 0) };
  種 = 0x2468;
  Math.random = () => 0.001;                      // 必ず当たる目
  const t = H.resolveOffscreen(s, 軍.id, 敵城.id);
  Math.random = 賽;
  const 後城 = t.castles.find((x) => x.id === 敵城.id);
  const 後主 = t.generals.find((x) => x.id === 前.主id);
  return { 前, 後城, 後主, 記: (t.chronicle || []).map((x) => x.text).join(' ／ ') };
}
{
  const 弱 = 奇襲を仕掛ける(64);
  const 中 = 奇襲を仕掛ける(81);
  const 強 = 奇襲を仕掛ける(92);
  if (!弱 || !中 || !強) {
    確('奇襲を仕掛ける盤を仕込める', false, '仕込めなかった');
  } else {
    /* 知略六十二の段は「総大将も含めた全体の兵の八分の一」である。
       大将の備えだけを狙い撃つのではないので、大将の手勢も同じ割で減る。 */
    確('知略六十四の奇襲では、総大将は健在で、手勢は八分の一だけ減る',
      !!弱.後主 && Math.abs(弱.後主.retinue - 弱.前.主の手勢 * (7 / 8)) <= 2,
      `手勢 ${弱.前.主の手勢} → ${弱.後主 ? 弱.後主.retinue : '討死'}`);
    確('知略八十一の奇襲では、総大将の手勢が四分の一になる',
      !!中.後主 && Math.abs(中.後主.retinue - 中.前.主の手勢 * 0.25) <= 2,
      `手勢 ${中.前.主の手勢} → ${中.後主 ? 中.後主.retinue : '討死'}`);
    確('知略八十一の奇襲では、城の兵も四分の一が消える',
      中.後城.local < 中.前.城兵 * 0.8,
      `城兵 ${中.前.城兵} → ${中.後城.local}（戦の損も含む）`);
    確('知略九十二の奇襲では、総大将が討たれる', !強.後主,
      強.後主 ? `${強.後主.name}は健在` : '討死');
    確('奇襲の顛末が戦国記に残る', /本陣を衝いた/.test(中.記), '');
  }
}

Math.random = 素;
console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
