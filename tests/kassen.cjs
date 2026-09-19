/* ==========================================================================
   合戦（筋書きのある一戦）── 関ヶ原

   キャンペーンの合戦は、そのときの家と兵から盤を組み立てる。ここで見るのは
   その逆で、地形も布陣も史実に定めた一戦である。

   見るのは八つ。
     一　野が写しどおりに組めているか（山・川・街道・橋）
     二　布陣が盤に収まり、隊数と兵数が表と合うか
     三　黄の隊は戦に加わらないか（撃たず・撃たれず・動かず）
     四　南宮山の押さえは、山の去就が決まるまで動けないか
     五　決まれば手が離れるか
     六　小早川は、条件が揃わねば東へ、揃えば西へ傾くか
     七　日暮れまでに決着がつくか
     八　途中の控えから戻せるか
   ========================================================================== */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const {
  合戦を仕立てる, 合戦を畳む, 合戦の問いに答える, 指図の縛り, 合戦を控える, 合戦を戻す,
  stepBattle, corpsMen, terrainAt, FIELD, MOUNTAINS, TERRAIN, 関ヶ原, placeSquads, 山が遮るか,
  setFieldKind, setFieldSeed, layoutField,
} = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 賽 = (n) => {
  let 種 = n | 0;
  Math.random = function () {
    種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
    let t = 種; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ------------------------------------------------ 一　野が写しどおりか */
console.log('\n── 一　関ヶ原の野');
賽(11);
{
  const r = 合戦を仕立てる('sekigahara', '西');
  確('筋書きから盤が組める', !!r && !!r.b);
  確('野の広さが布陣図どおり', FIELD.w === 8156 && FIELD.h === 5894, `${FIELD.w}×${FIELD.h}歩（一歩＝0.8m）`);
  確('山が立っている', MOUNTAINS.length >= 5, `${MOUNTAINS.length}――${[...new Set(MOUNTAINS.map((m) => m.名))].join('・')}`);
  // 南宮山の頂は山、関ヶ原の野は平地、相川の芯は淵
  const 南 = MOUNTAINS.find((m) => m.名 === '南宮山');
  確('南宮山の上は山である', terrainAt(南.x, 南.y) === 'mountain', `${terrainAt(南.x, 南.y)}`);
  確('関ヶ原の野は平地である', terrainAt(3900, 2600) === 'plain', `${terrainAt(3900, 2600)}`);
  const 川 = 関ヶ原.地形.川.find((x) => x.名 === '相川');
  const n = 川.節[Math.floor(川.節.length / 2)];
  確('相川の芯は淵である', terrainAt(n.x, n.y) === 'deep', `${terrainAt(n.x, n.y)}`);
  const 橋 = 川.渡し.find((w) => w.種 === '橋');
  確('相川に橋が架かっている', terrainAt(橋.x, 橋.y) === 'bridge', `${terrainAt(橋.x, 橋.y)}`);
  const 道 = 関ヶ原.地形.道.find((x) => x.名 === '中山道');
  const d = 道.節[Math.floor(道.節.length / 2)];
  確('中山道が通っている', terrainAt(d.x, d.y) === 'road', `${terrainAt(d.x, d.y)}`);
  確('山は丘より足が鈍る', TERRAIN.mountain.speed < TERRAIN.hill.speed,
    `山 ${TERRAIN.mountain.speed} ／ 丘 ${TERRAIN.hill.speed}`);
  確('山は丘より遠くまで見える', TERRAIN.mountain.sight > TERRAIN.hill.sight,
    `山 ${TERRAIN.mountain.sight} ／ 丘 ${TERRAIN.hill.sight}`);
  // 山は向こう側を隠す。ただし山の上にいるなら隠されない
  const 南宮 = MOUNTAINS.find((m) => m.名 === '南宮山');
  確('山は向こう側を隠す',
    山が遮るか(南宮.x - 南宮.r * 2, 南宮.y, 南宮.x + 南宮.r * 2, 南宮.y));
  確('山の脇は隠されない',
    !山が遮るか(南宮.x - 南宮.r * 2, 南宮.y + 南宮.r * 1.6, 南宮.x + 南宮.r * 2, 南宮.y + 南宮.r * 1.6));
  確('山の上からは見える（見下ろしているのだから）',
    !山が遮るか(南宮.x, 南宮.y, 南宮.x + 南宮.r * 2, 南宮.y));
  合戦を畳む();
}

/* ------------------------------------- 一の二　山（街道ごとの野） */
console.log('\n── 一の二　山越えの街道に立つ山');
賽(17);
{
  setFieldKind('街道'); setFieldSeed('a', 'b'); layoutField(8000, 6);
  確('街道の野に山は立たない', MOUNTAINS.length === 0);
  setFieldKind('山道'); setFieldSeed('a', 'b'); layoutField(8000, 6);
  確('山道の野には山が一つ立つ', MOUNTAINS.length === 1, `${MOUNTAINS.map((m) => Math.round(m.r) + '歩').join('・')}`);
  setFieldKind('難所'); setFieldSeed('a', 'b'); layoutField(8000, 6);
  確('難所の野には山が二つ立つ', MOUNTAINS.length === 2, `${MOUNTAINS.map((m) => Math.round(m.r) + '歩').join('・')}`);
  // 山を川が貫かないこと（六十の野で）
  let 貫 = 0;
  for (let i = 0; i < 60; i++) {
    setFieldKind(i % 2 ? '難所' : '山道'); setFieldSeed('c' + i, 'd' + i); layoutField(6000 + i * 120, 6);
    for (const m of MOUNTAINS) {
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const t = terrainAt(m.x + Math.cos(a) * m.r * 0.7, m.y + Math.sin(a) * m.r * 0.7);
        if (t === 'deep' || t === 'ford' || t === 'bridge') { 貫++; k = 99; }
      }
    }
  }
  確('川が山を貫かない', 貫 === 0, `六十の野で ${貫} 件`);
  setFieldKind('街道');
}

/* ------------------------------------------------ 二　布陣 */
console.log('\n── 二　布陣');
賽(12);
{
  const b = 合戦を仕立てる('sekigahara', '西').b;
  const 旗 = (f) => b.corps.filter((c) => c.筋 && c.筋.旗 === f);
  const 兵 = (l) => Math.round(l.reduce((a, c) => a + corpsMen(c), 0));
  確('六十三隊が並ぶ', b.corps.length === 63, `${b.corps.length}隊`);
  確('西軍は十六隊', 旗('西').length === 16, `${兵(旗('西')).toLocaleString()}人`);
  確('東軍は三十四隊', 旗('東').length === 34, `${兵(旗('東')).toLocaleString()}人`);
  確('去就の定まらぬ隊は十三隊', 旗('黄').length === 13, `${兵(旗('黄')).toLocaleString()}人`);
  確('盤からはみ出した隊がない',
    b.corps.every((c) => c.x >= 0 && c.y >= 0 && c.x <= FIELD.w && c.y <= FIELD.h));
  const 三成 = b.corps.find((c) => c.name === '石田三成');
  const 家康 = b.corps.find((c) => /徳川家康/.test(c.name));
  確('三成は西、家康は東に立つ', 三成.x < FIELD.w * 0.3 && 家康.x > FIELD.w * 0.5,
    `三成 x=${Math.round(三成.x)} ／ 家康 x=${Math.round(家康.x)}`);
  確('黄の隊は日和見として置かれる', 旗('黄').every((c) => c.日和見));
  確('南宮山の押さえは六隊', b.corps.filter((c) => c.縛り).length === 6);
  合戦を畳む();
}

/* ------------------------------------------------ 三　黄の隊は戦に加わらない */
console.log('\n── 三　去就の定まらぬ隊');
賽(13);
{
  const b = 合戦を仕立てる('sekigahara', '西').b;
  b.phase = 'fight'; b.委ねた = true;
  for (const c of b.corps) c.auto = true;
  const 黄 = b.corps.filter((c) => c.日和見);
  const 元 = 黄.map((c) => ({ x: c.x, y: c.y, 兵: corpsMen(c) }));
  for (let i = 0; i < 300; i++) { if (b.筋書き.問い) 合戦の問いに答える(b, false); stepBattle(b, 0.2); }
  const なお黄 = 黄.filter((c) => c.日和見);
  const 動 = なお黄.map((c, k) => Math.hypot(c.x - 元[黄.indexOf(c)].x, c.y - 元[黄.indexOf(c)].y));
  const 損 = なお黄.map((c) => 元[黄.indexOf(c)].兵 - corpsMen(c));
  確('日和見のままの隊は動かない', 動.every((d) => d < 40), `いちばん動いた隊で ${Math.round(Math.max(0, ...動))}歩`);
  確('日和見のままの隊は撃たれない', 損.every((d) => d < 1), `いちばん減った隊で ${Math.round(Math.max(0, ...損))}人`);
  合戦を畳む();
}

/* ------------------------------------------------ 四・五　南宮山の押さえ */
console.log('\n── 四　南宮山の押さえ');
賽(14);
{
  const b = 合戦を仕立てる('sekigahara', '東').b;
  b.phase = 'fight'; b.委ねた = true;
  for (const c of b.corps) c.auto = true;
  const 押 = b.corps.filter((c) => c.縛り);
  const 元 = 押.map((c) => ({ x: c.x, y: c.y }));
  確('押さえには下知できない', !!指図の縛り(b, 押[0]), 指図の縛り(b, 押[0]) || '');
  確('押さえでない隊には下知できる',
    !指図の縛り(b, b.corps.find((c) => /福島正則/.test(c.name))));
  let 決 = null, 決時の動 = null;
  for (let i = 0; i < 4000 && b.phase === 'fight'; i++) {
    if (b.筋書き.問い) 合戦の問いに答える(b, true);
    stepBattle(b, 0.2);
    if (!決 && b.筋書き.南宮山 !== '未') {
      決 = { t: b.t, 状: b.筋書き.南宮山 };
      決時の動 = 押.map((c, k) => Math.hypot(c.x - 元[k].x, c.y - 元[k].y));
      break;
    }
  }
  確('南宮山の去就はいずれ決まる', !!決, 決 ? `${Math.round(決.t)}秒に「${決.状}」` : 'ついに決まらず');
  確('決まるまで押さえはその場を離れない', 決時の動 && 決時の動.every((d) => d < 120),
    決時の動 ? `いちばん動いた隊で ${Math.round(Math.max(...決時の動))}歩` : '');
  確('決まれば縛りが解ける', 押.every((c) => !c.縛り));
  確('解けたあとは下知できる', !指図の縛り(b, 押[0]));
  const 前 = 押.map((c) => ({ x: c.x, y: c.y }));
  for (let i = 0; i < 400 && b.phase === 'fight'; i++) {
    if (b.筋書き.問い) 合戦の問いに答える(b, true);
    stepBattle(b, 0.2);
  }
  const 後動 = 押.map((c, k) => Math.hypot(c.x - 前[k].x, c.y - 前[k].y));
  確('手が離れれば押さえは動き出す', 後動.some((d) => d > 300),
    `いちばん動いた隊で ${Math.round(Math.max(...後動))}歩`);
  合戦を畳む();
}

/* ------------------------------------------------ 六　小早川の分岐 */
console.log('\n── 六　小早川の去就');
賽(15);
{
  // 条件が揃わないとき ── 問鉄砲を受ければ東へ傾く
  const b = 合戦を仕立てる('sekigahara', '東').b;
  b.phase = 'fight'; b.委ねた = true;
  for (const c of b.corps) c.auto = true;
  for (let i = 0; i < 4000 && b.phase === 'fight' && b.筋書き.小早川 === '未'; i++) {
    if (b.筋書き.問い) 合戦の問いに答える(b, true);
    stepBattle(b, 0.2);
  }
  確('条件が揃わなければ小早川は東へ傾く', b.筋書き.小早川 === '東', `${b.筋書き.小早川}`);
  const 小 = b.corps.filter((c) => c.筋 && c.筋.属 === '小早川');
  確('小早川勢は旗色が決まると動き出せる', 小.every((c) => !c.日和見));
  確('小早川勢は遊ぶ側（東軍）に付く', 小.every((c) => c.side === 'P'));
  合戦を畳む();
}
賽(16);
{
  // 条件が揃うとき ── 西軍として山を下りる
  const b = 合戦を仕立てる('sekigahara', '西').b;
  b.phase = 'fight'; b.委ねた = true;
  for (const c of b.corps) c.auto = true;
  // 遊ぶ側が上手く戦った体を作る：東軍の前線を三割削り、大谷勢を松尾山の麓へ置く
  for (const c of b.corps) {
    if (c.筋 && c.筋.旗 === '東' && !c.控え && !c.縛り) for (const q of c.squads) q.men *= 0.70;
  }
  let k = 0;
  for (const c of b.corps) {
    if (!/大谷|戸田|木下|平塚/.test(c.name)) continue;
    c.x = 1812 + (k++ % 2 ? 600 : -600); c.y = 4045 - 900; placeSquads(c, true);
  }
  for (let i = 0; i < 200 && b.筋書き.小早川 === '未'; i++) {
    if (b.筋書き.問い) 合戦の問いに答える(b, true);
    stepBattle(b, 0.2);
  }
  確('条件が揃えば小早川は西へ起つ', b.筋書き.小早川 === '西', `${b.筋書き.小早川}`);
  const 小 = b.corps.filter((c) => c.筋 && c.筋.属 === '小早川');
  確('西へ起った小早川勢は遊ぶ側（西軍）に付く', 小.every((c) => c.side === 'P'));
  合戦を畳む();
}

/* ------------------------------------------------ 七　決着 */
console.log('\n── 七　決着');
for (const [側, 種] of [['西', 21], ['東', 22], ['西', 23]]) {
  賽(種);
  const b = 合戦を仕立てる('sekigahara', 側).b;
  b.phase = 'fight'; b.委ねた = true;
  for (const c of b.corps) c.auto = true;
  let n = 0;
  while (b.phase === 'fight' && n < 30000) {
    if (b.筋書き.問い) 合戦の問いに答える(b, true);
    stepBattle(b, 0.2); n++;
  }
  確(`${側}軍で始めた戦が日暮れまでに決着する`, b.phase === 'over' && b.t <= b.dusk + 1,
    `${Math.round(b.t)}秒／日暮れ ${b.dusk}秒　結果=${b.result}　小早川=${b.筋書き.小早川}　南宮山=${b.筋書き.南宮山}`);
  合戦を畳む();
}

/* ------------------------------------------------ 八　途中の控え */
console.log('\n── 八　途中から続ける');
賽(31);
{
  const b = 合戦を仕立てる('sekigahara', '東').b;
  b.phase = 'fight'; b.委ねた = true;
  for (const c of b.corps) c.auto = true;
  for (let i = 0; i < 900; i++) { if (b.筋書き.問い) 合戦の問いに答える(b, true); stepBattle(b, 0.2); }
  const 文 = JSON.stringify(合戦を控える(b));
  const 戻 = 合戦を戻す(JSON.parse(文)).b;
  const 兵 = (x) => Math.round(x.corps.reduce((a, c) => a + corpsMen(c), 0));
  確('控えは小さく収まる', 文.length < 300 * 1024, `${(文.length / 1024).toFixed(0)}KB`);
  確('戻した盤の兵がほぼ揃う', Math.abs(兵(戻) - 兵(b)) < 兵(b) * 0.01,
    `元 ${兵(b).toLocaleString()} ／ 戻 ${兵(戻).toLocaleString()}`);
  確('刻と旗色が揃う', Math.round(戻.t) === Math.round(b.t)
    && 戻.筋書き.小早川 === b.筋書き.小早川 && 戻.筋書き.南宮山 === b.筋書き.南宮山);
  確('日和見と縛りの数が揃う',
    戻.corps.filter((c) => c.日和見).length === b.corps.filter((c) => c.日和見).length
    && 戻.corps.filter((c) => c.縛り).length === b.corps.filter((c) => c.縛り).length);
  for (let i = 0; i < 300 && 戻.phase === 'fight'; i++) stepBattle(戻, 0.2);
  確('戻した盤を続けて動かせる', 戻.t > b.t, `${Math.round(b.t)}秒 → ${Math.round(戻.t)}秒`);
  合戦を畳む();
}

console.log(`\n════ 合戦：咎 ${咎.length} 件`);
console.log(咎.length ? 'エラー: ' + 咎.join('、') : 'エラー: なし');
if (咎.length) process.exitCode = 1;
