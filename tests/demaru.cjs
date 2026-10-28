/* 出城の試験（GDD 9.3）。

   遊ぶ側の申し出は「付城などは面白い（例えば、真田丸的なものができるとも思います）。
   大阪の冬の陣のように野戦で負けても真田丸を中心に戦って撃退することも考えられる」
   であった。出城は、大手の堀の外に築く小さな曲輪である（castleMap.js 出城を組む）。
   確かめること。
     一、形     … 広い盤にだけ立ち、城山の内（継ぎ目より内）に収まる。城の堀とは重ならない
     二、地     … 内は出城の地、塀・門・空堀・土橋・背の口がそれぞれの地になる
     三、道     … 南の野から出城の門まで道が引け、出城から大手門の前まで引き取る道が引ける
     四、持ち場 … 城方の持ち場に出城の門が入り、割り付けでは器量のいちばん高い将が預かる
                  （当主と城主は出城へ出ず、本城の門を受け持つ）
     五、戦     … 寄せ手の三分の一が出城に当たり、出城の門を叩く。出城は寄せ手を射て削る。
                  落ちれば城方は気を落とし、守り手は大手門の内へ引き取る
     六、効き   … 同じ戦を出城の有無で比べると、出城のある城のほうが寄せ手の損が重い */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'demaru-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { buildCastleMap, layoutCastleField, setBattleMap, axisOf, fromUV, gateOpenU, 寄せ手の陣, 城の域か, buildNav, navPath, routeToCastleGate, 出城の退き道, 出城の内か, 出城が保つ, 門の輪, castleTerrainAt } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen, corpsMax } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle, stepBattle, 夜を明かす } from "../src/battle/engine.js";\n'
+ 'export { FIELD, terrainAt, passable, passableFor, fieldScale, setFieldKind } from "../src/battle/field.js";\n'
+ 'export { 持ち場を並べる } from "../src/battle/defense.js";\n'
+ 'export { 守りの割り付け, 門の重み } from "../src/core/garrison.js";\n');
const out = path.join(ROOT, 'build', 'demaru.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

// 賽の目を固定する
let 種 = 0x5eed;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const 将 = (i, 器 = 60) => ({ id: `g${i}`, name: `将${i}`, lead: 器 + 2, valor: 器, wit: 58, gov: 55,
  retinue: 500, retTrain: 70, unity: 60 });

/* 構えを散らした八城（tests/hiroi_kojo と同じ）。種は野の形を散らす */
const 城々 = [
  ['koriyama_a', '吉田郡山城', 72], ['odani', '小谷城', 70], ['kiyosu', '清洲城', 55], ['oka', '岡城', 62],
  ['zz1', '千鳥城', 44], ['zz2', '鷹巣ヶ城', 66], ['zz3', '芦田館', 38], ['zz4', '高森城', 58],
];
const 種ら = [0x9e3779b1, 0x2545f491, 0xdeadbeef, 0x51ed270b, 0x7f4a7c15, 0x632be5ab, 0x94d049bb, 0x1b873593];

function 組む(id, name, def, s, { 出城 = true, 広く = true } = {}) {
  A.setFieldKind('街道');
  const castle = { id, name, def, local: 1200, localTrain: 70, najimi: 70, rost: null,
    出城: 出城 ? { 名: '出城' } : null };
  const map = A.layoutCastleField(A.buildCastleMap(castle), { 広く, 城id: id, 種: s });
  A.setBattleMap(map);
  return map;
}

/* ------------------------------------------ 一、形 */
{
  let 立つ = 0, 狭い盤 = 0, 域内 = 0, 重ならぬ = 0, 無し = 0, 矢倉 = 0;
  for (let i = 0; i < 城々.length; i++) {
    const [id, name, def] = 城々[i];
    const 狭 = 組む(id, name, def, 種ら[i], { 広く: false });
    if (!狭.出城 && !狭.fac.some((f) => f.出城)) 狭い盤++;
    const 素 = 組む(id, name, def, 種ら[i], { 出城: false });
    if (!素.出城 && !素.fac.some((f) => f.出城)) 無し++;
    const m = 組む(id, name, def, 種ら[i]);
    const 出 = m.出城;
    if (!出) continue;
    立つ++;
    const t = m.t;
    const 隅 = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => ({
      x: m.cx + 出.ox + sx * (出.hw + t + 出.堀), y: m.cy + 出.oy + sy * (出.hh + t + 出.堀) }));
    if (隅.every((p) => Math.hypot(p.x - m.域.x, p.y - m.域.y) < m.域.r * 0.88)) 域内++;
    // 城の堀の外の際（南）より、出城の空堀の外の際（北）が南にある
    const o = m.layers[0];
    const 堀外 = m.cy + o.hh + t + o.masu + t + 8 + m.moat.band;
    if (m.cy + 出.oy - 出.hh - t - 出.堀 > 堀外 + 20) 重ならぬ++;
    if (m.fac.filter((f) => f.出城).length === 2) 矢倉++;
  }
  確('出城を普請した城には、広い盤で出城が立つ', 立つ === 城々.length, `${立つ}／${城々.length}`);
  確('出城の無い城には立たない', 無し === 城々.length);
  確('狭い盤には立たない（矢倉も残さない）', 狭い盤 === 城々.length);
  確('出城は城山の内、野の道との継ぎ目より内に収まる', 域内 === 立つ, `${域内}／${立つ}`);
  確('出城の空堀は城の堀と重ならない', 重ならぬ === 立つ, `${重ならぬ}／${立つ}`);
  確('出城の前の隅に矢倉が二つ立つ', 矢倉 === 立つ);
}

/* ------------------------------------------ 二、地・三、道 */
{
  let 地よし = 0, 道よし = 0, 退きよし = 0, 外から = 0;
  const 地の咎 = [];
  for (let i = 0; i < 城々.length; i++) {
    const [id, name, def] = 城々[i];
    const m = 組む(id, name, def, 種ら[i]);
    const 出 = m.出城, t = m.t, X = m.cx + 出.ox, Y = m.cy + 出.oy, 門 = 出.gates[0];
    const 期 = [
      ['内', X, Y, 'demaru'],
      ['前の塀', X + 出.hw * 0.7, Y + 出.hh + t / 2, 'wall'],
      ['横の塀', X + 出.hw + t / 2, Y, 'wall'],
      ['背の塀', X - 出.口.off * 0.2 - (出.口.off > 0 ? 出.hw * 0.5 : -出.hw * 0.5), Y - 出.hh - t / 2, 'wall'],
      ['門', X + 門.off, Y + 出.hh + t / 2, 'gate'],
      ['背の口の木戸', X + 出.口.off, Y - 出.hh - t / 2, 'kido'],
      ['空堀', X + 出.hw * 0.7, Y + 出.hh + t + 出.堀 / 2, 'karabori'],
      ['横の空堀', X + 出.hw + t + 出.堀 / 2, Y, 'karabori'],
      ['門の前の土橋', X + 門.off, Y + 出.hh + t + 出.堀 / 2, 'bridge2'],
      ['背の口の前の土橋', X + 出.口.off, Y - 出.hh - t - 出.堀 / 2, 'bridge2'],
    ];
    const 違 = 期.filter(([, x, y, 地]) => A.terrainAt(x, y) !== 地);
    if (!違.length) 地よし++;
    else 地の咎.push(`${name}：` + 違.map(([名, x, y, 地]) => `${名}=${A.terrainAt(x, y)}（${地}のはず）`).join('、'));
    // 南の野から出城の門まで
    const sx = m.cx, sy = A.FIELD.h - 300;
    const 道 = A.routeToCastleGate(m, 門, sx, sy);
    const 末 = 道[道.length - 1];
    if (道.length >= 2 && Math.hypot(末.x - (X + 門.off), 末.y - (Y + 出.hh + t + 14)) < 4) 道よし++;
    // 城山の縁から出城の門の開き口まで、城の道（格子）で引ける
    const 縁 = { x: m.域.x, y: m.域.y + m.域.r * 0.9 };
    const 開 = { x: X + 門.off, y: Y + 出.hh + t + 出.堀 + 16 };
    const p = A.navPath(m, 縁.x, 縁.y, 開.x, 開.y);
    if (p && p.length) 外から++;
    // 出城から大手門の前まで引き取る道
    const 退 = A.出城の退き道(m);
    const 大手 = 退.門, a = A.axisOf(A.門の輪(m, 大手), 大手);
    const 門前 = A.fromUV(m, a, 大手.off, a.half + t + 14);
    const 尾 = 退.道[退.道.length - 1];
    const 塞 = 退.道.slice(0, -1).some((q) => !A.passable(q.x, q.y));
    if (大手.face === 'S' && Math.hypot(尾.x - 門前.x, 尾.y - 門前.y) < 4 && !塞 && 退.道.length >= 4) 退きよし++;
  }
  確('出城の地（内・塀・門・空堀・土橋・背の木戸）', 地よし === 城々.length, 地の咎.join(' ／ ') || `${地よし}／${城々.length}`);
  {
    const m = 組む(...城々[7], 種ら[7]);
    const 出 = m.出城, x = m.cx + 出.ox + 出.口.off, y = m.cy + 出.oy - 出.hh - m.t / 2;
    const b = { attacker: 'P', map: m };
    確('背の木戸は城方だけが通れる', A.passableFor({ side: 'E' }, b, x, y) && !A.passableFor({ side: 'P' }, b, x, y));
  }
  確('南の野から出城の門まで道が引ける', 道よし === 城々.length, `${道よし}／${城々.length}`);
  確('城山の縁から出城の門の前まで、城の格子で道が引ける', 外から === 城々.length, `${外から}／${城々.length}`);
  確('出城から大手門の前まで引き取る道が引ける（通れぬ所を通らない）', 退きよし === 城々.length, `${退きよし}／${城々.length}`);
}

/* ------------------------------------------ 四、持ち場 */
{
  const m = 組む('zz4', '高森城', 58, 種ら[7]);
  const 持 = A.持ち場を並べる(m);
  const 出の場 = 持.find((p) => p.gate && p.gate.出城);
  確('城方の持ち場に出城の門が入る', !!出の場);
  確('出城の持ち場は出城の塀の内', 出の場 && A.出城の内か(m, 出の場.x, 出の場.y) && A.terrainAt(出の場.x, 出の場.y) === 'demaru');
  const gates = [...m.出城.gates, ...m.layers.flatMap((l) => l.gates)];
  const castle = { id: 'zz4', name: '高森城', faction: 'f', local: 2400, localTrain: 70, koku: 20000, def: 58 };
  const s = { generals: [将(1, 80), 将(2, 60), 将(3, 50)].map((g) => ({ ...g, at: 'zz4', 本領: 'zz4', faction: 'f', captive: null })),
    castles: [castle], factions: { f: { name: '某家' } }, year: 1570, month: 1 };
  const 割 = A.守りの割り付け(s, castle, gates);
  const 出割 = 割.門[m.出城.gates[0].key];
  確('割り付けでは器量のいちばん高い将が出城を預かる', 出割 && 出割.genId === 'g1');
  確('出城にも兵を割く（外の輪の大手門に次ぐ厚さ）', 出割 && 出割.men > 2400 * 0.08, 出割 ? `${出割.men}人／2400人` : '');
  /* 当主と城主は出城へ出さず、本城の門を受け持つ（真田丸を預かった信繁も総大将ではない） */
  const 出鍵 = m.出城.gates[0].key;
  const 主の門 = (割x, id) => Object.keys(割x.門).find((k) => 割x.門[k].genId === id);
  const 割2 = A.守りの割り付け({ ...s, generals: s.generals.map((g) => (g.id === 'g1' ? { ...g, lord: true } : g)) }, castle, gates);
  確('当主は出城へ出ず、次に器量の高い将が出城を預かる', 割2.門[出鍵].genId === 'g2' && 主の門(割2, 'g1') && 主の門(割2, 'g1') !== 出鍵,
    `出城=${割2.門[出鍵].genId} 当主=${主の門(割2, 'g1')}`);
  const 割3 = A.守りの割り付け(s, { ...castle, lordId: 'g1' }, gates);
  確('城主も出城へ出ない', 割3.門[出鍵].genId === 'g2' && 主の門(割3, 'g1') !== 出鍵);
  const 割4 = A.守りの割り付け({ ...s, generals: [{ ...s.generals[0], lord: true }] }, castle, gates);
  確('当主しかいなければ出城は守備隊が守り、当主は本城の門に就く', 割4.門[出鍵].genId === null && !!主の門(割4, 'g1'));
}

/* ------------------------------------------ 五・六、戦

   刻みは画面と同じ〇.〇三秒とする（BattleScreen の一コマは〇.〇五秒を上限に、〇.六倍を
   一歩の上限として割って踏む）。〇.二五秒で刻むと、組の一歩が二十歩を超えて厚さ十歩の
   塀を飛び越え、門の閉じた出城へ寄せ手が入り込んだ。〇.〇五秒でも、尺の大きな城では
   一歩が十一歩になって塀を越えた。城方の割り付けは采配の案（core/garrison.js 守りの割り付け）による。
   出城があれば、器量のいちばん高い将が出城を預かる（ここの将はみな当主でも城主でもない） */
function 攻める(i, 賽, 出城あり) {
  種 = 賽;
  const [id, name, def] = 城々[i];
  const m = 組む(id, name, def, 種ら[i], { 出城: 出城あり });
  const n = 6;
  const atk = [...Array(n).keys()].map((k) => {
    const sp = A.寄せ手の陣(m, k, n);
    const c = A.makeCorps('P', 将(k), 500, 1500, 75, 75, sp.x, sp.y, sp.f, '#2F5D8C');
    c.formation = '方陣'; A.placeSquads(c, true); c.auto = true;
    return c;
  });
  const 持 = A.持ち場を並べる(m);
  const 場の門 = 持.filter((p) => p.gate);
  const gates = 場の門.map((p) => p.gate);
  const 城 = { id, name, faction: 'f', local: 2600, localTrain: 70, koku: 20000, def };
  const 将ら = [将(100, 76), 将(101, 66), 将(102, 60), 将(103, 56)].map((g) => ({ ...g, at: id, 本領: id, faction: 'f', captive: null }));
  const 割 = A.守りの割り付け({ generals: 将ら, castles: [城], factions: { f: { name: '某家' } }, year: 1570, month: 1 }, 城, gates);
  const def2 = [];
  for (const p of 場の門) {
    const 決 = 割.門[p.gate.key] || {};
    const gen = 決.genId ? 将ら.find((x) => x.id === 決.genId) : null;
    const 兵 = Math.max(0, Math.round(決.men || 0));
    if (!gen && 兵 < 40) continue;
    const c = A.makeCorps('E', gen || { id: `gar-${p.gate.key}`, name: '守備隊', lead: 50, valor: 30, wit: 28, gov: 30, retinue: 0, retTrain: 58, unity: 45 },
      gen ? gen.retinue : 0, 兵, 72, 72, p.x, p.y, p.f, '#B0483C');
    c.holdGate = p.gate; if (!gen) c.守備隊 = true;
    def2.push(c);
  }
  const b = A.createBattle(atk, def2, 'P');
  b.mode = 'castle'; b.map = m; b.phase = 'fight';
  b.dusk = Math.round(1080 * Math.max(1, Math.min(3.2, Math.pow(m.旧.w / 1600, 0.62))))
    + Math.round((A.FIELD.h - m.cy) / (34 * A.fieldScale()) * 2.2);
  const 初寄 = atk.reduce((a, c) => a + A.corpsMen(c), 0);
  let 当たる = 0, 叩いた = false, 落ちた = null, 塀の中 = 0, 刻数 = 0, 入り込み = 0;
  const 出門 = m.出城 ? m.出城.gates[0] : null;
  for (let k = 0; k < 200000; k++) {
    A.stepBattle(b, 0.03);
    if (k % 8 === 0) A.battleAI(b);
    if (m.出城) {
      当たる = Math.max(当たる, atk.filter((c) => c.出城攻め).length);
      if (出門.hp < 出門.max * 0.98) 叩いた = true;
      if (落ちた === null && m.出城.落ちた) 落ちた = b.t;
      // 門の閉じた出城の中に寄せ手の組がいないか（塀をすり抜けていないか）
      if (k % 33 === 0 && !出門.broken && !m.出城.落ちた) {
        for (const c of atk) for (const q of c.squads) if (q.men > 0 && A.出城の内か(m, q.x, q.y, -14)) 入り込み++;
      }
    }
    if (k % 333 === 0) {
      for (const c of b.corps) {
        if (c.dead || c.destroyed) continue;
        刻数++;
        if (!A.passable(c.x, c.y)) 塀の中++;
      }
    }
    if (b.result || b.t > b.dusk) break;
  }
  const 残寄 = atk.reduce((a, c) => a + A.corpsMen(c), 0);
  return { 名: name, 構: m.構, 出城あり, 当たる, 叩いた, 落ちた, 入り込み,
    引き取った: b.log.some((l) => /内へ引き取った/.test(l.text)),
    寄せ手の損: Math.round(初寄 - 残寄), 落城: b.result === 'P' || !!b.captured, 破: m.gates.filter((g) => g.broken).length,
    塀割: 刻数 ? 塀の中 / 刻数 : 0, 刻: b.t, 日暮: b.dusk, log: b.log };
}
{
  const 有 = [], 無 = [];
  for (let i = 0; i < 城々.length; i++) {
    有.push(攻める(i, 0x4321 + i * 11, true));
    無.push(攻める(i, 0x4321 + i * 11, false));
  }
  for (let i = 0; i < 有.length; i++) {
    const a = 有[i], z = 無[i];
    console.log(`    ${a.名}（${a.構}）　出城あり：寄せ手の損 ${a.寄せ手の損}人・城の門 ${a.破}破・${a.落城 ? `${Math.round(a.刻)}秒で落城` : '持ちこたえた'}`
      + `・出城 ${a.落ちた == null ? '保った' : `${Math.round(a.落ちた)}秒で落ちた`}${a.引き取った ? '（守り手は引き取った）' : ''}`
      + `　／　出城なし：寄せ手の損 ${z.寄せ手の損}人・城の門 ${z.破}破・${z.落城 ? `${Math.round(z.刻)}秒で落城` : '持ちこたえた'}`);
  }
  確('寄せ手の三分の一（六隊なら二隊）が出城に当たる', 有.every((r) => r.当たる >= 2), 有.map((r) => r.当たる).join('・'));
  確('寄せ手は出城の門を叩く', 有.filter((r) => r.叩いた).length >= 有.length * 0.75, `${有.filter((r) => r.叩いた).length}／${有.length}`);
  確('門の閉じた出城に寄せ手の組が入り込まない', 有.every((r) => r.入り込み === 0), 有.map((r) => r.入り込み).join('・'));
  const 落 = 有.filter((r) => r.落ちた != null);
  確('出城が落ちれば、それを戦の記に残す', 落.every((r) => r.log.some((l) => /出城が落ちた/.test(l.text))));
  確('落ちた出城の守り手は大手門の内へ引き取るか、討たれる', 落.every((r) => r.引き取った || r.log.some((l) => /壊滅|落ちていった|戦場を退いた/.test(l.text))),
    `落ちた ${落.length} 戦のうち 引き取った ${落.filter((r) => r.引き取った).length}`);
  const 損有 = 有.reduce((a, r) => a + r.寄せ手の損, 0), 損無 = 無.reduce((a, r) => a + r.寄せ手の損, 0);
  確('出城のある城のほうが、寄せ手の損が重い', 損有 > 損無 * 1.1, `出城あり ${損有}人／なし ${損無}人（${(損有 / Math.max(1, 損無)).toFixed(2)}倍）`);
  const 落城有 = 有.filter((r) => r.落城).length, 落城無 = 無.filter((r) => r.落城).length;
  確('出城のある城のほうが落ちにくい（落城の数が多くならない）', 落城有 <= 落城無, `出城あり ${落城有}／なし ${落城無}`);
  const 刻有 = 有.filter((r, i) => r.落城 && 無[i].落城).reduce((a, r) => a + r.刻, 0);
  const 刻無 = 無.filter((r, i) => r.落城 && 有[i].落城).reduce((a, r) => a + r.刻, 0);
  確('どちらでも落ちた城では、出城のある城のほうが長く保つ', 刻有 >= 刻無 * 0.98, `出城あり ${Math.round(刻有)}秒／なし ${Math.round(刻無)}秒`);
  const 塀 = Math.max(...有.map((r) => r.塀割));
  確('隊が塀や門の中に埋まらない', 塀 < 0.01, `いちばん多い戦で ${(塀 * 100).toFixed(2)}％`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
