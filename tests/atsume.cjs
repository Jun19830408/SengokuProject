/* 攻められる城へ采配が後詰を集める（govern/month.js 城を救う援軍を出す・core/engun.js 城方の後詰ら・
   govern/war.js resolveOffscreen・battle/castleMap.js 前構えの所・battle/ai.js 前に構える）。

   遊ぶ側の申し出は「政務フェーズで、例えばプレイヤーが2万人の兵である城を攻めた場合、敵側もできるだけ
   兵数を集めて戦うようにする。…間に合わなくても第二陣として戦うかどうか選択できればいいと思います。…
   援軍（特に自軍からの援軍）を活用するようにしてください」、そして「援軍がいる場合で城攻めとなったら、
   その援軍は城攻めにも参加し、城の外で相手を待ち構えるような布陣（城の前面等で布陣して城攻めを防ぐ）」
   であった。ここで確かめること。
     一、政務     … 敵の軍が向かう城へ、ほかの自家の城から後詰を出す。間に合う城からは一陣、間に合わない
                     城からは、揃えば寄せ手の八割に届くときだけ二陣を一手で出す。城下で張り合えないほどの
                     大軍なら一陣は出さない。当主は出さず、将を一人は残し、守りの最低を割らない。狙われて
                     いる城からは出さない。同じ城へ重ねて出さない
     二、盤の外   … 城の下に陣を張る後詰は、城の兵と並んで城下の野戦に立つ（勝ちやすくなる）。損は後詰の
                     軍から引かれ、城の兵には紛れない。勝てば城の下に陣を張ったまま残る
     三、城攻めの盤 … 城の前に構える所は、寄せ手の来る側の外の門の前（塀の外・堀や川の上ではない）。構えた
                     後詰は縄の内に入った寄せ手に当たり、縄の外の寄せ手は追わずに持ち場を保つ。夜には持ち場へ
                     戻る
     四、月送り   … 遊ぶ側の軍が他家の城へ向かえば、その月のうちに後詰が発ち、物見の報せが立つ。後詰は
                     敵より先に着いて城の下に陣を張り、城下の野戦に加わる */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const ROOT = path.join(__dirname, '..');
const H = require(path.join(ROOT, 'build', 'harness.cjs'));
const 巡検 = require(path.join(ROOT, 'tools', 'junken.cjs'));
const { initState } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 将ら = (s, x) => s.generals.filter((q) => q.at === x.id && q.faction === x.faction && !q.captive);
const 城兵 = (s, x) => x.local + 将ら(s, x).reduce((t, q) => t + (q.retinue || 0), 0);

/* 場を探す。他家の城 的 と、遊ぶ側の城から 的 への道（月数 敵月）、的 の家の城のうち 的 へ 近月 か月で
   着ける城（将が二人以上） */
function 場を探す(s, { 敵月 = 2, 近月 = 1, 遠月 = null } = {}) {
  for (const 的 of s.castles) {
    const fid = 的.faction;
    if (!fid || fid === s.player || fid.startsWith('_')) continue;
    const 我 = s.castles.filter((x) => x.faction === fid && x.id !== 的.id && 将ら(s, x).length >= 2);
    const 月 = (x) => { const p = H.軍の道(s, fid, x.id, 的.id); return p && p.length >= 2 ? H.marchMonthsOf(p, fid) : null; };
    const 近 = 我.filter((x) => 月(x) != null && 月(x) <= 近月);
    const 遠 = 遠月 ? 我.filter((x) => 月(x) != null && 月(x) > 近月 && 月(x) <= 遠月) : [];
    if (!近.length || (遠月 && 遠.length < 2)) continue;
    for (const 自 of s.castles.filter((x) => x.faction === s.player && 将ら(s, x).some((q) => !q.lord))) {
      const 道 = H.軍の道(s, s.player, 自.id, 的.id);
      if (!道 || 道.length < 2 || 道.length > 4 || H.marchMonthsOf(道, s.player) !== 敵月) continue;
      return { 的, fid, 自, 道, 近, 遠 };
    }
  }
  return null;
}
/* 遊ぶ側の城から、将を一人つけて敵の軍を向ける（将のいない軍は月送りで解かれる） */
const 敵を向ける = (s, 場, 兵, id = 'enemy1') => {
  const 将 = 将ら(s, 場.自).filter((q) => !q.lord).sort((p, q) => q.lead - p.lead)[0];
  if (将) 将.at = null;
  const a = { id, faction: s.player, from: 場.自.id, gens: 将 ? [将.id] : [], local: 兵, localTrain: 70, rost: null,
    men: 兵 + (将 ? 将.retinue : 0), at: 場.道[0], path: [...場.道], prog: 0, food: 99999, target: 場.的.id };
  s.armies.push(a);
  return a;
};

console.log('■ 一、政務');
{
  巡検.賽を据える(0x61000);
  const s = initState('oda');
  const 場 = 場を探す(s, { 敵月: 1, 近月: 1 });
  確('試しの場（遊ぶ側の城から一月で着く他家の城と、同じ月に着ける同じ家の城）', !!場,
    場 ? `${場.的.name}（${s.factions[場.fid].name}）・近くの城${場.近.length}` : '');
  if (場) {
    const 前 = new Map(s.castles.filter((x) => x.faction === 場.fid).map((x) => [x.id, { 兵: 城兵(s, x), 将: 将ら(s, x).length }]));
    const 守 = 城兵(s, 場.的);
    敵を向ける(s, 場, Math.round(守 * 2.2));
    const 出 = H.城を救う援軍を出す(s, 場.fid);
    確('敵の軍が向かう城へ、ほかの自家の城から後詰を出す', 出.length > 0 && 出.every((r) => r.軍.relief === 場.的.id && r.軍.target === 場.的.id && r.軍.faction === 場.fid),
      出.map((r) => `${s.castles.find((x) => x.id === r.軍.from).name}${r.軍.men}人（${r.陣}）`).join('・'));
    確('一陣は敵より先か同じ月に着く', 出.filter((r) => r.陣 === '一陣').every((r) => H.marchMonthsOf(r.軍.path, 場.fid) <= 1));
    const 軍の将 = 出.flatMap((r) => r.軍.gens).map((id) => s.generals.find((x) => x.id === id));
    確('当主は後詰に出さない', 軍の将.every((x) => x && !x.lord));
    const 発った城 = new Set(出.flatMap((r) => [r.軍.from, ...((r.軍.出どころ || []).map((q) => q.from))]));
    /* 守りの最低は、城に残る兵（地の兵と、残った将の手勢）で見る（近隣から兵を寄せる と同じ物差し） */
    確('出した城は守りの最低を割らず、将を一人は残す', [...発った城].every((id) => {
      const x = s.castles.find((y) => y.id === id);
      return 城兵(s, x) >= Math.min(前.get(id).兵, H.minGarrison(x)) && 将ら(s, x).length >= 1;
    }), [...発った城].map((id) => { const x = s.castles.find((y) => y.id === id); return `${x.name} 兵${城兵(s, x)}/最低${H.minGarrison(x)}・将${将ら(s, x).length}`; }).join('・'));
    const 二度 = H.城を救う援軍を出す(s, 場.fid);
    確('同じ城へ重ねて出さない（出した月から二月）', 二度.length === 0);
  }
}
{
  巡検.賽を据える(0x61001);
  const s = initState('oda');
  const 場 = 場を探す(s, { 敵月: 1, 近月: 1 });
  if (場) {
    敵を向ける(s, 場, 90000);
    const 出 = H.城を救う援軍を出す(s, 場.fid);
    確('城下で張り合えないほどの大軍なら、一陣は出さない（揃わなければ二陣も見送る）', !出.some((r) => r.陣 === '一陣'),
      出.length ? 出.map((r) => `${r.陣}${r.軍.men}人`).join('・') : '出さない');
  }
}
{
  巡検.賽を据える(0x61002);
  const s = initState('oda');
  const 場 = 場を探す(s, { 敵月: 1, 近月: 1, 遠月: 4 });
  確('二陣の試しの場（一月で敵が着く城と、二〜四月かかる同じ家の城が二つ以上）', !!場, 場 ? `${場.的.name}・遠い城${場.遠.length}` : '');
  if (場) {
    /* 間に合う城（一月で着く城）の兵は空にして一陣を出せなくし、遠い城には兵を厚くしておく */
    for (const x of s.castles.filter((y) => y.faction === 場.fid && y.id !== 場.的.id)) {
      const p = H.軍の道(s, 場.fid, x.id, 場.的.id);
      if (!p || p.length < 2 || H.marchMonthsOf(p, 場.fid) > 1) continue;
      x.local = H.minGarrison(x);
      for (const q of 将ら(s, x)) q.retinue = 0;
    }
    for (const x of 場.遠) x.local = H.minGarrison(x) + 6000;
    const 守 = 城兵(s, 場.的);
    const 敵 = 敵を向ける(s, 場, Math.round(守 * 3));
    const 出 = H.城を救う援軍を出す(s, 場.fid);
    const 二 = 出.filter((r) => r.陣 === '二陣');
    確('間に合わなくても、揃えば寄せ手の八割に届くなら二陣を一手で出す', 二.length === 1 && !出.some((r) => r.陣 === '一陣'),
      出.map((r) => `${r.陣}${r.軍.men}人${r.寄.length ? `（${r.寄.length}城より寄せ）` : ''}`).join('・') || '出さない');
    確('二陣は敵より遅れて着く', 二.every((r) => H.marchMonthsOf(r.軍.path, 場.fid) > 1));
    void 敵;
  }
}
{
  巡検.賽を据える(0x61003);
  const s = initState('oda');
  const 場 = 場を探す(s, { 敵月: 1, 近月: 1 });
  if (場) {
    /* 近くの城そのものにも敵を向けておくと、そこからは出さない */
    const 狙われ = 場.近[0];
    const 守 = 城兵(s, 場.的);
    敵を向ける(s, 場, Math.round(守 * 2.2));
    const 道2 = H.findPath(場.自.id, 狙われ.id);
    if (道2 && 道2.length >= 2) {
      s.armies.push({ id: 'enemy2', faction: s.player, from: 場.自.id, gens: ['nobody'], local: 3000, localTrain: 70, rost: null, men: 3000,
        at: 道2[0], path: [...道2], prog: 0, food: 99999, target: 狙われ.id });
      const 出 = H.城を救う援軍を出す(s, 場.fid);
      確('自らも敵に狙われている城からは後詰を出さない', !出.some((r) => r.軍.from === 狙われ.id || (r.軍.出どころ || []).some((q) => q.from === 狙われ.id)),
        `${狙われ.name}は狙われている`);
    }
  }
}

console.log('■ 二、盤の外');
{
  /* 城の下に陣を張る後詰が城の兵と並んで戦う。後詰の有無で、城方の勝ちの数を比べる */
  const 一戦 = (種, 後詰あり) => {
    巡検.賽を据える(0x62000 + 種);
    const s = initState('oda');
    const 場 = 場を探す(s, { 敵月: 1, 近月: 2 });
    if (!場) return null;
    const 守 = 城兵(s, 場.的);
    const 敵 = { id: 'enemy1', faction: s.player, from: 場.自.id, gens: [], local: Math.round(守 * 2.5), localTrain: 70, rost: null,
      men: Math.round(守 * 2.5), at: 場.的.id, path: [場.的.id], prog: 0, food: 99999, target: 場.的.id };
    s.armies.push(敵);
    let 後 = null;
    if (後詰あり) {
      const 源 = 場.近[0];
      const 将 = 将ら(s, 源).filter((q) => !q.lord)[0];
      if (将) 将.at = null;
      後 = { id: 'relief1', faction: 場.fid, from: 源.id, gens: 将 ? [将.id] : [], local: Math.round(守 * 1.6), localTrain: 70, rost: null,
        men: Math.round(守 * 1.6) + (将 ? 将.retinue : 0), at: 場.的.id, path: [場.的.id], prog: 0, food: 9999,
        target: null, relief: 場.的.id, 在陣: 場.的.id };
      s.armies.push(後);
    }
    s.pendingArrivals = ['enemy1'];
    const 城兵前 = 場.的.local;
    const t = H.resolveOffscreen(s, 'enemy1', 場.的.id);
    const 城 = t.castles.find((x) => x.id === 場.的.id);
    const 後t = 後 && t.armies.find((x) => x.id === 'relief1');
    return { 守り勝ち: 城.faction === 場.fid && !t.sieges.some((x) => x.castleId === 城.id), 城兵前, 城兵後: 城.local,
      後詰前: 後 ? 後.men : 0, 後詰後: 後t ? 後t.men : 0, 在陣: 後t ? 後t.在陣 === 城.id : false, 後詰が残る: !!後t,
      記: (t.chronicle || []).slice(-6).map((x) => x.text).join(' ') };
  };
  const 有 = [], 無 = [];
  for (let k = 0; k < 16; k++) { const a = 一戦(k, true), b2 = 一戦(k, false); if (a) 有.push(a); if (b2) 無.push(b2); }
  const 勝有 = 有.filter((r) => r.守り勝ち).length, 勝無 = 無.filter((r) => r.守り勝ち).length;
  確('城の下に陣を張る後詰がいれば、城下の野戦で城方が勝ちやすい', 勝有 > 勝無, `後詰あり ${勝有}/${有.length}・なし ${勝無}/${無.length}`);
  確('後詰は損を負う（後詰の軍から引かれる）', 有.every((r) => !r.後詰が残る || r.後詰後 < r.後詰前), 有.slice(0, 3).map((r) => `${r.後詰前}→${r.後詰後}`).join('・'));
  確('後詰の兵は城の兵に紛れない', 有.every((r) => r.城兵後 <= r.城兵前), 有.slice(0, 3).map((r) => `${r.城兵前}→${r.城兵後}`).join('・'));
  const 勝った = 有.filter((r) => r.守り勝ち);
  確('城方が勝てば、後詰は城の下に陣を張ったまま残る', 勝った.length > 0 && 勝った.every((r) => r.在陣), `${勝った.length}戦`);
  確('戦の記に後詰が加わったことが残る', 有.some((r) => /後詰.*加わった/.test(r.記)));
}

console.log('■ 三、城攻めの盤');
{
  const entry = path.join(ROOT, 'build', 'atsume-entry.js');
  fs.writeFileSync(entry,
    'export { buildCastleMap, layoutCastleField, setBattleMap, 寄せ手の陣, gatePos, inLayer, 前構えの所 } from "../src/battle/castleMap.js";\n'
  + 'export { makeCorps, placeSquads, corpsMen } from "../src/battle/corps.js";\n'
  + 'export { createBattle, stepBattle, 夜を明かす } from "../src/battle/engine.js";\n'
  + 'export { 前構えの縄 } from "../src/battle/ai.js";\n'
  + 'export { FIELD, fieldScale, setFieldKind, passable, terrainAt } from "../src/battle/field.js";\n');
  const out = path.join(ROOT, 'build', 'atsume-ban.cjs');
  esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error' });
  const B = require(out);
  巡検.賽を据える(0x63000);
  B.setFieldKind('街道');
  const m = B.layoutCastleField(B.buildCastleMap({ id: 'kiyosu', name: '清洲城', def: 54, local: 1200, localTrain: 70, najimi: 70, rost: null }),
    { 広く: true, 城id: 'kiyosu', 種: 0xdeadbeef });
  B.setBattleMap(m);
  const 尺 = B.fieldScale();
  const 所 = [0, 1, 2, 3].map((i) => B.前構えの所(m, i, 4));
  const 南の門 = m.layers[0].gates.map((g) => B.gatePos(m, m.layers[0], g)).sort((a, b) => b.y - a.y).slice(0, 2);
  確('城の前に構える所は外の塀の外で、はじめの隊は寄せ手の来る側（城の南）に構える', 所.every((p) => !B.inLayer(m, m.layers[0], p.x, p.y)) && 所[0].y > m.cy,
    所.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(' '));
  確('構える所は、南に近い外の門二つの前（門から七百歩の内）', 所.every((p) => 南の門.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 700 * 尺)));
  確('堀・川・森・村の上には構えない', 所.every((p) => B.passable(p.x, p.y) && !['moat', 'karabori', 'deep', 'ford', 'forest', 'village', 'wood'].includes(B.terrainAt(p.x, p.y))),
    所.map((p) => B.terrainAt(p.x, p.y)).join('・'));
  確('同じ門の前の隊は重ならない', 所.every((p, i) => 所.every((q, j) => i === j || Math.hypot(p.x - q.x, p.y - q.y) > 80 * 尺)));
  /* 構えた後詰と、縄の内・外の寄せ手 */
  const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 64, valor: 62, wit: 58, gov: 55, retinue: 300, retTrain: 70, unity: 60 });
  const 試す = (隔) => {
    B.setBattleMap(m);
    const p = 所[0];
    const 後 = B.makeCorps('E', 将(1), 300, 1500, 75, 75, p.x, p.y, p.f, '#B0483C');
    後.後詰 = { 軍: 'r1', 外: { x: p.x < m.cx ? -1 : 1, y: 0 } }; 後.前構え = { x: p.x, y: p.y }; 後.auto = true;
    const 城 = B.makeCorps('E', 将(2), 30, 0, 60, 60, m.cx, m.cy, 0, '#B0483C'); 城.auto = false; 城.order = '待機';
    const 寄 = B.makeCorps('P', 将(3), 300, 1500, 75, 75, p.x, p.y + 隔 * 尺, -Math.PI / 2, '#2F5D8C');
    寄.auto = false; 寄.order = '待機';
    for (const c of [後, 城, 寄]) B.placeSquads(c, true);
    const b = B.createBattle([寄], [後, 城], 'P');
    b.mode = 'castle'; b.map = m; b.phase = 'fight'; b.日数 = 3; b.日 = 1; b.日の始め = 0; b.dusk = 99999; b.日の長さ = 99999; b.鼓舞なし = true;
    b.後詰 = [{ 軍: 'r1', 家: '試し', 将: '将1', 側: 'E', corps: [後], 入った: true, 入った刻: 0, 呼応した: true, 前構え: true }];
    for (const f of m.fac) if (f.kind === '矢倉') f.hp = 0;
    let 当たった = false;
    for (let t = 0; t < 12; t += 0.05) { B.stepBattle(b, 0.05); if (後.order === '接戦' && 後.target === 寄.id) 当たった = true; }
    return { 当たった, 持ち場から: Math.hypot(後.x - p.x, 後.y - p.y), b, 後, p };
  };
  const 内 = 試す(B.前構えの縄 * 0.7);
  確('縄の内に入った寄せ手には当たる', 内.当たった);
  const 外 = 試す(B.前構えの縄 * 1.6);
  確('縄の外の寄せ手は追わず、持ち場を保つ', !外.当たった && 外.持ち場から < 80 * 尺, `持ち場から ${Math.round(外.持ち場から)}歩`);
  /* 大軍に押されて退く後詰。退いた隊に采配が接戦を命じ直すと、退いては戻って「戦場を退いた」の報せが重なった */
  {
    B.setBattleMap(m);
    const p = 所[0];
    const 後 = B.makeCorps('E', 将(5), 100, 300, 70, 70, p.x, p.y, p.f, '#B0483C');
    後.後詰 = { 軍: 'r2', 外: { x: p.x < m.cx ? -1 : 1, y: 0 } }; 後.前構え = { x: p.x, y: p.y }; 後.auto = true;
    const 城 = B.makeCorps('E', 将(6), 30, 0, 60, 60, m.cx, m.cy, 0, '#B0483C'); 城.auto = false; 城.order = '待機';
    const 寄ら = [0, 1, 2].map((k) => {
      const c = B.makeCorps('P', 将(7 + k), 400, 2600, 78, 78, p.x + (k - 1) * 120 * 尺, p.y + 160 * 尺, -Math.PI / 2, '#2F5D8C');
      c.auto = false; c.order = '接戦'; c.target = 後.id; c.tx = p.x; c.ty = p.y; return c;
    });
    for (const c of [後, 城, ...寄ら]) B.placeSquads(c, true);
    const b = B.createBattle(寄ら, [後, 城], 'P');
    b.mode = 'castle'; b.map = m; b.phase = 'fight'; b.日数 = 3; b.日 = 1; b.日の始め = 0; b.dusk = 99999; b.日の長さ = 99999; b.鼓舞なし = true;
    b.後詰 = [{ 軍: 'r2', 家: '試し', 将: '将5', 側: 'E', corps: [後], 入った: true, 入った刻: 0, 呼応した: true, 前構え: true }];
    for (const f of m.fac) if (f.kind === '矢倉') f.hp = 0;
    let 退いた刻 = null, 戻った = false;
    for (let t = 0; t < 90; t += 0.05) {
      B.stepBattle(b, 0.05);
      if (後.withdraw && 退いた刻 == null) 退いた刻 = b.t;
      if (退いた刻 != null && !後.withdraw && !後.dead && !後.destroyed) 戻った = true;
    }
    const 報せ = (b.log || []).filter((l) => l.text.includes(`${後.gen.name}隊は支えきれず`)).length;
    確('大軍に押されて退いた後詰は、退いたまま戻らない（「戦場を退いた」の報せは一度きり）', 退いた刻 != null && !戻った && 報せ <= 1,
      `退いた刻 ${退いた刻 == null ? 'なし' : Math.round(退いた刻) + '秒'}・報せ ${報せ}度`);
  }
  /* 夜には持ち場へ戻る */
  内.後.x += 400 * 尺; 内.後.y += 200 * 尺;
  内.b.phase = 'night'; 内.b.夜 = { 日: 1 };
  B.夜を明かす(内.b);
  確('夜には持ち場へ戻って構え直す', Math.hypot(内.後.x - 内.p.x, 内.後.y - 内.p.y) < 1, `${Math.round(Math.hypot(内.後.x - 内.p.x, 内.後.y - 内.p.y))}歩`);
}

console.log('■ 四、月送り');
{
  巡検.賽を据える(0x64000);
  let s = initState('oda');
  s.autoPlay = true;
  const 場 = 場を探す(s, { 敵月: 1, 近月: 1 });
  確('通しの場', !!場, 場 ? `${場.自.name} → ${場.的.name}` : '');
  if (場) {
    const 守 = 城兵(s, 場.的);
    敵を向ける(s, 場, Math.round(守 * 2.2));
    s = H.advanceMonth(s);
    const 後詰ら = s.armies.filter((a) => a.relief === 場.的.id && a.faction === 場.fid);
    確('遊ぶ側の軍が向かえば、その月のうちに後詰が発つ', 後詰ら.length > 0, 後詰ら.map((a) => `${a.men}人`).join('・'));
    確('物見の報せが立つ', (s.monthEvents || []).some((e) => /【物見】/.test(e)) || (s.chronicle || []).some((e) => /救おうと/.test(e.text)));
    let 加わった = false, 着陣 = false;
    for (let mth = 0; mth < 3; mth++) {
      for (let q = 0; q < 120 && (s.pendingArrivals || []).length; q++) {
        const id = s.pendingArrivals[0];
        const a = (s.armies || []).find((x) => x.id === id);
        const 的 = a && s.castles.find((c) => c.id === a.at);
        if (!a || !的) { s.pendingArrivals = s.pendingArrivals.slice(1); continue; }
        if (a.id === 'enemy1') 着陣 = s.armies.some((x) => x.relief === 場.的.id && x.faction === 場.fid && (x.在陣 === 場.的.id || x.at === 場.的.id));
        s = H.resolveOffscreen(s, a.id, 的.id);
        if (a.id === 'enemy1') 加わった = (s.chronicle || []).slice(-8).some((e) => /後詰.*加わった/.test(e.text));
      }
      if (加わった) break;
      s = H.advanceMonth(s);
    }
    確('後詰は敵より先か同じ月に城に着いている', 着陣);
    確('後詰は城下の野戦に加わる', 加わった);
  }
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
