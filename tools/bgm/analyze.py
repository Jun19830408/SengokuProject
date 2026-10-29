# -*- coding: utf-8 -*-
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import soundfile as sf
import pyloudnorm as pyln
from scipy import signal

SR = 44100


def kweight(x):
    m = pyln.Meter(SR)
    y = x.copy()
    for f in m._filters.values():
        y = f.apply_filter(y.T).T if y.ndim > 1 else f.apply_filter(y)
    return y


def short_term(x, win=3.0, hop=0.5):
    y = kweight(x)
    p = np.sum(y ** 2, axis=1)
    n = int(win * SR)
    h = int(hop * SR)
    t, L = [], []
    for s in range(0, len(p) - n, h):
        e = np.mean(p[s:s + n])
        t.append((s + n / 2) / SR)
        L.append(-0.691 + 10 * np.log10(e + 1e-12))
    return np.array(t), np.array(L)


def run(name, bpm, bars, rdir, wav, sections, out_png, stem_names=None):
    x, sr = sf.read(wav, always_2d=True)
    spb = 60 / bpm
    bar_s = spb * 4
    fig, axs = plt.subplots(3, 1, figsize=(16, 13), gridspec_kw=dict(height_ratios=[1, 2.2, 2.2]))
    t, L = short_term(x)
    axs[0].plot(t, L, color='k')
    axs[0].set_ylabel('short-term LUFS')
    axs[0].set_xlim(0, len(x) / SR)
    axs[0].grid(alpha=.3)
    for (bar, lab) in sections:
        tt = (bar - 1) * bar_s
        for a in axs[:2]:
            a.axvline(tt, color='r', alpha=.4)
        axs[0].text(tt + 0.3, np.nanmax(L) - 1, lab, fontsize=9, color='r')
    m = x.mean(1)
    f, tt, Z = signal.spectrogram(m, SR, nperseg=4096, noverlap=3072)
    Z = 10 * np.log10(Z + 1e-12)
    axs[1].pcolormesh(tt, f, Z, shading='auto', vmin=Z.max() - 90, vmax=Z.max(), cmap='magma')
    axs[1].set_yscale('symlog', linthresh=200)
    axs[1].set_ylim(30, 16000)
    axs[1].set_ylabel('Hz')
    # stem activity heatmap (cycle 2)
    if stem_names:
        Lb = int(round(bars * bar_s * SR))
        M = np.zeros((len(stem_names), bars))
        for i, s in enumerate(stem_names):
            y, _ = sf.read(os.path.join(rdir, s + '.wav'), always_2d=True)
            y = y[Lb:2 * Lb]
            for k in range(bars):
                seg = y[int(k * bar_s * SR):int((k + 1) * bar_s * SR)]
                M[i, k] = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9)
        im = axs[2].imshow(M, aspect='auto', cmap='viridis', vmin=-70, vmax=-15,
                           extent=[0.5, bars + 0.5, len(stem_names) - 0.5, -0.5])
        axs[2].set_yticks(range(len(stem_names)))
        axs[2].set_yticklabels(stem_names)
        axs[2].set_xticks(range(1, bars + 1))
        axs[2].set_xlabel('bar')
        plt.colorbar(im, ax=axs[2], fraction=0.02)
    fig.suptitle(name)
    fig.tight_layout()
    fig.savefig(out_png, dpi=70)
    print('saved', out_png)


if __name__ == '__main__':
    pass
