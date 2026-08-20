

export const ROADS = [
  ["sannohe", "namioka", 65, "山道"], ["sannohe", "kunohe", 13, "街道"], ["namioka", "oura", 19, "街道"],
  ["oura", "hiyama", 60, "難所"], ["kunohe", "kozukata", 65, "街道"], ["kozukata", "kosuiji", 16, "街道"],
  ["kozukata", "minato", 90, "難所"], ["kosuiji", "yokota", 42, "山道"], ["kosuiji", "yokote", 56, "山道"],
  ["yokota", "teraike", 77, "難所"], ["teraike", "iwadeyama", 27, "街道"], ["teraike", "sendai", 57, "街道"],
  ["iwadeyama", "sendai", 50, "街道"], ["iwadeyama", "tendo", 58, "難所"], ["iwadeyama", "yokote", 73, "難所"],
  ["sendai", "watari", 24, "街道"], ["sendai", "tendo", 44, "山道"], ["watari", "shiroishi", 21, "街道"],
  ["watari", "soma", 27, "街道"], ["shiroishi", "nihonmatsu", 48, "山道"], ["shiroishi", "yonezawa", 47, "難所"],
  ["shiroishi", "yamagata", 38, "山道"], ["kurokawa", "inawashiro", 18, "街道"], ["kurokawa", "shirakawa", 47, "山道"],
  ["kurokawa", "tochio", 86, "難所"], ["kurokawa", "sanjo", 87, "難所"], ["kurokawa", "shibata", 74, "山道"],
  ["inawashiro", "nihonmatsu", 28, "山道"], ["inawashiro", "sukagawa", 38, "山道"], ["inawashiro", "yonezawa", 39, "街道"],
  ["nihonmatsu", "soma", 48, "山道"], ["nihonmatsu", "miharu", 18, "街道"], ["nihonmatsu", "yonezawa", 45, "山道"],
  ["shirakawa", "sukagawa", 22, "街道"], ["shirakawa", "karasuyama", 53, "山道"], ["sukagawa", "miharu", 20, "街道"],
  ["yonezawa", "yamagata", 43, "山道"], ["yonezawa", "shibata", 68, "難所"], ["yonezawa", "murakami", 66, "難所"],
  ["yamagata", "tendo", 13, "街道"], ["yamagata", "murakami", 75, "難所"], ["tendo", "ourayama", 60, "山道"],
  ["ourayama", "yokote", 93, "難所"], ["ourayama", "murakami", 61, "山道"], ["yokote", "minato", 63, "街道"],
  ["minato", "hiyama", 44, "山道"], ["mito", "ota_hitachi", 19, "街道"], ["mito", "makabe", 36, "街道"],
  ["mito", "fuchu_hitachi", 21, "街道"], ["ota_hitachi", "karasuyama", 37, "街道"], ["oda", "makabe", 18, "街道"],
  ["oda", "fuchu_hitachi", 33, "街道"], ["oda", "motosakura", 47, "街道"], ["oda", "usui", 46, "街道"],
  ["oda", "sekiyado", 28, "海路"], ["makabe", "fuchu_hitachi", 34, "街道"], ["makabe", "yuki", 20, "街道"],
  ["makabe", "karasuyama", 41, "街道"], ["fuchu_hitachi", "motosakura", 53, "街道"], ["yuki", "koga", 20, "街道"],
  ["yuki", "utsunomiya", 28, "街道"], ["yuki", "karasawa", 25, "街道"], ["koga", "karasawa", 22, "街道"],
  ["koga", "oshi", 22, "街道"], ["koga", "sekiyado", 16, "街道"], ["utsunomiya", "karasawa", 31, "街道"],
  ["utsunomiya", "karasuyama", 26, "街道"], ["karasawa", "kanayama", 23, "街道"], ["karasawa", "oshi", 30, "街道"],
  ["minowa", "maebashi", 11, "街道"], ["minowa", "numata", 27, "街道"], ["minowa", "komoro", 47, "難所"],
  ["hirai", "maebashi", 22, "街道"], ["hirai", "kanayama", 26, "街道"], ["hirai", "hachigata", 30, "街道"],
  ["maebashi", "numata", 29, "街道"], ["maebashi", "kanayama", 29, "街道"], ["maebashi", "fukaya", 29, "街道"],
  ["numata", "tochio", 92, "難所"], ["kanayama", "oshi", 21, "街道"],
  ["kanayama", "fukaya", 15, "街道"], ["kawagoe", "iwatsuki", 15, "街道"], ["kawagoe", "matsuyama_m", 14, "街道"],
  ["kawagoe", "takiyama", 29, "街道"], ["iwatsuki", "edo", 27, "街道"], ["iwatsuki", "sekiyado", 21, "街道"],
  ["oshi", "fukaya", 17, "街道"], ["oshi", "matsuyama_m", 13, "街道"], ["hachigata", "fukaya", 12, "街道"],
  ["hachigata", "matsuyama_m", 19, "街道"], ["fukaya", "matsuyama_m", 22, "街道"], ["edo", "takiyama", 38, "街道"],
  ["edo", "tamanawa", 44, "街道"], ["edo", "sanuki", 48, "海路"], ["edo", "usui", 38, "街道"],
  ["takiyama", "tsukui", 15, "街道"], ["odawara", "tamanawa", 34, "街道"], ["odawara", "tsukui", 39, "街道"],
  ["odawara", "iwadono", 45, "街道"], ["odawara", "kounkoji", 32, "街道"], ["odawara", "nirayama", 29, "街道"],
  ["tamanawa", "misaki", 23, "街道"], ["tamanawa", "tsukui", 40, "街道"], ["tamanawa", "sanuki", 34, "海路"],
  ["misaki", "sanuki", 27, "海路"], ["misaki", "tateyama", 28, "海路"], ["tsukui", "iwadono", 25, "街道"],
  ["kururi", "otaki", 15, "街道"], ["kururi", "sanuki", 19, "街道"], ["kururi", "usui", 49, "街道"],
  ["otaki", "motosakura", 50, "街道"], ["otaki", "usui", 49, "街道"], ["sanuki", "tateyama", 31, "街道"],
  ["motosakura", "usui", 10, "街道"], ["usui", "sekiyado", 51, "街道"], ["tsutsujigasaki", "katsuyama_k", 11, "街道"],
  ["tsutsujigasaki", "takato", 50, "難所"], ["tsutsujigasaki", "komoro", 73, "山道"], ["iwadono", "katsuyama_k", 27, "街道"],
  ["iwadono", "kounkoji", 54, "街道"], ["katsuyama_k", "kounkoji", 54, "街道"], ["takato", "fukashi", 46, "山道"],
  ["takato", "iida", 42, "山道"], ["fukashi", "toishi", 33, "街道"], ["kaizu", "katsurao", 9, "街道"],
  ["kaizu", "kasugayama", 64, "街道"], ["kaizu", "negoshi", 57, "街道"], ["toishi", "katsurao", 10, "街道"],
  ["toishi", "komoro", 17, "街道"], ["iida", "inui", 59, "難所"], ["iida", "naegi", 31, "街道"],
  ["kasugayama", "yoita", 68, "街道"], ["kasugayama", "negoshi", 33, "街道"], ["tochio", "sanjo", 18, "街道"],
  ["tochio", "yoita", 11, "街道"], ["sanjo", "yoita", 17, "街道"], ["sanjo", "shibata", 48, "街道"],
  ["sanjo", "kawarada", 69, "海路"], ["shibata", "murakami", 33, "街道"], ["toyama", "masuyama", 20, "街道"],
  ["toyama", "uozu", 23, "街道"], ["toyama", "nanao", 43, "街道"], ["toyama", "matsukura_h", 63, "街道"],
  ["masuyama", "suemori_n", 28, "街道"], ["masuyama", "kanazawa", 31, "街道"], ["masuyama", "matsukura_h", 61, "街道"],
  ["uozu", "matsukura", 3, "街道"], ["uozu", "nanao", 46, "海路"], ["uozu", "miyazaki_e", 19, "街道"],
  ["matsukura", "miyazaki_e", 18, "街道"], ["nanao", "suemori_n", 24, "街道"], ["suemori_n", "kanazawa", 33, "街道"],
  ["kanazawa", "komatsu", 26, "街道"], ["kanazawa", "torigoe", 27, "街道"], ["komatsu", "torigoe", 17, "街道"],
  ["komatsu", "kitanosho", 44, "街道"], ["torigoe", "ichijodani", 45, "街道"], ["torigoe", "kitanosho", 45, "街道"],
  ["torigoe", "gujo", 71, "難所"], ["torigoe", "matsukura_h", 61, "山道"], ["ichijodani", "kitanosho", 10, "街道"],
  ["ichijodani", "kanegasaki", 44, "街道"], ["ichijodani", "gujo", 66, "難所"], ["kanegasaki", "kuniyoshi", 12, "街道"],
  ["kanegasaki", "odani", 26, "街道"], ["kanegasaki", "yamamotoyama", 27, "街道"], ["kuniyoshi", "nochiseyama", 23, "街道"],
  ["kuniyoshi", "yamamotoyama", 29, "街道"], ["nochiseyama", "kannonji", 53, "街道"], ["nochiseyama", "sakamoto", 49, "街道"],
  ["nochiseyama", "kameyama_t", 56, "街道"], ["nochiseyama", "miyazu", 50, "山道"], ["sunpu", "kakegawa", 41, "街道"],
  ["sunpu", "kounkoji", 45, "山道"], ["sunpu", "inui", 46, "街道"], ["kakegawa", "takatenjin", 9, "街道"],
  ["kakegawa", "futamata", 22, "街道"], ["kakegawa", "hikuma", 27, "街道"], ["kounkoji", "nirayama", 16, "街道"],
  ["nirayama", "shimoda", 41, "街道"], ["futamata", "hikuma", 20, "街道"], ["futamata", "inui", 14, "街道"],
  ["futamata", "nagashino", 24, "街道"], ["hikuma", "yoshida", 31, "街道"], ["hikuma", "nagashino", 28, "街道"],
  ["inui", "iwamura", 58, "街道"], ["okazaki", "yoshida", 30, "街道"], ["okazaki", "nishio", 14, "街道"],
  ["okazaki", "nagashino", 37, "街道"], ["okazaki", "kariya", 15, "街道"], ["okazaki", "iwamura", 52, "街道"],
  ["yoshida", "tahara", 18, "街道"], ["yoshida", "nishio", 32, "街道"], ["yoshida", "nagashino", 23, "街道"],
  ["tahara", "nishio", 27, "海路"], ["tahara", "toba", 42, "海路"], ["nishio", "kariya", 15, "街道"],
  ["nishio", "matsugashima", 54, "海路"], ["nishio", "toba", 47, "海路"], ["nagashino", "iwamura", 50, "街道"],
  ["kariya", "narumi", 13, "街道"], ["kiyosu", "nagoya", 6, "街道"], ["kiyosu", "iwakura", 7, "街道"],
  ["kiyosu", "shobata", 10, "街道"], ["nagoya", "narumi", 11, "街道"], ["iwakura", "inuyama", 13, "街道"],
  ["iwakura", "inabayama", 19, "街道"], ["iwakura", "sunomata", 20, "街道"], ["inuyama", "inabayama", 15, "街道"],
  ["inuyama", "gujo", 40, "街道"], ["inuyama", "iwamura", 46, "街道"], ["shobata", "ogaki", 19, "街道"],
  ["shobata", "sunomata", 18, "街道"], ["shobata", "nagashima", 14, "街道"], ["narumi", "iwamura", 54, "街道"],
  ["narumi", "kuwana", 24, "街道"], ["narumi", "nagashima", 24, "街道"], ["inabayama", "sunomata", 12, "街道"],
  ["inabayama", "gujo", 39, "街道"], ["ogaki", "sunomata", 6, "街道"], ["ogaki", "odani", 34, "山道"],
  ["ogaki", "sawayama", 33, "山道"], ["gujo", "naegi", 54, "難所"], ["gujo", "matsukura_h", 49, "山道"],
  ["iwamura", "naegi", 18, "街道"], ["naegi", "matsukura_h", 71, "山道"], ["kuwana", "nagashima", 4, "街道"],
  ["kuwana", "kanbe", 25, "街道"], ["nagashima", "sawayama", 43, "山道"], ["kanbe", "matsugashima", 30, "海路"],
  ["kanbe", "ueno_iga", 41, "山道"], ["kanbe", "kannonji", 49, "山道"], ["okochi", "matsugashima", 9, "街道"],
  ["okochi", "toba", 28, "街道"], ["okochi", "takatori", 67, "街道"], ["matsugashima", "toba", 28, "街道"],
  ["matsugashima", "ueno_iga", 44, "山道"], ["ueno_iga", "kannonji", 42, "山道"], ["ueno_iga", "sakamoto", 41, "街道"],
  ["ueno_iga", "tamonyama", 28, "街道"], ["kannonji", "sawayama", 18, "街道"], ["kannonji", "sakamoto", 26, "街道"],
  ["odani", "yamamotoyama", 8, "街道"], ["sawayama", "yamamotoyama", 18, "街道"], ["sakamoto", "nijo", 13, "街道"],
  ["nijo", "shoryuji", 12, "街道"], ["nijo", "kameyama_t", 16, "街道"], ["shoryuji", "kameyama_t", 15, "街道"],
  ["shoryuji", "akutagawa", 12, "街道"], ["shoryuji", "tamonyama", 28, "街道"], ["kameyama_t", "yagami", 33, "街道"],
  ["kameyama_t", "akutagawa", 18, "街道"], ["yagami", "yokoyama", 28, "山道"], ["yagami", "miki", 36, "街道"],
  ["yagami", "itami", 36, "街道"], ["yagami", "hanakuma", 42, "街道"], ["yokoyama", "miyazu", 28, "街道"],
  ["yokoyama", "takeda", 26, "街道"], ["miyazu", "konosumi", 35, "街道"], ["ishiyama", "iimoriyama", 12, "街道"],
  ["ishiyama", "takaya", 17, "街道"], ["ishiyama", "kishiwada", 29, "街道"], ["ishiyama", "shigisan", 16, "街道"],
  ["ishiyama", "itami", 15, "街道"], ["iimoriyama", "akutagawa", 15, "街道"],
  ["iimoriyama", "koriyama", 15, "街道"], ["iimoriyama", "shigisan", 13, "街道"], ["takaya", "kishiwada", 24, "街道"],
  ["takaya", "shigisan", 9, "街道"], ["takaya", "takatori", 24, "街道"], ["kishiwada", "saika", 29, "街道"],
  ["kishiwada", "hanakuma", 31, "海路"], ["akutagawa", "itami", 18, "街道"], ["koriyama", "shigisan", 11, "街道"], ["koriyama", "tamonyama", 7, "街道"],
  ["koriyama", "takatori", 25, "街道"], ["shigisan", "takatori", 25, "街道"], ["takatori", "shingu", 81, "難所"],
  ["saika", "tetori", 36, "街道"], ["saika", "yura", 22, "海路"], ["shingu", "tetori", 73, "難所"],
  ["tetori", "ushiki", 53, "海路"], ["himeji", "ojio", 11, "街道"], ["himeji", "goshaku", 4, "街道"],
  ["miki", "goshaku", 24, "街道"], ["miki", "hanakuma", 21, "街道"], ["miki", "sumoto", 52, "海路"],
  ["ojio", "takeda", 44, "山道"], ["ojio", "wakasa", 51, "山道"], ["ojio", "tenjinyama", 51, "街道"],
  ["goshaku", "sumoto", 56, "海路"], ["itami", "hanakuma", 24, "街道"], ["hanakuma", "sumoto", 47, "海路"],
  ["takeda", "konosumi", 20, "街道"], ["takeda", "wakasa", 39, "山道"], ["konosumi", "wakasa", 41, "山道"],
  ["sumoto", "shozui", 43, "海路"], ["sumoto", "yura", 10, "海路"], ["tottori", "wakasa", 23, "街道"], ["tottori", "shikano", 17, "街道"],
  ["wakasa", "iwaya_m", 41, "山道"], ["shikano", "iwaya_m", 38, "山道"], ["shikano", "uyui", 8, "街道"],
  ["yonago", "gassan", 14, "街道"], ["yonago", "shiraga", 24, "街道"], ["yonago", "takata_m", 45, "山道"],
  ["yonago", "oki", 86, "海路"], ["yonago", "uyui", 61, "街道"], ["gassan", "shiraga", 19, "街道"],
  ["gassan", "koriyama_a", 89, "難所"], ["gassan", "yamabuki", 74, "難所"], ["shiraga", "yamabuki", 73, "街道"], ["tsuwano", "takamine", 42, "山道"],
  ["tsuwano", "wakayama_s", 47, "山道"], ["tsuwano", "miyake", 24, "山道"], ["tsuwano", "kuragake", 46, "山道"], ["ishiyama_bz", "tenjinyama", 27, "街道"], ["ishiyama_bz", "sogo", 44, "海路"],
  ["ishiyama_bz", "amagiri", 48, "海路"], ["ishiyama_bz", "takamatsu_bc", 10, "街道"], ["matsuyama_bc", "takata_m", 31, "街道"],
  ["matsuyama_bc", "sarukake", 17, "街道"], ["matsuyama_bc", "takamatsu_bc", 22, "街道"], ["tenjinyama", "iwaya_m", 27, "街道"],
  ["tenjinyama", "takamatsu_bc", 29, "街道"], ["koriyama_a", "kanayama_a", 33, "街道"], ["koriyama_a", "mihara", 45, "街道"],
  ["koriyama_a", "takata_m", 90, "難所"], ["koriyama_a", "yamabuki", 54, "山道"], ["kanayama_a", "mihara", 55, "街道"],
  ["kanayama_a", "sakurao", 20, "街道"], ["mihara", "kawanoe", 62, "海路"], ["mihara", "kannabe", 31, "街道"],
  ["mihara", "kokubunyama", 40, "海路"], ["ouchi", "takamine", 2, "街道"], ["ouchi", "wakayama_s", 33, "街道"],
  ["ouchi", "shimofuri", 25, "街道"], ["takamine", "shimofuri", 25, "街道"], ["wakayama_s", "funai", 91, "海路"],
  ["wakayama_s", "kuragake", 40, "街道"], ["shozui", "ichinomiya", 8, "街道"], ["shozui", "hiketa", 16, "街道"],
  ["hakuchi", "sogo", 40, "街道"], ["hakuchi", "kawanoe", 23, "街道"],
  ["hakuchi", "okou", 53, "山道"], ["hakuchi", "aki", 59, "難所"], ["hakuchi", "amagiri", 27, "街道"],
  ["ichinomiya", "aki", 80, "難所"], ["ichinomiya", "ushiki", 22, "街道"], ["sogo", "hiketa", 29, "街道"],
  ["sogo", "amagiri", 32, "街道"], ["yuzuki", "kokubunyama", 29, "街道"],
  ["yuzuki", "jizogatake", 44, "山道"], ["kagomori", "itajima", 5, "街道"], ["kagomori", "nakamura", 41, "街道"],
  ["kagomori", "jizogatake", 30, "街道"], ["itajima", "usuki", 72, "海路"], ["kawanoe", "okou", 48, "山道"],
  ["kawanoe", "amagiri", 33, "街道"], ["kawanoe", "kokubunyama", 53, "山道"], ["okou", "nakamura", 91, "難所"],
  ["okou", "aki", 28, "街道"], ["tachibanayama", "iwaya", 20, "街道"], ["tachibanayama", "kishitake", 51, "街道"],
  ["tachibanayama", "kokura", 42, "街道"], ["tachibanayama", "iki", 70, "海路"], ["iwaya", "akizuki", 13, "街道"],
  ["iwaya", "kurume", 23, "街道"], ["iwaya", "kishitake", 46, "街道"], ["akizuki", "kurume", 27, "山道"],
  ["akizuki", "umagatake", 27, "街道"], ["kurume", "yanagawa", 20, "街道"],
  ["kurume", "saga", 21, "街道"], ["yanagawa", "saga", 14, "街道"], ["yanagawa", "hinoe", 50, "海路"],
  ["yanagawa", "kumamoto", 49, "街道"], ["funai", "usuki", 22, "街道"],
  ["funai", "oka", 37, "街道"], ["funai", "umagatake", 80, "難所"], ["usuki", "oka", 42, "街道"],
  ["usuki", "agata", 62, "街道"], ["usuki", "jizogatake", 81, "海路"], ["oka", "kumamoto", 67, "山道"],
  ["oka", "agata", 49, "山道"], ["kishitake", "saga", 31, "街道"], ["kishitake", "hirado", 46, "街道"],
  ["kishitake", "omura", 58, "街道"], ["kishitake", "iki", 49, "海路"], ["saga", "omura", 50, "街道"],
  ["hirado", "iki", 47, "海路"], ["hinoe", "omura", 32, "海路"], ["hinoe", "kumamoto", 45, "海路"],
  ["hinoe", "yatsushiro", 44, "海路"], ["kanaishi", "iki", 62, "海路"], ["kumamoto", "yatsushiro", 35, "街道"],
  ["hitoyoshi", "yatsushiro", 35, "街道"], ["hitoyoshi", "tonokori", 64, "山道"], ["hitoyoshi", "kajiki", 54, "街道"],
  ["hitoyoshi", "izumi", 41, "街道"], ["yatsushiro", "izumi", 52, "街道"], ["sadowara", "tonokori", 6, "街道"],
  ["sadowara", "agata", 64, "街道"], ["tonokori", "obi", 43, "街道"], ["tonokori", "kajiki", 76, "難所"],
  ["obi", "shibushi", 28, "街道"], ["uchijo", "kajiki", 18, "街道"], ["kajiki", "izumi", 49, "街道"], ["kajiki", "shibushi", 50, "街道"], ["katsuyama_n", "shimofuri", 28, "街道"],
  ["katsuyama_n", "kokura", 16, "海路"], ["kokura", "umagatake", 25, "街道"],
  ["takata_m", "iwaya_m", 45, "山道"], ["takata_m", "uyui", 56, "難所"], ["iwaya_m", "uyui", 37, "山道"],
  ["yamabuki", "miyake", 72, "山道"], ["miyake", "sakurao", 55, "難所"], ["kannabe", "sarukake", 29, "街道"],
  ["kannabe", "amagiri", 42, "海路"], ["sarukake", "amagiri", 44, "海路"], ["sarukake", "takamatsu_bc", 19, "街道"],
  ["sakurao", "kuragake", 18, "街道"], ["yura", "ushiki", 48, "海路"], ["negoshi", "miyazaki_e", 31, "街道"],
["matsumae", "hakodate", 62, "海路"],
  ["matsumae", "esashi", 24, "街道"], ["esashi", "oshamanbe", 42, "山道"],
  ["hakodate", "oshamanbe", 40, "山道"], ["oshamanbe", "otaru", 52, "山道"],
  ["otaru", "ishikari", 14, "街道"], ["ishikari", "rumoi", 40, "街道"],
  ["rumoi", "soya", 74, "難所"], ["ishikari", "sizunai", 62, "山道"],
  ["oshamanbe", "sizunai", 66, "山道"], ["sizunai", "kushiro", 72, "山道"],
  ["kushiro", "nemuro", 40, "街道"], ["kushiro", "abashiri", 56, "難所"],
  ["abashiri", "nemuro", 62, "難所"], ["abashiri", "soya", 78, "難所"],
  ["ishikari", "abashiri", 96, "難所"],
  ["hakodate", "namioka", 96, "海路"],
  ["shurijo", "nakagusuku", 14, "街道"],
  ["shurijo", "miyako", 250, "海路"],
  ["shurijo", "uchijo", 530, "海路"],
  ["shurijo", "izumi", 560, "海路"],
];





// 山道は険しく、軍勢の通行はままならぬ。海路は船数に限りがあり、大軍は一度に渡れぬ。
// 山道は険しく、軍勢の通行はままならぬ。難所は峻険で、大軍を通すには日を要する。
/* 道の通りやすさ（GDD 7.1）。街道を一とし、険しい道ほど鈍る。

   難所を〇.一八としていた。これだと吉田郡山城から月山富田城まで――
   実に八十九kmの峠道である――十一か月かかる勘定になった。
   歩けば一日で着く道のりに、軍勢が一年近くかける道理はない。

   峠を越えるのは平地の三倍苦しい、というくらいが実の姿である。
   ・街道 … 東海道・山陽道のような本道
   ・渡河 … 川を渡す。舟と綱の手間がかかる
   ・山道 … 峠越え。荷駄が難儀する
   ・難所 … 険しい峠、崖道。人馬とも一列でしか通れない
   ・海路 … 船。風待ちはあるが、乗ってしまえば陸より速い */
export const ROAD_SPEED = { 街道: 1.0, 山道: 0.55, 難所: 0.35, 渡河: 0.85, 海路: 0.95 };

/* 軍勢が一月に進める行程（km）。街道の長さは実際の距離（km）で入れてある。

   四十六kmとしていた。一日一.五kmである。これでは軍勢どころか、
   荷を負うた老人でも追い越す。全国の街道を検めたところ、
   十一か月・十二か月・二十か月という道のりが二十本以上あった。

   実際の軍勢は、荷駄を引いて一日十五kmから二十kmを歩く。ただし毎日
   歩き続けるわけではない。糧を集め、雨を待ち、道を繕う。ひと月を通してみれば
   百三十kmというあたりが、盤の上での手応えとしても釣り合う。

   これで、隣り合う城のほとんどは一月で着き（四百四十四本のうち四百本）、
   峠を隔てた城は二月、遠い難所は三月から五月かかる。
   吉田郡山城から月山富田城までは二月――尼子と毛利が幾度も行き来した道である。 */
export const MARCH_PER_MONTH = 130;


export const MOB_POLICY = [
  { name: "平時", per: 300, upkeep: 0.9 }, { name: "通常", per: 380, upkeep: 1.0 },
  { name: "決戦", per: 450, upkeep: 1.15 }, { name: "総動員", per: 500, upkeep: 1.35 },
];

export const ARMS = [
  { key: "yari", label: "槍", ratio: 0.56 }, { key: "yumi", label: "弓", ratio: 0.21 },
  { key: "teppo", label: "鉄砲", ratio: 0.03 }, { key: "kiba", label: "騎馬", ratio: 0.2 },
];

