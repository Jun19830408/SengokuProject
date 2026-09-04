/* ==========================================================================
   撮影と検分のための盤づくり

   説明書の写しを撮る tools/shots.cjs と、狭い画面を測る tools/semai.cjs の
   両方が、同じ局面から始める必要がある。片方だけ直すと絵と測りが食い違うので、
   盤の仕込みはここ一箇所に置く。
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'google-chrome', 'chromium',
].find((p) => { try { fs.accessSync(p); return true; } catch (e) { return /^[a-z]/.test(p); } });

// 盤を仕込むために、遊びの中身を Node からも触れるようにする
const 口 = path.join(ROOT, 'build', 'shots-entry.js');
fs.writeFileSync(口, 'export { initState } from "../src/core/state.js";\n'
  + 'export { findPath } from "../src/core/paths.js";\n');
const 束 = path.join(ROOT, 'build', 'shots-state.cjs');
esbuild.buildSync({ entryPoints: [口], bundle: true, format: 'cjs', outfile: 束, logLevel: 'error' });
const { initState, findPath } = require(束);

/* ------------------------------------------------------------ 盤の仕込み */
const 素の盤 = () => {
  const s = initState('oda');
  s.year = 1547; s.month = 6;
  return s;
};

// 敵の軍が自家の城の際まで来ている盤（城下の野戦になる）
const 野戦の盤 = () => {
  const s = 素の盤();
  const 自城 = s.castles.filter((c) => c.faction === s.player);
  let 狙 = null, 敵城 = null;
  for (const c of 自城) {
    const e = s.castles.find((d) => d.faction !== s.player && (findPath(c.id, d.id) || []).length === 2);
    if (e) { 狙 = c; 敵城 = e; break; }
  }
  const 敵将 = s.generals.filter((x) => x.at === 敵城.id && x.faction === 敵城.faction && !x.captive).slice(0, 3);
  for (const t of 敵将) t.at = null;
  s.armies.push({
    id: 'shot-foe', faction: 敵城.faction, from: 敵城.id, gens: 敵将.map((x) => x.id),
    local: 3200, localTrain: 72, rost: null,
    men: 3200 + 敵将.reduce((a, x) => a + x.retinue, 0),
    at: 狙.id, path: [狙.id], prog: 0, food: 9000, target: 狙.id,
  });
  s.pendingArrivals = ['shot-foe'];
  return s;
};

/* 海を渡ろうとして、他家の水軍に阻まれる盤（海戦になる）。
   別所が三木から洲本（三好）へ渡ると、三好の水軍が迎え撃つ。
   tests/seascreen.cjs が使っているのと同じ局面である。 */
const 海戦の盤 = () => {
  const s = initState('bessho');
  s.year = 1547; s.month = 6;
  const 将 = s.generals.filter((g) => g.faction === 'bessho' && !g.captive && g.at === 'miki').slice(0, 2);
  for (const t of 将) t.at = null;
  s.armies.push({
    id: 'shot-sea', faction: 'bessho', from: 'miki', gens: 将.map((x) => x.id),
    local: 3000, localTrain: 70, rost: null,
    men: 3000 + 将.reduce((a, x) => a + x.retinue, 0),
    at: 'miki', path: ['miki', 'sumoto'], prog: 0, food: 9000, target: 'sumoto',
  });
  s.pendingArrivals = ['shot-sea'];
  return s;
};

// 自軍が敵城を囲んでいる盤（強攻すれば城郭図に入る）
const 城攻めの盤 = () => {
  const s = 素の盤();
  const 自城 = s.castles.filter((c) => c.faction === s.player);
  let 出 = null, 敵城 = null;
  for (const c of 自城) {
    const e = s.castles.find((d) => d.faction !== s.player && (findPath(c.id, d.id) || []).length === 2);
    if (e) { 出 = c; 敵城 = e; break; }
  }
  敵城.local = 2600; 敵城.def = Math.max(58, 敵城.def);
  const 将 = s.generals.filter((x) => x.at === 出.id && x.faction === s.player && !x.captive).slice(0, 3);
  for (const t of 将) t.at = null;
  s.armies.push({
    id: 'shot-siege', faction: s.player, from: 出.id, gens: 将.map((x) => x.id),
    local: 5200, localTrain: 74, rost: null,
    men: 5200 + 将.reduce((a, x) => a + x.retinue, 0),
    at: 敵城.id, path: [敵城.id], prog: 0, food: 16000, target: 敵城.id, sieging: true,
  });
  s.sieges = [{ castleId: 敵城.id, armyId: 'shot-siege', months: 1, decided: null }];
  return s;
};

/* ------------------------------------------------------------ 場面の並び

   手順は文字列の配列。画面の中で走らせる。
     押:文字   … その文字を含む釦を押す
     図:x,y    … 地図（canvas）のその場所を押す
     待:秒     … 待つ
     鍵:...    … 記録を仕込む（盤の名。下の 盤たち にある） */
const 盤たち = { 素: 素の盤, 野戦: 野戦の盤, 城攻め: 城攻めの盤, 海戦: 海戦の盤 };

/* ------------------------------------------------- 絵の刻みを自前で送る

   合戦の盤は requestAnimationFrame で回っている。ところが Chrome を虚の時
   （--virtual-time-budget）で走らせると rAF が進まない。setTimeout のほうは
   早送りされるので、待ちだけが過ぎて盤の時計は〇分〇秒のまま止まる。

   そこで撮影と検分のときだけ、rAF を setTimeout で置き換える。 */
const 刻みの仕掛け = `<script>
(() => {
  const 待ち = [];
  let 刻 = 0;
  window.requestAnimationFrame = (cb) => { 待ち.push(cb); return 待ち.length; };
  window.cancelAnimationFrame = () => {};
  const 送る = () => {
    const 今 = 待ち.splice(0, 待ち.length);
    刻 += 16;
    for (const cb of 今) { try { cb(刻); } catch (e) {} }
    setTimeout(送る, 16);
  };
  setTimeout(送る, 16);
})();
</script>`;

// 記録を仕込んだ一枚物の頁を組む（盤が null なら記録を消して始める）
function 頁を組む(盤名) {
  const 元 = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
  const 盤 = 盤名 ? 盤たち[盤名]() : null;
  const 仕込み = (盤
    ? `<script>try{localStorage.setItem('sengoku:save1', ${JSON.stringify(JSON.stringify({ v: 1, at: Date.now(), state: 盤 }))});}catch(e){}</script>`
    : `<script>try{localStorage.clear();}catch(e){}</script>`) + 刻みの仕掛け;
  return 元.replace('<body>', '<body>' + 仕込み);
}

module.exports = { CHROME, ROOT, initState, findPath, 盤たち, 刻みの仕掛け, 頁を組む };
