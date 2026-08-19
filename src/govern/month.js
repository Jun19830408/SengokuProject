import { ambushChance } from "../core/ambush.js";
import { ransomCost, takeAsPrisoner } from "../core/capture.js";
import { COMING_OF_AGE, bearChild, emergeGenerals, hasHouse, houseName, inheritHouse, lifeSpan, needsGuardian, ruinedHouse, succeed } from "../core/house.js";
import { resolveSeaBattle, seaInterception } from "../core/naval.js";
import { findPath, marchMonths, nodeById, roadBetween } from "../core/paths.js";
import { courtRank, holdsProvince, kenchiCost, kenchiDone, provinceGrip, provincesHeld, runKenchi } from "../core/province.js";
import { fiefWanted, loyaltyDrift, minGarrison, stipendOf, troopCap } from "../core/rank.js";
import { newRoster, rosterSync, rosterTake } from "../core/roster.js";
import { atPeace, lv, relKey, relOf, specialBonus } from "../core/state.js";
import { clamp, fmt, monthsBetween } from "../core/util.js";
import { PLOTS } from "../data/diplo.js";
import { FATED, NEWCOMERS, PARENT } from "../data/newcomers.js";
import { GOKINAI } from "../data/provinces.js";
import { MARCH_PER_MONTH, MOB_POLICY, ROAD_SPEED } from "../data/roads.js";
import { reviewAim } from "./ai.js";
import { checkUnified } from "./unify.js";
import { marchClashes, resolveClash, restoreStrays, sackCastle, withdrawArmy } from "./war.js";
import { 旗の下を狙う戦役を落とす } from "../core/state.js";
import { houseAlive } from "../core/state.js";
import { 忠誠 } from "../core/rank.js";
import { isVassal, underMyBanner } from "../core/state.js";
/* ==========================================================================
   月送り ─ 天下じゅうの一月
   この一手で、諸家の内政・調略・出陣・包囲・寿命・一揆・官位までが動く。
   画面から切り離してあるので、絵を描かずに何百年でも回せる。
   ========================================================================== */

// 月を送る。天下じゅうの家が、この一手で動く
export function advanceMonth(prev, g) {
      const s = structuredClone(prev);
      const events = [];
      // その月の空模様。梅雨と冬は降りやすい。合戦の奇襲はこれに左右される。
      {
        const mo = s.month;
        const wet = [6, 7].includes(mo) ? 0.42 : [12, 1, 2].includes(mo) ? 0.34 : [9, 10].includes(mo) ? 0.30 : 0.20;
        const r2 = Math.random();
        s.weather = r2 < wet ? ([12, 1, 2].includes(mo) ? "雪" : "雨")
          : r2 < wet + 0.28 ? "曇" : "晴";
      }
      // 試走（見物）のときは自家もAIに任せる
      const auto = (fid) => fid !== s.player || !!s.autoPlay;
      // 前月比を出すための記録（GDD 4.4）
      s.prev = {};
      for (const c of s.castles) {
        s.prev[c.id] = { koku: c.koku, pop: c.pop, food: c.food, min: c.min, localTrain: c.localTrain,
          men: c.local + s.generals.filter((x) => x.at === c.id && x.faction === c.faction).reduce((a, x) => a + x.retinue, 0) };
      }
      s.prevGold = s.factions[s.player].gold;
      for (const fid of Object.keys(s.factions)) {
        const f = s.factions[fid];
        let gold = 0;
        for (const c of s.castles.filter((x) => x.faction === fid)) {
          // 囲まれた城は封鎖される。年貢も商いも入らず、蓄えを食い潰すだけになる。
          const besieged = s.sieges.some((sg) => sg.castleId === c.id);
          if (besieged) {
            const ret2 = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive).reduce((a, x) => a + x.retinue, 0);
            const up2 = MOB_POLICY[f.mobilization].upkeep;
            c.food -= Math.round((c.local + ret2) * 0.08 * up2);
            if (c.food < 0) {
              c.food = 0; c.min = Math.max(0, c.min - 6); c.localTrain = Math.max(20, c.localTrain - 3);
              const lost2 = Math.round(c.local * 0.05); c.local -= lost2;
              if (fid === s.player) events.push(`${c.name}は囲まれ、兵糧が尽きて${fmt(lost2)}人が脱走した。`);
            }
            c.min = Math.max(0, c.min - 1.2);
            continue;                                   // 収入も人口の増えも開墾もない
          }
          const harvest = [9, 10, 11].includes(s.month) ? 3 : 1;
          const ret = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive).reduce((a, x) => a + x.retinue, 0);
          const troops = c.local + ret;
          const up = MOB_POLICY[f.mobilization].upkeep;
          c.food += Math.round((c.koku / 12) * 0.5 * harvest * (c.min / 80)) - Math.round(troops * 0.08 * up);
          // 兵は養うものである。扶持が軽すぎると、金が余り、兵を抱える判断が生まれない。
          gold += (c.comm * 4 + c.koku * 0.003) * (fid === s.player ? lv(s).tribute : 1) - troops * 0.075 * up;
          if (c.food < 0) {
            c.food = 0; c.min = Math.max(0, c.min - 4); c.localTrain = Math.max(20, c.localTrain - 3);
            const lost = Math.round(c.local * 0.04); c.local -= lost;
            if (fid === s.player) events.push(`${c.name}で兵糧が尽き、${fmt(lost)}人が脱走した。`);
          }
          c.pop = Math.round(c.pop * (1 + 0.0012 * (c.min / 80)));
          if (c.koku < c.kokuMax) c.koku = Math.min(c.kokuMax, c.koku + Math.round(c.kokuMax * 0.0015));
          // 国を丸ごと押さえてこそ民は落ち着く。飛び地は治まらぬ（GDD 12.5）
          // 国を丸ごと押さえてこそ民は落ち着く。飛び地は治まりの水準が低い（GDD 12.5）
          const grip = provinceGrip(s, fid, c.kuni);
          const rest = 42 + grip * 46;                 // 落ち着く先。丸ごとなら88、半ばなら65
          const gap = rest - c.min;
          const settle = clamp(gap * 0.05, -0.9, 0.7);
          c.min = clamp(c.min + settle + specialBonus(s, fid, "min"), 0, 100);
          c.comm = clamp(c.comm + specialBonus(s, fid, "comm"), 0, 100);
          // 城主が代わると地域家臣団の馴染は低い状態から始まり、徐々に育つ（GDD 6.2 / 9.5）
          c.najimi = clamp((c.najimi == null ? 70 : c.najimi) + 1.4, 0, 100);
        }
        gold += specialBonus(s, fid, "gold") - specialBonus(s, fid, "upkeep");
        f.prestige = clamp((f.prestige || 50) + specialBonus(s, fid, "prestige"), 0, 100);
        f.gold = Math.round(f.gold + gold);
      }
      // 外交の残り期間（GDD 11.1）
      for (const k of Object.keys(s.relations)) {
        const r = s.relations[k];
        if (r.until && monthsBetween(s.year, s.month, r.until.y, r.until.m) <= 0) {
          r.until = null; r.state = "中立";
          if (k.includes(s.player)) events.push(`${k.split("|").filter((x) => x !== s.player).map((x) => s.factions[x].name)}との約束の期限が切れた。`);
        }
        r.trust = clamp(r.trust + 0.4, 0, 100);
      }
      // 調略の進行と成否（GDD 11.2：即時成功にしない）
      const plotBonus = specialBonus(s, s.player, "plot");
      s.plots = s.plots.filter((pl) => {
        pl.monthsLeft--;
        if (pl.monthsLeft > 0) return true;
        const target = s.castles.find((x) => x.id === pl.castleId);
        const gen = s.generals.find((x) => x.id === pl.genId);
        if (!target || !gen) return false;
        // 知略が事の難しさを上回るほど確かに成る（GDD 11.2）。
        // 定めの知略に達していれば、民忠の並みの城には必ず通じる。
        const def2 = PLOTS.find((x) => x.key === pl.type) || { need: 85, hard: 1 };
        const skill = gen.wit + (pl.faction === s.player ? plotBonus * 100 : 0);
        // 民忠が並み（70）なら定めの知略でちょうど確実に成る。堅い城ほど余分に要る。
        const need2 = def2.need + (target.min - 70) * def2.hard * 0.42
          + (target.faction === s.player ? 8 : 0);
        // 定めに届けばその事の天井まで届く。ただし天井は一を超えぬ。
        // どれほどの知略でも、しくじる目は残る。
        const cap2 = def2.cap == null ? 0.85 : def2.cap;
        const gap = skill - need2;
        const base = gap >= 0
          ? Math.min(cap2 + Math.max(0, gap) * 0.002, cap2 + 0.04)   // 余れば僅かに上がる
          : clamp(cap2 + gap * def2.hard * 0.055, 0.03, cap2);
        const roll = Math.random();
        // 自勢力の報せは月次報告に載せ、末尾で戦国記へ一度だけ記録する
        const say = (t) => { if (pl.faction === s.player) events.push(t); else s.chronicle.push({ y: s.year, m: s.month, text: t }); };
        if (roll > base + (1 - base) * 0.55) {      // 露見（しくじりのうち半ばは露見する）
          const rel = s.relations[relKey(pl.faction, target.faction)];
          if (rel) rel.trust = clamp(rel.trust - 12, 0, 100);
          say(`${target.name}への${pl.type}が露見した。`);
          return false;
        }
        if (roll > base) { say(`${target.name}への${pl.type}は不調に終わった。`); return false; }
        if (pl.type === "内応") {
          /* 城主の心が離れていなければ通じない。城ごと寝返らせる。
             誰を口説くかは仕掛けるときに選んである。選ばれた者がすでに城を
             去っていれば（討たれた、移された）、城中で最も心の離れた者に当たる。 */
          const 城中 = s.generals.filter((x) => x.at === target.id && x.faction === target.faction && !x.captive);
          const 名指し = pl.matoId ? 城中.find((x) => x.id === pl.matoId) : null;
          const lordOf = 名指し || 城中.sort((a, b) => (a.loyal || 60) - (b.loyal || 60))[0];
          const loy = lordOf ? (lordOf.loyal == null ? 60 : lordOf.loyal) : 100;
          const wit2 = gen.wit;
          const chance = clamp((72 - loy) / 90 + (wit2 - 60) / 260, 0, 0.85);
          if (!lordOf || loy > 72 || Math.random() > chance) {
            say(`${target.name}の${lordOf ? lordOf.name : "城方"}は内応に応じなかった。`);
            const rel2 = s.relations[relKey(pl.faction, target.faction)];
            if (rel2) rel2.trust = clamp(rel2.trust - 8, 0, 100);
            return false;
          }
          // 城ごと寝返る。兵も地域家臣団もそのまま移る。
          const oldF = target.faction;
          target.faction = pl.faction;
          target.najimi = 42;                       // 新しい主に馴染むには時が要る
          target.min = Math.max(0, target.min - 8);
          for (const x of s.generals.filter((q) => q.at === target.id && q.faction === oldF && !q.captive)) {
            if (x === lordOf || Math.random() < 0.55) { x.faction = pl.faction; x.loyal = clamp(48 + Math.random() * 18, 0, 100); }
            else {
              const ref = s.castles.find((c2) => c2.faction === oldF && c2.id !== target.id);
              if (ref) x.at = ref.id; else s.generals = s.generals.filter((q) => q.id !== x.id);
            }
          }
          const rel3 = s.relations[relKey(pl.faction, oldF)];
          if (rel3) rel3.trust = clamp(rel3.trust - 20, 0, 100);
          say(`${lordOf.name}が内応し、${target.name}は戦わずして${s.factions[pl.faction].name}のものとなった。`);
          s.chronicle.push({ y: s.year, m: s.month,
            text: `${target.name}城主${lordOf.name}が内応。城は${s.factions[pl.faction].name}に渡った（旧主：${s.factions[oldF].name}）。` });
          // 内応で最後の城が移れば、その家は滅ぶ（GDD 12.4）
          if (!s.castles.some((c2) => c2.faction === oldF)) {
            for (const a2 of s.armies.filter((x) => x.faction === oldF)) {
              for (const gid of a2.gens) {
                const x = s.generals.find((q) => q.id === gid);
                if (x) x.at = target.id;
              }
            }
            s.armies = s.armies.filter((x) => x.faction !== oldF);
            s.sieges = s.sieges.filter((x) => s.armies.some((a3) => a3.id === x.armyId));
            s.campaigns = (s.campaigns || []).filter((x) => x.faction !== oldF);
            for (const q of s.generals.filter((x) => x.faction === oldF && x.captive && x.captive.by === pl.faction)) q.captive = null;
            const { lord: rl, retainers: rr } = ruinedHouse(s, oldF);
            if (pl.faction === s.player && (rl || rr.length)) {
              s.warSettle = { faction: oldF, winner: pl.faction, castleId: target.id,
                lordId: rl ? rl.id : null,
                queue: [...(rl ? [rl.id] : []), ...rr.map((x) => x.id)] };
            } else {
              for (const g2 of [rl, ...rr].filter(Boolean)) {
                if (Math.random() < 0.4) s.generals = s.generals.filter((x) => x.id !== g2.id);
                else takeAsPrisoner(s, g2, pl.faction, target.id);
              }
              s.chronicle.push({ y: s.year, m: s.month,
                text: `${s.factions[oldF].name}は最後の城を失い、滅亡した。` });
            }
            s.ruined = [...(s.ruined || []), oldF];
          }
          return false;
        }
        if (pl.type === "偵察") { s.intel[target.id] = { y: s.year, m: s.month }; say(`${target.name}の内情を掴んだ。`); }
        else if (pl.type === "流言") {
          /* 一人に絞れば深く刺さり、城中に広く撒けば浅く広がる。
             噂は的を絞るほど効く。誰それが敵に通じている、という形になるからである。 */
          const 名指し = pl.matoId
            ? s.generals.find((x) => x.id === pl.matoId && x.at === target.id && !x.captive)
            : null;
          if (名指し) {
            target.min = Math.max(0, target.min - 4);
            名指し.loyal = Math.max(0, (名指し.loyal == null ? 60 : 名指し.loyal) - 18);
            say(`${target.name}に${名指し.name}を疑う噂が流れた（忠誠 ${Math.round(名指し.loyal)}）。`);
          } else {
            target.min = Math.max(0, target.min - 9);
            for (const x of s.generals.filter((q) => q.at === target.id)) x.loyal = Math.max(0, x.loyal - 6);
            say(`${target.name}に流言が広がり、民忠と武将の忠誠が下がった。`);
          }
        } else if (pl.type === "城工作") {
          const ways = ["櫓への放火", "兵糧庫の破壊", "城門の閂を折る", "井戸への投げ込み", "堀の水を落とす"];
          const w = ways[Math.floor(Math.random() * ways.length)];
          target.def = Math.max(0, target.def - 6);
          target.food = Math.round(target.food * (w === "兵糧庫の破壊" ? 0.7 : 0.88));
          target.min = Math.max(0, target.min - 4);
          if (w === "井戸への投げ込み") target.well = Math.max(0, (target.well == null ? 100 : target.well) - 34);
          if (w === "堀の水を落とす") target.def = Math.max(0, target.def - 4);
          say(`${target.name}で城工作が成った（${w}）。城の備えが落ちた。`);
        } else if (pl.type === "密約") {
          target.intrigue = true;
          const 者 = pl.matoId ? s.generals.find((x) => x.id === pl.matoId) : null;
          target.intrigueBy = 者 ? 者.id : null;
          say(者
            ? `${target.name}の${者.name}と密約が成った。攻め寄せた時に門を開く。`
            : `${target.name}の内応者と密約が成った。攻め寄せた時に効く。`);
        } else if (pl.type === "引き抜き") {
          /* 誰を誘うかは仕掛けるときに選んである。
             選んだ者の心が離れていなければ、いくら手を尽くしても応じない。
             選ばれた者が城を去っていれば、城中で最も心の離れた者に当たる。 */
          const 城中 = s.generals.filter((x) => x.at === target.id && x.faction === target.faction && !x.lord && !x.captive);
          const cand = (pl.matoId ? 城中.find((x) => x.id === pl.matoId) : null)
            || [...城中].sort((a, b) => (a.loyal || 60) - (b.loyal || 60))[0];
          if (cand && (cand.loyal == null ? 60 : cand.loyal) < 70) {
            cand.faction = pl.faction; cand.loyal = 60;
            const home = s.castles.find((x) => x.faction === pl.faction);
            cand.at = home ? home.id : cand.at;
            say(`${cand.name}が${s.factions[pl.faction].name}へ寝返った。`);
          } else {
            say(cand
              ? `${cand.name}は誘いに応じなかった（忠誠${Math.round(cand.loyal == null ? 60 : cand.loyal)}。70を下回らねば動かぬ）。`
              : `${target.name}に誘える武将がいなかった。`);
          }
        }
        return false;
      });
      for (const fid of Object.keys(s.factions)) {
        if (fid === s.player) continue;
        const f = s.factions[fid];
        for (const c of s.castles.filter((x) => x.faction === fid)) {
          const gen = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive).sort((a, b) => b.gov - a.gov)[0];
          if (!gen || f.gold < 260) continue;
          const cap = troopCap(c, f.mobilization, g || s);
          const cur = c.local + s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive).reduce((a, x) => a + x.retinue, 0);
          if (cur < cap * 0.8 && f.gold > 900) {
            const n = Math.min(Math.round((cap - cur) * 0.35), Math.floor((f.gold - 400) / 0.45), Math.floor(c.pop * 0.012));
            if (n > 0) { c.local += n; f.gold -= Math.round(n * 0.45); c.pop -= Math.round(n * 0.2);
              rosterSync(c, "rost", c.local, `loc-${c.id}`); }
          } else if (c.koku < c.kokuMax * 0.92) {
            c.koku = Math.min(c.kokuMax, c.koku + Math.round((c.kokuMax - c.koku) * 0.06 * (0.5 + gen.gov / 100)));
            f.gold -= 140;
          } else { c.def = Math.min(100, c.def + 2); f.gold -= 220; }
        }
      }
      const arrivals = [];
      for (const a of s.armies) {
        let budget = MARCH_PER_MONTH * (a.food > 0 ? 1 : 0.5);
        while (budget > 0 && a.path.length > 1) {
          const r = roadBetween(a.path[0], a.path[1]);
          const need = (r ? r[2] : 10) / ROAD_SPEED[r ? r[3] : "街道"];
          const rem = need * (1 - a.prog);
          // 海に乗り出す。渡りきるまで岸に足はつけられぬ（GDD 10章）
          if (r && r[3] === "海路" && a.prog === 0 && !a.seaDone) {
            a.seaDone = true;
            const inter = seaInterception(s, a, "海路");
            /* 遊ぶ側の軍が阻まれたなら、盤の上で船戦をする（GDD 10章）。
               ここでは決着させず、申し送りに積んで月送りを止める。
               画面が受け取り、海戦が終わってから続きを進める。
               見物のときと、他家どうしの海戦は、これまで通りその場で解く。 */
            if (inter && a.faction === s.player && !s.autoPlay) {
              s.seaCall = {
                armyId: a.id, by: inter.by, from: a.path[0], to: a.path[1],
                mine: inter.mine, foe: inter.foe,
              };
              break;
            }
            if (inter) {
              const res = resolveSeaBattle(s, a, inter);
              const from = nodeById(a.path[0]), to = nodeById(a.path[1]);
              const txt = res.win
                ? `${from.name}と${to.name}の間の海で${s.factions[a.faction].name}が${res.foeName}の水軍を破った（${fmt(res.lost)}人を失う）。`
                : `${from.name}と${to.name}の間の海で${s.factions[a.faction].name}が${res.foeName}の水軍に敗れた（${fmt(res.lost)}人が海に沈んだ）。`;
              s.chronicle.push({ y: s.year, m: s.month, text: txt });
              if (a.faction === s.player || inter.by === s.player) events.push(txt);
              // 敗れれば渡海は成らない（盤の上で戦うときと同じ筋）
              if (!res.win) {
                // 兵も将も国元へ戻す。海の上に置き去りにはしない。
                const home = s.castles.find((c2) => c2.id === a.from);
                if (home) {
                  home.local += Math.max(0, a.local);
                  home.food += Math.max(0, a.food || 0);
                  if (a.rost && a.rost.length) home.rost = [...(home.rost || []), ...a.rost];
                  rosterSync(home, "rost", home.local, `loc-${home.id}`);
                  for (const gid of a.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = home.id; }
                }
                s.campaigns = (s.campaigns || []).filter((c2) => !(c2.armies || []).includes(a.id));
                a.dead = true;
                break;
              }

            }
          }
          if (budget >= rem) {
            budget -= rem; a.prog = 0; a.path.shift(); a.at = a.path[0];
            a.seaDone = false;                          // 次の区間でまた海に出うる
          } else { a.prog += budget / need; budget = 0; }
        }
        if (a.dead) continue;
        a.food -= Math.round(a.men * 0.09);
        if (a.faction === s.player) {
          const days = Math.round((a.food / Math.max(1, a.men * 0.09)) * 30);
          if (a.food <= 0) events.push(`進軍中の軍の兵糧が尽きた。士気と兵が落ちている。`);
          else if (days < 45) events.push(`進軍中の軍の兵糧が残り約${days}日分。補給が切れかけている。`);
        }
        if (a.food <= 0) { a.food = 0; a.men = Math.round(a.men * 0.96); }
        if (a.path.length === 1 && !a.sieging) arrivals.push(a);
      }
      s.armies = s.armies.filter((a) => !a.dead);
      // 同じ拠点へ着いた本隊と援軍は合流する（GDD 7.3 集結）
      for (const a of [...s.armies]) {
        if (a.aid == null || a.path.length > 1) continue;
        const host = s.armies.find((h) => h !== a && h.at === a.at && h.target === a.target && h.aid == null && h.faction === a.faction);
        if (!host) continue;
        host.local += a.local; host.men += a.men; host.food += a.food;
        host.gens = [...host.gens, ...a.gens];
        if (a.rost) host.rost = [...(host.rost || []), ...a.rost];
        s.armies = s.armies.filter((x) => x.id !== a.id);
        const idx = arrivals.indexOf(a);
        if (idx >= 0) arrivals.splice(idx, 1);
        if (host.faction === s.player || a.aid === s.player) {
          events.push(`${s.factions[a.faction].name}の援軍${fmt(a.men)}人が本隊へ合流した。`);
        }
      }
      /* 街道での行き合い（GDD 9.1）。
         甲が乙を攻め、同じ月に乙が甲を攻めれば、両軍は同じ街道を逆に進む。
         すれ違うことはない。どこかで行き合い、まず野戦になる。
         勝ったほうがそのまま道を進み、負けたほうの城を攻める。 */
      s.clashes = [];
      const 行き合い留め = new Set();                 // 野戦の決着がつくまで、城攻めには進ませない
      for (const cl of marchClashes(s)) {
        const fa = (s.armies.find((x) => x.id === cl.aId) || {}).faction;
        const fb = (s.armies.find((x) => x.id === cl.bId) || {}).faction;
        if (!s.autoPlay && (fa === s.player || fb === s.player)) {
          // 遊ぶ側が関わるなら、盤の上で戦う
          s.clashes.push(cl);
          行き合い留め.add(cl.aId); 行き合い留め.add(cl.bId);
          events.push(`${cl.place}で${s.factions[fa].name}と${s.factions[fb].name}の軍が行き合った。野戦になる。`);
          continue;
        }
        // 画面の外なら、その場で解く。負けた軍は退いて s.armies から落ちるので、
        // 末尾で pendingArrivals を組むときに自ずと外れ、城攻めには進まない。
        resolveClash(s, cl.aId, cl.bId, cl.place);
      }
      /* ------------------------------- 盟友からの援軍の要請（GDD 7.4）

         約束を交わした家の城が攻められれば、使者が来る。囲まれているか、
         敵の軍が向かっているか。放っておけば、その家は削られ、やがて隣に
         強い敵が立つ。

         こちらが同盟・従属の間柄なら、応じるか否かも、誰をどれだけ出すかも
         こちらが決める。対等な間柄だからである。
         こちらが臣従している相手からの要請は、下知である。断る筋はない。 */
      if (!s.aidCall && !s.autoPlay) {
        for (const c of s.castles) {
          if (c.faction === s.player) continue;
          const st = relOf(s, s.player, c.faction).state;
          if (st !== "同盟" && st !== "従属" && st !== "臣従") continue;
          if (underMyBanner(s, s.player, c.faction)) continue;   // 旗の下の家は自分で守る
          const 囲まれ = s.sieges.some((sg) => sg.castleId === c.id);
          const 迫る = s.armies.filter((a) => a.target === c.id && a.faction !== c.faction
            && !atPeace(s, c.faction, a.faction));
          if (!囲まれ && !迫る.length) continue;
          // 同じ城について何度も使者を寄越さない
          if ((s.aidAsked || []).includes(c.id)) continue;
          // こちらが臣従している相手なら下知。そうでなければ頼みである。
          const 下知 = st === "臣従" && isVassal(s, c.faction, s.player);
          s.aidCall = {
            castleId: c.id, faction: c.faction, state: st, 下知,
            囲まれ, 寄せ手: [...new Set(迫る.map((a) => a.faction))],
            y: s.year, m: s.month,
          };
          s.aidAsked = [...(s.aidAsked || []), c.id];
          events.push(下知
            ? `${s.factions[c.faction].name}より${c.name}への援軍の下知が届いた。`
            : `${s.factions[c.faction].name}より${c.name}への援軍を求められた。`);
          break;
        }
      }
      // 危うさが去った城は、また改めて使者を寄越しうる
      if ((s.aidAsked || []).length) {
        s.aidAsked = s.aidAsked.filter((id) => {
          const c = s.castles.find((x) => x.id === id);
          if (!c) return false;
          return s.sieges.some((sg) => sg.castleId === id)
            || s.armies.some((a) => a.target === id && a.faction !== c.faction);
        });
      }

      // 相手方から身代金の申し出。こちらが捕らえている武将について月ごとに起こりうる。
      for (const q of s.generals) {
        if (!q.captive || q.captive.by !== s.player || s.ransomOffer) continue;
        /* 滅んだ家からは使者が来ない。
           勢力の記録は盤に残り、金も残ったままなので、城を一つも持たぬ家が
           身代金を申し出ていた。身請けする家がもう無いのだから、話が立たない。 */
        if (!houseAlive(s, q.captive.from)) continue;
        const worth = (q.lead + q.valor + q.wit + q.gov) / 400;
        if (Math.random() > 0.10 + worth * 0.18) continue;
        const cost = ransomCost(s, q);
        const f = s.factions[cost.payer];
        const foodHave = s.castles.filter((c2) => c2.faction === cost.payer).reduce((a, c2) => a + c2.food, 0);
        if (!f || f.gold < cost.gold || foodHave < cost.food) continue;
        s.ransomOffer = { genId: q.id, gold: cost.gold, food: cost.food, rank: cost.rank, from: cost.payer };
        break;
      }
      // 滅んだ家の捕虜は、囚われの月を重ねるごとに心をほぐしていく（GDD 12.4）
      for (const q of s.generals) {
        if (!q.captive || !q.captive.ruin) continue;
        q.warLoyal = clamp((q.warLoyal || 0) + 2, 0, 100);
        q.fed = false;                        // 扶持は月に一度
      }
      /* 牧と鉄砲鍛冶の実り（GDD 6.3）。
         年に一度、春に届く。近い城の蓄えへ積む。
         馬も鉄砲も城の蓄えとして数えているのに、その出どころが盤の上に
         無かった。牧を押さえれば騎馬が揃い、鍛冶を抱えれば鉄砲が揃う。 */
      if (s.month === 4) {
        for (const fid of Object.keys(s.factions)) {
          const 馬 = specialBonus(s, fid, "horse"), 砲 = specialBonus(s, fid, "gun");
          if (!馬 && !砲) continue;
          const 城 = s.castles.filter((c) => c.faction === fid);
          if (!城.length) continue;
          const 本 = 城.find((c) => s.generals.some((q) => q.lord && q.at === c.id && q.faction === fid)) || 城[0];
          if (馬) 本.horse = (本.horse || 0) + 馬;
          if (砲) 本.gun = (本.gun || 0) + 砲;
          if (fid === s.player) {
            events.push(`牧と鍛冶より${馬 ? `馬${馬}頭` : ""}${馬 && 砲 ? "・" : ""}${砲 ? `鉄砲${砲}挺` : ""}が${本.name}へ届いた。`);
          }
        }
      }
      // 人は年を取る。春（四月）を年の改まりとし、皆ひとつ齢を加える。
      if (s.month === 4) {
        for (const q of s.generals) q.age = (q.age || 30) + 1;
        for (const q of [...s.generals]) {
          const a = q.age;
          const cap = lifeSpan(q);
          // 史実で没する年が定まっている者は、その年に没する。
          const fated = FATED[q.id] && s.year >= FATED[q.id];
          // 定めの齢に達すれば必ず没する。それ以前も、老いれば病を得る。
          const reached = fated || a >= cap;
          if (!reached && a < 48) continue;
          const p = reached ? 1
            : a >= cap - 4 ? 0.34 : a >= 70 ? 0.16 : a >= 60 ? 0.075 : a >= 54 ? 0.035 : 0.015;
          if (Math.random() > p) continue;
          const wasLord = q.lord;
          s.generals = s.generals.filter((x) => x.id !== q.id);
          if (wasLord) {
            if (q.faction === s.player && !s.autoPlay) {
              // 跡目は当主が選ぶ。誰を立てるかで家中の様相が変わる。
              s.succession = { dead: q, cause: "病没した" };
            } else succeed(s, q, "病没した");
          } else {
            // 家を持つ者は、子が跡を継ぐ（GDD 6.7）
            const h = inheritHouse(s, q);
            if (h) {
              const txt = `${q.name}が病没した（${a}歳）。${h.name}が${houseName(q)}の家を継いだ（禄高${fmt(stipendOf(s, h))}石）。`;
              s.chronicle.push({ y: s.year, m: s.month, text: txt });
              if (q.faction === s.player) events.push(txt);
            } else {
              s.chronicle.push({ y: s.year, m: s.month,
                text: `${q.name}が病没した（${a}歳）。${hasHouse(s, q) ? `${houseName(q)}の家は跡を継ぐ者なく絶えた。` : ""}` });
            }
          }
          if (q.faction === s.player) events.push(`${q.name}が病没した（${a}歳）。`);
        }
      }
      // 城を失った家の軍が残っていれば散らす。
      // 滅んだはずの家が城を攻めてくることのないように。
      for (const fid of [...new Set(s.armies.map((a) => a.faction))]) {
        if (s.castles.some((c) => c.faction === fid)) continue;
        for (const a2 of s.armies.filter((x) => x.faction === fid)) {
          for (const gid of a2.gens) {
            const x = s.generals.find((q) => q.id === gid);
            if (x && !s.castles.some((c) => c.id === x.at)) {
              const near = s.castles[0];
              if (near) x.at = near.id;
            }
          }
        }
        s.armies = s.armies.filter((x) => x.faction !== fid);
        s.sieges = s.sieges.filter((x) => s.armies.some((a3) => a3.id === x.armyId));
        s.campaigns = (s.campaigns || []).filter((x) => x.faction !== fid);
      }
      // 官位。五畿を制した者は朝廷より高官に叙せられる（GDD 12.5）
      for (const fid of Object.keys(s.factions)) {
        if (!s.castles.some((c) => c.faction === fid)) continue;
        const cr = courtRank(s, fid);
        const had = (s.courtRanks || {})[fid];
        if (!cr) { if (had) { s.courtRanks = { ...(s.courtRanks || {}), [fid]: null }; } continue; }
        if (had === cr.key) continue;
        s.courtRanks = { ...(s.courtRanks || {}), [fid]: cr.key };
        const f4 = s.factions[fid];
        f4.prestige = clamp((f4.prestige || 50) + cr.prestige, 0, 100);
        const txt = cr.key === "征夷大将軍"
          ? `${f4.name}が畿内より関東までを制し、征夷大将軍に任ぜられた。幕府を開き、天下に号令する。`
          : `${f4.name}が五畿をことごとく制し、朝廷より${cr.key}に叙せられた。`;
        s.chronicle.push({ y: s.year, m: s.month, text: txt });
        events.push(txt);
      }
      // 一揆（GDD 12.5）。国がまとまらず民忠も低い城では、百姓が蜂起する。
      for (const c of s.castles) {
        const grip = provinceGrip(s, c.faction, c.kuni);
        if (grip >= 0.999 || c.min >= 58) continue;
        const p2 = clamp((58 - c.min) / 2400 * (1.4 - grip), 0, 0.012);
        if (Math.random() > p2) continue;
        const lost = Math.round(c.local * (0.06 + Math.random() * 0.08));
        c.local = Math.max(0, c.local - lost);
        c.koku = Math.round(c.koku * 0.97);
        c.min = clamp(c.min - 4, 0, 100);
        const txt = `${c.name}で一揆が起きた。${fmt(lost)}人を失い、田も荒れた。`;
        s.chronicle.push({ y: s.year, m: s.month, text: txt });
        if (c.faction === s.player) events.push(txt);
      }
      // 幼き当主のもとでは家中がまとまらぬ。後見がいれば、その器量が家を支える。
      for (const fid of Object.keys(s.factions)) {
        const lord = s.generals.find((x) => x.faction === fid && x.lord && !x.captive);
        if (!lord || !needsGuardian(lord)) continue;
        const gd = s.generals.find((x) => x.id === lord.guardian && !x.captive);
        // 後見の器量が高ければ揺れは小さい。後見がいなければ大きく揺れる。
        const drift = gd ? clamp(1.4 - (gd.lead + gd.gov) / 150, 0.1, 1.4) : 2.2;
        for (const x of s.generals.filter((q) => q.faction === fid && !q.lord && !q.captive)) {
          if (x.id === lord.guardian) continue;
          if (x.loyal != null) x.loyal = clamp(x.loyal - drift, 0, 100);
        }
        // 他家からも侮られる
        const f3 = s.factions[fid];
        if (f3) f3.prestige = clamp((f3.prestige || 50) - 0.3, 0, 100);
      }
      // 知行と忠誠（GDD 6.1）。禄が器量に見合わなければ、心は離れていく。
      for (const q of s.generals) {
        if (q.captive) continue;
        const d = loyaltyDrift(q);
        q.loyal = clamp((q.loyal == null ? 60 : q.loyal) + d, 0, 100);
        if (q.loyal <= 12 && !q.lord) {
          // 出奔。あるいは近隣の家へ走る。
          const near = s.castles.filter((c2) => c2.faction !== q.faction);
          const to = near.length ? near[Math.floor(Math.random() * near.length)] : null;
          if (Math.random() < 0.18) {
            if (to) {
              const oldF = q.faction;
              q.faction = to.faction; q.at = to.id; q.loyal = 45; q.fief = Math.round(fiefWanted(q) * 0.8);
              const msg = `${q.name}が${s.factions[oldF].name}を去り、${s.factions[to.faction].name}に走った。`;
              s.chronicle.push({ y: s.year, m: s.month, text: msg });
              if (oldF === s.player || to.faction === s.player) events.push(msg);
            } else {
              s.generals = s.generals.filter((x) => x.id !== q.id);
              s.chronicle.push({ y: s.year, m: s.month, text: `${q.name}が出奔した。` });
              if (q.faction === s.player) events.push(`${q.name}が出奔した。`);
            }
          } else if (q.faction === s.player) {
            events.push(`${q.name}の心が離れつつある（忠誠${忠誠(q)}）。知行を見直すべきである。`);
          }
        }
      }
      // 捕虜は日を重ねるごとに旧主への思いが薄れる（GDD 12.3）
      for (const q of s.generals) {
        if (!q.captive) continue;
        const home = s.factions[q.captive.from];
        if (!home || !s.castles.some((c2) => c2.faction === q.captive.from)) {
          /* 旧主が滅んだ。帰る家はもうない。

             かつては、この場で捕らえた家の者にしていた。だがそれでは、
             旧主と血を分けた一門も、忠義の篤い者も、問答無用で家臣になる。
             捕虜の一覧からも消えるので、遊ぶ側からは「捕虜がいなくなった」と映る。

             家が絶えたからといって、心まで移るわけではない。
             身は囚われたまま、扶持を与え、月を重ねて心が開くのを待つほかない。
             降るかどうかは、ほかの捕虜と同じ関門（登用の可否）を通す（GDD 12.4）。 */
          if (!q.captive.ruin) {
            q.captive = { ...q.captive, ruin: true };
            q.lord = false;                        // 家が絶えれば当主の座もない
            q.warLoyal = q.warLoyal || 0;
            const 文 = `${q.name}は旧主を失い、${s.factions[q.captive.by].name}の手に残された。`;
            s.chronicle.push({ y: s.year, m: s.month, text: 文 });
            if (q.captive.by === s.player) events.push(`捕虜の${q.name}は旧主を失った。処遇を決められる。`);
          }
          // 拠り所を失えば、旧主への思いは早く薄れる
          q.loyal = clamp((q.loyal == null ? 60 : q.loyal) - 1.6, 0, 100);
          if (q.loyal <= 40 && !q.captive.ready) {
            q.captive.ready = true;
            if (q.captive.by === s.player) events.push(`捕虜の${q.name}が心を移した。登用できる。`);
          }
          continue;
        }
        // 旧主との縁。厚ければ忠誠は下がりにくく、薄ければ早く離れる。
        if (q.captive.bond == null) {
          q.captive.bond = q.loyal >= 78 ? 1 : q.loyal <= 45 ? -1 : 0;
        }
        const step = q.captive.bond > 0 ? 0.5 : q.captive.bond < 0 ? 1.8 : 1;
        q.loyal = clamp((q.loyal == null ? 60 : q.loyal) - step, 0, 100);
        if (q.loyal <= 40 && !q.captive.ready) {
          q.captive.ready = true;
          events.push(`捕虜の${q.name}が心を移した。登用できる。`);
        }
      }
      // 他家も寄騎を出す。一城の兵だけでは堅い城は落ちない。
      for (const a of s.armies) {
        if (!auto(a.faction) || a.aid) continue;
        if (a.reinforced || a.path.length > 1) continue;
        a.reinforced = true;
        const tgt = s.castles.find((c2) => c2.id === a.target);
        if (!tgt) continue;
        const dg3 = s.generals.filter((x) => x.at === tgt.id && x.faction === tgt.faction && !x.captive);
        const need = (tgt.local + dg3.reduce((t2, x) => t2 + x.retinue, 0)) * 1.5 - a.men;
        if (need <= 0) continue;
        let sent = 0;
        for (const c2 of s.castles.filter((x) => x.faction === a.faction && x.id !== a.from)) {
          if (sent >= need) break;
          const gs = s.generals.filter((x) => x.at === c2.id && x.faction === a.faction && !x.captive);
          const spare = c2.local + gs.reduce((t2, x) => t2 + x.retinue, 0) - minGarrison(c2);
          if (spare < 400 || !gs.length) continue;
          const take = [...gs].sort((x, y2) => y2.lead - x.lead).slice(0, 1);
          const send = Math.min(Math.round(spare * 0.6), c2.local);
          if (send < 200) continue;
          c2.local -= send;
          for (const t2 of take) t2.at = null;
          const tk = rosterTake(c2.rost || newRoster(c2.local + send, `loc-${c2.id}`), send);
          c2.rost = tk.rest;
          s.armies.push({
            id: `r${Date.now()}${Math.round(Math.random() * 1e6)}`, faction: a.faction, from: c2.id,
            gens: take.map((x) => x.id), local: send, localTrain: c2.localTrain, rost: tk.taken,
            men: send + take.reduce((t2, x) => t2 + x.retinue, 0), at: c2.id,
            path: findPath(c2.id, a.target), prog: 0, food: Math.round(send * 0.6),
            target: a.target, aid: a.faction,
          });
          sent += send;
        }
        if (sent > 0) s.chronicle.push({ y: s.year, m: s.month,
          text: `${s.factions[a.faction].name}が${tgt.name}攻めへ寄騎${fmt(sent)}人を向かわせた。` });
      }
      // 他家の包囲を進める。放っておくと囲んだまま何年も動かない。
      for (const sg2 of [...s.sieges]) {
        const bes = s.armies.find((x) => x.id === sg2.armyId);
        const cs = s.castles.find((x) => x.id === sg2.castleId);
        if (!bes || !cs) continue;
        if (!s.autoPlay && (bes.faction === s.player || cs.faction === s.player)) continue;
        // 試走では自家の包囲も自動で進める
        sg2.months = (sg2.months || 0) + 1;
        // 囲みが長引けば城は痩せる。守り手が回復し続けて落ちない、という膠着を防ぐ。
        if (sg2.months >= 3) {
          cs.def = Math.max(10, cs.def - 1.5);
          cs.localTrain = Math.max(25, cs.localTrain - 1.5);
          cs.local = Math.max(0, cs.local - Math.round(cs.local * 0.03));
          if (sg2.months >= 6 && Math.random() < 0.12) {
            const turn = s.generals.filter((x) => x.at === cs.id && x.faction === cs.faction && !x.captive && !x.lord)
              .sort((a2, b2) => (a2.loyal || 60) - (b2.loyal || 60))[0];
            if (turn && (turn.loyal || 60) < 55) {
              s.chronicle.push({ y: s.year, m: s.month, text: `${cs.name}の${turn.name}が城を開いて寝返った。` });
              sackCastle(s, cs, bes, false);
              continue;
            }
          }
        }
        const dg2 = s.generals.filter((x) => x.at === cs.id && x.faction === cs.faction && !x.captive);
        const dMen2 = cs.local + dg2.reduce((a, x) => a + x.retinue, 0);
        // 兵糧を削り、頃合いを見て攻めかかる
        cs.food = Math.max(0, cs.food - Math.round(cs.local * 0.35 + 600));
        cs.min = Math.max(0, cs.min - 5);
        bes.food -= Math.round(bes.men * 0.09);
        if (cs.food <= 0 || cs.min < 25) { sackCastle(s, cs, bes, false); continue; }
        if (bes.food <= 0) {                                  // 兵糧が尽きれば囲みを解く
          withdrawArmy(s, bes);                               // 出陣元が奪われていても自領へ戻す
          s.sieges = s.sieges.filter((x) => x !== sg2);
          s.chronicle.push({ y: s.year, m: s.month, text: `${s.factions[bes.faction].name}は${cs.name}の囲みを解いた。` });
          continue;
        }
        // 数で押せるなら強攻する
        if (bes.men > dMen2 * 1.6 && Math.random() < 0.45) {
          const aL = Math.round(bes.men * 0.14), dL = Math.round(dMen2 * 0.4);
          bes.men = Math.max(0, bes.men - aL); bes.local = Math.max(0, bes.local - aL);
          cs.local = Math.max(0, cs.local - dL);
          s.chronicle.push({ y: s.year, m: s.month,
            text: `${s.factions[bes.faction].name}が${cs.name}へ攻めかかった（攻${fmt(aL)}人・守${fmt(dL)}人を失う）。` });
          if (cs.local < 150) sackCastle(s, cs, bes, true);
        }
      }
      // 後詰。囲みが緩ければ、城方の勢力が救援を差し向ける（GDD 9.2）
      for (const sg2 of s.sieges) {
        const cs = s.castles.find((x) => x.id === sg2.castleId);
        const bes = s.armies.find((x) => x.id === sg2.armyId);
        if (!cs || !bes || sg2.relief) continue;
        const enc = (sg2.enc == null ? 60 : sg2.enc) / 100;
        if (enc > 0.75) continue;                       // 固く囲まれていれば入れない
        if (Math.random() > 0.55 * (1 - enc)) continue;
        const from = s.castles.filter((c2) => c2.faction === cs.faction && c2.id !== cs.id)
          .map((c2) => ({ c2, p: findPath(c2.id, cs.id) })).filter((x) => x.p)
          .sort((a, b) => a.p.length - b.p.length)[0];
        if (!from) continue;
        const fg = s.generals.filter((x) => x.at === from.c2.id && x.faction === from.c2.faction && !x.captive);
        const avail = from.c2.local + fg.reduce((a, x) => a + x.retinue, 0) - minGarrison(from.c2);
        if (avail < 500 || !fg.length) continue;
        const take = [...fg].sort((a, b) => b.lead - a.lead).slice(0, 2);
        const send = Math.min(Math.round(avail * 0.6), from.c2.local);
        if (send < 200) continue;
        from.c2.local -= send;
        for (const t of take) t.at = null;
        const rid = `f${Date.now()}${Math.round(Math.random() * 1e6)}`;
        s.armies.push({
          id: rid, faction: cs.faction, from: from.c2.id, gens: take.map((x) => x.id),
          local: send, localTrain: from.c2.localTrain,
          rost: (() => { const tk = rosterTake(from.c2.rost || newRoster(from.c2.local + send, `loc-${from.c2.id}`), send); from.c2.rost = tk.rest; return tk.taken; })(),
          men: send + take.reduce((a, x) => a + x.retinue, 0), at: from.c2.id,
          path: findPath(from.c2.id, cs.id), prog: 0, food: Math.round(send * 0.6), target: cs.id, relief: cs.id,
        });
        sg2.relief = rid;
        events.push(`${s.factions[cs.faction].name}が${cs.name}へ後詰を差し向けた（${from.c2.name}より${fmt(send)}人）。`);
      }
      // 他家も国を治める。捨て置くと兵も石高も増えず、天下の形がいつまでも動かない。
      for (const fid of Object.keys(s.factions)) {
        if (!auto(fid)) continue;
        const f2 = s.factions[fid];
        for (const c of s.castles.filter((x) => x.faction === fid)) {
          if (s.sieges.some((sg) => sg.castleId === c.id)) continue;   // 囲まれた城では何もできない
          const gens2 = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive);
          const gov2 = gens2.length ? Math.max(...gens2.map((x) => x.gov)) : 50;
          // 開墾と治水
          if (f2.gold > 400 && Math.random() < 0.5 * lv(s).aiGrow) {
            const room = c.kokuMax - c.koku;
            if (room > c.kokuMax * 0.04) {
              c.koku += Math.round(room * 0.12 * (0.5 + gov2 / 100) * lv(s).aiGrow); f2.gold -= 140;
            } else {
              const cap2 = c.kokuCap || c.kokuMax;
              const add = Math.min(Math.max(0, cap2 - c.kokuMax), Math.round(c.kokuMax * 0.03 * (0.5 + gov2 / 100)));
              if (add > 0) { c.kokuMax += add; f2.gold -= 180; }
            }
          }
          // 徴募
          const cap = troopCap(c, f2.mobilization, s);
          const cur = c.local + gens2.reduce((a, x) => a + x.retinue, 0);
          // 一国を丸ごと押さえたら竿を入れる。国を治める者の当然の務めである。
          if (!f2.kenchiTried || s.month === 4) {
            for (const kuni of provincesHeld(s, fid)) {
              if (kenchiDone(s, kuni)) continue;
              const cost2 = kenchiCost(s, kuni);
              if (f2.gold < cost2.gold * 1.6) continue;
              const gov3 = Math.max(60, ...s.generals.filter((x) => x.faction === fid && !x.captive).map((x) => x.gov));
              f2.gold -= cost2.gold;
              const r2 = runKenchi(s, fid, kuni, gov3);
              s.chronicle.push({ y: s.year, m: s.month,
                text: `${f2.name}が${kuni}に竿を入れた。石高が${fmt(r2.before)}石より${fmt(r2.after)}石に改まった。` });
              break;
            }
            f2.kenchiTried = true;
          }
          // 兵は養うもの。限度いっぱいまで抱えると国が痩せ、城が難攻不落になって天下が凍る。
          const want = Math.round(cap * 0.7);
          if (f2.gold > 700 && cur < want) {
            const n = Math.max(0, Math.min(want - cur, Math.floor((f2.gold - 500) / 0.45), Math.floor(c.pop * 0.010)));
            if (n > 60) {
              c.local += n; f2.gold -= Math.round(n * 0.45);
              rosterSync(c, "rost", c.local, `loc-${c.id}`);
              c.pop -= Math.round(n * 0.2);
            }
          }
          if (Math.random() < 0.25) c.localTrain = Math.min(100, c.localTrain + 2);
        }
      }
      // 家ごとに方針を見直す（GDD 13.2）
      for (const fid of Object.keys(s.factions)) {
        if (!auto(fid)) continue;
        reviewAim(s, fid);
        const fa = s.factions[fid];
        // 気性ごとの振る舞い
        if (fa.temper === "陰謀" && fa.aim && fa.gold > 500 && Math.random() < 0.3 * lv(s).aiPlot) {
          const t = s.castles.find((c2) => c2.id === fa.aim.target);
          if (t) {
            fa.gold -= 220;
            t.min = Math.max(0, t.min - 3);
            for (const x of s.generals.filter((q) => q.at === t.id && q.faction === t.faction && !q.captive)) {
              x.loyal = Math.max(0, (x.loyal == null ? 60 : x.loyal) - 2);
            }
            if (t.faction === s.player) events.push(`${s.factions[fid].name}の手の者が${t.name}で流言を広めている。`);
          }
        }
        if (fa.temper === "堅実" && fa.gold > 600 && Math.random() < 0.35) {
          // 狙われている城の備えを固める
          const risk = s.castles.filter((c2) => c2.faction === fid)
            .sort((a, b) => a.def - b.def)[0];
          if (risk) { risk.def = Math.min(100, risk.def + 2); risk.hp += 150; fa.gold -= 240; }
        }
      }
      for (const fid of Object.keys(s.factions)) {
        if (!auto(fid) || s.armies.some((a) => a.faction === fid)) continue;
        const fa = s.factions[fid];
        // 気性で腰の重さが変わる。進取は攻めがち、堅実は備えを固めてから。
        const eager = (fa.temper === "進取" ? 0.60 : fa.temper === "堅実" ? 0.32 : 0.45) * lv(s).aiEager;
        if (Math.random() > eager) continue;
        const aim = fa.aim;
        const order = aim ? [s.castles.find((x) => x.id === aim.from), ...s.castles.filter((x) => x.faction === fid && x.id !== aim.from)]
          : s.castles.filter((x) => x.faction === fid);
        for (const c of order.filter(Boolean)) {
          if (c.faction !== fid) continue;
          // 囲まれた城、敵軍が門前まで来ている城からは兵を出さない。
          // 留守にすれば、そのまま城を取られる。守るのが先である。
          if (s.sieges.some((sg) => sg.castleId === c.id)) continue;
          if (s.armies.some((a2) => a2.faction !== fid && a2.target === c.id
            && (a2.at === c.id || !a2.path || a2.path.length <= 1))) continue;
          const gens = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive);
          const avail = c.local + gens.reduce((a, x) => a + x.retinue, 0) - minGarrison(c);
          if (avail < 700) continue;
          const passable2 = (t2) => {
            const path = findPath(c.id, t2.id);
            if (!path) return false;
            if ((marchMonths(c.id, t2.id) || 99) > 6) return false;
            for (let i = 1; i < path.length - 1; i++) {
              const mid = s.castles.find((y) => y.id === path[i]);
              if (!mid) return false;
              if (mid.faction === fid) continue;
              const st = relOf(s, fid, mid.faction).state;
              if (st !== "同盟" && st !== "従属" && st !== "臣従") return false;
            }
            return true;
          };
          const reach = s.castles.filter((x) => x.faction !== fid && !atPeace(s, fid, x.faction) && passable2(x));
          // 国をまとめる利を知る（GDD 12.5）。
          // あと一城二城で一国を丸ごと押さえられるなら、そこを先に取る。
          // 五畿の残り城はさらに重い。官位という報いがあるからである。
          const worth = (t2) => {
            const cs2 = s.castles.filter((x) => x.kuni === t2.kuni);
            if (!cs2.length) return 0;
            const rest = cs2.filter((x) => x.faction !== fid && x.id !== t2.id).length;
            let w = rest === 0 ? 60 : rest === 1 ? 24 : rest === 2 ? 8 : 0;
            if (GOKINAI.includes(t2.kuni)) {
              // 五畿は特別である。四国まで押さえていれば、残る一国は何を措いても取る。
              const got = GOKINAI.filter((k) => holdsProvince(s, fid, k)).length;
              w += rest === 0 ? 40 + got * 22 : 10 + got * 6;
            }
            return w;
          };
          const scored2 = reach.map((x) => ({
            x, s2: worth(x) - findPath(c.id, x.id).length * 1.2
              + (aim && aim.target === x.id ? 14 : 0),
          })).sort((a, b) => b.s2 - a.s2);
          const cand = scored2.length ? scored2[0].x : null;
          if (!cand) continue;
          const dg = s.generals.filter((x) => x.at === cand.id && x.faction === cand.faction);
          const foeMen2 = cand.local + dg.reduce((a, x) => a + x.retinue, 0);
          // 常に優勢でなければ動かぬ、という将ばかりでは天下は動かぬ。
          // 知略に優れた者は、雨の月に、劣勢を承知で勝負に出る。桶狭間はそういう戦であった。
          let need = lv(s).aiNeed;
          const head2 = [...gens].sort((x, y2) => (y2.wit + y2.lead) - (x.wit + x.lead))[0];
          if (head2 && head2.wit >= 78) {
            const wet = s.weather === "雨" || s.weather === "雪" || s.weather === "曇";
            const p2 = ambushChance(head2, s.weather || "晴", "forest", avail / Math.max(1, foeMen2));
            // 奇襲の目が十分にあるなら、寡兵でも仕掛ける
            if (p2 > 0.22 && (wet || head2.wit >= 88)) need = 0.34;
            else if (p2 > 0.15) need = 0.68;
          }
          if (avail < foeMen2 * need) continue;
          const take = gens.sort((a, b) => b.lead - a.lead).slice(0, 3);
          const send = Math.round(avail * 0.85);
          const localSend = Math.max(0, Math.min(c.local, send - take.reduce((a, x) => a + x.retinue, 0)));
          c.local -= localSend;
          s.armies.push({
            id: `a${Date.now()}${Math.random()}`, faction: fid, from: c.id, gens: take.map((x) => x.id),
            local: localSend, localTrain: c.localTrain, men: localSend + take.reduce((a, x) => a + x.retinue, 0),
            at: c.id, path: findPath(c.id, cand.id), prog: 0, food: Math.round(send * 0.6), target: cand.id,
          });
          for (const t of take) t.at = null;
          c.food -= Math.round(send * 0.6);
          events.push(`${s.factions[fid].name}が${c.name}より出陣。${cand.name}を目指す。`);
          break;
        }
      }
      /* 旗の下の城を狙う戦役は落とす。
         寝返りや従属で、狙っていた城が味方になることがある。
         そのまま残せば、味方に向かって軍議が開かれる。 */
      旗の下を狙う戦役を落とす(s);
      // 天下が定まったか（報せに載せるため、月を進める前に判ずる）
      if (!s.unified) {
        const u = checkUnified(s);
        if (u) {
          s.unified = { fid: u.fid, y: s.year, m: s.month, vassals: u.vassals, direct: u.direct };
          const nm = s.factions[u.fid].name;
          const how = u.direct ? "すべての城を握り" : `${u.vassals.map((v) => s.factions[v].name).join("・")}を従え`;
          const gd = u.grade === "一統" ? "天下ことごとくを直に治め、諸家は一つも残らなかった"
            : u.grade === "大成" ? `${u.mine}城を直に治め、残るは旗下の家々である`
            : u.grade === "覇" ? `${u.mine}城を直に治め、なお多くの家を従えている`
            : `${u.mine}城を直に治めるのみで、大半は従属する家々である`;
          s.chronicle.push({ y: s.year, m: s.month,
            text: `${nm}が${how}、この地に天下を定めた。${gd}。` });
          events.push(u.fid === s.player ? "天下が定まった。この地に並ぶ者はない。" : `${nm}がこの地を統べた。`);
        }
      }
      s.month++;
      if (s.month > 12) {
        s.month = 1; s.year++;
        // 元服。幼き当主が十五に達すれば、後見が解ける（GDD 6.6）
        for (const q of s.generals) {
          if (!q.lord || !q.guardian) continue;
          if ((q.age || 30) < COMING_OF_AGE) continue;
          const gd = s.generals.find((x) => x.id === q.guardian);
          q.guardian = null;
          const txt = `${q.name}が元服し、みずから家督を執った。${gd ? `${gd.name}の後見は解けた。` : ""}`;
          s.chronicle.push({ y: s.year, m: s.month, text: txt });
          if (q.faction === s.player) events.push(txt);
        }
        // 家を持つ者に子が生まれる（GDD 6.7）。
        // すでに子がある者、史実の子が後年に現れる者には、重ねて生まれない。
        for (const q of [...s.generals]) {
          if (q.captive || q.lord) continue;
          const a2 = q.age || 30;
          if (a2 < 18 || a2 > 52) continue;
          if (!hasHouse(s, q)) continue;
          const hasKid = s.generals.some((x) => PARENT[x.id] === q.id && !x.captive)
            || NEWCOMERS.some((n) => PARENT[n.id] === q.id);
          if (hasKid) continue;
          if (Math.random() > 0.07) continue;
          const kid = bearChild(s, q);
          if (kid && q.faction === s.player) events.push(`${q.name}に子が生まれた（${kid.name}）。`);
        }
        // 年が改まれば、若い者が世に出る（GDD 6.1）
        for (const t of emergeGenerals(s)) {
          s.chronicle.push({ y: s.year, m: s.month, text: t });
          events.push(t);
        }
      }
      /* 迷子の見回り。軍にも属さず城にもいない将を、自領へ戻す。
         落とし穴は一つずつ塞いだが、見落としがあっても、ここで月ごとに拾う。
         将が盤のどこにもいない、という状態だけは残してはならない。 */
      for (const q of restoreStrays(s)) {
        if (q.faction !== s.player) continue;
        events.push(`${q.name}の所在が知れずにいたが、${(s.castles.find((c) => c.id === q.at) || {}).name}に戻った。`);
      }
      s.orders = {};
      // 行き合いの野戦を控えている軍は、決着がつくまで城攻めに進ませない。
      // 退いた軍もここで落ちる。
      s.pendingArrivals = arrivals
        .filter((a) => !行き合い留め.has(a.id) && s.armies.some((x) => x.id === a.id))
        .map((a) => a.id);
      /* 代替わりの報せ（GDD 6.3）。

         succeed は月送りのあちこちから呼ばれる（寿命、討死、捕縛、内応、隠居）。
         そのつど戦国記に一行残るだけだったので、自家の当主が替わっても気づかぬ
         ことがあった。家の大事であるから、月送りの報せに必ず立てる。 */
      for (const k of s.代替わり || []) {
        const fn = (s.factions[k.faction] || {}).name || "家";
        if (k.faction === s.player) {
          events.push(k.retire
            ? `【代替わり】${k.先代}が隠居し、${k.当主}が当主となった。`
            : `【代替わり】${k.先代}が${k.cause}。${k.当主}（${k.age}歳）が家督を継いだ。`
              + `${k.blood ? "" : "血筋の者ではなく、家中は揺れている。"}`);
          if (k.改名) events.push(`【家名】${k.改名.前}を改め、以後${k.改名.後}と称する。`);
        } else {
          events.push(k.改名
            ? `${k.改名.前}で代替わりがあり、${k.当主}が継いで${k.改名.後}と称した。`
            : `${fn}で代替わりがあり、${k.当主}が家督を継いだ。`);
        }
      }
      s.代替わり = [];
      s.monthEvents = events;
      if (events.length) s.chronicle.push(...events.map((t) => ({ y: s.year, m: s.month, text: t })));
      if (s.chronicle.length > 400) s.chronicle = s.chronicle.slice(-400);   // 古い記録は流す
      return s;
}
