import React, { useState, useEffect, useMemo } from "react";
import { SIEGE_KIT } from "../battle/castleMap.js";
import { FORMATIONS, FORM_NOTE, layoutSlots } from "../battle/corps.js";
import { MAX_CORPS, MAX_CORPS_MEN } from "../battle/field.js";
import { persuadeResult } from "../core/capture.js";
import { isNameless } from "../core/house.js";
import { canAttack, findPath, marchMonths, nodeById, roadBetween } from "../core/paths.js";
import { foodDays, minGarrison, rankName, troopLimit } from "../core/rank.js";
import { canSee, forecast, relOf } from "../core/state.js";
import { U, fmt, man, monthsBetween } from "../core/util.js";
import { 守りの割り付け, 割り付けの兵, 門の重み } from "../core/garrison.js";
import { 元服の齢, 姫の役, 姫の枠, 姫の齢, 婚姻できるか, 婚姻の要る信用, 嫁がせられるか, 婚儀の礼, 使者の礼, 使える姫 } from "../core/hime.js";
import { ARMS, ROAD_SPEED } from "../data/roads.js";
import { reinforceOffers, 運び賃 } from "../govern/war.js";
import { canRecruit } from "../core/house.js";
import { underMyBanner } from "../core/state.js";
import { atPeace } from "../core/state.js";
import { 忠誠 } from "../core/rank.js";
import { 兵科の割り, 蓄えに合わせる , 組の鍵, 長の名, 長の階, 階の段, 組頭の帳 } from "../core/roster.js";
import { clamp } from "../core/util.js";
import { 既定の兵科 } from "../data/arms.js";
import { 主家 } from "../core/state.js";
import { is架空 } from "../core/house.js";
import { isCoastal, navalPower } from "../core/naval.js";
import { findPathVia, marchMonthsOf } from "../core/paths.js";


export function SortieDialog({ g, from, onClose, onGo }) {
  const c = g.castles.find((x) => x.id === from);
  const gens = g.generals.filter((x) => x.at === c.id && x.faction === c.faction && !x.captive);
  const tooLow = [];
  const [picked, setPicked] = useState(gens.slice(0, 2).map((x) => x.id));

  /* 兵を出せる先を、先に一つの表として作る。
     かつては初期の目標を「最も近い敵城」から別に選んでいた。その城がこの表に
     入っていないと、画面には表の先頭（多くは味方の城）が映るのに、実際の目標は
     別の城のまま、ということが起きる。味方の城を選んだつもりが選べていない、
     というのはこれである。表と目標は、必ず同じところから取る。 */
  const 行き先 = useMemo(() => {
    return g.castles
      // 兵を出せる先は、自家の城、臣従の家の城（援軍）、そして攻められる敵城。
      /* 領地安堵（GDD 12.2）。臣従した家の城から兵を出すとき、味方の城として
         行けるのはその家自身の城だけである。旗の下に入れても、その家の者を
         自家の城へ引き上げることはできない。所領はその家のものであり、
         人もその所領に留まる――これが臣従と、家臣であることの違いである。
         （敵城へ攻め入るのは差し支えない。軍事の差配は主のものである） */
      .filter((x) => x.id !== from
        && (underMyBanner(g, c.faction, x.faction) || canAttack(g, x.id)))
      .filter((x) => c.faction === g.player || x.faction === c.faction
        || !underMyBanner(g, g.player, x.faction))
      /* 隣り合う城か、味方の城を伝って辿れる先にしか兵は出せぬ。
         遠国へ攻め入るには、まずその手前を切り取らねばならない。

         かつては「いちばん安い道を探してから、その途中が通れるかを問う」と
         していた。順が逆である。安い道が通れなくとも、通れる道が別にあれば
         兵は出せる。実際、吉田郡山城から月山富田城へは難所で直に結ばれて
         いるのに、安い迂回路（尼子の城を二つ通る）を見て弾いていた。
         はじめから、通れる所だけを通って道を探す。 */
      .map((x) => {
        const 通れる = (id) => {
          const mid = g.castles.find((y) => y.id === id);
          if (!mid) return true;                     // 城でない中継（湊・宿）は通れる
          if (mid.faction === c.faction) return true;
          const st = relOf(g, c.faction, mid.faction).state;
          return st === "同盟" || st === "従属" || st === "臣従";
        };
        const 道 = underMyBanner(g, c.faction, x.faction)
          ? findPath(from, x.id)                     // 旗の下の城へは、どこを通っても寄せられる
          : findPathVia(from, x.id, 通れる);
        return { x, m: 道 ? (marchMonthsOf(道) || 99) : 99, 道 };
      })
      .filter(({ x, m, 道 }) => {
        if (!道) return false;
        /* 直に街道で結ばれた城へは、月数を問わず兵を出せる。

           六か月の締めは「遠国へいきなり攻め入るな」という決まりであって、
           隣の城へ出せぬようにするためのものではない。
           吉田郡山城から月山富田城へは難所で直に結ばれているが、
           難所は足が〇.一八にしかならぬので十一か月と出る。それでも隣は隣である。
           尼子と毛利が長らく境を争ったのは、まさにこの峠であった。 */
        if (roadBetween(from, x.id)) return true;
        if (m > 6) return false;
        return true;
      })
      // 攻められている自城を先に並べる。救わねばならぬ城が埋もれては困る。
      .map(({ x, m }) => ({ x, m,
        味方: underMyBanner(g, c.faction, x.faction),
        臣従: x.faction !== c.faction && underMyBanner(g, c.faction, x.faction),
        peril: underMyBanner(g, c.faction, x.faction)
          && (g.sieges.some((sg) => sg.castleId === x.id)
            || g.armies.some((a) => a.target === x.id && a.faction !== x.faction)) }))
      .sort((a, b) => (b.peril ? 1 : 0) - (a.peril ? 1 : 0) || a.m - b.m);
  }, [g, from, c.faction]);

  const [to, setTo] = useState(() => {
    // 危うい味方の城があればそこを、なければ最も近い敵城を、それもなければ表の先頭を。
    const 急 = 行き先.find((o) => o.peril);
    if (急) return 急.x.id;
    const 敵 = 行き先.find((o) => !o.味方);
    return (敵 || 行き先[0] || { x: {} }).x.id;
  });
  // 盤が動いて目標が表から消えたら、表の先頭へ戻す（表と食い違わせない）
  useEffect(() => {
    if (!行き先.length) return;
    if (!行き先.some((o) => o.x.id === to)) setTo(行き先[0].x.id);
  }, [行き先, to]);
  const garrison = minGarrison(c);
  const retSum = picked.reduce((a, id) => { const x = gens.find((q) => q.id === id); return a + (x ? x.retinue : 0); }, 0);
  // 身分ごとに率いられる兵に限りがある（GDD 6.4）
  const cmdLimit = picked.reduce((a, id) => {
    const x = gens.find((q) => q.id === id);
    return a + (x ? troopLimit(x, g) : 0);
  }, 0);
  /* 連れ出せる地域家臣団。

     もとは「守備の最低数を必ず残す」形であった。ところが小さな城では
     在地兵より守備の最低数のほうが多い（岡豊城は在地百九十九人に対して
     六百四十人）。差し引きが負になるので、一人も連れ出せない。しかも
     城を普請して防備が上がるほど、連れ出せる兵は減っていく――内政を
     すればするほど攻められなくなる、という妙なことになっていた。

     守備の最低数は目安として示すにとどめ、縛りとしない。城を空にして
     野に出るのも一つの決断である。空にすれば城は容易に落ちるが、
     それを承知で出るかどうかを決めるのは遊ぶ側である。 */
  const availLocal = Math.max(0, Math.min(
    c.local,
    Math.max(0, cmdLimit - retSum),          // 将の器を超えては率いられぬ
  ));
  const [local, setLocal] = useState(0);
  /* 兵科の割り（GDD 8.1）。一割きざみで選ぶ。
     槍と弓は村々の百姓が自前で携えて出るが、騎馬には馬が、鉄砲には鉄砲が要る。
     城の蓄えを超えては立てられぬので、足りぬぶんは槍が埋める。 */
  const [mix, setMix] = useState({ ...既定の兵科 });
  const 割を動かす = (k, d) => setMix((m) => {
    const v = clamp((m[k] || 0) + d, 0, 100);
    const 他 = ARMS.map((a) => a.key).filter((x) => x !== k);
    const 残 = 100 - v;
    const 今の他 = 他.reduce((a, x) => a + (m[x] || 0), 0);
    const n = { ...m, [k]: v };
    // 残りは、いまの割りに応じて他の兵科へ振り分ける（合計は必ず十割）
    let 配 = 残;
    他.forEach((x, i) => {
      const q = i === 他.length - 1 ? 配
        : Math.round(今の他 > 0 ? 残 * ((m[x] || 0) / 今の他) / 10 : 残 / 他.length / 10) * 10;
      n[x] = Math.max(0, Math.min(配, q)); 配 -= n[x];
    });
    return n;
  });
  /* 寄騎の求め。城ごとに { 将, 兵 } を控える。
     指図の通る城（自家・臣従）では、誰を何人で出すかをこちらが決められる。
     同盟・従属へは頼むだけなので、相手の言い値をそのまま受ける。 */
  const [aid, setAid] = useState({});
  useEffect(() => { setLocal(Math.round(availLocal * 0.6)); }, [picked.length]); // eslint-disable-line
  const offers = to ? reinforceOffers(g, from, to) : [];
  // 目標を変えると呼べる先も変わる。前の目標の選びを引きずらせない。
  useEffect(() => { setAid({}); }, [to]);
  const aidIds = Object.keys(aid);
  /* その城から出せる兵の上限。
     選んだ将が自ら率いる直属を差し引き、城に残さねばならぬ守備も残す。
     将の器（率いられる上限）も超えられぬ。援軍の画面と同じ理屈で数える。 */
  const 出せる上限 = (o, 将ら) => {
    const 直属 = 将ら.reduce((a, x) => a + x.retinue, 0);
    const 器 = 将ら.reduce((a, x) => a + x.limit, 0);
    return Math.max(0, Math.min(o.local, o.avail - 直属, Math.max(0, 器 - 直属)));
  };
  const 選ばれた将 = (o) => {
    const v = aid[o.castleId];
    return v ? o.gens.filter((x) => (v.genIds || []).includes(x.id)) : [];
  };
  const 寄騎の総勢 = (o) => {
    const 将ら = 選ばれた将(o);
    if (!将ら.length) return 0;
    const v = aid[o.castleId];
    return 将ら.reduce((a, x) => a + x.retinue, 0) + Math.min(v.men, 出せる上限(o, 将ら));
  };
  const useLocal = Math.min(local, availLocal);
  const men = retSum + useLocal;
  const food = Math.round(men * 0.6);
  /* 遠国から呼べば運び賃がかさむ（GDD 7.3）。
     人足と馬と船を雇う費えであり、蔵の米ではなく主家の金蔵から出る。
     一城ごとには些少でも、全国から呼べば束になって効いてくる。 */
  const 賃 = (o) => 運び賃(o.指図 ? 寄騎の総勢(o) : o.men, o.months);
  const 運び賃の総額 = offers.filter((o) => aid[o.castleId]).reduce((a, o) => a + 賃(o), 0);
  const 手元金 = g.factions[g.player].gold;
  const 賃が足りぬ = 運び賃の総額 > 手元金;
  const path = findPath(from, to);
  const dist = path ? path.slice(1).reduce((a, n, i) => { const r = roadBetween(path[i], n); return a + (r ? r[2] / ROAD_SPEED[r[3]] : 10); }, 0) : 0;
  /* 約束を交わした相手の城を狙っていないか。
     進発を押したあとにも問いを出すが、押す前からここに出しておく。
     押してはじめて知らされるのでは、遅い。 */
  const 的 = g.castles.find((x) => x.id === to);
  const 約束 = 的 && !underMyBanner(g, c.faction, 的.faction) && atPeace(g, c.faction, 的.faction)
    ? relOf(g, c.faction, 的.faction).state : null;

  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 4 }}>出陣　{c.name}</div>
        <div style={{ fontSize: 12, color: U.dim, marginBottom: 10 }}>
          総大将は{c.name}の城主。目標は自領のいずれかの城と街道でつながる城に限る。
        </div>
        <div className="sec">目標拠点</div>
        <select className="sel" style={{ width: "100%" }} value={to} onChange={(e) => setTo(e.target.value)}>
          {行き先.map(({ x, m, peril, 味方, 臣従 }) => (
            <option key={x.id} value={x.id}>
              {`${peril ? "【急】" : 臣従 ? "［臣従］" : 味方 ? "［味方］" : "［敵］"}${x.name}（${g.factions[x.faction].name}）　約${m}か月`}
            </option>
          ))}
        </select>
        {!行き先.length && (
          <div style={{ fontSize: 12, color: "#B0483C", marginTop: 6 }}>
            兵を出せる先がない。六か月より遠い城へは、まず手前を押さえねばならぬ。
          </div>
        )}
        {(() => {
          const t2 = g.castles.find((x) => x.id === to);
          if (!t2 || !underMyBanner(g, c.faction, t2.faction)) return null;
          const sieged = g.sieges.some((sg) => sg.castleId === t2.id);
          const coming = g.armies.filter((a) => a.target === t2.id && a.faction !== c.faction);
          if (!sieged && !coming.length) return null;
          return (
            <div style={{ fontSize: 12.5, color: "#B0483C", marginTop: 6, lineHeight: 1.8,
              borderLeft: "3px solid #B0483C", paddingLeft: 10 }}>
              <b>{t2.name}は危うい。</b><br />
              <span style={{ color: U.dim, fontSize: 11.5 }}>
                {sieged ? "囲まれています。着けば囲みを解くための野戦になります。" : ""}
                {coming.length ? `${coming.map((a) => g.factions[a.faction].name).join("・")}の軍が向かっています。` : ""}
                <br />援軍として入れば、城の守りに加わります。
              </span>
            </div>
          );
        })()}
        <div style={{ fontSize: 12, color: U.dim, marginTop: 6 }}>
          経路：{path ? path.map((n, i) => {
            const 前 = i > 0 ? path[i - 1] : null;
            const r = 前 ? roadBetween(前, n) : null;
            return (
              <span key={n}>
                {i > 0 && (r && r[3] === "海路"
                  ? <b style={{ color: "#3C6E8C" }}> ⇒（海路）⇒ </b>
                  : " → ")}
                {nodeById(n).name}
              </span>
            );
          }) : "経路なし"}　／　所要 約{Math.max(1, Math.ceil(dist / 300))}か月
        </div>
        {(() => {
          /* 海路を渡るなら、そう告げる（GDD 10章）。

             海路は街道と同じ顔をして並んでいた。淡路から播磨へ渡るのに、
             船で渡るという実感がまるでない。渡る先で誰が海を扼しているのかも、
             出してみるまで分からなかった。
             渡る前に、こちらの船と、待ち構える水軍を並べて示す。 */
          if (!path || path.length < 2) return null;
          const 海 = [];
          for (let i = 1; i < path.length; i++) {
            const r = roadBetween(path[i - 1], path[i]);
            if (r && r[3] === "海路") 海.push([path[i - 1], path[i]]);
          }
          if (!海.length) return null;
          const 我 = navalPower(g, c.faction);
          // その航路のそばに船を出せる敵家を並べる
          const 敵 = [];
          for (const [a1, b1] of 海) {
            const A = nodeById(a1), B = nodeById(b1);
            if (!A || !B) continue;
            for (const f of Object.keys(g.factions)) {
              if (f === c.faction || 敵.some((x) => x.f === f)) continue;
              if (atPeace(g, c.faction, f)) continue;
              const np = navalPower(g, f);
              if (np.ships < 3) continue;
              const 近い = g.castles.some((x) => {
                if (x.faction !== f || !isCoastal(x)) return false;
                const dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy;
                const t = L2 ? Math.max(0, Math.min(1, ((x.x - A.x) * dx + (x.y - A.y) * dy) / L2)) : 0;
                return Math.hypot(A.x + dx * t - x.x, A.y + dy * t - x.y) < 120;
              });
              if (近い) 敵.push({ f, np });
            }
          }
          敵.sort((a1, b1) => b1.np.ships - a1.np.ships);
          const 主 = 敵[0];
          const 我score = 我.ships * (0.6 + 我.skill / 160);
          const 敵score = 主 ? 主.np.ships * (0.6 + 主.np.skill / 160) : 0;
          const 割 = 主 ? 敵score / (敵score + 我score) : 0;
          const p = 主 && 敵score >= 我score * 0.45
            ? Math.max(6, Math.min(82, Math.round((0.10 + (割 - 0.3) * 1.45) * 100))) : 0;
          return (
            <div style={{ marginTop: 8, padding: "9px 11px", background: "rgba(60,110,140,0.10)",
              borderLeft: "3px solid #3C6E8C", fontSize: 12.5, lineHeight: 1.85 }}>
              <b style={{ color: "#3C6E8C" }}>海路を{海.length}度渡ります。</b>
              　<span style={{ color: U.dim, fontSize: 11.5 }}>
                {海.map(([a1, b1]) => `${nodeById(a1).name}〜${nodeById(b1).name}`).join("／")}
              </span><br />
              <span className="num">自家の水軍　{我.ships}艘・技量{我.skill}</span><br />
              {主 ? (
                <>
                  <span className="num">
                    海を扼するは{g.factions[主.f].name}　{主.np.ships}艘・技量{主.np.skill}
                  </span><br />
                  <span style={{ color: p >= 50 ? "#B0483C" : p >= 20 ? "#C89A3A" : U.dim }}>
                    {p ? <>迎え撃たれる見込み <b>{p}%</b>。</> : "こちらが海を握っており、まず出てきません。"}
                    {p ? "海の上に退き場はありません。敗れれば兵は沈みます。" : ""}
                  </span>
                </>
              ) : (
                <span style={{ color: U.dim }}>この航路に船を出せる敵はいません。渡海は安んじます。</span>
              )}
            </div>
          );
        })()}
        {約束 && (
          <div style={{ marginTop: 8, padding: "9px 11px", background: "rgba(176,72,60,0.10)",
            borderLeft: "3px solid #B0483C", fontSize: 12.5, lineHeight: 1.85 }}>
            <b style={{ color: "#B0483C" }}>{g.factions[的.faction].name}とは{約束}の間柄です。</b><br />
            <span style={{ color: U.dim }}>
              ここへ兵を出せば後詰ではなく<b>攻撃</b>となり、{約束}は破れて敵対します。
              威信と、諸家からの信用と、家臣の忠誠を失います。
            </span>
          </div>
        )}
        {(() => {
          const t = g.castles.find((x) => x.id === to);
          if (!t || !underMyBanner(g, c.faction, t.faction)) return null;
          return <div style={{ fontSize: 12, color: "#B0483C", marginTop: 4 }}>
            {t.faction === c.faction
              ? "味方の城です。到着しても合戦は起きず、兵は城へ合流します。"
              : "臣従の家の城です。着いた兵はその城の守りに加わり、将は本国へ帰ります。"}
          </div>;
        })()}

        <div className="sec">参加武将（先頭が総大将）</div>
        {gens.map((x) => (
          <label key={x.id} style={{ display: "flex", gap: 9, alignItems: "center", padding: "5px 0", fontSize: 13 }}>
            <input type="checkbox" checked={picked.includes(x.id)}
              onChange={() => setPicked((p) => (p.includes(x.id) ? p.filter((y) => y !== x.id) : [...p, x.id]))} />
            <span className="mn" style={{ fontSize: 15 }}>{x.name}
              <span style={{ fontSize: 10.5, color: U.dim, marginLeft: 5 }}>{rankName(x, g)}</span>
            </span>
            <span className="num" style={{ color: U.dim, fontSize: 11 }}>{x.age}歳／統{x.lead} 武{x.valor} 知{x.wit}／直属{fmt(x.retinue)}</span>
          </label>
        ))}
        <div style={{ fontSize: 11, color: U.dim, marginTop: 6, lineHeight: 1.7 }}>
          率いられる兵には身分の限りがあります。
          物頭は五百人、侍大将は千六百人、家老は二千五百人、宿老は四千人まで。
          {(() => {
            const sum = picked.map((id) => gens.find((x) => x.id === id))
              .filter(Boolean).reduce((a, x) => a + troopLimit(x, g), 0);
            return <><br />選んだ将で率いられるのは <b style={{ color: U.text }}>{fmt(sum)}人</b>まで。</>;
          })()}
        </div>

        <div className="sec">地域家臣団の同行</div>
        <input type="range" min="0" max={availLocal} value={useLocal} onChange={(e) => setLocal(+e.target.value)} style={{ width: "100%" }} />
        <div className="row"><span>同行</span><span className="v">{fmt(useLocal)} / {fmt(availLocal)} 人</span></div>
        {(() => {
          const 残 = c.local - useLocal + gens.filter((x) => !picked.includes(x.id)).reduce((a, x) => a + x.retinue, 0);
          const 手薄 = 残 < garrison;
          return (<>
            <div className="row"><span>城に残る兵</span>
              <span className="v" style={手薄 ? { color: "#B0483C" } : undefined}>
                {fmt(残)} 人（守るに要る {fmt(garrison)}）</span></div>
            {手薄 && (<div style={{ fontSize: 11, color: "#B0483C", marginTop: 4, lineHeight: 1.7 }}>
              {残 <= 0 ? "城は空になる。攻められれば、そのまま落ちる。"
                : "守るに要る数を割る。攻められれば持ちこたえられない。"}
            </div>)}
          </>);
        })()}

        {/* ------------------------------------------- 兵科の割り（GDD 8.1） */}
        <div className="sec">兵科の割り</div>
        {(() => {
          const 蓄 = 蓄えに合わせる(mix, useLocal, { horse: c.horse || 0, gun: c.gun || 0 });
          const 名 = { yari: "槍", yumi: "弓", teppo: "鉄砲", kiba: "騎馬" };
          const 断 = { yari: "村々の百姓が自前で携える", yumi: "同じく自前で携える",
            teppo: `城の蓄え ${fmt(c.gun || 0)}挺`, kiba: `城の蓄え ${fmt(c.horse || 0)}頭` };
          return (
            <>
              <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 6, lineHeight: 1.7 }}>
                連れて行く{fmt(useLocal)}人を、どの兵科で立てるかを決めます。
                槍と弓はいくらでも立ちますが、<b style={{ color: U.text }}>騎馬には馬が、鉄砲には鉄砲が要ります</b>。
                足りぬぶんは槍で埋めます。
              </div>
              {ARMS.map((a) => (
                <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 12.5 }}>
                  <span style={{ width: 34 }}>{名[a.key]}</span>
                  <button className="btn sm" style={{ padding: "2px 8px" }}
                    onClick={() => 割を動かす(a.key, -10)}>−</button>
                  <span className="num" style={{ width: 44, textAlign: "center" }}>{mix[a.key] || 0}%</span>
                  <button className="btn sm" style={{ padding: "2px 8px" }}
                    onClick={() => 割を動かす(a.key, 10)}>＋</button>
                  <span className="num" style={{ width: 62, textAlign: "right",
                    color: (a.key === "kiba" && 蓄.足りぬ馬) || (a.key === "teppo" && 蓄.足りぬ鉄砲) ? "#B0483C" : U.text }}>
                    {fmt(蓄[a.key])}人
                  </span>
                  <span style={{ color: U.dim, fontSize: 11, flex: 1 }}>{断[a.key]}</span>
                </div>
              ))}
              {(蓄.足りぬ馬 > 0 || 蓄.足りぬ鉄砲 > 0) && (
                <div style={{ fontSize: 11.5, color: "#B0483C", marginTop: 4, lineHeight: 1.7 }}>
                  {蓄.足りぬ馬 > 0 ? `馬が${fmt(蓄.足りぬ馬)}頭` : ""}
                  {蓄.足りぬ馬 > 0 && 蓄.足りぬ鉄砲 > 0 ? "・" : ""}
                  {蓄.足りぬ鉄砲 > 0 ? `鉄砲が${fmt(蓄.足りぬ鉄砲)}挺` : ""}
                  足りません。そのぶんは槍で立てます（商人から買い足せます）。
                </div>
              )}
            </>
          );
        })()}

        <div className="sec">寄騎を求める（GDD 7.3）</div>
        <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 6, lineHeight: 1.6 }}>
          一方の陣に並べられるのは{MAX_CORPS}隊まで（関ヶ原の参陣数に合わせた上限）。
          本隊で{picked.length}隊を使うので、寄騎は残り{Math.max(0, MAX_CORPS - picked.length)}隊まで加われる。
          一隊が抱えられる兵は{fmt(MAX_CORPS_MEN)}人までで、あふれた分は隊として立てられない。
        </div>
        <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 6, lineHeight: 1.7 }}>
          <b style={{ color: U.text }}>自家と臣従の家</b>には下知が通り、必ず出ます。
          <b style={{ color: U.text }}>同盟・従属の家</b>へは頼むだけで、応じるか否かは相手が決めます。
          <br />呼べる先は<b style={{ color: U.text }}>遠近を問いません</b>。関ヶ原も大坂の陣も全国から兵が集まりました。
          縛りは<b style={{ color: U.text }}>蔵の兵糧</b>と<b style={{ color: U.text }}>運び賃</b>です。
          軍は月に一人〇.〇九石を食い、行程のぶんに陣中の二月を足して持って出ます。
          運び賃は人足と馬を雇う費えで、一人・一月につき〇.〇二貫を金蔵から払います。
          遠国から大軍を呼ぶには、それだけの身代が要ります。
        </div>
        {offers.length === 0 && <div style={{ fontSize: 12, color: U.dim }}>援軍を求められる相手がいない。</div>}
        {offers.map((o) => {
          const 選 = aid[o.castleId];
          const 将ら = 選ばれた将(o);
          const 上限 = 出せる上限(o, 将ら);
          const 兵 = 選 ? Math.min(選.men, 上限) : 0;
          const 総勢 = 寄騎の総勢(o);
          const 使えぬ = !!o.reason || (o.指図 && !o.gens.length);
          const 隊数 = aidIds.reduce((a, id) => {
            const v = aid[id];
            const oo = offers.find((x) => x.castleId === id);
            return a + (oo && oo.指図 ? (v.genIds || []).length : 1);
          }, 0);
          const 満杯 = !選 && picked.length + 隊数 >= MAX_CORPS;
          return (
            <div key={o.castleId} className="aidrow" style={{ padding: "5px 0", borderBottom: `1px solid ${U.line2}` }}>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
                <input type="checkbox" disabled={使えぬ || 満杯} checked={!!選}
                  onChange={() => setAid((p2) => {
                    if (p2[o.castleId]) { const n = { ...p2 }; delete n[o.castleId]; return n; }
                    // 既定は「いちばん統率の高い将ひとり」と「出せる上限の六割」。そこから加減する。
                    const g0 = o.gens.length ? [...o.gens].sort((a, z) => z.lead - a.lead)[0] : null;
                    return { ...p2, [o.castleId]: { genIds: g0 ? [g0.id] : [],
                      men: Math.round(出せる上限(o, g0 ? [g0] : []) * 0.6) } };
                  })} />
                <span>
                  <span className="mn" style={{ fontSize: 14 }}>{o.name}</span>
                  <span className="pill" style={{ background: g.factions[o.faction].color, marginLeft: 6 }}>{o.kind}</span>
                  <span style={{ color: U.dim, marginLeft: 6 }}>
                    {o.reason ? o.reason
                      : (o.指図
                        ? `将と兵を選べる／到着まで約${o.months}か月／出せる兵 ${fmt(o.men)}人`
                          + `／兵糧 一人${o.一人の兵糧}石（蔵 ${fmt(Math.round(o.蔵))}石）`
                          + `／運び賃 一人${o.一人の運び賃}貫`
                        : `約${fmt(o.men)}人／到着まで約${o.months}か月／応じる見込み${Math.round(o.chance * 100)}%`
                          + `／兵糧 一人${o.一人の兵糧}石／運び賃 ${fmt(o.賃)}貫`)}
                  </span>
                </span>
              </label>
              {/* 下知の通る城（自家・臣従）だけ、誰を何人で出すかを決められる（GDD 7.3）。
                  同盟・従属へは頼むだけで、誰を何人出すかは相手の大名が決める。 */}
              {選 && o.指図 && (
                <div style={{ margin: "4px 0 2px 24px" }}>
                  {o.gens.map((x) => (
                    <label key={x.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", fontSize: 12.5 }}>
                      <input type="checkbox" checked={(選.genIds || []).includes(x.id)}
                        onChange={() => setAid((p2) => {
                          const now = p2[o.castleId].genIds || [];
                          const next = now.includes(x.id) ? now.filter((y) => y !== x.id) : [...now, x.id];
                          const 将2 = o.gens.filter((q) => next.includes(q.id));
                          return { ...p2, [o.castleId]: { genIds: next,
                            men: Math.min(p2[o.castleId].men, 出せる上限(o, 将2)) } };
                        })} />
                      <span className="mn" style={{ fontSize: 14 }}>{x.name}</span>
                      <span style={{ fontSize: 10.5, color: U.dim }}>{x.rank}</span>
                      <span className="num" style={{ color: U.dim, fontSize: 11 }}>
                        {x.age}歳／統{x.lead} 武{x.valor}／直属{fmt(x.retinue)}／率いられる上限{fmt(x.limit)}
                      </span>
                    </label>
                  ))}
                  {!将ら.length && <div style={{ fontSize: 11.5, color: "#B0483C" }}>将を一人は選ばねば出せない。</div>}
                  <input type="range" min="0" max={Math.max(0, 上限)} value={兵} style={{ width: "100%" }}
                    onChange={(e) => setAid((p2) => ({ ...p2, [o.castleId]: { ...p2[o.castleId], men: +e.target.value } }))} />
                  <div className="row" style={{ fontSize: 11.5 }}>
                    <span>連れて行く地域家臣団</span>
                    <span className="v">{fmt(兵)} / {fmt(上限)} 人</span>
                  </div>
                  <div className="row" style={{ fontSize: 11.5 }}>
                    <span>この寄騎の総勢</span>
                    <span className="v">{fmt(総勢)} 人{総勢 < 100 ? "（少なすぎて出せぬ）" : ""}</span>
                  </div>
                  <div className="row" style={{ fontSize: 11.5, color: U.dim }}>
                    <span>{o.name}に残る兵</span>
                    <span className="v">{fmt(o.local - 兵)} 人（守備の最低 {fmt(o.garrison)}）</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="sec">兵科内訳（50人組に分割）</div>
        <div className="g2">
          {ARMS.map((a) => (
            <div className="row" key={a.key}><span>{a.label}</span><span className="v">{fmt(men * a.ratio)}人／{Math.ceil((men * a.ratio) / 50)}組</span></div>
          ))}
        </div>
        <div className="row"><span>携行兵糧</span><span className="v">{fmt(food)} 石（城残 {fmt(c.food - food)}）</span></div>
        {aidIds.length > 0 && (
          <div className="row" style={{ color: 賃が足りぬ ? "#B0483C" : undefined }}>
            <span>寄騎の運び賃</span>
            <span className="v">{fmt(運び賃の総額)} 貫（手元 {fmt(手元金)} 貫）</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>取りやめ</button>
          <button className="btn dark" style={{ flex: 2 }} disabled={!to || !path || !picked.length || men < 200 || c.food < food || 賃が足りぬ}
            onClick={() => onGo({ from, to, gens: picked, local: useLocal, food, mix,
              // 指図の通る城は、選んだ将と兵数を添える。頼むだけの城は相手の言い値のまま。
              reinforce: offers.filter((o) => aid[o.castleId]).map((o) => (o.指図
                ? { ...o, genIds: aid[o.castleId].genIds || [],
                    men: Math.min(aid[o.castleId].men, 出せる上限(o, 選ばれた将(o))) }
                : o)) })}>{約束 ? `約束を破って${fmt(men)}人で進発` : `${fmt(men)}人で進発`}</button>
        </div>
        {c.food < food && <div style={{ color: "#B0483C", fontSize: 12, marginTop: 7 }}>兵糧が足りない。収穫を待つか、開墾を進める必要がある。</div>}
        {賃が足りぬ && <div style={{ color: "#B0483C", fontSize: 12, marginTop: 7 }}>運び賃が足りない。遠国の寄騎を減らすか、金を蓄えねばならぬ。</div>}
      </div>
    </div>
  );
}


/* ------------------------------------------------ 城方の討って出（GDD 9.2）

   後詰が囲みの外に着いた。城方が門を開いて背後を衝けば、寄せ手は内と外から
   挟まれる。ただし城を空にしてはならぬ。守備の最低数は必ず残す。 */
export function SallyDialog({ g, castleId, foeId, onClose, onGo, 城下 }) {
  const c = g.castles.find((x) => x.id === castleId);
  const foe = g.armies.find((x) => x.id === foeId);
  const gens = g.generals.filter((x) => x.at === castleId && x.faction === c.faction && !x.captive);
  const [picked, setPicked] = useState(gens.slice(0, 2).map((x) => x.id));
  const 守り = minGarrison(c);
  const retSum = picked.reduce((a, id) => { const x = gens.find((q) => q.id === id); return a + (x ? x.retinue : 0); }, 0);
  const 限り = picked.reduce((a, id) => { const x = gens.find((q) => q.id === id); return a + (x ? troopLimit(x, g) : 0); }, 0);
  // 守備の最低数は目安である。城を空にして討って出ることもできる。
  const 出せる = Math.max(0, Math.min(c.local, Math.max(0, 限り - retSum)));
  const [local, setLocal] = useState(0);
  useEffect(() => { setLocal(Math.round(出せる * 0.7)); }, [picked.length]); // eslint-disable-line
  const 出す = Math.min(local, 出せる);
  const 兵 = retSum + 出す;

  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 4 }}>{c.name}　討って出るか</div>
        <div style={{ fontSize: 12.5, color: U.dim, marginBottom: 10, lineHeight: 1.8 }}>
          {城下
            ? <>敵の軍が城下に着き、同じ月に味方の援軍も着きました。
              <b style={{ color: U.text }}>いま門を開けば、援軍とともに城下で迎え撃てます。</b><br />
              城に籠もったままでも構いませぬ。その場合、援軍だけで敵に当たります。</>
            : <>後詰が囲みの外に着きました。
              <b style={{ color: U.text }}>いま門を開けば、寄せ手を内と外から挟めます。</b><br />
              城に籠もったままでも構いませぬ。その場合、後詰だけで囲みを衝きます。</>}
        </div>
        <div className="row"><span>寄せ手（{g.factions[foe ? foe.faction : c.faction].name}）</span>
          <span className="v">{fmt(foe ? foe.men : 0)} 人</span></div>
        <div className="row"><span>城の兵</span><span className="v">{fmt(c.local + gens.reduce((a, x) => a + x.retinue, 0))} 人</span></div>

        <div className="sec">討って出る武将</div>
        {gens.length === 0 && <div style={{ fontSize: 12, color: U.dim }}>城に将がいない。</div>}
        {gens.map((x) => (
          <label key={x.id} style={{ display: "flex", gap: 9, alignItems: "center", padding: "5px 0", fontSize: 13 }}>
            <input type="checkbox" checked={picked.includes(x.id)}
              onChange={() => setPicked((p) => (p.includes(x.id) ? p.filter((y) => y !== x.id) : [...p, x.id]))} />
            <span className="mn" style={{ fontSize: 15 }}>{x.name}
              <span style={{ fontSize: 10.5, color: U.dim, marginLeft: 5 }}>{rankName(x, g)}</span>
            </span>
            <span className="num" style={{ color: U.dim, fontSize: 11 }}>{x.age}歳／統{x.lead} 武{x.valor}／直属{fmt(x.retinue)}</span>
          </label>
        ))}

        <div className="sec">連れて出る地域家臣団</div>
        <input type="range" min="0" max={出せる} value={出す} onChange={(e) => setLocal(+e.target.value)} style={{ width: "100%" }} />
        <div className="row"><span>連れて出る</span><span className="v">{fmt(出す)} / {fmt(出せる)} 人</span></div>
        {(() => {
          const 残 = c.local - 出す + gens.filter((x) => !picked.includes(x.id)).reduce((a, x) => a + x.retinue, 0);
          const 手薄 = 残 < 守り;
          return (<>
            <div className="row"><span>城に残る兵</span>
              <span className="v" style={手薄 ? { color: "#B0483C" } : undefined}>
                {fmt(残)} 人（守るに要る {fmt(守り)}）</span></div>
            <div style={{ fontSize: 11, color: 手薄 ? "#B0483C" : U.dim, marginTop: 6, lineHeight: 1.7 }}>
              {手薄 ? "守るに要る数を割る。討って出て敗れれば、城はそのまま落ちる。"
                : "門を開いて出た兵は、戦の後に城へ戻ります。"}
            </div>
          </>);
        })()}

        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>籠もったまま</button>
          <button className="btn dark" style={{ flex: 2 }} disabled={!picked.length || 兵 < 100}
            onClick={() => onGo({ gens: picked, local: 出す })}>{fmt(兵)}人で討って出る</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------ 城門の割り付け（GDD 9.3）

   城攻めが始まる前に、どの門に誰を置き、兵をどう分けるかを決める。
   武将のいない門は「◯◯城守備隊」が守る。守備隊の器量は、その城を預かる者の
   統率だけを映す（武勇と知略は最低限）。

   遊ぶ側が城方のときだけ開く。采配（敵方）は同じ案を自動で用いる。 */
export function GateDeployDialog({ g, castle, gates, 寄せ手, onClose, onGo }) {
  const 将 = useMemo(() => g.generals
    .filter((x) => x.at === castle.id && x.faction === castle.faction && !x.captive)
    .sort((a, b) => (b.lead * 1.4 + b.valor) - (a.lead * 1.4 + a.valor)), [g, castle]);
  const 順 = useMemo(() => [...gates].sort((a, b) => a.layer - b.layer || 門の重み(b) - 門の重み(a)), [gates]);
  const [割, set割] = useState(() => 守りの割り付け(g, castle, gates));
  const 兵 = Math.max(0, Math.round(castle.local));
  const 使 = 割り付けの兵(割);
  const 余 = 兵 - 使;
  const 統 = 割.統;

  const 置く = (key, genId) => set割((p) => {
    const n = { ...p, 門: { ...p.門 } };
    // 同じ将を二つの門には置けない。先に置いていた門は空ける。
    for (const k in n.門) if (genId && n.門[k].genId === genId) n.門[k] = { ...n.門[k], genId: null };
    n.門[key] = { ...n.門[key], genId: genId || null };
    return n;
  });
  const 兵を = (key, v) => set割((p) => ({ ...p, 門: { ...p.門, [key]: { ...p.門[key], men: Math.max(0, v) } } }));

  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 4 }}>{castle.name}　城門の割り付け</div>
        <div style={{ fontSize: 12.5, color: U.dim, marginBottom: 10, lineHeight: 1.8 }}>
          寄せ手 <b style={{ color: U.text }}>{fmt(寄せ手 ? 寄せ手.men : 0)}人</b>が城下に迫っています。
          どの門に誰を置くかを決めてください。<br />
          武将のいない門は<b style={{ color: U.text }}>{castle.name}守備隊</b>が守ります
          （統率{統}・武勇と知略は最低限。門を支えて射かけるだけで、討って出ません）。
        </div>
        <div className="row"><span>城の兵</span>
          <span className="v">{fmt(使)} / {fmt(兵)} 人
            <span style={{ color: 余 < 0 ? "#B0483C" : U.dim, marginLeft: 8 }}>
              {余 < 0 ? `${fmt(-余)}人 多い` : `残り ${fmt(余)}人`}
            </span>
          </span>
        </div>

        <div className="sec">門ごとの備え</div>
        {順.map((gt) => {
          const 決 = 割.門[gt.key] || { genId: null, men: 0 };
          const gen = 決.genId ? 将.find((x) => x.id === 決.genId) : null;
          return (
            <div key={gt.key} style={{ padding: "7px 0", borderBottom: `1px solid ${U.line2}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="mn" style={{ fontSize: 14, flex: "0 0 34%" }}>{gt.key}
                  <span style={{ fontSize: 10.5, color: U.dim, marginLeft: 5 }}>
                    {gt.layer === 0 ? "外の輪" : `${gt.layer}つ内`}
                  </span>
                </span>
                <select className="sel" style={{ flex: 1 }} value={決.genId || ""}
                  onChange={(e) => 置く(gt.key, e.target.value)}>
                  <option value="">（守備隊にまかせる）</option>
                  {将.map((x) => (
                    <option key={x.id} value={x.id}>{x.name}（統{x.lead} 武{x.valor}）</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                <input type="range" min="0" max={兵} step="10" value={Math.min(決.men, 兵)}
                  onChange={(e) => 兵を(gt.key, +e.target.value)} style={{ flex: 1 }} />
                <span className="num" style={{ fontSize: 12, width: 96, textAlign: "right" }}>
                  {fmt(決.men)}人{gen ? `＋直属${fmt(gen.retinue)}` : ""}
                </span>
              </div>
            </div>
          );
        })}

        {将.length > 順.length && (
          <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.8, marginTop: 8 }}>
            門に置ききれない将は本丸に控えます（{将.filter((x) => !Object.values(割.門).some((d) => d.genId === x.id))
              .map((x) => x.name).join("・") || "なし"}）。
          </div>
        )}

        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          <button className="btn" style={{ flex: 1 }}
            onClick={() => set割(守りの割り付け(g, castle, gates))}>任せる（案に戻す）</button>
          <button className="btn dark" style={{ flex: 2 }} disabled={余 < 0}
            onClick={() => onGo(割)}>この備えで迎え撃つ</button>
        </div>
        <button className="btn sm" style={{ width: "100%", marginTop: 7 }} onClick={onClose}>
          すべて任せる
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------ 援軍（GDD 7.3 / 7.4）

   二つの場面で同じ画面を使う。
     ・攻められた自城へ援軍を呼ぶ
     ・出陣に寄騎を加える

   指図が通るのは自家と臣従の家だけである。そこでは、どの城から、どの武将が、
   何人の兵で来るかをこちらが決める。
   同盟・従属の家へは頼むことしかできぬ。出るか出ぬかは相手が決める。 */
export function ReinforceDialog({ g, target, title, note, onClose, onGo }) {
  const 的 = g.castles.find((x) => x.id === target) || nodeById(target) || {};
  const offers = useMemo(() => reinforceOffers(g, target, target), [g, target]);
  const 指図組 = offers.filter((o) => o.指図);
  const 頼む組 = offers.filter((o) => !o.指図);

  // 指図の通る城ごとの選び（将と兵）
  const [選び, set選び] = useState(() => {
    const m = {};
    for (const o of 指図組) m[o.castleId] = { on: false, gens: o.gens.slice(0, 1).map((x) => x.id), local: 0 };
    return m;
  });
  const [頼み, set頼み] = useState([]);

  const 城の値 = (o) => 選び[o.castleId] || { on: false, gens: [], local: 0 };
  const 直す = (id, p) => set選び((m) => ({ ...m, [id]: { ...(m[id] || { on: false, gens: [], local: 0 }), ...p } }));
  // その城から出せる兵。守備の最低数は残し、将の器も超えられぬ。
  const 出せる = (o) => {
    const v = 城の値(o);
    const ret = o.gens.filter((x) => v.gens.includes(x.id)).reduce((a, x) => a + x.retinue, 0);
    const 器 = o.gens.filter((x) => v.gens.includes(x.id)).reduce((a, x) => a + x.limit, 0);
    return Math.max(0, Math.min(o.local, o.avail - ret, Math.max(0, 器 - ret)));
  };
  const 兵数 = (o) => {
    const v = 城の値(o);
    const ret = o.gens.filter((x) => v.gens.includes(x.id)).reduce((a, x) => a + x.retinue, 0);
    return ret + Math.min(v.local, 出せる(o));
  };
  const 総勢 = 指図組.filter((o) => 城の値(o).on).reduce((a, o) => a + 兵数(o), 0);
  /* 遠国から呼ぶには運び賃が要る。出陣の画面と同じ勘定である。
     頼む相手（同盟・従属）の分も、道中の費えはこちらが持つ。 */
  const 運び賃の総額 = 指図組.filter((o) => 城の値(o).on).reduce((a, o) => a + 運び賃(兵数(o), o.months), 0)
    + 頼む組.filter((o) => 頼み.includes(o.castleId)).reduce((a, o) => a + (o.賃 || 0), 0);
  const 手元金 = g.factions[g.player].gold;
  const 賃が足りぬ = 運び賃の総額 > 手元金;
  const 隊数 = 指図組.filter((o) => 城の値(o).on).reduce((a, o) => a + 城の値(o).gens.length, 0) + 頼み.length;

  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 4 }}>{title || `援軍を呼ぶ　${的.name || ""}`}</div>
        {note && <div style={{ fontSize: 12.5, color: U.dim, marginBottom: 10, lineHeight: 1.8 }}>{note}</div>}

        <div className="sec">下知の通る城（自家・臣従）</div>
        {指図組.length === 0 && <div style={{ fontSize: 12, color: U.dim }}>下知の通る城がない。</div>}
        {指図組.map((o) => {
          const v = 城の値(o);
          const 上限 = 出せる(o);
          return (
            <div key={o.castleId} style={{ borderLeft: `3px solid ${v.on ? U.text : U.line}`, paddingLeft: 10, margin: "8px 0" }}>
              <label style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 13 }}>
                <input type="checkbox" checked={v.on} onChange={() => 直す(o.castleId, { on: !v.on })} />
                <span className="mn" style={{ fontSize: 15 }}>{o.name}</span>
                <span className="pill" style={{ background: g.factions[o.faction].color }}>{o.kind}</span>
                <span style={{ color: U.dim, fontSize: 11.5 }}>到着まで約{o.months}か月／出せる兵 {fmt(o.avail)}人</span>
              </label>
              {v.on && (
                <div style={{ marginTop: 6 }}>
                  {o.gens.length === 0 && <div style={{ fontSize: 12, color: "#B0483C" }}>この城に将がいない。</div>}
                  {o.gens.map((x) => (
                    <label key={x.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", fontSize: 12.5 }}>
                      <input type="checkbox" checked={v.gens.includes(x.id)}
                        onChange={() => 直す(o.castleId, { gens: v.gens.includes(x.id)
                          ? v.gens.filter((y) => y !== x.id) : [...v.gens, x.id] })} />
                      <span className="mn" style={{ fontSize: 14 }}>{x.name}</span>
                      <span style={{ fontSize: 10.5, color: U.dim }}>{x.rank}</span>
                      <span className="num" style={{ color: U.dim, fontSize: 11 }}>{x.age}歳／統{x.lead} 武{x.valor}／直属{fmt(x.retinue)}</span>
                    </label>
                  ))}
                  <input type="range" min="0" max={上限} value={Math.min(v.local, 上限)}
                    onChange={(e) => 直す(o.castleId, { local: +e.target.value })} style={{ width: "100%" }} />
                  <div className="row"><span>連れて行く地域家臣団</span>
                    <span className="v">{fmt(Math.min(v.local, 上限))} / {fmt(上限)} 人</span></div>
                  <div className="row"><span>この城から</span><span className="v">{fmt(兵数(o))} 人</span></div>
                  <div style={{ fontSize: 11, color: U.dim }}>守備の最低数 {fmt(o.garrison)}人は城に残ります。</div>
                </div>
              )}
            </div>
          );
        })}

        <div className="sec">頼むだけの家（同盟・従属）</div>
        <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 6, lineHeight: 1.7 }}>
          旗の下にない家には、どの将を何人でとまでは指図できませぬ。
          応じるか否か、どれだけ出すかは相手が決めます。
        </div>
        {頼む組.length === 0 && <div style={{ fontSize: 12, color: U.dim }}>頼める相手がいない。</div>}
        {頼む組.map((o) => (
          <label key={o.castleId} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0", fontSize: 12.5 }}>
            <input type="checkbox" disabled={!!o.reason} checked={頼み.includes(o.castleId)}
              onChange={() => set頼み((p) => (p.includes(o.castleId) ? p.filter((y) => y !== o.castleId) : [...p, o.castleId]))} />
            <span>
              <span className="mn" style={{ fontSize: 14 }}>{o.name}</span>
              <span className="pill" style={{ background: g.factions[o.faction].color, marginLeft: 6 }}>{o.kind}</span>
              <span style={{ color: U.dim, marginLeft: 6 }}>
                {o.reason ? o.reason
                  : `約${fmt(o.men)}人／約${o.months}か月／応じる見込み${Math.round(o.chance * 100)}%／運び賃 ${fmt(o.賃)}貫`}
              </span>
            </span>
          </label>
        ))}

        <div className="row" style={{ marginTop: 10 }}><span>差し向ける総勢（下知の分）</span>
          <span className="v">{fmt(総勢)} 人／{隊数}隊</span></div>
        <div className="row" style={{ color: 賃が足りぬ ? "#B0483C" : undefined }}><span>運び賃</span>
          <span className="v">{fmt(運び賃の総額)} 貫（手元 {fmt(手元金)} 貫）</span></div>
        {賃が足りぬ && (
          <div style={{ fontSize: 12, color: "#B0483C" }}>運び賃が足りぬ。遠国の城を減らすほかない。</div>
        )}
        {隊数 > MAX_CORPS && (
          <div style={{ fontSize: 12, color: "#B0483C" }}>一方の陣に並べられるのは{MAX_CORPS}隊まで。</div>
        )}

        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>やめる</button>
          <button className="btn dark" style={{ flex: 2 }} disabled={(総勢 < 100 && !頼み.length) || 賃が足りぬ}
            onClick={() => onGo({
              下知: 指図組.filter((o) => 城の値(o).on && 兵数(o) >= 100).map((o) => ({
                castleId: o.castleId, gens: 城の値(o).gens, local: Math.min(城の値(o).local, 出せる(o)),
              })),
              頼み: 頼む組.filter((o) => 頼み.includes(o.castleId)),
            })}>
            {総勢 > 0 ? `${fmt(総勢)}人を差し向ける` : "使者を送る"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* 窓の外を押したら閉じる（GDD 13.1）。

   一覧の窓を開くと、いちばん下の「閉じる」まで巻き下ろさねば閉じられなかった。
   長い一覧では、開いて中を見て、また下まで戻る、という手数が要る。
   外の暗がりを押せば閉じるようにする。

   押し始めと押し終わりの両方が外でなければ閉じない。窓の中から外へ指を滑らせて
   離したときに閉じてしまうと、なぞって読んでいるだけで窓が消える。

   確かめを要する問い（出陣・捕虜の処遇・身代金・約束を破る・援軍の要請）には
   付けない。外を押して流れてしまっては、決めたはずのことが決まらない。 */
export const 外を押して閉じる = (onClose) => ({
  onMouseDown: (e) => {
    e.stopPropagation();
    if (e.target === e.currentTarget) e.currentTarget.dataset.soto = "1";
    else delete e.currentTarget.dataset.soto;
  },
  onMouseUp: (e) => {
    e.stopPropagation();
    const 外で始めた = e.currentTarget.dataset.soto === "1";
    delete e.currentTarget.dataset.soto;
    if (外で始めた && e.target === e.currentTarget && onClose) onClose();
  },
});

export function MonthReport({ g, onClose, onAid }) {
  const mine = g.castles.filter((c) => c.faction === g.player);
  return (
    <div className="modal" {...外を押して閉じる(onClose)}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 4 }}>{g.year}年{g.month}月　月初報告</div>
        {(() => {
          const fc = forecast(g, g.player);
          const warn = fc.months != null && fc.months <= 6;
          return (
            <>
              <div className="sec">来月の見通し</div>
              <div className="row"><span>金銭</span>
                <span className="v num">
                  {fmt(fc.gold)}貫　
                  <span style={{ color: fc.netGold >= 0 ? "#3E7A3A" : "#B0483C" }}>
                    {fc.netGold >= 0 ? "＋" : "−"}{fmt(Math.abs(fc.netGold))}
                  </span>
                  <span style={{ color: U.dim, fontSize: 11 }}>（入{fmt(fc.inGold)}／出{fmt(fc.outGold)}）</span>
                </span></div>
              <div className="row"><span>兵糧</span>
                <span className="v num">
                  {fmt(fc.food)}石　
                  <span style={{ color: fc.netFood >= 0 ? "#3E7A3A" : "#B0483C" }}>
                    {fc.netFood >= 0 ? "＋" : "−"}{fmt(Math.abs(fc.netFood))}
                  </span>
                  <span style={{ color: U.dim, fontSize: 11 }}>（入{fmt(fc.inFood)}／出{fmt(fc.outFood)}）</span>
                </span></div>
              <div className="row"><span>抱える兵</span><span className="v num">{fmt(fc.troops)}人</span></div>
              <div style={{ fontSize: 11.5, color: warn ? "#B0483C" : U.dim, marginTop: 4, lineHeight: 1.7 }}>
                {fc.harvest ? "来月は収穫の月。兵糧が三倍入る。" : ""}
                {fc.months != null
                  ? `　このままなら兵糧は約${fc.months}か月で尽きる。`
                  : fc.netFood < 0 ? "　兵糧は当面もつ。" : "　兵糧は増えている。"}
              </div>
            </>
          );
        })()}
        <div className="sec">領内</div>
        {mine.map((c) => {
          const men = c.local + g.generals.filter((x) => x.at === c.id && x.faction === g.player).reduce((a, x) => a + x.retinue, 0);
          const days = foodDays(c.food, men);
          const pv = (g.prev || {})[c.id];
          const D = (now, before, unit) => {
            const d = before == null ? 0 : Math.round(now - before);
            return <span className="num">{fmt(now)}{unit}{d !== 0 && <span className={d < 0 ? "dn" : "up"}> {d > 0 ? "+" : ""}{fmt(d)}</span>}</span>;
          };
          return (
            <div key={c.id} style={{ padding: "6px 0", borderBottom: `1px solid ${U.line2}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span className="mn" style={{ fontSize: 15 }}>{c.name}</span>
                <span style={{ color: days < 60 ? "#B0483C" : U.dim, fontSize: 12 }}>兵糧 {days} 日分</span>
              </div>
              <div style={{ fontSize: 12, color: U.dim, display: "flex", gap: 12, flexWrap: "wrap", marginTop: 3 }}>
                <span>石高 {D(c.koku, pv && pv.koku)}</span>
                <span>人口 {D(c.pop, pv && pv.pop)}</span>
                <span>兵糧 {D(c.food, pv && pv.food)}</span>
                <span>兵力 {D(men, pv && pv.men)}</span>
                <span>練度 {D(Math.round(c.localTrain), pv && Math.round(pv.localTrain))}</span>
                <span>民忠 {D(Math.round(c.min), pv && Math.round(pv.min))}</span>
              </div>
            </div>
          );
        })}
        <div className="row" style={{ borderTop: `1px solid ${U.line2}`, marginTop: 6, paddingTop: 6 }}>
          <span>金銭</span>
          <span className="v num">{fmt(g.factions[g.player].gold)} 貫
            {g.prevGold != null && g.factions[g.player].gold - g.prevGold !== 0 && (
              <span className={g.factions[g.player].gold - g.prevGold < 0 ? "dn" : "up"}>
                {" "}{g.factions[g.player].gold - g.prevGold > 0 ? "+" : ""}{fmt(g.factions[g.player].gold - g.prevGold)}
              </span>)}
          </span>
        </div>
        <div className="sec">報せ</div>
        {(g.monthEvents || []).length === 0 && <div style={{ fontSize: 12, color: U.dim }}>特に報せはない。</div>}
        {(g.monthEvents || []).map((e, i) => <div key={i} style={{ fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${U.line2}` }}>{e}</div>)}
        {/* 危急の城には、その場で援軍を出せるようにする（GDD 9.2）。
            行軍はどれも一月はかかるので、着いてから出したのでは間に合わない。 */}
        {onAid && (g.危急 || []).length > 0 && (
          <>
            <div className="sec">援軍</div>
            {(g.危急 || []).map((k) => {
              const c = g.castles.find((x) => x.id === k.castleId);
              if (!c) return null;
              return (
                <div key={k.armyId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <span style={{ fontSize: 12.5, flex: 1, lineHeight: 1.7 }}>
                    <b className="mn" style={{ fontSize: 15 }}>{c.name}</b>
                    <span style={{ color: U.dim }}>　{(g.factions[k.家] || {}).name}の軍 {fmt(k.men)}人／約{k.月}ヶ月後</span>
                  </span>
                  <button className="btn sm" onClick={() => onAid(k.castleId)}>援軍を出す</button>
                </div>
              );
            })}
            <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.8, marginTop: 4 }}>
              敵が着く月に援軍も着けば、城下で野戦になります（城方も門を開いて加われます）。
              間に合わなければ、援軍は城の守りに加わります。
            </div>
          </>
        )}
        <button className="btn dark" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>評定を開く</button>
      </div>
    </div>
  );
}


export function Chronicle({ g, onClose }) {
  return (
    <div className="modal" {...外を押して閉じる(onClose)}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 12 }}>戦国記</div>
        {[...g.chronicle].reverse().map((c, i) => (
          <div key={i} style={{ padding: "7px 0", borderBottom: `1px solid ${U.line2}`, fontSize: 13 }}>
            <span className="num" style={{ color: U.dim, marginRight: 10 }}>{c.y}年{c.m}月</span>
            <span className="mn">{c.text}</span>
          </div>
        ))}
        <button className="btn" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}


export function FactionInfo({ g, onClose }) {
  /* 勢力一覧（GDD 12.4）。

     家の名を r.f.full で出していたが、勢力の値にそんな欄はない。
     どの行も名が空のまま並んでいた（城の欄で組み立てている別物と取り違えていた）。
     家の名と、いまの当主の名を並べる。

     また、城を一つも持たぬ家は滅んだものとして扱う。当主が捕らわれて身の振り方が
     決まらぬうちは家の記録が残るが、拠るべき城が一つも無ければ、その家はもう無い。
     生きている家に混ぜて並べては、天下の形が読めない。 */
  const 立つ = [], 絶えた = [];
  for (const f of Object.values(g.factions)) {
    const cs = g.castles.filter((c) => c.faction === f.id);
    const gs = g.generals.filter((x) => x.faction === f.id && !x.captive);
    const 当主 = g.generals.find((x) => x.faction === f.id && x.lord && !x.captive);
    const 囚 = g.generals.find((x) => x.faction === f.id && x.captive);
    const row = {
      f, koku: cs.reduce((a, c) => a + c.koku, 0),
      men: cs.reduce((a, c) => a + c.local, 0) + gs.filter((x) => x.at).reduce((a, x) => a + x.retinue, 0),
      castles: cs.length, gens: gs.length, 当主, 囚,
    };
    (cs.length ? 立つ : 絶えた).push(row);
  }
  立つ.sort((a, b) => b.koku - a.koku);
  絶えた.sort((a, b) => (a.f.name < b.f.name ? -1 : 1));
  return (
    <div className="modal" {...外を押して閉じる(onClose)}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 4 }}>勢力情報</div>
        <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 10 }}>
          城を持つ家 {立つ.length}家／滅んだ家 {絶えた.length}家
        </div>
        {立つ.map((r, i) => (
          <div key={r.f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
            borderBottom: `1px solid ${U.line2}`, flexWrap: "wrap" }}>
            <span className="num" style={{ fontSize: 11.5, color: U.dim, width: 22, textAlign: "right" }}>{i + 1}</span>
            <span className="dot" style={{ background: r.f.color }} />
            <span className="mn" style={{ fontSize: 16 }}>{r.f.name}</span>
            <span style={{ fontSize: 12.5, color: U.dim, flex: 1 }}>
              {r.当主 ? `当主 ${r.当主.name}（${r.当主.age}歳）` : "当主不在"}
            </span>
            {r.f.id === g.player && <span className="pill" style={{ background: r.f.color }}>自勢力</span>}
            <span className="num" style={{ fontSize: 12, color: U.dim, width: "100%", paddingLeft: 32 }}>
              {man(r.koku)}万石／兵{fmt(r.men)}／{r.castles}城／武将{r.gens}名／威信{Math.round(r.f.prestige || 50)}
              {r.f.id !== g.player && (() => {
                const rl = relOf(g, g.player, r.f.id);
                const 主 = 主家(g, g.player, r.f.id);
                const 向 = 主 == null ? "" : 主 === g.player ? "（こちらが上）" : "（こちらが下）";
                return `／${rl.state}${向}・信用${Math.round(rl.trust)}${rl.until ? `（残${monthsBetween(g.year, g.month, rl.until.y, rl.until.m)}か月）` : ""}`;
              })()}
            </span>
          </div>
        ))}
        {絶えた.length > 0 && (
          <>
            <div className="sec" style={{ marginTop: 14 }}>滅んだ家（{絶えた.length}家）</div>
            <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.8, marginBottom: 6 }}>
              城を一つも持たぬ家です。当主が捕らわれて身の振り方が決まらずとも、
              拠るべき城が無ければ家は立ちません。
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 2, color: U.dim }}>
              {絶えた.map((r) => (
                <span key={r.f.id} style={{ marginRight: 12, whiteSpace: "nowrap" }}>
                  <span className="dot" style={{ background: r.f.color, opacity: 0.5 }} />
                  {r.f.name}{r.囚 ? `（${r.囚.name}は捕虜）` : ""}
                </span>
              ))}
            </div>
          </>
        )}
        <button className="btn" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}


export function GeneralList({ g, onClose }) {
  const gs = g.generals.filter((x) => x.faction === g.player);
  const [欄, set欄] = useState("武将");
  const 頭 = 組頭の帳(g);
  return (
    <div className="modal" {...外を押して閉じる(onClose)}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
          <div className="mn" style={{ fontSize: 21 }}>家中の帳</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["武将", "武将の帳"], ["組頭", "組頭の帳"]].map(([k, 札]) => (
              <button key={k} className={`btn sm ${欄 === k ? "on" : ""}`} onClick={() => set欄(k)}>
                {札}{k === "組頭" && 頭.length ? ` ${頭.length}` : ""}
              </button>
            ))}
          </div>
        </div>

        {欄 === "組頭" && (<>
          <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 8, lineHeight: 1.8 }}>
            五十人組ひとつに長がひとり。敵の駒を討ち取るたびに手柄が積まれます。
            名の知られた組は、兵を出すたびに先に呼ばれます。組が全滅すれば長も死にます。
            <br />徴募などで兵を補うときは、<b style={{ color: U.text }}>手柄の重い組から先に埋まります</b>。
            擦り減った古参を放っておかぬためです（二十人を割った組は赤字で出ます）。
            <br />勲功 {階の段.map((x) => `${x.要}＝${x.名}`).join("　")}
          </div>
          {!頭.length && (
            <div style={{ fontSize: 12.5, color: U.dim, padding: "18px 0", textAlign: "center" }}>
              まだ手柄を立てた者はいません。<br />
              合戦で敵の駒を討ち取れば、その組の長がここに載ります。
            </div>
          )}
          {頭.map((x) => (
            <div key={x.鍵} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
              borderBottom: `1px solid ${U.line2}`, fontSize: 13, flexWrap: "wrap" }}>
              <span className="mn" style={{ fontSize: 15, width: 92 }}>{x.名}</span>
              <span style={{ width: 62, color: x.階 === "物頭" ? "#C8A44A" : U.dim, fontWeight: x.階 === "物頭" ? 600 : 400 }}>{x.階}</span>
              <span className="num" style={{ flex: 1, color: U.dim }}>
                武功 {x.功}（討ち取った駒）　勲功 {x.功}
              </span>
              {/* 兵が二十を割った組は赤く出す。次の戦で消えれば長も死ぬ。 */}
              <span className="num" style={{ color: x.兵 < 20 ? "#B0483C" : U.dim }}>{fmt(x.兵)}人</span>
              <span style={{ color: U.text, textAlign: "right" }}>
                {x.属}
                <span style={{ color: U.dim, fontSize: 11, marginLeft: 4 }}>{x.種}</span>
              </span>
              <span style={{ color: U.dim, width: 76, textAlign: "right" }}>{x.所}</span>
            </div>
          ))}
          {頭.some((x) => x.階 === "物頭") && (
            <div style={{ fontSize: 11, color: "#8A6A34", marginTop: 8, lineHeight: 1.7 }}>
              物頭に届いた者は、武将に取り立てる資格を得ています。
            </div>
          )}
          <button className="btn" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>閉じる</button>
        </>)}

        {欄 === "武将" && (<>
        {gs.map((x) => (
          <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${U.line2}`, fontSize: 13, flexWrap: "wrap" }}>
            <span className="mn" style={{ fontSize: 15, width: 100 }}>
              {x.name}
              {isNameless(x) && <span style={{ color: "#9B9384", fontSize: 10, marginLeft: 2 }}>〔伝〕</span>}
              {is架空(x) && <span style={{ color: "#9B9384", fontSize: 10, marginLeft: 2 }}
                title="遊びの中で生まれた者。史実の人物ではありません">〔架空〕</span>}
            </span>
            <span className="num" style={{ color: U.dim, flex: 1 }}>{x.age}歳 統{x.lead} 武{x.valor} 知{x.wit} 政{x.gov} 忠{忠誠(x)}</span>
            <span style={{ color: U.dim }}>{x.at ? (g.castles.find((c) => c.id === x.at) || {}).name : "出征中"}</span>
            <span className="num">直属 {fmt(x.retinue)}</span>
          </div>
        ))}
        {gs.some((x) => is架空(x)) && (
          <div style={{ fontSize: 11, color: U.dim, marginTop: 6, lineHeight: 1.7 }}>
            〔架空〕… 遊びの中で生まれた者です。史実の人物ではありません。
          </div>
        )}
        {gs.some((x) => isNameless(x)) && (
          <div style={{ fontSize: 11, color: U.dim, marginTop: 10, lineHeight: 1.7 }}>
            〔伝〕は名の伝わらぬ在地の長です。地名に「乙名」「按司」を添えた呼び名であり、実在の人名ではありません。
          </div>
        )}
        <button className="btn" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>閉じる</button>
        </>)}
      </div>
    </div>
  );
}


/* 外交の申し入れ（GDD 12.1 / 12.2）。

   他家からの申し出は、こちらの諾否を経ずに成らない。
   これを塞いでいなかったころは、隣国を平らげた途端に神戸と北畠が勝手に臣従してきた。
   旗の下に入れるかどうかは、こちらの決めることである。 */
export function DiploOffer({ g, 申, onTake, onPass }) {
  const f = g.factions[申.fid];
  if (!f) return null;
  const r = relOf(g, g.player, 申.fid);
  const 石 = (fid) => g.castles.filter((c) => c.faction === fid).reduce((a, c) => a + c.koku, 0);
  const 我 = 石(g.player), 彼 = 石(申.fid);
  const 城 = g.castles.filter((c) => c.faction === 申.fid).length;
  const 説 = {
    親善: "誼を通じたいという。受ければ信用が上がる。ほかに縛りはない。",
    不可侵: "十二か月のあいだ、互いに攻めない。期限が切れれば元に戻る。",
    同盟: "二十四か月の同盟。互いに援軍を頼めるが、そのあいだ攻めることはできない。",
    従属する: "旗の下に入りたいという。毎月の実入りの四分の一を貢として納め、"
      + "求めれば兵を出す。こちらは、その家と隣り合う他家へ攻め入れるようになる。"
      + "そのかわり、この家を攻めることはできなくなる。",
    臣従する: "完全に旗の下へ入りたいという。城々の内政も軍も、こちらの差配となる"
      + "（ただし家中の者は、その家の城の間でしか動かせない――領地安堵である）。"
      + "実入りの四割が貢として入る。この家を攻めることはできなくなる。",
    従属させる: "こちらを従属させたいという。受ければ毎月の実入りの四分の一を納め、"
      + "求められれば兵を出すことになる。外交は主の外交に従う。",
    臣従させる: "こちらを旗の下に入れたいという。受ければ独立の望みを捨てることになる。",
  }[申.key] || "";
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 6 }}>{f.name}よりの申し入れ</div>
        <div style={{ fontSize: 15, marginBottom: 8 }}>
          <b className="mn" style={{ fontSize: 18 }}>{申.key}</b>
        </div>
        <div style={{ fontSize: 12.5, color: U.dim, lineHeight: 1.95, marginBottom: 10 }}>{説}</div>
        <div className="row"><span>いまの間柄</span><span className="v">{r.state}・信用{Math.round(r.trust)}</span></div>
        <div className="row"><span>石高</span>
          <span className="v">自家 {fmt(Math.round(我 / 10000))}万石 ／ {f.name} {fmt(Math.round(彼 / 10000))}万石（{城}城）</span></div>
        <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.8, marginTop: 8 }}>
          断っても戦にはなりませんが、信用はいくらか下がります。
        </div>
        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onPass}>断る</button>
          <button className="btn dark" style={{ flex: 1 }} onClick={onTake}>受ける</button>
        </div>
      </div>
    </div>
  );
}


/* 縁談（GDD 6.8）。他家から姫を迎えるかどうかを問う。
   受ければ婚姻同盟。期限は無く、その姫が世を去るまで続く。
   断れば信用がいくらか下がる。答えぬままにはできない。 */
export function MarriageOffer({ g, 談, onTake, onPass }) {
  const h = (g.hime || []).find((x) => x.id === 談.himeId);
  const f = g.factions[談.fid];
  if (!h || !f) return null;
  const r = relOf(g, g.player, 談.fid);
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 6 }}>縁談</div>
        <div style={{ fontSize: 13.5, lineHeight: 2, marginBottom: 10 }}>
          <b>{f.name}</b>より、<b className="mn" style={{ fontSize: 16 }}>{h.name}</b>
          （{姫の齢(g, h)}歳・外交{h.dip}・統率{h.lead}）を
          こちらへ輿入れさせたい、との申し入れがあった。
        </div>
        {h.伝 && <div style={{ fontSize: 12, color: U.dim, marginBottom: 8 }}>{h.伝}</div>}
        <div className="row"><span>いまの間柄</span><span className="v">{r.state}・信用{Math.round(r.trust)}</span></div>
        <div style={{ fontSize: 12, color: U.dim, lineHeight: 1.9, marginTop: 8 }}>
          受ければ<b style={{ color: U.text }}>同盟</b>となる。期限は無く、
          この縁は{h.name}が世を去るまで続く。<br />
          同盟のあいだ、この家を攻めることはできない。断れば信用が下がる。
        </div>
        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onPass}>断る</button>
          <button className="btn dark" style={{ flex: 1 }} onClick={onTake}>縁を結ぶ</button>
        </div>
      </div>
    </div>
  );
}


/* ------------------------------------------------------ 姫（GDD 6.8）

   大名家には姫がいる。武将としては数えず、戦場にも出ない。
   けれども、家と家を結ぶのは多く姫の縁である。

   この帳では姫の一覧と、三つの使い道を扱う。
     輿入れ … 他家へ嫁いで同盟を結ぶ。縁は姫の存命のあいだ続く
     使者   … 姫が使いに立てば、ただの使者より遙かに重い（三月戻らない）
     縁組   … 家臣に嫁がせる。婿は一門となり、家督にも連なる

   四つめの「家中の統率」は、姫が城にいるだけで効く。何も選ばなくてよい。 */
export function HimeList({ g, onClose, onEnvoy, onWed, onMarry }) {
  const [sel, setSel] = useState(null);            // 選んだ姫の id
  const [mode, setMode] = useState(null);          // "使者" | "輿入れ" | "縁組"
  const mine = (g.hime || []).filter((h) => h.faction === g.player && !h.死);
  const 嫁いだ = (g.hime || []).filter((h) => h.faction === g.player && !h.死
    && h.嫁 && h.嫁.種 === "婚姻");
  const h = sel ? (g.hime || []).find((x) => x.id === sel) : null;
  const 城名 = (cid) => (g.castles.find((c) => c.id === cid) || {}).name || "";
  const 枠 = 姫の枠(g.castles.filter((c) => c.faction === g.player).reduce((a, c) => a + c.koku, 0));
  const 金 = g.factions[g.player].gold;

  /* 縁を結ぶ相手は、近い家から並べる。
     遠国の家と縁を結ぶことはあっても、まず目に入るべきは隣国である。 */
  const 隔たり = useMemo(() => {
    const 自 = g.castles.filter((c) => c.faction === g.player);
    const 表 = {};
    for (const c of g.castles) {
      if (c.faction === g.player) continue;
      const d = Math.min(...自.map((m) => Math.hypot(m.x - c.x, m.y - c.y)));
      if (表[c.faction] == null || d < 表[c.faction]) 表[c.faction] = d;
    }
    return 表;
  }, [g]);
  const 近い順 = useMemo(() => Object.keys(g.factions)
    .filter((fid) => fid !== g.player && g.castles.some((c) => c.faction === fid))
    .sort((a, b) => (隔たり[a] ?? 9e9) - (隔たり[b] ?? 9e9)), [g, 隔たり]);

  const 相手家 = useMemo(() => {
    if (!h) return [];
    return 近い順.slice(0, 14)
      .map((fid) => ({ fid, r: relOf(g, g.player, fid), 可: 婚姻できるか(g, h, fid) }));
  }, [g, h, 近い順]);

  const 婿候補 = useMemo(() => {
    if (!h) return [];
    return g.generals.filter((x) => x.faction === g.player && 嫁がせられるか(g, h, x).ok)
      .sort((a, b) => (b.lead + b.valor + b.wit) - (a.lead + a.valor + a.wit)).slice(0, 20);
  }, [g, h]);

  return (
    <div className="modal" {...外を押して閉じる(onClose)}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 4 }}>姫</div>
        <div style={{ fontSize: 12, color: U.dim, lineHeight: 1.85, marginBottom: 10 }}>
          姫は武将ではありません。戦場には出ませんが、城にいるあいだはその城の
          守備隊の統率に映ります。家と家を結ぶのは多く姫の縁です。<br />
          家に置ける姫の数は石高によります（いまの限り {枠}人）。十五で世に出ます。
        </div>

        {!mine.length && <div style={{ fontSize: 13, color: U.dim, padding: "12px 0" }}>いま家に姫はいません。</div>}

        {mine.map((x) => {
          const 役 = 姫の役(g, x);
          const 齢 = 姫の齢(g, x);
          const 婿 = x.嫁 && x.嫁.種 === "家臣" ? g.generals.find((q) => q.id === x.嫁.先) : null;
          const 先 = x.嫁 && x.嫁.種 === "婚姻" ? g.factions[x.嫁.先] : null;
          const 使 = x.務め ? g.factions[x.務め.先] : null;
          return (
            <div key={x.id} style={{ padding: "8px 0", borderBottom: `1px solid ${U.line2}`,
              background: sel === x.id ? "rgba(0,0,0,.04)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <span className="mn" style={{ fontSize: 16, minWidth: 92 }}>{x.name}
                  {x.架空 && <span style={{ color: "#9B9384", fontSize: 10, marginLeft: 2 }}
                    title="遊びの中で生まれた者。史実の人物ではありません">〔架空〕</span>}
                </span>
                <span className="num" style={{ color: U.dim, fontSize: 12.5 }}>
                  {齢}歳　外交{x.dip}　統率{x.lead}
                </span>
                <span style={{ fontSize: 12, color: U.dim, flex: 1, textAlign: "right" }}>
                  {役 === "在城" ? `${城名(x.at)}にあり`
                    : 役 === "縁組" ? `${婿 ? 婿.name : ""}の室（${城名(x.at)}）`
                    : 役 === "輿入れ" ? `${先 ? 先.name : ""}へ輿入れ`
                    : 役 === "使者" ? `${使 ? 使.name : ""}へ使者（${x.務め.迄.m}月まで）`
                    : "幼年"}
                </span>
              </div>
              {x.伝 && <div style={{ fontSize: 11, color: U.dim, marginTop: 2 }}>{x.伝}</div>}
              {使える姫(g, x) && (
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {!x.嫁 && (
                    <button className="btn sm" onClick={() => { setSel(x.id); setMode("輿入れ"); }}>
                      輿入れ（婚姻同盟）
                    </button>
                  )}
                  <button className="btn sm" onClick={() => { setSel(x.id); setMode("使者"); }}>使者に立てる</button>
                  {!x.嫁 && (
                    <button className="btn sm" onClick={() => { setSel(x.id); setMode("縁組"); }}>家臣に嫁がせる</button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {嫁いだ.length > 0 && (
          <div style={{ fontSize: 11.5, color: U.dim, marginTop: 10, lineHeight: 1.8 }}>
            輿入れした姫の縁は、その姫が世を去るまで続きます。期限はありません。
          </div>
        )}

        {/* ------------------------------------------------ 相手を選ぶ */}
        {h && mode === "輿入れ" && (
          <div style={{ marginTop: 12 }}>
            <div className="sec">{h.name}を、どの家へ輿入れさせますか（支度 {fmt(婚儀の礼)}貫）</div>
            <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 6, lineHeight: 1.8 }}>
              姫の外交が高いほど、冷たい家とも結べます（{h.name}の要る信用は
              並の家で {婚姻の要る信用(h, { state: "中立" })}、敵対する家で {婚姻の要る信用(h, { state: "敵対" })}）。
            </div>
            {相手家.map(({ fid, r, 可 }) => (
              <div key={fid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
                borderBottom: `1px solid ${U.line2}`, fontSize: 12.5 }}>
                <span className="mn" style={{ fontSize: 14, flex: 1 }}>{g.factions[fid].name}</span>
                <span className="num" style={{ color: U.dim }}>{r.state}・信用{Math.round(r.trust)}</span>
                <button className="btn sm" disabled={!可.ok || 金 < 婚儀の礼}
                  title={可.why} onClick={() => { onWed(h.id, fid); setMode(null); setSel(null); }}>
                  {可.ok ? "結ぶ" : 可.why || "―"}
                </button>
              </div>
            ))}
            <button className="btn sm" style={{ width: "100%", marginTop: 8 }}
              onClick={() => { setMode(null); setSel(null); }}>やめる</button>
          </div>
        )}

        {h && mode === "使者" && (
          <div style={{ marginTop: 12 }}>
            <div className="sec">{h.name}を、どの家への使いに立てますか（支度 {fmt(使者の礼)}貫・三月）</div>
            {近い順.slice(0, 14).map((fid) => ({ fid, r: relOf(g, g.player, fid) }))
              .map(({ fid, r }) => (
                <div key={fid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
                  borderBottom: `1px solid ${U.line2}`, fontSize: 12.5 }}>
                  <span className="mn" style={{ fontSize: 14, flex: 1 }}>{g.factions[fid].name}</span>
                  <span className="num" style={{ color: U.dim }}>{r.state}・信用{Math.round(r.trust)}</span>
                  <button className="btn sm" disabled={金 < 使者の礼}
                    onClick={() => { onEnvoy(h.id, fid); setMode(null); setSel(null); }}>立てる</button>
                </div>
              ))}
            <button className="btn sm" style={{ width: "100%", marginTop: 8 }}
              onClick={() => { setMode(null); setSel(null); }}>やめる</button>
          </div>
        )}

        {h && mode === "縁組" && (
          <div style={{ marginTop: 12 }}>
            <div className="sec">{h.name}を、どの家臣に嫁がせますか</div>
            <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 6, lineHeight: 1.8 }}>
              婿は一門に列します。忠誠は九十二まで上がり、以後も七十を下りません。
              他家の誘いにも靡かず、家督の候補にも連なります。姫は婿の城に入ります。
            </div>
            {婿候補.map((x) => (
              <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
                borderBottom: `1px solid ${U.line2}`, fontSize: 12.5 }}>
                <span className="mn" style={{ fontSize: 14, minWidth: 84 }}>{x.name}</span>
                <span className="num" style={{ color: U.dim, flex: 1 }}>
                  {x.age}歳 統{x.lead} 武{x.valor} 知{x.wit} 忠{忠誠(x)}
                </span>
                <button className="btn sm"
                  onClick={() => { onMarry(h.id, x.id); setMode(null); setSel(null); }}>嫁がせる</button>
              </div>
            ))}
            {!婿候補.length && <div style={{ fontSize: 12, color: U.dim }}>嫁がせられる家臣がいません。</div>}
            <button className="btn sm" style={{ width: "100%", marginTop: 8 }}
              onClick={() => { setMode(null); setSel(null); }}>やめる</button>
          </div>
        )}

        <button className="btn" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}


export function GoalPanel({ g, onClose }) {
  const mine = g.castles.filter((c) => c.faction === g.player);
  const near = g.castles.filter((c) => c.faction !== g.player).map((r) => ({
    r, d: Math.min(...mine.map((m) => { const p = findPath(m.id, r.id); return p ? p.length : 99; })),
  })).sort((a, b) => a.d - b.d).slice(0, 4);
  return (
    <div className="modal" {...外を押して閉じる(onClose)}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 6 }}>攻略目標</div>
        <div style={{ fontSize: 12, color: U.dim, marginBottom: 12 }}>
          当面の目標は尾張・美濃の統一。史実の順序は強制されません。
        </div>
        {near.map(({ r, d }) => {
          const men = r.local + g.generals.filter((x) => x.at === r.id && x.faction === r.faction).reduce((a, x) => a + x.retinue, 0);
          return (
            <div key={r.id} className="row">
              <span><span className="mn" style={{ fontSize: 15 }}>{r.name}</span>
                <span className="pill" style={{ background: g.factions[r.faction].color, marginLeft: 7 }}>{g.factions[r.faction].name}</span></span>
              <span className="v" style={{ color: U.dim, fontSize: 12 }}>兵{fmt(men)}／城防{Math.round(r.def)}／街道{d - 1}区間</span>
            </div>
          );
        })}
        <button className="btn" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}


export function CampaignPanel({ g, camp, onAct }) {
  const dest = g.castles.find((c) => c.id === camp.target);
  if (!dest) return null;
  const arm = (id) => g.armies.find((x) => x.id === id);
  const arrived = camp.arrived.map(arm).filter(Boolean);
  const late = camp.armies.filter((id) => !camp.arrived.includes(id)).map(arm).filter(Boolean);
  const men = arrived.reduce((a, x) => a + x.men, 0);
  const lateMen = late.reduce((a, x) => a + x.men, 0);
  const defGens = g.generals.filter((x) => x.at === dest.id && x.faction === dest.faction && !x.captive);
  const defMen = dest.local + defGens.reduce((a, x) => a + x.retinue, 0);
  const nameOf = (a) => {
    const gen = g.generals.find((x) => x.id === a.gens[0]);
    const home = g.castles.find((c) => c.id === a.from);
    return `${home ? home.name : "―"}の${gen ? gen.name : "手勢"}`;
  };
  const eta = (a) => {
    const m = marchMonths(a.path[0], camp.target);
    return m == null ? "?" : m;
  };
  return (
    <div className="modal">
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 4 }}>{dest.name}攻め　軍議</div>
        <div style={{ fontSize: 12, color: U.dim, marginBottom: 10 }}>
          総大将 {camp.leaderName}（{(g.castles.find((c) => c.id === camp.from) || {}).name}）
          ／ {camp.y}年{camp.m}月に発向 ／ 待った月 {camp.waited}
        </div>

        <div className="sec">着陣した軍</div>
        {arrived.map((a) => (
          <div className="row" key={a.id}>
            <span>{nameOf(a)}</span>
            <span className="v">{fmt(a.men)}人／兵糧{Math.round((a.food / Math.max(1, a.men * 0.09)) * 30)}日</span>
          </div>
        ))}
        <div className="row" style={{ fontWeight: 600 }}><span>着陣の合計</span><span className="v">{fmt(men)}人</span></div>

        <div className="sec">まだ着かぬ軍（寄騎）</div>
        {late.length === 0 && <div style={{ fontSize: 12, color: U.dim }}>遅参はない。全軍がそろっている。</div>}
        {late.map((a) => (
          <div className="row" key={a.id}>
            <span>{nameOf(a)}</span>
            <span className="v" style={{ color: "#B0483C" }}>{fmt(a.men)}人／あと約{eta(a)}か月</span>
          </div>
        ))}

        <div className="sec">城方</div>
        <div className="row"><span>{dest.name}（{g.factions[dest.faction].name}）</span>
          <span className="v">{canSee(g, dest) ? `${fmt(defMen)}人／城防${Math.round(dest.def)}` : "内情不明"}</span></div>

        <div style={{ fontSize: 11.5, color: U.dim, lineHeight: 1.7, margin: "12px 0" }}>
          待てば{fmt(lateMen)}人が加わるが、城方は毎月備えを固め、こちらは兵糧を減らす。
          先に攻めかかれば数は劣るが、備えの薄いうちに当たれる。決めるのは総大将である。
        </div>
        <div className="g3">
          <button className="btn dark" onClick={() => onAct(camp, "攻")} disabled={!arrived.length}>
            {late.length ? "待たずに攻めかかる" : "攻めかかる"}
          </button>
          <button className="btn" onClick={() => onAct(camp, "待")} disabled={!late.length}>遅参を待つ</button>
          <button className="btn" onClick={() => onAct(camp, "退")}>兵を退く</button>
        </div>
      </div>
    </div>
  );
}


export function SiegePanel({ g, sg, onChoose }) {
  const [gate, setGate] = useState(false);
  const [kits, setKits] = useState({});
  const c = g.castles.find((x) => x.id === sg.castleId);
  const a = g.armies.find((x) => x.id === sg.armyId);
  if (!c || !a) return null;
  const mine = a.faction === g.player;
  const gateOK = a.men >= 540;
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 10 }}>{c.name}　包囲中（{sg.months}か月）</div>
        <div className="row"><span>攻め手（{g.factions[a.faction].name}）</span><span className="v">{fmt(a.men)}人／兵糧 {fmt(a.food)}石</span></div>
        <div className="row"><span>守り手（{g.factions[c.faction].name}）</span><span className="v">{fmt(c.local)}人／兵糧 {fmt(c.food)}石</span></div>
        <div className="row"><span>城防／民忠／耐久</span><span className="v">{Math.round(c.def)} / {Math.round(c.min)} / {fmt(c.hp)}</span></div>
        <div className="row"><span>包囲率</span><span className="v">{sg.enc == null ? "―" : `${sg.enc}%`}
          {sg.enc != null && sg.enc < 75 ? <span style={{ color: U.dim, fontSize: 11 }}>　後詰が入り得る</span> : null}</span></div>
        <div className="row"><span>城の井戸</span><span className="v">{Math.round(c.well == null ? 100 : c.well)} / 100</span></div>
        <div style={{ fontSize: 12, color: U.dim, margin: "12px 0" }}>
          強攻を選ぶと、城とその周辺の図へ移ります。城防に応じて曲輪が二重から四重になり、
          門の前には虎口が構えています。門を破って曲輪を進み、本丸を押さえれば落城です。
        </div>
        {mine ? (
          <>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, marginBottom: 10, lineHeight: 1.6 }}>
              <input type="checkbox" checked={gate && gateOK} disabled={!gateOK} onChange={() => setGate((v) => !v)} />
              <span>
                <b>城門攻撃隊を編成する</b>（槍・攻撃兵300以上が必要。現有 {fmt(a.men)}人{gateOK ? "" : "／不足"}）<br />
                <span style={{ color: U.dim }}>
                  門を破れば城防の効きが3割落ち、守り手の損害が25%増える。代わりに門へ取り付いた300人のうち4分の1が失われる。
                </span>
              </span>
            </label>
            <div className="sec">攻城の道具（強攻のときに使う）</div>
            <div style={{ fontSize: 11.5, color: U.dim, marginBottom: 6, lineHeight: 1.6 }}>
              槍組の一部を割いて担がせる。効くのは<b>門を破る速さ</b>と<b>城内からの被害</b>だけで、野戦の働きは変わらない。
            </div>
            {(a.gens || []).map((gid) => {
              const gg = g.generals.find((x) => x.id === gid);
              if (!gg) return null;
              const cur = (kits && kits[gid]) || "なし";
              return (
                <div key={gid} style={{ marginBottom: 6 }}>
                  <div className="mn" style={{ fontSize: 12.5 }}>{gg.name}</div>
                  <div className="g4" style={{ marginTop: 3 }}>
                    {Object.keys(SIEGE_KIT).map((k) => (
                      <button key={k} className={`btn sm ${cur === k ? "on" : ""}`}
                        onClick={() => setKits((v) => ({ ...v, [gid]: k }))}>{k}</button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: U.dim, marginBottom: 8 }}>
              {Object.entries(SIEGE_KIT).filter(([k]) => k !== "なし").map(([k, v]) => `${k}：${v.note}`).join("　")}
            </div>
            <div className="g3">
              <button className="btn" onClick={() => onChoose("兵糧攻め")}>兵糧攻め</button>
              <button className="btn" onClick={() => onChoose("強攻", gate && gateOK, kits)}>強攻</button>
              <button className="btn" onClick={() => onChoose("撤退")}>撤退</button>
            </div>
          </>
        ) : (
          <div className="g2">
            <button className="btn" onClick={() => onChoose("防衛", false, false)}>籠城して待つ</button>
            <button className="btn" onClick={() => onChoose("防衛", false, true)}>討って出る</button>
          </div>
        )}
      </div>
    </div>
  );
}


// 捕らえた武将の処遇を問う（GDD 12.3）
export function CaptiveDialog({ g, gen, onDone }) {
  const [tried, setTried] = useState(false);
  const [failed, setFailed] = useState(false);
  const loy = 忠誠(gen);
  const from = g.factions[gen.captive ? gen.captive.from : gen.faction];
  /* 旧主との縁。一門であれば、忠誠がいくら下がっていても降らぬ。
     ここを見ずに persuadeResult だけで判じていたため、
     旧主と血を分けた者まで降ってしまっていた（GDD 12.3）。 */
  const 縁 = canRecruit(gen, g.generals.find((x) => x.faction === (gen.captive ? gen.captive.from : gen.faction)
    && x.lord && !x.captive) || null);
  return (
    <div className="modal">
      <div className="card">
        <div className="mn" style={{ fontSize: 19 }}>{gen.name}を捕らえた</div>
        <div style={{ fontSize: 12.5, color: U.dim, marginTop: 6, lineHeight: 1.8 }}>
          {from ? from.name : "旧主"}の家臣。{gen.age}歳／統率{gen.lead}／武勇{gen.valor}／知略{gen.wit}／政務{gen.gov}<br />
          旧主への忠誠 <b>{loy}</b>
          {failed && <span style={{ color: "#B0483C" }}>　── 降ることを拒んだ</span>}
        </div>
        {!tried && (
          <div style={{ fontSize: 11.5, color: U.dim, margin: "8px 0", lineHeight: 1.7 }}>
            {縁.ok ? "忠誠40以下なら降る。41から70は運による。71以上は決して降らぬ。"
              : 縁.why}
          </div>
        )}
        <div className="g2" style={{ marginTop: 10 }}>
          {!tried && (
            <button className="btn dark" disabled={!縁.ok} title={縁.ok ? "" : 縁.why} onClick={() => {
              if (縁.ok && persuadeResult(gen)) onDone("登用");
              else { setTried(true); setFailed(true); }
            }}>登用する</button>
          )}
          <button className="btn" onClick={() => onDone("逃す")}>逃す</button>
          <button className="btn" onClick={() => onDone("斬首")}>斬首する</button>
          <button className="btn" onClick={() => onDone("捕虜")}>捕虜とする</button>
        </div>
      </div>
    </div>
  );
}

export function PromotionDialog({ promo, onDone }) {
  const [pick, setPick] = useState(promo.candidates[0]);
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card" style={{ maxWidth: 460 }}>
        <div className="mn" style={{ fontSize: 21, marginBottom: 8 }}>正式武将への昇進</div>
        <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 14 }}>
          <span className="mn" style={{ fontSize: 17 }}>{promo.oldName}</span> が戦功を挙げた。<br />
          <span style={{ color: U.dim }}>{promo.feat}</span><br />
          {promo.lordName}より偏諱「<span className="mn" style={{ fontSize: 19 }}>{promo.henki}</span>」の一字を与え、諱を定める。
        </div>
        <div className="g2">
          {promo.candidates.map((n) => (
            <button key={n} className={`btn mn ${pick === n ? "on" : ""}`} style={{ fontSize: 17 }} onClick={() => setPick(n)}>{n}</button>
          ))}
        </div>
        <button className="btn dark" style={{ width: "100%", marginTop: 14 }} onClick={() => onDone(pick)}>{pick} と名乗らせる</button>
      </div>
    </div>
  );
}


/* 陣形の見取り図つき選択。50人組の実配置がそのまま図になる（GDD 8.4） */
export function FormationDiagram({ form, color, size }) {
  const slots = layoutSlots(form, 12);
  const xs = slots.map((s) => s.x), ys = slots.map((s) => s.y);
  const x0 = Math.min(...xs) - 8, x1 = Math.max(...xs) + 8;
  const y0 = Math.min(...ys) - 8, y1 = Math.max(...ys) + 8;
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  return (
    <svg viewBox={`${x0} ${y0} ${w} ${h}`} width={size} height={size * 0.62}
      preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      {slots.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={7} fill={color} opacity={0.85} />)}
    </svg>
  );
}

export function FormationPicker({ corps, onPick }) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: U.dim, margin: "2px 0 5px" }}>陣形</div>
      <div className="g3">
        {FORMATIONS.map((f) => (
          <button key={f} className={`btn sm ${corps.formation === f ? "on" : ""}`} title={FORM_NOTE[f]}
            style={{ padding: "5px 3px", lineHeight: 1.2 }} onClick={() => onPick(f)}>
            <FormationDiagram form={f} color={corps.color} size={54} />
            <span style={{ fontSize: 11.5 }}>{f}</span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: U.dim, lineHeight: 1.6, marginTop: 5 }}>{FORM_NOTE[corps.formation]}</div>
    </div>
  );
}

