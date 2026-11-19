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

   率いる（遊ぶ人の申し出：「隊を率いるようになった場合、自分が先頭を歩くのもなんか違う。後ろから指示を出すかたちに
   したい。クリック等で指示するのも操作性が悪そう。位置は後ろ固定で自分がコントロールで動けば、率いる隊も動き、これまで
   の『突く』は全体としての『攻撃』になるなど、コマンドが率いる隊全体となるような仕様に。ただし、ピッタリみんなが同じ
   動きをすると不自然なので、少し挙動にバラツキがあるように」）：
     ・与平は手勢のいちばん後ろの兵のうしろ（徒は三.五歩、馬上は五.五歩）に付く（hitori/senaka.js 与平をうしろに付ける）
     ・方向キーは手勢を動かす（写しの向きで、上は前へ）。押した方へ手勢が歩み、向きもそちらへ回る。組が二つ以上なら
       陣の向きも回す。放せば止まる
     ・三つの釦は手勢への下知：掛かれ（前の敵の組へ掛かる。駆けよと共に押せば突撃）・構え（止まって構える）・
       駆けよ（押しているあいだ駆け足）
     ・兵の足の出し方は一人ずつ少し違う（battle/shinga.js 足の癖）
     ・与平が討たれるか、委ねて結果を見るなら、手勢は諸将の采配に任せる
   五十人長からは、与平は馬上（組頭と同じ。battle/shinga.js 組頭の番）。
   値はみな仮。
   ========================================================================== */
import { placeSquads } from "../battle/corps.js";

export const 手勢の数 = { 十人長: 10, 三十人長: 30, 五十人長: 50, 百人長: 100, 三百人長: 300 };
export const 掛かれの届き = 120;              // 掛かれの下知で掛かる敵の組の遠さ（盤の歩・およそ五十五m）
const 組の前 = 8;                              // 組の前の列は、組の芯から八歩前（shinga.js 持場）
const 下知の間 = 0.2;                           // 方向キーから手勢へ下知を出し直す間（実の秒）

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

const 角の差 = (a, z) => { let d = a - z; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const 下知の控え = (c) => c.下知 || (c.下知 = { t: -9, 様: "待つ", 陣t: -9 });
const 委ねるか = (b, c) => !c || !c.手勢 || c.dead || c.destroyed || b.委ねた;

/* 方向キーから手勢へ（背中越しの一コマごと）。入 … 背中越しの入り（jx・jy・keys・駆）。写し角 … 写しの向き（世界の角）。
   t … 実の秒。押していれば、押した向き（盤の座標）へ四十歩先を行き先にして歩ませる。放せば止める。
   噛み合っていて前へ押しているあいだは、掛かれの下知のまま戦わせる（前へ押して引き離さない） */
export function 手勢へ下知(b, c, 入, 写し角, t) {
  if (委ねるか(b, c)) return;
  const 下 = 下知の控え(c);
  let jx = 入.jx || 0, jy = 入.jy || 0;
  const 鍵 = 入.keys || new Set(), kx = (鍵.has("r") ? 1 : 0) - (鍵.has("l") ? 1 : 0), ky = (鍵.has("d") ? 1 : 0) - (鍵.has("u") ? 1 : 0);
  if (kx || ky) { const L = Math.hypot(kx, ky); jx = kx / L; jy = ky / L; }
  const m = Math.hypot(jx, jy), 押す = m > 0.12;
  if (t - 下.t < 下知の間) return;
  下.t = t;
  c.auto = false; c.pending = null; c.wp = null;
  if (押す) {
    const cfx = Math.cos(写し角), cfz = Math.sin(写し角), ux = jx / m, uy = jy / m;
    const wx = cfz * ux - cfx * uy, wz = -cfx * ux - cfz * uy, dx = wx, dy = -wz;    // 世界の向き → 盤の向き
    const 噛 = c.squads.some((q) => q.engaged && q.men > 0);
    const 前へ = dx * Math.cos(c.facing) + dy * Math.sin(c.facing) > 0.3;
    if (噛 && 前へ && 下.様 === "掛かる") return;
    c.order = "移動"; c.狙い = null; c.tx = c.x + dx * 40; c.ty = c.y + dy * 40; 下.様 = "動く";
    if (入.駆) c.chargeT = Math.max(c.chargeT || 0, 0.6);          // 駆けよ：押しているあいだ駆け足
    /* 組が二つ以上なら、陣の向きも歩む向きへ回す（〇.六秒に一度まで。二十度より回れば陣を組み直す） */
    if (c.squads.filter((q) => q.men > 0).length > 1 && t - 下.陣t > 0.6 && Math.abs(角の差(c.facing, c.陣向き == null ? c.facing : c.陣向き)) > 0.35) {
      下.陣t = t; c.陣向き = c.facing; placeSquads(c, false);
    }
  } else if (下.様 === "動く") {
    c.order = "待機"; c.tx = c.x; c.ty = c.y; 下.様 = "待つ";
  }
}

/* 掛かれ：手勢の前（向きから左右八十度のうち）の、掛かれの届きのうちでいちばん近い敵の組へ掛かる。前に無ければ、
   六十歩のうちならどの向きでも。駆け … 駆けよを押しながらなら突撃（ゲームの「突撃」の釦と同じく突撃の刻を付ける）。
   掛かった敵の組を返す（無ければ null） */
export function 手勢で掛かる(b, c, 駆 = false) {
  if (委ねるか(b, c)) return null;
  const 下 = 下知の控え(c), fx = Math.cos(c.facing), fy = Math.sin(c.facing);
  let 的 = null, 的d = 1e9;
  for (const e of b.corps) {
    if (e.side === c.side || e.dead || e.destroyed || e.日和見 || e.routed) continue;
    for (const q of e.squads || []) {
      if (!(q.men > 0)) continue;
      const dx = q.x - c.x, dy = q.y - c.y, d = Math.hypot(dx, dy);
      const 前 = d > 1e-6 ? (dx * fx + dy * fy) / d : 1;
      if (!(d < 60 || (d < 掛かれの届き && 前 > Math.cos(80 * Math.PI / 180)))) continue;
      if (d < 的d) { 的d = d; 的 = { q, e }; }
    }
  }
  if (!的) return null;
  c.auto = false; c.pending = null; c.wp = null;
  c.order = 駆 ? "突撃" : "接戦"; c.tx = 的.q.x; c.ty = 的.q.y; c.狙い = 的.e.id;
  if (駆) c.chargeT = c.formation === "鋒矢" ? 26 : 16;
  下.様 = "掛かる"; 下.t = -9;
  return 的;
}

/* 構え：その場に止まって構える（守備） */
export function 手勢を構えさせる(b, c) {
  if (委ねるか(b, c)) return false;
  const 下 = 下知の控え(c);
  c.auto = false; c.pending = null; c.wp = null;
  c.order = "守備"; c.tx = c.x; c.ty = c.y; c.狙い = null; 下.様 = "構え"; 下.t = -9;
  return true;
}

/* 与平が討たれたら、手勢は諸将の采配に任せる */
export function 手勢を委ねる(c) { if (c && c.手勢) c.auto = true; }

/* 手勢の下知の名（名札に出す） */
export const 下知の名 = (c) => ({ 動く: "進め", 掛かる: "掛かれ", 構え: "構え", 待つ: "待て" })[(c && c.下知 && c.下知.様) || "待つ"];
