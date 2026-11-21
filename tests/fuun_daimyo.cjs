/* ============================================================
   風雲モード：大名への道の試験（hitori/daimyo.js・core/house.js pickHeir と succeed・core/state.js 風雲の主を大名に・
   govern/war.js sackCastle・hitori/FuunYashiki.jsx）

   遊ぶ人の答え：「1はabc全てですね。bに関しては、このモードの肝になると思います。主人公が宿老となり、大名の城に在陣して
   そこを急襲し、城を落とせれば下剋上完了です。このとき、特別に城攻めを下剋上というコマンド名にしましょう。…他の城主が
   いなければ（城が大名の城一つの場合も含む）そのまま全ての武将が下剋上に従うのでいいと思います。他の城主がいる場合（国主、
   旗頭を含む）ですが、城主との友好関係が100ならかなりの高確率で下剋上に従い、それ以下なら元の忠誠心との関係で確率が逓減して
   いく感じにしたいです。宿老となったところで、各城主との友好度をあげるとともに、調略（忠誠心を下げる）を味方城主にもできる
   ようにしたいですね。下準備をして各城（国主、旗頭が従う場合は、その国主らの寄騎も従う）が従うかどうか決まるようにしたい
   です。Cとの違いは自分の寄騎以外にも影響を与えられるところかなと思います。ただし、Cも友好度と忠誠心によって従う城、従わない
   城が出てくるようにもしたいですが、Bよりも従いやすくしたいですね」・「風雲モードはモードで、大名でキャンペーンと同じシステムに」
     一、(a) 家督：血筋の跡継ぎがいなければ、宿老の主人公が家を継ぎ、大名になる（いれば血筋が継ぐ。宿老でなければ継がない）
     二、下準備：誼を通じる（友好）・調略（忠誠）。城主ごとに月に一度、預かった金から
     三、見込み：友好百なら下剋上で九割。友好が低いほど・忠誠が高いほど落ちる。独立は下剋上より従いやすい
     四、下剋上の構え：宿老が自ら率いる軍で当主の城に在陣していること。出陣の画面の行き先に当主の城が加わる
     五、下剋上の旗揚げ：主人公の家を興し、軍と城の者が付き、当主の城を囲んで急襲する（大名になり、遊ぶ家が替わる）
     六、下剋上を成す：旧主の当主と親・子（姫も）は死に、兄弟は忠誠で追死か従う。家にほかの城主がいなければみな従う。城主が
         いれば見込みで決まり、国主が従えば寄騎も従う。金を分ける
     七、(c) 独立：国主・旗頭なら、寄騎とともに家を興す。従わぬ寄騎の城は旧主に残る
     八、大名になれば、風雲の合戦の見分けは働かず（キャンペーンの合戦）、守りの除けも外れる
     九、屋敷：下準備の欄・下剋上の釦・問い
   値はみな仮。
   ============================================================ */
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
global.IS_REACT_ACT_ENVIRONMENT = true; dom.window.IS_REACT_ACT_ENVIRONMENT = true;
const ctxStub = new Proxy({}, { get: (t, p) => { if (p === 'measureText') return () => ({ width: 30 }); return () => ({ addColorStop: () => {} }); } });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
const errs = []; console.error = (...a) => errs.push(String(a[0]).slice(0, 200));
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { createRoot, act, React, initState } = H;
const 咎 = [];
const 確 = (名, 可, 添 = '') => { console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`); if (!可) 咎.push(名); };
let 種 = 0x3D19;
Math.random = () => { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 宿老の風雲 = () => {
  const s = initState('oda'); H.風雲を始める(s, '与平');
  const f = s.風雲; f.身分 = '三百人長'; f.勲功 = 270; H.取り立てを見る(s); H.名乗りを定める(s, '木下', '藤吉郎');
  const 境 = H.身分の境(s, H.主人公の仮の武将(s));
  f.知行 = 境.侍大将; H.禄高の身分を見る(s); f.知行 = 境.家老; H.禄高の身分を見る(s);
  f.始め = { ...f.始め, 年: f.始め.年 - 7 };                       // 主人公は十三で仕え始め、宿老は二十から（core/rank.js 身分に就ける齢）
  f.知行 = 境.宿老 + 10; H.禄高の身分を見る(s);
  f.城の預け = 300; f.知らせ = [];
  return s;
};
const 当主を見る = (s, fid = s.player) => s.generals.find((x) => x.faction === fid && x.lord && !x.captive);
/* 他家の城を家に移す（そこにいた他家の将は、その家の別の城へ移す） */
const 城を移す = (s, id) => {
  const c = s.castles.find((x) => x.id === id), 旧 = c.faction;
  const 退く = s.castles.find((x) => x.faction === 旧 && x.id !== id);
  for (const g of s.generals.filter((x) => x.at === id && x.faction === 旧)) { g.at = 退く ? 退く.id : null; if (g.本領 === id) g.本領 = 退く ? 退く.id : null; }
  c.faction = s.player; c.lordId = null; c.城代 = false;
  return c;
};
/* 主人公の軍を、当主の城に在陣させる（出陣して着いた形） */
const 当主の城に在陣 = (s) => {
  const g = H.主人公の武将(s), 当 = H.当主の城(s), 我 = H.主人公の城(s);
  g.at = null;
  const a = { id: '主の軍', faction: s.player, from: 我.id, gens: [g.id], local: 3000, localTrain: 60, rost: H.newRoster(3000, 'arm-主の軍'),
    men: 3000 + (g.retinue || 0), at: 当.id, path: [当.id], prog: 0, food: 9999, target: null, 在陣: 当.id, 風雲の主の軍: true };
  s.armies.push(a);
  return a;
};

(async () => {
  console.log('── 一　(a) 家督：血筋の跡継ぎがいなければ、宿老の主人公が家を継いで大名になる');
  {
    const s = 宿老の風雲(), f = s.風雲, g = H.主人公の武将(s), 当主 = 当主を見る(s), 家 = s.player;
    for (const x of s.generals.filter((q) => q.faction === 家 && !q.lord && /^織田/.test(q.name))) x.faction = 'imagawa';   // 血筋を家から外す
    H.succeed(s, 当主, '病で没した');
    確('宿老の主人公が家督を継ぐ', g.lord && f.身分 === '大名' && f.大名 && f.大名.道 === '家督');
    確('遊ぶ家はそのままで、AIの差配が止まる（キャンペーンと同じく遊ぶ人が差配する）', s.player === 家 && s.autoPlay === false);
    確('家の名は主人公の姓に改まる（血の絶えた家を姓の違う者が継ぐときのキャンペーンの決まり）', s.factions[家].name === '木下家', s.factions[家].name);
    確('大名の印', H.風雲の大名か(s) && !H.風雲で守られるか(s, g));
    const s2 = 宿老の風雲(), g2 = H.主人公の武将(s2);
    const 継 = H.succeed(s2, 当主を見る(s2), '病で没した');
    確('血筋の跡継ぎがいれば、血筋が継ぐ', 継 && /^織田/.test(継.name) && !g2.lord && s2.風雲.身分 === '宿老', 継 && 継.name);
    const s3 = 宿老の風雲(), g3 = H.主人公の武将(s3);
    s3.風雲.身分 = '家老';
    for (const x of s3.generals.filter((q) => q.faction === s3.player && !q.lord && /^織田/.test(q.name))) x.faction = 'imagawa';
    const 継3 = H.succeed(s3, 当主を見る(s3), '病で没した');
    確('宿老でなければ、主人公は継がない（器量の者が継ぐ）', 継3 && 継3.id !== g3.id && s3.風雲.身分 === '家老', 継3 && 継3.name);
  }

  console.log('\n── 二　下準備：誼を通じる・調略（城主ごとに月に一度、預かった金から）');
  {
    const s = 宿老の風雲(), f = s.風雲;
    const 主ら = H.家の城主ら(s);
    確('家の城主（当主の城と主人公の城を除く）を並べる', 主ら.length >= 1 && 主ら.every((x) => !x.主.lord && !x.主.風雲の主), 主ら.map((x) => `${x.主.name}（${x.城.name}）`).join('・'));
    const 的 = 主ら[0].主;
    確(`友好は初め${H.友好の初め}`, H.友好を見る(f, 的.id) === H.友好の初め);
    const n = H.誼を通じる(s, 的.id);
    確('誼を通じれば友好が上がり、預かった金が減る', H.友好を見る(n.風雲, 的.id) === H.友好の初め + H.誼の上げ(f.知略) && n.風雲.城の預け === 300 - H.誼の費え,
      `友好${H.友好の初め}→${H.友好を見る(n.風雲, 的.id)}`);
    確('もとの盤は書き換えない', H.友好を見る(s.風雲, 的.id) === H.友好の初め && s.風雲.城の預け === 300);
    const n2 = H.誼を通じる(n, 的.id);
    確('同じ城主とは月に一度', /今月もう誼を通じた/.test(n2.風雲.下準備の文 || '') && H.友好を見る(n2.風雲, 的.id) === H.友好を見る(n.風雲, 的.id));
    const 前の忠誠 = n.generals.find((x) => x.id === 的.id).loyal;
    const n3 = H.城主を調略する(n, 的.id, () => 0);
    確('調略すれば当主への忠誠が下がる', n3.generals.find((x) => x.id === 的.id).loyal === Math.max(0, 前の忠誠 - H.調略の下げ(f.知略)) && n3.風雲.城の預け === n.風雲.城の預け - H.調略の費え,
      `${前の忠誠}→${n3.generals.find((x) => x.id === 的.id).loyal}`);
    const n4 = H.城主を調略する(n, 的.id, () => 0.999);
    確('調略はしくじることがある（忠誠は動かず、費えは払う）', n4.generals.find((x) => x.id === 的.id).loyal === 前の忠誠 && /うまくいかなかった/.test(n4.風雲.下準備の文 || ''));
    const 貧 = structuredClone(s); 貧.風雲.城の預け = 5;
    確('預かった金が足りなければできない', /預かった金が足りぬ/.test(H.誼を通じる(貧, 的.id).風雲.下準備の文 || ''));
    const 家老 = structuredClone(s); 家老.風雲.身分 = '家老';
    確('宿老でなければできない', /宿老になってから/.test(H.誼を通じる(家老, 的.id).風雲.下準備の文 || ''));
  }

  console.log('\n── 三　従う見込み');
  {
    確('友好百なら、下剋上で九割（忠誠によらない）', Math.abs(H.下剋上の見込み(100, 90) - 0.9) < 1e-9 && Math.abs(H.下剋上の見込み(100, 10) - 0.9) < 1e-9);
    確('友好が低いほど落ちる', H.下剋上の見込み(70, 50) < H.下剋上の見込み(90, 50) && H.下剋上の見込み(30, 50) < H.下剋上の見込み(70, 50),
      `友好90 ${H.下剋上の見込み(90, 50).toFixed(2)}・70 ${H.下剋上の見込み(70, 50).toFixed(2)}・30 ${H.下剋上の見込み(30, 50).toFixed(2)}（忠誠50）`);
    確('当主への忠誠が高いほど落ちる', H.下剋上の見込み(70, 90) < H.下剋上の見込み(70, 30),
      `忠誠30 ${H.下剋上の見込み(70, 30).toFixed(2)}・90 ${H.下剋上の見込み(70, 90).toFixed(2)}（友好70）`);
    確('独立は、下剋上より従いやすい', [[100, 50], [70, 50], [50, 80], [30, 20]].every(([a, b]) => H.独立の見込み(a, b) > H.下剋上の見込み(a, b)));
  }

  console.log('\n── 四　下剋上の構え：宿老が自ら率いる軍で、当主の城に在陣していること');
  {
    const s = 宿老の風雲(), 当 = H.当主の城(s);
    確('宿老は、出陣の画面で当主の城へ兵を移せる', H.下剋上の在陣先か(s, 当) && !H.下剋上の在陣先か(s, H.主人公の城(s)), 当.name);
    const 家老 = structuredClone(s); 家老.風雲.身分 = '家老';
    確('家老では、当主の城は行き先にならない', !H.下剋上の在陣先か(家老, 当));
    const a = 当主の城に在陣(s);
    確('当主の城に在陣していれば構えが整う', H.下剋上の構え(s, a.id).ok);
    a.在陣 = null; a.at = H.主人公の城(s).id;
    確('在陣していなければ構えは整わない', !H.下剋上の構え(s, a.id).ok && /在陣していない/.test(H.下剋上の構え(s, a.id).訳));
  }

  console.log('\n── 五　下剋上の旗揚げ（主人公の家を興し、当主の城を急襲する）');
  {
    const s = 宿老の風雲(), f = s.風雲, g = H.主人公の武将(s), 旧 = s.player, 我 = H.主人公の城(s), 当 = H.当主の城(s);
    const 城の者 = s.generals.filter((x) => x.at === 我.id && x.faction === 旧 && !x.captive && !x.lord && !x.風雲の主).map((x) => x.id);
    const a = 当主の城に在陣(s);
    const r = H.下剋上を起こす(s, a.id);
    const 家 = r.家;
    確('主人公の家（姓に「家」）を興す', r.ok && s.factions[家] && s.factions[家].name === '木下家', s.factions[家] && s.factions[家].name);
    確('主人公は新しい家の当主で、遊ぶ家になる（AIの差配は止まる）', g.lord && g.faction === 家 && s.player === 家 && s.autoPlay === false && f.身分 === '大名');
    確('主人公の城と、城にいた将が付く', 我.faction === 家 && 城の者.every((id) => s.generals.find((x) => x.id === id).faction === 家), `${城の者.length}人`);
    確('軍は新しい家の軍で、当主の城を囲む（その月の囲みの差配は急襲で済む）', a.faction === 家 && !a.在陣 && a.gens.includes(g.id)
      && s.sieges.some((x) => x.castleId === 当.id && x.armyId === a.id && x.下剋上 && x.decided === `${s.year}-${s.month}`));
    確('旧主とは敵対', H.relOf(s, 家, 旧).state === '敵対');
    確('すぐ城攻めの盤を開く印（地図画面が開く）', f.下剋上 && f.下剋上.盤を待つ && f.下剋上.城 === 当.id);
    確('記に残す', (f.記 || []).some((x) => /下剋上の兵を挙げた/.test(x.文)));
  }

  console.log('\n── 六　下剋上を成す');
  {
    /* 一族の見分け：親子の控え（信長・信行は信秀の子）と、控えの無い同じ姓の者の齢の差（信広は十五下で子、信光・信次は兄弟） */
    {
      const s0 = 宿老の風雲(), 主0 = 当主を見る(s0);
      const 一 = H.旧主の一族(s0, 主0, s0.player, 'なし');
      確('旧主の一族を見分ける（子：親子の控えと齢の差・兄弟：齢の差）', ['織田信長', '織田信行', '織田信広'].every((n) => 一.子.some((q) => q.name === n))
        && ['織田信光', '織田信次'].every((n) => 一.兄弟.some((q) => q.name === n)) && !一.子.concat(一.兄弟).some((q) => q.風雲の主 || q.id === 主0.id),
        `子：${一.子.map((q) => q.name).join('・')}／兄弟：${一.兄弟.map((q) => q.name).join('・')}`);
    }
    /* (一) 家にほかの城主がいなければ、一族の始末ののち、みな従う */
    const s = 宿老の風雲(), 旧 = s.player, 当 = H.当主の城(s), 当主 = 当主を見る(s);
    for (const c of s.castles.filter((x) => x.faction === 旧 && x.lordId && !s.generals.find((q) => q.id === x.lordId).風雲の主)) c.lordId = null;
    /* 旧主の娘の姫と、主人公に嫁いだ姫 */
    s.hime = [...(s.hime || []), { id: 'h_試し娘', name: 'お試', faction: 旧, at: 'nagoya', born: s.year - 16, 父: 当主.id, dip: 50, lead: 40, 死: false, 嫁: null },
      { id: 'h_試し妻', name: 'お妻', faction: 旧, at: 'narumi', born: s.year - 16, 父: 当主.id, dip: 50, lead: 40, 死: false, 嫁: { 種: '家臣', 先: H.風雲の主のid } }];
    const 兄弟の忠誠 = Object.fromEntries(s.generals.filter((q) => ['織田信光', '織田信次'].includes(q.name)).map((q) => [q.name, q.loyal]));
    const a = 当主の城に在陣(s);
    const 家 = H.下剋上を起こす(s, a.id).家;
    H.sackCastle(s, 当, a, true);
    確('当主の城を落とせば、成る印が立つ', !!(s.風雲.下剋上 && s.風雲.下剋上.成った));
    const r = H.下剋上を成す(s, () => 0.8);
    確('家にほかの城主がいなければ、旧主の城はみな従う', r && s.castles.filter((c) => c.faction === 旧).length === 0 && s.castles.filter((c) => c.faction === 家).length >= 3,
      `${s.castles.filter((c) => c.faction === 家).map((c) => c.name).join('・')}`);
    const 居る = (n) => s.generals.some((q) => q.name === n);
    確('旧主の当主は果てる（落城で討たれていなければ、ここで果てる）', !居る(当主.name));
    確('旧主の子は死ぬ（親子の控えの子も、齢の差で見なした子も）', ['織田信長', '織田信行', '織田信広'].every((n) => !居る(n)), r.一族.死.join('・'));
    確('兄弟は、当主への忠誠を見込みとして追死し、さもなくば従う（見込み八割の目で、忠誠が八十を超える者は追死）',
      Object.entries(兄弟の忠誠).every(([n, 忠]) => (忠 > 80 ? !居る(n) && r.一族.追死.includes(n) : 居る(n) && s.generals.find((q) => q.name === n).faction === 家 && r.一族.従った兄弟.includes(n))),
      `忠誠 ${JSON.stringify(兄弟の忠誠)}・追死 ${r.一族.追死.join('・') || 'なし'}・従った ${r.一族.従った兄弟.join('・') || 'なし'}`);
    確('旧主の娘の姫も死ぬ。主人公に嫁いだ姫は除く', s.hime.find((h) => h.id === 'h_試し娘').死 === true && s.hime.find((h) => h.id === 'h_試し妻').死 === false);
    const 残る将 = s.generals.filter((x) => x.faction === 旧 && !x.captive);
    確('一族のほかの家中の将は、みな従う', 残る将.length === 0, 残る将.map((x) => x.name).join('・'));
    確('旧主の家は城を失って滅ぶ', (s.ruined || []).includes(旧));
    確('記に残す（当主は果て、下剋上が成った）', (s.風雲.記 || []).some((x) => /果てた/.test(x.文)) && (s.風雲.記 || []).some((x) => /下剋上が成った/.test(x.文)));
    確('二度は成さない', H.下剋上を成す(s) === null);

    /* (一の二) 旧主の城が当主の城一つだけなら、落城の処理が立てた滅んだ家の始末の問いを引き取り、家中はみな従う。
       合戦で捕らえた者も従い、捕虜の処遇の列には残らない */
    {
      const w = 宿老の風雲(), 旧w = w.player;
      const aw = 当主の城に在陣(w);
      const 家w = H.下剋上を起こす(w, aw.id).家;
      const 勝幡w = w.castles.find((c) => c.id === 'shobata');
      勝幡w.faction = 'imagawa';                                     // 旧主の城を那古野城だけにする
      for (const q of w.generals.filter((x) => x.at === 'shobata' && x.faction === 旧w)) q.at = 'nagoya';
      const 捕 = w.generals.find((x) => x.at === 'nagoya' && x.faction === 旧w && !x.lord && !/^織田/.test(x.name));
      捕.captive = { by: 家w, from: 旧w, at: 'nagoya' }; w.captives = [捕.id];
      H.sackCastle(w, w.castles.find((c) => c.id === 'nagoya'), aw, true);
      const 落城の問い = !!(w.warSettle && w.warSettle.faction === 旧w);
      H.下剋上を成す(w, () => 0.5);
      確('旧主の城が一つなら、落城の処理の滅んだ家の始末を引き取り、家中はみな従う', 落城の問い && !w.warSettle && w.generals.filter((x) => x.faction === 旧w).length === 0,
        `落城の処理の問い ${落城の問い ? 'あり' : 'なし'}→成したのち ${w.warSettle ? 'あり' : 'なし'}`);
      確('合戦で捕らえた家中の者も従い、捕虜の列に残らない', 捕.faction === 家w && !捕.captive && !(w.captives || []).includes(捕.id), 捕.name);
    }

    /* (二) 城主がいれば、見込みで決まる（友好百なら九割） */
    const t = 宿老の風雲(), 旧t = t.player, 当t = H.当主の城(t);
    const 勝幡 = t.castles.find((c) => c.id === 'shobata'), 柴田 = t.generals.find((x) => x.id === 勝幡.lordId);
    t.風雲.友好 = { [柴田.id]: 100 };
    const at = 当主の城に在陣(t);
    const 家t = H.下剋上を起こす(t, at.id).家;
    H.sackCastle(t, 当t, at, true);
    const rt = H.下剋上を成す(t, () => 0.5);
    確('友好百の城主（見込み九割）は従う', 勝幡.faction === 家t && 柴田.faction === 家t && rt.結果.some((x) => x.主 === 柴田.name && x.従 && Math.abs(x.見込み - 0.9) < 1e-9));
    確('旧主の当主は、落ち延びていても果てる', !t.generals.some((x) => x.id === t.風雲.下剋上.旧当主));
    const u = 宿老の風雲(), 旧u = u.player, 当u = H.当主の城(u);
    const 勝幡u = u.castles.find((c) => c.id === 'shobata'), 柴田u = u.generals.find((x) => x.id === 勝幡u.lordId);
    u.風雲.友好 = { [柴田u.id]: 0 };
    const au = 当主の城に在陣(u);
    H.下剋上を起こす(u, au.id); H.sackCastle(u, 当u, au, true);
    H.下剋上を成す(u, () => 0.5);
    確('友好零の城主は従わず、城は旧主に残る', 勝幡u.faction === 旧u && 柴田u.faction === 旧u);
    確('旧主の家は、当主を欠けば跡を継ぐ者を立てる（城が残っていれば）', !!当主を見る(u, 旧u), (当主を見る(u, 旧u) || {}).name);

    /* (三) 国主が従えば、その寄騎も従う（寄騎の見込みが零でも） */
    const v = 宿老の風雲(), 旧v = v.player;
    const 刈谷 = 城を移す(v, 'kariya'), 岡崎 = 城を移す(v, 'okazaki');
    const 外 = v.generals.filter((x) => x.faction === 旧v && !x.lord && !x.風雲の主 && !/^織田/.test(x.name) && x.at === 'nagoya');
    const 国主 = 外[0], 寄騎 = 外[1];
    国主.at = 岡崎.id; 国主.本領 = 岡崎.id; 岡崎.lordId = 国主.id; 国主.fief = 9000;
    寄騎.at = 刈谷.id; 寄騎.本領 = 刈谷.id; 刈谷.lordId = 寄騎.id;
    const 任 = H.国主に任じる(v, 旧v, '三河', 国主.id);
    H.寄騎に取る(v, 国主.id, 寄騎.id);
    v.風雲.友好 = { [国主.id]: 100, [寄騎.id]: 0 };
    const 勝幡v = v.castles.find((c) => c.id === 'shobata'); v.風雲.友好[勝幡v.lordId] = 0;
    const av = 当主の城に在陣(v);
    const 家v = H.下剋上を起こす(v, av.id).家; H.sackCastle(v, H.当主の城(v) || v.castles.find((c) => c.id === 'nagoya'), av, true);
    const 旧金 = v.factions[旧v].gold, 新金 = v.factions[家v].gold;
    H.下剋上を成す(v, () => 0.5);
    確('（支度）三河の国主と、その寄騎', 任.ok && 寄騎.寄親 === 国主.id, `${国主.name}・${寄騎.name}`);
    確('国主が従えば、その寄騎も従う（寄騎の友好が零でも）', 岡崎.faction === 家v && 刈谷.faction === 家v && 寄騎.faction === 家v);
    確('従わぬ城主の城は旧主に残る', 勝幡v.faction === 旧v);
    確('旧主の金は、従った城の石高の割で分ける', v.factions[家v].gold > 新金 && v.factions[旧v].gold < 旧金, `旧主 ${旧金}→${v.factions[旧v].gold}・新 ${新金}→${v.factions[家v].gold}`);
  }

  console.log('\n── 七　(c) 独立：国主・旗頭なら、寄騎とともに家を興す');
  {
    const s = 宿老の風雲(), 旧 = s.player, g = H.主人公の武将(s);
    確('国主でも旗頭でもなければ独立できない', !H.独立の構え(s).ok && /国主か旗頭/.test(H.独立の構え(s).訳));
    /* 主人公を三河の国主にし、寄騎を二人つける */
    const 刈谷 = 城を移す(s, 'kariya'), 岡崎 = 城を移す(s, 'okazaki'), 西尾 = 城を移す(s, 'nishio');
    const 元 = H.主人公の城(s); 元.lordId = null; 刈谷.lordId = g.id; g.at = 刈谷.id; g.本領 = 刈谷.id; s.風雲.城 = 刈谷.id;
    const 外 = s.generals.filter((x) => x.faction === 旧 && !x.lord && !x.風雲の主 && !/^織田/.test(x.name) && x.at === 'nagoya');
    const 甲 = 外[0], 乙 = 外[1];
    甲.at = 岡崎.id; 甲.本領 = 岡崎.id; 岡崎.lordId = 甲.id;
    乙.at = 西尾.id; 乙.本領 = 西尾.id; 西尾.lordId = 乙.id;
    H.宿老の役を見る(s);
    確('（支度）主人公は三河の国主で、寄騎が二人', g.役 === '国主' && H.寄騎たち(s, g.id).length === 2, H.寄騎たち(s, g.id).map((x) => x.name).join('・'));
    s.風雲.友好 = { [甲.id]: 100, [乙.id]: 0 };
    const r = H.独立する(s, () => 0.5);
    確('独立して主人公の家を興し、大名になる', r.ok && s.player === r.家 && g.lord && s.風雲.身分 === '大名' && s.風雲.大名.道 === '独立');
    確('主人公の城は付く', 刈谷.faction === r.家);
    確('友好百の寄騎は従い、友好零の寄騎は従わない', 岡崎.faction === r.家 && 甲.faction === r.家 && 西尾.faction === 旧 && 乙.faction === 旧);
    確('旧主とは敵対', H.relOf(s, r.家, 旧).state === '敵対');
  }

  console.log('\n── 八　大名になれば、風雲の合戦の見分けと守りの除けは外れる（キャンペーンと同じ）');
  {
    const s = 宿老の風雲(), g = H.主人公の武将(s);
    const a = 当主の城に在陣(s);
    H.下剋上を起こす(s, a.id);
    const 敵 = s.castles.find((c) => c.faction !== s.player);
    確('風雲の隊の見分けは null（キャンペーンの合戦の道へ）', H.風雲の隊を選ぶ(s, a, 敵, null) === null && H.風雲の城攻めの隊(s, a, 敵) === null);
    確('主人公は討死・捕縛・寿命の判じから外れない', !H.風雲で守られるか(s, g));
    H.主人公の武将を写す(s);
    確('武将の帳の主人公は、当主のまま', g.lord === true);
    const 前 = JSON.stringify(s.風雲.記.length);
    H.風雲の月の初め(s);
    確('風雲の月の初めは何もしない（月はキャンペーンの月送りで進む）', JSON.stringify(s.風雲.記.length) === 前);
  }

  console.log('\n── 九　屋敷：下準備の欄・下剋上の釦・問い');
  {
    const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
    const 押す = async (字) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 字); if (b) await act(async () => { b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }); return !!b; };
    const s = 宿老の風雲();
    const a = 当主の城に在陣(s);
    let 改 = null, 下 = null, 独 = 0;
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(H.FuunYashiki, { g: s, land: true, onTitle: () => {}, on月送り: () => {}, on知らせを閉じる: () => {}, on風雲を改める: () => {},
      on盤を改める: (fn) => { 改 = fn; }, on出陣: () => {}, on攻め寄せる: () => {}, on陣を解く: () => {}, on下剋上: (id) => { 下 = id; }, on独立: () => { 独++; } })); });
    await flush();
    const 文 = document.body.textContent;
    確('下準備の欄（城主・友好・忠誠・従う見込み）', /下準備（宿老）/.test(文) && /従う見込み 下剋上 \d+%/.test(文));
    確('誼を通じる・調略の釦', await 押す('誼を通じる') && typeof 改 === 'function' && H.友好を見る(改(s).風雲, H.家の城主ら(s)[0].主.id) > H.友好の初め);
    確('当主の城に在陣していれば、軍の欄に「下剋上」の釦', await 押す('下剋上'));
    確('下剋上の問いが出る（見込みの並び）', /旗を揚げれば後戻りはできない/.test(document.body.textContent) && /従う見込み \d+%/.test(document.body.textContent));
    const 釦 = [...document.querySelectorAll('.modal button')].find((b) => b.textContent.trim() === '下剋上');
    await act(async () => { 釦.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
    確('問いの「下剋上」で旗を揚げる', 下 === a.id);
    確('国主でも旗頭でもなければ、独立の釦は押せない', [...document.querySelectorAll('button')].some((b) => /^独立（国主か旗頭/.test(b.textContent.trim()) && b.disabled));
    await act(async () => { root.unmount(); }); await flush();
  }

  const 拾う = errs.filter((e) => !/act\(|not wrapped|ReactDOMTestUtils/.test(e));
  if (拾う.length) console.log('\n咎めの書き出し:', 拾う.slice(0, 3));
  console.log(咎.length ? `\n★ ${咎.length}件の咎：${咎.join('／')}` : '\n確かめ：みな通った');
  console.log(`エラー: ${拾う.length ? 拾う.length + '件' : 'なし'}`);
  process.exit(咎.length || 拾う.length ? 1 : 0);
})().catch((e) => { console.log('★ 試しが途中で止まった', e && e.stack); process.exit(1); });
