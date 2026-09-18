/* ==========================================================================
   指で触って、道具立てが効くか（実機の Chrome で測る）

   遊ぶ側の報せは「合戦中に、広く・収納などの左上のコマンドが押せない」であった。
   卓の上では押せる。携帯でだけ効かない。

   元は、戦場の枠に張った touchstart の差し止めであった。盤のドラッグが端末側の
   スクロールや「戻る」に伝わらないよう、枠に触れた指をすべて止めていた。枠の中には
   道具立ても入っているので、釦を叩いた指もそこで止まる。指の触れはじめを止めると、
   端末はそのあとの click を起こさない――つまり onClick が呼ばれない。

   釦を click() で押す試験では、この筋は決して見つからない（click は自分で起こして
   いるからである）。本物の touchstart／touchend を投げ、「既定が生きているか」を見る。
   生きていれば、端末は click を起こす。
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { CHROME, ROOT, 頁を組む } = require(path.join(__dirname, '..', 'tools', 'ban.cjs'));

const TMP = path.join(ROOT, 'build', 'yubi');
fs.mkdirSync(TMP, { recursive: true });

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};

const 検分 = `
(async () => {
  const 眠 = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const 釦 = (t) => [...document.querySelectorAll('button,.btn,.mbtn,.grip')]
    .filter((b) => !b.disabled && b.offsetParent !== null)
    .find((b) => (b.textContent || '').includes(t));
  const 押 = async (t) => { for (let i = 0; i < 40; i++) { const el = 釦(t); if (el) { el.click(); await 眠(0.25); return true; } await 眠(0.2); } return false; };
  const 報 = { 進んだ: [], 指: {}, 咎: [] };
  try {
    await 眠(0.9);
    報.進んだ.push('続きから:' + await 押('続きから')); await 眠(1.4);
    await 押('正面から当たる'); await 眠(0.8);
    報.進んだ.push('合戦開始:' + await 押('合戦開始')); await 眠(0.6);
    await 押('停止'); await 眠(0.4);
    /* 指で触る。touchstart と touchend を本物として投げ、既定が生きているかを見る。
       生きていれば端末は click を起こす――そこで click も投げ、画面が動くかを見る。 */
    const 触る = async (el) => {
      const r = el.getBoundingClientRect();
      const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
      const T = () => new Touch({ identifier: 1, target: el, clientX: x, clientY: y, pageX: x, pageY: y });
      const 起 = (名, 触) => {
        const ev = new TouchEvent(名, { bubbles: true, cancelable: true, composed: true,
          touches: 触, targetTouches: 触, changedTouches: 触 });
        el.dispatchEvent(ev);
        return !ev.defaultPrevented;
      };
      const 生 = 起('touchstart', [T()]);
      起('touchend', []);
      if (生) { el.click(); }                       // 端末が起こすはずの click
      await 眠(0.3);
      return 生;
    };
    const 盤 = document.querySelector('canvas');
    for (const 名 of ['拡大', '縮小', '全体', '収納', '広く']) {
      const el = 釦(名);
      if (!el) { 報.指[名] = { 有: false }; continue; }
      const 前 = document.body.innerText.length;
      const 生 = await 触る(el);
      報.指[名] = { 有: true, 既定: 生, 動: document.body.innerText.length !== 前 };
    }
    // 「広く」で道具立てが引っ込んだなら、隅の取っ手で戻れるか
    const 取っ手 = [...document.querySelectorAll('.grip')].find((g) => g.offsetParent !== null);
    if (取っ手) {
      const 生 = await 触る(取っ手);
      報.指['取っ手'] = { 有: true, 既定: 生, 動: !!釦('広く') };
    } else 報.指['取っ手'] = { 有: false };
    // 盤そのものに触れたときは、これまでどおり端末の既定を止める（画面が流れぬように）
    if (盤) {
      const r = 盤.getBoundingClientRect();
      const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
      const T = () => new Touch({ identifier: 9, target: 盤, clientX: x, clientY: y, pageX: x, pageY: y });
      const ev = new TouchEvent('touchstart', { bubbles: true, cancelable: true, composed: true,
        touches: [T()], targetTouches: [T()], changedTouches: [T()] });
      盤.dispatchEvent(ev);
      報.盤の既定 = !ev.defaultPrevented;
    }
  } catch (e) { 報.咎.push(String(e && e.message)); }
  document.title = 'RESULT' + JSON.stringify(報);
})();
`;

const 測る = (幅, 高) => {
  const 頁 = 頁を組む('野戦');
  const f = path.join(TMP, `p${幅}.html`);
  fs.writeFileSync(f, 頁 + '<script>' + 検分 + '<\/script>');
  const 出 = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--virtual-time-budget=30000', '--touch-events=enabled',
    `--window-size=${幅},${高}`, '--dump-dom', `file://${f}`],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const m = 出.match(/<title>RESULT(.*?)<\/title>/s);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
};

console.log('指で触る（合戦の道具立て）');
for (const [幅, 高, 名] of [[430, 860, '携帯・縦'], [860, 430, '携帯・横']]) {
  const r = 測る(幅, 高);
  console.log(`\n── ${名}（${幅}×${高}）`);
  if (!r) { 確(`${名}：検分が返る`, false, '題が取れなかった'); continue; }
  if (r.咎 && r.咎.length) 確(`${名}：検分が転ばない`, false, r.咎.join(' / '));
  確(`${名}：合戦の盤まで進める`, r.進んだ.every((x) => x.endsWith('true')), r.進んだ.join('／'));
  for (const 名2 of ['拡大', '縮小', '全体', '収納', '広く']) {
    const q = r.指[名2] || {};
    確(`${名}：${名2}を指で触れる（端末が click を起こせる）`, !!q.有 && q.既定 === true,
      !q.有 ? '釦が無い' : q.既定 ? '既定は生きている' : '触れはじめが止められている');
  }
  const 手 = r.指['取っ手'] || {};
  確(`${名}：しまった道具立てを取っ手で戻せる`, !手.有 || (手.既定 === true && 手.動 === true),
    手.有 ? `既定${手.既定 ? '生き' : '殺され'}／戻り${手.動 ? '有' : '無'}` : '取っ手なし');
  確(`${名}：盤そのものに触れたときは、端末の既定を止める`, r.盤の既定 === false,
    r.盤の既定 === false ? '止めている' : '止めていない（画面が流れる）');
}

console.log(`\n════ 指の操作：咎 ${咎.length} 件`);
console.log('エラー:', 咎.length ? 咎.join(' | ') : 'なし');
process.exit(咎.length ? 1 : 0);
