/* 効果音の段（GDD 15.4 の追補）。

   合戦に効果音を添える。音はどれも新しく作ったもので、録音の調べ（rokuon.js）と同じく
   盤（index.html）の中には入れず、dist/se/ に別の札として置く（二十一の札・約1.9MB）。

   音は四つの類に分けて鳴らす。

     一打 … 一度だけ鳴らす。隊を選ぶ音（自軍・敵）・焙烙・法螺貝・陣太鼓・鉄砲・弓・勝鬨
     知らせ … 盤の下に出る知らせ（有利・不利）。鳴るあいだ、曲を少し（六割まで）絞る
     締め … 戦の終わりの短い曲（勝ち・負け）。鳴るあいだ、曲を深く（一割余りまで）絞り、
            終われば戻す。兵の音（地）は退かせる
     地　 … 拡大したときの兵の音（行軍・接戦・突撃・接敵）と軍船の音。どれも八秒で途切れ
            なく繰り返す。鳴らすのは一つだけで、替えるときは〇.八秒かけて入れ替える

   音の大きさは札の側で揃えてある（曲が −16 LUFS、地は −19〜−24、知らせは瞬間で −16、
   締めは −12〜−14.5）。鳴らす側は、ふつうは音量を渡さずに鳴らせばよい。

   続けざまに鳴らさない決まりを三つ置く（盤の都合で何度呼ばれても、耳がうるさくならぬよう）。
     一、同じ一打は〇.〇八秒のうちに二度鳴らさない（隊を選ぶ音を連打されても重ねない）
     二、知らせは、どれであれ〇.五秒に一つまで
     三、同時に鳴る一打は八つまで（超えたら古いものから止める）

   継ぎ目について。地の五つは札の全長がちょうど八秒の一周である。録音の調べと同じく、
   MP3 の頭の短い無音（呼び水）をブラウザが取り除くか残すかが違うので、一周の頭の形
   （指紋）と突き合わせて本当の起点を探し（rokuon.js 起点を探す）、loopStart と loopEnd で
   巻き戻す。一打・知らせ・締めは頭から鳴らす（呼び水が残っても〇.〇三秒に満たない）。

   鳴らせぬ所（file:// で開いた一枚物・Artifacts・音の座の無い所）では、何もせずに
   false を返す。盤は止めない。

   音量と入切は、音の座（oto.js）の主の口を通すので、そちらの設定がそのまま効く。
   音を切っているあいだは鳴らさない（入 を渡してもらう）。 */
import { 起点を探す, 録音を絞る } from "./rokuon.js";

export const 地の周 = 8;            // 秒。地の一周
export const 地の交差 = 0.8;        // 秒。地を入れ替える長さ
export const 一打の間 = 0.08;       // 秒。同じ一打を二度鳴らさない間
export const 知らせの間 = 0.5;      // 秒。知らせはこれに一つまで
export const 一打の限り = 8;        // 同時に鳴る一打の数の上限

/* 札。長は秒（解き直した全長）。急ぎ … 押した手応えの音。読み込みが遅れて〇.六秒を
   過ぎたら、もう鳴らさない（遅れて鳴ると、押したのとは別の物音に聞こえるため）。 */
export const 効果の札 = {
  自軍を選ぶ: { 札: "se_sel_mikata.mp3", 類: "一打", 長: 0.784, 急ぎ: true, 題: "小鼓の「ポン」" },
  敵を選ぶ: { 札: "se_sel_teki.mp3", 類: "一打", 長: 0.62, 急ぎ: true, 題: "大鼓の「カン」と鉦" },
  行軍: { 札: "se_march.mp3", 類: "地", 長: 8, 題: "草鞋の足音と小札の擦れ" },
  接戦: { 札: "se_engage.mp3", 類: "地", 長: 8, 題: "駆け足と鎧、軍勢の「わーっ」" },
  突撃: { 札: "se_charge.mp3", 類: "地", 長: 8, 題: "数百騎の蹄の地鳴りと軍勢の声" },
  接敵: { 札: "se_melee.mp3", 類: "地", 長: 8, 題: "刀の打ち合い・槍の柄・鎧・足さばき" },
  軍船: { 札: "se_ship.mp3", 類: "地", 長: 8, 題: "波・櫓の一漕ぎ・櫓杭の軋み" },
  焙烙: { 札: "se_horoku.mp3", 類: "一打", 長: 3.79, 題: "導火・風切り・割れ・炸裂・火" },
  有利: { 札: "se_notice_good.mp3", 類: "知らせ", 長: 1.7, 題: "琴が駆け上がり鈴が鳴る" },
  不利: { 札: "se_notice_bad.mp3", 類: "知らせ", 長: 1.9, 題: "低い太鼓と三味線の下がる音" },
  野戦の勝ち: { 札: "se_win_field.mp3", 類: "締め", 長: 4.7, 題: "疾風の陣の角笛の動機をホ長調で" },
  野戦の負け: { 札: "se_lose_field.mp3", 類: "締め", 長: 5.3, 題: "尺八がホ短調で下がって消える" },
  城を落とす: { 札: "se_win_castle.mp3", 類: "締め", 長: 5.8, 題: "攻城の刻の頭からハ長調へ、城の鐘" },
  城攻めの退き: { 札: "se_lose_castle.mp3", 類: "締め", 長: 5.2, 題: "重い低音と退き鉦三つ" },
  決戦の勝ち: { 札: "se_win_kessen.mp3", 類: "締め", 長: 6, 題: "天下決戦の主題をニ長調で、大銅鑼" },
  決戦の負け: { 札: "se_lose_kessen.mp3", 類: "締め", 長: 6, 題: "宿命の動機を低い金管と男声で、梵鐘" },
  法螺貝: { 札: "se_horagai.mp3", 類: "一打", 長: 6.092, 題: "法螺の一吹きと、遠くの応え" },
  陣太鼓: { 札: "se_jindaiko.mp3", 類: "一打", 長: 5.627, 題: "二打のあと連打して一打で止める" },
  鉄砲: { 札: "se_teppo.mp3", 類: "一打", 長: 3.019, 題: "揃いきらない斉射と山の返し" },
  弓: { 札: "se_yumi.mp3", 類: "一打", 長: 2.477, 題: "弦・頭上を抜ける矢・刺さる音" },
  勝鬨: { 札: "se_kachidoki.mp3", 類: "一打", 長: 4.146, 題: "大将の「えい、えい」と軍勢の「おう」" },
};

/* 指紋。地の五つの一周の頭 2048 標本（44.1kHz、左右を均したもの）を ±127 に縮め、
   base64 にした。音を作り直したら、指紋も作り直すこと（tools/se/README.md）。 */
export const 効果の指紋 = {
  行軍: "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",
  接戦: "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",
  突撃: "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",
  接敵: "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",
  軍船: "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",
};

const 状 = {
  座: null, 主: null, 根: "se/", 入: () => true,
  生: new Map(),      // 名 → 圧したままの札（Promise<ArrayBuffer>）
  解: new Map(),      // 名 → 解いたもの（Promise<{ 布, 起点 }>）。使った順に十二まで
  地: null,           // いま鳴っている地 { 名, 源, 声, 音量 }
  地の番: 0,          // 地の指図の番号。後から来た指図が勝つ
  一打: [],           // 鳴っている一打 { 名, 源, 声 }
  最後: new Map(),    // 名 → 最後に鳴らした時（座の時計）
  知らせの時: -1e9,
  締めの終: -1e9,     // 締めが鳴り終わる時。それまでは知らせで曲を絞り直さない
};

const 持つ = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export const 効果がある = (名) => 持つ(効果の札, 名);

/* 札の置き場（根）。盤に差してあればそれを使う。第二試作版のように盤が一段深い所では、
   録音の根（"../bgm/"）に倣って "../se/" とする。 */
function 根を決める(根) {
  if (typeof 根 === "string" && 根) return 根;
  if (typeof window !== "undefined") {
    if (typeof window.__効果の根 === "string" && window.__効果の根) return window.__効果の根;
    if (typeof window.__録音の根 === "string" && window.__録音の根) return window.__録音の根.replace(/bgm\/?$/, "se/");
  }
  return "se/";
}

/* 音の座（oto.js）の座と主の口を借りる。入 … 音が入っているかを返す関数。 */
export function 効果の座を据える(座, 主, { 根, 入 } = {}) {
  状.座 = 座;
  状.主 = 主;
  状.根 = 根を決める(根);
  状.入 = typeof 入 === "function" ? 入 : () => true;
}

const 使える = () => !!(状.座 && 状.主 && 状.座.decodeAudioData && typeof fetch === "function" && 状.入());
const 時計 = () => (状.座 ? 状.座.currentTime : 0);

/* 圧したままの札を読む。しくじれば忘れて、次の折に読み直す。 */
function 生を読む(名) {
  if (状.生.has(名)) return 状.生.get(名);
  const p = fetch(状.根 + 効果の札[名].札).then((r) => {
    if (!r.ok) throw new Error("札が無い（" + r.status + "）");
    return r.arrayBuffer();
  });
  p.catch(() => 状.生.delete(名));
  状.生.set(名, p);
  return p;
}

/* 札を解いて、鳴らせる形にする。地は指紋で起点を探す。解いたものは十二まで抱える
   （一打と締めを合わせて二十余り、伸ばすと四十MB近くになるため）。 */
function 解く(名) {
  if (状.解.has(名)) {
    const p = 状.解.get(名);
    状.解.delete(名);               // 使った順に並べ直す
    状.解.set(名, p);
    return p;
  }
  const p = 生を読む(名)
    .then((ab) => new Promise((res, rej) => {
      const q = 状.座.decodeAudioData(ab.slice(0), res, rej);
      if (q && q.then) q.then(res, rej);
    }))
    .then((布) => {
      let 起点 = 0;
      if (効果の札[名].類 === "地") {
        const 左 = 布.getChannelData(0);
        const 右 = 布.numberOfChannels > 1 ? 布.getChannelData(1) : 左;
        起点 = 起点を探す(左, 右, 布.sampleRate, 効果の指紋[名]);
      }
      return { 布, 起点 };
    });
  p.catch(() => 状.解.delete(名));
  状.解.set(名, p);
  while (状.解.size > 12) {
    const 古 = [...状.解.keys()].find((k) => k !== 名 && !(状.地 && 状.地.名 === k));
    if (!古) break;
    状.解.delete(古);
  }
  return p;
}

function 退かせる(声, 源, 長) {
  if (!声 || !源 || !状.座) return;
  const 時 = 時計(), L = Math.max(0.02, 長);
  try {
    const g = 声.gain;
    g.cancelScheduledValues(時);
    g.setValueAtTime(Math.max(0.0001, g.value), 時);
    g.linearRampToValueAtTime(0.0001, 時 + L);
    源.onended = () => { try { 声.disconnect(); } catch (e) { /* 既に外れていてよい */ } };
    源.stop(時 + L + 0.05);
  } catch (e) { /* 止めそこねても盤は止めない */ }
}

/* 声（音量の口）を作る。左右（-1〜1）は、座が知っていれば振る。 */
function 声を作る(音量, 左右) {
  const 座 = 状.座;
  const 声 = 座.createGain();
  声.gain.setValueAtTime(Math.max(0.0001, 音量), 座.currentTime);
  if (左右 && 座.createStereoPanner) {
    const 振 = 座.createStereoPanner();
    振.pan.setValueAtTime(Math.max(-1, Math.min(1, 左右)), 座.currentTime);
    振.connect(状.主);
    声.connect(振);
  } else {
    声.connect(状.主);
  }
  return 声;
}

/* 一打・知らせを鳴らす。鳴らせたら true。地の名を渡せば 兵の音を掛ける に、締めの名を
   渡せば 締めを鳴らす に回す。

   音量 … 札の大きさに掛ける倍（既定 1）。左右 … -1（左）〜 1（右）。
   間 … 同じ音をこの秒数のうちには二度鳴らさない（既定は 一打の間 の〇.〇八秒）。下知の
        たびに鳴らす陣太鼓・鉄砲・弓のように、続けて呼ばれうる音に渡す（八秒など）。 */
export function 効果を鳴らす(名, { 音量 = 1, 左右 = 0, 間 = 一打の間 } = {}) {
  if (!効果がある(名) || !使える()) return Promise.resolve(false);
  const k = 効果の札[名];
  if (k.類 === "地") return 兵の音を掛ける(名, { 音量 });
  if (k.類 === "締め") return 締めを鳴らす(名, { 音量 });
  const 頼んだ = 時計();
  if (頼んだ - (状.最後.has(名) ? 状.最後.get(名) : -1e9) < Math.max(一打の間, Number(間) || 0)) return Promise.resolve(false);
  if (k.類 === "知らせ") {
    if (頼んだ - 状.知らせの時 < 知らせの間) return Promise.resolve(false);
    状.知らせの時 = 頼んだ;
  }
  状.最後.set(名, 頼んだ);
  return 解く(名).then(({ 布, 起点 }) => {
    if (!使える()) return false;
    if (k.急ぎ && 時計() - 頼んだ > 0.6) return false;      // 遅れた手応えは鳴らさない
    const 座 = 状.座, 時 = 座.currentTime;
    const 声 = 声を作る(音量, 左右);
    const 源 = 座.createBufferSource();
    源.buffer = 布;
    源.connect(声);
    const 済 = { 名, 源, 声 };
    源.onended = () => {
      try { 声.disconnect(); } catch (e) { /* 既に外れていてよい */ }
      状.一打 = 状.一打.filter((x) => x !== 済);
    };
    源.start(時, 起点);
    状.一打.push(済);
    while (状.一打.length > 一打の限り) {
      const 古 = 状.一打.shift();
      退かせる(古.声, 古.源, 0.05);
    }
    if (k.類 === "知らせ" && 時 >= 状.締めの終) 録音を絞る(0.6, Math.max(0.3, k.長 - 0.6), 0.8);
    return true;
  }).catch(() => false);
}

/* 締め（戦の終わりの曲）を鳴らす。鳴るあいだ曲を深く絞り、終われば戻す。地は退かせる。 */
export function 締めを鳴らす(名, { 音量 = 1 } = {}) {
  if (!効果がある(名) || 効果の札[名].類 !== "締め" || !使える()) return Promise.resolve(false);
  const k = 効果の札[名];
  const 頼んだ = 時計();
  if (頼んだ - (状.最後.has(名) ? 状.最後.get(名) : -1e9) < 1) return Promise.resolve(false);
  状.最後.set(名, 頼んだ);
  return 解く(名).then(({ 布, 起点 }) => {
    if (!使える()) return false;
    const 座 = 状.座, 時 = 座.currentTime;
    兵の音を掛ける(null);
    録音を絞る(0.12, Math.max(0.5, k.長 - 0.6), 1.5);
    状.締めの終 = 時 + k.長;
    const 声 = 声を作る(音量, 0);
    const 源 = 座.createBufferSource();
    源.buffer = 布;
    源.connect(声);
    const 済 = { 名, 源, 声 };
    源.onended = () => {
      try { 声.disconnect(); } catch (e) { /* 既に外れていてよい */ }
      状.一打 = 状.一打.filter((x) => x !== 済);
    };
    源.start(時, 起点);
    状.一打.push(済);
    return true;
  }).catch(() => false);
}

/* 地（拡大したときの兵の音・軍船の音）を掛ける。null なら止める。同じ地が鳴っていれば
   音量だけ合わせる。読み込みを待つ間は前の地を鳴らし続け、整ったら交差のあいだに
   入れ替える。 */
export function 兵の音を掛ける(名, { 交差 = 地の交差, 音量 = 1 } = {}) {
  if (名 == null) {
    状.地の番++;
    const 今 = 状.地;
    状.地 = null;
    if (今) 退かせる(今.声, 今.源, 交差);
    return Promise.resolve(true);
  }
  if (!効果がある(名) || 効果の札[名].類 !== "地" || !使える()) return Promise.resolve(false);
  if (状.地 && 状.地.名 === 名) {
    if (Math.abs(状.地.音量 - 音量) > 0.01) {
      const g = 状.地.声.gain, 時 = 時計();
      try {
        g.cancelScheduledValues(時);
        g.setValueAtTime(Math.max(0.0001, g.value), 時);
        g.linearRampToValueAtTime(Math.max(0.0001, 音量), 時 + 0.3);
      } catch (e) { /* 合わせそこねても進む */ }
      状.地.音量 = 音量;
    }
    return Promise.resolve(true);
  }
  const 番 = ++状.地の番;
  return 解く(名).then(({ 布, 起点 }) => {
    if (番 !== 状.地の番) return true;          // 待つ間に別の指図が来た。そちらに任せる
    if (!使える()) return false;
    const 座 = 状.座, 時 = 座.currentTime;
    const 声 = 声を作る(0.0001, 0);
    声.gain.linearRampToValueAtTime(Math.max(0.0001, 音量), 時 + Math.max(0.02, 交差));
    const 源 = 座.createBufferSource();
    源.buffer = 布;
    源.loop = true;
    源.loopStart = 起点;
    源.loopEnd = 起点 + Math.min(地の周, 布.duration - 起点);
    源.connect(声);
    源.start(時, 起点);
    const 前 = 状.地;
    if (前) 退かせる(前.声, 前.源, 交差);
    状.地 = { 名, 源, 声, 音量 };
    return true;
  }).catch(() => (番 === 状.地の番 ? false : true));
}

/* 効果音をすべて止める（音を切ったとき・合戦の画面を離れるとき）。 */
export function 効果を止める(交差 = 0.3) {
  兵の音を掛ける(null, { 交差 });
  for (const x of 状.一打) 退かせる(x.声, x.源, 交差);
  状.一打 = [];
}

/* 圧したままの札を先に読んでおく（解くのは鳴らす折）。押した手応えの音と知らせは、
   最初の一度で待たせぬよう、解くところまで済ませる。 */
export function 効果を先に読む(名ら = Object.keys(効果の札)) {
  if (!使える()) return Promise.resolve([]);
  const 急ぐ = ["自軍を選ぶ", "敵を選ぶ", "有利", "不利"];
  return Promise.all(名ら.filter(効果がある).map((n) => 生を読む(n).then(() => n, () => null)))
    .then((読めた) => {
      for (const n of 急ぐ) if (読めた.includes(n)) 解く(n).catch(() => {});
      return 読めた;
    });
}

/* 様子。鳴らないと言われたとき、どこで止まっているかを判じるための一言。 */
export const 効果の様子 = () => ({
  地: 状.地 ? 状.地.名 : null,
  一打: 状.一打.map((x) => x.名),
  読めた: [...状.生.keys()],
  解けた: [...状.解.keys()],
  根: 状.根,
  座: !!状.座,
});

/* 試験のため、読んだ札・解いたもの・鳴っている音の控えを空にする。 */
export function 効果の控えを空にする() {
  状.地の番++;
  状.地 = null;
  状.一打 = [];
  状.生.clear();
  状.解.clear();
  状.最後.clear();
  状.知らせの時 = -1e9;
  状.締めの終 = -1e9;
}

/* 盤の外から確かめるための口（ブラウザの開発者の道具から呼べる）。 */
if (typeof window !== "undefined") {
  window.__効果 = { 鳴らす: 効果を鳴らす, 地: 兵の音を掛ける, 締め: 締めを鳴らす, 止める: 効果を止める, 様子: 効果の様子 };
}
