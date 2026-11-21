import React, { useState, useEffect, useMemo } from "react";
import { U } from "../core/util.js";
import { 風雲の段, 段の番, 次の段, 月の行い一覧, 月の行いの数, 月の体力の戻り, 養生の戻り, 武将の段か, 主人公の禄高, 主人公の次の身分,
  主人公の城, 城の政務, 城の政務を行う, 城の預けの月分, 名乗りを定める, 名乗りの限り, 主人公の齢, 城主の段か, 仕官の物語 } from "./fuun.js";
import { 組織の図 } from "./Soshiki.jsx";
import { 主人公の妻, 縁談に答える, 元服させる, 元服を待つ子 } from "./kazoku.js";
import { 妻子の欄, 縁談の問い, 元服の問い } from "./Kazoku.jsx";
import { 家の城主ら, 誼を通じる, 城主を調略する, 下剋上の構え, 独立の構え, 当主の城, 誼の費え, 調略の費え, 調略の見込み } from "./daimyo.js";
import { 姓 } from "../core/util.js";
import { 主命の重さ, 働きかけの見込み, 予定を見る, 月番を年月に, 山賊の月か, 偵察の月か, 偵察の的を選ぶ, 今の月番 } from "./shumei.js";
import { TOWNS } from "../data/castles.js";
import { 住まいの絵 } from "./sumai_e.jsx";
import { 名簿の形を見る, 手勢の名簿を整える, 雇えるか, 手勢を雇う, 暇を出す, 今の統率, 名簿の扶持, 手勢の統率を量る,
  補充できるか, 補充する, みな補充する, 欠けの数, 欠けの和, 新参の値 } from "./tezei_meibo.js";
import { 実効の統率 } from "./tezei.js";

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

/* 月を送っている … 務め（山賊退治・威力偵察）の盤から屋敷へ戻り、その月を送っているあいだ（ui/MapScreen.jsx 務めのあとで月を送る） */
export function FuunYashiki({ g, land, onTitle, on月送り, 月を送っている, on知らせを閉じる, on風雲を改める, on盤を改める, on出陣, on攻め寄せる, on陣を解く, on下剋上, on独立 }) {
  const f = g.風雲;
  const [行い, set行い] = useState(() => (f.行い || []).slice(0, 月の行いの数));
  const 家 = g.factions[g.player] || {};
  const 城 = g.castles.find((c) => c.id === f.城);
  const 上 = g.generals.find((x) => x.id === f.上司);
  const 上の居所 = 上 ? (上.at ? (g.castles.find((c) => c.id === 上.at) || {}).name || "" : "出陣中") : "";
  const 今の段 = 風雲の段[段の番(f.身分)] || 風雲の段[0];
  const 次 = 次の段(f.身分);
  /* 物頭から上：禄高・次の身分・まだ賞されていない勲功（hitori/fuun.js 武将の段） */
  const 武将 = 武将の段か(f.身分) && f.知行 != null;
  const 禄 = 武将 ? 主人公の禄高(g) : 0, 禄の次 = 武将 ? 主人公の次の身分(g) : null;
  const 未賞 = 武将 ? Math.max(0, f.勲功 - (f.賞した勲功 == null ? f.勲功 : f.賞した勲功)) : 0;
  const 待つ戦 = (g.pendingArrivals || []).length > 0 || (g.clashes || []).length > 0;
  const 終わり = f.討死 ? "討死" : g.滅び ? "滅亡" : null;
  /* 名乗り（物頭に取り立てられたとき。hitori/fuun.js 名乗りの支度）：自分で決めるか、自動（偏諱の候補）か */
  const 待つ名 = f.名乗りを待つ || null;
  const [名の道, set名の道] = useState(null);
  const [入れ姓, set入れ姓] = useState(""), [入れ名, set入れ名] = useState("");
  const [候補の番, set候補の番] = useState(0);
  const 名の訳 = (姓, 名) => (!String(姓).trim() || !String(名).trim() ? "姓と名をどちらも入れてください"
    : String(姓).trim().length > 名乗りの限り || String(名).trim().length > 名乗りの限り ? `姓と名は、それぞれ${名乗りの限り}字までです` : null);
  const 名乗る = (姓, 名) => { if (名の訳(姓, 名)) return; on風雲を改める && on風雲を改める((n風雲, n盤) => { 名乗りを定める(n盤, 姓, 名); }); set名の道(null); };
  /* 家中の組織の図（hitori/Soshiki.jsx）と、仕官の物語の札（風雲を始めた月に一度だけ。hitori/fuun.js 仕官の物語） */
  const [組織を見る, set組織を見る] = useState(false);
  const 序 = f.序を見た === false && f.身分 === "足軽" && !(f.合戦 > 0);   // 始めのうち（まだ足軽で、合戦にも出ていない）だけ
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
  /* 手勢（五人長から三百人長。hitori/tezei_meibo.js。案の②）。名簿が無いか、身分や月が改まっていれば整える */
  const 形 = 名簿の形を見る(f.身分), 月の鍵 = `${g.year}-${g.month}`;
  const 整え要る = !!形 && !f.討死 && (!f.手勢 || f.手勢.身分 !== f.身分 || f.手勢.候補の月 !== 月の鍵);
  useEffect(() => { if (整え要る && on風雲を改める) on風雲を改める((ff, gg) => 手勢の名簿を整える(ff, gg.year, gg.month)); }, [整え要る, f.身分, 月の鍵]); // eslint-disable-line
  const 手 = 形 && f.手勢 && f.手勢.身分 === f.身分 ? f.手勢 : null;
  const 家中 = (g.monthEvents || []).slice(0, 8);
  /* 妻子（hitori/kazoku.js）：家老から上か、妻か子があれば欄を出す。縁談・元服の問いは、名乗りの問いのあとに出す */
  const 妻子を出す = !f.討死 && (城主の段か(f.身分) || !!主人公の妻(g) || (f.子ら || []).length > 0);
  const 待つ元服 = 元服を待つ子(g);

  const 身の欄 = (
    <div className="card" style={{ maxWidth: "none", maxHeight: "none", padding: 11 }}>
      <div style={{ maxWidth: land ? "100%" : 300, margin: land ? 0 : "0 auto" }}><住まいの絵 住まい={今の段.住まい} /></div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
        <span className="mn" style={{ fontSize: 21 }}>{f.名}</span>
        <span className="mn" style={{ fontSize: 16 }}>{f.身分}</span>
        <span style={{ fontSize: 11.5, color: U.dim, marginLeft: "auto" }}>住まい：{今の段.住まい}</span>
      </div>
      {武将 ? (
        /* 物頭から上：禄高で身分が上がる。勲功は論功行賞で加増に換わる（hitori/fuun.js 武将の段） */
        <>
          <div style={{ fontSize: 12, marginTop: 10 }}>
            禄高 <b className="num">{禄}</b> 石
            <span style={{ color: U.dim }}>{禄の次 ? `（${禄の次.key}まで ${禄の次.要る}石。あと${禄の次.足りぬ}石）` : "（宿老）"}</span>
            {棒(禄の次 ? 禄 : 1, 禄の次 ? 禄の次.要る : 1, "#A4462E")}
          </div>
          <div style={{ fontSize: 12, marginTop: 6 }}>
            勲功 <b className="num">{f.勲功}</b>
            <span style={{ color: U.dim }}>（まだ賞されていない勲功 {未賞}。勲功を得た次の月送りか、正月・七月の論功行賞で加増に換わる）</span>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, marginTop: 10 }}>
          勲功 <b className="num">{f.勲功}</b>
          <span style={{ color: U.dim }}>{次 && 次.要 != null ? `（${次.名}まで ${Math.max(0, 次.要 - f.勲功)}）` : ""}</span>
          {棒(次 && 次.要 != null ? f.勲功 - 今の段.要 : 1, 次 && 次.要 != null ? 次.要 - 今の段.要 : 1, "#A4462E")}
        </div>
      )}
      <div className="g2" style={{ marginTop: 8, gap: 10 }}>
        <div style={{ fontSize: 12 }}>上司の覚え <b className="num">{f.覚え}</b>{棒(f.覚え, 100, "#3D5A80")}</div>
        <div style={{ fontSize: 12 }}>体力 <b className="num">{f.体力}</b>{棒(f.体力, 100, "#4F7A52")}</div>
      </div>
      <div className="tbl" style={{ marginTop: 10, fontSize: 12.5 }}>
        <span className="k">齢</span><span className="v num">{主人公の齢(g)} 歳</span>
        <span className="k">能力</span>
        <span className="v num">武勇 {f.武勇}・統率 {f.統率}・知略 {f.知略}・政務 {f.政務}</span>
        <span className="k">金</span><span className="v num">{f.金} 貫</span>
        {武将 && <><span className="k">知行</span><span className="v num">{f.知行} 石</span></>}
        <span className="k">上司</span><span className="v">{上 ? `${上.name}（${上の居所}）` : "―"}</span>
        <span className="k">合戦</span><span className="v num">{f.合戦} 度・討ち取り {f.討ち取り}</span>
        <span className="k">務め・主命</span><span className="v num">果たした {(f.主命の数 || {}).果たした || 0}・しくじった {(f.主命の数 || {}).しくじった || 0}</span>
      </div>
      <button className="btn sm" style={{ marginTop: 8 }} onClick={() => set組織を見る(true)}>家中の組織</button>
    </div>
  );

  /* 手勢の欄：名簿（今の統率＝素質×練れ・武勇・扶持。暇を出せる）と、今月の候補（雇える。扶持の枠と、候補の数が縛り）。
     合戦で討たれた兵の跡は欠員（隊なら人数の欠け）になり、扶持もそのぶん下がる。欠員は新参で埋めるか、候補を雇って埋める
     （遊ぶ人の申し出：「部隊が少なくなったらその分扶持も下がり、その分補充するという流れにしたい」） */
  const 改める = (改) => on風雲を改める && on風雲を改める((ff) => 改(ff));
  const 札の値 = (m) => (
    <span style={{ fontSize: 11.5 }}>
      {m.定 > 1 && <>人数 <b className="num">{m.人}</b><span style={{ color: U.dim }}>／{m.定}</span>・</>}
      統率 <b className="num">{今の統率(m)}</b><span style={{ color: U.dim }}>（素質 {m.素質}・練れ {Math.round(m.練れ * 100)}%）</span>
      ・武勇 <b className="num">{m.武勇}</b>・扶持 <b className="num">{m.扶持}</b>
    </span>
  );
  const 手統 = 手 ? 手勢の統率を量る(手.名簿) : null, 扶持 = 手 ? 名簿の扶持(手.名簿) : 0;
  const 今の人 = 手 ? 手.名簿.reduce((a, m) => a + m.人, 0) : 0, 欠け = 手 ? 欠けの和(手.名簿) : 0;
  /* 城の政務（家老から上で城主のとき。hitori/fuun.js 城主の政務）。城の様子と預かった金、城にいる将ごとの下知の釦 */
  const 我が城 = 主人公の城(g);
  const 城の将ら = 我が城 ? g.generals.filter((x) => x.at === 我が城.id && x.faction === g.player && !x.captive && !x.lord)
    .sort((a, z) => (z.風雲の主 ? 1 : 0) - (a.風雲の主 ? 1 : 0)) : [];
  const 城の帳 = 我が城 && (g.ledger || [])[0] && g.ledger[0].castle === 我が城.name ? g.ledger[0] : null;
  /* 主人公の軍（主人公の城から出した軍。ui/MapScreen.jsx の出陣で印を立てる）の様子。在陣なら、攻め寄せるか解くかを選ぶ。
     着陣の軍議と囲みは、キャンペーンと同じ画面（軍議・囲みの帳）がひとりでに開く */
  const 我が軍ら = (g.armies || []).filter((a) => a.風雲の主の軍);
  const 城名 = (id) => (g.castles.find((c) => c.id === id) || {}).name || "";
  const 軍の様子 = (a) => a.在陣 ? `${城名(a.在陣)}に在陣`
    : (g.sieges || []).some((sg) => sg.armyId === a.id) ? `${城名((g.sieges.find((sg) => sg.armyId === a.id) || {}).castleId)}を囲む`
      : a.target ? `${城名(a.target)}へ向かう` : "行軍中";
  const 城の欄 = 我が城 && !終わり && (
    <div className="card" style={{ maxWidth: "none", maxHeight: "none", padding: 11 }}>
      <div className="sec" style={{ marginTop: 0 }}>城の政務（{我が城.name}）</div>
      <div className="tbl" style={{ fontSize: 12.5 }}>
        <span className="k">石高</span><span className="v num">{Math.round(我が城.koku)} ／ {Math.round(我が城.kokuMax)} 石</span>
        <span className="k">商業・民忠</span><span className="v num">{Math.round(我が城.comm || 0)}・{Math.round(我が城.min || 0)}</span>
        <span className="k">城の兵</span><span className="v num">{Math.round(我が城.local || 0)} 人</span>
        <span className="k">預かった金</span><span className="v num">{Math.round(f.城の預け || 0)} 貫<span style={{ color: U.dim }}>（月に{城の預けの月分(g)}貫を預かる・三月ぶんまで）</span></span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {城の将ら.map((x) => {
          const 働いた = (g.orders || {})[x.id];
          return (
            <div key={x.id} style={{ borderBottom: `1px solid ${U.line2}`, paddingBottom: 5 }}>
              <div style={{ fontSize: 12.5 }}>{x.name}{x.風雲の主 ? "（自分）" : ""}<span style={{ color: U.dim, fontSize: 11 }}>　統率 {Math.round(x.lead)}・政務 {Math.round(x.gov)}</span></div>
              {働いた ? <div style={{ fontSize: 11.5, color: U.dim }}>今月は{働いた.cmd}を行った</div> : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                  {城の政務.map((命) => (
                    <button key={命} className="btn sm" onClick={() => on盤を改める && on盤を改める((p) => 城の政務を行う(p, 命, x.id))}>{命}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {f.政務の文 && <div style={{ fontSize: 11.5, color: U.dim, marginTop: 6 }}>{f.政務の文}</div>}
      <div className="sec" style={{ marginTop: 10 }}>出陣</div>
      <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.7 }}>
        {我が城.name}から、まわりの敵の城へ兵を出せる（キャンペーンの出陣と同じ画面。和を結んだ家の城は外す）。主人公は自ら出る。
      </div>
      <button className="btn sm" style={{ marginTop: 5 }} disabled={!on出陣 || (g.sieges || []).some((sg) => sg.castleId === 我が城.id)}
        onClick={() => on出陣 && on出陣()}>出陣の支度</button>
      {我が軍ら.map((a) => (
        <div key={a.id} style={{ fontSize: 12, marginTop: 6, borderTop: `1px solid ${U.line2}`, paddingTop: 5 }}>
          <div>{軍の様子(a)}<span className="num" style={{ color: U.dim }}>　{Math.round(a.men)}人・兵糧{Math.round(a.food || 0)}石</span></div>
          {a.在陣 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
              <button className="btn sm" onClick={() => on攻め寄せる && on攻め寄せる(a.id)}>次の城へ攻め寄せる</button>
              <button className="btn sm" onClick={() => on陣を解く && on陣を解く(a.id)}>陣を解いて帰る</button>
              {下剋上の構え(g, a.id).ok && on下剋上 && (
                <button className="btn sm" style={{ background: "#8E2A20", color: "#FFF", borderColor: "#8E2A20" }}
                  onClick={() => set問い({ 種: "下剋上", armyId: a.id })}>下剋上</button>
              )}
            </div>
          )}
        </div>
      ))}
      {城の帳 && (
        <div style={{ fontSize: 11.5, marginTop: 6, lineHeight: 1.7 }}>
          <div style={{ color: U.dim }}>{城の帳.cmd}（{城の帳.general}）</div>
          {(城の帳.lines || []).map((x, i) => <div key={i} className="num">{x.text || `${x.label}　${Math.round(x.before)} → ${Math.round(x.after)}${x.unit || ""}`}</div>)}
        </div>
      )}
    </div>
  );
  /* 下準備（宿老。hitori/daimyo.js）：家の城主と誼を通じ（友好）、調略する（当主への忠誠）。下剋上・独立の問い */
  const 宿老 = f.身分 === "宿老" && !!我が城;
  const 城主ら = 宿老 ? 家の城主ら(g) : [];
  const 独 = 宿老 ? 独立の構え(g) : null;
  const [問い, set問い] = useState(null);                   // { 種: "下剋上", armyId } | { 種: "独立" }
  const 割 = (p) => `${Math.round(p * 100)}%`;
  const 主人公の姓 = f.姓 || 姓(f.名) || f.名;
  const 下準備の欄 = 宿老 && !終わり && (
    <div className="card" style={{ maxWidth: "none", maxHeight: "none", padding: 11 }}>
      <div className="sec" style={{ marginTop: 0 }}>下準備（宿老）</div>
      <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.75 }}>
        家の城主と誼を通じて友好を上げ（{誼の費え}貫）、調略して当主への忠誠を下げる（{調略の費え}貫・見込み{割(調略の見込み(f.知略))}）。
        費えは預かった金から、城主ごとに月に一度ずつ。<br />
        下剋上：自ら率いる軍で当主の城へ兵を移して在陣し、軍の欄の「下剋上」で城を急襲する。落とせば、城主ごとに見込みで従うかが決まる（国主・旗頭が従えば、その寄騎も従う。家にほかの城主がいなければ、家中はみな従う）。<br />
        独立：国主か旗頭なら、寄騎とともに家を興せる（下剋上より従いやすい）。
      </div>
      {城主ら.length === 0 && <div style={{ fontSize: 12, marginTop: 6 }}>家にほかの城主はいない（下剋上が成れば、家中はみな従う）。</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
        {城主ら.map((x) => (
          <div key={x.主.id} style={{ borderBottom: `1px solid ${U.line2}`, paddingBottom: 5, fontSize: 12.5 }}>
            <div>{x.主.name}<span style={{ color: U.dim, fontSize: 11 }}>（{x.城.name}{x.役 ? `・${x.役}` : ""}{x.寄騎 ? `・寄騎${x.寄騎}` : ""}{x.主人公の寄騎 ? "・自分の寄騎" : ""}）</span></div>
            <div className="num" style={{ fontSize: 11.5, color: U.dim }}>友好 {x.友好}・忠誠 {Math.round(x.忠誠)}　従う見込み 下剋上 {割(x.下剋上)}{x.主人公の寄騎 ? `・独立 ${割(x.独立)}` : ""}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
              <button className="btn sm" onClick={() => on盤を改める && on盤を改める((p) => 誼を通じる(p, x.主.id))}>誼を通じる</button>
              <button className="btn sm" onClick={() => on盤を改める && on盤を改める((p) => 城主を調略する(p, x.主.id))}>調略</button>
            </div>
          </div>
        ))}
      </div>
      {f.下準備の文 && <div style={{ fontSize: 11.5, color: U.dim, marginTop: 6 }}>{f.下準備の文}</div>}
      <button className="btn sm" style={{ marginTop: 8 }} disabled={!独 || !独.ok || !on独立} onClick={() => set問い({ 種: "独立" })}>
        独立{独 && !独.ok ? `（${独.訳}）` : ""}
      </button>
    </div>
  );
  const 手勢の欄 = 形 && 手 && !終わり && (
    <div className="card" style={{ maxWidth: "none", maxHeight: "none", padding: 11 }}>
      <div className="sec" style={{ marginTop: 0 }}>手勢（{形.種 === "足軽" ? `足軽${形.数}人` : `${形.種}${形.数}つ`}）</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
        手勢の統率 <b className="num">{手統 ?? "—"}</b>・{f.名}の統率 <b className="num">{f.統率}</b>
        → 合戦での統率 <b className="num">{手統 != null ? 実効の統率(f.統率, 手統) : "—"}</b>
        <span style={{ color: U.dim, fontSize: 11 }}>（低いほうに寄る）</span>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
        人数 <b className="num">{今の人}</b><span style={{ color: U.dim }}> ／ 定め {今の人 + 欠け}</span>
        {欠け > 0 && <span style={{ color: "#B0483C", marginLeft: 6 }}>欠員 {欠け}人</span>}
        {欠け > 0 && <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => 改める((ff) => みな補充する(ff))}>みな新参で埋める</button>}
      </div>
      <div style={{ fontSize: 12, marginTop: 4 }}>扶持 <b className="num">{扶持}</b><span style={{ color: U.dim }}> ／ 枠 {形.枠}</span>{棒(扶持, 形.枠, "#8A6A3A")}</div>
      <div style={{ fontSize: 11.5, color: U.dim, letterSpacing: ".12em", marginTop: 10 }}>名簿</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
        {手.名簿.map((m) => {
          const 欠 = 欠けの数(m), 訳 = 欠 ? 補充できるか(f, m.id) : null;
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${U.line2}`, padding: "3px 0" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {m.欠 ? (
                  <>
                    <div style={{ fontSize: 12.5, color: "#B0483C" }}>欠員{m.定 > 1 ? `（${形.種}）` : ""}</div>
                    <span style={{ fontSize: 11.5, color: U.dim }}>候補を雇えば、ここに入る。新参で埋めれば扶持 {欠 * 新参の値.扶持}</span>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12.5 }}>{m.名}{m.新参 && !/^新参/.test(m.名) && <span style={{ fontSize: 10.5, color: U.dim, marginLeft: 6 }}>新参</span>}
                      {m.継ぎ && <span style={{ fontSize: 10.5, color: U.dim, marginLeft: 6 }}>引き継ぎ</span>}
                      {欠 > 0 && <span style={{ fontSize: 10.5, color: "#B0483C", marginLeft: 6 }}>{欠}人欠け</span>}</div>
                    {札の値(m)}
                  </>
                )}
                {訳 && <div style={{ fontSize: 10.5, color: U.dim }}>{訳}</div>}
              </div>
              {欠 > 0 && <button className="btn sm" disabled={!!訳} onClick={() => 改める((ff) => 補充する(ff, m.id))}>{m.欠 ? "新参で埋める" : `補充（新参${欠}人）`}</button>}
              {!m.欠 && !m.新参 && <button className="btn sm" onClick={() => 改める((ff) => 暇を出す(ff, m.id))}>暇を出す</button>}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: U.dim, letterSpacing: ".12em", marginTop: 12 }}>今月の候補（{手.候補.length}{形.人 > 1 ? "隊" : "人"}・月ごとに入れ替わる）</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
        {手.候補.filter((c) => !(手.雇った || []).includes(c.id)).map((c) => {
          const 訳 = 雇えるか(f, c.id);
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${U.line2}`, padding: "3px 0" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5 }}>{c.名}</div>
                {札の値(c)}
                {訳 && <div style={{ fontSize: 10.5, color: U.dim }}>{訳}</div>}
              </div>
              <button className="btn sm" disabled={!!訳} onClick={() => 改める((ff) => 手勢を雇う(ff, c.id))}>雇う</button>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: U.dim, marginTop: 6, lineHeight: 1.7 }}>
        雇えば、欠員の枠（無ければ新参の枠）に入る。空きが無ければ、先に暇を出す（暇を出した枠は欠員になる）。
        合戦で討たれた兵の跡は欠員になり、そのぶん扶持が下がる。欠員は新参（素質・練れが低く、扶持は一人に一）で埋めるか、
        候補を雇って埋める。隊の欠けは新参で埋め、そのぶん隊の素質・練れ・武勇が下がる。埋めなければ、手勢はその人数のまま合戦に出る。
        今の統率は素質と練れを掛けたもので、練れは合戦に出るたびに上がる（威力偵察と山賊退治では伸びが少ない）。
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
          {手勢の欄}
          {城の欄}
          {下準備の欄}
          {妻子を出す && <妻子の欄 g={g} />}
          {行いの欄}
        </div>
        {/* 月を送る釦は、欄の下に留める（欄が細く長くなったので、繰らずに押せるように） */}
        <div style={{ position: "sticky", bottom: -18, background: U.paper, padding: "8px 0 18px", marginTop: 6 }}>
          <button className="btn dark" style={{ width: "100%", padding: 12 }}
            disabled={!!終わり || 待つ戦 || !!月を送っている} onClick={() => on月送り(行い)}>
            {月を送っている ? `月を送っている…（${g.year}年${g.month}月）` : 待つ戦 ? "合戦の始末を待っている…" : 出る務め ? `${出る務め}に出て、月を送る（${g.year}年${g.month}月）` : `月を送る（${g.year}年${g.month}月）`}
            <span style={{ fontSize: 11, opacity: 0.8, marginLeft: 8 }}>行い {行い.length}／{月の行いの数}</span>
          </button>
        </div>
      </div>
      {!終わり && 問い && (() => {
        const 下 = 問い.種 === "下剋上", 当 = 当主の城(g), 当主 = g.generals.find((x) => x.faction === g.player && x.lord && !x.captive);
        const 並び = 下 ? 城主ら : 城主ら.filter((x) => x.主人公の寄騎);
        return (
          <div className="modal">
            <div className="card" style={{ maxWidth: 440 }}>
              <div className="mn" style={{ fontSize: 22, marginBottom: 6 }}>{下 ? "下剋上" : "独立"}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.85 }}>
                {下
                  ? `${当 ? 当.name : "当主の城"}の${当主 ? 当主.name : "当主"}に背き、城を急襲する。旗を揚げれば後戻りはできない。${主人公の姓}家を興し、${我が城 ? 我が城.name : "自分の城"}と、軍と城にいる将が付く。城を落とせば下剋上が成り、家の城主は下の見込みで従うかが決まる（国主・旗頭が従えば、その寄騎も従う）。落とせなければ、${家.name}と戦い続ける。`
                  : `${家.name}から独立し、${主人公の姓}家を興す。${我が城 ? 我が城.name : "自分の城"}と、城にいる将が付く。寄騎は下の見込みで従うかが決まる。以後、${家.name}とは敵対する。`}
              </div>
              <div style={{ fontSize: 12, marginTop: 8 }}>
                {並び.length === 0
                  ? <div style={{ color: U.dim }}>{下 ? "家にほかの城主はいない（成れば、家中はみな従う）。" : "寄騎はいない。"}</div>
                  : 並び.map((x) => <div key={x.主.id} className="num">{x.主.name}（{x.城.name}{x.役 ? `・${x.役}` : ""}）　従う見込み {割(下 ? x.下剋上 : x.独立)}</div>)}
              </div>
              <div className="g2" style={{ marginTop: 12 }}>
                <button className="btn" onClick={() => set問い(null)}>取りやめ</button>
                <button className="btn dark" onClick={() => { const q = 問い; set問い(null); if (q.種 === "下剋上") on下剋上 && on下剋上(q.armyId); else on独立 && on独立(); }}>
                  {下 ? "下剋上" : "独立する"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {組織を見る && <組織の図 g={g} on閉じる={() => set組織を見る(false)} />}
      {!終わり && 序 && (
        <div className="modal">
          <div className="card" style={{ maxWidth: 440 }}>
            <div style={{ fontSize: 12, color: U.dim, letterSpacing: ".3em", textAlign: "center" }}>仕官</div>
            <div className="mn" style={{ fontSize: 22, margin: "8px 0 6px", textAlign: "center" }}>{f.名}</div>
            {仕官の物語(g).map((文, i) => <p key={i} style={{ fontSize: 13.5, lineHeight: 2, margin: "4px 0" }}>{文}</p>)}
            <button className="btn dark" style={{ width: "100%", marginTop: 12 }}
              onClick={() => on風雲を改める && on風雲を改める((ff) => { ff.序を見た = true; })}>仕官する</button>
          </div>
        </div>
      )}
      {!終わり && !序 && 待つ名 && (
        <div className="modal">
          <div className="card" style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 12, color: U.dim, letterSpacing: ".3em", textAlign: "center" }}>名乗り</div>
            <div className="mn" style={{ fontSize: 22, margin: "8px 0 6px", textAlign: "center" }}>物頭に取り立てられた</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.85, color: U.dim }}>
              武士として名乗りを定める（いまは{待つ名.旧名}）。自分で姓と名を決めるか、自動で決めるかを選ぶ。
              自動なら、キャンペーンの物頭昇進と同じく、{待つ名.当主 || "主君"}より偏諱「{待つ名.偏諱}」の一字を賜った名乗りから選ぶ。
            </div>
            <div className="g2" style={{ marginTop: 10 }}>
              <button className={`btn ${名の道 === "自分" ? "on" : ""}`} onClick={() => set名の道("自分")}>自分で決める</button>
              <button className={`btn ${名の道 === "自動" ? "on" : ""}`} onClick={() => set名の道("自動")}>自動で決める</button>
            </div>
            {名の道 === "自分" && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <span>姓</span>
                  <input value={入れ姓} maxLength={名乗りの限り} onChange={(e) => set入れ姓(e.target.value)} placeholder="例：木下"
                    style={{ flex: 1, minWidth: 0, padding: "7px 8px", fontSize: 15, border: `1px solid ${U.line2}`, borderRadius: 6, background: "transparent", color: U.text }} />
                  <span>名</span>
                  <input value={入れ名} maxLength={名乗りの限り} onChange={(e) => set入れ名(e.target.value)} placeholder="例：藤吉郎"
                    style={{ flex: 1, minWidth: 0, padding: "7px 8px", fontSize: 15, border: `1px solid ${U.line2}`, borderRadius: 6, background: "transparent", color: U.text }} />
                </div>
                {名の訳(入れ姓, 入れ名) && (入れ姓 || 入れ名) && <div style={{ fontSize: 11.5, color: "#B0483C", marginTop: 5 }}>{名の訳(入れ姓, 入れ名)}</div>}
                <button className="btn dark" style={{ width: "100%", marginTop: 10 }} disabled={!!名の訳(入れ姓, 入れ名)}
                  onClick={() => 名乗る(入れ姓, 入れ名)}>{名の訳(入れ姓, 入れ名) ? "姓と名を入れる" : `${入れ姓.trim()}${入れ名.trim()}と名乗る`}</button>
              </div>
            )}
            {名の道 === "自動" && (
              <div style={{ marginTop: 10 }}>
                <div className="g2">
                  {(待つ名.候補 || []).map((x, i) => (
                    <button key={i} className={`btn mn ${候補の番 === i ? "on" : ""}`} style={{ fontSize: 17 }} onClick={() => set候補の番(i)}>{x.姓}{x.名}</button>
                  ))}
                </div>
                {(待つ名.候補 || [])[候補の番] && (
                  <button className="btn dark" style={{ width: "100%", marginTop: 10 }}
                    onClick={() => { const x = 待つ名.候補[候補の番]; 名乗る(x.姓, x.名); }}>{待つ名.候補[候補の番].姓}{待つ名.候補[候補の番].名}と名乗る</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {!終わり && !序 && !待つ名 && f.縁談 && (
        <縁談の問い g={g} on答える={(受ける) => on風雲を改める && on風雲を改める((n風雲, n盤) => { 縁談に答える(n盤, 受ける); })} />
      )}
      {!終わり && !序 && !待つ名 && !f.縁談 && 待つ元服.length > 0 && (
        <元服の問い g={g} on決める={(id, 名) => on風雲を改める && on風雲を改める((n風雲, n盤) => { 元服させる(n盤, id, 名); })} />
      )}
      {!終わり && !序 && !待つ名 && !f.縁談 && !待つ元服.length && (f.知らせ || []).length > 0 && (
        <div className="modal">
          <div className="card" style={{ maxWidth: 380, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: U.dim, letterSpacing: ".3em" }}>{今の段.禄 ? "身分" : "取り立て"}</div>
            <div className="mn" style={{ fontSize: 30, margin: "10px 0 4px" }}>{f.身分}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.9, color: U.dim }}>
              {f.知らせ.join("。")}。{!今の段.禄 && <><br />住まいは{今の段.住まい}に移る。</>}
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

/* 風雲の政務の画面の上の帯（家・年月・主人公の城・記録・題へ）。
   記録は、キャンペーンの帯の「記録」と同じ記録所（一〜五の枠と自動。ui/MapScreen.jsx 記録所の窓）を開く（遊ぶ人の申し出：
   「あと、記録するボタンがないです」）。記録の文 … 収めた枠・収まらなかった訳（キャンペーンの帯と同じく釦の名に添える） */
export function 風雲の帯({ g, onTitle, on記録, 記録の文 }) {
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
      {on記録 && <button className="btn sm tsugi" onClick={on記録}>記録{記録の文 ? `：${記録の文}` : ""}</button>}
      <button className="btn sm" onClick={() => {
        if (typeof window === "undefined" || window.confirm("題の画面へ戻ります。月を送るたびに「自動」へ収めています。よろしいですか。")) onTitle && onTitle();
      }}>題へ</button>
    </div>
  );
}
