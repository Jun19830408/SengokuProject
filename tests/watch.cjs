// 全勢力をAIに任せ、統一まで走らせる
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual:true, url:'http://localhost/' });
global.window=dom.window; global.document=dom.window.document; global.navigator=dom.window.navigator; global.HTMLElement=dom.window.HTMLElement;
let rafMap=new Map(),rafId=0;
global.requestAnimationFrame=cb=>{rafId++;rafMap.set(rafId,cb);return rafId;};
global.cancelAnimationFrame=id=>rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT=true; dom.window.IS_REACT_ACT_ENVIRONMENT=true;
const ctxStub=new Proxy({},{get:(t,p)=>{if(p==='measureText')return()=>({width:30});
 if(p==='createImageData')return(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h});return()=>{};}});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype,'clientWidth',{get(){return 1200;}});
Object.defineProperty(dom.window.HTMLElement.prototype,'clientHeight',{get(){return 800;}});
dom.window.HTMLElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,width:1200,height:800,right:1200,bottom:800};};
const store=new Map();
dom.window.storage={get:async k=>store.has(k)?{key:k,value:store.get(k)}:null,set:async(k,v)=>{store.set(k,v);return{key:k,value:v};},delete:async k=>{store.delete(k);return{};}};
const errs=[]; console.error=(...a)=>errs.push(String(a[0]).slice(0,120));
const {createRoot,act,App,React}=require(require('path').join(__dirname,'..','build','harness.cjs'));
const root=createRoot(document.getElementById('r'));
const flush=async()=>{await act(async()=>{await new Promise(r=>setTimeout(r,6));});};
const M=(t,el)=>el.dispatchEvent(new dom.window.MouseEvent(t,{bubbles:true,clientX:600,clientY:400}));
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
  await rc('ゲームをはじめる');
  // 勢力一覧から織田家を選ぶ
  const all=[...document.querySelectorAll('button')].map(b=>b.textContent.trim());
  console.log('画面のボタン: '+all.slice(0,8).join(' / '));
  await openFaction('新開家');
  const cards=[...document.querySelectorAll('button')].filter(b=>/この勢力を任せて見物する/.test(b.textContent));
  console.log('見物の入口: '+cards.length+'家ぶん');
  if(cards.length){ const b=cards[0];
    await act(async()=>{M('mousedown',b);}); await act(async()=>{M('mouseup',b);}); await act(async()=>{M('click',b);}); await flush(); }
  else { console.log('★入口がない'); process.exit(0); }
  let m=0, stuck=0, unified=null;
  const marks=[];
  while(m<60){
    m++;
    if(!(await rc('次月へ'))){ stuck++; if(stuck>4){
      const btns=[...document.querySelectorAll('button')].map(b=>b.textContent.trim()+(b.disabled?'[不可]':'')).filter(Boolean);
      console.log('★'+m+'か月目で進めない。ボタン: '+btns.slice(0,10).join(' / '));
      const card=document.querySelector('.card');
      if(card) console.log('  内容: '+card.textContent.replace(/\s+/g,' ').slice(0,140));
      break; } }
    else stuck=0;
    await rc('評定を開く');
    const t=document.body.textContent;
    if(/名乗らせる/.test(t)) await rc('と名乗らせる');
    if(/を捕らえた/.test(t)&&/登用する/.test(t)) await rc('捕虜とする');
    if(/身代金の申し出/.test(t)) await rc('受ける');
    if(/包囲中/.test(document.body.textContent)) await rc('兵糧攻め');
    if(/籠城して待つ/.test(document.body.textContent)) await rc('籠城して待つ');
    if(/軍議/.test(document.body.textContent)) await rc('攻めかかる');
    if(/天下/.test(t)&&!unified){ console.log('  ['+Math.floor(m/12)+'年'+(m%12)+'月] 天下の報せ: '+(t.match(/[^。]{0,60}天下[^。]{0,30}。/)||[''])[0]); }
    if(/天下を定めた|この地を統べた|天下が定まった/.test(t)){
      unified = (t.match(/[^。]{0,60}(天下を定めた|この地を統べた)/)||[''])[0];
      console.log('★'+Math.floor(m/12)+'年'+(m%12)+'か月で統一: '+unified); break; }
    const bnow=(t.match(/拠点 (\d+) 城/)||[])[1];
    if(bnow&&Number(bnow)>=54&&!unified){ unified='拠点11城'; console.log('★'+Math.floor(m/12)+'年目に全54城を掌握（統一の知らせ: '+(/天下/.test(t)?'出た':'★出ない')+'）'); break; }
    if(m%60===0){ const k=(t.match(/石高 ([\d.]+) 万石/)||[])[1];
      marks.push(Math.floor(m/12)+'年目: 自家 石高'+k+'万石 拠点'+bnow+'城'); }
  }
  console.log(marks.join('\n'));
  // 世界の勢力図を戦国記から推し量る
  await rc('記録');
  const rec=document.querySelector('.card');
  if(rec) console.log('記録:', rec.textContent.replace(/\s+/g,' ').slice(0,300));
  await rc('閉じる');
  await rc('戦国記');
  const ch=document.querySelector('.card');
  const log=ch?ch.textContent.replace(/\s+/g,' '):'';
  console.log('落城'+(log.match(/が落ち、/g)||[]).length+'件 / 出陣'+(log.match(/出陣/g)||[]).length+'件（直近400件のうち）');
  
  const amb=(log.match(/本陣を衝いた/g)||[]).length;
  const miss=(log.match(/隙を窺ったが/g)||[]).length;
  console.log('奇襲: 成功'+amb+'件 / 不発'+miss+'件');
  const m2=log.match(/[^。]{0,70}本陣を衝いた[^。]{0,60}。/g);
  if(m2) for(const x of m2.slice(0,3)) console.log('  ★'+x);
  console.log('  ', log.slice(0,200));
  console.log('経過:', m+'か月', unified?'統一あり':'統一せず');
  console.log("エラー:", errs.length?errs.slice(0,3).join(" | "):"なし");
  process.exit(0);
})().catch(e=>{console.log("例外:",e.message,"\n",e.stack.split("\n").slice(0,5).join("\n"));process.exit(1);});
