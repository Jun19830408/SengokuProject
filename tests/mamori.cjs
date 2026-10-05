/* 守りを旗頭に預ける（GDD 6.4）。

   方面を預けたなら、その国々の守りも旗頭が執る。遊ぶ側の申し出は
   「旗頭の城が他国から攻められた場合でも、プレイヤーが防戦と防御側で
   城攻めをしなければならない。これも旗頭が対応するようにしてほしい」であった。

   預けるのは受け持ちの城だけである。本拠と、当主のいる城は大名が自ら守る。
   城下に大名直々の手勢を置いたときも、采配は大名が執る――自ら動かした
   手勢の戦まで取り上げては、援軍を出した意味がない。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'mamori-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState } from "../src/core/state.js";\n'
+ 'export { 守りの寄親, 守りを旗頭に任せるか } from "../src/core/inin.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { newRoster } from "../src/core/roster.js";\n');
const out = path.join(ROOT, 'build', 'mamori.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

let 種 = 0x7A1F;
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

/* 旗頭を一人立て、別の城を寄騎に取らせる場を組む。
   任じる筋（身分・国主・枠）は rank.js の試験が見ているので、ここでは
   役と寄親の札だけを置いて、守りの預けがどう判ずるかを測る。 */
const 場を組む = (fid = 'oda') => {
  const s = A.initState(fid);
  const 本拠 = s.castles.find((c) => c.id === s.factions[fid].本拠);
  const 自領 = s.castles.filter((c) => c.faction === fid && c.id !== 本拠.id);
  const 旗城 = 自領[0], 寄城 = 自領[1];
  const 城主を据える = (c) => {
    let g = s.generals.find((x) => x.id === c.lordId && x.faction === fid && !x.captive);
    if (!g) {
      g = s.generals.find((x) => x.faction === fid && x.at === c.id && !x.captive && !x.lord);
      if (g) c.lordId = g.id;
    }
    return g;
  };
  const 旗 = 城主を据える(旗城);
  const 寄 = 寄城 ? 城主を据える(寄城) : null;
  if (旗) { 旗.役 = '旗頭'; 旗.役国 = 旗城.kuni; 旗.本領 = 旗城.id; 旗.at = 旗城.id; }
  if (寄 && 旗) { 寄.寄親 = 旗.id; 寄.at = 寄城.id; }
  return { s, 本拠, 旗城, 寄城, 旗, 寄 };
};

/* 城を囲む。寄せ手は他家の軍である */
const 囲ませる = (s, c) => {
  const 敵 = s.castles.find((x) => x.faction !== c.faction);
  /* 将のいない軍は月送りで解かれる（軍ではないからである）。将を一人乗せる。 */
  const 将 = s.generals.find((x) => x.faction === 敵.faction && !x.captive && !x.lord
    && x.at === 敵.id) || s.generals.find((x) => x.faction === 敵.faction && !x.captive);
  if (将) 将.at = null;
  const a = { id: `S-${c.id}`, faction: 敵.faction, from: 敵.id, gens: 将 ? [将.id] : [],
    local: 4000, localTrain: 70, rost: A.newRoster(4000, `arm-S-${c.id}`),
    men: 4000, at: c.id, path: [c.id], prog: 0, food: 20000,
    target: c.id, sieging: true };
  s.armies.push(a);
  s.sieges = [...(s.sieges || []).filter((x) => x.castleId !== c.id),
    { castleId: c.id, armyId: a.id, months: 0, decided: null }];
  return a;
};

console.log('── 一　どの城の守りを預けたか');
{
  const { s, 本拠, 旗城, 寄城, 旗 } = 場を組む();
  確('旗頭が立つ', !!旗 && 旗.役 === '旗頭', 旗 ? `${旗.name}（${旗城.name}）` : 'なし');
  確('旗頭の城の守りは旗頭が執る',
    !!A.守りの寄親(s, 旗城) && A.守りの寄親(s, 旗城).id === (旗 || {}).id);
  if (寄城) {
    確('寄騎の城の守りも旗頭が執る',
      !!A.守りの寄親(s, 寄城) && A.守りの寄親(s, 寄城).id === (旗 || {}).id,
      `${寄城.name}`);
  }
  確('本拠の守りは大名が執る', A.守りの寄親(s, 本拠) === null, 本拠.name);
  const 当主城 = s.castles.find((c) => {
    const l = s.generals.find((x) => x.id === c.lordId);
    return c.faction === 'oda' && l && l.lord;
  });
  if (当主城) 確('当主のいる城も大名が執る', A.守りの寄親(s, 当主城) === null, 当主城.name);
}

console.log('\n── 二　預けた城が囲まれたら、大名の決めを待たずに進む');
{
  const { s, 旗城 } = 場を組む();
  const a = 囲ませる(s, 旗城);
  確('寄せ手が城を囲んでいる', !!s.sieges.length && s.sieges[0].castleId === 旗城.id,
    `${s.factions[a.faction].name}の${a.men}人`);
  const s2 = A.advanceMonth(s, s);
  const sg2 = (s2.sieges || []).find((x) => x.castleId === 旗城.id);
  const 落ちた = !sg2 && (s2.castles.find((c) => c.id === 旗城.id) || {}).faction !== 'oda';
  確('囲みが進む（止まらない）', !sg2 || sg2.months > 0,
    sg2 ? `囲み${sg2.months}ヶ月` : 落ちた ? '城が落ちた' : '囲みが消えた');
  const 報 = (s2.monthEvents || []).join(' / ');
  const 方面 = (s2.monthEvents || []).filter((x) => /方面軍/.test(x));
  確('囲まれていることが月報に出る', 方面.length > 0 || 落ちた,
    方面.join(' / ').slice(0, 160) || '（方面軍の報せなし）');
}

console.log('\n── 三　預けていない城の囲みは、これまでどおり大名が決める');
{
  const { s, 本拠 } = 場を組む();
  囲ませる(s, 本拠);
  const s2 = A.advanceMonth(s, s);
  const sg2 = (s2.sieges || []).find((x) => x.castleId === 本拠.id);
  確('本拠の囲みは進まない（遊ぶ側の決めを待つ）', !!sg2 && (sg2.months || 0) === 0,
    sg2 ? `囲み${sg2.months || 0}ヶ月` : '囲みが消えた');
}

console.log('\n── 四　城下に大名直々の手勢があれば、采配は大名が執る');
{
  const { s, 旗城 } = 場を組む();
  const a = 囲ませる(s, 旗城);
  s.armies.push({ id: 'MINE', faction: 'oda', from: 旗城.id, gens: [], local: 1200,
    localTrain: 70, rost: A.newRoster(1200, 'arm-MINE'), men: 1200,
    at: 旗城.id, path: [旗城.id], prog: 0, food: 6000, 在陣: 旗城.id });
  確('大名の手勢に預けの印はない', !s.armies.find((x) => x.id === 'MINE').旗頭);
  確('その城の守りは旗頭に任せない',
    A.守りを旗頭に任せるか(s, 旗城, a) === null);
  const s2 = A.advanceMonth(s, s);
  const sg2 = (s2.sieges || []).find((x) => x.castleId === 旗城.id);
  確('囲みは進まない（遊ぶ側の決めを待つ）', !!sg2 && (sg2.months || 0) === 0,
    sg2 ? `囲み${sg2.months || 0}ヶ月` : '囲みが消えた');
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
