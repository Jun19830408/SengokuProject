/* ==========================================================================
   新しい合戦の絵（GDD 8.11）── まず関ヶ原だけで試す

   淡彩の野に、一駒＝五十人組をほどいて一人ずつの足軽を立てる描き手である。
   引き（倍率1.6未満）はこれまでの絵のまま。深く寄ったときだけ、組が五十人に
   ほどけ、八方向の型紙で立ち、いちばん寄れば（5.4超）型紙を貼らずその場で
   連続の位相で描く――槍は溜めて突き、弓は引き絞って放ち、鉄砲は跳ね上がる。

   肝は三つ。
   一、理には指一本触れない。ここにあるのは読みと描きだけで、組や隊への
       書き込みは一切ない。見た目の状態（兵の足・倒れた場所）は WeakMap に
       置くので、記録（セーブ）にも載らない。
   二、兵には「足」がある。組の持ち場が変わっても、一人ずつが歩幅の上限の
       なかで歩いて動く。瞬間移動は見た目から消える。
   三、見える分しか描かない。一隊三万でも、画面に映る組だけをほどくので、
       軍勢の大きさに費えは比例しない。

   まず関ヶ原（筋書き sekigahara）だけで使い、実機の重さと操作感を測ってから
   広げる。切りたいときは棚に sengoku:旧絵 を「入」で置けば元の絵に戻る。
   ========================================================================== */
import { FIELD, HILLS, MOUNTAINS, FORESTS, WOODS, MARSH, VILLAGES, RIVERS, ROADS, ROAD,
  RIVER, hasRiver } from "./field.js";

/* 関ヶ原だけで使う。棚の sengoku:旧絵 が「入」なら使わない（逃げ道）。 */
export function 新絵か(b) {
  if (!b || !b.筋書き || b.筋書き.id !== "sekigahara") return false;
  try { if (typeof localStorage !== "undefined" && localStorage.getItem("sengoku:旧絵") === "入") return false; }
  catch { /* 棚が無い場でも絵は出す */ }
  return true;
}
export const 個人閾 = 1.6;        // これより寄れば一人ずつ
export const 滑閾 = 5.4;          // これより寄れば連続の位相で直接描く
export const 新絵の寄り限り = 7.2;

/* 一人ずつ描くか（GDD 8.11）。

   予算は「画面に映っている組」で数える。隊の中ほどで数えていたころは、
   旗本三万（六百組）が一つ映るだけで溢れ、槍を合わせた只中へ寄るほど
   駒へ戻るという逆さまなことになった。組ひとつずつ見れば、寄るほど
   数は減る――寄るほど絵が細かくなる。 */
export const 組の予算 = 400;                 // 画面に四百組＝二万人まで
export function 個人で描くか(b, cam, W, H) {
  if (!新絵か(b) || cam.s < 個人閾) return false;
  return 見える組数(b, cam, W, H) <= 組の予算;
}
export function 見える組数(b, cam, W, H) {
  const vx0 = cam.x - W / 2 / cam.s - 60, vx1 = cam.x + W / 2 / cam.s + 60;
  const vy0 = cam.y - H / 2 / cam.s - 80, vy1 = cam.y + H / 2 / cam.s + 60;
  let n = 0;
  for (const c of b.corps) {
    if (c.dead || c.destroyed) continue;
    for (const q of c.squads) {
      if (q.men <= 0) continue;
      if (q.x < vx0 || q.x > vx1 || q.y < vy0 || q.y > vy1) continue;
      if (++n > 組の予算) return n;
    }
  }
  return n;
}

/* ---- 筆の下ごしらえ ---- */
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16),
  r = (n >> 16) & 255, g = (n >> 8) & 255, b2 = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(r)},${f(g)},${f(b2)})`; };
const 肌 = "#C9A47E", 柄 = "#7A5A34", 布 = "#4A4034";
const 馬毛ら = ["#5A4030", "#6B4A33", "#3E2E20"];
/* 具足の色。青赤は分かりやすく、去就の定まらぬ隊は黄（GDD 8.9の色に合わせる） */
const 具側 = { P: { 濃: "#24407E", 中: "#3560B4", 帯: "#5A86D8" },
               E: { 濃: "#8A2014", 中: "#B43A24", 帯: "#D45A40" },
               Y: { 濃: "#6E5612", 中: "#977A1E", 帯: "#C0A12E" } };
let 種 = 11;
const R = () => { 種 = (種 * 1103515245 + 12345) & 0x7fffffff; return 種 / 0x7fffffff; };


const 線8=(g,x0,y0,x1,y1,w,色)=>{ g.strokeStyle=色; g.lineWidth=w; g.lineCap='round';
  g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke(); };
const 穂8=(g,x,y,a,s)=>{ const cs=Math.cos(a),sn=Math.sin(a);
  const 長=0.26*(s||6.2), 半=0.09*(s||6.2);     /* 穂先も縮尺に乗せる（固定だと直接描きで膨らむ） */
  g.fillStyle='#E8EAE6';
  g.beginPath(); g.moveTo(x+cs*長,y+sn*長);
  g.lineTo(x-sn*半,y+cs*半); g.lineTo(x+sn*半,y-cs*半);
  g.closePath(); g.fill(); };
const 腕8=(g,sx,sy,gx,gy,s,K)=>{ 線8(g,sx,sy,gx,gy,0.8*s,shade(K.濃,1.1));
  g.fillStyle=肌; g.beginPath(); g.arc(gx,gy,0.42*s,0,7); g.fill(); };
/* 向きは十六に割る（GDD 8.11）。八方向では、斜めへ進む隊がかくかくと向きを
   変えて見えた。右半分（東向き）の五つの型を鏡で返して十六を作る。 */
function 姿八(g,x,y,s,dir,fr,型,K,乱){
  const N = 16;
  const d16 = ((dir % N) + N) % N;
  const 反 = d16 > 4 && d16 < 12;                    // 西向きは鏡で返す
  const 右 = 反 ? (8 - d16 + 16) % 16 : d16;          // 0=東 … 4=南 12=北
  const archetype = 右 <= 1 ? 0 : 右 <= 3 ? 1 : 右 <= 5 ? 2 : 右 <= 7 ? 1 : 右 <= 9 ? 2
    : 右 <= 11 ? 7 : 右 <= 13 ? 7 : 右 <= 15 ? 6 : 0;
  /* 接地影（GDD 8.11）。足元に小さな暗い楕円を落とす。

     これが無いと、兵は地面の上に浮いて見える――紙を貼ったように見えた元の
     一つである。型紙に焼き込むので、一コマあたりの費えは増えない。 */
  g.fillStyle = '#1C1E14';
  const 影a = g.globalAlpha; g.globalAlpha = 影a * 0.26;
  g.beginPath();
  g.ellipse(x, y + 0.18 * s, (型 === 'kiba' ? 1.9 : 1.15) * s, (型 === 'kiba' ? 0.62 : 0.42) * s, 0, 0, 7);
  g.fill(); g.globalAlpha = 影a;
  g.save(); g.translate(x,y); if(反) g.scale(-1,1);
  const j=乱||0;
  const 構=fr>=3;
  /* 拍：整数なら型紙の四拍、小数なら連続の位相 */
  const 曲=(a,pf)=>{ const i=Math.floor(pf)%a.length, f=pf-Math.floor(pf);
    const b2=(i+1)%a.length; return a[i]+(a[b2]-a[i])*f; };
  let 脚a, 突ext=0, 引き=0, 退=0, 上=0, 歩=0;
  if(Number.isInteger(fr)){
    歩=fr===1?1:(fr===2?-1:0);
    脚a=歩*0.9||0.25;
    if(構){ const p=fr-3;
      突ext=[-1.6,2.2,6.6,2.2][p];
      引き=[0.25,0.65,1,0][p];
      退=[0,0,0.35,0.9][p]; 上=[0,0,0,0.5][p]; }
  } else if(!構){
    const w=(fr-1)/2;                          /* 1..3 を一巡の歩み */
    脚a=Math.sin(w*6.2832)*0.9; 歩=脚a>0?1:-1;
  } else {
    const pf=fr-3;
    脚a=0.25; 歩=0;
    突ext=曲([-1.6,0.2,2.2,6.6,2.2],pf*1.25);
    引き=曲([0.25,0.65,1,0,0.25],pf);
    退=曲([0,0,0.35,0.9,0],pf); 上=曲([0,0,0,0.5,0],pf);
  }
  /* 東0・南4・西8・北12。南寄りは前、北寄りは後、東西寄りは横 */
  const a16 = 右 * Math.PI / 8;
  const 面 = 右 === 0 || 右 === 15 || 右 === 1 ? '横'
    : 右 <= 3 ? '斜前' : 右 <= 5 ? '前' : 右 <= 7 ? '斜前' : 右 <= 9 ? '前'
    : 右 <= 11 ? '斜後' : 右 <= 13 ? '後' : '斜後';
  /* 横への縮み。真横なら一、正面・背面なら〇.七二まで細る（連なりで滑らかに） */
  g.scale(0.72 + 0.28 * Math.abs(Math.cos(a16)), 1);
  g.fillStyle='rgba(24,26,18,0.3)';
  g.beginPath(); g.ellipse(0.2*s,0.15*s,2.5*s,0.8*s,0,0,7); g.fill();
  const 笠=(hy)=>{
    const g2=g.createLinearGradient(-1.6*s,hy-1.4*s,1.3*s,hy);
    g2.addColorStop(0,'#6E6455'); g2.addColorStop(0.55,'#443C31'); g2.addColorStop(1,'#2B2620');
    g.beginPath(); g.moveTo(-1.8*s,hy+0.25*s);
    g.quadraticCurveTo(-0.6*s,hy-1.5*s,0.05*s,hy-1.52*s);
    g.quadraticCurveTo(0.8*s,hy-1.5*s,1.8*s,hy+0.25*s);
    g.closePath(); g.fillStyle=g2; g.fill();
    g.strokeStyle='rgba(20,16,10,0.7)'; g.lineWidth=0.5; g.stroke();
    g.beginPath(); g.ellipse(0,hy+0.3*s,1.9*s,0.5*s,0,0,7);
    g.fillStyle='#38312A'; g.fill(); g.strokeStyle='rgba(20,16,10,0.7)'; g.lineWidth=0.45; g.stroke();
    g.strokeStyle=shade(K.中,1.4); g.lineWidth=0.32*s;
    g.beginPath(); g.ellipse(0,hy-0.02*s,1.12*s,0.32*s,0,Math.PI*1.02,Math.PI*1.98); g.stroke(); };
  const 頭部=()=>{ const hy=-7.3*s;
    if(面==='後'||面==='斜後'){
      g.fillStyle='#8A6E52'; g.beginPath(); g.arc(0,hy+0.45*s,0.95*s,0,7); g.fill();
      g.fillStyle=shade(肌,0.85); g.beginPath(); g.arc(0,hy+0.15*s,0.8*s,0,7); g.fill();
    } else {
      g.fillStyle=肌; g.beginPath(); g.arc(面==='横'?0.25*s:0,hy+0.2*s,0.85*s,0,7); g.fill();
      g.fillStyle='#2A2218';
      if(面==='前'){ g.fillRect(-0.42*s,hy+0.05*s,0.22*s,0.3*s); g.fillRect(0.2*s,hy+0.05*s,0.22*s,0.3*s); }
      else if(面==='斜前'){ g.fillRect(-0.1*s,hy+0.05*s,0.22*s,0.3*s); g.fillRect(0.5*s,hy+0.05*s,0.2*s,0.3*s); }
      else g.fillRect(0.55*s,hy+0.02*s,0.22*s,0.32*s); }
    笠(hy-0.55*s); };
  const 胴部=()=>{
    const w=面==='横'?1.35*s:1.8*s;
    const g2=g.createLinearGradient(-w,0,w,0);
    g2.addColorStop(0,shade(K.濃,面==='後'?0.7:0.8)); g2.addColorStop(0.5,面==='後'?shade(K.濃,0.9):K.濃);
    g2.addColorStop(1,shade(K.濃,1.35));
    g.beginPath(); g.moveTo(-w*0.92,-6.4*s); g.lineTo(w*0.92,-6.4*s);
    g.lineTo(w,-3.1*s); g.lineTo(-w,-3.1*s); g.closePath();
    g.fillStyle=g2; g.fill(); g.strokeStyle='rgba(14,12,8,0.65)'; g.lineWidth=0.5; g.stroke();
    g.strokeStyle=面==='後'?'rgba(120,128,140,0.35)':'rgba(96,124,170,0.7)'; g.lineWidth=0.3*s;
    for(const yy of [-5.5,-4.6]){ g.beginPath(); g.moveTo(-w*0.85,yy*s); g.lineTo(w*0.85,yy*s); g.stroke(); }
    if(面==='後'){ g.strokeStyle='rgba(200,190,160,0.5)'; g.lineWidth=0.28*s;
      g.beginPath(); g.moveTo(-w*0.6,-6.2*s); g.lineTo(w*0.6,-4.4*s);
      g.moveTo(w*0.6,-6.2*s); g.lineTo(-w*0.6,-4.4*s); g.stroke(); }
    for(let i=0;i<3;i++){ g.fillStyle=i%2?shade(K.中,0.6):shade(K.中,0.85);
      g.fillRect((-w+i*(2*w/3))*0.96,-3.1*s,(2*w/3)*0.92,1.35*s); } };
  const 脚部=()=>{
    if(面==='横'){ const a=脚a;
      線8(g,-0.2*s,-3*s,-0.2*s+a*s,-0.1*s,1.1*s,shade(布,0.6));
      線8(g,0.2*s,-3*s,0.2*s-a*s,-0.05*s,1.1*s,布);
      g.fillStyle='#241E16';
      g.beginPath(); g.ellipse(0.2*s-a*s+0.5*s,0,0.8*s,0.35*s,0,0,7); g.fill();
      g.beginPath(); g.ellipse(-0.2*s+a*s+0.5*s,0.1*s,0.75*s,0.32*s,0,0,7); g.fill();
    } else { const lift=Math.max(0,脚a)*0.6*s;
      線8(g,-0.85*s,-3*s,-0.85*s,-lift,1.05*s,shade(布,面==='後'?0.75:0.9));
      線8(g,0.85*s,-3*s,0.85*s,-(0.55*s-lift),1.05*s,shade(布,面==='後'?0.62:0.75));
      g.fillStyle='#241E16';
      g.beginPath(); g.ellipse(-0.85*s,0.05*s-lift,0.62*s,0.3*s,0,0,7); g.fill();
      g.beginPath(); g.ellipse(0.85*s,0.05*s-(0.55*s-lift),0.62*s,0.3*s,0,0,7); g.fill(); } };
  const 腕武器=()=>{
    const 構=fr===2;
    if(型==='yari'){
      if(面==='横'){
        if(構){ const ext=突ext;                       /* 溜め→伸ばし→突き切り→戻し */
          線8(g,-2.6*s+ext*0.25*s,-4.6*s,(3.4+ext)*s,-4.3*s,0.4*s,柄);
          穂8(g,(3.4+ext)*s,-4.3*s,0.06,s);
          腕8(g,0.3*s,-5.6*s,(1.2+ext*0.35)*s,-4.4*s,s,K); }
        else { 線8(g,0.9*s,-1.2*s,1.35*s,-11.5*s,0.38*s,柄); 穂8(g,1.35*s,-11.5*s,-1.52,s);
          腕8(g,0.3*s,-5.6*s,1.1*s,-3.4*s,s,K); }
      } else { const px=面==='後'?-1.5*s:1.5*s;
        const 伸=構?突ext*0.35:0, 符=面==='後'?-1:1;
        線8(g,px,(-1.2-伸*符)*s,px,(-11.2-伸*符)*s,0.38*s,柄);
        穂8(g,px,(-11.2-伸*符)*s,-Math.PI/2,s);
        腕8(g,px*0.5,-5.6*s,px,(-4.2-伸*符*0.6)*s,s,K);
        腕8(g,-px*0.6,-5.6*s,-px*0.55,-3.6*s,s,K); }
    } else if(型==='yumi'){
      if(面==='横'){
        const 引=構?引き:0;                            /* 番え→引き→満月→放ち */
        const 反り=2.6+引*1.2;
        g.strokeStyle='#5E4426'; g.lineWidth=0.42*s;
        g.beginPath(); g.moveTo(1.7*s,-9.4*s);
        g.quadraticCurveTo(反り*s,-5.2*s,1.7*s,-1.6*s); g.stroke();
        const 弦x=1.7-引*1.5;
        g.strokeStyle='rgba(230,228,214,0.85)'; g.lineWidth=0.35;
        g.beginPath(); g.moveTo(1.7*s,-9.4*s); g.lineTo(弦x*s,-5.4*s); g.lineTo(1.7*s,-1.6*s); g.stroke();
        if(構&&引>0.18){                               /* 番えた矢 */
          線8(g,弦x*s,-5.4*s,(弦x+2.6)*s,-5.5*s,0.3*s,'#8A6E46');
          g.fillStyle='#E8EAE6';
          g.beginPath(); g.moveTo((弦x+3.3)*s,-5.55*s); g.lineTo((弦x+2.5)*s,-5.9*s); g.lineTo((弦x+2.5)*s,-5.2*s);
          g.closePath(); g.fill(); }
        腕8(g,0.3*s,-5.6*s,弦x*s,-5.4*s,s,K);
      } else { const px=面==='後'?-1.6*s:1.6*s;
        g.strokeStyle='#5E4426'; g.lineWidth=0.42*s;
        g.beginPath(); g.moveTo(px,-9.2*s); g.quadraticCurveTo(px*1.5,-5.4*s,px,-1.8*s); g.stroke();
        腕8(g,px*0.4,-5.6*s,px,-5.2*s,s,K);
        if(面==='後'||面==='斜後'){
          g.fillStyle='#4A3A26'; g.fillRect(0.6*s,-6.3*s,1.0*s,2.2*s);
          g.strokeStyle='#8A6E46'; g.lineWidth=0.22*s;
          for(const dx of [0.75,1.05,1.35]){ g.beginPath();
            g.moveTo(dx*s,-6.3*s); g.lineTo(dx*s+0.25*s,-8.2*s); g.stroke(); }
          g.fillStyle='#E8EAE6';
          for(const dx of [0.75,1.05,1.35]){ g.beginPath();
            g.arc(dx*s+0.27*s,-8.3*s,0.16*s,0,7); g.fill(); } } }
    } else if(型==='teppo'){
      if(面==='横'){
        if(構){
          線8(g,(-1.4-退)*s,(-4.5-上*0.4)*s,(4.6-退)*s,(-4.7-上)*s,0.5*s,'#241E16');
          線8(g,(-1.6-退)*s,(-4.2-上*0.3)*s,(0.6-退)*s,(-4.45-上*0.5)*s,0.62*s,'#6E5636');
          腕8(g,0.3*s,-5.6*s,(1.8-退)*s,(-4.6-上*0.6)*s,s,K); }
        else { 線8(g,0.5*s,-4.9*s,3.0*s,-8.8*s,0.5*s,'#241E16');
          線8(g,-0.2*s,-3.9*s,1.0*s,-5.7*s,0.6*s,'#6E5636');
          腕8(g,0.3*s,-5.6*s,0.9*s,-4.6*s,s,K); }
      } else { const px=面==='後'?-1.2*s:1.2*s;
        線8(g,px*0.5,-5.2*s,px*1.9,-9.0*s,0.5*s,'#241E16');
        線8(g,px*0.2,-4.4*s,px*0.9,-6.0*s,0.6*s,'#6E5636');
        腕8(g,px*0.4,-5.6*s,px*0.8,-4.6*s,s,K);
        腕8(g,-px*0.6,-5.6*s,-px*0.55,-3.6*s,s,K); } }
  };
  if(型==='kiba'){ 騎八(g,s,面,fr,K,j); }
  else { if(面==='後'||面==='斜後'){ 腕武器(); 胴部(); 脚部(); 頭部(); }
         else { 脚部(); 胴部(); 腕武器(); 頭部(); } }
  g.restore();
}
function 騎八(g,s,面,fr,K,j){
  const 毛=馬毛ら[(j*7|0)%3];
  const 構=fr>=3;
  const 歩=Number.isInteger(fr)?(fr===2?-1:1):Math.sin((fr-1)/2*6.2832)||1;
  if(面==='横'){
    g.strokeStyle=shade(毛,0.5); g.lineCap='round'; g.lineWidth=0.7*s;
    const ex=構?1.6:0.9;
    for(const [dx,ph] of [[2.6,1],[1.6,-1],[-1.7,-1],[-2.6,1]]){
      g.beginPath(); g.moveTo(dx*s,-2.2*s);
      g.lineTo(dx*s+ph*歩*ex*0.7*s,-0.1*s); g.stroke(); }
    g.beginPath(); g.ellipse(0,-3.3*s,3.4*s,1.55*s,0,0,7);
    const g2=g.createLinearGradient(0,-4.8*s,0,-1.8*s);
    g2.addColorStop(0,shade(毛,1.3)); g2.addColorStop(1,shade(毛,0.55));
    g.fillStyle=g2; g.fill(); g.strokeStyle='rgba(18,14,8,0.7)'; g.lineWidth=0.5; g.stroke();
    g.beginPath();
    g.moveTo(2.4*s,-4.2*s); g.quadraticCurveTo(4.2*s,-5.6*s,4.9*s,-6.1*s);
    g.lineTo(5.4*s,-5.2*s); g.quadraticCurveTo(4.3*s,-4.0*s,3.3*s,-2.9*s);
    g.closePath(); g.fillStyle=shade(毛,1.05); g.fill();
    g.fillStyle=shade(毛,0.8);
    g.beginPath(); g.ellipse(5.5*s,-5.5*s,0.85*s,0.5*s,0.3,0,7); g.fill();
    g.strokeStyle=shade(毛,0.45); g.lineWidth=0.4*s;
    g.beginPath(); g.moveTo(-3.3*s,-3.6*s); g.quadraticCurveTo(-4.4*s,-2.6*s,-4.2*s,-0.8*s); g.stroke();
    g.fillStyle='#3A2C1C'; g.beginPath(); g.ellipse(-0.3*s,-4.6*s,1.2*s,0.45*s,0,0,7); g.fill();
    線8(g,-0.3*s,-4.5*s,0.6*s,-2.6*s,0.7*s,布);
    g.fillStyle=K.濃; g.fillRect(-1.15*s,-7.3*s,1.7*s,2.9*s);
    g.strokeStyle='rgba(96,124,170,0.7)'; g.lineWidth=0.26*s;
    g.beginPath(); g.moveTo(-1.05*s,-6.6*s); g.lineTo(0.45*s,-6.6*s); g.stroke();
    if(構){ 線8(g,-2.6*s,-5.6*s,5.6*s,-5.2*s,0.36*s,柄); 穂8(g,5.6*s,-5.2*s,0.05,s); }
    else { 線8(g,0.3*s,-5.4*s,0.8*s,-12.6*s,0.36*s,柄); 穂8(g,0.8*s,-12.6*s,-1.5,s); }
    腕8(g,-0.3*s,-6.6*s,0.9*s,-5.5*s,s*0.9,K);
    g.fillStyle=肌; g.beginPath(); g.arc(-0.1*s,-8.0*s,0.72*s,0,7); g.fill();
    g.fillStyle='#2A2218'; g.fillRect(0.25*s,-8.2*s,0.2*s,0.28*s);
    g.save(); g.translate(-0.15*s,-8.9*s);
    g.beginPath(); g.moveTo(-1.5*s,0.2*s);
    g.quadraticCurveTo(0,-1.3*s,1.5*s,0.2*s); g.closePath();
    g.fillStyle='#443C31'; g.fill();
    g.beginPath(); g.ellipse(0,0.22*s,1.6*s,0.42*s,0,0,7); g.fillStyle='#38312A'; g.fill();
    g.strokeStyle=shade(K.中,1.4); g.lineWidth=0.26*s;
    g.beginPath(); g.ellipse(0,-0.05*s,0.95*s,0.26*s,0,Math.PI*1.05,Math.PI*1.95); g.stroke();
    g.restore();
  } else if(面==='前'||面==='斜前'){
    for(const dx of [-0.9,0.9]){ 線8(g,dx*s,-2.4*s,dx*s+(dx>0?歩:(-歩))*0.2*s,-0.1*s,0.6*s,shade(毛,0.6)); }
    g.beginPath(); g.ellipse(0,-3.4*s,1.7*s,1.5*s,0,0,7);
    g.fillStyle=毛; g.fill(); g.strokeStyle='rgba(18,14,8,0.7)'; g.lineWidth=0.5; g.stroke();
    g.fillStyle=shade(毛,1.05);
    g.beginPath(); g.ellipse(0,-3.0*s,0.75*s,1.6*s,0,0,7); g.fill();
    g.fillStyle=shade(毛,0.7);
    g.beginPath(); g.ellipse(0,-1.9*s,0.5*s,0.55*s,0,0,7); g.fill();
    for(const e of [-1,1]){ g.beginPath();
      g.moveTo(e*0.55*s,-4.4*s); g.lineTo(e*0.85*s,-5.4*s); g.lineTo(e*0.2*s,-4.6*s);
      g.closePath(); g.fillStyle=shade(毛,0.9); g.fill(); }
    g.fillStyle='#1E1812';
    for(const e of [-1,1]){ g.beginPath(); g.arc(e*0.38*s,-3.7*s,0.16*s,0,7); g.fill(); }
    g.fillStyle=K.濃; g.fillRect(-1.0*s,-7.6*s,2.0*s,2.6*s);
    線8(g,1.35*s,-6.2*s,1.35*s,-11.4*s,0.34*s,柄); 穂8(g,1.35*s,-11.4*s,-Math.PI/2,s);
    g.fillStyle=肌; g.beginPath(); g.arc(0,-8.2*s,0.7*s,0,7); g.fill();
    g.fillStyle='#2A2218'; g.fillRect(-0.35*s,-8.3*s,0.2*s,0.26*s); g.fillRect(0.15*s,-8.3*s,0.2*s,0.26*s);
    g.save(); g.translate(0,-9.0*s);
    g.beginPath(); g.moveTo(-1.4*s,0.2*s); g.quadraticCurveTo(0,-1.25*s,1.4*s,0.2*s); g.closePath();
    g.fillStyle='#443C31'; g.fill();
    g.beginPath(); g.ellipse(0,0.2*s,1.5*s,0.4*s,0,0,7); g.fillStyle='#38312A'; g.fill();
    g.restore();
  } else {
    for(const dx of [-1.0,1.0]){ 線8(g,dx*s,-2.4*s,dx*s,-0.1*s,0.65*s,shade(毛,0.5)); }
    g.beginPath(); g.ellipse(0,-3.3*s,1.9*s,1.6*s,0,0,7);
    const g2=g.createLinearGradient(-1.5*s,0,1.5*s,0);
    g2.addColorStop(0,shade(毛,0.6)); g2.addColorStop(0.5,毛); g2.addColorStop(1,shade(毛,1.2));
    g.fillStyle=g2; g.fill(); g.strokeStyle='rgba(18,14,8,0.7)'; g.lineWidth=0.5; g.stroke();
    g.strokeStyle=shade(毛,0.42); g.lineWidth=0.5*s;
    g.beginPath(); g.moveTo(0,-3.6*s); g.quadraticCurveTo(0.3*s,-1.8*s,0.1*s,-0.4*s); g.stroke();
    g.fillStyle=K.濃; g.fillRect(-1.0*s,-7.6*s,2.0*s,2.7*s);
    g.strokeStyle='rgba(200,190,160,0.45)'; g.lineWidth=0.24*s;
    g.beginPath(); g.moveTo(-0.7*s,-7.3*s); g.lineTo(0.7*s,-5.6*s);
    g.moveTo(0.7*s,-7.3*s); g.lineTo(-0.7*s,-5.6*s); g.stroke();
    線8(g,-1.35*s,-6.2*s,-1.35*s,-11.2*s,0.34*s,柄); 穂8(g,-1.35*s,-11.2*s,-Math.PI/2,s);
    g.fillStyle=shade(肌,0.85); g.beginPath(); g.arc(0,-8.1*s,0.66*s,0,7); g.fill();
    g.save(); g.translate(0,-8.9*s);
    g.beginPath(); g.moveTo(-1.4*s,0.2*s); g.quadraticCurveTo(0,-1.25*s,1.4*s,0.2*s); g.closePath();
    g.fillStyle='#443C31'; g.fill();
    g.beginPath(); g.ellipse(0,0.2*s,1.5*s,0.4*s,0,0,7); g.fillStyle='#38312A'; g.fill();
    g.restore();
  }
}
/* 型紙。使う分だけその場で焼く（十六方向×七拍×四兵科×三側を先に焼くと重い） */
const 札帳={};
function 札取り(side,型,dir,fr){
  const key=side+型+dir+'_'+fr;
  let n=札帳[key];
  if(n===undefined){
    if(typeof document==='undefined'){ 札帳[key]=null; return null; }
    const 幅=型==='kiba'?96:64, 高=型==='kiba'?116:104;
    n=document.createElement('canvas'); n.width=幅; n.height=高;
    姿八(n.getContext('2d'),幅/2,高-8,型==='kiba'?6.2:6.4,dir,fr,型,具側[side],(dir*3+fr)*0.37%1);
    札帳[key]=n;
  }
  return n;
}
function 倒れ札(side){
  const key=side+'fallen';
  let n=札帳[key];
  if(n===undefined){
    if(typeof document==='undefined'){ 札帳[key]=null; return null; }
    n=document.createElement('canvas'); n.width=64; n.height=64;
    const g=n.getContext('2d'); const K=具側[side];
    g.translate(32,36);
    g.fillStyle='rgba(24,26,18,0.3)'; g.beginPath(); g.ellipse(0,2,16,6,0,0,7); g.fill();
    g.rotate(0.5);
    g.fillStyle=shade(K.濃,0.75); g.fillRect(-9,-4,18,8);
    g.strokeStyle=shade(布,0.7); g.lineWidth=4; g.lineCap='round';
    g.beginPath(); g.moveTo(8,2); g.lineTo(15,7); g.moveTo(6,4); g.lineTo(10,11); g.stroke();
    g.fillStyle=shade(肌,0.9); g.beginPath(); g.arc(-12,-2,4,0,7); g.fill();
    g.rotate(-0.5);
    g.strokeStyle='#7A5A34'; g.lineWidth=2;
    g.beginPath(); g.moveTo(-14,10); g.lineTo(16,-6); g.stroke();
    札帳[key]=n;
  }
  return n;
}
function 札を焼く(){ /* 先焼きはしない。使う分だけ 札取り が焼く */ }

/* 将と旗持の型紙。毎コマ筆で描くと、小さく潰れたうえに費えも嵩む。
   兵と同じように一度だけ焼いて、あとは貼る。 */
function 将札(side, 格) {
  const key = side + "将" + 格;
  let n = 札帳[key];
  if (n === undefined) {
    if (typeof document === "undefined") { 札帳[key] = null; return null; }
    n = document.createElement("canvas"); n.width = 150; n.height = 190;
    武将図(n.getContext("2d"), 75, 178, 11, 具側[side], 2, 0);
    札帳[key] = n;
  }
  return n;
}
function 旗持札(side, 形) {
  const key = side + "旗" + 形;
  let n = 札帳[key];
  if (n === undefined) {
    if (typeof document === "undefined") { 札帳[key] = null; return null; }
    /* 馬印は遠くから見えてこそのもの。竿も標も大きく取る */
    n = document.createElement("canvas"); n.width = 260; n.height = 420;
    旗持図(n.getContext("2d"), 130, 404, 19, 具側[side], 形, 0);
    札帳[key] = n;
  }
  return n;
}
const 札貼=(g,key,x,y,倍,alpha)=>{ const n=札帳[key]; if(!n) return;
  if(alpha!=null) g.globalAlpha=alpha;
  g.drawImage(n, x-n.width/2*倍, y-(n.height-8)*倍, n.width*倍, n.height*倍);
  if(alpha!=null) g.globalAlpha=1; };



/* ---- 淡彩の野を焼く。drawFieldTerrain の代わり（世界座標で描く契約は同じ） ---- */
function 揺点(pts, step, 幅) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const x0 = pts[i].x, y0 = pts[i].y, x1 = pts[i + 1].x, y1 = pts[i + 1].y;
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, n = Math.max(2, (L / step) | 0);
    const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    for (let k = 0; k < n; k++) { const t = k / n, off = (R() - 0.5) * 幅;
      out.push([x0 + (x1 - x0) * t + nx * off, y0 + (y1 - y0) * t + ny * off]); } }
  const L2 = pts[pts.length - 1]; out.push([L2.x, L2.y]);
  return out;
}
function 線引(g, pts, lw, st) { g.strokeStyle = st; g.lineWidth = lw;
  g.lineJoin = "round"; g.lineCap = "round";
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
const 名札 = (g, x, y, s) => {
  g.save(); g.font = '600 13px "Hiragino Mincho ProN","Yu Mincho",serif'; g.textAlign = "center";
  g.lineWidth = 3.5; g.strokeStyle = "rgba(238,232,214,0.85)"; g.strokeText(s, x, y);
  g.fillStyle = "rgba(56,50,36,0.95)"; g.fillText(s, x, y); g.restore(); };

export function 新絵の野(g) {
  const W = FIELD.w, H = FIELD.h, 面 = W * H;
  種 = 31;
  g.fillStyle = "#A9AE7C"; g.fillRect(0, 0, W, H);
  const 染 = (色, n, r0, r1, a) => { for (let i = 0; i < n; i++) {
    const x = R() * W, y = R() * H, r = r0 + R() * (r1 - r0);
    const gr = g.createRadialGradient(x, y, r * 0.1, x, y, r);
    gr.addColorStop(0, 色.replace(")", `,${a})`).replace("rgb", "rgba"));
    gr.addColorStop(1, 色.replace(")", ",0)").replace("rgb", "rgba"));
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.7, R() * 3, 0, 7); g.fill(); } };
  const 規 = Math.sqrt(面 / 8e5);                       // 野の広さで数を合わせる
  染("rgb(140,146,96)", (22 * 規) | 0, 60, 190, 0.5); 染("rgb(186,188,128)", (16 * 規) | 0, 50, 160, 0.5);
  染("rgb(122,132,86)", (12 * 規) | 0, 80, 220, 0.4); 染("rgb(168,150,100)", (8 * 規) | 0, 50, 130, 0.35);
  const 草数 = Math.min(42000, (面 / 180) | 0);
  for (let i = 0; i < 草数; i++) { const x = R() * W, y = R() * H;
    g.strokeStyle = R() < 0.55 ? "rgba(96,106,62,0.26)" : "rgba(206,206,150,0.24)"; g.lineWidth = 1;
    const a = -1.35 + (R() - 0.5) * 0.5, L = 2.5 + R() * 3.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
  /* 沼 */
  for (const m of MARSH) {
    const gr = g.createRadialGradient(m.x, m.y, m.r * 0.2, m.x, m.y, m.r);
    gr.addColorStop(0, "rgba(96,122,104,0.5)"); gr.addColorStop(1, "rgba(96,122,104,0)");
    g.fillStyle = gr; g.beginPath(); g.ellipse(m.x, m.y, m.r, m.r * 0.8, 0, 0, 7); g.fill();
    for (let i = 0; i < m.r; i++) { const a = R() * 6.283, d = Math.sqrt(R()) * m.r * 0.9;
      g.strokeStyle = "rgba(70,96,82,0.4)"; g.lineWidth = 1;
      const px = m.x + Math.cos(a) * d, py = m.y + Math.sin(a) * d * 0.8;
      g.beginPath(); g.moveTo(px - 2, py); g.lineTo(px + 2, py); g.stroke(); } }
  /* 丘と山：段彩。南東へ影、北西に光、山は頂に岩 */
  for (const h of [...HILLS, ...MOUNTAINS.map((m) => ({ ...m, 山: true }))]) {
    const 段数 = h.山 ? 6 : 3;
    g.save(); g.globalCompositeOperation = "multiply";
    const g影 = g.createRadialGradient(h.x + h.r * 0.22, h.y + h.r * 0.26, h.r * 0.3,
      h.x + h.r * 0.14, h.y + h.r * 0.16, h.r * 1.25);
    g影.addColorStop(0, "rgba(70,74,50,0.42)"); g影.addColorStop(1, "rgba(70,74,50,0)");
    g.fillStyle = g影;
    g.beginPath(); g.ellipse(h.x + h.r * 0.12, h.y + h.r * 0.12, h.r * 1.18, h.r * 1.02, 0, 0, 7); g.fill();
    g.restore();
    for (let k = 0; k < 段数; k++) {
      const t2 = k / 段数, rr = h.r * (1 - t2 * 0.82), 明 = 0.86 + t2 * 0.5;
      const cx2 = h.x - h.r * 0.05 * (k / 段数) * 3, cy2 = h.y - h.r * 0.05 * (k / 段数) * 3;
      const g段 = g.createRadialGradient(cx2 - rr * 0.4, cy2 - rr * 0.45, rr * 0.15, cx2, cy2, rr * 1.05);
      g段.addColorStop(0, `rgba(${168 * 明 | 0},${176 * 明 | 0},${116 * 明 | 0},0.9)`);
      g段.addColorStop(0.7, `rgba(${128 * 明 | 0},${142 * 明 | 0},${92 * 明 | 0},0.85)`);
      g段.addColorStop(1, `rgba(${104 * 明 | 0},${118 * 明 | 0},${76 * 明 | 0},${k === 0 ? 0 : 0.55})`);
      g.fillStyle = g段;
      g.beginPath();
      for (let i2 = 0; i2 <= 16; i2++) { const a = i2 / 16 * 6.283, rad = rr * (0.92 + R() * 0.1);
        i2 ? g.lineTo(cx2 + Math.cos(a) * rad, cy2 + Math.sin(a) * rad * 0.92)
           : g.moveTo(cx2 + rad * 0.92, cy2); }
      g.closePath(); g.fill();
      g.strokeStyle = `rgba(60,66,44,${0.2 + t2 * 0.12})`; g.lineWidth = 1.3;
      g.beginPath(); g.ellipse(cx2, cy2, rr * 0.97, rr * 0.9, 0, Math.PI * 0.05, Math.PI * 0.6); g.stroke();
      g.strokeStyle = "rgba(224,228,180,0.3)"; g.lineWidth = 1;
      g.beginPath(); g.ellipse(cx2, cy2, rr * 0.97, rr * 0.9, 0, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
    }
    for (let i2 = 0; i2 < h.r * (h.山 ? 1.2 : 0.6); i2++) {
      const a = R() * 6.283, d2 = 0.45 + Math.sqrt(R()) * 0.5;
      g.fillStyle = R() < 0.55 ? "rgba(58,76,40,0.42)" : "rgba(120,142,80,0.33)";
      g.beginPath(); g.arc(h.x + Math.cos(a) * h.r * d2 * 0.95, h.y + Math.sin(a) * h.r * d2 * 0.85,
        0.8 + R() * 1.8, 0, 7); g.fill(); }
    if (h.山) {
      for (let i2 = 0; i2 < 26; i2++) { const a = R() * 6.283, d2 = R() * 0.22;
        g.fillStyle = R() < 0.5 ? "rgba(134,132,116,0.65)" : "rgba(96,96,82,0.55)";
        g.beginPath(); g.ellipse(h.x + Math.cos(a) * h.r * d2 - h.r * 0.12,
          h.y + Math.sin(a) * h.r * d2 * 0.9 - h.r * 0.12,
          1.6 + R() * 3, 1.1 + R() * 1.8, R() * 3, 0, 7); g.fill(); }
      for (let i2 = 0; i2 < 7; i2++) { const a = (i2 / 7) * 6.283 + R() * 0.4;
        g.strokeStyle = "rgba(74,84,52,0.32)"; g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(h.x + Math.cos(a) * h.r * 0.3, h.y + Math.sin(a) * h.r * 0.27);
        g.quadraticCurveTo(h.x + Math.cos(a + 0.12) * h.r * 0.62, h.y + Math.sin(a + 0.12) * h.r * 0.56,
          h.x + Math.cos(a + 0.05) * h.r * 0.95, h.y + Math.sin(a + 0.05) * h.r * 0.86); g.stroke(); }
    }
  }
  /* 川（筋書きの折れ線と、昔ながらの横帯の両方に対応） */
  const 川ら = RIVERS.length ? RIVERS
    : (hasRiver() ? [{ 節: [{ x: -40, y: (RIVER.top + RIVER.bot) / 2 },
      { x: W + 40, y: (RIVER.top + RIVER.bot) / 2 }], 幅: RIVER.bot - RIVER.top, 渡し: [] }] : []);
  for (const r of 川ら) {
    const pts = r.節, w2 = Math.max(8, r.幅);
    g.save(); g.globalCompositeOperation = "multiply";
    線引(g, 揺点(pts, 16, 4), w2 + 12, "rgba(112,112,84,0.42)");
    g.restore();
    線引(g, 揺点(pts, 16, 3), w2 + 5, "#4A5E74");
    線引(g, 揺点(pts, 16, 3), w2, "#57748E");
    線引(g, 揺点(pts, 18, 3), Math.max(3, w2 * 0.5), "#6E8AA6");
    for (let i = 0; i < pts.length - 1; i++) { if (R() < 0.4) continue;
      const a = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
      for (let k = 0; k < 4; k++) { const t = k / 4;
        const px = pts[i].x + (pts[i + 1].x - pts[i].x) * t + (R() - 0.5) * w2 * 0.6;
        const py = pts[i].y + (pts[i + 1].y - pts[i].y) * t + (R() - 0.5) * w2 * 0.6;
        g.strokeStyle = R() < 0.5 ? "rgba(196,210,222,0.3)" : "rgba(50,64,86,0.3)"; g.lineWidth = 1;
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * (6 + R() * 12), py + Math.sin(a) * (6 + R() * 12)); g.stroke(); } }
    for (const 渡 of (r.渡し || [])) {
      let a = 0, best = 1e18;
      for (let i = 0; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        const d = (mx - 渡.x) ** 2 + (my - 渡.y) ** 2;
        if (d < best) { best = d; a = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x); } }
      g.save(); g.translate(渡.x, 渡.y); g.rotate(a + Math.PI / 2);
      if (渡.種 === "橋") {
        g.fillStyle = "#8E7450"; g.fillRect(-w2 * 0.8, -11, w2 * 1.6, 22);
        g.strokeStyle = "rgba(52,38,20,0.75)"; g.lineWidth = 1.6;
        g.strokeRect(-w2 * 0.8, -11, w2 * 1.6, 22);
        g.strokeStyle = "rgba(60,44,24,0.5)";
        for (let k = -w2 * 0.8 + 3; k < w2 * 0.8; k += 5) {
          g.beginPath(); g.moveTo(k, -11); g.lineTo(k, 11); g.stroke(); }
      } else {
        for (let i = 0; i < 14; i++) { g.fillStyle = "rgba(200,206,196,0.5)";
          g.beginPath(); g.arc((R() - 0.5) * w2 * 1.5, (R() - 0.5) * 20, 1.2 + R() * 1.6, 0, 7); g.fill(); } }
      g.restore();
    }
  }
  /* 街道 */
  for (const rd of (ROADS.length ? ROADS : (ROAD ? [ROAD] : []))) {
    const pts = rd.節, w2 = Math.max(6, rd.幅 * 1.4);
    g.save(); g.globalCompositeOperation = "multiply";
    線引(g, 揺点(pts, 18, 4), w2 + 8, "rgba(120,108,80,0.32)");
    g.restore();
    線引(g, 揺点(pts, 16, 3), w2, "#B99C7A");
    線引(g, 揺点(pts, 16, 2.5), w2 * 0.62, "#C8AC86");
    線引(g, 揺点(pts, 18, 2.5), w2 * 0.3, "#D2B892");
  }
  /* 林 */
  for (const f of [...FORESTS, ...WOODS]) {
    const n = Math.min(30, Math.max(4, (f.r / 7) | 0));
    const 木ら = [];
    for (let i = 0; i < n; i++) 木ら.push([f.x + (R() - 0.5) * f.r * 1.6, f.y + (R() - 0.5) * f.r * 1.1, 7 + R() * 8]);
    for (const [x, y, r] of 木ら.sort((a, z) => a[1] - z[1])) {
      g.save(); g.shadowColor = "rgba(40,44,26,0.5)"; g.shadowBlur = r * 0.5;
      g.shadowOffsetX = -r * 0.5; g.shadowOffsetY = r * 0.35;
      g.beginPath();
      for (let i2 = 0; i2 <= 10; i2++) { const a = i2 / 10 * 6.283, rad = r * (0.78 + R() * 0.3);
        i2 ? g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad * 0.86)
           : g.moveTo(x + rad, y); }
      g.closePath();
      const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
      gr.addColorStop(0, "#6E8A44"); gr.addColorStop(0.6, "#485F30"); gr.addColorStop(1, "#2E401E");
      g.fillStyle = gr; g.fill();
      g.restore(); } }
  /* 村 */
  for (const v of VILLAGES) {
    for (let i = 0; i < 3; i++) { const a = i * 2.2 + 0.4, d2 = (v.r || 40) * 0.5;
      const x = v.x + Math.cos(a) * d2, y = v.y + Math.sin(a) * d2 * 0.7, w2 = 13, h3 = 11;
      g.save(); g.shadowColor = "rgba(46,40,26,0.5)"; g.shadowBlur = 4;
      g.shadowOffsetX = -2; g.shadowOffsetY = 3;
      g.fillStyle = "#9C8462"; g.fillRect(x - w2 / 2, y - h3 * 0.1, w2, h3 * 0.45);
      g.restore();
      const gr = g.createLinearGradient(x, y - h3 * 0.66, x, y - h3 * 0.02);
      gr.addColorStop(0, "#6E5A42"); gr.addColorStop(1, "#463424");
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(x - w2 * 0.64, y - h3 * 0.06); g.lineTo(x, y - h3 * 0.64);
      g.lineTo(x + w2 * 0.64, y - h3 * 0.06); g.closePath(); g.fill();
      g.strokeStyle = "rgba(34,26,16,0.7)"; g.lineWidth = 0.8; g.stroke(); } }
  /* 名のある峰と村の札 */
  for (const o of [...HILLS, ...MOUNTAINS]) if (o.札 && o.名) 名札(g, o.x, o.y - o.r * 0.36, o.名);
  for (const v of VILLAGES) if (v.札 && v.名) 名札(g, v.x, v.y + (v.r || 40) + 12, v.名);
  /* 紙の粒と隅の落ち */
  if (typeof document !== "undefined") {
    const ノ = document.createElement("canvas"); ノ.width = ノ.height = 160;
    const ng = ノ.getContext("2d"); const im = ng.createImageData(160, 160);
    for (let i = 0; i < im.data.length; i += 4) { const v = 105 + Math.random() * 100;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    ng.putImageData(im, 0, 0);
    g.save(); g.globalCompositeOperation = "soft-light"; g.globalAlpha = 0.5;
    g.fillStyle = g.createPattern(ノ, "repeat"); g.fillRect(0, 0, W, H); g.restore();
  }
  g.save(); g.globalCompositeOperation = "multiply";
  const v2 = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.5, W / 2, H / 2, Math.max(W, H) * 0.72);
  v2.addColorStop(0, "rgba(255,255,255,1)"); v2.addColorStop(1, "rgba(150,146,120,0.85)");
  g.fillStyle = v2; g.fillRect(0, 0, W, H); g.restore();
}


/* ---- 組の中の持ち場（戦列の形：前列が組の前縁、後ろへ五列） ---- */
/* 散らばりは、定規で引いた格子に見えぬ程度に広く取る（GDD 8.11）。

   人の列は真っ直ぐには並ばない。端は遅れ、中ほどは押し出される。
   散らばりを ±〇.四歩から ±〇.八歩へ広げ、列そのものも弓なりに撓ませる。
   それでも前列は前列のまま（row は変えない）なので、戦列の読みは崩れない。 */
const 持場 = [];
{ 種 = 13;
  for (let i = 0; i < 50; i++) { const col = i % 10, row = (i / 10) | 0;
    const 弓 = Math.cos(((col - 4.5) / 4.5) * (Math.PI / 2)) * 0.95;   // 中ほどが前へ出る
    持場.push([(col - 4.5) * 1.9 + (row % 2) * 0.8 + (R() - 0.5) * 1.6,
      -8 + row * 2.6 - 弓 + (R() - 0.5) * 1.5, row]); } }
const 馬持場 = [];
{ 種 = 29;
  for (let i = 0; i < 50; i++) { const col = i % 10, row = (i / 10) | 0;
    const 弓 = Math.cos(((col - 4.5) / 4.5) * (Math.PI / 2)) * 1.3;
    馬持場.push([(col - 4.5) * 3.1 + (row % 2) * 1.2 + (R() - 0.5) * 2.2,
      -8 + row * 3.6 - 弓 + (R() - 0.5) * 2.0, row]); } }

/* ---- 高さ。丘山の持ち上がり（歩）。寄りの見た目だけに使う ---- */
const 山高m = (o) => o.高 || Math.min(200, (o.r || 60) * 0.4);
export function 持上高(x, y) {
  let v = 0;
  for (const o of [...HILLS, ...MOUNTAINS]) {
    const d = Math.hypot(x - o.x, y - o.y);
    if (d < o.r) { const h = Math.min(16, 山高m(o) * 0.08) * Math.cos((d / o.r) * Math.PI / 2);
      if (h > v) v = h; } }
  return v;
}

/* ---- 見た目の状態。盤には書かない（WeakMapは記録にも載らない） ---- */
const 組態 = new WeakMap();
const 盤態 = new WeakMap();
const 組の態 = (q) => { let s = 組態.get(q);
  if (!s) { s = { dx: q.x, dy: q.y, sx: new Float32Array(50), sy: new Float32Array(50),
    借り: 0, 前qx: q.x, 前qy: q.y,
    生: new Uint8Array(50), 歩距: new Float32Array(50), 速: new Float32Array(50),
    進x: new Float32Array(50), 進y: new Float32Array(50),
    初: false, prevMen: q.men, prevCool: q.cool || 0, 撃刻: -99, 向: q.facing || 0 };
    組態.set(q, s); }
  return s; };
const 盤の態 = (b) => { let s = 盤態.get(b);
  if (!s) { s = { 倒れ: [], 前t: b.t, 飛び数: 0 }; 盤態.set(b, s); }
  return s; };

/* ---- 近景の肌理（GDD 8.11）----

   野の地は、盤いっぱいの一枚に焼いて拡大して映している。寄り七倍で見ると、
   草の一筋は七倍に伸びて滲み、地面はのっぺりした色面になる。兵だけが輪郭の
   はっきりした絵なので、平らな下敷きに紙を貼ったように見えた――遊ぶ側から
   「兵がマップの上に貼り付けられているだけに見える」との申し出はこれである。

   そこで、寄ったときだけ、地の肌理を「画面の縮尺で」刻む。草の丈も石の粒も
   画面の上で同じ大きさに保つので、寄るほど細かくなる。兵と同じ寸法の肌理が
   足元にあれば、兵は地面の中に立って見える。

   貼り方は型紙である。はじめは一本ずつ筆で引いたが、一コマに七千本では絵が
   重くなった（撮りの実測で三倍遅くなった）。細かい粒だけの型紙を一枚焼いて
   敷き詰めれば、貼るのは六枚で済む。型紙は野の原点に合わせて並べるので、
   画面を動かしても地から浮かない。 */
const 肌理の寸 = 512;
let 肌理札 = undefined;
/* 肌理の型紙を一枚だけ焼く。細かい粒だけで作るので、敷き詰めても継ぎ目が出ない。
   一本ずつ筆で引いていたころは、一コマに七千本を引いて絵が重くなった
   （撮りの実測で三倍遅くなった）。型紙なら貼るのは六枚で済む。 */
function 肌理の型紙() {
  if (肌理札 !== undefined) return 肌理札;
  if (typeof document === "undefined") { 肌理札 = null; return null; }
  const n = document.createElement("canvas");
  n.width = 肌理の寸; n.height = 肌理の寸;
  const g = n.getContext("2d");
  種 = 4649;
  g.lineWidth = 1; g.lineCap = "butt";
  const 色 = ["rgba(86,96,54,0.46)", "rgba(126,134,80,0.40)", "rgba(198,200,142,0.34)"];
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = 色[k];
    g.beginPath();
    for (let i = 0; i < 2600; i++) {
      const x = R() * 肌理の寸, y = R() * 肌理の寸;
      const a = -1.45 + (R() - 0.5) * 0.7, L = 2 + R() * 3.4;
      g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
    }
    g.stroke();
  }
  /* 小石と土くれ */
  g.fillStyle = "rgba(118,110,88,0.34)";
  g.beginPath();
  for (let i = 0; i < 900; i++) {
    const x = R() * 肌理の寸, y = R() * 肌理の寸;
    g.rect(x, y, 1 + (R() < 0.3 ? 1 : 0), 1);
  }
  g.fill();
  肌理札 = n;
  return n;
}
export function 近景の肌理(ctx, cam, W, H, dpr) {
  const s = cam.s;
  /* 一人ずつ描き始める寄り（個人閾）に合わせて出す。別の閾にすると、
     兵が人型になる寄りと肌理の出る寄りがずれて、地面だけが後から変わる。 */
  if (s < 個人閾) return;
  const 濃 = Math.min(1, (s - 個人閾) / 1.4);            // 寄るほど濃く出す
  const n = 肌理の型紙(); if (!n) return;
  /* 画面の座標で貼る。こうすれば草の丈は寄りによらず同じ太さに保たれ、
     盤の原点に合わせて位置を決めるので、画面を動かしても地から浮かない。 */
  const sx = W / 2 - cam.x * s, sy = H / 2 - cam.y * s;   // 野の原点の画面座標
  const 左 = Math.max(0, sx), 上 = Math.max(0, sy);
  const 右 = Math.min(W, sx + FIELD.w * s), 下 = Math.min(H, sy + FIELD.h * s);
  if (右 <= 左 || 下 <= 上) return;
  ctx.save();
  /* 画面の座標へ戻す。画素の倍（dpr）を掛け忘れると、画素の細かい画面では
     三分の一しか貼られない――携帯はたいてい三倍である。 */
  ctx.setTransform(dpr || 1, 0, 0, dpr || 1, 0, 0);
  ctx.beginPath(); ctx.rect(左, 上, 右 - 左, 下 - 上); ctx.clip();
  ctx.globalAlpha = 濃;
  const T = 肌理の寸;
  const 始x = 左 - (((左 - sx) % T) + T) % T;
  const 始y = 上 - (((上 - sy) % T) + T) % T;
  for (let x = 始x; x < 右; x += T) for (let y = 始y; y < 下; y += T) ctx.drawImage(n, x, y);
  ctx.restore();
}

/* ---- 本陣衆（将・旗持・馬廻）の見た目 ---- */
const 本陣態 = new WeakMap();
const 本陣の数 = 25;                       /* 五×五。中が将、その隣が旗持 */
/* 馬廻の席順。将（十二番）に近いほうから埋める。

   番の若い順に埋めていたころは、馬廻が六騎の小勢だと上の一列だけが埋まり、
   「将の前に一列が並ぶ」形になって本陣に見えなかった。近い席から埋めれば、
   何騎であっても将を囲む輪になる。 */
const 馬廻の席順 = (() => {
  const a = [];
  for (let k = 0; k < 本陣の数; k++) {
    if (k === 12 || k === 13) continue;            // 将と旗持の席
    a.push(k);
  }
  const d = (k) => Math.hypot((k % 5) - 2, ((k / 5) | 0) - 2);
  a.sort((x, z) => d(x) - d(z) || x - z);
  return a;
})();
const 本陣の態 = (c) => { let t = 本陣態.get(c);
  if (!t) { t = { x: new Float32Array(本陣の数), y: new Float32Array(本陣の数),
    歩距: new Float32Array(本陣の数), 速: new Float32Array(本陣の数),
    進x: new Float32Array(本陣の数), 進y: new Float32Array(本陣の数),
    数: 0, 初: false, 前x: 0, 前y: 0 };
    本陣態.set(c, t); }
  return t; };

/* 本陣衆を進める。塊として本陣に据え、隊と一緒に動く。
   描くぶんの兵は、本陣に近い組から少しずつ借りて差し引く（絵は盤を偽らない）。 */
function 本陣衆を進める(c, b, dt, 本x, 本y) {
  const t = 本陣の態(c);
  const 兵 = c.squads.reduce((a, q) => a + (q.men > 0 ? q.men : 0), 0);
  /* 馬廻の数は隊の大きさに見合わせる。小勢に四十騎の馬廻は立たない。 */
  const 廻 = Math.max(10, Math.min(23, Math.round(兵 / 260)));
  t.数 = 2 + 廻;
  /* 借りを割り当て直す。本陣に近い組から、一組につき六人まで。 */
  for (const q of c.squads) 組の態(q).借り = 0;
  {
    let 残 = 廻;
    const 近い = c.squads.filter((q) => q.men > 0)
      .sort((a, z) => (Math.hypot(a.x - 本x, a.y - 本y) - Math.hypot(z.x - 本x, z.y - 本y)));
    for (const q of 近い) {
      if (残 <= 0) break;
      const n = Math.min(6, 残, Math.max(0, Math.min(50, Math.round(q.men)) - 4));
      組の態(q).借り = n; 残 -= n;
    }
  }
  /* 盤が隊を飛ばしたら、塊も同じだけ平行移動する */
  if (t.初) {
    const jx = 本x - t.前x, jy = 本y - t.前y;
    if (Math.hypot(jx, jy) > 56 * dt * 1.6 + 1.5) {
      for (let n = 0; n < 本陣の数; n++) { t.x[n] += jx; t.y[n] += jy; }
    }
  }
  t.前x = 本x; t.前y = 本y;
  const 向 = c.facing || 0;
  const lx = Math.cos(向 + Math.PI / 2), ly = Math.sin(向 + Math.PI / 2);
  const bx = -Math.cos(向), by = -Math.sin(向);
  for (let n = 0; n < t.数; n++) {
    /* 席。五×五の二十五席のうち、十二番が将、十三番が旗持。
       残りが馬廻で、将に近い席から埋める（馬廻の席順）。 */
    const 席 = n === 0 ? 12 : n === 1 ? 13 : 馬廻の席順[Math.min(馬廻の席順.length - 1, n - 2)];
    const 列 = 席 % 5, 行 = (席 / 5) | 0;
    /* 間合いは詰める。広いと歩兵の列に紛れて、本陣の塊として読めない */
    const tx = 本x + lx * (列 - 2) * 4.6 + bx * (行 - 2) * 4.2;
    const ty = 本y + ly * (列 - 2) * 4.6 + by * (行 - 2) * 4.2;
    if (!t.初) { t.x[n] = tx; t.y[n] = ty; t.速[n] = 0; continue; }
    const vx = tx - t.x[n], vy = ty - t.y[n], d = Math.hypot(vx, vy);
    let mv = 0;
    if (d > 100) { t.x[n] = tx; t.y[n] = ty; }
    else if (d > 0.02) {
      mv = Math.min(d, 130 * dt);
      t.x[n] += vx / d * mv; t.y[n] += vy / d * mv;
      t.進x[n] += (vx / d - t.進x[n]) * Math.min(1, dt * 3);
      t.進y[n] += (vy / d - t.進y[n]) * Math.min(1, dt * 3);
    }
    t.歩距[n] += mv;
    t.速[n] += ((dt > 0 ? mv / dt : 0) - t.速[n]) * Math.min(1, dt * 6);
  }
  t.初 = true;
}

/* ---- 見た目の状態を進める。読みは盤から、書きは WeakMap だけ ----
   nowSec は実時間（秒）。viewRect {x0,y0,x1,y1} の外の組は飛ばす（null なら全部）。 */
export function 新絵状態を進める(b, nowSec, viewRect) {
  const 態 = 盤の態(b);
  /* 刻は盤のもの（b.t）を使う（GDD 8.11）。

     実時間で足を動かしていたころは、盤を通常で進めると隊のほうが速く、
     兵がついて行けずに瞬間移動していた――これが「ヌメっと動く」の正体である。
     盤の刻で動かせば、どの速さでも兵は隊と同じ歩調で歩く。
     盤を止めれば兵も止まる。それが道理である。 */
  const dt = Math.max(0, Math.min(0.25, b.t - 態.前t));
  態.前t = b.t;
  if (dt <= 0) return 0;
  for (const c of b.corps) {
    if (c.dead || c.destroyed) continue;
    if (viewRect && (c.x < viewRect.x0 - 160 || c.x > viewRect.x1 + 160
      || c.y < viewRect.y0 - 160 || c.y > viewRect.y1 + 160)) continue;
    /* 本陣衆――将・旗持・馬廻を一つの塊にする（GDD 8.11）。

       かつては「馬廻のための方陣」を別に組み、本陣の近くにいる騎馬の組から
       兵を連れてきて並べ直していた。これが三つの不具合を生んだ。

         一、連れてくる組が本陣から七十歩より遠いと、一騎も来ない（将が独り）
         二、来ても、組の持ち場と方陣とで引っぱり合うので、隊列から浮く
         三、馬印は将とは別に置いていたので、離れて漂う

       いまは、将・旗持・馬廻を一つの塊として本陣に据え、塊ごと動かす。
       組から兵を連れてくるのではなく、この塊のぶんだけ兵を描き、そのぶんを
       近くの組から差し引く（下の 借り）。数は増えも減りもしないし、
       塊は何があっても離れようがない。 */
    const 本x = c.gx == null ? c.x : c.gx, 本y = c.gy == null ? c.y : c.gy;
    c.本陣 = { x: 本x, y: 本y };
    本陣衆を進める(c, b, dt, 本x, 本y);

    /* 馬廻の陣（五×五）が占める四角。ほかの兵はこの四角を避ける。
       崩れた隊・退く隊では避けない（陣形どころではない）。 */
    const 本x2 = 本x, 本y2 = 本y;
    const 陣向2 = c.facing || 0;
    const 陣fx = Math.cos(陣向2), 陣fy = Math.sin(陣向2);
    const 陣横半 = 2 * 4.6 + 3.4, 陣奥半 = 2 * 4.2 + 3.4;
    const 本陣よけ = !(c.routed || c.withdraw);
    for (const q of c.squads) {
      const s = 組の態(q);
      /* 発砲の刻。cool が跳ね上がったら、いま放った */
      if ((q.cool || 0) > s.prevCool + 0.4) s.撃刻 = b.t;
      s.prevCool = q.cool || 0;
      /* 盤が組を飛ばしたときは、兵も組ごと同じだけ平行移動する（GDD 8.11）。

         盤は組をときどき飛ばす（陣形の組み直し、はぐれの繕い、盤に収める）。
         絵の兵が一人ずつ歩いて追うと、近い者から順に着くので、隊が
         「打ち寄せる波」のように現れる――遊ぶ側の申し出はこれである。
         塊ごと同じだけ動かせば、並びを保ったまま移る。歩幅は積まない
         （歩いていないのだから、足も出ない）。 */
      {
        const jx2 = q.x - s.前qx, jy2 = q.y - s.前qy;
        const j = Math.hypot(jx2, jy2);
        const 歩ける = (q.type === "kiba" ? 56 : 34) * dt * 1.6 + 1.5;
        if (s.初 && j > 歩ける) {
          態.飛び数++;
          s.dx += jx2; s.dy += jy2;
          for (let n = 0; n < 50; n++) { s.sx[n] += jx2; s.sy[n] += jy2; }
        }
        s.前qx = q.x; s.前qy = q.y;
      }
      /* 組の足：目標（盤の位置）へ、歩幅の上限で寄る */
      { const ddx = q.x - s.dx, ddy = q.y - s.dy, d = Math.hypot(ddx, ddy);
        /* 組を追う点は、組より速くなければ置いて行かれる。
           遅く取っていたころは、絵の兵が組から六十六歩も遅れた。
           組の足（騎馬五十六・徒三十四）の三倍を取り、瞬間移動だけを均す。 */
        if (!s.初 || d > 200) { s.dx = q.x; s.dy = q.y; }
        else if (d > 0.02) { const mv = Math.min(d, (q.type === "kiba" ? 170 : 110) * dt);
          s.dx += ddx / d * mv; s.dy += ddy / d * mv; } }
      /* 向きの均し */
      { let df = (q.facing || 0) - s.向;
        while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2;
        s.向 += df * Math.min(1, dt * 2.2); }
      /* 倒れ：減ったぶんは、立っていた場所に倒れて残る */
      const alive = Math.max(0, Math.min(50, Math.round(q.men)));
      const 前alive = Math.max(0, Math.min(50, Math.round(s.prevMen)));
      if (alive < 前alive && s.初) {
        for (let n = alive; n < 前alive && 態.倒れ.length < 1600; n++)
          態.倒れ.push({ x: s.sx[n] || q.x, y: s.sy[n] || q.y,
            s: c.日和見 ? "P" : (c.side === "P" ? "P" : "E") });
      }
      s.prevMen = q.men;
      /* 一人ずつの足 */
      const 場 = q.type === "kiba" ? 馬持場 : 持場;
      const th = s.向, lx = Math.cos(th + Math.PI / 2), ly = Math.sin(th + Math.PI / 2);
      const bx = -Math.cos(th), by = -Math.sin(th);
      /* 噛み合っていれば、前列は敵との中間まで伸びる（槍合わせの線） */
      const 前 = q.engaged && q.foe ? Math.max(8, Math.min(17, q.foe.d / 2 - 2)) : 8;
      const 刻み = (前 + 2.8) / 4;
      const 押 = q.engaged ? 0.6 - Math.sin(b.t * 0.9 + (q.seed || 0)) * 1.2 : 0;
      for (let n = 0; n < alive; n++) {
        const o = 場[n];
        const 深 = q.engaged
          ? (-前 + o[2] * 刻み + (o[1] - (-8 + o[2] * (q.type === "kiba" ? 3.6 : 2.6))))
          : o[1];
        let tx = s.dx + lx * o[0] + bx * (深 + 押), ty = s.dy + ly * o[0] + by * (深 + 押);
        /* 本陣の陣に、ほかの兵を被せない（GDD 8.11）。

           将と馬廻を本陣に据えたところ、そこは隊の只中なので歩兵の列に埋もれた
           ――遊ぶ側から「武将と馬廻役が埋もれている」との申し出はこれである。

           馬廻は五×五の四角い陣を組む。その四角のぶんだけ、ほかの兵を外へ
           よける（いちど円に避けさせたが、地面に定規の円が浮かび上がって
           かえって作り物に見えた）。よけ方は「いちばん近い辺へ」。
           絵の上だけの話で、盤の組の居場所は動かさない。 */
        if (本陣よけ) {
          const dx3 = tx - 本x2, dy3 = ty - 本y2;
          const 奥3 = dx3 * 陣fx + dy3 * 陣fy;              // 前後（陣の向き）
          const 横3 = -dx3 * 陣fy + dy3 * 陣fx;             // 左右
          if (Math.abs(奥3) < 陣奥半 && Math.abs(横3) < 陣横半) {
            if (陣横半 - Math.abs(横3) <= 陣奥半 - Math.abs(奥3)) {
              const 先 = 横3 >= 0 ? 陣横半 : -陣横半, 差 = 先 - 横3;
              tx += -陣fy * 差; ty += 陣fx * 差;
            } else {
              const 先 = 奥3 >= 0 ? 陣奥半 : -陣奥半, 差 = 先 - 奥3;
              tx += 陣fx * 差; ty += 陣fy * 差;
            }
          }
        }
        if (!s.生[n] || !s.初) { s.sx[n] = tx; s.sy[n] = ty; s.生[n] = 1; s.速[n] = 0; continue; }
        const vx = tx - s.sx[n], vy = ty - s.sy[n], d = Math.hypot(vx, vy);
        let mv = 0;
        /* 飛びは上で組ごと平行移動して捌いた。ここで瞬間移動させるのは、
           よほど離れたとき（盤の繕いの取りこぼし）だけである。 */
        if (d > 100) { s.sx[n] = tx; s.sy[n] = ty; }
        /* 兵の足は、組の足（騎馬五十六・徒三十四）より速く取る。
           遅いと、組が走り続けるあいだ兵が置いて行かれ、百八十歩も遅れた。 */
        else if (d > 0.02) { mv = Math.min(d, (q.type === "kiba" ? 130 : 90) * dt);
          s.sx[n] += vx / d * mv; s.sy[n] += vy / d * mv;
          /* 進む向き。均しておかないと、持ち場の細かな直しで体がくるくる回る */
          s.進x[n] += (vx / d - s.進x[n]) * Math.min(1, dt * 3);
          s.進y[n] += (vy / d - s.進y[n]) * Math.min(1, dt * 3); }
        /* 歩いた距離で拍を回す（GDD 8.11）。

           時計で回していたころは、盤を微速にすると体だけ止まり、位置だけが
           滑っていった――遊ぶ側の目には「ヌメっと動く」と映る。
           足は踏んだ地べたのぶんだけ出るのが道理である。歩幅で回せば、
           どんな速さでも足が地に着き、滑りは消える。 */
        /* 歩幅に積むのは、踏んだ地べたのぶん――そのまま mv である。

           いちど「組の足（騎馬五十六・徒三十四）より速いぶんは積まない」と
           蓋をしてみたが、これは逆であった。置いて行かれた兵が駆けて追いつく
           とき、足はその速さで回らねばならない。蓋をすると足が地面より遅く
           回り、かえって滑って見える（盤の刻を細かく取ったとき、歩幅と
           道のりの見合いが一.〇〇から〇.四五まで落ちた）。 */
        s.歩距[n] += mv;
        s.速[n] += ((dt > 0 ? mv / dt : 0) - s.速[n]) * Math.min(1, dt * 6);
      }
      for (let n = alive; n < 50; n++) s.生[n] = 0;
      s.初 = true;
    }
  }
  return dt;
}

/* 試験のための覗き窓。見た目の状態（歩いた距離・足の速さ）を読むだけ。 */
export function 組の見た目(q) { return 組態.get(q) || null; }
export function 盤の見た目(b) { return 盤態.get(b) || null; }

const 向き八 = (vx, vy) => { const a = Math.atan2(vy, vx);
  return ((Math.round(a / (Math.PI / 8)) % 16) + 16) % 16; };

/* ---- 将と旗持（GDD 8.11）----

   隊の本陣（gx, gy＝兵の重心から後ろ二列目。名札もここに出る）に、
   兜と甲冑の将が馬上にある。大きさは馬廻と同じで、鍬形の前立て・面頬・
   大袖・馬鎧だけで足軽と見分ける。

   将は指物（背旗）を負わない――背の指物は足軽・母衣衆・使番の印であって、
   隊を率いる将のものではない。将の居場所は、かたわらの旗持が掲げる馬印で
   示す。馬印は格で分ける。
     一般の将 … 長旗（家の色の幟）
     総大将   … 金の扇
     大名     … 金の唐傘（一段。縁に白熊の毛を回す）
   ここにあるのは描きだけで、理には一切関わらない。 */
function 武将図(g, x, y, s, K, 案, t) {
  const 毛 = "#3E2E20";
  const 影 = (fn) => { g.save(); g.shadowColor = "rgba(24,22,16,0.4)"; g.shadowBlur = 0.5 * s;
    g.shadowOffsetX = -0.3 * s; g.shadowOffsetY = 0.4 * s; fn(); g.restore(); };
  /* ── 馬（横向き・右を向く）。足軽の馬を下敷きに、ひと回り大きく ── */
  g.fillStyle = "rgba(24,26,18,0.32)";
  g.beginPath(); g.ellipse(x + 0.3 * s, y + 0.25 * s, 4.0 * s, 1.1 * s, 0, 0, 7); g.fill();
  /* 奥の脚 */
  g.strokeStyle = shade(毛, 0.45); g.lineCap = "round";
  for (const [dx, 曲] of [[2.5, 0.25], [-2.3, -0.2]]) {
    g.lineWidth = 0.52 * s;
    g.beginPath(); g.moveTo(x + dx * s, y - 2.6 * s);
    g.lineTo(x + (dx + 曲) * s, y - 1.2 * s); g.stroke();
    g.lineWidth = 0.34 * s;
    g.beginPath(); g.moveTo(x + (dx + 曲) * s, y - 1.2 * s);
    g.lineTo(x + (dx + 曲 * 1.6) * s, y - 0.1 * s); g.stroke(); }
  /* 尾 */
  g.strokeStyle = shade(毛, 0.4);
  for (const k of [-0.2, 0, 0.2]) { g.lineWidth = 0.22 * s;
    g.beginPath(); g.moveTo(x - 3.5 * s, y - 4.4 * s);
    g.quadraticCurveTo(x - 4.5 * s, y - 3.0 * s + k * s, x - 4.2 * s, y - 0.9 * s + k * 0.6 * s);
    g.stroke(); }
  /* 胴（尻と肩の二つの山） */
  const g馬 = g.createLinearGradient(x, y - 5.6 * s, x, y - 2.0 * s);
  g馬.addColorStop(0, shade(毛, 1.34)); g馬.addColorStop(0.55, 毛); g馬.addColorStop(1, shade(毛, 0.55));
  影(() => {
    g.beginPath();
    g.moveTo(x - 3.6 * s, y - 3.6 * s);
    g.quadraticCurveTo(x - 3.4 * s, y - 5.4 * s, x - 1.6 * s, y - 5.3 * s);
    g.quadraticCurveTo(x + 0.2 * s, y - 5.0 * s, x + 1.6 * s, y - 5.4 * s);
    g.quadraticCurveTo(x + 2.9 * s, y - 5.7 * s, x + 3.3 * s, y - 4.6 * s);
    g.quadraticCurveTo(x + 3.6 * s, y - 3.6 * s, x + 3.2 * s, y - 2.6 * s);
    g.quadraticCurveTo(x + 1.2 * s, y - 1.7 * s, x - 1.4 * s, y - 1.8 * s);
    g.quadraticCurveTo(x - 3.2 * s, y - 1.9 * s, x - 3.6 * s, y - 3.6 * s);
    g.closePath(); g.fillStyle = g馬; g.fill(); });
  g.strokeStyle = "rgba(18,14,8,0.65)"; g.lineWidth = 0.08 * s; g.stroke();
  /* 馬鎧（胴に掛ける家の色の布。胴の形に沿わせる） */
  g.save();
  g.beginPath();
  g.moveTo(x - 3.4 * s, y - 3.5 * s);
  g.quadraticCurveTo(x - 1.4 * s, y - 2.0 * s, x + 1.4 * s, y - 2.0 * s);
  g.quadraticCurveTo(x + 2.9 * s, y - 2.2 * s, x + 3.2 * s, y - 2.8 * s);
  g.lineTo(x + 3.0 * s, y - 2.2 * s);
  g.quadraticCurveTo(x + 1.2 * s, y - 1.2 * s, x - 1.5 * s, y - 1.3 * s);
  g.quadraticCurveTo(x - 3.0 * s, y - 1.4 * s, x - 3.5 * s, y - 2.8 * s);
  g.closePath(); g.clip();
  g.fillStyle = shade(K.中, 0.95);
  g.fillRect(x - 4 * s, y - 4 * s, 8 * s, 4 * s);
  g.strokeStyle = "rgba(240,232,210,0.5)"; g.lineWidth = 0.12 * s;
  for (const dy of [-2.6, -2.0]) {
    g.beginPath(); g.moveTo(x - 4 * s, y + dy * s); g.lineTo(x + 4 * s, y + dy * s); g.stroke(); }
  g.restore();
  g.strokeStyle = "#B8442F"; g.lineWidth = 0.18 * s;          // 房
  for (let i = -3; i <= 3; i++) {
    g.beginPath(); g.moveTo(x + (i * 0.8 - 0.2) * s, y - 1.5 * s);
    g.lineTo(x + (i * 0.8 - 0.2) * s, y - 0.9 * s); g.stroke(); }
  /* 手前の脚 */
  g.strokeStyle = shade(毛, 0.72);
  for (const [dx, 曲] of [[2.9, 0.3], [-2.7, -0.25]]) {
    g.lineWidth = 0.6 * s;
    g.beginPath(); g.moveTo(x + dx * s, y - 2.4 * s);
    g.lineTo(x + (dx + 曲) * s, y - 1.1 * s); g.stroke();
    g.lineWidth = 0.38 * s;
    g.beginPath(); g.moveTo(x + (dx + 曲) * s, y - 1.1 * s);
    g.lineTo(x + (dx + 曲 * 1.7) * s, y); g.stroke();
    g.fillStyle = "#241C14";
    g.beginPath(); g.ellipse(x + (dx + 曲 * 1.7) * s, y + 0.05 * s, 0.3 * s, 0.18 * s, 0, 0, 7); g.fill(); }
  /* 首と頭（前へ伸ばす） */
  影(() => {
    g.beginPath();
    g.moveTo(x + 2.5 * s, y - 5.0 * s);
    g.quadraticCurveTo(x + 4.0 * s, y - 6.2 * s, x + 4.7 * s, y - 7.1 * s);
    g.lineTo(x + 5.5 * s, y - 6.6 * s);
    g.quadraticCurveTo(x + 4.6 * s, y - 5.2 * s, x + 3.5 * s, y - 3.6 * s);
    g.closePath(); g.fillStyle = shade(毛, 1.08); g.fill(); });
  g.strokeStyle = "rgba(18,14,8,0.6)"; g.lineWidth = 0.08 * s; g.stroke();
  g.save(); g.translate(x + 5.3 * s, y - 7.0 * s); g.rotate(0.55);
  g.fillStyle = shade(毛, 0.9);
  g.beginPath(); g.ellipse(0, 0, 1.15 * s, 0.52 * s, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(18,14,8,0.6)"; g.lineWidth = 0.08 * s; g.stroke();
  g.fillStyle = "#8F8A7A";                                     // 馬面（鉄の面当て）
  g.beginPath(); g.ellipse(0.25 * s, 0, 0.72 * s, 0.34 * s, 0, 0, 7); g.fill();
  g.fillStyle = "#1E1812";
  g.beginPath(); g.ellipse(-0.42 * s, -0.16 * s, 0.13 * s, 0.16 * s, 0, 0, 7); g.fill();
  for (const e of [-1, 1]) {                                   // 耳
    g.beginPath(); g.moveTo(-0.75 * s + e * 0.1 * s, -0.3 * s);
    g.lineTo(-0.85 * s + e * 0.3 * s, -0.95 * s); g.lineTo(-0.5 * s + e * 0.15 * s, -0.3 * s);
    g.closePath(); g.fillStyle = shade(毛, 0.85); g.fill(); }
  g.restore();
  g.strokeStyle = shade(毛, 0.4); g.lineWidth = 0.26 * s;       // たてがみ
  g.beginPath(); g.moveTo(x + 2.7 * s, y - 5.2 * s);
  g.quadraticCurveTo(x + 3.8 * s, y - 6.2 * s, x + 4.6 * s, y - 7.0 * s); g.stroke();
  /* 鞍と乗り手の脚 */
  g.fillStyle = "#3A2C1C";
  g.beginPath(); g.ellipse(x - 0.2 * s, y - 5.3 * s, 1.3 * s, 0.42 * s, 0, 0, 7); g.fill();
  g.strokeStyle = 布; g.lineWidth = 0.5 * s; g.lineCap = "round";
  g.beginPath(); g.moveTo(x - 0.1 * s, y - 5.1 * s); g.lineTo(x + 0.7 * s, y - 3.3 * s); g.stroke();
  g.strokeStyle = "#5A5448"; g.lineWidth = 0.34 * s;            // 脛当
  g.beginPath(); g.moveTo(x + 0.7 * s, y - 3.3 * s); g.lineTo(x + 0.95 * s, y - 2.4 * s); g.stroke();
  /* ── 甲冑の胴（黒漆に家の色の威し）と草摺 ── */
  for (let i = -1; i <= 1; i++) {                              // 草摺
    g.fillStyle = i ? shade(K.中, 0.6) : shade(K.中, 0.78);
    g.beginPath();
    g.moveTo(x + (i * 0.9 - 0.65) * s, y - 5.5 * s);
    g.lineTo(x + (i * 0.9 + 0.25) * s, y - 5.5 * s);
    g.lineTo(x + (i * 1.0 + 0.3) * s, y - 4.3 * s);
    g.lineTo(x + (i * 1.0 - 0.7) * s, y - 4.3 * s);
    g.closePath(); g.fill();
    g.strokeStyle = "rgba(16,14,10,0.5)"; g.lineWidth = 0.06 * s; g.stroke(); }
  const g胴 = g.createLinearGradient(x - 1.4 * s, y - 8.6 * s, x + 1.4 * s, y - 5.4 * s);
  g胴.addColorStop(0, "#241F1A"); g胴.addColorStop(0.5, "#322C24"); g胴.addColorStop(1, "#1C1814");
  影(() => {
    g.beginPath();
    g.moveTo(x - 1.25 * s, y - 8.3 * s);
    g.quadraticCurveTo(x - 0.1 * s, y - 8.7 * s, x + 1.15 * s, y - 8.3 * s);
    g.lineTo(x + 1.35 * s, y - 5.5 * s);
    g.quadraticCurveTo(x - 0.1 * s, y - 5.1 * s, x - 1.45 * s, y - 5.5 * s);
    g.closePath(); g.fillStyle = g胴; g.fill(); });
  g.strokeStyle = "rgba(10,8,6,0.75)"; g.lineWidth = 0.08 * s; g.stroke();
  g.strokeStyle = shade(K.帯, 1.3); g.lineWidth = 0.14 * s;      // 威し（色の紐）
  for (const yy of [-7.8, -7.2, -6.6, -6.0]) {
    g.beginPath(); g.moveTo(x - 1.2 * s, y + yy * s); g.lineTo(x + 1.2 * s, y + yy * s); g.stroke(); }
  /* 大袖（肩の板）。足軽には無い */
  for (const 側 of [-1, 1]) {
    const g袖 = g.createLinearGradient(x + 側 * 1.1 * s, y - 8.2 * s, x + 側 * 2.2 * s, y - 6.2 * s);
    g袖.addColorStop(0, shade(K.中, 側 < 0 ? 0.8 : 1.3)); g袖.addColorStop(1, shade(K.中, 側 < 0 ? 0.5 : 0.85));
    g.beginPath();
    g.moveTo(x + 側 * 1.05 * s, y - 8.2 * s); g.lineTo(x + 側 * 2.1 * s, y - 7.9 * s);
    g.lineTo(x + 側 * 2.0 * s, y - 6.2 * s); g.lineTo(x + 側 * 1.1 * s, y - 6.5 * s);
    g.closePath(); g.fillStyle = g袖; g.fill();
    g.strokeStyle = "rgba(14,12,8,0.6)"; g.lineWidth = 0.07 * s; g.stroke();
    g.strokeStyle = "rgba(16,14,10,0.35)"; g.lineWidth = 0.05 * s;
    for (const k of [0.4, 0.75]) {
      g.beginPath();
      g.moveTo(x + 側 * 1.05 * s, y - 8.2 * s + 1.8 * k * s);
      g.lineTo(x + 側 * 2.1 * s, y - 7.9 * s + 1.75 * k * s); g.stroke(); } }
  /* ── 首・顔・面頬 ── */
  g.strokeStyle = 肌; g.lineWidth = 0.42 * s;
  g.beginPath(); g.moveTo(x - 0.05 * s, y - 8.3 * s); g.lineTo(x + 0.1 * s, y - 8.9 * s); g.stroke();
  g.fillStyle = 肌;
  g.beginPath(); g.ellipse(x + 0.12 * s, y - 9.25 * s, 0.6 * s, 0.66 * s, 0, 0, 7); g.fill();
  g.fillStyle = "#2A2218";
  g.beginPath(); g.ellipse(x + 0.42 * s, y - 9.35 * s, 0.1 * s, 0.13 * s, 0, 0, 7); g.fill();
  if (案 === 2) {                                              // 面頬（鉄の覆面）
    g.fillStyle = "rgba(84,50,34,0.92)";
    g.beginPath();
    g.moveTo(x - 0.46 * s, y - 9.2 * s);
    g.quadraticCurveTo(x + 0.14 * s, y - 8.5 * s, x + 0.72 * s, y - 9.2 * s);
    g.lineTo(x + 0.6 * s, y - 8.95 * s);
    g.quadraticCurveTo(x + 0.12 * s, y - 8.35 * s, x - 0.34 * s, y - 8.95 * s);
    g.closePath(); g.fill(); }
  /* ── 兜 ── */
  const 兜y = y - 10.0 * s, 兜r = 1.0 * s;
  for (let i = 2; i >= 0; i--) {                               // 錣
    g.beginPath();
    g.ellipse(x + 0.1 * s, 兜y + (0.5 + i * 0.26) * s,
      (0.85 + i * 0.2) * s, (0.34 + i * 0.1) * s, 0, 0.1, Math.PI - 0.1);
    g.fillStyle = i % 2 ? "#332E26" : "#453E33"; g.fill();
    g.strokeStyle = "rgba(14,12,8,0.6)"; g.lineWidth = 0.05 * s; g.stroke();
    g.strokeStyle = shade(K.帯, 1.25); g.lineWidth = 0.08 * s;
    g.beginPath();
    g.ellipse(x + 0.1 * s, 兜y + (0.5 + i * 0.26) * s,
      (0.76 + i * 0.2) * s, (0.27 + i * 0.1) * s, 0, 0.35, Math.PI - 0.35); g.stroke(); }
  const g鉢 = g.createRadialGradient(x - 0.25 * s, 兜y - 0.6 * s, 0.1 * s, x + 0.1 * s, 兜y, 兜r * 1.3);
  g鉢.addColorStop(0, "#7A7162"); g鉢.addColorStop(0.5, "#453E33"); g鉢.addColorStop(1, "#272219");
  影(() => {
    g.beginPath();
    g.moveTo(x + 0.1 * s - 兜r, 兜y + 0.26 * s);
    g.quadraticCurveTo(x + 0.1 * s - 兜r * 1.05, 兜y - 兜r * 1.15, x + 0.1 * s, 兜y - 兜r * 1.28);
    g.quadraticCurveTo(x + 0.1 * s + 兜r * 1.05, 兜y - 兜r * 1.15, x + 0.1 * s + 兜r, 兜y + 0.26 * s);
    g.closePath(); g.fillStyle = g鉢; g.fill(); });
  g.strokeStyle = "rgba(12,10,8,0.8)"; g.lineWidth = 0.07 * s; g.stroke();
  g.strokeStyle = "rgba(210,200,170,0.35)"; g.lineWidth = 0.05 * s;    // 筋
  for (const k of [-0.5, 0, 0.5]) {
    g.beginPath();
    g.moveTo(x + 0.1 * s + k * 兜r, 兜y + 0.2 * s);
    g.quadraticCurveTo(x + 0.1 * s + k * 兜r * 0.68, 兜y - 兜r * 0.8,
      x + 0.1 * s + k * 兜r * 0.28, 兜y - 兜r * 1.18); g.stroke(); }
  for (const 側 of [-1, 1]) {                                   // 吹返し
    g.beginPath();
    g.moveTo(x + 0.1 * s + 側 * 兜r * 0.9, 兜y + 0.2 * s);
    g.quadraticCurveTo(x + 0.1 * s + 側 * 兜r * 1.6, 兜y - 0.15 * s,
      x + 0.1 * s + 側 * 兜r * 1.5, 兜y - 0.78 * s);
    g.lineTo(x + 0.1 * s + 側 * 兜r * 0.95, 兜y - 0.42 * s);
    g.closePath(); g.fillStyle = "#453E33"; g.fill();
    g.strokeStyle = "rgba(14,12,8,0.7)"; g.lineWidth = 0.05 * s; g.stroke();
    g.strokeStyle = shade(K.帯, 1.3); g.lineWidth = 0.06 * s;
    g.beginPath();
    g.moveTo(x + 0.1 * s + 側 * 兜r * 1.0, 兜y - 0.02 * s);
    g.lineTo(x + 0.1 * s + 側 * 兜r * 1.4, 兜y - 0.55 * s); g.stroke(); }
  g.strokeStyle = "#1E1A14"; g.lineWidth = 0.16 * s;             // 眉庇
  g.beginPath(); g.ellipse(x + 0.1 * s, 兜y - 兜r * 0.14, 兜r * 0.98, 兜r * 0.4, 0,
    Math.PI * 1.06, Math.PI * 1.94); g.stroke();
  /* ── 前立て（案ごとに形を変える） ── */
  const 眉y = 兜y - 兜r * 0.55, 立x = x + 0.1 * s;
  g.fillStyle = "#E8C24A"; g.strokeStyle = "#8A6E1E"; g.lineWidth = 0.05 * s;
  if (案 === 1) {                                               // 三日月
    g.beginPath();
    g.arc(立x, 眉y - 0.85 * s, 1.25 * s, Math.PI * 1.12, Math.PI * 1.88, false);
    g.arc(立x, 眉y - 1.32 * s, 0.95 * s, Math.PI * 1.84, Math.PI * 1.16, true);
    g.closePath(); g.fill(); g.stroke();
  } else if (案 === 2) {                                        // 鍬形
    for (const 側 of [-1, 1]) {
      g.beginPath();
      g.moveTo(立x + 側 * 0.22 * s, 眉y - 0.05 * s);
      g.quadraticCurveTo(立x + 側 * 1.15 * s, 眉y - 0.8 * s, 立x + 側 * 0.95 * s, 眉y - 2.1 * s);
      g.lineTo(立x + 側 * 0.55 * s, 眉y - 1.72 * s);
      g.quadraticCurveTo(立x + 側 * 0.62 * s, 眉y - 0.7 * s, 立x + 側 * 0.04 * s, 眉y + 0.04 * s);
      g.closePath(); g.fill(); g.stroke(); }
    g.beginPath(); g.arc(立x, 眉y - 0.12 * s, 0.3 * s, 0, 7); g.fill(); g.stroke();
  } else {                                                      // 輪貫
    g.lineWidth = 0.3 * s; g.strokeStyle = "#E8C24A";
    g.beginPath(); g.arc(立x, 眉y - 1.25 * s, 1.0 * s, 0, 7); g.stroke();
    g.lineWidth = 0.06 * s; g.strokeStyle = "#8A6E1E";
    g.beginPath(); g.arc(立x, 眉y - 1.25 * s, 1.15 * s, 0, 7); g.stroke();
    g.beginPath(); g.arc(立x, 眉y - 1.25 * s, 0.85 * s, 0, 7); g.stroke(); }
  /* ── 采配。肩から肘・手・柄・紙房へ順に繋ぐ ── */
  const 肩x = x + 1.1 * s, 肩y = y - 7.9 * s;
  const 振 = Math.sin(t * 1.8) * 0.2;
  const 肘x = 肩x + Math.cos(-0.6 + 振) * 1.15 * s, 肘y = 肩y + Math.sin(-0.6 + 振) * 1.15 * s;
  const 手x = 肘x + Math.cos(-1.45 + 振) * 1.05 * s, 手y = 肘y + Math.sin(-1.45 + 振) * 1.05 * s;
  g.strokeStyle = shade(K.中, 0.9); g.lineWidth = 0.4 * s; g.lineCap = "round";
  g.beginPath(); g.moveTo(肩x, 肩y); g.lineTo(肘x, 肘y); g.stroke();
  g.strokeStyle = "#2E2922"; g.lineWidth = 0.32 * s;
  g.beginPath(); g.moveTo(肘x, 肘y); g.lineTo(手x, 手y); g.stroke();
  g.fillStyle = 肌; g.beginPath(); g.arc(手x, 手y, 0.24 * s, 0, 7); g.fill();
  const 棒 = -1.05 + 振 * 1.2;
  const 先x = 手x + Math.cos(棒) * 1.5 * s, 先y = 手y + Math.sin(棒) * 1.5 * s;
  g.strokeStyle = "#6E4F2C"; g.lineWidth = 0.16 * s;
  g.beginPath(); g.moveTo(手x, 手y); g.lineTo(先x, 先y); g.stroke();
  g.strokeStyle = "rgba(246,242,230,0.95)"; g.lineWidth = 0.09 * s;
  for (let i = 0; i < 7; i++) {
    const a2 = 棒 - 0.5 + i * 0.17 + Math.sin(t * 4 + i) * 0.06;
    g.beginPath(); g.moveTo(先x, 先y);
    g.quadraticCurveTo(先x + Math.cos(a2) * 0.7 * s, 先y + Math.sin(a2) * 0.7 * s,
      先x + Math.cos(a2) * 1.3 * s, 先y + Math.sin(a2) * 1.5 * s); g.stroke(); }
  /* 将は指物（背旗）を負わない。
     背の指物は足軽・母衣衆・使番の印であって、隊を率いる将のものではない。
     将の居場所は、かたわらの旗持が掲げる馬印で示す（下の 旗持 を見よ）。 */
}

/* 旗持（はたもち）。将のかたわらで馬印を掲げる騎馬。
   馬印は家ごとに形が違う――ここでは三つの形を見せる。 */
function 旗持図(g, x, y, s, K, 形, t) {
  const n = 札取り("P", "kiba", 0, 0);
  if (n) g.drawImage(n, x - n.width / 2 * (s / 6.2), y - (n.height - 8) * (s / 6.2),
    n.width * (s / 6.2), n.height * (s / 6.2));
  /* 馬印の竿。乗り手の肩から高く掲げる */
  const 竿x = x - 0.5 * s, 根 = y - 7.0 * s;
  const 先 = y - (形 === "金の唐傘" ? 17.0 : 15.5) * s;
  g.strokeStyle = "#3A2C1A"; g.lineWidth = 0.2 * s; g.lineCap = "round";
  g.beginPath(); g.moveTo(竿x, 根); g.lineTo(竿x, 先); g.stroke();
  const ゆ = Math.sin(t * 1.5) * 0.12 * s;
  g.fillStyle = "#E8C24A"; g.strokeStyle = "#8A6E1E"; g.lineWidth = 0.07 * s;
  if (形 === "金の扇") {
    g.beginPath();
    g.moveTo(竿x, 先 + 0.3 * s);
    g.arc(竿x, 先 + 0.3 * s, 2.0 * s, Math.PI * 1.15, Math.PI * 1.85);
    g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = "rgba(120,92,20,0.6)"; g.lineWidth = 0.05 * s;
    for (let i = 1; i < 5; i++) { const a = Math.PI * (1.15 + 0.7 * i / 5);
      g.beginPath(); g.moveTo(竿x, 先 + 0.3 * s);
      g.lineTo(竿x + Math.cos(a) * 2.0 * s, 先 + 0.3 * s + Math.sin(a) * 2.0 * s); g.stroke(); }
  } else if (形 === "朱の円") {
    g.beginPath(); g.arc(竿x + ゆ, 先 + 1.1 * s, 1.5 * s, 0, 7);
    g.fillStyle = "#C0392B"; g.fill();
    g.strokeStyle = "rgba(246,242,230,0.8)"; g.lineWidth = 0.12 * s; g.stroke();
  } else if (形 === "金の唐傘") {
    /* 大名の馬印。唐傘の形は一段――二段に重ねるのは仏具の天蓋であって
       馬印には見ない。派手さは大きさと、縁に回した白熊（はぐま）の毛で出す。
       白熊は唐牛の毛を染めた飾りで、兜にも馬印にも実際に使われた。 */
    const 揺 = Math.sin(t * 1.3) * 0.1 * s;
    const 傘y = 先 + 2.4 * s, r = 4.2 * s;
    g.save(); g.translate(揺, 0);
    /* 傘の面。中央が高く、縁へ向かって垂れる */
    const g傘 = g.createRadialGradient(竿x - r * 0.3, 傘y - r * 0.6, r * 0.1, 竿x, 傘y - r * 0.1, r * 1.1);
    g傘.addColorStop(0, "#FBE79A"); g傘.addColorStop(0.55, "#EFCB4E"); g傘.addColorStop(1, "#C9A227");
    g.beginPath();
    g.moveTo(竿x - r, 傘y);
    g.quadraticCurveTo(竿x - r * 0.72, 傘y - r * 0.92, 竿x, 傘y - r * 1.02);
    g.quadraticCurveTo(竿x + r * 0.72, 傘y - r * 0.92, 竿x + r, 傘y);
    g.quadraticCurveTo(竿x + r * 0.5, 傘y + 0.5 * s, 竿x, 傘y + 0.38 * s);
    g.quadraticCurveTo(竿x - r * 0.5, 傘y + 0.5 * s, 竿x - r, 傘y);
    g.closePath(); g.fillStyle = g傘; g.fill();
    g.strokeStyle = "#8A6E1E"; g.lineWidth = 0.08 * s; g.stroke();
    /* 骨 */
    g.strokeStyle = "rgba(140,108,24,0.5)"; g.lineWidth = 0.05 * s;
    for (const k of [-0.82, -0.5, -0.17, 0.17, 0.5, 0.82]) {
      g.beginPath(); g.moveTo(竿x, 傘y - r * 0.98);
      g.quadraticCurveTo(竿x + k * r * 0.72, 傘y - r * 0.45, 竿x + k * r, 傘y + 0.08 * s); g.stroke(); }
    /* 白熊（はぐま）の毛。縁をぐるりと回す */
    for (let i = -8; i <= 8; i++) {
      const t2 = i / 8;
      const px = 竿x + t2 * r * 0.98;
      const py = 傘y + 0.3 * s - Math.abs(t2) * Math.abs(t2) * 0.45 * s;
      const 長 = (0.9 + Math.cos(t2 * 1.4) * 0.45) * s;
      const ゆ2 = Math.sin(t * 2.1 + i * 0.7) * 0.1 * s;
      g.strokeStyle = "rgba(248,246,240,0.95)"; g.lineWidth = 0.17 * s; g.lineCap = "round";
      g.beginPath(); g.moveTo(px, py);
      g.quadraticCurveTo(px + ゆ2, py + 長 * 0.6, px + ゆ2 * 1.6, py + 長); g.stroke();
      g.strokeStyle = "rgba(214,208,196,0.8)"; g.lineWidth = 0.07 * s;
      g.beginPath(); g.moveTo(px, py);
      g.quadraticCurveTo(px + ゆ2, py + 長 * 0.6, px + ゆ2 * 1.6, py + 長 * 0.92); g.stroke(); }
    /* てっぺんの露（小さな玉）。宝珠のような火炎は付けない */
    g.fillStyle = "#F6DC7A"; g.strokeStyle = "#8A6E1E"; g.lineWidth = 0.07 * s;
    g.beginPath(); g.arc(竿x, 傘y - r * 1.12, 0.3 * s, 0, 7); g.fill(); g.stroke();
    g.restore();
  } else if (形 === "千成瓢箪") {                   // 大名の馬印・その二
    g.fillStyle = "#E8C24A"; g.strokeStyle = "#8A6E1E"; g.lineWidth = 0.06 * s;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.283 + t * 0.4;
      const px = 竿x + Math.cos(a) * (0.9 + (i % 2) * 0.5) * s;
      const py = 先 + 1.4 * s + Math.sin(a) * (0.7 + (i % 2) * 0.4) * s;
      g.beginPath();
      g.ellipse(px, py - 0.45 * s, 0.34 * s, 0.4 * s, 0, 0, 7); g.fill(); g.stroke();
      g.beginPath();
      g.ellipse(px, py + 0.3 * s, 0.52 * s, 0.6 * s, 0, 0, 7); g.fill(); g.stroke(); }
  } else {                                        // 長旗（幟）
    g.fillStyle = shade(K.帯, 1.25);
    g.beginPath();
    g.moveTo(竿x + 0.12 * s, 先);
    g.lineTo(竿x + 2.0 * s + ゆ, 先 + 0.25 * s);
    g.lineTo(竿x + 1.9 * s + ゆ, 先 + 5.2 * s);
    g.lineTo(竿x + 0.12 * s, 先 + 4.9 * s);
    g.closePath(); g.fill();
    g.fillStyle = shade(K.濃, 1.06);
    g.beginPath();
    g.moveTo(竿x + 0.12 * s, 先 + 2.8 * s);
    g.lineTo(竿x + 1.95 * s + ゆ, 先 + 3.0 * s);
    g.lineTo(竿x + 1.9 * s + ゆ, 先 + 5.2 * s);
    g.lineTo(竿x + 0.12 * s, 先 + 4.9 * s);
    g.closePath(); g.fill();
    g.strokeStyle = "rgba(246,242,230,0.6)"; g.lineWidth = 0.07 * s;
    g.beginPath();
    g.moveTo(竿x + 0.12 * s, 先); g.lineTo(竿x + 2.0 * s + ゆ, 先 + 0.25 * s);
    g.lineTo(竿x + 1.9 * s + ゆ, 先 + 5.2 * s); g.lineTo(竿x + 0.12 * s, 先 + 4.9 * s);
    g.closePath(); g.stroke(); }
}


/* 将の格を見分ける。大名＞総大将＞一般の将 */
function 将の格(b, c) {
  if (c.gen && c.gen.lord) return "大名";
  if (c.筋 && (c.筋.家康 || c.筋.大将)) return "総大将";
  if (c.大将) return "総大将";
  return "将";
}
const 馬印の形 = { 大名: "金の唐傘", 総大将: "金の扇", 将: "長旗" };

/* ---- 一人ずつを描く。drawBattle の世界座標の中で呼ばれる ---- */
export function 新絵の兵描き(ctx, b, 隊ら, cam, W, H, nowSec) {
  札を焼く();
  const dt = 新絵状態を進める(b, nowSec, {
    x0: cam.x - W / 2 / cam.s, x1: cam.x + W / 2 / cam.s,
    y0: cam.y - H / 2 / cam.s, y1: cam.y + H / 2 / cam.s });
  const 態 = 盤の態(b);
  /* 直接描き（連続位相）は型紙貼りより費えが重い。見える組が絞れたときだけ使う */
  let 見組 = 0;
  { const px0 = cam.x - W / 2 / cam.s - 40, px1 = cam.x + W / 2 / cam.s + 40;
    const py0 = cam.y - H / 2 / cam.s - 60, py1 = cam.y + H / 2 / cam.s + 40;
    for (const c of 隊ら) for (const q of c.squads) {
      if (q.men > 0 && q.x > px0 && q.x < px1 && q.y > py0 && q.y < py1) 見組++; } }
  const 骨度 = (見組 <= 28) ? Math.max(0, Math.min(1, (cam.s - 滑閾) / 0.7)) : 0;
  const x0 = cam.x - W / 2 / cam.s - 40, x1 = cam.x + W / 2 / cam.s + 40;
  const y0 = cam.y - H / 2 / cam.s - 60, y1 = cam.y + H / 2 / cam.s + 40;
  const 見える = (x, y) => x > x0 && x < x1 && y > y0 && y < y1;
  /* 倒れた者 */
  for (const e of 態.倒れ) {
    if (!見える(e.x, e.y)) continue;
    { const n = 倒れ札(e.s);
      if (n) { ctx.globalAlpha = 0.85;
        ctx.drawImage(n, e.x - n.width / 2 * 0.056, e.y - 持上高(e.x, e.y) - (n.height - 8) * 0.056,
          n.width * 0.056, n.height * 0.056);
        ctx.globalAlpha = 1; } }
  }
  const 並 = [];
  for (const c of 隊ら) {
    const 側 = c.日和見 ? "Y" : (c.side === "P" ? "P" : "E");
    for (const q of c.squads) {
      if (q.men <= 0) continue;
      const s = 組態.get(q); if (!s || !s.初) continue;
      /* 本陣衆へ貸したぶんは、この組では描かない（数を増やさないため） */
      const alive = Math.max(0, Math.min(50, Math.round(q.men)) - (s.借り || 0));
      const th = s.向;
      const dir基 = 向き八(Math.cos(th), Math.sin(th));
      const 撃 = (b.t - s.撃刻) / 1.5;
      for (let n = 0; n < alive; n++) {
        if (!s.生[n]) continue;
        if (並.length > 12000) break;
        const wx = s.sx[n], wy = s.sy[n];
        if (!見える(wx, wy)) continue;
        /* 拍：歩き・突き・斉射。寄りが深ければ割り切れない拍で滑らかに */
        let fr = 0, dir = dir基;
        const 場 = q.type === "kiba" ? 馬持場 : 持場;
        const 歩速 = s.速[n];
        /* 働きの順（GDD 8.11）。

           歩みを先に見ていたころは、槍を合わせた前列が持ち場を直すたびに
           「歩き」と見なされ、突きが一度も出なかった。
           槍を合わせているなら突く。放ったなら構えを解く。それ以外で
           足が出ているときだけ歩く――働きのほうが先である。 */
        if (q.engaged && 場[n][2] < 2 && 歩速 < 14) {
          /* 突き：合戦の刻で回す。盤を遅くすれば、槍もゆっくり繰り出される */
          const ph = (b.t * 0.55 + (q.seed || 0) + n * 0.17) % 1;
          fr = 骨度 > 0 ? 3 + ph * 3.999 : 3 + Math.min(3, (ph * 4) | 0);
        } else if (撃 >= 0 && 撃 < 1 && (q.type === "yumi" || q.type === "teppo")) {
          fr = 骨度 > 0 ? 3 + Math.min(3.999, 撃 * 4) : 3 + Math.min(3, (撃 * 4) | 0);
        } else if (歩速 > 2.5) {
          /* 歩み：歩幅（騎馬は十四歩、徒は九歩）ごとに一周 */
          const 歩幅 = q.type === "kiba" ? 14 : 9;
          const w = (s.歩距[n] / 歩幅) % 1;
          if (Math.hypot(s.進x[n], s.進y[n]) > 0.3) dir = 向き八(s.進x[n], s.進y[n]);
          fr = 骨度 > 0 ? 1 + w * 2 : 1 + (w < 0.5 ? 0 : 1);
        }
        /* 丈を少しずつ変える（GDD 8.11）。

           型紙を色ちがいで焼けば具足の幅は出せるが、十六方向×七拍ぶん増える
           ので三十MBが六十MBになる。携帯では危うい。丈を〇.九五〜一.〇六の
           あいだで散らすだけなら費えは零で、「同じ判を押した」感じはほどけ
           る。馬の毛色は型紙の側で既に三色に散っている。 */
        const 丈 = 0.95 + (((q.seed || 0) * 31 + n * 7) % 12) / 100;
        並.push({ wx, wy, 地y: wy, 側, 型: q.type, dir: Math.round(dir), fr: Math.round(fr), 丈,
          直: 骨度 > 0 ? { dir, fr, 型: q.type, 側, 乱: ((q.seed || 0) * 31 + n * 7) % 97 / 97 } : null });
      }
      /* 組の小旗（後列に二本）。側の色でまとまりを示す */
      if (cam.s > 2.2) {
        const lx = Math.cos(th + Math.PI / 2), ly = Math.sin(th + Math.PI / 2);
        const bx = -Math.cos(th), by = -Math.sin(th);
        for (const fx of [-6, 6]) {
          const wx = s.dx + lx * fx + bx * 12, wy = s.dy + ly * fx + by * 12;
          if (!見える(wx, wy)) continue;
          並.push({ wx, wy, 地y: wy, 旗: 側 });
        }
      }
    }
  }
  /* 本陣衆――将・旗持・馬廻。一つの塊として本陣に立つ（GDD 8.11）。
     並びの中へ入れて、前後を正しく重ねる。 */
  for (const c of 隊ら) {
    const 側 = c.日和見 ? "Y" : (c.side === "P" ? "P" : "E");
    const t = 本陣態.get(c); if (!t || !t.初) continue;
    for (let n = 0; n < t.数; n++) {
      const wx = t.x[n], wy = t.y[n];
      if (!見える(wx, wy)) continue;
      if (n === 0) { 並.push({ wx, wy, 地y: wy + 0.1, 将: { c, 側 } }); continue; }
      if (n === 1) { 並.push({ wx, wy, 地y: wy + 0.08, 旗持: { c, 側 } }); continue; }
      /* 馬廻。一騎ずつ家の色の指物を立てるので、遠目にも「旗の群れ」として読める */
      const 進 = Math.hypot(t.進x[n], t.進y[n]) > 0.3
        ? 向き八(t.進x[n], t.進y[n]) : 向き八(Math.cos(c.facing || 0), Math.sin(c.facing || 0));
      let fr = 0;
      if (t.速[n] > 2.5) { const w = (t.歩距[n] / 14) % 1; fr = 1 + (w < 0.5 ? 0 : 1); }
      並.push({ wx, wy, 地y: wy, 側, 型: "kiba", dir: 進, fr, 直: null,
        丈: 0.96 + ((n * 13) % 10) / 100 });
      並.push({ wx, wy, 地y: wy + 0.05, 指: 側 });
    }
  }
  並.sort((a, z) => a.地y - z.地y);
  for (const p of 並) {
    const y = p.wy - 持上高(p.wx, p.wy);
    if (p.指) {                                    // 馬廻の指物
      const K2 = 具側[p.指];
      ctx.strokeStyle = "#3A2C1A"; ctx.lineWidth = 0.1;
      ctx.beginPath(); ctx.moveTo(p.wx - 1.4, y - 3.2); ctx.lineTo(p.wx - 1.6, y - 7.4); ctx.stroke();
      ctx.fillStyle = shade(K2.帯, 1.25);
      ctx.fillRect(p.wx - 1.58, y - 7.4, 0.85, 1.6);
      continue;
    }
    if (p.旗) {
      ctx.strokeStyle = "#3A2C1A"; ctx.lineWidth = 0.12;
      ctx.beginPath(); ctx.moveTo(p.wx, y); ctx.lineTo(p.wx, y - 2.0); ctx.stroke();
      ctx.fillStyle = shade(具側[p.旗].中, 1.25);
      ctx.fillRect(p.wx + 0.06, y - 2.0, 0.55, 1.05);
      continue;
    }
    if (p.将) {
      const c2 = p.将.c, 側2 = p.将.側;
      const 格 = 将の格(b, c2);
      /* 将は馬廻と同じ丈。型紙の丈（百九十）を兵の丈（百四）に合わせる */
      const 倍2 = 0.062 * (104 / 190) * 1.18;
      const n2 = 将札(側2, 格);
      if (n2) ctx.drawImage(n2, p.wx - n2.width / 2 * 倍2, y - (n2.height - 12) * 倍2,
        n2.width * 倍2, n2.height * 倍2);
      continue;
    }
    if (p.旗持) {                                   // 馬印を掲げる旗持。将の隣に立つ
      const 格 = 将の格(b, p.旗持.c);
      const n3 = 旗持札(p.旗持.側, 馬印の形[格]);
      const 倍3 = 0.062 * (104 / 190) * 1.18 * (11 / 19);   // 乗り手の丈は将と同じに保つ
      if (n3) ctx.drawImage(n3, p.wx - n3.width / 2 * 倍3, y - (n3.height - 12) * 倍3,
        n3.width * 倍3, n3.height * 倍3);
      continue;
    }
    const 丈 = p.丈 || 1;
    if (p.直) 姿八(ctx, p.wx, y, (p.直.型 === "kiba" ? 6.2 : 6.4) * 0.062 * 丈,
      p.直.dir, p.直.fr, p.直.型, 具側[p.直.側], p.直.乱);
    else { const n = 札取り(p.側, p.型, p.dir, p.fr);
      const k2 = 0.062 * 丈;
      if (n) ctx.drawImage(n, p.wx - n.width / 2 * k2, y - (n.height - 8) * k2,
        n.width * k2, n.height * k2); }
  }
  return dt;
}
