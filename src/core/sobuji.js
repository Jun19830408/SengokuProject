/* ============================================================ 惣無事令と朝敵（GDD 12.5）

   天下人は諸大名に私戦の停止を命じた。これを惣無事令という。従えば旗の下に入り、
   拒めば朝敵として討たれる。秀吉の九州も小田原も、この筋で起きた戦である。

   ここでの決めごと。

   一　発せるのは関白か征夷大将軍のみ（core/province.js の 号令できるか）。
   二　問われるのは、既にその家に臣従している者を除く**すべての家**である。
       敵対も中立も同盟も従属も、あらためて問い直す。秀吉は既にあった間柄を
       一度ご破算にして「秀吉に従うか否か」に組み替えた。
   三　従う＝臣従する。ここでは石高の比を問わない。関門を「できるか」ではなく
       「応じるか」に移すのである。家康が応じたのも規則ではなく判断であった。
       応じる見込みは、信用・石高の差・当主の器量で決まる。
   四　拒む＝朝敵となる。以後、その家を攻めるのに約束を破る咎めはない。
       ただし家中は乱れない――従わぬと決めたことは家臣とも談じたはずであり、
       むしろ結束は固まる。北条も島津も、決断の後は最後まで戦った。

   惣無事令は一度きりではない。版図が広がれば、また発せる。ただし同じ家へ
   立て続けに問うのは無体であるから、拒んだ家へは年を措く。 */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const 問い直しの間 = 60;                    // 拒んだ家へ再び問うまでの月数

/* 惣無事令に問われる家。既に臣従している家と、滅んだ家を除く。 */
export function 問われる家(s, 主) {
  return Object.keys(s.factions || {}).filter((f) => {
    if (f === 主) return false;
    if (!s.castles.some((c) => c.faction === f)) return false;   // 滅んでいる
    const r = (s.relations || {})[[主, f].sort().join("|")];
    if (r && r.state === "臣従" && r.master === 主) return false;  // 既に旗の下
    return true;
  });
}

/* 応じる見込み（GDD 12.5）。

   石高の差が大きいほど、誼が篤いほど従いやすい。当主が猛ければ抗い、
   知に長けていれば形勢を読んで従う。統率が高ければ家中をまとめて意を通す
   ――つまり当主の意（従うにせよ抗うにせよ）が強く出る。

   遠国の家は従いにくい。九州の島津が畿内の天下人にすぐ膝を屈さなかったのは、
   そこまで手が届くとは思わなかったからである。 */
export function 応じる目(s, 主, 相, { 石, 隔たり } = {}) {
  const 石高 = 石 || {};
  const 我 = 石高[主] || 1, 彼 = 石高[相] || 1;
  const 比 = 我 / Math.max(1, 彼);
  const r = (s.relations || {})[[主, 相].sort().join("|")] || { state: "中立", trust: 45 };

  /* 一　力の差。二倍で並、四倍で従いやすく、八倍を超えれば抗いようがない。 */
  let 目 = clamp((Math.log(Math.max(1, 比)) / Math.log(8)) * 0.62, 0, 0.62);

  /* 二　誼。信用五十を境に前後する。 */
  目 += ((r.trust == null ? 45 : r.trust) - 50) / 100 * 0.28;

  /* 三　いまの間柄。既に膝を屈している家は、そのまま旗の下へ移りやすい。
         敵対している家は、そう易々とは従わない。 */
  if (r.state === "従属") 目 += 0.22;
  else if (r.state === "同盟") 目 += 0.08;
  else if (r.state === "敵対") 目 -= 0.18;

  /* 四　当主の器量。猛き者は抗い、知ある者は形勢を読む。
         統率はその意の通りやすさ（浸透）である。 */
  const 主将 = (s.generals || []).find((g) => g.faction === 相 && g.lord && !g.captive);
  if (主将) {
    const 浸 = clamp(0.35 + ((主将.lead || 55) - 50) / 200, 0.25, 0.95);
    const 武 = clamp(((主将.valor == null ? 55 : 主将.valor) - 60) / 35, -1, 1);
    const 知 = clamp(((主将.wit == null ? 55 : 主将.wit) - 60) / 35, -1, 1);
    目 += (-武 * 0.20 + 知 * 0.12) * 浸;
  }

  /* 五　遠さ。手が届くと思えぬ相手には膝を屈さない。 */
  if (隔たり != null) 目 -= clamp((隔たり - 200) / 1200, 0, 0.22);

  return clamp(目, 0.02, 0.95);
}

/* 惣無事令を発する。問いの列を立てるだけで、応諾はまだ決めない。 */
export function 惣無事令を発する(s, 主) {
  const 列 = 問われる家(s, 主);
  s.惣無事令 = { 主, y: s.year, m: s.month, 列, 済: [] };
  return s.惣無事令;
}

/* 一つの家が従うか拒むか。応じれば臣従、拒めば朝敵。
   籤は呼ぶ側から渡す（盤の他の出来事をずらさぬため）。 */
export function 応諾を決める(s, 主, 相, { 石, 隔たり, 籤 } = {}) {
  const 引く = typeof 籤 === "function" ? 籤 : Math.random;
  const 目 = 応じる目(s, 主, 相, { 石, 隔たり });
  const 従う = 引く() < 目;
  const key = [主, 相].sort().join("|");
  const r = (s.relations || {})[key] || { trust: 45 };
  if (従う) {
    s.relations[key] = { ...r, state: "臣従", master: 主, until: null,
      trust: clamp((r.trust == null ? 45 : r.trust) + 10, 0, 100) };
    /* 旗の下に入れば、その家が他家に対して持っていた上下の縛りは解ける。
       又貸しは認めない（丙。data/diplo.js の「旗の下か」を見よ）。 */
    for (const k of Object.keys(s.relations)) {
      const q = s.relations[k];
      if (!q || (q.state !== "臣従" && q.state !== "従属")) continue;
      if (q.master !== 相) continue;
      const [a, b] = k.split("|");
      if (a !== 相 && b !== 相) continue;
      q.state = "中立"; q.master = null; q.until = null;
    }
  } else {
    s.relations[key] = { ...r, state: "敵対", master: null, until: null,
      trust: Math.min(r.trust == null ? 45 : r.trust, 20) };
    s.朝敵 = { ...(s.朝敵 || {}), [相]: { 主, y: s.year, m: s.month, 理由: "惣無事令を拒んだ" } };
  }
  return { 相, 従う, 目 };
}

/* 朝敵か。攻めるのに約束を破る咎めがない。 */
export const 朝敵か = (s, fid) => !!(s.朝敵 || {})[fid];

/* 朝敵の名を落とす（旗の下に入った、あるいは滅んだ）。 */
export function 朝敵を解く(s, fid) {
  if (!(s.朝敵 || {})[fid]) return false;
  const 次 = { ...s.朝敵 }; delete 次[fid]; s.朝敵 = 次;
  return true;
}

/* 朝敵の帳を繕う。滅んだ家と、旗の下に入った家を落とす。 */
export function 朝敵を検め直す(s) {
  const 落 = [];
  for (const fid of Object.keys(s.朝敵 || {})) {
    const 生 = s.castles.some((c) => c.faction === fid);
    const 主 = s.朝敵[fid].主;
    const r = (s.relations || {})[[主, fid].sort().join("|")];
    const 屈 = r && (r.state === "臣従" || r.state === "従属") && r.master === 主;
    if (!生 || 屈) { 朝敵を解く(s, fid); 落.push({ fid, 滅び: !生, 屈 }); }
  }
  return 落;
}
