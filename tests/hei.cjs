/* 兵の絵（GDD 8.11）―― 跳ばずに歩く・矢と弾は射手から的へ・槍は前へ突く。

   遊ぶ側の申し出は、
     「瞬間移動するような兵もあり、この辺の不自然さを解消したい」
     「矢はもっと細いものがいい。あらぬ方向に矢が飛んでいくときもあるので、
       あくまでも弓隊から敵に向かって矢が飛ぶように（鉄砲も）」
     「槍隊は敵が近くにきて攻撃するときはちゃんと槍を前に突き出すように」
     「通常よりも遅いスピードでどのように見えているか（リアルに見えているか）が重要」
   であった。

   測った跳び（野戦三対三・三十分の一秒刻み・百二十秒）

                                      直す前 → 直したあと
     兵ひとりの一刻の動き　上限の二倍超    978 →     2
     　　　　　　　　　　　いちばん大きい  153.7歩 → 上限の二.三五倍
     人の現れ（絵の兵が湧いて出る）      4642 →    46

   跳びのもとは三つであった。
     一、組が盤の上で飛ぶ（分遣・押し出し）と、絵の兵を組ごと同じだけ平行に移していた。
         騎馬の分遣は五十〜六十歩を一刻で跳んだ。いまは兵が歩いて（駆けて）追う。
     二、槍の線（噛み合いの前縁）より前に出た兵を、一刻で線の後ろへ戻していた。
         噛み合った刹那に二十五〜四十歩跳ぶ兵がいた。いまは一刻に戻す量を限る。
     三、本陣衆へ貸す兵を毎コマ選び直していたので、貸し借りのたびに兵が消えては
         別の所に現れた。いまは貸した兵を覚えておき、足りぬぶんだけ近い者から借りる。
         新しく描く兵は、隣の兵の所から歩き出させる。

   矢があらぬ方向へ飛ぶもとは、draw.js の「矢と鉄砲の火」に書いた三つである
   （山なりを盤の北へ足していた・盤の組の居所から放っていた・太さ〇.五五の棒）。
   ここでは、矢と火の端が射った組の兵と狙った組の兵に重なること、山なりの向きが
   どの眺めでも画面の上であることを見る。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let _s = 20261031 >>> 0;
Math.random = function () { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* 画布の代わり。姿八 は数を決めてから筆に渡すので、筆は受け流すだけでよい。 */
const 空筆 = new Proxy({}, { get: (t, p) => {
  if (p === 'measureText') return () => ({ width: 10 });
  if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop: () => {} });
  if (p === 'globalAlpha') return 1;
  return () => ({ addColorStop: () => {} });
}, set: () => true });
const 具 = { 濃: '#2F5D8C', 中: '#4A78A8', 帯: '#8FB4D8' };
const 角差 = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return Math.abs(d); };

/* ---- 野戦三対三を回し、跳び・矢・槍を同じ戦で量る ---- */
const 将 = (i, nm) => ({ id: `g${i}`, name: nm, lead: 62, valor: 60, wit: 55, gov: 55, retinue: 300, retTrain: 72, unity: 62 });
H.setFieldSeed('p', 'u'); H.setFieldKind('街道'); H.setBattleMap(null);
const W = H.FIELD.w, Hh = H.FIELD.h; const P = [], E = [];
for (let i = 0; i < 3; i++) {
  P.push(H.makeCorps('P', 将(i, `味${i}`), 0, 1500 + i * 300, 78, 78, W / 2 + (i - 1) * 260, Hh * 0.58, -Math.PI / 2, '#2F5D8C'));
  E.push(H.makeCorps('E', 将(10 + i, `敵${i}`), 0, 1800 + i * 200, 78, 78, W / 2 + (i - 1) * 260, Hh * 0.42, Math.PI / 2, '#B0483C'));
}
const b = H.createBattle(P, E, 'P');
b.mode = 'field'; b.dusk = 99999; b.phase = 'fight'; b.face = 'S'; b.myFar = false;
for (const c of [...P, ...E]) { H.placeSquads(c, true); c.auto = true; }
const 尺 = H.fieldScale();
const dt = 1 / 30, 見 = { x0: -9999, y0: -9999, x1: 99999, y1: 99999 };

const 前 = new Map(), 前数 = new Map();
let 延 = 0, 超 = 0, 倍超 = 0, 最大 = 0, 現れ = 0;
const 見た跡 = new WeakSet();
const 射 = { 矢: 0, 弾: 0, 印なし: 0, 盤に漏れ: 0, 端: 0, 端の外れ: 0, 的の端: 0, 的の外れ: 0, 尽きた的: 0, 向きの外れ: 0, 前列の外: 0 };
const 槍 = { 見: 0, 向く: 0, 構見: 0, 構向く: 0, 構の外: 0 };
const 兵の居所 = (q) => {
  const s = H.組の見た目(q); if (!s || !s.初) return null;
  const 数 = Math.max(0, Math.min(50, Math.round(q.men)) - (s.借り || 0));
  const p = []; for (let i = 0; i < 数; i++) if (s.生[i]) p.push([s.sx[i], s.sy[i], i]);
  return p;
};
const 近さ = (pt, 群) => { let m = 1e9, i0 = -1; for (const r of 群) { const d = Math.hypot(pt[0] - r[0], pt[1] - r[1]); if (d < m) { m = d; i0 = r[2]; } } return [m, i0]; };

for (let k = 0; k < 120 * 30; k++) {
  H.stepBattle(b, dt); if (k % 4 === 0) H.battleAI(b);
  H.新絵状態を進める(b, b.t, 見);
  if (b.phase === 'over') break;

  /* 一　跳び。前の刻の兵のうち最も近い者からの隔たりを、その兵の駆ける上限で割る */
  for (const c of b.corps) {
    if (c.dead || c.destroyed) continue;
    for (const q of c.squads) {
      const 今 = 兵の居所(q); if (!今) continue;
      const o = 前.get(q);
      if (o && o.length) {
        const 上 = (q.type === 'kiba' ? 185 : 125) * 尺 * dt * 1.05 + 0.3;
        for (const p of 今) {
          const [m] = 近さ(p, o);
          延++; if (m > 上) 超++; if (m > 上 * 2) 倍超++; if (m / 上 > 最大) 最大 = m / 上;
        }
        const n0 = 前数.get(q); if (n0 != null && 今.length > n0) 現れ += 今.length - n0;
      }
      前.set(q, 今); 前数.set(q, 今.length);

      /* 三　槍。噛み合った槍組の前の二列は、立ち止まっていれば相手へ向く。
         噛み合う前に構えた（槍衾）組は、前に来た敵の組へ向く */
      if (q.type === 'yari' && !c.routed) {
        const s = H.組の見た目(q);
        if (s && s.構 && q.foe) {
          let 差 = Math.atan2(q.foe.y - s.dy, q.foe.x - s.dx) - s.向;
          差 -= Math.round(差 / (Math.PI * 2)) * Math.PI * 2;
          if (Math.abs(差) > 1.26) 槍.構の外++;            // 組の前の敵にだけ構える
          for (const [x, y, n] of 今) {
            if (((n / 10) | 0) >= 2 || s.速[n] >= 14 * 尺) continue;
            槍.構見++;
            if (角差(s.描[n], Math.atan2(q.foe.y - y, q.foe.x - x)) < 35 * Math.PI / 180) 槍.構向く++;
          }
        }
        if (s && s.噛 && q.link) {
          for (const [x, y, n] of 今) {
            if (((n / 10) | 0) >= 2 || s.速[n] >= 14 * 尺) continue;
            if (Math.hypot(q.link.x - x, q.link.y - y) < 3) continue;   // 相手の只中に立つ者は向きが定まらない
            槍.見++;
            if (角差(s.描[n], Math.atan2(q.link.y - y, q.link.x - x)) < 35 * Math.PI / 180) 槍.向く++;
          }
        }
      }
    }
  }

  /* 二　矢と弾。放った刻に端を決める（描く側と同じ手で） */
  for (const f of b.fx) {
    if ((f.k !== 'arrow' && f.k !== 'shot') || 見た跡.has(f)) continue;
    見た跡.add(f);
    if (f.k === 'arrow') 射.矢++; else 射.弾++;
    if (!f.射手 || !f.的) { 射.印なし++; continue; }
    if (Object.keys(f).includes('射手') || JSON.stringify(f).includes('射手')) 射.盤に漏れ++;
    const 前列 = f.k === 'shot';
    const e = H.射の端(f, f.k === 'arrow' ? 7 : 3, 前列);
    const 射手 = 兵の居所(f.射手), 的 = 兵の居所(f.的);
    const 組向 = Math.atan2(f.的.y - f.射手.y, f.的.x - f.射手.x);
    for (let n = 0; n < e.O.length; n++) {
      射.端++;
      const [mo, io] = 射手 ? 近さ(e.O[n], 射手) : [1e9, -1];
      if (mo > 1e-6) 射.端の外れ++;
      else if (前列 && io >= 10) 射.前列の外++;
      /* その刻に討ち尽くされた組（生きた兵が残らない）へは、盤の的の所へ落とす */
      if (!的 || !的.length) 射.尽きた的++;
      else { 射.的の端++; const [mt] = 近さ(e.T[n], 的); if (mt > 1e-6) 射.的の外れ++; }
      const d = Math.hypot(e.T[n][0] - e.O[n][0], e.T[n][1] - e.O[n][1]);
      if (d > 12 && 角差(Math.atan2(e.T[n][1] - e.O[n][1], e.T[n][0] - e.O[n][0]), 組向) > Math.PI / 4) 射.向きの外れ++;
    }
  }
}

console.log('── 一　兵は跳ばずに歩く（瞬間移動しない）');
確('一刻の動きは、駆ける上限の二倍をまず超えない', 倍超 / Math.max(1, 延) < 0.0001,
  `${倍超} / ${延}（上限超 ${超}）`);
確('いちばん大きい動きも上限の三倍に収まる', 最大 < 3, `上限の${最大.toFixed(2)}倍`);
確('絵の兵が湧いて出ることはまれ', 現れ < 400, `${現れ}人（直す前は四千六百余り）`);
{ const v = H.盤の見た目(b);
  確('組の据え直し（遠く飛んだ組の兵を置き直す）はまれ', !v || (v.据え直し || 0) < 20, `${v ? v.据え直し || 0 : 0}度`); }

console.log('\n── 二　矢と弾は、射った組の兵から狙った組の兵へ飛ぶ');
確('弓と鉄砲が放つ', 射.矢 > 20 && 射.弾 > 0, `矢 ${射.矢}・弾 ${射.弾}`);
確('どの矢・弾にも射手と的の印がある', 射.印なし === 0, `印なし ${射.印なし}`);
確('印は記録に漏れない（数えない札）', 射.盤に漏れ === 0, `漏れ ${射.盤に漏れ}`);
確('放つ所は射った組の兵の立ち所', 射.端の外れ / Math.max(1, 射.端) < 0.02, `外れ ${射.端の外れ} / ${射.端}`);
確('鉄砲の火は前の列の筒先から', 射.前列の外 === 0, `前の列の外 ${射.前列の外}`);
確('落ちる所は狙った組の兵の立ち所', 射.的の外れ / Math.max(1, 射.的の端) < 0.02,
  `外れ ${射.的の外れ} / ${射.的の端}（討ち尽くされた組へ ${射.尽きた的}）`);
確('飛ぶ向きは射手の組から的の組へ（四十五度の内）', 射.向きの外れ / Math.max(1, 射.端) < 0.05,
  `外れ ${射.向きの外れ} / ${射.端}`);

console.log('\n── 三　槍は前へ突き出す');
確('噛み合った槍組の前の二列は相手へ向く（三十五度の内）', 槍.見 > 200 && 槍.向く / 槍.見 > 0.85,
  `${槍.向く} / ${槍.見}（${(槍.向く / Math.max(1, 槍.見) * 100).toFixed(1)}%）`);
確('槍衾は組の前の敵にだけ構える', 槍.構の外 === 0, `前の外 ${槍.構の外}`);
確('構えた前の二列は前に来た敵の組へ向く（三十五度の内）', 槍.構見 > 200 && 槍.構向く / 槍.構見 > 0.8,
  `${槍.構向く} / ${槍.構見}（${(槍.構向く / Math.max(1, 槍.構見) * 100).toFixed(1)}%）`);
{
  /* 姿の柄。構え（拍三）では水平に前へ、突き（拍五）ではさらに前へ出る。
     東向き（目〇）は画面の右、西向き（目八）は左が前である */
  const 柄 = (dir, fr) => { const 外 = { 柄を記す: true }; H.姿八(空筆, 0, 0, 6, dir, fr, 'yari', 具, 0.3, 0, 外); return 外.槍; };
  for (const [dir, 符, 名] of [[0, 1, '東'], [8, -1, '西']]) {
    const 構 = 柄(dir, 3), 突 = 柄(dir, 5);
    const 長 = Math.hypot(構[2] - 構[0], 構[3] - 構[1]);
    確(`${名}向きの構えは槍を水平に前へ向ける`, 符 * (構[2] - 構[0]) > 長 * 0.9,
      `穂先 ${(符 * (構[2] - 構[0])).toFixed(0)}・長さ ${長.toFixed(0)}`);
    確(`${名}向きの突きは構えより前へ出る`, 符 * (突[2] - 構[2]) > 20, `${(符 * (突[2] - 構[2])).toFixed(0)}`);
  }
  const 立 = 柄(0, 0);
  確('控え（拍〇）は槍を立てる', Math.abs(立[2] - 立[0]) < Math.abs(立[3] - 立[1]) * 0.1);
}

console.log('\n── 四　山なりの向きは、どの眺めでも画面の上');
{
  /* 眺めを回すと、盤の北は画面の上でなくなる。矢の弧・煙の立ち上りは「画面の上」
     （画面の上）へ足す。盤の所を眺めの所へ写す式（視）で、その向きへ一歩進めると
     眺めの縦だけが減ることを確かめる */
  for (let v = 0; v < 4; v++) {
    H.向きを据える(v, W, Hh);
    const u = H.画面の上(), [x0, y0] = H.視(1000, 1000), [x1, y1] = H.視(1000 + u[0], 1000 + u[1]);
    確(`向き${v}：画面の上は眺めの上`, y1 < y0 && Math.abs(x1 - x0) < 1e-9, `横 ${(x1 - x0).toFixed(3)}・縦 ${(y1 - y0).toFixed(3)}`);
  }
  H.向きを据える(0, W, Hh);
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
