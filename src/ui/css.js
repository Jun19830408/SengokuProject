import { U } from "../core/util.js";

/* ========================================================== スタイル */
export const css = `
*{box-sizing:border-box}
.sp{background:${U.paper};color:${U.text};height:100%;display:flex;flex-direction:column;overflow:hidden;
 overscroll-behavior:none;touch-action:manipulation;user-select:none;-webkit-user-select:none;
 font-family:'Hiragino Sans','Yu Gothic UI','Meiryo',system-ui,sans-serif;-webkit-tap-highlight-color:transparent}
.sp .mn{font-family:'Hiragino Mincho ProN','Yu Mincho','MS Mincho',serif}
.sp .num{font-variant-numeric:tabular-nums}
.bar.bt{padding:6px 10px;gap:10px;font-size:12px}
/* 上の帯は薄くする（GDD 15.1）。帯が二段に折れると、地図の見える丈がそのぶん
   削られる。詰めて一段に収まりやすくし、折れても丈を食わないようにした。 */
.bar{display:flex;align-items:center;gap:10px;padding:6px 12px;background:${U.card};
 border-bottom:1px solid ${U.line};flex:0 0 auto;font-size:12.5px;
 flex-wrap:nowrap;white-space:nowrap;overflow:hidden}
/* 帯の中身は横に繰れるようにし、次月へだけは右端に据える（GDD 15.1）。
   帯が二段三段に折れると、そのぶん地図の丈が削られる。 */
.barin{display:flex;align-items:center;gap:10px;flex:1 1 0;min-width:0;
 overflow-x:auto;overflow-y:hidden;scrollbar-width:none;
 /* 端を薄くして、まだ先があることを示す（収まっていれば余白が薄まるだけ）。 */
 -webkit-mask-image:linear-gradient(to right,#000 calc(100% - 16px),rgba(0,0,0,.15));
 mask-image:linear-gradient(to right,#000 calc(100% - 16px),rgba(0,0,0,.15))}
.barin::-webkit-scrollbar{display:none}
.barin>*{flex:0 0 auto}
/* 記録と次月へは帯の右端に貼り付ける。帯を横に繰れるようにしたので、
   留めておかないと、狭い画面では最も要る釦が画面の外へ出てしまう。
   とりわけ記録は、失えば取り返しがつかない。 */
.bar .tsugi{flex:0 0 auto;margin-left:8px}
/* 速さの指図は、帯の右端に一組で留める（GDD 15.1）。 */
.bar .hayasa{display:flex;align-items:center;gap:5px;flex:0 0 auto}
@media(max-width:560px){.bar .hayasa .btn.sm{padding:4px 6px;font-size:10.5px}}
.bar .btn{padding:5px 10px;font-size:12.5px}
.bar .sel{padding:4px 8px;font-size:12px}
.bar .kv{display:flex;align-items:center;gap:5px;color:${U.dim}}
.bar .kv b{color:${U.text};font-weight:600}
.dot{width:9px;height:9px;border-radius:50%;display:inline-block}
.btn{background:${U.card};color:${U.text};border:1px solid ${U.line};border-radius:6px;
 padding:8px 13px;font-size:13px;cursor:pointer;font-family:inherit}
.btn:hover{background:#FAF8F2}
.btn:disabled{opacity:.4;cursor:default}
.btn.dark{background:${U.ink};color:#fff;border-color:${U.ink}}
.btn.on{background:#EEF2F7;border-color:${U.text}}
.btn.sm{padding:5px 9px;font-size:12px;border-radius:5px}
.pill{border-radius:4px;font-size:11px;padding:2px 7px;color:#fff}
.mapwrap{flex:1;position:relative;min-height:0;overflow:hidden;background:#DDE4C8;touch-action:none;overscroll-behavior:none}
.fieldwrap{touch-action:none;overscroll-behavior:none}
.bpanel .g2,.bpanel .g4{gap:6px}
.bpanel{transition:max-height .2s ease,opacity .18s ease}
.bpanel .btn.sm{padding:6px 6px;font-size:12px}
.mapctl{position:absolute;display:flex;flex-direction:column;gap:6px;z-index:5;
 transition:opacity .18s ease,transform .18s ease}
/* 合戦の盤を広く見るとき、道具立てをすっと引っ込める（GDD 8.1）。
   消してしまうのではなく、外へ滑らせる。戻すときも同じ道を通って出てくる。 */
.mapctl.hid{opacity:0;pointer-events:none}
.mapctl.l.hid{transform:translateX(-84px)}
.mapctl.r.hid{transform:translateX(84px)}
/* しまったときに残す取っ手。これだけは盤の隅に置いておく。 */
.grip{position:absolute;z-index:6;width:44px;height:44px;border-radius:22px;
 background:rgba(255,255,255,.90);border:1px solid ${U.line};color:${U.text};
 display:flex;align-items:center;justify-content:center;font-size:17px;cursor:pointer;
 box-shadow:0 2px 8px rgba(0,0,0,.12)}
.grip.l{left:max(12px,env(safe-area-inset-left));top:12px}
.mapctl.l{left:12px;top:12px}
.mapctl.r{right:12px;top:12px}
.mbtn{width:54px;background:rgba(255,255,255,.94);border:1px solid ${U.line};border-radius:7px;
 padding:7px 4px;font-size:10px;text-align:center;cursor:pointer;line-height:1.5;color:${U.text}}
.mbtn b{display:block;font-size:16px;font-weight:500}
.mbtn:hover{background:#fff}
/* 日本全土の小図は左下に置く（GDD 15.1）。

   もとは右下であった。政務の地図では右の列に釦が九つ並ぶので、丈の足りない
   画面では列の末が小図に重なった――遊ぶ側の写しでは「攻略目標」が小図の下に
   隠れていた。左の列は釦が五つで短いので、左下なら重ならない。 */
.mini{position:absolute;left:max(12px,env(safe-area-inset-left));bottom:12px;width:112px;height:120px;border:1px solid ${U.line};
 border-radius:6px;overflow:hidden;background:#fff;z-index:5;cursor:pointer;opacity:.95}
/* 小図の畳み（GDD 15.1）。丈の足りない画面では、左の釦の列と小図がぶつかる。
   畳めば札だけが残り、地図がそのぶん広く見える。 */
.minitab{position:absolute;left:max(12px,env(safe-area-inset-left));bottom:12px;z-index:6;
 background:rgba(255,255,255,.94);border:1px solid ${U.line};border-radius:7px;
 padding:5px 9px;font-size:11px;color:${U.text};cursor:pointer;line-height:1.4}
.minifold{position:absolute;left:max(12px,env(safe-area-inset-left));bottom:136px;z-index:6;
 background:rgba(255,255,255,.94);border:1px solid ${U.line};border-radius:6px;
 padding:2px 7px;font-size:10px;color:${U.dim};cursor:pointer}
/* 釦の列が小図に届かぬようにする（届けば重なって押せない）。 */
.mapctl.l{max-height:calc(100% - 210px);overflow:hidden}
/* 右の指図列は、口が増えると画面の丈を越える（GDD 15.1）。帯から移した
   遊び方・戦国記・タイトル・方針を並べると、携帯では下の口が画面の外へ出た。
   縦に繰れるようにして、どの口にも手が届くようにする。 */
.mapctl.r{max-height:calc(100% - 24px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none}
.mapctl.r::-webkit-scrollbar{display:none}
.hint{position:absolute;left:50%;transform:translateX(-50%);bottom:16px;background:rgba(255,255,255,.94);
 border:1px solid ${U.line};border-radius:20px;padding:7px 18px;font-size:12px;color:${U.dim};z-index:4}
.sheet{position:absolute;left:0;right:0;bottom:0;background:${U.card};border-top:1px solid ${U.line};
 border-radius:14px 14px 0 0;box-shadow:0 -6px 24px rgba(0,0,0,.10);z-index:10;max-height:78%;overflow-y:auto;padding:14px 16px 18px}
.sheet-h{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.tbl{display:grid;grid-template-columns:auto 1fr;gap:5px 14px;font-size:13px}
.tbl .k{color:${U.dim}}
.tbl .v{text-align:right;font-variant-numeric:tabular-nums}
.sec{font-size:11px;letter-spacing:.16em;color:${U.dim};margin:16px 0 7px;
 border-bottom:1px solid ${U.line2};padding-bottom:5px}
.sec:first-child{margin-top:0}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.g4{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:7px}
.row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0}
.row .v{font-variant-numeric:tabular-nums}
.meter{height:6px;background:#EEEBE2;border-radius:3px;overflow:hidden;margin-top:4px}
.meter>i{display:block;height:100%}
.led{font-size:12px;border-left:3px solid #9BAF7A;background:#F7F9F1;padding:8px 10px;margin:7px 0;border-radius:0 5px 5px 0}
.led .up{color:#4E7A3E}.led .dn{color:#B0483C}
.battlefull{position:fixed;inset:0;z-index:100}
.modal{position:absolute;inset:0;background:rgba(40,40,36,.55);display:flex;align-items:center;
 justify-content:center;padding:16px;z-index:60}
.card{background:${U.card};border-radius:12px;max-width:620px;width:100%;max-height:88%;overflow-y:auto;padding:20px}
.sel{border:1px solid ${U.line};border-radius:6px;padding:7px;font-family:inherit;font-size:13px;background:#fff;color:${U.text}}
.split{display:flex;gap:20px}
.split>div{flex:1;min-width:0}
@media(max-width:760px){.split{flex-direction:column;gap:10px}.mini{width:92px;height:99px}.minifold{bottom:116px}}

/* ------------------------------------------- 縦に持った携帯（GDD 8.1）

   合戦の道具立ては縦に五つ並ぶ。横に持てば収まるが、縦に持つと盤そのものが
   短いので、いちばん下の「広く」が盤の外へはみ出して切れる。切れた釦は
   押せないので、しまうこともできない――これが起きていた。

   狭いときは横に寝かせる。五つ並べても四十八掛ける五で二百四十であるから、
   四百三十の画面にも収まる。字も間合いも詰める。

   上の帯も同じ理由で三行に折り返し、盤を圧迫していた。詰めて一行に近づける。 */
@media(max-width:560px){
  /* 合戦の道具立てだけを寝かせる。政務の地図も同じ .mapctl を使っているが、
     あちらは左右に二列あり、横に寝かせると狭い画面でぶつかる。 */
  .mapctl.bctl{flex-direction:row;gap:4px;max-width:calc(100% - 24px);flex-wrap:wrap}
  .mapctl.bctl.hid{transform:translateY(-72px)}
  .bctl .mbtn{width:auto;min-width:44px;padding:5px 7px;font-size:9.5px;line-height:1.35}
  .bctl .mbtn b{font-size:13px}
  .bar.bt{gap:6px;padding:5px 8px;font-size:11px}
  .bar.bt .mn{font-size:12px !important}
  .bar .btn.sm{padding:4px 7px;font-size:11px}
  .grip{width:38px;height:38px;border-radius:19px;font-size:15px}
}

/* ---------------------------------------------------------- 携帯で遊ぶために

   一、画面の縁を避ける。iPhone は上に切り欠き、下に横棒があり、
       そこへ字や釦を置くと隠れるか、押しづらい。
   二、指で押す釦は、爪の先ほどでは足りぬ。押し所を広く取る。 */
.bar{padding-left:max(14px,env(safe-area-inset-left));padding-right:max(14px,env(safe-area-inset-right));
 padding-top:max(9px,env(safe-area-inset-top))}
.mapctl.l{left:max(12px,env(safe-area-inset-left))}
.mapctl.r{right:max(12px,env(safe-area-inset-right))}
.mini{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom))}
.hint{bottom:max(16px,calc(env(safe-area-inset-bottom) + 8px))}
.sheet{padding-bottom:max(18px,calc(env(safe-area-inset-bottom) + 10px))}

/* 指で操る端末では、押し所を広げる（マウスの環境は元のまま） */
/* ------------------------------------------- 丈の短い画面（GDD 15.1）

   横に持った携帯は、幅は広いが丈が四百を切る。差し金を幅だけで書いていたので、
   横持ちでは道具立てが縦に積まれたままであった。実測では、八四四×三九〇の
   城攻めで「広く」の下端が三八五――盤の丈三九〇にぎりぎり収まる高さで、
   ブラウザのタブが一段出れば切れて押せなくなる。遊ぶ側の申せられた
   「合戦マップで広くするコマンドを押せない」はこれである。

   丈が足りないときは、政務の地図も合戦の盤も、道具立てを横に寝かせる。
   帯も詰め、小図も小さくする。 */
@media(max-height:560px){
  .bar{padding:4px 8px;gap:7px;font-size:11.5px}
  .bar.bt{padding:3px 8px;gap:6px;font-size:11px}
  .bar .btn.sm{padding:4px 8px;font-size:11.5px}
  .bar .sel{padding:4px 6px;font-size:11.5px}
  .bar .mn{font-size:12.5px !important}
  .mapctl{flex-direction:row;flex-wrap:wrap;gap:4px}
  .mapctl.l{left:8px;top:8px;max-width:calc(52% - 12px)}
  .mapctl.r{right:8px;top:8px;max-width:calc(48% - 12px);justify-content:flex-end}
  .mapctl.l.hid{transform:translateY(-84px)}
  .mapctl.r.hid{transform:translateY(-84px)}
  .mapctl .mbtn{width:auto !important;min-width:42px;padding:4px 6px;font-size:9.5px;line-height:1.35}
  .mapctl .mbtn b{font-size:13px}
  .mini{width:80px;height:86px;bottom:8px}
  .minifold{bottom:98px}
  .grip{width:36px;height:36px;border-radius:18px;font-size:14px}
  .hint{bottom:8px;padding:4px 12px;font-size:11px}
}

@media(pointer:coarse){
  .btn{padding:11px 15px;font-size:14px}
  .btn.sm{padding:9px 11px;font-size:13px}
  .mbtn{width:66px;padding:9px 4px;font-size:11px}
  .mbtn b{font-size:18px}
  .sel{padding:10px;font-size:14px}
}
`;

