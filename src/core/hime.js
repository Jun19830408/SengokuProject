import { HIME, HIME_NAMES } from "../data/hime.js";
import { clamp } from "./util.js";

/* state.js からは借りない。あちらがこちらを呼ぶので、行き来させると輪になる。
   どれも一行で済むものである。 */
const factionKoku = (s, fid) => s.castles.filter((c) => c.faction === fid).reduce((a, c) => a + c.koku, 0);
const relKey = (a, b) => [a, b].sort().join("|");
const relOf = (s, a, b) => s.relations[relKey(a, b)] || { trust: 45, state: "中立", until: null };

/* ==========================================================================
   姫（GDD 6.8）

   大名家には姫がいる。武将としては数えない。戦場にも出ない。
   けれども、家と家を結ぶのは多く姫の縁である。信長の妹お市は浅井へ、
   信玄の娘は北条へ、元就の娘は宍戸へ嫁いだ。縁組は同盟そのものであった。

   姫にできることは四つ。
     一、婚姻同盟   … 他家へ輿入れし、その家と結ぶ。縁は姫の存命のあいだ続く
     二、外交の使者 … 姫が使いに立てば、ただの使者より遙かに重い
     三、家臣へ嫁ぐ … 婿は一門となり、忠誠は揺るがず、家督にも連なる
     四、家中の統率 … 城にあれば、その城の守備隊の統率に映る（rank.js）

   姫の数は家の石高による。三十万石までは一人、七十万石までは二人、
   百万石までは三人、以後は五十万石ごとに一人を加え、十人を限りとする。
   十五になった年に世に出る。それまでは館の奥にいて、盤には出ない。
   ========================================================================== */

export const 元服の齢 = 15;
export const 姫の限り = 10;

// 石高に応じた姫の数
export function 姫の枠(koku) {
  const 万 = koku / 10000;
  if (万 <= 30) return 1;
  if (万 <= 70) return 2;
  if (万 <= 100) return 3;
  return Math.min(姫の限り, 3 + Math.floor((万 - 100) / 50));
}

// 盤に出ている姫（嫁いだ先が他家の者と、没した者を除く）
export const 家の姫 = (s, fid) => (s.hime || []).filter((h) => h.faction === fid && !h.死
  && !(h.嫁 && h.嫁.種 === "婚姻"));

// 城にいる姫（守備隊の統率に映る者）
export const 城の姫 = (s, cid) => (s.hime || []).filter((h) => h.at === cid && !h.死
  && !(h.嫁 && h.嫁.種 === "婚姻"));

export const 姫の齢 = (s, h) => Math.max(0, s.year - h.born);

// いま何かに就いているか（使者に出ている、嫁いでいる）
export const 姫の役 = (s, h) => {
  if (h.死) return "没";
  if (h.嫁 && h.嫁.種 === "婚姻") return "輿入れ";
  if (h.嫁 && h.嫁.種 === "家臣") return "縁組";
  if (h.務め) return "使者";
  if (姫の齢(s, h) < 元服の齢) return "幼年";
  return "在城";
};

export const 使える姫 = (s, h) => 姫の役(s, h) === "在城" || 姫の役(s, h) === "縁組";

/* ------------------------------------------------------------ 姫を立てる */

const 本城 = (s, fid) => {
  const 城 = s.castles.filter((c) => c.faction === fid);
  if (!城.length) return null;
  return 城.find((c) => s.generals.some((q) => q.lord && q.faction === fid && q.at === c.id)) || 城[0];
};

/* 名の伝わらぬ姫の呼び名。
   同じ字でも「鶴姫」「お鶴」「鶴の方」と呼び方は幾通りもある。
   それでも足りなければ、居城の名を冠する（「岡崎の鶴姫」）。 */
function 姫の名(s, 城, 引く) {
  const 使用 = new Set((s.hime || []).map((h) => h.name));
  const 形 = [(c) => `${c}姫`, (c) => `お${c}`, (c) => `${c}の方`];
  const 候補 = [];
  for (const f of 形) for (const c of HIME_NAMES) { const n = f(c); if (!使用.has(n)) 候補.push(n); }
  if (候補.length) return 候補[Math.floor(引く() * 候補.length)];
  const 地 = 城 ? 城.name.replace(/城$/, "") : "";
  for (const c of HIME_NAMES) { const n = `${地}の${c}姫`; if (!使用.has(n)) return n; }
  return `${地}の姫`;
}

// 名の伝わらぬ姫を一人つくる
/* 姫の籤（くじ）。

   ここで Math.random を回さない。盤を作るときに何度も回すと、
   同じ種から始めたはずの他の出来事（合戦の行方まで）が一斉にずれる。
   卓の印と家と年から籤を起こせば、遊びごとには違い、同じ盤では必ず同じになる。 */
function 籤(...種) {
  let h = 2166136261;
  for (const t of 種.join("|")) h = Math.imul(h ^ t.charCodeAt(0), 16777619);
  return () => {
    h |= 0; h = (h + 0x6D2B79F5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function 姫を仕立てる(s, fid, 年) {
  const 城 = 本城(s, fid);
  if (!城) return null;
  const 引く = 籤(s.卓 || "卓", fid, 年, (s.hime || []).length);
  const r = (a, b) => a + Math.floor(引く() * (b - a + 1));
  return {
    id: `hime-${fid}-${年}-${Math.floor(引く() * 9000 + 1000)}`,
    name: 姫の名(s, 城, 引く), faction: fid, at: 城.id, born: 年 - 元服の齢,
    dip: r(40, 78), lead: r(34, 70), 架空: true, 伝: "",
    死: false, 嫁: null, 務め: null,
  };
}

// 名の伝わる姫を、その齢に達した年に立てる
function 史の姫(s, fid, 年) {
  const 既 = new Set((s.hime || []).map((h) => h.id));
  const 城 = s.castles.filter((c) => c.faction === fid);
  return HIME.filter((h) => h.faction === fid && !既.has(h.id) && 年 - h.born >= 元服の齢
    && 年 - h.born < 40)
    .map((h) => ({
      ...h, at: (城.find((c) => c.id === h.at) || 本城(s, fid) || {}).id || null,
      架空: false, 死: false, 嫁: null, 務め: null,
    }))
    .filter((h) => h.at);
}

/* 家々の姫を石高に合わせて整える。年の改まりに呼ぶ（初めの盤づくりでも呼ぶ）。
   減った枠のぶん姫が消えることはない。人は帳尻で消えたりしない。 */
export function 姫を整える(s, { 告げる } = {}) {
  s.hime = s.hime || [];
  const 出 = [];
  for (const fid of Object.keys(s.factions)) {
    if (!s.castles.some((c) => c.faction === fid)) continue;
    /* 名の伝わる姫は、齢十五に達すれば枠に関わらず世に出る。
       史実の人物を石高の帳尻で消すわけにはいかない（限りの十人までとする）。 */
    let 在 = 家の姫(s, fid).length;
    for (const h of 史の姫(s, fid, s.year)) {
      if (在 >= 姫の限り) break;
      s.hime.push(h); 在++;
      出.push({ h, 史: true });
    }
    const 枠 = 姫の枠(factionKoku(s, fid));
    while (在 < 枠) {
      const h = 姫を仕立てる(s, fid, s.year);
      if (!h) break;
      s.hime.push(h); 在++;
      出.push({ h, 史: false });
    }
  }
  if (告げる) for (const { h, 史 } of 出) {
    const 城 = s.castles.find((c) => c.id === h.at);
    告げる(`${s.factions[h.faction].name}に姫${h.name}が世に出た${城 ? `（${城.name}）` : ""}。`
      + (史 && h.伝 ? `${h.伝}。` : ""), h);
  }
  return 出;
}

/* ------------------------------------------------------------ 年を重ねる */

/* 姫も老いる。武将と同じ数え方で没する（house.js の齢の階と揃えてある）。
   輿入れした姫が没すれば、その縁で結んだ同盟も切れる。縁とはそういうものである。 */
export function 姫の年送り(s, { 告げる } = {}) {
  for (const h of s.hime || []) {
    if (h.死) continue;
    const a = 姫の齢(s, h);
    const p = a >= 80 ? 1 : a >= 76 ? 0.34 : a >= 70 ? 0.16 : a >= 60 ? 0.075 : a >= 54 ? 0.035 : a >= 48 ? 0.015 : 0;
    if (!p || 籤(s.卓 || "卓", h.id, s.year)() > p) continue;
    h.死 = true;
    const 文 = `${s.factions[h.faction] ? s.factions[h.faction].name : ""}の姫${h.name}が没した。`;
    s.chronicle.push({ y: s.year, m: s.month, text: 文 });
    if (告げる && (h.faction === s.player || (h.嫁 && h.嫁.先 === s.player))) 告げる(文);
    縁を解く(s, h, { 告げる });
  }
}

// 輿入れの縁が切れる。同盟は中立へ戻る。
export function 縁を解く(s, h, { 告げる } = {}) {
  if (!h.嫁 || h.嫁.種 !== "婚姻") return;
  const 相 = h.嫁.先;
  const k = relKey(h.faction, 相);
  const r = s.relations[k];
  h.嫁 = null;
  if (!r || r.婚姻 !== h.id) return;
  r.婚姻 = null;
  if (r.state === "同盟") {
    r.state = "中立"; r.until = null;
    r.trust = clamp((r.trust || 45) - 6, 0, 100);
    const 文 = `${s.factions[h.faction].name}と${s.factions[相] ? s.factions[相].name : ""}の縁は切れ、同盟は解けた。`;
    s.chronicle.push({ y: s.year, m: s.month, text: 文 });
    if (告げる && (h.faction === s.player || 相 === s.player)) 告げる(文);
  }
}

// 使者に出た姫が帰る
export function 使者の帰り(s, { 告げる } = {}) {
  for (const h of s.hime || []) {
    if (!h.務め || h.死) continue;
    const 迄 = h.務め.迄;
    if (s.year < 迄.y || (s.year === 迄.y && s.month < 迄.m)) continue;
    const 先 = s.factions[h.務め.先];
    h.務め = null;
    if (告げる && h.faction === s.player) 告げる(`姫${h.name}が${先 ? 先.name : ""}よりの使いを終えて戻った。`);
  }
}

/* ------------------------------------------------------------ 姫の使い道 */

export const 使者の礼 = 120;                        // 使いに立てる支度（貫）
export const 婚儀の礼 = 640;                        // 輿入れの支度（貫）

// 使者に立てる。ただの使者より遙かに重い。三月のあいだ戻らない。
export function 使者に立てる(s, himeId, fid) {
  const h = (s.hime || []).find((x) => x.id === himeId);
  const me = s.factions[h && h.faction];
  if (!h || !me || !s.factions[fid] || fid === h.faction) return { ok: false, why: "立てられない" };
  if (!使える姫(s, h)) return { ok: false, why: "いま使いには立てない" };
  if (me.gold < 使者の礼) return { ok: false, why: "支度の金が足りない" };
  me.gold -= 使者の礼;
  const k = relKey(h.faction, fid);
  const r = s.relations[k] || (s.relations[k] = { trust: 45, state: "中立", until: null });
  const 効 = Math.round(clamp(6 + (h.dip || 50) / 6, 8, 20));
  r.trust = clamp((r.trust || 45) + 効, 0, 100);
  me.prestige = clamp((me.prestige ?? 50) + 1, 0, 100);
  const 迄 = { y: s.year + (s.month + 3 > 12 ? 1 : 0), m: ((s.month + 3 - 1) % 12) + 1 };
  h.務め = { 先: fid, 迄 };
  const 文 = `${me.name}は姫${h.name}を${s.factions[fid].name}への使者に立てた（信用＋${効}）。`;
  s.chronicle.push({ y: s.year, m: s.month, text: 文 });
  return { ok: true, 文, 効 };
}

/* 婚姻同盟。姫の外交が高いほど、冷たい家とも結べる。
   期限は無い。縁は姫の存命のあいだ続く。 */
export function 婚姻の要る信用(h, r) {
  const 敵 = r && r.state === "敵対";
  return Math.round(clamp((敵 ? 70 : 50) - (h.dip || 50) / 8, 30, 76));
}

export function 婚姻できるか(s, h, fid) {
  if (!h || h.死) return { ok: false, why: "" };
  if (!使える姫(s, h)) return { ok: false, why: "この姫はいま輿入れできない" };
  if (h.嫁) return { ok: false, why: "すでに縁を結んでいる" };
  if (fid === h.faction || !s.factions[fid]) return { ok: false, why: "" };
  if (!s.castles.some((c) => c.faction === fid)) return { ok: false, why: "その家はもう城を持たない" };
  const r = relOf(s, h.faction, fid);
  if (r.state === "臣従" || r.state === "従属") return { ok: false, why: "上下のある間柄に婚儀は要らない" };
  if (r.state === "同盟") return { ok: false, why: "すでに同盟している" };
  const 要 = 婚姻の要る信用(h, r);
  if ((r.trust || 45) < 要) return { ok: false, why: `信用が足りない（要 ${要}）` };
  if (s.factions[h.faction].gold < 婚儀の礼) return { ok: false, why: "支度の金が足りない" };
  return { ok: true, why: "", 要 };
}

export function 婚姻を結ぶ(s, himeId, fid) {
  const h = (s.hime || []).find((x) => x.id === himeId);
  const 可 = 婚姻できるか(s, h, fid);
  if (!可.ok) return { ok: false, why: 可.why };
  const me = s.factions[h.faction];
  me.gold -= 婚儀の礼;
  const k = relKey(h.faction, fid);
  const r = s.relations[k] || (s.relations[k] = { trust: 45, state: "中立", until: null });
  r.state = "同盟"; r.until = null; r.master = null;   // 期限は無い。姫の命が期限である。
  r.trust = clamp((r.trust || 45) + 14, 0, 100);
  r.婚姻 = h.id;
  me.prestige = clamp((me.prestige ?? 50) + 2, 0, 100);
  h.嫁 = { 種: "婚姻", 先: fid, y: s.year, m: s.month };
  h.at = null;                                       // 輿入れした姫は盤を離れる
  const 文 = `${me.name}は姫${h.name}を${s.factions[fid].name}へ輿入れさせ、同盟を結んだ。`
    + `この縁は${h.name}の存命のあいだ続く。`;
  s.chronicle.push({ y: s.year, m: s.month, text: 文 });
  return { ok: true, 文 };
}

/* 家臣へ嫁がせる。婿は一門となる。
   忠誠は揺るがず、家督にも連なる。城にあれば姫の統率は守備隊に映る。 */
export function 嫁がせられるか(s, h, gen) {
  if (!h || h.死 || !gen) return { ok: false, why: "" };
  if (!使える姫(s, h) || h.嫁) return { ok: false, why: "この姫はいま嫁げない" };
  if (gen.faction !== h.faction || gen.captive) return { ok: false, why: "家中の者でない" };
  if (gen.lord) return { ok: false, why: "当主に嫁がせることはできない" };
  if (gen.一門) return { ok: false, why: "すでに一門である" };
  if ((gen.age || 30) < 元服の齢) return { ok: false, why: "まだ幼い" };
  if ((gen.age || 30) > 62) return { ok: false, why: "齢が離れすぎている" };
  return { ok: true, why: "" };
}

export function 家臣に嫁がせる(s, himeId, genId) {
  const h = (s.hime || []).find((x) => x.id === himeId);
  const gen = s.generals.find((x) => x.id === genId);
  const 可 = 嫁がせられるか(s, h, gen);
  if (!可.ok) return { ok: false, why: 可.why };
  gen.一門 = true;
  gen.縁 = h.id;
  gen.loyal = Math.max(gen.loyal == null ? 60 : gen.loyal, 92);
  h.嫁 = { 種: "家臣", 先: gen.id, y: s.year, m: s.month };
  h.at = gen.at;                                     // 婿の城に入る
  const 文 = `${s.factions[h.faction].name}は姫${h.name}を${gen.name}に嫁がせた。${gen.name}は一門に列した。`;
  s.chronicle.push({ y: s.year, m: s.month, text: 文 });
  return { ok: true, 文 };
}

/* 姫の居場所を繕う。城が落ちれば他の城へ落ち延び、家が滅べば行方が知れなくなる。
   婿のある姫は婿に従う。 */
export function 姫の居場所(s, { 告げる } = {}) {
  for (const h of s.hime || []) {
    if (h.死 || (h.嫁 && h.嫁.種 === "婚姻")) continue;
    if (h.嫁 && h.嫁.種 === "家臣") {
      const gen = s.generals.find((x) => x.id === h.嫁.先);
      if (gen && !gen.captive) { h.faction = gen.faction; h.at = gen.at; continue; }
    }
    const 城 = s.castles.find((c) => c.id === h.at);
    if (城 && 城.faction === h.faction) continue;
    const 落 = 本城(s, h.faction);
    if (落) {
      h.at = 落.id;
      if (城) {
        const 文 = `${city(城)}の姫${h.name}は${落.name}へ落ち延びた。`;
        s.chronicle.push({ y: s.year, m: s.month, text: 文 });
        if (告げる && h.faction === s.player) 告げる(文);
      }
      continue;
    }
    h.死 = true; h.訳 = "行方知れず";
    const 文 = `${h.name}の行方は知れなくなった。`;
    s.chronicle.push({ y: s.year, m: s.month, text: 文 });
    if (告げる && h.faction === s.player) 告げる(文);
    縁を解く(s, h, { 告げる });
  }
}
const city = (c) => (c ? c.name : "");
