/* 謀反（GDD 6.4 / 12.3）。

   大きな軍団を預けることは、それ自体が賭けである。信長は荒木村重に摂津を、
   松永久秀に大和を預け、いずれにも背かれた。明智光秀は丹波を預かって本能寺へ
   向かった。家康はこれを免れた――抱えた者の心を離さぬ手立てを持っていたからである。

   寄騎を多く預けた寄親ほど危うい。抱えた寄騎の数が、そのまま謀反の目に乗る。

     謀反の目 ＝ (七十 − 忠誠) × (一 ＋ 寄騎の数 × 〇.一五) ÷ 七十

   忠誠七十以上なら起きない。これが遊ぶ側の梃子である。褒賞、加増、寄騎を減らす
   ――手が打てる。手が打てぬ不幸は理不尽だが、打てたのに打たなかった不幸は物語になる。

   付いていくかどうかは寄騎それぞれが決める。忠誠七十以上の寄騎は付いていかず、
   その城は大名のものとして残る。付いていった者は新しい主のもとで忠誠が低いので、
   引き抜き・内応で取り返せる。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { initState, advanceMonth, 謀反の目, 走る先, 謀反を起こす, 謀反の見回り,
  国主に任じる, 寄騎に取る, 寄騎たち, castellanOf } = H;
const relKey = (a, b) => [a, b].sort().join('|');

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 0x4c21;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* 尾張に国主を立て、他の城の城主を寄騎に付ける */
const 場 = (寄騎数 = 2) => {
  const s = initState('oda');
  const 自城 = s.castles.filter((c) => c.faction === 'oda' && c.kuni === '尾張');
  const 親 = s.generals.find((g) => g.faction === 'oda' && !g.lord && !g.役 && (g.age || 0) >= 25
    && 自城.some((c) => c.id === (g.本領 || g.at)));
  親.fief = 14000; 親.age = Math.max(親.age || 30, 32); 親.loyal = 80;
  const 親城 = 自城.find((c) => c.id === (親.本領 || 親.at));
  /* 当主のいる国には国主を置けない（GDD 6.4）。測る国から当主を外す。
     織田は初め尾張の三城しか持たぬので、美濃に一城を与えてそこへ移す。 */
  {
    const 美濃 = s.castles.find((c) => c.kuni === '美濃');
    if (美濃) 美濃.faction = 'oda';
    const 当主 = s.generals.find((g) => g.faction === 'oda' && g.lord);
    if (当主 && 美濃) { 当主.at = 美濃.id; 当主.本領 = 美濃.id; 美濃.lordId = 当主.id; }
  }
  国主に任じる(s, 'oda', '尾張', 親.id);
  const 子ら = [];
  for (const c of 自城.filter((x) => x.id !== 親城.id).slice(0, 寄騎数)) {
    const 子 = castellanOf(s, c);
    if (!子 || 子.lord) continue;
    子.fief = Math.max(子.fief || 0, 3000); 子.age = Math.max(子.age || 30, 28); 子.本領 = c.id;
    if (寄騎に取る(s, 親.id, 子.id).ok) 子ら.push(子);
  }
  return { s, 親, 子ら, 親城 };
};

console.log('── 一　謀反の目は、忠誠と寄騎の数で決まる');
{
  const { s, 親, 子ら } = 場(2);
  親.loyal = 80;
  確('忠誠七十以上なら、目はない', 謀反の目(s, 親) === 0, `忠誠80・寄騎${子ら.length}名 → 目 0`);
  親.loyal = 70;
  確('ちょうど七十でも起きない', 謀反の目(s, 親) === 0);
  親.loyal = 50;
  const 目 = 謀反の目(s, 親);
  確('七十を割れば目が立つ', 目 > 0, `忠誠50・寄騎${子ら.length}名 → 目 ${目.toFixed(2)}`);
  // 寄騎を減らせば目も減る
  const 前 = 謀反の目(s, 親);
  s.generals.find((x) => x.id === 子ら[0].id).寄親 = null;
  確('寄騎を減らせば目も減る', 謀反の目(s, 親) < 前,
    `寄騎${子ら.length}名 ${前.toFixed(2)} → ${子ら.length - 1}名 ${謀反の目(s, 親).toFixed(2)}`);
  確('役を持たぬ者は謀反を起こさない',
    謀反の目(s, s.generals.find((x) => x.faction === 'oda' && !x.役 && !x.lord)) === 0);
}

console.log('\n── 二　走る先は、敵対する隣家');
{
  const { s } = 場();
  for (const k of Object.keys(s.relations)) {
    const [a, b] = k.split('|');
    if (a === 'oda' || b === 'oda') s.relations[k].state = '中立';
  }
  確('敵対する家が無ければ、走る先も無い', 走る先(s, 'oda') === null);
  s.relations[relKey('oda', 'imagawa')] = { trust: 10, state: '敵対', until: null };
  確('敵対する家があれば、そこへ走る', 走る先(s, 'oda') === 'imagawa',
    走る先(s, 'oda') || 'なし');
}

console.log('\n── 三　謀反が起きれば、城ごと走る');
{
  const { s, 親, 子ら, 親城 } = 場(2);
  s.relations[relKey('oda', 'imagawa')] = { trust: 10, state: '敵対', until: null };
  // 一人は踏みとどまり、一人は付いていく形にする
  子ら[0].loyal = 85;                                // 大名への忠誠が篤い
  子ら[1].loyal = 40;
  const 城1 = s.castles.find((c) => c.id === 子ら[0].本領);
  const 城2 = s.castles.find((c) => c.id === 子ら[1].本領);
  const r = 謀反を起こす(s, 親, 'imagawa');
  確('寄親の城は走る先へ移る', s.castles.find((c) => c.id === 親城.id).faction === 'imagawa',
    `${親城.name} → ${s.factions[s.castles.find((c) => c.id === 親城.id).faction].name}`);
  確('忠誠七十以上の寄騎は付いていかない', 城1.faction === 'oda' && 子ら[0].faction === 'oda',
    `${子ら[0].name}（忠85）は${城1.name}に留まった`);
  確('忠誠の薄い寄騎は付いていく', 城2.faction === 'imagawa' && 子ら[1].faction === 'imagawa',
    `${子ら[1].name}（忠40）は${城2.name}ごと走った`);
  確('走った者は、新しい主のもとで忠誠が低い', 親.loyal < 50 && 子ら[1].loyal < 50,
    `${親.name} 忠${Math.round(親.loyal)}／${子ら[1].name} 忠${Math.round(子ら[1].loyal)}`);
  確('走った者は役も寄親も失う', !親.役 && !子ら[1].寄親);
  確('踏みとどまった者は、寄親を失うだけ', !子ら[0].寄親 && 子ら[0].faction === 'oda');
}

console.log('\n── 四　段を踏む。いきなりは起きない');
{
  const { s, 親 } = 場(2);
  s.relations[relKey('oda', 'imagawa')] = { trust: 10, state: '敵対', until: null };
  親.loyal = 30;                                     // 危うい
  const 文 = [];
  let 起 = [];
  // 必ず引き当たる籤で、段を一つずつ踏ませる
  起 = 謀反の見回り(s, 'oda', { 告げる: (t) => 文.push(t), 籤: () => 0 });
  確('まず使者を交わす（すぐには起きない）', 起.length === 0 && !!親.謀反支度,
    文[0] || 'なし');
  起 = 謀反の見回り(s, 'oda', { 告げる: (t) => 文.push(t), 籤: () => 0 });
  確('一月では起きない（支度が要る）', 起.length === 0, `残り ${親.謀反支度 ? 親.謀反支度.残 : '—'}`);
  起 = 謀反の見回り(s, 'oda', { 告げる: (t) => 文.push(t), 籤: () => 0 });
  確('二月ののちに起きる', 起.length === 1, 文[文.length - 1] || 'なし');
}

console.log('\n── 五　忠誠を保てば、支度も消える');
{
  const { s, 親 } = 場(2);
  s.relations[relKey('oda', 'imagawa')] = { trust: 10, state: '敵対', until: null };
  親.loyal = 30;
  謀反の見回り(s, 'oda', { 籤: () => 0 });
  確('支度が始まっている', !!親.謀反支度);
  親.loyal = 85;                                     // 褒賞・加増で心を繋いだ
  謀反の見回り(s, 'oda', { 籤: () => 0 });
  確('忠誠を七十まで戻せば、支度は消える', !親.謀反支度, '（褒賞・加増が効く）');
}

console.log('\n── 六　月送りでも起きる（報せが出る）');
{
  const { s, 親 } = 場(2);
  s.relations[relKey('oda', 'imagawa')] = { trust: 10, state: '敵対', until: null };
  親.loyal = 20;
  let u = s, 報 = [];
  for (let i = 0; i < 24 && !報.length; i++) {
    u = advanceMonth(u);
    報 = (u.monthEvents || []).filter((t) => /走った|不穏|使者を交わし/.test(t));
  }
  確('月を送れば、兆しか謀反が報せに出る', 報.length > 0, 報[0] || '二年のあいだ何も起きなかった');
}

console.log(`\n════ 謀反：咎 ${咎.length} 件`);
console.log('エラー:', 咎.length ? 咎.join(' | ') : 'なし');
process.exit(咎.length ? 1 : 0);
