/* 戦場の型（battle/kata.js・core/senjo.js・field.js 型の野を組む）。

   遊ぶ側の申し出は「天下分け目以外のキャンペーンモードの戦場を増やしたいですね。
   もう少し今の街道に沿いつつ、さらに特徴的な戦場を10くらい追加したい」であった。
   戦う街道の性格から野の型を決め、その形に野を組む。次を検める。

     一、街道ごとに型が選ばれる。難所は峠、大河を渡れば大河の渡し、湖のそばは湖岸、
         海岸に沿えば浜（山越えなら磯）、山道は谷か段、短い街道は町。数の目安も見る
     二、どの型も、どの攻め口でも、どの広さでも組める。同じ種なら同じ野
     三、寄せ手の端から受け手の端まで、淵にも山にも入らずに行ける
         （峠は鞍部を、湖岸と磯は隘路を、大河は橋か瀬を通って）
     四、両軍の布陣の列の多くが、布陣できる地（森・林・村・沼・丘・水でない）にある
     五、渡し（橋・浅瀬）は川を跨いでいる。本道は寄せ手の端から受け手の端へ通る
     六、木と葦の数が頭を超えない（一本ずつ立てて描くので、多いと合戦が重い）
     七、型の野のあとに賽の野を組めば、升目も型も残らない
     八、型の野で合戦を回すと、両軍が当たり、決着がつく */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'kata-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { layoutField, setFieldSeed, setFieldKind, FIELD, FIELD_SEED, seedOf, terrainAt, 野の型, 陣の帯, 地形格,\n'
+ '  HILLS, MOUNTAINS, FORESTS, WOODS, MARSH, VILLAGES, RIVERS, ROADS, ROAD, hasRiver } from "../src/battle/field.js";\n'
+ 'export { 型を選ぶ, 野の型を決める, 型の野, 型の表 } from "../src/battle/kata.js";\n'
+ 'export { 街道の性格 } from "../src/core/senjo.js";\n'
+ 'export { ROADS as 街道の表 } from "../src/data/roads.js";\n'
+ 'export { nodeById } from "../src/core/paths.js";\n'
+ 'export { makeCorps, placeSquads } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle, stepBattle } from "../src/battle/engine.js";\n'
+ 'export { setBattleMap } from "../src/battle/castleMap.js";\n');
const out = path.join(ROOT, 'build', 'kata.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

const 型ら = ['峠', '谷', '段', '大河', '湖', '浜', '磯', '町', '畷', '森', '丘陵'];
/* 攻め口（MapScreen attackFace と同じ決め方） */
const 攻め口 = (a, b) => {
  const P = A.nodeById(a), T = A.nodeById(b);
  const dx = P.x - T.x, dy = P.y - T.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N');
};

console.log('■ 一、街道ごとに型が選ばれる');
{
  const 数 = {}, 名 = (a, b) => `${A.nodeById(a).name}–${A.nodeById(b).name}`;
  let 陸 = 0, 食い違い = [];
  for (const [a, b, , 質] of A.街道の表) {
    if (質 === '海路') { if (A.型を選ぶ(A.街道の性格(a, b, 攻め口(a, b)), A.seedOf(a, b)) != null) 食い違い.push('海路 ' + 名(a, b)); continue; }
    陸++;
    const 性 = A.街道の性格(a, b, 攻め口(a, b));
    const 型 = A.型を選ぶ(性, A.seedOf(a, b));
    数[型 || '今のまま'] = (数[型 || '今のまま'] || 0) + 1;
    /* 決まりどおりか（先に当たったものを取る） */
    const 山越え = 質 === '山道' || 質 === '難所';
    const 期 = 性.海 && 山越え ? '磯' : 質 === '難所' ? '峠' : 性.大河 ? '大河' : 性.湖 ? '湖' : 性.海 ? '浜'
      : 質 === '山道' ? ['谷', '段'] : 性.距 <= 12 ? '町' : [null, '畷', '森', '丘陵'];
    if (Array.isArray(期) ? !期.includes(型) : 期 !== 型) 食い違い.push(`${名(a, b)} ${型}≠${期}`);
    /* 向きを替えても型は変わらない（種は両端の城の組で決まる） */
    const 逆 = A.型を選ぶ(A.街道の性格(b, a, 攻め口(b, a)), A.seedOf(b, a));
    if (逆 !== 型) 食い違い.push(`${名(a, b)} 向きで型が変わる ${型}/${逆}`);
  }
  確('型の決まりどおりに選ばれる（海路は型にしない・向きで変わらない）', !食い違い.length, 食い違い.slice(0, 3).join('、'));
  const 並 = Object.keys(数).sort((p, q) => 数[q] - 数[p]).map((k) => `${k}${数[k]}`).join('・');
  console.log(`    陸の街道 ${陸}本：${並}`);
  確('十の型がどれも出る（浜と磯は一つの型）', 型ら.every((k) => 数[k] > 0), 型ら.filter((k) => !数[k]).join('・'));
  確('今のままの野が一割から三割残る', 数['今のまま'] >= 陸 * 0.1 && 数['今のまま'] <= 陸 * 0.3, `${数['今のまま']}本`);
  /* 名の知れた所 */
  const 見る = [['sunpu', 'kounkoji', '磯', '駿府城–興国寺城（薩埵峠のある山道）'], ['kanegasaki', 'odani', '湖', '金ヶ崎城–小谷城（琵琶湖の北岸）'],
    ['takato', 'iida', '大河', '高遠城–飯田城（天竜川を渡る）']];
  for (const [a, b, 期, 添] of 見る) {
    if (!A.nodeById(a) || !A.nodeById(b)) { 確(`${添}`, false, '城が無い'); continue; }
    const 型 = A.型を選ぶ(A.街道の性格(a, b, 攻め口(a, b)), A.seedOf(a, b));
    確(`${添}は${A.型の表[期].名}`, 型 === 期, String(型));
  }
}

/* 盤の大きさ（広げる前の幅がおよそ千百・三千・八千六百） */
const 大きさ = [[1500, 2, '小'], [6000, 6, '中'], [40000, 24, '大']];
const 向きら = ['S', 'N', 'E', 'W'];
const 布陣を嫌う = new Set(['forest', 'wood', 'village', 'deep', 'ford', 'marsh', 'hill', 'bridge']);
const 書付 = (型, 向き, 鏡 = false) => ({ 型, 向き, 鏡, 名ら: {} });
const 組む = (型, 向き, 兵, 隊, 種, 鏡 = false, 質 = '街道') => {
  A.setBattleMap(null);
  A.setFieldSeed('k' + 種, 'x' + 種);
  A.setFieldKind(型 === '峠' ? '難所' : 型 === '磯' || 型 === '谷' || 型 === '段' ? '山道' : 質);
  A.layoutField(兵, 隊, 書付(型, 向き, 鏡));
};
/* 寄せ手の端から受け手の端へ、升目の上を行けるか（避ける地は通らない） */
function 行けるか(向き, 避) {
  const g = A.地形格, W = A.FIELD.w, H = A.FIELD.h;
  if (!g) return false;
  const 種 = (i, j) => A.terrainAt(i * g.ce + g.ce / 2, j * g.ce + g.ce / 2);
  const 端 = (i, j) => {
    const x = i * g.ce + g.ce / 2, y = j * g.ce + g.ce / 2;
    return 向き === 'S' ? [y > H * 0.95, y < H * 0.05] : 向き === 'N' ? [y < H * 0.05, y > H * 0.95]
      : 向き === 'E' ? [x > W * 0.95, x < W * 0.05] : [x < W * 0.05, x > W * 0.95];
  };
  const 見 = new Uint8Array(g.w * g.h), 列 = [];
  for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
    if (端(i, j)[0] && !避.has(種(i, j))) { 見[j * g.w + i] = 1; 列.push(j * g.w + i); }
  }
  for (let k = 0; k < 列.length; k++) {
    const v = 列[k], i = v % g.w, j = (v / g.w) | 0;
    if (端(i, j)[1]) return true;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= g.w || jj >= g.h) continue;
      const u = jj * g.w + ii;
      if (見[u] || 避.has(種(ii, jj))) continue;
      見[u] = 1; 列.push(u);
    }
  }
  return false;
}
/* 布陣の列（MapScreen lineup の前の列）に、布陣できる地がどれほどあるか */
function 布陣の割(向き) {
  const W = A.FIELD.w, H = A.FIELD.h, 縦 = 向き === 'S' || 向き === 'N';
  const 帯 = A.陣の帯.幅 > 0 ? A.陣の帯 : null;
  const 芯 = 帯 ? 帯.中 : (縦 ? W : H) / 2, 幅 = 帯 ? 帯.幅 : (縦 ? W : H) * 0.78;
  let 良 = 0, 全 = 0;
  for (const 前 of [0.14, 0.86]) {
    for (let k = 0; k <= 24; k++) {
      const u = 芯 - 幅 / 2 + (幅 * k) / 24;
      const x = 縦 ? u : W * 前, y = 縦 ? H * 前 : u;
      全++;
      if (!布陣を嫌う.has(A.terrainAt(x, y))) 良++;
    }
  }
  return 良 / 全;
}
const 線までの距 = (節, x, y) => {
  let 最 = Infinity;
  for (let i = 0; i + 1 < 節.length; i++) {
    const a = 節[i], b = 節[i + 1], vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy;
    let t = L2 ? ((x - a.x) * vx + (y - a.y) * vy) / L2 : 0; t = Math.max(0, Math.min(1, t));
    最 = Math.min(最, Math.hypot(a.x + vx * t - x, a.y + vy * t - y));
  }
  return 最;
};

console.log('■ 二〜六、どの型も、どの攻め口でも、どの広さでも組める');
{
  const 行けぬ = [], 布陣の悪い = [], 渡しの悪い = [], 道の悪い = [], 多い = [], 違う = [];
  let 最小布陣 = 1, 組んだ = 0;
  for (const 型 of 型ら) {
    for (const 向き of 向きら) {
      for (const [兵, 隊, 寸] of 大きさ) {
        for (const 種 of [1, 2]) {
          const 鏡 = 種 === 2;
          組む(型, 向き, 兵, 隊, 種, 鏡);
          組んだ++;
          const 札 = `${型}・${向き}・${寸}・${種}`;
          if (A.野の型.id !== 型 || !A.地形格) { 違う.push(札 + ' 組めない'); continue; }
          /* 同じ種なら同じ野 */
          const 写し = JSON.stringify([A.HILLS, A.MOUNTAINS, A.FORESTS, A.WOODS, A.MARSH, A.VILLAGES, A.RIVERS, A.ROADS.map((r) => r.節)]);
          組む(型, 向き, 兵, 隊, 種, 鏡);
          if (写し !== JSON.stringify([A.HILLS, A.MOUNTAINS, A.FORESTS, A.WOODS, A.MARSH, A.VILLAGES, A.RIVERS, A.ROADS.map((r) => r.節)])) 違う.push(札 + ' 種が同じでも野が違う');
          if (!行けるか(向き, new Set(['deep', 'mountain']))) 行けぬ.push(札);
          const 割 = 布陣の割(向き);
          最小布陣 = Math.min(最小布陣, 割);
          if (割 < 0.7) 布陣の悪い.push(`${札} ${Math.round(割 * 100)}%`);
          for (const r of A.RIVERS) for (const w of r.渡し || []) {
            const d = 線までの距(r.節, w.x, w.y);
            if (d > r.幅 * 0.3 || w.r < r.幅 / 2 + 8) 渡しの悪い.push(`${札} ${r.名}の${w.種}（芯から${Math.round(d)}・半径${w.r}・川幅${r.幅}）`);
          }
          const 節 = A.ROAD.節, W = A.FIELD.w, H = A.FIELD.h, s = 節[0], e = 節[節.length - 1];
          const 端の外 = (p, 辺) => (辺 === 'S' ? p.y >= H : 辺 === 'N' ? p.y <= 0 : 辺 === 'E' ? p.x >= W : p.x <= 0);
          const 向かい = { S: 'N', N: 'S', E: 'W', W: 'E' }[向き];
          if (!節.length || !端の外(s, 向き) || !端の外(e, 向かい)) 道の悪い.push(札);
          const 木 = A.FORESTS.reduce((t, f) => t + Math.min(9000, Math.round(Math.PI * f.r * f.r / 81 * (f.密 ?? 1))), 0)
            + A.WOODS.reduce((t, f) => t + Math.min(9000, Math.round(Math.PI * f.r * f.r / 225 * (f.密 ?? 1))), 0);
          const 葦 = A.MARSH.reduce((t, m) => t + Math.min(5000, Math.round(Math.PI * m.r * m.r / 120 * (m.葦 ?? 1))), 0);
          if (木 > 46000 || 葦 > 32000 || A.VILLAGES.length > 20) 多い.push(`${札} 木${木}・葦${葦}・村${A.VILLAGES.length}`);
        }
      }
    }
  }
  確(`どれも組め、同じ種なら同じ野になる（${組んだ}枚）`, !違う.length, 違う.slice(0, 3).join('、'));
  確('寄せ手の端から受け手の端まで、淵にも山にも入らずに行ける', !行けぬ.length, 行けぬ.slice(0, 4).join('、'));
  確('布陣の列の七割以上が布陣できる地', !布陣の悪い.length, `最も低いもの ${Math.round(最小布陣 * 100)}%　${布陣の悪い.slice(0, 3).join('、')}`);
  確('渡しは川の芯にあり、川幅を跨ぐ', !渡しの悪い.length, 渡しの悪い.slice(0, 2).join('、'));
  確('本道は寄せ手の端の外から受け手の端の外へ通る', !道の悪い.length, 道の悪い.slice(0, 4).join('、'));
  確('木は四万六千本、葦は三万二千本、村は二十を超えない', !多い.length, 多い.slice(0, 3).join('、'));
}

console.log('■ 七、型の野のあとに賽の野を組めば、升目も型も残らない');
{
  組む('畷', 'S', 6000, 6, 3);
  const 型の升 = !!A.地形格;
  A.setFieldSeed('k9', 'x9'); A.setFieldKind('街道');
  A.layoutField(6000, 6);
  const 丘 = JSON.stringify(A.HILLS);
  確('型の野を組むと升目と型を持つ', 型の升 && true);
  確('賽の野では升目も型も帯も解ける', !A.地形格 && A.野の型.id == null && A.陣の帯.幅 === 0,
    `升目${!!A.地形格}・型${A.野の型.id}・帯${A.陣の帯.幅}`);
  A.layoutField(6000, 6);
  確('賽の野はこれまでどおり（同じ種で同じ丘）', 丘 === JSON.stringify(A.HILLS));
}

console.log('■ 八、型の野で合戦を回すと、両軍が当たり、決着がつく');
{
  let 種 = 0;
  const 元 = Math.random;
  Math.random = function () {
    種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
    let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 62, valor: 60, wit: 55, gov: 55, retinue: 400, retTrain: 70, unity: 60 });
  const 悪い = [];
  for (const [k, 型] of 型ら.entries()) {
    種 = 0x2000 + k * 991;
    組む(型, 'S', 9000, 6, 11 + k);
    const W = A.FIELD.w, H = A.FIELD.h, 帯 = A.陣の帯.幅 > 0 ? A.陣の帯 : { 中: W / 2, 幅: W * 0.6 };
    const 横 = (j) => 帯.中 + (j - 1) * Math.min(帯.幅 / 3, W * 0.2);
    const P = [0, 1, 2].map((j) => A.makeCorps('P', 将(j), 400, 1100, 75, 75, 横(j), H * 0.86, -Math.PI / 2, '#2F5D8C'));
    const E = [0, 1, 2].map((j) => A.makeCorps('E', 将(10 + j), 400, 1100, 75, 75, 横(j), H * 0.14, Math.PI / 2, '#B0483C'));
    for (const c of [...P, ...E]) { c.formation = '横陣'; A.placeSquads(c, true); c.auto = true; }
    const b = A.createBattle(P, E, 'P');
    b.mode = 'field'; b.phase = 'fight'; b.dusk = 1800; b.face = 'S'; b.myFar = false;
    const 初 = [...P, ...E].reduce((t, c) => t + c.squads.reduce((u, q) => u + q.men, 0), 0);
    /* 淵は組（兵の塊）で数える。隊の芯の点は瀬の円の縁を跨ぐと淵に落ちるが、組はみな
       瀬の上にいる、ということがある。崩れて逃げる隊は数えない（川を突っ切って逃げる） */
    let 刻 = 0, 淵 = 0, 組刻 = 0, 壊れ = false;
    for (let s = 0; s < 9000 && !b.result; s++) {
      A.stepBattle(b, 0.25);
      if (s % 3 === 0) A.battleAI(b);
      for (const c of [...P, ...E]) {
        if (c.dead || c.destroyed) continue;
        if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) 壊れ = true;
        if (c.routed || s % 4) continue;
        for (const q of c.squads) {
          if (q.men <= 0) continue;
          組刻++;
          if (A.terrainAt(q.x, q.y) === 'deep') 淵++;
        }
      }
      刻 = s;
    }
    const 今 = [...P, ...E].reduce((t, c) => t + c.squads.reduce((u, q) => u + q.men, 0), 0);
    const 損 = 1 - 今 / 初;
    const 淵割 = 淵 / Math.max(1, 組刻);
    const 添 = `${A.型の表[型].名}：${b.result || '決着なし'}・${Math.round(刻 * 0.25)}秒・損${Math.round(損 * 100)}%・淵の組${(淵割 * 100).toFixed(1)}%`;
    console.log('    ' + 添);
    if (壊れ || !b.result || 損 < 0.05 || 淵割 > 0.06) 悪い.push(添);
  }
  Math.random = 元;
  確('どの型でも両軍が当たり（損が五分以上）、決着がつき、淵に居座らない（崩れていない組の六分まで）', !悪い.length, 悪い.slice(0, 3).join('、'));
}

console.log(`\n════ 戦場の型：咎 ${咎.length} 件`);
console.log('エラー:', 咎.length ? 咎.join(' | ') : 'なし');
process.exit(咎.length ? 1 : 0);
