/* 門の行列 ─ 後続は橋の手前で待つ（GDD 9.3）。

   門の間口は狭く、取り付けるのは一隊だけである。ところが「全軍門を破る」と
   下知すると、後続の隊も堀も橋もお構いなしに門へ寄せ、前の隊と重なって
   押し合った。弾かれては寄せ直すので、盤の上では隊が瞬いて動き、小刻みに
   震えて見える――遊ぶ側の「瞬間移動やプルプル動く」はこれである。

   采配（委任した隊）には門の順番待ちを入れてあったが、遊ぶ側の下知には
   効いていなかった。門は一つ、列は engine が持つ――と一本にした。

   測る組（五隊を同じ門へ差し向け、七百五十秒ぶん）

                         直す前 → 直したあと
     門前（百五十歩）の隊    4.95 →  1.97 隊
     向きの反転             34.4% →   1.8%
     門の残り                38%  →    9%

   反転とは「前の刻と逆の向きへ動いた」ことである。押し合いに弾かれて
   寄せ直すたびに数えられる。取り付く一隊と次の一隊のほかは堀の外で待つので、
   混み合いも揺れも収まり、門を叩く手も止まらない。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let _s = 777777 >>> 0;
Math.random = function () { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 将 = (i, nm) => ({ id: `g${i}`, name: nm, lead: 60, valor: 60, wit: 55, gov: 55, retinue: 300, retTrain: 70, unity: 60 });

const 城 = { id: 'x', name: '試の城', def: 80, local: 4000, localTrain: 70, najimi: 70, rost: null };
const 図 = H.layoutCastleField(H.buildCastleMap(城));
H.setBattleMap(図);
const 外輪 = 図.layers[0];
const 的門 = 外輪.gates[0];
const 軸 = H.axisOf(外輪, 的門);

// 城方は門の内を固める
const 城方 = [];
for (let i = 0; i < 3; i++) {
  const p = H.fromUV(図, 軸, 的門.off, 軸.half - 44 - i * 30);
  城方.push(H.makeCorps('E', 将(i, `守${i}`), 300, 700, 70, 70, p.x, p.y,
    Math.atan2(p.y - 図.cy, p.x - 図.cx) + Math.PI, '#6E7FA0'));
}
/* 寄せ手は五隊。いずれも遊ぶ側の下知で同じ門へ向かう（委任ではない）。
   「全軍門を破る」を押したときと同じ形である。 */
const 寄手 = [];
for (let i = 0; i < 5; i++) {
  const p = H.fromUV(図, 軸, 的門.off + (i - 2) * 120, 軸.half + 図.moat.band + 外輪.masu + 図.t + 260);
  const c = H.makeCorps('P', 将(100 + i, `寄${i}`), 400, 2200, 75, 75, p.x, p.y,
    Math.atan2(図.cy - p.y, 図.cx - p.x), '#2F5D8C');
  c.gate = 的門; c.siegeAuto = true; c.auto = false;
  寄手.push(c);
}
const bb = H.createBattle(寄手, 城方, 'P');
bb.mode = 'castle'; bb.map = 図; bb.dusk = 1080; bb.phase = 'fight';
const 門所 = H.gatePos(図, 外輪, 的門);
for (const c of 寄手) { H.placeSquads(c, true); H.issueOrder(bb, c, { order: '前進', tx: 門所.x, ty: 門所.y }); }

let 刻 = 0, 門前の延べ = 0, 反転 = 0, 動き = 0, 跳び = 0, 取り付き = 0;
const 前 = new Map();
for (let k = 0; k < 3000; k++) {
  H.stepBattle(bb, 0.25); if (k % 4 === 0) H.battleAI(bb);
  刻++;
  const 生 = 寄手.filter((c) => !c.dead && !c.destroyed && !c.routed);
  門前の延べ += 生.filter((c) => Math.hypot(c.x - 門所.x, c.y - 門所.y) < 150).length;
  if (的門.slot) 取り付き++;
  for (const c of 生) {
    const p = 前.get(c.id);
    const v = { x: c.x, y: c.y };
    if (p) {
      const dx = v.x - p.x, dy = v.y - p.y, d = Math.hypot(dx, dy);
      if (d > 0.5) {
        動き++;
        if (p.vx != null) {
          const 内積 = (dx * p.vx + dy * p.vy) / (d * Math.hypot(p.vx, p.vy) || 1);
          if (内積 < -0.3) 反転++;
        }
        if (d > 60) 跳び++;                       // 一刻で六十歩以上＝瞬間移動に見える
        v.vx = dx; v.vy = dy;
      } else { v.vx = p.vx; v.vy = p.vy; }
    }
    前.set(c.id, v);
  }
  if (的門.broken) break;
}
const 門前 = 門前の延べ / Math.max(1, 刻);
const 反転率 = 反転 / Math.max(1, 動き) * 100;

console.log('■ 門前の混み合い');
確('門前に居るのは、取り付く隊とその次だけ', 門前 < 2.6, `百五十歩の内に平均 ${門前.toFixed(2)}隊（直す前は 4.95隊）`);
確('五隊を差し向けても、取り付くのは一隊', !!的門.slot || 的門.broken,
  `取り付いていた刻 ${Math.round(取り付き / 刻 * 100)}%`);

console.log('■ 隊の揺れ');
確('向きの反転が一割に収まる', 反転率 < 10, `${反転率.toFixed(1)}%（直す前は 34.4%）`);
確('瞬間移動をしない', 跳び === 0, `一刻に六十歩を超えた回数 ${跳び}`);

console.log('■ 待つ隊の立ち所');
const 控えら = 寄手.filter((c) => c.id !== 的門.slot && !c.dead && !c.destroyed && !c.routed);
const 堀の外 = 軸.half + 図.t + 的門.masu + 図.t + 図.moat.band;
const 内に入った = 控えら.filter((c) => H.toUV(軸, c.x - 図.cx, c.y - 図.cy).v < 堀の外);
確('控えの隊は堀の外に並ぶ', 的門.broken || 内に入った.length <= 1,
  `${控えら.length}隊のうち堀を越えていたのは ${内に入った.length}隊`);

console.log('■ 待っても攻めは止まらない');
確('門は行列のあいだも削られる', 的門.broken || 的門.hp < 的門.max * 0.5,
  的門.broken ? '破れた' : `残り ${Math.round(的門.hp / 的門.max * 100)}%（直す前は同じ刻で 38%）`);

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
