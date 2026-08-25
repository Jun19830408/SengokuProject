import * as 政務 from "../govern/commands.js";
import * as 月送り from "../govern/month.js";
import * as 合戦裁定 from "../govern/war.js";
import React, { useState, useRef, useEffect } from "react";
import { SIEGE_CORPS_CAP, SIEGE_KIT, axisOf, buildCastleMap, fromUV, gateOpenU, layoutCastleField, setBattleMap, 寄せ口 } from "../battle/castleMap.js";
import { corpsMax, corpsMen, makeCorps, notify, placeSquads } from "../battle/corps.js";
import { 城方の隊を立てる } from "../battle/defense.js";
import { drawMon, sideHue } from "../battle/draw.js";
import { createBattle } from "../battle/engine.js";
import { BASE, FIELD, MAX_CORPS, layoutField, setFieldSeed } from "../battle/field.js";
import { ambushChance, ambushPlan, tryAmbush } from "../core/ambush.js";
import { captureChance, makePrisoner, payRansom, ransomAccept, ransomCost, takeAsPrisoner } from "../core/capture.js";
import { 取り立てる, COMING_OF_AGE, actingHead, bearChild, canRecruit, emergeGenerals, hasHouse, heirCandidates, houseName, inheritHouse, lifeSpan, loyaltyAfterRecruit, makePromotion, needsGuardian, ruinedHouse, succeed } from "../core/house.js";
import { resolveSeaBattle, seaInterception } from "../core/naval.js";
import { findPath, marchMonths, nodeById, roadBetween } from "../core/paths.js";
import { courtRank, holdsProvince, kenchiCost, kenchiDone, provinceGrip, provincesHeld, rankBonus, runKenchi } from "../core/province.js";
import { fiefOf, fiefRoom, fiefWanted, loyaltyDrift, minGarrison, stipendOf, troopCap } from "../core/rank.js";
import { newRoster, rosterSum, rosterSync, rosterTake } from "../core/roster.js";
import { atPeace, lv, relKey, relOf, specialBonus } from "../core/state.js";
import { SEASON, U, clamp, fmt, man, monthsBetween } from "../core/util.js";
import { TOWNS } from "../data/castles.js";
import { DIPLO, PLOTS, SPECIAL_OPTIONS } from "../data/diplo.js";
import { KUNI_LABELS, MAPH, MAPW, RIVERS, SEA_LABELS, px, py } from "../data/geo.js";
import { FATED, NEWCOMERS, PARENT } from "../data/newcomers.js";
import { GOKINAI } from "../data/provinces.js";
import { MARCH_PER_MONTH, MOB_POLICY, ROAD_SPEED } from "../data/roads.js";
import { reviewAim } from "../govern/ai.js";
import { checkUnified } from "../govern/unify.js";
import { sackCastle } from "../govern/war.js";
import { BattleScreen } from "./BattleScreen.jsx";
import { SeaScreen, 海戦を仕立てる } from "./SeaScreen.jsx";
import { CastleSheet } from "./CastleSheet.jsx";
import { seatOf } from "./DaimyoSelect.jsx";
import { CampaignPanel, CaptiveDialog, Chronicle, FactionInfo, GeneralList, GoalPanel, MonthReport, PromotionDialog, SiegePanel, SortieDialog } from "./panels.jsx";
import { SallyDialog } from "./panels.jsx";
import { Manual } from "./Manual.jsx";
import { Ending } from "./Ending.jsx";
import { ReinforceDialog, GateDeployDialog, HimeList, MarriageOffer, DiploOffer } from "./panels.jsx";
import { underMyBanner, 己の盟約, 主家 } from "../core/state.js";
import { 忠誠, 守備隊の統率, castellanOf } from "../core/rank.js";
import { 守りの割り付け } from "../core/garrison.js";
import { 使者に立てる, 婚姻を結ぶ, 家臣に嫁がせる, 縁談を受ける, 縁談を断る } from "../core/hime.js";
import { 蓄えに合わせる } from "../core/roster.js";
import { 援けに着く } from "../core/state.js";
import { 難を逃れる } from "../core/capture.js";
import { 記録の訳を読む, 記録の見出し } from "../save/save.js";
import { 外を押して閉じる } from "./panels.jsx";
import { rosterCut } from "../core/roster.js";
import { drawTownMark, 町の印の位置, 町の様子 } from "../core/town.js";
import { 特殊勢力の可否 } from "../core/town.js";
import { findPathVia } from "../core/paths.js";

/* ============================================================ 政略マップ */
/* 武功による取り立て（GDD 6.7 / 9.3）。

   手柄を立てた隊の主が、名も無き者を武将に取り立てる。
   隊が「◯◯城守備隊」であっても武功は武功である。名は伝わらぬが、
   門を守り抜いたのはその者たちである。その場合は城を預かる者の名で取り立て、
   取り立てられた者はその城に留まる。 */
function 手柄の隊(s, corps, castle) {
  const hero = corps.find((c) => c.feats.length || c.loss["直属"] > 60);
  if (!hero) return null;
  const gen = s.generals.find((x) => x.id === hero.id);
  if (gen) return { lord: gen, at: gen.at, faction: gen.faction, 守備隊: false };
  if (!hero.守備隊 || !castle) return null;
  const 主 = castellanOf(s, castle)
    || s.generals.find((x) => x.faction === castle.faction && x.id === (s.factions[castle.faction] || {}).lord);
  if (!主) return null;
  return { lord: 主, at: castle.id, faction: castle.faction, 守備隊: true };
}

export function MapScreen({ g, setG, terrain, land, onSave, saves, onTitle }) {
  const cvRef = useRef(null), miniRef = useRef(null), wrapRef = useRef(null);
  const [view, setView] = useState(() => {
    const seat = seatOf(g.castles, g.generals, g.player);
    return seat ? { x: seat.x, y: seat.y, s: 2.4 } : { x: MAPW / 2, y: MAPH / 2, s: 0.9 };
  });
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState("内政");
  const [modal, setModal] = useState(null);
  const [battle, setBattle] = useState(null);
  const [sea, setSea] = useState(null);        // 盤の上の海戦
  const [townSel, setTownSel] = useState(null); // 押した特殊勢力
  const [raid, setRaid] = useState(null);        // 合戦前の奇襲の献策
  const [breakVow, setBreakVow] = useState(null); // 約束を交わした相手へ兵を出すときの問い
  const [sally, setSally] = useState(null);      // 囲まれた城が討って出るかの問い
  const [callAid, setCallAid] = useState(null);  // 援軍を呼ぶ画面（攻められた城）
  const 終幕を見た = !!g.終幕を見た;
  const [rotate, setRotate] = useState(true);
  const [savedMsg, setSavedMsg] = useState("");
  const [wide, setWide] = useState(false);
  const drag = useRef(null);
  // 月が変わるたびに自動で記録する
  const lastSave = useRef("");
  useEffect(() => {
    const key = `${g.year}-${g.month}`;
    if (lastSave.current === key || battle) return;
    lastSave.current = key;
    // 記録は一呼吸おいてから収める。盤を描き終えてからのほうが、指の下が軽い。
    setTimeout(() => onSave(g), 0);
  }, [g.year, g.month, battle]); // eslint-disable-line

  const pf = g.factions[g.player];
  const mine = g.castles.filter((c) => c.faction === g.player);
  const myGens = g.generals.filter((x) => x.faction === g.player);

  const draw = () => {
    const cv = cvRef.current, wrap = wrapRef.current;
    if (!cv || !wrap || !terrain) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { x: vx, y: vy, s } = view;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(terrain, -vx * s + W / 2, -vy * s + H / 2, MAPW * s, MAPH * s);
    const S = (wx, wy) => [(wx - vx) * s + W / 2, (wy - vy) * s + H / 2];

    // 版図。土地はいちばん近い城の家に属するものとして塗り分ける。
    // 境目がはっきり出るので、誰がどこを持つかが一目で分かる。
    {
      const cell = 20;
      ctx.save();
      ctx.globalAlpha = 0.19;
      const cs = g.castles.map((c) => ({ x: c.x, y: c.y, col: g.factions[c.faction].color,
        w: 1 + Math.sqrt(c.koku / 10000) * 0.34 }));
      for (let sy = 0; sy < H; sy += cell) {
        for (let sx = 0; sx < W; sx += cell) {
          const wx = (sx + cell / 2 - W / 2) / s + vx, wy = (sy + cell / 2 - H / 2) / s + vy;
          let best = null, bd = 1e9;
          for (const c of cs) {
            const d2 = Math.hypot(c.x - wx, c.y - wy) / c.w;
            if (d2 < bd) { bd = d2; best = c; }
          }
          if (!best || bd > 230) continue;         // 遠すぎる土地は誰のものでもない
          ctx.fillStyle = best.col;
          ctx.fillRect(sx, sy, cell + 1, cell + 1);
        }
      }
      ctx.restore();
    }
    // 旧国の名。盤の外の国は薄く添えるにとどめる。
    ctx.textAlign = "center";
    for (const q of KUNI_LABELS) {
      const [a, b2] = S(q.x, q.y);
      if (a < -60 || a > W + 60 || b2 < -40 || b2 > H + 40) continue;
      const sz = Math.round(clamp(15 + s * 9, 14, 30));
      ctx.font = `${sz}px 'Hiragino Mincho ProN',serif`;
      ctx.fillStyle = q.on ? `rgba(96,86,66,${clamp(0.20 + s * 0.16, 0.2, 0.42)})`
        : `rgba(140,134,120,${clamp(0.12 + s * 0.08, 0.12, 0.24)})`;
      ctx.fillText(q.name, a, b2);
    }
    // 海と湖の名
    ctx.fillStyle = `rgba(70,104,128,${clamp(0.3 + s * 0.2, 0.3, 0.6)})`;
    for (const q of SEA_LABELS) {
      const [a, b2] = S(q.x, q.y);
      if (a < -60 || a > W + 60 || b2 < -40 || b2 > H + 40) continue;
      ctx.font = `${Math.round(clamp(13 + s * 6, 12, 22))}px 'Hiragino Mincho ProN',serif`;
      ctx.fillText(q.name, a, b2);
    }
    ctx.textAlign = "left";
    if (s > 0.72) {
      ctx.font = "13px 'Hiragino Mincho ProN',serif"; ctx.fillStyle = "rgba(56,96,124,.9)";
      for (const r of RIVERS) {
        const p = r.pts[Math.floor(r.pts.length / 2)];
        const [a, b2] = S(p[0] + 8, p[1]);
        ctx.fillText(r.name, a, b2);
      }
    }
    for (const a of g.armies) {
      const n0 = nodeById(a.path[0]), n1 = a.path.length > 1 ? nodeById(a.path[1]) : n0;
      const [ax, ay] = S(n0.x + (n1.x - n0.x) * a.prog, n0.y + (n1.y - n0.y) * a.prog);
      const dst = nodeById(a.target); const [dx2, dy2] = S(dst.x, dst.y);
      const col = g.factions[a.faction].color;
      ctx.strokeStyle = col + "77"; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(dx2, dy2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ax, ay, 11, 0, 7); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ax, ay, 8.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "600 10px sans-serif"; ctx.fillText("軍", ax - 5, ay + 3.5);
      ctx.fillStyle = "#33332F"; ctx.font = "11px sans-serif"; ctx.fillText(`${fmt(a.men)}`, ax + 14, ay + 4);
    }
    /* 特殊勢力（GDD 5.4 / 13.1）。
       これまではどの町も同じ灰色の点で、名を読まねば湊か寺社か分からなかった。
       種ごとの形にし、誼を通じた家があればその家の色で塗る。 */
    for (const t of TOWNS) {
      /* 町の座標は lon/lat のままで、x/y は入っていない（paths.js が別に
         NODES へ写しているだけである）。そのため S(t.x, t.y) は NaN を返し、
         町は一つも描かれていなかった。印を種ごとの形にしても、
         そもそも描かれていなければ意味がない。ここで地図の座標へ直す。 */
      const 印 = 町の印の位置(t, g.castles, px, py);
      const [x, y] = S(印.x, 印.y);
      const 様 = 町の様子(g, t);
      // 城より控えめにする。町は城の合間にあるので、同じ重さで描くと図が煩い。
      const r = 様.誼 ? 5.6 : 4.6;
      ctx.fillStyle = "rgba(0,0,0,0.14)";
      ctx.beginPath(); ctx.arc(x + 0.8, y + 1.2, r + 2.6, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, r + 2.4, 0, 7); ctx.fill();
      if (様.誼) {                              // 誼を通じた家があれば、その色の輪をかける
        ctx.strokeStyle = 様.色; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(x, y, r + 2.4, 0, 7); ctx.stroke();
      }
      if (townSel === t.id) {
        ctx.strokeStyle = 様.色; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(x, y, r + 8, 0, 7); ctx.stroke();
      }
      drawTownMark(ctx, t.kind, x, y, r, 様.色);
      /* 町の名は、寄せたときだけ出す。城の名札と重なって図が読めなくなるからである。
         印そのものは遠目にも出しておく。何かがそこに在る、とだけ分かればよい。 */
      if (s > 0.85) {
        ctx.font = "11.5px 'Hiragino Sans',sans-serif";
        const w = ctx.measureText(t.name).width;
        ctx.fillStyle = "rgba(255,255,255,.72)"; ctx.fillRect(x - w / 2 - 3, y + r + 4, w + 6, 14);
        ctx.fillStyle = "#4A4840"; ctx.fillText(t.name, x - w / 2, y + r + 15);
        if (s > 1.45) {
          ctx.fillStyle = U.dim; ctx.font = "10px sans-serif";
          const k = `（${t.kind}${様.主名 ? `・${様.主名}` : ""}）`;
          ctx.fillText(k, x - ctx.measureText(k).width / 2, y + r + 27);
        }
      }
    }
    // 城。石高の大きさを丸の大きさで表し、囲まれていれば赤い環を添える。
    for (const c of g.castles) {
      const [x, y] = S(c.x, c.y);
      const col = g.factions[c.faction].color;
      const big = clamp(4.4 + Math.sqrt(c.koku / 10000) * 1.5, 4.4, 11);
      const besieged = g.sieges.some((sg) => sg.castleId === c.id);
      if (sel === c.id) {
        ctx.strokeStyle = col; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(x, y, big + 11, 0, 7); ctx.stroke();
      }
      if (besieged) {
        ctx.strokeStyle = "rgba(176,72,60,0.85)"; ctx.lineWidth = 2.4; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(x, y, big + 7, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.beginPath(); ctx.arc(x + 1, y + 1.5, big + 3.2, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, big + 3.0, 0, 7); ctx.fill();
      // 家紋。小さすぎると潰れるので、遠目には色の丸で示す。
      const mon = (g.factions[c.faction] || {}).mon;
      if (mon && big >= 6.5) drawMon(ctx, mon, x, y, big, col, "#fff");
      else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, big * 0.82, 0, 7); ctx.fill(); }
      /* 間柄の印（GDD 12.1 / 12.2）。自家との結びを、城の下に小さな帯で示す。
         青＝不可侵、緑＝同盟、金の帯＝こちらの旗の下（従属・臣従）、
         金の枠＝こちらが膝を屈している相手。地図を見ただけで境が読める。 */
      if (c.faction !== g.player) {
        const rel = relOf(g, g.player, c.faction);
        const 下 = ["従属", "臣従"].includes(rel.state) ? (主家(g, g.player, c.faction) === g.player ? "下" : "上") : null;
        const 印 = 下 === "下" ? { c: "#C8A44A", t: rel.state === "臣従" ? "臣" : "属" }
          : 下 === "上" ? { c: "#8A6B3A", t: rel.state === "臣従" ? "臣" : "属" }
          : rel.state === "同盟" ? { c: "#3E7A3A", t: "盟" }
          : rel.state === "不可侵" ? { c: "#4A6E8A", t: "侵" }
          : null;
        if (印) {
          // 城を囲む輪。旗の下（従属・臣従）は太く、誼（同盟・不可侵）は細く。
          ctx.strokeStyle = 印.c; ctx.lineWidth = 下 ? 3.0 : 2.0;
          if (!下) ctx.setLineDash([3.2, 2.6]);
          ctx.beginPath(); ctx.arc(x, y, big + 5.6, 0, 7); ctx.stroke();
          ctx.setLineDash([]);
          if (big >= 6.2) {                          // 近づけば字を添える
            const bx = x + big + 4.6, by = y + big + 3.2;
            ctx.fillStyle = 印.c;
            ctx.beginPath(); ctx.arc(bx, by, 5.4, 0, 7); ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = "#fff"; ctx.font = "700 7.4px system-ui, sans-serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(印.t, bx, by + 0.4);
          }
        }
      }
      // 本城には金の輪をつける
      const isSeat = g.generals.some((q) => q.at === c.id && q.faction === c.faction && q.lord && !q.captive);
      if (isSeat) {
        ctx.strokeStyle = "#C8A44A"; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(x, y, big + 4.2, 0, 7); ctx.stroke();
      }
      if (s > 0.5) {
        ctx.font = `600 ${Math.round(clamp(11 + s * 3, 11, 15))}px 'Hiragino Sans',sans-serif`;
        const w = ctx.measureText(c.name).width;
        ctx.fillStyle = "rgba(255,255,255,.88)";
        ctx.fillRect(x - w / 2 - 4, y - big - 22, w + 8, 17);
        ctx.fillStyle = "#2A2A28"; ctx.fillText(c.name, x - w / 2, y - big - 9);
      }
      if (s > 1.05) {
        const men = c.local + g.generals.filter((q) => q.at === c.id && q.faction === c.faction && !q.captive).reduce((a, q) => a + q.retinue, 0);
        ctx.font = "11px sans-serif"; ctx.fillStyle = col;
        ctx.fillText(`${fmt(men)}`, x + big + 5, y + 12);
      }
    }
    const mv = miniRef.current;
    if (mv) {
      const mc = mv.getContext("2d");
      if (mv.width !== 130) { mv.width = 130; mv.height = 139; }
      mc.clearRect(0, 0, 130, 139);
      mc.drawImage(terrain, 0, 0, MAPW, MAPH, 0, 0, 130, 139);
      const k = 130 / MAPW;
      mc.strokeStyle = "#fff"; mc.lineWidth = 2;
      mc.strokeRect((vx - W / 2 / s) * k, (vy - H / 2 / s) * k, (W / s) * k, (H / s) * k);
    }
  };
  useEffect(draw);
  useEffect(() => {
    const on = () => draw();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  });
  // 地図のドラッグが端末のスクロールや引っ張り更新に伝わらないようにする
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const block = (e) => { if (e.target === cvRef.current) e.preventDefault(); };
    el.addEventListener("touchmove", block, { passive: false });
    el.addEventListener("touchstart", block, { passive: false });
    return () => { el.removeEventListener("touchmove", block); el.removeEventListener("touchstart", block); };
  }, []);

  // 地図の操作は、地図そのもの（canvas）を触ったときだけ受け付ける。
  // シートやボタンの押下が地図に伝わって選択が解除されるのを防ぐ。
  const onDown = (e) => {
    if (e.target !== cvRef.current) { drag.current = null; return; }
    // 二本指なら拡げ縮め。地図に指を二本置いたときの当然の振る舞いである。
    if (e.touches && e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const r = wrapRef.current.getBoundingClientRect();
      const mx = (t1.clientX + t2.clientX) / 2 - r.left - r.width / 2;
      const my = (t1.clientY + t2.clientY) / 2 - r.top - r.height / 2;
      drag.current = {
        pinch: true, moved: 99,
        d0: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY),
        s0: view.s, vx: view.x, vy: view.y,
        wx: mx / view.s + view.x, wy: my / view.s + view.y,   // 指の間にある土地
      };
      return;
    }
    const p = e.touches ? e.touches[0] : e;
    drag.current = { x: p.clientX, y: p.clientY, vx: view.x, vy: view.y, moved: 0 };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    if (d.pinch) {
      if (!e.touches || e.touches.length < 2) return;
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dd = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (!d.d0 || !dd) return;
      const r = wrapRef.current.getBoundingClientRect();
      const mx = (t1.clientX + t2.clientX) / 2 - r.left - r.width / 2;
      const my = (t1.clientY + t2.clientY) / 2 - r.top - r.height / 2;
      const ns = clamp(d.s0 * (dd / d.d0), 0.28, 12);
      // 指の間にある土地が動かないように、見ている中心をずらす
      setView(() => ({ x: d.wx - mx / ns, y: d.wy - my / ns, s: ns }));
      return;
    }
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - d.x, dy = p.clientY - d.y;
    d.moved = Math.max(d.moved, Math.hypot(dx, dy));
    // 値は先に控える。setView の中で drag.current を見ると、
    // 指を離した後に評価されて null になることがある。
    const vx = d.vx, vy = d.vy;
    setView((v) => ({ ...v, x: vx - dx / v.s, y: vy - dy / v.s }));
  };
  // 指の追跡が断たれたとき（着信・画面の切り替えなど）。掴んだままにしない。
  const onCancel = () => { drag.current = null; };
  const onUp = (e) => {
    const d = drag.current; drag.current = null;
    if (!d || d.moved > 6 || e.target !== cvRef.current) return;
    const wrap = wrapRef.current, r = wrap.getBoundingClientRect();
    const p = e.changedTouches ? e.changedTouches[0] : e;
    const wx = (p.clientX - r.left - r.width / 2) / view.s + view.x;
    const wy = (p.clientY - r.top - r.height / 2) / view.s + view.y;
    let hit = null, best = 26 / view.s;
    for (const c of g.castles) { const dd = Math.hypot(c.x - wx, c.y - wy); if (dd < best) { best = dd; hit = c.id; } }
    if (hit) { setSel(hit); setTownSel(null); setTab("内政"); return; }
    // 特殊勢力を押したら、その帳を開く（城より狭い当たり）
    let ht = null, bt = 20 / view.s;
    for (const t of TOWNS) {
      const 印 = 町の印の位置(t, g.castles, px, py);
      const dd = Math.hypot(印.x - wx, 印.y - wy);
      if (dd < bt) { bt = dd; ht = t.id; }
    }
    if (ht) { setTownSel(ht); setSel(null); return; }
    setSel(null); setTownSel(null);
  };
  /* 拡げられる限り（GDD 13.1）。

     三.二倍までしか拡げられなかったので、近い城どうし――大内氏館と高嶺城
     （三歩）、松倉城と魚津城（五.六歩）、姫路城と御着城（六.四歩）――の印が
     重なったまま離れなかった。二十六歩ぶん離すには八.六倍が要る。
     九倍まで拡げられるようにした。 */
  const zoom = (k) => setView((v) => ({ ...v, s: clamp(v.s * k, 0.28, 12) }));
  const focus = (id) => { const n = nodeById(id); if (n) setView((v) => ({ ...v, x: n.x, y: n.y, s: Math.max(1.2, v.s) })); };
  const whole = () => setView({ x: MAPW / 2, y: MAPH / 2, s: 0.30 });

  /* ---------------------------------------------------------- 政務 */
  const runCommand = (castleId, cmd, genId) => {
    setG((prev) => 政務.runCommand(prev, castleId, cmd, genId, g));
  };

  const appoint = (castleId, genId) => setG((prev) => 政務.appoint(prev, castleId, genId));

  // 外交（GDD 11.1）。約束の残り期間はゲーム上の情報として保持する。
  // 検地（GDD 4.6）。一国を丸ごと押さえてはじめて竿を入れられる。
  const doKenchi = (kuni, genId) => setG((prev) => 政務.doKenchi(prev, kuni, genId));

  // 戦後の始末（GDD 12.4）。捕らえた将をどう遇するか。
  const settleCaptive = (genId, kind) => setG((prev) => 政務.settleCaptive(prev, genId, kind));

  // 隠居（GDD 6.3）。生きているうちに家督を譲れば、家中は揺れない。
  const doRetire = (heirId) => setG((prev) => 政務.doRetire(prev, heirId));
  // 捕虜の処遇（GDD 12.3）。外交の「捕虜」から選ぶ。
  const doCaptive = (genId, how) => setG((prev) => 政務.doCaptive(prev, genId, how));
  const doDiplo = (fid, key) => setG((prev) => 政務.doDiplo(prev, fid, key));

  // 調略（GDD 11.2）。接触から成立・拒否・露見まで数か月かかる。
  const doPlot = (castleId, type, genId, matoId) => setG((prev) => 政務.doPlot(prev, castleId, type, genId, matoId));

  // 特殊勢力（GDD 11.3）
  const doSpecial = (townId, key) => setG((prev) => 政務.doSpecial(prev, townId, key));

  // 人事・褒賞（GDD 4.2 / 12.1）
  // 知行を与える／減らす（GDD 6.1）
  const grantFief = (genId, delta) => setG((prev) => 政務.grantFief(prev, genId, delta));
  const reward = (genId) => setG((prev) => 政務.reward(prev, genId));

  const nextMonth = () => {
    setG((prev) => 月送り.advanceMonth(prev, g));
    setModal("report");
  };

  /* 海路での行き合い（GDD 10章）。

     渡海を阻まれたら、盤の上で船戦をする。月送りはそこで止めてあるので
     （month.js が s.seaCall を積んで break する）、決着したら続きを進める。 */
  useEffect(() => {
    if (!g.seaCall || sea || battle) return;
    const call = g.seaCall;
    const army = g.armies.find((x) => x.id === call.armyId);
    if (!army) { setG((p) => ({ ...p, seaCall: null })); return; }
    const 地 = `${nodeById(call.from).name}〜${nodeById(call.to).name}`;
    const ctx2 = 海戦を仕立てる(g, army, { by: call.by, mine: call.mine, foe: call.foe },
      地, g.factions[g.player].color, g.factions[call.by].color,
      g.factions[g.player].name, g.factions[call.by].name);
    setSea({ ...ctx2, key: call.armyId, call });
  }, [g.seaCall, sea, battle]); // eslint-disable-line

  /* 船戦の始末。盤の帰趨を、そのまま軍と海の記録へ移す。 */
  const 海戦を終える = (bb) => {
    const ctx2 = sea;
    setSea(null);
    setG((prev) => {
      const s = structuredClone(prev);
      const call = s.seaCall || (ctx2 && ctx2.call);
      s.seaCall = null;
      const a = s.armies.find((x) => x.id === (call && call.armyId));
      if (!a) return s;
      const 我残 = bb.fleets.filter((f) => f.side === "P" && !f.dead)
        .reduce((t, f) => t + f.ships.filter((x) => !x.sunk).length, 0);
      const 初 = ctx2.初め.P || 1;
      const 沈 = Math.max(0, 初 - 我残);
      const 敵残 = bb.fleets.filter((f) => f.side === "E" && !f.dead)
        .reduce((t, f) => t + f.ships.filter((x) => !x.sunk).length, 0);
      /* 沈んだ船の割だけ、兵が海に沈む。船に乗せて渡っているのだから、
         船を失えば人も失う。勝っても無傷では済まない。 */
      const 割 = clamp(沈 / 初, 0, 1);
      const 失 = Math.round(a.men * clamp(割 * 0.9, 0, 0.85));
      a.men = Math.max(0, a.men - 失);
      a.local = Math.max(0, a.local - 失);
      if (a.rost) rosterCut(a.rost, 失);
      const 勝 = bb.result === "P";
      const 地 = `${nodeById(call.from).name}と${nodeById(call.to).name}の間の海`;
      const 文 = 勝
        ? `${地}で${s.factions[s.player].name}が${s.factions[call.by].name}の水軍を破った（船${沈}艘・${fmt(失)}人を失う）。`
        : bb.result === "日没"
          ? `${地}で${s.factions[call.by].name}の水軍と渡り合い、日暮れに互いが離れた（船${沈}艘・${fmt(失)}人を失う）。`
          : `${地}で${s.factions[s.player].name}が${s.factions[call.by].name}の水軍に敗れた（船${沈}艘・${fmt(失)}人が海に沈んだ）。`;
      s.chronicle.push({ y: s.year, m: s.month, text: 文 });
      s.monthEvents = [...(s.monthEvents || []), 文];
      const rel = s.relations[relKey(s.player, call.by)];
      if (rel) rel.trust = clamp(rel.trust - 10, 0, 100);
      /* 船戦に敗れれば、渡海は成らない。国元へ引き返す。

         これを入れずにいたため、海で打ち負かされても兵を減らしただけで
         そのまま上陸できていた。それでは「海路を阻む」ということの意味がない。
         海の上に退き場はなく、押し通ることもできない。
         日暮れで両軍が離れたのなら、渡ることはできる。 */
      if (!勝 && bb.result !== "日没") {
        const home = s.castles.find((c2) => c2.id === a.from);
        if (home) {
          home.local += Math.max(0, a.local);
          home.food += Math.max(0, a.food || 0);
          if (a.rost && a.rost.length) home.rost = [...(home.rost || []), ...a.rost];
          rosterSync(home, "rost", home.local, `loc-${home.id}`);
          for (const gid of a.gens) { const x = s.generals.find((q) => q.id === gid); if (x) x.at = home.id; }
        }
        s.armies = s.armies.filter((x) => x.id !== a.id);
        s.campaigns = (s.campaigns || []).filter((c2) => !(c2.armies || []).includes(a.id));
        s.monthEvents = [...(s.monthEvents || []),
          `海路を阻まれ、渡海は成らなかった。${home ? `${home.name}へ引き返した。` : ""}`];
      }
      return s;
    });
  };

  /* 街道での行き合い（GDD 9.1）。
     互いの城を攻め合えば、同じ街道を逆に進むのだから、途中で必ず行き合う。
     まず野で当たり、勝ったほうが道を進む。城攻めの始末はその後である。 */
  useEffect(() => {
    if (!g.clashes || !g.clashes.length || battle) return;
    const cl = g.clashes[0];
    const a = g.armies.find((x) => x.id === cl.aId);
    const b = g.armies.find((x) => x.id === cl.bId);
    if (!a || !b) { setG((p) => ({ ...p, clashes: (p.clashes || []).slice(1) })); return; }
    if (g.autoPlay || (a.faction !== g.player && b.faction !== g.player)) {
      setG((prev) => 合戦裁定.resolveClashOffscreen(prev));
      return;
    }
    const mine = a.faction === g.player ? a : b;
    startClash(mine, mine === a ? b : a, cl);
  }, [g.clashes, battle]); // eslint-disable-line

  useEffect(() => {
    if (g.clashes && g.clashes.length) return;      // 行き合いの野戦が先である
    if (!g.pendingArrivals || !g.pendingArrivals.length || battle) return;
    const a = g.armies.find((x) => x.id === g.pendingArrivals[0]);
    const dest = a && g.castles.find((c) => c.id === a.at);
    if (!a || !dest) { setG((p) => ({ ...p, pendingArrivals: p.pendingArrivals.slice(1) })); return; }
    // 自勢力が関わらない合戦は画面に出さず、同じ規則で自動解決する（GDD 13.2）
    // 試走のときは自勢力の合戦も自動で解く
    if (g.autoPlay || (a.faction !== g.player && dest.faction !== g.player)) { autoResolve(a.id, dest.id); return; }
    // 後詰が包囲中の城へ着いたら、囲みを解くための野戦になる。
    // 相手は城ではなく、城を囲んでいる軍そのものである。
    if (a.relief) {
      const sg2 = g.sieges.find((x) => x.castleId === a.relief);
      const bes = sg2 && g.armies.find((x) => x.id === sg2.armyId);
      if (bes) {
        if (a.faction === g.player && underMyBanner(g, g.player, dest.faction)) {
          // 城方にも討って出る機会を与える。内と外から挟み撃ちにする。
          setSally({ armyId: a.id, castleId: dest.id, foeId: bes.id });
        } else if (bes.faction === g.player || a.faction === g.player) {
          startBattle(a, { ...dest, name: `${dest.name}の囲み` }, null, undefined, bes);
        } else autoResolve(a.id, dest.id);
        return;
      }
    }
    /* 後詰の野戦（GDD 9.2）。

       敵の軍が自家の城へ着いた月に、こちらも他の城から援軍を出していたなら、
       その援軍は城下で敵と当たるべきである。それが後詰というものである。

       これまでは、敵の到着と味方の到着が別々に処理されていた。味方の援軍は
       「味方の城へ着いた軍」として黙って入城し、野戦には出ない。そして野戦に
       敗れて城攻めに移ってから、城の中の守兵として現れる。これでは援軍を出した
       意味がない。援軍を出したのに、間に合わなかったようにしか見えない。

       敵が着いたとき、同じ城へ向かっている味方の軍があれば、そちらを主として
       城下の野戦にする。城方に討って出る機会も与える（囲みを解く後詰と同じ形）。 */
    if (dest.faction === g.player && !underMyBanner(g, a.faction, dest.faction) && !援けに着く(g, a, dest)) {
      const 待つ = new Set(g.pendingArrivals || []);
      const 後詰 = g.armies.find((x) => x.id !== a.id && x.at === dest.id
        && (!x.path || x.path.length <= 1) && !x.sieging
        && underMyBanner(g, x.faction, dest.faction) && 待つ.has(x.id));
      if (後詰) {
        setSally({ armyId: 後詰.id, castleId: dest.id, foeId: a.id, 城下: true });
        return;
      }
    }
    // 自勢力の戦役なら、着いた軍を集結として記録し、開戦の判断は総大将に委ねる
    // 旗の下の城なら、軍議にはかけない。味方に向かって軍議を開く筋はない。
    // 旗の下の城へ着いた軍は、味方と戦わない。
    // 自家の城なら将もそこへ入る。臣従の家の城なら、兵だけ守りに加え、将は本国へ帰る。
    if (underMyBanner(g, a.faction, dest.faction) || 援けに着く(g, a, dest)) {
      /* 入城する前に、同じ城へ敵の軍も着いていないかを見る。

         着いているなら、そちらを先に捌く。ここで黙って入城してしまうと、
         そのあとの野戦には出られず、「援軍を出したのに間に合わなかった」形に
         なる。捌く順を入れ替えるだけで、城下の野戦（後詰）に持ち込める。 */
      const 待ち = new Set(g.pendingArrivals || []);
      const 寄せ手 = g.armies.find((x) => x.id !== a.id && x.at === dest.id
        && (!x.path || x.path.length <= 1) && !x.sieging && 待ち.has(x.id)
        && !underMyBanner(g, x.faction, dest.faction) && !援けに着く(g, x, dest));
      if (寄せ手 && dest.faction === g.player) {
        setG((p) => ({ ...p,
          pendingArrivals: [寄せ手.id, ...(p.pendingArrivals || []).filter((id) => id !== 寄せ手.id)] }));
        return;
      }
      setG((p) => {
        const s = structuredClone(p);
        const ar = s.armies.find((x) => x.id === a.id);
        const c = s.castles.find((x) => x.id === ar.at);
        c.local += ar.local; c.food += ar.food;
        if (ar.rost && ar.rost.length) { c.rost = [...(c.rost || []), ...ar.rost]; }
        rosterSync(c, "rost", c.local, `loc-${c.id}`);
        // 臣従の家の城であれば、将までは預けぬ。本国へ帰す。
        const 他家 = c.faction !== ar.faction;
        const 本国 = 他家 ? (s.castles.find((x) => x.id === ar.from && x.faction === ar.faction)
          || s.castles.find((x) => x.faction === ar.faction)) : null;
        for (const gid of ar.gens) {
          const x = s.generals.find((q) => q.id === gid);
          if (x) x.at = 他家 ? (本国 ? 本国.id : c.id) : c.id;
        }
        s.armies = s.armies.filter((x) => x.id !== ar.id);
        s.pendingArrivals = s.pendingArrivals.slice(1);
        if (ar.faction === s.player) {
          const msg = 他家
            ? `${c.name}（${s.factions[c.faction].name}）へ援軍${fmt(ar.local)}人を入れた。将は${本国 ? 本国.name : "本国"}へ帰陣した。`
            : `${c.name}に到着し、軍は城へ合流した（味方の城のため合戦は起きない）。`;
          s.monthEvents = [...(s.monthEvents || []), msg];
          s.chronicle.push({ y: s.year, m: s.month, text: msg });
        }
        return s;
      });
      return;
    }
    const camp = (g.campaigns || []).find((c) => c.armies.includes(a.id) && c.target === a.at);
    if (camp && !camp.arrived.includes(a.id)) {
      setG((p2) => {
        const s = structuredClone(p2);
        const cc = s.campaigns.find((x) => x.id === camp.id);
        if (cc && !cc.arrived.includes(a.id)) {
          cc.arrived.push(a.id);
          const ar = s.armies.find((x) => x.id === a.id);
          if (ar) ar.sieging = true;              // 到着後は毎月の再判定に回さない
          const late = cc.armies.filter((id) => !cc.arrived.includes(id) && s.armies.some((x) => x.id === id));
          s.monthEvents = [...(s.monthEvents || []),
            `${nodeById(cc.target).name}の手前に着陣した。${late.length ? `遅参${late.length}隊を待つか、先に攻めかかるかを決める。` : "全軍がそろった。"}`];
        }
        s.pendingArrivals = s.pendingArrivals.slice(1);
        return s;
      });
      return;
    }
    /* 将のいない城は、城下の野戦をしない（GDD 9.2）。

       いままでは守備隊だけが野へ出て陣を敷いていた。将のいない城が門を開いて
       野で当たる道理はない。城兵は城に籠るだけである。
       そういう城へ着いたら、野戦を飛ばしてそのまま囲みに入る。

       姫がいても同じである。姫は戦場に出ない（統率だけが守備隊に及ぶ）。 */
    const 城将 = g.generals.filter((x) => x.at === dest.id && x.faction === dest.faction && !x.captive);
    if (!城将.length && !dest.intrigue) {
      setG((p) => {
        const s = structuredClone(p);
        const ar = s.armies.find((x) => x.id === a.id);
        const c = s.castles.find((x) => x.id === dest.id);
        s.pendingArrivals = (s.pendingArrivals || []).slice(1);
        if (!ar || !c) return s;
        ar.sieging = true;
        s.sieges = [...s.sieges.filter((x) => x.castleId !== c.id),
          { castleId: c.id, armyId: ar.id, months: 0, decided: null }];
        const 文 = `${c.name}には将がおらず、城方は籠って門を閉ざした。${s.factions[ar.faction].name}の軍がこれを囲んだ。`;
        s.chronicle.push({ y: s.year, m: s.month, text: 文 });
        if (ar.faction === s.player || c.faction === s.player) {
          s.monthEvents = [...(s.monthEvents || []), 文];
        }
        return s;
      });
      return;
    }
    startBattle(a, dest);
  }, [g.pendingArrivals, g.clashes, battle]); // eslint-disable-line

  // 画面外の合戦。兵数・練度・統率・城防から勝敗と損害を出し、結果だけを記録する。
  const autoResolve = (armyId, castleId) => setG((prev) => 合戦裁定.resolveOffscreen(prev, armyId, castleId));

  /* 姫の下知（GDD 6.8）。輿入れ・使者・縁組のいずれも、盤を直に書き換えて
     結果の一行を報せに出す。断られる筋（信用が足りぬなど）は帳の側で塞いである。 */
  const 姫の下知 = (行う) => setG((prev) => {
    const s = structuredClone(prev);
    const r = 行う(s);
    if (!r || !r.ok) { s.msg = (r && r.why) || "できなかった"; return s; }
    s.monthEvents = [...(s.monthEvents || []), r.文];
    s.msg = r.文;
    return s;
  });

  /* 城方が遊ぶ側のときは、城攻めの前に門の備えを問う（GDD 9.3）。
     どの門に誰を置くか、兵をどう割るかを決めてから戦が始まる。
     「すべて任せる」を選べば采配の案がそのまま用いられる。 */
  const [門の帳, set門の帳] = useState(null);
  const 門の備えを問う = (sg, gateParty, kits) => {
    const castle = g.castles.find((x) => x.id === sg.castleId);
    if (!castle || castle.faction !== g.player || g.autoPlay) { startAssault(sg, gateParty, kits); return; }
    const map = buildCastleMap(castle);
    const gates = map.layers.flatMap((l) => l.gates);
    set門の帳({ sg, gateParty, kits, castle, gates });
  };

  // 強攻＝城郭図の上での2D戦（GDD 9.3）
  const startAssault = (sg, gateParty, kits) => {
    if (g.autoPlay) return;
    const army = g.armies.find((x) => x.id === sg.armyId);
    const castle = g.castles.find((x) => x.id === sg.castleId);
    if (!army || !castle) return;
    const map = layoutCastleField(buildCastleMap(castle));
    setBattleMap(map);
    const atkGens = army.gens.map((id) => g.generals.find((x) => x.id === id)).filter(Boolean);
    const defGens = g.generals.filter((x) => x.at === castle.id && x.faction === castle.faction);
    // 一隊の兵に上限を設ける。あふれた分は後詰として戦場の外に控える。
    const nAtk = Math.max(1, Math.min(atkGens.length, MAX_CORPS));
    const retSum = atkGens.slice(0, nAtk).reduce((a2, x) => a2 + x.retinue, 0);
    const room = Math.max(0, SIEGE_CORPS_CAP * nAtk - retSum);
    const useLocal = Math.min(Math.max(0, army.local), room);
    const reserveMen = Math.max(0, army.local - useLocal);
    let reserveRost = [];
    let commitRost = army.rost || null;
    if (army.rost && reserveMen > 0) {
      const cp = JSON.parse(JSON.stringify(army.rost));
      const tk = rosterTake(cp, useLocal);
      commitRost = tk.taken; reserveRost = tk.rest;
    }
    const playerIsAtk = army.faction === g.player;
    const atkColor = g.factions[army.faction].color, defColor = g.factions[castle.faction].color;
    const atkSide = playerIsAtk ? "P" : "E", defSide = playerIsAtk ? "E" : "P";

    const mk = (gens0, local, train, side, color, spots, srcRost) => {
      const gens = (gens0.length ? gens0
        : [{ id: `gar-${castle.id}-${side}`, name: `${castle.name}守備隊`, lead: 52, valor: 50, wit: 45, gov: 45, retinue: 0, retTrain: train }])
        .slice(0, MAX_CORPS);
      const n = gens.length, per = Math.floor(local / n);
      let pool = srcRost && srcRost.length ? JSON.parse(JSON.stringify(srcRost)) : null;
      return gens.map((gen, i) => {
        const sp = spots(i, n);
        const slice = pool ? (() => { const tk = rosterTake(pool, per); pool = tk.rest; return tk.taken; })() : null;
        return makeCorps(side, { ...gen, locRost: slice }, gen.retinue, per,
          Math.round(gen.retTrain * 0.7 + (gen.unity || 60) * 0.3),
          Math.round(train * 0.7 + (castle.najimi == null ? 70 : castle.najimi) * 0.3),
          sp.x, sp.y, sp.f, color);
      });
    };
    /* 寄せ手は野から寄せる。構える所は castleMap の 寄せ口 が決める（GDD 9.3）。 */
    const outer = map.layers[0], og = outer.gates;
    const atk = mk(atkGens, useLocal, army.localTrain, atkSide, atkColor, (i, n) => {
      const gt = og[i % og.length];
      return 寄せ口(map, gt, Math.floor(i / og.length));
    }, commitRost);
    /* 城方の隊立ては battle/defense.js に置いてある（門ごとの守備隊もそこで立つ）。 */
    const def = 城方の隊を立てる(g, castle, map, {
      defGens, 割り付け: sg.割り付け || null, side: defSide, color: defColor });

    if (kits) for (const c of atk) { const k = kits[c.id]; if (k && SIEGE_KIT[k]) c.kit = k; }
    const P = playerIsAtk ? atk : def, E = playerIsAtk ? def : atk;
    const bb = createBattle(P, E, atkSide);
    bb.mode = "castle";
    bb.map = map;
    // 城攻めは一日がかり。盤の広さに合わせて伸ばす（山城は坂を登る道のりが長い）
    bb.dusk = Math.round(1080 * clamp(Math.pow(FIELD.w / 1600, 0.62), 1, 3.2));
    for (const c of atk) { c.formation = "方陣"; placeSquads(c, true); }   // 狭い道を寄せるので固まる
    bb.gateParty = !!gateParty;
    // 守り手が打って出るか籠るか。優勢なら討って出る。
    const dMen = def.reduce((a, c) => a + corpsMen(c), 0);
    const aMen = atk.reduce((a, c) => a + corpsMen(c), 0);
    bb.sortie = playerIsAtk ? dMen > aMen * 0.85 : !!sg.sortie;
    bb.log.push({ t: 0, text: bb.sortie ? "守り手は城門を開いて討って出た。" : "守り手は曲輪に籠って寄せ手を待つ。" });
    if (castle.intrigue && playerIsAtk) {
      for (const c of bb.corps) if (c.side === defSide) { c.morale -= 20; for (const q of c.squads) q.cohesion -= 12; }
      const l0 = map.layers[0].gates[0]; l0.hp = 0; l0.broken = true;
      bb.log.push({ t: 0, text: "内応の手引きで大手門が開かれている。" });
    }
    setBattle({
      b: bb, armyId: army.id, castleId: castle.id, playerIsAtk, mode: "castle",
      reserveMen, reserveRost,
      pName: g.factions[playerIsAtk ? army.faction : castle.faction].name,
      eName: g.factions[playerIsAtk ? castle.faction : army.faction].name,
      pColor: sideHue(playerIsAtk ? atkColor : defColor, true),
      eColor: sideHue(playerIsAtk ? defColor : atkColor, false),
      place: castle.name,
    });
  };

  // 戦役の判断（GDD 7.2）。総大将が、遅参を待つか先に攻めかかるかを決める。
  const campaignAct = (camp, act) => {
    if (act === "攻") {
      const list = camp.arrived.map((id) => g.armies.find((x) => x.id === id)).filter(Boolean);
      if (!list.length) return;
      const dest = g.castles.find((c) => c.id === camp.target);
      const main = list.find((a) => a.id === camp.armies[0]) || list[0];
      setG((p2) => {
        const s = structuredClone(p2);
        const cc = s.campaigns.find((x) => x.id === camp.id);
        if (cc) cc.decided = `${s.year}-${s.month}`;
        return s;
      });
      startBattle(main, dest, camp);
      return;
    }
    setG((prev) => {
      const s = structuredClone(prev);
      const cc = s.campaigns.find((x) => x.id === camp.id);
      if (!cc) return s;
      cc.decided = `${s.year}-${s.month}`;
      const castle = s.castles.find((c) => c.id === cc.target);
      if (act === "待") {
        cc.waited++;
        // 待てば敵は備えを固め、こちらは兵糧と士気を減らす
        castle.def = Math.min(100, castle.def + 2);
        castle.food = Math.round(castle.food * 1.02);
        castle.localTrain = Math.min(100, castle.localTrain + 1.5);
        for (const id of cc.arrived) {
          const a = s.armies.find((x) => x.id === id);
          if (!a) continue;
          a.food -= Math.round(a.men * 0.11);
          if (a.food < 0) { a.food = 0; a.men = Math.round(a.men * 0.97); a.local = Math.round(a.local * 0.97); }
        }
        s.chronicle.push({ y: s.year, m: s.month,
          text: `${cc.leaderName}は遅参を待った。${castle.name}の備えは固くなった（${cc.waited}か月目）。` });
      } else {
        for (const id of [...cc.armies]) {
          const a = s.armies.find((x) => x.id === id);
          if (!a) continue;
          合戦裁定.withdrawArmy(s, a);          // 出陣元が奪われていても自領へ戻す
        }
        s.campaigns = s.campaigns.filter((x) => x.id !== cc.id);
        s.chronicle.push({ y: s.year, m: s.month, text: `${cc.leaderName}は兵を退いた。${castle.name}の攻略は成らなかった。` });
      }
      return s;
    });
  };

  // 攻め口の方角。出陣元と目標の位置関係から東西南北に振り分ける。
  const attackFace = (fromId, toId) => {
    const a = nodeById(fromId), t = nodeById(toId);
    if (!a || !t) return "S";
    const dx = a.x - t.x, dy = a.y - t.y;      // 目標から見た攻め手の向き
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "E" : "W") : (dy > 0 ? "S" : "N");
  };
  // 城下に着いた。合戦の前に、寡兵ならば奇襲の策が献じられる（GDD 8.7）
  // foe を渡せば、城ではなく軍と軍の野戦になる（街道での行き合い）。
  const startBattle = (army, dest, camp, ambush, foe, sally) => {
    // 見物のときは画面を開かず、同じ規則で自動に解く
    if (g.autoPlay) {
      if (foe) setG((prev) => 合戦裁定.resolveClashOffscreen(prev));
      else autoResolve(army.id, dest.id);
      return;
    }
    if (ambush === undefined) {
      const plan = ambushPlan(g, army, dest);
      if (plan) { setRaid({ plan, army, dest, camp }); return; }   // 献策を問う
    }
    setBattleMap(null);
    setFieldSeed(army.from, dest.id);      // 街道ごとに戦場が決まる
    const atkGens = army.gens.map((id) => g.generals.find((x) => x.id === id)).filter(Boolean);
    // 行き合いなら、向かい合うのは城の守備ではなく相手の軍である
    const defGens = foe
      ? foe.gens.map((id) => g.generals.find((x) => x.id === id)).filter(Boolean)
      : g.generals.filter((x) => x.at === dest.id && x.faction === dest.faction && !x.captive);
    const playerIsAtk = army.faction === g.player;
    const defLocal = foe ? Math.max(0, foe.local)
      : Math.max(0, dest.local - Math.round(minGarrison(dest) * 0.4));
    // 出てくる兵の総数から戦場の広さを決める
    const aidMen = foe ? 0 : g.armies.filter((a) => a.id !== army.id && a.at === dest.id
      && (a.aid === army.faction || (camp && camp.arrived.includes(a.id)))).reduce((t, a) => t + a.men, 0);
    /* 野の広さは、兵の数と隊の数で決める。隊が多いほど、翼を伸ばし、伏せ、
       迂回する余地が要る。兵数だけで決めていたころは、五隊も出せば戦場が
       一杯になり、横に並べて前へ出るのが精一杯であった。 */
    /* 総大将を並びの先頭に置く。布陣（lineup）は先頭を後ろの真ん中に据えるので、
       これで大将が本陣に座り、諸将がその前を固める形になる。
       当主が出ていなければ、器量の勝る者が大将である。 */
    const 出る将 = (army.gens || []).map((id) => g.generals.find((x) => x.id === id)).filter(Boolean)
      .sort((a, b) => (b.lord ? 1 : 0) - (a.lord ? 1 : 0)
        || (b.lead + b.gov + b.wit) - (a.lead + a.gov + a.wit));
    const 隊数 = Math.max(2, 出る将.length + Math.max(1, defGens.length));
    layoutField(army.men + aidMen + defLocal + defGens.reduce((t, x) => t + x.retinue, 0), 隊数);
    // 攻め口の方角に応じ、盤の四辺のどこから寄せるかを決める（GDD 8.1）
    const face = attackFace(army.from, dest.id);
    /* 初めの布陣（GDD 8.1）。

       横一列に並べていたので、隊が多いと盤からはみ出して端まで延びていた。
       十隊も出せば左右に千七百歩、野の幅を越える。

       段に分けて構える。総大将（並びの先頭）を後ろの真ん中に据え、
       ほかの将はその前を、中央から外へ振り分けて固める。
       一段に並べる数は野の幅から決めるので、どれだけ隊が増えても盤に収まる。 */
    const lineup = (isAtk, i, n) => {
      const near = 0.14, far = 0.86;                 // 盤の縁からの割合
      const 間 = Math.round(175 * (FIELD.w / BASE.w));
      const 列 = Math.max(1, Math.min(n, Math.floor((FIELD.w * 0.78) / Math.max(1, 間))));
      const 段数 = Math.ceil(n / 列);
      /* 並びの先頭は総大将である。後ろの段の真ん中に置き、
         残りを前の段から順に、中央から外へ埋める。 */
      const 位 = i === 0 ? { 段: 段数 - 1, 席: 0, 幅: 1 } : (() => {
        const j = i - 1;                             // 総大将を除いた通し番号
        const 段 = Math.min(段数 - 1, Math.floor(j / 列));
        const 中 = j - 段 * 列;
        const 残 = Math.min(列, (n - 1) - 段 * 列);
        return { 段, 席: 中 - (残 - 1) / 2, 幅: 残 };
      })();
      const t2 = 位.席 * 間;
      const 奥 = 位.段 * Math.round(78 * (FIELD.h / BASE.h));   // 段の厚み（後ろへ下がる）
      const put = (ax, ay, f2) => ({ x: ax, y: ay, f: f2 });
      const 締 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const X = (v) => 締(v, 40, FIELD.w - 40), Y = (v) => 締(v, 40, FIELD.h - 40);
      // 後ろへ下がる向きは、盤のどちら側に立つかで決まる
      const S = () => put(X(FIELD.w / 2 + t2), Y(isAtk ? FIELD.h * far + 奥 : FIELD.h * near - 奥), isAtk ? -Math.PI / 2 : Math.PI / 2);
      const N = () => put(X(FIELD.w / 2 + t2), Y(isAtk ? FIELD.h * near - 奥 : FIELD.h * far + 奥), isAtk ? Math.PI / 2 : -Math.PI / 2);
      const E = () => put(X(isAtk ? FIELD.w * far + 奥 : FIELD.w * near - 奥), Y(FIELD.h / 2 + t2 * 0.66), isAtk ? Math.PI : 0);
      const W = () => put(X(isAtk ? FIELD.w * near - 奥 : FIELD.w * far + 奥), Y(FIELD.h / 2 + t2 * 0.66), isAtk ? 0 : Math.PI);
      return face === "N" ? N() : face === "E" ? E() : face === "W" ? W() : S();
    };
    const build = (gens0, local, train, side, yBase, facing, color, srcRost, isAtk) => {
      const gens = (gens0.length ? gens0 : [{ id: `gar-${dest.id}-${side}`, name: `${dest.name}守備隊`, lead: 52, valor: 50, wit: 45, gov: 45, retinue: 0, retTrain: train }])
        .slice(0, MAX_CORPS);
      const n = gens.length, per = Math.floor(local / n);
      const najimi = dest.najimi == null ? 70 : dest.najimi;
      // 地域家臣団の名簿を隊ごとに切り分ける（欠けた組は欠けたまま）
      let pool = srcRost && srcRost.length ? JSON.parse(JSON.stringify(srcRost)) : null;
      return gens.map((gen, i) => makeCorps(
        side, { ...gen, locRost: pool ? (() => { const tk = rosterTake(pool, per); pool = tk.rest; return tk.taken; })() : null },
        gen.retinue, per,
        Math.round(gen.retTrain * 0.7 + (gen.unity || 60) * 0.3),   // 直属は結束が効く
        Math.round(train * 0.7 + najimi * 0.3),                      // 地域は馴染が効く
        ...(() => { const p2 = lineup(isAtk, i, n); return [p2.x, p2.y, p2.f]; })(), color));
    };
    const atkColor = g.factions[army.faction].color, defColor = g.factions[dest.faction].color;
    const betray = dest.intrigue && army.faction === g.player;   // 内応（GDD 11.2）
    // 同着した他家の援軍と、戦役に加わった寄騎は、自前の旗色のまま同じ側に立つ（GDD 7.4）
    // 街道での行き合いは、居合わせた者だけの戦である。寄騎は間に合わぬ。
    const allies = [
      ...(foe ? [] : g.armies.filter((a) => a.id !== army.id && a.at === dest.id
        && (a.aid === army.faction || (camp && camp.arrived.includes(a.id))))),
      // 城方が討って出るなら、寄せ手の背を衝く形で同じ側に立つ（GDD 9.2）
      ...(sally ? [sally] : []),
    ];
    const atkSide = playerIsAtk ? "P" : "E";
    const atkCorpsList = build(atkGens, army.local, army.localTrain, atkSide, playerIsAtk ? FIELD.h * 0.875 : FIELD.h * 0.14,
      playerIsAtk ? -Math.PI / 2 : Math.PI / 2, atkColor, army.rost, true);
    // 援軍は本隊の脇に並ぶ
    let off = 1;
    let slots = MAX_CORPS - atkCorpsList.length;      // 参陣できる残りの隊数
    for (const a of allies) {
      if (slots <= 0) break;
      const ag = a.gens.map((id) => g.generals.find((x) => x.id === id)).filter(Boolean);
      const col = g.factions[a.faction].color;
      /* 誰の兵として立っているのか（GDD 7.4 / 12.2）。
         同盟の援軍か、旗の下から出た兵か、主家から来た兵か――
         盤の上で見分けがつくよう、隊に印を付ける。 */
      const kind = (() => {
        if (a.faction === army.faction) return "自領援軍";
        const st = relOf(g, army.faction, a.faction).state;
        if (st === "同盟") return "同盟軍";
        if (st === "臣従" || st === "従属") {
          return 主家(g, army.faction, a.faction) === army.faction
            ? `${st}軍` : `主家（${g.factions[a.faction].name}）の援軍`;
        }
        return "援軍";
      })();
      const list = build(ag.slice(0, slots), a.local, a.localTrain, atkSide,
        playerIsAtk ? FIELD.h * 0.875 : FIELD.h * 0.14,
        playerIsAtk ? -Math.PI / 2 : Math.PI / 2, col);
      slots -= list.length;
      list.forEach((c, i) => {
        c.x = FIELD.w / 2 + (off + i) * Math.round(175 * (FIELD.w / BASE.w)) * (off % 2 ? 1 : -1);
        c.ally = kind; c.allyFaction = a.faction; c.armyId = a.id;
        placeSquads(c, true);
      });
      off++;
      atkCorpsList.push(...list);
    }
    const defList = build(defGens, defLocal, dest.localTrain, playerIsAtk ? "E" : "P",
      playerIsAtk ? FIELD.h * 0.14 : FIELD.h * 0.875, playerIsAtk ? Math.PI / 2 : -Math.PI / 2, defColor, dest.rost, false);
    const P = playerIsAtk ? atkCorpsList : defList;
    const E = playerIsAtk ? defList : atkCorpsList;
    const bb = createBattle(P, E, playerIsAtk ? "P" : "E");
    // 自陣がどちらの側かを控える。攻め口の方角で変わるので、下側に決め打ちできない。
    bb.face = face;
    bb.myFar = playerIsAtk;      // 寄せ手は遠い側（far）から入る
    if (betray) {
      for (const c of bb.corps) if (c.side === "E") { c.morale -= 18; for (const q of c.squads) q.cohesion -= 10; }
      bb.log.push({ t: 0, text: "城内の内応者が動き、守り手の士気が乱れている。" });
    }
    // 合戦の前に本陣を衝いた首尾を、盤の上に映す（GDD 8.7）
    if (ambush && ambush.done) {
      const mySide = ambush.atkIsPlayer ? "P" : "E";
      const foeSide = mySide === "P" ? "E" : "P";
      if (ambush.hit) {
        // 敵の総大将を討った。その隊は消え、残る敵は大きく崩れる。
        const tgt = ambush.target && bb.corps.find((c) => c.side === foeSide && c.id === ambush.target.id);
        if (tgt) { tgt.destroyed = true; tgt.order = "待機"; for (const q of tgt.squads) q.men = 0; }
        for (const c of bb.corps) {
          if (c.side !== foeSide || c === tgt) continue;
          c.morale = clamp(c.morale - 42, 5, 100);
          for (const q of c.squads) q.cohesion = clamp(q.cohesion - 26, 0, 100);
        }
        for (const c of bb.corps) if (c.side === mySide) c.morale = Math.min(100, c.morale + 12);
        bb.notices = [{ t: 0, kind: mySide === "P" ? "good" : "bad",
          text: `${ambush.head.name}が本陣を衝いた${ambush.target ? `。${ambush.target.name}討死` : ""}` }];
        bb.log.push({ t: 0, text: `${ambush.head.name}が敵の本陣を衝いた。${ambush.target ? `${ambush.target.name}は討たれ、` : ""}敵軍は崩れている。` });
        bb.ambushHit = true;
      } else {
        // 伏勢が露見した。こちらの士気が落ちる。
        for (const c of bb.corps) {
          if (c.side !== mySide) continue;
          c.morale = clamp(c.morale - 20, 5, 100);
          for (const q of c.squads) q.cohesion = clamp(q.cohesion - 10, 0, 100);
        }
        bb.notices = [{ t: 0, kind: mySide === "P" ? "bad" : "good", text: "伏勢が露見した" }];
        bb.log.push({ t: 0, text: `${ambush.head.name}の伏勢は露見した。味方の士気が落ちている。` });
      }
    }
    setBattle({
      b: bb, armyId: army.id, castleId: dest.id, playerIsAtk, campId: camp ? camp.id : null,
      mode: foe ? "clash" : undefined, foeId: foe ? foe.id : null,
      sally: sally ? { castleId: sally.castleId, gens: sally.gens, local: sally.local } : null,
      pName: g.factions[playerIsAtk ? army.faction : dest.faction].name,
      eName: g.factions[playerIsAtk ? dest.faction : army.faction].name,
      // 上部に出す目印は、盤の駒と同じ色にする（自軍は藍、敵軍は朱）。
      // ここだけ家の色のままだと、数を見比べるときにどちらが自軍か紛れる。
      pColor: sideHue(playerIsAtk ? atkColor : defColor, true),
      eColor: sideHue(playerIsAtk ? defColor : atkColor, false),
      place: dest.name,
    });
  };

  /* 街道での行き合い（GDD 9.1）。城の壁は関わらぬ。野で軍と軍が当たる。
     相手の軍を、その場かぎりの「守り手」に仕立てて盤へ載せる。 */
  const startClash = (mine, foe, cl) => {
    startBattle(mine, {
      id: cl.v, name: cl.place, faction: foe.faction,
      local: Math.max(0, foe.local), localTrain: foe.localTrain || 60,
      najimi: 70, def: 0, min: 60, hp: 0, rost: foe.rost, intrigue: false,
    }, null, null, foe);
  };

  const finishAssault = (b, ctx) => {
    setBattleMap(null);
    setG((prev) => {
      const s = structuredClone(prev);
      const army = s.armies.find((x) => x.id === ctx.armyId);
      const castle = s.castles.find((x) => x.id === ctx.castleId);
      if (!castle) { setBattle(null); return s; }
      const atkSide = ctx.playerIsAtk ? "P" : "E";
      const won = !!b.captured || b.result === atkSide;
      const atkCorps = b.corps.filter((c) => c.side === atkSide);
      const defCorps = b.corps.filter((c) => c.side !== atkSide);
      writeBackRosters(s, b, [...atkCorps, ...defCorps], army, castle);
      for (const c of [...atkCorps, ...defCorps]) {
        const gen = s.generals.find((x) => x.id === c.id);
        if (gen && !gen.rost) gen.retinue = Math.max(0, Math.round(gen.retinue - c.loss["直属"]));
      }
      const left = (corps) => Math.round(corps.reduce((a, c) => a + c.squads.filter((q) => q.origin === "地域").reduce((t, q) => t + q.men, 0), 0));
      const aLeft = left(atkCorps), dLeft = left(defCorps);
      // 戦場の外に控えていた後詰を軍へ戻す
      const back = ctx.reserveMen || 0;
      if (army) {
        if (ctx.reserveRost && ctx.reserveRost.length) army.rost = [...(army.rost || []), ...ctx.reserveRost];
        army.local = aLeft + back;
        if (army.rost) rosterSync(army, "rost", army.local, `arm-${army.id}`);
        army.men = army.local + atkCorps.reduce((a, c) => a + (s.generals.find((x) => x.id === c.id)?.retinue || 0), 0);
      }
      castle.local = Math.max(0, dLeft);
      if (castle.rost) rosterSync(castle, "rost", castle.local, `loc-${castle.id}`);
      /* 城の傷み（GDD 9.3）。

         門は次の攻めまでに直る。焼けた板を張り替え、閂を打ち直せばよい。
         ところが、石垣を崩され、櫓を焼かれ、堀を埋められた城は、そう容易には
         元に戻らない。直せるのはその城の防備なりのものである――防備を上げて
         おかねば、脆い門しか建て直せない。

         そこで、攻めのあいだに壊された割に応じて、城の防備そのものを下げる。
         門の傷み（残った耐えの割）を七割五分、崩れた櫓の割を二割五分で見て、
         その半ばぶんを防備から引く。丸ごと壊された城は防備が半ばになる。
         次にこの城を攻めれば、門はそのぶん脆い（門の堅さ＝百十＋防備×十六）。

         もとは「破れた門一つにつき八分」であった。門を九分どおり削っても、
         破りきらなければ城は無傷のままで、攻めた甲斐がなかった。 */
      const 門ら = b.map.gates;
      const 総 = 門ら.reduce((a, g) => a + g.max, 0);
      const 残 = 門ら.reduce((a, g) => a + Math.max(0, g.hp), 0);
      const 門の傷 = 総 ? 1 - 残 / 総 : 0;
      const 櫓の傷 = b.map.fac.length ? b.map.fac.filter((f) => f.hp <= 0).length / b.map.fac.length : 0;
      const 崩れ = Math.max(0, Math.min(1, 門の傷 * 0.75 + 櫓の傷 * 0.25));
      const broke = 門ら.filter((gt) => gt.broken).length;
      const 前の防備 = Math.round(castle.def);
      castle.hp = Math.max(0, castle.hp - Math.round(castle.hp * 0.15 * broke));
      castle.def = Math.max(6, Math.round(castle.def * (1 - 崩れ * 0.5)));
      if (前の防備 - castle.def >= 1) {
        s.chronicle.push({ y: s.year, m: s.month,
          text: `${castle.name}は門と櫓を破られ、防備が${前の防備}から${castle.def}に落ちた。`
            + `普請で建て直さねば、次の寄せ手には脆い門しか向けられない。` });
      }
      const aLoss = atkCorps.reduce((a, c) => a + c.loss["直属"] + c.loss["地域"], 0) | 0;
      const dLoss = defCorps.reduce((a, c) => a + c.loss["直属"] + c.loss["地域"], 0) | 0;
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${castle.name}への強攻。${broke}つの門が破れ、寄せ手${fmt(aLoss)}人・守り手${fmt(dLoss)}人を失った。${won ? "城は落ちた。" : "寄せ手は退けられた。"}` });
      /* 武将の生死（GDD 12.3）。

         これは城が落ちる前に裁く。順序が肝心である。
           ・落城のあとでは城主が入れ替わっており、誰が誰を捕らえたのか判らなくなる
           ・落城のあとでは「滅亡の始末」の列が既に組まれている。そこから討死者を
             抜くと列の先頭が欠け、身の振り方を問う画面が丸ごと出なくなる
         かつては sackCastle のあとに置いていたため、大名を滅ぼしても
         登用の問いが出ない、ということが起きていた。 */
      for (const c of [...atkCorps, ...defCorps]) {
        const gen = s.generals.find((x) => x.id === c.id);
        if (!gen || c.detach) continue;
        const lossRate = 1 - corpsMen(c) / Math.max(1, corpsMax(c));
        /* 潰走（士気も兵も尽きて戦場を落ちた隊）の将は、逃れる術が乏しい。
           捕らわれる目は大きく上げ、討たれる目はわずかに上げるにとどめる。
           討死ばかりでは、遊んでいて面白くない。 */
        /* 討死と捕縛の境（GDD 12.3）。

           落城のとき、城方の隊はたいてい壊滅している。壊滅の重み（＋〇.三）が
           そのまま乗るので、城が落ちるたびに四人も五人も討死していた。
           一度の攻城で名のある将が次々に消えるのでは、家が続かない。

           武将は雑兵ではない。旗本に囲まれ、落ちるか、捕らわれる。
           討たれるのは、そのうちのごく一部である。
           壊滅の重みを半ばに落とし、討死の境を上げ、あいだを捕縛にした。 */
        let risk = lossRate * 0.5 + (c.routed ? 0.14 : 0) + (c.潰 ? 0.08 : 0) + (c.destroyed ? 0.15 : 0)
          - gen.valor / 380 + Math.random() * 0.3 - 0.15;
        if (risk <= 0.60) continue;
        if (risk > 0.86) {
          // 討死。跡目は家督の定めに従う。
          notify(b, `${gen.name}、討死。`, c.side === "P" ? "bad" : "good");
          const heir = s.generals.find((x) => x.faction === gen.faction && x.id !== gen.id && !x.captive);
          if (heir) heir.retinue += Math.round(gen.retinue * 0.5);
          const wasLord = gen.lord;
          s.generals = s.generals.filter((x) => x.id !== gen.id);
          if (wasLord) {
            if (gen.faction === s.player) s.succession = { dead: gen, cause: "討死した" };
            else succeed(s, gen, "討死した");
          } else s.chronicle.push({ y: s.year, m: s.month, text: `${gen.name}が討死した。` });
        } else {
          /* 捕縛。盤上から消さず、捕虜として相手の手に落ちる（GDD 12.3）。
             ここは castle を見る。かつては dest という在りもしない名を書いていたため、
             城攻めで誰かが捕らわれるたびに例外が起き、決着の始末が丸ごと流れていた。 */
          const winner = c.side === "P"
            ? (ctx.playerIsAtk ? castle.faction : army.faction)
            : (ctx.playerIsAtk ? army.faction : castle.faction);
          const g2 = s.generals.find((x) => x.id === gen.id);
          if (!g2) continue;
          notify(b, `${gen.name}、捕縛。`, c.side === "P" ? "bad" : "good");
          makePrisoner(s, g2, winner, castle.id);
          g2.retinue = Math.round(g2.retinue * 0.3);
          if (g2.lord) {
            const next = s.generals.filter((x) => x.faction === g2.faction && x.id !== g2.id && !x.captive)
              .sort((a, z) => z.lead - a.lead)[0];
            if (next) { next.lord = true; g2.lord = false; }
          }
          s.chronicle.push({ y: s.year, m: s.month,
            text: `${gen.name}は${s.factions[winner].name}に捕らえられた。` });
          // 捕らえたのが遊ぶ側なら、処遇を問う（野戦の側では前からそうしている）
          if (winner === s.player) s.captives = [...(s.captives || []), g2.id];
        }
      }
      /* 城が落ちた（GDD 9.3）。

         ここで army.local を aLeft（盤に立っていた隊の生き残り）で上書きしていた。
         戦場の外に控えていた後詰（back）が、勝った途端に消えていたことになる。
         一隊三千を超える兵は盤に出ないから、大軍で攻めるほど大きく消えた。
         二万で寄せて城を落とすと、一万二千が忽然と失せる。
         上（後詰を戻す件）で足したものを、そのまま捨ててはならない。 */
      if (won && army) { army.local = aLeft + back; sackCastle(s, castle, army, true); }
      if (b.result === "P" && !ctx.playerIsAtk) {
        const 功 = 手柄の隊(s, b.corps.filter((c) => c.side === "P"), castle);
        if (功 && Math.random() < 0.6) s.promo = makePromotion(功.lord, s.generals, 功);
      }
      return s;
    });
    setBattle(null);
  };

  // 合戦の損害を組の名簿へ書き戻す。欠けた組は欠けたまま残る。
  const writeBackRosters = (s, b, corpsList, army, castle) => {
    const survive = new Map();                       // 組の id → 生き残り
    for (const c of corpsList) for (const q of c.squads) {
      if (!q.src) continue;
      survive.set(q.src, (survive.get(q.src) || 0) + Math.max(0, Math.round(q.men)));
    }
    const apply = (rost) => {
      if (!rost) return [];
      for (const q of rost) if (survive.has(q.id)) q.m = survive.get(q.id);
      return rost.filter((q) => q.m > 0);
    };
    for (const c of corpsList) {
      const gen = s.generals.find((x) => x.id === c.id);
      if (gen && gen.rost) { gen.rost = apply(gen.rost); gen.retinue = rosterSum(gen.rost); }
    }
    if (army && army.rost) { army.rost = apply(army.rost); army.local = rosterSum(army.rost); }
    if (castle && castle.rost) { castle.rost = apply(castle.rost); }
  };

  /* 街道での行き合いの決着。
     城は関わらぬ。勝ったほうがそのまま道を進み、負けたほうの城を攻める。
     負けたほうは出陣元の城へ退く。日没ならば、双方とも兵を退く。 */
  const finishClash = (b, ctx) => {
    setG((prev) => {
      const s = structuredClone(prev);
      const mine = s.armies.find((x) => x.id === ctx.armyId);
      const foe = s.armies.find((x) => x.id === ctx.foeId);
      s.clashes = (s.clashes || []).filter((x) => !(x.aId === ctx.armyId || x.bId === ctx.armyId));
      if (!mine || !foe) return s;
      const mySide = ctx.playerIsAtk ? "P" : "E", foeSide = ctx.playerIsAtk ? "E" : "P";
      const myCorps = b.corps.filter((c) => c.side === mySide);
      const foeCorps = b.corps.filter((c) => c.side === foeSide);
      writeBackRosters(s, b, [...myCorps, ...foeCorps], mine, null);
      writeBackRosters(s, b, [...myCorps, ...foeCorps], foe, null);
      for (const c of [...myCorps, ...foeCorps]) {
        const gen = s.generals.find((x) => x.id === c.id);
        if (gen && !gen.rost) gen.retinue = Math.max(0, Math.round(gen.retinue - c.loss["直属"]));
      }
      const left = (corps) => Math.round(corps.reduce((a, c) => a + c.squads.filter((q) => q.origin === "地域").reduce((t, q) => t + q.men, 0), 0));
      const ret = (corps) => corps.reduce((a, c) => a + (s.generals.find((x) => x.id === c.id)?.retinue || 0), 0);
      /* 城方が討って出ていたなら、その隊は本隊とは別に数える。
         討って出た兵は城の兵であって、後詰の軍の兵ではない。 */
      const 出撃 = ctx.sally || null;
      const 出撃隊 = 出撃 ? myCorps.filter((c) => 出撃.gens.includes(c.id)) : [];
      const 本隊 = 出撃 ? myCorps.filter((c) => !出撃.gens.includes(c.id)) : myCorps;
      mine.local = left(本隊); mine.men = mine.local + ret(本隊);
      foe.local = left(foeCorps); foe.men = foe.local + ret(foeCorps);
      if (出撃) {
        const 城 = s.castles.find((x) => x.id === 出撃.castleId);
        if (城) {
          const 生還 = left(出撃隊);
          const 失った = Math.max(0, 出撃.local - 生還);
          城.local = Math.max(0, 城.local - 失った);
          if (城.rost) rosterSync(城, "rost", 城.local, `loc-${城.id}`);
          s.chronicle.push({ y: s.year, m: s.month,
            text: `${城.name}の城方は門を開いて討って出た（${fmt(出撃.local)}人のうち${fmt(失った)}人を失う）。` });
        }
      }
      const draw = b.result === "日没";
      const winSide = draw ? null : b.result;
      const 勝 = winSide == null ? null : (winSide === mySide ? mine : foe);
      const 負 = 勝 == null ? null : (勝 === mine ? foe : mine);
      s.chronicle.push({ y: s.year, m: s.month,
        text: draw
          ? `${ctx.place}で${s.factions[mine.faction].name}と${s.factions[foe.faction].name}の軍が行き合ったが、`
            + `日没により決着せず、両軍が兵を退いた（天候：${b.weather}）。`
          : `${ctx.place}で${s.factions[mine.faction].name}と${s.factions[foe.faction].name}の軍が行き合い、野戦となった。`
            + `${s.factions[勝.faction].name}が勝った（天候：${b.weather}${b.orderly ? "・統制撤退" : ""}）。` });
      // 武将の生死（GDD 12.3）。野戦と同じ理屈で裁く。
      const 勝家 = 勝 ? 勝.faction : null;
      const 収める城 = () => {
        if (!勝家) return null;
        const home = s.castles.find((x) => x.id === 勝.from && x.faction === 勝家)
          || s.castles.find((x) => x.faction === 勝家);
        return home ? home.id : null;
      };
      for (const c of [...myCorps, ...foeCorps]) {
        const gen = s.generals.find((x) => x.id === c.id);
        if (!gen || c.detach) continue;
        const lossRate = 1 - corpsMen(c) / Math.max(1, corpsMax(c));
        /* 潰走（士気も兵も尽きて戦場を落ちた隊）の将は、逃れる術が乏しい。
           捕らわれる目は大きく上げ、討たれる目はわずかに上げるにとどめる。
           討死ばかりでは、遊んでいて面白くない。 */
        let risk = lossRate * 0.5 + (c.routed ? 0.14 : 0) + (c.潰 ? 0.08 : 0) + (c.destroyed ? 0.18 : 0)
          + ((c.frontTime || 0) > 40 ? 0.12 : 0) - gen.valor / 420 - (b.orderly ? 0.12 : 0);
        risk += Math.random() * 0.3 - 0.15;
        /* 討死。当主と器量者は、配下に守られ、あるいは自らの手で斬り抜けて
           戦場を離れる（難を逃れる）。大名が野戦で討たれるのは稀な事である。 */
        let fate = null;
        if (risk > 0.86 && Math.random() < 難を逃れる(gen)) fate = "討死";
        else if (勝家 && risk > 0.58
          && Math.random() < captureChance(gen) * (1 + (c.routed ? 1.4 : 0) + (c.潰 ? 1.2 : 0))) fate = "捕縛";
        if (fate) notify(b, `${gen.name}、${fate}。`, c.side === "P" ? "bad" : "good");
        else if (risk > 0.52) fate = "重傷"; else if (risk > 0.34) fate = "軽傷";
        if (!fate) continue;
        if (fate === "捕縛") {
          const hold = 収める城();
          if (!hold) { gen.hurt = 3; continue; }
          const heir = s.generals.find((x) => x.faction === gen.faction && x.id !== gen.id && !x.captive);
          if (heir) heir.retinue += Math.round(gen.retinue * 0.5);
          if (gen.lord) {
            const next = s.generals.filter((x) => x.faction === gen.faction && x.id !== gen.id && !x.captive)
              .sort((a, z) => z.lead - a.lead)[0];
            if (next) { next.lord = true; gen.lord = false; }
          }
          makePrisoner(s, gen, 勝家, hold);
          s.chronicle.push({ y: s.year, m: s.month, text: `${gen.name}が捕らえられた。` });
          if (勝家 === s.player) s.captives = [...(s.captives || []), gen.id];
        } else if (fate === "討死") {
          const heir = s.generals.find((x) => x.faction === gen.faction && x.id !== gen.id);
          if (heir) heir.retinue += Math.round(gen.retinue * 0.5);
          s.generals = s.generals.filter((x) => x.id !== gen.id);
          if (gen.lord) {
            if (gen.faction === s.player) s.succession = { dead: gen, cause: "討死した" };
            else succeed(s, gen, "討死した");
          } else s.chronicle.push({ y: s.year, m: s.month, text: `${gen.name}が討死した。` });
        } else if (fate === "重傷") {
          gen.hurt = 3; gen.unity = Math.max(20, (gen.unity || 60) - 8);
          s.chronicle.push({ y: s.year, m: s.month, text: `${gen.name}が重傷を負い、しばらく戦えない。` });
        } else {
          s.chronicle.push({ y: s.year, m: s.month, text: `${gen.name}が軽傷を負った。` });
        }
      }
      if (draw) {
        // どちらも道を進めない。それぞれ出陣元へ退く。
        for (const a of [mine, foe]) {
          const home = 合戦裁定.withdrawArmy(s, a);
          if (home) s.chronicle.push({ y: s.year, m: s.month,
            text: `${s.factions[a.faction].name}の軍は${home.name}へ退いた。` });
        }
      } else {
        const home = 合戦裁定.withdrawArmy(s, 負);
        s.chronicle.push({ y: s.year, m: s.month,
          text: `${s.factions[負.faction].name}の軍は${home ? home.name : "本国"}へ退き、`
            + `${s.factions[勝.faction].name}は${(nodeById(勝.target) || {}).name || ""}へ道を進めた。` });
        // すでに敵城の下まで来ていたなら、そのまま城攻めに移る
        if (!勝.path || 勝.path.length <= 1) {
          s.pendingArrivals = [勝.id, ...(s.pendingArrivals || []).filter((id) => id !== 勝.id)];
        }
        s.monthEvents = [...(s.monthEvents || []),
          勝.faction === s.player
            ? `${ctx.place}の野戦に勝った。軍はそのまま${(nodeById(勝.target) || {}).name || ""}へ向かう。`
            : `${ctx.place}の野戦に敗れ、軍は退いた。`];
      }
      if (b.result === "P") {
        const 功 = 手柄の隊(s, b.corps.filter((c) => c.side === "P"), null);
        if (功 && Math.random() < 0.7) s.promo = makePromotion(功.lord, s.generals, 功);
      }
      return s;
    });
    setBattle(null);
  };

  const finishBattle = (b, ctx) => {
    if (ctx.mode === "castle") return finishAssault(b, ctx);
    if (ctx.mode === "clash") return finishClash(b, ctx);
    setG((prev) => {
      const s = structuredClone(prev);
      const army = s.armies.find((x) => x.id === ctx.armyId);
      const castle = s.castles.find((x) => x.id === ctx.castleId);
      const draw = b.result === "日没";
      const playerWon = b.result === "P";
      const atkWon = draw ? false : (ctx.playerIsAtk ? playerWon : !playerWon);
      const side = (sd) => b.corps.filter((c) => c.side === sd);
      const atkCorps = ctx.playerIsAtk ? side("P") : side("E");
      const defCorps = ctx.playerIsAtk ? side("E") : side("P");
      writeBackRosters(s, b, [...atkCorps, ...defCorps], army, castle);
      for (const c of [...atkCorps, ...defCorps]) {
        const gen = s.generals.find((x) => x.id === c.id);
        if (gen && !gen.rost) gen.retinue = Math.max(0, Math.round(gen.retinue - c.loss["直属"]));
      }
      const left = (corps) => Math.round(corps.reduce((a, c) => a + c.squads.filter((q) => q.origin === "地域").reduce((t, q) => t + q.men, 0), 0));
      const atkLeft = left(atkCorps), defLeft = left(defCorps);
      if (army) { army.local = atkLeft; army.men = atkLeft + atkCorps.reduce((a, c) => a + (s.generals.find((x) => x.id === c.id)?.retinue || 0), 0); }
      // 城に残った守備兵の名簿も欠けたまま持ち越す
      const keep = Math.round(minGarrison(castle) * 0.4);
      castle.local = Math.max(0, keep + defLeft);
      if (castle.rost) rosterSync(castle, "rost", castle.local, `loc-${castle.id}`);
      s.chronicle.push({ y: s.year, m: s.month,
        text: draw ? `${castle.name}下の野戦は日没により決着せず、両軍が兵を退いた（天候：${b.weather}）。`
          : `${castle.name}下の野戦。${atkWon ? "攻め手" : "守り手"}が勝利した（天候：${b.weather}${b.orderly ? "・統制撤退" : ""}）。` });
      // 武将の生死（GDD 12.3）
      for (const c of [...atkCorps, ...defCorps]) {
        const gen = s.generals.find((x) => x.id === c.id);
        if (!gen || c.detach) continue;
        const lossRate = 1 - corpsMen(c) / Math.max(1, corpsMax(c));
        /* 潰走（士気も兵も尽きて戦場を落ちた隊）の将は、逃れる術が乏しい。
           捕らわれる目は大きく上げ、討たれる目はわずかに上げるにとどめる。
           討死ばかりでは、遊んでいて面白くない。 */
        let risk = lossRate * 0.5 + (c.routed ? 0.14 : 0) + (c.潰 ? 0.08 : 0) + (c.destroyed ? 0.18 : 0)
          + ((c.frontTime || 0) > 40 ? 0.12 : 0) - gen.valor / 420 - (b.orderly ? 0.12 : 0);
        risk += Math.random() * 0.3 - 0.15;
        /* 討死。当主と器量者は、配下に守られ、あるいは自らの手で斬り抜けて
           戦場を離れる（難を逃れる）。大名が野戦で討たれるのは稀な事である。 */
        let fate = null;
        if (risk > 0.86 && Math.random() < 難を逃れる(gen)) fate = "討死";
        else if (risk > 0.58
          && Math.random() < captureChance(gen) * (1 + (c.routed ? 1.4 : 0) + (c.潰 ? 1.2 : 0))) fate = "捕縛";
        if (fate) notify(b, `${gen.name}、${fate}。`, c.side === "P" ? "bad" : "good");
        else if (risk > 0.52) fate = "重傷"; else if (risk > 0.34) fate = "軽傷";
        if (!fate) continue;
        if (fate === "捕縛") {
          // 捕らえた側の勢力と、その者を収める城
          const winner = b.result === "P" ? (ctx.playerIsAtk ? army.faction : castle.faction)
            : (ctx.playerIsAtk ? castle.faction : army.faction);
          const hold = winner === castle.faction ? castle.id
            : (s.castles.find((x) => x.faction === winner) || castle).id;
          const heir = s.generals.find((x) => x.faction === gen.faction && x.id !== gen.id && !x.captive);
          if (heir) heir.retinue += Math.round(gen.retinue * 0.5);
          if (gen.lord) {
            const next = s.generals.filter((x) => x.faction === gen.faction && x.id !== gen.id && !x.captive)
              .sort((a, z) => z.lead - a.lead)[0];
            if (next) { next.lord = true; gen.lord = false; }
          }
          makePrisoner(s, gen, winner, hold);
          s.chronicle.push({ y: s.year, m: s.month, text: `${gen.name}が捕らえられた。` });
          if (winner === s.player) s.captives = [...(s.captives || []), gen.id];   // 処遇を問う
        } else if (fate === "討死") {
          const heir = s.generals.find((x) => x.faction === gen.faction && x.id !== gen.id);
          if (heir) heir.retinue += Math.round(gen.retinue * 0.5);
          s.generals = s.generals.filter((x) => x.id !== gen.id);
          if (gen.lord) {
            if (gen.faction === s.player) s.succession = { dead: gen, cause: "討死した" };
            else succeed(s, gen, "討死した");
          } else s.chronicle.push({ y: s.year, m: s.month, text: `${gen.name}が討死した。` });
        } else if (fate === "重傷") {
          gen.hurt = 3; gen.unity = Math.max(20, (gen.unity || 60) - 8);
          s.chronicle.push({ y: s.year, m: s.month, text: `${gen.name}が重傷を負い、しばらく戦えない。` });
        } else {
          s.chronicle.push({ y: s.year, m: s.month, text: `${gen.name}が軽傷を負った。` });
        }
      }

      if (atkWon && army) {
        if (castle.local < 200) {
          army.local = atkLeft;
          sackCastle(s, castle, army, true);
        } else {
          army.sieging = true;
          s.sieges = [...s.sieges.filter((x) => x.castleId !== castle.id), { castleId: castle.id, armyId: army.id, months: 0, decided: null }];
        }
      } else if (army) {
        /* 敗れた（あるいは日没で決着せぬ）軍は退く。
           出陣元だけを探して見つからなければ何もしない、という書き方をしていたため、
           留守に出陣元を奪われていると、軍だけ消えて将は at が空のまま残っていた。
           盤にも城の帳面にも現れず、遊ぶ側からは「武将が消えた」と映る。
           withdrawArmy は、出陣元が駄目なら手近な自領へ落とし、
           それも無ければいま踏んでいる地の城へ将を預ける。 */
        army.local = atkLeft;
        const home = 合戦裁定.withdrawArmy(s, army);
        s.chronicle.push({ y: s.year, m: s.month,
          text: home
            ? `${s.factions[army.faction].name}の軍は${home.name}へ退いた（${fmt(Math.max(0, atkLeft))}人）。`
            : `${s.factions[army.faction].name}の軍は退いたが、帰る城がなかった。` });
      }
      // 援軍は損害を反映して帰国させる
      for (const a of [...s.armies]) {
        const corpsOf = b.corps.filter((c) => c.armyId === a.id);
        if (!corpsOf.length) continue;
        const men = corpsOf.reduce((t, c) => t + c.squads.filter((q) => q.origin === "地域").reduce((u, q) => u + q.men, 0), 0);
        a.local = Math.round(men);
        const home = 合戦裁定.withdrawArmy(s, a);       // 寄騎の帰り先も同じ理屈で探す
        s.chronicle.push({ y: s.year, m: s.month,
          text: `${s.factions[a.faction].name}の援軍は${Math.round(men)}人を残して${home ? `${home.name}へ` : ""}引き揚げた。` });
      }
      if (playerWon) {
        const 功 = 手柄の隊(s, side("P"), castle);
        if (功 && Math.random() < 0.7) s.promo = makePromotion(功.lord, s.generals, 功);
      }
      s.pendingArrivals = (s.pendingArrivals || []).slice(1);
      if (ctx.campId) s.campaigns = (s.campaigns || []).filter((x) => x.id !== ctx.campId);
      return s;
    });
    setBattle(null);
  };

  const resolveSiege = (mode, gate, kits) => {
    setG((prev) => {
      const s = structuredClone(prev);
      const key = `${s.year}-${s.month}`;
      // 自勢力に関係しない包囲は自動で進める
      for (const other of s.sieges) {
        const a2 = s.armies.find((x) => x.id === other.armyId);
        const c2 = s.castles.find((x) => x.id === other.castleId);
        if (a2 && c2 && a2.faction !== s.player && c2.faction !== s.player) other.decided = key;
      }
      const sg = s.sieges.find((x) => x.decided !== key);
      if (!sg) return s;
      sg.decided = key;
      const castle = s.castles.find((x) => x.id === sg.castleId);
      const army = s.armies.find((x) => x.id === sg.armyId);
      if (!army) { s.sieges = s.sieges.filter((x) => x !== sg); return s; }
      army.sieging = true;
      if (mode === "兵糧攻め") {
        sg.months++;
        // 包囲率。取り囲む軍の数と兵力差で決まり、締め方と援軍の入りやすさを左右する。
        const besieging = s.armies.filter((x) => x.target === castle.id && x.sieging);
        const dGens = s.generals.filter((x) => x.at === castle.id && x.faction === castle.faction && !x.captive);
        const dMen = castle.local + dGens.reduce((a, x) => a + x.retinue, 0);
        const enc = clamp(0.28 + 0.18 * besieging.length + 0.36 * Math.min(1, army.men / Math.max(1, dMen * 1.5)), 0.2, 1);
        sg.enc = Math.round(enc * 100);
        castle.food = Math.max(0, castle.food - Math.round((castle.local * 0.35 + 600) * (0.6 + enc) * (castle.intrigue ? 1.8 : 1)));
        // 井戸が傷んでいれば水に窮する
        const well = castle.well == null ? 100 : castle.well;
        const thirst = well < 50 ? (50 - well) / 12 : 0;
        castle.min = Math.max(0, castle.min - (castle.intrigue ? 11 : 5) - thirst);
        if (thirst > 0 && sg.months % 2 === 0) {
          s.chronicle.push({ y: s.year, m: s.month, text: `${castle.name}は水に窮している（井戸${Math.round(well)}）。` });
        }
        // 疫病。長引くほど、また囲みが緩いほど起こりやすい。
        if (Math.random() < 0.045 * sg.months * (1.4 - enc)) {
          const a1 = Math.round(army.men * (0.04 + Math.random() * 0.05));
          const d1 = Math.round(castle.local * (0.05 + Math.random() * 0.06));
          army.men -= a1; army.local = Math.max(0, army.local - a1);
          castle.local = Math.max(0, castle.local - d1);
          castle.min = Math.max(0, castle.min - 4);
          s.chronicle.push({ y: s.year, m: s.month,
            text: `${castle.name}の囲みに疫病が出た。寄せ手${fmt(a1)}人、城方${fmt(d1)}人を失った。` });
        }
        army.food -= Math.round(army.men * 0.09);
        if (castle.food <= 0 || castle.min < 25) {
          s.chronicle.push({ y: s.year, m: s.month, text: `兵糧尽き、${castle.name}は開城した。` });
          sackCastle(s, castle, army, false);     // 開城なので城下の荒れは軽い
        }
      } else if (mode === "強攻") {
        // 城門攻撃隊を出すと城防の効きが3割落ち、守り手の損害が25%増す。
        // 代わりに門へ取り付いた300人のうち4分の1が失われる。
        const gateOK = gate && army.men >= 540;
        const defPower = castle.local + castle.def * 14 * (gateOK ? 0.7 : 1);
        const ratio = army.men / Math.max(1, defPower);
        let aL = Math.round(army.men * clamp(0.34 / ratio, 0.08, 0.55));
        if (gateOK) aL = Math.round(aL * 0.85 + 300 * 0.25);
        const dL = Math.round(castle.local * clamp(0.5 * ratio, 0.1, 0.85) * (gateOK ? 1.25 : 1));
        army.men -= aL; army.local = Math.max(0, army.local - aL);
        castle.local = Math.max(0, castle.local - dL);
        castle.hp = Math.max(0, castle.hp - Math.round(dL * 1.5 * (gateOK ? 1.6 : 1)));
        if (gateOK) s.chronicle.push({ y: s.year, m: s.month, text: `${castle.name}の城門へ攻撃隊を差し向けた。` });
        if (castle.local < 120) {
          s.chronicle.push({ y: s.year, m: s.month, text: `${castle.name}、強攻により陥落。攻め手${fmt(aL)}人、守り手${fmt(dL)}人を失った。` });
          sackCastle(s, castle, army, true);
        } else {
          s.chronicle.push({ y: s.year, m: s.month, text: `${castle.name}への強攻は退けられた。攻め手${fmt(aL)}人を失った。` });
        }
      } else {
        合戦裁定.withdrawArmy(s, army);        // 出陣元が奪われていても自領へ戻す
        s.sieges = s.sieges.filter((x) => x !== sg);
      }
      return s;
    });
  };

  // 包囲中の選択。強攻を選べば城郭図の上での戦いに移る。
  // 第三引数は、強攻なら攻城の道具、防衛なら出撃の別。
  const onSiegeChoice = (mode, gate, extra) => {
    const kits = mode === "強攻" ? extra : null;
    const sortie = mode === "防衛" ? extra : null;
    const sg = g.sieges.find((x) => {
      if (x.decided === `${g.year}-${g.month}`) return false;
      const a2 = g.armies.find((y) => y.id === x.armyId), c2 = g.castles.find((y) => y.id === x.castleId);
      return a2 && c2 && (a2.faction === g.player || c2.faction === g.player);
    });
    if (!sg) return;
    const army = g.armies.find((x) => x.id === sg.armyId);
    const mark = () => setG((p) => {
      const s = structuredClone(p);
      const x = s.sieges.find((y) => y.castleId === sg.castleId);
      if (x) x.decided = `${s.year}-${s.month}`;
      return s;
    });
    if (mode === "強攻" && army && army.faction === g.player) { mark(); startAssault(sg, gate, kits); return; }
    if (mode === "防衛") {
      mark();
      // 寄せ手が攻めかかるかは向こうの判断。三度に一度ほど城壁に取り付く。
      if (Math.random() < 0.34) { 門の備えを問う({ ...sg, sortie }, army && army.men >= 540); return; }
      resolveSiege("兵糧攻め");
      return;
    }
    resolveSiege(mode, gate, kits);
  };

  /* 援軍を差し向ける（GDD 7.3 / 7.4）。
     出す軍には助勢の印をつける。着いた先を攻めるか援けるかは、この印で判ずる。
     印がないと、同盟の城は「旗の下」に入らないので、攻撃として扱われてしまう。
     下知の通る城（自家・臣従）からは、選んだ将と兵をそのまま出す。
     頼むだけの家（同盟・従属）は、応じるか否かを相手が決める。 */
  /* 援軍を差し向ける。盤を直に扱う形にしてある。
     画面から呼ぶときは sendAid、月送りの下知に応じるときはここを直に呼ぶ。 */
  const sendAidState = (s, target, plan) => {
    const 的 = s.castles.find((x) => x.id === target);
    if (!的) return s;
    const 囲まれている = s.sieges.some((sg) => sg.castleId === target);
    let 出た = 0;

    for (const req of (plan.下知 || [])) {
      const c2 = s.castles.find((x) => x.id === req.castleId);
      if (!c2) continue;
      const gens = req.gens.map((id) => s.generals.find((x) => x.id === id))
        .filter((x) => x && x.at === c2.id && !x.captive);
      const send = Math.max(0, Math.min(req.local, c2.local));
      const men = send + gens.reduce((a, x) => a + x.retinue, 0);
      if (men < 100) continue;
      c2.local -= send;
      c2.food -= Math.round(send * 0.6);
      for (const t of gens) t.at = null;
      const tk = rosterTake(c2.rost || newRoster(c2.local + send, `loc-${c2.id}`), send);
      c2.rost = tk.rest;
      s.armies.push({
        id: `aid${Date.now()}${Math.round(Math.random() * 1e6)}`, faction: c2.faction, from: c2.id,
        gens: gens.map((x) => x.id), local: send, localTrain: c2.localTrain, rost: tk.taken,
        men, at: c2.id, path: findPath(c2.id, target), prog: 0, food: Math.round(send * 0.6),
        target, aid: s.player, 助勢: true, ...(囲まれている ? { relief: target } : {}),
      });
      出た += men;
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${c2.name}より援軍${fmt(men)}人（${gens.map((x) => x.name).join("・") || "将なし"}）が${的.name}へ向かう。` });
    }

    // 頼むだけの家。応じるか否かは相手が決める。
    for (const req of (plan.頼み || [])) {
      const c2 = s.castles.find((x) => x.id === req.castleId);
      if (!c2) continue;
      if (req.reason) {
        s.chronicle.push({ y: s.year, m: s.month, text: `${c2.name}は兵を出せなかった（${req.reason}）。` });
        continue;
      }
      if (Math.random() > req.chance) {
        const rel = s.relations[relKey(s.player, c2.faction)];
        if (rel) rel.trust = clamp(rel.trust - 4, 0, 100);
        s.chronicle.push({ y: s.year, m: s.month, text: `${s.factions[c2.faction].name}は援軍の求めに応じなかった。` });
        continue;
      }
      const rgens = s.generals.filter((x) => x.at === c2.id && x.faction === c2.faction && !x.captive);
      const send = Math.min(req.men, Math.max(0, c2.local));
      if (send < 100 || !rgens.length) continue;
      const take = [...rgens].sort((a, z) => z.lead - a.lead).slice(0, 1);
      c2.local -= send;
      c2.food -= Math.round(send * 0.6);
      for (const t of take) t.at = null;
      const tk = rosterTake(c2.rost || newRoster(c2.local + send, `loc-${c2.id}`), send);
      c2.rost = tk.rest;
      s.armies.push({
        id: `aid${Date.now()}${Math.round(Math.random() * 1e6)}`, faction: c2.faction, from: c2.id,
        gens: take.map((x) => x.id), local: send, localTrain: c2.localTrain, rost: tk.taken,
        men: send + take.reduce((a, x) => a + x.retinue, 0), at: c2.id,
        path: findPath(c2.id, target), prog: 0, food: Math.round(send * 0.6),
        target, aid: s.player, 助勢: true, ...(囲まれている ? { relief: target } : {}),
      });
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${s.factions[c2.faction].name}が${c2.name}より援軍${fmt(send)}人を${的.name}へ差し向けた。` });
    }

    s.msg = 出た > 0 ? `${的.name}へ援軍${fmt(出た)}人を差し向けた。` : "援軍の使者を送った。";
    // 応じれば信用が増す（GDD 11.1）
    if (的.faction !== s.player && 出た > 0) {
      const rel = s.relations[relKey(s.player, 的.faction)];
      if (rel) rel.trust = clamp(rel.trust + 12, 0, 100);
    }
    return s;
  };

  const sendAid = (target, plan) => setG((prev) => sendAidState(structuredClone(prev), target, plan));

  /* 臣従している相手からの下知に応じる。誰をどれだけ出すかは向こうが決めるので、
     こちらは最寄りの城から、守備を残せるだけの兵を出すほかない。 */
  const 臣従の供出 = (s, target) => {
    const 下知 = [];
    const 候補 = s.castles.filter((c2) => c2.faction === s.player)
      .map((c2) => ({ c2, p: findPath(c2.id, target) })).filter((x) => x.p)
      .sort((a, z) => a.p.length - z.p.length);
    for (const { c2 } of 候補) {
      const gens = s.generals.filter((x) => x.at === c2.id && x.faction === s.player && !x.captive);
      if (!gens.length) continue;
      const 余 = c2.local + gens.reduce((a, x) => a + x.retinue, 0) - minGarrison(c2);
      if (余 < 500) continue;
      const 将 = [...gens].sort((a, z) => z.lead - a.lead).slice(0, 1);
      const 兵 = Math.max(0, Math.min(c2.local, Math.round(余 * 0.5)));
      if (兵 + 将[0].retinue < 100) continue;
      下知.push({ castleId: c2.id, gens: 将.map((x) => x.id), local: 兵 });
      break;                                   // 下知に応じるのは一手で足りる
    }
    return { 下知 };
  };

  /* 出陣の道。出陣先を選ぶときと同じ道を、実際にも進ませる（GDD 7.1）。

     選ぶときは「通れる所だけを通る道」で判じておきながら、進むときは
     いちばん安い道を辿っていた。それでは、通れぬはずの他家の城を素通りする。 */
  const 出陣の道 = (s, from, to) => {
    const 的 = s.castles.find((x) => x.id === to);
    if (的 && underMyBanner(s, s.player, 的.faction)) return findPath(from, to);
    const 通れる = (id) => {
      const mid = s.castles.find((y) => y.id === id);
      if (!mid) return true;
      if (mid.faction === s.player) return true;
      const st = relOf(s, s.player, mid.faction).state;
      return st === "同盟" || st === "従属" || st === "臣従";
    };
    return findPathVia(from, to, 通れる) || findPath(from, to);
  };

  const launchSortie = (p) => {
    if (!p.to || !findPath(p.from, p.to)) return;      // 行けない目標は受け付けない
    /* 約束を交わした相手へ兵を出そうとしていないか（GDD 11.1）。

       同盟・従属・臣従・不可侵の相手の城へ兵を出せば、それは援軍ではなく攻撃である。
       着いた月に合戦が始まり、約束は破れ、周辺の家々の信用も落ちる。
       これまでは黙って実行し、あとから戦国記に「裏切りとして……」と出るだけだった。
       取り返しがつかぬので、出す前に一度問う。
       （旗の下の城＝自家と臣従の家の城へ送るのは後詰であって、攻撃ではない。問わない。） */
    const 目標 = g.castles.find((x) => x.id === p.to);
    if (!p.覚悟 && 目標 && !underMyBanner(g, g.player, 目標.faction)
      && atPeace(g, g.player, 目標.faction)) {
      setBreakVow({ p, castle: 目標, state: relOf(g, g.player, 目標.faction).state });
      return;
    }
    setG((prev) => {
      const s = structuredClone(prev);
      // 寄騎（援軍）を出す。各城は守備最低数と距離、従属度から派遣を決める（GDD 7.3）
      for (const req of (p.reinforce || [])) {
        const rc2 = s.castles.find((x) => x.id === req.castleId);
        if (!rc2) continue;
        if (req.reason) {
          s.chronicle.push({ y: s.year, m: s.month, text: `${rc2.name}は兵を出せなかった（${req.reason}）。` });
          continue;
        }
        if (Math.random() > req.chance) {
          const rel = s.relations[relKey(s.player, rc2.faction)];
          if (rel) rel.trust = clamp(rel.trust - 4, 0, 100);
          s.chronicle.push({ y: s.year, m: s.month, text: `${s.factions[rc2.faction].name}は寄騎の求めに応じなかった。` });
          continue;
        }
        const rgens = s.generals.filter((x) => x.at === rc2.id && x.faction === rc2.faction && !x.captive);
        if (!rgens.length) continue;
        /* 誰を何人で出すか。指図の通る城では、遊ぶ側が出陣の画面で選んでいる。
           選ばれていなければ（同盟・従属へ頼んだ場合）、相手が将と数を決める。 */
        const 指名 = (req.genIds || []).map((id) => rgens.find((x) => x.id === id)).filter(Boolean);
        const take = 指名.length ? 指名 : [...rgens].sort((a, z) => z.lead - a.lead).slice(0, 1);
        const send = Math.min(Math.max(0, req.men), Math.max(0, rc2.local));
        const 総勢 = send + take.reduce((a, x) => a + x.retinue, 0);
        if (総勢 < 100) {
          s.chronicle.push({ y: s.year, m: s.month, text: `${rc2.name}の寄騎は数が足らず、取りやめとなった。` });
          continue;
        }
        rc2.local -= send;
        rc2.food -= Math.round(send * 0.6);
        for (const t of take) t.at = null;
        const path = findPath(rc2.id, p.to);
        s.armies.push({
          id: `r${Date.now()}${Math.round(Math.random() * 1e6)}`, faction: rc2.faction, from: rc2.id,
          gens: take.map((x) => x.id), local: send, localTrain: rc2.localTrain,
          rost: (() => { const tk = rosterTake(rc2.rost || newRoster(rc2.local + send, `loc-${rc2.id}`), send); rc2.rost = tk.rest; return tk.taken; })(),
          men: send + take.reduce((a, x) => a + x.retinue, 0), at: rc2.id,
          path, prog: 0, food: Math.round(send * 0.6), target: p.to, aid: s.player,
        });
        s.chronicle.push({ y: s.year, m: s.month,
          text: `${rc2.name}より寄騎${fmt(総勢)}人（${take.map((x) => x.name).join("・")}）が${nodeById(p.to).name}へ向かう（約${req.months}か月）。` });
      }
      const c = s.castles.find((x) => x.id === p.from);
      const dest = s.castles.find((x) => x.id === p.to);
      // 不可侵・同盟を破れば「裏切り」として信用と威信を失う
      if (dest && dest.faction !== s.player && atPeace(s, s.player, dest.faction)) {
        const r = s.relations[relKey(s.player, dest.faction)];
        r.state = "中立"; r.until = null; r.trust = 0;
        for (const k of Object.keys(s.relations)) if (己の盟約(k, s.player)) s.relations[k].trust = clamp(s.relations[k].trust - 15, 0, 100);
        s.factions[s.player].prestige = clamp(s.factions[s.player].prestige - 12, 0, 100);
        for (const x of s.generals.filter((q) => q.faction === s.player && !q.lord)) x.loyal = Math.max(0, x.loyal - 5);
        s.chronicle.push({ y: s.year, m: s.month, text: `${s.factions[dest.faction].name}との約束を破って兵を出した。裏切りとして周辺勢力の警戒を招いた。` });
      }
      c.local -= p.local; c.food -= p.food;
      const mainId = `a${Date.now()}`;
      /* 兵科の割りに従って隊を仕立てる（GDD 8.1）。

         槍と弓は村々の百姓が自前で携えて出るが、騎馬には馬が、鉄砲には鉄砲が要る。
         城の蓄えを超えては立てられぬので、足りぬぶんは槍が埋める。
         連れて行った馬と鉄砲は城から出る。帰ってくれば、生き残ったぶんだけ戻る。 */
      const 割 = 蓄えに合わせる(p.mix, p.local, { horse: c.horse || 0, gun: c.gun || 0 });
      c.rost = rosterTake(c.rost || newRoster(c.local + p.local, `loc-${c.id}`), p.local).rest;
      const takeMain = { taken: newRoster(p.local, `arm-${mainId}`, 割) };
      c.horse = Math.max(0, (c.horse || 0) - 割.kiba);
      c.gun = Math.max(0, (c.gun || 0) - 割.teppo);
      if (割.足りぬ馬 || 割.足りぬ鉄砲) {
        s.chronicle.push({ y: s.year, m: s.month,
          text: `${c.name}では${[割.足りぬ馬 ? `馬が${fmt(割.足りぬ馬)}頭` : "", 割.足りぬ鉄砲 ? `鉄砲が${fmt(割.足りぬ鉄砲)}挺` : ""].filter(Boolean).join("・")}足りず、そのぶんは槍で立てた。` });
      }
      // 味方の城が囲まれているなら、これは後詰である。着けば囲みを解くための野戦になる。
      const 救う = dest && dest.faction === s.player && s.sieges.some((sg) => sg.castleId === dest.id);
      s.armies.push({
        /* 出す家。臣従した家の城から出すなら、その家の軍である（GDD 12.2）。
           旗の下の軍であるから、着いた先の扱い（後詰か攻めか）は自家と同じに読む。 */
        id: mainId, faction: (s.castles.find((c2) => c2.id === p.from) || {}).faction || s.player, from: p.from, gens: p.gens, local: p.local, rost: takeMain.taken,
        localTrain: c.localTrain, men: p.local + p.gens.reduce((a, id) => a + s.generals.find((x) => x.id === id).retinue, 0),
        at: p.from, path: 出陣の道(s, p.from, p.to), prog: 0, food: p.food, target: p.to,
        ...(救う ? { relief: p.to } : {}),
      });
      for (const gid of p.gens) s.generals.find((x) => x.id === gid).at = null;
      if (救う) {
        // 後詰に軍議は要らぬ。着いた先で囲みを衝くのみである。
        const sg = s.sieges.find((x) => x.castleId === p.to);
        if (sg) sg.relief = mainId;
        s.chronicle.push({ y: s.year, m: s.month,
          text: `${c.name}より後詰が発した。${dest.name}の囲みを解きに向かう。` });
        return s;
      }
      /* 旗の下の城へ向かうのは、攻めではない。援軍であり、持ち場替えである。
         ここで戦役を起こすと、着いた先で「攻めかかるか」と軍議が開かれ、
         味方の城を攻めることになってしまう。戦役は敵城へ向かうときだけ起こす。 */
      if (underMyBanner(s, s.player, dest ? dest.faction : null)) {
        s.chronicle.push({ y: s.year, m: s.month,
          text: dest.faction === s.player
            ? `${c.name}より${dest.name}へ兵を移す（${fmt(p.local + p.gens.reduce((a2, id) => a2 + (s.generals.find((x) => x.id === id) || {}).retinue || 0, 0))}人）。`
            : `${c.name}より${s.factions[dest.faction].name}の${dest.name}へ援軍を送る。` });
        return s;
      }
      // 戦役を起こす。総大将は出陣を発した城の城主。
      const lead = s.generals.find((x) => x.id === (c.lordId || p.gens[0]));
      const camp = {
        id: `c${Date.now()}`, target: p.to, from: p.from,
        leader: lead ? lead.id : p.gens[0], leaderName: lead ? lead.name : "総大将",
        armies: [mainId], arrived: [], y: s.year, m: s.month, decided: null, waited: 0,
      };
      for (const a of s.armies) if (a.aid === s.player && a.target === p.to && !camp.armies.includes(a.id)) camp.armies.push(a.id);
      s.campaigns = [...(s.campaigns || []), camp];
      s.chronicle.push({ y: s.year, m: s.month,
        text: `${c.name}より出陣。総大将は${camp.leaderName}。${nodeById(p.to).name}を攻める。` });
      return s;
    });
    setModal(null);
  };

  const totalMen = mine.reduce((a, c) => a + c.local, 0) + myGens.filter((x) => x.at).reduce((a, x) => a + x.retinue, 0)
    + g.armies.filter((a) => a.faction === g.player).reduce((a, x) => a + x.men, 0);
  // 軍議は敵城に対してのみ開く。旗の下の城に向かって軍議を開く筋はない。
  const openCamp = (g.campaigns || []).find((c) => {
    if (c.decided === `${g.year}-${g.month}` || !c.arrived.length) return false;
    const t = g.castles.find((x) => x.id === c.target);
    return t && !underMyBanner(g, g.player, t.faction);
  });
  const openSiege = g.sieges.find((x) => {
    if (x.decided === `${g.year}-${g.month}`) return false;
    const a2 = g.armies.find((y) => y.id === x.armyId), c2 = g.castles.find((y) => y.id === x.castleId);
    return a2 && c2 && (a2.faction === g.player || c2.faction === g.player);
  });
  const selCastle = g.castles.find((c) => c.id === sel);

  // 合戦中は戦略画面の帯を出さず、画面全体を戦場にする（GDD 15.1）
  if (sea) return <SeaScreen key={sea.key} ctx={sea} land={land} onEnd={(bb) => 海戦を終える(bb)} />;
  if (battle) return <BattleScreen key={battle.armyId} ctx={battle} land={land} onEnd={(bb) => finishBattle(bb, battle)} />;

  return (
    <div className="sp" style={{ height: "100dvh" }}>
      {!wide && (
      <div className="bar">
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span className="dot" style={{ background: pf.color }} />
          <b className="mn" style={{ fontSize: 16 }}>{pf.name}</b>
        </span>
        <span className="kv num"><b>{g.year}年 {g.month}月</b>
          <span style={{ background: "#EFEDE4", borderRadius: 3, padding: "1px 6px", fontSize: 11 }}>{SEASON(g.month)}</span></span>
        <span className="kv">石高 <b className="num">{man(mine.reduce((a, c) => a + c.koku, 0))} 万石</b></span>
        <span className="kv">兵数 <b className="num">{fmt(totalMen)}</b></span>
        <span className="kv">金銭 <b className="num">{fmt(pf.gold)} 貫</b></span>
        <span className="kv">拠点 <b className="num">{mine.length} 城</b></span>
        {(() => {
          const cr = courtRank(g, g.player);
          if (!cr) return null;
          return (
            <span className="kv" style={{ color: "#8A6A2A" }}>
              <b>{cr.key}</b>（兵×{cr.troop}）
            </span>
          );
        })()}
        {(() => {
          const lord = g.generals.find((x) => x.faction === g.player && x.lord && !x.captive);
          if (!lord || !needsGuardian(lord)) return null;
          const gd = actingHead(g, g.player);
          return (
            <span className="kv" style={{ color: "#8A5A3A" }}>
              当主 <b>{lord.name}</b>（{lord.age}歳）は幼年。
              {gd && gd.id !== lord.id ? <> <b>{gd.name}</b>が後見</> : " 後見なし"}
            </span>
          );
        })()}
        <span style={{ flex: 1 }} />
        <select className="sel" value={pf.mobilization}
          onChange={(e) => setG((p) => { const s = structuredClone(p); s.factions[s.player].mobilization = +e.target.value; return s; })}>
          {MOB_POLICY.map((m, i) => <option key={m.name} value={i}>{`動員：${m.name}（一万石 ${m.per}人）`}</option>)}
        </select>
        <button className="btn sm" onClick={() => setModal("manual")}>遊び方</button>
        <button className="btn sm" onClick={() => setModal("chronicle")}>戦国記</button>
        <button className="btn sm" onClick={() => setModal("save")}>
          記録{savedMsg ? `：${savedMsg}` : ""}
        </button>
        <button className="btn sm" onClick={onTitle}>タイトル</button>
        <button className="btn dark sm" disabled={!!battle || !!openSiege} onClick={nextMonth}>次月へ</button>
      </div>
      )}

      <div className="mapwrap" ref={wrapRef}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => (drag.current = null)}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp} onTouchCancel={onCancel}
        onWheel={(e) => { if (e.target === cvRef.current) zoom(e.deltaY < 0 ? 1.12 : 0.89); }}>
        <canvas ref={cvRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />
        <div className="mapctl l" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
          <div className="mbtn" onClick={() => zoom(1.25)}><b>＋</b>拡大</div>
          <div className="mbtn" onClick={() => zoom(0.8)}><b>−</b>縮小</div>
          <div className="mbtn" onClick={() => focus(mine[0] && mine[0].id)}><b>◎</b>本拠</div>
          <div className="mbtn" onClick={whole}><b>⛶</b>全体図</div>
          <div className={`mbtn ${wide ? "on" : ""}`} onClick={() => setWide((v) => !v)}>
            <b>{wide ? "▤" : "⤢"}</b>{wide ? "戻す" : "広く"}
          </div>
        </div>
        {!wide && (
          <div className="mapctl r" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
            <div className="mbtn" style={{ width: 66 }} onClick={() => setModal("factions")}><b>⚑</b>勢力情報</div>
            <div className="mbtn" style={{ width: 66 }} onClick={() => setModal("generals")}><b>☗</b>武将一覧</div>
            <div className="mbtn" style={{ width: 66 }} onClick={() => setModal("hime")}><b>◇</b>姫</div>
            <div className="mbtn" style={{ width: 66 }} onClick={() => setModal("goal")}><b>◈</b>攻略目標</div>
            <div className="mbtn" style={{ width: 66 }} onClick={() => setModal("manual")}><b>？</b>遊び方</div>
            <div className="mbtn" style={{ width: 66 }} onClick={() => setModal("chronicle")}><b>▤</b>履歴</div>
          </div>
        )}
        {!wide && <canvas className="mini" ref={miniRef} onClick={whole} />}
        {wide && (
          <div style={{ position: "absolute", left: 12, bottom: 12, zIndex: 6, display: "flex", gap: 8, alignItems: "center",
            background: "rgba(255,255,255,.94)", border: `1px solid ${U.line}`, borderRadius: 20, padding: "6px 12px", fontSize: 12 }}>
            <span className="dot" style={{ background: pf.color }} />
            <b className="mn">{pf.name}</b>
            <span className="num">{g.year}年{g.month}月</span>
            <span className="num">兵{fmt(totalMen)}</span>
            <button className="btn sm" disabled={!!battle || !!openSiege || !!openCamp} onClick={nextMonth}>次月へ</button>
          </div>
        )}
        {!sel && !wide && <div className="hint">城をタップすると詳細が開きます</div>}


        {selCastle && (
          <CastleSheet g={g} castle={selCastle} land={land} tab={tab} setTab={setTab}
            onClose={() => setSel(null)} onCommand={runCommand} onAppoint={appoint}
            onTrade={(id, kind, n) => setG((prev) => 政務.doTrade(prev, id, kind, n))}
            onSortie={() => setModal("sortie")} onCallAid={(id) => setCallAid(id)} onDiplo={doDiplo} onHime={() => setModal("hime")} onPlot={doPlot}
            onSpecial={doSpecial} onReward={reward} onCaptive={doCaptive} onFief={grantFief} onRetire={doRetire} onSettle={settleCaptive} onKenchi={doKenchi} />
        )}
        {modal === "sortie" && selCastle && <SortieDialog g={g} from={selCastle.id} onClose={() => setModal(null)} onGo={launchSortie} />}
        {/* 約束を交わした相手へ兵を出す前の問い（GDD 11.1）。
            取り返しがつかぬ手なので、何が失われるかを数で示してから選ばせる。 */}
        {breakVow && (() => {
          const bv = breakVow;
          const f = g.factions[bv.castle.faction];
          const rel = relOf(g, g.player, bv.castle.faction);
          const 味方 = Object.keys(g.relations)
            .filter((k) => 己の盟約(k, g.player) && g.relations[k].trust >= 40).length;
          return (
            <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
              <div className="card" style={{ maxWidth: 470 }}>
                <div className="mn" style={{ fontSize: 21, marginBottom: 4 }}>
                  {f.name}は{bv.state}の間柄にある
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.95, marginTop: 8 }}>
                  <b>{bv.castle.name}</b>へ兵を出せば、それは後詰ではなく<b>攻撃</b>です。
                  着いた月に合戦が始まり、{f.name}とは<b>敵対</b>することになります。
                </div>
                <div style={{ margin: "12px 0", padding: "10px 12px", background: "rgba(176,72,60,0.08)",
                  borderLeft: "3px solid #B0483C", fontSize: 12, lineHeight: 1.95 }}>
                  <b style={{ color: "#B0483C" }}>失うもの</b><br />
                  ・{f.name}との<b>{bv.state}</b>は破れ、中立に戻る（いまの信用 {Math.round(rel.trust)}　→　0）<br />
                  ・<b>威信</b>が下がる（{Math.round(g.factions[g.player].prestige)} → {Math.round(Math.max(0, g.factions[g.player].prestige - 12))}）<br />
                  ・<b>他家すべての信用</b>が15下がる（いま信用40以上の相手 {味方} 家）<br />
                  ・<b>家臣の忠誠</b>が5下がる。義に悖る主とみなされます
                </div>
                <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.8, marginBottom: 12 }}>
                  一度破った約束は戻りません。結び直すには、改めて金銭と年月を要します。
                </div>
                <div style={{ display: "flex", gap: 9 }}>
                  <button className="btn" style={{ flex: 1 }} onClick={() => setBreakVow(null)}>取りやめる</button>
                  <button className="btn dark" style={{ flex: 1 }}
                    onClick={() => { const q = bv.p; setBreakVow(null); launchSortie({ ...q, 覚悟: true }); }}>
                    承知のうえで出陣する
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
        {modal === "save" && (() => {
          /* 記録所（GDD 15.3）。

             記録が一つきりだと、分かれ道を試したくても、いまの歩みを捨てるほかない。
             五つの枠を設けた。自動の枠は月が替わるたびに勝手に上書きされるので、
             取っておきたい盤は、ここで一〜五のどれかへ収める。 */
          const 収める = async (key, 名) => {
            const ok = await onSave(g, key);
            /* 収まらなかった訳をそのまま出す。「記録できない環境」と一括りにすると、
               棚が一杯なだけのときも「この端末では無理」と読めてしまい、
               古い枠を消せばよい、ということが分からない。 */
            const 訳 = 記録の訳を読む();
            setSavedMsg(ok ? `${名}へ記録した${訳 ? `（${訳}）` : ""}` : (訳 || "記録できない環境"));
            setTimeout(() => setSavedMsg(""), 2600);
            setModal(null);
          };
          return (
            <div className="modal" {...外を押して閉じる(() => setModal(null))}>
              <div className="card" style={{ maxWidth: 460 }}>
                <div className="mn" style={{ fontSize: 21, marginBottom: 4 }}>記録所</div>
                <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 10, lineHeight: 1.8 }}>
                  いまの盤は{g.year}年{g.month}月（{g.factions[g.player].name}／
                  {g.castles.filter((c) => c.faction === g.player).length}城）。収める枠を選んでください。<br />
                  「自動」は月が替わるたびに上書きされます。取っておきたい盤は一〜五へ。
                </div>
                {(saves || []).map((w) => {
                  const h = 記録の見出し(w.d, g.factions);
                  return (
                    <button key={w.key} className="btn" style={{ width: "100%", textAlign: "left",
                      padding: "9px 11px", marginBottom: 5, fontSize: 12.5 }}
                      onClick={() => 収める(w.key, w.名)}>
                      <span style={{ fontSize: 10.5, color: U.dim, letterSpacing: ".08em" }}>{w.名}</span>
                      　{h
                        ? <>
                            <b className="mn">{h.家}</b>
                            <span className="num" style={{ color: U.dim, marginLeft: 6 }}>
                              {h.年}年{h.月}月／{h.城数}城・{h.万石}万石
                            </span>
                            <span style={{ color: "#B0483C", marginLeft: 6, fontSize: 11 }}>上書き</span>
                          </>
                        : <span style={{ color: U.dim }}>空き</span>}
                    </button>
                  );
                })}
                <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={() => setModal(null)}>閉じる</button>
              </div>
            </div>
          );
        })()}
        {townSel && !battle && !sea && (() => {
          /* 特殊勢力の帳（GDD 5.4）。
             地図の印を押したら、それが何をする所で、いま誰に付いていて、
             こちらから手が届くのかどうかを、その場で読めるようにする。 */
          const t = TOWNS.find((x) => x.id === townSel);
          if (!t) { setTownSel(null); return null; }
          const 様 = 町の様子(g, t);
          const 可 = 特殊勢力の可否(g, t, g.player);
          const opts = SPECIAL_OPTIONS[t.kind] || [];
          const 隣 = 可.隣;
          return (
            <div className="modal" {...外を押して閉じる(() => setTownSel(null))}>
              <div className="card" style={{ maxWidth: 430 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                  <span className="dot" style={{ background: 様.色 }} />
                  <span className="mn" style={{ fontSize: 21 }}>{t.name}</span>
                  <span className="pill" style={{ background: 様.色 }}>{t.kind}</span>
                </div>
                <div className="row"><span>いまの関係</span>
                  <span className="v">{様.誼 ? `${様.主名}と${様.誼.state}` : "中立"}</span></div>
                {様.st.anger > 0 && (
                  <div className="row"><span>反発</span><span className="v">{Math.round(様.st.anger)}</span></div>
                )}
                {隣 && (
                  <div className="row"><span>いちばん近い城</span>
                    <span className="v">{隣.name}（{g.factions[隣.faction].name}）</span></div>
                )}
                <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.85, marginTop: 8 }}>
                  {t.kind === "港" && "船を出し、兵糧を運ぶ。海路を渡る軍の支えとなる。"}
                  {t.kind === "水軍衆" && "海に生きる者たち。抱えれば軍船が増え、水主の技量も上がる。"}
                  {t.kind === "商業都市" && "諸国の品と金の集まる所。押さえれば金が回る。"}
                  {t.kind === "町" && "市の立つ在所。商いがわずかに伸びる。"}
                  {t.kind === "寺社" && "門徒と僧兵を抱える。民の心もここに寄る。"}
                  {t.kind === "忍びの里" && "人を潜ませ、敵情を探る。調略の助けとなる。"}
                  {t.kind === "鉱山" && "金銀を掘る。掘れば掘るほど金になる。"}
                  {t.kind === "牧" && "馬を育てる所。押さえれば毎年、春に馬が届く。騎馬を揃える道である。"}
                  {t.kind === "鉄砲鍛冶" && "鉄砲を打つ里。抱えれば毎年、春に鉄砲が届く。商人から買わずに済む。"}
                </div>
                <div className="sec">できること</div>
                {opts.map((o) => (
                  <div key={o.key} style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.8 }}>
                    <b style={{ color: U.text }}>{o.key}</b>
                    {o.cost ? `（${o.cost}貫）` : o.once ? `（${o.once}貫を得る）` : ""}
                    　{o.desc}
                  </div>
                ))}
                <div style={{ marginTop: 10, padding: "9px 11px", fontSize: 12, lineHeight: 1.85,
                  background: 可.ok ? "rgba(62,122,58,0.10)" : "rgba(176,72,60,0.10)",
                  borderLeft: `3px solid ${可.ok ? "#3E7A3A" : "#B0483C"}` }}>
                  {可.ok
                    ? <>手が届きます。<b>{隣 ? 隣.name : "近くの城"}</b>の帳面の「特殊勢力」から誼を通じられます。</>
                    : <><b style={{ color: "#B0483C" }}>手が届きません。</b>{可.why}。</>}
                  <br />
                  <span style={{ color: U.dim, fontSize: 11 }}>
                    湊も寺社も忍びの里も、その土地に根を張っています。いちばん近い城を
                    押さえている家だけが、その町と誼を通じられます。
                  </span>
                </div>
                <button className="btn" style={{ width: "100%", marginTop: 12 }}
                  onClick={() => setTownSel(null)}>閉じる</button>
              </div>
            </div>
          );
        })()}
        {modal === "report" && <MonthReport g={g} onClose={() => setModal(null)}
          onAid={(id) => { setModal(null); setCallAid(id); }} />}
        {modal === "manual" && <Manual onClose={() => setModal(null)} />}
        {/* 終幕（GDD 15.5）。天下が定まるか、家が絶えたら一度だけ告げる。
            閉じれば盤へ戻れる。見たかどうかは盤に控えておく（記録にも残る）。 */}
        {!終幕を見た && ((g.unified && g.unified.fid === g.player) || g.滅び) && (
          <Ending g={g} onTitle={onTitle}
            onClose={() => setG((p) => ({ ...p, 終幕を見た: true }))} />
        )}
        {modal === "chronicle" && <Chronicle g={g} onClose={() => setModal(null)} />}
        {modal === "factions" && <FactionInfo g={g} onClose={() => setModal(null)} />}
        {modal === "generals" && <GeneralList g={g} onClose={() => setModal(null)} />}
        {g.申し入れ && !battle && (
          <DiploOffer g={g} 申={g.申し入れ}
            onTake={() => setG((prev) => {
              const s = structuredClone(prev);
              const 申 = s.申し入れ; s.申し入れ = null;
              const r = 政務.外交を結ぶ(s, 申.fid, s.player, 申.key);
              s.msg = r.ok ? r.文 : (r.why || "その話は流れた");
              if (r.ok) s.monthEvents = [...(s.monthEvents || []), r.文];
              return s;
            })}
            onPass={() => setG((prev) => {
              const s = structuredClone(prev);
              const 申 = s.申し入れ; s.申し入れ = null;
              const k = [s.player, 申.fid].sort().join("|");
              const rel = s.relations[k];
              if (rel) rel.trust = Math.max(0, rel.trust - 6);
              const 文 = `${s.factions[申.fid].name}よりの「${申.key}」を断った。`;
              s.chronicle.push({ y: s.year, m: s.month, text: 文 });
              s.msg = 文;
              return s;
            })} />
        )}
        {g.縁談 && !battle && (
          <MarriageOffer g={g} 談={g.縁談}
            onTake={() => 姫の下知((s) => { const r = 縁談を受ける(s, s.縁談); s.縁談 = null; return r; })}
            onPass={() => 姫の下知((s) => { const r = 縁談を断る(s, s.縁談); s.縁談 = null; return r; })} />
        )}
        {modal === "hime" && (
          <HimeList g={g} onClose={() => setModal(null)}
            onEnvoy={(hid, fid) => 姫の下知((s) => 使者に立てる(s, hid, fid))}
            onWed={(hid, fid) => 姫の下知((s) => 婚姻を結ぶ(s, hid, fid))}
            onMarry={(hid, gid) => 姫の下知((s) => 家臣に嫁がせる(s, hid, gid))} />
        )}
        {modal === "goal" && <GoalPanel g={g} onClose={() => setModal(null)} />}
        {openCamp && !battle && <CampaignPanel g={g} camp={openCamp} onAct={campaignAct} />}
        {openSiege && !battle && !openCamp && <SiegePanel g={g} sg={openSiege} onChoose={onSiegeChoice} />}
        {門の帳 && !battle && (
          <GateDeployDialog g={g} castle={門の帳.castle} gates={門の帳.gates}
            寄せ手={g.armies.find((x) => x.id === 門の帳.sg.armyId)}
            onClose={() => { const t = 門の帳; set門の帳(null); startAssault(t.sg, t.gateParty, t.kits); }}
            onGo={(割) => { const t = 門の帳; set門の帳(null); startAssault({ ...t.sg, 割り付け: 割 }, t.gateParty, t.kits); }} />
        )}
        {(g.captives || []).length > 0 && (() => {
          const gen = g.generals.find((x) => x.id === g.captives[0]);
          if (!gen) { setG((p) => { const s = structuredClone(p); s.captives = s.captives.slice(1); return s; }); return null; }
          return <CaptiveDialog g={g} gen={gen} onDone={(how) => setG((p) => {
            const s = structuredClone(p);
            const q = s.generals.find((x) => x.id === gen.id);
            s.captives = (s.captives || []).filter((id) => id !== gen.id);
            if (!q) return s;
            const log = (t) => s.chronicle.push({ y: s.year, m: s.month, text: t });
            if (how === "登用") {
              q.faction = s.player; q.captive = null;
              q.loyal = clamp(45 + Math.random() * 20, 0, 100);
              q.retinue = Math.round(140 + Math.random() * 120);
              log(`${q.name}が降り、${s.factions[s.player].name}に属した。`);
            } else if (how === "逃す") {
              const home = s.castles.find((c) => c.faction === q.captive.from) || s.castles[0];
              q.captive = null; q.at = home.id; q.retinue = Math.round(180 + Math.random() * 120);
              q.loyal = clamp((q.loyal == null ? 60 : q.loyal) + 6, 0, 100);
              log(`${q.name}を放った。${home.name}へ帰った。`);
            } else if (how === "斬首") {
              s.generals = s.generals.filter((x) => x.id !== q.id);
              log(`${q.name}を斬った。`);
            } else {
              log(`${q.name}を捕虜として留め置いた。`);
            }
            return s;
          })} />;
        })()}
        {g.ransomOffer && (() => {
          const o = g.ransomOffer;
          const gen = g.generals.find((x) => x.id === o.genId);
          if (!gen) { setG((p) => { const s = structuredClone(p); s.ransomOffer = null; return s; }); return null; }
          const from = g.factions[o.from];
          return (
            <div className="modal">
              <div className="card">
                <div className="mn" style={{ fontSize: 18 }}>{from.name}より身代金の申し出</div>
                <div style={{ fontSize: 12.5, color: U.dim, marginTop: 8, lineHeight: 1.9 }}>
                  捕虜の<b>{gen.name}</b>（{o.rank}の器量）を返してほしいという。<br />
                  差し出す身代金は<b>金 {fmt(o.gold)}貫</b>と<b>兵糧 {fmt(o.food)}石</b>。
                </div>
                <div className="g2" style={{ marginTop: 12 }}>
                  <button className="btn dark" onClick={() => setG((p) => {
                    const s = structuredClone(p);
                    const q = s.generals.find((x) => x.id === o.genId);
                    if (q && q.captive) {
                      /* 取り立てが立たぬこともある（相手の家が滅んでいるとき）。
                         payRansom は偽を返すので、そのまま paid.gold を読むと落ちる。
                         古い記録には、滅んだ家からの申し出が残っていることがある。 */
                      const paid = payRansom(s, q);
                      if (!paid) {
                        s.msg = `${(s.factions[o.from] || {}).name || "旧主"}はすでに滅んでいる。身代金の話は流れた。`;
                      } else {
                        const rel = s.relations[relKey(s.player, o.from)];
                        if (rel) rel.trust = clamp(rel.trust + 5, 0, 100);
                        s.chronicle.push({ y: s.year, m: s.month,
                          text: `${s.factions[o.from].name}より身代金を受け、${q.name}を返した（金${fmt(paid.gold)}貫・兵糧${fmt(paid.food)}石）。` });
                      }
                    }
                    s.ransomOffer = null; return s;
                  })}>受ける</button>
                  <button className="btn" onClick={() => setG((p) => {
                    const s = structuredClone(p);
                    const rel = s.relations[relKey(s.player, o.from)];
                    if (rel) rel.trust = clamp(rel.trust - 6, 0, 100);
                    s.chronicle.push({ y: s.year, m: s.month, text: `${s.factions[o.from].name}の身代金の申し出を退けた。` });
                    s.ransomOffer = null; return s;
                  })}>退ける</button>
                </div>
              </div>
            </div>
          );
        })()}
        {/* --------------------------------- 盟友からの援軍の要請（GDD 7.4）

            同盟・従属の相手からは「頼み」であり、応じるか否かも、誰をどれだけ
            出すかもこちらが決める。臣従している相手からは「下知」であって、
            断る筋はなく、誰を出すかも向こうが決める。 */}
        {/* 一国を平定したときの知らせ（GDD 12.5）。
            最後の城を取ったその時に、はっきり告げる。 */}
        {g.国平定 && !battle && (() => {
          const k = g.国平定;
          const 城 = g.castles.find((x) => x.id === k.castleId);
          const 国の城 = g.castles.filter((x) => x.kuni === k.kuni);
          const 石 = 国の城.reduce((a, x) => a + x.koku, 0);
          const 全国 = provincesHeld(g, g.player) || [];
          return (
            <div className="modal">
              <div className="card" style={{ maxWidth: 440, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: U.dim, letterSpacing: ".3em" }}>一国平定</div>
                <div className="mn" style={{ fontSize: 32, margin: "10px 0 4px" }}>{k.kuni}</div>
                <div style={{ fontSize: 12.5, color: U.dim, lineHeight: 1.9 }}>
                  {城 ? `${城.name}を落とし、` : ""}{k.kuni}の{k.城数}城をことごとく手中にしました。<br />
                  <span className="num">石高 {fmt(石)}石</span>
                </div>
                <div style={{ margin: "14px 0", padding: "10px 12px", background: "rgba(74,110,138,0.08)",
                  borderLeft: "3px solid #4A6E8A", fontSize: 12, lineHeight: 1.95, textAlign: "left" }}>
                  国がまとまれば、民は落ち着きます（民忠の落ち着く先が上がります）。<br />
                  <b>検地</b>が行えるようになり、石高を改められます。<br />
                  {GOKINAI.includes(k.kuni) ? "五畿の一国です。すべて押さえれば朝廷より官位を賜ります。" : ""}
                </div>
                <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 12 }}>
                  平定した国：{全国.length}国（{全国.slice(0, 8).join("・")}{全国.length > 8 ? "ほか" : ""}）
                </div>
                <button className="btn dark" style={{ width: "100%" }}
                  onClick={() => setG((p2) => ({ ...p2, 国平定: null }))}>了</button>
              </div>
            </div>
          );
        })()}
        {g.aidCall && !battle && (() => {
          const ac = g.aidCall;
          const 的 = g.castles.find((x) => x.id === ac.castleId);
          const f = g.factions[ac.faction];
          if (!的 || !f) { setG((p2) => ({ ...p2, aidCall: null })); return null; }
          const 閉 = (s2) => { s2.aidCall = null; return s2; };
          if (ac.下知) {
            // 下知。向こうが将と兵を決める。こちらは受けるだけ。
            const 出す = () => setG((prev) => {
              const s2 = structuredClone(prev);
              const plan = 臣従の供出(s2, ac.castleId);
              const t = plan.下知.length ? sendAidState(s2, ac.castleId, plan) : s2;
              if (!plan.下知.length) t.msg = `${f.name}の下知に応じたが、出せる兵がなかった。`;
              return 閉(t);
            });
            return (
              <div className="modal">
                <div className="card" style={{ maxWidth: 460 }}>
                  <div className="mn" style={{ fontSize: 20 }}>{f.name}よりの下知</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.95, marginTop: 8 }}>
                    <b>{的.name}</b>が{ac.囲まれ ? "囲まれている" : "攻められようとしている"}。
                    ただちに援軍を差し向けよ、との下知です。<br />
                    <span style={{ color: U.dim }}>
                      こちらは{f.name}に<b>臣従</b>しています。断る筋はなく、
                      誰をどれだけ出すかも{f.name}が決めます。
                    </span>
                  </div>
                  <div style={{ margin: "12px 0", padding: "9px 11px", background: "rgba(74,110,138,0.10)",
                    borderLeft: "3px solid #4A6E8A", fontSize: 12, lineHeight: 1.9 }}>
                    最寄りの城から、守備を残せるだけの兵を出します。
                  </div>
                  <button className="btn dark" style={{ width: "100%" }} onClick={出す}>下知を承る</button>
                </div>
              </div>
            );
          }
          // 頼み。応じるか否かも、誰をどれだけ出すかもこちらが決める。
          return (
            <div className="modal">
              <div className="card" style={{ maxWidth: 470 }}>
                <div className="mn" style={{ fontSize: 20 }}>{f.name}よりの援軍の求め</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.95, marginTop: 8 }}>
                  <b>{的.name}</b>が{ac.囲まれ ? "囲まれています" : "攻められようとしています"}
                  {ac.寄せ手.length ? `（${ac.寄せ手.map((x) => (g.factions[x] || {}).name).join("・")}）` : ""}。
                  {ac.state}の誼をもって、援軍を求めてきました。
                </div>
                <div style={{ fontSize: 11.5, color: U.dim, margin: "10px 0", lineHeight: 1.8 }}>
                  応じれば信用が増します。断れば減ります。<br />
                  放っておけばこの家は削られ、やがて隣に強い敵が立ちます。
                </div>
                <div style={{ display: "flex", gap: 9 }}>
                  <button className="btn" style={{ flex: 1 }} onClick={() => setG((prev) => {
                    const s2 = structuredClone(prev);
                    const rel = s2.relations[relKey(s2.player, ac.faction)];
                    if (rel) rel.trust = clamp(rel.trust - 10, 0, 100);
                    s2.chronicle.push({ y: s2.year, m: s2.month,
                      text: `${f.name}の援軍の求めを断った。` });
                    return 閉(s2);
                  })}>断る</button>
                  <button className="btn dark" style={{ flex: 1 }}
                    onClick={() => { setG((p2) => ({ ...p2, aidCall: null })); setCallAid(ac.castleId); }}>
                    誰を出すか決める
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
        {callAid && (
          <ReinforceDialog g={g} target={callAid}
            title={`援軍を呼ぶ　${(g.castles.find((x) => x.id === callAid) || {}).name || ""}`}
            note={g.sieges.some((sg) => sg.castleId === callAid)
              ? "この城は囲まれています。着いた援軍は、囲みを解くための野戦に向かいます。"
              : "敵が向かっています。敵と同じ月に着けば、城下の野戦で迎え撃ちます"
                + "（城方も門を開いて加われます）。間に合わなければ、城の守りに加わります。"}
            onClose={() => setCallAid(null)}
            onGo={(plan) => { sendAid(callAid, plan); setCallAid(null); }} />
        )}
        {sally && (() => {
          const 軍 = g.armies.find((x) => x.id === sally.armyId);
          const 城 = g.castles.find((x) => x.id === sally.castleId);
          const 寄手 = g.armies.find((x) => x.id === sally.foeId);
          if (!軍 || !城 || !寄手) { setSally(null); return null; }
          const 始める = (出撃) => {
            setSally(null);
            // 囲みを解く後詰なら「囲み」、着いたばかりの敵を迎え撃つなら「城下」
            startBattle(軍, { ...城, name: `${城.name}${sally.城下 ? "城下" : "の囲み"}` }, null, undefined, 寄手,
              出撃 ? { id: `sally-${城.id}`, castleId: 城.id, faction: 城.faction,
                gens: 出撃.gens, local: 出撃.local, localTrain: 城.localTrain, rost: null } : null);
          };
          return <SallyDialog g={g} castleId={sally.castleId} foeId={sally.foeId} 城下={!!sally.城下}
            onClose={() => 始める(null)} onGo={始める} />;
        })()}
        {raid && (() => {
          const r = raid.plan;
          const atkIsPlayer = raid.army.faction === g.player;
          const pct = Math.round(r.p * 100);
          const wx = r.weather === "雨" ? "雨が降っている" : r.weather === "雪" ? "雪が舞っている"
            : r.weather === "曇" ? "空は曇っている" : "空は晴れている";
          const tr = r.terr === "hill" ? "山がちの地" : "森の多い地";
          return (
            <div className="modal">
              <div className="card">
                <div className="mn" style={{ fontSize: 20 }}>{raid.dest.name}下・軍議</div>
                <div style={{ fontSize: 13, color: U.dim, margin: "10px 0", lineHeight: 1.9 }}>
                  味方 <b style={{ color: U.text }}>{fmt(r.myMen)}人</b>　対　
                  敵 <b style={{ color: U.text }}>{fmt(r.foeMen)}人</b>
                  （{(r.ratio * 10).toFixed(1)}割の兵）<br />
                  {wx}。{tr}である。
                </div>
                <div style={{ borderLeft: `3px solid ${U.line}`, paddingLeft: 12, margin: "12px 0", lineHeight: 1.9, fontSize: 14 }}>
                  <b>{r.head.name}</b>（{r.head.age}歳・知略{r.head.wit}・統率{r.head.lead}）が申し出ております。<br />
                  <span style={{ color: U.dim }}>
                    「正面から当たっては勝ち目がござらぬ。
                    {r.target ? `${r.target.name}の本陣を衝きまする。` : "敵の本陣を衝きまする。"}」
                  </span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                  成算は<b style={{ color: pct >= 30 ? "#3E7A3A" : pct >= 15 ? "#C89A3A" : "#B0483C", fontSize: 17 }}>およそ{pct}％</b>。<br />
                  <span style={{ color: U.dim, fontSize: 12.5 }}>
                    当たれば敵の総大将を討ち、敵軍は崩れた形で合戦が始まる。<br />
                    外せば伏勢が露見し、味方の士気が落ちたまま戦うことになる。
                  </span>
                </div>
                <div className="g2" style={{ marginTop: 16 }}>
                  <button className="btn dark" onClick={() => {
                    const hit = Math.random() < r.p;
                    const { army, dest, camp } = raid;
                    setRaid(null);
                    if (hit && r.target) {
                      setG((p2) => {
                        const s2 = structuredClone(p2);
                        const t2 = s2.generals.find((x) => x.id === r.target.id);
                        if (t2) {
                          s2.generals = s2.generals.filter((x) => x.id !== t2.id);
                          if (t2.lord) {
                            const nx = s2.generals.filter((x) => x.faction === t2.faction && !x.captive)
                              .sort((a, z) => z.lead - a.lead)[0];
                            if (nx) nx.lord = true;
                          }
                          s2.chronicle.push({ y: s2.year, m: s2.month,
                            text: `${r.head.name}が${dest.name}の本陣を衝き、${t2.name}を討ち取った。` });
                        }
                        return s2;
                      });
                    }
                    startBattle(army, dest, camp, { done: true, hit, head: r.head, target: r.target, atkIsPlayer });
                  }}>本陣を衝く</button>
                  <button className="btn" onClick={() => {
                    const { army, dest, camp } = raid;
                    setRaid(null);
                    startBattle(army, dest, camp, null);
                  }}>正面から当たる</button>
                </div>
              </div>
            </div>
          );
        })()}
        {g.warSettle && (() => {
          const ws = g.warSettle;
          /* 列の先頭から順に問う。ただし、もう盤にいない者は飛ばす。
             討死した者や、別のところで始末のついた者が先頭に残っていると、
             かつては「すべて片づいた」と見なして問いそのものを閉じてしまい、
             残る家臣の身の振り方を問えなくなっていた。 */
          const 残り = ws.queue.filter((id) => g.generals.some((x) => x.id === id));
          const gen = g.generals.find((x) => x.id === 残り[0]);
          const lord = ws.lordId ? g.generals.find((x) => x.id === ws.lordId) : null;
          const fname = (g.factions[ws.faction] || {}).name || "";
          if (gen && 残り.length !== ws.queue.length) {
            // 欠けた者を落として組み直す。次の描き直しで先頭から問う。
            setG((p2) => ({ ...p2, warSettle: { ...p2.warSettle, queue: 残り } }));
            return null;
          }
          if (!gen) {
            // すべて片づいた。滅亡を知らせて政務へ戻る。
            setG((p2) => {
              const s2 = structuredClone(p2);
              s2.warSettle = null;
              s2.chronicle.push({ y: s2.year, m: s2.month, text: `${fname}は最後の城を失い、滅亡した。` });
              s2.monthEvents = [...(s2.monthEvents || []), `${fname}を滅ぼした。`];
              s2.msg = `${fname}は滅亡した。`;
              return s2;
            });
            return null;
          }
          const isLord = gen.id === ws.lordId;
          const rec = isLord
            ? { ok: false, why: `${fname}を背負った当主。降って人に仕える身ではない` }
            : canRecruit(gen, lord);
          const nextOne = (s2) => {
            s2.warSettle = { ...s2.warSettle, queue: s2.warSettle.queue.slice(1) };
            if (!s2.warSettle.queue.length) {
              s2.warSettle = null;
              s2.chronicle.push({ y: s2.year, m: s2.month, text: `${fname}は最後の城を失い、滅亡した。` });
              s2.monthEvents = [...(s2.monthEvents || []), `${fname}を滅ぼした。`];
              s2.msg = `${fname}は滅亡した。`;
            }
          };
          const act2 = (kind) => setG((p2) => {
            const s2 = structuredClone(p2);
            const g2 = s2.generals.find((x) => x.id === gen.id);
            if (!g2) { nextOne(s2); return s2; }
            if (kind === "斬") {
              s2.generals = s2.generals.filter((x) => x.id !== g2.id);
              s2.chronicle.push({ y: s2.year, m: s2.month, text: `${g2.name}は斬られた。` });
            } else if (kind === "捕") {
              takeAsPrisoner(s2, g2, ws.winner, ws.castleId);
              s2.chronicle.push({ y: s2.year, m: s2.month, text: `${g2.name}は捕らわれ、${(s2.castles.find((c2) => c2.id === ws.castleId) || {}).name}に留め置かれた。` });
            } else {
              g2.faction = ws.winner; g2.lord = false; g2.captive = null;
              g2.loyal = loyaltyAfterRecruit(g2); g2.at = ws.castleId;
              s2.chronicle.push({ y: s2.year, m: s2.month, text: `${g2.name}は${s2.factions[ws.winner].name}に仕えた（忠誠${忠誠(g2)}）。` });
            }
            nextOne(s2);
            return s2;
          });
          return (
            <div className="modal">
              <div className="card">
                <div className="mn" style={{ fontSize: 20 }}>{fname}、滅亡</div>
                <div style={{ fontSize: 12, color: U.dim, margin: "6px 0 12px" }}>
                  残る{ws.queue.length}名の身の振り方を定めます。
                </div>
                <div style={{ borderLeft: `3px solid ${isLord ? "#C8A44A" : U.line}`, paddingLeft: 12, marginBottom: 12, lineHeight: 1.9 }}>
                  <b style={{ fontSize: 16 }}>{gen.name}</b>
                  {isLord && <span style={{ color: "#C8A44A", fontSize: 12, marginLeft: 6 }}>【旧当主】</span>}
                  <br />
                  <span className="num" style={{ fontSize: 12, color: U.dim }}>
                    {gen.age}歳／統{gen.lead}・武{gen.valor}・知{gen.wit}・政{gen.gov}
                    {isLord ? `／${fname}当主` : `／旧主への忠誠 ${忠誠(gen)}`}
                  </span>
                  {!rec.ok && rec.why && (
                    <div style={{ fontSize: 12, color: "#B0483C", marginTop: 6 }}>{rec.why}。</div>
                  )}
                  {rec.ok && (
                    <div style={{ fontSize: 12, color: "#3E7A3A", marginTop: 6 }}>
                      召し抱えれば、忠誠{loyaltyAfterRecruit(gen)}にて仕えましょう。
                    </div>
                  )}
                </div>
                {rec.ok && (
                  <button className="btn dark" style={{ width: "100%", marginBottom: 6 }} onClick={() => act2("登")}>召し抱える</button>
                )}
                <div className="g2">
                  <button className="btn" onClick={() => act2("捕")}>捕虜とする</button>
                  <button className="btn" onClick={() => act2("斬")}>斬る</button>
                </div>
                <div style={{ fontSize: 11, color: U.dim, marginTop: 10, lineHeight: 1.7 }}>
                  捕虜とすれば、城の「戦後の始末」で扶持を与え、心を開かせて召し抱える道が開けます。
                </div>
              </div>
            </div>
          );
        })()}
        {g.succession && (() => {
          const su = g.succession;
          const cands = heirCandidates(g, su.dead);
          if (!cands.length) {
            setG((p2) => { const s2 = structuredClone(p2);
              s2.chronicle.push({ y: s2.year, m: s2.month, text: `${su.dead.name}が${su.cause}。跡を継ぐ者なく、家は絶えた。` });
              s2.succession = null; return s2; });
            return null;
          }
          return (
            <div className="modal">
              <div className="card">
                <div className="mn" style={{ fontSize: 20 }}>{su.dead.name}、{su.cause}</div>
                <div style={{ fontSize: 12.5, color: U.dim, margin: "8px 0 12px", lineHeight: 1.8 }}>
                  跡目を定めねばならぬ。<br />
                  <span style={{ fontSize: 11.5 }}>
                    血筋の者が継げば家中は落ち着く。他家の出であれば忠誠が大きく下がり、
                    幼年であればさらに侮られる。
                  </span>
                </div>
                {cands.map(({ gen, blood }) => (
                  <button key={gen.id} className="btn"
                    style={{ width: "100%", textAlign: "left", marginBottom: 6, padding: "9px 12px" }}
                    onClick={() => setG((p2) => {
                      const s2 = structuredClone(p2);
                      const d2 = s2.generals.find((x) => x.id === su.dead.id);
                      succeed(s2, d2 || su.dead, su.cause, gen.id, false);
                      s2.generals = s2.generals.filter((x) => x.id !== su.dead.id);
                      s2.succession = null;
                      return s2;
                    })}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span className="mn" style={{ fontSize: 15 }}>
                        {gen.name}
                        <span style={{ fontSize: 11, color: blood ? "#3E7A3A" : "#B0483C", marginLeft: 8 }}>
                          {blood ? "血筋" : "他家の出"}{gen.age < 16 ? "・幼年" : ""}
                        </span>
                      </span>
                      <span className="num" style={{ fontSize: 11.5, color: U.dim }}>
                        {gen.age}歳／統{gen.lead}・武{gen.valor}・知{gen.wit}・政{gen.gov}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
        {g.promo && <PromotionDialog promo={g.promo} onDone={(name) => setG((p) => {
          const s = structuredClone(p);
          /* 名が定まれば、その者は家中に加わる。これまでは記録に一行残るだけで、
             どこにも仕えぬままであった。取り立てとは、人が増えることである。 */
          const 新 = 取り立てる(s, s.promo, name);
          const 城 = 新 && s.castles.find((c) => c.id === 新.at);
          s.chronicle.push({ y: s.year, m: s.month, text: `${s.promo.oldName}、戦功により正式な武将に列し、${s.promo.lordName}より偏諱を賜って${name}と名乗る。${城 ? `（${城.name}）` : ""}` });
          s.promo = null; return s;
        })} />}
      </div>
    </div>
  );
}

