import { axisOf, fromUV, gateOpenU, gatePos } from "./castleMap.js";
import { KOMA, rot } from "./corps.js";
import { ARM_STATS, BASE, FIELD, FORESTS, HILLS, MARSH, RIVER, WOODS, hasRiver, riverShift } from "./field.js";
import { px, py } from "../data/geo.js";

/* ------------------------------------------------ 敵味方の色（GDD 8.10）

   家の色をそのまま使うと、戦場でどちらが自軍か咄嗟に判らない。
   織田は藍、織田大和守も藍、というように、隣り合う家ほど色が似ているためである。

   そこで味方は藍に、敵は朱に寄せ、そのうえで家の色をわずかに混ぜて家の別も残す。
   十人駒だけでなく、隊の輪郭も、馬印も、足元の印も、伏兵の輪も、すべてこの色で描く。
   一つでも家の色のままだと、そこで敵味方が紛れる。 */
const MY_HUE = "#2F5D8C", FOE_HUE = "#B0483C";

/* 濃淡をつける。#rrggbb を受けて #rrggbb を返す。

   core/util.js の shade は rgb(…) 形の字を返す。あれは canvas に一度渡すだけなら
   よいが、二度目を通すと読めずに真っ黒になる。実際、十人駒はその黒で塗られていた。
   （shade(side) で bright を作り、その bright をもう一度 shade に通していた。）
   隊の輪郭では色の後ろに "22" のような透けの二桁を継ぎ足すので、
   ここは十六進の形のまま持ち回らねばならない。 */
function shadeHex(hex, k) {
  if (typeof hex !== "string" || hex[0] !== "#" || hex.length < 7) return hex;
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  if (v.some((x) => Number.isNaN(x))) return hex;
  const f = (x) => Math.max(0, Math.min(255, Math.round(k < 0 ? x * (1 + k) : x + (255 - x) * k)));
  return "#" + v.map((x) => f(x).toString(16).padStart(2, "0")).join("");
}

function toward(hex, tgt, w) {
  if (typeof hex !== "string" || hex.length < 7) return hex;
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(tgt.slice(i, i + 2), 16));
  if (a.some((v) => Number.isNaN(v))) return hex;
  return "#" + a.map((v, i) => Math.round(v * (1 - w) + b[i] * w)
    .toString(16).padStart(2, "0")).join("");
}
/* 家の色を、自軍なら藍へ、敵軍なら朱へ寄せる。盤の駒も、上部の目印も同じ色にする。

   家の色みを二割八分も残していたころは、藍の家が敵にまわると #8c4e52 という
   濁った小豆色になり、朱に見えなかった。隣り合う家ほど色が似ているので、
   これでは敵味方を色で判ずるという狙いが立たない。

   いまは色みをほぼ藍と朱に決め、家の別は「明るさ」だけで残す。
   同じ側に二家並んでも濃淡で見分けられるし、藍と朱の別は濁らない。 */
export const sideHue = (color, mine) => {
  const base = toward(color, mine ? MY_HUE : FOE_HUE, 0.9);
  if (typeof color !== "string" || color.length < 7) return base;
  const v = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  if (v.some((x) => Number.isNaN(x))) return base;
  const 明るさ = (v[0] * 0.30 + v[1] * 0.59 + v[2] * 0.11) / 255;   // 0〜1
  return shadeHex(base, (明るさ - 0.45) * 0.36);                     // ±一割五分ほど
};
export const sideColor = (c) => sideHue(c.color, c.side === "P");

/* ------------------------------------------------------------ 家紋
   図案は輪郭で描く。城の丸の中に収まる大きさで、勢力の色で塗る。 */
export function drawMon(ctx, kind, x, y, r, col, sub) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(0.8, r * 0.13);
  const circle = (cx, cy, rr, fill) => {
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7);
    if (fill) ctx.fill(); else ctx.stroke();
  };
  const petal = (ang, rr, w) => {
    ctx.save(); ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, -rr);
    ctx.quadraticCurveTo(w, -rr * 0.42, 0, 0);
    ctx.quadraticCurveTo(-w, -rr * 0.42, 0, -rr);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  if (kind === "木瓜") {                       // 織田・織田庶家
    for (let i = 0; i < 5; i++) petal((i * Math.PI * 2) / 5, r * 0.92, r * 0.42);
    ctx.fillStyle = sub || "#fff"; circle(0, 0, r * 0.26, true);
  } else if (kind === "二頭波") {              // 斎藤（撫子を模す）
    for (let i = 0; i < 4; i++) petal((i * Math.PI * 2) / 4 + Math.PI / 4, r * 0.95, r * 0.5);
    ctx.fillStyle = sub || "#fff"; circle(0, 0, r * 0.24, true);
  } else if (kind === "赤鳥") {                // 今川
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.5); ctx.lineTo(0, -r * 0.85); ctx.lineTo(r * 0.7, r * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = sub || "#fff";
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.28); ctx.lineTo(0, -r * 0.3); ctx.lineTo(r * 0.3, r * 0.28);
    ctx.closePath(); ctx.fill();
  } else if (kind === "四つ菱") {              // 武田
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      ctx.beginPath();
      ctx.moveTo(dx * r * 0.5, dy * r * 0.5 - r * 0.4 * Math.abs(dy) - r * 0.28 * Math.abs(dx) * 0);
      const cx = dx * r * 0.48, cy = dy * r * 0.48;
      ctx.moveTo(cx, cy - r * 0.4); ctx.lineTo(cx + r * 0.26, cy);
      ctx.lineTo(cx, cy + r * 0.4); ctx.lineTo(cx - r * 0.26, cy);
      ctx.closePath(); ctx.fill();
    }
  } else if (kind === "三鱗") {                // 北条
    for (const [dx, dy] of [[0, -0.42], [-0.42, 0.36], [0.42, 0.36]]) {
      ctx.beginPath();
      ctx.moveTo(dx * r, dy * r - r * 0.34);
      ctx.lineTo(dx * r + r * 0.36, dy * r + r * 0.3);
      ctx.lineTo(dx * r - r * 0.36, dy * r + r * 0.3);
      ctx.closePath(); ctx.fill();
    }
  } else if (kind === "葵") {                  // 松平
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.rotate((i * Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.22);
      ctx.bezierCurveTo(r * 0.55, -r * 0.9, r * 0.62, -r * 0.2, 0, -r * 0.22);
      ctx.bezierCurveTo(-r * 0.62, -r * 0.2, -r * 0.55, -r * 0.9, 0, -r * 0.22);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  } else if (kind === "三つ盛") {              // 浅井・六角など
    for (const [dx, dy] of [[0, -0.44], [-0.42, 0.34], [0.42, 0.34]]) circle(dx * r, dy * r, r * 0.34, true);
  } else if (kind === "笹") {                  // 朝倉（三つ盛木瓜を簡略）
    for (const [dx, dy] of [[0, -0.42], [-0.4, 0.32], [0.4, 0.32]]) {
      ctx.save(); ctx.translate(dx * r, dy * r);
      for (let i = 0; i < 4; i++) petal((i * Math.PI * 2) / 4, r * 0.34, r * 0.17);
      ctx.restore();
    }
  } else if (kind === "月") {                  // 北畠（九曜を模す）
    circle(0, 0, r * 0.32, true);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      circle(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66, r * 0.17, true);
    }
  } else if (kind === "丸に十") {              // 水野・神戸など
    circle(0, 0, r * 0.82, false);
    ctx.lineWidth = Math.max(1, r * 0.2);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.5);
    ctx.moveTo(-r * 0.5, 0); ctx.lineTo(r * 0.5, 0); ctx.stroke();
  } else if (kind === "鶴") {                  // 村上・姉小路など
    circle(0, 0, r * 0.82, false);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.46); ctx.lineTo(r * 0.4, r * 0.34); ctx.lineTo(-r * 0.4, r * 0.34);
    ctx.closePath(); ctx.fill();
  } else if (kind === "抱き沢瀉") {            // 九鬼・若狭武田など
    petal(0, r * 0.9, r * 0.34);
    petal(Math.PI * 0.72, r * 0.66, r * 0.26);
    petal(-Math.PI * 0.72, r * 0.66, r * 0.26);
  } else if (kind === "輪宝") {                // 一向衆・寺社
    circle(0, 0, r * 0.78, false);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
      ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
      ctx.stroke();
    }
    circle(0, 0, r * 0.24, true);
  } else {                                     // 定めのない家は丸
    circle(0, 0, r * 0.7, true);
  }
  ctx.restore();
}


// 10人駒。兵科は色ではなく形で示し、先端で向きが分かるようにする（GDD 8.1）
/* 兵科ごとの駒の形（GDD 8.10）
   槍は矢羽根、弓は細身の三日月、鉄砲は前が広い台形、
   騎馬は後ろが二股に割れた菱形、船は舟形。
   いずれも前が尖り、向きが判るようにしてある。
   濃さの序列は 騎馬＞鉄砲＞槍＞弓。遠目に騎馬の重みが出る。 */
export const KOMA_SHAPE = {
  yari:  [[9, 0], [-2, 2.6], [-5, 0], [-2, -2.6]],
  yumi:  [[6.4, 0], [-1.6, 2.3], [-4.2, 1.6], [-1, 0], [-4.2, -1.6], [-1.6, -2.3]],
  teppo: [[6, 3.0], [6, -3.0], [-4, -2.0], [-4, 2.0]],
  kiba:  [[12, 0], [1, 4.2], [-4, 2.0], [-8, 3.4], [-5, 0], [-8, -3.4], [-4, -2.0], [1, -4.2]],
  fune:  [[11, 0], [5, 4.4], [-7, 4.0], [-8.5, 0], [-7, -4.0], [5, -4.4]],
};

export function drawKoma(ctx, x, y, f, type, fill, stroke, k) {
  const m = (k || 1) * 0.46;                 // 従来の大きさに合わせる
  const pts = KOMA_SHAPE[type] || KOMA_SHAPE.yari;
  const cs = Math.cos(f), sn = Math.sin(f);
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const px = x + (pts[i][0] * cs - pts[i][1] * sn) * m;
    const py = y + (pts[i][0] * sn + pts[i][1] * cs) * m;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 0.7; ctx.stroke();
}


// 地形の輪郭を少しだけ崩す。判定の円より内側にしか出ないので、見た目と当たりはずれない。
export function blobPath(ctx, o, tight) {
  const n = 14;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const w = 0.86 + 0.14 * Math.sin(a * 3 + o.x * 0.03) * Math.cos(a * 2 + o.y * 0.02);
    const r = o.r * (tight ? w * 0.97 : w);
    const x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function drawFieldTerrain(ctx) {
  ctx.fillStyle = "#CBD8AC"; ctx.fillRect(0, 0, FIELD.w, FIELD.h);
  ctx.strokeStyle = "rgba(120,130,90,0.09)"; ctx.lineWidth = 1;
  for (let x = 0; x < FIELD.w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.h); ctx.stroke(); }
  for (let y = 0; y < FIELD.h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.w, y); ctx.stroke(); }

  for (const h of HILLS) {
    ctx.fillStyle = "#BCCB93"; blobPath(ctx, h); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1.2;
    for (const k of [0.68, 0.36]) { blobPath(ctx, { x: h.x, y: h.y, r: h.r * k }); ctx.stroke(); }
    ctx.fillStyle = "rgba(85,105,65,0.8)"; ctx.font = "15px 'Hiragino Mincho ProN',serif";
    ctx.fillText("丘", h.x - 7, h.y + 5);
  }
  for (const m of MARSH) {
    ctx.fillStyle = "#A8C0A4"; blobPath(ctx, m); ctx.fill();
    ctx.strokeStyle = "rgba(90,130,140,0.55)"; ctx.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399, r = m.r * Math.sqrt((i + 0.5) / 26) * 0.9;
      const tx = m.x + Math.cos(a) * r, ty = m.y + Math.sin(a) * r;
      ctx.beginPath(); ctx.moveTo(tx, ty + 4); ctx.lineTo(tx, ty - 5); ctx.stroke();
    }
    ctx.fillStyle = "rgba(60,90,90,0.85)"; ctx.font = "14px 'Hiragino Mincho ProN',serif";
    ctx.fillText("湿地", m.x - 14, m.y + 5);
  }
  const trees = (f, fill, tone, n, label) => {
    ctx.fillStyle = fill; blobPath(ctx, f); ctx.fill();
    ctx.fillStyle = tone;
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, r = f.r * Math.sqrt((i + 0.5) / n) * 0.92;
      const tx = f.x + Math.cos(a) * r, ty = f.y + Math.sin(a) * r;
      ctx.beginPath(); ctx.moveTo(tx, ty - 8); ctx.lineTo(tx + 5.5, ty + 4); ctx.lineTo(tx - 5.5, ty + 4); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "rgba(45,70,40,0.75)"; ctx.font = "14px 'Hiragino Mincho ProN',serif";
    ctx.fillText(label, f.x - (label.length * 7), f.y + 5);
  };
  for (const f of FORESTS) trees(f, "#8EAD6F", "#5F8449", 34, "森");
  for (const f of WOODS) trees(f, "#A9C288", "#7A9A5E", 14, "林");

  if (hasRiver()) {
    const band = (x) => [RIVER.top + riverShift(x), RIVER.bot + riverShift(x)];
    const strip = (x0, x1, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 6) { const [t] = band(x); if (x === x0) ctx.moveTo(x, t); else ctx.lineTo(x, t); }
      for (let x = x1; x >= x0; x -= 6) { const [, bt] = band(x); ctx.lineTo(x, bt); }
      ctx.closePath(); ctx.fill();
    };
    strip(0, FIELD.w, "#8FB4C7");                                   // 深い川
    strip(RIVER.ford[0], RIVER.ford[1], "#AECBD8");                 // 浅瀬
    // 橋は板を渡す
    const [bt0, bb0] = band((RIVER.bridge[0] + RIVER.bridge[1]) / 2);
    ctx.fillStyle = "#C6A377";
    ctx.fillRect(RIVER.bridge[0], bt0 - 6, RIVER.bridge[1] - RIVER.bridge[0], bb0 - bt0 + 12);
    ctx.fillStyle = "rgba(120,90,60,0.5)";
    for (let x = RIVER.bridge[0]; x < RIVER.bridge[1]; x += 13) ctx.fillRect(x, bt0 - 6, 2, bb0 - bt0 + 12);
    ctx.fillStyle = "rgba(60,80,95,0.85)"; ctx.font = "13px 'Hiragino Mincho ProN',serif";
    ctx.fillText("橋", (RIVER.bridge[0] + RIVER.bridge[1]) / 2 - 8, bt0 - 12);
    const [ft0] = band((RIVER.ford[0] + RIVER.ford[1]) / 2);
    ctx.fillText("浅瀬", (RIVER.ford[0] + RIVER.ford[1]) / 2 - 16, ft0 - 12);
    const [dt0] = band(60);
    ctx.fillText("深い川", 60, dt0 - 12);
  }
}


export function drawCastleTerrain(ctx, m) {
  const t = m.t, cx = m.cx, cy = m.cy;
  ctx.fillStyle = "#CBD8AC"; ctx.fillRect(0, 0, FIELD.w, FIELD.h);
  ctx.strokeStyle = "rgba(120,130,90,0.09)"; ctx.lineWidth = 1;
  for (let x = 0; x < FIELD.w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.h); ctx.stroke(); }
  for (let y = 0; y < FIELD.h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.w, y); ctx.stroke(); }

  const o = m.layers[0], band = m.moat.band;
  const tone4 = ["#C6D2A8", "#C0CDA0", "#BACA98", "#B4C592"];
  // 堀。虎口の外側を回す。
  const ob = o.masu + t + 8;
  ctx.fillStyle = "#8FB4C7";
  ctx.fillRect(cx - o.hw - t - ob - band, cy - o.hh - t - ob - band,
    (o.hw + t + ob + band) * 2, (o.hh + t + ob + band) * 2);
  ctx.fillStyle = "#CBD8AC";
  ctx.fillRect(cx - o.hw - t - ob, cy - o.hh - t - ob, (o.hw + t + ob) * 2, (o.hh + t + ob) * 2);
  // 各門の土橋
  ctx.fillStyle = "#C6A377";
  for (const g of o.gates) {
    const a = axisOf(o, g);
    const u0 = gateOpenU(g) - g.w * 0.8, v0 = (a.along === "x" ? o.hh : o.hw) + t + ob;
    if (a.along === "x") ctx.fillRect(cx + u0, a.sgn > 0 ? cy + v0 : cy - v0 - band, g.w * 1.6, band);
    else ctx.fillRect(a.sgn > 0 ? cx + v0 : cx - v0 - band, cy + u0, band, g.w * 1.6);
  }

  m.layers.forEach((l, i) => {
    ctx.fillStyle = tone4[Math.min(3, Math.round((i / Math.max(1, m.layers.length - 1)) * 3))];
    ctx.fillRect(cx - l.hw, cy - l.hh, l.hw * 2, l.hh * 2);
    // 城壁（門の分を抜く）
    const x0 = cx - l.hw - t, x1 = cx + l.hw + t, y0 = cy - l.hh - t, y1 = cy + l.hh + t;
    ctx.fillStyle = "#AFA895";
    for (const face of ["S", "N", "E", "W"]) {
      const gs = l.gates.filter((g) => g.face === face).sort((p1, p2) => p1.off - p2.off);
      const horiz = face === "S" || face === "N";
      const fixed = face === "S" ? y1 - t : face === "N" ? y0 : face === "E" ? x1 - t : x0;
      let cur = horiz ? x0 : y0;
      const end = horiz ? x1 : y1;
      for (const g of gs) {
        const wid = g.w + (g.broken ? 20 : 0);
        const c0 = (horiz ? cx : cy) + g.off - wid / 2;
        if (horiz) ctx.fillRect(cur, fixed, Math.max(0, c0 - cur), t);
        else ctx.fillRect(fixed, cur, t, Math.max(0, c0 - cur));
        cur = c0 + wid;
      }
      if (horiz) ctx.fillRect(cur, fixed, Math.max(0, end - cur), t);
      else ctx.fillRect(fixed, cur, t, Math.max(0, end - cur));
    }
    ctx.strokeStyle = "rgba(90,86,74,0.55)"; ctx.lineWidth = 1;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    // 門と虎口
    for (const g of l.gates) {
      const a = axisOf(l, g);
      const gp = gatePos(m, l, g);
      const along = a.along === "x";
      if (g.broken) {
        // 破れた門は虎口ごと崩れ、瓦礫だけが残る
        ctx.fillStyle = "rgba(150,140,120,0.45)";
        for (let k = 0; k < 9; k++) {
          const q = fromUV(m, a, g.off + ((k * 17) % 23) - 11, a.half + t + 6 + Math.floor(k / 3) * (g.masu / 2.6));
          ctx.fillRect(q.x - 3, q.y - 3, 6, 5);
        }
        continue;
      }
      ctx.fillStyle = "#8C6A45";
      if (along) ctx.fillRect(gp.x - g.w / 2, gp.y - (t + 4) / 2, g.w, t + 4);
      else ctx.fillRect(gp.x - (t + 4) / 2, gp.y - g.w / 2, t + 4, g.w);
      const bp = fromUV(m, a, g.off, a.half + t + 9);
      const r = g.hp / g.max;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      if (along) ctx.fillRect(bp.x - g.w / 2, bp.y - 2, g.w, 4); else ctx.fillRect(bp.x - 2, bp.y - g.w / 2, 4, g.w);
      ctx.fillStyle = r > 0.5 ? "#5C8C4A" : r > 0.22 ? "#C89A3A" : "#B0483C";
      if (along) ctx.fillRect(bp.x - g.w / 2, bp.y - 2, g.w * r, 4); else ctx.fillRect(bp.x - 2, bp.y - g.w / 2, 4, g.w * r);
      // 虎口の袖壁と正面壁
      const put = (u, v, wu, wv) => {
        const q = fromUV(m, a, u, v);
        if (along) ctx.fillRect(q.x - wu / 2, a.sgn > 0 ? q.y : q.y - wv, wu, wv);
        else ctx.fillRect(a.sgn > 0 ? q.x : q.x - wv, q.y - wu / 2, wv, wu);
      };
      ctx.fillStyle = "#AFA895";
      put(g.off - g.w / 2, a.half + t, t, g.masu);
      put(g.off + g.w / 2, a.half + t, t, g.masu);
      const gL = g.off - g.w / 2, gR = g.off + g.w / 2;
      const from = g.open > 0 ? gR - g.w * 0.1 : gL - g.w * 0.9;
      const seg = (u0, u1) => { if (u1 > u0) put((u0 + u1) / 2, a.half + t + g.masu, u1 - u0, t); };
      seg(g.off - g.w * 1.05, from); seg(from + g.w, g.off + g.w * 1.05);
      const lp = fromUV(m, a, g.off, a.half + t + g.masu + 17);
      ctx.fillStyle = "rgba(70,66,58,0.8)"; ctx.font = `${Math.round(11 * (FIELD.w / BASE.w))}px sans-serif`;
      ctx.fillText(g.name, lp.x - g.name.length * 5.5, lp.y + 4);
    }
    ctx.fillStyle = "rgba(70,72,58,0.75)"; ctx.font = "15px 'Hiragino Mincho ProN',serif";
    ctx.fillText(l.name, cx - l.hw + 10, cy - l.hh + 22);
  });
  // 施設。崩れたものは瓦礫にする。
  for (const f of m.fac) {
    if (f.hp <= 0) {
      ctx.fillStyle = "rgba(150,140,120,0.4)";
      for (let k = 0; k < 7; k++) {
        const ang = k * 2.4, r = f.r * 0.8 * (((k % 3) + 1) / 3);
        ctx.fillRect(f.x + Math.cos(ang) * r - 3, f.y + Math.sin(ang) * r - 3, 7, 5);
      }
      continue;
    }
    ctx.fillStyle = f.kind === "矢倉" ? "#9C9483" : "#B08A5A";
    ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    ctx.strokeStyle = "rgba(70,66,58,0.65)"; ctx.lineWidth = 1;
    ctx.strokeRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(f.x - f.r, f.y + f.r + 2, f.r * 2, 3);
    ctx.fillStyle = f.hp / f.max > 0.5 ? "#5C8C4A" : f.hp / f.max > 0.25 ? "#C89A3A" : "#B0483C";
    ctx.fillRect(f.x - f.r, f.y + f.r + 2, f.r * 2 * (f.hp / f.max), 3);
    if (f.r > 10) {
      ctx.fillStyle = "rgba(60,58,50,0.85)"; ctx.font = `${Math.round(9 * (FIELD.w / BASE.w))}px sans-serif`;
      ctx.fillText(f.kind === "矢倉" ? "矢" : "鐘", f.x - f.r * 0.35, f.y + f.r * 0.35);
    }
  }
  ctx.fillStyle = "rgba(60,80,95,0.8)"; ctx.font = "14px 'Hiragino Mincho ProN',serif";
  ctx.fillText("堀", cx - o.hw - t - o.masu - band / 2 - 7, cy);
}


// 布陣できる範囲。攻め口の方角と、寄せ手か守り手かで決まる。
export function ownZone(b) {
  const face = b.face || "S", far = !!b.myFar;
  // 寄せ手は遠い側、守り手は近い側から入る。攻め口の方角で自陣が変わる。
  const vertical = face === "N" || face === "S";
  if (vertical) {
    const bottom = face === "S" ? far : !far;
    return bottom
      ? { x: 0, y: FIELD.h * 0.6, w: FIELD.w, h: FIELD.h * 0.4, vertical: true, bottom: true }
      : { x: 0, y: 0, w: FIELD.w, h: FIELD.h * 0.4, vertical: true, bottom: false };
  }
  const right = face === "E" ? far : !far;
  return right
    ? { x: FIELD.w * 0.6, y: 0, w: FIELD.w * 0.4, h: FIELD.h, vertical: false, bottom: true }
    : { x: 0, y: 0, w: FIELD.w * 0.4, h: FIELD.h, vertical: false, bottom: false };
}


export const inOwnZone = (b, x, y) => {
  const z = ownZone(b);
  return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
};



export function drawBattle(ctx, b, sel, terrainCanvas, cam, W, H, dpr, selAll) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const S = (wx, wy) => [(wx - cam.x) * cam.s + W / 2, (wy - cam.y) * cam.s + H / 2];

  ctx.save();
  ctx.translate(W / 2 - cam.x * cam.s, H / 2 - cam.y * cam.s);
  ctx.scale(cam.s, cam.s);
  ctx.drawImage(terrainCanvas, 0, 0);

  // 布陣段階は自陣の範囲を示す
  if (b.phase === "deploy") {
    const z = ownZone(b);
    ctx.fillStyle = "rgba(47,93,140,0.07)";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = "rgba(47,93,140,0.35)"; ctx.setLineDash([8, 6]); ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (z.vertical) {
      const ly = z.bottom ? z.y : z.y + z.h;
      ctx.moveTo(0, ly); ctx.lineTo(FIELD.w, ly);
    } else {
      const lx = z.bottom ? z.x : z.x + z.w;
      ctx.moveTo(lx, 0); ctx.lineTo(lx, FIELD.h);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // LOD：近距離＝10人駒、中距離＝50人組、遠距離＝武将隊（GDD 8.10）
  const lod = cam.s >= 0.55 ? "koma" : cam.s >= 0.3 ? "squad" : "corps";
  const shown = b.corps.filter((c) => !c.dead);
  for (const c of shown) {
    const isP = c.side === "P";
    if (c.destroyed) continue;
    if (!isP && !c.seen && b.phase === "fight") continue;
    if (c.ambush && !c.revealed && !isP) continue;
    const live = c.squads.filter((q) => q.men > 0);
    if (!live.length) continue;
    // 敵味方の色。輪郭から駒まで、この色で通す（家の色をそのまま使わない）。
    const side = sideColor(c);

    // 隊の輪郭。まとまりが一目で分かるようにする。
    const xs = live.map((q) => q.x), ys = live.map((q) => q.y);
    const x0 = Math.min(...xs) - 12, x1 = Math.max(...xs) + 12;
    const y0 = Math.min(...ys) - 12, y1 = Math.max(...ys) + 12;
    const on = sel === c.id || selAll;
    const rr = 10;
    ctx.beginPath();
    ctx.moveTo(x0 + rr, y0);
    ctx.arcTo(x1, y0, x1, y1, rr); ctx.arcTo(x1, y1, x0, y1, rr);
    ctx.arcTo(x0, y1, x0, y0, rr); ctx.arcTo(x0, y0, x1, y0, rr);
    ctx.closePath();
    ctx.fillStyle = side + (on ? "4A" : isP ? "22" : "14");
    ctx.fill();
    if (!isP) {                       // 敵の隊は斜線で塗り分ける（色に頼らない識別）
      ctx.save(); ctx.clip();
      ctx.strokeStyle = side + "3A"; ctx.lineWidth = 1.4 / cam.s;
      for (let hx = x0 - (y1 - y0); hx < x1; hx += 9) {
        ctx.beginPath(); ctx.moveTo(hx, y1); ctx.lineTo(hx + (y1 - y0), y0); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.strokeStyle = on ? side : side + (isP ? "66" : "99");
    ctx.lineWidth = (on ? 3.4 : isP ? 1.6 : 2.2) / cam.s;
    if (!isP && !on) ctx.setLineDash([7 / cam.s, 5 / cam.s]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (lod === "corps") continue;

    const bright = shadeHex(side, isP ? 0.18 : 0.16), dark = shadeHex(side, isP ? -0.30 : -0.22);
    const edge = isP ? "rgba(255,255,255,0.95)" : "rgba(28,26,22,0.85)";
    const edge2 = isP ? "rgba(20,20,18,0.55)" : "rgba(28,26,22,0.9)";
    if (lod === "squad") {
      for (const q of live) {
        const fill = q.origin === "直属" ? bright : dark;
        const size = 3.2 + (q.men / 50) * 4.2;
        drawKoma(ctx, q.x, q.y, q.facing, q.type, fill,
          q.origin === "直属" ? edge : edge2, size / 4.8);
        if (ARM_STATS[q.type].range > 0) {
          ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(q.x, q.y, size * 0.75, 0, 7); ctx.stroke();
        }
      }
      continue;
    }
    for (const q of live) {
      const rows = Math.ceil(Math.ceil(q.men / 10) / 5);
      const hw = 2 * KOMA + 4, d0 = -4, d1 = (rows - 1) * KOMA + 4;
      const pts = [[-hw, d0], [hw, d0], [hw, d1], [-hw, d1]].map(([a, bb]) => {
        const [ox, oy] = rot(a, bb, q.facing); return [q.x + ox, q.y + oy];
      });
      ctx.fillStyle = q.reserve ? side + "12" : side + "26";
      ctx.beginPath();
      pts.forEach((pt, i) => (i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])));
      ctx.closePath(); ctx.fill();
    }
    // 噛み合っている組どうしを短い線でつなぐ。どの50人が誰と戦っているかが分かる。
    if (lod === "koma" || lod === "squad") {
      ctx.lineCap = "round";
      for (const q of live) {
        if (q.link) {
          ctx.strokeStyle = "rgba(40,36,28,0.42)"; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.link.x, q.link.y); ctx.stroke();
          const mx = (q.x + q.link.x) / 2, my = (q.y + q.link.y) / 2;
          const ang = Math.atan2(q.link.y - q.y, q.link.x - q.x) + Math.PI / 2;
          ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(mx + Math.cos(ang) * 3.4, my + Math.sin(ang) * 3.4);
          ctx.lineTo(mx - Math.cos(ang) * 3.4, my - Math.sin(ang) * 3.4);
          ctx.stroke();
        } else if (q.aim && b.t - q.aim.t < 1.6 && (sel === c.id || selAll)) {
          ctx.strokeStyle = side + "44"; ctx.lineWidth = 0.8;
          ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.aim.x, q.aim.y); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    for (const q of live) {
      const n = Math.ceil(q.men / 10);
      const dis = q.dis || 0;
      const fill = shadeHex(q.origin === "直属" ? bright : dark, on ? 0.16 : 0);
      const stroke = q.origin === "直属" ? edge : edge2;
      const jit = Math.pow(dis, 1.8) * 2.2;                  // 位置の乱れ（控えめ）
      const spread = dis > 0.62 ? (dis - 0.62) * 2.6 : 0;    // 相当低いときだけ向きが乱れる
      for (let i = 0; i < n; i++) {
        const h1 = Math.sin(q.seed + i * 12.9898), h2 = Math.cos(q.seed + i * 78.233);
        const [ox, oy] = rot(((i % 5) - 2) * KOMA + h1 * jit, Math.floor(i / 5) * KOMA + h2 * jit, q.facing);
        drawKoma(ctx, q.x + ox, q.y + oy, q.facing + h1 * spread * 2.0, q.type, fill, stroke, 1);
      }
      if (q.origin === "直属") {           // 直属家臣団は小旗を立てる（GDD 6.3）
        const [fx, fy] = rot(-2 * KOMA - 3, -3, q.facing);
        const bx = q.x + fx, by = q.y + fy;
        ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 8); ctx.stroke();
        ctx.fillStyle = bright;
        ctx.beginPath(); ctx.moveTo(bx, by - 8); ctx.lineTo(bx + 5, by - 6.2); ctx.lineTo(bx, by - 4.4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.stroke();
      }
    }
  }
  // 戦いの気配。短く消える細い線と火花だけで、駒を隠さない。
  if (b.fx && b.fx.length) {
    for (const f of b.fx) {
      const a = 1 - f.t / f.life;
      if (f.k === "arrow") {
        ctx.globalAlpha = a * 0.5;
        ctx.strokeStyle = "#5A5238"; ctx.lineWidth = 0.7;
        const u = Math.min(1, f.t / f.life * 1.6);
        const hx = f.x + (f.x2 - f.x) * u, hy = f.y + (f.y2 - f.y) * u;
        const tx = f.x + (f.x2 - f.x) * Math.max(0, u - 0.22), ty = f.y + (f.y2 - f.y) * Math.max(0, u - 0.22);
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      } else if (f.k === "shot") {
        ctx.globalAlpha = a * 0.75;
        ctx.strokeStyle = "#FFF4D8"; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
        ctx.globalAlpha = a * 0.4;
        ctx.fillStyle = "#EFE9DC";
        ctx.beginPath(); ctx.arc(f.x, f.y, 3 + (1 - a) * 5, 0, 7); ctx.fill();
      } else if (f.k === "clash") {
        ctx.globalAlpha = a * 0.9;
        ctx.strokeStyle = f.big ? "#E8B24A" : "#FFFFFF";
        ctx.lineWidth = f.big ? 1.4 : 1;
        const r = (f.big ? 5 : 3.5) + (1 - a) * 4;
        for (let k = 0; k < 3; k++) {
          const ang = f.x * 0.7 + f.y * 1.3 + k * 2.1;
          ctx.beginPath();
          ctx.moveTo(f.x + Math.cos(ang) * r * 0.4, f.y + Math.sin(ang) * r * 0.4);
          ctx.lineTo(f.x + Math.cos(ang) * r, f.y + Math.sin(ang) * r);
          ctx.stroke();
        }
      } else if (f.k === "dust") {
        ctx.globalAlpha = a * 0.28;
        ctx.fillStyle = "#B9A98A";
        ctx.beginPath(); ctx.arc(f.x, f.y, 4 + (1 - a) * 9, 0, 7); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // 標識・文字は画面座標で描く
  for (const c of shown) {
    const isP = c.side === "P";
    const side = sideColor(c);          // 馬印も足元の印も、敵味方の色で描く
    // 武将は隊の後ろ寄りに描く（c.gx/c.gy が算出済みならそこへ）
    const [x, y] = S(c.gx == null ? c.x : c.gx, c.gy == null ? c.y : c.gy);
    if (c.destroyed) {
      ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(x - 26, y - 10, 52, 19);
      ctx.strokeStyle = side; ctx.lineWidth = 1; ctx.strokeRect(x - 26, y - 10, 52, 19);
      ctx.fillStyle = "#8A8478"; ctx.font = "12px sans-serif"; ctx.fillText("壊滅", x - 12, y + 4);
      continue;
    }
    if (!isP && !c.seen && b.phase === "fight") {
      if (c.lastSeen && b.t - c.lastSeen.t < 45) {
        const [lx, ly] = S(c.lastSeen.x, c.lastSeen.y);
        ctx.strokeStyle = side + "88"; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(lx, ly, 28, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = side; ctx.font = "12px sans-serif"; ctx.fillText("敵影", lx - 13, ly + 4);
      }
      continue;
    }
    if (c.ambush && !c.revealed && !isP) continue;

    ctx.globalAlpha = c.routed || c.withdraw ? 0.55 : 1;
    // 武将の居場所は馬印で示す。総大将は旗を二本立て、金の輪をつける。
    const lord = c.gen.lord && !c.detach;
    const H = lord ? 30 : 22;
    ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y - H); ctx.stroke();
    ctx.strokeStyle = "#3A382F"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y - H); ctx.stroke();
    const banner = (top, w2, h2) => {
      ctx.fillStyle = side;
      ctx.fillRect(x + 1, y - top, w2, h2);
      ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y - top, w2, h2);
    };
    banner(H, 11, 8);
    if (lord) banner(H - 10, 11, 8);
    // 足元の駒
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, sel === c.id ? 8 : 6.4, 0, 7); ctx.fill();
    ctx.fillStyle = side; ctx.beginPath(); ctx.arc(x, y, sel === c.id ? 5.6 : 4.2, 0, 7); ctx.fill();
    if (lord) {
      ctx.strokeStyle = "#D8B24A"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.stroke();
    }
    if (sel === c.id || selAll) {
      ctx.fillStyle = side + "33";
      ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill();
      ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.stroke();
      ctx.strokeStyle = side; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.stroke();
      // 向きを示す矢
      const fx2 = x + Math.cos(c.facing) * 24, fy2 = y + Math.sin(c.facing) * 24;
      ctx.strokeStyle = side; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(c.facing) * 15, y + Math.sin(c.facing) * 15); ctx.lineTo(fx2, fy2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx2, fy2);
      ctx.lineTo(fx2 + Math.cos(c.facing + 2.5) * 6, fy2 + Math.sin(c.facing + 2.5) * 6);
      ctx.lineTo(fx2 + Math.cos(c.facing - 2.5) * 6, fy2 + Math.sin(c.facing - 2.5) * 6);
      ctx.closePath(); ctx.fillStyle = side; ctx.fill();
    }
    ctx.globalAlpha = 1;

    const label = c.detach ? `${c.task}${c.autonomous ? "・自律" : ""}` : c.ally ? `${c.name}（${c.ally}）` : c.name;
    ctx.font = c.detach ? "11px 'Hiragino Sans',sans-serif" : "600 13px 'Hiragino Sans',sans-serif";
    const w = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const ly = (c.gen.lord && !c.detach ? 34 : 26) + 14;
    ctx.fillRect(x - w / 2 - 4, y - ly, w + 8, 16);
    ctx.fillStyle = c.detach ? "#5B5850" : "#33332F";
    ctx.fillText(label, x - w / 2, y - ly + 12);

    // 士気（上段）と陣形維持（下段）を分けて示す
    const coh = c.squads.length ? c.squads.reduce((a, q) => a + q.cohesion, 0) / c.squads.length : 0;
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(x - 22, y + 12, 44, 8);
    ctx.fillStyle = c.morale > 55 ? "#5C8C4A" : c.morale > 30 ? "#C89A3A" : "#B0483C";
    ctx.fillRect(x - 22, y + 12, (44 * c.morale) / 100, 4);
    ctx.fillStyle = "#4A6E8A";
    ctx.fillRect(x - 22, y + 16, (44 * coh) / 100, 4);
    if (c.fatigue > 45) {
      ctx.fillStyle = "rgba(154,123,79,0.9)"; ctx.fillRect(x - 22, y + 21, (44 * c.fatigue) / 100, 2);
    }
    const tag = c.routed ? ["敗走", "#B0483C"] : c.withdraw ? ["撤退中", "#7C7668"]
      : c.boxed ? ["密集防御", "#8A6A34"] : c.pinch >= 2 ? ["挟撃", "#B0483C"]
      : c.order === "射撃" ? ["射撃優先", "#4A6E8A"] : null;
    if (tag) { ctx.fillStyle = tag[1]; ctx.font = "11px sans-serif"; ctx.fillText(tag[0], x - tag[0].length * 5.5, y + 34); }
    if (c.ambush && !c.revealed && isP) {
      ctx.strokeStyle = side; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = side; ctx.font = "11px sans-serif"; ctx.fillText("伏兵", x - 11, y + 34);
    }
  }
}

