import { MAP, axisOf, fromUV, gatePos, inLayer, nearestOpenGate, routeToCastleGate } from "./castleMap.js";
import { setAiIssuing, corpsMax, corpsMen, delegated, detachAI, detachOptions, issueOrder, makeDetachment, placeSquads, reformTime, 伏せ場を探す, 伏せられる地, 伏兵の策士, 分遣の頃合い } from "./corps.js";
import { ARM_STATS, HILLS, RIVER, hasRiver, riverShift, terrainAt } from "./field.js";
import { 道のり, 野の道 } from "./route.js";
import { clamp } from "../core/util.js";

/* ------------------------------------------------ 川を避ける（GDD 8.1）

   川は速さを削り、隊列を乱し、戦う力も落とす。
     浅瀬 … 足 0.3倍・陣形維持 −14・戦う力 0.7倍
     深み … 足 0.1倍・陣形維持 −24・戦う力 0.5倍
   川の中で当たれば、まず負ける。渡るなら橋か浅瀬を通るのが道理である。

   これまでも渡り場を目指す道理はあったが、二つ穴があった。
     一、岸の別を RIVER.top だけで測っていた。川は蛇行するので、
         場所によっては岸を取り違える。
     二、いったん川へ踏み込むと「自分は向こう岸にいる」と判ぜられ、
         迂回そのものが解けて、そのまま押し渡ってしまう。
   岸の別は蛇行を含めて測り、川の中にいるときは「渡り切る」ことを目指す。 */
export function 岸(x, y) {
  if (!hasRiver()) return 0;
  const 中 = (RIVER.top + RIVER.bot) / 2 + riverShift(x);
  const 半 = (RIVER.bot - RIVER.top) / 2;
  if (y < 中 - 半) return -1;                 // 上の岸
  if (y > 中 + 半) return 1;                  // 下の岸
  return 0;                                   // 川の中
}

// 川の中に入っている点か
export const 川の中 = (x, y) => hasRiver() && 岸(x, y) === 0;


/* いちばん通りやすい渡り場。
   橋は足も落ちず隊も乱れにくいので、多少遠くても橋を選ぶ。 */
export function 渡り場(x) {
  const 橋 = (RIVER.bridge[0] + RIVER.bridge[1]) / 2;
  const 瀬 = (RIVER.ford[0] + RIVER.ford[1]) / 2;
  const 候補 = [{ x: 橋, 重み: 0.55, 名: "橋" }, { x: 瀬, 重み: 1.0, 名: "浅瀬" }]
    .map((p) => ({ ...p, 遠さ: Math.abs(p.x - x) * p.重み }));
  return 候補.sort((a, z) => a.遠さ - z.遠さ)[0];
}

/* 隘路（橋・浅瀬・木立の縁）で隊を縦陣に組み替える仕掛けは取り止めた。

   委任した隊が地物にかかるたびに長蛇へ組み替え、抜ければ元へ戻す――道理では
   あるが、盤の上ではプレイヤーの下した陣形の指図と食い違う。鶴翼を命じたのに
   長蛇で歩いており、いつ戻るのかも分からない。指図とは、指図した通りに動く
   ことをもって指図である。

   委任した隊は、これまで通り橋や浅瀬を選び、森や山を避けて進む。
   ただし陣形は、命じられたものを保つ。
   そのかわり、地物に「かかった」と判ずる目を厳しくした（field.js の 踏み込んだ地）。
   翼が水を跳ねた程度では渡渉とせず、隊長か隊の四割が踏み込んで初めて川である。 */

/* ------------------------------------------ 地物を避けて寄せる（GDD 8.6）

   委任した隊は、行き先まで真っすぐ歩いていた。あいだに川があれば押し渡り、
   森があれば突っ切る。足は落ち、隊列は乱れ、川の中で槍を合わせて負ける。

   道理で曲がるのをやめ、道を引くことにした（route.js）。野を升目に割り、
   地物ごとに通りにくさを与えて、いちばん安い道を探す。橋が近ければ橋を、
   遠ければ浅瀬を通り、森も丘も湿地も同じ勘定で避ける。

   これは寄せ手にも受け手にも等しく効く。片側だけが賢いのでは戦にならない。

   道を引き直すのは、行き先が大きく変わったときと、六秒ごと。毎瞬引き直すと
   升目の目地で道が揺れ、隊が左右に振れる。 */
function 寄せ道を引く(b, c, sx, sy) {
  const 直 = Math.hypot(sx - c.x, sy - c.y);
  /* 目前なら道は要らない――ただし、その目と鼻の先が淵であれば話は別である。
     十歩先の水を渡るにも、瀬は瀬である。近いからと真っすぐ入れば、
     隊は水の中で噛み合うことになる。 */
  if (直 < 150 && !淵を跨ぐ(c.x, c.y, sx, sy)) return null;
  if (c.squads.some((q) => q.engaged)) return null;  // 噛み合っている隊は動かさない
  if (c.wp && c.wp.length && c.道の的
      && Math.hypot(c.道の的.x - sx, c.道の的.y - sy) < 150
      && b.t - (c.道刻 || 0) < 6) return "続行";
  const 押 = !!(c.押し渡る && b.t < c.押し渡る);
  const 道 = 野の道(c.x, c.y, sx, sy, { 押し渡る: 押 });
  if (!道 || !道.length) return null;
  /* 回り道が法外なら、道さがしを捨てて真っすぐ行く。渡り場が遥かに遠い野もある。
     はじめは直の三.二倍で切っていたが、それでは橋が野の端にある野で押し渡る隊が
     出た。橋まで回るのは、たいてい直の三倍から四倍になる。四.五倍まで許す。 */
  if (道のり(道, c.x, c.y) > 直 * 4.5 + 400) return null;
  c.道の的 = { x: sx, y: sy }; c.道刻 = b.t;
  return 道;
}

// 二点を結ぶ線が淵を跨ぐか。近間でも、水を挟むなら道を引く。
function 淵を跨ぐ(x0, y0, x1, y1) {
  if (!hasRiver()) return false;
  const n = 6;
  for (let k = 0; k <= n; k++) {
    if (terrainAt(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n) === "deep") return true;
  }
  return false;
}

/* 橋の順番待ち（GDD 8.1）。

   渡り場は狭い。皆が同じ橋を目指せば、当然そこで詰まる。それでも並んで
   待つのが常道であって、待ちきれずに淵へ乗り入れるのは愚である。

   ただし知略に富む将は別である。八十を超える将は、水馴れた渡り方を心得て
   いるので足がさほど落ちない（engine の 水馴れ）。その将が、橋の先頭でもなく、
   長らく詰まっているのなら、瀬を押し渡るという判断がありうる。

   詰まりは「渡り場の袂に居ながら、まだ渡っていない刻」で測る。行き先までの
   隔たりで測ってみたが、混んでいても隊はじりじり進むので、いつまでも
   「進んでいる」ことになって詰まりを拾えなかった。 */
function 橋待ちを見る(b, c, sx, sy) {
  if (!hasRiver() || c.押し渡る) return;
  const 自岸 = 岸(c.x, c.y);
  const 場 = 渡り場(c.x);
  const 中 = (RIVER.top + RIVER.bot) / 2 + riverShift(場.x);
  const 私 = Math.hypot(場.x - c.x, 中 - c.y);
  /* 渡り場の袂に居るか、渡り場の上に居て、まだ向こう岸へ着いていない――
     これが「順番を待っている」姿である。袂だけを見ていては拾えなかった。
     隊は袂に立ち止まらず、そのまま水へ入って、そこでつかえるからである。 */
  const 着いた = 自岸 !== 0 && 自岸 === 岸(sx, sy);
  if (着いた || 私 > 340) { c.橋待ち = 0; return; }
  c.橋待ち = (c.橋待ち || 0) + 0.6;                   // 采配は〇.六秒ごと
  if (c.橋待ち < 8) return;
  if ((c.gen.wit || 55) < 80) return;                // 待つのが常道である
  const 先 = b.corps.filter((o) => !o.dead && !o.destroyed && o.side === c.side && o !== c
    && Math.hypot(場.x - o.x, 中 - o.y) < 私).length;
  if (!先) { c.橋待ち = 4; return; }                 // 先頭なら待つ。詰めているのは自分である
  c.押し渡る = b.t + 70;
  c.橋待ち = 0; c.wp = null;
  b.log.push({ t: b.t, text: `${c.gen.name}隊は橋の混みを嫌い、瀬を押し渡る。` });
}

export function battleAI(b) {
  setAiIssuing(true);
  const alive = b.corps.filter((c) => !c.dead && !c.destroyed);
  // 分遣隊は所属を問わず割り当てられた任務を自律遂行する（GDD 8.5）
  for (const c of alive) if (c.detach && !c.routed) detachAI(b, c, alive);
  /* 伏兵（GDD 8.7）。

     森に兵を伏せ、寄せて来る敵の脇腹へ現れる。知略七十八以上の将が軍にいて
     初めて出る策である。これまでプレイヤーだけの手であったが、敵も、委ねられた
     味方も同じように用いる。片側だけの技では戦にならない。

     一軍に一隊まで。全隊を伏せては戦列が空になる。 */
  if (!MAP && b.t > 2 && b.t < 45) {
    if (!b.伏兵図) b.伏兵図 = {};
    for (const side of ["P", "E"]) {
      if (b.伏兵図[side]) continue;
      /* 遊ぶ側の隊を勝手に伏せない。

         隊はもともと委任の形で始まるので、そのまま伏せると「選んでもいないのに
         伏兵にされた」ことになる。伏兵はプレイヤーが選ぶ策である。
         采配に任せるのは、全軍委任（あるいは委ねて結果を見る）と命じたときだけ。 */
      if (side === "P" && !b.委ねた) continue;
      if (!伏兵の策士(b, side)) { b.伏兵図[side] = "策士なし"; continue; }
      const 候補 = alive.filter((c) => c.side === side && delegated(b, c)
        && !c.detach && !c.routed && !c.withdraw && !c.ambush && !c.伏せ場 && !c.伏兵無用
        && !c.squads.some((q) => q.engaged));
      const 手勢 = alive.filter((c) => c.side === side && !c.detach);
      if (手勢.length < 2 || !候補.length) continue;      // 全隊を伏せはしない
      let 選 = null, 場 = null, bd = 1e9;
      for (const c of 候補) {
        const p = 伏せ場を探す(b, c);
        if (!p) continue;
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        // 小さい隊から伏せる。本隊を欠くわけにはいかない。
        const 目方 = d + corpsMen(c) * 0.12;
        if (目方 < bd) { bd = 目方; 選 = c; 場 = p; }
      }
      if (!選) { b.伏兵図[side] = "伏せ場なし"; continue; }
      b.伏兵図[side] = true;
      選.伏せ場 = 場;
      issueOrder(b, 選, { order: "移動", tx: 場.x, ty: 場.y });
      b.log.push({ t: b.t, text: `${選.gen.name}隊が木立へ回り、身をひそめる。` });
    }
  }

  /* 分遣（GDD 8.5）。

     これまでは戦の初めの二十五秒のうちに、賽の目ひとつで分遣が出ていた。
     橋を見つければ飛びつき、丘を見つければ飛びつき、敵もおらぬのに騎馬が
     側面へ回り、自陣のそばの森を偵察していた。策ではなく、癖である。

     いまは戦のあいだ折を見て検め、用のあるものだけを出す（corps.js の
     分遣の頃合い）。誰が、いつ、どこで――その三つが揃ったときだけである。
     崩れかけた隊は割かない。手薄になれば、そこから崩れる。 */
  for (const c of alive) {
    if (!delegated(b, c) || c.detach || c.routed || c.withdraw) continue;
    if (c.守備隊) continue;                            // 名も無き守備隊は兵を割かない
    if (c.morale < 55 || corpsMen(c) < corpsMax(c) * 0.5) continue;
    if (b.t < 3) continue;                       // 布陣直後は様子を見る
    if (b.t < (c.分遣を検めた || 0) + 5) continue;
    c.分遣を検めた = b.t;
    const opt = detachOptions(b, c).filter((o) => o.ok && 分遣の頃合い(b, c, o.key));
    if (!opt.length) continue;
    if (Math.random() > 0.3) continue;           // 頃合いでも、必ず割くわけではない
    makeDetachment(b, c, opt[Math.floor(Math.random() * opt.length)].key);
  }
  /* 名指しの目標（GDD 8.2）。

     「柴田勝家隊は今川義元隊に当たれ」と名指しで命じたときは、委任していなくても
     その敵に食らいつく。据え置きの座標へ向かうだけでは、敵が動いた途端に空を衝く。
     隊が動くのに合わせて、狙いを付け直してやる。

     槍を合わせている間は動かさない。噛み合っているのに狙いを直すと、
     側面を晒して回り込むことになる。 */
  for (const c of alive) {
    if (!c.狙い || c.routed || c.withdraw || c.detach) continue;
    const 追う命 = c.order === "接戦" || c.order === "突撃" || c.order === "射撃";
    const t = alive.find((o) => o.id === c.狙い);
    if (!t || t.destroyed || !追う命 || (c.side === "P" && t.ambush && !t.revealed)) { c.狙い = null; continue; }
    if (c.squads.some((q) => q.engaged)) continue;
    const d = Math.hypot(c.x - t.x, c.y - t.y) || 1;
    // 射撃は間合いを取って撃つ。近すぎれば下がらず、その場で構える。
    const 間 = c.order === "突撃" ? 20 : c.order === "射撃" ? Math.min(d, 150) : 38;
    issueOrder(b, c, { order: c.order, target: t.id, 狙い: c.狙い,
      tx: t.x + ((c.x - t.x) / d) * 間, ty: t.y + ((c.y - t.y) / d) * 間 });
  }

  for (const c of alive) {
    if (!delegated(b, c) || c.routed || c.detach) continue;
    /* 伏せに向かう隊と、伏せている隊。

       伏せ場へ着いたら身をひそめる。ひそめた隊には、以後なにも命じない。
       命じれば動き、動けば見つかる。 */
    if (c.ambush && !c.revealed) continue;
    if (c.伏兵無用) { c.伏せ場 = null; }
    if (c.伏せ場 && !c.ambush) {
      const d = Math.hypot(c.伏せ場.x - c.x, c.伏せ場.y - c.y);
      if (d > 60) { issueOrder(b, c, { order: "移動", tx: c.伏せ場.x, ty: c.伏せ場.y }); continue; }
      if (伏せられる地(b, c.x, c.y, c.side)) {
        c.ambush = true; c.revealed = false; c.伏せ場 = null;
        c.order = "待機"; c.tx = c.x; c.ty = c.y;
        b.log.push({ t: b.t, text: `${c.gen.name}隊が木立に伏せた。` });
        continue;
      }
      c.伏せ場 = null;                       // 着いてみたら伏せられぬ地であった
    }
    const mySide = c.side, foeSide = mySide === "P" ? "E" : "P";
    const foes = alive.filter((o) => o.side === foeSide && !o.routed && (o.seen || !o.ambush));

    /* 追い討ち（GDD 8.7）。

       崩れた敵をそのままにしておくと、盤の上で息を吹き返すまで戦が終わらない。
       「全隊が崩れているのに、どちらも決着しない」という長い膠着はこれである。
       槍を合わせていた相手が崩れたら追う。追われた隊は立ち直れず、やがて盤を去る。
       戦を終わらせるのは、崩れた敵を追い落とすことである。

       ただし、まだ戦える敵が残っているなら、そちらが先である。
       追い討ちに出るのは、手近に立っている敵がいないときに限る。 */
    if (!foes.length) {
      const 崩 = alive.filter((o) => o.side === foeSide && o.routed && !o.潰 && !o.withdraw
        && (o.seen || !o.ambush));
      if (崩.length && !c.routed && corpsMen(c) > corpsMax(c) * 0.2) {
        const 獲 = 崩.sort((x, y2) => Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y2.x - c.x, y2.y - c.y))[0];
        const d = Math.hypot(獲.x - c.x, 獲.y - c.y);
        c.追い討ち = true;
        issueOrder(b, c, d < 220 ? { order: "接戦", tx: 獲.x, ty: 獲.y, target: 獲.id }
          : { order: "前進", tx: 獲.x, ty: 獲.y, target: 獲.id });
        continue;
      }
      c.追い討ち = false;
      continue;
    }
    c.追い討ち = false;
    /* かつては「士気十八・兵五割五分を切り、助けもなければ盤の外へ退く」という
       決まりを置いていた。いまは崩れ（engine の 敗走）が同じ役目を果たす。
       崩れた隊は盤の外へは出ず、敵の来ない所まで退いて息をつき、立ち直れば
       戦列に戻る。二重に退かせると、まだ戦える隊が野を去ってしまう。 */
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
    /* 渡り終えたあとの再編。

       「隊列が七十二まで戻るまで待つ」とだけ決めていたので、戻らぬ所で待つと
       永久に待った。淵の中で再編を始めた隊は、水が隊列を削るので二度と七十二に
       届かない。丘の上で七十一のまま止まった隊もあった。測ったところ、
       二十四戦のうち二戦が、この待ちぼうけのまま日暮れを迎えていた。
       整うか、三十秒経つか、どちらか早いほうで切り上げる。 */
    if (c.reforming) {
      if (coh > 72 || b.t > (c.再編まで || 0)) { c.reforming = false; c.再編まで = 0; }
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
        // 水の中では整わない。上がりきってから整える。
        if (coh < 62 && !川の中(c.x, c.y)) {
          c.reforming = true; c.再編まで = b.t + 30;
          c.order = "待機"; c.tx = c.x; c.ty = c.y; continue;
        }
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
        /* 一割まで待つと、門が破れる前に下がりきれない。四半分で見切りをつける。
           「城門が一割を切っても内の門へ行かない」という声はここである。 */
        const need = !g2 || g2.broken || g2.hp / g2.max < 0.25;
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
          /* 持ち場へ寄る。ただし「三十四を超えたら動く」だけでは、ちょうどその際で
             毎瞬「動け」と「そこで守れ」が入れ替わり、隊がその場で震えて見える。
             動き出す間合いと、着いたとみなす間合いを分ける。 */
          if (d2 > (c.持ち場に着いた ? 46 : 30)) {
            c.持ち場に着いた = false;
            issueOrder(b, c, { order: "移動", tx: p2.x, ty: p2.y });
            continue;
          }
          c.持ち場に着いた = true;
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
            if (c.守備隊) {
              /* 守備隊は討って出ない（GDD 9.3）。門を支え、外へ射かけるだけである。
                 名も無き足軽小頭に、門を開いて野へ出よとは言えない。 */
              const 射手 = c.squads.some((q) => q.men > 0 && (q.type === "yumi" || q.type === "teppo"));
              if (射手 && foes.length) {
                const t4 = [...foes].sort((x, y2) =>
                  Math.hypot(x.x - gp.x, x.y - gp.y) - Math.hypot(y2.x - gp.x, y2.y - gp.y))[0];
                issueOrder(b, c, { order: "射撃", tx: t4.x, ty: t4.y, target: t4.id });
              } else issueOrder(b, c, { order: "守備", tx: c.x, ty: c.y });
              continue;
            }
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
          if (!inLayer(MAP, h, c.x, c.y) && near > 130) {
            issueOrder(b, c, { order: "移動", tx: MAP.cx + h.ox, ty: MAP.cy + h.oy });
            continue;
          }
        }
      }
    }
    /* 高みを取る（GDD 8.6）。

       丘は足を鈍らせるが、登りきれば見晴らしが利き（見通し三百六十）、
       戦う力も一割五分増す。受け手は、近くに丘があるなら先に登って備える。
       寄せ手も、射手を多く抱える隊は高みを取りたがる。

       川向こうの丘は取りに行かない。丘ひとつのために渡河しては元も子もない。
       すでに敵と間近であれば登らない。背を見せて登る隙はない。

       兵で優る受け手は丘を取らない。高みは弱者の頼りである。数で押せる側が
       坂の上で待てば、相手に整える暇を与え、こちらは足の鈍る地に留まるだけで、
       せっかくの数が生きない。押して出て、野で決するほうがよい。
       優劣は隊ごとではなく、軍全体の兵力で測る。丘取りは軍としての構えである。 */
    if (!MAP && HILLS.length && !c.squads.some((q) => q.engaged)) {
      const 射 = c.squads.filter((q) => ARM_STATS[q.type].range > 0).reduce((a, q) => a + q.men, 0);
      const 味方 = alive.filter((o) => o.side === mySide && !o.routed)
        .reduce((a, o) => a + corpsMen(o) * (0.7 + o.morale / 330), 0);
      const 敵勢 = alive.filter((o) => o.side === foeSide && !o.routed)
        .reduce((a, o) => a + corpsMen(o) * (0.7 + o.morale / 330), 0);
      const 押せる = 味方 > 敵勢 * 1.2;
      const 守勢 = c.side !== b.attacker && !押せる;
      const 欲しい = 守勢 || 射 / Math.max(1, corpsMen(c)) > 0.55;
      const 敵まで = Math.hypot(tgt.x - c.x, tgt.y - c.y);
      /* どの丘を目指すか。

         いま足を掛けている丘があるなら、その丘の頂を目指す。無ければ手近な丘。
         これを分けないと、麓に立った隊が「自分は丘にいる」と判じて、そこで
         守りに就いてしまう。斜面の裾は高みではない。見晴らしも利かず、
         寄せ手と同じ高さで槍を合わせることになる。盤の上でも、丘の手前で
         ぴたりと止まって動かぬ隊として見えていた。

         丘ひとつに一隊（GDD 8.6）。

         手近な丘をめいめいに選ばせると、受け手の全隊が同じ一つの頂へ折り重なる。
         頂は狭い。三隊も登れば翼は裾へはみ出して高みの利は得られず、そのあいだ
         野に構えるべき戦列は空になる。高みを取るのは戦列の一端を高くするためで
         あって、軍ごと丘の上へ引っ越すためではない。

         そこで、押さえた丘を b.丘の主 に控えておく（丘の番号：押さえた隊の id）。
         押さえた隊が討たれるか、崩れるか、退くかしたなら、その丘は空く。
         いま足を掛けている丘が空いていればそこ、埋まっていれば次に近い空き丘、
         空き丘が無ければ丘は諦めて野で構える。

         縛るのは采配――委任した隊と敵方――だけである。プレイヤーが手ずから
         登らせるぶんには、何隊重ねようと指図は指図として通す（この段は
         委任した隊しか通らない）。 */
      if (!b.丘の主) b.丘の主 = {};
      const 空き丘 = (i) => {
        const 主 = b.丘の主[i];
        if (主 == null || 主 === c.id) return true;
        const o = b.corps.find((x) => x.id === 主);
        return !o || o.dead || o.destroyed || o.routed || o.withdraw;
      };
      const 立つ番 = HILLS.findIndex((h) => (c.x - h.x) ** 2 + (c.y - h.y) ** 2 < h.r ** 2);
      let 番 = -1;
      if (欲しい) {
        if (立つ番 >= 0 && 空き丘(立つ番)) 番 = 立つ番;
        else {
          let 近さ = Infinity;                              // 次に近い空き丘を探す
          for (let i = 0; i < HILLS.length; i++) {
            if (!空き丘(i)) continue;
            const d = (c.x - HILLS[i].x) ** 2 + (c.y - HILLS[i].y) ** 2;
            if (d < 近さ) { 近さ = d; 番 = i; }
          }
        }
      }
      const 丘 = 番 >= 0 ? HILLS[番] : null;
      if (丘 && 敵まで > 260) {
        const 遠さ = Math.hypot(丘.x - c.x, 丘.y - c.y);
        const 頂 = clamp(丘.r * 0.45, 60, 120);            // ここまで登れば頂とみなす
        const 間 = (守勢 ? 540 : 320) + 丘.r * 0.8;         // 大きな丘ほど遠くからでも目指す
        if (遠さ > 頂 && 遠さ < 間 && 岸(c.x, c.y) === 岸(丘.x, 丘.y)) {
          b.丘の主[番] = c.id;                              // この丘は我が隊が押さえる
          const 道 = 寄せ道を引く(b, c, 丘.x, 丘.y);
          if (道 === "続行") continue;
          if (道) { c.wp = 道; issueOrder(b, c, { order: "移動", tx: 道[0].x, ty: 道[0].y, keepPath: true }); continue; }
          issueOrder(b, c, { order: "移動", tx: 丘.x, ty: 丘.y });
          continue;
        }
        // 頂に就いた受け手は、そこで待ち受ける。降りて出迎える理由がない。
        if (守勢 && 遠さ <= 頂) {
          b.丘の主[番] = c.id;
          issueOrder(b, c, { order: "守備", tx: c.x, ty: c.y });
          continue;
        }
      }
    }
    // 接敵はプレイヤーと同じ間合いで止まり、命令伝達も同じ遅延を受ける（GDD 13.2）。
    // すでに間合いに入っていれば、狙いを直しても後ろへは下がらない。
    const dd = Math.hypot(c.x - tgt.x, c.y - tgt.y) || 1;
    let sx = dd <= 42 ? c.x : tgt.x + ((c.x - tgt.x) / dd) * 38;
    let sy = dd <= 42 ? c.y : tgt.y + ((c.y - tgt.y) / dd) * 38;
    /* 川ごしの向き合い方（GDD 8.1）。

       受け手は川を渡らない。渡り場のこちら岸で待ち、敵が水から上がってくる
       ところを叩く。半渡を撃つ、という。両軍とも渡り場を目指せば、双方が同じ
       瀬へ集まって水の中で噛み合う。それでは川を避けた甲斐がない。

       攻め手は渡る。ここで気をつけるのは、止まる先が水だからといって手前の岸へ
       引き戻さないことである。引き戻すと、行き先が足元になって道が引けず、
       両軍が岸を挟んで睨み合ったまま日が暮れた。二十四戦のうち三戦がこれで
       あった。向こう岸を目指させておけば、道さがしが橋なり瀬なりへ導く。

       岸が同じなのに止まる先だけが水にかかるとき（蛇行の際）は、岸へ引く。 */
    const 自岸 = 岸(c.x, c.y), 的岸 = 岸(tgt.x, tgt.y);
    const 渡る要 = !MAP && hasRiver() && 的岸 !== 0 && 自岸 !== 的岸;
    if (!MAP && hasRiver() && !c.routed && !c.withdraw && 渡る要 && c.side !== b.attacker && 自岸 !== 0) {
      const 場 = 渡り場(c.x);
      const 中 = (RIVER.top + RIVER.bot) / 2 + riverShift(場.x);
      const 半 = (RIVER.bot - RIVER.top) / 2;
      sx = 場.x; sy = 中 + 自岸 * (半 + 168);
    } else if (川の中(sx, sy) && !渡る要) {
      const 中 = (RIVER.top + RIVER.bot) / 2 + riverShift(sx);
      const 半 = (RIVER.bot - RIVER.top) / 2;
      const 岸へ = 自岸 !== 0 ? 自岸 : (c.y < 中 ? -1 : 1);
      sy = 中 + 岸へ * (半 + 26);
    }
    if (渡る要 && c.side === b.attacker) 橋待ちを見る(b, c, sx, sy);
    /* 地物を避けて寄せる。道が引ければそれを辿り、引けなければ真っすぐ行く。 */
    if (!MAP && !c.routed && !c.withdraw) {
      const 道 = 寄せ道を引く(b, c, sx, sy);
      if (道 === "続行") continue;
      if (道) {
        c.wp = 道;
        issueOrder(b, c, { order: "移動", tx: 道[0].x, ty: 道[0].y, keepPath: true });
        continue;
      }
    }
    issueOrder(b, c, { order: "接戦", tx: sx, ty: sy });
  }
  setAiIssuing(false);
}

