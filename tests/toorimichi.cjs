/* 軍は、他家の領を素通りしない（GDD 7.1）。

   長宗我部で遊んでいたら、来島村上が伊予から土佐の岡豊城を攻めてきた、
   との報せ。地図の上では道が繋がっているが、途中は他家の領である。
   遊ぶ側からは「見えない街道がある」としか映らない。

   調べると、通れる城だけを辿る道さがし（findPathVia）は既にあり、
   その説き書きにもこうあった。

     「選ぶときは『通れる所だけを通る道』で判じておきながら、進むときは
       いちばん安い道を辿っていた。それでは、通れぬはずの他家の城を素通りする」

   ところがこの掟は、遊ぶ側の画面にしか入っていなかった。他家の采配は
   findPath を素で使い、いちばん安い道を辿っていた。十年ぶんの軍の道を
   数えると、八十三本のうち一本が他家の領を素通りしていた。

     蘆名の軍　猪苗代城(蘆名) → 須賀川城(二階堂) → 白河小峰城(白河結城) → 烏山城(那須)

   通ってよいのは、自家の城と、旗の下・同盟の城だけである。目当ての城
   そのものは通れずともよい――そこへ攻め入るのだから。
   掟に適う道が無ければ、その城へは出さない。素の道へ落として繕わない。
   落とせば、この掟は無いのと同じである。

   なお、報せにあった来島村上の一件は掟に適っていた。来島村上は河野の
   水軍であり、河野に従属している。主家の領を通るのは差し支えない。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'toorimichi-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState, relOf, 軍の道, 通れる城 } from "../src/core/state.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { findPath, marchMonths } from "../src/core/paths.js";\n'
+ 'export { 外交を結ぶ } from "../src/govern/commands.js";\n');
const out = path.join(ROOT, 'build', 'toorimichi.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 0x515;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

console.log('\n── 一　掟そのもの');
{
  const s = A.initState('oda');
  const 名 = (id) => { const c = s.castles.find((x) => x.id === id); return c ? c.name : id; };
  // 中立の家の城を挟む二城を探し、その道が退けられることを見る
  let 例 = null;
  for (const a of s.castles) {
    if (例) break;
    for (const b of s.castles) {
      if (a.faction === b.faction) continue;
      const 素 = A.findPath(a.id, b.id);
      if (!素 || 素.length < 3) continue;
      const 通 = A.通れる城(s, a.faction);
      if (!素.slice(1, -1).some((id) => !通(id))) continue;
      例 = { a, b, 素 };
      break;
    }
  }
  確('他家の領を挟む道が盤にある（試すに足る）', !!例,
    例 ? `${例.a.name} → ${例.b.name}　素の道 ${例.素.map(名).join('→')}` : 'なし');
  if (例) {
    const 軍 = A.軍の道(s, 例.a.faction, 例.a.id, 例.b.id);
    const 通 = A.通れる城(s, 例.a.faction);
    確('軍の道は、その道を選ばない',
      !軍 || !軍.slice(1, -1).some((id) => !通(id)),
      軍 ? `${軍.map(名).join('→')}` : '道なし（出せない）');
  }
  // 目当ての城そのものは、通れずともよい
  const 敵 = s.castles.find((c) => c.faction !== 'oda' && A.findPath('nagoya', c.id)
    && A.findPath('nagoya', c.id).length === 2);
  確('目当ての城そのものへは、通れずとも寄せられる',
    !敵 || !!A.軍の道(s, 'oda', 'nagoya', 敵.id),
    敵 ? `那古野城 → ${敵.name}` : '隣り合う敵城がない');
}

console.log('\n── 二　十年送って、素通りする軍が一つも出ない');
{
  種 = 0x515;
  let s = A.initState('oda');
  s.autoPlay = true;
  let 総 = 0, 違反 = 0;
  const 例 = [];
  for (let m = 0; m < 120; m++) {
    s = A.advanceMonth(s, s);
    for (const a of s.armies || []) {
      if (!a.path || a.path.length < 3) continue;
      総++;
      const 通 = A.通れる城(s, a.faction);
      const 中 = a.path.slice(1, -1).filter((id) => !通(id));
      if (中.length) {
        違反++;
        if (例.length < 3) {
          const 名 = (id) => {
            const c = s.castles.find((x) => x.id === id);
            return c ? `${c.name}(${s.factions[c.faction].name.replace('家', '')})` : id;
          };
          例.push(`${s.factions[a.faction].name.replace('家', '')}の軍　${a.path.map(名).join(' → ')}`);
        }
      }
    }
  }
  確('十年ぶんの軍が、他家の領を素通りしない', 違反 === 0,
    `${総}本の道を検めて 素通り ${違反}本`);
  for (const e of 例) console.log(`      ${e}`);
  確('軍そのものは出ている（掟で盤が凍っていない）', 総 >= 40, `${総}本`);
}

console.log('\n── 三　上下は一方通行。同盟は道を許さない');
{
  const s = A.initState('oda');
  const 名 = (id) => { const c = s.castles.find((x) => x.id === id); return c ? c.name : id; };
  const 道 = (f, a, b) => (A.軍の道(s, f, a, b) || []).map(名).join('→');
  /* 従えている側は、従えた家の領を兵が通る。断れる道理がない。
     逆に、従っている側が主家の領を素通りして、その先の家へ攻め入ることは
     できない。主家がそれを許すはずがない。 */
  確('主は、旗の下の家の領を通れる', !!A.軍の道(s, 'oda', 'nagoya', 'okazaki'),
    道('oda', 'nagoya', 'okazaki'));
  確('旗の下の家は、主家の領を素通りできない', !A.軍の道(s, 'mizuno', 'kariya', 'kiyosu'),
    道('mizuno', 'kariya', 'kiyosu') || '通れない');
  /* 誼を通じることと、領内を軍が抜けることは別である。同盟の領を素通り
     できてしまうと、同盟を結んだ相手の隣家が、いきなり遠くの家に攻められる。 */
  const t = A.initState('oda');
  t.relations['imagawa|oda'] = { trust: 80, state: '同盟', until: null };
  確('同盟を結んでも、その領は通れない', !A.軍の道(t, 'oda', 'nagoya', 'yoshida'),
    (A.軍の道(t, 'oda', 'nagoya', 'yoshida') || []).map(名).join('→') || '通れない');
  // 道を借りれば通れる（借道）
  const r = A.外交を結ぶ(t, 'oda', 'imagawa', '道を借りる');
  確('道を借りれば通れる', r.ok && !!A.軍の道(t, 'oda', 'nagoya', 'yoshida'),
    r.ok ? (A.軍の道(t, 'oda', 'nagoya', 'yoshida') || []).map(名).join('→') : '★' + r.why);
  確('借りたのは片道である（貸したほうは通れない）',
    !A.軍の道(t, 'imagawa', 'sunpu', 'kiyosu') || !(A.軍の道(t, 'imagawa', 'sunpu', 'kiyosu') || [])
      .slice(1, -1).some((id) => { const c = t.castles.find((x) => x.id === id); return c && c.faction === 'oda'; }),
    '今川は織田の領を通れない');
  // 期限が切れれば閉じる
  t.year = 1547; t.month = 5;
  確('期限が切れれば、また閉じる', !A.軍の道(t, 'oda', 'nagoya', 'yoshida'),
    `借りたのは1546年10月まで`);
}

console.log('\n── 四　水軍の家は山を越えない');
{
  const s = A.initState('oda');
  const 名 = (id) => { const c = s.castles.find((x) => x.id === id); return c ? c.name : id; };
  確('水軍の家は、街道なら通れる', !!A.軍の道(s, 'kurushima', 'kokubunyama', 'yuzuki'),
    (A.軍の道(s, 'kurushima', 'kokubunyama', 'yuzuki') || []).map(名).join('→'));
  確('水軍の家は、山道を越えて攻めない', !A.軍の道(s, 'kurushima', 'kokubunyama', 'kawanoe'),
    '国分山城→川之江城は山道');
  確('陸の家なら、その山道を通れる', !!A.軍の道(s, 'kono', 'yuzuki', 'kawanoe'),
    (A.軍の道(s, 'kono', 'yuzuki', 'kawanoe') || []).map(名).join('→'));
}

console.log('\n── 五　蝦夷は地元の者だけが速い');
{
  const s = A.initState('oda');
  const 蝦 = s.castles.filter((c) => c.kuni === '蝦夷');
  const a = 蝦.find((c) => c.name === '宇須岸館'), b = 蝦.find((c) => c.name === '宗谷の砦');
  const 地 = A.marchMonths(a.id, b.id, 'kakizaki');
  const 外 = A.marchMonths(a.id, b.id, 'oda');
  確('蝦夷の家は速いまま', 地 <= 5, `蠣崎 ${地}か月`);
  確('本州の家は手間取る', 外 >= 地 * 2, `織田 ${外}か月（蠣崎の${(外 / 地).toFixed(1)}倍）`);
  確('蝦夷の外では、家によって変わらない',
    A.marchMonths('nagoya', 'okazaki', 'oda') === A.marchMonths('nagoya', 'okazaki', 'kakizaki'),
    `那古野→岡崎 ${A.marchMonths('nagoya', 'okazaki', 'oda')}か月`);
}

console.log('\n── 六　道の敷き方（島を跨ぐのに陸の道がない）');
{
  const s = A.initState('oda');
  const 島 = { 四国: ['阿波', '讃岐', '伊予', '土佐'],
    九州: ['筑前', '筑後', '豊前', '豊後', '肥前', '肥後', '日向', '大隅', '薩摩'],
    壱岐: ['壱岐'], 対馬: ['対馬'], 淡路: ['淡路'], 隠岐: ['隠岐'],
    佐渡: ['佐渡'], 蝦夷: ['蝦夷'], 琉球: ['琉球'] };
  const 島名 = (k) => { for (const [n, v] of Object.entries(島)) if (v.includes(k)) return n; return '本州'; };
  const { ROADS } = require(path.join(ROOT, 'build', 'harness.cjs'));
  const C = {}; for (const c of s.castles) C[c.id] = c;
  const 跨 = (ROADS || []).filter(([a, b, , t]) =>
    C[a] && C[b] && t !== '海路' && 島名(C[a].kuni) !== 島名(C[b].kuni));
  確('島を跨ぐ道は、みな海路である', 跨.length === 0,
    跨.slice(0, 4).map(([a, b, , t]) => `${C[a].name}─${C[b].name}(${t})`).join(' / ') || 'なし');
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
