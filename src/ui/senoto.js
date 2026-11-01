/* ==========================================================================
   合戦の効果音を、画面から鳴らす（効果音取り込みの手引き「二」「三」）

   理（src/battle/）は音の座なしに試験で回るので、そこからは鳴らさない。理の中で起きた
   出来事（盤の下の知らせ・焙烙・計略「鼓舞」）は「鳴らしたい音の列」（b.音）に積み、画面が
   一コマごとにこれを鳴らす（下の 音の列を鳴らす）。画面で起きる出来事（隊を選ぶ・下知・
   合戦の始まりと終わり・寄ったときの兵の音）は、画面がその場で鳴らす。

   音の名と鳴らし方は src/audio/kouka.js のとおり。どれも投げっぱなしでよく、何度呼んでも
   同じ地を掛け直したり、同じ一打を続けざまに鳴らしたりはしない。音を切っているときや、
   音の座の無い所（試験・file:// で開いた一枚物）では、何もせずに終わる。
   ========================================================================== */
import { 効果を鳴らす, 締めを鳴らす, 兵の音を掛ける, 効果を止める } from "../audio/kouka.js";

export { 効果を鳴らす, 締めを鳴らす, 兵の音を掛ける, 効果を止める };

/* 鳴らしたい音の列（b.音）を鳴らす。一コマごとに呼ぶ。列は鳴らしたら空にする
   （記録に残さない。合戦の控えは隊ごとの値だけを書くので、列は入らない）。
   列には音の名か、{ 名, 音量, 左右, 間 } を積む */
export function 音の列を鳴らす(b) {
  if (!b || !b.音 || !b.音.length) return;
  for (const x of b.音.splice(0)) {
    if (typeof x === "string") 効果を鳴らす(x);
    else if (x && x.名) {
      const { 名, ...o } = x;
      効果を鳴らす(名, o);
    }
  }
}

/* 下知の音（手引き「三」の七）。合戦の最中だけ鳴らし、布陣のあいだは鳴らさない。
     前進・後退・転回・移動 … 陣太鼓（八秒に一度まで。移動は地を押して動かす下知と、退がる下知）
     射撃                  … 鉄砲の組がある隊は鉄砲、弓だけの隊は弓（八秒に一度まで） */
const 動かす下知 = new Set(["前進", "後退", "転回", "移動"]);
export function 下知の音(b, c, order) {
  if (!b || b.phase !== "fight" || !order) return;
  if (動かす下知.has(order)) { 効果を鳴らす("陣太鼓", { 間: 8 }); return; }
  if (order === "射撃" && c) {
    const 組 = (c.squads || []).filter((q) => q.men > 0);
    if (組.some((q) => q.type === "teppo")) 効果を鳴らす("鉄砲", { 間: 8 });
    else if (組.some((q) => q.type === "yumi")) 効果を鳴らす("弓", { 間: 8 });
  }
}
/* 陣形を選び直した（合戦の最中だけ陣太鼓） */
export function 陣形の音(b) {
  if (b && b.phase === "fight") 効果を鳴らす("陣太鼓", { 間: 8 });
}

/* 寄ったときの兵の音（地）。真ん中の隊の様子で選ぶ（手引き「三」の二）。上から順に判じる。
     槍を合わせている組がある → 接敵
     敗走している・撤退している → 退却（行軍の足音に退き鉦）
     突撃の下知（突撃の勢いが残っている）→ 突撃
     接戦の下知 → 接戦
     動いている → 行軍
     止まっている → 鳴らさない */
export function 地の名(c) {
  if (!c || c.dead || c.destroyed) return null;
  if ((c.squads || []).some((q) => q.engaged && q.men > 0)) return "接敵";
  if (c.routed || c.withdraw || c.order === "撤退" || c.order === "敗走") return "退却";
  if (c.order === "突撃" || (c.chargeT || 0) > 0) return "突撃";
  if (c.order === "接戦") return "接戦";
  if (動いているか(c)) return "行軍";
  return null;
}
function 動いているか(c) {
  if (c.order === "待機" || c.order === "守備") return false;
  if (c.wp && c.wp.length) return true;
  if (c.tx == null || c.ty == null) return false;
  return Math.hypot(c.tx - c.x, c.ty - c.y) > 12;
}
/* 画面の真ん中（盤の座標）にいちばん近い隊。隊の芯で測る */
export function 真ん中の隊(b, x, y) {
  let 近 = null, d0 = Infinity;
  for (const c of (b && b.corps) || []) {
    if (c.dead || c.destroyed || c.日和見) continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < d0) { d0 = d; 近 = c; }
  }
  return 近;
}

/* 締めの名（手引き「三」の五）。勝敗の付かぬ終わり方（日没・両軍撤収、兵糧攻めへ移る）は鳴らさない。
     天下分け目・合戦（関ヶ原）・大合戦 … 決戦の勝ち／決戦の負け
     城攻めで寄せ手 … 城を落とす／城攻めの退き
     城攻めで城方   … 野戦の勝ち／野戦の負け（守り切った・城が落ちた。手引きの案）
     野戦・行き合い・海戦 … 野戦の勝ち／野戦の負け（撤退も負けに数える） */
export function 締めの名(b, { mode, playerIsAtk } = {}) {
  if (!b || b.phase !== "over" || !b.result) return null;
  if (b.result === "日没" || b.兵糧攻めへ) return null;
  const 勝 = b.result === "P";
  if (mode === "wakeme" || b.分け目 || b.筋書き || b.大合戦) return 勝 ? "決戦の勝ち" : "決戦の負け";
  if (mode === "castle" || b.map) {
    const 寄せ手 = playerIsAtk != null ? playerIsAtk : b.attacker === "P";
    if (寄せ手) return 勝 ? "城を落とす" : "城攻めの退き";
  }
  return 勝 ? "野戦の勝ち" : "野戦の負け";
}
/* 合戦が終わった折に一度だけ締めを鳴らす（b.締めを鳴らした で控える） */
export function 終わりの締め(b, o) {
  if (!b || b.締めを鳴らした) return false;
  const 名 = 締めの名(b, o);
  if (!名) return false;
  b.締めを鳴らした = true;
  締めを鳴らす(名);
  return true;
}
