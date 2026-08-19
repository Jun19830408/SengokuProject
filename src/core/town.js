import { px, py } from "../data/geo.js";

/* ==========================================================================
   特殊勢力（GDD 5.4）

   湊・水軍衆・商業都市・寺社・忍びの里・鉱山。いずれもその土地に根を張り、
   大名の下にありながら、大名のものではない。金を積んで誼を通じ、
   兵を借り、船を借り、金を借りる。

   はじめこの判じは naval.js に置いていた。水軍衆のために書いたからである。
   ところが決まりは湊にも寺社にも忍びの里にも等しく及ぶものであって、
   海の話ではない。ここへ移した。
   ========================================================================== */

/* 特殊勢力に手を出せるか（GDD 5.4 / 10章）。

   町の一覧を距離で並べるだけで、絞り込んでいなかった。そのため、播磨の三木城に
   座ったまま、淡路の安宅水軍（三好の身内である）と摂津の兵庫津（三好の湊）へ
   金を積むことができた。別所が初手でこの二つを取って畿内の海を握る――
   さすがに通らない話である。

   湊も水軍衆も寺社も、その土地に根を張っている。
   決まりは一つでよい。**その町のいちばん近くの城を押さえている家が、その町と
   誼を通じられる。** 隣の城を持たぬ者の話を、誰が聞くだろうか。

   はじめは「半径百十歩のうち、いちばん多く城を持つ家」としてみたが、それでは
   海峡を跨いで対岸の城まで数に入る（安宅水軍から三木城まで百五歩）。
   淡路を丸ごと取ってもなお手が届かぬ、という妙なことになった。
   いちばん近い城ひとつで決めるほうが、分かりやすく、目当てもはっきりする。

   淡路の安宅水軍に手を出したければ、洲本を落とすことである。 */
export const 手の届く間 = 130;         // これより遠ければ、そもそも誰の町でもない

export function 特殊勢力の可否(g, t, fid) {
  const tx = px(t.lon), ty = py(t.lat);
  let 隣 = null, bd = 1e9;
  for (const c of g.castles || []) {
    const d = Math.hypot(c.x - tx, c.y - ty);
    if (d < bd) { bd = d; 隣 = c; }
  }
  if (!隣 || bd > 手の届く間) return { ok: false, why: "近くに城がなく、話を通す筋がない" };
  if (隣.faction === fid) return { ok: true, why: "", 隣 };
  const 名 = ((g.factions || {})[隣.faction] || {}).name || "他家";
  return { ok: false, why: `${隣.name}を押さえる${名}の土地。${隣.name}を落とさねば話は通らない`, 隣 };
}



/* ------------------------------------------------ 特殊勢力の印（GDD 13.1）

   これまで政務の図では、どの町も同じ灰色の点であった。湊なのか寺社なのか
   忍びの里なのか、名を読まねば分からない。種ごとの形にする。

   形は、その町が何をする所かを一目で示すものにした。
     港・水軍衆 … 舟。水軍衆には帆を立てる
     商業都市   … 銭（丸に四角い穴）
     町         … 屋根
     寺社       … 鳥居
     忍びの里   … 手裏剣
     鉱山       … 山と坑口
*/
export const 町の色 = {
  港: "#3C6E8C", 水軍衆: "#2F5D8C", 商業都市: "#B08A3A", 町: "#8A7A5E",
  寺社: "#8C5A6E", 忍びの里: "#5A6E5A", 鉱山: "#6E6A5E",
};

export function drawTownMark(ctx, kind, x, y, r, col) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = col; ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(0.9, r * 0.18);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (kind === "港" || kind === "水軍衆") {
    // 舟。水軍衆には帆を立てる
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.05);
    ctx.lineTo(r * 0.85, -r * 0.05);
    ctx.lineTo(r * 0.5, r * 0.5);
    ctx.lineTo(-r * 0.5, r * 0.5);
    ctx.closePath(); ctx.fill();
    if (kind === "水軍衆") {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.12); ctx.lineTo(0, -r * 0.95); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r * 0.06, -r * 0.9); ctx.lineTo(r * 0.72, -r * 0.62); ctx.lineTo(r * 0.06, -r * 0.38);
      ctx.closePath(); ctx.fill();
    }
  } else if (kind === "商業都市") {
    // 銭。丸に四角い穴
    ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, 7); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.rect(-r * 0.26, -r * 0.26, r * 0.52, r * 0.52); ctx.fill();
    ctx.restore();
  } else if (kind === "町") {
    // 屋根を二つ
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, r * 0.25); ctx.lineTo(-r * 0.35, -r * 0.55); ctx.lineTo(r * 0.25, r * 0.25);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 0.15, r * 0.55); ctx.lineTo(r * 0.4, -r * 0.15); ctx.lineTo(r * 0.95, r * 0.55);
    ctx.closePath(); ctx.fill();
  } else if (kind === "寺社") {
    // 鳥居
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, -r * 0.55); ctx.lineTo(r * 0.95, -r * 0.55); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 0.22); ctx.lineTo(r * 0.75, -r * 0.22); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.5); ctx.lineTo(-r * 0.62, r * 0.8); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.5); ctx.lineTo(r * 0.62, r * 0.8); ctx.stroke();
  } else if (kind === "忍びの里") {
    // 手裏剣。四方に尖る
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const rr = i % 2 ? r * 0.3 : r * 0.95;
      const px2 = Math.cos(a) * rr, py2 = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
    }
    ctx.closePath(); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, 7); ctx.fill();
    ctx.restore();
  } else if (kind === "鉱山") {
    // 山と坑口
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, r * 0.6); ctx.lineTo(-r * 0.15, -r * 0.7);
    ctx.lineTo(r * 0.4, r * 0.05); ctx.lineTo(r * 0.95, r * 0.6);
    ctx.closePath(); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, r * 0.6); ctx.lineTo(-r * 0.42, r * 0.12);
    ctx.arc(-r * 0.18, r * 0.12, r * 0.24, Math.PI, 0);
    ctx.lineTo(r * 0.06, r * 0.6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, 7); ctx.fill();
  }
  ctx.restore();
}

/* いまその町は誰に付いているか。画面へ出すための一行にまとめる。 */
export function 町の様子(g, t) {
  const st = (g.specials || {})[t.id] || {};
  const 誼 = st.faction && st.state && st.state !== "中立" ? st : null;
  const 名 = 誼 ? ((g.factions || {})[誼.faction] || {}).name : null;
  return { st, 誼, 主名: 名, 色: 誼 ? ((g.factions || {})[誼.faction] || {}).color : (町の色[t.kind] || "#55524A") };
}
