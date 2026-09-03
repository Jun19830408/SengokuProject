import { captiveRecruit, payRansom, ransomAccept, ransomCost } from "../core/capture.js";
import { succeed } from "../core/house.js";
import { holdsProvince, kenchiCost, kenchiDone, rankBonus, runKenchi } from "../core/province.js";
import { fiefOf, fiefRoom, troopCap , 軍役の器, 軍役の増 } from "../core/rank.js";
import { rosterSync } from "../core/roster.js";
import { relKey, 己の盟約, 主を探す, 旗の下に入る, relOf } from "../core/state.js";
import { 鉄甲船の普請, 鉄甲船を造れるか } from "../core/naval.js";
import { 鉄甲 } from "../data/ships.js";
import { clamp, fmt } from "../core/util.js";
import { TOWNS } from "../data/castles.js";
import { DIPLO, PLOTS, SPECIAL_OPTIONS, SUBJECT } from "../data/diplo.js";
import { px, py } from "../data/geo.js";
import { houseAlive } from "../core/state.js";
import { 忠誠 } from "../core/rank.js";
import { canBeKeeper, canHoldCastle, castleRankNeed, stipendOf, 家老に任じる } from "../core/rank.js";
import { 基準値, 売値, 買値 } from "../data/market.js";
import { diploStat } from "../core/rank.js";
import { 主家 } from "../core/state.js";
import { 特殊勢力の可否 } from "../core/town.js";
/* ==========================================================================
   政務 ─ 城と家中への下知
   いずれも「いまの盤の様子（prev）を受け取り、改めた盤の様子を返す」だけの処理。
   画面には触れないので、画面を描かずとも試せる。
   ========================================================================== */

// 内政の下知（開墾・治水・商業・築城・訓練・徴募・調略）
export function runCommand(prev, castleId, cmd, genId, g) {
      const s = structuredClone(prev);
      const c = s.castles.find((x) => x.id === castleId);
      if (c && s.sieges.some((sg) => sg.castleId === c.id)) {
        s.msg = `${c.name}は囲まれている。城を出て事を行うことはできない。`;
        return s;
      }
      const gen = s.generals.find((x) => x.id === genId);
      const f = s.factions[c.faction];
      const lines = [];
      const rec = (label, before, after, unit = "") => lines.push({ label, before, after, unit });
      // 金がなければ何も命じられぬ。無い袖は振れぬ。
      const 身の丈 = (x) => Math.max(0.35, Math.min(1.4, 0.35 + x.koku / 60000));
      const 値 = (n) => Math.round(n * 身の丈(c));
      const COST_OF = { 開墾: 値(140), 治水: 値(180), 商業: 値(160), 築城: 値(200), 訓練: 値(120), 徴募: 100, 造船: 鉄甲.手間 };
      if (f.gold < (COST_OF[cmd] || 140)) {
        s.msg = `金が足りぬ。${cmd}には${COST_OF[cmd] || 140}貫が要る（手元${fmt(Math.max(0, f.gold))}貫）。`;
        return s;
      }
      let cost = 0;
      if (cmd === "開墾") {
        cost = 値(140);
        const room = c.kokuMax - c.koku;
        const labor = Math.min(1, c.pop / (c.kokuMax * 0.9));
        const gain = Math.min(room, Math.round(room * 0.16 * (0.5 + gen.gov / 100) * labor));
        /* 田が開ければ、その田から兵が出る。軍役の器はそのまま石高に比例する。
           石高だけを見せていては、田を開くことが兵に繋がることが読めない。
           開墾のたびに、器と「あと何人雇えるか」を並べて示す。 */
        const 器前 = troopCap(c, f.mobilization, g || s);
        rec("現在石高", c.koku, c.koku + gain, "石"); c.koku += gain;
        const 器後 = troopCap(c, f.mobilization, g || s);
        rec("軍役の器", 器前, 器後, "人");
        rec("あと雇える兵", Math.max(0, 器前 - c.local), Math.max(0, 器後 - c.local), "人");
      } else if (cmd === "治水") {
        cost = 値(180);
        // 上限の伸びは城の大きさに応じる。重ねれば伸び続けるが、伸びは次第に鈍る。
        // 国の検地に定まった限りを超えて田は増えない
        const cap = c.kokuCap || c.kokuMax;
        const room = Math.max(0, cap - c.kokuMax);
        const d = Math.min(room, Math.round(c.kokuMax * 0.035 * (0.5 + gen.gov / 100)));
        rec("最大石高", c.kokuMax, c.kokuMax + d, "石"); c.kokuMax += d;
        if (room <= 0) rec("この地の限り", cap, cap, "石（これ以上は開けぬ）");
        rec("民忠", Math.round(c.min), Math.min(100, Math.round(c.min) + 2)); c.min = Math.min(100, c.min + 2);
      } else if (cmd === "商業") {
        cost = 値(160);
        const d = Math.round(3 * (0.5 + gen.gov / 100));
        rec("商業", Math.round(c.comm), Math.min(100, Math.round(c.comm) + d)); c.comm = Math.min(100, c.comm + d);
      } else if (cmd === "築城") {
        cost = 値(240);
        const d = Math.round(3 * (0.5 + gen.gov / 100));
        rec("城防", Math.round(c.def), Math.min(100, Math.round(c.def) + d)); c.def = Math.min(100, c.def + d);
        rec("耐久", c.hp, c.hp + 200); c.hp += 200;
      } else if (cmd === "訓練") {
        cost = 値(110);
        const d = Math.round(4 * (0.4 + gen.lead / 100));
        rec("地域家臣団 練度", Math.round(c.localTrain), Math.min(100, Math.round(c.localTrain) + d));
        c.localTrain = Math.min(100, c.localTrain + d);
        for (const x of s.generals.filter((q) => q.at === c.id && q.faction === c.faction)) x.retTrain = Math.min(100, x.retTrain + Math.round(d * 0.7));
        rec("直属家臣団 練度（在城）", gen.retTrain - Math.round(d * 0.7), gen.retTrain);
      } else if (cmd === "徴募") {
        const cap = troopCap(c, f.mobilization, g || s);
        const cur = c.local;   // 手勢は武将の禄が養う。城の軍役は地域家臣団だけを縛る
        const n = Math.max(0, Math.min(cap - cur, Math.floor((f.gold - 60) / 0.45), Math.floor(c.pop * 0.012)));
        cost = Math.round(n * 0.45);
        rec("地域家臣団", c.local, c.local + n, "人");
        rec("軍役余力", Math.max(0, cap - cur), Math.max(0, cap - cur - n), "人");
        const old = c.local; c.local += n;
        rosterSync(c, "rost", c.local, `loc-${c.id}`);   // 新兵を組に入れる
        c.localTrain = Math.round((c.localTrain * old + 30 * n) / Math.max(1, c.local));
        c.pop -= Math.round(n * 0.2);
      } else if (cmd === "造船") {
        /* 鉄甲船（GDD 10.5）。舷に鉄を張った大船を造る。
           金と歳月がかかり、六艘より多くは造れない。 */
        const r = 鉄甲船の普請(s, c, gen);
        if (!r.ok) { s.msg = r.why; return prev; }
        cost = 0;                                   // 金は 鉄甲船の普請 の中で払っている
        rec("鉄甲船の普請", r.前, r.成 ? 鉄甲.普請 : r.後, `／${鉄甲.普請}`);
        if (r.成) {
          rec("鉄甲船", r.数 - 1, r.数, "艘");
          const 文 = `${c.name}で鉄甲船が一艘できあがった（${r.数}艘目）。舷に鉄を張った大船である。`;
          s.chronicle.push({ y: s.year, m: s.month, text: 文 });
          s.msg = 文;
        }
      } else if (cmd === "調略") {
        cost = 220;
        const target = s.castles.filter((x) => x.faction !== c.faction)
          .sort((a, z) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(z.x - c.x, z.y - c.y))[0];
        if (target) {
          const eff = Math.round(4 * (0.4 + gen.wit / 100));
          rec(`${target.name} 民忠`, Math.round(target.min), Math.max(0, Math.round(target.min) - eff));
          target.min = Math.max(0, target.min - eff);
          rec(`${target.name} 城防`, Math.round(target.def), Math.max(0, Math.round(target.def) - Math.round(eff / 2)));
          target.def = Math.max(0, target.def - Math.round(eff / 2));
        }
      }
      if (f.gold < cost) {
        s.msg = `金が足りぬ。${cmd}には${fmt(cost)}貫が要る（手元${fmt(Math.max(0, f.gold))}貫）。`;
        return prev;                             // 何も起こさずに戻す
      }
      f.gold -= cost;
      s.ledger = [{ cmd, cost, lines, castle: c.name, general: gen.name }, ...s.ledger].slice(0, 6);
      s.orders[genId] = { cmd, castleId };      // 働いたのは武将である

      return s;
}

// 城主を任ずる
export function appoint(prev, castleId, genId) {
    const s = structuredClone(prev);
    const c = s.castles.find((x) => x.id === castleId);
    const gen = s.generals.find((x) => x.id === genId);
    /* 城を預かれるのは、その城の身代に見合う禄高を持つ者だけである（GDD 6.4）。
       ここを通していなかったため、届かぬ者を任じても castellanOf が黙って
       禄高の高い別の者を城主とみなし、「任じた」と戦国記に残るのに
       実際の城主は違う、という食い違いが起きていた。 */
    if (!gen) { s.msg = "その者はいない。"; return s; }
    /* 城主か、城代か（GDD 6.4）。

       城主になれるのは侍大将以上で、かつその城の身代に見合う禄高を持つ者
       である。届かぬ者は城代として預かる。門番と足軽を束ねて留守を守るのが
       役目であって、その城を知行として与えられたわけではない。

         城主　その城を本領とする。以後の禄高もこの城の余禄から数える
         城代　預かるだけ。本領は移らない

       どちらも守備隊の統率はその者の統率が映る。誰も置かねば四十に落ちる。 */
    const 城主か = canHoldCastle(gen, s, c);
    if (!城主か && !canBeKeeper(gen)) {
      s.msg = `${gen.name}は${c.name}を預かれない。`;
      return s;
    }
    if (c.lordId && c.lordId !== genId) c.najimi = 25;   // 預かる者が代われば馴染は低い状態から始まる
    c.lordId = genId;
    c.城代 = !城主か;
    if (城主か) gen.本領 = c.id;                          // 城主は根をその城へ移す
    s.chronicle.push({ y: s.year, m: s.month,
      text: 城主か
        ? `${gen.name}を${c.name}の城主に任じた。`
        : `${gen.name}を${c.name}の城代に任じた（禄高${fmt(stipendOf(s, gen))}石。城主には${fmt(castleRankNeed(c))}石と侍大将以上の身分が要る）。` });
    return s;
}

/* 旗頭に任じる（GDD 6.4）。

   家老は禄高で決まる階級ではなく、大名が任じる役である。家が城を持つ国に
   つき一人まで。新しい国へ進出すれば、そこにもう一人任じられる。

   選べるのはその国に根を持つ侍大将以上である。国を預かるのだから、その国に
   本領を持たぬ者では務まらない。 */
export function 旗頭に任じる(prev, kuni, genId) {
  const s = structuredClone(prev);
  const r = 家老に任じる(s, s.player, kuni, genId);
  if (!r.ok) { s.msg = r.why; return prev; }
  const g = s.generals.find((x) => x.id === genId);
  s.chronicle.push({ y: s.year, m: s.month,
    text: r.先 && r.先.id !== genId
      ? `${kuni}の旗頭を${r.先.name}から${g.name}に替えた。`
      : `${g.name}を${kuni}の旗頭に任じた（家老に列する）。` });
  s.msg = `${g.name}が${kuni}を預かる。`;
  return s;
}

// 検地（一国を丸ごと押さえたときのみ）
export function doKenchi(prev, kuni, genId) {
    const s = structuredClone(prev);
    const f = s.factions[s.player];
    if (!holdsProvince(s, s.player, kuni)) { s.msg = `${kuni}にはまだ他家の城が残っている。`; return s; }
    if (kenchiDone(s, kuni)) { s.msg = `${kuni}にはすでに竿が入っている。`; return s; }
    const cost = kenchiCost(s, kuni);
    if (f.gold < cost.gold) { s.msg = `検地には金${fmt(cost.gold)}貫が要る。`; return s; }
    const gen = s.generals.find((x) => x.id === genId);
    if (!gen) return s;
    f.gold -= cost.gold;
    s.orders[genId] = { cmd: `${kuni}検地`, castleId: gen.at };
    const r = runKenchi(s, s.player, kuni, gen.gov);
    s.chronicle.push({ y: s.year, m: s.month,
      text: `${f.name}が${kuni}に竿を入れた。石高が${fmt(r.before)}石より${fmt(r.after)}石に改まった。` });
    s.msg = `${kuni}の検地が成った。石高${fmt(r.gain)}石の増、限りも伸びた。民忠は下がっている。`;
    s.ledger = [{ cmd: `${kuni}検地`, cost: cost.gold, castle: kuni, general: gen.name,
      lines: r.cs.map((c) => ({ label: `${c.name} 石高`, before: 0, after: c.koku, unit: "石" })) }, ...s.ledger].slice(0, 6);
    return s;
}

// 戦後の始末（捕らえた将の遇し方）
export function settleCaptive(prev, genId, kind) {
    const s = structuredClone(prev);
    const g2 = s.generals.find((x) => x.id === genId);
    if (!g2 || !g2.captive) return s;
    const f = s.factions[s.player];
    if (kind === "切腹") {
      s.generals = s.generals.filter((x) => x.id !== g2.id);
      s.chronicle.push({ y: s.year, m: s.month, text: `${g2.name}は切腹して果てた。` });
      s.msg = `${g2.name}に腹を切らせた。`;
    } else if (kind === "扶持") {
      if (g2.fed) { s.msg = "この者への扶持は、本月すでに済んでいる。"; return s; }
      // 器量に応じた扶持。惜しめば心は開かぬ。
      const cost = Math.round(120 + (g2.lead + g2.gov + g2.wit) * 1.4);
      const food = Math.round(60 + g2.retinue * 0.4);
      const home = s.castles.find((c2) => c2.id === g2.at);
      if (f.gold < cost || !home || home.food < food) {
        s.msg = `扶持には金${fmt(cost)}貫と兵糧${fmt(food)}が要る。足りぬ。`;
        return s;
      }
      f.gold -= cost; home.food -= food;
      g2.fed = true;
      g2.warLoyal = clamp((g2.warLoyal || 0) + 4, 0, 100);
      s.msg = `${g2.name}に扶持を与えた（忠誠${g2.warLoyal}）。`;
    } else if (kind === "登用") {
      if ((g2.warLoyal || 0) < 50) { s.msg = "まだ心を開いておらぬ。"; return s; }
      const from = g2.captive.from;
      g2.faction = s.player;
      g2.loyal = clamp(g2.warLoyal, 0, 100);
      g2.captive = null; g2.warLoyal = undefined; g2.lord = false;
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${g2.name}が${f.name}に仕えた（旧${(s.factions[from] || {}).name || ""}・忠誠${忠誠(g2)}）。` });
      s.msg = `${g2.name}を召し抱えた。忠誠${忠誠(g2)}。`;
    }
    return s;
}

// 隠居して家督を譲る
export function doRetire(prev, heirId) {
    const s = structuredClone(prev);
    const lord = s.generals.find((x) => x.faction === s.player && x.lord && !x.captive);
    if (!lord) return s;
    const heir = s.generals.find((x) => x.id === heirId);
    if (!heir || heir.id === lord.id) return s;
    lord.lord = false;
    lord.retired = true;
    lord.loyal = 100;                      // 先代が家を裏切ることはない
    succeed(s, lord, "隠居した", heir.id, true);
    lord.retinue = Math.max(60, Math.round(lord.retinue * 0.55));
    s.msg = `${lord.name}は隠居し、${heir.name}が家督を継いだ。家中の動揺はほとんどない。`;
    return s;
}

// 捕虜の処遇
export function doCaptive(prev, genId, how) {
    const s = structuredClone(prev);
    const q = s.generals.find((x) => x.id === genId);
    if (!q || !q.captive) return s;
    const log = (t) => s.chronicle.push({ y: s.year, m: s.month, text: t });
    const loy = q.loyal == null ? 60 : q.loyal;
    if (how === "登用") {
      // 関門は一箇所にまとめてある。忠誠だけでなく、旧主との縁も見る。
      if (!captiveRecruit(s, q).ok) return s;
      q.faction = s.player; q.captive = null;
      q.loyal = clamp(45 + Math.random() * 15, 0, 100);
      q.retinue = Math.round(140 + Math.random() * 120);
      log(`${q.name}が降り、${s.factions[s.player].name}に属した。`);
    } else if (how === "逃す") {
      const home = s.castles.find((c) => c.faction === q.captive.from) || s.castles[0];
      const rel = s.relations[relKey(s.player, q.captive.from)];
      if (rel) rel.trust = clamp(rel.trust + 6, 0, 100);   // 情けは信用を生む
      q.captive = null; q.at = home.id; q.retinue = Math.round(180 + Math.random() * 120);
      q.loyal = clamp(loy + 6, 0, 100);
      log(`${q.name}を放った。${home.name}へ帰った。`);
    } else if (how === "斬首") {
      const rel = s.relations[relKey(s.player, q.captive.from)];
      if (rel) rel.trust = clamp(rel.trust - 14, 0, 100);  // 恨みを買う
      s.generals = s.generals.filter((x) => x.id !== q.id);
      log(`${q.name}を斬った。`);
    } else if (how === "身代金") {
      const cost = ransomCost(s, q);
      const from = s.factions[q.captive.from];
      // 滅んだ家には求められぬ。断られたのではなく、求める相手がいない。
      if (!houseAlive(s, q.captive.from)) {
        s.msg = `${from ? from.name : "旧主"}は滅んでいる。身代金を求める相手がいない。`;
        return s;
      }
      if (ransomAccept(s, q)) {
        const paid = payRansom(s, q);
        if (!paid) {                                   // 取り立てが立たなかった
          s.msg = `${from ? from.name : "旧主"}から取り立てられなかった。`;
          return s;
        }
        const rel = s.relations[relKey(s.player, cost.payer)];
        if (rel) rel.trust = clamp(rel.trust + 4, 0, 100);
        log(`${from.name}が身代金を納め、${q.name}を引き取った（金${fmt(paid.gold)}貫・兵糧${fmt(paid.food)}石）。`);
        s.msg = `${from.name}は身代金に応じた。金${fmt(paid.gold)}貫と兵糧${fmt(paid.food)}石を得た。`;
      } else {
        const rel = s.relations[relKey(s.player, cost.payer)];
        if (rel) rel.trust = clamp(rel.trust - 3, 0, 100);
        log(`${from.name}は${q.name}の身代金を断った。`);
        s.msg = `${from.name}は身代金に応じなかった（求めた額：金${fmt(cost.gold)}貫・兵糧${fmt(cost.food)}石）。`;
      }
    }
    return s;
}

/* 外交（GDD 12.1）。

   命の名に向きが入った。「従属させる」は相手を従える命、「従属する」は自らが
   膝を屈する命である。結んだときに、どちらが上かを盟約へ書き留める。 */
/* 外交の実（GDD 12.1）。

   遊ぶ側だけの仕組みにしてあったので、他家は始めに定まった間柄のまま
   最後まで動かなかった。誰が結ぶのかを引数に取り、盤を直に書き換える形に改める。
   遊ぶ側の下知（doDiplo）も、他家の采配（govern/aiDiplo.js）も、ここを通る。
   同じ関門（DIPLO の need と費え）をくぐるので、二つの理屈が食い違うことがない。 */
export function 外交を結ぶ(s, actor, fid, key) {
    const me = s.factions[actor], you = s.factions[fid];
    if (!me || !you || actor === fid) return { ok: false, why: "" };
    const k = relKey(actor, fid);
    const r = s.relations[k] || (s.relations[k] = { trust: 45, state: "中立", until: null });
    let def = DIPLO.find((d) => d.key === key);
    if (!def) return { ok: false, why: "" };
    const 主 = 主家(s, actor, fid);
    const 下 = 主 == null ? null : 主 !== actor;
    if (!def.need(r, diploStat(s, actor), diploStat(s, fid), 下)) return { ok: false, why: "筋が立たぬ" };
    if (me.gold < def.cost) return { ok: false, why: "金が足りぬ" };

    /* 旗の下の掟（GDD 12.2）。

       一、二人の主は持てない。主を替えるには、まず独立せねばならない
       二、下にある家が自ら結べるのは不可侵まで。同盟も上下も主のものに従う
       ここを塞いでいなかったころは、すでに他家に臣従している家が横から
       従属させられ、一つの家が三家にも四家にも膝を屈していた。 */
    if (SUBJECT.includes(def.state || "")) {
      const 下側 = def.dir === "上" ? fid : actor;
      const 上側 = def.dir === "上" ? actor : fid;
      const 既主 = 主を探す(s, 下側);
      if (既主 && 既主 !== 上側) {
        return { ok: false, why: `${s.factions[下側].name}は${s.factions[既主].name}の旗の下にある。まず独立せねばならぬ` };
      }
    }
    if (["同盟", "従属させる", "臣従させる", "従属する", "臣従する"].includes(key)) {
      const 我主 = 主を探す(s, actor);
      if (我主 && 我主 !== fid) {
        return { ok: false, why: `${s.factions[我主].name}の旗の下にある身では、自ら結べぬ（不可侵まで）` };
      }
    }
    if (key === "同盟") {
      // 旗の下にある家とは同盟できない。その家の外交は主のものである。
      const 相手の主 = 主を探す(s, fid);
      if (相手の主 && 相手の主 !== actor) {
        return { ok: false, why: `${s.factions[fid].name}は${s.factions[相手の主].name}の旗の下にある。同盟は主と結ぶもの` };
      }
    }
    if (key === "不可侵") {
      // 主が敵と見ている家とは結べない。旗の下の外交は主の外交に反しない範囲である。
      const 我主 = 主を探す(s, actor);
      if (我主 && relOf(s, 我主, fid).state === "敵対") {
        return { ok: false, why: `${s.factions[我主].name}が敵と見ている家とは結べぬ` };
      }
    }
    me.gold -= def.cost;
    const 前の間柄 = r.state;
    let 文 = "";

    if (key === "親善") { r.trust = clamp(r.trust + 9, 0, 100); 文 = `${me.name}が${you.name}へ誼を通じた。`; }
    else if (key === "独立") {
      // 膝を屈していた家が旗を翻す。信義を捨てるのだから、代償は大きい。
      r.state = "敵対"; r.until = null; r.master = null;
      r.trust = clamp(r.trust - 45, 0, 100);
      me.prestige = clamp((me.prestige == null ? 50 : me.prestige) - 12, 0, 100);
      for (const x of s.generals.filter((q) => q.faction === actor && !q.captive)) {
        if (x.loyal != null) x.loyal = clamp(x.loyal - 6, 0, 100);
      }
      for (const k2 of Object.keys(s.relations)) {                // 他家からも信を失う
        if (!己の盟約(k2, actor)) continue;
        const r2 = s.relations[k2];
        if (r2 !== r) r2.trust = clamp(r2.trust - 8, 0, 100);
      }
      文 = `${me.name}が${you.name}への${前の間柄}を破り、独立を宣した。諸家の信を損ねた。`;
      s.chronicle.push({ y: s.year, m: s.month, text: 文 });
    }
    else if (key === "解き放つ") {
      r.state = "中立"; r.until = null; r.master = null;
      r.trust = clamp(r.trust + 10, 0, 100);
      me.prestige = clamp((me.prestige == null ? 50 : me.prestige) + 3, 0, 100);
      文 = `${me.name}が${you.name}を上下から解き、中立に戻した。`;
      s.chronicle.push({ y: s.year, m: s.month, text: 文 });
    }
    else if (def.借道) {
      /* 道を借りる。間柄そのものは動かさない。期限まで領を通れるだけである。
         鍵は向きを持つ（借りた側 > 貸した側）。貸したからといって、
         貸したほうが借り手の領を通れるわけではない。 */
      const 期限 = { y: s.year + Math.floor((s.month + def.months - 1) / 12),
        m: ((s.month + def.months - 1) % 12) + 1 };
      s.借道 = { ...(s.借道 || {}), [`${actor}>${fid}`]: 期限 };
      r.trust = clamp(r.trust + 2, 0, 100);
      文 = `${you.name}が${me.name}に道を貸した。${期限.y}年${期限.m}月まで、${you.name}の領を兵が通れる。`;
      s.chronicle.push({ y: s.year, m: s.month, text: 文 });
    }
    else {
      r.state = def.state || key;
      /* 上下の間柄に期限はない。膝を屈するのは一生の決めごとであって、
         二年で自然に解けるようなものではない（独立するか、解き放たれるかである）。 */
      if (SUBJECT.includes(r.state)) def = { ...def, months: null };
      r.until = def.months
        ? { y: s.year + Math.floor((s.month + def.months - 1) / 12), m: ((s.month + def.months - 1) % 12) + 1 }
        : null;
      r.master = def.dir === "上" ? actor : def.dir === "下" ? fid : null;
      r.trust = clamp(r.trust + 5, 0, 100);
      文 = def.dir === "上" ? `${you.name}が${me.name}に${r.state}した。`
        : def.dir === "下" ? `${me.name}が${you.name}に${r.state}した。`
        : `${you.name}と${me.name}のあいだに${r.state}が成った。`;
      // 旗の下に入った家は、それまでの誼を解く。以後の外交は主のものに従う。
      if (SUBJECT.includes(r.state)) {
        const 下側 = def.dir === "上" ? fid : actor;
        const 上側 = def.dir === "上" ? actor : fid;
        const 解 = [];
        旗の下に入る(s, 下側, 上側, (相, 前) => 解.push(`${s.factions[相] ? s.factions[相].name : ""}との${前}`));
        if (解.length) {
          文 += `${s.factions[下側].name}は${解.join("・")}を解いた。`;
        }
      }
      s.chronicle.push({ y: s.year, m: s.month, text: 文 });
    }
    return { ok: true, 文, cost: def.cost, trust: r.trust };
}

export function doDiplo(prev, fid, key) {
    const s = structuredClone(prev);
    const r0 = s.relations[relKey(s.player, fid)];
    const 前の信 = r0 ? Math.round(r0.trust) : 45;
    const out = 外交を結ぶ(s, s.player, fid, key);
    if (!out.ok) return s;
    const you = s.factions[fid];
    const def = DIPLO.find((d) => d.key === key);
    if (key === "独立") s.msg = `${you.name}への従属を破った。以後は敵対である。家中の忠誠も揺れている。`;
    else if (key === "解き放つ") s.msg = `${you.name}を解き放った。以後は中立である。`;
    else s.msg = out.文;
    s.ledger = [{ cmd: `外交・${key}`, cost: def.cost, castle: you.name, general: "使者",
      lines: [{ label: `${you.name} 信用`, before: 前の信, after: Math.round(out.trust), unit: "" }] }, ...s.ledger].slice(0, 6);
    return s;
}

// 調略を仕掛ける
export function doPlot(prev, castleId, type, genId, matoId) {
    const s = structuredClone(prev);
    const def = PLOTS.find((x) => x.key === type);
    const f = s.factions[s.player];
    if (!def || f.gold < def.cost) { s.msg = "金が足りぬ。"; return s; }
    const target = s.castles.find((x) => x.id === castleId);
    if (!target) return s;
    /* 誰に仕掛けるか。人の心を動かす企ては、相手を定めねば始まらない。
       選ばれた者がその城にいなければ、企ては立たない。 */
    const 的 = matoId ? s.generals.find((x) => x.id === matoId) : null;
    if (def.mato === "要" || def.mato === "城主") {
      if (!的 || 的.at !== target.id || 的.faction !== target.faction || 的.captive) {
        s.msg = "誰に仕掛けるかを定めねばならぬ。";
        return s;
      }
    }
    f.gold -= def.cost;
    s.plots.push({ type, castleId, genId, faction: s.player, monthsLeft: def.months,
      matoId: 的 ? 的.id : null });
    s.orders[genId] = { cmd: `調略・${type}`, castleId };   // 調略も月の務めである
    s.ledger = [{ cmd: `調略・${type}`, cost: def.cost, castle: target ? target.name : "", general: s.generals.find((x) => x.id === genId).name,
      lines: [{ label: "成否判明まで", before: 0, after: def.months, unit: "か月" }] }, ...s.ledger].slice(0, 6);
    return s;
}

// 寺社・商人・水軍衆との取引
/* 特殊勢力との取引（GDD 13.1）。
   遊ぶ側も他家も、同じ関門（手が届くか・費え）をくぐってここを通る。 */
export function 特殊勢力と結ぶ(s, actor, townId, key) {
    const t = TOWNS.find((x) => x.id === townId);
    const st = s.specials[townId];
    const o = t && (SPECIAL_OPTIONS[t.kind] || []).find((x) => x.key === key);
    const f = s.factions[actor];
    if (!t || !st || !o || !f) return { ok: false, why: "" };
    if (f.gold < (o.cost || 0)) return { ok: false, why: "金が足りぬ" };
    const 可 = 特殊勢力の可否(s, t, actor);
    if (!可.ok) return { ok: false, why: 可.why };
    f.gold -= o.cost || 0;
    if (o.once) f.gold += o.once;
    st.state = key; st.faction = actor; st.months = 0;
    st.anger = clamp((st.anger || 0) + (o.anger || 0) * 10, 0, 100);
    const lines = [{ text: `${t.name}との関係：中立 → ${key}　${o.desc}` }];
    if (o.once) lines.push({ label: "金銭", before: f.gold - o.once, after: f.gold, unit: "貫" });
    /* 牧と鉄砲鍛冶。馬と鉄砲は城の蓄えなので、近い城へ入れる（GDD 6.3）。
       誼を結んだその年に一度、まとまって届く。以後は月送りが毎年運ぶ。 */
    if (o.horse || o.gun) {
      const 近 = s.castles.filter((c) => c.faction === actor)
        .sort((a2, b2) => Math.hypot(a2.x - px(t.lon), a2.y - py(t.lat))
          - Math.hypot(b2.x - px(t.lon), b2.y - py(t.lat)))[0];
      if (近) {
        if (o.horse) {
          lines.push({ label: `${近.name} 馬`, before: 近.horse || 0, after: (近.horse || 0) + o.horse, unit: "頭" });
          近.horse = (近.horse || 0) + o.horse;
        }
        if (o.gun) {
          lines.push({ label: `${近.name} 鉄砲`, before: 近.gun || 0, after: (近.gun || 0) + o.gun, unit: "挺" });
          近.gun = (近.gun || 0) + o.gun;
        }
      }
    }
    if (o.troops) {
      const near = s.castles.filter((c) => c.faction === actor)
        .sort((a, b) => Math.hypot(a.x - px(t.lon), a.y - py(t.lat)) - Math.hypot(b.x - px(t.lon), b.y - py(t.lat)))[0];
      if (near) { lines.push({ label: `${near.name} 地域家臣団`, before: near.local, after: near.local + o.troops, unit: "人" }); near.local += o.troops; }
    }
    if (o.prestige) lines.push({ label: "威信", before: Math.round(f.prestige), after: Math.round(clamp(f.prestige + o.prestige * 10, 0, 100)), unit: "" });
    if (o.prestige) f.prestige = clamp(f.prestige + o.prestige * 10, 0, 100);
    if (key === "攻撃") for (const c of s.castles.filter((x) => x.faction === actor)) c.min = Math.max(0, c.min - 8);
    s.chronicle.push({ y: s.year, m: s.month,
      text: `${f.name}が${t.name}との関係を「${key}」とした。` });
    return { ok: true, lines, cost: o.cost || 0, 名: t.name };
}

export function doSpecial(prev, townId, key) {
    const s = structuredClone(prev);
    const t = TOWNS.find((x) => x.id === townId);
    const out = 特殊勢力と結ぶ(s, s.player, townId, key);
    if (!out.ok) { if (out.why) s.msg = `${t ? t.name : ""}とは誼を通じられぬ。${out.why}。`; return s; }
    s.ledger = [{ cmd: `特殊勢力・${key}`, cost: out.cost, castle: out.名, general: "―", lines: out.lines }, ...s.ledger].slice(0, 6);
    return s;
}

// 知行を加増する／減らす
export function grantFief(prev, genId, delta) {
    const s = structuredClone(prev);
    const gen = s.generals.find((x) => x.id === genId);
    if (!gen || gen.captive) return s;
    const room = fiefRoom(s, s.player);
    /* 加増が没収に化けぬようにする。

       配れる余地（石高の四割 − 配分済）は負にもなる。城を失って石高が減れば
       すぐそうなるし、初めから配りすぎている家もある。
       そこへ Math.min(加増, 余地) と書いていたため、余地が負のときに
       「四千石を与える」が「八万石を召し上げる」に化けていた。
       与えるほうは、余地が無ければ何も起こさない。 */
    const 余地 = Math.max(0, room.left);
    const d = delta > 0 ? Math.min(delta, 余地) : Math.max(delta, -fiefOf(gen));
    if (!d) {
      if (delta > 0) s.msg = `配れる知行が残っていない（石高 ${fmt(room.cap)}石のうち ${fmt(room.used)}石を配分済）。`;
      return s;
    }
    const before = fiefOf(gen);
    gen.fief = before + d;
    /* 知行が動けば軍役も動く。加増した分だけ手勢の器が増える。
       召し上げれば軽くなるが、初めから抱えている手勢は削らない。 */
    const 器前 = 軍役の器(gen);
    gen.retCap = Math.max(gen.retinue, 器前 + 軍役の増(gen, d));
    if (d < 0) gen.loyal = clamp((gen.loyal == null ? 60 : gen.loyal) - 4, 0, 100);
    s.ledger = [{ cmd: "知行", cost: 0, castle: "―", general: gen.name, lines: [
      { label: `${gen.name} 知行`, before, after: gen.fief, unit: "石" },
      { label: `${gen.name} 手勢の器`, before: 器前, after: gen.retCap, unit: "人" },
      { label: "配れる余地", before: room.left, after: room.left - d, unit: "石" }] }, ...s.ledger].slice(0, 6);
    return s;
}

// 褒賞を与える
export function reward(prev, genId) {
    const s = structuredClone(prev);
    const f = s.factions[s.player];
    if (f.gold < 300) return s;
    const gen = s.generals.find((x) => x.id === genId);
    f.gold -= 300;
    const before = gen.loyal, beforeU = gen.unity;
    gen.loyal = Math.min(100, gen.loyal + 8);
    gen.unity = Math.min(100, gen.unity + 4);
    s.ledger = [{ cmd: "人事・褒賞", cost: 300, castle: "―", general: gen.name, lines: [
      { label: `${gen.name} 忠誠`, before, after: gen.loyal, unit: "" },
      { label: `${gen.name} 直属の結束`, before: beforeU, after: gen.unity, unit: "" }] }, ...s.ledger].slice(0, 6);
    return s;
}

/* ------------------------------------------------------ 商人（GDD 5.x）

   城下の市で、兵糧・馬・鉄砲を金で売り買いする。
   槍と弓は村々の百姓が自前で携えて出るので、ここでは商わない。

   値は月で動く。取り入れのあとの兵糧は安く、端境には高い。
   売るときは商人の口銭を引かれるので、買ってすぐ売れば損をする。 */
export function doTrade(prev, castleId, kind, n) {
  const s = structuredClone(prev);
  const c = s.castles.find((x) => x.id === castleId);
  if (!c || c.faction !== s.player) return s;
  const 品 = 基準値[kind];
  if (!品 || !n) return s;
  const f = s.factions[s.player];
  const 持ち高 = () => (kind === "food" ? c.food : kind === "horse" ? (c.horse || 0) : (c.gun || 0));
  const 足す = (d) => {
    if (kind === "food") c.food = Math.max(0, Math.round(c.food + d));
    else if (kind === "horse") c.horse = Math.max(0, Math.round((c.horse || 0) + d));
    else c.gun = Math.max(0, Math.round((c.gun || 0) + d));
  };
  if (n > 0) {                                   // 買う
    const 金 = 買値(s, c, kind, n);
    if (f.gold < 金) {
      s.msg = `金が足りない（${品.名}${fmt(n)}${品.単位}に${fmt(金)}貫が要る／手元は${fmt(f.gold)}貫）。`;
      return s;
    }
    f.gold -= 金; 足す(n);
    s.msg = `${c.name}の市で${品.名}を${fmt(n)}${品.単位}買い入れた（${fmt(金)}貫）。`;
    s.ledger = [{ cmd: "商い", cost: 金, castle: c.name, general: "―", lines: [
      { label: `${品.名}`, before: 持ち高() - n, after: 持ち高(), unit: 品.単位 },
      { label: "金銭", before: f.gold + 金, after: f.gold, unit: "貫" }] }, ...s.ledger].slice(0, 6);
  } else {                                       // 売る
    const 数 = Math.min(-n, 持ち高());
    if (数 <= 0) { s.msg = `売る${品.名}がない。`; return s; }
    const 金 = 売値(s, c, kind, 数);
    足す(-数); f.gold += 金;
    s.msg = `${c.name}の市で${品.名}を${fmt(数)}${品.単位}売り払った（${fmt(金)}貫）。`;
    s.ledger = [{ cmd: "商い", cost: -金, castle: c.name, general: "―", lines: [
      { label: `${品.名}`, before: 持ち高() + 数, after: 持ち高(), unit: 品.単位 },
      { label: "金銭", before: f.gold - 金, after: f.gold, unit: "貫" }] }, ...s.ledger].slice(0, 6);
  }
  return s;
}
