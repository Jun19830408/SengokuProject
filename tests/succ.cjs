// 隠居の欄が人事に出るか確かめる
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
const M=(t,el,x=600,y=400)=>el.dispatchEvent(new dom.window.MouseEvent(t,{bubbles:true,clientX:x,clientY:y}));
const click=async(el)=>{for(const t of['mousedown','mouseup','click']) await act(async()=>{M(t,el);}); await flush();};
const rc=async(t)=>{const el=[...document.querySelectorAll('button,.mbtn')].find(b=>b.textContent.trim().includes(t));
  if(!el||el.disabled)return false; await click(el); return true;};
const openFaction=async(nm)=>{const el=[...document.querySelectorAll('.mn')].find(e=>e.textContent.trim()===nm);
  if(!el)return false; await click(el.parentElement); return true;};
(async()=>{
  await act(async()=>{root.render(React.createElement(App));});await flush();
  await rc('ゲームをはじめる'); await openFaction('新開家'); await rc('この勢力で開始');
  const wrap=document.querySelector('.mapwrap'), cv=wrap.querySelector('canvas');
  // 牛岐城を選ぶ（本拠なので「本拠」ボタンで寄せる）
  await rc('本拠');
  const t0=document.body.textContent;
  console.log('開始:', (t0.match(/1550年\s*\d+月/)||['?'])[0], (t0.match(/石高 [\d.]+ 万石/)||[''])[0]);
  // 城を押す
  for(const [x,y] of [[600,400],[600,380],[620,410]]){
    await act(async()=>{M('mousedown',cv,x,y);}); await act(async()=>{M('mouseup',cv,x,y);}); await flush();
    if([...document.querySelectorAll('button')].some(b=>/人事/.test(b.textContent))) break;
  }
  // 内政を武将の数だけ打てるか
  console.log('内政:', await rc('内政')?'開いた':'★開かない');
  const ti=document.body.textContent;
  console.log('  検地の欄: '+(/検地/.test(ti)?'あり':'★なし'));
  console.log('  '+((ti.match(/[^。]{0,60}(竿は入れられない|竿を入れられる|すでに竿)[^。]{0,30}/)||['★表示なし'])[0]).replace(/\s+/g,' '));
  let n=0;
  for(let i=0;i<0;i++){
    const t=document.body.textContent;
    const m=(t.match(/手の空いている者 (\d+)名／在城 (\d+)名/)||[]);
    if(i===0) console.log('  '+(m[0]||'★人数の表示なし'));
    if(!(await rc('を実行'))) break;
    n++;
  }
  console.log('  打てた回数: '+n+'回');
  const t2=document.body.textContent;
  console.log('  '+(t2.match(/本月すでに務めた者：[^<]{0,60}/)||['（表示なし）'])[0]);
  console.log('  締め: '+(t2.match(/この城の者はみな本月の務めを果たした。/)||['★出ない'])[0]);
  // 外交の相手
  console.log('外交:', await rc('外交')?'開いた':'★開かない');
  const sel=document.querySelector('.sheet select');
  if(sel){ const opts=[...sel.options].map(o=>o.textContent);
    console.log('  相手の候補 '+opts.length+'家、近い順: '+opts.slice(0,5).join(' / '));
    console.log('  既定: '+opts[sel.selectedIndex]); }
  else console.log('  ★選択欄がない');
  // 調略が打てるか
  console.log('調略:', await rc('調略')?'開いた':'★開かない');
  const t3=document.body.textContent;
  const sels=[...document.querySelectorAll('.sheet select')];
  console.log('  相手の候補: '+(sels[0]?[...sels[0].options].length+'城 例:'+[...sels[0].options].slice(0,3).map(o=>o.textContent).join('／'):'★なし'));
  console.log('  担当の候補: '+(sels[1]?[...sels[1].options].length+'名':'★なし'));

  console.log('  見込みの表示: '+((t3.match(/[^。]{0,40}仕掛ける見込み[^。]{0,20}/)||['★なし'])[0]).replace(/\s+/g,' '));
  console.log('  要する知略: '+((t3.match(/要する知略 \d+/)||['★なし'])[0]));
  const before=(t3.match(/金銭 ([\d,]+) 貫/)||[])[1];
  console.log('  仕掛ける:', await rc('を仕掛ける')?'押せた':'★押せない');
  const t4=document.body.textContent;
  console.log('  金銭: '+before+' → '+((t4.match(/金銭 ([\d,]+) 貫/)||[])[1]));
  console.log('  進行中: '+(t4.match(/進行中の調略/)?'表示あり':'★なし'));
  // 外交の条件
  console.log('外交:', await rc('外交')?'開いた':'★開かない');
  const btns=[...document.querySelectorAll('.sheet button')].filter(b=>/^(親善|不可侵|同盟|従属|臣従|独立)$/.test(b.textContent.trim()));
  console.log('  '+btns.map(b=>b.textContent.trim()+(b.disabled?'[不可]':'[可]')).join(' / '));
  const t=document.body.textContent;
  console.log('隠居の欄:', /家督を譲る（隠居）/.test(t)?'出た':'★出ない');
  const btn=[...document.querySelectorAll('button')].filter(b=>/に譲る/.test(b.textContent)).map(b=>b.textContent.replace(/\s+/g,' ').trim());
  console.log('  候補: '+btn.join(' ／ '));
  if(btn.length){
    await rc('に譲る');
    const t2=document.body.textContent;
    console.log('譲った後:', (t2.match(/[^。]{0,40}(隠居し|家督を継いだ)[^。]{0,30}。/)||['★記録なし'])[0]);
    console.log('  武将欄:', /【隠居】/.test(t2)?'【隠居】が出た':'★出ない', /【当主】/.test(t2)?'／【当主】も出た':'');
  }
  console.log('エラー:', errs.length?errs.slice(0,2).join(' | '):'なし');
  process.exit(0);
})().catch(e=>{console.log("例外:",e.message);process.exit(1);});
