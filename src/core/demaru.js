/* ==========================================================================
   出城の普請（GDD 9.3 / 6.2）

   遊ぶ側の申し出は「付城などは面白い（例えば、真田丸的なものができるとも思います）。
   政務フェーズで付け城などを建設できるようになるのもいい」であった。

   出城は、城の大手の堀の外に築く小さな曲輪である。城攻めの盤では、空堀と土塁と
   板塀で囲い、前に門を、前の隅に矢倉を二つ立てる（battle/castleMap.js 出城を組む）。
   寄せ手は出城の前を通らねば大手へ寄せられず、出城の守り手は塀の内から寄せ手の
   横腹を射る。大坂冬の陣の真田丸がこれである。

     普請   … 一度の下知で城の身代なりの金を払い、政務の高い者ほど早く進む。
              積み上がって百に届けば出来上がる（政務六十なら三度、九十なら二度）
     名     … 「出城」とだけ呼ぶ。もとは普請を終えた将の姓に「丸」を付けていたが、遊ぶ側の
              申し出は「〇〇丸は変なので、出城でいいのではないか」であった
     失う時 … 城攻めで落とされれば焼かれる（ui/MapScreen.jsx 城攻めの後始末）

   持つ形は城の上に置く。
     castle.出城     … 出来上がった出城 { 名, 将, 年 }。無ければ null（名は「出城」。古い記録に
                       「〇〇丸」の名が残っていても、盤と帳は「出城」と出す）
     castle.出城普請 … 普請の進み（〇〜百）
   ========================================================================== */
export const 出城の普請高 = 100;

/* 一度の下知の金。城の身代（石高）なりに上下する（govern/commands.js の 値 と同じ掛け方） */
export function 出城の手間(c) {
  const 身の丈 = Math.max(0.35, Math.min(1.4, 0.35 + ((c && c.koku) || 0) / 60000));
  return Math.round(220 * 身の丈);
}

/* 一度の下知で進む量。政務が高いほど早い */
export const 出城の進み = (gen) => Math.round(24 + ((gen && gen.gov) || 50) / 3);

export function 出城を築けるか(s, c) {
  if (!c) return { ok: false, why: "" };
  if (c.出城) return { ok: false, why: `${c.name}にはすでに出城がある。` };
  if ((s.sieges || []).some((sg) => sg.castleId === c.id)) return { ok: false, why: `${c.name}は囲まれている。` };
  const f = s.factions[c.faction];
  const 費 = 出城の手間(c);
  if (!f || f.gold < 費) return { ok: false, why: `${費}貫が要る。` };
  return { ok: true, why: "" };
}

/* 出城の普請ひとたび。金を払い、進みを積む。百に届けば出来上がる */
export function 出城の普請(s, c, gen) {
  const 可 = 出城を築けるか(s, c);
  if (!可.ok) return { ok: false, why: 可.why };
  const f = s.factions[c.faction];
  const 費 = 出城の手間(c);
  f.gold -= 費;
  const 前 = Math.round(c.出城普請 || 0);
  const 後 = 前 + 出城の進み(gen);
  let 成 = false;
  if (後 >= 出城の普請高) {
    c.出城 = { 名: "出城", 将: gen ? gen.id : null, 年: s.year };
    c.出城普請 = 0;
    成 = true;
  } else c.出城普請 = 後;
  return { ok: true, 費, 前, 後: 成 ? 出城の普請高 : 後, 成 };
}
