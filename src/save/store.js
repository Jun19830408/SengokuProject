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

/* 二の二、ブラウザの大きな蔵（IndexedDB）

   ブラウザの記憶（localStorage）には厳しい限りがある。iPhone の Safari では
   五MBほどで、しかも文字は十六ビットで預かるので、見かけの文字数の倍を食う。

   盤が育つとこれに収まらなくなる。二百四十五城・千八百万石の盤は、生の文字で
   二.二九MB、圧して四十五万四千字――棚では〇.八九MBである。枠は六つあるから
   五.三MBとなり、棚を越える。越えると、月送りの自動の記録がそのつど撥ねられ、
   遊ぶ側は何も収められないまま進むことになる。実際にそうなった――一五八四年
   まで進めた盤が、ひとつも残らずに消えた。

   詰め直しの手当ては入れてあるが、どの枠も既に圧してあるときは一バイトも
   減らせない。中身を削っても四分しか縮まなかった（圧しがもう効いているので、
   鍵の名を短くしても辞書が吸ってしまう）。限りそのものを広げるほかない。

   IndexedDB は桁が違う。同じブラウザの中にありながら、数百MBを預かれる。
   作法は三つ（読む・書く・消す）のまま包んで差し出す。

   古い記録を失わないことが何より先である。だから、
     ・読むときは、蔵に無ければブラウザの記憶を見る（これまでの記録が読める）
     ・読めたものは蔵へ写しておく（次からは蔵で足りる）
     ・書けたことを確かめてから、ブラウザの記憶の同じ鍵を外す（棚の空きを戻す）
   という順にする。確かめる前に外してはならない。 */
const 大きな蔵 = (() => {
  const 蔵の名 = "sengoku", 棚の名 = "kiroku";
  let 開き = null;
  const 開く = () => {
    if (開き) return 開き;
    開き = new Promise((res, rej) => {
      let req;
      try { req = window.indexedDB.open(蔵の名, 1); } catch (e) { rej(e); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(棚の名)) db.createObjectStore(棚の名);
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error || new Error("蔵が開かない"));
      req.onblocked = () => rej(new Error("蔵が塞がっている"));
    });
    return 開き;
  };
  const 一手 = (向き, 技) => 開く().then((db) => new Promise((res, rej) => {
    const t = db.transaction(棚の名, 向き);
    const st = t.objectStore(棚の名);
    const r = 技(st);
    t.oncomplete = () => res(r ? r.result : undefined);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error("蔵の手が止まった"));
  }));
  /* ブラウザの記憶にも手が届くか。届くなら、古い記録を拾って移せる。 */
  const 旧い棚 = () => {
    try { return (typeof window !== "undefined" && window.localStorage) || null; }
    catch (e) { return null; }
  };
  return {
    名: "蔵",
    使えるか: () => typeof window !== "undefined" && !!window.indexedDB,
    読む: async (鍵) => {
      let v = null;
      try { v = await 一手("readonly", (st) => st.get(鍵)); } catch (e) { v = null; }
      if (v != null) return v;
      // 蔵に無い。これまでの記録がブラウザの記憶にあるなら、それを読んで写す。
      const ls = 旧い棚();
      if (!ls) return null;
      let 古 = null;
      try { 古 = ls.getItem(鍵); } catch (e) { 古 = null; }
      if (古 == null) return null;
      try {
        await 一手("readwrite", (st) => st.put(古, 鍵));
        // 写せたことを確かめてから、はじめて古いほうを外す
        const 検 = await 一手("readonly", (st) => st.get(鍵));
        if (検 === 古) { try { ls.removeItem(鍵); } catch (e) { /* 残っても害はない */ } }
      } catch (e) { /* 写せずとも、読めたものは返す */ }
      return 古;
    },
    書く: async (鍵, 文) => {
      /* 蔵が開かぬ端末もある（覗き見禁止の窓など）。蔵があることと、使えることは
         別である。使えなければ、これまでどおりブラウザの記憶へ置く――ここで
         退かずに投げると、その端末では一切記録が残らなくなる。 */
      try {
        await 一手("readwrite", (st) => st.put(文, 鍵));
        /* 収まったことを確かめる。確かめてから、ブラウザの記憶の同じ鍵を外す。
           外しておかないと、古い大きな記録が棚を塞いだままになる。 */
        const 検 = await 一手("readonly", (st) => st.get(鍵));
        if (検 !== 文) throw new Error("蔵に収まらなかった");
        const ls = 旧い棚();
        if (ls) { try { ls.removeItem(鍵); } catch (e) { /* 害はない */ } }
        return true;
      } catch (e) {
        const ls = 旧い棚();
        if (!ls) throw e;
        ls.setItem(鍵, 文);          // 棚も一杯なら、ここで投げる（呼ぶ側が詰め直す）
        return true;
      }
    },
    消す: async (鍵) => {
      try { await 一手("readwrite", (st) => st.delete(鍵)); } catch (e) { /* 次へ */ }
      const ls = 旧い棚();
      if (ls) { try { ls.removeItem(鍵); } catch (e) { /* 害はない */ } }
    },
  };
})();

// 三、どこにも置けないとき（記録は残らないが、遊ぶことはできる）
const 置き場なし = {
  名: "なし",
  使えるか: () => true,
  読む: async () => null,
  書く: async () => false,
  消す: async () => {},
};

// 上から順に、使えるものを選ぶ
const 置き場一覧 = [Artifactsの蔵, 大きな蔵, ブラウザの記憶, 置き場なし];

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
