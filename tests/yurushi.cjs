/* 攻めの許し（GDD 12.2）。

   臣従した家は、主家の許しなくして他家を攻められない。臣従は旗の下に完全に
   入ることであり、外交を主に預ける。その家が勝手に隣国へ攻めかかれば、主家の
   外交はたちまち破れる。臣従した家の戦は、主家の戦でもある。

   さりとて一切を封じては、臣従した家で遊ぶ幅が無くなる。願い出て、容認されれば
   攻められる、という形にした。許しは城ごとに一度――主家が干渉地の位置を細かく
   定められるようにするためである。

   従属は臣従ではない。自らの判断で他家を攻めてよい。貢と援軍の義務はあるが、
   それ以外は独立した家である。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { initState, advanceMonth, 臣従の主, 許しの要る主, 許されているか, 攻められるか,
  許しを与える, 許しを解く, 容認するか, 済んだ許しを片づける, reinforceOffers, sackCastle } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 0x3131;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* 主（今川）に臣従した家（松平）と、よその家（斎藤）の城を仕立てる */
const 場 = (state = '臣従') => {
  const s = initState('oda');
  const 臣 = 'matsudaira', 主 = 'imagawa';
  s.relations[[臣, 主].sort().join('|')] = { trust: 90, state, until: null, master: 主 };
  const 他城 = s.castles.find((c) => c.faction !== 臣 && c.faction !== 主 && c.faction !== 'oda');
  const 主城 = s.castles.find((c) => c.faction === 主);
  const 己城 = s.castles.find((c) => c.faction === 臣);
  return { s, 臣, 主, 他城, 主城, 己城 };
};

console.log('── 一　誰が誰の下にいるか');
{
  const { s, 臣, 主 } = 場();
  確('臣従していれば、主が知れる', 臣従の主(s, 臣) === 主, `${臣} の主は ${臣従の主(s, 臣)}`);
  確('主のほうには主がいない', 臣従の主(s, 主) === null);
  const 従 = 場('従属');
  確('従属は臣従ではない（主は返さない）', 臣従の主(従.s, 従.臣) === null,
    `従属のとき ${臣従の主(従.s, 従.臣)}`);
}

console.log('\n── 二　どの城に許しが要るか');
{
  const { s, 臣, 主, 他城, 主城, 己城 } = 場();
  確('よその家の城には許しが要る', 許しの要る主(s, 臣, 他城.id) === 主,
    `${他城.name}（${s.factions[他城.faction].name}）`);
  確('自領には要らない', 許しの要る主(s, 臣, 己城.id) === null, 己城.name);
  確('主家の城には要らない（叛乱は別の筋）', 許しの要る主(s, 臣, 主城.id) === null, 主城.name);
  const 従 = 場('従属');
  確('従属はどこへでも自らの判断で攻められる',
    許しの要る主(従.s, 従.臣, 従.他城.id) === null && 攻められるか(従.s, 従.臣, 従.他城.id),
    `${従.他城.name}へ許し不要`);
}

console.log('\n── 三　許しを得れば攻められる');
{
  const { s, 臣, 他城 } = 場();
  確('はじめは攻められない', !攻められるか(s, 臣, 他城.id));
  許しを与える(s, 臣, 他城.id);
  確('許されれば攻められる', 攻められるか(s, 臣, 他城.id) && 許されているか(s, 臣, 他城.id));
  const 別 = s.castles.find((c) => c.id !== 他城.id && c.faction === 他城.faction);
  if (別) 確('許しは城ごと。別の城には及ばない', !攻められるか(s, 臣, 別.id), 別.name);
  許しを解く(s, 臣, 他城.id);
  確('解けばまた攻められない', !攻められるか(s, 臣, 他城.id));
}

console.log('\n── 四　主家が容認するかどうか');
{
  const { s, 臣, 主, 他城 } = 場();
  const 判 = 容認するか(s, 主, 臣, 他城.id, () => 0.1);
  確('約束の無い相手なら容認する', 判.ok, 判.why || '');
  // 主家がその家と同盟していれば、臣下に攻めさせない
  const s2 = 場().s;
  s2.relations[[主, 他城.faction].sort().join('|')] = { trust: 80, state: '同盟', until: null };
  const 判2 = 容認するか(s2, 主, 臣, 他城.id, () => 0.1);
  確('主家が約束を交わした相手は攻めさせない', !判2.ok, 判2.why);
  const 判3 = 容認するか(s, 主, 臣, 他城.id, () => 0.99);
  確('容認せぬこともある', !判3.ok, 判3.why);
}

console.log('\n── 五　済んだ許しは片づく');
{
  const { s, 臣, 他城 } = 場();
  許しを与える(s, 臣, 他城.id);
  const c = s.castles.find((x) => x.id === 他城.id);
  c.faction = 臣;                                   // 落とした
  済んだ許しを片づける(s);
  確('落とした城の許しは残らない', !許されているか(s, 臣, 他城.id), `${(s.攻めの許し || []).length}件`);
  const u = 場();
  許しを与える(u.s, u.臣, u.他城.id);
  u.s.relations[[u.臣, u.主].sort().join('|')] = { trust: 10, state: '敵対', until: null };
  済んだ許しを片づける(u.s);
  確('旗の下を離れれば許しも消える', !許されているか(u.s, u.臣, u.他城.id));
}

console.log('\n── 六　臣従の軍は、許しを得ぬまま他家へ出ない');
{
  /* 主家が他家なら、願いはその場で采配が裁く。おおむね容認するので軍は出る。
     出ること自体は正しい――見るべきは「許しを得ずに出ていないか」である。 */
  const 走る = (仕度) => {
    let s = 場().s;
    const 臣 = 'matsudaira';
    s.autoPlay = true;
    for (const c of s.castles.filter((x) => x.faction === 臣)) { c.local += 4000; c.food += 30000; }
    s.factions[臣].gold += 4000;
    if (仕度) 仕度(s);
    const 見た = new Set();
    let 出た = 0, 無断 = 0;
    for (let i = 0; i < 18; i++) {
      s = advanceMonth(s);
      for (const a of s.armies || []) {
        if (a.faction !== 臣 || 見た.has(a.id)) continue;
        const t = s.castles.find((c) => c.id === a.target);
        if (!t || 許しの要る主(s, 臣, t.id) === null) continue;
        見た.add(a.id); 出た++;
        if (!許されているか(s, 臣, t.id)) 無断++;
      }
    }
    return { 出た, 無断 };
  };
  const 常 = 走る(null);
  確('臣従の軍が、許しを得ぬまま他家へ出ることはない', 常.無断 === 0,
    `十八か月で ${常.出た} 度出て、無断は ${常.無断} 度`);
  確('主家が容認すれば出る（封じきりではない）', 常.出た > 0, `${常.出た} 度`);

  /* 主家がその家と約束を交わしていれば、臣下に攻めさせない。
     臣従した家の戦は主家の戦であり、自ら約束を破るのと変わらないからである。 */
  const 縛 = 走る((s) => {
    for (const fid of Object.keys(s.factions)) {
      if (fid === 'imagawa' || fid === 'matsudaira') continue;
      s.relations[['imagawa', fid].sort().join('|')] = { trust: 80, state: '同盟', until: null };
    }
  });
  確('主家が方々と約束していれば、臣下は攻めに出られない', 縛.出た === 0,
    `十八か月で ${縛.出た} 度`);
}

console.log('\n── 七　援軍は主家とその下の家に頼める');
{
  /* 臣従した家が他家を攻めるとき、主家に援軍を求められる。
     同じ主の下にある兄弟分の家にも頼める（下知は通らぬが、頼む筋はある）。 */
  const s = initState('matsudaira');            // 遊ぶ側を松平にする
  const 主 = 'imagawa', 兄弟 = 'oda';
  s.relations[['matsudaira', 主].sort().join('|')] = { trust: 90, state: '臣従', until: null, master: 主 };
  s.relations[[兄弟, 主].sort().join('|')] = { trust: 90, state: '臣従', until: null, master: 主 };
  const 己城 = s.castles.find((c) => c.faction === 'matsudaira');
  const 的 = s.castles.find((c) => c.faction !== 'matsudaira' && c.faction !== 主 && c.faction !== 兄弟
    && (H.findPath(己城.id, c.id) || []).length === 2);
  for (const c of s.castles) { c.food = 90000; c.local = Math.max(c.local, 6000); }
  const 申 = reinforceOffers(s, 己城.id, 的.id) || [];
  const 種 = (fid) => 申.filter((x) => x.faction === fid && x.men > 0);
  確('主家に援軍を求められる', 種(主).length > 0,
    `${s.factions[主].name}の城 ${種(主).length}件`);
  確('同じ主の下の家にも頼める', 種(兄弟).length > 0,
    `${s.factions[兄弟].name}の城 ${種(兄弟).length}件（${(種(兄弟)[0] || {}).kind || ''}）`);
  /* 主家にも兄弟分にも、下知は通らない。頼むだけである。
     出るか出ぬか、どれだけ出すかは相手が決める（臣従は下から上へ命じられない）。 */
  確('主家には下知が通らない（頼むだけ）', 種(主).every((x) => !x.指図),
    `${種(主).length}件とも「頼む」`);
  確('兄弟分にも下知は通らない', 種(兄弟).every((x) => !x.指図),
    `${種(兄弟).length}件とも「頼む」`);
}

console.log('\n── 八　主家が臣従の家を動かせば、落とした城はその家の領になる');
{
  /* 遊ぶ側が主家のとき、臣従した家の城から出陣できる（城の帳の差配）。
     出す家は「出陣元の城の家」であるから、その軍は臣従した家の軍である。
     落とせば、その城はその家の領となる――干渉地を作る手立てである。 */
  const s = initState('oda');
  const 臣 = 'matsudaira';
  s.relations[[臣, 'oda'].sort().join('|')] = { trust: 90, state: '臣従', until: null, master: 'oda' };
  const 臣城 = s.castles.find((c) => c.faction === 臣);
  const 的 = s.castles.find((c) => c.faction !== 臣 && c.faction !== 'oda');
  const 将 = s.generals.filter((x) => x.at === 臣城.id && x.faction === 臣 && !x.captive).slice(0, 2);
  for (const t of 将) t.at = null;
  const 軍 = { id: 'V1', faction: 臣城.faction, from: 臣城.id, gens: 将.map((x) => x.id),
    local: 4000, localTrain: 70, rost: null, men: 4000 + 将.reduce((a, x) => a + x.retinue, 0),
    at: 的.id, path: [的.id], prog: 0, food: 9000, target: 的.id, sieging: true };
  s.armies.push(軍);
  確('臣従の城から出た軍は、その家の軍である', 軍.faction === 臣, 軍.faction);
  sackCastle(s, s.castles.find((c) => c.id === 的.id), 軍, true);
  確('落とした城は臣従した家の領になる（主家の領ではない）',
    s.castles.find((c) => c.id === 的.id).faction === 臣,
    `${的.name} → ${s.factions[s.castles.find((c) => c.id === 的.id).faction].name}`);
}

console.log(`\n════ 攻めの許し：咎 ${咎.length} 件`);
console.log('エラー:', 咎.length ? 咎.join(' | ') : 'なし');
process.exit(咎.length ? 1 : 0);
