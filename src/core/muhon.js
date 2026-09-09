/* ============================================================ 謀反（GDD 6.4 / 12.3）

   大きな軍団を預けることは、それ自体が賭けである。

   信長は荒木村重に摂津を、松永久秀に大和を預け、いずれにも背かれた。明智光秀は
   丹波を預かって本能寺へ向かった。家康はこれを免れた――人を見る目があったから
   でもあろうが、抱えた者の心を離さぬ手立てを持っていたからでもある。

   ここでは、寄騎を多く預けた寄親ほど危ういものとする。抱えた寄騎の数が、
   そのまま謀反の目に乗る。

     謀反の目 ＝ (七十 − 忠誠) × (一 ＋ 寄騎の数 × 〇.一五) ÷ 七十

   忠誠七十以上の者は謀反を起こさない。ここが遊ぶ側の梃子である。褒賞を与え、
   加増し、あるいは寄騎を減らせば、危うさは消える。手が打てぬ不幸は理不尽だが、
   手が打てたのに打たなかった不幸は物語になる。

   段を踏ませる。いきなり起こしてはならない。
     一、忠誠六十を割る … 家中に不穏の噂が立つ
     二、忠誠五十を割る … 他家と使者を交わす（支度が始まる）
     三、二か月ののち … 謀反

   行き先は、敵対する隣家である。独立（新しい家を興す）は扱わない――家は盤に
   定められた百三十四家で、名も紋も素性も持つものだからである。史実でも荒木は
   毛利と本願寺へ、松永は三好へ走った。寝返りのほうが多い。

   付いていくかどうかは、寄騎それぞれが決める。
     大名への忠誠が七十以上の寄騎は付いていかない。その城は大名のものとして残る。
     付いていった者は、新しい主のもとで忠誠が低い。引き抜き・内応で取り返せる。 */
import { relOf } from "./state.js";
import { 本拠を追う, 奪われた本領を繕う } from "./state.js";
import { 寄騎たち, 忠誠 } from "./rank.js";

export const 謀反の目 = (s, 親) => {
  if (!親 || 親.captive || 親.lord) return 0;
  if (親.役 !== "国主" && 親.役 !== "旗頭") return 0;
  const 忠 = 忠誠(親);
  if (忠 >= 70) return 0;                                  // 七十を保てば起きない
  const 寄 = 寄騎たち(s, 親.id).length;
  return ((70 - 忠) * (1 + 寄 * 0.15)) / 70;
};

// 走る先。敵対する隣家のうち、いちばん大きい家
export function 走る先(s, fid) {
  const 石 = (x) => s.castles.filter((c) => c.faction === x).reduce((a, c) => a + c.koku, 0);
  const 敵 = Object.keys(s.factions || {}).filter((x) => x !== fid
    && s.castles.some((c) => c.faction === x)
    && relOf(s, fid, x).state === "敵対");
  if (!敵.length) return null;
  return [...敵].sort((a, b) => 石(b) - 石(a))[0];
}

/* 謀反を起こす。寄親とその寄騎（忠誠七十未満）の城が、走る先へ移る。 */
export function 謀反を起こす(s, 親, 先) {
  const 移る = [親, ...寄騎たち(s, 親.id).filter((x) => 忠誠(x) < 70)];
  const 残る = 寄騎たち(s, 親.id).filter((x) => 忠誠(x) >= 70);
  const 城ら = [];
  for (const g of 移る) {
    const c = (s.castles || []).find((x) => x.id === (g.本領 || g.at) && x.faction === g.faction);
    g.faction = 先;
    g.役 = null; g.役国 = null; g.方面 = null; g.寄親 = null;
    /* 新しい主のもとで、心は据わらない。元の大名の調略がよく効く。 */
    g.loyal = 35 + Math.random() * 10;
    if (c) {
      c.faction = 先;
      c.najimi = 40;
      c.min = Math.max(0, c.min - 6);
      c.lordId = g.id;
      城ら.push(c);
    }
  }
  // 踏みとどまった寄騎は、寄親を失うだけである
  for (const g of 残る) g.寄親 = null;
  /* 走った者は、旧主の軍から降りる（GDD 12.3）。

     軍の名簿を直していなかったので、寝返った将が旧主の軍に乗ったまま進み、
     旧主の城へ着いてそこの城主になった――巡検が、赤松に走った宇喜多直家が
     浦上の天神山城に立っている姿で拾った。旗を替えた者が、そのまま元の主の
     軍で行軍を続ける道理はない。 */
  const 走 = new Set(移る.map((g) => g.id));
  for (const a of s.armies || []) {
    if (!(a.gens || []).some((id) => 走.has(id))) continue;
    a.gens = a.gens.filter((id) => !走.has(id));
    for (const id of 走) {
      const g = s.generals.find((q) => q.id === id);
      if (!g || g.at != null) continue;
      const 城 = (城ら[0] || s.castles.find((c) => c.faction === 先));
      if (城) { g.at = 城.id; if (!g.本領 || !s.castles.some((c) => c.id === g.本領 && c.faction === 先)) g.本領 = 城.id; }
    }
  }
  親.謀反支度 = null;
  /* 城の主が変われば、その場で根を繕う（落城・内応と同じ理屈）。
     繕わねば、旧主に残った者の本領が、走った先の城を指したままになる。 */
  if (城ら.length) { 本拠を追う(s); 奪われた本領を繕う(s); }
  return { 移った: 移る, 残った: 残る, 城: 城ら };
}

/* 月ごとの見回り。兆しを出し、支度を進め、時が来れば起こす。 */
export function 謀反の見回り(s, fid, { 告げる, 籤 } = {}) {
  const 引く = typeof 籤 === "function" ? 籤 : Math.random;
  const 起きた = [];
  for (const 親 of (s.generals || []).filter((g) => g.faction === fid && !g.captive)) {
    const 目 = 謀反の目(s, 親);
    if (目 <= 0) { if (親.謀反支度) 親.謀反支度 = null; continue; }
    const 忠 = 忠誠(親);
    // 三、支度が整えば起こす
    if (親.謀反支度) {
      if (親.謀反支度.残 > 1) { 親.謀反支度.残--; continue; }
      const 先 = s.factions[親.謀反支度.先] && s.castles.some((c) => c.faction === 親.謀反支度.先)
        ? 親.謀反支度.先 : 走る先(s, fid);
      if (!先) { 親.謀反支度 = null; continue; }
      const r = 謀反を起こす(s, 親, 先);
      起きた.push({ 親, 先, ...r });
      if (告げる) {
        告げる(`${親.name}が${s.factions[先].name}へ走った。`
          + `${r.城.length}城が離れ、${r.残った.length ? `${r.残った.map((x) => x.name).join("・")}は踏みとどまった` : "従う者はことごとく付いていった"}。`);
      }
      continue;
    }
    // 二、他家と使者を交わす（忠誠五十を割る）
    if (忠 < 50 && 引く() < 目 * 0.15) {
      const 先 = 走る先(s, fid);
      if (先) {
        親.謀反支度 = { 先, 残: 2 };
        if (告げる) 告げる(`${親.name}が${s.factions[先].name}と使者を交わしている由。捨て置けば事が起きよう。`);
        continue;
      }
    }
    // 一、不穏の噂（忠誠六十を割る）
    if (忠 < 60 && 引く() < 目 * 0.25 && 告げる) {
      告げる(`${親.name}の家中に不穏の噂がある（忠誠${忠}・寄騎${寄騎たち(s, 親.id).length}名）。`);
    }
  }
  return 起きた;
}
