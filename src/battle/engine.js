import { battleAI } from "./ai.js";
import { MAP, SIEGE_KIT, axisOf, fromUV, gatePos, gateReachable, inRect, nearestOpenGate, routeToCastleGate } from "./castleMap.js";
import { ROW, SP, corpsMax, corpsMen, notify, placeSquads } from "./corps.js";
import { ARM_STATS, BASE, FIELD, TERRAIN, WEATHER, fieldScale, passable, passableFor, terrainAt } from "./field.js";
import { clamp } from "../core/util.js";
import { px, py } from "../data/geo.js";

export function createBattle(playerCorps, enemyCorps, attackerSide) {
  const r = Math.random();
  const weather = r < 0.18 ? "雨" : r < 0.45 ? "曇" : "晴";
  const b = {
    t: 0, phase: "deploy", corps: [...playerCorps, ...enemyCorps],
    initial: { P: playerCorps.reduce((s, c) => s + corpsMen(c), 0), E: enemyCorps.reduce((s, c) => s + corpsMen(c), 0) },
    log: [], result: null, attacker: attackerSide, aiClock: 0,
    weather, dusk: 480, retreat: null, orderly: false, fx: [],
  };
  for (const c of b.corps) { placeSquads(c, true); c.lastSeen = { x: c.x, y: c.y, t: 0 }; }
  return b;
}

export function applyDamage(b, fCorps, e, dmg, flank, valor) {
  // 挟撃を受けている隊は受ける損害がやや増える（二方向1.12倍、三方向以上1.22倍）
  const pinch = fCorps.pinch >= 3 ? 1.22 : fCorps.pinch === 2 ? 1.12 : 1;
  const before = e.men;
  e.men = Math.max(0, e.men - dmg * pinch);
  const lost = before - e.men;
  fCorps.loss[e.origin] += lost;
  // 武勇は「相手の陣形を崩す圧力」として効く。士気そのものは下げない（GDD 8.3）
  // 零より下へは落とさぬ。負のまま持ち越すと、戦のあと整え直すのに際限がなくなる。
  e.cohesion = Math.max(0, e.cohesion - lost * 0.7 * flank * (0.55 + (valor || 60) / 100));
  const share = lost / Math.max(1, corpsMax(fCorps));
  fCorps.morale -= share * 100 * 2.2 * (1 + (flank - 1) * 0.8);
}

export function stepBattle(b, dt) {
  if (b.phase !== "fight") return;
  b.t += dt; b.aiClock -= dt;
  for (const c of b.corps) {
    if (!c.pending) continue;
    c.pending.t -= dt;
    if (c.pending.t <= 0) { Object.assign(c, c.pending.patch); c.pending = null; }
  }
  if (b.fx.length) {
    for (const f of b.fx) f.t += dt;
    b.fx = b.fx.filter((f) => f.t < f.life);
  }
  if (b.aiClock <= 0) { battleAI(b); b.aiClock = 0.6; }
  const alive = b.corps.filter((c) => !c.dead && !c.destroyed);

  for (const c of alive) {
    const foes = alive.filter((o) => o.side !== c.side);
    let seen = false;
    for (const f of foes) {
      for (const q of f.squads) {
        const t = TERRAIN[terrainAt(c.x, c.y)];
        const sight = (c.ambush && !c.revealed ? 95 : t.sight) * WEATHER[b.weather].sight * fieldScale();
        if (Math.hypot(q.x - c.x, q.y - c.y) < sight) { seen = true; break; }
      }
      if (seen) break;
    }
    c.seen = seen;
    if (seen) c.lastSeen = { x: c.x, y: c.y, t: b.t };
    // 挟撃：いくつの方角から敵に取り付かれているか。四方位で数える。
    const dirs = new Set();
    for (const o of foes) {
      if (o.destroyed || Math.hypot(o.x - c.x, o.y - c.y) > 190) continue;
      dirs.add(Math.round((Math.atan2(o.y - c.y, o.x - c.x) + Math.PI) / (Math.PI / 2)) % 4);
    }
    c.pinch = dirs.size;
    if (c.ambush && !c.revealed) {
      for (const f of foes) {
        if (Math.hypot(f.x - c.x, f.y - c.y) < 150) {
          c.revealed = true; f.morale -= 16;
          for (const q of f.squads) q.cohesion -= 12;
          b.log.push({ t: b.t, text: `${c.name}隊の伏兵が${f.name}隊に現れた。` });
          c.feats.push("伏兵成功");
        }
      }
    }
  }

  // 代表点（武将の位置）を兵の側に留める。敗走中や分遣も含め、すべての隊に及ぼす。
  for (const c of alive) {
    // 代表点（武将の位置）が兵から離れすぎないようにする。
    // 兵が川や壁で足止めされている間に武将だけが先へ出てしまうのを防ぐ。
    {
      let mx2 = 0, my2 = 0, mn = 0;
      for (const q of c.squads) { if (q.men <= 0) continue; mx2 += q.x * q.men; my2 += q.y * q.men; mn += q.men; }
      if (mn > 0) {
        const cx2 = mx2 / mn, cy2 = my2 / mn;
        // 武将の居所は隊の後ろ寄り。旗本は兵の後ろに構えるもので、単騎で前へ出ることはない。
        let depth = 0;
        for (const q of c.squads) {
          if (q.men <= 0) continue;
          const rel = (q.x - cx2) * Math.cos(c.facing) + (q.y - cy2) * Math.sin(c.facing);
          if (-rel > depth) depth = -rel;
        }
        // 最後尾ではなく、後ろから二列目。背後には一列の組を残す（後方の守り）。
        const back = Math.max(0, Math.min(depth, 90) - ROW * 1.6);
        let gx2 = cx2 - Math.cos(c.facing) * back, gy2 = cy2 - Math.sin(c.facing) * back;
        if (!passable(gx2, gy2)) { gx2 = cx2; gy2 = cy2; }
        c.gx = gx2; c.gy = gy2;
      }
    }
  }

  // 味方の武将隊どうしの重なりだけを押し戻す。
  // 「離れすぎたら本隊へ戻す」ような、命じていない移動はさせない。
  for (const c of alive) {
    if (c.detach || c.routed || c.withdraw || (c.ambush && !c.revealed)) continue;
    const mates = alive.filter((o) => o !== c && o.side === c.side && !o.detach && !o.routed && !o.withdraw);
    if (!mates.length) continue;
    let sx = 0, sy = 0;
    for (const o of mates) {
      const d = Math.hypot(o.x - c.x, o.y - c.y);
      if (d > 0.1 && d < 150) { sx += ((c.x - o.x) / d) * (150 - d); sy += ((c.y - o.y) / d) * (150 - d); }
    }
    // 隊どうしが押し合う力。これも城壁を越えてはならない。
    if (c.pinned) continue;              // 門に取り付いた隊は動かない
    // 押し合いの力が行軍の足より強いと、隣の隊に阻まれて一歩も進めなくなる。
    const cap = MAP ? 12 : 40;
    const px = clamp(sx * (MAP ? 0.3 : 0.55), -cap, cap) * dt;
    const py = clamp(sy * (MAP ? 0.3 : 0.55), -cap, cap) * dt;
    if (passable(c.x + px, c.y + py)) { c.x += px; c.y += py; }
    else if (passable(c.x + px, c.y)) c.x += px;
    else if (passable(c.x, c.y + py)) c.y += py;
  }

  // 隊の来た道を覚える。はぐれた組は武将と同じ道筋を辿って戻る。
  for (const c of alive) {
    c.trailT = (c.trailT || 0) - dt;
    if (c.trailT <= 0) {
      c.trailT = 0.6;
      c.trail = c.trail || [];
      const last = c.trail[c.trail.length - 1];
      if (!last || Math.hypot(last.x - c.x, last.y - c.y) > 18) c.trail.push({ x: c.x, y: c.y });
      if (c.trail.length > 26) c.trail.shift();
    }
  }

  for (const c of alive) {
    // 壁の帯に入り込んだ隊は身動きが取れない。城の中心から遠ざかる向きへ押し出す。
    if (MAP && !passable(c.x, c.y)) {
      const ox = c.x - MAP.cx, oy = c.y - MAP.cy, od = Math.hypot(ox, oy) || 1;
      for (let k = 1; k <= 12; k++) {
        const nx = c.x + (ox / od) * k * 14, ny = c.y + (oy / od) * k * 14;
        if (passable(nx, ny)) { c.x = nx; c.y = ny; break; }
      }
    }
    const HOLD = c.order === "待機" || c.order === "守備" || c.order === "転回";
    // 城内では道順を順に辿る。行き詰まったら次の地点へ進む。
    if (c.wp && c.wp.length && !HOLD) {
      const w0 = c.wp[0];
      const d0 = Math.hypot(w0.x - c.x, w0.y - c.y);
      if (d0 < (w0.r || 40)) { c.wp.shift(); c.stuck = 0; c.lastD = null; }
      else {
        // まったく進めていないときだけ「詰まった」とみなす。
        // 他の隊に阻まれて遅いだけの場合に地点を捨てると、城壁へ突っ込んで動けなくなる。
        if (c.lastD != null && d0 > c.lastD - 0.04) c.stuck = (c.stuck || 0) + dt;
        else c.stuck = 0;
        c.lastD = d0;
        if (c.stuck > 8) {
          c.stuck = 0; c.lastD = null;
          // 地点を捨てるのではなく、いまの場所から道順を引き直す
          const gt2 = c.gate;
          const re = (MAP && gt2 && !gt2.broken && gateReachable(MAP, gt2))
            ? routeToCastleGate(MAP, gt2, c.x, c.y) : null;
          if (re && re.length) c.wp = re; else c.wp.shift();
        }
      }
      if (c.wp.length) { c.tx = c.wp[0].x; c.ty = c.wp[0].y; }
    }
    const dx = c.tx - c.x, dy = c.ty - c.y, dist = Math.hypot(dx, dy);
    if (dist > 6 && !HOLD && !(c.ambush && !c.revealed)) {
      const terr = TERRAIN[terrainAt(c.x, c.y)];
      const avgSpeed = c.squads.length ? c.squads.reduce((s, q) => s + ARM_STATS[q.type].speed * q.men, 0) / Math.max(1, corpsMen(c)) : 30;
      const engaged = c.squads.some((q) => q.engaged);
      const W = WEATHER[b.weather];
      const chg = (c.chargeT > 0 ? 1.35 : 1) * (c.reformT > 0 ? 0.55 : 1);   // 突撃中は速く、陣形替え中は鈍い
      // 隊が伸びきっていたら足を緩めて組の追いつきを待つ。
      // これをしないと、遅れた組を置き去りにして武将だけが先へ出てしまう。
      let far = 0, nq = 0;
      for (const q of c.squads) {
        if (q.men <= 0) continue;
        nq++;
        const dq = Math.hypot(q.x - c.x, q.y - c.y);
        if (dq > far) far = dq;
      }
      const room = 60 + Math.sqrt(Math.max(1, nq)) * SP * 0.7;
      // 交戦中は隊が広がるのが当たり前なので、伸びを理由に足を止めない
      const lag = engaged ? 1 : far <= room ? 1 : far > room * 1.8 ? 0.12 : 0.55;
      /* 隊は、いちばん遅い兵科の足に合わせて進む。

         これまでは兵科の平均（男数で重みをつけたもの）で進んでいた。
         槍三十四・鉄砲三十であれば平均は三十六ほどになり、鉄砲は隊についていけない。
         一度離されたら二度と追いつけず、進むほど隊が伸びて崩れていた。

         行軍とは、遅い者に合わせて歩くことである。
         ただし組み打ちの最中は隊が広がるのが当たり前なので、この縛りは掛けない。 */
      const 生きた組 = c.squads.filter((q) => q.men > 0);
      const 最も遅い足 = 生きた組.length
        ? Math.min(...生きた組.map((q) => ARM_STATS[q.type].speed)) : avgSpeed;
      const 隊の足 = engaged ? avgSpeed : Math.min(avgSpeed, 最も遅い足 * 1.12);
      const v = 隊の足 * fieldScale() * terr.speed * W.speed * chg * (engaged ? 0.35 : 1)
        * (0.6 + c.morale / 250) * (1 - c.fatigue / 240) * lag;
      const mvx = (dx / dist) * v * dt, mvy = (dy / dist) * v * dt;
      // 城壁と閉じた門は通れない。ぶつかったら壁沿いに滑る。
      let 進めた = true;
      if (passableFor(c, b, c.x + mvx, c.y + mvy)) { c.x += mvx; c.y += mvy; }
      else if (passableFor(c, b, c.x + mvx, c.y)) c.x += mvx;
      else if (passableFor(c, b, c.x, c.y + mvy)) c.y += mvy;
      else 進めた = false;
      /* 壁際に貼りついてしまったときだけ、壁から離す。

         かつては「遠くへ向かう途中」ならば毎瞬これを掛けていた。城内は壁だらけなので、
         行き先へ引く力と壁から押し返す力が毎瞬押し合い、隊は横へじりじりと流れ、
         その場に留まっていても左右に震えて見えた。
         測ったところ、隊の折り返しは百二十六秒で五百四十五回。止めると七十九回になる。

         進めたのなら貼りついてはいない。押し返す要はない。 */
      if (MAP && !進めた) {
        // 塀は薄いので、点ではなく線で調べないと見落とす
        const R = 30;
        const blocked = (ux, uy) => {
          for (let k = 1; k <= 4; k++) if (!passable(c.x + ux * k / 4, c.y + uy * k / 4)) return true;
          return false;
        };
        let rx = 0, ry = 0;
        if (blocked(R, 0)) rx -= 1;
        if (blocked(-R, 0)) rx += 1;
        if (blocked(0, R)) ry -= 1;
        if (blocked(0, -R)) ry += 1;
        if (rx || ry) {
          const rl = Math.hypot(rx, ry) || 1;
          const ax2 = (rx / rl) * 18 * dt, ay2 = (ry / rl) * 18 * dt;
          if (passable(c.x + ax2, c.y + ay2)) { c.x += ax2; c.y += ay2; }
        }
      }
      if (MAP && !passable(c.x + mvx, c.y + mvy) && !passable(c.x + mvx, c.y) && !passable(c.x, c.y + mvy)) {
        // 壁に貼りついて三方とも塞がったとき。少し壁から離れてから、壁沿いに進む。
        const ox = c.x - MAP.cx, oy = c.y - MAP.cy, od = Math.hypot(ox, oy) || 1;
        const px = c.x + (ox / od) * 12, py = c.y + (oy / od) * 12;
        if (passable(px + mvx, py + mvy)) { c.x = px + mvx; c.y = py + mvy; }
        else if (passable(px + mvx, py)) { c.x = px + mvx; c.y = py; }
        else if (passable(px, py + mvy)) { c.x = px; c.y = py + mvy; }
        else if (passable(px, py)) { c.x = px; c.y = py; }
      }
      if (c.chargeT > 0 && b.fx.length < 160 && Math.random() < dt * 6 && (c.side === "P" || c.seen)) {
        b.fx.push({ k: "dust", x: c.x - Math.cos(c.facing) * 14, y: c.y - Math.sin(c.facing) * 14, t: 0, life: 0.7 });
      }
      // 疲労：移動・登坂・渡渉・悪天候で増える（GDD 8.8）
      c.fatigue = Math.min(100, c.fatigue + (0.55 + (1 / Math.max(0.1, terr.speed) - 1) * 0.5) * W.fatigue * (c.chargeT > 0 ? 1.8 : 1) * dt);
      const want = Math.atan2(dy, dx);
      const diff = ((want - c.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      c.facing += clamp(diff, -1.4 * dt, 1.4 * dt);
      c.faceTo = null;
    } else if (c.faceTo != null) {
      // その場で向きだけ変える。統率が高いほど早く据わる。
      const diff = ((c.faceTo - c.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const rate = 0.45 + c.gen.lead / 130;
      if (Math.abs(diff) < 0.05) {
        c.facing = c.faceTo; c.faceTo = null;
        if (c.order === "転回") { c.order = "待機"; c.tx = c.x; c.ty = c.y; }
      } else {
        c.facing += clamp(diff, -rate * dt, rate * dt);
        for (const q of c.squads) q.cohesion = Math.max(0, q.cohesion - 1.3 * dt);
      }
    }
    placeSquads(c, false);
    // 「移動」は行き先へ進む命令。近くの敵に食いつくのは接戦・突撃・前進・射撃のとき。
    // 移動でも敵を追わせると、指示した場所へ着かずに流れていってしまう。
    // 「移動」は行き先へ進む命令。近くの敵に食いつくのは接戦・突撃・前進・射撃のとき。
    const aggressive = c.order === "接戦" || c.order === "突撃" || c.order === "前進" || c.order === "射撃";
    for (const q of c.squads) {
      let targetX = c.x + q.slotX, targetY = c.y + q.slotY;
      const st0 = ARM_STATS[q.type];
      if (aggressive && !c.routed && q.foe && !q.reserve) {
        const want = st0.range > 0 ? st0.range * 0.75 : 15;
        // 射撃優先では遠隔は射程を保ち、白兵は隊列を守って前へ出ない
        if (c.order === "射撃" && st0.range === 0) { /* 陣形位置を維持 */ }
        else if (q.foe.d > want) {
          const ux = (q.x - q.foe.x) / Math.max(1, q.foe.d), uy = (q.y - q.foe.y) / Math.max(1, q.foe.d);
          targetX = q.foe.x + ux * want; targetY = q.foe.y + uy * want;
        }
        // 隊列から離れられるのは持ち場の周りだけ。隊を飛び出して単独で敵へ向かわない。
        const homeX = c.x + q.slotX, homeY = c.y + q.slotY;
        const off = Math.hypot(targetX - homeX, targetY - homeY);
        // 組の第一の務めは陣形を保つこと。持ち場の周りをわずかに動くだけ。
        const leash = c.chargeT > 0 ? 24 : 14;
        if (off > leash) {
          targetX = homeX + ((targetX - homeX) / off) * leash;
          targetY = homeY + ((targetY - homeY) / off) * leash;
        }
      }
      // 隊からはぐれた組は、まず隊の来た道を辿って追いつく。追いついたら定位置へ戻る。
      const homeD = Math.hypot(q.x - targetX, q.y - targetY);
      if (homeD > 110) q.lost = true; else if (homeD < 40) q.lost = false;
      // それでも大きく離れたままなら、武将のそばへ引き戻す。
      // 壁や堀を挟んで取り残された一組が、隊全体の足を止めてしまうのを防ぐ。
      if (homeD > 190) {
        let put = null;
        for (let k = 0; k < 18 && !put; k++) {
          const ang = k * 2.399, rr = k === 0 ? 0 : 12 + k * 8;
          const nx2 = targetX + Math.cos(ang) * rr, ny2 = targetY + Math.sin(ang) * rr;
          if (passable(nx2, ny2)) put = { x: nx2, y: ny2 };
        }
        if (put) { q.x = put.x; q.y = put.y; q.lost = false; q.cohesion = Math.max(0, q.cohesion - 8); }
      }
      if (q.lost && c.trail && c.trail.length) {
        // 自分にいちばん近い道筋の点より、ひとつ隊寄りの点を目指す
        let bi = 0, bd = 1e9;
        for (let k = 0; k < c.trail.length; k++) {
          const d2 = Math.hypot(c.trail[k].x - q.x, c.trail[k].y - q.y);
          if (d2 < bd) { bd = d2; bi = k; }
        }
        const nx3 = c.trail[Math.min(c.trail.length - 1, bi + 1)];
        if (bd > 26) { targetX = c.trail[bi].x; targetY = c.trail[bi].y; }
        else { targetX = nx3.x; targetY = nx3.y; }
      }
      const qd = Math.hypot(targetX - q.x, targetY - q.y);
      const terr = TERRAIN[terrainAt(q.x, q.y)];
      if (qd > 2 && !q.engaged) {
        /* 持ち場へ追いつくための足（GDD 8.3）。

           組は自分の兵科の速さでしか歩けなかった。ところが隊そのものは
           兵科の平均で進む。鉄砲は三十、平均は三十六ほどであるから、
           遅い兵科は一度離されると二度と追いつけない。
           進むほど隊は伸び、崩れたまま戦に入っていた。

           持ち場から遅れているぶんだけ、足を速められるようにする。
           駆け足で列に戻る、というだけのことである。追いついた組は元の速さに戻り、
           行き過ぎることもない（歩幅は残りの隔たりで頭打ちにしてある）。 */
        const 遅れ = Math.hypot(q.x - (c.x + q.slotX), q.y - (c.y + q.slotY));
        const 追いつき = c.routed ? 1 : clamp(1 + 遅れ / 34, 1, 2.4);
        const v = st0.speed * 追いつき * fieldScale() * terr.speed * (q.type === "kiba" ? terr.horse : 1) * WEATHER[b.weather].speed * (0.7 + q.cohesion / 300);
        const sx = ((targetX - q.x) / qd) * Math.min(v * dt, qd);
        const sy = ((targetY - q.y) / qd) * Math.min(v * dt, qd);
        if (passableFor(c, b, q.x + sx, q.y + sy)) { q.x += sx; q.y += sy; }
        else if (passableFor(c, b, q.x + sx, q.y)) q.x += sx;
        else if (passableFor(c, b, q.x, q.y + sy)) q.y += sy;
        const base = q.foe && q.foe.d < 140 ? Math.atan2(q.foe.y - q.y, q.foe.x - q.x) : c.facing;
        q.facing = base + q.ja * Math.pow(q.dis || 0, 2.4) * 0.85;   // 乱れて初めて向きがずれる
        /* 行軍のあいだの陣形維持（GDD 8.3）。

           これまでは、歩けば毎秒じわじわ減るだけで、歩きながら整える道がなかった。
           平地でも百秒で零、森なら二十四秒で零になる。零になれば足は三割落ち、
           崩れがまた遅れを呼び、隊は崩れたまま戦に入っていた。

           行軍とは陣形が壊れていく過程ではない。良い地なら隊列は保てるし、
           悪路や川では乱れる。そこで「その地で落ち着く先」を置き、そこへ寄せる。
           平地では将の統率しだいで七割前後に落ち着き、森や湿地ではもっと下がる。 */
        const 落ち着く先 = clamp(52 + c.gen.lead * 0.28 + terr.cohesion * 4, 12, 92);
        q.cohesion += ((落ち着く先 - q.cohesion) * 0.10 + terr.cohesion * 0.25) * dt;
      } else {
        // 統率が陣形維持の回復に効く。疲労が回復を鈍らせる（GDD 6.1 / 8.8）
        const rec = (1.2 + c.gen.lead / 40) * (q.engaged ? 0.15 : 1) * (1 - c.fatigue / 200);
        q.cohesion += (rec + terr.cohesion * 0.25) * dt;
      }
      q.cohesion = clamp(q.cohesion, 0, 100);
      q.cool -= dt; q.engaged = false;
    }
  }

  // 城門を破る（GDD 9.3）。門の間口は狭く、取り付けるのは一隊だけ。
  // 残りは控えに回り、取り付いた隊が疲れれば入れ替わる。
  if (MAP) {
    // 隊の代表点は壁を越えて動くので、実際の兵の重心で判る
    for (const c of alive) {
      let sx = 0, sy = 0, n2 = 0;
      for (const q of c.squads) { if (q.men <= 0) continue; sx += q.x * q.men; sy += q.y * q.men; n2 += q.men; }
      c.mx = n2 ? sx / n2 : c.x; c.my = n2 ? sy / n2 : c.y;
    }
    const atkC = alive.filter((c) => c.side === b.attacker && !c.routed && !c.withdraw);
    const defC = alive.filter((c) => c.side !== b.attacker && !c.routed);
    const attached = new Set();
    for (const l of MAP.layers) for (const g of l.gates) {
      if (g.broken) { g.slot = null; g.hold = null; g.def = 0; continue; }
      const gp = gatePos(MAP, l, g);
      const R = 104 * (FIELD.w / BASE.w);
      const near = atkC.filter((c) => (c.gate === g || !c.gate)
        && Math.hypot((c.mx == null ? c.x : c.mx) - gp.x, (c.my == null ? c.y : c.my) - gp.y) < R);
      // 内側で門を支える城方の兵。多いほど門は破れない。
      const a2 = axisOf(l, g);
      const ins = fromUV(MAP, a2, g.off, a2.half - 52 * (FIELD.w / BASE.w));
      g.def = defC.filter((c) => Math.hypot((c.mx == null ? c.x : c.mx) - ins.x, (c.my == null ? c.y : c.my) - ins.y) < 120 * (FIELD.w / BASE.w))
        .reduce((t2, c) => t2 + corpsMen(c), 0);
      if (!near.length) { g.slot = null; g.hold = null; continue; }
      if (!g.slot || !near.some((c) => c.id === g.slot)) {
        // 破城槌を担ぐ隊が先手。次に疲れの少ない大きな隊。
        const pick = [...near].sort((x, y2) =>
          ((SIEGE_KIT[y2.kit] ? SIEGE_KIT[y2.kit].gate : 1) - (SIEGE_KIT[x.kit] ? SIEGE_KIT[x.kit].gate : 1))
          || ((x.gateFat || 0) - (y2.gateFat || 0)) || (corpsMen(y2) - corpsMen(x)))[0];
        if (g.slot) b.log.push({ t: b.t, text: `${pick.gen.name}隊が${g.key}に取り付いた。` });
        g.slot = pick.id;
      }
      const holder = near.find((c) => c.id === g.slot);
      if (!holder) continue;
      attached.add(holder.id); g.hold = holder.gen.name;
      // 取り付いた隊は門の前に据わる。押し合いで少しずつ流されて、
      // いつのまにか門から離れてしまわないようにする。
      const a3 = axisOf(l, g);
      const stand = fromUV(MAP, a3, g.off, a3.half + MAP.t + 22);
      // 別の命令を受けた隊は据え置かない（門の前で操作できなくなるのを防ぐ）
      if (holder.gate === g && !holder.wp) {
        holder.tx = stand.x; holder.ty = stand.y;
        holder.pinned = true;
      }
      holder.gateFat = Math.min(100, (holder.gateFat || 0) + 5.0 * dt);
      holder.morale = Math.min(100, holder.morale + 0.40 * dt);   // 破れる手応えが士気を支える
      const men = corpsMen(holder);
      const eff = 1 - (holder.gateFat / 100) * 0.66;
      // 内から支える兵が門を保たせる。ただし支える側も無傷では済まない。
      const push = men / (men + g.def * 1.1);
      const kit = SIEGE_KIT[holder.kit] || SIEGE_KIT["なし"];
      g.hp -= men * 0.016 * kit.gate * eff * push * (b.gateParty ? 1.25 : 1) * dt;
      // 門を隔てた押し合いは、支える城方にも損害を与える。
      // これがないと、城方は門に張りつくだけで日暮れまで凌げてしまう。
      if (g.def > 0) {
        const a4 = axisOf(l, g);
        const ins2 = fromUV(MAP, a4, g.off, a4.half - 52 * (FIELD.w / BASE.w));
        const guards = defC.filter((c2) => Math.hypot((c2.mx == null ? c2.x : c2.mx) - ins2.x,
          (c2.my == null ? c2.y : c2.my) - ins2.y) < 120 * (FIELD.w / BASE.w));
        let hurt = men * 0.0016 * eff * dt;
        for (const c2 of guards) {
          const share = hurt / guards.length;
          let left2 = share;
          for (const q2 of c2.squads) {
            if (left2 <= 0) break;
            if (q2.men <= 0) continue;
            const take = Math.min(q2.men, left2);
            q2.men -= take; left2 -= take;
          }
          c2.morale -= share / Math.max(1, corpsMax(c2)) * 90;
        }
      }
      if (b.fx.length < 160 && Math.random() < dt * 3) b.fx.push({ k: "clash", x: gp.x, y: gp.y, t: 0, life: 0.3, big: true });
      if (holder.gateFat > 70) {
        const next = near.filter((c) => c.id !== holder.id && (c.gateFat || 0) < 32)
          .sort((x, y2) => ((SIEGE_KIT[y2.kit] ? SIEGE_KIT[y2.kit].gate : 1) - (SIEGE_KIT[x.kit] ? SIEGE_KIT[x.kit].gate : 1))
            || ((x.gateFat || 0) - (y2.gateFat || 0)))[0];
        if (next) {
          g.slot = next.id;
          b.log.push({ t: b.t, text: `${holder.gen.name}隊が疲れ、${next.gen.name}隊と入れ替わった。` });
        }
      }
      if (g.hp <= 0) {
        g.hp = 0; g.broken = true; g.slot = null; g.hold = null;
        b.mapDirty = true; MAP.nav = null;        // 通れる場所が変わった
        notify(b, `${g.key}が破られた。`, b.attacker === "P" ? "good" : "bad");
        for (const o of alive) {
          if (o.side !== b.attacker) o.morale -= 8;
          else o.morale = Math.min(100, o.morale + 5);
        }
      }
    }
    for (const c of atkC) {
      if (!attached.has(c.id)) { c.gateFat = Math.max(0, (c.gateFat || 0) - 3.4 * dt); c.pinned = false; }
    }
    // 委任された隊は、門を破ったらより内側の近い門へ自ら向かう
    for (const c of atkC) {
      if (c.side === "P" && !c.auto) continue;
      const cur = c.gate;
      if (cur && !cur.broken && gateReachable(MAP, cur)) continue;
      const nx = nearestOpenGate(MAP, c.mx == null ? c.x : c.mx, c.my == null ? c.y : c.my);
      if (!nx || nx === cur) continue;
      c.gate = nx; c.pinned = false;
      const wp = routeToCastleGate(MAP, nx, c.x, c.y);
      if (wp.length) { c.wp = wp; c.tx = wp[0].x; c.ty = wp[0].y; c.order = "前進"; c.stuck = 0; c.lastD = null; }
      b.log.push({ t: b.t, text: `${c.gen.name}隊は${nx.key}へ向かう。` });
    }
    // 道順が尽きたのに門から遠いままの隊は、道順を組み直す
    for (const c of atkC) {
      if (c.wp && c.wp.length) continue;
      const gt = c.gate;
      if (!gt || gt.broken || !gateReachable(MAP, gt)) continue;
      const gp = gatePos(MAP, MAP.layers[gt.layer], gt);
      if (Math.hypot(c.x - gp.x, c.y - gp.y) < 130) continue;
      c.reroute = (c.reroute || 0) - dt;
      if (c.reroute > 0) continue;
      c.reroute = 5;
      const wp = routeToCastleGate(MAP, gt, c.x, c.y);
      if (wp.length) { c.wp = wp; c.tx = wp[0].x; c.ty = wp[0].y; c.stuck = 0; c.lastD = null; }
    }

    // ── 城内の施設 ──
    const fsN = FIELD.w / BASE.w;
    for (const f of MAP.fac) {
      if (f.hp <= 0) continue;
      if (f.kind === "矢倉") {
        // 近づいた寄せ手を射て兵を削る。竹束を担いだ隊は被害が軽い。
        f.cool -= dt;
        if (f.cool <= 0) {
          const tgt = atkC.filter((c) => Math.hypot(c.x - f.x, c.y - f.y) < 165 * fsN)
            .sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
          if (tgt) {
            f.cool = 3.4;
            const kit = SIEGE_KIT[tgt.kit] || SIEGE_KIT["なし"];
            let hit = 9 * kit.guard;
            const qs = tgt.squads.filter((q) => q.men > 0)
              .sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y));
            for (const q of qs) {
              if (hit <= 0) break;
              const take = Math.min(q.men, hit);
              q.men -= take; hit -= take;
              q.cohesion = Math.max(0, q.cohesion - 3);
            }
            tgt.morale -= 0.45;
            if (b.fx.length < 160) b.fx.push({ k: "shot", x: f.x, y: f.y, x2: qs[0] ? qs[0].x : tgt.x, y2: qs[0] ? qs[0].y : tgt.y, t: 0, life: 0.28 });
          }
        }
      } else if (!MAP.layers[f.layer].gates.some((g) => g.broken)) {
        // 陣鐘は城方を励まし、寄せ手をじわじわ削る。曲輪を抜かれれば鳴りやむ。
        for (const c of defC) c.morale = Math.min(100, c.morale + 0.22 * dt);
        for (const c of atkC) c.morale -= 0.045 * dt;
      }
      // 寄せ手は施設を崩せる。取り付けば早く、射かければ遅い。
      let dmg = 0;
      for (const c of atkC) {
        if (Math.hypot((c.mx == null ? c.x : c.mx) - f.x, (c.my == null ? c.y : c.my) - f.y) > 260 * fsN) continue;
        const kit = SIEGE_KIT[c.kit] || SIEGE_KIT["なし"];
        for (const q of c.squads) {
          if (q.men <= 0) continue;
          const dq = Math.hypot(q.x - f.x, q.y - f.y);
          const st = ARM_STATS[q.type];
          if (dq < f.r + 30 * fsN) dmg += q.men * 0.011 * dt;
          else if (st.range > 0 && dq < st.range * 1.05) dmg += q.men * 0.0042 * (kit.shoot || 1) * dt;
        }
      }
      if (dmg > 0) {
        f.hp -= dmg;
        if (f.hp <= 0) {
          f.hp = 0; b.mapDirty = true; MAP.nav = null;
          b.log.push({ t: b.t, text: `${f.name}を崩した。` });
          if (f.kind === "矢倉") { for (const c of atkC) c.morale = Math.min(100, c.morale + 3); }
          else { for (const c of defC) c.morale -= 8; for (const c of atkC) c.morale = Math.min(100, c.morale + 5); }
        }
      }
    }
    // 城の傾き。門と曲輪を失うほど城方は士気を保てない（GDD 9.3）
    // どの曲輪まで抜かれたかで測る。同じ曲輪の門をいくつ破っても、深さは変わらない。
    let deepest = -1;
    for (const l of MAP.layers) if (l.gates.some((g) => g.broken)) deepest = Math.max(deepest, l.i);
    const bw = deepest + 1, tw = MAP.layers.length;
    const hon = MAP.layers[MAP.layers.length - 1];
    const inL = (i) => atkC.some((c) => inRect((c.mx == null ? c.x : c.mx) - MAP.cx, (c.my == null ? c.y : c.my) - MAP.cy, MAP.layers[i].hw, MAP.layers[i].hh));
    const deep = inL(MAP.layers.length - 1) ? 0.44 : MAP.layers.length > 2 && inL(MAP.layers.length - 2) ? 0.22 : 0.06;
    const fLost = MAP.fac.length ? MAP.fac.filter((f) => f.hp <= 0).length / MAP.fac.length : 0;
    b.press = clamp((bw / tw) * 0.52 + fLost * 0.14 + deep, 0, 1);
    const cap = 100 - 82 * b.press;
    for (const c of defC) {
      c.morale = Math.min(c.morale, cap);
      if (inL(MAP.layers.length - 1)) c.morale = Math.max(0, c.morale - 2.6 * dt);
    }
  }

  // side ごとに格子へ振り分け、近傍だけを調べる
  const CS = 90;
  const grids = { P: new Map(), E: new Map() };
  for (const c of alive) {
    if (c.ambush && !c.revealed) continue;
    const gmap = grids[c.side];
    for (const q of c.squads) {
      if (q.men <= 0) continue;
      const k = ((q.x / CS) | 0) + "," + ((q.y / CS) | 0);
      let arr = gmap.get(k);
      if (!arr) { arr = []; gmap.set(k, arr); }
      arr.push([c, q]);
    }
  }
  // 城攻めでは、壁や閉じた門を隔てた相手とは戦えない
  const wallBetween = (x1, y1, x2, y2) => {
    if (!MAP) return false;
    if (Math.abs(x2 - x1) + Math.abs(y2 - y1) < 22) return false;   // 目と鼻の先は調べるまでもない
    for (let k = 1; k <= 2; k++) {
      const t2 = k / 3;
      const tt = terrainAt(x1 + (x2 - x1) * t2, y1 + (y2 - y1) * t2);
      if (tt === "wall" || tt === "gate" || tt === "tower") return true;
    }
    return false;
  };
  const nearestFoeSquad = (c, q) => {
    const gmap = grids[c.side === "P" ? "E" : "P"];
    const cx = (q.x / CS) | 0, cy = (q.y / CS) | 0;
    let best = null, bd = 1e9;
    for (let ring = 0; ring <= 3; ring++) {
      for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const arr = gmap.get((cx + dx) + "," + (cy + dy));
        if (!arr) continue;
        for (const [f, e] of arr) {
          const d = Math.hypot(e.x - q.x, e.y - q.y);
          if (d < bd) { bd = d; best = { f, e, d }; }
        }
      }
      if (best && bd <= ring * CS) break;      // この輪より外に、より近い敵はいない
    }
    // 壁や閉じた門を隔てていれば、その相手とは戦えない
    if (best && MAP && wallBetween(q.x, q.y, best.e.x, best.e.y)) return [null, 1e9];
    return best ? [best, bd] : [null, 1e9];
  };
  for (const c of alive) {
    for (const q of c.squads) {
      if (q.men <= 0) continue;
      const st = ARM_STATS[q.type];
      const [melee, mdist] = nearestFoeSquad(c, q);
      q.foe = melee ? { x: melee.e.x, y: melee.e.y, d: mdist } : null;
      q.link = null;
      if (!melee) continue;
      const terr = TERRAIN[terrainAt(q.x, q.y)];
      if (mdist < 22) {
        q.engaged = true; melee.e.engaged = true;
        q.link = { x: melee.e.x, y: melee.e.y };        // 組み合っている相手
        // 接戦中の組は互いへ少し詰め寄る。隊列は保ったまま噛み合いが見えるようにする。
        const pull = 2.2 * dt;
        const ax = ((melee.e.x - q.x) / Math.max(1, mdist)) * pull;
        const ay = ((melee.e.y - q.y) / Math.max(1, mdist)) * pull;
        if (passable(q.x + ax, q.y + ay)) { q.x += ax; q.y += ay; }
        else if (passable(q.x + ax, q.y)) q.x += ax;
        else if (passable(q.x, q.y + ay)) q.y += ay;
        // 接戦の火花。見づらくならないよう間引いて出す。
        if (b.fx.length < 160 && Math.random() < dt * 2.4 && (c.side === "P" || c.seen)) {
          b.fx.push({ k: "clash", x: (q.x + melee.e.x) / 2, y: (q.y + melee.e.y) / 2, t: 0,
            life: 0.34, big: c.chargeT > 0 });
        }
        const ang = Math.atan2(q.y - melee.e.y, q.x - melee.e.x);
        const rel = Math.abs(((ang - melee.e.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        const flank = rel > 2.2 ? 2.0 : rel > 1.1 ? 1.45 : 1.0;
        const charge = q.type === "kiba" && terr.charge ? 1 + c.gen.valor / 260 : 1;
        const push = c.chargeT > 0 && terr.charge ? 1.3 : 1;              // 突撃中の圧力
        const guard = melee.f.order === "守備" ? 0.85 : 1;                 // 密集して守る側は硬い
        applyDamage(b, melee.f, melee.e,
          st.melee * (q.men / 50) * (0.45 + q.cohesion / 160) * (0.6 + c.morale / 200)
          * terr.fight * flank * charge * push * guard * (1 - c.fatigue / 260) * dt,
          flank, c.gen.valor * (c.chargeT > 0 ? 1.2 : 1));
      } else if (st.range > 0 && mdist < st.range && q.cool <= 0) {
        if (melee.f.seen || mdist < TERRAIN[terrainAt(melee.e.x, melee.e.y)].sight * fieldScale()) {
          q.cool = st.rof;
          q.aim = { x: melee.e.x, y: melee.e.y, t: b.t };   // 狙っている相手
          if (b.fx.length < 160 && (c.side === "P" || c.seen)) {
            b.fx.push({ k: q.type === "teppo" ? "shot" : "arrow", x: q.x, y: q.y,
              x2: melee.e.x, y2: melee.e.y, t: 0, life: q.type === "teppo" ? 0.3 : 0.45 });
          }
          const wet = q.type === "teppo" ? WEATHER[b.weather].teppo : 1;
          applyDamage(b, melee.f, melee.e, st.vol * wet * (q.men / 50) * (0.5 + q.cohesion / 150) * terr.fight, 1, c.gen.valor);
        }
      }
    }
  }

  for (const c of alive) {
    const ratio = corpsMen(c) / Math.max(1, corpsMax(c));
    const fighting = c.squads.some((q) => q.engaged);
    // 陣形を変えている間は隊列が乱れ、動きも鈍る
    if (c.reformT > 0) {
      c.reformT -= dt;
      for (const q of c.squads) q.cohesion = Math.max(0, q.cohesion - 1.6 * dt);
    }
    // 突撃は長く続かない。時間が切れれば通常の接戦へ戻る。
    if (c.chargeT > 0) {
      c.chargeT -= dt;
      const wear = c.formation === "鋒矢" ? 1.0 : 2.2;
      for (const q of c.squads) q.cohesion = Math.max(0, q.cohesion - wear * dt);
      if (c.chargeT <= 0) { c.chargeT = 0; if (c.order === "突撃") c.order = "接戦"; }
    }
    if (c.order === "守備") for (const q of c.squads) q.cohesion = Math.min(100, q.cohesion + 1.1 * dt);
    // 前線が薄くなれば予備隊を繰り上げる
    const front = c.squads.filter((q) => !q.reserve && q.men > 0).length;
    const res = c.squads.filter((q) => q.reserve && q.men > 0);
    if (res.length && front < c.squads.filter((q) => !q.reserve).length * 0.55) {
      res[0].reserve = false;
      if (!c.feats.includes("予備投入")) c.feats.push("予備投入");
    }
    // 総大将が前線に出ているか（敵との距離・接戦・射撃圏内）
    if (c.gen.lord && !c.detach) {
      const near = alive.some((o) => o.side !== c.side && Math.hypot(o.x - c.x, o.y - c.y) < 190);
      if (near || fighting) c.frontTime = (c.frontTime || 0) + dt;
    }
    c.fatigue = clamp(c.fatigue + (fighting ? 1.1 : c.order === "待機" ? -1.4 : 0) * dt, 0, 100);
    if (c.pinch >= 2) c.morale -= (c.pinch - 1) * 0.22 * dt;   // 挟まれると士気がじわりと落ちる
    // 総大将が前線に出れば全軍の士気が上がる（GDD 8.7）
    const near = alive.some((o) => o.side === c.side && o.gen.lord && Math.hypot(o.x - c.x, o.y - c.y) < 260);
    c.morale = clamp(c.morale + ((ratio - 0.6) * 1.2 + (near ? 0.35 : 0) + c.gen.lead / 300 - 0.25) * dt, 0, 100);
    if (!c.routed && !c.boxed && fighting) {
      if ((c.pinch || 0) >= 3) {
        c.boxed = true; c.formation = "方陣"; placeSquads(c, false);
        b.log.push({ t: b.t, text: `${c.name}隊が包囲されかけ、方陣で密集防御に移った。` });
        c.feats.push("密集防御");
      }
    }
    if (!c.routed && (c.morale < 15 || ratio < 0.25)) {
      c.routed = true; c.order = "敗走";
      notify(b, `${c.gen.name}隊が崩れ、敗走した。`, c.side === "P" ? "bad" : "good"); c.tx = c.x; c.ty = c.side === "P" ? FIELD.h + 120 : -120;
      b.log.push({ t: b.t, text: `${c.name}隊が崩れ、敗走に移った。` });
      for (const o of alive) if (o.side === c.side && Math.hypot(o.x - c.x, o.y - c.y) < 200) o.morale -= 9;
    }
    if (c.routed || c.withdraw) {
      c.ty = c.side === "P" ? FIELD.h + 120 : -120;
      // 戦場の外へ落ち延びた隊は退場させる。横に抜けた場合も見落とさない。
      if (c.y > FIELD.h + 60 || c.y < -60 || c.x > FIELD.w + 60 || c.x < -60) c.dead = true;
    }
    if (corpsMen(c) <= 0 && !c.destroyed) {
      c.destroyed = true; c.order = "待機";
      notify(b, `${c.gen.name}隊は壊滅した。`, c.side === "P" ? "bad" : "good");
      b.log.push({ t: b.t, text: `${c.name}隊は壊滅した。` });
    }
  }

  const pm = b.corps.filter((c) => c.side === "P" && !c.dead && !c.routed && !c.withdraw).reduce((s, c) => s + corpsMen(c), 0);
  const em = b.corps.filter((c) => c.side === "E" && !c.dead && !c.routed && !c.withdraw).reduce((s, c) => s + corpsMen(c), 0);
  // 本丸を押さえれば城は落ちる（GDD 9.3）
  if (MAP) {
    const h = MAP.layers[MAP.layers.length - 1];
    // 本丸に「兵が」入っているかで見る。隊の代表点だけでは壁の内と外を取り違える。
    const inHon = (c) => c.squads.some((q) => q.men > 0 && inRect(q.x - MAP.cx, q.y - MAP.cy, h.hw, h.hh));
    const atk = b.corps.some((c) => !c.dead && !c.destroyed && !c.routed && c.side === b.attacker && inHon(c));
    const def = b.corps.some((c) => !c.dead && !c.destroyed && !c.routed && c.side !== b.attacker && inHon(c));
    if (atk && !def) {
      b.hold = (b.hold || 0) + dt;
      if (b.hold > 12) {
        b.phase = "over"; b.result = b.attacker; b.captured = true;
        notify(b, "本丸を押さえた。城は落ちた。", b.attacker === "P" ? "good" : "bad");
        b.log.push({ t: b.t, text: "本丸を押さえた。城は落ちた。" });
        return;
      }
    } else b.hold = 0;
  }
  // 日没。攻撃側だけを一律敗北にはせず、両軍が兵を退く（GDD 8.8）
  if (b.t >= b.dusk) {
    b.phase = "over"; b.orderly = true;
    if (MAP) {
      // 城攻めは日暮れで打ち切り。城は落ちず、寄せ手は囲みへ戻る。
      b.result = b.attacker === "P" ? "E" : "P";
      b.log.push({ t: b.t, text: "日が暮れた。城は落ちず、寄せ手は囲みへ戻った。" });
    } else {
      b.result = "日没";
      b.log.push({ t: b.t, text: "日が落ちた。両軍とも兵を退いた。" });
    }
    return;
  }
  if (b.retreat === "P" && pm === 0) { b.phase = "over"; b.result = "E"; b.orderly = true; return; }
  // 城攻めの決着は野戦とは違う。城が落ちるか、寄せ手が攻めきれずに退くか。
  if (MAP) {
    const atkSide = b.attacker, defSide = atkSide === "P" ? "E" : "P";
    const atkEff = atkSide === "P" ? pm : em, defEff = atkSide === "P" ? em : pm;
    const atk0 = atkSide === "P" ? b.initial.P : b.initial.E;
    const def0 = atkSide === "P" ? b.initial.E : b.initial.P;
    if (atkEff <= atk0 * 0.3 || atkEff === 0) {
      b.phase = "over"; b.result = defSide; b.orderly = true;
      notify(b, "寄せ手は攻めきれず、囲みへ退いた。", defSide === "P" ? "good" : "bad");
      return;
    }
    if (defEff <= def0 * 0.22 || defEff === 0) {
      b.phase = "over"; b.result = atkSide; b.opened = true;
      notify(b, "城方は支えきれず、城を開いた。", atkSide === "P" ? "good" : "bad");
      return;
    }
    return;
  }
  if (pm <= b.initial.P * 0.3 || em <= b.initial.E * 0.3 || pm === 0 || em === 0) {
    b.phase = "over"; b.result = pm > em ? "P" : "E";
  }
}
