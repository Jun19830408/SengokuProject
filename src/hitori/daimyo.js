/* ============================================================================
   風雲：大名への道（遊ぶ人の答え：「1はabc全てですね」）

     (a) 家督   … 当主が没し（捕らわれ）、血筋の跡継ぎがいなければ、宿老の主人公が家を継ぐ（core/house.js pickHeir・succeed）
     (b) 下剋上 … 遊ぶ人の申し出：「主人公が宿老となり、大名の城に在陣してそこを急襲し、城を落とせれば下剋上完了です。このとき、
                  特別に城攻めを下剋上というコマンド名にしましょう」「他の城主がいなければ（城が大名の城一つの場合も含む）そのまま
                  全ての武将が下剋上に従う」「他の城主がいる場合（国主、旗頭を含む）ですが、城主との友好関係が100ならかなりの
                  高確率で下剋上に従い、それ以下なら元の忠誠心との関係で確率が逓減していく」「宿老となったところで、各城主との
                  友好度をあげるとともに、調略（忠誠心を下げる）を味方城主にもできるようにしたい」「下準備をして各城（国主、旗頭が
                  従う場合は、その国主らの寄騎も従う）が従うかどうか決まる」
     (c) 独立   … 「Cとの違いは自分の寄騎以外にも影響を与えられるところ」「Cも友好度と忠誠心によって従う城、従わない城が出てくる
                  ようにもしたいですが、Bよりも従いやすくしたい」

   大名になれば、遊ぶ人はキャンペーンと同じく家を差配する（core/state.js 風雲の主を大名に）。

   下準備（宿老から）
     誼を通じる … 家の城主（国主・旗頭を含む。当主と主人公を除く）と誼を通じ、友好を上げる（八＋知略÷十）。城の預けから
                  誼の費えを払う。城主ごとに月に一度
     調略       … 家の城主の当主への忠誠を下げる（三＋知略÷八。見込みは〇.四＋知略÷二百、九割まで）。城の預けから調略の費えを
                  払う。城主ごとに月に一度。しくじっても咎めは無い
     友好は、誼を通じる前は 友好の初め（三十）とする
   従う見込み
     下剋上 … 〇.九 ×（友好÷百）^（一＋忠誠÷五十）。友好百なら九割。友好が低いほど、当主への忠誠が高いほど落ちる
     独立   … 〇.九五 ×（友好÷百）^（〇.五＋忠誠÷百）。下剋上より従いやすい。主人公の寄騎だけが従いうる
   下剋上の流れ
     一、宿老の主人公が、自ら率いる軍で当主の城へ兵を移し、在陣する（出陣の画面の行き先に当主の城が加わる）
     二、屋敷の軍の欄の「下剋上」で旗を揚げる。主人公の家を興し（core/jiritsu.js 自立する。主人公の姓に「家」）、主人公の城と、
         主人公の軍・城にいる将は新しい家に付く。旧主とは敵対する。そのまま当主の城を急襲する（城攻めの盤。ui/MapScreen.jsx）
     三、当主の城を落とせば下剋上が成る（govern/war.js sackCastle が印を立て、ui/MapScreen.jsx が 下剋上を成す を呼ぶ）。
         家にほかの城主がいなければ、旧主の城と将はみな従う（旧の当主を除く）。城主がいれば、城主ごとに見込みで従うかを決め、
         国主・旗頭が従えばその寄騎も従う。城主のいない城は従う。旧主の金は、従った城の石高の割で分ける
     四、落とせなければ、囲みはキャンペーンの囲みの帳で続く。旗を揚げた家は旧主と戦い続ける
     五、成れば、旧主の当主は死に、その親と子も死ぬ（姫も）。兄弟は、当主への忠誠を見込みとして追死し、さもなくば従う
         （遊ぶ人の申し出：「下剋上が成功したら、元の大名は死亡しますし、その一族（親も子も）死亡するのが原則」「兄弟は忠誠に
         よって追死か従うか決まる」）。親子・兄弟は、親子の控え（core/house.js 親の：史実の親子の帳と、盤で生まれた子の控え）
         で見分け、控えの無い同じ姓の者は齢の差で見なす（十五以上下なら子、それより近ければ兄弟。推定）。主人公に嫁いだ姫と、
         他家へ嫁いだ姫は除く
   値はみな仮
   ============================================================================ */
import { 風雲の主を大名に, 本拠を追う, 奪われた本領を繕う } from "../core/state.js";
import { 寄騎たち, 忠誠 } from "../core/rank.js";
import { succeed, ruinedHouse, 親の, isKin } from "../core/house.js";
import { 将を除く } from "../govern/war.js";
import { makePrisoner } from "../core/capture.js";
import { 自立する } from "../core/jiritsu.js";
import { 姓 } from "../core/util.js";
import { 主人公の武将, 主人公の城, 宿老か, 記す, 限 } from "./fuun.js";
import { 子を盤に } from "./kazoku.js";

const 月番 = (s) => s.year * 12 + s.month;

/* ---- 下準備 ---- */
export const 友好の初め = 30;
export const 誼の費え = 20, 調略の費え = 30;
export const 誼の上げ = (知略) => Math.round(8 + (知略 || 0) / 10);
export const 調略の下げ = (知略) => Math.round(3 + (知略 || 0) / 8);
export const 調略の見込み = (知略) => Math.min(0.9, 0.4 + (知略 || 0) / 200);
export const 友好を見る = (f, id) => (f && f.友好 && f.友好[id] != null ? f.友好[id] : 友好の初め);
export const 下剋上の見込み = (友好, 忠) => 0.9 * Math.pow(限(友好, 0, 100) / 100, 1 + 限(忠, 0, 100) / 50);
export const 独立の見込み = (友好, 忠) => 0.95 * Math.pow(限(友好, 0, 100) / 100, 0.5 + 限(忠, 0, 100) / 100);
/* 従った将の、新しい主への忠誠（友好が高いほど据わる） */
const 従った忠誠 = (友好) => Math.round(限(40 + 友好 / 2, 30, 90));

/* 家の城主ら（当主の城と主人公の城は除く。当主の城には城主の札が無い）。見込みも添える */
export function 家の城主ら(s) {
  const f = s && s.風雲; if (!f) return [];
  const g = 主人公の武将(s);
  const 出 = [];
  for (const c of s.castles || []) {
    if (c.faction !== s.player || !c.lordId) continue;
    const 主 = (s.generals || []).find((x) => x.id === c.lordId && x.faction === s.player && !x.captive);
    if (!主 || 主.lord || 主.風雲の主) continue;
    const 友 = 友好を見る(f, 主.id), 忠 = 忠誠(主);
    出.push({ 城: c, 主, 役: 主.役 || null, 寄騎: 寄騎たち(s, 主.id).length, 友好: 友, 忠誠: 忠,
      主人公の寄騎: !!(g && 主.寄親 === g.id), 下剋上: 下剋上の見込み(友, 忠), 独立: 独立の見込み(友, 忠) });
  }
  return 出;
}
const 下準備の文を置く = (prev, 文) => ({ ...prev, 風雲: { ...prev.風雲, 下準備の文: 文 } });
function 下準備の前(prev, genId, 種) {
  const f = prev && prev.風雲;
  if (!f || f.討死 || !宿老か(f.身分)) return { 訳: "宿老になってからできる。" };
  const 主 = (prev.generals || []).find((x) => x.id === genId && x.faction === prev.player && !x.captive && !x.lord && !x.風雲の主);
  if (!主) return { 訳: "その者はいない。" };
  if ((((f.下準備の月 || {})[genId]) || {})[種] === 月番(prev)) return { 訳: `${主.name}には今月もう${種 === "誼" ? "誼を通じた" : "調略をかけた"}。`, 主 };
  const 費え = 種 === "誼" ? 誼の費え : 調略の費え;
  if ((f.城の預け || 0) < 費え) return { 訳: `預かった金が足りぬ（${費え}貫が要る。預かり${Math.round(f.城の預け || 0)}貫）。`, 主 };
  return { 主, 費え };
}
/* 誼を通じる：友好を上げる。新しい盤を返す（訳は 風雲.下準備の文） */
export function 誼を通じる(prev, genId) {
  const 前 = 下準備の前(prev, genId, "誼");
  if (前.訳) return 下準備の文を置く(prev, 前.訳);
  const s = structuredClone(prev), f = s.風雲, 主 = s.generals.find((x) => x.id === genId);
  const 友 = 友好を見る(f, genId), 後 = Math.min(100, 友 + 誼の上げ(f.知略));
  f.友好 = { ...(f.友好 || {}), [genId]: 後 };
  f.城の預け = Math.round(((f.城の預け || 0) - 前.費え) * 10) / 10;
  f.下準備の月 = { ...(f.下準備の月 || {}), [genId]: { ...((f.下準備の月 || {})[genId] || {}), 誼: 月番(s) } };
  f.下準備の文 = `${主.name}と誼を通じた（友好${友}→${後}・費え${前.費え}貫）。`;
  記す(s, f.下準備の文);
  return s;
}
/* 調略：当主への忠誠を下げる（見込みで、しくじることがある）。新しい盤を返す */
export function 城主を調略する(prev, genId, rand = Math.random) {
  const 前 = 下準備の前(prev, genId, "調略");
  if (前.訳) return 下準備の文を置く(prev, 前.訳);
  const s = structuredClone(prev), f = s.風雲, 主 = s.generals.find((x) => x.id === genId);
  f.城の預け = Math.round(((f.城の預け || 0) - 前.費え) * 10) / 10;
  f.下準備の月 = { ...(f.下準備の月 || {}), [genId]: { ...((f.下準備の月 || {})[genId] || {}), 調略: 月番(s) } };
  if (rand() < 調略の見込み(f.知略)) {
    const 忠 = 主.loyal == null ? 60 : 主.loyal, 後 = Math.max(0, 忠 - 調略の下げ(f.知略));
    主.loyal = 後;
    f.下準備の文 = `${主.name}に調略をかけた。当主への忠誠が下がった（${Math.round(忠)}→${Math.round(後)}・費え${前.費え}貫）。`;
  } else f.下準備の文 = `${主.name}への調略はうまくいかなかった（費え${前.費え}貫）。`;
  記す(s, f.下準備の文);
  return s;
}

/* ---- 家を興す（下剋上・独立）。core/jiritsu.js 自立する で家を立て、名を主人公の姓に「家」とする ---- */
export function 主人公の家を興す(s, 城, 道) {
  const f = s.風雲, g = 主人公の武将(s), 旧 = s.player, 旧の名 = (s.factions[旧] || {}).name || "";
  const id = 自立する(s, g, 城);
  const 家 = s.factions[id];
  const 頭 = f.姓 || 姓(g.name) || g.name;
  const 名ら = new Set(Object.entries(s.factions).filter(([k]) => k !== id).map(([, x]) => x.name));
  家.name = 名ら.has(`${頭}家`) ? `${頭}家（${城.name.replace(/城$/, "")}）` : `${頭}家`;
  家.desc = `${旧の名}の宿老${g.name}が、${道}して興した家。`;
  家.風雲 = { 道, 旧 };
  家.gold = Math.round((家.gold || 0) + (f.城の預け || 0));
  f.城の預け = 0;
  f.城 = 城.id;
  return id;
}
/* 将を新しい家に移す（役と寄親の筋は、移った先に寄親がいなければ外す） */
function 将を移す(s, q, 家, 友好) {
  q.faction = 家;
  if (q.captive && q.captive.by === 家) q.captive = null;
  if (q.寄親 && !s.generals.some((x) => x.id === q.寄親 && x.faction === 家)) q.寄親 = null;
  q.loyal = 従った忠誠(友好);
}

/* 旧主の一族を見分ける。主 … 旧主の当主（像でもよい：id・name・age）。返すのは { 親, 子, 兄弟, 娘 } */
export function 旧主の一族(s, 主, 旧, 家) {
  const 主人公 = (s.generals || []).find((x) => x.風雲の主);
  const 内 = (q) => q && q.id !== 主.id && !q.風雲の主 && (q.faction === 旧 || (q.captive && q.captive.by === 家));
  const 親id = 親の(s, 主.id);
  const 親 = 親id ? s.generals.filter((q) => q.id === 親id && 内(q)) : [];
  const 子 = [], 兄弟 = [];
  for (const q of s.generals) {
    if (!内(q) || q.id === 親id) continue;
    const p = 親の(s, q.id);
    if (p === 主.id) { 子.push(q); continue; }
    if (p && 親id && p === 親id) { 兄弟.push(q); continue; }
    if (p) continue;                                   // 親の分かる者は、その筋で見る（甥・孫は一族の始末に入れない）
    if (!isKin(q, 主)) continue;
    const 差 = (主.age || 30) - (q.age || 30);
    if (差 >= 15) 子.push(q); else if (Math.abs(差) < 15) 兄弟.push(q);
  }
  const 娘 = (s.hime || []).filter((h) => !h.死 && h.faction === 旧 && (h.父 === 主.id || String(h.伝 || "").startsWith(`${主.name}の娘`))
    && !(h.嫁 && (h.嫁.種 === "婚姻" || (主人公 && h.嫁.先 === 主人公.id))));
  return { 親, 子, 兄弟, 娘 };
}

/* ---- (b) 下剋上 ---- */
/* 当主の城（当主のいる城）。陣中なら無い */
export const 当主の城 = (s) => {
  const 当主 = (s.generals || []).find((x) => x.faction === s.player && x.lord && !x.captive);
  return 当主 && 当主.at ? (s.castles || []).find((c) => c.id === 当主.at && c.faction === s.player) || null : null;
};
/* 出陣の画面で、宿老は当主の城へ兵を移せる（そこに在陣して下剋上の構えをとる） */
export const 下剋上の在陣先か = (s, x) => !!(s && s.風雲 && 宿老か(s.風雲.身分) && x && 当主の城(s) && 当主の城(s).id === x.id);
export function 下剋上の構え(s, armyId) {
  const f = s && s.風雲;
  if (!f || f.討死 || !宿老か(f.身分)) return { ok: false, 訳: "宿老になってからできる。" };
  const g = 主人公の武将(s); if (!g) return { ok: false, 訳: "城主でない。" };
  const 城 = 当主の城(s); if (!城) return { ok: false, 訳: "当主が城にいない。" };
  const a = (s.armies || []).find((x) => x.id === armyId);
  if (!a || !a.風雲の主の軍 || !(a.gens || []).includes(g.id)) return { ok: false, 訳: "主人公が率いる軍でない。" };
  if (a.在陣 !== 城.id) return { ok: false, 訳: `${城.name}（当主の城）に在陣していない。` };
  const 当主 = s.generals.find((x) => x.faction === s.player && x.lord && !x.captive);
  return { ok: true, 軍: a, 城, 当主 };
}
/* 下剋上の旗を揚げる。主人公の家を興し、当主の城を囲んで急襲する（盤は ui/MapScreen.jsx が開く）。返すのは { ok, 訳, 家 } */
export function 下剋上を起こす(s, armyId) {
  const 構 = 下剋上の構え(s, armyId); if (!構.ok) return 構;
  const f = s.風雲, g = 主人公の武将(s), 旧 = s.player, a = 構.軍, 城 = 構.城, 旧当主 = 構.当主;
  const 我が城 = 主人公の城(s);
  if (!我が城) return { ok: false, 訳: "主人公の城が無い。" };
  const 旧の石 = s.castles.filter((c) => c.faction === 旧).reduce((t, c) => t + (c.koku || 0), 0);
  const 旧の名 = (s.factions[旧] || {}).name || "";
  const 家 = 主人公の家を興す(s, 我が城, "下剋上");
  /* 主人公は軍に戻る（自立する は軍から降ろす）。軍と、軍・城にいる将は新しい家に付く */
  g.at = null;
  a.gens = [g.id, ...(a.gens || []).filter((x) => x !== g.id)];
  a.faction = 家; a.在陣 = null; a.sieging = true; a.target = 城.id; a.path = [城.id]; a.at = 城.id; a.prog = 0;
  a.aid = null; a.助勢 = null; a.relief = null;
  for (const q of s.generals) {
    if (q.faction !== 旧 || q.lord || q.captive) continue;
    if ((a.gens || []).includes(q.id) || q.at === 我が城.id) 将を移す(s, q, 家, 友好を見る(f, q.id));
  }
  /* 急襲：当主の城を囲み、すぐ城攻めの盤を開く */
  /* その月の囲みの差配は急襲で済んだものとする（囲みの帳は翌月から） */
  s.sieges = [...(s.sieges || []).filter((x) => x.castleId !== 城.id), { castleId: 城.id, armyId: a.id, months: 0, 下剋上: true, decided: `${s.year}-${s.month}` }];
  f.下剋上 = { 城: 城.id, 軍: a.id, 家, 旧家: 旧, 旧当主: 旧当主.id, 旧当主の像: { id: 旧当主.id, name: 旧当主.name, age: 旧当主.age },
    旧の石, 年: s.year, 月: s.month, 盤を待つ: true };
  記す(s, `${旧の名}の当主${旧当主.name}に背き、${城.name}で下剋上の兵を挙げた。`);
  s.chronicle = [...(s.chronicle || []), { y: s.year, m: s.month, text: `${旧の名}の宿老${g.name}が下剋上の兵を挙げ、${城.name}を急襲した。` }];
  風雲の主を大名に(s, "下剋上の旗揚げ");
  子を盤に(s);                                                   // 屋敷の帳の子は、主人公の家の武将・姫になる（hitori/kazoku.js）
  return { ok: true, 家 };
}
/* 下剋上を成す（当主の城を落としたのち）。返すのは { 結果, 従った城, 残った城 }（成っていなければ null） */
export function 下剋上を成す(s, rand = Math.random) {
  const f = s && s.風雲, 下 = f && f.下剋上;
  if (!下 || 下.済 || !下.成った) return null;
  const 家 = 下.家, 旧 = 下.旧家, 旧の名 = (s.factions[旧] || {}).name || "";
  /* 旧主の城が当主の城だけだったなら、落城の処理（govern/war.js sackCastle）が先に滅んだ家の始末の問いを立てている。下剋上の
     決まり（家中はみな従う）で捌くので引き取る（残る者がいれば、下でまた立てる） */
  if (s.warSettle && s.warSettle.faction === 旧) s.warSettle = null;
  /* 一族の始末：旧主の当主・親・子は死ぬ。兄弟は忠誠を見込みとして追死し、さもなくば従う（上の 五） */
  const 旧当主像 = s.generals.find((x) => x.id === 下.旧当主) || 下.旧当主の像 || null;
  const 一族 = 旧当主像 ? 旧主の一族(s, 旧当主像, 旧, 家) : { 親: [], 子: [], 兄弟: [], 娘: [] };
  const 死ぬ = [...(s.generals.some((x) => x.id === 下.旧当主) ? [s.generals.find((x) => x.id === 下.旧当主)] : []), ...一族.親, ...一族.子];
  const 追死 = [], 従う兄弟 = [];
  for (const q of 一族.兄弟) (rand() < 忠誠(q) / 100 ? 追死 : 従う兄弟).push(q);
  const 名 = (a) => a.map((q) => q.name).join("・");
  const 始末 = { 死: 死ぬ.map((q) => q.name), 追死: 追死.map((q) => q.name), 従った兄弟: 従う兄弟.map((q) => q.name), 娘: 一族.娘.map((h) => h.name) };
  const 兄弟の城 = new Set(s.castles.filter((c) => c.faction === 旧 && 従う兄弟.some((q) => q.id === c.lordId)).map((c) => c.id));
  for (const q of [...死ぬ, ...追死]) 将を除く(s, q.id);
  for (const h of 一族.娘) h.死 = true;
  for (const q of 従う兄弟) 将を移す(s, q, 家, 友好を見る(f, q.id));
  if (旧当主像) {
    const 文0 = `${旧当主像.name}は果てた。${一族.親.length + 一族.子.length ? `一族の${名([...一族.親, ...一族.子])}も死んだ。` : ""}`
      + `${一族.娘.length ? `姫の${一族.娘.map((h) => h.name).join("・")}も死んだ。` : ""}`
      + `${追死.length ? `兄弟の${名(追死)}は追死した。` : ""}${従う兄弟.length ? `兄弟の${名(従う兄弟)}は従った。` : ""}`;
    記す(s, 文0);
    s.chronicle = [...(s.chronicle || []), { y: s.year, m: s.month, text: `下剋上により、${旧の名}の${文0}` }];
  }
  const 旧の城 = s.castles.filter((c) => c.faction === 旧);
  const 主の = (c) => c.lordId && s.generals.find((x) => x.id === c.lordId && x.faction === 旧 && !x.captive && !x.lord);
  const 城主のいる = 旧の城.filter((c) => 主の(c));
  const 従う = new Set(), 結果 = [];
  if (!城主のいる.length) for (const c of 旧の城) 従う.add(c.id);
  else {
    for (const c of 城主のいる) {
      const 主 = 主の(c), 友 = 友好を見る(f, 主.id), 見込み = 下剋上の見込み(友, 忠誠(主));
      const 従 = rand() < 見込み;
      結果.push({ 城: c.name, 主: 主.name, 役: 主.役 || null, 友好: 友, 忠誠: Math.round(忠誠(主)), 見込み, 従 });
      if (!従) continue;
      従う.add(c.id);
      /* 国主・旗頭が従えば、その寄騎も従う。寄騎は国主・旗頭の下にしか付かないので、寄親の筋で見る（落城のさなかに役が
         繕われて外れていても、筋は残る） */
      for (const k of 寄騎たち(s, 主.id)) {
        const kc = s.castles.find((x) => x.id === (k.本領 || k.at) && x.faction === 旧);
        if (kc) 従う.add(kc.id);
      }
    }
    for (const c of 旧の城) if (!c.lordId) 従う.add(c.id);          // 城主のいない城は、抗う主がいないので従う
  }
  for (const id of 兄弟の城) 従う.add(id);                          // 従った兄弟の城は、その兄弟とともに従う
  /* 落ち延びた旧主の当主（落城のさなかに家督を継いだ者も）が、従う城に入っていれば、その城の者が捕らえて差し出す
     （遊ぶ人が処遇を決める。キャンペーンの捕虜と同じ） */
  for (const 主 of s.generals.filter((x) => x.faction === 旧 && x.lord && !x.captive)) {
    if (!主.at || !従う.has(主.at)) continue;
    makePrisoner(s, 主, 家, 主.at);
    s.captives = [...new Set([...(s.captives || []), 主.id])];
    記す(s, `${主.name}は${(s.castles.find((c) => c.id === 主.at) || {}).name || "城"}で捕らえられ、差し出された。`);
  }
  const 全て = !城主のいる.length;
  let 移った石 = (s.castles.find((c) => c.id === 下.城) || {}).koku || 0;
  for (const c of 旧の城) {
    if (!従う.has(c.id)) continue;
    c.faction = 家; c.najimi = Math.min(c.najimi ?? 70, 50);
    移った石 += c.koku || 0;
  }
  /* 将：家にほかの城主がいなければ、旧の当主を除いてみな従う。いれば、従った城にいる者と、従った城から出た軍の者 */
  const 従う軍 = new Set((s.armies || []).filter((a) => a.faction === 旧 && (全て || 従う.has(a.from))).map((a) => a.id));
  for (const a of s.armies || []) if (従う軍.has(a.id)) a.faction = 家;
  for (const q of s.generals) {
    if (q.faction !== 旧 || q.lord || q.id === 下.旧当主) continue;
    if (q.captive && q.captive.by !== 家) continue;
    const 軍の = (s.armies || []).some((a) => 従う軍.has(a.id) && (a.gens || []).includes(q.id));
    if (全て || 軍の || (q.at && 従う.has(q.at))) 将を移す(s, q, 家, 友好を見る(f, q.id));
  }
  /* 旧主の金は、従った城の石高の割で分ける */
  const 旧家 = s.factions[旧], 新家 = s.factions[家];
  if (旧家 && 新家 && 下.旧の石 > 0) {
    const 金 = Math.round(Math.max(0, 旧家.gold || 0) * Math.min(1, 移った石 / 下.旧の石));
    旧家.gold = (旧家.gold || 0) - 金; 新家.gold = (新家.gold || 0) + 金;
  }
  /* 旧主の家：城が残り、当主を欠けば（当主は果てた）、残る者から跡を継がせる */
  const 残る = s.castles.filter((c) => c.faction === 旧);
  if (残る.length && 旧当主像 && !s.generals.some((x) => x.faction === 旧 && x.lord && !x.captive)) {
    try { succeed(s, { ...旧当主像, faction: 旧, retinue: 0, lord: true }, "下剋上で果てた"); } catch (e) { /* 継ぐ者がなければそのまま */ }
  }
  /* 旧主の家に城が一つも残らなければ、家は滅ぶ。残る者（旧の当主・家督を継いだ者・捕虜）の身の振り方は、キャンペーンで
     遊ぶ側が家を滅ぼしたときと同じく、一人ずつ問う（govern/war.js sackCastle の warSettle） */
  if (!残る.length) {
    const 戻す = s.generals.filter((x) => x.faction === 旧 && x.captive && x.captive.by === 家);
    for (const q of 戻す) q.captive = null;
    if (戻す.length) { const 済 = new Set(戻す.map((q) => q.id)); s.captives = (s.captives || []).filter((id) => !済.has(id)); }
    const { lord, retainers } = ruinedHouse(s, 旧);
    if (lord || retainers.length) {
      s.warSettle = { faction: 旧, winner: 家, castleId: 下.城, lordId: lord ? lord.id : null,
        queue: [...(lord ? [lord.id] : []), ...retainers.map((x) => x.id)] };
    }
    s.ruined = [...new Set([...(s.ruined || []), 旧])];
  }
  /* 捕虜の処遇の列から、果てた者と、従って自由になった者を外す */
  s.captives = (s.captives || []).filter((id) => { const q = s.generals.find((x) => x.id === id); return q && q.captive; });
  本拠を追う(s); 奪われた本領を繕う(s);
  下.済 = true; 下.結果 = 結果; 下.一族 = 始末;
  const 従った城 = 旧の城.filter((c) => 従う.has(c.id)).length + 1, 残った城 = 残る.length;
  const 文 = `下剋上が成った。${(s.castles.find((c) => c.id === 下.城) || {}).name || ""}を落とし、${全て ? "旧主の家中はみな従った" : `城主のうち${結果.filter((x) => x.従).length}人が従い、${結果.filter((x) => !x.従).length}人は${旧の名}に残った`}（${新家 ? 新家.name : ""}の城${s.castles.filter((c) => c.faction === 家).length}）。`;
  記す(s, 文);
  s.chronicle = [...(s.chronicle || []), { y: s.year, m: s.month, text: 文 }];
  s.monthEvents = [...(s.monthEvents || []), 文];
  s.msg = 文;
  return { 結果, 従った城, 残った城, 一族: 始末 };
}

/* ---- (c) 独立 ---- */
export function 独立の構え(s) {
  const f = s && s.風雲;
  if (!f || f.討死 || !宿老か(f.身分)) return { ok: false, 訳: "宿老になってからできる。" };
  const g = 主人公の武将(s), 城 = 主人公の城(s);
  if (!g || !城) return { ok: false, 訳: "城主でない。" };
  if (g.役 !== "国主" && g.役 !== "旗頭") return { ok: false, 訳: "国主か旗頭になってからできる（預かる国ごと独立する）。" };
  if ((s.sieges || []).some((x) => x.castleId === 城.id)) return { ok: false, 訳: `${城.name}が囲まれている。` };
  return { ok: true, 城 };
}
/* 独立する。主人公の家を興し、寄騎は見込みで従うかを決める。返すのは { ok, 訳, 家, 結果 } */
export function 独立する(s, rand = Math.random) {
  const 構 = 独立の構え(s); if (!構.ok) return 構;
  const f = s.風雲, g = 主人公の武将(s), 旧 = s.player, 城 = 構.城, 旧の名 = (s.factions[旧] || {}).name || "";
  const 寄 = 寄騎たち(s, g.id);                                   // 自立する が寄親の筋を外す前に控える
  const 結果 = 寄.map((k) => { const 友 = 友好を見る(f, k.id), 見込み = 独立の見込み(友, 忠誠(k)); return { k, 友好: 友, 見込み, 従: rand() < 見込み }; });
  const 家 = 主人公の家を興す(s, 城, "独立");
  for (const q of s.generals) {
    if (q.faction !== 旧 || q.lord || q.captive) continue;
    if (q.at === 城.id) 将を移す(s, q, 家, 友好を見る(f, q.id));      // 主人公の城にいる者は従う
  }
  for (const r of 結果) {
    const k = r.k;
    if (!r.従) { k.寄親 = null; continue; }
    const c = s.castles.find((x) => x.id === (k.本領 || k.at) && x.faction === 旧);
    if (c) {
      c.faction = 家; c.najimi = Math.min(c.najimi ?? 70, 50);
      for (const q of s.generals.filter((x) => x.at === c.id && x.faction === 旧 && !x.captive && !x.lord)) 将を移す(s, q, 家, 友好を見る(f, q.id));
    }
    if (k.faction === 旧) 将を移す(s, k, 家, r.友好);
  }
  /* 出陣中の主人公の軍も付く */
  for (const a of s.armies || []) if (a.風雲の主の軍 && a.faction === 旧) {
    a.faction = 家;
    for (const id of a.gens || []) { const q = s.generals.find((x) => x.id === id); if (q && q.faction === 旧 && !q.lord) 将を移す(s, q, 家, 友好を見る(f, q.id)); }
  }
  const 文 = `${旧の名}から独立し、${(s.factions[家] || {}).name || ""}を興した（寄騎${結果.length}人のうち${結果.filter((x) => x.従).length}人が従った）。`;
  記す(s, 文);
  s.chronicle = [...(s.chronicle || []), { y: s.year, m: s.month, text: `${旧の名}の宿老${g.name}が独立し、${(s.factions[家] || {}).name || ""}を興した。` }];
  風雲の主を大名に(s, "独立");
  子を盤に(s);                                                   // 屋敷の帳の子は、主人公の家の武将・姫になる（hitori/kazoku.js）
  本拠を追う(s); 奪われた本領を繕う(s);
  return { ok: true, 家, 結果: 結果.map((r) => ({ 主: r.k.name, 友好: r.友好, 見込み: r.見込み, 従: r.従 })) };
}
