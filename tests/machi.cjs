/* 特殊勢力と家紋（GDD 5.4 / 13.1）。

   一、その土地を切り取らねば、どの特殊勢力とも交渉できないこと
       水軍衆のために書いた決まりだったが、湊にも寺社にも忍びの里にも
       鉱山にも等しく及ぶ。判じは一つ、画面と処理の両方がそこを通る。

   二、家紋。百十三家が十六の型を分け合い、三十五家が「三つ盛」、伊達と島津が
       同じ「丸に十」、尼子が武田菱を掲げていた。紋は家の顔である。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const s = H.initState('oda');
const 町 = (id) => H.TOWNS.find((x) => x.id === id);

/* ------------------------ 一、決まりは全ての種に及ぶこと */
{
  const 種 = [...new Set(H.TOWNS.map((t) => t.kind))];
  確('特殊勢力は九種ある', 種.length === 9, 種.join('・'));

  // 種ごとに、遠い家は手が出せず、隣の城を持つ家は手が出せる
  let 通 = 0;
  for (const kind of 種) {
    const t = H.TOWNS.find((x) => x.kind === kind);
    // その町にいちばん近い城の家
    let 隣 = null, bd = 1e9;
    for (const c of s.castles) {
      const d = Math.hypot(c.x - H.px(t.lon), c.y - H.py(t.lat));
      if (d < bd) { bd = d; 隣 = c; }
    }
    const 主 = H.特殊勢力の可否(s, t, 隣.faction);
    const 他 = s.castles.find((c) => c.faction !== 隣.faction);
    const 余 = H.特殊勢力の可否(s, t, 他.faction);
    if (主.ok && !余.ok) 通++;
    else console.log(`    ★ ${kind}（${t.name}）で通らない`);
  }
  確('九種すべてで「隣の城を持つ家だけ」が効く', 通 === 種.length, `${通}/${種.length}種`);

  // 種を問わず、遠い町へは手が出せない
  const 遠 = H.TOWNS.filter((t) => !H.特殊勢力の可否(s, t, 'oda').ok);
  確('織田が手を出せぬ町のほうが多い', 遠.length > H.TOWNS.length * 0.8,
    `${遠.length}/${H.TOWNS.length}か所は手が届かない`);
  const 届 = H.TOWNS.filter((t) => H.特殊勢力の可否(s, t, 'oda').ok);
  確('尾張の湊と市には手が届く', 届.length >= 2, 届.map((t) => `${t.name}(${t.kind})`).join('・'));

  /* 東国と奥羽が手薄だった。地方ごとに、動かせる特殊勢力があること。 */
  const 帯 = [['九州', 0, 131.5], ['中国四国', 131.5, 135], ['畿内', 135, 136.5],
    ['東海', 136.5, 138.5], ['関東甲信', 138.5, 140.3], ['奥羽', 140.3, 150]];
  const 数え = 帯.map(([n, a2, b2]) => [n, H.TOWNS.filter((t) => t.lon >= a2 && t.lon < b2).length]);
  確('どの地方にも十か所以上ある', 数え.every(([, n]) => n >= 10),
    数え.map(([n, v]) => `${n}${v}`).join('／'));
  確('馬の牧と鉄砲の鍛冶が置かれている',
    H.TOWNS.some((t) => t.kind === '牧') && H.TOWNS.some((t) => t.kind === '鉄砲鍛冶'),
    `牧${H.TOWNS.filter((t) => t.kind === '牧').length}・鍛冶${H.TOWNS.filter((t) => t.kind === '鉄砲鍛冶').length}`);
  確('石見銀山と国友の鍛冶がある',
    H.TOWNS.some((t) => t.id === 'iwami_gin') && H.TOWNS.some((t) => t.id === 'kunitomo'));

  // 寺社と忍びの里でも、処理そのものが塞がれること（画面を通さず叩く）
  for (const [id, key] of [['ishiyama_monto', '保護'], ['koga_shu', '雇用']]) {
    const t = 町(id);
    const 前 = s.factions[s.player].gold;
    const t2 = H.doSpecial(s, id, key);
    確(`${t.name}（${t.kind}）は、遠ければ処理も通らない`,
      t2.factions[s.player].gold === 前 && /誼を通じられぬ/.test(t2.msg || ''),
      t2.msg || '（報せなし）');
  }
}

/* ------------------ 一の二、町が地図に描ける座標を持つこと

   特殊勢力の印を種ごとの形にしたのに、地図には何も出なかった。
   町は lon/lat しか持たず、x/y は入っていない（paths.js が別に NODES へ
   写しているだけである）。地図は S(t.x, t.y) を呼んでいたので、NaN が返り、
   一つも描かれていなかった。印を凝っても、描かれなければ意味がない。

   ここでは、地図が使う座標が数として成り立っていることを確かめる。 */
{
  const 悪 = [];
  for (const t of H.TOWNS) {
    const x = H.px(t.lon), y = H.py(t.lat);
    if (!Number.isFinite(x) || !Number.isFinite(y)) 悪.push(`${t.name}(${x},${y})`);
  }
  確('すべての町が、地図に置ける座標を持つ', 悪.length === 0, 悪.slice(0, 5).join('・') || `${H.TOWNS.length}か所`);
  確('町そのものには x/y が入っていない（lon/lat から出す）',
    H.TOWNS.every((t) => t.x === undefined),
    'S(t.x, t.y) と書けば NaN になる。px(t.lon) を通すこと');

  // 押した所から町を拾う勘定も、同じ座標で行われること
  const 津島 = H.TOWNS.find((t) => t.id === 'tsushima');
  const wx = H.px(津島.lon) + 3, wy = H.py(津島.lat) - 2;    // 印のすぐ脇を押す
  let 当 = null, bd = 20;
  for (const t of H.TOWNS) {
    const d = Math.hypot(H.px(t.lon) - wx, H.py(t.lat) - wy);
    if (d < bd) { bd = d; 当 = t; }
  }
  確('印のそばを押せば、その町が拾える', 当 && 当.id === 'tsushima',
    当 ? `${当.name}（${bd.toFixed(1)}歩）` : '拾えない');
}

/* ------------------------ 二、家紋 */
{
  const 家 = Object.values(H.FACTIONS);
  確('家は百十三ある', 家.length === 113, `${家.length}家`);
  const 型 = new Set(家.map((f) => f.mon || ''));
  確('紋の型が四十種を超える', 型.size >= 40, `${型.size}種（直す前は16種）`);

  const 数 = {};
  for (const f of 家) 数[f.mon || ''] = (数[f.mon || ''] || 0) + 1;
  const 最多 = Object.entries(数).sort((a, b) => b[1] - a[1])[0];
  確('ひとつの型に寄りすぎない', 最多[1] <= 36,
    `いちばん多いのは「${最多[0]}」で${最多[1]}家（三つ巴は日本で最も多い紋である）`);

  // 名の知れた家は、史料どおりの紋であること
  const 正 = {
    oda: '木瓜', takeda: '四つ割菱', hojo: '三つ鱗', imagawa: '赤鳥', matsudaira: '葵',
    mori: '一文字三星', amago: '平四つ目結', ouchi: '大内菱', shimazu: '丸に十',
    otomo: '杏葉', ryuzoji: '日足', chosokabe: '酢漿草', rokkaku: '四つ目結',
    date: '竹に雀', satake: '扇', chiba: '月星', honganji: '下がり藤',
    ashikaga: '二つ引両', kono: '折敷に三文字', kuki: '七曜', saika: '八咫烏',
    miyoshi: '三階菱', soma: '繋ぎ馬', asakura: '三つ盛木瓜', kitabatake: '割り菱',
  };
  let 合 = 0; const 違 = [];
  for (const [id, mon] of Object.entries(正)) {
    if (H.FACTIONS[id] && H.FACTIONS[id].mon === mon) 合++;
    else 違.push(`${(H.FACTIONS[id] || {}).name || id}=${(H.FACTIONS[id] || {}).mon}`);
  }
  確('名の知れた家の紋が、史料どおりである', 合 === Object.keys(正).length,
    違.length ? 違.join('・') : `${合}家を検めた`);

  確('伊達と島津が同じ紋ではない', H.FACTIONS.date.mon !== H.FACTIONS.shimazu.mon,
    `伊達=${H.FACTIONS.date.mon} ／ 島津=${H.FACTIONS.shimazu.mon}`);
  確('尼子が武田菱を掲げていない', H.FACTIONS.amago.mon !== H.FACTIONS.takeda.mon,
    `尼子=${H.FACTIONS.amago.mon} ／ 武田=${H.FACTIONS.takeda.mon}`);

  /* すべての紋が、例外を出さずに描けること。
     型を増やしたので、綴りの取り違えが一つあると、その家の城だけ描けなくなる。 */
  const 落 = new Proxy({}, { get: (t, p) => {
    if (p === 'measureText') return () => ({ width: 20 });
    if (String(p).startsWith('create')) return () => ({ addColorStop: () => {} });
    return () => {};
  } });
  let 描 = 0; const 描け = [];
  for (const m of 型) {
    try { H.drawMon(落, m, 0, 0, 12, '#000', '#fff'); 描++; }
    catch (e) { 描け.push(`${m}：${e.message}`); }
  }
  確('どの紋も例外なく描ける', 描け.length === 0, 描け.join(' / ') || `${描}種を描いた`);

  // 特殊勢力の印も同じく
  const 印 = ['港', '水軍衆', '商業都市', '町', '寺社', '忍びの里', '鉱山', '牧', '鉄砲鍛冶'];
  let 印け = [];
  for (const k of 印) {
    try { H.drawTownMark(落, k, 0, 0, 10, '#000'); } catch (e) { 印け.push(`${k}：${e.message}`); }
  }
  確('特殊勢力の印も例外なく描ける', 印け.length === 0, 印け.join(' / ') || `${印.length}種`);
}

/* ------------------------ 三、城の構えと、盤の広さ

   どの城も同じ正方形の三重で、山城も平城も、堀の広さも門の数も同じだった。
   五隊も出せば城の周りが一杯になり、横に並べて門へ押すのが精一杯であった。 */
{
  const 城 = (n) => H.CASTLES.find((x) => x.name === n);
  const 構 = {};
  for (const c of H.CASTLES) 構[H.城の構え(c)] = (構[H.城の構え(c)] || 0) + 1;
  確('城は三つの構えに分かれる', Object.keys(構).length === 3,
    Object.entries(構).map(([k, v]) => `${k}${v}`).join('／'));
  確('名の知れた山城が山城とされる',
    ['稲葉山城', '月山富田城', '春日山城', '小谷城', '七尾城', '観音寺城']
      .every((n) => H.城の構え(城(n)) === '山城'));
  確('平地の館が平城とされる',
    ['躑躅ヶ崎館', '二条御所', '清洲城'].every((n) => H.城の構え(城(n)) === '平城'));

  const 見 = (n) => { const m = H.layoutCastleField(H.buildCastleMap(城(n)));
    const o = m.layers[0], h = m.layers[m.layers.length - 1];
    return { m, 縦横: (o.hw / o.hh), 門: m.gates.length, 盤: H.FIELD.w * H.FIELD.h,
      本: Math.min(h.hw * 2, h.hh * 2) }; };
  const 山 = 見('月山富田城'), 平 = 見('清洲城');
  確('山城は空堀、平城は水堀', 山.m.moat.空堀 === true && 平.m.moat.空堀 === false);
  確('山城には坂があり、平城にはない', 山.m.坂 >= 1 && 平.m.坂 === 0,
    `山城 坂${山.m.坂} ／ 平城 坂${平.m.坂}`);
  確('平城のほうが門が多い', 平.門 > 山.門, `平城${平.門}門 ／ 山城${山.門}門`);

  // 縄張りが城ごとに違うこと
  const 比 = ['稲葉山城', '月山富田城', '小田原城', '清洲城', '岡崎城', '三木城']
    .map((n) => 見(n).縦横);
  確('城ごとに縄張りの形が違う', new Set(比.map((v) => v.toFixed(2))).size >= 5,
    比.map((v) => v.toFixed(2)).join('／'));

  // どの城でも、本丸に隊が入るだけの広さがある
  let 狭 = 0;
  for (const c of H.CASTLES) {
    const m = H.layoutCastleField(H.buildCastleMap(c));
    const h = m.layers[m.layers.length - 1];
    if (h.hw * 2 < 230 || h.hh * 2 < 190) 狭++;
  }
  確('どの城の本丸にも隊が入る', 狭 === 0, `${H.CASTLES.length}城を検めた`);

  /* 野の広さは隊の数でも決まること。
     兵数だけで決めていたころは、五隊も出せば戦場が一杯になった。 */
  H.layoutField(6000, 2); const 二 = H.FIELD.w * H.FIELD.h;
  H.layoutField(6000, 6); const 六 = H.FIELD.w * H.FIELD.h;
  確('隊が増えれば野も広がる', 六 > 二 * 2.5,
    `二隊 ${H.FIELD.w && Math.round(二 / 1e6)}百万歩² → 六隊 ${Math.round(六 / 1e6)}百万歩²`);
  H.layoutField(6000, 6);
  確('六隊なら一隊あたり四十万歩²以上ある', 六 / 6 > 400000,
    `一隊あたり ${Math.round(六 / 6 / 1000)}千歩²`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
