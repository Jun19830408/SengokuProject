/* 役持ちの根 ─ 国主・旗頭は、勝手に寄親から離れない（GDD 6.4）。

   遊ぶ側の報せは「旗頭が他国を攻めた後、国主を別の城に入れると寄親を離れる」。
   調べると、役（国主・旗頭）は根＝本領の国に結びついているのに、別の城へ入れると
   根がその城へ移っていた。根の国と役国が食い違うので、月ごとの繕いが役を剥ぐ。

   剥がれたあとの連鎖は二段である。
     一、その国主に付いていた寄騎（その国の城主たち）が残らず解ける
     二、旗頭の受け持ちが、元の国から新しい国へ化ける
         （受け持ちは「己の国と寄騎の国」であり、寄騎の国は国主なら役国、
           そうでなければ根の国で数えるからである）
         その結果、元の国に残る他の寄騎も「届かぬ」として解ける

   根を動かしていた経路（実測）

     落とした城を委ねる    即、役が外れる
     軍がそのまま入城      即、役が外れる
     人事で城主に任じる    翌月の繕いで外れる
     帰陣・在陣            もとより護られていた

   在陣も入城も自由でよい。根＝知行の地を移すのは国替えであって、大名の下知
   （国主に任じる・移封）によってのみ起こる。ここではその筋を検める。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x99;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* 旗頭（美濃）―国主（近江）―その寄騎（近江の城主）という筋を仕立て、
   三河の城を攻め取った体にする。 */
function 盤を組む() {
  const s = H.initState('oda');
  const fid = s.player;
  for (const c of s.castles) {
    if (['尾張', '美濃', '伊勢', '近江', '志摩', '伊賀', '遠江', '飛騨'].includes(c.kuni)) c.faction = fid;
  }
  const 我 = () => s.castles.filter((c) => c.faction === fid);
  const 城 = (kuni) => 我().filter((c) => c.kuni === kuni);
  const 家臣 = s.generals.filter((g) => g.faction === fid && !g.lord && !g.captive);
  for (const g of 家臣.slice(0, 10)) { g.fief = 60000; g.age = Math.max(28, g.age || 28); }
  const 置く = (g, c) => { g.at = c.id; g.本領 = c.id; c.lordId = g.id; };
  const 旗 = 家臣[0], 国主 = 家臣[1], 寄騎 = 家臣[2];
  置く(旗, 城('美濃')[0]); 置く(国主, 城('近江')[0]); 置く(寄騎, 城('近江')[1]);
  H.国主に任じる(s, fid, '美濃', 旗.id);
  H.国主に任じる(s, fid, '近江', 国主.id);
  H.旗頭に任じる(s, fid, 旗.id);
  H.寄騎に取る(s, 旗.id, 国主.id);
  H.寄騎に取る(s, 国主.id, 寄騎.id);
  const 的 = s.castles.find((c) => c.kuni === '三河' && c.faction !== fid);
  的.faction = fid; 的.lordId = null;
  return { s, fid, 旗id: 旗.id, 国主id: 国主.id, 寄騎id: 寄騎.id, 的, 城 };
}
const 姿 = (t) => {
  const G = (id) => t.s.generals.find((x) => x.id === id);
  return { 役: G(t.国主id).役 || null, 役国: G(t.国主id).役国 || null,
    寄親: !!G(t.国主id).寄親, 孫寄騎: !!G(t.寄騎id).寄親,
    受け持ち: H.旗頭の受け持ち(t.s, G(t.旗id)).join('・') };
};
const 繕う = (t) => { H.国主を繕う(t.s, t.fid); H.寄騎を繕う(t.s, t.fid); H.旗頭を繕う(t.s, t.fid); };
const 検める = (名, t) => {
  繕う(t);
  const a = 姿(t);
  確(`${名}　国主の役が残る`, a.役 === '国主' && a.役国 === '近江', `${a.役 || 'なし'}／${a.役国 || '―'}`);
  確(`${名}　旗頭の寄騎のまま`, a.寄親);
  確(`${名}　その国主の寄騎も解けない`, a.孫寄騎);
  確(`${名}　旗頭の受け持ちが化けない`, a.受け持ち === '美濃・近江', a.受け持ち);
};

console.log('■ 仕込み');
{ const t = 盤を組む(); const a = 姿(t);
  確('国主・寄騎・受け持ちが立っている', a.役 === '国主' && a.寄親 && a.孫寄騎 && a.受け持ち === '美濃・近江',
    `${a.役}/${a.役国}・受け持ち ${a.受け持ち}`); }

console.log('■ 一、落とした城を委ねる');
{
  const t = 盤を組む();
  t.s.armies = [{ id: 'a1', faction: t.fid, from: t.城('美濃')[0].id, gens: [t.国主id],
    local: 3000, localTrain: 70, men: 3000, at: t.的.id, path: [t.的.id], prog: 0, food: 9999, target: t.的.id, rost: null }];
  H.城を委ねる(t.s, t.的.id, 'a1', { 城主: t.国主id, 所属: [t.国主id], 兵: 500 });
  const 根 = t.s.castles.find((c) => c.id === t.s.generals.find((g) => g.id === t.国主id).本領);
  確('委ねても根は動かない', 根 && 根.kuni === '近江', `根は${根 ? 根.name : '無し'}`);
  検める('委ねる', t);
}

console.log('■ 二、軍がそのまま入城する');
{
  const t = 盤を組む();
  const 軍 = { id: 'a2', faction: t.fid, from: t.城('美濃')[0].id, gens: [t.国主id],
    local: 2000, localTrain: 70, men: 2000, at: t.的.id, path: [t.的.id], prog: 0, food: 9999, target: t.的.id, rost: null };
  t.s.armies = [軍];
  H.城に合流する(t.s, 軍, t.的);
  検める('入城', t);
}

console.log('■ 三、人事で別の国の城主に任じる');
{
  const t = 盤を組む();
  t.s.generals.find((g) => g.id === t.国主id).at = t.的.id;
  t.s = H.appoint(t.s, t.的.id, t.国主id);
  確('城主の札は預かれる', t.s.castles.find((c) => c.id === t.的.id).lordId === t.国主id);
  検める('城主に任じる', t);
}

console.log('■ 四、采配は役持ちを城主に据えない（大名の下知によらぬ国替えをしない）');
{
  const t = 盤を組む();
  const 軍 = { id: 'a4', faction: t.fid, from: t.城('美濃')[0].id, gens: [t.国主id, t.旗id],
    local: 2000, localTrain: 70, men: 2000, at: t.的.id, path: [t.的.id], prog: 0, food: 9999, target: t.的.id,
    rost: null, 旗頭: t.旗id };
  t.s.armies = [軍];
  const 差 = H.委ねる差配(t.s, t.的, 軍);
  確('旗頭も国主も、自動では城主に据えない', 差.城主 !== t.国主id && 差.城主 !== t.旗id,
    `城主に選ばれたのは ${差.城主 || 'なし'}`);
}

console.log('■ 五、根がずれた古い記録は、剥ぐ前に戻す');
{
  const t = 盤を組む();
  // 古い版で入城して根が三河へ移ってしまった姿を仕込む
  const g = t.s.generals.find((x) => x.id === t.国主id);
  g.本領 = t.的.id; g.at = t.的.id;
  繕う(t);
  const 根 = t.s.castles.find((c) => c.id === t.s.generals.find((x) => x.id === t.国主id).本領);
  確('役国に自分の城があれば、根を戻して役を守る', 姿(t).役 === '国主' && 根 && 根.kuni === '近江',
    `役=${姿(t).役 || 'なし'}／根=${根 ? `${根.name}（${根.kuni}）` : '無し'}`);
}

console.log('■ 六、国を失えば、これまで通り役は離れる');
{
  const t = 盤を組む();
  for (const c of t.s.castles) if (c.kuni === '近江') c.faction = 'ima';   // 近江をそっくり失う
  繕う(t);
  const a = 姿(t);
  確('預かる国を失えば国主でなくなる', a.役 == null, `${a.役 || 'なし'}`);
  確('その者の寄騎も解ける', !a.孫寄騎);
}

/* ---------------------------------------------------------------- 城主の移り

   同じ武将が二つの城の城主になっていた（実測では三十年で二人、城主札の
   七／一七二が本領でない城）。原因は二つ。

     一、城主の空いた城に将が立ち寄るだけで自動の札据えが据え、立ち去っても残る
     二、人事の「城主に任じる」が元の城の札を降ろさない

   城を移るとは、元の城を明け渡すことである。据えるときに他の札を降ろし、
   明けた城は残る将が継ぐ。寄親の筋も継ぐ（その城を束ねるという筋であって、
   人に付いた縁ではないからである）。

   取った城の城主は、その国に国主がいればその寄騎、いなければ攻め取った旗頭の
   寄騎とする。旗頭の手の届かぬ国でも、取った以上は方面のうちである。 */
function 移りの盤(新国に国主を置く) {
  const s = H.initState('oda');
  const fid = s.player;
  for (const c of s.castles) {
    if (['尾張', '美濃', '伊勢', '近江', '志摩', '伊賀', '遠江', '飛騨', '三河'].includes(c.kuni)) c.faction = fid;
  }
  const 我 = () => s.castles.filter((c) => c.faction === fid);
  const 城 = (k) => 我().filter((c) => c.kuni === k);
  const ら = s.generals.filter((g) => g.faction === fid && !g.lord && !g.captive);
  for (const g of ら.slice(0, 12)) { g.fief = 60000; g.age = Math.max(28, g.age || 28); }
  const 置く = (g, c) => { g.at = c.id; g.本領 = c.id; c.lordId = g.id; };
  const [旗, 国主, 移る, 留守, 新国主] = ら;
  置く(旗, 城('美濃')[0]); 置く(国主, 城('近江')[0]); 置く(移る, 城('近江')[1]);
  留守.at = 城('近江')[1].id; 留守.本領 = 城('近江')[1].id;
  H.国主に任じる(s, fid, '美濃', 旗.id);
  H.国主に任じる(s, fid, '近江', 国主.id);
  H.旗頭に任じる(s, fid, 旗.id);
  H.寄騎に取る(s, 旗.id, 国主.id);
  H.寄騎に取る(s, 国主.id, 移る.id);
  if (新国に国主を置く) { 置く(新国主, 城('三河')[0]); H.国主に任じる(s, fid, '三河', 新国主.id); }
  const 的 = s.castles.find((c) => c.kuni === '三河' && c.faction === fid && !c.lordId);
  的.lordId = null;
  s.armies = [{ id: 'a1', faction: fid, from: 城('近江')[1].id, gens: [移る.id, 旗.id],
    local: 3000, localTrain: 70, men: 3000, at: 的.id, path: [的.id], prog: 0, food: 9999,
    target: 的.id, rost: null, 旗頭: 旗.id }];
  return { s, fid, 旗, 国主, 移る, 留守, 新国主, 的, 元城: 城('近江')[1] };
}

console.log('■ 七、城を移れば元の城を明け渡す（二つの城の城主にならない）');
{
  const t = 移りの盤(false);
  H.城を委ねる(t.s, t.的.id, 'a1', { 城主: t.移る.id, 所属: [t.移る.id], 兵: 500 });
  const 札 = t.s.castles.filter((c) => c.lordId === t.移る.id);
  確('移った者の札は一つだけ', 札.length === 1 && 札[0].id === t.的.id,
    札.map((c) => c.name).join('・') || 'なし');
  const 元 = t.s.castles.find((c) => c.id === t.元城.id);
  確('元の城は、残る将が継ぐ', 元.lordId === t.留守.id,
    (t.s.generals.find((x) => x.id === 元.lordId) || {}).name || '不在');
  const 留 = t.s.generals.find((x) => x.id === t.留守.id);
  確('元の城主の寄親の筋も継ぐ', 留.寄親 === t.国主.id,
    (t.s.generals.find((x) => x.id === 留.寄親) || {}).name || 'なし');
  H.国主を繕う(t.s, t.fid); H.寄騎を繕う(t.s, t.fid); H.旗頭を繕う(t.s, t.fid);
  確('繕いのあとも継いだ筋が残る', t.s.generals.find((x) => x.id === t.留守.id).寄親 === t.国主.id);
}

console.log('■ 八、取った城の城主は、国主がいればその寄騎');
{
  const t = 移りの盤(true);
  H.城を委ねる(t.s, t.的.id, 'a1', { 城主: t.移る.id, 所属: [t.移る.id], 兵: 500 });
  H.国主を繕う(t.s, t.fid); H.寄騎を繕う(t.s, t.fid); H.旗頭を繕う(t.s, t.fid);
  const g = t.s.generals.find((x) => x.id === t.移る.id);
  確('その国の国主の寄騎になる', g.寄親 === t.新国主.id,
    (t.s.generals.find((x) => x.id === g.寄親) || {}).name || 'なし');
}

console.log('■ 九、国主がいなければ、攻め取った旗頭の寄騎');
{
  const t = 移りの盤(false);
  H.城を委ねる(t.s, t.的.id, 'a1', { 城主: t.移る.id, 所属: [t.移る.id], 兵: 500 });
  H.国主を繕う(t.s, t.fid); H.寄騎を繕う(t.s, t.fid); H.旗頭を繕う(t.s, t.fid);
  const g = t.s.generals.find((x) => x.id === t.移る.id);
  確('旗頭の寄騎になる', g.寄親 === t.旗.id,
    (t.s.generals.find((x) => x.id === g.寄親) || {}).name || 'なし');
  確('受け持ちが取った国まで伸びる',
    H.旗頭の受け持ち(t.s, t.s.generals.find((x) => x.id === t.旗.id)).includes('三河'),
    H.旗頭の受け持ち(t.s, t.s.generals.find((x) => x.id === t.旗.id)).join('・'));
}

console.log('■ 十、立ち寄っただけでは城主にならない');
{
  const t = 移りの盤(false);
  const 空城 = t.s.castles.find((c) => c.faction === t.fid && !c.lordId && c.id !== t.的.id);
  const 主 = t.s.generals.find((x) => x.id === t.移る.id);
  主.at = 空城.id;                                  // 城主のまま立ち寄る
  H.城主の札を据える(t.s);
  確('他の城を預かる者に、通りすがりで札は立たない', 空城.lordId !== 主.id,
    空城.lordId ? (t.s.generals.find((x) => x.id === 空城.lordId) || {}).name : '札なし');
  確('もとの城の札は残る', t.s.castles.some((c) => c.lordId === 主.id));
}

console.log('■ 十一、古い記録の二重城主を解く');
{
  const t = 移りの盤(false);
  const 他 = t.s.castles.find((c) => c.faction === t.fid && c.id !== t.元城.id && !c.lordId);
  他.lordId = t.移る.id;                            // 古い版で立った二枚目の札
  const 直 = H.二重の城主を解く(t.s);
  確('二枚目の札が降りる', t.s.castles.filter((c) => c.lordId === t.移る.id).length === 1,
    t.s.castles.filter((c) => c.lordId === t.移る.id).map((c) => c.name).join('・'));
  確('解いた跡が返る', 直.length === 1);
  /* 継ぐ者は、ほかに城を預かっていない者に限る（解いた先でまた二重にしない）。 */
  const 新主 = t.s.generals.find((x) => x.id === 他.lordId);
  確('継いだ者が二つ目の城を持たない', !新主 || t.s.castles.filter((c) => c.lordId === 新主.id).length === 1,
    新主 ? `${新主.name}…${t.s.castles.filter((c) => c.lordId === 新主.id).length}城` : '札なし');
}

console.log('■ 十二、そこに将がいなくとも、その城を根とする者が継ぐ');
{
  const t = 移りの盤(false);
  /* 出陣していて城を空けている者。根はその城にある。 */
  const 空 = t.s.castles.find((c) => c.faction === t.fid && c.id !== t.元城.id && !c.lordId
    && !t.s.generals.some((g) => g.at === c.id && g.faction === t.fid));
  const 旅 = t.s.generals.find((g) => g.faction === t.fid && !g.lord && !g.captive
    && g.id !== t.旗.id && g.id !== t.国主.id && g.id !== t.移る.id && g.id !== t.留守.id
    && !t.s.castles.some((c) => c.lordId === g.id));
  if (空 && 旅) {
    旅.本領 = 空.id; 旅.at = t.元城.id;               // 根は空の城、いまは別の城にいる
    空.lordId = t.移る.id;                            // 古い版で立った二枚目の札
    H.二重の城主を解く(t.s);
    確('その城を根とする者が継ぐ', 空.lordId === 旅.id,
      (t.s.generals.find((x) => x.id === 空.lordId) || {}).name || '不在');
  } else 確('その城を根とする者が継ぐ', false, '仕込めなかった');
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
