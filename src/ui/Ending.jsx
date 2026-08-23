import React from "react";
import { U } from "../core/util.js";
import { 外を押して閉じる } from "./panels.jsx";

/* ==========================================================================
   終幕（GDD 15.5）

   一局の終わりを告げる。これまでは、天下が定まっても報せに一行流れるだけ、
   家が絶えても城のない地図が残るだけであった。いつ終わったのかが分からぬのでは、
   遊びとして収まりがつかない。

   ただし、告げたあとに閉じ込めはしない。天下を定めたあとの掃除も、
   城を失ったあとの見物も、遊ぶ側の勝手である。閉じれば盤へ戻る。
   ========================================================================== */

// 天下の定まり方（unify.js の grade）に添える言葉
export const 位の説き = {
  一統: "天下ことごとくを直に治めた。並ぶ家は一つも残らない。",
  大成: "七割を超える城を直に治め、残るは旗の下の家々である。",
  覇: "四割五分を超える城を直に治め、なお多くの家を従えている。",
  旗下: "直に治める城は多くないが、すべての家が旗の下に入った。",
};

export function Ending({ g, onClose, onTitle }) {
  const 天下 = g.unified && g.unified.fid === g.player ? g.unified : null;
  const 絶 = g.滅び || null;
  if (!天下 && !絶) return null;
  const 家 = (g.factions[g.player] || {}).name || "当家";
  const 城 = g.castles.filter((c) => c.faction === g.player).length;
  return (
    <div className="modal" {...外を押して閉じる(onClose)}>
      <div className="card" style={{ maxWidth: 460 }}>
        <div className="mn" style={{ fontSize: 26, letterSpacing: ".08em", marginBottom: 2 }}>
          {天下 ? "天下、定まる" : "家、絶ゆ"}
        </div>
        <div style={{ fontSize: 11, color: U.dim, letterSpacing: ".2em", marginBottom: 12 }}>
          {天下 ? `${天下.y}年${天下.m}月` : `${絶.y}年${絶.m}月`}
        </div>

        {天下 ? (
          <>
            <div style={{ fontSize: 14, lineHeight: 2.1 }}>
              {家}の旗の下に、すべての城が入った。
            </div>
            <div className="sec">位　{天下.grade || "旗下"}</div>
            <div style={{ fontSize: 13, lineHeight: 2, color: U.dim }}>
              {位の説き[天下.grade] || 位の説き.旗下}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <span>直に治める城</span>
              <span className="v">{天下.mine ?? 城} ／ {天下.total ?? g.castles.length} 城</span>
            </div>
            <div className="row">
              <span>旗の下の家</span>
              <span className="v">{(天下.vassals || []).length} 家</span>
            </div>
            <div className="row"><span>始めてから</span>
              <span className="v">{天下.y - 1546}年{天下.m - 4 >= 0 ? 天下.m - 4 : 天下.m + 8}か月</span></div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, lineHeight: 2.1 }}>
              {家}は最後の城を失った。拠るべき城が無ければ、家は立たない。
            </div>
            <div style={{ fontSize: 12.5, color: U.dim, lineHeight: 2, marginTop: 8 }}>
              残った者は散り、あるいは捕らわれ、あるいは他家に仕える。
              ここで一局は終わりである。
            </div>
          </>
        )}

        <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.8, marginTop: 14 }}>
          閉じれば盤へ戻ります。{天下 ? "このまま天下の掃除を続けても構いません。" : "見物として盤を眺めることはできます。"}
        </div>
        <div className="g2" style={{ marginTop: 12 }}>
          <button className="btn" onClick={onClose}>盤へ戻る</button>
          <button className="btn dark" onClick={onTitle}>タイトルへ</button>
        </div>
      </div>
    </div>
  );
}
