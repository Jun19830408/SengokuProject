# -*- coding: utf-8 -*-
"""書き出し。作り直した曲を MP3 にして、遊びの側へ据える。

    python3 tools/bgm/kakidasu.py            # 四曲とも
    python3 tools/bgm/kakidasu.py shiro      # 城攻めだけ（seimu / yasen / shiro / wakeme）

  一、work/out/<曲>_loop.wav を MP3（VBR 平均約100kbps）に圧し、dist/bgm/ に置く
  二、MP3 を解き直して、長さが一周ちょうどか（継ぎ目が狂わぬか）を検める
  三、src/audio/rokuon.js の「指紋」と「周」（一周の秒数）を書き換える
"""
import sys, os, re, json, base64, subprocess
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
WORK = os.environ.get('BGM_WORK', os.path.join(HERE, 'work'))
SR = 44100

曲 = {
    'seimu': ('bgm_seimu.mp3', '政務', '政務「天下静謐」'),
    'yasen': ('bgm_yasen.mp3', '野戦', '野戦「疾風の陣」'),
    'shiro': ('bgm_shirozeme.mp3', '城攻め', '城攻め「攻城の刻」'),
    'wakeme': ('bgm_wakeme.mp3', '分け目', '天下分け目「天下決戦」'),
}


def 指紋を取る(x):
    m = x[:2048].mean(1)
    m = m / (np.max(np.abs(m)) + 1e-9)
    return base64.b64encode(np.round(m * 127).astype(np.int8).tobytes()).decode()


def main(選 = None):
    選 = 選 or list(曲)
    rokuon = os.path.join(ROOT, 'src', 'audio', 'rokuon.js')
    js = open(rokuon, encoding='utf-8').read()
    os.makedirs(os.path.join(ROOT, 'dist', 'bgm'), exist_ok=True)
    for key in 選:
        札, 名, 題 = 曲[key]
        wav = os.path.join(WORK, 'out', f'{key}_loop.wav')
        mp3 = os.path.join(ROOT, 'dist', 'bgm', 札)
        x, sr = sf.read(wav, always_2d=True)
        assert sr == SR, f'{wav} は {SR}Hz でない'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-q:a', '6',
                        '-id3v2_version', '3', '-metadata', f'title={題}', '-metadata', 'album=センゴク盤 BGM',
                        '-metadata', 'comment=seamless loop', mp3], check=True)
        dec = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', mp3, '-f', 'f32le', '-ac', '2', '-'],
                             check=True, capture_output=True).stdout
        n = len(dec) // 8
        assert n == len(x), f'{札}: 解き直した長さ {n} が一周 {len(x)} と合わぬ'
        周 = len(x) / SR
        印 = 指紋を取る(x)
        js, k1 = re.subn(rf'(  {名}:\n    ")[A-Za-z0-9+/=]+(")', lambda m: m.group(1) + 印 + m.group(2), js)
        js, k2 = re.subn(rf'({名}: {{ 札: "{re.escape(札)}", 周: )[0-9.]+', lambda m: m.group(1) + f'{周:g}', js)
        assert k1 == 1 and k2 == 1, f'rokuon.js の {名} が見つからぬ（指紋 {k1}・周 {k2}）'
        print(f'{題:16s} {os.path.getsize(mp3) / 1048576:5.2f}MB  一周 {周:g} 秒  → dist/bgm/{札}')
    open(rokuon, 'w', encoding='utf-8').write(js)
    print('src/audio/rokuon.js の指紋と周を書き換えた。npm test と npm run build を走らせること。')


if __name__ == '__main__':
    main(sys.argv[1:] or None)
