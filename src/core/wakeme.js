/* ==========================================================================
   天下分け目（GDD 12.6）

   大身の家どうしが、一戦で大勢を決する。号令とは別の道である。号令が
   「天下人が諸大名を動かして一城を攻める」のに対し、こちらは「肩を並べる
   二家が、全軍を野に出して雌雄を決する」。

   ------------------------------------------------------------------ 考え方

   一戦で相手の版図を丸ごと取れる形にはしない。関ヶ原の後も佐和山は城攻めに
   なった。天下分け目は城攻めを飛ばすものではなく、城攻めをしやすくするもので
   ある。勝者が得るのは、接した一国（最大五城）と、三年ほどの兵力の優位だけ
   である。

   出し惜しみはできない。逃散が「敗走した兵の割」で決まる以上、兵を小出しに
   して痛みを避けられては意味がない。よって、応じる家は直轄・従属・臣従の
   すべての城から、留守居を除いた兵を残らず出す。遊ぶ側が決めるのは「誰に何を
   預けるか」だけである。

   野は器量くらべで選ぶ。知略を倍に見て、統率と武勇を足す――地の利を読むのは
   第一に知略だからである。上回った側が十一枚から選ぶ。これがあるので、数で
   劣る家でも、当主が知恵者なら畷のような野を選んで支えられる。
   ========================================================================== */
import { clamp } from "./util.js";
import { newRoster } from "./roster.js";
import { relKey, relOf, 主家 } from "./state.js";
import { courtRank } from "./province.js";
import { 出せる兵, 旗の下の家ら } from "./gourei.js";
import { 国が隣り合うか } from "./rank.js";
import { marchMonths } from "./paths.js";
import { 家の当主 } from "./kiryou.js";
import { 分け目の野 } from "../data/wakemeba.js";

export const 分け目の限り = 32;              // 片軍に立てられる隊の数
export const 分け目の暮れ = 4400;            // 日没まで（常の合戦は二千四百）
export const 挑む直轄 = 2000000;             // 直轄二百万石で挑める
export const 挑まれる版図 = 1200000;         // 相手は版図百二十万石以上
export const 再び挑める月 = 60;              // 一度決したら、五年は挑めない
export const 再び挑める信用 = 45;            // 勝者との信用が薄れる目安（五年でここへ戻る）
export const 集結の限り = 6;                 // 兵が寄るのを待つのは長くて半年

/* ------------------------------------------------------------------ 石高 */
export const 直轄の石高 = (s, fid) =>
  (s.castles || []).filter((c) => c.faction === fid).reduce((a, c) => a + (c.koku || 0), 0);

/* 版図＝直轄に、旗の下（従属・臣従）の家の石高を足したもの。 */
export function 版図の石高(s, fid) {
  let k = 直轄の石高(s, fid);
  for (const f of 旗の下の家ら(s, fid)) k += 直轄の石高(s, f);
  for (const f of Object.keys(s.factions || {})) {
    if (f === fid) continue;
    const r = (s.relations || {})[relKey(fid, f)];
    if (r && r.state === "従属" && r.master === fid) k += 直轄の石高(s, f);
  }
  return k;
}

/* 生きている家を版図の石高で並べる（大きい順）。 */
export function 石高の順(s) {
  return Object.keys(s.factions || {})
    .filter((f) => (s.castles || []).some((c) => c.faction === f))
    .map((f) => ({ f, 石: 版図の石高(s, f) }))
    .sort((a, b) => b.石 - a.石);
}

/* 相手は自家の一つ上か一つ下か。旗の下に入っている家は数えない
   （すでに臣従している家へ挑むのは戦ではなく仕置である）。 */
export function 並びの隣か(s, 主, 的) {
  const 順 = 石高の順(s).filter((x) => {
    if (x.f === 主) return true;
    const r = (s.relations || {})[relKey(主, x.f)];
    if (r && (r.state === "臣従" || r.state === "従属") && r.master === 主) return false;
    return true;
  });
  const i = 順.findIndex((x) => x.f === 主), j = 順.findIndex((x) => x.f === 的);
  return i >= 0 && j >= 0 && Math.abs(i - j) === 1;
}

/* ------------------------------------------------------------ 挑めるか */
export function 天下分け目を挑めるか(s, 主, 的) {
  if (!主 || !的 || 主 === 的) return { ok: false, why: "相手がない。" };
  if (s.分け目) return { ok: false, why: "すでに天下分け目の最中である。" };
  if (!(s.factions || {})[的] || !(s.castles || []).some((c) => c.faction === 的)) {
    return { ok: false, why: "その家はもう盤にない。" };
  }
  const 位 = courtRank(s, 主);
  const 直 = 直轄の石高(s, 主);
  if (!位 && 直 < 挑む直轄) {
    return { ok: false, why: `天下分け目を挑めるのは、右大臣以上の位を得た家か、直轄${Math.round(挑む直轄 / 10000)}万石を超える家である（いま${Math.round(直 / 10000)}万石）。` };
  }
  if ((s.惣無事令の控え || {})[主]) {
    return { ok: false, why: "惣無事令を発した身で、私の戦を挑むことはできない。" };
  }
  const 的版 = 版図の石高(s, 的);
  if (的版 < 挑まれる版図) {
    return { ok: false, why: `相手の版図が${Math.round(挑まれる版図 / 10000)}万石に満たない（${Math.round(的版 / 10000)}万石）。一戦を挑むに足りぬ。` };
  }
  if (!並びの隣か(s, 主, 的)) {
    return { ok: false, why: "天下分け目を挑めるのは、石高で一つ上か一つ下の家だけである。" };
  }
  const r = relOf(s, 主, 的);
  if (r.state === "臣従" || r.state === "従属") {
    return { ok: false, why: "上下のある間柄では挑めない。" };
  }
  if (主家(s, 主, 的) === 的 || 主家(s, 的, 主) === 主) {
    return { ok: false, why: "旗の下にある家とは戦えない。" };
  }
  /* 一度決した相手へは五年空ける（GDD 12.6）。

     もとは「勝者との信用が四十五を割るまで」としていた。信用は月〇.二五ずつ
     四十五へ戻るので、そのままなら五年で解ける――はずが、間に婚姻や使者が
     入れば信用は動く。続けざまに挑めては一戦の重みがない。月で数える。 */
  const 控 = ((s.分け目の控え || {})[relKey(主, 的)]) || null;
  if (控) {
    const 経 = (s.year - 控.y) * 12 + (s.month - 控.m);
    if (経 < 再び挑める月) {
      return { ok: false, why: `一度雌雄を決した相手である。ふたたび挑むには、あと${再び挑める月 - 経}ヶ月かかる。` };
    }
  }
  if (!家の当主(s, 主) || !家の当主(s, 的)) return { ok: false, why: "当主のない家は野に出られない。" };
  return { ok: true };
}

export const 挑める家ら = (s, 主) => Object.keys(s.factions || {})
  .filter((f) => 天下分け目を挑めるか(s, 主, f).ok);

/* 盤に「挑めるほどの家」がいるか。城を一度なめるだけの安い検めである。

   これが要るのは、賽を引く前に切り上げるためである。月送りのたびに
   Math.random() を一つ引くと、それだけで賽の流れがずれ、天下分け目とは
   関わりのない盤まで別の歴史になる（実測：三十年走らせて一度も起きていない
   のに、古い記録の試験が倒れた）。挑める家が一つも無いあいだは、賽を引かない。 */
export function 挑める見込み(s) {
  const 直 = {};
  for (const c of s.castles || []) {
    直[c.faction] = (直[c.faction] || 0) + (c.koku || 0);
    if (直[c.faction] >= 挑む直轄) return true;
  }
  /* 直轄が足りなくても、五畿を制した家には位が下る。位のある家だけ調べる。 */
  for (const f of Object.keys(s.courtRanks || {})) if ((s.courtRanks || {})[f]) return true;
  return false;
}

/* ------------------------------------------------------- 野を選ぶ器量 */
/* 地の利を読むのは第一に知略。統率と武勇はそれに次ぐ。 */
export function 器量くらべ(s, fid) {
  const g = 家の当主(s, fid);
  if (!g) return 0;
  return (g.wit || 0) * 2 + (g.lead || 0) + (g.valor || 0);
}

/* 野を選べるのはどちらか。差が一割に満たなければ、どちらとも決められない。 */
export function 野を選ぶ側(s, 主, 的) {
  const a = 器量くらべ(s, 主), b = 器量くらべ(s, 的);
  const 大 = Math.max(a, b) || 1;
  if (Math.abs(a - b) < 大 * 0.1) return null;
  return a > b ? 主 : 的;
}

export const 野の一覧 = () => 分け目の野;

/* 選べる側の見立て。兵で劣るなら狭い野を、勝るなら広い野を選ぶ。

   「狭い」は、山と川が野をどれだけ塞いでいるかで測る。狭い野ほど数の利は殺される
   ――峠で六十隊が詰まったのと同じ理屈である。 */
export function 野の見立て(s, 選ぶ側, 相手) {
  const 我 = 分け目の兵(s, 選ぶ側), 彼 = 分け目の兵(s, 相手);
  const 狭さ = (f) => {
    const 山 = (f.山 || []).reduce((a, o) => a + o.r * o.r, 0);
    const 水 = (f.川 || []).reduce((a, o) => a + (o.幅 || 0) * (o.節 || []).length * 20, 0);
    return (山 + 水) / (f.w * f.h);
  };
  const 並 = 分け目の野.slice().sort((a, b) => 狭さ(b) - 狭さ(a));
  const 選 = 我 < 彼 ? 並.slice(0, 3) : 並.slice(-3);
  return 選[Math.floor(Math.random() * 選.length)].id;
}

/* ------------------------------------------------------------ 出す兵 */
/* その家が天下分け目に出せる手。直轄・従属・臣従のすべての城から、
   留守居を除いた兵が残らず出る。出す出さないは選べない。 */
export function 分け目の顔ぶれ(s, fid) {
  const 家ら = [fid];
  for (const f of Object.keys(s.factions || {})) {
    if (f === fid) continue;
    const r = (s.relations || {})[relKey(fid, f)];
    if (!r || r.master !== fid) continue;
    if (r.state === "臣従" || r.state === "従属") 家ら.push(f);
  }
  /* 城ごとの将を一度だけ束ねる。城のたびに武将ぜんたいを漉すと、
     二百七十一城×九百七十三将で二十六万回になり、月送りが目に見えて遅くなる
     （AI の采配は月に十六組を調べるので、その三十二倍が積もる）。 */
  const 城の将 = new Map();
  for (const g of s.generals || []) {
    if (g.captive || !g.at) continue;
    const 列 = 城の将.get(g.at);
    if (列) 列.push(g); else 城の将.set(g.at, [g]);
  }
  const 手ら = [];
  for (const 家 of 家ら) {
    for (const c of (s.castles || []).filter((x) => x.faction === 家)) {
      const 兵 = 出せる兵(s, c);
      if (兵 <= 0) continue;
      /* 手の頭は、その城にいる将のうち器量の高い者。ただし当主がいれば当主が率いる
         ――大名が家臣の下に付くことはない。本陣はこの手で立つ。 */
      const 将ら = (城の将.get(c.id) || [])
        .filter((g) => g.faction === 家)
        .sort((a, b) => (b.lord ? 1 : 0) - (a.lord ? 1 : 0)
          || (b.lead + b.valor) - (a.lead + a.valor));
      if (!将ら.length) continue;
      手ら.push({ 城: c.id, 城名: c.name, 家, 兵, 将: 将ら[0].id, 将名: 将ら[0].name,
        供: 将ら.slice(1).map((g) => g.id), 旗の下: 家 !== fid });
    }
  }
  return 手ら.sort((a, b) => b.兵 - a.兵);
}

export const 分け目の兵 = (s, fid) => 分け目の顔ぶれ(s, fid).reduce((a, x) => a + x.兵, 0);

/* 三十二の隊に束ねる。兵の多い城から順に一隊とし、溢れた城は近い隊へ足す。 */
export function 分け目の備えを組む(s, fid) {
  const 手ら = 分け目の顔ぶれ(s, fid);
  const 隊 = [];
  for (const 手 of 手ら) {
    if (隊.length < 分け目の限り) { 隊.push({ ...手, 城ら: [手.城] }); continue; }
    const 小 = 隊.reduce((a, b) => (a.兵 <= b.兵 ? a : b));
    小.兵 += 手.兵; 小.城ら.push(手.城);
  }
  return 隊;
}

/* ------------------------------------------------------------ 申し込み */
/* 兵が本拠へ寄るまでの月数。いちばん遠い城に合わせる（長くて半年）。 */
export function 集結の月数(s, fid) {
  const 本 = (s.factions[fid] || {}).本拠;
  if (!本) return 1;
  let 長 = 1;
  for (const 手 of 分け目の顔ぶれ(s, fid)) {
    if (手.城 === 本) continue;
    const m = marchMonths(手.城, 本, fid);
    if (m && m > 長) 長 = m;
  }
  return Math.min(集結の限り, Math.max(1, Math.round(長)));
}

export function 天下分け目を起こす(s, 主, 的, { 野 } = {}) {
  const 可 = 天下分け目を挑めるか(s, 主, 的);
  if (!可.ok) return null;
  const 選ぶ = 野を選ぶ側(s, 主, 的);
  const 野ら = 分け目の野;
  void 野ら;
  const 引く = () => 野ら[Math.floor(Math.random() * 野ら.length)].id;
  /* 野を選ぶのは器量で上回った側。相手が選ぶなら、相手の見立てで決まる
     （兵で劣る側は狭い野を選ぶ）。どちらとも決まらなければ賽。 */
  const 場 = 選ぶ === 主 ? (野 || 野の見立て(s, 主, 的))
    : 選ぶ === 的 ? 野の見立て(s, 的, 主)
      : 引く();
  const 待 = Math.max(集結の月数(s, 主), 集結の月数(s, 的));
  s.分け目 = {
    挑: 主, 受: 的, 野: 場, 選んだ側: 選ぶ, 立てた: { y: s.year, m: s.month },
    残り: 待, 待ち: 待,
    兵: { [主]: 分け目の兵(s, 主), [的]: 分け目の兵(s, 的) },
  };
  return s.分け目;
}

/* 月ごとに一つ減らす。零になったら野で待つばかりとなる。 */
export function 分け目を進める(s, { 告げる } = {}) {
  const w = s.分け目;
  if (!w || w.済) return null;
  /* どちらかの家が滅びたり、旗の下に入ったりしたら立ち消える。 */
  const 生 = (f) => (s.castles || []).some((c) => c.faction === f);
  if (!生(w.挑) || !生(w.受)) { s.分け目 = null; return { 立ち消え: true }; }
  if (w.残り > 0) {
    w.残り -= 1;
    if (w.残り === 0 && 告げる) {
      告げる(`兵が本拠に集まった。${(s.factions[w.挑] || {}).name}と${(s.factions[w.受] || {}).name}の天下分け目、いよいよ野に出る。`);
    } else if (告げる && w.残り > 0) {
      告げる(`天下分け目の触れ。兵が本拠へ寄っている（あと${w.残り}ヶ月）。`);
    }
  }
  return w;
}

/* ------------------------------------------------------------ 戦の跡 */
/* 割譲（GDD 12.6）。

   もとは「接した一国、ただし五城まで」としていた。国は大きさがまちまちで
   （中央値四城に対し奥州は十九城）、一国では取り分が土地によって振れすぎる。
   国を離れ、城の数で数える――勝者は敗者の城から十まで選んで取る。

   十城は、敗者にとっては痛いが立ち直れる数である（百二十万石の家なら
   おおむね二割五分ほど）。国境の縛りも外した。飛び地になっても構わない――
   関ヶ原の後の加増も、飛び地だらけであった。 */
export const 割譲の限り = 10;                 // 一戦で渡る城の数

/* 渡せる城。勝者の領に近い順に並べる（近い城ほど選ばれやすかろう、という順である）。
   本拠は渡さない――家を丸ごと潰す一戦にはしない。 */
export function 割譲できる城ら(s, 勝, 負) {
  const 本 = (s.factions[負] || {}).本拠;
  const 的 = (s.castles || []).filter((c) => c.faction === 負 && c.id !== 本);
  const 勝の城 = (s.castles || []).filter((c) => c.faction === 勝);
  const 隔 = (c) => {
    let 最 = Infinity;
    for (const w of 勝の城) {
      const d = Math.hypot((w.x || 0) - (c.x || 0), (w.y || 0) - (c.y || 0));
      if (d < 最) 最 = d;
    }
    return 最;
  };
  return 的.map((c) => ({ c, 隔: 隔(c) })).sort((a, b) => a.隔 - b.隔).map((x) => x.c);
}

/* AI が取る城。近くて実入りの大きいものから十。 */
export function 取る城を見立てる(s, 勝, 負) {
  const 並 = 割譲できる城ら(s, 勝, 負);
  const 値 = (c, i) => (c.koku || 0) / 10000 - i * 0.6;      // 近いほど上、石高が高いほど上
  return 並.map((c, i) => ({ c, 点: 値(c, i) })).sort((a, b) => b.点 - a.点)
    .slice(0, 割譲の限り).map((x) => x.c.id);
}

/* 逃散の割（GDD 12.6）。敗走した兵の割に連れて重くなる。
   整然と退けば五分、総崩れなら二割。 */
export const 逃散の割 = (敗走兵, 出した兵) =>
  clamp(0.05 + 0.15 * (出した兵 > 0 ? 敗走兵 / 出した兵 : 0), 0.05, 0.2);

/* ==========================================================================
   戦の跡（GDD 12.6）

   一、接した一国（最大五城）が勝者へ渡る。渡るのは城と在地の兵だけで、
       武将は敗者のまま本拠へ引き移る（関ヶ原の後の豊臣家に倣う）。
   二、敗者の残兵が逃散する。割は敗走した兵の割に連れて重くなる。
   三、敗者の上下の間柄はすべて解ける。解けた相手との信用は零。
       勝者との信用は六十――これが、ふたたび挑むまでの間合いになる。
   四、敗れた側の将は、器量に応じて落ち延び、あるいは捕らわれる。
       当主は捕らえても逃がす。大名を縄目にかけて晒すのは、この盤では稀な事とする。
   ========================================================================== */
import { captureChance, 難を逃れる } from "./capture.js";

export const 分け目の捕縛 = 2.5;             // 城が落ちるときより重く見る
export const 分け目の討死 = 1 / 3;            // 討死は捕縛の三分の一

/* 家の兵を割で減らす。城の在地兵・将の直属・出ている軍のすべてにかける。 */
export function 兵を逃散させる(s, fid, 割) {
  let 減 = 0;
  const 引く = (n) => Math.round((n || 0) * (1 - 割));
  for (const c of s.castles || []) {
    if (c.faction !== fid) continue;
    const 前 = c.local || 0; c.local = 引く(前); 減 += 前 - c.local;
    /* 名簿も減った兵に合わせて組み直す。空にすると、名簿を当てにしている
       月送りの手当て（出陣・城攻め）が兵を見失う。 */
    if (c.rost) c.rost = newRoster(c.local, `loc-${c.id}`);
  }
  for (const g of s.generals || []) {
    if (g.faction !== fid || g.captive) continue;
    const 前 = g.retinue || 0; g.retinue = 引く(前); 減 += 前 - g.retinue;
    if (g.rost) g.rost = newRoster(g.retinue, `${g.id}-直`);
  }
  for (const a of s.armies || []) {
    if (a.faction !== fid) continue;
    const 前 = a.men || 0;
    a.men = 引く(前); a.local = 引く(a.local); 減 += 前 - a.men;
    if (a.rost) a.rost = newRoster(a.local, `army-${a.id}`);
  }
  return 減;
}

/* 敗者の上下の間柄を解く。解けた相手との信用は零にする。
   関わりのない家との誼には触れない（一律に零にすると、敗者は九年半
   どことも結べず、袋叩きに遭って必ず滅びる）。 */
export function 上下の縁を解く(s, 負) {
  const 解けた = [];
  for (const k of Object.keys(s.relations || {})) {
    const r = s.relations[k];
    if (!r || (r.state !== "臣従" && r.state !== "従属")) continue;
    const [a, b] = k.split("|");
    if (a !== 負 && b !== 負) continue;
    const 相 = a === 負 ? b : a;
    r.state = "中立"; r.master = null; r.until = null; r.trust = 0;
    解けた.push(相);
  }
  return 解けた;
}

/* 敗れた側の将の生き死に。器量の高い者ほど落ち延びる。 */
export function 敗れた将の始末(s, fid, 出た将ら, { 勝, 告げる } = {}) {
  const 跡 = { 捕: [], 討: [] };
  for (const id of 出た将ら) {
    const g = (s.generals || []).find((x) => x.id === id);
    if (!g || g.captive || g.faction !== fid) continue;
    const 目 = captureChance(g) * 分け目の捕縛;
    const 賽 = Math.random();
    if (賽 < 目 * 分け目の討死) {
      跡.討.push({ id: g.id, name: g.name, lord: !!g.lord });
      if (告げる) 告げる(`${g.name}は野に討死した。`);
    } else if (賽 < 目) {
      /* 当主は捕らえても逃がす。首を刎ねて家を絶やすのは、この盤では稀な事とする。 */
      if (g.lord) {
        if (告げる) 告げる(`${g.name}は敵手に落ちたが、${(s.factions[勝] || {}).name}はこれを逃がした。`);
      } else {
        跡.捕.push({ id: g.id, name: g.name });
        if (告げる) 告げる(`${g.name}は敵手に落ちた。`);
      }
    }
  }
  return 跡;
}

/* 選ばれた城を勝者へ渡す。武将は敗者のまま本拠へ引き移る。 */
export function 城を割譲する(s, 勝, 負, 城ら, { 告げる } = {}) {
  const 渡 = (城ら || []).map((id) => (s.castles || []).find((c) => c.id === id && c.faction === 負))
    .filter(Boolean).slice(0, 割譲の限り);
  if (!渡.length) return [];
  const 本 = (s.factions[負] || {}).本拠
    || ((s.castles || []).find((c) => c.faction === 負 && !渡.includes(c)) || {}).id || null;
  const 移 = [];
  for (const c of 渡) {
    for (const g of s.generals || []) {
      if (g.at !== c.id || g.faction !== 負) continue;
      if (本) { g.at = 本; if (g.本領 === c.id) g.本領 = 本; } else { g.at = null; }
      g.役 = null; g.役国 = null; g.寄親 = null;
      移.push(g.name);
    }
    c.faction = 勝; c.lordId = null;
    c.najimi = Math.min(c.najimi == null ? 70 : c.najimi, 35);   // 馴染みは薄いところから
    c.intrigue = false; c.intrigueBy = null; c.intrigueOwner = null;
  }
  if (告げる) {
    告げる(`${渡.length}城が${(s.factions[勝] || {}).name}の手に渡った`
      + `（${渡.map((c) => c.name).join("・")}）。`
      + (移.length ? `${移.join("・")}は${(s.castles.find((c) => c.id === 本) || {}).name || "本拠"}へ引き移った。` : ""));
  }
  return 渡;
}

/* 戦の跡をまとめて裁く。 */
export function 分け目の沙汰(s, { 勝, 負, 城ら, 敗走兵 = 0, 出した兵 = 0, 出た将ら = [], 告げる } = {}) {
  const 跡 = { 渡った城: [], 逃散: 0, 割: 0, 解けた: [], 捕: [], 討: [] };
  const 取る = (城ら && 城ら.length) ? 城ら : 取る城を見立てる(s, 勝, 負);
  跡.渡った城 = 城を割譲する(s, 勝, 負, 取る, { 告げる }).map((c) => c.id);
  跡.割 = 逃散の割(敗走兵, 出した兵);
  跡.逃散 = 兵を逃散させる(s, 負, 跡.割);
  if (告げる && 跡.逃散 > 0) {
    告げる(`敗れた${(s.factions[負] || {}).name}の陣から兵が逃げ散った（${跡.逃散}人）。`);
  }
  跡.解けた = 上下の縁を解く(s, 負);
  if (告げる && 跡.解けた.length) {
    告げる(`${(s.factions[負] || {}).name}の旗の下にあった家は、みな離れて独り立ちした`
      + `（${跡.解けた.map((f) => (s.factions[f] || {}).name).filter(Boolean).join("・")}）。`);
  }
  const k = relKey(勝, 負);
  if (!s.relations[k]) s.relations[k] = { trust: 45, state: "中立", until: null };
  s.relations[k].state = "中立"; s.relations[k].master = null;
  s.relations[k].trust = 60;
  const 将跡 = 敗れた将の始末(s, 負, 出た将ら, { 勝, 告げる });
  跡.捕 = 将跡.捕; 跡.討 = 将跡.討;
  s.分け目の控え = { ...(s.分け目の控え || {}), [k]: { y: s.year, m: s.month, 勝, 負 } };
  s.分け目 = null;
  return 跡;
}
