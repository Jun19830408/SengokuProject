/* 名乗りと架空の者（GDD 6.7）。

   遊びの中で生まれた子の名は「姓の頭二字＋選んだ字＋父の名の末字」で付けていた。
   それで次の乱れが出た（一五八八年の記録で百七十四名のうち四十五名）。
     一字の姓を取り違える　原胤貞の子が「原胤政貞」、北信愛の子が「北信政愛」
     三字の姓を切る　　　　朝比奈泰朝の子が「朝比元知」、新発田の子が「新発義貞」
     字が重なる　　　　　　「和田政政」「河尻隆隆」
     同じ名が重なる　　　　尚元政王の子がまた尚元政王、福原義俊が二人
   また、子がまた子をなすので、四十二年で武将の二割が架空の者になった。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'nanori-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { 姓名, 姓 } from "../src/core/util.js";\n'
+ 'export { 子の名, 架空の名を繕う, is架空, 架空の上限, pickHeir, 一族の格, 一族, 一族の枠 } from "../src/core/house.js";\n'
+ 'export { initState } from "../src/core/state.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { GENERALS } from "../src/data/generals.js";\n'
+ 'export { NEWCOMERS, KANJI_TSUJI } from "../src/data/newcomers.js";\n');
const out = path.join(ROOT, 'build', 'nanori.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

console.log('── 一　姓と名乗りを分ける');
{
  const 例 = [
    ['織田信長', '織田', '信長'], ['原胤貞', '原', '胤貞'], ['北信愛', '北', '信愛'], ['堀直政', '堀', '直政'],
    ['朝比奈泰朝', '朝比奈', '泰朝'], ['新発田重家', '新発田', '重家'], ['長宗我部元親', '長宗我部', '元親'],
    ['渡辺糺', '渡辺', '糺'], ['木下藤吉郎', '木下', '藤吉郎'], ['竹中半兵衛', '竹中', '半兵衛'],
    ['鈴木出羽守', '鈴木', '出羽守'], ['品川左京亮', '品川', '左京亮'], ['大石内蔵助', '大石', '内蔵助'],
    ['日根野弘守', '日根野', '弘守'], ['チトセ乙名', 'チトセ', '乙名'], ['顕如', '', '顕如'], ['ハシタイン', '', 'ハシタイン'],
  ];
  const 外れ = 例.filter(([n, a, b]) => { const r = A.姓名(n); return r.姓 !== a || r.名乗り !== b; });
  確('名高い者・官途名・呼び名を正しく分ける', !外れ.length,
    外れ.map(([n]) => `${n}→${A.姓名(n).姓}|${A.姓名(n).名乗り}`).join(' ') || `${例.length}例`);
}

console.log('\n── 二　子の名');
{
  const s = A.initState('oda');
  const 名 = (父名, id = 'x') => { const g = { id, name: 父名 }; return A.子の名(s, g); };
  const 信長の子 = 名('織田信長');
  確('通字を継ぐ（信長の子は「織田信」）', /^織田信./.test(信長の子) && 信長の子.length === 4, 信長の子);
  確('一字の姓を取り違えない', /^原胤./.test(名('原胤貞')) && 名('原胤貞').length === 3, 名('原胤貞'));
  確('三字の姓を切らない', /^朝比奈泰./.test(名('朝比奈泰朝')), 名('朝比奈泰朝'));
  確('呼び名（乙名・按司）には子を立てない', 名('チトセ乙名') === null && 名('八重山按司') === null);
  const 字 = A.KANJI_TSUJI;
  確('名付けの字に、英字や外つ国の字が紛れない', 字.every((c) => /^[一-龯]$/.test(c)), `${字.length}字`);
  /* 同じ父から幾人生まれても名は重ならない */
  const 父 = { id: 'nobunaga', name: '織田信長' };
  const 出 = [];
  for (let i = 0; i < 12; i++) {
    const n = A.子の名({ ...s, year: 1550 + i }, 父);
    s.generals.push({ id: `t${i}`, name: n });
    出.push(n);
  }
  確('兄弟で名が重ならず、字も重ならない', new Set(出).size === 出.length && 出.every((n) => n[2] !== n[3]), 出.join('・'));
}

console.log('\n── 三　古い記録の子の名を繕う');
{
  const s = A.initState('oda');
  const 父 = s.generals.find((g) => g.name === '原胤貞') || { id: 'harat', name: '原胤貞' };
  if (!s.generals.includes(父)) s.generals.push({ ...父, faction: 'oda' });
  s.generals.push({ id: `${父.id}_c1560`, name: '原胤政貞', faction: 'oda', 架空: true });
  s.generals.push({ id: `${父.id}_c1562`, name: '原胤政貞', faction: 'oda', 架空: true });
  const 直 = A.架空の名を繕う(s, A.GENERALS);
  const 子ら = s.generals.filter((g) => g.id.startsWith(`${父.id}_c`));
  確('姓を取り違えた名は付け直す', 子ら.every((g) => A.姓(g.name) === '原'), 子ら.map((g) => g.name).join('・'));
  確('兄弟で名が重ならない', new Set(子ら.map((g) => g.name)).size === 子ら.length);
  確('もとの名は旧名に控える', 子ら.every((g) => g.旧名 === '原胤政貞'));
  const 二度 = A.架空の名を繕う(s, A.GENERALS);
  確('二度は付け直さない', 二度.length === 0 && 直.length === 2);
}

console.log('\n── 四　架空の者の上限');
{
  const s = A.initState('oda');
  s.month = 12;
  // 盤の一割を架空の者にしておく（上限は七分）
  const 数 = Math.ceil(s.generals.length * 0.1);
  for (const g of s.generals.slice(0, 数)) g.架空 = true;
  const 前 = s.generals.filter((g) => /_c\d{4}$/.test(g.id)).length;
  const t = A.advanceMonth(s, s);
  const 新 = t.generals.filter((g) => /_c\d{4}$/.test(g.id));
  const 親 = 新.map((k) => t.generals.find((g) => g.id === (t.親 || {})[k.id]));
  確('上限を超えていれば、継ぐ者のいない当主のほかに子は生まれない',
    親.every((p) => p && p.lord && A.一族(s, s.generals.find((g) => g.id === p.id)).length <= 1),
    `${前} → ${前 + 新.length}（上限 ${Math.round(A.架空の上限 * 100)}%・生まれた子の親 ${親.map((p) => p ? p.name : '?').join('・') || 'なし'}）`);
  /* 上限の内なら生まれる */
  let 生まれた = 0;
  for (let i = 0; i < 3 && !生まれた; i++) {
    const s2 = A.initState('oda'); s2.month = 12;
    const t2 = A.advanceMonth(s2, s2);
    生まれた = t2.generals.filter((g) => /_c\d{4}$/.test(g.id)).length;
  }
  確('上限の内なら子は生まれる', 生まれた > 0, `${生まれた}人`);
}

console.log('\n── 四の二　子をなすのは家を背負う者の一族に限る');
{
  /* 遊ぶ側の申し出：「城主・国主・方面軍だけにし、実際の子孫も含めて数を制限する。
     世界編を考えると子孫がいないと続かない」 */
  const 親ら = new Map();
  for (let i = 0; i < 4; i++) {
    const s = A.initState('oda'); s.year = 1546 + i * 3; s.month = 12;
    const t = A.advanceMonth(s, s);
    for (const k of t.generals.filter((g) => /_c\d{4}$/.test(g.id))) {
      const p = s.generals.find((g) => g.id === (t.親 || {})[k.id]);
      if (p) 親ら.set(p.id, A.一族の格(s, p));
    }
  }
  確('子の親は、当主・一門・国主・旗頭・城主のいずれか', [...親ら.values()].every(Boolean),
    `${親ら.size}人の親：${[...new Set(親ら.values())].join('・') || 'なし'}`);

  const s = A.initState('oda');
  const 当主 = s.generals.find((g) => g.faction === 'oda' && g.lord);
  const 平 = s.generals.find((g) => g.faction === 'oda' && !g.lord && !A.一族の格(s, g));
  確('城を持たぬ家臣は子をなさない', !!平 && A.一族の格(s, 平) === null, 平 ? 平.name : 'なし');
  確('当主は子をなす', A.一族の格(s, 当主) === '当主', 当主.name);

  /* 一族の枠が埋まれば、当主にも生まれない（史実の一族も数える） */
  const 族 = A.一族(s, 当主).length;
  for (let i = 族; i < A.一族の枠.当主; i++) {
    s.generals.push({ id: `kin${i}`, name: `織田信${'一二三四五六七八'[i] || '九'}`, faction: 'oda', age: 20, 一門: true,
      lead: 50, valor: 50, wit: 50, gov: 50, loyal: 90, at: 当主.at, retinue: 50 });
  }
  let 生 = 0;
  for (let y = 0; y < 30; y++) {
    s.month = 12; s.year++;
    const t = A.advanceMonth(s, s);
    生 += t.generals.filter((g) => /_c\d{4}$/.test(g.id) && (t.親 || {})[g.id] === 当主.id).length;
  }
  確('一族の枠が埋まっていれば、当主にも子は生まれない', 生 === 0, `一族 ${A.一族(s, 当主).length}人・枠 ${A.一族の枠.当主}・三十年で ${生}人`);
}

console.log('\n── 五　家督の筋は正しい姓で辿る');
{
  const s = A.initState('oda');
  const 当主 = { id: 'd', name: '朝比奈泰朝', faction: 'oda' };
  s.generals = [
    { id: 'a', name: '朝比奈泰長', faction: 'oda', age: 30, lead: 50, gov: 50, wit: 50 },
    { id: 'b', name: '朝比元知', faction: 'oda', age: 30, lead: 90, gov: 90, wit: 90 },
  ];
  確('同じ姓の者が継ぐ（器量だけで選ばない）', (A.pickHeir(s, 当主) || {}).id === 'a', (A.pickHeir(s, 当主) || {}).name);
}

console.log(`\nエラー: ${咎.length ? 咎.join(' | ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
