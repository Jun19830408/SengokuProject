import React, { useEffect, useRef, useState } from "react";
import { BattleScreen } from "./BattleScreen.jsx";
import { 合戦一覧, 合戦を仕立てる, 合戦を控える, 合戦を戻す, 合戦を畳む, 控えの鍵 } from "../battle/kassen.js";
import { 置き場 } from "../save/store.js";
import { U, fmt } from "../core/util.js";
import { corpsMen } from "../battle/corps.js";

/* ==========================================================================
   合戦（GDD 8.9）

   キャンペーンとは別の遊び方である。国も月も暦も無く、決まった一戦だけを
   戦う。記録は残さない――ただし、うっかり頁を閉じたときのために控えを
   ひとつだけ取っておき、次に開いたときはそこから続けられる。
   新しい合戦を始めれば、その控えは消える。
   ========================================================================== */

const 旗の説 = {
  西: { 名: "西軍", 将: "石田三成・宇喜多秀家・大谷吉継", 兵: "二万七千九百（十六隊）",
    詞: "毛利輝元を総大将に戴くが、輝元は大坂城にあって関ヶ原にいない。野に立つのは三成である。松尾山と南宮山に、旗色を決めかねる四万五千がいる。この四万五千をどちらへ転ばせるかが、この戦のすべてである。" },
  東: { 名: "東軍", 将: "徳川家康・福島正則・井伊直政", 兵: "十万二千百九十八（三十四隊）",
    詞: "数では勝るが、旗本三万は桃配山に控え、六隊一万九千は南宮山を押さえて動けない。実際に槍を合わせられるのは五万三千ほどである。松尾山を味方につけられるかどうかで決まる。" },
};

export function KassenScreen({ land, onTitle }) {
  const [ctx, setCtx] = useState(null);
  const [控え, set控え] = useState(undefined);       // undefined＝まだ調べていない
  const [選び, set選び] = useState(合戦一覧[0].id);
  const [終, set終] = useState(null);
  const ctxRef = useRef(null);

  /* この画面を離れるときは、筋書きの野を畳む。畳まずに去ると、
     次に国を治めて合戦に入ったときまで関ヶ原の升目が残る。 */
  useEffect(() => () => { 合戦を畳む(); }, []);

  useEffect(() => {
    let 生きている = true;
    (async () => {
      try {
        const 文 = await 置き場().読む(控えの鍵);
        if (生きている) set控え(文 ? JSON.parse(文) : null);
      } catch (e) { if (生きている) set控え(null); }
    })();
    return () => { 生きている = false; };
  }, []);

  const 控える = async () => {
    const c = ctxRef.current;
    if (!c || !c.b || c.b.phase === "over") return;
    try { await 置き場().書く(控えの鍵, JSON.stringify(合戦を控える(c.b))); } catch (e) { /* 置けぬなら諦める */ }
  };
  const 控えを消す = async () => { try { await 置き場().消す(控えの鍵); } catch (e) { /* なくてよい */ } };

  /* 頁を閉じるとき、そのときの盤を控える。 */
  useEffect(() => {
    const 閉じ際 = () => {
      const c = ctxRef.current;
      if (!c || !c.b || c.b.phase === "over") return;
      try { window.localStorage.setItem(控えの鍵, JSON.stringify(合戦を控える(c.b))); } catch (e) { /* 諦める */ }
    };
    window.addEventListener("pagehide", 閉じ際);
    window.addEventListener("beforeunload", 閉じ際);
    const 時 = setInterval(控える, 20000);
    return () => {
      window.removeEventListener("pagehide", 閉じ際);
      window.removeEventListener("beforeunload", 閉じ際);
      clearInterval(時);
    };
  }, []);

  const 仕立てる = (r, 旗) => {
    if (!r) return;
    const 敵旗 = 旗 === "西" ? "東" : "西";
    const c = {
      b: r.b, 筋書き: r.筋書き, mode: "kassen", armyId: `kassen-${r.筋書き.id}-${旗}`,
      playerIsAtk: 旗 === "東",
      pName: `${旗}軍`, eName: `${敵旗}軍`,
      pColor: "#2F5D8C", eColor: "#B0483C",
      place: r.筋書き.所,
    };
    ctxRef.current = c; setCtx(c); set終(null);
  };

  const 始める = async (旗) => {
    await 控えを消す(); set控え(null);
    仕立てる(合戦を仕立てる(選び, 旗), 旗);
  };
  const 続きから = () => { if (控え) 仕立てる(合戦を戻す(控え), 控え.味方旗); };

  const 終わる = async (b) => {
    await 控えを消す(); set控え(null);
    set終({ 果: b.result, 旗: ctxRef.current ? ctxRef.current.pName : "",
      味方: b.corps.filter((c) => c.side === "P").reduce((a, c) => a + corpsMen(c), 0),
      敵: b.corps.filter((c) => c.side === "E").reduce((a, c) => a + corpsMen(c), 0),
      損: b.corps.filter((c) => c.side === "P").reduce((a, c) => a + c.loss["直属"] + c.loss["地域"], 0),
      筋: b.筋書き });
    ctxRef.current = null; setCtx(null); 合戦を畳む();
  };

  if (ctx) return <BattleScreen key={ctx.armyId} ctx={ctx} land={land} onEnd={終わる} />;

  const k = 合戦一覧.find((x) => x.id === 選び) || 合戦一覧[0];
  return (
    <div className="sp" style={{ height: "100dvh", overflow: "auto", background: U.paper }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px 40px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h1 className="mn" style={{ fontSize: 26, margin: 0 }}>合戦</h1>
          <span style={{ fontSize: 12, color: U.dim }}>決まった一戦だけを戦う。一回で遊びきり、記録は残らない。</span>
        </div>

        {終 && (
          <div style={{ marginTop: 14, padding: "12px 14px", border: `1px solid ${U.line}`, borderRadius: 8,
            background: 終.果 === "P" ? "rgba(62,122,58,0.10)" : "rgba(176,72,60,0.10)" }}>
            <b className="mn" style={{ fontSize: 20, color: 終.果 === "P" ? "#3E7A3A" : "#B0483C" }}>
              {終.果 === "P" ? "勝利" : 終.果 === "日没" ? "日没・両軍撤収" : "敗北"}
            </b>
            <div style={{ fontSize: 12.5, color: U.dim, marginTop: 6, lineHeight: 1.9 }}>
              残兵 {fmt(終.味方)}／敵 {fmt(終.敵)}　損害 {fmt(終.損)}人<br />
              小早川は{終.筋 ? (終.筋.小早川 === "未" ? "ついに動かなかった" : `${終.筋.小早川}軍として山を下りた`) : "—"}。
              南宮山は{終.筋 ? (終.筋.南宮山 === "西" ? "野へ下りた" : 終.筋.南宮山 === "動かず" ? "ついに動かなかった" : "去就の定まらぬまま日が暮れた") : "—"}。
            </div>
          </div>
        )}

        {控え && !終 && (
          <div style={{ marginTop: 14, padding: "12px 14px", border: `1px solid ${U.line}`, borderRadius: 8, background: "rgba(255,255,255,0.55)" }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              前に途中で閉じた一戦があります（{控え.味方旗}軍・{Math.round(控え.t / 60)}分ほど戦ったところ）。
            </div>
            <button className="btn dark" style={{ padding: "10px 16px" }} onClick={続きから}>続きから</button>
          </div>
        )}

        <div style={{ marginTop: 18, padding: "14px 16px", border: `1px solid ${U.line}`, borderRadius: 8, background: "rgba(255,255,255,0.55)" }}>
          <div className="mn" style={{ fontSize: 21 }}>{k.名}</div>
          <div style={{ fontSize: 12, color: U.dim, marginTop: 2 }}>
            慶長五年九月十五日　{k.所}　全六十三隊・十七万五千余
          </div>
          <div style={{ fontSize: 13, lineHeight: 2.0, marginTop: 10 }}>{k.詞}</div>

          <div style={{ display: "flex", flexDirection: land ? "row" : "column", gap: 12, marginTop: 16 }}>
            {["西", "東"].map((旗) => (
              <div key={旗} style={{ flex: 1, border: `1px solid ${U.line2}`, borderRadius: 8, padding: "12px 13px",
                background: 旗 === "西" ? "rgba(47,93,140,0.07)" : "rgba(176,72,60,0.07)" }}>
                <b className="mn" style={{ fontSize: 17 }}>{旗の説[旗].名}</b>
                <div style={{ fontSize: 11.5, color: U.dim, marginTop: 3 }}>{旗の説[旗].将}</div>
                <div style={{ fontSize: 11.5, color: U.dim }}>兵 {旗の説[旗].兵}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.95, marginTop: 8, minHeight: 96 }}>{旗の説[旗].詞}</div>
                <button className="btn dark" style={{ width: "100%", padding: 11, marginTop: 8 }}
                  onClick={() => 始める(旗)}>{旗の説[旗].名}で戦う</button>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.9, marginTop: 12 }}>
            選んだ側が<b style={{ color: "#2F5D8C" }}>青</b>、敵が<b style={{ color: "#B0483C" }}>赤</b>、
            去就の定まらぬ隊が<b style={{ color: "#B08A10" }}>黄</b>である。黄の隊は撃ちも撃たれもしない。
            条件が揃えば旗色が決まり、そこで初めて動き出す。
          </div>
        </div>

        <button className="btn" style={{ marginTop: 18, padding: "10px 16px" }} onClick={onTitle}>題へ戻る</button>
      </div>
    </div>
  );
}
