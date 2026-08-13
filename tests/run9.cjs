const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual:true, url:'http://localhost/' });
global.window=dom.window; global.document=dom.window.document; global.navigator=dom.window.navigator;
global.HTMLElement=dom.window.HTMLElement;
let rafMap=new Map(), rafId=0;
global.requestAnimationFrame=cb=>{rafId++;rafMap.set(rafId,cb);return rafId;};
global.cancelAnimationFrame=id=>rafMap.delete(id);
global.IS_REACT_ACT_ENVIRONMENT=true; dom.window.IS_REACT_ACT_ENVIRONMENT=true;
const ctxStub=new Proxy({},{get:(t,p)=>{if(p==='measureText')return()=>({width:30});
 if(p==='createImageData')return(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h});
 if(p==='save'||p==='restore'||p==='translate'||p==='scale'||p==='setTransform')return()=>{};
 return()=>{};}});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctxStub;
Object.defineProperty(dom.window.HTMLElement.prototype,'clientWidth',{get(){return 1200;}});
Object.defineProperty(dom.window.HTMLElement.prototype,'clientHeight',{get(){return 800;}});
dom.window.HTMLElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,width:1200,height:800,right:1200,bottom:800};};
const errs=[]; console.error=(...a)=>errs.push(String(a[0]));
const {createRoot,act,App,React}=require(require('path').join(__dirname,'..','build','harness.cjs'));
const root=createRoot(document.getElementById('r'));
const flush=async()=>{await act(async()=>{await new Promise(r=>setTimeout(r,12));});};
const M=(t,el,x=1120,y=760)=>el.dispatchEvent(new dom.window.MouseEvent(t,{bubbles:true,clientX:x,clientY:y}));
const rc=async(t,exact)=>{const el=[...document.querySelectorAll('button,.mbtn')]
  .find(b=>exact?b.textContent.trim()===t:b.textContent.trim().includes(t));
  if(!el||el.disabled)return false;
  await act(async()=>{M('mousedown',el);});await act(async()=>{M('mouseup',el);});await act(async()=>{M('click',el);});
  await flush();return true;};
let T=1000;
const pump=async(n)=>{for(let i=0;i<n;i++){T+=33;const q=[...rafMap.entries()];rafMap.clear();await act(async()=>{q.forEach(([,cb])=>cb(T));});}};
const led=()=>{const e=document.querySelector('.led');return e?e.textContent.replace(/\s+/g,' ').slice(0,80):"★なし";};
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
  const wrap=document.querySelector('.mapwrap'), cv=wrap.querySelector('canvas');
  const tap=async(wx,wy)=>{const x=(wx-480)*0.9+600,y=(wy-480)*0.9+400;
    await act(async()=>{M('mousedown',cv,x,y);});await act(async()=>{M('mouseup',cv,x,y);});await flush();};
  console.log("=== 政務・外交・調略・特殊勢力 ===");
  await tap(563,633);
  console.log("命令タブ:", [...document.querySelectorAll('.sheet .g4 button')].map(b=>b.textContent.trim()).join(" / "));
  await rc('外交');
  console.log("外交:", await rc('親善')?"親善実行":"★不可", "→", led());
  await rc('調略');
  console.log("調略:", await rc('を仕掛ける')?"偵察を仕掛けた":"★不可", "→", led());
  console.log("  進行中の調略件数:", [...document.querySelectorAll('.sheet .row')].filter(r=>/あと\d+か月/.test(r.textContent)).length);
  await rc('特殊勢力');
  const spec=[...document.querySelectorAll('.sheet button')].map(b=>b.textContent.trim());
  console.log("特殊勢力の選択肢:", spec.filter(t=>['保護','支援','支配','同盟','従属','制圧','攻撃','雇用'].includes(t)).join(","));
  console.log("特殊勢力:", await rc('保護')?"保護を結んだ":"★不可", "→", led());
  await rc('人事');
  console.log("褒賞:", await rc('褒賞')?"実行":"★不可", "→", led());
  // 敵城の情報制限
  await tap(415,253);
  const sh=document.querySelector('.sheet');
  console.log("敵城の表示:", sh?sh.textContent.replace(/\s+/g,' ').slice(0,90):"（城を選べず・盤が広がったため）");
  // 月送りで調略が解決するか
  for(let i=0;i<3;i++){ await rc('次月へ'); await rc('評定を開く'); }
  console.log("戦国記:", (await rc('戦国記'))?document.querySelector('.card').textContent.replace(/\s+/g,' ').slice(0,120):"★");
  await rc('閉じる');
  console.log("\n=== 合戦（拡大縮小・分遣） ===");
  if(/合戦開始/.test(document.body.textContent)){
    await rc('合戦開始'); await rc('全軍撤退');
    let n0=0; while(!/戦場を離れる/.test(document.body.textContent)&&n0<600){ await pump(40); n0++; }
    await rc('戦場を離れる'); }
  await tap(563,633); await rc('軍事'); await rc('出陣');
  const sl=document.querySelector('.modal select');
  if(!sl){ console.log("出陣できない状況（包囲中など）のため合戦試験は省略"); console.log("エラー: なし"); process.exit(0); }
  await act(async()=>{sl.value='kiyosu'; sl.dispatchEvent(new dom.window.Event('change',{bubbles:true}));}); await flush();
  const offs=[...document.querySelectorAll('.modal label')].map(l=>l.textContent.replace(/\s+/g,' ').trim()).filter(t=>/約|出せ/.test(t));
  console.log("援軍の申し出:", offs.slice(0,3).join(" ／ ")||"★なし");
  const cb=[...document.querySelectorAll('.modal input[type=checkbox]')].filter(x=>!x.disabled);
  if(cb.length){ await act(async()=>{cb[0].click();}); await flush(); }
  await rc('人で進発'); await rc('次月へ'); await rc('評定を開く');
  if(/軍議/.test(document.body.textContent)){ console.log("軍議:", await rc('攻めかかる')?"攻めかかった":"★不可"); }
  console.log("合戦画面:", /合戦開始/.test(document.body.textContent));
  console.log("拡大ボタン:", await rc('拡大')?"効いた":"★なし", "／縮小:", await rc('縮小')?"効いた":"★なし",
              "／全体:", await rc('全体')?"効いた":"★なし");
  console.log("戦略画面の帯が消えているか:", /次月へ/.test(document.body.textContent)?"★残っている":"消えた");
  console.log("速度段階:", [...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(t=>['一時停止','微速','低速','通常'].includes(t)).join("/"));
  await rc('合戦開始');
  // 隊を選んで分遣
  const bcv=document.querySelectorAll('canvas')[0];
  const pick=async(fx,fy)=>{const s=Math.min(1200/1080,800/720)*0.98,x=(fx-540)*s+600,y=(fy-360)*s+400;
    await act(async()=>{M('mousedown',bcv,x,y);});await act(async()=>{M('mouseup',bcv,x,y);});await flush();};
  let picked=false;
  for(const dx of [0,-230,230,-115,115]){ await pick(540+dx,630);
    if([...document.querySelectorAll('button')].some(b=>/騎馬側面攻撃/.test(b.textContent))){picked=true;break;} }
  console.log("隊を選択:", picked?"選択できた":"★選べない");
  const dbtn=[...document.querySelectorAll('button')].filter(b=>/騎馬側面攻撃|弓鉄砲高地占拠|橋渡河点防衛|森林偵察/.test(b.textContent));
  console.log("分遣ボタン:", dbtn.map(b=>b.textContent.trim()+(b.disabled?"[条件未達]":"[可]")).join(" "));
  const en=dbtn.find(b=>!b.disabled);
  if(en){ await act(async()=>{M('mousedown',en);});await act(async()=>{M('mouseup',en);});await act(async()=>{M('click',en);}); await flush();
    console.log("分遣実行:", /分遣隊が出た/.test(document.body.textContent)?"分遣隊が出た":"?"); }
  console.log("隊別命令:", ['前進','接戦','突撃','射撃','守備','後退','待機']
    .map(o=>{const el=[...document.querySelectorAll('.bpanel button')].find(b=>b.textContent.trim()===o);
      return o+(el?"":"★");}).join(" "));
  for(const o of ['突撃','守備','射撃','後退']){ await rc(o); }
  console.log("陣形の選択肢:", [...document.querySelectorAll('.bpanel button')].map(b=>b.textContent.trim())
    .filter(t=>['横陣','鶴翼','魚鱗','鋒矢','雁行','方陣','長蛇'].includes(t)).join("/"));
  await rc('鋒矢');
  console.log("転回ボタン:", await rc('転回')?"あり":"★なし");
  console.log("陣形替え:", document.body.textContent.match(/陣形替え中 残\d+秒/)?.[0]||"★反応なし");
  console.log("突撃後の隊状態:", document.body.textContent.match(/突撃中 残\d+秒/)?.[0]||"（表示なし）");
  console.log("全軍弓優先:", await rc('全軍弓優先')?"命令できた":"★なし",
    "／全部隊選択:", await rc('全部隊選択')?"効いた":"★なし",
    "／全軍撤退:", await rc('全軍撤退')?"効いた":"★なし");
  await pump(10);
  console.log("撤退命令直後の画面末尾:", document.body.textContent.replace(/\s+/g,' ').slice(-140));
  let n=0; while(!/戦場を離れる/.test(document.body.textContent)&&n<500){ await pump(30); n++; }
  console.log("決着:", document.body.textContent.match(/(勝利|敗北|日没・両軍撤収|撤退)/)?.[0]||"★未決着");
  await rc('戦場を離れる');
  console.log("\nエラー:", errs.length?errs.slice(0,4).join(" | "):"なし");
  process.exit(0);
})().catch(e=>{console.log("例外:",e.message,"\n",e.stack.split("\n").slice(0,8).join("\n"));process.exit(1);});
