

/* --------------------------------------------- 世に出る武将（GDD 6.1）
   家は代を重ねる。年を経れば、若い者が世に出て仕える。
   織田家に木下藤吉郎や明智光秀が現れるのは、この仕組みによる。 */
export const NEWCOMERS = [
  { id: "nagahide", name: "丹羽長秀", faction: "oda", y: 1550, at: "nagoya",
    lead: 82, valor: 74, wit: 80, gov: 90, retinue: 180, retTrain: 64, born: 1535 },
  { id: "toshiie", name: "前田利家", faction: "oda", y: 1551, at: "nagoya",
    lead: 78, valor: 90, wit: 56, gov: 60, retinue: 140, retTrain: 68, born: 1538 },
  { id: "tsuneoki", name: "池田恒興", faction: "oda", y: 1552, at: "nagoya",
    lead: 74, valor: 80, wit: 62, gov: 64, retinue: 160, retTrain: 64, born: 1536 },
  { id: "nagamasa2", name: "佐々成政", faction: "oda", y: 1553, at: "shobata",
    lead: 76, valor: 86, wit: 62, gov: 58, retinue: 150, retTrain: 68, born: 1536 },
  { id: "hideyoshi", name: "木下藤吉郎", faction: "oda", y: 1554, at: "nagoya",
    lead: 88, valor: 66, wit: 96, gov: 97, retinue: 120, retTrain: 58, born: 1537 },
  { id: "kazumasu", name: "滝川一益", faction: "oda", y: 1555, at: "shobata",
    lead: 84, valor: 78, wit: 84, gov: 74, retinue: 200, retTrain: 66, born: 1525 },
  { id: "mitsuhide", name: "明智光秀", faction: "oda", y: 1566, at: "nagoya",
    lead: 90, valor: 72, wit: 94, gov: 90, retinue: 200, retTrain: 66, born: 1528 },
  { id: "hanbei", name: "竹中半兵衛", faction: "saito", y: 1558, at: "sunomata",
    lead: 82, valor: 46, wit: 97, gov: 82, retinue: 120, retTrain: 60, born: 1544 },
  { id: "toshiharu", name: "斎藤利治", faction: "saito", y: 1557, at: "inabayama",
    lead: 72, valor: 74, wit: 66, gov: 62, retinue: 180, retTrain: 66, born: 1541 },
  { id: "ieyasu", name: "松平元康", faction: "matsudaira", y: 1557, at: "okazaki",
    lead: 92, valor: 74, wit: 92, gov: 96, retinue: 260, retTrain: 70, born: 1543 },
  { id: "tadakatsu", name: "本多忠勝", faction: "matsudaira", y: 1560, at: "okazaki",
    lead: 82, valor: 96, wit: 62, gov: 60, retinue: 180, retTrain: 74, born: 1548 },
  { id: "yasumasa", name: "榊原康政", faction: "matsudaira", y: 1561, at: "okazaki",
    lead: 80, valor: 82, wit: 74, gov: 76, retinue: 170, retTrain: 70, born: 1548 },
  { id: "naomasa", name: "井伊直政", faction: "matsudaira", y: 1575, at: "okazaki",
    lead: 84, valor: 88, wit: 72, gov: 74, retinue: 190, retTrain: 74, born: 1561 },
  { id: "katsuyori", name: "武田勝頼", faction: "takeda", y: 1562, at: "takato",
    lead: 80, valor: 88, wit: 62, gov: 58, retinue: 300, retTrain: 72, born: 1546 },
  { id: "masayuki", name: "真田昌幸", faction: "takeda", y: 1560, at: "komoro",
    lead: 84, valor: 70, wit: 94, gov: 84, retinue: 200, retTrain: 68, born: 1547 },
  { id: "nagamasa", name: "浅井長政", faction: "azai", y: 1560, at: "odani",
    lead: 84, valor: 84, wit: 74, gov: 76, retinue: 300, retTrain: 70, born: 1545 },
  { id: "yoshikage", name: "朝倉義景", faction: "asakura", y: 1553, at: "ichijodani",
    lead: 58, valor: 52, wit: 60, gov: 66, retinue: 400, retTrain: 60, born: 1533 },
  { id: "nagamasa3", name: "蜂須賀正勝", faction: "oda", y: 1556, at: "shobata",
    lead: 76, valor: 74, wit: 82, gov: 70, retinue: 160, retTrain: 64, born: 1526 },
  { id: "hanzo", name: "服部半蔵", faction: "matsudaira", y: 1563, at: "okazaki",
    lead: 68, valor: 80, wit: 84, gov: 52, retinue: 140, retTrain: 70, born: 1542 },
  { id: "kazumasa2", name: "石川数正", faction: "matsudaira", y: 1558, at: "okazaki",
    lead: 76, valor: 68, wit: 80, gov: 82, retinue: 180, retTrain: 66, born: 1533 },
  { id: "tadatsugu2", name: "酒井忠次", faction: "matsudaira", y: 1557, at: "okazaki",
    lead: 84, valor: 78, wit: 80, gov: 76, retinue: 220, retTrain: 70, born: 1527 },
  { id: "nobumori2", name: "森長可", faction: "oda", y: 1572, at: "shobata",
    lead: 76, valor: 92, wit: 56, gov: 52, retinue: 200, retTrain: 74, born: 1558 },
  { id: "ranmaru", name: "森蘭丸", faction: "oda", y: 1578, at: "nagoya",
    lead: 62, valor: 60, wit: 76, gov: 78, retinue: 120, retTrain: 62, born: 1565 },
  { id: "hidenaga", name: "羽柴秀長", faction: "oda", y: 1564, at: "nagoya",
    lead: 82, valor: 68, wit: 84, gov: 90, retinue: 180, retTrain: 66, born: 1540 },
  { id: "kanbei", name: "黒田官兵衛", faction: "oda", y: 1575, at: "nagoya",
    lead: 82, valor: 62, wit: 96, gov: 88, retinue: 160, retTrain: 64, born: 1546 },
  { id: "masamune", name: "真田信綱", faction: "takeda", y: 1558, at: "komoro",
    lead: 76, valor: 84, wit: 66, gov: 60, retinue: 220, retTrain: 70, born: 1537 },
  { id: "katsuyori2", name: "武田信豊", faction: "takeda", y: 1566, at: "fukashi",
    lead: 72, valor: 74, wit: 64, gov: 62, retinue: 240, retTrain: 68, born: 1549 },
  { id: "ujimasa", name: "北条氏政", faction: "hojo", y: 1559, at: "nirayama",
    lead: 70, valor: 66, wit: 70, gov: 76, retinue: 260, retTrain: 66, born: 1538 },
  { id: "nagamasa4", name: "浅井政澄", faction: "azai", y: 1562, at: "odani",
    lead: 66, valor: 70, wit: 60, gov: 58, retinue: 200, retTrain: 64, born: 1540 },
  { id: "kagetoshi2", name: "朝倉景鏡", faction: "asakura", y: 1556, at: "ichijodani",
    lead: 68, valor: 66, wit: 66, gov: 64, retinue: 260, retTrain: 62, born: 1525 },
  { id: "kenshin", name: "上杉政虎", faction: "nagao", y: 1561, at: "kasugayama",
    lead: 97, valor: 90, wit: 86, gov: 80, retinue: 320, retTrain: 78, born: 1530 },
  { id: "kagekatsu", name: "上杉景勝", faction: "nagao", y: 1575, at: "kasugayama",
    lead: 78, valor: 70, wit: 74, gov: 76, retinue: 260, retTrain: 70, born: 1556 },
  { id: "kanetsugu", name: "直江兼続", faction: "nagao", y: 1580, at: "yoita",
    lead: 82, valor: 72, wit: 88, gov: 90, retinue: 200, retTrain: 70, born: 1560 },
  { id: "ujimasa2", name: "北条氏直", faction: "hojo", y: 1575, at: "odawara",
    lead: 70, valor: 66, wit: 70, gov: 74, retinue: 240, retTrain: 68, born: 1562 },
  { id: "mitsuhide2", name: "荒木村重", faction: "miyoshi", y: 1565, at: "itami",
    lead: 76, valor: 74, wit: 74, gov: 66, retinue: 220, retTrain: 66, born: 1535 },
  { id: "terumoto", name: "毛利輝元", faction: "mori", y: 1563, at: "koriyama_a",
    lead: 70, valor: 64, wit: 72, gov: 76, retinue: 300, retTrain: 66, born: 1553 },
  { id: "motoyasu_k", name: "小早川秀包", faction: "kobayakawa", y: 1582, at: "mihara",
    lead: 72, valor: 74, wit: 68, gov: 64, retinue: 200, retTrain: 66, born: 1567 },
  { id: "muneshige", name: "立花宗茂", faction: "otomo", y: 1580, at: "funai",
    lead: 88, valor: 90, wit: 82, gov: 74, retinue: 220, retTrain: 74, born: 1567 },
  { id: "jyoun", name: "高橋紹運", faction: "otomo", y: 1560, at: "iwaya",
    lead: 84, valor: 84, wit: 76, gov: 68, retinue: 280, retTrain: 70, born: 1548 },
  { id: "kanbei_k", name: "黒田孝高", faction: "akamatsu", y: 1562, at: "himeji",
    lead: 82, valor: 62, wit: 96, gov: 88, retinue: 160, retTrain: 64, born: 1546 },
  { id: "nobuchika_c", name: "長宗我部信親", faction: "chosokabe", y: 1580, at: "okou",
    lead: 78, valor: 84, wit: 70, gov: 66, retinue: 200, retTrain: 70, born: 1565 },
  { id: "hidekane", name: "立花直次", faction: "otomo", y: 1575, at: "usuki",
    lead: 74, valor: 76, wit: 70, gov: 66, retinue: 180, retTrain: 66, born: 1560 },
  { id: "masamune_d", name: "伊達政宗", faction: "date", y: 1581, at: "yonezawa",
    lead: 92, valor: 84, wit: 92, gov: 86, retinue: 240, retTrain: 72, born: 1567 },
  { id: "shigezane", name: "伊達成実", faction: "date", y: 1580, at: "shiroishi",
    lead: 82, valor: 88, wit: 72, gov: 66, retinue: 220, retTrain: 72, born: 1568 },
  { id: "naoe_k", name: "本庄顕長", faction: "date", y: 1570, at: "watari",
    lead: 70, valor: 72, wit: 64, gov: 60, retinue: 200, retTrain: 64, born: 1550 },
  { id: "mogami_x", name: "氏家守棟", faction: "mogami", y: 1560, at: "yamagata",
    lead: 70, valor: 64, wit: 80, gov: 76, retinue: 200, retTrain: 60, born: 1534 },
  { id: "n_mitsuharu", name: "明智秀満", faction: "oda", y: 1570, at: "nagoya",
    lead: 76, valor: 80, wit: 72, gov: 66, retinue: 180, retTrain: 66, born: 1536 },
  { id: "n_nagamasa_k", name: "加藤清正", faction: "oda", y: 1578, at: "nagoya",
    lead: 80, valor: 90, wit: 66, gov: 72, retinue: 180, retTrain: 70, born: 1562 },
  { id: "n_masanori", name: "福島正則", faction: "oda", y: 1578, at: "nagoya",
    lead: 76, valor: 90, wit: 58, gov: 58, retinue: 180, retTrain: 70, born: 1561 },
  { id: "n_mitsunari", name: "石田三成", faction: "oda", y: 1580, at: "nagoya",
    lead: 70, valor: 54, wit: 88, gov: 96, retinue: 160, retTrain: 62, born: 1560 },
  { id: "n_yoshitsugu", name: "大谷吉継", faction: "oda", y: 1580, at: "nagoya",
    lead: 78, valor: 66, wit: 88, gov: 88, retinue: 160, retTrain: 64, born: 1559 },
  { id: "n_nagamori", name: "増田長盛", faction: "oda", y: 1578, at: "nagoya",
    lead: 62, valor: 54, wit: 76, gov: 86, retinue: 140, retTrain: 58, born: 1545 },
  { id: "n_ieyasu2", name: "堀秀政", faction: "oda", y: 1572, at: "shobata",
    lead: 78, valor: 72, wit: 80, gov: 84, retinue: 170, retTrain: 66, born: 1553 },
  { id: "n_kazutoyo", name: "山内一豊", faction: "oda", y: 1573, at: "nagoya",
    lead: 70, valor: 72, wit: 68, gov: 76, retinue: 150, retTrain: 64, born: 1545 },
  { id: "n_toshimasa", name: "前田利長", faction: "oda", y: 1578, at: "nagoya",
    lead: 70, valor: 72, wit: 66, gov: 70, retinue: 170, retTrain: 66, born: 1562 },
  { id: "n_hidemasa", name: "蒲生氏郷", faction: "oda", y: 1573, at: "nagoya",
    lead: 84, valor: 84, wit: 80, gov: 84, retinue: 190, retTrain: 70, born: 1556 },
  { id: "n_takatora", name: "藤堂高虎", faction: "oda", y: 1580, at: "nagoya",
    lead: 78, valor: 78, wit: 80, gov: 84, retinue: 170, retTrain: 66, born: 1556 },
  { id: "n_nobutada", name: "織田信忠", faction: "oda", y: 1572, at: "nagoya",
    lead: 76, valor: 74, wit: 70, gov: 72, retinue: 240, retTrain: 68, born: 1557 },
  { id: "n_nobukatsu", name: "織田信雄", faction: "oda", y: 1574, at: "nagoya",
    lead: 56, valor: 58, wit: 54, gov: 58, retinue: 200, retTrain: 62, born: 1558 },
  { id: "n_nobutaka", name: "織田信孝", faction: "oda", y: 1574, at: "shobata",
    lead: 66, valor: 70, wit: 60, gov: 60, retinue: 180, retTrain: 64, born: 1558 },
  { id: "m_tadayo", name: "大久保忠世", faction: "matsudaira", y: 1558, at: "okazaki",
    lead: 74, valor: 78, wit: 70, gov: 66, retinue: 180, retTrain: 68, born: 1532 },
  { id: "m_masanobu", name: "本多正信", faction: "matsudaira", y: 1565, at: "okazaki",
    lead: 62, valor: 50, wit: 92, gov: 88, retinue: 140, retTrain: 58, born: 1538 },
  { id: "m_naomasa2", name: "鳥居元忠", faction: "matsudaira", y: 1558, at: "okazaki",
    lead: 74, valor: 82, wit: 64, gov: 62, retinue: 170, retTrain: 68, born: 1539 },
  { id: "m_yasushige", name: "高力清長", faction: "matsudaira", y: 1557, at: "okazaki",
    lead: 64, valor: 62, wit: 70, gov: 80, retinue: 150, retTrain: 60, born: 1530 },
  { id: "m_hidetada", name: "徳川秀忠", faction: "matsudaira", y: 1595, at: "okazaki",
    lead: 66, valor: 60, wit: 70, gov: 84, retinue: 200, retTrain: 64, born: 1579 },
  { id: "m_tadateru", name: "松平信康", faction: "matsudaira", y: 1573, at: "okazaki",
    lead: 74, valor: 80, wit: 66, gov: 62, retinue: 200, retTrain: 68, born: 1559 },
  { id: "t_nobushige2", name: "一条信龍", faction: "takeda", y: 1556, at: "tsutsujigasaki",
    lead: 70, valor: 74, wit: 64, gov: 60, retinue: 190, retTrain: 64, born: 1539 },
  { id: "t_masakage2", name: "土屋昌続", faction: "takeda", y: 1561, at: "fukashi",
    lead: 72, valor: 76, wit: 68, gov: 62, retinue: 180, retTrain: 66, born: 1545 },
  { id: "n2_kagetora", name: "上杉景虎", faction: "nagao", y: 1570, at: "kasugayama",
    lead: 70, valor: 72, wit: 66, gov: 64, retinue: 200, retTrain: 66, born: 1554 },
  { id: "n2_shigeie", name: "新発田重家", faction: "agakita", y: 1563, at: "shibata",
    lead: 74, valor: 80, wit: 66, gov: 58, retinue: 200, retTrain: 66, born: 1547 },
  { id: "h2_ujikuni2", name: "北条氏忠", faction: "hojo", y: 1571, at: "odawara",
    lead: 66, valor: 68, wit: 64, gov: 62, retinue: 180, retTrain: 64, born: 1555 },
  { id: "h2_ujifusa", name: "北条氏房", faction: "hojo", y: 1581, at: "iwatsuki",
    lead: 66, valor: 68, wit: 64, gov: 62, retinue: 170, retTrain: 64, born: 1565 },
  { id: "mo_motoharu2", name: "吉川元長", faction: "mori", y: 1564, at: "sakurao",
    lead: 74, valor: 74, wit: 70, gov: 66, retinue: 200, retTrain: 66, born: 1548 },
  { id: "mo_takakage2", name: "小早川繁平", faction: "kobayakawa", y: 1576, at: "mihara",
    lead: 64, valor: 64, wit: 62, gov: 64, retinue: 180, retTrain: 62, born: 1560 },
  { id: "mo_hiroie", name: "吉川広家", faction: "mori", y: 1577, at: "sakurao",
    lead: 72, valor: 70, wit: 76, gov: 74, retinue: 190, retTrain: 66, born: 1561 },
  { id: "uk_naoie2", name: "宇喜多秀家", faction: "uragami", y: 1588, at: "ishiyama_bz",
    lead: 72, valor: 72, wit: 70, gov: 72, retinue: 200, retTrain: 66, born: 1572 },
  { id: "am_katsuhisa", name: "尼子勝久", faction: "amago", y: 1569, at: "gassan",
    lead: 66, valor: 68, wit: 64, gov: 60, retinue: 180, retTrain: 62, born: 1553 },
  { id: "am_shikanosuke", name: "山中鹿介", faction: "amago", y: 1561, at: "gassan",
    lead: 80, valor: 88, wit: 76, gov: 60, retinue: 180, retTrain: 70, born: 1545 },
  { id: "ck_chikamasa", name: "長宗我部親泰", faction: "chosokabe", y: 1559, at: "okou",
    lead: 74, valor: 74, wit: 72, gov: 68, retinue: 180, retTrain: 66, born: 1543 },
  { id: "ck_morichika", name: "長宗我部盛親", faction: "chosokabe", y: 1591, at: "okou",
    lead: 68, valor: 72, wit: 62, gov: 60, retinue: 190, retTrain: 64, born: 1575 },
  { id: "ot_yoshimune", name: "大友義統", faction: "otomo", y: 1574, at: "funai",
    lead: 58, valor: 58, wit: 58, gov: 62, retinue: 220, retTrain: 62, born: 1558 },
  { id: "ot_shigetane2", name: "吉弘鎮信", faction: "otomo", y: 1563, at: "funai",
    lead: 70, valor: 72, wit: 66, gov: 62, retinue: 180, retTrain: 64, born: 1547 },
  { id: "rz_masaie", name: "龍造寺政家", faction: "ryuzoji", y: 1572, at: "saga",
    lead: 60, valor: 60, wit: 60, gov: 62, retinue: 190, retTrain: 62, born: 1556 },
  { id: "sz_toyohisa", name: "島津豊久", faction: "shimazu", y: 1586, at: "shibushi",
    lead: 76, valor: 88, wit: 64, gov: 58, retinue: 180, retTrain: 70, born: 1570 },
  { id: "sz_tadatsune", name: "島津忠恒", faction: "shimazu", y: 1592, at: "uchijo",
    lead: 70, valor: 74, wit: 66, gov: 66, retinue: 190, retTrain: 66, born: 1576 },
  { id: "sr_yorifusa", name: "相良頼房", faction: "sagara", y: 1590, at: "hitoyoshi",
    lead: 66, valor: 68, wit: 64, gov: 62, retinue: 180, retTrain: 62, born: 1574 },
  { id: "it_sukekatsu", name: "伊東祐兵", faction: "ito", y: 1575, at: "sadowara",
    lead: 66, valor: 70, wit: 64, gov: 62, retinue: 170, retTrain: 62, born: 1559 },
  { id: "dt_kagetsuna2", name: "伊達実元", faction: "date", y: 1553, at: "yonezawa",
    lead: 68, valor: 70, wit: 66, gov: 64, retinue: 190, retTrain: 64, born: 1527 },
  { id: "mg_yoshiaki2", name: "最上義康", faction: "mogami", y: 1591, at: "yamagata",
    lead: 66, valor: 68, wit: 64, gov: 62, retinue: 180, retTrain: 64, born: 1575 },
  { id: "nb_toshinao", name: "南部利直", faction: "nanbu", y: 1592, at: "sannohe",
    lead: 68, valor: 68, wit: 68, gov: 70, retinue: 190, retTrain: 64, born: 1576 },
  { id: "or_nobuhira", name: "津軽信枚", faction: "oura", y: 1602, at: "oura",
    lead: 66, valor: 66, wit: 68, gov: 70, retinue: 180, retTrain: 62, born: 1586 },
  { id: "as_moritaka", name: "蘆名盛隆", faction: "ashina", y: 1577, at: "kurokawa",
    lead: 64, valor: 64, wit: 66, gov: 66, retinue: 180, retTrain: 62, born: 1561 },
  { id: "e_tadaoki", name: "細川忠興", faction: "ashikaga", y: 1578, at: "nijo",
    lead: 78, valor: 80, wit: 76, gov: 74, retinue: 190, retTrain: 68, born: 1563 },
  { id: "e_yukinaga", name: "小西行長", faction: "oda", y: 1580, at: "nagoya",
    lead: 72, valor: 66, wit: 80, gov: 80, retinue: 170, retTrain: 64, born: 1558 },
  { id: "e_masamune2", name: "伊達宗実", faction: "date", y: 1595, at: "yonezawa",
    lead: 70, valor: 74, wit: 64, gov: 60, retinue: 180, retTrain: 64, born: 1580 },
  { id: "e_kagekatsu2", name: "上杉定勝", faction: "nagao", y: 1620, at: "kasugayama",
    lead: 64, valor: 62, wit: 66, gov: 70, retinue: 190, retTrain: 62, born: 1604 },
  { id: "e_yoshinao", name: "徳川義直", faction: "matsudaira", y: 1615, at: "okazaki",
    lead: 66, valor: 64, wit: 70, gov: 74, retinue: 200, retTrain: 64, born: 1601 },
  { id: "e_yorinobu", name: "徳川頼宣", faction: "matsudaira", y: 1616, at: "okazaki",
    lead: 70, valor: 70, wit: 68, gov: 72, retinue: 200, retTrain: 64, born: 1602 },
  { id: "e_yorifusa", name: "徳川頼房", faction: "matsudaira", y: 1618, at: "okazaki",
    lead: 68, valor: 68, wit: 70, gov: 74, retinue: 200, retTrain: 64, born: 1603 },
  { id: "e_masayuki", name: "保科正之", faction: "matsudaira", y: 1626, at: "okazaki",
    lead: 72, valor: 60, wit: 82, gov: 92, retinue: 200, retTrain: 62, born: 1611 },
  { id: "e_iemitsu", name: "徳川家光", faction: "matsudaira", y: 1618, at: "okazaki",
    lead: 68, valor: 64, wit: 70, gov: 80, retinue: 220, retTrain: 64, born: 1604 },
  { id: "e_tadanaga", name: "徳川忠長", faction: "matsudaira", y: 1620, at: "okazaki",
    lead: 60, valor: 66, wit: 56, gov: 58, retinue: 190, retTrain: 62, born: 1606 },
  { id: "e_naotaka", name: "井伊直孝", faction: "matsudaira", y: 1605, at: "okazaki",
    lead: 78, valor: 80, wit: 72, gov: 72, retinue: 190, retTrain: 68, born: 1590 },
  { id: "e_masazumi", name: "本多正純", faction: "matsudaira", y: 1580, at: "okazaki",
    lead: 64, valor: 54, wit: 84, gov: 82, retinue: 150, retTrain: 58, born: 1565 },
  { id: "e_tadakatsu2", name: "本多忠政", faction: "matsudaira", y: 1590, at: "okazaki",
    lead: 70, valor: 74, wit: 64, gov: 64, retinue: 180, retTrain: 66, born: 1575 },
  { id: "e_yasukatsu", name: "榊原康勝", faction: "matsudaira", y: 1605, at: "okazaki",
    lead: 68, valor: 72, wit: 64, gov: 62, retinue: 180, retTrain: 64, born: 1590 },
  { id: "e_masanori2", name: "水野勝成", faction: "mizuno", y: 1580, at: "kariya",
    lead: 76, valor: 84, wit: 68, gov: 68, retinue: 170, retTrain: 68, born: 1564 },
  { id: "e_muneshige2", name: "高橋直次", faction: "otomo", y: 1585, at: "funai",
    lead: 74, valor: 78, wit: 68, gov: 64, retinue: 180, retTrain: 66, born: 1570 },
  { id: "e_kiyomasa2", name: "加藤忠広", faction: "oda", y: 1616, at: "nagoya",
    lead: 60, valor: 62, wit: 58, gov: 60, retinue: 180, retTrain: 62, born: 1601 },
  { id: "e_tadatoshi", name: "細川忠利", faction: "ashikaga", y: 1601, at: "nijo",
    lead: 70, valor: 68, wit: 72, gov: 76, retinue: 180, retTrain: 64, born: 1586 },
  { id: "e_yoshihiro2", name: "島津久信", faction: "shimazu", y: 1615, at: "uchijo",
    lead: 64, valor: 66, wit: 64, gov: 66, retinue: 190, retTrain: 64, born: 1600 },
  { id: "e_mitsuhisa", name: "島津光久", faction: "shimazu", y: 1631, at: "uchijo",
    lead: 66, valor: 66, wit: 68, gov: 72, retinue: 190, retTrain: 64, born: 1616 },
  { id: "e_terumoto2", name: "毛利秀就", faction: "mori", y: 1610, at: "koriyama_a",
    lead: 62, valor: 62, wit: 64, gov: 68, retinue: 190, retTrain: 62, born: 1595 },
  { id: "e_hidemoto", name: "毛利秀元", faction: "mori", y: 1594, at: "koriyama_a",
    lead: 74, valor: 74, wit: 74, gov: 72, retinue: 190, retTrain: 66, born: 1579 },
  { id: "e_nagamasa2", name: "黒田長政", faction: "akamatsu", y: 1583, at: "himeji",
    lead: 78, valor: 80, wit: 74, gov: 74, retinue: 180, retTrain: 68, born: 1568 },
  { id: "e_tadayuki", name: "黒田忠之", faction: "akamatsu", y: 1617, at: "himeji",
    lead: 60, valor: 62, wit: 58, gov: 60, retinue: 180, retTrain: 60, born: 1602 },
  { id: "e_katsushige", name: "鍋島勝茂", faction: "ryuzoji", y: 1595, at: "saga",
    lead: 68, valor: 68, wit: 70, gov: 74, retinue: 180, retTrain: 64, born: 1580 },
  { id: "e_toshitsune", name: "前田利常", faction: "oda", y: 1608, at: "nagoya",
    lead: 70, valor: 66, wit: 78, gov: 84, retinue: 190, retTrain: 64, born: 1594 },
  { id: "e_masamune3", name: "伊達忠宗", faction: "date", y: 1615, at: "yonezawa",
    lead: 66, valor: 64, wit: 68, gov: 74, retinue: 190, retTrain: 62, born: 1600 },
  { id: "e_kanetsugu3", name: "直江勝吉", faction: "nagao", y: 1585, at: "yoita",
    lead: 68, valor: 66, wit: 72, gov: 74, retinue: 170, retTrain: 64, born: 1570 },
  { id: "e_shigenaga", name: "本庄充長", faction: "agakita", y: 1585, at: "murakami",
    lead: 70, valor: 74, wit: 64, gov: 60, retinue: 180, retTrain: 64, born: 1570 },
  { id: "e_yoshiaki3", name: "最上家親", faction: "mogami", y: 1597, at: "yamagata",
    lead: 64, valor: 64, wit: 64, gov: 66, retinue: 180, retTrain: 62, born: 1582 },
  { id: "e_masamune4", name: "南部重直", faction: "nanbu", y: 1620, at: "sannohe",
    lead: 64, valor: 64, wit: 66, gov: 68, retinue: 180, retTrain: 62, born: 1606 },
  { id: "e_nobuyoshi", name: "津軽信義", faction: "oura", y: 1634, at: "oura",
    lead: 62, valor: 62, wit: 64, gov: 66, retinue: 180, retTrain: 60, born: 1619 },
  { id: "e_shiro", name: "天草四郎", faction: "ikko", y: 1637, at: "nagashima",
    lead: 70, valor: 66, wit: 80, gov: 66, retinue: 160, retTrain: 64, born: 1621 },
  { id: "e_munefusa", name: "松倉勝家", faction: "arima", y: 1630, at: "hinoe",
    lead: 52, valor: 58, wit: 50, gov: 48, retinue: 170, retTrain: 58, born: 1597 },
  { id: "e_nobutsuna", name: "松平信綱", faction: "matsudaira", y: 1630, at: "okazaki",
    lead: 68, valor: 56, wit: 88, gov: 92, retinue: 180, retTrain: 60, born: 1596 },
  { id: "e_masatoshi", name: "堀田正俊", faction: "matsudaira", y: 1650, at: "okazaki",
    lead: 64, valor: 58, wit: 76, gov: 82, retinue: 170, retTrain: 58, born: 1634 },
  { id: "e_mitsukuni", name: "徳川光圀", faction: "matsudaira", y: 1643, at: "okazaki",
    lead: 66, valor: 60, wit: 80, gov: 84, retinue: 180, retTrain: 60, born: 1628 },
  { id: "e_tsunayoshi", name: "徳川綱吉", faction: "matsudaira", y: 1661, at: "okazaki",
    lead: 58, valor: 54, wit: 70, gov: 72, retinue: 190, retTrain: 58, born: 1646 },
  { id: "e_yoshiyasu", name: "柳沢吉保", faction: "matsudaira", y: 1673, at: "okazaki",
    lead: 58, valor: 52, wit: 80, gov: 82, retinue: 160, retTrain: 56, born: 1658 },
  { id: "e_hakuseki", name: "新井白石", faction: "matsudaira", y: 1672, at: "okazaki",
    lead: 56, valor: 46, wit: 88, gov: 86, retinue: 120, retTrain: 52, born: 1657 },
  { id: "e_yoshimune", name: "徳川吉宗", faction: "matsudaira", y: 1699, at: "okazaki",
    lead: 76, valor: 70, wit: 82, gov: 90, retinue: 200, retTrain: 62, born: 1684 },
  { id: "e_kuranosuke", name: "大石内蔵助", faction: "akamatsu", y: 1674, at: "ojio",
    lead: 72, valor: 66, wit: 84, gov: 76, retinue: 150, retTrain: 62, born: 1659 },
  { id: "e_naganori", name: "浅野長矩", faction: "akamatsu", y: 1682, at: "ojio",
    lead: 58, valor: 62, wit: 54, gov: 58, retinue: 170, retTrain: 58, born: 1667 },
  { id: "e_kozukenosuke", name: "吉良義央", faction: "matsudaira", y: 1656, at: "okazaki",
    lead: 56, valor: 50, wit: 72, gov: 70, retinue: 140, retTrain: 54, born: 1641 },
  { id: "e_soan", name: "角倉素庵", faction: "ashikaga", y: 1590, at: "nijo",
    lead: 56, valor: 44, wit: 84, gov: 88, retinue: 120, retTrain: 50, born: 1571 },
  { id: "e_ryoi", name: "角倉了以", faction: "ashikaga", y: 1570, at: "nijo",
    lead: 58, valor: 46, wit: 86, gov: 86, retinue: 120, retTrain: 50, born: 1554 },
  { id: "e_sokun", name: "島井宗室", faction: "ouchi", y: 1560, at: "tachibanayama",
    lead: 54, valor: 44, wit: 82, gov: 84, retinue: 110, retTrain: 48, born: 1539 },
  { id: "e_soshitsu", name: "神屋宗湛", faction: "ouchi", y: 1568, at: "tachibanayama",
    lead: 54, valor: 42, wit: 84, gov: 86, retinue: 110, retTrain: 48, born: 1553 },
  { id: "e_rikyu", name: "千利休", faction: "miyoshi", y: 1537, at: "ishiyama",
    lead: 52, valor: 40, wit: 86, gov: 80, retinue: 100, retTrain: 46, born: 1522 },
  { id: "e_sokei", name: "津田宗及", faction: "miyoshi", y: 1560, at: "ishiyama",
    lead: 52, valor: 40, wit: 82, gov: 80, retinue: 100, retTrain: 46, born: 1545 },
  { id: "e_musashi", name: "宮本武蔵", faction: "akamatsu", y: 1599, at: "himeji",
    lead: 68, valor: 96, wit: 72, gov: 52, retinue: 140, retTrain: 72, born: 1584 },
  { id: "e_munenori", name: "柳生宗矩", faction: "tsutsui", y: 1586, at: "koriyama",
    lead: 70, valor: 88, wit: 78, gov: 70, retinue: 150, retTrain: 70, born: 1571 },
  { id: "e_sekishusai", name: "柳生宗厳", faction: "tsutsui", y: 1543, at: "koriyama",
    lead: 70, valor: 92, wit: 72, gov: 62, retinue: 160, retTrain: 72, born: 1529 },
  { id: "e_bokuden", name: "塚原卜伝", faction: "satake", y: 1504, at: "ota_hitachi",
    lead: 70, valor: 94, wit: 76, gov: 58, retinue: 150, retTrain: 72, born: 1489 },
  { id: "e_ittosai", name: "伊藤一刀斎", faction: "hojo", y: 1565, at: "odawara",
    lead: 66, valor: 92, wit: 70, gov: 54, retinue: 130, retTrain: 70, born: 1550 },
  { id: "junkei", name: "筒井順慶", faction: "tsutsui", y: 1564, at: "takatori",
    lead: 76, valor: 66, wit: 78, gov: 76, retinue: 180, retTrain: 58, born: 1549 },
  { id: "saika3", name: "鈴木重朝", faction: "saika", y: 1561, at: "saika",
    lead: 72, valor: 78, wit: 70, gov: 58, retinue: 200, retTrain: 66, born: 1546 },
  { id: "nagano2", name: "長野業盛", faction: "nagano_k", y: 1561, at: "minowa",
    lead: 72, valor: 74, wit: 66, gov: 62, retinue: 200, retTrain: 64, born: 1546 },
  { id: "yura2", name: "由良国繁", faction: "yura", y: 1564, at: "kanayama",
    lead: 66, valor: 68, wit: 62, gov: 60, retinue: 200, retTrain: 60, born: 1549 },
  { id: "sogo2", name: "十河存保", faction: "miyoshi", y: 1564, at: "sogo",
    lead: 74, valor: 78, wit: 64, gov: 58, retinue: 200, retTrain: 62, born: 1549 },
  { id: "iehisa", name: "島津家久", faction: "shimazu", y: 1562, at: "shibushi",
    lead: 84, valor: 86, wit: 88, gov: 64, retinue: 200, retTrain: 68, born: 1547 },
  { id: "w_yura_a", name: "安宅信康", faction: "miyoshi", y: 1561, at: "yura",
    lead: 66, valor: 66, wit: 62, gov: 58, retinue: 240, retTrain: 60, born: 1546 },
  { id: "w_shimofuri", name: "内藤隆春", faction: "ouchi", y: 1562, at: "shimofuri",
    lead: 68, valor: 66, wit: 66, gov: 64, retinue: 240, retTrain: 60, born: 1547 },
  { id: "kagetsuna", name: "片倉景綱", faction: "date", y: 1564, at: "yonezawa",
    lead: 74, valor: 66, wit: 84, gov: 80, retinue: 180, retTrain: 62, born: 1549 },
  { id: "nobunao", name: "南部信直", faction: "nanbu", y: 1561, at: "kozukata",
    lead: 76, valor: 70, wit: 76, gov: 74, retinue: 220, retTrain: 62, born: 1546 },
  { id: "tamenobu", name: "大浦為信", faction: "oura", y: 1564, at: "oura",
    lead: 84, valor: 78, wit: 88, gov: 76, retinue: 240, retTrain: 64, born: 1549 },
  { id: "yoshiaki_m", name: "最上義光", faction: "mogami", y: 1561, at: "yamagata",
    lead: 88, valor: 80, wit: 90, gov: 82, retinue: 200, retTrain: 64, born: 1546 },
  { id: "kakizaki2", name: "蠣崎慶広", faction: "kakizaki", y: 1563, at: "hakodate",
    lead: 70, valor: 66, wit: 76, gov: 72, retinue: 200, retTrain: 58, born: 1548 },
  { id: "ag_murakami2", name: "色部長実", faction: "agakita", y: 1562, at: "murakami",
    lead: 68, valor: 70, wit: 64, gov: 60, retinue: 240, retTrain: 60, born: 1547 },
  { id: "ms_miyake2", name: "益田元祥", faction: "masuda", y: 1562, at: "miyake",
    lead: 68, valor: 66, wit: 70, gov: 70, retinue: 240, retTrain: 60, born: 1547 },
  { id: "az_akizuki2", name: "秋月種実", faction: "akizuki", y: 1562, at: "akizuki",
    lead: 70, valor: 70, wit: 68, gov: 62, retinue: 240, retTrain: 60, born: 1547 },
  { id: "tadashige", name: "水野忠重", faction: "mizuno", y: 1556, at: "kariya",
    lead: 64, valor: 72, wit: 54, gov: 52, retinue: 200, retTrain: 58, born: 1541 },
  { id: "tsunanari2", name: "北条氏規", faction: "hojo", y: 1560, at: "nirayama",
    lead: 74, valor: 68, wit: 78, gov: 80, retinue: 200, retTrain: 66, born: 1545 },
  { id: "yoshitaka", name: "九鬼嘉隆", faction: "kuki", y: 1557, at: "toba",
    lead: 80, valor: 78, wit: 76, gov: 62, retinue: 200, retTrain: 68, born: 1542 },
  { id: "ujiteru", name: "北条氏照", faction: "hojo", y: 1555, at: "takiyama",
    lead: 80, valor: 76, wit: 76, gov: 72, retinue: 300, retTrain: 68, born: 1540 },
  { id: "ujikuni", name: "北条氏邦", faction: "hojo", y: 1556, at: "hachigata",
    lead: 78, valor: 78, wit: 72, gov: 70, retinue: 280, retTrain: 68, born: 1541 },
  { id: "hisamichi", name: "松永久通", faction: "miyoshi", y: 1558, at: "shigisan",
    lead: 62, valor: 64, wit: 66, gov: 58, retinue: 180, retTrain: 58, born: 1543 },
  { id: "tsutsui2", name: "島清興", faction: "tsutsui", y: 1555, at: "koriyama",
    lead: 84, valor: 88, wit: 80, gov: 64, retinue: 200, retTrain: 68, born: 1540 },
  { id: "motochika", name: "長宗我部元親", faction: "chosokabe", y: 1554, at: "okou",
    lead: 90, valor: 84, wit: 88, gov: 80, retinue: 220, retTrain: 68, born: 1539 },
  { id: "terumune", name: "伊達輝宗", faction: "date", y: 1559, at: "yonezawa",
    lead: 76, valor: 68, wit: 78, gov: 80, retinue: 220, retTrain: 62, born: 1544 },
  { id: "chikasue", name: "安東愛季", faction: "ando", y: 1554, at: "minato",
    lead: 84, valor: 74, wit: 86, gov: 82, retinue: 240, retTrain: 62, born: 1539 },
  { id: "t_katsuyama2", name: "小山田信茂", faction: "takeda", y: 1554, at: "katsuyama_k",
    lead: 74, valor: 76, wit: 70, gov: 64, retinue: 240, retTrain: 64, born: 1539 },
  { id: "s_uozu2", name: "河田長親", faction: "shiina", y: 1558, at: "uozu",
    lead: 70, valor: 68, wit: 72, gov: 68, retinue: 230, retTrain: 62, born: 1543 },
  { id: "mm_matsuyama2", name: "三村元親", faction: "mimura", y: 1557, at: "matsuyama_bc",
    lead: 70, valor: 72, wit: 64, gov: 60, retinue: 250, retTrain: 62, born: 1542 },
  { id: "nj_uyui2", name: "南条元続", faction: "nanjo", y: 1555, at: "uyui",
    lead: 66, valor: 68, wit: 62, gov: 58, retinue: 240, retTrain: 60, born: 1540 },
  { id: "si_itajima3", name: "土居清良", faction: "saionji", y: 1560, at: "itajima",
    lead: 70, valor: 74, wit: 66, gov: 58, retinue: 240, retTrain: 62, born: 1545 },
  { id: "sr_yatsushiro2", name: "丸目長恵", faction: "sagara", y: 1555, at: "yatsushiro",
    lead: 68, valor: 78, wit: 62, gov: 54, retinue: 240, retTrain: 64, born: 1540 },
  { id: "kh_kunohe2", name: "九戸実親", faction: "kunohe", y: 1555, at: "kunohe",
    lead: 66, valor: 70, wit: 62, gov: 56, retinue: 240, retTrain: 62, born: 1540 },
  { id: "td_tendo2", name: "天童頼澄", faction: "tendo", y: 1555, at: "tendo",
    lead: 64, valor: 66, wit: 60, gov: 58, retinue: 240, retTrain: 60, born: 1540 },
  { id: "tm_miharu2", name: "田村清顕", faction: "tamura", y: 1555, at: "miharu",
    lead: 66, valor: 68, wit: 62, gov: 58, retinue: 240, retTrain: 60, born: 1540 },
  // ── 上野・武蔵北（増補の第一回。父はいずれも初期配置に居る）
  { id: "uy_narishige", name: "和田業繁", faction: "uesugi_y", y: 1555, at: "maebashi",
    lead: 70, valor: 76, wit: 62, gov: 56, retinue: 240, retTrain: 66, born: 1540 },
  { id: "uy_nobusada", name: "小幡信貞", faction: "uesugi_y", y: 1555, at: "hirai",
    lead: 74, valor: 78, wit: 64, gov: 58, retinue: 260, retTrain: 68, born: 1540 },
  { id: "uy_naoyuki", name: "倉賀野尚行", faction: "uesugi_y", y: 1555, at: "hirai",
    lead: 64, valor: 66, wit: 60, gov: 58, retinue: 230, retTrain: 60, born: 1540 },
  { id: "uy_kageshige", name: "安中景繁", faction: "uesugi_y", y: 1555, at: "hirai",
    lead: 66, valor: 70, wit: 58, gov: 56, retinue: 240, retTrain: 62, born: 1540 },
  { id: "uy_nagatomo", name: "秋元長朝", faction: "uesugi_y", y: 1561, at: "fukaya",
    lead: 66, valor: 62, wit: 72, gov: 78, retinue: 200, retTrain: 58, born: 1546 },
  { id: "uy_kageyoshi", name: "沼田景義", faction: "uesugi_y", y: 1563, at: "numata",
    lead: 66, valor: 70, wit: 60, gov: 56, retinue: 230, retTrain: 60, born: 1548 },
  { id: "uy_ujinori", name: "上杉氏憲", faction: "uesugi_y", y: 1567, at: "fukaya",
    lead: 58, valor: 58, wit: 58, gov: 60, retinue: 240, retTrain: 56, born: 1552 },
  { id: "uy_terukage", name: "長尾輝景", faction: "uesugi_y", y: 1575, at: "hirai",
    lead: 64, valor: 64, wit: 62, gov: 62, retinue: 240, retTrain: 60, born: 1560 },
  { id: "yr_akinaga", name: "長尾顕長", faction: "yura", y: 1569, at: "kanayama",
    lead: 64, valor: 66, wit: 62, gov: 58, retinue: 260, retTrain: 60, born: 1554 },
  // ── 越前・近江（増補の第二回）
  { id: "as_kagemitsu", name: "朝倉景垙", faction: "asakura", y: 1560, at: "kanegasaki",
    lead: 64, valor: 66, wit: 60, gov: 58, retinue: 240, retTrain: 62, born: 1545 },
  { id: "as_takamoto", name: "真柄隆基", faction: "asakura", y: 1562, at: "kanegasaki",
    lead: 62, valor: 84, wit: 46, gov: 44, retinue: 220, retTrain: 64, born: 1547 },
  { id: "as_nagashige", name: "富田長繁", faction: "asakura", y: 1566, at: "kitanosho",
    lead: 70, valor: 82, wit: 58, gov: 50, retinue: 230, retTrain: 64, born: 1551 },
  { id: "rk_yoshiharu", name: "六角義治", faction: "rokkaku", y: 1560, at: "kannonji",
    lead: 58, valor: 60, wit: 54, gov: 56, retinue: 300, retTrain: 60, born: 1545 },
  { id: "rk_takaharu", name: "後藤高治", faction: "rokkaku", y: 1560, at: "sawayama",
    lead: 66, valor: 66, wit: 64, gov: 62, retinue: 260, retTrain: 60, born: 1545 },
  // ── 甲斐・信濃・駿河・美濃・北近江（増補の第三回）
  { id: "td_nobunori", name: "板垣信憲", faction: "takeda", y: 1552, at: "fukashi",
    lead: 62, valor: 66, wit: 56, gov: 54, retinue: 280, retTrain: 62, born: 1537 },
  { id: "td_masatada", name: "甘利昌忠", faction: "takeda", y: 1555, at: "fukashi",
    lead: 68, valor: 70, wit: 62, gov: 60, retinue: 270, retTrain: 64, born: 1540 },
  { id: "td_masanao", name: "保科正直", faction: "takeda", y: 1557, at: "takato",
    lead: 70, valor: 74, wit: 64, gov: 62, retinue: 260, retTrain: 66, born: 1542 },
  { id: "td_yasukage", name: "横田康景", faction: "takeda", y: 1569, at: "tsutsujigasaki",
    lead: 70, valor: 78, wit: 62, gov: 56, retinue: 250, retTrain: 68, born: 1554 },
  { id: "im_michiyoshi", name: "小野道好", faction: "imagawa", y: 1552, at: "hikuma",
    lead: 58, valor: 56, wit: 70, gov: 62, retinue: 200, retTrain: 56, born: 1537 },
  { id: "im_yasukatsu", name: "朝比奈泰勝", faction: "imagawa", y: 1562, at: "kakegawa",
    lead: 68, valor: 76, wit: 64, gov: 60, retinue: 230, retTrain: 64, born: 1547 },
  { id: "sa_sadamichi", name: "稲葉貞通", faction: "saito", y: 1561, at: "ogaki",
    lead: 70, valor: 72, wit: 64, gov: 62, retinue: 280, retTrain: 64, born: 1546 },
  { id: "sa_mitsuyasu2", name: "加藤光泰", faction: "saito", y: 1552, at: "ogaki",
    lead: 70, valor: 68, wit: 70, gov: 74, retinue: 220, retTrain: 62, born: 1537 },
  { id: "az_hidemura", name: "堀秀村", faction: "azai", y: 1572, at: "yamamotoyama",
    lead: 60, valor: 60, wit: 58, gov: 60, retinue: 240, retTrain: 58, born: 1557 },
  // ── 相模・武蔵・下総・常陸（増補の第四回）
  { id: "hj_ujishige", name: "北条氏繁", faction: "hojo", y: 1551, at: "tamanawa",
    lead: 80, valor: 82, wit: 68, gov: 66, retinue: 320, retTrain: 72, born: 1536 },
  { id: "hj_kosetsusai", name: "板部岡江雪斎", faction: "hojo", y: 1552, at: "odawara",
    lead: 52, valor: 46, wit: 84, gov: 80, retinue: 180, retTrain: 54, born: 1537 },
  { id: "hj_hidenobu", name: "大藤秀信", faction: "hojo", y: 1555, at: "tamanawa",
    lead: 70, valor: 74, wit: 62, gov: 56, retinue: 260, retTrain: 68, born: 1540 },
  { id: "ot5_iwatsuki3", name: "太田資武", faction: "ota", y: 1582, at: "iwatsuki",
    lead: 64, valor: 66, wit: 60, gov: 58, retinue: 240, retTrain: 60, born: 1567 },
  { id: "ot_ujisuke", name: "太田氏資", faction: "ota", y: 1557, at: "iwatsuki",
    lead: 68, valor: 70, wit: 62, gov: 60, retinue: 280, retTrain: 62, born: 1542 },
  { id: "ed_michimasa", name: "江戸通政", faction: "edo_h", y: 1557, at: "mito",
    lead: 64, valor: 62, wit: 62, gov: 62, retinue: 280, retTrain: 58, born: 1542 },
  { id: "ed_masamoto", name: "大掾政幹", faction: "edo_h", y: 1560, at: "fuchu_hitachi",
    lead: 62, valor: 62, wit: 60, gov: 60, retinue: 240, retTrain: 58, born: 1545 },
  { id: "cb_chikatane", name: "千葉親胤", faction: "chiba", y: 1556, at: "motosakura",
    lead: 58, valor: 58, wit: 56, gov: 58, retinue: 300, retTrain: 56, born: 1541 },
  { id: "cb_tanetoki", name: "高城胤辰", faction: "chiba", y: 1564, at: "usui",
    lead: 64, valor: 66, wit: 62, gov: 60, retinue: 250, retTrain: 60, born: 1549 },
  { id: "kg_yoshiuji", name: "足利義氏", faction: "koga", y: 1556, at: "koga",
    lead: 54, valor: 52, wit: 58, gov: 62, retinue: 320, retTrain: 54, born: 1541 },
  { id: "kg_fujiuji", name: "足利藤氏", faction: "koga", y: 1554, at: "sekiyado",
    lead: 56, valor: 56, wit: 56, gov: 58, retinue: 280, retTrain: 54, born: 1539 },
  { id: "nr_ujinaga", name: "成田氏長", faction: "narita", y: 1557, at: "oshi",
    lead: 66, valor: 64, wit: 68, gov: 66, retinue: 300, retTrain: 60, born: 1542 },
  { id: "yk_shigetsune", name: "多賀谷重経", faction: "yuki", y: 1573, at: "yuki",
    lead: 68, valor: 70, wit: 64, gov: 60, retinue: 260, retTrain: 62, born: 1558 },
  { id: "yk_katsutoshi", name: "水谷勝俊", faction: "yuki", y: 1560, at: "yuki",
    lead: 66, valor: 68, wit: 62, gov: 62, retinue: 250, retTrain: 60, born: 1545 },
  // ── 畿内（増補の第五回）
  { id: "my_nagaharu", name: "三好長治", faction: "miyoshi", y: 1568, at: "shozui",
    lead: 58, valor: 60, wit: 54, gov: 54, retinue: 320, retTrain: 58, born: 1553 },
  { id: "my_yasutoshi", name: "三好康俊", faction: "miyoshi", y: 1560, at: "ichinomiya",
    lead: 64, valor: 66, wit: 60, gov: 58, retinue: 260, retTrain: 60, born: 1545 },
  { id: "my_nagamasa", name: "池田長正", faction: "miyoshi", y: 1555, at: "itami",
    lead: 64, valor: 64, wit: 62, gov: 62, retinue: 270, retTrain: 60, born: 1540 },
  { id: "ts_hidesuke", name: "中坊秀祐", faction: "tsutsui", y: 1553, at: "koriyama",
    lead: 62, valor: 62, wit: 70, gov: 72, retinue: 220, retTrain: 56, born: 1538 },
  { id: "hg_kennyo", name: "顕如", faction: "honganji", y: 1558, at: "ishiyama",
    lead: 74, valor: 52, wit: 88, gov: 86, retinue: 700, retTrain: 62, born: 1543 },
  { id: "bs_nagaharu", name: "別所長治", faction: "bessho", y: 1573, at: "miki",
    lead: 66, valor: 68, wit: 62, gov: 62, retinue: 320, retTrain: 62, born: 1558 },
  { id: "ak_yoshisuke", name: "赤松義祐", faction: "akamatsu", y: 1552, at: "ojio",
    lead: 60, valor: 58, wit: 58, gov: 60, retinue: 300, retTrain: 56, born: 1537 },
  // ── 陸奥南（増補の第六回）
  // はじめの四人は、初期配置に立っていたが一五四六年より後の生まれであった者。
  { id: "sm_soma2", name: "相馬義胤", faction: "soma", y: 1563, at: "soma",
    lead: 72, valor: 76, wit: 64, gov: 60, retinue: 300, retTrain: 64, born: 1548 },
  { id: "nh_nihonmatsu2", name: "畠山義継", faction: "nihonmatsu", y: 1567, at: "nihonmatsu",
    lead: 64, valor: 66, wit: 64, gov: 58, retinue: 280, retTrain: 60, born: 1552 },
  { id: "sw_shirakawa2", name: "結城義親", faction: "shirakawa", y: 1569, at: "shirakawa",
    lead: 64, valor: 64, wit: 62, gov: 60, retinue: 280, retTrain: 60, born: 1554 },
  { id: "nk_sukagawa2", name: "二階堂盛義", faction: "nikaido", y: 1559, at: "sukagawa",
    lead: 66, valor: 66, wit: 62, gov: 58, retinue: 280, retTrain: 60, born: 1544 },
  { id: "dt_masakage", name: "留守政景", faction: "date", y: 1564, at: "watari",
    lead: 70, valor: 70, wit: 66, gov: 64, retinue: 280, retTrain: 62, born: 1549 },
  { id: "dt_akimitsu", name: "石川昭光", faction: "date", y: 1565, at: "yonezawa",
    lead: 66, valor: 64, wit: 66, gov: 64, retinue: 270, retTrain: 60, born: 1550 },
  { id: "dt_morishige", name: "国分盛重", faction: "kokubun", y: 1568, at: "sendai",
    lead: 66, valor: 68, wit: 62, gov: 60, retinue: 260, retTrain: 60, born: 1553 },
  { id: "dt_kageyori", name: "屋代景頼", faction: "date", y: 1578, at: "yonezawa",
    lead: 68, valor: 72, wit: 64, gov: 58, retinue: 250, retTrain: 62, born: 1563 },
  { id: "as_morioki", name: "蘆名盛興", faction: "ashina", y: 1562, at: "kurokawa",
    lead: 62, valor: 62, wit: 58, gov: 58, retinue: 320, retTrain: 58, born: 1547 },
  { id: "as_ujizane", name: "富田氏実", faction: "ashina", y: 1572, at: "kurokawa",
    lead: 64, valor: 64, wit: 62, gov: 60, retinue: 260, retTrain: 58, born: 1557 },
  // ── 陸奥北・出羽（増補の第七回）
  { id: "ab_yokota2", name: "阿曽沼広長", faction: "abe", y: 1586, at: "yokota",
    lead: 62, valor: 64, wit: 58, gov: 56, retinue: 230, retTrain: 58, born: 1571 },
  { id: "nb_masayoshi", name: "八戸政栄", faction: "nanbu", y: 1555, at: "sannohe",
    lead: 70, valor: 70, wit: 66, gov: 64, retinue: 300, retTrain: 62, born: 1540 },
  { id: "os_yoshitaka", name: "大崎義隆", faction: "osaki", y: 1563, at: "iwadeyama",
    lead: 58, valor: 58, wit: 56, gov: 58, retinue: 320, retTrain: 56, born: 1548 },
  { id: "mg_yoshitoki", name: "中野義時", faction: "mogami", y: 1565, at: "yamagata",
    lead: 62, valor: 64, wit: 58, gov: 56, retinue: 260, retTrain: 58, born: 1550 },
  { id: "nm_akimura", name: "浪岡顕村", faction: "namioka", y: 1568, at: "namioka",
    lead: 56, valor: 56, wit: 58, gov: 58, retinue: 240, retTrain: 54, born: 1553 },
  { id: "dh_yoshiuji", name: "大宝寺義氏", faction: "daihoji", y: 1566, at: "ourayama",
    lead: 66, valor: 68, wit: 62, gov: 56, retinue: 300, retTrain: 60, born: 1551 },
  // ── 北陸（増補の第八回）
  { id: "hy_yoshitsuna", name: "畠山義綱", faction: "hatakeyama", y: 1550, at: "nanao",
    lead: 60, valor: 58, wit: 60, gov: 62, retinue: 340, retTrain: 58, born: 1535 },
  { id: "hy_tsunatsura", name: "長綱連", faction: "hatakeyama", y: 1555, at: "nanao",
    lead: 68, valor: 68, wit: 64, gov: 62, retinue: 280, retTrain: 62, born: 1540 },
  { id: "hy_kagetaka", name: "温井景隆", faction: "hatakeyama", y: 1560, at: "suemori_n",
    lead: 64, valor: 64, wit: 66, gov: 62, retinue: 260, retTrain: 58, born: 1545 },
  { id: "ng_kagechika", name: "千坂景親", faction: "nagao", y: 1551, at: "kasugayama",
    lead: 62, valor: 60, wit: 72, gov: 74, retinue: 240, retTrain: 58, born: 1536 },
  { id: "ng_chikanori", name: "水原親憲", faction: "nagao", y: 1561, at: "sanjo",
    lead: 70, valor: 76, wit: 64, gov: 58, retinue: 260, retTrain: 64, born: 1546 },
  // ── 九州北（増補の第九回）
  { id: "kk_chikakata", name: "城親賢", faction: "kikuchi", y: 1553, at: "kumamoto",
    lead: 66, valor: 66, wit: 64, gov: 62, retinue: 260, retTrain: 60, born: 1538 },
  { id: "it_yoshimasu", name: "伊東義益", faction: "ito", y: 1561, at: "sadowara",
    lead: 64, valor: 62, wit: 66, gov: 66, retinue: 300, retTrain: 58, born: 1546 },
  // ── 中国・九州南（増補の第十回）
  // はじめの四人は、初期配置に立っていたが一五四六年より後の生まれであった者。
  { id: "nj_uyui3", name: "小鴨元清", faction: "nanjo", y: 1567, at: "uyui",
    lead: 66, valor: 68, wit: 62, gov: 60, retinue: 260, retTrain: 60, born: 1552 },
  { id: "sz_shibushi3", name: "上井覚兼", faction: "shimazu", y: 1560, at: "shibushi",
    lead: 66, valor: 62, wit: 76, gov: 78, retinue: 250, retTrain: 58, born: 1545 },
  { id: "o5_tachibana3", name: "薦野増時", faction: "ouchi", y: 1555, at: "tachibanayama",
    lead: 68, valor: 66, wit: 68, gov: 66, retinue: 250, retTrain: 60, born: 1540 },
  { id: "sz_obi4", name: "山田有信", faction: "shimazu", y: 1559, at: "obi",
    lead: 72, valor: 78, wit: 66, gov: 60, retinue: 260, retTrain: 64, born: 1544 },
  { id: "o_yoshinaga", name: "大内義長", faction: "ouchi", y: 1547, at: "ouchi",
    lead: 54, valor: 52, wit: 56, gov: 58, retinue: 340, retTrain: 54, born: 1532 },
  { id: "o_nagafusa", name: "陶長房", faction: "ouchi", y: 1554, at: "wakayama_s",
    lead: 66, valor: 70, wit: 62, gov: 58, retinue: 280, retTrain: 62, born: 1539 },
  { id: "sz_tadamune", name: "伊集院忠棟", faction: "shimazu", y: 1556, at: "uchijo",
    lead: 66, valor: 64, wit: 74, gov: 74, retinue: 270, retTrain: 60, born: 1541 },
  // ── 伊勢・尾張・四国（増補の第十一回）
  { id: "sumitaka", name: "九鬼澄隆", faction: "kuki", y: 1562, at: "toba",
    lead: 70, valor: 74, wit: 68, gov: 58, retinue: 300, retTrain: 66, born: 1547 },
  { id: "kb_tomofusa", name: "北畠具房", faction: "kitabatake", y: 1562, at: "okochi",
    lead: 56, valor: 54, wit: 58, gov: 60, retinue: 320, retTrain: 56, born: 1547 },
  { id: "kb_tomofuji", name: "長野具藤", faction: "kitabatake", y: 1567, at: "matsugashima",
    lead: 58, valor: 58, wit: 58, gov: 58, retinue: 270, retTrain: 56, born: 1552 },
  { id: "ise_nobukata", name: "織田信賢", faction: "ise", y: 1552, at: "iwakura",
    lead: 54, valor: 56, wit: 50, gov: 52, retinue: 280, retTrain: 56, born: 1537 },
  { id: "ic_kanesada", name: "一条兼定", faction: "ichijo", y: 1558, at: "nakamura",
    lead: 52, valor: 52, wit: 54, gov: 56, retinue: 340, retTrain: 54, born: 1543 },
  // ── 常陸・下野・安房（増補の第十二回。層一はここまで）
  // はじめの四人は、初期配置に立っていたが一五四六年より後の生まれであった者。
  { id: "sm5_tateyama3", name: "正木時通", faction: "satomi", y: 1557, at: "tateyama",
    lead: 68, valor: 72, wit: 62, gov: 56, retinue: 260, retTrain: 62, born: 1542 },
  { id: "sm5_otaki2", name: "正木憲時", faction: "satomi", y: 1566, at: "otaki",
    lead: 66, valor: 70, wit: 58, gov: 54, retinue: 260, retTrain: 60, born: 1551 },
  { id: "sn5_karasawa3", name: "佐野宗綱", faction: "sano", y: 1573, at: "karasawa",
    lead: 68, valor: 74, wit: 60, gov: 56, retinue: 280, retTrain: 62, born: 1558 },
  { id: "mk_makabe4", name: "真壁道無", faction: "satake", y: 1565, at: "makabe",
    lead: 70, valor: 86, wit: 60, gov: 56, retinue: 270, retTrain: 66, born: 1550 },
  { id: "sm_yoshiyori", name: "里見義頼", faction: "satomi", y: 1558, at: "kururi",
    lead: 68, valor: 66, wit: 70, gov: 68, retinue: 320, retTrain: 60, born: 1543 },
  { id: "sm_yoritada", name: "正木頼忠", faction: "satomi", y: 1566, at: "tateyama",
    lead: 64, valor: 66, wit: 64, gov: 62, retinue: 250, retTrain: 60, born: 1551 },
  { id: "ut_takatsugu", name: "芳賀高継", faction: "utsunomiya", y: 1569, at: "utsunomiya",
    lead: 66, valor: 68, wit: 66, gov: 64, retinue: 270, retTrain: 60, born: 1554 },
  { id: "sn_fusatsuna", name: "佐野房綱", faction: "sano", y: 1573, at: "karasawa",
    lead: 66, valor: 66, wit: 72, gov: 68, retinue: 260, retTrain: 60, born: 1558 },
  { id: "st_yoshitsugu", name: "北義斯", faction: "satake", y: 1559, at: "ota_hitachi",
    lead: 68, valor: 68, wit: 66, gov: 64, retinue: 280, retTrain: 60, born: 1544 },
  { id: "st_yoshinari", name: "小場義成", faction: "satake", y: 1563, at: "makabe",
    lead: 68, valor: 70, wit: 64, gov: 62, retinue: 270, retTrain: 62, born: 1548 },
  { id: "st_masakage", name: "梶原政景", faction: "satake", y: 1563, at: "ota_hitachi",
    lead: 70, valor: 72, wit: 68, gov: 62, retinue: 270, retTrain: 62, born: 1548 },
  { id: "st_yoshimasa", name: "小野崎義昌", faction: "satake", y: 1565, at: "ota_hitachi",
    lead: 64, valor: 64, wit: 62, gov: 62, retinue: 260, retTrain: 58, born: 1550 },
  /* ── 層二の一（増補の第十三回）。織田・豊臣に仕える二列目と、徳川の三河衆。
     一五七〇年代から九〇年代が薄かった（三十年で七十三名しか居らず、
     一五五〇〜六〇年代の百六十四名に対して半分に満たない）。天下を狙う家の
     二代目・三代目が抜けていたのである。 */
  { id: "n_yoritaka", name: "蜂屋頼隆", faction: "oda", y: 1560, at: "shobata",
    lead: 70, valor: 72, wit: 64, gov: 62, retinue: 200, retTrain: 64, born: 1534 },
  { id: "n_hidetaka", name: "河尻秀隆", faction: "oda", y: 1552, at: "nagoya",
    lead: 72, valor: 74, wit: 64, gov: 60, retinue: 200, retTrain: 64, born: 1527 },
  { id: "n_naomasa2", name: "原田直政", faction: "oda", y: 1560, at: "nagoya",
    lead: 68, valor: 70, wit: 64, gov: 64, retinue: 190, retTrain: 62, born: 1535 },
  { id: "n_morimasa", name: "佐久間盛政", faction: "oda", y: 1569, at: "shobata",
    lead: 78, valor: 88, wit: 60, gov: 54, retinue: 200, retTrain: 70, born: 1554 },
  { id: "n_toshimasu", name: "前田慶次", faction: "oda", y: 1560, at: "nagoya",
    lead: 66, valor: 90, wit: 74, gov: 50, retinue: 150, retTrain: 66, born: 1533 },
  { id: "n_saizo", name: "可児才蔵", faction: "oda", y: 1569, at: "nagoya",
    lead: 58, valor: 92, wit: 56, gov: 44, retinue: 120, retTrain: 68, born: 1554 },
  { id: "n_kazuuji", name: "中村一氏", faction: "oda", y: 1570, at: "nagoya",
    lead: 70, valor: 68, wit: 70, gov: 72, retinue: 170, retTrain: 62, born: 1555 },
  { id: "n_yoshiharu", name: "堀尾吉晴", faction: "oda", y: 1558, at: "nagoya",
    lead: 74, valor: 72, wit: 74, gov: 78, retinue: 180, retTrain: 64, born: 1543 },
  { id: "n_yoshimasa", name: "田中吉政", faction: "oda", y: 1563, at: "nagoya",
    lead: 70, valor: 66, wit: 74, gov: 80, retinue: 170, retTrain: 60, born: 1548 },
  { id: "n_naosue", name: "一柳直末", faction: "oda", y: 1561, at: "nagoya",
    lead: 70, valor: 72, wit: 66, gov: 66, retinue: 170, retTrain: 62, born: 1546 },
  { id: "n_hidehisa", name: "仙石秀久", faction: "oda", y: 1567, at: "nagoya",
    lead: 66, valor: 78, wit: 56, gov: 58, retinue: 180, retTrain: 64, born: 1552 },
  { id: "n_yasuharu", name: "脇坂安治", faction: "oda", y: 1569, at: "nagoya",
    lead: 70, valor: 76, wit: 66, gov: 62, retinue: 170, retTrain: 64, born: 1554 },
  { id: "n_nagayasu", name: "平野長泰", faction: "oda", y: 1574, at: "nagoya",
    lead: 64, valor: 76, wit: 58, gov: 56, retinue: 150, retTrain: 64, born: 1559 },
  { id: "n_katsumoto", name: "片桐且元", faction: "oda", y: 1571, at: "nagoya",
    lead: 64, valor: 70, wit: 70, gov: 74, retinue: 160, retTrain: 60, born: 1556 },
  { id: "n_yoshiakira", name: "加藤嘉明", faction: "oda", y: 1578, at: "nagoya",
    lead: 76, valor: 82, wit: 68, gov: 66, retinue: 170, retTrain: 66, born: 1563 },
  { id: "n_takenori", name: "糟屋武則", faction: "oda", y: 1577, at: "nagoya",
    lead: 64, valor: 74, wit: 58, gov: 56, retinue: 150, retTrain: 62, born: 1562 },
  { id: "n_masaie", name: "長束正家", faction: "oda", y: 1577, at: "nagoya",
    lead: 56, valor: 52, wit: 76, gov: 86, retinue: 150, retTrain: 54, born: 1562 },
  { id: "n_nagayasu2", name: "前野長康", faction: "oda", y: 1560, at: "shobata",
    lead: 68, valor: 68, wit: 68, gov: 68, retinue: 180, retTrain: 62, born: 1528 },
  { id: "n_iemasa", name: "蜂須賀家政", faction: "oda", y: 1573, at: "nagoya",
    lead: 72, valor: 70, wit: 70, gov: 72, retinue: 190, retTrain: 62, born: 1558 },
  { id: "n_nagamasa3", name: "浅野長政", faction: "oda", y: 1562, at: "nagoya",
    lead: 68, valor: 66, wit: 74, gov: 82, retinue: 180, retTrain: 60, born: 1547 },
  { id: "n_yoshinaga", name: "浅野幸長", faction: "oda", y: 1591, at: "nagoya",
    lead: 72, valor: 74, wit: 66, gov: 66, retinue: 170, retTrain: 64, born: 1576 },
  { id: "m_chikayoshi", name: "平岩親吉", faction: "matsudaira", y: 1557, at: "okazaki",
    lead: 68, valor: 66, wit: 70, gov: 74, retinue: 170, retTrain: 62, born: 1542 },
  { id: "m_masanari", name: "内藤正成", faction: "matsudaira", y: 1552, at: "okazaki",
    lead: 66, valor: 82, wit: 58, gov: 54, retinue: 160, retTrain: 66, born: 1528 },
  { id: "m_moritsuna", name: "渡辺守綱", faction: "matsudaira", y: 1557, at: "okazaki",
    lead: 66, valor: 84, wit: 58, gov: 54, retinue: 160, retTrain: 68, born: 1542 },
  { id: "m_tadasa", name: "大久保忠佐", faction: "matsudaira", y: 1552, at: "okazaki",
    lead: 68, valor: 78, wit: 62, gov: 58, retinue: 170, retTrain: 66, born: 1537 },
  { id: "m_ietada", name: "松平家忠", faction: "matsudaira", y: 1570, at: "okazaki",
    lead: 64, valor: 64, wit: 66, gov: 70, retinue: 170, retTrain: 60, born: 1555 },
  { id: "m_nobumasa", name: "奥平信昌", faction: "matsudaira", y: 1570, at: "okazaki",
    lead: 74, valor: 76, wit: 68, gov: 64, retinue: 190, retTrain: 66, born: 1555 },
  { id: "m_shigetsugu", name: "本多重次", faction: "matsudaira", y: 1547, at: "okazaki",
    lead: 64, valor: 74, wit: 66, gov: 76, retinue: 160, retTrain: 62, born: 1529 },
  { id: "m_masakazu", name: "成瀬正一", faction: "matsudaira", y: 1553, at: "okazaki",
    lead: 66, valor: 68, wit: 68, gov: 70, retinue: 160, retTrain: 62, born: 1538 },
  { id: "m_shigetada", name: "酒井重忠", faction: "matsudaira", y: 1564, at: "okazaki",
    lead: 68, valor: 68, wit: 66, gov: 70, retinue: 180, retTrain: 62, born: 1549 },
  { id: "m_yasutaka", name: "大須賀康高", faction: "matsudaira", y: 1552, at: "okazaki",
    lead: 72, valor: 78, wit: 64, gov: 60, retinue: 180, retTrain: 66, born: 1527 },
  /* ── 層二の二（増補の第十四回）。関ヶ原に欠けていた者と、東国・西国の二列目。 */
  { id: "kb_hideaki", name: "小早川秀秋", faction: "kobayakawa", y: 1597, at: "mihara",
    lead: 58, valor: 60, wit: 50, gov: 52, retinue: 300, retTrain: 56, born: 1582 },
  { id: "mo_ekei", name: "安国寺恵瓊", faction: "mori", y: 1554, at: "koriyama_a",
    lead: 52, valor: 44, wit: 84, gov: 78, retinue: 150, retTrain: 52, born: 1539 },
  { id: "n_terumasa", name: "池田輝政", faction: "oda", y: 1580, at: "nagoya",
    lead: 76, valor: 74, wit: 72, gov: 74, retinue: 190, retTrain: 66, born: 1565 },
  { id: "az_takatsugu", name: "京極高次", faction: "azai", y: 1578, at: "odani",
    lead: 62, valor: 62, wit: 66, gov: 66, retinue: 260, retTrain: 58, born: 1563 },
  { id: "st_yoshishige", name: "佐竹義重", faction: "satake", y: 1562, at: "ota_hitachi",
    lead: 86, valor: 88, wit: 74, gov: 70, retinue: 380, retTrain: 68, born: 1547 },
  { id: "st_yoshinobu", name: "佐竹義宣", faction: "satake", y: 1585, at: "ota_hitachi",
    lead: 72, valor: 66, wit: 72, gov: 72, retinue: 340, retTrain: 62, born: 1570 },
  { id: "n_tamehiro", name: "平塚為広", faction: "oda", y: 1570, at: "nagoya",
    lead: 70, valor: 76, wit: 66, gov: 60, retinue: 170, retTrain: 64, born: 1555 },
  { id: "n_katsushige", name: "戸田勝成", faction: "oda", y: 1570, at: "nagoya",
    lead: 68, valor: 74, wit: 64, gov: 62, retinue: 170, retTrain: 62, born: 1555 },
  { id: "n_yoshiharu2", name: "大谷吉治", faction: "oda", y: 1590, at: "nagoya",
    lead: 64, valor: 72, wit: 62, gov: 58, retinue: 160, retTrain: 62, born: 1575 },
  { id: "ng_satoie", name: "蒲生郷舎", faction: "nagao", y: 1580, at: "kasugayama",
    lead: 68, valor: 74, wit: 64, gov: 58, retinue: 250, retTrain: 62, born: 1565 },
  { id: "n_maihyogo", name: "舞兵庫", faction: "oda", y: 1580, at: "nagoya",
    lead: 68, valor: 78, wit: 62, gov: 56, retinue: 160, retTrain: 64, born: 1565 },
  { id: "td_masanobu2", name: "高坂昌信", faction: "takeda", y: 1552, at: "fukashi",
    lead: 88, valor: 76, wit: 84, gov: 78, retinue: 280, retTrain: 74, born: 1527 },
  { id: "td_masasada", name: "三枝昌貞", faction: "takeda", y: 1552, at: "takato",
    lead: 70, valor: 76, wit: 64, gov: 60, retinue: 250, retTrain: 66, born: 1537 },
  { id: "td_morinobu", name: "仁科盛信", faction: "takeda", y: 1572, at: "takato",
    lead: 72, valor: 80, wit: 62, gov: 58, retinue: 280, retTrain: 66, born: 1557 },
  { id: "td_nobukatsu", name: "武田信勝", faction: "takeda", y: 1582, at: "tsutsujigasaki",
    lead: 58, valor: 60, wit: 56, gov: 56, retinue: 280, retTrain: 58, born: 1567 },
  { id: "td_masatsune", name: "土屋昌恒", faction: "takeda", y: 1571, at: "tsutsujigasaki",
    lead: 70, valor: 84, wit: 62, gov: 58, retinue: 250, retTrain: 68, born: 1556 },
  { id: "td_masamori", name: "小幡昌盛", faction: "takeda", y: 1549, at: "iwadono",
    lead: 68, valor: 76, wit: 62, gov: 58, retinue: 250, retTrain: 66, born: 1534 },
  { id: "ng_mitsuchika", name: "須田満親", faction: "nagao", y: 1552, at: "kasugayama",
    lead: 70, valor: 68, wit: 72, gov: 70, retinue: 260, retTrain: 62, born: 1526 },
  { id: "ng_kagetsugu", name: "甘粕景継", faction: "nagao", y: 1565, at: "sanjo",
    lead: 72, valor: 76, wit: 64, gov: 60, retinue: 260, retTrain: 64, born: 1550 },
  { id: "ng_yoshimoto", name: "安田能元", faction: "nagao", y: 1572, at: "kasugayama",
    lead: 70, valor: 70, wit: 68, gov: 66, retinue: 250, retTrain: 62, born: 1557 },
  { id: "ng_nobuyoshi", name: "岩井信能", faction: "nagao", y: 1568, at: "kasugayama",
    lead: 66, valor: 64, wit: 72, gov: 72, retinue: 240, retTrain: 60, born: 1553 },
  { id: "ng_saneyori", name: "大国実頼", faction: "nagao", y: 1577, at: "yoita",
    lead: 66, valor: 66, wit: 70, gov: 68, retinue: 240, retTrain: 60, born: 1562 },
  { id: "ng_harule", name: "柿崎晴家", faction: "nagao", y: 1565, at: "tochio",
    lead: 70, valor: 78, wit: 60, gov: 56, retinue: 260, retTrain: 66, born: 1550 },
  { id: "hj_ujikatsu", name: "北条氏勝", faction: "hojo", y: 1574, at: "tamanawa",
    lead: 66, valor: 68, wit: 62, gov: 62, retinue: 280, retTrain: 62, born: 1559 },
  { id: "hj_yasunaga", name: "松田康長", faction: "hojo", y: 1560, at: "nirayama",
    lead: 68, valor: 72, wit: 62, gov: 60, retinue: 260, retTrain: 62, born: 1545 },
  { id: "mo_motokiyo", name: "穂井田元清", faction: "mori", y: 1566, at: "koriyama_a",
    lead: 70, valor: 68, wit: 70, gov: 68, retinue: 280, retTrain: 62, born: 1551 },
  { id: "mo_hirotoshi", name: "福原広俊", faction: "mori", y: 1582, at: "koriyama_a",
    lead: 66, valor: 64, wit: 70, gov: 72, retinue: 260, retTrain: 60, born: 1567 },
  { id: "sz_tokitaka", name: "種子島時堯", faction: "shimazu", y: 1543, at: "uchijo",
    lead: 62, valor: 62, wit: 76, gov: 70, retinue: 220, retTrain: 60, born: 1528 },
  { id: "sz_tadazane", name: "伊集院忠真", faction: "shimazu", y: 1591, at: "uchijo",
    lead: 64, valor: 68, wit: 60, gov: 56, retinue: 250, retTrain: 60, born: 1576 },
  { id: "sz_nobumitsu", name: "猿渡信光", faction: "shimazu", y: 1548, at: "izumi",
    lead: 68, valor: 74, wit: 62, gov: 58, retinue: 250, retTrain: 64, born: 1533 },
  /* ── 層二の三（増補の第十五回）。薄い家を埋める。
     六万石以上の家を万石あたりで並べたところ、長野〇.三九、二本松〇.四五、
     白河〇.四五、由良〇.四六……と、東国と四国の小家が下に沈んでいた。
     初期配置で名の取れなかった家を、子の代で埋め合わせる。 */
  { id: "ng_bungoro", name: "疋田文五郎", faction: "nagano_k", y: 1552, at: "minowa",
    lead: 56, valor: 88, wit: 66, gov: 50, retinue: 140, retTrain: 68, born: 1537 },
  { id: "ng_muneharu", name: "神後宗治", faction: "nagano_k", y: 1554, at: "minowa",
    lead: 56, valor: 84, wit: 64, gov: 50, retinue: 140, retTrain: 66, born: 1539 },
  { id: "nh_kokuomaru", name: "畠山国王丸", faction: "nihonmatsu", y: 1595, at: "nihonmatsu",
    lead: 56, valor: 56, wit: 56, gov: 58, retinue: 260, retTrain: 56, born: 1580 },
  { id: "yr_sadashige", name: "由良貞繁", faction: "yura", y: 1581, at: "kanayama",
    lead: 64, valor: 66, wit: 62, gov: 62, retinue: 270, retTrain: 60, born: 1566 },
  { id: "od_haruhide", name: "土岐治英", faction: "oda_h", y: 1554, at: "oda",
    lead: 64, valor: 66, wit: 62, gov: 60, retinue: 260, retTrain: 60, born: 1539 },
  { id: "jb_nagazumi", name: "神保長住", faction: "jinbo", y: 1560, at: "toyama",
    lead: 62, valor: 62, wit: 60, gov: 60, retinue: 280, retTrain: 58, born: 1545 },
  { id: "kn_fujiatsu", name: "細野藤敦", faction: "kanbe", y: 1563, at: "kuwana",
    lead: 68, valor: 72, wit: 64, gov: 60, retinue: 270, retTrain: 62, born: 1548 },
  { id: "kn_mitsuyoshi", name: "分部光嘉", faction: "kanbe", y: 1567, at: "kuwana",
    lead: 66, valor: 68, wit: 68, gov: 66, retinue: 250, retTrain: 60, born: 1552 },
  { id: "sm_toshitane", name: "相馬利胤", faction: "soma", y: 1596, at: "soma",
    lead: 66, valor: 66, wit: 66, gov: 66, retinue: 280, retTrain: 60, born: 1581 },
  { id: "nr_nagachika", name: "成田長親", faction: "narita", y: 1561, at: "oshi",
    lead: 62, valor: 60, wit: 70, gov: 74, retinue: 260, retTrain: 58, born: 1546 },
  { id: "hg_nakataka", name: "下間仲孝", faction: "honganji", y: 1566, at: "ishiyama",
    lead: 66, valor: 66, wit: 70, gov: 70, retinue: 300, retTrain: 60, born: 1551 },
  { id: "hg_kyonyo", name: "教如", faction: "honganji", y: 1573, at: "ishiyama",
    lead: 66, valor: 56, wit: 76, gov: 74, retinue: 380, retTrain: 58, born: 1558 },
  { id: "sm_yoshiyasu", name: "里見義康", faction: "satomi", y: 1588, at: "tateyama",
    lead: 64, valor: 64, wit: 64, gov: 66, retinue: 320, retTrain: 60, born: 1573 },
  { id: "kn_michinao", name: "河野通直", faction: "kono", y: 1579, at: "yuzuki",
    lead: 58, valor: 58, wit: 58, gov: 60, retinue: 300, retTrain: 56, born: 1564 },
  { id: "sg_chikatsugu", name: "志賀親次", faction: "shiga", y: 1581, at: "oka",
    lead: 74, valor: 76, wit: 72, gov: 64, retinue: 280, retTrain: 64, born: 1566 },
  { id: "ck_chikayasu", name: "香宗我部親泰", faction: "chosokabe", y: 1558, at: "okou",
    lead: 74, valor: 72, wit: 76, gov: 70, retinue: 280, retTrain: 64, born: 1543 },
  { id: "ck_tadazumi", name: "谷忠澄", faction: "chosokabe", y: 1570, at: "okou",
    lead: 58, valor: 54, wit: 74, gov: 76, retinue: 200, retTrain: 56, born: 1555 },
  { id: "ck_chikasada", name: "吉良親貞", faction: "chosokabe", y: 1556, at: "okou",
    lead: 74, valor: 74, wit: 70, gov: 64, retinue: 270, retTrain: 64, born: 1541 },
  { id: "ku_michifusa", name: "来島通総", faction: "kurushima", y: 1576, at: "kokubunyama",
    lead: 68, valor: 72, wit: 64, gov: 58, retinue: 280, retTrain: 66, born: 1561 },
  { id: "ku_motoyoshi", name: "村上元吉", faction: "kurushima", y: 1568, at: "kokubunyama",
    lead: 70, valor: 74, wit: 66, gov: 58, retinue: 280, retTrain: 66, born: 1553 },
  { id: "ad_sanesue", name: "安東実季", faction: "ando", y: 1591, at: "hiyama",
    lead: 66, valor: 64, wit: 70, gov: 70, retinue: 280, retTrain: 60, born: 1576 },
  { id: "on_yoshimichi", name: "小野寺義道", faction: "onodera", y: 1581, at: "yokote",
    lead: 64, valor: 66, wit: 62, gov: 60, retinue: 280, retTrain: 60, born: 1566 },
  { id: "az_hirokado", name: "筑紫広門", faction: "akizuki", y: 1571, at: "akizuki",
    lead: 68, valor: 70, wit: 70, gov: 64, retinue: 260, retTrain: 62, born: 1556 },
  { id: "ar_harunobu", name: "有馬晴信", faction: "arima", y: 1582, at: "hinoe",
    lead: 66, valor: 66, wit: 68, gov: 66, retinue: 280, retTrain: 60, born: 1567 },
  { id: "om_yoshiaki", name: "大村喜前", faction: "omura", y: 1583, at: "omura",
    lead: 62, valor: 62, wit: 64, gov: 64, retinue: 260, retTrain: 58, born: 1568 },
  { id: "mt_shigenobu", name: "松浦鎮信", faction: "matsura", y: 1564, at: "hirado",
    lead: 70, valor: 68, wit: 72, gov: 70, retinue: 280, retTrain: 62, born: 1549 },
  { id: "so_yoshishige", name: "宗義調", faction: "so", y: 1547, at: "kanaishi",
    lead: 62, valor: 60, wit: 70, gov: 70, retinue: 200, retTrain: 56, born: 1532 },
  { id: "so_yoshitoshi", name: "宗義智", faction: "so", y: 1583, at: "kanaishi",
    lead: 64, valor: 62, wit: 74, gov: 72, retinue: 220, retTrain: 58, born: 1568 },
  { id: "dh_moriyasu", name: "戸沢盛安", faction: "daihoji", y: 1581, at: "ourayama",
    lead: 72, valor: 80, wit: 64, gov: 58, retinue: 270, retTrain: 64, born: 1566 },
  { id: "sw_tsunetaka", name: "岩城常隆", faction: "shirakawa", y: 1582, at: "shirakawa",
    lead: 66, valor: 68, wit: 62, gov: 60, retinue: 280, retTrain: 60, born: 1567 },
  /* ── 層二の四（増補の第十六回）。二列目の残りと、特殊勢力・水軍。 */
  { id: "n_nobukane", name: "織田信包", faction: "oda", y: 1558, at: "nagoya",
    lead: 66, valor: 66, wit: 66, gov: 68, retinue: 200, retTrain: 60, born: 1543 },
  { id: "n_nagamasu", name: "織田長益", faction: "oda", y: 1562, at: "nagoya",
    lead: 58, valor: 56, wit: 74, gov: 70, retinue: 170, retTrain: 56, born: 1547 },
  { id: "n_nobusumi", name: "津田信澄", faction: "oda", y: 1570, at: "nagoya",
    lead: 70, valor: 70, wit: 68, gov: 64, retinue: 190, retTrain: 62, born: 1555 },
  { id: "n_mitsutada", name: "明智光忠", faction: "oda", y: 1565, at: "nagoya",
    lead: 68, valor: 70, wit: 66, gov: 62, retinue: 180, retTrain: 62, born: 1550 },
  { id: "n_iesada", name: "木下家定", faction: "oda", y: 1558, at: "nagoya",
    lead: 58, valor: 56, wit: 64, gov: 70, retinue: 160, retTrain: 56, born: 1543 },
  { id: "n_chikamasa", name: "生駒親正", faction: "oda", y: 1552, at: "nagoya",
    lead: 68, valor: 66, wit: 70, gov: 74, retinue: 180, retTrain: 60, born: 1526 },
  { id: "n_nobuhide2", name: "佐久間信栄", faction: "oda", y: 1571, at: "nagoya",
    lead: 58, valor: 58, wit: 58, gov: 60, retinue: 180, retTrain: 58, born: 1556 },
  { id: "n_nagashige", name: "丹羽長重", faction: "oda", y: 1586, at: "nagoya",
    lead: 68, valor: 66, wit: 70, gov: 72, retinue: 200, retTrain: 60, born: 1571 },
  { id: "n_hideharu", name: "堀秀治", faction: "oda", y: 1591, at: "nagoya",
    lead: 66, valor: 64, wit: 66, gov: 68, retinue: 190, retTrain: 60, born: 1576 },
  { id: "n_tadamasa", name: "森忠政", faction: "oda", y: 1585, at: "shobata",
    lead: 70, valor: 70, wit: 68, gov: 70, retinue: 190, retTrain: 62, born: 1570 },
  { id: "my_kiyohide", name: "中川清秀", faction: "miyoshi", y: 1557, at: "itami",
    lead: 74, valor: 82, wit: 62, gov: 58, retinue: 260, retTrain: 66, born: 1542 },
  { id: "my_ukon", name: "高山右近", faction: "miyoshi", y: 1567, at: "itami",
    lead: 74, valor: 76, wit: 74, gov: 72, retinue: 250, retTrain: 66, born: 1552 },
  { id: "my_yoshitsugu", name: "三好義継", faction: "miyoshi", y: 1564, at: "iimoriyama",
    lead: 58, valor: 60, wit: 54, gov: 56, retinue: 320, retTrain: 58, born: 1549 },
  { id: "my_muratsugu", name: "荒木村次", faction: "miyoshi", y: 1575, at: "itami",
    lead: 62, valor: 64, wit: 60, gov: 58, retinue: 230, retTrain: 60, born: 1560 },
  { id: "am_hisatsuna", name: "立原久綱", faction: "amago", y: 1547, at: "gassan",
    lead: 72, valor: 72, wit: 74, gov: 66, retinue: 260, retTrain: 64, born: 1531 },
  { id: "am_korenori", name: "亀井茲矩", faction: "amago", y: 1572, at: "gassan",
    lead: 68, valor: 68, wit: 74, gov: 72, retinue: 240, retTrain: 62, born: 1557 },
  { id: "sa_tatsuoki", name: "斎藤龍興", faction: "saito", y: 1563, at: "inabayama",
    lead: 52, valor: 56, wit: 50, gov: 52, retinue: 340, retTrain: 56, born: 1548 },
  { id: "kg_raijun2", name: "下間頼純", faction: "kaga_ikko", y: 1560, at: "kanazawa",
    lead: 66, valor: 64, wit: 70, gov: 68, retinue: 300, retTrain: 60, born: 1545 },
  { id: "kg_mikawa", name: "山川三河", faction: "kaga_ikko", y: 1558, at: "kanazawa",
    lead: 68, valor: 72, wit: 62, gov: 56, retinue: 290, retTrain: 62, born: 1543 },
  { id: "kg_kaneaki", name: "坪坂包明", faction: "kaga_ikko", y: 1560, at: "komatsu",
    lead: 66, valor: 70, wit: 62, gov: 58, retinue: 280, retTrain: 62, born: 1545 },
  { id: "kg_yorinobu", name: "鏑木頼信", faction: "kaga_ikko", y: 1562, at: "torigoe",
    lead: 66, valor: 68, wit: 64, gov: 60, retinue: 270, retTrain: 60, born: 1547 },
  { id: "ig_yasunaga", name: "服部保長", faction: "iga", y: 1547, at: "ueno_iga",
    lead: 60, valor: 70, wit: 76, gov: 58, retinue: 160, retTrain: 62, born: 1520 },
  { id: "ig_yazaemon", name: "城戸弥左衛門", faction: "iga", y: 1560, at: "ueno_iga",
    lead: 52, valor: 78, wit: 74, gov: 46, retinue: 130, retTrain: 62, born: 1545 },
  { id: "ry_shoei", name: "尚永王", faction: "ryukyu", y: 1574, at: "shurijo",
    lead: 56, valor: 52, wit: 62, gov: 66, retinue: 260, retTrain: 54, born: 1559 },
  { id: "ry_shonei", name: "尚寧王", faction: "ryukyu", y: 1579, at: "shurijo",
    lead: 56, valor: 52, wit: 64, gov: 66, retinue: 260, retTrain: 54, born: 1564 },
  { id: "kk_moritaka", name: "九鬼守隆", faction: "kuki", y: 1588, at: "toba",
    lead: 72, valor: 72, wit: 70, gov: 66, retinue: 280, retTrain: 66, born: 1573 },
  { id: "hg_junnyo", name: "准如", faction: "honganji", y: 1592, at: "ishiyama",
    lead: 58, valor: 50, wit: 70, gov: 72, retinue: 320, retTrain: 56, born: 1577 },
  /* ── 層三の一（増補の第十七回）。大坂の陣。

     照合したところ、大坂五人衆のうち盤に居るのは長宗我部盛親だけであった。
     真田信繁も後藤又兵衛も木村重成も毛利勝永も明石全登も居ない。豊臣秀頼も
     居ない。関ヶ原は第十四回で埋めたが、その十五年後の最後の戦がまるごと
     抜けていたことになる。 */
  { id: "ts_hideyori", name: "豊臣秀頼", faction: "oda", y: 1608, at: "nagoya",
    lead: 58, valor: 58, wit: 60, gov: 62, retinue: 420, retTrain: 58, born: 1593 },
  { id: "ts_nobushige", name: "真田信繁", faction: "takeda", y: 1582, at: "komoro",
    lead: 88, valor: 86, wit: 88, gov: 70, retinue: 280, retTrain: 72, born: 1567 },
  { id: "ts_motsugu", name: "後藤基次", faction: "akamatsu", y: 1575, at: "himeji",
    lead: 82, valor: 90, wit: 70, gov: 58, retinue: 250, retTrain: 72, born: 1560 },
  { id: "ts_shigenari", name: "木村重成", faction: "oda", y: 1608, at: "nagoya",
    lead: 74, valor: 82, wit: 66, gov: 60, retinue: 230, retTrain: 68, born: 1593 },
  { id: "ts_katsunaga", name: "毛利勝永", faction: "oda", y: 1592, at: "nagoya",
    lead: 82, valor: 84, wit: 72, gov: 62, retinue: 260, retTrain: 70, born: 1577 },
  { id: "ts_takenori", name: "明石全登", faction: "uragami", y: 1578, at: "ishiyama_bz",
    lead: 78, valor: 78, wit: 74, gov: 66, retinue: 250, retTrain: 68, born: 1563 },
  { id: "ts_naoyuki", name: "塙直之", faction: "oda", y: 1582, at: "nagoya",
    lead: 68, valor: 88, wit: 58, gov: 50, retinue: 200, retTrain: 68, born: 1567 },
  { id: "ts_harunaga", name: "大野治長", faction: "oda", y: 1584, at: "nagoya",
    lead: 58, valor: 58, wit: 62, gov: 64, retinue: 260, retTrain: 58, born: 1569 },
  { id: "ts_harufusa", name: "大野治房", faction: "oda", y: 1590, at: "nagoya",
    lead: 66, valor: 74, wit: 56, gov: 52, retinue: 230, retTrain: 62, born: 1575 },
  { id: "ts_tadasu", name: "渡辺糺", faction: "oda", y: 1585, at: "nagoya",
    lead: 66, valor: 76, wit: 60, gov: 56, retinue: 210, retTrain: 64, born: 1570 },
  { id: "ts_kanesuke", name: "薄田兼相", faction: "oda", y: 1584, at: "nagoya",
    lead: 62, valor: 84, wit: 52, gov: 48, retinue: 200, retTrain: 66, born: 1569 },
  { id: "ts_masatomo", name: "御宿政友", faction: "matsudaira", y: 1582, at: "okazaki",
    lead: 68, valor: 78, wit: 62, gov: 58, retinue: 210, retTrain: 64, born: 1567 },
  { id: "ts_yukihiro", name: "氏家行広", faction: "saito", y: 1561, at: "ogaki",
    lead: 64, valor: 66, wit: 64, gov: 62, retinue: 240, retTrain: 60, born: 1546 },
  { id: "ts_daisuke", name: "真田大助", faction: "takeda", y: 1612, at: "komoro",
    lead: 62, valor: 70, wit: 60, gov: 54, retinue: 180, retTrain: 62, born: 1597 },
  { id: "ts_sadataka", name: "片桐貞隆", faction: "oda", y: 1575, at: "nagoya",
    lead: 60, valor: 62, wit: 66, gov: 70, retinue: 190, retTrain: 58, born: 1560 },
  // ── 寄せ手（徳川方）
  { id: "ts_hideyasu", name: "結城秀康", faction: "matsudaira", y: 1589, at: "okazaki",
    lead: 76, valor: 80, wit: 66, gov: 64, retinue: 300, retTrain: 66, born: 1574 },
  { id: "ts_tadanao", name: "松平忠直", faction: "matsudaira", y: 1610, at: "okazaki",
    lead: 70, valor: 78, wit: 58, gov: 54, retinue: 300, retTrain: 64, born: 1595 },
  { id: "ts_tadatomo", name: "本多忠朝", faction: "matsudaira", y: 1597, at: "okazaki",
    lead: 72, valor: 80, wit: 62, gov: 58, retinue: 240, retTrain: 66, born: 1582 },
  { id: "ts_hidemasa", name: "小笠原秀政", faction: "matsudaira", y: 1584, at: "okazaki",
    lead: 68, valor: 70, wit: 66, gov: 66, retinue: 250, retTrain: 62, born: 1569 },
  { id: "ts_nobuyuki", name: "真田信之", faction: "takeda", y: 1581, at: "komoro",
    lead: 74, valor: 70, wit: 76, gov: 78, retinue: 280, retTrain: 66, born: 1566 },
  { id: "ts_katsushige", name: "板倉勝重", faction: "matsudaira", y: 1560, at: "okazaki",
    lead: 54, valor: 50, wit: 80, gov: 88, retinue: 180, retTrain: 54, born: 1545 },
  { id: "ts_naotsugu", name: "安藤直次", faction: "matsudaira", y: 1570, at: "okazaki",
    lead: 68, valor: 74, wit: 70, gov: 72, retinue: 220, retTrain: 64, born: 1555 },
  /* ── 層三の二（増補の第十八回）。島原の乱と、江戸初期の諸藩・幕政の人。

     「一六〇〇年に日本統一、一七〇〇年に世界制覇」という構想であるから、
     この層は「もし戦国が続いていたら」の想定で置く。海の外へ出た者
     （支倉常長・山田長政・三浦按針）を厚めに入れたのはそのためである。 */
  // ── 島原の乱（一六三七〜三八）
  { id: "e_shigemasa2", name: "板倉重昌", faction: "matsudaira", y: 1603, at: "okazaki",
    lead: 68, valor: 72, wit: 66, gov: 70, retinue: 240, retTrain: 62, born: 1588 },
  { id: "e_ujikane", name: "戸田氏鉄", faction: "saito", y: 1591, at: "ogaki",
    lead: 70, valor: 68, wit: 70, gov: 74, retinue: 260, retTrain: 62, born: 1576 },
  { id: "e_katataka", name: "寺沢堅高", faction: "matsura", y: 1624, at: "hirado",
    lead: 56, valor: 56, wit: 56, gov: 54, retinue: 240, retTrain: 56, born: 1609 },
  { id: "e_shigenari2", name: "鈴木重成", faction: "matsudaira", y: 1603, at: "okazaki",
    lead: 62, valor: 62, wit: 72, gov: 80, retinue: 200, retTrain: 58, born: 1588 },
  { id: "e_emosaku", name: "山田右衛門作", faction: "arima", y: 1600, at: "hinoe",
    lead: 54, valor: 54, wit: 70, gov: 58, retinue: 150, retTrain: 54, born: 1585 },
  { id: "e_yoshitsugu", name: "益田好次", faction: "arima", y: 1600, at: "hinoe",
    lead: 60, valor: 62, wit: 66, gov: 60, retinue: 180, retTrain: 58, born: 1585 },
  // ── 各藩の重臣
  { id: "e_mitsumasa", name: "池田光政", faction: "oda", y: 1624, at: "nagoya",
    lead: 66, valor: 62, wit: 76, gov: 86, retinue: 300, retTrain: 60, born: 1609 },
  { id: "e_tadayoshi2", name: "山内忠義", faction: "chosokabe", y: 1607, at: "okou",
    lead: 64, valor: 64, wit: 66, gov: 70, retinue: 280, retTrain: 60, born: 1592 },
  { id: "e_takatsugu", name: "藤堂高次", faction: "oda", y: 1617, at: "nagoya",
    lead: 64, valor: 64, wit: 66, gov: 70, retinue: 280, retTrain: 60, born: 1602 },
  { id: "e_mitsunao", name: "細川光尚", faction: "ashikaga", y: 1634, at: "nijo",
    lead: 64, valor: 64, wit: 66, gov: 70, retinue: 280, retTrain: 60, born: 1619 },
  { id: "e_yoshitaka2", name: "佐竹義隆", faction: "satake", y: 1624, at: "ota_hitachi",
    lead: 64, valor: 62, wit: 66, gov: 70, retinue: 280, retTrain: 58, born: 1609 },
  // ── 幕政と学び
  { id: "e_tenkai", name: "天海", faction: "matsudaira", y: 1551, at: "okazaki",
    lead: 54, valor: 46, wit: 90, gov: 84, retinue: 150, retTrain: 52, born: 1536 },
  { id: "e_suden", name: "金地院崇伝", faction: "matsudaira", y: 1584, at: "okazaki",
    lead: 52, valor: 44, wit: 86, gov: 82, retinue: 140, retTrain: 50, born: 1569 },
  { id: "e_razan", name: "林羅山", faction: "matsudaira", y: 1598, at: "okazaki",
    lead: 48, valor: 42, wit: 84, gov: 80, retinue: 130, retTrain: 48, born: 1583 },
  { id: "e_takuan", name: "沢庵宗彭", faction: "tsutsui", y: 1588, at: "koriyama",
    lead: 50, valor: 46, wit: 84, gov: 70, retinue: 130, retTrain: 48, born: 1573 },
  { id: "e_nagayasu2", name: "大久保長安", faction: "takeda", y: 1560, at: "tsutsujigasaki",
    lead: 54, valor: 50, wit: 82, gov: 90, retinue: 160, retTrain: 52, born: 1545 },
  { id: "e_shozaburo", name: "後藤庄三郎", faction: "matsudaira", y: 1586, at: "okazaki",
    lead: 48, valor: 44, wit: 78, gov: 86, retinue: 130, retTrain: 48, born: 1571 },
  { id: "e_chaya", name: "茶屋四郎次郎", faction: "matsudaira", y: 1560, at: "okazaki",
    lead: 50, valor: 46, wit: 80, gov: 84, retinue: 130, retTrain: 48, born: 1545 },
  { id: "e_soukyu", name: "今井宗久", faction: "miyoshi", y: 1547, at: "ishiyama",
    lead: 52, valor: 44, wit: 84, gov: 82, retinue: 140, retTrain: 48, born: 1520 },
  // ── 数寄と技
  { id: "e_enshu", name: "小堀遠州", faction: "azai", y: 1594, at: "odani",
    lead: 54, valor: 50, wit: 80, gov: 78, retinue: 150, retTrain: 52, born: 1579 },
  { id: "e_oribe", name: "古田織部", faction: "oda", y: 1559, at: "nagoya",
    lead: 58, valor: 60, wit: 78, gov: 68, retinue: 160, retTrain: 56, born: 1544 },
  { id: "e_koetsu", name: "本阿弥光悦", faction: "ashikaga", y: 1573, at: "nijo",
    lead: 46, valor: 44, wit: 82, gov: 70, retinue: 120, retTrain: 46, born: 1558 },
  // ── 海の外へ出た者
  { id: "e_tsunenaga", name: "支倉常長", faction: "date", y: 1586, at: "yonezawa",
    lead: 64, valor: 66, wit: 78, gov: 72, retinue: 180, retTrain: 60, born: 1571 },
  { id: "e_yamada", name: "山田長政", faction: "imagawa", y: 1605, at: "sunpu",
    lead: 76, valor: 78, wit: 78, gov: 66, retinue: 200, retTrain: 66, born: 1590 },
  { id: "e_anjin", name: "三浦按針", faction: "matsudaira", y: 1600, at: "okazaki",
    lead: 56, valor: 54, wit: 86, gov: 74, retinue: 140, retTrain: 52, born: 1564 },
];

// 家を持つ者に子が生まれる。名は通字を継ぐ。
export const KANJI_TSUJI = ["政", "秀", "忠", "康", "隆", "長", "元", "信", "義", "重", "family",
  "종"].filter((x) => /^[一-龯]$/.test(x));

/* ------------------------------------------------ 家（GDD 6.5）
   大名の家には血の繋がりがある。誰が誰の子かを定めておけば、
   家督は血筋に従って継がれ、一門は結束する。 */
// 子 → 親。史実の親子関係。
export const PARENT = {
  nobunaga: "nobuhide", nobuyuki: "nobuhide",
  n_nobutada: "nobunaga", n_nobukatsu: "nobunaga", n_nobutaka: "nobunaga",
  yoshitatsu: "dosan",
  jikkyu: "nagayoshi", fuyuyasu: "nagayoshi", sogo: "nagayoshi",   // 三好の兄弟
  ujizane: "yoshimoto",
  nobushige: "shingen", nobukado: "shingen", katsuyori: "shingen",
  katsuyori2: "nobushige",
  ujiteru: "ujiyasu", ujikuni: "ujiyasu", ujimasa: "ujiyasu", tsunanari2: "ujiyasu",
  h2_ujikuni2: "ujiyasu", h2_ujifusa: "ujimasa", terumune: "harumune", masamune_d: "terumune", e_masamune3: "masamune_d",
  yoshihisa: "takahisa", yoshihiro_s: "takahisa", toshihisa: "takahisa", iehisa: "takahisa",
  sz_tadatsune: "yoshihiro_s", sz_toyohisa: "iehisa",
  takamoto: "motonari", motoharu: "motonari", takakage_k: "motonari",
  terumoto: "takamoto", mo_motoharu2: "motoharu", mo_hiroie: "motoharu",
  motochika: "kunichika", ck_chikamasa: "kunichika", ck_morichika: "motochika",
  nobuchika_c: "motochika",
  yoshiaki_m: "yoshimori", mg_yoshiaki2: "yoshiaki_m",
  ot_yoshimune: "yoshishige",
  nagamasa: "hisamasa",
  yoshikage: "takakage",
  junkei: "junsho",
  ujizane2: "ujitane",
  hisamichi: "hisahide",
  kunihisa: "haruhisa", ujihisa: "kunihisa",
  ieyasu: "hirotada", m_tadateru: "ieyasu", m_hidetada: "ieyasu",
  e_yoshinao: "ieyasu", e_yorinobu: "ieyasu", e_yorifusa: "ieyasu",
  yoshihiro: "yoshitaka_s",
  tomonori: "harutomo",
  saneteru: "motozane", shingai3: "saneteru",
  // ── 家臣の家。父子が揃って登場する者を結ぶ。
  e_nagamasa2: "kanbei_k",        // 黒田孝高 → 長政
  kanbei_k: "ak_himeji2",         // 黒田職隆 → 孝高
  e_tadayuki: "e_nagamasa2",      // 長政 → 忠之
  muneshige: "shigetane",         // 高橋紹運 → 立花宗茂
  e_muneshige2: "shigetane",      // 紹運 → 高橋直次
  e_tadakatsu2: "tadakatsu",      // 本多忠勝 → 忠政
  e_yasukatsu: "yasumasa",        // 榊原康政 → 康勝
  e_naotaka: "naomasa",           // 井伊直政 → 直孝
  e_masazumi: "m_masanobu",       // 本多正信 → 正純
  e_tadatoshi: "e_tadaoki",       // 細川忠興 → 忠利
  e_katsushige: "rz_saga2",       // 鍋島直茂 → 勝茂
  e_hidemoto: "mo_motoharu2",     // 吉川元長 → （毛利秀元は別家だが縁者）
  n_toshimasa: "toshiie",
  n_mitsuharu: "mitsuhide",       // 明智光秀 → 秀満（女婿）
  e_kagekatsu2: "kagekatsu",      // 上杉景勝 → 定勝
  // ── 上野・武蔵北（増補の第一回）
  uy_narishige: "uy_nobunari",    // 和田信業 → 業繁
  uy_nobusada: "uy_norishige",    // 小幡憲重 → 信貞
  uy_naoyuki: "uy_yukimasa",      // 倉賀野行政 → 尚行
  uy_kageshige: "uy_shigeshige",  // 安中重繁 → 景繁
  uy_kagenaga: "uy_masanaga",     // 長尾当長 → 景長（足利長尾。養子）
  uy_nagatomo: "u_fukaya3",       // 秋元景朝 → 長朝
  uy_kageyoshi: "numata",         // 沼田顕泰 → 景義
  uy_ujinori: "uy_norimori",      // 上杉憲盛 → 氏憲（深谷上杉）
  uy_terukage: "uesugi2",         // 長尾憲景 → 輝景（白井長尾）
  ng_yoshinari: "narimasa_n",     // 長野業正 → 吉業
  nagano2: "narimasa_n",          // 長野業正 → 業盛
  yura2: "naritashige",           // 由良成繁 → 国繁
  yr_akinaga: "naritashige",      // 由良成繁 → 顕長
  // ── 越前・近江（増補の第二回）
  yoshikata: "rk_sadayori",       // 六角定頼 → 義賢
  rk_yoshiharu: "yoshikata",      // 六角義賢 → 義治
  rk_takaharu: "kagechika",       // 後藤賢豊 → 高治
  // ── 甲斐・信濃・駿河（増補の第三回）
  td_nobunori: "nobukata",        // 板垣信方 → 信憲
  td_masatada: "toramasa",        // 甘利虎泰 → 昌忠
  td_masanao: "td_masatoshi",     // 保科正俊 → 正直
  td_yasukage: "td_takatoshi",    // 横田高松 → 康景（養子）
  im_yasukatsu: "ujitane",        // 朝比奈泰能 → 泰勝
  sa_sadamichi: "yoshimichi",     // 稲葉良通 → 貞通
  // ── 相模・武蔵・下総・常陸（増補の第四回）
  hj_ujishige: "tsunashige",      // 北条綱成 → 氏繁（玉縄）
  hj_hidenobu: "hj_shigenaga",    // 大藤栄永 → 秀信
  ujinori2: "hj_morihide",        // 松田盛秀 → 憲秀
  ot5_iwatsuki3: "sukemasa",      // 太田資正 → 資武
  ot_ujisuke: "sukemasa",         // 太田資正 → 氏資
  ed_michimasa: "michifusa",      // 江戸忠通 → 通政
  ed_masamoto: "fuchu",           // 大掾慶幹 → 政幹
  cb_chikatane: "tanenobu",       // 千葉利胤 → 親胤
  kg_yoshiuji: "haruuji",         // 足利晴氏 → 義氏
  kg_fujiuji: "haruuji",          // 足利晴氏 → 藤氏
  nr_ujinaga: "nagayasu_n",       // 成田長泰 → 氏長
  yk_harutomo: "masakatsu",       // 結城政勝 → 晴朝（養子）
  // ── 畿内（増補の第五回）
  yoshiteru: "ak_yoshiharu",      // 足利義晴 → 義輝
  my_nagaharu: "jikkyu",          // 三好実休 → 長治
  my_yasutoshi: "m_yasunaga",     // 三好康長 → 康俊
  my_nagamasa: "my_nobumasa",     // 池田信正 → 長正
  hg_kennyo: "kennyo",            // 証如 → 顕如
  bs_nagaharu: "shigemune",       // 別所就治 → 長治
  ak_yoshisuke: "harumasa",       // 赤松晴政 → 義祐
  bs_yoshichika: "shigemune",     // 別所就治 → 吉親
  ht_harumichi: "hideharu",       // 波多野秀忠 → 晴通
  ts_junsei: "junsho",            // 筒井順昭 → 順政（弟）
  // ── 陸奥南（増補の第六回）
  harumune: "dt_tanemune",        // 伊達稙宗 → 晴宗（天文の乱で争う父子）
  dt_hisanaka: "dt_munetoki",     // 中野宗時 → 牧野久仲
  kagetsuna: "dt_kageshige",      // 片倉景重 → 景綱
  moriuji: "as_morikiyo",         // 蘆名盛舜 → 盛氏
  as_morioki: "moriuji",          // 蘆名盛氏 → 盛興
  moritane: "sm_akitane",         // 相馬顕胤 → 盛胤
  sm_soma2: "moritane",           // 相馬盛胤 → 義胤
  nh_nihonmatsu2: "nihonmatsu_g", // 畠山義国 → 義継
  sw_shirakawa2: "shirakawa_g",   // 結城晴綱 → 義親
  nk_sukagawa2: "nikaido_g",      // 二階堂照行 → 盛義
  // ── 陸奥北・出羽（増補の第七回）
  ab_yokota2: "abe_g",            // 阿曽沼広郷 → 広長
  nobunao: "nb_takanobu",         // 石川高信 → 南部信直
  kunohe_g: "kn_nobunaka",        // 九戸信仲 → 政実
  kh_kunohe2: "kn_nobunaka",      // 九戸信仲 → 実親
  kasai_g: "ks_harutane",         // 葛西晴胤 → 晴信
  ks_teraike2: "ks_harutane",     // 葛西晴胤 → 親信
  os_yoshitaka: "osaki_g",        // 大崎義直 → 義隆
  mg_yoshitoki: "yoshimori",      // 最上義守 → 中野義時
  chikasue: "ando_g",             // 安東舜季 → 愛季
  nm_akimura: "namioka_g",        // 浪岡具運 → 顕村
  dh_yoshiuji: "daihoji_g",       // 大宝寺義増 → 義氏
  td_tendo2: "tendo_g",           // 天童頼長 → 頼澄
  or_tamenori: "or_masanobu",     // 大浦政信 → 為則
  // ── 北陸（増補の第八回）
  kagetora: "ng_harukage",        // 長尾晴景 → 景虎（兄弟。家督はここを通って移る）
  hy_yoshitsuna: "yoshitsugu",    // 畠山義続 → 義綱
  hy_tsunatsura: "nagatsuna",     // 長続連 → 綱連
  hy_kagetaka: "hy_nanao3",       // 温井総貞 → 景隆
  // ── 九州北（増補の第九回）
  yoshishige: "ot_yoshiaki",      // 大友義鑑 → 義鎮
  takanobu_r: "rz_tanehide",      // 龍造寺胤栄 → 隆信（家督を継ぐ）
  az_harutane: "tanezane",        // 秋月文種 → 晴種
  az_akizuki2: "tanezane",        // 秋月文種 → 種実
  kk_chikakata: "kk_kumamoto2",   // 城親冬 → 親賢
  it_yoshimasu: "yoshisuke",      // 伊東義祐 → 義益
  it_sukekatsu: "yoshisuke",      // 伊東義祐 → 祐兵
  sr_yorifusa: "yoriharu",        // 相良晴広 → 頼房
  // ── 中国・九州南（増補の第十回）
  takahisa: "sz_tadayoshi2",      // 島津忠良（日新斎）→ 貴久
  sz_tadamune: "shigehisa",       // 伊集院忠朗 → 忠棟
  nj_uyui3: "masayori",           // 南条宗勝 → 小鴨元清
  nj_uyui2: "masayori",           // 南条宗勝 → 元続
  mm_matsuyama2: "iemichi",       // 三村家親 → 元親
  ms_miyake2: "fujikane",         // 益田藤兼 → 元祥
  o_nagafusa: "harukata",         // 陶晴賢 → 長房
  // ── 伊勢・尾張・四国（増補の第十一回）
  kk_kiyotaka: "kk_sadataka",     // 九鬼定隆 → 浄隆
  yoshitaka: "kk_sadataka",       // 九鬼定隆 → 嘉隆
  sumitaka: "kk_kiyotaka",        // 九鬼浄隆 → 澄隆
  kb_tomofusa: "tomonori",        // 北畠具教 → 具房
  kb_tomofuji: "tomonori",        // 北畠具教 → 長野具藤
  ise_nobukata: "nobuyasu",       // 織田信安 → 信賢
  ic_kanesada: "kanetsugu_i",     // 一条房基 → 兼定
  ujiyoshi: "kn_tanefuji",        // 長野稙藤 → 藤定
  // ── 常陸・下野・安房（増補の第十二回）
  hirotsuna: "ut_hisatsuna",      // 宇都宮尚綱 → 広綱
  ut_takatsugu: "utsunomiya2",    // 芳賀高定 → 高継
  ujiharu: "od_masaharu",         // 小田政治 → 氏治
  masatsuna: "sano2",             // 佐野豊綱 → 昌綱
  sn5_karasawa3: "masatsuna",     // 佐野昌綱 → 宗綱
  sn_fusatsuna: "masatsuna",      // 佐野昌綱 → 房綱
  ns_suketane: "masasuke",        // 那須高資 → 資胤（弟）
  ns_tsunakiyo: "ns5_karasuyama3",// 大田原資清 → 綱清
  sm5_tateyama3: "satomi2",       // 正木時忠 → 時通
  sm_yoritada: "satomi2",         // 正木時忠 → 頼忠
  sm5_otaki2: "otaki",            // 正木時茂 → 憲時
  sm_yoshiyori: "yoshihiro",      // 里見義弘 → 義頼
  mk_makabe4: "makabe",           // 真壁久幹 → 道無（氏幹）
  // ── 層二の一（増補の第十三回）
  n_yoshinaga: "n_nagamasa3",     // 浅野長政 → 幸長
  n_iemasa: "nagamasa3",          // 蜂須賀正勝 → 家政
  m_tadasa: "m_tadayo",           // 大久保忠世 → 忠佐（兄弟）
  // ── 層二の二（増補の第十四回）
  kb_hideaki: "takakage_k",       // 小早川隆景 → 秀秋（養子）
  n_terumasa: "tsuneoki",         // 池田恒興 → 輝政
  n_yoshiharu2: "n_yoshitsugu",   // 大谷吉継 → 吉治
  st_yoshishige: "yoshiaki",      // 佐竹義昭 → 義重
  st_yoshinobu: "st_yoshishige",  // 佐竹義重 → 義宣
  td_morinobu: "shingen",         // 武田晴信 → 仁科盛信
  td_nobukatsu: "katsuyori",      // 武田勝頼 → 信勝
  hj_ujikatsu: "hj_ujishige",     // 北条氏繁 → 氏勝
  mo_motokiyo: "motonari",        // 毛利元就 → 穂井田元清
  sz_tadazane: "sz_tadamune",     // 伊集院忠棟 → 忠真
  ng_harule: "masakage_n",        // 柿崎景家 → 晴家
  // ── 層二の三（増補の第十五回）
  nh_kokuomaru: "nh_nihonmatsu2", // 畠山義継 → 国王丸
  yr_sadashige: "yr_akinaga",     // 長尾顕長 → 由良貞繁
  jb_nagazumi: "nagamoto",        // 神保長職 → 長住
  sm_toshitane: "sm_soma2",       // 相馬義胤 → 利胤
  hg_kyonyo: "hg_kennyo",         // 顕如 → 教如
  sm_yoshiyasu: "sm_yoshiyori",   // 里見義頼 → 義康
  ck_chikayasu: "motochika",      // 長宗我部元親 → 香宗我部親泰（弟）
  ck_chikasada: "motochika",      // 長宗我部元親 → 吉良親貞（弟）
  ku_michifusa: "michiyasu",      // 村上通康 → 来島通総
  ad_sanesue: "chikasue",         // 安東愛季 → 実季
  on_yoshimichi: "onodera_g",     // 小野寺景道 → 義道
  ar_harunobu: "ar_hinoe2",       // 有馬義貞 → 晴信
  so_yoshitoshi: "so_yoshishige", // 宗義調 → 義智
  mt_shigenobu: "takanobu_m",     // 松浦隆信 → 鎮信
  // ── 層二の四（増補の第十六回）
  shingen: "td_nobutora",         // 武田信虎 → 晴信（追われた父と、追った子）
  n_nobukane: "nobuhide",         // 織田信秀 → 信包
  n_nagamasu: "nobuhide",         // 織田信秀 → 長益（有楽斎）
  n_nobuhide2: "nobumori",        // 佐久間信盛 → 信栄
  n_nagashige: "nagahide",        // 丹羽長秀 → 長重
  n_hideharu: "n_ieyasu2",        // 堀秀政 → 秀治
  n_tadamasa: "yoshinari",        // 森可成 → 忠政
  n_mitsutada: "mitsuhide",       // 明智光秀 → 光忠（従弟）
  my_muratsugu: "mitsuhide2",     // 荒木村重 → 村次
  am_korenori: "am_shikanosuke",  // 山中鹿介 → 亀井茲矩（女婿）
  kk_moritaka: "yoshitaka",       // 九鬼嘉隆 → 守隆
  hg_junnyo: "hg_kennyo",         // 顕如 → 准如
  ry_shonei: "ry_shoei",          // 尚永王 → 尚寧王
  // ── 層三の一（増補の第十七回。大坂の陣）
  ts_hideyori: "hideyoshi",       // 豊臣秀吉 → 秀頼
  ts_nobushige: "masayuki",       // 真田昌幸 → 信繁
  ts_nobuyuki: "masayuki",        // 真田昌幸 → 信之
  ts_daisuke: "ts_nobushige",     // 真田信繁 → 大助
  ts_harufusa: "ts_harunaga",     // 大野治長 → 治房（兄弟）
  ts_tadatomo: "tadakatsu",       // 本多忠勝 → 忠朝
  ts_hideyasu: "ieyasu",          // 松平元康（家康）→ 結城秀康
  ts_tadanao: "ts_hideyasu",      // 結城秀康 → 松平忠直
  ts_sadataka: "n_katsumoto",     // 片桐且元 → 貞隆（兄弟）
  // ── 層三の二（増補の第十八回）
  e_shigemasa2: "ts_katsushige", // 板倉勝重 → 重昌
  e_mitsumasa: "n_terumasa",     // 池田輝政 → 光政（孫だが家督の筋で結ぶ）
  e_tadayoshi2: "n_kazutoyo",    // 山内一豊 → 忠義（養子）
  e_takatsugu: "n_takatora",     // 藤堂高虎 → 高次
  e_mitsunao: "e_tadatoshi",     // 細川忠利 → 光尚
  e_yoshitaka2: "st_yoshinobu",  // 佐竹義宣 → 義隆
  e_shiro: "e_yoshitsugu",       // 益田好次 → 天草四郎
  rk_shigetsuna: "sadayori",      // 蒲生定秀 → 青地茂綱（青地氏へ養子）
  mikumo: "rk_katamochi",         // 三雲賢持 → 成持
  as_kagetoshi: "norikage",       // 朝倉宗滴 → 景紀（養子）
  as_kagemitsu: "as_kagetoshi",   // 朝倉景紀 → 景垙
  as_naozumi: "magara",           // 真柄直隆 → 直澄（弟。家の兄弟も結ぶ）
  as_takamoto: "magara",          // 真柄直隆 → 隆基
  as_yoshinobu2: "yamazaki",      // 山崎吉家 → 吉延（弟）
  as_kitanosho3: "as_kagemasa",   // 前波景当 → 吉継
};

// 史実で八十を超えた者。没年齢を記す。
export const FATED = { hirotada: 1549 };   // 史実で没する年が定まっている者

export const LONG_LIVED = {
  e_tenkai: 107,     // 天海（諸説あるが百歳を超えたと伝わる）
  ts_katsushige: 79, // 板倉勝重（京都所司代）
  ts_nobuyuki: 92,   // 真田信之（松代藩。九十二歳）
  ts_naotsugu: 80,   // 安藤直次
  m_moritsuna: 78,   // 渡辺守綱（槍半蔵）
  mo_motosuke: 101,  // 国司元相（毛利の宿老。百一歳）
  sz_tadayoshi2: 77, // 島津忠良（日新斎）
  ts_ieyoshi: 92,    // 柳生家厳（宗厳の父。九十二歳）
  ts_yoshihiro: 78,  // 井戸良弘
  ts_hidesuke: 77,   // 中坊秀祐
  yk_harutomo: 81,   // 結城晴朝（八十一歳）
  im_yasukatsu: 87,  // 朝比奈泰勝（のち徳川に仕え八十七歳）
  td_masatoshi: 85,  // 保科正俊（槍弾正。八十五歳）
  rk_shigemasa: 84,  // 吉田重政（弓の日置流。八十四歳）
  rk_mitsutoshi: 76, // 多羅尾光俊（甲賀。七十六歳）
  uy_nagatomo: 82,   // 秋元長朝（総社藩主。利根川の治水に功があった）
  harukata_m: 87,    // 志道広良（毛利の宿老）
  norikage: 79,      // 朝倉宗滴
  harusumi: 82,      // 有馬晴純
  e_bokuden: 82,     // 塚原卜伝
  e_sekishusai: 78,  // 柳生宗厳
  torii_t: 82,       // 鳥居忠吉
  hojo_a: 97,        // 北条幻庵
  masatane: 76,      // 原昌胤
  nobutomo2: 77,     // 小幡虎盛
  hisayuki: 79,      // 宇山久兼
  o_ouchi2: 78,      // 陶隆満
  yoshishige_s: 76,  // 宗晴康
};
