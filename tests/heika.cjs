/* 兵科の理 ─ 槍衾・乗り崩し・追撃・初弾・三段・翼の騎馬・射撃の間合い（GDD 8.4）。

   史実の兵科の動きを盤に写した。

     槍衾    足を止め敵に正対し隊列が保たれた槍隊は、おのずと衾を作る。
             正面からの騎馬は勢いを三分五厘削がれ、穂先の返しを受ける。
             横と後ろには効かない――回り込みこそが騎馬の答えである。
     乗り崩し 隊列の乱れた組への騎馬の白兵は五割五分増し。
     追撃    崩走中の隊への騎馬は七割増し。追われているあいだは立ち直れない。
     初弾    六秒以上引きつけて放つ最初の斉射は一.五倍。
     三段    鉄砲三組以上の隊は交代射撃で間が四.二→二.八秒。
     翼の騎馬 接戦の下知では騎馬は翼で控える。使いどころは騎馬側面攻撃（分遣）か突撃。
     間合い  射撃の下知の隊は、敵が詰めれば足六割で後ずさって間を保つ。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x84;
const 賽 = () => { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = 賽;
/* 組の割りは名簿（locRost）で渡す。gen.arms は腕前であって、組の割りではない。 */
const 名簿 = (割, 総) => {
  const out = [];
  for (const [t, n] of Object.entries(割)) {
    let men = Math.round(総 * n);
    while (men > 0) { const m = Math.min(50, men); out.push({ m, t }); men -= m; }
  }
  return out;
};
const 将 = (i, nm, 割, 総) => ({ id: 'g' + i, name: nm, lead: 70, valor: 70, wit: 60, gov: 55,
  retinue: 0, retTrain: 74, unity: 62, arms: { yari: 55, yumi: 20, teppo: 12, kiba: 13 },
  locRost: 名簿(割, 総) });
const 槍のみ = { yari: 1 };
const 馬のみ = { kiba: 1 };
/* 采配は凍らせ、下知は即時に効かせる（試験は下知そのものを測る）。 */
const 凍る = (b) => { b.aiClock = 1e9; for (const c of b.corps) c.auto = false; };
const 下知 = (b, c, patch) => H.issueOrder(b, c, patch, { 即: true });

function 野() {
  種 = 0x84;
  H.setFieldSeed('heika', 'x'); H.setFieldKind('街道'); H.setBattleMap(null);
  H.layoutField(4000, 2);
  return { W: H.FIELD.w, Hh: H.FIELD.h };
}

console.log('■ 一、槍衾が立つ');
{
  const { W, Hh } = 野();
  const 槍 = H.makeCorps('P', 将(1, '槍', 槍のみ, 1000), 0, 1000, 78, 78, W / 2, Hh * 0.55, -Math.PI / 2, '#2F5D8C');
  const 馬 = H.makeCorps('E', 将(2, '馬', 馬のみ, 1000), 0, 1000, 78, 78, W / 2, Hh * 0.30, Math.PI / 2, '#B0483C');
  for (const c of [槍, 馬]) H.placeSquads(c, true);
  const b = H.createBattle([槍], [馬], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
  凍る(b);
  下知(b, 槍, { order: '待機', tx: 槍.x, ty: 槍.y });
  下知(b, 馬, { order: '前進', tx: 槍.x, ty: 槍.y });
  let 立った = null;
  for (let k = 0; k < 300; k++) {
    H.stepBattle(b, 0.2);
    if (立った == null && 槍.衾) 立った = k * 0.2;
  }
  確('足を止めて敵を待つ槍隊に、衾が立つ', 立った != null, 立った != null ? `${立った.toFixed(1)}秒` : '立たず');
  下知(b, 槍, { order: '前進', tx: 槍.x, ty: 槍.y - 300 });
  for (let k = 0; k < 30; k++) H.stepBattle(b, 0.2);
  確('歩き出せば衾は解ける', !槍.衾);
}

/* 騎馬千を槍千に当て、六十秒後の槍の残りを測る。 */
function 馬当て({ 衾あり, 横から }) {
  const { W, Hh } = 野();
  const 槍 = H.makeCorps('P', 将(1, '槍', 槍のみ, 1000), 0, 1000, 78, 78, W / 2, Hh * 0.5, -Math.PI / 2, '#2F5D8C');
  const mx = 横から ? W / 2 - 420 : W / 2, my = 横から ? Hh * 0.5 : Hh * 0.5 - 380;
  const 向 = Math.atan2(槍.y - my, 槍.x - mx);
  const 馬 = H.makeCorps('E', 将(2, '馬', 馬のみ, 1000), 0, 1000, 78, 78, mx, my, 向, '#B0483C');
  for (const c of [槍, 馬]) H.placeSquads(c, true);
  const b = H.createBattle([槍], [馬], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
  凍る(b);
  下知(b, 槍, { order: '待機', tx: 槍.x, ty: 槍.y });
  下知(b, 馬, { order: '突撃', tx: 槍.x, ty: 槍.y, chargeT: 16 });
  if (!衾あり) for (const q of 槍.squads) q.cohesion = 30;      // 乱れた槍（衾は立たない）
  let 衾見た = false;
  for (let k = 0; k < 300 && b.phase === 'fight'; k++) {
    H.stepBattle(b, 0.2);
    if (!衾あり) for (const q of 槍.squads) q.cohesion = Math.min(q.cohesion, 30);
    if (槍.衾) 衾見た = true;
  }
  return { 槍残: Math.round(H.corpsMen(槍)), 馬残: Math.round(H.corpsMen(馬)), 衾見た };
}

console.log('■ 二、衾は正面の騎馬を受け止める（横は受けない）');
{
  const 構え = 馬当て({ 衾あり: true, 横から: false });
  const 乱れ = 馬当て({ 衾あり: false, 横から: false });
  const 横 = 馬当て({ 衾あり: true, 横から: true });
  確('正面では衾が立つ', 構え.衾見た);
  確('構え正面なら、槍が騎馬を削り勝つ', 構え.槍残 > 構え.馬残,
    `槍${構え.槍残}人 対 馬${構え.馬残}人`);
  確('乱れた槍は、構えた槍よりずっと崩れる', 乱れ.槍残 < 構え.槍残,
    `構え${構え.槍残}人 対 乱れ${乱れ.槍残}人`);
  確('乱れた槍には、騎馬がほとんど無傷で勝つ', 乱れ.馬残 > 乱れ.槍残 * 1.8,
    `乱れの馬${乱れ.馬残}人 対 槍${乱れ.槍残}人`);
  確('横へ回れば衾は効かず、槍が総崩れ', 横.槍残 < 構え.槍残 * 0.6,
    `正面${構え.槍残}人 対 横${横.槍残}人`);
}

console.log('■ 三、乗り崩しと追撃');
{
  // 乱れた敵への騎馬は速く崩す（二の「構え対乱れ」がその実測）
  const { W, Hh } = 野();
  const 逃 = H.makeCorps('P', 将(1, '崩', 槍のみ, 800), 0, 800, 78, 78, W / 2, Hh * 0.5, -Math.PI / 2, '#2F5D8C');
  const 馬 = H.makeCorps('E', 将(2, '馬', 馬のみ, 800), 0, 800, 78, 78, W / 2, Hh * 0.5 - 120, Math.PI / 2, '#B0483C');
  for (const c of [逃, 馬]) H.placeSquads(c, true);
  const b = H.createBattle([逃], [馬], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
  凍る(b);
  逃.routed = true; 逃.order = '敗走'; 逃.崩れた刻 = 0; 逃.morale = 30;
  下知(b, 馬, { order: '突撃', tx: 逃.x, ty: 逃.y, chargeT: 16 });
  for (let k = 0; k < 150; k++) H.stepBattle(b, 0.2);
  確('崩走中の隊を騎馬が叩くと「追われ」の印が付く', 逃.追われ != null,
    逃.追われ != null ? `${逃.追われ.toFixed(1)}秒` : '付かず');
  確('追われているあいだは立ち直らない', 逃.routed || 逃.潰 || 逃.dead,
    `routed=${!!逃.routed} 潰=${!!逃.潰}`);
}

console.log('■ 四、鉄砲の初弾と三段');
{
  const 撃たせる = (鉄砲組) => {
    const { W, Hh } = 野();
    const 鉄 = H.makeCorps('P', 将(1, '鉄', { teppo: 1 }, 鉄砲組 * 50), 0, 鉄砲組 * 50, 78, 78, W / 2, Hh * 0.5, -Math.PI / 2, '#2F5D8C');
    const 的 = H.makeCorps('E', 将(2, '的', 槍のみ, 1500), 0, 1500, 78, 78, W / 2, Hh * 0.5 - 110, Math.PI / 2, '#B0483C');
    for (const c of [鉄, 的]) H.placeSquads(c, true);
    const b = H.createBattle([鉄], [的], 'P');
    b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
  凍る(b);
    b.weather = '晴';
    下知(b, 鉄, { order: '待機', tx: 鉄.x, ty: 鉄.y });
    下知(b, 的, { order: '待機', tx: 的.x, ty: 的.y });
    for (let k = 0; k < 150; k++) H.stepBattle(b, 0.2);   // 三十秒
    return { 発射: (b.発射数 || {})[鉄.id] || 0, 組: 鉄.squads.filter((q) => q.type === 'teppo').length };
  };
  const 二組 = 撃たせる(2);
  const 五組 = 撃たせる(5);
  const 一組あたり二 = 二組.発射 / Math.max(1, 二組.組);
  const 一組あたり五 = 五組.発射 / Math.max(1, 五組.組);
  確('三組以上なら交代射撃で数が増える', 一組あたり五 > 一組あたり二 * 1.25,
    `二組${一組あたり二.toFixed(1)}発/組 対 五組${一組あたり五.toFixed(1)}発/組`);
}

console.log('■ 五、接戦では騎馬が翼で控える');
{
  const { W, Hh } = 野();
  const 混 = { yari: 0.6, yumi: 0.1, teppo: 0.05, kiba: 0.25 };
  const 味 = H.makeCorps('P', 将(1, '味', 混, 2000), 0, 2000, 78, 78, W / 2, Hh * 0.6, -Math.PI / 2, '#2F5D8C');
  const 敵 = H.makeCorps('E', 将(2, '敵', 槍のみ, 2000), 0, 2000, 78, 78, W / 2, Hh * 0.4, Math.PI / 2, '#B0483C');
  味.formation = '鶴翼';
  for (const c of [味, 敵]) H.placeSquads(c, true);
  const b = H.createBattle([味], [敵], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
  凍る(b);
  下知(b, 味, { order: '接戦', tx: 敵.x, ty: 敵.y });
  下知(b, 敵, { order: '接戦', tx: 味.x, ty: 味.y });
  for (let k = 0; k < 250; k++) H.stepBattle(b, 0.2);
  const 槍噛 = 味.squads.filter((q) => q.men > 0 && q.type === 'yari' && q.engaged).length;
  const 馬ら = 味.squads.filter((q) => q.men > 0 && q.type === 'kiba');
  const 馬噛 = 馬ら.filter((q) => q.engaged).length;
  確('槍は前で槍を合わせる', 槍噛 > 0, `噛み合う槍組 ${槍噛}`);
  確('騎馬はおおむね控えている', 馬噛 <= Math.ceil(馬ら.length * 0.35),
    `噛み合う騎馬 ${馬噛}／${馬ら.length}組`);
  /* 騎馬側面攻撃の分遣は、これまでどおり出せる */
  const 出た = !!H.makeDetachment(b, 味, '騎馬側面攻撃');
  確('騎馬側面攻撃の分遣が出せる', 出た && b.corps.some((x) => x.task === '騎馬側面攻撃'));
}

console.log('■ 六、射撃の下知は間合いを保つ');
{
  const { W, Hh } = 野();
  const 弓 = H.makeCorps('P', 将(1, '弓', { yari: 0.2, yumi: 0.6, teppo: 0.2 }, 1000), 0, 1000, 78, 78, W / 2, Hh * 0.55, -Math.PI / 2, '#2F5D8C');
  const 敵 = H.makeCorps('E', 将(2, '敵', 槍のみ, 1500), 0, 1500, 78, 78, W / 2, Hh * 0.30, Math.PI / 2, '#B0483C');
  for (const c of [弓, 敵]) H.placeSquads(c, true);
  const b = H.createBattle([弓], [敵], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
  凍る(b);
  下知(b, 弓, { order: '射撃', tx: 弓.x, ty: 弓.y });
  下知(b, 敵, { order: '接戦', tx: 弓.x, ty: 弓.y });
  const y0 = 弓.y;
  let 下がった = false, 射った = 0;
  for (let k = 0; k < 200; k++) {
    if (k % 25 === 0) 下知(b, 敵, { order: '接戦', tx: 弓.x, ty: 弓.y });   // 追い続ける
    H.stepBattle(b, 0.2);
    if (弓.y > y0 + 40) 下がった = true;
    if (弓.後退中) 射った = Math.max(射った, (b.発射数 || {})[弓.id] || 0);
  }
  確('敵が詰めれば後ずさる', 下がった, `${Math.round(弓.y - y0)}歩 下がった`);
  確('下がりながらも射ち続ける', 射った > 0, `後退しつつ${射った}発`);
  let 捕まった = false;
  for (let k = 0; k < 500 && !捕まった; k++) {
    if (k % 25 === 0 && b.phase === 'fight') 下知(b, 敵, { order: '接戦', tx: 弓.x, ty: 弓.y });
    H.stepBattle(b, 0.2);
    if (弓.squads.some((q) => q.engaged) || b.phase !== 'fight') 捕まった = true;
  }
  確('それでも足六割なので、追う側は必ず追いつく', 捕まった);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
