/* 収まり ─ 大軍が盤からはみ出さぬこと、城攻めで兵が減らぬこと（GDD 8.1／9.3）。

   一、大軍ほど広い野

       隊の数を二十四、幅を七千二百歩で頭打ちにしていた。号令や援軍で三十隊を
       超える戦になると、盤が足りずに隊が端へ押しつけられ、絵として外へこぼれた。
       頭打ちを三十二隊・八千六百歩まで伸ばす。

   二、組ごと盤の内へ引き戻す

       布陣の席は盤の内に取ってあるが、隊には広がりがある――中心が縁の内でも、
       組は外へこぼれる。援軍や寄騎で隊が増えると席が端へ寄り、なおさらはみ出す。
       どの隊も、組ごと盤の内に収まるまで引き戻す。留めはここで検める。

   三、城攻めの寄せ手

       一隊の兵には上限がある（城の中は狭い。三千で一隊）。ところが隊の数を
       将の数だけに縛っていたので、九万の軍でも将が四人なら一万二千しか
       攻め口に立てなかった――遊ぶ側からは「野戦では九万いたのに城攻めでは
       一万二千になった」と見える。兵の数でも隊を割る。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let _s = 515151 >>> 0;
Math.random = function () { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 将 = (i) => ({ id: 'g' + i, name: '某' + i, lead: 64, war: 60, pol: 50, intel: 50,
  exp: 40, wit: 60, valor: 60, arms: { yari: 50, yumi: 20, teppo: 10, kiba: 20 } });

console.log('■ 一、隊が増えれば野も広がる');
{
  H.setFieldSeed('a', 'b'); H.setBattleMap(null);
  H.layoutField(6000, 2);   const 小 = { w: H.FIELD.w, h: H.FIELD.h };
  H.layoutField(90000, 32); const 大 = { w: H.FIELD.w, h: H.FIELD.h };
  確('三十二隊の大軍では八千六百歩の野になる', 大.w >= 8600,
    `二隊 ${小.w}×${小.h}歩 → 三十二隊 ${大.w}×${大.h}歩`);
  /* 頭打ちに当たらない兵数で、隊数の効きだけを見る。 */
  H.layoutField(6000, 24); const 二四 = H.FIELD.w;
  H.layoutField(6000, 32); const 三二 = H.FIELD.w;
  確('隊数の頭打ちは三十二（二十四で止めない）', 三二 > 二四 + 500,
    `六千の兵で 二十四隊 ${二四}歩 → 三十二隊 ${三二}歩`);
}

console.log('■ 二、どの隊も組ごと盤の内に収まる');
{
  H.setFieldSeed('a', 'b'); H.setBattleMap(null);
  H.layoutField(96000, 32);
  const 端 = 60;
  const 縁に置く = () => {
    const ls = [];
    for (let i = 0; i < 32; i++) {
      /* わざと四隅と四辺の外へ押し出して置く。援軍で席が足りなくなった様である。 */
      const x = [-300, 20, H.FIELD.w / 2, H.FIELD.w - 20, H.FIELD.w + 400][i % 5];
      const y = [-200, 30, H.FIELD.h / 2, H.FIELD.h - 30, H.FIELD.h + 260][Math.floor(i / 5) % 5];
      ls.push(H.makeCorps(i % 2 ? 'P' : 'E', 将(i), 1500, 1500, 80, 80, x, y, -Math.PI / 2, '#2F5D8C'));
    }
    for (const c of ls) H.placeSquads(c, true);
    return ls;
  };
  const ls = 縁に置く();
  const はみ出し = (ls2) => ls2.filter((c) => c.squads.some((q) =>
    q.x < 0 || q.y < 0 || q.x > H.FIELD.w || q.y > H.FIELD.h)).length;
  const 前 = はみ出し(ls);
  const 直 = H.盤に収める(ls, 端);
  const 後 = はみ出し(ls);
  確('置いたままでは盤の外へこぼれる隊がある', 前 > 0, `${前}隊`);
  確('収めたあとは、どの隊も組ごと盤の内', 後 === 0, `${前}隊 → ${後}隊（${直}隊を引き戻した）`);
  const 中 = ls.every((c) => c.x >= 0 && c.x <= H.FIELD.w && c.y >= 0 && c.y <= H.FIELD.h);
  確('隊の中心も盤の内にある', 中);
  /* すでに内にある隊は動かさない。 */
  const 内 = [H.makeCorps('P', 将(99), 1200, 1200, 80, 80, H.FIELD.w / 2, H.FIELD.h / 2, -Math.PI / 2, '#2F5D8C')];
  H.placeSquads(内[0], true);
  const x0 = 内[0].x, y0 = 内[0].y;
  H.盤に収める(内, 端);
  確('もともと内にいる隊は動かさない', 内[0].x === x0 && 内[0].y === y0);
}

console.log('■ 三、城攻めの寄せ手は兵の数でも隊を割る');
{
  const CAP = 3000, MAX = 32;
  const 数 = (将数, 兵) => H.寄せ手の隊数(将数, 兵, CAP, MAX);
  const n = 数(4, 90000);
  確('将四人・九万の軍でも三十隊が攻め口に就く', n === 30, `${n}隊`);
  確('攻め口に立てる兵が九万に届く', Math.min(n * CAP, 90000) === 90000,
    `${Math.min(n * CAP, 90000)}人（直す前は ${Math.min(4 * CAP, 90000)}人）`);
  確('将の数のほうが多ければ、将の数だけ隊を立てる', 数(9, 12000) === 9, `${数(9, 12000)}隊`);
  確('小勢なら一隊', 数(1, 100) === 1);
  確('三十二隊で頭打ち', 数(40, 300000) === MAX, `${数(40, 300000)}隊`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
