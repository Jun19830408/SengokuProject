# -*- coding: utf-8 -*-
"""野戦 BGM 「疾風の陣」  150 BPM, 4/4, 56 bars (=89.6 s), E minor / minyo pentatonic."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

S = Song('yasen', bpm=150, bars=56)
b = S.b
spb = S.spb

chart = {1: 'Em', 2: 'Em', 3: 'Em', 4: 'D',
         5: 'Em', 6: 'Em', 7: 'C', 8: 'D'}
THEME_CH = ['Em', 'C', 'D', 'Bm', 'Em', 'C', 'D', 'Em']
for i, c in enumerate(THEME_CH):
    chart[9 + i] = c
    chart[17 + i] = c
    chart[45 + i] = c
for i, c in enumerate(['Am', 'Em', 'C', 'D', 'Am', 'Em', 'F', 'B']):
    chart[25 + i] = c
for i, c in enumerate(['Em', 'C', 'D', 'B']):
    chart[33 + i] = c
for i, c in enumerate(['Am', 'Bm', 'C', 'D', 'Em', 'C', 'D', 'B7']):
    chart[37 + i] = c
for i, c in enumerate(['Em', 'C', 'D', 'Em']):
    chart[53 + i] = c

MEL = ("E4:.75 E4:.25 B4:1.5 A4:.5 B4:1 | E5:1.5 D5:.5 B4:1 G4:1 | A4:.75 A4:.25 D5:1.5 B4:.5 A4:1 | B4:3 r:1 |"
       "E4:.75 E4:.25 B4:1.5 A4:.5 D5:1 | E5:2 D5:1 B4:1 | A4:1.5 B4:.5 D5:1 B4:.5 A4:.5 | B4:1 G4:1 E4:2")
HORN_CALL = "E4:1 B4:1.5 A4:.5 | B4:.75 D5:.25 E5:3"
HORN_CTR = ("G4:2 A4:1 B4:1 | G4:2 E4:2 | F#4:2 A4:2 | B4:2 A4:1 F#4:1 | G4:2 B4:2 | C5:2 B4:1 G4:1 |"
            "A4:2 F#4:1 D4:1 | E4:4")
FL_B = ("A5:.5 B5:.5 E6:2 D6:.5 B5:.5 | D6:1.5 B5:.5 A5:1 G5:1 | E5:1 G5:1 A5:1.5 B5:.5 |"
        "A5:1 B5:.125 A5:.125 B5:.125 A5:.125 B5:.125 A5:.125 B5:.125 A5:.125 A5:1 r:1 |"
        "E6:1 D6:.5 E6:.5 G6:1 E6:1 | D6:1.5 B5:.5 D6:1 E6:1 | C6:1 B5:.5 A5:.5 F5:2 | B5:2 A5:1 F#5:1")

ROOT_LO = {'E': 'E1', 'C': 'C2', 'D': 'D2', 'B': 'B1', 'A': 'A1', 'F': 'F1', 'G': 'G1'}

# ---------------------------------------------------------------- parts
cb = S.part('cb', 50, 48, hum_ms=6, sf2=SF_MARC)          # Basses Fast (marcato attack layer)
vc = S.part('vc', 40, 48, hum_ms=6, sf2=SF_MARC)          # Celli Fast (ostinato)
va = S.part('va', 30, 48, hum_ms=6, sf2=SF_MARC)          # Violas Fast (pulses)
v2 = S.part('vln2', 25, 48, hum_ms=6, sf2=SF_MARC)
v1 = S.part('vln1', 20, 48, hum_ms=6)
v1a = S.part('vln1arp', 20, 48, hum_ms=6, sf2=SF_MARC)
for p_ in (cb, vc, va, v2, v1a):
    p_.nrpn = [(38, -2600), (34, -1200)]   # short release / quicker attack -> spiccato-like
trm = S.part('trem', 40, 44, hum_ms=4)        # Celli tremolo (intro)
trb = S.part('tremb', 50, 44, hum_ms=4)       # Basses tremolo
pz = S.part('pizz', 0, 45, hum_ms=6)
hn = S.part('hn', 0, 60, hum_ms=6)
tp = S.part('tpt', 0, 56, hum_ms=5)
tb = S.part('tbn', 0, 57, hum_ms=5)
tu = S.part('tuba', 0, 58, hum_ms=5)
fl = S.part('fl', 0, 73, hum_ms=3, vel_jit=3)
ko = S.part('koto', 0, 107, sf2=SF_GU, hum_ms=5)
ch = S.part('choir', 0, 52, vel_jit=3)
ti = S.part('timp', 0, 47, hum_ms=2, vel_jit=3)
tk = S.part('taiko', 0, 116, hum_ms=2, vel_jit=5)
kit = S.part('tkit', 0, 48, kit=True, hum_ms=2, vel_jit=4)
cy = S.part('cym', 0, 58, kit=True, hum_ms=0, vel_jit=0)
rc = S.part('rcym', 0, 119, hum_ms=0, vel_jit=0)


def root_of(cn):
    return chord(cn)['root']


def lo_root(cn, lo='E1'):
    r = root_of(cn)
    base = N(lo)
    return base + ((r - base) % 12)


ACC = [112, 78, 88, 106, 78, 88, 104, 86]


def ostinato(bars, vmul=1.0, cello=True, bass=True, viola=True, vln2=False):
    for t, d, cn in chord_iter(S, chart, bars):
        rb = lo_root(cn, 'E1')       # basses
        rc_ = lo_root(cn, 'C2')      # celli
        if rc_ < N('D2'):
            rc_ += 12
        rm = lo_root(cn, 'A2')       # violas: fifth + octave pulses
        for k in range(8):
            tt = t + 0.5 * k
            if tt >= t + d - 1e-6:
                break
            vv = int(ACC[k] * vmul)
            if cello:
                vc.note(tt, 0.38, rc_ + (12 if k in (2, 5, 7) else 0), vv)
            if viola:
                va.note(tt, 0.36, rm + (7 if k % 2 == 0 else 12), int(vv * 0.86))
            if vln2:
                v2.note(tt, 0.36, rm + (19 if k % 2 == 0 else 24), int(vv * 0.8))
        if bass:
            for k, dd in ((0, 1.35), (3, 1.35), (6, 0.85)):
                cb.note(t + 0.5 * k, dd, rb, int(ACC[k] * vmul))


def stabs(bars, v=100, pattern=(0, 3), dur=0.42):
    for t, d, cn in chord_iter(S, chart, bars):
        vs = voicing(cn, 3, N('E2'), N('B3'))
        for k in pattern:
            tb.chord(t + 0.5 * k, dur, vs, v)
            tu.note(t + 0.5 * k, dur, lo_root(cn, 'E1') + 12 if lo_root(cn, 'E1') < N('C2') else lo_root(cn, 'E1'), v - 6)


# ---------------------------------------------------------------- strings
# intro: low tremolo swell
for bar in (1, 2, 3):
    trm.note(b(bar), 4.05, N('E2'), 84)
    trb.note(b(bar), 4.05, N('E1'), 80)
trm.note(b(4), 4.05, N('D2'), 88)
trb.note(b(4), 4.05, N('D2'), 84)
for p_ in (trm, trb):
    p_.expr([(b(1), 52), (b(3), 84), (b(4, 3.8), 116)])

ostinato(range(5, 9), 1.0)
ostinato(range(9, 17), 0.95)
ostinato(range(17, 25), 1.0, vln2=False)
ostinato(range(33, 37), 0.95)
ostinato(range(37, 45), 0.92)
ostinato(range(45, 53), 1.0, vln2=True)
ostinato(range(53, 55), 1.0)
ostinato(range(55, 57), 0.85, viola=False)
for p_ in (vc, va, cb):
    p_.expr([(b(5), 104), (b(9), 100), (b(17), 108), (b(24, 3.9), 108),
             (b(25), 96), (b(33), 104), (b(37), 86), (b(44, 3.9), 120), (b(45), 122), (b(52, 3.9), 122),
             (b(53), 116), (b(55), 102), (b(56, 3.9), 92)])
v2.expr([(b(45), 110), (b(52, 3.9), 116)])
# B section: sustained low strings under pizzicato
for t, d, cn in chord_iter(S, chart, range(25, 33)):
    cb.note(t, d + 0.1, lo_root(cn, 'E1'), 88)
    vc.note(t, d + 0.1, lo_root(cn, 'C2') + (12 if lo_root(cn, 'C2') < N('D2') else 0) + 12, 76)
    vs = voicing(cn, 3, N('E3'), N('E4'))
    for k in range(8):
        if k in (1, 3, 5, 7):
            pz.chord(t + 0.5 * k, 0.5, vs, 78 if k != 3 else 86)
    pz.note(t, 0.5, lo_root(cn, 'E2'), 92)
pz.note(b(32, 3), 0.5, N('B2'), 90)
# violins
v1.line(b(17), MEL, v=100, leg=1.03, tr=12)
v1.expr([(b(17), 110), (b(24, 3.8), 112)])
for t, d, cn in chord_iter(S, chart, range(37, 45)):
    c = chord(cn)
    r = N('A4') + ((c['root'] - N('A4')) % 12)
    th = third_of(c)
    if cn == 'B7':
        seqp = [0, 4, 7, 10, 12, 10, 7, 4]
    else:
        seqp = [0, th, 7, 12, 7, th, 7, 12]
    for k, iv in enumerate(seqp):
        v1a.note(t + 0.5 * k, 0.46, r + iv, 100 + (10 if k == 0 else 0))
v1a.expr([(b(37), 86), (b(44, 3.9), 120)])
v1.line(b(45), MEL, v=106, leg=1.03, tr=12)
v1.expr([(b(45), 122), (b(52, 3.9), 120)])
for t, d, cn in chord_iter(S, chart, range(53, 55)):
    vs = voicing(cn, 2, N('E4'), N('E5'))
    v1.chord(t, 0.45, vs, 96)
    v1.chord(t + 1.5, 0.45, vs, 92)

# ---------------------------------------------------------------- brass
hn.line(b(3), HORN_CALL, v=104, leg=1.02)
hn.expr([(b(3), 100), (b(4), 112), (b(4, 3.9), 104)])
hn.line(b(9), MEL, v=104, leg=1.02)
hn.expr([(b(9), 112), (b(16, 3.9), 108)])
hn.line(b(17), HORN_CTR, v=96, leg=1.03)
hn.expr([(b(17), 100), (b(24, 3.9), 104)])
hn.line(b(33), "E4:.75 E4:.25 G4:.5 A4:.5 B4:2 | r:4 | D4:.75 D4:.25 F#4:.5 A4:.5 D5:2 | r:4", v=106, leg=1.02)
hn.line(b(37), "A3:4 | B3:4 | C4:4 | D4:4 | E4:4 | G4:4 | A4:4 | B4:4", v=92, leg=1.02)
hn.expr([(b(33), 112), (b(36, 3.9), 112), (b(37), 72), (b(44, 3.9), 120)])
hn.line(b(45), MEL, v=110, leg=1.02)
hn.expr([(b(45), 122), (b(52, 3.9), 118)])
hn.line(b(53), "[E4,B4]:.5 r:1 [E4,B4]:.5 r:2 | [E4,G4]:.5 r:1 [E4,G4]:.5 r:2", v=100)

tp.line(b(17), MEL, v=102, leg=1.02)
tp.expr([(b(17), 112), (b(24, 3.9), 110)])
tp.line(b(45), MEL, v=110, leg=1.02)
tp.expr([(b(45), 124), (b(52, 3.9), 120)])
tp.line(b(44, 3), "B4:.25 B4:.25 D#5:.25 F#5:.25", v=96)

tb.line(b(33), "E3:.75 E3:.25 G3:.5 A3:.5 B3:2 | r:4 | D3:.75 D3:.25 F#3:.5 A3:.5 D4:2 | r:4", v=100, leg=1.02)
stabs([5, 6, 7, 8], v=104)
stabs(range(9, 17), v=92, pattern=(0,))
for t, d, cn in chord_iter(S, chart, range(17, 25)):
    vs = voicing(cn, 3, N('E2'), N('B3'))
    tb.chord(t, d * 0.9, vs, 74)
stabs(range(37, 45), v=96)
for t, d, cn in chord_iter(S, chart, range(45, 53)):
    vs = voicing(cn, 3, N('E2'), N('B3'))
    tb.chord(t, d * 0.92, vs, 88)
    tu.note(t, d * 0.92, lo_root(cn, 'E1') + 12, 92)
stabs([53, 54], v=108, pattern=(0, 3, 6))
tb.expr([(b(5), 110), (b(45), 120), (b(54, 3.9), 120)])
tu.expr([(b(5), 104), (b(45), 116), (b(54, 3.9), 116)])

# ---------------------------------------------------------------- flute / koto / choir
for (bar, beat, pch) in ((25, 1, 'D6'), (29, 0, 'F#6'), (30, 0, 'E6')):
    fl.note(b(bar, beat) - 0.1, 0.09, N(pch), 74)
wind_phrase(fl, S, b(25), FL_B, v=96, vib=0.08, vib_rate=5.5, exp_lo=92, exp_hi=118, long_beats=1.9)
wind_phrase(fl, S, b(34), "E6:.5 D6:.5 B5:.5 A5:.5 G5:1 E5:1", v=96, vib=0.0, exp_hi=118)
wind_phrase(fl, S, b(36), "B5:1 A5:.5 F#5:.5 B5:2", v=96, vib=0.08, exp_lo=96, exp_hi=118, long_beats=1.9)
wind_phrase(fl, S, b(45), MEL, v=82, tr=12, vib=0.05, exp_lo=96, exp_hi=110, long_beats=1.9)

for t, d, cn in chord_iter(S, chart, range(25, 33)):
    arp(ko, t, d, cn, v=78, pat=(0, 7, 12, 'T', 12, 7), step=0.5, lo=N('A3'), ring=0.9, accent=10)
gl_e = scale_run({pc('E'), pc('G'), pc('A'), pc('B'), pc('D')}, N('E4'), N('E6'))
gliss(ko, b(8, 3), 0.9, gl_e, v=86, ring=1.0)
gliss(ko, b(24, 3), 0.9, gl_e, v=86, ring=1.0)
gliss(ko, b(44, 2), 1.8, [N(x) for x in 'B3 D#4 F#4 A4 B4 D#5 F#5 A5 B5'.split()], v=90, ring=1.0)
ko.expr([(b(1), 116)])

pad(ch, S, chart, range(41, 45), 4, N('B3'), N('E5'), v=82)
pad(ch, S, chart, range(45, 53), 4, N('B3'), N('E5'), v=94)
ch.expr([(b(41), 70), (b(44, 3.9), 112), (b(45), 112), (b(52, 3.9), 108)])

# ---------------------------------------------------------------- percussion
BIG, MID, SMALL = N('F3'), N('C4'), N('G4')


def groove(bar, v=1.0, fill=False, light=False):
    t0 = b(bar)
    st = lambda k: t0 + k * 0.25
    for k in (0, 6, 12):
        tk.note(st(k), 1.0, BIG, int((118 if k == 0 else 104) * v))
    kit.note(st(0), 1.0, 87, int(104 * v))
    if light:
        for k in (8,):
            tk.note(st(k), 0.5, MID, int(84 * v))
        return
    for k in (3, 9, 10, 14):
        tk.note(st(k), 0.5, MID, int(88 * v))
        kit.note(st(k), 0.5, 86, int(80 * v))
    for k in (2, 4, 8, 11, 13, 15):
        tk.note(st(k), 0.3, SMALL, int(62 * v))
    if fill:
        for k in range(8, 16):
            tk.note(st(k), 0.25, MID if k < 12 else SMALL, int((70 + 5 * (k - 8)) * v))


for bar in range(1, 57):
    if 25 <= bar <= 32:
        groove(bar, 0.86, light=True)
        if bar in (28, 32):
            for k in range(12, 16):
                tk.note(b(bar) + k * 0.25, 0.25, SMALL, 70 + 6 * (k - 12))
        continue
    v = 0.92 if bar <= 2 else 1.0
    if 37 <= bar <= 40:
        v = 0.9
    groove(bar, v, fill=(bar % 4 == 0))
for bar in list(range(5, 25, 2)) + list(range(33, 57, 2)):
    kit.note(b(bar), 1.5, 36, 92)

# timpani
for bar in range(9, 25):
    if (bar - 9) % 2 == 0:
        ti.note(b(bar), 1.0, N('E2') if chart[bar] in ('Em',) else lo_root(chart[bar], 'G1') + (12 if lo_root(chart[bar], 'G1') < N('C2') else 0), 100)
roll(ti, b(4), 4.0, N('B1'), 44, 104, spb=spb, rate_s=0.06)
ti.note(b(5), 1.0, N('E2'), 110)
roll(ti, b(24, 2), 2.0, N('B1'), 60, 100, spb=spb, rate_s=0.06)
roll(ti, b(32, 2), 2.0, N('B1'), 50, 96, spb=spb, rate_s=0.06)
for bar in range(41, 44):
    for k in range(8):
        ti.note(b(bar) + 0.5 * k, 0.45, N('E2'), 70 + 3 * (bar - 41) * 4 + k * 2)
roll(ti, b(44), 4.0, N('B1'), 70, 118, spb=spb, rate_s=0.055)
for bar in range(45, 53):
    ti.note(b(bar), 1.0, lo_root(chart[bar], 'G1') + (12 if lo_root(chart[bar], 'G1') < N('C2') else 0) if chart[bar] != 'Em' else N('E2'), 112)
    ti.note(b(bar, 1.5), 0.5, N('E2') if chart[bar] == 'Em' else N('B1'), 92)
for bar in (53, 54):
    for k in (0, 3, 6):
        ti.note(b(bar) + 0.5 * k, 0.5, N('E2'), 108)

# cymbals
cy.note(b(5), 4, 72, 96)
cy.note(b(9), 4, 72, 104)
cy.note(b(17), 4, 72, 112)
cy.note(b(33), 4, 72, 100)
cy.note(b(45), 6, 72, 120)
cy.note(b(49), 4, 72, 104)
cy.note(b(53), 3, 74, 96)
rc.note(b(16, 4 - 2.06 / spb), 2.6, 60, 90)
rc.note(b(44, 4 - 2.06 / spb), 2.6, 60, 100)

# ---------------------------------------------------------------- synth layers
th = synth_thump(f_hi=110, f_lo=52, decay=0.32, dur=1.2, seed=5)
for bar in range(1, 57):
    if 25 <= bar <= 32:
        continue
    place_layer(S, 'thump', b(bar), th, dict(gain=-23, rev=-18, hp=45))
gong = synth_gong(f0=88, dur=8.0, bright=1.1, seed=4)
place_layer(S, 'gong', b(1), gong, dict(gain=-14, rev=-8, hp=75))
place_layer(S, 'gong', b(45), gong, dict(gain=-11, rev=-8, hp=75))

MIX = {
    'cb': dict(gain=1, pan=0.42, width=0.6, rev=-14, lp=5000),
    'vc': dict(gain=3, pan=0.3, width=0.6, rev=-13, hp=45),
    'va': dict(gain=1, pan=0.15, width=0.6, rev=-12, hp=110),
    'vln2': dict(gain=-1, pan=-0.2, width=0.7, rev=-11, hp=150),
    'vln1': dict(gain=2, pan=-0.38, width=0.7, rev=-10, hp=160),
    'vln1arp': dict(gain=3, pan=-0.38, width=0.7, rev=-10, hp=160),
    'trem': dict(gain=-3, pan=0.3, width=0.6, rev=-11, hp=40),
    'tremb': dict(gain=-4, pan=0.42, width=0.6, rev=-12, hp=30),
    'pizz': dict(gain=-3, pan=-0.1, width=0.8, rev=-10, hp=90),
    'hn': dict(gain=3.5, pan=-0.12, width=0.5, rev=-8, hp=70),
    'tpt': dict(gain=-0.5, pan=0.15, width=0.4, rev=-9, hp=150),
    'tbn': dict(gain=-6, pan=0.3, width=0.5, rev=-10, hp=60),
    'tuba': dict(gain=-6, pan=0.38, width=0.4, rev=-12, lp=2500),
    'fl': dict(gain=0, pan=-0.05, width=0.4, rev=-8, hp=300),
    'koto': dict(gain=-2, pan=-0.25, width=0.7, rev=-10, hp=150, lp=11000),
    'choir': dict(gain=-5, pan=0.0, width=1.0, rev=-6, hp=130),
    'timp': dict(gain=-6, pan=0.1, width=0.5, rev=-12, hp=50),
    'taiko': dict(gain=-3, pan=0.0, width=0.7, rev=-13, hp=60, peq=[(1800, 2.0, 1.0)]),
    'tkit': dict(gain=-5, pan=0.0, width=0.8, rev=-13, hp=55),
    'cym': dict(gain=-8, pan=0.05, width=1.0, rev=-11, hp=300),
    'rcym': dict(gain=-10, pan=0.0, width=1.0, rev=-12, hp=300),
}

if __name__ == '__main__':
    import time
    rdir = os.path.join(WORK, 'render', 'yasen')
    t0 = time.time()
    only = sys.argv[1].split(',') if len(sys.argv) > 1 and sys.argv[1] != 'all' else None
    if '--mixonly' not in sys.argv:
        os.makedirs(os.path.join(WORK, 'out'), exist_ok=True)
        S.render(rdir, jobs=2, only=only)
        print('render', round(time.time() - t0, 1), 's')
    ir = make_ir(rt_low=2.1, rt_mid=1.8, rt_high=1.1, length=3.0, predelay=0.018, seed=21, lp=11500)
    loop, info, _ = mix_song(S, rdir, MIX, ir, rev_return_db=-2.0, target_lufs=-16.0,
                             master=dict(level=dict(strength=0.35, win=3.0, smooth=4.0),
                                         eq=dict(ls=(90, -2.5), peq=[(400, -1.5, 0.9)], hs=(5000, 3.0)),
                                         comp=dict(thr_db=-19, ratio=2.0, att=0.015, rel=0.2)),
                             out_wav=os.path.join(WORK, 'out', 'yasen_loop.wav'))
    print('total', round(time.time() - t0, 1), 's')
