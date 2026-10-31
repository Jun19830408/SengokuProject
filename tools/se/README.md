# 合戦の効果音の作り方

合戦の効果音二十一を、作り直すための道具です。
**遊びの組み立て（`npm run build`）には使いません。** 音を直したいときだけ使います。

出来上がった音は `dist/se/` に、鳴らす段は `src/audio/kouka.js` にあります。
遊びの側への組み込み方は、根の `効果音取り込みの手引き.md` をご覧ください。

---

## 一、中身

| 札 | 役目 |
|---|---|
| `sfx.py` | 音を一から合成して作る十一（隊を選ぶ音二つ・拡大したときの兵の音四つ・軍船・焙烙・陣太鼓・鉄砲・弓） |
| `sfx_sf2.py` | 楽器と合唱の録音（音色集）を加工して作る二つ（法螺貝・勝鬨） |
| `jingles.py` | BGM と同じ管弦で演奏する八つ（有利・不利の知らせ、勝ち負けの曲六つ） |
| `dsp.py` | 合成の道具（打つ音・擦れる音・残響・音量の揃え・継ぎ目なしの繰り返し） |
| `crowd.py` | 軍勢の声の合成（接戦・突撃の「わーっ」） |
| `kakidasu.py` | 書き出し。MP3 にして `dist/se/` へ置き、`kouka.js` の長さと指紋を書き換える |
| `viz2.py` | 確かめの道具（音の大きさの移り・音程・スペクトログラムを絵にする） |

作る側の名と、遊びの側（`kouka.js`）の名の対応は `kakidasu.py` の `札` にあります。

| 作る側 | 遊びの側 | 作る道具 | 長さ |
|---|---|---|---|
| sel_mikata / sel_teki | 自軍を選ぶ / 敵を選ぶ | sfx.py | 0.8秒 / 0.6秒 |
| march / engage / charge / melee | 行軍 / 接戦 / 突撃 / 接敵 | sfx.py | 各8秒（繰り返し） |
| ship / horoku | 軍船 / 焙烙 | sfx.py | 8秒（繰り返し）/ 3.8秒 |
| jindaiko / teppo / yumi | 陣太鼓 / 鉄砲 / 弓 | sfx.py | 5.6秒 / 3.0秒 / 2.5秒 |
| horagai / kachidoki | 法螺貝 / 勝鬨 | sfx_sf2.py | 6.1秒 / 4.1秒 |
| notice_good / notice_bad | 有利 / 不利 | jingles.py | 1.7秒 / 1.9秒 |
| win_field / lose_field | 野戦の勝ち / 野戦の負け | jingles.py | 4.7秒 / 5.3秒 |
| win_castle / lose_castle | 城を落とす / 城攻めの退き | jingles.py | 5.8秒 / 5.2秒 |
| win_kessen / lose_kessen | 決戦の勝ち / 決戦の負け | jingles.py | 6.0秒 / 6.0秒 |

`sfx.py` には、はじめに作った合成の法螺貝と勝鬨（`horagai_gousei`・`kachidoki_gousei`）、
`sfx_sf2.py` には勝鬨の案A（`kachidoki_a`）も残してあります。名指ししたときだけ作ります。

---

## 二、要るもの

BGM の道具（`tools/bgm/`）と同じものに、二つ足します。

- Python 3.10 以降と、`numpy` `scipy` `soundfile` `pyloudnorm` `mido` `matplotlib`
- FluidSynth、ffmpeg（libmp3lame 入り）
- 音色集（SoundFont）
  - **MuseScore General（Full）** と **GeneralUser GS v2.0.3**、弓の当たりを強めた写し
    **MSG_marc.sf2** … BGM と同じ。`tools/bgm/README.md` の「二」「三」の通りに
    `tools/bgm/work/` へ置く（場所は環境変数 `BGM_WORK`・`BGM_SF_GU`・`BGM_SF_MARC` でも変えられる）
  - **FluidR3 GM** … 勝鬨の合唱に重ねる。Ubuntu／Debian の `fluid-soundfont-gm` で
    `/usr/share/sounds/sf2/FluidR3_GM.sf2` に入る（場所は環境変数 `SE_SF_FR3` でも変えられる）

```
sudo apt-get install fluidsynth musescore-general-soundfont-lossless fluid-soundfont-gm ffmpeg
pip install numpy scipy soundfile pyloudnorm mido matplotlib
```

---

## 三、作り直す手順

```
# 作る → tools/se/work/out/<名>.wav
python3 tools/se/sfx.py                 # 合成の十一（名指しもできる：python3 tools/se/sfx.py charge）
python3 tools/se/sfx_sf2.py             # 法螺貝・勝鬨
python3 tools/se/jingles.py             # 知らせと勝ち負けの曲

# 確かめる（絵は tools/se/work/ に）
python3 tools/se/viz2.py tools/se/work/charge.png 1500 tools/se/work/out/charge.wav

# 書き出す → dist/se/se_<名>.mp3、kouka.js の長さと指紋
python3 tools/se/kakidasu.py charge
npm test                                # 少なくとも tests/kouka.cjs が「エラー: なし」
```

- どの音も種（乱数の元）を決めてあるので、同じ道具で作り直せば同じ音になります
  （確かめたところ、行軍だけは細部がわずかに違って出ました。耳で分かる差ではありません）。
  **`dist/se/` の札は、試聴で決まった音そのものです。** 直したい音だけを作り直してください。
- 拡大したときの兵の音と軍船（地）は、八秒ちょうどの一周です。継ぎ目が出ないよう、
  音の置き場・ろ過・残響のどれも輪のように回して作っています（`dsp.py` の頭の書き付け）。
  `kakidasu.py` は、地が八秒ちょうどでなければ止まります。
- 地の札を作り直したら、`kouka.js` の指紋も替わります（`kakidasu.py` が書き換えます）。

---

## 四、音の作り方の要点

| 音 | 作り方 |
|---|---|
| 自軍を選ぶ・敵を選ぶ | 小鼓の「ポン」／大鼓の「カン」に鉦の響き。膜の揺れを数式で鳴らす |
| 行軍 | 草鞋の足音と小札（こざね）の擦れ。一人ひとりが一周に割り切れる歩幅で歩く |
| 接戦 | 駆け足と鎧に、合成の軍勢の声（声帯の振動と口の形を数式で作る） |
| 突撃 | 蹄を三層に重ねる（近くの6騎・中ほどの24騎・遠くの約330騎）。遠くの群れは小隊ごとに歩調がおおむね揃い、「ドドドッ」が波のように押し寄せる。小さなスピーカーでも響くよう、低音の倍音を足す |
| 接敵 | 槍の柄の叩き合い、鎧を打つ音、足さばきに、刀が打ち合う「カキン」 |
| 軍船・焙烙 | 波と櫓の一漕ぎ・櫓杭の軋み／導火・風切り・割れ・炸裂・火 |
| 陣太鼓・鉄砲・弓 | 大太鼓の膜／火縄の弾ける音と黒色火薬の轟き、山の返し／弦・矢の風切り・刺さる音 |
| 法螺貝 | トロンボーンとホルンの録音を、法螺の吹き方（しゃくり上げ・揺れ・一段上がる音・息の終わりの下がり）に曲げ、貝の胴の響きと息の音を加える |
| 勝鬨 | 大将の「えい、えい」は合唱の録音を二本、軍勢の「おう」は二十三本重ね、一本ずつ出だし・音程の上がり下がり・終わり方をずらす。録音の「あー」の響きを抜き（線形予測で白くする）、叫ぶ声の「えい」「おう」の響きに作り替える（試聴で選んだ案B） |
| 知らせ・勝ち負けの曲 | BGM の三曲の旋律（疾風の陣・攻城の刻・天下決戦）を、同じ管弦で短く演奏する |

---

## 五、出どころ

- 音色集の扱いは、それぞれに付く使用許諾によります。
  - MuseScore General … MIT ライセンス（一部はパブリックドメイン・CC0）。Debian の
    `musescore-general-soundfont-lossless` の copyright の書き付け
  - GeneralUser GS … GeneralUser GS License v2.0（個人・商用を問わず制限なく使える）。
    `GeneralUser-GS/documentation/LICENSE.txt`
  - FluidR3 GM … MIT ライセンス。Debian の `fluid-soundfont-gm` の copyright の書き付け
- 法螺貝・陣太鼓の使い方は、彦根城博物館「博物館だより 第306回 集団戦と合図の音」
  （学芸員 古幡昇子、2022年3月）によりました（効果音の試聴の頁にも記した）。
