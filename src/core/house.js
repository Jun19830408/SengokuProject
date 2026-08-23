import { HOUSE_RANK, fiefOf, fiefWanted, stipendOf } from "./rank.js";
import { newRoster } from "./roster.js";
import { clamp } from "./util.js";
import { KANJI_TSUJI, LONG_LIVED, NEWCOMERS, PARENT } from "../data/newcomers.js";
import { 直属の兵科 } from "../data/arms.js";

// その年に世に出る者を招く。仕えるべき家が滅んでいれば、代わりにその城の主へ仕える。
export function emergeGenerals(s) {
  const out = [];
  for (const n of NEWCOMERS) {
    if (s.year < n.y) continue;
    if (s.generals.some((x) => x.id === n.id)) continue;
    if ((s.emerged || []).includes(n.id)) continue;
    const home = s.castles.find((c) => c.id === n.at);
    if (!home) continue;
    // 元の家が城を失っていれば、いまその城を持つ家に仕える
    const fid = home.faction;
    const gen = {
      id: n.id, name: n.name, faction: fid, lead: n.lead, valor: n.valor, wit: n.wit, gov: n.gov,
      loyal: fid === n.faction ? 78 : 58, age: s.year - n.born, at: home.id,
      retinue: n.retinue, retTrain: n.retTrain,
      unity: clamp(n.retTrain + 8, 30, 100), merit: 0,
      fief: Math.round(fiefWanted(n) * 0.7),
      rost: newRoster(n.retinue, `ret-${n.id}`, 直属の兵科),
    };
    s.generals.push(gen);
    s.emerged = [...(s.emerged || []), n.id];
    out.push(`${gen.name}が${s.factions[fid].name}に仕えた（${home.name}）。`);
  }
  return out;
}


/* -------------------------------------------------- 名の伝わらぬ者
   在地の長や、記録に名の残らぬ者は、地名に「乙名」「按司」などを添えて示す。
   これらは実在の人名ではなく、その地の長を指す呼び名である。
   武将の欄では小さく「伝」と添えて、史実の人物と区別できるようにする。 */
export const NAMELESS = /乙名$|按司$|城代$|留守居$|番頭$|代官$/;

export const isNameless = (g) => !!g && NAMELESS.test(g.name || "");

/* 架空の人物か（GDD 6.7）。
   遊びの中で生まれた子は史実の人物ではない。id にも生年の印が残っている
   （親の id ＋ "_c" ＋ 年）ので、印の無い古い記録もここで拾える。 */
export const is架空 = (g) => !!g && (g.架空 === true || /_c\d{4}$/.test(g.id || ""));


/* ------------------------------------------- 家の滅亡と戦後の始末（GDD 12.4）
   すべての城を失えば、家は滅びる。
   残った当主と家臣の身の振り方は、勝った側が決める。 */
// 滅んだ家の者を集める。当主と家臣を分けて返す。
export function ruinedHouse(s, fid) {
  const all = s.generals.filter((x) => x.faction === fid && !x.captive);
  const lord = all.find((x) => x.lord) || null;
  return { lord, retainers: all.filter((x) => x !== lord) };
}

// 血縁か。姓の二字が同じなら血縁とみなす。
export const isKin = (a, b) => !!a && !!b && a.name.slice(0, 2) === b.name.slice(0, 2);

// 登用できるか。旧主と血を分けた者、旧主への忠誠が篤い者は靡かない。
export function canRecruit(gen, lord) {
  if (!gen) return { ok: false, why: "" };
  if (lord && isKin(gen, lord)) return { ok: false, why: `${lord.name}と血を分けた一門。旧主を捨てて仕えることはない` };
  const loy = gen.loyal == null ? 60 : gen.loyal;
  if (loy >= 95) return { ok: false, why: `旧主への忠誠${Math.floor(loy)}。二君に仕える気はないという` };
  return { ok: true, why: "" };
}

// 登用したときの、新しい主への忠誠。旧主に篤かった者ほど、新主には冷たい。
export function loyaltyAfterRecruit(gen) {
  const loy = gen.loyal == null ? 60 : gen.loyal;
  return clamp(Math.round(88 - loy * 0.62), 24, 78);
}

// 大名家の一門は、独立した家を持たない。家督は大名家のものとして継がれる。
export function isMainClan(s, gen) {
  if (!gen || gen.lord) return false;
  const lord = s.generals.find((x) => x.faction === gen.faction && x.lord && !x.captive);
  if (!lord) return false;
  return isClan(s, gen, lord);
}

export const hasHouse = (s, gen) => !!gen && !gen.lord && !isMainClan(s, gen)
  && (!!gen.house || stipendOf(s, gen) >= HOUSE_RANK);

// 家名。姓の二字をもって家とする。
export const houseName = (gen) => (gen ? gen.name.slice(0, 2) : "");

// 家を継ぐ者。実の子が先、なければ同姓の年少者。
export function heirOfHouse(s, gen) {
  const kids = s.generals.filter((x) => PARENT[x.id] === gen.id && !x.captive
    && x.faction === gen.faction);
  if (kids.length) return [...kids].sort((a, b) => (b.age || 0) - (a.age || 0))[0];
  const sur = houseName(gen);
  const kin = s.generals.filter((x) => x.id !== gen.id && !x.captive
    && x.faction === gen.faction && houseName(x) === sur && (x.age || 0) >= 12);
  if (kin.length) return [...kin].sort((a, b) => (b.age || 0) - (a.age || 0))[0];
  return null;
}

export function bearChild(s, gen) {
  const sur = houseName(gen);
  const k = Math.abs((gen.id + s.year).split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const t1 = KANJI_TSUJI[k % KANJI_TSUJI.length];
  const t2 = gen.name.slice(-1);                    // 父の名の一字を継ぐ
  const id = `${gen.id}_c${s.year}`;
  if (s.generals.some((x) => x.id === id)) return null;
  const mix = (a, b) => clamp(Math.round(a * 0.55 + b * 0.45 + (Math.random() * 22 - 11)), 30, 96);
  const kid = {
    id, name: `${sur}${t1}${t2}`, faction: gen.faction,
    lead: mix(gen.lead, 62), valor: mix(gen.valor, 62),
    wit: mix(gen.wit, 60), gov: mix(gen.gov, 60),
    loyal: clamp((gen.loyal == null ? 70 : gen.loyal) - 4, 0, 100),
    age: 1, at: gen.at, retinue: 60, retTrain: 55,
    unity: 60, merit: 0, fief: 200, rost: newRoster(60, `ret-${id}`),
    /* 遊びの中で生まれた子は、史実の人物ではない（GDD 6.7）。
       史実に子のある者には、その子が後年ここへ現れるので、重ねては生まれない。
       つまり、ここで生まれる者はみな架空である。
       武将の欄で〔架空〕と添え、史実の人物と混ぜないようにする。 */
    架空: true,
  };
  s.generals.push(kid);
  PARENT[id] = gen.id;
  return kid;
}

// 家督を継がせる。禄と身分が受け継がれる。
export function inheritHouse(s, dead) {
  if (!hasHouse(s, dead)) return null;
  const heir = heirOfHouse(s, dead);
  if (!heir) return null;
  heir.fief = Math.max(heir.fief || 0, Math.round(fiefOf(dead) * 0.85));   // 分割で目減りする
  heir.retinue += Math.round(dead.retinue * 0.6);
  heir.house = true;
  heir.at = dead.at;
  if (heir.loyal != null) heir.loyal = clamp(heir.loyal + 6, 0, 100);      // 恩を受けて忠は増す
  return heir;
}


/* ------------------------------------------------ 後見（GDD 6.6）
   幼き者が家督を継げば、家中の年長者が後見に立つ。
   後見は当主に代わって軍を率い、政を執り、他家とも交渉する。
   当主が元服の齢（十五）に達すれば、後見は解けて一家臣に戻る。 */
export const COMING_OF_AGE = 15;

export const needsGuardian = (gen) => !!gen && gen.lord && (gen.age || 30) < COMING_OF_AGE;

// 後見に立つべき者を選ぶ。血縁の年長者を先とし、なければ器量と禄高による。
export function pickGuardian(s, lord) {
  let kin = s.generals.filter((x) => x.faction === lord.faction && x.id !== lord.id
    && !x.captive && (x.age || 0) >= 25);
  if (!kin.length) kin = s.generals.filter((x) => x.faction === lord.faction && x.id !== lord.id
    && !x.captive && (x.age || 0) >= 18);
  if (!kin.length) return null;
  const scored = kin.map((x) => ({
    gen: x,
    clan: isClan(s, x, lord),
    able: x.lead + x.gov + x.wit + fiefOf(x) / 400,
  }));
  scored.sort((a, b) => (b.clan ? 1 : 0) - (a.clan ? 1 : 0) || b.able - a.able);
  return scored[0].gen;
}

// いま家を差配している者。当主が幼ければ後見。
export function actingHead(s, fid) {
  const lord = s.generals.find((x) => x.faction === fid && x.lord && !x.captive);
  if (!lord) return null;
  if (!needsGuardian(lord)) return lord;
  const g = s.generals.find((x) => x.id === lord.guardian && x.faction === fid && !x.captive);
  return g || lord;
}

export const isGuardian = (s, gen) => {
  if (!gen) return false;
  const lord = s.generals.find((x) => x.faction === gen.faction && x.lord && !x.captive);
  return !!lord && needsGuardian(lord) && lord.guardian === gen.id;
};


// 一門か。親子・兄弟・祖孫のいずれかであれば一門とする。
export function isClan(s, a, b) {
  if (!a || !b) return false;
  if (a.id === b.id) return true;
  const up = (g, n) => { let x = g; for (let i = 0; i < n && x; i++) x = s.generals.find((y) => y.id === PARENT[x.id]); return x; };
  for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) {
    const p = up(a, i), q = up(b, j);
    if (p && q && p.id === q.id) return true;
  }
  return a.name.slice(0, 2) === b.name.slice(0, 2);
}

// 子を返す（存命の者のみ）
export const childrenOf = (s, gen) => s.generals.filter((x) => PARENT[x.id] === gen.id && !x.captive);


/* ------------------------------------------------ 寿命（GDD 6.1）
   人の齢は八十を常の限りとする。
   史実でそれを超えて生きた者だけは、その齢まで生きる。 */
export const LIFE_CAP = 80;

export const lifeSpan = (g) => (g && LONG_LIVED[g.id]) || LIFE_CAP;


/* ------------------------------------------------ 家督（GDD 6.3）
   人は老い、家は代を重ねる。当主が没すれば、誰かが跡を継がねばならぬ。
   血筋を継ぐ者があれば、それが継ぐ。なければ、器量の勝る者が立つ。 */
// 跡目の候補。血筋の者と、器量の勝る者を並べる。
export function heirCandidates(s, dead) {
  const kin = s.generals.filter((x) => x.faction === dead.faction && x.id !== dead.id && !x.captive);
  if (!kin.length) return [];
  const sur = dead.name.slice(0, 2);
  const kids = childrenOf(s, dead).map((x) => x.id);
  const scored = kin.map((x) => ({
    gen: x,
    child: kids.includes(x.id),                     // 実の子
    blood: kids.includes(x.id) || isClan(s, x, dead),
    able: x.lead + x.gov + x.wit,
  }));
  // 血筋の成人、血筋の幼年、そのほかの器量者、の順に並べる
  scored.sort((a, b) => {
    // 実の子が最も強い。次に一門、そして成人であること。
    const ra = (a.child ? 4 : 0) + (a.blood ? 2 : 0) + (a.gen.age >= 15 ? 1 : 0);
    const rb = (b.child ? 4 : 0) + (b.blood ? 2 : 0) + (b.gen.age >= 15 ? 1 : 0);
    if (ra !== rb) return rb - ra;
    // 実の子どうしなら年長から。家督は長子が継ぐのが常道である。
    if (a.child && b.child) return b.gen.age - a.gen.age;
    if (a.blood && b.blood) return b.gen.age - a.gen.age;
    return b.able - a.able;
  });
  return scored.slice(0, 6);
}

// 跡を継ぐ者を選ぶ。同じ姓の若い者を先とし、なければ器量による。
export function pickHeir(s, dead) {
  const kin = s.generals.filter((x) => x.faction === dead.faction && x.id !== dead.id && !x.captive);
  if (!kin.length) return null;
  const sur = dead.name.slice(0, 2);
  // 同じ姓の者。年長から選ぶが、幼すぎる者は避ける。
  const blood = kin.filter((x) => x.name.startsWith(sur) && x.age >= 8)
    .sort((a, b) => (b.age >= 15 ? 1 : 0) - (a.age >= 15 ? 1 : 0) || a.age - b.age);
  if (blood.length) return blood[0];
  return [...kin].sort((a, b) => (b.lead + b.gov + b.wit) - (a.lead + a.gov + a.wit))[0];
}

// 家督を継がせる。家中の忠誠は揺れる。
// heirId を渡せばその者が継ぐ。retire なら先代は家臣として残る。
export function succeed(s, dead, cause, heirId, retire) {
  const heir = heirId
    ? s.generals.find((x) => x.id === heirId && x.faction === dead.faction && !x.captive) || pickHeir(s, dead)
    : pickHeir(s, dead);
  const fname = s.factions[dead.faction] ? s.factions[dead.faction].name : "家";
  if (!heir) {
    s.chronicle.push({ y: s.year, m: s.month, text: `${dead.name}が${cause}。${fname}は跡を継ぐ者なく絶えた。` });
    return null;
  }
  heir.lord = true;
  heir.retinue += Math.round(dead.retinue * (retire ? 0.45 : 0.6));
  const blood = heir.name.startsWith(dead.name.slice(0, 2));
  // 血筋でない者が立てば家中は揺れる。若すぎても侮られる。
  // 先代が存命で後見に立てば、家中は落ち着く。
  for (const x of s.generals.filter((q) => q.faction === dead.faction && q.id !== heir.id && !q.captive)) {
    let d = blood ? -2 : -9;
    if (heir.age < 16) d -= 5;
    if (retire) d = Math.round(d * 0.25) + 1;      // 隠居であれば揺れは小さい
    if (x.loyal != null) x.loyal = clamp(x.loyal + d, 0, 100);
  }
  /* 家の名（GDD 6.3 / 12.4）。

     血の絶えた家を、姓の違う者が継ぐことがある。六角の家督が松永久秀に移り、
     それでも盤の上は「六角家」のままであった。当主が松永で家が六角、というのは
     名としておかしい。継いだ者の姓に改める。

     一門が継いだのなら姓は変わらないので、名もそのままである。
     家名に「守」「介」などの官名が入る家（織田大和守家）も、継ぐ者が同じ姓なら
     触らない。姓ごと変わったときだけ、新しい姓に「家」を付けて立て直す。 */
  const f = s.factions[dead.faction];
  let 改名 = null;
  if (f && !blood) {
    const 新姓 = houseName(heir);
    const 旧姓 = houseName(dead);
    if (新姓 && 旧姓 && 新姓 !== 旧姓 && !f.name.startsWith(新姓)) {
      改名 = { 前: f.name, 後: `${新姓}家` };
      f.name = 改名.後;
      f.改名 = [...(f.改名 || []), { y: s.year, m: s.month, 前: 改名.前, 後: 改名.後, 継: heir.name }];
    }
  }
  const 継いだ = retire
    ? `${dead.name}は家督を${heir.name}に譲って隠居した。${dead.name}は後見として家に残る。`
    : `${dead.name}が${cause}。${heir.name}が${fname}の家督を継いだ${heir.age < 16 ? "（幼年のため家中に不穏がある）" : ""}。`;
  s.chronicle.push({ y: s.year, m: s.month, text: 継いだ });
  if (改名) {
    s.chronicle.push({ y: s.year, m: s.month,
      text: `${改名.前}は${heir.name}が継ぎ、以後${改名.後}と称する。` });
  }
  /* 代替わりは家の大事である。月送りの報せに必ず立てる。
     これまでは戦国記に一行残るだけで、自家の当主が替わっても気づかぬことがあった。 */
  s.代替わり = [...(s.代替わり || []), {
    faction: dead.faction, 先代: dead.name, 当主: heir.name, cause, retire: !!retire,
    blood, age: heir.age, 改名, y: s.year, m: s.month,
  }];
  return heir;
}


/* ---------------------------------------------------------- 偏諱による命名 */
export const SURNAMES = ["林", "佐脇", "岩室", "山口", "中野", "塙", "河尻", "毛利", "蜂屋", "生駒", "梁田", "赤川"];

export const COMMON = ["源三", "又八", "小六", "藤七", "彦九郎", "孫市", "五郎左", "半助", "新七"];

export const CHARS = ["勝", "貞", "秀", "忠", "政", "盛", "通", "直", "綱", "元", "泰", "房", "重", "光", "定"];

export const FEATS = ["橋際で崩れかけた隊列を立て直し、敵の渡河を阻んだ。", "森の伏兵をいち早く見つけ、味方の側面を救った。", "退き口を開き、殿を務めて主将を逃がした。"];


/* 戦功による取り立て（GDD 6.7）。
   名も無き者が手柄を立て、主から偏諱の一字を賜って武将に列する。
   opts で仕える先を渡すと、名を選んだあとに実際の武将として召し抱えられる。 */
export function makePromotion(lord, allGens, opts = {}) {
  const sur = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const common = COMMON[Math.floor(Math.random() * COMMON.length)];
  const given = lord.name.slice(2);
  const henki = given[Math.floor(Math.random() * given.length)] || "長";
  const used = new Set(allGens.map((x) => x.name));
  const cands = [];
  let guard = 0;
  while (cands.length < 4 && guard++ < 60) {
    const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
    for (const n of [`${sur}${henki}${ch}`, `${sur}${ch}${henki}`]) if (!used.has(n) && !cands.includes(n)) cands.push(n);
  }
  if (!cands.length) cands.push(`${sur}${henki}勝`);
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  /* 取り立てられた者の器量。名の知られた武将には及ばぬが、戦場で立った者である。
     門を守り抜いた者（守備隊）は、堪える力（統率）がいくらか高い。 */
  const 守 = !!opts.守備隊;
  return {
    oldName: `${sur}${common}`, lordName: lord.name, henki,
    candidates: cands.slice(0, 4), feat: FEATS[Math.floor(Math.random() * FEATS.length)],
    仕官: {
      faction: opts.faction || lord.faction, at: opts.at || lord.at,
      lead: 守 ? r(46, 62) : r(38, 56), valor: 守 ? r(44, 64) : r(48, 70),
      wit: r(28, 52), gov: r(26, 50), age: r(19, 34),
      retinue: r(0, 3) * 20, retTrain: r(44, 62),
    },
  };
}

/* 名の定まった者を家中に加える（makePromotion の続き）。 */
export function 取り立てる(s, promo, name) {
  const o = promo && promo.仕官;
  if (!o || !s.factions[o.faction]) return null;
  const id = `promo-${o.faction}-${s.year}-${s.month}-${s.generals.length}`;
  const gen = {
    id, name, faction: o.faction, lead: o.lead, valor: o.valor, wit: o.wit, gov: o.gov,
    loyal: 82, age: o.age, at: o.at, retinue: o.retinue, retTrain: o.retTrain,
    unity: clamp(o.retTrain + 6, 30, 100), merit: 6, 架空: true,
    fief: 0, rost: newRoster(o.retinue, `ret-${id}`, 直属の兵科),
  };
  gen.fief = Math.round(fiefWanted(gen) * 0.5);
  s.generals.push(gen);
  return gen;
}

