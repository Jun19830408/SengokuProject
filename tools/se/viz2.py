"""detail view: linear spectrogram to fmax + f0 track (autocorrelation) + level"""
import sys, numpy as np, soundfile as sf
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from scipy import signal

def f0_track(m, sr, fmin=70, fmax=600, hop=0.01, win=0.04):
    H, W = int(hop * sr), int(win * sr)
    ts, fs = [], []
    for i in range(0, len(m) - W, H):
        x = m[i:i + W] * np.hanning(W)
        if np.sqrt(np.mean(x ** 2)) < 1e-3:
            ts.append(i / sr); fs.append(np.nan); continue
        r = np.correlate(x, x, 'full')[W - 1:]
        r /= r[0] + 1e-12
        lo, hi = int(sr / fmax), int(sr / fmin)
        k = lo + np.argmax(r[lo:hi])
        ts.append(i / sr); fs.append(sr / k if r[k] > 0.35 else np.nan)
    return np.array(ts), np.array(fs)

out, fmax = sys.argv[1], float(sys.argv[2])
paths = sys.argv[3:]
fig, axs = plt.subplots(len(paths), 2, figsize=(16, 2.6 * len(paths)), gridspec_kw=dict(width_ratios=[1, 2.4]))
axs = np.atleast_2d(axs)
for (a1, a2), p in zip(axs, paths):
    x, sr = sf.read(p, always_2d=True)
    m = x.mean(1)
    t = np.arange(len(m)) / sr
    env = 20 * np.log10(np.maximum(1e-6, np.sqrt(signal.lfilter([0.005], [1, -0.995], m ** 2))))
    a1.plot(t, env, lw=0.6); a1.set_ylim(-60, 0); a1.set_title(p.split('/')[-1], fontsize=9); a1.grid(alpha=.3)
    ts, fs = f0_track(m, sr)
    a1b = a1.twinx(); a1b.plot(ts, fs, 'r.', ms=1.5); a1b.set_ylim(50, 700)
    f, tt, Z = signal.spectrogram(m, sr, nperseg=2048, noverlap=2048 - 256)
    sel = f <= fmax
    a2.pcolormesh(tt, f[sel], 10 * np.log10(Z[sel] + 1e-14), shading='auto', vmin=-130, vmax=-40, cmap='magma')
fig.tight_layout(); fig.savefig(out, dpi=60)
