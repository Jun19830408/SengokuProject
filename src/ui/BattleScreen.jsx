import React, { useState, useRef, useEffect } from "react";
import { MAP, axisOf, fromUV, gateOpenU, gatePos, inRect, nearestOpenGate, routeToCastleGate } from "../battle/castleMap.js";
import { corpsMen, detachOptions, issueOrder, makeDetachment, moveToGate, notify, outOfCommand, placeSquads, recallDetachment, reformTime, returnToGate, sallyOut } from "../battle/corps.js";
import { drawBattle, drawCastleTerrain, drawFieldTerrain, inOwnZone } from "../battle/draw.js";
import { stepBattle } from "../battle/engine.js";
import { BASE, FIELD, TERRAIN, WEATHER, terrainAt } from "../battle/field.js";
import { U, clamp, fmt } from "../core/util.js";
import { FormationPicker } from "./panels.jsx";
import { 退かせる } from "../battle/corps.js";

/* --------------------------------------------------------------- 合戦画面 */
export function BattleScreen({ ctx, land, onEnd }) {
  const canvasRef = useRef(null), terrainRef = useRef(null), bRef = useRef(ctx.b), wrapRef = useRef(null);
  const [, force] = useState(0);
  const [sel, setSel] = useState(null);
  const [speed, setSpeedState] = useState(0);
  const [phase, setPhase] = useState("deploy");
  const [panel, setPanel] = useState(true);
  const [selAll, setSelAll] = useState(false);
  const [wide, setWide] = useState(false);
  const [faceMode, setFaceMode] = useState(false);
  const [foeSel, setFoeSel] = useState(null);        // 押した敵の隊（帳面を見る／名指しで狙う）
  const [退き確認, set退き確認] = useState(null);     // 撤退の念押し
  const faceRef = useRef(false);
  const speedRef = useRef(0), selRef = useRef(null), uiRef = useRef(0), allRef = useRef(false);
  const camRef = useRef({ x: FIELD.w / 2, y: FIELD.h / 2, s: 0.7 });
  const gesture = useRef(null);
  const setSpeed = (v) => { speedRef.current = v; setSpeedState(v); };
  const pickCorps = (v) => { selRef.current = v; setSel(v); if (v) { allRef.current = false; setSelAll(false); } };
  const setFace = (v) => { faceRef.current = v; setFaceMode(v); };

  const brokeRef = useRef(-1);
  const paintTerrain = () => {
    const t = terrainRef.current || document.createElement("canvas");
    t.width = FIELD.w; t.height = FIELD.h;
    const g2 = t.getContext("2d");
    if (ctx.mode === "castle" && ctx.b.map) drawCastleTerrain(g2, ctx.b.map);
    else drawFieldTerrain(g2);
    terrainRef.current = t;
  };
  useEffect(() => {
    paintTerrain();
    const t = terrainRef.current;
    const w = wrapRef.current;
    if (w && w.clientWidth) {
      // 初めから全体が映るようにする（盤が広いときは 0.2 では収まらない）
      const 収 = Math.min(w.clientWidth / FIELD.w, w.clientHeight / FIELD.h);
      camRef.current.s = clamp(収 * 0.98, Math.min(0.2, 収 * 0.9), 3);
    }
  }, []);

  // 戦場のドラッグが端末側のスクロールや戻る操作に伝わらないようにする
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const block = (e) => e.preventDefault();
    el.addEventListener("touchmove", block, { passive: false });
    el.addEventListener("touchstart", block, { passive: false });
    return () => { el.removeEventListener("touchmove", block); el.removeEventListener("touchstart", block); };
  }, [land, panel]);

  // Esc で選択解除（GDD 8.2）
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") pickCorps(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------------------------------------- 委ねて結果を見る（GDD 8.5）

     新たな勝敗の算段は設けない。いま戦っているこの仕組みのまま、
     全軍を諸将に委ね、絵を描かずに時だけを進めて決着を待つ。
     手ずから戦っても、委ねても、同じ理屈で決まる。

     一歩は 0.05 秒。これは画面を見ながら戦うときの歩幅の上限と同じで、
     この仕組みが元より想定している刻みである。 */
  const 委ねる歩幅 = 0.05;
  const [委ね中, set委ね中] = useState(false);
  const 委ねRef = useRef(false);
  const 委ねる = () => {
    const b2 = bRef.current;
    if (b2.phase === "over" || 委ねRef.current) return;
    for (const c of b2.corps) if (c.side === "P") c.auto = true;   // 全軍を委任する
    if (b2.phase === "deploy") { b2.phase = "fight"; setPhase("fight"); }
    setSpeed(0);
    委ねRef.current = true; set委ね中(true);
  };
  useEffect(() => {
    if (!委ね中) return;
    let 止め = false;
    const b2 = bRef.current;
    // 一息に走らせると画面が固まる。少しずつ進め、合間に手を離す。
    const 一区切り = () => {
      if (止め) return;
      const t0 = Date.now();
      while (b2.phase === "fight" && Date.now() - t0 < 24) stepBattle(b2, 委ねる歩幅);
      force((n) => (n + 1) % 1000);
      if (b2.phase === "fight") setTimeout(一区切り, 0);
      else { 委ねRef.current = false; set委ね中(false); }
    };
    一区切り();
    return () => { 止め = true; };
  }, [委ね中]);

  useEffect(() => {
    let alive = true, handle = 0, last = 0;
    const loop = (ts) => {
      if (!alive) return;
      const b = bRef.current;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      const sp = speedRef.current;
      // 委ねている間は絵を描かない。描かぬぶんだけ時が速く進む。
      if (委ねRef.current) { handle = requestAnimationFrame(loop); return; }
      if (b.phase === "fight" && sp > 0) stepBattle(b, dt * sp);
      // 門が破れたら城郭図を描き直す
      if (b.map) {
        const bk = b.map.gates.filter((g) => g.broken).length * 100000
          + b.map.fac.filter((f) => f.hp <= 0).length * 3000
          + Math.round(b.map.gates.reduce((a, g) => a + g.hp, 0) / 30);
        if (bk !== brokeRef.current) { brokeRef.current = bk; paintTerrain(); }
      }
      const cv = canvasRef.current, wrap = wrapRef.current;
      if (cv && wrap && terrainRef.current) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = wrap.clientWidth || 800, H = wrap.clientHeight || 500;
        if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
          cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        }
        drawBattle(cv.getContext("2d"), b, selRef.current, terrainRef.current, camRef.current, W, H, dpr, allRef.current);
      }
      if (b.phase === "over" && speedRef.current !== 0) setSpeed(0);
      if (ts - uiRef.current > 100) { uiRef.current = ts; force((n) => (n + 1) % 1000); }
      handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(handle); };
  }, []);

  const b = bRef.current;
  const selC = b.corps.find((c) => c.id === sel && !c.dead);

  /* ---- 座標変換とカメラ操作（GDD 8.2 / 15.2） ---- */
  const toField = (clientX, clientY) => {
    const wrap = wrapRef.current, r = wrap.getBoundingClientRect();
    const cam = camRef.current;
    return {
      x: (clientX - r.left - r.width / 2) / cam.s + cam.x,
      y: (clientY - r.top - r.height / 2) / cam.s + cam.y,
    };
  };
  /* 縮められる限りは、盤の広さで決める。

     二割五分で頭打ちにしていた。標準の野なら全体が映るが、隊数で野を広げたので、
     いちばん縮めても盤の一部しか見えなくなった。全体を見渡せぬのでは、
     どこへ回り込むかも決められない。
     盤が枠に収まる倍率の、さらに九割まで縮められるようにする。 */
  const 縮みの限り = () => {
    const w = wrapRef.current;
    if (!w || !w.clientWidth) return 0.25;
    const 収まる = Math.min(w.clientWidth / FIELD.w, w.clientHeight / FIELD.h);
    return Math.min(0.25, 収まる * 0.9);
  };
  const zoomAt = (k, clientX, clientY) => {
    const cam = camRef.current;
    const before = clientX == null ? null : toField(clientX, clientY);
    cam.s = clamp(cam.s * k, 縮みの限り(), 3.2);
    if (before) {
      const after = toField(clientX, clientY);
      cam.x += before.x - after.x; cam.y += before.y - after.y;
    }
    force((n) => (n + 1) % 1000);
  };
  const fitAll = () => {
    const w = wrapRef.current;
    const cam = camRef.current;
    cam.x = FIELD.w / 2; cam.y = FIELD.h / 2;
    if (w) cam.s = clamp(Math.min(w.clientWidth / FIELD.w, w.clientHeight / FIELD.h) * 0.98, 縮みの限り(), 3.2);
    force((n) => (n + 1) % 1000);
  };
  // 隊のどこを押しても選べるようにする。50人組の広がりと、頭上の武将名の札を当たり判定にする。
  const hitCorps = (p, ownOnly) => {
    const sc = Math.max(0.25, camRef.current.s);
    const cands = b.corps.filter((c) => !c.dead && !c.destroyed && (!ownOnly || c.side === "P"));
    let best = null, bd = 1e9;
    for (const c of cands) {
      // 武将名の札（隊の少し上）
      const lw = 46 / sc, lh = 13 / sc, ly = c.y - 30 / sc;
      if (Math.abs(p.x - c.x) < lw && Math.abs(p.y - ly) < lh) return c;
      // 50人組の広がり
      let d = Math.hypot(c.x - p.x, c.y - p.y);
      for (const q of c.squads) {
        if (q.men <= 0) continue;
        const dq = Math.hypot(q.x - p.x, q.y - p.y);
        if (dq < d) d = dq;
      }
      const R = Math.max(26 / sc, 30);
      if (d < R && d < bd) { bd = d; best = c; }
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
    const f = toField(p.clientX, p.clientY);
    const own = hitCorps(f, true);
    // 部隊の上から始めたドラッグは移動・布陣、空白から始めたドラッグはカメラ移動
    gesture.current = {
      mode: own ? "unit" : "camera", corps: own || null, moved: 0,
      sx: p.clientX, sy: p.clientY, camX: camRef.current.x, camY: camRef.current.y,
    };
  };
  const onMove = (e) => {
    const g = gesture.current;
    if (!g) return;
    if (g.mode === "pinch" && e.touches && e.touches.length === 2) {
      const [a, c2] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(a.clientX - c2.clientX, a.clientY - c2.clientY);
      if (g.d > 0) zoomAt(d / g.d, (a.clientX + c2.clientX) / 2, (a.clientY + c2.clientY) / 2);
      g.d = d;
      return;
    }
    const p = pointerOf(e);
    g.moved = Math.max(g.moved, Math.hypot(p.clientX - g.sx, p.clientY - g.sy));
    if (g.mode === "camera") {
      const cam = camRef.current;
      cam.x = g.camX - (p.clientX - g.sx) / cam.s;
      cam.y = g.camY - (p.clientY - g.sy) / cam.s;
    }
  };
  const orderTo = (c, f, foe) => {
    c.task = null;                       // 手動命令は分遣任務より優先する
    if (faceRef.current) {
      // 前進はせず、その場で向きだけ変えて陣形を組み直す
      c.faceTo = Math.atan2(f.y - c.y, f.x - c.x);
      c.order = "転回"; c.tx = c.x; c.ty = c.y;
      setFace(false);
      return;
    }
    if (b.phase === "deploy") {
      if (inOwnZone(b, f.x, f.y)) { c.x = f.x; c.y = f.y; c.tx = f.x; c.ty = f.y; placeSquads(c, true); }
      return;
    }
    if (foe) {
      const d = Math.hypot(c.x - foe.x, c.y - foe.y) || 1;
      // 指示したときはまっすぐ向かう。森へ入れ、山を登れ、川を渡れという命令もありうる。
      const gx = foe.x + ((c.x - foe.x) / d) * 38, gy = foe.y + ((c.y - foe.y) / d) * 38;
      issueOrder(b, c, { order: "接戦", tx: gx, ty: gy });
    } else {
      c.siegeAuto = false; c.gate = null;
      issueOrder(b, c, { order: "移動", tx: f.x, ty: f.y });
    }
  };
  // 指の追跡が断たれたとき。掴んだままにしない。
  const onCancel = () => { gesture.current = null; };
  const onUp = (e) => {
    const g = gesture.current; gesture.current = null;
    if (!g || g.mode === "pinch") return;
    const p = pointerOf(e);
    const f = toField(p.clientX, p.clientY);
    if (g.mode === "unit" && g.moved > 8) { orderTo(g.corps, f, null); return; }   // 部隊ドラッグ＝移動／布陣
    if (g.moved > 8) return;                                                       // カメラ移動だった
    const own = hitCorps(f, true);
    if (own && !allRef.current) { pickCorps(sel === own.id ? null : own.id); setFoeSel(null); return; }  // 再タップで解除
    const foe = b.corps.find((c) => !c.dead && !c.destroyed && c.side === "E" && c.seen
      && Math.hypot(c.x - f.x, c.y - f.y) < 42 / Math.max(0.4, camRef.current.s));
    /* 敵の隊を押したら、その隊の帳面を開く（GDD 8.2）。
       これまでは、自隊を選んでいるときだけ「そこへ攻めかかれ」の意味しか持たず、
       何も選んでいなければただの移動先になっていた。敵の様子を検めてから
       どの隊をぶつけるか決める、という手が打てなかった。 */
    if (foe) setFoeSel(foe.id); else setFoeSel(null);
    if (foe && !selC && !allRef.current) return;         // 自隊を選んでいなければ、見るだけ
    if (allRef.current) {
      // 全部隊選択中は、まとまりを保ったまま全隊へ同じ目標を与える
      const live = b.corps.filter((c) => c.side === "P" && !c.dead && !c.destroyed && !c.routed);
      const cx = live.reduce((a, c) => a + c.x, 0) / Math.max(1, live.length);
      const cy = live.reduce((a, c) => a + c.y, 0) / Math.max(1, live.length);
      for (const c of live) orderTo(c, { x: f.x + (c.x - cx), y: f.y + (c.y - cy) }, foe);
      return;
    }
    if (!selC) return;
    orderTo(selC, f, foe);
  };

  const allOrder = (o) => {
    for (const c of b.corps) {
      if (c.side !== "P" || c.dead || c.destroyed || c.routed) continue;
      c.task = null;
      if (o === "前進") { c.order = "前進"; c.wp = null; c.tx = c.x; c.ty = Math.max(120, c.y - 260); }
      if (o === "接戦") {
        c.order = "接戦";
        const foes = b.corps.filter((x) => x.side === "E" && !x.dead && !x.destroyed && x.seen);
        if (foes.length) {
          const t = foes.reduce((a, x) => (Math.hypot(x.x - c.x, x.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? x : a), foes[0]);
          const d = Math.hypot(c.x - t.x, c.y - t.y) || 1;
          c.tx = t.x + ((c.x - t.x) / d) * 38; c.ty = t.y + ((c.y - t.y) / d) * 38;   // 重ならない距離で止める
        }
      }
      if (o === "射撃") { c.order = "射撃"; c.tx = c.x; c.ty = c.y; }
      if (o === "待機") { c.order = "待機"; c.tx = c.x; c.ty = c.y; }
      if (o === "撤退") 退かせる(b, c, true);      // 一斉に退けば統制は保たれる
    }
    if (o === "撤退") { b.retreat = "P"; b.orderly = true; b.log.push({ t: b.t, text: "全軍に退き鉦。統制を保って戦場を離れる。" }); }
  };

  const livingP = b.corps.filter((c) => c.side === "P" && !c.dead && !c.destroyed);
  const pMen = livingP.reduce((s, c) => s + corpsMen(c), 0);
  const eMen = b.corps.filter((c) => c.side === "E" && !c.dead && !c.destroyed && (c.seen || !c.ambush))
    .reduce((s, c) => s + corpsMen(c), 0);
  const pMor = Math.round(livingP.reduce((s, c) => s + c.morale, 0) / Math.max(1, livingP.length));
  const opts = selC && !selC.detach ? detachOptions(b, selC) : [];
  const stop = (e) => e.stopPropagation();

  // 選択中の一隊へ個別命令を出す（GDD 8.2 の一括命令と対で使う）
  const nearestFoe = (c) => {
    const foes = b.corps.filter((x) => x.side === "E" && !x.dead && !x.destroyed && x.seen);
    if (!foes.length) return null;
    return foes.reduce((a, x) => (Math.hypot(x.x - c.x, x.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? x : a), foes[0]);
  };
  const corpsOrder = (c, o) => {
    if (c && isCastle && o !== "待機") { c.siegeAuto = false; c.gate = null; }
    if (!c || c.dead || c.destroyed || c.routed) return;
    c.task = null;
    c.狙い = null;                       // 別の命令を出せば、名指しの狙いは解ける
    const t = nearestFoe(c);
    const standoff = (foe, gap) => {
      const d = Math.hypot(c.x - foe.x, c.y - foe.y) || 1;
      return { tx: foe.x + ((c.x - foe.x) / d) * gap, ty: foe.y + ((c.y - foe.y) / d) * gap };
    };
    let patch;
    if (o === "前進") { c.wp = null; patch = { order: "前進", tx: c.x, ty: Math.max(60, c.y - 190) }; }
    else if (o === "接戦") patch = { order: "接戦", ...(t ? standoff(t, 38) : { tx: c.tx, ty: c.ty }) };
    else if (o === "突撃") patch = { order: "突撃", chargeT: c.formation === "鋒矢" ? 26 : 16, ...(t ? standoff(t, 20) : {}) };
    else if (o === "射撃") patch = { order: "射撃", tx: c.x, ty: c.y };
    else if (o === "守備") patch = { order: "守備", formation: "方陣", tx: c.x, ty: c.y, reformT: reformTime(c.gen) };
    else if (o === "後退") {
      if (t) { const d = Math.hypot(c.x - t.x, c.y - t.y) || 1;
        patch = { order: "移動", tx: c.x + ((c.x - t.x) / d) * 170, ty: c.y + ((c.y - t.y) / d) * 170 }; }
      else patch = { order: "移動", tx: c.x, ty: Math.min(FIELD.h - 40, c.y + 170) };
    } else patch = { order: "待機", tx: c.x, ty: c.y };
    issueOrder(b, c, patch);
    force((n) => (n + 1) % 1000);
  };
  /* 名指しで攻めかかる（GDD 8.2）。
     この隊は、あの敵の隊に当たれ、という命令。敵が動けば狙いも動く（ai.js）。 */
  const 狙って命じる = (c, foe, o) => {
    if (!c || !foe || c.dead || c.destroyed || c.routed) return;
    c.task = null; c.狙い = foe.id;
    if (isCastle) { c.siegeAuto = false; c.gate = null; }
    const d = Math.hypot(c.x - foe.x, c.y - foe.y) || 1;
    const 間 = o === "突撃" ? 20 : o === "射撃" ? Math.min(d, 150) : 38;
    const patch = { order: o, target: foe.id, 狙い: foe.id,
      tx: foe.x + ((c.x - foe.x) / d) * 間, ty: foe.y + ((c.y - foe.y) / d) * 間 };
    if (o === "突撃") patch.chargeT = c.formation === "鋒矢" ? 26 : 16;
    issueOrder(b, c, patch);
    notify(b, `${c.gen.name}隊が${foe.gen.name}隊へ${o}。`, "info");
    force((n) => (n + 1) % 1000);
  };

  const changeForm = (c, f) => {
    if (!c || c.formation === f) return;
    c.formation = f;
    c.reformT = reformTime(c.gen);   // 統率が高いほど速く組み直せる
    placeSquads(c, b.phase === "deploy");
    force((n) => (n + 1) % 1000);
  };
  const ORDERS = ["前進", "接戦", "突撃", "射撃", "守備", "後退", "待機"];
  const isCastle = ctx.mode === "castle" && !!b.map;
  const iAmAttacker = b.attacker === "P";
  // 城攻めの命令。門・本丸・施設を目標に据える。
  const castleGo = (c, kind, gate) => {
    const m = b.map;
    if (!m || !c) return;
    if (kind === "門を破る") {
      const gt = gate || ((c.gate && !c.gate.broken && (c.gate.layer === 0 || m.layers[c.gate.layer - 1].gates.some((x) => x.broken)))
        ? c.gate : nearestOpenGate(m, c.x, c.y));
      if (!gt) return;
      c.gate = gt; c.siegeAuto = true;      // 破ったら次の門へ自ら進む
      const l = m.layers[gt.layer], a = axisOf(l, gt);
      const gp = gatePos(m, l, gt);
      // すでに取り付いていれば呼び戻さない
      if (Math.hypot(c.x - gp.x, c.y - gp.y) < 100 * (FIELD.w / BASE.w)) { issueOrder(b, c, { order: "待機" }); return; }
      const wp = routeToCastleGate(m, gt, c.x, c.y);
      if (wp.length) {
        issueOrder(b, c, { order: "前進", tx: wp[0].x, ty: wp[0].y, keepPath: true });
        c.wp = wp;
      } else {
        const p = fromUV(m, a, gateOpenU(gt), a.half + m.t + gt.masu + m.t + 30);
        issueOrder(b, c, { order: "前進", tx: p.x, ty: p.y });
      }
    } else if (kind === "本丸へ") {
      c.siegeAuto = false;                   // 別命令。門攻めの自動追随はやめる
      const hon = m.layers[m.layers.length - 1];
      if (hon.gates.some((x) => x.broken)) {
        const hg = hon.gates.find((x) => x.broken);
        const a2 = axisOf(hon, hg);
        const wp = [...routeToCastleGate(m, hg, c.x, c.y),
          fromUV(m, a2, hg.off, a2.half - 40), { x: m.cx, y: m.cy }];
        issueOrder(b, c, { order: "前進", tx: wp[0].x, ty: wp[0].y, keepPath: true });
        c.wp = wp;
      } else castleGo(c, "門を破る");
    } else if (kind === "施設を崩す") {
      c.siegeAuto = false;
      const cand = m.fac.filter((f) => f.hp > 0 && (f.layer === 0 ? m.layers[0].gates.some((x) => x.broken)
        : m.layers[f.layer].gates.some((x) => x.broken) || m.layers[f.layer - 1].gates.some((x) => x.broken)));
      const f = cand.sort((x, y2) => Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y2.x - c.x, y2.y - c.y))[0];
      if (f) issueOrder(b, c, { order: "前進", tx: f.x, ty: f.y });
      else castleGo(c, "門を破る");
    }
    force((n) => (n + 1) % 1000);
  };
  const castleAll = (kind) => {
    for (const c of b.corps) {
      if (c.side !== "P" || c.dead || c.destroyed || c.routed || c.detach) continue;
      castleGo(c, kind);
    }
  };
  const CASTLE_ORDERS = ["門を破る", "本丸へ", "施設を崩す"];
  // 城方は門を閉ざして守る。外へ出るのは「打って出る」を選んだときだけ。
  const sortieOut = (c) => {
    if (!c || !b.map || iAmAttacker) return;
    const m = b.map;
    let li = 0;
    for (let i = m.layers.length - 1; i >= 0; i--) {
      if (inRect(c.x - m.cx, c.y - m.cy, m.layers[i].hw, m.layers[i].hh)) { li = i; break; }
    }
    const gt = m.layers[li].gates[0];
    const a2 = axisOf(m.layers[li], gt);
    const p2 = fromUV(m, a2, gt.off, a2.half + m.t + 90);
    c.sortie = true; c.holdGate = null;
    issueOrder(b, c, { order: "移動", tx: p2.x, ty: p2.y });
    notify(b, `${c.gen.name}隊が城門を開いて討って出た。`, "info");
    force((n) => (n + 1) % 1000);
  };
  const sortieBack = (c) => {
    if (!c || !b.map) return;
    c.sortie = false;
    issueOrder(b, c, { order: "移動", tx: b.map.cx, ty: b.map.cy });
    force((n) => (n + 1) % 1000);
  };
  const orderHint = {
    前進: "隊列を保って前へ出る。", 接戦: "最寄りの敵と槍を合わせる。",
    突撃: "16秒だけ勢いをつけて当たる。速く強いが隊列と疲労を大きく損なう。",
    転回: "前進せず、その場で向きだけ変える。",
    射撃: "前へ出ず、弓と鉄砲で射程を保つ。", 守備: "方陣で密集し、受ける損害を抑える。",
    後退: "敵から距離を取り直す。", 待機: "その場で隊列を整える。",
  };

  const panelBody = (
    <>
      {b.phase === "deploy" && (
        <div style={{ display: "flex", flexDirection: land ? "column" : "row", gap: 8, alignItems: land ? "stretch" : "center", flexWrap: "wrap", width: "100%" }}>
          <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.65, flex: 1 }}>
            {ctx.mode === "castle"
              ? "寄せ手は大手口の前に布陣しています。門に取り付けば門扉が傷み、破れば次の曲輪へ進めます。本丸を押さえれば城は落ちます。"
              : "隊を選び、自陣（青い帯の中）をタップかドラッグして布陣。森に置いた隊は伏兵にできます。"}<br />
            駒＝10人。<b style={{ color: ctx.pColor }}>藍＝自軍</b>／<b style={{ color: ctx.eColor }}>朱＝敵軍</b>、<b>明るく白縁＝直属</b>／<b>暗く黒縁＝地域</b>、
            <b>形＝兵科</b>（槍は三角、騎馬は細長、弓は背が凹む、鉄砲は中央に点）。<br />
            最後尾の段は予備隊で、前線が薄くなるまで前へ出ません。<br />
            天候は<b>{b.weather}</b>：{WEATHER[b.weather].note}
          </div>
          {selC && (
            <>
              {/* 城方の命令（GDD 9.4） */}
              {isCastle && selC.side !== b.attacker && (() => {
                const MAPX = MAP;
                if (!MAPX) return null;
                const held = selC.holdGate;
                const gates = MAPX.gates.filter((g) => !g.broken && g !== held);
                return (
                  <>
                    <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, marginTop: 4 }}>
                      城方の指図　{held ? `いま ${held.key}` : "本丸"}
                      {selC.sallied ? "・出撃中" : selC.chasing ? "・追い討ち中" : ""}
                    </div>
                    <div className="g2">
                      <button className="btn sm" disabled={!!selC.sallied}
                        onClick={() => { sallyOut(b, selC, MAPX); force((n) => (n + 1) % 1000); }}>
                        打って出る
                      </button>
                      <button className="btn sm"
                        onClick={() => { returnToGate(b, selC, MAPX); force((n) => (n + 1) % 1000); }}>
                        城へ戻る
                      </button>
                    </div>
                    <select className="sel" style={{ width: "100%", marginTop: 4, fontSize: 12 }}
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        const g = v === "本丸" ? "本丸" : MAPX.gates.find((x) => x.key === v);
                        if (g) { moveToGate(b, selC, MAPX, g); force((n) => (n + 1) % 1000); }
                        e.target.value = "";
                      }}>
                      <option value="">他の持ち場へ移る…</option>
                      {gates.map((g) => (
                        <option key={g.key} value={g.key}>
                          {g.key}（{Math.round((g.hp / g.max) * 100)}%）
                        </option>
                      ))}
                      <option value="本丸">本丸に立て籠る</option>
                    </select>
                  </>
                );
              })()}
              <FormationPicker corps={selC} onPick={(f) => changeForm(selC, f)} />
              <button className={`btn sm ${selC.ambush ? "on" : ""}`} disabled={(selC.地 || terrainAt(selC.x, selC.y)) !== "forest"}
                onClick={() => { selC.ambush = !selC.ambush; selC.revealed = !selC.ambush; }}>伏兵に置く</button>
            </>
          )}
          <button className="btn dark" onClick={() => { b.phase = "fight"; setPhase("fight"); setSpeed(0.3); }}>合戦開始</button>
          {/* 諸将に委ね、決着だけを見る。戦い方はいまの仕組みのまま変わらない。 */}
          <button className="btn" onClick={委ねる}>委ねて結果を見る</button>
        </div>
      )}

      {b.phase === "fight" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "100%" }}>
          {/* 途中からでも諸将に委ねられる。以後は絵を描かず、決着まで一息に進む。 */}
          <button className="btn" onClick={委ねる} disabled={委ね中}>
            {委ね中 ? "委ねている…" : "委ねて結果を見る"}
          </button>
          <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim }}>一括命令</div>
          <div className="g4">
            <button className="btn sm" onClick={() => {
              for (const c of b.corps) if (c.side === "P" && !c.dead && !c.destroyed) c.auto = true;
              force((n) => (n + 1) % 1000);
            }}>全軍委任</button>
            <button className="btn sm" onClick={() => {
              for (const c of b.corps) if (c.side === "P" && !c.dead && !c.destroyed) { c.auto = false; issueOrder(b, c, { order: "待機", tx: c.x, ty: c.y }); }
              force((n) => (n + 1) % 1000);
            }}>全軍委任解除</button>
            <button className={`btn sm ${selAll ? "on" : ""}`}
              onClick={() => { const v = !allRef.current; allRef.current = v; setSelAll(v); if (v) { selRef.current = null; setSel(null); } }}>
              全部隊選択
            </button>
            {isCastle && iAmAttacker ? (
              <>
                <button className="btn sm" onClick={() => castleAll("門を破る")}>全軍門を破る</button>
                <button className="btn sm" onClick={() => castleAll("施設を崩す")}>全軍施設を崩す</button>
                <button className="btn sm" onClick={() => castleAll("本丸へ")}>全軍本丸へ</button>
                <button className="btn sm" onClick={() => allOrder("接戦")}>全軍接戦</button>
                <button className="btn sm" onClick={() => set退き確認({ 全軍: true })}>全軍撤退</button>
              </>
            ) : (
              <>
                <button className="btn sm" onClick={() => allOrder("前進")}>全軍前進</button>
                <button className="btn sm" onClick={() => allOrder("接戦")}>全軍接戦</button>
                <button className="btn sm" onClick={() => allOrder("射撃")}>全軍弓優先</button>
                <button className="btn sm" onClick={() => allOrder("待機")}>全軍待機</button>
                <button className="btn sm" onClick={() => set退き確認({ 全軍: true })}>全軍撤退</button>
              </>
            )}
          </div>
          {isCastle && (
            <div style={{ borderTop: `1px solid ${U.line2}`, paddingTop: 6 }}>
              <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim }}>
                城門の押し合い（城の傾き {Math.round((b.press || 0) * 100)}%）
              </div>
              {b.map.gates.filter((gt) => !gt.broken && (gt.layer === 0 || b.map.layers[gt.layer - 1].gates.some((x) => x.broken))).map((gt) => {
                const gp = gatePos(b.map, b.map.layers[gt.layer], gt);
                const q = b.corps.filter((c) => c.side === b.attacker && corpsMen(c) > 0 && c.id !== gt.slot
                  && Math.hypot(c.x - gp.x, c.y - gp.y) < 104 * (FIELD.w / BASE.w)).length;
                return (
                  <div key={gt.key} style={{ borderBottom: `1px solid ${U.line2}`, padding: "4px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span>{gt.key}</span><span className="num">{Math.round((gt.hp / gt.max) * 100)}%</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: U.dim }}>
                      {gt.hold ? `取付 ${gt.hold}${q ? `／控え${q}隊` : ""}` : "取り付いている隊はない"}
                      {gt.def ? `　内に城兵${fmt(Math.round(gt.def))}` : ""}
                    </div>
                    {selC && iAmAttacker && (
                      <button className="btn sm" style={{ width: "100%", marginTop: 3 }}
                        onClick={() => castleGo(selC, "門を破る", gt)}>{selC.gen.name}をこの門へ</button>
                    )}
                  </div>
                );
              })}
              <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, marginTop: 6 }}>城内の施設</div>
              {b.map.fac.map((f) => (
                <div key={f.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "1px 0" }}>
                  <span style={{ color: f.hp <= 0 ? U.dim : U.text }}>{f.name}</span>
                  <span className="num" style={{ color: f.hp <= 0 ? U.dim : U.text }}>
                    {f.hp <= 0 ? "崩落" : `${Math.round((f.hp / f.max) * 100)}%`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 押した敵の隊（GDD 8.2）。
              様子を検め、そのまま名指しで攻めかからせる。 */}
          {(() => {
            const foe = foeSel && b.corps.find((c) => c.id === foeSel);
            if (!foe || foe.dead || foe.destroyed || !foe.seen) return null;
            const coh = Math.round(foe.squads.reduce((a, q) => a + q.cohesion, 0) / Math.max(1, foe.squads.length));
            const 兵科 = { yari: "槍", yumi: "弓", teppo: "鉄砲", kiba: "騎馬" };
            const 内訳 = ["kiba", "teppo", "yumi", "yari"]
              .map((k) => [兵科[k], foe.squads.filter((q) => q.type === k).reduce((a, q) => a + q.men, 0)])
              .filter(([, v]) => v > 0).map(([k, v]) => `${k}${fmt(Math.round(v))}`).join("・");
            return (
              <div style={{ borderTop: `2px solid ${ctx.eColor}`, paddingTop: 6, marginTop: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10.5, letterSpacing: ".14em", color: ctx.eColor }}>敵の隊</span>
                  <span className="mn" style={{ fontSize: 15, flex: 1 }}>{foe.gen.name}隊</span>
                  <button className="btn sm" style={{ padding: "1px 8px" }} onClick={() => setFoeSel(null)}>閉じる</button>
                </div>
                <div className="num" style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.6 }}>
                  {fmt(corpsMen(foe))}人／士気{Math.round(foe.morale)}／陣形{coh}／疲労{Math.round(foe.fatigue)}／
                  {foe.formation || "―"}／{TERRAIN[foe.地 || terrainAt(foe.x, foe.y)].label}
                  {foe.routed ? "／敗走中" : ""}{foe.withdraw ? "／退却中" : ""}
                  {foe.chargeT > 0 ? "／突撃中" : ""}
                  {foe.squads.some((q) => q.engaged) ? "／交戦中" : ""}
                </div>
                <div className="num" style={{ fontSize: 11.5, color: U.text, lineHeight: 1.6 }}>
                  {foe.gen.age ? <>齢 <b>{foe.gen.age}</b>　</> : null}
                  統率 <b>{foe.gen.lead}</b>　武勇 <b>{foe.gen.valor}</b>　知略 <b>{foe.gen.wit}</b>
                  {foe.gen.lord ? <span style={{ color: ctx.eColor }}>　【総大将】</span> : null}
                </div>
                {内訳 && <div className="num" style={{ fontSize: 11.5, color: U.dim }}>兵科　{内訳}</div>}
                {selC && !selC.routed && !selC.detach ? (
                  <>
                    <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, marginTop: 5 }}>
                      {selC.gen.name}隊を{foe.gen.name}隊へ差し向ける
                    </div>
                    <div className="g3">
                      {["接戦", "突撃", "射撃"].map((o) => (
                        <button key={o} className={`btn sm ${selC.狙い === foe.id && selC.order === o ? "on" : ""}`}
                          onClick={() => 狙って命じる(selC, foe, o)}>{o}</button>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: U.dim, lineHeight: 1.7, marginTop: 3 }}>
                      名指しで命じた隊は、その敵が動いても追います。槍を合わせている間は狙いを変えません。
                      ほかの命令を出せば、名指しは解けます。
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: U.dim, lineHeight: 1.7, marginTop: 4 }}>
                    自軍の隊を選べば、この隊へ名指しで攻めかからせられます。
                  </div>
                )}
              </div>
            );
          })()}

          {selC ? (
            <>
              <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, borderTop: `1px solid ${U.line2}`, paddingTop: 6 }}>
                {selC.detach ? `${selC.gen.name}隊 ${selC.task || "分遣"}` : selC.name} の命令
              </div>
              <div className="num" style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.6 }}>
                {fmt(corpsMen(selC))}人／士気{Math.round(selC.morale)}／陣形
                {Math.round(selC.squads.reduce((a, q) => a + q.cohesion, 0) / Math.max(1, selC.squads.length))}／
                疲労{Math.round(selC.fatigue)}／{TERRAIN[selC.地 || terrainAt(selC.x, selC.y)].label}
                {selC.chargeT > 0 ? `／突撃中 残${Math.ceil(selC.chargeT)}秒` : ""}
                {selC.reformT > 0 ? `／陣形替え中 残${Math.ceil(selC.reformT)}秒` : ""}
                {selC.faceTo != null ? "／回頭中" : ""}
                {selC.pending ? `／伝令中 残${Math.ceil(selC.pending.t)}秒` : ""}
                {outOfCommand(b, selC) ? "／指揮圏外（命令が届かない）" : ""}
                {selC.pinch >= 2 ? `／${selC.pinch}方向から挟撃を受けている` : ""}
                {(() => {
                  const t = selC.狙い && b.corps.find((x) => x.id === selC.狙い);
                  return t && !t.destroyed ? `／${t.gen.name}隊を狙っている` : "";
                })()}
                {isCastle && selC.kit && selC.kit !== "なし" ? `／${selC.kit}` : ""}
                {isCastle && selC.gateFat > 3 ? `／門攻めの疲れ${Math.round(selC.gateFat)}` : ""}
              </div>
              <div className="num" style={{ fontSize: 11.5, color: U.text, lineHeight: 1.6 }}>
                {selC.gen.age ? <>齢 <b>{selC.gen.age}</b>　</> : null}統率 <b>{selC.gen.lead}</b>　武勇 <b>{selC.gen.valor}</b>　知略 <b>{selC.gen.wit}</b>
                <span style={{ color: U.dim }}>
                  　（統率＝指揮圏と伝令・陣形替えの速さ、武勇＝白兵の強さ、知略＝伏兵と分遣の判断）
                </span>
              </div>
              {isCastle && iAmAttacker && (
                <div className="g4">
                  {CASTLE_ORDERS.map((o) => (
                    <button key={o} className="btn sm" onClick={() => castleGo(selC, o)}>{o}</button>
                  ))}
                </div>
              )}
              {isCastle && !iAmAttacker && (
                <div className="g2">
                  <button className="btn sm" onClick={() => sortieOut(selC)}>打って出る</button>
                  <button className="btn sm" onClick={() => sortieBack(selC)}>城内へ戻る</button>
                </div>
              )}
              <button className={`btn sm ${selC.auto ? "on" : ""}`} style={{ width: "100%", marginBottom: 5 }}
                onClick={() => {
                  selC.auto = !selC.auto;
                  if (!selC.auto) issueOrder(b, selC, { order: "待機", tx: selC.x, ty: selC.y });
                  force((n) => (n + 1) % 1000);
                }}>
                {selC.auto ? "委任中（押すと解除）" : "この隊に委任する"}
              </button>
              <div className="g4">
                {ORDERS.map((o) => (
                  <button key={o} className={`btn sm ${selC.order === o || (o === "突撃" && selC.chargeT > 0) ? "on" : ""}`}
                    title={orderHint[o]} onClick={() => { setFace(false); corpsOrder(selC, o); }}>{o}</button>
                ))}
                <button className={`btn sm ${faceMode ? "on" : ""}`} title="前進せず、その場で向きだけ変えて陣形を組み直す"
                  onClick={() => setFace(!faceMode)}>転回</button>
                <button className="btn sm" title="この隊だけ戦場を離れる。一度退いた隊は戻せない"
                  onClick={() => set退き確認({ corps: selC })}>撤退</button>
              </div>
              {faceMode && (
                <div style={{ fontSize: 11.5, color: "#4A6E8A", lineHeight: 1.6 }}>
                  向けたい方角をタップしてください。その場で回頭し、陣形を組み直します。統率が高いほど速く据わります。
                </div>
              )}
              {/* 城方の命令（GDD 9.4） */}
              {isCastle && selC.side !== b.attacker && (() => {
                const MAPX = MAP;
                if (!MAPX) return null;
                const held = selC.holdGate;
                const gates = MAPX.gates.filter((g) => !g.broken && g !== held);
                return (
                  <>
                    <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, marginTop: 4 }}>
                      城方の指図　{held ? `いま ${held.key}` : "本丸"}
                      {selC.sallied ? "・出撃中" : selC.chasing ? "・追い討ち中" : ""}
                    </div>
                    <div className="g2">
                      <button className="btn sm" disabled={!!selC.sallied}
                        onClick={() => { sallyOut(b, selC, MAPX); force((n) => (n + 1) % 1000); }}>
                        打って出る
                      </button>
                      <button className="btn sm"
                        onClick={() => { returnToGate(b, selC, MAPX); force((n) => (n + 1) % 1000); }}>
                        城へ戻る
                      </button>
                    </div>
                    <select className="sel" style={{ width: "100%", marginTop: 4, fontSize: 12 }}
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        const g = v === "本丸" ? "本丸" : MAPX.gates.find((x) => x.key === v);
                        if (g) { moveToGate(b, selC, MAPX, g); force((n) => (n + 1) % 1000); }
                        e.target.value = "";
                      }}>
                      <option value="">他の持ち場へ移る…</option>
                      {gates.map((g) => (
                        <option key={g.key} value={g.key}>
                          {g.key}（{Math.round((g.hp / g.max) * 100)}%）
                        </option>
                      ))}
                      <option value="本丸">本丸に立て籠る</option>
                    </select>
                  </>
                );
              })()}
              <FormationPicker corps={selC} onPick={(f) => changeForm(selC, f)} />
              {!selC.detach && (
                <>
                  <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim }}>
                    分遣 {opts[0] ? `${opts[0].used}／${opts[0].cap}` : ""}
                  </div>
                  <div className="g2">
                    {opts.map((o) => (
                      <button key={o.key} className="btn sm" disabled={!o.ok} title={o.why}
                        onClick={() => { makeDetachment(b, selC, o.key); force((n) => (n + 1) % 1000); }}>
                        {o.key}
                      </button>
                    ))}
                  </div>
                  {/* 出した分遣隊を呼び戻す（GDD 8.7） */}
                  {(() => {
                    const mine = b.corps.filter((x) => x.detach && !x.dead && x.parentId === selC.id);
                    if (!mine.length) return null;
                    return (
                      <>
                        <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, marginTop: 4 }}>
                          出している分遣
                        </div>
                        {mine.map((x) => (
                          <button key={x.id} className="btn sm" style={{ width: "100%", marginBottom: 3 }}
                            disabled={x.task === "帰陣"}
                            onClick={() => { recallDetachment(b, x); force((n) => (n + 1) % 1000); }}>
                            {x.task === "帰陣" ? "帰陣中" : `${x.task || "分遣"}を本隊へ戻す`}
                            <span style={{ fontSize: 10, color: U.dim, marginLeft: 5 }}>{fmt(corpsMen(x))}人</span>
                          </button>
                        ))}
                      </>
                    );
                  })()}
                </>
              )}
              {/* 分遣隊そのものを選んだときも戻せる */}
              {selC.detach && selC.task !== "帰陣" && (
                <button className="btn sm" style={{ width: "100%" }}
                  onClick={() => { recallDetachment(b, selC); force((n) => (n + 1) % 1000); }}>
                  本隊へ戻す
                </button>
              )}
              {selC.detach && selC.task === "帰陣" && (
                <div style={{ fontSize: 11.5, color: U.dim }}>本隊へ帰陣中。</div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.6, borderTop: `1px solid ${U.line2}`, paddingTop: 6 }}>
              隊をタップして選ぶと、その隊だけに前進・接戦・突撃・射撃・守備・後退を出せます。
              地面や敵をタップかドラッグでも命令できます。Escで選択解除。
            </div>
          )}
          <div style={{ fontSize: 11, color: U.dim, borderTop: `1px solid ${U.line2}`, paddingTop: 6 }}>
            {b.log.length ? b.log[b.log.length - 1].text : "　"}
          </div>
        </div>
      )}

      {b.phase === "over" && (
        <div style={{ display: "flex", flexDirection: land ? "column" : "row", gap: 8, alignItems: land ? "stretch" : "center", width: "100%" }}>
          <span className="mn" style={{ fontSize: 19, color: b.result === "P" ? "#3E7A3A" : b.result === "日没" ? "#7C7668" : "#B0483C" }}>
            {b.result === "P" ? "勝利" : b.result === "日没" ? "日没・両軍撤収" : b.orderly ? "撤退" : "敗北"}
          </span>
          <span style={{ fontSize: 12, color: U.dim, flex: 1 }}>
            損害　直属 {fmt(b.corps.filter((c) => c.side === "P").reduce((a, c) => a + c.loss["直属"], 0))}人／
            地域 {fmt(b.corps.filter((c) => c.side === "P").reduce((a, c) => a + c.loss["地域"], 0))}人
          </span>
          <button className="btn dark" onClick={() => onEnd(b)}>戦場を離れる</button>
        </div>
      )}
    </>
  );

  /* 撤退の念押し（GDD 8.2）。

     撤退は取り返しがつかない。一括命令の並びに「全軍撤退」があり、その隣は
     「全軍待機」である。指の下で一つずれれば、押した瞬間に全軍が戦場を離れる。
     押したら必ず問い、了解を得てから退く。 */
  const 退き実行 = () => {
    const k = 退き確認;
    set退き確認(null);
    if (!k) return;
    if (k.全軍) allOrder("撤退");
    else if (k.corps) {
      const c = k.corps;
      const r = 退かせる(b, c, false);            // 一隊だけ抜けるので追い討ちは重い
      b.log.push({ t: b.t, text: r && r.損
        ? `${c.gen.name}隊が槍を引いて戦場を離れる。背を追われ${fmt(r.損)}人を失った。`
        : `${c.gen.name}隊が戦場を離れる。` });
      if (r && r.損) notify(b, `${c.gen.name}隊、退き口で${fmt(r.損)}人を失う。`, "bad");
    }
    force((n) => (n + 1) % 1000);
  };
  const 退きの札 = 退き確認 && (() => {
    const 全 = !!退き確認.全軍;
    const c = 退き確認.corps;
    const 兵 = 全 ? pMen : c ? corpsMen(c) : 0;
    const 隊数 = b.corps.filter((x) => x.side === "P" && !x.dead && !x.destroyed && !x.routed).length;
    return (
      <div className="modal" onMouseDown={stop} onMouseUp={stop}>
        <div className="card" style={{ maxWidth: 430 }}>
          <div className="mn" style={{ fontSize: 20, marginBottom: 6 }}>
            {全 ? "全軍を退かせますか" : `${c.gen.name}隊を退かせますか`}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.95 }}>
            {全
              ? <>退き鉦を鳴らし、<b>{隊数}隊{fmt(兵)}人</b>が戦場を離れます。この合戦は<b>撤退</b>として終わります。</>
              : <><b>{fmt(兵)}人</b>が戦場を離れます。一度退いた隊は、この合戦には戻せません。</>}
          </div>
          <div style={{ margin: "10px 0", padding: "9px 11px", background: "rgba(176,72,60,0.08)",
            borderLeft: "3px solid #B0483C", fontSize: 11.5, lineHeight: 1.9 }}>
            {全
              ? "一斉に退き鉦を鳴らすので統制は保たれ、追い討ちの損は小さく済みます（槍を合わせている隊は兵の四分ほどを失います）。ただし城は落ちず、兵と兵糧は費えます。"
              : "一隊だけ槍を引くので、背を追われます（槍を合わせていれば兵の七分ほどを失い、士気と隊列も崩れます）。残る隊だけで戦うことになります。"}
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => set退き確認(null)}>取りやめる</button>
            <button className="btn dark" style={{ flex: 1 }} onClick={退き実行}>
              {全 ? "承知。全軍退く" : "承知。この隊を退かせる"}
            </button>
          </div>
        </div>
      </div>
    );
  })();

  return (
    <div className="sp" style={{ height: "100dvh", background: U.paper, overscrollBehavior: "none" }} onMouseDown={stop} onMouseUp={stop}>
      {退きの札}
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", minHeight: 0 }}>
        {!wide && (
        <div className="bar" style={{ padding: "6px 10px", gap: 10, fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="dot" style={{ background: ctx.pColor }} /><b className="mn" style={{ fontSize: 14 }}>{ctx.pName}</b>
          </span>
          <span className="kv">兵 <b className="num">{fmt(pMen)}</b></span>
          <span className="kv">士気 <b className="num">{pMor}</b></span>
          <span className="mn" style={{ color: U.dim }}>対</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="dot" style={{ background: ctx.eColor }} /><b className="mn" style={{ fontSize: 14 }}>{ctx.eName}</b>
          </span>
          <span className="kv">兵 <b className="num">{fmt(eMen)}</b></span>
          <span className="kv">{ctx.place}{ctx.mode === "castle" ? "城攻め" : ctx.mode === "clash" ? "の野戦" : "下"}・{b.weather}</span>
          {ctx.mode === "castle" && b.map && b.map.gates.map((gt) => (
            <span key={gt.key} style={{ fontSize: 11, color: U.dim }}>
              {gt.key}
              <b style={{ color: gt.broken ? "#B0483C" : gt.hp / gt.max > 0.4 ? U.text : "#C89A3A" }}>
                {gt.broken ? "破" : `${Math.round((gt.hp / gt.max) * 100)}%`}
              </b>
            </span>
          ))}
          {ctx.mode === "castle" && b.map && b.press != null && (
            <span style={{ fontSize: 11, color: U.dim }}>
              城の傾き<b style={{ color: b.press > 0.6 ? "#B0483C" : U.text }}>{Math.round(b.press * 100)}%</b>
            </span>
          )}
          <span style={{ flex: 1 }} />
          <span className="kv num">
            {Math.floor(b.t / 60)}:{String(Math.floor(b.t % 60)).padStart(2, "0")}
            <span style={{ color: U.dim }}>／日没まで{Math.max(0, Math.ceil((b.dusk - b.t) / 60))}分</span>
          </span>
          {phase === "fight" && (
            <>
              <button className={`btn sm ${speed === 0 ? "on" : ""}`} onClick={() => setSpeed(0)}>停止</button>
              <button className={`btn sm ${speed === 0.12 ? "on" : ""}`} onClick={() => setSpeed(0.12)}>微速</button>
              <button className={`btn sm ${speed === 0.3 ? "on" : ""}`} onClick={() => setSpeed(0.3)}>低速</button>
              <button className={`btn sm ${speed === 0.6 ? "on" : ""}`} onClick={() => setSpeed(0.6)}>通常</button>
            </>
          )}
        </div>
        )}

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: land ? "row" : "column" }}>
          <div ref={wrapRef} className="fieldwrap"
            style={{ flex: 1, minWidth: 0, minHeight: 0, position: "relative", background: "#B9C99C", overflow: "hidden" }}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => (gesture.current = null)}
            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp} onTouchCancel={onCancel}
            onWheel={(e) => zoomAt(e.deltaY < 0 ? 1.12 : 0.89, e.clientX, e.clientY)}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />
            {/* 委ねている間の目安。戦場の刻がどこまで進んだかを示す。 */}
            {委ね中 && (
              <div style={{ position: "absolute", inset: 0, zIndex: 20, background: "rgba(244,241,232,.92)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                <div className="mn" style={{ fontSize: 22 }}>諸将に委ねている</div>
                <div style={{ fontSize: 12, color: U.dim }}>
                  戦場の刻　{Math.floor(b.t / 60)}:{String(Math.floor(b.t % 60)).padStart(2, "0")}
                  　／　日没まで {Math.max(0, Math.round((b.dusk - b.t) / 60))} 分
                </div>
                <div style={{ width: 240, height: 6, background: "#EEEBE2", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (b.t / b.dusk) * 100)}%`, height: "100%", background: U.ink }} />
                </div>
                <div style={{ fontSize: 11.5, color: U.dim }}>
                  <span className="dot" style={{ background: ctx.pColor, marginRight: 5 }} />{fmt(pMen)}
                  <span style={{ margin: "0 8px" }}>対</span>
                  <span className="dot" style={{ background: ctx.eColor, marginRight: 5 }} />{fmt(eMen)}
                </div>
              </div>
            )}
            {(b.notices || []).filter((n) => b.t - n.t < 6).slice(-3).map((n, i) => (
              <div key={`${n.t}-${i}`} className="mn"
                style={{ position: "absolute", left: "50%", transform: "translateX(-50%)",
                  top: 12 + i * 34, padding: "7px 16px", borderRadius: 8, fontSize: 15, whiteSpace: "nowrap",
                  background: n.kind === "bad" ? "rgba(176,72,60,0.93)" : n.kind === "good" ? "rgba(62,122,58,0.93)" : "rgba(40,40,36,0.9)",
                  color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.25)", pointerEvents: "none", zIndex: 5 }}>
                {n.text}
              </div>
            ))}
            {wide && (
              <div style={{ position: "absolute", right: 10, top: 10, zIndex: 6, display: "flex", gap: 6, alignItems: "center",
                background: "rgba(255,255,255,.94)", border: `1px solid ${U.line}`, borderRadius: 18, padding: "5px 10px", fontSize: 11.5 }}
                onMouseDown={stop} onMouseUp={stop}>
                <span className="dot" style={{ background: ctx.pColor }} /><b className="num">{fmt(pMen)}</b>
                <span style={{ color: U.dim }}>対</span>
                <span className="dot" style={{ background: ctx.eColor }} /><b className="num">{fmt(eMen)}</b>
                <span className="num" style={{ color: U.dim }}>{Math.floor(b.t / 60)}:{String(Math.floor(b.t % 60)).padStart(2, "0")}</span>
                {phase === "fight" && [["停", 0], ["微", 0.12], ["低", 0.3], ["通", 0.6]].map(([lb, v]) => (
                  <button key={lb} className={`btn sm ${speed === v ? "on" : ""}`} style={{ padding: "3px 6px" }}
                    onClick={() => setSpeed(v)}>{lb}</button>
                ))}
              </div>
            )}
            <div className="mapctl l" onMouseDown={stop} onMouseUp={stop} onTouchStart={stop} onTouchEnd={stop}>
              <div className="mbtn" onClick={() => zoomAt(1.3, null)}><b>＋</b>拡大</div>
              <div className="mbtn" onClick={() => zoomAt(0.77, null)}><b>−</b>縮小</div>
              <div className="mbtn" onClick={fitAll}><b>⛶</b>全体</div>
              <div className="mbtn" onClick={() => setPanel((v) => !v)}><b>▤</b>{panel ? "収納" : "展開"}</div>
              <div className={`mbtn ${wide ? "on" : ""}`} onClick={() => setWide((v) => !v)}>
                <b>{wide ? "▤" : "⤢"}</b>{wide ? "戻す" : "広く"}
              </div>
            </div>
          </div>

          {panel && (
            <div className="bpanel" onMouseDown={stop} onMouseUp={stop} onTouchStart={stop} onTouchEnd={stop}
              style={{
                flex: "0 0 auto", background: U.card, padding: "8px 10px", overflowY: "auto",
                width: land ? (wide ? 200 : 246) : "auto", maxHeight: land ? "none" : "40%",
                borderLeft: land ? `1px solid ${U.line}` : "none",
                borderTop: land ? "none" : `1px solid ${U.line}`,
              }}>
              {panelBody}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

