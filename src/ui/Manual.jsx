import React, { useState } from "react";
import { 説明書, 題名, 副題 } from "../data/manual.js";
import { 写し } from "../data/shots.js";
import { U } from "../core/util.js";
import { 外を押して閉じる } from "./panels.jsx";

/* ==========================================================================
   遊び方（GDD 15.4）

   遊びながら開けるようにする。読み物を別に開かせるのでは、いざ知りたいときに
   手が止まる。章を横に並べ、押した章だけを出す。

   中身は src/data/manual.js ひとつから取る。配る PDF も同じ表から作るので、
   片方だけが古くなることがない。
   ========================================================================== */
export function Manual({ onClose, 章 = 0 }) {
  const [tab, setTab] = useState(章);
  const 今 = 説明書[Math.min(tab, 説明書.length - 1)];
  return (
    <div className="modal" {...外を押して閉じる(onClose)}>
      <div className="card" style={{ maxWidth: 560 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
          <div className="mn" style={{ fontSize: 21 }}>{題名}　遊び方</div>
          <div style={{ fontSize: 10, letterSpacing: ".3em", color: U.dim }}>{副題}</div>
        </div>

        {/* 章の見出し。狭い画面では折り返す */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
          {説明書.map((c, i) => (
            <button key={c.題} className={`btn sm ${i === tab ? "on" : ""}`}
              style={{ padding: "5px 9px", fontSize: 12 }}
              onClick={() => setTab(i)}>{c.題}</button>
          ))}
        </div>

        <div style={{ maxHeight: "62vh", overflow: "auto", paddingRight: 2 }}>
          {今.節.map((s, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              {s.見出し && <div className="sec" style={{ marginTop: i ? 12 : 0 }}>{s.見出し}</div>}
              {/* 実際の画面の写し（tools/shots.cjs が撮る）。絵を先に見せ、説きを添える。 */}
              {s.絵 && 写し[s.絵] && (
                <figure style={{ margin: "4px 0 10px" }}>
                  <img src={写し[s.絵]} alt={s.絵の説 || ""}
                    /* 縦長の写しが帳を埋め尽くさぬよう、丈に頭打ちを置く */
                    style={{ width: "100%", maxHeight: "40vh", objectFit: "contain",
                      display: "block", border: `1px solid ${U.line}`, borderRadius: 3,
                      background: "#EFEBE2" }} />
                  {s.絵の説 && (
                    <figcaption style={{ fontSize: 11, color: U.dim, lineHeight: 1.7, marginTop: 4 }}>
                      {s.絵の説}
                    </figcaption>
                  )}
                </figure>
              )}
              {(s.文 || []).map((t, k) => (
                <div key={k} style={{ fontSize: 13, lineHeight: 1.95, marginBottom: 6 }}>{t}</div>
              ))}
              {(s.表 || []).length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {s.表.map(([a, b], k) => (
                    <div key={k} style={{ display: "flex", gap: 10, padding: "4px 0",
                      borderBottom: `1px solid ${U.line2}`, fontSize: 12.5, lineHeight: 1.8 }}>
                      <span className="mn" style={{ flex: "0 0 34%", fontSize: 13 }}>{a}</span>
                      <span style={{ flex: 1, color: U.dim }}>{b}</span>
                    </div>
                  ))}
                </div>
              )}
              {(s.箇条 || []).map((t, k) => (
                <div key={k} style={{ display: "flex", gap: 7, fontSize: 12.5, lineHeight: 1.9, padding: "2px 0" }}>
                  <span style={{ color: U.dim }}>・</span><span>{t}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <button className="btn dark" style={{ width: "100%", marginTop: 12 }} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}
