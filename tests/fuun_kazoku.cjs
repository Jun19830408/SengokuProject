/* ============================================================
   風雲モード：主人公の齢と妻子の試験（hitori/fuun.js 主人公の齢・hitori/kazoku.js・hitori/Kazoku.jsx・govern/month.js）

   遊ぶ人の申し出：「主人公は15歳スタートにしましょう。また、姫を娶ったら子供も生まれて、幼名は自動としても、名前は
   選べるようにしたいですね。息子も姫も生まれるようにしたいです。」
     一、主人公は十五で仕え始め、年の改まりに一つずつ齢を重ねる（城主になって武将の帳に入っても同じ）
     二、縁談：家老から上で妻のいない主人公に、正月、主君が家の姫を娶らせたいと申し入れる。受ければ姫を妻に迎え一門に
         列する（キャンペーンの家臣に嫁がせると同じ）。断っても咎めは無い。家老に満たない・妻がいる・姫がいないときは来ない
     三、子：妻がいれば、正月に見込みで子が生まれる（男子も娘も）。幼名は自動。妻の齢の限り・主人公の子の限りを過ぎれば生まれない
     四、元服：十五になれば名を自分で決めるか、自動の候補から選ぶ（男子は父の姓を継ぐ。自動の候補は父の通字を継ぐ）
     五、大名になれば、男子は武将の帳に（親子の控えに父）、名を定めた娘は姫の帳に入る。大名ののちに生まれた子も同じ。
         主人公には、キャンペーンの子の生まれ（妻を問わない）を当てない
     六、独立の旗揚げで、子は主人公の家に入る
     七、月送り（正月）で縁談が来る
     八、屋敷：齢・妻子の欄・縁談の問い・元服の問い
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
let 種 = 0x4A17;
Math.random = () => { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
/* 決めた順に値を返す賽（尽きれば 0.99） */
const 賽 = (...v) => { let i = 0; return () => (i < v.length ? v[i++] : 0.99); };

/* 家老（城主）まで上げた風雲。名乗りは 名 で定める */
const 家老の風雲 = (名 = '藤吉郎') => {
  const s = initState('oda'); H.風雲を始める(s, '与平');
  const f = s.風雲; f.身分 = '三百人長'; f.勲功 = 270; H.取り立てを見る(s); H.名乗りを定める(s, '木下', 名);
  const 境 = H.身分の境(s, H.主人公の仮の武将(s));
  f.知行 = 境.侍大将; H.禄高の身分を見る(s); f.知行 = 境.家老; H.禄高の身分を見る(s);
  f.知らせ = [];
  return { s, 境 };
};
/* 家の姫を一人、決めた齢で置く（ほかの家の姫は嫁がせて、話に上らないようにする） */
const 姫を置く = (s, 名, 齢, 外す = true) => {
  if (外す) for (const h of s.hime || []) if (h.faction === s.player && !h.嫁) h.嫁 = { 種: '婚姻', 先: 'imagawa', y: s.year, m: 1 };
  const 城 = H.主人公の城(s) || s.castles.find((c) => c.faction === s.player);
  const h = { id: `hime-test-${名}`, name: 名, faction: s.player, at: 城.id, born: s.year - 齢, dip: 60, lead: 50, 架空: true, 伝: '', 死: false, 嫁: null, 務め: null };
  s.hime = [...(s.hime || []), h];
  return h;
};
const 娶らせる = (s, 名 = '桐姫', 齢 = 17) => { const h = 姫を置く(s, 名, 齢); H.縁談を申し入れる(s); H.縁談に答える(s, true); return h; };

(async () => {
  console.log('── 一　主人公は十五で仕え始め、年の改まりに一つずつ齢を重ねる');
  {
    const s = initState('oda'); H.風雲を始める(s, '与平');
    確('十五で始まる', H.主人公の齢(s) === 15 && H.主人公の始めの齢 === 15, `${H.主人公の齢(s)}歳`);
    s.year += 3;
    確('三年たてば十八', H.主人公の齢(s) === 18);
    const { s: s2 } = 家老の風雲(); s2.year += 5; H.主人公の武将を写す(s2);
    確('城主になって武将の帳に入っても、齢は十五から数える', H.主人公の武将(s2).age === 20, `${H.主人公の武将(s2).age}歳`);
  }

  console.log('\n── 二　縁談：家老から上で妻のいない主人公に、正月、主君が家の姫を娶らせたいと申し入れる');
  {
    const { s } = 家老の風雲(), f = s.風雲, g = H.主人公の武将(s);
    const 若 = 姫を置く(s, '桐姫', 16), 年上 = 姫を置く(s, '萩姫', 30, false), 老 = 姫を置く(s, '楓姫', 44, false);
    const 談 = H.縁談を申し入れる(s);
    確('家老に申し入れる（齢の近い姫）', 談 && 談.himeId === 若.id, 談 && 談.himeId);
    確('子を生む齢の限りを過ぎた姫は話に上らない', H.縁談の相手(s) && H.縁談の相手(s).id !== 老.id);
    確('断れば妻はおらず、記に残る', H.縁談に答える(s, false).ok && !H.主人公の妻(s) && !f.縁談 && (f.記 || []).some((x) => /縁談があったが、断った/.test(x.文)));
    確('断っても、また申し入れがある（翌年の正月）', !!H.縁談を申し入れる(s));
    const r = H.縁談に答える(s, true);
    確('娶れば妻に迎える', r.ok && r.受けた && H.主人公の妻(s) && H.主人公の妻(s).id === 若.id);
    確('キャンペーンの家臣に嫁がせると同じ縁組（一門に列し、姫は主人公の城に入る）', g.一門 === true && 若.嫁 && 若.嫁.種 === '家臣' && 若.嫁.先 === g.id && 若.at === g.at);
    確('年代記と記に残る', s.chronicle.some((x) => /桐姫を木下藤吉郎に嫁がせた/.test(x.text)) && f.記.some((x) => /桐姫を妻に迎え/.test(x.文)));
    確('妻がいれば、縁談は来ない', !H.縁談を申し入れる(s));
    const s2 = initState('oda'); H.風雲を始める(s2, '与平'); 姫を置く(s2, '菊姫', 16);
    確('家老に満たなければ来ない', !H.縁談を申し入れる(s2));
    const { s: s3 } = 家老の風雲(); for (const h of s3.hime || []) if (h.faction === s3.player) h.嫁 = { 種: '婚姻', 先: 'imagawa', y: 1, m: 1 };
    確('娶れる姫がいなければ来ない', !H.縁談を申し入れる(s3));
    void 年上;
  }

  console.log('\n── 三　子：妻がいれば、正月に見込みで子が生まれる（男子も娘も）。幼名は自動');
  {
    const { s } = 家老の風雲(), f = s.風雲; const 妻 = 娶らせる(s);
    確('見込みに届かなければ生まれない', !H.子の生まれ(s, 賽(H.子の生まれる見込み + 0.01)) && !(f.子ら || []).length);
    const 男 = H.子の生まれ(s, 賽(0.1, 0.2));
    確('男子が生まれる', 男 && 男.性 === '男' && 男.生 === s.year && 男.母 === 妻.id && !男.名 && !男.盤, 男 && 男.幼名);
    確('男子の幼名は、父の姓を冠しても姓と名の分け方が崩れない', 男 && H.姓名(`木下${男.幼名}`).名乗り === 男.幼名 && /(丸|松)$/.test(男.幼名));
    確('呼び名は父の姓に幼名', H.子の呼び名(s, 男) === `木下${男.幼名}` && H.子の齢(s, 男) === 1);
    確('器量は父を継いで増減する（キャンペーンの子と同じ幅）', ['lead', 'valor', 'wit', 'gov'].every((k) => 男.器[k] >= 20 && 男.器[k] <= 85));
    const 女 = H.子の生まれ(s, 賽(0.1, 0.8));
    確('娘も生まれる', 女 && 女.性 === '女' && /^お/.test(女.幼名), 女 && 女.幼名);
    確('記に残る（大名になる前は屋敷の帳にいて、盤には出ない）', f.記.some((x) => /あいだに男子が生まれた（幼名/.test(x.文)) && !s.generals.some((x) => x.id === 男.id) && !s.hime.some((h) => h.id === 女.id));
    const 幼名ら = [];
    for (let i = 0; i < 4; i++) { const c = H.子の生まれ(s, 賽(0.1, i % 2 ? 0.8 : 0.2)); if (c) 幼名ら.push(c.幼名); }
    確(`子は${H.主人公の子の限り}人まで`, f.子ら.length === H.主人公の子の限り && !H.子の生まれ(s, 賽(0.1, 0.2)));
    確('兄弟姉妹で幼名は重ならない', new Set(f.子ら.map((c) => c.幼名)).size === f.子ら.length, f.子ら.map((c) => c.幼名).join('・'));
    const { s: s2 } = 家老の風雲();
    確('妻がいなければ生まれない', !H.子の生まれ(s2, 賽(0.01, 0.2)));
    const { s: s3 } = 家老の風雲(); const 妻3 = 娶らせる(s3, '萩姫', 20); 妻3.born = s3.year - (H.子を生む齢の限り + 1);
    確(`妻が${H.子を生む齢の限り}歳を過ぎれば生まれない`, !H.子の生まれ(s3, 賽(0.01, 0.2)));
    /* 正月（月送りの年の改まりから呼ぶ 風雲の家の正月）で生まれる */
    const { s: s5 } = 家老の風雲(); 娶らせる(s5, '藤姫', 18);
    H.風雲の家の正月(s5, { rand: 賽(0.9) });
    確('正月に見込みに届かなければ生まれない', !(s5.風雲.子ら || []).length);
    H.風雲の家の正月(s5, { rand: 賽(0.1, 0.8) });
    確('正月に見込みに届けば生まれる', (s5.風雲.子ら || []).length === 1 && s5.風雲.子ら[0].性 === '女');
    /* 正月の見込みで、年を重ねれば男子も娘も生まれる（妻十六から四十まで。五たび試す） */
    const 数 = [], 性 = new Set();
    for (let k = 0; k < 5; k++) {
      const { s: s4 } = 家老の風雲(); 娶らせる(s4, '椿姫', 16);
      for (let y = 0; y < 30; y++) { s4.year++; H.風雲の家の正月(s4); }
      数.push((s4.風雲.子ら || []).length); for (const c of s4.風雲.子ら || []) 性.add(c.性);
    }
    確('正月ごとの見込みで、男子も娘も生まれる', 性.has('男') && 性.has('女') && 数.every((n) => n >= 1 && n <= H.主人公の子の限り), `生まれた数 ${数.join('・')}`);
  }

  console.log('\n── 四　元服：十五になれば名を自分で決めるか、自動の候補から選ぶ');
  {
    const { s } = 家老の風雲('秀吉'), f = s.風雲; 娶らせる(s);
    const 男 = H.子の生まれ(s, 賽(0.1, 0.2)), 女 = H.子の生まれ(s, 賽(0.1, 0.8));
    s.year += 13; H.風雲の家の月(s);
    確('十四では、まだ名を定めない', H.元服を待つ子(s).length === 0 && H.子の齢(s, 男) === 14);
    s.year += 1; H.風雲の家の月(s);
    確('十五になれば、名を定めるのを待つ', H.元服を待つ子(s).length === 2 && H.子の齢(s, 男) === 15);
    確('男子の自動の候補は、父の通字（秀）を継ぐ二字', 男.名の候補.length === 4 && 男.名の候補.every((x) => x.length === 2 && x[0] === '秀'), 男.名の候補.join('・'));
    確('娘の自動の候補に「○姫」（または「○の方」）と幼名', 女.名の候補.length === 4 && (女.名の候補.includes(`${女.幼名.slice(1)}姫`) || 女.名の候補.includes(`${女.幼名.slice(1)}の方`)) && 女.名の候補.includes(女.幼名), 女.名の候補.join('・'));
    確('名が空なら定めない', !H.元服させる(s, 男.id, ' ').ok);
    確(`名は${H.名乗りの限り}字まで`, !H.元服させる(s, 男.id, '秀秀秀秀秀').ok);
    確('自分で決めた名で元服する（姓は父の姓）', H.元服させる(s, 男.id, '勝成').ok && 男.名 === '木下勝成' && 男.元服 && H.子の呼び名(s, 男) === '木下勝成');
    確('記と年代記に残る', f.記.some((x) => /が元服し、木下勝成と名乗った/.test(x.文)) && s.chronicle.some((x) => /木下勝成と名乗った/.test(x.text)));
    const 候0 = 女.名の候補[0];
    確('自動の候補で娘の名を定める', H.元服させる(s, 女.id, 候0).ok && 女.名 === 候0, 女.名);
    確('定めた子は、もう待たない', H.元服を待つ子(s).length === 0 && !H.元服させる(s, 男.id, '再').ok);
    const { s: s2 } = 家老の風雲('藤吉郎'); 娶らせる(s2);
    const 男2 = H.子の生まれ(s2, 賽(0.1, 0.2)); s2.year += 14; H.風雲の家の月(s2);
    確('父の名乗りが二字の諱でなければ、二字を選ぶ（キャンペーンの子の名と同じ）', 男2.名の候補.length === 4 && 男2.名の候補.every((x) => x.length === 2), 男2.名の候補.join('・'));
  }

  console.log('\n── 五　大名になれば、男子は武将の帳に、名を定めた娘は姫の帳に入る');
  {
    const { s } = 家老の風雲('秀吉'), f = s.風雲; 娶らせる(s);
    const 男 = H.子の生まれ(s, 賽(0.1, 0.2)), 女 = H.子の生まれ(s, 賽(0.1, 0.8)), 幼女 = (s.year += 13, H.子の生まれ(s, 賽(0.1, 0.8)));
    s.year += 1; H.風雲の家の月(s); H.元服させる(s, 女.id, '桐の方');
    const g = H.主人公の武将(s), 城 = H.主人公の城(s);
    H.風雲の主を大名に(s, '家督'); H.風雲の家の月(s);
    const 武 = s.generals.find((x) => x.id === 男.id);
    確('男子は武将の帳に入る（家・城・齢・親子の控え）', 武 && 武.faction === s.player && 武.at === 城.id && 武.age === 15 && (s.親 || {})[男.id] === H.風雲の主のid && 武.架空, 武 && `${武.name}・${武.age}歳`);
    確('元服前の男子は幼名のまま', 武 && 武.name === `木下${男.幼名}`);
    const 姫 = s.hime.find((h) => h.id === 女.id);
    確('名を定めた娘は姫の帳に入る（父・家・城・齢）', 姫 && 姫.name === '桐の方' && 姫.faction === s.player && 姫.父 === H.風雲の主のid && H.姫の齢(s, 姫) === 15 && H.姫の役(s, 姫) === '在城', 姫 && `${姫.name}・${H.姫の齢(s, 姫)}歳`);
    確('名を定めていない幼い娘は、まだ姫の帳に入らない', !s.hime.some((h) => h.id === 幼女.id) && H.子が生きるか(s, 幼女));
    確('盤に入った男子が元服すれば、武将の名も改まる', H.元服させる(s, 男.id, '秀勝').ok && 武.name === '木下秀勝');
    確('跡目の候補に実の子として並ぶ（キャンペーンの家督の帳）', H.heirCandidates(s, g).some((x) => x.gen.id === 男.id && x.child));
    const 後 = H.子の生まれ(s, 賽(0.1, 0.2));
    確('大名ののちに生まれた男子は、生まれたときから武将の帳に入る', 後 && s.generals.some((x) => x.id === 後.id && x.age === 1));
    /* 盤にいる男子も、娘と同じく正月に十五になって元服を待つ（武将の齢はキャンペーンの決まりで四月に加わるが、元服は子の齢で見る） */
    後.生 = s.year - 13; const 後の武 = s.generals.find((x) => x.id === 後.id); 後の武.age = 14;
    s.month = 6; H.風雲の家の月(s);
    確('（十四の年の六月）まだ元服を待たない', !H.元服を待つ子(s).some((c) => c.id === 後.id));
    s.year += 1; s.month = 1; H.風雲の家の月(s);
    確('盤にいる男子も、正月に十五になれば元服を待つ', H.元服を待つ子(s).some((c) => c.id === 後.id) && H.子の齢(s, 後) === 15);
    void f;
  }
  {
    /* 主人公には、キャンペーンの子の生まれ（妻を問わない）を当てない。キャンペーンの当主の子の生まれる目を一にして、月送りで
       年を越す（ほかの家の当主には子が生まれ、主人公には生まれない） */
    const { s } = 家老の風雲(), 家 = s.player, g = H.主人公の武将(s);
    s.風雲.身分 = '宿老';
    for (const x of s.generals.filter((q) => q.faction === 家 && !q.lord && /^織田/.test(q.name))) x.faction = 'imagawa';
    H.succeed(s, s.generals.find((x) => x.faction === 家 && x.lord && !x.captive), '病で没した');
    g.age = 30;
    確('（支度）主人公は当主で、キャンペーンなら子をなす格', g.lord && H.一族の格(s, g) === '当主' && !H.主人公の妻(s));
    const 元の目 = H.生まれる目.当主; H.生まれる目.当主 = 1;
    let t = s; t.month = 12;
    try { t = H.advanceMonth(t, t); } finally { H.生まれる目.当主 = 元の目; }
    確('ほかの家の当主には、キャンペーンの子が生まれる（目を一にした印）', t.generals.some((x) => /_c\d{4}$/.test(x.id) && x.id.endsWith(`_c${t.year}`) && x.faction !== 家));
    確('主人公には、キャンペーンの子の生まれは当たらない（妻がいなければ子はない）', t.month === 1 && !t.generals.some((x) => x.id === `${H.風雲の主のid}_c${t.year}`) && !(t.風雲.子ら || []).length);
  }

  console.log('\n── 六　独立の旗揚げで、子は主人公の家に入る');
  {
    const { s, 境 } = 家老の風雲(), 旧 = s.player; s.風雲.始め = { ...s.風雲.始め, 年: s.風雲.始め.年 - 5 };   // 宿老は二十から
    s.風雲.知行 = 境.宿老 + 10; H.禄高の身分を見る(s); 娶らせる(s);
    const 男 = H.子の生まれ(s, 賽(0.1, 0.2));
    const g = H.主人公の武将(s);
    const 移す = (id) => { const c = s.castles.find((x) => x.id === id), 元 = c.faction; const 退 = s.castles.find((x) => x.faction === 元 && x.id !== id);
      for (const q of s.generals.filter((x) => x.at === id && x.faction === 元)) { q.at = 退 ? 退.id : null; if (q.本領 === id) q.本領 = 退 ? 退.id : null; } c.faction = s.player; c.lordId = null; return c; };
    const 刈谷 = 移す('kariya'); const 元 = H.主人公の城(s); 元.lordId = null; 刈谷.lordId = g.id; g.at = 刈谷.id; g.本領 = 刈谷.id; s.風雲.城 = 刈谷.id;
    H.宿老の役を見る(s);
    const r = H.独立する(s, () => 0.5);
    const 武 = s.generals.find((x) => x.id === 男.id);
    確('独立すれば、男子は主人公の家の武将になる', r.ok && 武 && 武.faction === r.家 && 武.faction !== 旧 && 武.at === 刈谷.id, r.訳 || '');
  }

  console.log('\n── 七　月送り（正月）で縁談が来る');
  {
    const { s } = 家老の風雲(); 姫を置く(s, '藤姫', 18);
    let t = s; t.month = 12;
    t = H.advanceMonth(t, t);
    確('年を越した正月に、縁談の申し入れがある', t.month === 1 && t.風雲.縁談 && t.風雲.縁談.himeId === 'hime-test-藤姫');
  }

  console.log('\n── 八　屋敷：齢・妻子の欄・縁談の問い・元服の問い');
  {
    const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
    const 押す = async (字, 窓 = false) => { const 場 = 窓 ? document.querySelector('.modal') || document : document;
      const b = [...場.querySelectorAll('button')].find((x) => x.textContent.trim() === 字 && !x.disabled); if (b) await act(async () => { b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }); return !!b; };
    const { s } = 家老の風雲('秀吉'); 姫を置く(s, '桐姫', 17); H.縁談を申し入れる(s);
    let 改 = null;
    const 描く = async (g) => { await act(async () => { root.render(React.createElement(H.FuunYashiki, { g, land: true, onTitle: () => {}, on月送り: () => {}, on知らせを閉じる: () => {},
      on風雲を改める: (fn) => { 改 = fn; }, on盤を改める: () => {}, on出陣: () => {}, on攻め寄せる: () => {}, on陣を解く: () => {}, on下剋上: () => {}, on独立: () => {} })); }); await flush(); };
    const root = createRoot(document.getElementById('r'));
    await 描く(s);
    let 文 = document.body.textContent;
    確('屋敷に齢が出る', /齢15 歳/.test(文.replace(/\s/g, '')) || /齢\s*15\s*歳/.test(文));
    確('妻子の欄（家老から上）', /妻子/.test(文) && /妻はまだいない/.test(文));
    確('縁談の問いが出る', /縁談/.test(文) && /桐姫/.test(文) && /娶れとの話があった/.test(文));
    確('「娶る」で答える', await 押す('娶る', true) && typeof 改 === 'function');
    const n = structuredClone(s); 改(n.風雲, n);
    確('答えは縁談に答えるに渡る（妻に迎える）', H.主人公の妻(n) && H.主人公の妻(n).name === '桐姫');
    const 男 = H.子の生まれ(n, 賽(0.1, 0.2)); n.year += 14; H.風雲の家の月(n);
    await 描く(n);
    文 = document.body.textContent;
    確('妻子の欄に妻と子', /妻桐姫/.test(文.replace(/\s/g, '')) && 文.includes(`木下${男.幼名}`));
    確('元服の問いが出る', /元服/.test(文) && /十五になり、元服する/.test(文));
    確('自動で決める：候補が並ぶ', await 押す('自動で決める', true) && 男.名の候補.every((x) => document.body.textContent.includes(`木下${x}`)));
    確('候補で名乗らせる', await 押す(`木下${男.名の候補[0]}と名乗らせる`, true));
    const n2 = structuredClone(n); 改(n2.風雲, n2);
    確('答えは元服させるに渡る', n2.風雲.子ら[0].名 === `木下${男.名の候補[0]}`);
    root.unmount();
  }

  console.log('\n── 九　大名ののちの元服の問い（キャンペーンの画面と同じ形の窓）');
  {
    const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
    const { s } = 家老の風雲(); 娶らせる(s);
    const 女 = H.子の生まれ(s, 賽(0.1, 0.8)); s.year += 14; H.風雲の主を大名に(s, '家督'); H.風雲の家の月(s);
    let 決 = null;
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(H.元服の問い, { g: s, on決める: (id, 名) => { 決 = { id, 名 }; } })); }); await flush();
    確('娘の名を定める問いが出る', /名を定める/.test(document.body.textContent) && document.body.textContent.includes(女.幼名));
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '自分で決める');
    await act(async () => { b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }); await flush();
    const 入 = document.querySelector('input');
    const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
    await act(async () => { setter.call(入, '小夜姫'); 入.dispatchEvent(new dom.window.Event('input', { bubbles: true })); }); await flush();
    const 定 = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '小夜姫と名を定める');
    if (定) await act(async () => { 定.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
    確('自分で決めた名が渡る', 決 && 決.id === 女.id && 決.名 === '小夜姫');
    root.unmount();
  }

  if (errs.length) console.log('画面の咎（console.error）:', errs.slice(0, 3));
  console.log(咎.length ? `\n★ ${咎.length}件の咎：${咎.join('／')}` : '\n確かめ：みな通った');
  console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
  process.exit(咎.length ? 1 : 0);
})().catch((e) => { console.log('例外:', e.message, '\n', (e.stack || '').split('\n').slice(0, 6).join('\n')); console.log('エラー: 例外で終わった'); process.exit(1); });
