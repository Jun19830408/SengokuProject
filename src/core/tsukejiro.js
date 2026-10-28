/* ==========================================================================
   付城（GDD 9.2 / 9.3）

   遊ぶ側の申し出は「付城などは面白い。政務フェーズで付け城などを建設できるように
   なるのもいい」であった。

   付城は、寄せ手が囲んだ城の前に築く砦である。柵を回し、井楼を上げて城を見張る。
   三木城の干し殺し、鳥取城の渇え殺しでは、寄せ手は城のまわりに幾つもの付城を連ね、
   兵糧の入る道を断った。

     普請   … 囲みの月の下知「付城を築く」。その月は兵糧攻めを続けながら、
              金を払って普請を進める。囲む軍の将の政務が高いほど早い。
              百に届けば一つ成る。二つまで
     効き   … ひとつにつき包囲率を十二上げる（城の兵糧の減りが速まり、
              包囲率が七十五を超えれば後詰が城へ入れない。govern/month.js）
              城攻めの盤では、寄せ手は南の端からではなく付城から寄せる
              （川を越えた先に陣がある。battle/castleMap.js 付城を据える）
     失う時 … 囲みを解けば付城も捨てる（囲みの札 sg とともに消える）

   持つ形は囲みの札（s.sieges の一つ）の上に置く。
     sg.付城     … 出来上がった付城の数
     sg.付城普請 … 普請の進み（〇〜百）
   ========================================================================== */
export const 付城の限り = 2;
export const 付城の普請高 = 100;

/* 一度の普請の金。囲む軍の大きさなりに上下する */
export const 付城の手間 = (army) => Math.round(160 + Math.max(0, (army && army.men) || 0) * 0.008);

/* 一度の普請で進む量。囲む軍の将のうち、政務のいちばん高い者で決まる */
export function 付城の進み(s, army) {
  const 将 = ((army && army.gens) || []).map((id) => (s.generals || []).find((x) => x.id === id)).filter(Boolean);
  const 政 = 将.length ? Math.max(...将.map((x) => x.gov || 50)) : 50;
  return Math.round(34 + 政 / 3);
}

/* 包囲率への足し（〇〜一の割）。ひとつにつき〇.一二 */
export const 付城の締め = (sg) => 0.12 * Math.min(付城の限り, (sg && sg.付城) || 0);

export function 付城を築けるか(s, sg, army) {
  if (!sg || !army) return { ok: false, why: "" };
  if ((sg.付城 || 0) >= 付城の限り) return { ok: false, why: `付城は${付城の限り}つまでである。` };
  const f = (s.factions || {})[army.faction];
  const 費 = 付城の手間(army);
  if (!f || f.gold < 費) return { ok: false, why: `付城の普請には${費}貫が要る。` };
  return { ok: true, why: "" };
}

/* 付城の普請ひとたび。金を払い、進みを積む。百に届けば一つ成る */
export function 付城の普請(s, sg, army) {
  const 可 = 付城を築けるか(s, sg, army);
  if (!可.ok) return { ok: false, why: 可.why };
  const f = s.factions[army.faction];
  const 費 = 付城の手間(army);
  f.gold -= 費;
  const 前 = Math.round(sg.付城普請 || 0);
  const 後 = 前 + 付城の進み(s, army);
  let 成 = false;
  if (後 >= 付城の普請高) { sg.付城 = (sg.付城 || 0) + 1; sg.付城普請 = 0; 成 = true; }
  else sg.付城普請 = 後;
  return { ok: true, 費, 前, 後: 成 ? 付城の普請高 : 後, 成, 数: sg.付城 || 0 };
}
