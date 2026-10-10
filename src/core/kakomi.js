/* ============================================================ 囲みの様子（GDD 9.2）

   城が囲まれている、あるいはこちらが囲んでいる――そのとき盤の上で何が起きて
   いるのかは、月送りの中にしか書かれていなかった。城の帳を開いても「囲まれて
   います」の一行だけで、寄せ手が何人か、兵糧があと何月もつか、後詰が向かって
   いるかは、どこにも出ない。遊ぶ側の申し出は「包囲している、されている軍の
   情報をわかりやすく城のアラート情報として記載する」であった。

   ここでは、月送りが使うのと同じ式から見通しを起こす。見せる数と、盤を動かす
   数とが食い違っては、知らせる意味がない（govern/month.js の囲みの段を見よ）。

     城の食い扶持　　封鎖の扶持（総勢×〇.〇八×動員の掛かり）＋囲みの食い潰し
                     （地の兵×〇.三五＋六百）。月ごとに両方引かれる
     民の離れ　　　　月に六.二（囲みで五、封鎖で一.二）。二十五を割れば城は開く
     寄せ手の食い扶持　総勢×〇.〇九を月に二度（道中の扶持と囲みの扶持）。
                     尽きれば囲みを解く

   はじめは囲みの段だけを数えて見通しを立てたが、実機で測ると食い扶持が式の
   一.二六倍、寄せ手にいたっては二倍減っていた。封鎖の扶持と道中の扶持を
   数え落としていたのである。見せる数と盤を動かす数が食い違えば、知らせる意味が
   ないどころか害になる。
     強攻　　　　　　寄せ手が城方の一.六倍を超えれば、月に四割五分の目で仕掛ける */
import { minGarrison } from "./rank.js";
import { MOB_POLICY } from "../data/roads.js";

/* 城に詰めている兵（地の兵＋城にいる将の直属）。 */
export function 城の兵(s, c) {
  if (!c) return 0;
  const 将 = (s.generals || []).filter((x) => x.at === c.id && x.faction === c.faction && !x.captive);
  return Math.round((c.local || 0) + 将.reduce((a, x) => a + (x.retinue || 0), 0));
}

/* 軍の総勢。帳と食い違わぬよう、控えの men をそのまま読む。 */
const 軍の兵 = (a) => Math.max(0, Math.round((a && a.men) || 0));

/* 城が持ちこたえる月数。兵糧と民心の早いほうで尽きる。 */
export const 民の離れ = 6.2;                      // 囲みで五、封鎖で一.二
export function 城の保ち(s, c) {
  if (!c) return { 兵糧: 0, 民心: 0, 月: 0, 食: 1, 訳: "—" };
  const 地 = Math.max(0, c.local || 0);
  const 上 = ((MOB_POLICY || {})[(((s || {}).factions || {})[c.faction] || {}).mobilization]
    || {}).upkeep;
  const 封 = Math.round(城の兵(s, c) * 0.08 * (上 == null ? 1 : 上));   // 封鎖されても扶持は要る
  const 囲 = Math.round(地 * 0.35 + 600);                               // 囲まれて食い潰すぶん
  const 食 = Math.max(1, 封 + 囲);
  const 兵糧 = Math.max(0, Math.ceil(Math.max(0, c.food || 0) / 食));
  const min = c.min == null ? 100 : c.min;
  const 民心 = min < 25 ? 0 : Math.floor((min - 25) / 民の離れ) + 1;
  const 月 = Math.min(兵糧, 民心);
  return { 兵糧, 民心, 月, 食, 訳: 兵糧 <= 民心 ? "兵糧が尽きる" : "民が離れる" };
}

/* 寄せ手が囲みを続けられる月数。兵糧が尽きれば陣を払う。
   軍は月に二度食う――道中の扶持（月送りの行軍の段）と、囲みの扶持である。 */
export function 寄せ手の保ち(a) {
  if (!a) return 0;
  const 食 = Math.max(1, Math.round(軍の兵(a) * 0.09) * 2);
  return Math.max(0, Math.floor(Math.max(0, a.food || 0) / 食));
}

/* その城へ向かっている他家の軍（まだ着いていないもの）。
   月数は道のりから出す（marchMonthsOf を渡す）。 */
export function 迫る軍(s, c, { 月数, 味方か } = {}) {
  if (!c) return [];
  return (s.armies || []).filter((a) => a.target === c.id && a.at !== c.id
    && a.faction !== c.faction && !(味方か && 味方か(s, a.faction, c.faction)))
    .map((a) => ({ 軍: a, 家: (s.factions || {})[a.faction] || {}, 兵: 軍の兵(a),
      月: Math.max(1, (月数 ? 月数(a.path || []) : 0) || 1) }))
    .sort((x, y) => x.月 - y.月);
}

/* 城の囲みの様子。囲まれていなければ null。

   opt.守りの寄親 を渡せば、その城の守りを誰に預けているかも添える。 */
export function 囲みの様子(s, c, { 守りの寄親, 月数, 味方か } = {}) {
  if (!c) return null;
  const sg = (s.sieges || []).find((x) => x.castleId === c.id);
  const 迫 = 迫る軍(s, c, { 月数, 味方か });
  if (!sg && !迫.length) return null;
  const 寄 = sg ? (s.armies || []).find((a) => a.id === sg.armyId) : null;
  const 守兵 = 城の兵(s, c);
  const 保 = 城の保ち(s, c);
  const 後 = sg && sg.relief ? (s.armies || []).find((a) => a.id === sg.relief) : null;
  /* 救いに向かっている味方。囲みの札が無くても、的がこの城なら後詰である。 */
  const 後詰ら = (s.armies || []).filter((a) => a.faction === c.faction
    && (a.relief === c.id || (a.target === c.id && a.at !== c.id)))
    .map((a) => ({ 軍: a, 兵: 軍の兵(a), 月: Math.max(1, (月数 ? 月数(a.path || []) : 0) || 1) }))
    .sort((x, y) => x.月 - y.月);
  return {
    囲まれている: !!sg,
    囲み: sg || null,
    月数: sg ? (sg.months || 0) : 0,
    寄せ手: 寄 ? {
      軍: 寄, 家: (s.factions || {})[寄.faction] || {}, 兵: 軍の兵(寄),
      大将: (s.generals || []).find((x) => x.id === (寄.gens || [])[0]) || null,
      保ち: 寄せ手の保ち(寄),
      /* 強攻の目。城方の一.六倍を超えれば、月に四割五分の目で攻めかかる。 */
      強攻: 軍の兵(寄) > 守兵 * 1.6,
      囲み: sg && sg.enc != null ? sg.enc : 60,
    } : null,
    城方: { 兵: 守兵, 要る: minGarrison(c), 兵糧: Math.max(0, Math.round(c.food || 0)),
      民: c.min == null ? 100 : Math.round(c.min), ...保 },
    後詰ら, 後詰: 後 || null,
    迫る: 迫,
    守りの寄親: 守りの寄親 ? 守りの寄親(s, c) : null,
  };
}

/* こちらが囲んでいる城の様子。囲んでいなければ null。
   見える数は偵察の及ぶ範囲に限る（見えぬ城の兵糧までは読めない）。 */
export function 囲んでいる様子(s, c, fid, { 月数, 見える } = {}) {
  if (!c || c.faction === fid) return null;
  const 我 = (s.armies || []).filter((a) => a.faction === fid && a.at === c.id
    && (a.sieging || a.target === c.id));
  if (!我.length) return null;
  const sg = (s.sieges || []).find((x) => x.castleId === c.id && 我.some((a) => a.id === x.armyId));
  const 兵 = 我.reduce((t, a) => t + 軍の兵(a), 0);
  const 糧 = 我.reduce((t, a) => t + Math.max(0, Math.round(a.food || 0)), 0);
  const 開 = 見える ? !!見える(s, c) : true;
  const 守兵 = 城の兵(s, c);
  const 保 = 城の保ち(s, c);
  return {
    囲んでいる: !!sg, 月数: sg ? (sg.months || 0) : 0,
    我が軍: 我, 兵, 兵糧: 糧,
    保ち: Math.max(0, Math.floor(糧 / Math.max(1, Math.round(兵 * 0.09) * 2))),
    強攻: 兵 > 守兵 * 1.6,
    見えている: 開,
    城方: 開 ? { 兵: 守兵, 兵糧: Math.max(0, Math.round(c.food || 0)),
      民: c.min == null ? 100 : Math.round(c.min), ...保 } : null,
    /* 城を救いに来る他家の軍（後詰）。見えていなければ数えない。 */
    後詰ら: 開 ? (s.armies || []).filter((a) => a.faction === c.faction && a.target === c.id && a.at !== c.id)
      .map((a) => ({ 軍: a, 兵: 軍の兵(a), 月: Math.max(1, (月数 ? 月数(a.path || []) : 0) || 1) }))
      .sort((x, y) => x.月 - y.月) : [],
  };
}

/* ============================================ 城に在る軍（GDD 6.4 / 9.2）

   城の下には、城の兵とは別に軍が立っていることがある。落とした城に留まる手勢、
   救いに着いた後詰、囲んでいる寄せ手、旗の下の家の援軍――どれも「城に入った」
   わけではないので、城の兵数には出てこない。遊ぶ側の申し出は「城が攻められて
   いるだけでなく、その城に在陣している軍の情報も見れるようにしてほしい」で
   あった。

   用（何のためにそこに居るか）を添えて返す。囲んでいる寄せ手は囲みの札が
   受け持つので、ここでは除く。 */
export function 城に在る軍(s, c, { 味方か } = {}) {
  if (!c) return [];
  const 囲 = (s.sieges || []).find((x) => x.castleId === c.id);
  return (s.armies || [])
    .filter((a) => (a.在陣 === c.id || a.at === c.id) && !(囲 && a.id === 囲.armyId))
    .map((a) => {
      const 味方 = a.faction === c.faction
        || (味方か ? 味方か(s, a.faction, c.faction) : false);
      const 用 = a.在陣 === c.id ? (a.faction === c.faction ? "在陣" : "城下に陣")
        : a.relief === c.id ? "後詰"
        : a.助勢 ? "援軍"
        : a.sieging ? "囲み"
        : 味方 ? "着いたところ" : "城下に在る";
      return {
        軍: a, 家: (s.factions || {})[a.faction] || {}, 味方, 用,
        兵: 軍の兵(a), 地: Math.max(0, Math.round(a.local || 0)),
        将ら: (a.gens || []).map((id) => (s.generals || []).find((x) => x.id === id)).filter(Boolean),
        兵糧: Math.max(0, Math.round(a.food || 0)),
        /* 道を行く軍は月に一度食う（総勢×〇.〇九）。囲んでいる軍はそれに
           囲みの扶持が重なるので、寄せ手の保ち のほうで数える。 */
        月: Math.floor(Math.max(0, a.food || 0) / Math.max(1, Math.round(軍の兵(a) * 0.09))),
        旗頭: a.旗頭 ? (s.generals || []).find((x) => x.id === a.旗頭) || null : null,
      };
    })
    .sort((x, y) => (y.味方 ? 1 : 0) - (x.味方 ? 1 : 0) || y.兵 - x.兵);
}

/* 軍の中身。印を押したときに開く帳のための見立て（GDD 7.3）。 */
export function 軍の中身(s, a, { 月数 } = {}) {
  if (!a) return null;
  const 将ら = (a.gens || []).map((id) => (s.generals || []).find((x) => x.id === id)).filter(Boolean);
  const 直 = 将ら.reduce((t, x) => t + Math.max(0, x.retinue || 0), 0);
  /* 兵科の割り。名簿（五十人組）の種ごとに数える。名簿が無ければ読めない。 */
  const 兵科 = {};
  for (const q of (a.rost || [])) 兵科[q.t] = (兵科[q.t] || 0) + (q.m || 0);
  for (const g of 将ら) for (const q of (g.rost || [])) 兵科[q.t] = (兵科[q.t] || 0) + (q.m || 0);
  const 道 = a.path || [];
  return {
    軍: a, 家: (s.factions || {})[a.faction] || {},
    兵: 軍の兵(a), 地: Math.max(0, Math.round(a.local || 0)), 直,
    将ら, 兵科,
    兵糧: Math.max(0, Math.round(a.food || 0)),
    /* 兵糧の保ちと、着くまでの月数は別のものである。同じ名で持っていたので
       後の「月」が前を塗り潰し、帳には行程の月数しか出ていなかった。 */
    糧月: Math.floor(Math.max(0, a.food || 0) / Math.max(1, Math.round(軍の兵(a) * 0.09))),
    出どころ: (s.castles || []).find((c) => c.id === a.from) || null,
    行き先: (s.castles || []).find((c) => c.id === a.target) || null,
    いま: (s.castles || []).find((c) => c.id === a.at) || null,
    月: a.target && 道.length > 1 ? Math.max(1, (月数 ? 月数(道) : 0) || 1) : 0,
    在陣: a.在陣 ? (s.castles || []).find((c) => c.id === a.在陣) || null : null,
    旗頭: a.旗頭 ? (s.generals || []).find((x) => x.id === a.旗頭) || null : null,
    用: a.relief ? "後詰" : a.助勢 ? "援軍" : a.sieging ? "囲み"
      : a.在陣 ? "在陣" : a.target ? "進軍" : "待機",
  };
}
