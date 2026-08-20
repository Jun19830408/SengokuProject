/* 街道と出陣先（GDD 7.1）。

   「吉田郡山城から月山富田城へ攻めようとしたが、街道が繋がって見えるのに
     出陣先に出てこない」との報せ。

   二つの城は難所（八十九里）で直に結ばれている。ところが道を探す仕組みは
   安いほうの道――山吹城・白鹿城を経る街道――を返していた。その二城は尼子の
   ものであるから、「途中の城がすべて味方か同盟でなければ通れない」という
   決まりに引っかかる。直の道があるのに、通れないと判ぜられていた。

   順が逆である。いちばん安い道を探してから通れるかを問うのではなく、
   はじめから通れる所だけを通って探す。 */
const path = require('path');
const H = require(path.join(__dirname, '..', 'build', 'harness.cjs'));

const 咎 = [];
const 確 = (名, 可, 添 = '') => {
  console.log(`  ${可 ? '○' : '★'} ${名}${添 ? '　' + 添 : ''}`);
  if (!可) 咎.push(名);
};
const 通れる = (s, fid) => (id) => {
  const m = s.castles.find((y) => y.id === id);
  if (!m) return true;
  if (m.faction === fid) return true;
  const st = H.relOf(s, fid, m.faction).state;
  return st === "同盟" || st === "従属" || st === "臣従";
};

/* ------------------------ 一、報せのあった局面 */
{
  const s = H.initState("mori");
  const 名 = (id) => (s.castles.find((c) => c.id === id) || {}).name || id;
  確('吉田郡山城と月山富田城は街道で直に結ばれている',
    !!H.roadBetween("koriyama_a", "gassan"),
    JSON.stringify(H.roadBetween("koriyama_a", "gassan")));
  const 旧 = H.findPath("koriyama_a", "gassan");
  確('いちばん安い道は、尼子の城を通る', 旧.length > 2,
    旧.map(名).join("→"));
  const 新 = H.findPathVia("koriyama_a", "gassan", 通れる(s, "mori"));
  確('通れる所だけを通れば、直の道が見つかる', !!新 && 新.length === 2,
    新 ? 新.map(名).join("→") : "（なし）");
  確('その道のりは難所ぶんだけ長い', H.marchMonthsOf(新) >= 6,
    `${H.marchMonthsOf(新)}か月（難所は足が〇.一八）`);
}

/* --------------- 二、全国に同じところが幾つあったか */
{
  const 城 = (s) => new Set(s.castles.map((c) => c.id));
  let 直 = 0, 迂回 = 0;
  const s0 = H.initState("oda");
  const ids = 城(s0);
  for (const r of H.ROADS) {
    if (!ids.has(r[0]) || !ids.has(r[1])) continue;
    直++;
    const p = H.findPath(r[0], r[1]);
    if (!p || p.length !== 2) 迂回++;
  }
  確('城どうしを直に結ぶ街道が四百本以上ある', 直 >= 400, `${直}本`);
  確('そのうち何本かは、道を探すと迂回してしまう', 迂回 > 0,
    `${迂回}本（難所・山道・海路。近いが険しい道である）`);

  // 家ごとに、直に結ばれた敵城へ出陣できること
  const 家 = ["mori", "amago", "date", "nagao", "takeda", "hojo", "shimazu", "otomo", "chosokabe", "oda"];
  let 塞 = [];
  for (const f of 家) {
    let s; try { s = H.initState(f); } catch (e) { continue; }
    for (const c of s.castles.filter((x) => x.faction === f)) {
      for (const r of H.ROADS) {
        let 他 = null;
        if (r[0] === c.id) 他 = r[1]; else if (r[1] === c.id) 他 = r[0]; else continue;
        const t = s.castles.find((x) => x.id === 他);
        if (!t || t.faction === f) continue;
        // 直に結ばれているのだから、道は必ず見つからねばならない
        const 道 = H.findPathVia(c.id, 他, 通れる(s, f));
        if (!道) 塞.push(`${s.factions[f].name}：${c.name}→${t.name}`);
      }
    }
  }
  確('直に結ばれた敵城へは、必ず道が見つかる', 塞.length === 0,
    塞.length ? 塞.slice(0, 5).join("／") : "十家ぶんを検めた");
}

/* --------------- 三、通れぬ所は、やはり通れないこと */
{
  const s = H.initState("oda");
  /* 他家の城を跨いだ先へは、依然として兵を出せない。
     直の道が無いのに通れてしまっては、決まりの意味がない。 */
  const 遠 = s.castles.find((c) => c.faction !== s.player
    && !H.roadBetween("nagoya", c.id)
    && (H.marchMonths("nagoya", c.id) || 99) > 6);
  if (遠) {
    const 道 = H.findPathVia("nagoya", 遠.id, 通れる(s, "oda"));
    確('他家の領を跨いだ遠国へは、通れる道がない', !道 || H.marchMonthsOf(道) > 6,
      `${遠.name}まで${道 ? H.marchMonthsOf(道) + "か月" : "道なし"}`);
  }
  const 隣 = H.findPathVia("nagoya", "kiyosu", 通れる(s, "oda"));
  確('隣の城へは、これまで通り道が見つかる', !!隣 && 隣.length === 2,
    隣 ? 隣.length - 1 + "区間" : "（なし）");
}

console.log('');
if (咎.length) { console.log('★背いた事:'); for (const x of 咎) console.log('   ' + x); }
console.log('エラー:', 咎.length ? `${咎.length}件` : 'なし');
process.exit(咎.length ? 1 : 0);
