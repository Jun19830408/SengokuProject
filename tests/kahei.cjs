/* 寡兵で勝てるか（GDD 8.1 / 8.7 / 6.2）。

   遊ぶ側の申し出は「一万対七千で、遊ぶ側の腕次第で勝てるか。地形・武将の
   パラメータ・軍の使い方で勝てるか」であった。測ったところ、勝てなかった。

   直す前（寡兵六千・四隊ずつ・各十二回・少ない側の勝率）

                      1:1.00 1:1.20 1:1.43 1:1.67 1:2.00
     素（同条件）        67%     0%     0%     0%     0%
     丘に拠る            50%     0%     0%     0%     0%   ← 拠ると下がる
     山に拠る            33%     0%     0%     0%     0%
     器量90（対60）      75%     8%     0%     0%     0%
     器量90・敵45        83%    25%     0%     0%     0%
     練度88（対70）      58%     0%     0%     0%     0%
     丘＋器量90＋練88    92%    17%     0%     0%     0%

   元は四つあった。

     一、委任の隊が高みから下りる。拠らせた丘に居たのは刻の四割三分、山なら
         一割八分（裾から平均四百三十五歩、最も遠いときで千七百三十四歩）。
         山は HILLS から抜かれて MOUNTAINS へ移るので、采配は山を見てさえ
         いなかった。だから拠るほど勝率が下がった。
     二、高みの利（TERRAIN.fight）が「その地べたに立っていれば付く」もので、
         山へ攻め登る隊にも頂の隊と同じ一.二八が付いていた。
     三、器量九十の将の白兵の取り分が、六十の将に比べてわずか一割。武勇は
         騎馬の駆けにしか効かず、兵の二割にしか届かない。
     四、練度が「落ち着く先」（統率だけで決まる）に吸われて消える。練度
         八十八の精鋭も、統率六十の将の下では六十九へ収束した。

   加えて、一隊を森に伏せるだけで兵力差に関わりなく勝率七割五分になる抜け道が
   あった（打ち破り零・攻めあぐね九・交換比〇.五五〜〇.八九）。伏せた隊は
   噛めないので、寄せ手が取り付く相手を失い、百八十秒の膠着で「攻めあぐねた」と
   裁かれる。野には寄せ手しか立っていないのに、である。

   ここで縛るのは、直したあとの筋である。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 種を置く = (n) => { let _s = (n * 2654435761) >>> 0;
  Math.random = function () { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const 将 = (id, 器 = {}) => ({ id, name: id, lead: 器.lead || 60, valor: 器.valor || 60,
  wit: 器.wit || 55, gov: 55, retinue: 0, retTrain: 70, unity: 62 });

function 一戦(賽, o) {
  const { 寡兵, 衆兵, 拠る = null, 守る = false, 伏せ = 0,
    寡器 = {}, 衆器 = {}, 寡練 = 70, 衆練 = 70 } = o;
  種を置く(賽);
  H.setBattleMap(null); H.setFieldSeed('k' + 賽, 'z' + 賽);
  H.setFieldKind(拠る === '山' ? '難所' : '街道');
  H.layoutField(寡兵 + 衆兵, 8);
  const W = H.FIELD.w, Hh = H.FIELD.h;
  let px = W / 2, py = Hh * 0.68, 拠れた = false;
  if (拠る) {
    const 群 = 拠る === '山' ? H.MOUNTAINS : 拠る === '森' ? H.FORESTS : H.HILLS;
    const g = 群.filter((h) => h.y > Hh * 0.5).sort((a, b) => b.r - a.r)[0];
    if (g) { px = g.x; py = g.y; 拠れた = true; }
  }
  const P = [], E = [];
  for (let i = 0; i < 4; i++)
    P.push(H.makeCorps('P', 将('p' + i, 寡器), 0, Math.round(寡兵 / 4), 寡練, 寡練,
      px + (i - 1.5) * 200, py, -Math.PI / 2, '#2F5D8C'));
  for (let i = 0; i < 4; i++)
    E.push(H.makeCorps('E', 将('e' + i, 衆器), 0, Math.round(衆兵 / 4), 衆練, 衆練,
      W / 2 + (i - 1.5) * 240, Hh * 0.28, Math.PI / 2, '#B0483C'));
  const b = H.createBattle(P, E, 'E');
  b.mode = 'field'; b.dusk = 600; b.phase = 'fight'; b.face = 'S'; b.myFar = false; b.陣 = true;
  for (const c of b.corps) H.placeSquads(c, true);
  for (const c of E) c.auto = true;
  for (let i = 0; i < P.length; i++) {
    const c = P[i];
    c.auto = !(守る || 伏せ);
    if (伏せ && i < 伏せ) {
      const f = [...H.FORESTS, ...H.WOODS, ...H.VILLAGES].filter((o2) => o2.y > Hh * 0.5)
        .sort((a, z) => Math.hypot(a.x - W / 2, a.y - py) - Math.hypot(z.x - W / 2, z.y - py))[0];
      if (f) { c.x = f.x; c.y = f.y; H.placeSquads(c, true); c.ambush = true; c.revealed = false; }
      H.issueOrder(b, c, { order: '待機', tx: c.x, ty: c.y });
      continue;
    }
    if (守る) H.issueOrder(b, c, { order: '守備', tx: c.x, ty: c.y });
  }
  for (let k = 0; k < 2600 && b.phase !== 'over'; k++) {
    H.stepBattle(b, 0.25);
    if (k % 4 === 0) H.battleAI(b);
  }
  const 文 = (b.log || []).map((x) => x.text).join(' ');
  const 由 = /攻めあぐね|攻め口を開けぬ/.test(文) ? '攻めあぐね'
    : /立ちはだかる者は無く|野に立つ者を失い/.test(文) ? '塞ぐ者なし'
    : /日が落ちた/.test(文) ? '日没' : '打ち破った';
  const 残 = (ls) => ls.filter((c) => !c.dead && !c.destroyed)
    .reduce((t, c) => t + c.squads.reduce((u, q) => u + Math.max(0, q.men), 0), 0);
  return { 果: b.result || '日没', 由, 寡残: 残(P), 衆残: 残(E), 拠れた };
}

const 回 = 12, 寡兵 = 6000;
const 測る = (作り, 比) => {
  let 勝 = 0, 寡損 = 0, 衆損 = 0;
  const 由数 = {};
  for (let s = 0; s < 回; s++) {
    const 衆兵 = Math.round(寡兵 * 比);
    const r = 一戦(s + 1, { ...作り, 寡兵, 衆兵 });
    if (r.果 === 'P') { 勝++; 由数[r.由] = (由数[r.由] || 0) + 1; }
    寡損 += 寡兵 - r.寡残; 衆損 += 衆兵 - r.衆残;
  }
  return { 勝率: 勝 / 回, 交換比: 衆損 / Math.max(1, 寡損), 由数 };
};

console.log('── 一　梃子がなければ、数がそのまま勝敗である');
{
  const a = 測る({}, 1.0), b2 = 測る({}, 1.43);
  確('互角なら五分に近い', a.勝率 >= 0.3 && a.勝率 <= 0.8, `勝率 ${Math.round(a.勝率 * 100)}%`);
  確('一.四三倍の兵に、素手では勝てない', b2.勝率 <= 0.17, `勝率 ${Math.round(b2.勝率 * 100)}%`);
}

console.log('\n── 二　高みに拠れば、兵力差を覆せる（遊ぶ側が保つ）');
{
  const 丘 = 測る({ 拠る: '丘', 守る: true }, 1.43);
  const 山 = 測る({ 拠る: '山', 守る: true }, 1.43);
  確('丘を守れば一.四三倍を覆しうる', 丘.勝率 >= 0.25,
    `勝率 ${Math.round(丘.勝率 * 100)}%・交換比 ${丘.交換比.toFixed(2)}`);
  確('山を守ればなお強い', 山.勝率 >= 0.42,
    `勝率 ${Math.round(山.勝率 * 100)}%・交換比 ${山.交換比.toFixed(2)}`);
  確('高みの勝ちは、打ち破った勝ちである', (山.由数.打ち破った || 0) >= (山.由数.攻めあぐね || 0),
    JSON.stringify(山.由数));
}

console.log('\n── 三　采配に任せても、高みは利く（拠るほど弱くならない）');
{
  const 素 = 測る({}, 1.0), 丘 = 測る({ 拠る: '丘' }, 1.0), 山 = 測る({ 拠る: '山' }, 1.0);
  確('委任でも丘は素より強い', 丘.勝率 >= 素.勝率,
    `素 ${Math.round(素.勝率 * 100)}% → 丘 ${Math.round(丘.勝率 * 100)}%`);
  確('委任でも山は素より強い', 山.勝率 >= 素.勝率,
    `素 ${Math.round(素.勝率 * 100)}% → 山 ${Math.round(山.勝率 * 100)}%`);
}

console.log('\n── 四　器量と練度は、兵力差を動かす');
{
  const 素 = 測る({}, 1.2);
  const 名将 = 測る({ 寡器: { lead: 90, valor: 90, wit: 85 }, 衆器: { lead: 45, valor: 45, wit: 40 } }, 1.2);
  const 合 = 測る({ 寡器: { lead: 90, valor: 90, wit: 85 }, 寡練: 88 }, 1.2);
  確('名将が凡将の一.二倍の兵に勝ちうる', 名将.勝率 >= 0.4,
    `素 ${Math.round(素.勝率 * 100)}% → 名将 ${Math.round(名将.勝率 * 100)}%`);
  確('名将＋精鋭も一.二倍を覆しうる', 合.勝率 >= 0.4, `勝率 ${Math.round(合.勝率 * 100)}%`);
  確('どちらも素より強い', 名将.勝率 > 素.勝率 && 合.勝率 > 素.勝率);
}

console.log('\n── 五　伏兵で膠着を買う抜け道は、ふさがっている');
{
  for (const 比 of [1.43, 2.0, 3.0]) {
    const r = 測る({ 拠る: '丘', 守る: true, 伏せ: 1 }, 比);
    確(`一対${比.toFixed(2)}で、伏せただけでは勝てない`, r.勝率 <= 0.34,
      `勝率 ${Math.round(r.勝率 * 100)}%　${JSON.stringify(r.由数)}`);
  }
}

console.log(`\nエラー: ${咎.length ? 咎.join(' / ') : 'なし'}`);
process.exit(咎.length ? 1 : 0);
