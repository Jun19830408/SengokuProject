/* ============================================================
   川渡り：隊が橋・浅瀬を通って川を渡り、水際で立ち尽くさないこと（battle/route.js 野の道・battle/engine.js 淵の縁を伝う・
   battle/ai.js 脇を回る道と総大将の身の置きどころ）

   遊ぶ人の申し出：「盤のときにプレイヤーも所属する武将が川を橋などから渡らず川の中腹を渡ったりして止まり、そのまま
   動かなくなるバグがありましたので修正してください。キャンペーンと同じ動きになるようにしてください」。
   量ってみると、手勢の無い（キャンペーンと同じ）盤でも同じことが起きていた（直す前は、二の十通りのうち八通りで二十秒より長く
   立ち尽くし（長いもので六十七秒）、六通りで淵を押し渡った。勝幡・津島では上司の隊も）。訳は三つ：
     ・曲がり角に着いたとみなす輪（五十二歩）が升（四十八歩）より広く、隊は橋の袂の角の手前で次の点（橋の上）へまっすぐ
       向かい、袂の角の淵に前を塞がれた。淵は決めてからでなければ踏まないので、縦横に滑っても淵なら一歩も出られず、
       水際で四十秒ほど立ち尽くしたのち、橋を使わずに淵を押し渡った
     ・噛み合っている味方に前をふさがれて脇を回るとき、脇の点を真っすぐ結ぶので、その筋が川を跨ぐと水際で止まった
     ・総大将の隊が味方のうしろに構えに行くときだけ道を引かず、味方が川を渡ると水際で止まった
   直し：渡り場（橋・浅瀬）の脇の曲がり角は 渡り場の輪 で着いたとみなす（battle/route.js。淵に接するだけの岸沿いの角までは
   狭めない。狭めると森・林・湿地・集落にいる刻が増えた：tests/chikei）。前が淵なら、行き先へ寄る向き（左右三十度・六十度）の
   うち踏める所へ出て淵の縁を伝う（battle/engine.js）。脇を回る筋が淵を跨ぐなら、その回り方を使わず寄せ道に任せる。総大将の
   構えも道を辿る（battle/ai.js）。道の重みは変えない（変えると城攻めの寄せ手が橋を避けて浅瀬へ回った：tests/tsukejiro）
     一、橋の袂の脇から川の向こうへの道は橋を通り、地点は淵に置かない。渡り場の曲がり角は 渡り場の輪 で着いたとみなす
     二、川のある五つの野で、味方の隊が、行き先を持ったまま水の縁で二十秒より長く動かずにいることがない（手勢の無い盤（キャンペーン
       と同じ）と、手勢のある風雲の盤の両方で）
     三、上司の隊は橋を通って川を渡る（淵を押し渡らない）
     四、盤の刻みの幅に関わらず、隊は橋を渡り、水の縁で立ち尽くさない（遊ぶ人の申し出：「5人組で移動していたところ、川で
       やはり先に進めなくなります。盤の視点でも同じです」）。一から三は盤の刻み〇.〇五秒で量っていたが、遊ぶときの盤は一コマ
       ずつ刻むので、盤の微速で〇.〇〇二秒・低速〇.〇〇五秒・通常と早送りで〇.〇一秒、背中越し（微速）で〇.〇〇〇七秒ほどしか
       進まない（六十コマの端末で）。一歩が細かいと、道の真っすぐな筋が橋の袂の脇の細い淵の角をかすめるところで、隊は岸と
       淵の角とに挟まれて出られなくなり（〇.〇五秒の一歩なら細い淵を跨ぎ越していた）、また浅瀬や森をふつうに歩む隊まで
       「詰まった」とされて地点を捨てた。直し：道の筋が淵をかすめるなら升の芯を辿り直す（battle/route.js 淵をかすめぬよう
       繕う）、曲がると次の筋が淵の角を切るなら地点に着いたとしない（battle/route.js 角を切るか）、「詰まった」は盤の一秒に
       〇.八歩より縮まないことで量る（battle/engine.js）。
       ・一つの野で、上司の隊に同じ道を引き、刻みの幅〇.〇一・〇.〇〇五・〇.〇〇二・〇.〇〇〇七で歩ませると、いずれも
         二十五秒のうちに橋を渡り、淵を押し渡らない
       ・川のある五つの野を、五人長の手勢を連れて刻みの幅〇.〇一で回し、味方の隊（手勢も）が行き先を持ったまま水の縁で
         二十秒より長く動かずにいない。手勢は淵に入らない（率いていないとき）
   値はみな仮。
   ============================================================ */
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator;
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const 咎 = [];
const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎.push(名); };
const 将 = (i, lord) => ({ id: `g${i}`, name: `将${i}`, lead: 65, valor: 65, wit: 58, gov: 55, retinue: 500, retTrain: 70, unity: 62, lord: !!lord });
const 賽を据える = (種) => { let s = 種; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const 野を組む = (a, z) => { H.setBattleMap(null); H.setFieldSeed(a, z); H.layoutField(9000, 6); };
const 水 = (x, y) => { const t = H.terrainAt(x, y); return t === 'deep' || t === 'ford' || t === 'bridge'; };

console.log('── 一　橋の袂の脇から川の向こうへの道は橋を通る。渡り場の曲がり角は 渡り場の輪 で着いたとみなす');
{
  野を組む('勝幡', '津島');
  const 道 = H.野を行く道(3537, 1456, 3700, 600);
  確('橋の袂の脇から川の向こうへの道は橋を通り、地点を淵に置かない', 道 && 道.length > 0 && 道.some((p) => H.terrainAt(p.x, p.y) === 'bridge') && !道.some((p) => H.terrainAt(p.x, p.y) === 'deep'),
    `地点 ${道 ? 道.length : 0}・橋の上 ${道 ? 道.filter((p) => H.terrainAt(p.x, p.y) === 'bridge').length : 0}`);
  確('渡り場の曲がり角は、着いたとみなす輪が狭い', 道.filter((p) => 水(p.x, p.y)).every((p) => p.r === H.渡り場の輪) && 道.some((p) => p.r === H.渡り場の輪), `渡り場の輪 ${H.渡り場の輪}歩`);
}

console.log('\n── 二　川のある野で、味方の隊が水の縁で立ち尽くさない（手勢の無い盤と、手勢のある風雲の盤）');
const 押し渡りの記 = {};
for (const 名 of ['清洲|岩倉', '那古野|末森', '鳴海|大高', '岡崎|安祥', '勝幡|津島']) for (const 手勢あり of [false, true]) {
  const [a, z] = 名.split('|');
  賽を据える(0x5151); 野を組む(a, z);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  const P = [H.makeCorps('P', 将(0), 0, 1500, 75, 75, W * 0.5, Hh * 0.85, -Math.PI / 2, '#2F5D8C'), H.makeCorps('P', 将(1, true), 0, 2000, 75, 75, W * 0.3, Hh * 0.88, -Math.PI / 2, '#2F5D8C'), H.makeCorps('P', 将(2), 0, 1000, 75, 75, W * 0.7, Hh * 0.88, -Math.PI / 2, '#2F5D8C')];
  const E = [H.makeCorps('E', 将(10, true), 0, 2000, 75, 75, W * 0.5, Hh * 0.12, Math.PI / 2, '#B0483C'), H.makeCorps('E', 将(11), 0, 1200, 75, 75, W * 0.3, Hh * 0.1, Math.PI / 2, '#B0483C'), H.makeCorps('E', 将(12), 0, 1200, 75, 75, W * 0.7, Hh * 0.1, Math.PI / 2, '#B0483C')];
  for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
  const b = H.createBattle(P, E, 'P'); b.mode = 'field'; b.phase = 'fight'; b.dusk = 99999;
  if (手勢あり) H.手勢を組む(b, 'g0', { 手勢: 10, 名: '与平', 武勇: 45, 統率: 30 });
  const 控 = new Map(); let 長 = 0, 誰 = '';
  const g0 = b.corps.find((c) => c.id === 'g0'), y0 = g0.y;
  for (let k = 0; k < 4000; k++) {
    H.stepBattle(b, 0.05);
    if (k % 20 === 0) for (const c of b.corps) {
      if (c.side !== 'P' || c.手勢 || c.dead || c.destroyed || c.routed) continue;
      const 行く = c.order === '移動' || c.order === '前進' || c.order === '接戦' || c.order === '突撃';
      const 近水 = 水(c.x, c.y) || 水(c.x, c.y - 30) || 水(c.x, c.y + 30);
      const m = 控.get(c.id);
      if (!行く || !近水 || !m || Math.hypot(c.x - m.x, c.y - m.y) > 50 || c.squads.some((q) => q.engaged)) { 控.set(c.id, { x: c.x, y: c.y, t: b.t }); continue; }
      if (b.t - m.t > 長) { 長 = b.t - m.t; 誰 = `${c.id}(${c.x.toFixed(0)},${c.y.toFixed(0)} ${H.terrainAt(c.x, c.y)})`; }
    }
    if (b.result) break;
  }
  確(`${名}（${手勢あり ? '手勢あり' : '手勢なし'}）：味方の隊が、行き先を持ったまま水の縁で二十秒より長く動かずにいない`, 長 <= 20, `いちばん長く ${長.toFixed(0)}秒${誰 ? `・${誰}` : ''}・結果 ${b.result || '-'}`);
  押し渡りの記[`${名}|${手勢あり}`] = { log: (b.log || []).filter((x) => /押し渡る/.test(x.text) && /将0/.test(x.text)), 渡った: H.RIVER.bot > 0 && g0.y < H.RIVER.top, y0 };
}

console.log('\n── 三　上司の隊は橋を通って川を渡る（淵を押し渡らない）');
for (const 手勢あり of [false, true]) {
  const r = 押し渡りの記[`勝幡|津島|${手勢あり}`];
  確(`勝幡・津島の野で（${手勢あり ? '手勢あり' : '手勢なし'}）、上司の隊（将0）は川の向こうへ渡り、淵を押し渡らない`, r.渡った && r.log.length === 0, r.log.map((x) => x.text).join('／') || '押し渡りの記なし');
}

console.log('\n── 四　盤の刻みの幅に関わらず、隊は橋を渡り、水の縁で立ち尽くさない');
{
  /* 一つの野（北に川。橋は上司の隊の西）で、上司の隊に同じ道（野の道）を引き、刻みの幅を変えて歩ませる */
  const 一つの野で = (dt) => {
    賽を据える(0x7E2A); H.setBattleMap(null); H.setFieldSeed('fuun', 'tezei'); H.layoutField(7000, 6);
    const W = H.FIELD.w, Hh = H.FIELD.h;
    const P = [H.makeCorps('P', 将(0, true), 0, 1200, 75, 75, W * 0.5, Hh * 0.7, -Math.PI / 2, '#2F5D8C')];
    const E = [H.makeCorps('E', 将(10, true), 0, 900, 75, 75, W * 0.5, Hh * 0.15, Math.PI / 2, '#B0483C')];
    for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
    const b = H.createBattle(P, E, 'P'); b.mode = 'field'; b.phase = 'fight'; b.dusk = 99999;
    const 親 = b.corps.find((c) => c.id === 'g0');
    for (const c of b.corps) { c.auto = false; c.order = '待機'; c.tx = c.x; c.ty = c.y; } b.aiClock = 1e9;
    const 道 = H.野を行く道(親.x, 親.y, 親.x, 親.y - 600);
    親.wp = 道; 親.order = '移動'; 親.tx = 道[0].x; 親.ty = 道[0].y;
    let 淵 = false;
    for (let k = 0; k < Math.round(25 / dt); k++) { H.stepBattle(b, dt); if (H.terrainAt(親.x, 親.y) === 'deep') 淵 = true; }
    return { 渡った: 親.y < H.RIVER.top, 淵, 押し渡り: !!親.押し渡る, 所: `${親.x.toFixed(0)},${親.y.toFixed(0)} ${H.terrainAt(親.x, 親.y)}` };
  };
  for (const dt of [0.01, 0.005, 0.002, 0.0007]) {
    const r = 一つの野で(dt);
    確(`刻みの幅 ${dt}秒：上司の隊は二十五秒のうちに橋を渡り、淵に入らず、押し渡らない`, r.渡った && !r.淵 && !r.押し渡り, `二十五秒ののち ${r.所}`);
  }
  /* 川のある五つの野を、五人長の手勢を連れて刻みの幅〇.〇一で回す（上の 二 と同じ測り方。手勢も測る） */
  for (const 名 of ['清洲|岩倉', '那古野|末森', '鳴海|大高', '岡崎|安祥', '勝幡|津島']) {
    const [a, z] = 名.split('|');
    賽を据える(0x5151); 野を組む(a, z);
    const W = H.FIELD.w, Hh = H.FIELD.h;
    const P = [H.makeCorps('P', 将(0), 0, 1500, 75, 75, W * 0.5, Hh * 0.85, -Math.PI / 2, '#2F5D8C'), H.makeCorps('P', 将(1, true), 0, 2000, 75, 75, W * 0.3, Hh * 0.88, -Math.PI / 2, '#2F5D8C'), H.makeCorps('P', 将(2), 0, 1000, 75, 75, W * 0.7, Hh * 0.88, -Math.PI / 2, '#2F5D8C')];
    const E = [H.makeCorps('E', 将(10, true), 0, 2000, 75, 75, W * 0.5, Hh * 0.12, Math.PI / 2, '#B0483C'), H.makeCorps('E', 将(11), 0, 1200, 75, 75, W * 0.3, Hh * 0.1, Math.PI / 2, '#B0483C'), H.makeCorps('E', 将(12), 0, 1200, 75, 75, W * 0.7, Hh * 0.1, Math.PI / 2, '#B0483C')];
    for (const c of [...P, ...E]) { c.formation = '横陣'; H.placeSquads(c, true); }
    const b = H.createBattle(P, E, 'P'); b.mode = 'field'; b.phase = 'fight'; b.dusk = 99999;
    const 手 = H.手勢を組む(b, 'g0', { 手勢: 5, 名: '与平', 武勇: 45, 統率: 30 });
    const 控 = new Map(); let 長 = 0, 誰 = '', 手の淵 = false;
    const dt = 0.01;
    for (let k = 0; k < Math.round(120 / dt); k++) {
      H.stepBattle(b, dt);
      if (!手.dead && !手.destroyed && H.terrainAt(手.x, 手.y) === 'deep') 手の淵 = true;
      if (k % 100 === 0) for (const c of b.corps) {
        if (c.side !== 'P' || c.dead || c.destroyed || c.routed) continue;
        const 行く = c.order === '移動' || c.order === '前進' || c.order === '接戦' || c.order === '突撃';
        const 近水 = 水(c.x, c.y) || 水(c.x, c.y - 30) || 水(c.x, c.y + 30) || 水(c.x - 30, c.y) || 水(c.x + 30, c.y);
        /* 手勢は、上司の隊に付いて歩んでいて上司の隊から六十歩より離れているときだけ測る（座に着いて止まっているのは立ち尽くしでない） */
        const 親 = c.手勢 ? b.corps.find((o) => o.id === c.parentId) : null;
        const 測る = c.手勢 ? c.従い && 親 && Math.hypot(c.x - 親.x, c.y - 親.y) > 60 : 行く;
        const m = 控.get(c.id);
        if (!測る || !近水 || !m || Math.hypot(c.x - m.x, c.y - m.y) > (c.手勢 ? 20 : 50) || c.squads.some((q) => q.engaged)) { 控.set(c.id, { x: c.x, y: c.y, t: b.t }); continue; }
        if (b.t - m.t > 長) { 長 = b.t - m.t; 誰 = `${c.手勢 ? '手勢' : c.id}(${c.x.toFixed(0)},${c.y.toFixed(0)} ${H.terrainAt(c.x, c.y)})`; }
      }
      if (b.result) break;
    }
    確(`${名}（五人長の手勢・刻みの幅〇.〇一）：味方の隊と手勢が、行き先を持ったまま水の縁で二十秒より長く動かずにいない。手勢は淵に入らない`, 長 <= 20 && !手の淵, `いちばん長く ${長.toFixed(0)}秒${誰 ? `・${誰}` : ''}・手勢が淵に ${手の淵 ? '入った' : '入らない'}・結果 ${b.result || '-'}`);
  }
}

console.log(咎.length ? `\n★ ${咎.length}件の咎：${咎.join('／')}` : '\n確かめ：みな通った');
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
