/* ==========================================================================
   背中越しの札と釦（一人働きの試し）

   合戦の画面（ui/BattleScreen.jsx）の盤の上に重ねる。合戦の画面のファイルを大きく
   変えないよう、ここにまとめた。見た目と手の入りは、先にお見せした試し版（触って
   動かす版）と同じにしてある。

     左上   … 名札（足軽 与平・勲功・体力・気力・組の名）。合戦が止まっていれば、その知らせ
     左半分 … 指を置いた所に方向キーが出る（指が輪の外へ出れば、輪のほうが指についてくる）
     右下   … 突く（押す）／受ける（押しているあいだ）／駆ける（押しているあいだ）
     真ん中 … 知らせ（討ち取り・息が上がっている）、討死の札
   パソコンでは WASD か矢印キーで動き、J（または空白）で突く、K で受ける、Shift で駆ける。

   盤の左下の「盤の視点」の釦（BattleScreen.jsx）は、この札の重なりより上に置かれている。
   与平の動きそのもの（歩み・突き・敵の掛かり）は hitori/senaka.js にある。
   ここは 態.入（方向・受け・駆け）を書き、突く・受ける・与平を立て直す を呼ぶだけである。

   物頭（態.身分＝"物頭"）は自分では動かない（遊ぶ人の申し出：物頭以降は背中視点はできるが、それまでの
   指示はできず、部隊としての通常の指示）。名札に預かる隊（兵の数・いまの下知）を出すだけで、方向キー・
   三つの釦・鍵盤は出さない。隊への下知は、合戦の画面の右の欄から出す。

   盤から地へ降りる（ui/BattleScreen.jsx 降りRef）。段＝"途中"（降りている途中）のあいだは、札も釦も出さず、
   二本の指のピンチと車だけを受けて on寄り（倍）へ渡す（寄せれば降り、引けば昇る）。段＝"地"では、名札・
   方向キー・釦に加えて、ピンチと車も受ける（方向キーを押さえている指のほかに、もう一本の指を置けば
   ピンチになり、方向キーはやめる。釦の上に置いた指はピンチに数えない）。
   見物（態.身分＝"見物"。ふだんの合戦で地へ降りたとき）は、見るだけの札（地の眺め・盤へ戻る釦）を出す。
   ========================================================================== */
import React, { useEffect, useRef, useState } from "react";
import { 突く, 受ける, 与平を立て直す } from "./senaka.js";

const R杖 = 52;                                   // 方向キーの輪の半径（px。試し版と同じ）
const 型 = `
.snk{position:absolute;inset:0;z-index:4;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;
  font-family:'Hiragino Mincho ProN','Yu Mincho','YuMincho','MS Mincho',serif;color:#F4F1E8}
.snk .nop{pointer-events:none}
.snk .glass{background:rgba(22,24,28,.8);border:1.5px solid rgba(226,200,119,.55);border-radius:9px;box-shadow:0 2px 8px rgba(0,0,0,.35)}
.snk-tl{position:absolute;left:max(10px,env(safe-area-inset-left));top:8px;display:grid;gap:6px;justify-items:start}
.snk-me{width:224px;padding:7px 11px 8px}
.snk-me .row{display:flex;align-items:baseline;gap:8px}
.snk-me .mibun{background:#B0483C;color:#F4F1E8;font-size:11.5px;font-weight:700;padding:0 7px;border-radius:4px}
.snk-me .na{font-size:19px;font-weight:700;letter-spacing:.06em}
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
.snk-maru{position:absolute;border-radius:50%;display:grid;place-items:center;text-align:center;font-weight:700;letter-spacing:.08em;color:#F4F1E8;font-family:inherit;
  background:radial-gradient(circle at 50% 35%,rgba(60,62,68,.92),rgba(18,19,22,.92));border:2.5px solid #E2C877;box-shadow:0 3px 12px rgba(0,0,0,.45);padding:0;cursor:pointer;touch-action:none}
.snk-maru i{display:block;font-style:normal;color:#E2C877;line-height:1;margin-bottom:3px}
.snk-maru.press{transform:scale(.9);background:radial-gradient(circle at 50% 35%,rgba(150,118,56,.96),rgba(52,40,20,.96));box-shadow:0 0 0 3px rgba(240,214,130,.85),0 0 22px rgba(240,214,130,.7)}
.snk-maru:focus-visible{outline:2px solid #E2C877;outline-offset:2px}
.snk-tsuku{width:104px;height:104px;right:max(12px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));font-size:19px}.snk-tsuku i{font-size:22px}
.snk-ukeru{width:76px;height:76px;right:calc(max(12px,env(safe-area-inset-right)) + 116px);bottom:max(10px,env(safe-area-inset-bottom));font-size:14.5px}.snk-ukeru i{font-size:18px}
.snk-kakeru{width:66px;height:66px;right:calc(max(12px,env(safe-area-inset-right)) + 84px);bottom:calc(max(10px,env(safe-area-inset-bottom)) + 110px);font-size:13px}.snk-kakeru i{font-size:16px}
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
  const 根Ref = useRef(null), 輪Ref = useRef(null), 玉Ref = useRef(null), 杖 = useRef(null);
  const 指Ref = useRef(new Map()), 摘みRef = useRef(null);   // 置いている指（釦の上でないもの）と、ピンチの指の隔たり
  const [突押, set突押] = useState(false);
  const [卓, set卓] = useState(false);
  useEffect(() => { try { set卓(!!(window.matchMedia && window.matchMedia("(pointer: fine)").matches)); } catch (_) {} }, []);

  /* 鍵盤。札が出ているあいだだけ聞く。この札の釦に手があるとき（Enter・空白）は釦に任せる。
     上の速さの釦などに手が残っていても、空白は突きに使う（その釦を押し直さない） */
  useEffect(() => {
    if (!態 || 態.身分 === "物頭") return undefined;
    const 入 = 態.入;
    const 書く場か = (e) => { const el = e.target; return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable); };
    const 釦か = (e) => !!(e.target && e.target.closest && e.target.closest("button"));
    const 内か = (e) => !!(根Ref.current && e.target && 根Ref.current.contains(e.target));
    const down = (e) => {
      if (書く場か(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (釦か(e) && (e.key === "Enter" || (e.key === " " && 内か(e)))) return;
      if (鍵[e.code]) { 入.keys.add(鍵[e.code]); e.preventDefault(); }
      if (e.code === "KeyJ" || e.code === "Space") { if (!e.repeat) 突く(態); e.preventDefault(); }
      if (e.code === "KeyK") { if (!e.repeat) 受ける(態, true); }
      if (e.key === "Shift") 入.駆 = true;
    };
    const up = (e) => {
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
    if (指Ref.current.size >= 2) {                         // 二本目の指：ピンチ（方向キーはやめる）
      方向キーをやめる();
      const [a, c] = [...指Ref.current.values()]; 摘みRef.current = { d: Math.hypot(a.x - c.x, a.y - c.y) };
      e.preventDefault(); return;
    }
    if (段 !== "地" || 杖.current || 終 || 物頭 || 見物) return;
    const [u, v, w] = 所(e);
    if (u >= w * 0.5) return;
    杖.current = { id: e.pointerId, ox: u, oy: v };
    const j = 輪Ref.current; if (j) { j.style.left = `${u}px`; j.style.top = `${v}px`; j.style.display = "block"; }
    if (玉Ref.current) 玉Ref.current.style.transform = "";
    入.jx = 0; 入.jy = 0; e.preventDefault();
  };
  const 動 = (e) => {
    if (指Ref.current.has(e.pointerId)) 指Ref.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (摘みRef.current && 指Ref.current.size >= 2) {
      const [a, c] = [...指Ref.current.values()]; const d = Math.hypot(a.x - c.x, a.y - c.y);
      if (摘みRef.current.d > 0 && d > 0 && on寄り) on寄り(d / 摘みRef.current.d);
      摘みRef.current.d = d; return;
    }
    const j0 = 杖.current; if (!j0 || e.pointerId !== j0.id) return;
    const [u, v] = 所(e);
    let dx = u - j0.ox, dy = v - j0.oy; const L = Math.hypot(dx, dy);
    if (L > R杖) {   // 指が輪の外へ出たら、輪のほうが指についてくる
      j0.ox += (dx / L) * (L - R杖); j0.oy += (dy / L) * (L - R杖); dx = (dx / L) * R杖; dy = (dy / L) * R杖;
      const j = 輪Ref.current; if (j) { j.style.left = `${j0.ox}px`; j.style.top = `${j0.oy}px`; }
    }
    if (玉Ref.current) 玉Ref.current.style.transform = `translate(${dx}px,${dy}px)`;
    入.jx = dx / R杖; 入.jy = dy / R杖;
  };
  const 放す = (e) => {
    指Ref.current.delete(e.pointerId);
    if (指Ref.current.size < 2) 摘みRef.current = null;
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
  const 知らせ = (態.知らせ || []).filter((o) => Date.now() - o.ms < 2400);
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
          </div>
        </div>
        <button type="button" className="snk-maru" style={{ left: "max(12px, env(safe-area-inset-left))", bottom: "max(10px, env(safe-area-inset-bottom))", width: 66, height: 66, fontSize: 13 }}
          onPointerDown={(e) => e.stopPropagation()} onClick={() => onLeave && onLeave()}><span><i>盤</i>盤へ戻る</span></button>
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
          return (
            <div className="snk-me glass">
              <div className="row"><span className="mibun">物頭</span><span className="na">与平</span></div>
              <div className="kumi" style={{ color: "#F4F1E8", fontSize: 12.5 }}>{態.名}の隊を預かる　兵 {兵.toLocaleString()}人</div>
              <div className="kumi">下知：{隊 && 隊.auto ? "委任（諸将の采配）" : (隊 && 隊.order) || "―"}　右の欄から隊へ下知する</div>
              <div className="kumi">背中の視点（試し）</div>
            </div>
          );
        })() : (
        <div className="snk-me glass">
          <div className="row"><span className="mibun">足軽</span><span className="na">与平</span>
            <span className="kun">勲功 <b>{我.勲}</b></span></div>
          <div className="snk-gauge"><span>体力</span><div className="tr"><i className={体 < 35 ? "low" : ""} style={{ width: `${Math.max(0, 体)}%` }} /></div></div>
          <div className="snk-gauge"><span>気力</span><div className="snk-kiryoku">
            {[0, 1, 2, 3, 4].map((i) => <i key={i}><b style={{ width: `${Math.round(Math.min(1, Math.max(0, 気 - i)) * 100)}%` }} /></i>)}
          </div></div>
          <div className="kumi">{態.名}の組・背中の視点（試し）</div>
        </div>
        )}
        {止め === "停止" && !終 && <div className="snk-tomari glass">合戦を止めている<small>上の「微速」で進める</small></div>}
        {止め === "段" && !終 && <div className="snk-tomari glass">合戦が止まっている</div>}
      </div>
      {!態.動いた && !終 && !物頭 && (
        <div className="snk-hint nop"><div className="ring">✥</div>
          <p>左側に指を置くと<br />方向キーが出ます
            <small>{卓 ? "パソコンでは WASD か矢印キーで動き、J で突く、K で受ける、Shift で駆けます" : "右の釦で突く・受ける・駆ける"}</small>
            <small>敵が槍を引いたら（穂先が赤く光る）受ける</small></p>
        </div>
      )}
      <div ref={輪Ref} className="snk-joy" style={{ display: "none" }}><div ref={玉Ref} className="snk-knob" /></div>
      {!終 && !物頭 && <>
        <button type="button" className={`snk-maru snk-kakeru${入.駆 ? " press" : ""}`} aria-label="駆ける（押しているあいだ走る）" {...釦("駆")}><span><i>⇡</i>駆ける</span></button>
        <button type="button" className={`snk-maru snk-ukeru${我.受 ? " press" : ""}`} aria-label="受ける（押しているあいだ構えて防ぐ）" {...釦("受")}><span><i>◇</i>受ける</span></button>
        <button type="button" className={`snk-maru snk-tsuku${突押 || 態.t - 我.突始 < 0.22 ? " press" : ""}`} aria-label="突く" {...釦("突")}><span><i>⟋</i>突く</span></button>
      </>}
      <div className="snk-pops nop">
        {知らせ.map((o) => <div key={o.番} className={`snk-pop${o.種 ? ` ${o.種}` : ""}`}>{o.文}{o.副 && <b>{o.副}</b>}</div>)}
      </div>
      {終 && (
        <div className="snk-panel" onPointerDown={(e) => e.stopPropagation()}>
          <div className="box">
            <h2>討死</h2>
            <p>{(態.備え && 態.備え.名) || "与平"}は討ち死にした。勲功 {我.勲}</p>
            {/* 風雲モード（一度きり）では、討死すればそこで終わる（遊ぶ人の申し出：討死もあり）。合戦の行方は盤で見届ける */}
            {態.備え && 態.備え.一度きり && <p>風雲はここで終わる。合戦の行方は、盤の視点で見届けられる。</p>}
            <div className="btns">
              {!(態.備え && 態.備え.一度きり) && <button type="button" onClick={() => 与平を立て直す(b, 態)}>もう一度（組のうしろから）</button>}
              <button type="button" className={態.備え && 態.備え.一度きり ? "" : "sub"} onClick={() => onLeave && onLeave()}>盤の視点へ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
