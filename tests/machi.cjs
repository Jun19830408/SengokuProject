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
  確('特殊勢力は七種ある', 種.length === 7, 種.join('・'));

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
  確('七種すべてで「隣の城を持つ家だけ」が効く', 通 === 種.length, `${通}/${種.length}種`);

  // 種を問わず、遠い町へは手が出せない
  const 遠 = H.TOWNS.filter((t) => !H.特殊勢力の可否(s, t, 'oda').ok);
  確('織田が手を出せぬ町のほうが多い', 遠.length > H.TOWNS.length * 0.8,
    `${遠.length}/${H.TOWNS.length}か所は手が届かない`);
  const 届 = H.TOWNS.filter((t) => H.特殊勢力の可否(s, t, 'oda').ok);
  確('尾張の湊と市には手が届く', 届.length >= 2, 届.map((t) => `${t.name}(${t.kind})`).join('・'));

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
  const 印 = ['港', '水軍衆', '商業都市', '町', '寺社', '忍びの里', '鉱山'];
  let 印け = [];
  for (const k of 印) {
    try { H.drawTownMark(落, k, 0, 0, 10, '#000'); } catch (e) { 印け.push(`${k}：${e.message}`); }
  }
  確('特殊勢力の印も例外なく描ける', 印け.length === 0, 印け.join(' / ') || `${印.length}種`);
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
