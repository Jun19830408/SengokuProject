import React, { useRef } from "react";
import { U } from "../core/util.js";
import { FACTIONS } from "../data/factions.js";

export function Title({ saved, onStart, onContinue, onErase, onExport, onImport }) {
  const 控え口 = useRef(null);
  return (
    <div className="sp" style={{ height: "100dvh", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#CFE0EA 0%, #DDE6CC 42%, #C6D5A8 100%)" }} />
      <div style={{ position: "relative", textAlign: "center" }}>
        <div className="mn" style={{ fontSize: 46, letterSpacing: ".06em" }}>戦国プロジェクト</div>
        <div style={{ fontSize: 11, letterSpacing: ".42em", color: U.dim, marginTop: 8 }}>SENGOKU PROJECT</div>
        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 11, width: 280 }}>
          {saved && (
            <button className="btn dark" style={{ padding: "13px" }} onClick={onContinue}>
              続きから（{saved.state.year}年{saved.state.month}月・{(FACTIONS[saved.state.player] || {}).name}）
            </button>
          )}
          <button className={`btn ${saved ? "" : "dark"}`} style={{ padding: "13px" }} onClick={onStart}>
            {saved ? "新しくはじめる" : "ゲームをはじめる"}
          </button>
          {/* 控えの出し入れ。
              ブラウザの記憶は履歴を消せば一緒に消える。控えを手元に取っておけば、
              消えても戻せるうえ、別の端末へも移せる。 */}
          <div style={{ display: "flex", gap: 8 }}>
            {saved && (
              <button className="btn" style={{ padding: "9px", fontSize: 12, flex: 1 }}
                onClick={onExport}>控えを書き出す</button>
            )}
            <button className="btn" style={{ padding: "9px", fontSize: 12, flex: 1 }}
              onClick={() => 控え口.current && 控え口.current.click()}>控えから戻す</button>
          </div>
          <input ref={控え口} type="file" accept="application/json,.json" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) onImport(f); }} />
          {saved && (
            <button className="btn" style={{ padding: "9px", fontSize: 12 }}
              onClick={() => { if (window.confirm("記録を消します。よろしいですか。")) onErase(); }}>記録を消す</button>
          )}
        </div>
      </div>
      {/* 書き出した日時を出す。ネットに置いたものが古いままか、
          新しく上げ直したものかを、この一行で見分けられる。
          npm run build のときに焼き込まれる（tools/build.cjs）。 */}
      <div style={{ position: "absolute", left: 20, bottom: 16, fontSize: 11, color: U.dim }}>
        ver.0.2.0
        {typeof window !== "undefined" && window.__BUILD__ ? `　書き出し ${window.__BUILD__}` : ""}
      </div>
    </div>
  );
}

