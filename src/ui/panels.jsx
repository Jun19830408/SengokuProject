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
import { ARMS, ROAD_SPEED } from "../data/roads.js";
import { reinforceOffers } from "../govern/war.js";
import { canRecruit } from "../core/house.js";
import { underMyBanner } from "../core/state.js";
import { atPeace } from "../core/state.js";
import { 忠誠 } from "../core/rank.js";
import { 兵科の割り, 蓄えに合わせる } from "../core/roster.js";
import { clamp } from "../core/util.js";
import { 既定の兵科 } from "../data/arms.js";


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
      .filter((x) => x.id !== from
        && (underMyBanner(g, c.faction, x.faction) || canAttack(g, x.id)))
      .map((x) => ({ x, m: marchMonths(from, x.id) || 99 }))
      // 隣り合う城か、味方の城を伝って辿れる先にしか兵は出せぬ。
      // 遠国へ攻め入るには、まずその手前を切り取らねばならない。
      .filter(({ x, m }) => {
        if (m > 6) return false;
        if (underMyBanner(g, c.faction, x.faction)) return true;   // 旗の下の城へは寄せられる
        const path = findPath(from, x.id);
        if (!path) return false;
        // 途中の城がすべて味方（または同盟）でなければ通れない
        for (let i = 1; i < path.length - 1; i++) {
          const mid = g.castles.find((y) => y.id === path[i]);
          if (!mid) return false;
          if (mid.faction === c.faction) continue;
          const st = relOf(g, c.faction, mid.faction).state;
          if (st !== "同盟" && st !== "従属" && st !== "臣従") return false;
        }
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
  const availLocal = Math.max(0, Math.min(
    c.local,
    c.local + gens.reduce((a, x) => a + x.retinue, 0) - garrison - retSum,
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
          経路：{path ? path.map((n) => nodeById(n).name).join(" → ") : "経路なし"}　／　所要 約{Math.max(1, Math.ceil(dist / 300))}か月
        </div>
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
        <div className="row"><span>城に残る兵</span>
          <span className="v">{fmt(c.local - useLocal + gens.filter((x) => !picked.includes(x.id)).reduce((a, x) => a + x.retinue, 0))} 人（最低 {fmt(garrison)}）</span></div>

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
                      : (o.指図 ? `将と兵を選べる／到着まで約${o.months}か月／出せる兵 ${fmt(o.avail)}人`
                        : `約${fmt(o.men)}人／到着まで約${o.months}か月／応じる見込み${Math.round(o.chance * 100)}%`)}
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

        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>取りやめ</button>
          <button className="btn dark" style={{ flex: 2 }} disabled={!to || !path || !picked.length || men < 200 || c.food < food}
            onClick={() => onGo({ from, to, gens: picked, local: useLocal, food, mix,
              // 指図の通る城は、選んだ将と兵数を添える。頼むだけの城は相手の言い値のまま。
              reinforce: offers.filter((o) => aid[o.castleId]).map((o) => (o.指図
                ? { ...o, genIds: aid[o.castleId].genIds || [],
                    men: Math.min(aid[o.castleId].men, 出せる上限(o, 選ばれた将(o))) }
                : o)) })}>{約束 ? `約束を破って${fmt(men)}人で進発` : `${fmt(men)}人で進発`}</button>
        </div>
        {c.food < food && <div style={{ color: "#B0483C", fontSize: 12, marginTop: 7 }}>兵糧が足りない。収穫を待つか、開墾を進める必要がある。</div>}
      </div>
    </div>
  );
}


/* ------------------------------------------------ 城方の討って出（GDD 9.2）

   後詰が囲みの外に着いた。城方が門を開いて背後を衝けば、寄せ手は内と外から
   挟まれる。ただし城を空にしてはならぬ。守備の最低数は必ず残す。 */
export function SallyDialog({ g, castleId, foeId, onClose, onGo }) {
  const c = g.castles.find((x) => x.id === castleId);
  const foe = g.armies.find((x) => x.id === foeId);
  const gens = g.generals.filter((x) => x.at === castleId && x.faction === c.faction && !x.captive);
  const [picked, setPicked] = useState(gens.slice(0, 2).map((x) => x.id));
  const 守り = minGarrison(c);
  const retSum = picked.reduce((a, id) => { const x = gens.find((q) => q.id === id); return a + (x ? x.retinue : 0); }, 0);
  const 限り = picked.reduce((a, id) => { const x = gens.find((q) => q.id === id); return a + (x ? troopLimit(x, g) : 0); }, 0);
  // 城を空にはできぬ。守備の最低数は必ず残る。
  const 出せる = Math.max(0, Math.min(
    c.local,
    c.local + gens.reduce((a, x) => a + x.retinue, 0) - 守り - retSum,
    Math.max(0, 限り - retSum),
  ));
  const [local, setLocal] = useState(0);
  useEffect(() => { setLocal(Math.round(出せる * 0.7)); }, [picked.length]); // eslint-disable-line
  const 出す = Math.min(local, 出せる);
  const 兵 = retSum + 出す;

  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 4 }}>{c.name}　討って出るか</div>
        <div style={{ fontSize: 12.5, color: U.dim, marginBottom: 10, lineHeight: 1.8 }}>
          後詰が囲みの外に着きました。<b style={{ color: U.text }}>いま門を開けば、寄せ手を内と外から挟めます。</b><br />
          城に籠もったままでも構いませぬ。その場合、後詰だけで囲みを衝きます。
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
        <div className="row"><span>城に残る兵</span>
          <span className="v">{fmt(c.local - 出す + gens.filter((x) => !picked.includes(x.id)).reduce((a, x) => a + x.retinue, 0))} 人（最低 {fmt(守り)}）</span></div>
        <div style={{ fontSize: 11, color: U.dim, marginTop: 6, lineHeight: 1.7 }}>
          守備の最低数は城に残ります。門を開いて出た兵は、戦の後に城へ戻ります。
        </div>

        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>籠もったまま</button>
          <button className="btn dark" style={{ flex: 2 }} disabled={!picked.length || 兵 < 100}
            onClick={() => onGo({ gens: picked, local: 出す })}>{fmt(兵)}人で討って出る</button>
        </div>
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
                  : `約${fmt(o.men)}人／約${o.months}か月／応じる見込み${Math.round(o.chance * 100)}%`}
              </span>
            </span>
          </label>
        ))}

        <div className="row" style={{ marginTop: 10 }}><span>差し向ける総勢（下知の分）</span>
          <span className="v">{fmt(総勢)} 人／{隊数}隊</span></div>
        {隊数 > MAX_CORPS && (
          <div style={{ fontSize: 12, color: "#B0483C" }}>一方の陣に並べられるのは{MAX_CORPS}隊まで。</div>
        )}

        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>やめる</button>
          <button className="btn dark" style={{ flex: 2 }} disabled={総勢 < 100 && !頼み.length}
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

export function MonthReport({ g, onClose }) {
  const mine = g.castles.filter((c) => c.faction === g.player);
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
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
        <button className="btn dark" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>評定を開く</button>
      </div>
    </div>
  );
}


export function Chronicle({ g, onClose }) {
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
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
  const rows = Object.values(g.factions).map((f) => {
    const cs = g.castles.filter((c) => c.faction === f.id);
    const gs = g.generals.filter((x) => x.faction === f.id);
    return {
      f, koku: cs.reduce((a, c) => a + c.koku, 0),
      men: cs.reduce((a, c) => a + c.local, 0) + gs.filter((x) => x.at).reduce((a, x) => a + x.retinue, 0),
      castles: cs.length, gens: gs.length,
    };
  }).sort((a, b) => b.koku - a.koku);
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 12 }}>勢力情報</div>
        {rows.map((r) => (
          <div key={r.f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${U.line2}`, flexWrap: "wrap" }}>
            <span className="dot" style={{ background: r.f.color }} />
            <span className="mn" style={{ fontSize: 16, flex: 1 }}>{r.f.full}
              {r.f.id === g.player && <span className="pill" style={{ background: r.f.color, marginLeft: 7 }}>自勢力</span>}</span>
            <span className="num" style={{ fontSize: 12, color: U.dim }}>
              {man(r.koku)}万石／兵{fmt(r.men)}／{r.castles}城／武将{r.gens}名／威信{Math.round(r.f.prestige || 50)}
              {r.f.id !== g.player && (() => {
                const rl = relOf(g, g.player, r.f.id);
                return `／${rl.state}・信用${Math.round(rl.trust)}${rl.until ? `（残${monthsBetween(g.year, g.month, rl.until.y, rl.until.m)}か月）` : ""}`;
              })()}
            </span>
          </div>
        ))}
        <button className="btn" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}


export function GeneralList({ g, onClose }) {
  const gs = g.generals.filter((x) => x.faction === g.player);
  return (
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="card">
        <div className="mn" style={{ fontSize: 21, marginBottom: 12 }}>武将一覧</div>
        {gs.map((x) => (
          <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${U.line2}`, fontSize: 13, flexWrap: "wrap" }}>
            <span className="mn" style={{ fontSize: 15, width: 100 }}>
              {x.name}
              {isNameless(x) && <span style={{ color: "#9B9384", fontSize: 10, marginLeft: 2 }}>〔伝〕</span>}
            </span>
            <span className="num" style={{ color: U.dim, flex: 1 }}>{x.age}歳 統{x.lead} 武{x.valor} 知{x.wit} 政{x.gov} 忠{忠誠(x)}</span>
            <span style={{ color: U.dim }}>{x.at ? (g.castles.find((c) => c.id === x.at) || {}).name : "出征中"}</span>
            <span className="num">直属 {fmt(x.retinue)}</span>
          </div>
        ))}
        {gs.some((x) => isNameless(x)) && (
          <div style={{ fontSize: 11, color: U.dim, marginTop: 10, lineHeight: 1.7 }}>
            〔伝〕は名の伝わらぬ在地の長です。地名に「乙名」「按司」を添えた呼び名であり、実在の人名ではありません。
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
    <div className="modal" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
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

