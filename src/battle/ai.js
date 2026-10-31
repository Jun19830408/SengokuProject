import { MAP, 城の域か, axisOf, fromUV, gatePos, inLayer, navPath, nearestOpenGate, routeToCastleGate, 見通せる, 門の控え口, 本丸への道, 本丸が開いたか, 列の順, 門の輪, 出城が保つ, 出城の内か } from "./castleMap.js";
import { outOfCommand, setAiIssuing, corpsMax, corpsMen, delegated, detachAI, detachOptions, issueOrder, makeDetachment, placeSquads, reformTime, 丘が空く, 丘を押さえる, 伏せ場を探す, 伏せられる地, 伏兵の策士, 分遣の頃合い, 守勢の隊, 空き丘を探す, 内応させる, 内応の門を開く, 出城から引き取らせる, 引き取りを進める } from "./corps.js";
import { ARM_STATS, FIELD, HILLS, RIVER, RIVERS, fieldScale, hasRiver, riverShift, terrainAt, 地の高さ, 高み } from "./field.js";
import { 道のり, 野の道 } from "./route.js";
import { 采配の計略 } from "./keiryaku.js";
import { clamp } from "../core/util.js";

/* ------------------------------------- 先客のいる敵と、前をふさぐ味方（GDD 8.4）

   采配はこれまで「いちばん近い敵」へ向かわせるだけであった。その敵にすでに
   味方が槍を合わせていても、あいだに味方が立っていても、おかまいなしである。
   隊どうしは擦り抜けるので、後ろの隊は交戦中の味方をすり抜けて前の敵へ当たる。
   同じ敵に三隊も四隊も重なり、どこで誰が戦っているのか読めなくなる。

   前で味方が噛み合っているなら、後ろは
     一、空いている敵がいればそちらへ回る
     二、いなければ側面へ回り込んで加勢する（一つの敵に二隊まで）
     三、それも叶わねば、味方の後ろで控える
   縛るのは采配――委任した隊と敵方――だけである。手ずから命じるぶんには通す。

     実測（四隊対四隊・四分・一秒ごとに見て）
       噛み合う味方への重なり          66回 → 8回
       空いた敵がいるのに先客へ向かう  10回 → 0回 */

// 槍を合わせている隊とみなす間合い。組が触れ合う頃合いである
export const 噛みの間 = () => 95 * fieldScale();

/* その敵に、すでに槍を合わせている味方（自分は数えない）。

   数える輪を広げる形も試したが、どれも悪かった。
     ・遠くから「あの敵は自分が狙う」と唱えさせる（寄る間150／220／340）
       → どの敵も先客持ちに見えるので隊が行き先を探して迷う。
         すり抜けは二十回から三百十一回・五百二十六回まで増えた。
     ・間合いに入って当たろうとしている隊まで数える
       → すり抜け三十回、手余り十三回。狭めても良くならない。
   槍を合わせている隊だけを数えるのが、いちばん収まりがよい。 */
export function 先客たち(alive, c, o) {
  const 間 = 噛みの間();
  return alive.filter((x) => x !== c && x.side === c.side && !x.routed
    && x.squads.some((q) => q.engaged) && Math.hypot(x.x - o.x, x.y - o.y) < 間);
}

/* 当たる相手を選ぶ。近さだけでなく、先客の数で重みを付ける。
   一隊すでに掛かっているなら遠くても空いた敵を選び、二隊掛かっていれば
   よほどのことがなければ選ばない。 */
export function 狙う敵を選ぶ(alive, c, foes) {
  if (!foes || !foes.length) return null;
  /* 空いた敵ならこれだけ遠くても選ぶ、という遠回りの許し。

     もとは盤の広さにそのまま比例させていた（420×野の倍）。標準の野では
     四百二十歩で収まるが、関ヶ原の盤は八千百五十六歩あるので、野の倍が
     七.五五、遠回りの許しが三千百七十一歩になっていた。目の前二十一歩に
     敵がいても、そこに味方が一隊取り付いていれば、八百歩よそへ歩き出す。
     遊ぶ側から見れば「ぶつかる前に隊が後退している」としか見えない。

     広い盤でも、隊が横へ流れてよい幅は隊の正面ほどである。平方根で効かせ、
     九百歩で頭打ちにする。 */
  const 遠回りの費え = clamp(420 * Math.sqrt(fieldScale()), 420, 900);
  const 隔 = (o) => Math.hypot(o.x - c.x, o.y - c.y);
  /* 回ってよいのは、手近な敵からひと流れのうちである（GDD 8.4）。

     先客が二隊いる敵には法外な費え（一千万）を置いて、事実上除いていた。
     除くだけで、どこまで歩いて探してよいかを決めていなかったので、近くの敵が
     みな塞がっていると、隊は野を横切って空いた敵を探しに出た。実測では、
     三十二対三十二の野で、百五十九歩先に敵がいるのに三千五十六歩先の敵を
     狙う隊があった。遊ぶ側には「委任した軍があらぬ方へ向かう」と映る。
     隊が二十・三十と並ぶ大軍ほど、近くの敵が塞がるので頻に出る。

     横へ流れてよい幅は隊の正面ほど、という元の決めをそのまま距離にも効かせる。
     手近な敵から遠回りの費えのうちにいる敵だけを候補とし、そのうちで空いた
     敵を選ぶ。候補がみな塞がっていれば、手近な敵に加わる――野を横切って
     独りで遠くの敵に当たるよりは、そのほうがよほど戦になる。 */
  const 近さ = foes.reduce((m, o) => Math.min(m, 隔(o)), Infinity);
  const 候 = foes.filter((o) => 隔(o) <= 近さ + 遠回りの費え);
  const 群 = 候.length ? 候 : foes;
  /* 高みに拠る敵へ、正面から登るか否か（GDD 8.5）。

     これまで狙う敵は「隔たり」と「先客の数」だけで選んでいた。地形を見ていない
     ので、山の頂に構えた敵へも、平地の敵と同じ気安さで登って行った。測ると、
     槍を合わせている組の高さの差は平均〇.〇一――寄せ手はきちんと登り切って、
     同じ高さで殴り合っていた。登るあいだに隊列だけを崩して、である。

     七千の兵がことごとく山に登ることはない。一部が高みを押さえ、寄せ手は
     そこへ数をかけるか、押さえを残して平地で決しにかかる。どちらを選ぶかは
     将の器量である。

     登りの費えは高さの差に比例して置く。ただし
       ・兵で勝っていれば割り引く（数をかければ登る値打ちはある）
       ・知略の高い将ほど嫌う（無謀に登るのは、それが分からぬ将である）
     器量は、総大将のものを六分、その隊の将のものを四分で見る――軍の構えは
     総大将が決め、目の前の判じはその隊の将がする。 */
  const 本陣 = alive.filter((o) => o.side === c.side && !o.dead && !o.destroyed && o.gen);
  const 総 = 本陣.find((o) => o.gen.lord)
    || 本陣.slice().sort((a, z) => (z.gen.lead || 0) - (a.gen.lead || 0))[0];
  const 総知 = (総 && 総.gen && 総.gen.wit) || 55;
  const 我知 = (c.gen && c.gen.wit) || 55;
  const 慎み = clamp(((総知 * 0.6 + 我知 * 0.4) - 40) / 60, 0, 1);
  const 我が高さ = 地の高さ(c.x, c.y);
  const 登りの費え = (o) => {
    const 登り = 地の高さ(o.x, o.y) - 我が高さ;
    if (登り <= 0.05) return 0;
    const 寄 = corpsMen(c) + 先客たち(alive, c, o).reduce((a, x) => a + corpsMen(x), 0);
    const 優位 = clamp(寄 / Math.max(1, corpsMen(o)), 0.6, 2.2);
    return 登り * 遠回りの費え * 0.55 * 慎み / 優位;
  };
  /* 高みの敵には、数をかけるのが理である（GDD 8.5）。

     先客のいる敵を避ける決めは、平地では正しい――同じ敵に二隊三隊と重なれば、
     盤の上でどちらが戦っているのかも読めず、戦列も薄くなる。ところが高みが
     相手では話が逆になる。避けていては、いつまでも一隊ずつ登って一隊ずつ
     討たれる。一部が高みを押さえたなら、そこへ数をかけて局地の優位を作るのが
     寄せ手の手である。高さの差のぶんだけ、先客の重みを軽くする。 */
  const 先客の重み = (o) =>
    clamp(1 - Math.max(0, 地の高さ(o.x, o.y) - 我が高さ) * 0.45, 0.2, 1);
  const 費え = (o) => {
    const n = 先客たち(alive, c, o).length;
    /* 法外な値を置くと、候補がみな塞がったときに順が決まらない。
       三隊目を思いとどまらせるだけの重みを、有限で置く。 */
    return 隔(o) + 登りの費え(o)
      + (n === 0 ? 0 : n === 1 ? 遠回りの費え : 遠回りの費え * 4) * 先客の重み(o);
  };
  return 群.reduce((a, o) => (費え(o) < 費え(a) ? o : a), 群[0]);
}

/* 線分（我から寄せ先まで）と、味方の隔たり。前をふさいでいるかを見るのに使う。 */
function 線までの隔たり(x0, y0, x1, y1, px, py) {
  const dx = x1 - x0, dy = y1 - y0;
  const L = dx * dx + dy * dy;
  const t = L <= 0 ? 0 : clamp(((px - x0) * dx + (py - y0) * dy) / L, 0, 1);
  return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
}

/* 寄せ道の前に、噛み合っている味方が立ちふさがっていないか。
   立ちふさがっているなら、その味方を返す（後ろで控えるため）。 */
export function 前をふさぐ味方(alive, c, sx, sy) {
  // これより近く重なるなら擦り抜けである。遠回りの許しと同じ理由で、平方根で効かせる。
  const 幅 = clamp(62 * Math.sqrt(fieldScale()), 62, 180);
  const 我まで = Math.hypot(sx - c.x, sy - c.y);
  let 近 = null, 近さ = Infinity;
  for (const x of alive) {
    if (x === c || x.side !== c.side || x.routed || x.withdraw) continue;
    if (!x.squads.some((q) => q.engaged)) continue;
    const d = Math.hypot(x.x - c.x, x.y - c.y);
    if (d >= 我まで) continue;                  // 寄せ先より遠い味方は関わらない
    if (線までの隔たり(c.x, c.y, sx, sy, x.x, x.y) > 幅) continue;
    if (d < 近さ) { 近さ = d; 近 = x; }
  }
  return 近;
}

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

/* ------------------------------------------------ 川の掟（GDD 8.1）

   川で槍を合わせるのは、双方にとって愚である。足は0.1、戦う力は半分、
   隊列は二十四も削れる。それでも盤の上では、二十四戦の交戦のうち一割以上が
   水の上で起きていた。内訳を採ると、こうであった。

     寄せ手が渡り切らぬうちに当たった          三割七分
     受け手が陸で当たったあと、水へ歩き込んだ  二割二分
     回り込む騎馬が淵を突っ切った              一割七分

   もとは、川を避ける道理を采配のあちこちに置いていた。だから必ず漏れる。
   実際、追い討ち（崩れた敵を追う段）だけがこの道理を素通りしていて、
   崩れた敵を追って川へ入っていた。

   そこで、行き先を決めたら最後にここを一度だけ通すことにした。掟は四つ。

     一、受け手は川を渡らない。渡り場のこちら岸で待ち、敵が水から上がって
         くるところを叩く。半渡を撃つ、という。
     二、寄せ手は渡り場を通って渡り切る。瀬の上では止まらない。
     三、どちらであれ、行き先が水にかかるなら岸へ置き直す。岸沿いに動くときは、
         蛇行のいちばん寄っている所に合わせる。真っすぐ歩けば川を横切るからである。
     四、狙う敵が水の中にいるなら、追って水へは入らない。岸に構えて射る。
         相手が足を取られているのに、こちらから同じ地へ降りる理由がない。

   縛るのは采配だけである。プレイヤーが手ずから「川を渡れ」と命じたなら渡らせる。
   指図とは、指図した通りに動くことをもって指図である。 */

/* 隊の張り出し。中心だけを見ていると、翼が水に浸かったまま「岸にいる」と判ずる。
   千五百の横陣は岸から二十六歩では収まらない。

   ただし測るのは川に垂直な向き（南北）の厚みだけである。川は東西に流れるので、
   水に浸かるか否かを決めるのは厚みであって、幅ではない。幅で余裕を取ると、
   横陣は幅こそ広く薄いので、岸から百七十歩も後ろに下がることになる。それでは
   渡り場を射程に収められない。弓の届くのは百九十歩、鉄砲は百五十歩である。
   下がって撃てぬのでは、半渡を撃つという構えが成り立たない。 */
function 隊の張り(c) {
  let r = 0;
  for (const q of c.squads || []) {
    if (q.men <= 0) continue;
    const d = Math.abs(q.y - c.y);
    if (d > r) r = d;
  }
  return clamp(r, 24, 70);
}

/* 我が岸。すでに水に入っていて岸を見失っているなら、自陣の側を我が岸とする。
   敵の位置から決めては、敵が渡り切った途端に我が岸が入れ替わり、
   受け手のほうが川向こうへ追い出される。 */
function 我が岸(b, c) {
  const 自岸 = 岸(c.x, c.y);
  if (自岸 !== 0) return 自岸;
  const 陣 = b.陣 && b.陣[c.side];
  const 陣岸 = 陣 ? 岸(陣.x, 陣.y) : 0;
  if (陣岸 !== 0) return 陣岸;
  const 中 = (RIVER.top + RIVER.bot) / 2 + riverShift(c.x);
  return c.y < 中 ? -1 : 1;
}

// その点は川に寄りすぎているか（隊の張り出しぶんを見込む）
function 水にかかる(x, y, 余) {
  const 中 = (RIVER.top + RIVER.bot) / 2 + riverShift(x);
  const 半 = (RIVER.bot - RIVER.top) / 2;
  return Math.abs(y - 中) < 半 + 余;
}

// その岸の、水にかからぬ高さ
function 岸の高さ(x, 岸側, 余) {
  const 中 = (RIVER.top + RIVER.bot) / 2 + riverShift(x);
  const 半 = (RIVER.bot - RIVER.top) / 2;
  return 中 + 岸側 * (半 + 余);
}

/* 岸沿いに動くとき、道中いちばん川が寄っている所に高さを合わせる。
   噛み合った隊には道を引かないので（寄せ道を引く）、行き先までは真っすぐ歩く。
   岸沿いのつもりでも、川が蛇行していればそこで水を横切ることになる。 */
function 岸沿いに直す(c, sx, sy, 岸側, 余) {
  let y = sy;
  for (let k = 0; k <= 8; k++) {
    const x = c.x + (sx - c.x) * k / 8;
    const lim = 岸の高さ(x, 岸側, 余);
    y = 岸側 < 0 ? Math.min(y, lim) : Math.max(y, lim);
  }
  return y;
}

/* 行き先に川の掟をかける。{ sx, sy, 射る } を返す。 */
function 川の掟(b, c, sx, sy, tgt) {
  if (MAP || !hasRiver() || c.routed || c.withdraw) return { sx, sy, 射る: false };
  const 余 = 隊の張り(c) + 24;
  const 我岸 = 我が岸(b, c);
  const 的岸 = tgt ? 岸(tgt.x, tgt.y) : 岸(sx, sy);
  if (c.side !== b.attacker) {
    // 四、狙う敵が水の中にいるなら、岸に構えて射る
    if (tgt && 的岸 === 0) {
      return { sx: tgt.x, sy: 岸沿いに直す(c, tgt.x, 岸の高さ(tgt.x, 我岸, 余), 我岸, 余), 射る: true };
    }
    // 一、敵が向こう岸なら、渡り場のこちら岸で待ち構える
    if (的岸 !== 0 && 的岸 !== 我岸) {
      const 場 = 渡り場(c.x);
      return { sx: 場.x, sy: 岸沿いに直す(c, 場.x, 岸の高さ(場.x, 我岸, 余 + 120), 我岸, 余), 射る: false };
    }
    // 三、同じ岸。行き先が水にかかるなら岸へ引き上げ、道中の蛇行にも合わせる
    return { sx, sy: 岸沿いに直す(c, sx, 水にかかる(sx, sy, 余) ? 岸の高さ(sx, 我岸, 余) : sy, 我岸, 余), 射る: false };
  }
  // 二、寄せ手は渡り切る。瀬の上では止まらない。
  if (水にかかる(sx, sy, 余)) {
    const 岸側 = 的岸 !== 0 ? 的岸 : 我岸;
    return { sx, sy: 岸の高さ(sx, 岸側, 余), 射る: false };
  }
  return { sx, sy, 射る: false };
}

// 岸から射る（遠隔の組がなければ、その場で構える）
function 岸から射る(c, tgt, sx, sy) {
  const 射手 = c.squads.some((q) => q.men > 0 && ARM_STATS[q.type].range > 0);
  return 射手 ? { order: "射撃", tx: sx, ty: sy, target: tgt.id }
    : { order: "守備", tx: sx, ty: sy };
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
  /* 回り道が法外なら、道さがしを捨てて真っすぐ行く。渡り場が遥かに遠い野もある。

     ただし、真っすぐ行くと淵を渡ることになるなら話は別である。淵は決めてからでなければ
     踏み込まない掟にしたので、道を捨てれば隊は水際で立ち尽くす。実測では、委ねた隊が
     行き先を目の前にして動かぬまま――「手が余って立ち尽くす」が五回から百十四回に
     増えていた。水を挟むなら、どれほど遠回りでも渡り場を回る。 */
  /* 回り道の許しは、何を避けているかで変える。

     水を挟むなら、どれほど遠回りでも渡り場を回る（真っすぐ行けば水際で
     立ち尽くす）。ところが丘や森は、避けねばならぬものではなく、ただ歩き
     にくいだけである。そこに四.五倍の回り道を許していたので、盤に大きな丘を
     足したとたん、隊は丘を大きく巻いて歩き出した。行き先は一手ごとに敵から
     遠のき（測ると、敵から遠ざかる「移動」の下知が九百六十一件。目の前
     二十一歩の敵を捨てて八百三十歩よそへ向かう隊もあった）、遊ぶ側からは
     「ぶつかる前に押されて後退している」としか見えない。

     水でなければ、回り道は直の一.六倍までとする。それを超えるなら、
     鈍かろうと真っすぐ行くほうが理に適う。 */
  const 水を挟む = 淵を跨ぐ(c.x, c.y, sx, sy);
  if (!水を挟む && 道のり(道, c.x, c.y) > 直 * 1.6 + 300) return null;
  c.道の的 = { x: sx, y: sy }; c.道刻 = b.t;
  return 道;
}

// 二点を結ぶ線が淵を跨ぐか。近間でも、水を挟むなら道を引く。
function 淵を跨ぐ(x0, y0, x1, y1) {
  if (!hasRiver() && !RIVERS.length) return false;     // 筋書きの野は折れ線の川を持つ
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

/* 奇襲の渡河（GDD 8.1 / 8.6）。

   淵は決めてからでなければ踏み込まない――そう定めた（engine の 淵を踏めるか）。
   では、川を渡って背後を衝くという戦はもう起こらないのか。そうではない。
   渡り場が敵に固められているなら、わざと瀬でないところを押し渡るのが一手である。
   真田も島津も、渡れぬはずの所を渡って勝った。

   これは「道が引けなかったから水に入る」のとは別物である。決めて渡る。
   決めるのは、知略に長けた将が、次の三つを見たときだけとする。

     一、行き先が川の向こうにあること
     二、渡り場が遠いか、渡り場の袂に敵が待ち構えていること
     三、己の隊が噛み合っておらず、崩れてもいないこと

   渡れば足も隊列も落ちる。それを承知で回り込むのだから、戦果は敵の不意である。 */
function 奇襲の渡河を計る(b, c, sx, sy) {
  if (MAP || !hasRiver() || c.押し渡る) return false;
  if (c.routed || c.withdraw || c.squads.some((q) => q.engaged)) return false;
  if ((c.gen.wit || 55) < 72) return false;                  // 知略の要る手である
  if (c.morale < 55) return false;                           // 気の萎えた隊は冒さない
  if (b.t < (c.渡河を計った || 0)) return false;              // 一度計ったら、しばらくは計らない
  c.渡河を計った = b.t + 40;
  if (岸(c.x, c.y) === 岸(sx, sy)) return false;             // そもそも川を渡らずに行ける
  const 場 = 渡り場(c.x);
  const 中 = (RIVER.top + RIVER.bot) / 2 + riverShift(場.x);
  const 渡り場まで = Math.hypot(場.x - c.x, 中 - c.y);
  const 直 = Math.hypot(sx - c.x, sy - c.y);
  /* 渡り場の袂に敵がいるか。固められているなら、そこを通るのは愚である。 */
  const 敵 = b.corps.filter((o) => !o.dead && !o.destroyed && o.side !== c.side
    && Math.hypot(場.x - o.x, 中 - o.y) < 240).reduce((a2, o) => a2 + corpsMen(o), 0);
  const 遠回り = 渡り場まで > 直 * 0.9 + 200;
  if (!遠回り && 敵 < 700) return false;
  /* 渡る先は、敵の目の届かぬところ。渡り場から離れた岸を選ぶ。 */
  const 離れ = Math.sign(c.x - 場.x) || 1;
  const 渡点 = clamp(c.x + 離れ * (260 + Math.random() * 180), 60, FIELD.w - 60);
  c.押し渡る = b.t + 120;
  c.wp = [{ x: 渡点, y: (RIVER.top + RIVER.bot) / 2 + riverShift(渡点), r: 60 },
    { x: sx, y: sy, r: 50 }];
  issueOrder(b, c, { order: "移動", tx: c.wp[0].x, ty: c.wp[0].y, keepPath: true });
  b.log.push({ t: b.t, text: `${c.gen.name}隊は渡り場を避け、瀬ならぬ淵を押し渡って回り込む。` });
  return true;
}

/* 指揮圏の外で戦う（GDD 8.5）。

   本陣から伝令の届かぬ隊には、これまで何の下知も渡らなかった。issueOrder が
   「命令が届かない」として黙って捨てていたからである。渡らねば隊は布陣したときの
   「待機」のまま、敵が四十歩先に来ても動かない。

   指揮圏は 三百＋統率×三（野の倍を掛ける）であり、隊が二十・三十と並ぶ大軍では
   戦列が指揮圏より長くなる。翼の隊はそのまま盤の隅で立ち尽くす。遊ぶ側の
   申し出は「合戦で多数の軍が出ると、委任しても動かなかったり変な方向に向かう軍が
   ある」であった。実測では、三十二対三十二の野で片翼の四隊が、百三十歩先に敵を
   見ながら一歩も動かなかった。

   伝令が届かぬとは、本陣の絵図どおりに動けぬということであって、戦わぬという
   ことではない。己の目に映るいちばん近い敵へ当たる。回り込みも、丘取りも、
   伏せもしない――それらは本陣の差配だからである。川の掟と道さがしだけは通す。
   目の前の淵に歩み入るのは、伝令の有無とは関わりがない。 */
function 自ら当たる(b, c, alive) {
  const foeSide = c.side === "P" ? "E" : "P";
  let 的 = null, 近 = Infinity;
  for (const o of alive) {
    if (o.side !== foeSide || o.routed || o.withdraw || o.不戦) continue;
    if (o.ambush && !o.seen) continue;
    const d = Math.hypot(o.x - c.x, o.y - c.y);
    if (d < 近) { 近 = d; 的 = o; }
  }
  if (!的) { issueOrder(b, c, { order: "待機", tx: c.x, ty: c.y }, { 即: true }); return; }
  if (c.squads.some((q) => q.engaged)) return;        // すでに槍を合わせている。そのまま戦う
  /* 寄せ手は進み、受け手は持ち場を守る。

     伝令が届かぬからといって、受け手まで丘を下りて駆け出すのでは筋が通らない。
     高みに拠るのは受け手の利であり、寄せて来るのを待てばよい。進まねば何も
     始まらぬのは寄せ手のほうである。ただし敵が間近に迫れば、どちらも当たる
     ――目の前の敵を見ながら動かぬ備など無い。 */
  if (c.side !== b.attacker && 近 > 噛みの間() * 2.5) {
    issueOrder(b, c, { order: "守備", tx: c.x, ty: c.y, faceTo: Math.atan2(的.y - c.y, 的.x - c.x) }, { 即: true });
    return;
  }
  const d = Math.max(1, 近);
  let sx = 的.x + ((c.x - 的.x) / d) * 40;
  let sy = 的.y + ((c.y - 的.y) / d) * 40;
  if (!MAP && hasRiver()) {
    const 掟 = 川の掟(b, c, sx, sy, 的);
    if (掟.射る) { issueOrder(b, c, 岸から射る(c, 的, 掟.sx, 掟.sy), { 即: true }); return; }
    sx = 掟.sx; sy = 掟.sy;
  }
  if (!MAP && !c.routed && !c.withdraw) {
    const 道 = 寄せ道を引く(b, c, sx, sy);
    if (道 === "続行") return;
    if (道) {
      c.wp = 道;
      issueOrder(b, c, { order: "移動", tx: 道[0].x, ty: 道[0].y, keepPath: true }, { 即: true });
      return;
    }
  }
  issueOrder(b, c, { order: "接戦", target: 的.id, tx: sx, ty: sy }, { 即: true });
}

/* ------------------------------------------------ 出城の采配（GDD 9.3）

   出城に当てる … 出城が保ち、中に守り手がいるあいだ、寄せ手の三分の一（少なくとも
                  一隊）を出城へ向ける。出城に近い隊から選ぶ。残りは城の門へ向かうが、
                  大手へ寄せる道は出城の横腹の前を通るので、出城と大手の両方から射られる。
                  採るのは采配の隊（敵方と、遊ぶ側の委任した隊）だけである
   出城を守る   … 出城の門を受け持つ城方。門が保つあいだは常の門の守り（下の段）に任せ、
                  門が破れたら中で斬り結ぶ。保てなくなれば背の口から大手門の内へ引き取る
                    ・出城が落ちた
                    ・門が破れ、兵が三割を切った、または入った寄せ手が己の三倍を超えて
                      兵が六割を切った
                    ・士気が二十五を切った */
function 出城に当てる(b, alive) {
  if (!出城が保つ(MAP)) return;
  const 出 = MAP.出城;
  const 守 = alive.filter((c) => c.side !== b.attacker && !c.routed && 出城の内か(MAP, c.x, c.y, 8));
  if (!守.length) return;
  const 寄 = alive.filter((c) => c.side === b.attacker && !c.routed && !c.withdraw && !c.detach && delegated(b, c));
  if (!寄.length) return;
  const 要る = Math.max(1, Math.round(寄.length / 3));
  const 今 = 寄.filter((c) => c.出城攻め).length;
  if (今 >= 要る) return;
  const 芯x = MAP.cx + 出.ox, 芯y = MAP.cy + 出.oy;
  const 候 = 寄.filter((c) => !c.出城攻め && !c.本丸攻め && !(c.gate && c.gate.slot === c.id))
    .sort((x, y) => Math.hypot(x.x - 芯x, x.y - 芯y) - Math.hypot(y.x - 芯x, y.y - 芯y));
  for (const c of 候.slice(0, 要る - 今)) {
    c.出城攻め = true; c.gate = 出.gates[0]; c.wp = null; c.gate待ち = 0;
    b.log.push({ t: b.t, text: `${c.gen.name}隊は${出.name}に当たる。` });
  }
}
function 出城を守る(b, c, alive) {
  if (c.引き取り) {
    if (引き取りを進める(b, c)) issueOrder(b, c, { order: "移動", tx: c.tx, ty: c.ty });
    return true;
  }
  const 出 = MAP.出城, g = c.holdGate;
  if (!出) return false;
  const 入った = alive.filter((o) => o.side === b.attacker && !o.routed && !o.withdraw && 出城の内か(MAP, o.x, o.y, 6));
  const 入兵 = 入った.reduce((t, o) => t + corpsMen(o), 0);
  const 兵 = corpsMen(c);
  /* 本城の外の輪が、どこかの門で破れた。出城は大手の前を固める曲輪であって、寄せ手が輪の
     内へ入ったなら、出城に籠っていても城は守れない。背の口から引き取り、まだ破れていない
     内の輪の門に就く。出城に将と兵を回した城は内の輪が薄いので、ここで戻す */
  const 輪が破れた = MAP.gates.some((x) => !x.出城 && x.layer === 0 && x.broken);
  const 見切る = 出.落ちた || c.morale < 25 || 輪が破れた
    || (g.broken && (兵 < corpsMax(c) * 0.3 || (入兵 > 兵 * 3 && 兵 < corpsMax(c) * 0.6)));
  if (見切る) {
    const 引いた = 出城から引き取らせる(b, c);
    if (引いた && 輪が破れた && c.引き取り) {
      const 残り = MAP.gates.filter((x) => !x.broken && !x.出城 && x.layer > 0);
      if (残り.length) {
        const 輪 = Math.min(...残り.map((x) => x.layer)), 門 = c.引き取り.門;
        const 門の場 = gatePos(MAP, 門の輪(MAP, 門), 門);
        c.引き取り.次 = 残り.filter((x) => x.layer === 輪).sort((x, y2) => {
          const ga = gatePos(MAP, 門の輪(MAP, x), x), gb = gatePos(MAP, 門の輪(MAP, y2), y2);
          return Math.hypot(ga.x - 門の場.x, ga.y - 門の場.y) - Math.hypot(gb.x - 門の場.x, gb.y - 門の場.y);
        })[0];
      }
    }
    return 引いた;
  }
  if (!g.broken) return false;                   // 門が保つうちは常の門の守りに任せる
  // 門が破れた。中へ入った寄せ手と斬り結ぶ。いなければ破れ口を塞ぐ
  const 敵 = 入った.sort((x, y2) => Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y2.x - c.x, y2.y - c.y))[0];
  if (敵) { issueOrder(b, c, { order: "接戦", tx: 敵.x, ty: 敵.y, target: 敵.id }); return true; }
  const a = axisOf(出, g), p = fromUV(MAP, a, g.off, a.half - 34);
  if (Math.hypot(c.x - p.x, c.y - p.y) > 40) issueOrder(b, c, { order: "移動", tx: p.x, ty: p.y });
  else issueOrder(b, c, { order: "守備", tx: c.x, ty: c.y });
  return true;
}

/* 盤に現れた後詰（engine.js 後詰を入れる）。城の守りの筋には乗らず、野戦の隊として
   寄せ手に当たる。遠ければ道を引いて寄せ（橋・浅瀬を辿り、城山の塀を回る）、近づけば
   槍を合わせる。狙うのは手近な寄せ手――門に取り付いている隊は背が空いている。
   道は八秒ごとに引き直す（寄せ手も動く） */
function 後詰を当てる(b, c, alive) {
  const 敵 = alive.filter((o) => o.side === b.attacker && !o.routed && !o.withdraw && !o.dead && !o.destroyed);
  if (!敵.length) { if (c.order !== "待機") issueOrder(b, c, { order: "待機", tx: c.x, ty: c.y }); return; }
  if (c.order === "接戦" && c.squads.some((q) => q.engaged)) return;       // 槍を合わせている
  const 的 = 敵.reduce((a, o) => (Math.hypot(o.x - c.x, o.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? o : a), 敵[0]);
  const d = Math.hypot(的.x - c.x, 的.y - c.y);
  if (d > 320 * fieldScale()) {
    if (c.wp && c.wp.length && b.t < (c.後詰の道 || 0)) return;            // 引いた道を辿っている
    c.後詰の道 = b.t + 8;
    const p = navPath(MAP, c.x, c.y, 的.x, 的.y);
    if (p && p.length) { c.wp = p; issueOrder(b, c, { order: "移動", tx: p[0].x, ty: p[0].y, keepPath: true }); return; }
    issueOrder(b, c, { order: "前進", tx: 的.x, ty: 的.y, target: 的.id });
    return;
  }
  c.wp = null;
  issueOrder(b, c, { order: "接戦", tx: 的.x, ty: 的.y, target: 的.id });
}

export function battleAI(b) {
  setAiIssuing(true);
  // 去就の定まらぬ隊（日和見）は采配の目にも入らない（GDD 8.9）
  const alive = b.corps.filter((c) => !c.dead && !c.destroyed && !c.日和見);
  /* 采配の側が結んだ内応は、采配が頃合いを計って動かす（GDD 11.2）。

     遊ぶ側は敵の隊の帳面から「内応させる」を押す。采配にはその画面が無いので、
     戦が半刻ほど進んだところで旗を翻させる。始まるなり寝返らせては、城を
     囲んだだけで城が割れることになり、戦にならない。 */
  for (const c of alive) {
    if (!c.内応 || c.寝返り) continue;
    if (c.内応の主 !== "E") continue;                    // 遊ぶ側の密約は、遊ぶ側が押す
    if (b.t < 45) continue;
    内応させる(b, c);
    if (MAP && c.holdGate && !c.holdGate.broken) 内応の門を開く(b, c);
  }
  /* 分遣隊は所属を問わず割り当てられた任務を自律遂行する（GDD 8.5）。
     割いた隊にも川の掟をかける。本隊にだけ掛けて分遣に掛けぬ道理はない。
     回り込む騎馬は道を引かずに真っすぐ歩くので、川があれば淵を突っ切っていた。
     ただし渡河点の守りだけは除く。渡り場の袂に立つのがその役目である。 */
  for (const c of alive) {
    if (!c.detach || c.routed) continue;
    detachAI(b, c, alive);
    if (MAP || !hasRiver() || c.withdraw || c.ambush) continue;
    if (c.task === "橋渡河点防衛" || c.order === "待機" || c.order === "守備") continue;
    const 掟 = 川の掟(b, c, c.tx, c.ty, null);
    c.tx = 掟.sx; c.ty = 掟.sy;
  }
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
      if (b.筋書き) continue;                            // 筋書きの一戦は史実の布陣で始める
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
  /* 一軍が同時に出せる分遣の数には限りがある（GDD 8.5）。

     「噛み合って六秒たてば騎馬を回してよい」という決めは、二隊三隊の戦を
     見て作ったものであった。隊が増えると、噛み合った隊はみな条件を満たす。
     関ヶ原（片軍五十隊）で測ると分遣が三十四隊も湧き、盤は分遣の札で埋まって
     どの隊がどこにいるのかも読めない。十二対十二の野戦でも十二隊が湧いていた。

     側面へ回り込むのは戦の中の一手であって、全隊が同時にやることではない。
     生きた隊の五分の一、多くとも四隊までとする。 */
  /* 数は一巡のあいだ持ち回る。makeDetachment は b.corps へ足すが、この一巡で
     使っている alive には入らないので、同じ一巡のうちに何隊も抜けてしまう
     （限りを四としたのに十三隊出ていた）。 */
  const 分遣の数 = { P: 0, E: 0 };
  for (const o of alive) if (o.detach) 分遣の数[o.side]++;
  const 分遣の限り = (side) => clamp(Math.round(alive.filter((o) => !o.detach && o.side === side).length / 5), 1, 4);
  for (const c of alive) {
    if (!delegated(b, c) || c.detach || c.routed || c.withdraw) continue;
    if (c.守備隊 || c.不戦 || c.控え || c.縛り) continue;   // 動かぬ隊は兵を割かない
    if (c.morale < 55 || corpsMen(c) < corpsMax(c) * 0.5) continue;
    if (b.t < 3) continue;                       // 布陣直後は様子を見る
    if (b.t < (c.分遣を検めた || 0) + 5) continue;
    if (分遣の数[c.side] >= 分遣の限り(c.side)) continue;
    c.分遣を検めた = b.t;
    /* 筋書きの一戦では、割くのは騎馬の側面攻撃だけとする。
       高地を取る・渡河点を守る・森を探るといった分遣は、そのつど盤に隊と札を
       増やす。史実の布陣から始める一戦で、これを並べる意味はない。 */
    const opt = detachOptions(b, c)
      .filter((o) => o.ok && (!b.筋書き || o.key === "騎馬側面攻撃") && 分遣の頃合い(b, c, o.key));
    if (!opt.length) continue;
    if (Math.random() > 0.3) continue;           // 頃合いでも、必ず割くわけではない
    makeDetachment(b, c, opt[Math.floor(Math.random() * opt.length)].key);
    分遣の数[c.side]++;
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

  /* 本陣を守る（GDD 8.7）。

     敵が総大将の間近まで迫ったら、近い味方が引き返して本陣を守る。
     旗が倒れれば軍は崩れるのだから、戦列を保つことより先である。
     筋書きの一戦（関ヶ原）では掛けない――そちらは史実の布陣で始まり、
     本陣の進退は分岐のほうで決まる。天下分け目は同じ「筋書きの野」に乗って
     いるが、布陣は史実ではなく盤の成り行きで決まるので、こちらは掛ける
     ――当主が本陣に座っている以上、旗を守る手当てが要る。 */
  if (!MAP && (!b.筋書き || b.分け目)) {
    for (const side of ["P", "E"]) {
      for (const o of alive) if (o.side === side) o.本陣を守る = false;
      const 大将 = alive.find((c) => c.side === side && c.gen.lord && !c.detach && !c.routed && !c.withdraw);
      if (!大将) continue;
      const 間 = 520 * Math.sqrt(fieldScale());
      const 迫 = alive.filter((o) => o.side !== side && !o.routed && !o.withdraw
        && Math.hypot(o.x - 大将.x, o.y - 大将.y) < 間);
      if (!迫.length) continue;
      const 的 = 迫.sort((x, y2) => Math.hypot(x.x - 大将.x, x.y - 大将.y)
        - Math.hypot(y2.x - 大将.x, y2.y - 大将.y))[0];
      const 候 = alive.filter((o) => o.side === side && o !== 大将 && !o.detach && !o.routed
        && !o.withdraw && delegated(b, o) && !o.不戦 && !o.控え && !o.縛り)
        .sort((x, y2) => Math.hypot(x.x - 大将.x, x.y - 大将.y)
          - Math.hypot(y2.x - 大将.x, y2.y - 大将.y)).slice(0, 2);
      for (const o of 候) {
        if (!o.守りに就いた) {
          o.守りに就いた = true;
          b.log.push({ t: b.t, text: `${o.gen.name}隊が本陣の守りへ引き返す。` });
        }
        o.本陣を守る = true;
        const d = Math.hypot(的.x - o.x, 的.y - o.y) || 1;
        issueOrder(b, o, { order: "接戦", target: 的.id,
          tx: 的.x + ((o.x - 的.x) / d) * 40, ty: 的.y + ((o.y - 的.y) / d) * 40 });
      }
    }
  }

  if (MAP) { 出城に当てる(b, alive); 采配の計略(b); }   // 采配の寄せ手は、水の手と焼き働きを一日一度ずつ（keiryaku.js）
  for (const c of alive) {
    if (!delegated(b, c) || c.routed || c.detach) continue;
    if (c.本陣を守る) continue;                       // 本陣の守りに就いた隊は、そのまま
    /* 動かぬと決めている隊には、采配も何も企てない。
       戦わぬ島津に「木立へ回って伏せよ」と命じては、動かぬと決めた意味がない。 */
    if (c.不戦 || c.控え || c.縛り) continue;
    if (MAP && c.後詰) { 後詰を当てる(b, c, alive); continue; }   // 盤に現れた後詰は野戦の隊として当たる
    /* 伏せに向かう隊と、伏せている隊。

       伏せ場へ着いたら身をひそめる。ひそめた隊には、以後なにも命じない。
       命じれば動き、動けば見つかる。 */
    if (c.ambush && !c.revealed) continue;
    /* 伝令の届かぬ隊は、己の判じで戦う（上の「指揮圏の外で戦う」を見よ）。
       本陣の絵図（回り込み・丘取り・伏せ）には加われないが、立ち尽くしもしない。

       退くと決めた隊には触れない。退きは本人の判断であって伝令を要しないので、
       ここで当たらせては、退きの下知をその場で打ち消すことになる。実測では、
       指揮圏の外の隊に「退け」と命じても四十三歩で足を止めていた。 */
    if (!MAP && !c.伏せ場 && !c.withdraw && c.order !== "撤退"
      && outOfCommand(b, c)) { 自ら当たる(b, c, alive); continue; }
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
    /* 戦わぬと決めている敵（島津）は、進んでは狙わない。

       義弘は備を固めたまま一歩も動かなかった。こちらから仕掛けなければ
       撃ってもこない相手に、わざわざ兵を割いて当たる道理はない――東軍も
       島津を積極的には攻めなかった。ほかに戦える敵が一つも居なければ、
       そのときは相手にする。 */
    const 戦う敵 = alive.filter((o) => o.side === foeSide && !o.routed && (o.seen || !o.ambush));
    const foes = 戦う敵.some((o) => !o.不戦) ? 戦う敵.filter((o) => !o.不戦) : 戦う敵;

    /* 総大将の身の置きどころ（GDD 8.7）。

       大将は旗本を率いて戦列の後ろに構える。前線が前へ出れば、同じ間合いを
       保って進む――戦うためではなく、旗を見せて士気を支えるためである
       （engine の「総大将が前線に出れば全軍の士気が上がる」はそのままである）。

       敵が崩れて勝ちが見えたら、大将も前へ出る。武勇と統率のある将ほど早く出る。
       片軍が三隊に満たないときは掛けない――二隊しかいない戦で大将が下がれば、
       残る一隊で戦うことになる。 */
    if (c.gen.lord && !MAP && !b.筋書き && !c.withdraw) {
      const 味方 = alive.filter((o) => o.side === mySide && o !== c && !o.detach && !o.routed);
      if (味方.length >= 2) {
        const 敵気 = foes.length ? foes.reduce((a, o) => a + o.morale, 0) / foes.length : 0;
        const 敵兵 = foes.reduce((a, o) => a + corpsMen(o), 0);
        const 初 = ((b.initial || {})[foeSide]) || 1;
        const 腰 = ((c.gen.valor || 60) + (c.gen.lead || 60)) / 2;
        const 好機 = !foes.length || 敵気 < 26 + 腰 * 0.14 || 敵兵 <= 初 * (0.30 + 腰 * 0.0020);
        if (!好機) {
          const cx = 味方.reduce((a, o) => a + o.x, 0) / 味方.length;
          const cy = 味方.reduce((a, o) => a + o.y, 0) / 味方.length;
          const 敵中 = foes.length
            ? { x: foes.reduce((a, o) => a + o.x, 0) / foes.length,
              y: foes.reduce((a, o) => a + o.y, 0) / foes.length }
            : { x: cx, y: cy - 1 };
          const vx = cx - 敵中.x, vy = cy - 敵中.y, d = Math.hypot(vx, vy) || 1;
          const 後ろ = clamp(FIELD.h * 0.13, 240, 900);
          const tx = clamp(cx + (vx / d) * 後ろ, 60, FIELD.w - 60);
          const ty = clamp(cy + (vy / d) * 後ろ, 60, FIELD.h - 60);
          if (Math.hypot(tx - c.x, ty - c.y) > 90) issueOrder(b, c, { order: "移動", tx, ty });
          else issueOrder(b, c, { order: "待機", tx: c.x, ty: c.y });
          c.本陣に構える = true;
          continue;
        }
        if (c.本陣に構える) {
          c.本陣に構える = false;
          b.log.push({ t: b.t, text: `${c.gen.name}が旗本を率いて前へ出た。` });
        }
      }
    }

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
        /* 追い討ちにも川の掟をかける。ここだけが掟を素通りしていて、
           崩れた敵が水へ逃げ込むと、追う側まで淵へ踏み込んでいた。 */
        const 掟 = 川の掟(b, c, 獲.x, 獲.y, 獲);
        if (掟.射る) { issueOrder(b, c, 岸から射る(c, 獲, 掟.sx, 掟.sy)); continue; }
        issueOrder(b, c, d < 220 ? { order: "接戦", tx: 掟.sx, ty: 掟.sy, target: 獲.id }
          : { order: "前進", tx: 掟.sx, ty: 掟.sy, target: 獲.id });
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
    /* 兵力差と地形から陣形を選び直す。プレイヤーと同じ陣形・同じ手間で行う。
       ただし、遊ぶ側が布陣のときに選んだ陣形は書き換えない。
       初めの陣形は横陣であり（makeCorps）、そこから選ぶのは遊ぶ側の領分である。 */
    /* 筋書きの一戦では、采配は陣形を選び直さない。関ヶ原の各隊がどの陣を
       敷いていたかは記録が乏しく、確かなことは言えない。横陣のまま始め、
       組み替えるのは遊ぶ側の領分とする。 */
    if (!c.formPicked && !c.陣を選んだ && !b.筋書き) {
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
    /* 当たる相手は、近さだけでなく先客の数で選ぶ（GDD 8.4）。
       空いた敵がいるなら、多少遠くてもそちらへ回る。 */
    const tgt = 狙う敵を選ぶ(alive, c, foes);
    // 槍を合わせている隊は目標を変えない。向き直って側面を晒すのを避ける。
    if (c.order === "接戦" && c.squads.some((q) => q.engaged)) continue;
    /* 持ち場のある隊（高み・押さえ）は、縄の内で戦う（GDD 12.6）。

       高みを押さえた隊が敵を見て山を降りてしまっては、山を取った甲斐がない。
       縄の外の敵は追わず、持ち場へ戻る。縄の内に敵が入れば、常のとおり当たる。 */
    if (c.持ち場 && !c.routed && !c.withdraw && !c.detach) {
      const 場 = c.持ち場;
      const 敵まで = Math.hypot(tgt.x - 場.x, tgt.y - 場.y);
      const 我まで = Math.hypot(c.x - 場.x, c.y - 場.y);
      /* 縄には見切りを付ける（GDD 12.6）。

         押さえる値打ちがあるのは、そこが争われているあいだだけである。
         戦列が余所へ移り、縄の内に敵が一人も来ないまま時が過ぎたなら、
         その高みを抱いている意味はない。実測では、天下分け目の六十四隊の盤で
         二十八隊が縄に繋がれ、そのうち十隊が一歩も動かぬまま戦が終わっていた
         ――遊ぶ側の申し出は「委任しても一部の部隊しか動かない」であった。

         縄の内に敵が居る刻は数え直し、居ない刻は積む。二分積んだら縄を解く。
         解いたあとは常の隊として戦う。一度解けば、もう縛らない。 */
      if (敵まで <= 場.縄) c.縄の空き = 0;
      else c.縄の空き = (c.縄の空き || 0) + 0.6;   // 采配は〇.六秒ごと（engine の aiClock）
      if (c.縄の空き > 120) {
        c.持ち場 = null; c.縄を解いた = true;
      } else if (敵まで > 場.縄 || 我まで > 場.縄 * 1.15) {
        /* 敵が縄の外なら追わない。自分が縄の外へ出ていたら、まず戻る
           （追ううちに引きずられて持ち場を空けることがある）。 */
        if (我まで > 160) { issueOrder(b, c, { order: "移動", tx: 場.x, ty: 場.y }); continue; }
        c.order = "守備"; c.tx = c.x; c.ty = c.y; continue;
      }
    }
    /* 掃討のときに、全軍が一塊にならないようにする（GDD 8.4）。

       戦の終わりに敵が数隊まで減ると、残った味方がみなその数隊へ向かう。
       先客の数で重みは付けてあるが、それは「槍を合わせている味方」しか数えない
       ので、向かっている途中の隊は数に入らない。実測では、七隊が二百五十歩の
       塊になって盤の隅に固まっていた（遊ぶ側の見立てどおりである）。

       敵一隊につき味方二隊で足りる。手が余っているなら、余った隊は持ち場に
       留まる――追わずに、その場を押さえる。戦が長引くことはない。二隊が掛かって
       いるのだから、掃討そのものは進む。 */
    /* 掛ける数は二隊まで。三隊にすると塊が戻り、止めすぎると掃討が進まない。
       効かせるのは大軍の一戦だけにする――隊が二十八を超える盤である。
       十隊ほどの野戦では、そもそも塊に見えないうえ、掃討が長引くと日没まで
       延びて引き分けが増える（実測で戦の長さが五割延びた）。 */
    const 大軍の掃討 = !MAP && b.corps.length >= 28;
    if (大軍の掃討 && !c.squads.some((q) => q.engaged) && !c.routed && !c.withdraw && !c.detach) {
      const 味方数 = alive.filter((x) => x.side === c.side && !x.routed && !x.withdraw).length;
      /* 掛かるのは「その敵にいちばん近い二隊」だけ、と順で決める。

         はじめは「まわりに何隊寄っているか」で数えていたが、終わり際には
         みな近くにいるので数が頭打ちになり、十五隊が二百八十歩の塊になった。
         自分より近い味方を数えれば、誰が掛かるべきかが一意に決まる。 */
      /* 手が余っているかは、盤に残る敵の数で測る（GDD 8.4）。

         もとは foes――「いま見えている敵」――の数で測っていた。味方の数は
         盤じゅうを数えるのに、敵だけ目に映るぶんしか数えない。野が広く隊が
         多いほど、翼の隊には敵が二つ三つしか見えないので、まだ戦の初めだと
         いうのに「敵二隊に味方三十二隊では手が余る」と判じて立ち尽くした。
         遊ぶ側の申し出は「合戦で多数の軍が出ると、委任しても動かなかったり
         変な方向に向かう軍がある」であった。実測では、三十二対三十二の野で
         四隊が百三十歩先の敵を見ながら待機のまま動かなかった。

         数えるのは、まだ戦える敵――敗走も退きもせず、戦う気のある隊である。
         見えていようといまいと、いずれ当たらねばならぬ相手には違いない。 */
      const 残る敵 = alive.filter((x) => x.side === foeSide
        && !x.routed && !x.withdraw && !x.不戦 && !x.dead && !x.destroyed).length;
      const 寄せる限り = 残る敵 <= 2 ? 3 : 2;           // 残り二隊を切ったら三隊で片づける
      if (残る敵 * 寄せる限り < 味方数) {
        const 我まで = Math.hypot(tgt.x - c.x, tgt.y - c.y);
        const 近い味方 = alive.filter((x) => x !== c && x.side === c.side && !x.routed && !x.withdraw
          && Math.hypot(x.x - tgt.x, x.y - tgt.y) < 我まで).length;
        /* 手が余っているなら、余った隊は持ち場に留まる。追わずに、その場を押さえる。 */
        if (近い味方 >= 寄せる限り) { c.order = "待機"; c.tx = c.x; c.ty = c.y; continue; }
      }
    }
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
        /* 出城の守り手（下の 出城を守る）。門が保つあいだは常の門の守りと同じに受け持つ */
        if ((c.引き取り || (c.holdGate && c.holdGate.出城)) && 出城を守る(b, c, alive)) continue;
        let g2 = c.holdGate;
        /* 一割まで待つと、門が破れる前に下がりきれない。四半分で見切りをつける。
           「城門が一割を切っても内の門へ行かない」という声はここである。
           出城の門だけは見切らない（出城の見切りは 出城を守る が受け持つ） */
        const need = !g2 || (!g2.出城 && (g2.broken || g2.hp / g2.max < 0.25));
        if (need) {
          // 持ち場があるなら、それより内の門だけを見る（下がるのであって、進み出るのではない）
          const 残り = MAP.gates.filter((x) => !x.broken && (!g2 || x.layer > g2.layer));
          if (残り.length) {
            const 輪 = Math.min(...残り.map((x) => x.layer));        // まだ破れていない、いちばん外の輪
            const 場 = (x) => gatePos(MAP, 門の輪(MAP, x), x);
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
          const l2 = 門の輪(MAP, g2), a2 = axisOf(l2, g2);
          /* 門のすぐ内側に立つ。奥へ引っ込んでは門を支えられない。
             出城は塀が薄いので、塀から三十歩は退いて立つ（塀ごしに槍を合わせない） */
          const p2 = fromUV(MAP, a2, g2.off, a2.half - (g2.出城 ? 30 : 14));
          const d2 = Math.hypot(c.x - p2.x, c.y - p2.y);
          /* 持ち場へ寄る。ただし「三十四を超えたら動く」だけでは、ちょうどその際で
             毎瞬「動け」と「そこで守れ」が入れ替わり、隊がその場で震えて見える。
             動き出す間合いと、着いたとみなす間合いを分ける。 */
          /* 後詰に呼応して出た隊は、出ているあいだ持ち場へ呼び戻さない（下の 呼応の的）。
             的は門から三百歩の内にいる。持ち場の際（四十六歩）を越えるたびに呼び戻すと、
             的に届かぬまま門の前を出入りするだけになる */
          if (d2 > (c.持ち場に着いた ? 46 : 30) && !(c.sallied && c.呼応して出た)) {
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
            /* 後詰に呼応する（engine.js 後詰に呼応する）。六十秒のあいだは、門から三百歩の内に
               いる寄せ手の隊のうち、自隊の四倍までの隊へ門を開いて当たる。後詰に向き直った隊
               （城に背を向けた隊）を先に狙う。内と外から挟むのが後詰の形である。
               もとは常の打って出と同じく「門の前（百七十歩）の寄せ手の総勢が自隊の三倍まで、
               自隊が兵の四割五分を保つこと」を求めていた。門に寄せ手が群がる城攻めではこれが
               まず満たされず、呼応の報せが出ても一隊も出なかった */
            const 呼応中 = !!(b.呼応 && b.t < b.呼応.まで && b.呼応.側 === c.side);
            const 呼応の的 = 呼応中 && c.morale > 45 && myMen > corpsMax(c) * 0.25
              ? b.corps.filter((x) => x.side === b.attacker && !x.dead && !x.destroyed && !x.routed
                && Math.hypot(x.x - gp.x, x.y - gp.y) < 300 && corpsMen(x) < myMen * 4)
                .sort((x, y2) => (y2.後詰に向いた ? 1 : 0) - (x.後詰に向いた ? 1 : 0)
                  || Math.hypot(x.x - gp.x, x.y - gp.y) - Math.hypot(y2.x - gp.x, y2.y - gp.y))[0] || null
              : null;
            const chance = (foes.length && fit && (
              foeMor < 40                        // 寄せ手の士気が尽きかけている
              || foeMen < myMen / 3              // 寄せ手が三分の一を割った
              || myWorth > foeWorth * 1.4        // 将の器量で大きく上回る
            )) || !!呼応の的;                    // 後詰に呼応する
            if (c.守備隊) {
              /* 守備隊は討って出ない（GDD 9.3）。門を支え、外へ射かけるだけである。
                 名も無き足軽小頭に、門を開いて野へ出よとは言えない。 */
              const 射手 = c.squads.some((q) => q.men > 0 && (q.type === "yumi" || q.type === "teppo"));
              if (射手 && foes.length) {
                const t4 = [...foes].sort((x, y2) =>
                  Math.hypot(x.x - gp.x, x.y - gp.y) - Math.hypot(y2.x - gp.x, y2.y - gp.y))[0];
                issueOrder(b, c, { order: "射撃", tx: p2.x, ty: p2.y, target: t4.id });
              } else issueOrder(b, c, { order: "守備", tx: c.x, ty: c.y });
              continue;
            }
            if (c.sallied) {
              // 打って出た後は四十秒で城へ戻る
              if (b.t - (c.sallyAt || 0) > 40 || c.morale < 46) {
                c.sallied = false; c.sallyLogged = false; c.呼応して出た = false;
                b.log.push({ t: b.t, text: `${c.gen.name}隊が${g2.key}の内へ戻った。` });
                issueOrder(b, c, { order: "移動", tx: p2.x, ty: p2.y });
                continue;
              }
              // 呼応して出た隊は、門の前に寄せ手がいなくても、呼応のあいだは的を追う
              const t2 = [...foes].sort((x, y2) => corpsMen(x) - corpsMen(y2))[0] || (c.呼応して出た ? 呼応の的 : null);
              if (t2) { issueOrder(b, c, { order: "接戦", tx: t2.x, ty: t2.y, target: t2.id }); continue; }
              c.sallied = false; c.呼応して出た = false;
            } else if (chance) {
              const t2 = 呼応の的 || [...foes].sort((x, y2) => corpsMen(x) - corpsMen(y2))[0];
              if (t2) {
                c.sallied = true; c.sallyAt = b.t; c.呼応して出た = !!呼応の的;
                issueOrder(b, c, { order: "接戦", tx: t2.x, ty: t2.y, target: t2.id });
                if (!c.sallyLogged) {
                  c.sallyLogged = true;
                  b.log.push({ t: b.t, text: 呼応の的 ? `${c.gen.name}隊が後詰に呼応し、${g2.key}を開いて討って出た。`
                    : `${c.gen.name}隊が${g2.key}を開いて討って出た。` });
                }
                continue;
              }
            }
          /* 射手は門ごしに射かける。槍組は門を支えて守る。

             射撃の下知の行き先は持ち場のまま、狙いだけを渡す（上の守備隊も同じ）。もとは
             行き先を的の居所にしていた。城の内では射撃の間合いを取る足（engine）が働かない
             ので、行き先がそのまま歩く先になる。隊は門を出て的へ歩き出し、持ち場の際
             （四十六歩）を越えると呼び戻される――この往き来を二秒ほどごとに繰り返し、
             門の前で震えて見えた */
          const shooter = c.squads.some((q) => (q.men > 0)
            && (q.type === "yumi" || q.type === "teppo"));
          if (shooter && foes.length) {
            const t3 = [...foes].sort((x, y2) =>
              Math.hypot(x.x - gp.x, x.y - gp.y) - Math.hypot(y2.x - gp.x, y2.y - gp.y))[0];
            issueOrder(b, c, { order: "射撃", tx: p2.x, ty: p2.y, target: t3.id });
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
        /* 後詰に背を衝かれたら向き直る（engine.js 後詰を入れる）。外郭の塀の外にいて、門に
           取り付いていない隊のうち、後詰の隊が三百五十歩の内に迫った隊は、門を捨てて
           後詰に当たる。門に取り付いた隊と、曲輪に攻め入った隊はそのまま攻める */
        if (b.後詰 && b.後詰.some((r) => r.入った) && !inLayer(MAP, MAP.layers[0], c.x, c.y)
          && ![...MAP.gates, ...(MAP.出城 ? MAP.出城.gates : [])].some((g) => g.slot === c.id)) {
          const 迫 = alive.filter((o) => o.後詰 && !o.routed && !o.withdraw
            && Math.hypot(o.x - c.x, o.y - c.y) < 350 * fieldScale());
          if (迫.length) {
            const 的 = 迫.reduce((a, o) => (Math.hypot(o.x - c.x, o.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? o : a), 迫[0]);
            if (!c.後詰に向いた) {
              c.後詰に向いた = true;
              b.log.push({ t: b.t, text: `${c.gen.name}隊は後詰に向き直った。` });
            }
            c.wp = null; c.出城攻め = false;
            if (!(c.order === "接戦" && c.squads.some((q) => q.engaged))) {
              issueOrder(b, c, { order: "接戦", tx: 的.x, ty: 的.y, target: 的.id });
            }
            continue;
          }
        }
        /* 渡河のあとの再編（上の 渡りきった隊は隊列を整える）は、隊を待機にして足を止める。
           城攻めの采配は道順を持つあいだ下知を出し直さないので、整え終わっても待機のまま
           道順の途中で立ち尽くした（広い盤で川を渡った寄せ手が、橋の北で動かなくなった）。
           待機のまま道順が残っていれば、捨てて引き直す */
        if (c.wp && c.wp.length && (c.order === "待機" || c.order === "守備") && !c.reforming && !c.pinned) c.wp = null;
        /* 本丸の門が破れていれば、門を破りに回らず本丸へ攻め入る（castleMap.js 本丸への道）。
           これまでは「抜けられる門」を探し続けたので、本丸の門が開いても二の丸の
           残りの門へ引き返し、門が尽きると本丸の中ほどへまっすぐ向かって塀に貼りついた */
        {
          const h0 = MAP.layers[MAP.layers.length - 1];
          if (本丸が開いたか(MAP)) {
            if (!inLayer(MAP, h0, c.x, c.y) && (!c.wp || !c.wp.length)) {
              const wp = 本丸への道(MAP, c.x, c.y);
              if (wp && wp.length) { issueOrder(b, c, { order: "移動", tx: wp[0].x, ty: wp[0].y, keepPath: true }); c.wp = wp; }
            } else if (inLayer(MAP, h0, c.x, c.y)) {
              /* 本丸に入った隊は、本丸に残る城方に当たる。これまでは入ったところで足を止めて
                 いた。城兵が崩れて本丸が空けば押さえられたが、囲みの輪で死兵となった城兵は
                 崩れないので、本丸に居残る隊に誰も当たらず、本丸を押さえられぬまま三分が過ぎて
                 「攻めあぐね」と裁かれていた */
              const 残 = alive.filter((o) => o.side !== b.attacker && !o.routed && !o.withdraw
                && o.squads.some((q) => q.men > 0 && inLayer(MAP, h0, q.x, q.y)));
              if (残.length && !(c.order === "接戦" && c.squads.some((q) => q.engaged))) {
                const 的 = 残.reduce((a, o) => (Math.hypot(o.x - c.x, o.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? o : a), 残[0]);
                issueOrder(b, c, { order: "接戦", tx: 的.x, ty: 的.y, target: 的.id });
              }
            }
            continue;
          }
        }
        /* 出城に当たる隊（出城に当てる）。門が保つあいだは出城の門へ取り付く。
           門が破れたら中へ攻め入り（道は engine の 門を破ったら次へ が引く）、中の守り手を討つ */
        if (c.出城攻め && 出城が保つ(MAP) && MAP.出城.gates[0].broken) {
          if (出城の内か(MAP, c.x, c.y, -6)) {
            const 敵 = alive.filter((o) => o.side !== b.attacker && !o.routed && 出城の内か(MAP, o.x, o.y, 10))
              .sort((x, y2) => Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y2.x - c.x, y2.y - c.y))[0];
            if (敵) issueOrder(b, c, { order: "接戦", tx: 敵.x, ty: 敵.y, target: 敵.id });
            else issueOrder(b, c, { order: "守備", tx: c.x, ty: c.y });
          }
          continue;
        }
        // 寄せ手：抜けられる門のうち、いちばん外の近い門へ取り付く
        const g = c.出城攻め && 出城が保つ(MAP) ? MAP.出城.gates[0] : nearestOpenGate(MAP, c.x, c.y);
        /* 門の順番待ち（GDD 9.3）。

           門の間口は狭く、取り付けるのは一隊だけである。ところが残りの隊も毎度
           門へ寄せていたので、押し合いに弾かれては寄せ直し、門前で行きつ戻りつ
           していた。実測では、城攻めで隊の動きの三割が前と逆であった――遊ぶ側の
           目には「組があっちへ行ったりこっちへ行ったり」と映る。

           取り付けぬ隊は、門へ続く道の後ろに列を作って待つ。順は門に近い者から。
           取り付いた隊が退けば、次の隊がそのまま前へ出る。待つのが常道である。 */
        if (g && g.slot && g.slot !== c.id && !c.pinned) {
          const 待つ隊 = b.corps.filter((o) => !o.dead && !o.destroyed && !o.routed && !o.withdraw
            && o.side === b.attacker && o.id !== g.slot && (o.gate === g || !o.gate));
          const gp5 = gatePos(MAP, 門の輪(MAP, g), g);
          待つ隊.sort(列の順(g, gp5));                   // engine と同じ順（castleMap.js 列の順）
          const 順 = Math.max(0, 待つ隊.findIndex((o) => o.id === c.id));
          /* 立ち所は engine と同じ口から採る。采配と engine が別々の所を指して
             いると、隊は二つの的のあいだで揺れる。 */
          const 控 = 門の控え口(MAP, 門の輪(MAP, g), g, 順);
          const 隔 = Math.hypot(c.x - 控.x, c.y - 控.y);
          if (隔 > 46) {
            if (!c.wp || !c.wp.length) {
              // 控え口が塀の向こうなら道を引く（まっすぐ行けば塀に貼りつく）
              /* 広い盤で城山の外にいるなら、野の道（橋・浅瀬）を辿って寄せる（castleMap.js 継いだ道） */
              const 遠い = MAP.域 && !城の域か(c.x, c.y);
              const p = !遠い && (g.layer <= 0 || 見通せる(c.x, c.y, 控.x, 控.y)) ? null : navPath(MAP, c.x, c.y, 控.x, 控.y);
              if (p && p.length) { issueOrder(b, c, { order: "移動", tx: p[0].x, ty: p[0].y, keepPath: true }); c.wp = p; }
              else issueOrder(b, c, { order: "移動", tx: 控.x, ty: 控.y });
            }
          } else {
            c.wp = null;
            issueOrder(b, c, { order: "待機", tx: c.x, ty: c.y });
          }
          continue;
        }
        if (g && near > 130) {
          if (!c.wp || !c.wp.length) {
            const wp = routeToCastleGate(MAP, g, c.x, c.y);
            if (wp.length) { issueOrder(b, c, { order: "移動", tx: wp[0].x, ty: wp[0].y, keepPath: true }); c.wp = wp; }
            else {
              const a2 = axisOf(門の輪(MAP, g), g);
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
       戦う力も一割五分増す。

       丘へは、本隊で登るか、遠隔兵を割いて登らせるか、いずれかである
       （corps.js の「丘ひとつに一隊」）。ここは本隊で登るほうであって、
       登るのは守勢の隊――受け手であって、しかも兵で優らぬ側――だけである。

       高みは弱者の頼りである。数で押せる側が坂の上で待てば、相手に整える暇を
       与え、こちらは足の鈍る地に留まるだけで、せっかくの数が生きない。押して
       出る側は本隊を野に置いて敵と当たり、遠隔兵だけを丘へ割く。優劣は隊ごと
       ではなく軍全体の兵力で測る。丘取りは軍としての構えである。

       川向こうの丘は取りに行かない。丘ひとつのために渡河しては元も子もない。
       すでに敵と間近であれば登らない。背を見せて登る隙はない。

       丘ひとつに一隊である。いま足を掛けている丘が空いていればそこ、埋まって
       いれば次に近い空き丘、空き丘が無ければ丘は諦めて野で構える。麓に足を
       掛けただけで「自分は丘にいる」と判じさせないために、目指すのは頂である。
       斜面の裾は高みではない。見晴らしも利かず、寄せ手と同じ高さで槍を合わせる
       ことになる。盤の上でも、丘の手前でぴたりと止まって動かぬ隊として見えていた。

       縛るのは采配――委任した隊と敵方――だけである。プレイヤーが手ずから
       登らせるぶんには、何隊重ねようと指図は指図として通す（この段は
       委任した隊しか通らない）。 */
    /* 丘取りは、筋書きの一戦では行わない。布陣が史実で決まっているのに、
       開戦の合図とともに諸隊が後ろの丘へ登り直しては、その布陣の意味がない。 */
    /* いま高みに立っている受け手は、そこを保つ（GDD 8.1）。

       高みの取り合いは「丘ひとつに一隊」である。頂は狭いのだから、翼は裾へ
       はみ出し、高みの利は得られぬまま戦列だけが薄くなる――その決めは正しい。
       ただしそれは「どの高みへ登りに行くか」の決めであって、「いま立っている
       高みを保つか」の決めではなかった。四隊で丘に拠らせると、丘を押さえた
       一隊だけが留まり、残る三隊は持ち場が無いものとして下りて行った。

       立っている地べたが高みなら、誰の持ち場かに関わらず、そこで待ち受ける。 */
    /* 高みを保つのは、敵がまだ取り付いていないあいだである。

       取り付かれてもなお「その場を動くな」と命じ続けると、隊は押し合いに
       耐えるばかりで槍を合わせに出ない。大軍に当たられた小勢が、守備のまま
       一度も槍を合わせずに射すくめられた（tests/nirami 四）。敵が槍の間合いに
       入ったなら、高みに立ったまま斬り結ぶ――そこから先は常の戦である。
       高みの利は、立っている地べたで既に付いている。 */
    const 敵の近さ = alive.reduce((d, o) => (o.side === c.side ? d
      : Math.min(d, Math.hypot(o.x - c.x, o.y - c.y))), Infinity);
    if (!MAP && !b.筋書き && 高み.length && 守勢の隊(b, c) && 敵の近さ > 340) {
      /* 高みに就いた隊は、そこで待ち受ける。輪の内に居れば高みである。

         一度「頂に立っているときだけ」と狭めたことがある。裾の隊を登らせる
         筋も併せて入れたのだが、どの丘を誰が押さえるかという決めと絡んで、
         委任のままの高地の戦が大きく揺れた（五分の戦で丘に拠る受け手の勝率が
         八割三分と一割三分のあいだを行き来した）。丘の選び方には手を触れない。

         ただし、就いたまま戦が余所へ移ることがある。縄の見切りと同じ理屈で、
         長く敵が来なければ持ち場を解く――三十二隊を向かい合わせた盤で、
         高さ〇.〇四の裾に腰を据えた隊が六つ、百五十刻のあいだ一歩も動かず
         槍も合わせずに突っ立っていた（tests/ozei 一）。押さえる値打ちが
         あるのは、そこが争われているあいだだけである。 */
      const 頂際 = (h) => Math.max(60, Math.min(120, h.r * 0.45));
      const 乗る = 高み.findIndex((h) => (c.x - h.x) ** 2 + (c.y - h.y) ** 2 < h.r ** 2);
      /* 裾に居るなら、敵がまだ遠いうちに頂まで登る（GDD 8.1）。

         輪の縁は裾であって高みではない。受け手が麓で止まってしまっては、
         高みに拠らせた意味がない（tests/chikei 一の三）。

         登るのは敵がまだ遠いうちだけにする。寄せられてから登り始めると、
         隊は坂の途中で崩されるばかりで、委任のまま丘に拠る戦が総崩れになった
         （五分の戦で、丘に拠る受け手の勝率が三割八分から一割三分へ）。
         下の段が「敵まで二百六十歩より遠いとき」に限って登らせているのと
         同じ理屈である。 */
      if (乗る >= 0 && 敵の近さ > 700 && !c.高みを見限った
        && (c.x - 高み[乗る].x) ** 2 + (c.y - 高み[乗る].y) ** 2 > 頂際(高み[乗る]) ** 2
        && 丘が空く(b, 乗る, c)) {
        丘を押さえる(b, 乗る, c);
        const h = 高み[乗る];
        const dx = c.x - h.x, dy = c.y - h.y, d = Math.hypot(dx, dy) || 1;
        const 的x = h.x + (dx / d) * 頂際(h) * 0.7;
        const 的y = h.y + (dy / d) * 頂際(h) * 0.7;
        c.踏む高み = null;
        if (c.order !== "移動" || Math.hypot((c.tx ?? c.x) - 的x, (c.ty ?? c.y) - 的y) > 24) {
          issueOrder(b, c, { order: "移動", tx: 的x, ty: 的y });
        }
        continue;
      }
      if (乗る >= 0) {
        /* 待ち受けてよいのは、敵が寄せて来ているあいだである。

           高みに就いた受け手は、敵が槍の間合いに入るまでその場を動かない。
           ところが戦が余所で起これば、敵はいつまでも寄せて来ない。測ると、
           三十二隊を向かい合わせた盤で、丘に就いた六隊が三十秒のあいだ一歩も
           動かず、槍も合わせずに突っ立っていた――敵との隔たりは四百二十九歩から
           千七十四歩で、どれも縮まっていなかった（tests/ozei 一）。
           遊ぶ側の申し出は「委任しても一部の部隊しか動かない」であった。

           隔たりが縮んでいるなら待つ。縮まぬまま十五秒を過ごしたら、この高みで
           待っていても戦は来ないと見て、常の隊として戦に加わる。 */
        const 寄って来る = c.敵の遠さ前 == null || 敵の近さ < c.敵の遠さ前 - 8;
        c.敵の遠さ前 = 敵の近さ;
        c.待ちぼうけ = 寄って来る ? 0 : (c.待ちぼうけ || 0) + 0.6;
        /* 寄せて来てはいるが、遠いまま長く経つこともある（戦が余所で進んでいる）。
           その場合も見限る。縄の見切り（持ち場のある隊）と同じ二分で取る。 */
        c.高みの空き = 敵の近さ > 700 ? (c.高みの空き || 0) + 0.6 : 0;
        if (c.待ちぼうけ > 15 || c.高みの空き > 120) {
          /* 見限ったことを覚えておく。覚えずに持ち場だけ解くと、下の段
             （空き丘を探す→守備）がまた同じ丘で止めてしまい、隊は動かない。 */
          c.踏む高み = null; c.高みを見限った = true;
        } else {
          /* 持ち場は、一度決めたら動かさない（GDD 8.1）。

             はじめは毎刻いまの居場所を行き先にしていた。ところが隊は押し合いで
             押される。押された先がそのまま新しい持ち場になるので、持ち場ごと
             じりじりと押し出されていく――一万六千九百の大軍に当たられた二千五百の
             小勢が、守備の下知のまま六百歩も後ろへ流れ、槍は一度も合わなかった
             （tests/nirami 四）。石鹸を握るようなものである。

             踏んだ高みを覚え、そこに立った刻の場所を持ち場とする。押されても
             持ち場は動かず、隊は押し返して戻る。高みを離れたなら忘れる。 */
          if (!c.踏む高み || c.踏む高み.i !== 乗る) c.踏む高み = { i: 乗る, x: c.x, y: c.y };
          const 持 = c.踏む高み;
          if (c.order !== "守備" || Math.hypot((c.tx || 0) - 持.x, (c.ty || 0) - 持.y) > 6) {
            issueOrder(b, c, { order: "守備", tx: 持.x, ty: 持.y });
          }
          continue;
        }
      }
      c.踏む高み = null;
    }
    if (!MAP && !b.筋書き && 高み.length && !c.高みを見限った && !c.squads.some((q) => q.engaged)) {
      const 守勢 = 守勢の隊(b, c);
      const 敵まで = Math.hypot(tgt.x - c.x, tgt.y - c.y);
      const 番 = 守勢 ? 空き丘を探す(b, c) : -1;
      const 丘 = 番 >= 0 ? 高み[番] : null;
      /* 下がってまで丘は取らない（GDD 8.1）。

         「近くの空いた丘へ登る」とだけ決めていたので、背後に丘があると
         受け手はそこへ下がった。遊ぶ側から見れば、槍も合わせぬうちに隊が
         勝手に退いていく。測ると、敵から遠ざかる「移動」の下知が千二百件
         出ており、行き先は一手ごとに敵から遠のいていた。

         丘は、いま立っている所より敵から遠くならない範囲で取る。
         二百歩ぶんの後退までは、備えを固めるうちと見る。 */
      const 下がり = 丘 ? Math.hypot(tgt.x - 丘.x, tgt.y - 丘.y) - 敵まで : 0;
      if (丘) {
        const 遠さ = Math.hypot(丘.x - c.x, 丘.y - c.y);
        const 頂 = clamp(丘.r * 0.45, 60, 120);            // ここまで登れば頂とみなす
        const 間 = 540 + 丘.r * 0.8;                        // 大きな高みほど遠くからでも目指す
        /* 頂に就いたなら、敵が近づいても下りない（GDD 8.1）。

           もとは「敵まで二百六十歩より遠いとき」だけこの段を通していた。
           登り終えた隊も、敵が二百六十歩まで寄せた途端にこの段を素通りし、
           下の「接敵」へ落ちて敵のほうへ歩き出す。つまり、寄せ手が近づくたびに
           受け手が高みを捨てて迎えに下りていた――拠らせた丘に居たのは刻の
           四割三分、裾から平均四百三十五歩、最も遠いときで千七百三十四歩。
           山なら一割八分である。高みの利（丘で一割五分、山で二割八分）を
           手放したうえ、登り直す足まで失う。委任のまま丘に拠ると、拠らぬより
           勝率が下がっていたのはこれが元であった（素 六割七分 → 丘 五割）。

           頂に立っているなら、そこで待ち受ける。降りて出迎える理由がない。 */
        if (遠さ <= 頂) {
          丘を押さえる(b, 番, c);
          issueOrder(b, c, { order: "守備", tx: c.x, ty: c.y });
          continue;
        }
        /* 登りに行くのは、敵がまだ遠く、下がりすぎないときだけである。 */
        if (敵まで > 260 && 下がり <= 200 && 遠さ < 間 && 岸(c.x, c.y) === 岸(丘.x, 丘.y)) {
          丘を押さえる(b, 番, c);                           // この高みは我が隊が押さえる
          const 道 = 寄せ道を引く(b, c, 丘.x, 丘.y);
          if (道 === "続行") continue;
          if (道) { c.wp = 道; issueOrder(b, c, { order: "移動", tx: 道[0].x, ty: 道[0].y, keepPath: true }); continue; }
          issueOrder(b, c, { order: "移動", tx: 丘.x, ty: 丘.y });
          continue;
        }
      }
    }
    // 接敵はプレイヤーと同じ間合いで止まり、命令伝達も同じ遅延を受ける（GDD 13.2）。
    // すでに間合いに入っていれば、狙いを直しても後ろへは下がらない。
    const dd = Math.hypot(c.x - tgt.x, c.y - tgt.y) || 1;
    let sx = dd <= 42 ? c.x : tgt.x + ((c.x - tgt.x) / dd) * 38;
    let sy = dd <= 42 ? c.y : tgt.y + ((c.y - tgt.y) / dd) * 38;
    /* 采配がいま選んだ相手を控えておく。下の「同じ敵へ寄せる味方」を数えるのに要る。
       下知に載る 狙い は名指しの目標のための欄で、委ねた隊では立たない。 */
    c.寄せ先 = tgt.id;
    /* その敵にすでに味方が掛かっているなら、正面には並ばない（GDD 8.4）。

       先客の当たっている筋に直交する側――つまり側面へ回り込む。同じ所へ
       二隊が重なれば、盤の上ではどちらが戦っているのか読めなくなるし、
       横から当たるほうが戦としても理に適う。 */
    if (!MAP) {
      const 先 = 先客たち(alive, c, tgt);
      if (先.length) {
        const f = 先.reduce((a, x) => (Math.hypot(x.x - c.x, x.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? x : a), 先[0]);
        const fd = Math.hypot(tgt.x - f.x, tgt.y - f.y) || 1;
        const ux = (tgt.x - f.x) / fd, uy = (tgt.y - f.y) / fd;   // 先客が当たっている筋
        let px = -uy, py = ux;                                     // その直交
        if ((c.x - tgt.x) * px + (c.y - tgt.y) * py < 0) { px = -px; py = -py; }   // 自分のいる側へ
        const 脇 = 46 * fieldScale();
        sx = tgt.x + px * 脇; sy = tgt.y + py * 脇;
      }
      /* 同じ敵へ寄せる味方は、敵のまわりに振り分ける（GDD 8.4）。

         寄せ先は「敵から見て、自分のいる側へ三十八歩」の一点であった。同じ敵へ
         二隊三隊が向かえば、どの隊もほぼ同じ点を目指す。隊どうしの押し合いは
         入れてあるが、押し戻す力と「そこへ行け」の下知が毎刻打ち消し合うので、
         結局は重なったまま止まる。実測では、天下分け目の六十四隊の盤で、
         味方どうしの最も近い隔たりが一歩――駒が完全に重なっていた。
         遊ぶ側の申し出は「なぜか一箇所に集まる」であった。

         先客を避ける段（上）は、既に槍を合わせている隊しか数えない。向かって
         いる途中の隊は数に入らないので、着く前の重なりは防げない。ここでは
         「同じ敵を狙っている味方」を数え、敵を囲む向きに扇で割る。囲むのは
         戦としても理に適う――一方から押すより、二方から当たるほうが効く。 */
      /* 散らすのは「寄せているあいだ」だけである。

         間際まで扇を掛けると、槍を合わせる寸前で横へ回り込む。はじめ
         二隊で四十六度、四隊で百三十七度まで開いたところ、寄せ手は的の
         まわりを回るばかりで押し切れなくなった――五分の戦で、受け手の
         勝率が五割から六割三分（丘では八割三分）へ跳ねた。散らすのは
         道中の話であって、当たり方の話ではない。間合いに入ったら真っすぐ
         当たる。開きも、四隊で七十七度までに詰める。

         ただし切り替えは滑らかにする。ある隔たりで扇を落とすと、そこで
         行き先が跳ぶ――落とした途端に二隊が同じ点を向き直し、また重なった
         （最も近い隔たり二十六歩）。遠いうちは広く、近づくほど狭く、
         間合いでは零になるよう、距離で重みを掛ける。 */
      /* 散らすのは寄せる側だけである。

         はじめは受け手にも掛けていた。守る側が敵を囲みに散っては、戦列が
         薄くなって各個に破られる――五分の戦で、委任の受け手の勝率が
         五割から四割へ落ちた。待つ側は列を保つ。 */
      const 寄せる側 = c.side === b.attacker || !守勢の隊(b, c);
      const 同じ敵へ = 寄せる側 ? alive.filter((x) => x.side === c.side && !x.routed && !x.withdraw
        && !x.detach && (x.寄せ先 === tgt.id || x.狙い === tgt.id || x === c)) : [];
      if (同じ敵へ.length > 1) {
        const 並 = 同じ敵へ.slice().sort((a, z) => (a.id < z.id ? -1 : a.id > z.id ? 1 : 0));
        const k = 並.findIndex((x) => x === c);
        const n = 並.length;
        const 利き = clamp((dd - 60) / 220, 0, 1);
        /* 開きは、重ならずに済む最小で足りる。広く開くほど寄せ手は
           囲みやすくなるが、それは「重なりを解く」という元の用を超えて
           寄せ手を強くしてしまう――五分の戦で受け手の勝率が五割から
           四割へ傾いた。四隊で五十二度まで。 */
        const 開き = Math.min(1.0, 0.3 * (n - 1)) * 利き;
        const ずれ = n > 1 ? (k / (n - 1) - 0.5) * 開き : 0;
        /* 割り当てた角は、狙いが変わるまで動かさない。

           はじめは毎刻この角を引き直していた。隊それぞれの居場所から軸を
           取るので、隊が横へ寄るたびに軸も回り、行き先が逃げる――隊は追って
           横へ動き、また軸が回る。前後の揺れが二割一分から三割八分へ増えた
           （tests/butsukari 四）。衆の重心から軸を取ってみたが、重心も動くので
           なお悪い（五割三厘）。角そのものを狙いごとに凍らせると、今度は
           寄せ始めの刻（まだ扇が開いていない）の角で固まり、散らばらなくなる
           （張る弧が三十二度、最も近い隔たり六歩）。

           凍らせるのは軸だけにする。軸は狙いを定めた刻の向きで決め打ち、
           開きは隔たりに応じて毎刻計り直す――近づくほど閉じ、間合いで零に
           なる。これなら軸が逃げず、当たり際には真っすぐ向かう。 */
        if (!c.扇 || c.扇.的 !== tgt.id) {
          c.扇 = { 的: tgt.id, 基: Math.atan2(sy - tgt.y, sx - tgt.x) };
        }
        const 半 = Math.max(38, Math.hypot(sx - tgt.x, sy - tgt.y));
        sx = tgt.x + Math.cos(c.扇.基 + ずれ) * 半;
        sy = tgt.y + Math.sin(c.扇.基 + ずれ) * 半;
      }
    }
    /* 噛み合っている味方が前をふさいでいるなら、擦り抜けずに脇を回る。

       隊どうしは擦り抜けるので、放っておくと後ろの隊が交戦中の味方を突き抜けて
       前の敵に当たる。かといって後ろで止めてしまうと戦が進まない――試しに
       止めたところ、退くべき十二隊が一つも退かなくなった（戦が決しないので、
       退く目にも遭わない）。味方の脇を回って寄せる。 */
    if (!MAP && !c.routed && !c.withdraw && !c.squads.some((q) => q.engaged)) {
      const 塞 = 前をふさぐ味方(alive, c, sx, sy);
      if (塞) {
        const bd = Math.hypot(塞.x - c.x, 塞.y - c.y) || 1;
        const ux = (塞.x - c.x) / bd, uy = (塞.y - c.y) / bd;
        let px = -uy, py = ux;                                  // ふさぐ味方への筋の直交
        if ((sx - 塞.x) * px + (sy - 塞.y) * py < 0) { px = -px; py = -py; }   // 寄せ先に近い側へ
        const 脇 = 110 * fieldScale();
        const wx = 塞.x + px * 脇, wy = 塞.y + py * 脇;
        c.wp = [{ x: wx, y: wy, r: 50 * fieldScale() }, { x: sx, y: sy, r: 40 * fieldScale() }];
        issueOrder(b, c, { order: "移動", tx: wx, ty: wy, keepPath: true });
        continue;
      }
    }
    /* 川ごしの向き合い方は、川の掟にまとめた（このファイルの上のほう）。
       受け手は渡り場のこちら岸で待ち、寄せ手は渡り切る。どちらも水の上では
       止まらない。狙う敵が水の中にいるなら、受け手は追って入らず岸から射る。 */
    const 渡る要 = !MAP && hasRiver() && 岸(tgt.x, tgt.y) !== 0 && 岸(c.x, c.y) !== 岸(tgt.x, tgt.y);
    const 掟 = 川の掟(b, c, sx, sy, tgt);
    sx = 掟.sx; sy = 掟.sy;
    if (掟.射る) { issueOrder(b, c, 岸から射る(c, tgt, sx, sy)); continue; }
    if (渡る要 && c.side === b.attacker) 橋待ちを見る(b, c, sx, sy);
    // 渡り場が固められているなら、知略のある将は淵を押し渡って回り込む
    if (渡る要 && 奇襲の渡河を計る(b, c, sx, sy)) continue;
    /* 睨み合いのまま日が暮れては、攻める側の負けである（GDD 8.1）。

       淵は決めてからでなければ踏み込まぬ掟にしたので、川を挟んだ両軍が互いに
       岸で待ち、そのまま日没を迎えることが起きた。実測では、四隊対四隊の野で
       「手が余って立ち尽くす」が五回から百十四回に増えた。

       待つのは受け手の権である。寄せ手は渡らねば何も始まらない。渡り場へ寄る
       道が引けぬまま長らく噛み合いも無いなら、そこで腹を決めて押し渡る。 */
    if (渡る要 && c.side === b.attacker && !c.押し渡る
      && !c.routed && !c.withdraw && !c.squads.some((q) => q.engaged)) {
      const 隔 = Math.hypot(sx - c.x, sy - c.y);
      /* この数は engine の「触れたまま槍を合わせぬ間」（c.睨み）とは別物である。

         同じ名で持っていたので、engine が毎刻 c.睨み を書き換え（攻めの下知で
         敵に触れていなければ零に戻す）、こちらの数は溜まる間もなく消えていた。
         つまり「渡り場を探しあぐねたら押し渡る」という腹の決めが、委ねた隊では
         一度も働いていなかった。川を挟んで日が暮れる戦の元である。別の名で持つ。 */
      if (c.川睨み前 != null && 隔 > c.川睨み前 - 30) c.川睨み = (c.川睨み || 0) + 0.6;
      else c.川睨み = 0;
      c.川睨み前 = 隔;
      if (c.川睨み > 45) {
        c.押し渡る = b.t + 150; c.川睨み = 0; c.wp = null;
        b.log.push({ t: b.t, text: `${c.gen.name}隊は渡り場を探しあぐね、淵を押し渡る。` });
      }
    } else if (!渡る要) { c.川睨み = 0; c.川睨み前 = null; }
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
  /* 控えと縛り（GDD 8.9）。

     本陣の旗本は下知があるまで桃配山に控える。南宮山の押さえは、山の去就が
     知れるまでその場を離れられない。采配は隊ごとに行き先を決めてから最後に
     ここへ来るので、決めた行き先をここで消す――先に消しては、後の段で
     また前へ出る行き先を書かれてしまう（測ったら四千歩も進んでいた）。 */
  for (const c of alive) {
    if (!c.控え && !c.縛り && !c.不戦) { c.据え置き = null; continue; }
    /* 据え置きの所を覚える。行き先を「いまの居どころ」に置き直していると、
       押し合いの遊び（四十歩）が毎回いまの位置から数え直されるので、
       押されるたびに的ごと前へずれる。実測で、動かぬはずの押さえが
       五百五十三歩も流れていた。動かぬ隊は、初めの持ち場に縛る。 */
    if (!c.据え置き) c.据え置き = { x: c.x, y: c.y };
    c.order = "待機"; c.tx = c.据え置き.x; c.ty = c.据え置き.y; c.wp = null;
    c.faceTo = null; c.chargeT = 0;
  }
  setAiIssuing(false);
}

