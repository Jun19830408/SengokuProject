# -*- coding: utf-8 -*-
"""Battle sound effects for Sengoku-ban — all synthesized here (no samples).

    python3 sfx.py            # everything
    python3 sfx.py march      # one item (names below)

Loops are exactly LOOP seconds long and seamless (events wrap around, beds are
filtered circularly and the reverb is a circular convolution).
"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import *
from crowd import crowd_loop, chant, voice, tract

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work', 'out')
LOOP = 8.0


# ============================================================ building blocks
def footstep(rng, weight=1.0, run=False):
    """one footfall in straw sandals on earth: heel thud + scuff"""
    th = thud(rng, f_hi=rng.uniform(90, 120), f_lo=rng.uniform(48, 60), dec=0.045 if not run else 0.055,
              dur=0.22, click=0.15, body_lo=80, body_hi=700)
    sc_n = N(rng.uniform(0.05, 0.11) if not run else rng.uniform(0.07, 0.14))
    sc = noise_burst(sc_n, rng, lo=rng.uniform(350, 600), hi=rng.uniform(2200, 4000)) * env_ad(sc_n, 0.006, 0.03)
    y = th * (0.9 if not run else 1.1) * weight
    y[:sc_n] += sc / (np.max(np.abs(sc)) + 1e-9) * (0.35 if not run else 0.5)
    return y


def armour(rng, strength=1.0, span=0.07):
    """a shake of lacquered iron/leather scales (kozane) and fittings"""
    n = int(rng.integers(5, 13) * strength) + 2
    y = clicks(rng, n, span * rng.uniform(0.8, 1.3), f_lo=1600, f_hi=6200)
    # a few lower 'kacha' plates
    if rng.random() < 0.6:
        y2 = clicks(rng, max(2, n // 3), span, f_lo=700, f_hi=1700)
        m = min(len(y), len(y2))
        y[:m] += y2[:m] * 0.6
    return y / (np.max(np.abs(y)) + 1e-9)


def hoof(rng, heavy=1.0):
    """hoof striking soft ground at a gallop"""
    th = thud(rng, f_hi=rng.uniform(110, 150), f_lo=rng.uniform(45, 58), dec=0.05, dur=0.25, click=0.25,
              body_lo=90, body_hi=1100)
    dn = N(0.06)
    dirt = noise_burst(dn, rng, lo=900, hi=5000) * env_ad(dn, 0.002, 0.018)
    y = th * heavy
    y[:dn] += dirt / (np.max(np.abs(dirt)) + 1e-9) * 0.35
    return y


def snort(rng):
    n = N(rng.uniform(0.12, 0.22))
    y = noise_burst(n, rng, lo=500, hi=2600)
    y = peak_eq(y, rng.uniform(900, 1300), 9, 3)
    y *= env_ad(n, 0.012, 0.05)
    return y / (np.max(np.abs(y)) + 1e-9)


def flutter_bed(rng, L, flags=3, level=1.0):
    """banners (sashimono, nobori) flapping: band noise with a flapping amplitude"""
    t = tvec(L)
    out = np.zeros((L, 2))
    for i in range(flags):
        x = filt_circ(rng.standard_normal(L), sos_bp(rng.uniform(300, 600), rng.uniform(1800, 3200), 2))
        k1 = int(rng.integers(40, 80))                      # cycles per loop -> 5..10 Hz flaps
        k2 = int(rng.integers(1, 3))                        # gusts per loop
        ph = rng.uniform(0, 6.28, 2)
        m = (0.55 + 0.45 * np.sin(2 * np.pi * k1 * t / secs(L) + ph[0] + 0.6 * np.sin(2 * np.pi * 3 * t / secs(L)))) ** 3
        g = 0.6 + 0.4 * np.sin(2 * np.pi * k2 * t / secs(L) + ph[1])
        out += pan2(x * m * g / (np.std(x) + 1e-9), rng.uniform(-0.8, 0.8)) * level / flags
    return out


def wind_bed(rng, L, lo=80, hi=700, level=1.0):
    t = tvec(L)
    x = filt_circ(rng.standard_normal(L), sos_bp(lo, hi, 2))
    m = 0.7 + 0.3 * np.sin(2 * np.pi * 1 * t / secs(L) + rng.uniform(0, 6.28)) + 0.15 * np.sin(2 * np.pi * 3 * t / secs(L))
    x = x * m / (np.std(x) + 1e-9)
    return np.stack([x, np.roll(x, N(0.013))], 1) * level


def outdoor_ir(seed=11, rt=0.9):
    return make_ir(rt=rt, length=min(2.0, rt * 1.9), predelay=0.018, seed=seed, er_n=10, er_span=0.09,
                   er_gain=0.5, lp=8000, rt_low_mul=1.1, rt_high_mul=0.5)


def mix_level(x, target):
    return x * 10 ** ((target - lufs(x)) / 20)


# ============================================================ 1. selecting a unit
def sel_mikata(rng):
    """own unit: kotsuzumi 'pon' — round, bright, rising feel"""
    d = 0.8
    n = N(d)
    t = tvec(n)
    f = 392 + 70 * np.exp(-t / 0.018)                       # pitch drops into the note (G4)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / 0.10)
    y += 0.35 * np.sin(2 * ph * 1.003) * np.exp(-t / 0.06)
    y += 0.18 * np.sin(2.93 * ph) * np.exp(-t / 0.035)
    y += 0.25 * np.sin(2 * np.pi * 196 * t) * np.exp(-t / 0.05)     # the hourglass body
    c = noise_burst(N(0.006), rng, lo=1500, hi=6000) * np.exp(-tvec(N(0.006)) / 0.0015)
    y[:len(c)] += c / np.max(np.abs(c)) * 0.5
    y *= np.minimum(1, t / 0.0015)
    # a faint koto-like harmonic on top, a fifth above, so the 'own' side reads warm
    h = 0.22 * np.sin(2 * np.pi * 1176 * t) * np.exp(-t / 0.09) * np.minimum(1, t / 0.004)
    y = y + np.concatenate([np.zeros(N(0.035)), h[:-N(0.035)]])
    y = pan2(tail_fade(y / np.max(np.abs(y)), 0.3), 0.0)
    y = reverb(y, make_ir(rt=0.5, length=0.9, seed=21, lp=9000), wet_db=-16)
    return normalize(trim_tail(y), momentary=-17, ceiling_db=-3)


def sel_teki(rng):
    """enemy unit: hard, dry otsuzumi 'kan' over a low knock, with a cold metallic edge"""
    d = 0.7
    n = N(d)
    t = tvec(n)
    crack = noise_burst(n, rng, lo=1800, hi=5200)
    crack = peak_eq(crack, 2350, 14, 6) + peak_eq(crack, 3550, 10, 7) * 0.6
    crack *= np.exp(-t / 0.028) * np.minimum(1, t / 0.0008)
    crack /= np.max(np.abs(crack))
    low = thud(rng, f_hi=150, f_lo=95, dec=0.06, dur=d, click=0.0, body_lo=120, body_hi=600) * 0.55
    ring = modal([1655, 1655 * 2.76, 1655 * 1.41], [0.11, 0.05, 0.07], [0.5, 0.25, 0.3], d, rng)  # minor-second-ish rub
    ring *= np.minimum(1, t / 0.002)
    y = crack + low[:n] + ring * 0.6
    y = pan2(tail_fade(y / np.max(np.abs(y)), 0.3), 0.0)
    y = reverb(y, make_ir(rt=0.45, length=0.8, seed=22, lp=8000), wet_db=-17)
    return normalize(trim_tail(y), momentary=-17, ceiling_db=-3)


# ============================================================ 2. soldiers (zoomed in) — loops
def walkers_layer(rng, L, n_people, rate=(1.7, 2.0), run=False, dist=(1.5, 8.0), armour_strength=1.0):
    """people stepping on a circle of L samples; each person keeps an exact period that divides the loop"""
    out = np.zeros((L, 2))
    Ls = secs(L)
    for i in range(n_people):
        k = int(round(Ls * rng.uniform(*rate)))                # steps per loop (integer -> periodic)
        T = Ls / k
        ph = rng.uniform(0, T)
        d = rng.uniform(*dist) if i > 2 else rng.uniform(1.0, 2.0)     # a few soldiers close by
        pan = float(np.clip(rng.normal(0, 0.45), -0.95, 0.95))
        g = 1.0 / d
        cut = max(1500, 15000 / (1 + (d - 1) / 4.0))
        sos = sos_lp(cut, 2)
        for s in range(k):
            t0 = ph + s * T + rng.normal(0, 0.012)
            fs = footstep(rng, weight=rng.uniform(0.7, 1.0) * (1.15 if s % 2 else 1.0), run=run)
            ar = armour(rng, strength=armour_strength * rng.uniform(0.6, 1.3), span=0.08 if run else 0.06)
            sig = np.zeros(max(len(fs), N(0.012) + len(ar)))
            sig[:len(fs)] += fs
            sig[N(0.012):N(0.012) + len(ar)] += ar * rng.uniform(0.35, 0.6) * (1.3 if run else 1.0)
            sig = filt(sig, sos) * g
            place(out, N(t0), pan2(sig, pan))
    return out


def loop_kougun(rng):
    """marching: unhurried steps, armour rattle, a spear shaft knocking now and then, banners"""
    L = N(LOOP)
    feet = walkers_layer(rng, L, 34, rate=(1.65, 1.95), run=False, dist=(1.6, 9.0))
    knocks = np.zeros((L, 2))
    for _ in range(7):
        w = wood_hit(rng, f1=rng.uniform(380, 650)) * rng.uniform(0.25, 0.45)
        place(knocks, N(rng.uniform(0, LOOP)), pan2(filt(w, sos_lp(5000, 2)) / rng.uniform(1.5, 4), rng.uniform(-0.8, 0.8)))
    flags = flutter_bed(rng, L, flags=3)
    wind = wind_bed(rng, L, 70, 500)
    x = mix_level(feet, -24) + mix_level(knocks, -36) + mix_level(flags, -36) + mix_level(wind, -40)
    x = reverb(x, outdoor_ir(31, 0.8), wet_db=-14, circular=True)
    return normalize(x, target_lufs=-24, ceiling_db=-3)


def army_intensity(phase=0.0, depth=0.25, cycles=2):
    return lambda tt: 1 + depth * np.sin(2 * np.pi * cycles * tt / LOOP + phase)


def shout_clusters(rng, n, dist=(1.4, 3.6), vowels=('a', 'a', 'a', 'o'), bright=0.0):
    pans = np.linspace(-0.85, 0.85, n) + rng.normal(0, 0.08, n)
    return [dict(vowel=vowels[i % len(vowels)], k=rng.uniform(0.93, 1.07), pan=float(np.clip(pans[i], -1, 1)),
                 dist=rng.uniform(*dist), gain=rng.uniform(0.8, 1.1), bright=bright) for i in range(n)]


def loop_sessen(rng):
    """closing to engage on foot: running feet, clattering armour, the army's roar"""
    L = N(LOOP)
    feet = walkers_layer(rng, L, 40, rate=(2.9, 3.3), run=True, dist=(1.4, 8.0), armour_strength=1.5)
    roar = crowd_loop(LOOP, 96, rng, shout_clusters(rng, 6, dist=(1.3, 3.2)), f0_mu=205, f0_sd=0.15,
                      shout=(0.6, 1.6), gap=(0.1, 0.45), intensity=army_intensity(0.3, 0.22, 2), rough=0.25)
    wind = wind_bed(rng, L, 70, 500)
    x = mix_level(feet, -22.5) + mix_level(roar, -21.5) + mix_level(wind, -40)
    x = reverb(x, outdoor_ir(32, 1.0), wet_db=-12, circular=True)
    return normalize(x, target_lufs=-20, ceiling_db=-2)


def horses_layer(rng, L, n_horses, dist=(1.5, 8.0)):
    out = np.zeros((L, 2))
    Ls = secs(L)
    for i in range(n_horses):
        k = int(rng.integers(16, 20))                          # strides per loop -> 2.0..2.4 Hz
        T = Ls / k
        ph = rng.uniform(0, T)
        d = rng.uniform(*dist) if i > 1 else rng.uniform(1.0, 1.8)
        pan = float(np.clip(rng.normal(0, 0.5), -0.95, 0.95))
        sos = sos_lp(max(1200, 14000 / (1 + (d - 1) / 3.5)), 2)
        offs = np.array([0.0, 0.085, 0.24, 0.32]) * rng.uniform(0.9, 1.1)    # transverse gallop: hinds, then fores
        heavy = [0.9, 0.95, 1.1, 1.15]
        for s in range(k):
            base = ph + s * T + rng.normal(0, 0.006)
            for o, h in zip(offs, heavy):
                hv = hoof(rng, heavy=h * rng.uniform(0.85, 1.1))
                place(out, N(base + o * T), pan2(filt(hv, sos) / d, pan))
            if rng.random() < 0.8:                              # tack and the rider's armour bounce once a stride
                a = armour(rng, strength=1.2, span=0.09) * 0.32
                place(out, N(base + 0.36 * T), pan2(filt(a, sos) / d, pan))
            if rng.random() < 0.55:                             # breath locked to the stride
                sn = snort(rng) * 0.22
                place(out, N(base + 0.45 * T), pan2(filt(sn, sos) / d, pan))
    return out


def loop_totsugeki(rng):
    """cavalry charge: the thunder of many hooves, rattling tack, and the roar"""
    L = N(LOOP)
    hooves = horses_layer(rng, L, 30, dist=(1.4, 8.0))
    rumble = filt_circ(rng.standard_normal(L), sos_lp(110, 2))
    rumble = stereo(rumble / np.std(rumble))
    roar = crowd_loop(LOOP, 72, rng, shout_clusters(rng, 5, dist=(1.6, 3.6)), f0_mu=200, f0_sd=0.15,
                      shout=(0.7, 1.8), gap=(0.1, 0.5), intensity=army_intensity(1.1, 0.2, 2), rough=0.3)
    x = mix_level(hooves, -21.5) + mix_level(rumble, -30) + mix_level(roar, -23)
    x = shelf(x, 120, 2.0, high=False)
    x = reverb(x, outdoor_ir(33, 1.0), wet_db=-12, circular=True)
    return normalize(x, target_lufs=-20, ceiling_db=-2)


# ------------------------------------------------------------ cavalry charge, v2: the ground itself rumbling
GALLOP = np.array([0.0, 0.17, 0.42, 0.56])                     # transverse gallop: hind, hind, fore, fore (x stride/2.4)


HOOF2 = dict(f_end=(62, 80), f_drop=(110, 160), ring=0.2, knock=(0.6, 0.85), nz=(90, 900), dirt=(0.3, 0.4))


def hoof2(rng, heavy=1.0, P=None):
    """a heavy hoof driving into turf: a deep thump (with the ground's own low ring), a dull knock that
    small speakers can still carry, and a spit of dirt"""
    P = P or HOOF2
    dur = 0.34
    n = N(dur)
    t = tvec(n)
    f = rng.uniform(*P['f_end']) + rng.uniform(*P['f_drop']) * np.exp(-t / 0.018)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / rng.uniform(0.05, 0.075))
    ground = np.sin(2 * np.pi * rng.uniform(34, 46) * t + rng.uniform(0, 6.28)) * np.exp(-t / 0.13) * (1 - np.exp(-t / 0.01))
    kn_f = rng.uniform(210, 380)
    knock = np.sin(2 * np.pi * kn_f * t) * np.exp(-t / 0.022)
    knock += 0.5 * np.sin(2 * np.pi * kn_f * rng.uniform(1.9, 2.4) * t) * np.exp(-t / 0.012)
    thump_nz = noise_burst(n, rng, lo=P['nz'][0], hi=P['nz'][1]) * np.exp(-t / 0.035)
    dn = N(0.05)
    dirt = noise_burst(dn, rng, lo=1200, hi=6000) * env_ad(dn, 0.002, 0.016)
    y = body * 1.0 + ground * P['ring'] + knock * rng.uniform(*P['knock']) + thump_nz / (np.max(np.abs(thump_nz)) + 1e-9) * 0.45
    y[:dn] += dirt / (np.max(np.abs(dirt)) + 1e-9) * rng.uniform(*P['dirt'])
    y *= np.minimum(1, t / 0.0012)
    y = tail_fade(y, 0.3)
    return y / (np.max(np.abs(y)) + 1e-9) * heavy


def gallop_beats(rng, Ls, k, ph, jitter=0.007):
    """footfall times on a circle of Ls seconds for one horse with k strides per loop"""
    T = Ls / k
    ts, hs = [], []
    for s_ in range(k):
        base = ph + s_ * T + rng.normal(0, jitter)
        for o, h in zip(GALLOP * T / 2.4 * rng.uniform(0.9, 1.1), (0.85, 0.95, 1.1, 1.2)):
            ts.append(base + o)
            hs.append(h * rng.uniform(0.8, 1.1))
    return ts, hs


def riders_layer(rng, L, n, dist, pan_sd=0.5, tack=0.8):
    """individually voiced horses (near and middle distance)"""
    out = np.zeros((L, 2))
    Ls = secs(L)
    for i in range(n):
        k = int(rng.integers(16, 20))
        d = rng.uniform(*dist)
        pan = float(np.clip(rng.normal(0, pan_sd), -0.95, 0.95))
        sos = sos_lp(max(900, 14000 / (1 + (d - 1) / 3.0)), 2)
        ts, hs = gallop_beats(rng, Ls, k, rng.uniform(0, Ls / k))
        for t0, h in zip(ts, hs):
            place(out, N(t0), pan2(filt(hoof2(rng, h), sos) / d, pan))
        T = Ls / k
        for s_ in range(k):
            base = ts[4 * s_]
            if rng.random() < tack:                                  # tack and armour jolt once a stride
                a = armour(rng, strength=1.2, span=0.09) * 0.22
                place(out, N(base + 0.3 * T), pan2(filt(a, sos) / d, pan))
            if rng.random() < 0.4:
                sn = snort(rng) * 0.16
                place(out, N(base + 0.45 * T), pan2(filt(sn, sos) / d, pan))
    return out


def herd_layer(rng, L, n_horses, groups=8, swell=None, lp=(160, 260), sync=0.05):
    """hundreds of horses further off: every footfall as an impulse, rung through a few deep thump shapes
    (circular FFT convolution, so the loop stays seamless). Each group keeps roughly one stride, so the
    footfalls come in rolling waves -- the 'do-do-do-do' of the ground -- instead of an even hiss"""
    Ls = secs(L)
    out = np.zeros((L, 2))
    for g in range(groups):
        imp = np.zeros(L)
        k = int(rng.integers(16, 20))
        gph = rng.uniform(0, Ls / k)
        for i in range(n_horses // groups):
            d = rng.uniform(2.0, 9.0)
            ts, hs = gallop_beats(rng, Ls, k, gph + rng.normal(0, sync), jitter=0.012)
            for t0, h in zip(ts, hs):
                imp[N(t0) % L] += h / d
        kern = np.zeros(L)
        hv = filt(hoof2(rng), sos_lp(rng.uniform(*lp), 2))
        kern[:len(hv)] = hv
        y = np.fft.irfft(np.fft.rfft(imp) * np.fft.rfft(kern), L)
        if swell is not None:
            y *= swell(tvec(L), g)
        pan = -0.9 + 1.8 * (g + 0.5) / groups + rng.normal(0, 0.05)
        out += pan2(y, float(np.clip(pan, -1, 1)))
    return out


def circ(fn, x, *a, **k):
    """apply a (stateful) filter to a loop without a seam"""
    y = fn(np.concatenate([x, x], axis=0), *a, **k)
    return y[len(x):]


def virtual_bass(x, lo=35, hi=120, drive=4.0, out_lo=110, out_hi=600):
    """harmonics of the deep thumps, so phone and laptop speakers still hear the ground shake"""
    b = filt_circ(x, sos_bp(lo, hi, 2))
    b = np.tanh(drive * b / (np.max(np.abs(b)) + 1e-9))
    b = filt_circ(b, sos_hp(out_hi * 0 + out_lo, 2))
    return filt_circ(b, sos_lp(out_hi, 2))


CHARGE = dict(near=-21.0, mid=-22.0, herd=-24.0, vb=-22.0, sub=-38.0, roar=-23.0, herd_lp=(260, 460),
              groups=6, sync=0.035, eq=((70, -1.0, 0.8), (150, 2.0, 0.9), (300, 3.0, 1.0), (2500, 2.5, 0.8)))


def loop_totsugeki2(rng, C=None):
    """cavalry charge: the ground shaking under a mass of horses (do-do-do-do), riders close by, tack, the roar"""
    C = C or CHARGE
    L = N(LOOP)
    swell = lambda tt, g: 0.75 + 0.25 * np.sin(2 * np.pi * tt / LOOP + g * 0.8) + 0.08 * np.sin(4 * np.pi * tt / LOOP + g)
    near = riders_layer(rng, L, 6, (1.0, 1.7), pan_sd=0.55, tack=0.9)
    mid = riders_layer(rng, L, 24, (1.8, 5.0), pan_sd=0.5, tack=0.6)
    herd = herd_layer(rng, L, 330, groups=C['groups'], swell=swell, lp=C['herd_lp'], sync=C['sync'])
    hooves = mix_level(near, C['near']) + mix_level(mid, C['mid']) + mix_level(herd, C['herd'])
    vb = virtual_bass(hooves)
    env = filt_circ(np.abs(herd.mean(1)), sos_lp(6, 1))
    sub = filt_circ(rng.standard_normal(L), sos_lp(70, 2)) * (env / (np.max(env) + 1e-9))
    sub = stereo(sub / (np.std(sub) + 1e-9))
    roar = crowd_loop(LOOP, 56, rng, shout_clusters(rng, 5, dist=(1.8, 4.0)), f0_mu=200, f0_sd=0.15,
                      shout=(0.7, 1.8), gap=(0.15, 0.7), intensity=army_intensity(1.1, 0.2, 2), rough=0.3)
    x = hooves + mix_level(vb, C['vb']) + mix_level(sub, C['sub']) + mix_level(roar, C['roar'])
    for f0, g, q in C['eq']:
        x = circ(peak_eq, x, f0, g, q)
    x = reverb(x, outdoor_ir(33, 1.0), wet_db=-13, circular=True)
    return normalize(x, target_lufs=-19.5, ceiling_db=-1.5)


def yell(rng, f0=None):
    """one man's battle cry, close: big pitch rise, strain"""
    f0 = f0 or rng.uniform(170, 260)
    d = rng.uniform(0.35, 0.8)
    src = voice(f0, d, rng, rise=rng.uniform(0.05, 0.12), glide_from=0.7, sag=0.18, wobble=0.03, jitter=0.03,
                shimmer=0.3, breath=0.18, att=0.03, rel=0.12, roughness=rng.uniform(0.3, 0.7))
    y = tract(src, rng.choice(['a', 'o', 'e']), rng.uniform(0.94, 1.06))
    return y / (np.max(np.abs(y)) + 1e-9)


def knock(rng, modes, exc_ms=1.2, click=0.35, dur=0.18):
    """a hard object struck: a short noise excitation ringing a few damped resonances (no long ring)"""
    n = N(dur)
    t = tvec(n)
    en = max(8, N(exc_ms / 1000))
    exc = np.zeros(n)
    exc[:en] = rng.standard_normal(en) * np.hanning(en * 2)[en:]
    y = np.zeros(n)
    for f, tau, a in modes:
        f = min(f, SR * 0.45)
        q = max(0.7, math.pi * f * tau)                         # decay time tau -> resonance Q
        w0 = 2 * math.pi * f / SR
        al = math.sin(w0) / (2 * q)
        b = np.array([al, 0, -al]) / (1 + al)
        aa = np.array([1 + al, -2 * math.cos(w0), 1 - al]) / (1 + al)
        r = signal.lfilter(b, aa, exc)
        y += r / (np.max(np.abs(r)) + 1e-9) * a
    c = filt(exc, sos_hp(1500, 2))
    y += c / (np.max(np.abs(c)) + 1e-9) * click
    y *= np.exp(-t / 0.05)                                       # nothing rings on: hands damp the shafts
    return tail_fade(y / (np.max(np.abs(y)) + 1e-9), 0.4)


def shaft_clack(rng):
    """long spear shafts (oak and bamboo, lacquered) cracking together: a dry 'kak'"""
    f1 = rng.uniform(420, 700)
    return knock(rng, [(f1, rng.uniform(0.010, 0.018), 1.0), (f1 * rng.uniform(2.3, 2.9), rng.uniform(0.005, 0.010), 0.6),
                       (rng.uniform(2400, 3800), rng.uniform(0.003, 0.006), 0.45), (rng.uniform(110, 190), 0.03, 0.35)],
                 exc_ms=rng.uniform(0.8, 1.6), click=rng.uniform(0.25, 0.5))


def shaft_beat(rng):
    """a spear beaten down hard onto another shaft or a helmet: heavier 'gak'"""
    f1 = rng.uniform(240, 420)
    return knock(rng, [(f1, rng.uniform(0.014, 0.022), 1.0), (rng.uniform(800, 1300), rng.uniform(0.007, 0.012), 0.7),
                       (rng.uniform(2000, 3200), rng.uniform(0.004, 0.006), 0.45), (rng.uniform(90, 150), 0.035, 0.6)],
                 exc_ms=rng.uniform(2.0, 3.5), click=rng.uniform(0.4, 0.7), dur=0.22)


def shaft_scrape(rng):
    """shafts grinding along each other in a push: stick-slip friction"""
    d = rng.uniform(0.09, 0.24)
    n = N(d)
    t = tvec(n)
    rate = rng.uniform(70, 160) * (1 + 0.3 * np.sin(2 * np.pi * rng.uniform(4, 9) * t))
    ph = np.cumsum(rate / SR)
    pulses = np.zeros(n)
    idx = np.where(np.diff(np.floor(ph)) > 0)[0]
    pulses[idx] = rng.uniform(0.4, 1.0, len(idx))
    y = filt(pulses, sos_bp(700, 2600, 2)) + filt(rng.standard_normal(n), sos_bp(1200, 5000, 2)) * 0.15
    y *= np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.8
    return y / (np.max(np.abs(y)) + 1e-9)


def armour_hit(rng):
    """a shaft or a butt striking lamellar armour: a dull blow and the plates rattling ('gashan')"""
    y = thud(rng, f_hi=rng.uniform(150, 220), f_lo=rng.uniform(80, 110), dec=0.03, dur=0.2, click=0.5,
             body_lo=150, body_hi=1600)
    a = armour(rng, strength=rng.uniform(1.4, 2.0), span=rng.uniform(0.05, 0.09))
    m = min(len(y), N(0.004) + len(a))
    out = np.zeros(max(len(y), N(0.004) + len(a)))
    out[:len(y)] += y
    out[N(0.004):N(0.004) + len(a)] += a * rng.uniform(0.6, 0.9)
    return out / (np.max(np.abs(out)) + 1e-9)


def blade_tick(rng):
    """the small steel heads touching: a quick, damped 'chik' — no ring"""
    return knock(rng, [(rng.uniform(2800, 4200), rng.uniform(0.008, 0.016), 1.0), (rng.uniform(5200, 7200), 0.006, 0.5)],
                 exc_ms=0.5, click=0.5, dur=0.08)


def swing(rng):
    """a spear swung down: a short low whoosh"""
    d = rng.uniform(0.12, 0.2)
    n = N(d)
    src = rng.standard_normal(n)
    y = np.zeros(n)
    zi = None
    seg = 64
    for i in range(0, n, seg):
        fc = 1100 - 650 * (i / n)
        sos = sos_bp(fc * 0.7, fc * 1.4, 2)
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        y[i:i + seg], zi = signal.sosfilt(sos, src[i:i + seg], zi=zi)
    y *= np.sin(np.pi * np.clip(tvec(n) / d, 0, 1)) ** 2
    return y / (np.max(np.abs(y)) + 1e-9)


def exhale(rng):
    """a man's forced breath on the blow ('ha!', 'u!') — unvoiced, so it never sounds like a synth"""
    d = rng.uniform(0.08, 0.18)
    n = N(d + 0.05)
    t = tvec(n)
    src = rng.standard_normal(n) * np.minimum(1, t / 0.008) * np.exp(-np.maximum(0, t - d * 0.4) / (d * 0.5))
    y = tract(src, rng.choice(['a', 'u', 'o']), rng.uniform(0.94, 1.06))
    return y / (np.max(np.abs(y)) + 1e-9)


def sword_clash(rng, ring=1.0):
    """blades meeting — the 'ka-kin!' of a sword fight: a hard crack, then one bright high ring with shimmer.
    No partials below ~2 kHz are allowed to ring (those are what make a hit sound like a bell)."""
    dur = 0.65
    n = N(dur)
    t = tvec(n)
    y = np.zeros(n)
    tn = N(0.003)
    crack = rng.standard_normal(tn) * np.exp(-tvec(tn) / 0.0007)
    crack = filt(np.concatenate([crack, np.zeros(N(0.01))]), sos_hp(1200, 2))
    y[:len(crack)] += crack / np.max(np.abs(crack)) * 1.0
    fc = math.exp(rng.uniform(math.log(2700), math.log(4800)))          # the 'kin' that gives the pitch
    tau_main = rng.uniform(0.12, 0.24) * ring
    for f, tau, a in ((fc, tau_main, 1.0), (fc * rng.uniform(1.004, 1.012), tau_main * 0.9, 0.8),     # beating pair -> shimmer
                      (fc * rng.uniform(1.47, 1.62), tau_main * 0.55, 0.45), (fc * rng.uniform(2.05, 2.4), tau_main * 0.35, 0.3)):
        if f < SR * 0.45:
            y += a * np.sin(2 * math.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / tau)
    for _ in range(22):                                                  # dense high cluster: the metallic grain, gone quickly
        f = math.exp(rng.uniform(math.log(2400), math.log(10500)))
        tau = rng.uniform(0.012, 0.06) * (3000 / f) ** 0.5
        y += rng.uniform(0.08, 0.3) * np.sin(2 * math.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / tau)
    body = knock(rng, [(rng.uniform(1200, 1900), 0.012, 1.0), (rng.uniform(600, 900), 0.01, 0.5)], exc_ms=0.8, click=0.3, dur=0.08)
    y[:len(body)] += body * 0.45
    y *= np.minimum(1, t / 0.0003)
    return tail_fade(y / (np.max(np.abs(y)) + 1e-9), 0.35)


def sword_scrape(rng):
    """blade sliding along blade after the bind — 'shari...'"""
    d = rng.uniform(0.1, 0.22)
    n = N(d)
    t = tvec(n)
    rate = rng.uniform(220, 520) * (1 - 0.35 * t / d)
    ph = np.cumsum(rate / SR)
    pulses = np.zeros(n)
    idx = np.where(np.diff(np.floor(ph)) > 0)[0]
    pulses[idx] = rng.uniform(0.3, 1.0, len(idx))
    y = filt(pulses, sos_bp(3000, 8000, 2)) + filt(rng.standard_normal(n), sos_bp(3500, 9000, 2)) * 0.25
    fc = rng.uniform(3200, 4800)
    y += 0.25 * np.sin(2 * math.pi * fc * (1 - 0.06 * t / d) * t) * np.sin(np.pi * np.clip(t / d, 0, 1))
    y *= np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7
    return y / (np.max(np.abs(y)) + 1e-9)


def exchange(rng, swords=0.4):
    """one bout between two spearmen: e.g. swing-crack, crack-crack-scrape, a blow landing on armour"""
    if rng.random() < swords:
        pat = rng.choice(['kakin', 'bind', 'kakin_armour'], p=[0.55, 0.25, 0.2])
    else:
        pat = rng.choice(['beat', 'clacks', 'push', 'armour', 'tick'], p=[0.3, 0.3, 0.15, 0.18, 0.07])
    ev = []                                                       # (offset_s, signal, gain)
    if pat == 'kakin':                                            # 'ka-kin, ka-kin': two or three blows met
        t = 0.0
        for k in range(int(rng.integers(2, 4))):
            ev.append((t, sword_clash(rng, ring=rng.uniform(0.7, 1.1)), rng.uniform(0.75, 1.0)))
            t += rng.uniform(0.17, 0.32)
    elif pat == 'bind':                                           # blades meet and slide
        ev.append((0.0, sword_clash(rng), 1.0))
        ev.append((rng.uniform(0.02, 0.05), sword_scrape(rng), 0.35))
        ev.append((rng.uniform(0.08, 0.16), exhale(rng), 0.1))
    elif pat == 'kakin_armour':                                   # a parry, then the cut lands on armour
        ev.append((0.0, sword_clash(rng, ring=0.8), 0.9))
        ev.append((rng.uniform(0.22, 0.32), armour_hit(rng), 0.9))
        ev.append((rng.uniform(0.3, 0.4), exhale(rng), 0.12))
    elif pat == 'beat':
        ev.append((0.0, swing(rng), 0.14))
        ev.append((rng.uniform(0.11, 0.17), shaft_beat(rng), 1.0))
        if rng.random() < 0.4:
            ev.append((rng.uniform(0.14, 0.2), exhale(rng), 0.12))
    elif pat == 'clacks':
        t = 0.0
        for k in range(int(rng.integers(2, 5))):
            ev.append((t, shaft_clack(rng), rng.uniform(0.6, 1.0)))
            t += rng.uniform(0.09, 0.22)
    elif pat == 'push':
        ev.append((0.0, shaft_clack(rng), 0.8))
        ev.append((rng.uniform(0.03, 0.06), shaft_scrape(rng), 0.45))
        ev.append((rng.uniform(0.05, 0.12), exhale(rng), 0.11))
    elif pat == 'armour':
        ev.append((0.0, swing(rng), 0.13))
        ev.append((rng.uniform(0.1, 0.16), armour_hit(rng), 1.0))
        ev.append((rng.uniform(0.16, 0.24), exhale(rng), 0.14))
    else:
        ev.append((0.0, shaft_clack(rng), 0.8))
        ev.append((rng.uniform(0.0, 0.01), blade_tick(rng), 0.3))
    n = max(N(o) + len(sig) for o, sig, g in ev)
    y = np.zeros(n)
    for o, sig, g in ev:
        y[N(o):N(o) + len(sig)] += sig * g
    return y / (np.max(np.abs(y)) + 1e-9)


def loop_settekki(rng):
    """melee: spear shafts cracking and beating, swords meeting (ka-kin), plates rattling on blows, feet, breath, the roar"""
    L = N(LOOP)
    hits = np.zeros((L, 2))
    # a few pairs close by (clear), and the press of the fight further off (blurred)
    for near in (True, False):
        t = rng.uniform(0, 0.3)
        mean_gap = 0.42 if near else 0.16
        while t < LOOP:
            d = rng.uniform(1.0, 2.2) if near else rng.uniform(2.5, 7.0)
            pan = float(np.clip(rng.normal(0, 0.35 if near else 0.6), -0.95, 0.95))
            sos = sos_lp(max(1800, 16000 / (1 + (d - 1) / 3.0)), 2)
            e = exchange(rng, swords=0.45 if near else 0.3) * rng.uniform(0.7, 1.0)
            place(hits, N(t), pan2(filt(e, sos) / d, pan))
            t += rng.exponential(mean_gap) + 0.05
    scuffle = walkers_layer(rng, L, 16, rate=(2.0, 3.2), run=True, dist=(1.4, 6.0), armour_strength=0.9)
    roar = crowd_loop(LOOP, 80, rng, shout_clusters(rng, 5, dist=(2.2, 4.8)), f0_mu=195, f0_sd=0.16,
                      shout=(0.4, 1.3), gap=(0.15, 0.7), intensity=army_intensity(2.0, 0.25, 3), rough=0.35)
    x = mix_level(hits, -20.5) + mix_level(scuffle, -27) + mix_level(roar, -24)
    x = reverb(x, outdoor_ir(34, 0.9), wet_db=-13, circular=True)
    return normalize(x, target_lufs=-19, ceiling_db=-2)


# ============================================================ 3. sea
def sea_bed(rng, L):
    t = tvec(L)
    Ls = secs(L)
    lo = filt_circ(rng.standard_normal(L), sos_bp(60, 900, 2))
    lo = filt_circ(lo, sos_lp(700, 2))
    spray = filt_circ(rng.standard_normal(L), sos_bp(1500, 7000, 2))
    m1 = 0.65 + 0.35 * np.sin(2 * np.pi * 1 * t / Ls + 0.4) * np.sin(2 * np.pi * 3 * t / Ls + 1.1)
    m2 = np.clip(np.sin(2 * np.pi * 3 * t / Ls + 1.1), 0, 1) ** 3
    x = lo / np.std(lo) * m1 + spray / np.std(spray) * 0.12 * (0.3 + m2)
    return np.stack([x, np.roll(x, N(0.021))], 1)


def oar_stroke(rng, n_oars=16):
    """one stroke of a bank of oars: catch splashes, the pull's swish, drips, thole-pin creaks"""
    n = N(1.8)
    y = np.zeros(n)
    for _ in range(n_oars):
        s = N(abs(rng.normal(0.06, 0.045)))
        sp = splash(rng, dur=0.35, lo=rng.uniform(250, 450), hi=rng.uniform(2500, 4500), att=0.006,
                    dec=rng.uniform(0.05, 0.11)) * rng.uniform(0.4, 1.0)
        e = min(n, s + len(sp))
        y[s:e] += sp[:e - s]
    sw_n = N(0.7)
    tt = tvec(sw_n)
    sw = noise_burst(sw_n, rng, lo=300, hi=2600) * np.sin(np.pi * np.clip(tt / 0.7, 0, 1)) ** 1.5
    y[N(0.12):N(0.12) + sw_n] += sw / np.max(np.abs(sw)) * 0.35
    for _ in range(int(rng.integers(6, 12))):                 # drips as the blades come out
        s = N(rng.uniform(0.85, 1.4))
        dn = N(0.03)
        f = rng.uniform(900, 2200)
        d = np.sin(2 * np.pi * (f + 900 * tvec(dn) / 0.03) * tvec(dn)) * np.exp(-tvec(dn) / 0.008)
        y[s:s + dn] += d * rng.uniform(0.05, 0.15)
    for _ in range(int(rng.integers(2, 4))):
        c = creak(rng, dur=rng.uniform(0.18, 0.35), f_res=(rng.uniform(380, 520), rng.uniform(800, 1100)),
                  rate=(35, 90)) * rng.uniform(0.15, 0.3)
        s = N(rng.uniform(0.0, 0.25))
        y[s:s + len(c)] += c[:n - s]
    return y / (np.max(np.abs(y)) + 1e-9)


def loop_fune(rng):
    """a warship under oars: the sea, the stroke of the oars every two seconds, the hull creaking"""
    L = N(LOOP)
    bed = sea_bed(rng, L)
    oars = np.zeros((L, 2))
    for i in range(4):                                         # one stroke every 2 s (exact in the loop)
        for side, pan in ((0, -0.45), (1, 0.45)):
            st = oar_stroke(rng, 14)
            place(oars, N(i * 2.0 + 0.03 * side + rng.normal(0, 0.01)), pan2(filt(st, sos_lp(9000, 2)), pan))
    hull = np.zeros((L, 2))
    for _ in range(3):
        c = creak(rng, dur=rng.uniform(0.5, 0.9), f_res=(rng.uniform(180, 260), rng.uniform(420, 600)), rate=(18, 45))
        place(hull, N(rng.uniform(0, LOOP)), pan2(c * 0.6, rng.uniform(-0.3, 0.3)))
    swash = np.zeros((L, 2))
    for i in range(3):
        s = splash(rng, dur=0.9, lo=180, hi=2600, att=0.05, dec=0.25)
        place(swash, N(i * LOOP / 3 + 0.7), pan2(s, rng.uniform(-0.2, 0.2)))
    flags = flutter_bed(rng, L, flags=2)
    x = (mix_level(bed, -27) + mix_level(oars, -24.5) + mix_level(hull, -33) + mix_level(swash, -30)
         + mix_level(flags, -38))
    x = reverb(x, outdoor_ir(35, 0.6), wet_db=-18, circular=True)
    return normalize(x, target_lufs=-22, ceiling_db=-3)


def explosion(rng, dur=2.6, size=1.0):
    n = N(dur)
    t = tvec(n)
    boom = noise_burst(n, rng, hi=220) * np.exp(-t / (0.32 * size)) * np.minimum(1, t / 0.004)
    boom /= np.max(np.abs(boom))
    sub = np.sin(2 * np.pi * np.cumsum(38 + 40 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.22)
    crack = noise_burst(n, rng, lo=300, hi=4500) * np.exp(-t / 0.06) * np.minimum(1, t / 0.0008)
    crack /= np.max(np.abs(crack))
    y = boom * 1.0 + sub * 0.7 + crack * 0.8
    return tail_fade(y / np.max(np.abs(y)), 0.3)


def fire(rng, dur=2.0, density=60):
    n = N(dur)
    t = tvec(n)
    roar = noise_burst(n, rng, lo=60, hi=900) * (0.5 + 0.5 * lp_env(n, rng))
    y = roar / np.max(np.abs(roar)) * 0.35
    k = int(density * dur)
    for _ in range(k):
        s = N(rng.uniform(0, dur) ** 1.4 / dur ** 0.4)
        cn = N(rng.uniform(0.002, 0.01))
        c = rng.standard_normal(cn) * np.exp(-tvec(cn) / rng.uniform(0.0008, 0.003))
        c = filt(c, sos_hp(rng.uniform(1200, 3500), 2)) * rng.uniform(0.2, 1.0)
        e = min(n, s + cn)
        y[s:e] += c[:e - s]
    return tail_fade(y * np.exp(-t / (dur * 0.55)), 0.3)


def lp_env(n, rng):
    z = filt(rng.standard_normal(n), sos_lp(8, 2))
    return z / (np.max(np.abs(z)) + 1e-9)


def one_horoku(rng):
    """horoku-biya: the fuse fizzes, the clay bomb is flung, shatters on the deck and bursts into fire"""
    dur = 3.6
    out = np.zeros((N(dur), 2))
    fz = N(0.4)
    fuse = filt(rng.standard_normal(fz), sos_hp(3000, 2)) * (0.4 + 0.6 * (rng.random(fz) < 0.08))
    fuse *= np.minimum(1, tvec(fz) / 0.05)
    place(out, 0, pan2(fuse / np.max(np.abs(fuse)) * 0.18, -0.5), wrap=False)
    wn = N(0.55)
    tt = tvec(wn)
    wh = np.zeros(wn)
    seg = 64
    zi = None
    src = rng.standard_normal(wn)
    for i in range(0, wn, seg):                                # band sweeping down as it flies off
        fc = 2600 * (1 - 0.75 * (i / wn))
        sos = sos_bp(fc * 0.7, fc * 1.4, 2)
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        wh[i:i + seg], zi = signal.sosfilt(sos, src[i:i + seg], zi=zi)
    wh *= np.sin(np.pi * np.clip(tt / 0.55, 0, 1)) ** 2
    wh /= np.max(np.abs(wh))
    place(out, N(0.30), pan_traj(wh * 0.5, np.linspace(-0.5, 0.4, wn)), wrap=False)
    hit = N(0.86)
    shard = np.zeros(N(0.4))
    for _ in range(36):
        s = N(rng.uniform(0, 0.16) ** 1.5 / 0.16 ** 0.5)
        f = rng.uniform(2600, 7500)
        dn = N(rng.uniform(0.015, 0.05))
        sh = np.sin(2 * np.pi * f * tvec(dn) + rng.uniform(0, 6.28)) * np.exp(-tvec(dn) / (dn / SR / 3))
        e = min(len(shard), s + dn)
        shard[s:e] += sh[:e - s] * rng.uniform(0.2, 0.8)
    crk = noise_burst(N(0.012), rng, lo=2000, hi=9000) * np.exp(-tvec(N(0.012)) / 0.003)
    shard[:len(crk)] += crk / np.max(np.abs(crk)) * 1.2
    place(out, hit, pan2(shard / np.max(np.abs(shard)) * 0.55, 0.35), wrap=False)
    ex = explosion(rng, dur=2.4, size=1.0)
    place(out, hit + N(0.012), pan2(filt(ex, sos_lp(7000, 2)) * 1.0, 0.3), wrap=False)
    fi = fire(rng, dur=2.6, density=70)
    place(out, hit + N(0.08), pan2(fi * 0.5, 0.3), wrap=False)
    y = reverb(out, outdoor_ir(41, 1.1), wet_db=-9)
    return normalize(trim_tail(y), momentary=-14, ceiling_db=-1.5)


# ============================================================ 4. proposals
def horagai_tone(rng, f0, dur, jump=True):
    """conch: lip-buzzed pulse train through the shell's resonances, with the call's wavering and lift"""
    n = N(dur + 0.4)
    t = tvec(n)
    c = 0.72 + 0.28 * (1 - np.exp(-t / 0.08))
    c *= 1 + 0.012 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.3) / 0.4, 0, 1) + 0.03 * np.clip(t / dur, 0, 1)
    if jump:                                                    # the lift at the end of the call
        j = np.clip((t - (dur - 0.55)) / 0.07, 0, 1) * (1 - np.clip((t - (dur - 0.25)) / 0.08, 0, 1))
        c *= 1 + 0.5 * j
    c *= np.where(t > dur, 1 - 0.25 * np.clip((t - dur) / 0.3, 0, 1), 1)
    f = f0 * c
    ph = np.cumsum(f / SR) % 1.0
    pulse = np.exp(-((ph - 0.5) / 0.09) ** 2) - 0.32               # narrow buzz pulses: rich harmonics
    pulse += 0.25 * filt(rng.standard_normal(n), sos_bp(800, 5000, 2)) * (ph < 0.4)
    y = np.zeros(n)
    for F, B, g in ((480, 120, 1.0), (1150, 180, 0.7), (2250, 300, 0.45), (3400, 500, 0.2)):
        b, a = signal.butter(2, [F - B / 2, F + B / 2], 'bandpass', fs=SR)
        y += signal.lfilter(b, a, pulse) * g
    y += pulse * 0.08
    e = np.minimum(1, t / 0.12) * np.where(t > dur, np.cos(np.clip((t - dur) / 0.4, 0, 1) * np.pi / 2), 1)
    e *= 1 + 0.12 * np.sin(2 * np.pi * 0.9 * t)
    return y * e / (np.max(np.abs(y)) + 1e-9)


def gou_horagai(rng):
    """proposal: conch call for the start of battle / attack, answered from the other wing"""
    a = horagai_tone(rng, 228, 2.4)
    b = horagai_tone(rng, 214, 1.9) * 0.45
    out = np.zeros((N(5.0), 2))
    place(out, 0, pan2(a, -0.25), wrap=False)
    place(out, N(1.15), pan2(filt(b, sos_lp(3500, 2)), 0.6), wrap=False)
    y = reverb(out, make_ir(rt=1.8, length=3.2, seed=51, lp=6000), wet_db=-7)
    return normalize(trim_tail(y), momentary=-15, ceiling_db=-2)


def drum_hit(rng, f0=62, dec=0.55, gain=1.0):
    """o-daiko: membrane modes with a pitch dip and the skin's slap"""
    dur = dec * 3.2
    n = N(dur)
    t = tvec(n)
    bend = 1 + 0.18 * np.exp(-t / 0.03)
    y = np.zeros(n)
    for r, d, a in ((1.0, 1.0, 1.0), (1.59, 0.45, 0.45), (2.14, 0.3, 0.3), (2.3, 0.28, 0.25), (2.65, 0.2, 0.2), (2.92, 0.15, 0.12)):
        y += a * np.sin(2 * np.pi * np.cumsum(f0 * r * bend) / SR + rng.uniform(0, 6.28)) * np.exp(-t / (dec * d))
    slap = noise_burst(n, rng, lo=150, hi=2500) * np.exp(-t / 0.035)
    y += slap / np.max(np.abs(slap)) * 0.45
    y *= np.minimum(1, t / 0.002)
    y = tail_fade(y, 0.35)
    return y / np.max(np.abs(y)) * gain


def gou_taiko(rng):
    """proposal: war drum signalling the advance — two strokes, then a roll into the last stroke"""
    out = np.zeros((N(5.5), 2))
    seq = [(0.0, 1.0), (0.9, 0.95)] + [(1.8 + 0.14 * k, 0.32 + 0.05 * k) for k in range(8)] + [(3.0, 1.1)]
    for t0, g in seq:
        h = drum_hit(rng, f0=rng.uniform(58, 64), dec=0.55 if g > 0.8 else 0.3, gain=g)
        place(out, N(t0), pan2(h, rng.uniform(-0.1, 0.1)), wrap=False)
    y = reverb(out, make_ir(rt=1.6, length=2.8, seed=52, lp=7000), wet_db=-9)
    return normalize(trim_tail(y), momentary=-14, ceiling_db=-1.5)


def gunshot(rng):
    """one matchlock: the pan's flash, then the blast — a hard crack and a heavy black-powder boom"""
    dur = 1.0
    n = N(dur)
    t = tvec(n)
    crack = rng.standard_normal(n) * np.exp(-t / 0.004)
    crack = filt(crack, sos_hp(600, 2))
    body = noise_burst(n, rng, hi=1500) * np.exp(-t / 0.09)
    thump = np.sin(2 * np.pi * np.cumsum(55 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.12)
    y = crack / np.max(np.abs(crack)) * 1.0 + body / np.max(np.abs(body)) * 0.7 + thump * 0.6
    y *= np.minimum(1, t / 0.0004)
    y = tail_fade(y, 0.3)
    pan_n = N(0.05)                                             # the priming pan fizz just before
    fz = filt(rng.standard_normal(pan_n), sos_hp(4000, 2)) * 0.08
    return np.concatenate([fz, y / np.max(np.abs(y))])


def tep_seisha(rng):
    """proposal: a ragged volley from a line of teppō, rolling back off the hills"""
    out = np.zeros((N(5.0), 2))
    for i in range(20):
        t0 = abs(rng.normal(0.0, 0.12)) + (0.35 if rng.random() < 0.15 else 0.0)
        d = rng.uniform(1.2, 6.0)
        g = gunshot(rng)
        g = filt(g, sos_lp(max(2500, 16000 / (1 + (d - 1) / 3)), 2)) / d
        place(out, N(0.05 + t0), pan2(g, float(np.clip(rng.normal(0, 0.5), -0.95, 0.95))), wrap=False)
    echo = np.zeros_like(out)
    for dly, g, lp in ((0.42, 0.35, 3000), (0.95, 0.22, 2000), (1.6, 0.14, 1400)):
        e = filt(out, sos_lp(lp, 2)) * g
        place(echo, N(dly), e[:len(out) - N(dly)], wrap=False)
    y = out + echo[:, ::-1]
    y = reverb(y, outdoor_ir(53, 1.3), wet_db=-10)
    return normalize(trim_tail(y), momentary=-13, ceiling_db=-1.5)


def arrow_whoosh(rng, dur):
    n = N(dur)
    t = tvec(n)
    src = rng.standard_normal(n)
    y = np.zeros(n)
    seg = 128
    zi = None
    f_hi, f_lo = rng.uniform(2600, 3800), rng.uniform(900, 1400)
    for i in range(0, n, seg):
        x = i / n
        fc = f_hi * (1 - x) + f_lo * x
        sos = sos_bp(fc * 0.8, fc * 1.25, 2)
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        y[i:i + seg], zi = signal.sosfilt(sos, src[i:i + seg], zi=zi)
    y *= np.exp(-((t - dur * 0.55) / (dur * 0.22)) ** 2)
    return y / (np.max(np.abs(y)) + 1e-9)


def yumi_seisha(rng):
    """proposal: a volley of arrows — strings slap, the flight hisses overhead, shafts strike"""
    out = np.zeros((N(4.2), 2))
    for i in range(24):
        t0 = abs(rng.normal(0, 0.1))
        tw = N(0.25)
        tt = tvec(tw)
        f = rng.uniform(85, 130)
        twang = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.05) + 0.4 * np.sin(2 * np.pi * f * 2.02 * tt) * np.exp(-tt / 0.03)
        slap = noise_burst(tw, rng, lo=300, hi=3000) * np.exp(-tt / 0.008)
        s = twang / np.max(np.abs(twang)) * 0.6 + slap / np.max(np.abs(slap)) * 0.7
        d = rng.uniform(1.0, 3.5)
        pan = float(np.clip(rng.normal(-0.3, 0.35), -0.95, 0.95))
        place(out, N(t0), pan2(filt(s, sos_lp(9000, 2)) / d, pan), wrap=False)
        wd = rng.uniform(1.0, 1.5)
        w = arrow_whoosh(rng, wd) * 0.35
        place(out, N(t0 + 0.12), pan_traj(w, np.clip(np.linspace(pan, 0.9, len(w)), -0.95, 0.95)), wrap=False)
        hit_t = t0 + 0.12 + wd * rng.uniform(0.85, 1.05)
        kind = rng.choice(['wood', 'ground', 'armour'], p=[0.45, 0.35, 0.2])
        if kind == 'wood':
            h = wood_hit(rng, f1=rng.uniform(500, 1100)) * 0.5
        elif kind == 'ground':
            h = thud(rng, f_hi=180, f_lo=90, dec=0.03, dur=0.12, click=0.6, body_lo=200, body_hi=2500) * 0.35
        else:
            h = clicks(rng, 6, 0.03, f_lo=2000, f_hi=6000) * 0.4
        place(out, N(hit_t), pan2(filt(h, sos_lp(6000, 2)) / rng.uniform(2.0, 4.0), rng.uniform(0.3, 0.95)), wrap=False)
    y = reverb(out, outdoor_ir(54, 0.9), wet_db=-12)
    return normalize(trim_tail(y), momentary=-15, ceiling_db=-2)


def kachidoki(rng):
    """proposal: the victory cry — the general's 'Ei! Ei!' and the whole army's 'Ō!'"""
    lead = chant(rng, [dict(t=0.10, dur=0.42, vowels=[(0.0, 'e'), (0.22, 'e'), (0.42, 'i')], f0_mul=1.0, rise=0.08, att=0.03, rel=0.12, sag=0.12),
                       dict(t=0.85, dur=0.42, vowels=[(0.0, 'e'), (0.22, 'e'), (0.42, 'i')], f0_mul=1.04, rise=0.08, att=0.03, rel=0.12, sag=0.12)],
                 n_voices=5, total=1.6, f0_mu=150, f0_sd=0.06, clusters=1, spread=0.012, pan_w=0.1, dist=(1.0, 1.2))
    army = chant(rng, [dict(t=0.0, dur=1.25, vowels=[(0.0, 'o'), (0.85, 'o'), (1.25, 'u')], f0_mul=1.0, rise=0.14,
                            att=0.06, rel=0.35, sag=0.1, rough=0.25)],
                 n_voices=110, total=2.2, f0_mu=178, f0_sd=0.16, clusters=6, spread=0.05, pan_w=0.95, dist=(1.4, 3.6))
    out = np.zeros((N(4.6), 2))
    place(out, 0, lead * 0.55, wrap=False)
    place(out, N(1.62), army, wrap=False)
    y = reverb(out, outdoor_ir(55, 1.6), wet_db=-8)
    return normalize(trim_tail(y), momentary=-14, ceiling_db=-2)


ITEMS = {
    'sel_mikata': sel_mikata, 'sel_teki': sel_teki,
    'march': loop_kougun, 'engage': loop_sessen, 'charge': loop_totsugeki2, 'melee': loop_settekki,
    'ship': loop_fune, 'horoku': one_horoku,
    'horagai_gousei': gou_horagai, 'jindaiko': gou_taiko, 'teppo': tep_seisha, 'yumi': yumi_seisha, 'kachidoki_gousei': kachidoki,
}
LOOPS = {'march', 'engage', 'charge', 'melee', 'ship'}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    # the first synthetic conch and shout were replaced by sfx_sf2.py (recorded instruments and choir);
    # they stay here, in the same order (each sound's seed is its place in ITEMS), but are made only by name
    names = sys.argv[1:] or [k for k in ITEMS if not k.endswith('_gousei')]
    for k, name in enumerate(names):
        t0 = time.time()
        rng = np.random.default_rng(1000 + list(ITEMS).index(name))
        y = ITEMS[name](rng)
        write(os.path.join(OUT, name + '.wav'), y)
        report(name, y, loop=name in LOOPS)
        print('   ', round(time.time() - t0, 1), 's')
