const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual:true, url:'http://localhost/' });
global.window=dom.window; global.document=dom.window.document; global.navigator=dom.window.navigator; global.HTMLElement=dom.window.HTMLElement;
let rafMap=new Map(),rafId=0;
global.requestAnimationFrame=cb=>{rafId++;rafMap.set(rafId,cb);return rafId;};
global.cancelAnimationFrame=id=>rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT=true; dom.window.IS_REACT_ACT_ENVIRONMENT=true;
const ctxStub=new Proxy({},{get:(t,p)=>{if(p==='measureText')return()=>({width:30});
 if(p==='createImageData')return(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h});
 if(p==='createRadialGradient')return()=>({addColorStop:()=>{}});return()=>({addColorStop:()=>{}});}});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype,'clientWidth',{get(){return 1200;}});
Object.defineProperty(dom.window.HTMLElement.prototype,'clientHeight',{get(){return 800;}});
dom.window.HTMLElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,width:1200,height:800,right:1200,bottom:800};};
dom.window.storage={get:async k=>null,set:async(k,v)=>({key:k,value:v}),delete:async k=>({})};
const errs=[]; console.error=(...a)=>errs.push(String(a[0]).slice(0,110));
const {createRoot,act,App,React}=require(require('path').join(__dirname,'..','build','harness.cjs'));
const root=createRoot(document.getElementById('r'));
const flush=async()=>{await act(async()=>{await new Promise(r=>setTimeout(r,10));});};
const M=(t,el)=>el.dispatchEvent(new dom.window.MouseEvent(t,{bubbles:true,clientX:600,clientY:400}));
const click=async(el)=>{await act(async()=>{M('mousedown',el);});await act(async()=>{M('mouseup',el);});await act(async()=>{M('click',el);});await flush();};
const rc=async(t)=>{const el=[...document.querySelectorAll('button,.mbtn')].find(b=>b.textContent.trim().includes(t));
  if(!el||el.disabled)return false; await click(el); return true;};
(async()=>{
  await act(async()=>{root.render(React.createElement(App));});await flush();
  await rc('ゲームをはじめる');
  const t=document.body.textContent;
  console.log('見出し:', (t.match(/大名を選ぶ（\d+家）/)||['★なし'])[0]);
  console.log('難易度の欄:', /易/.test(t)&&/普通/.test(t)&&/難/.test(t)?'三段階あり':'★なし');
  const btns=[...document.querySelectorAll('button')].map(b=>b.textContent.trim());
  console.log('地方の絞り込み:', btns.filter(x=>/奥羽|関東|中部|畿内|中国|四国|九州/.test(x)).join('／')||'★なし');
  console.log('規模の絞り込み:', btns.filter(x=>/大身|中堅|小勢力/.test(x)).join('／')||'★なし');
  // 家の一覧
  const rows=[...document.querySelectorAll('.mn')].map(e=>e.textContent.trim()).filter(x=>/家|衆|党|王国|公方|将軍|本願寺|惣国/.test(x));
  console.log('並んでいる家: '+rows.length+'家 例: '+rows.slice(0,6).join('／'));
  // 家を開いてみる
  const target=[...document.querySelectorAll('.mn')].find(e=>e.textContent.trim()==='島津家');
  if(target){ await click(target.parentElement);
    const c=document.body.textContent;
    console.log('島津家を開く:', /本拠/.test(c)?'詳細が出た':'★出ない');
    console.log('  '+(c.match(/本拠[^当]*当主\s*\S+/)||[''])[0].replace(/\s+/g,' '));
    console.log('  開始ボタン:', [...document.querySelectorAll('button')].some(b=>/この勢力で開始/.test(b.textContent))?'あり':'★なし');
  } else console.log('★島津家が見当たらない');
  // 九州で絞る
  await rc('九州');
  const rows2=[...document.querySelectorAll('.mn')].map(e=>e.textContent.trim()).filter(x=>/家|衆|党|王国/.test(x));
  console.log('九州で絞る: '+rows2.length+'家 '+rows2.slice(0,8).join('／'));
  // 地図の操作を試す
  const cv=document.querySelector('canvas');
  console.log('地図の操作:');
  console.log('  拡大・縮小・全図のボタン: '+[...document.querySelectorAll('button')].filter(b=>/^(＋|－|全図)$/.test(b.textContent.trim())).map(b=>b.textContent.trim()).join('／'));
  // 二本指で拡げる
  const T=(x1,y1,x2,y2)=>({touches:[{clientX:x1,clientY:y1},{clientX:x2,clientY:y2}],changedTouches:[{clientX:x1,clientY:y1}]});
  const fire=async(type,det)=>{ await act(async()=>{ const ev=new dom.window.Event(type,{bubbles:true}); Object.assign(ev,det); cv.dispatchEvent(ev); }); await flush(); };
  await fire('touchstart',T(300,300,400,400));
  await fire('touchmove',T(200,200,500,500));
  await fire('touchend',{touches:[],changedTouches:[{clientX:350,clientY:350}]});
  console.log('  二本指の拡げ縮め: 例外なく処理された');
  // 一本指でなぞる
  await fire('touchstart',{touches:[{clientX:300,clientY:300}],changedTouches:[{clientX:300,clientY:300}]});
  await fire('touchmove',{touches:[{clientX:380,clientY:340}],changedTouches:[{clientX:380,clientY:340}]});
  await fire('touchend',{touches:[],changedTouches:[{clientX:380,clientY:340}]});
  console.log('  一本指でなぞる: 例外なく処理された');
  // 押して大名を選ぶ
  await rc('全図');
  await fire('touchstart',{touches:[{clientX:400,clientY:500}],changedTouches:[{clientX:400,clientY:500}]});
  await fire('touchend',{touches:[],changedTouches:[{clientX:400,clientY:500}]});
  const t9=document.body.textContent;
  console.log('  押して選ぶ: '+((t9.match(/(\S+) を選んでいます/)||['★選ばれず'])[0]));
  console.log('エラー:', errs.length?errs.slice(0,2).join(' | '):'なし');
  process.exit(0);
})().catch(e=>{console.log("例外:",e.message);process.exit(1);});
