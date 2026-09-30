/* 音の座（GDD 15.4）。

   盤に調べを添える。曲（kyoku.js）を読み、楽器（gakki.js）で鳴らす段である。

   気を付けることが三つある。

     一、携帯は、遊ぶ側が触れるまで音を出せない。題名の釦を押した折に解錠する。
     二、音は切れるようにする。入切と音量は記録の棚に控え、次に開いたときも保つ。
     三、盤が重くなってはならない。先読みは〇.四秒ぶんだけ、刻みは五分の一秒に一度。

   音を出す口は差し替えられるようにしてある。試験には AudioContext が無いので、
   鳴らした事だけを控える偽の口を据えて検める。 */
import { 曲, 場面の曲 } from "./kyoku.js";
import { 鳴らす as 実際に鳴らす } from "./gakki.js";

export const 棚の鍵 = "sengoku:oto";
export const 先読み = 0.4;          // 秒。これだけ先まで音を積んでおく
export const 刻みの間 = 0.2;        // 秒。積み直す間

const 状 = {
  座: null, 主: null, 口: null, 時計: null,
  解けた: false, 入: true, 音量: 0.55,
  曲名: null, 次の曲: null,
  小節: 0, 次の時: 0, 始め: 0,
  控え: [],                          // 試験のための覚え書き
};

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

export const 音の設定 = () => ({
  入: 状.入, 音量: 状.音量, 解けた: 状.解けた, 曲: 状.曲名,
  /* 座の様子。鳴らないと言われたとき、どこで止まっているかを判じるための一言。 */
  座: !状.座 ? (状.口 ? "偽の口" : "作れていない") : (状.座.state || "不明"),
});

/* 試し鳴らし（GDD 15.4）。

   音を入れた折に、その場で一音鳴らす。鳴れば「聞こえる」ことが遊ぶ側に分かるし、
   鳴らなければ端末の側（マナースイッチ・音量）に因があると分かる。 */
export function 試しに鳴らす() {
  if (!状.解けた) 解錠する();
  起こし直す();
  const t = 今() + 0.05;
  出す("鉦", 74, t, 1.2, 0.5);
  出す("琴", 62, t + 0.12, 1.0, 0.5);
  return true;
}

/* 入切と音量。切れば、いま鳴っている音も止める。 */
export function 入切(v) {
  状.入 = !!v;
  設定を書く();
  if (!状.入) 止める();
  else if (状.解けた && 状.曲名) 掛ける(状.曲名, true);
  return 状.入;
}
export function 音量(v) {
  状.音量 = Math.max(0, Math.min(1, Number(v) || 0));
  設定を書く();
  if (状.主 && 状.座) 状.主.gain.setValueAtTime(状.音量 * 1.1, 状.座.currentTime);
  return 状.音量;
}

/* 口を差し替える（試験用）。控えも空にする。 */
export function 口を据える(口) { 状.口 = 口; 状.控え = []; }
export const 控えを見る = () => 状.控え;

/* 解錠。遊ぶ側が最初に触れた折に呼ぶ。 */
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

export function 解錠する(作る) {
  if (状.解けた) { 起こし直す(); return true; }
  設定を読む();
  const 作り = 作る || (typeof window !== "undefined"
    && (window.AudioContext || window.webkitAudioContext));
  if (!状.口) {
    if (!作り) return false;                      // 音の出せぬ所（試験・古い端末）
    try {
      状.座 = typeof 作り === "function" && 作り.prototype ? new 作り() : 作り();
      状.主 = 状.座.createGain();
      状.主.gain.setValueAtTime(状.音量 * 1.1, 状.座.currentTime);
      状.主.connect(状.座.destination);
      if (状.座.state !== "running" && 状.座.resume) 状.座.resume();
      無音を一つ(状.座);                     // Safari はこれで座が目を覚ます
    } catch (e) { return false; }
  }
  状.解けた = true;
  if (状.曲名) 掛ける(状.曲名, true);
  return true;
}

const 今 = () => (状.口 && 状.口.いま ? 状.口.いま() : (状.座 ? 状.座.currentTime : 0));

/* 場面から曲を選んで掛ける。同じ曲なら何もしない。 */
export function 場面を選ぶ(場面, 様 = {}) {
  const 名 = 場面の曲(場面, 様);
  if (!名) { 止める(); return null; }
  if (名 === 状.曲名) return 名;
  掛ける(名);
  return 名;
}

export function 掛ける(名, 続き) {
  if (!曲[名]) return null;
  状.曲名 = 名;
  if (!続き) 状.小節 = 0;
  if (!状.入 || !状.解けた) return 名;
  状.次の時 = 今() + 0.08;
  仕掛ける();
  return 名;
}

export function 止める() {
  if (状.時計 && typeof clearInterval !== "undefined") clearInterval(状.時計);
  状.時計 = null;
}

function 仕掛ける() {
  if (状.時計) return;
  if (typeof setInterval === "undefined") return;
  状.時計 = setInterval(() => { try { 刻む(); } catch (e) { /* 音で盤は止めない */ } }, 刻みの間 * 1000);
  刻む();
}

/* 先読みのぶんだけ、小節を積む。 */
export function 刻む() {
  if (!状.入 || !状.解けた || !状.曲名) return 0;
  const k = 曲[状.曲名];
  const 一拍 = 60 / k.拍;
  let 積んだ = 0;
  while (状.次の時 < 今() + 先読み) {
    const 頭 = 状.次の時;
    const 音符 = k.音符(状.小節 % k.小節);
    for (const n of 音符) {
      const t = 頭 + n.位 * 一拍;
      const 長 = n.長 * 一拍;
      出す(n.楽器, n.音, t, 長, n.強);
      積んだ++;
    }
    状.小節++;
    状.次の時 += k.拍子 * 一拍;
  }
  return 積んだ;
}

function 出す(楽器, 音, 時, 長, 強) {
  if (状.口) { 状.口.鳴らす(楽器, 音, 時, 長, 強); 状.控え.push({ 楽器, 音, 時, 長, 強 }); return; }
  if (!状.座 || !状.主) return;
  実際に鳴らす(状.座, 状.主, 楽器, 音, 時, 長, 強);
}

/* 試験のための口。鳴らした事だけを控える。 */
export function 覚える口(始め = 0) {
  let t = 始め;
  const 控 = [];
  return {
    いま: () => t,
    進める: (秒) => { t += 秒; },
    鳴らす: (楽器, 音, 時, 長, 強) => 控.push({ 楽器, 音, 時, 長, 強 }),
    控え: 控,
  };
}

/* 盤の姿から場面を決める（GDD 15.4）。

   政務は位で変わる。合戦は野と城で分け、天下分け目だけは別に立てる。 */
export function 盤の場面({ 画面, 合戦, 位 } = {}) {
  if (合戦) {
    if (合戦.分け目) return { 場面: "分け目" };
    if (合戦.mode === "castle") return { 場面: "城攻め" };
    return { 場面: "野戦" };
  }
  if (画面 === "map") return { 場面: "政務", 位 };
  return { 場面: null };
}
