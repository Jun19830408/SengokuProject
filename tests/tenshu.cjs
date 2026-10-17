/* 天守（GDD 9.3・data/tenshu.js）。

   遊ぶ側の考えは「規模の大きな城には天守をつけてもいい。できれば史実に従って、
   天守のある城は天守を描く」であった。

     一、史実の天守は、建った年から失われた年までだけ立つ
     二、大きな本拠でありながら天守の記録の無い城は、その家が持つあいだ立たない
     三、表に無い城は、一五七六年より後に五十万石を超える家の本拠になれば立つ
     四、城攻めの盤に天守の印が載る */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const 咎 = [];
const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎.push(名); };
const 見 = (年, id, 家, 盤 = {}) => H.天守を見る({ year: 年, factions: 盤.factions || {}, castles: 盤.castles || [] }, { id, faction: 家 });

console.log('── 一　史実の天守は、建った年から失われた年まで');
確('安土（観音寺の欄）は一五七九年に立つ', !!見(1579, 'kannonji', 'oda'));
確('安土は一五七八年にはまだ無い', !見(1578, 'kannonji', 'oda'));
確('安土は一五八二年に失われる', !見(1582, 'kannonji', 'oda'));
確('姫路は秀吉の三重から、輝政の五重へ', (見(1590, 'himeji', 'x') || {}).重 === 3 && !見(1605, 'himeji', 'x') && (見(1610, 'himeji', 'x') || {}).重 === 5);
確('史実の天守には印が付く', (見(1590, 'himeji', 'x') || {}).史実 === true);
確('持ち主が誰でも、史実の年なら立つ', !!見(1600, 'fukashi', 'takeda'));

console.log('\n── 二　記録の無い大きな本拠');
{
  const s = { year: 1590, factions: { hojo: { 本拠: 'odawara' } }, castles: [{ id: 'odawara', faction: 'hojo', koku: 900000 }] };
  確('北条の小田原には立たない', !H.天守を見る(s, s.castles[0]));
}

console.log('\n── 三　表に無い城は、大きな家の本拠になったときだけ');
{
  const 城 = { id: 'kiyosu', faction: 'oda' };
  const 盤 = (年, 石) => ({ year: 年, factions: { oda: { 本拠: 'kiyosu' } },
    castles: [{ id: 'kiyosu', faction: 'oda', koku: 石 }] });
  確('一五七五年には立たない', !H.天守を見る(盤(1575, 900000), 城));
  確('小さな家の本拠には立たない', !H.天守を見る(盤(1590, 300000), 城));
  const 立 = H.天守を見る(盤(1590, 900000), 城);
  確('五十万石を超える家の本拠には立つ', !!立 && 立.史実 === false, 立 ? `${立.重}重` : '立たない');
  確('本拠でない城には立たない', !H.天守を見る({ ...盤(1590, 900000), factions: { oda: { 本拠: 'nagoya' } } }, 城));
}

console.log('\n── 四　表の書き方');
for (const x of H.天守の表) {
  if (x.無し) continue;
  if (!(x.自 >= 1546 && x.自 <= 1615) || (x.至 != null && x.至 <= x.自) || !(x.重 >= 1 && x.重 <= 5) || !x.典) {
    確(`${x.id} の欄が整っている`, false, JSON.stringify(x));
  }
}
確('表の欄はどれも年・重・典拠を持つ', true, `${H.天守の表.filter((x) => !x.無し).length}欄`);

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
