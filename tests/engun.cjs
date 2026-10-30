/* 同盟の求めに応じた援軍が、揃って後詰の戦に立つこと（GDD 7.4 / 9.2）。

   遊ぶ側の申し出は「同盟国から援軍要請があり、援軍に向かっても、他の軍を待つと選択しても、
   単独で戦うことにしかなりません」であった。

   囲まれた城へ援軍が着くと、囲む敵を相手に後詰の戦になる。その戦は相手を軍として渡すので、
   街道での行き合い（居合わせた者だけの戦）と同じ扱いになり、同じ月に同じ城へ着いた味方を
   盤に載せていなかった。自家の軍を束ねる処理も後詰の戦の手前では働かず、集結を待って
   同じ月に着いても、着いた一手ずつが順に囲みを衝いていた。

   次を検める。
     一、集結を待つとき、頼んで来てもらった他家の援軍とも足並みを揃える
     二、同じ月に着いた自家の援軍は、一手に束ねてから後詰の戦に入る
     三、頼んだ他家の援軍と、城の主が出した後詰も、同じ側に立つ
     四、戦の後、他家の援軍の損害は元の軍に返り、同じ月に二度は戦わない
     五、街道での行き合いは、これまでどおり居合わせた者だけで戦う */
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
  if (p === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
  if (p === 'createRadialGradient' || p === 'createLinearGradient' || p === 'createConicGradient') {
    return () => ({ addColorStop: () => {} });
  }
  if (p === 'canvas') return { width: 900, height: 600 };
  return () => ({ addColorStop: () => {} });
} });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 900; } });
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { get() { return 600; } });
dom.window.HTMLElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 900, height: 600, right: 900, bottom: 600 }; };
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 300));

/* 賽の目を固める（委ねた戦の勝ち負けで、戦の後の筋が分かれるため） */
let 種 = Number(process.env.ENGUN_SEED || 0x51D3);
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
dom.window.Math.random = Math.random;

const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, React, MapScreen, initState, findPath } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 鍵 = (a, b) => [a, b].sort().join('|');

/* ------------------------------------------------------ 盤をこしらえる

   織田と同盟を結んだ家の城が、第三の家に囲まれている。そこへ同じ月に、
     ・織田の二つの城から出した援軍（R1・R2。集結を待って同じ月に着いた）
     ・織田が頼んで、同盟の家の別の城から来てもらった援軍（Y1。aid の印）
     ・同盟の家が自ら出した後詰（F1。relief の印）
   が着く。 */
function 仕込む(敵兵 = 9000) {
  const s = initState('oda');
  const P = s.player;
  const 自城 = s.castles.filter((c) => c.faction === P
    && s.generals.some((x) => x.at === c.id && x.faction === P && !x.captive && !x.lord));
  const 城A = 自城[0];
  let 盟友 = null, 盟城 = null;
  for (const d of s.castles) {
    if (d.faction === P) continue;
    const p = findPath(城A.id, d.id);
    if (!p || p.length < 2 || p.length > 5) continue;
    // 同盟の家に、将の居る城がもう一つ要る（頼みと後詰を出す城）
    const 他 = s.castles.filter((c) => c.faction === d.faction && c.id !== d.id
      && s.generals.filter((x) => x.at === c.id && x.faction === d.faction && !x.captive && !x.lord).length >= 2);
    if (!他.length) continue;
    盟友 = d.faction; 盟城 = d; break;
  }
  if (!盟友) return null;
  s.relations[鍵(P, 盟友)] = { trust: 82, state: '同盟', until: null };
  盟城.local = 3000; 盟城.food = 60000;
  const 敵城 = s.castles.find((c) => c.faction !== P && c.faction !== 盟友
    && s.generals.filter((x) => x.faction === c.faction && !x.captive && !x.lord).length >= 2);
  const 敵 = 敵城.faction;
  delete s.relations[鍵(P, 敵)]; delete s.relations[鍵(盟友, 敵)];

  // 囲む敵
  const 敵将 = s.generals.filter((x) => x.faction === 敵 && !x.captive && !x.lord).slice(0, 2);
  for (const t of 敵将) t.at = null;
  s.armies.push({ id: 'E1', faction: 敵, from: 敵城.id, gens: 敵将.map((x) => x.id),
    local: 敵兵, localTrain: 70, rost: null, men: 敵兵 + 敵将.reduce((a, x) => a + x.retinue, 0),
    at: 盟城.id, path: [盟城.id], prog: 0, food: 90000, target: 盟城.id, sieging: true });
  s.sieges = [{ castleId: 盟城.id, armyId: 'E1', months: 1, decided: null }];

  const 着く軍 = (id, faction, 城, 印) => {
    const 将 = s.generals.find((x) => x.at === 城.id && x.faction === faction && !x.captive && !x.lord);
    if (将) 将.at = null;
    return { id, faction, from: 城.id, gens: 将 ? [将.id] : [], local: 2500, localTrain: 70, rost: null,
      men: 2500 + (将 ? 将.retinue : 0), at: 盟城.id, path: [盟城.id], prog: 0, food: 20000,
      target: 盟城.id, relief: 盟城.id, ...印 };
  };
  const 城B = 自城.find((c) => c.id !== 城A.id && s.generals.some((x) => x.at === c.id && x.faction === P && !x.captive && !x.lord));
  const 盟の城 = s.castles.find((c) => c.faction === 盟友 && c.id !== 盟城.id
    && s.generals.filter((x) => x.at === c.id && x.faction === 盟友 && !x.captive && !x.lord).length >= 2);
  const 援印 = { aid: P, 助勢: true, 待ち合わせ: 盟城.id, 待ち月: 0 };
  s.armies.push(着く軍('R1', P, 城A, 援印), 着く軍('R2', P, 城B, 援印),
    着く軍('Y1', 盟友, 盟の城, 援印), 着く軍('F1', 盟友, 盟の城, {}));
  /* 他家の軍から先に並べる（月送りは着いた順に積む。他家が先に捌かれると、盤の外で
     一手ずつ囲みを衝いてしまう） */
  s.pendingArrivals = ['Y1', 'F1', 'R1', 'R2'];
  s.monthEvents = [];
  return { s, P, 盟友, 盟城, 敵, 敵城, 城A, 城B, 盟の城 };
}

(async () => {
  console.log('■ 一、集結を待つとき、頼んで来てもらった他家の援軍とも足並みを揃える');
  {
    const s = initState('oda');
    const P = s.player;
    const 的 = s.castles.find((c) => c.faction !== P);
    /* 行軍の月数（marchMonthsOf）が実際に違う二つの道を選ぶ。遊ぶ側の軍は遠国から（遅い）、
       頼んだ他家の援軍は隣から（早い） */
    const 月 = (p) => H.marchMonthsOf(p);
    const 道ら = s.castles.filter((c) => c.id !== 的.id).map((c) => ({ c, p: findPath(c.id, 的.id) }))
      .filter((x) => x.p && x.p.length >= 2);
    const 遠 = [...道ら].sort((a, b) => 月(b.p) - 月(a.p))[0];
    const 近 = 道ら.filter((x) => x.c.faction !== P).sort((a, b) => 月(a.p) - 月(b.p))[0];
    確('試しの道は、遠いほうが月数で遅い', 月(遠.p) > 月(近.p), `${月(遠.p)}ヶ月 対 ${月(近.p)}ヶ月`);
    const 我 = { id: 'A', faction: P, aid: P, 助勢: true, 待ち合わせ: 的.id, 待ち月: 0, path: 遠.p, at: 遠.p[0] };
    const 頼 = { id: 'B', faction: 近.c.faction, aid: P, 助勢: true, 待ち合わせ: 的.id, 待ち月: 0, path: 近.p, at: 近.p[0] };
    s.armies = [我, 頼];
    s.sieges = [];
    確('頼んだ他家の援軍（早く着く）は、遊ぶ側の遅い軍を待つ', H.集結を待つか(s, 頼) === true,
      `道 ${近.p.length - 1} 区間 対 ${遠.p.length - 1} 区間`);
    確('遊ぶ側の軍（いちばん遅い）は待たない', H.集結を待つか(s, 我) === false);
    const 他人 = { ...頼, id: 'C', aid: null };
    s.armies = [我, 他人];
    確('差し手の違う軍（他家が自ら出した軍）とは足並みを揃えない', H.集結を待つか(s, 他人) === false);
  }

  const 流す = async (題, 敵兵, 望む) => {
  console.log(`■ ${題}`);
  const 仕 = 仕込む(敵兵);
  if (!仕) { console.log('エラー: 仕込めない（近くに同盟を結べる家がない）'); process.exit(1); }
  const { 盟城, 盟友, 敵, P } = 仕;
  let 盤 = 仕.s;
  const 前 = Object.fromEntries(盤.armies.map((a) => [a.id, a.men]));
  console.log(`  仕込み：${盤.factions[P].name}と${盤.factions[盟友].name}が同盟。${盟城.name}を${盤.factions[敵].name}が囲む（${前.E1}人）。`
    + `援軍 R1 ${前.R1}・R2 ${前.R2}・頼み Y1 ${前.Y1}・城の主の後詰 F1 ${前.F1}人`);

  const 場 = document.createElement('div');
  document.body.appendChild(場);
  const root = createRoot(場);
  const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 5)); }); };
  const 描く = async () => {
    await act(async () => {
      root.render(React.createElement(MapScreen, { g: 盤, setG: (f) => { 盤 = typeof f === 'function' ? f(盤) : f; },
        terrain: null, land: true, onSave: () => {}, saves: [], onTitle: () => {} }));
    });
    await flush();
  };
  const 文 = () => 場.textContent.replace(/\s+/g, ' ');
  const 釦 = (t) => [...場.querySelectorAll('button')].filter((b) => !b.disabled)
    .find((b) => (b.textContent || '').includes(t));
  const M = (t, el) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true, clientX: 450, clientY: 300 }));
  const 押す = async (el) => { for (const t of ['mousedown', 'mouseup', 'click']) await act(async () => { M(t, el); }); await flush(); };

  console.log('  ── 二・三、同じ月に着いた援軍が、揃って後詰の戦に立つ');
  let 問い = null;
  for (let i = 0; i < 30 && !問い; i++) {
    await 描く();
    if (釦('籠もったまま')) { await 押す(釦('籠もったまま')); continue; }
    if (釦('正面から当たる')) { await 押す(釦('正面から当たる')); continue; }
    const m = 文().match(/（自軍）\s*([\d,]+)人・(\d+)隊/);
    if (m) 問い = { 兵: Number(m[1].replace(/,/g, '')), 隊: Number(m[2]) };
  }
  確('合戦に入る前の問いが出る', !!問い, 問い ? '' : 文().slice(0, 120));
  const 我が軍 = 盤.armies.filter((a) => a.faction === P && ['R1', 'R2'].includes(a.id));
  確('自家の二手は一手に束ねられた', 我が軍.length === 1 && 我が軍[0].gens.length === 2,
    我が軍.map((a) => `${a.id} ${a.men}人・将${a.gens.length}`).join('／'));
  const 揃い = 前.R1 + 前.R2 + 前.Y1 + 前.F1;
  if (問い) {
    確('自軍の兵は、着いた援軍みな（自家二手・頼み・城の主の後詰）の合わせ', 問い.兵 >= 揃い * 0.97,
      `問いの自軍 ${問い.兵}人・${問い.隊}隊／着いた援軍の合わせ ${揃い}人（R1 だけなら ${前.R1}人）`);
    確('隊は四つ（将一人ずつ）', 問い.隊 === 4, `${問い.隊}隊`);
  }
  確('他家の援軍は、まだ盤の外で解かれていない（盤に共に立つ）',
    盤.armies.some((a) => a.id === 'Y1') && 盤.armies.some((a) => a.id === 'F1'));

  console.log('  ── 四、戦の後');
  const 委 = 釦('諸将に委ねる');
  確('諸将に委ねられる', !!委);
  const 記の長さ = (盤.chronicle || []).length;
  if (委) await 押す(委);
  for (let i = 0; i < 30; i++) {
    await 描く();
    if (釦('籠もったまま')) { await 押す(釦('籠もったまま')); continue; }
    if (釦('正面から当たる')) { await 押す(釦('正面から当たる')); continue; }
    if (!(盤.pendingArrivals || []).length) break;
  }
  const 新しい記 = (盤.chronicle || []).slice(記の長さ).map((x) => x.text);
  const 戦の記 = 新しい記.filter((t) => t.includes(盟城.name) && /野戦|囲みを|後詰|戦い/.test(t));
  const 囲み = (盤.sieges || []).find((x) => x.castleId === 盟城.id);
  const 勝った = !囲み;
  console.log(`    （戦の後の記：${新しい記.slice(0, 9).join('／')}）`);
  確(`この形では${望む === '勝つ' ? '囲みが解ける（後詰が勝つ）' : '後詰が敗れて囲みが続く'}`,
    望む === '勝つ' ? 勝った : !勝った, 勝った ? '囲みが解けた' : '囲みが続く');
  確('着いた軍は、みな捌き終えた', !(盤.pendingArrivals || []).length, (盤.pendingArrivals || []).join('・'));
  確('同盟の城の戦は一度きり（他家の援軍も、囲む軍も、盤の外でもう一度戦っていない）', 戦の記.length === 1,
    戦の記.join('／'));
  for (const id of ['Y1', 'F1']) {
    const a = 盤.armies.find((x) => x.id === id);
    確(`${id}（他家）は、戦の後に囲みの前へ残っていない`, !a || a.at !== 盟城.id || 勝った,
      a ? `${a.at}・${a.men}人` : '退いた・城に入った');
  }
  if (!勝った) {
    確('囲みは、もとの囲む軍のまま続く', 囲み && 囲み.armyId === 'E1' && 盤.armies.some((a) => a.id === 'E1' && a.sieging));
    確('他家の援軍は引き揚げた（損害を残して本国へ）', 新しい記.some((t) => /援軍は[\d,]+人を残して/.test(t)),
      新しい記.filter((t) => /引き揚げた/.test(t)).join('／') || 'なし');
  }
  確('城は同盟の家のまま（援軍が城を取っていない）',
    (盤.castles.find((c) => c.id === 盟城.id) || {}).faction === 盟友);
  確('画面の例外が出ない', errs.length === 0, errs[0] || '');
  await act(async () => { root.unmount(); });
  };
  await 流す('二〜四（勝つ形：囲む敵 9,000）', 9000, '勝つ');
  await 流す('二〜四（敗れる形：囲む敵 40,000）', 40000, '敗れる');

  console.log('■ 五、街道での行き合いは、居合わせた者だけで戦う');
  {
    const src = require('fs').readFileSync(path.join(__dirname, '..', 'src', 'ui', 'MapScreen.jsx'), 'utf8');
    確('行き合いの場には印がある（後詰の戦と見分ける）', /行き合い:\s*true/.test(src));
  }

  console.log(`\n════ 援軍：咎 ${咎.length} 件`);
  console.log('エラー:', 咎.length ? 咎.join(' | ') : 'なし');
  process.exit(咎.length ? 1 : 0);
})().catch((e) => { console.log('例外:', e && e.stack); console.log('エラー: 例外'); process.exit(1); });
