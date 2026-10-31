# -*- coding: utf-8 -*-
"""Short musical cues for Sengoku-ban, played by the same orchestra as the BGM.

    python3 jingles.py               # all
    python3 jingles.py win_field     # one

Win / lose stings quote the battle themes:
  field  (疾風の陣, E minor)  — the horn call E-B-A-B-D-E, turned to E major
  castle (攻城の刻, C minor)  — the head G-C-D♭-C, resolving to C major
  decisive (天下決戦, D minor) — the theme D-D-D-A, in D major / the fate motif D-A-B♭-A
"""
import sys, os, subprocess, time
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
BGMDIR = os.path.join(HERE, '..', 'bgm')                  # the BGM tools: score -> MIDI -> FluidSynth
sys.path.insert(0, BGMDIR)
os.environ.setdefault('BGM_WORK', os.path.join(BGMDIR, 'work'))   # GeneralUser-GS.sf2 and MSG_marc.sf2 live here
import numpy as np
import lib as BL
import common as BC
import dsp as D

NT = BL.N                       # note name -> midi
OUT = os.path.join(HERE, 'work', 'out')
RDIR = os.path.join(HERE, 'work', 'render')
SR = 44100


# ------------------------------------------------------------------ rendering
def render(S, name, tail=5.0):
    rdir = os.path.join(RDIR, name)
    os.makedirs(rdir, exist_ok=True)

    def one(p):
        mid = os.path.join(rdir, p.name + '.mid')
        wav = os.path.join(rdir, p.name + '.wav')
        S.export_part(p, mid, cycles=1, tail_s=tail)
        subprocess.run(['fluidsynth', '-ni', '-q', '-r', str(SR), '-O', 'float', '-g', '0.5',
                        '-o', 'synth.reverb.active=0', '-o', 'synth.chorus.active=0', '-o', 'synth.polyphony=4096',
                        '-F', wav, p.sf2, mid], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with ThreadPoolExecutor(2) as ex:
        list(ex.map(one, [p for p in S.parts if p.notes]))
    return rdir


def mix(S, rdir, cfg, layers=(), ir=None, rev_db=-2.0, momentary=-13.0, eq=None, comp=True, length=None, fade_s=1.0):
    stems = []
    total = 0
    for p in S.parts:
        if not p.notes:
            continue
        x = BL.load(os.path.join(rdir, p.name + '.wav'))
        stems.append((p.name, x))
        total = max(total, len(x))
    for (beat, arr, c) in layers:
        total = max(total, int(beat * S.spb * SR) + len(arr))
    ir = ir if ir is not None else BL.make_ir(rt_low=2.4, rt_mid=2.0, rt_high=1.1, length=3.2, predelay=0.022, seed=61, lp=10500)
    dry = np.zeros((total + len(ir), 2))
    send = np.zeros_like(dry)
    for name, x in stems:
        c = cfg.get(name, {})
        y = BL.apply_eq(x, c)
        y = BL.pan_stereo(y, c.get('pan', 0.0), c.get('width', 1.0)) * 10 ** (c.get('gain', 0.0) / 20)
        dry[:len(y)] += y
        send[:len(y)] += y * 10 ** (c.get('rev', -12.0) / 20)
    for (beat, arr, c) in layers:
        st = int(beat * S.spb * SR)
        y = BL.apply_eq(arr, c)
        y = BL.pan_stereo(y, c.get('pan', 0.0), c.get('width', 1.0)) * 10 ** (c.get('gain', 0.0) / 20)
        dry[st:st + len(y)] += y
        send[st:st + len(y)] += y * 10 ** (c.get('rev', -12.0) / 20)
    wet = BL.convolve_stereo(send, ir) * 10 ** (rev_db / 20)
    m = dry + wet
    m = D.filt(m, D.sos_hp(30, 2))
    if eq:
        m = BL.apply_eq(m, eq)
    if comp:
        m = m / (np.max(np.abs(m)) + 1e-9) * 0.5
        m, _ = BL.compressor(m, thr_db=-16, ratio=2.0, att=0.01, rel=0.25)
    m = D.trim_tail(m, thresh_db=-60, pad=0.1)
    if length and len(m) > D.N(length):
        m = m[:D.N(length)]
        m = D.fade(m, 0.0, fade_s)
    else:
        m = D.fade(m, 0.0, 0.35)
    return D.normalize(m, momentary=momentary, ceiling_db=-1.0)


def kane(rng, f0=1180, dur=1.2, bright=1.0):
    """the small war gong (jingane) used for signals: a bright, clangy 'chan'"""
    rat = [1.0, 1.52, 2.41, 2.95, 3.62, 4.38, 5.6]
    dec = [0.9, 0.55, 0.4, 0.32, 0.22, 0.16, 0.1]
    amp = [1.0, 0.8, 0.6 * bright, 0.5 * bright, 0.35 * bright, 0.25 * bright, 0.15 * bright]
    y = D.modal([f0 * r for r in rat], [d * dur / 1.2 for d in dec], amp, dur, rng)
    hit = D.noise_burst(D.N(0.01), rng, lo=2000, hi=9000) * np.exp(-D.tvec(D.N(0.01)) / 0.002)
    y[:len(hit)] += hit / np.max(np.abs(hit)) * 0.8
    return D.stereo(y / np.max(np.abs(y)))


def kei(rng, f0=2350, dur=1.8):
    """a temple chime (rin/kei) — bright, pure, long"""
    rat = [1.0, 2.71, 5.15, 8.1]
    y = D.modal([f0 * r for r in rat], [1.2, 0.5, 0.25, 0.12], [1.0, 0.45, 0.25, 0.1], dur, rng)
    return D.stereo(y / np.max(np.abs(y)))


# common orchestra ------------------------------------------------------------
def orchestra(S, sizes='full'):
    P = {}
    P['tp'] = S.part('tpt', 0, 56, hum_ms=4)
    P['hn'] = S.part('hn', 0, 60, hum_ms=5)
    P['tb'] = S.part('tbn', 0, 57, hum_ms=5)
    P['tu'] = S.part('tuba', 0, 58, hum_ms=5)
    P['v1'] = S.part('vln1', 20, 48, hum_ms=5)
    P['v2'] = S.part('vln2', 25, 48, hum_ms=5)
    P['va'] = S.part('va', 30, 48, hum_ms=5)
    P['vc'] = S.part('vc', 40, 48, hum_ms=5)
    P['cb'] = S.part('cb', 50, 49, hum_ms=5)
    P['run'] = S.part('vrun', 20, 48, hum_ms=3, sf2=BL.SF_MARC)
    P['run'].nrpn = [(38, -3800), (34, -1800)]
    P['vt'] = S.part('vtrem', 20, 44, hum_ms=4)
    P['lt'] = S.part('ltrem', 40, 44, hum_ms=4)
    P['ch'] = S.part('choir', 0, 52, vel_jit=3)
    P['ti'] = S.part('timp', 0, 47, hum_ms=2, vel_jit=3)
    P['tk'] = S.part('taiko', 0, 116, hum_ms=2, vel_jit=4)
    P['cy'] = S.part('cym', 0, 58, kit=True, hum_ms=0, vel_jit=0)
    P['ko'] = S.part('koto', 0, 107, sf2=BL.SF_GU, hum_ms=3)
    P['sm'] = S.part('shami', 0, 106, hum_ms=3, vel_jit=4)
    P['sh'] = S.part('shaku', 0, 77, hum_ms=3, vel_jit=2)
    P['hp'] = S.part('harp', 0, 46, hum_ms=3)
    P['rc'] = S.part('rcym', 0, 119, hum_ms=0, vel_jit=0)
    return P


MIXCFG = {
    'tpt': dict(gain=2, pan=0.15, width=0.4, rev=-8, hp=150, peq=[(2500, 2.0, 1.0)]),
    'hn': dict(gain=4, pan=-0.12, width=0.5, rev=-7, hp=70),
    'tbn': dict(gain=-3, pan=0.3, width=0.5, rev=-9, hp=55),
    'tuba': dict(gain=-6, pan=0.35, width=0.4, rev=-11, lp=2500),
    'vln1': dict(gain=1, pan=-0.38, width=0.7, rev=-8, hp=160),
    'vln2': dict(gain=-1, pan=-0.2, width=0.7, rev=-8, hp=140),
    'va': dict(gain=-1, pan=0.12, width=0.6, rev=-9, hp=110),
    'vc': dict(gain=1, pan=0.3, width=0.6, rev=-10, hp=45),
    'cb': dict(gain=0, pan=0.4, width=0.6, rev=-11, lp=4500),
    'vrun': dict(gain=0, pan=-0.3, width=0.7, rev=-10, hp=200),
    'vtrem': dict(gain=-6, pan=-0.3, width=0.8, rev=-8, hp=250),
    'ltrem': dict(gain=-3, pan=0.3, width=0.6, rev=-10, hp=40),
    'choir': dict(gain=-3, pan=0.0, width=1.0, rev=-5, hp=120),
    'timp': dict(gain=-5, pan=0.1, width=0.5, rev=-11, hp=45),
    'taiko': dict(gain=-2, pan=0.0, width=0.7, rev=-11, hp=50, peq=[(1800, 2.0, 1.0)]),
    'cym': dict(gain=-7, pan=0.05, width=1.0, rev=-10, hp=300),
    'koto': dict(gain=-1, pan=-0.25, width=0.7, rev=-8, hp=120),
    'shami': dict(gain=-2, pan=-0.2, width=0.6, rev=-9, hp=150),
    'shaku': dict(gain=2, pan=0.1, width=0.4, rev=-6, hp=200),
    'harp': dict(gain=-3, pan=-0.45, width=0.7, rev=-7, hp=60),
    'rcym': dict(gain=-9, pan=0.0, width=1.0, rev=-11, hp=300),
}


def hit_chord(P, t, d, chords, v=118):
    """tutti stab: chords = dict(part_key -> list of note names)"""
    for k, ns in chords.items():
        P[k].chord(t, d, [NT(x) for x in ns], v)


# ============================================================ notices
def notice_good():
    S = BL.Song('n_good', bpm=150, bars=1)
    P = orchestra(S)
    b = S.b
    for i, nm in enumerate(['A4', 'D5', 'E5', 'A5']):
        P['ko'].note(b(1, 0.38 * i), 1.6, NT(nm), 96 + 6 * i)
    P['ko'].note(b(1, 1.14), 1.8, NT('D6'), 104)
    P['tk'].note(b(1, 0), 0.8, NT('A3'), 74)
    P['tk'].note(b(1, 0.5), 0.8, NT('A3'), 84)
    P['hp'].chord(b(1, 1.14), 2.0, [NT('D4'), NT('A4'), NT('D5'), NT('F#5')], 70)
    rng = np.random.default_rng(71)
    layers = [(1.14, kei(rng, 2349, 1.6), dict(gain=-17, rev=-6, hp=500, pan=0.2))]
    return S, layers, -16.0, 1.7, 0.6


def notice_bad():
    S = BL.Song('n_bad', bpm=120, bars=1)
    P = orchestra(S)
    b = S.b
    P['tk'].note(b(1, 0), 1.2, NT('D3'), 104)
    P['tk'].note(b(1, 0.5), 1.2, NT('D3'), 92)
    P['ti'].note(b(1, 0), 1.5, NT('E2'), 92)
    for nm, t, d, v in (('F5', 0.0, 0.5, 104), ('E5', 0.5, 0.5, 98), ('C5', 1.0, 1.6, 92)):
        P['sm'].note(b(1, t), d, NT(nm), v)
    P['lt'].chord(b(1, 0), 2.2, [NT('E2'), NT('F2'), NT('B2')], 74)
    P['lt'].expr([(b(1, 0), 60), (b(1, 1.0), 104), (b(1, 2.2), 50)])
    return S, [], -16.0, 1.9, 0.6


# ============================================================ field battle
def win_field():
    S = BL.Song('j_win_field', bpm=120, bars=2)
    P = orchestra(S)
    b = S.b
    mel = "E4:.5 B4:.75 A4:.25 B4:.5 D5:.5 E5:4"
    P['tp'].line(b(1), mel, v=112, leg=1.0)
    P['tp'].chord(b(1, 2.5), 4, [NT('B4'), NT('E5')], 116)
    P['hn'].line(b(1), mel, v=108, leg=1.0, tr=-12)
    P['hn'].chord(b(1, 1.25), 1.25, [NT('D4'), NT('F#4')], 100)
    P['hn'].chord(b(1, 2.5), 4, [NT('G#3'), NT('B3'), NT('E4'), NT('G#4')], 112)
    P['tb'].chord(b(1, 0), 1.2, [NT('E3'), NT('B3'), NT('G#3')], 104)
    P['tb'].chord(b(1, 1.25), 1.2, [NT('D3'), NT('A3'), NT('F#3')], 104)
    P['tb'].chord(b(1, 2.5), 4, [NT('E3'), NT('B3'), NT('G#3')], 112)
    for t, nm, d in ((0, 'E2', 1.2), (1.25, 'D2', 1.2), (2.5, 'E2', 4)):
        P['tu'].note(b(1, t), d, NT(nm), 108)
        P['cb'].note(b(1, t), d, NT(nm), 110)
        P['vc'].note(b(1, t), d, NT(nm) + 12, 108)
    P['v2'].chord(b(1, 0), 1.2, [NT('G#4'), NT('B4'), NT('E5')], 100)
    P['v2'].chord(b(1, 1.25), 1.2, [NT('F#4'), NT('A4'), NT('D5')], 100)
    for k, nm in enumerate(['E4', 'F#4', 'G#4', 'A4', 'B4', 'C#5', 'D#5', 'E5']):
        P['run'].note(b(1, 1.5 + 0.125 * k), 0.12, NT(nm), 96 + 3 * k)
    P['v1'].chord(b(1, 2.5), 4, [NT('G#5'), NT('B5'), NT('E6')], 112)
    P['va'].chord(b(1, 2.5), 4, [NT('E4'), NT('B4')], 104)
    P['ch'].chord(b(1, 2.5), 4, [NT('G#3'), NT('B3'), NT('E4'), NT('G#4')], 100)
    P['ch'].expr([(b(1, 2.5), 90), (b(1, 3.5), 118), (b(2, 1.0), 110)])
    BC.gliss(P['ko'], b(1, 2.0), 0.45, BC.scale_run({4, 6, 8, 11, 1}, NT('E4'), NT('E6')), v=88, ring=1.5)
    BC.roll(P['ti'], b(1, 1.5), 1.0, NT('B2'), 50, 110, spb=S.spb, rate_s=0.05)
    P['ti'].note(b(1, 0), 1.0, NT('E2'), 116)
    P['ti'].note(b(1, 2.5), 1.4, NT('E2'), 124)
    for t, v in ((0, 118), (0.75, 92), (1.25, 108), (2.5, 124)):
        P['tk'].note(b(1, t), 1.0, NT('D3'), v)
    for k in range(4):
        P['tk'].note(b(1, 2.0 + 0.125 * k), 0.2, NT('A3'), 80 + 8 * k)
    P['cy'].note(b(1, 0), 4, 72, 104)
    P['cy'].note(b(1, 2.5), 6, 72, 122)
    rng = np.random.default_rng(81)
    layers = [(2.5, BL.synth_gong(f0=82, dur=6.0, bright=1.1, seed=81), dict(gain=-15, rev=-8, hp=70)),
              (2.5, BL.synth_thump(f_hi=100, f_lo=48, decay=0.4, dur=1.4, seed=82), dict(gain=-17, rev=-14, hp=40))]
    return S, layers, -12.5, 4.7, 1.3


def lose_field():
    S = BL.Song('j_lose_field', bpm=84, bars=2)
    P = orchestra(S)
    b = S.b
    BC.wind_phrase(P['sh'], S, b(1), "B4:1.5 A4:.5 G4:1 F#4:1 | E4:2.5", v=94, scoop=0.6, vib=0.16, vib_rate=4.4,
                   exp_lo=84, exp_hi=118, fall=0.7, end_exp=40)
    for (t, d, ch) in ((0, 2, ['E3', 'B3', 'G4']), (2, 1, ['E3', 'C4', 'G4']), (3, 1, ['D#3', 'B3', 'F#4']), (4, 3, ['E3', 'B3', 'G4'])):
        P['v2'].chord(b(1, t), d + 0.1, [NT(x) + 12 for x in ch[1:]], 70)
        P['va'].note(b(1, t), d + 0.1, NT(ch[0]) + 12, 70)
    for (t, d, nm) in ((0, 2, 'E2'), (2, 1, 'C2'), (3, 1, 'B1'), (4, 3, 'E2')):
        P['cb'].note(b(1, t), d + 0.1, NT(nm), 84)
        P['vc'].note(b(1, t), d + 0.1, NT(nm) + 12, 80)
    for p_ in (P['v2'], P['va'], P['cb'], P['vc']):
        p_.expr([(b(1, 0), 70), (b(1, 1.5), 96), (b(2, 0), 84), (b(2, 2.8), 40)])
    P['hn'].chord(b(1, 4), 3, [NT('E3'), NT('B3')], 78)
    P['hn'].expr([(b(1, 4), 90), (b(2, 2.8), 40)])
    P['tk'].note(b(1, 0), 1.5, NT('D3'), 96)
    P['ti'].note(b(1, 0), 1.5, NT('E2'), 92)
    BC.roll(P['ti'], b(1, 3), 1.0, NT('B1') + 12, 40, 70, spb=S.spb, rate_s=0.06, shape='swell')
    rng = np.random.default_rng(83)
    layers = [(0, BL.synth_gong(f0=70, dur=7.0, bright=0.8, seed=83), dict(gain=-19, rev=-7, hp=60))]
    return S, layers, -14.5, 5.3, 1.3


# ============================================================ siege
def win_castle():
    S = BL.Song('j_win_castle', bpm=100, bars=3)
    P = orchestra(S)
    b = S.b
    mel = "G4:.5 C5:.75 Db5:.25 C5:.5 E5:.5 G5:1 Ab5:.5 Bb5:.5 C6:3"
    P['tp'].line(b(1), mel, v=114, leg=1.0)
    P['hn'].line(b(1), mel, v=110, leg=1.0, tr=-12)
    chords = [(0, 1.5, 'Cm', ['C3', 'G3', 'Eb4']), (1.5, 0.5, 'Db', ['Db3', 'Ab3', 'F4']), (2.0, 2.0, 'C', ['C3', 'G3', 'E4']),
              (4.0, 0.5, 'Ab', ['Ab2', 'Eb3', 'C4']), (4.5, 0.5, 'Bb', ['Bb2', 'F3', 'D4']), (5.0, 3.0, 'C', ['C3', 'G3', 'E4'])]
    for t, d, cn, ns in chords:
        P['tb'].chord(b(1, t), d * 0.98, [NT(x) for x in ns], 108 if t < 5 else 116)
        r = NT(ns[0]) - 12
        P['tu'].note(b(1, t), d * 0.98, r, 108)
        P['cb'].note(b(1, t), d * 0.98, r, 110)
        P['vc'].note(b(1, t), d * 0.98, r + 12, 108)
        P['v2'].chord(b(1, t), d * 0.98, [NT(x) + 12 for x in ns[1:]], 100)
    for k, nm in enumerate(['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6']):
        P['run'].note(b(1, 4.0 + 0.125 * k), 0.12, NT(nm), 96 + 3 * k)
    P['v1'].chord(b(1, 5), 3.0, [NT('E5'), NT('G5'), NT('C6')], 114)
    P['ch'].chord(b(1, 5), 3.0, [NT('G3'), NT('C4'), NT('E4'), NT('G4')], 104)
    P['ch'].expr([(b(1, 5), 90), (b(2, 2), 118), (b(2, 4), 110)])
    BC.gliss(P['ko'], b(1, 4.5), 0.45, BC.scale_run({0, 2, 4, 7, 9}, NT('C4'), NT('C6')), v=88, ring=1.5)
    P['ti'].note(b(1, 0), 1.0, NT('C2'), 116)
    P['ti'].note(b(1, 2), 1.0, NT('C2'), 112)
    BC.roll(P['ti'], b(1, 4.0), 1.0, NT('G2'), 60, 116, spb=S.spb, rate_s=0.05)
    P['ti'].note(b(1, 5), 1.6, NT('C2'), 124)
    for t, v in ((0, 118), (1.5, 104), (2, 116), (3.5, 100), (5, 124)):
        P['tk'].note(b(1, t), 1.0, NT('D3'), v)
    P['cy'].note(b(1, 2), 4, 74, 100)
    P['cy'].note(b(1, 5), 6, 72, 124)
    rng = np.random.default_rng(84)
    layers = [(5, BL.synth_gong(f0=84, dur=6.0, bright=1.1, seed=84), dict(gain=-14, rev=-8, hp=70)),
              (5.0, BL.synth_bell(f0=98.0, dur=9.0, seed=85), dict(gain=-15, rev=-6, hp=60)),   # the captured castle's bell
              (5, BL.synth_thump(f_hi=100, f_lo=48, decay=0.4, dur=1.4, seed=86), dict(gain=-16, rev=-14, hp=40))]
    return S, layers, -12.5, 5.8, 1.4


def lose_castle():
    S = BL.Song('j_lose_castle', bpm=84, bars=2)
    P = orchestra(S)
    b = S.b
    head = "G2:1 C3:1.5 Db3:.5 C3:2"
    P['tb'].line(b(1), head, v=104)
    P['hn'].line(b(1), head, v=96, tr=12)
    P['cb'].line(b(1), "C2:5", v=96)
    P['vc'].line(b(1), head, v=100, tr=12)
    P['tu'].line(b(1), "C2:5", v=92)
    for (t, d, ns) in ((0, 2.5, ['G3', 'C4', 'Eb4']), (2.5, 0.5, ['Ab3', 'Db4', 'F4']), (3.0, 3.0, ['G3', 'C4', 'Eb4'])):
        P['lt'].chord(b(1, t), d + 0.05, [NT(x) for x in ns], 84)
    P['lt'].expr([(b(1, 0), 70), (b(1, 2.5), 100), (b(2, 0), 80), (b(2, 2.0), 36)])
    for p_ in (P['tb'], P['hn'], P['vc'], P['cb'], P['tu']):
        p_.expr([(b(1, 0), 110), (b(1, 3.0), 104), (b(2, 1.5), 60), (b(2, 2.2), 40)])
    P['tk'].note(b(1, 0), 1.5, NT('D3'), 112)
    P['tk'].note(b(1, 0.5), 1.5, NT('D3'), 92)
    P['ti'].note(b(1, 0), 1.5, NT('C2'), 108)
    P['ti'].note(b(1, 3), 1.5, NT('C2'), 96)
    rng = np.random.default_rng(87)
    # the retreat signal: three strokes of the war gong
    layers = [(3.5 + 0.55 * k, kane(rng, f0=1180 * (1 + 0.004 * k), dur=1.3), dict(gain=-10 - 1.5 * k, rev=-8, hp=300, pan=0.3))
              for k in range(3)]
    layers.append((0, BL.synth_thump(f_hi=95, f_lo=45, decay=0.45, dur=1.5, seed=88), dict(gain=-17, rev=-14, hp=38)))
    return S, layers, -13.5, 5.2, 1.3


# ============================================================ decisive battle
def win_kessen():
    S = BL.Song('j_win_kessen', bpm=108, bars=3)
    P = orchestra(S)
    b = S.b
    mel = "D4:.75 D4:.125 D4:.125 A4:1 B4:.5 A4:.25 B4:.25 C#5:.5 E5:.5 D5:4"
    P['tp'].line(b(1), mel, v=116, leg=1.0)
    P['hn'].line(b(1), mel, v=112, leg=1.0, tr=-12)
    P['v1'].line(b(1), mel, v=106, leg=1.03, tr=12)
    chords = [(0, 2.0, ['D3', 'A3', 'F#4']), (2.0, 1.0, ['G2', 'D3', 'B3']), (3.0, 1.0, ['A2', 'E3', 'C#4']), (4.0, 4.0, ['D3', 'A3', 'F#4'])]
    for t, d, ns in chords:
        P['tb'].chord(b(1, t), d * 0.98, [NT(x) for x in ns], 110 if t < 4 else 118)
        r = NT(ns[0]) - 12 if NT(ns[0]) >= NT('C3') else NT(ns[0])
        P['tu'].note(b(1, t), d * 0.98, r, 110)
        P['cb'].note(b(1, t), d * 0.98, r, 112)
        P['vc'].note(b(1, t), d * 0.98, r + 12, 110)
        P['va'].chord(b(1, t), d * 0.98, [NT(x) + 12 for x in ns[1:]], 104)
        P['ch'].chord(b(1, t), d * 1.0, [NT(x) + 12 for x in ns], 100 if t < 4 else 112)
    P['ch'].expr([(b(1, 0), 96), (b(2, 0), 116), (b(2, 3.5), 112)])
    for k, nm in enumerate(['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6', 'D6']):
        P['run'].note(b(1, 3.0 + 0.125 * k), 0.12, NT(nm), 98 + 3 * k)
    P['v2'].chord(b(1, 4), 4.0, [NT('F#5'), NT('A5'), NT('D6')], 112)
    BC.gliss(P['ko'], b(1, 3.5), 0.45, BC.scale_run({2, 4, 6, 9, 11}, NT('D4'), NT('D6')), v=90, ring=1.6)
    P['ti'].note(b(1, 0), 1.0, NT('D2'), 118)
    P['ti'].note(b(1, 2), 0.6, NT('G2'), 108)
    BC.roll(P['ti'], b(1, 3.0), 1.0, NT('A2'), 70, 120, spb=S.spb, rate_s=0.05)
    P['ti'].note(b(1, 4), 2.0, NT('D2'), 127)
    for t, v in ((0, 120), (0.75, 96), (1.0, 104), (1.5, 110), (2, 116), (3, 112), (3.5, 104), (4, 127)):
        P['tk'].note(b(1, t), 1.0, NT('D3'), v)
    for k in range(4):
        P['tk'].note(b(1, 3.5 + 0.125 * k), 0.2, NT('A3'), 84 + 8 * k)
    P['cy'].note(b(1, 0), 5, 72, 112)
    P['cy'].note(b(1, 4), 7, 72, 127)
    rng = np.random.default_rng(89)
    layers = [(4, BL.synth_gong(f0=74, dur=8.0, bright=1.2, seed=89), dict(gain=-11, rev=-7, hp=60)),
              (4, BL.synth_thump(f_hi=100, f_lo=46, decay=0.45, dur=1.6, seed=90), dict(gain=-14, rev=-14, hp=38)),
              (0, BL.synth_thump(f_hi=100, f_lo=46, decay=0.4, dur=1.4, seed=91), dict(gain=-18, rev=-14, hp=38))]
    return S, layers, -12.0, 6.0, 1.5


def lose_kessen():
    S = BL.Song('j_lose_kessen', bpm=76, bars=2)
    P = orchestra(S)
    b = S.b
    fate = "D3:1.5 A2:.5 Bb2:1 A2:1 D2:2.5"
    P['tb'].line(b(1), fate, v=100, leg=1.02)
    P['hn'].line(b(1), fate, v=92, leg=1.02, tr=12)
    P['tu'].line(b(1), fate, v=96, leg=1.02, tr=-12)
    P['ch'].line(b(1), "[D3,D4]:1.5 [A2,A3]:.5 [Bb2,Bb3]:1 [A2,A3]:1 [D3,D4]:2.5", v=92)
    P['cb'].line(b(1), "D2:4 D2:2.5", v=90)
    for (t, d, ns) in ((0, 2, ['A3', 'D4', 'F4']), (2, 1, ['Bb3', 'Eb4', 'G4']), (3, 1, ['A3', 'C#4', 'E4']), (4, 2.5, ['A3', 'D4', 'F4'])):
        P['vt'].chord(b(1, t), d + 0.05, [NT(x) + 12 for x in ns], 80)
        P['lt'].chord(b(1, t), d + 0.05, [NT(ns[0]) - 12, NT(ns[1]) - 12], 82)
    for p_ in (P['tb'], P['hn'], P['tu'], P['ch'], P['cb'], P['vt'], P['lt']):
        p_.expr([(b(1, 0), 104), (b(1, 2.5), 112), (b(2, 0), 96), (b(2, 2.6), 36)])
    P['tk'].note(b(1, 0), 1.5, NT('D3'), 104)
    P['tk'].note(b(1, 0.5), 1.5, NT('D3'), 84)
    P['ti'].note(b(1, 0), 2.0, NT('D2'), 104)
    BC.roll(P['ti'], b(1, 3), 1.0, NT('A1') + 12, 50, 90, spb=S.spb, rate_s=0.06)
    P['ti'].note(b(1, 4), 2.0, NT('D2'), 100)
    rng = np.random.default_rng(92)
    layers = [(4, BL.synth_bell(f0=92.0, dur=10.0, seed=93), dict(gain=-11, rev=-5, hp=55)),
              (4, BL.synth_gong(f0=66, dur=7.0, bright=0.8, seed=94), dict(gain=-17, rev=-7, hp=55)),
              (0, BL.synth_thump(f_hi=90, f_lo=42, decay=0.5, dur=1.6, seed=95), dict(gain=-16, rev=-14, hp=36))]
    return S, layers, -13.5, 6.0, 1.6


ITEMS = {'notice_good': notice_good, 'notice_bad': notice_bad,
         'win_field': win_field, 'lose_field': lose_field, 'win_castle': win_castle, 'lose_castle': lose_castle,
         'win_kessen': win_kessen, 'lose_kessen': lose_kessen}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:] or list(ITEMS)
    for name in names:
        t0 = time.time()
        S, layers, target, length, fade_s = ITEMS[name]()
        rdir = render(S, name, tail=5.0)
        y = mix(S, rdir, MIXCFG, layers, momentary=target, length=length, fade_s=fade_s)
        D.write(os.path.join(OUT, name + '.wav'), y)
        D.report(name, y)
        print('   ', round(time.time() - t0, 1), 's')
