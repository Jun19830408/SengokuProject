/* 隠れの際（battle/naname.js）。

   丘や山の向こう斜面にいる組は、手前の高い地に隠れるので描かない。その際は、視の列
   ごとに一度だけ量って覚えておく（重いので）。覚えは高さの図が替われば捨てねばならない。

   合戦の地は、粗く一息で焼いてから本来の細かさで焼き直す（BattleScreen 焼きを仕込む）。
   図を据えても覚えを捨てずにいたため、粗い図で量った際が残り、平らな野の隊まで
   「手前の高い地に隠れる」と判じられて描かれなかった。遊ぶ側の申し出は「関ヶ原の
   ほうで部隊が消えるバグが起こっています」であった。

   次を検める。
     一、手前に高い地があれば、奥の平らな所の者は隠れる
     二、平らな図に据え直せば、もう隠れない（古い覚えが残らない）
     三、平らな図から、手前に高い地のある図へ据え直せば、隠れる
     四、据え直したあとの際は、覚えを一から量り直したものと同じ */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'kakure-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { 高さ図を据える, 高さ図を外す, 区の高さ図を外す, 向きを据える, 隠れの際, 画の縦, 斜め } from "../src/battle/naname.js";\n');
const out = path.join(ROOT, 'build', 'kakure.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out, logLevel: 'error' });
const N = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* 盤は六百歩四方。高さの図は一升十歩（六十升四方）、値一つが一歩。 */
const 盤 = 600, 単 = 10, 升 = 盤 / 単;
const 平らな図 = () => new Float32Array(升 * 升);
/* 手前（南）に東西へ延びる土手（高さ百歩）。縦四百〜四百二十歩 */
const 土手の図 = () => {
  const 高 = 平らな図();
  for (let j = 40; j <= 42; j++) for (let i = 0; i < 升; i++) 高[j * 升 + i] = 100;
  return 高;
};
/* 土手の奥（北）の平らな所に立つ者 */
const 者 = [300, 300];
const 隠れるか = () => {
  const 際 = N.隠れの際(者[0], 者[1]), 縦 = N.画の縦(者[0], 者[1]);
  return { 隠: 際 < 縦 - 4, 際, 縦, 添: `際 ${際.toFixed(1)}・画の縦 ${縦.toFixed(1)}` };
};

N.斜め.入 = true;
N.向きを据える(0, 盤, 盤);

console.log('■ 一、手前に高い地があれば、奥の者は隠れる');
N.高さ図を据える(土手の図(), 升, 升, 単, 1);
{ const r = 隠れるか(); 確('土手の奥の者は隠れる', r.隠, r.添); }

console.log('■ 二、平らな図に据え直せば、もう隠れない');
N.高さ図を据える(平らな図(), 升, 升, 単, 1);
{ const r = 隠れるか(); 確('平らな図では隠れない（粗い図で量った際が残らない）', !r.隠, r.添); }

console.log('■ 三、手前に高い地のある図へ据え直せば、隠れる');
N.高さ図を据える(土手の図(), 升, 升, 単, 1);
{ const r = 隠れるか(); 確('土手の図では隠れる', r.隠, r.添); }

console.log('■ 四、据え直したあとの際は、一から量り直したものと同じ');
{
  N.高さ図を据える(平らな図(), 升, 升, 単, 1);
  const 据え直した = N.隠れの際(者[0], 者[1]);
  N.区の高さ図を外す();                    // 版を進めて覚えを捨てさせる（区の図は無い）
  const 量り直した = N.隠れの際(者[0], 者[1]);
  確('際が量り直したものと等しい', 据え直した === 量り直した, `${据え直した.toFixed(1)} と ${量り直した.toFixed(1)}`);
}

N.高さ図を外す();
console.log(`\n════ 隠れの際：咎 ${咎.length} 件`);
console.log('エラー:', 咎.length ? 咎.join(' | ') : 'なし');
process.exit(咎.length ? 1 : 0);
