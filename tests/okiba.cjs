/* 記録の置き場（GDD 15.3）。

   遊ぶ側の申し出は「全く記録ができない。一五八四年まで進めたのに保存できず
   消えた」であった。画面には「記録の空きが足りません」と出ていた。

   元は置き場の限りである。ブラウザの記憶（localStorage）は iPhone の Safari で
   五MBほどしかなく、しかも文字を十六ビットで預かる。二百四十五城・千八百万石の
   盤は、生の文字で二.二九MB、圧して四十五万四千字――棚では〇.八九MBになる。
   枠は六つ（自動・一〜五・救出）あるから五.三MBで、棚を越える。越えれば
   月送りの自動の記録がそのつど撥ねられ、何も残らないまま遊びが進む。

   詰め直しの手当ては入れてあったが、どの枠も既に圧してあるときは一バイトも
   減らせない。中身を削っても四分しか縮まない（圧しがもう効いている）。
   限りそのものを広げるほかない――IndexedDB は数百MBを預かれる。

   古い記録を失わないことが何より先である。だから順を守る。
     一、蔵に無ければ、ブラウザの記憶を見る（これまでの記録が読める）
     二、読めたものは蔵へ写す
     三、写せたことを確かめてから、はじめて古いほうを外す
   この試験は、その順を一つずつ叩く。 */
const path = require('path');

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

/* ------------------------------------------------ IndexedDB を模す。
   本物の作法（open → transaction → objectStore → put/get）をなぞる。
   蔵が開かない端末、書けない蔵も作れるようにしておく。 */
function 蔵を模す({ 開かない = false, 書けない = false } = {}) {
  const 中 = new Map();
  const 遅 = (f) => setTimeout(f, 0);
  return {
    中,
    open() {
      const req = {};
      遅(() => {
        if (開かない) { req.error = new Error('開かぬ'); req.onerror && req.onerror(); return; }
        const db = {
          objectStoreNames: { contains: () => true },
          transaction() {
            const t = {};
            const st = {
              get(k) { const r = { result: 中.get(k) ?? null }; 遅(() => t.oncomplete && t.oncomplete()); return r; },
              put(v, k) {
                if (書けない) { 遅(() => { t.error = new Error('一杯'); t.onerror && t.onerror(); }); return {}; }
                中.set(k, v); 遅(() => t.oncomplete && t.oncomplete()); return {};
              },
              delete(k) { 中.delete(k); 遅(() => t.oncomplete && t.oncomplete()); return {}; },
            };
            t.objectStore = () => st;
            return t;
          },
        };
        req.result = db; req.onsuccess && req.onsuccess();
      });
      return req;
    },
  };
}

function 棚を模す({ 限り = Infinity } = {}) {
  const 中 = new Map();
  return {
    中,
    getItem: (k) => (中.has(k) ? 中.get(k) : null),
    setItem: (k, v) => {
      const 量 = [...中.entries()].reduce((a, [kk, vv]) => a + (kk === k ? 0 : vv.length), 0) + v.length;
      if (量 > 限り) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
      中.set(k, v);
    },
    removeItem: (k) => { 中.delete(k); },
  };
}

/* 置き場は一度選ぶと覚えるので、試験ごとに読み込み直す。 */
const fs = require('fs');
const esbuild = require('esbuild');
const ROOT = path.join(__dirname, '..');
const 入 = path.join(ROOT, 'build', 'store-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(入, 'export * from "../src/save/store.js";\n');
const 出 = path.join(ROOT, 'build', 'store.cjs');
esbuild.buildSync({ entryPoints: [入], bundle: true, format: 'cjs', outfile: 出, logLevel: 'error' });
const 置き場を立てる = (窓) => {
  global.window = 窓;
  delete require.cache[require.resolve(出)];
  return require(出);
};

(async () => {
  console.log('── 一　蔵があれば蔵を選ぶ');
  {
    const idb = 蔵を模す(), ls = 棚を模す();
    const S = 置き場を立てる({ indexedDB: idb, localStorage: ls });
    確('蔵を選ぶ', S.置き場の名() === '蔵', S.置き場の名());
    await S.置き場().書く('sengoku:save1', 'あ');
    確('蔵へ収まる', idb.中.get('sengoku:save1') === 'あ');
    確('読み戻せる', (await S.置き場().読む('sengoku:save1')) === 'あ');
  }

  console.log('\n── 二　これまでの記録（ブラウザの記憶）が読める');
  {
    const idb = 蔵を模す(), ls = 棚を模す();
    ls.setItem('sengoku:slot3', '古い盤');
    const S = 置き場を立てる({ indexedDB: idb, localStorage: ls });
    const v = await S.置き場().読む('sengoku:slot3');
    確('蔵に無くても、古い記録が読める', v === '古い盤', String(v));
    確('読んだものは蔵へ写る', idb.中.get('sengoku:slot3') === '古い盤');
    確('写してから古いほうを外す（棚の空きが戻る）', ls.getItem('sengoku:slot3') === null);
  }

  console.log('\n── 三　写せないときは、古い記録を外さない');
  {
    const idb = 蔵を模す({ 書けない: true }), ls = 棚を模す();
    ls.setItem('sengoku:slot2', '大事な盤');
    const S = 置き場を立てる({ indexedDB: idb, localStorage: ls });
    const v = await S.置き場().読む('sengoku:slot2');
    確('それでも読める', v === '大事な盤', String(v));
    確('古い記録は残したまま', ls.getItem('sengoku:slot2') === '大事な盤');
  }

  console.log('\n── 四　蔵が開かぬ端末では、これまでどおりブラウザの記憶を使う');
  {
    const idb = 蔵を模す({ 開かない: true }), ls = 棚を模す();
    const S = 置き場を立てる({ indexedDB: idb, localStorage: ls });
    const ok = await S.置き場().書く('sengoku:save1', 'い').catch(() => false);
    確('蔵が開かずとも記録は残る（ブラウザの記憶へ退く）', ok === true, String(ok));
    確('退いた先に収まっている', ls.getItem('sengoku:save1') === 'い', String(ls.getItem('sengoku:save1')));
    確('読み戻せる', (await S.置き場().読む('sengoku:save1')) === 'い');
  }

  console.log('\n── 五　狭い棚でも、蔵があれば六枠が収まる');
  {
    /* 盤ひとつを圧した大きさ（四十五万四千字）を模す。棚は五MB＝二百六十万字。 */
    const 一枠 = 'x'.repeat(454 * 1024);
    const ls = 棚を模す({ 限り: 2.5 * 1024 * 1024 });
    let 棚に入った = 0;
    for (const k of ['save1', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5']) {
      try { ls.setItem('sengoku:' + k, 一枠); 棚に入った++; } catch (e) { /* 一杯 */ }
    }
    確('ブラウザの記憶では六枠が入らない（元の不具合）', 棚に入った < 6, `${棚に入った}枠`);
    const idb = 蔵を模す(), ls2 = 棚を模す({ 限り: 2.5 * 1024 * 1024 });
    const S = 置き場を立てる({ indexedDB: idb, localStorage: ls2 });
    let 蔵に入った = 0;
    for (const k of ['save1', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5']) {
      try { await S.置き場().書く('sengoku:' + k, 一枠); 蔵に入った++; } catch (e) { /* 入らぬ */ }
    }
    確('蔵なら六枠とも収まる', 蔵に入った === 6, `${蔵に入った}枠`);
  }

  console.log('\n── 六　収まらなかったときは、黙って進まない');
  {
    /* 月送りの自動記録は返り値を捨てていたので、撥ねられても画面に何も出ず、
       遊ぶ側は収まっているつもりで何年も進めた。saveGame が偽を返し、
       訳が読めることを検める（画面はこの二つを見て札を出す）。 */
    const idb = 蔵を模す({ 書けない: true });
    const ls = 棚を模す({ 限り: 10 });            // 棚も一杯
    global.window = { indexedDB: idb, localStorage: ls };
    const p2 = path.join(ROOT, 'build', 'harness.cjs');
    delete require.cache[require.resolve(p2)];
    const H = require(p2);
    const st = H.initState('oda');
    const ok = await H.saveGame(st, 'sengoku:save1');
    確('収まらなければ偽を返す', ok === false, String(ok));
    確('訳が読める', /空き|記録/.test(H.記録の訳を読む() || ''), H.記録の訳を読む());
  }

  console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
  process.exit(咎.length ? 1 : 0);
})();
