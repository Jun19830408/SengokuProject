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
function 姿八(g,x,y,s,dir,fr,型,K,乱){
  const 反=(dir===3||dir===4||dir===5);
  const archetype=反?{3:1,4:0,5:7}[dir]:dir;
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
  const 面=archetype===2?'前':archetype===6?'後':archetype===0?'横':archetype===1?'斜前':'斜後';
  g.scale((面==='斜前'||面==='斜後')?0.86:1,1);
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
/* 型紙 */
const 札帳={};
let 札焼済=false;
function 札を焼く(){
  if(札焼済||typeof document==='undefined') return; 札焼済=true;
  for(const side of ['P','E','Y']) for(const 型 of ['yari','yumi','teppo','kiba'])
    for(let dir=0;dir<8;dir++) for(let fr=0;fr<7;fr++){
      const 幅=型==='kiba'?96:64, 高=型==='kiba'?116:104;
      const n=document.createElement('canvas'); n.width=幅; n.height=高;
      姿八(n.getContext('2d'),幅/2,高-8,型==='kiba'?6.2:6.4,dir,fr,型,具側[side],(dir*3+fr)*0.37%1);
      札帳[side+型+dir+'_'+fr]=n; }
  for(const side of ['P','E','Y']){
    const n=document.createElement('canvas'); n.width=64; n.height=64;
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
    札帳[side+'fallen']=n; }
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
const 持場 = [];
{ 種 = 13;
  for (let i = 0; i < 50; i++) { const col = i % 10, row = (i / 10) | 0;
    持場.push([(col - 4.5) * 1.9 + (row % 2) * 0.8 + (R() - 0.5) * 0.8,
      -8 + row * 2.6 + (R() - 0.5) * 0.8, row]); } }
const 馬持場 = [];
{ 種 = 29;
  for (let i = 0; i < 50; i++) { const col = i % 10, row = (i / 10) | 0;
    馬持場.push([(col - 4.5) * 3.1 + (row % 2) * 1.2 + (R() - 0.5) * 1.2,
      -8 + row * 3.6 + (R() - 0.5) * 1.2, row]); } }

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
    生: new Uint8Array(50), 歩距: new Float32Array(50), 速: new Float32Array(50),
    進x: new Float32Array(50), 進y: new Float32Array(50),
    初: false, prevMen: q.men, prevCool: q.cool || 0, 撃刻: -99, 向: q.facing || 0 };
    組態.set(q, s); }
  return s; };
const 盤の態 = (b) => { let s = 盤態.get(b);
  if (!s) { s = { 倒れ: [], 前t: b.t }; 盤態.set(b, s); }
  return s; };

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
    for (const q of c.squads) {
      const s = 組の態(q);
      /* 発砲の刻。cool が跳ね上がったら、いま放った */
      if ((q.cool || 0) > s.prevCool + 0.4) s.撃刻 = b.t;
      s.prevCool = q.cool || 0;
      /* 組の足：目標（盤の位置）へ、歩幅の上限で寄る */
      { const ddx = q.x - s.dx, ddy = q.y - s.dy, d = Math.hypot(ddx, ddy);
        if (!s.初 || d > 120) { s.dx = q.x; s.dy = q.y; }
        else if (d > 0.02) { const mv = Math.min(d, (q.type === "kiba" ? 80 : 52) * dt);
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
        const tx = s.dx + lx * o[0] + bx * (深 + 押), ty = s.dy + ly * o[0] + by * (深 + 押);
        if (!s.生[n] || !s.初) { s.sx[n] = tx; s.sy[n] = ty; s.生[n] = 1; s.速[n] = 0; continue; }
        const vx = tx - s.sx[n], vy = ty - s.sy[n], d = Math.hypot(vx, vy);
        let mv = 0;
        if (d > 90) { s.sx[n] = tx; s.sy[n] = ty; }
        else if (d > 0.02) { mv = Math.min(d, (q.type === "kiba" ? 74 : 48) * dt);
          s.sx[n] += vx / d * mv; s.sy[n] += vy / d * mv;
          /* 進む向き。均しておかないと、持ち場の細かな直しで体がくるくる回る */
          s.進x[n] += (vx / d - s.進x[n]) * Math.min(1, dt * 3);
          s.進y[n] += (vy / d - s.進y[n]) * Math.min(1, dt * 3); }
        /* 歩いた距離で拍を回す（GDD 8.11）。

           時計で回していたころは、盤を微速にすると体だけ止まり、位置だけが
           滑っていった――遊ぶ側の目には「ヌメっと動く」と映る。
           足は踏んだ地べたのぶんだけ出るのが道理である。歩幅で回せば、
           どんな速さでも足が地に着き、滑りは消える。 */
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

const 向き八 = (vx, vy) => { const a = Math.atan2(vy, vx);
  return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; };

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
    札貼(ctx, e.s + "fallen", e.x, e.y - 持上高(e.x, e.y), 0.056, 0.85);
  }
  const 並 = [];
  for (const c of 隊ら) {
    const 側 = c.日和見 ? "Y" : (c.side === "P" ? "P" : "E");
    for (const q of c.squads) {
      if (q.men <= 0) continue;
      const s = 組態.get(q); if (!s || !s.初) continue;
      const alive = Math.max(0, Math.min(50, Math.round(q.men)));
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
        if (歩速 > 2.5) {
          /* 歩み：歩幅（騎馬は三歩半、徒は二歩二分）ごとに一周 */
          const 歩幅 = q.type === "kiba" ? 14 : 9;
          const w = (s.歩距[n] / 歩幅) % 1;
          if (Math.hypot(s.進x[n], s.進y[n]) > 0.3) dir = 向き八(s.進x[n], s.進y[n]);
          fr = 骨度 > 0 ? 1 + w * 2 : 1 + (w < 0.5 ? 0 : 1);
        } else if (q.engaged && 場[n][2] < 2) {
          /* 突き：合戦の刻で回す。盤を遅くすれば、槍もゆっくり繰り出される */
          const ph = (b.t * 0.55 + (q.seed || 0) + n * 0.17) % 1;
          fr = 骨度 > 0 ? 3 + ph * 3.999 : 3 + Math.min(3, (ph * 4) | 0);
        } else if (撃 >= 0 && 撃 < 1 && (q.type === "yumi" || q.type === "teppo")) {
          fr = 骨度 > 0 ? 3 + Math.min(3.999, 撃 * 4) : 3 + Math.min(3, (撃 * 4) | 0);
        }
        並.push({ wx, wy, 地y: wy, key: 側 + q.type + dir + "_" + fr,
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
  並.sort((a, z) => a.地y - z.地y);
  for (const p of 並) {
    const y = p.wy - 持上高(p.wx, p.wy);
    if (p.旗) {
      ctx.strokeStyle = "#3A2C1A"; ctx.lineWidth = 0.12;
      ctx.beginPath(); ctx.moveTo(p.wx, y); ctx.lineTo(p.wx, y - 2.0); ctx.stroke();
      ctx.fillStyle = shade(具側[p.旗].中, 1.25);
      ctx.fillRect(p.wx + 0.06, y - 2.0, 0.55, 1.05);
      continue;
    }
    if (p.直) 姿八(ctx, p.wx, y, (p.直.型 === "kiba" ? 6.2 : 6.4) * 0.062,
      p.直.dir, p.直.fr, p.直.型, 具側[p.直.側], p.直.乱);
    else 札貼(ctx, p.key, p.wx, y, 0.062);
  }
  return dt;
}
