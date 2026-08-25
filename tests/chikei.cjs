/* 地物を避けて寄せる（GDD 8.1 / 8.6）。

   委任した隊は、行き先まで真っすぐ歩いていた。あいだに川があれば押し渡り、
   森があれば突っ切る。足は落ち、隊列は乱れ、川の中で槍を合わせて負ける。
   橋を目指す道理は入れてあったが、渡り場ひとつを見て曲がるだけの当て推量で
   あったから、蛇行や森や丘がからむとたちまち破れた。

   道理で曲がるのをやめ、道を引くことにした（route.js）。野を升目に割り、
   地物ごとに通りにくさを与えて、いちばん安い道を探す。橋が近ければ橋を通り、
   遠ければ浅瀬へ回り、森も丘も湿地も集落も同じ勘定で避ける。
   寄せ手にも受け手にも等しく効かせる。片側だけが賢いのでは戦にならない。

   丘は避けるだけのものではない。登りきれば見晴らしが利き、戦う力も増すので、
   受け手は近くの丘を先に取って備える。ただし丘ひとつに一隊である（下の「一の四」）。

   直す前と後とを、同じ二十四戦（同じ賽・同じ野）で測った。

                          直す前    直したあと
     淵で過ごす割          8.0%       6.2%
     水で過ごす割         11.8%       8.8%
     地物で過ごす割       16.9%       8.9%
     丘の上で過ごす割     23.4%      48.4%
     水の中で槍を合わす   12.1%       8.5%
     渡り場を通った渡河     67%        90%
     受け手が丘に就く     14/66      46/63

   直したついでに、日暮れまで決着がつかぬ戦が出ないことも検めた。
   作っている途中では、川を挟んで睨み合ったまま日が暮れる戦が三戦あった。
   止まる先が水だからと手前の岸へ引き戻していたので、行き先が足元になって
   道が引けなくなっていた。向こう岸を目指させれば、道さがしが橋へ導く。

   のち、丘ひとつに一隊と定めた（ai.js の「高みを取る」）。受け手の全隊が
   同じ頂へ折り重なっていたのを改めたものである。同じ二十四戦で測り直した。

                          一丘一隊の前   あと
     受け手が丘に就く      62／72隊      41／72隊
     同じ丘への折り重なり    24件          2件
     淵で過ごす割           3.8%         5.2%
     水で過ごす割           4.5%         7.1%
     地物で過ごす割        12.1%        13.8%
     丘の上で過ごす割      35.6%        35.2%
     水の中で槍を合わす     5.4%         9.6%
     渡り場を通った渡河    43／48回      37／38回

   丘に就く隊が減ったぶん、地物と水で過ごす割が上がった。丘を諦めた受け手が
   野へ下りて、渡り場のこちら岸で寄せ手を待つようになったからである。
   水の中で槍を合わせているのは、その多くが寄せ手のほうで（5.9%→11.8%。
   受け手は4.9%→7.0%）、これは川から上がりきる前に叩かれているということ、
   すなわち半渡を撃たれているということである。丘の上で過ごす割が変わらぬのは、
   受け手が減った（42.2%→31.6%）ぶん、寄せ手が空いた丘に登った
   （28.7%→38.8%）ためで、丘が遊んでいるわけではない。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'chikei-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { layoutField, setFieldSeed, FIELD, RIVER, hasRiver, riverShift, terrainAt, HILLS, TERRAIN } from "../src/battle/field.js";\n'
+ 'export { makeCorps, placeSquads, issueOrder, corpsMen } from "../src/battle/corps.js";\n'
+ 'export { battleAI, 岸 } from "../src/battle/ai.js";\n'
+ 'export { 野の道, 通りにくさ } from "../src/battle/route.js";\n'
+ 'export { createBattle, stepBattle } from "../src/battle/engine.js";\n'
+ 'export { setBattleMap } from "../src/battle/castleMap.js";\n');
const out = path.join(ROOT, 'build', 'chikei.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out,
  loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

let 種 = 0;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const 将 = (i, wit) => ({ id: `g${i}`, name: `将${i}`, lead: 62, valor: 60,
  wit: wit == null ? 55 : wit, gov: 55, retinue: 400, retTrain: 70, unity: 60 });
const 水 = new Set(['deep', 'ford']);
const 障 = new Set(['forest', 'wood', 'marsh', 'village']);

/* ------------------------------------------- 一、野を渡る間の振る舞いを測る */
function 一戦(i) {
  種 = 0x1000 + i * 977;
  A.setBattleMap(null);
  A.setFieldSeed('r' + i, 'x');
  A.layoutField(9000, 6);
  const W = A.FIELD.w, H = A.FIELD.h;
  const P = [0, 1, 2].map((k) => A.makeCorps('P', 将(k), 400, 1100, 75, 75,
    W * (0.3 + k * 0.2), H * 0.86, -Math.PI / 2, '#2F5D8C'));
  const E = [0, 1, 2].map((k) => A.makeCorps('E', 将(10 + k), 400, 1100, 75, 75,
    W * (0.3 + k * 0.2), H * 0.14, Math.PI / 2, '#B0483C'));
  for (const c of [...P, ...E]) { c.formation = '横陣'; A.placeSquads(c, true); c.auto = true; }
  const b = A.createBattle(P, E, 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1300; b.face = 'S'; b.myFar = false;
  let 刻 = 0, 水刻 = 0, 淵刻 = 0, 障刻 = 0, 丘刻 = 0, 水戦 = 0, 戦 = 0;
  /* 受け手が丘に就いたかは、槍を合わせた時点で見る。戦の終わりで見ると、
     崩れて退き場へ走った隊が丘を降りているぶん、低く出る。
     ついでに、同じ丘に二隊以上が折り重なっていないかも数える。 */
  let 丘の守 = 0, 守 = 0, 触 = false, 重なり = 0;
  const 丘数 = A.HILLS.length;
  const 布陣を見る = () => {
    const 丘ごと = {};
    for (const c of E) {
      if (c.dead || c.destroyed) continue;
      守++;
      if ((c.地 || A.terrainAt(c.x, c.y)) !== 'hill') continue;
      丘の守++;
      const j = A.HILLS.findIndex((h) => (c.x - h.x) ** 2 + (c.y - h.y) ** 2 < h.r ** 2);
      丘ごと[j] = (丘ごと[j] || 0) + 1;
    }
    for (const j of Object.keys(丘ごと)) if (丘ごと[j] > 1) 重なり += 丘ごと[j] - 1;
  };
  const 岸0 = new Map(), 渡り = [];
  for (const c of [...P, ...E]) 岸0.set(c, A.岸(c.x, c.y));
  for (let k = 0; k < 6000; k++) {
    A.stepBattle(b, 0.25);
    if (k % 3 === 0) A.battleAI(b);
    for (const c of [...P, ...E]) {
      if (c.dead || c.destroyed) continue;
      const t = c.地 || A.terrainAt(c.x, c.y);
      刻++;
      if (水.has(t)) 水刻++;
      if (t === 'deep') 淵刻++;
      if (障.has(t)) 障刻++;
      if (t === 'hill') 丘刻++;
      if (c.squads.some((q) => q.engaged)) { 戦++; if (水.has(t)) 水戦++; }
      const 今 = A.岸(c.x, c.y);
      if (A.hasRiver()) {
        if (今 === 0 && c.渡ったx == null) c.渡ったx = c.x;
        if (今 !== 0 && 岸0.get(c) !== 0 && 今 !== 岸0.get(c)) {
          /* 崩れた隊が逃げるために渡った川は数えない。追われて水へ飛び込むのは
             道さがしの働きではなく、そうするしかなかったというだけである。 */
          if (!c.routed) 渡り.push(c.渡ったx == null ? c.x : c.渡ったx);
          岸0.set(c, 今);
        }
        if (今 !== 0) c.渡ったx = null;
      }
    }
    if (!触 && [...P, ...E].some((c) => c.squads.some((q) => q.engaged))) { 触 = true; 布陣を見る(); }
    if (b.result) break;
  }
  if (!触) 布陣を見る();
  let 渡り場 = 0;
  if (A.hasRiver()) {
    for (const x of 渡り) {
      if ((x > A.RIVER.bridge[0] - 40 && x < A.RIVER.bridge[1] + 40)
        || (x > A.RIVER.ford[0] - 40 && x < A.RIVER.ford[1] + 40)) 渡り場++;
    }
  }
  return { 川: A.hasRiver(), 刻, 水刻, 淵刻, 障刻, 丘刻, 水戦, 戦, 渡り: 渡り.length, 渡り場,
    守, 丘の守, 丘数, 重なり, 決: !!b.result };
}

{
  const 出 = [];
  for (let i = 0; i < 24; i++) 出.push(一戦(i));
  const 和 = (f) => 出.reduce((a, r) => a + f(r), 0);
  const 割 = (f) => 和(f) / Math.max(1, 和((r) => r.刻)) * 100;
  console.log(`  （${出.length}戦を測る。うち川のある野 ${出.filter((r) => r.川).length}）`);
  確('淵の中で過ごさない', 割((r) => r.淵刻) < 8,
    `${割((r) => r.淵刻).toFixed(1)}%（直す前は8.0%）`);
  確('水の中で過ごす刻が減った', 割((r) => r.水刻) < 10.5,
    `${割((r) => r.水刻).toFixed(1)}%（直す前は11.8%）`);
  確('森・林・湿地・集落を避けて通る', 割((r) => r.障刻) < 15,
    `${割((r) => r.障刻).toFixed(1)}%（道さがしの前は16.9%）`);
  確('渡河のほとんどは橋か浅瀬を通る', 和((r) => r.渡り場) > 和((r) => r.渡り) * 0.78,
    `${和((r) => r.渡り場)}／${和((r) => r.渡り)}回（直す前は67%）`);
  確('水の中で槍を合わせることが減った',
    和((r) => r.戦) === 0 || 和((r) => r.水戦) / 和((r) => r.戦) < 0.105,
    `${(和((r) => r.水戦) / Math.max(1, 和((r) => r.戦)) * 100).toFixed(1)}%（直す前は12.1%）`);
  /* 丘ひとつに一隊と定めたので、丘に就ける隊の数は野にある丘の数で頭打ちになる。
     隊の総数を分母にしては、丘が二つしかない野で三隊が就くことを求めることに
     なってしまう。分母は「隊の数と丘の数の、少ないほう」である。 */
  const 上限 = 和((r) => Math.min(r.守, r.丘数));
  確('受け手は近くの丘を取って備える', 和((r) => r.丘の守) > 上限 * 0.5,
    `槍を合わせた時に ${和((r) => r.丘の守)}／${和((r) => r.守)}隊`
    + `（丘の数を上限とすれば ${和((r) => r.丘の守)}／${上限}。道さがしの前は14／66隊）`);
  確('同じ丘に二隊は登らない（丘ひとつに一隊）', 和((r) => r.重なり) < 和((r) => r.丘の守) * 0.15,
    `折り重なり ${和((r) => r.重なり)}件／丘に就いた ${和((r) => r.丘の守)}隊（一丘一隊の前は24件／62隊）`);
  /* 戦の終わりを「兵が三割を切ったら退く」から「日暮れ・兵尽き・士気尽き・
     総崩れ」に改めたので、野戦は日暮れまでもつれることが増えた。
     ここで見たいのは「地物を避けたせいで戦にならない」ことが無いか、である。
     日が暮れる前に槍を合わせているなら、それでよい。 */
  確('地物を避けても、日暮れまでには決着か日没を迎える', 出.every((r) => r.決 || r.戦 > 0),
    `決着${出.filter((r) => r.決).length}／${出.length}戦（残りは日没）`);
}

/* --------------- 一のニ、兵で優る受け手は丘を取らない（GDD 8.6）

   高みは弱者の頼りである。数で押せる側が坂の上で待てば、相手に整える暇を与え、
   こちらは足の鈍る地に留まるだけで、せっかくの数が生きない。押して出て、
   野で決するほうがよい。優劣は隊ごとではなく、軍全体の兵力（士気ぶんの色を
   付けたもの）で測る。丘取りは軍としての構えだからである。 */
function 丘取りを測る(守の倍) {
  let 丘 = 0, 隊 = 0, 進 = 0, 戦 = 0;
  for (let i = 0; i < 12; i++) {
    種 = 0x3000 + i * 641;
    A.setBattleMap(null); A.setFieldSeed('h' + i, 'x'); A.layoutField(9000, 6);
    if (!A.HILLS.length) continue;
    戦++;
    const W = A.FIELD.w, H = A.FIELD.h;
    const P = [0, 1, 2].map((k) => A.makeCorps('P', 将(k), 400, 1100, 75, 75,
      W * (0.3 + k * 0.2), H * 0.86, -Math.PI / 2, '#2F5D8C'));
    const E = [0, 1, 2].map((k) => A.makeCorps('E', 将(10 + k),
      Math.round(400 * 守の倍), Math.round(1100 * 守の倍), 75, 75,
      W * (0.3 + k * 0.2), H * 0.14, Math.PI / 2, '#B0483C'));
    for (const c of [...P, ...E]) { c.formation = '横陣'; A.placeSquads(c, true); c.auto = true; }
    const b = A.createBattle(P, E, 'P');
    b.mode = 'field'; b.phase = 'fight'; b.dusk = 4000; b.face = 'S'; b.myFar = false;
    const y0 = E.reduce((a, c) => a + c.y, 0) / E.length;
    let 触 = false;
    for (let k = 0; k < 2000 && !触; k++) {
      A.stepBattle(b, 0.25);
      if (k % 3 === 0) A.battleAI(b);
      if ([...P, ...E].some((c) => c.squads.some((q) => q.engaged))) {
        触 = true;
        const 生 = E.filter((c) => !c.dead && !c.destroyed);
        for (const c of 生) { 隊++; if ((c.地 || A.terrainAt(c.x, c.y)) === 'hill') 丘++; }
        進 += (生.reduce((a, c) => a + c.y, 0) / Math.max(1, 生.length)) - y0;
      }
      if (b.result) break;
    }
  }
  return { 丘率: 丘 / Math.max(1, 隊), 進: 進 / Math.max(1, 戦), 丘, 隊, 戦 };
}
{
  const 五分 = 丘取りを測る(1.0);
  const 優勢 = 丘取りを測る(1.8);
  確('兵が五分なら、受け手は丘を取って備える', 五分.丘率 > 0.45,
    `${五分.丘}／${五分.隊}隊が丘に就いた`);
  確('兵で優る受け手は、敢えて丘を取らない', 優勢.丘率 < 五分.丘率 * 0.7,
    `${優勢.丘}／${優勢.隊}隊（五分なら${(五分.丘率 * 100).toFixed(0)}％、優勢なら${(優勢.丘率 * 100).toFixed(0)}％）`);
  確('その代わり前へ出て、野で決しにかかる', 優勢.進 > 五分.進 * 1.25,
    `敵方へ 五分 ${Math.round(五分.進)}歩 ／ 優勢 ${Math.round(優勢.進)}歩`);
}

/* ------- 一の三、丘は麓ではなく頂まで登ること（GDD 8.6）

   受け手が丘の手前でぴたりと止まり、そこで守りに就いていた。麓に足を掛けた
   だけで「自分は丘にいる」と判じていたためである。斜面の裾は高みではない。
   見晴らしも利かず、寄せ手と同じ高さで槍を合わせることになる。
   いま足を掛けている丘があるなら、その丘の頂を目指す。 */
{
  種 = 0x1234;
  A.setBattleMap(null); A.setFieldSeed('ok', 'x'); A.layoutField(9000, 6);
  const 丘 = A.HILLS.slice().sort((a, z) => z.r - a.r)[0];
  // 寡兵の受け手を丘の南の麓の外に、大軍の寄せ手を遠くに置く
  const E = [0, 1, 2].map((k) => A.makeCorps('E', 将(10 + k), 300, 650, 70, 70,
    丘.x + (k - 1) * 200, 丘.y + 丘.r + 120, Math.PI / 2, '#B0483C'));
  const P = [0, 1, 2].map((k) => A.makeCorps('P', 将(k), 400, 1200, 75, 75,
    丘.x + (k - 1) * 200, 丘.y + 丘.r + 900, -Math.PI / 2, '#2F5D8C'));
  for (const c of [...P, ...E]) { c.formation = '横陣'; A.placeSquads(c, true); c.auto = true; }
  const b = A.createBattle(P, E, 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 4000; b.face = 'S'; b.myFar = false;
  let 登った = 0;
  for (let k = 0; k < 200; k++) {
    A.stepBattle(b, 0.25);
    if (k % 3 === 0) A.battleAI(b);
    for (const c of E) {
      const h = A.HILLS.find((z) => (c.x - z.x) ** 2 + (c.y - z.y) ** 2 < z.r ** 2);
      if (h && Math.hypot(c.x - h.x, c.y - h.y) <= Math.max(60, Math.min(120, h.r * 0.45))) c.頂に立った = true;
    }
    if (b.result) break;
  }
  登った = E.filter((c) => c.頂に立った).length;
  確('受け手は丘の頂まで登る（麓で止まらない）', 登った > 0,
    `${登った}／${E.length}隊が頂に立った`);
  // 頂に就いたら、そこで待ち受ける。降りて出迎えない。
  const 待つ = E.filter((c) => {
    if (c.dead || c.destroyed || c.routed) return false;
    const h = A.HILLS.find((z) => (c.x - z.x) ** 2 + (c.y - z.y) ** 2 < z.r ** 2);
    return h && Math.hypot(c.x - h.x, c.y - h.y) <= Math.max(60, Math.min(120, h.r * 0.45))
      && c.order === '守備';
  }).length;
  確('頂に就いた隊は、そこで守りに就く', 待つ > 0 || 登った > 0,
    `守りに就いた ${待つ}隊／頂に立った ${登った}隊`);
  console.log(`  （麓からの詰め： ${E.map((c, i) => {
    const h = A.HILLS.find((z) => (c.x - z.x) ** 2 + (c.y - z.y) ** 2 < z.r ** 2);
    return h ? `${Math.round(Math.hypot(c.x - h.x, c.y - h.y))}／${Math.round(h.r)}` : '丘の外';
  }).join(' ')}）`);
  A.setBattleMap(null);
}

/* ------------- 一の四、丘ひとつに一隊（GDD 8.6）

   手近な丘をめいめいに選ばせていたので、受け手の全隊が同じ一つの頂へ折り
   重なっていた。頂は狭い。三隊も登れば翼は裾へはみ出して高みの利は得られず、
   そのあいだ野に構えるべき戦列は空になる。高みを取るのは戦列の一端を高く
   するためであって、軍ごと丘の上へ引っ越すためではない。

   丘ひとつに一隊。押さえた丘は控えておき、押さえた隊が討たれるか崩れるか
   退くかしたときにだけ空く。埋まっていれば次に近い空き丘、空き丘が無ければ
   丘は諦めて野で構える。

   縛るのは采配――委任した隊と敵方――だけである。プレイヤーが手ずから登らせる
   ぶんには、何隊重ねようと指図は指図として通す。ここではその両方を見る。
   同じ三隊を丘の南の麓に並べ、委ねた場合と手ずから頂へ向かわせた場合とで比べる。 */
{
  A.setBattleMap(null); A.setFieldSeed('one', 'x');
  種 = 0x2468; A.layoutField(9000, 6);
  const 丘 = A.HILLS.slice().sort((a, z) => z.r - a.r)[0];
  const 頂 = Math.max(60, Math.min(120, 丘.r * 0.45));
  // P を受け手にする。委任を離れられるのは遊ぶ側の隊だけだからである。
  const 並べる = (委ねる) => {
    種 = 0x2468;
    const P = [0, 1, 2].map((k) => A.makeCorps('P', 将(k), 300, 650, 70, 70,
      丘.x + (k - 1) * 170, 丘.y + 丘.r + 150, -Math.PI / 2, '#2F5D8C'));
    const E = [0, 1, 2].map((k) => A.makeCorps('E', 将(10 + k), 400, 1200, 75, 75,
      丘.x + (k - 1) * 200, 丘.y + 丘.r + 1500, Math.PI / 2, '#B0483C'));
    for (const c of [...P, ...E]) { c.formation = '横陣'; A.placeSquads(c, true); c.auto = true; }
    const b = A.createBattle(P, E, 'E');           // 寄せ手は E、受け手が P
    b.mode = 'field'; b.phase = 'fight'; b.dusk = 4000; b.face = 'S'; b.myFar = false;
    if (!委ねる) for (const c of P) A.issueOrder(b, c, { order: '移動', tx: 丘.x, ty: 丘.y });
    let 頂に = 0;
    for (let k = 0; k < 300; k++) {
      A.stepBattle(b, 0.25);
      if (k % 3 === 0) A.battleAI(b);
      const n = P.filter((c) => !c.dead && !c.destroyed
        && Math.hypot(c.x - 丘.x, c.y - 丘.y) <= 頂).length;
      if (n > 頂に) 頂に = n;                       // 同時に頂へ乗った隊のいちばん多いとき
      if (b.result) break;
    }
    return { 頂に, 委: P.filter((c) => c.auto).length };
  };
  const 委 = 並べる(true), 手 = 並べる(false);
  確('采配は、一つの丘に一隊しか登らせない', 委.頂に <= 1,
    `委ねると ${委.頂に}／3隊が頂に乗った`);
  確('手ずから登らせるなら、何隊でも登れる', 手.頂に >= 2,
    `手ずから命じると ${手.頂に}／3隊が頂に乗った`);
  確('手ずから命じた隊は委任を離れている', 手.委 === 0, `委任のままの隊 ${手.委}`);
  A.setBattleMap(null);
}

/* --------------------------------- 二、道さがしそのものを検める */
{
  種 = 0x99;
  A.setBattleMap(null);
  let 見 = null;
  for (let i = 1; i < 60 && !見; i++) {
    A.setFieldSeed('br' + i, 'x'); A.layoutField(9000, 6);
    if (A.hasRiver()) 見 = i;
  }
  const 橋 = (A.RIVER.bridge[0] + A.RIVER.bridge[1]) / 2;
  const 中 = (A.RIVER.top + A.RIVER.bot) / 2 + A.riverShift(橋);
  // 橋の真上を挟んで向かい合う二点。橋を通れば水に入らずに渡れる。
  const 道 = A.野の道(橋, 中 + 420, 橋, 中 - 420);
  確('道が引ける', !!道 && 道.length > 0, 道 ? `${道.length}折れ` : 'なし');
  if (道) {
    let 淵 = 0, 点 = 0, px = 橋, py = 中 + 420;
    for (const p of 道) {
      const n = Math.ceil(Math.hypot(p.x - px, p.y - py) / 20);
      for (let k = 1; k <= n; k++) {
        const t = A.terrainAt(px + (p.x - px) * k / n, py + (p.y - py) * k / n);
        点++; if (t === 'deep') 淵++;
      }
      px = p.x; py = p.y;
    }
    確('引いた道は淵をほとんど通らない', 淵 / Math.max(1, 点) < 0.06,
      `道のりの${(淵 / Math.max(1, 点) * 100).toFixed(1)}%`);
  }
  確('通りにくさは 平地＜橋＜集落＜林＜丘＜森＜浅瀬＜湿地＜淵 の順',
    A.通りにくさ.plain < A.通りにくさ.bridge && A.通りにくさ.bridge < A.通りにくさ.village
    && A.通りにくさ.village < A.通りにくさ.wood && A.通りにくさ.wood < A.通りにくさ.hill
    && A.通りにくさ.hill < A.通りにくさ.forest && A.通りにくさ.forest < A.通りにくさ.ford
    && A.通りにくさ.ford < A.通りにくさ.marsh && A.通りにくさ.marsh < A.通りにくさ.deep,
    JSON.stringify(A.通りにくさ));
  確('集落は地形として足を鈍らせ、身を隠せる',
    A.TERRAIN.village && A.TERRAIN.village.speed < 1 && A.TERRAIN.village.sight < A.TERRAIN.plain.sight,
    A.TERRAIN.village ? `足${A.TERRAIN.village.speed}／見通し${A.TERRAIN.village.sight}` : 'なし');
}

/* ------------------------- 三、橋の順番待ちと、知略の将の押し渡り（GDD 8.1）

   橋は狭い。皆が同じ橋を目指せば当然つかえる。それでも並んで待つのが常道で
   あって、待ちきれずに淵へ乗り入れるのは愚である。ただし知略八十を超える将は
   水馴れているので、先頭でもなく長らくつかえているのなら、瀬を押し渡る。 */
function 混ませる(知) {
  let 押し = 0, 戦 = 0;
  for (let i = 0; i < 14; i++) {
    種 = 0x5000 + i * 271;
    A.setBattleMap(null); A.setFieldSeed('q' + i, 'x'); A.layoutField(18000, 8);
    if (!A.hasRiver()) continue;
    戦++;
    const 中 = (A.RIVER.top + A.RIVER.bot) / 2;
    const 橋 = (A.RIVER.bridge[0] + A.RIVER.bridge[1]) / 2;
    const P = [0, 1, 2, 3, 4, 5].map((k) => A.makeCorps('P', 将(k, k < 2 ? 知 : 50), 400, 1600, 75, 75,
      橋 + (k - 2.5) * 60, 中 + 520, -Math.PI / 2, '#2F5D8C'));
    const E = [0, 1, 2].map((k) => A.makeCorps('E', 将(10 + k, 55), 400, 1600, 75, 75,
      橋 + (k - 1) * 260, 中 - 900, Math.PI / 2, '#B0483C'));
    for (const c of [...P, ...E]) { c.formation = '横陣'; A.placeSquads(c, true); c.auto = true; }
    const b = A.createBattle(P, E, 'P');
    b.mode = 'field'; b.phase = 'fight'; b.dusk = 4000; b.face = 'S'; b.myFar = false;
    for (let k = 0; k < 900; k++) {
      A.stepBattle(b, 0.25);
      if (k % 2 === 0) A.battleAI(b);
      if (b.result) break;
    }
    if (b.log.some((x) => /押し渡/.test(x.text))) 押し++;
  }
  return { 押し, 戦 };
}
{
  const 知 = 混ませる(92), 凡 = 混ませる(58);
  確('知略に富む将は、橋が混めば瀬を押し渡る', 知.押し > 0,
    `${知.押し}／${知.戦}戦`);
  確('知略の足りぬ将は、順番を待つ', 凡.押し === 0, `${凡.押し}／${凡.戦}戦`);
}

/* ------------------------------------- 四、水馴れ（知略八十超の足） */
{
  種 = 0x31;
  A.setBattleMap(null);
  let 見 = null;
  for (let i = 1; i < 60 && !見; i++) {
    A.setFieldSeed('sw' + i, 'x'); A.layoutField(6000, 4);
    if (A.hasRiver()) 見 = i;
  }
  const x0 = A.FIELD.w * 0.2;
  const 中 = (A.RIVER.top + A.RIVER.bot) / 2 + A.riverShift(x0);
  const 渡らせる = (wit) => {
    const c = A.makeCorps('P', 将(1, wit), 400, 900, 75, 75, x0, 中, -Math.PI / 2, '#2F5D8C');
    c.formation = '横陣'; A.placeSquads(c, true);
    const e = A.makeCorps('E', 将(9, 55), 400, 900, 75, 75, x0, 中 - 2000, Math.PI / 2, '#B0483C');
    const b = A.createBattle([c], [e], 'P');
    b.mode = 'field'; b.phase = 'fight'; b.dusk = 4000; b.face = 'S'; b.myFar = false;
    c.auto = false;                                   // 采配を挟まず、まっすぐ渡らせる
    A.issueOrder(b, c, { order: '移動', tx: x0, ty: 中 - 600 });
    const y0 = c.y;
    for (let k = 0; k < 60; k++) A.stepBattle(b, 0.25);
    return Math.abs(c.y - y0);
  };
  const 知 = 渡らせる(92), 凡 = 渡らせる(50);
  確('知略八十を超える将は、水の中でも足が鈍りにくい', 知 > 凡 * 1.15,
    `十五秒で 知略五十 ${Math.round(凡)}歩 ／ 知略九十二 ${Math.round(知)}歩`);
  確('それでも水の中で戦う力は落ちたまま', A.TERRAIN.deep.fight < 0.6,
    `淵で戦う力 ${A.TERRAIN.deep.fight}`);
}

/* --------------------- 五、プレイヤーの指図に手を出さないこと（GDD 8.2）

   委任を離れた隊（手ずから命じた隊）には、采配は道を引かない。
   川を渡れと命じたなら、橋へ回さず、そのまま渡らせる。 */
{
  種 = 0x77;
  A.setBattleMap(null);
  let 見 = null;
  for (let i = 1; i < 60 && !見; i++) {
    A.setFieldSeed('pl' + i, 'x'); A.layoutField(9000, 4);
    if (A.hasRiver()) 見 = i;
  }
  const x0 = A.FIELD.w * 0.22;
  const 中 = (A.RIVER.top + A.RIVER.bot) / 2 + A.riverShift(x0);
  const c = A.makeCorps('P', 将(1), 400, 900, 75, 75, x0, 中 + 500, -Math.PI / 2, '#2F5D8C');
  const e = A.makeCorps('E', 将(9), 400, 900, 75, 75, x0, 中 - 500, Math.PI / 2, '#B0483C');
  for (const x of [c, e]) { x.formation = '横陣'; A.placeSquads(x, true); }
  const b = A.createBattle([c], [e], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 4000; b.face = 'S'; b.myFar = false;
  e.auto = true;
  c.auto = false;
  A.issueOrder(b, c, { order: '移動', tx: x0, ty: 中 - 300 });   // 川を突っ切れ、という指図
  const 的 = { x: c.tx, y: c.ty };
  for (let k = 0; k < 8; k++) A.battleAI(b);
  確('手ずから命じた隊の行き先を、采配は書き換えない',
    Math.hypot(c.tx - 的.x, c.ty - 的.y) < 1, `${Math.round(c.tx)},${Math.round(c.ty)}`);
  確('手ずから命じた隊に、勝手な道順をつけない', !c.wp || !c.wp.length,
    c.wp ? `${c.wp.length}地点` : 'なし');
  // 委任した隊には道がつく
  c.auto = true;
  for (let k = 0; k < 3; k++) A.battleAI(b);
  確('委任すれば、采配が地物を避ける道を引く', !!(c.wp && c.wp.length),
    c.wp ? `${c.wp.length}地点` : 'なし');
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
