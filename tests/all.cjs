// すべての試験を続けて走らせる。`npm test` から呼ばれる。
// いずれも末尾に「エラー: なし」と出れば正常である。
const { execFileSync } = require('child_process');
const path = require('path');
const { buildHarness } = require('../tools/bundle.cjs');

const 試験 = [
  ['sel', '大名を選ぶ画面'],
  ['age', '武将の値に齢が並ぶ'],
  ['fief', '知行の加増と、城主に任じる関門'],
  ['arms', '馬と鉄砲・兵科の割り・商人・援軍の要請'],
  ['run5', '政務（24か月）'],
  ['save', 'セーブと読み込み'],
  ['kiroku', '記録が黙って消えないこと（書き込む道を片端から）'],
  ['succ', '家督・調略・外交'],
  ['sortie', '出陣の目標（味方の城を含む）'],
  ['oldsave', '古い記録の繕い（味方を狙う戦役を落とす）'],
  ['relief', '囲みを解く後詰と、城方の討って出'],
  ['vow', '寄騎の将と兵数を選ぶ／約束を破る前の問い'],
  ['aid', '援軍（臣従には下知、同盟には頼み）'],
  ['allyaid', '同盟国への援軍が、その同盟国と戦わない'],
  ['diplo', '外交の上下（従える／降る）と調略の的'],
  ['fate', '討死・捕縛の目減り／家名の継承／架空の印'],
  ['hikiguchi', '退き口（撤退が自陣の側へ効くこと）'],
  ['kaisen', '海路と水軍（湊・水軍衆・迎え撃ち）'],
  ['funaikusa', '船戦（船団・風・火矢と焙烙・乗り移り）'],
  ['ct', '城攻め'],
  ['captive', '捕虜の仕来り（30年ぶん）'],
  ['ruin', '大名の滅亡（捕虜の処遇と身の振り方）'],
  ['ransom', '身代金（滅んだ家からは来ない）'],
  ['retreat', '敗軍の帰陣と武将の行方'],
  ['keiretsu', '行軍中に隊形が保たれるか'],
  ['skip', '合戦を委ねて結果を見る'],
  ['run8', '命令を一通り'],
  ['run9', '合戦'],
  ['watch', '見物モードで長期走行'],
  ['browser', 'ブラウザ版（dist/戦国.html）'],
];

const only = process.argv.slice(2).filter((x) => !x.startsWith('-'));
const list = only.length ? 試験.filter(([k]) => only.includes(k)) : 試験;

console.log('本体を試験用に束ねています…');
buildHarness('split');

let 不首尾 = 0;
for (const [key, 名] of list) {
  process.stdout.write(`\n──────── ${key}（${名}）\n`);
  try {
    const out = execFileSync(process.execPath, ['--max-old-space-size=3072', path.join(__dirname, `${key}.cjs`)],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const 末 = out.trimEnd().split('\n').slice(-6).join('\n');
    console.log(末);
    if (!/エラー: なし/.test(out)) { console.log(`  ★${key} は「エラー: なし」で終わらなかった`); 不首尾++; }
  } catch (e) {
    console.log((e.stdout || '').trimEnd().split('\n').slice(-8).join('\n'));
    console.log(`  ★${key} が途中で倒れた`);
    不首尾++;
  }
}

console.log(`\n════════ 試験 ${list.length} 件中、不首尾 ${不首尾} 件`);
process.exit(不首尾 ? 1 : 0);
