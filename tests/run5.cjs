const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual:true, url:'http://localhost/' });
global.window=dom.window; global.document=dom.window.document; global.navigator=dom.window.navigator;
global.HTMLElement=dom.window.HTMLElement;
let rafMap=new Map(), rafId=0;
global.requestAnimationFrame=cb=>{rafId++; rafMap.set(rafId,cb); return rafId;};
global.cancelAnimationFrame=id=>rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT=true; dom.window.IS_REACT_ACT_ENVIRONMENT=true;
const ctxStub=new Proxy({},{get:(t,p)=>{ if(p==='measureText')return()=>({width:30});
  if(p==='createImageData')return(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}); return()=>{};}});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype,'clientWidth',{get(){return 1200;}});
Object.defineProperty(dom.window.HTMLElement.prototype,'clientHeight',{get(){return 800;}});
dom.window.HTMLElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,width:1200,height:800,right:1200,bottom:800};};
const errs=[]; console.error=(...a)=>errs.push(String(a[0]));
const {createRoot,act,App,React}=require(require('path').join(__dirname,'..','build','harness.cjs'));
const root=createRoot(document.getElementById('r'));
const flush=async()=>{await act(async()=>{await new Promise(r=>setTimeout(r,15));});};
const M=(t,el)=>el.dispatchEvent(new dom.window.MouseEvent(t,{bubbles:true,clientX:1120,clientY:740}));
const click=async(t)=>{const el=[...document.querySelectorAll('button,.mbtn')].find(b=>b.textContent.trim().includes(t));
  if(!el||el.disabled)return false;
  await act(async()=>{M('mousedown',el);}); await act(async()=>{M('mouseup',el);}); await act(async()=>{M('click',el);});
  await flush(); return true;};
let T=1000;
const pump=async(n)=>{for(let i=0;i<n;i++){T+=33; const q=[...rafMap.entries()]; rafMap.clear(); await act(async()=>{q.forEach(([,cb])=>cb(T));});}};
  // 家名を押して開いてから開始する（選択画面が一覧式になった）
  const openFaction = async (nm) => {
    const el = [...document.querySelectorAll('.mn')].find(e => e.textContent.trim() === nm);
    if (!el) return false;
    const p = el.parentElement;
    await act(async()=>{p.dispatchEvent(new dom.window.MouseEvent('mousedown',{bubbles:true,clientX:600,clientY:400}));});
    await act(async()=>{p.dispatchEvent(new dom.window.MouseEvent('mouseup',{bubbles:true,clientX:600,clientY:400}));});
    await act(async()=>{p.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,clientX:600,clientY:400}));});
    await flush();
    return true;
  };
(async()=>{
  await act(async()=>{root.render(React.createElement(App));}); await flush();
  await click('ゲームをはじめる'); await openFaction('織田家'); await click('この勢力で開始');
  let battles=0, sieges=0, promos=0;
  for(let m=0;m<24;m++){
    if(!(await click('次月へ'))) { console.log(`  ${m}月目: 次月へ不可`); break; }
    await click('評定を開く');
    // 合戦
    if(/合戦開始/.test(document.body.textContent)){
      battles++;
      await click('合戦開始');
      let n=0; while(!/戦場を離れる/.test(document.body.textContent) && n<400){ await pump(30); n++; }
      const res=document.body.textContent.match(/(勝利|敗北)/);
      console.log(`  ${m+1}月目 合戦 → ${res?res[0]:"未決着"}`);
      await click('戦場を離れる');
    }
    if(/名乗らせる/.test(document.body.textContent)){ promos++; await click('と名乗らせる'); }
    if(/包囲中/.test(document.body.textContent)){
      sieges++;
      if(!(await click('兵糧攻め'))) await click('敵の包囲が続く');
    }
    if(/名乗らせる/.test(document.body.textContent)){ promos++; await click('と名乗らせる'); }
  }
  const bar=document.querySelector('.bar').textContent.replace(/\s+/g,' ');
  console.log("24か月後の状況:", bar.slice(0,110));
  console.log(`合戦${battles}回 / 包囲${sieges}回 / 昇進${promos}回`);
  console.log("エラー:", errs.length?errs.slice(0,4).join(" | "):"なし");
  process.exit(0);
})().catch(e=>{console.log("例外:",e.message,"\n",e.stack.split("\n").slice(0,8).join("\n"));process.exit(1);});
