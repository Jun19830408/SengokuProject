/* 人事と方面（GDD 6.4 / 12.2）。

   遊ぶ側の申し出を五つ、ここで縛る。

     一　代替わりしても、旧大名の城でしか大名の差配ができない
     三　臣従大名が毎月「他国を攻めたい」と打診してくる
     四　自国の城のあいだで城主と所属武将を入れ替えたい
     六　どの旗頭がどこを攻めたのか分からない
     七　旗頭の受け持ちから城主が欠けると、その城が方面から外れる

   一は、本拠の付け替え（本拠を追う）が月送りの終いでしか回っていなかった。
   隠居で家督を譲ると、新しい当主が別の城にいても本拠は先代の城に残る。
   七は、鎖が 城主 → 寄親 の一本道であるために、城主のいない城は寄騎になれず、
   受け持ちの真ん中に大名が直に見るほかない城が穴のように空いたのである。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'jinji-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState, relKey } from "../src/core/state.js";\n'
+ 'export { succeed } from "../src/core/house.js";\n'
+ 'export { doRetire, 城替え } from "../src/govern/commands.js";\n'
+ 'export { 旗頭が城主を宛てがう } from "../src/core/inin.js";\n'
+ 'export { 方面の報せ } from "../src/govern/war.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { castellanOf, canHoldCastle, stipendOf, 旗頭の受け持ち } from "../src/core/rank.js";\n'
+ 'export { 臣従の主, 許しの要る主 } from "../src/core/yurushi.js";\n');
const out = path.join(ROOT, 'build', 'jinji.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

let 種 = 0x5C3D;
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
const 城名 = (s, id) => (s.castles.find((c) => c.id === id) || {}).name || '（どこでもない）';

console.log('── 一　家督を譲れば、本拠も新しい当主の城へ移る');
{
  const s = A.initState('oda');
  const 当主 = s.generals.find((x) => x.faction === 'oda' && x.lord && !x.captive);
  const 旧本拠 = s.factions.oda.本拠;
  /* 跡継ぎを別の城に置く。これが遊ぶ側の見た形である
     （嫡子に支城を預け、そこで家督を継がせた）。 */
  const 別城 = s.castles.find((c) => c.faction === 'oda' && c.id !== 旧本拠);
  const 跡 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.captive && x.at === 別城.id)
    || s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.captive);
  跡.at = 別城.id;
  確('先代と跡継ぎが別の城にいる', 当主.at !== 跡.at,
    `${当主.name}＝${城名(s, 当主.at)}／${跡.name}＝${城名(s, 跡.at)}`);
  当主.lord = false;
  A.succeed(s, 当主, '隠居した', 跡.id, true);
  確('跡継ぎが当主になる', 跡.lord === true, 跡.name);
  確('本拠が新しい当主の城へ移る', s.factions.oda.本拠 === 別城.id,
    `${城名(s, 旧本拠)} → ${城名(s, s.factions.oda.本拠)}`);
}

console.log('\n── 一の二　隠居の下知でも、その場で本拠が移る');
{
  const s = A.initState('oda');
  const 旧本拠 = s.factions.oda.本拠;
  const 当主 = s.generals.find((x) => x.faction === 'oda' && x.lord && !x.captive);
  const 別城 = s.castles.find((c) => c.faction === 'oda' && c.id !== 旧本拠);
  const 跡 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.captive
    && x.id !== 当主.id);
  跡.at = 別城.id;
  const s2 = A.doRetire(s, 跡.id);
  確('月送りを待たずに本拠が移る', s2.factions.oda.本拠 === 別城.id,
    `${城名(s2, 旧本拠)} → ${城名(s2, s2.factions.oda.本拠)}`);
}

console.log('\n── 三　臣従した家は、遊ぶ側へ他国攻めを打診しない');
{
  const s = A.initState('oda');
  /* 旗の下に二家入れる。どちらも遊ぶ側が主である。 */
  const 下 = Object.keys(s.factions)
    .filter((x) => x !== 'oda' && s.castles.some((c) => c.faction === x)).slice(0, 2);
  for (const x of 下) {
    s.relations[A.relKey('oda', x)] = { trust: 55, state: '臣従', until: null, master: 'oda' };
  }
  確('旗の下に二家ある', 下.length === 2, 下.map((x) => s.factions[x].name).join('・'));
  確('臣従は許しが要る形のままである',
    下.every((x) => A.臣従の主(s, x) === 'oda'), '主＝織田家');
  let t = s, 願 = 0;
  for (let m = 0; m < 24; m++) {
    t = A.advanceMonth(t, t);
    if (t.攻めの願い) { 願++; t.攻めの願い = null; }
  }
  確('二十四ヶ月のあいだ、攻めの打診は一度も来ない', 願 === 0, `打診 ${願} 度`);
  /* 従属はこれまでどおりである。そもそも許しを要しない。 */
  const s3 = A.initState('oda');
  const 従 = Object.keys(s3.factions).find((x) => x !== 'oda' && s3.castles.some((c) => c.faction === x));
  s3.relations[A.relKey('oda', 従)] = { trust: 55, state: '従属', until: null, master: 'oda' };
  const 的 = s3.castles.find((c) => c.faction !== 'oda' && c.faction !== 従);
  確('従属は許しを要しない（これまでどおり攻められる）',
    A.臣従の主(s3, 従) === null && A.許しの要る主(s3, 従, 的.id) === null);
}

console.log('\n── 四　城替え（行き先に人がいれば交換、空なら移って城主）');
{
  const s = A.initState('oda');
  /* 入れ替える二城を選ぶ。どちらにも城主がいること。 */
  const 自領 = s.castles.filter((c) => c.faction === 'oda');
  const 主の居る = 自領.filter((c) => {
    const l = A.castellanOf(s, c);
    return l && !l.lord && l.役 !== '国主' && l.役 !== '旗頭' && l.at === c.id;
  });
  const 甲 = 主の居る[0], 乙 = 主の居る[1];
  if (甲 && 乙) {
    const a = A.castellanOf(s, 甲), b = A.castellanOf(s, 乙);
    const s2 = A.城替え(s, a.id, 乙.id);
    const a2 = s2.generals.find((x) => x.id === a.id);
    const b2 = s2.generals.find((x) => x.id === b.id);
    確('動かした者が行き先へ移る', a2.at === 乙.id, `${a.name}：${城名(s2, a2.at)}`);
    確('行き先にいた者が元の城へ入る', b2.at === 甲.id, `${b.name}：${城名(s2, b2.at)}`);
    確('互いに根を移す', a2.本領 === 乙.id && b2.本領 === 甲.id);
    確('城主の札も入れ替わる',
      (A.castellanOf(s2, s2.castles.find((c) => c.id === 乙.id)) || {}).id === a.id
      && (A.castellanOf(s2, s2.castles.find((c) => c.id === 甲.id)) || {}).id === b.id);
    確('どちらも二つの城を持たない',
      s2.castles.filter((c) => c.lordId === a.id).length === 1
      && s2.castles.filter((c) => c.lordId === b.id).length === 1);
  } else {
    確('入れ替えの場が組めた', false, '城主のいる城が二つ要る');
  }
}

console.log('\n── 四の二　行き先が空なら、移って城主になる');
{
  const s = A.initState('oda');
  const 自領 = s.castles.filter((c) => c.faction === 'oda');
  /* 将のいない城を作る。城主が討たれ、誰も入っていない城である。 */
  const 空 = 自領.find((c) => c.id !== s.factions.oda.本拠
    && !s.generals.some((x) => x.at === c.id && x.faction === 'oda' && x.lord));
  if (空) {
    for (const x of s.generals.filter((q) => q.at === 空.id && q.faction === 'oda')) x.at = null;
    空.lordId = null; 空.城代 = false;
  }
  const 元 = 自領.find((c) => c.id !== (空 || {}).id
    && s.generals.filter((x) => x.at === c.id && x.faction === 'oda' && !x.captive && !x.lord).length >= 2);
  if (空 && 元) {
    const 動 = s.generals.filter((x) => x.at === 元.id && x.faction === 'oda' && !x.captive && !x.lord
      && x.役 !== '国主' && x.役 !== '旗頭')[0];
    const s2 = A.城替え(s, 動.id, 空.id);
    const g2 = s2.generals.find((x) => x.id === 動.id);
    const 空2 = s2.castles.find((c) => c.id === 空.id);
    確('空の城へ移る', g2.at === 空.id, `${動.name}：${城名(s2, g2.at)}`);
    確('その城の主となる', 空2.lordId === 動.id,
      空2.城代 ? '（身代が足らず城代）' : '（城主）');
    確('根もその城へ移る', g2.本領 === 空.id);
  } else {
    確('空の城が見つかった（この盤では無く、検めを飛ばす）', true);
  }
}

console.log('\n── 四の三　動かせぬ者は動かさない');
{
  const s = A.initState('oda');
  const 当主 = s.generals.find((x) => x.faction === 'oda' && x.lord && !x.captive);
  const 先 = s.castles.find((c) => c.faction === 'oda' && c.id !== 当主.at);
  const s2 = A.城替え(s, 当主.id, 先.id);
  確('当主は城替えできない',
    s2.generals.find((x) => x.id === 当主.id).at === 当主.at, s2.msg || '');
  const 他家 = s.castles.find((c) => c.faction !== 'oda');
  const 誰か = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.captive && x.at);
  const s3 = A.城替え(s, 誰か.id, 他家.id);
  確('他家の城へは移せない',
    s3.generals.find((x) => x.id === 誰か.id).at === 誰か.at, s3.msg || '');
}

console.log('\n── 六　方面の報せに、旗頭の名と方面が立つ');
{
  const s = A.initState('oda');
  const 城 = s.castles.find((c) => c.faction === 'oda' && c.id !== s.factions.oda.本拠);
  const 旗 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.captive && x.at === 城.id)
    || s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.captive);
  旗.役 = '旗頭'; 旗.役国 = 城.kuni; 旗.本領 = 城.id;
  s.monthEvents = [];
  A.方面の報せ(s, { faction: 'oda', 旗頭: 旗.id }, '岐阜城を囲んだ。');
  const 文 = (s.monthEvents || [])[0] || '';
  確('旗頭の名が入る', 文.includes(旗.name), 文);
  確('どの方面かが入る', 文.includes(城.kuni), 文);
  s.monthEvents = [];
  A.方面の報せ(s, { faction: 'oda' }, '岐阜城を囲んだ。');
  確('大名直々の手勢は方面軍の報せに立たない', (s.monthEvents || []).length === 0);
}

console.log('\n── 七　受け持ちの城から城主が欠ければ、旗頭が宛てがう');
{
  const s = A.initState('oda');
  const 本拠 = s.factions.oda.本拠;
  /* 同じ国に自領を二つ持つ国を探す――旗頭の受け持ちに二城が入る形を作る。 */
  const 国ごと = {};
  for (const c of s.castles.filter((x) => x.faction === 'oda' && x.id !== 本拠)) {
    (国ごと[c.kuni] = 国ごと[c.kuni] || []).push(c);
  }
  const 国 = Object.keys(国ごと).find((k) => 国ごと[k].length >= 2);
  if (!国) { 確('同じ国に二城ある国が見つかった', false); }
  else {
    const [旗城, 空城] = 国ごと[国];
    const 旗 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.captive && x.at === 旗城.id)
      || s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.captive);
    旗.役 = '旗頭'; 旗.役国 = 国; 旗.本領 = 旗城.id; 旗.at = 旗城.id;
    旗城.lordId = 旗.id;
    /* 旗頭の城に、送り出せる者をもう一人置く。 */
    const 控 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.captive
      && x.id !== 旗.id && !x.役 && !s.castles.some((c) => c.lordId === x.id));
    控.at = 旗城.id; 控.本領 = 旗城.id;
    /* 空城から人を払い、城主の札も外す（城主が討たれた跡である）。 */
    for (const x of s.generals.filter((q) => q.at === 空城.id && q.faction === 'oda')) x.at = null;
    空城.lordId = null; 空城.城代 = false;
    確('受け持ちに城主のいない城がある',
      A.旗頭の受け持ち(s, 旗).includes(国) && !A.castellanOf(s, 空城),
      `${空城.name}（${国}）`);
    const 据 = A.旗頭が城主を宛てがう(s, 'oda');
    確('旗頭が人を送る', 据.length > 0,
      据.map((r) => `${r.将.name} → ${r.城.name}`).join('／') || 'なし');
    const 主 = A.castellanOf(s, 空城);
    確('空いた城に城主が立つ', !!主, 主 ? `${主.name}（${空城.城代 ? '城代' : '城主'}）` : 'なし');
    if (主) {
      確('送られた者はその城に居る', 主.at === 空城.id);
      確('その城が旗頭の下に繋がる（寄騎になれる）', 主.寄親 === 旗.id);
      確('送り出した城は空にならない',
        s.generals.some((x) => x.at === 旗城.id && x.faction === 'oda' && !x.captive));
    }
  }
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
