/* ==========================================================================
   手勢（風雲モード・十人長から三百人長）

   遊ぶ人の申し出：「一人から部隊が増えていく」「一つずつ上の地位になったときの部隊の動きについて、全て見たい。
   移動するところと、敵を見つけてその敵の隊と当たるところを、それぞれの地位に応じて」。

   十人長から三百人長に上がると、合戦で手勢を率いる。手勢は、上司の隊の槍組から分けた兵で、
   十人長は十人、三十人長は三十人、五十人長は一組（五十人）、百人長は二組、三百人長は六組。
   上司の隊とは別の隊として盤に立つ（分遣隊と同じ形：battle/corps.js makeDetachment）。
     ・隊の id は「上司の id ＋ #手勢」。戦の跡では、組の名簿の id（src）で上司の兵に数える
       （同じ組から分けた兵は、生き残りを足し合わせる：core/roster.js 戦の跡）
     ・将は与平（上司の将を写し、名と武勇・統率を与平のものに替える。総大将の印は持たない。手勢が崩れても
       総大将が討たれたことにはならない）
     ・本陣（将・旗持・馬廻）は立てない。率いる与平は、背中越しに自分で描く（battle/shinga.js）

   動き（与平は方向キーで自分を動かす。手勢は与平に従う）：
     ・与平が歩めば、手勢は与平の歩む向きへ、前の列が与平の並びに来るように歩む（与平は前の列の中を兵と並んで歩む。
       背中越しに、両脇に手勢の兵が見える）。与平が止まれば、前の列が与平の並び（一歩半先）に来て止まる
     ・与平から 掛かる間（六十歩・およそ二十八m）のうちに敵の組があれば、その組へ掛かる（接戦）
     ・与平が討たれれば、手勢は諸将の采配に委ねる（委任）
   値はみな仮。
   ========================================================================== */
import { placeSquads } from "../battle/corps.js";

export const 手勢の数 = { 十人長: 10, 三十人長: 30, 五十人長: 50, 百人長: 100, 三百人長: 300 };
export const 掛かる間 = 60;                   // 盤の歩（〇.四六m）
const 組の前 = 8;                              // 組の前の列は、組の芯から八歩前（shinga.js 持場）
const 導く間 = 0.25;                           // 手勢へ下知を出し直す間（実の秒）

/* 手勢を組む（合戦の始めに一度）。隊id … 上司の隊。一人 … 盤へ渡す主人公（手勢・名・武勇・統率）。
   組んだ手勢の隊を返す（組めなければ null）。盤に b.手勢 として控える */
export function 手勢を組む(b, 隊id, 一人) {
  const 数 = (一人 && 一人.手勢) || 0;
  if (!(数 > 0) || !b || !b.corps) return null;
  if (b.手勢) return b.手勢;
  const 親 = b.corps.find((c) => c.id === 隊id && !c.dead && !c.destroyed);
  if (!親) return null;
  const 敵 = b.corps.filter((c) => c.side !== 親.side && !c.dead && !c.destroyed);
  const 敵まで = (q) => { let m = 1e12; for (const e of 敵) { const d = (e.x - q.x) ** 2 + (e.y - q.y) ** 2; if (d < m) m = d; } return m; };
  /* 敵に近い槍組から取る（槍組が無ければ、ほかの組から） */
  const 生 = 親.squads.filter((q) => q.men > 0);
  const 元ら = (生.some((q) => q.type === "yari") ? 生.filter((q) => q.type === "yari") : 生).sort((a, z) => 敵まで(a) - 敵まで(z));
  const 取る = []; let 残り = 数;
  for (const q of 元ら) {
    if (残り <= 0) break;
    if (q.men <= 残り + 0.5) { 取る.push(q); 残り -= q.men; continue; }
    /* 組を分ける。分けた兵は同じ名簿の組（src）のまま（戦の跡で生き残りを足し合わせる） */
    const 分 = { ...q, id: `${q.id}#手勢`, men: 残り, max: 残り, engaged: false, foe: null, link: null, aim: null,
      cool: 0, seed: (q.seed || 0) + 517 };
    q.men -= 残り; q.max = Math.max(q.men, (q.max || 50) - 残り);
    取る.push(分); 残り = 0;
  }
  if (!取る.length) return null;
  親.squads = 親.squads.filter((q) => !取る.includes(q));
  const x = 取る.reduce((a, q) => a + q.x, 0) / 取る.length, y = 取る.reduce((a, q) => a + q.y, 0) / 取る.length;
  const 名 = (一人 && 一人.名) || "与平";
  const 将 = { ...親.gen, id: `${親.gen.id}#手勢`, name: 名, lord: false,
    lead: 一人 && 一人.統率 != null ? 一人.統率 : 30, valor: 一人 && 一人.武勇 != null ? 一人.武勇 : 45 };
  const c = {
    id: `${親.id}#手勢`, side: 親.side, gen: 将, color: 親.color, name: `${名}の手勢`,
    x, y, facing: 親.facing, order: "待機", tx: x, ty: y, morale: 親.morale, squads: 取る,
    formation: "横陣", routed: false, dead: false, destroyed: false, ambush: false, revealed: true,
    lastSeen: { x, y, t: b.t || 0 }, seen: false, loss: { 直属: 0, 地域: 0 }, feats: [],
    fatigue: 親.fatigue || 0, chargeT: 0, reformT: 0, faceTo: null, 陣向き: 親.陣向き != null ? 親.陣向き : 親.facing,
    pending: null, pinch: 0, northStart: 親.northStart, bank0: 親.bank0,
    auto: false, detach: false, parentId: 親.id, task: null, autonomous: false, boxed: false, 手勢: 数, 導き: null,
  };
  placeSquads(c, true);
  placeSquads(親, false);
  b.corps.push(c);
  b.手勢 = c;
  if (b.log) b.log.push({ t: b.t || 0, text: `${名}が手勢${数}人を率いる（${親.name}の隊から）。` });
  return c;
}

/* 手勢の前の列の真ん中（盤の座標）。組ごとの前の列（芯から向きへ八歩）のうち、隊の向きでいちばん前にある組たち
   （六歩のうち）の真ん中。組が前後に並ぶ陣（百人長・三百人長）でも、前の組の並びを取る */
function 前の列(c) {
  const fx = Math.cos(c.facing || 0), fy = Math.sin(c.facing || 0), 点ら = [];
  for (const q of c.squads) { if (!(q.men > 0)) continue; const a = q.facing || c.facing || 0, x = q.x + Math.cos(a) * 組の前, y = q.y + Math.sin(a) * 組の前; 点ら.push({ x, y, v: x * fx + y * fy }); }
  if (!点ら.length) return null;
  const 先 = Math.max(...点ら.map((o) => o.v)), 前ら = 点ら.filter((o) => o.v > 先 - 6);
  return { x: 前ら.reduce((a, o) => a + o.x, 0) / 前ら.length, y: 前ら.reduce((a, o) => a + o.y, 0) / 前ら.length };
}

export { 前の列 as 手勢の前の列 };

/* 与平に従わせる（背中越しの一コマごと。与平の居所 我x・我y は盤の座標）。手勢の隊でなければ何もしない */
export function 手勢を導く(b, c, 我x, 我y, t, 倒れた = false) {
  if (!c || !c.手勢 || c.dead || c.destroyed || b.委ねた) return;      // 委ねて結果を見るなら、手勢も諸将の采配に任せる
  if (倒れた) { c.auto = true; return; }
  const 導 = c.導き || (c.導き = { t: -9 });
  if (t - 導.t < 導く間) return;
  導.t = t;
  c.auto = false; c.pending = null; c.wp = null;
  /* 掛かる敵：与平から 掛かる間 のうちの、いちばん近い敵の組 */
  let 的 = null, 的d = 掛かる間;
  for (const e of b.corps) {
    if (e.side === c.side || e.dead || e.destroyed || e.日和見) continue;
    for (const q of e.squads || []) { if (!(q.men > 0)) continue; const d = Math.hypot(q.x - 我x, q.y - 我y); if (d < 的d) { 的d = d; 的 = { q, e }; } }
  }
  if (的) { c.order = "接戦"; c.tx = 的.q.x; c.ty = 的.q.y; c.狙い = 的.e.id; 導.様 = "掛かる"; return; }
  c.狙い = null;
  const 前 = 前の列(c); if (!前) return;
  /* 与平の歩み（盤の歩／実の秒）。歩んでいれば、手勢は与平の歩む向きへ、与平の並びを保って歩む。
     盤の隊は行き先の六歩手前で足を止めるので、歩むあいだの行き先は与平の八歩先に置く（前の列が与平の二歩ほど先） */
  const 前回 = 導.我 || { x: 我x, y: 我y, t: t - 導く間 };
  const dt0 = Math.max(1e-3, t - 前回.t), mx = 我x - 前回.x, my = 我y - 前回.y, v = Math.hypot(mx, my) / dt0;
  導.我 = { x: 我x, y: 我y, t };
  const dx = 我x - 前.x, dy = 我y - 前.y, 隔 = Math.hypot(dx, dy), 歩む = v > 0.8;
  if (歩む || 隔 > (導.様 === "従う" ? 1 : 4)) {
    const L = 歩む ? Math.hypot(mx, my) : 隔, ux = (歩む ? mx : dx) / L, uy = (歩む ? my : dy) / L;
    const 前の距 = Math.hypot(前.x - c.x, 前.y - c.y), 先 = 歩む ? 8 : 1.5;
    c.order = "移動"; c.tx = 我x + ux * (先 - 前の距); c.ty = 我y + uy * (先 - 前の距); 導.様 = "従う";
  } else if (導.様 !== "待つ") {
    c.order = "待機"; c.tx = c.x; c.ty = c.y; 導.様 = "待つ";
  }
}
