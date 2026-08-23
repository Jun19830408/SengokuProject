import { SEA, fleetCrew, fleetShips, 海の状, 風の呼び名 } from "./sea.js";
import { SHIPS } from "../data/ships.js";


/* ==========================================================================
   海の絵（GDD 10章）

   野の地形と同じ筋で組む。海も一度だけ別の帳に焼いて、あとは貼るだけにする。
   光は左上から差し、影は右下へ落ちる。

   船は真横から見た形にする。上から見た木の葉では、安宅と小早の見分けが
   つかない。舷の高さと矢倉のあるなしが、そのまま船の格に見えるようにする。
   ========================================================================== */

const 光 = { x: -0.62, y: -0.78 };

// 色を明るく／暗くする（#rrggbb を受けて #rrggbb を返す）
function shadeHex(hex, k) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function 種乱数(seed) {
  let t = (seed >>> 0) + 0x6D2B79F5;
  return () => {
    t = (t + 0x6D2B79F5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// 海面。深い藍から浅い縹へ。うねりを幾筋か通す。
export function drawSeaTerrain(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, SEA.h);
  g.addColorStop(0, "#5B87A6");
  g.addColorStop(0.5, "#4E7A98");
  g.addColorStop(1, "#436E8C");
  ctx.fillStyle = g; ctx.fillRect(0, 0, SEA.w, SEA.h);

  const rnd = 種乱数(海の状.seed || 1);
  // うねり。潮の向きに沿って走らせる
  const a = 海の状.tide;
  const ux = Math.cos(a), uy = Math.sin(a);
  ctx.lineCap = "round";
  for (let i = 0; i < Math.round((SEA.w * SEA.h) / 5200); i++) {
    const x = rnd() * SEA.w, y = rnd() * SEA.h;
    const L = 12 + rnd() * 26;
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + rnd() * 0.10})`;
    ctx.lineWidth = 1 + rnd() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x - ux * L / 2, y - uy * L / 2);
    ctx.quadraticCurveTo(x, y - 3 - rnd() * 3, x + ux * L / 2, y + uy * L / 2);
    ctx.stroke();
  }
  // 沖のほうを少し霞ませる
  const h = ctx.createLinearGradient(0, 0, 0, SEA.h * 0.3);
  h.addColorStop(0, "rgba(210,226,236,0.30)");
  h.addColorStop(1, "rgba(210,226,236,0)");
  ctx.fillStyle = h; ctx.fillRect(0, 0, SEA.w, SEA.h * 0.3);
}

/* 船を一艘描く。舳先を facing の向きへ。
   安宅は総矢倉、関船は屋形、小早は裸の艪船。 */
export function drawShip(ctx, s, col, mine) {
  const st = SHIPS[s.t];
  const L = st.的 * 2.2, W = st.的 * 1.05;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.facing);

  // 影と航跡
  ctx.fillStyle = "rgba(20,40,56,0.28)";
  ctx.beginPath();
  ctx.ellipse(-L * 0.06, W * 0.34, L * 0.56, W * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 船体。舳先を尖らせる
  const 胴 = shadeHex(col, mine ? -0.06 : -0.12);
  ctx.fillStyle = 胴;
  ctx.beginPath();
  ctx.moveTo(L * 0.58, 0);
  ctx.lineTo(L * 0.16, -W * 0.5);
  ctx.lineTo(-L * 0.48, -W * 0.46);
  ctx.lineTo(-L * 0.54, 0);
  ctx.lineTo(-L * 0.48, W * 0.46);
  ctx.lineTo(L * 0.16, W * 0.5);
  ctx.closePath(); ctx.fill();
  // 舷の照り（光の当たる側）
  ctx.fillStyle = "rgba(255,255,255,0.26)";
  ctx.beginPath();
  ctx.moveTo(L * 0.58, 0);
  ctx.lineTo(L * 0.16, -W * 0.5);
  ctx.lineTo(-L * 0.48, -W * 0.46);
  ctx.lineTo(-L * 0.44, -W * 0.2);
  ctx.lineTo(L * 0.14, -W * 0.22);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(24,30,34,0.7)"; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(L * 0.58, 0);
  ctx.lineTo(L * 0.16, -W * 0.5);
  ctx.lineTo(-L * 0.48, -W * 0.46);
  ctx.lineTo(-L * 0.54, 0);
  ctx.lineTo(-L * 0.48, W * 0.46);
  ctx.lineTo(L * 0.16, W * 0.5);
  ctx.closePath(); ctx.stroke();

  if (s.t === "tekko") {
    /* 鉄甲船。総矢倉に鉄板を張り、大筒の狭間を開ける。
       白木ではなく黒鉄の色で描く。海の上ではこれだけが黒い。 */
    const bw = L * 0.58, bh = W * 0.84;
    ctx.fillStyle = "#4A4E52";
    ctx.fillRect(-bw / 2 - L * 0.04, -bh / 2, bw, bh);
    ctx.fillStyle = "rgba(0,0,0,0.26)";
    ctx.fillRect(-bw / 2 - L * 0.04, 0, bw, bh / 2);
    ctx.strokeStyle = "rgba(20,22,24,0.85)"; ctx.lineWidth = 1.2;
    ctx.strokeRect(-bw / 2 - L * 0.04, -bh / 2, bw, bh);
    // 鉄板の鋲
    ctx.fillStyle = "rgba(200,206,210,0.55)";
    for (let k = 0; k < 5; k++) for (const yy of [-bh / 2 + 2.5, bh / 2 - 2.5]) {
      ctx.fillRect(-bw / 2 - L * 0.04 + 3 + k * (bw - 6) / 5, yy - 0.6, 1.4, 1.4);
    }
    // 大筒。舷から突き出る
    ctx.strokeStyle = "rgba(24,26,28,0.9)"; ctx.lineWidth = 2;
    for (const k of [-0.16, 0.06]) {
      ctx.beginPath();
      ctx.moveTo(L * k, -bh / 2); ctx.lineTo(L * k, -bh / 2 - W * 0.22);
      ctx.moveTo(L * k, bh / 2); ctx.lineTo(L * k, bh / 2 + W * 0.22);
      ctx.stroke();
    }
  } else if (s.t === "atake" || s.t === "seki") {
    // 矢倉・屋形。白木の板を張り、狭間を開ける
    const bw = s.t === "atake" ? L * 0.52 : L * 0.34;
    const bh = s.t === "atake" ? W * 0.78 : W * 0.56;
    ctx.fillStyle = "#D9D2BE";
    ctx.fillRect(-bw / 2 - L * 0.04, -bh / 2, bw, bh);
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(-bw / 2 - L * 0.04, 0, bw, bh / 2);
    ctx.strokeStyle = "rgba(40,36,30,0.7)"; ctx.lineWidth = 1;
    ctx.strokeRect(-bw / 2 - L * 0.04, -bh / 2, bw, bh);
    ctx.fillStyle = "rgba(40,38,32,0.65)";
    for (let k = 0; k < (s.t === "atake" ? 4 : 2); k++) {
      ctx.fillRect(-bw / 2 - L * 0.04 + 3 + k * (bw - 6) / (s.t === "atake" ? 4 : 2), -bh / 2 + 2, 1.8, 3);
    }
  } else {
    // 小早は艪。両舷から櫂を出す
    ctx.strokeStyle = "rgba(60,50,38,0.75)"; ctx.lineWidth = 1;
    for (const k of [-0.2, 0, 0.2]) {
      ctx.beginPath();
      ctx.moveTo(L * k, -W * 0.42); ctx.lineTo(L * k - 2, -W * 0.78);
      ctx.moveTo(L * k, W * 0.42); ctx.lineTo(L * k - 2, W * 0.78);
      ctx.stroke();
    }
  }

  // 帆柱と旗。船団の色を掲げる
  ctx.strokeStyle = "rgba(70,58,44,0.9)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(L * 0.06, 0); ctx.lineTo(L * 0.06, -W * 0.9); ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(L * 0.06, -W * 0.9);
  ctx.lineTo(L * 0.06 + st.的 * 0.55, -W * 0.72);
  ctx.lineTo(L * 0.06, -W * 0.56);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.restore();

  // 燃えている船。炎と煙を上げる
  if (s.fire > 4) {
    const 勢 = Math.min(1, s.fire / 70);
    ctx.globalAlpha = 0.35 + 勢 * 0.5;
    const fg = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, st.的 * (0.8 + 勢));
    fg.addColorStop(0, "#FFE9A8"); fg.addColorStop(0.45, "#E8892F"); fg.addColorStop(1, "rgba(180,60,20,0)");
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(s.x, s.y, st.的 * (0.9 + 勢 * 1.1), 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // 傷み具合。舷の下に細い帯
  const r = Math.max(0, s.hp / s.max);
  if (r < 0.98) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(s.x - st.的, s.y + st.的 * 0.9, st.的 * 2, 2);
    ctx.fillStyle = r > 0.5 ? "#5C8C4A" : r > 0.24 ? "#C89A3A" : "#B0483C";
    ctx.fillRect(s.x - st.的, s.y + st.的 * 0.9, st.的 * 2 * r, 2);
  }
}

export function drawSea(ctx, b, sel, terrainCanvas, cam, W, H, dpr, side色) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const S = (wx, wy) => [(wx - cam.x) * cam.s + W / 2, (wy - cam.y) * cam.s + H / 2];

  ctx.save();
  ctx.translate(W / 2 - cam.x * cam.s, H / 2 - cam.y * cam.s);
  ctx.scale(cam.s, cam.s);
  ctx.drawImage(terrainCanvas, 0, 0);

  const alive = b.fleets.filter((f) => !f.dead);
  for (const f of alive) {
    const col = side色(f);
    const on = sel === f.id;
    const live = f.ships.filter((s) => !s.sunk);
    if (!live.length) continue;
    // 船団のまとまり
    const xs = live.map((s) => s.x), ys = live.map((s) => s.y);
    const x0 = Math.min(...xs) - 22, x1 = Math.max(...xs) + 22;
    const y0 = Math.min(...ys) - 22, y1 = Math.max(...ys) + 22;
    ctx.fillStyle = col + (on ? "3A" : f.side === "P" ? "1E" : "12");
    ctx.strokeStyle = on ? col : col + (f.side === "P" ? "66" : "99");
    ctx.lineWidth = (on ? 3 : 1.6) / cam.s;
    if (f.side !== "P" && !on) ctx.setLineDash([7 / cam.s, 5 / cam.s]);
    const rr = 12;
    ctx.beginPath();
    ctx.moveTo(x0 + rr, y0);
    ctx.arcTo(x1, y0, x1, y1, rr); ctx.arcTo(x1, y1, x0, y1, rr);
    ctx.arcTo(x0, y1, x0, y0, rr); ctx.arcTo(x0, y0, x1, y0, rr);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    // 奥の船から手前の船へ
    for (const s of [...live].sort((a, c) => a.y - c.y)) drawShip(ctx, s, col, f.side === "P");
  }

  // 戦の気配
  for (const f of b.fx) {
    const a = 1 - f.t / f.life;
    if (f.k === "arrow") {
      ctx.globalAlpha = a * 0.55;
      ctx.strokeStyle = "#F2E6C4"; ctx.lineWidth = 0.9;
      const u = Math.min(1, f.t / f.life * 1.7);
      ctx.beginPath();
      ctx.moveTo(f.x + (f.x2 - f.x) * Math.max(0, u - 0.2), f.y + (f.y2 - f.y) * Math.max(0, u - 0.2));
      ctx.lineTo(f.x + (f.x2 - f.x) * u, f.y + (f.y2 - f.y) * u);
      ctx.stroke();
    } else if (f.k === "horo") {
      // 焙烙が割れて火が散る
      ctx.globalAlpha = a * 0.9;
      const r = 6 + (1 - a) * 18;
      const g2 = ctx.createRadialGradient(f.x, f.y, 1, f.x, f.y, r);
      g2.addColorStop(0, "#FFF0BE"); g2.addColorStop(0.5, "#F0913A"); g2.addColorStop(1, "rgba(200,70,30,0)");
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 7); ctx.fill();
    } else if (f.k === "smoke") {
      ctx.globalAlpha = a * a * 0.34;
      ctx.fillStyle = "#5A5348";
      ctx.beginPath(); ctx.arc(f.x, f.y - (1 - a) * 16, 5 + (1 - a) * 16, 0, 7); ctx.fill();
    } else if (f.k === "clash") {
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 1.1;
      const r = 4 + (1 - a) * 5;
      for (let k = 0; k < 3; k++) {
        const ang = f.x * 0.7 + f.y * 1.3 + k * 2.1;
        ctx.beginPath();
        ctx.moveTo(f.x + Math.cos(ang) * r * 0.4, f.y + Math.sin(ang) * r * 0.4);
        ctx.lineTo(f.x + Math.cos(ang) * r, f.y + Math.sin(ang) * r);
        ctx.stroke();
      }
    } else if (f.k === "sink") {
      // 渦を巻いて沈む
      ctx.globalAlpha = a * 0.65;
      ctx.strokeStyle = "#E6F0F5"; ctx.lineWidth = 1.6;
      for (const k of [0.4, 0.75, 1]) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, (1 - a) * 26 * k, 0, Math.PI * 2 * (0.4 + a * 0.6));
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // 将の印と名は画面座標で
  for (const f of alive) {
    if (f.destroyed) continue;
    const col = side色(f);
    const [x, y] = S(f.x, f.y);
    const H2 = f.gen.lord ? 28 : 21;
    ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y - H2); ctx.stroke();
    ctx.strokeStyle = "#2A3038"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y - H2); ctx.stroke();
    ctx.fillStyle = col; ctx.fillRect(x + 1, y - H2, 11, 8);
    ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y - H2, 11, 8);

    /* 名札。敵は上、味方は下に出す。
       どちらも上に出すと、船団が寄り合ったときに名が重なって読めない。 */
    const 上に = f.side !== "P";
    const 名 = `${f.gen.name}`;
    ctx.font = "12px sans-serif";
    const w = ctx.measureText(名).width + 10;
    const ny = 上に ? y - H2 - 20 : y + 26;
    ctx.fillStyle = "rgba(255,255,255,0.90)";
    ctx.fillRect(x - w / 2, ny, w, 15);
    ctx.strokeStyle = col; ctx.lineWidth = 1.2;
    ctx.strokeRect(x - w / 2, ny, w, 15);
    ctx.fillStyle = "#26262A";
    ctx.fillText(名, x - w / 2 + 5, ny + 11);
    ctx.font = "11px sans-serif";
    const 下 = `${fleetShips(f)}艘 士気${Math.round(f.morale)}`;
    const dy = 上に ? ny - 5 : ny + 26;
    ctx.strokeStyle = "rgba(30,40,50,0.85)"; ctx.lineWidth = 3;
    ctx.strokeText(下, x - ctx.measureText(下).width / 2, dy);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(下, x - ctx.measureText(下).width / 2, dy);
  }

  // 風見。左上に風と潮の向きを出す
  const px2 = 54, py2 = 54;
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.beginPath(); ctx.arc(px2, py2, 30, 0, 7); ctx.fill();
  ctx.strokeStyle = "rgba(40,60,74,0.6)"; ctx.lineWidth = 1; ctx.stroke();
  const 矢 = (ang, r, col2, wid) => {
    ctx.strokeStyle = col2; ctx.lineWidth = wid; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(px2 - Math.cos(ang) * r, py2 - Math.sin(ang) * r);
    ctx.lineTo(px2 + Math.cos(ang) * r, py2 + Math.sin(ang) * r);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px2 + Math.cos(ang) * r, py2 + Math.sin(ang) * r);
    ctx.lineTo(px2 + Math.cos(ang + 2.5) * r * 0.42, py2 + Math.sin(ang + 2.5) * r * 0.42);
    ctx.moveTo(px2 + Math.cos(ang) * r, py2 + Math.sin(ang) * r);
    ctx.lineTo(px2 + Math.cos(ang - 2.5) * r * 0.42, py2 + Math.sin(ang - 2.5) * r * 0.42);
    ctx.stroke();
  };
  矢(海の状.tide, 12, "rgba(70,120,150,0.75)", 2);
  矢(海の状.wind, 22, "#2F5D8C", 2.6);
  ctx.fillStyle = "#26262A"; ctx.font = "11px sans-serif";
  ctx.fillText(`風 ${風の呼び名()}`, px2 - 18, py2 + 46);
  ctx.fillStyle = "rgba(70,120,150,0.95)";
  ctx.fillText("細い矢＝潮", px2 - 26, py2 + 60);
}
