/* 退き口 ─ 撤退が効くこと（GDD 8.2）。

   一、退く先が自陣の側であること

       「遊ぶ側は南、敵は北」と決め打ちしていた。
         c.ty = c.side === "P" ? FIELD.h + 120 : -120

       ところが自陣がどちらに寄るかは、攻め口の方角（b.face）と、寄せ手か
       守り手か（b.myFar）で決まる。北から攻めれば自陣は盤の北にあり、
       東西の街道なら自陣は左右にある。決め打ちのままでは、撤退を命じた隊が
       敵陣へ向かって歩き出す。進んだ先には敵がいるので、すぐまた噛み合って
       その場から動かなくなる。押しても退かぬように見えるのは、これである。

   二、槍を合わせた隊でも退けること

       組は「持ち場から離れていて、かつ噛み合っていなければ」持ち場へ寄る。
       噛み合った組はその場を動かない。一方、隊は組を置いて先へは行けない。
       だから噛み合った隊は、撤退を命じても動きが取れなかった。
       退き口とは、隊形を捨てて掴み合いを解くことである。

   三、ただで退けはしないこと

       背を向ければ追い討ちの一撃を受ける。一斉に退けば軽く、
       一隊だけ勝手に抜ければ重い。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let _s = 424242 >>> 0;
Math.random = function () { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 将 = (i) => ({ id: 'g' + i, name: '某' + i, lead: 64, war: 60, pol: 50, intel: 50,
  exp: 40, wit: 60, valor: 60, arms: { yari: 50, yumi: 20, teppo: 10, kiba: 20 } });

/* 噛み合ったところで一隊を退かせ、どちらへ何px動くかを見る。 */
function 野戦(face) {
  _s = 424242 >>> 0;
  H.setFieldSeed('a', 'b'); H.layoutField(20000); H.setBattleMap(null);
  const 仮 = { face, myFar: false };
  const z = H.ownZone(仮);
  const 自y = z.bottom ? H.FIELD.h * 0.56 : H.FIELD.h * 0.44;
  const 敵y = z.bottom ? H.FIELD.h * 0.46 : H.FIELD.h * 0.54;
  const 向 = z.bottom ? -Math.PI / 2 : Math.PI / 2;
  const P = [], E = [];
  for (let i = 0; i < 4; i++) P.push(H.makeCorps('P', 将(i), 4000, 5000, 80, 80, H.FIELD.w * 0.35 + i * 200, 自y, 向, '#2F5D8C'));
  for (let i = 0; i < 4; i++) E.push(H.makeCorps('E', 将(10 + i), 4000, 5000, 80, 80, H.FIELD.w * 0.35 + i * 200, 敵y, -向, '#B0483C'));
  const b = H.createBattle(P, E, 'P');
  b.mode = 'field'; b.dusk = 99999; b.phase = 'fight'; b.face = face; b.myFar = false;
  for (const c of [...P, ...E]) H.placeSquads(c, true);
  let k = 0;
  while (k < 400 && !P[0].squads.some((q) => q.engaged)) {
    H.stepBattle(b, 0.25); if (k % 4 === 0) H.battleAI(b); k++;
  }
  const c = P[0];
  const 噛 = c.squads.filter((q) => q.engaged).length;
  const 兵前 = H.corpsMen(c), y0 = c.y;
  const r = H.退かせる(b, c, false);
  let 秒 = 0;
  for (let n = 0; n < 1200; n++) {
    H.stepBattle(b, 0.25); if (n % 4 === 0) H.battleAI(b); 秒 += 0.25;
    if (c.dead || b.phase !== 'fight') break;
  }
  return { z, 噛, 動: c.y - y0, 秒, 出た: !!c.dead, 損: r ? r.損 : 0, 兵前, 兵後: H.corpsMen(c) };
}

for (const face of ['S', 'N']) {
  const r = 野戦(face);
  const 側 = r.z.bottom ? '南' : '北';
  const 正 = r.z.bottom ? r.動 > 0 : r.動 < 0;
  console.log(`  （攻め口 ${face}／自陣は盤の${側}／噛んでいた組 ${r.噛}）`);
  確(`自陣の側へ退く（攻め口${face}）`, 正,
    `y ${(r.動 > 0 ? '南' : '北')}へ ${Math.abs(r.動) | 0}px`);
  確(`盤の外まで退ききる（攻め口${face}）`, r.出た, `${r.秒 | 0}秒`);
  確(`退く足が止まらない（攻め口${face}）`, Math.abs(r.動) / r.秒 > 25,
    `${(Math.abs(r.動) / r.秒).toFixed(1)}px/秒`);
  確(`槍を合わせていた隊でも退ける（攻め口${face}）`, r.噛 > 0 && Math.abs(r.動) > 400,
    `${r.噛}組が噛んでいた`);
  確(`ただでは退けない（攻め口${face}）`, r.損 > 0,
    `退き口で ${r.損}人を失う（${Math.round(r.兵前)} → ${Math.round(r.兵後)}人）`);
}

/* 一斉に退けば、一隊だけ抜けるより損が軽い */
{
  const 測 = (統制) => {
    _s = 777777 >>> 0;
    H.setFieldSeed('a', 'b'); H.layoutField(20000); H.setBattleMap(null);
    const P = [], E = [];
    for (let i = 0; i < 3; i++) P.push(H.makeCorps('P', 将(i), 4000, 5000, 80, 80, H.FIELD.w * 0.4 + i * 200, H.FIELD.h * 0.44, Math.PI / 2, '#2F5D8C'));
    for (let i = 0; i < 3; i++) E.push(H.makeCorps('E', 将(10 + i), 4000, 5000, 80, 80, H.FIELD.w * 0.4 + i * 200, H.FIELD.h * 0.54, -Math.PI / 2, '#B0483C'));
    const b = H.createBattle(P, E, 'P');
    b.mode = 'field'; b.dusk = 99999; b.phase = 'fight'; b.face = 'S'; b.myFar = true;
    for (const c of [...P, ...E]) H.placeSquads(c, true);
    let k = 0;
    while (k < 400 && !P[0].squads.some((q) => q.engaged)) { H.stepBattle(b, 0.25); if (k % 4 === 0) H.battleAI(b); k++; }
    return H.退かせる(b, P[0], 統制);
  };
  const 一斉 = 測(true), 単独 = 測(false);
  確('一斉に退けば損は軽い', 一斉.損 < 単独.損,
    `一斉 ${一斉.損}人 ／ 一隊だけ ${単独.損}人`);
}

/* 城攻めでは、方角ではなく城から離れる向きへ退く */
{
  _s = 987654 >>> 0;
  const 城 = { id: 'x', name: '試の城', def: 60, local: 2500, localTrain: 70, najimi: 70, rost: null };
  const 図 = H.layoutCastleField(H.buildCastleMap(城));
  H.setBattleMap(図);
  const 外 = 図.layers[0], P = [], E = [];
  外.gates.slice(0, 3).forEach((gt, i) => {
    const a = H.axisOf(外, gt);
    const p = H.fromUV(図, a, gt.off, a.half + 図.moat.band + 外.masu + 図.t + 70);
    P.push(H.makeCorps('P', 将(i), 1500, 2000, 80, 80, p.x, p.y, Math.atan2(図.cy - p.y, 図.cx - p.x), '#2F5D8C'));
  });
  for (const l of 図.layers) for (const gt of l.gates.slice(0, 2)) {
    const a = H.axisOf(l, gt);
    const p = H.fromUV(図, a, gt.off, a.half - 28);
    const c = H.makeCorps('E', 将(50 + E.length), 400, 600, 70, 70, p.x, p.y, 0, '#B0483C');
    c.holdGate = gt; E.push(c);
  }
  const b = H.createBattle(P, E, 'P');
  b.mode = 'castle'; b.map = 図; b.dusk = 99999; b.phase = 'fight';
  for (const c of [...P, ...E]) H.placeSquads(c, true);
  let k = 0;
  while (k < 1600 && !(P[0].pinned || P[0].squads.some((q) => q.engaged))) {
    H.stepBattle(b, 0.25); if (k % 4 === 0) H.battleAI(b); k++;
  }
  const c = P[0];
  const 前 = Math.hypot(c.x - 図.cx, c.y - 図.cy);
  H.退かせる(b, c, false);
  let 秒 = 0;
  for (let n = 0; n < 1600; n++) { H.stepBattle(b, 0.25); if (n % 4 === 0) H.battleAI(b); 秒 += 0.25; if (c.dead || b.phase !== 'fight') break; }
  const 後 = Math.hypot(c.x - 図.cx, c.y - 図.cy);
  確('城攻めでは、城から離れる向きへ退く', 後 > 前 + 200,
    `城の中心から ${前 | 0}px → ${後 | 0}px`);
  確('城攻めでも盤の外まで退ききる', !!c.dead, `${秒 | 0}秒`);
  H.setBattleMap(null);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
