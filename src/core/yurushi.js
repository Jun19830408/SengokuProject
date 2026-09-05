/* ============================================================ 攻めの許し（GDD 12.2）

   臣従した家は、主家の許しなくして他家を攻められない。

   臣従は「旗の下に完全に入る」ことである。外交を主に預け、貢を納め、兵を出す。
   その家が勝手に隣国へ攻めかかれば、主家の外交はたちまち破れる。臣従した家の
   戦は、主家の戦でもある。

   さりとて一切を封じては、臣従した家で遊ぶ幅が無くなる。そこで「主家の許し」を
   条件にして攻められることとした。願い出て、容認されれば攻める。

     ・AI が臣従しているなら、攻める前に必ず主家へ願う
     ・遊ぶ側が臣従しているなら、願い出て諾否を待つ。容認されれば自ら軍を動かす
     ・遊ぶ側が主家なら、臣従した家を動かして攻めさせられる（願いは要らない）

   許しは城ごとに一度である。「岐阜城を攻めたい」と城を指して願い、容認されれば
   その城を落とすまで有効。別の城を攻めるにはまた願う。主家が干渉地の位置を
   細かく定められるようにするためである。

   従属は臣従ではない。自らの判断で他家を攻めてよい（主家の同盟に反せぬ範囲で）。
   貢と援軍の義務はあるが、それ以外は独立した家である。 */
import { relKey, relOf, 主家, underMyBanner } from "./state.js";

// 臣従の主。従属では返さない（従属は自らの判断で攻めてよい）
export function 臣従の主(g, fid) {
  for (const other of Object.keys(g.factions || {})) {
    if (other === fid) continue;
    const r = (g.relations || {})[relKey(fid, other)];
    if (!r || r.state !== "臣従") continue;
    if (r.master === fid) continue;                 // 自分が上に立っている
    if (主家(g, fid, other) === fid) continue;
    return other;
  }
  return null;
}

export const 許しの控え = (s) => (s.攻めの許し = s.攻めの許し || []);

// その城を攻める許しが要るか。要らぬなら null、要るなら主家の id を返す
export function 許しの要る主(g, 臣, castleId) {
  const 主 = 臣従の主(g, 臣);
  if (!主) return null;
  const c = (g.castles || []).find((x) => x.id === castleId);
  if (!c) return null;
  if (c.faction === 臣) return null;                       // 自領へは要らぬ
  if (underMyBanner(g, 臣, c.faction)) return null;        // 旗の下の城（後詰）は攻めではない
  if (c.faction === 主) return null;                       // 主家そのものへ向かうのは叛乱。別の筋
  return 主;
}

export function 許されているか(g, 臣, castleId) {
  return 許しの控え(g).some((x) => x.臣 === 臣 && x.castleId === castleId);
}

// 攻められるか。許しが要らぬか、すでに許されていれば真
export function 攻められるか(g, 臣, castleId) {
  return !許しの要る主(g, 臣, castleId) || 許されているか(g, 臣, castleId);
}

export function 許しを与える(s, 臣, castleId) {
  const 主 = 許しの要る主(s, 臣, castleId);
  if (!主 || 許されているか(s, 臣, castleId)) return s;
  許しの控え(s).push({ 主, 臣, castleId, y: s.year, m: s.month });
  return s;
}

export function 許しを解く(s, 臣, castleId) {
  s.攻めの許し = 許しの控え(s).filter((x) => !(x.臣 === 臣 && x.castleId === castleId));
  return s;
}

/* 主家が容認するか（采配）。

   一、その家と約束を交わしているなら、容認しない。臣従の家の戦は主家の戦である。
       同盟の相手を臣下に攻めさせては、自ら約束を破るのと変わらない。
   二、旗の下の家を攻めさせない。身内どうしを噛み合わせる筋はない。
   三、それ以外は、おおむね容認する。臣下が版図を広げれば、貢も兵も増える。
       ただし気性による――「堅実」な家は、臣下が力を付けるのを喜ばない。 */
export function 容認するか(g, 主, 臣, castleId, 籤) {
  const c = (g.castles || []).find((x) => x.id === castleId);
  if (!c) return { ok: false, why: "その城がない" };
  const r = relOf(g, 主, c.faction);
  if (["同盟", "不可侵", "従属", "臣従"].includes(r.state)) {
    return { ok: false, why: `${(g.factions[c.faction] || {}).name}とは${r.state}の間柄にある` };
  }
  if (underMyBanner(g, 主, c.faction)) return { ok: false, why: "旗の下の家である" };
  const 気 = (g.factions[主] || {}).temper;
  const 目 = 気 === "堅実" ? 0.45 : 気 === "陰謀" ? 0.75 : 0.8;
  const 引 = typeof 籤 === "function" ? 籤() : Math.random();
  return 引 < 目 ? { ok: true } : { ok: false, why: "いまは時ではないと退けられた" };
}

/* 落城したら、その城の許しは用済みである。溜め込まぬよう片づける。 */
export function 済んだ許しを片づける(s) {
  s.攻めの許し = 許しの控え(s).filter((x) => {
    const c = (s.castles || []).find((y) => y.id === x.castleId);
    if (!c) return false;
    if (c.faction === x.臣) return false;                 // 落とした
    if (臣従の主(s, x.臣) !== x.主) return false;          // 主が変わった、あるいは独立した
    return true;
  });
  return s;
}
