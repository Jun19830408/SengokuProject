/* 射撃の下知（GDD 8.4）。

   遊ぶ側から「射撃コマンドがちゃんと効いていない」との報せがあった。測ると、
   射撃は「その場に留まる」下知になっていた。engine には「敵が百三十五歩まで
   詰めてきたら後ずさる」しか置いておらず、敵が射程の外にいれば隊はそのまま
   立ち尽くし、一発も放たなかった。UI も行き先を自分の居場所にしていた。

   射撃は「間合いを取って撃つ」下知である。遠ければ寄り、近すぎれば撃ちながら
   退く。狙いを名指ししてあればその敵へ、していなければいちばん近い敵へ。
   間合いは隊の持つ得物で決まる――弓は百九十歩、鉄砲は百五十歩。

   あわせて、射撃の下知では陣形の持ち場を組み替える。撃てと命じても弓鉄砲が
   後列にいては槍の背中しか撃てない。射手が前、槍は後ろに控えて射手を守り、
   騎馬はさらに後ろへ退く（突撃で騎馬を前に立てるのと同じ仕掛け）。

   測る組（千五百の射手の隊を、五百二十歩離れた千五百の槍隊へ向ける）

                    直す前 → 直したあと
     鉄砲主体の隔たり  520歩 →  133歩（鉄砲の届き百五十の内）
     弓主体の隔たり    520歩 →  171歩（弓の届き百九十の内）
     放った数（鉄砲）    0発 →  171発
     放った数（弓）      0発 →  384発 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 名簿 = (割, 総) => {
  const out = [];
  for (const [t, n] of Object.entries(割)) {
    let men = Math.round(総 * n);
    while (men > 0) { const m = Math.min(50, men); out.push({ m, t }); men -= m; }
  }
  return out;
};
const 将 = (i, nm, 割) => ({ id: 'g' + i, name: nm, lead: 70, valor: 70, wit: 60, gov: 55,
  retinue: 0, retTrain: 74, unity: 62, arms: { yari: 55, yumi: 20, teppo: 12, kiba: 13 },
  locRost: 名簿(割, 1500) });

/* 割＝兵科の割り、狙う＝名指しするか、隔＝初めの隔たり */
function 撃たせる(割, 狙う, 隔 = 520, 刻数 = 400) {
  let _s = 0x55;
  Math.random = function () { _s |= 0; _s = (_s + 0x6D2B79F5) | 0;
    let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | _s)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  H.setFieldSeed('a', 'a'); H.setFieldKind('街道'); H.setBattleMap(null);
  H.layoutField(4000, 2);
  const W = H.FIELD.w, Hh = H.FIELD.h, cx = W / 2, cy = Hh * 0.5;
  const E = H.makeCorps('E', 将(2, '赤', { yari: 1 }), 0, 1500, 78, 78, cx, cy - 隔, Math.PI / 2, '#B0483C');
  const P = H.makeCorps('P', 将(1, '青', 割), 0, 1500, 78, 78, cx, cy, -Math.PI / 2, '#2F5D8C');
  for (const c of [P, E]) H.placeSquads(c, true);
  const b = H.createBattle([P], [E], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 3000; b.face = 'S'; b.myFar = false;
  /* 采配は止める。測るのは下知そのものであって、委任の判断ではない */
  b.aiClock = 1e9;
  for (const c of b.corps) c.auto = false;
  H.issueOrder(b, E, { order: '待機', tx: E.x, ty: E.y }, { 即: true });
  H.issueOrder(b, P, { order: '射撃', tx: P.x, ty: P.y,
    ...(狙う ? { target: E.id, 狙い: E.id } : {}) }, { 即: true });
  const 元 = Math.hypot(P.x - E.x, P.y - E.y);
  for (let k = 0; k < 刻数; k++) H.stepBattle(b, 0.2);
  /* 持ち場の奥行き。隊の向き（敵のほう）へ射したぶん。大きいほど前 */
  const 奥 = (ls) => (ls.length
    ? ls.reduce((a, q) => a + ((q.slotX || 0) * Math.cos(P.facing) + (q.slotY || 0) * Math.sin(P.facing)), 0) / ls.length
    : 0);
  const 射手 = P.squads.filter((q) => q.men > 0 && (q.type === 'yumi' || q.type === 'teppo'));
  const 槍ら = P.squads.filter((q) => q.men > 0 && q.type === 'yari');
  return { 元: Math.round(元), 今: Math.round(Math.hypot(P.x - E.x, P.y - E.y)),
    発: (b.発射数 || {})[P.id] || 0, 射手の奥: 奥(射手), 槍の奥: 奥(槍ら),
    赤: Math.round(H.corpsMen(E)) };
}

console.log('■ 一、射程の外にいれば、撃てる所まで寄る');
{
  const 鉄 = 撃たせる({ teppo: 0.5, yari: 0.5 }, false);
  const 弓 = 撃たせる({ yumi: 0.5, yari: 0.5 }, false);
  確('鉄砲の隊は、鉄砲の届き（百五十歩）の内へ寄る', 鉄.今 < 150 && 鉄.今 > 60,
    `${鉄.元}歩 → ${鉄.今}歩`);
  確('弓の隊は、弓の届き（百九十歩）の内へ寄る', 弓.今 < 190 && 弓.今 > 80,
    `${弓.元}歩 → ${弓.今}歩`);
  確('寄ったら放つ（鉄砲）', 鉄.発 > 60, `${鉄.発}発`);
  確('寄ったら放つ（弓）', 弓.発 > 120, `${弓.発}発`);
  確('撃たれた敵は削れる', 鉄.赤 < 1500 && 弓.赤 < 1500,
    `鉄砲のとき ${鉄.赤}人・弓のとき ${弓.赤}人（初め1,500）`);
}

console.log('■ 二、名指ししても同じく寄って撃つ');
{
  const 鉄 = 撃たせる({ teppo: 0.5, yari: 0.5 }, true);
  確('名指しの敵へ寄って放つ', 鉄.今 < 150 && 鉄.発 > 60, `${鉄.今}歩・${鉄.発}発`);
}

console.log('■ 三、射撃の下知では、弓と鉄砲が前に出る');
{
  const 鉄 = 撃たせる({ teppo: 0.5, yari: 0.5 }, false);
  確('射手の持ち場は、槍より前にある', 鉄.射手の奥 > 鉄.槍の奥 + 10,
    `射手 ${鉄.射手の奥.toFixed(0)}・槍 ${鉄.槍の奥.toFixed(0)}（大きいほど前）`);
}

console.log('■ 四、近づかれたら、撃ちながら退く');
{
  const 近 = 撃たせる({ teppo: 0.5, yari: 0.5 }, false, 60, 200);
  確('間合いの内に食い込まれたら、間を取り直す', 近.今 > 60,
    `${近.元}歩 → ${近.今}歩`);
}

console.log('■ 五、間合いを取る仕掛けは、射手のための物である');
{
  /* 槍だけの隊に射撃を命じても、取るべき間合いがない。射撃は攻めの下知なので
     隊は敵のほうへは動くが、射程で足を止めることはしない。 */
  const 槍 = 撃たせる({ yari: 1 }, false);
  確('射手のいない隊は、射程で足を止めない', 槍.今 > 160,
    `${槍.元}歩 → ${槍.今}歩（鉄砲の隊なら百三十三歩で止まる）`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
