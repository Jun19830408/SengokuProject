/* 古い記録に、後から入れた仕組みが効くか。

   遊ぶ側は、盤が新しくなっても前の記録の続きから遊ぶ。ところが後から入れた
   仕組みは、書き込まれた当時の記録には欄すら無い。欄が無いまま読んで倒れるか、
   欄が無いことを「そういう決まりだ」と取り違えるかすれば、続きから遊ぶ人だけが
   古い道理の盤に取り残される。記録は最も守るべきものであるから、ここを測る。

   古い記録の作り方は、盤を走らせてから後の仕組みの欄を剥ぎ取り、古い仕様でしか
   成り立たない姿（当主のいる国の国主・緩い比の従属）を仕込む、という形にした。
   別の版を持ち出さずに、いつでも同じものが作れる。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 賽を据える = (種) => {
  let x = 種 | 0;
  Math.random = function () {
    x |= 0; x = (x + 0x6D2B79F5) | 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const 石 = (s, f) => s.castles.filter((c) => c.faction === f).reduce((a, c) => a + c.koku, 0);
const 送る = (s) => {
  s = H.advanceMonth(s);
  for (let k = 0; k < 60 && (s.clashes || []).length; k++) s = H.resolveClashOffscreen(s);
  for (let k = 0; k < 120 && (s.pendingArrivals || []).length; k++) {
    const id = s.pendingArrivals[0];
    const a = (s.armies || []).find((y) => y.id === id);
    const 的 = a && s.castles.find((c) => c.id === a.at);
    if (!a || !的) { s.pendingArrivals = s.pendingArrivals.slice(1); continue; }
    s = H.resolveOffscreen(s, a.id, 的.id);
  }
  if (s.warSettle) {
    const w = s.warSettle;
    try { H.滅んだ家を始末する(s, w.faction, w.winner, w.castleId); } catch (e) { /* 始末できずとも進む */ }
    s.warSettle = null;
  }
  return s;
};

/* 後から入れた仕組みが state に足した欄。古い記録にはこれが無い。 */
const 後の欄 = ['courtRanks', '惣無事令', '惣無事令の控え', '惣無事令の問い', '朝敵', '号令'];

/* 古い記録をこしらえる。 */
const 古い記録 = () => {
  賽を据える(4649);
  let s = H.initState('oda');
  s.autoPlay = true;
  for (let i = 0; i < 36; i++) s = 送る(s);          // 三年
  for (const k of 後の欄) delete s[k];               // 当時は無かった欄を剥ぐ
  return JSON.parse(JSON.stringify(s));              // 記録は文字になって置かれる
};

/* 当主と同じ国に国主がいる数（いまの掟では、あってはならない姿）。 */
const 当主の国の国主 = (t) => {
  let n = 0;
  for (const f of new Set(t.castles.map((c) => c.faction))) {
    const l = t.generals.find((g) => g.faction === f && g.lord);
    if (!l || l.at == null) continue;
    const c = t.castles.find((x) => x.id === l.at);
    if (!c) continue;
    for (const g of t.generals) {
      if (g.faction !== f || g.役 !== '国主' || g.lord) continue;
      const gc = t.castles.find((x) => x.id === g.at);
      if (gc && gc.kuni === c.kuni) n++;
    }
  }
  return n;
};

const 生 = 古い記録();

console.log('── 一　欄の無い古い記録でも、倒れずに読める');
let s;
{
  確('後の仕組みの欄は入っていない', 後の欄.every((k) => 生[k] === undefined), 後の欄.join('・'));
  try {
    s = H.migrateSave(JSON.parse(JSON.stringify(生)));
    確('読み込みが通る', true, `${s.year}年${s.month}月　残る家 ${new Set(s.castles.map((c) => c.faction)).size}`);
  } catch (e) {
    確('読み込みが通る', false, e.message);
    console.log('エラー:', `${咎.length}件`); process.exit(1);
  }
}

console.log('\n── 二　欄が無くても、新しい仕組みが算えられる');
{
  const f = [...new Set(s.castles.map((c) => c.faction))].sort((a, b) => 石(s, b) - 石(s, a))[0];
  let 状 = null, 位 = undefined, 可 = null;
  try {
    状 = H.いまの段(s, f, { 旗の下か: H.underMyBanner });
    位 = H.courtRank(s, f);
    可 = H.号令できるか(s, f);
  } catch (e) { 確('倒れずに算える', false, e.message); }
  確('段が算える', !!状 && !!状.段, `${s.factions[f].name}　${(状 || {}).段}`);
  確('官位が算える（欄が無くとも盤から出す）', 位 !== undefined, 位 ? 位.key : 'なし');
  確('号令の可否が算える', 可 === false || 可 === true, String(可));
}

console.log('\n── 三　大きくなれば、古い記録の家でも段は進み、位は付く');
{
  const t = H.migrateSave(JSON.parse(JSON.stringify(生)));
  const f = [...new Set(t.castles.map((c) => c.faction))].sort((a, b) => 石(t, b) - 石(t, a))[0];
  const 段 = () => H.いまの段(t, f, { 旗の下か: H.underMyBanner }).段;
  const 初 = 段();
  const 全 = t.castles.reduce((a, c) => a + c.koku, 0);
  for (const c of t.castles.filter((x) => H.GOKINAI.includes(x.kuni))) c.faction = f;
  for (const c of t.castles) {
    if (石(t, f) >= 全 * H.天下人の直轄 && H.旗の下の城数(t, f) >= t.castles.length * H.天下人の版図) break;
    if (c.faction !== f) c.faction = f;
  }
  const 位 = H.courtRank(t, f);
  確('段が進む', 初 !== 段(), `${初} → ${段()}`);
  確('位が付く', !!位 && !!位.号令, (位 || {}).key || 'なし');
  確('号令できる', H.号令できるか(t, f) === true);
}

console.log('\n── 四　古い掟でしか成り立たない役は、月が変われば繕われる');
{
  /* 当主のいる国に国主を置かない掟は後から入れた。古い記録にはその姿が残る。
     読んだだけでは直らない（繕いは采配の中にある）が、一月で消える。 */
  const t = H.migrateSave(JSON.parse(JSON.stringify(生)));
  const f = [...new Set(t.castles.map((c) => c.faction))]
    .find((x) => {
      const l = t.generals.find((g) => g.faction === x && g.lord);
      if (!l || l.at == null) return false;
      const c = t.castles.find((y) => y.id === l.at);
      return c && t.castles.some((y) => y.kuni === c.kuni && y.faction === x && y.id !== c.id
        && t.generals.some((g) => g.faction === x && !g.lord && g.at === y.id));
    });
  if (!f) { 確('（仕込める家が無かった）', true); }
  else {
    const l = t.generals.find((g) => g.faction === f && g.lord);
    const c = t.castles.find((y) => y.id === l.at);
    const 誰 = t.generals.find((g) => g.faction === f && !g.lord
      && (t.castles.find((y) => y.id === g.at) || {}).kuni === c.kuni && g.at !== c.id);
    誰.役 = '国主';
    const 前 = 当主の国の国主(t);
    確('仕込めた（当主のいる国に国主がいる）', 前 > 0, `${t.factions[f].name}　${c.kuni}　${前}件`);
    t.autoPlay = true;
    let u = t, 跡 = [];
    for (let i = 0; i < 3; i++) { u = 送る(u); 跡.push(当主の国の国主(u)); }
    確('月が変われば繕われる', 跡[跡.length - 1] === 0, `${前} → ${跡.join(' → ')}件`);
  }
}

console.log('\n── 五　古い緩い関門で結ばれた旗の下は、検め直せば解ける');
{
  const t = H.migrateSave(JSON.parse(JSON.stringify(生)));
  const 家ら = [...new Set(t.castles.map((c) => c.faction))].sort((a, b) => 石(t, b) - 石(t, a));
  const 主 = 家ら[0];
  const 下 = 家ら.find((x) => x !== 主 && 石(t, x) > 石(t, 主) * 0.5);   // 比 二倍に満たぬ相手
  const 鍵 = `${主}|${下}`, 逆 = `${下}|${主}`;
  t.relations = t.relations || {};
  const 既 = t.relations[鍵] || t.relations[逆] || { trust: 90 };
  const k = t.relations[逆] ? 逆 : 鍵;
  t.relations[k] = Object.assign({}, 既, { state: '従属', master: 主, trust: 90 });
  const 比 = 石(t, 主) / Math.max(1, 石(t, 下));
  確('仕込めた（二倍に満たぬ比の従属）', 比 < 2, `${t.factions[主].name} ← ${t.factions[下].name}　${比.toFixed(2)}倍`);
  const 解 = H.旗の下を検め直す(t);
  確('検め直せば解ける', t.relations[k].state !== '従属',
    `${比.toFixed(2)}倍　→　${t.relations[k].state}（解けた組 ${解.length}）`);
}

console.log('\n── 六　古い記録から続けて走らせても、盤は乱れない');
{
  賽を据える(777);
  let t = H.migrateSave(JSON.parse(JSON.stringify(生)));
  t.autoPlay = true;
  const 見た = new Set();
  const 検 = () => {
    const 軍中 = new Set(t.armies.flatMap((a) => a.gens || []));
    for (const g of t.generals) {
      if (g.captive) continue;
      if (g.at == null) { if (!軍中.has(g.id)) 見た.add('どこにも居ない将'); continue; }
      const c = t.castles.find((y) => y.id === g.at);
      if (!c) { 見た.add('無い城にいる将'); continue; }
      if (c.faction !== g.faction) 見た.add('他家の城にいる将');
    }
    for (const c of t.castles) if (c.troops < 0) 見た.add('兵が負の城');
    if (当主の国の国主(t) > 0) 見た.add('当主のいる国の国主');
  };
  let 倒 = null;
  for (let i = 0; i < 60; i++) {
    try { t = 送る(t); } catch (e) { 倒 = `${t.year}年${t.month}月　${e.message}`; break; }
    検();
  }
  確('五年走らせても倒れない', !倒, 倒 || `${t.year}年${t.month}月まで進んだ`);
  確('道理に背く姿が出ない', 見た.size === 0, [...見た].join('・') || 'なし');
}

console.log('\n── 七　続きを書き戻しても、また読める');
{
  賽を据える(31);
  let t = H.migrateSave(JSON.parse(JSON.stringify(生)));
  t.autoPlay = true;
  t = 送る(t);
  const 文 = JSON.stringify(t);
  const u = H.migrateSave(JSON.parse(文));
  確('往復しても欠けない', u.castles.length === t.castles.length
    && u.generals.length === t.generals.length,
    `城${u.castles.length}　将${u.generals.length}`);
}

console.log('\n── 八　死んだ将は、記録を読み直しても生き返らない');
{
  /* 盤の増補は「まだ盤にいない武将」を据える。死んだ者は盤にいないのだから、
     控えを持たなければ増補が据え直す。実測では、二十年遊んだ記録を読み直すと
     五十九人が生き返った（斎藤道三・武田信虎・松平広忠……）。 */
  const t = H.migrateSave(JSON.parse(JSON.stringify(生)));
  const 死 = t.generals.find((g) => g.at && !g.架空 && !g.lord);
  const 名 = 死.name;
  H.将を除く(t, 死.id);
  確('除けば控えに載る', (t.物故 || []).includes(死.id), `${名}　控え ${(t.物故 || []).length}人`);
  const u = H.migrateSave(JSON.parse(JSON.stringify(t)));
  確('読み直しても生き返らない', !u.generals.some((g) => g.id === 死.id), 名);

  /* 控えに載っていない者は「後から足した武将」であるから、これまでどおり盤に出る。 */
  const v = H.migrateSave(JSON.parse(JSON.stringify(生)));
  v.物故 = [];
  /* 増補が据えるのは「元の城がまだ元の家のものである」者に限る（他家に落ちた城へ
     昔の家臣を湧かせない）。元の姿は、立てたばかりの盤に聞く。 */
  const 原 = H.initState('oda');
  const 新 = 原.generals.find((g) => g.at && !g.架空 && !g.lord
    && (v.castles.find((c) => c.id === g.at) || {}).faction === g.faction
    && v.generals.some((x) => x.id === g.id));
  const 新名 = 新.name;
  v.generals = v.generals.filter((g) => g.id !== 新.id);
  const w = H.migrateSave(JSON.parse(JSON.stringify(v)));
  確('後から足した武将は、これまでどおり盤に出る', w.generals.some((g) => g.id === 新.id), 新名);

  /* 控えの欄の無い古い記録は、いま欠けている者を死者と見なす。 */
  const y = JSON.parse(JSON.stringify(生));
  delete y.物故;
  const 欠 = y.generals.find((g) => g.at && !g.架空 && !g.lord);
  const 欠名 = 欠.name;
  y.generals = y.generals.filter((g) => g.id !== 欠.id);
  const z = H.migrateSave(y);
  確('控えの無い古い記録は、欠けた者を死者と見なす',
    !z.generals.some((g) => g.id === 欠.id) && (z.物故 || []).includes(欠.id),
    `${欠名}　控えに載せた数 ${(z.物故 || []).length}人`);
}

console.log('\n── 九　長く遊んだ記録でも、読み直しで人が湧かない');
{
  賽を据える(4649);
  let t = H.migrateSave(JSON.parse(JSON.stringify(生)));
  t.autoPlay = true;
  for (let i = 0; i < 60; i++) t = 送る(t);          // 五年ぶん、さらに遊ぶ
  const 前 = t.generals.length;
  const u = H.migrateSave(JSON.parse(JSON.stringify(t)));
  const T = new Set(t.generals.map((g) => g.id));
  const 湧 = u.generals.filter((g) => !T.has(g.id));
  確('読み直しても将の数が変わらない', 湧.length === 0,
    `${前}人 → ${u.generals.length}人　物故の控え ${(t.物故 || []).length}人`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
