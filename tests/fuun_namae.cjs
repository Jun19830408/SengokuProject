/* ============================================================
   風雲モード：主人公の名（core/roster.js 通称を起こす・hitori/fuun.js 名乗り・hitori/FuunYashiki.jsx・ui/App.jsx）

   遊ぶ人の申し出：「プレイヤーの最初の名前は与平ですが、ランダムでその都度変えてください。また、物頭のタイミングで
   自分で姓名ともに考えるか、自動(キャンペーンの物頭昇進と同じように)かを選べるようにしたいです」。
     一、初めの名（足軽の通称）は、そのつど賽で起こす。材料は組頭の名と同じ
     二、物頭に取り立てられれば、名乗りを待つ（自動の候補は四つ。姓に当主の名の一字＝偏諱を添える。キャンペーンと同じ）
     三、自分で決める：姓と名を入れる（どちらも要る・それぞれ四字まで）
     四、自動で決める：候補から選ぶ
     五、屋敷の窓：自分で決める・自動で決める
     六、家老になって武将の帳に入れば、帳の名も名乗りになる
   値はみな仮。
   ============================================================ */
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
global.IS_REACT_ACT_ENVIRONMENT = true; dom.window.IS_REACT_ACT_ENVIRONMENT = true;
const ctxStub = new Proxy({}, { get: (t, p) => { if (p === 'measureText') return () => ({ width: 30 }); return () => ({ addColorStop: () => {} }); } });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 200));
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, React, initState } = H;
const 咎 = [];
const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎.push(名); };
let 種 = 0x2B17;
Math.random = () => { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 物頭の手前 = (名 = '与平') => { const s = initState('oda'); H.風雲を始める(s, 名); s.風雲.身分 = '三百人長'; s.風雲.勲功 = 270; return s; };

(async () => {
  console.log('── 一　初めの名（足軽の通称）は、そのつど賽で起こす');
  {
    const 名ら = Array.from({ length: 30 }, () => H.通称を起こす());
    const 違い = new Set(名ら);
    確('三十度起こせば、十より多い違った名が出る', 違い.size > 10, [...違い].slice(0, 8).join('・'));
    確('名は組頭の名と同じ材料（冠・頭・尾）でできる', 名ら.every((n) => /^(権|左|右|小|大|上)?[与藤弥喜孫彦源太半新又小甚伝勘作市角宗](三郎|七郎|九郎|十郎|兵衛|太夫|助|作|市|蔵|介|八|右衛門|左衛門|次郎|五郎|六郎|四郎)$/.test(n)));
    const s = initState('oda'); H.風雲を始める(s, '弥七郎');
    確('風雲を始めるに渡した名で始まる', s.風雲.名 === '弥七郎' && /足軽として仕えた/.test((s.風雲.記 || [])[0].文));
  }

  console.log('\n── 二　物頭に取り立てられれば、名乗りを待つ（自動の候補は偏諱を添えて四つ）');
  {
    const s = 物頭の手前(), f = s.風雲;
    H.取り立てを見る(s);
    const 当主 = s.generals.find((x) => x.faction === s.player && x.lord);
    const 待 = f.名乗りを待つ;
    確('物頭に取り立てられた', f.身分 === '物頭');
    確('名乗りを待つ（旧名・偏諱・当主・候補）', 待 && 待.旧名 === '与平' && 待.当主 === 当主.name && (待.候補 || []).length === 4, JSON.stringify(待 && 待.候補));
    確('偏諱は当主の名乗りの一字', 待 && 当主.name.slice(2).includes(待.偏諱), `${当主.name}・偏諱「${待 && 待.偏諱}」`);
    確('候補はみな同じ姓に、偏諱と一字を添えた二字の名', 待 && 待.候補.every((x) => x.姓 === 待.候補[0].姓 && x.名.length === 2 && x.名.includes(待.偏諱)));
    確('定めるまでは通称のまま', f.名 === '与平');
  }

  console.log('\n── 三　自分で決める');
  {
    const s = 物頭の手前(); H.取り立てを見る(s); const f = s.風雲;
    確('姓が無ければ定められない', !H.名乗りを定める(s, '', '藤吉郎').ok && f.名 === '与平');
    確(`それぞれ${H.名乗りの限り}字を超えれば定められない`, !H.名乗りを定める(s, '木下木下木', '藤吉郎').ok && f.名 === '与平');
    const r = H.名乗りを定める(s, ' 木下 ', '藤吉郎');
    確('姓と名を定める（前後の空きは除く）', r.ok && f.名 === '木下藤吉郎' && f.姓 === '木下' && f.名乗り === '藤吉郎' && f.通称 === '与平' && !f.名乗りを待つ);
    確('記に残す', (f.記 || []).some((x) => x.文 === '与平は名乗りを木下藤吉郎と定めた。'));
  }

  console.log('\n── 四　自動で決める（候補から選ぶ）');
  {
    const s = 物頭の手前('孫六'); H.取り立てを見る(s); const f = s.風雲;
    const x = f.名乗りを待つ.候補[2];
    確('候補の名乗りに定める', H.名乗りを定める(s, x.姓, x.名).ok && f.名 === x.姓 + x.名 && f.通称 === '孫六', f.名);
    確('一度定めれば、もう名乗りを待たない（物頭の支度をし直しても）', (H.名乗りの支度(s), !s.風雲.名乗りを待つ));
  }

  console.log('\n── 五　屋敷の窓');
  {
    const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
    const 押す = async (字) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 字 || x.textContent.includes(字)); if (b) await act(async () => { b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }); return !!b; };
    const 入れる = async (el, v) => { const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set; await act(async () => { set.call(el, v); el.dispatchEvent(new dom.window.Event('input', { bubbles: true })); }); };
    let s = 物頭の手前(); H.取り立てを見る(s); s.風雲.知らせ = [];
    let 改 = null;
    const root = createRoot(document.getElementById('r'));
    const 描く = async () => { await act(async () => { root.render(React.createElement(H.FuunYashiki, { g: s, land: true, onTitle: () => {}, on月送り: () => {}, on知らせを閉じる: () => {},
      on風雲を改める: (fn) => { 改 = fn; } })); }); await flush(); };
    await 描く();
    確('物頭に取り立てられると、名乗りの窓が出る', /名乗り/.test(document.body.textContent) && /物頭に取り立てられた/.test(document.body.textContent) && /偏諱「/.test(document.body.textContent));
    確('自分で決める・自動で決めるを選べる', await 押す('自分で決める'));
    const 欄 = [...document.querySelectorAll('.modal input')];
    確('自分で決めるなら、姓と名を入れる欄が出る', 欄.length === 2);
    await 入れる(欄[0], '木下'); await 入れる(欄[1], '藤吉郎'); await flush();
    確('入れた名乗りで名乗る釦', await 押す('木下藤吉郎と名乗る') && typeof 改 === 'function');
    const n = structuredClone(s); 改(n.風雲, n);
    確('名乗る釦で、盤の名乗りが定まる', n.風雲.名 === '木下藤吉郎' && !n.風雲.名乗りを待つ);
    await 押す('自動で決める'); await flush();
    const 候補の釦 = [...document.querySelectorAll('.modal button')].filter((b) => s.風雲.名乗りを待つ.候補.some((x) => b.textContent === x.姓 + x.名));
    確('自動で決めるなら、四つの候補の釦が出る', 候補の釦.length === 4, 候補の釦.map((b) => b.textContent).join('・'));
    await act(async () => { root.unmount(); }); await flush();
  }

  console.log('\n── 六　家老になって武将の帳に入れば、帳の名も名乗りになる');
  {
    const s = 物頭の手前(); H.取り立てを見る(s); H.名乗りを定める(s, '木下', '藤吉郎');
    const f = s.風雲, 境 = H.身分の境(s, H.主人公の仮の武将(s));
    f.知行 = 境.侍大将; H.禄高の身分を見る(s); f.知行 = 境.家老; H.禄高の身分を見る(s);
    const g = H.主人公の武将(s);
    確('武将の帳の名も名乗り', g && g.name === '木下藤吉郎');
  }

  const 拾う = errs.filter((e) => !/act\(|not wrapped|ReactDOMTestUtils/.test(e));
  if (拾う.length) console.log('\n咎めの書き出し:', 拾う.slice(0, 3));
  console.log(咎.length ? `\n★ ${咎.length}件の咎：${咎.join('／')}` : '\n確かめ：みな通った');
  console.log(`エラー: ${拾う.length ? 拾う.length + '件' : 'なし'}`);
  process.exit(咎.length || 拾う.length ? 1 : 0);
})().catch((e) => { console.log('★ 試しが途中で止まった', e && e.stack); process.exit(1); });
