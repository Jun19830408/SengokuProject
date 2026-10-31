/* 名指しで攻めかかるときに狙う所（battle/corps.js 狙う所・ai.js 名指しの目標）。

   遊ぶ側の申し出は「前後で味方が敵の一隊を挟み撃ちにしており、相手の部隊が間延びしたため、
   真ん中を織田信高の隊で突こうとしたら、なぜか相手の左端(蒲生隊が戦っているほう)に引き寄せ
   られてしまいました。間延びしたところに突撃したかったのですが、何らかの引き寄せが発生して
   いるようなので、修正お願いします」であった。名指しの狙いは敵の隊の芯（旗の居所）へ向けて
   付け直していたので、芯が列の端にある間延びした隊では、どこを突かせても端へ引かれた。
   ここで確かめること。
     一、狙った組を追う … 敵の帳から突撃を命じたあとも、采配の付け直しは狙った組（真ん中）へ向く
     二、近い組を狙う   … 狙った組を控えていなければ、こちらの隊にいちばん近い組へ向く
     三、組が尽きたら   … 狙った組が討ち尽くされれば、近い組へ移る（芯へは戻らない） */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'nerai-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { setBattleMap } from "../src/battle/castleMap.js";\n'
+ 'export { makeCorps, placeSquads, 狙いの組, 狙う所 } from "../src/battle/corps.js";\n'
+ 'export { battleAI } from "../src/battle/ai.js";\n'
+ 'export { createBattle } from "../src/battle/engine.js";\n'
+ 'export { FIELD, layoutField, setFieldKind, setFieldSeed } from "../src/battle/field.js";\n');
const out = path.join(ROOT, 'build', 'nerai.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error' });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x3c17;
Math.random = function () {
  種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const 将 = (i) => ({ id: `g${i}`, name: `将${i}`, lead: 60, valor: 60, wit: 55, gov: 50, retinue: 0, retTrain: 66 });

/* 敵の隊（黒田）を東西に間延びさせる。芯（旗）は西の端、組は東へ六百歩にわたって並ぶ。
   こちらの隊（織田）は列の真ん中の南に立つ */
function 盤() {
  A.setBattleMap(null);
  A.setFieldSeed('nagoya', 'kiyosu');
  A.setFieldKind('街道');
  A.layoutField(6000, 4);
  const cx = A.FIELD.w / 2, cy = A.FIELD.h / 2;
  const 黒田 = A.makeCorps('E', 将(1), 0, 1200, 70, 70, cx - 300, cy, Math.PI / 2, '#B0483C');
  const 織田 = A.makeCorps('P', 将(2), 0, 600, 70, 70, cx, cy + 260, -Math.PI / 2, '#2F5D8C');
  const b = A.createBattle([織田], [黒田], 'P');
  b.phase = 'fight'; b.mode = 'field'; b.陣 = true;
  /* 織田は遊ぶ側が手ずから命じる隊（委任を解く）。黒田の陣形は組み直させない（間延びを保つ） */
  織田.auto = false; 黒田.陣を選んだ = true;
  const 組ら = 黒田.squads.filter((q) => q.men > 0);
  組ら.forEach((q, i) => { q.x = cx - 300 + (600 * i) / Math.max(1, 組ら.length - 1); q.y = cy; });
  return { b, 黒田, 織田, 組ら, cx, cy };
}

console.log('■ 一、狙った組を追う');
{
  const { b, 黒田, 織田, 組ら, cx, cy } = 盤();
  const 真ん中 = A.狙いの組(黒田, cx, cy);
  織田.狙い = 黒田.id; 織田.狙い組 = 真ん中.id; 織田.order = '突撃'; 織田.chargeT = 16;
  A.battleAI(b);
  const 芯まで = Math.hypot(織田.tx - 黒田.x, 織田.ty - 黒田.y), 真ん中まで = Math.hypot(織田.tx - 真ん中.x, 織田.ty - 真ん中.y);
  確('采配の付け直しは、狙った真ん中の組へ向く（隊の芯へ引かれない）', 真ん中まで < 40 && 芯まで > 200,
    `行き先から真ん中の組まで${Math.round(真ん中まで)}歩・芯まで${Math.round(芯まで)}歩`);
}

console.log('■ 二、近い組を狙う');
{
  const { b, 黒田, 織田, cx, cy } = 盤();
  織田.狙い = 黒田.id; 織田.狙い組 = null; 織田.order = '突撃'; 織田.chargeT = 16;
  A.battleAI(b);
  確('狙った組を控えていなければ、こちらにいちばん近い組（真ん中）へ向く', Math.abs(織田.tx - cx) < 80 && Math.hypot(織田.tx - 黒田.x, 織田.ty - 黒田.y) > 200,
    `行き先 ${Math.round(織田.tx - cx)},${Math.round(織田.ty - cy)}（真ん中から）`);
}

console.log('■ 三、狙った組が尽きたら');
{
  const { b, 黒田, 織田, cx, cy } = 盤();
  const 真ん中 = A.狙いの組(黒田, cx, cy);
  織田.狙い = 黒田.id; 織田.狙い組 = 真ん中.id; 織田.order = '突撃'; 織田.chargeT = 16;
  真ん中.men = 0;
  const 所 = A.狙う所(織田, 黒田);
  確('狙った組が討ち尽くされれば、こちらに近い組へ移る（芯へは戻らない）', !!所.組 && 所.組 !== 真ん中 && Math.hypot(所.x - 黒田.x, 所.y - 黒田.y) > 150,
    `移った組まで真ん中から${Math.round(Math.hypot(所.x - cx, 所.y - cy))}歩`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
