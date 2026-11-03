/* 架空武将の器量（core/house.js 子の器量・bearChild・makePromotion・取り立てる）。

   遊ぶ側の申し出は「架空武将の能力が、めちゃくちゃ低いです。勲功を重ねて昇進した者はむしろ
   高めにすべきだと思いますし、武将の子などで登場する場合は、親武将の能力を何らかのアルゴリズム
   で引き継ぐ(能力ままを引き継ぐというよりかは増減させる)かたちがいいと思います」であった。
   もとは取り立てた者の統率が十四から四十、知略と政務が五から三十ほどで、始めの盤の武将の
   下から一割（統率五十）にも届かなかった。ここで確かめること。
     一、子の器量 … 欄ごとに、親の値から並み（六十）へ三割寄せ、上げ下げの揺らぎを足す。
                     二十から八十五に収まる
     二、才の振れ … 一人の子の四つの欄は、そろって上振れ・下振れしやすい（兄弟でも違う）
     三、取り立て … 物頭（勲功三十）は統率五十八から七十五・武勇六十五から八十・知略四十五から
                     六十五・政務三十八から五十八。勲功を重ねるほど上がり（五つで一つ、八まで）、
                     一戦の手柄の取り立ては三つ低い。八十五で止める
     四、写し     … 取り立てた値は武将帳の尺度のまま。古い記録に残った狭い尺度の取り立ては広げて写す */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));
const { initState, makePromotion, 取り立てる, 子の器量, bearChild } = H;

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
let 種 = 0x7A11;
Math.random = function () { 種 |= 0; 種 = (種 + 0x6D2B79F5) | 0;
  let t = Math.imul(種 ^ (種 >>> 15), 1 | 種);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const 分 = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * p))]; };

console.log('── 一　子の器量');
{
  for (const [親, 中ほど] of [[80, 74], [60, 60], [45, 50.5]]) {
    const v = [];
    for (let i = 0; i < 4000; i++) v.push(子の器量({ lead: 親, valor: 親, wit: 親, gov: 親 }).lead);
    const 中 = 分(v, 0.5);
    確(`親が${親}の欄の子は、中ほど${中ほど}のあたり（三割を並みへ寄せる）`, Math.abs(中 - 中ほど) <= 1.5,
      `中ほど${中}・三人に二人は${分(v, 1 / 6)}から${分(v, 5 / 6)}`);
    確(`親が${親}の欄でも、親を超える子も及ばぬ子も出る（増減させる）`, v.some((x) => x > 親) && v.some((x) => x < 親),
      `親を超える ${Math.round(v.filter((x) => x > 親).length / v.length * 100)}％`);
  }
  const 端 = [];
  for (let i = 0; i < 4000; i++) { const k = 子の器量({ lead: 99, valor: 15, wit: 99, gov: 15 }); 端.push(k.lead, k.valor, k.wit, k.gov); }
  確('二十から八十五に収まる（九十からは逸話のある者の段）', Math.min(...端) >= 20 && Math.max(...端) <= 85,
    `${Math.min(...端)}〜${Math.max(...端)}`);
}

console.log('── 二　才の振れ');
{
  /* 統率と知略の振れが、同じ子の中でそろうか（相関が正） */
  const a = [], b = [];
  for (let i = 0; i < 4000; i++) { const k = 子の器量({ lead: 60, valor: 60, wit: 60, gov: 60 }); a.push(k.lead); b.push(k.wit); }
  const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  const r = sab / Math.sqrt(saa * sbb);
  確('一人の子の欄は、そろって上振れ・下振れしやすい', r > 0.25 && r < 0.75, `統率と知略の相関 ${r.toFixed(2)}`);
  const s = initState('oda');
  const 親 = s.generals.find((x) => x.name === '織田信秀');
  const 子 = bearChild(s, 親);
  確('生まれた子は親の器量を継いで増減する（架空の印つき）', !!子 && 子.架空 === true
    && ['lead', 'valor', 'wit', 'gov'].every((k) => 子[k] >= 20 && 子[k] <= 85),
    子 ? `親 ${親.lead}/${親.valor}/${親.wit}/${親.gov} → 子 ${子.lead}/${子.valor}/${子.wit}/${子.gov}` : '生まれず');
}

console.log('── 三　取り立て');
{
  const s = initState('oda');
  const 主 = s.generals.find((x) => x.name === '織田信秀');
  const 測 = (opts) => {
    const v = { lead: [], valor: [], wit: [], gov: [] };
    for (let i = 0; i < 1500; i++) {
      const p = makePromotion(主, s.generals, opts).仕官;
      for (const k of Object.keys(v)) v[k].push(p[k]);
    }
    return v;
  };
  const 物頭 = 測({ faction: 'oda', at: 'nagoya', 勲功: 30 });
  const 幅 = (a) => `${Math.min(...a)}〜${Math.max(...a)}`;
  確('物頭の統率は五十八から七十五', Math.min(...物頭.lead) >= 58 && Math.max(...物頭.lead) <= 75, 幅(物頭.lead));
  確('物頭の武勇は六十五から八十', Math.min(...物頭.valor) >= 65 && Math.max(...物頭.valor) <= 80, 幅(物頭.valor));
  確('物頭の知略は四十五から六十五、政務は三十八から五十八',
    Math.min(...物頭.wit) >= 45 && Math.max(...物頭.wit) <= 65 && Math.min(...物頭.gov) >= 38 && Math.max(...物頭.gov) <= 58,
    `知略 ${幅(物頭.wit)}・政務 ${幅(物頭.gov)}`);
  const 武将 = s.generals.filter((x) => !x.captive);
  確('物頭の統率と武勇の中ほどは、始めの盤の武将の中ほど（六十）を上回る',
    分(物頭.lead, 0.5) > 分(武将.map((x) => x.lead), 0.5) && 分(物頭.valor, 0.5) > 分(武将.map((x) => x.valor), 0.5),
    `統率 ${分(物頭.lead, 0.5)}・武勇 ${分(物頭.valor, 0.5)}／武将の中ほど 統率${分(武将.map((x) => x.lead), 0.5)}・武勇${分(武将.map((x) => x.valor), 0.5)}`);
  const 古参 = 測({ faction: 'oda', at: 'nagoya', 勲功: 70 });
  確('勲功を重ねた者ほど高い（勲功七十で八つ上がる）', Math.abs((分(古参.lead, 0.5) - 分(物頭.lead, 0.5)) - 8) <= 1.5,
    `統率の中ほど ${分(物頭.lead, 0.5)} → ${分(古参.lead, 0.5)}`);
  const 上限 = 測({ faction: 'oda', at: 'nagoya', 勲功: 500 });
  確('上げは八まで、八十五で止める', Math.max(...上限.valor) <= 85 && Math.max(...上限.lead) <= 83, `武勇 ${幅(上限.valor)}`);
  const 手柄 = 測({ faction: 'oda', at: 'nagoya' });
  確('一戦の手柄の取り立ては、物頭より三つ低い', Math.abs((分(物頭.lead, 0.5) - 分(手柄.lead, 0.5)) - 3) <= 1.5,
    `統率の中ほど ${分(手柄.lead, 0.5)}`);
}

console.log('── 四　写し');
{
  const s = initState('oda');
  const 主 = s.generals.find((x) => x.name === '織田信秀');
  const p = makePromotion(主, s.generals, { faction: 'oda', at: 'nagoya', 勲功: 30 });
  const g = 取り立てる(s, p, p.candidates[0]);
  確('取り立てた値は武将帳の尺度のまま', !!g && g.lead === p.仕官.lead && g.valor === p.仕官.valor && g.wit === p.仕官.wit && g.gov === p.仕官.gov,
    g ? `${g.lead}/${g.valor}/${g.wit}/${g.gov}` : '取り立てられず');
  /* 古い記録の取り立て（狭い尺度・印なし）は、これまでどおり広げて写す */
  const 古 = { ...p, 仕官: { ...p.仕官, lead: 50, valor: 60, wit: 40, gov: 40 } };
  delete 古.仕官.広い尺度;
  const g2 = 取り立てる(s, 古, p.candidates[1] || p.candidates[0] + '二');
  確('古い記録に残った狭い尺度の取り立ては、広げて写す', !!g2 && g2.lead === H.能力を広げる(50, 'lead') && g2.valor === H.能力を広げる(60, 'valor'),
    g2 ? `統率50→${g2.lead}・武勇60→${g2.valor}` : '取り立てられず');
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
