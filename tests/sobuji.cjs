/* 惣無事令と朝敵（GDD 12.5）。

   天下人は諸大名に私戦の停止を命じた。従えば旗の下に入り、拒めば朝敵として
   討たれる。秀吉の九州も小田原も、この筋で起きた戦である。

   天下への道は二筋ある。秀吉は征夷大将軍になれなかった――源氏ではなかった
   ためで、代わりに関白を取って号令した。家康は源氏を名乗って幕府を開いた。
   盤でも両方を置く。号令はどちらでも通る。

   ここで見るのは engine の筋だけである。画面（発令する・応じる・断る）は
   別に作る。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { initState, courtRank, 号令できるか, 国を旗の下に, 旗の下の城数,
  天下人の直轄, 天下人の版図, 惣無事令を発する, 応諾を決める, 応じる目,
  問われる家, 朝敵か, 朝敵を検め直す, advanceMonth, atPeace } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 五畿 = ['山城', '大和', '河内', '和泉', '摂津'];
const 石高 = (s, fid) => s.castles.filter((c) => c.faction === fid).reduce((a, c) => a + c.koku, 0);

/* 織田を天下人に仕立てる。五畿を直轄で押さえ、諸家を臣従させて版図を作る。 */
const 天下人にする = (関東 = false) => {
  const s = initState('oda');
  for (const c of s.castles.filter((x) => 五畿.includes(x.kuni))) c.faction = 'oda';
  if (関東) for (const c of s.castles.filter((x) => ['相模', '武蔵'].includes(x.kuni))) c.faction = 'oda';
  /* 直轄を全国の一割二分まで伸ばし、旗の下を全城の三割まで積む。
     旗の下は臣従で数える（従属も版図には数えるが、ここは臣従で作る）。 */
  const 全 = () => s.castles.reduce((a, c) => a + c.koku, 0);
  const 他 = s.castles.filter((c) => c.faction !== 'oda');
  for (const c of 他) {
    if (石高(s, 'oda') >= 全() * 天下人の直轄) break;
    c.faction = 'oda';
  }
  const 家ら = [...new Set(s.castles.filter((c) => c.faction !== 'oda').map((c) => c.faction))];
  for (const f of 家ら) {
    if (旗の下の城数(s, 'oda') >= s.castles.length * 天下人の版図) break;
    s.relations[['oda', f].sort().join('|')] = { state: '臣従', master: 'oda', trust: 100, until: null };
  }
  return s;
};

console.log('── 一　位階の梯子');
{
  const s = initState('oda');
  確('初めは位が無い', courtRank(s, 'oda') === null);
  for (const c of s.castles.filter((x) => 五畿.includes(x.kuni))) c.faction = 'oda';
  確('五畿を制せば右大臣', (courtRank(s, 'oda') || {}).key === '右大臣',
    String((courtRank(s, 'oda') || {}).key));
  確('右大臣では号令できない', !号令できるか(s, 'oda'));
}

console.log('\n── 二　関白の道（秀吉の道）');
{
  const s = 天下人にする(false);
  const 位 = courtRank(s, 'oda') || {};
  確('五畿を旗の下に収めている', 五畿.every((k) => 国を旗の下に(s, 'oda', k)));
  const 全 = s.castles.reduce((a, c) => a + c.koku, 0);
  確('直轄が全国の一割二分に届く', 石高(s, 'oda') >= 全 * 天下人の直轄,
    `${Math.round(石高(s, 'oda') / 10000)}万石／全国${Math.round(全 / 10000)}万石 ＝ ${(石高(s, 'oda') / 全 * 100).toFixed(1)}%`);
  確('旗の下が全城の三割に届く', 旗の下の城数(s, 'oda') >= s.castles.length * 天下人の版図,
    `${旗の下の城数(s, 'oda')}城／${s.castles.length}城 ＝ ${(旗の下の城数(s, 'oda') / s.castles.length * 100).toFixed(0)}%`);
  確('関白に任ぜられる（関東は要らぬ）', 位.key === '関白', String(位.key));
  確('関白は号令できる', 号令できるか(s, 'oda'));
}

console.log('\n── 三　将軍の道（家康の道）');
{
  const s = 天下人にする(true);
  const 位 = courtRank(s, 'oda') || {};
  確('関東まで旗の下に収めれば征夷大将軍', 位.key === '征夷大将軍', String(位.key));
  確('将軍も号令できる', 号令できるか(s, 'oda'));
  確('将軍のほうが兵の割増が大きい', 位.troop > 1.38, String(位.troop));
}

console.log('\n── 四　版図が足りねば天下人にならない');
{
  const s = initState('oda');
  for (const c of s.castles.filter((x) => 五畿.includes(x.kuni))) c.faction = 'oda';
  for (const c of s.castles.filter((x) => ['相模', '武蔵'].includes(x.kuni))) c.faction = 'oda';
  const 位 = courtRank(s, 'oda') || {};
  確('五畿と関東を押さえても、版図が細ければ将軍にならない',
    位.key !== '征夷大将軍' && 位.key !== '関白', String(位.key));
  確('号令もできない', !号令できるか(s, 'oda'),
    `旗の下 ${旗の下の城数(s, 'oda')}城／要る ${Math.ceil(s.castles.length * 天下人の版図)}城`);
}

console.log('\n── 五　惣無事令は、既に臣従している家を除く全ての家に問う');
{
  const s = 天下人にする(false);
  const 令 = 惣無事令を発する(s, 'oda');
  const 既 = Object.keys(s.factions).filter((f) => {
    const r = s.relations[['oda', f].sort().join('|')];
    return r && r.state === '臣従' && r.master === 'oda';
  });
  確('発せられる', !!令 && 令.主 === 'oda');
  確('既に臣従している家は問われない',
    !令.列.some((f) => 既.includes(f)), `既に旗の下 ${既.length}家`);
  確('自分は問われない', !令.列.includes('oda'));
  確('滅んだ家は問われない',
    令.列.every((f) => s.castles.some((c) => c.faction === f)));
  /* 敵対・中立・同盟・従属――どの間柄でも、あらためて問い直す。 */
  const 内訳 = {};
  for (const f of 令.列) {
    const r = s.relations[['oda', f].sort().join('|')] || { state: '中立' };
    内訳[r.state] = (内訳[r.state] || 0) + 1;
  }
  確('従属や同盟の家も問い直される',
    (内訳['従属'] || 0) + (内訳['同盟'] || 0) + (内訳['中立'] || 0) + (内訳['敵対'] || 0) === 令.列.length,
    Object.entries(内訳).map(([k, v]) => `${k}${v}`).join('／'));
}

console.log('\n── 六　応じる目は、力の差・誼・器量で決まる');
{
  const s = 天下人にする(false);
  const 石 = {};
  for (const c of s.castles) 石[c.faction] = (石[c.faction] || 0) + c.koku;
  const 相 = 問われる家(s, 'oda')[0];
  const k = ['oda', 相].sort().join('|');
  s.relations[k] = { state: '中立', trust: 50, master: null };
  const 並 = 応じる目(s, 'oda', 相, { 石 });
  s.relations[k] = { state: '中立', trust: 95, master: null };
  const 篤 = 応じる目(s, 'oda', 相, { 石 });
  s.relations[k] = { state: '敵対', trust: 10, master: null };
  const 敵 = 応じる目(s, 'oda', 相, { 石 });
  確('誼が篤ければ応じやすい', 篤 > 並, `${並.toFixed(2)} → ${篤.toFixed(2)}`);
  確('敵対していれば応じにくい', 敵 < 並, `${並.toFixed(2)} → ${敵.toFixed(2)}`);
  s.relations[k] = { state: '中立', trust: 50, master: null };
  const 遠 = 応じる目(s, 'oda', 相, { 石, 隔たり: 1400 });
  確('遠国の家は応じにくい', 遠 < 並, `隔たり無し ${並.toFixed(2)} → 遠国 ${遠.toFixed(2)}`);
  /* 当主の器量。猛き者は抗い、知ある者は形勢を読む。 */
  const 主将 = s.generals.find((g) => g.faction === 相 && g.lord && !g.captive);
  if (主将) {
    const 元 = { lead: 主将.lead, valor: 主将.valor, wit: 主将.wit };
    Object.assign(主将, { lead: 90, valor: 95, wit: 55 });
    const 猛 = 応じる目(s, 'oda', 相, { 石 });
    Object.assign(主将, { lead: 90, valor: 40, wit: 95 });
    const 知 = 応じる目(s, 'oda', 相, { 石 });
    Object.assign(主将, 元);
    確('猛き当主は抗う', 猛 < 知, `猛 ${猛.toFixed(2)} ＜ 知 ${知.toFixed(2)}`);
  }
  確('目は零と一のあいだに収まる', 並 > 0 && 並 < 1, 並.toFixed(2));
}

console.log('\n── 七　従えば臣従、拒めば朝敵');
{
  const s = 天下人にする(false);
  const 石 = {};
  for (const c of s.castles) 石[c.faction] = (石[c.faction] || 0) + c.koku;
  const 相 = 問われる家(s, 'oda')[0];
  const k = ['oda', 相].sort().join('|');
  const 従 = 応諾を決める(s, 'oda', 相, { 石, 籤: () => 0 });      // 必ず従う
  確('従えば臣従になる', s.relations[k].state === '臣従' && s.relations[k].master === 'oda',
    `${s.relations[k].state}`);
  確('従った家は朝敵ではない', !朝敵か(s, 相));
  確('石高の比は問わない（応じるか否かの判断である）', 従.従う === true,
    `目 ${従.目.toFixed(2)} でも、籤が零なら従う`);

  const s2 = 天下人にする(false);
  const 相2 = 問われる家(s2, 'oda')[0];
  const k2 = ['oda', 相2].sort().join('|');
  応諾を決める(s2, 'oda', 相2, { 石, 籤: () => 1 });                // 必ず拒む
  確('拒めば敵対になる', s2.relations[k2].state === '敵対', s2.relations[k2].state);
  確('拒んだ家は朝敵となる', 朝敵か(s2, 相2));
  /* 朝敵でも家中は乱れない。従わぬと決めたことは家臣とも談じたはずである。
     北条も島津も、決断の後は最後まで戦った。 */
  const 忠 = s2.generals.filter((g) => g.faction === 相2 && !g.captive).map((g) => g.loyal);
  確('朝敵となっても家臣の忠誠は落ちない', 忠.every((v) => v == null || v >= 40),
    `最も低い者で ${Math.min(...忠.filter((v) => v != null))}`);
}

console.log('\n── 八　旗の下に入れば、その家が従えていた家は解ける（又貸しを認めぬ）');
{
  const s = 天下人にする(false);
  const 石 = {};
  for (const c of s.castles) 石[c.faction] = (石[c.faction] || 0) + c.koku;
  const 相 = 問われる家(s, 'oda').find((f) =>
    問われる家(s, 'oda').some((g) => g !== f)) || 問われる家(s, 'oda')[0];
  const 下 = 問われる家(s, 'oda').find((f) => f !== 相);
  s.relations[[相, 下].sort().join('|')] = { state: '従属', master: 相, trust: 90, until: null };
  応諾を決める(s, 'oda', 相, { 石, 籤: () => 0 });
  確('その家が従えていた家は、旗の下から外れる',
    s.relations[[相, 下].sort().join('|')].state === '中立',
    s.relations[[相, 下].sort().join('|')].state);
}

console.log('\n── 九　朝敵の帳を繕う');
{
  const s = 天下人にする(false);
  const 石 = {};
  for (const c of s.castles) 石[c.faction] = (石[c.faction] || 0) + c.koku;
  const 相 = 問われる家(s, 'oda')[0];
  応諾を決める(s, 'oda', 相, { 石, 籤: () => 1 });
  確('朝敵になっている', 朝敵か(s, 相));
  // 後に膝を屈した
  s.relations[['oda', 相].sort().join('|')] = { state: '臣従', master: 'oda', trust: 100 };
  朝敵を検め直す(s);
  確('旗の下に入れば朝敵は解ける', !朝敵か(s, 相));

  const s2 = 天下人にする(false);
  const 相2 = 問われる家(s2, 'oda')[0];
  応諾を決める(s2, 'oda', 相2, { 石, 籤: () => 1 });
  for (const c of s2.castles.filter((c) => c.faction === 相2)) c.faction = 'oda';   // 滅ぼした
  朝敵を検め直す(s2);
  確('滅べば朝敵の帳から落ちる', !朝敵か(s2, 相2));
}

console.log('');
console.log('── 十　朝敵は約束の外に置かれる');
{
  /* 惣無事令を拒んだ家を討つのは天下人の命によるもので、私戦ではない。ゆえに
     たとえ不可侵や同盟を結んでいても、朝敵へは咎めなく兵を出せる。秀吉の
     小田原はこの形であった――北条と誼を通じていた諸家もこぞって寄せ手に加わった。 */
  const s = 天下人にする(false);
  const 相 = 問われる家(s, 'oda')[0];
  s.relations[['oda', 相].sort().join('|')] = { state: '同盟', trust: 90, master: null };
  確('同盟のあいだは約束の内にある', atPeace(s, 'oda', 相) === true);
  s.朝敵 = { [相]: { 主: 'oda', y: s.year, m: s.month, 理由: '惣無事令を拒んだ' } };
  確('朝敵になれば、同盟のままでも約束の外に出る', atPeace(s, 'oda', 相) === false,
    '咎めなく兵を出せる');
  /* 他家から見ても同じである。天下人の号は天下に及ぶ。 */
  const 他 = 問われる家(s, 'oda').find((f) => f !== 相);
  if (他) {
    s.relations[[他, 相].sort().join('|')] = { state: '不可侵', trust: 90, master: null };
    確('他家から見ても、朝敵は約束の外', atPeace(s, 他, 相) === false);
  }
}

console.log('\n── 十一　月送りのなかで、天下人は惣無事令を発する');
{
  const s = 天下人にする(false);
  s.player = 'imagawa';                                  // 采配の天下人として振る舞わせる
  s.autoPlay = true;
  確('織田は号令できる位にある', 号令できるか(s, 'oda'));
  const 前 = Object.keys(s.朝敵 || {}).length;
  let u = s, 発 = false;
  for (let i = 0; i < 3 && !発; i++) {
    u = advanceMonth(u);
    発 = !!(u.惣無事令の控え || {}).oda;
  }
  確('数月のうちに惣無事令が発せられる', 発,
    発 ? `${(u.惣無事令の控え || {}).oda.y}年${(u.惣無事令の控え || {}).oda.m}月` : '三月のあいだ発せられなかった');
  const 旗 = Object.keys(u.factions).filter((f) => {
    const r = u.relations[['oda', f].sort().join('|')];
    return f !== 'oda' && r && r.state === '臣従' && r.master === 'oda';
  }).length;
  const 敵 = Object.keys(u.朝敵 || {}).length;
  確('従う家と拒む家が分かれる', 旗 > 0 && 敵 > 前,
    `旗の下 ${旗}家／朝敵 ${敵}家`);
  確('戦国記に残る', (u.chronicle || []).some((c) => /惣無事令/.test(c.text)));
  /* 立て続けには問わない。拒んだ家へ毎月問うのは無体である。 */
  const 控 = { ...(u.惣無事令の控え || {}).oda };
  let v = u;
  for (let i = 0; i < 6; i++) v = advanceMonth(v);
  const 控2 = (v.惣無事令の控え || {}).oda;
  確('立て続けには発しない（年を措く）', 控2.y === 控.y && 控2.m === 控.m,
    `${控.y}年${控.m}月　→　${控2.y}年${控2.m}月`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
