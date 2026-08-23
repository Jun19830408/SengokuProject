#!/usr/bin/env node
/* ==========================================================================
   図鑑の絵を作る（駒・船・地物・城の設備・陣形・特殊勢力の印）

   画面まるごとの写しでは、駒ひとつ、印ひとつが小さすぎて読めない。説明書には
   「左に拡大した絵、右に説き」という並びが要る。その左側をここで作る。

   絵は描き起こさない。遊びが実際に使っている描き手（draw.js・seaDraw.js・
   town.js・layoutSlots）をそのまま呼び、canvas に大きく描いて写しを取る。
   遊びの見た目が変われば、この絵も変わる。

     npm run zukan            … dist/tebiki/zu/*.png と src/data/zukan.js を作る
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'tebiki', 'zu');
const TMP = path.join(ROOT, 'build', 'zukan');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/* 遊びの描き手を、そのまま画面へ持ち出す */
const 口 = path.join(TMP, 'entry.js');
fs.writeFileSync(口, `
export { drawKoma, drawFieldTerrain, drawCastleTerrain } from "../../src/battle/draw.js";
export { drawShip } from "../../src/battle/seaDraw.js";
export { drawTownMark, 町の色 } from "../../src/core/town.js";
export { layoutSlots, KOMA, SP, ROW } from "../../src/battle/corps.js";
export { FIELD, RIVER, FORESTS, WOODS, HILLS, MARSH, VILLAGES, layoutField, setFieldSeed, hasRiver } from "../../src/battle/field.js";
export { buildCastleMap, layoutCastleField, setBattleMap, axisOf, fromUV, gatePos } from "../../src/battle/castleMap.js";
export { SHIPS } from "../../src/data/ships.js";
`);
const 束 = path.join(TMP, 'zukan.js');
esbuild.buildSync({ entryPoints: [口], bundle: true, format: 'iife', globalName: 'Z',
  outfile: 束, loader: { '.jsx': 'jsx' }, logLevel: 'error' });

/* ------------------------------------------------------ 画面の中で絵を描く */
const 描き = `
const 出 = {};
const 青 = '#2F5D8C', 赤 = '#B0483C';
const 版 = (w, h) => {
  const cv = document.createElement('canvas');
  cv.width = w * 2; cv.height = h * 2;           // 倍で描いて縮める（紙で滲まぬように）
  const ctx = cv.getContext('2d');
  ctx.scale(2, 2);
  return { cv, ctx, w, h };
};
const 収める = (key, 版) => { 出[key] = 版.cv.toDataURL('image/png'); };

/* 一、駒（兵科）。盤に出るのと同じ形を、五十人ひと組ぶん並べる */
for (const [t, 名] of [['yari', '槍'], ['yumi', '弓'], ['teppo', '鉄砲'], ['kiba', '騎馬']]) {
  const p = 版(150, 96);
  p.ctx.fillStyle = '#DCE3C4'; p.ctx.fillRect(0, 0, 150, 96);
  // 五十人＝十人駒が五つ。二列に置く
  const k = 5.6;                                 // 盤の駒を大きく引き伸ばす
  for (let i = 0; i < 5; i++) {
    const x = 39 + (i % 3) * 36, y = 34 + Math.floor(i / 3) * 34;
    Z.drawKoma(p.ctx, x, y, -Math.PI / 2, t, '#2F5D8C', 'rgba(255,255,255,0.95)', k);
  }
  収める('koma-' + t, p);
}

/* 二、船 */
for (const t of ['tekko', 'atake', 'seki', 'kobaya']) {
  const p = 版(150, 96);
  p.ctx.fillStyle = '#9FC0CE'; p.ctx.fillRect(0, 0, 150, 96);
  const 倍 = 1.42;                               // 四種とも同じ倍率。大小の差が見えるように
  // （鉄甲船は的三十と大きい。倍率を上げると大筒が枠から出てしまう）
  p.ctx.save(); p.ctx.translate(75, 48); p.ctx.scale(倍, 倍); p.ctx.translate(-75, -48);
  Z.drawShip(p.ctx, { t, x: 75, y: 48, facing: 0, hp: 1, men: 10, burn: 0 }, 青, true);
  p.ctx.restore();
  収める('fune-' + t, p);
}

/* 三、地物。小さな野をこしらえ、真ん中に一つだけ置いて描く */
const 地物 = (key, 仕込み) => {
  Z.setBattleMap(null);
  Z.setFieldSeed('zukan', key);
  Z.layoutField(3000, 4);
  Z.FIELD.w = 300; Z.FIELD.h = 190;
  Z.RIVER.top = 0; Z.RIVER.bot = 0; Z.RIVER.bridge = [0, 0]; Z.RIVER.ford = [0, 0]; Z.RIVER.wave = 0;
  for (const a of [Z.FORESTS, Z.WOODS, Z.HILLS, Z.MARSH, Z.VILLAGES]) a.length = 0;
  仕込み();
  const p = 版(300, 190);
  Z.drawFieldTerrain(p.ctx);
  収める(key, p);
};
地物('chi-mori', () => Z.FORESTS.push({ x: 150, y: 95, r: 78 }));
地物('chi-hayashi', () => Z.WOODS.push({ x: 150, y: 95, r: 74 }));
地物('chi-oka', () => Z.HILLS.push({ x: 150, y: 95, r: 86 }));
地物('chi-shitsuchi', () => Z.MARSH.push({ x: 150, y: 95, r: 80 }));
地物('chi-shuraku', () => Z.VILLAGES.push({ x: 150, y: 95, r: 56 }));
地物('chi-hashi', () => {
  Z.RIVER.top = 62; Z.RIVER.bot = 128; Z.RIVER.wave = 0;
  Z.RIVER.bridge = [120, 180]; Z.RIVER.ford = [-999, -998];
});
地物('chi-asase', () => {
  Z.RIVER.top = 62; Z.RIVER.bot = 128; Z.RIVER.wave = 0;
  Z.RIVER.bridge = [-999, -998]; Z.RIVER.ford = [100, 200];
});

/* 四、城の設備。城郭図を大きく描いて、要る所だけ切り出す */
{
  const m = Z.layoutCastleField(Z.buildCastleMap(
    // 平城を選ぶ。水堀が青く出るので、堀と土橋が絵として分かりやすい
    { id: 'zukan', name: '図鑑館', def: 62, local: 2000, localTrain: 70, najimi: 70, rost: null }));
  Z.setBattleMap(m);
  const 全 = document.createElement('canvas');
  全.width = Z.FIELD.w; 全.height = Z.FIELD.h;
  Z.drawCastleTerrain(全.getContext('2d'), m);
  const 切る = (key, cx, cy, w, h, 倍) => {
    const p = 版(w * 倍, h * 倍);
    p.ctx.imageSmoothingQuality = 'high';
    p.ctx.drawImage(全, cx - w / 2, cy - h / 2, w, h, 0, 0, w * 倍, h * 倍);
    収める(key, p);
  };
  const 外 = m.layers[0];
  // 南（下）の門を選ぶ。堀・土橋・虎口・門が一枚に収まる
  const 門 = 外.gates.find((g) => g.face === 'S') || 外.gates[0];
  const gp = Z.gatePos(m, 外, 門);
  const 外郭 = 外.masu + m.t + 8 + m.moat.band;
  切る('shiro-mon', gp.x, gp.y + 外郭 * 0.45, 330, 210, 1.1);   // 門・虎口・土橋・堀
  const 矢 = m.fac.find((f) => f.kind === '矢倉');
  if (矢) 切る('shiro-yagura', 矢.x, 矢.y, 130, 85, 2.3);
  const 鐘 = m.fac.find((f) => f.kind === '陣鐘櫓');
  if (鐘) 切る('shiro-kane', 鐘.x, 鐘.y, 130, 85, 2.3);
  // 堀。門から離れた所を横から見る（土橋の掛かっていない帯）
  const 堀y = m.cy - (外.hh + m.t + 外.masu + m.t + 8 + m.moat.band * 0.5);
  切る('shiro-hori', m.cx - 外.hw * 0.55, 堀y, 300, 190, 1.2);
  // 城ぜんたい
  const 幅 = Math.min(Z.FIELD.w, Z.FIELD.h) * 0.92;
  切る('shiro-zentai', m.cx, m.cy, 幅, 幅 * 0.66, 1.05);
  Z.setBattleMap(null);
}

/* 五、陣形。十二組ぶんの持ち場を、盤と同じ形で置く */
for (const f of ['横陣', '鶴翼', '魚鱗', '鋒矢', '雁行', '方陣', '長蛇']) {
  const slots = Z.layoutSlots(f, 12);
  const xs = slots.map((s) => s.x), ys = slots.map((s) => s.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const p = 版(150, 110);
  p.ctx.fillStyle = '#DCE3C4'; p.ctx.fillRect(0, 0, 150, 110);
  const 幅 = Math.max(1, x1 - x0), 高 = Math.max(1, y1 - y0);
  const 倍 = Math.min(120 / 幅, 80 / 高, 2.2);
  p.ctx.save();
  p.ctx.translate(75, 55);
  p.ctx.scale(倍, 倍);
  p.ctx.translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  for (const s of slots) {
    p.ctx.fillStyle = 青;
    p.ctx.beginPath(); p.ctx.arc(s.x, s.y, 7, 0, 7); p.ctx.fill();
  }
  p.ctx.restore();
  // 敵の向きが分かるよう、上に赤い線を引く
  p.ctx.strokeStyle = 'rgba(176,72,60,0.55)'; p.ctx.lineWidth = 2;
  p.ctx.setLineDash([6, 5]);
  p.ctx.beginPath(); p.ctx.moveTo(18, 10); p.ctx.lineTo(132, 10); p.ctx.stroke();
  p.ctx.setLineDash([]);
  p.ctx.fillStyle = 'rgba(120,60,52,0.75)'; p.ctx.font = "10px 'Hiragino Sans',sans-serif";
  p.ctx.fillText('敵', 6, 14);
  収める('jin-' + f, p);
}

/* 六、特殊勢力の印 */
for (const k of ['港', '水軍衆', '商業都市', '町', '寺社', '忍びの里', '鉱山', '牧', '鉄砲鍛冶']) {
  const p = 版(96, 96);
  p.ctx.fillStyle = '#DCE3C4'; p.ctx.fillRect(0, 0, 96, 96);
  const 色 = (Z.町の色 && Z.町の色[k]) || '#55524A';
  p.ctx.fillStyle = '#fff';
  p.ctx.beginPath(); p.ctx.arc(48, 48, 26, 0, 7); p.ctx.fill();
  p.ctx.strokeStyle = 色; p.ctx.lineWidth = 2.4;
  p.ctx.beginPath(); p.ctx.arc(48, 48, 26, 0, 7); p.ctx.stroke();
  Z.drawTownMark(p.ctx, k, 48, 48, 17, 色);
  収める('machi-' + k, p);
}

const 箱 = document.createElement('div');
箱.id = 'zukan';
箱.textContent = JSON.stringify(出);
document.body.appendChild(箱);
document.title = 'DONE ' + Object.keys(出).length;
`;

const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">
<script>${fs.readFileSync(束, 'utf8')}</script>
<script>${描き}</script></body></html>`;
const p = path.join(TMP, 'zukan.html');
fs.writeFileSync(p, html);

const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--virtual-time-budget=15000',
  '--dump-dom', `file://${p}`], { maxBuffer: 1024 * 1024 * 256 }).toString();
const m = dom.match(/<div id="zukan">([\s\S]*?)<\/div>/);
if (!m) { console.error('図鑑が作れなかった'); process.exit(1); }
const 絵 = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));

/* 生の PNG は嵩む（三十五枚で二.八MB）。紙用と画面用の JPEG に落とす。
   図鑑の絵は小さいので、質を落としても粗は出ない。 */
let 紙計 = 0, 画計 = 0;
const 小 = {};
for (const [key, url] of Object.entries(絵)) {
  const png = path.join(TMP, `${key}.png`);
  fs.writeFileSync(png, Buffer.from(url.split(',')[1], 'base64'));
  const 大 = path.join(OUT, `${key}.jpg`);
  const 画 = path.join(TMP, `${key}-s.jpg`);
  try {
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '86', png, '--out', 大], { stdio: 'ignore' });
    // 画面のほうは幅三百六十で足りる（帳の中では百九十ほどで出る）
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '62',
      '--resampleWidth', '360', png, '--out', 画], { stdio: 'ignore' });
  } catch (e) { /* sips が無ければ PNG のまま */ }
  if (fs.existsSync(大)) 紙計 += fs.statSync(大).size;
  if (fs.existsSync(画)) {
    画計 += fs.statSync(画).size;
    小[key] = 'data:image/jpeg;base64,' + fs.readFileSync(画).toString('base64');
  } else 小[key] = url;
}
const 書 = '/* 図鑑の絵（駒・船・地物・城の設備・陣形・特殊勢力の印）。\n'
  + '   tools/zukan.cjs が作る（npm run zukan）。手で編まないこと。\n'
  + '   遊びが実際に使っている描き手をそのまま呼んで描いている。 */\n'
  + 'export const 図 = ' + JSON.stringify(小) + ';\n';
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'zukan.js'), 書);
console.log(`dist/tebiki/zu   ${Object.keys(絵).length}枚　紙用 ${Math.round(紙計 / 1024)} KB／画面用 ${Math.round(画計 / 1024)} KB`);
