/* 合戦の効果音を画面から鳴らす段取り（ui/senoto.js・効果音取り込みの手引き「三」）。

   理（src/battle/）は音を鳴らさず、出来事を「鳴らしたい音の列」（b.音）に積む。画面がそれを
   一コマごとに鳴らし、隊を選ぶ・下知・寄ったときの兵の音・勝ち負けの締めは画面がその場で鳴らす。
   ここでは鳴らす段（kouka.js）を差し替えて、何をどの名で鳴らそうとしたかを見る。
     一、知らせ     … 緑の知らせは「有利」、赤は「不利」を列に積む。列は八つまで
     二、音の列     … 画面は列を鳴らして空にする（記録に残さない）
     三、下知の音   … 前進・後退・転回・移動は陣太鼓、射撃は鉄砲（鉄砲の組がある）か弓。
                      合戦の最中だけ鳴らし、布陣のあいだは鳴らさない。八秒に一度まで
     四、寄りの地   … 槍を合わせていれば接敵、崩れ・退きは退却、突撃、接戦、動いていれば行軍、
                      止まっていれば鳴らさない
     五、締め       … 野戦の勝ち負け、城攻めの寄せ手は城を落とす・城攻めの退き、城方は野戦の
                      勝ち負け、天下分け目や筋書きの一戦は決戦の勝ち負け。日没と兵糧攻めへは鳴らさない。
                      一度だけ鳴らす */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const entry = path.join(ROOT, 'build', 'senoto-entry.js');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(entry,
  'export * from "../src/ui/senoto.js";\n'
+ 'export { notify, 音を積む } from "../src/battle/corps.js";\n');
const out = path.join(ROOT, 'build', 'senoto.cjs');
/* 鳴らす段を差し替える。何を鳴らそうとしたかを控える */
const 控え = [];
const 偽の段 = path.join(ROOT, 'build', 'senoto-kouka-stub.js');
fs.writeFileSync(偽の段,
  'export const 効果を鳴らす = (名, o) => { globalThis.__鳴らした.push(["一打", 名, o || null]); return Promise.resolve(true); };\n'
+ 'export const 締めを鳴らす = (名) => { globalThis.__鳴らした.push(["締め", 名]); return Promise.resolve(true); };\n'
+ 'export const 兵の音を掛ける = (名) => { globalThis.__鳴らした.push(["地", 名]); return Promise.resolve(true); };\n'
+ 'export const 効果を止める = () => { globalThis.__鳴らした.push(["止め"]); };\n');
globalThis.__鳴らした = 控え;
(async () => {
await esbuild.build({ entryPoints: [entry], bundle: true, format: 'cjs', outfile: out, loader: { '.jsx': 'jsx' }, logLevel: 'error',
  plugins: [{ name: 'kouka-stub', setup(bld) { bld.onResolve({ filter: /audio\/kouka\.js$/ }, () => ({ path: 偽の段 })); } }] });
const A = require(out);

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 空に = () => { 控え.length = 0; };
const 組 = (type, men = 50, engaged = false) => ({ type, men, engaged });

console.log('■ 一、知らせ');
{
  const b = { t: 0, log: [] };
  A.notify(b, '敵の隊が崩れた', 'good');
  A.notify(b, '味方の隊が崩れた', 'bad');
  A.notify(b, '日が傾いた', 'info');
  確('緑は有利、赤は不利を列に積む（ただの報せは積まない）', JSON.stringify(b.音) === JSON.stringify(['有利', '不利']), JSON.stringify(b.音));
  for (let i = 0; i < 20; i++) A.notify(b, 'x', 'good');
  確('列は八つまで（画面が鳴らすまで溜めすぎない）', b.音.length === 8, `${b.音.length}`);
}

console.log('■ 二、音の列');
{
  空に();
  const b = { 音: ['有利', { 名: '焙烙', 間: 1.5, 左右: -0.3 }] };
  A.音の列を鳴らす(b);
  確('列を鳴らす（名と、名に添えた鳴らし方）', 控え.length === 2 && 控え[0][1] === '有利' && 控え[1][1] === '焙烙' && 控え[1][2].間 === 1.5 && 控え[1][2].左右 === -0.3,
    JSON.stringify(控え));
  確('鳴らしたら列は空になる', b.音.length === 0);
}

console.log('■ 三、下知の音');
{
  const 鉄 = { squads: [組('teppo'), 組('yari')] }, 弓 = { squads: [組('yumi'), 組('yari')] }, 槍 = { squads: [組('yari')] };
  const 戦 = { phase: 'fight' }, 陣 = { phase: 'deploy' };
  空に();
  for (const o of ['前進', '後退', '転回', '移動']) A.下知の音(戦, 槍, o);
  確('前進・後退・転回・移動は陣太鼓（八秒に一度まで）', 控え.length === 4 && 控え.every((x) => x[1] === '陣太鼓' && x[2].間 === 8));
  空に();
  A.下知の音(戦, 鉄, '射撃'); A.下知の音(戦, 弓, '射撃'); A.下知の音(戦, 槍, '射撃');
  確('射撃は、鉄砲の組がある隊は鉄砲、弓だけの隊は弓、どちらも無ければ鳴らさない',
    控え.length === 2 && 控え[0][1] === '鉄砲' && 控え[1][1] === '弓', JSON.stringify(控え.map((x) => x[1])));
  空に();
  A.下知の音(陣, 槍, '前進'); A.下知の音(戦, 槍, '接戦'); A.下知の音(戦, 槍, '突撃'); A.陣形の音(陣);
  確('布陣のあいだと、戦う下知（接戦・突撃）は鳴らさない', 控え.length === 0, JSON.stringify(控え));
  A.陣形の音(戦);
  確('合戦の最中に陣形を選び直せば陣太鼓', 控え.length === 1 && 控え[0][1] === '陣太鼓');
}

console.log('■ 四、寄りの地');
{
  const 隊 = (o) => ({ x: 0, y: 0, tx: 0, ty: 0, order: '待機', squads: [組('yari')], ...o });
  確('槍を合わせていれば接敵', A.地の名(隊({ order: '接戦', squads: [組('yari', 50, true)] })) === '接敵');
  確('崩れて逃げていれば退却', A.地の名(隊({ routed: true, order: '敗走', tx: 300 })) === '退却');
  確('撤退の下知なら退却', A.地の名(隊({ withdraw: true, order: '撤退', tx: 300 })) === '退却');
  確('突撃の下知なら突撃', A.地の名(隊({ order: '突撃', chargeT: 10, tx: 300 })) === '突撃');
  確('接戦の下知なら接戦', A.地の名(隊({ order: '接戦', tx: 300 })) === '接戦');
  確('動いていれば行軍', A.地の名(隊({ order: '前進', tx: 300 })) === '行軍');
  確('止まっていれば鳴らさない', A.地の名(隊({ order: '待機' })) === null && A.地の名(隊({ order: '前進', tx: 5 })) === null);
  const b = { corps: [{ id: 'a', x: 100, y: 0 }, { id: 'b', x: 10, y: 5 }, { id: 'c', x: 0, y: 0, dead: true }] };
  確('画面の真ん中にいちばん近い（生きている）隊を選ぶ', A.真ん中の隊(b, 0, 0).id === 'b');
}

console.log('■ 五、締め');
{
  const 名 = (b, o) => A.締めの名({ phase: 'over', ...b }, o);
  確('野戦の勝ち負け', 名({ result: 'P' }, { mode: 'field' }) === '野戦の勝ち' && 名({ result: 'E' }, { mode: 'field' }) === '野戦の負け');
  確('城攻めの寄せ手は、城を落とす・城攻めの退き',
    名({ result: 'P', attacker: 'P' }, { mode: 'castle', playerIsAtk: true }) === '城を落とす'
    && 名({ result: 'E', attacker: 'P' }, { mode: 'castle', playerIsAtk: true }) === '城攻めの退き');
  確('城攻めの城方は、守り切れば野戦の勝ち、落ちれば野戦の負け',
    名({ result: 'P', attacker: 'E' }, { mode: 'castle', playerIsAtk: false }) === '野戦の勝ち'
    && 名({ result: 'E', attacker: 'E' }, { mode: 'castle', playerIsAtk: false }) === '野戦の負け');
  確('天下分け目・筋書きの一戦は決戦の勝ち負け', 名({ result: 'P', 分け目: {} }, { mode: 'wakeme' }) === '決戦の勝ち'
    && 名({ result: 'E', 筋書き: { id: 'sekigahara' } }, {}) === '決戦の負け');
  確('日没と兵糧攻めへは鳴らさない', 名({ result: '日没' }, {}) === null && 名({ result: 'E', 兵糧攻めへ: true }, { mode: 'castle' }) === null);
  空に();
  const b = { phase: 'over', result: 'P' };
  A.終わりの締め(b, { mode: 'field' }); A.終わりの締め(b, { mode: 'field' });
  確('締めは一度だけ鳴らす', 控え.filter((x) => x[0] === '締め').length === 1, JSON.stringify(控え));
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
})();
