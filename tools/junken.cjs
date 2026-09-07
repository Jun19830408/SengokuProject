/* 巡検（じゅんけん）── 盤を勝手に進ませ、道理に背く姿を探す道具。

   遊んでいて見つかる不具合は、たいてい「あり得ない盤面」になっている。
   将が他家の城に立っている、当主が本拠に居ない、城主の居ない城主、
   兵が負の数になっている――そういうものである。ならば、遊ぶ側が気づくのを
   待たずに、盤を何十年も走らせて毎月それを検めればよい。

   使い方:
     node tools/junken.cjs              … 種を八つ、各三十年
     node tools/junken.cjs 20 60        … 種を二十、各六十年
     node tools/junken.cjs --seed 1234  … その種だけを詳しく
     --sonomama を添えれば、束ね直しを省いて即座に走る

   背きが見つかれば、種と年月と背いた事を出す。同じ種を与えれば同じ盤が出るので、
   そこから先は手で追える（tests/onaji.cjs がその再現性を担保している）。

   これは試験ではない。試験は「こうあるべし」を先に書いて確かめるものだが、
   巡検は「あり得ぬ姿」を後から拾うものである。拾ったものを試験に落とすまでが
   仕事であって、巡検が通ったから正しい、とは言えない。 */
const path = require('path');
const { buildHarness } = require('./bundle.cjs');

const 引数 = process.argv.slice(2);
const 指した種 = (() => { const i = 引数.indexOf('--seed'); return i >= 0 ? Number(引数[i + 1]) : null; })();
const 種の数 = 指した種 != null ? 1 : Number(引数[0] || 8);
const 年数 = Number((指した種 != null ? 引数[引数.indexOf('--seed') + 2] : 引数[1]) || 30);

// 束ね直しに十数秒かかる。続けて回すときは --sonomama を付ける
if (require.main === module && !引数.includes('--sonomama')) { buildHarness('split'); }
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

/* 賽を種から作る。tests/onaji.cjs と同じ作り。 */
const 賽を据える = (種) => {
  let x = 種 | 0;
  Math.random = function () {
    x |= 0; x = (x + 0x6D2B79F5) | 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ── 不変式 ──────────────────────────────────────────────
   どの月のどの盤でも、必ずこうなっていなければならないという事柄。
   一つずつ名を付けておく。名が出れば、どこを見ればよいかが分かる。 */
const 不変式 = [
  ['将は自家の城か軍中にいる', (s) => {
    const 軍中 = new Set(s.armies.flatMap((a) => a.gens || []));
    const 咎 = [];
    for (const g of s.generals) {
      if (g.captive) continue;                        // 捕虜は他家の城にいてよい
      if (g.at == null) { if (!軍中.has(g.id)) 咎.push(`${g.name}はどこにも居ない`); continue; }
      const c = s.castles.find((x) => x.id === g.at);
      if (!c) { 咎.push(`${g.name}は無い城(${g.at})にいる`); continue; }
      if (c.faction !== g.faction) 咎.push(`${g.name}(${(s.factions[g.faction]||{}).name})が${c.name}(${(s.factions[c.faction]||{}).name})にいる`);
    }
    return 咎;
  }],
  ['将は二つの軍に属さない', (s) => {
    const 見た = new Map(); const 咎 = [];
    for (const a of s.armies) for (const id of (a.gens || [])) {
      if (見た.has(id)) 咎.push(`${(s.generals.find((g)=>g.id===id)||{}).name || id}が${見た.get(id)}と${a.id}の両方にいる`);
      else 見た.set(id, a.id);
    }
    return 咎;
  }],
  ['軍に幽霊の将がいない', (s) => {
    const 咎 = [];
    for (const a of s.armies) for (const id of (a.gens || [])) {
      const g = s.generals.find((x) => x.id === id);
      if (!g) { 咎.push(`${a.id}に居ないはずの将(${id})が残っている`); continue; }
      if (g.captive) 咎.push(`${g.name}は捕らわれているのに${a.id}にいる`);
      if (g.at != null) 咎.push(`${g.name}は${a.id}にいながら城(${g.at})にも立っている`);
    }
    return 咎;
  }],
  ['本領は自家の城である', (s) => {
    const 咎 = [];
    for (const g of s.generals) {
      if (g.captive || g.本領 == null) continue;
      const c = s.castles.find((x) => x.id === g.本領);
      if (!c) { 咎.push(`${g.name}の本領が無い城(${g.本領})`); continue; }
      if (c.faction !== g.faction) 咎.push(`${g.name}の本領${c.name}は${(s.factions[c.faction]||{}).name}のもの`);
    }
    return 咎;
  }],
  ['本拠は自家の城である', (s) => {
    const 咎 = [];
    for (const fid of Object.keys(s.factions)) {
      const 我 = s.castles.filter((c) => c.faction === fid);
      if (!我.length) continue;                        // 滅んだ家は問わない
      const h = s.factions[fid].本拠;
      if (!h) { 咎.push(`${s.factions[fid].name}に本拠が無い`); continue; }
      if (!我.some((c) => c.id === h)) 咎.push(`${s.factions[fid].name}の本拠が自領にない`);
    }
    return 咎;
  }],
  ['城主はその城にいる自家の将である', (s) => {
    const 咎 = [];
    for (const c of s.castles) {
      if (!c.lordId) continue;
      const g = s.generals.find((x) => x.id === c.lordId);
      if (!g) { 咎.push(`${c.name}の城主(${c.lordId})が居ない`); continue; }
      if (g.captive) 咎.push(`${c.name}の城主${g.name}は捕らわれている`);
      else if (g.faction !== c.faction) 咎.push(`${c.name}の城主${g.name}は他家の者`);
    }
    return 咎;
  }],
  ['数が負にならない', (s) => {
    const 咎 = [];
    for (const c of s.castles) {
      for (const k of ['local', 'food', 'koku', 'comm', 'pop', 'horse', 'gun']) {
        if (typeof c[k] === 'number' && c[k] < 0) 咎.push(`${c.name}の${k}が${Math.round(c[k])}`);
        if (typeof c[k] === 'number' && !Number.isFinite(c[k])) 咎.push(`${c.name}の${k}が数でない`);
      }
    }
    for (const a of s.armies) {
      if (a.local < 0) 咎.push(`${a.id}の兵が${Math.round(a.local)}`);
      if (a.men < 0) 咎.push(`${a.id}の総勢が${Math.round(a.men)}`);
      if (!Number.isFinite(a.men)) 咎.push(`${a.id}の総勢が数でない`);
    }
    for (const f of Object.values(s.factions)) {
      if (typeof f.gold === 'number' && !Number.isFinite(f.gold)) 咎.push(`${f.name}の金が数でない`);
    }
    return 咎;
  }],
  ['軍の出どころと居所が実在する', (s) => {
    const 咎 = [];
    for (const a of s.armies) {
      if (!s.factions[a.faction]) 咎.push(`${a.id}の家(${a.faction})が無い`);
      if (a.from && !s.castles.some((c) => c.id === a.from)) 咎.push(`${a.id}の出陣元(${a.from})が無い`);
      if (a.at && !s.castles.some((c) => c.id === a.at)) 咎.push(`${a.id}の居所(${a.at})が無い`);
      if (a.在陣 && !s.castles.some((c) => c.id === a.在陣)) 咎.push(`${a.id}の在陣先(${a.在陣})が無い`);
    }
    return 咎;
  }],
  ['滅んだ家に軍が残らない', (s) => {
    const 咎 = [];
    for (const fid of Object.keys(s.factions)) {
      if (s.castles.some((c) => c.faction === fid)) continue;
      const 残 = s.armies.filter((a) => a.faction === fid);
      if (残.length) 咎.push(`滅んだ${s.factions[fid].name}に${残.length}軍が残っている`);
    }
    return 咎;
  }],
  ['囲みと戦役が実在の軍と城を指す', (s) => {
    const 咎 = [];
    for (const sg of (s.sieges || [])) {
      if (!s.armies.some((a) => a.id === sg.armyId)) 咎.push(`囲み(${sg.castleId})の軍(${sg.armyId})が無い`);
      if (!s.castles.some((c) => c.id === sg.castleId)) 咎.push(`囲みの城(${sg.castleId})が無い`);
    }
    for (const cp of (s.campaigns || [])) {
      if (!s.castles.some((c) => c.id === cp.target)) 咎.push(`戦役(${cp.id})の的(${cp.target})が無い`);
      for (const id of (cp.armies || [])) {
        if (!s.armies.some((a) => a.id === id)) 咎.push(`戦役(${cp.id})が無い軍(${id})を数えている`);
      }
    }
    return 咎;
  }],
  ['家の名と当主が保たれる', (s) => {
    const 咎 = [];
    for (const fid of Object.keys(s.factions)) {
      if (!s.castles.some((c) => c.faction === fid)) continue;
      const 主 = s.generals.filter((g) => g.faction === fid && g.lord && !g.captive);
      if (主.length > 1) 咎.push(`${s.factions[fid].name}に当主が${主.length}人いる`);
      if (主.length === 0 && s.generals.some((g) => g.faction === fid && !g.captive)) {
        咎.push(`${s.factions[fid].name}に当主が居ない（家臣はいる）`);
      }
    }
    return 咎;
  }],
];

/* ── 一つの種を走らせる ────────────────────────────────── */
const 走らせる = (種, 年数, 詳しく) => {
  賽を据える(種);
  let s = H.initState('oda');
  s.autoPlay = true;                                  // 遊ぶ側も采配に任せる
  const 見つけた = [];
  /* 同じ背きは何百月と続く（三浦貞広が他家の城に立ったままなら毎月出る）。
     初めの一件だけを控え、以後は数だけ足す。そうしないと、続く背きで枠が
     埋まり、後から出るはずの本当の不具合が見えない。 */
  const 控え = new Map();
  const 検める = (いつ) => {
    for (const [名, 検] of 不変式) {
      let 咎 = [];
      try { 咎 = 検(s) || []; } catch (e) { 咎 = [`検めが倒れた: ${e.message}`]; }
      for (const x of 咎) {
        const 鍵 = `${名}｜${x.replace(/\d+/g, 'N')}`;
        if (控え.has(鍵)) { 控え.get(鍵).数++; continue; }
        const 件 = { 種, いつ, 名, 事: x, 数: 1 };
        控え.set(鍵, 件); 見つけた.push(件);
      }
    }
  };
  検める('初め');
  for (let i = 0; i < 年数 * 12; i++) {
    const いつ = `${s.year}年${s.month}月`;
    try { s = H.advanceMonth(s); } catch (e) {
      見つけた.push({ 種, いつ, 名: '月送りが倒れた', 事: e.message });
      break;
    }
    /* 着いた軍と行き合いの始末は、画面（MapScreen）が回している。月送りを
       呼ぶだけでは誰も捌かないので、着いた軍が的の前に立ったまま何十年も
       残る（一度これで八十軍が凍り、盤がまったくまとまらなかった）。
       采配に任せた盤と同じになるよう、ここで画面と同じ始末をつける。 */
    try {
      for (let k = 0; k < 60 && (s.clashes || []).length; k++) s = H.resolveClashOffscreen(s);
      for (let k = 0; k < 120 && (s.pendingArrivals || []).length; k++) {
        const id = s.pendingArrivals[0];
        const a = (s.armies || []).find((x) => x.id === id);
        const 的 = a && s.castles.find((c) => c.id === a.at);
        if (!a || !的) { s.pendingArrivals = s.pendingArrivals.slice(1); continue; }
        s = H.resolveOffscreen(s, a.id, 的.id);
      }
    } catch (e) {
      見つけた.push({ 種, いつ, 名: '着陣の始末が倒れた', 事: e.message });
    }
    /* 遊ぶ側に問われる筋（滅亡の始末）に答える者がいない。溜めたままにすると
       滅んだ家の将が敵城に立ったまま残り、本当の乱れが見えなくなる。
       画面で問われた者が答えるのと同じ場所――月が明けてすぐ――で始末をつける。 */
    if (s.warSettle) {
      const w = s.warSettle;
      try { H.滅んだ家を始末する(s, w.faction, w.winner, w.castleId); } catch (e) { /* 始末できずとも進む */ }
      s.warSettle = null;
    }
    検める(`${s.year}年${s.month}月`);
    if (詳しく && i % 60 === 0) {
      const 家 = new Set(s.castles.map((c) => c.faction)).size;
      process.stdout.write(`      ${s.year}年　残る家 ${家}　軍 ${s.armies.length}\n`);
    }
    if (見つけた.length > 30) break;                  // 種類が増えすぎたら、その種は見切る
  }
  return { 見つけた, 果て: `${s.year}年`, 家数: new Set(s.castles.map((c) => c.faction)).size };
};

module.exports = { 不変式, 走らせる, 賽を据える };

if (require.main === module) {
  /* ── 走らせる ─────────────────────────────────────────── */
  console.log(`巡検　種 ${種の数} 通り × ${年数} 年\n`);
  const 全て = [];
  const 種ら = 指した種 != null ? [指した種] : Array.from({ length: 種の数 }, (_, i) => 0x51000 + i * 7919);
  for (const 種 of 種ら) {
    const t0 = Date.now();
    const r = 走らせる(種, 年数, 指した種 != null);
    const 秒 = Math.round((Date.now() - t0) / 1000);
    console.log(`  種 ${種}　${r.果て}まで　残る家 ${r.家数}　${秒}秒　${r.見つけた.length ? `★背き ${r.見つけた.length} 種` : '背きなし'}`);
    全て.push(...r.見つけた);
  }

  console.log('');
  if (!全て.length) {
    console.log('道理に背く盤は見つからなかった。');
  } else {
    /* 同じ事が何百と出るので、名と事の形でまとめる。数は見せる。 */
    const 束 = new Map();
    for (const x of 全て) {
      const 鍵 = `${x.名}｜${x.事.replace(/\d+/g, 'N')}`;
      if (!束.has(鍵)) 束.set(鍵, { ...x, 数: 0 });
      束.get(鍵).数 += x.数;
    }
    const のべ = 全て.reduce((a, x) => a + x.数, 0);
    console.log(`★ 背きを ${束.size} 種、のべ ${のべ} 件見つけた\n`);
    for (const x of [...束.values()].sort((a, b) => b.数 - a.数)) {
      console.log(`  ［${x.名}］${x.事}`);
      console.log(`      のべ ${x.数} 件　初めは 種 ${x.種} の ${x.いつ}`);
    }
  }
  console.log('');
  console.log('エラー:', 全て.length ? `${全て.length}件` : 'なし');
  process.exit(0);                                      // 巡検は「見つける」道具である。倒れはしない
}
