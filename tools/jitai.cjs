/* 書面の字体（説明書・仕様書・資料の HTML と PDF。tools/manual.cjs・shiyou.cjs・shiryo.cjs）。

   遊ぶ側の求めは「PDF やワードにする場合、絶対に中国語の字体にしない」である。
   もとは字体を「ヒラギノ明朝・游明朝・serif」「sans-serif」とだけ指していた。
   どちらも入っていない所（Linux の Chrome）で印刷すると、serif・sans-serif の
   受け皿に中国語の字体（文泉驛正黒 WenQuanYi Zen Hei）が選ばれ、説明書の PDF に
   埋め込まれていた。日本語の字体を名指しで並べ、受け皿に落ちる前に必ず日本語の
   字体に当たるようにする。これまでの見た目（Mac はヒラギノ、Windows は游）を先に、
   MS 明朝・IPA・Noto の日本語版を後に置く。 */
exports.明朝 = '"Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "MS PMincho", "MS Mincho", '
  + '"IPAPMincho", "IPAMincho", "Noto Serif CJK JP", serif';
exports.ゴシック = '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "YuGothic", "Meiryo", '
  + '"MS PGothic", "IPAPGothic", "IPAGothic", "Noto Sans CJK JP", sans-serif';
