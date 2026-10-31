# -*- coding: utf-8 -*-
"""書き出し。作り直した効果音を MP3 にして遊びの側へ据える。

    python3 tools/se/kakidasu.py                 # 二十一とも
    python3 tools/se/kakidasu.py charge melee    # 名指し（下の 札 の左の名）

  一、tools/se/work/out/<名>.wav を MP3（VBR・-q:a 4）に圧し、dist/se/se_<名>.mp3 に置く
  二、MP3 を解き直して、長さが元の WAV と同じか（地は八秒ちょうどか）を検める
  三、src/audio/kouka.js の「長」（秒）と、地の五つの「指紋」を書き換える
"""
import sys, os, re, base64, subprocess
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SR = 44100

# 作る側の名 → kouka.js の名
札 = {
    'sel_mikata': '自軍を選ぶ', 'sel_teki': '敵を選ぶ',
    'march': '行軍', 'engage': '接戦', 'charge': '突撃', 'melee': '接敵', 'ship': '軍船',
    'horoku': '焙烙', 'notice_good': '有利', 'notice_bad': '不利',
    'win_field': '野戦の勝ち', 'lose_field': '野戦の負け', 'win_castle': '城を落とす', 'lose_castle': '城攻めの退き',
    'win_kessen': '決戦の勝ち', 'lose_kessen': '決戦の負け',
    'horagai': '法螺貝', 'jindaiko': '陣太鼓', 'teppo': '鉄砲', 'yumi': '弓', 'kachidoki': '勝鬨',
}
地 = {'march', 'engage', 'charge', 'melee', 'ship'}


def 指紋を取る(x):
    m = x[:2048].mean(1)
    m = m / (np.max(np.abs(m)) + 1e-9)
    return base64.b64encode(np.round(m * 127).astype(np.int8).tobytes()).decode()


def main(選=None):
    選 = 選 or list(札)
    kouka = os.path.join(ROOT, 'src', 'audio', 'kouka.js')
    js = open(kouka, encoding='utf-8').read()
    os.makedirs(os.path.join(ROOT, 'dist', 'se'), exist_ok=True)
    for key in 選:
        名 = 札[key]
        wav = os.path.join(HERE, 'work', 'out', f'{key}.wav')
        mp3 = os.path.join(ROOT, 'dist', 'se', f'se_{key}.mp3')
        x, sr = sf.read(wav, always_2d=True)
        assert sr == SR, f'{wav} は {SR}Hz でない'
        if key in 地:
            assert len(x) == 8 * SR, f'{key}: 地は八秒ちょうど（{8 * SR} 標本）でなければならぬ（{len(x)}）'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-q:a', '4',
                        '-id3v2_version', '3', '-metadata', f'title={名}', '-metadata', 'album=センゴク盤 効果音', mp3],
                       check=True)
        dec = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', mp3, '-f', 'f32le', '-ac', '2', '-'],
                             check=True, capture_output=True).stdout
        n = len(dec) // 8
        assert n == len(x), f'se_{key}.mp3: 解き直した長さ {n} が元の {len(x)} と合わぬ'
        長 = round(len(x) / SR, 3)
        js, k1 = re.subn(rf'({名}: {{ 札: "se_{key}\.mp3", 類: "[^"]+", 長: )[0-9.]+',
                         lambda m: m.group(1) + f'{長:g}', js)
        assert k1 == 1, f'kouka.js の {名} の長さが見つからぬ'
        if key in 地:
            印 = 指紋を取る(x)
            js, k2 = re.subn(rf'(  {名}: ")[A-Za-z0-9+/=]+(")', lambda m: m.group(1) + 印 + m.group(2), js)
            assert k2 == 1, f'kouka.js の {名} の指紋が見つからぬ'
        print(f'{名:8s} {os.path.getsize(mp3) / 1024:6.1f}KB  {長:6.3f} 秒  → dist/se/se_{key}.mp3')
    open(kouka, 'w', encoding='utf-8').write(js)
    print('src/audio/kouka.js の長さと指紋を書き換えた。npm test（kouka）と npm run build を走らせること。')


if __name__ == '__main__':
    main(sys.argv[1:] or None)
