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
  castellanOf, underMyBanner, 軍の道, 城の実入り, 自ら采配するか,
  寄騎に取る, 寄騎に取れるか, 寄騎を繕う, 国主を繕う, 城主か, 城を守る将, 守備隊の統率,
  旗頭の受け持ち, 旗頭の届く国, 旗頭の的にできる家, 旗頭の的家, 旗頭の的家を定める, 的家の限り,
  家の国ら, 旗の下の当主か,
  当主の国ら } = H;

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
  const r = 旗頭に任じる(s, 'oda', 旗.id);
  if (!r.ok) throw new Error(`旗頭を立てられなかった：${r.why}`);
  /* 受け持ちは寄騎から広がる。隣り合う国の国主から順に取る。 */
  for (let i = 0; i < 国ら.length; i++) {
    for (const k of 国ら) {
      const g = 国主[k];
      if (!g || g.id === 旗.id || g.寄親) continue;
      寄騎に取る(s, 旗.id, g.id);
    }
  }
  for (const c of s.castles.filter((x) => x.faction === 'oda')) { c.local = 9000; c.food = 90000; }
  s.factions.oda.gold = 40000;
  return { s, 旗, 国主 };
};

console.log('── 一　旗頭は方面の外れの敵城を見立てる');
{
  const { s, 旗 } = 場();
  const 狙 = 旗頭の狙い(s, 旗, { 道: 軍の道, 旗の下: underMyBanner, 受け持ち: 旗頭の受け持ち, 的家: 旗頭の的家 });
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
  const 狙 = 旗頭の狙い(s, 旗, { 道: 軍の道, 旗の下: underMyBanner, 受け持ち: 旗頭の受け持ち, 的家: 旗頭の的家 });
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
  const 狙 = 旗頭の狙い(s, 旗, { 道: 軍の道, 旗の下: underMyBanner, 受け持ち: 旗頭の受け持ち, 的家: 旗頭の的家 });
  旗頭に許す(s, 旗.id, 狙.的.id);
  let u = s, 出 = null;
  for (let i = 0; i < 6 && !出; i++) {
    u = advanceMonth(u);
    出 = (u.armies || []).find((a) => a.旗頭 === 旗.id);
  }
  確('旗頭の軍が出る', !!出, 出 ? `${出.men}人 → ${(u.castles.find((c) => c.id === 出.target) || {}).name}` : '六か月のあいだ出なかった');
  確('その軍は方面の城から出ている', !出 || 旗頭の受け持ち(s, 旗).includes(
    (u.castles.find((c) => c.id === 出.from) || {}).kuni),
    出 ? `${(u.castles.find((c) => c.id === 出.from) || {}).name}` : '');
  const 報 = (u.monthEvents || []).filter((t) => /方面軍の差配/.test(t));
  確('月報に出陣が出る', 報.length > 0 || !出, 報[0] || '');
}

console.log('\n── 五　旗頭に預ける高は、方面の実入りで決まる');
{
  const { s, 旗 } = 場();
  const 高 = 旗頭の預け高(s, 旗, { 受け持ち: 旗頭の受け持ち });
  const 実 = 高.城.reduce((a, c) => a + 城の実入り(c), 0);
  確('方面の城を数える', 高.城.length > 0 && 高.城.every((c) => 旗頭の受け持ち(s, 旗).includes(c.kuni)),
    `${高.城.length}城（${旗頭の受け持ち(s, 旗).join('・')}）`);
  確('並の目盛りなら実入りのまま', Math.abs(高.預け - 実) < 1.5,
    `実入り ${Math.round(実)}貫 → 預け ${高.預け}貫`);
}

console.log('\n── 六　旗頭は調略も差配する');
{
  const { s, 旗 } = 場();
  const 高 = 旗頭の預け高(s, 旗, { 受け持ち: 旗頭の受け持ち });
  /* 仕掛ける目は二割二分。十二度では五度に一度ほど空振りする（〇.七八の十二乗＝
     〇.〇五）。「仕掛けることがある」を測るには少なすぎた――実際、仕込みが変わって
     籤の並びがずれた途端に背いた。四十度なら空振りは一万に一度に満たない。
     閾値を緩めたのではなく、測りの数を足りるようにしたのである。 */
  let 仕 = null;
  for (let i = 0; i < 40 && !仕; i++) { s.year++; 仕 = 旗頭の調略(s, 旗, { 残: 高.預け, 受け持ち: 旗頭の受け持ち }); }
  確('旗頭が調略を仕掛ける', !!仕, 仕 ? `${仕.手} → ${(s.castles.find((c) => c.id === 仕.先) || {}).name}` : '四十度のうち一度も仕掛けなかった');
  確('その企ては旗頭のものと控える',
    !仕 || (s.plots || []).some((p) => p.旗頭 === 旗.id), `${(s.plots || []).length}件`);
  // 預け高が無ければ仕掛けない
  const { s: t, 旗: 旗t } = 場();
  let 無 = null;
  for (let i = 0; i < 12 && !無; i++) { t.year++; 無 = 旗頭の調略(t, 旗t, { 残: 0, 受け持ち: 旗頭の受け持ち }); }
  確('預け高が尽きていれば仕掛けない', !無, 無 ? `${無.手}を仕掛けた` : '仕掛けなかった');
}

console.log('\n── 七　旗頭に預けた戦は、大名の盤面に出さない');
{
  /* 方面を預け、攻めを許したのに、いざ城下に着くと合戦の盤が大名の前に開き、
     大名が駒を動かす形になっていた。これでは任せたことにならない。
     許しを与えるところまでが大名の役で、その先は旗頭が指図する。 */
  const { s, 旗 } = 場();
  const 狙 = 旗頭の狙い(s, 旗, { 道: 軍の道, 旗の下: underMyBanner, 受け持ち: 旗頭の受け持ち, 的家: 旗頭の的家 });
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
  const 狙 = 旗頭の狙い(s, 旗, { 道: 軍の道, 旗の下: underMyBanner, 受け持ち: 旗頭の受け持ち, 的家: 旗頭の的家 });
  確('狙いが立つ', !!狙, 狙 ? `${狙.的.name}（${(s.factions[狙.的.faction] || {}).name}）` : 'なし');
  if (狙) {
    確('その城は方面の城と街道で結ばれている', 狙.近 >= 1, `${狙.近}歩先`);
    /* 方面に隣接する敵城があるなら、それより遠い城は選ばない。 */
    const 己方 = s.castles.filter((c) => c.faction === 旗.faction && 旗頭の受け持ち(s, 旗).includes(c.kuni));
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

console.log('\n── 九　旗頭の寄騎は、月が変わっても離れない');
{
  /* 寄騎の繕いは「寄親が国主であること」しか見ていなかった。旗頭の寄騎は
     ことごとくこの目に引っかかり、取った翌月には残らず離れていた。遊ぶ側の
     画面には「浅井久政は寄親を離れた」と六人ぶん並んだ。 */
  const { s, 旗, 国主 } = 場();
  const 取れた = [];
  for (const k of Object.keys(国主)) {
    const g = 国主[k];
    if (g.id === 旗.id) continue;
    if (寄騎に取る(s, 旗.id, g.id).ok) 取れた.push(g);
  }
  確('方面の国主を寄騎に取れる', 取れた.length >= 2,
    取れた.map((g) => `${g.name}（${g.役国}）`).join('・') || 'なし');
  const 解 = 寄騎を繕う(s, 'oda');
  確('繕いで離れない', !取れた.some((g) => 解.some((x) => x.id === g.id)),
    解.length ? `離れた ${解.map((x) => x.name).join('・')}` : '離れた者なし');
  /* 月を送っても同じであること（繕いは月送りの中で回る）。 */
  const t = advanceMonth(s);
  const 残 = 取れた.filter((g) => (t.generals.find((x) => x.id === g.id) || {}).寄親 === 旗.id);
  確('月を送っても寄騎のままである', 残.length === 取れた.length,
    `${残.length}／${取れた.length}名`);
}

console.log('\n── 十　方面の国主は、城主の札が無くても寄騎に取れる');
{
  /* 城主とは、その城に居る者のうち最も身代の高い者である。同じ城にさらに
     大身の者が入れば、国主でありながら城主ではなくなる。国主は城主の上にある
     役であるから、城主の札を要るのは筋が通らない。 */
  const { s, 旗, 国主 } = 場();
  const 相 = Object.values(国主).find((g) => g.id !== 旗.id);
  const 城 = s.castles.find((c) => c.id === (相.本領 || 相.at));
  const 大身 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.役
    && x.id !== 相.id && x.id !== 旗.id);
  大身.age = 40; 大身.fief = 90000; 大身.at = 城.id; 大身.本領 = 城.id; 城.lordId = 大身.id;
  確('国主が城主ではなくなった', !城主か(s, 相),
    `${城.name}の城主は ${(castellanOf(s, 城) || {}).name}`);
  const r = 寄騎に取れるか(s, 旗, 相);
  確('それでも旗頭の寄騎に取れる', r.ok, r.ok ? `${相.name}（${相.役国}の国主）` : r.why);
}

console.log('\n── 十一　届く先の外の国主は取れず、その訳が読める');
{
  /* 旗頭の届く先は「受け持ちと、それに隣り合う国」である。遠く離れた国の
     国主は取れない。取れない理由は読めねばならない。 */
  const { s, 旗, 国主 } = 場();
  const 届 = 旗頭の届く国(s, 旗);
  /* 届かぬ国を一つ選び、そこを自領にして国主を立てる。 */
  const 遠い国 = [...new Set(s.castles.map((c) => c.kuni))].find((k) => !届.includes(k));
  確('届かぬ国がある', !!遠い国, `受け持ち ${旗頭の受け持ち(s, 旗).join('・')}／届く先 ${届.length}国`);
  for (const c of s.castles.filter((x) => x.kuni === 遠い国)) c.faction = 'oda';
  const 遠城 = s.castles.find((c) => c.faction === 'oda' && c.kuni === 遠い国);
  const 遠の者 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.役 && x.id !== 旗.id
    && !Object.values(国主).some((y) => y.id === x.id));
  遠の者.age = 34; 遠の者.fief = 40000; 遠の者.at = 遠城.id; 遠の者.本領 = 遠城.id; 遠城.lordId = 遠の者.id;
  確('遠国に国主を立てられる', 国主に任じる(s, 'oda', 遠い国, 遠の者.id).ok, `${遠い国}　${遠の者.name}`);
  const r = 寄騎に取れるか(s, 旗, 遠の者);
  確('届かぬ国の国主は取れない', !r.ok, r.why);
  確('訳に受け持ちが出る', /受け持ち/.test(r.why || ''), r.why);
}

console.log('\n── 十一の二　国主を寄騎に取れば、受け持ちが一国ずつ広がる');
{
  /* 受け持ちを先に決めず、寄騎を付けるにつれて広げる（GDD 6.4）。
     大名が絵図を引いてしまうのではなく、手勢が伸びるのに従って広がる。 */
  const s = initState('oda');
  const 国ら = ['尾張', '美濃', '三河', '伊勢', '近江'];
  for (const k of 国ら) for (const c of s.castles.filter((x) => x.kuni === k)) c.faction = 'oda';
  const 当主 = s.generals.find((g) => g.faction === 'oda' && g.lord);
  const 近江 = s.castles.find((c) => c.faction === 'oda' && c.kuni === '近江');
  当主.at = 近江.id; 当主.本領 = 近江.id; 近江.lordId = 当主.id;
  const 立 = {};
  for (const k of 国ら) {
    const 城 = s.castles.find((c) => c.faction === 'oda' && c.kuni === k);
    const g = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.役 && (x.age || 0) >= 25
      && !Object.values(立).some((y) => y.id === x.id));
    if (!g) continue;
    g.fief = 40000; g.age = 34; g.at = 城.id; g.本領 = 城.id; 城.lordId = g.id;
    if (国主に任じる(s, 'oda', k, g.id).ok) 立[k] = g;
  }
  const 旗 = 立['尾張'];
  旗頭に任じる(s, 'oda', 旗.id);
  const 受 = () => 旗頭の受け持ち(s, 旗);
  確('はじめの受け持ちは己の国だけ', 受().length === 1, 受().join('・'));
  const 次 = Object.values(立).find((g) => g.id !== 旗.id && 寄騎に取れるか(s, 旗, g).ok);
  確('隣の国の国主は取れる', !!次, 次 ? `${次.役国}の${次.name}` : 'なし');
  if (次) {
    寄騎に取る(s, 旗.id, 次.id);
    確('取れば受け持ちが広がる', 受().length === 2, 受().join('・'));
    const 三 = Object.values(立).find((g) => g.id !== 旗.id && !g.寄親 && 寄騎に取れるか(s, 旗, g).ok);
    if (三) {
      寄騎に取る(s, 旗.id, 三.id);
      確('さらに取れば、さらに広がる', 受().length === 3, 受().join('・'));
    }
  }
}

console.log('\n── 十一の三　攻める家は大名が指す。城と時機は旗頭が見立てる');
{
  const { s, 旗 } = 場();
  const 選べる = 旗頭の的にできる家(s, 旗);
  確('受け持ちに国境を接する家が挙がる', 選べる.length > 0,
    選べる.map((f) => s.factions[f].name).slice(0, 6).join('・'));
  /* 三家まで。接していない家は指せない。 */
  const 接せぬ = Object.keys(s.factions).find((f) => f !== 'oda' && !選べる.includes(f)
    && s.castles.some((c) => c.faction === f));
  const r = 旗頭の的家を定める(s, 'oda', 旗.id, [...選べる.slice(0, 4), 接せぬ].filter(Boolean));
  確('指せるのは三家まで', r.家.length === 的家の限り, `${r.家.length}家`);
  確('接していない家は指せない', !r.家.includes(接せぬ),
    接せぬ ? `${s.factions[接せぬ].name}は退けられた` : '（接せぬ家が無い）');
  /* 指した家の城だけを狙う。道の通じる家で測る――他家の領で塞がれていれば、
     指しても軍は出せない（他家の領を素通りできないという掟のほうが先である）。 */
  const 受 = 旗頭の受け持ち(s, 旗);
  const 己方 = s.castles.filter((c) => c.faction === 'oda' && 受.includes(c.kuni));
  const 道が通る = (f) => s.castles.some((的) => 的.faction === f
    && 己方.some((c) => 軍の道(s, 'oda', c.id, 的.id)));
  const 一家 = 選べる.find(道が通る) || 選べる[0];
  確('道の通じる家を指す', 道が通る(一家), s.factions[一家].name);
  旗頭の的家を定める(s, 'oda', 旗.id, [一家]);
  const 狙 = 旗頭の狙い(s, 旗, { 道: 軍の道, 旗の下: underMyBanner, 受け持ち: 旗頭の受け持ち, 的家: 旗頭の的家 });
  確('指した家の城を狙う', !!狙 && 狙.的.faction === 一家,
    狙 ? `${狙.的.name}（${s.factions[狙.的.faction].name}）` : 'なし');
  /* 指さなければ、手近な敵から順に当たる（これまでどおり）。 */
  旗頭の的家を定める(s, 'oda', 旗.id, []);
  const 狙2 = 旗頭の狙い(s, 旗, { 道: 軍の道, 旗の下: underMyBanner, 受け持ち: 旗頭の受け持ち, 的家: 旗頭の的家 });
  確('指さなければ手近な敵を狙う', !!狙2, 狙2 ? `${狙2.的.name}（${狙2.近}歩先）` : 'なし');
}

console.log('\n── 十二　当主が城へ入れば、その国の国主は置けない');
{
  /* 当主の本領が余所にあっても、その城に入っている以上、その国は当主が自ら
     差配する国である。遊ぶ側の申し出は「稲葉山城に当主の織田信秀を入れて
     いるのに、美濃の国主が選べる」であった。 */
  const { s, 国主 } = 場();
  const 当主 = s.generals.find((g) => g.faction === 'oda' && g.lord);
  const 美濃 = 国主['美濃'];
  const 本領の国 = (s.castles.find((c) => c.id === 当主.本領) || {}).kuni;
  確('当主の本領は美濃ではない', 本領の国 !== '美濃', `本領 ${本領の国}`);
  /* 当主を美濃の城へ入れる（本領は動かさない） */
  const 稲葉山 = s.castles.find((c) => c.faction === 'oda' && c.kuni === '美濃');
  当主.at = 稲葉山.id;
  確('当主のいる国が数えられる', 当主の国ら(s, 'oda').includes('美濃'),
    当主の国ら(s, 'oda').join('・'));
  const 誰 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.役 && x.id !== 当主.id);
  if (誰) {
    誰.fief = 40000; 誰.age = 34; 誰.at = 稲葉山.id; 誰.本領 = 稲葉山.id;   // 美濃に根を持たせる
    const r = 国主に任じる(s, 'oda', '美濃', 誰.id);
    確('当主のいる国には国主を立てられない', !r.ok, r.why);
  }
  /* すでに立っていた国主も、月が変われば役を離れる */
  if (美濃) {
    const 解 = 国主を繕う(s, 'oda');
    確('すでに立っていた国主も役を離れる', 解.some((g) => g.id === 美濃.id),
      解.map((g) => g.name).join('・') || 'なし');
  }
}

console.log('\n── 十三　城主は任じた者である。出陣しても変わらない');
{
  /* もとは「その城にいる者のうち最も身代の高い者」を城主としていた。役では
     なくその月の顔ぶれで決まるので、城主が出陣した途端に城主でなくなり、
     国主の寄騎であればその月のうちに寄親を離れた。旗頭・国主・城主の筋が、
     兵を出すたびに崩れていたことになる。 */
  const { s, 旗, 国主 } = 場();
  const 親 = 国主['美濃'] || Object.values(国主).find((g) => g.id !== 旗.id);
  const 城ら = s.castles.filter((c) => c.faction === 'oda' && c.kuni === 親.役国
    && c.id !== (親.本領 || 親.at));
  const 城 = 城ら[0];
  const 主 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.役
    && x.id !== 旗.id && !Object.values(国主).some((y) => y.id === x.id));
  主.age = 34; 主.fief = 12000; 主.at = 城.id; 主.本領 = 城.id; 城.lordId = 主.id;
  確('国主の寄騎に取れる', 寄騎に取る(s, 親.id, 主.id).ok, `${親.name} ← ${主.name}（${城.name}）`);

  /* 出陣（城を離れる）*/
  主.at = null;
  確('出陣しても城主のまま', !!城主か(s, 主), (castellanOf(s, 城) || {}).name || 'なし');
  確('出陣しても寄親を離れない', !寄騎を繕う(s, 'oda').some((g) => g.id === 主.id));

  /* 帰って、より大身の者が同じ城に入る */
  主.at = 城.id;
  const 大身 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.役
    && x.id !== 主.id && x.id !== 旗.id && !Object.values(国主).some((y) => y.id === x.id));
  大身.age = 40; 大身.fief = 90000; 大身.at = 城.id; 大身.本領 = 城.id;
  確('大身が入っても城主は変わらない', (castellanOf(s, 城) || {}).id === 主.id,
    `${(castellanOf(s, 城) || {}).name}（大身 ${大身.name}）`);

  /* 留守は、城に残る者が率いる */
  主.at = null;
  確('城主の留守は、残る者が率いる', (城を守る将(s, 城) || {}).id === 大身.id,
    `城主 ${(castellanOf(s, 城) || {}).name}／留守 ${(城を守る将(s, 城) || {}).name}`);
  確('留守の統率が守備隊に映る', 守備隊の統率(s, 城) >= 大身.lead,
    `${守備隊の統率(s, 城)}（${大身.name}の統率 ${大身.lead}）`);
}

console.log('\n── 十四　臣従した家の当主も、旗頭の寄騎になれる');
{
  /* 臣従とは旗の下に入ることであるから、その家の当主を方面軍に組み入れるのは
     筋が通る。取れるのは、受け持ちに隣り合う国に領を持つ家だけである。 */
  const s = initState('oda');
  const 国ら = ['尾張', '美濃', '三河', '伊勢', '近江'];
  for (const k of 国ら) for (const c of s.castles.filter((x) => x.kuni === k)) c.faction = 'oda';
  const 当主 = s.generals.find((g) => g.faction === 'oda' && g.lord);
  const 近江 = s.castles.find((c) => c.faction === 'oda' && c.kuni === '近江');
  当主.at = 近江.id; 当主.本領 = 近江.id;
  /* 境の国（三河）に旗頭を立てる。隣に他家がいる。 */
  const 城 = s.castles.find((c) => c.faction === 'oda' && c.kuni === '三河');
  const 旗 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.役);
  旗.age = 35; 旗.fief = 40000; 旗.at = 城.id; 旗.本領 = 城.id; 城.lordId = 旗.id;
  国主に任じる(s, 'oda', '三河', 旗.id);
  確('旗頭を立てられる', 旗頭に任じる(s, 'oda', 旗.id).ok, 旗頭の受け持ち(s, 旗).join('・'));

  const 届 = 旗頭の届く国(s, 旗);
  const 臣従させる = (f) => {
    s.relations[[s.player, f].sort().join('|')] = { trust: 90, state: '臣従', master: 'oda', until: null };
  };
  const 当主のいる家 = (f) => s.factions[f] && s.generals.some((g) => g.faction === f && g.lord);
  const 隣 = [...new Set(s.castles.filter((c) => c.faction !== 'oda' && 届.includes(c.kuni))
    .map((c) => c.faction))].find(当主のいる家);
  確('受け持ちの隣に家がある', !!隣, 隣 ? s.factions[隣].name : 'なし');
  const 隣の当主 = s.generals.find((g) => g.faction === 隣 && g.lord);

  /* 臣従していなければ取れない。 */
  const r0 = 寄騎に取れるか(s, 旗, 隣の当主);
  確('臣従していない家の当主は取れない', !r0.ok, r0.why);

  臣従させる(隣);
  const r = 寄騎に取れるか(s, 旗, 隣の当主);
  確('臣従した家の当主は取れる', r.ok, r.ok ? `${s.factions[隣].name}　${隣の当主.name}` : r.why);
  if (r.ok) {
    寄騎に取る(s, 旗.id, 隣の当主.id);
    const 受 = 旗頭の受け持ち(s, 旗);
    確('その家の領が受け持ちに入る', 家の国ら(s, 隣).every((k) => 受.includes(k)),
      `受け持ち ${受.join('・')}`);
    確('月が変わっても離れない', !寄騎を繕う(s, 'oda').some((g) => g.id === 隣の当主.id));
    /* 臣従が解ければ、寄騎も離れる。 */
    s.relations[[s.player, 隣].sort().join('|')].state = '従属';
    確('旗を離れれば、寄騎も解ける', 寄騎を繕う(s, 'oda').some((g) => g.id === 隣の当主.id));
  }

  /* 遠い臣従家は取れない。 */
  const 遠 = [...new Set(s.castles.filter((c) => c.faction !== 'oda' && !届.includes(c.kuni))
    .map((c) => c.faction))].find(当主のいる家);
  if (遠) {
    臣従させる(遠);
    const r2 = 寄騎に取れるか(s, 旗, s.generals.find((g) => g.faction === 遠 && g.lord));
    確('受け持ちから遠い臣従家は取れない', !r2.ok, r2.why);
  }
}

console.log('\n── 十五　記録を読み直しても、旗頭は旗頭のまま');
{
  /* 記録を読むたびに 国主を据える が回る。旗頭の役国は「旗頭」の欄なので、
     「その国に国主が居るか」だけを見ていた目を素通りし、旗頭が国主へ据え直されて
     いた。役が変われば寄親でなくなるので、寄騎はその月に残らず離れる。
     実際の記録（一五六〇年正月・織田五十八城）で、柴田勝家ら七名が一斉に離れた。 */
  const s = initState('oda');
  const 国ら = ['尾張', '美濃', '三河', '伊勢', '近江'];
  for (const k of 国ら) for (const c of s.castles.filter((x) => x.kuni === k)) c.faction = 'oda';
  const 当主 = s.generals.find((g) => g.faction === 'oda' && g.lord);
  const 尾張 = s.castles.find((c) => c.faction === 'oda' && c.kuni === '尾張');
  当主.at = 尾張.id; 当主.本領 = 尾張.id;
  const 城 = s.castles.find((c) => c.faction === 'oda' && c.kuni === '近江');
  const 旗 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.役);
  旗.age = 35; 旗.fief = 60000; 旗.at = 城.id; 旗.本領 = 城.id; 城.lordId = 旗.id;
  国主に任じる(s, 'oda', '近江', 旗.id);
  確('旗頭を立てられる', 旗頭に任じる(s, 'oda', 旗.id).ok, `${旗.name}　${旗.役国}`);

  /* 同じ国に、旗頭より身代の軽い家老を置いておく（据え替えの餌である）。 */
  const 別 = s.generals.find((x) => x.faction === 'oda' && !x.lord && !x.役 && x.id !== 旗.id
    && (s.castles.find((c) => c.id === (x.本領 || x.at)) || {}).kuni === '近江');
  if (別) 別.fief = 20000;

  /* 受け持ちの国の城に城主を据え、旗頭の寄騎に取る。 */
  const 届 = 旗頭の届く国(s, 旗);
  const 寄 = [];
  const 城ら = s.castles.filter((x) => x.faction === 'oda' && 届.includes(x.kuni) && x.id !== 城.id);
  for (const g of s.generals) {
    if (寄.length >= 3) break;
    if (g.faction !== 'oda' || g.lord || g.役 || g.寄親 || g.id === 旗.id) continue;
    const c = 城ら[寄.length];
    if (!c) break;
    g.age = 35; g.fief = 12000; g.at = c.id; g.本領 = c.id; c.lordId = g.id;   // 受け持ちの城主とする
    if (寄騎に取る(s, 旗.id, g.id).ok) 寄.push(g);
  }
  確('寄騎を取れる', 寄.length > 0, 寄.map((g) => g.name).join('・') || '0名');

  const t = JSON.parse(JSON.stringify(s));
  H.migrateSave(t);
  const 旗2 = t.generals.find((g) => g.id === 旗.id);
  確('読み直しても旗頭のまま', 旗2.役 === '旗頭' && 旗2.役国 === 旗.役国, `${旗2.役}／${旗2.役国}`);
  確('旗頭の国に国主は据わらない',
    !t.generals.some((g) => g.faction === 'oda' && g.役 === '国主' && g.役国 === 旗.役国));
  確('寄騎も残る', 寄.every((g) => (t.generals.find((x) => x.id === g.id) || {}).寄親 === 旗.id));

  const u = advanceMonth(t, t);
  確('月を送っても寄親を離れない',
    寄.every((g) => (u.generals.find((x) => x.id === g.id) || {}).寄親 === 旗.id),
    (u.monthEvents || []).filter((x) => /寄親を離れた/.test(x)).join('／') || '離役の報せなし');
}

console.log('\n── 十六　世に出た者・生まれた子は「本領を失った」ことにならない');
{
  /* 登場の報せの隣に「本多忠勝は本領を失い、長篠城に居を移した」と並んでいた。
     居を移してなどいない――本領の欄が空なだけであった。 */
  const s = initState('oda');
  const 親 = s.generals.find((g) => g.faction === 'oda' && !g.lord);
  const 子 = H.bearChild(s, 親);
  確('生まれた子に本領がある', !!子.本領, `${子.name}　${子.本領}`);
  確('子の本領は父の本領', 子.本領 === (親.本領 || 親.at));

  /* 世に出る者は年を跨がねば来ない。盤を数年進めて、出てきた者を検める。 */
  let t = s, 出 = [], 報 = [];
  const 既 = new Set(s.generals.map((g) => g.id));
  for (let i = 0; i < 14 && !出.length; i++) {
    t = advanceMonth(t, t);
    報 = (t.monthEvents || []).filter((x) => /本領を失い/.test(x));
    出 = t.generals.filter((g) => !既.has(g.id));
  }
  確('世に出た者がいる', 出.length > 0, `${出.length}名`);
  確('みな本領を持つ', 出.every((g) => !!g.本領),
    出.filter((g) => !g.本領).map((g) => g.name).join('・') || '欠けなし');
  確('「本領を失い」とは告げない', 報.length === 0, 報.join('／') || '報せなし');
}

console.log(`\n════ 旗頭の差配：咎 ${咎.length} 件`);
console.log('エラー:', 咎.length ? 咎.join(' | ') : 'なし');
process.exit(咎.length ? 1 : 0);
