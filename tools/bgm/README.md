# 管弦の録音（BGM）の作り方

政務・野戦・城攻めの三曲を、楽譜から録音まで作り直すための道具です。
**遊びの組み立て（`npm run build`）には使いません。** 曲を直したいときだけ使います。

出来上がった録音は `dist/bgm/` に、鳴らす段は `src/audio/rokuon.js` にあります。
遊びの側への組み込み方は、根の `BGM取り込みの手引き.md` をご覧ください。

---

## 一、中身

| 札 | 役目 |
|---|---|
| `seimu.py` | 政務「天下静謐」の楽譜（75拍・40小節・2分08秒） |
| `yasen.py` | 野戦「疾風の陣」の楽譜（150拍・56小節・1分30秒） |
| `shiro.py` | 城攻め「攻城の刻」の楽譜（100拍・40小節・1分36秒） |
| `common.py` | 琴・竪琴の分散和音、和音の重ね、太鼓の連打、尺八の息づかいなどの型 |
| `lib.py` | 楽譜を MIDI にし、FluidSynth で鳴らし、残響・音量をととのえて一周を切り出す |
| `sf2patch.py` | 弦の刻み（16分音符など）がにじまぬよう、音色集の「弓の当たり」を強めた写しを作る |
| `kakidasu.py` | 書き出し。MP3 にして `dist/bgm/` へ置き、`rokuon.js` の指紋と一周の秒数を書き換える |
| `analyze.py` ほか | 確かめの道具（下の「四」） |

楽譜は Python で書いてあります。拍（四分音符＝1）で音を並べ、和音の進みを小節ごとに決めています。

---

## 二、要るもの

- Python 3.10 以降と、`numpy` `scipy` `mido` `soundfile` `pyloudnorm` `matplotlib`
- FluidSynth（音色集を鳴らす道具）、ffmpeg（MP3 に圧す道具。libmp3lame 入り）
- 音色集（SoundFont）を二つ
  - **MuseScore General（Full）**…Ubuntu／Debian の `musescore-general-soundfont-lossless` で入る。
    `/usr/share/sounds/sf2/MuseScore_General_Full.sf2` に置かれる
  - **GeneralUser GS v2.0.3**…<https://github.com/mrbumpy409/GeneralUser-GS> の `GeneralUser-GS.sf2`（琴に使う）

Ubuntu なら次の通りです。

```
sudo apt-get install fluidsynth musescore-general-soundfont-lossless ffmpeg
pip install numpy scipy mido soundfile pyloudnorm matplotlib
```

---

## 三、作り直す手順

```
mkdir -p tools/bgm/work
git clone --depth 1 https://github.com/mrbumpy409/GeneralUser-GS /tmp/gu
cp /tmp/gu/GeneralUser-GS.sf2 tools/bgm/work/

# 弦の弓の当たりを強めた写し（490MB）。一度作れば足りる
python3 tools/bgm/sf2patch.py /usr/share/sounds/sf2/MuseScore_General_Full.sf2 \
  tools/bgm/work/MSG_marc.sf2 120 40:48 50:48 30:48 25:48 20:48 0:48

# 鳴らして一周を切り出す（一曲 1〜2 分）→ tools/bgm/work/out/<曲>_loop.wav
python3 tools/bgm/seimu.py
python3 tools/bgm/yasen.py
python3 tools/bgm/shiro.py

# MP3 にして遊びの側へ据える（指紋と一周の秒数も書き換わる）
python3 tools/bgm/kakidasu.py

npm test
npm run build
```

`shiro.py all --mixonly` のように `--mixonly` を付けると、鳴らし直さずに混ぜ方（音量・残響）だけをやり直せます。
`shiro.py vln1,tpt` のように札の名を並べると、その楽器だけ鳴らし直します。

置き場を変えたいときは、環境変数 `BGM_WORK`（作業の置き場）・`BGM_SF_MSG`・`BGM_SF_GU`・`BGM_SF_MARC`（音色集）で指せます。

### 継ぎ目なしの一周の作り方

一曲を**二周つづけて**鳴らし、残響や余韻ごと**二周目だけを切り出して**います。
二周目の頭には一周目の終わりの余韻が乗っているので、終わりから頭へ巻き戻しても、
継ぎ目で音が途切れたり跳ねたりしません。

---

## 四、確かめの道具

| 打つこと | 分かること |
|---|---|
| `python3 tools/bgm/seam.py tools/bgm/work/out/shiro_loop.wav` | 継ぎ目で音が跳ねていないか |
| `python3 tools/bgm/clash.py shiro` | 長く鳴る音どうしの、半音のぶつかり |
| `analyze.py` の `run(...)` | 音量の流れ・音の分布・楽器ごとの鳴り具合を一枚の図に |
| `balance.py` の `section_balance(...)` | 区切りごとに、主旋律が伴奏より前に出ているか |
| `roll.py` の `plot(...)` | 楽譜を鍵盤の図に描く |

---

## 五、どこを直すと何が変わるか

- **テンポ**…各曲の頭の `Song('shiro', bpm=100, bars=40)`
- **和音の進み**…`chart`（小節番号 → 和音の名）
- **旋律**…`MEL` などの文字列（`音名:拍` を並べたもの）
- **城攻めの総攻撃**（いちばん盛り上がる所）…`shiro.py` の 29〜36 小節と、その前の 28 小節・後の 37 小節
- **楽器ごとの音量・定位・残響**…各曲の末尾の `MIX`

---

## 六、版

| 日付 | 中身 |
|---|---|
| 2026-10-27 | 三曲を作る |
| 2026-10-28 | 城攻めの総攻撃（1:07〜）に疾走感を足す。弦の16分音符・低弦の早駆け・太鼓と小太鼓の連打・金管の3+3+2の突き。最後は全合奏の三連打から銅鑼で落城 |

---

## 七、権利

- 旋律と構成は、いずれも新しく作ったものです。既存の曲の旋律は使っていません。
- 音色は MuseScore General（MIT ライセンス。弦の一部は VSCO 2 Community Edition〔CC0〕由来）と
  GeneralUser GS v2.0.3（音楽制作での商用利用を認めるライセンス）を使っています。
  梵鐘・銅鑼・残響、太鼓の低い響きは、このプログラムで合成しています。
