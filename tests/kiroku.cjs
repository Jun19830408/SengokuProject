/* 記録が黙って消えないこと（GDD 15.3）。

   遊びを七年進めた盤が、新しく始めただけで消えた。
   「新しくはじめる」を押しても、その場では何も起きない。最初の月送りの折に
   自動の記録が上書きされる。押した本人にも、何が起きたか見えない。

   画面のどこか一箇所を直しても、同じ穴はまた開く。書き込む道は幾つもあり、
   後から増えもする。だから守るのは置き場の側でなければならない。

   盤には卓の印がある。いまその枠に入っている盤と印が違うなら、それは
   別の遊びである。上書きする前に、空いている枠へ写して逃がす。
   空きが無ければ拾い上げの棚へ置く。

   この試験は、書き込む道を片端から叩いて、遊びがひとつでも消えないことを見る。
   新しい書き込み口を足したときは、ここへ一行足すこと。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

// 置き場を模す（window.storage を使う口へ差し込む）
const 蔵 = new Map();
global.window = global.window || {};
global.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
};

const 盤 = (f, y, m) => { const s = H.initState(f); s.year = y; s.month = m; return s; };
// 記録は圧して収めてある（save/pack.js）ので、解いてから読む
const 解 = (v) => JSON.parse(H.解す(v));
const 中身 = (k) => { const v = 蔵.get(k); return v ? 解(v).state : null; };
const 遊びの数 = () => new Set([...蔵.values()].map((v) => 解(v).state.卓)).size;
const 並び = () => [...蔵.keys()].sort().map((k) => {
  const s = 中身(k); return `${k.replace('sengoku:', '')}=${s.player}${s.year}`;
}).join(' ');

(async () => {
  /* ------------------------------------------- 一、卓の印 */
  {
    const a = H.initState('oda'), b = H.initState('oda');
    確('新しい盤には卓の印が付く', !!a.卓 && !!b.卓, a.卓);
    確('別々に始めた盤は、別の印を持つ', a.卓 !== b.卓);
    const 古 = H.initState('takeda'); delete 古.卓;
    H.migrateSave(古);
    確('印の無い古い記録にも、読み込みで印を与える', !!古.卓, 古.卓);
  }

  /* ------------------------- 二、別の遊びで上書きすると、逃がされること */
  {
    蔵.clear();
    const 織田 = 盤('oda', 1553, 5);
    await H.saveGame(織田);                         // 自動の枠へ（七年進めた盤のつもり）
    確('自動の枠に収まる', 中身('sengoku:save1').year === 1553, 並び());

    const 武田 = 盤('takeda', 1546, 4);
    await H.saveGame(武田);                         // 新しく始めて月送り＝自動へ書く
    確('新しい遊びは自動の枠に入る', 中身('sengoku:save1').player === 'takeda');
    確('前の遊びは消えず、空き枠へ逃げている', 遊びの数() === 2, 並び());
    const 逃 = [...蔵.keys()].find((k) => k !== 'sengoku:save1');
    確('逃げた先の中身が、そのままの盤である',
      中身(逃).player === 'oda' && 中身(逃).year === 1553, `${逃} ${中身(逃).year}年`);
  }

  /* ------------------------- 三、同じ遊びの続きは、上書きしてよいこと */
  {
    蔵.clear();
    const s = 盤('oda', 1546, 4);
    await H.saveGame(s);
    for (let m = 5; m <= 12; m++) { s.month = m; await H.saveGame(s); }
    確('同じ遊びを何度収めても、枠は増えない', 蔵.size === 1, 並び());
    確('いちばん新しい月が入っている', 中身('sengoku:save1').month === 12);
  }

  /* --------------- 四、空き枠が尽きても、拾い上げの棚へ逃げること */
  {
    蔵.clear();
    // 自動と五つの枠を、それぞれ別の遊びで埋める
    await H.saveGame(盤('oda', 1550, 1));
    for (let i = 1; i <= 5; i++) await H.saveGame(盤('takeda', 1540 + i, 1), `sengoku:slot${i}`);
    確('六つの枠がすべて埋まっている', 蔵.size === 6, 並び());
    const 前 = 中身('sengoku:save1');
    await H.saveGame(盤('mori', 1546, 4));          // また新しい遊び
    確('拾い上げの棚へ逃げる', !!中身('sengoku:hirogi'), 並び());
    確('棚の中身が、上書きされかけた盤である',
      中身('sengoku:hirogi').player === 前.player && 中身('sengoku:hirogi').year === 前.year,
      `${中身('sengoku:hirogi').player} ${中身('sengoku:hirogi').year}年`);
    確('遊びは一つも消えていない', 遊びの数() === 7, `${遊びの数()}つの遊びが残る`);
  }

  /* ------------- 五、手記録の枠へ収めるときも、別の遊びを潰さないこと */
  {
    蔵.clear();
    await H.saveGame(盤('oda', 1552, 3), 'sengoku:slot2');
    const 前 = 中身('sengoku:slot2');
    await H.saveGame(盤('mori', 1546, 4), 'sengoku:slot2');   // 別の遊びを同じ枠へ
    確('手記録の枠でも、別の遊びは逃がされる', 遊びの数() === 2, 並び());
    確('逃げた盤はそのまま', [...蔵.values()].some((v) => {
      const s = 解(v).state; return s.player === 前.player && s.year === 前.year;
    }));
  }

  /* ------------------------- 六、記録の一覧に、救出の棚も並ぶこと */
  {
    蔵.clear();
    await H.saveGame(盤('oda', 1553, 5));
    await H.saveGame(盤('takeda', 1546, 4));
    const 一覧 = await H.記録を並べる();
    確('一覧は自動・一〜五・救出の七つを返す', 一覧.length === 7,
      一覧.map((w) => w.名).join('／'));
    const 在る = 一覧.filter((w) => w.d);
    確('中身のある枠が二つ見える', 在る.length === 2,
      在る.map((w) => `${w.名}:${H.記録の見出し(w.d, {}).年}年`).join('／'));
    const h = H.記録の見出し(在る.find((w) => w.d.state.player === 'oda').d, {});
    確('見出しに年月と城数が出る', h.年 === 1553 && h.城数 > 0, `${h.年}年${h.月}月・${h.城数}城`);
  }

  /* ----------------- 七、控えの書き出しと読み込みで、盤が変わらないこと */
  {
    const s = 盤('oda', 1551, 8);
    const 包 = JSON.stringify({ v: 1, at: Date.now(), state: s });
    const 戻 = 解(包).state;
    H.migrateSave(戻);
    確('控えを通しても、卓の印が保たれる', 戻.卓 === s.卓, s.卓);
    確('控えを通しても、年月と城が保たれる',
      戻.year === s.year && 戻.month === s.month && 戻.castles.length === s.castles.length);
  }

  console.log('');
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外で終わった');
  process.exit(1);
});
