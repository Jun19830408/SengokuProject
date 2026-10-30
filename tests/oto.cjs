/* 音（GDD 15.4）。

   盤に管弦の録音を添えた。鳴らすのは録音の四曲だけである（audio/oto.js・rokuon.js）。
     政務「天下静謐」・野戦「疾風の陣」・城攻め「攻城の刻」・大合戦「天下決戦」

   遊ぶ側の申し出は「第二試作版に音を入れてほしい。入れる音は直近で作成したオーケストラの
   三曲」であった。本編の音の座は合成の調べ（楽器を一音ずつ鳴らす作り）も持っていたが、
   ここでは持たない。のちに大合戦の曲「天下決戦」が加わり、四曲になった（天下分け目の
   一戦・合戦の関ヶ原・広く組まれた野の合戦で鳴る）。

   試験の場には音の座（AudioContext）も札の読み込み（fetch）も無いので、偽の座と偽の
   読み込みを据えて、次を検める。

     一、場面で曲が替わる（政務は位を問わず一曲、天下分け目は大合戦の曲、海戦は野戦の曲）
     二、合成の調べを持たない（音の部品は録音の二つだけ）
     三、遊ぶ側が触れる（解錠する）まで、札も読まず鳴らさない
     四、解錠すると、いまの場面の札を読み、その曲が鳴る
     五、場面が替われば曲が替わる
     六、切れば止まり、入れれば戻る。入切と音量は棚に残る
     七、題名の画面へ戻ってまた政務に入っても鳴る（本編の作りでは鳴らなかった）
     八、試作版の盤は一段深いので、差された根（../bgm/）から札を読む
     九、札が読めぬ所では黙る（合成に戻さない）。盤は倒れない
     十、音の座が無い所でも盤は倒れない */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'oto-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export { 場面の曲, 場面を選ぶ, 止める, 入切, 音量, 音の設定, 解錠する, 設定を読む, 棚の鍵, 音の座を戻す } from "../src/audio/oto.js";\n'
+ 'export { 録音の曲, 録音の指紋, 録音の様子 } from "../src/audio/rokuon.js";\n');
const out = path.join(ROOT, 'build', 'oto.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out, logLevel: 'error' });

/* 棚（localStorage）の代わり。読み込む前に据える */
const 棚 = (() => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
})();
global.localStorage = 棚;

/* 札の読み込みの代わり。読んだ住所を控え、しくじらせることもできる */
const 読んだ = [];
let 札が無い = false;
global.fetch = (url) => {
  読んだ.push(url);
  if (札が無い) return Promise.resolve({ ok: false, status: 404 });
  return Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve(new ArrayBuffer(64)) });
};

/* 音の座の代わり。鳴らした源を控える */
const 鳴らした = [];
class 偽の座 {
  constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 44100; this.destination = { 名: '出口' }; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createGain() {
    return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} },
      connect() {}, disconnect() {} };
  }
  createBuffer(ch, len, rate) { return { numberOfChannels: ch, length: len, sampleRate: rate, duration: len / rate, getChannelData: () => new Float32Array(len) }; }
  createBufferSource() {
    const 源 = { buffer: null, loop: false, loopStart: 0, loopEnd: 0, connect() {}, onended: null,
      start() { 源.鳴った = true; 鳴らした.push(源); }, stop() { 源.止めた = true; } };
    return 源;
  }
  decodeAudioData(ab, 良, 悪) {
    const 布 = { numberOfChannels: 2, sampleRate: 44100, duration: 140, getChannelData: () => new Float32Array(8192) };
    Promise.resolve().then(() => 良(布));
  }
}
const 作る = () => new 偽の座();

const A = require(out);
const 待つ = () => new Promise((r) => setTimeout(r, 30));
const 鳴り = () => A.録音の様子().鳴り;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

(async () => {
  console.log('■ 一、場面で曲が替わる');
  確('政務は「政務」の一曲（位は問わない）', A.場面の曲('政務') === '政務');
  確('野戦・城攻め', A.場面の曲('野戦') === '野戦' && A.場面の曲('城攻め') === '城攻め');
  確('天下分け目は、大合戦の曲（分け目）', A.場面の曲('分け目') === '分け目');
  確('海戦は、野戦の曲', A.場面の曲('海戦') === '野戦');
  確('場面の無い所（題名・大名選び）は鳴らさない', A.場面の曲(null) === null && A.場面の曲('題名') === null);
  確('曲は録音の四曲（天下静謐・疾風の陣・攻城の刻・天下決戦）',
    Object.values(A.録音の曲).map((k) => k.題).join('・') === '天下静謐・疾風の陣・攻城の刻・天下決戦');
  {
    /* 四曲とも、札が本編の dist/bgm/ にあり、一周の頭の形（指紋）を控えてあること。
       試作版の盤は本編の札を分け合って読む（../bgm/） */
    const 欠け = Object.entries(A.録音の曲).filter(([名, k]) =>
      !fs.existsSync(path.join(ROOT, 'dist', 'bgm', k.札)) || !A.録音の指紋[名] || !(k.周 > 0));
    確('四曲とも札と指紋と一周の秒数が揃う', !欠け.length, 欠け.map(([名]) => 名).join('・'));
  }

  console.log('■ 二、合成の調べを持たない');
  {
    const 部品 = fs.readdirSync(path.join(ROOT, 'src', 'audio')).sort();
    確('音の部品は録音の二つだけ（oto.js・rokuon.js）', 部品.join('・') === 'oto.js・rokuon.js', 部品.join('・'));
    const 本文 = fs.readFileSync(path.join(ROOT, 'src', 'audio', 'oto.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');      // 説明の文は除いて見る
    確('音の座は合成の調べ（kyoku・gakki）を取り込まない', !/kyoku|gakki/.test(本文));
    確('試し鳴らしの一音を持たない', !('試しに鳴らす' in A));
  }

  console.log('■ 三、触れるまでは読まず、鳴らさない');
  {
    A.音の座を戻す(); 読んだ.length = 0;
    A.場面を選ぶ('政務');
    await 待つ();
    確('解錠の前は札を読まない', 読んだ.length === 0, 読んだ.join('・') || 'なし');
    確('解錠の前は鳴らさない', !鳴り() && 鳴らした.length === 0);
  }

  console.log('■ 四、解錠すると、いまの場面の曲が鳴る');
  {
    確('解錠できる', A.解錠する(作る) === true);
    await 待つ();
    確('政務の札を読む', 読んだ.includes('bgm/bgm_seimu.mp3'), 読んだ.join('・'));
    確('政務の曲が鳴る', 鳴り() === '政務' && A.音の設定().鳴り === '天下静謐', `${鳴り()}`);
    const 源 = 鳴らした[鳴らした.length - 1];
    確('巻き戻して鳴らし続ける（継ぎ目なし）', !!源 && 源.loop === true && 源.loopEnd > 源.loopStart,
      源 ? `${源.loopStart.toFixed(3)}〜${源.loopEnd.toFixed(1)}秒` : '');
  }

  console.log('■ 五、場面が替われば曲が替わる');
  {
    A.場面を選ぶ('城攻め'); await 待つ();
    確('城攻めの曲', 鳴り() === '城攻め' && 読んだ.includes('bgm/bgm_shirozeme.mp3'), `${鳴り()}`);
    A.場面を選ぶ('分け目'); await 待つ();
    確('天下分け目は大合戦の曲', 鳴り() === '分け目' && 読んだ.includes('bgm/bgm_wakeme.mp3')
      && A.音の設定().鳴り === '天下決戦', `${鳴り()}`);
    A.場面を選ぶ('野戦'); await 待つ();
    確('野戦は野戦の曲', 鳴り() === '野戦', `${鳴り()}`);
    const 前 = 鳴らした.length;
    A.場面を選ぶ('海戦'); await 待つ();
    確('同じ曲なら鳴らし直さない（海戦も野戦の曲）', 鳴り() === '野戦' && 鳴らした.length === 前);
    A.場面を選ぶ('政務'); await 待つ();
    確('政務へ戻れば政務の曲', 鳴り() === '政務');
  }

  console.log('■ 六、切れば止まり、入れれば戻る。棚に残る');
  {
    A.入切(false); await 待つ();
    確('切れば止まる', !鳴り());
    確('切ったことが棚に残る', JSON.parse(棚.getItem(A.棚の鍵)).入 === false);
    A.入切(true); await 待つ();
    確('入れれば、いまの場面の曲が戻る', 鳴り() === '政務');
    A.音量(0.3);
    確('音量が棚に残る', JSON.parse(棚.getItem(A.棚の鍵)).音量 === 0.3);
    確('棚から読み直せる', A.設定を読む(棚).音量 === 0.3 && A.設定を読む(棚).入 === true);
  }

  console.log('■ 七、題名へ戻って、また政務に入っても鳴る');
  {
    A.止める(); await 待つ();
    確('題名へ戻れば止まる', !鳴り());
    A.場面を選ぶ('政務'); await 待つ();
    確('また政務に入れば鳴る', 鳴り() === '政務', `${鳴り()}`);
  }

  console.log('■ 八、試作版は差された根から札を読む');
  {
    A.音の座を戻す(); 読んだ.length = 0;
    global.window = { __録音の根: '../bgm/' };
    A.場面を選ぶ('野戦');
    A.解錠する(作る); await 待つ();
    確('../bgm/ から読む', 読んだ.includes('../bgm/bgm_yasen.mp3'), 読んだ.join('・'));
    確('鳴る', 鳴り() === '野戦');
    delete global.window;
  }

  console.log('■ 九、札が読めぬ所では黙る');
  {
    A.音の座を戻す(); 読んだ.length = 0; 札が無い = true;
    A.解錠する(作る);
    let 倒れた = null;
    try { A.場面を選ぶ('城攻め'); await 待つ(); } catch (e) { 倒れた = e; }
    確('盤は倒れない', !倒れた, 倒れた ? String(倒れた) : '');
    確('鳴らさない（合成に戻さない）', !鳴り() && A.音の設定().鳴り === null);
    確('いまの場面の曲は覚えている（札が届けば鳴らせる）', A.音の設定().題 === '攻城の刻');
    札が無い = false;
  }

  console.log('■ 十、音の座が無い所でも倒れない');
  {
    A.音の座を戻す();
    let 倒れた = null, 解けた = null;
    try { 解けた = A.解錠する(); A.場面を選ぶ('政務'); A.入切(true); A.音量(0.5); A.止める(); } catch (e) { 倒れた = e; }
    確('座が無ければ解錠は「できぬ」と返す', 解けた === false);
    確('盤は倒れない', !倒れた, 倒れた ? String(倒れた) : '');
  }

  console.log(`\n════ 音：咎 ${咎.length} 件`);
  console.log('エラー:', 咎.length ? 咎.join(' | ') : 'なし');
  process.exit(咎.length ? 1 : 0);
})().catch((e) => { console.log('例外:', e && e.stack); console.log('エラー: 例外'); process.exit(1); });
