/* 組は跳ばない（GDD 8.3）。

   遊ぶ側の申し出は「隊が四方八方に瞬間移動というか、あっちこっちに動き回っていて変」で
   あった。いちばん遅い速さ（微速。盤の一刻みは〇.〇〇四秒ほど）で寄って見ると、槍を
   合わせている脇で組が滑るように走り回り、消えて持ち場に現れる組もあった。もとは三つ。

     一、組の持ち場（席）を隊の代表点から直に測っていた。斬り結ぶ隊の代表点は、兵の重心へ
         引き戻す縄と、重なった敵を押し戻す決まりとで、一刻みに十歩、二十歩と跳ぶ。席が
         丸ごと跳び、組は駆け足でそれを追った
     二、前列が並ぶ「戦の線」の相手が、触れ合いの立ち消えにつれて刻みごとに替わった
     三、はぐれた組が、隊の道筋の点のまわりで行きつ戻りつして戻れず、据え直された
     四、組の向きを「いちばん近い敵の組」の方角で決め、歩くたび一息に据え直していた。
         入り乱れると相手が次々に替わり、組の列がその場で回り続けた（撮り直した動画を
         見ての申し出：「横一列の隊がクルクル回るような変な挙動」）

   代表点の理（縄・押し戻し）は変えていない（変えると戦の中身が変わる）。席を測る元の点
   （持ち場の元。engine の c.席x・c.席y）を別に持ち、代表点が歩ける幅を超えて跳んだぶんは
   遅れて追わせている。ここでは細かい刻みで盤を回し、持ち場の元と組が、歩ける幅を超えて
   動かないこと、行きつ戻りつしないこと、はぐれた組が歩いて戻ることを確かめる。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x91;
const 賽 = () => { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = 賽;
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
const 凍る = (b) => { b.aiClock = 1e9; for (const c of b.corps) c.auto = false; };
const 下知 = (b, c, patch) => H.issueOrder(b, c, patch, { 即: true });
const 尺 = () => (H.fieldScale ? H.fieldScale() : 1);
/* 席を測る元の点。持たない版（直す前）では、代表点そのものである */
const 元 = (c) => [c.席x == null ? c.x : c.席x, c.席y == null ? c.y : c.席y];
/* 一刻みに歩ける幅（追いつきの駆け足は二.四倍。絵の側が「飛び」と数える二.六倍に少し足す） */
const 歩ける = (q, dt) => (q.type === 'kiba' ? 56 : 34) * 尺() * dt * 2.6 + 0.5;

function 野(兵 = 4000, 隊 = 2) {
  種 = 0x91;
  H.setFieldSeed('tobi', 'x'); H.setFieldKind('街道'); H.setBattleMap(null);
  H.layoutField(兵, 隊);
  const cx = H.FIELD.w / 2, cy = H.FIELD.h * 0.5, 場 = 1500;
  for (const 群 of [H.FORESTS, H.WOODS, H.MARSH, H.HILLS, H.MOUNTAINS, H.VILLAGES]) {
    for (let i = 群.length - 1; i >= 0; i--) {
      if (Math.hypot(群[i].x - cx, 群[i].y - cy) < 群[i].r + 場) 群.splice(i, 1);
    }
  }
  return { W: H.FIELD.w, Hh: H.FIELD.h };
}

console.log('■ 一、槍を合わせているあいだ、持ち場の元も組も跳ばない');
{
  /* 遊ぶ盤と同じ広さ（二万四千人・十八隊ぶんの野。尺は八倍ほどで、足は尺ぶん速く、陣形の
     大きさはそのまま）で、遠くから寄せる。代表点が兵の重心より先へ出たまま槍が合うと、
     縄が短いものへ替わる */
  const { W, Hh } = 野(24000, 18);
  const 甲 = H.makeCorps('P', 将(1, '甲', { yari: 0.8, kiba: 0.2 }, 1800), 0, 1800, 78, 78, W / 2, Hh * 0.5 + 900, -Math.PI / 2, '#2F5D8C');
  const 乙 = H.makeCorps('E', 将(2, '乙', { yari: 1 }, 1300), 0, 1300, 78, 78, W / 2, Hh * 0.5 - 900, Math.PI / 2, '#B0483C');
  甲.formation = '鶴翼'; 乙.formation = '魚鱗';
  for (const c of [甲, 乙]) H.placeSquads(c, true);
  const b = H.createBattle([甲], [乙], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
  凍る(b);
  下知(b, 甲, { order: '接戦', tx: 乙.x, ty: 乙.y });
  下知(b, 乙, { order: '接戦', tx: 甲.x, ty: 甲.y });
  let 噛 = false;
  for (let k = 0; k < 3000 && !噛; k++) { H.stepBattle(b, 0.02); 噛 = 甲.squads.filter((q) => q.engaged).length >= 4; }
  確('二つの隊が槍を合わせる', 噛, `${b.t.toFixed(1)}秒`);
  const dt = 0.004, 刻み = 1500;
  let 隊最大 = 0, 隊跳 = 0, 組飛び = 0, 往復 = 0, 測 = 0, 点最大 = 0;
  const 前動 = new Map();
  for (let i = 0; i < 刻み; i++) {
    const 隊前 = [甲, 乙].map(元), 点前 = [甲, 乙].map((c) => [c.x, c.y]);
    const 前 = new Map();
    for (const c of [甲, 乙]) for (const q of c.squads) if (q.men > 0) 前.set(q.id, [q.x, q.y]);
    H.stepBattle(b, dt);
    [甲, 乙].forEach((c, k) => {
      const m = 元(c), d = Math.hypot(m[0] - 隊前[k][0], m[1] - 隊前[k][1]);
      if (d > 隊最大) 隊最大 = d;
      点最大 = Math.max(点最大, Math.hypot(c.x - 点前[k][0], c.y - 点前[k][1]));
      if (d > 56 * 尺() * dt * 1.5 + 0.2) 隊跳++;
      for (const q of c.squads) {
        if (q.men <= 0) continue;
        const p = 前.get(q.id); if (!p) continue;
        const vx = q.x - p[0], vy = q.y - p[1], 動 = Math.hypot(vx, vy); 測++;
        if (動 > 歩ける(q, dt)) 組飛び++;
        const 半 = (q.type === 'kiba' ? 56 : 34) * 尺() * dt * 0.5;
        const pv = 前動.get(q.id);
        if (pv && 動 > 半 && Math.hypot(pv[0], pv[1]) > 半 && vx * pv[0] + vy * pv[1] < 0) 往復++;
        前動.set(q.id, [vx, vy]);
      }
    });
  }
  /* 直す前は席を代表点から測っていたので、同じ盤で席が一刻みに十二歩跳んだ */
  確('持ち場の元は、一刻みに騎馬の駆け足を超えて動かない', 隊最大 <= 56 * 尺() * dt * 2.6 + 0.5,
    `一刻みの最大 ${隊最大.toFixed(2)}歩（上限 ${(56 * 尺() * dt * 2.6 + 0.5).toFixed(2)}歩）／足の一倍半を超えた刻み ${隊跳}／代表点は最大 ${点最大.toFixed(1)}歩`);
  確('組は、一刻みに歩ける幅を超えて動かない（飛ばない）', 組飛び === 0, `飛び ${組飛び}／${測}`);
  確('組は、刻みごとに向きを取り替えて行きつ戻りつしない', 往復 <= 測 * 0.003, `往復 ${往復}／${測}（尺 ${尺().toFixed(2)}）`);
}

console.log('■ 二、はぐれた組は、隊の道筋を辿って歩いて戻る');
{
  const { W, Hh } = 野();
  const 甲 = H.makeCorps('P', 将(1, '甲', { yari: 0.7, kiba: 0.3 }, 1000), 0, 1000, 78, 78, W / 2 - 700, Hh * 0.5 + 300, 0, '#2F5D8C');
  const 乙 = H.makeCorps('E', 将(2, '乙', { yari: 1 }, 300), 0, 300, 78, 78, W / 2, Hh * 0.5 - 900, Math.PI / 2, '#B0483C');
  for (const c of [甲, 乙]) H.placeSquads(c, true);
  const b = H.createBattle([甲], [乙], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
  凍る(b);
  下知(b, 乙, { order: '待機', tx: 乙.x, ty: 乙.y });
  下知(b, 甲, { order: '移動', tx: 甲.x + 1400 * 尺(), ty: 甲.y });
  const 始 = { x: 甲.x, y: 甲.y };
  /* 隊が五百歩（尺ぶん）進むまで歩かせ、道筋を覚えさせる */
  for (let k = 0; k < 4000 && Math.hypot(甲.x - 始.x, 甲.y - 始.y) < 500 * 尺(); k++) H.stepBattle(b, 0.02);
  const 道 = (甲.trail || []).length;
  確('隊は道筋を覚えている', 道 >= 3, `道筋の点 ${道}`);
  /* 騎馬の一組を、出立ちの所へ置き去りにする */
  const q = 甲.squads.find((x) => x.type === 'kiba' && x.men > 0);
  q.x = 始.x; q.y = 始.y; q.lost = true;
  const 離れ0 = Math.hypot(q.x - (甲.x + q.slotX), q.y - (甲.y + q.slotY));
  let 最大 = 0, 往復 = 0, 戻った = -1, pv = null;
  for (let k = 0; k < 600; k++) {
    const px = q.x, py = q.y;
    H.stepBattle(b, 0.02);
    const vx = q.x - px, vy = q.y - py, 動 = Math.hypot(vx, vy);
    if (動 > 最大) 最大 = 動;
    if (pv && 動 > 1 && Math.hypot(pv[0], pv[1]) > 1 && vx * pv[0] + vy * pv[1] < 0) 往復++;
    pv = [vx, vy];
    if (戻った < 0 && Math.hypot(q.x - (甲.x + q.slotX), q.y - (甲.y + q.slotY)) < 60) { 戻った = (k + 1) * 0.02; break; }
  }
  /* 直す前は、百九十歩を超えた刻に持ち場へ飛ばすか、道筋の点のまわりで足踏みを続けた */
  確('置き去りの組は、飛ばずに歩く', 最大 <= 歩ける(q, 0.02), `一刻みの最大 ${最大.toFixed(1)}歩（上限 ${歩ける(q, 0.02).toFixed(1)}歩・初めの離れ ${離れ0.toFixed(0)}歩）`);
  確('道筋の上で行きつ戻りつしない', 往復 <= 3, `往復 ${往復}`);
  確('歩いて持ち場へ戻る', 戻った >= 0, 戻った >= 0 ? `${戻った.toFixed(1)}秒` : '十二秒たっても戻らない');
}

console.log('■ 三、斬り結ぶ隊の持ち場は、その場で行きつ戻りつしない');
{
  /* 二隊ずつが名指しで当たる（tests/butsukari と同じ野）。槍を合わせた隊の代表点は、敵の前面へ
     じりじり寄っては、縄で十歩あまり引き戻される。席を代表点から測っていたころは、槍を
     合わせていない組がそのたび席を追って行き来した */
  種 = 0x91;
  H.setFieldSeed('a', 'b'); H.setFieldKind('街道'); H.setBattleMap(null);
  H.layoutField(6000, 4);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  const 割 = { yari: 0.55, yumi: 0.2, teppo: 0.12, kiba: 0.13 };
  const P = [], E = [];
  for (let i = 0; i < 2; i++) {
    P.push(H.makeCorps('P', 将(i, `味${i}`, 割, 1500), 0, 1500, 78, 78, W / 2 + (i - 0.5) * 260, Hh * 0.62, -Math.PI / 2, '#2F5D8C'));
    E.push(H.makeCorps('E', 将(10 + i, `敵${i}`, 割, 1500), 0, 1500, 78, 78, W / 2 + (i - 0.5) * 260, Hh * 0.38, Math.PI / 2, '#B0483C'));
  }
  const 全 = [...P, ...E];
  const b = H.createBattle(P, E, 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 99999; b.face = 'S'; b.myFar = false;
  /* 采配は止めない（名指しの相手を追わせる。止めると、行き先が初めの所のままなので、
     隊は相手の脇を抜けて行ってしまう）。隊を委ねないだけにする */
  for (const c of 全) { H.placeSquads(c, true); c.auto = false; }
  for (let i = 0; i < 2; i++) {
    H.issueOrder(b, P[i], { order: '接戦', tx: E[i].x, ty: E[i].y, target: E[i].id, 狙い: E[i].id });
    H.issueOrder(b, E[i], { order: '接戦', tx: P[i].x, ty: P[i].y, target: P[i].id, 狙い: P[i].id });
  }
  for (let k = 0; k < 1334; k++) H.stepBattle(b, 0.03);
  const 噛 = 全.filter((c) => c.squads.some((q) => q.men > 0 && q.engaged)).length;
  確('四十秒ののち、隊は槍を合わせている', 噛 >= 2, `槍を合わせている隊 ${噛}／${全.length}`);
  const dt = 0.004;
  let 元最大 = 0, 点最大 = 0, 組往復 = 0, 組測 = 0, 向き跳び = 0;
  const 組前動 = new Map(), 向き延べ = new Map();
  for (let i = 0; i < 2500; i++) {
    const 元前 = 全.map(元), 点前 = 全.map((c) => [c.x, c.y]);
    const 組前 = new Map();
    for (const c of 全) for (const q of c.squads) if (q.men > 0) 組前.set(q.id, [q.x, q.y, q.facing]);
    H.stepBattle(b, dt);
    全.forEach((c, k) => {
      if (c.routed || c.withdraw || c.dead || c.destroyed) return;
      const m = 元(c);
      元最大 = Math.max(元最大, Math.hypot(m[0] - 元前[k][0], m[1] - 元前[k][1]));
      点最大 = Math.max(点最大, Math.hypot(c.x - 点前[k][0], c.y - 点前[k][1]));
      for (const q of c.squads) {
        if (q.men <= 0) continue;
        const p = 組前.get(q.id); if (!p) continue;
        const vx = q.x - p[0], vy = q.y - p[1], 動 = Math.hypot(vx, vy); 組測++;
        const 半 = (q.type === 'kiba' ? 56 : 34) * 尺() * dt * 0.5;
        const pv = 組前動.get(q.id);
        if (pv && 動 > 半 && Math.hypot(pv[0], pv[1]) > 半 && vx * pv[0] + vy * pv[1] < 0) 組往復++;
        組前動.set(q.id, [vx, vy]);
        let 回 = q.facing - p[2]; 回 -= Math.round(回 / (Math.PI * 2)) * Math.PI * 2; 回 = Math.abs(回);
        if (回 > 向き跳び) 向き跳び = 回;
        向き延べ.set(q.id, (向き延べ.get(q.id) || 0) + 回);
      }
    });
  }
  /* 直す前は、この盤で代表点（＝席の元）が一刻みに二十二歩跳び、組の行きつ戻りつが九十四
     あった（二十四万刻みのうち） */
  確('持ち場の元は、一刻みに騎馬の駆け足を超えて動かない', 元最大 <= 56 * 尺() * dt * 2.6 + 0.5,
    `一刻みの最大 ${元最大.toFixed(2)}歩（上限 ${(56 * 尺() * dt * 2.6 + 0.5).toFixed(2)}歩）／代表点は最大 ${点最大.toFixed(1)}歩`);
  確('組の行きつ戻りつは、一万刻みに二つより少ない', 組往復 <= 組測 * 0.0002, `往復 ${組往復}／${組測}（尺 ${尺().toFixed(2)}）`);
  /* 組の向き。直す前は、この盤で歩く組が一刻みに六十度あまり向きを変え、十秒のあいだに
     一組あたり延べ六十度、多い組は二百三十度回った（入り乱れた稲葉山城下の野戦では、一秒
     足らずで延べ九百から千四百度） */
  const 度 = (v) => v * 180 / Math.PI;
  const 延べ = [...向き延べ.values()].map(度).sort((a, z) => z - a);
  const 平 = 延べ.reduce((a, v) => a + v, 0) / Math.max(1, 延べ.length);
  確('組の向きは、一刻みに一度より大きく変わらない', 度(向き跳び) <= 1,
    `一刻みの最大 ${度(向き跳び).toFixed(2)}度`);
  確('組の向きは、十秒のあいだに延べ四十度も回らない', 平 < 40,
    `一組あたり延べ ${平.toFixed(0)}度（最も回った組 ${延べ.length ? 延べ[0].toFixed(0) : 0}度・${延べ.length}組）`);
}

if (咎.length) { console.log('★背いた事:'); for (const s of 咎) console.log('   ' + s); }
console.log(咎.length ? `エラー: ${咎.length}件` : 'エラー: なし');
process.exit(咎.length ? 1 : 0);
