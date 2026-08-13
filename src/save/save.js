import { migrateRosters } from "../core/state.js";
import { 置き場 } from "./store.js";

/* ==========================================================================
   記録（セーブ）
   どこへ置くかは store.js が決める。ここは「何を、どう包むか」だけを見る。
   ========================================================================== */
export const SAVE_KEY = "sengoku:save1";
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
  migrateRosters(d.state);                 // 旧い記録には名簿がない。読むときに作る。
  return d;
}

export async function saveGame(state) {
  try { return await 置き場().書く(SAVE_KEY, 包む(state)); }
  catch (e) { return false; }              // 置き場が使えないときは黙って諦める
}

export async function loadGame() {
  try { return 解く(await 置き場().読む(SAVE_KEY)); }
  catch (e) { return null; }
}

export async function clearGame() {
  try { await 置き場().消す(SAVE_KEY); } catch (e) { /* noop */ }
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
