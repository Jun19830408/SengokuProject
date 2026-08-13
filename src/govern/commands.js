import { captiveRecruit, payRansom, ransomAccept, ransomCost } from "../core/capture.js";
import { succeed } from "../core/house.js";
import { holdsProvince, kenchiCost, kenchiDone, rankBonus, runKenchi } from "../core/province.js";
import { fiefOf, fiefRoom, troopCap } from "../core/rank.js";
import { rosterSync } from "../core/roster.js";
import { relKey } from "../core/state.js";
import { clamp, fmt } from "../core/util.js";
import { TOWNS } from "../data/castles.js";
import { DIPLO, PLOTS, SPECIAL_OPTIONS } from "../data/diplo.js";
import { px, py } from "../data/geo.js";
import { houseAlive } from "../core/state.js";
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
      const COST_OF = { 開墾: 140, 治水: 180, 商業: 160, 築城: 200, 訓練: 120, 徴募: 100 };
      if (f.gold < (COST_OF[cmd] || 140)) {
        s.msg = `金が足りぬ。${cmd}には${COST_OF[cmd] || 140}貫が要る（手元${fmt(Math.max(0, f.gold))}貫）。`;
        return s;
      }
      let cost = 0;
      if (cmd === "開墾") {
        cost = 140;
        const room = c.kokuMax - c.koku;
        const labor = Math.min(1, c.pop / (c.kokuMax * 0.9));
        const gain = Math.min(room, Math.round(room * 0.16 * (0.5 + gen.gov / 100) * labor));
        rec("現在石高", c.koku, c.koku + gain, "石"); c.koku += gain;
      } else if (cmd === "治水") {
        cost = 180;
        // 上限の伸びは城の大きさに応じる。重ねれば伸び続けるが、伸びは次第に鈍る。
        // 国の検地に定まった限りを超えて田は増えない
        const cap = c.kokuCap || c.kokuMax;
        const room = Math.max(0, cap - c.kokuMax);
        const d = Math.min(room, Math.round(c.kokuMax * 0.035 * (0.5 + gen.gov / 100)));
        rec("最大石高", c.kokuMax, c.kokuMax + d, "石"); c.kokuMax += d;
        if (room <= 0) rec("この地の限り", cap, cap, "石（これ以上は開けぬ）");
        rec("民忠", Math.round(c.min), Math.min(100, Math.round(c.min) + 2)); c.min = Math.min(100, c.min + 2);
      } else if (cmd === "商業") {
        cost = 160;
        const d = Math.round(3 * (0.5 + gen.gov / 100));
        rec("商業", Math.round(c.comm), Math.min(100, Math.round(c.comm) + d)); c.comm = Math.min(100, c.comm + d);
      } else if (cmd === "築城") {
        cost = 240;
        const d = Math.round(3 * (0.5 + gen.gov / 100));
        rec("城防", Math.round(c.def), Math.min(100, Math.round(c.def) + d)); c.def = Math.min(100, c.def + d);
        rec("耐久", c.hp, c.hp + 200); c.hp += 200;
      } else if (cmd === "訓練") {
        cost = 110;
        const d = Math.round(4 * (0.4 + gen.lead / 100));
        rec("地域家臣団 練度", Math.round(c.localTrain), Math.min(100, Math.round(c.localTrain) + d));
        c.localTrain = Math.min(100, c.localTrain + d);
        for (const x of s.generals.filter((q) => q.at === c.id && q.faction === c.faction)) x.retTrain = Math.min(100, x.retTrain + Math.round(d * 0.7));
        rec("直属家臣団 練度（在城）", gen.retTrain - Math.round(d * 0.7), gen.retTrain);
      } else if (cmd === "徴募") {
        const cap = troopCap(c, f.mobilization, g || s);
        const cur = c.local + s.generals.filter((x) => x.at === c.id && x.faction === c.faction).reduce((a, x) => a + x.retinue, 0);
        const n = Math.max(0, Math.min(cap - cur, Math.floor((f.gold - 60) / 0.45), Math.floor(c.pop * 0.012)));
        cost = Math.round(n * 0.45);
        rec("地域家臣団", c.local, c.local + n, "人");
        rec("軍役余力", Math.max(0, cap - cur), Math.max(0, cap - cur - n), "人");
        const old = c.local; c.local += n;
        rosterSync(c, "rost", c.local, `loc-${c.id}`);   // 新兵を組に入れる
        c.localTrain = Math.round((c.localTrain * old + 30 * n) / Math.max(1, c.local));
        c.pop -= Math.round(n * 0.2);
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
    if (c.lordId && c.lordId !== genId) c.najimi = 25;   // 城主が代われば馴染は低い状態から始まる
    c.lordId = genId;
    s.chronicle.push({ y: s.year, m: s.month, text: `${s.generals.find((x) => x.id === genId).name}を${c.name}の城主に任じた。` });
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
        text: `${g2.name}が${f.name}に仕えた（旧${(s.factions[from] || {}).name || ""}・忠誠${Math.round(g2.loyal)}）。` });
      s.msg = `${g2.name}を召し抱えた。忠誠${Math.round(g2.loyal)}。`;
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

// 外交（親善・不可侵・同盟・従属・臣従・独立）
export function doDiplo(prev, fid, key) {
    const s = structuredClone(prev);
    const me = s.factions[s.player], you = s.factions[fid];
    const r = s.relations[relKey(s.player, fid)];
    const def = DIPLO.find((d) => d.key === key);
    const stat = (id) => ({
      koku: s.castles.filter((c) => c.faction === id).reduce((a, c) => a + c.koku, 0),
      diplo: rankBonus(s, id).diplo,          // 官位があれば交渉が通りやすい
    });
    if (!def || !def.need(r, stat(s.player), stat(fid)) || me.gold < def.cost) return s;
    me.gold -= def.cost;
    if (key === "親善") { r.trust = clamp(r.trust + 9, 0, 100); }
    else if (key === "独立") {
      // 膝を屈していた家が旗を翻す。信義を捨てるのだから、代償は大きい。
      r.state = "敵対";
      r.until = null;
      r.trust = clamp(r.trust - 45, 0, 100);
      me.prestige = clamp((me.prestige || 50) - 12, 0, 100);
      for (const x of s.generals.filter((q) => q.faction === s.player && !q.captive)) {
        if (x.loyal != null) x.loyal = clamp(x.loyal - 6, 0, 100);
      }
      // 他家からも信を失う
      for (const k of Object.keys(s.relations)) {
        if (!k.includes(s.player)) continue;
        const r2 = s.relations[k];
        if (r2 !== r) r2.trust = clamp(r2.trust - 8, 0, 100);
      }
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${me.name}が${you.name}への従属を破り、独立を宣した。諸家の信を損ねた。` });
      s.msg = `${you.name}への従属を破った。以後は敵対である。家中の忠誠も揺れている。`;
    }
    else {
      r.state = key;
      r.until = def.months ? { y: s.year + Math.floor((s.month + def.months - 1) / 12), m: ((s.month + def.months - 1) % 12) + 1 } : null;
      r.trust = clamp(r.trust + 5, 0, 100);
      s.chronicle.push({ y: s.year, m: s.month, text: `${you.name}と${key}が成った。` });
    }
    s.ledger = [{ cmd: `外交・${key}`, cost: def.cost, castle: you.name, general: "使者",
      lines: [{ label: `${you.name} 信用`, before: Math.round(r.trust - (key === "親善" ? 9 : 5)), after: Math.round(r.trust), unit: "" }] }, ...s.ledger].slice(0, 6);
    return s;
}

// 調略を仕掛ける
export function doPlot(prev, castleId, type, genId) {
    const s = structuredClone(prev);
    const def = PLOTS.find((x) => x.key === type);
    const f = s.factions[s.player];
    if (!def || f.gold < def.cost) { s.msg = "金が足りぬ。"; return s; }
    const target = s.castles.find((x) => x.id === castleId);
    if (!target) return s;
    f.gold -= def.cost;
    s.plots.push({ type, castleId, genId, faction: s.player, monthsLeft: def.months });
    s.orders[genId] = { cmd: `調略・${type}`, castleId };   // 調略も月の務めである
    s.ledger = [{ cmd: `調略・${type}`, cost: def.cost, castle: target ? target.name : "", general: s.generals.find((x) => x.id === genId).name,
      lines: [{ label: "成否判明まで", before: 0, after: def.months, unit: "か月" }] }, ...s.ledger].slice(0, 6);
    return s;
}

// 寺社・商人・水軍衆との取引
export function doSpecial(prev, townId, key) {
    const s = structuredClone(prev);
    const t = TOWNS.find((x) => x.id === townId);
    const st = s.specials[townId];
    const o = (SPECIAL_OPTIONS[t.kind] || []).find((x) => x.key === key);
    const f = s.factions[s.player];
    if (!o || f.gold < (o.cost || 0)) return s;
    f.gold -= o.cost || 0;
    if (o.once) f.gold += o.once;
    st.state = key; st.faction = s.player; st.months = 0;
    st.anger = clamp((st.anger || 0) + (o.anger || 0) * 10, 0, 100);
    const lines = [{ text: `${t.name}との関係：中立 → ${key}　${o.desc}` }];
    if (o.once) lines.push({ label: "金銭", before: f.gold - o.once, after: f.gold, unit: "貫" });
    if (o.troops) {
      const near = s.castles.filter((c) => c.faction === s.player)
        .sort((a, b) => Math.hypot(a.x - px(t.lon), a.y - py(t.lat)) - Math.hypot(b.x - px(t.lon), b.y - py(t.lat)))[0];
      if (near) { lines.push({ label: `${near.name} 地域家臣団`, before: near.local, after: near.local + o.troops, unit: "人" }); near.local += o.troops; }
    }
    if (o.prestige) lines.push({ label: "威信", before: Math.round(f.prestige), after: Math.round(clamp(f.prestige + o.prestige * 10, 0, 100)), unit: "" });
    if (o.prestige) f.prestige = clamp(f.prestige + o.prestige * 10, 0, 100);
    if (key === "攻撃") for (const c of s.castles.filter((x) => x.faction === s.player)) c.min = Math.max(0, c.min - 8);
    s.ledger = [{ cmd: `特殊勢力・${key}`, cost: o.cost || 0, castle: t.name, general: "―", lines }, ...s.ledger].slice(0, 6);
    s.chronicle.push({ y: s.year, m: s.month, text: `${t.name}との関係を「${key}」とした。` });
    return s;
}

// 知行を加増する／減らす
export function grantFief(prev, genId, delta) {
    const s = structuredClone(prev);
    const gen = s.generals.find((x) => x.id === genId);
    if (!gen || gen.captive) return s;
    const room = fiefRoom(s, s.player);
    const d = delta > 0 ? Math.min(delta, room.left) : Math.max(delta, -fiefOf(gen));
    if (!d) return s;
    const before = fiefOf(gen);
    gen.fief = before + d;
    if (d < 0) gen.loyal = clamp((gen.loyal == null ? 60 : gen.loyal) - 4, 0, 100);
    s.ledger = [{ cmd: "知行", cost: 0, castle: "―", general: gen.name, lines: [
      { label: `${gen.name} 知行`, before, after: gen.fief, unit: "石" },
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
