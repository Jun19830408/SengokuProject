/* 鉄甲船（GDD 10.5）。

   天正六年（一五七八）、九鬼嘉隆が伊勢で六艘を造った。舷に鉄を張った大船で、
   焙烙も火矢も通らなかったと伝わる。木津川口で毛利の船を退けたのはこの船である。

   掟は四つ。
     一、天正の頃より前には誰も造らない（木津川口で焼かれて初めて思いつく）
     二、海に面し、湊か水軍衆を抱えた城でなければ造れない
     三、金と歳月がかかる（普請を積み重ねる）
     四、六艘を限りとする

   船としては、火が通らず、遠くまで撃ち、乗り込まれても落ちない。
   そのかわり極めて鈍く、風にも乗らない。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'tekko-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { SHIPS, SHIP_KINDS, 船の割り, 鉄甲 } from "../src/data/ships.js";\n'
+ 'export { 鉄甲船を造れるか, 鉄甲船の普請, 渡海の船立て, 迎え撃つ船立て, 船立ての力, navalPower, isCoastal } from "../src/core/naval.js";\n'
+ 'export { layoutSea, makeFleet, createSeaBattle, stepSeaBattle, 船を並べる, 海戦を裁く } from "../src/battle/sea.js";\n'
+ 'export { initState } from "../src/core/state.js";\n'
+ 'export { runCommand } from "../src/govern/commands.js";\n');
const out = path.join(ROOT, 'build', 'tekko.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 3;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* ---------------------------------------------- 一、船としての値 */
{
  const T = A.SHIPS.tekko, 安 = A.SHIPS.atake;
  確('鉄甲船は安宅より厚い', T.hp > 安.hp * 2, `耐え ${T.hp} 対 ${安.hp}`);
  確('鉄甲船は遠くまで撃つ', T.射 > 安.射 && T.矢 > 安.矢, `射 ${T.射}・矢 ${T.矢}`);
  確('鉄甲船は極めて鈍い', T.速 < A.SHIPS.kobaya.速 / 3 && T.速 < 安.速, `速 ${T.速}`);
  確('鉄甲船は風に乗らない', T.帆 < 安.帆 * 0.6, `帆 ${T.帆}`);
  確('鉄甲船には火が通らない', T.焼け <= 0.1 && T.消火 > 安.消火 * 2,
    `焼け ${T.焼け}・消火 ${T.消火}`);

  // 割りからは湧かない。造ったものだけが海に出る。
  let 湧 = 0;
  for (let sk = 30; sk <= 100; sk += 5) {
    const n = A.船を並べる(60, sk);
    湧 += n.tekko || 0;
  }
  確('船の割りからは湧かない（造ったものだけ）', 湧 === 0, `${湧}艘`);
}

/* ---------------------------------------------- 二、造る掟 */
{
  const s = A.initState('oda');
  const 湊城 = s.castles.find((c) => c.faction === 'oda' && A.isCoastal(c))
    || s.castles.find((c) => A.isCoastal(c) && c.faction === 'oda');
  // 織田の海に面した城（津島・熱田のあたり）を探す。無ければ他家の湊城を借りる。
  const 海城 = s.castles.filter((c) => A.isCoastal(c));
  const 試城 = 海城.find((c) => { c.faction = 'oda'; return A.鉄甲船を造れるか({ ...s, year: 1590 }, c).ok; });
  確('海に面し湊を抱えた城が要る', !!試城, 試城 ? 試城.name : '見つからない');
  if (!試城) { console.log('エラー: 湊のある城が無い'); process.exit(1); }

  s.factions.oda.gold = 99999;
  確('天正の前には造れない', !A.鉄甲船を造れるか(s, 試城).ok,
    A.鉄甲船を造れるか(s, 試城).why);
  s.year = A.鉄甲.始まりの年;
  確('その年からは造れる', A.鉄甲船を造れるか(s, 試城).ok, `${s.year}年`);

  const 山城 = s.castles.find((c) => !A.isCoastal(c) && c.faction !== 'oda');
  山城.faction = 'oda';
  確('山国の城では造れない', !A.鉄甲船を造れるか(s, 山城).ok, A.鉄甲船を造れるか(s, 山城).why);

  // 普請を積む
  const gen = { name: '匠', gov: 70 };
  let 回 = 0, 金 = s.factions.oda.gold;
  while ((s.factions.oda.鉄甲船 || 0) < 1 && 回 < 20) { A.鉄甲船の普請(s, 試城, gen); 回++; }
  確('一艘は幾度もの普請でできあがる', 回 >= 2 && (s.factions.oda.鉄甲船 || 0) === 1,
    `${回}度の下知`);
  確('造るには金がかかる', 金 - s.factions.oda.gold === 回 * A.鉄甲.手間,
    `${金 - s.factions.oda.gold}貫`);

  // 六艘を限りとする
  let 番 = 0;
  while ((s.factions.oda.鉄甲船 || 0) < A.鉄甲.限り && 番 < 200) { A.鉄甲船の普請(s, 試城, gen); 番++; }
  確(`${A.鉄甲.限り}艘までできる`, s.factions.oda.鉄甲船 === A.鉄甲.限り, `${s.factions.oda.鉄甲船}艘`);
  確('それより多くは造れない', !A.鉄甲船を造れるか(s, 試城).ok, A.鉄甲船を造れるか(s, 試城).why);

  // 船立てに必ず出る
  const 立 = A.渡海の船立て(s, 'oda', 6000);
  確('造った鉄甲船は船立てに出る', (立.内訳.tekko || 0) === A.鉄甲.限り,
    `${立.内訳.tekko || 0}艘／${立.艘}艘のうち`);
  const 無 = A.船立ての力({ 内訳: { ...立.内訳, tekko: 0 }, skill: 立.skill });
  確('鉄甲船があるほど船立ては強い', A.船立ての力(立) > 無 * 1.5,
    `${Math.round(A.船立ての力(立))} 対 ${Math.round(無)}`);
}

/* ---------------------------------------------- 三、火が通らないこと */
{
  const 焼け残り = (t) => {
    const SEA = A.layoutSea(4242);
    const p = A.makeFleet('P', { id: 'a', name: '的', lead: 60, valor: 60, wit: 60 },
      0, 60, SEA.w * 0.5, SEA.h * 0.5, 0, '#2F5D8C', { [t]: 1 });
    const e = A.makeFleet('E', { id: 'b', name: '敵', lead: 60, valor: 60, wit: 60 },
      0, 60, SEA.w * 0.9, SEA.h * 0.5, Math.PI, '#B0483C', { kobaya: 1 });
    const b = A.createSeaBattle([p], [e], 'P');
    b.phase = 'fight';
    const s = p.ships[0];
    s.fire = 70;                                   // 火が回ったところから
    /* 火の回りだけを見たいので、戦が終わっても刻を進め続ける
       （相手の一艘を沈めた途端に盤が終わってしまう）。 */
    for (let i = 0; i < 260 && !s.sunk; i++) { b.phase = 'fight'; A.stepSeaBattle(b, 0.5); }
    return { fire: s.fire, hp: s.hp / s.max, sunk: s.sunk };
  };
  const 鉄 = 焼け残り('tekko'), 安 = 焼け残り('atake'), 関 = 焼け残り('seki');
  確('鉄甲船は火を消し止める', 鉄.fire === 0 && !鉄.sunk,
    `焼け 70 → ${Math.round(鉄.fire)}・船体${Math.round(鉄.hp * 100)}%`);
  確('木の船は消し止められず焼け落ちる', 安.sunk && 関.sunk,
    `安宅${安.sunk ? '沈没' : `船体${Math.round(安.hp * 100)}%`}／関船${関.sunk ? '沈没' : `船体${Math.round(関.hp * 100)}%`}`);
}

/* ---------------------------------------------- 四、海の戦での強さ */
{
  const 将 = (n) => ({ id: n, name: n, lead: 70, valor: 66, wit: 62 });
  const 戦 = (P, E, seed) => {
    種 = seed;
    const SEA = A.layoutSea(seed);
    const p = A.makeFleet('P', 将('九鬼'), 0, 70, SEA.w * 0.3, SEA.h * 0.5, 0, '#2F5D8C', P);
    const e = A.makeFleet('E', 将('村上'), 0, 82, SEA.w * 0.7, SEA.h * 0.5, Math.PI, '#B0483C', E);
    const b = A.createSeaBattle([p], [e], 'P');
    A.海戦を裁く(b, 0.5);
    return { 勝: b.result === 'P', 刻: b.t, 残: p.ships.filter((x) => !x.sunk).length };
  };
  const 数 = 8;
  let 鉄勝 = 0, 鉄刻 = 0, 関勝 = 0;
  for (let i = 1; i <= 数; i++) {
    const a = 戦({ tekko: 6 }, { seki: 16, kobaya: 24 }, i * 77);
    if (a.勝) 鉄勝++; 鉄刻 += a.刻;
    if (戦({ seki: 6 }, { seki: 16, kobaya: 24 }, i * 77).勝) 関勝++;
  }
  確('鉄甲船六艘は関船小早四十を退ける', 鉄勝 === 数, `${鉄勝}/${数}（平均${Math.round(鉄刻 / 数)}秒）`);
  確('同じ六艘でも関船では敵わない', 関勝 < 数 / 2, `${関勝}/${数}`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
