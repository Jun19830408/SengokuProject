/* 天下の画面（GDD 12.5）。惣無事令と号令を、実際の画面で押して確かめる。

   engine（core/sobuji.js・core/gourei.js）は tests/sobuji.cjs と tests/gourei.cjs で
   測ってある。ここで見るのは画面の側――釦が出るか、問いが立つか、押せば盤が
   変わるか、である。

   盤を直に組み立て、記録として仕込んでから「続きから」で開く。画面を延々と
   押して所定の局面へ持っていくのは当てにならない。 */
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
let rafMap = new Map(), rafId = 0;
global.requestAnimationFrame = (cb) => { rafId++; rafMap.set(rafId, cb); return rafId; };
global.cancelAnimationFrame = (id) => rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT = true; dom.window.IS_REACT_ACT_ENVIRONMENT = true;
const ctxStub = new Proxy({}, { get: (t, p) => {
  if (p === 'measureText') return () => ({ width: 30 });
  if (p === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
  if (['save', 'restore', 'translate', 'scale', 'setTransform', 'clip'].includes(p)) return () => {};
  return () => ({ addColorStop: () => {} });
} });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 1200; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 800; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 1200, height: 800, right: 1200, bottom: 800 }; };
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 180));

let 種 = 0x2f31;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
dom.window.Math.random = Math.random;

const A = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, App, React, initState, 号令できるか, 旗の下の城数,
  天下人の直轄, 天下人の版図, 国主に任じる, minGarrison, ROAD_ADJ, courtRank } = A;

/* ---------------------------------------------------- 天下人の盤をこしらえる
   五畿を直轄で押さえ、地続きに版図を広げ、諸家を旗の下に置く。飛び地に散らすと
   軍の道が引けず、参陣の手が立たない（tests/gourei.cjs で一度そうなった）。 */
const 五畿 = ['山城', '大和', '河内', '和泉', '摂津'];
const s = initState('oda');
for (const c of s.castles.filter((x) => 五畿.includes(x.kuni))) c.faction = 'oda';
const 全 = () => s.castles.reduce((a, c) => a + c.koku, 0);
const 直 = () => s.castles.filter((c) => c.faction === 'oda').reduce((a, c) => a + c.koku, 0);
const 旗の下か = (f) => {
  if (f === 'oda') return true;
  const r = s.relations[['oda', f].sort().join('|')];
  return !!r && r.state === '臣従' && r.master === 'oda';
};
for (let i = 0; i < 300 && 直() < 全() * 天下人の直轄 * 1.15; i++) {   // 関門ぎりぎりでは測れない
  let 取 = null;
  for (const c of s.castles.filter((x) => x.faction === 'oda')) {
    for (const 隣 of (ROAD_ADJ[c.id] || [])) {
      const x = s.castles.find((y) => y.id === 隣);
      if (x && x.faction !== 'oda') { 取 = x; break; }
    }
    if (取) break;
  }
  if (!取) break;
  取.faction = 'oda';
}
for (let i = 0; i < 200 && 旗の下の城数(s, 'oda') < s.castles.length * 天下人の版図; i++) {
  let 先 = null;
  for (const c of s.castles.filter((x) => 旗の下か(x.faction))) {
    for (const 隣 of (ROAD_ADJ[c.id] || [])) {
      const x = s.castles.find((y) => y.id === 隣);
      if (x && !旗の下か(x.faction)) { 先 = x.faction; break; }
    }
    if (先) break;
  }
  if (!先) break;
  s.relations[['oda', 先].sort().join('|')] = { state: '臣従', master: 'oda', trust: 100, until: null };
}
// 城を移しただけでは将は移らない。その城にいた者も家に付ける
for (const c of s.castles.filter((x) => x.faction === 'oda')) {
  for (const g of s.generals.filter((x) => x.at === c.id && !x.captive && !x.lord)) {
    g.faction = 'oda'; g.本領 = c.id; g.役 = null; g.役国 = null; g.寄親 = null;
  }
}
// 国主を並べる（当主のいる国には置かない）
for (const k of [...new Set(s.castles.filter((c) => c.faction === 'oda').map((c) => c.kuni))]) {
  for (const g of s.generals.filter((x) => x.faction === 'oda' && !x.lord && !x.captive && !x.役
    && (s.castles.find((c) => c.id === (x.本領 || x.at)) || {}).kuni === k)) {
    g.fief = 14000; g.age = Math.max(g.age || 30, 30);
    if (国主に任じる(s, 'oda', k, g.id).ok) break;
  }
}
for (const c of s.castles) { c.local = Math.max(c.local, minGarrison(c) + 1500); c.food = 200000; }
s.factions.oda.gold = 80000;
s.courtRanks = { oda: (courtRank(s, 'oda') || {}).key || null };   // 位の控え（月送りが持つもの）

const 蔵 = new Map([['sengoku:save1', JSON.stringify({ v: 1, at: Date.now(), state: s })]]);
dom.window.storage = {
  get: async (k) => (蔵.has(k) ? { key: k, value: 蔵.get(k) } : null),
  set: async (k, v) => { 蔵.set(k, v); return { key: k, value: v }; },
  delete: async (k) => { 蔵.delete(k); return {}; },
};
console.log(`仕込み: 織田は${(courtRank(s, 'oda') || {}).key}。`
  + `直轄 ${Math.round(直() / 10000)}万石（${(直() / 全() * 100).toFixed(1)}%）`
  + `／旗の下 ${旗の下の城数(s, 'oda')}城（${(旗の下の城数(s, 'oda') / s.castles.length * 100).toFixed(0)}%）`
  + `／国主 ${s.generals.filter((g) => g.faction === 'oda' && g.役 === '国主').length}名`);

const root = createRoot(document.getElementById('r'));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 600, clientY: 400 }));
const click = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };
const btn = (t) => [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t) && !b.disabled);
const rc = async (t) => { const el = btn(t); if (!el) return false; await click(el); return true; };
const txt = () => {
  const b = document.body.cloneNode(true);
  for (const x of b.querySelectorAll('style,script')) x.remove();
  return b.textContent.replace(/\s+/g, ' ');
};
/* いまの盤を読む。

   自動の記録は月が変わったときにしか書かれないので、押した直後に蔵を読むと
   古い盤が返る（それに気づかず「発しても旗の下が増えぬ」と誤って測った）。
   月を送ってから読む。送れば采配も動くが、見たいのは「増えたか」なので障らない。 */
let 時 = 1000;
const 盤 = () => { try { return JSON.parse(A.解す(蔵.get('sengoku:save1'))).state; } catch (e) { return null; } };
const 月を送って盤を読む = async () => { await rc('次月へ'); await flush(); await flush(); return 盤(); };

(async () => {
  let 咎 = 0;
  const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎++; };

  await act(async () => { root.render(React.createElement(App)); }); await flush(); await flush();
  await rc('続きから'); await flush(); await flush();

  console.log('\n── 一　天下人には天下の釦が出る');
  console.log('  （出ている釦）', [...document.querySelectorAll('button,.mbtn')]
    .map((b) => b.textContent.trim()).filter(Boolean).slice(0, 24).join(' / '));
  確('惣無事令の釦が出る', !!btn('惣無事令'));
  確('号令の釦が出る', !!btn('号令'));

  console.log('\n── 二　惣無事令の帳');
  {
    await rc('惣無事令'); await flush();
    const t = txt();
    確('帳が開く', /私戦の停止を命じます/.test(t));
    確('問う家の数が読める', /問う家/.test(t));
    確('応じそうな家の数が読める', /応じそうな家/.test(t));
    確('従えば臣従、拒めば朝敵と書いてある', /臣従/.test(t) && /朝敵/.test(t));
    const 前 = 盤();
    const 前旗 = Object.keys(前.factions).filter((f) => {
      const r = 前.relations[['oda', f].sort().join('|')];
      return f !== 'oda' && r && r.state === '臣従' && r.master === 'oda';
    }).length;
    確('発する釦が押せる', !!btn('惣無事令を発する'));
    await rc('惣無事令を発する'); await flush(); await flush();
    /* 発すれば帳は閉じ、盤へ戻る。顛末は月報と戦国記に残る。 */
    確('発すれば帳が閉じる', !/私戦の停止を命じます/.test(txt()));
    const 後 = await 月を送って盤を読む();
    const 後旗 = Object.keys(後.factions).filter((f) => {
      const r = 後.relations[['oda', f].sort().join('|')];
      return f !== 'oda' && r && r.state === '臣従' && r.master === 'oda';
    }).length;
    const 敵 = Object.keys(後.朝敵 || {}).length;
    確('発すれば旗の下が増える', 後旗 > 前旗, `旗の下 ${前旗}家 → ${後旗}家`);
    確('拒んだ家は朝敵になる', 敵 > 0, `朝敵 ${敵}家`);
    確('戦国記に残る', (後.chronicle || []).some((c) => /惣無事令/.test(c.text)));
    const 位 = courtRank(後, 'oda');
    const 五畿の主 = 五畿.map((k) => `${k}:${[...new Set(後.castles.filter((c) => c.kuni === k)
      .map((c) => (後.factions[c.faction] || {}).name))].join('+')}`).join(' ');
    console.log('  （月を送った後）位', (位 || {}).key || 'なし',
      '／直轄', Math.round(後.castles.filter((c) => c.faction === 'oda').reduce((a, c) => a + c.koku, 0) / 10000) + '万石',
      '／旗の下', 旗の下の城数(後, 'oda') + '城');
    console.log('  （五畿）', 五畿の主);
    確('位は保たれる', !!位 && !!位.号令, (位 || {}).key || 'なし');
  }

  console.log('\n── 三　号令の帳');
  {
    /* 月を送ったあとは月報が開いている。閉じてから号令の帳を開く。 */
    for (let i = 0; i < 3; i++) { if (!(await rc('閉じる'))) break; await flush(); }
    if (!(await rc('号令'))) {
      console.log('  （出ている釦）', [...document.querySelectorAll('button,.mbtn')]
        .map((b) => b.textContent.trim()).filter(Boolean).slice(0, 20).join(' / '));
    }
    await flush();
    const t = txt();
    確('帳が開く', /一つの城へ寄せるよう命じます/.test(t));
    確('参陣の顔ぶれが並ぶ', /参陣の顔ぶれ/.test(t));
    確('国主のいない国は参陣しないと書いてある', /国主のいない国は参陣しません/.test(t));
    確('筋の限りが読める', /筋まで/.test(t));
    /* 寄せる城を選ぶ。丸印を押してから発する。 */
    const 丸 = [...document.querySelectorAll('label')].filter((l) => l.querySelector('input[type=radio]'));
    確('寄せる城が並ぶ', 丸.length > 0, `${丸.length}城`);
    if (丸.length) {
      await act(async () => { 丸[0].querySelector('input[type=radio]').click(); });
      await flush();
      const 押 = [...document.querySelectorAll('button')].find((b) => /号令を発する/.test(b.textContent) && !b.disabled);
      確('城を選べば発せるようになる', !!押, 押 ? 押.textContent.trim() : '押せない');
      if (押) {
        const 前軍 = (盤().armies || []).length;
        await click(押); await flush(); await flush();
        確('発すれば帳が閉じる', !/一つの城へ寄せるよう命じます/.test(txt()));
        const 後 = await 月を送って盤を読む();
        const 号 = (後.号令 || [])[0];
        確('号令が控えられる', !!号, 号 ? `${号.手.length}手` : 'なし');
        確('手の数だけ軍が立つ', (後.armies || []).length > 前軍,
          `軍 ${前軍} → ${(後.armies || []).length}`);
        確('どの軍も同じ城を目指す',
          !号 || 号.手.every((h) => ((後.armies || []).find((a) => a.id === h.armyId) || {}).target === 号.的));
        確('戦国記に残る', (後.chronicle || []).some((c) => /号令を発した/.test(c.text)));
        /* 守備の兵は残っていなければならない。 */
        const 欠 = (後.castles || []).filter((c) => c.faction === 'oda' && c.local < minGarrison(c) * 0.9);
        確('どの城にも守備の兵が残る', 欠.length === 0,
          欠.length ? 欠.slice(0, 3).map((c) => c.name).join('・') : `${後.castles.filter((c) => c.faction === 'oda').length}城を検めた`);
      }
    }
  }

  console.log('\n── 四　月を送っても倒れない');
  /* 号令の軍が着けば合戦の盤が開く。委ねて決着まで送る――engine は手ずから
     戦っても委ねても同じ理屈で回るので、これで筋はひととおり通る。 */
  {
    /* 問いが立っていれば答えてから送る。答えぬかぎり月は進まない。 */
    let 進 = 0;
    for (let i = 0; i < 4; i++) {
      for (const t of ['閉じる', '却下する', '取りやめる']) { if (await rc(t)) await flush(); }
      if (btn('合戦開始') || btn('委ねて結果を見る')) {
        await rc('合戦開始'); await rc('委ねて結果を見る');
        for (let k = 0; k < 300 && !btn('戦場を離れる'); k++) {
          時 += 33; const q = [...rafMap.entries()]; rafMap.clear();
          await act(async () => { q.forEach(([, cb]) => cb(時)); });
        }
        await rc('戦場を離れる'); await flush();
        for (const t of ['城主を置かず', 'この差配で決める', '閉じる']) { if (await rc(t)) await flush(); }
      }
      /* 囲みが立っていれば、その始末をつけねば月は送れない（次月へが押せない）。 */
      for (const t of ['兵糧攻め', '力攻め', '囲みを解く', '閉じる']) { if (await rc(t)) { await flush(); break; } }
      if (await rc('次月へ')) 進++;
      await flush();
    }
    if (!進) {
      console.log('  （出ている釦）', [...document.querySelectorAll('button,.mbtn')]
        .map((b) => b.textContent.trim() + (b.disabled ? '[不可]' : '')).filter(Boolean).slice(0, 16).join(' / '));
      const 札 = document.querySelector('.card');
      if (札) console.log('  （札）', 札.textContent.replace(/\s+/g, ' ').slice(0, 120));
    }
    確('月が進む', 進 > 0, `${進}か月`);
    const 叫 = errs.filter((e) => !/not wrapped in act|Warning/.test(e));
    確('画面が叫ばない', 叫.length === 0, 叫.slice(0, 2).join(' | ') || 'なし');
  }

  console.log('');
  console.log('エラー:', 咎 ? `${咎}件` : 'なし');
  process.exit(咎 ? 1 : 0);
})().catch((e) => {
  console.log('例外:', e.message.slice(0, 200));
  console.log(String(e.stack || '').split('\n').slice(0, 5).join('\n'));
  console.log('エラー: 例外');
  process.exit(1);
});
