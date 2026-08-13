import { MAP, axisOf, fromUV, gatePos, inRect, nearestOpenGate, routeToCastleGate } from "./castleMap.js";
import { setAiIssuing, corpsMax, corpsMen, delegated, detachAI, detachOptions, issueOrder, makeDetachment, placeSquads, reformTime } from "./corps.js";
import { ARM_STATS, HILLS, RIVER, hasRiver, nearestOf, riverShift, terrainAt } from "./field.js";

export function battleAI(b) {
  setAiIssuing(true);
  const alive = b.corps.filter((c) => !c.dead && !c.destroyed);
  // 分遣隊は所属を問わず割り当てられた任務を自律遂行する（GDD 8.5）
  for (const c of alive) if (c.detach && !c.routed) detachAI(b, c, alive);
  // 敵側の分遣は接敵前に一度だけ決める。乱戦の最中に隊を割いて自壊しないようにする。
  for (const c of alive) {
    if (!delegated(b, c) || c.detach || c.routed || c.detachTried) continue;
    if (b.t > 25 || c.squads.some((q) => q.engaged) || c.morale < 60) { c.detachTried = true; continue; }
    if (b.t < 3) continue;                       // 布陣直後は様子を見る
    c.detachTried = true;
    if (Math.random() > 0.5) continue;
    const opt = detachOptions(b, c).filter((o) => o.ok);
    if (opt.length) makeDetachment(b, c, opt[Math.floor(Math.random() * opt.length)].key);
  }
  for (const c of alive) {
    if (!delegated(b, c) || c.routed || c.detach) continue;
    const mySide = c.side, foeSide = mySide === "P" ? "E" : "P";
    const foes = alive.filter((o) => o.side === foeSide && !o.routed && (o.seen || !o.ambush));
    if (!foes.length) continue;
    // 崩壊寸前で支えもないときだけ退く。プレイヤー側の崩壊点（士気15）に近い基準にする。
    if (c.morale < 18 && corpsMen(c) < corpsMax(c) * 0.55) {
      const help = alive.some((o) => o.side === mySide && o !== c && !o.routed && Math.hypot(o.x - c.x, o.y - c.y) < 220);
      if (!help) { c.order = "撤退"; c.withdraw = true; c.tx = c.x; c.ty = -80; continue; }
    }
    // 兵力差と地形から陣形を選び直す。プレイヤーと同じ陣形・同じ手間で行う。
    if (!c.formPicked) {
      c.formPicked = true;
      const mine = alive.filter((o) => o.side === mySide).reduce((a, o) => a + corpsMen(o), 0);
      const foeMen = alive.filter((o) => o.side === foeSide).reduce((a, o) => a + corpsMen(o), 0);
      const want = terrainAt(c.x, c.y) === "bridge" || terrainAt(c.x, c.y) === "ford" ? "長蛇"
        : mine > foeMen * 1.25 ? "鶴翼" : mine < foeMen * 0.8 ? "魚鱗" : "横陣";
      if (c.formation !== want) {
        c.formation = want;
        // 開戦直後の選択は布陣の一部。プレイヤーの布陣と同じく組み直しの損は生じない。
        if (b.t > 2) c.reformT = reformTime(c.gen);
        placeSquads(c, b.t <= 2);
      }
    }
    const coh = c.squads.length ? c.squads.reduce((a, q) => a + q.cohesion, 0) / c.squads.length : 100;
    if (c.reforming) {
      if (coh > 72) c.reforming = false;
      else { c.order = "待機"; c.tx = c.x; c.ty = c.y; continue; }
    }
    // 実際に川を渡った隊だけが渡河後の再編を行う（南から始まった隊は対象外）
    // 川を渡り終えたら隊列を整え直す。どちらの岸から出た隊にも等しく及ぼす
    // （北から出た隊にだけ効かせていたため、北に布陣した側が一方的に有利だった）。
    if (hasRiver() && c.bank0 && !c.crossed) {
      const mid = (RIVER.top + RIVER.bot) / 2 + riverShift(c.x);
      const nowBank = c.y < mid ? -1 : 1;
      if (nowBank !== c.bank0 && Math.abs(c.y - mid) > (RIVER.bot - RIVER.top) / 2 + 30) {
        c.crossed = true;
        if (coh < 62) { c.reforming = true; c.order = "待機"; c.tx = c.x; c.ty = c.y; continue; }
      }
    }
    const tgt = foes.reduce((a, o) => (Math.hypot(o.x - c.x, o.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? o : a), foes[0]);
    // 槍を合わせている隊は目標を変えない。向き直って側面を晒すのを避ける。
    if (c.order === "接戦" && c.squads.some((q) => q.engaged)) continue;
    if (MAP) {
      const near = Math.hypot(tgt.x - c.x, tgt.y - c.y);
      if (c.side !== b.attacker) {
        /* 寄せ手が崩れたら追い討ちをかける（GDD 9.4）
           六割が敗走すれば大将を除く諸隊が、八割で大将も出る。
           いずれも一分を経るか士気が五十を切れば城へ戻る。 */
        const atkAll = b.corps.filter((x) => x.side === b.attacker && !x.dead && !x.destroyed);
        const broken = atkAll.filter((x) => x.routed || x.withdraw).length;
        const rate = atkAll.length ? broken / atkAll.length : 0;
        const isLord = !!(c.gen && c.gen.lord);
        const chaseNow = rate >= (isLord ? 0.8 : 0.6);
        if (c.chasing) {
          if (b.t - (c.chaseAt || 0) > 60 || c.morale < 50 || rate < 0.4) {
            c.chasing = false;
            b.log.push({ t: b.t, text: `${c.gen.name}隊は追い討ちをやめ、城へ引いた。` });
          } else {
            const prey = atkAll.filter((x) => !x.routed)
              .sort((x, y2) => Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y2.x - c.x, y2.y - c.y))[0]
              || atkAll.sort((x, y2) => Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y2.x - c.x, y2.y - c.y))[0];
            if (prey) { issueOrder(b, c, { order: "接戦", tx: prey.x, ty: prey.y, target: prey.id }); continue; }
          }
        } else if (chaseNow && c.morale > 55) {
          c.chasing = true; c.chaseAt = b.t;
          b.log.push({ t: b.t,
            text: `${c.gen.name}隊が城を出て追い討ちをかけた（寄せ手の${Math.round(rate * 100)}分が崩れた）。` });
          continue;
        }
        /* 城方は持ち場の門を守る。持ち場が保たなくなったら、ひとつ内の輪へ下がる。

           かつては「残る門のうち、いちばん内のもの」を選んでいた。
           これでは戦の始まりに、持ち場を捨てて皆が本丸へ引き上げてしまう。
           外の門を素通りさせ、寄せ手が本丸に届くまで一矢も射ないことになる。
           守るべきは、まだ破れていない輪のうち、いちばん外の輪である。 */
        let g2 = c.holdGate;
        const need = !g2 || g2.broken || g2.hp / g2.max < 0.10;
        if (need) {
          // 持ち場があるなら、それより内の門だけを見る（下がるのであって、進み出るのではない）
          const 残り = MAP.gates.filter((x) => !x.broken && (!g2 || x.layer > g2.layer));
          if (残り.length) {
            const 輪 = Math.min(...残り.map((x) => x.layer));        // まだ破れていない、いちばん外の輪
            const 場 = (x) => gatePos(MAP, MAP.layers[x.layer], x);
            const 次 = 残り.filter((x) => x.layer === 輪).sort((x, y2) => {
              const ga = 場(x), gb = 場(y2);                          // 同じ輪なら手近な門を受け持つ
              return Math.hypot(ga.x - c.x, ga.y - c.y) - Math.hypot(gb.x - c.x, gb.y - c.y);
            })[0];
            if (次 && 次 !== g2) {
              const 下がる = !!g2;
              c.holdGate = 次; g2 = 次;
              b.log.push({ t: b.t,
                text: 下がる ? `${c.gen.name}隊は${次.key}の内へ下がった。`
                  : `${c.gen.name}隊が${次.key}を固めた。` });
            }
          } else if (g2 && g2.broken) {
            c.holdGate = null; g2 = null;                            // 守るべき門が尽きた。本丸へ籠る。
          }
        }
        /* 城方の戦い方（GDD 9.3）
           門のすぐ内に張り付いて門を支え、外の寄せ手へ射かける。
           寄せ手が弱れば門を開いて打って出る。
           持ち場の門が保たなくなれば内側の門へ、最後は本丸へ籠る。 */
        if (g2 && !g2.broken) {
          const l2 = MAP.layers[g2.layer], a2 = axisOf(l2, g2);
          // 門のすぐ内側に立つ。奥へ引っ込んでは門を支えられない。
          const p2 = fromUV(MAP, a2, g2.off, a2.half - 14);
          const d2 = Math.hypot(c.x - p2.x, c.y - p2.y);
          if (d2 > 34) { issueOrder(b, c, { order: "移動", tx: p2.x, ty: p2.y }); continue; }
          // 門の外に取り付いている寄せ手を見る
          const gp = gatePos(MAP, l2, g2);
          const foes = b.corps.filter((x) => x.side === b.attacker && !x.dead && !x.destroyed
            && !x.routed && Math.hypot(x.x - gp.x, x.y - gp.y) < 170);
          const foeMen = foes.reduce((t, x) => t + corpsMen(x), 0);
          const myMen = corpsMen(c);
          const foeMor = foes.length
            ? foes.reduce((t, x) => t + x.morale, 0) / foes.length : 100;
          /* 打って出る頃合い（GDD 9.4）
             一、寄せ手の士気が四割を切ったとき
             二、寄せ手の兵が自隊の三分の一を割ったとき
             三、将の器量で相手を一割四分上回るとき
             いずれも自隊が弱っていては出ない。出れば四十秒で戻る。 */
            const myWorth = (c.gen.valor || 60) + (c.gen.lead || 60);
            const foeWorth = foes.length
              ? Math.max(...foes.map((x) => (x.gen.valor || 60) + (x.gen.lead || 60))) : 999;
            const fit = c.morale > 58 && myMen > corpsMax(c) * 0.45;   // 自隊が保っている
            const chance = foes.length && fit && (
              foeMor < 40                        // 寄せ手の士気が尽きかけている
              || foeMen < myMen / 3              // 寄せ手が三分の一を割った
              || myWorth > foeWorth * 1.4        // 将の器量で大きく上回る
            );
            if (c.sallied) {
              // 打って出た後は四十秒で城へ戻る
              if (b.t - (c.sallyAt || 0) > 40 || c.morale < 46) {
                c.sallied = false; c.sallyLogged = false;
                b.log.push({ t: b.t, text: `${c.gen.name}隊が${g2.key}の内へ戻った。` });
                issueOrder(b, c, { order: "移動", tx: p2.x, ty: p2.y });
                continue;
              }
              const t2 = [...foes].sort((x, y2) => corpsMen(x) - corpsMen(y2))[0];
              if (t2) { issueOrder(b, c, { order: "接戦", tx: t2.x, ty: t2.y, target: t2.id }); continue; }
              c.sallied = false;
            } else if (chance) {
              const t2 = [...foes].sort((x, y2) => corpsMen(x) - corpsMen(y2))[0];
              if (t2) {
                c.sallied = true; c.sallyAt = b.t;
                issueOrder(b, c, { order: "接戦", tx: t2.x, ty: t2.y, target: t2.id });
                if (!c.sallyLogged) {
                  c.sallyLogged = true;
                  b.log.push({ t: b.t, text: `${c.gen.name}隊が${g2.key}を開いて討って出た。` });
                }
                continue;
              }
            }
          // 射手は門ごしに射かける。槍組は門を支えて守る。
          const shooter = c.squads.some((q) => (q.men > 0)
            && (q.type === "yumi" || q.type === "teppo"));
          if (shooter && foes.length) {
            const t3 = [...foes].sort((x, y2) =>
              Math.hypot(x.x - gp.x, x.y - gp.y) - Math.hypot(y2.x - gp.x, y2.y - gp.y))[0];
            issueOrder(b, c, { order: "射撃", tx: t3.x, ty: t3.y, target: t3.id });
            continue;
          }
          issueOrder(b, c, { order: "守備", tx: c.x, ty: c.y });
          continue;
        }
        // 守るべき門がすべて破れたなら、本丸へ籠る
        if (!g2 || g2.broken) {
          const keep = MAP.layers[MAP.layers.length - 1];
          if (keep) {
            const kx = MAP.cx, ky = MAP.cy;      // 本丸の中心
            if (Math.hypot(c.x - kx, c.y - ky) > 60) {
              issueOrder(b, c, { order: "移動", tx: kx, ty: ky });
            } else {
              issueOrder(b, c, { order: "守備", tx: c.x, ty: c.y });
            }
            continue;
          }
        }
      }
      if (c.side === b.attacker) {
        // 寄せ手：抜けられる門のうち、いちばん外の近い門へ取り付く
        const g = nearestOpenGate(MAP, c.x, c.y);
        if (g && near > 130) {
          if (!c.wp || !c.wp.length) {
            const wp = routeToCastleGate(MAP, g, c.x, c.y);
            if (wp.length) { issueOrder(b, c, { order: "移動", tx: wp[0].x, ty: wp[0].y, keepPath: true }); c.wp = wp; }
            else {
              const a2 = axisOf(MAP.layers[g.layer], g);
              const app = fromUV(MAP, a2, g.off, a2.half + MAP.t + 26);
              issueOrder(b, c, { order: "移動", tx: app.x, ty: app.y });
            }
          }
          continue;
        }
        if (!g) {
          const h = MAP.layers[MAP.layers.length - 1];
          if (!inRect(c.x - MAP.cx, c.y - MAP.cy, h.hw, h.hh) && near > 130) {
            issueOrder(b, c, { order: "移動", tx: MAP.cx, ty: MAP.cy });
            continue;
          }
        }
      }
    }
    const ranged = c.squads.filter((q) => ARM_STATS[q.type].range > 0).reduce((s, q) => s + q.men, 0);
    if (ranged / Math.max(1, corpsMen(c)) > 0.55) {
      const hill = nearestOf(HILLS, c.x, c.y);
      if (!hill) { /* 高地のない野では丘取りをしない */ } else
      if (Math.hypot(hill.x - c.x, hill.y - c.y) > 90 && terrainAt(c.x, c.y) !== "hill") { issueOrder(b, c, { order: "移動", tx: hill.x, ty: hill.y }); continue; }
    }
    if (hasRiver() && (c.y < RIVER.top) !== (tgt.y < RIVER.top) && Math.abs(c.y - RIVER.top) < 260) {
      const gates = [
        { x: (RIVER.bridge[0] + RIVER.bridge[1]) / 2, y: (RIVER.top + RIVER.bot) / 2 },
        { x: (RIVER.ford[0] + RIVER.ford[1]) / 2, y: (RIVER.top + RIVER.bot) / 2 },
      ];
      const gt = gates.reduce((a, p) => (Math.hypot(p.x - c.x, p.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? p : a), gates[0]);
      if (Math.abs(c.y - gt.y) > 40) { issueOrder(b, c, { order: "移動", tx: gt.x, ty: gt.y }); continue; }
    }
    // 接敵はプレイヤーと同じ間合いで止まり、命令伝達も同じ遅延を受ける（GDD 13.2）。
    // すでに間合いに入っていれば、狙いを直しても後ろへは下がらない。
    const dd = Math.hypot(c.x - tgt.x, c.y - tgt.y) || 1;
    if (dd <= 42) issueOrder(b, c, { order: "接戦", tx: c.x, ty: c.y });
    else issueOrder(b, c, { order: "接戦", tx: tgt.x + ((c.x - tgt.x) / dd) * 38, ty: tgt.y + ((c.y - tgt.y) / dd) * 38 });
  }
  setAiIssuing(false);
}

