import React, { useState, useEffect, useMemo } from "react";
import { U } from "../core/util.js";
import { 風雲の段, 段の番, 次の段, 月の行い一覧, 月の行いの数, 月の体力の戻り, 養生の戻り } from "./fuun.js";
import { 主命の重さ, 働きかけの見込み, 予定を見る, 月番を年月に, 山賊の月か, 偵察の月か, 偵察の的を選ぶ, 今の月番 } from "./shumei.js";
import { TOWNS } from "../data/castles.js";
import { 住まいの絵 } from "./sumai_e.jsx";

/* ==========================================================================
   風雲モードの屋敷の画面（五の三の骨組み）

   風雲モードの政務の画面は、キャンペーンと同じ全国地図を真ん中に出し、この屋敷の欄を地図の右（縦長の画面では
   地図の下）に置く（ui/MapScreen.jsx。遊ぶ人の申し出：「政務フェーズですが、キャンペーンモードと同じで全国地図を
   メインにしてください。家の図は小さくでも構いません」）。上の帯は 風雲の帯。主人公は大名ではないので、
   国や城の差配はできない。できるのは、月の行いを選んで月を送ることだけで、世界は
   キャンペーンと同じに一月ずつ動く（主家も諸家もAI）。上司の隊が野で戦う月には、
   地図画面が盤を開き、主人公は足軽としてその合戦に出る。

   以前の検討で決めた屋敷の中身のうち、この段で作るもの：
     住まいの絵（身分で替わる）・身分と勲功・上司の覚え・体力・能力・金・月の行い（三つまで）・自分の記
     主命（上司から下される務め。hitori/shumei.js）：中身・期限・褒美の札と、月の行い「主命に励む」
   武具・郎党・蔵は、のちの段で作る。
   ========================================================================== */

const 棒 = (値, 満, 色) => (
  <div style={{ height: 7, background: U.line2, borderRadius: 4, overflow: "hidden", marginTop: 3 }}>
    <div style={{ width: `${Math.max(0, Math.min(100, (値 / (満 || 1)) * 100))}%`, height: "100%", background: 色 }} />
  </div>
);

/* 住まいの絵は hitori/sumai_e.jsx（遊ぶ人の申し出「家の絵をもう少しリアルに」で描き直した） */
export { 住まいの絵 };

export function FuunYashiki({ g, land, onTitle, on月送り, on知らせを閉じる }) {
  const f = g.風雲;
  const [行い, set行い] = useState(() => (f.行い || []).slice(0, 月の行いの数));
  const 家 = g.factions[g.player] || {};
  const 城 = g.castles.find((c) => c.id === f.城);
  const 上 = g.generals.find((x) => x.id === f.上司);
  const 上の居所 = 上 ? (上.at ? (g.castles.find((c) => c.id === 上.at) || {}).name || "" : "出陣中") : "";
  const 今の段 = 風雲の段[段の番(f.身分)] || 風雲の段[0];
  const 次 = 次の段(f.身分);
  const 待つ戦 = (g.pendingArrivals || []).length > 0 || (g.clashes || []).length > 0;
  const 終わり = f.討死 ? "討死" : g.滅び ? "滅亡" : null;
  const 選ぶ = (名) => set行い((v) => (v.includes(名) ? v.filter((x) => x !== 名)
    : v.length >= 月の行いの数 ? v : [...v, 名]));
  /* 主命（上司から下される務め）。あるあいだは、月の行いに「主命に励む」が加わる。果たせば外れる */
  const 命 = f.主命;
  const 命の上 = 命 && g.generals.find((x) => x.id === 命.上司);
  const 命の町 = 命 && 命.町 && TOWNS.find((x) => x.id === 命.町);
  const 行い一覧 = 命 ? [...月の行い一覧, { 名: "主命に励む", 説: 命.種 === "山賊退治" ? "山賊を討ちに出る（月を送る前に、盤で合戦になる）"
    : `${命の町 ? 命の町.name : "町"}へ使いする（まとまる見込み およそ${Math.round(働きかけの見込み(f) * 10)}割）` }] : 月の行い一覧;
  useEffect(() => { if (!命) set行い((v) => v.filter((x) => x !== "主命に励む")); }, [!!命]); // eslint-disable-line
  const 山賊に出る = !!命 && 命.種 === "山賊退治" && 行い.includes("主命に励む");
  /* 務めの予定（三か月ごとの山賊退治・半年ごとの威力偵察。hitori/shumei.js）。偵察の的は月ごとに一度だけ見立てる */
  const 予 = 予定を見る(g);
  const 山賊の今 = 山賊の月か(g), 偵察の今 = 偵察の月か(g);
  const 偵の的 = useMemo(() => 偵察の的を選ぶ(g), [g.year, g.month, f.上司]); // eslint-disable-line
  const 年月の文 = (n) => { const x = 月番を年月に(n); return `${x.年}年${x.月}月`; };
  const 重く見る城 = f.偵察の的 && 今の月番(g) <= f.偵察の的.迄 ? g.castles.find((c) => c.id === f.偵察の的.城 && c.faction !== g.player) : null;
  const 出る務め = 偵察の今 && 偵の的 && 偵の的.城 ? "威力偵察" : 山賊の今 || 山賊に出る ? "山賊退治" : null;
  const 記 = [...(f.記 || [])].reverse().slice(0, 14);
  const 家中 = (g.monthEvents || []).slice(0, 8);

  const 身の欄 = (
    <div className="card" style={{ maxWidth: "none", maxHeight: "none", padding: 11 }}>
      <div style={{ maxWidth: land ? "100%" : 300, margin: land ? 0 : "0 auto" }}><住まいの絵 住まい={今の段.住まい} /></div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
        <span className="mn" style={{ fontSize: 21 }}>{f.名}</span>
        <span className="mn" style={{ fontSize: 16 }}>{f.身分}</span>
        <span style={{ fontSize: 11.5, color: U.dim, marginLeft: "auto" }}>住まい：{今の段.住まい}</span>
      </div>
      <div style={{ fontSize: 12, marginTop: 10 }}>
        勲功 <b className="num">{f.勲功}</b>
        <span style={{ color: U.dim }}>{次 ? `（${次.名}まで ${Math.max(0, 次.要 - f.勲功)}）` : ""}</span>
        {棒(次 ? f.勲功 - 今の段.要 : 1, 次 ? 次.要 - 今の段.要 : 1, "#A4462E")}
      </div>
      <div className="g2" style={{ marginTop: 8, gap: 10 }}>
        <div style={{ fontSize: 12 }}>上司の覚え <b className="num">{f.覚え}</b>{棒(f.覚え, 100, "#3D5A80")}</div>
        <div style={{ fontSize: 12 }}>体力 <b className="num">{f.体力}</b>{棒(f.体力, 100, "#4F7A52")}</div>
      </div>
      <div className="tbl" style={{ marginTop: 10, fontSize: 12.5 }}>
        <span className="k">能力</span>
        <span className="v num">武勇 {f.武勇}・統率 {f.統率}・知略 {f.知略}・政務 {f.政務}</span>
        <span className="k">金</span><span className="v num">{f.金} 貫</span>
        <span className="k">上司</span><span className="v">{上 ? `${上.name}（${上の居所}）` : "―"}</span>
        <span className="k">合戦</span><span className="v num">{f.合戦} 度・討ち取り {f.討ち取り}</span>
        <span className="k">務め・主命</span><span className="v num">果たした {(f.主命の数 || {}).果たした || 0}・しくじった {(f.主命の数 || {}).しくじった || 0}</span>
      </div>
    </div>
  );

  const 行いの欄 = (
    <div className="card" style={{ maxWidth: "none", maxHeight: "none", padding: 11 }}>
      {予 && !終わり && (
        <div style={{ border: `1px solid ${U.line2}`, borderRadius: 8, padding: "9px 11px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: U.dim, letterSpacing: ".12em" }}>務めの予定（上司の手の者として出る）</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.85, marginTop: 4 }}>
            山賊退治（三か月ごと）：<b className="num">{山賊の今 ? "今月" : 年月の文(予.山賊)}</b>
            <br />威力偵察（半年ごと）：<b className="num">{偵察の今 ? "今月" : 年月の文(予.偵察)}</b>
            <span style={{ color: U.dim }}>{偵の的 && 偵の的.城 ? `　的：${偵の的.城.name}（${偵の的.家名}・城の兵 およそ${Math.round(偵の的.兵).toLocaleString()}人）`
              : 偵の的 && 偵の的.訳 === "上司が出陣中" ? "　（上司が出陣中）" : "　（いまは的が無い）"}</span>
            {重く見る城 && <><br /><span style={{ color: U.dim }}>威力偵察で兵を減らした{重く見る城.name}を、家中では攻める的として重く見ている。</span></>}
          </div>
          <div style={{ fontSize: 11, color: U.dim, lineHeight: 1.7, marginTop: 3 }}>
            務めの月に「月を送る」と、盤で戦ってから月が送られる。山賊退治に勝てば褒美を得る。威力偵察で討たれた兵は、敵も味方も実際に減る。
          </div>
        </div>
      )}
      {命 && (
        <div style={{ border: "1px solid #C9A66B", background: "rgba(201,166,107,0.10)", borderRadius: 8, padding: "9px 11px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: U.dim, letterSpacing: ".12em" }}>主命{命の上 ? `（${命の上.name}より）` : ""}・{命.種}</div>
          <div className="mn" style={{ fontSize: 15, margin: "4px 0 5px", lineHeight: 1.6 }}>{命.文}</div>
          <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.7 }}>
            期限 <b className="num">{命.期限.年}年{命.期限.月}月</b>・重さ {命.重さ}
            ・果たせば 勲功{(主命の重さ[命.重さ] || {}).勲功}・覚え{(主命の重さ[命.重さ] || {}).覚え}・金{(主命の重さ[命.重さ] || {}).金}貫
            <br />月の行いに「主命に励む」を選んだ月に行う。しくじるか期限を過ぎれば、覚えが下がる。
          </div>
        </div>
      )}
      <div className="sec" style={{ marginTop: 0 }}>今月の行い（{月の行いの数}つまで）</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {行い一覧.map((x) => (
          <button key={x.名} className={`btn ${行い.includes(x.名) ? "on" : ""}`} style={{ textAlign: "left", padding: "9px 11px" }}
            disabled={!!終わり} onClick={() => 選ぶ(x.名)}>
            <b>{x.名}</b><span style={{ fontSize: 11.5, color: U.dim, marginLeft: 8 }}>{x.説}</span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: U.dim, marginTop: 6, lineHeight: 1.7 }}>
        金の要る行いは、金が足りなければ行えない（開墾・商いで得た金は、同じ月に使える）。月を越せば体力は{月の体力の戻り}戻り、養生を選べば、さらに{養生の戻り}戻る。
      </div>
      <div className="sec">{f.名}の記</div>
      <div style={{ fontSize: 12, lineHeight: 1.75 }}>
        {記.map((x, i) => (
          <div key={i} style={{ borderBottom: `1px solid ${U.line2}`, padding: "3px 0" }}>
            <span className="num" style={{ color: U.dim, marginRight: 6 }}>{x.年}.{x.月}</span>{x.文}
          </div>
        ))}
      </div>
      {家中.length > 0 && (<>
        <div className="sec">先月の家中の動き（{家.name}）</div>
        <div style={{ fontSize: 11.5, lineHeight: 1.7, color: U.dim }}>
          {家中.map((t, i) => <div key={i}>{t}</div>)}
        </div>
      </>)}
    </div>
  );

  /* 屋敷の欄。横長の画面では地図の右に幅を決めて、縦長の画面では地図の下に高さを決めて置く（ui/MapScreen.jsx） */
  return (
    <>
      <div style={{ flex: land ? "0 0 min(380px, 42%)" : "0 0 46%", minWidth: 0, minHeight: 0, overflowY: "auto",
        overscrollBehavior: "contain", background: U.paper, borderLeft: land ? `1px solid ${U.line}` : undefined,
        borderTop: land ? undefined : `1px solid ${U.line}`, padding: "10px max(10px, env(safe-area-inset-right)) 18px 10px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {身の欄}
          {行いの欄}
        </div>
        {/* 月を送る釦は、欄の下に留める（欄が細く長くなったので、繰らずに押せるように） */}
        <div style={{ position: "sticky", bottom: -18, background: U.paper, padding: "8px 0 18px", marginTop: 6 }}>
          <button className="btn dark" style={{ width: "100%", padding: 12 }}
            disabled={!!終わり || 待つ戦} onClick={() => on月送り(行い)}>
            {待つ戦 ? "合戦の始末を待っている…" : 出る務め ? `${出る務め}に出て、月を送る（${g.year}年${g.month}月）` : `月を送る（${g.year}年${g.month}月）`}
            <span style={{ fontSize: 11, opacity: 0.8, marginLeft: 8 }}>行い {行い.length}／{月の行いの数}</span>
          </button>
        </div>
      </div>
      {!終わり && (f.知らせ || []).length > 0 && (
        <div className="modal">
          <div className="card" style={{ maxWidth: 380, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: U.dim, letterSpacing: ".3em" }}>取り立て</div>
            <div className="mn" style={{ fontSize: 30, margin: "10px 0 4px" }}>{f.身分}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.9, color: U.dim }}>
              {f.知らせ.join("。")}。<br />住まいは{今の段.住まい}に移る。
            </div>
            <button className="btn dark" style={{ width: "100%", marginTop: 14 }} onClick={() => on知らせを閉じる && on知らせを閉じる()}>了</button>
          </div>
        </div>
      )}
      {終わり && (
        <div className="modal">
          <div className="card" style={{ maxWidth: 400, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: U.dim, letterSpacing: ".3em" }}>{終わり === "討死" ? "討死" : "主家滅亡"}</div>
            <div className="mn" style={{ fontSize: 26, margin: "10px 0 6px" }}>{f.名}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.9 }}>
              {終わり === "討死"
                ? `${f.討死.年}年${f.討死.月}月、${f.討死.場所 ? `${f.討死.場所}の戦で` : ""}討ち死にした。`
                : `${g.滅び.y}年${g.滅び.m}月、${家.name || "主家"}は滅んだ。`}
              <br />風雲はここで終わる。
            </div>
            <div className="tbl" style={{ margin: "12px auto 0", width: "fit-content", textAlign: "left" }}>
              <span className="k">身分</span><span className="v">{f.身分}</span>
              <span className="k">勲功</span><span className="v num">{f.勲功}</span>
              <span className="k">合戦</span><span className="v num">{f.合戦} 度・討ち取り {f.討ち取り}</span>
              <span className="k">仕えた年月</span><span className="v num">{f.始め ? `${f.始め.年}年${f.始め.月}月から` : ""}</span>
            </div>
            <button className="btn dark" style={{ width: "100%", marginTop: 14 }} onClick={() => onTitle && onTitle()}>題へ戻る</button>
          </div>
        </div>
      )}
    </>
  );
}

/* 風雲の政務の画面の上の帯（家・年月・主人公の城・題へ） */
export function 風雲の帯({ g, onTitle }) {
  const f = g.風雲, 家 = g.factions[g.player] || {};
  const 城 = g.castles.find((c) => c.id === f.城);
  return (
    <div className="bar">
      <div className="barin">
        <span className="mn" style={{ fontSize: 16 }}>風雲</span>
        <span className="num" style={{ fontSize: 13 }}>{g.year}年{g.month}月</span>
        <span className="dot" style={{ background: 家.color || "#888" }} />
        <span style={{ fontSize: 13 }}>{家.name}{城 ? `・${城.name}` : ""}</span>
        <span style={{ fontSize: 12, color: U.dim }}>{f.名}（{f.身分}）</span>
      </div>
      <button className="btn sm" onClick={() => {
        if (typeof window === "undefined" || window.confirm("題の画面へ戻ります。月を送るたびに「自動」へ収めています。よろしいですか。")) onTitle && onTitle();
      }}>題へ</button>
    </div>
  );
}
