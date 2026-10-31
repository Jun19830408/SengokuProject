# -*- coding: utf-8 -*-
"""Crowd of shouting soldiers, built from many synthetic voices.

Each voice is a glottal buzz (band-limited sawtooth with jitter, shimmer and
breath) whose pitch rises at the start of a shout and sags at the end.  Voices
are summed in a handful of clusters; each cluster gets one vocal-tract filter
(a cascade of formant resonators, its own tract length and vowel), a place in
the stereo field and a distance.  Many detuned voices through shared formants
read as the roar of a crowd rather than as a choir.
"""
from dsp import *

# Japanese vowels, male, raised for shouting (F, bandwidth)
VOWELS = {
    'a': [(820, 95), (1260, 110), (2600, 160), (3500, 240), (4500, 320)],
    'o': [(560, 85), (900, 100), (2500, 150), (3400, 240), (4400, 320)],
    'e': [(500, 80), (1850, 110), (2600, 160), (3400, 240), (4400, 320)],
    'i': [(320, 60), (2250, 120), (3000, 170), (3700, 240), (4500, 320)],
    'u': [(360, 70), (1250, 110), (2400, 150), (3300, 240), (4300, 320)],
}


def polyblep_saw(f):
    """band-limited falling sawtooth for a per-sample frequency track f (Hz)"""
    dt = np.clip(f / SR, 1e-5, 0.45)
    ph = np.cumsum(dt) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    x = ph[m] / dt[m]
    y[m] -= x + x - x * x - 1
    m2 = ph > 1 - dt
    x = (ph[m2] - 1) / dt[m2]
    y[m2] -= x * x + x + x + 1
    return -y


def lp_noise(n, rng, f):
    z = filt(rng.standard_normal(n), sos_lp(f, 2))
    return z / (np.std(z) + 1e-9)


def voice(f0, dur, rng, rise=None, sag=0.06, wobble=0.015, jitter=0.012, shimmer=0.18, breath=0.10,
          att=None, rel=None, glide_from=0.86, contour=None, roughness=0.0):
    """one shouted note: source (pre-vocal-tract) signal, mono"""
    rel = rel if rel is not None else rng.uniform(0.12, 0.25)
    att = att if att is not None else rng.uniform(0.04, 0.12)
    n = N(dur + rel)
    t = tvec(n)
    rise = rise if rise is not None else rng.uniform(0.08, 0.22)
    if contour is None:
        c = glide_from + (1 - glide_from) * (1 - np.exp(-t / (rise / 3)))
        c *= 1 - sag * np.clip(t / dur, 0, 1.2)
        c *= np.where(t > dur, 1 - 0.12 * np.clip((t - dur) / rel, 0, 1), 1.0)
    else:
        c = contour(t)
    vib_f = rng.uniform(4.0, 7.0)
    c *= 1 + wobble * np.sin(2 * np.pi * vib_f * t + rng.uniform(0, 6.28)) * np.clip(t / 0.3, 0, 1)
    c *= 1 + jitter * lp_noise(n, rng, 40) * 0.5
    f = f0 * c
    src = polyblep_saw(f)
    if roughness:
        src *= 1 + roughness * np.sign(np.sin(np.pi * np.cumsum(f / SR)))     # subharmonic flutter (vocal fry/strain)
    src *= 1 + shimmer * lp_noise(n, rng, 90) * 0.5
    br = filt(rng.standard_normal(n), sos_hp(900, 2))
    src = src + breath * br * (0.5 + 0.5 * (src > 0))
    e = np.minimum(1, t / att) ** 0.6
    e *= np.where(t > dur, np.cos(np.clip((t - dur) / rel, 0, 1) * np.pi / 2) ** 2, 1.0)
    e *= 1 + rng.uniform(-0.25, 0.25) * np.clip(t / dur, 0, 1)                  # crescendo or fading
    return src * e


# relative formant levels for shouting (dB), parallel formant bank
LEVELS = {
    'a': [0, -2, -10, -14, -20],
    'o': [0, -4, -15, -19, -25],
    'e': [0, -5, -10, -14, -20],
    'i': [0, -9, -9, -13, -20],
    'u': [0, -8, -16, -20, -26],
}


def bpf_ba(F, B):
    """RBJ band-pass, 0 dB peak gain"""
    w0 = 2 * math.pi * min(F, SR * 0.45) / SR
    q = max(0.5, F / max(B, 1.0))
    al = math.sin(w0) / (2 * q)
    a0 = 1 + al
    return np.array([al, 0, -al]) / a0, np.array([1 + al, -2 * math.cos(w0), 1 - al]) / a0


def _flat(x):
    """pre-emphasis: undo the sawtooth's -6 dB/oct above ~250 Hz so every formant gets its own level"""
    return signal.lfilter([1, -0.965], [1], x) * 4.0


def tract(x, vowel="a", k=1.0, circular=False, bright_db=0.0, floor_db=-26):
    """static vocal tract: parallel formant bank (levels per vowel); k scales the formants (tract length)"""
    v = VOWELS[vowel]
    lv = LEVELS[vowel]
    xf = _flat(x)
    y = np.zeros_like(x)
    for j, ((F, B), L) in enumerate(zip(v, lv)):
        b, a = bpf_ba(F * k, B * (0.9 + 0.2 * k))
        b = b * (-1) ** j                                  # alternate signs, as in Klatt's parallel branch
        if circular:
            yy = signal.lfilter(b, a, np.concatenate([xf, xf]))
            yb = yy[len(xf):]
        else:
            yb = signal.lfilter(b, a, xf)
        y += yb * 10 ** (L / 20)
    y += x * 10 ** (floor_db / 20) * 0.5 + filt(xf, sos_hp(4500, 2)) * 10 ** ((floor_db - 4) / 20)
    if bright_db:
        y = shelf(y, 2200, bright_db, high=True)
    return y / (np.std(y) + 1e-9)


def tv_tract(x, tracks, block=64, bright_db=0.0, floor_db=-26):
    """time-varying tract. tracks: list over formants of (F array, B array, level_dB array) per block"""
    xf = _flat(x)
    y = np.zeros_like(x)
    nb = int(math.ceil(len(x) / block))
    for jj, (F, B, Lv) in enumerate(tracks):
        sgn = (-1) ** jj
        zi = np.zeros(2)
        out = np.empty_like(xf)
        for i in range(nb):
            s, e = i * block, min(len(x), (i + 1) * block)
            j = min(i, len(F) - 1)
            b, a = bpf_ba(F[j], B[j])
            out[s:e], zi = signal.lfilter(b * sgn, a, xf[s:e], zi=zi)
            out[s:e] *= 10 ** (Lv[j] / 20)
        y += out
    y += x * 10 ** (floor_db / 20) * 0.5 + filt(xf, sos_hp(4500, 2)) * 10 ** ((floor_db - 4) / 20)
    if bright_db:
        y = shelf(y, 2200, bright_db, high=True)
    return y / (np.std(y) + 1e-9)


def vowel_tracks(points, n, block=64, k=1.0):
    """points: [(time_s, vowel), ...] -> per-block formant tracks (linear interpolation)"""
    nb = int(math.ceil(n / block))
    tb = (np.arange(nb) + 0.5) * block / SR
    ts = [p[0] for p in points]
    tracks = []
    for j in range(5):
        Fs = [VOWELS[v][j][0] * k for _, v in points]
        Bs = [VOWELS[v][j][1] for _, v in points]
        Ls = [LEVELS[v][j] for _, v in points]
        tracks.append((np.interp(tb, ts, Fs), np.interp(tb, ts, Bs), np.interp(tb, ts, Ls)))
    return tracks


def crowd_loop(L_sec, n_voices, rng, clusters=None, f0_mu=185, f0_sd=0.16, shout=(0.7, 2.0), gap=(0.15, 0.8),
               intensity=None, rough=0.0):
    """continuous roar on a circle of L_sec. clusters: list of dict(vowel, k, pan, dist, gain)"""
    L = N(L_sec)
    clusters = clusters or [dict(vowel='a', k=1.0, pan=0.0, dist=1.0, gain=1.0)]
    src = [np.zeros(L) for _ in clusters]
    for v in range(n_voices):
        g = v % len(clusters)
        f0 = f0_mu * math.exp(rng.normal(0, f0_sd))
        t0 = rng.uniform(0, L_sec)
        used = 0.0
        while used < L_sec:
            d = rng.uniform(*shout)
            seg = voice(f0 * math.exp(rng.normal(0, 0.04)), d, rng, roughness=rough * rng.uniform(0, 1))
            if intensity is not None:                       # slow swells shared by the whole army
                tt = ((t0 + used) + tvec(len(seg))) % L_sec
                seg = seg * intensity(tt)
            s = N(t0 + used) % L
            k = 0
            while k < len(seg):
                m = min(len(seg) - k, L - s)
                src[g][s:s + m] += seg[k:k + m]
                k += m
                s = 0
            used += d + rng.uniform(*gap)
    out = np.zeros((L, 2))
    for c, x in zip(clusters, src):
        y = tract(x, c.get('vowel', 'a'), c.get('k', 1.0), circular=True, bright_db=c.get('bright', 0.0))
        d = c.get('dist', 1.0)
        if d > 1:
            y = filt_circ(y, sos_lp(max(900, 14000 / (1 + (d - 1) / 3.0)), 2))
        out += pan2(y, c.get('pan', 0.0)) * c.get('gain', 1.0) / d
    return out


def chant(rng, events, n_voices, total, f0_mu=180, f0_sd=0.15, clusters=4, spread=0.04, pan_w=0.8,
          dist=(1.0, 3.0), bright=0.0, block=64):
    """synchronised crowd call. events: list of dict(t, dur, vowels=[(rel_t, v)...], f0_mul, rise, att)"""
    n = N(total)
    out = np.zeros((n, 2))
    for ci in range(clusters):
        k = rng.uniform(0.93, 1.07)
        src = np.zeros(n)
        nv = max(1, n_voices // clusters)
        for _ in range(nv):
            f0 = f0_mu * math.exp(rng.normal(0, f0_sd))
            for ev in events:
                st = ev['t'] + abs(rng.normal(0, spread))
                seg = voice(f0 * ev.get('f0_mul', 1.0), ev['dur'] * rng.uniform(0.9, 1.1), rng,
                            rise=ev.get('rise', 0.12), att=ev.get('att', 0.04), rel=ev.get('rel', 0.18),
                            glide_from=ev.get('glide_from', 0.84), sag=ev.get('sag', 0.08),
                            roughness=ev.get('rough', 0.0) * rng.uniform(0.3, 1.0))
                s = N(st)
                e = min(n, s + len(seg))
                src[s:e] += seg[:e - s]
        pts = []
        for ev in events:
            for rt, v in ev['vowels']:
                pts.append((ev['t'] + rt, v))
        pts.sort()
        y = tv_tract(src, vowel_tracks(pts, n, block, k), block, bright)
        d = rng.uniform(*dist)
        y = filt(y, sos_lp(max(1500, 15000 / (1 + (d - 1) / 3.0)), 2))
        out += pan2(y, rng.uniform(-pan_w, pan_w)) / d
    return out
