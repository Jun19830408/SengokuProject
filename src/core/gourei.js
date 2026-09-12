/* ============================================================ 号令（GDD 12.5）

   天下人が諸大名に出陣を命じる。惣無事令が「私戦を停めよ」であるのに対し、
   号令は「ここへ出よ」である。秀吉の小田原がその形で、全国の大名が数筋の道から
   同じ城へ寄せた。

   単なる大規模な陣触れとは違う。天下統一の総仕上げにあたる下知であって、
   身分の梯子がそのまま骨格になる。

   ── 誰が一手を出すか ──

     旗頭　　… 預かる方面（複数国）を一手にまとめる
     国主　　… その一国を一手（旗頭のいない国）
     臣従大名… その家の全城を一手（本拠から発する）

   国主のいない国は参陣しない。国主を任じるのは大名の権であるから、任じて
   いない国は「まだ差配の届かぬ国」である。号令は総仕上げの下知なのだから、
   家の骨組みを整えてはじめて通る。

   ── 何人出すか ──

     その単位の全城から、守備に要る分を除いた兵をことごとく。
     一万石につきおよそ三百五十人（動員の構えと馴染みで前後する）。

   ── 幾筋を同時に ──

     五筋まで。一つの号令に加わっている国主・旗頭は、別の号令には出られない。
     人は一人しかいないのだから当然である。 */
import { minGarrison, 旗頭の受け持ち } from "./rank.js";

export const 号令の限り = 5;                        // 同時に発せる号令の数

/* その家の当主。 */
const 当主 = (s, fid) => (s.generals || []).find((g) => g.faction === fid && g.lord && !g.captive);

/* 臣従している家（従属は含まない。旗の下に完全に入った家だけが号令に応じる）。 */
export const 旗の下の家ら = (s, 主) => Object.keys(s.factions || {}).filter((f) => {
  if (f === 主) return false;
  if (!s.castles.some((c) => c.faction === f)) return false;
  const r = (s.relations || {})[[主, f].sort().join("|")];
  return !!r && r.state === "臣従" && r.master === 主;
});

/* 城から出せる地の兵。守備に要る分は必ず残す。

   地の兵と直属を混ぜて数えてはならない。直属は将とともに動く手勢であって、
   城に残る兵ではない。混ぜて「地の兵＋直属−守備」としていたころは、直属の
   多い城で守備の分まで根こそぎ割かれた（長島城で兵一八四〇のうち二〇六〇を
   出せる、という勘定になっていた）。 */
export const 出せる地の兵 = (s, c) => Math.max(0, Math.round((c.local || 0) - minGarrison(c)));

/* その城から号令に出せる総勢。地の兵の余りに、出る将の直属を足したもの。 */
export const 出せる兵 = (s, c) => {
  const 直属 = (s.generals || [])
    .filter((g) => g.at === c.id && g.faction === c.faction && !g.captive)
    .reduce((a, g) => a + (g.retinue || 0), 0);
  return 出せる地の兵(s, c) + 直属;
};

/* いま号令に出ている者の名簿（別の号令には出られない）。 */
const 出ている者 = (s) => {
  const 出 = new Set();
  for (const g of s.号令 || []) for (const 手 of g.手 || []) if (手.将) 出.add(手.将);
  return 出;
};

/* 参陣の顔ぶれ（GDD 12.5）。

   返すのは「一手ごとの札」である。まだ軍は立てない――誰が何人出せるかを
   遊ぶ側に見せてから発するので、勘定と実行を分けておく。 */
export function 参陣の顔ぶれ(s, 主) {
  const 出中 = 出ている者(s);
  const 手ら = [];
  const 済んだ国 = new Set();

  /* 一　旗頭。受け持ちをまとめて一手。 */
  for (const g of (s.generals || []).filter((x) => x.faction === 主 && x.役 === "旗頭" && !x.captive)) {
    const 受 = 旗頭の受け持ち(s, g).filter((k) => s.castles.some((c) => c.faction === 主 && c.kuni === k));
    if (!受.length) continue;
    for (const k of 受) 済んだ国.add(k);
    const 城ら = s.castles.filter((c) => c.faction === 主 && 受.includes(c.kuni));
    手ら.push({
      種別: "方面", 将: g.id, 将名: g.name, 家: 主, 国ら: 受,
      発つ城: (s.castles.find((c) => c.id === (g.本領 || g.at)) || 城ら[0] || {}).id,
      城ら: 城ら.map((c) => c.id),
      兵: 城ら.reduce((a, c) => a + 出せる兵(s, c), 0),
      出られる: !出中.has(g.id),
      訳: 出中.has(g.id) ? `${g.name}は他の号令に出ている` : null,
    });
  }

  /* 二　国主。旗頭の預かる国を除いた、自家の国ごとに一手。
         国主のいない国は参陣しない。 */
  const 我が国 = [...new Set(s.castles.filter((c) => c.faction === 主).map((c) => c.kuni))];
  const 当 = 当主(s, 主);
  const 当主の城 = 当 && s.castles.find((c) => c.id === (当.本領 || 当.at));
  for (const k of 我が国) {
    if (済んだ国.has(k)) continue;
    const 城ら = s.castles.filter((c) => c.faction === 主 && c.kuni === k);
    const 主将 = (s.generals || []).find((g) => g.faction === 主 && g.役 === "国主" && g.役国 === k && !g.captive);
    if (!主将) {
      /* 当主のいる国には国主を置かない（GDD 6.4）。その国は当主が自ら率いる。 */
      if (当主の城 && 当主の城.kuni === k) {
        手ら.push({
          種別: "当主", 将: 当.id, 将名: 当.name, 家: 主, 国ら: [k],
          発つ城: 当主の城.id, 城ら: 城ら.map((c) => c.id),
          兵: 城ら.reduce((a, c) => a + 出せる兵(s, c), 0),
          出られる: !出中.has(当.id),
          訳: 出中.has(当.id) ? `${当.name}は他の号令に出ている` : null,
        });
        continue;
      }
      手ら.push({
        種別: "一国", 将: null, 将名: null, 家: 主, 国ら: [k],
        発つ城: (城ら[0] || {}).id, 城ら: 城ら.map((c) => c.id), 兵: 0,
        出られる: false, 訳: `${k}に国主がいない。国主を任じねば号令は届かない`,
      });
      continue;
    }
    手ら.push({
      種別: "一国", 将: 主将.id, 将名: 主将.name, 家: 主, 国ら: [k],
      発つ城: (s.castles.find((c) => c.id === (主将.本領 || 主将.at)) || 城ら[0] || {}).id,
      城ら: 城ら.map((c) => c.id),
      兵: 城ら.reduce((a, c) => a + 出せる兵(s, c), 0),
      出られる: !出中.has(主将.id),
      訳: 出中.has(主将.id) ? `${主将.name}は他の号令に出ている` : null,
    });
  }

  /* 三　臣従した大名。家ごとに一手、本拠から発する。

     臣従家に国主を要らぬのは、その家が一手しか出さないからである。国主を
     挟む意味が薄い（作者の決めにより、まず本拠で作る）。 */
  for (const f of 旗の下の家ら(s, 主)) {
    const 城ら = s.castles.filter((c) => c.faction === f);
    const 主将 = 当主(s, f);
    const 本拠 = s.castles.find((c) => c.id === (s.factions[f] || {}).本拠 && c.faction === f) || 城ら[0];
    手ら.push({
      種別: "臣従", 将: 主将 ? 主将.id : null, 将名: 主将 ? 主将.name : null, 家: f,
      国ら: [...new Set(城ら.map((c) => c.kuni))],
      発つ城: (本拠 || {}).id, 城ら: 城ら.map((c) => c.id),
      兵: 城ら.reduce((a, c) => a + 出せる兵(s, c), 0),
      出られる: !!主将 && !出中.has(主将.id),
      訳: !主将 ? `${(s.factions[f] || {}).name}に当主がいない`
        : (出中.has(主将.id) ? `${主将.name}は他の号令に出ている` : null),
    });
  }

  return 手ら;
}

/* 号令を発せるか。 */
export function 号令を発せるか(s, 主, 的id, { 号令できるか } = {}) {
  if (号令できるか && !号令できるか(s, 主)) {
    return { ok: false, why: "天下に号令できるのは関白か征夷大将軍だけである。" };
  }
  if ((s.号令 || []).length >= 号令の限り) {
    return { ok: false, why: `一度に発せる号令は${号令の限り}筋まで。いま${(s.号令 || []).length}筋。` };
  }
  const 的 = s.castles.find((c) => c.id === 的id);
  if (!的) return { ok: false, why: "その城はない。" };
  if (的.faction === 主) return { ok: false, why: "自家の城へは号令できない。" };
  if ((s.号令 || []).some((g) => g.的 === 的id)) {
    return { ok: false, why: "その城へはすでに号令を発してある。" };
  }
  const 顔 = 参陣の顔ぶれ(s, 主).filter((x) => x.出られる && x.兵 > 0);
  if (!顔.length) return { ok: false, why: "参陣できる手がない。国主を任じ、兵を蓄えてから発すること。" };
  return { ok: true, 手ら: 顔, 触れ済み: !!(s.惣無事令の控え || {})[主] };
}

/* 号令を発する（GDD 12.5）。

   参陣の一手ごとに軍を立て、一つの城へ収斂させる。既にある戦役（campaign）の
   仕組みがそのまま使える――複数の軍が一つの城へ集まり、総大将が遅参を待つか
   攻めかかるかを決める。新しい仕掛けはほとんど要らない。

   手を貸すもの（軍の名・道・兵糧・名簿）は呼ぶ側から渡す。ここを純関数に
   保っておけば、画面を通さずに測れる。 */
export function 号令を発する(s, 主, 的id, 手ら, 具) {
  const { 軍の名, 道を引く, 素の道, 兵糧, 名簿を割く, 運び賃を払う } = 具 || {};
  /* 惣無事令を発してあるか。発してあれば、号令の軍は道の掟を措いて進める。 */
  const 触れ済み = !!(s.惣無事令の控え || {})[主];
  const 的 = s.castles.find((c) => c.id === 的id);
  if (!的) return null;
  const 立った = [];
  for (const 手 of 手ら) {
    if (!手.出られる || 手.兵 <= 0) continue;
    const 発 = s.castles.find((c) => c.id === 手.発つ城);
    if (!発) continue;
    /* 号令の道（GDD 12.5）。

       常の出陣では他家の領を素通りできない。ところが号令は違う――惣無事令を
       発して天下の諸大名を旗の下に置いたうえでの下知なのだから、道々の家も
       同じ旗の下にある。秀吉の小田原に、東海道の大名が道を貸さぬはずがない。

       ゆえに惣無事令を経ていれば、道の掟を措いて素の道を引く。経ていなければ
       常のとおりで、他家の領は通れない。「惣無事令 → 号令」という順が、
       この緩めの拠り所である。

       実測では、惣無事令を経ずに道の掟のままだと、参陣できる六十九手のうち
       立ったのは九手だけであった。六十手は道が引けずに消えていた。 */
    const 道 = 触れ済み
      ? ((素の道 ? 素の道(発.id, 的id) : null) || (道を引く ? 道を引く(s, 手.家, 発.id, 的id) : null))
      : (道を引く ? 道を引く(s, 手.家, 発.id, 的id) : null);
    if (!道) continue;                                   // それでも道がなければ出られない
    /* その手の城々から兵を割く。守備に要る分は残す。 */
    let 兵 = 0;
    const 名簿 = [];
    for (const cid of 手.城ら) {
      const c = s.castles.find((x) => x.id === cid);
      if (!c) continue;
      const 割 = 出せる地の兵(s, c);              // 守備の分は残す
      if (割 <= 0) continue;
      c.local = Math.max(0, (c.local || 0) - 割);
      兵 += 割;
      if (名簿を割く) { const t = 名簿を割く(c, 割); if (t) 名簿.push(...t); }
    }
    /* 将。その手を率いる者と、発つ城にいる者たちが従う。 */
    const 将ら = (s.generals || []).filter((g) =>
      g.faction === 手.家 && !g.captive && g.at === 発.id).slice(0, 4);
    if (手.将 && !将ら.some((g) => g.id === 手.将)) {
      const 主将 = s.generals.find((g) => g.id === 手.将);
      if (主将 && !主将.captive) 将ら.unshift(主将);
    }
    const 総勢 = 兵 + 将ら.reduce((a, g) => a + (g.retinue || 0), 0);
    if (総勢 < 100) continue;
    const 月 = Math.max(1, (道.length || 1) - 1);
    const 糧 = 兵糧 ? 兵糧(総勢, 月) : Math.round(総勢 * 0.09 * (月 + 2));
    発.food = Math.max(0, (発.food || 0) - 糧);
    if (運び賃を払う) 運び賃を払う(s, 総勢, 月);
    const id = 軍の名 ? 軍の名(s, "g") : `g${(s.軍番 = (s.軍番 || 0) + 1)}`;
    for (const g of 将ら) g.at = null;
    s.armies = [...(s.armies || []), {
      id, faction: 手.家, from: 発.id, gens: 将ら.map((g) => g.id),
      local: 兵, localTrain: 発.localTrain, rost: 名簿.length ? 名簿 : null,
      men: 総勢, at: 発.id, path: 道, prog: 0, food: 糧, target: 的id,
      号令: true, aid: 手.家 === 主 ? null : 主,
    }];
    立った.push({ ...手, armyId: id, 総勢 });
  }
  /* 出られなかった手を控える。惣無事令を経ていなければ道の掟が効くので、
     参陣できるはずの手が黙って消える（二十六手のうち十七手が消えた）。
     なぜ減ったのかが読めねば、遊ぶ側には理不尽に映る。 */
  const 出られず = 手ら.filter((h) => h.出られる && h.兵 > 0
    && !立った.some((x) => x.将 === h.将 && x.家 === h.家));
  if (!立った.length) return null;
  const 号 = {
    id: 軍の名 ? 軍の名(s, "go") : `go${s.軍番}`,
    主, 的: 的id, y: s.year, m: s.month,
    手: 立った.map((x) => ({ 将: x.将, 家: x.家, armyId: x.armyId, 種別: x.種別, 兵: x.総勢 })),
  };
  号.出られず = 出られず.map((h) => ({
    将名: h.将名, 家: h.家, 国ら: h.国ら,
    訳: 触れ済み ? "道が通じない" : "他家の領を素通りできない（惣無事令を発すれば道は開く）",
  }));
  s.号令 = [...(s.号令 || []), 号];
  return 号;
}

/* 済んだ号令を片づける。的が落ちたか、軍が尽きたら終わり。 */
export function 済んだ号令を片づける(s) {
  const 済 = [];
  s.号令 = (s.号令 || []).filter((g) => {
    const 的 = s.castles.find((c) => c.id === g.的);
    const 落ちた = !的 || 的.faction === g.主
      || ((s.relations || {})[[g.主, 的.faction].sort().join("|")] || {}).master === g.主;
    const 軍 = (g.手 || []).filter((h) => (s.armies || []).some((a) => a.id === h.armyId));
    if (落ちた || !軍.length) { 済.push({ ...g, 落ちた }); return false; }
    return true;
  });
  return 済;
}
