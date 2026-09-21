/* ==========================================================================
   天下分け目（GDD 12.6）

   挑める条件、出す兵（出し惜しみができないこと）、集結、野の選び、
   六十四隊の盤、そして戦の跡（割譲・逃散・間柄・将の生き死に）を検める。
   ========================================================================== */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const {
  initState, advanceMonth, migrateSave, 出せる兵, minGarrison,
  分け目の野, 野を探す, 直轄の石高, 版図の石高, 石高の順, 並びの隣か,
  天下分け目を挑めるか, 挑める家ら, 器量くらべ, 野を選ぶ側, 分け目の顔ぶれ, 分け目の兵,
  分け目の備えを組む, 集結の月数, 天下分け目を起こす, 分け目を進める,
  接する国ら, 割譲の城ら, 割譲の限り, 逃散の割, 兵を逃散させる, 上下の縁を解く,
  敗れた将の始末, 国を割譲する, 分け目の沙汰, 分け目の限り, 分け目の暮れ,
  分け目の盤を組む, 分け目の戦果, stepBattle, corpsMen, 圧す, 解す, 野の見立て, 挑める見込み,
} = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* 大身の家を二つこしらえる。城を配って石高と兵を持たせる。 */
function 大身の盤() {
  const s = initState('oda');
  const 国ら = [...new Set(s.castles.map((c) => c.kuni))];
  const 甲 = 'oda', 乙 = 'imagawa';
  /* 東西に分けて、隣り合う版図にする。 */
  const 並 = s.castles.slice().sort((a, b) => (a.x || 0) - (b.x || 0));
  const 半 = Math.floor(並.length / 2);
  並.forEach((c, i) => {
    c.faction = i < 半 ? 乙 : 甲;
    c.koku = Math.max(c.koku, 30000);
    c.local = Math.max(c.local, 1200);
    c.rost = null;
  });
  for (const g of s.generals) {
    const 城 = s.castles.find((c) => c.id === g.at);
    if (城) g.faction = 城.faction; else g.faction = 甲;
    g.captive = null;
    g.retinue = Math.max(g.retinue || 0, 200);
  }
  /* 当主を一人ずつ立てる。 */
  for (const f of [甲, 乙]) {
    const 己 = s.generals.filter((g) => g.faction === f);
    for (const g of 己) g.lord = false;
    if (己[0]) 己[0].lord = true;
    s.factions[f].本拠 = (s.castles.find((c) => c.faction === f) || {}).id;
  }
  /* 他の家は盤から下ろす（並びの隣どうしにするため）。 */
  s.armies = [];
  void 国ら;
  return { s, 甲, 乙 };
}

console.log('── 一　挑める条件');
{
  const { s, 甲, 乙 } = 大身の盤();
  確('直轄も版図も足りている', 直轄の石高(s, 甲) >= 2000000 && 版図の石高(s, 乙) >= 1200000,
    `${Math.round(直轄の石高(s, 甲) / 10000)}万石 × ${Math.round(版図の石高(s, 乙) / 10000)}万石`);
  確('石高の並びで隣り合っている', 並びの隣か(s, 甲, 乙));
  const 可 = 天下分け目を挑めるか(s, 甲, 乙);
  確('挑める', 可.ok, 可.why || '');
  確('挑める家に挙がる', 挑める家ら(s, 甲).includes(乙));

  /* 惣無事令を発していれば挑めない。 */
  const t = JSON.parse(JSON.stringify(s));
  t.惣無事令の控え = { [甲]: { y: t.year, m: t.month } };
  確('惣無事令を発したら挑めない', !天下分け目を挑めるか(t, 甲, 乙).ok,
    (天下分け目を挑めるか(t, 甲, 乙).why || '').slice(0, 24));

  /* 小身の家へは挑めない。 */
  const u = JSON.parse(JSON.stringify(s));
  const 小 = 'asakura';
  u.factions[小] = u.factions[小] || { name: '朝倉家', color: '#888' };
  const 一城 = u.castles.find((c) => c.faction === 乙);
  一城.faction = 小; 一城.koku = 10000;
  確('版図の足りぬ家へは挑めない', !天下分け目を挑めるか(u, 甲, 小).ok);

  /* 一度決した相手へは、信用が薄れるまで挑めない。 */
  const v = JSON.parse(JSON.stringify(s));
  v.分け目の控え = { [[甲, 乙].sort().join('|')]: { y: v.year, m: v.month, 勝: 甲, 負: 乙 } };
  v.relations[[甲, 乙].sort().join('|')] = { trust: 60, state: '中立', until: null };
  確('一度決した相手へは続けて挑めない', !天下分け目を挑めるか(v, 甲, 乙).ok);
  v.relations[[甲, 乙].sort().join('|')].trust = 40;
  確('誼が薄れればまた挑める', 天下分け目を挑めるか(v, 甲, 乙).ok);
}

console.log('\n── 一の二　挑める家がいないあいだは、盤に触れない');
{
  /* 月送りのたびに賽を引くと、それだけで賽の流れがずれ、天下分け目とは関わりの
     ない盤まで別の歴史になる（実測：三十年走らせて一度も起きていないのに、
     古い記録の試験が倒れた）。挑めるほどの家がいるかを先に検め、いなければ
     賽を引かずに切り上げる。 */
  const 素 = initState('oda');
  確('開いた盤では、挑める見込みがない', 挑める見込み(素) === false);
  const 大 = initState('oda');
  let 積 = 0;
  for (const c of 大.castles) { c.faction = 'oda'; c.koku = 200000; 積 += c.koku; }
  確('直轄が二百万石を超えれば見込みが立つ', 挑める見込み(大) === true, `${Math.round(積 / 10000)}万石`);
  /* 月送りを走らせても、挑める家がいなければ賽の流れは変わらない
     ――同じ種から同じ盤が出る。 */
  const 走 = (種0) => {
    let 種 = 種0;
    const 元 = Math.random;
    Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    let u = initState('oda'); u.autoPlay = true;
    for (let m = 0; m < 24; m++) u = advanceMonth(u);
    Math.random = 元;
    return u.castles.map((c) => `${c.id}:${c.faction}:${c.local}`).join('|');
  };
  確('同じ種からは同じ盤が出る（触れが立たぬあいだ）', 走(9) === 走(9));
}

console.log('\n── 二　出す兵（出し惜しみができないこと）');
{
  const { s, 甲 } = 大身の盤();
  const 顔 = 分け目の顔ぶれ(s, 甲);
  const 兵 = 分け目の兵(s, 甲);
  const 総 = s.castles.filter((c) => c.faction === 甲).reduce((a, c) => a + 出せる兵(s, c), 0);
  確('自領のすべての城が出る', 顔.length === s.castles.filter((c) => c.faction === 甲
    && 出せる兵(s, c) > 0 && s.generals.some((g) => g.at === c.id && g.faction === 甲)).length,
    `${顔.length}城`);
  確('出す兵は「出せる兵」の総和に等しい', 兵 === 総, `${兵}人`);
  const 備 = 分け目の備えを組む(s, 甲);
  確('隊は三十二を超えない', 備.length <= 分け目の限り, `${備.length}隊`);
  確('城が多くても兵は落ちない', 備.reduce((a, x) => a + x.兵, 0) === 兵,
    `${備.reduce((a, x) => a + x.兵, 0)}人`);
}

console.log('\n── 三　野の選びと集結');
{
  const { s, 甲, 乙 } = 大身の盤();
  確('野は十枚ある', 分け目の野.length === 10, `${分け目の野.length}枚`);
  確('どの野にも守勢と攻勢の陣がある',
    分け目の野.every((f) => f.陣 && f.陣.守 && f.陣.攻 && f.陣.守.幅 > 0 && f.陣.攻.幅 > 0));
  const 器 = (f) => 器量くらべ(s, f);
  const 選 = 野を選ぶ側(s, 甲, 乙);
  確('器量くらべで野を選ぶ側が決まる', 選 === null || 選 === 甲 || 選 === 乙,
    `${器(甲)} 対 ${器(乙)} → ${選 ? (s.factions[選] || {}).name : 'どちらとも決まらず'}`);
  /* 相手が野を選ぶときの見立て。兵で劣る側は狭い野を選ぶ。 */
  {
    const 狭 = ['toride', 'airo', 'futakawa', 'ochiai', 'kougen'];
    let 狭を選んだ = 0;
    for (let i = 0; i < 40; i++) {
      const t = JSON.parse(JSON.stringify(s));
      /* 乙を兵で劣らせる（城の兵を削る） */
      for (const c of t.castles) if (c.faction === 乙) c.local = Math.round(c.local * 0.3);
      if (狭.includes(野の見立て(t, 乙, 甲))) 狭を選んだ++;
    }
    確('兵で劣る側は狭い野を選ぶ', 狭を選んだ >= 30, `${狭を選んだ}／40`);
  }
  const 月 = 集結の月数(s, 甲);
  確('集結の月数は一から半年', 月 >= 1 && 月 <= 6, `${月}ヶ月`);
  const w = 天下分け目を起こす(s, 甲, 乙, { 野: 'futakawa' });
  確('触れが立つ', !!w && w.挑 === 甲 && w.受 === 乙 && !!野を探す(w.野), w ? w.野 : '');
  確('待ち月が入る', w.残り >= 1 && w.残り === w.待ち, `${w.残り}ヶ月`);
  let n = 0;
  while (s.分け目 && s.分け目.残り > 0 && n < 12) { 分け目を進める(s); n++; }
  確('月を送れば兵が集まる', s.分け目 && s.分け目.残り === 0, `${n}ヶ月`);
}

console.log('\n── 四　六十四隊の盤');
{
  const { s, 甲, 乙 } = 大身の盤();
  s.player = 甲;
  天下分け目を起こす(s, 甲, 乙, { 野: 'daiheiya' });
  const 出せた = 分け目の兵(s, 甲);        // 盤を組むと帳から引かれるので、先に数える
  const 組 = 分け目の盤を組む(s, s.分け目, { 味方: 甲 });
  確('盤が組める', !!組 && !!組.b, 組 ? `${組.b.corps.length}隊` : '');
  const b = 組.b;
  const P = b.corps.filter((c) => c.side === 'P'), E = b.corps.filter((c) => c.side === 'E');
  確('片軍は三十二隊まで', P.length <= 分け目の限り && E.length <= 分け目の限り, `${P.length}隊 対 ${E.length}隊`);
  確('双方とも隊が立っている', P.length > 0 && E.length > 0);
  確('日暮れは常の合戦より遠い', b.dusk === 分け目の暮れ, `${b.dusk}`);
  確('互いに見えている（筋書きの野）', b.筋書き === true);
  const 兵 = (ls) => ls.reduce((a, c) => a + corpsMen(c), 0);
  確('盤に載った兵は、出せる兵と釣り合う', Math.abs(兵(P) - 出せた) < 出せた * 0.02,
    `盤${兵(P)}人 対 台帳${出せた}人`);
  /* 両軍が離れて向き合っているか（陣が重なっていないこと）。 */
  const 平 = (ls) => ({ x: ls.reduce((a, c) => a + c.x, 0) / ls.length, y: ls.reduce((a, c) => a + c.y, 0) / ls.length });
  const a = 平(P), e = 平(E);
  const 隔 = Math.hypot(a.x - e.x, a.y - e.y);
  確('両軍は千五百歩以上離れて向かい合う', 隔 > 1500, `${Math.round(隔)}歩`);
  /* 少し回して、盤が動くことを見る（布陣の段から戦へ移す）。 */
  b.phase = 'fight';
  for (let i = 0; i < 200; i++) stepBattle(b, 0.5);
  確('盤が回る', b.t > 0 && b.corps.some((c) => c.order !== '待機'), `t=${Math.round(b.t)}秒`);
  const 果 = 分け目の戦果(b, 甲);
  確('戦果が数えられる', 果.出した兵 > 0 && 果.隊 > 0,
    `出した兵${果.出した兵}／崩れた隊${果.崩れた隊}`);
}

console.log('\n── 四の二　兵の出納');
{
  const { s, 甲, 乙 } = 大身の盤();
  s.player = 甲;
  天下分け目を起こす(s, 甲, 乙, { 野: 'daiheiya' });
  const 帳 = () => s.castles.filter((c) => c.faction === 甲).reduce((a, c) => a + (c.local || 0), 0)
    + s.generals.filter((gg) => gg.faction === 甲 && !gg.captive).reduce((a, gg) => a + (gg.retinue || 0), 0);
  const 城のみ = () => s.castles.filter((c) => c.faction === 甲).reduce((a, c) => a + (c.local || 0), 0);
  const 前 = 帳(), 前城 = 城のみ();
  const 出せた = 分け目の兵(s, 甲);
  const 組 = 分け目の盤を組む(s, s.分け目, { 味方: 甲 });
  const 後 = 帳(), 後城 = 城のみ();
  const 盤兵 = 組.b.corps.filter((c) => c.side === 'P')
    .reduce((a, c) => a + c.squads.reduce((t, q) => t + q.men, 0), 0);
  /* 隊の頭の手勢（直属）は、戦が終わるまで将の帳に載ったままである（常の野戦と同じ）。
     引かれるのは、それ以外――城の在地の兵と、供の将の手勢である。 */
  const 盤の直属 = 組.b.corps.filter((c) => c.side === 'P')
    .reduce((a, c) => a + c.squads.filter((q) => q.origin === '直属').reduce((t, q) => t + q.men, 0), 0);
  確('盤へ出した兵は、国の帳から引かれている',
    Math.abs((前 - 後) - (盤兵 - 盤の直属)) < 盤兵 * 0.02,
    `帳 ${前}→${後}（−${前 - 後}）／盤 ${盤兵}（うち直属 ${盤の直属}）`);
  確('引かれた兵は「出せる兵」に釣り合う', Math.abs(出せた - (前 - 後)) < 出せた * 0.05,
    `出せる兵 ${出せた}／引かれた ${前 - 後}`);
  確('留守居は城に残る', 後城 > 0 && 後城 < 前城, `${前城}→${後城}人`);
}

console.log('\n── 五　戦の跡');
{
  const { s, 甲, 乙 } = 大身の盤();
  /* 旗の下の家を一つ作る（沙汰で独り立ちするのを見る）。 */
  const 丙 = 'takeda';
  const 城 = s.castles.filter((c) => c.faction === 乙).slice(0, 2);
  for (const c of 城) c.faction = 丙;
  for (const g of s.generals) if (城.some((c) => c.id === g.at)) g.faction = 丙;
  s.relations[[乙, 丙].sort().join('|')] = { trust: 70, state: '臣従', master: 乙, until: null };

  const 国ら = 接する国ら(s, 甲, 乙);
  確('勝者の領と接する国が挙がる', 国ら.length > 0, `${国ら.length}国`);
  const 国 = 国ら[0];
  const 渡 = 割譲の城ら(s, 甲, 乙, 国);
  確('渡る城は五つまで', 渡.length <= 割譲の限り, `${渡.length}城`);

  const 前の兵 = s.castles.filter((c) => c.faction === 乙).reduce((a, c) => a + c.local, 0);
  const 出た将ら = s.generals.filter((g) => g.faction === 乙).map((g) => g.id);
  const 報 = [];
  const 跡 = 分け目の沙汰(s, { 勝: 甲, 負: 乙, 国, 敗走兵: 6000, 出した兵: 20000,
    出た将ら, 告げる: (t) => 報.push(t) });

  確('城が渡った', 跡.渡った城.length > 0 && 跡.渡った城.every((id) =>
    s.castles.find((c) => c.id === id).faction === 甲), `${跡.渡った城.length}城`);
  確('渡った城の武将は敗者のまま', s.generals.every((g) => !跡.渡った城.includes(g.at) || g.faction !== 乙)
    && s.generals.some((g) => g.faction === 乙), '本拠へ引き移る');
  const 割 = 逃散の割(6000, 20000);
  確('逃散の割は敗走の割に連れる', Math.abs(跡.割 - 割) < 1e-9 && 割 > 0.05 && 割 < 0.2,
    `${Math.round(割 * 1000) / 10}%`);
  const 後の兵 = s.castles.filter((c) => c.faction === 乙).reduce((a, c) => a + c.local, 0);
  確('兵が逃げ散っている', 後の兵 < 前の兵 && 跡.逃散 > 0, `${前の兵}→${後の兵}`);
  確('旗の下の家が独り立ちした',
    (s.relations[[乙, 丙].sort().join('|')] || {}).state === '中立'
    && (s.relations[[乙, 丙].sort().join('|')] || {}).trust === 0, 跡.解けた.join(','));
  確('勝者との信用は六十', Math.round((s.relations[[甲, 乙].sort().join('|')] || {}).trust) === 60);
  確('同じ相手への控えが残る', !!(s.分け目の控え || {})[[甲, 乙].sort().join('|')]);
  確('触れは畳まれる', s.分け目 == null);
  確('当主は捕らわれない', !s.generals.some((g) => g.lord && g.captive));
  const 討 = 跡.討.length, 捕 = 跡.捕.length;
  確('討死は捕縛より稀', 討 <= Math.max(1, 捕), `討死${討}／捕縛${捕}／出た将${出た将ら.length}`);
}

console.log('\n── 六　記録に残る');
{
  const { s, 甲, 乙 } = 大身の盤();
  天下分け目を起こす(s, 甲, 乙, { 野: 'yato' });
  /* 記録は JSON を圧して置く。同じ道で往復させる。 */
  const 戻 = JSON.parse(解す(圧す(JSON.stringify(s))));
  確('集結の最中でも記録に収まる', !!戻.分け目 && 戻.分け目.野 === 'yato'
    && 戻.分け目.残り === s.分け目.残り, `あと${戻.分け目.残り}ヶ月`);
  const 古 = JSON.parse(JSON.stringify(s));
  delete 古.分け目;
  const m = migrateSave(古);
  確('分け目を知らぬ古い記録も読める', !!m && m.分け目 == null);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
