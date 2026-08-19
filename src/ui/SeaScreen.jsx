import React, { useEffect, useRef, useState } from "react";
import { U, clamp, fmt } from "../core/util.js";
import { SEA, createSeaBattle, fleetCrew, fleetShips, layoutSea, makeFleet, stepSeaBattle, 並べ直す, 海の状, 海戦を裁く, 風の呼び名, 風向き } from "../battle/sea.js";
import { drawSea, drawSeaTerrain } from "../battle/seaDraw.js";
import { SHIPS } from "../data/ships.js";

/* ==========================================================================
   海戦の画面（GDD 10章）

   陸の合戦の画面と同じ作りにしてある。盤を押して船団を選び、海を押して
   行き先を与える。命令は五つだけにした。海の戦は陸ほど手が多くない。

     間合いを取る … 下がって矢玉を撃ち合う。大船の多い船団の戦い方
     射かける     … 撃ちながら少しずつ寄る
     焙烙を投げる … 風上へ回り込んで焼く。小早の得手
     乗り移る     … 舷を寄せ、鉤縄を掛けて斬り込む。最後は太刀で決まる
     退く         … 沖へ逃れる

   風がすべてを決める。追い風なら速く、向かい風なら鈍い。
   焙烙は風上から投げねば、己の船へ火が返る。
   ========================================================================== */

const 命 = [
  { key: "間合い", 説: "下がって矢玉を撃ち合う。大船の多い船団の戦い方。" },
  { key: "射かける", 説: "撃ちながら少しずつ寄る。" },
  { key: "焙烙", 説: "風上へ回り込んで焼く。小早の得手。風下からでは効かない。" },
  { key: "乗り移り", 説: "舷を寄せて斬り込む。乗り手の多い船が強い。" },
  { key: "退く", 説: "沖へ逃れる。この船団はこの戦に戻せない。" },
];

export function SeaScreen({ ctx, land, onEnd }) {
  const cv = useRef(null), wrap = useRef(null), terrainRef = useRef(null);
  const [, force] = useState(0);
  const [sel, setSel] = useState(null);
  const [speed, setSpeedState] = useState(0);
  const [foeSel, setFoeSel] = useState(null);
  const [退き, set退き] = useState(null);
  const speedRef = useRef(0), selRef = useRef(null);
  const camRef = useRef({ x: SEA.w / 2, y: SEA.h / 2, s: 0.7 });
  const gesture = useRef(null);
  const setSpeed = (v) => { speedRef.current = v; setSpeedState(v); };

  const b = ctx.b;
  const sideColor = (f) => (f.side === "P" ? ctx.pColor : ctx.eColor);

  const paint = () => {
    const t = terrainRef.current || document.createElement("canvas");
    t.width = SEA.w; t.height = SEA.h;
    drawSeaTerrain(t.getContext("2d"));
    terrainRef.current = t;
  };
  useEffect(() => { paint(); fit(); }, []);

  /* 全体を映す。盤いっぱいではなく、船のいるところを枠に収める。
     海は広く、船団はその一角で噛み合う。盤に合わせると、空の海ばかりが映る。 */
  const fit = () => {
    const w = wrap.current;
    const cam = camRef.current;
    const 船 = [];
    for (const f of b.fleets) { if (f.dead) continue; for (const s2 of f.ships) if (!s2.sunk) 船.push(s2); }
    if (船.length) {
      const x0 = Math.min(...船.map((s2) => s2.x)) - 90, x1 = Math.max(...船.map((s2) => s2.x)) + 90;
      const y0 = Math.min(...船.map((s2) => s2.y)) - 90, y1 = Math.max(...船.map((s2) => s2.y)) + 90;
      cam.x = (x0 + x1) / 2; cam.y = (y0 + y1) / 2;
      if (w) cam.s = clamp(Math.min(w.clientWidth / (x1 - x0), w.clientHeight / (y1 - y0)), 0.3, 2.2);
    } else {
      cam.x = SEA.w / 2; cam.y = SEA.h / 2;
      if (w) cam.s = clamp(Math.min(w.clientWidth / SEA.w, w.clientHeight / SEA.h) * 0.98, 0.2, 3);
    }
    force((n) => (n + 1) % 1000);
  };

  // 描き続ける
  useEffect(() => {
    let raf = 0, last = 0;
    const tick = (ts) => {
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min(0.12, (ts - last) / 1000) : 0;
      last = ts;
      // 並で実時間の一.二倍ほど。海戦は互角なら百秒ばかり続くので、
      // 十二倍では三十秒たらずで終わってしまい、下知を出す間がない。
      if (speedRef.current > 0 && b.phase === "fight") stepSeaBattle(b, dt * speedRef.current * 4);
      const c = cv.current, w = wrap.current;
      if (!c || !w) return;
      const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
      const W = w.clientWidth, H = w.clientHeight;
      if (c.width !== W * dpr || c.height !== H * dpr) { c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px"; c.style.height = H + "px"; }
      drawSea(c.getContext("2d"), b, selRef.current, terrainRef.current, camRef.current, W, H, dpr, sideColor);
      if (b.phase === "over" && speedRef.current > 0) setSpeed(0);
      force((n) => (n + 1) % 1000);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line

  const toSea = (cx, cy) => {
    const w = wrap.current, cam = camRef.current;
    const r = w.getBoundingClientRect();
    return { x: (cx - r.left - w.clientWidth / 2) / cam.s + cam.x, y: (cy - r.top - w.clientHeight / 2) / cam.s + cam.y };
  };
  const hit = (p, mineOnly) => {
    const cands = b.fleets.filter((f) => !f.dead && !f.destroyed && (!mineOnly || f.side === "P"));
    let best = null, bd = 1e9;
    for (const f of cands) {
      let d = Math.hypot(f.x - p.x, f.y - p.y);
      for (const s of f.ships) { if (s.sunk) continue; const q = Math.hypot(s.x - p.x, s.y - p.y); if (q < d) d = q; }
      const R = Math.max(30 / Math.max(0.3, camRef.current.s), 34);
      if (d < R && d < bd) { bd = d; best = f; }
    }
    return best;
  };
  const pointerOf = (e) => (e.touches && e.touches.length ? e.touches[0] : e.changedTouches ? e.changedTouches[0] : e);
  const onDown = (e) => {
    if (e.touches && e.touches.length === 2) {
      const [a, c2] = [e.touches[0], e.touches[1]];
      gesture.current = { mode: "pinch", d: Math.hypot(a.clientX - c2.clientX, a.clientY - c2.clientY) };
      return;
    }
    const p = pointerOf(e);
    gesture.current = { mode: "camera", moved: 0, sx: p.clientX, sy: p.clientY, camX: camRef.current.x, camY: camRef.current.y };
  };
  const onMove = (e) => {
    const gz = gesture.current; if (!gz) return;
    if (gz.mode === "pinch" && e.touches && e.touches.length === 2) {
      const [a, c2] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(a.clientX - c2.clientX, a.clientY - c2.clientY);
      camRef.current.s = clamp(camRef.current.s * (d / gz.d), 0.2, 3);
      gz.d = d; return;
    }
    const p = pointerOf(e);
    gz.moved = Math.max(gz.moved, Math.hypot(p.clientX - gz.sx, p.clientY - gz.sy));
    if (gz.moved > 6) {
      camRef.current.x = gz.camX - (p.clientX - gz.sx) / camRef.current.s;
      camRef.current.y = gz.camY - (p.clientY - gz.sy) / camRef.current.s;
    }
  };
  const onUp = (e) => {
    const gz = gesture.current; gesture.current = null;
    if (!gz || gz.mode === "pinch" || gz.moved > 6) return;
    const p = pointerOf(e);
    const f = toSea(p.clientX, p.clientY);
    const mine = hit(f, true);
    if (mine) { selRef.current = selRef.current === mine.id ? null : mine.id; setSel(selRef.current); setFoeSel(null); return; }
    const foe = hit(f, false);
    if (foe && foe.side === "E") { setFoeSel(foe.id); return; }
    setFoeSel(null);
    const c = b.fleets.find((x) => x.id === selRef.current);
    if (c && !c.routed && !c.withdraw) { c.order = "移動"; c.tx = f.x; c.ty = f.y; c.狙い = null; c.auto = false; }
  };

  const selF = b.fleets.find((x) => x.id === sel && !x.dead && !x.destroyed);
  const foeF = b.fleets.find((x) => x.id === foeSel && !x.dead && !x.destroyed);

  const 命じる = (f, key, 的) => {
    if (!f || f.routed || f.withdraw) return;
    f.auto = false; f.狙い = 的 ? 的.id : f.狙い;
    const t = 的 || b.fleets.find((x) => x.id === f.狙い && !x.dead && !x.destroyed)
      || b.fleets.filter((x) => x.side !== f.side && !x.dead && !x.destroyed)
        .reduce((a, x) => (!a || Math.hypot(x.x - f.x, x.y - f.y) < Math.hypot(a.x - f.x, a.y - f.y) ? x : a), null);
    if (key === "退く") { set退き({ f }); return; }
    f.order = key;
    if (!t) return;
    const d = Math.hypot(t.x - f.x, t.y - f.y) || 1;
    const 間 = key === "乗り移り" ? 14 : key === "焙烙" ? 60 : key === "射かける" ? 95 : 150;
    if (key === "焙烙") {
      /* 風上へ回り込む。風下から投げれば己の船へ火が返る。
         敵の風上とは、敵から見て風の吹いてくる側である。 */
      const 上 = 海の状.wind + Math.PI;
      f.tx = t.x + Math.cos(上) * 間;
      f.ty = t.y + Math.sin(上) * 間;
    } else {
      f.tx = t.x + ((f.x - t.x) / d) * 間;
      f.ty = t.y + ((f.y - t.y) / d) * 間;
    }
    force((n) => (n + 1) % 1000);
  };

  const 退かせる = (f) => {
    f.withdraw = true; f.order = "退く"; f.auto = false;
    for (const s of f.ships) { if (s.boarding) { const e = s.boarding.e; if (e) e.boarding = null; s.boarding = null; } }
    b.log.push({ t: b.t, text: `${f.gen.name}の船団が沖へ退く。` });
    set退き(null);
    force((n) => (n + 1) % 1000);
  };

  const 委ねる = () => {
    for (const f of b.fleets) if (f.side === "P") f.auto = true;
    海戦を裁く(b);
    setSpeed(0);
    force((n) => (n + 1) % 1000);
  };

  const 我艘 = b.fleets.filter((f) => f.side === "P" && !f.dead).reduce((a, f) => a + fleetShips(f), 0);
  const 敵艘 = b.fleets.filter((f) => f.side === "E" && !f.dead).reduce((a, f) => a + fleetShips(f), 0);

  const 帳 = (f) => {
    const n = { atake: 0, seki: 0, kobaya: 0 };
    for (const s of f.ships) if (!s.sunk) n[s.t]++;
    const 燃 = f.ships.filter((s) => !s.sunk && s.fire > 8).length;
    return { n, 燃 };
  };

  return (
    <div className="sp" style={{ height: "100dvh", background: "#2C4356" }}>
      {退き && (
        <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
          <div className="card" style={{ maxWidth: 400 }}>
            <div className="mn" style={{ fontSize: 20, marginBottom: 6 }}>{退き.f.gen.name}の船団を退かせますか</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.95 }}>
              {fleetShips(退き.f)}艘が沖へ逃れます。海の上に退き場はありません。
              一度退いた船団は、この戦には戻せません。
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => set退き(null)}>取りやめる</button>
              <button className="btn dark" style={{ flex: 1 }} onClick={() => 退かせる(退き.f)}>承知。退く</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", minHeight: 0 }}>
        <div className="bar" style={{ padding: "6px 10px", gap: 10, fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="dot" style={{ background: ctx.pColor }} /><b className="mn" style={{ fontSize: 14 }}>{ctx.pName}</b>
          </span>
          <span className="kv">船 <b className="num">{我艘}</b>艘</span>
          <span className="mn" style={{ color: U.dim }}>対</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="dot" style={{ background: ctx.eColor }} /><b className="mn" style={{ fontSize: 14 }}>{ctx.eName}</b>
          </span>
          <span className="kv">船 <b className="num">{敵艘}</b>艘</span>
          <span className="kv">{ctx.place}／風 {風の呼び名()}</span>
          <span className="kv">{Math.floor(b.t / 60)}刻</span>
          <span style={{ flex: 1 }} />
          <button className="btn sm" onClick={fit}>全体</button>
        </div>

        <div ref={wrap} style={{ flex: 1, minHeight: 0, position: "relative", touchAction: "none" }}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}>
          <canvas ref={cv} style={{ display: "block" }} />
        </div>

        <div style={{ background: U.paper, borderTop: `1px solid ${U.line}`, padding: "7px 10px",
          display: "flex", flexDirection: "column", gap: 6, maxHeight: land ? "42%" : "50%", overflow: "auto" }}>
          {b.phase === "deploy" && (
            <>
              <div style={{ fontSize: 12, color: U.dim, lineHeight: 1.7 }}>
                <b>{ctx.place}</b>で{ctx.eName}の水軍と行き合いました。渡海を阻まれています。<br />
                風は<b>{風の呼び名()}</b>。追い風なら速く、向かい風なら鈍い。
                <b>焙烙は風上から投げねば、己の船へ火が返ります。</b><br />
                船団を押して選び、海を押して行き先を与えます。
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn dark" style={{ flex: 1 }}
                  onClick={() => { b.phase = "fight"; setSpeed(0.3); force((n) => (n + 1) % 1000); }}>船戦を始める</button>
                <button className="btn" style={{ flex: 1 }} onClick={委ねる}>水主に委ねて結果を見る</button>
              </div>
            </>
          )}

          {b.phase === "fight" && (
            <>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {[0, 0.3, 0.7, 1.4].map((v) => (
                  <button key={v} className={`btn sm ${speed === v ? "on" : ""}`} onClick={() => setSpeed(v)}>
                    {v === 0 ? "止" : v === 0.3 ? "並" : v === 0.7 ? "早" : "疾"}
                  </button>
                ))}
                <button className="btn sm" onClick={委ねる}>委ねて結果を見る</button>
                <span style={{ flex: 1 }} />
                <button className="btn sm" onClick={() => {
                  for (const f of b.fleets) if (f.side === "P" && !f.dead && !f.destroyed) f.auto = true;
                  force((n) => (n + 1) % 1000);
                }}>全軍委任</button>
              </div>

              {foeF && (() => {
                const { n, 燃 } = 帳(foeF);
                return (
                  <div style={{ borderTop: `2px solid ${ctx.eColor}`, paddingTop: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10.5, letterSpacing: ".14em", color: ctx.eColor }}>敵の船団</span>
                      <span className="mn" style={{ fontSize: 15, flex: 1 }}>{foeF.gen.name}</span>
                      <button className="btn sm" style={{ padding: "1px 8px" }} onClick={() => setFoeSel(null)}>閉じる</button>
                    </div>
                    <div className="num" style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.6 }}>
                      {fleetShips(foeF)}艘（安宅{n.atake}・関船{n.seki}・小早{n.kobaya}）／
                      乗り手{fmt(Math.round(fleetCrew(foeF)))}人／士気{Math.round(foeF.morale)}／技量{foeF.skill}
                      {燃 ? `／${燃}艘炎上中` : ""}{foeF.routed ? "／崩れている" : ""}
                    </div>
                    {selF && (
                      <>
                        <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, marginTop: 4 }}>
                          {selF.gen.name}を{foeF.gen.name}へ差し向ける
                        </div>
                        <div className="g4">
                          {命.filter((o) => o.key !== "退く").map((o) => (
                            <button key={o.key} className="btn sm" title={o.説}
                              onClick={() => 命じる(selF, o.key, foeF)}>{o.key}</button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {selF ? (() => {
                const { n, 燃 } = 帳(selF);
                const 向 = selF.狙い && b.fleets.find((x) => x.id === selF.狙い);
                const 風 = 風向き(selF.facing);
                return (
                  <div style={{ borderTop: `1px solid ${U.line2}`, paddingTop: 5 }}>
                    <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim }}>
                      {selF.gen.name}の船団 の下知
                    </div>
                    <div className="num" style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.6 }}>
                      {fleetShips(selF)}艘（安宅{n.atake}・関船{n.seki}・小早{n.kobaya}）／
                      乗り手{fmt(Math.round(fleetCrew(selF)))}人／士気{Math.round(selF.morale)}／技量{selF.skill}
                      {燃 ? `／${燃}艘炎上中` : ""}
                      {向 && !向.dead ? `／${向.gen.name}を狙っている` : ""}
                      {selF.auto ? "／委任中" : ""}
                      　<span style={{ color: 風 > 0.3 ? "#3E7A3A" : 風 < -0.3 ? "#B0483C" : U.dim }}>
                        {風 > 0.3 ? "追い風" : 風 < -0.3 ? "向かい風" : "横風"}
                      </span>
                    </div>
                    <div className="num" style={{ fontSize: 11.5, color: U.text }}>
                      統率 <b>{selF.gen.lead}</b>　武勇 <b>{selF.gen.valor}</b>　知略 <b>{selF.gen.wit}</b>
                    </div>
                    <div className="g3" style={{ marginTop: 4 }}>
                      {命.map((o) => (
                        <button key={o.key} className={`btn sm ${selF.order === o.key ? "on" : ""}`}
                          title={o.説} onClick={() => 命じる(selF, o.key)}>{o.key}</button>
                      ))}
                      <button className={`btn sm ${selF.auto ? "on" : ""}`}
                        onClick={() => { selF.auto = !selF.auto; force((n2) => (n2 + 1) % 1000); }}>
                        {selF.auto ? "委任中" : "委任する"}
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: U.dim, lineHeight: 1.7, marginTop: 3 }}>
                      {(命.find((o) => o.key === selF.order) || {}).説 || "海を押せば、その場所へ向かいます。"}
                    </div>
                  </div>
                );
              })() : (
                <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.7 }}>
                  船団を押して選んでください。敵の船団を押せば、その様子が読めます。
                </div>
              )}

              <div style={{ borderTop: `1px solid ${U.line2}`, paddingTop: 4, maxHeight: 78, overflow: "auto" }}>
                {b.log.slice(-6).reverse().map((l, i) => (
                  <div key={i} style={{ fontSize: 11, color: U.dim }}>{l.text}</div>
                ))}
              </div>
            </>
          )}

          {b.phase === "over" && (() => {
            const 勝 = b.result === "P";
            const 沈 = ctx.初め.P - 我艘, 敵沈 = ctx.初め.E - 敵艘;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div className="mn" style={{ fontSize: 22 }}>
                  {b.result === "日没" ? "日暮れ・両軍が離れた" : 勝 ? "勝ち鬨" : "敗れた"}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.9 }}>
                  {ctx.place}の海。<br />
                  自軍 {ctx.初め.P}艘 → <b>{我艘}艘</b>（{沈}艘を失う）／
                  {ctx.eName} {ctx.初め.E}艘 → <b>{敵艘}艘</b>（{敵沈}艘を失う）
                </div>
                <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.8 }}>
                  {勝 ? "海路は開いた。船を進める。"
                    : b.result === "日没" ? "日が暮れ、両軍とも兵を退いた。渡海は成る。"
                    : "海路を阻まれた。兵の多くが海に沈んだ。"}
                </div>
                <button className="btn dark" style={{ padding: 12 }} onClick={() => onEnd(b)}>陣へ戻る</button>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/* 海戦を組み立てる。渡る側と、迎え撃つ側。
   将は軍に従う者から選び、船は水軍の力から出す。 */
export function 海戦を仕立てる(s, army, inter, 地名, pColor, eColor, pName, eName) {
  layoutSea((army.id || "x").split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0, army.men);
  const 将 = (army.gens || []).map((id) => s.generals.find((x) => x.id === id)).filter(Boolean);
  const 頭 = 将.length ? 将 : [{ id: "x", name: "船手衆", lead: 55, valor: 55, wit: 55 }];
  const P = [], E = [];
  const 我艘 = Math.max(3, inter.mine.ships);
  const 割 = Math.min(3, 頭.length);
  for (let i = 0; i < 割; i++) {
    const 艘 = Math.round(我艘 / 割) + (i === 0 ? 我艘 % 割 : 0);
    P.push(makeFleet("P", 頭[i], 艘, inter.mine.skill,
      SEA.w * (0.28 + i * 0.22), SEA.h * 0.80, -Math.PI / 2, pColor));
  }
  const 敵将 = s.generals.filter((x) => x.faction === inter.by && !x.captive)
    .sort((a, c) => (c.lead + c.wit) - (a.lead + a.wit)).slice(0, 3);
  const 敵頭 = 敵将.length ? 敵将 : [{ id: "e", name: "水軍衆", lead: 60, valor: 60, wit: 60 }];
  const 敵艘 = Math.max(3, inter.foe.ships);
  const 敵割 = Math.min(3, 敵頭.length);
  for (let i = 0; i < 敵割; i++) {
    const 艘 = Math.round(敵艘 / 敵割) + (i === 0 ? 敵艘 % 敵割 : 0);
    E.push(makeFleet("E", 敵頭[i], 艘, inter.foe.skill,
      SEA.w * (0.28 + i * 0.22), SEA.h * 0.20, Math.PI / 2, eColor));
  }
  const b = createSeaBattle(P, E, "P", {});
  return {
    b, place: 地名, pColor, eColor, pName, eName,
    初め: { P: P.reduce((a, f) => a + fleetShips(f), 0), E: E.reduce((a, f) => a + fleetShips(f), 0) },
  };
}
