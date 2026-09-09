/* 号令（GDD 12.5）。

   天下人が諸大名に出陣を命じる。惣無事令が「私戦を停めよ」であるのに対し、
   号令は「ここへ出よ」である。秀吉の小田原がその形で、全国の大名が数筋の道から
   同じ城へ寄せた。

   単なる大規模な陣触れとは違う。天下統一の総仕上げにあたる下知であって、
   身分の梯子がそのまま骨格になる。

     旗頭　　… 預かる方面（複数国）を一手にまとめる
     国主　　… その一国を一手（旗頭のいない国）
     当主　　… 自らのいる国を一手（そこに国主は置かないので）
     臣従大名… その家の全城を一手（本拠から発する）

   国主のいない国は参陣しない。国主を任じるのは大名の権であるから、任じて
   いない国は「まだ差配の届かぬ国」である。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { initState, 参陣の顔ぶれ, 号令を発せるか, 号令を発する, 済んだ号令を片づける,
  出せる兵, 出せる地の兵, 旗の下の家ら, 号令の限り, 号令できるか, 国主に任じる, 旗頭に任じる,
  minGarrison, 軍の道, 遠征の兵糧 } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 五畿 = ['山城', '大和', '河内', '和泉', '摂津'];
const 具 = {
  軍の名: (s, 頭) => `${頭}${(s.軍番 = (s.軍番 || 0) + 1)}`,
  道を引く: (s, fid, a, b) => 軍の道(s, fid, a, b),
  兵糧: (人, 月) => 遠征の兵糧(人, 月),
};

/* 天下人を仕立てる。五畿を直轄で押さえ、諸家を臣従させて版図を作る。 */
const 天下人にする = () => {
  const s = initState('oda');
  for (const c of s.castles.filter((x) => 五畿.includes(x.kuni))) c.faction = 'oda';
  const 全 = () => s.castles.reduce((a, c) => a + c.koku, 0);
  const 直 = () => s.castles.filter((c) => c.faction === 'oda').reduce((a, c) => a + c.koku, 0);
  /* 地続きに育てる。飛び地に散らすと、軍の道が引けず参陣の手が立たない
     （盤の並び順に取っていたころは、二十手のうち十九手が道を引けなかった）。
     他家の領を素通りしてはならないという掟が、そのまま効くからである。 */
  const 隣を取る = () => {
    const 我 = new Set(s.castles.filter((c) => c.faction === 'oda').map((c) => c.id));
    for (const id of 我) {
      for (const 隣 of (H.ROAD_ADJ[id] || [])) {
        const c = s.castles.find((x) => x.id === 隣);
        if (c && c.faction !== 'oda') return c;
      }
    }
    return null;
  };
  for (let i = 0; i < 300 && 直() < 全() * H.天下人の直轄; i++) {
    const c = 隣を取る(); if (!c) break; c.faction = 'oda';
  }
  /* 旗の下も地続きの家から。遠国の家を旗の下に置いても、道が引けねば参陣できない。 */
  const 旗の下か = (f) => {
    if (f === 'oda') return true;
    const r = s.relations[['oda', f].sort().join('|')];
    return !!r && r.state === '臣従' && r.master === 'oda';
  };
  const 隣の家 = () => {
    /* 勢力の際（きわ）から広げる。直轄の隣だけを見ていると、直臣の隣家が
       みな旗の下に入った時点で止まる（五十五城で頭打ちになった）。 */
    const 際 = s.castles.filter((c) => 旗の下か(c.faction));
    for (const c of 際) for (const 隣 of (H.ROAD_ADJ[c.id] || [])) {
      const x = s.castles.find((y) => y.id === 隣);
      if (!x || 旗の下か(x.faction)) continue;
      return x.faction;
    }
    return null;
  };
  for (let i = 0; i < 200 && H.旗の下の城数(s, 'oda') < s.castles.length * H.天下人の版図; i++) {
    const f = 隣の家(); if (!f) break;
    s.relations[['oda', f].sort().join('|')] = { state: '臣従', master: 'oda', trust: 100, until: null };
  }
  /* 城を移しただけでは将は移らない。その城にいた者も家に付ける――そうしないと
     国主に任じる相手がおらず、参陣の手が立たない（仕込みの誤りで一度背いた）。 */
  for (const c of s.castles.filter((x) => x.faction === 'oda')) {
    for (const g of s.generals.filter((x) => x.at === c.id && !x.captive && !x.lord)) {
      g.faction = 'oda'; g.本領 = c.id; g.役 = null; g.役国 = null; g.寄親 = null;
    }
  }
  /* 兵と糧を持たせる。号令は総仕上げの下知なので、痩せた盤では測れない。 */
  for (const c of s.castles) { c.local = Math.max(c.local, minGarrison(c) + 1200); c.food = 200000; }
  return s;
};
/* その家の国々に国主を立てる。当主のいる国には立たない（GDD 6.4）。 */
const 国主を並べる = (s, fid = 'oda') => {
  const 国 = [...new Set(s.castles.filter((c) => c.faction === fid).map((c) => c.kuni))];
  const 立った = [];
  for (const k of 国) {
    const 候 = s.generals.filter((g) => g.faction === fid && !g.lord && !g.captive && !g.役
      && (s.castles.find((c) => c.id === (g.本領 || g.at)) || {}).kuni === k);
    for (const g of 候) {
      g.fief = 14000; g.age = Math.max(g.age || 30, 30);
      if (国主に任じる(s, fid, k, g.id).ok) { 立った.push(k); break; }
    }
  }
  return 立った;
};

console.log('── 一　参陣の顔ぶれ');
{
  const s = 天下人にする();
  const 立 = 国主を並べる(s);
  const 顔 = 参陣の顔ぶれ(s, 'oda');
  確('顔ぶれが並ぶ', 顔.length > 0, `${顔.length}手`);
  const 内訳 = {};
  for (const x of 顔) 内訳[x.種別] = (内訳[x.種別] || 0) + 1;
  確('国主・当主・臣従の三種が並ぶ',
    (内訳['一国'] || 0) > 0 && (内訳['臣従'] || 0) > 0,
    Object.entries(内訳).map(([k, v]) => `${k}${v}`).join('／'));
  確('当主のいる国は当主が率いる', (内訳['当主'] || 0) === 1,
    `${(内訳['当主'] || 0)}手　（当主のいる国に国主は置かないので）`);
  確('国主を立てた国はみな参陣できる',
    顔.filter((x) => x.種別 === '一国' && 立.includes(x.国ら[0])).every((x) => x.出られる),
    `国主を立てた国 ${立.length}　参陣できる一国の手 ${顔.filter((x) => x.種別 === '一国' && x.出られる).length}`);
  確('臣従した家はすべて一手を出す',
    顔.filter((x) => x.種別 === '臣従').length === 旗の下の家ら(s, 'oda').length,
    `旗の下 ${旗の下の家ら(s, 'oda').length}家`);
}

console.log('\n── 二　国主のいない国は参陣しない');
{
  const s = 天下人にする();
  // 国主を一人も立てない
  const 顔 = 参陣の顔ぶれ(s, 'oda');
  const 一国 = 顔.filter((x) => x.種別 === '一国');
  確('国主のいない国は出られない', 一国.length > 0 && 一国.every((x) => !x.出られる),
    `${一国.length}国すべて`);
  確('その訳が読める', 一国.every((x) => /国主がいない/.test(x.訳 || '')),
    (一国[0] || {}).訳 || '');
  確('兵は零と数える', 一国.every((x) => x.兵 === 0));
  // 国主を立てれば出られる
  const 立 = 国主を並べる(s);
  const 顔2 = 参陣の顔ぶれ(s, 'oda');
  確('国主を任じれば参陣できるようになる',
    顔2.filter((x) => x.種別 === '一国' && x.出られる).length > 0,
    `${立.length}国に国主を立てた → ${顔2.filter((x) => x.種別 === '一国' && x.出られる).length}手`);
}

console.log('\n── 三　旗頭は方面をまとめて一手');
{
  const s = 天下人にする();
  国主を並べる(s);
  const 国主ら = s.generals.filter((g) => g.faction === 'oda' && g.役 === '国主');
  確('国主が二人以上いる', 国主ら.length >= 2, `${国主ら.length}名`);
  if (国主ら.length >= 2) {
    const 旗 = 国主ら[0];
    旗.fief = 30000;                                   // 宿老（旗頭に要る身分）
    const 方面 = 国主ら.slice(0, 3).map((g) => g.役国);
    const r = 旗頭に任じる(s, 'oda', 旗.id, 方面);
    確('旗頭に任じられる', r.ok, r.ok ? `${旗.name}〔${r.国.join('・')}〕` : r.why);
    if (r.ok) {
      const 顔 = 参陣の顔ぶれ(s, 'oda');
      const 手 = 顔.find((x) => x.種別 === '方面');
      確('方面の手が一つ立つ', !!手, 手 ? `${手.将名}〔${手.国ら.join('・')}〕${手.兵}人` : 'なし');
      確('その方面の国は、別に一国の手を出さない',
        !顔.some((x) => x.種別 === '一国' && 手.国ら.includes(x.国ら[0])),
        '方面がまとめる');
      確('方面の兵は、その国々の城から集めた分である',
        手.城ら.length === s.castles.filter((c) => c.faction === 'oda' && 手.国ら.includes(c.kuni)).length,
        `${手.城ら.length}城`);
    }
  }
}

console.log('\n── 四　兵は守備を残した分だけ');
{
  const s = 天下人にする();
  国主を並べる(s);
  const 顔 = 参陣の顔ぶれ(s, 'oda').filter((x) => x.出られる && x.兵 > 0);
  const 手 = 顔[0];
  const 手勘定 = 手.城ら.reduce((a, cid) => {
    const c = s.castles.find((x) => x.id === cid);
    return a + Math.max(0, (c.local || 0) - minGarrison(c));
  }, 0);
  確('城の兵から守備の分を引いた数になる', 手.兵 >= 手勘定,
    `${手.兵}人（守備を引いた地の兵 ${手勘定}人＋直属）`);
  /* 地の兵と直属を混ぜて数えてはならない。直属は将とともに動く手勢であって、
     城に残る兵ではない。混ぜていたころは、直属の多い城で守備の分まで
     根こそぎ割かれた（長島城で兵一八四〇のうち二〇六〇を出せる、という勘定）。 */
  const 城 = s.castles.find((c) => c.id === 手.城ら[0]);
  確('地の兵から守備の分は必ず残る', 出せる地の兵(s, 城) === Math.max(0, 城.local - minGarrison(城)),
    `${城.name}　地の兵 ${城.local}人／出せる ${出せる地の兵(s, 城)}人（守備 ${minGarrison(城)}人）`);
  確('出せる総勢は、地の兵の余りに直属を足したもの',
    出せる兵(s, 城) >= 出せる地の兵(s, 城),
    `${出せる地の兵(s, 城)}人＋直属 ＝ ${出せる兵(s, 城)}人`);
  /* 発したあとも、守備の兵はその城に残っていなければならない。 */
  {
    const t = 天下人にする();
    国主を並べる(t);
    const 的 = t.castles.find((c) => c.faction !== 'oda' && !旗の下の家ら(t, 'oda').includes(c.faction));
    const 可 = 号令を発せるか(t, 'oda', 的.id, { 号令できるか });
    const 前 = 可.ok ? 可.手ら[0].城ら.map((id) => {
      const c = t.castles.find((x) => x.id === id); return { id, 守: minGarrison(c) };
    }) : [];
    if (可.ok) 号令を発する(t, 'oda', 的.id, 可.手ら, 具);
    const 欠 = 前.filter(({ id, 守 }) => (t.castles.find((x) => x.id === id) || {}).local < 守);
    確('発したあとも、どの城にも守備の兵が残る', 欠.length === 0,
      欠.length ? 欠.map(({ id }) => (t.castles.find((x) => x.id === id) || {}).name).join('・') : `${前.length}城を検めた`);
  }
}

console.log('\n── 五　号令を発する');
{
  const s = 天下人にする();
  国主を並べる(s);
  確('天下人は号令できる', 号令できるか(s, 'oda'));
  const 的 = s.castles.find((c) => c.faction !== 'oda'
    && !旗の下の家ら(s, 'oda').includes(c.faction));
  const 可 = 号令を発せるか(s, 'oda', 的.id, { 号令できるか });
  確('発せる', 可.ok, 可.ok ? `${可.手ら.length}手が参陣できる` : 可.why);
  if (可.ok) {
    const 前 = (s.armies || []).length;
    const 号 = 号令を発する(s, 'oda', 的.id, 可.手ら, 具);
    確('号令が立つ', !!号, 号 ? `${号.手.length}手・${号.手.reduce((a, h) => a + h.兵, 0)}人` : 'なし');
    確('手の数だけ軍が立つ', (s.armies || []).length === 前 + 号.手.length,
      `軍 ${前} → ${(s.armies || []).length}`);
    確('どの軍も同じ城を目指す',
      号.手.every((h) => ((s.armies || []).find((a) => a.id === h.armyId) || {}).target === 的.id),
      `${的.name}へ収斂する`);
    確('号令の軍と分かる印がある',
      号.手.every((h) => ((s.armies || []).find((a) => a.id === h.armyId) || {}).号令 === true));
    /* 臣従家の軍は、主家の助勢として立つ。 */
    const 臣 = 号.手.filter((h) => h.種別 === '臣従');
    確('臣従家も兵を出す', 臣.length > 0, `${臣.length}家`);
  }
}

console.log('\n── 六　同じ者は二筋に出られない');
{
  const s = 天下人にする();
  国主を並べる(s);
  const 敵ら = [...new Set(s.castles.filter((c) => c.faction !== 'oda'
    && !旗の下の家ら(s, 'oda').includes(c.faction)).map((c) => c.id))];
  const 可1 = 号令を発せるか(s, 'oda', 敵ら[0], { 号令できるか });
  const 号1 = 可1.ok ? 号令を発する(s, 'oda', 敵ら[0], 可1.手ら, 具) : null;
  確('一筋目が立つ', !!号1, 号1 ? `${号1.手.length}手` : 'なし');
  const 出た = new Set((号1 ? 号1.手 : []).map((h) => h.将));
  const 顔2 = 参陣の顔ぶれ(s, 'oda');
  確('一筋目に出た者は、二筋目の顔ぶれに出られない',
    顔2.filter((x) => 出た.has(x.将)).every((x) => !x.出られる),
    顔2.filter((x) => 出た.has(x.将)).length ? (顔2.find((x) => 出た.has(x.将)) || {}).訳 : '（残る者がいない）');
}

console.log('\n── 七　筋の数には限りがある');
{
  const s = 天下人にする();
  国主を並べる(s);
  s.号令 = Array.from({ length: 号令の限り }, (_, i) => ({ id: `x${i}`, 主: 'oda', 的: `dummy${i}`, 手: [] }));
  const 的 = s.castles.find((c) => c.faction !== 'oda' && !旗の下の家ら(s, 'oda').includes(c.faction));
  const 可 = 号令を発せるか(s, 'oda', 的.id, { 号令できるか });
  確('限りを超えては発せない', !可.ok, 可.why);
  確('限りは五筋', 号令の限り === 5, `${号令の限り}筋`);
}

console.log('\n── 八　天下人でなければ号令できない');
{
  const s = initState('oda');
  const 的 = s.castles.find((c) => c.faction !== 'oda');
  const 可 = 号令を発せるか(s, 'oda', 的.id, { 号令できるか });
  確('位のない家は号令できない', !可.ok, 可.why);
}

console.log('\n── 九　済んだ号令は片づく');
{
  const s = 天下人にする();
  国主を並べる(s);
  const 的 = s.castles.find((c) => c.faction !== 'oda' && !旗の下の家ら(s, 'oda').includes(c.faction));
  const 可 = 号令を発せるか(s, 'oda', 的.id, { 号令できるか });
  号令を発する(s, 'oda', 的.id, 可.手ら, 具);
  確('号令が控えられている', (s.号令 || []).length === 1);
  確('的が落ちる前は片づかない', 済んだ号令を片づける(s).length === 0 && (s.号令 || []).length === 1);
  的.faction = 'oda';                                   // 落とした
  const 済 = 済んだ号令を片づける(s);
  確('的が落ちれば片づく', 済.length === 1 && (s.号令 || []).length === 0,
    済.length ? `${的.name}が落ちた` : '');
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
