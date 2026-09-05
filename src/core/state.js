import { extraIncome, fiefWanted, stipendOf, 役の要る身分, 身分の位 } from "./rank.js";
import { newRoster } from "./roster.js";
import { 姫を整える } from "./hime.js";
import { clamp, fmt, monthsBetween } from "./util.js";
import { findPath, findPathVia } from "./paths.js";
import { CASTLES, TOWNS } from "../data/castles.js";
import { SPECIAL_OPTIONS } from "../data/diplo.js";
import { FACTIONS } from "../data/factions.js";
import { GENERALS } from "../data/generals.js";
import { px, py } from "../data/geo.js";
import { PARENT } from "../data/newcomers.js";
import { MOB_POLICY } from "../data/roads.js";
import { 城の馬, 城の鉄砲 } from "../data/arms.js";
import { 直属の兵科 } from "../data/arms.js";
import { SUBJECT, masterOf } from "../data/diplo.js";

export const relKey = (a, b) => [a, b].sort().join("|");


/* 盟約の印から相手を取り出す（GDD 12.1）。

   これまで「印にその家の名が含まれるか」で見ていた。印は "a|b" という字であるから、
   字として含まれるかを見ると、"so"（宗家）が "chosokabe|ichijo" に、
   "iga"（伊賀惣国）が "ouchi|shiga" に、"oda"（織田家）が "oda_h|…"（小田家）に、
   それぞれ引っかかる。他家の盟約が自家のものとして数えられていた。
   区切りで分けて、名そのものと突き合わせる。 */
export const 盟約の相手 = (k, fid) => {
  const p = k.split("|");
  return p[0] === fid ? p[1] : p[1] === fid ? p[0] : null;
};
export const 己の盟約 = (k, fid) => 盟約の相手(k, fid) != null;


export function initState(player) {
  const factions = JSON.parse(JSON.stringify(FACTIONS));
  for (const f of Object.values(factions)) f.prestige = 50;
  /* 本拠（GDD 6.4）。家の本城である。陣触れはここから出る。
     当主のいる城を本拠とする。当主が居らねば、いちばん石高の高い城。 */
  const 本拠を定める = (fid, 城ら, 将ら) => {
    const 主 = 将ら.find((x) => x.faction === fid && x.lord);
    if (主 && 主.at && 城ら.some((c) => c.id === 主.at)) return 主.at;
    const 我 = 城ら.filter((c) => c.faction === fid);
    if (!我.length) return null;
    return [...我].sort((a, b) => b.koku - a.koku)[0].id;
  };
  const relations = {};
  const ids = Object.keys(factions);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    relations[relKey(ids[i], ids[j])] = { trust: 45 + Math.round(Math.random() * 10), state: "中立", until: null };
  }
  // 史実に沿った初めの間柄。阿波の国人は三好に従い、その旗の下にある。
  // 天文十五年（1546）の間柄。史実に拠る。
  const START_TIES = [
    // ── 東国。河越夜戦の直後であり、北条は今川・武田と和を結んだばかり。
    ["hojo", "takeda", "同盟", 74],         // 甲相同盟（天文十三年ごろ成立）
    ["hojo", "imagawa", "不可侵", 58],      // 第二次河東一乱の和睦（天文十四年十月）
    ["takeda", "imagawa", "同盟", 76],      // 甲駿同盟。武田が今川・北条を調停した
    ["hojo", "uesugi_y", "敵対", 8],        // 河越夜戦で山内上杉を破ったばかり
    ["hojo", "koga", "敵対", 10],           // 古河公方も河越で北条に敗れた
    ["uesugi_y", "koga", "同盟", 72],       // 関東管領と古河公方は連合していた
    ["uesugi_y", "imagawa", "同盟", 66],    // 今川は上杉と通じて北条を挟撃した
    ["hojo", "satomi", "敵対", 12],         // 里見は房総で北条と争う
    ["takeda", "murakami", "敵対", 10],     // 武田は信濃で村上と争っていた
    ["takeda", "nagao", "敵対", 22],        // 信濃をめぐり長尾とも緊張
    // ── 東海。松平は今川に従い、織田と争う。
    ["matsudaira", "imagawa", "従属", 64],  // 広忠は今川に依存を深めていた
    ["matsudaira", "oda", "敵対", 8],       // 第二次安城合戦のさなか
    ["oda", "imagawa", "敵対", 12],         // 三河をめぐる争い
    ["oda", "yamato", "敵対", 18],          // 織田三家は同族ながら相争う
    ["oda", "ise", "敵対", 22],
    /* 水野信元は天文十三年に今川と縁を切り（於大の方の離縁がその結果である）、
       織田方に転じた。独立した国人でありながら織田に属し、のちに信長に
       誅されるほど臣下に近い。対等の同盟より、従属のほうが近い。 */
    ["mizuno", "oda", "従属", 68, "oda"],   // 水野は織田の旗の下に転じていた
    ["oda", "saito", "敵対", 20],           // 美濃をめぐる争い
    // ── 畿内・西国
    ["ashikaga", "miyoshi", "従属", 44],    // 将軍家は細川・三好に擁されていた
    ["shingai", "miyoshi", "従属", 78],     // 新開は三好に従う阿波の国人
    ["kagawa", "miyoshi", "従属", 70],      // 讃岐香川も三好の下にある
    ["miyoshi", "honganji", "不可侵", 56],
    ["kobayakawa", "mori", "同盟", 82],     // 小早川は毛利の一族
    ["mori", "ouchi", "従属", 74],          // 毛利は大内に属する安芸の国人
    ["takeda_a", "amago", "従属", 62],      // 安芸武田は尼子を頼む
    ["ouchi", "amago", "敵対", 14],         // 大内と尼子は山陰山陽を争う
    ["ouchi", "otomo", "敵対", 26],         // 北九州をめぐる争い
    ["ryuzoji", "otomo", "従属", 52],       // 龍造寺は大友の傘下にあった
    // ── 九州・四国
    ["shimazu", "ito", "敵対", 16],         // 日向をめぐる争い
    ["chosokabe", "ichijo", "従属", 58],    // 長宗我部は一条を頼っていた
    /* 土佐七雄（GDD 12.2）。一五四六年の土佐は、公家大名の一条を上に戴きつつ、
       中央に本山、東に安芸、西に津野、その間に大平・香宗我部・長宗我部が
       割拠する形であった。もっとも力があったのは本山梅慶（茂宗）で、
       吉良を併せて土佐中央を握り、一条とも長宗我部とも相容れない。 */
    ["ohira", "ichijo", "従属", 60],        // 大平は一条の傘下にある
    ["tsuno", "ichijo", "従属", 56],        // 津野も一条を頼む
    ["motoyama", "ichijo", "敵対", 18],     // 本山は一条と土佐の主を争う
    ["motoyama", "chosokabe", "敵対", 12],  // 本山と長宗我部は宿敵である
    ["motoyama", "ohira", "敵対", 26],      // 本山は吾川へも手を伸ばす
    ["kosokabe", "aki", "同盟", 70],        // 香宗我部は安芸氏と結ぶ
    ["aki", "chosokabe", "敵対", 16],       // 安芸と長宗我部は香美をめぐり争う
    ["kosokabe", "chosokabe", "不可侵", 52],// のちに親泰が養子に入る間柄
    /* 城と大名家の増補（第二期）。立てた六家の、一五四六年の立ち位置。 */
    ["kimotsuki", "shimazu", "敵対", 14],   // 肝付は島津と大隅を争う
    ["kimotsuki", "ito", "同盟", 66],       // 肝付と伊東は島津を挟む
    ["aso", "sagara", "不可侵", 54],        // 阿蘇と相良は肥後を分け合う
    ["aso", "kikuchi", "敵対", 24],         // 菊池（義武）とは相容れない
    ["munakata", "ouchi", "従属", 68],      // 宗像は大内に属する筑前の国人
    ["hatakeyama_k", "miyoshi", "敵対", 16],// 畠山は三好に河内を侵されつつある
    ["hatakeyama_k", "saika", "同盟", 62],  // 紀伊の守護として雑賀と結ぶ
    ["ogasawara", "takeda", "敵対", 10],    // 武田は信濃府中を狙っている
    ["ogasawara", "murakami", "同盟", 68],  // 信濃の国衆は武田に対して結ぶ
    ["kiso", "ogasawara", "従属", 54],      // 木曽は信濃守護の下にある
    ["kiso", "takeda", "敵対", 22],
    ["kono", "ouchi", "不可侵", 54],
    // ── 奥羽
    ["date", "ashina", "同盟", 66],         // 天文の乱を経て和した
    ["nanbu", "kunohe", "従属", 48, "nanbu"],   // 九戸は南部の一族ながら不穏（主は南部）
    ["nanbu", "oura", "従属", 46, "nanbu"],     // 大浦も南部に属する（主は南部）
    ["mogami", "date", "従属", 56],         // 最上は伊達と縁を結ぶ
    /* 初めの間柄の増補（第三期）。一五四六年四月の、上下と縁を書き足す。

       これまで間柄を書いていなかった家は、みな「中立」から始まっていた。
       浅井は家の説き書きに「六角に押さえられ、当主久政は屈従を選んでいる」と
       ありながら、盤の上では六角と何の縁も無い。書き足す。 */
    // ── 畿内・近江
    ["azai", "rokkaku", "従属", 50],        // 久政は六角に屈し、賢政の名まで貰う
    ["bessho", "akamatsu", "従属", 58],     // 別所は赤松の被官として三木に拠る
    ["uragami", "akamatsu", "敵対", 20],    // 浦上政宗は主家赤松から離れつつある
    ["hatano", "miyoshi", "不可侵", 52],    // 波多野は細川晴元方として三好と並ぶ
    ["tsutsui", "miyoshi", "敵対", 22],     // 筒井順昭は大和で三好・木沢と争う
    ["wakasa", "asakura", "不可侵", 56],    // 若狭武田は朝倉の助けを仰ぐ
    ["isshiki", "wakasa", "敵対", 18],      // 丹後一色と若狭武田は境を争う
    // ── 北陸
    ["kaga_ikko", "asakura", "敵対", 12],   // 享禄・天文の乱以来の宿怨
    /* 一向衆の本家は大坂（石山）である。証如の代、山科を焼かれて移った。
       加賀は下間を通じて本山が直に治め、長島願証寺は蓮如の血を引く一族が
       住持する末寺であって、いずれも本山の指図で動く。ゆえに臣従とする。 */
    ["kaga_ikko", "honganji", "臣従", 84],  // 加賀は本願寺の国である
    ["ikko", "honganji", "臣従", 80],       // 長島願証寺も本山の下にある
    ["shiina", "nagao", "従属", 54],        // 椎名は越後長尾を頼む
    ["jinbo", "shiina", "敵対", 18],        // 神保と椎名は越中を二分して争う
    // ── 関東。河越夜戦の直後であり、上杉方の国衆が北条へ靡きはじめる。
    ["narita", "uesugi_y", "従属", 44],     // 成田はなお山内上杉に属する
    ["yura", "uesugi_y", "従属", 46],       // 横瀬（由良）も上杉方
    ["ota", "hojo", "敵対", 12],            // 岩付太田は扇谷の遺臣として北条と戦う
    ["chiba", "hojo", "従属", 52],          // 千葉は北条に接近していた
    ["yuki", "koga", "同盟", 70],           // 結城政勝は古河公方を支える
    ["nasu", "utsunomiya", "敵対", 16],     // 那須と宇都宮は下野の宿敵
    ["oda_h", "satake", "敵対", 18],        // 小田と佐竹は常陸を争う
    ["edo_h", "satake", "従属", 54],        // 水戸江戸氏は佐竹の下にある
    // ── 奥羽
    ["kakizaki", "ando", "従属", 56],       // 蠣崎は下国安東に年貢を納めていた
    ["osaki", "date", "従属", 50],          // 大崎は伊達の介入を受けて久しい
    ["nihonmatsu", "date", "従属", 48],     // 二本松畠山は天文の乱で稙宗方
    ["tamura", "date", "同盟", 60],         // 田村隆顕は伊達と縁を結ぶ
    ["soma", "date", "同盟", 58],           // 相馬顕胤は稙宗の婿である
    ["tendo", "mogami", "敵対", 20],        // 天童は最上八楯の盟主として最上に抗す
    ["shiba", "nanbu", "敵対", 16],         // 高水寺斯波は南部に圧されている
    ["namioka", "nanbu", "不可侵", 50],     // 浪岡北畠は南部の圧を受けつつ保つ
    // ── 中国・四国
    ["nanjo", "amago", "従属", 56],         // 伯耆南条は尼子に属する
    ["mimura", "amago", "従属", 52],        // 三村家親はこのころ尼子方
    ["shoo", "mimura", "敵対", 20],         // 庄と三村は備中を争う
    ["masuda", "ouchi", "従属", 62],        // 石見益田は大内に従う
    ["yoshimi", "ouchi", "従属", 54],       // 吉見も大内の下にある（のち陶に抗す）
    ["yamana", "amago", "敵対", 18],        // 但馬山名は尼子の伸長を防ぐ
    ["kurushima", "kono", "従属", 66],      // 来島村上は河野の水軍である
    ["saionji", "kono", "敵対", 20],        // 西園寺と河野は伊予を分けて争う
    // ── 九州
    ["akizuki", "ouchi", "従属", 60],       // 秋月文種は大内に属する筑前の国人
    ["so", "ouchi", "不可侵", 58],          // 対馬宗氏は大内と通交の利を分かつ
    ["kamachi", "otomo", "従属", 58],       // 蒲池鑑盛は大友に従う筑後の旗頭
    ["shiga", "otomo", "臣従", 80],         // 志賀は大友の一族であり重臣である
    ["kikuchi", "otomo", "敵対", 10],       // 菊池義武は兄義鑑に叛いている
    ["omura", "arima", "従属", 68],         // 大村純忠は有馬晴純の子である
    ["hata", "matsura", "敵対", 24],        // 波多と松浦党は上松浦の旗頭を争う
    ["sagara", "shimazu", "不可侵", 52],    // 相良と島津は肥薩の境で和を保つ
    ["tsuchimochi", "ito", "敵対", 18],     // 土持は伊東と日向を争う
    /* 城と大名家の増補（第四期）。立てた十四家の、一五四六年の立ち位置。 */
    ["hoshino", "otomo", "従属", 62],       // 星野は大友の下にある筑後の国人
    ["tajiri", "otomo", "従属", 58],        // 田尻も大友に属する
    ["negoro", "saika", "同盟", 72],        // 根来と雑賀は紀州の鉄砲衆として結ぶ
    ["negoro", "hatakeyama_k", "不可侵", 54],
    ["yukawa", "hatakeyama_k", "従属", 66], // 湯川は紀伊守護畠山の被官である
    ["yukawa", "saika", "敵対", 22],        // 日高の地をめぐって雑賀と競う
    ["yamana_b", "amago", "従属", 58],      // 山名理興は尼子を頼んで神辺に拠る
    ["yamana_b", "ouchi", "敵対", 8],       // 神辺合戦のさなかである
    ["yamanouchi", "amago", "従属", 52],    // 山内も尼子の下にある備後の国人
    ["yamanouchi", "yamana_b", "同盟", 62],
    ["miura", "amago", "敵対", 12],         // 三浦は高田城を尼子に脅かされ続ける
    ["matsuda", "uragami", "敵対", 16],     // 松田と浦上は備前を二分して争う
    ["ochi", "tsutsui", "敵対", 14],        // 越智は筒井と大和の主を争う
    ["tochi", "tsutsui", "同盟", 64],       // 十市は筒井方に立つ
    ["ochi", "tochi", "敵対", 20],
    ["naito", "hatano", "敵対", 18],        // 丹波守護代の内藤と、八上の波多野
    ["mariyatsu", "hojo", "従属", 54],      // 真里谷の内訌に敗れた信隆は北条を頼む
    ["mariyatsu", "satomi", "敵対", 14],    // 里見は信応を助けて上総を侵す
    ["kyogoku", "azai", "従属", 46],        // 名門京極は、被官であった浅井に擁されている
    ["ii", "imagawa", "従属", 60],          // 井伊は今川の下に置かれ、人質を出している
    /* 初めの間柄の増補（第四期）。第三期で抜けていた伊勢・北陸・奥羽ほか。
       間柄が無いこと自体は差し支えないが、史実に間柄があった所は書く。 */
    // ── 伊勢・志摩。南の国司北畠と、北の国人（長野・神戸・関）が争う
    ["nagano_k", "kitabatake", "敵対", 20], // 長野工藤は北畠と伊勢を分けて争う
    ["kanbe", "kitabatake", "敵対", 24],    // 神戸ら北伊勢の国人も国司に従わない
    ["kuki", "kitabatake", "従属", 58],     // 志摩の九鬼は北畠の被官である
    // ── 北陸。加賀一向一揆に対して、能登畠山と朝倉が共に戦った
    ["hatakeyama", "kaga_ikko", "敵対", 14],
    ["hatakeyama", "asakura", "同盟", 60],  // 享禄・天文の乱以来の共闘
    // ── 越後・佐渡。守護代長尾の下に、揚北衆と佐渡本間がある
    ["agakita", "nagao", "従属", 44],       // 揚北衆は長尾に属しつつ、しばしば背く
    ["honma", "nagao", "従属", 46],         // 佐渡本間は越後の下にある
    // ── 関東。河越夜戦の直後、下野の佐野はなお上杉方
    ["sano", "uesugi_y", "従属", 46],
    ["sano", "utsunomiya", "不可侵", 50],   // 下野の国人どうし、境を侵さない
    // ── 備中。庄と石川は姻戚、三村とは争う
    ["shimizu", "shoo", "同盟", 58],
    ["shimizu", "mimura", "敵対", 22],
    // ── 奥羽。伊達稙宗の縁が北へ広がっている
    ["kokubun", "date", "従属", 46],        // 陸奥宮城の国分は伊達に属する
    ["kasai", "date", "不可侵", 52],        // 葛西晴胤は天文の乱で稙宗方
    ["kasai", "osaki", "敵対", 24],         // 葛西と大崎は境を接して争う
    ["abe", "nanbu", "不可侵", 48],         // 遠野阿曽沼は南部と境を接する
    ["shirakawa", "satake", "敵対", 18],    // 白河結城と佐竹は長年の抗争
    ["shirakawa", "nasu", "敵対", 22],      // 那須とも境目を争う
    ["nikaido", "ashina", "不可侵", 50],    // 須賀川二階堂は蘆名の圧を受けつつ保つ
    ["daihoji", "mogami", "敵対", 22],      // 庄内大宝寺と最上は争う
    ["daihoji", "onodera", "敵対", 20],
    ["onodera", "ando", "敵対", 22],        // 小野寺と安東は雄勝・仙北を争う
    ["onodera", "mogami", "敵対", 20],
    // ── 蝦夷・琉球
    ["ainu_w", "kakizaki", "敵対", 20],     // 蠣崎とアイヌの和議は天文十九年である
    ["ainu_e", "kakizaki", "敵対", 18],
    ["ryukyu", "shimazu", "不可侵", 54],    // 琉球と島津は通交の利を分かつ
  ];
  /* 上下のある間柄には、どちらが上かを書き留めておく（GDD 12.2）。

     書き留めていなかったころは、石高で見当をつけるほかなかった。
     見当は石高の上下でひっくり返るので、三好に従っていた足利将軍家が、
     いつのまにか「三好の主」と読まれ、三好が二人の主に仕えていることになった。
     並びは（下、上）を常とし、逆のものだけ主を書き添えてある。 */
  for (const [a, b, st, tr, 主] of START_TIES) {
    const k = relKey(a, b);
    if (!relations[k]) continue;
    relations[k].state = st; relations[k].trust = tr; relations[k].until = null;
    if (SUBJECT.includes(st)) relations[k].master = 主 || b;
  }
  const specials = {};
  for (const t of TOWNS) specials[t.id] = { state: "中立", faction: null, anger: 0, months: 0 };
  const 盤 = {
    /* 卓（GDD 15.3）。ひとつの遊びを見分ける印。

       これが無いと、記録の置き場は「別の遊びで上書きしようとしている」ことに
       気づけない。実際、新しく始めただけで、進めていた盤が黙って消えた。
       盤ごとに違う印を持たせ、置き場の側で守る。 */
    /* 印は賽から起こす。時計を混ぜてはならない。

       もとは Date.now() を混ぜていた。ところが卓の印は、置き場を守るためだけの
       ものではない。外交・調略・縁組の賽は籤(s.卓, …) から起こしているので、
       印に時計が入っていると、賽を固定しても盤が毎回ずれる。
       同じ種で二度回して 従56/54・臣13/19・城の持ち主まで食い違った。
       ★gaiko が時折倒れていたのもこれである。

       遊ぶ側にとっては Math.random が本物の賽なので、卓ごとに違う印が出る。
       一兆通りあれば、人ひとりの持つ数枚の記録がぶつかることはない。 */
    卓: `t${Math.floor(Math.random() * 1e12).toString(36)}`,
    player, year: 1546, month: 4,
    factions,
    castles: 馬と鉄砲を配る(assignKokuCap(CASTLES.map((c) => ({
      ...c, x: px(c.lon), y: py(c.lat),
      najimi: 70,            // 地域家臣団が現城主を受け入れる度合い（GDD 6.2）
      rost: newRoster(c.local, `loc-${c.id}`),   // 地域家臣団の組の名簿
      kokuBase: Math.round(c.koku * 1.25),        // 治水の伸びを測るための元の余地
      /* 田の限りは三段に分かれる（GDD 4.6）。

         盤の総石高 1,258万石は、慶長三年（一五九八）の検地高 1,860万石の
         〇.六八倍である。天文十五年の把握が粗いからであって、地の力が
         それしかないわけではない。竿を入れれば実りは表に出る。

           石高       いま実っている高。開墾で増える
           田畑可能地  開ける余地。治水で広がる（kokuMax）

         初めの田畑可能地は、拠点定義では石高の一.一二五倍であった。岡豊城で
         余地一千六十二石、開墾一手はその十六分なので百七十一石しか開けない。
         石高が百七十一石増えても軍役の器は六人しか増えず、田を開くことと
         兵が増えることの繋がりが読めなかった。一.二五倍に改める。
         一手で三百石ほど開き、三人が働けば七百三十六石になる。
           慶長の高    治水が届く限り。石高の一.四七八倍（kokuCap）
           元禄の高    地の力そのもの。石高の二.〇五一倍（kokuGen）

         元禄十年（一六九七）の郷帳は 2,580万石。慶長からさらに三割九分
         伸びている。新田開発と治水が百年かけて開いた分である。
         この遊びは一六〇〇年の天下統一、一七〇〇年の世界制覇を構想と
         するので、元禄の高をもって地の天井とする。

         はじめから元禄の高までは開けない。一国を丸ごと押さえて検地を
         行ってはじめて、限りが慶長の高から元禄の高へ引き上がる。
         引き上がるだけであって、石高がその場で増えるわけではない。
         そこから先は、みずから治水して田畑可能地を広げ、開墾で田を開く。 */
      kokuMax: Math.round(c.koku * 1.25),          // 開ける余地（拠点定義の一.一二五倍を改める）
      kokuCap: Math.round(c.koku * 1.478),         // 治水の届く限り＝慶長三年の検地高
      kokuGen: Math.round(c.koku * 2.051),         // 地の天井＝元禄十年の検地高
      well: 100,             // 井戸。城工作で傷むと籠城が続かない（GDD 9.2）
      lordId: null, intrigue: false,
    })))),
    // 知行を定めてから、城を預かる者に身分を保証する
    generals: assignRanks(CASTLES, fillKeepers(CASTLES, GENERALS).map((g) => ({
      ...g, unity: clamp(g.retTrain + 8, 30, 100), merit: 0,
      retCap: g.retinue,                        // 軍役の器。加増すれば増える（GDD 6.4）
      /* 本領（GDD 6.4）。その武将が根付く城である。

         これまで持っていたのは「いま居る所」（at）だけであった。ゆえに城を
         落とすと攻めた将が全員そこに住み着き、禄高までがその城の余禄で
         数え直された。出陣しただけで身代が変わる、という妙なことが起きていた。

         武将は城とその城が抱える土地に根付く。居場所と根は別である。
         初めは居る城をそのまま本領とする。 */
      本領: g.at || null,
      fief: Math.round(fiefWanted(g) * (0.72 + Math.random() * 0.34)),
      rost: newRoster(g.retinue, `ret-${g.id}`, 直属の兵科) }))),
    armies: [], orders: {}, ledger: [], sieges: [], promo: null, campaigns: [],
    relations, specials, plots: [], intel: {}, prev: {},
    hime: [],                                    // 姫（GDD 6.8）。下で家々に配る
    chronicle: [{ y: 1546, m: 4, text: "尾張は織田三家に分かれ、美濃は斎藤道三が握る。天下はまだ遠い。" }],
  };
  姫を整える(盤);                                 // 家の石高に応じて姫を立てる
  // 家ごとに本拠を据える。陣触れはここから出る。
  for (const fid of Object.keys(盤.factions)) {
    盤.factions[fid].本拠 = 本拠を定める(fid, 盤.castles, 盤.generals);
  }
  国主を据える(盤);                               // 国ごとに国主を一人（GDD 6.4）
  return 盤;
}

// 旧いセーブには名簿がない。読み込み時に作る。
export function migrateRosters(s) {
  for (const c of s.castles) if (!c.rost) c.rost = newRoster(Math.max(0, c.local), `loc-${c.id}`);
  for (const gq of s.generals) if (!gq.rost) gq.rost = newRoster(Math.max(0, gq.retinue), `ret-${gq.id}`, 直属の兵科);
  for (const a of s.armies || []) if (!a.rost) a.rost = newRoster(Math.max(0, a.local), `arm-${a.id}`);
  return s;
}

// 名のある将を置いていない城には城代を据える。無人の城があると出陣も守備も成り立たない。
export const KEEPER_NAMES = ["城代", "留守居", "番頭", "代官"];

export function fillKeepers(castles, generals) {
  const out = [...generals];
  for (const c of castles) {
    if (out.some((g) => g.at === c.id && g.faction === c.faction)) continue;
    const k = Math.abs(c.id.split("").reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
    const nm = `${c.name.replace(/城$|御堂$|館$|本願寺$/, "")}${KEEPER_NAMES[k % KEEPER_NAMES.length]}`;
    out.push({
      id: `keeper-${c.id}`, name: nm, faction: c.faction,
      lead: 52 + (k % 13), valor: 50 + (k % 15), wit: 46 + (k % 12), gov: 50 + (k % 14),
      loyal: 74 + (k % 16), age: 30 + (k % 22), at: c.id,
      retinue: Math.round(140 + (c.koku / 10000) * 22), retTrain: 52 + (k % 10),
    });
  }
  return out;
}

// 城を預かる者には城主相応の知行を与える。
// 城を任されながら物頭のまま、というのは筋が通らない。
export function assignRanks(castles, generals) {
  // 家中の格を定める。城の数だけ家老を立て、当主のいる城は当主が預かる。
  for (const fid of [...new Set(castles.map((c) => c.faction))]) {
    const cs = castles.filter((c) => c.faction === fid);
    const gs = generals.filter((g) => g.faction === fid);
    if (!cs.length || !gs.length) continue;
    const lord = gs.find((g) => g.lord);
    // 当主が座す城を除いた数だけ、家老が要る
    const seatId = lord ? lord.at : null;
    const need = cs.filter((c) => c.id !== seatId).length;
    // 城ごとに、その城の筆頭を家老に立てる
    for (const c of cs) {
      if (c.id === seatId) continue;
      const here = gs.filter((g) => g.at === c.id && !g.lord);
      if (!here.length) continue;
      const head = [...here].sort((a, b) =>
        (b.lead + b.gov + b.wit) - (a.lead + a.gov + a.wit))[0];
      // 家老の禄高に届くだけの知行を与える。城が小さければ届かぬこともある。
      // 余禄の分け前を見込んで逆算する。
      const extra = extraIncome(c);
      const others = here.filter((x) => x !== head).reduce((t, x) => t + (x.fief || 0), 0);
      let want = Math.max(head.fief || 0, 1000);
      for (let i = 0; i < 40; i++) {
        const total = others + want;
        const got = want + (total > 0 ? extra * (want / total) : 0);
        if (got >= 8400) break;
        want = Math.round(want * 1.15) + 300;
        if (want > c.koku * 0.75) break;
      }
      head.fief = want;
    }
    // 当主の知行は家の身代。石高に見合う高を持たせる。
    if (lord) {
      const koku = cs.reduce((t, c) => t + c.koku, 0);
      lord.fief = Math.max(lord.fief || 0, Math.round(koku * 0.22));
    }
    // 宿老は、城を預かる家老の中から選ぶ。城を持たぬ者が宿老になるのは筋が違う。
    // 一城のみの家に宿老は要らない。
    const heads = cs.filter((c) => c.id !== seatId).map((c) => {
      const here = gs.filter((g) => g.at === c.id && !g.lord);
      return here.length
        ? [...here].sort((a, b) => (b.fief || 0) - (a.fief || 0))[0] : null;
    }).filter(Boolean);
    const nSenior = cs.length >= 4 ? Math.max(1, Math.floor(cs.length / 4)) : 0;
    [...heads].sort((a, b) => (b.lead + b.gov + b.wit) - (a.lead + a.gov + a.wit))
      .slice(0, nSenior)
      .forEach((g) => {
        const c = castles.find((x) => x.id === g.at);
        if (!c) return;
        const extra = extraIncome(c);
        const here = gs.filter((x) => x.at === c.id && !x.lord && x !== g);
        const others = here.reduce((t, x) => t + (x.fief || 0), 0);
        let want = g.fief || 0;
        for (let i = 0; i < 40; i++) {
          const total = others + want;
          const got = want + (total > 0 ? extra * (want / total) : 0);
          if (got >= 20600) break;
          want = Math.round(want * 1.12) + 500;
          if (want > c.koku * 0.8) break;
        }
        g.fief = want;
      });
  }
  // 幼き当主には後見を立てる（GDD 6.6）
  for (const fid of [...new Set(castles.map((c) => c.faction))]) {
    const lord = generals.find((g) => g.lord && g.faction === fid);
    if (!lord || (lord.age || 30) >= 15) continue;
    let kin = generals.filter((g) => g.faction === fid && g.id !== lord.id && (g.age || 0) >= 25);
    if (!kin.length) kin = generals.filter((g) => g.faction === fid && g.id !== lord.id && (g.age || 0) >= 18);
    if (!kin.length) continue;
    const sur = lord.name.slice(0, 2);
    const pick = [...kin].sort((a, b) =>
      (b.name.startsWith(sur) ? 1 : 0) - (a.name.startsWith(sur) ? 1 : 0)
      || (b.lead + b.gov + b.wit) - (a.lead + a.gov + a.wit))[0];
    lord.guardian = pick.id;
    pick.at = lord.at;                       // 後見は当主のもとに詰める
  }
  // 当主の子には家格に応じた知行を宛がう
  for (const c of castles) {
    const lord = generals.find((g) => g.lord && g.faction === c.faction);
    if (!lord) continue;
    const kids = generals.filter((g) => PARENT[g.id] === lord.id && g.at === c.id && !g.lord);
    if (!kids.length) continue;
    const sorted = [...kids].sort((a, b) => (b.age || 0) - (a.age || 0));
    sorted.forEach((k, i) => {
      const floor = i === 0 ? Math.round(c.koku * 0.10) : Math.round(c.koku * 0.055);
      k.fief = Math.max(k.fief || 0, floor);
    });
  }
  // 城ごとに、配った知行が石高の八割を超えぬよう収める（当主の分は御料なので除く）
  for (const c of castles) {
    const gs2 = generals.filter((g) => g.at === c.id && g.faction === c.faction && !g.lord);
    const room = Math.round(c.koku * 0.8);
    let sum = gs2.reduce((a, g) => a + (g.fief || 0), 0);
    if (sum > room && sum > 0) {
      const k = room / sum;
      for (const g of gs2) g.fief = Math.round((g.fief || 0) * k);
    }
  }
  return generals;
}

/* 馬と鉄砲を城へ配る（GDD 6.3）。

   槍と弓は村々の百姓が自前で携えて出るので数えない。
   馬は牧のある国に多く、鉄砲は伝来まもないので持つ家が限られる。
   数の拠りどころは data/arms.js に置いた。 */
export function 馬と鉄砲を配る(castles) {
  const 家の石高 = {};
  for (const c of castles) 家の石高[c.faction] = (家の石高[c.faction] || 0) + c.koku;
  for (const c of castles) {
    if (c.horse == null) c.horse = 城の馬(c);
    if (c.gun == null) c.gun = 城の鉄砲(c, 家の石高[c.faction] || 0);
  }
  return castles;
}

export function assignKokuCap(castles) {
  for (const c of castles) {
    if (c.kokuCap == null) c.kokuCap = Math.round(c.kokuMax * 1.2);
    c.province = c.kuni || null;
  }
  return castles;
}


/* --------------------------------------------------- 難易度（GDD 13.3）
   易しくするために数字を甘くするのではなく、
   他家の動きの速さと厳しさを変える。こちらの兵や石高には手を加えない。 */
export const LEVELS = {
  易: {
    name: "易", desc: "他家は伸びが遅く、攻めも慎重。まず仕組みを覚えたいときに。",
    aiGrow: 0.6,        // 他家の内政の効き
    aiEager: 0.7,       // 他家が攻めに出る頻度
    aiNeed: 1.35,       // 攻めに要する兵力の比
    aiPlot: 0.5,        // 他家の調略の頻度
    reliefP: 1.25,      // こちらへの後詰の来やすさ
    tribute: 1.2,       // こちらの収入
  },
  普通: {
    name: "普通", desc: "この時代のありようをそのまま。",
    aiGrow: 1, aiEager: 1, aiNeed: 1.05, aiPlot: 1, reliefP: 1, tribute: 1,
  },
  難: {
    name: "難", desc: "他家は速やかに国を富ませ、隙あらば攻め寄せる。謀も絶えぬ。",
    aiGrow: 1.5, aiEager: 1.4, aiNeed: 0.85, aiPlot: 1.8, reliefP: 0.8, tribute: 0.88,
  },
};

export const lv = (s) => LEVELS[s.level || "普通"];


/* --------------------------------------------- 来月の見通し（GDD 4.1）
   月次報告に数字が並ぶだけでは判断ができない。
   何が入り、何が出て、兵糧はいつ尽きるのかを先に示す。 */
export function forecast(s, fid) {
  const f = s.factions[fid];
  const mine = s.castles.filter((c) => c.faction === fid);
  const up = MOB_POLICY[f.mobilization].upkeep;
  const nextMonth = s.month === 12 ? 1 : s.month + 1;
  const harvest = [9, 10, 11].includes(nextMonth) ? 3 : 1;
  let inGold = 0, outGold = 0, inFood = 0, outFood = 0, troops = 0, food = 0;
  for (const c of mine) {
    const ret = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive)
      .reduce((a, x) => a + x.retinue, 0);
    const t = c.local + ret;
    troops += t; food += c.food;
    inGold += c.comm * 4 + c.koku * 0.003;
    outGold += t * 0.075 * up;
    inFood += Math.round((c.koku / 12) * 0.5 * harvest * (c.min / 80));
    outFood += Math.round(t * 0.08 * up);
  }
  for (const a of s.armies.filter((x) => x.faction === fid)) {
    troops += a.men;
    outFood += Math.round(a.men * 0.09);
  }
  const g = specialBonus(s, fid, "gold") - specialBonus(s, fid, "upkeep");
  inGold += Math.max(0, g); outGold += Math.max(0, -g);
  const netFood = inFood - outFood;
  // 兵糧が尽きるまでの月数。収穫の多い月とそうでない月を織り込んで概算する。
  let left = null;
  if (netFood < 0) {
    let sim = food, m = 0, mo = s.month;
    while (sim > 0 && m < 120) {
      mo = mo === 12 ? 1 : mo + 1;
      const h = [9, 10, 11].includes(mo) ? 3 : 1;
      let gain = 0, loss = 0;
      for (const c of mine) {
        const ret = s.generals.filter((x) => x.at === c.id && x.faction === fid && !x.captive)
          .reduce((a, x) => a + x.retinue, 0);
        gain += Math.round((c.koku / 12) * 0.5 * h * (c.min / 80));
        loss += Math.round((c.local + ret) * 0.08 * up);
      }
      for (const a of s.armies.filter((x) => x.faction === fid)) loss += Math.round(a.men * 0.09);
      sim += gain - loss; m++;
    }
    left = m >= 120 ? null : m;
  }
  return {
    inGold: Math.round(inGold), outGold: Math.round(outGold), netGold: Math.round(inGold - outGold),
    inFood, outFood, netFood, gold: f.gold, food, troops, months: left, harvest: harvest > 1,
  };
}


export const relOf = (g, a, b) => g.relations[relKey(a, b)] || { trust: 45, state: "中立", until: null };

export const atPeace = (g, a, b) => { const r = relOf(g, a, b); return r.state === "不可侵" || r.state === "同盟" || r.state === "臣従" || r.state === "従属"; };

/* その家はまだ在るか（GDD 12.4）。

   家を滅ぼしても、勢力の記録そのもの（名・色・金）は盤に残る。戦国記や捕虜の
   「旧主」の名を出すのに要るからである。残っているだけで、家として立ってはいない。

   これを見ずに金だけを見ていたため、滅んだ家から身代金の申し出が来ていた。
   城を失えば年貢も兵糧も入らぬのに、金二千六百貫を抱えたまま使者を寄越す形である。
   拠るべき城が一つも無ければ、その家はもう無い。 */
export const houseAlive = (g, fid) => !!fid && !!g.factions[fid]
  && g.castles.some((c) => c.faction === fid);

export const intelFresh = (g, castleId) => {
  const i = g.intel[castleId];
  return !!i && monthsBetween(i.y, i.m, g.year, g.month) <= 12;
};

export const specialBonus = (g, fid, key) => {
  let v = 0;
  for (const t of TOWNS) {
    const st = g.specials[t.id];
    if (!st || st.faction !== fid) continue;
    const o = (SPECIAL_OPTIONS[t.kind] || []).find((x) => x.key === st.state);
    if (o && o[key]) v += o[key];
  }
  return v;
};

// 敵城の内情は、偵察するか忍びを味方につけない限り分からない（GDD 11.2 / 13.2）
export const canSee = (g, c) => c.faction === g.player || intelFresh(g, c.id) || specialBonus(g, g.player, "intel") > 0;

export const hid = (g, c, v, digits) => (canSee(g, c) ? (digits === 0 ? Math.round(v) : fmt(v)) : "？");


/* ------------------------------------------------ 旗の下（GDD 12.1）

   従属・臣従は、関係の記録そのものには上下がない。石高の大きいほうを主とする
   （天下の趨勢を判ずる underBanner と同じ理屈）。

   指図が通るのは「自家」と「臣従の家」だけである。
   臣従は旗の下に完全に入り、独立の望みを捨てた間柄ゆえ、こちらの下知が通る。
   同盟・従属は対等か、あるいは緩やかな結びつきであって、
   どの城からどれだけ兵を出すかまで指図できる立場にない。 */
export const factionKoku = (g, fid) => g.castles.filter((c) => c.faction === fid).reduce((a, c) => a + c.koku, 0);

/* 上下のある間柄で、上に立っているのはどの家か（GDD 12.1）。
   結んだときに r.master へ書き留めてある。古い記録には無いので石高で見当をつける。 */
export function 主家(g, a, b) {
  const r = relOf(g, a, b);
  return masterOf(r, a, b, factionKoku(g, a), factionKoku(g, b));
}

/* その家は自分に臣従しているか。

   かつては「臣従の間柄で、石高の大きいほうが主」と決めていた。
   そのため、膝を屈した相手の石高をこちらが追い越した途端、
   主従がひとりでに裏返っていた。書き留めた向きで判ずる。 */
export function isVassal(g, me, other) {
  if (!me || !other || me === other) return false;
  if (relOf(g, me, other).state !== "臣従") return false;
  return 主家(g, me, other) === me;
}

// 自分がその家の下に立っているか（従属・臣従のいずれでも）
export function 膝を屈している(g, me, other) {
  if (!me || !other || me === other) return false;
  if (!SUBJECT.includes(relOf(g, me, other).state)) return false;
  return 主家(g, me, other) === other;
}

/* ------------------------------------------- 旗の下（GDD 12.2）

   膝を屈するのは、その家にとって一生の決めごとである。二人の主は持てない。
   主を替えるには、いったん旗を翻して（独立して）からでなければならない。

   主に付けば、それまで他家と結んでいた誼は解ける。以後、外交は主のものに従う。
   下にある家が自ら結べるのは不可侵まで（主が敵と見ている家とは結べない）。 */
/* 相手を探すのに、関係の帳面を端から端まで繰ってはいけない。

   関係は家と家の組であるから、家が百十三あれば六千三百二十八本になる。
   一家の主を知りたいだけで、その六千三百二十八本を繰り、いちいち鍵の字を
   区切って（split）突き合わせていた。月送り一回に三百九十一ミリ秒かかって
   いたうち、五割八分がこの走査であった。

   家の数だけ回って、鍵を組み立てて引けばよい。百十三回で済む。
   五十六分の一である。家を増やすと関係は二乗で増えるので、
   ここを直しておかないと、家を足すたびに月送りが重くなる。 */
export function 主を探す(g, fid) {
  for (const other of Object.keys(g.factions || {})) {
    if (other === fid) continue;
    const r = (g.relations || {})[relKey(fid, other)];
    if (!r || !SUBJECT.includes(r.state)) continue;
    if (r.master === fid) continue;                 // 自分が上に立っている
    return other;                                   // 疑わしきは下とみなす
  }
  return null;
}

// その家が旗の下に置いている家々
export const 旗の下の家 = (g, fid) => Object.keys(g.factions || {})
  .filter((other) => {
    if (other === fid) return false;
    const r = (g.relations || {})[relKey(fid, other)];
    return !!r && SUBJECT.includes(r.state) && r.master === fid;
  });

/* 下に付いた家が、それまで結んでいた誼を解く。
   同盟も不可侵も、主の外交に吸い込まれる。縁組の同盟であれば姫は生家へ戻る。 */
export function 旗の下に入る(g, 下, 上, 解いた) {
  for (const k of Object.keys(g.relations)) {
    const 相 = 盟約の相手(k, 下);
    if (!相 || 相 === 上) continue;
    const r = g.relations[k];
    if (!["同盟", "不可侵"].includes(r.state)) continue;
    const 前 = r.state;
    r.state = "中立"; r.until = null;
    if (r.婚姻) {
      const h = (g.hime || []).find((x) => x.id === r.婚姻);
      if (h) { h.嫁 = null; const 城 = g.castles.find((c) => c.faction === h.faction); if (城) h.at = 城.id; }
      r.婚姻 = null;
    }
    if (解いた) 解いた(相, 前);
  }
}

// 指図の通る間柄か（自家、または臣従の家）
export const underMyBanner = (g, me, other) => me === other || isVassal(g, me, other);

// 頼むことはできるが、指図はできない間柄か（同盟・従属）
export function canAskAid(g, me, other) {
  if (!me || !other || me === other) return false;
  const st = relOf(g, me, other).state;
  if (st === "同盟") return true;
  if (SUBJECT.includes(st)) return 主家(g, me, other) !== me;   // 相手が上（下知が来る側）
  return false;
}

/* ------------------------------------------- 援軍として着いた軍か（GDD 7.4）

   援けに行った先で、援けるはずの相手と戦っていた。

   着いた城と戦うか否かを「旗の下か（underMyBanner ＝ 自家か臣従の家）」だけで
   測っていた。同盟はそこに入らない。対等の間柄であって、指図の通る相手ではない
   からである。そのため、同盟国の求めに応じて援軍を出すと、着いた月にその同盟国と
   野戦が始まった。

   かといって「和を結んでいる家の城なら攻めない」とは決められない。不可侵の相手へ
   覚悟のうえで攻めかかる、という筋はあるからである（約束を破る問いを経て出陣する）。
   決め手は着いた先ではなく、出したときの心づもりである。
   援軍として出した軍には助勢の印をつけ、その印を見て判ずる。

   寄騎（敵城を攻める本隊に付ける援軍）にも aid の印はつくが、助勢はつかない。
   本隊とはぐれて単騎で敵城へ着いても、これまで通り攻める。 */
export function 援けに着く(g, army, castle) {
  if (!army || !castle) return false;
  if (army.faction === castle.faction) return true;      // 自家の城
  if (!army.助勢) return false;                          // 攻めるために出た軍
  return atPeace(g, army.faction, castle.faction);
}

/* ------------------------------------------------ 旧い記録を繕う

   かつては味方の城へ向かうときにも「戦役」を起こしていた。戦役は敵城を攻める
   ための仕組みで、着けば軍議が開かれ「攻めかかるか」と問われる。
   その名残が記録に残っていると、直したあとも味方を攻める形が続いてしまう。

   読み込むときに、旗の下の城を狙う戦役を落とす。 */
export function 旗の下を狙う戦役を落とす(s) {
  if (!Array.isArray(s.campaigns)) return s;
  s.campaigns = s.campaigns.filter((c) => {
    const t = s.castles.find((x) => x.id === c.target);
    if (!t) return false;                       // 城そのものが無い戦役も落とす
    return !underMyBanner(s, c.faction || s.player, t.faction);
  });
  return s;
}

// 記録を読むときの繕い一式
/* ------------------------------------------ 古い記録に残った申し送りを繕う

   仕組みを直しても、直す前の記録に書き込まれてしまったものまでは戻らない。
   遊びの途中で直しが入るのだから、読み込むときに繕っておく。
   ここで落とすのは「もう成り立たない申し送り」だけで、遊んだ跡は触らない。 */
export function 立たぬ申し送りを落とす(s) {
  // 一、滅んだ家からの身代金の申し出。受けても取り立てようがない。
  if (s.ransomOffer) {
    const q = (s.generals || []).find((x) => x.id === s.ransomOffer.genId);
    if (!q || !q.captive || !houseAlive(s, s.ransomOffer.from)) s.ransomOffer = null;
  }
  // 二、捕虜の処遇を問う列。すでに捕虜でない者、盤にいない者は落とす。
  if (Array.isArray(s.captives)) {
    s.captives = s.captives.filter((id) => {
      const q = (s.generals || []).find((x) => x.id === id);
      return !!q && !!q.captive;
    });
  }
  // 三、負の知行。加増が没収に化ける不具合で、負を抱えた記録が残っている。
  for (const q of s.generals || []) {
    if (typeof q.fief === "number" && q.fief < 0) q.fief = 0;
  }
  // 四、滅亡の始末を問う列。討死などで盤を去った者は飛ばす。
  if (s.warSettle && Array.isArray(s.warSettle.queue)) {
    const 残り = s.warSettle.queue.filter((id) => (s.generals || []).some((x) => x.id === id));
    s.warSettle = 残り.length ? { ...s.warSettle, queue: 残り } : null;
  }
  /* 五、上下のある盟約に、どちらが上かを書き入れる。
     かつては書き留めず、そのときどきの石高で上下を決めていた。読み込むときに、
     いまの石高で見当をつけて書き留める。以後は石高が動いても向きは変わらない。 */
  for (const k of Object.keys(s.relations || {})) {
    const r = s.relations[k];
    if (!r || !SUBJECT.includes(r.state) || r.master) continue;
    const [a1, b1] = k.split("|");
    const koku = (fid) => (s.castles || []).filter((c) => c.faction === fid).reduce((t, c) => t + c.koku, 0);
    r.master = koku(a1) >= koku(b1) ? a1 : b1;
  }
  /* 六、道中の援軍に助勢の印をつける。
     印を見て「攻めるか援けるか」を判ずるようにしたが、直す前に出した軍には
     印がない。そのまま着けば、援けに行った先で同盟国と戦うことになる。
     いま道中にある軍のうち、援軍として出され（aid）、向かう先が和を結んでいる
     家の城であるものに、遡って印をつける。 */
  for (const a of s.armies || []) {
    if (a.助勢 != null || a.aid == null) continue;
    const 的 = (s.castles || []).find((x) => x.id === a.target);
    if (!的) continue;
    if (的.faction !== a.faction && atPeace(s, a.faction, 的.faction)) a.助勢 = true;
  }
  return s;
}

/* 石高の三段を、古い記録にも与える（GDD 4.6）。

   田畑可能地・慶長の高・元禄の高は盤を立てるときに据えている。ところが
   記録から読み込んだ盤には、書き込まれた当時の値がそのまま入っている。
   繕わなければ、続きから遊ぶ限り、田畑可能地は石高の一.一二五倍のまま、
   慶長の高は田畑可能地と同じままで、治水は永久に空打ちになる。
   遊ぶ側からは「直したはずのものが直っていない」と映る。

   三段は「天文十五年の把握」を元に決まる。いまの石高ではない。開墾して
   増えたぶんまで元に取ると、開くほど天井が逃げていく。元の高は kokuBase
   （据えたときの田畑可能地＝当時は石高の一.一二五倍）から逆に引く。

   いずれも max を取る。すでに開いた田を、繕いで取り上げてはならない。 */
function 石高の三段を繕う(s) {
  for (const c of s.castles || []) {
    const 元 = c.kokuBase ? Math.round(c.kokuBase / 1.125) : c.koku;
    c.kokuMax = Math.max(c.kokuMax || 0, Math.round(元 * 1.25), c.koku);
    c.kokuCap = Math.max(c.kokuCap || 0, Math.round(元 * 1.478), c.kokuMax);
    c.kokuGen = Math.max(c.kokuGen || 0, Math.round(元 * 2.051), c.kokuCap);
  }
}

// 軍役の器を、古い記録の武将にも与える（いま抱えている手勢がそのまま器になる）
function 軍役の器を繕う(s) {
  for (const g of s.generals || []) if (g.retCap == null) g.retCap = g.retinue;
}

export function migrateSave(s) {
  // 卓の印の無い古い記録には、いま与える（以後、置き場が守れるようになる）
  if (!s.卓) s.卓 = `t${(s.player || "x")}${s.year || 0}-旧`;
  石高の三段を繕う(s);
  軍役の器を繕う(s);
  migrateRosters(s);
  旗の下を狙う戦役を落とす(s);
  立たぬ申し送りを落とす(s);
  // 姫のいない古い記録には、いま立てる（GDD 6.8）
  if (!Array.isArray(s.hime)) { s.hime = []; 姫を整える(s); }
  盤の増補を取り込む(s);                          // 後から足した城・武将・家・特殊勢力
  本領と本拠を繕う(s);
  本拠を追う(s);                                  // 当主のいる城へ本拠を合わせ直す
  役の名を改める(s);                              // 家老→国主・宿老→旗頭（GDD 6.4）
  国主を据える(s);                                // 役の欄の無い古い記録に国主を据える
  将の無い軍を繕う(s);                            // 兵だけ残って浮いていた軍を解く
  return s;
}

/* 将のいない軍を、読み込みのときにも繕う（GDD 6.4）。

   城を委ねるときに将を残らず置くと、地の兵だけの軍が在陣し続けていた。
   落とし穴は塞いだが、すでにできてしまった軍は記録の中に残っている。
   兵は失わせない――出陣元（無ければ足下の城）へ返す。 */
export function 将の無い軍を繕う(s) {
  for (const a of [...(s.armies || [])]) {
    if ((a.gens || []).length) continue;
    const 元 = s.castles.find((c) => c.id === a.from && c.faction === a.faction)
      || s.castles.find((c) => c.id === a.at && c.faction === a.faction)
      || s.castles.find((c) => c.faction === a.faction);
    if (元) {
      元.local = (元.local || 0) + Math.max(0, a.local || 0);
      if (a.rost && a.rost.length) 元.rost = [...(元.rost || []), ...a.rost];
    }
    s.armies = s.armies.filter((x) => x.id !== a.id);
    s.sieges = (s.sieges || []).filter((x) => x.armyId !== a.id);
    s.pendingArrivals = (s.pendingArrivals || []).filter((id) => id !== a.id);
    s.campaigns = (s.campaigns || []).map((c) => ({ ...c,
      armies: (c.armies || []).filter((id) => id !== a.id),
      arrived: (c.arrived || []).filter((id) => id !== a.id) })).filter((c) => c.armies.length);
  }
  return s;
}

/* 盤の増補を、古い記録へ取り込む（GDD 15.3）。

   盤は育っている。二百四十九城・八百十二将で始めたものが、いまは
   二百七十一城・九百七十二将になった。ところが記録は盤の写しを丸ごと抱えて
   いるので、古い記録を読んでも増補は入ってこない。出羽も佐渡も蝦夷も琉球も、
   その盤には無いままである。

   道はそうではない。街道と地点（paths.js の NODES）は常に最新の城で組まれる
   ので、記録の側にだけ城が無い、という食い違いが起きる。いまのところ実害は
   出ていないが（六十城どうしを検めて、盤に無い城を経由する道は零本）、
   放っておく筋のものではない。

   足し方は「史実の持ち主のまま足す」。増補で立てた家は、古い記録には家ごと
   存在しないので、滅んだ家を勝手に復活させることにはならない。

     出羽　最上・天童・大宝寺・小野寺・安東
     佐渡　本間　　蝦夷　蠣崎とアイヌ三家　　琉球　琉球王国

   もし本来の持ち主が既に滅んでいれば、その城は誰の物でもない――が、盤には
   持ち主の無い城という形が無いので、そのときは足さない。滅んだ家を復活
   させるよりは、盤に出ないほうが害が少ない。 */
/* 足す城と武将を、盤を立てるときと同じ形にこしらえる。
   欄の一つでも欠ければ、そこから静かに壊れていく。 */
function 新しい城(c) {
  const 城 = 馬と鉄砲を配る(assignKokuCap([{
    ...c, x: px(c.lon), y: py(c.lat),
    najimi: 70,
    rost: newRoster(c.local, `loc-${c.id}`),
    kokuBase: Math.round(c.koku * 1.25),
    kokuMax: Math.round(c.koku * 1.25),
    kokuCap: Math.round(c.koku * 1.478),
    kokuGen: Math.round(c.koku * 2.051),
    well: 100,
    lordId: null, intrigue: false,
  }]))[0];
  return 城;
}

function 新しい将(g) {
  return {
    ...g, unity: clamp(g.retTrain + 8, 30, 100), merit: 0,
    retCap: g.retinue,
    本領: g.at || null,
    fief: Math.round(fiefWanted(g) * 0.9),
    rost: newRoster(g.retinue, `ret-${g.id}`, 直属の兵科),
  };
}

export function 盤の増補を取り込む(s) {
  if (!Array.isArray(s.castles) || !Array.isArray(s.generals)) return s;
  const 城id = new Set(s.castles.map((c) => c.id));
  const 生きている家 = (fid) => !!(s.factions || {})[fid]
    && (s.castles.some((c) => c.faction === fid)
      || s.generals.some((g) => g.faction === fid && !g.captive));

  // 一、家。増補で立てた家がなければ加える
  for (const fid of Object.keys(FACTIONS)) {
    if (!s.factions[fid]) s.factions[fid] = { ...JSON.parse(JSON.stringify(FACTIONS[fid])), prestige: 50 };
  }

  // 二、城。史実の持ち主が盤にいる（＝増補で立てた家）ものだけを足す
  const 足した城 = [];
  for (const c of CASTLES) {
    if (城id.has(c.id)) continue;
    // その家が古い記録で既に滅んでいるなら足さない（復活させない）
    const 増補の家 = !s.castles.some((x) => x.faction === c.faction)
      && !s.generals.some((g) => g.faction === c.faction);
    if (!増補の家 && !生きている家(c.faction)) continue;
    s.castles.push(新しい城(c));
    城id.add(c.id);
    足した城.push(c);
  }

  /* 三、武将。増補で足した者を加える。

     はじめ「足した城に居る者だけ」としていたが、それでは足りなかった。
     武将の増補は城の増補とは別に進んでいて、既にある城へ人を足したものが
     百十九名あった（島津忠将、肝付兼演……）。城が盤にあるなら、その者も
     盤に居るべきである。

     置く先は、その城がまだその家のものである場合に限る。他家に落ちた城へ
     昔の家臣を湧かせては、盤の理が崩れる。

     居場所の無い者（後年に世に出る者）は加えない。時が来れば出てくる。 */
  const 将id = new Set(s.generals.map((g) => g.id));
  let 足した将 = 0;
  for (const g of GENERALS) {
    if (将id.has(g.id)) continue;
    if (!g.at || !城id.has(g.at)) continue;                 // 居場所の無い者は加えない
    const 城 = s.castles.find((c) => c.id === g.at);
    if (!城 || 城.faction !== g.faction) continue;           // 主が変わった城には湧かせない
    s.generals.push(新しい将(g));
    将id.add(g.id);
    足した将++;
  }

  // 四、特殊勢力。増補で足したものを加える
  if (Array.isArray(s.specials)) {
    const 印 = new Set(s.specials.map((x) => x.id));
    for (const t of TOWNS) if (!印.has(t.id)) s.specials.push({ id: t.id, tie: null, 家: null, 月: 0 });
  }

  // 五、間柄。足した家との間柄が無ければ中立で結ぶ
  if (s.relations) {
    const ids = Object.keys(s.factions);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const k = relKey(ids[i], ids[j]);
      if (!s.relations[k]) s.relations[k] = { trust: 45, state: "中立", until: null };
    }
  }

  if (足した城.length) {
    s.chronicle = s.chronicle || [];
    s.chronicle.push({ y: s.year, m: s.month,
      text: `盤が広がった。${[...new Set(足した城.map((c) => c.kuni))].join("・")}の`
        + `${足した城.length}城と${足した将}人の武将が加わった。` });
  }
  return s;
}

/* 国ごとに家老（旗頭）を一人据える（GDD 6.4）。

   家老は禄高で決まる階級ではなく、大名が任じる役である。家が城を持つ国に
   つき一人まで置ける。盤を立てるときは、その国でいちばん身代の重い者を
   据えておく。以後は遊ぶ側（と采配）が任じ直す。

   古い記録にも同じ繕いをする。役の欄が無いままでは、家老が一人もいない
   家ばかりになってしまう。 */
export function 国主を据える(s) {
  for (const fid of Object.keys(s.factions || {})) {
    const 国 = [...new Set(s.castles.filter((c) => c.faction === fid).map((c) => c.kuni))];
    for (const kuni of 国) {
      if (s.generals.some((g) => g.faction === fid && g.役 === "国主" && g.役国 === kuni)) continue;
      /* 国主となれるのは家老（禄高八千石）以上である（GDD 6.4）。
         役は身分あってのものなので、その国に家老以上が居らねば国主は置かない。 */
      const 候 = s.generals.filter((g) => g.faction === fid && !g.captive && !g.lord
        && 身分の位(g, s) >= 役の要る身分.国主
        && (s.castles.find((c) => c.id === (g.本領 || g.at)) || {}).kuni === kuni);
      if (!候.length) continue;
      const 主 = [...候].sort((a, b) => stipendOf(s, b) - stipendOf(s, a))[0];
      主.役 = "国主"; 主.役国 = kuni;
    }
  }
  return s;
}

/* 役の名を改める（GDD 6.4）。

   身分と役を分けたので、役の名も改めた。

     もとの「家老（＝一国の旗頭）」 → 国主
     もとの「宿老（＝方面軍）」     → 旗頭

   身分のほう（物頭・侍大将・家老・宿老）は禄高で定まる格として残る。
   古い記録には古い名で書き留められているので、読み込みのときに直す。 */
export function 役の名を改める(s) {
  for (const g of s.generals || []) {
    if (g.役 === "家老") g.役 = "国主";
    else if (g.役 === "宿老") g.役 = "旗頭";
  }
  return s;
}

/* 本拠は当主のいる城を追う（GDD 6.4）。

   本拠は家の本城であり、陣触れはここから出る。決まりは初めから「当主のいる城」
   であったが、盤を組むときに一度定めるきりで、当主が移っても追いかけていなかった。
   稲葉山城に当主がいるのに、陣触れを開くと観音寺城が出る――という形で表れた。

   当主が陣中にある（軍に加わっていて城にいない）ときは動かさない。陣に本拠は
   無い。当主が居らぬ家、あるいは本拠を失った家は、石高のいちばん高い城とする。 */
export function 本拠を追う(s) {
  for (const fid of Object.keys(s.factions || {})) {
    const f = s.factions[fid];
    const 我 = (s.castles || []).filter((c) => c.faction === fid);
    if (!我.length) { f.本拠 = null; continue; }
    const 主 = (s.generals || []).find((x) => x.faction === fid && x.lord && !x.captive && x.at);
    if (主 && 我.some((c) => c.id === 主.at)) { f.本拠 = 主.at; continue; }
    // 当主が陣中にあるか、他家の城にいる。いまの本拠が自領なら、そのまま据え置く
    if (f.本拠 && 我.some((c) => c.id === f.本拠)) continue;
    f.本拠 = [...我].sort((a, b) => b.koku - a.koku)[0].id;
  }
  return s;
}

/* 本領と本拠の無い古い記録を繕う（GDD 6.4）。

   本領はいま居る城とする。出陣中の者は、行き先ではなく出陣元を本領とする
   （出た先に根があるわけではない）。それも分からねば、家の本拠に置く。
   本拠は当主のいる城、居らねば石高のいちばん高い城。

   繕いは「無いものを埋める」だけにする。すでに本領のある者には触れない。 */
export function 本領と本拠を繕う(s) {
  for (const fid of Object.keys(s.factions || {})) {
    const f = s.factions[fid];
    if (f.本拠 && s.castles.some((c) => c.id === f.本拠 && c.faction === fid)) continue;
    const 主 = s.generals.find((x) => x.faction === fid && x.lord && x.at);
    const 我 = s.castles.filter((c) => c.faction === fid);
    f.本拠 = (主 && 我.some((c) => c.id === 主.at)) ? 主.at
      : (我.length ? [...我].sort((a, b) => b.koku - a.koku)[0].id : null);
  }
  // 出陣中の者の出どころ。軍の from を本領とみなす
  const 出どころ = {};
  for (const a of s.armies || []) for (const gid of a.gens || []) 出どころ[gid] = a.from;
  for (const g of s.generals) {
    if (g.本領 && s.castles.some((c) => c.id === g.本領)) continue;
    g.本領 = g.at || 出どころ[g.id] || (s.factions[g.faction] || {}).本拠 || null;
  }
  return s;
}

/* ------------------------------------------------ 軍の道（GDD 7.1）

   兵を出すとき、他家の領を素通りしてはならない。通ってよいのは、
   自家の城と、旗の下・同盟の城だけである。目当ての城そのものは通れずとも
   よい――そこへ攻め入るのだから。

   この掟は遊ぶ側の画面（MapScreen の 出陣の道、panels の出陣先選び）には
   入っていたが、他家の采配には入っていなかった。他家は findPath を素で
   使い、いちばん安い道を辿っていた。

   そのため、来島村上が伊予の国分山城から、河野の川之江城を素通りして
   土佐の岡豊城へ攻め込む、ということが起きた。地図の上では道が繋がって
   いるが、途中は他家の領である。遊ぶ側から見れば「見えない街道がある」
   としか映らない。

   通れる道が無ければ null を返す。素の道へ落として繕ったりはしない。
   落とせば、この掟は無いのと同じである。 */
/* 通ってよいのは、自家の領と、自分の旗の下にある家の領だけである。

   上下は一方通行である。従えている側は、従えた家の領を兵が通る。断れる
   道理がない。逆に、従っている側が主家の領を勝手に通り抜けて、その先の
   家へ攻め入ることはできない。主家がそれを許すはずがない。

   同盟と不可侵は、通行を許さない。誼を通じることと、領内を軍が抜ける
   ことは別である。同盟の領を素通りできてしまうと、同盟を結んだ相手の
   隣家が、いきなり遠くの家に攻められることになる。 */
export const 旗の下か = (g, 上, 下) => {
  if (!上 || !下) return false;
  if (上 === 下) return true;
  const r = (g.relations || {})[relKey(上, 下)];
  return !!r && SUBJECT.includes(r.state) && r.master === 上;
};

// 道を借りているか（借道）。向きがある。借りた側だけが通れる。
export const 道を借りている = (s, fid, 相) => {
  const 期 = (s.借道 || {})[`${fid}>${相}`];
  if (!期) return false;
  return s.year < 期.y || (s.year === 期.y && s.month <= 期.m);
};

export const 通れる城 = (s, fid) => (id) => {
  const mid = s.castles.find((y) => y.id === id);
  if (!mid) return true;                       // 城でない中継（湊・宿）は通れる
  return 旗の下か(s, fid, mid.faction) || 道を借りている(s, fid, mid.faction);
};

/* 水軍の家は、山を越えて攻めない（GDD 10章）。

   来島村上が伊予の島から四国山地を越えて土佐の岡豊城を囲む、ということが
   起きた。旗の下の掟には適っていたが、絵として成り立たない。船で立つ家は
   船で戦う。街道と海路は通るが、山道と難所は通らない。 */
export const 水軍の家 = (s, fid) => !!(s.factions[fid] || {}).水軍;
const 山越えの道 = new Set(["山道", "難所"]);

export function 軍の道(s, fid, from, to) {
  if (from === to) return [from];
  const 道の可否 = 水軍の家(s, fid) ? (r) => !r || !山越えの道.has(r[3]) : null;
  return findPathVia(from, to, 通れる城(s, fid), 道の可否);
}
