/* 睨み合い ─ 攻めかかった隊が戦えぬまま日が暮れない（GDD 8.3）。

   遊ぶ側の報せは「この場面で攻めないバグ。このまま操作しても戦えず、時間切れになる」。
   一万六千九百の織田勢が突撃を命じられているのに、すぐ脇の上杉勢と一度も槍を
   合わせなかった。

   二つの根があった。

   一、退きの印だけが残る

     退かせる は withdraw の印を立て、「撤退」の下知を出す。ところがその下知は
     常の伝令と同じ道を通っていたので、指揮圏の外にいる隊では「命令が届かない」と
     して黙って捨てられた。印だけが残った隊は、退きも戦いもしない。相手も噛みつけ
     ないので、どれだけ押しても戦にならない。
     ――退却は本人の判断である。伝令を待たずその場で効かせる。加えて、印が宙に
     浮いた隊は毎刻ここで繕う（いま戦っている最中の盤にも、この姿が残っている）。

   二、触れ合う隔たりが、槍の間合いより広かった

     塊が重ならぬための留めで、隔たりの上限を三十四歩に置いていた。槍を合わせるのは
     二十二歩である。斜に向き合うと隔たりばかりが広がり、大軍と小勢が四十二歩を
     隔てて睨み合った。上限を十八歩（間合いより狭く）に改める。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x951;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 将 = (i, nm) => ({ id: 'g' + i, name: nm, lead: 80, valor: 76, wit: 70, gov: 60,
  retinue: 0, retTrain: 70, unity: 60, arms: { yari: 55, yumi: 20, teppo: 15, kiba: 10 } });

console.log('■ 一、正面から当たれば、前列が槍の間合いに入る');
/* 隊と隊が止まる隔たりは、席の差し渡しで決まる（engine の 触れる隔たり）。
   定数を見ても意味がないので、実際に正面から当てて、止まったところで
   組と組が噛み間（三十四歩）の内に入っているかを測る。
   広すぎれば睨み合いのまま日が暮れ、狭すぎれば塊が互いの只中へ滑り込む。 */
{
  H.setFieldSeed('n', 'i'); H.setBattleMap(null); H.layoutField(4000, 2);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  const 甲 = H.makeCorps('P', 将(8, '甲'), 0, 2000, 78, 78, W / 2, Hh * 0.5 + 220, -Math.PI / 2, '#2F5D8C');
  const 乙 = H.makeCorps('E', 将(9, '乙'), 0, 2000, 78, 78, W / 2, Hh * 0.5 - 220, Math.PI / 2, '#B0483C');
  for (const c of [甲, 乙]) H.placeSquads(c, true);
  const b = H.createBattle([甲], [乙], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
  b.aiClock = 1e9;
  for (const c of b.corps) c.auto = false;
  H.issueOrder(b, 甲, { order: '接戦', tx: 乙.x, ty: 乙.y }, { 即: true });
  H.issueOrder(b, 乙, { order: '守備', tx: 乙.x, ty: 乙.y }, { 即: true });
  let 最短 = 1e9, 噛み延べ = 0;
  for (let k = 0; k < 200; k++) {
    H.stepBattle(b, 0.2);
    噛み延べ += 甲.squads.filter((q) => q.engaged).length;
    if (k < 60) continue;                       // 寄せているあいだは測らない
    for (const p of 甲.squads) {
      if (p.men <= 0) continue;
      for (const q of 乙.squads) {
        if (q.men <= 0) continue;
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 最短) 最短 = d;
      }
    }
  }
  確('止まったところで、組と組が噛み間の内に入る', 最短 < H.噛み間,
    `組どうしの最短 ${Math.round(最短)}歩（噛み間 ${H.噛み間}歩）`);
  確('正面から当たれば槍が合う', 噛み延べ > 400, `噛み合いの延べ ${噛み延べ}`);
  確('塊は互いの只中へ入り込まない', Math.hypot(甲.x - 乙.x, 甲.y - 乙.y) > 8,
    `隊の中どころの隔たり ${Math.round(Math.hypot(甲.x - 乙.x, 甲.y - 乙.y))}歩`);
}

console.log('■ 二、退きの印だけが残った隊は、その場で繕われる');
{
  H.setFieldSeed('a', 'b'); H.setFieldKind('街道'); H.setBattleMap(null); H.layoutField(12000, 4);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  const 味 = H.makeCorps('P', 将(1, '織田信秀'), 0, 6000, 78, 78, W * 0.5, Hh * 0.56, -Math.PI / 2, '#2F5D8C');
  const 敵 = H.makeCorps('E', 将(2, '上杉輝虎'), 0, 6000, 78, 78, W * 0.5, Hh * 0.44, Math.PI / 2, '#B0483C');
  for (const c of [味, 敵]) H.placeSquads(c, true);
  const b = H.createBattle([味], [敵], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
  H.issueOrder(b, 味, { order: '突撃', tx: 敵.x, ty: 敵.y });
  敵.withdraw = true; 敵.order = '接戦'; 敵.pending = null; 敵.tx = 敵.x; 敵.ty = 敵.y; 敵.auto = true;
  let 噛み延べ = 0, 直り = null;
  for (let k = 0; k < 600 && b.phase === 'fight'; k++) {
    H.stepBattle(b, 0.2);
    if (k % 4 === 0) H.battleAI(b);
    const 噛 = 味.squads.filter((q) => q.engaged).length + 敵.squads.filter((q) => q.engaged).length;
    噛み延べ += 噛;
    if (直り == null && (噛 > 0 || (敵.withdraw && 敵.order === '撤退'))) 直り = (k * 0.2).toFixed(1);
  }
  確('宙に浮いた退きの印は、数秒で繕われる', 直り != null && Number(直り) < 10,
    直り == null ? '直らなかった' : `${直り}秒`);
  確('槍が合う（睨み合いのまま終わらない）', 噛み延べ > 500, `噛み合いの延べ ${噛み延べ}`);
}

console.log('■ 三、退けの下知は、指揮圏の外でも必ず効く');
{
  H.setFieldSeed('c', 'd'); H.setBattleMap(null); H.layoutField(9000, 4);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  const 大将 = H.makeCorps('E', 将(3, '総大将'), 0, 3000, 78, 78, W * 0.2, Hh * 0.2, 0, '#B0483C');
  const 離れ = H.makeCorps('E', 将(4, '離れ小島'), 0, 800, 78, 78, W * 0.9, Hh * 0.9, 0, '#B0483C');
  const 味 = H.makeCorps('P', 将(5, '寄せ手'), 0, 3000, 78, 78, W * 0.5, Hh * 0.5, 0, '#2F5D8C');
  for (const c of [大将, 離れ, 味]) H.placeSquads(c, true);
  const b = H.createBattle([味], [大将, 離れ], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
  H.issueOrder(b, 離れ, { order: '接戦', tx: 味.x, ty: 味.y });
  H.退かせる(b, 離れ, true);
  確('退けと決めたら、その場で「撤退」になる', 離れ.order === '撤退',
    `下知は「${離れ.order}」／退きの印 ${離れ.withdraw ? '有' : '無'}`);
  const 前 = { x: 離れ.x, y: 離れ.y };
  for (let k = 0; k < 120; k++) H.stepBattle(b, 0.2);
  const 動 = Math.hypot(離れ.x - 前.x, 離れ.y - 前.y);
  確('退くと決めた隊は、実際に退く', 動 > 60, `${Math.round(動)}歩 動いた`);
}

console.log('■ 四、大軍が小勢に攻めかかれる');
{
  H.setFieldSeed('e', 'f'); H.setBattleMap(null); H.layoutField(20000, 4);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  const 大 = H.makeCorps('P', 将(6, '大軍'), 0, 16930, 78, 78, W * 0.45, Hh * 0.5, 0, '#2F5D8C');
  const 小 = H.makeCorps('E', 将(7, '小勢'), 0, 2500, 78, 78, W * 0.45 + 46, Hh * 0.5 - 8, Math.PI, '#B0483C');
  for (const c of [大, 小]) H.placeSquads(c, true);
  const b = H.createBattle([大], [小], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1200; b.face = 'S'; b.myFar = false;
  大.formation = '鶴翼'; H.placeSquads(大, true);
  H.issueOrder(b, 大, { order: '突撃', tx: 小.x, ty: 小.y });
  let 噛み延べ = 0;
  for (let k = 0; k < 300 && b.phase === 'fight'; k++) {
    H.stepBattle(b, 0.2);
    噛み延べ += 大.squads.filter((q) => q.engaged).length;
  }
  確('斜に向き合っても槍が合う', 噛み延べ > 100, `噛み合いの延べ ${噛み延べ}`);
  確('小勢は削られる（睨み合いで終わらない）', H.corpsMen(小) < 2500 * 0.8,
    `${Math.round(H.corpsMen(小))}人（初め2,500）`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
