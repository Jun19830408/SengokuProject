import { U } from "../core/util.js";

/* ========================================================== スタイル */
export const css = `
*{box-sizing:border-box}
.sp{background:${U.paper};color:${U.text};height:100%;display:flex;flex-direction:column;overflow:hidden;
 overscroll-behavior:none;touch-action:manipulation;user-select:none;-webkit-user-select:none;
 font-family:'Hiragino Sans','Yu Gothic UI','Meiryo',system-ui,sans-serif;-webkit-tap-highlight-color:transparent}
.sp .mn{font-family:'Hiragino Mincho ProN','Yu Mincho','MS Mincho',serif}
.sp .num{font-variant-numeric:tabular-nums}
.bar{display:flex;align-items:center;gap:14px;padding:9px 14px;background:${U.card};
 border-bottom:1px solid ${U.line};flex:0 0 auto;flex-wrap:wrap;font-size:13px}
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
.mbtn{width:60px;background:rgba(255,255,255,.94);border:1px solid ${U.line};border-radius:7px;
 padding:7px 4px;font-size:10px;text-align:center;cursor:pointer;line-height:1.5;color:${U.text}}
.mbtn b{display:block;font-size:16px;font-weight:500}
.mbtn:hover{background:#fff}
.mini{position:absolute;right:12px;bottom:12px;width:130px;height:139px;border:1px solid ${U.line};
 border-radius:6px;overflow:hidden;background:#fff;z-index:5;cursor:pointer}
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
@media(max-width:760px){.split{flex-direction:column;gap:10px}.mini{width:96px;height:103px}}

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
@media(pointer:coarse){
  .btn{padding:11px 15px;font-size:14px}
  .btn.sm{padding:9px 11px;font-size:13px}
  .mbtn{width:66px;padding:9px 4px;font-size:11px}
  .mbtn b{font-size:18px}
  .sel{padding:10px;font-size:14px}
}
`;

