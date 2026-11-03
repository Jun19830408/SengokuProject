/* 籠城と兵糧攻め（core/kakomi.js 囲みの食い・蔵の限り、govern/month.js、ui/MapScreen.jsx 兵糧攻めのひと月）。

   遊ぶ側の申し出は「兵糧攻めでも兵糧が全然減らず難しい」「包囲されている城は毎月兵を雇用でき
   増えていく」であった（清洲城を四か月囲んでも兵糧がほとんど減らず、城兵は増え続けた）。
   ここで確かめること。
     一、蔵の限り   … 城の蔵に蓄えられる兵糧は石高の二割五分まで（小さな城でも五千石）
     二、売り払い   … 月送りで、蔵の限りを超えた年貢米は市で売り払い、金に換える
     三、買い入れ   … 商人から兵糧を買うのも、蔵の限りまで
     四、囲まれた城 … 他家の城でも、囲まれていれば兵を募らず、城にいる将の手勢も増えない
                      （囲まれていない城は募る）
     五、囲みの食い … （地の兵＋城下の民の百のうち三）×〇.三五＋六百 に（〇.六＋締め×一.五）を掛ける
     六、清洲城の例 … 城兵千五百（地の兵九百十八）を固く囲めば（締め八割二分）、始めの蓄えでも
                      五か月半ほどで尽きる（もとの式では十二か月余り） */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { initState, advanceMonth, newRoster, 囲みの食い, 蔵の限り, 籠る民の割, doTrade } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x5A17;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

console.log('── 一　蔵の限り');
{
  確('石高の二割五分', 蔵の限り({ koku: 86904 }) === Math.round(86904 * 0.25), `清洲城 ${蔵の限り({ koku: 86904 })}石`);
  確('小さな城でも五千石は蓄えられる', 蔵の限り({ koku: 8000 }) === 5000);
  const s = initState('oda');
  const 越 = s.castles.filter((c) => c.food > 蔵の限り(c));
  確('始めの盤の蓄えは、どの城も蔵の限りの内に収まる', 越.length === 0, `越える城 ${越.length}`);
}

console.log('── 二　蔵の限りを超えた年貢米は売り払う');
{
  const s = initState('oda');
  const c = s.castles.find((x) => x.id === 'nagoya');
  const 限 = 蔵の限り(c);
  c.food = 限 + 20000;
  const 前金 = s.factions.oda.gold;
  const t = advanceMonth(s, s);
  const c2 = t.castles.find((x) => x.id === 'nagoya');
  /* 売り払ったあとに臣従した家の貢の米（月に数十石）が本拠の蔵へ入ることがある。それは翌月に売る */
  確('月送りのあと、蔵は限りの内（貢の米の分は翌月に売る）', c2.food <= 限 + 500, `${Math.round(c2.food)}／限り${限}`);
  確('売り払った報せが出る', (t.monthEvents || []).some((e) => /年貢米[\d,]+石を市で売り払った/.test(e)),
    ((t.monthEvents || []).find((e) => /売り払った/.test(e)) || '（なし）'));
  /* 金は増える（月の出入りもあるので、売り払いのない月と比べる） */
  const s2 = initState('oda');
  const u = advanceMonth(s2, s2);
  確('売り払った分だけ金が多い', t.factions.oda.gold - 前金 > u.factions.oda.gold - s2.factions.oda.gold + 100,
    `売った月 ${Math.round(t.factions.oda.gold - 前金)}貫／売らぬ月 ${Math.round(u.factions.oda.gold - s2.factions.oda.gold)}貫`);
}

console.log('── 三　買い入れも蔵の限りまで');
{
  const s = initState('oda');
  const c = s.castles.find((x) => x.id === 'nagoya');
  s.factions.oda.gold = 999999;
  const t = doTrade(s, c.id, 'food', 1000000);
  const c2 = t.castles.find((x) => x.id === c.id);
  確('限りを超えては買えない', c2.food <= 蔵の限り(c2) + 1, `${Math.round(c2.food)}／限り${蔵の限り(c2)}`);
  const u = doTrade(t, c.id, 'food', 1000);
  確('蔵がいっぱいなら、買えぬと告げる', /蔵はいっぱい/.test(u.msg || ''), u.msg || '');
}

console.log('── 四　囲まれた城は兵を募らない');
{
  /* 他家（織田大和守家）の清洲城。兵を器の八割より少なくし、金を持たせる。片方は囲ませ、片方は
     囲ませずに一月送る */
  const 場 = (囲む) => {
    const s = initState('oda');
    const c = s.castles.find((x) => x.id === 'kiyosu');
    c.local = 300;
    s.factions[c.faction].gold = 20000;
    const 将ら = s.generals.filter((x) => x.at === c.id && x.faction === c.faction && !x.captive);
    for (const g of 将ら) g.retinue = Math.max(20, Math.round(g.retinue * 0.3));
    if (囲む) {
      const 敵城 = s.castles.find((x) => x.id === 'nagoya');
      s.armies.push({ id: 'R1', faction: 'oda', from: 敵城.id, gens: [], local: 5000, localTrain: 70,
        rost: newRoster(5000, 'arm-R1'), men: 5000, at: c.id, path: [c.id], prog: 0, food: 400000,
        target: c.id, sieging: true });
      s.sieges = [{ castleId: c.id, armyId: 'R1', months: 0, decided: null, enc: 60 }];
    }
    const 前 = { 地: c.local, 手: 将ら.reduce((a, g) => a + g.retinue, 0) };
    const t = advanceMonth(s, s);
    const c2 = t.castles.find((x) => x.id === 'kiyosu');
    const 手 = t.generals.filter((x) => x.at === c.id && x.faction === c2.faction && !x.captive).reduce((a, g) => a + g.retinue, 0);
    return { 前, 地: c2.local, 手, 家: c2.faction };
  };
  const 囲 = 場(true), 素 = 場(false);
  確('囲まれていない城は兵を募る（試しの場が利いている）', 素.地 > 素.前.地, `地の兵 ${素.前.地} → ${素.地}`);
  確('囲まれた城は兵を募らない', 囲.地 <= 囲.前.地, `地の兵 ${囲.前.地} → ${囲.地}`);
  確('囲まれていない城の将の手勢は増える（試しの場が利いている）', 素.手 > 素.前.手, `手勢 ${素.前.手} → ${素.手}`);
  確('囲まれた城の将の手勢は増えない', 囲.手 <= 囲.前.手, `手勢 ${囲.前.手} → ${囲.手}`);
}

console.log('── 五　囲みの食い');
{
  const c = { local: 918, pop: 71261 };
  const 式 = Math.round(((918 + 71261 * 籠る民の割) * 0.35 + 600) * (0.6 + 0.82 * 1.5));
  確('（地の兵＋城下の民の百のうち三）×〇.三五＋六百 に（〇.六＋締め×一.五）を掛ける', 囲みの食い(c, 0.82) === 式,
    `${囲みの食い(c, 0.82)}石／式 ${式}石`);
  確('囲みが固いほど多く食う', 囲みの食い(c, 1.0) > 囲みの食い(c, 0.6) && 囲みの食い(c, 0.6) > 囲みの食い(c, 0.3));
}

console.log('── 六　清洲城の例（遊ぶ側の申し出の形）');
{
  const s = initState('oda');
  const c = s.castles.find((x) => x.id === 'kiyosu');
  /* 城下の野戦に敗れて城兵が千五百に減った（地の兵は九百十八）。封鎖の扶持は兵×〇.〇八 */
  const 地 = 918, 兵 = 1500, 締め = 0.82;
  const 新 = 囲みの食い({ ...c, local: 地 }, 締め) + Math.round(兵 * 0.08);
  const 旧 = Math.round((地 * 0.35 + 600) * (0.6 + 締め)) + Math.round(兵 * 0.08);
  const 月 = c.food / 新, 旧月 = c.food / 旧;
  確('固く囲めば、始めの蓄えは五か月から七か月で尽きる', 月 >= 5 && 月 <= 7,
    `蓄え${Math.round(c.food)}石・月に${新}石 → ${月.toFixed(1)}か月（もとの式では月に${旧}石・${旧月.toFixed(1)}か月）`);
  const 満 = 蔵の限り(c) / 新;
  確('蔵が満ちていても、一年はもたない', 満 < 12, `限り${蔵の限り(c)}石 → ${満.toFixed(1)}か月`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
