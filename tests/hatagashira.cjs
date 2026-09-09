/* 旗頭に方面を任せる（GDD 6.4）。

   柴田の北国、明智の丹波、秀吉の中国――信長が方面軍を置いたのは、そこまで
   一々下知していられなかったからである。内政だけでなく、戦と調略も任せねば、
   方面を預ける意味が薄い。

   ただし戦は大名の許しを要る。臣従した大名と同じ形である。臣従は他家であるから
   その家の外交が破れるのを恐れて縛るが、旗頭は家臣であるから縛る理由が違う――
   どこへ攻め入るかは家の運を決める。方面を預けたからといって、天下の絵図まで
   預けたわけではない。許しは城ごとに一度、落とすまで有効。

   落とした城は、その旗頭の寄騎とするか、大名の直轄とするかを大名が選ぶ。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { initState, advanceMonth, 国主に任じる, 旗頭に任じる, 旗頭の狙い, 旗頭に許す,
  旗頭は許されているか, 旗頭の済んだ許しを片づける, 旗頭の預け高, 旗頭の調略,
  castellanOf, underMyBanner, 軍の道, 城の実入り, 自ら采配するか } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 0x7b31;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* 五国を織田が押さえ、そこに旗頭を立てる。
   旗頭の枠は四国につき一人なので、四国以上を領していないと置けない。 */
const 場 = () => {
  const s = initState('oda');
  const 国ら = ['尾張', '美濃', '三河', '伊勢', '近江'];
  for (const k of 国ら) for (const c of s.castles.filter((x) => x.kuni === k)) c.faction = 'oda';
  /* 当主のいる国には国主も旗頭も置けない（GDD 6.4）。当主を近江へ移し、
     尾張・美濃・三河を測りに使う。 */
  {
    const 当主 = s.generals.find((g) => g.faction === 'oda' && g.lord);
    const 近江 = s.castles.find((c) => c.faction === 'oda' && c.kuni === '近江');
    if (当主 && 近江) { 当主.at = 近江.id; 当主.本領 = 近江.id; 近江.lordId = 当主.id; }
  }
  const 国主 = {};
  for (const k of 国ら) {
    const 城 = s.castles.find((c) => c.faction === 'oda' && c.kuni === k);
    const g = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.役 && (x.age || 0) >= 25
      && !Object.values(国主).some((y) => y.id === x.id));
    if (!g) continue;
    g.fief = 40000; g.age = 34; g.at = 城.id; g.本領 = 城.id; g.loyal = 85; 城.lordId = g.id;
    if (国主に任じる(s, 'oda', k, g.id).ok) 国主[k] = g;
  }
  const 旗 = 国主['尾張'];
  const r = 旗頭に任じる(s, 'oda', 旗.id, 国ら);
  if (!r.ok) throw new Error(`旗頭を立てられなかった：${r.why}`);
  for (const c of s.castles.filter((x) => x.faction === 'oda')) { c.local = 9000; c.food = 90000; }
  s.factions.oda.gold = 40000;
  return { s, 旗, 国主 };
};

console.log('── 一　旗頭は方面の外れの敵城を見立てる');
{
  const { s, 旗 } = 場();
  const 狙 = 旗頭の狙い(s, 旗, { 道: 軍の道, 旗の下: underMyBanner });
  確('攻める先を見立てる', !!狙, 狙 ? `${狙.的.name}（${s.factions[狙.的.faction].name}）守${狙.守}人` : 'なし');
  if (狙) {
    確('狙うのは他家の城である', 狙.的.faction !== 'oda');
    確('方面の城と隣り合う', (軍の道(s, 'oda', 狙.拠.id, 狙.的.id) || []).length === 2,
      `${狙.拠.name} → ${狙.的.name}`);
  }
}

console.log('\n── 二　許しの控え');
{
  const { s, 旗 } = 場();
  const 狙 = 旗頭の狙い(s, 旗, { 道: 軍の道, 旗の下: underMyBanner });
  確('はじめは許されていない', !旗頭は許されているか(s, 旗.id, 狙.的.id));
  旗頭に許す(s, 旗.id, 狙.的.id);
  確('許せば控えに載る', 旗頭は許されているか(s, 旗.id, 狙.的.id));
  // 落とせば控えは片づく
  s.castles.find((c) => c.id === 狙.的.id).faction = 'oda';
  旗頭の済んだ許しを片づける(s);
  確('落とした城の許しは残らない', !旗頭は許されているか(s, 旗.id, 狙.的.id));
}

console.log('\n── 三　許しが無ければ出陣せず、願いが立つ');
{
  const { s, 旗 } = 場();
  let u = s, 願 = null;
  for (let i = 0; i < 6 && !願; i++) { u = advanceMonth(u); 願 = u.旗頭の願い; }
  確('大名に願いが立つ', !!願, 願 ? `${(u.generals.find((x) => x.id === 願.旗頭) || {}).name} → ${(u.castles.find((c) => c.id === 願.castleId) || {}).name}` : '六か月のあいだ願いが出なかった');
  確('願いは旗頭のものである', !願 || 願.旗頭 === 旗.id);
  const 旗の軍 = (u.armies || []).filter((a) => a.旗頭 === 旗.id);
  確('許しが下りるまで、旗頭の軍は出ない', 旗の軍.length === 0, `${旗の軍.length}軍`);
}

console.log('\n── 四　許せば、旗頭が自ら兵を出す');
{
  const { s, 旗 } = 場();
  const 狙 = 旗頭の狙い(s, 旗, { 道: 軍の道, 旗の下: underMyBanner });
  旗頭に許す(s, 旗.id, 狙.的.id);
  let u = s, 出 = null;
  for (let i = 0; i < 6 && !出; i++) {
    u = advanceMonth(u);
    出 = (u.armies || []).find((a) => a.旗頭 === 旗.id);
  }
  確('旗頭の軍が出る', !!出, 出 ? `${出.men}人 → ${(u.castles.find((c) => c.id === 出.target) || {}).name}` : '六か月のあいだ出なかった');
  確('その軍は方面の城から出ている', !出 || (旗.方面 || []).includes(
    (u.castles.find((c) => c.id === 出.from) || {}).kuni),
    出 ? `${(u.castles.find((c) => c.id === 出.from) || {}).name}` : '');
  const 報 = (u.monthEvents || []).filter((t) => /方面の差配/.test(t));
  確('月報に出陣が出る', 報.length > 0 || !出, 報[0] || '');
}

console.log('\n── 五　旗頭に預ける高は、方面の実入りで決まる');
{
  const { s, 旗 } = 場();
  const 高 = 旗頭の預け高(s, 旗);
  const 実 = 高.城.reduce((a, c) => a + 城の実入り(c), 0);
  確('方面の城を数える', 高.城.length > 0 && 高.城.every((c) => (旗.方面 || []).includes(c.kuni)),
    `${高.城.length}城（${(旗.方面 || []).join('・')}）`);
  確('並の目盛りなら実入りのまま', Math.abs(高.預け - 実) < 1.5,
    `実入り ${Math.round(実)}貫 → 預け ${高.預け}貫`);
}

console.log('\n── 六　旗頭は調略も差配する');
{
  const { s, 旗 } = 場();
  const 高 = 旗頭の預け高(s, 旗);
  /* 仕掛ける目は二割二分。十二度では五度に一度ほど空振りする（〇.七八の十二乗＝
     〇.〇五）。「仕掛けることがある」を測るには少なすぎた――実際、仕込みが変わって
     籤の並びがずれた途端に背いた。四十度なら空振りは一万に一度に満たない。
     閾値を緩めたのではなく、測りの数を足りるようにしたのである。 */
  let 仕 = null;
  for (let i = 0; i < 40 && !仕; i++) { s.year++; 仕 = 旗頭の調略(s, 旗, { 残: 高.預け }); }
  確('旗頭が調略を仕掛ける', !!仕, 仕 ? `${仕.手} → ${(s.castles.find((c) => c.id === 仕.先) || {}).name}` : '四十度のうち一度も仕掛けなかった');
  確('その企ては旗頭のものと控える',
    !仕 || (s.plots || []).some((p) => p.旗頭 === 旗.id), `${(s.plots || []).length}件`);
  // 預け高が無ければ仕掛けない
  const { s: t, 旗: 旗t } = 場();
  let 無 = null;
  for (let i = 0; i < 12 && !無; i++) { t.year++; 無 = 旗頭の調略(t, 旗t, { 残: 0 }); }
  確('預け高が尽きていれば仕掛けない', !無, 無 ? `${無.手}を仕掛けた` : '仕掛けなかった');
}

console.log('\n── 七　旗頭に預けた戦は、大名の盤面に出さない');
{
  /* 方面を預け、攻めを許したのに、いざ城下に着くと合戦の盤が大名の前に開き、
     大名が駒を動かす形になっていた。これでは任せたことにならない。
     許しを与えるところまでが大名の役で、その先は旗頭が指図する。 */
  const { s, 旗 } = 場();
  const 狙 = 旗頭の狙い(s, 旗, { 道: 軍の道, 旗の下: underMyBanner });
  旗頭に許す(s, 旗.id, 狙.的.id);
  let u = s, 出 = null;
  for (let i = 0; i < 6 && !出; i++) { u = advanceMonth(u); 出 = (u.armies || []).find((a) => a.旗頭 === 旗.id); }
  確('旗頭の軍が出ている', !!出);
  if (出) {
    const 的 = u.castles.find((c) => c.id === 出.target);
    確('その軍は旗頭の印を負う', 出.旗頭 === 旗.id);
    確('他家へ寄せる戦は大名の盤面に出ない', 自ら采配するか(u, 出, 的) === false,
      `${(u.generals.find((x) => x.id === 旗.id) || {}).name}の軍 → ${的 ? 的.name : '?'}`);
    確('街道での行き合いも旗頭が捌く', 自ら采配するか(u, 出, null) === false);
    const 自城 = u.castles.find((c) => c.faction === 'oda');
    確('ただし自家の城を守る戦なら、大名が采配を執る', 自ら采配するか(u, 出, 自城) === true,
      `${自城.name}`);
  }
  const 直 = { id: 'D1', faction: 'oda', gens: [], men: 1000 };
  確('大名の直の手勢は、これまで通り大名が動かす', 自ら采配するか(u, 直, u.castles.find((c) => c.faction !== 'oda')) === true);
  確('他家の軍は大名の盤面に出ない', 自ら采配するか(u, { id: 'E1', faction: 'imagawa' }, null) === false);
}

console.log('\n── 八　狙うのは方面に隣接する敵から順');
{
  /* もとは「隣り合う城だけ」を見て、守りの薄いものを選んでいた。二つの難が
     あった。隣り合う敵城が一つも無ければ何もしないこと（方面の内側が固まると
     旗頭は永久に動かない）と、遠近を問わず守りの薄さだけで選ぶので方面の
     反対側へ向かうことがあったこと。近い敵から順に当たるのが筋である。 */
  const { s, 旗 } = 場();
  const 狙 = 旗頭の狙い(s, 旗, { 道: 軍の道, 旗の下: underMyBanner });
  確('狙いが立つ', !!狙, 狙 ? `${狙.的.name}（${(s.factions[狙.的.faction] || {}).name}）` : 'なし');
  if (狙) {
    確('その城は方面の城と街道で結ばれている', 狙.近 >= 1, `${狙.近}歩先`);
    /* 方面に隣接する敵城があるなら、それより遠い城は選ばない。 */
    const 己方 = s.castles.filter((c) => c.faction === 旗.faction && (旗.方面 || []).includes(c.kuni));
    let 最も近い = 99;
    for (const 的 of s.castles) {
      if (的.faction === 旗.faction || underMyBanner(s, 旗.faction, 的.faction)) continue;
      for (const c of 己方) {
        const 道 = 軍の道(s, 旗.faction, c.id, 的.id);
        if (道) 最も近い = Math.min(最も近い, 道.length - 1);
      }
    }
    確('いちばん近い敵と同じ近さの城を選ぶ', 狙.近 === 最も近い,
      `選んだ ${狙.近}歩先／盤で最も近い敵は ${最も近い}歩先`);
    /* 同じ近さの城が複数あるなら、守りの薄いほうを選ぶ。 */
    const 同距離 = [];
    for (const 的 of s.castles) {
      if (的.faction === 旗.faction || underMyBanner(s, 旗.faction, 的.faction)) continue;
      let 近 = 99;
      for (const c of 己方) { const 道 = 軍の道(s, 旗.faction, c.id, 的.id); if (道) 近 = Math.min(近, 道.length - 1); }
      if (近 !== 狙.近) continue;
      const 守 = 的.local + s.generals.filter((x) => x.at === 的.id && x.faction === 的.faction && !x.captive)
        .reduce((a, x) => a + x.retinue, 0);
      同距離.push({ 的, 守 });
    }
    const 薄 = 同距離.sort((a, b) => a.守 - b.守)[0];
    確('同じ近さなら、守りの薄いほうを選ぶ', 薄 && 薄.的.id === 狙.的.id,
      `${同距離.length}城が同じ近さ／選んだ ${狙.的.name}（守 ${薄 ? 薄.守 : '?'}）`);
  }
  /* 旗の下の家へは仕掛けない。 */
  確('旗の下の城は狙わない', !狙 || !underMyBanner(s, 旗.faction, 狙.的.faction));
}

console.log(`\n════ 旗頭の差配：咎 ${咎.length} 件`);
console.log('エラー:', 咎.length ? 咎.join(' | ') : 'なし');
process.exit(咎.length ? 1 : 0);
