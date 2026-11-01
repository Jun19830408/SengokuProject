/* 効果音（kouka.js）。

   合戦の効果音は dist/se/ の札を読み、音の座（oto.js）の座と主の口で鳴らす。試験には
   音の座が無いので、鳴らした事・止めた事・絞った事だけを控える「偽の座」を据えて、
   次を検める。

     一、二十二の効果が揃い、札が dist/se/ にある。地の六つは八秒で、指紋を持つ
     二、座の無い所で鳴らしても倒れず、鳴らせぬ（false）と返す
     三、地は繰り返しで鳴り、替えれば前を退かせ、同じ地なら鳴らし直さない。null で止まる
     四、同じ一打は続けざまに鳴らさない。間を置けばまた鳴る（間は呼ぶ側が延ばせる）
     五、知らせは〇.五秒に一つまで。鳴るあいだ曲を絞る
     六、締めは曲を深く絞り、地を退かせる
     七、音を切っているあいだは鳴らさない
     八、同時に鳴る一打は八つまで
     九、札の置き場は、盤に差された録音の根に倣う（第二試作版の "../bgm/" → "../se/"）
     十、曲（録音）が鳴っていれば、締めは一割余りまで、知らせは六割まで曲を絞る */
const path = require('path');
const fs = require('fs');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const SE = path.join(__dirname, '..', 'dist', 'se');

/* 偽の座。時計は手で進める。鳴らした源・声の動きを控える。 */
function 偽の座() {
  const 座 = {
    currentTime: 1, sampleRate: 44100, state: 'running',
    源ら: [], 声ら: [], 振り: 0,
    createGain() {
      const g = {
        value: 1, 動き: [],
        setValueAtTime(v, t) { this.value = v; this.動き.push(['set', v, t]); },
        linearRampToValueAtTime(v, t) { this.value = v; this.動き.push(['ramp', v, t]); },
        cancelScheduledValues(t) { this.動き.push(['cancel', t]); },
      };
      const 声 = { gain: g, connect() {}, disconnect() {} };
      座.声ら.push(声);
      return 声;
    },
    createStereoPanner() { 座.振り++; return { pan: { setValueAtTime() {} }, connect() {} }; },
    createBufferSource() {
      const s = { loop: false, loopStart: 0, loopEnd: 0, 始め: null, 止め: null, onended: null,
        connect() {}, start(t, o) { this.始め = [t, o]; }, stop(t) { this.止め = t; } };
      座.源ら.push(s);
      return s;
    },
    decodeAudioData(ab, res) {
      const 秒 = ab.byteLength > 0 ? 8 : 0;      // 長さは試験に要らぬ。地の周に足りれば良い
      const n = Math.round(秒 * 44100);
      const ch = new Float32Array(n);
      res({ duration: 秒, sampleRate: 44100, numberOfChannels: 2, getChannelData: () => ch });
    },
  };
  return 座;
}
const 主 = { connect() {} };
const 読んだ = [];
global.fetch = async (url) => {
  読んだ.push(url);
  const f = path.join(/bgm\//.test(url) ? path.join(__dirname, '..', 'dist', 'bgm') : SE, path.basename(url));
  if (!fs.existsSync(f)) return { ok: false, status: 404 };
  const b = fs.readFileSync(f);
  return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.length) };
};
const 待つ = () => new Promise((r) => setTimeout(r, 0));
const 待ち = async (p) => { await p; await 待つ(); };

(async () => {
  console.log('■ 一、二十二の効果が揃い、札がある');
  {
    const 名ら = Object.keys(H.効果の札);
    確('二十二の効果がある', 名ら.length === 22, `${名ら.length}`);
    const 無い = 名ら.filter((k) => !fs.existsSync(path.join(SE, H.効果の札[k].札)) || fs.statSync(path.join(SE, H.効果の札[k].札)).size < 4000);
    確('札がどれも dist/se/ にある', 無い.length === 0, 無い.join('・'));
    const 類 = {};
    for (const k of 名ら) 類[H.効果の札[k].類] = (類[H.効果の札[k].類] || 0) + 1;
    確('一打八・知らせ二・締め六・地六', 類['一打'] === 8 && 類['知らせ'] === 2 && 類['締め'] === 6 && 類['地'] === 6, JSON.stringify(類));
    const 地 = 名ら.filter((k) => H.効果の札[k].類 === '地');
    確('地は行軍・接戦・突撃・接敵・退却・軍船', ['行軍', '接戦', '突撃', '接敵', '退却', '軍船'].every((k) => 地.includes(k)));
    確('地はどれも八秒で、一周の頭の指紋（2048 標本）を持つ',
      地.every((k) => H.効果の札[k].長 === H.地の周 && Buffer.from(H.効果の指紋[k] || '', 'base64').length === 2048));
    const 合計 = 名ら.reduce((a, k) => a + fs.statSync(path.join(SE, H.効果の札[k].札)).size, 0);
    確('二十二の札は合わせて二MBに収まる', 合計 < 2 * 1024 * 1024, `${(合計 / 1048576).toFixed(2)}MB`);
  }

  console.log('■ 二、座の無い所では倒れない');
  {
    H.効果の座を据える(null, null);
    let 倒れず = true, 返り = [];
    try {
      返り.push(await H.効果を鳴らす('自軍を選ぶ'));
      返り.push(await H.兵の音を掛ける('行軍'));
      返り.push(await H.締めを鳴らす('野戦の勝ち'));
      H.効果を止める();
    } catch (e) { 倒れず = false; }
    確('例外を投げない', 倒れず);
    確('鳴らせぬ（false）と返す', 返り.every((v) => v === false), 返り.join('・'));
    確('知らぬ名は鳴らさない', (await H.効果を鳴らす('鬨の声')) === false);
  }

  const 座 = 偽の座();
  let 入 = true;
  H.効果の控えを空にする();
  H.効果の座を据える(座, 主, { 入: () => 入 });

  console.log('■ 三、地（拡大したときの兵の音）');
  {
    await 待ち(H.兵の音を掛ける('行軍'));
    const s1 = 座.源ら[座.源ら.length - 1];
    確('行軍が繰り返しで鳴る（一周八秒）', s1 && s1.loop && s1.loopStart === 0 && s1.loopEnd === 8 && s1.始め, s1 ? `${s1.loopStart}〜${s1.loopEnd}` : '鳴らず');
    確('様子に行軍と出る', H.効果の様子().地 === '行軍');
    const n = 座.源ら.length;
    await 待ち(H.兵の音を掛ける('行軍'));
    確('同じ地なら鳴らし直さない', 座.源ら.length === n);
    座.currentTime += 1;
    await 待ち(H.兵の音を掛ける('突撃'));
    const s2 = 座.源ら[座.源ら.length - 1];
    確('突撃に替えると新しく鳴り、行軍は退く', s2 !== s1 && s2.loop && s1.止め !== null, `行軍の止め ${s1.止め}`);
    確('退くのは〇.八秒の交差のあと', Math.abs(s1.止め - (座.currentTime + 0.8 + 0.05)) < 1e-6);
    await 待ち(H.兵の音を掛ける(null));
    確('null で止まる', s2.止め !== null && H.効果の様子().地 === null);
    await 待ち(H.兵の音を掛ける('退却'));
    確('退却（敗走・撤退の隊）も繰り返しで鳴る', H.効果の様子().地 === '退却' && 座.源ら[座.源ら.length - 1].loop);
    await 待ち(H.兵の音を掛ける(null));
    // 読み込みを待つ間に次の指図が来たら、後の指図が勝つ
    H.兵の音を掛ける('接戦');
    await 待ち(H.兵の音を掛ける('接敵'));
    await 待つ();
    確('続けて指図すれば、後の地だけが残る', H.効果の様子().地 === '接敵', H.効果の様子().地);
    await 待ち(H.兵の音を掛ける(null));
  }

  console.log('■ 四、同じ一打は続けざまに鳴らさない');
  {
    座.currentTime += 1;
    const n0 = 座.源ら.length;
    const a = await H.効果を鳴らす('自軍を選ぶ');
    const b = await H.効果を鳴らす('自軍を選ぶ');
    確('一度目は鳴り、すぐの二度目は鳴らない', a === true && b === false && 座.源ら.length === n0 + 1);
    座.currentTime += H.一打の間 + 0.01;
    確('間を置けばまた鳴る', (await H.効果を鳴らす('自軍を選ぶ')) === true);
    確('敵を選ぶ音は別に鳴る', (await H.効果を鳴らす('敵を選ぶ')) === true);
    確('左右を渡せば振る', (await H.効果を鳴らす('鉄砲', { 左右: -0.5 })) === true && 座.振り > 0);
    座.currentTime += 1;
    const 太1 = await H.効果を鳴らす('陣太鼓', { 間: 8 });
    座.currentTime += 3;
    const 太2 = await H.効果を鳴らす('陣太鼓', { 間: 8 });
    座.currentTime += 5.1;
    const 太3 = await H.効果を鳴らす('陣太鼓', { 間: 8 });
    確('間を渡せば、その秒数のうちは二度鳴らさない（陣太鼓を八秒に一度）', 太1 === true && 太2 === false && 太3 === true, `${太1}・${太2}・${太3}`);
  }

  console.log('■ 五、知らせ');
  {
    座.currentTime += 2;
    const a = await H.効果を鳴らす('有利');
    const b = await H.効果を鳴らす('不利');
    確('〇.五秒のうちの二つ目は鳴らない', a === true && b === false);
    座.currentTime += H.知らせの間 + 0.01;
    確('間を置けば鳴る', (await H.効果を鳴らす('不利')) === true);
  }

  console.log('■ 六、締め');
  {
    座.currentTime += 3;
    await 待ち(H.兵の音を掛ける('接敵'));
    const 地 = 座.源ら[座.源ら.length - 1];
    const ok = await H.締めを鳴らす('野戦の勝ち');
    確('締めが鳴る', ok === true);
    確('地を退かせる', 地.止め !== null && H.効果の様子().地 === null);
    確('効果を鳴らす に締めの名を渡しても、締めとして鳴る', (座.currentTime += 2, await H.効果を鳴らす('城を落とす')) === true);
  }

  console.log('■ 七、音を切っているあいだは鳴らさない');
  {
    座.currentTime += 3;
    入 = false;
    確('一打も地も鳴らない', (await H.効果を鳴らす('法螺貝')) === false && (await H.兵の音を掛ける('行軍')) === false);
    入 = true;
    確('入れれば鳴る', (await H.効果を鳴らす('法螺貝')) === true);
  }

  console.log('■ 八、同時に鳴る一打は八つまで');
  {
    H.効果を止める(0);
    const 一打ら = ['焙烙', '法螺貝', '陣太鼓', '鉄砲', '弓', '勝鬨', '自軍を選ぶ', '敵を選ぶ', '焙烙', '陣太鼓'];
    for (const k of 一打ら) { 座.currentTime += 0.1; await H.効果を鳴らす(k); }
    確('九つ目からは古いものを止める', H.効果の様子().一打.length <= H.一打の限り, `${H.効果の様子().一打.length}`);
    H.効果を止める(0);
    確('止めれば空になる', H.効果の様子().一打.length === 0);
  }

  console.log('■ 九、札の置き場');
  {
    global.window = { __録音の根: '../bgm/' };
    H.効果の控えを空にする();
    H.効果の座を据える(座, 主, { 入: () => true });
    確('盤に録音の根 "../bgm/" が差してあれば、"../se/" から読む', H.効果の様子().根 === '../se/', H.効果の様子().根);
    global.window = { __効果の根: '/se2/' };
    H.効果の座を据える(座, 主);
    確('効果の根が差してあれば、それを使う', H.効果の様子().根 === '/se2/');
    delete global.window;
    H.効果の座を据える(座, 主);
    確('何も差していなければ "se/"', H.効果の様子().根 === 'se/');
    読んだ.length = 0;
    await H.効果を先に読む(['行軍', '有利']);
    確('先に読むと、その札を読みに行く', 読んだ.includes('se/se_march.mp3') && 読んだ.includes('se/se_notice_good.mp3'), 読んだ.join('・'));
  }

  console.log('■ 十、曲を絞る');
  {
    const 座2 = 偽の座();
    H.効果の控えを空にする();
    H.録音の座を据える(座2, 主, { 根: 'bgm/' });
    H.効果の座を据える(座2, 主, { 入: () => true, 根: 'se/' });
    const 鳴った = await H.録音を掛ける('野戦');
    確('曲（野戦の録音）が鳴る', 鳴った === true && H.録音の様子().鳴り === '野戦');
    const 曲の声 = 座2.声ら[0];
    座2.currentTime += 5;
    await H.効果を鳴らす('有利');
    const 絞り = (声, 倍) => 声.gain.動き.some((m) => m[0] === 'ramp' && Math.abs(m[1] - 倍) < 1e-9);
    確('知らせが鳴ると、曲を六割まで絞る', 絞り(曲の声, 0.6));
    座2.currentTime += 5;
    await H.締めを鳴らす('野戦の負け');
    確('締めが鳴ると、曲を一割余り（0.12）まで絞る', 絞り(曲の声, 0.12));
    const 最後 = 曲の声.gain.動き[曲の声.gain.動き.length - 1];
    確('締めのあとは元（1）へ戻す', 最後[0] === 'ramp' && 最後[1] === 1 && 最後[2] > 座2.currentTime + 5, `${最後[2] - 座2.currentTime}秒後`);
    座2.currentTime += 1;
    曲の声.gain.動き.length = 0;
    await H.効果を鳴らす('不利');
    確('締めの鳴るあいだの知らせは、曲を絞り直さない', !絞り(曲の声, 0.6));
    確('曲が鳴っていなければ、絞らずに false', (H.録音の座を据える(null, null), H.録音を絞る(0.5, 1, 1)) === false);
  }

  console.log('');
  if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})();
