# -*- coding: utf-8 -*-
"""Small composition + rendering toolkit for the Sengoku-ban BGM.

Score is written in beats (quarter notes).  Each Part is exported to its own
MIDI file (two identical cycles + tail), rendered with FluidSynth, then mixed
in numpy (pan / EQ / convolution reverb / bus compression / limiter) and the
second cycle is cut out as a sample-accurate seamless loop.
"""
import os, math, itertools, hashlib, subprocess, json
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import mido
import soundfile as sf
from scipy import signal

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.environ.get('BGM_WORK', os.path.join(HERE, 'work'))           # renders / loop WAVs go here
SF_MSG = os.environ.get('BGM_SF_MSG', '/usr/share/sounds/sf2/MuseScore_General_Full.sf2')
SF_GU = os.environ.get('BGM_SF_GU', os.path.join(WORK, 'GeneralUser-GS.sf2'))
SF_MARC = os.environ.get('BGM_SF_MARC', os.path.join(WORK, 'MSG_marc.sf2'))   # made by sf2patch.py
TPB = 960

_NB = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def N(s):
    """'C4'->60, 'Bb3'->58, 'F#5'->78"""
    s = s.strip()
    l = s[0].upper()
    i = 1
    acc = 0
    while i < len(s) and s[i] in '#b':
        acc += 1 if s[i] == '#' else -1
        i += 1
    return 12 * (int(s[i:]) + 1) + _NB[l] + acc


def pc(s):
    l = s[0].upper()
    acc = s[1:].count('#') - s[1:].count('b')
    return (_NB[l] + acc) % 12


def seq(spec, transpose=0):
    """'A4:1 D5:1.5 r:1 [D4,A4]:2 | ...' -> [(pitches|None, dur)]"""
    out = []
    for tok in spec.replace('|', ' ').split():
        p, d = tok.rsplit(':', 1)
        d = float(d)
        if p in ('r', '-'):
            out.append((None, d))
        elif p.startswith('['):
            out.append(([N(x) + transpose for x in p[1:-1].split(',')], d))
        else:
            out.append(([N(p) + transpose], d))
    return out


QUAL = {
    '': [0, 4, 7], 'm': [0, 3, 7], '5': [0, 7], '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10],
    'maj7': [0, 4, 7, 11], 'sus4': [0, 5, 7], 'sus2': [0, 2, 7], 'add9': [0, 4, 7, 2],
    'madd9': [0, 3, 7, 2], 'm9': [0, 3, 7, 10, 2], 'dim': [0, 3, 6], '6': [0, 4, 7, 9],
    'm6': [0, 3, 7, 9], '7sus4': [0, 5, 7, 10], 'q': [0, 5, 10],  # quartal
}


def chord(name):
    """returns dict(root_pc, ivs, pcs, bass_pc, q)"""
    bass = None
    if '/' in name:
        name, b = name.split('/')
        bass = pc(b)
    r = name[0]
    k = 1
    while k < len(name) and name[k] in '#b':
        r += name[k]
        k += 1
    q = name[k:]
    root = pc(r)
    ivs = QUAL[q]
    pcs = [(root + i) % 12 for i in ivs]
    return dict(root=root, ivs=ivs, pcs=pcs, bass=root if bass is None else bass, q=q)


def voicing(name, n, lo, hi, prev=None, center=None):
    """choose n distinct pitches of chord within [lo,hi] with smooth voice leading"""
    c = chord(name)
    pcs = set(c['pcs'])
    cands = [p for p in range(lo, hi + 1) if p % 12 in pcs]
    # essential tones
    ess = []
    q = c['q']
    ivs = c['ivs']
    if q == '5':
        ess = [c['root'], (c['root'] + 7) % 12]
    else:
        ess = [c['root']]
        if 3 in ivs or 4 in ivs:
            ess.append((c['root'] + (3 if 3 in ivs else 4)) % 12)
        if 5 in ivs and q.startswith('sus4') or q == '7sus4':
            ess.append((c['root'] + 5) % 12)
        if 2 in ivs and q.startswith('sus2'):
            ess.append((c['root'] + 2) % 12)
        if 10 in ivs:
            ess.append((c['root'] + 10) % 12)
        if 11 in ivs:
            ess.append((c['root'] + 11) % 12)
    best = None
    if center is None:
        center = (lo + hi) / 2
    for combo in itertools.combinations(cands, n):
        have = set(x % 12 for x in combo)
        cost = 8.0 * len([e for e in ess if e not in have])
        if prev is not None and len(prev) == n:
            cost += sum(abs(a - b) for a, b in zip(combo, prev)) * 1.0
        else:
            cost += abs(np.mean(combo) - center) * 0.6
        for a, b in zip(combo, combo[1:]):
            if b - a < 3:
                cost += 5
            if b - a > 9:
                cost += 1.5 * (b - a - 9)
        # avoid low thirds (muddy) below E3
        for x in combo:
            if x < 52 and (x - c['root']) % 12 in (3, 4):
                cost += 6
        if best is None or cost < best[0]:
            best = (cost, combo)
    return list(best[1])


class Part:
    def __init__(self, song, name, bank, prog, kit=False, sf2=SF_MSG, pbr=2, hum_ms=12,
                 vel_jit=5, vol=100, legato=False):
        self.song, self.name, self.bank, self.prog = song, name, bank, prog
        self.kit, self.sf2, self.pbr = kit, sf2, pbr
        self.hum_ms, self.vel_jit, self.vol = hum_ms, vel_jit, vol
        self.notes = []   # (t, d, p, v, ch)
        self.ccs = []     # (t, num, val, ch)
        self.bends = []   # (t, val, ch)
        self.legato = legato
        self.nrpn = []    # [(sf2_generator, offset_in_native_units)] applied at t=0 on every channel

    # ---- notes
    def note(self, t, d, p, v=90, ch=0):
        if p is None:
            return
        v = int(max(1, min(127, v)))
        self.notes.append((float(t), float(d), int(p), v, ch))

    def chord(self, t, d, ps, v=80, ch=0, spread=0.0):
        for i, p in enumerate(ps):
            self.note(t + i * spread, d - i * spread, p, v, ch)

    def line(self, t, spec, v=90, leg=1.0, tr=0, vels=None, accent=0, ch=0):
        items = seq(spec, tr) if isinstance(spec, str) else spec
        for i, (ps, d) in enumerate(items):
            if ps:
                vv = v if vels is None else vels[i % len(vels)]
                for p in ps:
                    self.note(t, d * leg, p, vv, ch)
            t += d
        return t

    # ---- controllers
    def cc(self, t, num, val, ch=0):
        self.ccs.append((float(t), int(num), int(max(0, min(127, val))), ch))

    def expr(self, pts, step=0.125, ch=0, num=11):
        """piecewise-linear CC curve: pts=[(t,val),...]"""
        for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
            if t1 <= t0:
                continue
            n = max(1, int(round((t1 - t0) / step)))
            for k in range(n):
                tt = t0 + (t1 - t0) * k / n
                self.cc(tt, num, v0 + (v1 - v0) * k / n, ch)
        self.cc(pts[-1][0], num, pts[-1][1], ch)

    def bend(self, t, semi, ch=0):
        val = int(round(semi / self.pbr * 8192))
        self.bends.append((float(t), max(-8192, min(8191, val)), ch))

    def bend_glide(self, t0, t1, s0, s1, ch=0, steps=12):
        for k in range(steps + 1):
            x = k / steps
            x = x * x * (3 - 2 * x)
            self.bend(t0 + (t1 - t0) * k / steps, s0 + (s1 - s0) * x, ch)

    def vibrato(self, t0, t1, depth=0.12, rate=5.0, delay=0.35, ch=0, base=0.0):
        spb = self.song.spb
        dur_s = (t1 - t0) * spb
        if dur_s <= delay + 0.1:
            return
        n = int(dur_s / 0.012)
        for k in range(n + 1):
            ts = k * 0.012
            if ts < delay:
                continue
            ramp = min(1.0, (ts - delay) / 0.5)
            self.bend(t0 + ts / spb, base + depth * ramp * math.sin(2 * math.pi * rate * (ts - delay)), ch)
        self.bend(t1, base, ch)


class Song:
    def __init__(self, name, bpm, bars, bpb=4, seed=7):
        self.name, self.bpm, self.bars, self.bpb = name, bpm, bars, bpb
        self.L = bars * bpb
        self.spb = 60.0 / bpm
        self.tempo_us = int(round(60e6 / bpm))
        self.parts = []
        self.seed = seed
        self.layers = []   # synthesized audio layers: (name, start_beat, stereo array, cfg)

    def b(self, bar, beat=0.0):
        return (bar - 1) * self.bpb + beat

    def part(self, *a, **k):
        p = Part(self, *a, **k)
        self.parts.append(p)
        return p

    def get(self, name):
        for p in self.parts:
            if p.name == name:
                return p
        raise KeyError(name)

    # ---------------- MIDI export
    def _prep(self, part, cycles=2):
        rng = np.random.default_rng(int(hashlib.md5((self.name + part.name).encode()).hexdigest()[:8], 16))
        base = []
        for (t, d, p, v, ch) in sorted(part.notes):
            if part.hum_ms > 0:
                t = t + rng.uniform(0, part.hum_ms) / 1000.0 / self.spb
            if part.vel_jit > 0:
                v = int(max(1, min(127, v + rng.integers(-part.vel_jit, part.vel_jit + 1))))
            base.append([t, d, p, v, ch])
        notes = [[t + c * self.L, d, p, v, ch] for c in range(cycles) for (t, d, p, v, ch) in base]
        # resolve overlaps on same channel+pitch (across cycles too, so a late note-off
        # from cycle 1 never kills the restarted note of cycle 2)
        notes.sort(key=lambda x: (x[4], x[2], x[0]))
        for i in range(len(notes) - 1):
            a, b2 = notes[i], notes[i + 1]
            if a[4] == b2[4] and a[2] == b2[2] and a[0] + a[1] > b2[0] - 0.01:
                a[1] = max(0.02, b2[0] - a[0] - 0.01)
        return notes

    def export_part(self, part, path, cycles=2, tail_s=8.0):
        notes = self._prep(part, cycles)
        ev = []  # (tick, order, msg)
        ticks = lambda beat: int(round(beat * TPB))
        chans = sorted(set([n[4] for n in notes] + [c[3] for c in part.ccs] + [b[2] for b in part.bends] + [0]))
        if part.kit:
            chans = [0]
        for ch0 in chans:
            ch = 9 if part.kit else ch0
            ev.append((0, 0, mido.Message('control_change', channel=ch, control=0, value=0 if part.kit else part.bank)))
            ev.append((0, 0, mido.Message('control_change', channel=ch, control=32, value=0)))
            ev.append((0, 1, mido.Message('program_change', channel=ch, program=part.prog)))
            for num, val in ((7, part.vol), (11, 127), (10, 64), (91, 0), (93, 0), (64, 0),
                             (101, 0), (100, 0), (6, part.pbr), (38, 0), (101, 127), (100, 127)):
                ev.append((0, 2, mido.Message('control_change', channel=ch, control=num, value=val)))
            for gen, off in part.nrpn:
                scale = 2 if gen in (33, 34, 35, 36, 38, 25, 26, 27, 28, 30, 8) else 1
                v14 = int(max(0, min(16383, 8192 + round(off / scale))))
                for num, val in ((99, 120), (98, gen), (38, v14 & 127), (6, v14 >> 7)):
                    ev.append((0, 2, mido.Message('control_change', channel=ch, control=num, value=val)))
        L = self.L
        for (t, d, p, v, ch0) in notes:
            ch = 9 if part.kit else ch0
            ev.append((ticks(t) + 1, 5, mido.Message('note_on', channel=ch, note=p, velocity=v)))
            ev.append((ticks(t + d) + 1, 3, mido.Message('note_off', channel=ch, note=p, velocity=0)))
        for c in range(cycles):
            off = c * L
            for (t, num, val, ch0) in part.ccs:
                ch = 9 if part.kit else ch0
                ev.append((ticks(off + t) + 1, 4, mido.Message('control_change', channel=ch, control=num, value=val)))
            for (t, val, ch0) in part.bends:
                ch = 9 if part.kit else ch0
                ev.append((ticks(off + t) + 1, 4, mido.Message('pitchwheel', channel=ch, pitch=val)))
        end_tick = ticks(cycles * L + tail_s / self.spb)
        ev.append((end_tick, 9, mido.Message('control_change', channel=0, control=110, value=0)))
        ev.sort(key=lambda x: (x[0], x[1]))
        mid = mido.MidiFile(ticks_per_beat=TPB)
        tr = mido.MidiTrack()
        mid.tracks.append(tr)
        tr.append(mido.MetaMessage('set_tempo', tempo=self.tempo_us, time=0))
        last = 0
        for tk, _, msg in ev:
            msg.time = tk - last
            last = tk
            tr.append(msg)
        mid.save(path)

    def render(self, outdir, jobs=2, only=None):
        os.makedirs(outdir, exist_ok=True)

        def one(part):
            mpath = os.path.join(outdir, part.name + '.mid')
            wpath = os.path.join(outdir, part.name + '.wav')
            self.export_part(part, mpath)
            cmd = ['fluidsynth', '-ni', '-q', '-r', str(SR), '-O', 'float', '-g', '0.5',
                   '-o', 'synth.reverb.active=0', '-o', 'synth.chorus.active=0',
                   '-o', 'synth.polyphony=4096', '-F', wpath, part.sf2, mpath]
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return part.name
        todo = [p for p in self.parts if (only is None or p.name in only)]
        with ThreadPoolExecutor(jobs) as ex:
            list(ex.map(one, todo))


# ------------------------------------------------------------------ DSP
def sos_hp(f, order=2):
    return signal.butter(order, f, 'highpass', fs=SR, output='sos')


def sos_lp(f, order=2):
    return signal.butter(order, f, 'lowpass', fs=SR, output='sos')


def biquad_peak(f0, gain_db, q):
    A = 10 ** (gain_db / 40)
    w0 = 2 * math.pi * f0 / SR
    al = math.sin(w0) / (2 * q)
    b = [1 + al * A, -2 * math.cos(w0), 1 - al * A]
    a = [1 + al / A, -2 * math.cos(w0), 1 - al / A]
    return np.array(b) / a[0], np.array(a) / a[0]


def biquad_shelf(f0, gain_db, high=True, S=0.8):
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
    return np.array(b) / a[0], np.array(a) / a[0]


def apply_eq(x, cfg):
    y = x
    if cfg.get('hp'):
        y = signal.sosfilt(sos_hp(cfg['hp']), y, axis=0)
    if cfg.get('lp'):
        y = signal.sosfilt(sos_lp(cfg['lp']), y, axis=0)
    for (f0, g, q) in cfg.get('peq', []):
        b, a = biquad_peak(f0, g, q)
        y = signal.lfilter(b, a, y, axis=0)
    if cfg.get('hs'):
        f0, g = cfg['hs']
        b, a = biquad_shelf(f0, g, True)
        y = signal.lfilter(b, a, y, axis=0)
    if cfg.get('ls'):
        f0, g = cfg['ls']
        b, a = biquad_shelf(f0, g, False)
        y = signal.lfilter(b, a, y, axis=0)
    return y


def pan_stereo(x, pan=0.0, width=1.0):
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    m = (x[:, 0] + x[:, 1]) * 0.5
    s = (x[:, 0] - x[:, 1]) * 0.5 * width
    l, r = m + s, m - s
    th = (pan + 1) * math.pi / 4
    return np.stack([l * math.cos(th) * math.sqrt(2), r * math.sin(th) * math.sqrt(2)], 1)


def make_ir(rt_low=2.6, rt_mid=2.2, rt_high=1.2, length=3.6, predelay=0.022, seed=3,
            er_n=18, er_span=0.085, er_gain=0.55, lp=9000):
    rng = np.random.default_rng(seed)
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros((n + int(predelay * SR), 2))
    nfft = 1 << (n - 1).bit_length()
    freqs = np.fft.rfftfreq(nfft, 1 / SR)
    for ch in range(2):
        noise = rng.standard_normal(nfft)
        spec = np.fft.rfft(noise)
        tail = np.zeros(n)
        # 3 bands with smooth crossovers
        x1, x2 = 350.0, 3500.0
        w_lo = 1 / (1 + (freqs / x1) ** 4)
        w_hi = 1 / (1 + (x2 / np.maximum(freqs, 1e-3)) ** 4)
        w_mid = np.clip(1 - w_lo - w_hi, 0, 1)
        for w, rt in ((w_lo, rt_low), (w_mid, rt_mid), (w_hi, rt_high)):
            band = np.fft.irfft(spec * w, nfft)[:n]
            tail += band * np.exp(-6.91 * t / rt)
        build = 1 - np.exp(-t / 0.045)
        tail *= build
        er = np.zeros(n)
        for k in range(er_n):
            dly = rng.uniform(0.004, er_span)
            amp = er_gain * math.exp(-dly * 18) * rng.choice([-1, 1]) * rng.uniform(0.5, 1.0)
            er[int(dly * SR)] += amp
        er = signal.sosfilt(sos_lp(6000), er)
        ir = er * 0.9 + tail / (np.sqrt(np.sum(tail ** 2)) + 1e-9) * 6.0
        ir = signal.sosfilt(sos_lp(lp), ir)
        out[int(predelay * SR):, ch] = ir
    out /= np.sqrt(np.sum(out ** 2) / 2)
    return out


def convolve_stereo(x, ir, cross=0.25):
    yl = signal.oaconvolve(x[:, 0], ir[:, 0])[:len(x)] + cross * signal.oaconvolve(x[:, 1], ir[:, 0])[:len(x)]
    yr = signal.oaconvolve(x[:, 1], ir[:, 1])[:len(x)] + cross * signal.oaconvolve(x[:, 0], ir[:, 1])[:len(x)]
    return np.stack([yl, yr], 1)


def compressor(x, thr_db=-18, ratio=2.0, att=0.02, rel=0.25, makeup_db=0.0, knee=6.0):
    det = np.sqrt(np.mean(x ** 2, axis=1) + 1e-12)
    # rms envelope (one-pole, ~att)
    a = math.exp(-1 / (SR * 0.03))
    env = signal.lfilter([1 - a], [1, -a], det ** 2)
    lev = 10 * np.log10(np.maximum(env, 1e-12)) + 3.0
    over = lev - thr_db
    gr = np.where(over <= -knee / 2, 0.0,
                  np.where(over >= knee / 2, over * (1 - 1 / ratio),
                           (1 - 1 / ratio) * (over + knee / 2) ** 2 / (2 * knee)))
    # smooth gain reduction (attack/release approximated with two passes)
    ar = math.exp(-1 / (SR * rel))
    gr_s = signal.lfilter([1 - ar], [1, -ar], gr)
    gr_s = np.maximum(gr_s, signal.lfilter([1 - math.exp(-1 / (SR * att))], [1, -math.exp(-1 / (SR * att))], gr))
    g = 10 ** ((-gr_s + makeup_db) / 20)
    return x * g[:, None], gr_s


def limiter(x, ceiling_db=-1.0, look=0.004, rel=0.06):
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    c = 10 ** (ceiling_db / 20)
    # 4x oversampled peak estimate
    up = signal.resample_poly(x, 4, 1, axis=0)
    pk = np.max(np.abs(up), axis=1).reshape(-1, 4).max(axis=1)[:len(x)]
    if len(pk) < len(x):
        pk = np.pad(pk, (0, len(x) - len(pk)))
    g = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    w = max(3, int(look * SR))
    g = minimum_filter1d(g, size=2 * w + 1)
    g = uniform_filter1d(g, size=w)
    ar = math.exp(-1 / (SR * rel))
    # release smoothing: only lets gain rise slowly
    g2 = signal.lfilter([1 - ar], [1, -ar], g - 1.0) + 1.0
    g = np.minimum(g, g2)
    return x * g[:, None], g


def macro_level(mix, Ls, Lfull, strength=0.35, win=3.0, smooth=4.0, max_boost=6.0, max_cut=6.0):
    """periodic (loop-safe) slow leveller: shrinks section-to-section loudness differences"""
    import pyloudnorm as pyln
    m = pyln.Meter(SR)
    cyc = mix[Ls:Ls + Lfull]
    y = cyc.copy()
    for f in m._filters.values():
        y = f.apply_filter(y.T).T
    p = np.sum(y ** 2, axis=1)
    hop = int(0.25 * SR)
    nb = Lfull // hop
    pb = p[:nb * hop].reshape(nb, hop).mean(1)
    w = max(1, int(win / 0.25))
    k = np.ones(w) / w
    pw = np.real(np.fft.ifft(np.fft.fft(np.concatenate([pb])) * np.fft.fft(np.pad(k, (0, nb - w)))))
    pw = np.roll(pw, -w // 2)
    Lst = -0.691 + 10 * np.log10(np.maximum(pw, 1e-12))
    ref = np.median(Lst)
    g_db = np.clip(-strength * (Lst - ref), -max_cut, max_boost)
    ws = max(1, int(smooth / 0.25))
    ks = np.hanning(ws + 2)[1:-1]
    ks /= ks.sum()
    g_db = np.real(np.fft.ifft(np.fft.fft(g_db) * np.fft.fft(np.pad(ks, (0, nb - ws)))))
    g_db = np.roll(g_db, -ws // 2)
    # per-sample periodic gain
    tt = (np.arange(len(mix)) - Ls) % Lfull
    pos = tt / hop
    i0 = np.floor(pos).astype(int) % nb
    fr = pos - np.floor(pos)
    gs = g_db[i0] * (1 - fr) + g_db[(i0 + 1) % nb] * fr
    return mix * (10 ** (gs / 20))[:, None]


def lufs(x):
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    return meter.integrated_loudness(x)


def load(path):
    x, sr = sf.read(path, dtype='float64', always_2d=True)
    assert sr == SR
    if x.shape[1] == 1:
        x = np.repeat(x, 2, 1)
    return x


def mix_song(song, rdir, cfg, ir, rev_return_db=0.0, target_lufs=-16.5, master=None, out_wav=None,
             report=True):
    """cfg: {part_name: dict(gain, pan, width, rev, hp, lp, peq, hs, ls)}"""
    master = master or {}
    total = None
    stems = {}
    for p in song.parts:
        x = load(os.path.join(rdir, p.name + '.wav'))
        stems[p.name] = x
        total = len(x) if total is None else max(total, len(x))
    for (name, start_beat, arr, c) in song.layers:
        st = int(round(start_beat * song.spb * SR))
        total = max(total, st + len(arr))
    dry = np.zeros((total, 2))
    send = np.zeros((total, 2))
    peaks = {}
    for p in song.parts:
        c = cfg.get(p.name, {})
        x = stems[p.name]
        x = apply_eq(x, c)
        x = pan_stereo(x, c.get('pan', 0.0), c.get('width', 1.0))
        x *= 10 ** (c.get('gain', 0.0) / 20)
        dry[:len(x)] += x
        send[:len(x)] += x * 10 ** (c.get('rev', -12.0) / 20)
        peaks[p.name] = float(np.sqrt(np.mean(x ** 2)) + 1e-12)
    # synthesized layers (already stereo), placed per cycle by caller
    for (name, start_beat, arr, c) in song.layers:
        st = int(round(start_beat * song.spb * SR))
        y = apply_eq(arr, c)
        y = pan_stereo(y, c.get('pan', 0.0), c.get('width', 1.0)) * 10 ** (c.get('gain', 0.0) / 20)
        dry[st:st + len(y)] += y
        send[st:st + len(y)] += y * 10 ** (c.get('rev', -12.0) / 20)
    wet = convolve_stereo(send, ir) * 10 ** (rev_return_db / 20)
    mix = dry + wet
    mix = signal.sosfilt(sos_hp(28, 2), mix, axis=0)
    if master.get('eq'):
        mix = apply_eq(mix, master['eq'])
    # master only the region around cycle 2 (compressor/limiter settle in the 4 s pre-roll)
    Lfull = int(round(song.L * song.spb * SR))
    pre = 4 * SR
    mix = mix[Lfull - pre: 2 * Lfull + SR // 2].copy()
    Ls = pre
    if master.get('level'):
        mix = macro_level(mix, Ls, Lfull, **master['level'])
    seg = mix[Ls:Ls + Lfull]
    g0 = 10 ** ((target_lufs + 2.0 - lufs(seg)) / 20)
    mix *= g0
    mix, gr = compressor(mix, **master.get('comp', dict(thr_db=-20, ratio=1.8, att=0.03, rel=0.3)))
    seg = mix[Ls:Ls + Lfull]
    g1 = 10 ** ((target_lufs - lufs(seg)) / 20)
    mix *= g1
    mix, lg = limiter(mix, ceiling_db=master.get('ceiling', -1.0))
    loop = mix[Ls:Ls + Lfull].copy()
    info = dict(lufs=lufs(loop), peak_db=20 * np.log10(np.max(np.abs(loop))),
                max_gr_comp=float(gr[Ls:Ls + Lfull].max()),
                max_gr_lim_db=float(-20 * np.log10(lg[Ls:Ls + Lfull].min())),
                lim_active_pct=float(np.mean(lg[Ls:Ls + Lfull] < 0.999) * 100),
                seconds=len(loop) / SR,
                stem_rms_db={k: round(20 * np.log10(v * g0 * g1), 1) for k, v in peaks.items()})
    if out_wav:
        sf.write(out_wav, loop.astype(np.float32), SR, subtype='PCM_24')
    if report:
        print(json.dumps({k: (round(v, 2) if isinstance(v, float) else v) for k, v in info.items()},
                         ensure_ascii=False, indent=1))
    return loop, info, mix


# ------------------------------------------------------------- synth layers
def synth_thump(f_hi=95, f_lo=42, tau_f=0.035, decay=0.42, dur=1.6, click=0.25, seed=0):
    """sub 'body' for big taiko hits"""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f_lo + (f_hi - f_lo) * np.exp(-t / tau_f)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / decay)
    body += 0.35 * np.sin(2 * ph + 0.3) * np.exp(-t / (decay * 0.5))
    nz = rng.standard_normal(n) * np.exp(-t / 0.018)
    nz = signal.sosfilt(signal.butter(2, [180, 1800], 'bandpass', fs=SR, output='sos'), nz)
    y = body + click * nz / (np.max(np.abs(nz)) + 1e-9)
    y *= np.minimum(1, t / 0.0015)
    y /= np.max(np.abs(y))
    return np.stack([y, y], 1)


def synth_gong(f0=72.0, dur=9.0, bright=1.0, seed=1):
    """Japanese 'dora' / tam-tam like crash: inharmonic partials with bloom"""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    ys = []
    for ch in range(2):
        y = np.zeros(n)
        ratios = [1.0, 1.47, 1.98, 2.43, 2.97, 3.51, 4.1, 4.62, 5.3, 6.04, 6.9, 7.7, 8.6, 9.8, 11.3, 12.9, 14.6, 16.8]
        for k, r in enumerate(ratios):
            for dv in (-1, 1):
                f = f0 * r * (1 + dv * rng.uniform(0.0008, 0.004))
                if f > 9000:
                    continue
                amp = (1.0 / (1 + 0.35 * k)) * rng.uniform(0.6, 1.0)
                bloom = 0.04 + 0.06 * k * bright
                dec = max(0.9, dur * 0.55 / (1 + 0.18 * k))
                env = (1 - np.exp(-t / bloom)) * np.exp(-t / dec)
                y += amp * env * np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi))
        nz = rng.standard_normal(n)
        nz = signal.sosfilt(signal.butter(2, [600, 7000], 'bandpass', fs=SR, output='sos'), nz)
        shimmer = nz * (1 - np.exp(-t / 0.35)) * np.exp(-t / 2.2) * 0.25 * bright
        strike = signal.sosfilt(sos_lp(1500), rng.standard_normal(n)) * np.exp(-t / 0.03) * 0.6
        y = y / (np.max(np.abs(y)) + 1e-9) + shimmer + strike
        ys.append(y)
    y = np.stack(ys, 1)
    y *= np.minimum(1, t / 0.002)[:, None]
    return y / np.max(np.abs(y))


def place_layer(song, name, beat, arr, cfg, cycles=2):
    for c in range(cycles):
        song.layers.append((name, beat + c * song.L, arr, cfg))


def encode_mp3(wav, mp3, q=6, br=None):
    args = ['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame']
    args += (['-b:a', br] if br else ['-q:a', str(q)])
    args += ['-ar', str(SR), mp3]
    subprocess.run(args, check=True)
    return os.path.getsize(mp3)


def synth_bell(f0=104.0, dur=11.0, seed=3):
    """bonsho-like temple bell: inharmonic partials, slow beating hum, wooden-beam strike"""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    ys = []
    partials = [(0.5, 1.0, 9.0), (1.0, 0.9, 7.5), (1.19, 0.45, 5.0), (1.56, 0.5, 4.2), (2.0, 0.55, 3.6),
                (2.51, 0.3, 2.6), (2.98, 0.35, 2.2), (3.62, 0.22, 1.6), (4.28, 0.18, 1.2), (5.1, 0.12, 0.9),
                (6.2, 0.08, 0.6), (7.4, 0.05, 0.45)]
    for ch in range(2):
        y = np.zeros(n)
        for (r, a, dec) in partials:
            beat = rng.uniform(0.6, 2.2)
            df = beat / 2
            for s in (-1, 1):
                f = f0 * r + s * df
                y += a * 0.5 * np.exp(-t / dec) * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28))
        strike = signal.sosfilt(sos_lp(900), rng.standard_normal(n)) * np.exp(-t / 0.05) * 0.8
        y = y / (np.max(np.abs(y)) + 1e-9) + strike
        ys.append(y)
    y = np.stack(ys, 1)
    y *= np.minimum(1, t / 0.004)[:, None]
    return y / np.max(np.abs(y))
