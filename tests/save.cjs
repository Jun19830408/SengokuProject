const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual:true, url:'http://localhost/' });
global.window=dom.window; global.document=dom.window.document; global.navigator=dom.window.navigator;
global.HTMLElement=dom.window.HTMLElement;
let rafMap=new Map(), rafId=0;
global.requestAnimationFrame=cb=>{rafId++;rafMap.set(rafId,cb);return rafId;};
global.cancelAnimationFrame=id=>rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT=true; dom.window.IS_REACT_ACT_ENVIRONMENT=true;
const ctxStub=new Proxy({},{get:(t,p)=>{if(p==='measureText')return()=>({width:30});
 if(p==='createImageData')return(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h});return()=>({addColorStop:()=>{}});}});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype,'clientWidth',{get(){return 1200;}});
Object.defineProperty(dom.window.HTMLElement.prototype,'clientHeight',{get(){return 800;}});
dom.window.HTMLElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,width:1200,height:800,right:1200,bottom:800};};
// window.storage を模擬
const store=new Map();
dom.window.storage={ get:async k=>store.has(k)?{key:k,value:store.get(k)}:null,
  set:async(k,v)=>{store.set(k,v);return{key:k,value:v};}, delete:async k=>{store.delete(k);return{key:k,deleted:true};} };
const errs=[]; console.error=(...a)=>errs.push(String(a[0]));
const {createRoot,act,App,React}=require(require('path').join(__dirname,'..','build','harness.cjs'));
const root=createRoot(document.getElementById('r'));
const flush=async()=>{await act(async()=>{await new Promise(r=>setTimeout(r,20));});};
const M=(t,el)=>el.dispatchEvent(new dom.window.MouseEvent(t,{bubbles:true,clientX:1120,clientY:760}));
const rc=async(t)=>{const el=[...document.querySelectorAll('button,.mbtn')].find(b=>b.textContent.trim().includes(t));
  if(!el||el.disabled)return false;
  await act(async()=>{M('mousedown',el);});await act(async()=>{M('mouseup',el);});await act(async()=>{M('click',el);});
  await flush();return true;};
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
  await act(async()=>{root.render(React.createElement(App));});await flush();
  await rc('ゲームをはじめる'); await openFaction('織田家'); await rc('この勢力で開始');
  for(let i=0;i<3;i++){ await rc('次月へ'); await rc('評定を開く'); }
  console.log("自動保存:", store.has('sengoku:save1')?"あり":"★なし");
  /* 記録所（GDD 15.3）。五つの枠へ収められること。 */
  let 咎=0; const 確=(n,ok,t='')=>{console.log(`  ${ok?'○':'★'} ${n}${t?'　'+t:''}`);if(!ok)咎++;};
  console.log("── 記録所");
  確('「記録」で記録所が開く', await rc('記録') && /記録所/.test(document.body.textContent));
  const 枠 = [...document.querySelectorAll('.modal .card button')]
    .filter(b=>/自動|記録 [一二三四五]/.test(b.textContent));
  確('自動と一〜五の六つの枠が並ぶ', 枠.length===6, `${枠.length}つ`);
  const 三 = 枠.find(b=>/記録 三/.test(b.textContent));
  確('空いている枠は「空き」と出る', /空き/.test(三.textContent));
  for(const t of ['mousedown','mouseup','click']) await act(async()=>{M(t,三);});
  await flush(); await flush();
  確('選んだ枠へ収まる', store.has('sengoku:slot3'), [...store.keys()].join('／'));
  確('自動の枠は別に残る', store.has('sengoku:save1'));
  // 収めた枠は、次からは「上書き」と出る
  await rc('記録'); await flush();
  const 三2 = [...document.querySelectorAll('.modal .card button')].find(b=>/記録 三/.test(b.textContent));
  確('収めた枠は中身が読める', /織田家/.test(三2.textContent) && /上書き/.test(三2.textContent),
    三2.textContent.replace(/\s+/g,' ').slice(0,60));
  await rc('閉じる'); await flush();

  await rc('タイトル'); await flush();
  // 枠の名は札の見出し（span）に出る。押せる button の中ではない。
  const 名札 = [...document.querySelectorAll('span')]
    .map(e=>e.textContent.trim()).filter(t=>/^(自動|記録 [一二三四五])$/.test(t));
  確('タイトルに六つの枠が並ぶ', new Set(名札).size === 6, [...new Set(名札)].join('／'));
  const 全文 = document.body.textContent.replace(/\s+/g,' ');
  確('収めた枠がタイトルにも出る', /記録 三/.test(全文) && /織田家/.test(全文));
  確('空いている枠は「空き」と出る（タイトル）', (全文.match(/空き/g)||[]).length >= 4,
    `${(全文.match(/空き/g)||[]).length}つ空き`);
  確('続きからは、いちばん新しい枠を指す', /続きから（記録 三/.test(全文.replace(/\(/g,'（')),
    (全文.match(/続きから[^）]*）/)||[''])[0]);
  if(咎) console.log(`  ★記録所で${咎}件が通らなかった`);
  const cont=[...document.querySelectorAll('button')].map(b=>b.textContent.trim()).find(t=>/続きから/.test(t));
  console.log("タイトルの表示:", cont||"★続きからが出ない");
  await rc('続きから'); await flush();
  console.log("復帰後:", document.querySelector('.bar')?.textContent.replace(/\s+/g,' ').slice(0,60));
  console.log("エラー:", 咎 ? `記録所で${咎}件` : errs.length?errs.slice(0,3).join(" | "):"なし");
  process.exit(咎?1:0);
})().catch(e=>{console.log("例外:",e.message);process.exit(1);});
