import { MAP, axisOf, fromUV, gatePos } from "./castleMap.js";
import { ARM_STATS, FORESTS, HILLS, MAX_CORPS_MEN, RIVER, VILLAGES, WOODS, fieldScale, hasRiver, nearestOf, riverShift, terrainAt } from "./field.js";
import { clamp } from "../core/util.js";
import { ARMS } from "../data/roads.js";
import { FIELD, passable } from "./field.js";

export const FORMATIONS = ["横陣", "鶴翼", "魚鱗", "鋒矢", "雁行", "方陣", "長蛇"];

// 陣形は数値補正ではなく50人組の実配置。兵科ごとに置きたい位置を持たせる（GDD 8.4）
// wx＝中央0〜翼1、wy＝前0〜後1。原点からの距離は直属を内側へ寄せるのに使う。
export const FORM_ROLE = {
  横陣: { yari: [0.35, 0.10], kiba: [0.90, 0.30], yumi: [0.30, 0.80], teppo: [0.20, 0.72] },
  鶴翼: { yari: [0.45, 0.15], kiba: [1.00, 0.45], yumi: [0.25, 0.70], teppo: [0.15, 0.62] },
  魚鱗: { yari: [0.30, 0.08], kiba: [0.25, 0.05], yumi: [0.35, 0.85], teppo: [0.25, 0.75] },
  鋒矢: { yari: [0.20, 0.10], kiba: [0.10, 0.02], yumi: [0.45, 0.92], teppo: [0.35, 0.85] },
  雁行: { yari: [0.35, 0.20], kiba: [0.95, 0.35], yumi: [0.30, 0.80], teppo: [0.20, 0.70] },
  方陣: { yari: [0.90, 0.30], kiba: [0.55, 0.75], yumi: [0.20, 0.50], teppo: [0.15, 0.45] },
  長蛇: { yari: [0.40, 0.15], kiba: [0.40, 0.55], yumi: [0.35, 0.85], teppo: [0.30, 0.78] },
};

// 陣形の組み直しにかかる時間。統率が高いほど速い（最大6秒）
export const reformTime = (gen) => clamp(7.6 - (gen ? gen.lead : 55) / 16, 2.0, 6.0);

export const FORM_NOTE = {
  横陣: "正面が広く、多くの組が同時に槍を合わせられる。側面は薄い。",
  鶴翼: "両翼を前へ張り出して敵を包み込む。中央は薄く、押し込まれると崩れやすい。",
  魚鱗: "先端に槍と騎馬を集めて一点を破る。正面は狭く、側面を突かれやすい。",
  鋒矢: "矢尻に騎馬を置いて一点へ突き入る突撃専用の陣。突撃が長く続き隊列も崩れにくいが、守りは最も薄い。",
  雁行: "斜めに構え、片翼を前に出す。移動しながら当たるのに向く。",
  方陣: "四方に槍を向けて密集する。包囲や乱戦に強いが、攻めは鈍い。",
  長蛇: "縦一列。狭い道や渡河には向くが、横から突かれると総崩れになる。",
};


export function rot(sx, sy, th) {
  const c = Math.cos(th), s = Math.sin(th);
  return [-sx * s - sy * c, sx * c - sy * s];
}

// 50人組の占める幅（10人駒5個ぶん）に合わせ、組と組が隙間なく並ぶ間隔にする。
export const KOMA = 5.0;                 // 10人駒の間隔

export const SP = 5 * KOMA + 2;          // 50人組の横間隔 ≒ 組の幅

export const ROW = KOMA + 6;             // 列（段）の間隔

export function layoutSlots(form, n) {
  const s = [];
  if (form === "横陣") {
    const want = clamp(Math.round(Math.sqrt(n * 2.2)), 3, 22);   // 組数が増えるほど正面を広げる
    const per = Math.max(3, Math.ceil(n / Math.max(1, Math.ceil(n / want))));
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / per), col = i % per, cols = Math.min(per, n - row * per);
      s.push({ x: (col - (cols - 1) / 2) * SP, y: row * ROW, row });
    }
  } else if (form === "鶴翼") {
    // 中央を引き、両翼を前へ張り出して敵を包む（敵に対してV字に開く）
    const per = clamp(Math.round(Math.sqrt(n * 3)), 4, 26);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / per), idx = i % per, cols = Math.min(per, n - row * per);
      const k = idx - (cols - 1) / 2;
      s.push({ x: k * SP, y: -Math.abs(k) * ROW * 0.62 + row * ROW * 1.2, row });
    }
  } else if (form === "鋒矢") {
    // 先端に一組、その後ろへ左右へ開きながら二列。矢尻から矢柄へと続く形。
    s.push({ x: 0, y: 0, row: 0 });
    let i = 1, row = 1;
    while (i < n) {
      const spread = Math.min(row, 4) * SP * 0.5;   // 矢尻は四段までで開き切り、以降は矢柄が伸びる
      for (const side of [-1, 1]) {
        if (i >= n) break;
        s.push({ x: side * spread, y: row * ROW * 0.95, row });
        i++;
      }
      if (i < n) { s.push({ x: 0, y: row * ROW * 0.95, row }); i++; }
      row++;
    }
  } else if (form === "魚鱗") {
    let i = 0, row = 0;
    while (i < n) { const cnt = row + 1; for (let j = 0; j < cnt && i < n; j++, i++) s.push({ x: (j - (cnt - 1) / 2) * SP, y: row * ROW, row }); row++; }
  } else if (form === "雁行") {
    const per = Math.min(10, n);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / per), idx = i % per, cols = Math.min(per, n - row * per);
      s.push({ x: (idx - (cols - 1) / 2) * SP * 0.9, y: idx * ROW * 0.45 + row * ROW * 1.3, row });
    }
  } else if (form === "方陣") {
    const side = Math.ceil(Math.sqrt(n));
    for (let i = 0; i < n; i++) { const r = Math.floor(i / side), c = i % side; s.push({ x: (c - (side - 1) / 2) * SP, y: (r - (side - 1) / 2) * ROW, row: r }); }
  } else { for (let i = 0; i < n; i++) s.push({ x: 0, y: i * ROW, row: i }); }
  return s;
}

export function makeCorps(side, gen, retinue, local, retTrain, localTrain, x, y, facing, color) {
  // 一隊が抱えられる兵には限りがある。あふれた分は隊として立てられない。
  const over = Math.max(0, retinue + local - MAX_CORPS_MEN);
  if (over > 0) {
    const cutLocal = Math.min(local, over);
    local -= cutLocal;
    retinue -= (over - cutLocal);
  }
  const squads = []; let sid = 0;
  // 名簿があればそれを使う。なければ総数から組み立てる（旧いセーブや守備隊など）。
  const build = (total, origin, train, rost) => {
    const list = rost && rost.length
      ? rost.map((q) => ({ men: q.m, type: q.t, src: q.id }))
      : (() => {
          const out = [];
          for (const a of ARMS) {
            let men = Math.round(total * a.ratio);
            while (men > 0) { const m = Math.min(50, men); out.push({ men: m, type: a.key, src: null }); men -= m; }
          }
          return out;
        })();
    for (const u of list) {
        const m = u.men;
        if (m <= 0) continue;
        const ang = Math.random() * Math.PI * 2;
        squads.push({
          id: `${gen.id}-${sid++}`, type: u.type, men: m, max: m, origin, src: u.src,
          cohesion: clamp(train + (Math.random() * 12 - 6), 20, 100),
          x, y, facing, cool: 0, engaged: false, foe: null, link: null, aim: null,
          // 乱れは毎フレーム無作為化せず、この固定した「乱れ目標」へ補間する（GDD 8.3）
          jx: Math.cos(ang), jy: Math.sin(ang), ja: Math.random() * 2 - 1, seed: Math.random() * 1000,
        });
    }
  };
  build(retinue, "直属", retTrain, gen.rost);
  build(local, "地域", localTrain, gen.locRost);
  return {
    id: gen.id, side, gen, name: gen.name, color, x, y, facing, order: "待機",
    auto: true,                          // 委任。大名は諸隊に差配を委ねて戦を始める
    tx: x, ty: y, formation: "横陣", morale: 78 + gen.lead * 0.15,
    squads, routed: false, dead: false, destroyed: false, ambush: false, revealed: true,
    lastSeen: null, seen: false, loss: { 直属: 0, 地域: 0 }, feats: [],
    fatigue: 0, chargeT: 0, reformT: 0, faceTo: null, pending: null, pinch: 0, northStart: hasRiver() && y < RIVER.top,
    bank0: hasRiver() ? (y < (RIVER.top + RIVER.bot) / 2 + riverShift(x) ? -1 : 1) : 0, detach: false, parentId: null, task: null, autonomous: false, boxed: false,
  };
}

export const corpsMen = (c) => c.squads.reduce((s, q) => s + q.men, 0);

export const corpsMax = (c) => c.squads.reduce((s, q) => s + q.max, 0);


export function placeSquads(c, snap) {
  // 各組の定位置は陣形が決まった時点のもの。毎瞬間は割り当て直さない。
  const live = c.squads.filter((q) => q.men > 0).length;
  const key = `${c.formation}|${live}|${c.order === "突撃" ? "c" : "n"}`;
  if (!snap && c.slotKey === key) return;
  c.slotKey = key;
  const slots = layoutSlots(c.formation, c.squads.length);
  // 各位置を「翼か中央か」「前か後か」「武将からの近さ」で表し、
  // 兵科ごとの置きたい位置と、直属を武将周りに寄せる要請から割り当てる。
  const maxX = Math.max(1, ...slots.map((x) => Math.abs(x.x)));
  const minY = Math.min(...slots.map((x) => x.y)), maxY = Math.max(...slots.map((x) => x.y));
  const spanY = Math.max(1, maxY - minY);
  const cy0 = slots.reduce((a, x) => a + x.y, 0) / Math.max(1, slots.length);
  const feat = slots.map((sl) => ({
    fx: Math.abs(sl.x) / maxX, fy: (sl.y - minY) / spanY,
    fd: Math.hypot(sl.x, sl.y - cy0) / Math.max(1, Math.hypot(maxX, spanY / 2)),
  }));
  // 突撃のときは騎馬を前に立てる。組が飛び出すのではなく、陣形の中の持ち場が入れ替わる。
  const CHARGE_ROLE = { yari: [0.40, 0.42], kiba: [0.44, 0.08], yumi: [0.34, 0.88], teppo: [0.30, 0.82] };
  const role = c.order === "突撃" ? CHARGE_ROLE : (FORM_ROLE[c.formation] || FORM_ROLE["横陣"]);
  const cost = (q, i) => {
    const w = role[q.type] || [0.4, 0.4];
    const f = feat[i];
    return (f.fx - w[0]) ** 2 + (f.fy - w[1]) ** 2 + (q.origin === "直属" ? f.fd * 0.55 : -f.fd * 0.35);
  };
  const free = slots.map((_, i) => i);
  const queue = [...c.squads].sort((a, z) => {
    const pri = (q) => (q.origin === "直属" ? 0 : 1) * 10 + (q.type === "yari" ? 0 : q.type === "kiba" ? 1 : 2);
    return pri(a) - pri(z);
  });
  const order = [], slotOf = [];
  for (const q of queue) {
    let best = 0, bv = Infinity;
    for (let k = 0; k < free.length; k++) { const v = cost(q, free[k]); if (v < bv) { bv = v; best = k; } }
    const i = free.splice(best, 1)[0];
    order.push(q); slotOf.push(slots[i]);
  }
  const maxRow = slots.reduce((a, x) => Math.max(a, x.row || 0), 0);
  order.forEach((q, i) => {
    const s = slotOf[i] || { x: 0, y: 0, row: 0 };
    // 最後尾の段は予備隊とし、前線が薄くなるまで前へ出さない（GDD 8.4）
    q.reserve = maxRow >= 2 && (s.row || 0) === maxRow && !c.forceAll;
    const [rx, ry] = rot(s.x, s.y, c.facing);
    // 陣形維持が高いうちは等間隔・同方向。落ちて初めて乱れが出る（GDD 8.3）
    const dis = clamp((78 - q.cohesion) / 78, 0, 1);
    q.dis = dis;
    const jit = Math.pow(dis, 1.7) * 4.5;   // 見づらくならないよう、間隔の開きは小さく抑える
    q.slotX = rx + q.jx * jit;
    q.slotY = ry + q.jy * jit;
    if (snap) { q.x = c.x + q.slotX; q.y = c.y + q.slotY; q.facing = c.facing; }
  });
}

// ------------------------------------------------ 分遣命令（GDD 8.5）
// 指揮能力＝統率・知略から算出。目安は A級3隊 / B級2隊 / C級1隊。
export function commandCapacity(gen) {
  const v = gen.lead * 0.6 + gen.wit * 0.4;
  return v >= 74 ? 3 : v >= 60 ? 2 : 1;
}

export const DETACH_DEFS = [
  {
    key: "騎馬側面攻撃", pick: (c) => c.squads.filter((q) => q.type === "kiba"),
    need: (c, men) => men >= 100 && c.morale >= 50,
    why: "騎馬100以上・士気50以上",
  },
  {
    key: "弓鉄砲高地占拠", pick: (c) => c.squads.filter((q) => ARM_STATS[q.type].range > 0),
    need: (c, men) => men >= 100 && HILLS.length > 0, why: "遠隔兵100以上・到達可能な高地",
  },
  {
    key: "橋渡河点防衛", pick: (c) => c.squads.filter((q) => q.type === "yari").slice(0, 8),
    need: (c, men) => corpsMen(c) >= 500 && men >= 100 && RIVER.bot > RIVER.top + 4,
    why: "兵500以上・橋又は渡河点",
  },
  {
    key: "森林偵察", pick: (c) => c.squads.filter((q) => q.type === "yumi").slice(0, 1),
    need: (c, men) => (c.gen.wit >= 60 && men >= 50) && FORESTS.length > 0, why: "知略60以上・偵察兵50以上・森が必要",
  },
];

/* ------------------------------------------------ 伏兵（GDD 8.7）

   森に兵を伏せ、寄せて来る敵の脇腹へ現れる。当たれば相手の士気は十六、
   隊列は十二削れる。桶狭間も、厳島も、要はこれである。

   ただし誰にでもできる芸ではない。伏せるとは、戦の前に戦場を読み、当たる所を
   見切って兵を置くことであるから、それだけの知恵者が軍にいなければ献策すら
   出ない。知略七十八以上――一国に数人という将である。

   伏せられるのは、森・林・集落のうち、自軍に近い半分にある所。敵陣の際に
   伏せても、着く前に見つかる。 */
export const 伏兵の知略 = 78;

export function 伏兵の策士(b, side) {
  const 皆 = b.corps.filter((c) => c.side === side && !c.dead && !c.destroyed && c.gen);
  const 首 = [...皆].sort((a, z) => ((z.gen.wit || 0) - (a.gen.wit || 0)))[0];
  return 首 && (首.gen.wit || 0) >= 伏兵の知略 ? 首.gen : null;
}

// 伏せられる地か（森・林・集落で、自軍に近い半分）
export function 伏せられる地(b, x, y, side) {
  if (b.map || !b.陣) return false;
  const t = terrainAt(x, y);
  if (t !== "forest" && t !== "wood" && t !== "village") return false;
  const 味方 = b.陣[side], 敵 = b.陣[side === "P" ? "E" : "P"];
  if (!味方 || !敵) return false;
  return Math.hypot(x - 味方.x, y - 味方.y) < Math.hypot(x - 敵.x, y - 敵.y);
}

// その隊は、いまいる所で伏せられるか（プレイヤーの釦の可否もこれで決める）
export function 伏兵に置ける(b, c) {
  if (!c || c.detach || c.routed || c.withdraw || c.dead || c.destroyed) return false;
  if (!伏兵の策士(b, c.side)) return false;
  return 伏せられる地(b, c.x, c.y, c.side);
}

/* 伏せ場を探す。自軍に近い半分の、森・林・集落のうち手近な所。
   遠い伏せ場は選ばない。着くまでに戦が始まってしまう。 */
export function 伏せ場を探す(b, c, 限り = 900) {
  if (b.map || !b.陣) return null;
  let best = null, bd = 限り;
  for (const 群 of [FORESTS, WOODS, VILLAGES]) {
    for (const f of 群) {
      const d = Math.hypot(f.x - c.x, f.y - c.y);
      if (d >= bd) continue;
      if (!伏せられる地(b, f.x, f.y, c.side)) continue;
      bd = d; best = { x: f.x, y: f.y };
    }
  }
  return best;
}

/* 分遣を出す頃合い（GDD 8.5）。

   これまでは戦の初めの二十五秒のうちに、賽の目ひとつで分遣が出ていた。
   橋を見つければ飛びつき、丘を見つければ飛びつき、敵もおらぬのに騎馬が
   側面へ回り、自陣のそばの森を偵察していた。策ではなく、癖である。

   分遣とは、そこに用があるから割くものである。用があるかどうかは、
   誰が、いつ、どこで、を見て判ずる。

     騎馬側面攻撃 … 槍を合わせてから回り込む。ただし統率・武勇・知略の
                    いずれも七十五を超える将は、当たる少し前に回り始める。
                    そういう芸当ができるのは、そういう将だけである。
     弓鉄砲高地占拠 … 受け手は初めから近くの高みへ。寄せ手は敵陣の間近まで
                      進んで、まだ誰も取っていない高みが目に入ったときだけ。
     橋渡河点防衛 … 受け手だけ。しかも渡り場が自陣の側にあるときだけ。
                    敵陣の際の橋を守っても、守るべきものがない。
     森林偵察 … 敵陣の側の森を探る。自陣のそばの森に敵はおらぬ。
                ただし敵の姿を見失っているなら、伏せられている見込みがある。 */
export function 分遣の頃合い(b, c, key) {
  if (b.map || !b.陣) return false;
  const 味方陣 = b.陣[c.side], 敵陣 = b.陣[c.side === "P" ? "E" : "P"];
  if (!味方陣 || !敵陣) return false;
  const 間 = b.陣間 || 800;
  const 敵陣まで = Math.hypot(敵陣.x - c.x, 敵陣.y - c.y);
  const 自陣まで = Math.hypot(味方陣.x - c.x, 味方陣.y - c.y);
  const 攻め手 = c.side === b.attacker;
  const 生きた敵 = b.corps.filter((o) => !o.dead && !o.destroyed && !o.routed && o.side !== c.side);
  const 近い敵 = 生きた敵.reduce((a, o) => Math.min(a, Math.hypot(o.x - c.x, o.y - c.y)), 1e9);

  if (key === "騎馬側面攻撃") {
    const g = c.gen || {};
    const 名将 = (g.lead || 0) >= 75 && (g.valor || 0) >= 75 && (g.wit || 0) >= 75;
    // 噛み合ってしばらく――正面が支えられると見てから、騎馬を回す。
    // 出会い頭に割いては、正面が薄いまま当たることになる。
    if ((c.噛み刻 || 0) > 6) return true;
    return 名将 && 近い敵 < 520;                              // 当たる少し前に動ける将
  }

  if (key === "弓鉄砲高地占拠") {
    if (!HILLS.length) return false;
    const 丘 = nearestOf(HILLS, c.x, c.y);
    if (!丘) return false;
    const 丘まで = Math.hypot(丘.x - c.x, 丘.y - c.y);
    // すでに誰かが取っている高みへは出さない
    const 取られた = b.corps.some((o) => !o.dead && !o.destroyed && o !== c
      && Math.hypot(o.x - 丘.x, o.y - 丘.y) < 丘.r * 0.6);
    if (取られた) return false;
    if (!攻め手) {
      // 受け手は初めから。ただし近い高みに限る（遠い丘へ兵を割いても戦列が薄くなるだけ）
      return 丘まで < 間 * 0.5 && 丘まで < 700
        && Math.hypot(丘.x - 味方陣.x, 丘.y - 味方陣.y) <= Math.hypot(丘.x - 敵陣.x, 丘.y - 敵陣.y);
    }
    // 寄せ手は敵陣の間近まで進んでから
    return 敵陣まで < 間 * 0.55 && 丘まで < 520;
  }

  if (key === "橋渡河点防衛") {
    if (!hasRiver() || 攻め手) return false;                  // 守るのは受け手の役目
    const 橋 = (RIVER.bridge[0] + RIVER.bridge[1]) / 2;
    const 中 = (RIVER.top + RIVER.bot) / 2 + riverShift(橋);
    // 渡り場が自陣の側にあるときだけ守る
    return Math.hypot(橋 - 味方陣.x, 中 - 味方陣.y) < Math.hypot(橋 - 敵陣.x, 中 - 敵陣.y)
      && Math.hypot(橋 - c.x, 中 - c.y) < 間 * 0.6;
  }

  if (key === "森林偵察") {
    if (!FORESTS.length) return false;
    const 森 = nearestOf(FORESTS, c.x, c.y);
    if (!森) return false;
    const 森まで = Math.hypot(森.x - c.x, 森.y - c.y);
    if (森まで > 460) return false;
    // その森が敵陣の側にあること
    const 敵側の森 = Math.hypot(森.x - 敵陣.x, 森.y - 敵陣.y) < Math.hypot(森.x - 味方陣.x, 森.y - 味方陣.y);
    // 敵の姿を見失っているなら、自陣の側でも探る値打ちがある（伏兵の見込み）
    const 見失い = 生きた敵.some((o) => !o.seen);
    return (敵側の森 && 敵陣まで < 間 * 0.75) || (見失い && 森まで < 320);
  }
  return false;
}

export function detachOptions(b, parent) {
  if (b.map) return [];        // 城攻めに渡河防衛や高地占拠はない
  const used = b.corps.filter((x) => x.parentId === parent.id && !x.dead).length;
  const cap = commandCapacity(parent.gen);
  return DETACH_DEFS.map((d) => {
    const sq = d.pick(parent);
    const men = sq.reduce((a, q) => a + q.men, 0);
    return { ...d, men, ok: used < cap && sq.length > 0 && d.need(parent, men), cap, used };
  });
}

export function makeDetachment(b, parent, key) {
  const def = DETACH_DEFS.find((d) => d.key === key);
  const squads = def.pick(parent);
  if (!squads.length) return null;
  parent.squads = parent.squads.filter((q) => !squads.includes(q));
  const c = {
    id: `${parent.id}#${key}`, side: parent.side, gen: parent.gen, color: parent.color,
    name: `${parent.gen.name}隊 ${key}`, x: parent.x, y: parent.y, facing: parent.facing,
    order: "移動", tx: parent.x, ty: parent.y, morale: parent.morale, squads,
    formation: key === "橋渡河点防衛" ? "横陣" : key === "騎馬側面攻撃" ? "雁行" : "方陣",
    routed: false, dead: false, destroyed: false, ambush: false, revealed: true,
    lastSeen: { x: parent.x, y: parent.y, t: b.t }, seen: false,
    loss: { 直属: 0, 地域: 0 }, feats: [], fatigue: parent.fatigue,
    detach: true, parentId: parent.id, task: key, autonomous: false, boxed: false,
  };
  placeSquads(c, true);
  b.corps.push(c);
  b.log.push({ t: b.t, text: `${parent.name}隊より${key}の分遣隊が出た。` });
  return c;
}

/* 城方の命令（GDD 9.4）。打って出る、城へ戻る、他の門へ移る。 */
export function sallyOut(b, c, MAP) {
  if (!c || c.side === b.attacker) return false;
  const g2 = c.holdGate;
  const foes = b.corps.filter((x) => x.side === b.attacker && !x.dead && !x.destroyed && !x.routed);
  if (!foes.length) return false;
  const t2 = [...foes].sort((x, y2) =>
    Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y2.x - c.x, y2.y - c.y))[0];
  c.sallied = true; c.sallyAt = b.t; c.manualSally = true;
  issueOrder(b, c, { order: "接戦", tx: t2.x, ty: t2.y, target: t2.id });
  b.log.push({ t: b.t, text: `${c.gen.name}隊が${g2 ? g2.key : "城"}を開いて討って出た。` });
  return true;
}

export function returnToGate(b, c, MAP) {
  if (!c || !MAP) return false;
  c.sallied = false; c.chasing = false; c.manualSally = false; c.sallyLogged = false;
  const g2 = c.holdGate;
  if (g2) {
    const l2 = MAP.layers[g2.layer], a2 = axisOf(l2, g2);
    const p2 = fromUV(MAP, a2, g2.off, a2.half - 14);
    issueOrder(b, c, { order: "移動", tx: p2.x, ty: p2.y });
  } else {
    issueOrder(b, c, { order: "移動", tx: MAP.cx, ty: MAP.cy });
  }
  b.log.push({ t: b.t, text: `${c.gen.name}隊に城へ戻るよう命じた。` });
  return true;
}

export function moveToGate(b, c, MAP, gate) {
  if (!c || !MAP) return false;
  c.sallied = false; c.chasing = false; c.manualSally = false;
  if (gate === "本丸") {
    c.holdGate = null;
    issueOrder(b, c, { order: "移動", tx: MAP.cx, ty: MAP.cy });
    b.log.push({ t: b.t, text: `${c.gen.name}隊は本丸へ移った。` });
    return true;
  }
  c.holdGate = gate;
  const l2 = MAP.layers[gate.layer], a2 = axisOf(l2, gate);
  const p2 = fromUV(MAP, a2, gate.off, a2.half - 14);
  issueOrder(b, c, { order: "移動", tx: p2.x, ty: p2.y });
  b.log.push({ t: b.t, text: `${c.gen.name}隊は${gate.key}へ移った。` });
  return true;
}


// 分遣隊を呼び戻す（GDD 8.7）。頃合いを待たず、こちらの意思で返す。
export function recallDetachment(b, c) {
  if (!c || !c.detach || c.dead) return false;
  const parent = b.corps.find((x) => x.id === c.parentId);
  if (!parent || parent.dead || parent.destroyed) return false;
  c.task = "帰陣";
  c.detachT = 999;
  c.autonomous = false;
  c.order = "移動";
  c.tx = parent.x; c.ty = parent.y;
  c.wp = null;
  b.log.push({ t: b.t, text: `${c.name}に帰陣を命じた。` });
  return true;
}

// 分遣隊の自律行動。指揮圏（本隊から400）を離れると自律AIへ移る。
export function detachAI(b, c, alive) {
  if (!c.task) return false;
  const parent = b.corps.find((x) => x.id === c.parentId);
  // 分遣は永く離れているものではない。頃合いを見て本隊へ戻る。
  c.detachT = (c.detachT || 0) + 0.05;
  const spent = c.detachT > 70 || corpsMen(c) < corpsMax(c) * 0.55 || c.morale < 40;
  if (spent && parent && !parent.dead && !parent.destroyed) {
    c.task = "帰陣";
    const d0 = Math.hypot(parent.x - c.x, parent.y - c.y);
    if (d0 < 70) {
      // 本隊に追いついたので組を返す
      for (const q of c.squads) { if (q.men > 0) parent.squads.push(q); }
      c.squads = [];
      c.dead = true;
      placeSquads(parent, false);
      b.log.push({ t: b.t, text: `${c.name}が本隊へ帰った。` });
      return true;
    }
    c.tx = parent.x; c.ty = parent.y; c.order = "移動";
    return true;
  }
  c.autonomous = !parent || parent.dead || Math.hypot(parent.x - c.x, parent.y - c.y) > 400;
  /* 分遣も、崩れた敵は追わない。本隊の采配と同じ理である。
     追い回すと、退いて息をついている隊を狩り尽くすことになり、
     立て直す間もなく盤から消える。測ったところ、崩れた五十八隊のうち
     三十七隊が盤を落ちていた。追わぬようにすると三十三隊に減った。 */
  const foes = alive.filter((o) => o.side !== c.side && !o.routed && (o.seen || !o.ambush));
  const nearest = foes.length
    ? foes.reduce((a, o) => (Math.hypot(o.x - c.x, o.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? o : a), foes[0])
    : null;
  if (c.task === "騎馬側面攻撃") {
    if (!nearest) { c.task = "帰陣"; return true; }   // 当たる相手がおらぬなら本隊へ戻る
    const d = Math.hypot(nearest.x - c.x, nearest.y - c.y);
    if (d > 240) {  // まず側面へ回り込む
      const side = c.x < nearest.x ? -1 : 1;
      c.tx = nearest.x + side * 260; c.ty = nearest.y; c.order = "移動";
    } else { c.tx = nearest.x; c.ty = nearest.y; c.order = "接戦"; }
    return true;
  }
  if (c.task === "弓鉄砲高地占拠") {
    const h = nearestOf(HILLS, c.x, c.y);
    if (!h) { c.task = "帰陣"; return true; }                // 高地のない野もある
    if (Math.hypot(h.x - c.x, h.y - c.y) > 40) { c.tx = h.x; c.ty = h.y; c.order = "移動"; }
    else { c.order = "射撃"; c.tx = c.x; c.ty = c.y; }
    return true;
  }
  if (c.task === "橋渡河点防衛") {
    if (!hasRiver()) { c.task = "帰陣"; return true; }      // 川のない野に渡河点はない
    const gx = (RIVER.bridge[0] + RIVER.bridge[1]) / 2;
    // 自分がいる岸を守る。側で決め打ちにすると、北に布陣した側だけが有利になる。
    const sh = riverShift(gx);
    const gy = c.y > (RIVER.top + RIVER.bot) / 2 + sh ? RIVER.bot + sh + 40 : RIVER.top + sh - 40;
    if (Math.hypot(gx - c.x, gy - c.y) > 30) { c.tx = gx; c.ty = gy; c.order = "移動"; }
    else {
      c.order = "待機"; c.tx = c.x; c.ty = c.y;
      if (!c.feats.includes("橋防衛")) c.feats.push("橋防衛");
    }
    return true;
  }
  if (c.task === "森林偵察") {
    const f = nearestOf(FORESTS, c.x, c.y);
    if (!f) { c.task = "帰陣"; return true; }
    if (Math.hypot(f.x - c.x, f.y - c.y) > 40) { c.tx = f.x; c.ty = f.y; c.order = "移動"; }
    else { c.order = "待機"; c.tx = c.x; c.ty = c.y; }
    return true;
  }
  return false;
}


// ------------------------------- 命令伝達（GDD 8.5：距離による遅延と指揮圏）
// 本陣（総大将、いなければ最も統率の高い隊）から騎馬伝令を出す。
// 伝令の脚は約260／秒。統率が高いほど命令が早く伝わり、指揮圏は 300＋統率×3。
export const COURIER_SPEED = 260;

export function commandPost(b, side) {
  const list = b.corps.filter((c) => c.side === side && !c.dead && !c.destroyed && !c.detach && !c.routed);
  return list.find((c) => c.gen.lord) || list.sort((a, z) => z.gen.lead - a.gen.lead)[0] || null;
}

export function commandRange(post) { return (post ? 300 + post.gen.lead * 3 : 600) * fieldScale(); }

export function commandDelay(b, c) {
  const post = commandPost(b, c.side);
  if (!post || post === c) return 0;
  const d = Math.hypot(post.x - c.x, post.y - c.y);
  const skill = 0.7 + post.gen.lead / 150;
  return clamp((d / (COURIER_SPEED * fieldScale())) / skill + 0.3, 0, 9);
}

export function outOfCommand(b, c) {
  // 城攻めは攻め口ごとに寄手大将を置いて始める。城の反対側にいても命令は通る。
  // （伝令の時間はかかる。届かないのではなく、遅れる。）
  if (b.map) return false;
  const post = commandPost(b, c.side);
  if (!post || post === c) return false;
  return Math.hypot(post.x - c.x, post.y - c.y) > commandRange(post);
}

// 同じ命令のまま狙いを直すだけなら伝令はいらない。命令そのものを変えるときに時間がかかる。
// 戦場に大きな出来事を知らせる（GDD 15.2）
export function notify(b, text, kind) {
  if (!b) return;
  b.notices = b.notices || [];
  b.notices.push({ text, kind: kind || "info", t: b.t });
  if (b.notices.length > 6) b.notices.shift();
  b.log.push({ t: b.t, text });
}

export function issueOrder(b, c, patch) {
  if (!c || c.dead || c.destroyed) return;
  c.pinned = false;                      // 命令を受けたら門の前の据え置きを解く
  if (!AI_ISSUING && c.side === "P") c.auto = false;   // 手ずから命じた隊は委任を離れる
  if (!patch.keepPath) c.wp = null;      // 新たな命令は道順を打ち消す
  const apply = () => Object.assign(c, patch);
  if (b.phase === "deploy" || patch.order === c.order) { apply(); c.pending = null; return; }
  // 味方への指示はすぐに効かせる（伝令の間があると操作が鈍く感じられるため）
  if (c.side === "P") { apply(); c.pending = null; return; }
  if (outOfCommand(b, c)) { c.pending = null; c.autonomous = true; return; }   // 命令が届かない
  // 同じ命令を出し直しても伝令は振り出しに戻らない。狙いだけ差し替える。
  if (c.pending && c.pending.patch.order === patch.order) { c.pending.patch = patch; return; }
  c.pending = { patch, t: commandDelay(b, c) };
}


/* 退く先（GDD 8.2）。

   これまでは「遊ぶ側は南、敵は北」と決め打ちしていた。
     c.ty = c.side === "P" ? FIELD.h + 120 : -120

   ところが自陣がどちらに寄るかは、攻め口の方角（b.face）と、寄せ手か守り手か
   （b.myFar）で決まる。北から攻めれば自陣は盤の北にあり、東西の街道なら
   自陣は左右にある。決め打ちのままでは、撤退を命じた隊が敵陣へ向かって
   歩き出すことになる。押しても退かぬように見えるのは、これである。
   進んだ先には敵がいるので、すぐまた噛み合って、その場から動かなくなる。

   布陣の範囲を決めている ownZone と同じ拠りどころ（face と myFar）から、
   自陣の側を割り出して、そちらの盤外へ落ちる。

   城攻めでは方角ではなく、城の中心から離れる向きへ退く。
   寄せ手は囲みを解いて外へ、城方も同じく城から離れる。 */
/* 立て直す場所（GDD 8.7）。

   崩れた隊は、これまで盤の外へ走り去って二度と戻らなかった。十分な兵を
   抱えたまま戦場から消えるので、戦がそこで終わってしまう。

   崩れるとは、その場で戦えなくなることであって、国へ帰ることではない。
   いくさ場のうち、敵のいない所まで退いて息をつき、士気が戻れば戦列に戻る。

   退き場は、自陣の側で、敵からいちばん遠く、かつ遠すぎない所を選ぶ。
   遠くへ走らせすぎると、立ち直っても戦に戻れずに日が暮れる。 */
export function 退き場(b, c) {
  const 敵 = b.corps.filter((o) => !o.dead && !o.destroyed && o.side !== c.side && !o.routed);
  const 端 = 退き先(b, c);
  const 向 = { x: 端.x - c.x, y: 端.y - c.y };
  const 長 = Math.hypot(向.x, 向.y) || 1;
  let best = null, bs = -1e9;
  for (const 距 of [260, 420, 600, 820]) {
    for (const 横 of [-0.5, -0.22, 0, 0.22, 0.5]) {
      const ux = 向.x / 長, uy = 向.y / 長;
      const x = c.x + ux * 距 - uy * 距 * 横;
      const y = c.y + uy * 距 + ux * 距 * 横;
      if (b.map) {
        if (x < 40 || y < 40 || x > FIELD.w - 40 || y > FIELD.h - 40) continue;
        if (!passable(x, y)) continue;              // 城内は塀だらけ。壁の中は退き場にならない
      } else if (x < 60 || y < 60 || x > FIELD.w - 60 || y > FIELD.h - 60) continue;
      let 近 = 1e9;
      for (const o of 敵) 近 = Math.min(近, Math.hypot(o.x - x, o.y - y));
      if (近 === 1e9) 近 = 900;
      // 敵から遠いほどよい。ただし走る道のりは短いほどよい。
      const 点 = Math.min(近, 900) - 距 * 0.45;
      if (点 > bs) { bs = 点; best = { x, y }; }
    }
  }
  return best || { x: clamp(c.x + (向.x / 長) * 420, 60, FIELD.w - 60),
    y: clamp(c.y + (向.y / 長) * 420, 60, FIELD.h - 60) };
}

/* 城方が崩れたときの退き先（GDD 9.3）。

   野なら敵の来ない所まで走ればよいが、城の中はそうはいかない。城方が崩れたら、
   ひとつ内の曲輪へ下がるのが定石である。門を背にして息をつき、立ち直ったら
   そのままその門を守る。外へ逃げ出す道理はない。

   受け持ちの門より内で、まだ破れていない門のうち、いちばん外の輪を選ぶ。
   同じ輪なら手近な門。破れていない門が尽きたなら、本丸へ籠る。 */
export function 内の門へ退く(b, c) {
  const m = b && b.map;
  if (!m) return null;
  const 今 = c.holdGate;
  const 内 = m.gates.filter((g) => !g.broken && (!今 || g.layer > 今.layer));
  const 候補 = 内.length ? 内 : m.gates.filter((g) => !g.broken);
  if (!候補.length) {
    const h = m.layers[m.layers.length - 1];
    return { 場: { x: m.cx + (h.ox || 0), y: m.cy + (h.oy || 0) }, 門: null, 名: "本丸" };
  }
  const 輪 = Math.min(...候補.map((g) => g.layer));
  const 選 = 候補.filter((g) => g.layer === 輪).sort((x, z) => {
    const px = gatePos(m, m.layers[x.layer], x), pz = gatePos(m, m.layers[z.layer], z);
    return Math.hypot(px.x - c.x, px.y - c.y) - Math.hypot(pz.x - c.x, pz.y - c.y);
  })[0];
  const l = m.layers[選.layer], a = axisOf(l, 選);
  // 門のすぐ内。ここで息をつき、立ち直ったらそのまま門を守る。
  const p = fromUV(m, a, 選.off, a.half - 40);
  return { 場: { x: p.x, y: p.y }, 門: 選, 名: 選.key };
}

export function 退き先(b, c) {
  if (b && b.map) {
    /* 城の中で崩れたとき。

       城方は外へ逃げる先がない。城の中心から外へ向かって走らせていたので、
       崩れた隊が曲輪の隅に固まっていた。城方は奥へ――本丸へ逃げるものである。
       寄せ手だけが、来た道を戻って盤の外へ落ちる。 */
    if (c.side !== b.attacker) return { x: b.map.cx, y: b.map.cy };
    const ox = c.x - b.map.cx, oy = c.y - b.map.cy, od = Math.hypot(ox, oy) || 1;
    return { x: c.x + (ox / od) * (FIELD.w + FIELD.h), y: c.y + (oy / od) * (FIELD.w + FIELD.h) };
  }
  const face = (b && b.face) || "S", far = !!(b && b.myFar);
  const 縦 = face === "N" || face === "S";
  // ownZone と同じ決め方。true なら遊ぶ側の陣は下（縦のとき）／右（横のとき）
  const 遊ぶ側 = 縦 ? (face === "S" ? far : !far) : (face === "E" ? far : !far);
  const こちら = c.side === "P" ? 遊ぶ側 : !遊ぶ側;
  return 縦
    ? { x: c.x, y: こちら ? FIELD.h + 120 : -120 }
    : { x: こちら ? FIELD.w + 120 : -120, y: c.y };
}

/* 退き口（GDD 8.2）。

   槍を合わせている隊を退かせるのは、戦のうちで最も難しい事である。
   仕組みの上でも、そこが抜けていた。

   組は「持ち場から離れていて、かつ噛み合っていなければ」持ち場へ寄る
   （engine の qd > 2 && !q.engaged）。噛み合った組はその場を動かない。
   一方、隊の代表点は組の重心へ引き戻される。だから、噛み合った隊に撤退を
   命じても、組は動かず、代表点も動かず、一歩も退けなかった。
   百秒待たせて、ただの一歩も動かなかった。

   城攻めでは離れた場所から取り付くので動けたが、野戦では槍を合わせた途端に
   撤退が効かなくなる。これを直す。

   ただし、ただで退けるようにはしない。背を向ければ追い討ちの一撃を受ける。
   統制を保って一斉に退けば（全軍撤退）軽く済み、一隊だけ勝手に抜ければ重い。 */
export function 退かせる(b, c, 統制) {
  if (!c || c.dead || c.destroyed) return null;
  const 噛んでいた = c.squads.filter((q) => q.men > 0 && q.engaged).length;
  c.task = null; c.狙い = null; c.withdraw = true;
  c.pinned = false; c.gate = null; c.siegeAuto = false; c.wp = null;
  for (const q of c.squads) { q.engaged = false; q.link = null; }
  let 損 = 0;
  if (噛んでいた) {
    const 割 = (統制 ? 0.045 : 0.075)
      * Math.min(1, 噛んでいた / Math.max(1, c.squads.length) + 0.3);
    for (const q of c.squads) {
      if (q.men <= 0) continue;
      const 落 = Math.round(q.men * 割);
      q.men = Math.max(0, q.men - 落); 損 += 落;
      q.cohesion = Math.max(0, q.cohesion - (統制 ? 10 : 20));
    }
    c.morale = Math.max(0, c.morale - (統制 ? 6 : 12));
  }
  const 先 = 退き先(b, c);
  issueOrder(b, c, { order: "撤退", tx: 先.x, ty: 先.y });
  return { 噛んでいた, 損 };
}

export let AI_ISSUING = false;                 // AIが出している命令か（委任を解かないため）
// 折を分けたため、合戦AIからはこの口を通して上げ下げする。
export function setAiIssuing(v) { AI_ISSUING = v; }

// 委任された隊はAIが差配する。委任は隊ごとに入り切りでき、
// プレイヤーが命令を出した瞬間に解ける。
export const delegated = (b, c) => c.side !== "P" || c.auto;
