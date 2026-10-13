import React, { useState, useRef, useEffect } from "react";
import { corpsMen } from "../battle/corps.js";
import { stepBattle } from "../battle/engine.js";
import { U } from "../core/util.js";

/* 持ち場を解く（GDD 12.6）。合戦画面のそれと同じ。
   手ずから動かした隊を委任に戻すとき、元の持ち場へ戻らせる筋はない。 */
const 持ち場を解く = (c) => { if (c && c.手離れ) { c.持ち場 = null; c.手離れ = false; } };

/* 出陣前の問い（GDD 8.5 / 13.2）。

   合戦に入る前に、自ら采を執るか諸将に委ねるかを決める。委ねれば絵を描かずに
   決着まで進む――BattleScreen の「委ねる」と同じ仕組みである。

   遊ぶ側の申し出は「自ら指揮を取らなければ敗戦の可能性が何パーセントくらい
   あるのかを確認できて、完全委任によるのか自ら指揮するのか選べるようにしたい」
   であった。

   見込みは、別の算段を立てるのではなく、盤をそのまま写して何度か走らせて数える。
   勝敗を占う式を別に拵えれば、それは必ず盤とずれる。実際に委ねたとき動く、
   その仕組みで確かめるのが筋である。

   ただし一戦ぶん走らせるのは安くない。見込みは押したときだけ立てる。 */

/* 歩幅は、実際に委ねたときと同じものを使う（BattleScreen の 委ねる歩幅）。

   はじめは見込みだけ粗く回して速くしようとした。ところが同じ四十の種で刻みだけ
   変えて測ると、五分の戦の勝率が
     刻み〇.〇五 … 三割八分（一戦 四.二秒）
     刻み〇.一二 … 四割三分（一戦 一.九秒）
     刻み〇.二五 … 五割五分（一戦 〇.八秒）
     刻み〇.五　 … 五割七分（一戦 〇.四五秒）
   と、粗いほど受け手に甘く出た。見込みが本番とずれては、見込みの用をなさない。
   占うものと同じ歩幅で占う。 */
const 委ねる歩幅 = (b) => (b.corps.length > 40 ? 0.25 : b.corps.length > 24 ? 0.12 : 0.05);
const 見込みの回数 = 5;

export function 出陣前の問い({ ctx, onSelf, onDelegate }) {
  const b = ctx.b;
  const [見, set見] = useState(null);          // { 済, 負, 損, 敵損 }
  const [立て中, set立て中] = useState(false);
  const 止めRef = useRef(false);
  useEffect(() => () => { 止めRef.current = true; }, []);

  const 兵 = (side) => b.corps.filter((c) => c.side === side && !c.dead && !c.destroyed)
    .reduce((a, c) => a + corpsMen(c), 0);
  const 隊 = (side) => b.corps.filter((c) => c.side === side && !c.dead && !c.destroyed).length;
  const 我兵 = Math.round(兵("P")), 敵兵 = Math.round(兵("E"));

  /* 委ねた形で走らせる盤を一つ拵える。写しなので、元の盤には触れない。 */
  const 写しを立てる = () => {
    const b2 = structuredClone(b);
    for (const c of b2.corps) if (c.side === "P") { c.auto = true; 持ち場を解く(c); }
    b2.委ねた = true;
    if (b2.phase === "deploy") b2.phase = "fight";
    return b2;
  };
  const 残り = (b2, sd) => b2.corps.filter((c) => c.side === sd && !c.dead && !c.destroyed)
    .reduce((a, c) => a + corpsMen(c), 0);

  /* 一戦ぶんは四秒ほど掛かる。一息に回すと頁が固まるので、
     二十四ミリ秒ずつ進めては手を離す（委ねた戦の進め方と同じ段取りである）。 */
  const 見込みを立てる = () => {
    if (立て中) return;
    set立て中(true);
    const 集 = { 済: 0, 負: 0, 分: 0, 我残: 0, 敵残: 0 };
    set見({ ...集 });
    let b2 = 写しを立てる(), 歩 = 委ねる歩幅(b2), 刻 = 0;
    const 限 = Math.ceil(((b2.dusk || 1200) + 60) / 歩);
    const 一区切り = () => {
      if (止めRef.current) return;
      const t0 = Date.now();
      while (b2.phase === "fight" && 刻 < 限 && Date.now() - t0 < 24) { stepBattle(b2, 歩); 刻++; }
      if (b2.phase === "fight" && 刻 < 限) { setTimeout(一区切り, 0); return; }
      集.済++;
      if (b2.result === "E") 集.負++;
      else if (b2.result !== "P") 集.分++;
      集.我残 += 残り(b2, "P"); 集.敵残 += 残り(b2, "E");
      set見({ ...集 });
      if (集.済 < 見込みの回数) {
        b2 = 写しを立てる(); 歩 = 委ねる歩幅(b2); 刻 = 0;
        setTimeout(一区切り, 0);
      } else set立て中(false);
    };
    setTimeout(一区切り, 0);
  };

  const 委ねる = () => {
    const b2 = b;
    for (const c of b2.corps) if (c.side === "P") { c.auto = true; 持ち場を解く(c); }
    b2.委ねた = true;
    if (b2.phase === "deploy") b2.phase = "fight";
    const 歩 = 委ねる歩幅(b2);
    const 限 = Math.ceil(((b2.dusk || 1200) + 60) / 歩);
    for (let k = 0; k < 限 && b2.phase === "fight"; k++) stepBattle(b2, 歩);
    onDelegate(b2);
  };

  const 行 = (名, 値, 色) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
      <span style={{ fontSize: 12, color: U.dim }}>{名}</span>
      <span className="num" style={{ fontSize: 13, color: 色 || U.ink }}>{値}</span>
    </div>
  );

  return (
    <div className="modal">
      <div className="card" style={{ maxWidth: 440 }}>
        <div className="mn" style={{ fontSize: 20 }}>{ctx.place || "合戦"}</div>
        <div style={{ margin: "10px 0 12px" }}>
          {行(`${ctx.pName}（自軍）`, `${我兵.toLocaleString()}人・${隊("P")}隊`, ctx.pColor)}
          {行(`${ctx.eName}`, `${敵兵.toLocaleString()}人・${隊("E")}隊`, ctx.eColor)}
          {行("兵の比", `${(我兵 / Math.max(1, 敵兵)).toFixed(2)} 対 1`)}
        </div>
        <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.8, marginBottom: 10 }}>
          自ら采を執れば、隊ごとに下知を出して戦える。諸将に委ねれば、絵を描かずに
          決着まで進む。委ねた戦も、手ずから戦う戦と同じ理屈で決まる。
        </div>
        {見 && (
          <div style={{ border: `1px solid ${U.line}`, borderRadius: 4, padding: "8px 10px", marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, marginBottom: 4 }}>
              委ねたときの見込み　
              {見.済 === 0 ? <span style={{ fontSize: 12, color: U.dim }}>数えている…</span> : <>
                <span className="num" style={{ fontSize: 17,
                  color: 見.負 / 見.済 >= 0.5 ? "#B0483C" : 見.負 === 0 ? "#3E7A3A" : U.ink }}>
                  {Math.round(見.負 / 見.済 * 100)}%
                </span>
                <span style={{ fontSize: 11.5, color: U.dim }}> の見込みで敗れる</span>
              </>}
            </div>
            <div style={{ fontSize: 11, color: U.dim, lineHeight: 1.7 }}>
              {見.済}回ためして {見.負}回の負け{見.分 ? `・${見.分}回の引き分け` : ""}。
              {見.済 > 0 && <>残る兵は、味方およそ {Math.round(見.我残 / 見.済).toLocaleString()}人／
              敵およそ {Math.round(見.敵残 / 見.済).toLocaleString()}人。</>}
              {立て中 ? "　（なお数えている）" : ""}
            </div>
          </div>
        )}
        <button className="btn" style={{ width: "100%", marginBottom: 6, padding: "10px 12px" }}
          onClick={見込みを立てる} disabled={立て中}>
          <span style={{ fontSize: 13 }}>
            {立て中 ? `見込みを立てている…（${見 ? 見.済 : 0}／${見込みの回数}）`
              : 見 ? "もう一度ためす" : "委ねたときの見込みを立てる"}
          </span>
        </button>
        <button className="btn" style={{ width: "100%", marginBottom: 6, padding: "11px 12px" }}
          onClick={onSelf}>
          <span className="mn" style={{ fontSize: 15 }}>自ら采を執る</span>
        </button>
        <button className="btn" style={{ width: "100%", padding: "11px 12px" }} onClick={委ねる}>
          <span className="mn" style={{ fontSize: 15 }}>諸将に委ねる</span>
          <span style={{ fontSize: 11, color: U.dim, marginLeft: 8 }}>（決着まで一息に進む）</span>
        </button>
      </div>
    </div>
  );
}
