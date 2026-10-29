/* 録音の調べ（GDD 15.4 の追補）。

   政務・野戦・城攻めの三つの場面に、管弦の録音を添える。旋律はいずれも新しく作った
   もので、和の音階（民謡・都節）に、尺八・琴・三味線・太鼓・梵鐘・銅鑼を重ねてある。

     政務　「天下静謐」  七十五拍・四十小節・二分八秒      bgm_seimu.mp3      1.56MB
     野戦　「疾風の陣」  百五十拍・五十六小節・一分三十秒  bgm_yasen.mp3      1.12MB
     城攻め「攻城の刻」  百拍・四十小節・一分三十六秒      bgm_shirozeme.mp3  1.21MB

   録音は盤（index.html）の中には入れず、dist/bgm/ に別の札として置く。盤を重くせぬ
   ためで、場面に入った折に、その一曲だけを読みに行く。

   鳴らせぬ所が三つある。いずれも「鳴らせぬ」（false）と返すので、合成の調べ
   （kyoku.js）に戻せばよい。
     一、file:// で開いた一枚物 ── ブラウザが脇の札を読ませぬ
     二、Artifacts ── 外の札を読みに行けぬ
     三、音の座の無い所（試験・古い端末）

   継ぎ目について。札の全長がちょうど一周になるよう作ってある。loopStart と loopEnd で
   巻き戻すので、継ぎ目に隙間は出ない。ただし MP3 は頭に「呼び水」と呼ぶ短い無音
   （数百から千余りの標本）を抱えていることがあり、取り除くか残すかはブラウザによって
   違う。そこで一周の頭の形を「指紋」として控えておき、読み込んだものの頭と突き合わせて、
   本当の起点を探す。

   重さについて。解いた（伸ばした）録音は、一曲で三十〜五十MBの記憶を食う。三曲とも
   抱えると携帯には重いので、解いたものは二曲まで（鳴っている曲と、直前の曲）に限る。
   圧したままの札（一曲一MB余り）は覚えておき、解き直しで済ませる。

   音量と入切は、音の座（oto.js）の主の口を通すので、そちらの設定がそのまま効く。 */

export const 録音の曲 = {
  政務: { 札: "bgm_seimu.mp3", 周: 128, 題: "天下静謐" },
  野戦: { 札: "bgm_yasen.mp3", 周: 89.6, 題: "疾風の陣" },
  城攻め: { 札: "bgm_shirozeme.mp3", 周: 96, 題: "攻城の刻" },
};

/* 指紋。一周の頭 2048 標本（44.1kHz、左右を均したもの）を ±127 に縮め、base64 にした。
   曲を作り直したら、指紋も作り直すこと（tools/bgm/README.md）。 */
export const 録音の指紋 = {
  政務:
    "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",
  野戦:
    "9fT09PPz8/Pz9PX29/j49/f39/f3+Pj5+/0AAgUGBwgHBAD8+vn3+Pr+AgYICAkKCQgHBQMCAgQGBwgJCw0PERMTEg8NDhEUFRUUDgX89fLu6ufl4+Li5unq7PDy8ezm4uDh5uzu7e7w8/f9AgMEBQP/+/v7/gIGCw4QEQ8MCQkMDQ4RExgeJCgrLConIRsXGBcSDAX/+/n39vf5/P8DBwsOEhcYFhQTEQ8PEBAQDAgHCAkKCQcD//nz8vP09/wCBAH//v/++/f08Ori29XS0dPW3OLj4uDf3dzb3N7d293h5Obl4+Pk5OPj5eXl6e/1+v4AAgQGBQL/+vHn39rY2dzg5u3y9vn9AAD9+PTx8O/v8PHx7ejm5eLd2dfY29zd3t3b2tnY1M3HxMPEx8rO09ne4uPh3tzc3N7g4uPk4+Hg4eLi4uHg4ODh4+br8PT3+/4AAAD79fXw7fD09/f3+Pr8/f4DCQwMCwoHAfr17unk4Nzc5O3z+fz9+/r7/f779vT4AAcNEhIQERELAwECAgAAAwcMExgcHyAgHx0ZEw4G/PTv7/Hy7+ro6evq7fP39/r+AwQEBQkMEBMUFhobGx8kKS4yNDU0MjE1OTo6PEBCREVFRUdKTE1NS0lGRENAOzMtLC0tKigqLjI2O0FDQ0JAPjw4My4pJSIgISMlJygrLjI2Oz9CRklOUlRVV1laW1xbW1tcXV5fYGBeW1ZUVVdXVFNTU1NQTUtMT05JREFAQUJBQD06OTxAQkVFRERGR0Q/OTQvKSIeHR8gISMlJiQgGhgYGBkaGxwcGhcUEQ4KBQD8+vj29vj59/X08/Lx7+vn4d3Z2NjZ2trX1dLPzMzNzMrJyMnKzM3My8vMzMzLy8zNz9HR0dDNycXAvbm3t7m3tLO0tLO0tbWzsLCyuLy8vcDDxMXGx8jJysvKycjGxsjLzM3Oz9HU1dbW1tfW1dTU1djb3Nza2NbV09LRz8zJx8TCwcG/vLm4trSys7W4ubm5ubm7vb68u7y/wsTExMPBvbm4ubizraqnpKGgn5+enJqYlpSSkZGRkZOWm56go6Wmp6iqrK6wsrKxsK6rq66wsK6qqKqrqqmqrrK0trvBx8rLy8vMzM3O0dPW19jY2NjY19fY2trc3uDg4ePl5uXj4uPk5OTm6Ovt8PT3+/4AAwgLDxIVGBgXGBsdHiAiJSgqKysrLTE1OT9DR0lNU1pfZGZkYF1cXF1fY2ViXVtbW1taWVlbXF1dXl9fX19gYWRnamtqaWhpbHBydXh7fn5+fn59fH1+fXx6eHd5e3x9fHh0c3NycXFycnJ1d3h4d3p8eXV0cnFzeHx+f357eHNva2dlYmFhYWBgYWNkZWZlYVtYVVFMSktLS0tKSEZDQUBAQEBCRUZGRENDQ0NDQT8+P0BAQEBAPjw8Ozs6Ojo5ODgzLSopJyQgHRsaGhgWExIQDQsIBgUFBQYGBQMBAAECAwQEBQUDAQECAgD+/f7///78+vj39fLv7Ovr6unn5OHf3t7g4d/d3NrX1dPQzMrLy8nHxsK9u7u+wsXGx8jJysnIys7Pzs7Q0c/MysjIycrKysnIyMjIyMfGx8fGxcTDw8TGx8fIyszN0NLS0dDOycbFw8HAwcDBwsG/u7m3tbOup6SjoqCenJuam56ipaamp6mopqWorK2sq6uqpqSioqKioaGgn56en6Cdm5mYlJCOjIqJiImIhoeLj5KTkpCQkZOWmJqam5ubnJydnqGjo6Ggn56cmpqbnJ2enZubnJ2dnqCipKitsbS2uru+wsTGx8rO0dPW2t7h4+Tk5ufn6Ovu8fP19vf39vX08e7t7u7u7evr6ubk5uvv8PDy9PX29/j4+vz9AAMGCQwOEBETFhgbHiAiJCgqKikqKiknJSMkJSUlJiktMTU4Ojo8PT08PT8/P0BCREVFRURBP0BCRklMTlJVWFhZWVhZW1tXU1JUV1pdXFpaW1pYWFhYWVpbXFxcXF5fXlxaWVhZXF1dX2FiY2VnaWpqamprbW5vbm1ra2xubm5tbm9vb29wcHN3d3NvbWxubWpoaGhmZWZpamhnZWNiYWJkZWRiYGFgXl5fX11dXl1bWFVVV1hXVFJRUE9NS0hFQDw6OTg2Mi8tKyglIh4bGhoZGBkYFhQVFxsaFxUVFBQSDgwLCwoJCAcHCAgIBgQEAwH9+fj39PHw7+3q5+Xj4eDh4uLf3NjW1tbX19XU09LR0dLS0tTV1dLOzczNzcvJyszMysnJyMfIycvMy8nGxMPDxMfJysvLysnIyMnJyMfIx8XEx8nMzMvJxsbIycnJysrJyMbFxMPDxMTFxcXIycfHyszNz8/Q0tLS0tLR0tPRz83NzcvJysrLzM3Nzs/Q0dHR0tLR0M7Ozs3MzM3P0NLRz87NztPY293e3t3c3N3f4OLj5OXm6Ort7vDy8vHv7fDy8vHy8/Py8vLy8vLy8fHw8PLy8O/v8PDt7O7w8e/t7O3u7u/v7+3q5+Tl5+jn5eXk4uDe3uHj4eHh4N3b29zd3uHi4uLi4uLk5ufm5eLi5OTj4eLi5Obm4t/d29jV1dfV09PV1dHP0NLS0M/Q09XV19jX19jY2tzd3d7e3uHl5+fm5ufo6Onp6+/x7+zu8fLy8fLv7Ozv8fT3+vz+AQMDBAUGBwkMEBERERESFBcZGxoXFxcXFhUVFRUWGBobHSAhISEhISMkIiAiJScnJykpKCgrLi8=",
  城攻め:
    "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",
};

const 状 = {
  座: null, 主: null, 根: "bgm/",
  生: new Map(),      // 名 → 圧したままの札（Promise<ArrayBuffer>）
  解: new Map(),      // 名 → 解いたもの（Promise<{ 布, 起点, 周 }>）。二曲まで
  今: null,           // いま鳴っている録音 { 名, 源, 声, 起点, 周 }
  番: 0,              // 指図の番号。後から来た指図が勝つ
  残りを読んだ: false,
};

/* 音の座（oto.js）の座と主の口を借りる。根は札の置き場（盤から見た相対の住所）。 */
export function 録音の座を据える(座, 主, { 根 = "bgm/" } = {}) {
  状.座 = 座;
  状.主 = 主;
  状.根 = 根;
}

export const 録音がある = (名) => Object.prototype.hasOwnProperty.call(録音の曲, 名);

const 使える = () => !!(状.座 && 状.主 && 状.座.decodeAudioData && typeof fetch === "function");

/* 圧したままの札を読む。しくじれば忘れて、次の折に読み直す。 */
function 生を読む(名) {
  if (状.生.has(名)) return 状.生.get(名);
  const p = fetch(状.根 + 録音の曲[名].札).then((r) => {
    if (!r.ok) throw new Error("札が無い（" + r.status + "）");
    return r.arrayBuffer();
  });
  p.catch(() => 状.生.delete(名));
  状.生.set(名, p);
  return p;
}

/* 札を解いて、鳴らせる形（AudioBuffer）にする。解いたものは二曲まで抱える。 */
function 解く(名) {
  if (状.解.has(名)) {
    const p = 状.解.get(名);
    状.解.delete(名);               // 使った順に並べ直す（古いものから手放すため）
    状.解.set(名, p);
    return p;
  }
  const p = 生を読む(名)
    .then((ab) => new Promise((res, rej) => {
      // 写しを渡す。解く道具は元を使い潰すので、元は解き直しのために残す
      const q = 状.座.decodeAudioData(ab.slice(0), res, rej);
      if (q && q.then) q.then(res, rej);
    }))
    .then((布) => {
      const 左 = 布.getChannelData(0);
      const 右 = 布.numberOfChannels > 1 ? 布.getChannelData(1) : 左;
      const 起点 = 起点を探す(左, 右, 布.sampleRate, 録音の指紋[名]);
      const 周 = Math.min(録音の曲[名].周, 布.duration - 起点);
      return { 布, 起点, 周 };
    });
  p.catch(() => 状.解.delete(名));
  状.解.set(名, p);
  while (状.解.size > 2) {
    const 古 = [...状.解.keys()].find((k) => k !== 名 && !(状.今 && 状.今.名 === k));
    if (!古) break;
    状.解.delete(古);
  }
  return p;
}

/* 起点を探す。読み込んだ頭の 0〜0.08 秒の間をずらしながら指紋と突き合わせ、
   最もよく重なる所を一周の起点とする。座の刻み（44.1kHz 以外）にも合わせる。 */
export function 起点を探す(左, 右, 率, 印) {
  if (!印) return 0;
  const 文 = typeof atob === "function" ? atob(印) : Buffer.from(印, "base64").toString("binary");
  let 形 = new Float32Array(文.length);
  for (let i = 0; i < 文.length; i++) {
    let v = 文.charCodeAt(i);
    if (v > 127) v -= 256;
    形[i] = v / 127;
  }
  if (Math.abs(率 - 44100) > 1) {
    const n = Math.floor(形.length * 率 / 44100);
    const 伸 = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i * 44100 / 率, k = Math.floor(x), f = x - k;
      伸[i] = (形[k] || 0) * (1 - f) + (形[k + 1] || 0) * f;
    }
    形 = 伸;
  }
  const 限 = Math.min(Math.floor(0.08 * 率), 左.length - 形.length - 1);
  let 良 = 0, 最 = -Infinity;
  for (let o = 0; o <= 限; o++) {
    let 和 = 0, 力 = 0;
    for (let i = 0; i < 形.length; i += 2) {
      const v = (左[o + i] + 右[o + i]) * 0.5;
      和 += v * 形[i];
      力 += v * v;
    }
    const 値 = 和 / Math.sqrt(力 + 1e-9);
    if (値 > 最) { 最 = 値; 良 = o; }
  }
  return 良 / 率;
}

/* 前の曲を、交差のあいだに退かせて止める。 */
function 退かせる(今, 交差) {
  if (!今 || !状.座) return;
  const 時 = 状.座.currentTime, 長 = Math.max(0.02, 交差);
  try {
    const g = 今.声.gain;
    g.cancelScheduledValues(時);
    g.setValueAtTime(Math.max(0.0001, g.value), 時);
    g.linearRampToValueAtTime(0.0001, 時 + 長);
    今.源.onended = () => { try { 今.声.disconnect(); } catch (e) { /* 既に外れていてよい */ } };
    今.源.stop(時 + 長 + 0.05);
  } catch (e) { /* 止めそこねても盤は止めない */ }
}

/* 録音を掛ける。鳴らせたら true、鳴らせぬ所なら false（そのときは合成の調べで鳴らす）。

   同じ曲が鳴っていれば何もしない。読み込みを待つ間は前の曲を鳴らし続け、
   支度が整った所で、交差（秒）のあいだに入れ替える。 */
export function 録音を掛ける(名, { 交差 = 1.5, 頭 = 0 } = {}) {
  if (!録音がある(名) || !使える()) return Promise.resolve(false);
  if (状.今 && 状.今.名 === 名) return Promise.resolve(true);
  const 番 = ++状.番;
  return 解く(名).then(({ 布, 起点, 周 }) => {
    if (番 !== 状.番) return true;          // 待つ間に別の指図が来た。そちらに任せる
    const 座 = 状.座, 時 = 座.currentTime;
    const 声 = 座.createGain();
    声.gain.setValueAtTime(0.0001, 時);
    声.gain.linearRampToValueAtTime(1, 時 + Math.max(0.02, 交差));
    声.connect(状.主);
    const 源 = 座.createBufferSource();
    源.buffer = 布;
    源.loop = true;
    源.loopStart = 起点;
    源.loopEnd = 起点 + 周;
    源.connect(声);
    源.start(時, 起点 + (((頭 % 周) + 周) % 周));
    退かせる(状.今, 交差);
    状.今 = { 名, 源, 声, 起点, 周 };
    // 一曲目が鳴りだしたら、間を置いて残りの札も読んでおく（合戦に入った折に待たせぬため）
    if (!状.残りを読んだ && typeof setTimeout === "function") {
      状.残りを読んだ = true;
      setTimeout(() => { 録音を先に読む(); }, 4000);
    }
    return true;
  }).catch(() => (番 === 状.番 ? false : true));
}

/* 録音を止める。読み込み中の指図も取り消す。 */
export function 録音を止める(交差 = 0.6) {
  状.番++;
  const 今 = 状.今;
  状.今 = null;
  退かせる(今, 交差);
}

/* 圧したままの札を先に読んでおく（解くのは鳴らす折）。 */
export function 録音を先に読む(名ら = Object.keys(録音の曲)) {
  if (!使える()) return Promise.resolve([]);
  return Promise.all(名ら.filter(録音がある).map((n) => 生を読む(n).then(() => n, () => null)));
}

/* 試験のため、読んだ札・解いたもの・鳴っている曲の控えを空にする。 */
export function 録音の控えを空にする() {
  状.番++;
  状.今 = null;
  状.生.clear();
  状.解.clear();
  状.残りを読んだ = false;
}

/* 様子。鳴らないと言われたとき、どこで止まっているかを判じるための一言。 */
export const 録音の様子 = () => ({
  鳴り: 状.今 ? 状.今.名 : null,
  起点: 状.今 ? 状.今.起点 : null,
  周: 状.今 ? 状.今.周 : null,
  読めた: [...状.生.keys()],
  解けた: [...状.解.keys()],
  座: !!状.座,
});
