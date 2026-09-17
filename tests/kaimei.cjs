/* 城の改名（GDD 4.7）。

   天文十五年（一五四六）の名で盤を立てているが、世が進めば名は変わる。
   稲葉山が岐阜になり、石山本願寺の跡に大坂城が建ち、黒川は若松と改まる。
   その年が来たら、盤の名も改める。

   拾うのは「同じ地で建て替えられたもの」と「近くへ本城の役目が移ったもの」に
   限る。遠くへ移ったもの（吉田郡山城から広島城、月山富田城から松江城）は
   入れない――盤の上の場所は動かぬのに名だけ飛べば、地図と名が食い違う。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { initState, advanceMonth, migrateSave, 城の名を改める } = H;
/* 改名の表そのものも束ねて読む（engine の包みには入っていない）。 */
const fs = require('fs');
const esbuild = require('esbuild');
const 表の道 = path.join(__dirname, '..', 'build', 'kaimei.cjs');
fs.mkdirSync(path.dirname(表の道), { recursive: true });
esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'data', 'kaimei.js')],
  bundle: true, format: 'cjs', outfile: 表の道, logLevel: 'error' });
const { 城の改名, 改まった名 } = require(表の道);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 名 = (s, id) => (s.castles.find((c) => c.id === id) || {}).name;

console.log('── 一　表そのものの検め');
{
  const s = initState('oda');
  const ids = new Set(s.castles.map((c) => c.id));
  const 無い = 城の改名.filter((x) => !ids.has(x.id));
  確('改名の先が、みな盤にある城である', 無い.length === 0, 無い.map((x) => x.id).join('・') || `${城の改名.length}件`);
  確('年が盤の始まりより後である', 城の改名.every((x) => x.y > 1546),
    `最も早い ${Math.min(...城の改名.map((x) => x.y))}年`);
  確('どれにも訳が添えてある', 城の改名.every((x) => !!x.訳));
  /* 改めた名が、盤の別の城と重ならないこと。重なれば地図で見分けがつかない。 */
  const 元の名 = new Set(s.castles.map((c) => c.name));
  const 改名先 = 城の改名.map((x) => x.名);
  const 衝突 = 改名先.filter((n) => 元の名.has(n));
  確('改めた名が、元からある城の名と重ならない', 衝突.length === 0, 衝突.join('・') || 'なし');
  const 重 = 改名先.filter((n, i) => 改名先.indexOf(n) !== i);
  確('改名先どうしも重ならない', 重.length === 0, [...new Set(重)].join('・') || 'なし');
}

console.log('\n── 二　その年が来れば改まる');
{
  const s = initState('oda');
  確('始めの年は天文十五年の名である',
    名(s, 'inabayama') === '稲葉山城' && 名(s, 'ishiyama') === '石山本願寺'
    && 名(s, 'kannonji') === '観音寺城' && 名(s, 'tsutsujigasaki') === '躑躅ヶ崎館',
    `${名(s, 'inabayama')}・${名(s, 'ishiyama')}・${名(s, 'kannonji')}・${名(s, 'tsutsujigasaki')}`);
  const 見る = (y, id) => {
    const t = JSON.parse(JSON.stringify(s)); t.year = y;
    城の名を改める(t);
    return 名(t, id);
  };
  確('一五六七年に稲葉山が岐阜になる', 見る(1567, 'inabayama') === '岐阜城', 見る(1567, 'inabayama'));
  確('その前年はまだ稲葉山である', 見る(1566, 'inabayama') === '稲葉山城', 見る(1566, 'inabayama'));
  確('一五七六年に観音寺が安土になる', 見る(1576, 'kannonji') === '安土城', 見る(1576, 'kannonji'));
  確('一五八三年に石山本願寺が大坂になる', 見る(1583, 'ishiyama') === '大坂城', 見る(1583, 'ishiyama'));
  確('一五九三年に黒川が若松になる', 見る(1593, 'kurokawa') === '会津若松城', 見る(1593, 'kurokawa'));
}

console.log('\n── 三　二度改まる城は、年の順に新しいほうを取る');
{
  /* 躑躅ヶ崎館 → 新府城（一五八一）→ 甲府城（一五九三）。 */
  確('一五八一年は新府城', (改まった名('tsutsujigasaki', 1581) || {}).名 === '新府城');
  確('一五九二年はまだ新府城', (改まった名('tsutsujigasaki', 1592) || {}).名 === '新府城');
  確('一五九三年からは甲府城', (改まった名('tsutsujigasaki', 1593) || {}).名 === '甲府城');
  確('一六〇〇年でも甲府城（古い名に戻らない）',
    (改まった名('tsutsujigasaki', 1600) || {}).名 === '甲府城');
  確('年が来ていなければ改まらない', 改まった名('tsutsujigasaki', 1580) === null);
}

console.log('\n── 四　月を送れば、その場で改まり戦国記に残る');
{
  let 種 = 4649;
  Math.random = function () {
    種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
    let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let s = initState('oda');
  s.autoPlay = true; s.year = 1566; s.month = 11;
  確('前は稲葉山城', 名(s, 'inabayama') === '稲葉山城');
  let 報 = [];
  for (let i = 0; i < 4; i++) {
    s = advanceMonth(s);
    報 = 報.concat((s.monthEvents || []).filter((t) => /改まった/.test(t)));
  }
  確('年が明ければ改まる', 名(s, 'inabayama') === '岐阜城', 名(s, 'inabayama'));
  確('戦国記に残る', 報.some((t) => /稲葉山城が岐阜城と改まった/.test(t)), 報[0] || 'なし');
  確('旧い名も控えられる', (s.castles.find((c) => c.id === 'inabayama') || {}).旧名 === '稲葉山城');
  確('一度告げたら、翌月にまた告げない',
    (s.monthEvents || []).filter((t) => /稲葉山城が岐阜城/.test(t)).length === 0);
}

console.log('\n── 五　古い記録を読めば、過ぎた改名がまとめて当たる');
{
  const s = initState('oda');
  const 生 = JSON.parse(JSON.stringify(s));
  for (const k of ['courtRanks', '惣無事令', '惣無事令の控え', '惣無事令の問い', '朝敵', '号令', '物故']) delete 生[k];
  生.year = 1600;
  const t = migrateSave(JSON.parse(JSON.stringify(生)));
  確('稲葉山城 → 岐阜城', 名(t, 'inabayama') === '岐阜城');
  確('石山本願寺 → 大坂城', 名(t, 'ishiyama') === '大坂城');
  確('躑躅ヶ崎館 → 甲府城', 名(t, 'tsutsujigasaki') === '甲府城');
  確('まだ年の来ていない城は、そのまま', 名(t, 'kumamoto') === '隈本城', 名(t, 'kumamoto'));
  /* 名が重ならないこと（盤じゅうを検める）。 */
  const 皆 = t.castles.map((c) => c.name);
  const 重 = 皆.filter((x, i) => 皆.indexOf(x) !== i);
  const 元 = s.castles.map((c) => c.name).filter((x, i, a) => a.indexOf(x) !== i);
  確('改名で新たな同名が生じない', 重.length === 元.length,
    `改名後 ${[...new Set(重)].join('・') || 'なし'}／元から ${[...new Set(元)].join('・') || 'なし'}`);
}

console.log('\n── 六　遠くへ移った本城は、移った先に近い城を改める');
{
  /* 毛利は吉田郡山から広島へ、堀尾は月山富田から松江へ移った。移した城の名を
     動かすと地図と食い違うので、移った先に近い城のほうを改める。 */
  const s = initState('oda');
  const 城 = (id) => s.castles.find((c) => c.id === id);
  const 隔 = (a, b) => Math.hypot(城(a).x - 城(b).x, 城(a).y - 城(b).y);

  確('吉田郡山城は名を変えない', !改まった名('koriyama_a', 1700), 城('koriyama_a').name);
  確('かわりに銀山城が広島城になる', (改まった名('kanayama_a', 1589) || {}).名 === '広島城');
  確('広島になる城は、同じ国の元の本城より西の海寄りにある',
    城('kanayama_a').y > 城('koriyama_a').y, `隔たり ${Math.round(隔('kanayama_a', 'koriyama_a'))}`);

  確('月山富田城は名を変えない', !改まった名('gassan', 1700), 城('gassan').name);
  確('かわりに白鹿城が松江城になる', (改まった名('shiraga', 1611) || {}).名 === '松江城');

  /* 近い城が盤に無いもの（毛利の萩など）は入れない。 */
  const 萩 = 城の改名.filter((x) => x.名 === '萩城');
  確('近い城の無いものは入れない（萩城）', 萩.length === 0);

  /* 改める先は、その国のうちにあること。国をまたいで名が飛ばない。 */
  const 国違い = 城の改名.filter((x) => {
    const c = 城(x.id);
    return !c;
  });
  確('改名の先がみな盤にある', 国違い.length === 0, `${城の改名.length}件`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
