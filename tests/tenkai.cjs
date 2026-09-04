/* 転回――その場で向きを変え、陣形ごとその方角へ向き直る（GDD 8.3）。

   二つ、噛み合っていた。

   一、下知が届いていなかった。
       転回だけは issueOrder を通さず、隊に直に書き込んでいた。issueOrder には
       「手ずから命じた隊は委任を離れる」の一行があるので、通さなければ隊は
       委任のまま残る。采配は〇.六秒ごとに諸隊へ下知するから、転回はその場で
       「移動」などに書き換えられ、向きは変わらなかった。

   二、駒だけが回り、陣形は回らなかった。
       組の持ち場は「陣形と組数が変わらなければ組み直さない」としていたので、
       隊が向きを変えても座席は元の向きのまま凍りついていた。

   ただし、歩くたびに陣形まで回してはならない。隊の向きは進むほどに揺れるので、
   それに付き合わせると退くときも城へ寄せるときも隊が回り続け、戦そのものが
   変わってしまう（試しに繋いだところ、退くべき十二隊が一つも退かなくなった）。
   陣の向きは、陣形を組み直すときと、転回を命じたときだけ動かす。

     実測（上を向いた隊に「東を向け」と命じて十秒）
       直す前　　　向き 257度 → 228度（東を向かず）・order 移動・陣形の主軸 動かず
       直したあと　向き 257度 →   0度・order 待機・陣形の主軸 0度 → 88度（直角に回る） */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { makeCorps, placeSquads, createBattle, stepBattle, issueOrder, 転回させる, layoutField, setFieldSeed, FIELD } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 0x51ee;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = 種; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

setFieldSeed('a', 'b'); layoutField(6000, 4);
const 将 = (id, 名) => ({ id, name: 名, lead: 70, valor: 60, wit: 55, gov: 55, retinue: 600, retTrain: 70, unity: 65 });
const 組む = (side, id, 名, x, y, f) => makeCorps(side, 将(id, 名), 600, 400, 70, 70, x, y, f, '#345');

// 組の広がりの主軸。陣形がどちらへ伸びているかを見る
const 主軸 = (c) => {
  const qs = c.squads.filter((q) => q.men > 0);
  const mx = qs.reduce((a, q) => a + q.x, 0) / qs.length, my = qs.reduce((a, q) => a + q.y, 0) / qs.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const q of qs) { const dx = q.x - mx, dy = q.y - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  return 0.5 * Math.atan2(2 * sxy, sxx - syy);
};
const 度 = (r) => Math.round(((r * 180 / Math.PI) % 360 + 360) % 360);
// 二つの角の隔たり（〇〜九十度。陣形は前後の別を持たぬので百八十度は同じ向きと見る）
const 隔たり = (a, b2) => {
  let d = Math.abs(((a - b2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 180 / Math.PI;
  return d > 90 ? 180 - d : d;
};

const 場 = () => {
  const P = [組む('P', 'p1', '味方甲', FIELD.w / 2, FIELD.h * 0.72, -Math.PI / 2)];
  const E = [組む('E', 'e1', '敵甲', FIELD.w / 2, FIELD.h * 0.22, Math.PI / 2)];
  for (const c of [...P, ...E]) placeSquads(c, true);
  const b = createBattle(P, E, 'P');
  b.phase = 'fight';
  return b;
};

console.log('── 一　転回を命じれば、その方角へ向き直る');
{
  const b = 場();
  const c = b.corps.find((x) => x.id === 'p1');
  for (let i = 0; i < 5; i++) stepBattle(b, 1 / 30);
  const 前向 = c.facing, 前軸 = 主軸(c);
  確('はじめは采配に委ねている', c.auto === true);
  転回させる(b, c, c.x + 300, c.y);                                      // 東をタップした形
  確('下知を受ければ委任を離れる（采配に上書きされない）', c.auto === false);
  for (let i = 0; i < 300; i++) stepBattle(b, 1 / 30);                    // 十秒
  const 後向 = c.facing, 後軸 = 主軸(c);
  確('命じた方角を向く', 隔たり(後向, 0) < 6, `${度(前向)}度 → ${度(後向)}度（命は0度）`);
  確('采配に「移動」などへ書き換えられない', c.order === '待機' || c.order === '転回', `order:${c.order}`);
  /* 陣形は向きに直交して伸びる。東を向いたなら南北に伸びる。 */
  確('陣形もその方角へ向き直る（主軸が向きに直交する）',
    隔たり(後軸, 後向 + Math.PI / 2) < 22,
    `主軸 ${度(前軸)}度 → ${度(後軸)}度（向き ${度(後向)}度に直交していれば九十度差）`);
  確('前と比べて陣形が回っている', 隔たり(後軸, 前軸) > 45,
    `${度(前軸)}度 → ${度(後軸)}度（隔たり ${Math.round(隔たり(後軸, 前軸))}度）`);
}

console.log('\n── 二　ただ歩くだけでは、陣形は回らない');
{
  /* 隊の向きは進むほどに揺れる。それに陣形まで付き合わせると、退くときも
     城へ寄せるときも隊が回り続け、戦そのものが変わる。 */
  const b = 場();
  const c = b.corps.find((x) => x.id === 'p1');
  for (let i = 0; i < 5; i++) stepBattle(b, 1 / 30);
  const 前軸 = 主軸(c), 前向 = c.facing;
  issueOrder(b, c, { order: '移動', tx: c.x + 420, ty: c.y - 60 });        // 斜め前へ歩かせる
  for (let i = 0; i < 240; i++) stepBattle(b, 1 / 30);
  確('歩けば隊の向きは変わる', 隔たり(c.facing, 前向) > 20,
    `向き ${度(前向)}度 → ${度(c.facing)}度`);
  確('それでも陣形の向きは動かない', 隔たり(主軸(c), 前軸) < 20,
    `主軸 ${度(前軸)}度 → ${度(主軸(c))}度（隔たり ${Math.round(隔たり(主軸(c), 前軸))}度）`);
}

console.log('\n── 三　陣形を組み替えれば、そのときの向きで組み直す');
{
  const b = 場();
  const c = b.corps.find((x) => x.id === 'p1');
  for (let i = 0; i < 5; i++) stepBattle(b, 1 / 30);
  転回させる(b, c, c.x + 300, c.y);
  for (let i = 0; i < 300; i++) stepBattle(b, 1 / 30);
  const 向 = c.facing;
  issueOrder(b, c, { order: '守備', formation: '方陣', tx: c.x, ty: c.y });
  for (let i = 0; i < 120; i++) stepBattle(b, 1 / 30);
  確('組み替えても、向いた方角は保たれる', 隔たり(c.facing, 向) < 12,
    `${度(向)}度 → ${度(c.facing)}度`);
  確('陣の向きも隊の向きに揃う', c.陣向き != null && 隔たり(c.陣向き, c.facing) < 12,
    c.陣向き == null ? '陣向きが無い' : `陣向き ${度(c.陣向き)}度／隊の向き ${度(c.facing)}度`);
}

console.log(`\n════ 転回：咎 ${咎.length} 件`);
console.log('エラー:', 咎.length ? 咎.join(' | ') : 'なし');
process.exit(咎.length ? 1 : 0);
