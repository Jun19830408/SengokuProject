import React, { useState, useRef, useEffect } from "react";
import { LEVELS } from "../core/state.js";
import { U, clamp, fmt, man } from "../core/util.js";
import { CASTLES, TOWNS } from "../data/castles.js";
import { FACTIONS } from "../data/factions.js";
import { GENERALS } from "../data/generals.js";
import { MAPH, MAPW, SEA_LABELS, px, py } from "../data/geo.js";
import { REGIONS } from "../data/provinces.js";

// 本拠は当主が座す城。石高の大きい城とは限らない。
export function seatOf(castles, generals, fid) {
  const cs = castles.filter((c) => c.faction === fid);
  if (!cs.length) return null;
  const lord = generals.find((g) => g.faction === fid && g.lord && !g.captive);
  if (lord) {
    const home = cs.find((c) => c.id === lord.at);
    if (home) return home;
  }
  return [...cs].sort((a, b) => b.koku - a.koku)[0];
}

export function regionOf(fid) {
  const cs = CASTLES.filter((c) => c.faction === fid);
  if (!cs.length) return "―";
  const seat = seatOf(CASTLES, GENERALS, fid);
  const r = REGIONS.find((x) => x.kuni.includes(seat.kuni));
  return r ? r.name : "―";
}

export function DaimyoSelect({
 terrain, land, onBack, onPick }) {
  const [level, setLevel] = useState("普通");
  const [region, setRegion] = useState("すべて");
  const [size, setSize] = useState("すべて");
  const [open, setOpen] = useState(null);
  // 地図の見え方。s は倍率、x/y は見ている中心（地図座標）。
  const [mv, setMv] = useState({ x: MAPW / 2, y: MAPH / 2, s: 1 });
  const drag = useRef(null);
  const cvRef = useRef(null);
  // 地図の上で家々を色分けして示し、押した場所の家を選ぶ。
  useEffect(() => {
    const cv = cvRef.current;
    if (!cv || !terrain) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    // 見ている中心と倍率に合わせて描く
    const base = W / MAPW;                     // 全体が収まる倍率
    const k = base * mv.s;                     // いまの倍率
    const S = (wx, wy) => [(wx - mv.x) * k + W / 2, (wy - mv.y) * k + H / 2];
    ctx.drawImage(terrain, 0, 0, MAPW, MAPH,
      -mv.x * k + W / 2, -mv.y * k + H / 2, MAPW * k, MAPH * k);
    // 版図を家の色で塗る（近い城の家に属するものとみなす）
    const cs = CASTLES.map((c) => {
      const [x, y] = S(px(c.lon), py(c.lat));
      return { x, y, col: (FACTIONS[c.faction] || {}).color || "#888",
        w: 1 + Math.sqrt(c.koku / 10000) * 0.34, fid: c.faction };
    });
    const cell = 6;
    const reach = 26 * (k / base);
    ctx.globalAlpha = 0.34;
    for (let y = 0; y < H; y += cell) {
      for (let x = 0; x < W; x += cell) {
        let best = null, bd = 1e9;
        for (const c of cs) {
          const d = Math.hypot(c.x - x, c.y - y) / c.w;
          if (d < bd) { bd = d; best = c; }
        }
        if (!best || bd > reach) continue;
        ctx.fillStyle = best.col;
        ctx.fillRect(x, y, cell + 1, cell + 1);
      }
    }
    ctx.globalAlpha = 1;
    // 城。拡大すれば名も出す。
    const big = mv.s > 1.8;
    for (const c of CASTLES) {
      const [x, y] = S(px(c.lon), py(c.lat));
      if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
      const on = open === c.faction;
      const col = (FACTIONS[c.faction] || {}).color || "#888";
      const r = (on ? 4.6 : 2.6) * (big ? 1.5 : 1);
      ctx.fillStyle = on ? "#fff" : "rgba(255,255,255,.75)";
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, r * 0.68, 0, 7); ctx.fill();
      if (big) {
        ctx.font = "600 11px 'Hiragino Sans',sans-serif";
        const nm = c.name;
        const w = ctx.measureText(nm).width;
        ctx.fillStyle = "rgba(255,255,255,.82)";
        ctx.fillRect(x - w / 2 - 3, y - r - 15, w + 6, 13);
        ctx.fillStyle = "#2A2A28"; ctx.fillText(nm, x - w / 2, y - r - 5);
      }
    }
    if (open) {
      const seat = seatOf(CASTLES, GENERALS, open);
      if (seat) {
        const [x, y] = S(px(seat.lon), py(seat.lat));
        ctx.strokeStyle = (FACTIONS[open] || {}).color || "#888";
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.stroke();
        const nm = (FACTIONS[open] || {}).name || "";
        ctx.font = "600 13px 'Hiragino Sans',sans-serif";
        const w = ctx.measureText(nm).width;
        ctx.fillStyle = "rgba(255,255,255,.92)";
        ctx.fillRect(x - w / 2 - 5, y - 30, w + 10, 18);
        ctx.fillStyle = "#2A2A28"; ctx.fillText(nm, x - w / 2, y - 17);
      }
    }
    ctx.fillStyle = "rgba(40,60,80,.5)";
    ctx.font = `${Math.round(clamp(12 * mv.s, 11, 20))}px serif`;
    for (const q of SEA_LABELS) {
      const [x, y] = S(q.x, q.y);
      if (x < -40 || x > W + 40 || y < -20 || y > H + 20) continue;
      ctx.fillText(q.name, x - 20, y);
    }
  }, [terrain, open, mv]);

  // 地図の操作。一本指でなぞれば動かし、二本指で拡げ縮めする。
  // 動かさずに離したときだけ、そこの大名を選ぶ。
  const mapXY = (cv, p) => {
    const r = cv.getBoundingClientRect();
    const W = cv.width, H = cv.height;
    const sx = ((p.clientX - r.left) / r.width) * W;
    const sy = ((p.clientY - r.top) / r.height) * H;
    const k = (W / MAPW) * mv.s;
    return [(sx - W / 2) / k + mv.x, (sy - H / 2) / k + mv.y];
  };
  const onMapDown = (e) => {
    const cv = cvRef.current;
    if (!cv) return;
    if (e.cancelable) e.preventDefault();     // 画面ごと動いてしまうのを防ぐ
    if (e.touches && e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const r = cv.getBoundingClientRect();
      const mx = ((t1.clientX + t2.clientX) / 2 - r.left) / r.width * cv.width;
      const my = ((t1.clientY + t2.clientY) / 2 - r.top) / r.height * cv.height;
      const k = (cv.width / MAPW) * mv.s;
      drag.current = {
        pinch: true, moved: 99,
        d0: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY),
        s0: mv.s,
        wx: (mx - cv.width / 2) / k + mv.x,
        wy: (my - cv.height / 2) / k + mv.y,
      };
      return;
    }
    const p = e.touches ? e.touches[0] : e;
    drag.current = { x: p.clientX, y: p.clientY, vx: mv.x, vy: mv.y, moved: 0 };
  };
  const onMapMove = (e) => {
    const d = drag.current, cv = cvRef.current;
    if (!d || !cv) return;
    if (e.cancelable) e.preventDefault();     // 地図だけを動かす
    if (d.pinch) {
      if (!e.touches || e.touches.length < 2) return;
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dd = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (!d.d0 || !dd) return;
      const r = cv.getBoundingClientRect();
      const mx = ((t1.clientX + t2.clientX) / 2 - r.left) / r.width * cv.width;
      const my = ((t1.clientY + t2.clientY) / 2 - r.top) / r.height * cv.height;
      const ns = clamp(d.s0 * (dd / d.d0), 1, 8);
      const k = (cv.width / MAPW) * ns;
      // 指の間の土地が動かぬようにする
      setMv({ s: ns, x: d.wx - (mx - cv.width / 2) / k, y: d.wy - (my - cv.height / 2) / k });
      return;
    }
    const p = e.touches ? e.touches[0] : e;
    const r = cv.getBoundingClientRect();
    const k = (cv.width / MAPW) * mv.s * (r.width / cv.width);
    const dx = (p.clientX - d.x) / k, dy = (p.clientY - d.y) / k;
    d.moved = Math.max(d.moved, Math.hypot(p.clientX - d.x, p.clientY - d.y));
    setMv((v) => ({ ...v, x: clamp(d.vx - dx, 0, MAPW), y: clamp(d.vy - dy, 0, MAPH) }));
  };
  // 指の追跡が断たれたとき。掴んだままにしない。
  const onMapCancel = () => { drag.current = null; };
  const onMapUp = (e) => {
    const d = drag.current, cv = cvRef.current;
    if (e.cancelable) e.preventDefault();
    drag.current = null;
    if (!d || !cv || d.moved > 8) return;      // なぞった後は選ばない
    const p = (e.changedTouches && e.changedTouches[0]) || e;
    const [mx, my] = mapXY(cv, p);
    let best = null, bd = 1e9;
    for (const c of CASTLES) {
      const dd = Math.hypot(px(c.lon) - mx, py(c.lat) - my);
      if (dd < bd) { bd = dd; best = c; }
    }
    if (!best || bd > 170 / mv.s) return;
    setOpen(best.faction);
    setRegion("すべて"); setSize("すべて");
  };
  const mapZoom = (kk) => setMv((v) => ({ ...v, s: clamp(v.s * kk, 1, 8) }));
  const mapWhole = () => setMv({ x: MAPW / 2, y: MAPH / 2, s: 1 });

  const stat = (fid) => {
    const cs = CASTLES.filter((c) => c.faction === fid);
    const gs = GENERALS.filter((x) => x.faction === fid);
    const seat = seatOf(CASTLES, GENERALS, fid);
    const lord = gs.find((x) => x.lord) || [...gs].sort((a, b) => (b.lead + b.gov) - (a.lead + a.gov))[0];
    return {
      koku: cs.reduce((a, c) => a + c.koku, 0),
      men: cs.reduce((a, c) => a + c.local, 0) + gs.reduce((a, x) => a + x.retinue, 0),
      gen: gs.length, castles: cs.length,
      towns: TOWNS.filter((t) => t.owner === fid).length,
      seat: seat ? `${seat.name}（${seat.kuni}）` : "―",
      lord: lord ? lord.name : "―",
    };
  };
  // 石高で大身・中堅・小勢力に分ける
  const list = Object.values(FACTIONS)
    .map((f) => ({ f, st: stat(f.id) }))
    .filter(({ f, st }) => st.castles > 0)
    .filter(({ f }) => region === "すべて" || regionOf(f.id) === region)
    .filter(({ st }) => size === "すべて"
      || (size === "大身" && st.koku >= 250000)
      || (size === "中堅" && st.koku >= 100000 && st.koku < 250000)
      || (size === "小勢力" && st.koku < 100000))
    .sort((a, b) => (b.f.id === open ? 1 : 0) - (a.f.id === open ? 1 : 0) || b.st.koku - a.st.koku);
  return (
    <div className="sp" style={{ height: "100dvh", overscrollBehavior: "none" }}>
      <div style={{ flex: 1, display: "flex", minHeight: 0, flexDirection: land ? "row" : "column" }}>
        <div style={{ flex: 1, position: "relative", background: "#DDE4C8", overflow: "hidden",
          touchAction: "none", overscrollBehavior: "none" }}>
          <canvas ref={cvRef} width={720} height={760}
            style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "grab", touchAction: "none" }}
            onMouseDown={onMapDown} onMouseMove={onMapMove} onMouseUp={onMapUp} onMouseLeave={() => { drag.current = null; }}
            onTouchStart={onMapDown} onTouchMove={onMapMove} onTouchEnd={onMapUp} onTouchCancel={onMapCancel} />
          <button className="btn" style={{ position: "absolute", left: 14, top: 14 }} onClick={onBack}>← 戻る</button>
          <div style={{ position: "absolute", right: 12, top: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <button className="btn sm" style={{ padding: "7px 11px" }} onClick={() => mapZoom(1.5)}>＋</button>
            <button className="btn sm" style={{ padding: "7px 11px" }} onClick={() => mapZoom(1 / 1.5)}>－</button>
            <button className="btn sm" style={{ padding: "7px 9px", fontSize: 11 }} onClick={mapWhole}>全図</button>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, textAlign: "center", pointerEvents: "none" }}>
            <span style={{ background: "rgba(252,250,245,.92)", padding: "6px 14px", borderRadius: 14,
              fontSize: 12.5, color: U.dim, boxShadow: "0 1px 4px rgba(0,0,0,.12)" }}>
              {open ? `${(FACTIONS[open] || {}).name} を選んでいます`
                : "地図を押すと、その地の大名が選ばれます（二本指で拡げ縮め・なぞって移動）"}
            </span>
          </div>
        </div>
        <div style={{
          width: land ? 300 : "auto", flex: land ? "0 0 300px" : "0 0 52%",
          borderLeft: land ? `1px solid ${U.line}` : "none", borderTop: land ? "none" : `1px solid ${U.line}`,
          background: U.card, overflowY: "auto", padding: 16,
        }}>
          <div className="sec">難易度</div>
          <div className="g3" style={{ marginBottom: 6 }}>
            {Object.values(LEVELS).map((L) => (
              <button key={L.name} className={`btn sm ${level === L.name ? "on" : ""}`}
                onClick={() => setLevel(L.name)}>{L.name}</button>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 14, lineHeight: 1.7 }}>
            {(LEVELS[level] || LEVELS["普通"]).desc}
          </div>

          <div className="sec">大名を選ぶ（{Object.keys(FACTIONS).length}家）</div>
          <div className="g2" style={{ marginBottom: 8 }}>
            {["すべて", "大身", "中堅", "小勢力"].map((k) => (
              <button key={k} className={`btn sm ${size === k ? "on" : ""}`} onClick={() => setSize(k)}>{k}</button>
            ))}
          </div>
          <div className="g3" style={{ marginBottom: 12 }}>
            {["すべて", ...REGIONS.map((r) => r.name)].map((k) => (
              <button key={k} className={`btn sm ${region === k ? "on" : ""}`} onClick={() => setRegion(k)}>{k}</button>
            ))}
          </div>

          {list.length === 0 && (
            <div style={{ fontSize: 12, color: U.dim, padding: "16px 0" }}>該当する家がありません。</div>
          )}
          {list.map(({ f, st }) => (
            <div key={f.id} style={{ borderBottom: `1px solid ${U.line2}`, padding: "10px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                onClick={() => setOpen(open === f.id ? null : f.id)}>
                <span className="dot" style={{ background: f.color }} />
                <span className="mn" style={{ fontSize: 17, flex: 1 }}>{f.name}</span>
                <span className="num" style={{ fontSize: 11.5, color: U.dim }}>
                  {man(st.koku)}万石／{st.castles}城／{st.gen}名
                </span>
              </div>
              {open === f.id && (
                <div style={{ marginTop: 8 }}>
                  {f.desc && (
                    <div style={{ fontSize: 12, color: U.dim, marginBottom: 8, lineHeight: 1.7 }}>{f.desc}</div>
                  )}
                  <div className="tbl">
                    <span className="k">石高</span><span className="v">{man(st.koku)} 万石</span>
                    <span className="k">兵数</span><span className="v">{fmt(st.men)}</span>
                    <span className="k">武将</span><span className="v">{st.gen} 名</span>
                    <span className="k">拠点</span><span className="v">{st.castles}城{st.towns ? `・${st.towns}都市` : ""}</span>
                    <span className="k">本拠</span><span className="v">{st.seat}</span>
                    <span className="k">当主</span><span className="v">{st.lord}</span>
                  </div>
                  <button className="btn" style={{ width: "100%", marginTop: 10, background: f.color, color: "#fff", borderColor: f.color }}
                    onClick={() => onPick(f.id, false, level)}>この勢力で開始</button>
                  <button className="btn sm" style={{ width: "100%", marginTop: 4 }}
                    onClick={() => onPick(f.id, true, level)}>この勢力を任せて見物する</button>
                </div>
              )}
            </div>
          ))}
          <div style={{ fontSize: 11, color: U.dim, lineHeight: 1.7, borderTop: `1px solid ${U.line2}`, paddingTop: 12, marginTop: 8 }}>
            家名を押すと詳しい様子が出ます。選ばなかった家はすべてAIが担当します。
          </div>
        </div>
      </div>
    </div>
  );
}

