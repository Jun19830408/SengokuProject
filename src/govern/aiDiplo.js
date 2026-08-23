import { DIPLO, PLOTS, SPECIAL_OPTIONS } from "../data/diplo.js";
import { TOWNS } from "../data/castles.js";
import { px, py } from "../data/geo.js";
import { 特殊勢力の可否, 手の届く間 } from "../core/town.js";
import { 外交を結ぶ, 特殊勢力と結ぶ } from "./commands.js";
import { diploStat } from "../core/rank.js";
import { relKey, relOf, factionKoku, 主家, 盟約の相手 } from "../core/state.js";
import { clamp, 籤 } from "../core/util.js";

/* ==========================================================================
   他家の外交と調略（GDD 12.1 / 11.2）

   これまで他家は外交をしなかった。始めに定まった間柄――毛利は大内に従属、
   長宗我部は一条に従属、伊達と蘆名は同盟――が、三十年経っても寸分違わずそのまま
   残っていた。誰も誼を通じず、誰も膝を屈さず、誰も旗を翻さなかった。
   調略も同じで、企ての列（s.plots）に他家の名が載ることは一度もなかった。

   ここで他家に、遊ぶ側と同じ手を持たせる。同じ関門（DIPLO の need と費え、
   PLOTS の知略と月数）をくぐるので、二つの理屈が食い違うことはない。

   考え方は、家の身の丈と隣家との大小である。
     ・己より遙かに大きい隣家には膝を屈する（滅ぼされるよりはよい）
     ・己より小さい隣家は従える
     ・攻めたい相手がいるなら、その背後の家とは誼を通じ、あるいは不可侵を結ぶ
     ・従っている家より大きくなれば、旗を翻す
     ・狙う城には手の者を入れる（流言・城工作・内応）

   賽は卓の印から起こす（Math.random を回さない）。盤の他の出来事はずれない。
   ========================================================================== */

export const 隣の間 = 150;                     // これより近ければ「隣家」とみなす

/* 家と家の隔たり、家ごとの石高、町ごとの最寄りの城。

   月ごとに一度だけ作って使い回す。家の数だけ城の一覧を舐めていては、
   百十三家×二百城を毎月何度も繰り返すことになり、月送りが目に見えて重くなる
   （測ったところ、二十五年で五十秒かかっていた）。 */
let 覚え = { 印: "", 表: null };
export function 月の下調べ(s) {
  const 印 = `${s.卓 || ""}|${s.year}-${s.month}|${s.castles.length}`;
  if (覚え.印 === 印 && 覚え.表) return 覚え.表;
  const 隔 = {};                                 // 隔[a][b] = いちばん近い城どうしの隔たり
  const 石 = {};
  const cs = s.castles;
  for (const c of cs) 石[c.faction] = (石[c.faction] || 0) + c.koku;
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i], b = cs[j];
      if (a.faction === b.faction) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d >= 隣の間) continue;
      (隔[a.faction] = 隔[a.faction] || {});
      (隔[b.faction] = 隔[b.faction] || {});
      if (隔[a.faction][b.faction] == null || d < 隔[a.faction][b.faction]) 隔[a.faction][b.faction] = d;
      if (隔[b.faction][a.faction] == null || d < 隔[b.faction][a.faction]) 隔[b.faction][a.faction] = d;
    }
  }
  const 町 = {};                                 // 町ごとの最寄りの城
  for (const t of TOWNS) {
    const tx = px(t.lon), ty = py(t.lat);
    let 近 = null, bd = 1e9;
    for (const c of cs) { const d = Math.hypot(c.x - tx, c.y - ty); if (d < bd) { bd = d; 近 = c; } }
    町[t.id] = { 隣: 近, d: bd };
  }
  覚え = { 印, 表: { 隔, 石, 町 } };
  return 覚え.表;
}

// 隣家を近い順に。城の近さで測る。
export function 隣家(s, fid) {
  const { 隔, 石 } = 月の下調べ(s);
  const 表 = 隔[fid] || {};
  return Object.keys(表)
    .filter((x) => s.factions[x])
    .map((x) => ({ 先: x, d: 表[x], koku: 石[x] || 0, r: relOf(s, fid, x) }))
    .sort((a, b) => a.d - b.d);
}

/* すでに旗の下にいるか（誰かの従属・臣従になっているか）。

   二人の主に仕えることはできない。ここを見ずに膝を屈させていたころは、
   一つの家が三家にも四家にも臣従して、盤が上下の網で埋まった。 */
export function 旗の下にいるか(s, fid) {
  for (const k of Object.keys(s.relations)) {
    const 相 = 盟約の相手(k, fid);
    if (!相) continue;
    const r = s.relations[k];
    if (!["従属", "臣従"].includes(r.state)) continue;
    /* 主がはっきり自分であるときだけ「自分が上」とみなす。
       古い盟約には主が書き留められておらず、石高で見当をつけるほかない。
       その見当が石高の上下でひっくり返るので、下にいた家が大きくなった途端に
       「主なし」と映り、もう一人の主に膝を屈していた。疑わしきは下とする。 */
    if (r.master === fid) continue;
    return 相;
  }
  return null;
}

const 結べるか = (s, fid, 相, key) => {
  const def = DIPLO.find((d) => d.key === key);
  if (!def) return false;
  const r = relOf(s, fid, 相);
  const 主 = 主家(s, fid, 相);
  const 下 = 主 == null ? null : 主 !== fid;
  return def.need(r, diploStat(s, fid), diploStat(s, 相), 下)
    && (s.factions[fid].gold >= def.cost);
};

/* --------------------------------------------------------- 外交の采配

   月に一度、家ごとに一手まで。四月とは限らない（外交は年中行事ではない）。 */
export function 外交の采配(s, fid, { 告げる, 申し入れる } = {}) {
  const f = s.factions[fid];
  const 自城 = s.castles.filter((c) => c.faction === fid);
  if (!f || !自城.length) return null;
  const 引く = 籤(s.卓 || "卓", "外交", fid, s.year, s.month);
  if (引く() > 0.16) return null;                // 月ごとに六度に一度ほど動く

  const 我石 = factionKoku(s, fid);
  const 隣 = 隣家(s, fid);
  if (!隣.length) return null;

  /* 遊ぶ側へは、こちらだけで決めない。申し入れて諾否を待つ。
     これを塞いでいなかったころは、隣国を平らげた途端に神戸と北畠が
     勝手に臣従してきて、遊ぶ側の意思が入る余地がなかった。 */
  const 打つ = (相, key) => {
    if (!結べるか(s, fid, 相, key)) return null;
    if (相 === s.player) {
      if (申し入れる) 申し入れる({ fid, key, y: s.year, m: s.month });
      return { 手: `申し入れ・${key}`, 先: 相 };
    }
    const r = 外交を結ぶ(s, fid, 相, key);
    if (r.ok && 告げる) 告げる(r.文);
    return r.ok ? { 手: key, 先: 相 } : null;
  };

  const 我主 = 旗の下にいるか(s, fid);

  /* 一、旗を翻す。従っている相手より大きくなったなら、いつまでも下にはいない。
     信を失い、家中の忠誠も揺れるので、よほど差がついてからにする。 */
  if (我主) {
    const x = 隣.find((y) => y.先 === 我主) || { 先: 我主, koku: factionKoku(s, 我主) };
    if (我石 >= x.koku * 1.5 && 引く() < 0.35) {
      const r = 打つ(我主, "独立");
      if (r) return r;
    }
    /* 旗の下にある家が自ら結べるのは不可侵まで。それも主の外交に反しない範囲。
       主のある家は、ここで手仕舞いである。 */
    const 隣で敵 = 隣.filter((y) => y.先 !== 我主 && y.r.state === "敵対" && y.r.trust >= 55)[0];
    if (隣で敵 && 引く() < 0.4) { const r = 打つ(隣で敵.先, "不可侵"); if (r) return r; }
    return null;
  }

  /* 二、膝を屈する（GDD 12.2）。

     これは家の一生を決める。貢を納め、兵を出し、外交を主に預け、独立の望みを捨てる。
     追い詰められた家だけが選ぶ道であって、隣が少し大きいから、では選ばない。
     一、相手が桁違いに大きい（従属で二.四倍、臣従で三.四倍）
     二、こちらが細い（城が三つ以下。臣従は二つ以下）か、その相手に狙われている
     三、誼がある（信用五十以上）。見ず知らずの家に頭は下げられない
     四、それでも躊躇う（十度に一度ほどしか踏み切らない） */
  const 大物 = 隣.filter((x) => !["同盟", "臣従", "従属"].includes(x.r.state))
    .sort((a, b) => b.koku - a.koku)[0];
  if (大物) {
    const 差 = 大物.koku / Math.max(1, 我石);
    const 狙われ = (s.factions[大物.先].aim || {}).target
      && (s.castles.find((c) => c.id === s.factions[大物.先].aim.target) || {}).faction === fid;
    const 細い = 自城.length <= 2;
    const 瀬戸際 = 自城.length <= 1 || (自城.length <= 2 && 狙われ);
    if (差 >= 3.4 && 瀬戸際 && 大物.r.trust >= 60 && 引く() < 0.10) {
      const r = 打つ(大物.先, "臣従する");
      if (r) return r;
    }
    if (差 >= 2.4 && (細い ? 狙われ || 差 >= 3.0 : 狙われ && 差 >= 3.0)
        && 大物.r.trust >= 50 && 引く() < 0.15) {
      const r = 打つ(大物.先, "従属する");
      if (r) return r;
    }
  }

  /* 三、従える。小さい隣家を旗の下に入れる。相手にも旨みが要るので、誼が篤いこと。 */
  const 小物 = 隣.filter((x) => !["同盟", "臣従", "従属"].includes(x.r.state)
    && x.koku < 我石 * 0.5 && !旗の下にいるか(s, x.先))
    .sort((a, b) => b.r.trust - a.r.trust)[0];
  if (小物 && 小物.r.trust >= 66 && 引く() < 0.30) {
    for (const key of ["臣従させる", "従属させる"]) {
      const r = 打つ(小物.先, key);
      if (r) return r;
    }
  }

  /* 四、背後を固める。狙う相手がいるなら、その相手でない隣家と誼を通じ、
     信用が篤ければ不可侵か同盟を結ぶ。二正面は避けたい。 */
  const 狙 = f.aim ? (s.castles.find((c) => c.id === f.aim.target) || {}).faction : null;
  const 背後 = 隣.filter((x) => x.先 !== 狙 && !["同盟", "臣従", "従属"].includes(x.r.state))
    .sort((a, b) => b.koku - a.koku)[0];
  if (背後) {
    if (背後.r.trust >= 72 && 引く() < 0.5) {
      const r = 打つ(背後.先, "同盟") || 打つ(背後.先, "不可侵");
      if (r) return r;
    }
    if (背後.r.trust >= 46 && 引く() < 0.6) {
      const r = 打つ(背後.先, "不可侵");
      if (r) return r;
    }
    const r = 打つ(背後.先, "親善");                // 信用を積む。いちばん多い手である。
    if (r) return r;
  }
  return null;
}

/* --------------------------------------------------------- 調略の采配

   狙う城へ手の者を入れる。知略の高い者ほど大きな企てを任される。
   企ては月をまたいで解ける（月送りの s.plots の裁きに乗る）。 */
export function 調略の采配(s, fid, { 告げる } = {}) {
  const f = s.factions[fid];
  if (!f) return null;
  const 引く = 籤(s.卓 || "卓", "調略", fid, s.year, s.month);
  if (引く() > 0.22) return null;
  if ((s.plots || []).some((p) => p.faction === fid)) return null;   // 一度に一つ

  // 狙う城。方針の的が第一。無ければ手近な敵城。
  const 自城 = s.castles.filter((c) => c.faction === fid);
  if (!自城.length) return null;
  let 的 = f.aim ? s.castles.find((c) => c.id === f.aim.target) : null;
  if (!的 || 的.faction === fid) {
    const 隣 = 隣家(s, fid).filter((x) => !["同盟", "臣従", "従属"].includes(x.r.state))[0];
    的 = 隣 && s.castles.filter((c) => c.faction === 隣.先)
      .map((c) => ({ c, d: Math.min(...自城.map((m) => Math.hypot(m.x - c.x, m.y - c.y))) }))
      .sort((a, b) => a.d - b.d).map((x) => x.c)[0];
  }
  if (!的) return null;
  const rel = relOf(s, fid, 的.faction);
  if (["同盟", "臣従", "従属"].includes(rel.state)) return null;      // 旗の下へは仕掛けない

  // 手の者。知略の高い者から。城にいて、まだ月の務めに就いていない者。
  const 手 = s.generals
    .filter((x) => x.faction === fid && x.at && !x.captive && !(s.orders || {})[x.id])
    .sort((a, b) => b.wit - a.wit)[0];
  if (!手) return null;

  /* 何を仕掛けるか。知略と懐で決まる。
     人を狙う企て（密約・引き抜き・内応）は、相手を定めねば立たない。 */
  /* 当主は内応にも引き抜きにも応じない（家そのものである）。的から外す。 */
  const 城中 = s.generals.filter((x) => x.at === 的.id && x.faction === 的.faction
    && !x.lord && !x.captive);
  const 心の離れた = [...城中].sort((a, b) => (a.loyal == null ? 60 : a.loyal) - (b.loyal == null ? 60 : b.loyal))[0];
  const 城主 = 城中.length ? [...城中].sort((a, b) => (b.lead + b.gov) - (a.lead + a.gov))[0] : null;
  const 候補 = [];
  if (心の離れた && (心の離れた.loyal == null ? 60 : 心の離れた.loyal) < 62) 候補.push(["内応", 城主], ["引き抜き", 心の離れた]);
  候補.push(["密約", 城主], ["城工作", null], ["流言", null], ["偵察", null]);
  for (const [key, mato] of 候補) {
    const def = PLOTS.find((x) => x.key === key);
    if (!def || f.gold < def.cost * 1.4) continue;
    if (手.wit < def.need - 14) continue;                     // 手に余る企てはしない
    if ((def.mato === "要" || def.mato === "城主") && (!mato || mato.at !== 的.id)) continue;
    f.gold -= def.cost;
    s.plots.push({ type: key, castleId: 的.id, genId: 手.id, faction: fid,
      monthsLeft: def.months, matoId: mato ? mato.id : null });
    s.orders[手.id] = { cmd: `調略・${key}`, castleId: 手.at };
    if (告げる) 告げる(`${f.name}が${的.name}へ${key}を仕掛けた。`);
    return { 手: key, 先: 的.id };
  }
  return null;
}

/* --------------------------------------------------- 特殊勢力の采配（GDD 13.1）

   寺社・商人・水軍衆・忍びの里・牧・鉄砲鍛冶。手の届くところにあるなら、
   誼を通じておくのが得である。これも遊ぶ側だけの仕組みになっていた。

   荒い手（攻撃・討伐・支配・制圧）は取らない。一時の金のために民忠と威信を
   捨てるのは、采配としては下策である。陰謀の気性の家だけが、たまに手を出す。 */
export function 特殊勢力の采配(s, fid, { 告げる } = {}) {
  const f = s.factions[fid];
  if (!f || f.gold < 400) return null;
  const 引く = 籤(s.卓 || "卓", "特殊", fid, s.year, s.month);
  if (引く() > 0.18) return null;
  const 荒 = ["攻撃", "討伐", "支配", "制圧", "放置"];
  const { 町 } = 月の下調べ(s);
  for (const t of TOWNS) {
    const st = s.specials[t.id];
    if (!st || (st.state && st.state !== "中立")) continue;
    const 近 = 町[t.id];
    if (!近 || !近.隣 || 近.d > 手の届く間 || 近.隣.faction !== fid) continue;
    if (!特殊勢力の可否(s, t, fid).ok) continue;
    const 列 = (SPECIAL_OPTIONS[t.kind] || []).filter((o) => !荒.includes(o.key));
    if (!列.length) continue;
    // 蓄えに応じて、手厚いほうから選ぶ
    const 選 = [...列].sort((a, b) => (b.cost || 0) - (a.cost || 0))
      .find((o) => f.gold >= (o.cost || 0) * 2.2);
    if (!選) continue;
    const r = 特殊勢力と結ぶ(s, fid, t.id, 選.key);
    if (r.ok) {
      if (告げる) 告げる(`${f.name}が${t.name}と「${選.key}」を結んだ。`);
      return { 手: 選.key, 先: t.id };
    }
  }
  return null;
}
