/* ==========================================================================
   移封（GDD 6.9）

   臣従した大名を、別の土地へ移す。城をそっくり取り替える――臣従大名の城は
   主家に入り、代わりに主家の城を同じ数だけあてがう。武将は城に付いて動く。

   秀吉は佐々成政を越中から肥後へ、家康を関東へ移した。土地を替えれば根が切れる。
   根が切れれば、その家はもう一度そこから根を張り直さねばならない――移封とは、
   力を削ぐ手であり、同時に力を与える手でもある。

   ------------------------------------------------------------------ 決め事

   一　城の数は同じ。多くも少なくもしない（帳が合わなくなる）
   二　主家の本拠と、旗頭の城は渡せない。家の芯と、方面を預ける者の根は動かせない
   三　石高が増えれば信用が増し、減れば減る。減封のほうが重く効く
   四　信用が著しく薄く、石高が大きく減る移封は拒まれる。拒めば旗を離れて独り立ちし、
       間柄は中立・信用零になる（かつての主に恨みを残す）
   五　同じ家への移封は五年に一度まで
   ========================================================================== */
import { clamp } from "./util.js";
import { relKey, relOf, isVassal, 主を探す } from "./state.js";
import { 旗頭たち } from "./rank.js";

export const 移封の間合い = 60;               // 同じ家へは五年（六十ヶ月）空ける
export const 拒む信用 = 35;                   // これを下回り、かつ
export const 拒む減り = 0.75;                 // 石高がこれを下回るほど減れば、拒む

/* その家の城。 */
export const 家の城ら = (s, fid) => (s.castles || []).filter((c) => c.faction === fid);
export const 石高 = (城ら) => 城ら.reduce((a, c) => a + (c.koku || 0), 0);

/* 主家が渡せる城。本拠と旗頭の城は渡せない（GDD 6.9）。 */
export function 渡せる城ら(s, 主) {
  const 本拠 = (s.factions[主] || {}).本拠;
  const 旗の城 = new Set();
  for (const g of 旗頭たち(s, 主)) {
    for (const id of [g.本領, g.at]) if (id) 旗の城.add(id);
  }
  return 家の城ら(s, 主).filter((c) => c.id !== 本拠 && !旗の城.has(c.id));
}

/* 移封を持ちかけられるか。 */
export function 移封できるか(s, 主, 臣) {
  if (!主 || !臣 || 主 === 臣) return { ok: false, why: "相手がない。" };
  if (!isVassal(s, 主, 臣)) return { ok: false, why: "旗の下に入っている家ではない。" };
  const 臣の城 = 家の城ら(s, 臣);
  if (!臣の城.length) return { ok: false, why: "その家に城がない。" };
  const 出せる = 渡せる城ら(s, 主);
  if (出せる.length < 臣の城.length) {
    return { ok: false, why: `あてがえる城が足りない（要 ${臣の城.length}城、いま ${出せる.length}城）。`
      + "本拠と旗頭の城は渡せない。" };
  }
  const 控 = ((s.移封の控え || {})[relKey(主, 臣)]) || null;
  if (控) {
    const 経 = (s.year - 控.y) * 12 + (s.month - 控.m);
    if (経 < 移封の間合い) {
      return { ok: false, why: `一度移したばかりである。次に移せるのは${移封の間合い - 経}ヶ月後。` };
    }
  }
  return { ok: true, 城数: 臣の城.length };
}

export const 移封できる家ら = (s, 主) => Object.keys(s.factions || {})
  .filter((f) => 移封できるか(s, 主, f).ok);

/* 移封の見立て。どれだけ石高が動き、信用がどう動くか。 */
export function 移封の見立て(s, 主, 臣, 選んだ城ら) {
  const 旧 = 家の城ら(s, 臣);
  const 新 = (選んだ城ら || []).map((id) => (s.castles || []).find((c) => c.id === id)).filter(Boolean);
  const 旧石 = 石高(旧), 新石 = 石高(新);
  const 比 = 旧石 > 0 ? 新石 / 旧石 : 1;
  /* 加増は当然と思われ、減封は恨まれる。減るほうを重く見る。 */
  const 信 = clamp(Math.round(比 >= 1 ? (比 - 1) * 30 : (比 - 1) * 50), -25, 15);
  const 誼 = relOf(s, 主, 臣).trust == null ? 45 : relOf(s, 主, 臣).trust;
  const 拒む = 誼 < 拒む信用 && 比 < 拒む減り;
  return { 旧石, 新石, 比, 信, 誼, 拒む, 数が合う: 新.length === 旧.length && 新.length > 0 };
}

/* 移封する。拒まれれば独り立ちする（GDD 6.9）。 */
export function 移封する(s, 主, 臣, 選んだ城ら, { 告げる } = {}) {
  const 可 = 移封できるか(s, 主, 臣);
  if (!可.ok) return { ok: false, why: 可.why };
  const 見 = 移封の見立て(s, 主, 臣, 選んだ城ら);
  if (!見.数が合う) return { ok: false, why: "城の数が合わない。" };
  const k = relKey(主, 臣);

  if (見.拒む) {
    const r = s.relations[k] || (s.relations[k] = { trust: 0, state: "中立", until: null });
    r.state = "中立"; r.master = null; r.until = null; r.trust = 0;
    s.移封の控え = { ...(s.移封の控え || {}), [k]: { y: s.year, m: s.month, 拒: true } };
    const 文 = `${(s.factions[臣] || {}).name}は移封を拒み、旗を離れて独り立ちした。`;
    if (告げる) 告げる(文);
    return { ok: true, 拒まれた: true, 見 };
  }

  const 旧 = 家の城ら(s, 臣).map((c) => c.id);
  const 新 = (選んだ城ら || []).slice();
  /* 一　主家の城を臣従の家へ。城にいる主家の将は、主家の他の城へ引き移る。 */
  const 主の残り = 家の城ら(s, 主).filter((c) => !新.includes(c.id));
  const 主の受け皿 = (s.factions[主] || {}).本拠 || (主の残り[0] || {}).id || null;
  for (const id of 新) {
    const c = (s.castles || []).find((x) => x.id === id);
    if (!c) continue;
    for (const g of s.generals || []) {
      if (g.at !== id || g.faction !== 主) continue;
      g.at = 主の受け皿; if (g.本領 === id) g.本領 = 主の受け皿;
      g.役 = null; g.役国 = null; g.寄親 = null;
    }
    c.faction = 臣; c.lordId = null;
    c.najimi = Math.min(c.najimi == null ? 70 : c.najimi, 40);
  }
  /* 二　臣従の家の城を主家へ。臣従の家の将は、あてがわれた城へ移る。 */
  const 移る将 = (s.generals || []).filter((g) => g.faction === 臣 && !g.captive);
  const 行き先 = 新[0] || null;
  for (const id of 旧) {
    const c = (s.castles || []).find((x) => x.id === id);
    if (!c) continue;
    c.faction = 主; c.lordId = null;
    c.najimi = Math.min(c.najimi == null ? 70 : c.najimi, 40);
  }
  /* 将は新しい領へ散らす。当主は新しい本拠へ。 */
  移る将.forEach((g, i) => {
    const 先 = 新.length ? 新[i % 新.length] : 行き先;
    g.at = 先; g.本領 = 先;
    g.役 = null; g.役国 = null; g.寄親 = null;
  });
  const 当主 = 移る将.find((g) => g.lord);
  if (当主 && 新.length) { 当主.at = 新[0]; 当主.本領 = 新[0]; }
  s.factions[臣].本拠 = 新[0] || null;

  /* 三　誼の動き。 */
  const r = s.relations[k] || (s.relations[k] = { trust: 45, state: "臣従", master: 主, until: null });
  r.trust = clamp((r.trust == null ? 45 : r.trust) + 見.信, 0, 100);
  s.移封の控え = { ...(s.移封の控え || {}), [k]: { y: s.year, m: s.month } };

  if (告げる) {
    告げる(`${(s.factions[臣] || {}).name}を移封した（${Math.round(見.旧石 / 10000)}万石 → `
      + `${Math.round(見.新石 / 10000)}万石、${新.length}城）。`
      + (見.信 > 0 ? `加増により信用が${見.信}増した。` : 見.信 < 0 ? `減封により信用が${-見.信}減った。` : ""));
  }
  return { ok: true, 見, 渡した城: 新, 受けた城: 旧 };
}

/* ==========================================================================
   直参に招く（GDD 6.9）

   臣従した大名の家臣を、こちらの直臣として召し出す。秀吉の家臣団はほとんどが
   これでできている。ただし無償で引き抜けるなら、旗の下の家を空にして呑み込む
   近道になってしまう。招けるのは「不満のある者」に限り、招けば臣従先の誼が傷つく。

     一　当主とその跡取りは招けない（家が壊れる）
     二　招けるのは、忠誠の薄い者か、知行に見合わぬ働きの者
     三　招けば臣従先の信用が落ち、招いた者の忠誠も低いところから始まる
     四　人だけが移る。城は動かない
   ========================================================================== */
export const 招ける忠誠 = 65;                 // これを下回る者は、他家の誘いに耳を貸す
export const 招きの咎め = 10;                 // 臣従先の信用がこれだけ落ちる

/* 招ける者か。 */
export function 招けるか(s, 主, g) {
  if (!g || g.captive) return { ok: false, why: "その者は招けない。" };
  if (g.lord) return { ok: false, why: "当主は招けない。" };
  if (g.faction === 主) return { ok: false, why: "すでに直参である。" };
  if (!isVassal(s, 主, g.faction)) return { ok: false, why: "旗の下の家の者ではない。" };
  /* 跡取りは招けない。家が続かなくなる。 */
  const 当主 = (s.generals || []).find((x) => x.faction === g.faction && x.lord);
  if (当主 && (g.id === 当主.嫡子 || g.親 === 当主.id)) {
    return { ok: false, why: "跡取りは招けない。" };
  }
  const 忠 = g.loyal == null ? 60 : g.loyal;
  if (忠 >= 招ける忠誠) {
    return { ok: false, why: `${g.name}は主家に篤い（忠誠${Math.round(忠)}）。耳を貸さぬ。` };
  }
  return { ok: true, 忠 };
}

export const 招ける者ら = (s, 主) => (s.generals || [])
  .filter((g) => 招けるか(s, 主, g).ok);

/* 直参に招く。人だけが移り、城は動かない。 */
export function 直参に招く(s, 主, id, { 告げる } = {}) {
  const g = (s.generals || []).find((x) => x.id === id);
  const 可 = 招けるか(s, 主, g);
  if (!可.ok) return { ok: false, why: 可.why };
  const 旧家 = g.faction;
  const 城 = (s.castles || []).find((c) => c.id === g.at);
  /* 城主であったなら、札を外す（城はそのまま旧主の家に残る）。 */
  for (const c of s.castles || []) if (c.lordId === g.id) c.lordId = null;
  g.faction = 主;
  g.役 = null; g.役国 = null; g.寄親 = null; g.的家 = null;
  /* 落ち着き先は、主家の城のうちいまいる城にいちばん近いもの。 */
  const 主の城 = 家の城ら(s, 主);
  const 近 = 城 ? 主の城.slice().sort((a, b) =>
    Math.hypot((a.x || 0) - (城.x || 0), (a.y || 0) - (城.y || 0))
    - Math.hypot((b.x || 0) - (城.x || 0), (b.y || 0) - (城.y || 0)))[0] : 主の城[0];
  g.at = 近 ? 近.id : null; g.本領 = 近 ? 近.id : null;
  /* 旧主を売って来た者である。忠誠は低いところから始まる。 */
  g.loyal = clamp(Math.min(g.loyal == null ? 60 : g.loyal, 58), 20, 70);
  const k = relKey(主, 旧家);
  const r = s.relations[k];
  if (r) r.trust = clamp((r.trust == null ? 45 : r.trust) - 招きの咎め, 0, 100);
  if (告げる) {
    告げる(`${g.name}が${(s.factions[旧家] || {}).name}を離れ、直参として召し出された`
      + `（${(s.factions[旧家] || {}).name}との信用が${招きの咎め}減った）。`);
  }
  void 主を探す;
  return { ok: true, 将: g.id, 旧家 };
}
