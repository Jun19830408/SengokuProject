/* 武将帳の検め（GDD 6.1 / 6.5）。

   武将を九百六十一名から千五百名へ増やすにあたって作った試験である。
   五百名を二十回に分けて足すので、一回ごとに人手で見比べていては必ず漏れる。
   足すたびにここを通せば、綻びはその場で見つかる。

   増やす前に数えたところ、いまのデータに十一件の綻びがあった。

     同じ人物が二重に入っていたもの（六件）
       武田信豊 … 武田家に katsuyori2 と t_masatoyo2 が、どちらも一五六六年登場
       本庄繁長 … 初期配置と一五五六年登場の二重
       黒田職隆 … 初期配置と一五五二年登場の二重
       明智秀満 … 足利家と織田家に、同じ一五七〇年登場で二重
       伊東祐兵 … 一五五九年生まれの者が一五四六年の初期配置に
       相良頼房 … 一五七四年生まれの者が一五四六年の初期配置に
     親子の結び先が存在しなかったもの（三件）
       toshiie2 → toshiie（前田利長。実在する id は n_toshimasa）
       mitsuharu → mitsuhide（明智秀満。実在する id は n_mitsuharu）
       hidetada2 → hideyoshi（豊臣秀頼にあたる者がそもそも居ない）
     そのほか（二件）
       小早川秀包 … 生まれた年に世に出ていた（出仕〇歳）
       大浦家 … 城を持ちながら当主がいない。城主の座も知行も家督も働かない

   いずれも id を改めた際の取り残しか、写し違いである。目で見て気づけるものでは
   なかった。以後は機械に数えさせる。

   なお PARENT は血の親子だけを表すのではない。三好長慶と実休、武田晴信と信繁の
   ように兄弟を結び、尼子晴久と国久のように叔父を結ぶこともある。家督と一門の
   結束をどう継がせるかの帳面であるから、親が子より若いことがありうる。
   したがって、ここでは年の前後は問わない。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'bushou-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { GENERALS } from "../src/data/generals.js";\n'
+ 'export { NEWCOMERS, PARENT, LONG_LIVED, FATED } from "../src/data/newcomers.js";\n'
+ 'export { CASTLES } from "../src/data/castles.js";\n'
+ 'export { FACTIONS } from "../src/data/factions.js";\n');
const out = path.join(ROOT, 'build', 'bushou.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
// 背いた者の名を、多すぎない数だけ添える
const 挙げる = (配) => 配.length
  ? `${配.length}件 ─ ${配.slice(0, 6).join(' / ')}${配.length > 6 ? ` …ほか${配.length - 6}` : ''}`
  : 'なし';
const 無し = (名, 配, 但し = '') => 確(名, 配.length === 0, 配.length ? 挙げる(配) : (但し || 'なし'));

const G = A.GENERALS, N = A.NEWCOMERS, 全 = [...G, ...N];
const 城 = new Set(A.CASTLES.map((c) => c.id));
const 家 = new Set(Object.keys(A.FACTIONS));
const 皆 = {};
for (const g of 全) 皆[g.id] = g;

console.log(`  （初期配置 ${G.length}名／のちに世に出る ${N.length}名／合わせて ${全.length}名）`);

/* ------------------------------------------------ 一、名と id の重なり */
{
  const 数 = {};
  for (const g of 全) (数[g.id] = 数[g.id] || []).push(g.name);
  無し('id が重なっていない', Object.keys(数).filter((k) => 数[k].length > 1)
    .map((k) => `${k}(${数[k].join('・')})`));

  /* 同じ名でも家が違えば別人でありうる（若狭武田の信豊と、武田信繁の子の信豊）。
     咎めるのは、同じ家の中に同じ名が二人いるときだけである。

     ただし、名の後ろに括弧書きを添えただけの重なりがあった。三好家に
     「安宅冬康」と「安宅冬康（洲本）」が、値まで同じで二人立っていたのである。
     括弧は城の名を添えて見分けをつけたつもりのものであろうが、同じ人物には
     違いない。比べる前に括弧書きを落とす。 */
  const 素の名 = (n) => n.replace(/[（(][^）)]*[）)]/g, '').trim();
  const 名家 = {};
  for (const g of 全) {
    const k = `${g.faction}/${素の名(g.name)}`;
    (名家[k] = 名家[k] || []).push(g.id);
  }
  無し('同じ家に同じ名の者が二人いない', Object.keys(名家).filter((k) => 名家[k].length > 1)
    .map((k) => `${k}(${名家[k].join(',')})`));
}

/* ------------------------------------------- 二、行き先の城と、仕える家 */
{
  無し('配置先の城がすべて実在する', 全.filter((g) => !城.has(g.at)).map((g) => `${g.name}@${g.at}`));
  無し('仕える家がすべて実在する', 全.filter((g) => !家.has(g.faction)).map((g) => `${g.name}/${g.faction}`));
}

/* --------------------------------------------------------- 三、値の欄 */
{
  const 欄 = ['lead', 'valor', 'wit', 'gov'];
  無し('統率・武勇・知略・政務がすべて一〜百に収まる',
    全.filter((g) => 欄.some((k) => !(g[k] >= 1 && g[k] <= 100)))
      .map((g) => `${g.name}(${欄.map((k) => g[k]).join('/')})`));
  無し('手勢（retinue）を持つ', 全.filter((g) => !(g.retinue > 0)).map((g) => g.name));
  無し('名と id が空でない', 全.filter((g) => !g.name || !g.id).map((g) => g.id || '(id無し)'));
}

/* ------------------------------------------------------- 四、齢と登場年

   初期配置の者は一五四六年に生きている。のちに世に出る者は、生年と登場年の
   両方を持ち、出仕は十五歳前後である（既存百八十二名の中央値もちょうど十五歳、
   十四〜十六歳が七割を占める）。

   登場年が一五四六年より前の者がいるのは誤りではない。一五四六年に既に成人して
   いる者を、盤の初めから出すための書き方である（塚原卜伝は一五〇四年、
   千利休は一五三七年）。出仕の齢で見れば、いずれも十五歳前後に収まる。 */
{
  無し('初期配置の者は齢を持つ', G.filter((g) => g.age == null).map((g) => g.name));
  無し('初期配置の齢が〇〜百に収まる（一五四六年に生きている）',
    G.filter((g) => !(g.age >= 0 && g.age <= 100)).map((g) => `${g.name}(${g.age}歳)`));
  無し('のちに世に出る者は生年と登場年を持つ',
    N.filter((g) => g.born == null || g.y == null).map((g) => g.name));
  無し('出仕は八〜四十歳のうち（十五歳前後が本則）',
    N.filter((g) => g.born != null && g.y != null && (g.y - g.born < 8 || g.y - g.born > 40))
      .map((g) => `${g.name}(${g.y - g.born}歳)`));
  const 齢 = N.filter((g) => g.born != null).map((g) => g.y - g.born).sort((a, z) => a - z);
  const 中 = 齢[Math.floor(齢.length / 2)];
  確('出仕の齢の中央値は十五歳', 中 === 15, `${中}歳（十四〜十六が ${齢.filter((x) => x >= 14 && x <= 16).length}／${齢.length}名）`);
}

/* ------------------------------------------------------------ 五、家督

   城を持つ家には当主が一人いる。いなければ城主の座も知行も家督も働かず、
   一門の結束も生じない。二人いれば家督が定まらない。 */
{
  const 主 = {};
  for (const g of G) if (g.lord) (主[g.faction] = 主[g.faction] || []).push(g.name);
  const 城持 = [...new Set(A.CASTLES.filter((c) => c.faction).map((c) => c.faction))];
  無し('城を持つ家には当主がいる', 城持.filter((f) => !主[f]));
  無し('当主は家に一人だけ', Object.keys(主).filter((f) => 主[f].length > 1)
    .map((f) => `${f}(${主[f].join('・')})`));
}

/* ------------------------------------------------------ 六、親子の結び

   PARENT は「子 → 親」の帳面である。結び先が居なければ、家督は血筋に従わず、
   一門も結束しない。しかも黙って効かなくなるだけで、どこにも現れない。 */
{
  const 欠子 = [], 欠親 = [];
  for (const [子, 親] of Object.entries(A.PARENT)) {
    if (!皆[子]) 欠子.push(`${子} → ${親}`);
    else if (!皆[親]) 欠親.push(`${皆[子].name}(${子}) → ${親}`);
  }
  無し('子として書かれた者がすべて実在する', 欠子);
  無し('親として書かれた者がすべて実在する', 欠親);

  const 環 = [];
  for (const 始 of Object.keys(A.PARENT)) {
    let x = 始; const 見 = new Set();
    for (let i = 0; i < 40 && A.PARENT[x]; i++) {
      if (見.has(x)) { 環.push(始); break; }
      見.add(x); x = A.PARENT[x];
    }
  }
  無し('親子が輪になっていない', 環);
  無し('自分を親にしていない', Object.keys(A.PARENT).filter((k) => A.PARENT[k] === k));
  // 同じ家の中で結ばれているか（家を跨ぐ結びは、養子や女婿でありうるので数だけ出す）
  const 跨 = Object.entries(A.PARENT)
    .filter(([c, p]) => 皆[c] && 皆[p] && 皆[c].faction !== 皆[p].faction)
    .map(([c, p]) => `${皆[p].name}→${皆[c].name}`);
  console.log(`  （家を跨いで結ばれた親子 ${跨.length}組：${跨.slice(0, 4).join('・')}${跨.length > 4 ? '…' : ''}）`);
}

/* --------------------------------------- 七、長命・没年の帳面が実在を指すこと */
{
  無し('八十を超えた者の帳面が実在を指す',
    Object.keys(A.LONG_LIVED || {}).filter((k) => !皆[k]));
  無し('没年の定まった者の帳面が実在を指す',
    Object.keys(A.FATED || {}).filter((k) => !皆[k]));
}

/* ------------------------------------------------ 八、家ごとの厚み（数える）

   咎めはしない。増補の途中で、どの家がどれだけ厚くなったかを見るための帳面で
   ある。石高あたりの人数で測る。城の数で測ると、小城を多く持つ家が厚く見える。 */
{
  const 家表 = {};
  for (const c of A.CASTLES) {
    if (!c.faction) continue;
    const f = 家表[c.faction] = 家表[c.faction] || { 石: 0, 初: 0 };
    f.石 += c.koku || 0;
  }
  for (const g of G) if (家表[g.faction]) 家表[g.faction].初++;
  const 行 = Object.entries(家表).filter(([, v]) => v.石 > 100000)
    .map(([k, v]) => ({ k, 万: v.石 / 10000, 初: v.初, 密: v.初 / (v.石 / 10000) }))
    .sort((a, z) => a.密 - z.密);
  console.log(`  （万石あたりの武将 ─ 薄い順に五家： ${行.slice(0, 5)
    .map((r) => `${(A.FACTIONS[r.k] && A.FACTIONS[r.k].name) || r.k} ${r.密.toFixed(2)}`).join('・')}）`);
  console.log(`  （十万石以上の ${行.length}家の平均 ${(行.reduce((a, r) => a + r.密, 0) / 行.length).toFixed(2)}名／万石）`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
