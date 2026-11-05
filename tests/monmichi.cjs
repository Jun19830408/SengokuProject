/* 城攻めで門を名指しした隊の道（battle/castleMap.js 道さがしの重み・routeToCastleGate・押した門・城の中の道、
   battle/corps.js 門へ向かわせる・城の中を動かす、battle/engine.js 門前の控え口、ui/BattleScreen.jsx の地図押し）。

   遊ぶ側の申し出は「城攻めのとき、部隊に対して〇〇の門へのコマンドで指示をしたり、門を選んで攻撃させたり
   する場合、城の壁などにぶつかってしまいうまく対象の門にたどり着けない」であった。十五城で測ると、
     ・「この門へ」の道は、南から裏の門へ向かうとき城の角で堀を突っ切り、堀と塀のあいだの細い帯を回って、
       途中の門の枡形に挟まり、塀ぎわを這っていた（百三十五回で塀ぎわの合計千三百五十八秒）
     ・地図で門を押すと、ただの「移動」でまっすぐ向かい、裏の門なら城の塀に当たって止まった
       （三十六回のうち十八回は門に着かなかった）
   ここで確かめること。
     一、道の重み   … 道さがしは、足の遅い地（堀・空堀・坂）と塀ぎわを重く数える。南の陣から北の搦手門への
                      道は、堀を渡るのは目当ての門の前だけで、塀に接する所をほとんど通らない
     二、この門へ   … 隊は外のどの門にも取り付き、塀ぎわを這う時が短い。三隊を一つの門へ向けても、
                      一隊が取り付き、後の隊は塀に貼りつかずに門前の列に着く。枡形の正面の切れ目は
                      枡形の内へ広く開き（もとは三歩ほど）、枡形の中から控え口へ道が引ける
     三、門を押す   … 地図で門（塀の線か、枡形の外の開き口）を押せば、その門を破りに向かい、取り付く。
                      門から遠い所を押しても門とは見なさない
     四、城の中を動かす … 塀の向こうを押せば、塀を回り込む道を引いて着く。見通せる所へはまっすぐ向かう
     五、速さ       … 重みを入れても、道さがしは速い */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'monmichi-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { buildCastleMap, layoutCastleField, setBattleMap, 寄せ手の陣, navPath, routeToCastleGate, gatePos, 門の輪, axisOf, fromUV, gateOpenU, 押した門, 城の中の道, 見通せる, 門の控え口, 枡形の切れ目 } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, issueOrder, 門へ向かわせる, 城の中を動かす } from "../src/battle/corps.js";\n'
+ 'export { createBattle, stepBattle } from "../src/battle/engine.js";\n'
+ 'export { FIELD, fieldScale, setFieldKind, setFieldSeed, passable, terrainAt } from "../src/battle/field.js";\n'
+ 'export { roadBetween } from "../src/core/paths.js";\n'
+ 'export { initState } from "../src/core/state.js";\n');
const out = path.join(ROOT, 'build', 'monmichi.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x3a7;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const S = A.initState('oda');
/* 遊びの組み方（ui/MapScreen.jsx 強攻の盤）のとおりに、那古野から寄せる広い盤を組む */
const 盤 = (城id) => {
  const castle = S.castles.find((x) => x.id === 城id);
  A.setFieldSeed('nagoya', castle.id);
  const r = A.roadBetween('nagoya', castle.id);
  A.setFieldKind(r ? r[3] : '街道');
  const m = A.layoutCastleField(A.buildCastleMap(castle), { 広く: true, 城id: castle.id });
  A.setBattleMap(m);
  return m;
};
const 外の門 = (m, key) => m.gates.find((g) => g.layer === 0 && g.key === key);
/* 一隊だけを動かす戦。矢倉は黙らせ、城方は本丸の芯に小さな隊を一つ置く（道だけを見る） */
const 戦 = (m, 陣ら) => {
  const atk = 陣ら.map((k, i) => {
    const sp = A.寄せ手の陣(m, k, 7);
    const c = A.makeCorps('P', { id: `g${i}`, name: `将${i}`, lead: 70, valor: 70, wit: 60, gov: 50, retinue: 400, retTrain: 70, unity: 60 },
      400, 600, 72, 70, sp.x, sp.y, sp.f, '#2F5D8C');
    c.auto = false; c.formation = '方陣'; A.placeSquads(c, true);
    return c;
  });
  const 本丸 = m.layers[m.layers.length - 1];
  const d = A.makeCorps('E', { id: 'g9', name: '城の将', lead: 50, valor: 50, wit: 50, gov: 50, retinue: 30, retTrain: 60 }, 30, 0, 60, 60,
    m.cx + (本丸.ox || 0), m.cy + (本丸.oy || 0), 0, '#B0483C');
  d.auto = false; d.order = '待機';
  const b = A.createBattle(atk, [d], 'P');
  b.mode = 'castle'; b.map = m; b.phase = 'fight'; b.日数 = 3; b.日 = 1; b.日の始め = 0; b.dusk = 99999; b.日の長さ = 99999;
  b.鼓舞なし = true;
  for (const f of m.fac) if (f.kind === '矢倉') f.hp = 0;
  return { b, atk };
};
const 塀ぎわ = (x, y) => { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (!A.passable(x + Math.cos(a) * 9, y + Math.sin(a) * 9)) return true; } return false; };
const 塀ぎわの割 = (c) => { const qs = c.squads.filter((q) => q.men > 0); return qs.filter((q) => 塀ぎわ(q.x, q.y)).length / Math.max(1, qs.length); };
/* 隊を走らせ、取り付いた刻と塀ぎわの秒を測る */
const 走らせる = (b, c, 門, 秒) => {
  let 取付 = null, 塀 = 0;
  for (let st = 0; st * 0.05 < 秒; st++) {
    A.stepBattle(b, 0.05);
    if (取付 == null && 門 && 門.slot === c.id) 取付 = b.t;
    if (取付 == null && 塀ぎわの割(c) > 0.3) 塀 += 0.05;
    if (取付 != null && b.t > 取付 + 2) break;
  }
  return { 取付, 塀 };
};

console.log('■ 一、道の重み');
for (const [城id, 名] of [['kawagoe', '川越城（水堀）'], ['inabayama', '稲葉山城（空堀）']]) {
  const m = 盤(城id);
  const 門 = 外の門(m, '惣構搦手門');
  const sp = A.寄せ手の陣(m, 0, 7);
  const 道 = A.routeToCastleGate(m, 門, sp.x, sp.y);
  const l = A.門の輪(m, 門), a = A.axisOf(l, 門);
  const 橋 = A.fromUV(m, a, A.gateOpenU(門), a.half + m.t + 門.masu + m.t + 60);
  let 堀 = 0, 門前の堀 = 0, 際 = 0, 数 = 0;
  let p0 = { x: sp.x, y: sp.y };
  for (const p of 道) {
    const n = Math.max(1, Math.ceil(Math.hypot(p.x - p0.x, p.y - p0.y) / 5));
    for (let k = 1; k <= n; k++) {
      const x = p0.x + (p.x - p0.x) * k / n, y = p0.y + (p.y - p0.y) * k / n;
      const t = A.terrainAt(x, y);
      数++;
      const 門の前 = Math.hypot(x - 橋.x, y - 橋.y) < 260;
      if (t === 'moat' || t === 'karabori') { 堀++; if (門の前) 門前の堀++; }
      if (!門の前 && 塀ぎわ(x, y)) 際++;
    }
    p0 = p;
  }
  確(`${名}：南の陣から搦手門への道は、堀を渡るのが門の前だけ`, 堀 === 門前の堀, `堀の歩み ${堀 * 5}歩（門の前で${門前の堀 * 5}歩）`);
  確(`${名}：門の前のほかは、塀に接する所をほとんど通らない`, 際 / 数 < 0.03, `塀ぎわ ${(際 / 数 * 100).toFixed(1)}％`);
}

console.log('■ 二、この門へ');
{
  const 計 = [];
  for (const 城id of ['kawagoe', 'kiyosu']) {
    for (const key of ['惣構大手門', '惣構東脇門', '惣構搦手門']) {
      const m = 盤(城id);
      const 門 = 外の門(m, key);
      if (!門) continue;
      const { b, atk } = 戦(m, [0]);
      A.門へ向かわせる(b, atk[0], 門);
      const r = 走らせる(b, atk[0], 門, 240);
      計.push({ 城id, key, ...r });
    }
  }
  確('隊は外のどの門にも取り付く', 計.every((r) => r.取付 != null),
    計.map((r) => `${r.城id}${r.key.replace('惣構', '')}${r.取付 == null ? '★' : Math.round(r.取付) + '秒'}`).join('・'));
  確('塀ぎわを這う時は、どの門へも五秒まで', 計.every((r) => r.塀 <= 5), 計.map((r) => Math.round(r.塀)).join('・') + '秒');
  /* 三隊を川越城の搦手門へ。一隊が取り付き、後の隊は門前の列に着く（控え口へは、見通せなければ道を
     引く）。取り付く隊は疲れれば入れ替わり、退いた隊は列へ戻る。門が破れると次の門へ進んでしまうので、
     ここでは門を破れなくしておく。枡形の口が狭かったころは、入れ替わりで枡形の中に残った隊が
     控え口への道を引けず、門の前で塀に押しつけられていた（三隊で五十八から八十四秒） */
  const m = 盤('kawagoe');
  const 門 = 外の門(m, '惣構搦手門');
  門.hp = 門.max = 1e9;
  const { b, atk } = 戦(m, [0, 3, 6]);
  for (const c of atk) A.門へ向かわせる(b, c, 門);
  const 着 = new Map(), 塀 = new Map();
  for (let st = 0; st * 0.05 < 220; st++) {
    A.stepBattle(b, 0.05);
    for (const c of atk) {
      if (!着.has(c.id) && (門.slot === c.id || (c.gate待ち || 0) > 0)) 着.set(c.id, b.t);
      if (門.slot !== c.id && 塀ぎわの割(c) > 0.3) 塀.set(c.id, (塀.get(c.id) || 0) + 0.05);
    }
  }
  確('三隊を一つの門へ向ければ、一隊が取り付き、後の隊は門前の列に着く', !!門.slot && 着.size === 3,
    `取付 ${門.slot || 'なし'}・着いた刻 ${atk.map((c) => (着.has(c.id) ? Math.round(着.get(c.id)) + '秒' : '着かず')).join('/')}`);
  確('取り付いていない隊は、入れ替わりのあいだも塀に貼りつかない（一隊十秒まで）', atk.every((c) => (塀.get(c.id) || 0) <= 10),
    `塀ぎわ ${atk.map((c) => Math.round(塀.get(c.id) || 0)).join('/')}秒`);
  /* 枡形の中（門の前）から、堀の外の控え口まで道が引ける */
  let 引ける = 0, 数 = 0;
  for (const 城id of ['kawagoe', 'kiyosu', 'odawara']) {
    const m2 = 盤(城id);
    for (const g of m2.gates.filter((x) => x.layer === 0)) {
      const l = A.門の輪(m2, g), a = A.axisOf(l, g);
      const 内 = A.fromUV(m2, a, g.off, a.half + m2.t + g.masu / 2);
      const 控 = A.門の控え口(m2, l, g, 1);
      数++;
      const p = A.navPath(m2, 内.x, 内.y, 控.x, 控.y);
      if (p && p.length) 引ける++;
    }
  }
  確('枡形の中（門の前）から、堀の外の控え口まで道が引ける（どの外の門も）', 引ける === 数, `${引ける}／${数}門`);
  const g0 = 外の門(盤('kawagoe'), '惣構搦手門');
  const [c0, c1] = A.枡形の切れ目(g0);
  const gL = g0.off - g0.w / 2, gR = g0.off + g0.w / 2;
  const 口 = g0.open > 0 ? gR - 5 - c0 : c1 - (gL + 5);
  確('枡形の正面の切れ目は、枡形の内へ二十歩より広く開く', 口 > 20, `${Math.round(口)}歩（門の幅${Math.round(g0.w)}歩）`);
}

console.log('■ 三、門を押す');
{
  const m = 盤('kiyosu');
  const 搦 = 外の門(m, '惣構搦手門');
  const l = A.門の輪(m, 搦), a = A.axisOf(l, 搦);
  const gp = A.gatePos(m, l, 搦);
  const 口 = A.fromUV(m, a, A.gateOpenU(搦), a.half + m.t + 搦.masu + m.t);
  const 幅 = 60 * A.fieldScale();
  確('門（塀の線）を押せば、その門', A.押した門(m, gp.x, gp.y, 幅) === 搦);
  確('枡形の外の開き口を押しても、その門', A.押した門(m, 口.x, 口.y, 幅) === 搦);
  const 遠 = A.fromUV(m, a, 搦.off, a.half + m.t + 搦.masu + 500);
  確('門から遠い所を押しても、門とは見なさない', A.押した門(m, 遠.x, 遠.y, 幅) == null);
  const { b, atk } = 戦(m, [0]);
  const 押 = A.押した門(m, gp.x, gp.y, 幅);
  A.門へ向かわせる(b, atk[0], 押);
  const r = 走らせる(b, atk[0], 搦, 240);
  確('南の陣から北の搦手門を押せば、取り付く（もとは城の南の塀に当たって止まった）', r.取付 != null && r.塀 <= 5,
    `${r.取付 == null ? '取り付かず' : Math.round(r.取付) + '秒'}・塀ぎわ ${Math.round(r.塀)}秒`);
}

console.log('■ 四、城の中を動かす');
{
  const m = 盤('kiyosu');
  const 搦 = 外の門(m, '惣構搦手門');
  const l = A.門の輪(m, 搦), a = A.axisOf(l, 搦);
  /* 城の北、堀の外の所（南の陣からは城を挟んだ向こう） */
  const 的 = A.fromUV(m, a, 搦.off + 260, a.half + m.t + 搦.masu + m.t + m.moat.band + 140);
  const { b, atk } = 戦(m, [0]);
  const c = atk[0];
  確('試しの場（城を挟んで見通せない）', !A.見通せる(c.x, c.y, 的.x, 的.y) && A.passable(的.x, 的.y));
  A.城の中を動かす(b, c, 的.x, 的.y);
  確('塀の向こうを押せば、塀を回り込む道を引く', !!(c.wp && c.wp.length > 1) && c.order === '移動', `道の節 ${(c.wp || []).length}`);
  let 着 = null, 塀 = 0;
  for (let st = 0; st * 0.05 < 260; st++) {
    A.stepBattle(b, 0.05);
    if (塀ぎわの割(c) > 0.3) 塀 += 0.05;
    if (着 == null && Math.hypot(c.mx - 的.x, c.my - 的.y) < 120) { 着 = b.t; break; }
  }
  確('回り込んで着く（塀ぎわは五秒まで）', 着 != null && 塀 <= 5, `${着 == null ? '着かず' : Math.round(着) + '秒'}・塀ぎわ ${Math.round(塀)}秒`);
  const m2 = 盤('kiyosu');
  const { b: b2, atk: atk2 } = 戦(m2, [0]);
  const c2 = atk2[0];
  const 前 = { x: c2.x + 300, y: c2.y - 200 };
  A.城の中を動かす(b2, c2, 前.x, 前.y);
  確('見通せる所へは、道を引かずにまっすぐ向かう', !c2.wp && Math.abs(c2.tx - 前.x) < 1e-6 && Math.abs(c2.ty - 前.y) < 1e-6);
}

console.log('■ 五、速さ');
{
  const m = 盤('odawara');
  const 点 = [];
  while (点.length < 200) {
    const x = m.域.x + (Math.random() * 2 - 1) * m.域.r * 0.95, y = m.域.y + (Math.random() * 2 - 1) * m.域.r * 0.95;
    if (A.passable(x, y)) 点.push({ x, y });
  }
  A.navPath(m, 点[0].x, 点[0].y, 点[1].x, 点[1].y);   // 格子を張る
  const t0 = process.hrtime.bigint();
  let 見つけた = 0;
  for (let i = 0; i < 100; i++) { const p = A.navPath(m, 点[i * 2].x, 点[i * 2].y, 点[i * 2 + 1].x, 点[i * 2 + 1].y); if (p && p.length) 見つけた++; }
  const 秒 = Number(process.hrtime.bigint() - t0) / 1e9;
  確('城山の中の百本の道を、三秒の内に引ける', 秒 < 3, `${秒.toFixed(2)}秒・引けた道 ${見つけた}本`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
