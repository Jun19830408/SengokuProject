/* ==========================================================================
   背中越しの札と釦（一人働きの試し）

   合戦の画面（ui/BattleScreen.jsx）の盤の上に重ねる。合戦の画面のファイルを大きく
   変えないよう、ここにまとめた。見た目と手の入りは、先にお見せした試し版（触って
   動かす版）と同じにしてある。

     左上   … 名札（足軽 与平・勲功・体力・気力・組の名）。合戦が止まっていれば、その知らせ。
              名札は、ふだんは小さく畳んで身分と体力・気力だけを出し（持ち場の外にいれば、その一行も）、名札を押せば
              開いて討ち取り・勲功・手勢・持ち場を出す（もう一度押せば畳む）。遊ぶ人の申し出（「左上のステータスですが
              大きすぎて前が見にくいです。閉じれるようにするか、小さくするかしてください。体力と気力は常に表示させるが、
              小さく表示するように」）による。開け閉めは端末に覚える（棚の sengoku:名札）
     左半分 … 指を置いた所に方向キーが出る。指を置いているあいだ輪はその所に留まり（指が輪の外へ出ても、つまみが輪の縁で
              止まるだけ）、指を離せば消える。もとは指が輪の外へ出ると輪のほうが指についてきたが、遊ぶ人の申し出（「置いた
              ところで固定してほしい。前進するためにカーソルを移動するとコントローラごと移動してしまう」）により留めた
     右半分 … なぞれば視点が回る（横になぞれば与平のまわりを回り、縦になぞれば見下ろす角が変わる。hitori/senaka.js 視を回す）。
              方向キーを押さえたまま、右半分をなぞってもよい。回していれば、右の釦の上に「視点を戻す」が出る
     右下   … 突く（押す）／受ける（押しているあいだ）／駆ける（押しているあいだ）
     真ん中 … 知らせ（討ち取り・息が上がっている）、討死の札
   パソコンでは WASD か矢印キーで動き、J（または空白）で突く、K で受ける、Shift で駆ける。Q・E で視点を横に回す
   （右半分をマウスでなぞっても回る）。
   五人長から三百人長（率いるとき）は、方向キーで手勢を動かし、三つの釦は一人のときと同じ突く・受ける・駆けるを手勢の全体で
   行う（突く（全体）・受ける（全体）・駆ける（全体）。hitori/senaka.js 手勢の突き合い）。四つ目の釦（L）で
   一騎駆け（与平が手勢を離れて自分で戦う。一騎駆けの秒ののち手勢へ戻る。hitori/senaka.js 一騎駆け）。

   盤の左下の「盤の視点」の釦（BattleScreen.jsx）は、この札の重なりより上に置かれている。
   与平の動きそのもの（歩み・突き・敵の掛かり）は hitori/senaka.js にある。
   ここは 態.入（方向・受け・駆け）を書き、突く・受ける・与平を立て直す を呼ぶだけである。

   物頭（態.身分＝"物頭"）は自分では動かない（遊ぶ人の申し出：物頭以降は背中視点はできるが、それまでの
   指示はできず、部隊としての通常の指示）。名札に預かる隊（兵の数・いまの下知）を出すだけで、方向キー・
   三つの釦・鍵盤は出さない。隊への下知は、合戦の画面の右の欄から出す。

   盤から地へ降りる（ui/BattleScreen.jsx 降りRef）。段＝"途中"（降りている途中）のあいだは、札も釦も出さず、
   二本の指のピンチと車だけを受けて on寄り（倍）へ渡す（寄せれば降り、引けば昇る）。段＝"地"では、名札・
   方向キー・釦に加えて、ピンチと車も受ける。二本目の指を置けばピンチになり、方向キーと視点を回すのはやめる。
   ただし、方向キーを押さえている指のほかに右半分へ置いた指は、ピンチにせず視点を回す（歩みながら見回せる）。
   釦の上に置いた指はピンチに数えない。
   物頭と見物は方向キーが無いので、画面のどこをなぞっても視点が回る（Q・E も同じ）。
   見物（態.身分＝"見物"。ふだんの合戦で地へ降りたとき）は、見るだけの札（地の眺め・盤へ戻る釦）を出す。
   ========================================================================== */
import React, { useEffect, useRef, useState } from "react";
import { 突く, 受ける, 与平を立て直す, 持ち場の間, 合戦の勲功, 手勢の倒し, 一騎駆け, 率いている, 一騎駆けの残り, 一騎駆けの秒,
  視を回す, 視を戻す, 視を回しているか } from "./senaka.js";
import { 下知の名 } from "./tezei.js";

const R杖 = 52;                                   // 方向キーの輪の半径（px。試し版と同じ）
/* なぞって視点を回す速さ（一px につき回る角）。横は画面の幅の半分（四百八十px）で百六十五度ほど、縦は百px で二十三度ほど。値は仮 */
export const 視のなぞりの横 = 0.006, 視のなぞりの縦 = 0.004;
const 型 = `
.snk{position:absolute;inset:0;z-index:4;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;
  font-family:'Hiragino Mincho ProN','Yu Mincho','YuMincho','MS Mincho',serif;color:#F4F1E8}
.snk .nop{pointer-events:none}
.snk .glass{background:rgba(22,24,28,.8);border:1.5px solid rgba(226,200,119,.55);border-radius:9px;box-shadow:0 2px 8px rgba(0,0,0,.35)}
.snk-tl{position:absolute;left:max(10px,env(safe-area-inset-left));top:8px;display:grid;gap:6px;justify-items:start}
.snk-me{width:224px;padding:7px 11px 8px}
.snk-me .row{display:flex;align-items:baseline;gap:8px}
.snk-me .mibun{background:#B0483C;color:#F4F1E8;font-size:11.5px;font-weight:700;padding:0 7px;border-radius:4px;white-space:nowrap;flex:none}
.snk-me .na{font-size:19px;font-weight:700;letter-spacing:.06em;white-space:nowrap;flex:none}
.snk-me .kun{margin-left:auto;font-family:'Hiragino Sans','Yu Gothic UI','Meiryo',system-ui,sans-serif;font-size:11.5px;color:#CFCBC0;font-variant-numeric:tabular-nums}
.snk-me .kun b{color:#E2C877;font-size:15px}
.snk-me .kumi{margin-top:4px;font-size:11px;color:#CFCBC0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.snk-gauge{display:grid;grid-template-columns:32px 1fr;align-items:center;gap:7px;margin-top:5px;font-size:11.5px;color:#CFCBC0}
.snk-gauge .tr{height:9px;background:rgba(255,255,255,.12);border-radius:5px;overflow:hidden}
.snk-gauge .tr i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,#4E8A3C,#7DB35A)}
.snk-gauge .tr i.low{background:linear-gradient(90deg,#8A3C32,#C25A48)}
.snk-kiryoku{display:flex;gap:3px}
.snk-kiryoku i{flex:1;height:8px;border-radius:3px;background:rgba(226,200,119,.2);overflow:hidden}
.snk-kiryoku i b{display:block;height:100%;background:#E2C877}
.snk-tomari{padding:4px 10px 5px;font-size:12.5px;font-weight:700;border-left:3px solid #E2C877;border-radius:0 6px 6px 0}
.snk-tomari small{display:block;font-size:11px;font-weight:400;color:#CFCBC0}
.snk-me{position:relative}
.snk-me.snk-tatami{width:auto;min-width:0;display:grid;grid-template-columns:auto 104px;align-items:center;column-gap:7px;row-gap:3px;padding:5px 22px 5px 7px}
.snk-me.snk-tatami .mibun{grid-row:1 / span 2;font-size:10.5px;padding:1px 5px}
.snk-me.snk-tatami .na{font-size:13px;grid-row:1 / span 2}
.snk-mg{display:grid;grid-template-columns:20px 1fr;align-items:center;gap:4px;font-size:9.5px;line-height:1;color:#CFCBC0}
.snk-mg .tr{height:5px;background:rgba(255,255,255,.12);border-radius:3px;overflow:hidden}
.snk-mg .tr i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,#4E8A3C,#7DB35A)}
.snk-mg .tr i.low{background:linear-gradient(90deg,#8A3C32,#C25A48)}
.snk-mg .snk-kiryoku{gap:2px}
.snk-mg .snk-kiryoku i{height:5px;border-radius:2px}
.snk .snk-tl .snk-kai{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;border-radius:9px;background:transparent;pointer-events:auto;cursor:pointer;touch-action:none;color:#E2C877;font:inherit}
.snk-kai span{position:absolute;right:6px;top:3px;font-size:10px;line-height:1;opacity:.85}
.snk-kai:focus-visible{outline:2px solid #E2C877;outline-offset:2px}
.snk-mochiba.snk-tatami{margin-top:0;padding:2px 7px 3px;font-size:10.5px;background:rgba(60,20,16,.78);border-radius:0 5px 5px 0;white-space:nowrap}
.snk-mochiba.snk-tatami b{margin-left:6px}
.snk-maru{position:absolute;border-radius:50%;display:grid;place-items:center;text-align:center;font-weight:700;letter-spacing:.08em;color:#F4F1E8;font-family:inherit;
  background:radial-gradient(circle at 50% 35%,rgba(60,62,68,.92),rgba(18,19,22,.92));border:2.5px solid #E2C877;box-shadow:0 3px 12px rgba(0,0,0,.45);padding:0;cursor:pointer;touch-action:none}
.snk-maru i{display:block;font-style:normal;color:#E2C877;line-height:1;margin-bottom:3px}
.snk-maru .zen{display:block;font-size:10.5px;font-weight:700;color:#E2C877;letter-spacing:.12em;line-height:1;margin-top:3px}
.snk-maru.press{transform:scale(.9);background:radial-gradient(circle at 50% 35%,rgba(150,118,56,.96),rgba(52,40,20,.96));box-shadow:0 0 0 3px rgba(240,214,130,.85),0 0 22px rgba(240,214,130,.7)}
.snk-maru:focus-visible{outline:2px solid #E2C877;outline-offset:2px}
.snk-tsuku{width:104px;height:104px;right:max(12px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));font-size:19px}.snk-tsuku i{font-size:22px}
.snk-ukeru{width:76px;height:76px;right:calc(max(12px,env(safe-area-inset-right)) + 116px);bottom:max(10px,env(safe-area-inset-bottom));font-size:14.5px}.snk-ukeru i{font-size:18px}
.snk-kakeru{width:66px;height:66px;right:calc(max(12px,env(safe-area-inset-right)) + 84px);bottom:calc(max(10px,env(safe-area-inset-bottom)) + 110px);font-size:13px}.snk-kakeru i{font-size:16px}
.snk-ikki{width:66px;height:66px;right:max(12px,env(safe-area-inset-right));bottom:calc(max(10px,env(safe-area-inset-bottom)) + 124px);font-size:12.5px;letter-spacing:.02em}.snk-ikki i{font-size:16px}
.snk-ikki.on{background:radial-gradient(circle at 50% 35%,rgba(150,118,56,.96),rgba(52,40,20,.96));cursor:default}
.snk-modosu{position:absolute;right:max(12px,env(safe-area-inset-right));bottom:calc(max(10px,env(safe-area-inset-bottom)) + 202px);
  font:inherit;font-size:13px;font-weight:700;letter-spacing:.04em;color:#F4F1E8;padding:6px 12px 7px;cursor:pointer;touch-action:none}
.snk-modosu.low{bottom:max(10px,env(safe-area-inset-bottom))}
.snk-modosu i{font-style:normal;color:#E2C877;margin-right:5px}
.snk-modosu:focus-visible{outline:2px solid #E2C877;outline-offset:2px}
.snk-joy{position:absolute;width:112px;height:112px;margin:-56px 0 0 -56px;border-radius:50%;border:2px solid rgba(240,214,130,.75);background:radial-gradient(circle,rgba(22,24,28,.15),rgba(22,24,28,.45));pointer-events:none}
.snk-joy::before,.snk-joy::after{content:"";position:absolute;left:50%;top:50%;width:76%;height:0;border-top:1px dashed rgba(240,214,130,.35);transform:translate(-50%,-50%)}
.snk-joy::after{transform:translate(-50%,-50%) rotate(90deg)}
.snk-knob{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:radial-gradient(circle at 45% 38%,rgba(246,226,160,.95),rgba(176,140,60,.95));box-shadow:0 2px 8px rgba(0,0,0,.45)}
.snk-hint{position:absolute;left:6%;top:50%;width:38%;transform:translateY(-50%);display:grid;justify-items:center;gap:8px;text-align:center;transition:opacity .6s}
.snk-hint .ring{width:84px;height:84px;border-radius:50%;border:2px dashed rgba(240,214,130,.85);display:grid;place-items:center;font-size:22px;color:#E2C877;background:rgba(22,24,28,.25)}
.snk-hint p{margin:0;font-size:13px;line-height:1.5;background:rgba(22,24,28,.72);padding:4px 10px;border-radius:6px}
.snk-hint p small{display:block;font-size:11px;color:#CFCBC0}
.snk-pops{position:absolute;left:50%;top:84px;transform:translateX(-50%);display:grid;justify-items:center;gap:4px}
@media (max-width:600px){.snk-pops{top:132px}}
.snk-pop{background:rgba(22,24,28,.9);border:1.5px solid #E2C877;border-radius:7px;padding:4px 12px 5px;font-size:14.5px;font-weight:700;white-space:nowrap;animation:snk-pop 1.9s ease-out forwards}
.snk-pop b{color:#E2C877;margin-left:8px}
.snk-pop.warn{border-color:#E07A6C}
.snk-pop.kubi{border:2px solid #E2C877;background:rgba(92,62,18,.95);font-size:17px;padding:6px 16px 7px;animation-duration:3.2s}
.snk-mochiba{margin-top:6px;padding:4px 8px 5px;border-left:3px solid #E07A6C;background:rgba(176,72,60,.24);border-radius:0 6px 6px 0;font-size:12.5px;font-weight:700}
.snk-mochiba b{margin-left:8px;color:#F0A090;font-family:'Hiragino Sans','Yu Gothic UI','Meiryo',system-ui,sans-serif;font-variant-numeric:tabular-nums}
.snk-mochiba small{display:block;font-size:11px;font-weight:400;color:#CFCBC0}
@keyframes snk-pop{0%{opacity:0;transform:translateY(6px)}10%{opacity:1;transform:none}75%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}
@media (prefers-reduced-motion:reduce){.snk-pop{animation-duration:2.4s}.snk-hint{transition:none}}
.snk-panel{position:absolute;inset:0;display:grid;place-items:center;background:rgba(8,9,11,.62);z-index:10}
.snk-panel .box{background:rgba(22,24,28,.94);border:1.5px solid #E2C877;border-radius:10px;padding:18px 26px 20px;text-align:center;display:grid;gap:8px;min-width:250px;max-width:calc(100% - 32px)}
.snk-panel h2{margin:0;font-size:30px;letter-spacing:.2em;font-weight:700;color:#E8A090}
.snk-panel p{margin:0;font-size:14px;color:#CFCBC0}
.snk-panel .btns{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:6px}
.snk-panel button{font:inherit;font-size:15px;font-weight:700;color:#F4F1E8;background:#B0483C;border:0;border-radius:7px;padding:9px 16px;cursor:pointer}
.snk-panel button.sub{background:rgba(255,255,255,.12)}
.snk-panel button:focus-visible{outline:2px solid #E2C877;outline-offset:2px}
`;

/* 鍵盤の割り当て（試し版と同じ） */
const 鍵 = { KeyW: "u", ArrowUp: "u", KeyS: "d", ArrowDown: "d", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r" };

/* 止め … 盤が止まっている訳。"停止"（停止の釦で止めた）・"段"（合戦の段でない：始まる前・決着ののち）・""（進んでいる） */
export default function SenakaFuda({ 態, b, 段 = "地", 止め, on寄り, onLeave }) {
  const 根Ref = useRef(null), 輪Ref = useRef(null), 玉Ref = useRef(null), 杖 = useRef(null), 視杖 = useRef(null);   // 視杖 … 視点を回している指
  const 指Ref = useRef(new Map()), 摘みRef = useRef(null);   // 置いている指（釦の上でないもの）と、ピンチの指の隔たり
  /* 討死の札の「盤の視点へ」を pointerdown で押した刻（直後の click を捨てる）。盤の左下の視点の釦（ui/BattleScreen.jsx
     視点の釦の手当て）と同じく、ほかの指を置いたままでも効くように、指が触れた時に盤へ戻る */
  const 離れの押しRef = useRef(0);
  const [突押, set突押] = useState(false);
  const [卓, set卓] = useState(false);
  useEffect(() => { try { set卓(!!(window.matchMedia && window.matchMedia("(pointer: fine)").matches)); } catch (_) {} }, []);
  /* 名札を開いているか（上の 左上）。はじめは畳む。開け閉めは端末に覚える */
  const [札開, set札開] = useState(() => { try { return localStorage.getItem("sengoku:名札") === "開"; } catch (_) { return false; } });

  /* 鍵盤。札が出ているあいだだけ聞く。この札の釦に手があるとき（Enter・空白）は釦に任せる。
     上の速さの釦などに手が残っていても、空白は突きに使う（その釦を押し直さない） */
  useEffect(() => {
    if (!態) return undefined;
    const 入 = 態.入, 動けぬ = 態.身分 === "物頭";      // 物頭は Q・E（視点を回す）だけを聞く
    const 視の鍵 = { KeyQ: "視左", KeyE: "視右" };
    const 書く場か = (e) => { const el = e.target; return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable); };
    const 釦か = (e) => !!(e.target && e.target.closest && e.target.closest("button"));
    const 内か = (e) => !!(根Ref.current && e.target && 根Ref.current.contains(e.target));
    const down = (e) => {
      if (書く場か(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (視の鍵[e.code]) { 入.keys.add(視の鍵[e.code]); e.preventDefault(); return; }
      if (動けぬ) return;
      if (釦か(e) && (e.key === "Enter" || (e.key === " " && 内か(e)))) return;
      if (鍵[e.code]) { 入.keys.add(鍵[e.code]); e.preventDefault(); }
      if (e.code === "KeyJ" || e.code === "Space") { if (!e.repeat) 突く(態); e.preventDefault(); }
      if (e.code === "KeyK") { if (!e.repeat) 受ける(態, true); }
      if (e.key === "Shift") 入.駆 = true;
      if (e.code === "KeyL") { if (!e.repeat) 一騎駆け(態); e.preventDefault(); }
    };
    const up = (e) => {
      if (視の鍵[e.code]) { 入.keys.delete(視の鍵[e.code]); return; }
      if (動けぬ) return;
      if (e.code === "Space" && 釦か(e) && !内か(e)) e.preventDefault();
      if (鍵[e.code]) 入.keys.delete(鍵[e.code]);
      if (e.code === "KeyK") 受ける(態, false);
      if (e.key === "Shift") 入.駆 = false;
    };
    const 離す = () => { 入.keys.clear(); 入.受 = false; 入.駆 = false; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", 離す);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", 離す); 離す(); };
  }, [態]);

  if (!態 || !態.我) return null;
  const 我 = 態.我, 入 = 態.入, 物頭 = 態.身分 === "物頭", 見物 = 態.身分 === "見物";
  const 終 = 態.終 && 態.t >= 態.終.t ? 態.終 : null;

  /* ---- 方向キー（左半分に指を置いた所に出る） ---- */
  const 所 = (e) => { const r = 根Ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r.width]; };
  const 方向キーをやめる = () => { if (杖.current) { 杖.current = null; if (輪Ref.current) 輪Ref.current.style.display = "none"; 入.jx = 0; 入.jy = 0; } };
  const 下 = (e) => {
    if (!根Ref.current) return;
    if (e.target.closest && e.target.closest("button")) return;
    指Ref.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { 根Ref.current.setPointerCapture(e.pointerId); } catch (_) {}
    const [u, v, w] = 所(e), 地 = 段 === "地" && !終;
    /* 方向キーを押さえたまま右半分に置いた指は、ピンチにせず視点を回す（歩みながら見回せる） */
    if (地 && 杖.current && !視杖.current && !摘みRef.current && u >= w * 0.5 && 指Ref.current.size === 2) {
      視杖.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; e.preventDefault(); return;
    }
    if (指Ref.current.size >= 2) {                         // 二本目の指：ピンチ（方向キーと視点を回すのはやめる）
      方向キーをやめる(); 視杖.current = null;
      const ids = [...指Ref.current.keys()].slice(-2), [a, c] = ids.map((k) => 指Ref.current.get(k));
      摘みRef.current = { ids, d: Math.hypot(a.x - c.x, a.y - c.y) };
      e.preventDefault(); return;
    }
    if (!地 || 杖.current) return;
    /* 右半分（方向キーの無い物頭・見物は、どこでも）：視点を回す */
    if (u >= w * 0.5 || 物頭 || 見物) { 視杖.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; e.preventDefault(); return; }
    杖.current = { id: e.pointerId, ox: u, oy: v };
    const j = 輪Ref.current; if (j) { j.style.left = `${u}px`; j.style.top = `${v}px`; j.style.display = "block"; }
    if (玉Ref.current) 玉Ref.current.style.transform = "";
    入.jx = 0; 入.jy = 0; e.preventDefault();
  };
  const 動 = (e) => {
    if (指Ref.current.has(e.pointerId)) 指Ref.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const 摘 = 摘みRef.current;
    if (摘) {
      const a = 指Ref.current.get(摘.ids[0]), c = 指Ref.current.get(摘.ids[1]);
      if (a && c) { const d = Math.hypot(a.x - c.x, a.y - c.y); if (摘.d > 0 && d > 0 && on寄り) on寄り(d / 摘.d); 摘.d = d; }
      return;
    }
    const 視0 = 視杖.current;
    if (視0 && e.pointerId === 視0.id) {
      const dx = e.clientX - 視0.x, dy = e.clientY - 視0.y; 視0.x = e.clientX; 視0.y = e.clientY;
      if (dx || dy) 視を回す(態, dx * 視のなぞりの横, dy * 視のなぞりの縦);
      return;
    }
    const j0 = 杖.current; if (!j0 || e.pointerId !== j0.id) return;
    const [u, v] = 所(e);
    let dx = u - j0.ox, dy = v - j0.oy; const L = Math.hypot(dx, dy);
    if (L > R杖) { dx = (dx / L) * R杖; dy = (dy / L) * R杖; }   // 輪は置いた所に留め、つまみは輪の縁で止める（向きは指のほう）
    if (玉Ref.current) 玉Ref.current.style.transform = `translate(${dx}px,${dy}px)`;
    入.jx = dx / R杖; 入.jy = dy / R杖;
  };
  const 放す = (e) => {
    指Ref.current.delete(e.pointerId);
    if (摘みRef.current && 摘みRef.current.ids.includes(e.pointerId)) 摘みRef.current = null;
    if (視杖.current && 視杖.current.id === e.pointerId) 視杖.current = null;
    const j0 = 杖.current; if (!j0 || e.pointerId !== j0.id) return;
    杖.current = null; if (輪Ref.current) 輪Ref.current.style.display = "none"; 入.jx = 0; 入.jy = 0;
  };
  /* 盤の手当て（寄せ・引き・選び）へは渡さない */
  const 止める = (e) => e.stopPropagation();

  /* ---- 三つの釦 ---- */
  const 釦 = (種) => ({
    onPointerDown: (e) => {
      e.preventDefault(); e.stopPropagation();
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
      if (種 === "突") { set突押(true); 突く(態); }
      if (種 === "受") 受ける(態, true);
      if (種 === "駆") 入.駆 = true;
    },
    onPointerUp: () => { if (種 === "突") set突押(false); if (種 === "受") 受ける(態, false); if (種 === "駆") 入.駆 = false; },
    onPointerCancel: () => { if (種 === "突") set突押(false); if (種 === "受") 受ける(態, false); if (種 === "駆") 入.駆 = false; },
    onLostPointerCapture: () => { if (種 === "突") set突押(false); if (種 === "受") 受ける(態, false); if (種 === "駆") 入.駆 = false; },
    onKeyDown: (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault(); e.stopPropagation();
      if (種 === "突" && !e.repeat) 突く(態);
      if (種 === "受" && !e.repeat) { 受ける(態, true); setTimeout(() => 受ける(態, false), 0); }   // 軽く押した受け（〇.三秒構える）
    },
  });

  const 体 = Math.round(我.hp), 気 = 我.気;
  /* 名札の開け閉め（上の 左上）。名札の上に重ねた透けた釦で受ける（方向キーの指には数えない） */
  const 開け閉め = (e) => {
    e.preventDefault(); e.stopPropagation();
    const n = !札開; set札開(n);
    try { localStorage.setItem("sengoku:名札", n ? "開" : "閉"); } catch (_) {}
    try { e.currentTarget.blur(); } catch (_) {}                      // 空白の鍵が名札の開け閉めでなく突きに効くよう
  };
  const 開け閉め釦 = (
    <button type="button" className="snk-kai" aria-expanded={札開} aria-label={札開 ? "名札を畳む" : "名札を開く（討ち取り・勲功・手勢・持ち場）"}
      onPointerDown={(e) => e.stopPropagation()} onClick={開け閉め}><span aria-hidden="true">{札開 ? "▴" : "▾"}</span></button>);
  const 体力の筋 = (cls) => <div className={cls}><span>体力</span><div className="tr"><i className={体 < 35 ? "low" : ""} style={{ width: `${Math.max(0, 体)}%` }} /></div></div>;
  const 気力の筋 = (cls) => <div className={cls}><span>気力</span><div className="snk-kiryoku">
    {[0, 1, 2, 3, 4].map((i) => <i key={i}><b style={{ width: `${Math.round(Math.min(1, Math.max(0, 気 - i)) * 100)}%` }} /></i>)}
  </div></div>;
  const 知らせ = (態.知らせ || []).filter((o) => Date.now() - o.ms < (o.種 === "kubi" ? 3400 : 2400));
  /* 視点を戻す（回していれば出す）。釦の列の上に置く。物頭と見物は右下に釦が無いので、右下の隅に置く（低） */
  const 視点を戻す釦 = (低) => 視を回しているか(態) && (
    <button type="button" className={`snk-modosu glass${低 ? " low" : ""}`} aria-label="視点を戻す（与平の背中越しへ）"
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); 視を戻す(態); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); 視を戻す(態); } }}><i>↺</i>視点を戻す</button>);
  /* 車：前へ回せば寄せて降り、手前へ回せば引いて昇る（盤の車と同じ一目盛り一.一二倍） */
  const 車 = (e) => { e.stopPropagation(); if (on寄り) on寄り(e.deltaY < 0 ? 1.12 : 1 / 1.12); };
  const 根の手当て = {
    onPointerDown: 下, onPointerMove: 動, onPointerUp: 放す, onPointerCancel: 放す, onLostPointerCapture: 放す,
    onMouseDown: 止める, onMouseMove: 止める, onMouseUp: 止める, onTouchStart: 止める, onTouchMove: 止める, onTouchEnd: 止める,
    onWheel: 車, onContextMenu: (e) => e.preventDefault(),
  };
  /* 降りている途中は、指と車を受けるだけ（札も釦も出さない） */
  if (段 !== "地") return <div ref={根Ref} className="snk" lang="ja" {...根の手当て}><style>{型}</style></div>;
  /* 見物（ふだんの合戦で地へ降りたとき）：見るだけ。地の眺めの札と、盤へ戻る釦 */
  if (見物) {
    return (
      <div ref={根Ref} className="snk" lang="ja" {...根の手当て}>
        <style>{型}</style>
        <div className="snk-tl nop">
          <div className="snk-me glass">
            <div className="row"><span className="mibun">見物</span><span className="na" style={{ fontSize: 16 }}>地の眺め</span></div>
            <div className="kumi" style={{ color: "#F4F1E8", fontSize: 12.5 }}>{態.名}隊の組のうしろから見る</div>
            <div className="kumi">指で狭める（車を手前へ回す）と盤へ戻る。下知は右の欄から</div>
            <div className="kumi">なぞると視点が回る{卓 ? "（Q・E でも）" : ""}</div>
          </div>
        </div>
        <button type="button" className="snk-maru" style={{ left: "max(12px, env(safe-area-inset-left))", bottom: "max(10px, env(safe-area-inset-bottom))", width: 66, height: 66, fontSize: 13 }}
          onPointerDown={(e) => e.stopPropagation()} onClick={() => onLeave && onLeave()}><span><i>盤</i>盤へ戻る</span></button>
        {視点を戻す釦(true)}
      </div>
    );
  }
  return (
    <div ref={根Ref} className="snk" lang="ja" {...根の手当て}>
      <style>{型}</style>
      <div className="snk-tl nop">
        {物頭 ? (() => {
          /* 物頭の名札：預かる隊の兵の数と、いまの下知（委任なら諸将の采配で動いている） */
          const 隊 = 態.隊, 兵 = 隊 ? Math.round((隊.squads || []).reduce((a, q) => a + Math.max(0, q.men || 0), 0)) : 0;
          /* 畳めば一行（預かる隊と兵の数）。開けばこれまでの名札 */
          return 札開 ? (
            <div className="snk-me glass">
              <div className="row"><span className="mibun">物頭</span><span className="na">{(態.備え && 態.備え.名) || "与平"}</span></div>
              <div className="kumi" style={{ color: "#F4F1E8", fontSize: 12.5 }}>{態.名}の隊を預かる　兵 {兵.toLocaleString()}人</div>
              <div className="kumi">下知：{隊 && 隊.auto ? "委任（諸将の采配）" : (隊 && 隊.order) || "―"}　右の欄から隊へ下知する</div>
              <div className="kumi">背中の視点（試し）・なぞると視点が回る{卓 ? "（Q・E でも）" : ""}</div>
              {開け閉め釦}
            </div>
          ) : (
            <div className="snk-me snk-tatami glass" style={{ display: "flex", alignItems: "center", gap: 7, maxWidth: 230 }}>
              <span className="mibun">物頭</span>
              <span className="kumi" style={{ marginTop: 0, color: "#F4F1E8", fontSize: 11 }}>{態.名}の隊を預かる　兵 {兵.toLocaleString()}人</span>
              {開け閉め釦}
            </div>
          );
        })() : !札開 ? (
        /* 畳んだ名札：身分と、小さな体力・気力 */
        <div className="snk-me snk-tatami glass">
          <span className="mibun">{(態.備え && 態.備え.段) || "足軽"}</span>
          {体力の筋("snk-mg")}
          {気力の筋("snk-mg")}
          {開け閉め釦}
        </div>
        ) : (
        <div className="snk-me glass">
          <div className="row"><span className="mibun">{(態.備え && 態.備え.段) || "足軽"}</span><span className="na">{(態.備え && 態.備え.名) || "与平"}</span>
            <span className="kun">討ち取り <b>{我.勲}</b>{態.備え && 態.備え.風雲 && <> 勲功 <b>+{合戦の勲功(態)}</b></>}</span></div>
          {体力の筋("snk-gauge")}
          {気力の筋("snk-gauge")}
          <div className="kumi">{態.一騎
            ? (態.一騎.様 === "戻る" ? "一騎駆け　手勢へ戻る途中" : `一騎駆け　残り${一騎駆けの残り(態)}秒で手勢へ戻る`)
            : 態.隊 && 態.隊.手勢
            ? `手勢 ${Math.round((態.隊.squads || []).reduce((a, q) => a + Math.max(0, q.men || 0), 0))}人を率いる（${態.隊.手勢}人から）・${下知の名(態.隊)}${手勢の倒し(態) ? `・手勢の討ち取り ${手勢の倒し(態)}` : ""}`
            : `${態.名}の組・背中の視点（試し）`}</div>
          {/* 統率（hitori/tezei.js 統率の効き。遊ぶ人の答え：「（統率は）数字（で見せる）」）。手勢の操作のしやすさを決める */}
          {!態.一騎 && 態.隊 && 態.隊.手勢 && Number.isFinite(態.隊.統率) &&
            <div className="kumi">統率 <b>{態.隊.統率}</b>（与平 {態.隊.与平の統率}・手勢 {態.隊.手勢の統率}）</div>}
          {/* 持ち場（風雲モード・物頭未満）。外にいるあいだ、上司の覚えの咎が積もる（hitori/senaka.js 持ち場を見る） */}
          {態.備え && 態.持ち場 && (態.持ち場.内
            ? <div className="kumi">持ち場の内（地の点線の円の内）{態.持ち場.咎 >= 0.05 ? `・この戦の咎 覚え −${態.持ち場.咎.toFixed(1)}` : ""}</div>
            : <div className="snk-mochiba">持ち場を離れている<b>覚え −{態.持ち場.咎.toFixed(1)}</b>
                <small>円の外へ{Math.round(態.持ち場.間 || 0)}m（隊のいちばん外の組から{持ち場の間}m先までが持ち場）</small></div>)}
          {開け閉め釦}
        </div>
        )}
        {/* 畳んでいても、持ち場の外にいれば一行で知らせる（咎が積もるので） */}
        {!物頭 && !札開 && 態.備え && 態.持ち場 && !態.持ち場.内 && (
          <div className="snk-mochiba snk-tatami">持ち場の外 {Math.round(態.持ち場.間 || 0)}m<b>覚え −{態.持ち場.咎.toFixed(1)}</b></div>)}
        {止め === "停止" && !終 && <div className="snk-tomari glass">合戦を止めている<small>上の「微速」で進める</small></div>}
        {止め === "段" && !終 && <div className="snk-tomari glass">合戦が止まっている</div>}
      </div>
      {!態.動いた && !終 && !物頭 && (
        <div className="snk-hint nop"><div className="ring">✥</div>
          {態.率いる
            ? <p>左側に指を置くと<br />方向キーが出ます
                <small>方向キーで手勢を動かす（与平はうしろに付く）。{卓 ? "J で突く、K で受ける、Shift で駆ける（どれも手勢の全体で）、L で一騎駆け" : "右の釦の突く・受ける・駆けるは、手勢の全体で行う"}</small>
                <small>突く（全体）：前に敵がいる兵がいっせいに突く。受ける（全体）：押しているあいだ構えて受ける。手前へ押せば前を向いたまま下がる</small>
                <small>一騎駆け：与平が手勢を離れて自分で戦う（{一騎駆けの秒}秒ののち手勢へ戻る）</small>
                <small>{卓 ? "右側をマウスでなぞるか、Q・E で視点が回ります" : "右側をなぞると視点が回ります（方向キーを押さえたままでも）"}</small></p>
            : <p>左側に指を置くと<br />方向キーが出ます
                <small>{卓 ? "パソコンでは WASD か矢印キーで動き、J で突く、K で受ける、Shift で駆けます" : "右の釦で突く・受ける・駆ける"}</small>
                <small>敵が槍を引いたら（穂先が赤く光る）受ける</small>
                <small>{卓 ? "右側をマウスでなぞるか、Q・E で視点が回ります" : "右側をなぞると視点が回ります（方向キーを押さえたままでも）"}</small></p>}
        </div>
      )}
      <div ref={輪Ref} className="snk-joy" style={{ display: "none" }}><div ref={玉Ref} className="snk-knob" /></div>
      {!終 && !物頭 && <>
        {率いている(態) ? <>
          {/* 率いるとき：三つの釦は一人のときと同じ突く・受ける・駆けるを、手勢の全体で行う（hitori/senaka.js 手勢の突き合い）。
              四つ目は一騎駆け（hitori/senaka.js） */}
          <button type="button" className="snk-maru snk-ikki" aria-label={`一騎駆け（与平が手勢を離れて自分で戦う。${一騎駆けの秒}秒ののち手勢へ戻る）`}
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); 一騎駆け(態); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); if (!e.repeat) 一騎駆け(態); } }}><span><i>⇗</i>一騎駆け</span></button>
          <button type="button" className={`snk-maru snk-kakeru${入.駆 ? " press" : ""}`} aria-label="駆ける（全体）（押しているあいだ手勢と与平が駆け足）" {...釦("駆")}><span><i>⇡</i>駆ける<b className="zen">全体</b></span></button>
          <button type="button" className={`snk-maru snk-ukeru${我.受 ? " press" : ""}`} aria-label="受ける（全体）（押しているあいだ手勢と与平が構えて受ける）" {...釦("受")}><span><i>◇</i>受ける<b className="zen">全体</b></span></button>
          <button type="button" className={`snk-maru snk-tsuku${突押 || 態.t - 我.突始 < 0.22 ? " press" : ""}`} aria-label="突く（全体）（前に敵がいる手勢の兵と与平がいっせいに突く）" {...釦("突")}><span><i>⟋</i>突く<b className="zen">全体</b></span></button>
        </> : <>
          {/* 一騎駆けのあいだ：残りの秒（戻るあいだは「戻る」）。押しても何もしない */}
          {態.一騎 && <div className="snk-maru snk-ikki on nop" role="status" aria-label={態.一騎.様 === "戻る" ? "一騎駆け・手勢へ戻る途中" : `一騎駆け・残り${一騎駆けの残り(態)}秒`}>
            <span><i>⇗</i>{態.一騎.様 === "戻る" ? "戻る" : `残り${一騎駆けの残り(態)}秒`}</span></div>}
          <button type="button" className={`snk-maru snk-kakeru${入.駆 ? " press" : ""}`} aria-label="駆ける（押しているあいだ走る）" {...釦("駆")}><span><i>⇡</i>駆ける</span></button>
          <button type="button" className={`snk-maru snk-ukeru${我.受 ? " press" : ""}`} aria-label="受ける（押しているあいだ構えて防ぐ）" {...釦("受")}><span><i>◇</i>受ける</span></button>
          <button type="button" className={`snk-maru snk-tsuku${突押 || 態.t - 我.突始 < 0.22 ? " press" : ""}`} aria-label="突く" {...釦("突")}><span><i>⟋</i>突く</span></button>
        </>}
      </>}
      {!終 && 視点を戻す釦(物頭)}
      <div className="snk-pops nop">
        {知らせ.map((o) => <div key={o.番} className={`snk-pop${o.種 ? ` ${o.種}` : ""}`}>{o.文}{o.副 && <b>{o.副}</b>}</div>)}
      </div>
      {終 && (
        <div className="snk-panel" onPointerDown={(e) => e.stopPropagation()}>
          <div className="box">
            <h2>討死</h2>
            <p>{(態.備え && 態.備え.名) || "与平"}は討ち死にした。討ち取り {我.勲}{態.備え && 態.備え.風雲 ? `・この戦の勲功 ${合戦の勲功(態)}` : ""}</p>
            {/* 風雲モード（一度きり）では、討死すればそこで終わる（遊ぶ人の申し出：討死もあり）。合戦の行方は盤で見届ける */}
            {態.備え && 態.備え.一度きり && <p>風雲はここで終わる。合戦の行方は、盤の視点で見届けられる。</p>}
            <div className="btns">
              {!(態.備え && 態.備え.一度きり) && <button type="button" onClick={() => 与平を立て直す(b, 態)}>もう一度（組のうしろから）</button>}
              <button type="button" className={態.備え && 態.備え.一度きり ? "" : "sub"} style={{ touchAction: "none" }}
                onPointerDown={(e) => { e.stopPropagation(); if (e.button > 0) return; 離れの押しRef.current = Date.now(); if (onLeave) onLeave(); }}
                onClick={() => { if (Date.now() - 離れの押しRef.current < 10000) { 離れの押しRef.current = 0; return; } if (onLeave) onLeave(); }}>盤の視点へ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
