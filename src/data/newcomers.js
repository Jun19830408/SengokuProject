

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
