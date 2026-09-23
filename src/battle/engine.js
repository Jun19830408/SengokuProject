import { battleAI } from "./ai.js";
import { MAP, SIEGE_KIT, axisOf, fromUV, gatePos, gateReachable, inLayer, nearestOpenGate, routeToCastleGate, 門の控え口 } from "./castleMap.js";
import { ROW, SP, corpsMax, corpsMen, notify, placeSquads } from "./corps.js";
import { 組の鍵 } from "../core/roster.js";
import { ARM_STATS, BASE, FIELD, TERRAIN, WEATHER, fieldScale, passable, passableFor, terrainAt, 山が遮るか, 踏み込んだ地, 隊の地 } from "./field.js";
import { clamp } from "../core/util.js";
import { px, py } from "../data/geo.js";
import { delegated, issueOrder, 内の門へ退く, 退き場, 退き先, 退かせる } from "./corps.js";

/* 水馴れ（GDD 8.1）。

   知略八十を超える将は、瀬の踏み場・渡る間合い・馬の入れ方を心得ている。
   同じ淵を渡っても足がさほど落ちない。ただし戦う力は落ちたままである。
   水の中で当たれば不利、というところは動かさない。渡り方の巧拙であって、
   水の中で強くなるわけではない。 */
export function 水馴れの足(c, 地, 足) {
  if (地 !== "deep" && 地 !== "ford" && 地 !== "moat" && 地 !== "karabori") return 足;
  const 知 = (c.gen && c.gen.wit) || 55;
  if (知 < 80) return 足;
  const k = 0.45 + Math.min(1, (知 - 80) / 20) * 0.25;   // 知略八十で四割五分、百で七割ぶん埋める
  return 足 + (1 - 足) * k;
}

export function createBattle(playerCorps, enemyCorps, attackerSide) {
  const r = Math.random();
  const weather = r < 0.18 ? "雨" : r < 0.45 ? "曇" : "晴";
  const b = {
    t: 0, phase: "deploy", corps: [...playerCorps, ...enemyCorps],
    initial: { P: playerCorps.reduce((s, c) => s + corpsMen(c), 0), E: enemyCorps.reduce((s, c) => s + corpsMen(c), 0) },
    log: [], result: null, attacker: attackerSide, aiClock: 0,
    /* 日没までの刻。盤の広さに合わせる。

       野を広げたので、寄せ合うだけで刻を食うようになった。四百八十秒のままでは、
       両軍が触れる前に日が暮れる。広い野を与えておきながら、渡り切る時を
       与えないのでは、広げた意味がない。 */
    weather, dusk: Math.round(480 * clamp(Math.pow(FIELD.w / 1080, 0.62), 1, 3.2)),
    retreat: null, orderly: false, fx: [],
  };
  for (const c of b.corps) { placeSquads(c, true); c.lastSeen = { x: c.x, y: c.y, t: 0 }; }
  /* 両軍の布陣の中心を覚えておく（GDD 8.5）。

     分遣を出すか否かは、どこで出すかによる。自陣のそばで森を探っても、
     敵がいるはずがない。敵陣のそばで橋を守っても、守るべきものがない。
     「自陣の側か、敵陣の側か」を測るために、初めの布陣を控えておく。 */
  const 中 = (arr) => {
    const 生 = arr.filter((c) => corpsMen(c) > 0);
    const n = 生.length || 1;
    return { x: 生.reduce((a, c) => a + c.x, 0) / n, y: 生.reduce((a, c) => a + c.y, 0) / n };
  };
  b.陣 = { P: 中(playerCorps), E: 中(enemyCorps) };
  b.陣間 = Math.max(200, Math.hypot(b.陣.P.x - b.陣.E.x, b.陣.P.y - b.陣.E.y));
  return b;
}

export function applyDamage(b, fCorps, e, dmg, flank, valor, byCorps, byQ) {
  // 挟撃を受けている隊は受ける損害がやや増える（二方向1.12倍、三方向以上1.22倍）
  const pinch = fCorps.pinch >= 3 ? 1.22 : fCorps.pinch === 2 ? 1.12 : 1;
  const before = e.men;
  /* 筋書きのある一戦は、損害の出方を緩める（GDD 8.9）。

     街道の合戦は百秒ほどで片が付く。一回で遊びきる関ヶ原を同じ速さで
     走らせると、布陣を見終わらぬうちに三十四秒で決着した。それでは
     小早川も南宮山も出番が無い。史実の関ヶ原は六時間戦っている。 */
  e.men = Math.max(0, e.men - dmg * pinch * (b.損の手加減 || 1));
  const lost = before - e.men;
  fCorps.loss[e.origin] += lost;
  /* 駒の長の武功（GDD 6.2）。

     盤の駒は名簿の一組と一対一であり、組ひとつに長がひとり居る。敵の駒を
     討ち取ったなら、それは討ち取った駒の長の手柄である。ここで数えておき、
     戦が終わってから盤の側（state）へ書き戻す。

     数えるのは「駒を潰した数」であって、討った人数ではない。人数で数えると
     大きな駒を削っただけの隊が上位に来る。討ち取ってこそ手柄である。 */
  /* 戦の痕を野に残す（GDD 8.1）。

     踏み荒らされた土、倒れた者の跡。合戦が進むにつれて野が荒れていくのを、
     絵のほうでも見せる。ここでは印を控えるだけで、焼くのは画面の側である
     （跡の画布へ焼き足すので、毎こまの費えは増えない）。 */
  if (lost > 6) {
    b.跡 = b.跡 || [];
    if (b.跡.length < 900) {
      b.跡.push({ x: e.x + (Math.random() - 0.5) * 16, y: e.y + (Math.random() - 0.5) * 16,
        k: "血", r: 4 + Math.min(9, lost * 0.5) });
    }
  }
  if (before > 0 && e.men <= 0 && byQ && byQ.src) {
    b.武功 = b.武功 || {};
    const 鍵 = 組の鍵(byQ.src);
    b.武功[鍵] = (b.武功[鍵] || 0) + 1;
  }
  // 武勇は「相手の陣形を崩す圧力」として効く。士気そのものは下げない（GDD 8.3）
  // 零より下へは落とさぬ。負のまま持ち越すと、戦のあと整え直すのに際限がなくなる。
  e.cohesion = Math.max(0, e.cohesion - lost * 0.7 * flank * (0.55 + (valor || 60) / 100));
  /* 損害による士気の削れ（GDD 8.7）。

     もとは「失った兵の割 × 二.二」であった。一割を失えば士気が二十二も落ちる
     ので、五分の勝負をしているうちに士気が十五を切り、まだ八割の兵を抱えた隊が
     崩れて盤から消えた。戦がそこで終わってしまう。

     削れを半ばに緩め、統率で堪えられるようにした。統率九十の将なら、
     同じ損害でも九分ほどしか響かない。 */
  /* 損害の割は、隊の大きさで割る。ところが城方の隊は小さく（九百人ほど）、
     寄せ手は大きい（二千四百人ほど）。同じ人数を失っても、小さい隊は割が
     二倍半にも出るので、士気の落ち方がまるで違ってくる。城攻めで城方だけが
     次々に崩れていたのは、主にこれである。
     千二百人を下限に置き、小さい隊が割を食いすぎぬようにする。 */
  const share = lost / Math.max(1200, corpsMax(fCorps));
  const 堪え = clamp(1.3 - ((fCorps.gen && fCorps.gen.lead) || 60) / 200, 0.8, 1.2);
  /* 削れをさらに緩める。二.二 → 一.一五 → 〇.六。

     一.一五でも、槍を合わせている隊は毎秒二つ三つと士気を落としていた。
     半刻もせずに十五を切って崩れ、退いて戻り、また崩れる。盤の上では
     旗が上がったり下がったりし続けて、戦の綾がまるで読めない。

     削れた量はここでは引かず、いったん溜める。一秒あたりに落ちる幅に
     歯止めを掛けるためである（engine の 士気の目減り）。 */
  fCorps.士気の溜 = (fCorps.士気の溜 || 0) + share * 100 * 0.6 * (1 + (flank - 1) * 0.8) * 堪え;
  // 押しているか押されているかを数える（士気の上げ下げに使う。刻ごとに褪せる）
  fCorps.損 = (fCorps.損 || 0) + lost;
  if (byCorps) byCorps.功 = (byCorps.功 || 0) + lost;
}

/* 淵（深い川）は、決めてからでなければ踏み込まない（GDD 8.1）。

   道さがしは淵を法外な費えとして避けるが、道が引けなかったときや、持ち場が
   対岸にあるときに、組が水へ歩き入っていた。実測では、川のある野で兵の三.六％が
   常時どこかの淵に立っていた。槍を水の中で合わせれば、足も隊列も戦う力も落ちる。

   足元の水は、将が決めて入るものである。押し渡ると決めた隊、崩れて逃げる兵、
   すでに水中にいて岸へ上がろうとする組――この三つだけが水を踏める。 */
function 淵を踏めるか(c, b, x, y, 足元) {
  if (!c) return true;
  if (terrainAt(x, y) !== "deep") return true;
  if (c.押し渡る && b && b.t < c.押し渡る) return true;     // 押し渡ると決めた隊
  if (c.routed || c.withdraw) return true;                 // 崩れた兵は何でも渡る
  if (足元 === "deep") return true;                        // すでに水の中。岸へ上がるために動く
  return false;
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
  /* 筋書きのある一戦は、分岐と備の差配をここで進める。

     采配（battleAI）のあとに置く。前に置いていたころは、備ごとにまとめて
     当たらせた下知を、その直後に采配が隊ごとの下知で塗り潰していた。 */
  if (b.進行) b.進行(b, dt);
  /* 去就の定まらぬ隊（日和見）は、盤の上にいるが戦には加わらない（GDD 8.9）。

     松尾山の小早川も、南宮山の毛利も、開戦から昼まで一歩も動かなかった。
     旗色が決まるまでは、見えてはいるが撃ちも撃たれもしない。
     生きている隊の数から外すことで、動きも、狙いも、士気も止まる。 */
  const alive = b.corps.filter((c) => !c.dead && !c.destroyed && !c.日和見);

  /* この刻、どの隊・どの組がどの地にかかっているかを、はじめに一度だけ判ずる。
     一点で測るのではなく、踏み場の大半がその地であるときに限る（field.js を参照）。
     以降の足・疲れ・戦う力・視界は、すべてこの判じを使う。 */
  for (const c of alive) {
    for (const q of c.squads) q.地 = 踏み込んだ地(q.x, q.y);
    c.地芯 = 踏み込んだ地(c.x, c.y);
    c.地 = 隊の地(c);
  }

  for (const c of alive) {
    const foes = alive.filter((o) => o.side !== c.side);
    let seen = false;
    for (const f of foes) {
      // 山の陰に回った隊は見えない（GDD 8.6）。隊と隊の中どころで判ずる。
      if (山が遮るか(c.x, c.y, f.x, f.y)) continue;
      for (const q of f.squads) {
        const t = TERRAIN[c.地];
        const sight = (c.ambush && !c.revealed ? 95 : t.sight) * WEATHER[b.weather].sight * fieldScale();
        if (Math.hypot(q.x - c.x, q.y - c.y) < sight) { seen = true; break; }
      }
      if (seen) break;
    }
    /* 筋書きの一戦は、互いに見えている（GDD 8.9）。

       関ヶ原は開けた盆地で、両軍は夜明けから互いの旗指物を見ていた。
       霧が晴れたあとは隠れようがない。見えぬ敵を点線の「敵影」で描くと、
       南宮山の押さえのように遠くに構える隊が盤から消えてしまう
       （遊ぶ側からは「徳川軍が突然消えた」と見える）。 */
    c.seen = seen || !!b.筋書き;
    if (c.seen) c.lastSeen = { x: c.x, y: c.y, t: b.t };
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

        /* 代表点そのものを、兵から離れすぎないようにする（GDD 8.3）。

           これまで縛っていたのは「絵に描く武将の位置（gx,gy）」だけで、
           隊の代表点（x,y）は自由に歩いていた。組の持ち場は代表点から測るので、
           代表点が先へ行けば持ち場も先へ行く。ところが噛み合っている組は
           持ち場へ戻らない決まりである（戻らせると前後に震える）。

           結果、槍を合わせている組を置き去りにして代表点だけが進み、
           組は百十歩の「はぐれ」に落ちて隊の来た道を辿り始める。関ヶ原で
           測ると、組の一割八分がこの「はぐれ」であった。盤の上では、
           隊が左右へ流れて崩れたように見える。

           大将は兵を置いて先へは行かない。代表点は、兵の重心から
           隊の広がりぶんまでしか離れられないものとする。 */
        let 広 = 0;
        for (const q of c.squads) {
          if (q.men <= 0) continue;
          const r = Math.hypot(q.x - cx2, q.y - cy2);
          if (r > 広) 広 = r;
        }
        c.広がり = 広;
        /* 縄の長さは、槍を合わせているかどうかで変える。

           行軍のあいだに短い縄で縛ると、代表点が毎瞬引き戻されるので、隊は
           組の足でしか進めなくなる。測ると、丘へ登る隊が三つとも頂に届かず、
           前へ出る隊も一歩も出なくなった。歩いているあいだは組がちゃんと
           追いつくのだから、縄は長くてよい――代表点が兵を置き去りにして
           野を突っ切るのを止めれば足りる。

           槍を合わせたら短くする。噛み合った組は持ち場へ戻らない決まりなので、
           ここで縄が長いと、斬り結んでいる組を置いて代表点だけが進む。 */
        const 噛んでいる = c.squads.some((q) => q.men > 0 && q.engaged);
        /* 縄は野の話である。城内では隊の居場所は門で決まっており（持ち場に
           据えられる）、代表点を兵の重心へ引けば持ち場から外れる。実際、
           外の門が残っているのに城方が本丸の門へ就き替えた。 */
        if (!MAP && !c.routed && !c.withdraw) {
          const 縄 = 噛んでいる ? clamp(広 * 0.38, 34, 120) : clamp(広 * 0.95, 70, 280);
          const dx2 = c.x - cx2, dy2 = c.y - cy2, dd = Math.hypot(dx2, dy2);
          if (dd > 縄) {
            /* 縄で引き戻すときも、行き先から遠ざける向きには効かせない。
               行き先に着いて組の追いつくのを待っている隊が、組の重心へ
               引かれて後ずさりして見えた（実測、着いた隊が三十〜五十歩戻った）。 */
            const nx2 = cx2 + (dx2 / dd) * 縄, ny2 = cy2 + (dy2 / dd) * 縄;
            let mx3 = nx2 - c.x, my3 = ny2 - c.y;
            const 行2 = Math.hypot(c.tx - c.x, c.ty - c.y);
            if (行2 > 12) {
              const ux = (c.tx - c.x) / 行2, uy = (c.ty - c.y) / 行2;
              const 沿 = mx3 * ux + my3 * uy;
              if (沿 < 0) { mx3 -= 沿 * ux; my3 -= 沿 * uy; }
            }
            c.x += mx3; c.y += my3;
          }
        }
      }
    }
  }

  // 味方の武将隊どうしの重なりだけを押し戻す。
  // 「離れすぎたら本隊へ戻す」ような、命じていない移動はさせない。
  for (const c of alive) {
    if (c.detach || c.routed || c.withdraw || (c.ambush && !c.revealed)) continue;
    /* 槍を合わせている隊は、隣に押されて横へ動かない（GDD 8.3）。
       噛み合いとは足を止めて斬り結ぶことである。そこへ味方の押し合いを
       掛けると、戦列が横へ流れ、置き去りにされた組がはぐれる。

       その場を動かぬと決めている隊（控えの旗本・山の押さえ・戦わぬ島津）も
       同じである。押されて持ち場から流れては、動かぬと決めた意味がない
       （八百秒で五百八十歩も流されていた）。 */
    /* まったく押されなくすると、押し合いが片側だけになる。動かぬ隊は壁になり、
       隣の隊はその壁から一方的に押され続けて、盤の外まで流れ出た（実測、
       小西行長隊が八十秒で盤の左外へ）。押し返さないのではなく、押されにくい。 */
    const 踏ん張る = c.squads.some((q) => q.men > 0 && q.engaged) || c.不戦 || c.控え || c.縛り;
    const mates = alive.filter((o) => o !== c && o.side === c.side && !o.detach && !o.routed && !o.withdraw);
    if (!mates.length) continue;
    /* 押し合いは、重なったときだけ（GDD 8.3）。

       味方が百五十歩のうちにいれば、常に押し戻す力が掛かっていた。門前のように
       隊が寄り集まる場では、この押し合いと「行き先へ進め」の下知とが毎瞬打ち消し
       合い、隊はその場で前後に揺れる。実測では、城攻めで隊の動きの二七％が前と逆。

       行き先に着いて留まっている隊は、よほど重なっていない限り押されない。避けるのは
       通りかかる側の務めであって、陣を敷いている側ではない。城内は狭いので、
       押し合いの届きも野より短く取る。 */
    const 届き = MAP ? 96 : 150;
    const 停まっている = Math.hypot(c.tx - c.x, c.ty - c.y) <= 6;
    let sx = 0, sy = 0;
    for (const o of mates) {
      const d = Math.hypot(o.x - c.x, o.y - c.y);
      if (d <= 0.1 || d >= 届き) continue;
      if (停まっている && d > 36) continue;          // 陣を敷いている隊は、重ならぬ限り動かさない          // 陣を敷いている隊は、重ならぬ限り動かさない
      sx += ((c.x - o.x) / d) * (届き - d); sy += ((c.y - o.y) / d) * (届き - d);
    }
    // 隊どうしが押し合う力。これも城壁を越えてはならない。
    if (c.pinned) continue;              // 門に取り付いた隊は動かない
    // 押し合いの力が行軍の足より強いと、隣の隊に阻まれて一歩も進めなくなる。
    const cap = MAP ? 12 : 40;
    const 踏 = 踏ん張る ? 0.16 : 1;
    let px = clamp(sx * (MAP ? 0.3 : 0.55), -cap, cap) * dt * 踏;
    let py = clamp(sy * (MAP ? 0.3 : 0.55), -cap, cap) * dt * 踏;
    /* 押し合いで、行き先から遠ざかることはない（GDD 8.3）。

       味方に押されて後ろへ下がる隊があった。測ると、槍も合わせていない
       隊の動きの二割八分が「行き先から遠ざかる向き」で、ひどいものは
       三百歩、八百歩と押し流されていた。遊ぶ側から見れば、下知したはずの
       隊が勝手に退いているとしか見えない。

       避けるのは構わないが、避けるなら横へ避ける。行き先へ向かう成分を
       打ち消す向きの押しは落とす。 */
    const 行 = Math.hypot(c.tx - c.x, c.ty - c.y);
    if (行 > 12) {
      const ux = (c.tx - c.x) / 行, uy = (c.ty - c.y) / 行;
      const 沿 = px * ux + py * uy;
      if (沿 < 0) { px -= 沿 * ux; py -= 沿 * uy; }
    }
    const 前の隔 = Math.hypot(c.tx - c.x, c.ty - c.y);
    if (passable(c.x + px, c.y + py)) { c.x += px; c.y += py; }
    else if (passable(c.x + px, c.y)) c.x += px;
    else if (passable(c.x, c.y + py)) c.y += py;
    /* 押し合いで行き先から引き離されない（GDD 8.3）。

       横へ避けるのは構わないが、押されて行き先から遠ざかるのは後退である。
       いま居る所より遠くへは流されない――ただし、行き先にぴたりと着いて
       いる隊が身じろぎもできぬのでは、重なった隊が離れられないので、
       四十歩の遊びだけは残す。 */
    {
      const 後の隔 = Math.hypot(c.tx - c.x, c.ty - c.y);
      const 許 = Math.max(前の隔, 40);
      if (後の隔 > 許 + 0.001) {
        const k = 許 / 後の隔;
        c.x = c.tx + (c.x - c.tx) * k;
        c.y = c.ty + (c.y - c.ty) * k;
      }
    }
    /* 押されて盤の外へ出ない。盤を落ちるのは崩れて逃げる隊だけである。 */
    if (!MAP && !c.routed && !c.withdraw) {
      c.x = clamp(c.x, 30, FIELD.w - 30);
      c.y = clamp(c.y, 30, FIELD.h - 30);
    }
  }

  // 隊の来た道を覚える。はぐれた組は武将と同じ道筋を辿って戻る。
  for (const c of alive) {
    c.trailT = (c.trailT || 0) - dt;
    if (c.trailT <= 0) {
      c.trailT = 0.6;
      c.trail = c.trail || [];
      const last = c.trail[c.trail.length - 1];
      if (!last || Math.hypot(last.x - c.x, last.y - c.y) > 18) {
        c.trail.push({ x: c.x, y: c.y });
        // 踏み跡。大軍の通ったあとは草が倒れ、土が覗く
        b.跡 = b.跡 || [];
        if (b.跡.length < 900 && corpsMen(c) > 200) {
          b.跡.push({ x: c.x, y: c.y, k: "踏", r: 16 + Math.min(26, corpsMen(c) / 90) });
        }
      }
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
    if (!(dist > 6) || HOLD || (c.ambush && !c.revealed)) {
      // 止まる隊の足は、すっと止まらず、少しずつ落ちる
      if (c.速) { c.速.x *= Math.max(0, 1 - dt / 0.4); c.速.y *= Math.max(0, 1 - dt / 0.4); }
    }
    if (dist > 6 && !HOLD && !(c.ambush && !c.revealed)) {
      const terr = TERRAIN[c.地];
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
      /* 隊が伸びきっていたら足を緩めて組の追いつきを待つ。
         ただし交戦中は隊が広がるのが当たり前なので、伸びを理由に足を止めない。

         退いている隊も待たせない。槍を合わせていた組は散らばっているので、
         この足かせを掛けると lag が0.12まで落ちる。撤退を命じても這うようにしか
         下がらず、盤の外へ出るまでに何十分もかかっていた。
         退き口とは、隊形を捨てて離れることである。遅れた者は自力で追う。 */
      const lag = (engaged || c.withdraw || c.routed) ? 1
        : far <= room ? 1 : far > room * 1.8 ? 0.12 : 0.55;
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
      /* 寄せ道の足（GDD 9.3）。

         城攻めの寄せ手は、城の外を渡るあいだ足を緩める。楯を並べ、隊列を
         整え、矢を防ぎながら寄せるからである。駆けて行けば的になる。

         これを入れないと、盤が広がるほど足も速くなる決まり（fieldScale）の
         せいで、どれだけ遠くに構えても数秒で城門に着いてしまい、
         坂を登ることにも、射かけられることにも意味が無くなる。

         曲輪の中へ入れば常の足に戻る。そこは槍と刀の間合いである。 */
      /* 橋の混み（GDD 8.1）。

         橋は狭い。同じ板の上に幾隊も乗れば、当然つかえる。これまで隊は互いを
         擦り抜けていたので、渡り場に何隊集まろうと誰も待たなかった。それでは
         「橋が混んでいるから瀬を押し渡る」という判断が生まれようがない。

         自分より先に渡っている味方の数だけ足を落とす。押し合いへし合いである。 */
      let 混み = 1;
      if (!MAP && (c.地 === "bridge" || c.地 === "ford") && dist > 6) {
        let 前 = 0;
        for (const o of alive) {
          if (o === c || o.side !== c.side || o.地 !== c.地) continue;
          if (Math.hypot(o.x - c.x, o.y - c.y) > 130) continue;
          if (Math.hypot(c.tx - o.x, c.ty - o.y) < Math.hypot(c.tx - c.x, c.ty - c.y)) 前++;
        }
        if (前) 混み = Math.max(0.3, 1 - 前 * 0.3);
      }
      let 寄せ道 = 1;
      if (MAP && c.side === b.attacker && !engaged && !c.withdraw && !c.routed) {
        const o = MAP.layers[0];
        const 外 = !inLayer(MAP, o, c.x, c.y, MAP.t + o.masu + MAP.t + 8);
        if (外) 寄せ道 = 0.6;
      }
      const v = 隊の足 * fieldScale() * (b.足の手加減 || 1) * 水馴れの足(c, c.地, terr.speed) * W.speed * chg * (engaged ? 0.35 : 1)
        * (0.6 + c.morale / 250) * (1 - c.fatigue / 240) * lag * 寄せ道 * 混み;
      /* 行き過ぎない（GDD 8.3）。

         歩幅を残りの隔たりで頭打ちにしていなかった。足は毎秒三十歩ほど、刻みは
         〇.二秒であるから一歩が六歩ぶん。止まる幅（六歩）とちょうど同じ寸法なので、
         隊は的を飛び越しては引き返し、その場で前後に揺れていた。実測では、城攻めで
         隊の動きの三六％が前と逆であった。組は隊に付いて動くので、揺れは隊のぶんだけ
         そのまま組へ伝わる。残りの隔たりを超えて踏み出さないようにする。 */
      /* 足取りの慣性（GDD 8.3）。

         隊には幾つもの力が掛かる――下知の引き、味方との押し合い、壁の押し返し、
         門の順番待ち。これらが毎瞬入れ替わるので、隊はその場で前後に振れていた。
         軍勢は独楽ではない。いま進んでいる向きは、次の瞬間も残る。

         望む足を、いまの足へ半秒ほどかけて寄せる。相反する下知は打ち消し合う前に
         鈍り、隊は滑らかに向きを変える。 */
      const 望x = (dx / dist) * v, 望y = (dy / dist) * v;
      const 速 = c.速 || { x: 望x, y: 望y };
      /* 向きを変えるのに要る間は、おおよそ一秒弱。千の兵が一度に向き直れはしない。 */
      const 寄せ = Math.min(1, dt / 0.9);
      速.x += (望x - 速.x) * 寄せ; 速.y += (望y - 速.y) * 寄せ;
      c.速 = 速;
      const 速さ = Math.hypot(速.x, 速.y) || 1;
      const 歩 = Math.min(速さ * dt, dist);
      const mvx = (速.x / 速さ) * 歩, mvy = (速.y / 速さ) * 歩;
      // 城壁と閉じた門は通れない。ぶつかったら壁沿いに滑る。
      const 足元 = c.地;
      const 元x = c.x, 元y = c.y;
      const 踏める = (nx, ny) => passableFor(c, b, nx, ny) && 淵を踏めるか(c, b, nx, ny, 足元);
      if (踏める(c.x + mvx, c.y + mvy)) { c.x += mvx; c.y += mvy; }
      else if (踏める(c.x + mvx, c.y)) c.x += mvx;
      else if (踏める(c.x, c.y + mvy)) c.y += mvy;
      /* 「進めた」は、実際に足が出たかで判ずる。横へ滑るだけで零歩でも進んだことに
         していたので、水際に立ち尽くしたまま足止めを数えられなかった。 */
      const 進めた = Math.hypot(c.x - 元x, c.y - 元y) > 歩 * 0.25;
      /* 水際で足が止まったなら、渡ると決める（GDD 8.1）。

         淵を厭うのはよいが、行き先が川の向こうにあって渡り場への道も引けなければ、
         隊は岸に立ち尽くすほかなくなる。それでは戦にならない。二秒のあいだ一歩も
         進めず、その足止めが水のせいであるなら、そこで腹を決めて押し渡る。
         決めて渡るのだから、足も隊列も落ちるのは承知の上である。 */
      /* 渡ると腹を決めるのは、下知を受けた隊である。

         采配に委ねた隊には、渡り場を探す目がある（ai.js の 寄せ道・橋待ち・
         奇襲の渡河）。だから水際で待てばよい――混んだ橋を厭って淵へ乗り入れるのは
         愚である、というのが常道であった。
         一方、大名が手ずから「あの城へ行け」と命じた隊は、道案内を持たない。
         命じられた先が川の向こうなら、いつまでも岸に立たせておくわけにいかない。 */
      if (!MAP && !進めた && !c.押し渡る && !c.auto && terrainAt(元x + mvx, 元y + mvy) === "deep") {
        c.水際 = (c.水際 || 0) + dt;
        /* 待つ長さは知略で変わる。ものを知らぬ将ほど早く焦れて水へ入る、のではない。
           逆である――渡り場を探して回るだけの才があるかどうかで、腹を決めるまでの
           長さが変わる。知略の高い将は先に別の道を探し、それでも駄目なら渡る。 */
        const 待つ = 24 + Math.max(0, 80 - (c.gen.wit || 55)) * 0.7;
        if (c.水際 > 待つ) {
          c.押し渡る = b.t + 120; c.水際 = 0;
          b.log.push({ t: b.t, text: `${c.gen.name}隊は渡り場を待たず、淵を押し渡る。` });
        }
      } else if (進めた) c.水際 = 0;
      /* 壁に突き当たったら、押し返さずに壁沿いへ滑らせる（GDD 8.3 / 9.3）。

         もとは壁から遠ざかる向きへ押し返していた。城内は壁だらけであるから、
         行き先へ引く力と押し返す力が一歩ごとに殴り合い、隊はその場で前後に震えた。
         実測した震えは、押し返し四.五歩と下知五.七歩がぴたりと交互に出る形で、
         一折り返しあたり十八歩――遊ぶ側の目には「隊が小刻みに震える」と映る。

         壁は押し返すものではない。突き当たったなら、壁に沿って行き先へ近いほうへ
         滑る。壁の中へ埋まってしまったときだけ、外へ押し出す（これは救いである）。 */
      if (MAP && !進めた) {
        if (!passable(c.x, c.y)) {
          // 壁の中に埋まっている。城の中心から遠ざかる向きへ押し出す
          const ox = c.x - MAP.cx, oy = c.y - MAP.cy, od = Math.hypot(ox, oy) || 1;
          for (let k = 1; k <= 12; k++) {
            const nx3 = c.x + (ox / od) * k * 14, ny3 = c.y + (oy / od) * k * 14;
            if (passable(nx3, ny3)) { c.x = nx3; c.y = ny3; break; }
          }
        }
        /* 壁に突き当たっただけなら、押しも滑りもしない。待つ。

           押し返せば下知と殴り合って震え、滑らせれば行き先の僅かな揺れで左右へ
           振れる（測ると、押し返しで一折り返し十八歩、滑らせて二十三歩）。
           突き当たったなら、そこで足を止めるのが理に適う。行き先へ届かぬままなら
           「詰まった」と数えられ、道順が引き直される（上の c.stuck）。 */
      }
      if (c.chargeT > 0 && b.fx.length < 160 && Math.random() < dt * 6 && (c.side === "P" || c.seen)) {
        b.fx.push({ k: "dust", x: c.x - Math.cos(c.facing) * 14, y: c.y - Math.sin(c.facing) * 14, t: 0, life: 0.7 });
      }
      /* 水飛沫。川の中を進む組の足元から上がる（GDD 8.1）。

         川は足を三割に落とし、陣形を十四も削る。その重さが盤の上から読めなかった。
         泥濘を漕いでいるのだと目で分かれば、渡り場を選ぶ手が生きてくる。 */
      if (b.fx.length < 200 && (c.side === "P" || c.seen)) {
        for (const q of c.squads) {
          if (q.men <= 0) continue;
          const t2 = q.地;
          if (t2 !== "ford" && t2 !== "deep" && t2 !== "moat") continue;
          if (Math.random() > dt * (t2 === "deep" ? 2.4 : 1.8)) continue;
          b.fx.push({ k: "splash", x: q.x + (Math.random() - 0.5) * 12, y: q.y + (Math.random() - 0.5) * 8,
            t: 0, life: 0.5 + Math.random() * 0.25, big: t2 === "deep" });
        }
      }
      // 疲労：移動・登坂・渡渉・悪天候で増える（GDD 8.8）
      c.fatigue = Math.min(100, c.fatigue + (0.55 + (1 / Math.max(0.1, terr.speed) - 1) * 0.5) * W.fatigue * (c.chargeT > 0 ? 1.8 : 1) * dt);
      const want = Math.atan2(dy, dx);
      const diff = ((want - c.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      c.facing += clamp(diff, -1.4 * dt, 1.4 * dt);
      c.faceTo = null;
    } else if (c.faceTo != null) {
      /* その場で向きだけ変える。統率が高いほど早く据わる。

         回頭のあいだは、陣の向きも隊の向きに合わせて回す。こうしないと駒だけが
         回り、陣形は元の向きに伸びたまま――「押した方角へ陣形が向く」ことに
         ならない（corps.js の placeSquads を参照）。 */
      const diff = ((c.faceTo - c.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const rate = 0.45 + c.gen.lead / 130;
      if (Math.abs(diff) < 0.05) {
        c.facing = c.faceTo; c.faceTo = null;
        c.陣向き = c.facing;
        if (c.order === "転回") { c.order = "待機"; c.tx = c.x; c.ty = c.y; }
      } else {
        c.facing += clamp(diff, -rate * dt, rate * dt);
        c.陣向き = c.facing;
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
      /* 隊からはぐれた組は、まず隊の来た道を辿って追いつく。追いついたら定位置へ戻る。

         ただし槍を合わせている組は「はぐれ」ではない。足を止めて斬り結んで
         いるあいだに隊が前へ出れば、隔たりは百十歩を超える。そこで来た道を
         辿らせると、組は敵に背を向け、隊の通ってきた道筋を大きく迂回して
         戻る――盤の上では、戦列が左右へ流れて崩れたように見える。
         関ヶ原で測ると、組の一割八分がこの状態であった。

         噛み合っている組と、離れたばかりの組は、はぐれとしない。 */
      const homeD = Math.hypot(q.x - targetX, q.y - targetY);
      const 噛み最近 = q.engaged || (b.t - (q.噛み刻 == null ? -99 : q.噛み刻) < 3);
      if (homeD > 110 && !噛み最近) q.lost = true;
      else if (homeD < 40 || 噛み最近) q.lost = false;
      // それでも大きく離れたままなら、武将のそばへ引き戻す。
      // 壁や堀を挟んで取り残された一組が、隊全体の足を止めてしまうのを防ぐ。
      if (homeD > 190) {
        let put = null;
        for (let k = 0; k < 18 && !put; k++) {
          const ang = k * 2.399, rr = k === 0 ? 0 : 12 + k * 8;
          const nx2 = targetX + Math.cos(ang) * rr, ny2 = targetY + Math.sin(ang) * rr;
          if (passable(nx2, ny2) && 淵を踏めるか(c, b, nx2, ny2, null)) put = { x: nx2, y: ny2 };
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
      const terr = TERRAIN[q.地];
      /* 退いている隊の組は、噛み合っていても動く。
         そうでないと、組は動かず、隊の代表点は組の重心へ引き戻され、
         撤退を命じても一歩も退けない（corps.js の退かせる を参照）。 */
      /* 噛み合った組は、離れるまで持ち場へ戻らない（GDD 8.3）。

         噛み合いは一瞬ごとに立ったり消えたりする（間合いの外へ出れば消える）。
         消えた隙に持ち場へ引き戻され、次の瞬間また前へ出る――前後に往復して
         「震えている」ように見えたのはこれである。噛み合ってから一.二秒は、
         その場で斬り結んでいるものとして扱う。

         止まる幅も広げる。二歩の隔たりで足を出しては、いつまでも足踏みになる。 */
      const 噛み中 = q.engaged || (b.t - (q.噛み刻 == null ? -99 : q.噛み刻) < 1.2);
      /* 足踏みしない幅。城内は隊も組も密なので広く取る（門前の震えはここが効く）。
         野では組がぴたりと寄るほうがよく、狭く取る。 */
      const 止まる幅 = MAP ? 5 : 2;
      /* 噛み合っている組も、持ち場から大きく離れたら戻る（GDD 8.3）。

         もとは「噛み合ったら持ち場へ戻らない」と決めていた。噛み合いは一瞬ごとに
         立ったり消えたりするので、消えた隙に引き戻されて前後に震えたからである。

         ところが、そのあいだ隊は前へ出る。斬り結んでいる組は置いていかれ、
         戦列は伸びて陣形の体を成さなくなる。関ヶ原で測ると、噛み合っている組の
         五分五厘が持ち場から六十歩以上離れていた。

         震えるのは「わずかな隔たりで足を出す」からであって、戻ること自体では
         ない。噛み合っている組には広い遊び（二十四歩）を与え、それを超えたら
         半分の足で寄り直す。二十四歩は組の幅ほどで、斬り結ぶ間合いを損なわない。 */
      const 噛み遊び = 24;
      const 噛みでも戻る = 噛み中 && qd > 噛み遊び;
      if (qd > 止まる幅 && (!噛み中 || 噛みでも戻る || c.withdraw || c.routed)) {
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
        // 斬り結びながら寄り直すのだから、足は半ばである
        const v = st0.speed * 追いつき * (噛みでも戻る ? 0.45 : 1) * fieldScale() * (b.足の手加減 || 1) * 水馴れの足(c, q.地, terr.speed) * (q.type === "kiba" ? terr.horse : 1) * WEATHER[b.weather].speed * (0.7 + q.cohesion / 300);
        const sx = ((targetX - q.x) / qd) * Math.min(v * dt, qd);
        const sy = ((targetY - q.y) / qd) * Math.min(v * dt, qd);
        const 踏めるq = (nx, ny) => passableFor(c, b, nx, ny) && 淵を踏めるか(c, b, nx, ny, q.地);
        if (踏めるq(q.x + sx, q.y + sy)) { q.x += sx; q.y += sy; }
        else if (踏めるq(q.x + sx, q.y)) q.x += sx;
        else if (踏めるq(q.x, q.y + sy)) q.y += sy;
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
      /* 後続は橋の手前で待つ（GDD 9.3）。

         門に取り付けるのは一隊だけである。ところが「全軍門を破る」と下知すれば、
         後続の隊も堀も橋もお構いなしに門へ寄せ、前の隊と重なって押し合った。
         弾かれては寄せ直すので、盤の上では隊が瞬いて動き、小刻みに震えて見える。
         采配（委任した隊）には門の順番待ちを入れてあったが、遊ぶ側の下知には
         効いていなかった。門は一つ、列は engine が持つ――ここで一本にする。

         列に着くのは、この門を目指していて（c.gate === g）、まだ槍を合わせて
         いない隊である。門に近い者から順に、堀の外へ並ぶ。取り付いた隊が退けば
         次の隊がそのまま前へ出る。 */
      const 待ち = atkC.filter((c) => c.id !== holder.id && c.gate === g && !c.detach
        && !c.squads.some((q) => q.engaged));
      待ち.sort((x, y2) => Math.hypot((x.mx == null ? x.x : x.mx) - gp.x, (x.my == null ? x.y : x.my) - gp.y)
        - Math.hypot((y2.mx == null ? y2.x : y2.mx) - gp.x, (y2.my == null ? y2.y : y2.my) - gp.y));
      待ち.forEach((c, i) => {
        const 控 = 門の控え口(MAP, l, g, i);
        const 門まで = Math.hypot((c.mx == null ? c.x : c.mx) - gp.x, (c.my == null ? c.y : c.my) - gp.y);
        const 控まで = Math.hypot(c.x - 控.x, c.y - 控.y);
        /* 遠くを進んでいる隊は、道順に任せる。列に着くのは門の間近まで来た隊だけ。
           ここで横から手を出すと、壁を突っ切る向きへ引かれて道に迷う。 */
        if (門まで > R * 3.2 && 控まで > R * 3.2) { c.gate待ち = 0; return; }
        c.gate待ち = i + 1;                       // 何番目に控えているか（帳に出す）
        c.pinned = false;
        if (控まで > 46) {
          if (門まで < R * 1.6 || !c.wp || !c.wp.length) {
            // 門前に重なっているか、道順を持たぬ隊は、控え口へ引く
            c.wp = null; c.tx = 控.x; c.ty = 控.y;
          }
        } else {
          c.wp = null; c.tx = c.x; c.ty = c.y;    // 着いたらその場で待つ
        }
      });
      holder.gate待ち = 0;
      holder.gateFat = Math.min(100, (holder.gateFat || 0) + 5.0 * dt);
      // 破れる手応えが士気を支える。ただし〇.四では、門を押すだけで士気が
      // 満ちきってしまい、寄せ手が終始百のまま崩れなくなる。
      holder.morale = Math.min(100, holder.morale + 0.16 * dt);
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
      /* 門を叩く。火花だけでは「木の扉を破ろうとしている」ことが伝わらない。
         打ち込みの閃きと、飛び散る木屑を出す。 */
      if (b.fx.length < 200 && Math.random() < dt * 3) {
        b.fx.push({ k: "gate", x: gp.x, y: gp.y, t: 0, life: 0.42, a: Math.random() * 7 });
        for (let i = 0; i < 3; i++) {
          const a2 = Math.random() * Math.PI * 2, v = 26 + Math.random() * 46;
          b.fx.push({ k: "chip", x: gp.x, y: gp.y, vx: Math.cos(a2) * v, vy: Math.sin(a2) * v - 18,
            t: 0, life: 0.5 + Math.random() * 0.3 });
        }
      }
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
        /* 門が破れたら、道の格子を組み直す（GDD 9.3）。
           格子は戦の初めに一度だけ作っていたので、門が開いてもそこは壁のままで、
           寄せ手は破った門を通り抜けられず、壁際で押し合っていた。 */
        MAP.nav = null;
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
      /* 列に控えている隊は、組み直さない（GDD 9.3）。
         控え口は門から百三十歩より遠いので、この段が五秒ごとに門へ引き戻し、
         列の留めと引っ張り合っていた。待っているのだから、道は要らない。 */
      if (c.gate待ち) continue;
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
            f.cool = 2.6;
            const kit = SIEGE_KIT[tgt.kit] || SIEGE_KIT["なし"];
            let hit = 11 * kit.guard;
            const qs = tgt.squads.filter((q) => q.men > 0)
              .sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y));
            for (const q of qs) {
              if (hit <= 0) break;
              const take = Math.min(q.men, hit);
              q.men -= take; hit -= take;
              b.射損 = (b.射損 || 0) + take;          // 城から射かけて削った兵（試験と記録のため）
              /* 隊の損害帳にも付ける。ここを落としていたため、城から射かけて
                 削った兵が「損害」に一人も出ず、戦のあとで兵だけが減っていた。
                 遊ぶ側からは、勝ったのに兵が消えたようにしか見えない。 */
              tgt.loss[q.origin] = (tgt.loss[q.origin] || 0) + take;
              q.cohesion = Math.max(0, q.cohesion - 3);
            }
            tgt.morale -= 0.45;
            b.射気 = (b.射気 || 0) + 0.45;
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
    /* 狭間からの射撃（GDD 9.3）。

       塀には狭間が切ってある。城方は壁の内に立ったまま、寄せて来る敵へ矢と
       鉄砲を放つ。これまでは矢倉だけが射ており、塀の兵は寄せ手が門に取り付く
       まで何もしなかった。野を渡って来る敵を黙って見ている城方はいない。

       坂を登る寄せ手が削られるのはここである。遠くから寄せるほど長く撃たれる。
       竹束を担いだ隊は被害が四割に収まるので、道具を選ぶ意味が出る。

       曲輪の中まで攻め込まれた相手には撃たない。そこは槍と刀の間合いであり、
       常の戦いの決まりが働く。二重に削ってはならない。 */
    for (const c of defC) {
      c.狭間 = (c.狭間 || 0) - dt;
      if (c.狭間 > 0) continue;
      const 射手 = c.squads.reduce((a2, q) => (q.men > 0 && ARM_STATS[q.type].range > 0 ? a2 + q.men : a2), 0);
      if (射手 < 20) { c.狭間 = 2.6; continue; }
      const 層 = MAP.layers[c.holdGate ? c.holdGate.layer : MAP.layers.length - 1];
      const R = 235 * fsN;
      /* 射かけられるのは、己の受け持つ塀の外にいる敵だけである。
         曲輪をぐるりと回った向こう側、角の陰にいる敵には矢は届かない。
         すべての門に守備隊を置くようにしてから、裏の門の兵まで表の寄せ手を
         射ていた。城の四方の兵が一点へ撃ち込む勘定になり、寄せ手が異様に削れた。 */
      const 面 = Math.atan2(c.y - MAP.cy, c.x - MAP.cx);
      const 角の内 = (ax, ay) => {
        const 向 = Math.atan2(ay - MAP.cy, ax - MAP.cx);
        const d = Math.abs(((向 - 面 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        return d <= Math.PI * 0.42;                  // 七十六度まで。それより向こうは角の陰
      };
      const 的 = atkC
        .filter((x) => {
          const ax = x.mx == null ? x.x : x.mx, ay = x.my == null ? x.y : x.my;
          if (Math.hypot(ax - c.x, ay - c.y) > R) return false;
          if (attached.has(x.id)) return false;      // 門に取り付いた隊は門の押し合いで削れる
          if (!角の内(ax, ay)) return false;
          return !inLayer(MAP, 層, ax, ay);          // 曲輪の中の敵は常の戦いに任せる
        })
        .sort((x, y2) => Math.hypot((x.mx == null ? x.x : x.mx) - c.x, (x.my == null ? x.y : x.my) - c.y)
          - Math.hypot((y2.mx == null ? y2.x : y2.mx) - c.x, (y2.my == null ? y2.y : y2.my) - c.y))[0];
      if (!的) { c.狭間 = 1.4; continue; }
      c.狭間 = 3.0;
      const kit = SIEGE_KIT[的.kit] || SIEGE_KIT["なし"];
      let hit = 射手 * 0.0095 * kit.guard;
      const qs = 的.squads.filter((q) => q.men > 0)
        .sort((x, y2) => Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y2.x - c.x, y2.y - c.y));
      for (const q of qs) {
        if (hit <= 0) break;
        const take = Math.min(q.men, hit);
        q.men -= take; hit -= take;
        b.射損 = (b.射損 || 0) + take;
        的.loss[q.origin] = (的.loss[q.origin] || 0) + take;   // 狭間の射も損害帳に付ける
        q.cohesion = Math.max(0, q.cohesion - 2);
      }
      的.morale -= 0.3;
      b.射気 = (b.射気 || 0) + 0.3;
      if (b.fx.length < 170 && qs[0]) {
        b.fx.push({ k: "shot", x: c.x, y: c.y, x2: qs[0].x, y2: qs[0].y, t: 0, life: 0.28 });
      }
    }

    // 城の傾き。門と曲輪を失うほど城方は士気を保てない（GDD 9.3）
    // どの曲輪まで抜かれたかで測る。同じ曲輪の門をいくつ破っても、深さは変わらない。
    let deepest = -1;
    for (const l of MAP.layers) if (l.gates.some((g) => g.broken)) deepest = Math.max(deepest, l.i);
    const bw = deepest + 1, tw = MAP.layers.length;
    const hon = MAP.layers[MAP.layers.length - 1];
    const inL = (i) => atkC.some((c) => inLayer(MAP, MAP.layers[i], c.mx == null ? c.x : c.mx, c.my == null ? c.y : c.my));
    const deep = inL(MAP.layers.length - 1) ? 0.44 : MAP.layers.length > 2 && inL(MAP.layers.length - 2) ? 0.22 : 0.06;
    const fLost = MAP.fac.length ? MAP.fac.filter((f) => f.hp <= 0).length / MAP.fac.length : 0;
    b.press = clamp((bw / tw) * 0.52 + fLost * 0.14 + deep, 0, 1);
    /* 城の傾きで城方の士気を抑える。

       もとは上限を一気に八十二も下げ、しかもその場で切り落としていた。
       門がひとつ破れた瞬間に、城中の隊の士気が二十も三十も消える。
       城攻めでの士気の落ち方が異常に見えたのは、主にこれである。

       下げ幅を五十五に緩め、切り落とすのをやめて、じわりと近づける
       （一秒に一.六まで）。落城の気配が士気を蝕むことに変わりはないが、
       階段ではなく坂になる。 */
    const cap = 100 - 55 * b.press;
    for (const c of defC) {
      if (c.morale > cap) c.morale = Math.max(cap, c.morale - 1.6 * dt);
      if (inL(MAP.layers.length - 1)) c.morale = Math.max(0, c.morale - 1.4 * dt);
    }
  }

  /* side ごとに格子へ振り分け、近傍だけを調べる。

     升目の鍵は数にする。文字を繋いだ鍵（"12,7"）は、組ひとつにつき四十九回
     作っては捨てることになる。関ヶ原の盤は組が三千五百あるので、刻ごとに
     十七万の文字が生まれていた（測ったら、この探索だけで一こまの三割八分）。 */
  const CS = 90;
  const KEY = (gx, gy) => gx * 8192 + gy;
  const grids = { P: new Map(), E: new Map() };
  const 組の帳 = new Map();                         // 組の id → [隊, 組]。相手を覚えておくために要る
  for (const c of alive) {
    if (c.ambush && !c.revealed) continue;
    const gmap = grids[c.side];
    for (const q of c.squads) {
      if (q.men <= 0) continue;
      const k = KEY((q.x / CS) | 0, (q.y / CS) | 0);
      let arr = gmap.get(k);
      if (!arr) { arr = []; gmap.set(k, arr); }
      arr.push([c, q]);
      組の帳.set(q.id, [c, q]);
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
        const arr = gmap.get(KEY(cx + dx, cy + dy));
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
    /* 組み合った相手は、そう易々と取り替えない（GDD 8.3）。

       毎瞬いちばん近い敵を選び直していた。門前のように敵味方が密集する場では、
       ほぼ同じ隔たりの敵が幾つも並ぶので、選ぶ相手が瞬きのたびに入れ替わる。
       相手が替われば目指す先も替わるので、組はその場で小刻みに震えた。
       実測では、城攻めで動いた標本の三六％が前と逆へ折り返していた。

       いま組み合っている相手が生きていて、間合いのうちにいるなら、そのまま
       組み合い続ける。乗り換えるのは、よほど近い敵が現れたときだけである。 */
    const 前 = q.foeId && 組の帳.get(q.foeId);
    if (前) {
      const [pf, pe] = 前;
      const pd = Math.hypot(pe.x - q.x, pe.y - q.y);
      const 見える = pe.men > 0 && !(MAP && wallBetween(q.x, q.y, pe.x, pe.y));
      const 間合 = Math.max(46, (ARM_STATS[q.type].range || 0) * 1.2);
      if (見える && pd < 間合 && (!best || bd > pd * 0.8)) {
        return [{ f: pf, e: pe, d: pd }, pd];
      }
    }
    if (best) q.foeId = best.e.id;
    return best ? [best, bd] : [null, 1e9];
  };
  /* 敵が遠い隊は、組ごとの探索そのものを省く（GDD 8.3）。

     組は最も遠くて二百七十歩先の敵としか関わらない（弓の届きが百九十歩）。
     隊と隊の中どころが、互いの広がりを足しても届かぬほど離れているなら、
     その隊の組は一つとして敵に触れない。関ヶ原のように広い盤では、
     大半の隊が大半の刻をそうして過ごしている。 */
  for (const c of alive) {
    let 広 = 0;
    for (const q of c.squads) {
      if (q.men <= 0) continue;
      const d = Math.hypot(q.x - c.x, q.y - c.y);
      if (d > 広) 広 = d;
    }
    c.広がり = 広;
  }
  for (const c of alive) {
    c.敵が近い = false;
    for (const o of alive) {
      if (o.side === c.side) continue;
      if (Math.hypot(o.x - c.x, o.y - c.y) < c.広がり + o.広がり + 320) { c.敵が近い = true; break; }
    }
  }
  for (const c of alive) {
    if (!c.敵が近い) {
      for (const q of c.squads) { q.foe = null; q.link = null; }
      continue;
    }
    for (const q of c.squads) {
      if (q.men <= 0) continue;
      const st = ARM_STATS[q.type];
      const [melee, mdist] = nearestFoeSquad(c, q);
      q.foe = melee ? { x: melee.e.x, y: melee.e.y, d: mdist } : null;
      q.link = null;
      if (!melee) continue;
      const terr = TERRAIN[q.地];
      if (mdist < 22) {
        /* 退いている隊は組み合わない。背を向けて離れていく。
           相手を掴み直すこともしないし、相手からも掴まれない。
           ただし離れきるまでは追い討ちの刃を受ける（下の applyDamage は通る）。 */
        const 引く = c.withdraw || c.routed;
        const 相手も引く = melee.f.withdraw || melee.f.routed;
        if (!引く) {
          q.engaged = true;
          if (!相手も引く) melee.e.engaged = true;
          q.link = { x: melee.e.x, y: melee.e.y };      // 組み合っている相手
          q.噛み刻 = b.t;                                // 噛み合った刻。持ち場へ戻すのを控える
          /* 噛み合いは間合いを保つ（GDD 8.3）。

             もとは毎瞬たがいへ詰め寄っていた。双方が同じことをするので二つの組は
             重なるまで寄り、重なれば近傍の敵が入れ替わり、また別の方へ詰め寄る。
             これが門前の「小刻みな震え」の正体である。

             槍を合わせる間合いというものがある。離れていれば詰め、詰まりすぎれば
             それ以上は寄らない。間合いに収まっていれば、その場で斬り結ぶ。 */
          const 間合 = 15;
          if (mdist > 間合 + 2) {
            const pull = 1.6 * dt;
            const ax = ((melee.e.x - q.x) / Math.max(1, mdist)) * pull;
            const ay = ((melee.e.y - q.y) / Math.max(1, mdist)) * pull;
            // 詰め寄るときも淵は踏まない。水の中で槍を合わせに行く道理はない
            const 寄れる = (nx, ny) => passable(nx, ny) && 淵を踏めるか(c, b, nx, ny, q.地);
            if (寄れる(q.x + ax, q.y + ay)) { q.x += ax; q.y += ay; }
            else if (寄れる(q.x + ax, q.y)) q.x += ax;
            else if (寄れる(q.x, q.y + ay)) q.y += ay;
          }
        }
        // 接戦の火花。見づらくならないよう間引いて出す。
        if (b.fx.length < 200 && (c.side === "P" || c.seen)) {
          const mx2 = (q.x + melee.e.x) / 2, my2 = (q.y + melee.e.y) / 2;
          if (Math.random() < dt * 2.4) {
            b.fx.push({ k: "clash", x: mx2, y: my2, t: 0, life: 0.34, big: c.chargeT > 0 });
          }
          /* 土煙。火花だけでは、遠目にどこで槍を合わせているのか読めない。
             踏み荒らされた地から土が立つ。長く残し、薄く広げる。 */
          if (Math.random() < dt * 1.5) {
            b.fx.push({ k: "dust", x: mx2 + (Math.random() - 0.5) * 16, y: my2 + (Math.random() - 0.5) * 16,
              t: 0, life: 1.1 + Math.random() * 0.6, r0: 5 + Math.random() * 4 });
          }
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
          flank, c.gen.valor * (c.chargeT > 0 ? 1.2 : 1), c, q);
      } else if (st.range > 0 && mdist < st.range && q.cool <= 0) {
        if (melee.f.seen || mdist < TERRAIN[melee.e.地 || terrainAt(melee.e.x, melee.e.y)].sight * fieldScale()) {
          q.cool = st.rof;
          q.aim = { x: melee.e.x, y: melee.e.y, t: b.t };   // 狙っている相手
          if (b.fx.length < 160 && (c.side === "P" || c.seen)) {
            b.fx.push({ k: q.type === "teppo" ? "shot" : "arrow", x: q.x, y: q.y,
              x2: melee.e.x, y2: melee.e.y, t: 0, life: q.type === "teppo" ? 0.3 : 0.45 });
          }
          const wet = q.type === "teppo" ? WEATHER[b.weather].teppo : 1;
          applyDamage(b, melee.f, melee.e, st.vol * wet * (q.men / 50) * (0.5 + q.cohesion / 150) * terr.fight, 1, c.gen.valor, c, q);
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
    // 槍を合わせている刻。分遣（騎馬の回り込み）を出す頃合いを測るのに使う。
    c.噛み刻 = fighting ? (c.噛み刻 || 0) + dt : 0;
    c.fatigue = clamp(c.fatigue + (fighting ? 1.1 : c.order === "待機" ? -1.4 : 0) * dt, 0, 100);
    if (c.pinch >= 2) c.morale -= (c.pinch - 1) * 0.22 * dt;   // 挟まれると士気がじわりと落ちる
    // 押し引きの覚え。刻とともに褪せる（半減およそ七秒）
    const 褪 = Math.pow(0.905, dt);
    c.功 = (c.功 || 0) * 褪; c.損 = (c.損 || 0) * 褪;
    /* 士気の上げ下げ（GDD 8.7）。

       もとは兵の残りだけで決めていた。押していようが押されていようが、兵さえ
       残っていれば上がり、減れば下がる。戦の綾がまるで映らない。

       改めて、次の三つで動かす。
         一、槍を合わせている間は、押していれば上がり、押されていれば下がる。
             押し引きは、この十秒ばかりに討った兵と討たれた兵の差で測る。
         二、戦っていなければ、少しずつ戻る。将の器量が高いほど早く戻る
             （統率五分・武勇三分・知略二分。将が立て直すのは、この三つの技である）。
             敵が間近で睨み合っているうちは、戻りは鈍い。
         三、崩れた隊は、敵の目の届かぬ所まで退けば、より早く戻る。
             敵に追われていれば、逆に削られる。 */
    const 器量 = ((c.gen.lead || 60) * 0.5 + (c.gen.valor || 60) * 0.3 + (c.gen.wit || 60) * 0.2);
    const 立ち直り = 0.30 + clamp((器量 - 45) / 55, 0, 1.1) * 0.45;
    const 敵近 = alive.some((o) => o.side !== c.side && !o.routed
      && Math.hypot(o.x - c.x, o.y - c.y) < 240);
    /* 溜めた削れを、少しずつ効かせる（GDD 8.7）。

       一撃ごとにその場で引くと、大きな損害を受けた刻に士気が階段状に落ちる。
       一秒に一.二までとし、残りは次の刻へ持ち越す。落ちる速さに歯止めが
       掛かるので、崩れるときも崩れ方が緩やかになる。 */
    if (c.士気の溜 > 0) {
      /* 城攻めはさらに緩める。門の押し合いは、小さな城方の隊にとって
         損害の割が大きく出るので、同じ削れでも士気の落ち方が急になる。
         測ってみると、城方は毎秒一.二ずつ落ち、五十秒で八十八から十四まで
         下がっていた。門ひとつの攻防で城中の隊が総崩れになる勘定である。 */
      /* 筋書きの一戦（関ヶ原など）は、士気の落ちを緩める（GDD 8.9）。
         一回で遊びきる戦であるから、半刻で総崩れになっては筋書きが進まない。
         史実の関ヶ原も、六時間のあいだ押し合っていた。 */
      const 早さ = b.筋書き ? 0.72 : MAP ? 0.7 : 1.2;
      const 引く = Math.min(c.士気の溜, 早さ * dt);
      c.morale -= 引く; c.士気の溜 -= 引く;
      if (c.士気の溜 < 0.01) c.士気の溜 = 0;
    }
    let 動 = 0;
    if (fighting) {
      const 押し = ((c.功 || 0) - (c.損 || 0)) / Math.max(70, corpsMax(c) * 0.05);
      動 = clamp(押し, -1.1, 1.1) * 0.35;
    } else if (敵近) {
      動 = 立ち直り * 0.3;
    } else {
      動 = 立ち直り * (c.routed ? 1.6 : 1);
    }
    if (c.routed && 敵近) 動 -= 0.4;                    // 追われている崩れ隊は削られる
    // 総大将が前線に出れば全軍の士気が上がる（GDD 8.7）
    const near = alive.some((o) => o.side === c.side && o.gen.lord && Math.hypot(o.x - c.x, o.y - c.y) < 260);
    c.morale = clamp(c.morale + (動 + (ratio - 0.45) * 0.35 + (near ? 0.3 : 0)) * dt, 0, 100);
    /* 密集防御から戻る（GDD 8.3）。

       三方から取り付かれた隊は方陣を組む。ところが一度組んだら二度と解けず、
       関ヶ原で測ると五十隊のうち二十隊が終始「密集防御」のままであった。
       囲みが解けたなら、陣は元へ戻さねばならない。方陣は攻めの鈍い陣なので、
       解かぬままでは押し返せず、盤は密集防御の札で埋まる。 */
    if (c.boxed) {
      if ((c.pinch || 0) <= 1) {
        c.囲み解け = (c.囲み解け || 0) + dt;
        if (c.囲み解け > 6) {
          c.boxed = false; c.囲み解け = 0;
          c.formation = c.元の陣 || "横陣"; placeSquads(c, false);
          b.log.push({ t: b.t, text: `${c.name}隊は囲みを脱し、${c.formation}に戻った。` });
        }
      } else c.囲み解け = 0;
    }
    if (!c.routed && !c.boxed && fighting) {
      if ((c.pinch || 0) >= 3) {
        c.元の陣 = c.formation;
        c.boxed = true; c.formation = "方陣"; placeSquads(c, false);
        b.log.push({ t: b.t, text: `${c.name}隊が包囲されかけ、方陣で密集防御に移った。` });
        c.feats.push("密集防御");
      }
    }
    /* 崩れ（GDD 8.7）。

       士気が十五を切れば、その隊はもう戦えない。掴み合いを解いて退く。
       兵の残りでも崩れる。もとは四分の一で崩れ、まだ戦える隊が盤から消えるので
       十五分の一まで下げたが、下げすぎた。士気の落ち方を緩めたところ、隊は
       士気では崩れなくなり、兵が一割四分になるまで戦って全滅同然になった。
       二割二分に戻す。三隊のうち二隊を失えば、その隊はもう戦列を保てない。 */
    if (!c.routed && (c.morale <= 15 || ratio < 0.22)) {
      c.routed = true; c.order = "敗走";
      c.立て直し = null; c.退き門 = null; c.崩れた刻 = b.t;
      for (const q of c.squads) { q.engaged = false; q.link = null; }   // 崩れた者は掴み合いを解いて走る
      notify(b, `${c.gen.name}隊が崩れ、退いた。`, c.side === "P" ? "bad" : "good");
      b.log.push({ t: b.t, text: `${c.name}隊が崩れ、戦線を離れた。` });
      for (const o of alive) if (o.side === c.side && Math.hypot(o.x - c.x, o.y - c.y) < 200) o.morale -= 6;
    }
    /* 隊の引き際（GDD 8.7）。

       崩れた隊は盤の上で息をつくので、勝った側に追い回されて削られ続ける。
       隊を預かる者は、そこまで待たない。三隊のうち一隊も残らぬところまで
       削られたら、あるいは士気が尽きたら、戦場を離れる。

       これが効くのは、他家の隊と、遊ぶ側が委ねた隊だけである（delegated）。
       手ずから率いる隊を盤が勝手に退かせては、采配にならない。引くも引かぬも
       遊ぶ側が決める。委ねたのなら、他家と同じ判断で退く。 */
    /* 引き際は、削られ切る前に来る（GDD 8.7）。

       もとは「兵が一割になるか、士気が尽きるか」であった。ところが隊は二割二分で
       崩れるので、この目に掛かる隊はほとんどいない。つまり委ねた隊は、退くより先に
       潰れていた。戦を預かる者は、そこまで待たない。

       大勢が決したなら――盤の上の味方が敵の半ばを大きく割ったなら――半ばまで
       削られた隊、気の萎えた隊から順に戦場を離れる。軍を残して退くのは恥ではない。 */
    const 我が兵 = alive.filter((o) => o.side === c.side).reduce((a2, o) => a2 + corpsMen(o), 0);
    const 敵の兵 = alive.filter((o) => o.side !== c.side).reduce((a2, o) => a2 + corpsMen(o), 0);
    const 大勢 = 我が兵 / Math.max(1, 我が兵 + 敵の兵);
    if (!c.withdraw && !c.潰 && !c.dead && delegated(b, c)
      && (ratio <= 0.10 || c.morale <= 0
        /* 早めの引き際は、野の戦だけの話である。城に籠る側に退く先は無い――
           城が持ち場なのだから、崩れても内の曲輪へ下がるのが筋である（下の 内の門へ退く）。
           これを分けずに入れたところ、城方が二隊、城を捨てて盤の外へ歩いて出た。 */
        || (!(MAP && c.side !== b.attacker) && 大勢 < 0.34
          && (ratio <= 0.45 || c.morale <= 28)))) {
      退かせる(b, c, true);                              // 統制のとれた退却
      b.log.push({ t: b.t, text: `${c.name}隊は支えきれず、戦場を退いた。` });
      notify(b, `${c.gen.name}隊が戦場を退いた。`, c.side === "P" ? "bad" : "good");
      continue;
    }

    /* 崩れた隊の行方。

       これまでは盤の外へ走り去って、そのまま退場した。八割の兵を抱えたまま
       戦場から消えるので、野戦も城攻めも尻すぼみに終わっていた。

       いまは、いくさ場のうち敵のいない所まで退いて息をつく。士気が三十四まで
       戻れば戦列に復する。ただし逃げ場がなく、追われて士気も兵も尽きたときは、
       盤の外へ落ちるほかない（潰走）。落ちた隊の将は捕らわれやすい。 */
    if (c.routed && !c.潰) {
      if (c.morale <= 0 || corpsMen(c) <= 0) {
        c.潰 = true;
        b.log.push({ t: b.t, text: `${c.name}隊は支えを失い、戦場を落ちていった。` });
      } else if (c.morale >= 40 && ratio >= 0.26
        && b.t - (c.崩れた刻 || 0) > 30 && !(c.立ち直り数 >= 1)) {
        /* 兵が戻らぬ隊は立ち直らない。

           崩れる目は二つある――士気が十五を切ること、兵が十五分の一を割ること。
           士気は休めば戻るが、兵は戻らない。それを見ずに戦列へ返していたので、
           返した刻にもう一度「兵が足りぬ」で崩れ、また退き、また返る。
           立ち直ってから再び崩れるまでの間を測ったら、平均〇秒であった。
           これが「敗走と復帰をすぐに繰り返す」の正体である。 */
        /* 立ち直れるのは一度きり。

           二度三度と戻れるようにしたところ、崩れては戻り、戻っては崩れる隊が
           出た。盤の上では旗が上がったり下がったりし続け、戦の綾が読めない。
           一度崩れて持ち直した隊が、もう一度崩れたなら、その日はもう戦えない。 */
        c.立ち直り数 = (c.立ち直り数 || 0) + 1;
        c.routed = false; c.潰 = false; c.立て直し = null;
        c.order = "待機"; c.tx = c.x; c.ty = c.y;
        for (const q of c.squads) q.cohesion = Math.max(q.cohesion, 40);
        notify(b, `${c.gen.name}隊が立ち直り、戦列に戻った。`, c.side === "P" ? "good" : "bad");
        b.log.push({ t: b.t, text: `${c.name}隊が立ち直った。` });
      } else {
        /* 退き場へ走る。着いて、敵が寄って来なければ、そこで息をつく。

           はじめは「敵が近くになければその場に留まる」としていたが、崩れた所は
           たいてい敵の目の前である。留まった隊は追い立てられ、士気が戻るどころか
           尽きて盤を落ちた。六十五隊が崩れて、立ち直ったのは十隊しかなかった。
           崩れたら、まず走る。走った先で息をつく。 */
        if (MAP && c.side !== b.attacker) {
          /* 城方はひとつ内の門へ下がる（GDD 9.3）。

             野なら敵の来ない所まで走ればよいが、城の中でそれをやると、
             壁を背にした隅で息をつくことになり、門はがら空きになる。
             城方が崩れたら、内の曲輪へ下がって門を背に息をつき、立ち直ったら
             そのままその門を守る。それが城の戦い方である。

             選び直すのは、受け持ちの門が破れたときだけ。敵が近いからと
             選び直していては、壁ごしの敵に押されて奥へ奥へと下がってしまう。 */
          if (!c.立て直し || !c.退き門 || c.退き門.broken) {
            const 先 = 内の門へ退く(b, c);
            if (先) {
              c.立て直し = 先.場; c.退き門 = 先.門;
              if (先.門) c.holdGate = 先.門;          // 立ち直ったらこの門を守る
              b.log.push({ t: b.t, text: `${c.name}隊は${先.名}の内へ下がって立て直す。` });
            }
          }
          if (c.立て直し) { c.tx = c.立て直し.x; c.ty = c.立て直し.y; }
        } else {
          const 迫る = (p) => alive.some((o) => o.side !== c.side && !o.routed && !o.destroyed
            && Math.hypot(o.x - p.x, o.y - p.y) < 260);
          const 着いた = c.立て直し && Math.hypot(c.立て直し.x - c.x, c.立て直し.y - c.y) < 70;
          if (!c.立て直し || 迫る(c.立て直し) || (着いた && 迫る(c))) c.立て直し = 退き場(b, c);
          c.tx = c.立て直し.x; c.ty = c.立て直し.y;
        }
      }
    }
    if (c.潰 || c.withdraw) {
      // 退く先は自陣の側。決め打ちの「南」では、自陣が北にある戦で敵陣へ歩いてしまう。
      const p2 = 退き先(b, c); c.tx = p2.x; c.ty = p2.y;
      // 戦場の外へ落ち延びた隊は退場させる。横に抜けた場合も見落とさない。
      if (c.y > FIELD.h + 60 || c.y < -60 || c.x > FIELD.w + 60 || c.x < -60) c.dead = true;
    }
    if (corpsMen(c) <= 0 && !c.destroyed) {
      c.destroyed = true; c.order = "待機";
      notify(b, `${c.gen.name}隊は壊滅した。`, c.side === "P" ? "bad" : "good");
      b.log.push({ t: b.t, text: `${c.name}隊は壊滅した。` });
    }
  }

  /* 手勢の勘定。

     崩れた隊を丸ごと除いていたので、一隊崩れただけで勝敗が決することがあった。
     崩れても盤の上にいて、立ち直れば戦列に戻るのだから、半ばに数える。
     盤を落ちた隊（潰走）と、手ずから退かせた隊だけを除く。 */
  const 勘 = (side) => b.corps.filter((c) => c.side === side && !c.dead && !c.潰 && !c.withdraw && !c.日和見)
    .reduce((s, c) => s + corpsMen(c) * (c.routed ? 0.5 : 1), 0);
  const pm = 勘("P"), em = 勘("E");
  // 本丸を押さえれば城は落ちる（GDD 9.3）
  if (MAP) {
    const h = MAP.layers[MAP.layers.length - 1];
    // 本丸に「兵が」入っているかで見る。隊の代表点だけでは壁の内と外を取り違える。
    const inHon = (c) => c.squads.some((q) => q.men > 0 && inLayer(MAP, h, q.x, q.y));
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

  /* 戦の終わり（GDD 8.8 / 9.3）。

     これまでは「兵が三割を切ったら攻めきれず退く」「二割二分を切ったら城を開く」
     としていた。日はまだ高く、士気も七割あるのに、勝手に囲みを解いてしまう。
     退くか退かぬかは、采配を預かる者の決めることであって、盤が決めることでは
     ない。それに、兵が三割減っただけで軍が消えるのでは、戦にならない。

     終わるのは、次のいずれかに限る。
       一、日が暮れる
       二、片方の兵が尽きる（盤の上に一兵も残らない）
       三、片方の士気が尽きる（残る隊がみな士気零）
       四、片方の隊がひとつ残らず盤を去る（撤退・潰走・壊滅）
         、あるいは残る隊がみな崩れたまま三十秒が過ぎる（総崩れ）
     城攻めではこれに「本丸を押さえる」が加わる（上で見た）。 */
  if (!b.総崩れ) b.総崩れ = {};
  const 尽きた = (side) => {
    const 生 = b.corps.filter((c) => c.side === side && !c.dead && !c.destroyed && !c.潰 && !c.withdraw && !c.日和見);
    if (!生.length) return "隊が尽きた";                     // 四
    const 兵 = 生.reduce((a, c) => a + corpsMen(c), 0);
    if (兵 <= 0) return "兵が尽きた";                        // 二
    const 気 = 生.reduce((a, c) => a + c.morale * corpsMen(c), 0) / Math.max(1, 兵);
    if (気 <= 0.5) return "士気が尽きた";                    // 三
    /* 残る隊がひとつ残らず崩れているとき（総崩れ）。

       崩れた隊は盤の上で息をついているので、右の三つには当たらない。
       ところが采配は崩れた隊を狙わないので、勝った側は立ち尽くし、負けた側は
       休んだまま、日が暮れるまで何も起こらない。それは戦ではない。
       三十秒それが続いたら、戦列は無いものとみなす。 */
    if (生.every((c) => c.routed)) {
      if (!b.総崩れ[side]) b.総崩れ[side] = b.t;
      if (b.t - b.総崩れ[side] > 30) return "総崩れ";
    } else b.総崩れ[side] = 0;
    return null;
  };
  /* 軍としての引き際（GDD 8.8）。

     右の四つは「もう一兵も動かせない」ところまで待つ判じである。隊ごとには
     士気十五・兵二割二分で崩れる仕掛けがあるが、崩れた隊は盤の上で息をつく
     ので、戦そのものは終わらない。勝った側が追い回し、負けた側は削られ続ける。
     測ると、負けた側は初めの兵の一割から一割三分まで減ってから終わっていた。

       四千五百 対 三千（六度）  受け手の残り 一割三分・平均百五十秒
       六千 対 三千             受け手の残り 九分

     実際の野戦はそうではない。三方ヶ原の徳川も、姉川の浅井も、負けはしたが
     軍は残って城へ退いた。全滅するまで戦うのは、退き場を失ったときだけである。

     軍を預かる者は、支えきれぬと見れば退く。兵が初めの十分の一を切るか、
     残る隊の士気が尽きたら、その軍は退く。統制のとれた退却として扱うので、
     将が討たれ捕らわれる目も下がる。退いた兵は城へ戻る（画面の側で数える）。 */
  const 引き際 = (side) => {
    const 生 = b.corps.filter((c) => c.side === side && !c.dead && !c.destroyed && !c.潰 && !c.withdraw && !c.日和見);
    if (!生.length) return null;                       // 「隊が尽きた」で既に拾う
    const 初 = (b.initial || {})[side] || 0;
    const 兵 = 生.reduce((a, c) => a + corpsMen(c), 0);
    if (初 > 0 && 兵 <= 初 * 0.20) return "兵が五分の一を切り、軍を退いた";
    const 気 = 生.reduce((a, c) => a + c.morale * corpsMen(c), 0) / Math.max(1, 兵);
    if (気 <= 15) return "士気が尽き、軍を退いた";
    return null;
  };
  /* 軍としての引き際も、委ねた側にだけ効かせる。遊ぶ側が手ずから率いて
     いるあいだは、退くか踏み止まるかを盤が決めてはならない。 */
  const 委ねた側 = (side) => side !== "P" || b.委ねた;
  const P退 = 委ねた側("P") ? 引き際("P") : null;
  const E退 = 引き際("E");
  if (P退 || E退) {
    b.phase = "over";
    b.orderly = true;                                  // 統制撤退。将の目減りが軽い
    b.result = P退 && E退 ? (pm > em ? "P" : "E") : (P退 ? "E" : "P");
    const 負 = P退 ? "P" : "E";
    const 名 = 負 === b.attacker ? "寄せ手" : MAP ? "城方" : "受け手";
    b.log.push({ t: b.t, text: `${名}は${P退 || E退}。` });
    return;
  }

  const P尽 = 尽きた("P"), E尽 = 尽きた("E");
  if (P尽 || E尽) {
    b.phase = "over";
    b.result = P尽 && E尽 ? (pm > em ? "P" : "E") : (P尽 ? "E" : "P");
    const 負 = P尽 ? "P" : "E";
    const 名 = 負 === b.attacker ? "寄せ手" : MAP ? "城方" : "受け手";
    if (MAP && b.result === b.attacker) b.opened = true;
    b.log.push({ t: b.t, text: `${名}は${P尽 || E尽}。` });
    notify(b, `${名}は${P尽 || E尽}。`, (b.result === "P") ? "good" : "bad");
  }
}
