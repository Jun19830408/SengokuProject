import React, { useRef, useState } from "react";
import { 題字, 絵にする } from "../data/logo.js";
import { Manual } from "./Manual.jsx";
import { U } from "../core/util.js";
import { FACTIONS } from "../data/factions.js";
import { 記録の見出し } from "../save/save.js";

/* 記録の一行。年月・家・石高・城数と、いつ収めたかを並べる。
   空いている枠も「空き」として出す。どこが空いているか見えないと、
   どこへ収めればよいのか分からない。 */
function 記録の札({ 枠, onLoad, onErase }) {
  const h = 記録の見出し(枠.d, FACTIONS);
  const 日時 = h && h.at
    ? new Date(h.at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px",
      border: `1px solid ${h ? U.line : U.line2}`, borderRadius: 6,
      background: h ? "rgba(255,255,255,0.5)" : "transparent" }}>
      <span style={{ fontSize: 10.5, color: U.dim, width: 44, letterSpacing: ".08em" }}>{枠.名}</span>
      {h ? (
        <>
          <span className="dot" style={{ background: h.色 }} />
          <button className="btn" style={{ flex: 1, padding: "7px 9px", textAlign: "left", fontSize: 12.5 }}
            onClick={() => onLoad(枠.key)}>
            <b className="mn" style={{ fontSize: 14 }}>{h.家}</b>
            <span className="num" style={{ color: U.dim, marginLeft: 7 }}>
              {h.年}年{h.月}月／{h.城数}城・{h.万石}万石{h.見物 ? "／見物" : ""}
            </span>
            {日時 && <span style={{ color: U.dim, fontSize: 10.5, marginLeft: 7 }}>{日時}</span>}
          </button>
          <button className="btn" style={{ padding: "6px 8px", fontSize: 11 }}
            title="この枠の記録を消す"
            onClick={() => { if (window.confirm(`${枠.名}（${h.家}・${h.年}年${h.月}月）を消します。よろしいですか。`)) onErase(枠.key); }}>消</button>
        </>
      ) : (
        <span style={{ flex: 1, fontSize: 12, color: U.dim, padding: "7px 0" }}>空き</span>
      )}
    </div>
  );
}

export function Title({ saves, onStart, onLoad, onErase, onExport, onImport }) {
  const [遊び方, set遊び方] = useState(false);
  const 控え口 = useRef(null);
  const 在る = (saves || []).filter((w) => w.d);
  const 最新 = 在る.length
    ? 在る.reduce((a, w) => ((w.d.at || 0) > (a.d.at || 0) ? w : a), 在る[0]) : null;
  return (
    <div className="sp" style={{ height: "100dvh", alignItems: "center", justifyContent: "center", position: "relative", overflow: "auto" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#CFE0EA 0%, #DDE6CC 42%, #C6D5A8 100%)" }} />
      <div style={{ position: "relative", textAlign: "center", padding: "24px 0" }}>
        {/* 題（GDD 1.1）。絵の題字が来たので置き換えた。
            横に組むときは題字を使う、という決まりに従う。印章と副題は題字の中に
            入っているので、ここで字を重ねる必要はない。
            幅は四百六十まで。それより狭い画面では画面なりに縮む。 */}
        <img src={絵にする(題字)} alt="センゴク盤" width="460"
          style={{ width: "min(460px, 92vw)", height: "auto", display: "block", margin: "0 auto" }} />
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 9, width: 360, maxWidth: "92vw" }}>
          {最新 && (
            <button className="btn dark" style={{ padding: "13px" }} onClick={() => onLoad(最新.key)}>
              続きから（{最新.名}・{最新.d.state.year}年{最新.d.state.month}月・
              {(FACTIONS[最新.d.state.player] || {}).name}）
            </button>
          )}
          <button className={`btn ${最新 ? "" : "dark"}`} style={{ padding: "13px" }} onClick={onStart}>
            {最新 ? "新しくはじめる" : "ゲームをはじめる"}
          </button>
          {/* 初めて開いた人が、まず読めるように。遊びの中からも同じものが開ける。 */}
          <button className="btn" style={{ padding: "11px" }} onClick={() => set遊び方(true)}>遊び方を読む</button>
          {在る.some((w) => w.自動) && (
            <div style={{ fontSize: 11, color: U.dim, lineHeight: 1.7, textAlign: "left", marginTop: -3 }}>
              新しく始めると、いま「自動」にある盤は空いている枠へ移して取っておきます。
            </div>
          )}

          <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, marginTop: 6, textAlign: "left" }}>
            記録所　（押せばその盤から始まります）
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {(saves || []).map((w) => (
              <記録の札 key={w.key} 枠={w} onLoad={onLoad} onErase={onErase} />
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: U.dim, lineHeight: 1.7, textAlign: "left" }}>
            「自動」は月が替わるたびに勝手に上書きされます。取っておきたい盤は、
            遊びの中の「記録」から一〜五のどれかへ収めてください。
          </div>

          {/* 控えの出し入れ。
              ブラウザの記憶は履歴を消せば一緒に消える。控えを手元に取っておけば、
              消えても戻せるうえ、別の端末へも移せる。 */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {最新 && (
              <button className="btn" style={{ padding: "9px", fontSize: 12, flex: 1 }}
                onClick={() => onExport(最新.key)}>控えを書き出す</button>
            )}
            <button className="btn" style={{ padding: "9px", fontSize: 12, flex: 1 }}
              onClick={() => 控え口.current && 控え口.current.click()}>控えから戻す</button>
          </div>
          <input ref={控え口} type="file" accept="application/json,.json" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) onImport(f); }} />
        </div>
      </div>
      {/* 書き出した日時を出す。ネットに置いたものが古いままか、
          新しく上げ直したものかを、この一行で見分けられる。 */}
      <div style={{ position: "absolute", left: 20, bottom: 16, fontSize: 11, color: U.dim }}>
        ver.0.2.0
        {typeof window !== "undefined" && window.__BUILD__ ? `　書き出し ${window.__BUILD__}` : ""}
      </div>
      {遊び方 && <Manual onClose={() => set遊び方(false)} />}
    </div>
  );
}
