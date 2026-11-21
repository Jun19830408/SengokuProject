import React, { useState } from "react";
import { U } from "../core/util.js";
import { 姫の齢 } from "../core/hime.js";
import { 主人公の妻, 主人公の姓, 子の呼び名, 子の齢, 子が生きるか, 元服を待つ子, 子の生まれる見込み, 子を生む齢の限り, 主人公の子の限り } from "./kazoku.js";
import { 名乗りの限り } from "./fuun.js";

/* ==========================================================================
   風雲：主人公の妻子の画面（hitori/kazoku.js）
     妻子の欄   … 屋敷の欄。妻と子（幼名・齢）を並べる
     縁談の問い … 正月に主君から縁談があれば、娶るか断るかを問う（屋敷）
     元服の問い … 子が十五になれば、名を自分で決めるか自動で決めるかを問う（屋敷と、大名になってからのキャンペーンの画面）
   ========================================================================== */

export function 妻子の欄({ g }) {
  const f = g.風雲;
  const 妻 = 主人公の妻(g);
  const 子ら = f.子ら || [];
  return (
    <div className="card" style={{ maxWidth: "none", maxHeight: "none", padding: 11 }}>
      <div className="sec" style={{ marginTop: 0 }}>妻子</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
        {妻 ? <>妻 <b className="mn" style={{ fontSize: 14 }}>{妻.name}</b><span className="num" style={{ color: U.dim }}>（{姫の齢(g, 妻)}歳）</span></>
          : <span style={{ color: U.dim }}>妻はまだいない。</span>}
      </div>
      {子ら.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
          {子ら.map((c) => (
            <div key={c.id} style={{ fontSize: 12.5, borderBottom: `1px solid ${U.line2}`, paddingBottom: 3, color: 子が生きるか(g, c) ? U.text : U.dim }}>
              <span style={{ color: U.dim, marginRight: 6 }}>{c.性 === "男" ? "男子" : "女子"}</span>
              <span className="mn" style={{ fontSize: 14 }}>{子の呼び名(g, c)}</span>
              <span className="num" style={{ color: U.dim, marginLeft: 6 }}>
                {子が生きるか(g, c) ? `${子の齢(g, c)}歳` : "世を去った"}{!c.名 && 子が生きるか(g, c) ? "・幼名" : ""}
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: U.dim, marginTop: 6, lineHeight: 1.7 }}>
        家老から上で妻のいないあいだは、正月に主君から縁談があることがある（家の姫で、城にいて嫁いでいない者がいれば）。
        妻がいれば、正月ごとに子が生まれることがある（見込み{Math.round(子の生まれる見込み * 100)}%・男女は半々・妻が{子を生む齢の限り}歳まで・{主人公の子の限り}人まで）。
        幼名は自動で付き、十五になれば名を選ぶ。大名になれば、男子は武将の帳に、名を定めた娘は姫の帳に入る。
      </div>
    </div>
  );
}

export function 縁談の問い({ g, on答える }) {
  const f = g.風雲, 談 = f && f.縁談;
  const h = 談 && (g.hime || []).find((x) => x.id === 談.himeId);
  if (!談 || !h) return null;
  return (
    <div className="modal">
      <div className="card" style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 12, color: U.dim, letterSpacing: ".3em", textAlign: "center" }}>縁談</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.95, marginTop: 8 }}>
          {談.当主 || "主君"}より、<b className="mn" style={{ fontSize: 16 }}>{h.name}</b>
          （{姫の齢(g, h)}歳・外交{h.dip}・統率{h.lead}）を娶れとの話があった。
        </div>
        {h.伝 && <div style={{ fontSize: 12, color: U.dim, marginTop: 4 }}>{h.伝}</div>}
        <div style={{ fontSize: 12, color: U.dim, lineHeight: 1.85, marginTop: 8 }}>
          娶れば{h.name}を妻に迎え、一門に列する（キャンペーンで姫を家臣に嫁がせたときと同じ）。妻がいれば、正月ごとに子が生まれることがある。
          断っても咎めは無い。
        </div>
        <div className="g2" style={{ marginTop: 14 }}>
          <button className="btn" onClick={() => on答える(false)}>断る</button>
          <button className="btn dark" onClick={() => on答える(true)}>娶る</button>
        </div>
      </div>
    </div>
  );
}

export function 元服の問い({ g, on決める }) {
  const c = 元服を待つ子(g)[0] || null;
  const [道, set道] = useState(null);
  const [入れ名, set入れ名] = useState("");
  const [番, set番] = useState(0);
  if (!c) return null;
  const 男 = c.性 === "男";
  const 姓 = 男 ? 主人公の姓(g) : "";
  const 訳 = (n) => (!String(n).trim() ? "名を入れてください" : String(n).trim().length > 名乗りの限り ? `名は${名乗りの限り}字までです` : null);
  const 候補 = c.名の候補 || [];
  const 決める = (n) => { if (訳(n)) return; on決める(c.id, String(n).trim()); set道(null); set入れ名(""); set番(0); };
  const 見せる名 = (n) => (男 ? `${姓}${n}` : n);
  return (
    <div className="modal">
      <div className="card" style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 12, color: U.dim, letterSpacing: ".3em", textAlign: "center" }}>{男 ? "元服" : "名を定める"}</div>
        <div className="mn" style={{ fontSize: 22, margin: "8px 0 6px", textAlign: "center" }}>{子の呼び名(g, c)}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.85, color: U.dim }}>
          {男 ? `${子の呼び名(g, c)}が十五になり、元服する。姓は${姓}を継ぐ。名を自分で決めるか、自動で決めるかを選ぶ。`
            : `${子の呼び名(g, c)}が十五になった。名を自分で決めるか、自動で決めるかを選ぶ。`}
        </div>
        <div className="g2" style={{ marginTop: 10 }}>
          <button className={`btn ${道 === "自分" ? "on" : ""}`} onClick={() => set道("自分")}>自分で決める</button>
          <button className={`btn ${道 === "自動" ? "on" : ""}`} onClick={() => set道("自動")}>自動で決める</button>
        </div>
        {道 === "自分" && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              {男 && <span className="mn" style={{ fontSize: 15 }}>{姓}</span>}
              <span>名</span>
              <input value={入れ名} maxLength={名乗りの限り} onChange={(e) => set入れ名(e.target.value)} placeholder={男 ? "例：秀勝" : "例：鶴姫"}
                style={{ flex: 1, minWidth: 0, padding: "7px 8px", fontSize: 15, border: `1px solid ${U.line2}`, borderRadius: 6, background: "transparent", color: U.text }} />
            </div>
            {訳(入れ名) && 入れ名 && <div style={{ fontSize: 11.5, color: "#B0483C", marginTop: 5 }}>{訳(入れ名)}</div>}
            <button className="btn dark" style={{ width: "100%", marginTop: 10 }} disabled={!!訳(入れ名)}
              onClick={() => 決める(入れ名)}>{訳(入れ名) ? "名を入れる" : `${見せる名(入れ名.trim())}と${男 ? "名乗らせる" : "名を定める"}`}</button>
          </div>
        )}
        {道 === "自動" && (
          <div style={{ marginTop: 10 }}>
            <div className="g2">
              {候補.map((x, i) => (
                <button key={i} className={`btn mn ${番 === i ? "on" : ""}`} style={{ fontSize: 17 }} onClick={() => set番(i)}>{見せる名(x)}</button>
              ))}
            </div>
            {候補[番] && (
              <button className="btn dark" style={{ width: "100%", marginTop: 10 }} onClick={() => 決める(候補[番])}>
                {見せる名(候補[番])}と{男 ? "名乗らせる" : "名を定める"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
