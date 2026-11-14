/* 城方は門の外へはみ出さず、討って出るときは門を開いて列で出入りする（GDD 9.4）。

   遊ぶ側の申し出は「城門を挟んでの城攻めで、守勢側が城門からはみ出している」「兵が下に
   溢れるように落ちて行くのも不自然」であった（説明動画の稲葉山の大手門）。測ると、もとは
   四つが重なっていた。

     一、寄せの先手の小勢が門に着いた刹那に、すぐ後ろに寄せ手の本勢が迫っているのに、
         城方が門を開いて討って出た（門の前の百七十歩だけで寄せ手の強さを量っていた）
     二、「門を開いて」と記しながら門は開かず、討って出た隊は門の脇の塀へまっすぐ歩いて
         行き当たり、三十一の組が塀ぎわの一点に押し詰まった。やがて代表点が塀の外へ押し
         出され、組は門の升目を一組ずつすり抜け、枡形の正面の塀に溜まり、坂を細い列で下った
     三、城方の組は「内へ入るときだけ」自分の門を通れるが、内か外かを城の芯からの隔たり
         だけで判じていたので、輪の内にいる隊の組が門の升目へ踏み出して門の上に立った
     四、門の升目の上に取り残された組は、一歩も出られなくなった

   ここでは試しの城を組み、一、門の前の小勢のすぐ後ろに寄せ手の本勢がいれば出ないこと、
   二、寄せ手が門の前の小勢だけなら門を開いて出て、組が塀を抜けず跳ばずに列で門をくぐり、
   枡形の塀に溜まらずに外へ出ること、三、戻るときも列で門をくぐって皆が内へ入ること、
   四、門を守るあいだ、城方の組が門の外や門の升目に立たないことを確かめる。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x5A11;
Math.random = () => { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 名簿 = (割, 総) => { const out = []; for (const [t, n] of Object.entries(割)) { let men = Math.round(総 * n);
  while (men > 0) { const m = Math.min(50, men); out.push({ m, t }); men -= m; } } return out; };
const 将 = (i, nm, 割, 総, 器 = 60) => ({ id: `g${i}`, name: nm, lead: 器, valor: 器, wit: 55, gov: 55, retinue: 0,
  retTrain: 70, unity: 62, arms: { yari: 55, yumi: 20, teppo: 12, kiba: 13 }, locRost: 名簿(割, 総) });

/* 試しの城。外の輪の南の門を受け持つ城方一隊を、ゲームの据え方（defense.js 持ち場を並べる）と同じく
   門のすぐ内の帯の中ほどに、城の芯を向けて置く（隊は前の列を芯にして後ろ――門の側――へ伸びる）。
   寄せ手ははじめ門から遠くに置いて待たせ、城方を持ち場に就かせてから（十秒）門の前へ移す。
   横 … 城方の代表点を門の正面から横へずらす幅（門の幅に掛ける） */
function 盤(寄せ手ら, 横 = 0) {
  種 = 0x5A11;
  const 城 = { id: 'demon', name: '試の城', def: 80, local: 4000, localTrain: 70, najimi: 70, rost: null };
  const 図 = H.layoutCastleField(H.buildCastleMap(城));
  H.setBattleMap(図);
  const 外輪 = 図.layers[0];
  const 門 = 外輪.gates.find((g) => g.face === 'S') || 外輪.gates[0];
  const a = H.axisOf(外輪, 門);
  const 次 = 図.layers[1];
  const 帯 = Math.max(20, a.half - (次 ? (a.along === 'x' ? 次.hh + a.sgn * ((次.oy || 0) - (外輪.oy || 0))
    : 次.hw + a.sgn * ((次.ox || 0) - (外輪.ox || 0))) + 図.t : 0));
  let 内 = H.fromUV(図, a, 門.off + 門.w * 横, a.half - Math.min(44 * H.fieldScale(), 帯 * 0.5));
  const 守 = H.makeCorps('E', 将(1, '守', { yari: 0.7, yumi: 0.15, kiba: 0.15 }, 1400, 70), 0, 1400, 72, 72, 内.x, 内.y,
    Math.atan2(内.y - 図.cy, 内.x - 図.cx) + Math.PI, '#B0483C');
  守.holdGate = 門;
  /* 隊の体（組の席）が、外の塀と内の輪の塀のあいだの帯に収まるように、代表点を奥へずらす。
     陣形は采配が開戦の一手で選ぶので、先に選ばせておく（守る城では魚鱗を選びやすい） */
  { const 仮 = H.createBattle([], [守], 'P'); 仮.mode = 'castle'; 仮.map = 図; 仮.phase = 'fight'; 守.auto = true; H.battleAI(仮); }
  H.placeSquads(守, true);
  const 張り出し = Math.max(...守.squads.map((q) => H.toUV(a, q.x - 図.cx, q.y - 図.cy).v)) - a.half;
  if (張り出し > -12) {
    const 奥 = Math.min(帯 - 16, (a.half - H.toUV(a, 守.x - 図.cx, 守.y - 図.cy).v) + 張り出し + 12);
    内 = H.fromUV(図, a, 門.off + 門.w * 横, a.half - 奥);
    守.x = 内.x; 守.y = 内.y;
  }
  const 遠 = H.fromUV(図, a, H.gateOpenU(門), a.half + 図.t + 門.masu + 図.t + 900);
  const 寄 = 寄せ手ら.map(([v, 兵, 気], i) => {
    const c = H.makeCorps('P', 将(10 + i, `寄${i}`, { yari: 1 }, 兵), 0, 兵, 70, 70, 遠.x + i * 200, 遠.y, Math.atan2(図.cy - 遠.y, 図.cx - 遠.x), '#2F5D8C');
    c.morale = 気; c.置く = v;
    return c;
  });
  for (const c of [守, ...寄]) H.placeSquads(c, true);
  const b = H.createBattle(寄, [守], 'P');
  b.mode = 'castle'; b.map = 図; b.dusk = 3000; b.phase = 'fight';
  for (const c of 寄) { c.auto = false; H.issueOrder(b, c, { order: '待機', tx: c.x, ty: c.y }, { 即: true }); }
  守.auto = true;
  for (let k = 0; k < 200; k++) H.stepBattle(b, 0.05);          // 城方を持ち場に就かせる
  for (const c of 寄) {                                         // 寄せ手を門の前へ
    const p = H.fromUV(図, a, H.gateOpenU(門), a.half + 図.t + 門.masu + 図.t + c.置く);
    c.x = p.x; c.y = p.y; c.tx = p.x; c.ty = p.y; H.placeSquads(c, true);
  }
  return { b, 図, 門, 守, 寄, a };
}
const 輪の内 = (図, 門, x, y) => H.門の内か(図, 門, x, y);
const 向こう = (図, 門, x, y) => H.門の向こうか(図, 門, '出', x, y);
const 塞がり = (x, y) => { const t = H.terrainAt(x, y); return t === 'wall' || t === 'tower'; };

console.log('■ 一、門の前の小勢のすぐ後ろに寄せ手の本勢が迫っていれば、門を開いて出ない');
{
  const { b, 守 } = 盤([[40, 150, 70], [300, 6000, 80]]);
  let 出た = false;
  for (let k = 0; k < 600 && !出た; k++) { H.stepBattle(b, 0.05); 出た = !!守.sallied; }
  確('城方は門の内で守る', !出た, 出た ? `${b.t.toFixed(1)}秒で討って出た` : '三十秒、門を開かなかった');
}

console.log('■ 二、門の前の寄せ手が小勢だけなら、門を開いて列で討って出る');
{
  /* 寄せ手は門の前の小勢と、遠く（千二百歩）に控える一隊。小勢が崩れても戦は続く */
  const { b, 図, 門, 守, 寄: 寄ら } = 盤([[40, 150, 70], [1200, 2000, 80]]);
  const 寄 = 寄ら.slice(0, 1);
  /* 塀へ踏み込む組、一刻みに歩ける幅を超えて動く組、門口（門と枡形）に溜まる組を数える */
  const 前 = new Map();
  let 出た刻 = null, 抜けた刻 = null, 戻った刻 = null, 戻りはじめ = null;
  let 踏み込み = 0, 跳び = 0, 最大 = 0, 門口の延べ = 0, 門の升目 = 0;
  const 歩ける = (q, dt) => (q.type === 'kiba' ? 56 : 34) * H.fieldScale() * dt * 2.6 + 0.5;
  const dt = 0.05;
  for (let k = 0; k < 2400; k++) {
    for (const q of 守.squads) if (q.men > 0) 前.set(q, [q.x, q.y]);
    H.stepBattle(b, dt);
    if (守.sallied && 出た刻 == null) 出た刻 = b.t;
    for (const q of 守.squads) {
      if (q.men <= 0) continue;
      const p = 前.get(q); if (!p) continue;
      const d = Math.hypot(q.x - p[0], q.y - p[1]);
      if (d > 最大) 最大 = d;
      if (d > 歩ける(q, dt)) 跳び++;
      if (塞がり(q.x, q.y) && !塞がり(p[0], p[1])) 踏み込み++;
      if (H.terrainAt(q.x, q.y) === 'gate' && !守.門の列) 門の升目++;
      if (出た刻 != null && !輪の内(図, 門, q.x, q.y) && !向こう(図, 門, q.x, q.y)) 門口の延べ++;
    }
    const 生 = 守.squads.filter((q) => q.men > 0);
    if (出た刻 != null && 抜けた刻 == null && 生.every((q) => 向こう(図, 門, q.x, q.y))) 抜けた刻 = b.t;
    if (抜けた刻 != null && 戻りはじめ == null && !守.sallied) 戻りはじめ = b.t;
    if (戻りはじめ != null && 戻った刻 == null && 生.every((q) => 輪の内(図, 門, q.x, q.y)) && 輪の内(図, 門, 守.x, 守.y)) 戻った刻 = b.t;
    if (戻った刻 != null && b.t - 戻った刻 > 5) break;
    if (守.routed || 守.dead) break;
  }
  確('寄せ手が門の前の小勢だけなら、門を開いて討って出る', 出た刻 != null,
    出た刻 != null ? `持ち場に就いてから${(出た刻 - 10).toFixed(1)}秒` : 'ついに出なかった');
  確('出た隊の組は、みな枡形の口を抜けて外へ出る（二十秒の内）', 抜けた刻 != null && 抜けた刻 - 出た刻 < 20,
    抜けた刻 != null ? `出てから${(抜けた刻 - 出た刻).toFixed(1)}秒` : '抜けきらなかった');
  確('戻るときも、皆が門をくぐって輪の内へ入る（三十秒の内）', 戻った刻 != null && 戻った刻 - 戻りはじめ < 30,
    戻った刻 != null ? `戻りはじめから${(戻った刻 - 戻りはじめ).toFixed(1)}秒` : (戻りはじめ == null ? '戻りはじめなかった' : '入りきらなかった'));
  確('組が塀へ踏み込まない', 踏み込み === 0, `${踏み込み}度`);
  確('列が門を閉じたあと、門の升目に残る組がない', 門の升目 === 0, `${門の升目}組刻`);
  確('組は一刻みに歩ける幅を超えて動かない（跳ばない）', 跳び === 0, `超えた刻み ${跳び}／最大 ${最大.toFixed(1)}歩`);
  /* 門口（門の升目と枡形）は通り道である。組が平均して長く留まれば、枡形の塀に溜まっている */
  const 組数 = 守.squads.filter((q) => q.men > 0).length;
  確('組は門口に溜まらない（出入りを合わせて一組あたり延べ八秒まで）', 門口の延べ * dt / Math.max(1, 組数) < 8,
    `一組あたり ${(門口の延べ * dt / Math.max(1, 組数)).toFixed(1)}秒`);
  確('寄せ手の小勢は討たれるか崩れる', 寄.every((c) => c.dead || c.destroyed || c.routed || c.squads.reduce((t, q) => t + Math.max(0, q.men), 0) < 150),
    寄.map((c) => `${Math.round(c.squads.reduce((t, q) => t + Math.max(0, q.men), 0))}人${c.routed ? '（崩れ）' : ''}`).join('・'));
}

console.log('■ 三、門を守るあいだ、城方の組は門の外にも門の升目にも立たない');
{
  /* 代表点を門の正面から横へずらして置く。もとは「城の芯に近ければ門を通れる」と判じたので、
     輪の内にいる隊の組が門の升目へ踏み出した */
  const { b, 図, 門, 守 } = 盤([[60, 2400, 80], [200, 2400, 80]], 0.9);
  let 外 = 0, 升目 = 0, 出 = 0;
  for (let k = 0; k < 1200; k++) {
    H.stepBattle(b, 0.05);
    if (守.sallied) 出++;
    for (const q of 守.squads) {
      if (q.men <= 0) continue;
      if (!輪の内(図, 門, q.x, q.y)) 外++;
      if (H.terrainAt(q.x, q.y) === 'gate') 升目++;
    }
  }
  確('寄せ手の本勢を前に、城方は討って出ない', 出 === 0, `${出}刻`);
  確('城方の組は門の外に出ない', 外 === 0, `${外}組刻`);
  確('城方の組は門の升目に立たない', 升目 === 0, `${升目}組刻`);
}

console.log(咎.length ? `\nエラー: ${咎.length}件（${咎.join('／')}）` : '\nエラー: なし');
process.exit(咎.length ? 1 : 0);
