/* ==========================================================================
   天下分け目の一戦（GDD 12.6／8.10）

   盤の上の家の兵を、そのまま野へ載せる。関ヶ原の筋書きと違って布陣は
   決まっていない――どの城の誰が来たかで、その都度ちがう陣ができる。

   置き方は野ごとの「陣」に従う。受けた側が守勢の陣、挑んだ側が攻勢の陣に立つ。
   一方三十二隊、合わせて六十四隊。隊はいずれも横陣で入る（大軍どうしの
   ぶつかり合いで、初めから鶴翼や魚鱗に散らすと戦列が崩れる）。
   ========================================================================== */
import { FIELD, MAX_CORPS, terrainAt, 筋書きの野を組む } from "./field.js";
import { corpsMax, corpsMen, makeCorps, placeSquads } from "./corps.js";
import { createBattle } from "./engine.js";
import { newRoster, rosterSum, rosterTake } from "../core/roster.js";
import { 陣立てを敷く, 野を探す } from "../data/wakemeba.js";
import { 出せる地の兵 } from "../core/gourei.js";
import { 分け目の備えを組む, 分け目の限り, 分け目の暮れ } from "../core/wakeme.js";

const 通れぬ = new Set(["deep", "mountain", "wall", "gate", "moat"]);
const 黄の色 = "#D9A62A";

/* 陣立て（備の群れ）に沿って隊を置く。通れぬ地に当たったら、陣の奥へ少し逃がす。 */
function 陣に並べる(陣, n) {
  const 場 = 陣立てを敷く(陣.備 || [], n);
  return 場.map((p) => {
    const co = Math.cos(p.向), si = Math.sin(p.向);
    let x = p.x, y = p.y;
    for (let t = 0; t < 40 && 通れぬ.has(terrainAt(x, y)); t++) { x -= co * 90; y -= si * 90; }
    return { x: Math.round(clampIn(x, FIELD.w)), y: Math.round(clampIn(y, FIELD.h)), 向: p.向, 名: p.名, 役: p.役 };
  });
}

const clampIn = (v, 端) => Math.max(160, Math.min(端 - 160, v));

/* 日和見（黄）になるか（GDD 12.6）。
   忠誠の薄い将と、旗の下から出てきた家の隊は、優勢になるまで動かない。 */
function 日和見か(s, 手, 将) {
  const 忠 = 将 && 将.loyal != null ? 将.loyal : 70;
  if (手.旗の下) return 忠 < 70;
  return 忠 < 45;
}

/* 一方の備えを隊に仕立てる。名簿は城から割いて持たせる。 */
/* 誰をどの備に置くか（GDD 12.6）。

   備は前から順に並んでいる（先手・高み・押さえ…、最後が本陣）。手は兵の多い順に
   来るので、そのまま当てると本陣に小勢が座り、当主が先手に立つ。これでは逆である。

     一　当主の手は本陣へ。総大将は戦列の後ろで旗を掲げるものである。
     二　残りは兵の多い順に、前の備から埋める。厚い手が先手と高みに就く。
     三　本陣の枠が余ったら、いちばん小勢の手を回す（旗本の数合わせ）。 */
function 備を当てる(s, 手ら, 場) {
  const 当 = new Array(場.length).fill(null);
  const 本陣枠 = 場.map((p, i) => (p.役 === "本陣" ? i : -1)).filter((i) => i >= 0);
  const 残り = 手ら.slice();
  const 当主の手 = 残り.findIndex((手) => {
    const g = (s.generals || []).find((x) => x.id === 手.将);
    return g && g.lord;
  });
  if (当主の手 >= 0 && 本陣枠.length) {
    当[本陣枠[0]] = 残り.splice(当主の手, 1)[0];
  }
  /* 前の備から、兵の厚い手を当てる（本陣の枠は後回し）。 */
  const 前から = 場.map((p, i) => i).filter((i) => !当[i] && 場[i].役 !== "本陣");
  for (const i of 前から) { if (!残り.length) break; 当[i] = 残り.shift(); }
  const 後ろ = 本陣枠.filter((i) => !当[i]);
  for (const i of 後ろ) { if (!残り.length) break; 当[i] = 残り.pop(); }   // 小勢を旗本に
  /* それでも余ったら、空いている枠へ順に。 */
  for (let i = 0; i < 当.length && 残り.length; i++) if (!当[i]) 当[i] = 残り.shift();
  return 当;
}

function 備えを隊にする(s, fid, 陣, side, 色, 覚え) {
  const 手ら = 分け目の備えを組む(s, fid).slice(0, Math.min(分け目の限り, MAX_CORPS));
  const 場 = 陣に並べる(陣, 手ら.length);
  /* 枠と手の対応は崩さない（空の枠は飛ばすだけ）。詰めて並べ直すと、
     本陣に当てたはずの当主が前の枠へずれる。 */
  const 当 = 備を当てる(s, 手ら, 場);
  const 隊 = [];
  当.forEach((手, i) => {
    if (!手) return;
    const 将 = (s.generals || []).find((g) => g.id === 手.将);
    if (!将) return;
    const 直 = Math.min(将.retinue || 0, 手.兵);
    const 在 = Math.max(0, 手.兵 - 直);
    /* 名簿と兵を割いて持たせる。

       出どころは二つある――城の在地の兵（留守居を除いた分）と、その城にいる
       他の将の手勢である。どちらも帳から引く。引かずに盤へ載せると、戦のあとに
       生き残りを書き戻したときに兵が湧く（出した城はそのまま、戻り先だけ増える）。 */
    let 在名簿 = null;
    let 残 = 在;
    const 出し前 = {};
    for (const cid of 手.城ら) {
      const 城 = (s.castles || []).find((c) => c.id === cid);
      if (!城 || 残 <= 0) continue;
      /* 一　城の在地の兵。引けるのは「出せる地の兵」まで。 */
      const 出す = Math.min(残, Math.max(0, 出せる地の兵(s, 城)));
      if (出す > 0) {
        if (城.rost) {
          const tk = rosterTake(城.rost, Math.min(出す, rosterSum(城.rost)));
          城.rost = tk.rest;
          在名簿 = [...(在名簿 || []), ...tk.taken];
          const 取れた = rosterSum(tk.taken);
          if (取れた < 出す) 在名簿 = [...在名簿, ...newRoster(出す - 取れた, `wk-${cid}`)];
        } else {
          在名簿 = [...(在名簿 || []), ...newRoster(出す, `wk-${cid}`)];
        }
        城.local = Math.max(0, (城.local || 0) - 出す);
        出し前[cid] = 出す;
        残 -= 出す;
      }
      /* 二　その城にいる他の将の手勢。隊の頭以外は、手勢ごとこの隊に入る。 */
      for (const o of (s.generals || [])) {
        if (残 <= 0) break;
        if (o.at !== cid || o.captive || o.id === 将.id) continue;
        if (o.faction !== 城.faction) continue;
        const 手勢 = Math.min(残, Math.max(0, o.retinue || 0));
        if (手勢 <= 0) continue;
        在名簿 = [...(在名簿 || []), ...(o.rost ? o.rost : newRoster(手勢, `${o.id}-直`))];
        o.retinue = Math.max(0, (o.retinue || 0) - 手勢);
        o.rost = null;
        残 -= 手勢;
      }
    }
    if (残 > 0) 在名簿 = [...(在名簿 || []), ...newRoster(残, `wk-${手.城}`)];
    const 兵科 = null;
    const g2 = { ...将, retinue: 直, rost: 将.rost || newRoster(直, `${将.id}-直`, 兵科), locRost: 在名簿 };
    const p = 場[i] || 場[場.length - 1] || { x: 0, y: 0, 向: 0 };
    const 黄 = 日和見か(s, 手, 将);
    const c = makeCorps(side, g2, 直, 在, Math.round((将.retTrain || 70)), 
      Math.round(((s.castles || []).find((x) => x.id === 手.城) || {}).localTrain || 68),
      p.x, p.y, p.向, 黄 ? 黄の色 : 色);
    c.formation = "横陣";
    placeSquads(c, true);
    if (黄) { c.日和見 = true; c.order = "待機"; c.seen = true; }
    /* 高みと押さえは持ち場を離れない（GDD 12.6）。

       山や丘は置き物ではない。押さえれば見晴らしが利き、上から撃ち下ろせる
       ――取った側の要塞になる。渡しや谷の口も同じで、塞いでいることに意味がある。
       ところが AI は敵を見つけると持ち場を捨てて寄っていくので、高みに置いた
       隊が真っ先に山を降りてしまう。役に応じて縄を付け、持ち場の近くで戦わせる。 */
    c.役 = p.役 || "本隊";
    /* 役ごとの縄。高みは山を降りず、押さえは口を空けず、本陣は前へ出ない。
       本陣の縄がいちばん長いのは、戦列が進めば旗もそれに連れて進むからである
       （旗が置き去りになると、兵は後ろを気にして戦えない）。 */
    if (c.役 === "高み" || c.役 === "押さえ" || c.役 === "本陣") {
      c.持ち場 = { x: c.x, y: c.y, 縄: c.役 === "高み" ? 900 : c.役 === "押さえ" ? 1100 : 1400 };
    }
    c.分け目 = { 家: 手.家, 城ら: 手.城ら, 旗の下: !!手.旗の下, 出し前, 備: p.名 || null, 役: c.役 };
    隊.push(c);
    覚え.push({ id: 将.id, 家: 手.家, 城ら: 手.城ら, side });
  });
  return 隊;
}

/* 盤を組む。味方（遊ぶ側）が P に立つ。 */
export function 分け目の盤を組む(s, w, { 味方 } = {}) {
  const 野 = 野を探す(w.野) || null;
  if (!野) return null;
  筋書きの野を組む(野);
  const 私 = 味方 || s.player;
  const 挑 = w.挑, 受 = w.受;
  const 覚え = [];
  const 色 = (fid) => ((s.factions || {})[fid] || {}).color || "#666";
  const 挑む隊 = 備えを隊にする(s, 挑, 野.陣.攻, 挑 === 私 ? "P" : "E", 色(挑), 覚え);
  const 受ける隊 = 備えを隊にする(s, 受, 野.陣.守, 受 === 私 ? "P" : "E", 色(受), 覚え);
  const P = 挑 === 私 ? 挑む隊 : 受ける隊;
  const E = 挑 === 私 ? 受ける隊 : 挑む隊;
  /* どちらかに一隊も立たなければ、野に出る戦はない（城を失い尽くしたか、
     将が一人もいない）。盤を組まずに帰す――呼んだ側が触れを畳む。 */
  if (!P.length || !E.length) return null;
  const b = createBattle(P, E, 挑 === 私 ? "P" : "E");
  b.筋書き = true;                       // 互いに見えている。伏兵も丘取りもしない
  b.分け目 = { 挑, 受, 野: 野.id, 私 };
  b.dusk = 分け目の暮れ;
  /* 大軍どうしの一戦は長い。常の合戦と同じ手加減で、日暮れまで持たせる。 */
  b.損の手加減 = 0.11;
  b.足の手加減 = 0.5;
  b.mode = "wakeme";
  b.log.push({ t: 0, text: `${野.詞}。${(s.factions[挑] || {}).name}と${(s.factions[受] || {}).name}、雌雄を決する。` });
  return { b, 覚え, 野 };
}

/* 戦の跡を数える。逃散の割を出すのに使う。 */
export function 分け目の戦果(b, fid) {
  const 隊 = (b.corps || []).filter((c) => c.分け目 && c.分け目.家 === fid);
  const 出 = 隊.reduce((a, c) => a + corpsMax(c), 0);
  /* 「敗走した兵」は、崩れた隊が抱えていた兵の数で数える。討たれた数ではない
     ――逃散は、隊が総崩れになったかどうかで決まる（整然と退けば軽い）。 */
  const 崩 = 隊.filter((c) => c.dead || c.destroyed || c.routed);
  const 敗 = 崩.reduce((a, c) => a + corpsMax(c), 0);
  return { 出した兵: 出, 敗走兵: 敗, 残兵: 隊.reduce((a, c) => a + corpsMen(c), 0),
    隊: 隊.length, 崩れた隊: 崩.length };
}
