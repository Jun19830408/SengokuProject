/* ============================================================
   風雲モード：家老から上（城主の段）の試験（hitori/fuun.js 家老から上・城主の政務、core/state.js 風雲の主、
   govern/month.js、ui/MapScreen.jsx・ui/panels.jsx・hitori/FuunYashiki.jsx）

   遊ぶ人の申し出：「家老となれば必ず城主に任命（その大名のうち最もステータスの低い城主と交代する）」「（物差しは）器量です。
   当主は除くのは当然ですが、一門は必ずしも除かなくてもいいと思います。ただし、城主の交代によって元城主の忠誠は下げた方が
   いい」「侍大将で城主になれるとすると城主になりやすくなってしまいます。家老からでいいと思います」「家老となったら城を
   任されて城とその周囲（今あるシステムのとおりで）の城で合戦をしかけることができる」「プレイヤーが城主になれば、上司は
   国主か旗頭か大名のいずれかになります（国主がいれば上司は国主。国主がおらず旗頭のみなら旗頭が上司、どちらもいなければ
   大名が上司）」（案に「あとは1-3それでお願いします」）。
     一、家老に届けば、器量のいちばん低い城主（本拠・当主の城を除く）と交代して城主に任じられ、武将の帳に入る。元の城主の
         忠誠は下がる。任せる城が無ければ待つ
     二、上司は、城の国の国主、いなければその国を受け持つ旗頭、どちらもいなければ当主
     三、月送りのAIは、主人公とその城に手を出さない（出陣の将・城の内政・忠誠）
     四、城の政務：月ごとに城の実入りを預かり（三月ぶんまで）、その内でキャンペーンの城の下知を行う
     五、主人公の戦：自ら率いる軍の戦と、主人公のいる城の守りの戦だけに出る（上司の戦には出ない）。攻め先は家の敵の城
     六、主人公の軍は、月送りのAIが加勢・囲み・在陣を捌かない。自ら仕掛けた戦で城を取れば、城の石高一万石につき勲功一（遅めに改めた）。
         落とした城を委ねる采配は、主人公を城主に据えない
     七、屋敷：城の政務の欄（城の様子・預かった金・将ごとの下知）・出陣の釦・軍の様子
     八、キャンペーン（風雲でない盤）と出陣の画面は、これまでどおり
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
let 種 = 0x4B31;
Math.random = () => { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0; let t = Math.imul(種 ^ (種 >>> 15), 1 | 種); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 器量 = (x) => x.lead * 0.4 + x.valor * 0.3 + x.wit * 0.2 + x.gov * 0.1;
const 新しい風雲 = () => { const s = initState('oda'); H.風雲を始める(s); s.風雲.身分 = '三百人長'; s.風雲.勲功 = 270; H.取り立てを見る(s); return s; };
/* 侍大将まで上げた風雲（家老の一歩手前） */
const 侍大将の風雲 = () => {
  const s = 新しい風雲(), f = s.風雲;
  const 境 = H.身分の境(s, H.主人公の仮の武将(s));
  f.知行 = 境.侍大将; H.禄高の身分を見る(s);
  return { s, 境 };
};
const 家老の風雲 = () => { const { s, 境 } = 侍大将の風雲(); s.風雲.知行 = 境.家老; H.禄高の身分を見る(s); return s; };
const 敵の城 = (s) => s.castles.find((c) => c.faction !== s.player && !H.atPeace(s, s.player, c.faction) && H.風雲の攻め先か(s, c));

(async () => {
  console.log('── 一　家老に届けば、器量のいちばん低い城主と交代して城主に任じられる');
  {
    const { s, 境 } = 侍大将の風雲(), f = s.風雲;
    確('侍大将のあいだは城主にならず、武将の帳にも入らない', f.身分 === '侍大将' && !H.主人公の武将(s) && !H.主人公の城(s));
    /* 交代する城を、遊ぶ人の申し出どおりに数え直す（本拠・当主の居る城・囲まれた城を除き、城主のうち器量のいちばん低い者） */
    const 当主 = s.generals.find((x) => x.faction === s.player && x.lord && !x.captive);
    const 本拠 = s.factions[s.player].本拠;
    const 候 = s.castles.filter((c) => c.faction === s.player && c.id !== 本拠 && !(当主 && 当主.at === c.id))
      .map((c) => ({ c, 主: c.lordId ? s.generals.find((x) => x.id === c.lordId && x.faction === s.player && !x.captive && !x.lord) : null }))
      .filter((o) => o.主).sort((a, z) => 器量(a.主) - 器量(z.主));
    const 予 = H.城主にする城を選ぶ(s);
    確('交代する城は、城主のうち器量のいちばん低い者の城（本拠・当主の城は除く）', 予 && 候.length && 予.城.id === 候[0].c.id && 予.元.id === 候[0].主.id,
      候.map((o) => `${o.c.name}:${o.主.name}(${器量(o.主).toFixed(1)})`).join('・'));
    const 元 = 予.元, 前の忠誠 = 元.loyal;
    f.知行 = 境.家老; H.禄高の身分を見る(s);
    const g = H.主人公の武将(s), 城 = H.主人公の城(s);
    確('家老の境に届けば家老', f.身分 === '家老');
    確('武将の帳に入る（id・風雲の主の印・忠誠百・当主でない）', g && g.id === H.風雲の主のid && g.風雲の主 && g.loyal === 100 && !g.lord);
    確('城主に任じられる（城の主の札・住む城・居所）', 城 && 城.id === 予.城.id && 城.lordId === g.id && f.城 === 城.id && g.at === 城.id, 城 && 城.name);
    確(`元の城主の忠誠が ${H.城主を外された忠誠の減り} 下がる`, 元.loyal === Math.max(0, 前の忠誠 - H.城主を外された忠誠の減り), `${元.name} ${前の忠誠}→${元.loyal}`);
    確('元の城主はその城に残る', 元.at === 城.id && 元.faction === s.player);
    確('記と知らせに残す', (f.記 || []).some((x) => /家老として.+城の城主に任じられた（.+に代わる）/.test(x.文))
      && (f.記 || []).some((x) => /城主を解かれた（忠誠\d+→\d+）/.test(x.文)) && (f.知らせ || []).some((x) => /城主に任じられた/.test(x)));
    確('能力・知行は風雲の値を写す', g.lead === f.統率 && g.valor === f.武勇 && g.wit === f.知略 && g.gov === f.政務 && g.fief === f.知行);
    確('手勢は知行の軍役の器の半ばを連れて入る', g.retCap > 0 && g.retinue === Math.round(g.retCap * 0.5) && !!g.rost, `器${g.retCap}・手勢${g.retinue}`);
    const 記の数 = (f.記 || []).length;
    確('すでに城主なら、任じ直さない（同じ城を返す）', H.城主に任じる(s) === 城 && (f.記 || []).length === 記の数);
    /* 一門も交代の候補から外さない（遊ぶ人の申し出：「一門は必ずしも除かなくてもいい」）。当主だけ除く */
    const s2 = 侍大将の風雲().s;
    const 一門 = s2.generals.find((x) => x.faction === s2.player && !x.lord && /^織田/.test(x.name));
    const 城2 = s2.castles.find((c) => c.faction === s2.player && c.lordId && c.id !== s2.factions[s2.player].本拠);
    if (一門 && 城2) {
      const 前主 = s2.generals.find((x) => x.id === 城2.lordId);
      一門.at = 城2.id; 城2.lordId = 一門.id; 一門.lead = 1; 一門.valor = 1; 一門.wit = 1; 一門.gov = 1;
      if (前主 && 前主 !== 一門) 前主.at = 城2.id;
      const 予2 = H.城主にする城を選ぶ(s2);
      確('一門の城主も、器量が低ければ交代の相手になる', 予2 && 予2.元 && 予2.元.id === 一門.id, `${一門.name}（${城2.name}）`);
    }
    /* 任せる城が無ければ待つ（囲まれた城は任せない） */
    const s3 = 侍大将の風雲(), f3 = s3.s.風雲;
    for (const c of s3.s.castles.filter((x) => x.faction === s3.s.player)) s3.s.sieges.push({ castleId: c.id, armyId: 'なし', months: 0 });
    f3.知行 = s3.境.家老; H.禄高の身分を見る(s3.s);
    確('任せる城が無ければ（みな囲まれている）、城が空くのを待つ', f3.身分 === '家老' && !H.主人公の城(s3.s) && f3.城を待つ === true
      && (f3.記 || []).some((x) => /城が空くのを待つ/.test(x.文)));
    s3.s.sieges = [];
    H.風雲の月の初め(s3.s);
    確('城が空けば、月の初めに任じられる', !!H.主人公の城(s3.s) && f3.城を待つ === false);
  }

  console.log('\n── 二　上司は、国主がいれば国主、国主がおらず旗頭がいれば旗頭、どちらもいなければ当主');
  {
    const s = 家老の風雲(), f = s.風雲, 城 = H.主人公の城(s);
    const 当主 = s.generals.find((x) => x.faction === s.player && x.lord && !x.captive);
    確('国主も旗頭もいなければ、上司は当主', !H.国の国主(s, s.player, 城.kuni) && !H.国の旗頭(s, s.player, 城.kuni) && f.上司 === 当主.id, 当主.name);
    const 外 = s.generals.filter((x) => x.faction === s.player && !x.lord && !x.風雲の主 && !x.captive && x.at && x.at !== 城.id);
    const 旗 = 外[0], 国主 = 外[1];
    旗.役 = '旗頭';
    H.上司を見直す(s);
    確('国主がおらず、その国を受け持つ旗頭がいれば、上司は旗頭', H.国の旗頭(s, s.player, 城.kuni) === 旗 && f.上司 === 旗.id, 旗.name);
    国主.役 = '国主'; 国主.役国 = 城.kuni;
    H.上司を見直す(s);
    確('国主がいれば、上司は国主', f.上司 === 国主.id, 国主.name);
    確('上司が替われば記に残す', (f.記 || []).some((x) => x.文 === `${国主.name}（国主）を上司とする。`));
  }

  console.log('\n── 三　月送りのAIは、主人公とその城に手を出さない');
  {
    let s = 家老の風雲();
    const 城0 = H.主人公の城(s);
    城0.koku = Math.round(城0.kokuMax * 0.5);              // AIなら開墾する頃合い
    s.factions[s.player].gold = 20000;
    const 城の将 = s.generals.filter((x) => x.at === 城0.id && x.faction === s.player).map((x) => x.id);
    let 伸び = 0, 自然 = 0;
    for (let m = 0; m < 4; m++) {
      const c = H.主人公の城(s), 前 = c.koku;
      H.風雲の月の初め(s);
      s = H.advanceMonth(s, s);
      const c2 = s.castles.find((x) => x.id === 城0.id);
      伸び = Math.max(伸び, c2.koku - 前); 自然 = Math.max(自然, Math.round(c2.kokuMax * 0.0015) + 1);
    }
    const g = H.主人公の武将(s), 城 = s.castles.find((x) => x.id === 城0.id);
    確('四月を送っても、主人公は武将の帳に残り、忠誠は百のまま、城主のまま', g && g.loyal === 100 && g.faction === s.player && 城.lordId === g.id && 城.faction === s.player);
    確('AIの出陣は、主人公もその城の将も連れ出さない', s.armies.every((a) => !(a.gens || []).some((id) => 城の将.includes(id))),
      s.armies.filter((a) => (a.gens || []).some((id) => 城の将.includes(id))).map((a) => a.id).join(','));
    確('AIの内政は主人公の城に手を出さない（石高は自然の伸びだけ）', 伸び <= 自然, `一月の伸び ${伸び}石（自然の伸び ${自然}石まで）`);
  }

  console.log('\n── 四　城の政務：城の実入りを預かり、その内でキャンペーンの城の下知を行う');
  {
    const s = 家老の風雲(), f = s.風雲, 城 = H.主人公の城(s);
    const 月分 = H.城の預けの月分(s);
    f.城の預け = 0; H.城の預けを積む(s);
    確('月ごとに城の実入り（月送りと同じ数え方）を預かる', 月分 > 0 && f.城の預け === 月分, `月に${月分}貫`);
    for (let i = 0; i < 5; i++) H.城の預けを積む(s);
    確('使わなければ三月ぶんまで溜まる', f.城の預け === 月分 * 3);
    s.factions[s.player].gold = 5000;
    城.koku = Math.round(城.kokuMax * 0.6);
    const 前の石 = 城.koku, 前の金 = s.factions[s.player].gold, 前の預け = f.城の預け;
    const n = H.城の政務を行う(s, '開墾', H.風雲の主のid);
    const 費え = 前の金 - n.factions[n.player].gold;
    const 城n = n.castles.find((x) => x.id === 城.id);
    確('開墾すれば石高が伸び、費えは家の蔵から払い、預かった金からも引く', 城n.koku > 前の石 && 費え > 0 && n.風雲.城の預け === Math.round((前の預け - 費え) * 10) / 10,
      `石${前の石}→${城n.koku}・費え${費え}貫・預け${前の預け}→${n.風雲.城の預け}`);
    確('もとの盤は書き換えない', s.castles.find((x) => x.id === 城.id).koku === 前の石 && s.factions[s.player].gold === 前の金);
    確('城の帳（実行前 → 実行後）と、政務の文・記に残す', n.ledger[0] && n.ledger[0].cmd === '開墾' && n.ledger[0].castle === 城.name
      && /開墾を行った（費え\d+貫）/.test(n.風雲.政務の文 || '') && (n.風雲.記 || []).some((x) => /で.+が開墾を行った/.test(x.文)));
    const n2 = H.城の政務を行う(n, '商業', H.風雲の主のid);
    確('同じ将は月に一つだけ', /今月もう働いた/.test(n2.風雲.政務の文 || '') && n2.factions[n2.player].gold === n.factions[n.player].gold);
    const 他 = n.generals.find((x) => x.at === 城.id && x.faction === n.player && !x.風雲の主 && !x.captive);
    if (他) {
      const n3 = structuredClone(n); n3.風雲.城の預け = 1;
      const n4 = H.城の政務を行う(n3, '商業', 他.id);
      確('預かった金が足りなければ行わない（家の蔵は減らさない）', /預かった金が足りぬ/.test(n4.風雲.政務の文 || '') && n4.factions[n4.player].gold === n3.factions[n3.player].gold
        && n4.castles.find((x) => x.id === 城.id).comm === n3.castles.find((x) => x.id === 城.id).comm);
    }
    const 遠く = n.generals.find((x) => x.faction === n.player && x.at && x.at !== 城.id && !x.captive);
    確('城にいない将には下知できない', /その将は城にいない/.test(H.城の政務を行う(n, '開墾', 遠く.id).風雲.政務の文 || ''));
    const n5 = structuredClone(n); H.風雲の月の初め(n5);
    確('月を送れば政務の文は消え、また預かる', !n5.風雲.政務の文 && n5.風雲.城の預け > n.風雲.城の預け);
    確('下知はキャンペーンの城の下知のうち、開墾・治水・商業・築城・訓練・徴募', H.城の政務.join('・') === '開墾・治水・商業・築城・訓練・徴募');
  }

  console.log('\n── 五　主人公の戦：自ら率いる軍の戦と、主人公のいる城の守りの戦');
  {
    const s = 家老の風雲(), f = s.風雲, 城 = H.主人公の城(s), g = H.主人公の武将(s);
    const 敵 = 敵の城(s);
    確('攻め先に出来る敵の城がある（家の敵で、和を結んでいない家の城）', !!敵, 敵 && `${敵.name}（${s.factions[敵.faction].name}）`);
    const 我が軍 = { id: 'k1', faction: s.player, gens: [g.id], from: 城.id, 風雲の主の軍: true };
    const r1 = H.風雲の隊を選ぶ(s, 我が軍, 敵, null);
    確('自ら率いる軍が敵の城へ着けば、主人公の戦（自ら・主人公の隊）', r1 && r1.自ら && r1.隊id === g.id && !r1.陣借り);
    確('自ら率いる軍の城攻めも、主人公の戦', (H.風雲の城攻めの隊(s, 我が軍, 敵) || {}).自ら === true);
    const 寄せ手 = { id: 'k2', faction: 敵.faction, gens: [] };
    確('敵が主人公のいる城へ着けば、主人公の戦（城の守り）', (H.風雲の隊を選ぶ(s, 寄せ手, 城, null) || {}).自ら === true
      && (H.風雲の城攻めの隊(s, 寄せ手, 城) || {}).自ら === true);
    確('行き合いでも、主人公が軍にいれば主人公の戦', (H.風雲の隊を選ぶ(s, 寄せ手, null, 我が軍) || {}).自ら === true);
    const 上の軍 = { id: 'k3', faction: s.player, gens: [f.上司] };
    確('上司の軍の戦には出ない（城主は自分の戦だけ）', H.風雲の隊を選ぶ(s, 上の軍, 敵, null) === null && H.風雲の城攻めの隊(s, 上の軍, 敵) === null);
    f.陣借り = { 済: false };
    確('陣借りもしない', H.風雲の隊を選ぶ(s, { id: 'k4', faction: s.player, gens: ['katsuie'] }, 敵, null) === null);
    const at = g.at; g.at = null;
    確('主人公が城を出ていれば、城の守りの戦には出ない', H.風雲の隊を選ぶ(s, 寄せ手, 城, null) === null && H.風雲の城攻めの隊(s, 寄せ手, 城) === null);
    g.at = at;
    確('攻め先の篩：家の城は外す', !H.風雲の攻め先か(s, 城));
    const 和 = s.castles.find((c) => c.faction !== s.player && H.atPeace(s, s.player, c.faction));
    if (和) 確('攻め先の篩：和を結んだ家の城は外す', !H.風雲の攻め先か(s, 和), 和.name);
    else {
      const 敵家 = 敵.faction, k = Object.keys(s.relations).find((x) => x.split('|').includes(敵家) && x.split('|').includes(s.player)) || [s.player, 敵家].sort().join('|');
      const 前 = s.relations[k]; s.relations[k] = { ...(前 || {}), state: '同盟', trust: 60 };
      確('攻め先の篩：和を結んだ家の城は外す（同盟にしてみる）', !H.風雲の攻め先か(s, 敵));
      if (前) s.relations[k] = 前; else delete s.relations[k];
    }
  }

  console.log('\n── 六　主人公の軍は、月送りのAIが加勢・囲み・在陣を捌かない');
  {
    let s = 家老の風雲();
    const 城 = H.主人公の城(s), g = H.主人公の武将(s), 敵 = 敵の城(s);
    g.at = null;
    const 軍 = (id, at, 印, 添 = {}) => ({ id, faction: s.player, from: 城.id, gens: 印 ? [g.id] : [], local: 900, localTrain: 60,
      rost: H.newRoster(900, `arm-${id}`), men: 900 + (印 ? g.retinue : 0), at, path: [at], prog: 0, food: 99999, target: null,
      ...(印 ? { 風雲の主の軍: true } : {}), ...添 });
    s.armies.push(軍('囲む軍', 敵.id, true, { target: 敵.id, sieging: true }));
    s.sieges.push({ castleId: 敵.id, armyId: '囲む軍', months: 0 });
    確('主人公の軍か（印で見分ける）', H.風雲の主の軍か(s, s.armies.find((a) => a.id === '囲む軍')));
    H.風雲の月の初め(s); s = H.advanceMonth(s, s);
    const 囲 = s.sieges.find((x) => x.armyId === '囲む軍');
    確('主人公の軍の囲みは、月送りが捌かない（囲みの帳で遊ぶ人が決める）', !!囲 && (囲.months || 0) === 0 && s.armies.some((a) => a.id === '囲む軍' && !a.reinforced),
      囲 ? `囲み${囲.months || 0}か月` : '囲みが無い');
    /* 在陣：主人公の軍はそのまま。印の無い家の軍は、AIが二月で畳む */
    let t = 家老の風雲();
    const 城t = H.主人公の城(t), gt = H.主人公の武将(t);
    gt.at = null;
    const 在 = (id, 印) => ({ id, faction: t.player, from: 城t.id, gens: 印 ? [gt.id] : [], local: 300, localTrain: 60, rost: H.newRoster(300, `arm-${id}`),
      men: 300 + (印 ? gt.retinue : 0), at: 城t.id, path: [城t.id], prog: 0, food: 99999, target: null, 在陣: 城t.id, ...(印 ? { 風雲の主の軍: true } : {}) });
    t.armies.push(在('主の在陣', true), 在('家の在陣', false));
    for (let m = 0; m < 3; m++) { H.風雲の月の初め(t); t = H.advanceMonth(t, t); }
    const 主の = t.armies.find((a) => a.id === '主の在陣'), 家の = t.armies.find((a) => a.id === '家の在陣');
    確('主人公の軍の在陣は、AIが払わず解かず（攻め寄せるか解くかは屋敷で決める）', !!主の && 主の.在陣 === 城t.id);
    確('（比べ）印の無い家の軍の在陣は、AIが畳む', !家の || 家の.在陣 !== 城t.id);
    /* 自ら仕掛けた戦で城を取れば、城の石高一万石につき勲功一（案の表では五。遊ぶ人の答え「遅めがいいです」で一に改めた） */
    const u = 家老の風雲(), fu = u.風雲, 城u = H.主人公の城(u), 敵u = 敵の城(u);
    const 前の勲功 = fu.勲功, 取る前の石 = Math.round(敵u.koku), 望 = Math.max(1, Math.round(H.風雲の城を取る勲功 * 敵u.koku / 10000));   // 落ちる前の石高で量る
    const 主の軍 = { id: '取る軍', faction: u.player, from: 城u.id, gens: [], local: 3000, men: 3000, at: 敵u.id, path: [敵u.id], 風雲の主の軍: true };
    u.armies.push(主の軍); H.sackCastle(u, 敵u, 主の軍, true);
    確(`自ら仕掛けた戦で城を取れば、城の石高一万石につき勲功${H.風雲の城を取る勲功}`, fu.勲功 === 前の勲功 + 望 && (fu.記 || []).some((x) => x.文 === `自ら仕掛けた戦で${敵u.name}（${取る前の石}石）を取った。勲功${望}。`),
      `${敵u.name} ${取る前の石}石 → 勲功${望}`);
    const v = 家老の風雲(), fv = v.風雲, 敵v = 敵の城(v), 前v = fv.勲功;
    H.sackCastle(v, 敵v, { id: '家の軍', faction: v.player, from: null, gens: [], local: 3000, men: 3000, at: 敵v.id, path: [敵v.id] }, true);
    確('（比べ）家の軍（主人公の軍でない）が城を取っても、主人公の勲功にはならない', fv.勲功 === 前v);
    /* 自ら率いた戦の勲功は、総大将の隊の働きの半ば（遊ぶ人の答え「遅めがいいです」） */
    const x = 家老の風雲(), fx = x.風雲, gx = H.主人公の武将(x);
    const 盤 = { result: 'P', corps: [{ id: gx.id, side: 'P', gen: { name: gx.name }, squads: [{ src: 'k1', men: 300 }, { src: 'k2', men: 300 }], loss: { 直属: 30, 地域: 0 } },
      { id: 'e1', side: 'E', gen: { name: '敵' }, squads: [{ src: 'x1', men: 10 }], loss: {} }], 武功: { k1: 6, k2: 4 } };
    const 満 = H.預かる隊の勲功(盤, gx.id, {}).勲功, 前x = fx.勲功;
    H.戦の勲功を記す(x, 盤, '試しの野', { 隊id: gx.id, 自ら: true });
    確(`自ら率いた戦の勲功は、隊の働きの半ば（×${H.自ら率いた勲功の倍}）`, fx.勲功 === 前x + Math.round(満 * H.自ら率いた勲功の倍)
      && (fx.記 || []).some((y) => /自ら兵を率いて出た。.*（総大将の隊の働きは半ばを数える）。/.test(y.文)), `働き${満} → 勲功${fx.勲功 - 前x}`);
    /* 落とした城を誰に委ねるかは大名（AI）が決めるが、主人公は据えない（主人公の城は主君から任されたもの） */
    const w = 家老の風雲(), gw = H.主人公の武将(w), 城w = H.主人公の城(w);
    const 連れ = w.generals.filter((x) => x.at === 城w.id && x.faction === w.player && !x.風雲の主 && !x.captive).slice(0, 2);
    gw.fief = 999999;                                   // 身代がいちばん重くても
    const 差配 = H.委ねる差配(w, 敵の城(w), { id: '委ねる軍', faction: w.player, gens: [gw.id, ...連れ.map((x) => x.id)], local: 2000 });
    確('落とした城の城主に、主人公は据えない（身代がいちばん重くても）', 差配.城主 && 差配.城主 !== gw.id && !差配.所属.includes(gw.id),
      `据えるのは ${(w.generals.find((x) => x.id === 差配.城主) || {}).name}`);
  }

  console.log('\n── 七　屋敷：城の政務の欄・出陣の釦・軍の様子');
  {
    const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
    const s = 家老の風雲(), 城 = H.主人公の城(s), g = H.主人公の武将(s);
    s.風雲.知らせ = []; s.風雲.城の預け = 300; s.factions[s.player].gold = 5000;
    s.armies.push({ id: '屋敷の軍', faction: s.player, from: 城.id, gens: [], local: 100, men: 100, at: 城.id, path: [城.id], prog: 0, food: 500, target: null,
      在陣: 城.id, 風雲の主の軍: true });
    let 出陣 = 0, 攻め = null, 解く = null, 改 = null;
    const root = createRoot(document.getElementById('r'));
    await act(async () => { root.render(React.createElement(H.FuunYashiki, { g: s, land: true, onTitle: () => {}, on月送り: () => {}, on知らせを閉じる: () => {}, on風雲を改める: () => {},
      on盤を改める: (fn) => { 改 = fn; }, on出陣: () => { 出陣++; }, on攻め寄せる: (id) => { 攻め = id; }, on陣を解く: (id) => { 解く = id; } })); });
    await flush();
    const 文 = document.body.textContent;
    確('城の政務の欄（城の名・石高・預かった金）', 文.includes(`城の政務（${城.name}）`) && /預かった金300 貫/.test(文));
    const 城の将 = s.generals.filter((x) => x.at === 城.id && x.faction === s.player && !x.captive && !x.lord);
    const 釦 = [...document.querySelectorAll('button')];
    確('城にいる将ごとに、六つの下知の釦', 釦.filter((b) => b.textContent === '開墾').length === 城の将.length && 城の将.length >= 2, `将${城の将.length}人`);
    確('主人公（自分）を先に出す', 文.indexOf(`${g.name}（自分）`) >= 0);
    const 開墾 = 釦.find((b) => b.textContent === '開墾');
    await act(async () => { 開墾.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
    const n = 改 && 改(s);
    確('下知の釦は、盤を城の政務で改める', n && n !== s && n.castles.find((x) => x.id === 城.id).koku >= s.castles.find((x) => x.id === 城.id).koku && /開墾を行った/.test(n.風雲.政務の文 || ''));
    const 支度 = 釦.find((b) => b.textContent === '出陣の支度');
    await act(async () => { 支度.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
    確('出陣の支度の釦で、出陣の画面を開く', 出陣 === 1);
    確('主人公の軍の様子（在陣）', 文.includes(`${城.name}に在陣`));
    const 攻め釦 = 釦.find((b) => b.textContent === '次の城へ攻め寄せる'), 解く釦 = 釦.find((b) => b.textContent === '陣を解いて帰る');
    await act(async () => { 攻め釦.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); 解く釦.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
    確('在陣の軍は、攻め寄せるか解くかを選べる', 攻め === '屋敷の軍' && 解く === '屋敷の軍');
    await act(async () => { root.unmount(); }); await flush();
    /* 侍大将の屋敷には城の政務の欄を出さない */
    const r2 = createRoot(document.getElementById('r'));
    const s2 = 侍大将の風雲().s;
    await act(async () => { r2.render(React.createElement(H.FuunYashiki, { g: s2, land: true, onTitle: () => {}, on月送り: () => {}, on知らせを閉じる: () => {}, on風雲を改める: () => {} })); });
    await flush();
    確('侍大将の屋敷には、城の政務の欄を出さない', !document.body.textContent.includes('城の政務（'));
    await act(async () => { r2.unmount(); }); await flush();
  }

  console.log('\n── 八　キャンペーンと出陣の画面は、これまでどおり');
  {
    const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 6)); }); };
    const c = initState('oda');
    確('風雲でない盤では、主人公の軍・主人公の城と見なさない', !H.風雲の主の軍か(c, { 風雲の主の軍: true }) && !H.風雲の主の城か(c, { lordId: H.風雲の主のid }));
    const 数える = async (props) => {
      const root = createRoot(document.getElementById('r'));
      await act(async () => { root.render(React.createElement(H.SortieDialog, { g: c, from: c.factions[c.player].本拠, onClose: () => {}, onGo: () => {}, ...props })); });
      await flush();
      const n = document.querySelectorAll('option').length;
      const 箱 = [...document.querySelectorAll('input[type=checkbox]')].map((x) => ({ checked: x.checked, disabled: x.disabled }));
      await act(async () => { root.unmount(); }); await flush();
      return { n, 箱 };
    };
    const 素 = await 数える({}), 篩 = await 数える({ 篩: () => true });
    確('篩を渡さなければ（キャンペーン）、行き先はこれまでどおり', 素.n > 0 && 素.n === 篩.n, `行き先${素.n}`);
    確('必ずを渡さなければ、将の選びはみな外せる', 素.箱.every((x) => !x.disabled));
    const 必 = c.generals.filter((x) => x.at === c.factions[c.player].本拠 && x.faction === c.player && !x.captive)[3];
    const 必ず = await 数える({ 必ず: 必.id });
    確('必ずを渡せば、その将は選ばれて外せない', 必ず.箱.some((x) => x.checked && x.disabled) && 必ず.箱.filter((x) => x.disabled).length === 1);
  }

  const 拾う = errs.filter((e) => !/act\(|not wrapped|ReactDOMTestUtils/.test(e));
  if (拾う.length) console.log('\n咎めの書き出し:', 拾う.slice(0, 3));
  console.log(咎.length ? `\n★ ${咎.length}件の咎：${咎.join('／')}` : '\n確かめ：みな通った');
  console.log(`エラー: ${拾う.length ? 拾う.length + '件' : 'なし'}`);
  process.exit(咎.length || 拾う.length ? 1 : 0);
})().catch((e) => { console.log('★ 試しが途中で止まった', e && e.stack); process.exit(1); });
