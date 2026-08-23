/* 他家の外交と調略（GDD 12.1 / 11.2）。

   これまで他家は外交をしなかった。始めに定まった間柄――毛利は大内に従属、
   長宗我部は一条に従属、伊達と蘆名は同盟――が、三十年経っても寸分違わず残った。
   誰も誼を通じず、誰も膝を屈さず、誰も旗を翻さない。調略の列（s.plots）に
   他家の名が載ることも、一度もなかった。

   いま、他家は遊ぶ側と同じ手を打つ。同じ関門（DIPLO の need と費え、PLOTS の
   知略と月数）をくぐるので、二つの理屈が食い違うことはない。

     ・己より遙かに大きい隣家には膝を屈する
     ・己より小さい隣家は従える（すでに他家の旗の下にある家は取れない）
     ・背後の家とは誼を通じ、信用が篤ければ不可侵か同盟を結ぶ
     ・従っている家より大きくなれば、旗を翻す
     ・狙う城には手の者を入れる

   気をつけたのは二つ。二人の主に仕えさせないこと（一つの家が三家にも四家にも
   臣従して、盤が上下の網で埋まった）。そして盤を凍らせないこと（同盟と旗の下は
   攻めを封じるので、家々が片端から結べば戦が消える）。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'gaiko-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState, relOf, relKey, factionKoku, atPeace } from "../src/core/state.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { 外交の采配, 調略の采配, 特殊勢力の采配, 隣家, 旗の下にいるか } from "../src/govern/aiDiplo.js";\n'
+ 'export { doDiplo, 外交を結ぶ } from "../src/govern/commands.js";\n'
+ 'export { PLOTS, DIPLO } from "../src/data/diplo.js";\n');
const out = path.join(ROOT, 'build', 'gaiko.cjs');
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

const 状 = (s, f) => Object.values(s.relations).filter(f).length;

/* ---------------------------------------------- 一、遊ぶ側の下知は今まで通り */
{
  const s = A.initState('oda');
  const k = ['oda', 'imagawa'].sort().join('|');
  s.relations[k] = { trust: 40, state: '中立', until: null };
  s.factions.oda.gold = 5000;
  const t = A.doDiplo(s, 'imagawa', '親善');
  確('遊ぶ側の親善は信用を上げる', t.relations[k].trust === 49, `${40} → ${t.relations[k].trust}`);
  確('金を払う', t.factions.oda.gold < 5000, `${5000 - t.factions.oda.gold}貫`);
  const t2 = A.doDiplo(t, 'imagawa', '同盟');
  確('筋の立たぬ結びは成らない（信用が足りない）', t2.relations[k].state === '中立', t2.relations[k].state);
}

/* ---------------------------------------------- 二、他家も結ぶ */
{
  const s = A.initState('oda');
  s.卓 = '試の卓';
  // 松平（小）と今川（大）を中立に戻し、松平に金を持たせる
  const k = ['matsudaira', 'imagawa'].sort().join('|');
  s.relations[k] = { trust: 40, state: '中立', until: null };
  s.factions.matsudaira.gold = 9000;
  let 手 = null;
  for (let i = 0; i < 40 && !手; i++) { s.month = (s.month % 12) + 1; if (s.month === 1) s.year++; 手 = A.外交の采配(s, 'matsudaira', {}); }
  確('他家が外交の手を打つ', !!手, 手 ? `${手.手} → ${s.factions[手.先].name}` : '何もしない');

  /* 膝を屈するところは籤の目に左右されるので、ここでは掟だけを見る
     （実際に屈するかどうかは hatanoshita の試験で確かめている）。
     二十五年送った盤で、旗の下に入った家が増えていることは下で見る。 */
}

/* ---------------------------------------------- 三、二十五年送ってみる */
const s = (() => { let t = A.initState('oda'); t.autoPlay = true; return t; })();
{
  let t = s;
  const 初 = { 同: 状(t, (r) => r.state === '同盟'), 不: 状(t, (r) => r.state === '不可侵'),
    従: 状(t, (r) => r.state === '従属'), 臣: 状(t, (r) => r.state === '臣従') };
  for (let i = 0; i < 12 * 25; i++) t = A.advanceMonth(t, t);
  const 後 = { 同: 状(t, (r) => r.state === '同盟'), 不: 状(t, (r) => r.state === '不可侵'),
    従: 状(t, (r) => r.state === '従属'), 臣: 状(t, (r) => r.state === '臣従') };
  確('二十五年のうちに間柄が動く', 後.同 > 初.同 && (後.従 + 後.臣) > (初.従 + 初.臣),
    `同盟 ${初.同}→${後.同}／不可侵 ${初.不}→${後.不}／従属 ${初.従}→${後.従}／臣従 ${初.臣}→${後.臣}`);

  // 二人の主に仕えない
  /* 盟約の印は "a|b" という字である。字として含まれるかで見ると、
     "so"（宗家）が "chosokabe|ichijo" に引っかかる。区切りで分けて突き合わせる。 */
  const 相手 = (k, fid) => { const p = k.split('|'); return p[0] === fid ? p[1] : p[1] === fid ? p[0] : null; };
  const 二重 = Object.keys(t.factions).filter((fid) => {
    let n = 0;
    for (const k of Object.keys(t.relations)) {
      if (!相手(k, fid)) continue;
      const r = t.relations[k];
      if (!['従属', '臣従'].includes(r.state)) continue;
      const 相 = 相手(k, fid);
      if (r.master === 相 || (r.master == null && A.factionKoku(t, 相) > A.factionKoku(t, fid))) n++;
    }
    return n > 1;
  });
  if (二重.length) for (const fid of 二重) {
    const 列 = Object.keys(t.relations).filter((k) => 相手(k, fid)
      && ['従属', '臣従'].includes(t.relations[k].state))
      .map((k) => `${k}:${t.relations[k].state}(主${t.relations[k].master || '―'})`);
    console.log('    ', t.factions[fid].name, 列.join(' / '));
  }
  確('二人の主に仕える家はない', !二重.length, 二重.length ? `${二重.length}家` : '');

  // 他家も調略を仕掛ける
  const 他企 = (t.plots || []).filter((p) => p.faction !== t.player);
  確('他家も調略を仕掛ける', 他企.length > 0,
    他企.length ? `進行中 ${他企.length}件（${[...new Set(他企.map((p) => p.type))].join('・')}）` : 'なし');

  // 他家も特殊勢力と結ぶ
  const 特 = Object.values(t.specials || {}).filter((x) => x.state && x.state !== '中立' && x.faction !== t.player);
  確('他家も特殊勢力と結ぶ', 特.length > 0, `${特.length}件`);

  /* 盤が凍らないこと。同盟と旗の下は攻めを封じる。
     家々が片端から結べば、戦そのものが盤から消える。 */
  const 家 = [...new Set(t.castles.map((c) => c.faction))];
  let 和 = 0, n = 0;
  for (const f of 家) {
    const 隣 = A.隣家(t, f);
    if (!隣.length) continue;
    和 += 隣.filter((x) => !A.atPeace(t, f, x.先)).length / 隣.length;
    n++;
  }
  const 割 = Math.round((和 / Math.max(1, n)) * 100);
  確('盤は凍らない（攻められる隣家が半ば以上残る）', 割 >= 50, `${割}％の隣家はまだ攻められる`);

  // 当主が城ごと寝返って一つの家に当主が二人並ぶ、ということが起きない
  const 二君 = Object.keys(t.factions).filter((fid) =>
    t.generals.filter((x) => x.faction === fid && x.lord && !x.captive).length > 1);
  確('一つの家に当主は一人', !二君.length, 二君.length ? `${二君.length}家` : '');
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
