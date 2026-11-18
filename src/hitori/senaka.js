/* ==========================================================================
   背中越しの視点（一人働きの一人視点）

   盤の合戦の兵を、与平の背中越しに描く。兵は新しく作らない。一人ずつの絵
   （battle/shinga.js）が組ごとに持っている兵――居所（sx・sy）・向き（描）・
   歩いた道のり（歩距）・足の速さ（速）・生き死に（生）――をそのまま読み、組の
   噛み合い（噛）・構え（構）・放った刻（撃刻）で、突き・構え・放ち・歩みを決める。
   一人ずつの揺らぎ（背丈・体格・被り物・立ち所のずれ）も、寄って描くときと同じ式
   （shinga.js 新絵の兵描き）で付ける。だから、盤で寄って見る兵と、背中越しに見える
   兵は、同じ兵が同じ拍子で動く。倒れた者も、盤の倒れ（盤の見た目(b).倒れ）を描く。

   ここは読むだけで、盤にも組にも書かない（shinga.js と同じ決まり）。ただし、盤の画面が
   描いていないあいだも与平のまわりの組の見た目は進めたいので、盤の画面が呼ぶのと
   同じ 新絵状態を進める を、与平のまわりの範囲で呼ぶ。

   長さ：一歩＝〇.四六m。組の持ち場の間隔（横一.九歩・前後二.六歩、shinga.js 持場）を、
   槍足軽の間隔（横およそ〇.九m・前後およそ一.二m）に合わせた見立てである。
   世界の座標（m）：東が x、北が z、上が y。盤の座標（x 右・y 下）から x＝盤x×尺、z＝−盤y×尺。

   与平は自分で動かす（方向キー・突く・受ける・駆ける、体力・気力・討死）。決まりは、先にお見せした
   試し版（触って動かす版）と同じにした：歩みは一秒に二.四m、駆ければ四.八m、槍の届きは三.五m。
   気力は五目盛り（駆ければ一秒に一.一五減り、突けば〇.四五減る。休めば一秒に〇.五戻る）。
   突けば〇.二秒ののちに前の敵に届き、八割八分で当たる。敵の兵は二突き（会心なら一突き）で倒れる。
   与平にいちばん近い二人の敵（槍と騎馬の兵）は、槍を引いて（穂先が赤く光る）〇.五五秒ののちに突いてくる。
   受けていれば火花が出て気力が〇.三減るだけで済み、受けていなければ四割五分で八から十三の手傷。
   体力が尽きれば討死。与平が倒した敵の兵は、つなぎ（hitori/tsunagi.js 兵を討つ）で組の人数から
   ちょうど一人減らし、盤の一人ずつの絵でもその兵が倒れる。

   与平の刻（態.t）は、盤の刻（b.t）とは別に、まことの秒で進む。盤が止まっているあいだ（速さ〇。
   合戦が終わったときや委ねているとき）は与平も止まる。

   速さの釣り合い（遊ぶ人の申し出：一人視点では、速さは固定、もしくは委ねる）。背中越しのあいだ、
   盤の速さは微速（背中の速さ＝〇.一二）に固定する（合戦の画面が据え、速さの釦は押せなくする）。
   微速なら、盤の兵の歩みはおよそ毎秒一.九mで、人の歩みに近い。ただし盤の突きの拍子（盤の刻で
   一.八秒に一度）は、微速では十五秒に一度と遅すぎる。そこで背中越しに見える兵の突きの拍子だけは、
   まことの秒で刻む（背中の突きの速さ＝一秒に〇.三三。通常の速さで盤に見える拍子と同じ）。盤の画面で
   見る拍子とは揃わないが、二つを同時に見ることはない。鉄砲・弓の放つ姿は、盤と同じ拍子のままである。

   まだ描かないもの：丘・山の高さ（地は平らに描く）、本陣衆（将・旗持・馬廻）、町家。
   まだしないもの：川・林・沼で足が鈍ること（与平は野のどこでも同じ速さで歩む）、敵の兵が持ち場から
   与平へ歩み出ること（試し版ではしていた。盤の兵の居所は盤の側が決めるので、ここでは動かさない）。
   ========================================================================== */
import { 組の見た目, 盤の見た目, 新絵状態を進める, 野の川筋, 本陣衆を見る } from "../battle/shinga.js";
import { FIELD, FORESTS, WOODS, ROADS, fieldScale, passableFor } from "../battle/field.js";
/* 城攻め・籠城（遊ぶ人の申し出の C）。城の造作を背中越しに立てる（hitori/shiro_senaka.js）。
   壁ぎわの兵は、盤の斜めの眺めと同じく自分の組の側にとどめる（battle/tachimono.js 城壁をよける） */
import { 城の箱を集める, 堀の帯 } from "./shiro_senaka.js";
import { 城壁をよける } from "../battle/tachimono.js";
import { 兵を討つ, 将を討つ, 総大将か } from "./tsunagi.js";

export const 歩の尺 = 0.46;
export const 背中の速さ = 0.12;                           // 背中越しのあいだの盤の速さ（微速に固定）
export const 背中の突きの速さ = 0.55 * 0.6;               // 背中越しに見える兵の突きの拍子（一秒に〇.三三。通常の速さで盤に見える拍子）
const 尺 = 歩の尺;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, u) => a + (b - a) * u;
const sm = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const 世へ = (bx, by) => [bx * 尺, -by * 尺];                         // 盤 → 世界（m）
const 向きを世へ = (th) => [Math.cos(th), -Math.sin(th)];             // 盤の角 → 世界の向き（単位の長さ）
const 鳴 = (a, b2) => ((Math.imul(a | 0, 2654435761) ^ Math.imul((b2 | 0) + 1, 40503)) >>> 0);

/* ---------- 与平の組と、与平の立ち所 ---------- */
/* 与平の組：選んだ隊（無ければ、敵の組にいちばん近い組を持つ味方の隊）のうち、敵にいちばん近い組 */
export function 与平の組を選ぶ(b, 隊id) {
  const 生 = (c) => !c.dead && !c.destroyed && (c.squads || []).some((q) => q.men > 0);
  const 我ら = (b.corps || []).filter((c) => c.side === "P" && !c.日和見 && 生(c));
  const 敵組 = []; for (const c of b.corps || []) if (c.side !== "P" && 生(c)) for (const q of c.squads || []) if (q.men > 0) 敵組.push(q);
  const 敵までの隔 = (q) => { let m = 1e12; for (const e of 敵組) { const d = (e.x - q.x) ** 2 + (e.y - q.y) ** 2; if (d < m) m = d; } return m; };
  let 隊 = 我ら.find((c) => c.id === 隊id) || null;
  if (!隊) { let m = 1e13; for (const c of 我ら) for (const q of c.squads || []) if (q.men > 0) { const d = 敵までの隔(q); if (d < m) { m = d; 隊 = c; } } }
  if (!隊) return null;
  let 組 = null, m2 = 1e13; for (const q of 隊.squads || []) if (q.men > 0) { const d = 敵までの隔(q); if (d < m2) { m2 = d; 組 = q; } }
  return 組 ? { 隊, 組 } : null;
}
/* 与平の立ち所：組の後ろの列のさらに一歩半うしろ、真ん中。組の向きを向く（盤の座標と角）。
   背中越しに入ったとき（と、討死ののち、もう一度）に与平が立つ所。そこからは自分で動かす */
export function 与平の所(q) {
  const s = 組の見た目(q);
  if (!s || !s.初) return { x: q.x, y: q.y, 向: q.facing || 0, 初: false };
  const th = s.向, 後 = 2.4 + 1.5;                       // 五の列（持場の奥 二.四歩）のうしろ一.五歩
  return { x: s.dx - Math.cos(th) * 後, y: s.dy - Math.sin(th) * 後, 向: th, 初: true };
}

/* ---------- 眺めを集める（読むだけ。試験からも呼ぶ） ----------
   我 … { x, y }（盤の座標）。半径 R（m）のうちの、立っている兵と倒れた者を、世界の座標で返す。
   兵の働き：突（噛み合って前の二列）・構（構えて前の二列）・放（弓・鉄砲を放って一.五秒のうち）・歩・立
   拍 … 突きの拍子を刻む秒。省けば盤の刻（b.t）で、盤で寄って見る兵と同じ拍子。背中越しに描くときは
        与平の刻（まことの秒）を渡し、背中の突きの速さで刻む（上の「速さの釣り合い」） */
export function 眺めを集める(b, 我, R = 110, 拍 = null) {
  const 兵 = [], 倒れ = [];
  const [wx0, wz0] = 世へ(我.x, 我.y), R歩 = R / 尺, 尺2 = fieldScale();
  for (const c of b.corps || []) {
    if (c.dead || c.destroyed) continue;
    const 側 = c.日和見 ? "Y" : (c.side === "P" ? "P" : "E");
    for (const q of c.squads || []) {
      if (!(q.men > 0)) continue;
      if (Math.abs(q.x - 我.x) > R歩 + 60 || Math.abs(q.y - 我.y) > R歩 + 60) continue;
      const s = 組の見た目(q); if (!s || !s.初) continue;
      const alive = Math.max(0, Math.min(50, Math.round(q.men)) - (s.借り || 0));
      const 撃 = (b.t - s.撃刻) / 1.5, 型 = q.type || "yari", 歩幅 = (型 === "kiba" ? 14 : 9) * 尺2;
      for (let n = 0; n < alive; n++) {
        if (!s.生[n]) continue;
        const h = (Math.imul((q.seed || 0) + 7, 2654435761) ^ Math.imul(n + 1, 40503)) >>> 0;
        let bx = s.sx[n] + (((h >>> 21) % 7) - 3) * 0.22, by = s.sy[n] + (((h >>> 24) % 7) - 3) * 0.22;
        if (b.map) { const r = 城壁をよける(b.map, q.x, q.y, bx, by); if (r) { bx = r[0]; by = r[1]; } }
        const [x, z] = 世へ(bx, by);
        if (Math.hypot(x - wx0, z - wz0) > R) continue;
        const [fx, fz] = 向きを世へ(s.描[n]), 列 = (n / 10) | 0, 歩速 = s.速[n];
        let 働 = "立", 相 = 0;
        if (s.噛 && 列 < 2 && 歩速 < 14 * 尺2) { 働 = "突"; 相 = ((拍 == null ? b.t * 0.55 : 拍 * 背中の突きの速さ) + (q.seed || 0) + n * 0.17) % 1; }
        else if (s.構 && 列 < 2 && 歩速 < 14 * 尺2) 働 = "構";
        else if (撃 >= 0 && 撃 < 1 && (型 === "yumi" || 型 === "teppo")) { 働 = "放"; 相 = 撃; }
        else if (歩速 > 2.5 * 尺2) 働 = "歩";
        const 癖r = (h >>> 27) % 16;
        兵.push({ x, z, fx, fz, 側, 型, 働, 相, 歩: (s.歩距[n] / 歩幅) % 1, v: 歩速 * 尺,
          丈: 0.9 + ((h >>> 3) % 21) / 100, 幅: 0.92 + ((h >>> 9) % 17) / 100, 癖: 癖r < 8 ? 0 : 癖r < 12 ? 1 : 癖r < 15 ? 2 : 3, 鍵: h, 組: q, 番: n });
      }
    }
  }
  /* 本陣衆（〇番が将、一番が旗持、二番から馬廻。battle/shinga.js 本陣衆を見る）。盤では組から兵を借りて描くので、
     組の兵（上）には入っていない。与平が討った者（b.本陣の倒れ）と、討ち取られた将は立てない。
     組の代わりに隊を、番の代わりに百＋席の番を鍵にする（敵の状・兵を討つ の引き方に合わせる） */
  for (const c of b.corps || []) {
    if (c.dead || c.destroyed) continue;
    const 本 = 本陣衆を見る(c); if (!本) continue;
    const 側 = c.日和見 ? "Y" : (c.side === "P" ? "P" : "E"), 歩幅 = 14 * 尺2;
    for (let n = 0; n < 本.数; n++) {
      if (n === 0 && c.将討たれ) continue;
      if (b.本陣の倒れ && b.本陣の倒れ.has(`${c.id}:${n}`)) continue;
      const [x, z] = 世へ(本.x[n], 本.y[n]);
      if (Math.hypot(x - wx0, z - wz0) > R) continue;
      const [fx, fz] = 向きを世へ(本.描[n]), h = (Math.imul((n + 3) * 977, 2654435761) ^ Math.imul(String(c.id).length + 1, 40503)) >>> 0;
      兵.push({ x, z, fx, fz, 側, 型: n === 1 ? "yari" : "kiba", 働: 本.速[n] > 2.5 * 尺2 ? "歩" : "立", 相: 0, 歩: (本.歩距[n] / 歩幅) % 1,
        v: 本.速[n] * 尺, 丈: n === 0 ? 1.04 : 0.97, 幅: n === 0 ? 1.06 : 1, 癖: n === 0 ? 3 : 0, 鍵: h, 組: c, 番: 100 + n,
        本陣: { c, n }, 将: n === 0, 旗持: n === 1 });
    }
  }
  for (const e of 盤の見た目(b).倒れ) { const [x, z] = 世へ(e.x, e.y); if (Math.hypot(x - wx0, z - wz0) <= R) 倒れ.push({ x, z, 側: e.s, 鍵: 鳴(Math.round(e.x * 7), Math.round(e.y * 7)) }); }
  return { 兵, 倒れ };
}

/* ---------- 与平（自分で動かす一人） ----------
   決まりは試し版（触って動かす版）と同じ。長さは m、刻は 態.t（まことの秒。盤を止めれば止まる）。
   与平の居所は世界の座標（態.我.x・z）で持つ。盤の座標は x/尺、−z/尺 */
const 我の速さ = 2.4, 駆けの速さ = 4.8, 届き = 3.5;
/* 与平の乱数。盤の理（engine）が使う Math.random の並びを、背中越しに入ったかどうかで変えないよう、別に持つ */
function 乱を作る(種) { let a = 種 >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* 身分 … "足軽"（自分を動かす）・"物頭"（自分では動かず、預かる隊の組のうしろに立って組と一緒に動く。
   隊への下知は合戦の画面の右の欄から。ui/BattleScreen.jsx の 身分 の説明）・"見物"（ふだんの合戦で盤から
   地へ降りたとき。誰でもなく、寄った所の組のうしろから見るだけ。選びを渡す に { 隊, 組 } を渡す） */
/* 備え … 風雲モードの主人公の値 { 体力, 武勇, 一度きり }（hitori/fuun.js 風雲の一人）。渡せば、与平は
   その体力で立ち、突き合いの当たりが武勇で変わり（武勇四十五で、渡さぬときと同じ）、盤に b.一人働き
   （討ち取り・体力・討死）を書く。一度きりなら、討死ののちの「もう一度」は無い（hitori/SenakaFuda.jsx） */
export function 背中を始める(b, 隊id, 身分 = "足軽", 選びを渡す = null, 備え = null) {
  const 選 = 選びを渡す || 与平の組を選ぶ(b, 隊id);
  if (!選) return null;
  const 態 = { 身分, 隊: 選.隊, 組: 選.組, 名: 選.隊.name, cam: null, 前秒: 0, t: 0, 止: false, 備え,
    入: { jx: 0, jy: 0, 駆: false, 受: false, keys: new Set() },
    我: null, 敵: new WeakMap(), 掛かり: new Set(), 拍: 0, 知らせ: [], 知らせ番: 0, 知らせ間: 0,
    火花: [], 倒し: [], 今討った: new Set(), 手傷: null, 終: null, 動いた: false,
    乱: 乱を作る(0x5E1A ^ Math.round((b.t || 0) * 1000)) };
  与平を立て直す(b, 態);
  return 態;
}
/* 与平を組のうしろに立て直す（入ったとき。討死ののち「もう一度」のとき。勲功は新たに数える） */
export function 与平を立て直す(b, 態) {
  if (b && (!態.組 || !(態.組.men > 0))) { const 選 = 与平の組を選ぶ(b, 態.隊 && 態.隊.id); if (選) { 態.組 = 選.組; 態.隊 = 選.隊; 態.名 = 選.隊.name; } }
  const 所 = 態.組 ? 与平の所(態.組) : { x: FIELD.w / 2, y: FIELD.h / 2, 向: -Math.PI / 2 };
  const [x, z] = 世へ(所.x, 所.y), [fx, fz] = 向きを世へ(所.向);
  const 体 = 態.備え && 態.備え.体力 != null ? Math.max(1, Math.min(100, 態.備え.体力)) : 100;
  態.我 = { x, z, fx, fz, hp: 体, 気: 4.5, 勲: 0, 突始: -9, 撃: null, 受始: -9, 受: false, 打: -9,
    退x: 0, 退z: 0, 倒: null, 倒向: -1, dist: 0, v: 0, 近: false };
  態.終 = null; 態.手傷 = null; 態.cam = null; 態.掛かり.clear();
  for (const k in 態.入) if (k !== "keys") 態.入[k] = typeof 態.入[k] === "boolean" ? false : 0;
  return 態.我;
}
/* いまの与平（盤の座標と角。撮る道具・試しが覗く） */
export function 与平の今(態) {
  const 我 = 態 && 態.我; if (!我) return null;
  return { x: 我.x / 尺, y: -我.z / 尺, 向: Math.atan2(-我.fz, 我.fx), 体力: 我.hp, 気力: 我.気, 勲功: 我.勲, 討死: 我.倒 != null };
}
function 知らせ(態, 文, 副, 種) {
  態.知らせ.push({ 番: ++態.知らせ番, 文, 副: 副 || "", 種: 種 || "", ms: Date.now() });
  if (態.知らせ.length > 6) 態.知らせ.shift();
}

/* 突く（釦・鍵盤から）。〇.五秒に一度まで。気力が〇.三五に足りなければ突けない。物頭は自分では突かない */
export function 突く(態) {
  const 我 = 態 && 態.我; if (!我 || 我.倒 != null || 態.終 || 態.止 || 態.身分 === "物頭") return false;
  const t = 態.t; if (t - 我.突始 < 0.5) return false;
  if (我.気 < 0.35) { if (t >= 態.知らせ間) { 知らせ(態, "息が上がっている", "", "warn"); 態.知らせ間 = t + 1.5; } return false; }
  我.突始 = t; 我.気 -= 0.45; 我.撃 = { t: t + 0.2 };
  return true;
}
/* 受ける（押しているあいだ。軽く押しても〇.三秒は構える） */
export function 受ける(態, 押す) {
  if (!態 || !態.我 || 態.身分 === "物頭") return;
  if (押す && !態.入.受) 態.我.受始 = 態.t;
  態.入.受 = !!押す;
}

/* 前の相手：o の向き（fx, fz）の前、届きのうちでいちばん近い者（試し版と同じ形の扇） */
function 前の相手(o, fx, fz, 候) {
  let best = null, bd = 1e9;
  for (const e of 候) {
    const rx = e.x - o.x, rz = e.z - o.z, dz = rx * fx + rz * fz, dx = Math.abs(rx * fz - rz * fx);
    if (dz < 0.35 || dz > 届き + 0.1 || dx > 0.75 + 0.32 * dz) continue;
    const dd = dz * dz + dx * dx; if (dd < bd) { bd = dd; best = e; }
  }
  return best;
}
/* 敵の兵一人ごとの、与平との突き合いの覚え（掛かり・間・手傷・当たった刻）。組と持ち場の番で引く。
   持ち場の番は、前の者が倒れて後ろの者が詰めると別の者を指す（shinga.js）。覚えた所から三m より
   離れていれば別の者とみなし、覚えを捨てる。二十秒見なければ忘れる */
function 敵の状(態, p, 作る) {
  let m = 態.敵.get(p.組);
  if (!m) { if (!作る) return null; m = new Map(); 態.敵.set(p.組, m); }
  let s = m.get(p.番);
  if (s && (Math.hypot(s.x - p.x, s.z - p.z) > 3 || 態.t - s.見刻 > 20)) { m.delete(p.番); 態.掛かり.delete(s); s = null; }
  if (!s && 作る) { s = { cd: 0, 撃: null, 突始: -9, 突向: null, 打: -9, 傷: 0, x: p.x, z: p.z, 見刻: 態.t, 拍: -1, p }; m.set(p.番, s); }
  return s;
}

/* 城の盤で、与平が（元x, 元z）から（x, z）へ（世界の所）踏み出せるか。盤の組と同じ決まり（battle/field.js passableFor）：
   壁と閉じた門は通れない。籠る側は、自分の城の門を内へ向かってだけ通れる。破れた門は誰でも通れる */
export function 城で通れるか(b, 隊, 元x, 元z, x, z) {
  return passableFor({ side: 隊.side, x: 元x / 尺, y: -元z / 尺, sortie: 隊.sortie, 門の列: 隊.門の列 }, b, x / 尺, -z / 尺);
}
/* 与平を一コマ進める。眺（眺めを集める の返り値）の兵の居所で突き合う。dt はまことの秒。
   盤を止めているあいだ（態.止）は何もしない */
export function 与平を進める(b, 態, dt, 眺) {
  与平を一コマ進める(b, 態, dt, 眺);
  if (態.備え && 態.我) {
    持ち場を見る(b, 態, dt);
    b.一人働き = { 討ち取り: 態.我.勲, 体力: 態.我.hp, 討死: 態.我.倒 != null, 首: [...(態.首 || [])], 咎: 態.持ち場 ? 態.持ち場.咎 : 0 };
  }
}
/* 持ち場（風雲モード・物頭未満。遊ぶ人の申し出：「自分及び自分の部隊について、同じ所属の部隊等から離れて行動すると
   （範囲を決めてそこから出ると）上司のおぼえが低くなる（時間とともにマイナスが増えていく感じ）」）。
   持ち場は、与平の属する隊の組のいずれかから 持ち場の間 m のうち。外にいるあいだ、覚えの咎が積もる。咎の積もる
   速さは、続けて外にいる秒とともに上がる（一秒に〇.〇八から。三十秒外にいれば咎およそ四、六十秒でおよそ十二）。
   持ち場へ戻れば、続けて外にいた秒は〇に戻る（積もった咎は残る）。合戦のあとに覚えから引く（hitori/fuun.js） */
export const 持ち場の間 = 40;
export const 咎の目 = (秒) => 0.08 * 秒 + 0.002 * 秒 * 秒;
function 持ち場を見る(b, 態, dt) {
  const 我 = 態.我;
  const 場 = 態.持ち場 || (態.持ち場 = { 内: true, 咎: 0, 離れ秒: 0, 咎の始め: 0 });
  if (態.身分 !== "足軽" || 我.倒 != null || 態.止 || !(dt > 0)) return;
  const 隊 = 態.隊; if (!隊 || 隊.dead || 隊.destroyed) { 場.内 = true; return; }
  const bx = 我.x / 尺, by = -我.z / 尺;
  let 近 = 1e9;
  for (const q of 隊.squads || []) { if (!(q.men > 0)) continue; const d = Math.hypot(q.x - bx, q.y - by) * 尺; if (d < 近) 近 = d; }
  const 内 = 近 <= 持ち場の間;
  if (内) { if (!場.内) { 場.咎の始め = 場.咎; } 場.離れ秒 = 0; }
  else {
    if (場.内) 場.咎の始め = 場.咎;
    場.離れ秒 += dt;
    場.咎 = 場.咎の始め + 咎の目(場.離れ秒);
  }
  場.内 = 内; 場.間 = 近;
}

/* 武勇で変わる突き合いの当たり（武勇四十五で、これまでの 八割八分・三割五分・四割五分 と同じ） */
const 勇の差 = (態) => (態.備え && 態.備え.武勇 != null ? 態.備え.武勇 : 45) - 45;
const 限り = (v, a, b2) => Math.min(b2, Math.max(a, v));
function 与平を一コマ進める(b, 態, dt, 眺) {
  const 我 = 態.我;
  態.今討った.clear();
  if (!我 || 態.止 || !(dt > 0)) return;
  態.t += dt; 態.拍++;
  const t = 態.t, 入 = 態.入, r = 態.乱;
  const 敵ら = 眺.兵.filter((p) => p.側 === "E");
  /* ---- 動く（方向キーの上は写しの奥、右は右） ---- */
  if (我.倒 == null) {
    let jx = 入.jx, jy = 入.jy;
    const kx = (入.keys.has("r") ? 1 : 0) - (入.keys.has("l") ? 1 : 0), ky = (入.keys.has("d") ? 1 : 0) - (入.keys.has("u") ? 1 : 0);
    if (kx || ky) { const L = Math.hypot(kx, ky); jx = kx / L; jy = ky / L; }
    const m = Math.hypot(jx, jy), 有 = m > 0.12;
    if (有) 態.動いた = true;
    const 駆 = 入.駆 && 我.気 > 0.15 && 有;
    const sp = (駆 ? 駆けの速さ : 我の速さ) * (有 ? Math.min(1, (m - 0.12) / 0.6) : 0);
    const a = 態.cam ? 態.cam.a : Math.atan2(我.fz, 我.fx), cfx = Math.cos(a), cfz = Math.sin(a);
    const ux = 有 ? jx / m : 0, uy = 有 ? jy / m : 0;
    let vx = (cfz * ux - cfx * uy) * sp, vz = (-cfx * ux - cfz * uy) * sp;
    vx += 我.退x; vz += 我.退z; const 減 = Math.exp(-dt * 8); 我.退x *= 減; 我.退z *= 減;
    我.x += vx * dt; 我.z += vz * dt;
    /* 城の盤では、壁と閉じた門を通り抜けない（盤の組と同じ決まり。籠る側は自分の城の門を内へは通れる：
       battle/field.js passableFor）。抜けられなければ、壁に沿って滑らせ、それも無理なら留まる */
    if (b.map && 態.隊) {
      const 元x = 我.x - vx * dt, 元z = 我.z - vz * dt;
      const 通れる = (x, z) => 城で通れるか(b, 態.隊, 元x, 元z, x, z);
      if (!通れる(我.x, 我.z)) {
        if (通れる(我.x, 元z)) 我.z = 元z; else if (通れる(元x, 我.z)) 我.x = 元x; else { 我.x = 元x; 我.z = 元z; }
      }
    }
    /* 敵の兵とは重ならない（〇.七m より内へは入らない）。味方の列は割って通れる */
    for (const e of 敵ら) { const dx = 我.x - e.x, dz = 我.z - e.z, d = Math.hypot(dx, dz); if (d < 0.7 && d > 1e-4) { 我.x = e.x + dx / d * 0.7; 我.z = e.z + dz / d * 0.7; } }
    /* 野の外へは出ない */
    我.x = clamp(我.x, 1, FIELD.w * 尺 - 1); 我.z = clamp(我.z, -FIELD.h * 尺 + 1, -1);
    我.v = Math.hypot(vx, vz); 我.dist += 我.v * dt * (駆 ? 0.7 : 1);
    if (駆) 我.気 = Math.max(0, 我.気 - 1.15 * dt); else if (t - 我.突始 > 0.6) 我.気 = Math.min(5, 我.気 + 0.5 * dt);
    /* 向き：八m のうちのいちばん近い敵を向く。いなければ歩む向き（止まっていれば、そのまま） */
    let 近 = null, nd = 64;
    for (const e of 敵ら) { const dd = (e.x - 我.x) ** 2 + (e.z - 我.z) ** 2; if (dd < nd) { nd = dd; 近 = e; } }
    let tx = 0, tz = 0;
    if (近) { tx = 近.x - 我.x; tz = 近.z - 我.z; } else if (有 && sp > 0.05) { tx = vx; tz = vz; }
    const L = Math.hypot(tx, tz); if (L > 1e-4) { 我.fx = tx / L; 我.fz = tz / L; }
    我.近 = !!近;
    我.受 = 入.受 || t - 我.受始 < 0.3;
  }
  /* ---- 敵の兵が掛かる（八m のうちのいちばん近い二人。試し版と同じ：槍を引き、〇.五五秒ののちに突く） ----
     敵の兵は盤の向き（描）の筋で突く。与平がうしろにいれば振り返る。筋から横へ外れていれば突かない。
     掛かるのは槍と騎馬の兵だけ（鉄砲・弓の兵には、槍を引く・穂先が光るといった前触れの姿がまだ無いので、
     前触れなしに手傷を負わせないよう掛からせない） */
  const 近敵 = [];
  for (const p of 敵ら) { const d = Math.hypot(p.x - 我.x, p.z - 我.z); if (d < 8) 近敵.push({ p, d }); }
  近敵.sort((a2, z2) => a2.d - z2.d);
  for (const { p } of 近敵) { const s = 敵の状(態, p, true); s.x = p.x; s.z = p.z; s.見刻 = t; s.拍 = 態.拍; s.p = p; }
  const 筋 = (p) => { const sg = (我.x - p.x) * p.fx + (我.z - p.z) * p.fz >= 0 ? 1 : -1; return [p.fx * sg, p.fz * sg]; };
  const 扇の内 = (p, ax, az, 前0, 前1, 横0, 横k) => { const rx = 我.x - p.x, rz = 我.z - p.z, dz = rx * ax + rz * az, dx = Math.abs(rx * az - rz * ax);
    return dz >= 前0 && dz <= 前1 && dx <= 横0 + 横k * dz; };
  if (我.倒 == null) for (const { p } of 近敵.filter((o) => o.p.型 === "yari" || o.p.型 === "kiba").slice(0, 2)) {
    const s = 敵の状(態, p, true);
    if (s.撃 || t < s.cd) continue;
    const [ax, az] = 筋(p);
    if (!扇の内(p, ax, az, 0.35, 届き + 0.1, 0.75, 0.32)) { s.cd = t + 0.3; continue; }
    s.撃 = { 溜始: t, t: t + 0.55, 筋: [ax, az] }; s.cd = t + 1.8 + r() * 1.2; 態.掛かり.add(s);
  }
  for (const s of 態.掛かり) {
    const 撃 = s.撃;
    if (!撃 || s.拍 !== 態.拍) { s.撃 = null; 態.掛かり.delete(s); continue; }      // 倒れたか、八m より遠のいた
    if (s.突始 < 撃.溜始 && t >= 撃.t - 0.2) {                                      // 突き出す（向きはここで定まる）
      s.突始 = t; const dx = 我.x - s.p.x, dz = 我.z - s.p.z, L2 = Math.hypot(dx, dz) || 1; s.突向 = [dx / L2, dz / L2]; }
    if (t < 撃.t) continue;
    s.撃 = null; 態.掛かり.delete(s);
    if (我.倒 != null) continue;
    const p = s.p, [ax, az] = 撃.筋;
    if (!扇の内(p, ax, az, 0.3, 届き + 0.4, 0.9, 0.35)) continue;                    // 外れた（退いた・かわした）
    if (我.受) { 態.火花.push({ t, x: 我.x + 我.fx * 1.2 - 我.fz * 0.3, y: 1.75, z: 我.z + 我.fz * 1.2 + 我.fx * 0.3 }); 我.気 = Math.max(0, 我.気 - 0.3); continue; }
    if (r() < 限り(0.45 - 勇の差(態) * 0.003, 0.25, 0.6)) {
      const dmg = 8 + Math.round(r() * 5); 我.hp = Math.max(0, 我.hp - dmg); 我.打 = t; 態.手傷 = t;
      const rx = 我.x - p.x, rz = 我.z - p.z, d2 = Math.hypot(rx, rz) || 1; 我.退x = rx / d2 * 2.2; 我.退z = rz / d2 * 2.2;
      if (我.hp <= 0) { 我.倒 = t; 我.倒向 = -1; 我.撃 = null; 態.終 = { t: t + 1.6, 種: "討死" }; }
    }
  }
  /* ---- 与平の突き（突いて〇.二秒ののちに届く。八割八分で当たり、三割五分は会心） ----
     敵の兵は二突き（会心なら一突き）で倒れる。倒せば、つなぎで組の人数をちょうど一人減らす */
  if (我.撃 && t >= 我.撃.t) {
    我.撃 = null;
    const e = 我.倒 == null ? 前の相手(我, 我.fx, 我.fz, 敵ら) : null;
    if (e && r() < 限り(0.88 + 勇の差(態) * 0.002, 0.7, 0.97)) {
      const 会心 = r() < 限り(0.35 + 勇の差(態) * 0.004, 0.2, 0.6), s = 敵の状(態, e, true);
      /* 本陣衆（将・旗持・馬廻）：将は三太刀（会心は二太刀に数える）、旗持と馬廻は兵と同じ二太刀 */
      if (e.本陣 && (会心 ? 2 : 1) >= (e.将 ? 3 : 2) - s.傷) {
        const 武勇 = (態.隊 && 態.隊.gen && 態.隊.gen.valor) || 60, c = e.本陣.c;
        const 組 = (c.squads || []).filter((q) => q.men > 0).sort((a, z) => Math.hypot(a.x - e.x / 尺, a.y + e.z / 尺) - Math.hypot(z.x - e.x / 尺, z.y + e.z / 尺))[0];
        const 首 = e.将 ? 将を討つ(b, c, { 名: (態.備え && 態.備え.名) || "与平" }) : null;
        if (首 || (組 && 兵を討つ(b, 組, null, { 隊: 態.隊, 組: 態.組, 武勇 }))) {
          (b.本陣の倒れ || (b.本陣の倒れ = new Set())).add(`${c.id}:${e.本陣.n}`);
          我.勲 += 1; 態.今討った.add(e);
          態.倒し.push({ p: e, t, 向: r() < 0.5 ? -1 : 1, 跡: null }); if (態.倒し.length > 400) 態.倒し.shift();
          const m = 態.敵.get(e.組); if (m) m.delete(e.番); 態.掛かり.delete(s);
          if (首) {
            /* 抜け駆け … 持ち場の外で取った首。山賊 … 主命の山賊退治の頭（大将首に数えない。hitori/fuun.js 首の値） */
            首.抜け駆け = !!(態.持ち場 && !態.持ち場.内); 首.山賊 = !!c.山賊;
            (態.首 || (態.首 = [])).push(首);
            const 値 = 態.備え && 態.備え.首の勲功 && !首.山賊 ? (首.総大将 ? 態.備え.首の勲功.総大将 : 態.備え.首の勲功.大将) : 0;
            知らせ(態, 首.山賊 ? "山賊の頭を討ち取った" : 首.総大将 ? "総大将の首を取った" : "大将首を取った", 首.山賊 ? "" : `${首.名}${値 ? `　勲功 +${値}` : ""}`, "kubi");
          }
          else 知らせ(態, "討ち取り", "勲功 +1");
        }
      } else if (e.本陣) { s.傷 += 1; s.打 = t; }
      else if ((会心 ? 2 : 1) >= 2 - s.傷) {
        const v = 組の見た目(e.組), 跡 = v && v.初 ? 世へ(v.sx[e.番], v.sy[e.番]) : null;   // 盤の倒れは揺らぎを除いた持ち場に残る
        const 武勇 = (態.隊 && 態.隊.gen && 態.隊.gen.valor) || 60;                   // ふだんの損害と同じく、隊の将の武勇
        if (兵を討つ(b, e.組, e.番, { 隊: 態.隊, 組: 態.組, 武勇 })) {
          我.勲 += 1; 態.今討った.add(e);
          態.倒し.push({ p: e, t, 向: r() < 0.5 ? -1 : 1, 跡 }); if (態.倒し.length > 400) 態.倒し.shift();
          const m = 態.敵.get(e.組); if (m) m.delete(e.番); 態.掛かり.delete(s);
          知らせ(態, "討ち取り", "勲功 +1");
        }
      } else { s.傷 += 1; s.打 = t; }
    }
  }
}

/* 物頭を一コマ据える。物頭は自分では動かない。預かる隊の組（敵にいちばん近い組。倒れれば選び直す）の
   うしろ（与平の所）に立ち、組の向きを向いて、組と一緒に歩む。突き合いもしない（体力も無い）。
   刻（態.t）だけは、まわりの兵の突きの拍子のために、与平と同じく実際の秒で進める */
export function 物頭を据える(b, 態, dt) {
  const 我 = 態.我; if (!我) return;
  態.今討った.clear();
  if (態.止 || !(dt > 0)) return;
  態.t += dt; 態.拍++;
  if (!態.組 || !(態.組.men > 0) || !(態.隊.squads || []).includes(態.組)) {
    const 選 = 態.身分 === "見物" ? 寄った所の組(b, 我.x / 尺, -我.z / 尺) : 与平の組を選ぶ(b, 態.隊 && 態.隊.id);
    if (選) { 態.組 = 選.組; 態.隊 = 選.隊; 態.名 = 選.隊.name; }
  }
  const 所 = 与平の所(態.組), [x, z] = 世へ(所.x, 所.y), [fx, fz] = 向きを世へ(所.向);
  const 歩 = Math.hypot(x - 我.x, z - 我.z);
  我.v = 歩 / dt; 我.dist += 歩; 我.x = x; 我.z = z; 我.fx = fx; 我.fz = fz;
  const s = 組の見た目(態.組); 我.近 = !!(s && (s.噛 || s.構));
}

/* 与平の姿（描くための形）。物頭は兜を被り（被り物の癖 三）、自分では突かない */
function 与平の姿(態, t) {
  const 我 = 態.我, k = (t - 我.突始) / 0.4, 倒 = 我.倒 != null;
  const 伸 = !倒 && k >= 0 && k <= 1 ? Math.pow(Math.sin(Math.PI * k), 0.7) : 0;
  return { x: 我.x, z: 我.z, fx: 我.fx, fz: 我.fz, 側: "P", 型: "yari",
    働: 倒 ? "立" : 我.近 || 伸 > 0 ? "構" : 我.v > 0.6 ? "歩" : "立", 相: 0, 伸,
    受: !倒 && 我.受, fl: Math.max(0, 1 - (t - 我.打) / 0.22), fu: 倒 ? clamp((t - 我.倒) / 0.55, 0, 1) : 0, 倒向: 我.倒向,
    歩: (我.dist / 1.5) % 1, v: 我.v, 丈: 1.02, 幅: 1.02, 癖: 態.身分 === "物頭" ? 3 : 0, 鍵: 7, 我: true };
}
/* 与平と突き合っている敵の兵の姿（掛かりの溜め・突き・当たったときの閃き）。そうでなければ盤の姿のまま */
function 敵の姿(態, p, t) {
  const m = 態.敵.get(p.組), s = m && m.get(p.番);
  if (!s || s.拍 !== 態.拍) return p;
  const 撃 = s.撃, k = (t - s.突始) / 0.4, 突中 = k >= 0 && k <= 1, fl = Math.max(0, 1 - (t - s.打) / 0.22);
  if (!撃 && !突中 && fl <= 0) return p;
  const o = { ...p, fl };
  if (撃 || 突中) {
    if (突中 && s.突向) { o.fx = s.突向[0]; o.fz = s.突向[1]; }
    else { const dx = 態.我.x - p.x, dz = 態.我.z - p.z, L = Math.hypot(dx, dz) || 1; o.fx = dx / L; o.fz = dz / L; }
    o.働 = "突";
    let e = 突中 ? Math.pow(Math.sin(Math.PI * k), 0.7) : 0;
    if (撃) { const w = clamp((t - 撃.溜始) / 0.35, 0, 1); if (e === 0) e = -0.35 * sm(w); o.光 = w; }
    o.伸 = e;
  }
  return o;
}

/* 写し（カメラ）。与平の後ろ上から、組の向きに合わせて見る（右の肩越し） */
const 引き = 5.0, 高 = 3.3, 俯 = 13 * Math.PI / 180, 肩 = 0.85;
let C = null, W = 0, H = 0, F = 0;
/* 写しを据える。cam … { x, z（目の真下の地の所）, a（向き）, h（目の高さ）, 俯（俯く角） }。
   背中越しでは h＝高・俯＝俯。盤から降りてくるあいだ（降りの写し）は、高く・深く俯いた所から始まる */
function 写しを据える(cam, w, h) {
  W = w; H = h; F = w * 0.6;
  const fx = Math.cos(cam.a), fz = Math.sin(cam.a), 角 = cam.俯 == null ? 俯 : cam.俯;
  C = { x: cam.x, z: cam.z, fx, fz, rx: fz, rz: -fx, cs: Math.cos(角), sn: Math.sin(角), tn: Math.tan(角), h: cam.h == null ? 高 : cam.h,
    地色: cam.地色 || null, 混ぜ: cam.混ぜ || 0 };
}
function P(x, y, z) {
  const dx = x - C.x, dz = z - C.z; const rx = dx * C.rx + dz * C.rz, rz = dx * C.fx + dz * C.fz, ry = y - C.h;
  const yc = ry * C.cs + rz * C.sn, zc = -ry * C.sn + rz * C.cs;
  return [W / 2 + F * rx / zc, H / 2 - F * yc / zc, zc];
}
const 奥 = (x, z) => (x - C.x) * C.fx + (z - C.z) * C.fz;            // カメラの前へどれだけ奥か（m）
const 水平 = () => H / 2 - F * C.tn;

/* ---------- 盤から背中越しへ降りる写し ----------
   遊ぶ人の申し出：「ピンチイン、アウトでスムーズに一人称視点までいけるようにしたい」。盤をいちばん
   寄せたところ（盤の真ん中の点を、盤と同じ大きさ・同じ向き・同じ傾きで見る写し）から、背中越しの写し
   （肩の写し）まで、降り.u（〇〜一）につれてなめらかに移す。
     盤の写し（u＝〇）：盤の真ん中の点 Q を、距 D＝F×尺÷盤の倍（真ん中で盤と同じ大きさ）、俯き＝盤の傾き
                       （斜めの眺めの縦の縮み＝俯きの sin。真上なら六十五度で止める）、向き＝盤の上の方角で見る
     肩の写し（u＝一）：与平の背中越し（目の高さ 高・俯き 俯）。その真ん中の目線が地に届く点と距で表す
   点・距（対数で）・俯きは u をなめらかにした値で、向きは u の〇.一五〜〇.八五のあいだで回す */
export function 降りの写し(肩の写し, 降り, w) {
  const u = clamp(降り.u, 0, 1), v = sm(u), 盤 = 降り.盤, Fw = w * 0.6;
  const [qbx, qbz] = 世へ(盤.x, 盤.y);
  const Db = Fw * 尺 / Math.max(0.05, 盤.s);
  const θb = Math.min(65 * Math.PI / 180, Math.asin(clamp(盤.傾き || 1, 0.2, 1)));
  const ab = Math.PI / 2 + (盤.向き || 0) * Math.PI / 2;
  const θs = 肩の写し.俯 == null ? 俯 : 肩の写し.俯, hs = 肩の写し.h == null ? 高 : 肩の写し.h;
  const fsx = Math.cos(肩の写し.a), fsz = Math.sin(肩の写し.a);
  const Ds = hs / Math.sin(θs), qsx = 肩の写し.x + fsx * hs / Math.tan(θs), qsz = 肩の写し.z + fsz * hs / Math.tan(θs);
  let da = 肩の写し.a - ab; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
  const a = ab + da * sm((u - 0.15) / 0.7);
  const θ = lerp(θb, θs, v), D = Math.exp(lerp(Math.log(Db), Math.log(Ds), v));
  const qx = lerp(qbx, qsx, v), qz = lerp(qbz, qsz, v), fx = Math.cos(a), fz = Math.sin(a);
  /* 地の色：高いところ（盤に近いところ）では、降り始めに盤から写し取った地の色（盤.地色）に寄せ、降りるにつれて
     背中越しの地の色へ移す（盤の明るい緑と、背中越しの草色が、重ね始めにずれて見えぬように） */
  return { x: qx - fx * D * Math.cos(θ), z: qz - fz * D * Math.cos(θ), a, h: D * Math.sin(θ), 俯: θ, 焦点: [qx, qz], 距: D,
    地色: 盤.地色 || null, 混ぜ: 盤.地色 ? 1 - v : 0 };
}

/* 寄った所の組：盤の点 (x, y) にいちばん近い、立っている組（敵味方・去就の定まらぬ隊を問わない）。
   ふだんの合戦で盤から地へ降りたとき（見物）、その組のうしろから見る */
export function 寄った所の組(b, x, y) {
  let 出 = null, m = 1e18;
  for (const c of b.corps || []) {
    if (c.dead || c.destroyed) continue;
    for (const q of c.squads || []) { if (!(q.men > 0)) continue; const d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < m) { m = d; 出 = { 隊: c, 組: q }; } }
  }
  return 出;
}
const 霞色 = [198, 202, 200];
function 霞(rgb, d, k = 90) { const t = 1 - Math.exp(-Math.max(0, d - 6) / k); return `rgb(${Math.round(rgb[0] + (霞色[0] - rgb[0]) * t)},${Math.round(rgb[1] + (霞色[1] - rgb[1]) * t)},${Math.round(rgb[2] + (霞色[2] - rgb[2]) * t)})`; }
const 色 = {
  P: { 縅: [56, 96, 156], 布: [42, 52, 76], 旗: [40, 72, 130] },
  E: { 縅: [176, 72, 58], 布: [76, 56, 46], 旗: [178, 64, 50] },
  Y: { 縅: [196, 160, 62], 布: [92, 80, 50], 旗: [200, 168, 70] },
};

/* 背中越しに一コマ描く。止 … 盤を止めているか（止めているあいだは与平も敵の掛かりも止まる） */
/* 止 … 盤が止まっているか（止まっているあいだは与平も敵の掛かりも止まる）。
   降り … 盤から降りてくる途中なら { u（〇〜一）, 盤: { x, y, s, 向き, 傾き } }（上の 降りの写し）。
          途中（u＜一）は、与平も敵の掛かりも止め、写しは盤の写しと肩の写しのあいだに置く */
export function 背中を描く(ctx, b, 態, w, h, dpr, nowSec, 止 = false, 降り = null) {
  const 見物 = 態.身分 === "見物", 途中 = !!(降り && 降り.u < 1);
  if (!見物 && (!態.組 || !(態.組.men > 0))) { const 選 = 与平の組を選ぶ(b, 態.隊 && 態.隊.id); if (選) { 態.組 = 選.組; 態.隊 = 選.隊; 態.名 = 選.隊.name; } }
  const q = 態.組, 我 = 態.我;
  const dt = 態.前秒 ? clamp(nowSec - 態.前秒, 0, 0.1) : 0; 態.前秒 = nowSec;
  /* カメラ：与平の後ろ上から、組の向きに合わせて見る（右の肩越し）。なめらかに寄せる（揺らさない）。向きも角で均す。
     降りてくる途中は、この肩の写しと盤の写しのあいだに置く（降りの写し） */
  const qv = q && 組の見た目(q), 基 = qv && qv.初 ? qv.向 : q ? (q.facing || 0) : -Math.PI / 2;
  const [cfx, cfz] = 向きを世へ(基);
  const 的 = { x: 我.x - cfx * 引き + cfz * 肩, z: 我.z - cfz * 引き - cfx * 肩, a: Math.atan2(cfz, cfx) };
  if (!態.cam) 態.cam = { x: 的.x, z: 的.z, a: 的.a };
  else { const k = 1 - Math.exp(-dt * 6); 態.cam.x += (的.x - 態.cam.x) * k; 態.cam.z += (的.z - 態.cam.z) * k;
    let da = 的.a - 態.cam.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; 態.cam.a += da * (1 - Math.exp(-dt * 2.5)); }
  const 写 = 途中 ? 降りの写し({ x: 態.cam.x, z: 態.cam.z, a: 態.cam.a }, 降り, w) : { x: 態.cam.x, z: 態.cam.z, a: 態.cam.a, h: 高, 俯 };
  /* 見る所（眺めを集める・見た目を進める）の芯と広さ。背中越しでは与平のまわり百十m、降りてくる途中は
     目線が地に届く点のまわり（高いほど広く） */
  const 芯 = 途中 ? { x: 写.焦点[0] / 尺, y: -写.焦点[1] / 尺 } : { x: 我.x / 尺, y: -我.z / 尺 };
  const 広さ = 途中 ? Math.max(110, 写.距 * 2.2) : 110;
  const R歩 = Math.max(300, 広さ / 尺 + 60);
  新絵状態を進める(b, nowSec, { x0: 芯.x - R歩, x1: 芯.x + R歩, y0: 芯.y - R歩, y1: 芯.y + R歩 });
  const 眺 = 眺めを集める(b, 芯, 広さ, 態.t);                 // 突きの拍子は与平の刻（まことの秒）で刻む
  態.止 = !!止 || 途中;
  if (態.身分 === "物頭" || 見物) 物頭を据える(b, 態, dt); else 与平を進める(b, 態, dt, 眺);
  const t = 態.t;
  筆 = ctx; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  写しを据える(写, w, h);
  空と地を描く(ctx, 写.a);
  草を描く(ctx);
  帯を描く(ctx, 野の川筋(), [92, 132, 160], 0.62);
  帯を描く(ctx, ROADS, [172, 152, 116], 1);
  /* 城攻め・籠城の盤なら、堀と橋を地に敷く（水堀は水の色、空堀は土の色） */
  const 城 = b.map || null;
  if (城) { const 堀 = 堀の帯(城); 帯を描く(ctx, 堀.堀, 堀.空堀 ? [128, 108, 80] : [74, 104, 124], 0.92); 帯を描く(ctx, 堀.橋, [150, 124, 88], 1); }
  /* 立つもの（木・兵・倒れた者・与平、城の造作）を奥から描く */
  const 物 = [];
  木を集める(物);
  let 城の前 = 0;                                            // 写しと与平のあいだに立つ造作の数（与平を上から透かして描き直す）
  if (城) {
    const [hx, , hz] = P(我.x, 0, 我.z), 我d = 奥(我.x, 我.z), 我の幅 = 0.5 * F / Math.max(0.5, hz);
    for (const o of 城の物(城)) {
      const [wx, wz] = 世へ(o.x, o.y), d = 奥(wx, wz);
      if (d < -25 || d > 260 || Math.hypot(wx - C.x, wz - C.z) > 280) continue;
      物.push({ d, f: () => 城の物を描く(ctx, o, d) });
      if (!見物 && !途中 && d < 我d - 0.5 && hz > 0) {
        const r = o.部品[0].r, xs = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]].map(([bx, by]) => { const [wx2, wz2] = 世へ(bx, by); return 奥(wx2, wz2) > 近 ? P(wx2, 0, wz2)[0] : null; });
        if (xs.every((v) => v != null) && Math.min(...xs) < hx + 我の幅 && Math.max(...xs) > hx - 我の幅) 城の前++;
      }
    }
  }
  const [psx, , pzc] = P(我.x, 0, 我.z), 我幅 = 0.5 * F / Math.max(0.5, pzc);
  const 上限 = 途中 ? 2600 : 1500;                            // 高いところからは多く見える
  let 兵ら = 眺.兵.filter((p) => !態.今討った.has(p)).map((p) => ({ p, d: 奥(p.x, p.z) })).filter((o) => o.d > 0.8);
  if (兵ら.length > 上限) { 兵ら.sort((a, z) => a.d - z.d); 兵ら = 兵ら.slice(0, 上限); }
  let 透数 = 0;
  for (const { p, d } of 兵ら) {
    const [sx, , zc] = P(p.x, 0, p.z); if (sx < -200 || sx > W + 200) continue;
    const 透 = !見物 && !途中 && d < pzc - 0.3 && Math.abs(sx - psx) < 0.42 * F / zc + 我幅;
    if (透) 透数++;
    const 姿 = p.側 === "E" ? 敵の姿(態, p, t) : p;
    物.push({ d, f: () => 一人を描く(ctx, 姿, nowSec, 透 ? 0.32 : 1) });
  }
  /* 倒れた者。与平が倒した者は倒れる姿のまま描くので、盤の倒れ（揺らぎを除いた持ち場に残る）からは除く */
  const 跡ら = 態.倒し.filter((o) => o.跡);
  for (const e of 眺.倒れ) {
    if (跡ら.some((o) => Math.abs(o.跡[0] - e.x) < 0.45 && Math.abs(o.跡[1] - e.z) < 0.45)) continue;
    const d = 奥(e.x, e.z); if (d > 0.8) 物.push({ d, f: () => 倒れを描く(ctx, e) });
  }
  for (const o of 態.倒し) { const d = 奥(o.p.x, o.p.z); if (d > 0.8 && d < 130) 物.push({ d, f: () => 一人を描く(ctx, { ...o.p, 働: "立", v: 0, fl: 0, fu: clamp((t - o.t) / 0.55, 0, 1), 倒向: o.向 }, nowSec, 1) }); }
  if (!見物) 物.push({ d: 奥(我.x, 我.z), f: () => { if (我.倒 == null) 輪(ctx, 我.x, 我.z, 0.55, 0.55); 一人を描く(ctx, 与平の姿(態, t), nowSec, 1); } });
  物.sort((a, z) => z.d - a.d).forEach((o) => o.f());
  /* 与平が組の中へ入ると、手前（写し側）の味方が与平に重なる。手前の味方を透かすだけでは、幾重にも
     重なって与平が見えなくなるので、そのときは与平（と足もとの輪）を上からもう一度、少し透かして描く */
  if ((透数 || 城の前) && !見物) { if (我.倒 == null) 輪(ctx, 我.x, 我.z, 0.55, 0.55); 一人を描く(ctx, 与平の姿(態, t), nowSec, 0.72); }
  /* 受けたときの火花 */
  態.火花 = 態.火花.filter((f) => t - f.t < 0.3);
  for (const f of 態.火花) 火花を描く(ctx, f.x, f.y, f.z, (t - f.t) / 0.28);
  霞の帯(ctx);
  /* 手傷を負えば、画面の縁が赤く染まる（〇.六秒で引く） */
  if (態.手傷 != null && t - 態.手傷 < 0.6) 手傷を描く(ctx, 0.85 * (1 - (t - 態.手傷) / 0.6));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { 兵: 眺.兵.length, 倒れ: 眺.倒れ.length, 描いた: 兵ら.length };
}
function 火花を描く(ctx, x, y, z, k) {
  const [sx, sy, zc] = P(x, y, z); if (zc < 0.5) return; const s = F / zc;
  ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = "#FFF1C4"; ctx.lineCap = "round";
  for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, r0 = (0.05 + k * 0.1) * s, r1 = (0.18 + k * 0.42) * s; ctx.lineWidth = Math.max(1, 0.025 * s * (1 - k));
    ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0); ctx.lineTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1); ctx.stroke(); }
  ctx.restore();
}
function 手傷を描く(ctx, a) {
  const cx = W / 2, cy = H * 0.52, R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0.42, "rgba(170,30,22,0)"); g.addColorStop(1, "rgba(170,30,22,.85)");
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

/* ---------- 空・地・草・帯（街道と川）・木 ---------- */
function 空と地を描く(ctx, a) {
  const hz = 水平();
  const gr = ctx.createLinearGradient(0, 0, 0, hz + 10); gr.addColorStop(0, "#97A3AA"); gr.addColorStop(0.65, "#C0C6C6"); gr.addColorStop(1, "#D2D5D0");
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, hz + 12);
  /* 遠山は向きにつれて横へ流れる（一回りで元へ戻る形） */
  const 山 = (amp, col, 周, ph) => { ctx.beginPath(); ctx.moveTo(0, hz + 2); const off = a * F * 0.9;
    for (let x = 0; x <= W + 8; x += 8) { const u = (x + off) / 周; ctx.lineTo(x, hz - amp * (0.5 + 0.5 * Math.sin(u * 0.8 + ph)) * (0.55 + 0.45 * Math.sin(u * 0.33 + ph * 2))); }
    ctx.lineTo(W, hz + 2); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
  山(46, "rgba(118,130,138,.55)", 70, 1.3); 山(24, "rgba(100,114,116,.72)", 52, 0.4);
  /* 地。盤から降りてくる途中は、盤の地の色（C.地色）に C.混ぜ だけ寄せる */
  const 寄せ = (rgb) => { if (!C.地色 || !(C.混ぜ > 0)) return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`; const k = C.混ぜ;
    return `rgb(${Math.round(rgb[0] + (C.地色[0] - rgb[0]) * k)},${Math.round(rgb[1] + (C.地色[1] - rgb[1]) * k)},${Math.round(rgb[2] + (C.地色[2] - rgb[2]) * k)})`; };
  const gg = ctx.createLinearGradient(0, hz, 0, H); gg.addColorStop(0, 寄せ([167, 173, 149])); gg.addColorStop(0.2, 寄せ([140, 150, 104])); gg.addColorStop(1, 寄せ([106, 106, 67]));
  ctx.fillStyle = gg; ctx.fillRect(0, hz, W, H - hz);
}
/* 草：地の升目ごとに一本（升目の番から決めるので、カメラが動いても地に据わったまま） */
const 草色 = [[186, 176, 98], [120, 138, 76], [90, 102, 58]];
function 草を描く(ctx) {
  const 帯 = [[0.55, 15], [1.8, 42], [5.5, 120]];
  const 束 = [[], [], []];
  let 下 = 0;
  for (const [升, 遠] of 帯) {
    const i0 = Math.floor((C.x - 遠) / 升), i1 = Math.floor((C.x + 遠) / 升), j0 = Math.floor((C.z - 遠) / 升), j1 = Math.floor((C.z + 遠) / 升);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const h = 鳴(i * 7919 + 下, j * 104729); const x = (i + (h & 1023) / 1024) * 升, z = (j + ((h >>> 10) & 1023) / 1024) * 升;
      const d = 奥(x, z); if (d < Math.max(0.6, 下) || d > 遠) continue;
      const [sx, sy, zc] = P(x, 0, z); if (sy > H + 4 || sx < -20 || sx > W + 20) continue;
      const hh = (0.14 + ((h >>> 20) & 255) / 255 * 0.3) * F / zc, lean = (((h >>> 28) & 15) / 15 - 0.5) * hh * 0.5;
      束[(h >>> 13) % 3].push(sx, sy, sx + lean, sy - hh, d);
    }
    下 = 遠 * 0.92;
  }
  ctx.lineCap = "butt";
  for (let c = 0; c < 3; c++) { const s = 束[c];
    for (const [d0, d1] of [[0, 8], [8, 20], [20, 45], [45, 130]]) {
      ctx.beginPath(); let n = 0;
      for (let i = 0; i < s.length; i += 5) { const d = s[i + 4]; if (d < d0 || d >= d1) continue; ctx.moveTo(s[i], s[i + 1]); ctx.lineTo(s[i + 2], s[i + 3]); n++; }
      if (!n) continue; const mid = (d0 + d1) / 2; ctx.strokeStyle = 霞(草色[c], mid, 60); ctx.lineWidth = Math.max(0.6, 2.6 / Math.sqrt(Math.max(1, mid))); ctx.stroke(); } }
}
/* 街道・川：折れ線を短く刻んで、カメラの前にある切れだけを地に塗る */
function 帯を描く(ctx, 帯ら, rgb, 濃) {
  for (const r of 帯ら || []) {
    const 節 = r.節 || []; if (節.length < 2) continue;
    const 半 = (r.幅 || 40) * 尺 / 2;
    ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${濃})`;
    for (let i = 0; i < 節.length - 1; i++) {
      const p0 = 節[i], p1 = 節[i + 1]; const ax = (p0[0] ?? p0.x) * 尺, az = -(p0[1] ?? p0.y) * 尺, bx = (p1[0] ?? p1.x) * 尺, bz = -(p1[1] ?? p1.y) * 尺;
      const L = Math.hypot(bx - ax, bz - az); if (!L) continue;
      if (Math.min(Math.hypot(ax - C.x, az - C.z), Math.hypot(bx - C.x, bz - C.z)) > 220 + L) continue;
      const nx = -(bz - az) / L * 半, nz = (bx - ax) / L * 半, 刻 = Math.max(1, Math.ceil(L / 3));
      ctx.beginPath(); let 有 = false;
      for (let k = 0; k < 刻; k++) {
        const u0 = k / 刻, u1 = (k + 1) / 刻; const x0 = lerp(ax, bx, u0), z0 = lerp(az, bz, u0), x1 = lerp(ax, bx, u1), z1 = lerp(az, bz, u1);
        const 角 = [[x0 + nx, z0 + nz], [x1 + nx, z1 + nz], [x1 - nx, z1 - nz], [x0 - nx, z0 - nz]];
        if (角.some(([x, z]) => 奥(x, z) < 0.6) || 角.every(([x, z]) => 奥(x, z) > 200)) continue;
        const pts = 角.map(([x, z]) => P(x, 0, z)); ctx.moveTo(pts[0][0], pts[0][1]); for (let m = 1; m < 4; m++) ctx.lineTo(pts[m][0], pts[m][1]); ctx.closePath(); 有 = true;
      }
      if (有) ctx.fill();
    }
  }
}
function 木を集める(物) {
  for (const 群 of [FORESTS, WOODS]) for (const o of 群) {
    const cx = o.x * 尺, cz = -o.y * 尺, r = o.r * 尺; if (Math.hypot(cx - C.x, cz - C.z) - r > 130) continue;
    const 間 = 群 === FORESTS ? 5.5 : 8;
    const i0 = Math.floor((cx - r) / 間), i1 = Math.floor((cx + r) / 間), j0 = Math.floor((cz - r) / 間), j1 = Math.floor((cz + r) / 間);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const h = 鳴(i * 31 + 5, j * 17 + (群 === FORESTS ? 1 : 2)); const x = (i + (h & 255) / 256) * 間, z = (j + ((h >>> 8) & 255) / 256) * 間;
      if (Math.hypot(x - cx, z - cz) > r) continue; const d = 奥(x, z); if (d < 1.5 || d > 130) continue;
      const 丈 = 8 + ((h >>> 16) & 255) / 255 * 5; 物.push({ d, f: () => 杉(x, z, 丈, d) });
    }
  }
}
let 筆 = null;                                            // いま描いている画布（背中を描く が据える）
function 杉(x, z, h, d) { const ctx = 筆; const [sx, sy, zc] = P(x, 0, z); if (zc < 1 || sx < -250 || sx > W + 250) return; const s = F / zc;
  const 幹 = 霞([70, 58, 44], d, 70), 葉 = 霞([44, 68, 50], d, 65), 葉2 = 霞([60, 88, 62], d, 65);
  ctx.fillStyle = 幹; ctx.fillRect(sx - 0.13 * s, sy - h * 0.36 * s, 0.26 * s, h * 0.36 * s);
  for (let k = 0; k < 5; k++) { const y0 = sy - h * (0.22 + k * 0.155) * s, ww = (1.7 - k * 0.27) * s; ctx.fillStyle = k % 2 ? 葉2 : 葉; ctx.beginPath(); ctx.moveTo(sx - ww, y0); ctx.lineTo(sx, y0 - h * 0.3 * s); ctx.lineTo(sx + ww, y0); ctx.closePath(); ctx.fill(); } }
function 霞の帯(ctx) { const hz = 水平(); const gr = ctx.createLinearGradient(0, hz - 40, 0, hz + 60); gr.addColorStop(0, "rgba(214,216,210,0)"); gr.addColorStop(0.5, "rgba(214,216,210,.3)"); gr.addColorStop(1, "rgba(214,216,210,0)"); ctx.fillStyle = gr; ctx.fillRect(0, hz - 40, W, 100);
  const v = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.4, W / 2, H * 0.55, W * 0.78); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.34)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }
function 輪(ctx, x, z, rx, rz) { ctx.beginPath(); for (let k = 0; k <= 40; k++) { const a = (k / 40) * Math.PI * 2; const [sx, sy] = P(x + Math.cos(a) * rx, 0, z + Math.sin(a) * rz); k ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); } ctx.closePath(); ctx.strokeStyle = "rgba(240,214,130,.95)"; ctx.lineWidth = 2.6; ctx.stroke(); }

/* ---------- 一人を描く ----------
   体は平らな絵（カメラに向けて立てる）。背中が見えるか顔が見えるかは、兵の向きとカメラの向きで決める。
   槍・鉄砲・弓は、兵の向きに沿って長さを持つ線として遠近で描く。騎馬は馬の上に人を描く。 */
function 線3(ctx, a, b2, w0, w1, rgb, d) {
  const [ax, ay, az] = P(...a), [bx, by, bz] = P(...b2); if (az < 0.5 || bz < 0.5) return null;
  const wa = Math.max(0.7, w0 * F / az), wb = Math.max(0.6, w1 * F / bz); const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  ctx.fillStyle = 霞(rgb, d, 120); ctx.beginPath(); ctx.moveTo(ax + nx * wa / 2, ay + ny * wa / 2); ctx.lineTo(bx + nx * wb / 2, by + ny * wb / 2); ctx.lineTo(bx - nx * wb / 2, by - ny * wb / 2); ctx.lineTo(ax - nx * wa / 2, ay - ny * wa / 2); ctx.closePath(); ctx.fill();
  return [bx, by, bz, nx, ny];
}
/* 光 … 穂先を赤く光らせる強さ（〇〜一）。敵の兵が与平へ槍を引いて溜めているあいだ（試し版と同じ見せ方） */
function 槍(ctx, a, b2, d, 光 = 0) { const r = 線3(ctx, a, b2, 0.05, 0.04, [64, 48, 32], d); if (!r) return; const [bx, by, bz, nx, ny] = r;
  const t = 0.3 / Math.hypot(b2[0] - a[0], b2[1] - a[1], b2[2] - a[2]); const [mx, my, mz] = P(b2[0] - (b2[0] - a[0]) * t, b2[1] - (b2[1] - a[1]) * t, b2[2] - (b2[2] - a[2]) * t); const wm = Math.max(1, 0.07 * F / mz);
  ctx.fillStyle = 霞([206, 212, 218], d, 120); ctx.beginPath(); ctx.moveTo(mx + nx * wm / 2, my + ny * wm / 2); ctx.lineTo(bx, by); ctx.lineTo(mx - nx * wm / 2, my - ny * wm / 2); ctx.closePath(); ctx.fill();
  if (光 > 0) { ctx.save(); ctx.globalAlpha *= 光; const rr = Math.max(4, 0.22 * F / bz); const g = ctx.createRadialGradient(bx, by, 0, bx, by, rr);
    g.addColorStop(0, "rgba(255,90,70,.95)"); g.addColorStop(1, "rgba(255,90,70,0)"); ctx.fillStyle = g; ctx.fillRect(bx - rr, by - rr, rr * 2, rr * 2); ctx.restore(); } }
const 突きの伸び = (ph) => (ph < 0.45 ? -0.35 * Math.sin((ph / 0.45) * Math.PI / 2) : ph < 0.6 ? lerp(-0.35, 1, (ph - 0.45) / 0.15) : lerp(1, 0, sm((ph - 0.6) / 0.4)));
function 一人を描く(ctx, p, t, al) {
  筆 = ctx;
  const d = 奥(p.x, p.z); const [sx, sy, zc] = P(p.x, 0, p.z); if (zc < 0.9) return;
  const s = (sy - P(p.x, 1, p.z)[1]) * p.丈; if (s < 1.2) return;
  const 近 = p.我 ? 1 : clamp((zc - 1.6) / 1.4, 0, 1); if (近 <= 0.01) return;
  ctx.globalAlpha = al * 近;
  const 前 = p.fx * C.fx + p.fz * C.fz < 0;              // 顔がカメラを向いているか
  const 色組 = 色[p.側] || 色.P;
  /* fl … 当たったときの閃き（〇.二二秒、白へ寄せる）。fu … 倒れる進み（〇.五五秒で横たわる）。試し版と同じ */
  const fl = p.fl || 0, fu = p.fu || 0;
  const c = (rgb) => 霞(fl > 0 ? [rgb[0] + (255 - rgb[0]) * fl * 0.7, rgb[1] + (250 - rgb[1]) * fl * 0.7, rgb[2] + (240 - rgb[2]) * fl * 0.7] : rgb, d, 120);
  const 漆 = c(p.我 ? [26, 25, 30] : [30, 30, 35]), 縅 = c(色組.縅), 布 = c(色組.布), 脛 = c([156, 146, 122]), 肌 = c([204, 166, 132]), 髪 = c([26, 24, 24]), 金 = c([226, 196, 110]);
  const 騎 = p.型 === "kiba";
  const 下 = 騎 ? 1.12 : 0;                                  // 騎馬は人を馬の背に載せる
  const X = (v) => sx + v * s * p.幅, Y = (v) => sy - (v + 下) * s;
  const 線 = (pts, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.8, w * s); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); pts.forEach(([a, b2], i) => (i ? ctx.lineTo(X(a), Y(b2)) : ctx.moveTo(X(a), Y(b2)))); ctx.stroke(); };
  const 細 = s > 16, 粗 = s < 6;
  /* 右手の所（世界）：兵から見て右。槍は兵の向きに沿う。横 … 右手からさらに右（負なら左）へ */
  const rx = p.fz, rz = -p.fx;
  const 点 = (前後, 高さ, 横 = 0) => [p.x + rx * (0.3 * p.幅 + 横) + p.fx * 前後, (高さ + 下) * p.丈, p.z + rz * (0.3 * p.幅 + 横) + p.fz * 前後];
  const 手 = (前後, 高さ) => 点(前後, 高さ);
  /* 倒れる者：得物は地に落ち、体は足もとを軸に横へ倒れる（画面の右へ倒れるなら、槍も写しの右へ落ちる） */
  if (fu > 0) { const fd = p.倒向 || 1, lx = C.rx * fd, lz = C.rz * fd;
    槍(ctx, [p.x + lx * 0.15 - p.fx * 0.8, 0.05, p.z + lz * 0.15 - p.fz * 0.8], [p.x + lx * 1.5 + p.fx * 2.4, 0.05, p.z + lz * 1.5 + p.fz * 2.4], d);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(fd * 1.45 * sm(fu)); ctx.translate(-sx, -sy); }
  /* 馬 */
  if (騎) {
    const 馬 = c([92, 66, 44]), 馬暗 = c([58, 42, 30]), sw = Math.sin((p.歩 || 0) * Math.PI * 2) * (p.働 === "歩" ? 0.12 : 0);
    const MX = (v) => sx + v * s, MY = (v) => sy - v * s;
    ctx.strokeStyle = 馬暗; ctx.lineWidth = Math.max(0.8, 0.07 * s); ctx.lineCap = "round";
    for (const [lx, ph] of [[-0.17, 0], [0.17, 1], [-0.11, 1], [0.11, 0]]) { ctx.beginPath(); ctx.moveTo(MX(lx), MY(1.0)); ctx.lineTo(MX(lx + (ph ? sw : -sw) * 0.3), MY(0.04 + (ph ? Math.max(0, sw) : Math.max(0, -sw)))); ctx.stroke(); }
    ctx.fillStyle = 馬; ctx.beginPath(); ctx.ellipse(MX(0), MY(1.22), 0.27 * s, 0.27 * s, 0, 0, 7); ctx.fill();
    if (前) { ctx.fillStyle = 馬暗; ctx.beginPath(); ctx.ellipse(MX(0), MY(1.55), 0.1 * s, 0.26 * s, 0, 0, 7); ctx.fill(); ctx.fillStyle = 馬; ctx.beginPath(); ctx.ellipse(MX(0), MY(1.32), 0.09 * s, 0.17 * s, 0, 0, 7); ctx.fill(); }
    else { ctx.strokeStyle = 馬暗; ctx.lineWidth = Math.max(0.8, 0.06 * s); ctx.beginPath(); ctx.moveTo(MX(0), MY(1.2)); ctx.quadraticCurveTo(MX(0.05), MY(0.9), MX(0.02), MY(0.7)); ctx.stroke(); }
  }
  /* 指物（背の小旗）：背中が見えるなら体の後で、顔が見えるなら体の前に描く */
  const 旗 = () => { if (粗) return; const 高 = (p.我 ? 2.75 : 2.45); let sg = 前 ? -1 : 1; if (p.我) sg = -sg; const 旗色 = c(色組.旗);
    線([[0.02 * sg, 1.2], [0.02 * sg, 高]], 0.03, c([58, 46, 32]));
    ctx.fillStyle = 旗色; ctx.beginPath(); ctx.moveTo(X(0.02 * sg), Y(高)); ctx.lineTo(X(0.34 * sg), Y(高)); ctx.lineTo(X(0.34 * sg), Y(高 - 0.62)); ctx.lineTo(X(0.02 * sg), Y(高 - 0.62)); ctx.closePath(); ctx.fill();
    if (p.我) { ctx.strokeStyle = 金; ctx.lineWidth = Math.max(1.2, 0.035 * s); ctx.stroke(); }   // 与平の小旗は金の縁で見分ける
    if (s > 22) { ctx.fillStyle = c([238, 232, 216]); ctx.beginPath(); ctx.arc(X(0.18 * sg), Y(高 - 0.31), 0.08 * s, 0, 7); ctx.fill(); } };
  if (前) 旗();
  /* 脚（騎馬の人は鞍の上で、脚は短く垂らす） */
  if (!騎) {
    const A = lerp(0.055, 0.13, clamp((p.v - 2) / 1.5, 0, 1)) * clamp(p.v / 0.5, 0, 1) * (p.働 === "歩" || p.我 ? 1 : 0.4), φ = (p.歩 || 0) * Math.PI * 2;
    for (const k of [-1, 1]) { const lift = A * Math.max(0, Math.sin(φ + (k < 0 ? 0 : Math.PI)));
      線([[k * 0.1, 0.86], [k * 0.12, 0.48 + lift * 0.6], [k * 0.13, 0.1 + lift]], 0.12, 布);
      if (!粗) 線([[k * 0.12, 0.42 + lift * 0.8], [k * 0.13, 0.12 + lift]], 0.105, 脛);
      ctx.fillStyle = 漆; ctx.beginPath(); ctx.ellipse(X(k * 0.13), Y(0.05 + lift), 0.08 * s, 0.04 * s, 0, 0, 7); ctx.fill(); }
  } else { for (const k of [-1, 1]) 線([[k * 0.2, 0.86], [k * 0.3, 0.5]], 0.1, 布); }
  /* 胴・草摺・腕 */
  ctx.fillStyle = 漆; ctx.fillRect(X(-0.26), Y(0.98), 0.52 * s * p.幅, 0.3 * s);
  ctx.beginPath(); ctx.moveTo(X(-0.22), Y(0.97)); ctx.lineTo(X(-0.26), Y(1.36)); ctx.quadraticCurveTo(X(0), Y(1.47), X(0.26), Y(1.36)); ctx.lineTo(X(0.22), Y(0.97)); ctx.closePath(); ctx.fill();
  if (細) { for (let k = 0; k < 4; k++) 線([[-0.22, 1.04 + k * 0.085], [0.22, 1.04 + k * 0.085]], 0.032, 縅); for (let k = 1; k < 5; k++) 線([[-0.26 + k * 0.104, 0.97], [-0.26 + k * 0.104, 0.69]], 0.012, 縅); }
  else if (!粗) 線([[-0.22, 1.12], [0.22, 1.12]], 0.06, 縅);
  const 腕型 = p.受 || p.働 === "突" || p.働 === "構" ? "構" : p.働 === "歩" && p.型 === "yari" ? "肩" : "立";
  if (!粗) { const 腕 = 前 ? [[[0.26, 1.36], [0.34, 1.12], [0.22, 1.02]], [[-0.26, 1.36], [-0.32, 1.12], [-0.06, 1.04]]]
      : 腕型 === "肩" ? [[[0.26, 1.36], [0.4, 1.2], [0.3, 1.4]], [[-0.26, 1.36], [-0.33, 1.12], [-0.3, 0.92]]]
      : 腕型 === "構" ? [[[0.26, 1.36], [0.36, 1.14], [0.24, 1.04]], [[-0.26, 1.36], [-0.3, 1.14], [-0.04, 1.08]]]
      : [[[0.26, 1.36], [0.35, 1.12], [0.33, 0.98]], [[-0.26, 1.36], [-0.32, 1.1], [-0.3, 0.92]]];
    for (const a of 腕) { 線(a.slice(0, 2), 0.1, 布); 線(a.slice(1), 0.085, 漆); } }
  /* 頭と被り物（癖：〇・一 陣笠、二 鉢巻、三 頭形兜） */
  if (前) { ctx.fillStyle = 肌; ctx.beginPath(); ctx.ellipse(X(0), Y(1.55), 0.1 * s, 0.12 * s, 0, 0, 7); ctx.fill(); }
  else { ctx.fillStyle = 髪; ctx.beginPath(); ctx.ellipse(X(0), Y(1.55), 0.1 * s, 0.115 * s, 0, 0, 7); ctx.fill(); }
  if (p.癖 === 2) { 線([[-0.1, 1.6], [0.1, 1.6]], 0.035, c([236, 232, 220])); }
  else if (p.癖 === 3) { ctx.fillStyle = 漆; ctx.beginPath(); ctx.ellipse(X(0), Y(1.62), 0.15 * s, 0.14 * s, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(X(-0.2), Y(1.62), 0.4 * s * p.幅, 0.08 * s); }
  else { ctx.fillStyle = 漆; ctx.beginPath(); ctx.moveTo(X(-0.36), Y(1.6)); ctx.quadraticCurveTo(X(-0.1), Y(1.7), X(0), Y(1.79)); ctx.quadraticCurveTo(X(0.1), Y(1.7), X(0.36), Y(1.6)); ctx.quadraticCurveTo(X(0), Y(1.53), X(-0.36), Y(1.6)); ctx.fill();
    if (p.癖 === 1 && !粗) 線([[-0.3, 1.6], [0.3, 1.6]], 0.02, 縅); }
  if (!前) 旗();
  /* 本陣衆の将：兜に金の前立て（三日月）。遠目にも将と分かる */
  if (p.将 && !粗) { ctx.strokeStyle = 金; ctx.lineWidth = Math.max(1.2, 0.07 * s); ctx.beginPath(); ctx.arc(X(0), Y(1.68), 0.27 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
  /* 旗持：大きな馬印（家の色の大旗）を高く掲げる。本陣の在り処の目印 */
  if (p.旗持) { const sg = 前 ? -1 : 1, 旗色 = c(色組.旗);
    線([[0.18 * sg, 0.9], [0.18 * sg, 4.6]], 0.045, c([58, 46, 32]));
    ctx.fillStyle = 旗色; ctx.beginPath(); ctx.moveTo(X(0.18 * sg), Y(4.6)); ctx.lineTo(X(0.98 * sg), Y(4.6)); ctx.lineTo(X(0.98 * sg), Y(3.0)); ctx.lineTo(X(0.18 * sg), Y(3.0)); ctx.closePath(); ctx.fill();
    if (!粗) { ctx.fillStyle = c([238, 232, 216]); ctx.beginPath(); ctx.arc(X(0.58 * sg), Y(3.8), 0.24 * s, 0, 7); ctx.fill(); } }
  if (fu > 0) { ctx.restore(); ctx.globalAlpha = 1; return; }
  /* 得物。受け（与平）：槍を斜めに立てて体の前を塞ぐ。伸 … 突きの伸び（与平と、与平に掛かる敵は、盤の拍子でなく自分の拍子で突く） */
  if (p.将) {
    /* 采配：短い柄に白い房 */
    const [a1, a2] = [手(0.1, 1.05), 手(0.45, 1.75)];
    線3(ctx, a1, a2, 0.03, 0.025, [40, 34, 28], d);
    const [qx, qy, qz] = P(...a2); if (qz > 0.5) { ctx.fillStyle = c([240, 238, 230]); ctx.beginPath(); ctx.ellipse(qx, qy, 0.09 * F / qz, 0.16 * F / qz, 0, 0, 7); ctx.fill(); }
  } else if (p.旗持) {
    /* 馬印を持つので得物は持たない */
  } else if (p.型 === "yari" || 騎) {
    if (p.受) 槍(ctx, 点(-0.4, 0.95, -0.05), 点(1.9, 2.55, -0.95), d);
    else if (p.働 === "突" || p.働 === "構") { const e = p.伸 != null ? p.伸 : p.働 === "突" ? 突きの伸び(p.相) : 0;
      槍(ctx, 手(-1.3 + e * 0.85, 0.92), 手(2.6 + e * 0.85, 1.25 - 0.04 * e), d, p.光 || 0); }
    else if (腕型 === "肩" && !騎) { const el = 0.61; 槍(ctx, 手(-0.95 * Math.cos(el), 1.4 - 0.95 * Math.sin(el)), 手(4.6 * Math.cos(el), 1.4 + 4.6 * Math.sin(el)), d); }
    else 槍(ctx, 手(0, 0.04), 手(0.02, 騎 ? 3.4 : 4.4), d);
  } else if (p.型 === "teppo") {
    if (p.働 === "放") { const 反 = p.相 < 0.15 ? -0.12 * Math.sin(p.相 / 0.15 * Math.PI) : 0; const 先 = 手(1.25 + 反, 1.42);
      線3(ctx, 手(-0.1 + 反, 1.38), 先, 0.05, 0.035, [40, 36, 34], d);
      if (p.相 < 0.4) { const [px, py, pz] = P(...先); if (pz > 0.5) { const k = p.相 / 0.4, r = (0.15 + k * 0.6) * F / pz; ctx.save(); ctx.globalAlpha *= (1 - k) * 0.8; ctx.fillStyle = "rgb(236,236,230)"; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); ctx.restore(); } } }
    else 線3(ctx, 手(0, 0.3), 手(0.02, 1.6), 0.05, 0.035, [40, 36, 34], d);
  } else if (p.型 === "yumi") {
    /* 弓：左手に持つ。放つあいだは顔の前に上げる */
    const lx = -p.fz, lz = p.fx, 上 = p.働 === "放" && p.相 < 0.6;
    const 弓芯 = [p.x + lx * 0.32 + p.fx * (上 ? 0.4 : 0.05), (上 ? 1.45 : 1.2) * p.丈, p.z + lz * 0.32 + p.fz * (上 ? 0.4 : 0.05)];
    const [bx, by, bz] = P(...弓芯); if (bz > 0.5) { const L = 0.85 * F / bz; ctx.strokeStyle = c([70, 50, 30]); ctx.lineWidth = Math.max(0.8, 0.035 * F / bz); ctx.beginPath(); ctx.moveTo(bx, by - L); ctx.quadraticCurveTo(bx + (前 ? 0.25 : -0.25) * L, by, bx, by + L * 0.85); ctx.stroke(); }
  }
  if (p.我) { ctx.strokeStyle = "#141416"; ctx.lineCap = "round"; ctx.lineWidth = 0.055 * s; ctx.beginPath(); ctx.moveTo(X(-0.16), Y(0.92)); ctx.lineTo(X(-0.36), Y(0.79)); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function 倒れを描く(ctx, e) {
  const d = 奥(e.x, e.z); const [sx, sy, zc] = P(e.x, 0, e.z); if (zc < 0.9 || sx < -200 || sx > W + 200) return;
  const s = sy - P(e.x, 1, e.z)[1]; if (s < 1) return;
  const 色組 = 色[e.側] || 色.E, 向 = (e.鍵 & 1) ? 1 : -1;
  ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.55); ctx.rotate(向 * 1.48);
  ctx.fillStyle = 霞([30, 30, 35], d, 120); ctx.fillRect(-0.26 * s, -1.4 * s, 0.52 * s, 0.6 * s);
  ctx.fillStyle = 霞(色組.布, d, 120); ctx.fillRect(-0.18 * s, -0.86 * s, 0.36 * s, 0.86 * s);
  ctx.fillStyle = 霞([30, 30, 35], d, 120); ctx.beginPath(); ctx.ellipse(0, -1.62 * s, 0.32 * s, 0.1 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 霞(色組.旗, d, 120); ctx.fillRect(0.3 * s, -1.9 * s, 0.32 * s, 0.5 * s);
  ctx.restore();
}

/* ---------- 城の造作を描く（城攻め・籠城。hitori/shiro_senaka.js の箱と屋根） ----------
   箱は六面のうち、写しの側を向いた面だけを塗る（凸なので重ならない）。写しのすぐ手前（近 m）で面を切る。
   門の傷み・崩れ・櫓の落ちで造作が変わるので、それを鍵にして集め直す */
let 城の控え = { m: null, 鍵: "", 物: [] };
function 城の物(m) {
  const 鍵 = (m.gates || []).map((g) => (g.broken ? "b" : Math.round((g.hp / (g.max || 1)) * 4))).join("")
    + "|" + (m.fac || []).map((f) => (f.hp > 0 ? 1 : 0)).join("") + "|" + (m.付城 || []).length + "|" + (m.出城 ? m.出城.gates.map((g) => (g.broken ? 1 : 0)).join("") : "");
  if (城の控え.m !== m || 城の控え.鍵 !== 鍵) 城の控え = { m, 鍵, 物: 城の箱を集める(m, 尺) };
  return 城の控え.物;
}
const 近 = 0.25;
function 写す(x, y, z) {
  const dx = x - C.x, dz = z - C.z; const rx = dx * C.rx + dz * C.rz, rz = dx * C.fx + dz * C.fz, ry = y - C.h;
  return [rx, ry * C.cs + rz * C.sn, -ry * C.sn + rz * C.cs];
}
/* 世界の点の並び（[x, y, z]）を一つの面として塗る。写しの手前で切る */
function 面を塗る(ctx, 点ら, 塗り) {
  const cs = 点ら.map((p) => 写す(p[0], p[1], p[2])), out = [];
  for (let i = 0; i < cs.length; i++) {
    const a = cs[i], b2 = cs[(i + 1) % cs.length], ai = a[2] >= 近, bi = b2[2] >= 近;
    if (ai) out.push(a);
    if (ai !== bi) { const u = (近 - a[2]) / (b2[2] - a[2]); out.push([a[0] + (b2[0] - a[0]) * u, a[1] + (b2[1] - a[1]) * u, 近]); }
  }
  if (out.length < 3) return false;
  ctx.beginPath();
  for (let i = 0; i < out.length; i++) { const [rx, yc, zc] = out[i]; const sx = W / 2 + F * rx / zc, sy = H / 2 - F * yc / zc; if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); }
  ctx.closePath(); ctx.fillStyle = 塗り; ctx.fill();
  return true;
}
const 濃く = (rgb, k) => [rgb[0] * k, rgb[1] * k, rgb[2] * k];
function 城の物を描く(ctx, o, d) {
  for (const p of o.部品) { if (p.k === "箱") 箱を描く(ctx, p, d); else 屋根を描く(ctx, p, d); }
}
function 箱を描く(ctx, p, d) {
  const X0 = p.r[0] * 尺, X1 = p.r[2] * 尺, Z0 = -p.r[3] * 尺, Z1 = -p.r[1] * 尺, Y0 = p.底, Y1 = p.底 + p.丈;
  const 面 = [];
  if (C.x < X0) 面.push({ 点: [[X0, Y0, Z1], [X0, Y0, Z0], [X0, Y1, Z0], [X0, Y1, Z1]], 陰: 0.84 });
  if (C.x > X1) 面.push({ 点: [[X1, Y0, Z0], [X1, Y0, Z1], [X1, Y1, Z1], [X1, Y1, Z0]], 陰: 0.70 });
  if (C.z < Z0) 面.push({ 点: [[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y1, Z0], [X0, Y1, Z0]], 陰: 0.78 });
  if (C.z > Z1) 面.push({ 点: [[X1, Y0, Z1], [X0, Y0, Z1], [X0, Y1, Z1], [X1, Y1, Z1]], 陰: 0.93 });
  for (const f of 面) {
    if (!面を塗る(ctx, f.点, 霞(濃く(p.色, f.陰), d))) continue;
    if (d > 80) continue;
    const [a0, a1, a2, a3] = f.点;                 // a0→a1 が地の辺、a3→a2 が上の辺
    const 帯 = (v0, v1, rgb) => 面を塗る(ctx, [[...a0.slice(0, 1), lerp(a0[1], a3[1], v0), a0[2]], [a1[0], lerp(a1[1], a2[1], v0), a1[2]],
      [a1[0], lerp(a1[1], a2[1], v1), a1[2]], [a0[0], lerp(a0[1], a3[1], v1), a0[2]]], 霞(rgb, d));
    if (p.腰) 帯(0, 0.34, 濃く([74, 66, 57], f.陰));
    if (p.石) for (const v of [0.3, 0.62]) 帯(v, v + 0.035, 濃く([110, 104, 92], f.陰));
    if (p.窓) {
      const L = Math.hypot(a1[0] - a0[0], a1[2] - a0[2]), n = Math.max(1, Math.min(8, Math.round(L / 2.6)));
      for (let i = 0; i < n; i++) {
        const u0 = (i + 0.35) / n, u1 = (i + 0.6) / n, at = (u, v) => [lerp(a0[0], a1[0], u), lerp(a0[1], a3[1], v), lerp(a0[2], a1[2], u)];
        面を塗る(ctx, [at(u0, 0.55), at(u1, 0.55), at(u1, 0.75), at(u0, 0.75)], 霞([40, 36, 30], d));
      }
    }
    if (p.扉) 面を塗る(ctx, [[lerp(a0[0], a1[0], 0.49), Y0, lerp(a0[2], a1[2], 0.49)], [lerp(a0[0], a1[0], 0.51), Y0, lerp(a0[2], a1[2], 0.51)],
      [lerp(a0[0], a1[0], 0.51), Y1, lerp(a0[2], a1[2], 0.51)], [lerp(a0[0], a1[0], 0.49), Y1, lerp(a0[2], a1[2], 0.49)]], 霞([28, 20, 12], d));
  }
  if (C.h > Y1) 面を塗る(ctx, [[X0, Y1, Z0], [X1, Y1, Z0], [X1, Y1, Z1], [X0, Y1, Z1]], 霞(p.石 ? [178, 172, 158] : 濃く(p.色, 1.02), d));
}
/* 寄棟の屋根。棟は長い向きに通し、四つの面のうち写しの側を向いたものを塗る */
function 屋根を描く(ctx, p, d) {
  const X0 = p.r[0] * 尺, X1 = p.r[2] * 尺, Z0 = -p.r[3] * 尺, Z1 = -p.r[1] * 尺, Y0 = p.底, Y1 = p.底 + p.丈;
  const 横 = X1 - X0 >= Z1 - Z0, 入 = (横 ? Z1 - Z0 : X1 - X0) / 2, Xc = (X0 + X1) / 2, Zc = (Z0 + Z1) / 2;
  const r0 = 横 ? [X0 + 入, Y1, Zc] : [Xc, Y1, Z0 + 入], r1 = 横 ? [X1 - 入, Y1, Zc] : [Xc, Y1, Z1 - 入];
  const c00 = [X0, Y0, Z0], c10 = [X1, Y0, Z0], c11 = [X1, Y0, Z1], c01 = [X0, Y0, Z1];
  const 面ら = 横
    ? [{ 点: [c00, c10, r1, r0], 陰: 0.8 }, { 点: [c11, c01, r0, r1], 陰: 1.0 }, { 点: [c01, c00, r0], 陰: 0.9 }, { 点: [c10, c11, r1], 陰: 0.7 }]
    : [{ 点: [c01, c00, r0, r1], 陰: 0.9 }, { 点: [c10, c11, r1, r0], 陰: 0.7 }, { 点: [c00, c10, r0], 陰: 0.8 }, { 点: [c11, c01, r1], 陰: 1.0 }];
  for (const f of 面ら) {
    const [a, b2, c] = f.点;
    const ux = b2[0] - a[0], uy = b2[1] - a[1], uz = b2[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;       // 面の法線
    /* 外へ向ける（屋根の芯から面の真ん中へ向かう向きと揃える） */
    const k = f.点.length, gx = f.点.reduce((s, q) => s + q[0], 0) / k, gy = f.点.reduce((s, q) => s + q[1], 0) / k, gz = f.点.reduce((s, q) => s + q[2], 0) / k;
    if (nx * (gx - Xc) + ny * (gy - (Y0 + Y1) / 2) + nz * (gz - Zc) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    if (nx * (C.x - gx) + ny * (C.h - gy) + nz * (C.z - gz) <= 0) continue;
    面を塗る(ctx, f.点, 霞(濃く(p.色, f.陰), d));
  }
}
