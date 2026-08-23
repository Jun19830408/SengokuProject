/* ------------------------------------------------- 姫（GDD 6.8）

   大名家には姫がいる。戦場には出ない。武将としては数えない。
   けれども、家と家を結ぶのは多く姫の縁である。

   ここに並べるのは名の伝わる姫たちである。生年は諸説あるものがまじる。
   十五になった年に世に出る（それまでは館の奥にいる）。

   値は二つだけである。
     外交 … 縁を結ぶ力。輿入れの談判、使者としての振舞い
     統率 … 家中を束ねる力。城を預かれば守備隊の統率に映る

   身分の高い家の姫ほど外交が高い。武家の女に生まれ、家を支えた者は統率が高い。 */
export const HIME = [
  // ---- 東海・畿内
  { id: "h_kicho", name: "帰蝶", faction: "saito", born: 1535, at: "inabayama",
    dip: 78, lead: 62, 伝: "斎藤道三の娘。のち織田信長の正室" },
  { id: "h_oichi", name: "お市", faction: "oda", born: 1547, at: "nagoya",
    dip: 84, lead: 66, 伝: "織田信秀の娘。戦国一の美貌と伝わる" },
  { id: "h_oinu", name: "お犬", faction: "oda", born: 1549, at: "nagoya",
    dip: 70, lead: 54, 伝: "織田信秀の娘" },
  { id: "h_reishoin", name: "嶺松院", faction: "imagawa", born: 1543, at: "sunpu",
    dip: 74, lead: 56, 伝: "今川義元の娘。武田義信に嫁ぐ" },
  { id: "h_hayakawa", name: "早川殿", faction: "hojo", born: 1547, at: "nirayama",
    dip: 76, lead: 60, 伝: "北条氏康の娘。今川氏真の正室" },
  { id: "h_kamehime", name: "亀姫", faction: "matsudaira", born: 1560, at: "okazaki",
    dip: 72, lead: 64, 伝: "徳川家康の娘。奥平信昌に嫁ぐ" },
  { id: "h_tokuhime", name: "督姫", faction: "matsudaira", born: 1565, at: "okazaki",
    dip: 74, lead: 58, 伝: "徳川家康の娘。北条氏直の正室" },
  { id: "h_chacha", name: "茶々", faction: "azai", born: 1569, at: "odani",
    dip: 80, lead: 74, 伝: "浅井長政とお市の娘。のちの淀殿" },
  { id: "h_hatsu", name: "初", faction: "azai", born: 1570, at: "odani",
    dip: 82, lead: 66, 伝: "浅井長政の娘。京極高次の正室。家を二度救う" },
  { id: "h_go", name: "江", faction: "azai", born: 1573, at: "odani",
    dip: 78, lead: 70, 伝: "浅井長政の娘。三度の輿入れを経て将軍の母となる" },

  // ---- 甲信越
  { id: "h_obaiin", name: "黄梅院", faction: "takeda", born: 1543, at: "tsutsujigasaki",
    dip: 76, lead: 58, 伝: "武田信玄の娘。北条氏政の正室" },
  { id: "h_kenshoin", name: "見性院", faction: "takeda", born: 1545, at: "tsutsujigasaki",
    dip: 66, lead: 72, 伝: "武田信玄の娘。穴山信君の正室" },
  { id: "h_kikuhime", name: "菊姫", faction: "takeda", born: 1558, at: "tsutsujigasaki",
    dip: 74, lead: 62, 伝: "武田信玄の娘。上杉景勝の正室" },
  { id: "h_matsuhime", name: "松姫", faction: "takeda", born: 1561, at: "tsutsujigasaki",
    dip: 68, lead: 60, 伝: "武田信玄の娘。織田信忠と婚約するも果たさず" },
  { id: "h_ayagozen", name: "綾御前", faction: "nagao", born: 1524, at: "kasugayama",
    dip: 70, lead: 82, 伝: "長尾為景の娘。景虎の姉。家を束ねた" },

  // ---- 中国・四国
  { id: "h_goryu", name: "五龍局", faction: "mori", born: 1529, at: "koriyama_a",
    dip: 72, lead: 76, 伝: "毛利元就の娘。宍戸隆家の正室。両家を結ぶ" },
  { id: "h_ouchi_h", name: "小少将", faction: "ouchi", born: 1531, at: "yamaguchi",
    dip: 74, lead: 48, 伝: "大内家の姫。西国一の富家に育つ" },
  { id: "h_amago_h", name: "亀井の方", faction: "amago", born: 1533, at: "gassan",
    dip: 62, lead: 68, 伝: "尼子の姫。山陰の峻険に育つ" },
  { id: "h_ako", name: "阿古姫", faction: "chosokabe", born: 1560, at: "okou",
    dip: 64, lead: 70, 伝: "長宗我部元親の娘" },

  // ---- 九州
  { id: "h_ginchiyo", name: "誾千代", faction: "otomo", born: 1569, at: "funai",
    dip: 58, lead: 88, 伝: "立花道雪の娘。七歳で城督を継ぎ、女ながら兵を率いた" },
  { id: "h_otomo_h", name: "桂姫", faction: "otomo", born: 1552, at: "funai",
    dip: 76, lead: 54, 伝: "大友義鎮の娘" },
  { id: "h_kamejyu", name: "亀寿", faction: "shimazu", born: 1571, at: "uchijo",
    dip: 70, lead: 66, 伝: "島津義久の娘。島津の家督を繋ぐ" },
  { id: "h_ryuzoji_h", name: "阿安", faction: "ryuzoji", born: 1548, at: "saga",
    dip: 64, lead: 72, 伝: "龍造寺の姫" },

  // ---- 奥羽・関東
  { id: "h_yoshihime", name: "義姫", faction: "mogami", born: 1548, at: "yamagata",
    dip: 72, lead: 84, 伝: "最上義守の娘。伊達輝宗に嫁ぎ、戦場に輿を進めて兄と夫を止めた" },
  { id: "h_hikohime", name: "彦姫", faction: "date", born: 1541, at: "yonezawa",
    dip: 70, lead: 62, 伝: "伊達晴宗の娘。相馬盛胤の正室" },
  { id: "h_anahime", name: "阿南姫", faction: "date", born: 1541, at: "yonezawa",
    dip: 66, lead: 78, 伝: "伊達晴宗の娘。二階堂を女の身で守り抜いた" },
  { id: "h_megohime", name: "愛姫", faction: "tamura", born: 1568, at: "miharu",
    dip: 80, lead: 68, 伝: "田村清顕の娘。伊達政宗の正室" },
  { id: "h_kaihime", name: "甲斐姫", faction: "narita", born: 1572, at: "oshi",
    dip: 54, lead: 86, 伝: "成田氏長の娘。忍城に拠り、寄せ手を退けたと伝わる" },
  { id: "h_satake_h", name: "宝寿院", faction: "satake", born: 1545, at: "ota_hitachi",
    dip: 68, lead: 64, 伝: "佐竹の姫" },
  { id: "h_satomi_h", name: "種姫", faction: "satomi", born: 1550, at: "tateyama",
    dip: 66, lead: 60, 伝: "里見の姫。安房の海を望んで育つ" },
];

/* 名の伝わらぬ姫。石高に応じて家ごとに生まれる（GDD 6.8）。
   一字の名に「姫」を添えるのは、後の世の呼び方に倣ったものである。 */
export const HIME_NAMES = [
  "鶴", "亀", "松", "竹", "梅", "菊", "桜", "藤", "楓", "桐",
  "萩", "椿", "葵", "雪", "霞", "汐", "凪", "蘭", "咲", "幸",
  "静", "玉", "千代", "佐和", "志乃", "小夜", "弥生", "早苗", "加代", "綾",
];
