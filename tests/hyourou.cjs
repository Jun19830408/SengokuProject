/* 兵糧と集結（GDD 7.3 / 7.4）。

   遊ぶ側の申し出は二つであった。

     一、援軍が送った城ごとに敵と戦うため、各個撃破されてしまう。
         その軍だけで戦うか、集結を待つかを選択できるようにしたい
     二、連戦するにあたって兵糧が二、三ヶ月でなくなる。在陣させる日数に応じて
         軍が持てる兵糧の数を変えたい。持っていきすぎれば家の運営が傾くようにしたい

   まず「兵糧を持ち出すと家に何が起きるか」を測った。何も起きていなかった。
   城の蔵は月の食い扶持の四十五倍から五十六倍あり、月の実入りが出を大きく上回る
   （那古野城で入り三,五二六石・出四二九石）。蔵を空にして出しても一年で満ち、
   兵も民心も練度も動かない。兵糧の持ち出しは、家にとって痛くも痒くもなかった。

   そこで二つ変えた。米は城の蔵から、金は家の蔵から――運び賃を本隊にも掛け、
   陣中の月数に比例させる。城は留守の蓄え（地の兵が半年食うぶん）を割って兵糧を
   積まない。縛るのは蔵ではなく金と留守である。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { initState, advanceMonth, newRoster, findPath, marchMonthsOf,
  遠征の兵糧, 陣中の月数, 集結を待つか, 留守の蓄え, 着いた味方を束ねる } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 0x2D41;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

console.log('── 一　兵糧は陣中の月数で決まる');
{
  確('陣中一月は、元の決め打ち（道中＋二月）と同じ',
    遠征の兵糧(5000, 3, 1) === Math.round(5000 * 0.09 * (3 + 2)),
    `${遠征の兵糧(5000, 3, 1)}石`);
  確('陣中を延ばせば兵糧も増える',
    遠征の兵糧(5000, 3, 6) > 遠征の兵糧(5000, 3, 1)
    && 遠征の兵糧(5000, 3, 12) > 遠征の兵糧(5000, 3, 6),
    [1, 3, 6, 12].map((m) => `${m}ヶ月=${遠征の兵糧(5000, 3, m)}石`).join('／'));
  確('道が遠ければ、同じ陣中でも多く積む',
    遠征の兵糧(5000, 6, 3) > 遠征の兵糧(5000, 1, 3),
    `道中1ヶ月=${遠征の兵糧(5000, 1, 3)}石／6ヶ月=${遠征の兵糧(5000, 6, 3)}石`);
  /* 数え直して、選んだ月数どおり囲みを続けられること */
  for (const m of [1, 3, 6, 12]) {
    const 糧 = 遠征の兵糧(5000, 3, m);
    確(`陣中${m}ヶ月ぶんで、囲みを${m}ヶ月続けられる`, 陣中の月数(5000, 糧, 3) === m,
      `${糧}石 → ${陣中の月数(5000, 糧, 3)}ヶ月`);
  }
}

console.log('\n── 二　留守の蓄えは割らない');
{
  const s = initState('oda');
  const c = s.castles.find((x) => x.id === s.factions.oda.本拠);
  const 蓄 = 留守の蓄え(c);
  確('留守の蓄えは地の兵が半年食うぶん', 蓄 === Math.round((c.local || 0) * 0.08 * 6),
    `${蓄}石（地の兵${c.local}）`);
  確('積めるのは蔵から蓄えを引いたぶん', Math.max(0, c.food - 蓄) < c.food,
    `蔵${Math.round(c.food)}石 → 積める${Math.max(0, Math.round(c.food - 蓄))}石`);
}

console.log('\n── 三　集結を待つか');
{
  const s = initState('oda');
  const 的 = s.castles.find((x) => x.faction === 'oda');
  /* 道のりは実の街道で測る（marchMonthsOf）。作り物の節では零になってしまう。 */
  const 遠城 = s.castles.filter((x) => x.id !== 的.id)
    .map((x) => ({ x, p: findPath(x.id, 的.id) })).filter((q) => q.p)
    .sort((a, b) => b.p.length - a.p.length)[0];
  const 近城 = s.castles.filter((x) => x.id !== 的.id)
    .map((x) => ({ x, p: findPath(x.id, 的.id) })).filter((q) => q.p && q.p.length > 1)
    .sort((a, b) => a.p.length - b.p.length)[0];
  const 遅 = { id: 'A', faction: 'oda', 待ち合わせ: 的.id, path: 遠城.p, men: 1000 };
  const 早 = { id: 'B', faction: 'oda', 待ち合わせ: 的.id, path: 近城.p, men: 1000 };
  s.armies = [遅, 早];
  確('道のりに差がある', marchMonthsOf(遅.path) > marchMonthsOf(早.path),
    `${遠城.x.name} ${marchMonthsOf(遅.path)}ヶ月／${近城.x.name} ${marchMonthsOf(早.path)}ヶ月`);
  確('早く着く軍は待つ', 集結を待つか(s, 早) === true);
  確('いちばん遅い軍は待たない', 集結を待つか(s, 遅) === false);
  確('印の無い軍は待たない', 集結を待つか(s, { ...早, 待ち合わせ: null }) === false);
  確('待つ相手がいなければ待たない',
    集結を待つか({ ...s, armies: [早] }, 早) === false);
  確('半年待ったら、もう待たない',
    集結を待つか(s, { ...早, 待ち月: 6 }) === false);
  /* 救う城が揃うより先に落ちると見れば、待たずに進む */
  的.food = 600; 的.min = 100;                        // 兵糧があと一月
  s.sieges = [{ castleId: 的.id, armyId: 'S', months: 1 }];
  確('城が保たぬと見れば待たない', 集結を待つか(s, 早) === false,
    `${的.name}は兵糧あと${H.城の保ち(s, 的).月}ヶ月`);
}

console.log('\n── 四　集結を待てば、同じ月に着く');
{
  const 試 = (待つ) => {
    種 = 0x2D41;
    let s = initState('oda');
    const 的 = s.castles.find((c) => c.faction === 'oda');
    const 出す城 = s.castles.filter((c) => c.faction === 'oda' && c.id !== 的.id).slice(0, 2);
    const 遠 = s.castles.filter((c) => c.faction !== 'oda')
      .map((c) => ({ c, p: findPath(c.id, 的.id) })).filter((x) => x.p)
      .sort((a, b) => b.p.length - a.p.length)[0];
    if (遠) { 遠.c.faction = 'oda'; 出す城.push(遠.c); }
    const 敵城 = s.castles.find((c) => c.faction !== 'oda');
    s.armies.push({ id: 'S', faction: 敵城.faction, from: 敵城.id, gens: [], local: 6000,
      localTrain: 70, rost: newRoster(6000, 'arm-S'), men: 6000, at: 的.id, path: [的.id],
      prog: 0, food: 900000, target: 的.id, sieging: true });
    s.sieges = [{ castleId: 的.id, armyId: 'S', months: 0, decided: null, relief: '—' }];
    的.food = 900000; 的.min = 100;                   // 落ちぬようにして、着く月だけを測る
    const ら = [];
    出す城.forEach((c, i) => {
      const 道 = findPath(c.id, 的.id);
      const 将 = s.generals.find((x) => x.faction === 'oda' && !x.captive && !x.lord && x.at
        && !ら.some((q) => q.将 === x.id));
      if (将) 将.at = null;
      const 兵 = 1200;
      c.local = Math.max(c.local, 兵 + 500) - 兵;
      s.armies.push({ id: 'R' + i, faction: 'oda', from: c.id, gens: 将 ? [将.id] : [],
        local: 兵, localTrain: 70, rost: newRoster(兵, 'arm-R' + i), men: 兵,
        at: 道[0], path: 道, prog: 0, food: 999999, target: 的.id, relief: 的.id,
        ...(待つ ? { 待ち合わせ: 的.id, 待ち月: 0 } : {}) });
      ら.push({ id: 'R' + i, 城: c.name, 道: 道.length - 1, 将: 将 && 将.id });
    });
    const 着 = {};
    for (let m = 1; m <= 24; m++) {
      s = advanceMonth(s, s);
      for (const q of ら) {
        if (着[q.id]) continue;
        const a = (s.armies || []).find((x) => x.id === q.id);
        if (!a) { 着[q.id] = '消'; continue; }
        if ((a.path || []).length <= 1 && a.at === 的.id) 着[q.id] = m;
      }
      s.pendingArrivals = [];
      if (Object.keys(着).length === ら.length) break;
    }
    return { ら, 着, 月ら: ら.map((q) => 着[q.id]).filter((x) => typeof x === 'number') };
  };
  const 無 = 試(false), 有 = 試(true);
  確('待たなければ、着く月がばらける', new Set(無.月ら).size > 1,
    無.ら.map((q) => `${q.城}→${無.着[q.id]}ヶ月目`).join('／'));
  確('待てば、みな同じ月に着く', 有.月ら.length > 1 && new Set(有.月ら).size === 1,
    有.ら.map((q) => `${q.城}→${有.着[q.id]}ヶ月目`).join('／'));
  確('待てば、いちばん遅い軍に合わせる',
    Math.max(...有.月ら) === Math.max(...無.月ら),
    `待たず ${Math.max(...無.月ら)}ヶ月／待って ${Math.max(...有.月ら)}ヶ月`);
}

console.log('\n── 五　同じ月に着いた援軍は、一手に束ねられる');
{
  const s = initState('oda');
  const 的 = s.castles.find((c) => c.faction === 'oda');
  const 将ら = s.generals.filter((x) => x.faction === 'oda' && !x.captive && !x.lord).slice(0, 2);
  for (const g2 of 将ら) g2.at = null;
  const 作 = (i, 将) => ({ id: 'R' + i, faction: 'oda', from: 的.id, gens: [将.id],
    local: 1200, localTrain: 70, rost: newRoster(1200, 'arm-R' + i), men: 1200 + 将.retinue,
    at: 的.id, path: [的.id], prog: 0, food: 9000, target: 的.id, relief: 的.id, 助勢: true });
  const a1 = 作(1, 将ら[0]), a2 = 作(2, 将ら[1]);
  s.armies.push(a1, a2);
  const 前 = a1.men;
  const 束 = 着いた味方を束ねる(s, a1, 的);
  確('同じ城の前に着いた味方は束ねられる', 束.length === 1,
    `${束.length}手を束ねた`);
  確('兵も将も一手になる', a1.men === 前 + a2.men && a1.gens.length === 2,
    `${前}人 → ${a1.men}人・将${a1.gens.length}名`);
  確('束ねられた軍は盤から消える', !s.armies.some((x) => x.id === 'R2'));
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
