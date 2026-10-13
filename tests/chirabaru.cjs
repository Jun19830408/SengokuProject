/* 委ねた隊は、動き、散る（GDD 8.4 / 12.6）。

   遊ぶ側の申し出は三つであった。

     一、兵数が多くなると、バグで大きな駒が出てくる
     二、決戦で委任しても一部の部隊しか動かない（決戦以外でも起きる）
     三、なぜか一箇所に集まる

   元はそれぞれ別である。

   大きな駒　　絵の大きさを組の人数から起こしていた（draw.js）。組は五十人組で
               あるから本来それでよいが、名簿の組の id が重なると書き戻しで
               人数が倍々に膨れ、定員五十の組に十万二千六十八人が入る
               （core/roster.js の 通し番号を据える を見よ）。一辺八千画素の
               箱が盤を覆った。描く側にも盤を組む側にも床を張る。

   動かない　　高み・押さえ・本陣は「持ち場の縄」で縛ってある。押さえている
               ことに意味があるからだが、縄の内に敵が来なければ永久に守備の
               ままである。天下分け目の六十四隊の盤で、二十八隊が縄つき、
               そのうち十五隊が一歩も動かずに戦が終わっていた。縄に見切りを
               付ける――二分のあいだ縄の内に敵が来なければ、縄を解く。

   集まる　　　寄せ先は「敵から見て自分のいる側へ三十八歩」の一点であった。
               同じ敵へ二隊三隊が向かえば、どの隊も同じ点を目指す。隊どうしの
               押し合いと「そこへ行け」の下知が毎刻打ち消し合い、重なったまま
               止まる。実測で、味方どうしの最も近い隔たりが一歩――駒が完全に
               重なっていた。同じ敵を狙う味方を数え、敵を囲む向きに扇で割る。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let _s = 0x3131 >>> 0;
Math.random = function () { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const 将 = (id, nm) => ({ id, name: nm, lead: 64, valor: 62, wit: 58, gov: 55,
  retinue: 0, retTrain: 70, unity: 62 });
const 膨れた名簿 = (tag, n) => {
  const r = [];
  for (let i = 0; i < n; i++) {
    r.push({ id: `${tag}-${i}`, t: ['yari', 'yumi', 'teppo', 'kiba'][i % 4],
      m: i < 2 ? 102068 : 50, max: 50 });
  }
  return r;
};

console.log('── 一　膨れた名簿から組んでも、組は五十人を超えない');
{
  H.setBattleMap(null); H.setFieldSeed('a', 'a'); H.setFieldKind('街道'); H.layoutField(8000, 4);
  const g = { ...将('g1', '甲'), rost: 膨れた名簿('ret-g1', 8), locRost: 膨れた名簿('loc-g1', 8) };
  const c = H.makeCorps('P', g, 400, 400, 70, 70, 1000, 1000, 0, '#2F5D8C');
  const 最大 = Math.max(...c.squads.map((q) => q.men));
  確('どの組も五十人まで', 最大 <= 50, `最大 ${Math.round(最大)}人`);
  確('隊の兵も理に合う', H.corpsMen(c) <= 50 * c.squads.length,
    `${Math.round(H.corpsMen(c))}人／${c.squads.length}組`);
}

console.log('\n── 二　縄に見切りが付く（敵の来ない持ち場は、いつまでも抱えない）');
{
  H.setBattleMap(null); H.setFieldSeed('b', 'b'); H.setFieldKind('街道'); H.layoutField(9000, 6);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  // 高みの隊を盤の隅に置き、戦は遠くで起こす
  const 押 = H.makeCorps('P', 将('p0', '押さえ'), 0, 900, 70, 70, 300, 300, 0, '#2F5D8C');
  押.役 = '高み';
  押.持ち場 = { x: 押.x, y: 押.y, 縄: 900 };
  const 甲 = H.makeCorps('P', 将('p1', '甲'), 0, 6000, 70, 70, W * 0.5, Hh * 0.7, -Math.PI / 2, '#2F5D8C');
  const 乙 = H.makeCorps('E', 将('e1', '乙'), 0, 6000, 70, 70, W * 0.5, Hh * 0.3, Math.PI / 2, '#B0483C');
  for (const c of [押, 甲, 乙]) H.placeSquads(c, true);
  const b = H.createBattle([押, 甲], [乙], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 3000; b.face = 'S'; b.myFar = false;
  for (const c of b.corps) c.auto = true;
  確('はじめは縄に繋がれている', !!押.持ち場);
  for (let k = 0; k < 400; k++) H.stepBattle(b, 0.25);   // 百秒ぶん
  確('二分に満たぬうちは、まだ抱えている', !!押.持ち場, `空き ${Math.round(押.縄の空き || 0)}秒`);
  for (let k = 0; k < 400 && b.phase !== 'over'; k++) H.stepBattle(b, 0.25);   // さらに百秒
  確('二分を過ぎれば縄を解く', !押.持ち場 && !!押.縄を解いた,
    `持ち場 ${押.持ち場 ? 'あり' : 'なし'}・空き ${Math.round(押.縄の空き || 0)}秒・盤 ${b.phase}`);
  const 初 = { x: 300, y: 300 };
  確('解けた隊は戦へ向かう', Math.hypot(押.x - 初.x, 押.y - 初.y) > 60,
    `持ち場から ${Math.round(Math.hypot(押.x - 初.x, 押.y - 初.y))}歩`);
}

console.log('\n── 三　同じ敵へ寄せる味方は、重ならずに囲む');
{
  H.setBattleMap(null); H.setFieldSeed('c', 'c'); H.setFieldKind('街道'); H.layoutField(9000, 6);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  const 的 = H.makeCorps('E', 将('e1', '的'), 0, 1800, 70, 70, W / 2, Hh * 0.4, Math.PI / 2, '#B0483C');
  /* 同じ側から四隊で寄せる。もとはどの隊も同じ一点を目指し、重なって止まった。 */
  const P = [0, 1, 2, 3].map((i) => H.makeCorps('P', 将('p' + i, '味方' + i), 0, 700, 70, 70,
    W / 2 - 60 + i * 40, Hh * 0.72, -Math.PI / 2, '#2F5D8C'));
  for (const c of [...P, 的]) H.placeSquads(c, true);
  const b = H.createBattle(P, [的], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 3000; b.face = 'S'; b.myFar = false;
  for (const c of b.corps) c.auto = true;
  for (let k = 0; k < 500; k++) H.stepBattle(b, 0.25);
  const 生 = P.filter((c) => !c.dead && !c.destroyed);
  let 最小 = Infinity, 重 = 0;
  for (let i = 0; i < 生.length; i++) {
    for (let j = i + 1; j < 生.length; j++) {
      const d = Math.hypot(生[i].x - 生[j].x, 生[i].y - 生[j].y);
      if (d < 最小) 最小 = d;
      if (d < 30) 重++;
    }
  }
  確('味方どうしが駒ごと重ならない', 最小 > 30, `最も近い ${Math.round(最小)}歩`);
  確('重なった組み合わせが無い', 重 === 0, `${重}対`);
  /* 囲んでいるか。的から見た向きが散っていれば、一方から押しているのではない。 */
  const 角 = 生.map((c) => Math.atan2(c.y - 的.y, c.x - 的.x));
  const 幅 = (() => {
    const v = 角.slice().sort((a, z) => a - z);
    let 最 = 0;
    for (let i = 0; i < v.length; i++) {
      const 次 = i + 1 < v.length ? v[i + 1] : v[0] + Math.PI * 2;
      最 = Math.max(最, 次 - v[i]);
    }
    return Math.PI * 2 - 最;                 // 隊が張っている弧
  })();
  確('一点に集まらず、的を囲む向きに散る', 生.length < 2 || 幅 > 0.5,
    `張っている弧 ${(幅 * 180 / Math.PI).toFixed(0)}度・${生.length}隊`);
}

console.log('\n── 四　城攻めの寄せ口は、隊が増えても重ならない');
{
  /* 遊ぶ側の申し出は「城攻めで兵数が多いと変になる」であった。添えられた絵では、
     門の前に備が幾重にも完全に重なっていた。

     元は、段ごとに七十六歩ずつ下げるだけで、下げ幅が野の余地で頭打ちになる
     ことである。頭打ちの先は何段ぶんも同じ奥行きに積み上がり、横のずれも
     四十四歩しかないので、構える所がぴたりと重なる（三十隊で最も近い隔たり
     零歩）。三列四段の格子に組み、奥行きは余地を段で割り、十二隊ごとに
     横へずらす。 */
  const s = H.initState('oda');
  const 城 = s.castles.find((c) => c.faction === 'oda');
  const m = H.layoutCastleField(H.buildCastleMap(城));
  const og = m.layers[0].gates;
  確('門がある（検めが空でない）', og.length > 0, `${og.length}門`);
  for (const n of [12, 28]) {
    const 所 = [];
    for (let i = 0; i < n; i++) 所.push(H.寄せ口(m, og[i % og.length], Math.floor(i / og.length)));
    let 最小 = Infinity;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        最小 = Math.min(最小, Math.hypot(所[i].x - 所[j].x, 所[i].y - 所[j].y));
      }
    }
    確(`${n}隊でも、構える所が重ならない`, 最小 > 40, `最も近い ${Math.round(最小)}歩`);
  }
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
