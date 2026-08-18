// 城攻め（強攻）で、城方が持ち場の門を支えて外の寄せ手へ射かけるか確かめる。
//
// かつてこの試験は「攻めかかる」を押して終わっていた。あれは軍議の釦で、
// 行き着く先は城下の野戦であり、城郭図には入っていなかった。
// そのため「城方が門を守る」という肝心のところを、長く素通りしていた。
// いまは包囲まで進んだ盤を記録として仕込み、「続きから」で開いて強攻を選ぶ。
const path=require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual:true, url:'http://localhost/' });
global.window=dom.window; global.document=dom.window.document; global.navigator=dom.window.navigator; global.HTMLElement=dom.window.HTMLElement;
let rafMap=new Map(),rafId=0;
global.requestAnimationFrame=cb=>{rafId++;rafMap.set(rafId,cb);return rafId;};
global.cancelAnimationFrame=id=>rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT=true; dom.window.IS_REACT_ACT_ENVIRONMENT=true;
const ctxStub=new Proxy({},{get:(t,p)=>{if(p==='measureText')return()=>({width:30});
 if(p==='createImageData')return(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h});
 if(p==='createRadialGradient'||p==='createLinearGradient'||p==='createConicGradient')return()=>({addColorStop:()=>{}});return()=>{};}});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype,'clientWidth',{get(){return 900;}});
Object.defineProperty(dom.window.HTMLElement.prototype,'clientHeight',{get(){return 600;}});
dom.window.HTMLElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,width:900,height:600,right:900,bottom:600};};
const errs=[]; console.error=(...a)=>errs.push(String(a[0]).slice(0,180));
const {createRoot,act,App,React,initState,findPath}=require(path.join(__dirname,'..','build','harness.cjs'));

/* ---------------------------------------- 包囲まで進んだ盤をこしらえる */
const s=initState('oda');
let A=null,B=null;
for(const c of s.castles.filter(x=>x.faction===s.player)){
  for(const d of s.castles){
    if(d.faction===c.faction) continue;
    const p=findPath(c.id,d.id);
    if(p&&p.length===2){ A=c; B=d; break; }
  }
  if(A) break;
}
const gens=s.generals.filter(x=>x.at===A.id&&x.faction===A.faction&&!x.captive).slice(0,3);
for(const t of gens) t.at=null;
const 兵=9000;
s.armies.push({
  id:'siegeArmy', faction:A.faction, from:A.id, gens:gens.map(x=>x.id),
  local:兵, localTrain:80, rost:null,
  men:兵+gens.reduce((t,x)=>t+x.retinue,0), at:B.id,
  path:[B.id], prog:0, food:99999, target:B.id, sieging:true,
});
// 城方にも十分な兵と城防を持たせる。すぐ落ちては門の守りが見られない。
B.local=4000; B.def=80; B.hp=4000; B.food=90000; B.min=80;
s.sieges=[{castleId:B.id, armyId:'siegeArmy', months:1, decided:null}];
const 蔵=new Map([['sengoku:save1', JSON.stringify({v:1,at:Date.now(),state:s})]]);
dom.window.storage={
  get:async k=>(蔵.has(k)?{key:k,value:蔵.get(k)}:null),
  set:async(k,v)=>{蔵.set(k,v);return{key:k,value:v};},
  delete:async k=>{蔵.delete(k);return{};},
};
console.log(`仕込み: ${A.name}（自家）が ${B.name} を包囲中（城方 ${B.local}人・城防 ${B.def}）`);

const root=createRoot(document.getElementById('r'));
const flush=async()=>{await act(async()=>{await new Promise(r=>setTimeout(r,5));});};
const M=(t,el)=>el.dispatchEvent(new dom.window.MouseEvent(t,{bubbles:true,clientX:450,clientY:300}));
const click=async(el)=>{for(const t of['mousedown','mouseup','click']) await act(async()=>{M(t,el);}); await flush();};
const btn=(t)=>[...document.querySelectorAll('button,.mbtn')].find(b=>b.textContent.trim().includes(t)&&!b.disabled);
const rc=async(t)=>{const el=btn(t); if(!el)return false; await click(el); return true;};
// 飾り（style）の中身は数えない
const txt=()=>[...document.querySelectorAll('body *:not(style)')].map(e=>e.children.length?'':e.textContent).join(' ').replace(/\s+/g,' ');

(async()=>{
  await act(async()=>{root.render(React.createElement(App));});await flush();await flush();
  console.log('続きから:', (await rc('続きから'))?'押せた':'★押せず');
  await flush(); await flush();
  console.log('包囲の段:', btn('強攻')?'出た':'★出ず');
  if(!btn('強攻')){ console.log('エラー: 包囲の段が出ない'); process.exit(0); }
  await rc('強攻'); await flush(); await flush();
  const 城郭図=/城攻め/.test(txt());
  console.log('城郭図か:', 城郭図?'城郭図に入った':'★城下の野戦のまま');
  console.log('合戦開始:', (await rc('合戦開始'))?'押せた':'★不可');
  /* 戦況の記録は下に流れていくので、終わってから読んだのでは開戦直後の一行を取り逃がす。
     肝心なのはまさにその一行なので、走らせながら拾い続ける。 */
  let 序盤='', 全文='';
  for(let k=0;k<3000;k++){
    const q=[...rafMap.entries()]; rafMap.clear();
    if(!q.length){ await flush(); continue; }
    await act(async()=>{q.forEach(([,cb])=>cb(2000+k*90));});
    if(k%20===0){ const u=txt(); 全文+=' '+u; if(k<400) 序盤+=' '+u; }
    if(btn('戦場を離れる')) break;
  }
  const 終=txt();                       // 門の残りは終わったところを見る
  const t=終+' '+全文;                  // 記録は流れるので、走らせながら拾ったものも合わせる
  const head=document.querySelector('.sp').firstElementChild.textContent.replace(/\s+/g,' ');
  console.log('上部: '+head.slice(0,120));
  /* 肝心なところ。
     城方は布陣で受け持った門（いちばん外の輪）に就いたままでなければならない。
     かつては戦の始まりに全隊が本丸表門へ引き上げ、一矢も射ずに城を明け渡していた。 */
  const 持ち場=(u)=>[...new Set(u.match(/[^\s。]{1,30}(?:を固めた|の内へ下がった)。/g)||[])];
  const 序=持ち場(序盤), 本丸へ=序.filter(x=>/本丸/.test(x));
  console.log('開戦直後の持ち場: '+(序.length?序.slice(0,4).join(' / '):'なし（布陣のまま持ち場に就いている）'));
  console.log('いきなり本丸へ引いた隊: '+(本丸へ.length?'★'+本丸へ.length+'隊':'なし'));
  const 後=持ち場(全文).filter(x=>!序.includes(x));
  console.log('のちの下がり: '+(後.length?後.slice(0,3).join(' / '):'―'));
  const 門=[...(終.match(/(惣構|三の丸|二の丸|本丸)[^\s]*門\s*(\d+)%/g)||[])];
  console.log('門の状況: '+(門.length?[...new Set(門)].slice(0,8).join(' / '):'—'));
  // 外の輪の門が削れていれば、城方はそこで支えている（無傷のまま抜かれていない）
  const 惣構=門.filter(x=>/^惣構/.test(x));
  const 削れた=惣構.filter(x=>Number(x.match(/(\d+)%/)[1])<100).length;
  console.log('惣構の門が削られたか: '+(惣構.length? `${削れた}/${惣構.length}門`:'—'));
  console.log('城方の動き:');
  for(const [名,pat] of [['内へ下がる',/[^。]{0,26}の内へ下がった。/g],
                          ['討って出る',/[^。]{0,26}を開いて討って出た。/g],
                          ['門が破れる',/[^。]{0,26}門が破られた[^。]{0,10}。/g]]){
    const m=t.match(pat); console.log(`  ${名}: `+(m?[...new Set(m)].slice(0,2).join(' / '):'―'));
  }
  console.log('決着: '+(btn('戦場を離れる')?'ついた':'まだ'));

  /* ------------------------------------------ 二、合戦の中身を直に見る

     画面の記録は下へ流れるので、開戦直後の一行は取り逃がすことがある。
     隊がどの門を受け持ち、何の下知を受けているかは、盤を直に組んで確かめる。
     ここが「城方が門を支えて射かける」の真偽を分ける。 */
  const H=require(path.join(__dirname,'..','build','harness.cjs'));
  const 城={id:'x',name:'試の城',def:80,local:4000,localTrain:70,najimi:70,rost:null};
  const 図=H.layoutCastleField(H.buildCastleMap(城));
  H.setBattleMap(図);
  const 将=(i,nm)=>({id:`g${i}`,name:nm,lead:60,valor:60,wit:55,gov:55,retinue:300,retTrain:70,unity:60});
  const 持ち場一覧=[];
  for(const l of 図.layers) for(const gt of l.gates){
    const a=H.axisOf(l,gt);
    const nx=図.layers[l.i+1];
    const 内縁=nx?(a.along==='x'?nx.hh:nx.hw)+図.t:0;
    const 帯=Math.max(20,a.half-内縁);
    const p=H.fromUV(図,a,gt.off,a.half-Math.min(44,帯*0.5));
    持ち場一覧.push({x:p.x,y:p.y,f:Math.atan2(p.y-図.cy,p.x-図.cx)+Math.PI,gate:gt});
  }
  /* 受け持ちを渡さずに立たせる。どの門に就くかを、合戦AI自身に選ばせるためである。
     ここが今回の不具合の在り処だった。かつては「残る門のうちいちばん内のもの」を選び、
     戦の始まりに全隊が本丸表門へ引き上げていた。就くべきは外の輪の門である。 */
  const 城方=持ち場一覧.slice(0,4).map((sp,i)=>
    H.makeCorps('E',将(i,`守${i}`),300,700,70,70,sp.x,sp.y,sp.f,'#6E7FA0'));
  const 外輪=図.layers[0];
  const 寄手=外輪.gates.slice(0,3).map((gt,i)=>{
    const a=H.axisOf(外輪,gt);
    const p=H.fromUV(図,a,gt.off,a.half+図.moat.band+外輪.masu+図.t+96);
    return H.makeCorps('P',将(100+i,`寄${i}`),400,2200,75,75,p.x,p.y,Math.atan2(図.cy-p.y,図.cx-p.x),'#2F5D8C');
  });
  const bb=H.createBattle(寄手,城方,'P');
  bb.mode='castle'; bb.map=図; bb.dusk=1080; bb.phase='fight';
  for(const c of 寄手){ c.formation='方陣'; H.placeSquads(c,true); }
  const 最内=Math.max(...図.gates.map(g=>g.layer));
  H.battleAI(bb);                                    // まず一手。ここで持ち場が決まる
  const 初手=城方.map(c=>c.holdGate?c.holdGate.key:'（無し）');
  const 奥へ=城方.filter(c=>c.holdGate&&c.holdGate.layer>0).length;
  let 射撃=0, 本丸に就いた=0;
  for(let k=0;k<2400;k++){
    H.stepBattle(bb,0.25);
    if(k%4===0) H.battleAI(bb);
    for(const c of 城方){
      if(c.dead||c.destroyed||c.routed) continue;
      if(c.order==='射撃') 射撃++;
      // まだ外の輪の門が残っているのに本丸へ就いていたら、持ち場を捨てている
      if(c.holdGate&&c.holdGate.layer===最内&&図.gates.some(g=>!g.broken&&g.layer===0)) 本丸に就いた++;
    }
    if(bb.result) break;
  }
  console.log('\n── 盤を直に組んで（受け持ちはAIに選ばせる） ──');
  console.log('  開戦の一手で就いた門: '+初手.join(' / '));
  console.log('  外の輪でない門に就いた隊: '+(奥へ?'★'+奥へ+'隊':'なし'));
  console.log('  射撃の下知が出ていた延べ刻: '+射撃+(射撃?'':'　★一度も射ていない'));
  console.log('  外の門が残るのに本丸へ就いた延べ刻: '+(本丸に就いた?'★'+本丸に就いた:'なし'));
  console.log('  門: '+図.gates.filter(g=>g.layer===0).map(g=>`${g.key} ${g.broken?'破':Math.round(g.hp/g.max*100)+'%'}`).join(' / '));

  const 不首尾=[];
  if(!城郭図) 不首尾.push('城郭図に入らなかった');
  if(本丸へ.length) 不首尾.push('城方がいきなり本丸へ引いた');
  if(惣構.length&&!削れた) 不首尾.push('惣構の門が一つも削られていない（城方が支えていない）');
  if(奥へ) 不首尾.push('開戦の一手で城方が外の輪の門を離れた');
  if(!射撃) 不首尾.push('城方が門外の寄せ手へ一度も射なかった');
  if(本丸に就いた) 不首尾.push('外の門が残るのに城方が本丸へ引いた');
  console.log('エラー:', 不首尾.length?不首尾.join(' | '):(errs.length?errs.slice(0,2).join(' | '):'なし'));
  process.exit(0);
})().catch(e=>{console.log('例外:',e.message.slice(0,160));console.log('エラー: 例外');process.exit(0);});
