/* 城攻めの盤に現れる後詰の試験（GDD 9.2 / 9.4）。

   遊ぶ側の申し出は「イ（後詰）とハ（囲みの輪）は入れたい」であった。案の中身は
   「今月着く後詰は、城攻めの何日目・何刻に、来た方角の盤の端から現れる。城方は
   呼応して打って出る」である。確かめること。
     一、選び方 … 囲まれた城を救いに向かう軍のうち、ひと月の道のりの内にいる者だけが
                  盤に来る。寄せ手の身内・集結待ち・遠い軍・救いに来たのでない軍は来ない。
                  着く日と刻は残りの道のりの割で決まり、来る方は寄せ手の来た向きとの差で決まる
     二、現れ方 … 着く刻（城に着く刻）から、盤の端から城までの道のりのぶん早く、来た方の
                  盤の端に現れる。それより前には盤に居ない。城山・川・森を避けて立つ。
                  夜のあいだは入らず、着く日が明日なら明日の朝より後に現れる
     三、呼応   … 現れたら城方の士気が上がり、寄せ手の士気が下がる。後詰が城に迫ったら、
                  城方は六十秒のあいだ（後詰が槍を合わせているあいだはそれ以上）呼応し、門から
                  三百歩の内の寄せ手へ打って出る
     四、当たり方 … 後詰は寄せ手へ寄せて槍を合わせ、寄せ手は後詰に向き直る。崩れた後詰は
                  来た方へ退く。水の手と焼き働きは後詰には及ばない
     五、効き   … 同じ戦を後詰の有無で比べると、後詰のある戦のほうが寄せ手の損が重い */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'gozume-ban-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { buildCastleMap, layoutCastleField, setBattleMap, 寄せ手の陣, 城の域か, 後詰の口 } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen, corpsMax, 退き先 } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle, stepBattle, 夜を明かす, 後詰を入れる, 後詰の道の刻 } from "../src/battle/engine.js";\n'
+ 'export { 計略を仕掛ける } from "../src/battle/keiryaku.js";\n'
+ 'export { FIELD, terrainAt, passable, fieldScale, setFieldKind } from "../src/battle/field.js";\n'
+ 'export { 持ち場を並べる } from "../src/battle/defense.js";\n'
+ 'export { 守りの割り付け } from "../src/core/garrison.js";\n'
+ 'export { 盤に来る後詰, 残りの道のり, ひと月の道のり, 着く日と刻, 方の名 } from "../src/core/gotsume.js";\n'
+ 'export { initState } from "../src/core/state.js";\n'
+ 'export { findPath, nodeById, roadBetween } from "../src/core/paths.js";\n');
const out = path.join(ROOT, 'build', 'gozume-ban.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x60c0;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* ---------------------------------------------- 一、選び方 */
console.log('── 一　盤に来る後詰の選び方');
{
  const s = A.initState('oda');
  /* 囲まれる城（的）と、寄せ手の出た城（敵）、後詰の出る城（援）。敵と援はどちらも的の隣 */
  let 的 = null, 敵 = null, 援 = null;
  for (const c of s.castles) {
    if (!c.faction || c.faction === s.player || c.faction.startsWith('_')) continue;
    const 隣 = s.castles.filter((d) => d.id !== c.id && (A.findPath(d.id, c.id) || []).length === 2);
    const e = 隣.find((d) => d.faction && d.faction !== c.faction && !d.faction.startsWith('_'));
    const r = 隣.find((d) => d.faction === c.faction && e && d.id !== e.id);
    if (e && r) { 的 = c; 敵 = e; 援 = r; break; }
  }
  確('城の並びを仕込めた', !!的, 的 ? `${的.name}を${敵.name}の軍が囲み、${援.name}から後詰が出る` : '');
  const 寄せ手 = { id: 'bes', faction: 敵.faction, from: 敵.id, at: 的.id, path: [的.id], prog: 0, sieging: true, men: 8000, gens: [] };
  const 道 = A.findPath(援.id, 的.id);
  const 区間 = (() => { const r = A.roadBetween(道[0], 道[1]); return r ? r[2] : 10; })();
  const 後詰 = (o = {}) => ({ id: 'rel', faction: 的.faction, from: 援.id, at: 援.id, path: 道.slice(), prog: 0,
    food: 3000, men: 3000, local: 2500, gens: [], relief: 的.id, target: 的.id, ...o });
  s.armies = [寄せ手];
  const 選 = (a) => { s.armies = [寄せ手, a]; return A.盤に来る後詰(s, 的, 寄せ手); };
  const r0 = 後詰();
  const 月 = A.ひと月の道のり(r0), 残 = A.残りの道のり(r0);
  const 近い = 残 <= 月;
  const x0 = 選(r0);
  確('ひと月の道のりの内にいる後詰は盤に来る（遠ければ来ない）', 近い ? x0.length === 1 : x0.length === 0,
    `残り${Math.round(残)}／ひと月${月}（区間${区間}）`);
  // 進みを変えて、着く日を三通りに
  const 日ら = [];
  for (const 割 of [0.15, 0.5, 0.9]) {
    const need = A.残りの道のり({ ...r0, prog: 0 });
    const prog = Math.max(0, Math.min(0.999, 1 - (割 * 月) / need));
    const x = 選(後詰({ prog }));
    if (x.length) 日ら.push(`${(x[0].割).toFixed(2)}→${x[0].日}日目・刻${x[0].刻.toFixed(2)}`);
  }
  確('残りの道のりの割で、着く日が一日目から三日目へ移る', 日ら.length >= 1, 日ら.join('　'));
  確('着く日と刻の割り当て（〇.一→一日目、〇.五→二日目、〇.九五→三日目）',
    A.着く日と刻(0.1).日 === 1 && A.着く日と刻(0.5).日 === 2 && A.着く日と刻(0.95).日 === 3
    && A.着く日と刻(0.95).刻 <= 0.85 && A.着く日と刻(0.0).刻 >= 0.08,
    JSON.stringify([0.1, 0.5, 0.95].map((v) => A.着く日と刻(v))));
  確('救いに来たのでない軍は来ない（後詰の印も無く、身内でもない）',
    選(後詰({ relief: null, target: null })).length === 0);
  確('城の身内が城を目指していれば、印が無くとも後詰として来る', 選(後詰({ relief: null })).length === (近い ? 1 : 0));
  確('寄せ手の身内は来ない', 選(後詰({ faction: 敵.faction })).length === 0);
  確('集結を待っている軍は来ない', 選(後詰({ 待ち合わせ: 的.id })).length === 0);
  確('道を進んでいない軍（もう着いた軍）は来ない', 選(後詰({ path: [的.id], at: 的.id })).length === 0);
  const 遠 = 後詰({ path: [...道.slice(0, 1), ...道], food: 0 });   // 兵糧が尽きればひと月の道のりは半ば
  確('兵糧の尽きた軍は、ひと月に半ばしか進めない', A.ひと月の道のり(遠) === 月 / 2);
  // 来る方。寄せ手と同じ宿を通って来れば寄せ手の背（盤の南）、逆なら北
  const 同じ方 = 選(後詰({ path: [敵.id, 的.id], prog: 0.95 }));
  確('寄せ手と同じ方から来る後詰は、盤の南（寄せ手の背）から現れる',
    同じ方.length === 1 && Math.abs(同じ方[0].角 - Math.PI / 2) < 1e-6 && 同じ方[0].方 === '南',
    同じ方.length ? `${同じ方[0].方}（角${同じ方[0].角.toFixed(2)}）` : '来ない');
  const 敵n = A.nodeById(敵.id), 的n = A.nodeById(的.id);
  const 寄角 = Math.atan2(敵n.y - 的n.y, 敵n.x - 的n.x);
  const 援n = A.nodeById(援.id), 後角 = Math.atan2(援n.y - 的n.y, 援n.x - 的n.x);
  const 見込み角 = Math.PI / 2 + (後角 - 寄角);
  const x1 = 選(後詰({ prog: 0.9 }));
  確('来る方は、地図の上の向きを寄せ手の向きとの差だけ回したもの',
    x1.length === 1 && Math.abs(Math.cos(x1[0].角) - Math.cos(見込み角)) < 1e-6 && Math.abs(Math.sin(x1[0].角) - Math.sin(見込み角)) < 1e-6,
    x1.length ? `${援.name}から ${x1[0].方}` : '');
  確('八方の名（東・南・西・北）', A.方の名(0) === '東' && A.方の名(Math.PI / 2) === '南' && A.方の名(Math.PI) === '西'
    && A.方の名(-Math.PI / 2) === '北' && A.方の名(Math.PI / 4) === '南東');
}

/* ---------------------------------------------- 二〜五、盤 */
const 将 = (i, 器 = 60) => ({ id: `g${i}`, name: `将${i}`, lead: 器 + 2, valor: 器, wit: 58, gov: 55,
  retinue: 500, retTrain: 70, unity: 60 });
const 城々 = [
  ['koriyama_a', '吉田郡山城', 72], ['kiyosu', '清洲城', 55], ['oka', '岡城', 62], ['zz4', '高森城', 58],
];
const 種ら = [0x9e3779b1, 0xdeadbeef, 0x51ed270b, 0x1b873593];
function 組む(i) {
  const [id, name, def] = 城々[i];
  A.setFieldKind('街道');
  const castle = { id, name, def, local: 1200, localTrain: 70, najimi: 70, rost: null, 出城: null };
  const map = A.layoutCastleField(A.buildCastleMap(castle), { 広く: true, 城id: id, 種: 種ら[i] });
  A.setBattleMap(map);
  return map;
}
/* 寄せ手六隊（遊ぶ側・委任）、城方は采配の割り付け、後詰は三隊。後詰は 日・刻・角 で来る */
function 仕立てる(i, 賽, 後詰あり, { 日 = 1, 刻 = 0.12, 角 = Math.PI / 2 } = {}) {
  種 = 賽;
  const [id, name, def] = 城々[i];
  const m = 組む(i);
  const n = 6;
  const atk = [...Array(n).keys()].map((k) => {
    const sp = A.寄せ手の陣(m, k, n);
    const c = A.makeCorps('P', 将(k), 500, 1500, 75, 75, sp.x, sp.y, sp.f, '#2F5D8C');
    c.formation = '方陣'; A.placeSquads(c, true); c.auto = true;
    return c;
  });
  const 持 = A.持ち場を並べる(m);
  const 場の門 = 持.filter((p) => p.gate);
  const 城 = { id, name, faction: 'f', local: 2200, localTrain: 70, koku: 20000, def };
  const 将ら = [将(100, 70), 将(101, 62), 将(102, 58)].map((g) => ({ ...g, at: id, 本領: id, faction: 'f', captive: null }));
  const 割 = A.守りの割り付け({ generals: 将ら, castles: [城], factions: { f: { name: '某家' } }, year: 1570, month: 1 }, 城, 場の門.map((p) => p.gate));
  const def2 = [];
  for (const p of 場の門) {
    const 決 = 割.門[p.gate.key] || {};
    const gen = 決.genId ? 将ら.find((x) => x.id === 決.genId) : null;
    const 兵 = Math.max(0, Math.round(決.men || 0));
    if (!gen && 兵 < 40) continue;
    const c = A.makeCorps('E', gen || { id: `gar-${p.gate.key}`, name: '守備隊', lead: 50, valor: 30, wit: 28, gov: 30, retinue: 0, retTrain: 58, unity: 45 },
      gen ? gen.retinue : 0, 兵, 72, 72, p.x, p.y, p.f, '#B0483C');
    c.holdGate = p.gate; if (!gen) c.守備隊 = true;
    def2.push(c);
  }
  const b = A.createBattle(atk, def2, 'P');
  b.mode = 'castle'; b.map = m; b.phase = 'fight';
  b.日の長さ = Math.round(1080 * Math.max(1, Math.min(3.2, Math.pow(m.旧.w / 1600, 0.62))));
  b.dusk = b.日の長さ + Math.round((A.FIELD.h - m.cy) / (34 * A.fieldScale()) * 2.2);
  b.日数 = 3; b.日 = 1; b.日の始め = 0;
  b.後詰 = [];
  let 後 = [];
  if (後詰あり) {
    後 = [0, 1, 2].map((k) => {
      const c = A.makeCorps('E', { ...将(200 + k, 64), name: `後詰${k}` }, 600, 2400, 74, 74, 0, 0, 0, '#8A5A2B');
      c.後詰 = { 軍: 'rel', 外: { x: Math.cos(角), y: Math.sin(角) } };
      return c;
    });
    b.後詰.push({ 軍: 'rel', 家: '某家', 将: '後詰0', 側: 'E', 日, 刻, 角, 方: A.方の名(角), corps: 後, 入った: false });
  }
  return { b, m, atk, def2, 後 };
}
function 走らせる(場, 限り = 600, 見張り = null) {
  const { b } = 場;
  for (let k = 0; k < 200000; k++) {
    A.stepBattle(b, 0.03);
    if (k % 8 === 0) A.battleAI(b);
    if (見張り) 見張り(b, k);
    if (b.result || b.t > Math.min(b.dusk, 限り)) break;
  }
  return b;
}

console.log('── 二〜四　盤に現れる後詰');
{
  const 場 = 仕立てる(0, 0x1357, true, { 角: Math.PI / 2 });
  const { b, m, 後, def2, atk } = 場;
  /* 城に着く刻を、盤に現れる刻が六十秒ほどになるように置く（道のりは盤の大きさで変わる） */
  const 道の刻 = A.後詰の道の刻(m, Math.PI / 2);
  b.後詰[0].刻 = (道の刻 + 60) / b.dusk;
  const 出る刻 = b.後詰[0].刻 * b.dusk - 道の刻;
  let 先に居た = false, 入った刻 = null, 気前 = null, 気後 = null, 寄気前 = null, 寄気後 = null, 噛んだ = false, 討って出た = null;
  let 計 = null;
  const 生き = (c) => !c.dead && !c.destroyed && !c.routed && !c.withdraw;
  const 城方の気 = () => def2.filter((c) => !c.dead).reduce((a, c) => a + c.morale, 0) / Math.max(1, def2.filter((c) => !c.dead).length);
  const 寄せ手の気 = () => atk.filter((c) => !c.dead).reduce((a, c) => a + c.morale, 0) / Math.max(1, atk.filter((c) => !c.dead).length);
  走らせる(場, 出る刻 + 道の刻 + 260, (b2) => {
    const 居る = b2.corps.some((c) => c.後詰);
    if (入った刻 === null) {
      if (居る) {
        入った刻 = b2.t; 気後 = 城方の気(); 寄気後 = 寄せ手の気();
        /* 計略は後詰に及ばない。現れたその刻に水の手を仕掛ける（必ず成る賽で） */
        const 後の気 = 後.map((c) => c.morale), 城ら = def2.filter(生き), 城の気 = 城ら.map((c) => c.morale);
        const 元 = Math.random; Math.random = () => 0.01;
        const r = A.計略を仕掛ける(b2, '水の手', null);
        Math.random = 元;
        計 = { r, 後に及ばぬ: 後.every((c, k) => c.morale === 後の気[k]), 城に及ぶ: 城ら.some((c, k) => c.morale < 城の気[k]) };
      } else { 気前 = 城方の気(); 寄気前 = 寄せ手の気(); }
    }
    if (!居る && b2.t < 出る刻 - 1 && b2.corps.some((c) => c.後詰)) 先に居た = true;
    if (居る && 後.some((c) => c.squads.some((q) => q.engaged))) 噛んだ = true;
    if (入った刻 !== null && 討って出た === null && b2.log.some((l) => l.t >= 入った刻 && /討って出た/.test(l.text))) 討って出た = b2.t;
  });
  確('現れる刻（着く刻から道のりのぶん早い）までは盤に居ない', !先に居た && 入った刻 !== null && 入った刻 >= 出る刻 - 0.5,
    `城に着く見込み${(b.後詰[0].刻 * b.dusk).toFixed(0)}秒・道のり${道の刻.toFixed(0)}秒・現れる見込み${出る刻.toFixed(0)}秒・現れた${入った刻 == null ? '―' : 入った刻.toFixed(1) + '秒'}`);
  確('現れる刻が来れば盤に現れる（遅れは一秒の内）', 入った刻 !== null && 入った刻 <= 出る刻 + 1);
  const 口 = 後.map((c) => c.後詰.口).filter(Boolean);
  確('南から来る後詰は盤の南の端に立つ', 口.length === 3 && 口.every((p) => p.y > A.FIELD.h * 0.72),
    口.map((p) => `(${Math.round(p.x)},${Math.round(p.y)})`).join(' ') + `／盤 ${A.FIELD.w}×${A.FIELD.h}`);
  const 悪い地 = new Set(['forest', 'wood', 'village', 'deep', 'ford', 'bridge', 'marsh', 'mountain']);
  確('入り口は城山の外で、森・村・川・沼・山に掛からない',
    口.every((p) => !A.城の域か(p.x, p.y, m) && !悪い地.has(A.terrainAt(p.x, p.y)) && A.passable(p.x, p.y)),
    口.map((p) => A.terrainAt(p.x, p.y)).join('・'));
  確('戦の記に「後詰が来た」と残る', b.log.some((l) => /後詰が来た/.test(l.text) && /南から現れた/.test(l.text)));
  確('現れれば城方の士気が上がる', 気前 != null && 気後 != null && 気後 > 気前 + 3, `${気前 && 気前.toFixed(1)}→${気後 && 気後.toFixed(1)}`);
  確('現れれば寄せ手の士気が下がる', 寄気前 != null && 寄気後 != null && 寄気後 < 寄気前 - 3, `${寄気前 && 寄気前.toFixed(1)}→${寄気後 && 寄気後.toFixed(1)}`);
  const 呼 = b.log.find((l) => /城方は呼応して打って出る/.test(l.text));
  確('後詰が城に迫れば、城方は六十秒（後詰が戦っているあいだはそれ以上）呼応する（現れた刻ではない）',
    !!呼 && 呼.t > 入った刻 + 5 && b.呼応 && b.呼応.まで >= 呼.t + 60 - 1 && b.呼応.側 === 'E',   // 後詰が槍を合わせているあいだは延びる
    呼 ? `現れて${(呼.t - 入った刻).toFixed(0)}秒後に迫った` : '迫らず');
  確('後詰は寄せ手へ寄せて槍を合わせる', 噛んだ);
  確('寄せ手は後詰に向き直る', b.log.some((l) => /後詰に向き直った/.test(l.text)),
    `${b.log.filter((l) => /後詰に向き直った/.test(l.text)).length}隊`);
  /* 呼応は報せだけで終わらない。呼応のあいだに、門を守る城方の隊が門を開いて手近な寄せ手に当たる
     （ai.js 呼応の的）。もとは常の打って出と同じ縛りで、呼応の報せが出ても一隊も出なかった */
  const 呼応して出た = b.log.find((l) => /後詰に呼応し、.+を開いて討って出た/.test(l.text));
  確('呼応のあいだに城方の隊が門を開いて寄せ手に当たる（記に「後詰に呼応し」と残る）',
    !!呼 && !!呼応して出た && 呼応して出た.t >= 呼.t && 呼応して出た.t <= 呼.t + 60,
    呼応して出た ? `迫ってから${(呼応して出た.t - (呼 ? 呼.t : 0)).toFixed(0)}秒後：${呼応して出た.text}` : `出なかった（討って出た記 ${討って出た == null ? '無し' : 討って出た.toFixed(0) + '秒'}）`);
  確('水の手は城兵の士気を下げ、後詰には及ばない', !!計 && 計.r.ok && 計.r.成 && 計.後に及ばぬ && 計.城に及ぶ, 計 ? 計.r.文 : '仕掛けられず');
  // 後詰の退き先は来た方（南）
  const c0 = 後[0];
  const p = A.退き先(b, c0);
  確('崩れた後詰は城の中ではなく、来た方の盤の端へ退く', p.y > c0.y + 1000, `退き先 (${Math.round(p.x)},${Math.round(p.y)})`);
}
{
  /* 夜をまたぐ。二日目に着く後詰は、一日目には現れず、夜を明かしてから現れる */
  /* 二日目の朝から九十秒ほどで城に着く後詰。寄せ手を止めると「攻めあぐねた戦」の決まりで
     戦が終わり、遅く着く後詰では城が先に落ちるので、早めの刻で確かめる */
  const 場 = 仕立てる(1, 0x2468, true, { 日: 2, 刻: 0.1, 角: -Math.PI / 2 });
  const { b, m, 後 } = 場;
  b.dusk = 120; b.日の長さ = 900;                      // 一日目は短く（城が落ちる前に夜へ入る）、二日目からは九百秒
  走らせる(場, 115);
  const 一日目に居た = b.corps.some((c) => c.後詰);
  const 落ちた = !!b.result;
  b.phase = 'night'; b.夜 = { 日: 1 };
  A.夜を明かす(b);
  const 朝 = b.t;
  const 出る = 朝 + Math.max(0, 0.1 * 900 - A.後詰の道の刻(m, -Math.PI / 2));
  走らせる(場, 出る + 5);
  const 入 = b.後詰[0].入った刻;
  確('二日目に着く後詰は、一日目には現れない', !一日目に居た, 落ちた ? '（一日目に城が落ちた）' : '');
  確('夜を明かしてから、二日目の刻に現れる', b.後詰[0].入った && b.後詰[0].入った日 === 2 && 入 >= 出る - 0.5 && 入 <= 出る + 1,
    入 != null ? `二日目の朝から${(入 - 朝).toFixed(1)}秒（見込み${(出る - 朝).toFixed(0)}秒）` : '現れず');
  const 口 = 後.map((c) => c.後詰.口).filter(Boolean);
  確('北から来る後詰は盤の北の端（城の背）に立つ', 口.length === 3 && 口.every((p) => p.y < b.map.cy),
    口.map((p) => `(${Math.round(p.x)},${Math.round(p.y)})`).join(' '));
}

console.log('── 五　後詰の有無で比べる');
{
  const 有 = [], 無 = [];
  for (let i = 0; i < 城々.length; i++) {
    for (const あり of [true, false]) {
      const 場 = 仕立てる(i, 0x4242 + i * 13, あり, { 角: Math.PI / 2 });
      /* 後詰は戦の始まって四十秒ほどで盤の端に現れ、そこから城へ向かう（着く刻はそれに道のりを足す）。
         遅く着く後詰は、城が先に落ちて間に合わない（それは上の節と月送りが見る） */
      if (あり) 場.b.後詰[0].刻 = (A.後詰の道の刻(場.m, Math.PI / 2) + 40) / 場.b.dusk;
      const 初 = 場.atk.reduce((a, c) => a + A.corpsMen(c), 0);
      const b = 走らせる(場, 700);
      const 残 = 場.atk.reduce((a, c) => a + A.corpsMen(c), 0);
      (あり ? 有 : 無).push({ 名: 城々[i][1], 損: Math.round(初 - 残), 落城: b.result === 'P' || !!b.captured, 刻: Math.round(b.t) });
    }
    const a = 有[i], z = 無[i];
    console.log(`    ${a.名}　後詰あり：寄せ手の損 ${a.損}人・${a.落城 ? `${a.刻}秒で落城` : '落ちず'}　／　なし：寄せ手の損 ${z.損}人・${z.落城 ? `${z.刻}秒で落城` : '落ちず'}`);
  }
  const 和 = (xs) => xs.reduce((a, r) => a + r.損, 0);
  確('後詰のある戦のほうが、寄せ手の損が重い', 和(有) > 和(無) * 1.1, `あり ${和(有)}人／なし ${和(無)}人（${(和(有) / Math.max(1, 和(無))).toFixed(2)}倍）`);
  確('後詰のある戦のほうが、落ちる城が多くならない', 有.filter((r) => r.落城).length <= 無.filter((r) => r.落城).length,
    `あり ${有.filter((r) => r.落城).length}／なし ${無.filter((r) => r.落城).length}`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
