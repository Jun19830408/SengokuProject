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

  /* 新しく始めても、いままでの盤が消えないこと（GDD 15.3）。

     ここが抜けていた。新しく始めると、最初の月送りで自動の枠が黙って
     上書きされる。遊ぶ側から見れば、既にある記録が勝手に消える。
     実際、iPhone で天文二十二年まで進めた盤がこれで失われた。 */
  console.log("── 新しく始めても消えないこと");
  const 前 = store.get('sengoku:save1');
  const 前見 = JSON.parse(前).state;
  確('いま自動の枠に盤がある', !!前見, `${前見.player} ${前見.year}年${前見.month}月`);
  dom.window.confirm = () => true; dom.window.alert = () => {};
  await rc('新しくはじめる'); await flush();
  const 逃 = ['slot1','slot2','slot4','slot5'].map(k=>'sengoku:'+k).filter(k=>store.has(k));
  確('自動の盤が空き枠へ逃げている', 逃.length >= 1, 逃.join('／'));
  if (逃.length) {
    const d = JSON.parse(store.get(逃[0])).state;
    確('逃がした先の中身が、逃がす前と同じ盤である',
      d.player === 前見.player && d.year === 前見.year && d.month === 前見.month,
      `${d.player} ${d.year}年${d.month}月`);
  }
  // 新しい家で始めて月を送り、自動が上書きされても、逃がした枠は残る
  await openFaction('武田家'); await rc('この勢力で開始');
  await rc('次月へ'); await rc('評定を開く');
  const 自動後 = JSON.parse(store.get('sengoku:save1')).state;
  確('自動の枠は新しい盤で上書きされる', 自動後.player === 'takeda', 自動後.player);
  if (逃.length) {
    const d2 = JSON.parse(store.get(逃[0])).state;
    確('逃がした枠は、そのまま残っている', d2.player === 前見.player && d2.year === 前見.year,
      `${d2.player} ${d2.year}年${d2.month}月`);
  }
  確('収めておいた記録 三も無事', store.has('sengoku:slot3')
    && JSON.parse(store.get('sengoku:slot3')).state.player === 'oda');
  // 逃がした枠から、ちゃんと元の盤へ戻れること
  await rc('タイトル'); await flush();
  const 札2 = [...document.querySelectorAll('.modal, button')].map(b=>b.textContent.replace(/\s+/g,' ').trim());
  確('タイトルへ戻れば、逃がした枠も並ぶ',
    document.body.textContent.replace(/\s+/g,' ').includes('織田家'));
  const 織 = [...document.querySelectorAll('button')].find(b=>/織田家/.test(b.textContent));
  if (織) {
    for(const t of ['mousedown','mouseup','click']) await act(async()=>{M(t,織);});
    await flush(); await flush();
    確('逃がした盤から遊びを続けられる',
      /織田家/.test(document.querySelector('.bar')?.textContent||''),
      (document.querySelector('.bar')?.textContent||'').replace(/\s+/g,' ').slice(0,40));
  }
  if(咎) console.log(`  ★記録所で${咎}件が通らなかった`);
  console.log("エラー:", 咎 ? `記録所で${咎}件` : errs.length?errs.slice(0,3).join(" | "):"なし");
  process.exit(咎?1:0);
})().catch(e=>{console.log("例外:",e.message);process.exit(1);});
