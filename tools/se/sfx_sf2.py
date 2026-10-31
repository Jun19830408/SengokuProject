# -*- coding: utf-8 -*-
"""Effects that need real recorded timbres from the sound fonts (played through FluidSynth, then shaped here):

    horagai   — conch call: trombone and horn samples bent like a conch, roughened, with the shell's resonance and breath
    kachidoki — 'Ei! Ei! — Ō!': the call and the army's answer, sung-choir samples gated into shouts and shaded
                toward the vowels e→i and o→u

    python3 sfx_sf2.py [horagai] [kachidoki]
"""
import sys, os, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import jingles as J            # rendering helpers, sets up the BGM library paths
import lib as BL
import dsp as D
import numpy as np
from scipy import signal

NT = BL.N
SR = 44100


def bend_curve(part, pts, ch=0, step=0.01):
    """piecewise-linear pitch bend in semitones: pts=[(beat, semi), ...]"""
    for (t0, s0), (t1, s1) in zip(pts, pts[1:]):
        n = max(1, int((t1 - t0) / step))
        for k in range(n):
            x = k / n
            x = x * x * (3 - 2 * x)
            part.bend(t0 + (t1 - t0) * k / n, s0 + (s1 - s0) * x, ch)
    part.bend(pts[-1][0], pts[-1][1], ch)


def vib(part, t0, t1, base, depth, rate, ch=0, drift=0.0, rng=None):
    step = 0.012
    n = int((t1 - t0) / step)
    ph = rng.uniform(0, 6.28) if rng is not None else 0
    for k in range(n + 1):
        t = t0 + k * step
        x = k / max(1, n)
        part.bend(t, base + drift * x + depth * math.sin(2 * math.pi * rate * (t - t0) + ph) * min(1, (t - t0) / 0.25), ch)


def stems(S, name):
    rdir = J.render(S, name, tail=3.0)
    out = {}
    for p in S.parts:
        if p.notes:
            out[p.name] = BL.load(os.path.join(rdir, p.name + '.wav'))
    return out


def env_follow(x, ms=12):
    a = math.exp(-1 / (SR * ms / 1000))
    e = signal.lfilter([1 - a], [1, -a], np.abs(D.stereo(x)).mean(1))
    return e / (np.max(e) + 1e-9)


def gate(n, segs, att=0.012, rel=0.03):
    """segs: [(t_on, t_off), ...] seconds -> smooth 0/1 envelope"""
    g = np.zeros(n)
    t = D.tvec(n)
    for a, b in segs:
        up = np.clip((t - a) / att, 0, 1)
        dn = np.clip(1 - (t - b) / rel, 0, 1)
        g = np.maximum(g, np.minimum(up, dn))
    return np.sin(g * np.pi / 2) ** 2


def eq(x, bands):
    """bands: [(f, gain_db, q)] peaking; ('lp', f) / ('hp', f)"""
    y = x
    for b in bands:
        if b[0] == 'lp':
            y = D.filt(y, D.sos_lp(b[1], 2))
        elif b[0] == 'hp':
            y = D.filt(y, D.sos_hp(b[1], 2))
        else:
            y = D.peak_eq(y, b[0], b[1], b[2])
    return y


# ============================================================ conch
def conch_call(S, P, t0, note, rng, scale=1.0, answer=False):
    """one blown call: scoop up, a wavering hold, the lift to the fifth and back, the fall at the end of breath"""
    dur = 2.9 if not answer else 2.3
    for key in P:
        p = P[key]
        p.note(t0 - 0.02, dur + 0.4, NT(note), 112 if key != 'hn' else 100)
        b = [(t0 - 0.03, -4.0), (t0 + 0.28, 0.0)]
        bend_curve(p, b)
        vib(p, t0 + 0.28, t0 + 1.65, 0.0, 0.22, rng.uniform(4.2, 5.2), drift=0.3, rng=rng)
        if not answer:
            bend_curve(p, [(t0 + 1.65, 0.3), (t0 + 1.73, 7.0)])
            vib(p, t0 + 1.73, t0 + 2.15, 7.0, 0.15, 5.5, rng=rng)
            bend_curve(p, [(t0 + 2.15, 7.0), (t0 + 2.26, 0.2)])
            vib(p, t0 + 2.26, t0 + 2.55, 0.2, 0.18, 4.8, rng=rng)
            bend_curve(p, [(t0 + 2.55, 0.2), (t0 + 2.95, -5.0)])
        else:
            bend_curve(p, [(t0 + 1.65, 0.3), (t0 + 2.05, -4.5)])
        p.expr([(t0 - 0.02, 40), (t0 + 0.15, 112), (t0 + 0.6, 104), (t0 + 1.0, 116), (t0 + 1.6, 108),
                (t0 + 1.75, 124), (t0 + 2.2, 112), (t0 + dur - 0.45, 104), (t0 + dur, 30)])
    return dur


def horagai_stems():
    rng = np.random.default_rng(301)
    S = BL.Song('se_horagai', bpm=60, bars=2)
    mk = lambda name, bank, prog, sf2=BL.SF_MSG: S.part(name, bank, prog, sf2=sf2, pbr=12, hum_ms=0, vel_jit=0)
    A = {'tb': mk('a_tb', 0, 57), 'tb2': mk('a_tb2', 1, 57, BL.SF_GU), 'hn': mk('a_hn', 0, 60)}
    B = {'tb': mk('b_tb', 0, 57), 'tb2': mk('b_tb2', 1, 57, BL.SF_GU), 'hn': mk('b_hn', 0, 60)}
    conch_call(S, A, 0.25, 'A3', rng)
    conch_call(S, B, ANSWER_T, 'G3', rng, answer=True)
    return stems(S, 'se_horagai')


ANSWER_T = 2.45


def horagai(st=None, drive=1.3, growl=0.12, breath_amt=0.035, ans_db=-9.0):
    rng = np.random.default_rng(303)
    st = st or horagai_stems()
    n = max(len(x) for x in st.values())
    pad = lambda x: np.vstack([x, np.zeros((n - len(x), 2))])
    out = np.zeros((n, 2))
    for grp, pan, gain, far in (('a_', -0.2, 1.0, False), ('b_', 0.55, 10 ** (ans_db / 20), True)):
        x = pad(st[grp + 'tb']) * 1.0 + pad(st[grp + 'tb2']) * 0.8 + pad(st[grp + 'hn']) * 0.6
        m = x.mean(1)
        m = eq(m, [('hp', 90), (520, 6.0, 1.0), (1150, 2.5, 1.4), (2600, -3.0, 1.0), ('lp', 3600)])  # the shell's hollow, nasal body
        m = m / (np.max(np.abs(m)) + 1e-9)
        m = np.tanh(m * drive) / np.tanh(drive)                                                    # a little overblown edge
        z = D.filt(rng.standard_normal(n), D.sos_bp(22, 45, 2))
        m = m * np.clip(1 + growl * z / (np.std(z) + 1e-12), 0.4, 1.6)                              # the lips' rattle
        e = env_follow(m, 15)
        br = D.filt(rng.standard_normal(n), D.sos_bp(450, 2600, 2))
        m = m + br / np.std(br) * e * breath_amt                                                    # air through the lips
        if far:
            m = D.filt(m, D.sos_lp(2200, 2))
        out += D.pan2(m, pan) * gain
    ir = D.make_ir(rt=1.9, length=3.4, predelay=0.02, seed=302, er_n=10, er_span=0.12, er_gain=0.5, lp=6000)
    y = D.reverb(out, ir, wet_db=-7)
    y = D.trim_tail(y, thresh_db=-50, pad=0.15)
    y = D.fade(y, 0.0, 0.15)
    return D.normalize(y, momentary=-15, ceiling_db=-2)


# ============================================================ kachidoki
def shout_part(S, name, bank, prog, sf2, notes, t_on, dur, rng, spread=0.04, late_p=0.12, scoop=(-4.0, -1.5),
               peak=(0.8, 2.2), fall=(-6.0, -2.5), detune=0.5, att=0.015, rel=(0.15, 0.35), lvl=(95, 127)):
    """one choir layer. Every note is one voice on its own channel, so each has its own pitch, its own moment of
    starting (some a beat late), its own contour and its own end. The note sounds 0.2 s early but silent
    (expression 0): the sample's soft sung attack is skipped and the voice opens hard, like a shout."""
    p = S.part(name, bank, prog, sf2=sf2, pbr=12, hum_ms=0, vel_jit=0)
    for ch, nm in enumerate(notes):
        nm = nm if isinstance(nm, int) else NT(nm)
        d = rng.uniform(-detune, detune)
        on = t_on + abs(rng.normal(0, spread)) + (rng.uniform(0.05, 0.14) if rng.random() < late_p else 0.0)
        du = dur * rng.uniform(0.85, 1.1)
        off = on + du
        p.note(on - 0.2, du + 0.7, nm, 120, ch=ch)
        sc, pk, fl, tp = rng.uniform(*scoop), rng.uniform(*peak), rng.uniform(*fall), rng.uniform(0.08, 0.16)
        bend_curve(p, [(on - 0.21, sc + d), (on, sc + d), (on + tp, pk + d), (on + du * 0.55, 0.4 + d),
                       (on + du * 0.8, d), (off + 0.2, fl + d)], ch=ch)
        L = rng.uniform(*lvl)
        r = rng.uniform(*rel)
        p.expr([(on - 0.21, 0), (on, 0), (on + att, L), (on + du * 0.5, L * rng.uniform(0.85, 1.0)), (off, L * 0.8),
                (off + r, 0)], step=0.004, ch=ch)
    return p


def vowel_morph(x, segs, a_bands, b_bands, frac=0.45):
    """shade a sung 'aah' toward one vowel and then another inside each shout. segs: [(t_on, t_off)]"""
    xa = eq(x, a_bands)
    xb = eq(x, b_bands)
    n = len(x)
    t = D.tvec(n)
    w = np.zeros(n)
    for a, b in segs:
        s = a + (b - a) * (1 - frac)
        w = np.maximum(w, np.clip((t - s) / max(0.02, (b - s)), 0, 1) * (t >= a) * (t <= b + 0.4))
    w = w[:, None] if x.ndim == 2 else w
    return xa * (1 - w) + xb * w


SF_FR3 = os.environ.get('SE_SF_FR3', '/usr/share/sounds/sf2/FluidR3_GM.sf2')   # Debian: fluid-soundfont-gm


def pick_notes(rng, lo, hi, k):
    """k distinct pitches spread over [lo, hi] (midi), so the crowd is a cloud of pitches, not a chord"""
    pool = list(range(NT(lo), NT(hi) + 1))
    idx = np.sort(rng.choice(len(pool), size=k, replace=False))
    return [pool[i] for i in idx]


def kachidoki_stems(lead_lo='G3', lead_hi='A3', army_lo='C3', army_hi='A3'):
    rng = np.random.default_rng(311)
    S = BL.Song('se_kachidoki', bpm=60, bars=2)
    lead_kw = dict(spread=0.004, late_p=0.0, scoop=(-2.0, -1.0), peak=(1.6, 2.2), fall=(-3.5, -2.5), detune=0.15,
                   att=0.008, rel=(0.03, 0.04), lvl=(120, 127))
    for i, (t, d) in enumerate(CALLS):
        shout_part(S, f'lead{i}a', 0, 52, BL.SF_MSG, pick_notes(rng, lead_lo, lead_hi, 1), t, d, rng, **lead_kw)
        shout_part(S, f'lead{i}b', 1, 52, BL.SF_GU, pick_notes(rng, lead_lo, lead_hi, 1), t, d, rng, **lead_kw)
    t, d = ARMY
    for name, bank, prog, sf2, k in (('army1', 0, 52, BL.SF_MSG, 6), ('army2', 0, 52, BL.SF_GU, 5),
                                     ('army3', 0, 53, BL.SF_MSG, 4), ('army4', 0, 53, SF_FR3, 4),
                                     ('army5', 0, 52, SF_FR3, 4)):
        shout_part(S, name, bank, prog, sf2, pick_notes(rng, army_lo, army_hi, k), t, d, rng)
    return stems(S, 'se_kachidoki')


CALLS = [(0.25, 0.36), (1.0, 0.36)]          # the general's 'Ei!' 'Ei!'
ARMY = (1.78, 1.15)                          # the army's 'Ō!'

E_BANDS = [('hp', 140), (800, -9, 1.2), (1900, 9, 1.4), (2600, 4, 1.6)]
I_BANDS = [('hp', 160), (850, -14, 1.0), (2400, 10, 1.6), (3100, 6, 1.6)]
O_BANDS = [('hp', 110), (520, 4, 1.0), (1300, -9, 0.9), (2700, -4, 1.2)]
U_BANDS = [('hp', 110), (380, 3, 1.0), (1100, -14, 0.8), (2600, -8, 1.0)]


def windows(n, segs, pre=0.02, post=0.08):
    """loose safety windows around each shout (the voices shape themselves; this only cleans the gaps)"""
    return gate(n, [(a - pre, b + post) for a, b in segs], att=0.01, rel=0.05)[:, None]


def kd_finish(lead, arm, rng, n, extra=None):
    hn = D.N(0.12)                                            # the gasp before everyone shouts
    breath = np.zeros((n, 2))
    s0 = D.N(ARMY[0] - 0.13)
    b = D.filt(rng.standard_normal(hn), D.sos_bp(500, 3000, 2)) * np.sin(np.linspace(0, np.pi, hn))
    breath[s0:s0 + hn] += D.stereo(b / np.max(np.abs(b)))
    out = D.stereo(lead) * 0.85 + D.stereo(arm) * 1.0 + breath * 0.05
    if extra is not None:
        out += extra
    ir = D.make_ir(rt=1.1, length=2.2, predelay=0.02, seed=312, er_n=12, er_span=0.1, er_gain=0.5, lp=7000)
    y = D.reverb(out, ir, wet_db=-11)                         # out in the open: a short, thin space
    y = D.trim_tail(y, thresh_db=-60)
    return D.normalize(y, momentary=-14, ceiling_db=-2)


def kachidoki(st=None, lead_drive=2.0, army_drive=2.4, grit_amt=0.10, effort_db=3.0):
    """A: the choir recordings kept as they are, only shaded toward the vowels by EQ"""
    rng = np.random.default_rng(313)
    st = st or kachidoki_stems()
    n = max(len(x) for x in st.values())
    pad = lambda x: np.vstack([x, np.zeros((n - len(x), 2))])
    lead = sum(pad(v) for k, v in st.items() if k.startswith('lead'))
    segs = [(t, t + d) for t, d in CALLS]
    lead = lead * windows(n, segs, post=0.06)
    lead = vowel_morph(lead, segs, E_BANDS, I_BANDS, frac=0.4)
    lead = np.tanh(lead / (np.max(np.abs(lead)) + 1e-9) * lead_drive)
    arm = sum(pad(v) * (1.0 if k in ('army1', 'army2') else 0.8) for k, v in st.items() if k.startswith('army'))
    aseg = [(ARMY[0], ARMY[0] + ARMY[1])]
    arm = arm * windows(n, aseg, post=0.9)
    arm = vowel_morph(arm, aseg, O_BANDS, U_BANDS, frac=0.3)
    arm = np.tanh(arm / (np.max(np.abs(arm)) + 1e-9) * army_drive)
    arm = eq(arm, [(2300, effort_db, 1.2)])
    from crowd import chant                                   # a little synthetic crowd underneath for the 'o'
    grit = chant(rng, [dict(t=ARMY[0], dur=ARMY[1] * 0.9, vowels=[(0.0, 'o'), (ARMY[1] * 0.7, 'o'), (ARMY[1], 'u')],
                            rise=0.12, att=0.03, rel=0.3, sag=0.1, rough=0.4)],
                 n_voices=60, total=D.secs(n), f0_mu=175, f0_sd=0.17, clusters=4, spread=0.06, pan_w=0.9, dist=(1.6, 3.2))
    grit = grit[:n] / (np.max(np.abs(grit)) + 1e-9) * grit_amt
    return kd_finish(lead, arm, rng, n, extra=grit)


def lpc(frame, order):
    from scipy.linalg import solve_toeplitz
    r = np.correlate(frame, frame, 'full')[len(frame) - 1:len(frame) + order]
    if r[0] <= 1e-12:
        return np.r_[1.0, np.zeros(order)]
    r = r.copy()
    r[0] *= 1.0 + 1e-6
    lag = np.exp(-0.5 * (2 * np.pi * 40 / SR * np.arange(order + 1)) ** 2)      # lag window: tames pitch harmonics
    r *= lag
    c = solve_toeplitz(r[:order], -r[1:order + 1])
    return np.r_[1.0, c]


def whiten(x, order=26, frame=1024, hop=256):
    """LPC residual by overlap-add: the choir with its own 'aah' resonances taken out, keeping the many real
    voices' pulses, wobble and breath"""
    n = len(x)
    w = np.hanning(frame)
    y = np.zeros(n + frame)
    ws = np.zeros(n + frame)
    xp = np.r_[x, np.zeros(frame)]
    pre = signal.lfilter([1, -0.9], [1], xp)
    for i in range(0, n, hop):
        fr = pre[i:i + frame] * w
        a = lpc(fr, order)
        res = signal.lfilter(a, [1.0], fr)                          # flat: A(z) was fitted to the pre-emphasised frame
        y[i:i + frame] += res * w
        ws[i:i + frame] += w * w
    return y[:n] / np.maximum(ws[:n], 1e-3)


def cross_vowel(x, points, k=1.0, bright_db=2.0, lp=5000):
    """natural multi-voice source (whitened choir) through a time-varying shouted-vowel tract"""
    import crowd as C
    src = whiten(x)
    src = signal.lfilter([1.0], [1.0, -0.965], src) / 4.0       # the source slope tv_tract expects
    y = C.tv_tract(src, C.vowel_tracks(points, len(src), 64, k), 64, bright_db)
    return D.filt(y, D.sos_lp(lp, 2))                             # a voice has little above the top formants


def kachidoki_b(st=None, lead_drive=2.0, army_drive=2.4):
    """B: the same choir recordings, but their own 'aah' resonances replaced by shouted vowels: e→i, o→(u)"""
    rng = np.random.default_rng(317)
    st = st or kachidoki_stems()
    n = max(len(x) for x in st.values())
    pad = lambda x: np.vstack([x, np.zeros((n - len(x), 2))])
    segs = [(t, t + d) for t, d in CALLS]
    lpts = []
    for t, d in CALLS:
        lpts += [(t, 'e'), (t + d * 0.55, 'e'), (t + d, 'i')]
    lead = np.zeros((n, 2))
    for k_, (name, x) in enumerate(sorted((k, v) for k, v in st.items() if k.startswith('lead'))):
        m = cross_vowel(pad(x).mean(1), lpts, 1.0 + 0.03 * (k_ % 2))
        lead += D.pan2(m, rng.uniform(-0.15, 0.15))
    lead = lead * windows(n, segs, post=0.06)
    lead = np.tanh(lead / (np.max(np.abs(lead)) + 1e-9) * lead_drive)
    t, d = ARMY
    apts = [(t, 'o'), (t + d * 0.7, 'o'), (t + d, 'u')]
    arm = np.zeros((n, 2))
    for name, x in sorted((k, v) for k, v in st.items() if k.startswith('army')):
        m = cross_vowel(pad(x).mean(1), apts, rng.uniform(0.94, 1.07))
        arm += D.pan2(m, rng.uniform(-0.8, 0.8))
    arm = arm * windows(n, [(t, t + d)], post=0.9)
    arm = np.tanh(arm / (np.max(np.abs(arm)) + 1e-9) * army_drive)
    return kd_finish(lead, arm, rng, n)


ITEMS = {'horagai': horagai, 'kachidoki': kachidoki_b, 'kachidoki_a': kachidoki}   # plan B adopted 2026-11-01
if __name__ == '__main__':
    for name in (sys.argv[1:] or ['horagai', 'kachidoki']):          # kachidoki_a (plan A) only by name
        y = ITEMS[name]()
        D.write(os.path.join(HERE, 'work', 'out', name + '.wav'), y)
        D.report(name, y)
