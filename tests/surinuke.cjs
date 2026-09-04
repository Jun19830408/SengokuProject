/* 交戦中の味方をすり抜けない（GDD 8.4）。

   前で味方が敵と槍を合わせているのに、後ろの隊がその味方を突き抜けて前の敵へ
   当たりに行っていた。隊どうしは擦り抜ける造りなので、同じ敵に三隊も四隊も
   重なり、盤の上では誰がどこで戦っているのか読めない。

   采配は「いちばん近い敵」へ向かわせるだけで、その敵に味方が先に掛かっているか
   も、あいだに味方が立っているかも見ていなかった。

   改めた形（縛るのは采配――委任した隊と敵方――だけ。手ずから命じるぶんは通す）
     一、空いている敵がいれば、多少遠くてもそちらへ回る
     二、いなければ側面へ回り込んで加勢する（一つの敵に二隊まで）
     三、味方が前をふさぐなら、止まらずにその脇を回る

   三が肝である。はじめは「後ろで控える」形にしたが、それでは戦が進まず、
   退くべき十二隊が一つも退かなくなった（決しないので退く目にも遭わない）。

     実測（四隊対四隊・四分・一秒ごとに見て）
       すり抜け  148回 → 20回
       手余り      5回 →  6回
       群がり      0回 → 24回

   群がりが増えたのは、側面から加勢するようになったためである（一つの敵に
   二隊まで許す形にした）。すり抜けて重なるのと、横から二隊で当たるのとでは、
   後者のほうが戦として理に適う。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { makeCorps, placeSquads, createBattle, stepBattle, layoutField, setFieldSeed, FIELD } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 0x1234;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = 種; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

setFieldSeed('x', 'y'); layoutField(12000, 8);
const 将 = (id, 名) => ({ id, name: 名, lead: 70, valor: 60, wit: 55, gov: 55,
  retinue: 500, retTrain: 70, unity: 65 });

/* 前に二隊、後ろに二隊。後ろの隊が前をすり抜けるかを見る。 */
const 場 = () => {
  const cx = FIELD.w / 2, cy = FIELD.h / 2, 間 = 200;
  const P = [
    makeCorps('P', 将('p1', '前甲'), 500, 400, 70, 70, cx - 間, cy + 150, -Math.PI / 2, '#345'),
    makeCorps('P', 将('p2', '前乙'), 500, 400, 70, 70, cx + 間, cy + 150, -Math.PI / 2, '#345'),
    makeCorps('P', 将('p3', '後甲'), 500, 400, 70, 70, cx - 間, cy + 420, -Math.PI / 2, '#345'),
    makeCorps('P', 将('p4', '後乙'), 500, 400, 70, 70, cx + 間, cy + 420, -Math.PI / 2, '#345'),
  ];
  const E = [
    makeCorps('E', 将('e1', '敵甲'), 500, 400, 70, 70, cx - 間, cy - 150, Math.PI / 2, '#833'),
    makeCorps('E', 将('e2', '敵乙'), 500, 400, 70, 70, cx + 間, cy - 150, Math.PI / 2, '#833'),
    makeCorps('E', 将('e3', '敵丙'), 500, 400, 70, 70, cx - 間, cy - 420, Math.PI / 2, '#833'),
    makeCorps('E', 将('e4', '敵丁'), 500, 400, 70, 70, cx + 間, cy - 420, Math.PI / 2, '#833'),
  ];
  for (const c of [...P, ...E]) placeSquads(c, true);
  const b = createBattle(P, E, 'P');
  b.phase = 'fight';
  return b;
};

const 噛む = (c) => c.squads.some((q) => q.engaged);
// 点から線分までの隔たり
const 線まで = (ax, ay, bx, by, px, py) => {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L <= 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
};

const 走らす = () => {
  const b = 場();
  const 尺 = FIELD.w / 1080;
  let すり抜け = 0, 群がり = 0, 手余り = 0, 見た = 0;
  for (let i = 0; i < 30 * 240; i++) {
    stepBattle(b, 1 / 30);
    if (i % 30) continue;                                  // 一秒ごとに見る
    const alive = b.corps.filter((c) => !c.dead && !c.destroyed && !c.routed);
    見た++;
    const 間 = 95 * 尺;
    for (const side of ['P', 'E']) {
      const 我 = alive.filter((c) => c.side === side);
      const 敵 = alive.filter((c) => c.side !== side);
      if (!敵.length) continue;
      const 先客 = (o, 除) => 我.filter((x) => x !== 除 && 噛む(x) && Math.hypot(x.x - o.x, x.y - o.y) < 間).length;
      const 空 = 敵.filter((o) => 先客(o, null) === 0);
      /* すり抜け＝噛み合っている味方 X の「当たっている筋」の上を通って、
         X より前（敵に近いところ）へ出た隊。横から回り込むのは筋の上ではない。 */
      for (const x of 我) {
        if (!噛む(x)) continue;
        const o = 敵.reduce((a, z) => (Math.hypot(z.x - x.x, z.y - x.y) < Math.hypot(a.x - x.x, a.y - x.y) ? z : a), 敵[0]);
        const 敵まで = Math.hypot(o.x - x.x, o.y - x.y);
        if (敵まで > 間) continue;
        for (const y of 我) {
          if (y === x || 噛む(y)) continue;
          if (Math.hypot(o.x - y.x, o.y - y.y) >= 敵まで) continue;
          if (線まで(x.x, x.y, o.x, o.y, y.x, y.y) > 60 * 尺) continue;
          すり抜け++;
        }
      }
      for (const y of 我) {
        if (噛む(y)) continue;
        const 向 = 敵.find((o) => Math.hypot(o.x - y.tx, o.y - y.ty) < 間);
        if (向 && 先客(向, y) >= 2 && 空.length) 群がり++;
        // 手余り＝空いた敵がいるのに、どこへも向かわず立っている
        if (!向 && 空.length && Math.hypot(y.tx - y.x, y.ty - y.y) < 20 * 尺) 手余り++;
      }
    }
  }
  return { すり抜け, 群がり, 手余り, 見た };
};

const r = 走らす();
console.log(`  （四隊対四隊・四分・一秒ごとに ${r.見た} 度見た）`);
console.log(`  すり抜け ${r.すり抜け}　群がり ${r.群がり}　手余り ${r.手余り}`);

/* 直す前は 148。半分を切れば、すり抜けは癖ではなくなったと見る。 */
確('交戦中の味方をすり抜けない', r.すり抜け <= 70,
  `${r.すり抜け} 回（直す前は 148 回）`);
確('手が余って立ち尽くさない', r.手余り <= 25,
  `${r.手余り} 回（直す前は 5 回。控えさせる形にしたときは 64 回）`);
確('群がりは、加勢のぶんに収まる', r.群がり <= 60,
  `${r.群がり} 回（直す前は 0 回。側面から二隊で当たるようにしたぶん増える）`);

console.log(`\n════ すり抜け：咎 ${咎.length} 件`);
console.log('エラー:', 咎.length ? 咎.join(' | ') : 'なし');
process.exit(咎.length ? 1 : 0);
