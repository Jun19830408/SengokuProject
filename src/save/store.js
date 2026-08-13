/* ==========================================================================
   記録の置き場
   ──────────────────────────────────────────────────────────────────────────
   置き場に求める作法は三つだけである。

     読む(鍵)        → 文字列、なければ null
     書く(鍵, 文字列) → 収めたら true
     消す(鍵)

   この三つさえ守れば、置き場は何であってもよい。
   いまは二つを備える。

     ・Artifacts の蔵（window.storage）… Claude の Artifacts で遊ぶとき
     ・ブラウザの記憶（localStorage） … ブラウザで開いて遊ぶとき

   後日、端末の間で記録を分け合いたくなったら、同じ三つの作法を備えた
   置き場をここへ足し、下の「選ぶ」に一行加えるだけでよい。
   呼ぶ側（save.js）に手を入れる必要はない。
   ========================================================================== */

// 一、Artifacts の蔵
const Artifactsの蔵 = {
  名: "Artifacts",
  使えるか: () => typeof window !== "undefined" && !!window.storage,
  読む: async (鍵) => {
    const r = await window.storage.get(鍵);
    return r && r.value ? r.value : null;
  },
  書く: async (鍵, 文) => { await window.storage.set(鍵, 文); return true; },
  消す: async (鍵) => { await window.storage.delete(鍵); },
};

// 二、ブラウザ自身の記憶
const ブラウザの記憶 = {
  名: "ブラウザ",
  使えるか: () => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      // 覗き見禁止の設定では、あっても使えぬことがある。実際に置いてみる。
      window.localStorage.setItem("sengoku:試", "1");
      window.localStorage.removeItem("sengoku:試");
      return true;
    } catch (e) { return false; }
  },
  読む: async (鍵) => window.localStorage.getItem(鍵),
  書く: async (鍵, 文) => { window.localStorage.setItem(鍵, 文); return true; },
  消す: async (鍵) => { window.localStorage.removeItem(鍵); },
};

// 三、どこにも置けないとき（記録は残らないが、遊ぶことはできる）
const 置き場なし = {
  名: "なし",
  使えるか: () => true,
  読む: async () => null,
  書く: async () => false,
  消す: async () => {},
};

// 上から順に、使えるものを選ぶ
const 置き場一覧 = [Artifactsの蔵, ブラウザの記憶, 置き場なし];

let 選んだ = null;
export function 置き場() {
  if (選んだ) return 選んだ;
  for (const p of 置き場一覧) {
    try { if (p.使えるか()) { 選んだ = p; break; } } catch (e) { /* 次を試す */ }
  }
  return (選んだ = 選んだ || 置き場なし);
}

// いまどこへ置いているか（画面に出して確かめるため）
export const 置き場の名 = () => 置き場().名;
