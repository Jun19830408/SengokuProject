import { fiefOf, fiefWanted, 家督で役を引き継ぐ, 身分の位 } from "./rank.js";
import { newRoster } from "./roster.js";
import { clamp, 姓, 姓名, 能力を広げる } from "./util.js";
import { KANJI_TSUJI, LONG_LIVED, NEWCOMERS, PARENT } from "../data/newcomers.js";
import { 直属の兵科 } from "../data/arms.js";
import { 本拠を追う } from "./state.js";

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
      /* 世に出る者にも本領を与える（GDD 6.4）。

         禄は本領から出る。欄が空のままだと「本領を繕う」が奪われた者と見なし、
         出たその月に「本多忠勝は本領を失い、長篠城に居を移した」と告げられた。
         居を移してなどいない――生国のその城が、はじめからその者の本領である。 */
      本領: home.id,
      retinue: n.retinue, retTrain: n.retTrain,
      unity: clamp(n.retTrain + 8, 30, 100), merit: 0,
      fief: 0,
      rost: newRoster(n.retinue, `ret-${n.id}`, 直属の兵科),
    };
    /* 望む知行は仕える家の大きさと、その者の齢で決まる（rank.js fiefWanted）。 */
    gen.fief = Math.round(fiefWanted(gen, s) * 0.7);
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
export const isKin = (a, b) => !!a && !!b && 姓(a.name) === 姓(b.name);

// 登用できるか。旧主と血を分けた者、旧主への忠誠が篤い者は靡かない。
export function canRecruit(gen, lord) {
  if (!gen) return { ok: false, why: "" };
  // 姫を娶って一門に列した者も同じである。縁は血に劣らない（GDD 6.8）。
  if (gen.一門) return { ok: false, why: "主家の姫を娶った一門。他家に靡くことはない" };
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
  if (gen.一門) return true;                        // 姫を娶って一門に列した者（GDD 6.8）
  const lord = s.generals.find((x) => x.faction === gen.faction && x.lord && !x.captive);
  if (!lord) return false;
  return isClan(s, gen, lord);
}

/* 家を興せるのは家老の格からである。境は家の大きさで動くので（rank.js 家の尺）、
   禄高の数ではなく身分で見る。 */
export const hasHouse = (s, gen) => !!gen && !gen.lord && !isMainClan(s, gen)
  && (!!gen.house || 身分の位(gen, s) >= 3);

// 家名。姓をもって家とする（一字の姓も三字の姓もある。core/util.js の 姓名）。
export const houseName = (gen) => (gen ? 姓(gen.name) : "");

/* 親を尋ねる。史実の親子は PARENT、その盤で生まれた子は s.親 に控える。

   もとは bearChild が PARENT へ直に書き込んでいた。PARENT は newcomers.js の
   持ちもので、盤ごとのものではない。書き込めば卓を閉じても帳面に残り、
   同じ画面で二局目を始めると一局目に生まれた子の親子が混ざる。
   賽を固定した試験でも結果が揃わなかったのはこれが因である（同じ種で
   二度回して 従60/56・臣11/15・将1036/1045 と食い違った）。 */
export const 親の = (s, id) => (s && s.親 && s.親[id]) || PARENT[id];

// 家を継ぐ者。実の子が先、なければ同姓の年少者。
export function heirOfHouse(s, gen) {
  const kids = s.generals.filter((x) => 親の(s, x.id) === gen.id && !x.captive
    && x.faction === gen.faction);
  if (kids.length) return [...kids].sort((a, b) => (b.age || 0) - (a.age || 0))[0];
  const sur = houseName(gen);
  const kin = s.generals.filter((x) => x.id !== gen.id && !x.captive
    && x.faction === gen.faction && houseName(x) === sur && (x.age || 0) >= 12);
  if (kin.length) return [...kin].sort((a, b) => (b.age || 0) - (a.age || 0))[0];
  return null;
}

/* 生まれた子の名（GDD 6.7）。

   名乗りの頭は父の通字を継ぐ（信長の子は信、氏康の子は氏）。二字目は
   KANJI_TSUJI から選び、通字と同じ字や、盤にいる者と同じ名は避ける。
   もとは「姓の二字＋選んだ字＋父の名の末字」で、姓を取り違え（原胤政貞・
   朝比元知）、字が重なり（和田政政）、親子で同じ名になった（尚元政王の子が
   尚元政王）。

   姓の無い者（乙名・按司のような呼び名、法名だけの者）には架空の子を
   立てない。名の付けようがなく、付ければ史実の外の者が紛れる。 */
export function 子の名(s, gen) {
  if (!gen || isNameless(gen)) return null;
  const { 姓: sur, 名乗り } = 姓名(gen.name);
  if (!sur) return null;
  const 諱 = /^[一-龯]{2}$/.test(名乗り) ? 名乗り : null;
  const 通字 = 諱 ? 諱[0] : null;
  const 使われた = new Set((s.generals || []).map((x) => x.name));
  使われた.add(gen.name);
  const k = Math.abs((gen.id + s.year).split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
  const n = KANJI_TSUJI.length;
  for (let i = 0; i < n * n; i++) {
    const a = 通字 || KANJI_TSUJI[(k + Math.floor(i / n)) % n];
    const b = KANJI_TSUJI[(k * 7 + i) % n];
    if (a === b) continue;
    const 名 = `${sur}${a}${b}`;
    if (!使われた.has(名)) return 名;
  }
  return null;
}

/* 古い記録の架空の子の名を繕う。

   名の付け方を改める前に生まれた子は、姓を取り違えた名（原胤政貞）、字の重なった
   名（和田政政）、他の者と同じ名（福原義俊が二人）のままである。親の姓と合わない
   名、重なった名だけを付け直し、もとの名は 旧名 に控える。親の名が分からない者、
   名の筋が通っている者には触らない。一度見た者には印を付け、二度は付け直さない。 */
export function 架空の名を繕う(s, 史実の将 = []) {
  const 子ら = (s.generals || []).filter((x) => /_c\d{4}$/.test(x.id) && !x.名を繕った)
    .sort((a, b) => a.id.length - b.id.length || (b.age || 0) - (a.age || 0));
  const 帳 = new Map([...史実の将, ...NEWCOMERS].map((x) => [x.id, x.name]));
  const 直した = [];
  for (const q of 子ら) {
    q.名を繕った = true;
    // 親の控えが無い古い記録でも、id に親の id が残っている（親の id ＋ _c ＋ 生年）
    const pid = 親の(s, q.id) || q.id.replace(/_c\d{4}$/, "");
    const 親 = (s.generals || []).find((x) => x.id === pid) || (帳.has(pid) ? { id: pid, name: 帳.get(pid) } : null);
    if (!親) continue;
    const 親の姓 = 姓(親.name), { 姓: 今の姓, 名乗り } = 姓名(q.name);
    const 同名 = s.generals.some((x) => x !== q && x.name === q.name);
    const 字の重なり = 名乗り.length === 2 && 名乗り[0] === 名乗り[1];
    if (今の姓 === 親の姓 && !同名 && !字の重なり) continue;
    const 旧 = q.name;
    q.name = "";                                     // 自分の名と重なると見なさぬよう、いったん外す
    const 新 = 子の名(s, 親);
    q.name = 新 || 旧;
    if (!新) continue;
    q.旧名 = q.旧名 || 旧;
    直した.push({ 旧, 新 });
  }
  return 直した;
}

export function bearChild(s, gen) {
  const id = `${gen.id}_c${s.year}`;
  if (s.generals.some((x) => x.id === id)) return null;
  const 名 = 子の名(s, gen);
  if (!名) return null;
  /* 親の器量を半ば継ぎ、残りは並み（六十前後）に寄る。九十からは「とくに逸話のある者」の
     段なので、遊びの中で生まれた者は八十五で止める。 */
  const mix = (a, b) => clamp(Math.round(a * 0.55 + b * 0.45 + (Math.random() * 30 - 15)), 20, 85);
  const kid = {
    id, name: 名, faction: gen.faction,
    lead: mix(gen.lead, 60), valor: mix(gen.valor, 60),
    wit: mix(gen.wit, 60), gov: mix(gen.gov, 60),
    loyal: clamp((gen.loyal == null ? 70 : gen.loyal) - 4, 0, 100),
    age: 1, at: gen.at, 本領: gen.本領 || gen.at,      // 生まれた子は父の本領に生まれる
    retinue: 60, retTrain: 55,
    unity: 60, merit: 0, fief: 200, rost: newRoster(60, `ret-${id}`),
    /* 遊びの中で生まれた子は、史実の人物ではない（GDD 6.7）。
       史実に子のある者には、その子が後年ここへ現れるので、重ねては生まれない。
       つまり、ここで生まれる者はみな架空である。
       武将の欄で〔架空〕と添え、史実の人物と混ぜないようにする。 */
    架空: true,
  };
  s.generals.push(kid);
  if (!s.親) s.親 = {};                            // 生まれた子の親は盤に控える
  s.親[id] = gen.id;
  return kid;
}

// 家督を継がせる。禄と身分が受け継がれる。
export function inheritHouse(s, dead) {
  if (!hasHouse(s, dead)) return null;
  const heir = heirOfHouse(s, dead);
  if (!heir) return null;
  heir.fief = Math.max(heir.fief || 0, Math.round(fiefOf(dead) * 0.85));   // 分割で目減りする
  /* 身分の控えも継ぐ（rank.js 身分の境）。家の格は家に付くものであって、古くから
     仕える家の跡取りは、家が大きくなってから仕えた者と同じには測らない。
     跡取りに自らの控えがあれば、低いほうを取る。 */
  if (dead.身分控 && dead.身分控.家 === heir.faction) {
    const 控 = heir.身分控 && heir.身分控.家 === heir.faction ? heir.身分控 : { 家: heir.faction };
    for (const [k, v] of Object.entries(dead.身分控)) {
      if (k === "家") continue;
      控[k] = 控[k] == null ? v : Math.min(控[k], v);
    }
    heir.身分控 = 控;
  }
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

/* 盤にいる架空の者（遊びの中で生まれた子・取り立てた者）の割の上限（GDD 6.7）。
   史実の人物を主とし、架空の者は家を繋ぐ添えにとどめる。 */
export const 架空の上限 = 0.07;

/* ------------------------------------------------ 一族（GDD 6.7）
   子が生まれるのは、家を背負う者の一族に限る。遊ぶ側の申し出は「架空武将は
   その武将の一族として続いていくことを表したかったが、全ての武将がそうなると
   多くなりすぎる。城主・国主・方面軍だけにし、実際の子孫も含めて数を制限する。
   世界編を考えると子孫がいないと続かない」であった（一族を家の芯とする考え方）。

   子をなすのは次の者である。
     当主 … 大名家の主。家に継ぐ者が一人もいなければ、架空の者の上限にかかわらず
             子をなす（家を絶やさぬため）
     一門 … 当主の血筋の者（兄弟・叔父など）。当主の一族の枠に数える
     重臣 … 国主・旗頭
     城主 … 城を預かる者
   それ以外の家臣には生まれない。

   一族の枠は、盤にいる同じ一族の者（史実の人物も、生まれた子も、幼い者も）を
   数える。枠が埋まっていれば生まれない。史実の一族が多いあいだは史実の者で
   埋まり、それが絶えたのちに架空の子が家を繋ぐ。 */
export const 一族の枠 = { 当主: 4, 一門: 4, 重臣: 3, 城主: 2 };
export const 生まれる目 = { 当主: 0.10, 一門: 0.03, 重臣: 0.05, 城主: 0.03 };
// 一人が持てる子の数（盤にいる者）。
export const 子の数の限り = { 当主: 2, 一門: 1, 重臣: 2, 城主: 1 };

// 子をなす身の格。子をなさぬ者は null。
export function 一族の格(s, gen) {
  if (!gen || gen.captive) return null;
  if (gen.lord) return "当主";
  if (isMainClan(s, gen)) return "一門";
  if (gen.役 === "国主" || gen.役 === "旗頭") return "重臣";
  if ((s.castles || []).some((c) => c.lordId === gen.id && c.faction === gen.faction)) return "城主";
  return null;
}

// 同じ一族の者（本人を含む、盤にいる者）。当主と一門は大名家の一族として一つに数える。
export function 一族(s, gen) {
  const 生 = s.generals.filter((x) => !x.captive && x.faction === gen.faction);
  if (gen.lord || isMainClan(s, gen)) return 生.filter((x) => x.lord || isMainClan(s, x));
  const sur = houseName(gen);
  return 生.filter((x) => !x.lord && !isMainClan(s, x) && houseName(x) === sur);
}

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


/* 一門か。親子・兄弟・祖孫のいずれかであれば一門とする。

   もとは、二人それぞれについて「一代さかのぼる」「二代さかのぼる」を
   都度たどり直していた。親の無い者でも名簿を端から端まで舐めるので、
   千五百人の盤では年送りのたびに数百万回の走査になる。
   さかのぼるのは一度きりにし、親がいなければそこで打ち切る。
   （見るところは同じ。祖孫までの三代を突き合わせる） */
export function isClan(s, a, b) {
  if (!a || !b) return false;
  if (a.id === b.id) return true;
  const 系 = (g) => {
    const 代 = [g];
    let x = g;
    for (let i = 0; i < 2 && x; i++) {
      const p = 親の(s, x.id);
      x = p ? s.generals.find((y) => y.id === p) : null;
      if (x) 代.push(x);
    }
    return 代;
  };
  const 甲 = 系(a), 乙 = 系(b);
  for (const p of 甲) for (const q of 乙) if (p.id === q.id) return true;
  return 姓(a.name) === 姓(b.name);
}

// 子を返す（存命の者のみ）
export const childrenOf = (s, gen) => s.generals.filter((x) => 親の(s, x.id) === gen.id && !x.captive);


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
  const kids = childrenOf(s, dead).map((x) => x.id);
  const scored = kin.map((x) => ({
    gen: x,
    child: kids.includes(x.id),                     // 実の子
    // 姫を娶った婿も一門である。当主の跡目にも連なる（GDD 6.8）
    blood: kids.includes(x.id) || isClan(s, x, dead) || (!!x.一門 && !!dead.lord),
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
  /* 当主の名が無いとき（当主を欠いた家）は、家名を 姓 として渡してよい。
     家名には官名が付くことがある（織田大和守家）ので、頭が姓と合えば同じ血とみる。 */
  const sur = 姓(dead.name);
  const 同姓 = dead.姓
    ? (x) => { const t = 姓(x.name); return !!t && dead.姓.startsWith(t); }
    : (x) => 姓(x.name) === sur;
  // 同じ姓の者。年長から選ぶが、幼すぎる者は避ける。
  const blood = kin.filter((x) => 同姓(x) && x.age >= 8)
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
  const blood = 姓(heir.name) === 姓(dead.name);
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
  /* 本拠は新しい当主の城へ移る（GDD 6.4）。

     本拠は「当主のいる城」である。ところがその付け替え（本拠を追う）は月送りの
     終いでしか回っていなかった。隠居で家督を譲ると、新しい当主が別の城にいても
     本拠は先代の城に据え置かれたままになる。大名だけの差配――旗頭の任免、方面の
     割り、城の下げ渡し――はみな本拠でしか開かないので、遊ぶ側からは
     「代が替わったのに、先代の城でしか大名の仕事ができない」と見えた。
     家督が動いた、その場で本拠も動かす。 */
  本拠を追う(s);
  /* 旗頭のまま家督を継いだら、その場で役を解き、受け持ちを継がせる（GDD 6.4）。

     本拠を追う のあとに回す。新しい当主の城へ本拠が移って初めて、どの国が
     「当主のいる国」になるかが定まるからである。 */
  const 引継 = 家督で役を引き継ぐ(s, dead.faction, heir);
  if (引継) {
    if (引継.解いた === "旗頭" && !引継.待ち) {
      s.chronicle.push({ y: s.year, m: s.month,
        text: 引継.継者
          ? `${heir.name}は家督を継ぎ、${引継.国 || ""}方面の旗頭を${引継.継者.name}に譲った`
            + `（寄騎${引継.寄騎}名を引き継ぐ）。`
          : `${heir.name}は家督を継ぎ、旗頭の役を離れた。${引継.国 || ""}方面は大名が自ら差配する。` });
    }
    /* 継ぎ手を大名が選ぶあいだは、まだ戦国記には書かない（選んでから書く）。 */
    if (!引継.待ち) {
      s.代替わり[s.代替わり.length - 1].旗頭引継 = 引継.継者
        ? { 前: heir.name, 後: 引継.継者.name, 国: 引継.継の国, 寄騎: 引継.寄騎 }
        : { 前: heir.name, 後: null, 国: 引継.国, 寄騎: 0 };
    }
  }
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
    /* 旧名。組頭から取り立てるときは、その者の通称をそのまま使う。
       盤の上で手柄を重ねてきた者であって、いま思いついた名ではない。 */
    oldName: opts.旧名 || `${sur}${common}`, lordName: lord.name, henki,
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
  /* 取り立ての値は狭い尺度で作っている（makePromotion）。武将帳と同じ広い尺度へ写す。 */
  const gen = {
    id, name, faction: o.faction, lead: 能力を広げる(o.lead, "lead"), valor: 能力を広げる(o.valor, "valor"),
    wit: 能力を広げる(o.wit, "wit"), gov: 能力を広げる(o.gov, "gov"),
    loyal: 82, age: o.age, at: o.at, 本領: o.at,      // 召し抱えた城が、その者の本領となる
    retinue: o.retinue, retTrain: o.retTrain,
    unity: clamp(o.retTrain + 6, 30, 100), merit: 6, 架空: true,
    fief: 0, rost: newRoster(o.retinue, `ret-${id}`, 直属の兵科),
  };
  gen.fief = Math.round(fiefWanted(gen, s) * 0.5);
  s.generals.push(gen);
  return gen;
}

