import { extraIncome, fiefWanted } from "./rank.js";
import { newRoster } from "./roster.js";
import { clamp, fmt, monthsBetween } from "./util.js";
import { CASTLES, TOWNS } from "../data/castles.js";
import { SPECIAL_OPTIONS } from "../data/diplo.js";
import { FACTIONS } from "../data/factions.js";
import { GENERALS } from "../data/generals.js";
import { px, py } from "../data/geo.js";
import { PARENT } from "../data/newcomers.js";
import { MOB_POLICY } from "../data/roads.js";
import { 城の馬, 城の鉄砲 } from "../data/arms.js";
import { 直属の兵科 } from "../data/arms.js";

export const relKey = (a, b) => [a, b].sort().join("|");


export function initState(player) {
  const factions = JSON.parse(JSON.stringify(FACTIONS));
  for (const f of Object.values(factions)) f.prestige = 50;
  const relations = {};
  const ids = Object.keys(factions);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    relations[relKey(ids[i], ids[j])] = { trust: 45 + Math.round(Math.random() * 10), state: "中立", until: null };
  }
  // 史実に沿った初めの間柄。阿波の国人は三好に従い、その旗の下にある。
  // 天文十五年（1546）の間柄。史実に拠る。
  const START_TIES = [
    // ── 東国。河越夜戦の直後であり、北条は今川・武田と和を結んだばかり。
    ["hojo", "takeda", "同盟", 74],         // 甲相同盟（天文十三年ごろ成立）
    ["hojo", "imagawa", "不可侵", 58],      // 第二次河東一乱の和睦（天文十四年十月）
    ["takeda", "imagawa", "同盟", 76],      // 甲駿同盟。武田が今川・北条を調停した
    ["hojo", "uesugi_y", "敵対", 8],        // 河越夜戦で山内上杉を破ったばかり
    ["hojo", "koga", "敵対", 10],           // 古河公方も河越で北条に敗れた
    ["uesugi_y", "koga", "同盟", 72],       // 関東管領と古河公方は連合していた
    ["uesugi_y", "imagawa", "同盟", 66],    // 今川は上杉と通じて北条を挟撃した
    ["hojo", "satomi", "敵対", 12],         // 里見は房総で北条と争う
    ["takeda", "murakami", "敵対", 10],     // 武田は信濃で村上と争っていた
    ["takeda", "nagao", "敵対", 22],        // 信濃をめぐり長尾とも緊張
    // ── 東海。松平は今川に従い、織田と争う。
    ["matsudaira", "imagawa", "従属", 64],  // 広忠は今川に依存を深めていた
    ["matsudaira", "oda", "敵対", 8],       // 第二次安城合戦のさなか
    ["oda", "imagawa", "敵対", 12],         // 三河をめぐる争い
    ["oda", "yamato", "敵対", 18],          // 織田三家は同族ながら相争う
    ["oda", "ise", "敵対", 22],
    ["mizuno", "oda", "同盟", 68],          // 水野は織田方に転じていた
    ["oda", "saito", "敵対", 20],           // 美濃をめぐる争い
    // ── 畿内・西国
    ["ashikaga", "miyoshi", "従属", 44],    // 将軍家は細川・三好に擁されていた
    ["shingai", "miyoshi", "従属", 78],     // 新開は三好に従う阿波の国人
    ["kagawa", "miyoshi", "従属", 70],      // 讃岐香川も三好の下にある
    ["miyoshi", "honganji", "不可侵", 56],
    ["kobayakawa", "mori", "同盟", 82],     // 小早川は毛利の一族
    ["mori", "ouchi", "従属", 74],          // 毛利は大内に属する安芸の国人
    ["takeda_a", "amago", "従属", 62],      // 安芸武田は尼子を頼む
    ["ouchi", "amago", "敵対", 14],         // 大内と尼子は山陰山陽を争う
    ["ouchi", "otomo", "敵対", 26],         // 北九州をめぐる争い
    ["ryuzoji", "otomo", "従属", 52],       // 龍造寺は大友の傘下にあった
    // ── 九州・四国
    ["shimazu", "ito", "敵対", 16],         // 日向をめぐる争い
    ["chosokabe", "ichijo", "従属", 58],    // 長宗我部は一条を頼っていた
    ["kono", "ouchi", "不可侵", 54],
    // ── 奥羽
    ["date", "ashina", "同盟", 66],         // 天文の乱を経て和した
    ["nanbu", "kunohe", "従属", 48],        // 九戸は南部の一族ながら不穏
    ["nanbu", "oura", "従属", 46],          // 大浦も南部に属する
    ["mogami", "date", "従属", 56],         // 最上は伊達と縁を結ぶ
  ];
  for (const [a, b, st, tr] of START_TIES) {
    const k = relKey(a, b);
    if (relations[k]) { relations[k].state = st; relations[k].trust = tr; relations[k].until = null; }
  }
  const specials = {};
  for (const t of TOWNS) specials[t.id] = { state: "中立", faction: null, anger: 0, months: 0 };
  return {
    player, year: 1546, month: 4,
    factions,
    castles: 馬と鉄砲を配る(assignKokuCap(CASTLES.map((c) => ({
      ...c, x: px(c.lon), y: py(c.lat),
      najimi: 70,            // 地域家臣団が現城主を受け入れる度合い（GDD 6.2）
      rost: newRoster(c.local, `loc-${c.id}`),   // 地域家臣団の組の名簿
      kokuBase: c.kokuMax,                        // 治水の伸びを測るための元の上限
      kokuCap: c.kokuMax,                          // 国の検地に基づく限り（下でまとめて割り当てる）
      well: 100,             // 井戸。城工作で傷むと籠城が続かない（GDD 9.2）
      lordId: null, intrigue: false,
    })))),
    // 知行を定めてから、城を預かる者に身分を保証する
    generals: assignRanks(CASTLES, fillKeepers(CASTLES, GENERALS).map((g) => ({
      ...g, unity: clamp(g.retTrain + 8, 30, 100), merit: 0,
      fief: Math.round(fiefWanted(g) * (0.72 + Math.random() * 0.34)),
      rost: newRoster(g.retinue, `ret-${g.id}`, 直属の兵科) }))),
    armies: [], orders: {}, ledger: [], sieges: [], promo: null, campaigns: [],
    relations, specials, plots: [], intel: {}, prev: {},
    chronicle: [{ y: 1546, m: 4, text: "尾張は織田三家に分かれ、美濃は斎藤道三が握る。天下はまだ遠い。" }],
  };
}

// 旧いセーブには名簿がない。読み込み時に作る。
export function migrateRosters(s) {
  for (const c of s.castles) if (!c.rost) c.rost = newRoster(Math.max(0, c.local), `loc-${c.id}`);
  for (const gq of s.generals) if (!gq.rost) gq.rost = newRoster(Math.max(0, gq.retinue), `ret-${gq.id}`, 直属の兵科);
  for (const a of s.armies || []) if (!a.rost) a.rost = newRoster(Math.max(0, a.local), `arm-${a.id}`);
  return s;
}

// 名のある将を置いていない城には城代を据える。無人の城があると出陣も守備も成り立たない。
export const KEEPER_NAMES = ["城代", "留守居", "番頭", "代官"];

export function fillKeepers(castles, generals) {
  const out = [...generals];
  for (const c of castles) {
    if (out.some((g) => g.at === c.id && g.faction === c.faction)) continue;
    const k = Math.abs(c.id.split("").reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
    const nm = `${c.name.replace(/城$|御堂$|館$|本願寺$/, "")}${KEEPER_NAMES[k % KEEPER_NAMES.length]}`;
    out.push({
      id: `keeper-${c.id}`, name: nm, faction: c.faction,
      lead: 52 + (k % 13), valor: 50 + (k % 15), wit: 46 + (k % 12), gov: 50 + (k % 14),
      loyal: 74 + (k % 16), age: 30 + (k % 22), at: c.id,
      retinue: Math.round(140 + (c.koku / 10000) * 22), retTrain: 52 + (k % 10),
    });
  }
  return out;
}

// 城を預かる者には城主相応の知行を与える。
// 城を任されながら物頭のまま、というのは筋が通らない。
export function assignRanks(castles, generals) {
  // 家中の格を定める。城の数だけ家老を立て、当主のいる城は当主が預かる。
  for (const fid of [...new Set(castles.map((c) => c.faction))]) {
    const cs = castles.filter((c) => c.faction === fid);
    const gs = generals.filter((g) => g.faction === fid);
    if (!cs.length || !gs.length) continue;
    const lord = gs.find((g) => g.lord);
    // 当主が座す城を除いた数だけ、家老が要る
    const seatId = lord ? lord.at : null;
    const need = cs.filter((c) => c.id !== seatId).length;
    // 城ごとに、その城の筆頭を家老に立てる
    for (const c of cs) {
      if (c.id === seatId) continue;
      const here = gs.filter((g) => g.at === c.id && !g.lord);
      if (!here.length) continue;
      const head = [...here].sort((a, b) =>
        (b.lead + b.gov + b.wit) - (a.lead + a.gov + a.wit))[0];
      // 家老の禄高に届くだけの知行を与える。城が小さければ届かぬこともある。
      // 余禄の分け前を見込んで逆算する。
      const extra = extraIncome(c);
      const others = here.filter((x) => x !== head).reduce((t, x) => t + (x.fief || 0), 0);
      let want = Math.max(head.fief || 0, 1000);
      for (let i = 0; i < 40; i++) {
        const total = others + want;
        const got = want + (total > 0 ? extra * (want / total) : 0);
        if (got >= 8400) break;
        want = Math.round(want * 1.15) + 300;
        if (want > c.koku * 0.75) break;
      }
      head.fief = want;
    }
    // 当主の知行は家の身代。石高に見合う高を持たせる。
    if (lord) {
      const koku = cs.reduce((t, c) => t + c.koku, 0);
      lord.fief = Math.max(lord.fief || 0, Math.round(koku * 0.22));
    }
    // 宿老は、城を預かる家老の中から選ぶ。城を持たぬ者が宿老になるのは筋が違う。
    // 一城のみの家に宿老は要らない。
    const heads = cs.filter((c) => c.id !== seatId).map((c) => {
      const here = gs.filter((g) => g.at === c.id && !g.lord);
      return here.length
        ? [...here].sort((a, b) => (b.fief || 0) - (a.fief || 0))[0] : null;
    }).filter(Boolean);
    const nSenior = cs.length >= 4 ? Math.max(1, Math.floor(cs.length / 4)) : 0;
    [...heads].sort((a, b) => (b.lead + b.gov + b.wit) - (a.lead + a.gov + a.wit))
      .slice(0, nSenior)
      .forEach((g) => {
        const c = castles.find((x) => x.id === g.at);
        if (!c) return;
        const extra = extraIncome(c);
        const here = gs.filter((x) => x.at === c.id && !x.lord && x !== g);
        const others = here.reduce((t, x) => t + (x.fief || 0), 0);
        let want = g.fief || 0;
        for (let i = 0; i < 40; i++) {
          const total = others + want;
          const got = want + (total > 0 ? extra * (want / total) : 0);
          if (got >= 20600) break;
          want = Math.round(want * 1.12) + 500;
          if (want > c.koku * 0.8) break;
        }
        g.fief = want;
      });
  }
  // 幼き当主には後見を立てる（GDD 6.6）
  for (const fid of [...new Set(castles.map((c) => c.faction))]) {
    const lord = generals.find((g) => g.lord && g.faction === fid);
    if (!lord || (lord.age || 30) >= 15) continue;
    let kin = generals.filter((g) => g.faction === fid && g.id !== lord.id && (g.age || 0) >= 25);
    if (!kin.length) kin = generals.filter((g) => g.faction === fid && g.id !== lord.id && (g.age || 0) >= 18);
    if (!kin.length) continue;
    const sur = lord.name.slice(0, 2);
    const pick = [...kin].sort((a, b) =>
      (b.name.startsWith(sur) ? 1 : 0) - (a.name.startsWith(sur) ? 1 : 0)
      || (b.lead + b.gov + b.wit) - (a.lead + a.gov + a.wit))[0];
    lord.guardian = pick.id;
    pick.at = lord.at;                       // 後見は当主のもとに詰める
  }
  // 当主の子には家格に応じた知行を宛がう
  for (const c of castles) {
    const lord = generals.find((g) => g.lord && g.faction === c.faction);
    if (!lord) continue;
    const kids = generals.filter((g) => PARENT[g.id] === lord.id && g.at === c.id && !g.lord);
    if (!kids.length) continue;
    const sorted = [...kids].sort((a, b) => (b.age || 0) - (a.age || 0));
    sorted.forEach((k, i) => {
      const floor = i === 0 ? Math.round(c.koku * 0.10) : Math.round(c.koku * 0.055);
      k.fief = Math.max(k.fief || 0, floor);
    });
  }
  // 城ごとに、配った知行が石高の八割を超えぬよう収める（当主の分は御料なので除く）
  for (const c of castles) {
    const gs2 = generals.filter((g) => g.at === c.id && g.faction === c.faction && !g.lord);
    const room = Math.round(c.koku * 0.8);
    let sum = gs2.reduce((a, g) => a + (g.fief || 0), 0);
    if (sum > room && sum > 0) {
      const k = room / sum;
      for (const g of gs2) g.fief = Math.round((g.fief || 0) * k);
    }
  }
  return generals;
}

/* 馬と鉄砲を城へ配る（GDD 6.3）。

   槍と弓は村々の百姓が自前で携えて出るので数えない。
   馬は牧のある国に多く、鉄砲は伝来まもないので持つ家が限られる。
   数の拠りどころは data/arms.js に置いた。 */
export function 馬と鉄砲を配る(castles) {
  const 家の石高 = {};
  for (const c of castles) 家の石高[c.faction] = (家の石高[c.faction] || 0) + c.koku;
  for (const c of castles) {
    if (c.horse == null) c.horse = 城の馬(c);
    if (c.gun == null) c.gun = 城の鉄砲(c, 家の石高[c.faction] || 0);
  }
  return castles;
}

export function assignKokuCap(castles) {
  for (const c of castles) {
    if (c.kokuCap == null) c.kokuCap = Math.round(c.kokuMax * 1.2);
    c.province = c.kuni || null;
  }
  return castles;
}


/* --------------------------------------------------- 難易度（GDD 13.3）
   易しくするために数字を甘くするのではなく、
   他家の動きの速さと厳しさを変える。こちらの兵や石高には手を加えない。 */
export const LEVELS = {
  易: {
    name: "易", desc: "他家は伸びが遅く、攻めも慎重。まず仕組みを覚えたいときに。",
    aiGrow: 0.6,        // 他家の内政の効き
    aiEager: 0.7,       // 他家が攻めに出る頻度
    aiNeed: 1.35,       // 攻めに要する兵力の比
    aiPlot: 0.5,        // 他家の調略の頻度
    reliefP: 1.25,      // こちらへの後詰の来やすさ
    tribute: 1.2,       // こちらの収入
  },
  普通: {
    name: "普通", desc: "この時代のありようをそのまま。",
    aiGrow: 1, aiEager: 1, aiNeed: 1.05, aiPlot: 1, reliefP: 1, tribute: 1,
  },
  難: {
    name: "難", desc: "他家は速やかに国を富ませ、隙あらば攻め寄せる。謀も絶えぬ。",
    aiGrow: 1.5, aiEager: 1.4, aiNeed: 0.85, aiPlot: 1.8, reliefP: 0.8, tribute: 0.88,
  },
};

export const lv = (s) => LEVELS[s.level || "普通"];


/* --------------------------------------------- 来月の見通し（GDD 4.1）
   月次報告に数字が並ぶだけでは判断ができない。
   何が入り、何が出て、兵糧はいつ尽きるのかを先に示す。 */
export function forecast(s, fid) {
  const f = s.factions[fid];
  const mine = s.castles.filter((c) => c.faction === fid);
  const up = MOB_POLICY[f.mobilization].upkeep;
  const nextMonth = s.month === 12 ? 1 : s.month + 1;
  const harvest = [9, 10, 11].includes(nextMonth) ? 3 : 1;
  let inGold = 0, outGold = 0, inFood = 0, outFood = 0, troops = 0, food = 0;
  for (const c of mine) {
    const ret = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive)
      .reduce((a, x) => a + x.retinue, 0);
    const t = c.local + ret;
    troops += t; food += c.food;
    inGold += c.comm * 4 + c.koku * 0.003;
    outGold += t * 0.075 * up;
    inFood += Math.round((c.koku / 12) * 0.5 * harvest * (c.min / 80));
    outFood += Math.round(t * 0.08 * up);
  }
  for (const a of s.armies.filter((x) => x.faction === fid)) {
    troops += a.men;
    outFood += Math.round(a.men * 0.09);
  }
  const g = specialBonus(s, fid, "gold") - specialBonus(s, fid, "upkeep");
  inGold += Math.max(0, g); outGold += Math.max(0, -g);
  const netFood = inFood - outFood;
  // 兵糧が尽きるまでの月数。収穫の多い月とそうでない月を織り込んで概算する。
  let left = null;
  if (netFood < 0) {
    let sim = food, m = 0, mo = s.month;
    while (sim > 0 && m < 120) {
      mo = mo === 12 ? 1 : mo + 1;
      const h = [9, 10, 11].includes(mo) ? 3 : 1;
      let gain = 0, loss = 0;
      for (const c of mine) {
        const ret = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive)
          .reduce((a, x) => a + x.retinue, 0);
        gain += Math.round((c.koku / 12) * 0.5 * h * (c.min / 80));
        loss += Math.round((c.local + ret) * 0.08 * up);
      }
      for (const a of s.armies.filter((x) => x.faction === fid)) loss += Math.round(a.men * 0.09);
      sim += gain - loss; m++;
    }
    left = m >= 120 ? null : m;
  }
  return {
    inGold: Math.round(inGold), outGold: Math.round(outGold), netGold: Math.round(inGold - outGold),
    inFood, outFood, netFood, gold: f.gold, food, troops, months: left, harvest: harvest > 1,
  };
}


export const relOf = (g, a, b) => g.relations[relKey(a, b)] || { trust: 45, state: "中立", until: null };

export const atPeace = (g, a, b) => { const r = relOf(g, a, b); return r.state === "不可侵" || r.state === "同盟" || r.state === "臣従" || r.state === "従属"; };

/* その家はまだ在るか（GDD 12.4）。

   家を滅ぼしても、勢力の記録そのもの（名・色・金）は盤に残る。戦国記や捕虜の
   「旧主」の名を出すのに要るからである。残っているだけで、家として立ってはいない。

   これを見ずに金だけを見ていたため、滅んだ家から身代金の申し出が来ていた。
   城を失えば年貢も兵糧も入らぬのに、金二千六百貫を抱えたまま使者を寄越す形である。
   拠るべき城が一つも無ければ、その家はもう無い。 */
export const houseAlive = (g, fid) => !!fid && !!g.factions[fid]
  && g.castles.some((c) => c.faction === fid);

export const intelFresh = (g, castleId) => {
  const i = g.intel[castleId];
  return !!i && monthsBetween(i.y, i.m, g.year, g.month) <= 12;
};

export const specialBonus = (g, fid, key) => {
  let v = 0;
  for (const t of TOWNS) {
    const st = g.specials[t.id];
    if (!st || st.faction !== fid) continue;
    const o = (SPECIAL_OPTIONS[t.kind] || []).find((x) => x.key === st.state);
    if (o && o[key]) v += o[key];
  }
  return v;
};

// 敵城の内情は、偵察するか忍びを味方につけない限り分からない（GDD 11.2 / 13.2）
export const canSee = (g, c) => c.faction === g.player || intelFresh(g, c.id) || specialBonus(g, g.player, "intel") > 0;

export const hid = (g, c, v, digits) => (canSee(g, c) ? (digits === 0 ? Math.round(v) : fmt(v)) : "？");


/* ------------------------------------------------ 旗の下（GDD 12.1）

   従属・臣従は、関係の記録そのものには上下がない。石高の大きいほうを主とする
   （天下の趨勢を判ずる underBanner と同じ理屈）。

   指図が通るのは「自家」と「臣従の家」だけである。
   臣従は旗の下に完全に入り、独立の望みを捨てた間柄ゆえ、こちらの下知が通る。
   同盟・従属は対等か、あるいは緩やかな結びつきであって、
   どの城からどれだけ兵を出すかまで指図できる立場にない。 */
export const factionKoku = (g, fid) => g.castles.filter((c) => c.faction === fid).reduce((a, c) => a + c.koku, 0);

// その家は自分に臣従しているか
export function isVassal(g, me, other) {
  if (!me || !other || me === other) return false;
  if (relOf(g, me, other).state !== "臣従") return false;
  return factionKoku(g, me) >= factionKoku(g, other);   // 石高の大きいほうが主
}

// 指図の通る間柄か（自家、または臣従の家）
export const underMyBanner = (g, me, other) => me === other || isVassal(g, me, other);

// 頼むことはできるが、指図はできない間柄か（同盟・従属）
export function canAskAid(g, me, other) {
  if (!me || !other || me === other) return false;
  const st = relOf(g, me, other).state;
  if (st === "同盟") return true;
  if (st === "従属" || st === "臣従") return !isVassal(g, me, other);   // 相手が上、または対等
  return false;
}

/* ------------------------------------------------ 旧い記録を繕う

   かつては味方の城へ向かうときにも「戦役」を起こしていた。戦役は敵城を攻める
   ための仕組みで、着けば軍議が開かれ「攻めかかるか」と問われる。
   その名残が記録に残っていると、直したあとも味方を攻める形が続いてしまう。

   読み込むときに、旗の下の城を狙う戦役を落とす。 */
export function 旗の下を狙う戦役を落とす(s) {
  if (!Array.isArray(s.campaigns)) return s;
  s.campaigns = s.campaigns.filter((c) => {
    const t = s.castles.find((x) => x.id === c.target);
    if (!t) return false;                       // 城そのものが無い戦役も落とす
    return !underMyBanner(s, c.faction || s.player, t.faction);
  });
  return s;
}

// 記録を読むときの繕い一式
/* ------------------------------------------ 古い記録に残った申し送りを繕う

   仕組みを直しても、直す前の記録に書き込まれてしまったものまでは戻らない。
   遊びの途中で直しが入るのだから、読み込むときに繕っておく。
   ここで落とすのは「もう成り立たない申し送り」だけで、遊んだ跡は触らない。 */
export function 立たぬ申し送りを落とす(s) {
  // 一、滅んだ家からの身代金の申し出。受けても取り立てようがない。
  if (s.ransomOffer) {
    const q = (s.generals || []).find((x) => x.id === s.ransomOffer.genId);
    if (!q || !q.captive || !houseAlive(s, s.ransomOffer.from)) s.ransomOffer = null;
  }
  // 二、捕虜の処遇を問う列。すでに捕虜でない者、盤にいない者は落とす。
  if (Array.isArray(s.captives)) {
    s.captives = s.captives.filter((id) => {
      const q = (s.generals || []).find((x) => x.id === id);
      return !!q && !!q.captive;
    });
  }
  // 三、負の知行。加増が没収に化ける不具合で、負を抱えた記録が残っている。
  for (const q of s.generals || []) {
    if (typeof q.fief === "number" && q.fief < 0) q.fief = 0;
  }
  // 四、滅亡の始末を問う列。討死などで盤を去った者は飛ばす。
  if (s.warSettle && Array.isArray(s.warSettle.queue)) {
    const 残り = s.warSettle.queue.filter((id) => (s.generals || []).some((x) => x.id === id));
    s.warSettle = 残り.length ? { ...s.warSettle, queue: 残り } : null;
  }
  return s;
}

export function migrateSave(s) {
  migrateRosters(s);
  旗の下を狙う戦役を落とす(s);
  立たぬ申し送りを落とす(s);
  return s;
}
