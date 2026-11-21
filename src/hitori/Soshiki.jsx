import React, { useMemo, useEffect, useRef } from "react";
import { U } from "../core/util.js";
import { 組織の木 } from "./soshiki.js";

/* ==========================================================================
   風雲：大名家の組織の図（屋敷の画面の「家中の組織」から開く。木の組み方は hitori/soshiki.js）
     大名・旗頭・国主・城主は家の者をみな並べ、自分の城の城主の下に自分の筋（上司の武将・物頭から五人長までの上役・自分）を
     出す。自分の下には手勢（足軽なら同じ組の足軽を自分と並べて）を出す。大名から自分までの筋は太字、自分の行は色を付ける
   ========================================================================== */

function 節の行({ n, 深さ, 自分の行 }) {
  return (
    <div>
      <div ref={n.自分 ? 自分の行 : null} style={{
        display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0 6px", padding: "3px 6px", borderRadius: 5,
        background: n.自分 ? "rgba(164,70,46,.14)" : "transparent",
      }}>
        <span style={{ fontSize: 11, color: U.dim, minWidth: 0 }}>{n.身分}</span>
        <span className={n.武将 ? "mn" : ""} style={{ fontSize: n.武将 ? 14.5 : 13.5, fontWeight: n.筋 ? 700 : 400, color: n.欠 ? "#B0483C" : U.text }}>{n.名}</span>
        {n.添 && <span style={{ fontSize: 11, color: U.dim }}>{n.添}</span>}
        {n.上司 && <span style={{ fontSize: 10.5, color: "#3D5A80", border: "1px solid #3D5A80", borderRadius: 4, padding: "0 4px" }}>上司</span>}
        {n.自分 && <span style={{ fontSize: 10.5, color: "#FFF", background: "#A4462E", borderRadius: 4, padding: "0 5px" }}>あなた</span>}
      </div>
      {n.子.length > 0 && (
        <div style={{ marginLeft: 7, paddingLeft: 7, borderLeft: `1px solid ${n.筋 ? "#A4462E" : U.line2}` }}>
          {n.子.map((k, i) => <節の行 key={i} n={k} 深さ={深さ + 1} 自分の行={自分の行} />)}
        </div>
      )}
    </div>
  );
}

export function 組織の図({ g, on閉じる }) {
  const 木 = useMemo(() => 組織の木(g), [g]);
  const 自分の行 = useRef(null), 枠 = useRef(null);
  /* 開いたとき、自分の行が枠の真ん中に来るよう、木の枠の中だけを動かす（札そのものは動かさない。見出しが隠れないように） */
  useEffect(() => {
    const 行 = 自分の行.current, 箱 = 枠.current;
    if (!行 || !箱 || !行.getBoundingClientRect) return;
    const 差 = 行.getBoundingClientRect().top - 箱.getBoundingClientRect().top;
    箱.scrollTop = Math.max(0, 箱.scrollTop + 差 - 箱.clientHeight / 2 + 行.clientHeight / 2);
  }, [木]);
  if (!木) return null;
  const 家 = (g.factions || {})[g.player] || {};
  return (
    <div className="modal">
      <div className="card" style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ fontSize: 12, color: U.dim, letterSpacing: ".3em", textAlign: "center" }}>家中の組織</div>
        <div className="mn" style={{ fontSize: 20, margin: "6px 0 4px", textAlign: "center" }}>{家.name}</div>
        <div style={{ fontSize: 11, color: U.dim, lineHeight: 1.7 }}>
          大名の下に旗頭・国主・城主をみな並べ（旗頭・国主の寄騎はその下）、自分の住む城の城主の下に自分の筋を出す。
          物頭から五人長までの上役と同じ組の者は、武将の帳に載らない家中の者。
        </div>
        <div ref={枠} style={{ maxHeight: "58vh", overflowY: "auto", marginTop: 8, border: `1px solid ${U.line2}`, borderRadius: 8, padding: "6px 4px" }}>
          <節の行 n={木} 深さ={0} 自分の行={自分の行} />
        </div>
        <button className="btn dark" style={{ width: "100%", marginTop: 10 }} onClick={() => on閉じる && on閉じる()}>閉じる</button>
      </div>
    </div>
  );
}
