/* 向き直る ─ 兵の姿が向きの連続な関数であること（GDD 8.11）。

   遊ぶ側の申し出は「まだ戦っている最中のプルプルがある」「十六方向を
   もう少し細かくできないか」の二つであった。測ると、この二つは同じ一つの
   不具合であった。

   向きは十六に割っていたが、姿八 の中でそれは西半分を鏡で返して九通りに
   なり、さらに五つの面（横・斜前・前・斜後・後）にしか分かれていなかった。
   十六分割の角そのもの（a16）は計算されていながら一度も使われていない。
   だから「三十二方向にする」のは無駄で、型紙が六十五MBから百三十MBへ
   膨らむだけ、描ける姿は一つも増えない。

   測った震え（野戦三対三・三十分の一秒刻み・槍を合わせてから百三十九秒）

                                      直す前 → 直したあと
     兵ひとりの向きの跳び（毎秒）        1.41 →  （跳ばない。向き直る）
     一コマの振れ　平均                    －ha→  1.27度
     　　　　　　　四十五度超            ―    →  0.00%
     前列の伸びの跳び（二歩超）         0.10% →  0.00%（最大九歩→二.三歩）
     絵そのものの一コマの画素差
       最大／平均（十六通り）        7.5〜31倍 →  1.6〜3.1倍

   跳びの内訳は三つであった。
     一、三十六.七％ … 描く側が刻ごとに「己の足の向き」と「組の向き」を
         選び直していた。向きは両方とも均してあるのに、どちらを使うかの
         切り替えだけが均されていなかった。
     二、面が五つしかないので、一段動くたびに姿が大きく跳んだ。
     三、鏡で返す境（真南・真北）で、持ち手・踏み出す脚・腰の縞が
         左右に入れ替わった。戦列は南北に向き合うことが多いので、兵は
         まさにこの角に長く居る。

   直し方は、割るのをやめて角で描くこと。横から見た型と正対の型の置き所を
   見えている度合いで混ぜ、鏡の境では左右対称になるようにした。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 済 = new Set();
const 確一度 = (名, 可) => { if (済.has(名)) return; 済.add(名); 確(名, 可); };
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let _s = 20261011 >>> 0;
Math.random = function () { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* 画布の代わり。姿八 は数を決めてから筆に渡すので、筆は受け流すだけでよい。 */
const 空筆 = new Proxy({}, { get: (t, p) => {
  if (p === 'measureText') return () => ({ width: 10 });
  if (p === 'createLinearGradient') return () => ({ addColorStop: () => {} });
  if (p === 'globalAlpha') return 1;
  return () => ({ addColorStop: () => {} });
}, set: () => true });
const 具 = { 濃: '#2F5D8C', 中: '#4A78A8', 帯: '#8FB4D8' };

console.log('── 一　姿は向きの連続な関数である（段が無い）');
{
  /* 向きを細かく進め、姿を決める数の飛びを見る。段があれば、そこだけ跳ねる。
     刻みは実測の一コマの振れ（一.二七度）に合わせる。

     見るのは鏡の内だけ（目四から十二＝振り九十度から－九十度）にする。
     鏡をまたぐと左右の脚の呼び名が入れ替わるので、節ごとに引き算しても
     意味を成さない。鏡の境は二で別に検める。 */
  const 刻 = 1.27 / 22.5;
  for (const 型 of ['yari', 'yumi', 'teppo', 'kiba']) {
    for (const fr of [0, 1, 3, 5]) {
      const 読む = (d) => {
        H.姿八(空筆, 0, 0, 6, d, fr, 型, 具, 0.3);
        const b = H.姿の骨(), m = b.鏡;        // 鏡の内の数は、画面の向きへ直して並べる
        return [b.ψ, b.横重, b.対重, b.幅増, b.奥袖, b.前傾 * m, b.hx * m, b.hy,
          b.脚[0] * m, b.脚[1] * m, b.脚[2], b.脚[3] * m, b.脚[4] * m, b.脚[5],
          b.得[0] * m, b.得[1], b.得[2] * m, b.得[3], b.得[4] * m, b.得[5]];
      };
      let 和 = 0, 数 = 0, 最大 = 0, 最大所 = 0;
      let 前 = 読む(4 + 0.002);
      for (let d = 4 + 0.002 + 刻; d <= 12 - 0.002; d += 刻) {
        const 今 = 読む(d);
        let 差 = 0;
        for (let i = 0; i < 今.length; i++) 差 += Math.abs(今[i] - 前[i]);
        和 += 差; 数++;
        if (差 > 最大) { 最大 = 差; 最大所 = b16(d); }
        前 = 今;
      }
      const 平 = 和 / 数;
      確(`${型} 拍${fr} に段が無い`, 最大 < 平 * 6,
        `一コマの飛び 平均 ${平.toFixed(2)}・最大 ${最大.toFixed(2)}（振り ${最大所.toFixed(1)}度）＝ ${(最大 / 平).toFixed(1)}倍`);
    }
  }
}
function b16(d) {
  const d16 = ((d % 16) + 16) % 16, 反 = d16 > 4 && d16 < 12;
  const 右 = 反 ? (8 - d16 + 16) % 16 : d16;
  return (右 <= 8 ? 右 : 右 - 16) * 22.5;
}

console.log('\n── 二　鏡の境（真南・真北）で姿が裏返らない');
{
  /* 西向きは東向きの鏡で描く。その境は真南と真北――戦列が向き合う角そのもの
     である。ここで兵が左右に裏返っていた（持ち手・踏み出す脚・腰の縞）。

     真向きの兵は左右対称でなければならない。対称であれば、鏡で返しても
     画面の絵は動かない。ただし「手前の脚」と「奥の脚」の呼び名は入れ替わる
     ので、節ごとに引き算しても意味を成さない。画面に現れる点の集まりとして、
     並べ直してから比べる。 */
  const 点ら = (d, fr, 型) => {
    H.姿八(空筆, 0, 0, 6, d, fr, 型, 具, 0.3);
    const b = H.姿の骨(), m = b.鏡;
    /* 端数の塵で並び順が変わらないよう、千分の一に丸めてから並べる */
    const 丸 = (v) => Math.round(v * 1000) / 1000 + 0;
    const p = [[丸(b.hx * m), 丸(b.hy)]];
    for (let i = 0; i < 6; i += 3) {
      p.push([丸(b.脚[i] * m), 丸(b.脚[i + 2])], [丸(b.脚[i + 1] * m), 丸(b.脚[i + 2])]);
    }
    for (let i = 0; i < 6; i += 2) p.push([丸(b.得[i] * m), 丸(b.得[i + 1])]);
    p.sort((x, y) => (x[0] - y[0]) || (x[1] - y[1]));
    return { p, 他: [b.幅増, b.奥袖, Math.abs(b.前傾)] };
  };
  for (const 型 of ['yari', 'yumi', 'teppo', 'kiba']) {
    for (const fr of [0, 3]) {
      for (const [名, 境] of [['真南', 4], ['真北', 12]]) {
        const a = 点ら(境 - 0.0001, fr, 型), c = 点ら(境 + 0.0001, fr, 型);
        let 差 = 0;
        for (let i = 0; i < a.p.length; i++) 差 += Math.abs(a.p[i][0] - c.p[i][0]) + Math.abs(a.p[i][1] - c.p[i][1]);
        for (let i = 0; i < a.他.length; i++) 差 += Math.abs(a.他[i] - c.他[i]);
        確(`${型} 拍${fr} は${名}をまたいでも裏返らない`, 差 < 0.6, `境の両側の違い ${差.toFixed(3)}`);
      }
    }
  }
}

console.log('\n── 三　兵は跳ばずに向き直る');
{
  const 将 = (i, nm) => ({ id: `g${i}`, name: nm, lead: 62, valor: 60, wit: 55, gov: 55, retinue: 300, retTrain: 72, unity: 62 });
  H.setFieldSeed('p', 'u'); H.setFieldKind('街道'); H.setBattleMap(null);
  const W = H.FIELD.w, Hh = H.FIELD.h; const P = [], E = [];
  for (let i = 0; i < 3; i++) {
    P.push(H.makeCorps('P', 将(i, `味${i}`), 0, 1500, 78, 78, W / 2 + (i - 1) * 260, Hh * 0.58, -Math.PI / 2, '#2F5D8C'));
    E.push(H.makeCorps('E', 将(10 + i, `敵${i}`), 0, 1500, 78, 78, W / 2 + (i - 1) * 260, Hh * 0.42, Math.PI / 2, '#B0483C'));
  }
  const b = H.createBattle(P, E, 'P');
  b.mode = 'field'; b.dusk = 99999; b.phase = 'fight'; b.face = 'S'; b.myFar = false;
  for (const c of [...P, ...E]) { H.placeSquads(c, true); c.auto = false; }
  for (let i = 0; i < 3; i++) {
    H.issueOrder(b, P[i], { order: '接戦', tx: E[i].x, ty: E[i].y });
    H.issueOrder(b, E[i], { order: '接戦', tx: P[i].x, ty: P[i].y });
  }
  const dt = 1 / 30, 見 = { x0: -9999, y0: -9999, x1: 99999, y1: 99999 };
  const 前向 = new Map(), 前伸 = new Map();
  let 延 = 0, 和 = 0, 大跳び = 0, 伸延 = 0, 伸跳び = 0, 伸最大 = 0;
  let 噛み始め = null;
  for (let k = 0; k < 1800; k++) {
    H.stepBattle(b, dt); if (k % 4 === 0) H.battleAI(b);
    H.新絵状態を進める(b, b.t, 見);
    /* 盤の隊をすべて見る（b.corps）。立てた八隊だけを見ていると、分遣に
       出ているあいだの組を見失う。見失ったぶんの動きが、戻ってきた刻に
       「一息の跳び」として現れた――伸びは滑らかに動いていたのに、二十五万
       九千の刻に二度、八.六歩の跳びがあると読めた。測る側の見落としである。 */
    const qs = b.corps.flatMap((c) => (c.dead || c.destroyed) ? []
      : c.squads.filter((q) => q.men > 0).map((q) => [c, q]));
    if (qs.some(([, q]) => q.engaged) && 噛み始め == null) 噛み始め = k;
    if (噛み始め == null) continue;
    for (const [c, q] of qs) {
      const s = H.組の見た目(q); if (!s || !s.初) continue;
      確一度('見た目に描く向きがある', !!s.描);
      確一度('見た目に前列の伸びがある', s.伸 != null);
      if (!s.描) continue;
      { const o = 前伸.get(q);
        if (o != null) { const d = Math.abs(s.伸 - o); 伸延++; if (d > 2) 伸跳び++; if (d > 伸最大) 伸最大 = d; }
        前伸.set(q, s.伸); }
      for (let i = 0; i < Math.min(50, Math.round(q.men)); i++) {
        if (!s.生[i]) continue;
        const key = `${c.id}:${q.id || ''}#${i}`, o = 前向.get(key);
        if (o != null) {
          let d = s.描[i] - o;
          while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
          const 度 = Math.abs(d) * 180 / Math.PI;
          延++; 和 += 度; if (度 > 45) 大跳び++;
        }
        前向.set(key, s.描[i]);
      }
    }
  }
  確('向きの振れは一コマ数度に収まる', 和 / 延 < 4, `平均 ${(和 / 延).toFixed(2)} 度`);
  確('四十五度を超える跳びはまず出ない', 大跳び / 延 < 0.0005,
    `${大跳び} / ${延}（${(大跳び / 延 * 100).toFixed(3)}%）`);
  確('前列の伸びは跳ばない', 伸跳び / Math.max(1, 伸延) < 0.001 && 伸最大 < 3,
    `二歩超の跳び ${伸跳び} / ${伸延}・最大 ${伸最大.toFixed(1)} 歩`);
}
console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
