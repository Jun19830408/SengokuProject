/* ============================================================
   新しい合戦の絵（関ヶ原だけ・GDD 8.11）の試験

   絵そのものは目で見るほかないが、「理に触れない」ことは測れる。
   ここで確かめるのは三つ。
   一、旗の立ち方：関ヶ原の盤でだけ立ち、ほかでは立たない。
   二、高さ：丘山の持ち上がりは十六歩まで。野は零。
   三、盤に書かない：見た目の状態を毎刻進めながら戦を回しても、
       進めなかった戦と一歩も違わない。
   ============================================================ */
const H = require('../build/harness.cjs');
let 誤 = 0;
const 確 = (名, 可, 補) => { console.log(`  ${可 ? '○' : '★'} ${名}${補 ? '　' + 補 : ''}`); if (!可) 誤++; };
const 種で固める = () => { let 種 = 0x5EC1; Math.random = function () { 種 |= 0;
  種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

console.log('\n── 一　旗の立ち方');
{
  確('関ヶ原の盤では新絵', H.新絵か({ 筋書き: { id: 'sekigahara' } }) === true);
  確('筋書きの無い盤では立たない', H.新絵か({}) === false);
  確('別の筋書きでも立たない', H.新絵か({ 筋書き: { id: 'okehazama' } }) === false);
  確('盤が無ければ立たない', H.新絵か(null) === false);
}

console.log('\n── 二　高さの持ち上がり');
{
  種で固める();
  const r = H.合戦を仕立てる('sekigahara', '西');
  確('関ヶ原が組める', !!r && !!r.b);
  const 南宮山 = H.MOUNTAINS.find((m) => m.名 === '南宮山') || H.MOUNTAINS[0];
  const 頂 = H.持上高(南宮山.x, 南宮山.y);
  確('山の頂は持ち上がる（十六歩まで）', 頂 > 6 && 頂 <= 16, `${頂.toFixed(1)}歩`);
  確('関ヶ原の野は持ち上がらない', H.持上高(3900, 2600) === 0);
  H.筋書きを解く && H.筋書きを解く();
}

console.log('\n── 三　見た目の状態は盤に書かない');
{
  const 回す = (見た目も) => {
    種で固める();
    const r = H.合戦を仕立てる('sekigahara', '西');
    const b = r.b;
    b.dusk = 2400;
    for (let k = 0; k < 40; k++) {
      H.stepBattle(b, 0.2);
      if (見た目も) H.新絵状態を進める(b, k * 0.2, null);
    }
    /* 丸ごと写して比べる。関数や循環は無い作りだが、万一に備えて置き換えで守る */
    const seen = new Set();
    return JSON.stringify(b, (k2, v) => {
      if (typeof v === 'function') return undefined;
      if (v && typeof v === 'object') { if (seen.has(v)) return '[循環]'; seen.add(v); }
      return v;
    });
  };
  /* 名簿のIDは全体の通し番号なので、走らせた順で変わる。中身の比べでは均す */
  const 均す = (t) => t.replace(/-\d+"/g, '-n"');
  const 素 = 均す(回す(false));
  const 絵つき = 均す(回す(true));
  確('四十刻回して一歩も違わない', 素 === 絵つき,
    素 === 絵つき ? `${Math.round(素.length / 1024)}KBぶん一致` : '違いが出た');
}

console.log(誤 ? `\nエラー: ${誤}件` : '\nエラー: なし');
process.exit(誤 ? 1 : 0);
