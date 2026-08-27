/* 地図の名札が、ちゃんと読めること（GDD 13.1）。

   iPhone の画面に、城の名から右へずれた白い帯が並んだ。
   帯が動いたのではない。字のほうが左へ半分ずれていた。

   名の後ろに白い帯を敷くのは、三手を要する仕掛けであった。
     一、ctx.measureText で名の幅を測る
     二、fillRect で x−幅/2 の所へ四角を塗る（左揃えの字を包む形）
     三、fillText で x−幅/2 から字を置く
   三手めが左揃えであることを、一手めと二手めが当てにしている。

   ところが間柄の印（城に添える「属・臣・盟・侵」）が、
   ctx.textAlign = "center"、ctx.textBaseline = "middle" を立てたまま
   戻していなかった。canvas の揃えは描き手に居座るので、それ以降の城名は
   みな中央揃えで置かれる。字は x−幅/2 を中心に置かれ、つまり幅の半分だけ
   左へ寄る。帯だけが右に取り残された。旗の下の印を入れた回から、
   ずっとこうなっていた。

   直し方は二つある。
     ・立てた揃えをその場で戻す（対症）
     ・帯をやめ、字と同じ字形から白い縁を描く（strokeText → fillText）
   縁は字そのものから描かれるので、ずれようがない。どちらも入れた。

   ここでは実際に地図を描かせ、書かれた字を一つ残らず控えて検める。
   絵の見た目は機械には見えないが、「同じ種類の名札が、みな同じ揃えで
   書かれているか」は見える。ずれていれば、揃えが二通りに割れる。 */
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>',
  { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
let rafMap = new Map(), rafId = 0;
global.requestAnimationFrame = (cb) => { rafId++; rafMap.set(rafId, cb); return rafId; };
global.cancelAnimationFrame = (id) => rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT = true; dom.window.IS_REACT_ACT_ENVIRONMENT = true;

/* 描き手の張りぼて。ただし揃え・下端・色は本物と同じように覚えておき、
   save / restore も積み下ろしする。そうしないと「居座り」が再現できない。 */
const 帳 = [];
const 台 = { textAlign: 'left', textBaseline: 'alphabetic', fillStyle: '#000',
  strokeStyle: '#000', lineWidth: 1, font: '' };
const 積 = [];
const ctxStub = new Proxy(台, {
  get: (t, p) => {
    if (p === 'measureText') return (v) => ({ width: String(v).length * 11 });
    if (p === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
    if (p === 'save') return () => { 積.push({ ...t }); };
    if (p === 'restore') return () => { const v = 積.pop(); if (v) Object.assign(t, v); };
    if (p === 'fillText' || p === 'strokeText') {
      return (v, x, y) => 帳.push({ 手: p, 文: String(v), x, y,
        揃: t.textAlign, 下: t.textBaseline, 色: t.fillStyle, 縁: t.strokeStyle, 太: t.lineWidth });
    }
    if (p === 'fillRect') return (x, y, w, h) => 帳.push({ 手: 'fillRect', x, y, w, h, 色: t.fillStyle });
    if (p in t) return t[p];
    return () => ({ addColorStop: () => {} });
  },
  set: (t, p, v) => { t[p] = v; return true; },
});
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 1200; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 800; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, width: 1200, height: 800, right: 1200, bottom: 800 };
};
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 300));

const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, App, React, CASTLES } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

const root = createRoot(document.getElementById('r'));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 15)); }); };
const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 600, clientY: 400 }));
const click = async (t) => {
  const el = [...document.querySelectorAll('button,.mbtn')].find((b) => b.textContent.trim().includes(t));
  if (!el || el.disabled) return false;
  await act(async () => { M('mousedown', el); });
  await act(async () => { M('mouseup', el); });
  await act(async () => { M('click', el); });
  await flush(); return true;
};
const openFaction = async (nm) => {
  const el = [...document.querySelectorAll('.mn')].find((e) => e.textContent.trim() === nm);
  if (!el) return false;
  const p = el.parentElement;
  for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, p); });
  await flush(); return true;
};

(async () => {
  await act(async () => { root.render(React.createElement(App)); });
  await flush();
  await click('ゲームをはじめる');
  /* 三好で始める。畿内は城が密で、旗の下の印（属・臣・盟・侵）を付ける相手も
     多い。揃えが居座る不具合は、印を描いたあとの城から現れる。 */
  await openFaction('三好家');
  await click('この勢力で開始');
  await flush();

  確('地図が落ちずに描ける', errs.length === 0, errs[0] || '');

  const 城名 = new Set(CASTLES.map((c) => c.name));
  const 字 = 帳.filter((r) => r.手 === 'fillText' || r.手 === 'strokeText');
  const 名札 = 字.filter((r) => 城名.has(r.文));
  確('城の名が実際に書かれている', 名札.length >= 10, `${名札.length}件（書かれた字は全部で ${字.length}件）`);

  // ── 一、同じ種類の名札が、みな同じ揃えで書かれる
  const 揃 = [...new Set(名札.map((r) => `${r.揃}/${r.下}`))];
  確('城の名は、みな同じ揃えで書かれる', 揃.length === 1,
    揃.length === 1 ? 揃[0] : `揃えが ${揃.length}通りに割れた（${揃.join('　')}）`);
  if (揃.length > 1) {
    for (const v of 揃) {
      const 例 = 名札.filter((r) => `${r.揃}/${r.下}` === v).slice(0, 4).map((r) => r.文);
      console.log(`      ${v}：${例.join('・')}…`);
    }
  }

  // ── 二、名札は白帯ではなく、字と同じ字形の縁取りで読ませる
  const 縁 = 名札.filter((r) => r.手 === 'strokeText');
  const 塗 = 名札.filter((r) => r.手 === 'fillText');
  確('城の名には白い縁が添えてある', 縁.length > 0, `縁 ${縁.length}件／字 ${塗.length}件`);
  確('縁と字は、同じ所から描かれる（ずれようがない）',
    塗.every((f) => 縁.some((k) => k.文 === f.文 && k.x === f.x && k.y === f.y)),
    `${塗.length}件すべてに、同じ座標の縁がある`);
  /* 名札の帯は、字を包める大きさ（幅二十以上・高さ十二〜二十四）である。
     地図の目（grid）も白い四角を塗るが、あれは一辺一、二の点にすぎない。
     大きさで見分ける。 */
  const 白帯 = 帳.filter((r, i) => r.手 === 'fillRect'
    && /255,\s*255,\s*255|#fff/i.test(String(r.色 || ''))
    && r.w >= 20 && r.h >= 12 && r.h <= 24
    && 帳.slice(i + 1, i + 3).some((n) => (n.手 === 'fillText' || n.手 === 'strokeText') && 城名.has(n.文)));
  確('城の名の後ろに白帯を敷いていない', 白帯.length === 0, `${白帯.length}件`);
  if (白帯.length) for (const r of 白帯.slice(0, 6)) {
    const i = 帳.indexOf(r);
    console.log(`      四角 色${r.色} ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.w)}x${Math.round(r.h)}`
      + ` → 次: ${帳.slice(i+1, i+3).map((n) => n.手 + (n.文 ? ':' + n.文 : '')).join(' , ')}`);
  }

  // ── 三、間柄の印を書いたあと、揃えが元に戻る
  const 印 = ['属', '臣', '盟', '侵'];
  let 居座り = 0;
  for (let i = 0; i < 字.length - 1; i++) {
    if (!(印.includes(字[i].文) && 字[i].下 === 'middle')) continue;
    const 次 = 字.slice(i + 1).find((r) => !印.includes(r.文));
    if (次 && 次.下 === 'middle') 居座り++;
  }
  確('間柄の印で立てた揃えが、あとの字に居座らない', 居座り === 0, `居座り ${居座り}件`);

  console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
  process.exit(咎.length ? 1 : 0);
})();
