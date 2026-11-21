/* ==========================================================================
   風雲：大名家の組織の木（hitori/Soshiki.jsx が屋敷の画面から開く）

   遊ぶ人の申し出：「その大名家の組織ツリーを作りたいです。風雲のみでいいので。大名が一番上で、身分ごとに名前があり、
   プレイヤーがどの位置にいるかがわかるものです。上司の名前も武将でないものも架空で載せたいです」。形の答え：「旗頭、国主、
   城主までは全員並べてそれ以下は自分の筋に当たる武将や上司を記載していく」。
     大名・旗頭・国主・城主 … 家の者をみな並べる。旗頭の下にその寄騎（国主・城主）、国主の下にその寄騎（城主）を出し、旗頭・
                国主の寄騎でない者は大名の下に出す（core/rank.js の 寄親・役・castellanOf。キャンペーンの家中の筋と同じ）。
                当主の城は大名に添える
     自分の筋 … 主人公の住む城の城主の下に、上司の武将（城主と別の者なら）、物頭から主人公の一つ上の身分までの上役（武将の帳に
                載らない者。名は hitori/kakuu.js 架空の上役。上司の武将が物頭なら物頭は出さない）、主人公を出す。主人公の下に、
                手勢（雇い入れの名簿。hitori/tezei_meibo.js）か、足軽なら同じ組の足軽（主人公と並べて五人長の下に）を出す。
                物頭・侍大将は城主の下に出る（上司は城主：hitori/fuun.js 上司を見直す）。家老から上は、主人公が城主の一人として
                木に入る
   節 … { 名, 身分（木に出す身分・役の名）, 添（城・国など）, 位（武将の身分：宿老・家老・侍大将・物頭）, 武将（武将の帳の者か）,
          自分, 筋（大名から主人公までの筋の上か）, 子: [節…] }
   ========================================================================== */
import { castellanOf, rankName } from "../core/rank.js";
import { 段の番 } from "./fuun.js";
import { 架空の上役, 架空の上役の身分 } from "./kakuu.js";

const 役の順 = { 旗頭: 0, 国主: 1, 城主: 2 };

export function 組織の木(s) {
  const f = s && s.風雲; if (!f) return null;
  const fid = s.player, 将ら = s.generals || [];
  const 家の者か = (g) => !!g && !g.captive && g.faction === fid;
  const 当主 = 将ら.find((x) => x.faction === fid && x.lord && !x.captive) || null;
  const 武将の節 = new Map();
  const 節を作る = (g) => {
    if (!武将の節.has(g.id)) 武将の節.set(g.id, { 名: g.name, 身分: "", 役: [], 城: [], 位: g.lord ? "当主" : rankName(g, s), 武将: true, 自分: !!g.風雲の主, 子: [], _id: g.id });
    return 武将の節.get(g.id);
  };
  const 根 = 当主 ? 節を作る(当主) : { 名: ((s.factions || {})[fid] || {}).name || "", 身分: "", 役: [], 城: [], 子: [] };
  /* 旗頭・国主 */
  for (const g of 将ら) {
    if (!家の者か(g) || g.lord || (g.役 !== "旗頭" && g.役 !== "国主")) continue;
    節を作る(g).役.push(g.役);
    if (g.役 === "国主" && g.役国) 節を作る(g).国 = g.役国;
  }
  /* 城主（当主の城は大名に添える） */
  for (const c of (s.castles || []).filter((x) => x.faction === fid)) {
    const 主 = castellanOf(s, c);
    if (!主 || !家の者か(主)) continue;
    if (主.lord) { 根.城.push(c.name); continue; }
    const n = 節を作る(主);
    if (!n.役.includes("城主")) n.役.push("城主");
    n.城.push(c.name);
  }
  /* 親を決める：旗頭は大名の下。国主は寄親が旗頭なら旗頭の下。城主は寄親が旗頭か国主ならその下。ほかは大名の下 */
  const 親の節 = (g, n) => {
    if (n.役.includes("旗頭")) return 根;
    const 親 = g.寄親 && 武将の節.get(g.寄親);
    if (!親 || 親 === n) return 根;
    if (n.役.includes("国主")) return 親.役.includes("旗頭") ? 親 : 根;
    return 親.役.includes("旗頭") || 親.役.includes("国主") ? 親 : 根;
  };
  for (const [id, n] of 武将の節) {
    if (n === 根) continue;
    親の節(将ら.find((x) => x.id === id) || {}, n).子.push(n);
  }
  /* 主人公の筋（家老から上は、城主の一人としてすでに木にいる） */
  let 自分 = [...武将の節.values()].find((n) => n.自分) || null;
  if (!自分) {
    const 城 = (s.castles || []).find((c) => c.id === f.城);
    const 城主 = 城 ? castellanOf(s, 城) : null;
    let 親 = 城主 && 武将の節.get(城主.id) ? 武将の節.get(城主.id) : 根;
    const 上 = 将ら.find((x) => x.id === f.上司);
    if (上 && 家の者か(上) && !上.lord && 武将の節.get(上.id) !== 親) {
      const 既 = 武将の節.get(上.id);
      if (既) 親 = 既;
      else { const n = 節を作る(上); n.上司 = true; 親.子.push(n); 親 = n; }
    }
    if (上 && 武将の節.get(上.id)) 武将の節.get(上.id).上司 = true;
    const 我の番 = 段の番(f.身分);
    if (我の番 < 段の番("物頭")) {
      const 役 = 架空の上役(s);
      const 上の位 = 上 ? rankName(上, s) : null;
      for (const 身 of 架空の上役の身分) {
        if (段の番(身) <= 我の番 || (身 === "物頭" && 上の位 === "物頭")) continue;
        const n = { 名: 役[身], 身分: 身, 役: [], 城: [], 武将: false, 子: [] };
        親.子.push(n); 親 = n;
      }
      自分 = { 名: f.名, 身分: f.身分, 役: [], 城: [], 武将: false, 自分: true, 子: [] };
      親.子.push(自分);
      if (f.身分 === "足軽") for (const 名 of 役.同輩) 親.子.push({ 名, 身分: "足軽", 役: [], 城: [], 武将: false, 子: [] });
      else for (const m of (f.手勢 && f.手勢.身分 === f.身分 ? f.手勢.名簿 : []) || []) {
        自分.子.push({ 名: m.欠 ? "欠員" : m.名, 身分: m.種, 役: [], 城: [], 武将: false, 子: [],
          添: m.定 > 1 ? `${m.人}／${m.定}人` : "", 欠: !!m.欠 });
      }
    } else {
      自分 = { 名: f.名, 身分: f.身分, 役: [], 城: [], 武将: false, 自分: true, 子: [] };
      親.子.push(自分);
    }
  }
  /* 身分の名と添え（役の名・国・城）。子は役の順に、同じ役なら名の順に */
  const 整える = (n) => {
    if (!n.身分) n.身分 = n === 根 ? "大名" : [...n.役].sort((a, z) => 役の順[a] - 役の順[z]).join("・") || n.位 || "";
    if (n.役.length || n === 根) n.添 = [n.国 ? `${n.国}の国主` : "", n.城.join("・")].filter(Boolean).join("・");
    n.子.sort((a, z) => 節の順(a) - 節の順(z));          // 並べ替えは崩さない（同じ順なら元の並び。自分は同じ組の者の前）
    n.子.forEach(整える);
  };
  const 節の順 = (n) => (n.役.length ? Math.min(...n.役.map((r) => 役の順[r] ?? 3)) : 3);
  整える(根);
  /* 筋（大名から主人公まで） */
  const 筋を立てる = (n) => { if (n === 自分) { n.筋 = true; return true; } let 有 = false; for (const k of n.子) if (筋を立てる(k)) 有 = true; if (有) n.筋 = true; return 有; };
  筋を立てる(根);
  return 根;
}

/* 大名から主人公までの筋（節の並び。上から） */
export function 自分の筋(木) {
  const 出 = [];
  let n = 木;
  while (n) { 出.push(n); n = n.子.find((k) => k.筋) || null; }
  return 出;
}
