/* 側面・背面を衝く（GDD 8.3）。

   遊ぶ側から「敵の側面や背後まで回ってから接戦・突撃を命じても、隊が敵の
   前方へ向かって動いてしまう」との報せがあった。測ると、元は四つあった。

     一、触れ合う隔たりに二十六歩の蓋をしていた。塊の大きさが消えるので、
         横に四十歩ずれた二隊は互いの腹を擦り抜け、横腹へ回り込んだはずの
         隊が敵の正面に立っていた。いまは席の差し渡しで測る（engine の
         触れる隔たり、corps の 席の差し渡しを焼く）。

     二、陣の向きが、組が一つ討たれるたびに隊の向きへ同期していた。横腹を
         噛まれて組が削られるたび、押し戻される歩みの向きへ陣形ごと回って
         いた（corps の placeSquads）。

     三、噛み合っている隊が、押し戻される歩みの向きへ向き直っていた。兵が
         そちらへ顔を向けるのはよいが、陣ごと回るには「転回」の下知が要る
         （engine の歩みの段）。

     四、横撃の利を「噛まれている組の顔の向き」で測っていた。組は間近の敵へ
         顔を向けるので、横から噛まれてもすぐ振り向き、利がほとんど立たな
         かった。軸は陣の向きに取る。

   そのうえで、横腹・背を噛まれた隊は「陣形の乱れ」を負う。内に敵を入れた隊は
   列が割れ、攻めが三割落ち、受けが三割五分ぶん脆くなる。陣ごと向き直るには
   転回の下知が要り、そのあいだ陣形が削れる――これが回り込みの対価である。

   測る組 一（千五百の守備隊を千五百で正面から抑え、さらに千で当てる）

                       正面     側面     背面
     乱れの延べ           〇     二二八    四六二
     当てた側を保つ      百分     百分     百分

   測る組 二（千五百の守備隊へ、千五百が一隊だけで当たる）

                       正面     側面     背面
     赤を討つ           六八八   八四二   八七六
     青が失う           六七三   七六七   二五九
     乱れの延べ           〇      四八    五七七

   正面から当たれば互角、横から衝けば押し、背から衝けば三分の一の損じで
   討ち勝つ。回り込みが戦の綾になった。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 将 = (i, nm) => ({ id: 'g' + i, name: nm, lead: 70, valor: 70, wit: 60, gov: 55,
  retinue: 0, retTrain: 74, unity: 62, arms: { yari: 55, yumi: 20, teppo: 12, kiba: 13 } });

/* 置＝'正'|'横'|'背'。赤は北を向いて守り、甲が正面から抑え、乙がその側から当たる。
   野は川のないものを選ぶ（川を挟むと、岸で足が止まって測りにならない）。 */
function 当てる(置, 命 = '接戦', 刻数 = 600) {
  let _s = 0x55;
  Math.random = function () { _s |= 0; _s = (_s + 0x6D2B79F5) | 0;
    let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | _s)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  H.setFieldSeed('a', 'a'); H.setFieldKind('街道'); H.setBattleMap(null);
  H.layoutField(4000, 2);
  const W = H.FIELD.w, Hh = H.FIELD.h, cx = W / 2, cy = Hh * 0.5;
  const E = H.makeCorps('E', 将(2, '赤'), 0, 1500, 78, 78, cx, cy, -Math.PI / 2, '#B0483C');
  const A = H.makeCorps('P', 将(1, '甲'), 0, 1500, 78, 78, cx, cy - 240, Math.PI / 2, '#2F5D8C');
  const 位 = { 正: [150, -240], 横: [260, 0], 背: [0, 260] }[置];
  const 向 = { 正: Math.PI / 2, 横: Math.PI, 背: -Math.PI / 2 }[置];
  const B = H.makeCorps('P', 将(3, '乙'), 0, 1000, 78, 78, cx + 位[0], cy + 位[1], 向, '#2F5D8C');
  for (const c of [A, B, E]) H.placeSquads(c, true);
  const 元兵 = H.corpsMen(E);
  const b = H.createBattle([A, B], [E], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 3000; b.face = 'S'; b.myFar = false;
  // 采配は止める。測るのは盤の理であって、委任の判断ではない。
  b.aiClock = 1e9;
  for (const c of b.corps) c.auto = false;
  H.issueOrder(b, E, { order: '守備', tx: E.x, ty: E.y }, { 即: true });
  const 掛ける = (c) => {
    const d = Math.hypot(c.x - E.x, c.y - E.y) || 1;
    H.issueOrder(b, c, { order: 命, target: E.id, 狙い: E.id,
      tx: E.x + ((c.x - E.x) / d) * 38, ty: E.y + ((c.y - E.y) / d) * 38 }, { 即: true });
  };
  掛ける(A); 掛ける(B);
  let 乱 = 0, 守 = 0, 噛刻 = 0, 顔 = 0, 顔の数 = 0;
  for (let k = 0; k < 刻数; k++) {
    H.stepBattle(b, 0.2);
    乱 += (E.乱れ || 0);
    // 名指しの目標は、敵が動けば狙いを付け直す（ai.js の「名指しの目標」と同じ筋）
    if (k % 5 === 4) {
      for (const c of [A, B]) {
        if (c.destroyed || c.routed || c.withdraw || c.squads.some((q) => q.engaged)) continue;
        掛ける(c);
      }
    }
    if (B.squads.some((q) => q.engaged) && !B.destroyed && !E.destroyed) {
      噛刻++;
      // 赤の陣の向きを軸に、乙がどの帯に居るかを見る
      const 陣 = E.陣向き == null ? E.facing : E.陣向き;   // 以下の顔の測りにも使う
      const a = Math.atan2(B.y - E.y, B.x - E.x);
      const r = Math.abs(((a - 陣 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 180 / Math.PI;
      const 帯 = { 正: [0, 70], 横: [35, 145], 背: [110, 180] }[置];
      if (r >= 帯[0] && r <= 帯[1]) 守++;
      /* 噛み合っている赤の組の顔が、陣の向きより敵のほうへ寄っているか。

         切り捨ての角で数えるのではなく、「敵へのずれ」と「陣の向きへのずれ」を
         比べる。兵は敵へ顔を向けるが、乱れた組は向きが揺れる（engine の
         q.facing を参照）ので、ある角の内に何割という測りでは荒い。 */
      if (置 === '横') {
        for (const q of E.squads) {
          if (q.men <= 0 || !q.engaged || !q.foe) continue;
          const f = Math.atan2(q.foe.y - q.y, q.foe.x - q.x);
          const ずれ = (a) => Math.abs(((a - q.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          // 横腹を噛まれている組だけを見る（正面で甲と噛み合う組は、陣の向きのままで当然）
          const 横から = Math.abs(((f - 陣 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > 1.0;
          if (!横から) continue;
          顔の数++;
          顔 += ずれ(陣) - ずれ(f);          // ＋なら敵のほうを向いている
        }
      }
    }
  }
  const 陣 = E.陣向き == null ? E.facing : E.陣向き;
  return { 置, 討: Math.round(元兵 - H.corpsMen(E)), 乱: Math.round(乱),
    保ち: 噛刻 ? 守 / 噛刻 : 0, 噛刻, 陣, 顔: 顔の数 ? 顔 / 顔の数 : 0 };
}

console.log('■ 一、当てた側を保つ（敵の前方へ回り込まない）');
const 正 = 当てる('正'), 横 = 当てる('横'), 背 = 当てる('背');
for (const r of [正, 横, 背]) {
  確(`${r.置}から当てた隊は、その帯で噛み合い続ける`, r.噛刻 > 60 && r.保ち > 0.9,
    `保ち ${(r.保ち * 100).toFixed(0)}%（噛んだ刻 ${r.噛刻}）`);
}
確('守る隊の陣の向きは、北のまま（転回していない）',
  Math.sin(横.陣) < -0.7 && Math.sin(背.陣) < -0.7,
  `側面のとき ${Math.round(横.陣 * 180 / Math.PI)}度・背面のとき ${Math.round(背.陣 * 180 / Math.PI)}度`);

console.log('■ 二、横腹・背を噛まれると陣形が乱れる');
確('正面から当てても陣形は乱れない', 正.乱 <= 20, `乱れの延べ ${正.乱}`);
確('横腹を噛まれれば乱れる', 横.乱 >= 25, `乱れの延べ ${横.乱}`);
確('背を噛まれれば、より乱れる', 背.乱 > 横.乱 * 2, `側面 ${横.乱}・背面 ${背.乱}`);

/* 一隊だけで、同じ数の守備隊へ当たる。正面・側面・背面で勝ち負けが変わるか。 */
function 一隊で当てる(置, 刻数 = 600) {
  let _s = 0x55;
  Math.random = function () { _s |= 0; _s = (_s + 0x6D2B79F5) | 0;
    let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | _s)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  H.setFieldSeed('a', 'a'); H.setFieldKind('街道'); H.setBattleMap(null);
  H.layoutField(4000, 2);
  const W = H.FIELD.w, Hh = H.FIELD.h, cx = W / 2, cy = Hh * 0.5;
  const E = H.makeCorps('E', 将(2, '赤'), 0, 1500, 78, 78, cx, cy, -Math.PI / 2, '#B0483C');
  const 位 = { 正: [0, -260], 横: [260, 0], 背: [0, 260] }[置];
  const 向 = { 正: Math.PI / 2, 横: Math.PI, 背: -Math.PI / 2 }[置];
  const P = H.makeCorps('P', 将(1, '青'), 0, 1500, 78, 78, cx + 位[0], cy + 位[1], 向, '#2F5D8C');
  for (const c of [P, E]) H.placeSquads(c, true);
  const 元赤 = H.corpsMen(E), 元青 = H.corpsMen(P);
  const b = H.createBattle([P], [E], 'P');
  b.mode = 'field'; b.phase = 'fight'; b.dusk = 3000; b.face = 'S'; b.myFar = false;
  b.aiClock = 1e9;
  for (const c of b.corps) c.auto = false;
  H.issueOrder(b, E, { order: '守備', tx: E.x, ty: E.y }, { 即: true });
  const 掛ける = () => {
    const d = Math.hypot(P.x - E.x, P.y - E.y) || 1;
    H.issueOrder(b, P, { order: '接戦', target: E.id, 狙い: E.id,
      tx: E.x + ((P.x - E.x) / d) * 38, ty: E.y + ((P.y - E.y) / d) * 38 }, { 即: true });
  };
  掛ける();
  for (let k = 0; k < 刻数; k++) {
    H.stepBattle(b, 0.2);
    if (k % 5 === 4 && !P.destroyed && !P.routed && !P.withdraw
        && !P.squads.some((q) => q.engaged)) 掛ける();
  }
  return { 置, 討: Math.round(元赤 - H.corpsMen(E)), 損: Math.round(元青 - H.corpsMen(P)) };
}

console.log('■ 三、一隊で当たるなら、背から衝けば討ち勝つ');
const 一正 = 一隊で当てる('正'), 一横 = 一隊で当てる('横'), 一背 = 一隊で当てる('背');
確('正面からでは、互いに同じだけ削られる', Math.abs(一正.討 - 一正.損) < 一正.討 * 0.25,
  `討ち ${一正.討}人・損じ ${一正.損}人`);
確('横から衝けば、正面より多く討てる', 一横.討 > 一正.討 * 1.1,
  `正面 ${一正.討}人・側面 ${一横.討}人`);
確('背から衝けば、損じが半分より軽い', 一背.損 < 一正.損 * 0.5,
  `正面の損じ ${一正.損}人・背面の損じ ${一背.損}人（討ちは ${一背.討}人）`);

console.log('■ 四、噛まれた兵は敵のほうへ顔を向ける');
確('横から噛まれた赤の組の顔は、陣の向きより敵のほうへ寄る', 横.顔 > 0.3,
  `陣の向きより ${(横.顔 * 180 / Math.PI).toFixed(0)}度ぶん敵へ寄っている`);

console.log('■ 五、突撃でも側を保つ');
const 横突 = 当てる('横', '突撃'), 背突 = 当てる('背', '突撃');
確('突撃でも当てた側を保つ', 横突.保ち > 0.9 && 背突.保ち > 0.9,
  `側面 ${(横突.保ち * 100).toFixed(0)}%・背面 ${(背突.保ち * 100).toFixed(0)}%`);

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
