import { nodeById } from "./paths.js";
import { rosterCut } from "./roster.js";
import { atPeace } from "./state.js";
import { clamp } from "./util.js";
import { TOWNS } from "../data/castles.js";
import { ROADS } from "../data/roads.js";
import { COAST, px, py } from "../data/geo.js";
import { 船の割り, 鉄甲 } from "../data/ships.js";

/* ------------------------------------------------------ 海戦（GDD 10章）
   海を渡る軍は、渡りきるまで岸に足をつけられぬ。
   水軍を持つ側が海路を扼せば、船ごと沈められる。
   船戦は陸戦と別物で、兵の数より船と水主の技量がものを言う。 */
export const SEA_UNIT = { name: "船手", per: 60 };        // 一艘あたりの乗り手

/* 海に面した城かどうか（GDD 10章）。

   はじめは海岸線からの近さだけで判じていた。ところが盤の海岸線は粗い。
   測ってみると、内陸の稲葉山城が十一・七で「海に面する」に入り、
   伊予の湯築城が十三・三で外れていた。大内十一城はすべて外れ、河野三城も
   すべて外れる。瀬戸内と九州の家に船が一艘も無いことになっていた。

   拠りどころを二つにする。第一は海路である。その城から船の道が引かれているなら、
   湊があるということであって、それ以上の詮索は要らない。
   第二は従来どおり岸からの近さで、海路の引かれていない小さな浦を拾う。 */
export const COASTAL = new Map();
const 海路の城 = new Set();
for (const r of ROADS) if (r[3] === "海路") { 海路の城.add(r[0]); 海路の城.add(r[1]); }

export function isCoastal(c) {
  if (COASTAL.has(c.id)) return COASTAL.get(c.id);
  if (海路の城.has(c.id)) { COASTAL.set(c.id, true); return true; }
  // 海岸線の点は粗いので、線分への距離で測る
  let near = 1e9;
  for (const seg of COAST) {
    for (let i = 1; i < seg.length; i++) {
      const [x1, y1] = seg[i - 1], [x2, y2] = seg[i];
      const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
      const t = L2 ? clamp(((c.x - x1) * dx + (c.y - y1) * dy) / L2, 0, 1) : 0;
      const d = Math.hypot(x1 + dx * t - c.x, y1 + dy * t - c.y);
      if (d < near) near = d;
    }
    if (near < 9) break;
  }
  /* 岸からどれだけ近ければ湊と見るか。盤の海岸線は粗いので、十三では
     尾張の那古野（十七・〇）や伊予の湯築（十三・三）が外れてしまう。
     海路を第一の拠りどころにしたうえで、ここは十八まで緩める。 */
  const ok = near < 18;
  COASTAL.set(c.id, ok);
  return ok;
}


/* 湊や水軍衆は、いまどの家に付いているか。

   これまでは s.specials[t.id].owner を見ていた。ところが盤の記録に owner という
   欄はない。誼を通じた家は st.faction に書かれる（commands.js の doSpecial）。
   つまり、この判じは常に偽であった。湊の験も、水軍衆の験も、一度も効いていない。
   海に面した城の商いから出る僅かな船だけで海の力を測っていたことになる。

   誼を通じた家があればその家。なければ、もとからの持ち主（t.owner）に付く。
   その家が滅んでいれば、誰のものでもない。 */
export function 湊の主(s, t) {
  const st = s.specials[t.id];
  if (st && st.faction && st.state && st.state !== "中立") return st.faction;
  if (t.owner && (s.castles || []).some((c) => c.faction === t.owner)) return t.owner;
  return null;
}

// その勢力が持つ水軍の力。水軍衆を従えていれば大きい。
export function navalPower(s, fid) {
  let ships = 0, skill = 55;
  // 海に面した城でなければ船は出せぬ。山国に水軍はない。
  for (const c of s.castles.filter((x) => x.faction === fid)) {
    if (!isCoastal(c)) continue;
    const port = (TOWNS || []).some((t) => (t.kind === "港" || t.kind === "水軍衆")
      && 湊の主(s, t) === fid && Math.hypot(px(t.lon) - c.x, py(t.lat) - c.y) < 90);
    ships += Math.round((c.comm / 100) * (port ? 22 : 6));
  }
  // 水軍衆を抱えていれば技量が上がる
  for (const t of TOWNS || []) {
    if (t.kind !== "水軍衆") continue;
    if (湊の主(s, t) !== fid) continue;
    const st = s.specials[t.id] || {};
    // 進んで船を出させているなら大きい。もとからの縁だけなら、その半ばほど。
    const 厚 = st.state === "支援" ? 1 : st.state === "保護" ? 0.55 : 0.4;
    ships += Math.round(22 * 厚);
    skill += Math.round(22 * 厚);
  }
  // 造ってある鉄甲船（家の宝である。数は家に控えてある）
  const 鉄数 = Math.min(鉄甲.限り, Math.round((s.factions[fid] || {}).鉄甲船 || 0));
  return { ships: Math.max(2, ships) + 鉄数, skill: clamp(skill, 30, 100), tekko: 鉄数 };
}

/* ------------------------------------------------ 渡海の船立て（GDD 10章）

   船を持たぬ家が有利になっていた。水軍が三艘に満たなければ迎え撃たれず、
   そのまま渡って陸で戦えたからである。船が無いほうが得をするのでは、
   仕組みとして逆さまである。

   実際には、どの家も海を渡るときは船を出す。軍船が足りなければ、浦の漁船を
   徴し、材木を組み、とにかく浮くものへ兵を乗せて渡った。
   だから船戦は必ず起きる。ただし、その中身が違う。

     軍船（安宅・関船）… 水軍を抱える家だけが持つ。矢倉を上げ、矢玉を積む
     徴した小舟        … どの家でも出せる。漕ぐのは兵であって水主ではない

   船の数は兵の数でも決まる。六千の兵を渡すには百艘余りが要る。
   軍は海の上でも戦うのだから、渡海の船立てがそのまま船団になる。 */

export const 一艘の乗り = 55;          // 一艘あたり、およそ何人渡せるか
export const 船の限り = 90;            // 盤に並べられる艘数の上限
export const 徴した船の技量 = 34;      // 漕ぐのが兵では、水主の技量は望めない

// 船の格。海の戦は数ではなく、船の格と水主の技量で決まる。
export const 船の格 = { tekko: 9.0, atake: 3.2, seki: 1.6, kobaya: 0.6 };

// 船立ての戦力。艘数をそのまま比べては、徴した小舟が軍船と同じ重みになる。
export function 船立ての力(立) {
  if (!立) return 0;
  const n = 立.内訳 || {};
  const 戦 = (n.tekko || 0) * 船の格.tekko + (n.atake || 0) * 船の格.atake + (n.seki || 0) * 船の格.seki + (n.kobaya || 0) * 船の格.kobaya;
  return 戦 * (0.55 + (立.skill || 50) / 140);
}

/* 軍船に足りぬぶんを、徴した小舟で埋める。 */
function 立てる(np, 艘, 上限) {
  const 要 = clamp(Math.round(艘), 4, 上限 || 船の限り);
  /* 鉄甲船は船の割りの外にある（GDD 10.5）。
     割りで湧いてくるものではなく、金と歳月をかけて造ったものであるから、
     持っていれば必ず出す。六艘までしかない。 */
  const 鉄 = Math.max(0, Math.min(np.tekko || 0, 鉄甲.限り, 要));
  const 残 = Math.max(0, 要 - 鉄);
  const 軍 = Math.min(Math.max(0, Math.round(np.ships) - 鉄), 残);
  const 雑 = Math.max(0, 残 - 軍);
  const w = 船の割り(np.skill);
  const 和 = w.atake + w.seki + w.kobaya;
  const n = { tekko: 鉄, atake: Math.round(軍 * w.atake / 和), seki: Math.round(軍 * w.seki / 和), kobaya: 0 };
  n.kobaya = Math.max(0, 軍 - n.atake - n.seki) + 雑;
  const skill = Math.round((np.skill * (軍 + 鉄) + 徴した船の技量 * 雑) / Math.max(1, 要));
  /* 軍船だけの力も持たせる。

     海を握っているかどうかは、軍船で測らねばならない。
     徴した漁船を数に入れると、兵を多く積んだ側がそれだけで海を握ったことに
     なってしまう。実際そうなっていた。小早川が漁船五十七艘を連れて渡ると、
     軍船九艘の河野が湊から出てこない、という始末である。
     漁船は兵を運ぶものであって、海を制するものではない。 */
  const 軍力 = (n.tekko * 船の格.tekko + n.atake * 船の格.atake + n.seki * 船の格.seki
    + Math.max(0, n.kobaya - 雑) * 船の格.kobaya) * (0.55 + np.skill / 140);
  return { 内訳: n, ships: 要, 艘: 要, skill: clamp(skill, 30, 100),
    軍船: 軍 + 鉄, 鉄甲: 鉄, 徴船: 雑, 軍力 };
}

// 渡る側。兵を乗せるだけの船が要る。
export function 渡海の船立て(s, fid, men) {
  return 立てる(navalPower(s, fid), Math.ceil(Math.max(600, men || 0) / 一艘の乗り));
}

/* 迎え撃つ側。自らの海であるから、軍船に加えて浦の漁船も出てくる。
   兵を渡すわけではないので、数は軍船と浦の人手で決まる。 */
export function 迎え撃つ船立て(s, fid, 城) {
  const np = navalPower(s, fid);
  const 浦 = 城 ? Math.round((城.local || 0) / 320) : 0;
  return 立てる(np, np.ships + 浦);
}

/* 海路を渡る軍が迎え撃たれるか（GDD 10章）。

   はじめは「その海域に船を出せる家のうち、もっとも水軍の強い家が迎え撃つ」と
   していた。そのため、小早川が三原から川之江の河野を攻めるのに、関わりのない
   三好の水軍が出てきた。第三者が割って入るのでは、誰と戦っているのか
   分からなくなる。船戦は、渡る側と、渡られる側のあいだで起きる。

   そして、海を握られている限り、渡れば必ず阻まれる。
   握っているのはこちらだ、というときだけ、船は出てこない。 */
export function seaInterception(s, army, roadKind) {
  if (roadKind !== "海路") return null;
  const 的 = (s.castles || []).find((c) => c.id === army.target);
  const 守 = 的 ? 的.faction : null;
  if (!守 || 守 === army.faction) return null;
  if (atPeace(s, army.faction, 守)) return null;

  // その航路のそばに湊がなければ、そこまで船を出せない
  const A = nodeById(army.path[0]), B = nodeById(army.path[1]);
  if (!A || !B) return null;
  const nearRoute = (c) => {
    const dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy;
    const t = L2 ? clamp(((c.x - A.x) * dx + (c.y - A.y) * dy) / L2, 0, 1) : 0;
    return Math.hypot(A.x + dx * t - c.x, A.y + dy * t - c.y);
  };
  if (!s.castles.some((c) => c.faction === 守 && isCoastal(c) && nearRoute(c) < 120)) return null;

  const mine = 渡海の船立て(s, army.faction, army.men);
  const foe = 迎え撃つ船立て(s, 守, 的);
  /* 攻める側が海を握っているなら、迎え撃つ船は出てこない。
     船を並べても打ち払われるだけであって、湊に留めておくほうが理に適う。

     ここは軍船だけで測る。徴した漁船は兵を運ぶものであって、海を制しない。 */
  if (foe.軍力 < mine.軍力 * 0.42) return null;
  return { by: 守, foe, mine, 我: 船立ての力(mine), 彼: 船立ての力(foe) };
}

export function resolveSeaBattle(s, army, inter) {
  /* 盤の外で解くときの帰趨。船の格と水主の技量で測る（船立ての力）。
     艘数をそのまま比べては、徴した小舟が軍船と同じ重みになってしまう。 */
  const av = Math.sqrt(船立ての力(inter.mine)) * (0.72 + Math.random() * 0.56);
  const dv = Math.sqrt(船立ての力(inter.foe)) * (0.72 + Math.random() * 0.56);
  const win = av > dv;
  const r = Math.min(av, dv) / Math.max(av, dv);
  // 負ければ大きく沈む。海の上に退き場はない。
  const lost = Math.round(army.men * (win ? 0.04 + r * 0.05 : 0.16 + r * 0.16));
  army.men = Math.max(0, army.men - lost);
  army.local = Math.max(0, army.local - lost);
  if (army.rost) rosterCut(army.rost, lost);
  return { win, lost, foeName: s.factions[inter.by].name };
}


/* ------------------------------------------------ 鉄甲船を造る（GDD 10.5）

   天正六年（一五七八）、九鬼嘉隆が伊勢で六艘を造った。舷に鉄を張った大船で、
   焙烙も火矢も通らなかったと伝わる。木津川口で毛利の船を退けたのはこの船である。

   誰にでも造れるものではない。海に面した城で、湊か水軍衆を抱えていること。
   金と歳月がかかる（普請を積み重ねる）。そして六艘より多くは造れない。 */
export function 鉄甲船を造れるか(s, c) {
  if (!c) return { ok: false, why: "" };
  const f = s.factions[c.faction];
  if (!f) return { ok: false, why: "" };
  if (s.year < 鉄甲.始まりの年) {
    return { ok: false, why: `鉄を張った船を思いつく者はまだいない（${鉄甲.始まりの年}年より）` };
  }
  if ((f.鉄甲船 || 0) >= 鉄甲.限り) return { ok: false, why: `鉄甲船は${鉄甲.限り}艘が限りである` };
  if (!isCoastal(c)) return { ok: false, why: "海に面した城でなければ船は造れない" };
  const 湊 = (TOWNS || []).some((t) => (t.kind === "港" || t.kind === "水軍衆")
    && 湊の主(s, t) === c.faction && Math.hypot(px(t.lon) - c.x, py(t.lat) - c.y) < 90);
  if (!湊) return { ok: false, why: "湊か水軍衆を抱えていなければ、これほどの船は造れない" };
  if (f.gold < 鉄甲.手間) return { ok: false, why: `${鉄甲.手間}貫が要る` };
  return { ok: true, why: "" };
}

// 造船の下知ひとたび。政務の高い者ほど早く進む。積み上がれば一艘できあがる。
export function 鉄甲船の普請(s, c, gen) {
  const 可 = 鉄甲船を造れるか(s, c);
  if (!可.ok) return { ok: false, why: 可.why };
  const f = s.factions[c.faction];
  f.gold -= 鉄甲.手間;
  const 進 = Math.round(18 + (gen ? gen.gov : 60) / 5);
  const 前 = Math.round(f.鉄甲普請 || 0);
  f.鉄甲普請 = 前 + 進;
  let 成 = false;
  if (f.鉄甲普請 >= 鉄甲.普請) {
    f.鉄甲普請 -= 鉄甲.普請;
    f.鉄甲船 = (f.鉄甲船 || 0) + 1;
    成 = true;
  }
  return { ok: true, 進, 前, 後: Math.round(f.鉄甲普請), 成, 数: f.鉄甲船 || 0 };
}
