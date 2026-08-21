import { migrateSave } from "../core/state.js";
import { 置き場 } from "./store.js";
import { 圧す, 解す } from "./pack.js";
import { FACTIONS } from "../data/factions.js";

/* ==========================================================================
   記録（セーブ）
   どこへ置くかは store.js が決める。ここは「何を、どう包むか」だけを見る。
   ========================================================================== */
/* 記録所（GDD 15.3）。

   これまで記録は一つきりであった。ひとつの盤しか残せないので、
   「ここで分かれ道を試したい」と思っても、いまの歩みを捨てるほかない。
   五つの枠を設ける。加えて、月が替わるたびに書き込む自動の枠を一つ置く。

     自動 … 月送りのたびに勝手に上書きされる。うっかり閉じても戻れる
     一〜五 … 遊ぶ側が明示して収める。上書きされない

   古い記録（sengoku:save1）はそのまま自動の枠として読める。
   遊びの途中で直しが入っても、これまでの盤が読めなくなることはない。 */
export const SAVE_KEY = "sengoku:save1";          // 自動の枠（古い記録もここ）
export const 枠の数 = 5;
export const 枠の鍵 = (i) => `sengoku:slot${i}`;   // 一〜五
export const 枠一覧 = () => [
  { key: SAVE_KEY, 名: "自動", 自動: true },
  ...Array.from({ length: 枠の数 }, (_, i) => ({ key: 枠の鍵(i + 1), 名: `記録 ${"一二三四五"[i]}`, 自動: false })),
  // 上書きから拾い上げた盤。空き枠が無かったときの逃げ場である。
  { key: "sengoku:hirogi", 名: "救出", 救出: true },
];
const 版 = 1;

/* 記録の包み。年月と家名を添えておくと、書き出した控えを人が見て分かる。

   盤ひとつは一.二六MBある。ブラウザに預けられる量は iPhone の Safari で
   五MBほどしかないので、七枠（自動・一〜五・救出）をそのまま置くと八.六MBと
   なって収まらない。三つ四つ収めたところで棚が一杯になり、以後どの枠へ
   書こうとしても「記録できない環境」と出る――実際にそうなった。

   収める前に圧す（pack.js）。一.二六MBが二百三十KBほどになるので、
   七枠でも一.六MBに収まる。 */
function 包む(state) {
  return 圧す(JSON.stringify({ v: 版, at: Date.now(), state }));
}

// 包みを解く。圧してあれば解し、昔ながらの生の記録はそのまま読む。
function 解く(文) {
  if (!文) return null;
  let d = null;
  try { d = JSON.parse(解す(文)); } catch (e) { return null; }
  if (!d || !d.state || !Array.isArray(d.state.castles)) return null;
  migrateSave(d.state);                    // 旧い記録を繕う（名簿、旗の下を狙う戦役）
  return d;
}

/* 別の遊びの上へ書こうとしていないか（GDD 15.3）。

   画面のどこか一箇所を直しても、同じ穴はまた開く。書き込む道は幾つもあり、
   後から増えもする。だから、守るのは置き場の側でなければならない。

   盤には卓の印がある。いまその枠に入っている盤と印が違うなら、それは
   「別の遊び」である。上書きする前に、空いている枠へ写して逃がす。
   空きが無ければ、拾い上げの棚（救い出した記録）へ置く。棚は一つきりだが、
   何も残らないよりはるかによい。

   これで、どの道から書き込もうと、遊びがひとつ黙って消えることはなくなる。 */
export const 拾い上げの鍵 = "sengoku:hirogi";

async function 別の遊びを逃がす(key, 新) {
  let 有 = null;
  try { 有 = 解く(await 置き場().読む(key)); } catch (e) { 有 = null; }
  if (!有 || !有.state) return null;
  const 旧印 = 有.state.卓, 新印 = 新 && 新.卓;
  if (!旧印 || !新印 || 旧印 === 新印) return null;      // 同じ遊びの続き。上書きしてよい
  // 空いている手記録を探す
  for (let i = 1; i <= 枠の数; i++) {
    const k = 枠の鍵(i);
    if (k === key) continue;
    let x = null;
    try { x = 解く(await 置き場().読む(k)); } catch (e) { x = null; }
    if (x) continue;
    try { await 置き場().書く(k, 包む(有.state)); } catch (e) { break; }
    return { 逃がした: k, 名: `記録 ${"一二三四五"[i - 1]}`, d: 有 };
  }
  // 空きが無い。拾い上げの棚へ置く
  try { await 置き場().書く(拾い上げの鍵, 包む(有.state)); } catch (e) { return { 失敗: true, d: 有 }; }
  return { 逃がした: 拾い上げの鍵, 名: "救い出した記録", d: 有 };
}

/* 棚が一杯になったときの繕い（GDD 15.3）。

   圧すようにする前の記録は、一枠で一.二六MBある。それが三つ四つ入ったままだと、
   新しく書こうとしても棚に空きがなく、書き込みが撥ねられる。

   撥ねられたら、まず棚を詰め直す。生のまま入っている記録を読み出し、圧して
   置き直す。中身は一字も変えない。詰め直せば四分の一以下になるので、たいていは
   これで空きができる。そのうえで、もう一度だけ書いてみる。 */
async function 棚を詰め直す(除く) {
  let 詰めた = 0;
  for (const w of 枠一覧()) {
    if (w.key === 除く) continue;
    let 文 = null;
    try { 文 = await 置き場().読む(w.key); } catch (e) { continue; }
    if (!文 || 文.startsWith("z1:")) continue;          // すでに圧してある
    const d = 解く(文);
    if (!d || !d.state) continue;                       // 読めぬものは触らない
    try {
      await 置き場().書く(w.key, 圧す(JSON.stringify({ v: d.v || 版, at: d.at || Date.now(), state: d.state })));
      詰めた++;
    } catch (e) { /* この枠は諦めて次へ */ }
  }
  return 詰めた;
}

/* 収める。うまくいけば true、駄目なら訳を添えて false を返す。
   「記録できない環境」と一括りにしていたので、棚が一杯なだけのときも
   「この端末では記録できない」と読めてしまい、手の打ちようが分からなかった。 */
let 記録の訳 = "";
export const 記録の訳を読む = () => 記録の訳;

export async function saveGame(state, key) {
  const k = key || SAVE_KEY;
  記録の訳 = "";
  let 包み = null;
  try {
    const 逃 = await 別の遊びを逃がす(k, state);
    if (逃 && 逃.逃がした) 直近の避難 = 逃;
    包み = 包む(state);
    const ok = await 置き場().書く(k, 包み);
    if (ok) return true;
    記録の訳 = "この端末では記録を残せません";
    return false;
  } catch (e) {
    // 棚が一杯。詰め直して、もう一度だけ試す。
    try {
      const 詰 = await 棚を詰め直す(k);
      const ok2 = await 置き場().書く(k, 包み || 包む(state));
      if (ok2) {
        記録の訳 = 詰 ? `棚を詰め直して収めました（${詰}枠）` : "";
        return true;
      }
    } catch (e2) { /* まだ入らない */ }
    記録の訳 = "記録の空きが足りません。記録所で古い枠を消してください";
    return false;
  }
}

/* 直近に逃がしたもの。画面が拾って「移しました」と告げるのに使う。 */
export let 直近の避難 = null;
export const 避難を読む = () => { const v = 直近の避難; 直近の避難 = null; return v; };

export async function loadGame(key) {
  try { return 解く(await 置き場().読む(key || SAVE_KEY)); }
  catch (e) { return null; }
}

export async function clearGame(key) {
  try { await 置き場().消す(key || SAVE_KEY); } catch (e) { /* noop */ }
}

/* 枠をすべて読んで並べる。中身の無い枠は d を null にして、枠そのものは残す。
   画面には「空き」として出す。どこが空いているか見えないと、収める先を選べない。 */
export async function 記録を並べる() {
  const out = [];
  for (const w of 枠一覧()) {
    let d = null;
    try { d = 解く(await 置き場().読む(w.key)); } catch (e) { d = null; }
    out.push({ ...w, d });
  }
  return out;
}

/* 自動の枠を、空いている手記録へ逃がす（GDD 15.3）。

   新しく始めると、最初の月送りで自動の枠が黙って上書きされていた。
   遊ぶ側から見れば、既にある記録が勝手に消える。実際、iPhone で天文二十二年
   まで進めた織田家の盤がこれで失われた。取り返しのつかない損である。

   新しく始める前、控えから戻す前に、いま自動の枠にある盤を空き枠へ写しておく。
   空き枠が一つも無ければ写せないので、そのときは呼ぶ側が問うこと。 */
export async function 自動を逃がす() {
  let d = null;
  try { d = 解く(await 置き場().読む(SAVE_KEY)); } catch (e) { d = null; }
  if (!d) return { 要らぬ: true };
  for (let i = 1; i <= 枠の数; i++) {
    const k = 枠の鍵(i);
    let 有 = null;
    try { 有 = 解く(await 置き場().読む(k)); } catch (e) { 有 = null; }
    if (有) continue;
    try { await 置き場().書く(k, 包む(d.state)); } catch (e) { return { 失敗: true, d }; }
    return { 逃がした: k, 名: `記録 ${"一二三四五"[i - 1]}`, d };
  }
  return { 空きなし: true, d };
}

// 記録の見出し。年月・家・石高・城数を一行にまとめる。
export function 記録の見出し(d, FACTIONS) {
  if (!d || !d.state) return null;
  const st = d.state;
  const f = (FACTIONS || {})[st.player] || (st.factions || {})[st.player] || {};
  const 城 = (st.castles || []).filter((c) => c.faction === st.player);
  const koku = 城.reduce((a, c) => a + (c.koku || 0), 0);
  return {
    年: st.year, 月: st.month, 家: f.name || "―", 色: f.color || "#8A8478",
    城数: 城.length, 万石: Math.round(koku / 10000),
    at: d.at || 0, 見物: !!st.autoPlay,
  };
}

/* ------------------------------------------------ 控えの書き出しと読み込み

   ブラウザの記憶は、履歴を消せば一緒に消える。これを防ぐ手立ては
   ブラウザの側には無い。控えをファイルとして手元に取っておくほかない。
   iPhone なら「ファイル」に収まり、iCloud を通じて他の端末へも移せる。 */

// 控えの名。年月と家名を入れておけば、いつのものか一目で分かる。
export function 控えの名(state, 家名) {
  const y = state.year, m = state.month;
  return `戦国_${y}年${String(m).padStart(2, "0")}月_${家名 || "無名"}.json`;
}

// 控えを書き出す（ブラウザに落とさせる）
export function exportSave(state, 家名) {
  if (typeof document === "undefined") return false;
  const 塊 = new Blob([包む(state)], { type: "application/json" });
  const url = URL.createObjectURL(塊);
  const a = document.createElement("a");
  a.href = url;
  a.download = 控えの名(state, 家名);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // すぐ捨てると保存が間に合わぬ端末がある。少し置いてから捨てる。
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}

// 控えを読み込む。読めたら盤の様子を返す。
export async function importSave(file) {
  const 文 = await file.text();
  const d = 解く(文);
  return d ? d.state : null;
}
