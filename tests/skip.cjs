// 城攻めで城方が門を守るか確かめる
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual:true, url:'http://localhost/' });
global.window=dom.window; global.document=dom.window.document; global.navigator=dom.window.navigator; global.HTMLElement=dom.window.HTMLElement;
let rafMap=new Map(),rafId=0;
global.requestAnimationFrame=cb=>{rafId++;rafMap.set(rafId,cb);return rafId;};
global.cancelAnimationFrame=id=>rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT=true; dom.window.IS_REACT_ACT_ENVIRONMENT=true;
const ctxStub=new Proxy({},{get:(t,p)=>{if(p==='measureText')return()=>({width:30});
 if(p==='createImageData')return(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h});
 if(p==='createRadialGradient')return()=>({addColorStop:()=>{}});return()=>{};}});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype,'clientWidth',{get(){return 900;}});
Object.defineProperty(dom.window.HTMLElement.prototype,'clientHeight',{get(){return 600;}});
dom.window.HTMLElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,width:900,height:600,right:900,bottom:600};};
dom.window.storage={get:async k=>null,set:async(k,v)=>({key:k,value:v}),delete:async k=>({})};
const errs=[]; console.error=(...a)=>errs.push(String(a[0]).slice(0,180));
const {createRoot,act,App,React}=require(require('path').join(__dirname,'..','build','harness.cjs'));
const root=createRoot(document.getElementById('r'));
const flush=async()=>{await act(async()=>{await new Promise(r=>setTimeout(r,5));});};
const M=(t,el)=>el.dispatchEvent(new dom.window.MouseEvent(t,{bubbles:true,clientX:450,clientY:300}));
const click=async(el)=>{for(const t of['mousedown','mouseup','click']) await act(async()=>{M(t,el);}); await flush();};
const btn=(t)=>[...document.querySelectorAll('button,.mbtn')].find(b=>b.textContent.trim().includes(t)&&!b.disabled);
const rc=async(t)=>{const el=btn(t); if(!el)return false; await click(el); return true;};
const openFaction=async(nm)=>{const el=[...document.querySelectorAll('.mn')].find(e=>e.textContent.trim()===nm);
  if(!el)return false; await click(el.parentElement); return true;};
const txt=()=>document.body.textContent.replace(/\s+/g,' ');
(async()=>{
  await act(async()=>{root.render(React.createElement(App));});await flush();
  await rc('ゲームをはじめる'); await openFaction('織田家'); await rc('この勢力で開始');
  const cv=document.querySelector('.mapwrap canvas');
  await rc('本拠');
  for(const [x,y] of [[450,300],[450,290],[460,310]]){
    await act(async()=>{cv.dispatchEvent(new dom.window.MouseEvent('mousedown',{bubbles:true,clientX:x,clientY:y}));});
    await act(async()=>{cv.dispatchEvent(new dom.window.MouseEvent('mouseup',{bubbles:true,clientX:x,clientY:y}));});
    await flush(); if(btn('軍事')) break;
  }
  await rc('軍事'); await rc('出陣'); await rc('人で進発');
  await rc('閉じる'); await rc('← 戻る');
  let sieged=false;
  for(let m=0;m<30&&!sieged;m++){
    await rc('次月へ'); await rc('評定を開く');
    if(/名乗らせる/.test(txt())) await rc('と名乗らせる');
    if(btn('攻めかかる')){ await rc('攻めかかる'); sieged=true; }
  }
  console.log('城攻めへ:', sieged?'入った':'★入らず');
  if(!sieged){ console.log('エラー:',errs.slice(0,2).join('|')||'なし'); process.exit(0); }

  // 一、布陣の段に「委ねて結果を見る」があること
  console.log('布陣の段の釦: '+(btn('委ねて結果を見る')?'ある':'★ない'));

  // 二、いったん自分で戦い始めてから、途中で委ねられること
  await rc('合戦開始');
  for(let k=0;k<120;k++){
    const q=[...rafMap.entries()]; rafMap.clear();
    if(!q.length){ await flush(); continue; }
    await act(async()=>{q.forEach(([,cb])=>cb(2000+k*90));});
  }
  console.log('合戦中の釦: '+(btn('委ねて結果を見る')?'ある':'★ない'));
  const 刻前=(txt().match(/(\d+):(\d\d)／/)||[])[0]||'?';
  const t0=Date.now();
  const ok=await rc('委ねて結果を見る');
  console.log('押せたか: '+(ok?'押せた':'★不可'));
  console.log('委ねた時の戦場の刻: '+刻前);

  // 決着まで待つ。区切りごとに手を離す作りなので、時計を進めてやる。
  let 待ち=0;
  while(!btn('戦場を離れる') && 待ち<600){ await flush(); 待ち++; }
  const かかり=Date.now()-t0;

  const t=txt();
  console.log('決着: '+(btn('戦場を離れる')?'ついた':'★つかず'));
  console.log('かかった時間: '+かかり+' ミリ秒');
  const res=t.match(/(勝利|敗北|引き分け|日が暮れた|城は落ちず)/);
  console.log('結果の表示: '+(res?res[0]:'★出ない'));
  const 損=t.match(/損害\s*直属[^／]*／\s*地域[^人]*人/);
  console.log('損害の表示: '+(損?損[0].replace(/\s+/g,' '):'★出ない'));
  // 委ねた後も戦場を離れられること（政略図へ戻れる）
  await rc('戦場を離れる');
  console.log('戦場を離れた後: '+(/次月へ/.test(txt())?'政略図へ戻った':'★戻らない'));
  console.log('エラー:', errs.length?errs.slice(0,2).join(' | '):'なし');
  process.exit(0);
})().catch(e=>{console.log('例外:',e.message.slice(0,160));console.log('エラー: 例外');process.exit(1);});
