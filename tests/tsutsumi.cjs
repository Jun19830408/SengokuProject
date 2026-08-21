/* 記録の包み（圧しと解し）。

   盤ひとつを文字に直すと一.二六MBある。ブラウザに預けられる量は iPhone の
   Safari で五MBほどしかないので、七枠（自動・一〜五・救出）をそのまま置くと
   八.六MBとなって収まらない。三つ四つ収めたところで棚が一杯になり、以後は
   どの枠へ書こうとしても「記録できない環境」と出る。実際にそうなった。

   収める前に圧す（save/pack.js）。一.二六MBが二百三十KBほどになるので、
   七枠でも一.六MBに収まる。昔ながらの生の記録もそのまま読める。

   ここは記録の根である。戻らぬ包みは、記録が消えたのと同じことなので、
   無作為の文字で四百通りを往復させて検める。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');

/* 置き場を先に仕込む。store.js は最初に使えるものを選んで覚えるので、
   読み込む前に window.storage を置いておかねばならない。
   ここでは iPhone の Safari を真似て、五MBで撥ねる棚を作る。 */
const 棚 = new Map();
const 限り = 5 * 1024 * 1024;
let 撥ねた = 0;
const 総量 = () => { let n = 0; for (const [k, v] of 棚) n += k.length + v.length; return n; };
global.window = {
  storage: {
    get: async (k) => (棚.has(k) ? { key: k, value: 棚.get(k) } : null),
    set: async (k, v) => {
      const 後 = 総量() - (棚.has(k) ? k.length + 棚.get(k).length : 0) + k.length + v.length;
      if (後 > 限り) { 撥ねた++; const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
      棚.set(k, v); return { key: k, value: v };
    },
    delete: async (k) => { 棚.delete(k); return {}; },
  },
};

const entry = path.join(ROOT, 'build', 'tsutsumi-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { 圧す, 解す, 圧しの印 } from "../src/save/pack.js";\n'
+ 'export { saveGame, loadGame, 記録を並べる, 記録の訳を読む, SAVE_KEY, 枠の鍵 } from "../src/save/save.js";\n'
+ 'export { initState } from "../src/core/state.js";\n');
const out = path.join(ROOT, 'build', 'tsutsumi.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* ------------------------------------------------ 一、圧して解せば元に戻る */
{
  /* 文字は符号位置で拾う。文字列から一つずつ拾うと、絵文字（代用対）の
     片割れだけを掴むことがある。片割れだけの文字は UTF-8 に直せないので、
     戻らなくて当たり前である。記録はいつも JSON.stringify を通るから、
     片割れは \\udXXX と書き換えられ、そういう文字は入ってこない。 */
  const 字 = Array.from('あいうえお漢字ABC{}[]",:0123456789 \n\t織田信長🏯');
  let 失 = 0, 数 = 0;
  for (let t = 0; t < 400; t++) {
    const n = [0, 1, 2, 3, 255, 256, 257, 511, 512, 513, 1023, 1024, 4095][t % 13]
      || (1 + Math.floor(Math.random() * 2500));
    let s = '';
    const 型 = t % 4;
    for (let i = 0; i < n; i++) {
      if (型 === 0) s += 字[Math.floor(Math.random() * 字.length)];
      else if (型 === 1) s += String.fromCharCode(Math.floor(Math.random() * 128));
      else if (型 === 2) s += 'aaaa';
      else s += String.fromCodePoint(0x4e00 + Math.floor(Math.random() * 2000));
    }
    数++;
    if (A.解す(A.圧す(s)) !== s) 失++;
  }
  確('無作為の文字を四百通り、圧して解せば元に戻る', 失 === 0, `${数}通りのうち戻らなかったもの ${失}`);

  const 生 = JSON.stringify({ v: 1, state: { castles: [] } });
  確('昔ながらの生の記録は、そのまま読める', A.解す(生) === 生, '印が無ければ触らない');

  /* 代用対の片割れ。記録は必ず JSON.stringify を通るので、そこで \\udXXX に
     書き換えられる。書き換えられた形なら、包んで解いても元に戻る。 */
  const 片割れ = JSON.stringify({ s: '\ud800' });
  確('片割れの文字も、JSON を通してあれば戻る', A.解す(A.圧す(片割れ)) === 片割れ, 片割れ);
}

/* -------------------------------------- 二、盤ひとつが、棚に収まる大きさになる */
{
  const s = A.initState('oda');
  const 生 = JSON.stringify({ v: 1, at: 1, state: s });
  const 圧 = A.圧す(生);
  const 割 = 圧.length / 生.length;
  確('盤ひとつが四分の一以下に縮む', 割 < 0.3,
    `${(生.length / 1024).toFixed(0)}KB → ${(圧.length / 1024).toFixed(0)}KB（${(割 * 100).toFixed(1)}％）`);
  確('七枠でも五MBに収まる', 圧.length * 7 < 5 * 1024 * 1024,
    `七枠で ${(圧.length * 7 / 1024 / 1024).toFixed(2)}MB（生のままなら ${(生.length * 7 / 1024 / 1024).toFixed(2)}MB）`);
  確('圧した記録を解くと、盤がそのまま戻る',
    JSON.parse(A.解す(圧)).state.castles.length === s.castles.length,
    `城 ${s.castles.length}`);
}

/* ------------------------------- 三、棚に収め、読み出せること（往復） */
(async () => {
  {
    const s = A.initState('oda');
    s.year = 1553;
    const ok = await A.saveGame(s, A.SAVE_KEY);
    確('記録を収められる', ok === true, A.記録の訳を読む() || '');
    const d = await A.loadGame(A.SAVE_KEY);
    確('収めた記録を読み出せる', !!d && d.state.year === 1553, d ? `${d.state.year}年` : 'なし');
    確('棚に置かれているのは圧した形である',
      (棚.get(A.SAVE_KEY) || '').startsWith(A.圧しの印), (棚.get(A.SAVE_KEY) || '').slice(0, 3));
  }

  /* 四、棚が一杯のときの繕い

     圧すより前の記録（生のまま）が幾つも入っていると、棚に空きがない。
     書き込みが撥ねられたら、生のまま入っているものを圧して置き直し、
     もう一度だけ書いてみる。中身は一字も変えない。 */
  {
    棚.clear(); 撥ねた = 0;
    const s = A.initState('oda');
    const 生 = JSON.stringify({ v: 1, at: Date.now(), state: s });
    // 生のまま四枠ぶん詰める（五MBの棚が、これでほぼ埋まる）
    for (let i = 1; i <= 4; i++) 棚.set(A.枠の鍵(i), 生);
    const 前の量 = 総量();
    確('生のままの記録で棚がほぼ埋まっている', 前の量 > 4.5 * 1024 * 1024,
      `${(前の量 / 1024 / 1024).toFixed(2)}MB`);
    s.year = 1560;
    const ok = await A.saveGame(s, A.SAVE_KEY);
    確('棚が一杯でも、詰め直して収められる', ok === true,
      `${A.記録の訳を読む() || '訳なし'}（撥ねられた回数 ${撥ねた}）`);
    確('詰め直したあとは棚に余裕がある', 総量() < 2 * 1024 * 1024,
      `${(前の量 / 1024 / 1024).toFixed(2)}MB → ${(総量() / 1024 / 1024).toFixed(2)}MB`);
    // 詰め直しても、他の枠の中身は変わっていないこと
    const d1 = await A.loadGame(A.枠の鍵(1));
    確('詰め直された枠の中身は変わらない',
      !!d1 && d1.state.castles.length === s.castles.length && d1.state.year === 1546,
      d1 ? `${d1.state.year}年・城${d1.state.castles.length}` : '読めない');
    const d0 = await A.loadGame(A.SAVE_KEY);
    確('新しく収めた盤も読める', !!d0 && d0.state.year === 1560, d0 ? `${d0.state.year}年` : 'なし');
  }

  /* 五、それでも入らないときは、訳を告げる */
  {
    棚.clear();
    const s = A.initState('oda');
    const 圧 = A.圧す(JSON.stringify({ v: 1, at: 1, state: s }));
    // 圧した記録で棚を埋め尽くす（詰め直しても空きが出ない形）
    let i = 0;
    while (総量() + 圧.length < 限り) { 棚.set(`他:${i++}`, 圧); }
    const ok = await A.saveGame(s, A.SAVE_KEY);
    確('入らないときは収められない', ok === false, `${ok}`);
    確('「記録できない環境」ではなく、空きが足りぬと告げる',
      /空き/.test(A.記録の訳を読む()), A.記録の訳を読む());
  }

  console.log('');
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})();
