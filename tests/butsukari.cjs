/* ぶつかり合い ─ 塊はすり抜けず、前列が線を作る（GDD 8.3）。

   遊ぶ側から「当たる前に弾き合っているように見える」との報せがあった。
   正面から当たらせて測ると、二つの隊は互いをすり抜けていた。隊の代表点は
   陣の前列にあり、持ち場（陣形の席）はそこから測る。だから代表点が敵の
   向こうへ抜ければ、席も敵を越えて向こう側へ行く。斬り結んでいる組はそこへ
   引き戻され、敵に背を向けて歩く――間近の敵から遠ざかる組の動きの八割が、
   この「席へ戻る」であった。

   軍勢は人の塊である。塊と塊は重ならない。

     一、塊はすり抜けない（前面が触れたらそこで止まる）
     二、前列は戦の線に並ぶ（めいめい近い敵へ食いつくのをやめる）
     三、傷ついた前列は、二列目の新手と入れ替わる
     四、それでいて戦の長さは変えない（日没までの釣り合いを崩さない）

   測る組（四つの種で、二隊対二隊を正面から当てる）

                         直す前 → 直したあと
     隊の中どころの最短    4歩  →  16歩      （重なって一つにならない）
     隊の前後の揺れ       24.2% →  21.2%
     決着までの長さ       124秒 →  123秒 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 将 = (i, nm) => ({ id: 'g' + i, name: nm, lead: 64, valor: 62, wit: 55, gov: 55,
  retinue: 0, retTrain: 70, unity: 60, arms: { yari: 55, yumi: 20, teppo: 10, kiba: 15 } });

function 当てる(種, 刻数 = 1400) {
  let _s = 種 >>> 0;
  Math.random = function () { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  H.setFieldSeed('a', 'b'); H.setFieldKind('街道'); H.setBattleMap(null);
  H.layoutField(6000, 4);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  const P = [], E = [];
  for (let i = 0; i < 2; i++) {
    P.push(H.makeCorps('P', 将(i, `味${i}`), 0, 1500, 78, 78, W / 2 + (i - 0.5) * 260, Hh * 0.62, -Math.PI / 2, '#2F5D8C'));
    E.push(H.makeCorps('E', 将(10 + i, `敵${i}`), 0, 1500, 78, 78, W / 2 + (i - 0.5) * 260, Hh * 0.38, Math.PI / 2, '#B0483C'));
  }
  const b = H.createBattle(P, E, 'P');
  b.mode = 'field'; b.dusk = 99999; b.phase = 'fight'; b.face = 'S'; b.myFar = false;
  for (const c of [...P, ...E]) { H.placeSquads(c, true); c.auto = false; }
  for (let i = 0; i < 2; i++) {
    H.issueOrder(b, P[i], { order: '接戦', tx: E[i].x, ty: E[i].y });
    H.issueOrder(b, E[i], { order: '接戦', tx: P[i].x, ty: P[i].y });
  }
  const 立つ = (c) => H.塊として立つ(c) && !c.dead;
  let 最短 = 1e9, 反転 = 0, 動き = 0, 決着 = null, 線の散らばり = [], 入替 = 0;
  const 前 = new Map();
  for (let k = 0; k < 刻数; k++) {
    H.stepBattle(b, 0.2);
    for (const c of [...P, ...E]) {
      if (!立つ(c)) continue;
      const p = 前.get(c.id);
      if (p) {
        const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy);
        if (d > 0.4) {
          動き++;
          if (p.vx != null && (dx * p.vx + dy * p.vy) / (d * Math.hypot(p.vx, p.vy) || 1) < -0.3) 反転++;
          前.set(c.id, { x: c.x, y: c.y, vx: dx, vy: dy });
        } else 前.set(c.id, { ...p, x: c.x, y: c.y });
      } else 前.set(c.id, { x: c.x, y: c.y });
    }
    for (const c of P) for (const o of E) {
      if (!立つ(c) || !立つ(o)) continue;
      const d = Math.hypot(o.x - c.x, o.y - c.y);
      if (d > 0.5 && d < 最短) 最短 = d;
      /* 触れているとき、前列の組が「戦の線」に並んでいるか。
         線は敵へ向かう軸と直交する。前列の組の、軸に沿った散らばりを見る。 */
      if (c.接敵 === o) {
        const ux = (o.x - c.x) / (d || 1), uy = (o.y - c.y) / (d || 1);
        const 前列 = c.squads.filter((q) => q.men > 0 && q.座席 && !q.reserve
          && q.座席.y <= Math.min(...c.squads.filter((z) => z.men > 0 && z.座席).map((z) => z.座席.y)) + 30);
        if (前列.length >= 3) {
          const 沿 = 前列.map((q) => (q.x - c.x) * ux + (q.y - c.y) * uy);
          const 平 = 沿.reduce((a, v) => a + v, 0) / 沿.length;
          線の散らばり.push(Math.sqrt(沿.reduce((a, v) => a + (v - 平) ** 2, 0) / 沿.length));
        }
      }
    }
    if (!決着 && (!P.some(立つ) || !E.some(立つ))) 決着 = Math.round(k * 0.2);
  }
  入替 = (b.log || []).filter((l) => /前列を入れ替えた/.test(l.text || '')).length;
  return {
    最短: Math.round(最短),
    反転率: 反転 / Math.max(1, 動き) * 100,
    決着,
    線: 線の散らばり.length ? 線の散らばり.reduce((a, v) => a + v, 0) / 線の散らばり.length : null,
    入替,
  };
}

const 結 = [111, 222, 333, 444].map((s) => ({ 種: s, ...当てる(s) }));

console.log('■ 一、塊はすり抜けない');
const 最短ら = 結.map((r) => r.最短);
確('どの戦でも、隊の中どころが重なり合わない', Math.min(...最短ら) >= 12,
  `最短 ${最短ら.join('・')}歩（直す前は 4・4・4・4歩）`);

console.log('■ 二、前列は戦の線に並ぶ');
const 線ら = 結.map((r) => r.線).filter((v) => v != null);
確('触れているあいだ、前列は線をなす', 線ら.length > 0 && Math.max(...線ら) < 46,
  線ら.length ? `線からの散らばり ${線ら.map((v) => v.toFixed(0)).join('・')}歩` : '触れ合いが起きなかった');

console.log('■ 三、傷ついた前列は入れ替わる');
確('前列の入れ替わりが起きる', 結.reduce((a, r) => a + r.入替, 0) > 0,
  `入れ替え ${結.map((r) => r.入替).join('・')}回`);

console.log('■ 四、戦の長さは変わらない');
const 決ら = 結.map((r) => r.決着).filter((v) => v != null);
確('日没（二十分＝千二百秒）までに決着がつく', 決ら.length >= 3 && Math.max(...決ら) < 280,
  `決着 ${結.map((r) => (r.決着 == null ? '未決' : r.決着 + '秒')).join('・')}（直す前は 111・144・142・100秒）`);
const 反ら = 結.map((r) => r.反転率);
確('隊の前後の揺れが三割を超えない', Math.max(...反ら) < 30,
  `${反ら.map((v) => v.toFixed(1) + '%').join('・')}（直す前は 33.8・24.6・16.9・21.3%）`);

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
