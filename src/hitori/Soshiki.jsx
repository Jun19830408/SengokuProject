import React, { useMemo, useEffect, useRef } from "react";
import { U } from "../core/util.js";
import { 組織の木, 身の上を見る } from "./soshiki.js";

/* ==========================================================================
   風雲：大名家の組織の図（地図の左の「組織」と、屋敷の画面の「家中の組織」から開く。木の組み方は hitori/soshiki.js）
     大名・旗頭・国主・城主は家の者をみな並べ、自分の城の城主の下に自分の筋（上司の武将・物頭から五人長までの上役・自分）を
     出す。自分の下には手勢（足軽なら同じ組の足軽を自分と並べて）を出す。大名から自分までの筋は太字、自分の行は色を付ける
   身の上の図（地図の左の「身の上」から開く。中身は hitori/soshiki.js 身の上を見る）：自分の能力と自隊の様子を一つの窓に
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

const 棒 = (値, 満, 色) => (
  <div style={{ height: 6, background: U.line2, borderRadius: 4, overflow: "hidden", marginTop: 3 }}>
    <div style={{ width: `${Math.max(0, Math.min(100, (値 / (満 || 1)) * 100))}%`, height: "100%", background: 色 }} />
  </div>
);
const 段の見出し = (文) => <div style={{ fontSize: 11.5, color: U.dim, letterSpacing: ".2em", margin: "10px 0 4px" }}>{文}</div>;

export function 身の上の図({ g, on閉じる }) {
  const 身 = useMemo(() => 身の上を見る(g), [g]);
  if (!身) return null;
  const { 自分: 我, 隊 } = 身;
  const 属 = 隊.属する;
  return (
    <div className="modal">
      <div className="card" style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ fontSize: 12, color: U.dim, letterSpacing: ".3em", textAlign: "center" }}>身の上</div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10, margin: "6px 0 2px" }}>
          <span className="mn" style={{ fontSize: 21 }}>{我.名}</span>
          <span className="mn" style={{ fontSize: 15 }}>{我.身分}</span>
          <span className="num" style={{ fontSize: 12, color: U.dim }}>{我.齢}歳</span>
        </div>
        <div style={{ maxHeight: "62vh", overflowY: "auto", marginTop: 6, paddingRight: 2 }}>
          {段の見出し("自分")}
          <div className="tbl" style={{ fontSize: 12.5 }}>
            <span className="k">家・城</span><span className="v">{我.家}{我.城 ? `・${我.城}` : ""}（住まい：{我.住まい}）</span>
            <span className="k">上司</span><span className="v">{我.上司 ? `${我.上司.名}（${我.上司.居所}）` : "―"}</span>
            {我.禄 ? (
              <>
                <span className="k">禄高</span><span className="v num">{我.禄.禄高} 石（知行 {我.禄.知行} 石）{我.禄.次 ? `・${我.禄.次.key}まで あと${我.禄.次.足りぬ}石` : ""}</span>
                <span className="k">勲功</span><span className="v num">{我.勲功}（まだ賞されていない {我.禄.未賞}）</span>
              </>
            ) : (
              <><span className="k">勲功</span><span className="v num">{我.勲功}{我.次 ? `（${我.次.名}まで あと${我.次.あと}）` : ""}</span></>
            )}
            <span className="k">能力</span><span className="v num">武勇 {我.武勇}・統率 {我.統率}・知略 {我.知略}・政務 {我.政務}</span>
            <span className="k">金</span><span className="v num">{我.金} 貫</span>
            <span className="k">合戦</span><span className="v num">{我.合戦} 度・討ち取り {我.討ち取り}</span>
            <span className="k">務め・主命</span><span className="v num">果たした {我.果たした}・しくじった {我.しくじった}</span>
          </div>
          <div className="g2" style={{ marginTop: 6, gap: 10 }}>
            <div style={{ fontSize: 12 }}>上司の覚え <b className="num">{我.覚え}</b>{棒(我.覚え, 100, "#3D5A80")}</div>
            <div style={{ fontSize: 12 }}>体力 <b className="num">{我.体力}</b>{棒(我.体力, 100, "#4F7A52")}</div>
          </div>
          {段の見出し(隊.種 === "組" ? "自隊（属する組）" : 隊.種 === "手勢" ? "自隊（率いる手勢）" : 隊.種 === "預かる隊" ? "自隊（預かる隊）" : "自隊")}
          <div style={{ fontSize: 13, fontWeight: 700 }}>{隊.名}</div>
          {隊.種 === "手勢" && (
            <div className="tbl" style={{ fontSize: 12.5, marginTop: 4 }}>
              <span className="k">人数</span><span className="v num">{隊.人}／定め {隊.定} 人{隊.欠け ? `（欠員 ${隊.欠け}）` : ""}{隊.馬上 ? "・馬上で率いる" : ""}</span>
              <span className="k">統率</span><span className="v num">{隊.統率 != null ? `手勢 ${隊.統率}・自分 ${我.統率} → 合戦で ${隊.合戦の統率}` : `自分 ${我.統率}（手勢の名簿はまだ整っていない）`}</span>
              <span className="k">武勇</span><span className="v num">{隊.武勇 != null ? `手勢の均し ${隊.武勇}` : "―"}</span>
              <span className="k">扶持</span><span className="v num">{隊.扶持 != null ? `${隊.扶持}／枠 ${隊.枠}` : `枠 ${隊.枠}`}</span>
            </div>
          )}
          {(隊.種 === "預かる隊" || 隊.種 === "自分の隊") && (
            <div className="tbl" style={{ fontSize: 12.5, marginTop: 4 }}>
              <span className="k">将</span><span className="v">{隊.将 || "―"}{隊.位 ? `（${隊.位}）` : ""}{隊.役 ? `・${隊.役}` : ""}</span>
              <span className="k">直属の兵</span><span className="v num">{隊.兵 ?? "―"} 人・練度 {隊.練度 ?? "―"}・将の統率 {隊.統率 ?? "―"}</span>
              {隊.城 && <><span className="k">城</span><span className="v num">{隊.城.名}（城の兵 {隊.城.兵} 人・石高 {隊.城.石高} 石）</span></>}
            </div>
          )}
          {隊.列.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6 }}>
              {隊.列.map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0 6px", fontSize: 12.5, padding: "2px 6px", borderRadius: 5,
                  background: m.自分 ? "rgba(164,70,46,.14)" : "transparent", borderBottom: `1px solid ${U.line2}` }}>
                  <span style={{ fontSize: 11, color: U.dim }}>{m.身分}</span>
                  <span style={{ color: m.欠 ? "#B0483C" : U.text, fontWeight: m.長 || m.自分 ? 700 : 400 }}>{m.名}</span>
                  {m.自分 && <span style={{ fontSize: 10.5, color: "#FFF", background: "#A4462E", borderRadius: 4, padding: "0 5px" }}>あなた</span>}
                  {m.定 > 1 && <span className="num" style={{ fontSize: 11, color: U.dim }}>{m.人}／{m.定}人</span>}
                  {m.統率 != null && <span className="num" style={{ fontSize: 11, color: U.dim }}>統率 {m.統率}・武勇 {m.武勇}・扶持 {m.扶持}</span>}
                </div>
              ))}
            </div>
          )}
          {属 && (
            <div style={{ fontSize: 12, color: U.dim, marginTop: 8, lineHeight: 1.7 }}>
              属する隊：{属.将}の隊（{属.位}・直属の兵 {属.兵} 人・練度 {属.練度}）。合戦ではこの隊の一員として出る。
            </div>
          )}
        </div>
        <button className="btn dark" style={{ width: "100%", marginTop: 10 }} onClick={() => on閉じる && on閉じる()}>閉じる</button>
      </div>
    </div>
  );
}
