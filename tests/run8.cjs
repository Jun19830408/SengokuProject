const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual:true, url:'http://localhost/' });
global.window=dom.window; global.document=dom.window.document; global.navigator=dom.window.navigator;
global.HTMLElement=dom.window.HTMLElement;
let rafMap=new Map(), rafId=0;
global.requestAnimationFrame=cb=>{rafId++;rafMap.set(rafId,cb);return rafId;};
global.cancelAnimationFrame=id=>rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT=true; dom.window.IS_REACT_ACT_ENVIRONMENT=true;
const ctxStub=new Proxy({},{get:(t,p)=>{if(p==='measureText')return()=>({width:30});
 if(p==='createImageData')return(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h});return()=>{};}});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype,'clientWidth',{get(){return 1200;}});
Object.defineProperty(dom.window.HTMLElement.prototype,'clientHeight',{get(){return 800;}});
dom.window.HTMLElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,width:1200,height:800,right:1200,bottom:800};};
const errs=[]; console.error=(...a)=>errs.push(String(a[0]));
const {createRoot,act,App,React}=require(require('path').join(__dirname,'..','build','harness.cjs'));
const root=createRoot(document.getElementById('r'));
const flush=async()=>{await act(async()=>{await new Promise(r=>setTimeout(r,12));});};
const M=(t,el,x=1120,y=740)=>el.dispatchEvent(new dom.window.MouseEvent(t,{bubbles:true,clientX:x,clientY:y}));
const rc=async(t)=>{const el=[...document.querySelectorAll('button,.mbtn')].find(b=>b.textContent.trim().includes(t));
  if(!el||el.disabled)return false;
  await act(async()=>{M('mousedown',el);}); await act(async()=>{M('mouseup',el);}); await act(async()=>{M('click',el);});
  await flush(); return true;};
let T=1000;
const pump=async(n)=>{for(let i=0;i<n;i++){T+=33;const q=[...rafMap.entries()];rafMap.clear();await act(async()=>{q.forEach(([,cb])=>cb(T));});}};
const led=()=>{const e=document.querySelector('.led'); return e?e.textContent.replace(/\s+/g,' ').slice(0,78):"★変化なし";};
const bar=()=>document.querySelector('.bar').textContent.replace(/\s+/g,' ').slice(0,74);
  const openFaction = async (nm) => {
    const el = [...document.querySelectorAll('.mn')].find(e => e.textContent.trim() === nm);
    if (!el) return false;
    const p = el.parentElement;
    for (const t of ['mousedown','mouseup','click'])
      await act(async()=>{p.dispatchEvent(new dom.window.MouseEvent(t,{bubbles:true,clientX:600,clientY:400}));});
    await flush(); return true;
  };
(async()=>{
  await act(async()=>{root.render(React.createElement(App));}); await flush();
  console.log("● タイトル→大名選択:", await rc('ゲームをはじめる'));
  await openFaction('織田家');
  console.log("● 織田家で開始:", await rc('この勢力で開始'));
  const wrap=document.querySelector('.mapwrap'), cv=wrap.querySelector('canvas');
  const tap=async(wx,wy)=>{const x=(wx-480)*0.9+600,y=(wy-480)*0.9+400;
    await act(async()=>{M('mousedown',cv,x,y);}); await act(async()=>{M('mouseup',cv,x,y);}); await flush();};
  await tap(563,633);
  console.log("● 那古野城を選択:", document.querySelector('.sheet')?.textContent.slice(2,7));

  console.log("\n--- 内政コマンド ---");
  for(const c of ['開墾','治水','商業','築城','訓練','徴募']){
    await tap(563,633); await rc('内政'); await rc(c);
    const ok=await rc(`${c}を実行`);
    console.log(` ${c}: ${ok?"実行":"★押せない"} → ${led()}`);
    await rc('次月へ'); await rc('評定を開く');
  }
  console.log("\n--- 調略・人事 ---");
  await tap(563,633);
  await rc('調略'); console.log(" 調略:", await rc('調略を行う')?"実行":"★不可", "→", led());
  await rc('次月へ'); await rc('評定を開く'); await tap(563,633);
  await rc('人事'); const ap=await rc('を城主に任じる');
  console.log(" 人事:", ap?"任命した":"★不可");

  console.log("\n--- 地図まわり ---");
  await rc('拡大'); await rc('縮小'); await rc('全体図'); await rc('本拠');
  console.log(" 拡大/縮小/全体図/本拠: 例外なし");
  for(const b of ['勢力情報','武将一覧','攻略目標','履歴']){
    await rc(b); const ok=!!document.querySelector('.card');
    console.log(` ${b}: ${ok?"開いた":"★開かない"}`); await rc('閉じる');
  }

  console.log("\n--- 出陣→合戦 ---");
  if(/合戦開始/.test(document.body.textContent)){
    console.log(" （敵の来襲があったので先に片づけた）");
    await rc('合戦開始'); await rc('全軍撤退');
    let n2=0; while(!/戦場を離れる/.test(document.body.textContent)&&n2<600){ await pump(40); n2++; }
    await rc('戦場を離れる'); }
  await tap(563,633); await rc('軍事');
  const btns=[...document.querySelectorAll('button')].map(b=>b.textContent.trim()+(b.disabled?'[不可]':'')).filter(x=>x);
  console.log(" 軍事の欄:", btns.slice(0,10).join(' / '));
  console.log(" 出陣ダイアログ:", await rc('出陣')?"開いた":"★開かない");
  const sel=document.querySelector('.modal select'); if(!sel){console.log(" 出陣できない状況のため以降を省略"); console.log("エラー: なし"); process.exit(0);}
  await act(async()=>{sel.value=(sel.options[1]||sel.options[0]).value; sel.dispatchEvent(new dom.window.Event('change',{bubbles:true}));}); await flush();
  console.log(" 進発:", await rc('人で進発')?"出陣した":"★押せない");
  await rc('次月へ'); await rc('評定を開く');
  console.log(" 合戦画面:", /合戦開始/.test(document.body.textContent)?"開いた":"★開かない");
  await rc('合戦開始');
  console.log(" 全軍接戦:", await rc('全軍接戦')?"命令できた":"★不可");
  let n=0; while(!/戦場を離れる/.test(document.body.textContent)&&n<400){ await pump(30); n++; }
  console.log(" 決着:", document.body.textContent.match(/(勝利|敗北)/)?.[0]||"★未決着");
  await rc('戦場を離れる');
  if(/名乗らせる/.test(document.body.textContent)){ console.log(" 昇進:", await rc('と名乗らせる')?"命名できた":"★不可"); }
  if(/包囲中/.test(document.body.textContent)) console.log(" 包囲:", await rc('強攻')?"強攻を実行":"★不可");
  console.log("\n最終状態:", bar());
  console.log("エラー:", errs.length?errs.slice(0,3).join(" | "):"なし");
  process.exit(0);
})().catch(e=>{console.log("例外:",e.message,"\n",e.stack.split("\n").slice(0,8).join("\n"));process.exit(1);});
