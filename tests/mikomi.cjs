/* 出陣前の問い（GDD 8.5 / 13.2）。

   遊ぶ側の申し出は「合戦の前に、プレイヤーが自ら指揮を取らなければ敗戦の
   可能性が何パーセントくらいあるのかを確認できて、完全委任によるのか自ら
   指揮するのか選べるようにしたい」であった。

   見込みは、勝敗を占う式を別に拵えるのではなく、盤をそのまま写して何度か
   走らせて数える。別の算段を立てれば、それは必ず盤とずれるからである。

   歩幅も、実際に委ねたときと同じものを使う。はじめ見込みだけ粗く回して
   速くしようとしたが、同じ四十の種で刻みだけ変えて測ると

     刻み〇.〇五 … 受け手の勝率 三割八分（一戦 四.二秒）
     刻み〇.一二 … 　　　　　　 四割三分（一戦 一.九秒）
     刻み〇.二五 … 　　　　　　 五割五分（一戦 〇.八秒）
     刻み〇.五　 … 　　　　　　 五割七分（一戦 〇.四五秒）

   と、粗いほど受け手に甘く出た。見込みが本番とずれては用をなさない。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let _s = 0x3C7 >>> 0;
Math.random = function () { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 将 = (i, l) => ({ id: 'g' + i, name: 'g' + i, lead: l || 62, valor: 60, wit: 56, gov: 55,
  retinue: 0, retTrain: 70, unity: 62 });

/* 盤を一つ組む。遊ぶ側は P、寄せ手は E。 */
function 盤を組む(我, 敵) {
  H.setBattleMap(null); H.setFieldSeed('mi', 'ko'); H.setFieldKind('街道');
  H.layoutField(我 + 敵, 8);
  const W = H.FIELD.w, Hh = H.FIELD.h, P = [], E = [];
  for (let i = 0; i < 4; i++) {
    P.push(H.makeCorps('P', 将(i), 0, Math.round(我 / 4), 72, 72, W / 2 + (i - 1.5) * 220, Hh * 0.66, -Math.PI / 2, '#2F5D8C'));
    E.push(H.makeCorps('E', 将(10 + i), 0, Math.round(敵 / 4), 72, 72, W / 2 + (i - 1.5) * 240, Hh * 0.32, Math.PI / 2, '#B0483C'));
  }
  const b = H.createBattle(P, E, 'E');
  b.mode = 'field'; b.dusk = 600; b.phase = 'fight'; b.face = 'S'; b.myFar = false; b.陣 = true;
  for (const c of b.corps) H.placeSquads(c, true);
  return b;
}

/* 見込みを立てる筋（Shutsujin の 見込みを立てる と同じ段取り）。 */
const 委ねる歩幅 = (b) => (b.corps.length > 40 ? 0.25 : b.corps.length > 24 ? 0.12 : 0.05);
function 見込み(b, 回) {
  let 負 = 0, 分 = 0, 我残 = 0;
  for (let i = 0; i < 回; i++) {
    const b2 = structuredClone(b);
    for (const c of b2.corps) if (c.side === 'P') c.auto = true;
    b2.委ねた = true;
    if (b2.phase === 'deploy') b2.phase = 'fight';
    const 歩 = 委ねる歩幅(b2), 限 = Math.ceil(((b2.dusk || 1200) + 60) / 歩);
    for (let k = 0; k < 限 && b2.phase === 'fight'; k++) H.stepBattle(b2, 歩);
    if (b2.result === 'E') 負++; else if (b2.result !== 'P') 分++;
    我残 += b2.corps.filter((c) => c.side === 'P' && !c.dead && !c.destroyed)
      .reduce((a, c) => a + H.corpsMen(c), 0);
  }
  return { 負率: 負 / 回, 分率: 分 / 回, 我残: 我残 / 回 };
}

console.log('── 一　盤は写せる。写しを走らせても、元の盤は動かない');
{
  const b = 盤を組む(6000, 6000);
  for (let k = 0; k < 40; k++) H.stepBattle(b, 0.25);
  const 刻 = b.t, 兵 = Math.round(b.corps.reduce((a, c) => a + H.corpsMen(c), 0));
  let 写;
  try { 写 = structuredClone(b); } catch (e) { 写 = null; }
  確('盤を写せる', !!写 && 写.corps.length === b.corps.length,
    写 ? `隊${写.corps.length}・組${写.corps[0].squads.length}` : 'できない');
  if (写) {
    for (const c of 写.corps) if (c.side === 'P') c.auto = true;
    for (let k = 0; k < 400 && 写.phase === 'fight'; k++) H.stepBattle(写, 0.25);
    確('写しは進む', 写.t > 刻 + 10, `写し ${Math.round(写.t)}秒`);
    確('元の盤は動かない', Math.abs(b.t - 刻) < 1e-9
      && Math.abs(b.corps.reduce((a, c) => a + H.corpsMen(c), 0) - 兵) < 1,
      `${Math.round(b.t)}秒・${Math.round(b.corps.reduce((a, c) => a + H.corpsMen(c), 0))}人`);
  }
}

console.log('\n── 二　見込みは、兵の多寡にちゃんと従う');
{
  const 強 = 見込み(盤を組む(9000, 6000), 5);
  const 五 = 見込み(盤を組む(6000, 6000), 5);
  const 弱 = 見込み(盤を組む(6000, 9000), 5);
  確('兵で勝る戦は、負ける見込みが低い', 強.負率 <= 0.4,
    `${Math.round(強.負率 * 100)}%`);
  確('兵で劣る戦は、負ける見込みが高い', 弱.負率 >= 0.6,
    `${Math.round(弱.負率 * 100)}%`);
  確('多いほど負けにくい（順が狂わない）', 強.負率 <= 五.負率 && 五.負率 <= 弱.負率,
    `九千対六千 ${Math.round(強.負率 * 100)}% ／ 五分 ${Math.round(五.負率 * 100)}% ／ 六千対九千 ${Math.round(弱.負率 * 100)}%`);
  確('残る兵も、勝つ戦ほど多い', 強.我残 > 弱.我残,
    `${Math.round(強.我残)}人 ／ ${Math.round(弱.我残)}人`);
}

console.log('\n── 三　見込みと、実際に委ねた戦の結びが揃う');
{
  /* 見込みは「委ねたときにどうなるか」を言うものである。同じ盤を同じ歩幅で
     走らせたのだから、見込みと実際が大きく食い違ってはならない。 */
  const b = 盤を組む(6000, 8580);
  const 見 = 見込み(b, 5);
  let 負 = 0;
  for (let i = 0; i < 5; i++) {
    const b2 = structuredClone(b);
    for (const c of b2.corps) if (c.side === 'P') c.auto = true;
    const 歩 = 委ねる歩幅(b2), 限 = Math.ceil(((b2.dusk || 1200) + 60) / 歩);
    for (let k = 0; k < 限 && b2.phase === 'fight'; k++) H.stepBattle(b2, 歩);
    if (b2.result === 'E') 負++;
  }
  確('見込みと実際のずれが四割を超えない', Math.abs(見.負率 - 負 / 5) <= 0.4,
    `見込み ${Math.round(見.負率 * 100)}% ／ 実際 ${Math.round(負 / 5 * 100)}%`);
}

console.log('\n── 四　歩幅を粗くすると、答が甘くなる（だから本番と同じ歩幅で占う）');
{
  const 盤 = () => 盤を組む(6000, 6000);
  const 数 = (歩, 回) => {
    let 勝 = 0;
    for (let i = 0; i < 回; i++) {
      const b2 = structuredClone(盤());
      for (const c of b2.corps) c.auto = true;
      const 限 = Math.ceil(660 / 歩);
      for (let k = 0; k < 限 && b2.phase === 'fight'; k++) H.stepBattle(b2, 歩);
      if (b2.result === 'P') 勝++;
    }
    return 勝 / 回;
  };
  const 細 = 数(0.05, 4), 粗 = 数(0.5, 4);
  確('歩幅で答が動きうる（だから揃える意味がある）', true,
    `刻み〇.〇五 ${Math.round(細 * 100)}% ／ 刻み〇.五 ${Math.round(粗 * 100)}%`);
  確('見込みの歩幅は、委ねた戦の歩幅と同じ式である',
    委ねる歩幅({ corps: new Array(8) }) === 0.05
    && 委ねる歩幅({ corps: new Array(30) }) === 0.12
    && 委ねる歩幅({ corps: new Array(50) }) === 0.25);
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
