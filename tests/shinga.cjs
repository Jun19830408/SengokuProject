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
  /* はじめは関ヶ原だけに掛けて確かめ、作りが固まったので野戦へ、
     それから城攻めへ広げた。城攻めの地は縄張りを読んで焼く。 */
  確('関ヶ原の盤では新絵', H.新絵か({ 筋書き: { id: 'sekigahara' } }) === true);
  確('筋書きの無い野戦でも新絵', H.新絵か({}) === true);
  確('別の筋書きでも新絵', H.新絵か({ 筋書き: { id: 'okehazama' } }) === true);
  確('城攻めでも新絵（縄張りを読んで焼く）', H.新絵か({ map: { cx: 0 } }) === true);
  確('盤が無ければ立たない', H.新絵か(null) === false);
}

console.log('\n── 一の二　どの野でも焼ける');
{
  /* 野を焼く筆は画布を持たないと動かない。試験の場には画布が無いので、
     筆の真似をする道具を立てて、算の筋がどの野でも通ることだけを見る
     （絵そのものは実画面を撮って目で見る。tests では見られない）。 */
  const 作り筆 = () => {
    const 鈍 = () => ({ addColorStop() {} });
    return {
      canvas: { width: 0, height: 0 },
      setTransform() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
      beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() {},
      arc() {}, ellipse() {}, rect() {}, fill() {}, stroke() {}, clip() {},
      fillRect() {}, strokeRect() {}, drawImage() {}, setLineDash() {},
      createLinearGradient: 鈍, createRadialGradient: 鈍, createPattern: () => null,
      measureText: () => ({ width: 10 }), fillText() {}, strokeText() {},
      createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      putImageData() {},
      getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    };
  };
  const 試す = (種, 兵) => {
    種で固める();
    H.setFieldSeed(種, 'x'); H.setFieldKind('街道'); H.setBattleMap(null);
    H.layoutField(兵, 2);
    const k = Math.min(1, Math.sqrt(2.2e6 / Math.max(1, H.FIELD.w * H.FIELD.h)));
    const t0 = Date.now();
    try { H.新絵の野(作り筆(), k); } catch (e) { return { 咎: e.message }; }
    return { ms: Date.now() - t0, 野: `${Math.round(H.FIELD.w)}×${Math.round(H.FIELD.h)}` };
  };
  let 可 = true; const 添 = [];
  for (const [種, 兵] of [['a', 1200], ['b', 6000], ['c', 30000]]) {
    const r = 試す(種, 兵);
    if (r.咎) { 可 = false; 添.push(`${種}：${r.咎}`); } else 添.push(`${兵}人 ${r.野} ${r.ms}ms`);
  }
  確('生まれの違う野でも、焼く筋が通る', 可, 添.join('・'));

  /* 城攻めの地。縄張りを読んで焼くので、構えの違う城で筋を通す。
     山城は空堀・平城は水堀、曲輪は二層から四層まで変わる。 */
  const 城を試す = (名, 防) => {
    種で固める();
    const m = H.layoutCastleField(H.buildCastleMap({ id: 'T' + 名, name: 名, def: 防 }));
    const k = Math.min(1, Math.sqrt(2.2e6 / Math.max(1, H.FIELD.w * H.FIELD.h)));
    const t0 = Date.now();
    try { H.新絵の城の地(作り筆(), m, k); } catch (e) { return { 咎: e.message }; }
    return { ms: Date.now() - t0,
      札: `${m.構}/${m.layers.length}層/${m.moat.空堀 ? '空堀' : '水堀'} ${Math.round(H.FIELD.w)}×${Math.round(H.FIELD.h)} ${Date.now() - t0}ms` };
  };
  { let 可2 = true; const 添2 = [];
    for (const [名, 防] of [['岐阜', 30], ['観音寺', 50], ['小田原', 80], ['岩村', 92]]) {
      const r = 城を試す(名, 防);
      if (r.咎) { 可2 = false; 添2.push(`${名}：${r.咎}`); } else 添2.push(r.札);
    }
    確('どの構えの城でも、地を焼く筋が通る', 可2, 添2.join('・'));
    H.setBattleMap && H.setBattleMap(null);
  }
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

console.log('\n── 四　兵の動きは歩幅で回る');
{
  /* 時計で足を動かしていたころは、盤の進みに兵がついて行けず、位置だけが
     滑っていった――遊ぶ側の目には「ヌメっと動く」と映る。盤の刻で動かし、
     踏んだ道のりで拍を回せば、どの速さでも足は地に着く。

     測るのは「積んだ歩幅が、隊の進んだ道のりに見合うか」である。
     刻みは実際の遊びのもの（通常〇.〇〇九六、微速〇.〇〇一九）を使う。
     どちらでも見合いが揃えば、速さを変えても滑らないということである。 */
  const 測る = (刻み, 回) => {
    種で固める();
    const r = H.合戦を仕立てる('sekigahara', '西');
    const b = r.b; b.dusk = 2400; b.phase = 'fight';
    const 的 = b.corps.find((c) => c.side === 'E' && !c.dead);
    for (const c of b.corps) if (c.side === 'P') H.issueOrder(b, c, { order: '接戦', tx: 的.x, ty: 的.y });
    const 組 = b.corps.find((c) => c.side === 'P').squads[0];
    for (let i = 0; i < 2; i++) { H.stepBattle(b, 刻み); H.新絵状態を進める(b, 0, null); }
    const v0 = H.組の見た目(組);
    const 初距 = v0.歩距[0];
    let 速最 = 0;
    /* 道のりは「踏んだ地べた」――刻ごとに積む。起点と終点の隔たりで測ると、
       曲がった道を直線で数えることになり、歩幅のほうが多く出て当然である
       （実測で二.三七倍。足が滑っているのではない）。 */
    let 道のり = 0, 前 = { x: 組.x, y: 組.y };
    for (let k = 0; k < 回; k++) {
      H.stepBattle(b, 刻み); H.新絵状態を進める(b, 0, null);
      道のり += Math.hypot(組.x - 前.x, 組.y - 前.y);
      前 = { x: 組.x, y: 組.y };
      const v = H.組の見た目(組);
      if (v.速[0] > 速最) 速最 = v.速[0];
    }
    const v = H.組の見た目(組);
    return { 歩幅: v.歩距[0] - 初距, 道のり, 速: 速最,
      見合: (v.歩距[0] - 初距) / Math.max(1, 道のり),
      隔: Math.hypot(組.x - v.sx[0], 組.y - v.sy[0]) };
  };
  const 通常 = 測る(0.0096, 3750);     // 三十六秒ぶん
  const 微速 = 測る(0.0019, 18000);    // 同じく三十四秒ぶん
  確('歩けば歩幅が積まれる', 通常.歩幅 > 100,
    `${通常.歩幅.toFixed(0)}歩ぶん／道のり${通常.道のり.toFixed(0)}歩`);
  確('足の速さが立つ（歩きの拍が回る閾二.五を超える）', 通常.速 > 2.5, `${通常.速.toFixed(1)}歩/秒`);
  確('歩幅は道のりに見合う（滑らない）', 通常.見合 > 0.5 && 通常.見合 < 1.8,
    `${通常.見合.toFixed(2)}倍`);
  確('盤の速さを変えても見合いは揃う', Math.abs(通常.見合 - 微速.見合) < 0.35,
    `通常${通常.見合.toFixed(2)} 対 微速${微速.見合.toFixed(2)}`);
  確('兵は組から離れない', 通常.隔 < 40 && 微速.隔 < 40,
    `通常${通常.隔.toFixed(0)}歩・微速${微速.隔.toFixed(0)}歩`);
}

console.log('\n── 五　寄るほど絵は細かくなる');
{
  /* 隊の中ほどで予算を数えていたころは、旗本三万（六百組）が一つ映るだけで
     溢れ、槍を合わせた只中へ寄るほど駒へ戻るという逆さまなことになった。
     組ひとつずつ数えれば、寄るほど数は減り、寄るほど絵は細かくなる。 */
  種で固める();
  const r = H.合戦を仕立てる('sekigahara', '西');
  const b = r.b; b.dusk = 2400; b.phase = 'fight';
  const 的 = b.corps.find((c) => c.side === 'E' && !c.dead);
  for (const c of b.corps) if (c.side === 'P') H.issueOrder(b, c, { order: '接戦', tx: 的.x, ty: 的.y });
  /* 槍が合うまで進める */
  let 噛 = null;
  for (let k = 0; k < 4000 && !噛; k++) {
    H.stepBattle(b, 0.05);
    for (const c of b.corps) { for (const q of c.squads) if (q.engaged && q.men > 0) { 噛 = q; break; } if (噛) break; }
  }
  確('槍が合う所まで進む', !!噛, 噛 ? `${Math.round(b.t)}秒` : '合わず');
  const W = 900, Hp = 700;
  const 旗本 = b.corps.filter((c) => c.squads.length > 120).length;
  const 試 = (s2) => {
    const cam = { x: 噛 ? 噛.x : b.corps[0].x, y: 噛 ? 噛.y : b.corps[0].y, s: s2 };
    return { 組: H.見える組数(b, cam, W, Hp), 個: H.個人で描くか(b, cam, W, Hp) };
  };
  const 浅 = 試(1.8), 中 = 試(3.2), 深 = 試(6.0);
  確('乱戦の只中でも、寄れば一人ずつになる', 深.個, `倍率六で${深.組}組`);
  確('中ほどでも一人ずつ', 中.個, `倍率三.二で${中.組}組`);
  確('寄るほど映る組は減る', 深.組 <= 中.組 && 中.組 <= 浅.組,
    `浅${浅.組}／中${中.組}／深${深.組}`);
  確('大隊（百二十組超）が盤にある', 旗本 > 0, `${旗本}隊`);
  確('引きでは一人ずつにしない', !H.個人で描くか(b, { x: 2000, y: 2000, s: 0.5 }, W, Hp));
}

console.log(誤 ? `\nエラー: ${誤}件` : '\nエラー: なし');
process.exit(誤 ? 1 : 0);
