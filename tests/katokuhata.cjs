/* 家督と旗頭（GDD 6.3 / 6.4）。

   遊ぶ側の申し出は「家督を譲った場合、その新しい大名が旗頭だったとき、大名に
   就任した後も旗頭のままとなり、新しい旗頭を任じることができない」であった。

   元は二つ。
     一、旗頭の繕い（旗頭を繕う）は月送りの終いでしか回らない。家督が動いた
         その場では解けないので、役が大名に貼りついたまま枠を塞ぐ。
     二、新しい当主は本拠をおのが城へ移すので、その国は「当主のいる国」になる。
         当主のいる国に旗頭は置かないという決めがあるから、以後そこには誰も
         任じられない。受け持ちの寄騎は寄親を失い、方面ごと宙に浮く。

   家督が動いた、その場で解く。そして受け持ちは、もと受け持ちの国々に根を持つ
   資格者（宿老の身分）へ、寄騎ごと継がせる。ほかの方面軍には手を触れない。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let _s = 0x5151 >>> 0;
Math.random = function () { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* 旗頭を一人立て、別の国の国主を寄騎に取らせる場を組む。
   旗頭の枠は四国につき一人なので、まず国を広げる。 */
function 場を組む() {
  const s = H.initState('oda');
  const fid = 'oda';
  for (const c of s.castles.filter((x) => x.faction !== fid)) {
    if (new Set(s.castles.filter((x) => x.faction === fid).map((x) => x.kuni)).size >= 9) break;
    c.faction = fid;
  }
  const 当主 = s.generals.find((g) => g.faction === fid && g.lord);
  const 本拠 = s.castles.find((c) => c.id === s.factions[fid].本拠);
  const 別城 = s.castles.find((c) => c.faction === fid && c.kuni !== 本拠.kuni);
  別城.koku = Math.max(別城.koku || 0, 90000);
  const 旗 = s.generals.filter((g) => g.faction === fid && !g.lord && !g.captive)
    .sort((a, b) => (b.lead + b.gov) - (a.lead + a.gov))[0];
  旗.本領 = 別城.id; 旗.at = 別城.id; 別城.lordId = 旗.id; 旗.fief = 60000; 旗.age = 35;
  H.国主に任じる(s, fid, 別城.kuni, 旗.id);
  H.旗頭に任じる(s, fid, 旗.id);
  /* 別の国に、宿老の身分を持つ国主を立てて寄騎に取る */
  const 当主国 = new Set(H.当主の国ら(s, fid));
  const 寄ら = [];
  for (const k of [...new Set(s.castles.filter((c) => c.faction === fid
    && c.kuni !== 別城.kuni && !当主国.has(c.kuni)).map((c) => c.kuni))]) {
    if (寄ら.length >= 2) break;
    const c = s.castles.find((x) => x.faction === fid && x.kuni === k);
    c.koku = Math.max(c.koku || 0, 90000);
    const g = s.generals.filter((x) => x.faction === fid && !x.lord && !x.captive
      && x.id !== 旗.id && !寄ら.some((y) => y.id === x.id))
      .sort((a, b) => (b.lead + b.gov) - (a.lead + a.gov))[0];
    if (!g) break;
    g.本領 = c.id; g.at = c.id; c.lordId = g.id; g.fief = 60000; g.age = 38;
    H.国主に任じる(s, fid, k, g.id);
    if (H.寄騎に取る(s, 旗.id, g.id).ok) 寄ら.push(g);
  }
  return { s, fid, 当主, 旗, 寄ら, 本拠, 別城 };
}

console.log('── 一　旗頭のまま家督を継いだら、その場で役が解ける');
{
  const { s, fid, 当主, 旗 } = 場を組む();
  確('旗頭が立っている', 旗.役 === '旗頭', `${旗.name}（${旗.役国}）`);
  const 後 = H.succeed(s, 当主, '隠居', 旗.id, true);
  確('その者が当主になった', !!後 && 後.id === 旗.id && 後.lord === true, 後 ? 後.name : 'なし');
  確('旗頭の役は、その場で解けている', 旗.役 !== '旗頭', `役 = ${旗.役 == null ? 'なし' : 旗.役}`);
  確('旗頭の一覧にも残らない', !H.旗頭たち(s, fid).some((x) => x.id === 旗.id),
    H.旗頭たち(s, fid).map((x) => x.name).join('、') || 'なし');
  確('繕いを回しても、もう解くものはない', H.旗頭を繕う(s, fid).every((x) => x.id !== 旗.id));
}

console.log('\n── 二　受け持ちは、資格のある者へ引き継がれる');
{
  const { s, fid, 当主, 旗, 寄ら } = 場を組む();
  確('寄騎を預かっている', 寄ら.length >= 1, 寄ら.map((x) => `${x.name}（${x.役国}）`).join('、'));
  H.succeed(s, 当主, '隠居', 旗.id, true);
  const 新 = H.旗頭たち(s, fid);
  確('新しい旗頭が立った', 新.length === 1, 新.map((x) => `${x.name}（${x.役国}）`).join('、') || 'なし');
  if (新.length) {
    確('継いだのは、もと受け持ちの国に根を持つ者', 寄ら.some((x) => x.id === 新[0].id),
      `${新[0].name}（${新[0].役国}）`);
    確('継いだ者は当主ではない', !新[0].lord);
    確('当主のいる国には立てていない', !H.当主の国ら(s, fid).includes(新[0].役国),
      `当主の国 = ${H.当主の国ら(s, fid).join('、')}／継者の国 = ${新[0].役国}`);
  }
  確('戦国記に残る', (s.chronicle || []).some((x) => /旗頭/.test(x.text)),
    (s.chronicle || []).filter((x) => /旗頭/.test(x.text)).slice(-1).map((x) => x.text)[0] || 'なし');
}

console.log('\n── 三　ほかの方面軍の旗頭には手を触れない');
{
  const { s, fid, 当主, 旗 } = 場を組む();
  /* もう一人、別の方面の旗頭を立てる（枠は国数÷四） */
  const 当主国 = new Set(H.当主の国ら(s, fid));
  const 別 = s.generals.filter((g) => g.faction === fid && !g.lord && !g.captive
    && g.id !== 旗.id && g.役 === '国主' && !当主国.has(g.役国))[0];
  let 立った = false;
  if (別 && H.旗頭の枠 && H.旗頭の枠(s, fid) >= 2) 立った = H.旗頭に任じる(s, fid, 別.id).ok;
  else if (別) { 立った = H.旗頭に任じる(s, fid, 別.id).ok; }
  if (!立った) {
    確('別の方面の旗頭が立てられた（枠が足りず、この場は飛ばす）', true);
  } else {
    確('別の方面の旗頭が立っている', 別.役 === '旗頭', `${別.name}（${別.役国}）`);
    H.succeed(s, 当主, '隠居', 旗.id, true);
    確('その者の役はそのまま', 別.役 === '旗頭', `役 = ${別.役 == null ? 'なし' : 別.役}（${別.役国}）`);
  }
}

console.log('\n── 四　旗頭でない者が継いでも、何も壊れない');
{
  const { s, fid, 当主, 旗 } = 場を組む();
  const 平 = s.generals.find((g) => g.faction === fid && !g.lord && !g.captive
    && g.id !== 旗.id && !g.役);
  const 後 = H.succeed(s, 当主, '隠居', 平.id, true);
  確('その者が当主になった', !!後 && 後.id === 平.id);
  確('もとの旗頭はそのまま', 旗.役 === '旗頭', `${旗.name} 役 = ${旗.役 == null ? 'なし' : 旗.役}`);
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
