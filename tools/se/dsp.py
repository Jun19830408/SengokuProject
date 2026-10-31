# -*- coding: utf-8 -*-
"""Sound-effect toolkit for Sengoku-ban (numpy only).

Everything is built at 44.1 kHz in float64, stereo arrays shaped (n, 2).
Loops are built on a circle: events that run past the end are folded back
to the start, beds are filtered circularly and the reverb is a circular
convolution, so the last sample flows into the first without a seam.
"""
import math
import numpy as np
from scipy import signal
import soundfile as sf
import pyloudnorm as pyln

SR = 44100


# ------------------------------------------------------------------ basics
def secs(n):
    return n / SR


def N(s):
    return int(round(s * SR))


def tvec(n):
    return np.arange(n) / SR


def sos_bp(lo, hi, order=2):
    hi = min(hi, SR / 2 * 0.98)
    return signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos')


def sos_lp(f, order=2):
    return signal.butter(order, min(f, SR / 2 * 0.98), 'lowpass', fs=SR, output='sos')


def sos_hp(f, order=2):
    return signal.butter(order, f, 'highpass', fs=SR, output='sos')


def filt(x, sos):
    return signal.sosfilt(sos, x, axis=0)


def filt_circ(x, sos):
    """loop-safe IIR filtering: run over two copies and keep the second"""
    y = signal.sosfilt(sos, np.concatenate([x, x], axis=0), axis=0)
    return y[len(x):]


def peak_eq(x, f0, gain_db, q=1.0):
    A = 10 ** (gain_db / 40)
    w0 = 2 * math.pi * f0 / SR
    al = math.sin(w0) / (2 * q)
    b = np.array([1 + al * A, -2 * math.cos(w0), 1 - al * A])
    a = np.array([1 + al / A, -2 * math.cos(w0), 1 - al / A])
    return signal.lfilter(b / a[0], a / a[0], x, axis=0)


def shelf(x, f0, gain_db, high=True, S=0.8):
    A = 10 ** (gain_db / 40)
    w0 = 2 * math.pi * f0 / SR
    al = math.sin(w0) / 2 * math.sqrt((A + 1 / A) * (1 / S - 1) + 2)
    c = math.cos(w0)
    if high:
        b = [A * ((A + 1) + (A - 1) * c + 2 * math.sqrt(A) * al), -2 * A * ((A - 1) + (A + 1) * c),
             A * ((A + 1) + (A - 1) * c - 2 * math.sqrt(A) * al)]
        a = [(A + 1) - (A - 1) * c + 2 * math.sqrt(A) * al, 2 * ((A - 1) - (A + 1) * c),
             (A + 1) - (A - 1) * c - 2 * math.sqrt(A) * al]
    else:
        b = [A * ((A + 1) - (A - 1) * c + 2 * math.sqrt(A) * al), 2 * A * ((A - 1) - (A + 1) * c),
             A * ((A + 1) - (A - 1) * c - 2 * math.sqrt(A) * al)]
        a = [(A + 1) + (A - 1) * c + 2 * math.sqrt(A) * al, -2 * ((A - 1) + (A + 1) * c),
             (A + 1) + (A - 1) * c - 2 * math.sqrt(A) * al]
    b, a = np.array(b), np.array(a)
    return signal.lfilter(b / a[0], a / a[0], x, axis=0)


def env_ad(n, att, dec, curve=1.0):
    """attack (s) then exponential-ish decay (time constant dec, s)"""
    t = tvec(n)
    a = np.minimum(1.0, t / max(att, 1e-4)) ** curve
    d = np.exp(-np.maximum(0, t - att) / max(dec, 1e-4))
    return a * d


def fade(x, fin=0.0, fout=0.0):
    y = x.copy()
    n = len(y)
    if fin > 0:
        k = min(n, N(fin))
        w = np.sin(np.linspace(0, math.pi / 2, k)) ** 2
        y[:k] *= w[:, None] if y.ndim == 2 else w
    if fout > 0:
        k = min(n, N(fout))
        w = np.cos(np.linspace(0, math.pi / 2, k)) ** 2
        y[-k:] *= w[:, None] if y.ndim == 2 else w
    return y


def pan2(mono, pan=0.0, width_jitter=0.0):
    """equal-power pan of a mono signal; pan in [-1, 1]"""
    th = (pan + 1) * math.pi / 4
    return np.stack([mono * math.cos(th), mono * math.sin(th)], 1) * math.sqrt(2)


def pan_traj(mono, pans):
    """equal-power pan following a per-sample (or interpolated) trajectory"""
    pans = np.interp(np.arange(len(mono)), np.linspace(0, len(mono) - 1, len(pans)), pans) if len(pans) != len(mono) else pans
    th = (np.clip(pans, -1, 1) + 1) * math.pi / 4
    return np.stack([mono * np.cos(th), mono * np.sin(th)], 1) * math.sqrt(2)


def stereo(x):
    return np.stack([x, x], 1) if x.ndim == 1 else x


# ------------------------------------------------------------------ placement
def place(buf, start, sig, wrap=True):
    """add sig (n,) or (n,2) into buf (L,2) at sample `start`; wraps around if wrap"""
    sig = stereo(sig)
    L = len(buf)
    n = len(sig)
    if not wrap:
        s = int(start)
        if s >= L or s + n <= 0:
            return
        a, b = max(0, s), min(L, s + n)
        buf[a:b] += sig[a - s:b - s]
        return
    s = int(start) % L
    off = 0
    while off < n:
        k = min(n - off, L - s)
        buf[s:s + k] += sig[off:off + k]
        off += k
        s = 0


def distance(sig, d, rng=None):
    """crude distance model: 1/d gain (d>=1), air lowpass, returns (dry_gain, filtered)"""
    d = max(1.0, d)
    cut = 16000 / (1 + (d - 1) / 6.0)
    y = filt(sig, sos_lp(max(cut, 900), 2))
    return y / d


# ------------------------------------------------------------------ sources
def noise_burst(n, rng, lo=None, hi=None, color=None):
    x = rng.standard_normal(n)
    if lo and hi:
        x = filt(x, sos_bp(lo, hi, 2))
    elif hi:
        x = filt(x, sos_lp(hi, 2))
    elif lo:
        x = filt(x, sos_hp(lo, 2))
    return x


def tail_fade(y, frac=0.25):
    """fade the last part of a fixed-length element to zero so a cut never clicks"""
    n = len(y)
    k = max(8, int(n * frac))
    w = np.cos(np.linspace(0, math.pi / 2, k)) ** 2
    y = y.copy()
    if y.ndim == 2:
        y[-k:] *= w[:, None]
    else:
        y[-k:] *= w
    return y


def modal(freqs, decays, amps, dur, rng, jitter=0.0):
    n = N(dur)
    t = tvec(n)
    y = np.zeros(n)
    for f, d, a in zip(freqs, decays, amps):
        if f >= SR / 2 * 0.95:
            continue
        f2 = f * (1 + rng.uniform(-jitter, jitter)) if jitter else f
        y += a * np.exp(-t / d) * np.sin(2 * math.pi * f2 * t + rng.uniform(0, 2 * math.pi))
    return tail_fade(y)


BAR = [1.0, 2.756, 5.404, 8.933, 13.344]          # free-free bar (flexural) mode ratios


def metal_hit(rng, f1=None, dur=0.7, bright=1.0, ring=1.0):
    """blade / spear-head clash: inharmonic bar modes + sharp transient"""
    f1 = f1 or rng.uniform(700, 1500)
    fr = [f1 * r * rng.uniform(0.985, 1.015) for r in BAR]
    fr += [f1 * rng.uniform(1.6, 2.2), f1 * rng.uniform(3.4, 4.2)]      # plate-ish extras
    dec = [0.35 * ring, 0.22 * ring, 0.12 * ring, 0.07 * ring, 0.045 * ring, 0.16 * ring, 0.08 * ring]
    amp = [1.0, 0.75 * bright, 0.55 * bright, 0.35 * bright, 0.2 * bright, 0.5, 0.35 * bright]
    y = modal(fr, dec, amp, dur, rng)
    n = len(y)
    tr = noise_burst(N(0.004), rng, lo=2500) * np.exp(-tvec(N(0.004)) / 0.0012) * 2.2
    y[:len(tr)] += tr
    scrape = noise_burst(N(0.06), rng, lo=2000, hi=9000) * env_ad(N(0.06), 0.002, 0.018) * 0.5
    y[:len(scrape)] += scrape
    y *= env_ad(n, 0.0004, dur * 2)
    y = tail_fade(y)
    return y / (np.max(np.abs(y)) + 1e-9)


def wood_hit(rng, f1=None, dur=0.18):
    """spear shaft / wooden clack: low bar modes, very fast decay"""
    f1 = f1 or rng.uniform(320, 900)
    fr = [f1 * r * rng.uniform(0.97, 1.03) for r in BAR[:4]]
    dec = [0.045, 0.028, 0.016, 0.01]
    amp = [1.0, 0.7, 0.4, 0.2]
    y = modal(fr, dec, amp, dur, rng)
    tr = noise_burst(N(0.003), rng, lo=1200, hi=8000) * np.exp(-tvec(N(0.003)) / 0.001) * 1.6
    y[:len(tr)] += tr
    return y / (np.max(np.abs(y)) + 1e-9)


def thud(rng, f_hi=110, f_lo=55, dec=0.07, dur=0.25, click=0.3, body_lo=60, body_hi=900):
    """soft impact on earth / body: falling sine + filtered noise"""
    n = N(dur)
    t = tvec(n)
    f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.02)
    ph = 2 * math.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / dec)
    nz = noise_burst(n, rng, lo=body_lo, hi=body_hi) * np.exp(-t / (dec * 0.6))
    y = y + nz / (np.max(np.abs(nz)) + 1e-9) * 0.6
    if click:
        c = noise_burst(N(0.004), rng, lo=1500, hi=7000) * np.exp(-tvec(N(0.004)) / 0.0015)
        y[:len(c)] += c / (np.max(np.abs(c)) + 1e-9) * click
    y = tail_fade(y, 0.3)
    return y / (np.max(np.abs(y)) + 1e-9)


def clicks(rng, n_clicks, span, f_lo=1800, f_hi=6500, dur=None):
    """armour rattle: a burst of tiny hard clicks (lacquered plates knocking)"""
    dur = dur or span + 0.05
    n = N(dur)
    y = np.zeros(n)
    for _ in range(n_clicks):
        s = N(rng.uniform(0, span) ** 1.3 / span ** 0.3)
        f = rng.uniform(f_lo, f_hi)
        L = N(rng.uniform(0.004, 0.012))
        t = tvec(L)
        c = np.sin(2 * math.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / rng.uniform(0.0015, 0.004))
        c += rng.standard_normal(L) * np.exp(-t / 0.0008) * 0.6
        a = rng.uniform(0.3, 1.0)
        e = min(n, s + L)
        y[s:e] += a * c[:e - s]
    return y / (np.max(np.abs(y)) + 1e-9)


def creak(rng, dur=0.5, f_res=(420, 900), rate=(25, 70)):
    """wood creak: a train of friction pulses at a wandering rate through resonances"""
    n = N(dur)
    t = tvec(n)
    r0, r1 = rng.uniform(*rate), rng.uniform(*rate)
    rate_t = r0 + (r1 - r0) * (0.5 - 0.5 * np.cos(np.pi * t / dur)) + rng.uniform(3, 8) * np.sin(2 * np.pi * rng.uniform(1, 3) * t)
    ph = np.cumsum(rate_t / SR)
    pulses = np.zeros(n)
    idx = np.where(np.diff(np.floor(ph)) > 0)[0]
    pulses[idx] = rng.uniform(0.5, 1.0, len(idx))
    y = np.zeros(n)
    for f in f_res:
        y += filt(pulses, sos_bp(f * 0.85, f * 1.15, 2)) * rng.uniform(0.6, 1.0)
    y *= np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7
    return y / (np.max(np.abs(y)) + 1e-9)


def splash(rng, dur=0.45, lo=250, hi=3500, att=0.008, dec=0.12):
    n = N(dur)
    y = noise_burst(n, rng, lo=lo, hi=hi)
    # bubbly modulation
    m = 1 + 0.6 * filt(rng.standard_normal(n), sos_lp(60, 2)) / 0.15
    y = y * np.clip(m, 0, None) * env_ad(n, att, dec)
    return y / (np.max(np.abs(y)) + 1e-9)


# ------------------------------------------------------------------ reverb
def make_ir(rt=1.2, length=2.2, predelay=0.012, seed=3, er_n=14, er_span=0.06, er_gain=0.6, lp=9000,
            rt_low_mul=1.15, rt_high_mul=0.55):
    rng = np.random.default_rng(seed)
    n = N(length)
    t = tvec(n)
    out = np.zeros((n + N(predelay), 2))
    nfft = 1 << (n - 1).bit_length()
    freqs = np.fft.rfftfreq(nfft, 1 / SR)
    for ch in range(2):
        spec = np.fft.rfft(rng.standard_normal(nfft))
        w_lo = 1 / (1 + (freqs / 350.0) ** 4)
        w_hi = 1 / (1 + (3500.0 / np.maximum(freqs, 1e-3)) ** 4)
        w_mid = np.clip(1 - w_lo - w_hi, 0, 1)
        tail = np.zeros(n)
        for w, r in ((w_lo, rt * rt_low_mul), (w_mid, rt), (w_hi, rt * rt_high_mul)):
            tail += np.fft.irfft(spec * w, nfft)[:n] * np.exp(-6.91 * t / r)
        tail *= 1 - np.exp(-t / 0.03)
        er = np.zeros(n)
        for _ in range(er_n):
            dly = rng.uniform(0.003, er_span)
            er[N(dly)] += er_gain * math.exp(-dly * 20) * rng.choice([-1, 1]) * rng.uniform(0.5, 1)
        ir = er + tail / (np.sqrt(np.sum(tail ** 2)) + 1e-9) * 5.0
        out[N(predelay):, ch] = filt(ir, sos_lp(lp, 2))
    return out / np.sqrt(np.sum(out ** 2) / 2)


def reverb(x, ir, wet_db=-10, circular=False, cross=0.25):
    """returns dry + wet; circular=True keeps a loop seamless"""
    x = stereo(x)
    g = 10 ** (wet_db / 20)
    if circular:
        L = len(x)
        assert len(ir) < L, 'IR longer than loop'
        X = np.fft.rfft(x, L, axis=0)
        H = np.fft.rfft(ir, L, axis=0)
        yl = np.fft.irfft(X[:, 0] * H[:, 0] + cross * X[:, 1] * H[:, 0], L)
        yr = np.fft.irfft(X[:, 1] * H[:, 1] + cross * X[:, 0] * H[:, 1], L)
        return x + g * np.stack([yl, yr], 1)
    n = len(x) + len(ir)
    xp = np.vstack([x, np.zeros((len(ir), 2))])
    yl = signal.oaconvolve(xp[:, 0], ir[:, 0])[:n] + cross * signal.oaconvolve(xp[:, 1], ir[:, 0])[:n]
    yr = signal.oaconvolve(xp[:, 1], ir[:, 1])[:n] + cross * signal.oaconvolve(xp[:, 0], ir[:, 1])[:n]
    return xp + g * np.stack([yl, yr], 1)


# ------------------------------------------------------------------ output
METER = pyln.Meter(SR)


def lufs(x):
    x = stereo(x)
    if len(x) < N(0.45):
        x = np.vstack([x, np.zeros((N(0.45) - len(x), 2))])
    return METER.integrated_loudness(x)


def momentary_max(x):
    x = stereo(x)
    m = pyln.Meter(SR, block_size=0.4)
    best = -120.0
    hop = N(0.1)
    w = N(0.4)
    if len(x) < w:
        x = np.vstack([x, np.zeros((w - len(x), 2))])
    for s in range(0, len(x) - w + 1, hop):
        try:
            v = m.integrated_loudness(x[s:s + w])
        except Exception:
            continue
        best = max(best, v)
    return best


def true_peak_db(x):
    up = signal.resample_poly(stereo(x), 4, 1, axis=0)
    return 20 * math.log10(np.max(np.abs(up)) + 1e-12)


def soft_limit(x, ceiling_db=-1.0):
    """gentle peak control for one-shots: tanh knee above -6 dB of ceiling, then hard ceiling"""
    c = 10 ** (ceiling_db / 20)
    y = np.tanh(x / c * 1.0) * c
    return y


def normalize(x, target_lufs=None, peak_db=None, momentary=None, ceiling_db=-1.0):
    x = stereo(x)
    if momentary is not None:
        g = 10 ** ((momentary - momentary_max(x)) / 20)
    elif target_lufs is not None:
        g = 10 ** ((target_lufs - lufs(x)) / 20)
    else:
        g = 10 ** ((peak_db - 20 * math.log10(np.max(np.abs(x)) + 1e-12)) / 20)
    y = x * g
    tp = true_peak_db(y)
    if tp > ceiling_db:
        # limiter: a fast look-ahead-free gain computer is fine for one-shots
        from scipy.ndimage import maximum_filter1d, uniform_filter1d
        c = 10 ** (ceiling_db / 20)
        pk = maximum_filter1d(np.max(np.abs(y), 1), N(0.003))
        gg = np.minimum(1.0, c / np.maximum(pk, 1e-9))
        gg = uniform_filter1d(gg, N(0.002))
        y = y * gg[:, None]
    tp = true_peak_db(y)
    if tp > ceiling_db:                       # inter-sample peaks: scale the whole sound down the rest of the way
        y = y * 10 ** ((ceiling_db - tp) / 20)
    return y


def trim_tail(x, thresh_db=-62, pad=0.05):
    a = np.max(np.abs(stereo(x)), 1)
    th = 10 ** (thresh_db / 20) * np.max(a)
    idx = np.where(a > th)[0]
    end = min(len(x), (idx[-1] if len(idx) else len(x)) + N(pad))
    return fade(x[:end], 0, min(0.08, secs(end) * 0.2))


def write(path, x):
    sf.write(path, stereo(x).astype(np.float32), SR, subtype='PCM_24')


def report(name, x, loop=False):
    x = stereo(x)
    info = dict(dur=round(secs(len(x)), 3), lufs=round(lufs(x), 1), mom_max=round(momentary_max(x), 1),
                tp=round(true_peak_db(x), 1))
    if loop:
        info['wrap'] = round(float(np.max(np.abs(x[0] - x[-1]))), 4)
        info['med'] = round(float(np.median(np.max(np.abs(np.diff(x, axis=0)), 1))), 4)
    print(f'{name:18s}', info)
    return info
