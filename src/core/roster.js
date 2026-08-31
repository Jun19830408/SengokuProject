import { ARMS } from "../data/roads.js";

/* ------------------------------------------------------- 組の名簿（GDD 6.2）
   武将の直属も地域家臣団も、五十人組の名簿として持つ。
   合戦の損害はこの名簿に書き戻され、補充されない限り欠けたまま次の戦へ持ち越す。 */
export let ROSTER_SEQ = 0;

/* 五十人組の名簿を作る。

   mix を渡せば、その兵科の割り（一割きざみの百分率）で組を立てる。
   渡さなければ、これまで通り ARMS の定めの割りになる。
   隊の強さは兵科で変わる（騎馬は槍より白兵に強く、弓鉄砲は遠くへ届く）ので、
   割りを変えれば、そのまま盤の上の駒の形も戦い方も変わる。 */
export function 兵科の割り(mix) {
  if (!mix) return ARMS;
  const 和 = ARMS.reduce((a, x) => a + Math.max(0, mix[x.key] || 0), 0);
  if (和 <= 0) return ARMS;
  return ARMS.map((x) => ({ ...x, ratio: Math.max(0, mix[x.key] || 0) / 和 }));
}

/* 城の蓄えで、その兵科をどこまで立てられるか（GDD 6.3）。

   槍と弓は村々の百姓が自前で携えて出るので、いくらでも立つ。
   騎馬は馬が、鉄砲は鉄砲がなければ立たない。
   割りをそのまま呑めぬときは、足りぬぶんを槍に振り替える。 */
export function 蓄えに合わせる(mix, 人数, 蓄え) {
  const m = { yari: 0, yumi: 0, teppo: 0, kiba: 0, ...(mix || {}) };
  const 和 = ["yari", "yumi", "teppo", "kiba"].reduce((a, k) => a + Math.max(0, m[k]), 0) || 1;
  const 人 = (k) => Math.round(人数 * Math.max(0, m[k]) / 和);
  const 馬 = Math.max(0, Math.floor((蓄え && 蓄え.horse) || 0));
  const 砲 = Math.max(0, Math.floor((蓄え && 蓄え.gun) || 0));
  const 騎 = Math.min(人("kiba"), 馬);
  const 鉄 = Math.min(人("teppo"), 砲);
  const 弓 = 人("yumi");
  const 槍 = Math.max(0, 人数 - 騎 - 鉄 - 弓);      // 足りぬぶんは槍が埋める
  return { yari: 槍, yumi: 弓, teppo: 鉄, kiba: 騎,
    足りぬ馬: Math.max(0, 人("kiba") - 騎), 足りぬ鉄砲: Math.max(0, 人("teppo") - 鉄) };
}

// 名簿に含まれる兵科ごとの人数
export function rosterArms(rost) {
  const out = { yari: 0, yumi: 0, teppo: 0, kiba: 0 };
  for (const q of rost || []) if (out[q.t] != null) out[q.t] += q.m;
  return out;
}

export function newRoster(total, tag, mix) {
  const r = [];
  for (const a of 兵科の割り(mix)) {
    let men = Math.round(total * a.ratio);
    while (men > 0) {
      const m = Math.min(50, men);
      r.push({ id: `${tag}-${++ROSTER_SEQ}`, t: a.key, m, max: 50 });
      men -= m;
    }
  }
  return r;
}

export const rosterSum = (r) => (r || []).reduce((a, q) => a + q.m, 0);

/* 兵を足す。まず欠けた組を埋め、それでも余れば新しい組を立てる。

   埋める順は、手柄の重い組からである。

   もとは名簿の並び順に埋めていた。これでは、幾度も戦って十人まで擦り減った
   古参の組が、いつまでも十人のままということが起きる。次の戦で消えれば、
   長も死ぬ。名を挙げた者ほど死にやすい、という逆さまなことになっていた。

   兵を減らすときは手柄の無い組から削っている（rosterCut）。足すときも同じ
   理屈で、手柄の重い組から埋めるのが筋である。国許で兵を集めれば、まず
   名の知られた組頭の下へ配される――そういう順になる。

   手柄が同じなら、欠けの大きい組を先に埋める。潰れかけた組から手当てする。 */
export function rosterAdd(r, n, tag) {
  if (!r || n <= 0) return r || [];
  let left = Math.round(n);
  // 手柄の重い順、同じなら人数の少ない順（潰れかけた古参が先）
  const 順 = [...r].sort((a, b) => (b.功 || 0) - (a.功 || 0) || a.m - b.m);
  for (const a of ARMS) {
    const want = Math.round(n * a.ratio);
    let give = want;
    for (const q of 順) {
      if (give <= 0) break;
      if (q.t !== a.key || q.m >= q.max) continue;
      const add = Math.min(q.max - q.m, give);
      q.m += add; give -= add; left -= add;
    }
    while (give > 0) {
      const m = Math.min(50, give);
      r.push({ id: `${tag}-${++ROSTER_SEQ}`, t: a.key, m, max: 50 });
      give -= m; left -= m;
    }
  }
  if (left > 0) for (const q of 順) { if (left <= 0) break; const add = Math.min(q.max - q.m, left); q.m += add; left -= add; }
  return r;
}

// 兵を減らす。人数の少ない組から消していく。
export function rosterCut(r, n) {
  let left = Math.round(n);
  // 手柄の無い組から先に削る。名の知られた長を、帳面の都合で消さない。
  const order = [...r].sort((a, b) => (a.功 || 0) - (b.功 || 0) || a.m - b.m);
  for (const q of order) {
    if (left <= 0) break;
    const take = Math.min(q.m, left);
    q.m -= take; left -= take;
  }
  return r.filter((q) => q.m > 0);
}

// 名簿から n 人ぶんを切り分けて持ち出す（出陣・寄騎）
export function rosterTake(src, n) {
  const out = [];
  let left = Math.round(n);
  /* 手柄のある組から順に連れて行く（GDD 6.2）。

     名の知られた長は、その武将が兵を出すたびに出陣する。留守居に回されて
     いては、二度と手柄を重ねられない。手柄の同じ組どうしでは、充実した
     組を先とする。

     組を割って連れ出すときは、長も出陣する（手柄は連れ出したほうへ移す）。
     もっとも、手柄のある組は先に丸ごと連れ出されるので、割れるのは
     たいてい手柄のない組である。 */
  const order = [...src].sort((a, b) => (b.功 || 0) - (a.功 || 0) || b.m - a.m);
  for (const q of order) {
    if (left <= 0) break;
    if (q.m <= left) { out.push({ id: q.id, t: q.t, m: q.m, max: q.max, 功: q.功 }); left -= q.m; q.m = 0; }
    else {
      out.push({ id: q.id + "b", t: q.t, m: left, max: q.max, 功: q.功 });
      q.m -= left; left = 0; q.功 = 0;
    }
  }
  const rest = src.filter((q) => q.m > 0);
  return { taken: out, rest };
}

// 名簿を保つ。総数と食い違っていれば辻褄を合わせる。
export function rosterSync(holder, key, total, tag) {
  if (!holder[key] || !holder[key].length) holder[key] = newRoster(Math.max(0, total), tag);
  const d = Math.round(total) - rosterSum(holder[key]);
  if (d > 0) rosterAdd(holder[key], d, tag);
  else if (d < 0) holder[key] = rosterCut(holder[key], -d);
  return holder[key];
}

/* ------------------------------------------------ 駒の長（GDD 6.2）

   盤の駒は五十人組であり、名簿の一組と一対一である（corps.js が組の id を
   駒の src に持たせている）。ならば組ひとつに長がひとり居る、と見てよい。

   長の名は、組の id から起こす。控えに文字を持たなくてよいし、同じ組なら
   何度数えても同じ名が出る。補充されても組の id は変わらないので、長は
   生き続けて部下だけが入れ替わる。組が名簿から消えれば、長も死ぬ。

   出陣で組の一部を連れ出すと、連れ出したぶんの id に「b」が付く
   （rosterTake）。末尾の b を落として、元の長の手柄に帰す。 */
export const 組の鍵 = (id) => String(id || "").replace(/b+$/, "");

/* 通称の材料。名も無き足軽の呼び名であるから、姓は持たない。
   十二×十二×六で八百六十四通り。天下の組が一万四千あっても、
   同じ名が居ることはあるが、一つの家の中ではまず重ならない。 */
const 頭 = ["与", "藤", "弥", "喜", "孫", "彦", "源", "太", "半", "新", "又", "小",
  "甚", "伝", "勘", "作", "市", "角", "喜", "宗"];
const 尾 = ["三郎", "七郎", "九郎", "十郎", "兵衛", "太夫", "助", "作", "市", "蔵",
  "介", "八", "右衛門", "左衛門", "次郎", "五郎", "六郎", "四郎"];
const 冠 = ["", "", "", "", "権", "左", "右", "小", "大", "上"];   // 権三郎・左七郎の類

/* 組の id から、その長の通称を起こす。字を控えずに済ませるための決め打ちである。

   代を添えるのは、長が武将に取り立てられて組を離れたときのためである。
   組はそのまま残り、次の者が長に立つ。代を進めなければ、同じ名の者が
   もう一度そこに現れることになる。 */
export function 長の名(id, 代) {
  const k = 組の鍵(id) + (代 ? `#${代}` : "");
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return 冠[(h >>> 20) % 冠.length] + 頭[h % 頭.length] + 尾[(h >>> 8) % 尾.length];
}

// 物頭に届いた組（武将に取り立てられる者）を探す
export const 物頭の要 = () => 階の段[階の段.length - 1].要;
export function 取り立てるべき組(rost) {
  let 出 = null;
  for (const q of rost || []) {
    if ((q.功 || 0) < 階の段[階の段.length - 1].要) continue;
    if (!出 || q.功 > 出.功) 出 = q;
  }
  return 出;
}

/* 階（GDD 6.4）。勲功で位が上がる。

   十人長・五十人長といっても、盤の駒はつねに五十人組である。人数そのもの
   ではなく、位の名と受け取るのがよい。物頭に届いた者は、武将に取り立てる
   資格を得る（house.js の makePromotion がここを見る）。 */
export const 階の段 = [
  { 名: "十人長", 要: 0 }, { 名: "五十人長", 要: 5 }, { 名: "百人長", 要: 15 },
  { 名: "三百人長", 要: 35 }, { 名: "物頭", 要: 60 },
];
export const 長の階 = (勲) => {
  let out = 階の段[0];
  for (const x of 階の段) if ((勲 || 0) >= x.要) out = x;
  return out.名;
};

/* 戦のあと、いちばん働いた組頭を戦国記に残す（GDD 6.2）。

   遊ぶ側には盤の上の一人ひとりの働きは見えない。だが数字は動いている。
   その日いちばん討ち取った組の長を、名を挙げて記す。

   討ち取った相手は、敵の組頭ではなく、敵の隊を率いた武将の名で書く。
   他家の組頭まで控えれば記録が膨らむし、そこまでは要らない。
   「福留親政の手勢の一隊を破った」で、誰と戦ったかは十分に伝わる。 */
export function 組頭の働きを記す(s, b, 我side, 場) {
  const 功 = b.武功 || {};
  if (!Object.keys(功).length) return;
  /* 組は武将の直属だけでなく、城の地域家臣団や出征中の軍にもある。
     討って出た兵の多くは城の名簿から出るので、そこを見ねば何も見つからない。 */
  const 我組 = [];
  const 拾 = (rost, 主) => { for (const q of rost || []) 我組.push({ q, 主 }); };
  for (const gen of s.generals) if (gen.faction === s.player) 拾(gen.rost, gen.name);
  for (const c of s.castles) if (c.faction === s.player) 拾(c.rost, `${c.name}の地の兵`);
  for (const a of s.armies || []) if (a.faction === s.player) 拾(a.rost, "出征の兵");
  let 頭 = null;
  for (const x of 我組) {
    const n = 功[組の鍵(x.q.id)];
    if (n && (!頭 || n > 頭.n)) 頭 = { n, ...x };
  }
  if (!頭 || 頭.n < 2) return;                        // 一駒では、まだ記すに足りない
  const 敵 = b.corps.filter((c) => c.side !== 我side && c.gen)
    .sort((a, c) => Object.values(c.loss || {}).reduce((x, y) => x + y, 0)
      - Object.values(a.loss || {}).reduce((x, y) => x + y, 0))[0];
  const 名 = 長の名(頭.q.id, 頭.q.代);
  const 階 = 長の階((頭.q.功 || 0) + 頭.n);
  s.chronicle.push({ y: s.year, m: s.month,
    text: `${場 ? `${場}下の戦で、` : ""}${頭.主}の${名}が`
      + `${敵 && 敵.gen ? `${敵.gen.name}の手勢の` : "敵の"}一隊を${頭.n}つまで破った。`
      + `${階 === "物頭" ? `${名}は物頭の勲功に達している。` : `いまは${階}である。`}` });
}

/* ここに置く理由。

   もとは画面（ui/panels.jsx）の中にあった。ところが画面の中にあるものは、
   実際に描いて字を拾わねば確かめられない。以前も同じことをして、戦国記の
   一行が正しいかを測れずにいた。測れる場所に置いてから書く。 */

/* 組頭の帳（GDD 6.2）。

   盤の駒は五十人組であり、名簿の一組と一対一である。組ひとつに長がひとり
   居て、敵の駒を討ち取るたびに手柄が積まれる。名は組の id から起こすので、
   補充されても同じ長のままであり、組が全滅すれば長も消える。

   載せるのは手柄を挙げた者だけである。一度も働いていない長まで並べては、
   帳面が数百行になって読めない。手柄を挙げた瞬間から、この帳に名が載る。

   勲功が物頭に届いた者は、武将に取り立てる資格を得る。 */
export function 組頭の帳(g) {
  const 出 = [];
  const 見 = (rost, 所, 属) => {
    for (const q of rost || []) {
      if (!q.功) continue;
      出.push({ 鍵: 組の鍵(q.id), 名: 長の名(q.id), 功: q.功, 階: 長の階(q.功), 兵: q.m, 所, 属 });
    }
  };
  /* 誰の下にいるかを添える。組は三つの居場所のいずれかにある。
       武将の名簿（gen.rost）　… その武将の直属である。武将の名を出す
       城の名簿（c.rost）　　　… 城付きの地域家臣団。誰の直属でもない
       軍の名簿（a.rost）　　　… 城から連れ出した地域家臣団。率いている将を出す
     どの武将の隊かが読めねば、手柄を立てた組頭を探しに行けない。 */
  for (const gen of g.generals) {
    if (gen.faction !== g.player || gen.captive) continue;
    const c = g.castles.find((x) => x.id === gen.at);
    見(gen.rost, c ? c.name : "出征中", gen.name);
  }
  for (const c of g.castles) {
    if (c.faction !== g.player) continue;
    見(c.rost, c.name, "地域家臣団");
  }
  for (const a of g.armies || []) {
    if (a.faction !== g.player) continue;
    // 軍の地域家臣団は、その軍を率いる将のもとにある
    const 将ら = (a.gens || []).map((id) => g.generals.find((x) => x.id === id)).filter(Boolean);
    const 大将 = 将ら.sort((x, y) => (y.lead || 0) - (x.lead || 0))[0];
    見(a.rost, "出征中", 大将 ? `${大将.name}の軍` : "地域家臣団");
  }
  /* 割って連れ出した組は鍵で束ねる（出陣で組を分けると id に b が付く）。
     居場所は、人数の多いほうを採る。半端な五人のほうを出しても仕方がない。 */
  const 束 = new Map();
  for (const x of 出) {
    const y = 束.get(x.鍵);
    if (y) {
      y.功 += x.功;
      if (x.兵 > y.兵) { y.所 = x.所; y.属 = x.属; }
      y.兵 += x.兵;
      y.階 = 長の階(y.功);
    } else 束.set(x.鍵, { ...x });
  }
  return [...束.values()].sort((a, b) => b.功 - a.功);
}
