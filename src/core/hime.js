import { HIME, HIME_NAMES } from "../data/hime.js";
import { clamp, 籤 } from "./util.js";

/* state.js からは借りない。あちらがこちらを呼ぶので、行き来させると輪になる。
   どれも一行で済むものである。 */
const factionKoku = (s, fid) => s.castles.filter((c) => c.faction === fid).reduce((a, c) => a + c.koku, 0);
const relKey = (a, b) => [a, b].sort().join("|");
/* 印は "a|b" という字である。字として含まれるかで見ると、"so"（宗家）が
   "chosokabe|ichijo" に引っかかる。区切りで分けて突き合わせる。 */
const 己の盟約 = (k, fid) => { const p = k.split("|"); return p[0] === fid || p[1] === fid; };
const 盟約の相手 = (k, fid) => { const p = k.split("|"); return p[0] === fid ? p[1] : p[1] === fid ? p[0] : null; };
/* 旗の下にあるか（従属・臣従の下側か）。state.js の 主を探す と同じ理である。
   あちらを呼ぶと輪になるので、ここにも短く置く。 */
const 主を探す = (s, fid) => {
  // 関係の帳面を端から繰らず、家の数だけ回って鍵を引く（state.js の同名を参照）
  for (const other of Object.keys(s.factions || {})) {
    if (other === fid) continue;
    const r = (s.relations || {})[relKey(fid, other)];
    if (!r || !["従属", "臣従"].includes(r.state)) continue;
    if (r.master === fid) continue;
    return other;
  }
  return null;
};
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
  const 地 = 城 ? 城.name.replace(/(城|砦|館|御所|の砦|氏館)$/, "") : "";
  for (const c of HIME_NAMES) { const n = `${地}の${c}`; if (!使用.has(n)) return n; }
  return `${地}の姫`;
}

// 名の伝わらぬ姫を一人つくる
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
    const 文 = `${s.factions[h.faction] ? s.factions[h.faction].name : ""}の${h.name}が没した。`;
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
    if (告げる && h.faction === s.player) 告げる(`${h.name}が${先 ? 先.name : ""}よりの使いを終えて戻った。`);
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
  const 文 = `${me.name}は${h.name}を${s.factions[fid].name}への使者に立てた（信用＋${効}）。`;
  s.chronicle.push({ y: s.year, m: s.month, text: 文 });
  return { ok: true, 文, 効 };
}

/* 婚姻同盟。姫の外交が高いほど、冷たい家とも結べる。
   期限は無い。縁は姫の存命のあいだ続く。 */
/* 婚姻に要る信用は八十五である（GDD 12.1）。

   縁組は同盟そのものであり、姫の存命のあいだ続く。期限のある同盟（六十五）より
   明らかに重い約束なのだから、それより高いところに置く。姫の外交では緩まない。

   はじめは満（百）としたが、測ったところ二十二年のうちに他家が結ぶ縁は零に
   なった。信用に落ち着き所（四十五）を与えたので、百に届く組が九千三百十六の
   うち十三しかない。誰も結べぬ決まりは、無いのと変わらない。 */
export function 婚姻の要る信用(h, r) {
  return 85;
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
  /* 旗の下にある家の外交は、主のものである（GDD 12.2）。
     婚姻同盟も同盟であるから、下にある家は自らの縁で結べない。
     ここを塞いでいなかったころ、臣従した家が姫の縁で他家と同盟し、
     「旗の下にありながら他家と同盟している家」が四十を超えていた。 */
  const 我主 = 主を探す(s, h.faction);
  if (我主) return { ok: false, why: `${(s.factions[我主] || {}).name || ""}の旗の下にある身では、縁を結べない` };
  const 相主 = 主を探す(s, fid);
  if (相主) return { ok: false, why: `${s.factions[fid].name}は${(s.factions[相主] || {}).name || ""}の旗の下にある` };
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
  const 文 = `${me.name}は${h.name}を${s.factions[fid].name}へ輿入れさせ、同盟を結んだ。`
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
  const 文 = `${s.factions[h.faction].name}は${h.name}を${gen.name}に嫁がせた。${gen.name}は一門に列した。`;
  s.chronicle.push({ y: s.year, m: s.month, text: 文 });
  return { ok: true, 文 };
}

/* 姫の居場所を繕う。城が落ちれば他の城へ落ち延び、家が滅べば行方が知れなくなる。
   婿のある姫は婿に従う。 */
export function 姫の居場所(s, { 告げる } = {}) {
  for (const h of s.hime || []) {
    if (h.死 || (h.嫁 && h.嫁.種 === "婚姻")) continue;
    if (h.嫁 && h.嫁.種 === "家臣") {
      /* 婿のある姫は婿に従う。ただし婿が出陣していれば、姫まで盤から消えてしまう。
         奥は城に残るものである。婿の城が定まらぬあいだは、いまの城に留める。 */
      const gen = s.generals.find((x) => x.id === h.嫁.先);
      if (gen && !gen.captive) {
        h.faction = gen.faction;
        if (gen.at) { h.at = gen.at; continue; }
        const 今 = s.castles.find((c) => c.id === h.at);
        if (今 && 今.faction === h.faction) continue;      // いまの城のままでよい
      }
    }
    const 城 = s.castles.find((c) => c.id === h.at);
    if (城 && 城.faction === h.faction) continue;
    const 落 = 本城(s, h.faction);
    if (落) {
      h.at = 落.id;
      if (城) {
        const 文 = `${city(城)}の${h.name}は${落.name}へ落ち延びた。`;
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

/* ==========================================================================
   姫の采配（GDD 6.8）— 遊ぶ側でない家も、姫を使う

   これまで他家は外交をしなかった。始めに定まった間柄がそのまま最後まで続き、
   縁を結ぶことも、切ることもなかった。姫はその最初の一手である。

   考え方は単純である。家は、己より大きい隣家を恐れる。
     ・恐れる相手と信用が足りていれば、姫を輿入れさせて縁を結ぶ
     ・足りなければ、姫を使者に立てて信用を積む
     ・恐れる相手がなければ、心の離れた家臣に姫を嫁がせて家中を固める

   縁は一つに限る。家がいくつも婚姻同盟を結べば、盤の上から戦が消える。
   遊ぶ側へ嫁がせるときは、こちらから決めない。縁談として申し込む。

   賽は卓の印から起こす（Math.random を回さない）。同じ盤なら同じ手を打つ。
   ========================================================================== */

/* 縁を結ぶのは隣国までである。盤の上で百三十歩――尾張から見て三河・美濃・
   北伊勢あたりまで。遠国の家と縁を結ぶことが無いではないが、常のことではない。
   ここを広く取ると、三河の松平が畿内の三好と縁を結ぶ、という話になる。 */
export const 縁の遠さ = 130;

export function 姫の采配(s, fid, { 告げる, 申し込む } = {}) {
  const f = s.factions[fid];
  const 自城 = s.castles.filter((c) => c.faction === fid);
  if (!f || !自城.length) return null;
  const 姫ら = 家の姫(s, fid).filter((h) => 使える姫(s, h) && !h.嫁);
  if (!姫ら.length) return null;
  const 引く = 籤(s.卓 || "卓", "采配", fid, s.year);

  // すでに縁で結んだ家があるか（縁は一つに限る）
  const 縁あり = Object.keys(s.relations).some((k) => 己の盟約(k, fid)
    && s.relations[k].婚姻 && (s.hime || []).some((h) => h.id === s.relations[k].婚姻 && !h.死));

  // 隣の家。城の近さで測る。
  const 隔 = {};
  for (const c of s.castles) {
    if (c.faction === fid) continue;
    const d = Math.min(...自城.map((m) => Math.hypot(m.x - c.x, m.y - c.y)));
    if (隔[c.faction] == null || d < 隔[c.faction]) 隔[c.faction] = d;
  }
  const 我石 = factionKoku(s, fid);
  const 恐 = Object.keys(隔)
    .filter((x) => s.factions[x] && 隔[x] < 縁の遠さ && factionKoku(s, x) > 我石 * 1.5)
    .map((x) => ({ 先: x, d: 隔[x], koku: factionKoku(s, x), r: relOf(s, fid, x) }))
    .filter((x) => !["同盟", "臣従", "従属"].includes(x.r.state))
    .sort((a, b) => b.koku - a.koku)[0];

  /* 一、恐れる隣家があり、縁がまだ無いなら、姫を輿入れさせる。

     年に一度、四度に一度ほどしか動かない。家々が片端から縁を結べば、
     盤の上のどの家も攻められなくなる（同盟は攻めを封じる）。
     縁組は最後の手立てであって、常の手ではない。 */
  if (恐 && !縁あり) {
    const h = [...姫ら].sort((a, b) => (b.dip || 50) - (a.dip || 50))[0];
    if (婚姻できるか(s, h, 恐.先).ok) {
      if (引く() >= 0.25) return null;                // 今年は動かない
      if (恐.先 === s.player) {
        // 遊ぶ側とは、こちらだけで決めない。縁談として申し込む。
        if (申し込む) 申し込む({ fid, himeId: h.id, y: s.year, m: s.month });
        return { 手: "縁談", h, 先: 恐.先 };
      }
      const r = 婚姻を結ぶ(s, h.id, 恐.先);
      if (r.ok) { if (告げる) 告げる(r.文); return { 手: "輿入れ", h, 先: 恐.先 }; }
      return null;
    }
    // 信用が足りぬなら、使者を立てて積む
    if (f.gold >= 使者の礼 && 引く() < 0.55) {
      const r = 使者に立てる(s, h.id, 恐.先);
      if (r.ok) { if (告げる) 告げる(r.文); return { 手: "使者", h, 先: 恐.先 }; }
    }
    return null;
  }

  /* 二、縁を切る。

     結んだ縁が永く続くとは限らない。信長は妹お市を浅井に嫁がせ、
     その浅井を滅ぼした。相手より遙かに大きくなれば、縁は重石でしかない。
     切れば信を失う（信用と威信が下がる）。姫は生家へ戻される。 */
  if (縁あり) {
    for (const k of Object.keys(s.relations)) {
      const r = s.relations[k];
      if (!己の盟約(k, fid) || !r.婚姻) continue;
      const h = (s.hime || []).find((x) => x.id === r.婚姻 && !x.死);
      if (!h || h.faction !== fid) continue;           // 嫁がせた側だけが切れる
      const 相 = k.split("|").find((x) => x !== fid);
      if (!相 || !s.factions[相]) continue;
      if (我石 <= factionKoku(s, 相) * 2.5) continue;   // まだ相手のほうが重い
      if (引く() >= 0.2) continue;
      r.state = "中立"; r.until = null; r.婚姻 = null;
      r.trust = clamp((r.trust || 45) - 22, 0, 100);
      f.prestige = clamp((f.prestige ?? 50) - 3, 0, 100);
      h.嫁 = null;
      const 城 = 本城(s, fid);
      h.at = 城 ? 城.id : null;
      const 文 = `${f.name}は${s.factions[相].name}との縁を切った。${h.name}は生家へ戻された。`;
      s.chronicle.push({ y: s.year, m: s.month, text: 文 });
      if (告げる) 告げる(文);
      return { 手: "縁切り", h, 先: 相 };
    }
  }

  // 三、恐れる相手がなければ、心の離れた家臣に嫁がせて家中を固める
  if (姫ら.length && 引く() < 0.45) {
    const 婿 = s.generals
      .filter((x) => x.faction === fid && 嫁がせられるか(s, 姫ら[0], x).ok)
      .filter((x) => (x.loyal == null ? 60 : x.loyal) < 74)
      .sort((a, b) => (b.lead + b.valor + b.wit) - (a.lead + a.valor + a.wit))[0];
    if (婿) {
      const h = [...姫ら].sort((a, b) => (b.lead || 50) - (a.lead || 50))[0];
      const r = 家臣に嫁がせる(s, h.id, 婿.id);
      if (r.ok) { if (告げる) 告げる(r.文); return { 手: "縁組", h, 先: 婿.id }; }
    }
  }
  return null;
}

/* 遊ぶ側への縁談。受ければ婚姻同盟、断れば信用がいくらか下がる。 */
export function 縁談を受ける(s, 談) {
  const h = (s.hime || []).find((x) => x.id === 談.himeId);
  if (!h || h.死 || h.嫁) return { ok: false, why: "その話はもう流れた" };
  const k = relKey(h.faction, s.player);
  const r = s.relations[k] || (s.relations[k] = { trust: 45, state: "中立", until: null });
  r.state = "同盟"; r.until = null; r.master = null;
  r.trust = clamp((r.trust || 45) + 14, 0, 100);
  r.婚姻 = h.id;
  h.嫁 = { 種: "婚姻", 先: s.player, y: s.year, m: s.month };
  h.at = null;
  const 文 = `${s.factions[h.faction].name}より${h.name}を迎え、同盟を結んだ。`
    + `この縁は${h.name}の存命のあいだ続く。`;
  s.chronicle.push({ y: s.year, m: s.month, text: 文 });
  return { ok: true, 文 };
}

export function 縁談を断る(s, 談) {
  const h = (s.hime || []).find((x) => x.id === 談.himeId);
  if (!h) return { ok: false, why: "" };
  const k = relKey(h.faction, s.player);
  const r = s.relations[k] || (s.relations[k] = { trust: 45, state: "中立", until: null });
  r.trust = clamp((r.trust || 45) - 8, 0, 100);
  const 文 = `${s.factions[h.faction].name}よりの縁談を断った。`;
  s.chronicle.push({ y: s.year, m: s.month, text: 文 });
  return { ok: true, 文 };
}
