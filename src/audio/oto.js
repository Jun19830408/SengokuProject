/* 音の座（GDD 15.4）。

   盤に管弦の録音を添える。鳴らすのは録音の三曲（rokuon.js）だけである。
     政務　「天下静謐」 … 政務の画面（位は問わない）
     野戦　「疾風の陣」 … 野戦・天下分け目・海戦
     城攻め「攻城の刻」 … 城攻め

   本編の音の座は、曲を楽器で一音ずつ鳴らす合成の調べ（kyoku.js・gakki.js）も持ち、
   録音の無い場面（位の上がった政務・天下分け目）や、録音を読めぬ所ではそれで鳴らして
   いた。遊ぶ側の申し出は「入れる音は直近で作成したオーケストラの三曲」であったので、
   合成の調べは持たない。音を入れた折の試し鳴らしの一音も鳴らさない。録音を読めぬ所
   （file:// で開いた一枚物・Artifacts）では、鳴らさずに黙る。

   気を付けることが三つある。

     一、携帯は、遊ぶ側が触れるまで音を出せない。最初に触れた折に解錠する（App.jsx）。
     二、音は切れるようにする。入切と音量は記録の棚に控え、次に開いたときも保つ。
     三、試作版は盤の置き場が一段深い（/shisaku2/index.html）。録音の札の置き場（根）は、
         盤に差してあればそれを使う（tools/shisaku.cjs が window.__録音の根 を差す）。

   試験には AudioContext が無いので、座を作る道具を差し替えられるようにしてある。 */
import { 録音の曲, 録音の座を据える, 録音がある, 録音を掛ける, 録音を止める, 録音を先に読む, 録音の様子, 録音の控えを空にする } from "./rokuon.js";

export const 棚の鍵 = "sengoku:oto";

const 状 = {
  座: null, 主: null,
  解けた: false, 入: true, 音量: 0.55,
  /* いまの場面の曲。音を切っているあいだも覚えておき、入れ直せばその曲を鳴らす。
     題名の画面へ戻れば（止める）忘れる。 */
  曲名: null,
};

/* 場面から曲を選ぶ。録音は三曲なので、政務は位を問わず「政務」、天下分け目と海戦は
   野の戦として「野戦」を鳴らす。場面の無い所（題名・大名選び）は null（鳴らさない）。 */
export function 場面の曲(場面) {
  if (場面 === "城攻め") return "城攻め";
  if (場面 === "野戦" || 場面 === "分け目" || 場面 === "海戦") return "野戦";
  if (場面 === "政務") return "政務";
  return null;
}

/* 録音の札の置き場（盤から見た相対の住所）。 */
const 録音の根 = () => (typeof window !== "undefined" && typeof window.__録音の根 === "string"
  && window.__録音の根) || "bgm/";

/* 設定を棚から読む。無ければ既定（入・音量〇.五五）。 */
export function 設定を読む(棚) {
  const st = 棚 || (typeof localStorage !== "undefined" ? localStorage : null);
  if (!st) return { 入: 状.入, 音量: 状.音量 };
  try {
    const v = JSON.parse(st.getItem(棚の鍵) || "null");
    if (v && typeof v === "object") {
      状.入 = v.入 !== false;
      状.音量 = typeof v.音量 === "number" ? Math.max(0, Math.min(1, v.音量)) : 状.音量;
    }
  } catch (e) { /* 読めねば既定のまま */ }
  return { 入: 状.入, 音量: 状.音量 };
}

function 設定を書く() {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(棚の鍵, JSON.stringify({ 入: 状.入, 音量: 状.音量 })); } catch (e) { /* 書けずとも進む */ }
}

/* 題 … いまの場面の曲の題。鳴り … いま実際に鳴っている曲の題（読み込みの最中や、音を
   切っているあいだは null） */
export const 音の設定 = () => {
  const 様 = 録音の様子();
  return {
    入: 状.入, 音量: 状.音量, 解けた: 状.解けた, 曲: 状.曲名,
    題: 状.曲名 && 録音の曲[状.曲名] ? 録音の曲[状.曲名].題 : null,
    鳴り: 様.鳴り && 録音の曲[様.鳴り] ? 録音の曲[様.鳴り].題 : null,
    /* 座の様子。鳴らないと言われたとき、どこで止まっているかを判じるための一言。 */
    座: !状.座 ? "まだ作っていない" : (状.座.state || "不明"),
    録音: 様,
  };
};
/* 撮る道具と、鳴らないと言われたときの検分のための覗き窓 */
if (typeof window !== "undefined") window.__音の様子 = 音の設定;

/* 入切と音量。切れば、いま鳴っている録音も止める。入れれば、いまの場面の曲を鳴らす。 */
export function 入切(v) {
  状.入 = !!v;
  設定を書く();
  if (!状.入) 録音を止める();
  else if (状.解けた && 状.曲名) 録音を掛ける(状.曲名);
  return 状.入;
}
export function 音量(v) {
  状.音量 = Math.max(0, Math.min(1, Number(v) || 0));
  設定を書く();
  if (状.主 && 状.座) 状.主.gain.setValueAtTime(状.音量 * 1.1, 状.座.currentTime);
  return 状.音量;
}

/* 解錠（GDD 15.4）。

   携帯（Safari・Chrome とも）は、遊ぶ側が触れた折にしか音の座を起こせない。
   しかも Safari は、起こしただけでは足りない――その場で一度、音を流さねば
   座が眠ったままになる（長さ零の無音を一つ鳴らして起こす）。

   触れたのに座が眠っていることもあるので、走っている状態になるまで、触れるたびに
   起こし直す。iPhone のマナースイッチが入っていると、どう起こしても鳴らない。 */
export function 起こし直す() {
  if (!状.座) return false;
  try {
    if (状.座.state !== "running" && 状.座.resume) 状.座.resume();
    return 状.座.state === "running";
  } catch (e) { return false; }
}

function 無音を一つ(座) {
  try {
    const b = 座.createBuffer(1, 1, 座.sampleRate || 44100);
    const src = 座.createBufferSource();
    src.buffer = b;
    src.connect(座.destination);
    if (src.start) src.start(0);
  } catch (e) { /* 起こせずとも進む */ }
}

/* 作る … 座を作る道具（試験のため）。渡さなければブラウザの AudioContext */
export function 解錠する(作る) {
  if (状.解けた) { 起こし直す(); return true; }
  設定を読む();
  const 作り = 作る || (typeof window !== "undefined"
    && (window.AudioContext || window.webkitAudioContext));
  if (!作り) return false;                        // 音の出せぬ所（試験・古い端末）
  try {
    状.座 = typeof 作り === "function" && 作り.prototype ? new 作り() : 作り();
    状.主 = 状.座.createGain();
    状.主.gain.setValueAtTime(状.音量 * 1.1, 状.座.currentTime);
    状.主.connect(状.座.destination);
    if (状.座.state !== "running" && 状.座.resume) 状.座.resume();
    無音を一つ(状.座);                         // Safari はこれで座が目を覚ます
    録音の座を据える(状.座, 状.主, { 根: 録音の根() });   // 録音に座と主の口を貸す（音量と入切が効く）
    /* いまの場面の札だけ、すぐ読みに行く（音を切っていれば読まない）。残りの札は、
       一曲目が鳴りだしてから読む（rokuon.js 録音を掛ける） */
    if (状.入) 録音を先に読む([状.曲名 || "政務"]);
  } catch (e) { return false; }
  状.解けた = true;
  if (状.曲名 && 状.入) 録音を掛ける(状.曲名);
  return true;
}

/* 場面を選ぶ。曲が替われば入れ替え（交差は rokuon.js）、同じ曲が鳴っていれば何もしない。
   場面の無い所（null）なら止める。

   本編の音の座は、同じ曲名なら何もせずに返していた。題名の画面へ戻ると曲は止まるが
   曲名は残るので、また政務に入っても鳴らなかった。ここでは曲名が同じでも、鳴って
   いなければ掛け直す（鳴っていれば rokuon.js が何もしない）。 */
export function 場面を選ぶ(場面) {
  const 名 = 場面の曲(場面);
  if (!名) { 止める(); return null; }
  状.曲名 = 名;
  if (状.入 && 状.解けた && 録音がある(名)) 録音を掛ける(名);
  return 名;
}

/* 止める。題名や大名選びの画面へ移るとき。曲名も忘れる。 */
export function 止める() {
  状.曲名 = null;
  録音を止める();
}

/* 試験のため、座を作る前の姿に戻す（読んだ録音の控えも空にする）。 */
export function 音の座を戻す() {
  録音を止める(0);
  録音の控えを空にする();
  状.座 = null; 状.主 = null; 状.解けた = false; 状.曲名 = null;
  状.入 = true; 状.音量 = 0.55;
  録音の座を据える(null, null);
}
