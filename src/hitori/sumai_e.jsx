import React from "react";

/* ==========================================================================
   住まいの絵（風雲モードの屋敷の欄。hitori/FuunYashiki.jsx）

   遊ぶ人の申し出：「家の図は小さくでも構いません。また、家の絵をもう少しリアルにしてください」。
   身分で住まいが替わる（長屋 → 小さな家 → 庭のある家 → 屋敷 → 門のある屋敷 → 館。hitori/fuun.js 風雲の段）。
   平たい図形だけだった絵を、斜め前から見た形に描き直した（正面の壁と、奥へ伸びる横の壁・屋根の妻が見える）。
     屋根 … 長屋は石を置いた板葺き、小さな家は茅葺き（寄棟）、庭のある家は板葺き、屋敷からは瓦（切妻）、
             館は瓦の入母屋。瓦は筋を刻み、棟を載せる
     壁   … 柱と長押、白い漆喰、腰板、障子（桟の格子）、縁側、礎石。軒の下には陰を落とす
     囲い … 竹垣・生垣・瓦を載せた土塀・筋の入った築地塀。門は冠木門と、屋根のある棟門
     庭   … 松・石灯籠・飛び石・井戸。遠くに山並み
   盤の座標：横三百二十・縦百四十。地の線は百十八。
   ========================================================================== */

const 地 = 118;
const 色 = {
  柱: "#5A4128", 腰: "#7B5B3B", 漆喰: "#F1EADA", 漆喰陰: "#DCD2BC", 障子: "#F8F4E9", 桟: "#B9A788",
  瓦: "#5B626D", 瓦陰: "#454B54", 瓦筋: "#3B4047", 板: "#8C7858", 板陰: "#6E5D43", 板筋: "#5F5039",
  茅: "#A88C58", 茅陰: "#86703F", 茅筋: "#73603A", 石: "#9C978C", 石陰: "#7E7A70",
  葉: "#3F5E3A", 葉明: "#58794C", 幹: "#5B4632", 竹: "#B49A5E",
};
const 点 = (a) => a.map((p) => p.map((v) => Math.round(v * 10) / 10).join(",")).join(" ");

/* 建物一棟（斜め前から）。x … 正面の左の端、w … 正面の幅、h … 壁の高さ、d … 奥行き（右上へ伸びる）、
   屋根 … "瓦" | "板" | "茅"、形 … "切妻" | "寄棟" | "入母屋"、棟 … 屋根の高さ、出 … 軒の出、
   間 … 正面の柱の間の数、縁 … 縁側を付けるか、石 … 板屋根に石を置くか、戸 … 正面の戸の形（"障子" | "板戸"） */
function 建物({ x, w, h, d, 屋根 = "瓦", 形 = "切妻", 棟 = 18, 出 = 7, 間 = 4, 縁 = true, 石 = false, 戸 = "障子", 鍵 = "b" }) {
  const yT = 地 - h, dx = d, dy = -d * 0.45, x1 = x + w;
  const 面 = 屋根 === "瓦" ? 色.瓦 : 屋根 === "茅" ? 色.茅 : 色.板, 面陰 = 屋根 === "瓦" ? 色.瓦陰 : 屋根 === "茅" ? 色.茅陰 : 色.板陰;
  const 筋色 = 屋根 === "瓦" ? 色.瓦筋 : 屋根 === "茅" ? 色.茅筋 : 色.板筋;
  const 厚 = 屋根 === "茅" ? 3.2 : 1.6;                                  // 茅は厚く葺く
  /* 軒の先（前）と棟（奥行きの真ん中で高く） */
  const 寄 = 形 === "切妻" ? 0 : 棟 * 0.95;                              // 寄棟・入母屋は棟が短い
  const E1 = [x - 出, yT + 1], E2 = [x1 + 出, yT + 1];
  const R1 = [x - 出 + dx / 2 + 寄, yT - 棟 + dy / 2], R2 = [x1 + 出 + dx / 2 - 寄, yT - 棟 + dy / 2];
  const B2 = [x1 + 出 + dx, yT + 1 + dy];                                 // 奥の軒の右の端
  const 子 = [];
  /* 礎石と縁の下の陰 */
  子.push(<rect key="ki" x={x - 1} y={地 - 3} width={w + 2} height={3} fill={色.石陰} />);
  /* 横の壁（奥へ伸びる。日の陰で少し暗い） */
  子.push(<polygon key="yoko" points={点([[x1, 地], [x1 + dx, 地 + dy], [x1 + dx, yT + dy], [x1, yT]])} fill={色.漆喰陰} stroke={色.柱} strokeWidth="0.8" />);
  子.push(<polygon key="yokokoshi" points={点([[x1, 地], [x1 + dx, 地 + dy], [x1 + dx, 地 + dy - h * 0.3], [x1, 地 - h * 0.3]])} fill={色.板陰} />);
  /* 正面の壁：漆喰、腰板、柱、長押 */
  子.push(<rect key="kabe" x={x} y={yT} width={w} height={h} fill={色.漆喰} />);
  子.push(<rect key="koshi" x={x} y={地 - h * 0.3} width={w} height={h * 0.3} fill={色.腰} />);
  const 柱の間 = w / 間;
  for (let i = 0; i < 間; i++) {
    const cx = x + i * 柱の間;
    /* 戸（障子は白に桟の格子、板戸は板の筋） */
    const ix = cx + 2.2, iw = 柱の間 - 4.4, iy = yT + h * 0.2, ih = h * 0.8 - 3;
    if (戸 === "障子") {
      子.push(<rect key={`s${i}`} x={ix} y={iy} width={iw} height={ih} fill={色.障子} stroke={色.桟} strokeWidth="0.5" />);
      for (let k = 1; k < 3; k++) 子.push(<line key={`sv${i}${k}`} x1={ix + (iw * k) / 3} y1={iy} x2={ix + (iw * k) / 3} y2={iy + ih} stroke={色.桟} strokeWidth="0.45" />);
      for (let k = 1; k < 4; k++) 子.push(<line key={`sh${i}${k}`} x1={ix} y1={iy + (ih * k) / 4} x2={ix + iw} y2={iy + (ih * k) / 4} stroke={色.桟} strokeWidth="0.45" />);
    } else {
      子.push(<rect key={`t${i}`} x={ix} y={iy} width={iw} height={ih} fill={色.板} stroke={色.柱} strokeWidth="0.5" />);
      for (let k = 1; k < 4; k++) 子.push(<line key={`tv${i}${k}`} x1={ix + (iw * k) / 4} y1={iy} x2={ix + (iw * k) / 4} y2={iy + ih} stroke={色.板筋} strokeWidth="0.45" />);
    }
  }
  for (let i = 0; i <= 間; i++) 子.push(<rect key={`p${i}`} x={x + i * 柱の間 - 1.1} y={yT} width={2.2} height={h - 3} fill={色.柱} />);
  子.push(<rect key="nage" x={x} y={yT + h * 0.16} width={w} height={1.6} fill={色.柱} />);
  /* 縁側（板の縁と、縁の下の陰） */
  if (縁) {
    子.push(<rect key="en" x={x - 3} y={地 - 7} width={w + 6} height={3} fill="#8A6A44" />);
    子.push(<rect key="enk" x={x - 3} y={地 - 4.2} width={w + 6} height={1.4} fill="#4E3A25" opacity="0.55" />);
  }
  /* 軒の下の陰 */
  子.push(<rect key="kage" x={x} y={yT} width={w} height={4} fill="#000" opacity="0.18" />);
  子.push(<polygon key="kageyoko" points={点([[x1, yT], [x1 + dx, yT + dy], [x1 + dx, yT + dy + 4], [x1, yT + 4]])} fill="#000" opacity="0.18" />);
  /* 屋根 */
  if (形 === "切妻") {
    /* 妻（横の壁の上の三角）と、破風の板 */
    const 頂 = [x1 + dx / 2, yT - 棟 + dy / 2 + 2];
    /* けらば（妻の側の軒の出）の裏は陰になる。破風の板の線と、妻の壁のあいだを暗く塗る */
    子.push(<polygon key="kerabaura" points={点([E2, R2, B2, [x1 + dx, yT + dy], 頂, [x1, yT]])} fill="#2F2A24" opacity="0.55" />);
    子.push(<polygon key="tsuma" points={点([[x1, yT], [x1 + dx, yT + dy], 頂])} fill={色.漆喰陰} stroke={色.柱} strokeWidth="0.7" />);
    子.push(<polyline key="hafu" points={点([E2, R2, B2])} fill="none" stroke={筋色} strokeWidth="1.8" strokeLinejoin="round" />);
  } else {
    /* 寄棟・入母屋：横は隅棟まで屋根が下りる（入母屋は上に小さな妻と懸魚） */
    子.push(<polygon key="sumi" points={点([E2, B2, R2])} fill={面陰} stroke={筋色} strokeWidth="0.5" />);
    if (形 === "入母屋") {
      const a = [R2[0] + 寄 * 0.35, R2[1] + 寄 * 0.42], b2 = [R2[0] + 寄 * 0.35 + dx * 0.18, R2[1] + 寄 * 0.42 + dy * 0.18];
      子.push(<polygon key="irimoya" points={点([[a[0] - dx * 0.2, a[1] - dy * 0.2], b2, [R2[0] + dx * 0.05, R2[1] - 1.5]])} fill={色.漆喰陰} stroke={色.柱} strokeWidth="0.6" />);
      子.push(<circle key="gegyo" cx={R2[0] + dx * 0.05} cy={R2[1] + 4.5} r="1.2" fill="#B8963E" />);
    }
  }
  /* 前の屋根の面（筋を刻む） */
  const 面id = `fy-yane-${鍵}`;
  子.push(<defs key="d"><linearGradient id={面id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={面陰} /><stop offset="0.55" stopColor={面} /><stop offset="1" stopColor={面} /></linearGradient></defs>);
  子.push(<polygon key="yane" points={点([E1, E2, R2, R1])} fill={`url(#${面id})`} stroke={筋色} strokeWidth="0.6" />);
  const 筋数 = Math.round((E2[0] - E1[0]) / (屋根 === "瓦" ? 3.2 : 屋根 === "茅" ? 4.5 : 5));
  for (let i = 1; i < 筋数; i++) {
    const u = i / 筋数, ex = E1[0] + (E2[0] - E1[0]) * u, rx = R1[0] + (R2[0] - R1[0]) * u;
    if (rx < R1[0] - 0.01 || rx > R2[0] + 0.01) continue;
    子.push(<line key={`ys${i}`} x1={ex} y1={E1[1]} x2={rx} y2={R1[1]} stroke={筋色} strokeWidth={屋根 === "瓦" ? 0.55 : 0.4} opacity={屋根 === "茅" ? 0.6 : 0.8} />);
  }
  if (屋根 === "板") for (let k = 1; k < 4; k++) {
    /* 板葺きの段（横の継ぎ目） */
    const u = k / 4, y = E1[1] + (R1[1] - E1[1]) * u, xa = E1[0] + (R1[0] - E1[0]) * u, xb = E2[0] + (R2[0] - E2[0]) * u;
    子.push(<line key={`yk${k}`} x1={xa} y1={y} x2={xb} y2={y} stroke={色.板筋} strokeWidth="0.5" />);
  }
  /* 軒の先の線（瓦は軒瓦の厚み、茅は刈り込んだ厚み） */
  子.push(<polygon key="noki" points={点([E1, E2, [E2[0], E2[1] + 厚], [E1[0], E1[1] + 厚]])} fill={筋色} />);
  /* 棟 */
  if (屋根 === "瓦") {
    子.push(<rect key="mune" x={R1[0] - 1} y={R1[1] - 2.4} width={R2[0] - R1[0] + 2} height={3} fill={色.瓦筋} rx="1" />);
    子.push(<rect key="oni1" x={R1[0] - 2.6} y={R1[1] - 4.4} width={3} height={4.4} fill={色.瓦筋} rx="0.6" />);
    子.push(<rect key="oni2" x={R2[0] - 0.4} y={R2[1] - 4.4} width={3} height={4.4} fill={色.瓦筋} rx="0.6" />);
  } else if (屋根 === "茅") {
    子.push(<rect key="mune" x={R1[0] - 2} y={R1[1] - 3.2} width={R2[0] - R1[0] + 4} height={4.2} fill="#5E4E33" rx="2" />);
    for (let i = 0; i < 4; i++) 子.push(<rect key={`ug${i}`} x={R1[0] + ((R2[0] - R1[0]) * (i + 0.5)) / 4 - 1} y={R1[1] - 4.4} width={2} height={5.6} fill="#4A3D28" />);
  } else {
    子.push(<rect key="mune" x={R1[0] - 1} y={R1[1] - 1.6} width={R2[0] - R1[0] + 2} height={2.2} fill={色.板陰} />);
    if (石) for (let i = 0; i < Math.round(w / 15); i++) {
      /* 石置き屋根：段ごとに石を並べる */
      for (const u of [0.35, 0.72]) {
        const xa = E1[0] + (R1[0] - E1[0]) * u, xb = E2[0] + (R2[0] - E2[0]) * u, y = E1[1] + (R1[1] - E1[1]) * u;
        const sx = xa + ((xb - xa) * (i + 0.5 + (u > 0.5 ? 0.25 : 0))) / Math.round(w / 15);
        if (sx < xb - 2) 子.push(<ellipse key={`ishi${i}${u}`} cx={sx} cy={y - 0.6} rx="2" ry="1.3" fill={色.石} stroke={色.石陰} strokeWidth="0.4" />);
      }
    }
  }
  return <g>{子}</g>;
}

/* 松（枝ごとに葉を雲のように刈り込んだ形） */
function 松({ x, s = 1, 鍵 }) {
  return (
    <g key={鍵}>
      <ellipse cx={x} cy={地 + 0.5} rx={13 * s} ry={2.2 * s} fill="#000" opacity="0.14" />
      <path d={`M${x} ${地} C ${x - 2 * s} ${地 - 12 * s}, ${x + 6 * s} ${地 - 18 * s}, ${x + 1 * s} ${地 - 30 * s}`} stroke={色.幹} strokeWidth={3.2 * s} fill="none" strokeLinecap="round" />
      <path d={`M${x + 2 * s} ${地 - 17 * s} Q ${x + 10 * s} ${地 - 20 * s}, ${x + 15 * s} ${地 - 19 * s}`} stroke={色.幹} strokeWidth={1.6 * s} fill="none" />
      <path d={`M${x} ${地 - 24 * s} Q ${x - 8 * s} ${地 - 27 * s}, ${x - 13 * s} ${地 - 25 * s}`} stroke={色.幹} strokeWidth={1.5 * s} fill="none" />
      <ellipse cx={x + 15 * s} cy={地 - 21 * s} rx={9 * s} ry={3.6 * s} fill={色.葉} />
      <ellipse cx={x + 14 * s} cy={地 - 22.5 * s} rx={7 * s} ry={2.2 * s} fill={色.葉明} />
      <ellipse cx={x - 13 * s} cy={地 - 27 * s} rx={8 * s} ry={3.2 * s} fill={色.葉} />
      <ellipse cx={x - 12 * s} cy={地 - 28.4 * s} rx={6 * s} ry={2 * s} fill={色.葉明} />
      <ellipse cx={x + 1 * s} cy={地 - 33 * s} rx={10 * s} ry={4 * s} fill={色.葉} />
      <ellipse cx={x + 1 * s} cy={地 - 34.6 * s} rx={7.5 * s} ry={2.4 * s} fill={色.葉明} />
    </g>
  );
}
/* 石灯籠 */
function 灯籠({ x, 鍵 }) {
  return (
    <g key={鍵}>
      <ellipse cx={x} cy={地 + 0.5} rx="6" ry="1.4" fill="#000" opacity="0.14" />
      <rect x={x - 4.5} y={地 - 3} width="9" height="3" fill={色.石陰} />
      <rect x={x - 1.6} y={地 - 12} width="3.2" height="9" fill={色.石} />
      <rect x={x - 4} y={地 - 14} width="8" height="2.4" fill={色.石陰} />
      <rect x={x - 3} y={地 - 20} width="6" height="6" fill={色.石} />
      <rect x={x - 1.3} y={地 - 18.6} width="2.6" height="3" fill="#3C3A35" />
      <polygon points={点([[x - 6, 地 - 20], [x + 6, 地 - 20], [x + 2, 地 - 24], [x - 2, 地 - 24]])} fill={色.石陰} />
      <circle cx={x} cy={地 - 25} r="1.3" fill={色.石} />
    </g>
  );
}
/* 井戸（井桁と、釣瓶を吊る柱と滑車） */
function 井戸({ x, 鍵 }) {
  return (
    <g key={鍵}>
      <ellipse cx={x} cy={地 + 0.5} rx="11" ry="1.8" fill="#000" opacity="0.14" />
      <rect x={x - 7} y={地 - 8} width="14" height="8" fill={色.石} stroke={色.石陰} strokeWidth="0.6" />
      <ellipse cx={x} cy={地 - 8} rx="7" ry="1.8" fill="#4A4A44" stroke={色.石陰} strokeWidth="0.6" />
      <rect x={x - 8} y={地 - 24} width="1.8" height="16" fill={色.柱} /><rect x={x + 6.2} y={地 - 24} width="1.8" height="16" fill={色.柱} />
      <rect x={x - 9} y={地 - 25.5} width="18" height="2" fill={色.柱} />
      <circle cx={x} cy={地 - 22} r="2" fill="none" stroke={色.柱} strokeWidth="1" />
      <line x1={x} y1={地 - 20} x2={x} y2={地 - 12} stroke="#6B5B42" strokeWidth="0.6" />
      <rect x={x - 1.8} y={地 - 12.5} width="3.6" height="3" fill={色.板} />
    </g>
  );
}
/* 竹垣（低い垣。縦の竹と二本の押さえ） */
function 竹垣({ x0, x1, 高 = 10, 鍵 }) {
  const 子 = [];
  for (let x = x0; x <= x1; x += 2.6) 子.push(<line key={x} x1={x} y1={地} x2={x} y2={地 - 高} stroke={色.竹} strokeWidth="1.3" />);
  子.push(<rect key="o1" x={x0 - 1} y={地 - 高 * 0.72} width={x1 - x0 + 2} height="1.4" fill="#6E5A35" />);
  子.push(<rect key="o2" x={x0 - 1} y={地 - 高 * 0.3} width={x1 - x0 + 2} height="1.4" fill="#6E5A35" />);
  return <g key={鍵}>{子}</g>;
}
/* 生垣（丸く刈り込んだ低い垣） */
function 生垣({ x0, x1, 鍵 }) {
  const 子 = [<rect key="b" x={x0} y={地 - 9} width={x1 - x0} height="9" fill={色.葉} rx="3" />];
  for (let x = x0 + 5; x < x1; x += 9) 子.push(<ellipse key={x} cx={x} cy={地 - 9} rx="6" ry="3.2" fill={色.葉明} />);
  return <g key={鍵}>{子}</g>;
}
/* 塀。築地 … 筋の入った築地塀（高い）。門 … 真ん中の門の口の幅（空ける） */
function 塀({ 築地 = false, 門 = 0, 鍵 }) {
  const 高 = 築地 ? 17 : 13, 子 = [], 口 = 門 ? [160 - 門 / 2, 160 + 門 / 2] : null;
  const 区 = 口 ? [[6, 口[0]], [口[1], 314]] : [[6, 314]];
  for (const [a, b] of 区) {
    子.push(<rect key={`w${a}`} x={a} y={地 - 高} width={b - a} height={高} fill={築地 ? "#E8DCC0" : 色.漆喰} stroke={色.石陰} strokeWidth="0.5" />);
    子.push(<rect key={`k${a}`} x={a} y={地 - 3} width={b - a} height={3} fill={色.石陰} />);
    if (築地) for (let k = 0; k < 5; k++) 子.push(<line key={`s${a}${k}`} x1={a} y1={地 - 高 + 4 + k * 1.8} x2={b} y2={地 - 高 + 4 + k * 1.8} stroke="#FFFDF6" strokeWidth="0.7" />);
    /* 塀の瓦の笠 */
    子.push(<polygon key={`c${a}`} points={点([[a - 2, 地 - 高], [b + 2, 地 - 高], [b, 地 - 高 - 4], [a, 地 - 高 - 4]])} fill={色.瓦} stroke={色.瓦筋} strokeWidth="0.5" />);
    子.push(<rect key={`m${a}`} x={a} y={地 - 高 - 5.4} width={b - a} height={1.6} fill={色.瓦筋} />);
  }
  return <g key={鍵}>{子}</g>;
}
/* 門。棟門 … 屋根のある門（館）。でなければ冠木門 */
function 門({ 棟門 = false, 鍵 }) {
  const 子 = [];
  子.push(<rect key="h1" x="146" y={地 - 24} width="3.2" height="24" fill={色.柱} />);
  子.push(<rect key="h2" x="170.8" y={地 - 24} width="3.2" height="24" fill={色.柱} />);
  子.push(<rect key="tobira" x="149.2" y={地 - 20} width="21.6" height="20" fill="#6A4E31" />);
  子.push(<line key="tl" x1="160" y1={地 - 20} x2="160" y2={地} stroke="#3E2D1C" strokeWidth="0.8" />);
  for (let k = 0; k < 3; k++) 子.push(<line key={`tb${k}`} x1="149.2" y1={地 - 16 + k * 6} x2="170.8" y2={地 - 16 + k * 6} stroke="#4E3A25" strokeWidth="0.6" />);
  if (棟門) {
    子.push(<polygon key="y" points={点([[138, 地 - 24], [182, 地 - 24], [176, 地 - 33], [144, 地 - 33]])} fill={色.瓦} stroke={色.瓦筋} strokeWidth="0.6" />);
    for (let k = 1; k < 12; k++) 子.push(<line key={`ys${k}`} x1={138 + (44 * k) / 12} y1={地 - 24} x2={144 + (32 * k) / 12} y2={地 - 33} stroke={色.瓦筋} strokeWidth="0.5" />);
    子.push(<rect key="m" x="143" y={地 - 35} width="34" height="2.6" fill={色.瓦筋} rx="1" />);
  } else {
    子.push(<rect key="kabuki" x="141" y={地 - 27} width="38" height="3.4" fill={色.柱} />);
  }
  return <g key={鍵}>{子}</g>;
}

export function 住まいの絵({ 住まい }) {
  const 段 = Math.max(0, ["長屋", "小さな家", "庭のある家", "屋敷", "門のある屋敷", "館"].indexOf(住まい));
  return (
    <svg viewBox="0 0 320 140" width="100%" style={{ display: "block", borderRadius: 8 }} role="img" aria-label={`住まい：${住まい}`}>
      <defs>
        <linearGradient id="fy-sora" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C4D8E6" /><stop offset="1" stopColor="#F0EEE2" /></linearGradient>
        <linearGradient id="fy-tsuchi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#CDBD92" /><stop offset="1" stopColor="#B19E72" /></linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="140" fill="url(#fy-sora)" />
      {/* 遠くの山並み（二重） */}
      <path d="M0 78 Q40 58 78 70 T158 62 T236 70 T320 60 V120 H0 Z" fill="#AFC0B8" opacity="0.6" />
      <path d="M0 92 Q52 76 104 88 T214 84 T320 90 V120 H0 Z" fill="#9DB08F" opacity="0.65" />
      <rect x="0" y={地} width="320" height={140 - 地} fill="url(#fy-tsuchi)" />
      <path d={`M150 ${地} L170 ${地} L196 140 L124 140 Z`} fill="#DCCFAA" opacity="0.7" />

      {段 === 0 && (<g>
        {/* 長屋：低い一棟に戸口が並ぶ。屋根は石を置いた板葺き。主人公の戸口だけ藍の暖簾が掛かる。脇に共の井戸 */}
        <建物 x={34} w={210} h={24} d={16} 屋根="板" 形="切妻" 棟={12} 出={5} 間={6} 縁={false} 石 戸="板戸" 鍵="n" />
        <rect x={34 + 35 * 2 + 4} y={地 - 21} width={27} height={8} fill="#2F4C78" />
        <line x1={34 + 35 * 2 + 4 + 13.5} y1={地 - 21} x2={34 + 35 * 2 + 4 + 13.5} y2={地 - 13} stroke="#1E3354" strokeWidth="0.6" />
        <井戸 x={286} 鍵="ido" />
      </g>)}
      {段 === 1 && (<g>
        {/* 小さな家：茅葺きの寄棟。縁側と障子。両脇に竹垣 */}
        <竹垣 x0={40} x1={104} 鍵="t1" /><竹垣 x0={238} x1={290} 鍵="t2" />
        <建物 x={112} w={98} h={27} d={24} 屋根="茅" 形="寄棟" 棟={24} 出={8} 間={4} 鍵="k" />
        <松 x={262} s={0.75} 鍵="m" />
      </g>)}
      {段 === 2 && (<g>
        {/* 庭のある家：板葺きの切妻。庭に松・石灯籠・飛び石。前は生垣 */}
        <建物 x={70} w={122} h={29} d={28} 屋根="板" 形="切妻" 棟={20} 出={7} 間={5} 鍵="n" />
        <松 x={252} 鍵="m" /><灯籠 x={226} 鍵="t" />
        {[0, 1, 2, 3].map((i) => <ellipse key={i} cx={206 + i * 10} cy={地 + 6 + i * 3} rx="4" ry="1.6" fill={色.石} />)}
        <生垣 x0={8} x1={62} 鍵="i1" />
      </g>)}
      {段 >= 3 && 段 <= 4 && (<g>
        {/* 屋敷：瓦の切妻に縁側と障子。前は瓦を載せた土塀（門のある屋敷は冠木門） */}
        <建物 x={84} w={142} h={33} d={32} 屋根="瓦" 形="切妻" 棟={21} 出={8} 間={6} 鍵="y" />
        <松 x={266} 鍵="m" />
        <塀 門={段 === 4 ? 30 : 0} 鍵="h" />
        {段 === 4 && <門 鍵="mon" />}
      </g>)}
      {段 >= 5 && (<g>
        {/* 館：瓦の入母屋の主屋と、白壁の蔵。前は筋の入った築地塀と、屋根のある棟門 */}
        <建物 x={8} w={34} h={30} d={16} 屋根="瓦" 形="切妻" 棟={14} 出={4} 間={1} 縁={false} 戸="板戸" 鍵="kura" />
        <建物 x={70} w={160} h={36} d={38} 屋根="瓦" 形="入母屋" 棟={27} 出={9} 間={7} 鍵="omoya" />
        <松 x={292} s={0.8} 鍵="m" />
        <塀 築地 門={30} 鍵="h" />
        <門 棟門 鍵="mon" />
      </g>)}
    </svg>
  );
}
