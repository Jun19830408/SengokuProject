/* ==========================================================================
   風雲：主人公の妻子

   遊ぶ人の申し出：「主人公は15歳スタートにしましょう。また、姫を娶ったら子供も生まれて、幼名は自動としても、名前は
   選べるようにしたいですね。息子も姫も生まれるようにしたいです。」

     縁談 … 家老から上（城主の段）で妻のいない主人公に、正月、主君が家の姫（城にいて嫁いでいない、子を生む齢の限りまでの
            姫）のうち、主人公と齢の近い者を娶らせたいと申し入れる。受ければ、キャンペーンの「家臣に嫁がせる」
            （core/hime.js）と同じ縁組になる（主人公は一門に列し、姫は主人公の城に入る）。断っても咎めは無く、妻のいない
            あいだは翌年の正月にまた話が来ることがある。大名になってからは、キャンペーンの縁談（他家からの輿入れ）で
            迎えた姫が妻になる
     子   … 妻がいれば、正月ごとに 子の生まれる見込み で子が生まれる（男女は半々）。妻が 子を生む齢の限り を過ぎるか、
            子が 主人公の子の限り に達すれば、もう生まれない。幼名は自動で付く。器量は父の器量を継いで増減する（キャンペーンの
            子と同じ core/house.js 子の器量。娘の外交は父の知略から、統率は父の統率から）
     元服 … 子が十五になれば、名を自分で決めるか、自動の候補から選ぶ。男子は父の姓を継いで名を選ぶ（自動の候補は、
            キャンペーンの子の名と同じく、父の諱の一字目を通字に継ぐ）。娘は名を選ぶ（自動の候補は「○姫」など）
     盤   … 大名になるまでは、子は屋敷の帳（風雲.子ら）にいる。大名になれば、男子は武将の帳に入り（キャンペーンの子の
            生まれ core/house.js bearChild と同じ形。元服までは幼名で）、娘は名を定めたのち姫の帳に入る（キャンペーンの
            姫が十五で世に出るのと同じ）。大名になってのちに生まれた子も同じ
   主人公には、キャンペーンの子の生まれ（妻を問わずに生まれる）を当てない（govern/month.js）。
   子の齢は、生まれた年を一つとして年の改まりに一つずつ加える（キャンペーンの子が齢一で生まれるのと同じ。姫の齢と同じく
   正月に加わる）。
   値はみな仮
   ========================================================================== */
import { 風雲の主のid, 風雲の大名か } from "../core/state.js";
import { 子の器量 } from "../core/house.js";
import { 姫の齢, 姫の役, 元服の齢 } from "../core/hime.js";
import { HIME_NAMES } from "../data/hime.js";
import { KANJI_TSUJI } from "../data/newcomers.js";
import { newRoster } from "../core/roster.js";
import { 姓, 姓名, makeRng } from "../core/util.js";
import { 主人公の武将, 主人公の城, 城主の段か, 記す, 名乗りの限り, 主人公の齢 } from "./fuun.js";

export const 子の生まれる見込み = 0.3;           // 妻がいるとき、正月ごとに子が生まれる見込み
export const 子を生む齢の限り = 40;              // 妻の齢がこれを過ぎれば、もう生まれない（縁談の姫もこの齢まで）
export const 主人公の子の限り = 6;                // 主人公に生まれる子の数の限り
export const 縁談の齢の限り = 62;                // 主人公の齢がこれを過ぎれば縁談は来ない（core/hime.js 嫁がせられるか と同じ）
export { 元服の齢 };

export const 主人公の姓 = (s) => { const f = s.風雲; return f.姓 || 姓(f.名) || f.名; };
const 子ら = (s) => (s.風雲 && s.風雲.子ら) || [];
const 種の数 = (t) => Math.abs(String(t).split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) || 1;

/* 子が盤にいれば、その者（男子は武将、娘は姫）を返す */
export function 子の盤の者(s, c) {
  if (!c || !c.盤) return null;
  return c.性 === "男" ? (s.generals || []).find((x) => x.id === c.盤) || null : (s.hime || []).find((h) => h.id === c.盤) || null;
}
/* 子の齢。生まれた年を一つとし、年の改まり（正月）に一つずつ加える。元服（十五）はこの齢で見るので、男子も娘も正月に十五になる。
   盤に入った男子の武将の齢は、キャンペーンの決まりで四月に一つ加わるので、正月から三月までは一つ少なく見える */
export const 子の齢 = (s, c) => Math.max(1, (s.year || 0) - (c.生 || s.year || 0) + 1);
export function 子が生きるか(s, c) {
  if (!c || c.死) return false;
  if (!c.盤) return true;
  const 者 = 子の盤の者(s, c);
  return c.性 === "男" ? !!者 : !!者 && !者.死;
}
/* 子の呼び名：名を定めていればその名、まだなら幼名（男子は父の姓を冠する） */
export function 子の呼び名(s, c) {
  if (c.名) return c.名;
  return c.性 === "男" ? `${主人公の姓(s)}${c.幼名}` : c.幼名;
}

/* ---- 妻 ---- */
export function 主人公の妻(s) {
  const f = s && s.風雲; if (!f || !f.妻) return null;
  const h = (s.hime || []).find((x) => x.id === f.妻);
  return h && !h.死 ? h : null;
}
/* 妻を見る（月ごと）：妻が世を去っていれば帳から外す。大名なら、大名になってのちにキャンペーンの縁談で迎えた姫を妻とする */
export function 妻を見る(s) {
  const f = s && s.風雲; if (!f) return null;
  if (f.妻 && !主人公の妻(s)) {
    const h = (s.hime || []).find((x) => x.id === f.妻);
    if (h) 記す(s, `妻の${h.name}が世を去った。`);
    f.妻 = null;
  }
  if (!f.妻 && 風雲の大名か(s) && 主人公の武将(s) && f.大名) {
    const 始め = (f.大名.年 || 0) * 12 + (f.大名.月 || 0);
    const h = (s.hime || []).find((x) => !x.死 && x.嫁 && x.嫁.種 === "婚姻" && x.嫁.先 === s.player && (x.嫁.y || 0) * 12 + (x.嫁.m || 0) >= 始め);
    if (h) { f.妻 = h.id; 記す(s, `${(s.factions[h.faction] || {}).name || ""}より迎えた${h.name}を妻とした。`); }
  }
  return 主人公の妻(s);
}

/* ---- 縁談（大名になるまで） ---- */
/* 主君が娶らせる姫：家の姫で、城にいて嫁いでおらず、使いにも出ていない、子を生む齢の限りまでの者のうち、主人公と齢の近い者 */
export function 縁談の相手(s) {
  const g = 主人公の武将(s); if (!g || g.captive) return null;
  const 齢 = g.age || 主人公の齢(s);
  if (齢 > 縁談の齢の限り) return null;
  const 候 = (s.hime || []).filter((h) => h.faction === s.player && 姫の役(s, h) === "在城" && !h.嫁 && !h.務め && 姫の齢(s, h) <= 子を生む齢の限り);
  if (!候.length) return null;
  return [...候].sort((a, z) => Math.abs(姫の齢(s, a) - 齢) - Math.abs(姫の齢(s, z) - 齢) || String(a.id).localeCompare(String(z.id)))[0];
}
/* 正月に、主君が縁談を申し入れる（屋敷が問いを出す） */
export function 縁談を申し入れる(s) {
  const f = s && s.風雲;
  if (!f || f.討死 || 風雲の大名か(s) || !城主の段か(f.身分) || 主人公の妻(s) || f.縁談) return null;
  const h = 縁談の相手(s); if (!h) return null;
  const 当主 = (s.generals || []).find((x) => x.faction === s.player && x.lord && !x.captive);
  f.縁談 = { himeId: h.id, 年: s.year, 月: s.month, 当主: 当主 ? 当主.name : "" };
  return f.縁談;
}
/* 縁談に答える。受ければ「家臣に嫁がせる」と同じ縁組（婿は一門に列し、忠誠は揺るがない。姫は婿の城に入る） */
export function 縁談に答える(s, 受ける) {
  const f = s && s.風雲, 談 = f && f.縁談;
  if (!談) return { ok: false, 訳: "縁談は無い" };
  f.縁談 = null;
  const h = (s.hime || []).find((x) => x.id === 談.himeId), g = 主人公の武将(s);
  if (!h || h.死 || h.嫁 || h.faction !== s.player || !g || g.captive) { 記す(s, "縁談は流れた。"); return { ok: false, 訳: "その話はもう流れた" }; }
  if (!受ける) { 記す(s, `${談.当主 || "主君"}より${h.name}との縁談があったが、断った。`); return { ok: true, 受けた: false }; }
  g.一門 = true; g.縁 = h.id; g.loyal = Math.max(g.loyal == null ? 60 : g.loyal, 92);
  h.嫁 = { 種: "家臣", 先: g.id, y: s.year, m: s.month };
  if (g.at) h.at = g.at;
  f.妻 = h.id;
  const 家 = s.factions[s.player] || {};
  s.chronicle = [...(s.chronicle || []), { y: s.year, m: s.month, text: `${家.name || ""}は${h.name}を${g.name}に嫁がせた。${g.name}は一門に列した。` }];
  記す(s, `${談.当主 || "主君"}の計らいで${h.name}を妻に迎え、一門に列した。`);
  return { ok: true, 受けた: true };
}

/* ---- 子の生まれ ---- */
/* 幼名。男子は字を組み合わせ（「○丸」「○松」「○寿丸」など）、娘は「お○」。兄弟姉妹（娘は家の姫とも）で重ならないようにする。男子の幼名は、
   父の姓を冠したとき姓と名の分け方（core/util.js 姓名）が崩れない形を選ぶ（家督で同じ姓を血筋と見るため） */
const 男の頭 = ["竹", "松", "鶴", "亀", "虎", "犬", "熊", "万", "千", "長", "徳", "福", "吉", "梅", "菊", "辰", "国", "勝", "幸", "岩"];
const 男の尾 = ["丸", "松", "寿丸", "若丸", "王丸"];
export function 幼名を付ける(s, 性, rand = Math.random) {
  const 家 = (主人公の武将(s) || {}).faction || s.player;
  const 使った = new Set([...子ら(s).map((c) => c.幼名), ...(性 === "女" ? (s.hime || []).filter((h) => h.faction === 家).map((h) => h.name) : [])]);
  const 引く = (a) => a[Math.floor(rand() * a.length) % a.length];
  /* 賽で選び、重なれば順に探す */
  if (性 === "女") {
    const 試し = [...Array.from({ length: 30 }, () => `お${引く(HIME_NAMES)}`), ...HIME_NAMES.map((c) => `お${c}`)];
    return 試し.find((n) => !使った.has(n)) || 試し[0];
  }
  const 姓2 = 主人公の姓(s);
  const 試し = [...Array.from({ length: 60 }, () => 引く(男の頭) + 引く(男の尾)), ...男の頭.flatMap((a) => 男の尾.map((b) => a + b))];
  const 空き = 試し.filter((n) => !使った.has(n));
  return 空き.find((n) => 姓名(`${姓2}${n}`).名乗り === n) || 空き[0] || 試し[0];
}
/* 正月に子が生まれる（妻がいて、妻が子を生む齢の限りまでで、子が限りに達していなければ、見込みで）。返すのは生まれた子か null */
export function 子の生まれ(s, rand = Math.random, 告げる = null) {
  const f = s && s.風雲; if (!f || f.討死) return null;
  const 父 = 主人公の武将(s); if (!父 || 父.captive) return null;
  const 妻 = 主人公の妻(s); if (!妻) return null;
  if (姫の齢(s, 妻) > 子を生む齢の限り) return null;
  const 帳 = f.子ら || (f.子ら = []);
  if (帳.length >= 主人公の子の限り) return null;
  if (rand() >= 子の生まれる見込み) return null;
  const 性 = rand() < 0.5 ? "男" : "女";
  const 幼名 = 幼名を付ける(s, 性, rand);
  let n = 帳.length + 1, id = `fuun-ko-${s.year}-${n}`;
  while ((s.generals || []).some((x) => x.id === id) || (s.hime || []).some((h) => h.id === id) || 帳.some((c) => c.id === id)) id = `fuun-ko-${s.year}-${++n}`;
  const 器 = 子の器量(父);
  const c = { id, 性, 幼名, 名: null, 生: s.year, 母: 妻.id, 元服: null, 盤: null, 器, 名の候補: null };
  帳.push(c);
  const 文 = `${父.name}と${妻.name}のあいだに${性 === "男" ? "男子" : "女子"}が生まれた（幼名 ${幼名}）。`;
  記す(s, 文);
  if (告げる) 告げる(文);
  if (風雲の大名か(s)) 子を盤に(s);
  return c;
}

/* ---- 盤に入れる（大名になってから） ---- */
const 居城 = (s, fid) => {
  const g = 主人公の武将(s);
  const 我 = 主人公の城(s);
  if (我 && 我.faction === fid) return 我;
  const 在 = g && g.at ? (s.castles || []).find((c) => c.id === g.at && c.faction === fid) : null;
  if (在) return 在;
  const 本 = (s.factions[fid] || {}).本拠;
  return (s.castles || []).find((c) => c.id === 本 && c.faction === fid) || (s.castles || []).find((c) => c.faction === fid) || null;
};
export function 子を盤に(s) {
  const f = s && s.風雲; if (!f || !風雲の大名か(s)) return 0;
  const 父 = 主人公の武将(s);
  const fid = 父 ? 父.faction : s.player;
  const 城 = 居城(s, fid);
  let 入れた = 0;
  for (const c of f.子ら || []) {
    if (c.盤 || c.死) continue;
    const 器 = c.器 || { lead: 50, valor: 50, wit: 50, gov: 50 };
    if (c.性 === "男") {
      /* キャンペーンの子の生まれ（core/house.js bearChild）と同じ形。親子の控えに父を記す（家督の跡目に連なる） */
      s.generals.push({ id: c.id, name: 子の呼び名(s, c), faction: fid, lead: 器.lead, valor: 器.valor, wit: 器.wit, gov: 器.gov,
        loyal: 96, age: 子の齢(s, c), at: 城 ? 城.id : null, 本領: 城 ? 城.id : null, retinue: 60, retTrain: 55,
        unity: 60, merit: 0, fief: 200, rost: newRoster(60, `ret-${c.id}`), 架空: true, 風雲の子: true });
      s.親 = s.親 || {}; s.親[c.id] = 風雲の主のid;
    } else {
      if (!c.元服) continue;                                    // 娘は名を定めてから世に出る（キャンペーンの姫は十五で世に出る）
      s.hime = s.hime || [];
      s.hime.push({ id: c.id, name: c.名, faction: fid, at: 城 ? 城.id : null, born: (c.生 || s.year) - 1, dip: 器.wit, lead: 器.lead,
        架空: true, 伝: "", 死: false, 嫁: null, 務め: null, 父: 風雲の主のid, 母: c.母 || null, 風雲の子: true });
    }
    c.盤 = c.id; 入れた++;
  }
  return 入れた;
}

/* ---- 元服（十五で名を定める） ---- */
export function 元服の名の候補(s, c) {
  const f = s.風雲, rng = makeRng(種の数(`${c.id}-${s.year}`));
  const 候補 = [];
  if (c.性 === "男") {
    const 姓2 = 主人公の姓(s);
    const 名乗り = f.名乗り || 姓名(f.名).名乗り;
    const 通字 = /^[一-龯]{2}$/.test(名乗り || "") ? 名乗り[0] : null;
    const 使った = new Set([...(s.generals || []).map((x) => x.name), ...子ら(s).map((x) => x.名).filter(Boolean)]);
    const n = KANJI_TSUJI.length;
    for (let i = 0; i < 400 && 候補.length < 4; i++) {
      const a = 通字 || KANJI_TSUJI[Math.floor(rng() * n) % n], b = KANJI_TSUJI[Math.floor(rng() * n) % n];
      if (a === b) continue;
      const 名 = a + b;
      if (使った.has(姓2 + 名) || 候補.includes(名)) continue;
      候補.push(名);
    }
    return 候補;
  }
  /* 娘：幼名の字の「○姫」と幼名そのもの、ほかに「○姫」。主人公の家の姫と兄弟姉妹の名とは重ねない（他家の姫と同じ名はありうる） */
  const 字 = String(c.幼名 || "").replace(/^お/, "");
  const 家 = (主人公の武将(s) || {}).faction || s.player;
  const 使った = new Set([...(s.hime || []).filter((h) => h.faction === 家 && h.id !== c.id).map((h) => h.name), ...子ら(s).filter((x) => x.id !== c.id).map((x) => x.名).filter(Boolean)]);
  const 試す = (x) => { if (x && !使った.has(x) && !候補.includes(x)) 候補.push(x); };
  試す(`${字}姫`); 試す(c.幼名); if (候補.length < 2) 試す(`${字}の方`);
  for (let i = 0; i < 200 && 候補.length < 4; i++) 試す(`${HIME_NAMES[Math.floor(rng() * HIME_NAMES.length) % HIME_NAMES.length]}姫`);
  for (const ch of HIME_NAMES) { if (候補.length >= 4) break; 試す(`${ch}姫`); }
  return 候補;
}
/* 名を定めるのを待つ子（十五になり、名の候補が支度されている子） */
export const 元服を待つ子 = (s) => 子ら(s).filter((c) => !c.元服 && c.名の候補 && 子が生きるか(s, c) && 子の齢(s, c) >= 元服の齢);
/* 元服させる（名を定める）。男子の名は姓を除いた名（姓は父の姓を継ぐ）、娘は名。返すのは { ok, 訳 } */
export function 元服させる(s, id, 名) {
  const f = s && s.風雲; if (!f) return { ok: false, 訳: "風雲ではない" };
  const c = (f.子ら || []).find((x) => x.id === id);
  if (!c) return { ok: false, 訳: "その子はいない" };
  if (c.元服) return { ok: false, 訳: "すでに名を定めた" };
  if (!子が生きるか(s, c)) return { ok: false, 訳: "その子はもういない" };
  const 名2 = String(名 || "").trim();
  if (!名2) return { ok: false, 訳: "名を入れてください" };
  if (名2.length > 名乗りの限り) return { ok: false, 訳: `名は${名乗りの限り}字までです` };
  const 旧 = 子の呼び名(s, c);
  c.名 = c.性 === "男" ? `${主人公の姓(s)}${名2}` : 名2;
  c.元服 = { 年: s.year, 月: s.month }; c.名の候補 = null;
  const 者 = 子の盤の者(s, c);
  if (者) 者.name = c.名;
  const 文 = c.性 === "男" ? `${旧}が元服し、${c.名}と名乗った。` : `${旧}が十五になり、名を${c.名}と定めた。`;
  記す(s, 文);
  s.chronicle = [...(s.chronicle || []), { y: s.year, m: s.month, text: 文 }];
  子を盤に(s);
  return { ok: true };
}

/* ---- 月送りから呼ぶ（govern/month.js） ---- */
/* 正月（年の改まり）：縁談の申し入れと、子の生まれ */
export function 風雲の家の正月(s, { 告げる = null, rand = Math.random } = {}) {
  if (!s || !s.風雲) return s;
  妻を見る(s);
  縁談を申し入れる(s);
  子の生まれ(s, rand, 告げる);
  return s;
}
/* 月ごと：妻を見る・大名なら子を盤に入れる・十五になった子の名の候補を支度する・流れた縁談を捨てる */
export function 風雲の家の月(s) {
  const f = s && s.風雲; if (!f) return s;
  妻を見る(s);
  子を盤に(s);
  for (const c of f.子ら || []) {
    if (c.元服 || c.名の候補 || !子が生きるか(s, c) || 子の齢(s, c) < 元服の齢) continue;
    c.名の候補 = 元服の名の候補(s, c);
  }
  if (f.縁談) {
    const h = (s.hime || []).find((x) => x.id === f.縁談.himeId);
    if (!h || h.死 || h.嫁 || h.faction !== s.player || 風雲の大名か(s)) f.縁談 = null;
  }
  return s;
}
