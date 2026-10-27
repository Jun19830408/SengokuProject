/* 郡代（郡の導入の段階二）。

   遊ぶ側の申し出を二つ、ここで縛る。

     一　郡代の任命ができないので、城を取ったときと、通常の政務フェーズにおいて
         人事で任命できるようにしてほしい
     二　郡代を任命したほうが収入が上がり、郡代の能力が良ければさらに収入が
         上がる仕組みにしてほしい

   あわせて、取り決めた掟――一郡に一人・一人一郡・その城に属する者から選ぶ・
   城主は兼ねる・務められなくなれば外れる――と、他家の郡代の任命、記録の
   読み書きを確かめる。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'gundai-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { initState, migrateSave, forecast } from "../src/core/state.js";\n'
+ 'export { 郡代に任ずる, 郡代を退ける, 城替え } from "../src/govern/commands.js";\n'
+ 'export { 城を委ねる } from "../src/govern/war.js";\n'
+ 'export { advanceMonth } from "../src/govern/month.js";\n'
+ 'export { castellanOf, 城主を据え替える, 国主に任じる, 寄騎に取る } from "../src/core/rank.js";\n'
+ 'export { 城の寄親 } from "../src/core/inin.js";\n'
+ 'export { 城の郡ら, 郡を引く, 郡の治め, 城の年貢の割, 郡代の候補, 郡代を整える, 郡代を任ずる差配, 郡代の割, 兼ねる割, 城代の減り } from "../src/core/gun.js";\n'
+ 'export { 城の上がり } from "../src/core/keizai.js";\n');
const out = path.join(ROOT, 'build', 'gundai.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

let 種 = 0x6A1D;
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

/* 郡が二つ以上あり、城主のほかに郡代になれる者が二人以上いる、織田家の城を探す。 */
const 試しの城 = (s) => s.castles.find((c) => c.faction === s.player && A.城の郡ら(c.id).length >= 2
  && A.郡代の候補(s, c).length >= 2);

console.log('── 一　人事で郡代を任じる');
{
  const s0 = A.initState('oda');
  確('初めはどの郡にも郡代がいない', s0.郡代 && Object.keys(s0.郡代).length === 0);
  const c = 試しの城(s0);
  確('郡が二つ以上あり、候補が二人以上いる城がある', !!c, c ? c.name : '');
  const [郡1, 郡2] = A.城の郡ら(c.id);
  const [甲, 乙] = A.郡代の候補(s0, c);
  let s = A.郡代に任ずる(s0, 郡1.id, 甲.id);
  確('城にいる者を郡代に任じられる', s.郡代[郡1.id] === 甲.id, `${甲.name}を${郡1.名}の郡代に`);
  確('年代記に残る', s.chronicle.some((x) => x.text.includes(`${甲.name}を${郡1.名}の郡代に任じた`)));
  確('役の経験が残る', s.generals.find((x) => x.id === 甲.id).郡代歴 === true);
  // 一人一郡：同じ者を別の郡へ
  s = A.郡代に任ずる(s, 郡2.id, 甲.id);
  確('一人一郡（別の郡へ移せば、前の郡は空く）', s.郡代[郡2.id] === 甲.id && !s.郡代[郡1.id]);
  // 一郡に一人：同じ郡に別の者
  s = A.郡代に任ずる(s, 郡2.id, 乙.id);
  確('一郡に一人（別の者を任じれば前の者は外れる）', s.郡代[郡2.id] === 乙.id
    && !Object.values(s.郡代).includes(甲.id));
  s = A.郡代を退ける(s, 郡2.id);
  確('郡代を解ける', !s.郡代[郡2.id]);
  // なれない者
  const 主 = A.castellanOf(s, c);
  const t1 = A.郡代に任ずる(s, 郡1.id, 主.id);
  確('城主は郡代にできない（兼ねている）', !t1.郡代[郡1.id] && /城主/.test(t1.msg || ''), t1.msg);
  const 当主 = s.generals.find((x) => x.faction === 'oda' && x.lord && !x.captive);
  const t2 = A.郡代に任ずる(s, 郡1.id, 当主.id);
  確('当主は郡代にできない', !t2.郡代[郡1.id], t2.msg);
  const 他城の者 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.captive && x.at && x.at !== c.id);
  const t3 = A.郡代に任ずる(s, 郡1.id, 他城の者.id);
  確('ほかの城の者は、城替えで移してからでないと任じられない', !t3.郡代[郡1.id] && /城替え/.test(t3.msg || ''), t3.msg);
  const 他家の者 = s.generals.find((x) => x.faction !== 'oda' && !x.captive && x.at);
  const t4 = A.郡代に任ずる(s, 郡1.id, 他家の者.id);
  確('他家の者は任じられない', !t4.郡代[郡1.id], t4.msg);
}

console.log('\n── 二　城を取ったときに郡代を据える');
{
  const s = A.initState('oda');
  // 敵の城を一つ取ったことにする：軍を在陣させ、城を織田のものにする
  const 敵城 = s.castles.find((c) => c.faction !== 'oda' && A.城の郡ら(c.id).length >= 2
    && s.castles.some((d) => d.faction === 'oda' && d.kuni === c.kuni) === false);
  const 将 = s.generals.filter((x) => x.faction === 'oda' && !x.lord && !x.captive && x.at
    && !s.castles.some((o) => o.lordId === x.id)).slice(0, 3);
  for (const x of 将) x.at = null;
  s.generals = s.generals.filter((y) => !(y.at === 敵城.id && y.faction === 敵城.faction));   // 籠っていた者は退いたことにする
  敵城.faction = 'oda'; 敵城.lordId = null;
  s.armies.push({ id: 'gd-a', faction: 'oda', from: s.factions.oda.本拠, gens: 将.map((x) => x.id),
    local: 2000, localTrain: 60, rost: null, men: 2000, at: 敵城.id, path: [敵城.id], prog: 0, food: 5000, target: null, 在陣: true });
  const [郡1, 郡2] = A.城の郡ら(敵城.id);
  A.城を委ねる(s, 敵城.id, 'gd-a', { 城主: 将[0].id, 所属: [], 兵: 500, 郡代: { [郡1.id]: 将[1].id, [郡2.id]: 将[2].id } });
  確('城主が据わる', 敵城.lordId === 将[0].id, 将[0].name);
  確('郡代が据わる（郡ごとに一人）', s.郡代[郡1.id] === 将[1].id && s.郡代[郡2.id] === 将[2].id,
    `${郡1.名}に${将[1].name}・${郡2.名}に${将[2].name}`);
  確('郡代はその城に入る', 将[1].at === 敵城.id && 将[2].at === 敵城.id);
  確('郡代の割が効く', A.郡の治め(s, 敵城, 郡1).役 === '郡代');
}

console.log('\n── 三　郡代を置けば年貢が上がり、能のある郡代ほど上がる');
{
  確('郡代の割は1.00〜1.10', A.郡代の割(0) === 1.0 && Math.abs(A.郡代の割(100) - 1.1) < 1e-9);
  確('城主が兼ねる割は0.90〜1.00（郡代がいないと少し下がる）', A.兼ねる割(0) === 0.9 && Math.abs(A.兼ねる割(100) - 1.0) < 1e-9);
  確('どんな郡代でも、城主が兼ねるより下がらない', A.郡代の割(0) >= A.兼ねる割(100));
  確('政治の高い郡代ほど割が高い', A.郡代の割(90) > A.郡代の割(40));

  const s0 = A.initState('oda');
  const c = 試しの城(s0);
  const 郡 = A.城の郡ら(c.id);
  const 割0 = A.城の年貢の割(s0, c);
  const 主 = A.castellanOf(s0, c);
  確('郡代のいない城の割は、城主の政治で決まる', Math.abs(割0 - A.兼ねる割(主.gov) * (c.城代 ? A.城代の減り : 1)) < 1e-9,
    `${c.name}　城主${主.name}（政治${主.gov}）×${割0.toFixed(3)}`);
  let s = s0;
  const 候補 = A.郡代の候補(s, c);
  for (let i = 0; i < 郡.length && i < 候補.length; i++) s = A.郡代に任ずる(s, 郡[i].id, 候補[i].id);
  const c1 = s.castles.find((x) => x.id === c.id);
  const 割1 = A.城の年貢の割(s, c1);
  確('郡代を置くと城の年貢の割が上がる', 割1 > 割0, `×${割0.toFixed(3)} → ×${割1.toFixed(3)}`);
  const 前 = A.forecast(s0, 'oda'), 後 = A.forecast(s, 'oda');
  確('家の月の金の見通しが増える', 後.netGold > 前.netGold, `${Math.round(前.netGold)} → ${Math.round(後.netGold)}貫`);
  確('兵糧の入りの見通しも増える', 後.inFood >= 前.inFood, `${前.inFood} → ${後.inFood}石`);
  // 能のある郡代ほど上がる：同じ郡に、政治の高い者と低い者を据え比べる
  if (候補.length >= 2) {
    const 高 = 候補[0], 低 = 候補[候補.length - 1];
    const sa = A.郡代に任ずる(s0, 郡[0].id, 高.id), sb = A.郡代に任ずる(s0, 郡[0].id, 低.id);
    const ca = sa.castles.find((x) => x.id === c.id), cb = sb.castles.find((x) => x.id === c.id);
    確('政治の高い郡代のほうが年貢が多い', 高.gov === 低.gov || A.城の年貢の割(sa, ca) > A.城の年貢の割(sb, cb),
      `${高.name}（政治${高.gov}）×${A.城の年貢の割(sa, ca).toFixed(3)}・${低.name}（政治${低.gov}）×${A.城の年貢の割(sb, cb).toFixed(3)}`);
  }
  // 月送りでも効く：同じ盤を、郡代を置いたものと置かないもので一月送り、蔵の増えを比べる
  const 種0 = 種;
  const ta = A.advanceMonth(s0, s0);
  種 = 種0;
  const tb = A.advanceMonth(s, s);
  確('月送りで、郡代を置いた家の蔵のほうが増える', tb.factions.oda.gold > ta.factions.oda.gold,
    `置かない ${ta.factions.oda.gold}貫・置いた ${tb.factions.oda.gold}貫`);
  /* 年貢の割の並（石高で重ねる）。初めはどの郡も城主が兼ねるので一をやや下回り、
     他家が郡代を立てた一月後には、他家の並がもとの年貢（一）あたりに戻る。 */
  const 並 = (盤, 選) => {
    const cs = 盤.castles.filter(選);
    return cs.reduce((a, x) => a + A.城の年貢の割(盤, x) * (x.koku || 0), 0) / cs.reduce((a, x) => a + (x.koku || 0), 0);
  };
  const 並0 = 並(s0, () => true);
  確('初めの盤の年貢の割の並は、一をやや下回る（郡代がいない）', 並0 > 0.9 && 並0 < 1.0, `×${並0.toFixed(3)}`);
  const 並1 = 並(ta, (x) => x.faction !== ta.player);
  確('他家が郡代を立てた一月後、他家の並は一に近い', 並1 > 0.98 && 並1 < 1.06, `×${並1.toFixed(3)}`);
}

console.log('\n── 四　務められなくなれば外れる');
{
  const s0 = A.initState('oda');
  const c = 試しの城(s0);
  const [郡1] = A.城の郡ら(c.id);
  const [甲] = A.郡代の候補(s0, c);
  const 任 = () => A.郡代に任ずる(s0, 郡1.id, 甲.id);
  {
    const s = 任(); const x = s.generals.find((y) => y.id === 甲.id);
    x.at = null;                                   // 出陣
    A.郡代を整える(s);
    const 治 = A.郡の治め(s, s.castles.find((y) => y.id === c.id), 郡1);
    確('出陣中は外れないが、そのあいだは城主が兼ねる', s.郡代[郡1.id] === 甲.id && 治.役 !== '郡代' && 治.出陣中の郡代 && 治.出陣中の郡代.id === 甲.id);
  }
  {
    const s = 任();
    const 先 = s.castles.find((y) => y.faction === 'oda' && y.id !== c.id);
    const t = A.城替え(s, 甲.id, 先.id);
    A.郡代を整える(t);
    確('ほかの城へ移れば外れる', !t.郡代[郡1.id], `${先.name}へ`);
  }
  {
    const s = 任(); const x = s.generals.find((y) => y.id === 甲.id);
    x.captive = { by: 'saito', at: 1 };
    A.郡代を整える(s);
    確('捕らわれれば外れる', !s.郡代[郡1.id]);
  }
  {
    const s = 任();
    s.generals = s.generals.filter((y) => y.id !== 甲.id);   // 物故
    A.郡代を整える(s);
    確('世を去れば外れる', !s.郡代[郡1.id]);
  }
  {
    const s = 任();
    s.castles.find((y) => y.id === c.id).faction = 'saito';  // 城が落ちた
    A.郡代を整える(s);
    確('城が他家に落ちれば外れる', !s.郡代[郡1.id]);
  }
  {
    const s = 任(); const cc = s.castles.find((y) => y.id === c.id);
    A.城主を据え替える(s, cc, 甲.id);
    A.郡代を整える(s);
    確('城主になれば外れる（城主として兼ねる）', !s.郡代[郡1.id]);
  }
}

console.log('\n── 五　他家の郡代と、預けた城の郡代');
{
  const s0 = A.initState('oda');
  const t = A.advanceMonth(s0, s0);
  const 帳 = t.郡代 || {};
  const 他家の郡代 = Object.entries(帳).filter(([k]) => {
    const 郡 = A.郡を引く(k); const c = 郡 && t.castles.find((x) => x.id === 郡.城);
    return c && c.faction !== t.player;
  }).length;
  const 自家の郡代 = Object.entries(帳).length - 他家の郡代;
  確('月が改まると、他家の空いた郡に郡代が立つ', 他家の郡代 > 50, `${他家の郡代}郡`);
  確('遊ぶ側の直轄の城には、勝手に郡代を立てない', 自家の郡代 === 0);
  // 他家の任じた郡代も掟を守る（その城の者・城主でない・一人一郡）
  const ids = Object.values(帳);
  確('一人が二つの郡を兼ねていない', new Set(ids).size === ids.length);
  const 背く = Object.entries(帳).filter(([k, v]) => {
    const 郡 = A.郡を引く(k); const c = t.castles.find((x) => x.id === 郡.城);
    const x = t.generals.find((y) => y.id === v); const 主 = A.castellanOf(t, c);
    return !x || x.at !== c.id || x.faction !== c.faction || (主 && 主.id === x.id) || x.lord;
  });
  確('郡代はみな、その城に属する家臣（城主・当主でない）', 背く.length === 0, 背く.length ? `${背く.length}郡が背く` : '');
}
{
  /* 差配を国主に預けた城は、空いた郡を寄親が埋める（tests/inin.cjs と同じ場を組む）。
     尾張に当主がいると国主を置けないので、美濃に一城を与えて当主をそこへ移す。 */
  const s = A.initState('oda');
  const 自城 = s.castles.filter((c) => c.faction === 'oda' && c.kuni === '尾張');
  const 親 = s.generals.find((g) => g.faction === 'oda' && !g.lord && !g.役 && (g.age || 0) >= 25
    && 自城.some((c) => c.id === (g.本領 || g.at)));
  親.fief = 14000; 親.age = Math.max(親.age || 30, 32); 親.loyal = 85;
  const 美濃 = s.castles.find((c) => c.kuni === '美濃');
  美濃.faction = 'oda';
  const 当主 = s.generals.find((g) => g.faction === 'oda' && g.lord);
  当主.at = 美濃.id; 当主.本領 = 美濃.id; 美濃.lordId = 当主.id;
  const 親城 = 自城.find((c) => c.id === (親.本領 || 親.at));
  A.国主に任じる(s, 'oda', '尾張', 親.id);
  const 別城 = 自城.find((c) => c.id !== 親城.id && A.城の郡ら(c.id).length && A.郡代の候補(s, c).length);
  const 子 = A.castellanOf(s, 別城);
  子.fief = Math.max(子.fief || 0, 3000); 子.age = Math.max(子.age || 30, 28); 子.本領 = 別城.id; 子.loyal = 85;
  const r = A.寄騎に取る(s, 親.id, 子.id);
  確('（下ごしらえ）寄騎に取れて、城の差配が国主に預けられる', r.ok && (A.城の寄親(s, 別城) || {}).id === 親.id,
    `${別城.name}を${親.name}に預ける`);
  const t = A.advanceMonth(s, s);
  const 別 = t.castles.find((x) => x.id === 別城.id);
  const 埋まった = A.城の郡ら(別.id).filter((x) => (t.郡代 || {})[x.id]);
  確('差配を預けた城の空いた郡は、寄親が埋める', 埋まった.length > 0, `${別.name}　${埋まった.map((x) => x.名).join('・')}`);
  確('寄親が任じたことは、遊ぶ側に知らされる', (t.monthEvents || []).some((e) => typeof e === 'string' && e.includes('の郡代に任じられた')));
  const 直轄 = t.castles.filter((x) => x.faction === 'oda' && !A.城の寄親(t, x));
  確('直轄の城には立てない', 直轄.every((x) => A.城の郡ら(x.id).every((y) => !(t.郡代 || {})[y.id])),
    直轄.map((x) => x.name).join('・'));
}

console.log('\n── 六　記録に残る');
{
  const s0 = A.initState('oda');
  const c = 試しの城(s0);
  const [郡1] = A.城の郡ら(c.id);
  const [甲] = A.郡代の候補(s0, c);
  const s = A.郡代に任ずる(s0, 郡1.id, 甲.id);
  const 読 = A.migrateSave(JSON.parse(JSON.stringify(s)));
  確('郡代は記録に残り、読み戻せる', 読.郡代 && 読.郡代[郡1.id] === 甲.id);
  const 古 = JSON.parse(JSON.stringify(s0)); delete 古.郡代;
  const 読2 = A.migrateSave(古);
  確('郡代の無かった頃の記録も読める（空の帳で補う）', 読2.郡代 && Object.keys(読2.郡代).length === 0);
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
