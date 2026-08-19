import { clamp, makeRng } from "../core/util.js";
import { SHIPS, SHIP_KINDS, 潮の強さ, 船の割り, 風の名 } from "../data/ships.js";

/* ==========================================================================
   海戦（GDD 10章）

   陸の戦と別物である。陸では兵の数がものを言うが、海では船と水主の技量が
   ものを言う。数を揃えれば勝てる戦ではない。

   組み立ては陸と同じ筋にした。
     船団（fleet）… 将が率いる一まとまり。命令はここへ出す
     船（ship）  … 一艘ずつが盤の上を動き、傷つき、燃え、沈む
   陸の「隊」と「組」に当たる。同じ形にしてあるので、読む側も迷わない。

   海には壁も丘もない。かわりに風と潮がある。
     風 … 追い風なら速く、向かい風なら鈍い。焙烙は風上から投げねば効かない
     潮 … 盤全体を一方へ押し流す。踏みとどまるには漕がねばならない
   ========================================================================== */

export const SEA = { w: 1200, h: 800 };

export const 海の状 = {
  wind: 0,          // 風の向き（radian）
  windPow: 1,       // 風の強さ
  tide: 0,          // 潮の向き（radian）
  seed: 1,
};

// 海を設える。渡る海路ごとに、同じ風と潮が立つ。
export function layoutSea(seed, men) {
  const rnd = makeRng(seed >>> 0);
  /* 海の広さ。はじめは陸の野と同じ勘定で取ったが、船は隊より数が少ないので、
     広い海に船団がぽつんと浮くだけになった。船が見える広さまで詰める。 */
  const w = clamp(Math.round(760 * Math.sqrt(Math.max(600, men || 3000) / 3000)), 700, 1500);
  SEA.w = w; SEA.h = Math.round(w * 0.68);
  海の状.seed = seed >>> 0;
  海の状.wind = Math.floor(rnd() * 8) * (Math.PI / 4);
  海の状.windPow = 0.6 + rnd() * 0.9;
  海の状.tide = 海の状.wind + (rnd() - 0.5) * 1.4;
  return 海の状;
}

export const 風の呼び名 = () => 風の名[Math.round(海の状.wind / (Math.PI / 4)) % 8];

/* 船を仕立てる。艘数と技量から、大船・中船・小船の割りを決める。 */
export function 船を並べる(艘, skill) {
  const w = 船の割り(skill);
  const 和 = w.atake + w.seki + w.kobaya;
  const n = { atake: Math.round(艘 * w.atake / 和), seki: Math.round(艘 * w.seki / 和) };
  n.kobaya = Math.max(0, 艘 - n.atake - n.seki);
  if (艘 >= 8 && n.atake < 1) { n.atake = 1; n.kobaya = Math.max(0, n.kobaya - 1); }
  return n;
}

let 通し = 0;

/* 船団を立てる。将が一人、船が幾艘。

   内訳を渡せばその通りに仕立てる。渡さなければ艘数と技量から割り出す。
   軍船に足りぬぶんを浦の小舟で埋める、という勘定は naval.js が持っており、
   その結果をそのまま受け取れるようにしてある。 */
export function makeFleet(side, gen, 艘, skill, x, y, facing, color, 内訳) {
  const n = 内訳
    ? { atake: 内訳.atake || 0, seki: 内訳.seki || 0, kobaya: 内訳.kobaya || 0 }
    : 船を並べる(Math.max(1, Math.round(艘)), skill);
  const ships = [];
  let i = 0;
  for (const t of SHIP_KINDS) {
    for (let k = 0; k < n[t]; k++) {
      const st = SHIPS[t];
      ships.push({
        id: `s${++通し}`, t, x, y, facing,
        hp: st.hp, max: st.hp, crew: st.乗, crewMax: st.乗,
        fire: 0,                       // 燃え具合。百で沈む
        cool: 0, boarding: null, sunk: false,
        slotX: 0, slotY: 0, seed: i * 1.7,
      });
      i++;
    }
  }
  const f = {
    id: `f${++通し}`, side, gen, color, x, y, facing,
    ships, skill: clamp(skill, 30, 100),
    order: "待機", tx: x, ty: y, target: null, 狙い: null,
    morale: 100, routed: false, withdraw: false, dead: false, destroyed: false,
    /* 初めは委任にしておく。陸の隊（corps.js の makeCorps）と同じである。
       委任でないと、下知を出すまで一艘も動かない。船を並べただけで
       にらみ合ったまま日が暮れる、ということが起きていた。 */
    auto: true, seen: true, log: 0,
  };
  並べ直す(f);
  return f;
}

/* 船を横陣に並べる。大船を中央に、小早を両翼へ。
   海の戦では、大船を的にして小早が回り込むのが常道である。 */
export function 並べ直す(f, 置く) {
  const live = f.ships.filter((s) => !s.sunk);
  if (!live.length) return;
  const 順 = [...live].sort((a, b) => SHIPS[b.t].的 - SHIPS[a.t].的);
  const 列 = Math.max(3, Math.round(Math.sqrt(順.length * 1.9)));
  順.forEach((s, i) => {
    const 段 = Math.floor(i / 列), 位 = i % 列;
    // 中央から外へ振り分ける（大きい船が真ん中に来る）
    const u = ((位 % 2 ? 1 : -1) * Math.ceil(位 / 2)) * 46;
    const v = 段 * 40;
    const cosF = Math.cos(f.facing), sinF = Math.sin(f.facing);
    s.slotX = u * -sinF + v * -cosF;
    s.slotY = u * cosF + v * -sinF;
    if (置く) { s.x = f.x + s.slotX; s.y = f.y + s.slotY; s.facing = f.facing; }
  });
}

export const fleetShips = (f) => f.ships.filter((s) => !s.sunk).length;
export const fleetCrew = (f) => f.ships.reduce((a, s) => (s.sunk ? a : a + s.crew), 0);
export const fleetCrewMax = (f) => f.ships.reduce((a, s) => a + s.crewMax, 0);

export function createSeaBattle(P, E, attacker, ctx) {
  const b = {
    t: 0, phase: "deploy", fleets: [...P, ...E], attacker,
    initial: { P: P.reduce((a, f) => a + fleetShips(f), 0), E: E.reduce((a, f) => a + fleetShips(f), 0) },
    log: [], result: null, fx: [], dusk: 420, aiClock: 0, retreat: null, orderly: false,
    ctx: ctx || {},
  };
  for (const f of b.fleets) 並べ直す(f, true);
  return b;
}

/* 追い風か向かい風か。1で真の追い風、-1で真の向かい風。 */
export function 風向き(facing) {
  return Math.cos(facing - 海の状.wind);
}

/* 戦の刻み。

   はじめは三十秒から五十秒で決着していた。盤の上で操るには短すぎる。
   下知を出す間もなく終わってしまう。矢玉も火も乗り移りも、まとめてこの分だけ
   緩める。互角の戦で二百秒から三百秒――日暮れ（四百二十秒）の手前で決着が
   つくあたりに置く。 */
const 手加減 = 0.34;

/* ------------------------------------------------------------------ 一歩進める */
export function stepSeaBattle(b, dt) {
  if (b.phase !== "fight") return;
  b.t += dt;
  b.aiClock -= dt;
  if (b.aiClock <= 0) { seaAI(b); b.aiClock = 0.7; }
  if (b.fx.length) { for (const f of b.fx) f.t += dt; b.fx = b.fx.filter((f) => f.t < f.life); }

  const alive = b.fleets.filter((f) => !f.dead && !f.destroyed);
  const 潮x = Math.cos(海の状.tide) * 潮の強さ, 潮y = Math.sin(海の状.tide) * 潮の強さ;

  // 一、船団を動かす
  for (const f of alive) {
    const live = f.ships.filter((s) => !s.sunk);
    if (!live.length) continue;
    const dx = f.tx - f.x, dy = f.ty - f.y, dist = Math.hypot(dx, dy);
    /* 組み付かれている船団は動けない。ただし退く船団は別である。
       陸で同じ罠を踏んだ（tests/hikiguchi.cjs）。掴み合ったまま退けと命じても
       一歩も動かず、押しても退かぬように見える。
       退き口とは、鉤縄を切り離して離れることである。 */
    const 引く = f.routed || f.withdraw;
    const 組み合い = !引く && live.some((s) => s.boarding);
    if (dist > 8 && f.order !== "待機" && !組み合い) {
      const 足 = live.reduce((a, s) => a + SHIPS[s.t].速, 0) / live.length;
      const 向 = Math.atan2(dy, dx);
      // 帆は風で決まる。追い風なら一.四倍、向かい風なら〇.五五倍ほど。
      const 帆 = live.reduce((a, s) => a + SHIPS[s.t].帆, 0) / live.length;
      const 風 = 1 + 風向き(向) * 0.42 * 海の状.windPow * 帆;
      const v = 足 * clamp(風, 0.5, 1.55) * (0.62 + f.morale / 260) * (f.routed ? 1.2 : 1);
      f.x += (dx / dist) * v * dt;
      f.y += (dy / dist) * v * dt;
      f.facing = 向;
    }
    // 潮は漕いでいようといまいと押してくる
    f.x += 潮x * dt * 0.5; f.y += 潮y * dt * 0.5;
    f.x = clamp(f.x, -260, SEA.w + 260); f.y = clamp(f.y, -260, SEA.h + 260);

    // 船は船団の持ち場へ寄る。組み合っている船は動かない。
    for (const s of live) {
      s.x += 潮x * dt * 0.5; s.y += 潮y * dt * 0.5;
      if (s.boarding && 引く) {          // 退くと決めたら鉤縄を切り離す
        const e = s.boarding.e; if (e) e.boarding = null; s.boarding = null;
      }
      if (s.boarding) continue;
      const tx = f.x + s.slotX, ty = f.y + s.slotY;
      const d = Math.hypot(tx - s.x, ty - s.y);
      if (d > 3) {
        const 追 = clamp(1 + d / 60, 1, 2.2);
        const 向 = Math.atan2(ty - s.y, tx - s.x);
        const 風 = 1 + 風向き(向) * 0.42 * 海の状.windPow * SHIPS[s.t].帆;
        const v = SHIPS[s.t].速 * clamp(風, 0.5, 1.55) * 追;
        s.x += Math.cos(向) * v * dt; s.y += Math.sin(向) * v * dt;
        s.facing = f.facing;
      }
    }
  }

  // 二、火。燃えれば船は傷み、乗り手は消火に追われる
  for (const f of alive) {
    for (const s of f.ships) {
      if (s.sunk || s.fire <= 0) continue;
      const 消 = SHIPS[s.t].消火 * (0.5 + f.skill / 130) * (s.crew / Math.max(1, s.crewMax));
      s.fire = Math.max(0, s.fire + (2.6 - 消 * 2.2) * dt * 手加減);
      s.hp -= s.fire * 0.055 * dt * 手加減;
      s.crew -= s.fire * 0.030 * dt * 手加減;
      if (b.fx.length < 240 && Math.random() < dt * (s.fire / 40)) {
        b.fx.push({ k: "smoke", x: s.x + (Math.random() - 0.5) * 14, y: s.y + (Math.random() - 0.5) * 14,
          t: 0, life: 1.4 + Math.random() * 0.8 });
      }
      if (s.fire > 100) { 沈める(b, f, s, "焼け落ちた"); }
    }
  }

  /* 三、矢玉と焙烙

     撃つ順を一瞬ごとに入れ替える。いつも自軍から撃っていると、こちらの矢で
     沈んだ船はその瞬間に撃ち返せない。それが何百瞬も積もって、互角の戦で
     六戦六勝という偏りになっていた（測って気づいた）。
     海の上で、どちらが先に矢を放つかは決まっていない。 */
  b.番 = ((b.番 || 0) + 1) % 2;
  const 撃つ順 = b.番 ? alive : [...alive].reverse();
  for (const f of 撃つ順) {
    const foes = alive.filter((o) => o.side !== f.side);
    if (!foes.length) continue;
    for (const s of f.ships) {
      if (s.sunk || s.boarding) continue;
      s.cool -= dt;
      if (s.cool > 0) continue;
      const st = SHIPS[s.t];
      let 的 = null, bd = 1e9;
      for (const o of foes) for (const e of o.ships) {
        if (e.sunk) continue;
        const d = Math.hypot(e.x - s.x, e.y - s.y);
        if (d < bd) { bd = d; 的 = { o, e, d }; }
      }
      if (!的 || 的.d > st.射) continue;
      s.cool = 2.0 + Math.random() * 1.2;
      // 矢玉。大船ほど多く撃てる。当たりやすさは的の大きさで決まる。
      if (st.矢 > 0) {
        const 当 = clamp(0.32 + SHIPS[的.e.t].的 / 40 + (f.skill - 55) / 260 - 的.d / (st.射 * 3.4), 0.08, 0.86);
        if (Math.random() < 当) {
          const 傷 = st.矢 * (2.4 + Math.random() * 2.2) * (0.6 + f.skill / 150) * 手加減;
          的.e.hp -= 傷;
          的.e.crew -= 傷 * 0.28;
          if (Math.random() < 0.34) 的.e.fire += 4 + Math.random() * 7;   // 火矢が帆に付く
          if (b.fx.length < 240) b.fx.push({ k: "arrow", x: s.x, y: s.y, x2: 的.e.x, y2: 的.e.y, t: 0, life: 0.42 });
        }
      }
      /* 焙烙火矢。小早の得手である。素焼きの玉に火薬を詰め、投げつけて焼く。
         風上から投げねばならない。風下から投げれば己の船へ火が返る。 */
      if (st.焙 > 0 && 的.d < st.射 * 0.72) {
        const 向 = Math.atan2(的.e.y - s.y, 的.e.x - s.x);
        const 風 = 風向き(向);                        // 1なら追い風＝風上から投げている
        if (風 > -0.2 && Math.random() < 0.5) {
          const 効 = st.焙 * (0.5 + 風 * 0.7) * (0.6 + f.skill / 140);
          的.e.fire += (9 + Math.random() * 13) * 効 * 0.45;
          的.e.hp -= 3 * 効 * 手加減;
          if (b.fx.length < 240) b.fx.push({ k: "horo", x: 的.e.x, y: 的.e.y, t: 0, life: 0.6 });
          b.log.push({ t: b.t, text: `${f.gen.name}の小早が焙烙を投げた。` });
          if (b.log.length > 60) b.log.shift();
        }
      }
      if (的.e.hp <= 0) 沈める(b, 的.o, 的.e, "撃ち沈められた");
    }
  }

  // 四、乗り移り。寄せて組み付き、太刀で決める（掛かる順も入れ替える）
  for (const f of 撃つ順) {
    const foes = alive.filter((o) => o.side !== f.side);
    for (const s of f.ships) {
      if (s.sunk) continue;
      if (s.boarding) {
        const e = s.boarding.e, o = s.boarding.o;
        if (!e || e.sunk || o.dead) { s.boarding = null; continue; }
        // 乗り手の斬り合い。乗り込みの得手と技量、そして数で決まる。
        const 我 = s.crew * SHIPS[s.t].乗込 * (0.6 + f.skill / 150);
        const 敵 = e.crew * SHIPS[e.t].乗込 * (0.6 + o.skill / 150);
        e.crew -= (我 / 26) * dt * 手加減; s.crew -= (敵 / 26) * dt * 手加減;
        if (b.fx.length < 240 && Math.random() < dt * 2.2) {
          b.fx.push({ k: "clash", x: (s.x + e.x) / 2, y: (s.y + e.y) / 2, t: 0, life: 0.3 });
        }
        if (e.crew <= 0) {                    // 乗っ取った。船は焼くか、曳いて帰る
          沈める(b, o, e, `${f.gen.name}に乗り取られた`);
          s.boarding = null;
          f.morale = Math.min(100, f.morale + 4);
          o.morale -= 6;
        } else if (s.crew <= 0) {
          沈める(b, f, s, `${o.gen.name}に乗り取られた`);
        }
        continue;
      }
      if (f.order !== "乗り移り") continue;
      if (f.routed || f.withdraw) continue;
      for (const o of foes) {
        // 退いていく船団に鉤縄は掛からない。舷を寄せる前に離れていく。
        if (o.routed || o.withdraw) continue;
        let 掛かった = false;
        for (const e of o.ships) {
          if (e.sunk || e.boarding) continue;
          if (Math.hypot(e.x - s.x, e.y - s.y) > 28) continue;
          s.boarding = { o, e }; e.boarding = { o: f, e: s };
          掛かった = true;
          break;
        }
        if (掛かった) break;
      }
    }
  }

  // 五、士気と決着
  for (const f of alive) {
    const live = fleetShips(f);
    const 割 = live / Math.max(1, f.ships.length);
    const 燃 = f.ships.filter((s) => !s.sunk && s.fire > 30).length;
    /* 燃えている船の「数」で士気を引いていた。そのため、船が多いほど早く崩れる。
       九十艘を仕立てた船団が十八秒で崩れ、船戦にならなかった。
       目に映るのは何艘燃えているかではなく、どれだけ燃えているかである。割で引く。 */
    const 燃割 = 燃 / Math.max(1, live);
    f.morale = clamp(f.morale - ((1 - 割) * 2.4 + 燃割 * 7.0) * dt * 手加減 + 0.12 * dt, 0, 100);
    if (!f.routed && (f.morale < 16 || 割 < 0.3)) {
      f.routed = true; f.order = "退く";
      const p = 退く先(b, f);
      f.tx = p.x; f.ty = p.y;
      for (const s of f.ships) { if (s.boarding) { const e = s.boarding.e; if (e) e.boarding = null; s.boarding = null; } }
      b.log.push({ t: b.t, text: `${f.gen.name}の船団が崩れ、沖へ逃れる。` });
    }
    if (f.routed || f.withdraw) {
      const p = 退く先(b, f); f.tx = p.x; f.ty = p.y;
      if (f.x < -200 || f.x > SEA.w + 200 || f.y < -200 || f.y > SEA.h + 200) f.dead = true;
    }
    if (live <= 0 && !f.destroyed) {
      f.destroyed = true;
      b.log.push({ t: b.t, text: `${f.gen.name}の船団は全滅した。` });
    }
  }

  const ps = b.fleets.filter((f) => f.side === "P" && !f.dead && !f.routed && !f.withdraw)
    .reduce((a, f) => a + fleetShips(f), 0);
  const es = b.fleets.filter((f) => f.side === "E" && !f.dead && !f.routed && !f.withdraw)
    .reduce((a, f) => a + fleetShips(f), 0);
  if (ps <= 0) { b.phase = "over"; b.result = "E"; return; }
  if (es <= 0) { b.phase = "over"; b.result = "P"; return; }
  if (b.t >= b.dusk) { b.phase = "over"; b.result = "日没"; b.orderly = true; }
}

// 退く先。自陣の側の沖へ。
export function 退く先(b, f) {
  return f.side === "P"
    ? { x: f.x, y: SEA.h + 220 }
    : { x: f.x, y: -220 };
}

function 沈める(b, f, s, なぜ) {
  if (s.sunk) return;
  s.sunk = true; s.crew = 0; s.hp = 0; s.fire = 0;
  if (s.boarding) { const e = s.boarding.e; if (e) e.boarding = null; s.boarding = null; }
  f.morale -= 3;
  b.fx.push({ k: "sink", x: s.x, y: s.y, t: 0, life: 1.6 });
  b.log.push({ t: b.t, text: `${f.gen.name}の${SHIPS[s.t].名}が${なぜ}。` });
  if (b.log.length > 60) b.log.shift();
  並べ直す(f);
}

/* ------------------------------------------------------------------ 差配 */
export function seaAI(b) {
  const alive = b.fleets.filter((f) => !f.dead && !f.destroyed);
  for (const f of alive) {
    if (f.side === "P" && !f.auto) continue;
    if (f.routed || f.withdraw) continue;
    const foes = alive.filter((o) => o.side !== f.side && !o.routed);
    if (!foes.length) continue;
    const 的 = foes.reduce((a, o) => (Math.hypot(o.x - f.x, o.y - f.y) < Math.hypot(a.x - f.x, a.y - f.y) ? o : a), foes[0]);
    const d = Math.hypot(的.x - f.x, 的.y - f.y) || 1;
    /* 小早の多い船団は寄せて焼き、乗り移る。大船の多い船団は間合いを取って撃つ。
       これが海の戦の常道である。 */
    const 小 = f.ships.filter((s) => !s.sunk && s.t === "kobaya").length / Math.max(1, fleetShips(f));
    const 寄せる = 小 > 0.45 || f.morale > 70;
    const 間 = 寄せる ? 16 : 110;
    f.order = 寄せる && d < 130 ? "乗り移り" : "射かける";
    f.tx = 的.x + ((f.x - 的.x) / d) * 間;
    f.ty = 的.y + ((f.y - 的.y) / d) * 間;
    f.狙い = 的.id;
  }
}

/* 盤の上で戦わず、その場で決着させる（見物や自勢力の関わらぬ海戦） */
export function 海戦を裁く(b, 刻 = 0.5) {
  // 盤の外で解くのだから、どちらの船団も水主の差配に任せる。
  for (const f of b.fleets) f.auto = true;
  /* まだ船を並べている最中（deploy）なら、まず戦を始める。
     stepSeaBattle は fight のときしか動かないので、これを忘れると
     四千回まわして何も起きず、日没引き分けで終わる。実際そうなっていた。
     陸の合戦の「委ねる」も同じことをしている（BattleScreen）。 */
  if (b.phase === "deploy") b.phase = "fight";
  let guard = 0;
  while (b.phase === "fight" && guard++ < 4000) stepSeaBattle(b, 刻);
  if (b.phase !== "over") { b.phase = "over"; b.result = "日没"; b.orderly = true; }
  return b;
}
