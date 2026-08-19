import { migrateSave } from "../core/state.js";
import { 置き場 } from "./store.js";
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
];
const 版 = 1;

// 記録の包み。年月と家名を添えておくと、書き出した控えを人が見て分かる。
function 包む(state) {
  return JSON.stringify({ v: 版, at: Date.now(), state });
}

// 包みを解く。中身が盤の様子でなければ null を返す。
function 解く(文) {
  if (!文) return null;
  let d = null;
  try { d = JSON.parse(文); } catch (e) { return null; }
  if (!d || !d.state || !Array.isArray(d.state.castles)) return null;
  migrateSave(d.state);                    // 旧い記録を繕う（名簿、旗の下を狙う戦役）
  return d;
}

export async function saveGame(state, key) {
  try { return await 置き場().書く(key || SAVE_KEY, 包む(state)); }
  catch (e) { return false; }              // 置き場が使えないときは黙って諦める
}

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
