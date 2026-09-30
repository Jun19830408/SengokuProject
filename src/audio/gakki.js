/* 楽器（GDD 15.4）。

   Web Audio で和の音を組む。録音は持ち込まない――一枚物の盤を重くしないためであり、
   狙いの音（覇王伝のころのFM音源）が、そもそも合成の音だからでもある。

   六つ立てる。
     琴    撥弦。速い立ち上がりと、長い余韻
     尺八  息の音を混ぜた笛。揺り（ビブラート）が命
     笛    尺八より高く硬い。野戦の動機に
     太鼓  胴の低い音。撥の当たりに雑音を少し
     笙    合竹。正弦を重ねて長く伸ばす
     篳篥  葦舌の音。倍音を持たせた細い音
     鉦    金物。非整数倍のFMで
     法螺  低く長い唸り。ゆっくり立ち上がる

   どれも「座（AudioContext）」と「出口」を受け取り、指された時刻に鳴らす。
   試験では別の口（音を出さず、鳴らした事だけを控える）に差し替える。 */

const 音程 = (n) => 440 * Math.pow(2, (n - 69) / 12);

// 雑音の種。毎度作ると重いので、座ごとに一つ持つ
const 雑音の棚 = new WeakMap();
function 雑音(座) {
  if (雑音の棚.has(座)) return 雑音の棚.get(座);
  const 秒 = 2;
  const b = 座.createBuffer(1, Math.floor(座.sampleRate * 秒), 座.sampleRate);
  const d = b.getChannelData(0);
  let x = 0x1546;
  for (let i = 0; i < d.length; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;         // 賽は使わない（同じ音が出るように）
    d[i] = (x / 0x3fffffff) - 1;
  }
  雑音の棚.set(座, b);
  return b;
}

const 包絡 = (g, t, 強, 立, 保, 落) => {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 強), t + 立);
  g.gain.setValueAtTime(Math.max(0.0002, 強), t + 立 + 保);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 立 + 保 + 落);
};

/* 撥弦（琴）。基音と倍音を重ね、速く立ち上げて長く減衰させる。 */
function 琴(座, 出, t, 音, 長, 強) {
  const f = 音程(音);
  for (const [倍, 量, 減] of [[1, 1, 1], [2, 0.42, 0.7], [3, 0.2, 0.5], [4.2, 0.1, 0.35]]) {
    const o = 座.createOscillator(), g = 座.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(f * 倍, t);
    包絡(g, t, 強 * 量 * 0.5, 0.004, 0.01, 長 * 減 + 0.2);
    o.connect(g).connect(出); o.start(t); o.stop(t + 長 * 減 + 0.4);
  }
  // 爪の当たり
  const n = 座.createBufferSource(), ng = 座.createGain(), nf = 座.createBiquadFilter();
  n.buffer = 雑音(座); n.loop = true;
  nf.type = "bandpass"; nf.frequency.setValueAtTime(f * 3, t); nf.Q.value = 2;
  包絡(ng, t, 強 * 0.22, 0.002, 0.005, 0.05);
  n.connect(nf).connect(ng).connect(出); n.start(t); n.stop(t + 0.1);
}

/* 息の笛（尺八・笛）。正弦に揺りを掛け、息の雑音を薄く添える。 */
function 笛系(座, 出, t, 音, 長, 強, { 息 = 0.3, 揺 = 5.2, 深 = 3.5, 硬 = false } = {}) {
  const f = 音程(音);
  const o = 座.createOscillator(), g = 座.createGain();
  o.type = 硬 ? "square" : "sine";
  o.frequency.setValueAtTime(f, t);
  // 揺り。少し遅れて掛かるのが尺八らしい
  const lfo = 座.createOscillator(), lg = 座.createGain();
  lfo.frequency.setValueAtTime(揺, t);
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(深, t + Math.min(0.4, 長 * 0.5));
  lfo.connect(lg).connect(o.frequency);
  包絡(g, t, 強 * (硬 ? 0.34 : 0.5), 0.08, Math.max(0.02, 長 - 0.25), 0.22);
  o.connect(g).connect(出);
  o.start(t); o.stop(t + 長 + 0.3); lfo.start(t); lfo.stop(t + 長 + 0.3);
  if (息 > 0) {
    const n = 座.createBufferSource(), nf = 座.createBiquadFilter(), ng = 座.createGain();
    n.buffer = 雑音(座); n.loop = true;
    nf.type = "bandpass"; nf.frequency.setValueAtTime(f * 2, t); nf.Q.value = 1.2;
    包絡(ng, t, 強 * 息 * 0.3, 0.06, Math.max(0.02, 長 - 0.2), 0.2);
    n.connect(nf).connect(ng).connect(出); n.start(t); n.stop(t + 長 + 0.2);
  }
}

/* 太鼓。胴の低い正弦を速く落とし、撥の当たりに雑音を重ねる。 */
function 太鼓(座, 出, t, 音, 長, 強) {
  const f = 音程(音);
  const o = 座.createOscillator(), g = 座.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(f * 2.2, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f * 0.8), t + 0.09);
  包絡(g, t, 強, 0.003, 0.02, Math.max(0.14, 長 * 0.6));
  o.connect(g).connect(出); o.start(t); o.stop(t + 長 + 0.3);
  const n = 座.createBufferSource(), nf = 座.createBiquadFilter(), ng = 座.createGain();
  n.buffer = 雑音(座); n.loop = true;
  nf.type = "lowpass"; nf.frequency.setValueAtTime(1200, t);
  包絡(ng, t, 強 * 0.5, 0.002, 0.004, 0.09);
  n.connect(nf).connect(ng).connect(出); n.start(t); n.stop(t + 0.2);
}

/* 笙（合竹）。正弦を三つ重ね、ゆっくり立ち上げて長く保つ。 */
function 笙(座, 出, t, 音, 長, 強) {
  const f = 音程(音);
  for (const [倍, 量] of [[1, 1], [2, 0.5], [3, 0.3], [5, 0.12]]) {
    const o = 座.createOscillator(), g = 座.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(f * 倍 * (1 + (倍 % 2) * 0.001), t);
    包絡(g, t, 強 * 量 * 0.4, 0.6, Math.max(0.1, 長 - 1.1), 0.7);
    o.connect(g).connect(出); o.start(t); o.stop(t + 長 + 0.9);
  }
}

/* 篳篥。細く張った音。矩形波を絞って葦の鳴りにする。 */
function 篳篥(座, 出, t, 音, 長, 強) {
  const f = 音程(音);
  const o = 座.createOscillator(), g = 座.createGain(), lp = 座.createBiquadFilter();
  o.type = "sawtooth"; o.frequency.setValueAtTime(f, t);
  lp.type = "lowpass"; lp.frequency.setValueAtTime(f * 4.5, t); lp.Q.value = 3;
  const lfo = 座.createOscillator(), lg = 座.createGain();
  lfo.frequency.setValueAtTime(4.6, t); lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(4, t + 0.5);
  lfo.connect(lg).connect(o.frequency);
  包絡(g, t, 強 * 0.34, 0.12, Math.max(0.05, 長 - 0.3), 0.3);
  o.connect(lp).connect(g).connect(出);
  o.start(t); o.stop(t + 長 + 0.4); lfo.start(t); lfo.stop(t + 長 + 0.4);
}

/* 鉦。非整数倍の二つを掛け合わせた金物の音。 */
function 鉦(座, 出, t, 音, 長, 強) {
  const f = 音程(音);
  const o = 座.createOscillator(), m = 座.createOscillator(), mg = 座.createGain(), g = 座.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(f, t);
  m.type = "sine"; m.frequency.setValueAtTime(f * 3.47, t);
  mg.gain.setValueAtTime(f * 2.4, t);
  mg.gain.exponentialRampToValueAtTime(1, t + 0.5);
  m.connect(mg).connect(o.frequency);
  包絡(g, t, 強 * 0.4, 0.004, 0.02, 長 + 0.6);
  o.connect(g).connect(出);
  o.start(t); o.stop(t + 長 + 0.9); m.start(t); m.stop(t + 長 + 0.9);
}

/* 法螺貝。低く、ゆっくり立ち上がって唸る。 */
function 法螺(座, 出, t, 音, 長, 強) {
  const f = 音程(音);
  const o = 座.createOscillator(), g = 座.createGain(), lp = 座.createBiquadFilter();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(f * 0.98, t);
  o.frequency.linearRampToValueAtTime(f, t + 0.35);
  lp.type = "lowpass"; lp.frequency.setValueAtTime(f * 3, t);
  const lfo = 座.createOscillator(), lg = 座.createGain();
  lfo.frequency.setValueAtTime(5.5, t); lg.gain.setValueAtTime(2.5, t);
  lfo.connect(lg).connect(o.frequency);
  包絡(g, t, 強 * 0.42, 0.3, Math.max(0.1, 長 - 0.7), 0.5);
  o.connect(lp).connect(g).connect(出);
  o.start(t); o.stop(t + 長 + 0.6); lfo.start(t); lfo.stop(t + 長 + 0.6);
}

/* 楽器の口。名で引いて鳴らす。 */
export const 楽器 = {
  琴, 太鼓, 笙, 篳篥, 鉦, 法螺,
  尺八: (座, 出, t, 音, 長, 強) => 笛系(座, 出, t, 音, 長, 強, { 息: 0.45, 揺: 4.8, 深: 4 }),
  笛: (座, 出, t, 音, 長, 強) => 笛系(座, 出, t, 音, 長, 強, { 息: 0.22, 揺: 6.2, 深: 2.6, 硬: true }),
};

export function 鳴らす(座, 出, 名, 音, 時, 長, 強) {
  const f = 楽器[名];
  if (!f) return false;
  try { f(座, 出, 時, 音, 長, 強); } catch (e) { return false; }
  return true;
}
