/* 金の見通し ─ 扶持は地の兵に掛かり、月の出入りが常に見える（GDD 6.2）。

   遊ぶ側の報せは「武田で始めて木曽福島城を取ったところだが、金銭収入が少なすぎる。
   ゲームとして成り立たない」であった。式に当てるとこうなる。

     入り ＝ 商い×4 ＋ 石高×0.003
     出　 ＝ 兵数×0.075×動員の段

   七城・二十九万七千石・兵二万八百で、入り千五百七十一貫に対し出が千五百六十一貫。
   差引十貫である。内訳を見ると兵のうち手勢が一万六百九十（六割）を占めていた。

   手勢は、その武将の知行から出る兵である。知行はすでに城の石高から配ってあるのだから、
   大名の蔵からさらに扶持を引くのは二重取りになる。大名の蔵が負うのは地の兵――
   城が直に抱える兵だけとする。武田で月百四十四貫→九百四十六貫。

   併せて、手を打つ前後で家の月の金銭がどう動くかを盤に出す。兵を雇えば扶持が増え、
   田を開き商いを興せば入りが増える。懐がどちらを向いているかは常に見えていなければ
   ならない。 */
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
let rafMap = new Map(), rafId = 0;
global.requestAnimationFrame = (cb) => { rafId++; rafMap.set(rafId, cb); return rafId; };
global.cancelAnimationFrame = (id) => rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT = true; dom.window.IS_REACT_ACT_ENVIRONMENT = true;
const ctxStub = new Proxy({}, { get: (t, p) => {
  if (p === 'measureText') return () => ({ width: 30 });
  if (p === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
  return () => ({ addColorStop: () => {} });
} });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 900; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 700; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 900, height: 700, right: 900, bottom: 700 }; };
console.error = () => {};
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, React, CastleSheet } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x77;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

console.log('■ 一、扶持は地の兵にだけ掛かる');
{
  const s = H.initState('takeda');
  const f = 'takeda';
  const 我 = s.castles.filter((c) => c.faction === f);
  let 地 = 0, 手 = 0, 入 = 0;
  for (const c of 我) {
    地 += c.local;
    手 += s.generals.filter((g) => g.at === c.id && g.faction === f && !g.captive).reduce((a, g) => a + g.retinue, 0);
    入 += c.comm * 4 + c.koku * 0.003;
  }
  const fc = H.forecast(s, f);
  確('出は地の兵ぶんだけ（手勢は武将の知行が養う）', Math.abs(fc.outGold - 地 * 0.075) < 1,
    `地の兵${地}・手勢${手}／出${Math.round(fc.outGold)}貫（地の兵ぶん${Math.round(地 * 0.075)}）`);
  確('入りは商いと石高から', Math.abs(fc.inGold - 入) < 2, `入${Math.round(fc.inGold)}貫`);
  確('武田は月に八百貫より多く残る', fc.netGold > 800, `差引${Math.round(fc.netGold)}貫（直す前は144貫）`);
  /* 月送りの勘定と、見通しの勘定が食い違わないこと。 */
  const 前金 = s.factions[f].gold;
  const t = H.advanceMonth(JSON.parse(JSON.stringify(s)));
  const 実 = t.factions[f].gold - 前金;
  確('見通しと、実際の月送りの増えが合う', Math.abs(実 - fc.netGold) < Math.max(40, fc.netGold * 0.12),
    `見通し${Math.round(fc.netGold)}／実${Math.round(実)}貫`);
}

console.log('■ 二、兵を増やせば出が増え、田と商いを興せば入りが増える');
{
  const s = H.initState('takeda');
  const c = s.castles.find((x) => x.faction === 'takeda');
  const 前 = H.forecast(s, 'takeda').netGold;
  const s2 = JSON.parse(JSON.stringify(s));
  s2.castles.find((x) => x.id === c.id).local += 1000;
  確('地の兵を千人増やせば、月の出が七十五貫増える',
    Math.abs((前 - H.forecast(s2, 'takeda').netGold) - 75) < 2,
    `${Math.round(前)} → ${Math.round(H.forecast(s2, 'takeda').netGold)}貫`);
  const s3 = JSON.parse(JSON.stringify(s));
  const g3 = s3.generals.find((x) => x.at === c.id && x.faction === 'takeda' && !x.lord);
  g3.retinue += 1000;
  確('手勢が千人増えても、大名の出は増えない',
    Math.abs(H.forecast(s3, 'takeda').netGold - 前) < 1);
  const s4 = JSON.parse(JSON.stringify(s));
  s4.castles.find((x) => x.id === c.id).comm += 3;
  確('商いが三つ上がれば、月の入りが十二貫増える',
    Math.abs((H.forecast(s4, 'takeda').netGold - 前) - 12) < 1,
    `${Math.round(前)} → ${Math.round(H.forecast(s4, 'takeda').netGold)}貫`);
}

console.log('■ 三、城の帳で、手を打つ前に見通しが出る');
(async () => {
  const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 8)); }); };
  const s = H.initState('takeda');
  const c = s.castles.find((x) => x.faction === 'takeda');
  const root = createRoot(document.getElementById('r'));
  let tab = '内政';
  const 描く = async () => {
    await act(async () => {
      root.render(React.createElement(CastleSheet, { g: s, castle: c, land: true, tab, setTab: (t) => { tab = t; },
        onClose: () => {}, onCommand: () => {}, onTrade: () => {}, onAppoint: () => {} }));
    });
    await flush();
  };
  await 描く();
  const 文 = () => document.body.textContent.replace(/\s+/g, ' ');
  const 押 = async (t) => {
    const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === t);
    if (!el) return false;
    await act(async () => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
    await flush();
    return true;
  };
  確('内政の手が並ぶ', /徴募/.test(文()) && /商業/.test(文()));
  const 出た = [];
  for (const k of ['徴募', '商業', '開墾']) {
    if (!(await 押(k))) { 出た.push(`${k}：釦が無い`); continue; }
    const t = 文();
    const m = t.match(/家の月の金銭は\s*([＋−][\d,]+)\s*→\s*([＋−][\d,]+)/);
    出た.push(m ? `${k}：${m[1]}→${m[2]}` : `${k}：★出ない`);
  }
  確('徴募・商業・開墾のいずれでも、月の金銭の見通しが出る',
    出た.every((x) => !/★|無い/.test(x)), 出た.join('／'));

  console.log('');
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})();
