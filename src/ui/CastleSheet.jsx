import React, { useState } from "react";
import { RANSOM_DIV, ransomRank } from "../core/capture.js";
import { heirCandidates, isGuardian, isNameless, needsGuardian } from "../core/house.js";
import { marchMonths } from "../core/paths.js";
import { holdsProvince, kenchiCost, kenchiDone } from "../core/province.js";
import { RANKS, castellanOf, castleRankNeed, extraIncome, fiefBurden, fiefOf, fiefRoom, fiefWanted, foodDays, goryoOf, minGarrison, rankName, stipendOf, troopCap } from "../core/rank.js";
import { canSee, relOf } from "../core/state.js";
import { U, clamp, fmt, monthsBetween } from "../core/util.js";
import { TOWNS } from "../data/castles.js";
import { DIPLO, PLOTS, SPECIAL_OPTIONS } from "../data/diplo.js";
import { px, py } from "../data/geo.js";
import { captiveRecruit } from "../core/capture.js";
import { houseAlive } from "../core/state.js";
import { 忠誠 } from "../core/rank.js";
import { canHoldCastle } from "../core/rank.js";

/* ------------------------------------------------------------ 城詳細シート */
export function CastleSheet({ g, castle: c, land, tab, setTab, onClose, onCommand, onAppoint, onSortie, onCallAid, onDiplo, onPlot, onSpecial, onReward, onCaptive, onFief, onRetire, onSettle, onKenchi }) {
  const f = g.factions[c.faction];
  const gens = g.generals.filter((x) => x.at === c.id && x.faction === c.faction && !x.captive);
  const ret = gens.reduce((a, x) => a + x.retinue, 0);
  const total = c.local + ret;
  const mine = c.faction === g.player;
  const lord = castellanOf(g, c);
  const [cmd, setCmd] = useState("開墾");
  const [genId, setGenId] = useState(null);
  const [plot, setPlot] = useState("偵察");
  const [plotTarget, setPlotTarget] = useState(null);
  const [diploTarget, setDiploTarget] = useState(null);
  const cur = genId && gens.some((x) => x.id === genId) ? genId : (gens[0] && gens[0].id);
  // 月の働きは武将ごとに数える。手の空いている者がいれば、まだ命じられる。
  const busy = (id) => !!g.orders[id];
  const freeGens = gens.filter((x) => !busy(x.id) && !x.captive);
  const done = freeGens.length === 0;
  const garrison = minGarrison(c);
  const cap = troopCap(c, f.mobilization, g || s);
  const open = mine || canSee(g, c);
  const V = (v, unit) => (open ? `${fmt(v)}${unit || ""}` : "？");
  const N = (v) => (open ? Math.round(v) : "？");
  const stop = (e) => e.stopPropagation();

  // 交渉の相手は近い家から並べる。百を超える家を名の順に並べても選べない。
  const myCastles = g.castles.filter((x) => x.faction === g.player);
  const distTo = (fid) => {
    const cs = g.castles.filter((x) => x.faction === fid);
    if (!cs.length || !myCastles.length) return 1e9;
    let best = 1e9;
    for (const a of myCastles) for (const b of cs) {
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < best) best = d;
    }
    return best;
  };
  const foeFactions = Object.values(g.factions)
    .filter((x) => x.id !== g.player && g.castles.some((c2) => c2.faction === x.id))
    .map((x) => ({ ...x, dist: distTo(x.id) }))
    .sort((a, b) => a.dist - b.dist)
    .map((x) => ({ ...x, full: `${x.name}（${g.castles.filter((c2) => c2.faction === x.id).length}城・${relOf(g, g.player, x.id).state}）` }));
  const dt = (diploTarget && foeFactions.some((x) => x.id === diploTarget))
    ? diploTarget : (foeFactions[0] ? foeFactions[0].id : g.player);
  const rel = relOf(g, g.player, dt);
  const myKoku = g.castles.filter((x) => x.faction === g.player).reduce((a, x) => a + x.koku, 0);
  const youKoku = g.castles.filter((x) => x.faction === dt).reduce((a, x) => a + x.koku, 0);
  // 調略の相手も近い城から並べる
  const foeCastles = g.castles.filter((x) => x.faction !== g.player)
    .map((x) => ({ ...x, dist: myCastles.length ? Math.min(...myCastles.map((a) => Math.hypot(a.x - x.x, a.y - x.y))) : 0 }))
    .sort((a, b) => a.dist - b.dist);
  const pt = (plotTarget && foeCastles.some((x) => x.id === plotTarget))
    ? plotTarget : (foeCastles[0] && foeCastles[0].id);
  const running = g.plots.filter((x) => x.faction === g.player);
  const nearTowns = TOWNS.slice().sort((a, z) =>
    Math.hypot(px(a.lon) - c.x, py(a.lat) - c.y) - Math.hypot(px(z.lon) - c.x, py(z.lat) - c.y));

  return (
    <div className="sheet" onMouseDown={stop} onMouseUp={stop} onTouchStart={stop} onTouchEnd={stop} onWheel={stop}
      style={land ? {
        left: "auto", right: 0, top: 0, bottom: 0, width: 390, maxHeight: "100%",
        borderRadius: 0, borderTop: "none", borderLeft: `1px solid ${U.line}`, boxShadow: "-6px 0 24px rgba(0,0,0,.10)",
      } : undefined}>
      <div className="sheet-h">
        <button className="btn sm" onClick={onClose}>← 戻る</button>
        <span className="mn" style={{ fontSize: 22 }}>{c.name}</span>
        <span className="pill" style={{ background: f.color }}>{f.name}</span>
        {!mine && (
          <span className="pill" style={{ background: open ? "#5C8C4A" : "#8A8478" }}>
            {open ? "偵察済み" : "内情不明"}
          </span>
        )}
        {!mine && relOf(g, g.player, c.faction).state !== "中立" && (
          <span className="pill" style={{ background: "#4A6E8A" }}>
            {relOf(g, g.player, c.faction).state}
            {relOf(g, g.player, c.faction).until
              ? `（残${monthsBetween(g.year, g.month, relOf(g, g.player, c.faction).until.y, relOf(g, g.player, c.faction).until.m)}か月）` : ""}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {mine && <span style={{ fontSize: 11, color: U.dim }}>
          {done ? "本月の務めは済んだ" : `働ける者 ${freeGens.length}名`}
        </span>}
      </div>

      <div className="split" style={land ? { flexDirection: "column", gap: 10 } : undefined}>
        <div>
          <div className="tbl">
            <span className="k">城主</span>
            <span className="v mn">
              {open ? (lord ? lord.name : "―") : "？"}
              {open && lord && (
                <span style={{ fontSize: 11, color: U.dim, marginLeft: 6 }}>
                  {lord.lord
                    ? (needsGuardian(lord) ? `（当主・${lord.age}歳）` : "（当主）")
                    : isGuardian(g, lord) ? "（後見）"
                    : `（${rankName(lord, g)}・禄高${fmt(stipendOf(g, lord))}石）`}
                </span>
              )}
            </span>
            <span className="k">城主の格</span>
            <span className="v">
              {open ? <>禄高 {fmt(castleRankNeed(c))}石 以上</> : "？"}
              {open && (
                <span style={{ fontSize: 11, color: U.dim, marginLeft: 6 }}>
                  （この城の身代に応じた格）
                </span>
              )}
            </span>
            <span className="k">石高</span><span className="v">{V(c.koku)} / {V(c.kokuMax)} 石</span>
            <span className="k">人口</span><span className="v">{V(c.pop)}</span>
            <span className="k">兵数</span><span className="v">{V(total)}</span>
            <span className="k">武将</span><span className="v">{open ? `${gens.length} 名` : "？"}</span>
            <span className="k">兵糧</span><span className="v">{open ? `${fmt(c.food)} 石（${foodDays(c.food, total)} 日分）` : "？"}</span>
          </div>
          <div style={{ height: 10 }} />
          <div className="tbl">
            <span className="k">城防</span><span className="v">{N(c.def)} / 100</span>
            <span className="k">商業</span><span className="v">{N(c.comm)} / 100</span>
            <span className="k">民忠</span><span className="v">{N(c.min)} / 100</span>
            <span className="k">耐久</span><span className="v">{V(c.hp)}</span>
          </div>
          {!open && (
            <div style={{ fontSize: 12, color: U.dim, marginTop: 10, lineHeight: 1.6 }}>
              内情は掴めていない。調略の「偵察」を行うか、忍びの里を味方につければ分かる。
            </div>
          )}
          {open && (
            <>
              <div className="sec">兵力の内訳</div>
              <div className="row"><span>直属家臣団</span><span className="v">{fmt(ret)} 人</span></div>
              <div className="row"><span>地域家臣団（練度 {Math.round(c.localTrain)}）</span><span className="v">{fmt(c.local)} 人</span></div>
              <div className="row"><span>地域家臣団の馴染</span><span className="v">{Math.round(c.najimi == null ? 70 : c.najimi)} / 100</span></div>
              <div className="row"><span>守備最低数</span><span className="v">{fmt(garrison)} 人</span></div>
              <div className="row" style={{ color: f.color, fontWeight: 600 }}>
                <span>出征可能兵</span><span className="v">{fmt(Math.max(0, total - garrison))} 人</span>
              </div>
              <div className="meter"><i style={{ width: `${Math.min(100, (total / Math.max(1, cap)) * 100)}%`, background: f.color }} /></div>
              <div style={{ fontSize: 11, color: U.dim, marginTop: 4 }}>
                軍役上限 {fmt(cap)} 人（馴染が低いと動員も落ちる）
              </div>
              {c.intrigue && <div style={{ fontSize: 12, color: "#8A6A34", marginTop: 6 }}>この城には内応の密約が仕込まれている。</div>}
            </>
          )}
        </div>

        <div>
          <div className="sec">所属武将</div>
          {!open && <div style={{ fontSize: 12, color: U.dim }}>不明。</div>}
          {open && gens.length === 0 && <div style={{ fontSize: 12, color: U.dim }}>在城の武将はいない。</div>}
          {open && gens.map((x) => (
            <div key={x.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${U.line2}`, fontSize: 13, gap: 8 }}>
              <span className="mn" style={{ fontSize: 15 }}>
                {x.name}
                {x.lord ? (
                  <>
                    <span className="pill" style={{ background: f.color, marginLeft: 6 }}>当主</span>
                    {needsGuardian(x) && (
                      <span style={{ fontSize: 10.5, color: "#B0483C", marginLeft: 4 }}>
                        幼年（{x.age}歳）
                      </span>
                    )}
                  </>
                ) : isGuardian(g, x) ? (
                  <span className="pill" style={{ background: "#8A7A5A", marginLeft: 6 }}>後見</span>
                ) : (
                  <span style={{ fontSize: 10.5, color: U.dim, marginLeft: 6 }}>{rankName(x, g)}</span>
                )}
              </span>
              <span className="num" style={{ color: U.dim, fontSize: 11 }}>
                {x.age}歳 統{x.lead} 武{x.valor} 知{x.wit} 政{x.gov} 忠{忠誠(x)}／
                {x.lord ? `御料${fmt(goryoOf(g, x.faction).total)}石` : `禄高${fmt(stipendOf(g, x))}石`}
                ・直属{fmt(x.retinue)}
              </span>
            </div>
          ))}
          {/* 囚われの身にある者。使えぬが、この城に留め置かれている（GDD 12.3・12.4）*/}
          {open && (() => {
            const pris = g.generals.filter((x) => x.at === c.id && x.captive && x.captive.by === c.faction);
            if (!pris.length) return null;
            return (
              <>
                <div style={{ fontSize: 11.5, color: U.dim, margin: "10px 0 4px" }}>
                  この城に留め置かれている者（用いることはできません）
                </div>
                {pris.map((x) => (
                  <div key={x.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                    borderBottom: `1px solid ${U.line2}`, fontSize: 13, gap: 8, opacity: 0.62 }}>
                    <span className="mn" style={{ fontSize: 15 }}>
                      <span className="pill" style={{ background: "#8A7A6A", marginRight: 6 }}>囚</span>
                      {x.name}
                      <span style={{ fontSize: 11, color: U.dim, marginLeft: 6 }}>
                        旧{(g.factions[x.captive.from] || {}).name}
                      </span>
                    </span>
                    <span className="num" style={{ color: U.dim, fontSize: 11 }}>
                      {x.age}歳 統{x.lead} 武{x.valor} 知{x.wit} 政{x.gov}
                      {x.captive.ruin ? `／心 ${x.warLoyal || 0}／50` : `／忠${忠誠(x)}`}
                    </span>
                  </div>
                ))}
              </>
            );
          })()}

          {mine && (
            <>
              <div className="sec">命令</div>
              <div className="g4" style={{ marginBottom: 10 }}>
                {["内政", "軍事", "人事", "外交", "調略", "特殊勢力"].map((k) => (
                  <button key={k} className={`btn sm ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{k}</button>
                ))}
              </div>

              {tab === "内政" && (done ? (
                <div style={{ fontSize: 12, color: U.dim }}>
                  この城の者はみな本月の務めを果たした。次月へ進めば、また働ける。
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 6 }}>
                    手の空いている者 {freeGens.length}名／在城 {gens.filter((x) => !x.captive).length}名。
                    一人が一つの務めにあたります。
                  </div>
                  <div className="g4" style={{ marginBottom: 8 }}>
                    {["開墾", "治水", "商業", "築城", "訓練", "徴募"].map((k) => (
                      <button key={k} className={`btn sm ${cmd === k ? "on" : ""}`} onClick={() => setCmd(k)}>{k}</button>
                    ))}
                  </div>
                  <select className="sel" style={{ width: "100%", marginBottom: 8 }}
                    value={freeGens.some((x) => x.id === cur) ? cur : (freeGens[0] || {}).id || ""}
                    onChange={(e) => setGenId(e.target.value)}>
                    {freeGens.map((x) => (
                      <option key={x.id} value={x.id}>{`担当：${x.name}（${x.age}歳 統${x.lead} 政${x.gov} 知${x.wit}）`}</option>
                    ))}
                  </select>
                  <button className="btn dark" style={{ width: "100%" }}
                    disabled={!freeGens.length}
                    onClick={() => onCommand(c.id, cmd, freeGens.some((x) => x.id === cur) ? cur : freeGens[0].id)}>
                    {cmd}を実行
                  </button>
                  {/* 検地。一国を丸ごと押さえてはじめて行える（GDD 4.6） */}
                  {(() => {
                    if (!mine) return null;
                    const kuni = c.kuni;
                    if (!kuni) return null;
                    const holds = holdsProvince(g, g.player, kuni);
                    const done = kenchiDone(g, kuni);
                    const cs = g.castles.filter((x) => x.kuni === kuni);
                    const mineN = cs.filter((x) => x.faction === g.player).length;
                    const cost = kenchiCost(g, kuni);
                    const who = freeGens.length
                      ? [...freeGens].sort((a, b) => b.gov - a.gov)[0] : null;
                    return (
                      <>
                        <div className="sec">検地</div>
                        {done ? (
                          <div style={{ fontSize: 12, color: U.dim, lineHeight: 1.7 }}>
                            {kuni}にはすでに竿が入っている。
                          </div>
                        ) : !holds ? (
                          <div style={{ fontSize: 12, color: U.dim, lineHeight: 1.7 }}>
                            {kuni}の{cs.length}城のうち、当家のものは{mineN}城。<br />
                            <b style={{ color: "#B0483C" }}>一国を丸ごと押さえねば、竿は入れられない。</b><br />
                            <span style={{ fontSize: 11 }}>
                              国境をまたいで検地はできず、他家の城が一つでも残れば帳簿は改まりません。
                            </span>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: 12, color: U.dim, marginBottom: 8, lineHeight: 1.8 }}>
                              <b style={{ color: "#3E7A3A" }}>{kuni}一国を押さえた。竿を入れられる。</b><br />
                              国中{cs.length}城の実りが改まり、<b style={{ color: U.text }}>石高の限りも伸びます</b>。<br />
                              費用 金{fmt(cost.gold)}貫／民忠は九つ下がります。
                              {who && `　奉行：${who.name}（政務${who.gov}）`}
                            </div>
                            <button className="btn dark" style={{ width: "100%" }}
                              disabled={!who || g.factions[g.player].gold < cost.gold}
                              onClick={() => onKenchi(kuni, who.id)}>
                              {kuni}に竿を入れる
                            </button>
                          </>
                        )}
                      </>
                    );
                  })()}
                  {gens.filter((x) => busy(x.id)).length > 0 && (
                    <div style={{ fontSize: 11, color: U.dim, marginTop: 8, lineHeight: 1.6 }}>
                      本月すでに務めた者：{gens.filter((x) => busy(x.id)).map((x) => `${x.name}（${g.orders[x.id].cmd}）`).join("、")}
                    </div>
                  )}
                </>
              ))}

              {tab === "軍事" && (
                <>
                  <div style={{ fontSize: 12, color: U.dim, marginBottom: 8 }}>
                    出征可能兵 {fmt(Math.max(0, total - garrison))} 人。守備最低数は城に残ります。
                  </div>
                  <button className="btn dark" style={{ width: "100%" }} disabled={total - garrison < 200 || !gens.length} onClick={onSortie}>出陣</button>
                  {/* 攻められているときは、他の城から援軍を呼べる（GDD 7.3） */}
                  {(() => {
                    if (c.faction !== g.player) return null;
                    const 囲まれ = g.sieges.some((sg) => sg.castleId === c.id);
                    const 迫る = g.armies.filter((a) => a.target === c.id && a.faction !== c.faction
                      && !g.relations[[a.faction, c.faction].sort().join("|")]?.state?.match(/同盟|不可侵|従属|臣従/));
                    if (!囲まれ && !迫る.length) return null;
                    return (
                      <>
                        <div style={{ fontSize: 12.5, color: "#B0483C", marginTop: 12, lineHeight: 1.8,
                          borderLeft: "3px solid #B0483C", paddingLeft: 10 }}>
                          <b>{c.name}は危うい。</b><br />
                          <span style={{ color: U.dim, fontSize: 11.5 }}>
                            {囲まれ ? "囲まれています。" : ""}
                            {迫る.length ? `${迫る.map((a) => g.factions[a.faction].name).join("・")}の軍が向かっています。` : ""}
                          </span>
                        </div>
                        <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={() => onCallAid(c.id)}>
                          援軍を呼ぶ
                        </button>
                      </>
                    );
                  })()}
                </>
              )}

              {tab === "人事" && (
                <>
                  <div style={{ fontSize: 12, color: U.dim, marginBottom: 8 }}>
                    城主を定めます。城主が代わると地域家臣団の馴染は下がり、月ごとに戻ります。
                  </div>
                  {(() => {
                    // 戦後の始末。滅んだ家から捕らえた将を、どう遇するか。
                    const pris = g.generals.filter((x) => x.captive && x.captive.ruin
                      && x.captive.by === g.player && x.at === c.id);
                    if (!pris.length) return null;
                    return (
                      <>
                        <div className="sec">戦後の始末</div>
                        <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 8, lineHeight: 1.7 }}>
                          滅ぼした家から捕らえた者です。囚われの月を重ねるごとに心がほぐれ（月に二）、
                          扶持を与えればさらに開きます（月に一度・四）。<b>五十に達すれば召し抱えられます。</b>
                        </div>
                        {pris.map((x) => {
                          const wl = x.warLoyal || 0;
                          const cost = Math.round(120 + (x.lead + x.gov + x.wit) * 1.4);
                          const food = Math.round(60 + x.retinue * 0.4);
                          return (
                            <div key={x.id} style={{ borderBottom: `1px solid ${U.line2}`, padding: "8px 0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                <span className="mn" style={{ fontSize: 15 }}>
                                  {x.name}
                                  <span style={{ fontSize: 11, color: U.dim, marginLeft: 6 }}>
                                    旧{(g.factions[x.captive.from] || {}).name}
                                  </span>
                                </span>
                                <span className="num" style={{ fontSize: 12, color: wl >= 50 ? "#3E7A3A" : U.dim }}>
                                  心 {wl}／50
                                </span>
                              </div>
                              <div className="num" style={{ fontSize: 11, color: U.dim, marginTop: 2 }}>
                                {x.age}歳／統{x.lead}・武{x.valor}・知{x.wit}・政{x.gov}
                              </div>
                              <div className="g3" style={{ marginTop: 6 }}>
                                <button className="btn sm" disabled={wl < 50}
                                  onClick={() => onSettle(x.id, "登用")}>召し抱える</button>
                                <button className="btn sm" disabled={x.fed}
                                  onClick={() => onSettle(x.id, "扶持")}>
                                  扶持{x.fed ? "済" : ""}
                                </button>
                                <button className="btn sm" onClick={() => onSettle(x.id, "切腹")}>切腹</button>
                              </div>
                              {!x.fed && (
                                <div style={{ fontSize: 10.5, color: U.dim, marginTop: 3 }}>
                                  扶持には金{fmt(cost)}貫・兵糧{fmt(food)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                  {(() => {
                    const lord = g.generals.find((x) => x.faction === g.player && x.lord && !x.captive);
                    if (!lord || lord.at !== c.id) return null;
                    const cands = heirCandidates(g, lord).filter(({ gen }) => gen.age >= 12);
                    if (!cands.length) return null;
                    return (
                      <>
                        <div className="sec">家督を譲る（隠居）</div>
                        <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 6, lineHeight: 1.7 }}>
                          存命のうちに譲れば、先代が後見に立つため<b>家中はほとんど揺れません</b>。
                          没してから継がせると、血筋でない者なら忠誠が九つ、幼年ならさらに五つ下がります。<br />
                          先代（{lord.name}・{lord.age}歳）は家臣として残り、直属の半ばを新当主に渡します。
                        </div>
                        {cands.slice(0, 4).map(({ gen, blood }) => (
                          <button key={gen.id} className="btn sm" style={{ width: "100%", textAlign: "left", marginBottom: 4 }}
                            onClick={() => onRetire(gen.id)}>
                            {gen.name}に譲る　
                            <span style={{ color: blood ? "#3E7A3A" : "#B0483C", fontSize: 11 }}>
                              {blood ? "血筋" : "他家の出"}{gen.age < 16 ? "・幼年" : ""}
                            </span>
                            <span className="num" style={{ color: U.dim, fontSize: 11 }}>
                              　{gen.age}歳／統{gen.lead}・武{gen.valor}・知{gen.wit}・政{gen.gov}
                            </span>
                          </button>
                        ))}
                      </>
                    );
                  })()}
                  <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 8, lineHeight: 1.7 }}>
                    この城を預かれる禄高 <b style={{ color: U.text }}>{fmt(castleRankNeed(c))}石</b>以上（城主の資格）<br />
                    この城の石高 <b style={{ color: U.text }}>{fmt(c.koku)}石</b>（配れる知行の限り）／
                    家臣に配った知行 {fmt(fiefBurden(g, c.id))}石<br />
                    この城の余禄 <b style={{ color: U.text }}>{fmt(extraIncome(c))}石</b>
                    （湊の運上・市の役銭・山の産）<br />
                    <span style={{ fontSize: 11 }}>
                      知行に余禄の分け前を加えたものが<b>禄高</b>で、身分はこれで定まります。
                      石高が増えれば、配れる知行も増えます。
                    </span>
                  </div>
                  {(() => { const rm = fiefRoom(g, g.player); return (
                    <div className="row" style={{ borderBottom: `1px solid ${U.line2}`, paddingBottom: 4 }}>
                      <span>配れる知行</span>
                      <span className="v num" style={{ color: rm.left <= 0 ? "#B0483C" : U.text }}>
                        {rm.left > 0 ? `${fmt(rm.left)}石` : "なし"} <span style={{ color: U.dim, fontSize: 11 }}>
                        （石高の四割 {fmt(rm.cap)}石のうち {fmt(rm.used)}石を配分済
                        {rm.left < 0 ? `／${fmt(-rm.left)}石の配りすぎ` : ""}）</span></span>
                    </div>
                  ); })()}
                  {gens.filter((x) => !x.captive).map((x) => {
                    const want = fiefWanted(x), have = fiefOf(x);
                    const r = have / Math.max(1, want);
                    const mood = r >= 1.0 ? "満ちている" : r >= 0.75 ? "不足はない" : r >= 0.5 ? "不満がある" : "強い不満";
                    const col = r >= 0.75 ? U.dim : r >= 0.5 ? "#C89A3A" : "#B0483C";
                    return (
                      <div key={x.id} style={{ borderBottom: `1px solid ${U.line2}`, padding: "6px 0" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {(() => {
                            // 城を預かれる禄高に届いているか。届かねば押せぬようにし、
                            // どれだけ足りぬかを添える（押せたのに任じられぬ、を無くす）
                            const 預かれる = canHoldCastle(x, g, c);
                            const 要る = castleRankNeed(c), いま = stipendOf(g, x);
                            return (
                              <button className={`btn sm ${lord && lord.id === x.id ? "on" : ""}`}
                                style={{ flex: 1, textAlign: "left" }} disabled={!預かれる}
                                title={預かれる ? "" : `${c.name}を預かるには禄高${fmt(要る)}石が要る（いま${fmt(いま)}石）`}
                                onClick={() => onAppoint(c.id, x.id)}>
                                {x.name} を城主に
                                {!預かれる && <span style={{ fontSize: 10.5, color: "#B0483C", marginLeft: 6 }}>
                                  禄高あと{fmt(Math.max(0, 要る - いま))}石
                                </span>}
                              </button>
                            );
                          })()}
                          <button className="btn sm" onClick={() => onReward(x.id)}>褒賞300貫</button>
                        </div>
                        <div style={{ fontSize: 11, marginTop: 2 }}>
                          <span style={{ color: "#8A7A5A" }}>{rankName(x, g)}</span>
                          {!x.lord && (() => {
                            if (x.lord) return <span style={{ color: U.dim, marginLeft: 6 }}>　御料{fmt(goryoOf(g, x.faction).total)}石</span>;
                            const st = stipendOf(g, x);
                            const nx = RANKS.filter((r) => r.min > st).sort((a, b) => a.min - b.min)[0];
                            return nx ? <span style={{ color: U.dim, marginLeft: 6 }}>
                              　禄高{fmt(st)}石（あと{fmt(nx.min - st)}石で{nx.key}）
                            </span> : <span style={{ color: U.dim, marginLeft: 6 }}>　禄高{fmt(st)}石</span>;
                          })()}
                        </div>
                        <div className="num" style={{ fontSize: 11.5, color: col, marginTop: 3 }}>
                          {isNameless(x) ? <span style={{ color: "#9B9384" }} title="名の伝わらぬ在地の長。実在の人名ではありません">〔伝〕</span> : null}
                          {x.retired ? <span style={{ color: "#8A7A5A" }}>【隠居】</span> : null}
                          {x.lord ? <span style={{ color: "#C8A44A" }}>【当主】</span> : null}
                          忠誠{忠誠(x)}／知行 {fmt(have)}石
                          （望むところ {fmt(want)}石・{mood}）
                        </div>
                        <div className="g4" style={{ marginTop: 3 }}>
                          {[500, 1500, 4000].map((n) => (
                            <button key={n} className="btn sm" onClick={() => onFief(x.id, n)}>＋{fmt(n)}石</button>
                          ))}
                          <button className="btn sm" onClick={() => onFief(x.id, -1500)}>−1,500石</button>
                        </div>
                      </div>
                    );
                  })}
                  {g.generals.filter((x) => x.captive && x.captive.at === c.id && x.captive.by === c.faction).length > 0 && (
                    <>
                      <div className="sec">この城に留め置く捕虜</div>
                      {g.generals.filter((x) => x.captive && x.captive.at === c.id && x.captive.by === c.faction).map((x) => (
                        <div key={x.id} style={{ display: "flex", justifyContent: "space-between",
                          color: "#A9A499", fontSize: 12.5, padding: "4px 0" }}>
                          <span>【捕虜】{x.name}</span>
                          <span className="num">
                            {x.age}歳／統{x.lead}／武{x.valor}／知{x.wit}／政{x.gov}　
                            旧主への忠誠 {忠誠(x)}
                          </span>
                        </div>
                      ))}
                      <div style={{ fontSize: 11, color: U.dim, marginTop: 4 }}>
                        捕虜は城主にも褒賞にも与れない。処遇は外交の「捕虜」で決める。
                      </div>
                    </>
                  )}
                </>
              )}

              {tab === "外交" && (
                <>
                  <select className="sel" style={{ width: "100%", marginBottom: 8 }} value={dt} onChange={(e) => setDiploTarget(e.target.value)}>
                    {foeFactions.map((x) => <option key={x.id} value={x.id}>{x.full}</option>)}
                  </select>
                  <div className="row"><span>現在の関係</span>
                    <span className="v">{rel.state}{rel.until ? `（残${monthsBetween(g.year, g.month, rel.until.y, rel.until.m)}か月）` : ""}</span></div>
                  <div className="row"><span>信用</span><span className="v">{Math.round(rel.trust)} / 100</span></div>
                  <div className="meter"><i style={{ width: `${rel.trust}%`, background: "#4A6E8A" }} /></div>
                  <div className="g3" style={{ marginTop: 10 }}>
                    {DIPLO.map((d) => {
                      const ok = d.need(rel, { koku: myKoku }, { koku: youKoku }) && g.factions[g.player].gold >= d.cost;
                      return <button key={d.key} className="btn sm" disabled={!ok} title={d.why}
                        onClick={() => onDiplo(dt, d.key)}>{d.key}</button>;
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: U.dim, marginTop: 8, lineHeight: 1.7 }}>
                    親善180貫／不可侵320貫・12か月／同盟520貫・24か月／従属400貫／臣従。<br />
                    約束を破って攻めれば裏切りとなり、信用・威信・家臣の忠誠が下がります。
                  </div>
                  {(() => {
                    const held = g.generals.filter((x) => x.captive && x.captive.by === g.player);
                    if (!held.length) {
                      return (
                        <>
                          <div className="sec">捕虜（0名）</div>
                          <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.7 }}>
                            捕らえた武将はいません。合戦や城攻めで敵将を捕らえると、ここで
                            登用・逃す・斬首・身代金を選べます。
                          </div>
                        </>
                      );
                    }
                    return (
                      <>
                        <div className="sec">捕虜（{held.length}名）</div>
                        {held.map((x) => {
                          const loy = 忠誠(x);
                          const from = g.factions[x.captive.from];
                          const bond = x.captive.bond || 0;
                          return (
                            <div key={x.id} style={{ borderBottom: `1px solid ${U.line2}`, padding: "6px 0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                                <span>【捕虜】{x.name}</span>
                                <span className="num" style={{ color: U.dim }}>
                                  {from ? from.name : "旧主"}への忠誠 {loy}
                                </span>
                              </div>
                              <div className="num" style={{ fontSize: 11.5, color: U.dim, marginTop: 2 }}>
                                {x.age}歳／統率{x.lead}／武勇{x.valor}／知略{x.wit}／政務{x.gov}
                                {bond > 0 ? "　旧主と厚い縁（忠誠が下がりにくい）" : bond < 0 ? "　旧主に含むところあり（忠誠が下がりやすい）" : ""}
                              </div>
                              <div className="g4" style={{ marginTop: 4 }}>
                                {(() => {
                                  // 可否は capture.js の captiveRecruit ひとつで判ずる。
                                  // 画面と処理で判じ方が食い違うと、押せるのに降らぬ、が起きる。
                                  const 可 = captiveRecruit(g, x);
                                  return (
                                    <button className="btn sm" disabled={!可.ok} title={可.why}
                                      onClick={() => onCaptive(x.id, "登用")}>登用</button>
                                  );
                                })()}
                                <button className="btn sm" onClick={() => onCaptive(x.id, "逃す")}>逃す</button>
                                <button className="btn sm" onClick={() => onCaptive(x.id, "斬首")}>斬首</button>
                                {(() => {
                                  // 旧主が滅んでいれば、身請けする相手がいない。
                                  const 在る = houseAlive(g, x.captive.from);
                                  return (
                                    <button className="btn sm" disabled={!在る}
                                      onClick={() => onCaptive(x.id, "身代金")}
                                      title={在る
                                        ? `${ransomRank(x)}の器量。旧主の金銭・兵糧の${RANSOM_DIV[ransomRank(x)]}分の1を求める`
                                        : `${from ? from.name : "旧主"}は滅んでいる。身請けする者がいない`}>
                                      身代金（{ransomRank(x)}）
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ fontSize: 11, color: U.dim, marginTop: 6, lineHeight: 1.7 }}>
                          捕虜は月ごとに旧主への忠誠を失います。40以下になれば降ります。<br />
                          旧主が滅んだ者は、身代金を求める相手がいません（登用・逃す・斬首のみ）。<br />
                          ただし旧主と血を分けた一門は、忠誠が下がっても降りません。
                        </div>
                      </>
                    );
                  })()}
                </>
              )}

              {tab === "調略" && (
                <>
                  <select className="sel" style={{ width: "100%", marginBottom: 8 }} value={pt || ""} onChange={(e) => setPlotTarget(e.target.value)}>
                    {foeCastles.slice(0, 30).map((x) => (
                      <option key={x.id} value={x.id}>
                        {`${x.name}（${g.factions[x.faction].name}）　約${marchMonths(c.id, x.id) || "?"}か月`}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: U.dim, marginBottom: 8 }}>
                    近い城から順に三十まで示します。手の者は遠国へは容易に入れません。
                  </div>
                  <div className="g3" style={{ marginBottom: 8 }}>
                    {PLOTS.map((x) => (
                      <button key={x.key} className={`btn sm ${plot === x.key ? "on" : ""}`} onClick={() => setPlot(x.key)}>{x.key}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: U.dim, marginBottom: 8, lineHeight: 1.8 }}>
                    {(PLOTS.find((x) => x.key === plot) || {}).desc}<br />
                    費用{(PLOTS.find((x) => x.key === plot) || {}).cost}貫／
                    判明まで{(PLOTS.find((x) => x.key === plot) || {}).months}か月／
                    要する知略 <b style={{ color: U.text }}>{(PLOTS.find((x) => x.key === plot) || {}).need}</b>／
                    見込みの上限 {Math.round(((PLOTS.find((x) => x.key === plot) || {}).cap || 0.85) * 100)}％
                  </div>
                  {(() => {
                    const d2 = PLOTS.find((x) => x.key === plot);
                    const who = freeGens.some((x) => x.id === cur) ? freeGens.find((x) => x.id === cur) : freeGens[0];
                    const tgt = g.castles.find((x) => x.id === pt);
                    if (!d2 || !who || !tgt) return null;
                    const need2 = d2.need + (tgt.min - 70) * d2.hard * 0.42;
                    const cap2 = d2.cap == null ? 0.85 : d2.cap;
                    const gap = who.wit - need2;
                    const p2 = gap >= 0
                      ? Math.min(cap2 + Math.max(0, gap) * 0.002, cap2 + 0.04)
                      : clamp(cap2 + gap * d2.hard * 0.055, 0.03, cap2);
                    const pct = Math.round(p2 * 100);
                    return (
                      <div style={{ fontSize: 12.5, marginBottom: 8, lineHeight: 1.8,
                        borderLeft: `3px solid ${pct >= 80 ? "#3E7A3A" : pct >= 45 ? "#C89A3A" : "#B0483C"}`, paddingLeft: 10 }}>
                        {who.name}（知略{who.wit}）が{tgt.name}へ仕掛ける見込み　
                        <b style={{ fontSize: 16, color: pct >= 80 ? "#3E7A3A" : pct >= 45 ? "#C89A3A" : "#B0483C" }}>
                          {pct}％
                        </b><br />
                        <span style={{ color: U.dim, fontSize: 11.5 }}>
                          この城は民忠{Math.round(tgt.min)}。堅い城ほど余分に知略を要します。
                          しくじれば半ばは露見し、信用が下がります。
                        </span>
                      </div>
                    );
                  })()}
                  <select className="sel" style={{ width: "100%", marginBottom: 8 }}
                    value={freeGens.some((x) => x.id === cur) ? cur : (freeGens[0] || {}).id || ""}
                    onChange={(e) => setGenId(e.target.value)}>
                    {freeGens.map((x) => <option key={x.id} value={x.id}>{`担当：${x.name}（知${x.wit}）`}</option>)}
                  </select>
                  <button className="btn dark" style={{ width: "100%" }}
                    disabled={!freeGens.length || !pt}
                    onClick={() => onPlot(pt, plot, freeGens.some((x) => x.id === cur) ? cur : freeGens[0].id)}>
                    {plot}を仕掛ける
                  </button>
                  {!freeGens.length && (
                    <div style={{ fontSize: 12, color: "#B0483C", marginTop: 8, lineHeight: 1.7 }}>
                      この城の者はみな本月の務めに就いており、調略に手を回せない。<br />
                      <span style={{ color: U.dim, fontSize: 11.5 }}>
                        内政と調略は同じ手を使う。謀を巡らすなら、誰かの手を空けておくこと。
                      </span>
                    </div>
                  )}
                  {running.length > 0 && (
                    <>
                      <div className="sec">進行中の調略</div>
                      {running.map((x, i) => (
                        <div className="row" key={i}>
                          <span>{(g.castles.find((y) => y.id === x.castleId) || {}).name}／{x.type}</span>
                          <span className="v">あと{x.monthsLeft}か月</span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              {tab === "特殊勢力" && (
                <>
                  {nearTowns.map((t) => {
                    const st = g.specials[t.id] || {};
                    const opts = SPECIAL_OPTIONS[t.kind] || [];
                    return (
                      <div key={t.id} style={{ borderBottom: `1px solid ${U.line2}`, paddingBottom: 8, marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="mn" style={{ fontSize: 15 }}>{t.name}</span>
                          <span className="pill" style={{ background: "#8A8478" }}>{t.kind}</span>
                          <span style={{ fontSize: 12, color: U.dim }}>
                            {st.faction === g.player ? `関係：${st.state}` : st.faction ? `他勢力が${st.state}` : "中立"}
                            {st.anger > 0 ? `／反発${Math.round(st.anger)}` : ""}
                          </span>
                        </div>
                        <div className="g3" style={{ marginTop: 6 }}>
                          {opts.map((o) => (
                            <button key={o.key} className={`btn sm ${st.faction === g.player && st.state === o.key ? "on" : ""}`}
                              title={o.desc} disabled={g.factions[g.player].gold < (o.cost || 0)}
                              onClick={() => onSpecial(t.id, o.key)}>{o.key}</button>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: U.dim, marginTop: 4, lineHeight: 1.6 }}>
                          {opts.map((o) => `${o.key}：${o.desc}`).join("　")}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {g.ledger.length > 0 && (
                <>
                  <div className="sec">実行前 → 実行後</div>
                  {g.ledger.slice(0, 3).map((l, i) => (
                    <div className="led" key={i}>
                      <div style={{ marginBottom: 3 }}><b>{l.castle}／{l.cmd}</b>　担当 {l.general}　費用 {fmt(l.cost)}貫</div>
                      {l.lines.map((x, j) => {
                        if (x.text) return <div key={j}>{x.text}</div>;
                        const d = x.after - x.before;
                        return (
                          <div key={j} className="num">
                            {x.label}　{fmt(x.before)} → {fmt(x.after)}{x.unit}
                            {d !== 0 && <span className={d < 0 ? "dn" : "up"}>　{d > 0 ? "+" : ""}{fmt(d)}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

