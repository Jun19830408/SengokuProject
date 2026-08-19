import { axisOf, fromUV, gateOpenU, gatePos } from "./castleMap.js";
import { KOMA, rot } from "./corps.js";
import { ARM_STATS, BASE, FIELD, FORESTS, HILLS, MARSH, RIVER, WOODS, hasRiver, riverShift } from "./field.js";
import { px, py } from "../data/geo.js";
import { VILLAGES } from "./field.js";

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
/* ==========================================================================
   家紋（GDD 13.1）

   はじめは十六の型を百十三家で分け合っていた。三十五家が「三つ盛」、二十家が
   「鶴」、伊達と島津が同じ「丸に十」、尼子が武田菱を掲げていた。
   紋は家の顔である。分かるものは正しく描く。

   ここに置いた型は、史料に残る家紋を写したものである。
   ただし小さな家のいくつかは伝わりが定かでない。それらには家格に見合う
   ありふれた型（引両・巴など）を当てた。確かめのつかぬものを、
   さも確かなように描くわけにもいかない。
   ========================================================================== */
export function drawMon(ctx, kind, x, y, r, col, sub) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(0.8, r * 0.13);
  const 白 = sub || "#fff";
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
  // 菱形ひとつ
  const 菱 = (cx, cy, w, h, fill) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h); ctx.lineTo(cx + w, cy);
    ctx.lineTo(cx, cy + h); ctx.lineTo(cx - w, cy);
    ctx.closePath();
    if (fill === false) ctx.stroke(); else ctx.fill();
  };
  // 引両（横一文字の帯）。本数で家が分かれる
  const 引両 = (n) => {
    circle(0, 0, r * 0.9, false);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, 7); ctx.clip();
    const 幅 = r * (n === 1 ? 0.34 : n === 2 ? 0.24 : 0.18);
    const 間 = r * (n === 1 ? 0 : n === 2 ? 0.42 : 0.5);
    for (let i = 0; i < n; i++) {
      const cy = (i - (n - 1) / 2) * 間;
      ctx.fillRect(-r, cy - 幅 / 2, r * 2, 幅);
    }
    ctx.restore();
  };
  // 目結（四角い升）。四つ目結・平四つ目結
  const 目結 = (平) => {
    const w = r * 0.36, d = 平 ? r * 0.44 : r * 0.42;
    for (const [dx, dy] of 平 ? [[-1, 0], [1, 0], [0, -1], [0, 1]] : [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.save(); ctx.translate(dx * d, dy * d); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-w / 2, -w / 2, w, w);
      ctx.fillStyle = 白; ctx.fillRect(-w * 0.22, -w * 0.22, w * 0.44, w * 0.44);
      ctx.fillStyle = col;
      ctx.restore();
    }
  };
  /* 巴（勾玉が渦を巻く）。三十四家がこれを掲げるので、いちばん形が大事である。
     頭は丸く、尾は細く、中心へ巻き込む。はじめは丸と三角を継いで描いたが、
     勾玉に見えず、団子に棒が刺さったような形になった。一筆で描く。 */
  const 巴 = (n) => {
    for (let i = 0; i < n; i++) {
      ctx.save(); ctx.rotate((i * Math.PI * 2) / n);
      ctx.beginPath();
      // 頭（外側の丸）から
      ctx.arc(0, -r * 0.44, r * 0.31, -Math.PI * 0.5, Math.PI * 0.72);
      // 尾。外を回りながら細くなり、中心へ吸い込まれる
      ctx.bezierCurveTo(r * 0.34, r * 0.16, r * 0.2, r * 0.36, 0, r * 0.3);
      ctx.bezierCurveTo(-r * 0.05, r * 0.2, r * 0.02, r * 0.06, -r * 0.02, -r * 0.06);
      ctx.bezierCurveTo(-r * 0.16, -r * 0.16, -r * 0.29, -r * 0.28, -r * 0.29, -r * 0.44);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  };
  // 星（丸）を並べる
  const 星 = (pts, rr) => { for (const [cx, cy] of pts) circle(cx * r, cy * r, rr * r, true); };

  switch (kind) {
    /* ── 織田・その庶流 */
    case "木瓜":                                   // 織田木瓜
      for (let i = 0; i < 5; i++) petal((i * Math.PI * 2) / 5, r * 0.92, r * 0.42);
      ctx.fillStyle = 白; circle(0, 0, r * 0.26, true);
      break;
    case "横木瓜":                                 // 波多野・由良
      ctx.save(); ctx.scale(1.18, 0.86);
      for (let i = 0; i < 5; i++) petal((i * Math.PI * 2) / 5, r * 0.86, r * 0.4);
      ctx.restore();
      ctx.fillStyle = 白; circle(0, 0, r * 0.24, true);
      break;
    case "三つ盛木瓜":                             // 朝倉
      for (const [dx, dy] of [[0, -0.42], [-0.4, 0.32], [0.4, 0.32]]) {
        ctx.save(); ctx.translate(dx * r, dy * r);
        for (let i = 0; i < 4; i++) petal((i * Math.PI * 2) / 4, r * 0.34, r * 0.17);
        ctx.restore();
      }
      break;

    /* ── 引両。足利とその一門、そして守護の家に多い */
    case "一つ引両": 引両(1); break;
    case "二つ引両": 引両(2); break;              // 足利将軍家・一色・赤松・最上・里見
    case "三つ引両": 引両(3); break;              // 蘆名・成田・吉川

    /* ── 目結。佐々木一門 */
    case "四つ目結": 目結(false); break;          // 六角・京極
    case "平四つ目結": 目結(true); break;         // 尼子・宗

    /* ── 巴 */
    case "三つ巴": 巴(3); break;                  // 宇都宮・小早川・佐野・結城
    case "二つ巴": 巴(2); break;

    /* ── 星と曜 */
    case "一文字三星":                             // 毛利
      星([[0, 0.42], [-0.46, 0.42], [0.46, 0.42]], 0.2);
      ctx.fillRect(-r * 0.62, -r * 0.62, r * 1.24, r * 0.22);
      break;
    case "三つ星": 星([[0, -0.42], [-0.44, 0.34], [0.44, 0.34]], 0.24); break;   // 松浦
    case "月星":                                   // 千葉
      ctx.beginPath();
      ctx.arc(0, r * 0.12, r * 0.62, Math.PI * 0.15, Math.PI * 0.85, true);
      ctx.arc(r * 0.16, r * 0.02, r * 0.5, Math.PI * 0.85, Math.PI * 0.15);
      ctx.closePath(); ctx.fill();
      circle(0, -r * 0.52, r * 0.22, true);
      break;
    case "七曜":                                   // 九鬼
      circle(0, 0, r * 0.28, true);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
        circle(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.2, true);
      }
      break;
    case "九曜":                                   // 細川・長尾
      circle(0, 0, r * 0.3, true);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        circle(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66, r * 0.17, true);
      }
      break;

    /* ── 菱 */
    case "四つ割菱":                               // 武田
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) 菱(dx * r * 0.46, dy * r * 0.46, r * 0.26, r * 0.4);
      break;
    case "割り菱":                                 // 北畠
      菱(0, 0, r * 0.86, r * 0.9, false);
      菱(0, -r * 0.44, r * 0.24, r * 0.34); 菱(0, r * 0.44, r * 0.24, r * 0.34);
      菱(-r * 0.44, 0, r * 0.24, r * 0.34); 菱(r * 0.44, 0, r * 0.24, r * 0.34);
      break;
    case "大内菱":                                 // 大内
      菱(0, 0, r * 0.9, r * 0.92);
      ctx.fillStyle = 白; 菱(0, 0, r * 0.5, r * 0.52);
      ctx.fillStyle = col; 菱(0, 0, r * 0.24, r * 0.26);
      break;
    case "三階菱":                                 // 三好
      菱(0, -r * 0.5, r * 0.3, r * 0.28);
      菱(0, 0, r * 0.5, r * 0.28);
      菱(0, r * 0.5, r * 0.7, r * 0.28);
      break;

    /* ── 草花 */
    case "葵":                                     // 松平（三つ葉葵）
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.rotate((i * Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.22);
        ctx.bezierCurveTo(r * 0.55, -r * 0.9, r * 0.62, -r * 0.2, 0, -r * 0.22);
        ctx.bezierCurveTo(-r * 0.62, -r * 0.2, -r * 0.55, -r * 0.9, 0, -r * 0.22);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      break;
    case "酢漿草":                                 // 長宗我部（七つ酢漿草）
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7;
        ctx.save(); ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.52, r * 0.22, r * 0.34, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.restore();
      }
      circle(0, 0, r * 0.16, true);
      break;
    case "下がり藤":                               // 本願寺
      ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.78); ctx.lineTo(r * 0.6, -r * 0.78); ctx.stroke();
      for (const sgn of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const cx = sgn * (r * 0.2 + i * r * 0.16), cy = -r * 0.5 + i * r * 0.3;
          ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.15, r * 0.24, sgn * 0.4, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    case "梅鉢":                                   // 筒井・相良
      circle(0, 0, r * 0.26, true);
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        circle(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.26, true);
      }
      break;
    case "撫子":                                   // 秋月（三つ撫子）
      for (let i = 0; i < 5; i++) {
        ctx.save(); ctx.rotate((i * Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.9);
        ctx.lineTo(r * 0.16, -r * 0.5); ctx.lineTo(0, -r * 0.62); ctx.lineTo(-r * 0.16, -r * 0.5);
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      circle(0, 0, r * 0.2, true);
      break;
    case "桐":                                     // 山名（五七桐）
      for (const [dx, n, h] of [[-0.44, 3, 0.5], [0, 5, 0.72], [0.44, 3, 0.5]]) {
        for (let i = 0; i < n; i++) {
          const cx = dx * r + (i - (n - 1) / 2) * r * 0.12;
          ctx.beginPath();
          ctx.ellipse(cx, -r * (0.2 + h * 0.5), r * 0.05, r * h * 0.34, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(dx * r, r * 0.34, r * 0.24, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case "沢瀉":                                   // 水野
      petal(0, r * 0.9, r * 0.34);
      petal(Math.PI * 0.72, r * 0.66, r * 0.26);
      petal(-Math.PI * 0.72, r * 0.66, r * 0.26);
      break;
    case "桔梗":                                   // 太田
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a - 0.34) * r * 0.9, Math.sin(a - 0.34) * r * 0.9);
        ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
        ctx.lineTo(Math.cos(a + 0.34) * r * 0.9, Math.sin(a + 0.34) * r * 0.9);
        ctx.closePath(); ctx.fill();
      }
      break;
    case "柏":                                     // 葛西（三つ柏）
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.rotate((i * Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.2);
        ctx.bezierCurveTo(r * 0.4, -r * 0.5, r * 0.36, -r * 0.95, 0, -r * 0.88);
        ctx.bezierCurveTo(-r * 0.36, -r * 0.95, -r * 0.4, -r * 0.5, 0, -r * 0.2);
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      break;
    case "唐花":                                   // 有馬（五瓜に唐花）
      for (let i = 0; i < 5; i++) petal((i * Math.PI * 2) / 5, r * 0.92, r * 0.44);
      ctx.fillStyle = 白; circle(0, 0, r * 0.34, true);
      ctx.fillStyle = col;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI * 2) / 4;
        circle(Math.cos(a) * r * 0.17, Math.sin(a) * r * 0.17, r * 0.11, true);
      }
      break;

    /* ── 器物・鳥獣 */
    case "赤鳥":                                   // 今川
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, r * 0.5); ctx.lineTo(0, -r * 0.85); ctx.lineTo(r * 0.7, r * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 白;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, r * 0.28); ctx.lineTo(0, -r * 0.3); ctx.lineTo(r * 0.3, r * 0.28);
      ctx.closePath(); ctx.fill();
      break;
    case "三つ鱗":                                 // 北条
      for (const [dx, dy] of [[0, -0.42], [-0.42, 0.36], [0.42, 0.36]]) {
        ctx.beginPath();
        ctx.moveTo(dx * r, dy * r - r * 0.34);
        ctx.lineTo(dx * r + r * 0.36, dy * r + r * 0.3);
        ctx.lineTo(dx * r - r * 0.36, dy * r + r * 0.3);
        ctx.closePath(); ctx.fill();
      }
      break;
    case "丸に十":                                 // 島津
      circle(0, 0, r * 0.86, false);
      ctx.lineWidth = Math.max(1, r * 0.2);
      ctx.beginPath(); ctx.moveTo(0, -r * 0.52); ctx.lineTo(0, r * 0.52);
      ctx.moveTo(-r * 0.52, 0); ctx.lineTo(r * 0.52, 0); ctx.stroke();
      break;
    case "扇":                                     // 佐竹（五本骨扇に月丸）
      ctx.beginPath();
      ctx.moveTo(0, r * 0.72);
      ctx.arc(0, r * 0.72, r * 1.4, -Math.PI * 0.78, -Math.PI * 0.22);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 白; ctx.lineWidth = Math.max(0.8, r * 0.1);
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI * 0.78 + (i + 1) * (Math.PI * 0.56 / 5);
        ctx.beginPath(); ctx.moveTo(0, r * 0.72);
        ctx.lineTo(Math.cos(a) * r * 1.4, r * 0.72 + Math.sin(a) * r * 1.4); ctx.stroke();
      }
      ctx.fillStyle = 白; circle(0, -r * 0.24, r * 0.2, true);
      break;
    case "檜扇":                                   // 長野・安東
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * 0.72 + i * (Math.PI * 0.44 / 5);
        ctx.save(); ctx.translate(0, r * 0.6); ctx.rotate(a + Math.PI / 2);
        ctx.fillRect(-r * 0.07, -r * 1.3, r * 0.14, r * 1.3);
        ctx.restore();
      }
      circle(0, r * 0.6, r * 0.14, true);
      break;
    case "折敷に三文字":                           // 河野
      ctx.beginPath();
      ctx.moveTo(-r * 0.82, -r * 0.7); ctx.lineTo(r * 0.82, -r * 0.7);
      ctx.lineTo(r * 0.62, r * 0.78); ctx.lineTo(-r * 0.62, r * 0.78);
      ctx.closePath(); ctx.stroke();
      for (let i = 0; i < 3; i++) ctx.fillRect(-r * 0.4, -r * 0.42 + i * r * 0.38, r * 0.8, r * 0.15);
      break;
    case "日足":                                   // 龍造寺（十二日足）
      circle(0, 0, r * 0.3, true);
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
        ctx.lineTo(Math.cos(a - 0.13) * r * 0.95, Math.sin(a - 0.13) * r * 0.95);
        ctx.lineTo(Math.cos(a + 0.13) * r * 0.95, Math.sin(a + 0.13) * r * 0.95);
        ctx.closePath(); ctx.fill();
      }
      break;
    case "杏葉":                                   // 大友（抱き杏葉）
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.scale(sgn, 1);
        ctx.beginPath();
        ctx.moveTo(r * 0.1, r * 0.72);
        ctx.bezierCurveTo(r * 0.85, r * 0.2, r * 0.7, -r * 0.8, r * 0.06, -r * 0.5);
        ctx.bezierCurveTo(r * 0.34, -r * 0.2, r * 0.3, r * 0.3, r * 0.1, r * 0.72);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      break;
    case "二頭立波":                               // 斎藤（道三）
      for (const dy of [-0.34, 0.3]) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, r * (dy + 0.3));
        ctx.bezierCurveTo(-r * 0.4, r * (dy - 0.5), r * 0.4, r * (dy + 0.5), r * 0.9, r * (dy - 0.3));
        ctx.lineTo(r * 0.9, r * (dy + 0.1));
        ctx.bezierCurveTo(r * 0.4, r * (dy + 0.7), -r * 0.4, r * (dy - 0.3), -r * 0.9, r * (dy + 0.5));
        ctx.closePath(); ctx.fill();
      }
      break;
    case "竹に雀":                                 // 伊達・上杉
      circle(0, 0, r * 0.9, false);
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, 7); ctx.clip();
      for (const sgn of [-1, 1]) {
        ctx.lineWidth = Math.max(0.9, r * 0.12);
        ctx.beginPath();
        ctx.moveTo(sgn * r * 0.62, r * 0.9);
        ctx.quadraticCurveTo(sgn * r * 0.5, -r * 0.2, sgn * r * 0.16, -r * 0.86);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.3, r * 0.22, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.26, r * 0.06); ctx.lineTo(-r * 0.56, -r * 0.16); ctx.lineTo(-r * 0.24, -r * 0.14);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    case "繋ぎ馬":                                 // 相馬
      /* 馬。胴・首・頭・四肢・尾を分けて描く。
         はじめは胴に三角を継いだだけで、鳥のように見えた。 */
      ctx.beginPath();                             // 胴
      ctx.ellipse(-r * 0.08, r * 0.06, r * 0.46, r * 0.26, -0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();                             // 首
      ctx.moveTo(r * 0.2, -r * 0.06);
      ctx.quadraticCurveTo(r * 0.56, -r * 0.28, r * 0.6, -r * 0.66);
      ctx.lineTo(r * 0.78, -r * 0.6);
      ctx.quadraticCurveTo(r * 0.74, -r * 0.16, r * 0.36, r * 0.16);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();                             // 頭
      ctx.ellipse(r * 0.72, -r * 0.72, r * 0.2, r * 0.12, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.11);       // 四肢
      for (const [dx, sw] of [[-0.42, -0.08], [-0.24, 0.04], [0.1, -0.06], [0.28, 0.06]]) {
        ctx.beginPath(); ctx.moveTo(dx * r, r * 0.24);
        ctx.lineTo((dx + sw) * r, r * 0.82); ctx.stroke();
      }
      ctx.beginPath();                             // 尾
      ctx.moveTo(-r * 0.5, -r * 0.08);
      ctx.quadraticCurveTo(-r * 0.86, r * 0.06, -r * 0.8, r * 0.5);
      ctx.quadraticCurveTo(-r * 0.66, r * 0.16, -r * 0.44, r * 0.14);
      ctx.closePath(); ctx.fill();
      break;
    case "州浜":                                   // 小田
      for (const [dx, dy, rr] of [[0, -0.3, 0.42], [-0.46, 0.3, 0.36], [0.46, 0.3, 0.36]]) {
        circle(dx * r, dy * r, rr * r, true);
      }
      break;
    case "亀甲":                                   // 神戸・二階堂
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
        const px2 = Math.cos(a) * r * 0.88, py2 = Math.sin(a) * r * 0.88;
        if (i === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
      }
      ctx.closePath(); ctx.stroke();
      菱(0, 0, r * 0.3, r * 0.34);
      break;
    case "鷹の羽":                                 // 菊池ほか（並び鷹の羽）
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.translate(sgn * r * 0.28, 0); ctx.rotate(sgn * 0.16);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.9);
        ctx.quadraticCurveTo(r * 0.26, -r * 0.1, r * 0.06, r * 0.86);
        ctx.quadraticCurveTo(-r * 0.2, -r * 0.1, 0, -r * 0.9);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      break;
    case "輪宝":                                   // 一向衆・寺社
      circle(0, 0, r * 0.78, false);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
        ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
        ctx.stroke();
      }
      circle(0, 0, r * 0.24, true);
      break;
    case "八咫烏":                                 // 雑賀衆
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, r * 0.1, r * 0.46, r * 0.32, -0.3, 0, Math.PI * 2); ctx.fill();
      circle(r * 0.36, -r * 0.3, r * 0.24, true);
      ctx.beginPath();
      ctx.moveTo(r * 0.56, -r * 0.34); ctx.lineTo(r * 0.92, -r * 0.24); ctx.lineTo(r * 0.56, -r * 0.14);
      ctx.closePath(); ctx.fill();
      ctx.lineWidth = Math.max(0.9, r * 0.1);
      for (const dx of [-0.34, -0.06]) {
        ctx.beginPath(); ctx.moveTo(dx * r, r * 0.34); ctx.lineTo(dx * r - r * 0.04, r * 0.86); ctx.stroke();
      }
      break;
    default:                                       // 伝わりの定かでない家
      circle(0, 0, r * 0.72, false);
      circle(0, 0, r * 0.3, true);
      break;
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

/* ==========================================================================
   野の地形（GDD 8.1）

   これまでは、丘も森も「輪郭を塗って、真ん中に『丘』『森』と字を置く」だけ
   だった。地形の効きは前からあったのに（森に入れば視界が九十五歩に狭まり、
   丘に拠れば戦う力が一割五分増す）、盤の上でそれが読み取れない。
   森が森に見えないので、敵が消えたのが伏兵なのか森なのか分からない。

   本物の三次元にはしない。地形は毎瞬描くものではなく、戦のはじめに一度だけ
   別の帳に焼いて、あとはそれを貼るだけである。だから描き込みをいくら増やしても
   合戦そのものは重くならない。逆に、駒や陣形の見分けやすさは俯瞰の図であって
   こそ保たれる。斜めから光を当て、影を落とし、段を積む――紙に描いた合戦図に
   奥行きを持たせる、という筋で組む。

   光は左上から差す。影は右下へ落とす。この二つを野じゅうで揃える。
   ========================================================================== */

const 光 = { x: -0.62, y: -0.78 };                  // 左上から差す
const 影 = { x: 7, y: 9 };                          // 影の落ちる向き

// 野ごとに同じ絵になるよう、地物ごとの種から乱数を作る
function 種乱数(seed) {
  let t = (seed >>> 0) + 0x6D2B79F5;
  return () => {
    t = (t + 0x6D2B79F5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// 揺らぎのある輪郭。同じ地物なら毎度同じ形になる。
function ゆらぎ形(ctx, o, k = 1, 振れ = 0.14) {
  const rnd = 種乱数((o.seed || 1) * 7919);
  const n = 14, 節 = [];
  for (let i = 0; i < n; i++) 節.push(1 - 振れ / 2 + rnd() * 振れ);
  ctx.beginPath();
  for (let i = 0; i <= n * 3; i++) {
    const a = (i / (n * 3)) * Math.PI * 2;
    const f = i / 3, i0 = Math.floor(f) % n, t = f - Math.floor(f);
    const e = 節[i0] * (1 - t) + 節[(i0 + 1) % n] * t;
    const r = o.r * k * e;
    const x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r * 0.86;   // 俯瞰なので縦を潰す
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

const 混 = (a, b, t) => {
  const p = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
};

/* ------------------------------------------------------------------ 丘

   段を積んで等高線に見せる、という手を先に試したが、輪が均等に並ぶので
   玉ねぎの断面のようになった。高さではなく模様に見える。

   丘が丘に見えるのは、光の当たる側と陰になる側があるからである。
   左上から差す光を面に当て、右下へ影を落とす。等高線はその補いとして、
   数を絞って薄く置く。 */
function 丘を描く(ctx, h) {
  const 高 = h.rise || Math.round(h.r * 0.24);

  ctx.fillStyle = "rgba(92,106,70,0.26)";                     // 落ちる影
  ゆらぎ形(ctx, { ...h, x: h.x + 影.x * 1.5, y: h.y + 影.y * 1.1 }, 1.02);
  ctx.fill();

  // 光の当たる側から陰の側へ。頂は光の側へ寄せる
  const 頂x = h.x + 光.x * h.r * 0.34, 頂y = h.y + 光.y * h.r * 0.30 - 高 * 0.5;
  const g = ctx.createRadialGradient(頂x, 頂y, h.r * 0.06, h.x, h.y, h.r * 1.06);
  g.addColorStop(0.00, "#D3DEA3");                            // 陽の当たる頂
  g.addColorStop(0.30, "#BCCD8C");
  g.addColorStop(0.66, "#A2B675");
  g.addColorStop(1.00, "#7E9560");                            // 陰になる裾
  ctx.fillStyle = g;
  ゆらぎ形(ctx, h, 1.0);
  ctx.fill();

  // 稜。陰の側の縁を締めると、盛り上がりがはっきりする
  ctx.save(); ゆらぎ形(ctx, h, 1.0); ctx.clip();
  ctx.strokeStyle = "rgba(84,100,62,0.52)"; ctx.lineWidth = 5;
  ゆらぎ形(ctx, { ...h, x: h.x - 3, y: h.y - 5 }, 1.0); ctx.stroke();
  // 等高線は三本だけ。上へずらして重ねると、斜面の向きが読める
  ctx.lineWidth = 1.1;
  for (const k of [0.72, 0.48, 0.26]) {
    ctx.strokeStyle = "rgba(255,255,255,0.30)";
    ゆらぎ形(ctx, { ...h, y: h.y - 高 * (1 - k) * 0.85 }, k); ctx.stroke();
    ctx.strokeStyle = "rgba(110,126,80,0.22)";
    ゆらぎ形(ctx, { ...h, y: h.y - 高 * (1 - k) * 0.85 + 2 }, k); ctx.stroke();
  }
  ctx.restore();

  // 頂の草叢
  const rnd = 種乱数((h.seed || 3) * 31 + 5);
  ctx.strokeStyle = "rgba(122,140,88,0.55)"; ctx.lineWidth = 1.2;
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2, r = h.r * 0.3 * Math.sqrt(rnd());
    const tx = h.x + Math.cos(a) * r, ty = h.y - 高 * 0.7 + Math.sin(a) * r * 0.7;
    ctx.beginPath(); ctx.moveTo(tx, ty + 4); ctx.lineTo(tx + (rnd() - 0.5) * 5, ty - 5); ctx.stroke();
  }
  ctx.font = "15px 'Hiragino Mincho ProN',serif";
  ctx.strokeStyle = "rgba(250,252,236,0.9)"; ctx.lineWidth = 3.4;
  ctx.strokeText("丘", h.x - 7.5, h.y - 高 * 0.7 + 6);
  ctx.fillStyle = "rgba(60,78,44,0.95)"; ctx.fillText("丘", h.x - 7.5, h.y - 高 * 0.7 + 6);
}

/* ------------------------------------------------------------------ 森・林

   一本ずつ立てる。木ごとに影を落とし、梢の左上を明るくする。
   奥（上）の木から手前（下）の木へ順に描くので、手前の木が奥に重なる。

   縁の木は輪郭からわざとはみ出させる。丸く塗った塊のままでは、
   どこまで木立が続いているのか読めないからである。 */
function 木立を描く(ctx, f, 濃, n, label) {
  const 丈 = Math.max(7, f.r * (濃 ? 0.17 : 0.15));
  const 地 = 濃 ? "#6F9155" : "#8CAC69";
  const 梢 = 濃 ? "#537A44" : "#6E9553";
  const 明 = 濃 ? "#79A15C" : "#93B76E";

  ctx.fillStyle = "rgba(64,84,50,0.24)";                      // 木立ごとの落ちる影
  ゆらぎ形(ctx, { ...f, x: f.x + 影.x, y: f.y + 影.y * 0.8 }, 0.99, 0.18);
  ctx.fill();
  ctx.fillStyle = 地; ゆらぎ形(ctx, f, 0.96, 0.18); ctx.fill();

  const rnd = 種乱数((f.seed || 7) * 104729);
  const 木 = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2.399 + rnd() * 0.6;
    // 平方根で並べると内が詰まる。縁まで木を回し、はみ出させる
    const r = f.r * Math.pow((i + 0.6) / n, 0.42) * (0.92 + rnd() * 0.20);
    木.push({ x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r * 0.84,
      s: 丈 * (0.80 + rnd() * 0.46) });
  }
  木.sort((a, b) => a.y - b.y);
  for (const t of 木) {
    ctx.fillStyle = "rgba(48,64,40,0.30)";
    ctx.beginPath();
    ctx.ellipse(t.x + t.s * 0.5, t.y + t.s * 0.34, t.s * 0.68, t.s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6A5940"; ctx.lineWidth = Math.max(1.2, t.s * 0.17);
    ctx.beginPath(); ctx.moveTo(t.x, t.y + t.s * 0.20); ctx.lineTo(t.x, t.y - t.s * 0.34); ctx.stroke();
    ctx.fillStyle = 梢;                                       // 陰の側の梢
    for (const [dx, dy, k] of [[0.30, -0.28, 0.56], [0.06, -0.20, 0.60], [-0.34, -0.30, 0.52]]) {
      ctx.beginPath();
      ctx.ellipse(t.x + t.s * dx, t.y + t.s * dy, t.s * k, t.s * k * 0.90, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 明;                                       // 光の当たる側の梢
    for (const [dx, dy, k] of [[-0.22, -0.56, 0.46], [0.10, -0.62, 0.40]]) {
      ctx.beginPath();
      ctx.ellipse(t.x + t.s * dx, t.y + t.s * dy, t.s * k, t.s * k * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(226,240,196,0.34)";                 // 梢の照り
    ctx.beginPath();
    ctx.ellipse(t.x - t.s * 0.24, t.y - t.s * 0.72, t.s * 0.26, t.s * 0.20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = "15px 'Hiragino Mincho ProN',serif";
  ctx.strokeStyle = "rgba(255,255,255,0.82)"; ctx.lineWidth = 3.4;
  ctx.strokeText(label, f.x - label.length * 7.5, f.y + 6);
  ctx.fillStyle = "rgba(38,58,34,0.95)";
  ctx.fillText(label, f.x - label.length * 7.5, f.y + 6);
}

/* 木立の梢だけを、もう一度描く。
   地も幹も描かない。駒の上に被せて、木の下に入った隊を葉に紛れさせるのに使う。
   木立を描くときと同じ種から起こすので、下に敷いた木とぴたりと重なる。 */
export function 木の梢だけ(ctx, f, 濃, n) {
  const 丈 = Math.max(7, f.r * (濃 ? 0.17 : 0.15));
  const 梢 = 濃 ? "#537A44" : "#6E9553";
  const 明 = 濃 ? "#79A15C" : "#93B76E";
  const rnd = 種乱数((f.seed || 7) * 104729);
  const 木 = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2.399 + rnd() * 0.6;
    const r = f.r * Math.pow((i + 0.6) / n, 0.42) * (0.92 + rnd() * 0.20);
    木.push({ x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r * 0.84,
      s: 丈 * (0.80 + rnd() * 0.46) });
  }
  木.sort((a, b) => a.y - b.y);
  for (const t of 木) {
    ctx.fillStyle = 梢;
    for (const [dx, dy, k] of [[0.30, -0.28, 0.56], [0.06, -0.20, 0.60], [-0.34, -0.30, 0.52]]) {
      ctx.beginPath();
      ctx.ellipse(t.x + t.s * dx, t.y + t.s * dy, t.s * k, t.s * k * 0.90, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 明;
    for (const [dx, dy, k] of [[-0.22, -0.56, 0.46], [0.10, -0.62, 0.40]]) {
      ctx.beginPath();
      ctx.ellipse(t.x + t.s * dx, t.y + t.s * dy, t.s * k, t.s * k * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ------------------------------------------------------------------ 湿地 */
function 湿地を描く(ctx, m) {
  ctx.fillStyle = "#9FB9A2"; ゆらぎ形(ctx, m, 1.0, 0.20); ctx.fill();
  const rnd = 種乱数((m.seed || 11) * 65537);
  // 水溜まり
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2, r = m.r * 0.72 * Math.sqrt(rnd());
    const wx = m.x + Math.cos(a) * r, wy = m.y + Math.sin(a) * r * 0.86;
    const ww = m.r * (0.12 + rnd() * 0.16);
    ctx.fillStyle = "rgba(126,164,172,0.55)";
    ctx.beginPath(); ctx.ellipse(wx, wy, ww, ww * 0.42, rnd() * 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(wx, wy - 1, ww * 0.8, ww * 0.3, 0, Math.PI, Math.PI * 2); ctx.stroke();
  }
  // 葦
  ctx.strokeStyle = "rgba(96,130,110,0.8)"; ctx.lineWidth = 1.2;
  for (let i = 0; i < 40; i++) {
    const a = i * 2.399, r = m.r * Math.sqrt((i + 0.5) / 40) * 0.92;
    const tx = m.x + Math.cos(a) * r, ty = m.y + Math.sin(a) * r * 0.86;
    const 丈 = 6 + rnd() * 5;
    ctx.beginPath(); ctx.moveTo(tx, ty + 3); ctx.quadraticCurveTo(tx + 2, ty - 丈 * 0.5, tx + (rnd() - 0.5) * 5, ty - 丈); ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "13px 'Hiragino Mincho ProN',serif";
  ctx.strokeStyle = "rgba(48,78,74,0.75)"; ctx.lineWidth = 3;
  ctx.strokeText("湿地", m.x - 19, m.y + 5); ctx.fillText("湿地", m.x - 19, m.y + 5);
}

/* ------------------------------------------------------------------ 集落

   屋根に光を当て、影を落とす。見た目だけのもので、地形としての効きはない。 */
function 集落を描く(ctx, v) {
  const rnd = 種乱数((v.seed || 13) * 2654435761);
  const 家 = [];
  const n = 6 + Math.floor(rnd() * 5);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, r = v.r * 0.72 * Math.sqrt(rnd());
    家.push({ x: v.x + Math.cos(a) * r, y: v.y + Math.sin(a) * r * 0.8,
      w: 26 + rnd() * 15, h: 18 + rnd() * 9 });
  }
  // 村の地。踏み固められて土が出ている
  ctx.fillStyle = "rgba(196,184,146,0.40)";
  ゆらぎ形(ctx, { ...v, seed: (v.seed || 13) + 3 }, 1.05, 0.22); ctx.fill();
  // 畑の畝
  ctx.strokeStyle = "rgba(150,146,98,0.26)"; ctx.lineWidth = 1.4;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(v.x - v.r, v.y + i * 10 + v.r * 0.2);
    ctx.lineTo(v.x + v.r, v.y + i * 10 + v.r * 0.2 - v.r * 0.12);
    ctx.stroke();
  }
  // 里へ通じる道
  ctx.strokeStyle = "rgba(190,178,140,0.42)"; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(v.x - v.r * 1.7, v.y + v.r * 0.42);
  ctx.quadraticCurveTo(v.x, v.y + v.r * 0.14, v.x + v.r * 1.7, v.y + v.r * 0.5); ctx.stroke();
  家.sort((a, b) => a.y - b.y);
  for (const h of 家) {
    ctx.fillStyle = "rgba(90,90,70,0.28)";                    // 影
    ctx.beginPath();
    ctx.ellipse(h.x + 影.x * 0.5, h.y + h.h * 0.5 + 2, h.w * 0.62, h.h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#B9A98C";                                // 壁
    ctx.fillRect(h.x - h.w / 2, h.y - h.h * 0.1, h.w, h.h * 0.6);
    ctx.fillStyle = "#8A7A5E";                                // 茅葺きの屋根（陰の側）
    ctx.beginPath();
    ctx.moveTo(h.x - h.w * 0.62, h.y); ctx.lineTo(h.x, h.y - h.h);
    ctx.lineTo(h.x + h.w * 0.62, h.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#A6957A";                                // 光の当たる側
    ctx.beginPath();
    ctx.moveTo(h.x - h.w * 0.62, h.y); ctx.lineTo(h.x, h.y - h.h);
    ctx.lineTo(h.x, h.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(64,54,40,0.55)"; ctx.lineWidth = 1.1;   // 棟
    ctx.beginPath(); ctx.moveTo(h.x, h.y - h.h); ctx.lineTo(h.x, h.y); ctx.stroke();
    ctx.strokeStyle = "rgba(64,54,40,0.42)"; ctx.lineWidth = 1;      // 軒
    ctx.beginPath(); ctx.moveTo(h.x - h.w * 0.62, h.y); ctx.lineTo(h.x + h.w * 0.62, h.y); ctx.stroke();
  }
}

/* ------------------------------------------------------------------ 川

   深みは濃く、岸へ寄るほど淡く。岸には砂の縁を置く。
   浅瀬には石が覗き、橋は板を渡して水面へ影を落とす。 */
function 川を描く(ctx) {
  const band = (x) => [RIVER.top + riverShift(x), RIVER.bot + riverShift(x)];
  const 帯 = (x0, x1, 上ずれ, 下ずれ, 色) => {
    ctx.fillStyle = 色;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 5) { const [t] = band(x); if (x === x0) ctx.moveTo(x, t + 上ずれ); else ctx.lineTo(x, t + 上ずれ); }
    for (let x = x1; x >= x0; x -= 5) { const [, bt] = band(x); ctx.lineTo(x, bt + 下ずれ); }
    ctx.closePath(); ctx.fill();
  };
  const 幅 = RIVER.bot - RIVER.top;
  帯(0, FIELD.w, -5, 5, "#C9C3A4");                            // 砂の岸
  帯(0, FIELD.w, 0, 0, "#9FC0CE");                             // 浅い縁
  帯(0, FIELD.w, 幅 * 0.22, -幅 * 0.22, "#7FA9BE");             // 中ほど
  帯(0, FIELD.w, 幅 * 0.40, -幅 * 0.40, "#6B97AF");             // いちばん深いところ

  // 流れの筋
  ctx.strokeStyle = "rgba(255,255,255,0.30)"; ctx.lineWidth = 1.1;
  for (const k of [0.28, 0.52, 0.74]) {
    ctx.beginPath();
    for (let x = 0; x <= FIELD.w; x += 6) {
      const [t] = band(x);
      const y = t + 幅 * k + Math.sin(x * 0.05 + k * 9) * 1.8;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 浅瀬。淡く、石が覗く
  if (RIVER.ford[1] > RIVER.ford[0]) {
    帯(RIVER.ford[0], RIVER.ford[1], 1, -1, "#B6D0DA");
    const rnd = 種乱数(4242);
    for (let i = 0; i < 26; i++) {
      const x = RIVER.ford[0] + rnd() * (RIVER.ford[1] - RIVER.ford[0]);
      const [t] = band(x);
      const y = t + 3 + rnd() * (幅 - 6);
      const r = 1.6 + rnd() * 2.2;
      ctx.fillStyle = "rgba(120,120,105,0.55)";
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.22, r * 0.45, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 橋。水面へ影を落とし、欄干を立てる
  if (RIVER.bridge[1] > RIVER.bridge[0]) {
    const [bt0, bb0] = band((RIVER.bridge[0] + RIVER.bridge[1]) / 2);
    const x0 = RIVER.bridge[0], x1 = RIVER.bridge[1], 上 = bt0 - 7, 下 = bb0 + 7;
    ctx.fillStyle = "rgba(40,60,70,0.30)";
    ctx.fillRect(x0 + 影.x * 0.5, 上 + 影.y * 0.4, x1 - x0, 下 - 上);
    ctx.fillStyle = "#C2A177"; ctx.fillRect(x0, 上, x1 - x0, 下 - 上);
    ctx.fillStyle = "rgba(120,90,60,0.45)";                    // 板の目
    for (let x = x0; x < x1; x += 12) ctx.fillRect(x, 上, 2, 下 - 上);
    ctx.fillStyle = "#D8BC94";                                 // 欄干（光の側）
    ctx.fillRect(x0, 上 - 3, x1 - x0, 3.5);
    ctx.fillStyle = "#9A7C57";                                 // 欄干（影の側）
    ctx.fillRect(x0, 下 - 0.5, x1 - x0, 3.5);
    ctx.fillStyle = "#8A6B48";                                 // 橋脚
    for (const bx of [x0 + (x1 - x0) * 0.34, x0 + (x1 - x0) * 0.66]) ctx.fillRect(bx - 2, 上, 4, 下 - 上);
  }

  // 字は輪郭を付けて、水の上でも読めるようにする
  const 札 = (t, x, y) => {
    ctx.font = "13px 'Hiragino Mincho ProN',serif";
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 3;
    ctx.strokeText(t, x, y);
    ctx.fillStyle = "rgba(46,66,80,0.95)"; ctx.fillText(t, x, y);
  };
  if (RIVER.bridge[1] > RIVER.bridge[0]) {
    const [bt0] = band((RIVER.bridge[0] + RIVER.bridge[1]) / 2);
    札("橋", (RIVER.bridge[0] + RIVER.bridge[1]) / 2 - 7, bt0 - 14);
  }
  if (RIVER.ford[1] > RIVER.ford[0]) {
    const [ft0] = band((RIVER.ford[0] + RIVER.ford[1]) / 2);
    札("浅瀬", (RIVER.ford[0] + RIVER.ford[1]) / 2 - 14, ft0 - 12);
  }
  const [dt0] = band(64);
  札("深い川", 64, dt0 - 12);
}

export function drawFieldTerrain(ctx) {
  // 野の地。畦で区切られた田畑が広がる
  ctx.fillStyle = "#CBD8AC"; ctx.fillRect(0, 0, FIELD.w, FIELD.h);
  /* 田畑。畦で区切られた区画が広がる。
     はじめは濃く置いたが、四角がそのまま浮いて見えて、地形ではなく
     画面の部品のようになった。淡く、数を絞る。地の彩りにとどめる。 */
  const rnd = 種乱数(20260818);
  for (let i = 0; i < Math.round((FIELD.w * FIELD.h) / 46000); i++) {
    const x = rnd() * FIELD.w, y = rnd() * FIELD.h;
    const w = 52 + rnd() * 86, h = 34 + rnd() * 52;
    ctx.save();
    ctx.translate(x, y); ctx.rotate((rnd() - 0.5) * 0.5);
    ctx.fillStyle = `rgba(${196 + rnd() * 18 | 0},${210 + rnd() * 14 | 0},${158 + rnd() * 20 | 0},0.20)`;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = "rgba(150,156,116,0.14)"; ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    /* 畦の筋も引いてみたが、罫線の入った紙のようになって地形より目立った。
       区画の縁だけにとどめる。 */
    ctx.restore();
  }

  for (const v of VILLAGES) 集落を描く(ctx, v);
  for (const m of MARSH) 湿地を描く(ctx, m);
  for (const h of HILLS) 丘を描く(ctx, h);
  for (const f of WOODS) 木立を描く(ctx, f, false, 22, "林");
  for (const f of FORESTS) 木立を描く(ctx, f, true, 48, "森");
  if (hasRiver()) 川を描く(ctx);
}


/* ==========================================================================
   城郭図（GDD 9.3）

   これまでは、石垣も櫓も一色の四角だった。破れかけの門と堅い門の見分けは
   下に引いた細い帯だけで、どこを衝いているのかが読み取りにくい。

   野の地形と同じ筋で組む。本物の三次元にはせず、光を左上から当て、影を右下へ
   落とし、面ごとに濃淡を分ける。城郭図も戦のはじめに一度だけ焼く帳なので、
   描き込みを増やしても合戦は重くならない。

   当たり判定に使う形（castleMap の l.hw・l.hh・t・gates）には一切触れない。
   見えるものと当たるものが食い違ってはならない。 */

// 石垣。天端を明るく、根元を暗く。石の目地を刻み、影を落とす。
function 石垣を描く(ctx, x, y, w, h, t) {
  if (w <= 0 || h <= 0) return;
  const 横 = w >= h;
  ctx.fillStyle = "rgba(74,72,62,0.30)";                      // 落ちる影
  ctx.fillRect(x + 影.x * 0.55, y + 影.y * 0.55, w, h);
  const g = 横
    ? ctx.createLinearGradient(0, y, 0, y + h)
    : ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0.00, "#C6BFA9");                            // 天端（光の側）
  g.addColorStop(0.42, "#ADA593");
  g.addColorStop(1.00, "#8B8474");                            // 根元（陰の側）
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);

  // 石の目地。横に段を刻み、段ごとに縦目地をずらす
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = "rgba(96,92,80,0.34)"; ctx.lineWidth = 0.8;
  /* 石の割り。はじめは細かく刻んだが、城壁は厚みが十歩ほどしかないので、
     縦目地が詰まって梯子のように見えた。石は長手に寝かせ、目地は粗く取る。 */
  const 段 = (横 ? h : w) < 9 ? 2 : 3;
  const 石 = Math.max(11, t * 2.4);
  for (let k = 1; k < 段; k++) {
    const p = (横 ? h : w) * (k / 段);
    ctx.beginPath();
    if (横) { ctx.moveTo(x, y + p); ctx.lineTo(x + w, y + p); }
    else { ctx.moveTo(x + p, y); ctx.lineTo(x + p, y + h); }
    ctx.stroke();
  }
  for (let k = 0; k < 段; k++) {
    const ずれ = (k % 2) * 石 * 0.5;
    for (let u = ずれ; u < (横 ? w : h); u += 石) {
      const p0 = (横 ? h : w) * (k / 段), p1 = (横 ? h : w) * ((k + 1) / 段);
      ctx.beginPath();
      if (横) { ctx.moveTo(x + u, y + p0); ctx.lineTo(x + u, y + p1); }
      else { ctx.moveTo(x + p0, y + u); ctx.lineTo(x + p1, y + u); }
      ctx.stroke();
    }
  }
  ctx.restore();
  // 天端の照り
  ctx.fillStyle = "rgba(255,255,255,0.30)";
  if (横) ctx.fillRect(x, y, w, 1.6); else ctx.fillRect(x, y, 1.6, h);
  ctx.strokeStyle = "rgba(72,68,58,0.5)"; ctx.lineWidth = 0.9;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  /* 狭間。矢と鉄砲を撃つ穴。
     壁が薄いうちは点が並ぶだけで、かえって煩い。厚みのある壁にだけ開ける。 */
  if (t >= 9) {
    ctx.fillStyle = "rgba(48,46,40,0.58)";
    const 間 = t * 3.4;
    if (横) { for (let u = 間 * 0.5; u < w - 4; u += 間) ctx.fillRect(x + u, y + h * 0.30, 1.8, h * 0.28); }
    else { for (let u = 間 * 0.5; u < h - 4; u += 間) ctx.fillRect(x + w * 0.30, y + u, w * 0.28, 1.8); }
  }
}

/* 門。二枚の扉に板と乳金物を打ち、上に門櫓の屋根を載せる。
   壊れ具合は扉そのものの色に出す。細い帯を読むより早い。 */
function 門を描く(ctx, gp, 横, w, t, 割) {
  const 厚 = t + 4;
  const x = gp.x - (横 ? w / 2 : 厚 / 2), y = gp.y - (横 ? 厚 / 2 : w / 2);
  const bw = 横 ? w : 厚, bh = 横 ? 厚 : w;
  ctx.fillStyle = "rgba(60,50,38,0.34)";
  ctx.fillRect(x + 影.x * 0.5, y + 影.y * 0.5, bw, bh);
  // 傷むほど黒ずむ
  ctx.fillStyle = 混("#4A3524", "#8C6A45", Math.max(0, Math.min(1, 割)));
  ctx.fillRect(x, y, bw, bh);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, bw, bh); ctx.clip();
  // 板目
  ctx.strokeStyle = "rgba(38,28,18,0.45)"; ctx.lineWidth = 1;
  for (let u = 6; u < (横 ? bw : bh); u += 6) {
    ctx.beginPath();
    if (横) { ctx.moveTo(x + u, y); ctx.lineTo(x + u, y + bh); }
    else { ctx.moveTo(x, y + u); ctx.lineTo(x + bw, y + u); }
    ctx.stroke();
  }
  // 乳金物
  ctx.fillStyle = "rgba(226,214,182,0.55)";
  for (let u = 8; u < (横 ? bw : bh); u += 13) {
    for (const v of [0.32, 0.68]) {
      const px2 = 横 ? x + u : x + bw * v, py2 = 横 ? y + bh * v : y + u;
      ctx.beginPath(); ctx.arc(px2, py2, 1.3, 0, 7); ctx.fill();
    }
  }
  // 中央の合わせ目（二枚扉）
  ctx.strokeStyle = "rgba(24,18,12,0.7)"; ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (横) { ctx.moveTo(gp.x, y); ctx.lineTo(gp.x, y + bh); }
  else { ctx.moveTo(x, gp.y); ctx.lineTo(x + bw, gp.y); }
  ctx.stroke();
  ctx.restore();
  // 冠木（門の上に渡す横木）
  ctx.fillStyle = "#6B5136";
  if (横) ctx.fillRect(x - 3, y - 2.5, bw + 6, 2.8); else ctx.fillRect(x - 2.5, y - 3, 2.8, bh + 6);
  ctx.strokeStyle = "rgba(40,30,20,0.6)"; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
}

/* 櫓。石垣の上に建つ。土台と白壁と屋根を、少しずつ上へずらして重ねる。
   ずらすことで、平らな四角が「建っているもの」に見える。 */
function 櫓を描く(ctx, f) {
  const r = f.r, 高 = r * 0.55;
  ctx.fillStyle = "rgba(70,66,56,0.34)";                      // 落ちる影
  ctx.fillRect(f.x - r + 影.x * 0.8, f.y - r + 影.y * 0.8, r * 2, r * 2);
  // 石の土台
  ctx.fillStyle = "#9C9483";
  ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
  ctx.strokeStyle = "rgba(66,62,54,0.6)"; ctx.lineWidth = 1;
  ctx.strokeRect(f.x - r, f.y - r, r * 2, r * 2);
  // 白漆喰の壁。土台より一回り小さく、上へずらす
  const w2 = r * 1.5;
  ctx.fillStyle = "rgba(60,56,48,0.28)";
  ctx.fillRect(f.x - w2 / 2 + 2, f.y - 高 - w2 / 2 + 2, w2, w2);
  const g = ctx.createLinearGradient(f.x - w2 / 2, 0, f.x + w2 / 2, 0);
  g.addColorStop(0, "#EDE7D8"); g.addColorStop(1, "#C3BBA8");
  ctx.fillStyle = g;
  ctx.fillRect(f.x - w2 / 2, f.y - 高 - w2 / 2, w2, w2);
  // 窓（矢狭間）
  ctx.fillStyle = "rgba(46,42,36,0.75)";
  const n = Math.max(2, Math.round(w2 / 7));
  for (let k = 0; k < n; k++) {
    ctx.fillRect(f.x - w2 / 2 + 3 + k * (w2 - 6) / n, f.y - 高 - w2 * 0.16, 2.2, w2 * 0.26);
  }
  // 屋根。四方へ流れる寄棟。稜線を入れて立体に見せる
  const rw = r * 1.9;
  ctx.fillStyle = "#6E6A5E";
  ctx.beginPath();
  ctx.moveTo(f.x - rw / 2, f.y - 高 - w2 / 2 + 1);
  ctx.lineTo(f.x + rw / 2, f.y - 高 - w2 / 2 + 1);
  ctx.lineTo(f.x + rw * 0.22, f.y - 高 - w2 / 2 - rw * 0.30);
  ctx.lineTo(f.x - rw * 0.22, f.y - 高 - w2 / 2 - rw * 0.30);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#87826F";                                  // 光の当たる流れ
  ctx.beginPath();
  ctx.moveTo(f.x - rw / 2, f.y - 高 - w2 / 2 + 1);
  ctx.lineTo(f.x - rw * 0.22, f.y - 高 - w2 / 2 - rw * 0.30);
  ctx.lineTo(f.x, f.y - 高 - w2 / 2 - rw * 0.30);
  ctx.lineTo(f.x, f.y - 高 - w2 / 2 + 1);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(48,44,38,0.65)"; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(f.x - rw * 0.22, f.y - 高 - w2 / 2 - rw * 0.30);
  ctx.lineTo(f.x + rw * 0.22, f.y - 高 - w2 / 2 - rw * 0.30);
  ctx.stroke();
}

export function drawCastleTerrain(ctx, m) {
  const t = m.t, cx = m.cx, cy = m.cy;
  ctx.fillStyle = "#CBD8AC"; ctx.fillRect(0, 0, FIELD.w, FIELD.h);
  // 城の外は田畑。野の図と同じ地にする
  const rnd0 = 種乱数(777 + Math.round(FIELD.w));
  for (let i = 0; i < Math.round((FIELD.w * FIELD.h) / 46000); i++) {
    const x = rnd0() * FIELD.w, y = rnd0() * FIELD.h;
    const w = 52 + rnd0() * 86, h = 34 + rnd0() * 52;
    ctx.save(); ctx.translate(x, y); ctx.rotate((rnd0() - 0.5) * 0.5);
    ctx.fillStyle = `rgba(${196 + rnd0() * 18 | 0},${210 + rnd0() * 14 | 0},${158 + rnd0() * 20 | 0},0.18)`;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = "rgba(150,156,116,0.12)"; ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  const o = m.layers[0], band = m.moat.band;
  const tone4 = ["#C6D2A8", "#C0CDA0", "#BACA98", "#B4C592"];

  /* 堀。野の川と同じ手で深さを出す。岸の砂、浅い縁、深いところ。 */
  const ob = o.masu + t + 8;
  const 堀外 = { x: cx - o.hw - t - ob - band, y: cy - o.hh - t - ob - band,
    w: (o.hw + t + ob + band) * 2, h: (o.hh + t + ob + band) * 2 };
  const 堀内 = { x: cx - o.hw - t - ob, y: cy - o.hh - t - ob,
    w: (o.hw + t + ob) * 2, h: (o.hh + t + ob) * 2 };
  const 環 = (r0, 色) => {
    ctx.fillStyle = 色;
    ctx.fillRect(堀外.x - r0, 堀外.y - r0, 堀外.w + r0 * 2, 堀外.h + r0 * 2);
  };
  ctx.fillStyle = "#C9C3A4";                                   // 岸の砂
  ctx.fillRect(堀外.x - 5, 堀外.y - 5, 堀外.w + 10, 堀外.h + 10);
  ctx.fillStyle = "#9FC0CE"; ctx.fillRect(堀外.x, 堀外.y, 堀外.w, 堀外.h);
  ctx.fillStyle = "#7FA9BE";
  ctx.fillRect(堀外.x + band * 0.24, 堀外.y + band * 0.24, 堀外.w - band * 0.48, 堀外.h - band * 0.48);
  ctx.fillStyle = "#6B97AF";
  ctx.fillRect(堀外.x + band * 0.42, 堀外.y + band * 0.42, 堀外.w - band * 0.84, 堀外.h - band * 0.84);
  // 水面の照り
  ctx.strokeStyle = "rgba(255,255,255,0.24)"; ctx.lineWidth = 1;
  for (const k of [0.32, 0.62]) {
    ctx.strokeRect(堀外.x + band * k, 堀外.y + band * k, 堀外.w - band * k * 2, 堀外.h - band * k * 2);
  }
  ctx.fillStyle = "#CBD8AC"; ctx.fillRect(堀内.x, 堀内.y, 堀内.w, 堀内.h);

  // 各門の土橋。板を渡し、水面へ影を落とす
  for (const g of o.gates) {
    const a = axisOf(o, g);
    const u0 = gateOpenU(g) - g.w * 0.8, v0 = (a.along === "x" ? o.hh : o.hw) + t + ob;
    const rect = a.along === "x"
      ? { x: cx + u0, y: a.sgn > 0 ? cy + v0 : cy - v0 - band, w: g.w * 1.6, h: band }
      : { x: a.sgn > 0 ? cx + v0 : cx - v0 - band, y: cy + u0, w: band, h: g.w * 1.6 };
    ctx.fillStyle = "rgba(40,60,70,0.32)";
    ctx.fillRect(rect.x + 影.x * 0.5, rect.y + 影.y * 0.5, rect.w, rect.h);
    ctx.fillStyle = "#C2A177"; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = "rgba(120,90,60,0.42)";                    // 板の目
    if (a.along === "x") { for (let x = rect.x; x < rect.x + rect.w; x += 11) ctx.fillRect(x, rect.y, 2, rect.h); }
    else { for (let y = rect.y; y < rect.y + rect.h; y += 11) ctx.fillRect(rect.x, y, rect.w, 2); }
    ctx.strokeStyle = "rgba(110,86,58,0.7)"; ctx.lineWidth = 1;
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  }

  m.layers.forEach((l, i) => {
    ctx.fillStyle = tone4[Math.min(3, Math.round((i / Math.max(1, m.layers.length - 1)) * 3))];
    ctx.fillRect(cx - l.hw, cy - l.hh, l.hw * 2, l.hh * 2);
    // 城壁（門の分を抜く）。一色の四角ではなく、石垣として積む
    const x0 = cx - l.hw - t, x1 = cx + l.hw + t, y0 = cy - l.hh - t, y1 = cy + l.hh + t;
    for (const face of ["S", "N", "E", "W"]) {
      const gs = l.gates.filter((g) => g.face === face).sort((p1, p2) => p1.off - p2.off);
      const horiz = face === "S" || face === "N";
      const fixed = face === "S" ? y1 - t : face === "N" ? y0 : face === "E" ? x1 - t : x0;
      let cur = horiz ? x0 : y0;
      const end = horiz ? x1 : y1;
      for (const g of gs) {
        const wid = g.w + (g.broken ? 20 : 0);
        const c0 = (horiz ? cx : cy) + g.off - wid / 2;
        if (horiz) 石垣を描く(ctx, cur, fixed, Math.max(0, c0 - cur), t, t);
        else 石垣を描く(ctx, fixed, cur, t, Math.max(0, c0 - cur), t);
        cur = c0 + wid;
      }
      if (horiz) 石垣を描く(ctx, cur, fixed, Math.max(0, end - cur), t, t);
      else 石垣を描く(ctx, fixed, cur, t, Math.max(0, end - cur), t);
    }
    // 門と虎口
    for (const g of l.gates) {
      const a = axisOf(l, g);
      const gp = gatePos(m, l, g);
      const along = a.along === "x";
      if (g.broken) {
        // 破れた門は虎口ごと崩れ、瓦礫だけが残る。焦げも残す
        for (let k = 0; k < 14; k++) {
          const q = fromUV(m, a, g.off + ((k * 17) % 27) - 13, a.half + t + 4 + Math.floor(k / 3) * (g.masu / 3.2));
          ctx.fillStyle = k % 4 === 0 ? "rgba(70,58,46,0.55)" : "rgba(154,145,126,0.62)";
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(k * 1.1);
          ctx.fillRect(-3.5, -2.5, 7, 5);
          ctx.restore();
        }
        continue;
      }
      門を描く(ctx, gp, along, g.w, t, g.hp / g.max);
      // 傷み具合の帯
      const bp = fromUV(m, a, g.off, a.half + t + 11);
      const r = g.hp / g.max;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      if (along) ctx.fillRect(bp.x - g.w / 2, bp.y - 2, g.w, 4); else ctx.fillRect(bp.x - 2, bp.y - g.w / 2, 4, g.w);
      ctx.fillStyle = r > 0.5 ? "#5C8C4A" : r > 0.22 ? "#C89A3A" : "#B0483C";
      if (along) ctx.fillRect(bp.x - g.w / 2, bp.y - 2, g.w * r, 4); else ctx.fillRect(bp.x - 2, bp.y - g.w / 2, 4, g.w * r);
      // 虎口の袖壁と正面壁も石垣で積む
      const put = (u, v, wu, wv) => {
        const q = fromUV(m, a, u, v);
        if (along) 石垣を描く(ctx, q.x - wu / 2, a.sgn > 0 ? q.y : q.y - wv, wu, wv, t);
        else 石垣を描く(ctx, a.sgn > 0 ? q.x : q.x - wv, q.y - wu / 2, wv, wu, t);
      };
      put(g.off - g.w / 2, a.half + t, t, g.masu);
      put(g.off + g.w / 2, a.half + t, t, g.masu);
      const gL = g.off - g.w / 2, gR = g.off + g.w / 2;
      const from = g.open > 0 ? gR - g.w * 0.1 : gL - g.w * 0.9;
      const seg = (u0, u1) => { if (u1 > u0) put((u0 + u1) / 2, a.half + t + g.masu, u1 - u0, t); };
      seg(g.off - g.w * 1.05, from); seg(from + g.w, g.off + g.w * 1.05);
      const lp = fromUV(m, a, g.off, a.half + t + g.masu + 18);
      ctx.font = `${Math.round(11 * (FIELD.w / BASE.w))}px sans-serif`;
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 3;
      ctx.strokeText(g.name, lp.x - g.name.length * 5.5, lp.y + 4);
      ctx.fillStyle = "rgba(58,54,46,0.95)";
      ctx.fillText(g.name, lp.x - g.name.length * 5.5, lp.y + 4);
    }
    ctx.font = "15px 'Hiragino Mincho ProN',serif";
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 3;
    ctx.strokeText(l.name, cx - l.hw + 10, cy - l.hh + 22);
    ctx.fillStyle = "rgba(62,64,50,0.9)";
    ctx.fillText(l.name, cx - l.hw + 10, cy - l.hh + 22);
  });

  // 施設。崩れたものは瓦礫にする
  for (const f of m.fac) {
    if (f.hp <= 0) {
      for (let k = 0; k < 10; k++) {
        const ang = k * 2.4, r = f.r * 0.9 * (((k % 3) + 1) / 3);
        ctx.fillStyle = k % 4 === 0 ? "rgba(70,58,46,0.5)" : "rgba(152,143,124,0.55)";
        ctx.save(); ctx.translate(f.x + Math.cos(ang) * r, f.y + Math.sin(ang) * r); ctx.rotate(k);
        ctx.fillRect(-3.5, -2.5, 7, 5); ctx.restore();
      }
      continue;
    }
    if (f.kind === "矢倉") 櫓を描く(ctx, f);
    else {
      // 鐘楼。柱を立てて屋根を載せる
      ctx.fillStyle = "rgba(70,66,56,0.30)";
      ctx.fillRect(f.x - f.r + 影.x * 0.7, f.y - f.r + 影.y * 0.7, f.r * 2, f.r * 2);
      ctx.fillStyle = "#B08A5A"; ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      ctx.fillStyle = "#6E6A5E";
      ctx.beginPath();
      ctx.moveTo(f.x - f.r * 1.15, f.y - f.r * 0.5);
      ctx.lineTo(f.x + f.r * 1.15, f.y - f.r * 0.5);
      ctx.lineTo(f.x, f.y - f.r * 1.5);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(66,62,54,0.6)"; ctx.lineWidth = 1;
      ctx.strokeRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }
    // 傷み具合の帯
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(f.x - f.r, f.y + f.r + 2, f.r * 2, 3);
    ctx.fillStyle = f.hp / f.max > 0.5 ? "#5C8C4A" : f.hp / f.max > 0.25 ? "#C89A3A" : "#B0483C";
    ctx.fillRect(f.x - f.r, f.y + f.r + 2, f.r * 2 * (f.hp / f.max), 3);
  }
  ctx.font = "14px 'Hiragino Mincho ProN',serif";
  ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 3;
  ctx.strokeText("堀", cx - o.hw - t - o.masu - band / 2 - 7, cy);
  ctx.fillStyle = "rgba(46,66,80,0.95)";
  ctx.fillText("堀", cx - o.hw - t - o.masu - band / 2 - 7, cy);
}


/* 布陣できる自陣の範囲。寄せ手は遠い側、守り手は近い側から入る。 */
export function ownZone(b) {
  const face = b.face || "S", far = !!b.myFar;
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
        // 立ち上がって薄れる土煙。上へ流れる
        ctx.globalAlpha = a * a * 0.30;
        ctx.fillStyle = "#B9A98A";
        ctx.beginPath();
        ctx.arc(f.x, f.y - (1 - a) * 5, (f.r0 || 4) + (1 - a) * 11, 0, 7);
        ctx.fill();
      } else if (f.k === "splash") {
        /* 水飛沫。足元の輪と、跳ね上がる粒。
           白い弧が一つだけだと水滴に見えないので、輪と粒を重ねる。 */
        const r = (f.big ? 5.5 : 4) + (1 - a) * (f.big ? 10 : 7);
        ctx.globalAlpha = a * 0.7;
        ctx.strokeStyle = "#F0F7FA"; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = a * 0.85;
        ctx.fillStyle = "#FFFFFF";
        for (let k = 0; k < 4; k++) {
          const ang = f.x * 0.9 + f.y * 1.7 + k * 1.57;
          const d = r * (0.5 + k * 0.14);
          ctx.beginPath();
          ctx.arc(f.x + Math.cos(ang) * d, f.y + Math.sin(ang) * d * 0.5 - (1 - a) * 6, 1.5, 0, 7);
          ctx.fill();
        }
      } else if (f.k === "gate") {
        // 門扉への打ち込み。閃きが横一文字に走る
        ctx.globalAlpha = a * 0.9;
        ctx.strokeStyle = "#FFE8B0"; ctx.lineWidth = 2.2;
        const r = 8 + (1 - a) * 10;
        ctx.beginPath();
        ctx.moveTo(f.x - Math.cos(f.a) * r, f.y - Math.sin(f.a) * r);
        ctx.lineTo(f.x + Math.cos(f.a) * r, f.y + Math.sin(f.a) * r);
        ctx.stroke();
        ctx.globalAlpha = a * 0.45;
        ctx.fillStyle = "#FFF2CE";
        ctx.beginPath(); ctx.arc(f.x, f.y, 4 + (1 - a) * 7, 0, 7); ctx.fill();
      } else if (f.k === "chip") {
        // 飛び散る木屑。撃たれた向きへ飛び、落ちる
        const u = f.t;
        ctx.globalAlpha = a * 0.85;
        ctx.fillStyle = "#8A6B45";
        const cx2 = f.x + f.vx * u, cy2 = f.y + f.vy * u + 130 * u * u;
        ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(u * 9 + f.x);
        ctx.fillRect(-1.6, -0.9, 3.2, 1.8);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* 木の下に入った隊は、梢に隠れる（GDD 8.1）。

     森に入れば視界は二百六十歩から九十五歩に狭まる。この決まりは前からあり、
     見えぬ敵は盤から落としてもいた。ただ、味方が森へ入っても見た目は野にいる
     ときと変わらないので、「木立に潜んだ」という手応えがまるでなかった。

     駒を先に描き、そのあとで梢をもう一度、透かして被せる。
     木の下にいる隊は葉に紛れ、木を出れば元通りはっきり見える。
     隠す絵と隠れる決まりが、同じ木立を指すことになる。 */
  if (!b.map && (FORESTS.length || WOODS.length)) {
    for (const f of [...WOODS, ...FORESTS]) {
      const 濃 = FORESTS.includes(f);
      ctx.save();
      ゆらぎ形(ctx, f, 0.96, 0.18);
      ctx.clip();
      /* 濃さの加減。六割まで被せると、木の下の隊がほとんど読めなくなった。
         下知を出す側が自分の隊を見失っては本末転倒である。
         「葉の間から覗いている」ところで止める。 */
      ctx.globalAlpha = 濃 ? 0.42 : 0.26;
      木の梢だけ(ctx, f, 濃, 濃 ? 48 : 22);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
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

