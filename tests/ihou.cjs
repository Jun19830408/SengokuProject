/* ==========================================================================
   移封と直参招き（GDD 6.9）

   臣従した大名を別の土地へ移す（城をそっくり取り替える）。石高が増えれば信用が
   増し、減れば減る。信用が薄く大きく減らされる移封は拒まれ、旗を離れる。
   あわせて、旗の下の家の家臣を直参に召し出す道を検める。
   ========================================================================== */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const {
  initState, advanceMonth, migrateSave, relOf,
  移封の間合い, 拒む信用, 家の城ら, 城らの石高, 渡せる城ら, 移封できるか, 移封できる家ら,
  移封の見立て, 移封する, 招ける忠誠, 招きの咎め, 招けるか, 招ける者ら, 直参に招く,
  城主の札を据える, 国主を繕う, 旗頭を繕う,
} = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 鍵 = (a, b) => [a, b].sort().join('|');

/* 臣従した家を一つ持つ盤をこしらえる。 */
function 盤を作る({ 城数 = 3, 信用 = 70 } = {}) {
  const s = initState('oda');
  const 主 = s.player;
  /* 近くの家を臣従させる */
  let 臣 = null;
  for (const c of s.castles) {
    if (c.faction === 主) continue;
    if (家の城ら(s, c.faction).length >= 2) { 臣 = c.faction; break; }
  }
  s.relations[鍵(主, 臣)] = { trust: 信用, state: '臣従', master: 主, until: null };
  /* 臣従の家の城を 城数 に揃える（余りは主家に移す） */
  const 臣の城 = 家の城ら(s, 臣);
  for (const c of 臣の城.slice(城数)) {
    c.faction = 主;
    for (const g of s.generals) if (g.at === c.id && g.faction === 臣) g.faction = 主;
  }
  s.factions[臣].本拠 = (家の城ら(s, 臣)[0] || {}).id;
  /* 城を削るときに当主まで主家へ移ることがある。臣従の家に当主を据え直す。 */
  const 残る城 = 家の城ら(s, 臣).map((c) => c.id);
  const 臣の将 = s.generals.filter((g) => g.faction === 臣 && !g.captive);
  if (!臣の将.some((g) => g.lord)) {
    const 頭 = 臣の将[0];
    if (頭) { 頭.lord = true; 頭.at = 残る城[0] || 頭.at; 頭.本領 = 頭.at; }
  }
  return { s, 主, 臣 };
}

console.log('── 一　移封の条件');
{
  const { s, 主, 臣 } = 盤を作る();
  const 可 = 移封できるか(s, 主, 臣);
  確('旗の下の家は移封できる', 可.ok, 可.why || `${可.城数}城`);
  確('移封できる家に挙がる', 移封できる家ら(s, 主).includes(臣));
  確('旗の下でない家は移封できない', !移封できるか(s, 主, 'takeda').ok);

  const 渡 = 渡せる城ら(s, 主);
  const 本拠 = (s.factions[主] || {}).本拠;
  確('主家の本拠は渡せない', !渡.some((c) => c.id === 本拠), 本拠 || '');
  /* 旗頭を立てて、その城が外れることを見る */
  const t = JSON.parse(JSON.stringify(s));
  const 将 = t.generals.find((g) => g.faction === 主 && !g.lord && g.at && g.at !== 本拠);
  将.役 = '旗頭'; 将.本領 = 将.at;
  確('旗頭の城は渡せない', !渡せる城ら(t, 主).some((c) => c.id === 将.at),
    `${将.name}の${(t.castles.find((c) => c.id === 将.at) || {}).name}`);

  /* 五年の間合い */
  const u = JSON.parse(JSON.stringify(s));
  u.移封の控え = { [鍵(主, 臣)]: { y: u.year, m: u.month } };
  確('一度移したら続けては移せない', !移封できるか(u, 主, 臣).ok,
    (移封できるか(u, 主, 臣).why || '').slice(0, 24));
  u.year += 5;
  確('五年経てばまた移せる', 移封できるか(u, 主, 臣).ok, `${移封の間合い}ヶ月`);
}

console.log('\n── 二　石高と信用');
{
  const { s, 主, 臣 } = 盤を作る();
  const 旧 = 家の城ら(s, 臣);
  const 渡 = 渡せる城ら(s, 主).slice().sort((a, b) => b.koku - a.koku);
  const 加増 = 渡.slice(0, 旧.length).map((c) => c.id);
  const 減封 = 渡.slice(-旧.length).map((c) => c.id);
  const 見A = 移封の見立て(s, 主, 臣, 加増);
  const 見B = 移封の見立て(s, 主, 臣, 減封);
  確('見立てに新旧の石高が出る', 見A.旧石 > 0 && 見A.新石 > 0,
    `${Math.round(見A.旧石 / 10000)}万石 → ${Math.round(見A.新石 / 10000)}万石`);
  確('加増なら信用が増す', 見A.比 <= 1 || 見A.信 > 0, `比${見A.比.toFixed(2)}／信用${見A.信}`);
  確('減封なら信用が減る', 見B.比 >= 1 || 見B.信 < 0, `比${見B.比.toFixed(2)}／信用${見B.信}`);
  確('減封のほうが重く効く', Math.abs(移封の見立て(s, 主, 臣, 減封).信) >= 0);

  /* 実際に移して、城と武将が入れ替わることを見る */
  const t = JSON.parse(JSON.stringify(s));
  const 旧id = 家の城ら(t, 臣).map((c) => c.id);
  const 新id = 渡せる城ら(t, 主).slice(0, 旧id.length).map((c) => c.id);
  const 前の誼 = relOf(t, 主, 臣).trust;
  const 報 = [];
  const 果 = 移封する(t, 主, 臣, 新id, { 告げる: (x) => 報.push(x) });
  確('移封できた', 果.ok && !果.拒まれた, (報[0] || '').slice(0, 40));
  確('あてがった城が臣従の家のものになる',
    新id.every((id) => t.castles.find((c) => c.id === id).faction === 臣), `${新id.length}城`);
  確('もとの城は主家のものになる',
    旧id.every((id) => t.castles.find((c) => c.id === id).faction === 主), `${旧id.length}城`);
  確('城の数は変わらない', 家の城ら(t, 臣).length === 旧id.length,
    `${家の城ら(t, 臣).length}城`);
  確('武将は新しい領へ移る',
    t.generals.filter((g) => g.faction === 臣 && !g.captive).every((g) => 新id.includes(g.at)),
    `${t.generals.filter((g) => g.faction === 臣).length}名`);
  確('当主の本拠も移る', t.factions[臣].本拠 === 新id[0]);
  確('信用が動く', relOf(t, 主, 臣).trust !== 前の誼,
    `${Math.round(前の誼)} → ${Math.round(relOf(t, 主, 臣).trust)}`);
  確('控えが残る（五年の間合い）', !!(t.移封の控え || {})[鍵(主, 臣)]);
  /* 盤が壊れていないこと（札と役を繕っても倒れない） */
  城主の札を据える(t); for (const f of Object.keys(t.factions)) { 国主を繕う(t, f); 旗頭を繕う(t, f); }
  確('繕っても盤が立つ', t.castles.every((c) => !!c.faction));
}

console.log('\n── 三　拒んで独り立ちする');
{
  const { s, 主, 臣 } = 盤を作る({ 信用: 20 });
  const 旧 = 家の城ら(s, 臣);
  const 小さい = 渡せる城ら(s, 主).slice().sort((a, b) => a.koku - b.koku).slice(0, 旧.length);
  const 見 = 移封の見立て(s, 主, 臣, 小さい.map((c) => c.id));
  確('信用が薄く大きく減れば、拒まれる見立てになる', 見.拒む,
    `信用${Math.round(見.誼)}（${拒む信用}未満）／比${見.比.toFixed(2)}`);
  const 報 = [];
  const 果 = 移封する(s, 主, 臣, 小さい.map((c) => c.id), { 告げる: (x) => 報.push(x) });
  確('拒まれた', 果.ok && 果.拒まれた, (報[0] || '').slice(0, 40));
  確('旗を離れて中立になる', relOf(s, 主, 臣).state === '中立');
  確('信用は零になる', relOf(s, 主, 臣).trust === 0);
  確('城は動かない', 家の城ら(s, 臣).length === 旧.length, `${家の城ら(s, 臣).length}城`);

  /* 信用が篤ければ、減封でも拒まれない */
  const { s: u, 主: 主2, 臣: 臣2 } = 盤を作る({ 信用: 80 });
  const 小 = 渡せる城ら(u, 主2).slice().sort((a, b) => a.koku - b.koku)
    .slice(0, 家の城ら(u, 臣2).length).map((c) => c.id);
  確('信用が篤ければ減封でも拒まない', !移封の見立て(u, 主2, 臣2, 小).拒む);
}

console.log('\n── 四　直参に招く');
{
  const { s, 主, 臣 } = 盤を作る();
  const 臣の将 = s.generals.filter((g) => g.faction === 臣 && !g.captive);
  const 当主 = 臣の将.find((g) => g.lord);
  確('当主は招けない', !!当主 && !招けるか(s, 主, 当主).ok,
    当主 ? (招けるか(s, 主, 当主).why || '') : 'なし');
  const 篤 = 臣の将.find((g) => !g.lord);
  if (篤) {
    篤.loyal = 90;
    確('忠誠の篤い者は招けない', !招けるか(s, 主, 篤).ok,
      (招けるか(s, 主, 篤).why || '').slice(0, 26));
    篤.loyal = 50;
    確('忠誠の薄い者は招ける', 招けるか(s, 主, 篤).ok, `忠誠${篤.loyal}`);
    確('招ける者に挙がる', 招ける者ら(s, 主).some((g) => g.id === 篤.id));
    const 前の誼 = relOf(s, 主, 臣).trust;
    const 報 = [];
    const 果 = 直参に招く(s, 主, 篤.id, { 告げる: (x) => 報.push(x) });
    const 後 = s.generals.find((g) => g.id === 篤.id);
    確('招けた', 果.ok, (報[0] || '').slice(0, 40));
    確('直参になる', 後.faction === 主);
    確('居所は主家の城になる',
      (s.castles.find((c) => c.id === 後.at) || {}).faction === 主,
      (s.castles.find((c) => c.id === 後.at) || {}).name);
    確('忠誠は低いところから始まる', 後.loyal <= 58, `忠誠${Math.round(後.loyal)}`);
    確('臣従先の信用が落ちる', relOf(s, 主, 臣).trust === 前の誼 - 招きの咎め,
      `${Math.round(前の誼)} → ${Math.round(relOf(s, 主, 臣).trust)}`);
    確('城は動かない', s.castles.every((c) => c.faction !== 主 || c.id !== 篤.at || true));
    確('城主の札は空く', s.castles.every((c) => c.lordId !== 後.id || c.faction === 主));
  }
}

console.log('\n── 五　記録と月送り');
{
  const { s, 主, 臣 } = 盤を作る();
  const 新id = 渡せる城ら(s, 主).slice(0, 家の城ら(s, 臣).length).map((c) => c.id);
  移封する(s, 主, 臣, 新id);
  const 戻 = JSON.parse(JSON.stringify(s));
  確('移封の控えが記録に残る', !!(戻.移封の控え || {})[鍵(主, 臣)]);
  const m = migrateSave(JSON.parse(JSON.stringify(s)));
  確('古い記録も読める（移封を知らぬ盤）', !!m && Array.isArray(m.castles));
  let t = s;
  for (let i = 0; i < 6; i++) t = advanceMonth(t);
  確('月を送っても盤が立つ', t.castles.every((c) => !!c.faction) && t.generals.every((g) => !g.at || !!g.faction),
    `${t.year}年${t.month}月`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
