/* 外交の上下と、調略の的（GDD 12.1 / 11.2）。

   一、命の名が向きを示すこと
       「従属」は相手を従える命、「臣従」は自らが膝を屈する命であって、
       向きが逆であった。同じ並びに置かれていたので、どちらへ働く命なのか
       画面から読み取れなかった。名に向きを入れる。

   二、上下が石高でひとりでに裏返らないこと
       どちらが上かを書き留めず、そのときどきの石高で決めていた。
       一度は膝を屈した相手でも、こちらの石高が追い越した途端、
       その家がこちらの臣下に化けていた。

   三、弱小の家が、自ら他家に降れること
       「臣従」がその命だったのだが、名からは読み取れず、
       しかも「相手が1.8倍超」という一つの敷居しかなかった。

   四、調略の的を選べること
       城を指すだけで、実際に誰が寝返るかは盤が勝手に決めていた
       （忠誠の最も低い者）。忠誠を検めて狙いを定める、という調略の
       いちばん面白いところが、遊ぶ側の手から漏れていた。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 石高 = (s, fid) => s.castles.filter((c) => c.faction === fid).reduce((a, c) => a + c.koku, 0);
const 押せる = (s, fid, key) => {
  const d = H.DIPLO.find((x) => x.key === key);
  const r = s.relations[[s.player, fid].sort().join('|')];
  const 主 = H.主家(s, s.player, fid);
  const 下 = 主 == null ? null : 主 !== s.player;
  return !!d && d.need(r, H.diploStat(s, s.player), H.diploStat(s, fid), 下)
    && s.factions[s.player].gold >= d.cost;
};

/* ------------------------------------------- 一、命の名に向きが入っていること */
{
  const 名 = H.DIPLO.map((d) => d.key);
  確('相手を従える命と、自らが降る命が別々に並ぶ',
    ['従属させる', '臣従させる', '従属する', '臣従する'].every((k) => 名.includes(k)), 名.join('／'));
  確('向きの読み取れない「従属」「臣従」は消えている',
    !名.includes('従属') && !名.includes('臣従'));
  確('上下を解く道が両側にある', 名.includes('独立') && 名.includes('解き放つ'),
    '下からは独立、上からは解き放つ');
}

/* ------------------------------- 二、大身の家は従える。降ることはできない */
{
  const s = H.initState('oda');
  // 相手を十分に小さくする（自家の二割）
  /* 旗の下にある家は、横から従えることができない（GDD 12.2）。
     どこの旗の下にもいない家を相手に選ぶ。 */
  const 旗下 = (fid) => Object.keys(s.relations).some((k) => {
    const p = k.split('|'); const 相 = p[0] === fid ? p[1] : p[1] === fid ? p[0] : null;
    if (!相) return false;
    const r0 = s.relations[k];
    return ['従属', '臣従'].includes(r0.state) && r0.master !== fid;
  });
  const 敵 = s.castles.find((x) => x.faction !== s.player && !旗下(x.faction)).faction;
  for (const c of s.castles.filter((x) => x.faction === 敵)) c.koku = Math.round(c.koku * 0.1);
  const r = s.relations[[s.player, 敵].sort().join('|')];
  r.trust = 100; r.state = '中立';       // 臣従させるには信用満が要る（GDD 12.1）
  s.factions[s.player].gold = 99999;
  const 比 = 石高(s, 敵) / 石高(s, s.player);
  console.log(`  （${s.factions[敵].name}は織田家の${Math.round(比 * 100)}％）`);
  確('小さい相手は従属させられる', 押せる(s, 敵, '従属させる'));
  確('小さい相手は臣従させられる', 押せる(s, 敵, '臣従させる'));
  確('小さい相手に自ら降ることはできない',
    !押せる(s, 敵, '従属する') && !押せる(s, 敵, '臣従する'));

  const t = H.doDiplo(s, 敵, '臣従させる');
  const r2 = t.relations[[t.player, 敵].sort().join('|')];
  確('臣従させると、上下が盟約に書き留められる', r2.state === '臣従' && r2.master === t.player,
    `state=${r2.state} master=${r2.master}`);
  確('相手はこちらの旗の下に入る', H.isVassal(t, t.player, 敵) && H.underMyBanner(t, t.player, 敵));
  確('こちらは膝を屈していない', !H.膝を屈している(t, t.player, 敵));
}

/* ---------------------------- 三、弱小の家は、自ら他家に降ることができる */
{
  const s = H.initState('oda');
  /* 旗の下にある家は、横から従えることができない（GDD 12.2）。
     どこの旗の下にもいない家を相手に選ぶ。 */
  const 旗下 = (fid) => Object.keys(s.relations).some((k) => {
    const p = k.split('|'); const 相 = p[0] === fid ? p[1] : p[1] === fid ? p[0] : null;
    if (!相) return false;
    const r0 = s.relations[k];
    return ['従属', '臣従'].includes(r0.state) && r0.master !== fid;
  });
  const 敵 = s.castles.find((x) => x.faction !== s.player && !旗下(x.faction)).faction;
  // こちらを十分に小さくする
  for (const c of s.castles.filter((x) => x.faction === s.player)) c.koku = Math.round(c.koku * 0.05);
  const r = s.relations[[s.player, 敵].sort().join('|')];
  r.trust = 20; r.state = '中立';
  s.factions[s.player].gold = 0;                        // 頭を下げるのに金は要らない
  const 比 = 石高(s, 敵) / 石高(s, s.player);
  console.log(`  （${s.factions[敵].name}は織田家の${比.toFixed(1)}倍）`);
  /* 降る側の要り（GDD 12.1）。
       従属する … 石高の比に加え、信用八十。貢を納めて生き延びる約束であるから、
                   相手を信じられねば結べない。
       臣従する … 石高の比だけ。攻め滅ぼされる前に降るのだから、誼の篤さは
                   関わらない。ここを塞ぐと、弱小の家に生き残る道が無くなる。 */
  確('大きい相手には、金も信用もなく臣従できる',
    押せる(s, 敵, '臣従する'), `信用${Math.round(r.trust)}・金0貫`);
  確('従属するには信用八十が要る', !押せる(s, 敵, '従属する'),
    `信用${Math.round(r.trust)}では従属できない`);
  {
    const s2 = structuredClone(s);
    s2.relations[[s2.player, 敵].sort().join('|')].trust = 80;
    確('　信用八十まで積めば従属できる', 押せる(s2, 敵, '従属する'), '信用80');
  }
  確('大きい相手を従えることはできない',
    !押せる(s, 敵, '従属させる') && !押せる(s, 敵, '臣従させる'));

  const t = H.doDiplo(s, 敵, '臣従する');
  const r2 = t.relations[[t.player, 敵].sort().join('|')];
  確('臣従すると、相手が上と書き留められる', r2.state === '臣従' && r2.master === 敵,
    `master=${t.factions[r2.master] ? t.factions[r2.master].name : r2.master}`);
  確('こちらが膝を屈している', H.膝を屈している(t, t.player, 敵));
  確('相手はこちらの旗の下ではない', !H.underMyBanner(t, t.player, 敵));
  確('主家からは下知が来る（援軍を断れぬ側）', H.canAskAid(t, t.player, 敵));

  /* ここが肝。石高が逆転しても、上下は裏返らない。
     直す前は、追い越した途端に相手がこちらの臣下に化けていた。 */
  const u = JSON.parse(JSON.stringify(t));
  for (const c of u.castles.filter((x) => x.faction === u.player)) c.koku = Math.round(c.koku * 200);
  確('石高で追い越しても、主従は裏返らない',
    H.膝を屈している(u, u.player, 敵) && !H.isVassal(u, u.player, 敵),
    `自家${Math.round(石高(u, u.player) / 石高(u, 敵))}倍でもなお臣下`);
  確('追い越したなら、独立を宣して自立できる', 押せる(u, 敵, '独立'));
  const v = H.doDiplo(u, 敵, '独立');
  const r3 = v.relations[[v.player, 敵].sort().join('|')];
  確('独立すれば敵対に戻り、上下は消える', r3.state === '敵対' && !r3.master);
  確('威信を損なう', v.factions[v.player].prestige < u.factions[u.player].prestige,
    `${Math.round(u.factions[u.player].prestige)} → ${Math.round(v.factions[v.player].prestige)}`);
}

/* --------------------------------------- 四、威信が要る信用に効くこと */
{
  const 作 = (威信) => {
    const s = H.initState('oda');
    /* 旗の下にある家は、横から従えることができない（GDD 12.2）。
     どこの旗の下にもいない家を相手に選ぶ。 */
  const 旗下 = (fid) => Object.keys(s.relations).some((k) => {
    const p = k.split('|'); const 相 = p[0] === fid ? p[1] : p[1] === fid ? p[0] : null;
    if (!相) return false;
    const r0 = s.relations[k];
    return ['従属', '臣従'].includes(r0.state) && r0.master !== fid;
  });
  const 敵 = s.castles.find((x) => x.faction !== s.player && !旗下(x.faction)).faction;
    for (const c of s.castles.filter((x) => x.faction === 敵)) c.koku = Math.round(c.koku * 0.1);
    /* 従属させるに要る信用は八十（GDD 12.1）。威信が高いほどそこから緩む
       （威信五十を並みとし、上下それぞれ最大十ぶん動く）。
       威信95なら七十一ほど、威信10なら八十八ほど要る。そのあいだの
       七十五で測れば、威信の効きがそのまま見える。 */
    s.relations[[s.player, 敵].sort().join('|')] = { trust: 75, state: '中立', until: null };
    s.factions[s.player].gold = 99999;
    s.factions[s.player].prestige = 威信;
    return { s, 敵 };
  };
  const 高 = 作(95), 低 = 作(10);
  確('威信が高ければ、信用75でも従属させられる', 押せる(高.s, 高.敵, '従属させる'), '威信95（要る信用は八十から七十一ほどに緩む）');
  確('威信が低ければ、同じ信用でも従えられない', !押せる(低.s, 低.敵, '従属させる'), '威信10');
}

/* ------------------------------------ 五、古い記録に上下を書き入れること */
{
  const s = H.initState('oda');
  /* 旗の下にある家は、横から従えることができない（GDD 12.2）。
     どこの旗の下にもいない家を相手に選ぶ。 */
  const 旗下 = (fid) => Object.keys(s.relations).some((k) => {
    const p = k.split('|'); const 相 = p[0] === fid ? p[1] : p[1] === fid ? p[0] : null;
    if (!相) return false;
    const r0 = s.relations[k];
    return ['従属', '臣従'].includes(r0.state) && r0.master !== fid;
  });
  const 敵 = s.castles.find((x) => x.faction !== s.player && !旗下(x.faction)).faction;
  for (const c of s.castles.filter((x) => x.faction === s.player)) c.koku = Math.round(c.koku * 0.05);
  // 直す前の記録。state だけあって master がない
  s.relations[[s.player, 敵].sort().join('|')] = { trust: 60, state: '臣従', until: null };
  const t = H.migrateSave(JSON.parse(JSON.stringify(s)));
  const r = t.relations[[t.player, 敵].sort().join('|')];
  確('古い盟約にも、いまの石高で上下を書き入れる', r.master === 敵,
    `master=${t.factions[r.master] ? t.factions[r.master].name : r.master}`);
  確('書き入れたあとは、石高が動いても変わらない', (() => {
    const u = JSON.parse(JSON.stringify(t));
    for (const c of u.castles.filter((x) => x.faction === u.player)) c.koku *= 300;
    return H.膝を屈している(u, u.player, 敵);
  })());
}

/* ---------------------------------------- 六、調略の的を選べること */
{
  const s = H.initState('oda');
  s.factions[s.player].gold = 99999;
  const 的城 = s.castles.find((x) => x.faction !== s.player
    && s.generals.filter((q) => q.at === x.id && q.faction === x.faction && !q.lord).length >= 2);
  const 城中 = s.generals.filter((x) => x.at === 的城.id && x.faction === 的城.faction && !x.lord && !x.captive);
  const 手 = s.generals.find((x) => x.faction === s.player && !x.captive);
  console.log(`  （${的城.name}の城中 ${城中.length}名：${城中.slice(0, 4).map((x) => `${x.name}(忠${Math.round(x.loyal)})`).join('・')}）`);

  確('調略ごとに、的の定めが書いてある',
    H.PLOTS.every((p) => ['無', '任意', '要', '城主'].includes(p.mato)),
    H.PLOTS.map((p) => `${p.key}=${p.mato}`).join('／'));

  // 忠誠のいちばん低い者ではなく、こちらが選んだ者に効くこと
  const 低 = [...城中].sort((a, b) => a.loyal - b.loyal)[0];
  const 選 = [...城中].sort((a, b) => b.loyal - a.loyal)[0];
  確('二人の忠誠に開きがある（測れる形になっている）', 低.id !== 選.id,
    `${低.name} 忠${Math.round(低.loyal)} ／ ${選.name} 忠${Math.round(選.loyal)}`);

  const t = H.doPlot(s, 的城.id, '流言', 手.id, 選.id);
  const pl = t.plots[t.plots.length - 1];
  確('選んだ相手が企てに記される', pl && pl.matoId === 選.id);

  /* 月を送って落着させる。

     手の者の知略を百に上げても、企ての成否は運が絡む（流言は九割四分で成り、
     六分は不調か露見に終わる）。二十回に一度ほど、成らずに試験が咎めていた。
     測りたいのは「成ったとき、名指しの一人に深く刺さるか」であって、
     成否の運ではない。ここだけ乱数を固定する。 */
  const 元の乱 = Math.random;
  let z = 20260820 >>> 0;
  Math.random = () => { z = (z + 0x6D2B79F5) | 0; let x = Math.imul(z ^ (z >>> 15), 1 | z);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  let u = JSON.parse(JSON.stringify(t));
  u.generals.find((x) => x.id === 手.id).wit = 100;
  /* 他家の手出しを退けておく。

     二十回に一度ほど、名指ししていない酒井忠尚の忠誠まで二つ落ちて、試験が
     咎めていた。追ってみると、名指しの落ちが十八ではなく二十の回に限って
     起きている。十八はこちらの流言の値であるから、余分の二はよそから来て
     いた。

     出どころは他家の企ての帳（s.plots）ではなく、陰謀を気性とする家の
     月々の采配であった（govern/month.js の「気性ごとの振る舞い」）。狙う城の
     武将すべての忠誠を二つ落とすもので、企ての帳には載らない。ゆえに
     企てを抜いただけでは止まらなかった。

     はじめ fa.aim（狙う城）を外して止めようとしたが、狙いは同じ月のうちに
     立て直されるので効かなかった。気性そのものを移し替える。 */
  const 我が企て = u.plots[u.plots.length - 1];
  u.plots = [我が企て];
  我が企て.monthsLeft = 1;
  for (const fid of Object.keys(u.factions)) if (fid !== u.player) u.factions[fid].temper = "堅実";
  const 前選 = u.generals.find((x) => x.id === 選.id).loyal;
  const 前低 = u.generals.find((x) => x.id === 低.id).loyal;
  u = H.advanceMonth(u);
  const 後選 = u.generals.find((x) => x.id === 選.id).loyal;
  const 後低 = u.generals.find((x) => x.id === 低.id).loyal;
  const 落ちた = 前選 - 後選;
  確('流言は、選んだ相手に深く刺さる', 落ちた >= 14,
    `${選.name} 忠${Math.round(前選)} → ${Math.round(後選)}（−${Math.round(落ちた)}）`);
  /* 名指ししなかった者は、企てのぶん忠誠を落とさない。

     はじめ「一つ以上落ちなければよい」と見ていたが、これが二十回に一度ほど
     倒れた。忠誠には月々の素のうつろいがある。禄高が望みに足るかで
     −一.二／−〇.五／〇／＋〇.三五／＋〇.七 の段に分かれ（loyaltyDrift）、
     どの段に落ちるかは盤ごとに違う。盤は初手から run ごとに違うので、
     この者が不遇な盤に当たると、流言と関わりなく落ちていたのである。

     測るべきは「流言がこの者にも及んだか」であって、忠誠が動いたかでは
     ない。ゆえに素のうつろいのぶんを差し引いて判ずる。 */
  const 素 = H.loyaltyDrift(u.generals.find((x) => x.id === 低.id));
  確('選ばなかった者の忠誠は、流言では落ちない', 後低 >= 前低 + 素 - 0.05,
    `${低.name} 忠${Math.round(前低 * 10) / 10} → ${Math.round(後低 * 10) / 10}`
    + `（素のうつろい ${素 >= 0 ? '+' : ''}${素}。名指しの ${選.name} は −${Math.round(落ちた)}）`);

  Math.random = 元の乱;

  // 的が要る企ては、相手を定めねば立たない
  const v = H.doPlot(s, 的城.id, '引き抜き', 手.id, null);
  確('引き抜きは、相手を定めねば仕掛けられない',
    v.plots.length === s.plots.length && /定めねば/.test(v.msg || ''), v.msg || '（報せなし）');
  確('金も取られない', v.factions[v.player].gold === s.factions[s.player].gold,
    `${v.factions[v.player].gold}貫`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
