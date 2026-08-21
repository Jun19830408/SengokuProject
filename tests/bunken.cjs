/* 分遣の頃合い（GDD 8.5）。

   これまでは戦の初めの二十五秒のうちに、賽の目ひとつで分遣が出ていた。
   橋を見つければ飛びつき、丘を見つければ飛びつき、敵もおらぬのに騎馬が
   側面へ回り、自陣のそばの森を偵察していた。策ではなく、癖である。

   分遣とは、そこに用があるから割くものである。用があるかどうかは、
   誰が、いつ、どこで、を見て判ずる。

     騎馬側面攻撃 … 槍を合わせて六秒――正面が支えられると見てから回り込む。
                    ただし統率・武勇・知略のいずれも七十五を超える将は、
                    当たる少し前（五百二十歩）から回り始めてよい。
     弓鉄砲高地占拠 … 受け手は初めから近くの高みへ（自陣の側の、五百歩ほどの
                      丘に限る）。寄せ手は敵陣の間近まで進んで、まだ誰も
                      取っていない高みが目に入ったときだけ。
     橋渡河点防衛 … 受け手だけ。しかも渡り場が自陣の側にあるときだけ。
     森林偵察 … 敵陣の側の森を探る。自陣のそばの森に敵はおらぬ。
                ただし敵の姿を見失っているなら、伏せられている見込みがある。

   十六戦で測ると、直す前は初めの二十五秒に分遣が湧いた。いまは
     弓鉄砲高地占拠 十七（受け手十五・寄せ手二）
     騎馬側面攻撃   六十四（噛み合う前は零。名将のみ一）
     橋渡河点防衛   二十七（すべて受け手）
     森林偵察       六（すべて寄せ手・平均六十四秒）
   となった。 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'bunken-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { layoutField, setFieldSeed, FIELD, HILLS, FORESTS, RIVER, hasRiver } from "../src/battle/field.js";\n'
+ 'export { makeCorps, placeSquads, corpsMen, detachOptions, 分遣の頃合い } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle, stepBattle } from "../src/battle/engine.js";\n'
+ 'export { setBattleMap } from "../src/battle/castleMap.js";\n');
const out = path.join(ROOT, 'build', 'bunken.cjs');
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
const 将 = (i, o = {}) => ({ id: `g${i}`, name: `将${i}`, lead: o.lead || 62, valor: o.valor || 60,
  wit: o.wit || 66, gov: 55, retinue: 400, retTrain: 70, unity: 60 });

/* ------------------------------------- 一、戦を通して、いつ何が出たかを数える */
function 一戦(i, 名将) {
  種 = 0x6000 + i * 401;
  A.setBattleMap(null); A.setFieldSeed('d' + i, 'x'); A.layoutField(9000, 6);
  const W = A.FIELD.w, H = A.FIELD.h;
  const 器 = 名将 ? { lead: 80, valor: 82, wit: 78 } : {};
  const P = [0, 1, 2].map((k) => A.makeCorps('P', 将(k, k === 0 ? 器 : {}), 400, 1100, 75, 75,
    W * (0.3 + k * 0.2), H * 0.84, -Math.PI / 2, '#2F5D8C'));
  const E = [0, 1, 2].map((k) => A.makeCorps('E', 将(10 + k), 400, 1100, 75, 75,
    W * (0.3 + k * 0.2), H * 0.16, Math.PI / 2, '#B0483C'));
  for (const c of [...P, ...E]) { c.formation = '横陣'; A.placeSquads(c, true); c.auto = true; }
  const b = A.createBattle(P, E, 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1100; b.face = 'S'; b.myFar = false;
  const 出た = [];
  let 触 = null;
  for (let k = 0; k < 3000; k++) {
    A.stepBattle(b, 0.25);
    if (k % 3 === 0) A.battleAI(b);
    if (触 === null && b.corps.some((c) => c.squads.some((q) => q.engaged))) 触 = b.t;
    for (const c of b.corps) {
      if (c.detach && !c.数えた) {
        c.数えた = true;
        const 敵陣 = b.陣[c.side === 'P' ? 'E' : 'P'];
        出た.push({ 任: c.task, t: b.t, 攻: c.side === b.attacker, 触前: 触 === null,
          敵陣まで: Math.hypot(敵陣.x - c.x, 敵陣.y - c.y) / b.陣間 });
      }
    }
    if (b.result) break;
  }
  return 出た;
}
function 集める(名将) {
  const 全 = [];
  for (let i = 0; i < 16; i++) 全.push(...一戦(i, 名将));
  const 数 = {};
  for (const d of 全) {
    const v = 数[d.任] = 数[d.任] || { 計: 0, 攻: 0, 守: 0, 触前: 0, 刻: 0, 敵陣近: 0 };
    v.計++; v[d.攻 ? '攻' : '守']++; if (d.触前) v.触前++; v.刻 += d.t;
    if (d.敵陣まで < 0.75) v.敵陣近++;
  }
  return 数;
}
{
  const 並 = 集める(false);
  const 名 = 集める(true);
  const 見 = (数, k) => 数[k] || { 計: 0, 攻: 0, 守: 0, 触前: 0, 刻: 0, 敵陣近: 0 };

  const 騎 = 見(並, '騎馬側面攻撃');
  確('騎馬の側面攻撃は、槍を合わせてから出す', 騎.計 > 0 && 騎.触前 === 0,
    `十六戦で${騎.計}回、いずれも噛み合ったあと（平均${Math.round(騎.刻 / Math.max(1, 騎.計))}秒）`);
  const 騎名 = 見(名, '騎馬側面攻撃');
  確('統率・武勇・知略いずれも七十五を超える将は、当たる前から回り込める',
    騎名.触前 > 0, `名将を入れると噛み合う前に${騎名.触前}回`);

  const 橋 = 見(並, '橋渡河点防衛');
  確('渡河点の守りは受け手だけが出す', 橋.計 > 0 && 橋.攻 === 0,
    `十六戦で${橋.計}回、すべて受け手`);

  const 丘 = 見(並, '弓鉄砲高地占拠');
  確('高地占拠は受け手が先に出す', 丘.守 > 丘.攻,
    `受け手${丘.守}・寄せ手${丘.攻}`);
  確('受け手の高地占拠は戦の初めに出る', 丘.触前 > 丘.計 * 0.5,
    `${丘.触前}／${丘.計}回が噛み合う前`);

  /* 森林偵察は敵陣の側の森を探る。ただし敵の姿を見失っているときは、
     手近な森であれば自陣の側でも探る（伏せられている見込みがあるため）。
     したがって「すべてが敵陣の側」とまでは言えない。大半がそうであればよい。 */
  const 森 = 見(並, '森林偵察');
  確('森林偵察は、おおむね敵陣の側で出す', 森.計 === 0 || 森.敵陣近 >= 森.計 * 0.6,
    森.計 ? `${森.計}回のうち敵陣寄りが${森.敵陣近}回（平均${Math.round(森.刻 / 森.計)}秒）` : '出ず');
}

/* --------------------- 二、自陣のそばでは、どの分遣も頃合いではないこと */
{
  種 = 0x91;
  A.setBattleMap(null);
  let 見つけた = null;
  for (let i = 1; i < 60 && !見つけた; i++) {
    A.setFieldSeed('e' + i, 'x'); A.layoutField(9000, 6);
    if (A.hasRiver() && A.HILLS.length && A.FORESTS.length) 見つけた = i;
  }
  const W = A.FIELD.w, H = A.FIELD.h;
  const P = [0, 1].map((k) => A.makeCorps('P', 将(k), 400, 1100, 75, 75,
    W * (0.35 + k * 0.2), H * 0.9, -Math.PI / 2, '#2F5D8C'));
  const E = [0, 1].map((k) => A.makeCorps('E', 将(10 + k), 400, 1100, 75, 75,
    W * (0.35 + k * 0.2), H * 0.1, Math.PI / 2, '#B0483C'));
  for (const c of [...P, ...E]) { c.formation = '横陣'; A.placeSquads(c, true); c.auto = true; }
  const b = A.createBattle(P, E, 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 1100; b.face = 'S'; b.myFar = false;
  for (const c of b.corps) c.seen = true;             // 見失ってはいない
  const 寄 = P[0];                                     // 寄せ手。自陣に立っている
  確('寄せ手は、自陣にいるうちは渡河点を守らない', !A.分遣の頃合い(b, 寄, '橋渡河点防衛'),
    '守るべきものが後ろにない');
  確('寄せ手は、自陣のそばで森を探らない', !A.分遣の頃合い(b, 寄, '森林偵察'),
    '自陣の森に敵はおらぬ');
  確('騎馬は、まだ当たってもいないのに回り込まない',
    !A.分遣の頃合い(b, 寄, '騎馬側面攻撃'), '並の将であれば');
  // 名将なら、敵が間近に迫れば当たる前でも回り込める
  const 名 = A.makeCorps('P', 将(9, { lead: 80, valor: 82, wit: 78 }), 400, 1100, 75, 75,
    E[0].x + 300, E[0].y + 300, -Math.PI / 2, '#2F5D8C');
  A.placeSquads(名, true);
  b.corps.push(名);
  確('名将は、敵が間近なら当たる前でも回り込む', A.分遣の頃合い(b, 名, '騎馬側面攻撃'),
    `敵まで${Math.round(Math.hypot(E[0].x - 名.x, E[0].y - 名.y))}歩`);
  A.setBattleMap(null);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
