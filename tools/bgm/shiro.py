# -*- coding: utf-8 -*-
"""城攻め BGM 「攻城の刻」  100 BPM, 4/4, 40 bars (=96 s), C minor with phrygian (Db) colour.
v2: the climax (bars 29-36) becomes an all-out assault: galloping celli, 16th-note spiccato violins/violas,
3+3+2 brass punches, driving taiko + snare, decisive hits in bar 36 and a tutti landing with gong in bar 37."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

S = Song('shiro', bpm=100, bars=40)
b = S.b
spb = S.spb

A_CH = ['Cm', 'Db', 'Cm', ['Ab', 'Eb'], 'Bbm', ['Bbm', 'Fm'], 'Db', 'Cm']
chart = {1: 'Cm', 2: 'Cm', 3: 'Cm', 4: 'Db'}
for i, c in enumerate(A_CH):
    chart[5 + i] = c
    chart[13 + i] = c
    chart[29 + i] = c
for i, c in enumerate(['Fm', 'Db', 'Eb', 'Bbm', 'Fm', 'Db', 'Ab', 'G']):
    chart[21 + i] = c
for i, c in enumerate(['Cm', 'Db', 'Cm', 'Cm']):
    chart[37 + i] = c

MEL = ("G3:1 C4:1.5 Db4:.5 C4:1 | Ab3:.75 Bb3:.25 Ab3:1 F3:2 | G3:1 C4:1.5 Eb4:.5 G4:1 | Ab4:2 G4:1 F4:.5 Eb4:.5 |"
       "F4:1.5 Eb4:.5 Db4:1 C4:1 | Db4:2 C4:1 Ab3:1 | F4:1.5 Eb4:.5 Db4:2 | C4:4")
MEL_2ND = "F4:1.5 Eb4:.5 Db4:1 C4:1 | Db4:2 C4:1 Ab3:1 | F4:1.5 Eb4:.5 Db4:2 | C4:4"
MEL_B = ("F4:1.5 G4:.5 Ab4:2 | Ab4:1 Bb4:1 Ab4:1 F4:1 | G4:1.5 Ab4:.5 Bb4:2 | Bb4:1 C5:1 Db5:2 |"
         "Ab4:1.5 Bb4:.5 C5:2 | Db5:1 Eb5:1 F5:2 | Eb5:1.5 Db5:.5 C5:1 Ab4:1 | B4:2 D5:1 F5:1")
SHAKU_INTRO = "r:4 | G5:1.5 Ab5:.5 G5:2 | Eb5:1 F5:1 C5:2 | r:4"
# climax version of the theme: long notes re-struck (fanfare drive); bar 36 is replaced by tutti hits
MEL_CLX = ("G3:1 C4:1.5 Db4:.5 C4:1 | Ab3:.75 Bb3:.25 Ab3:1 F3:.75 F3:.25 F3:1 | G3:1 C4:1.5 Eb4:.5 G4:1 |"
           "Ab4:.75 Ab4:.25 Ab4:1 G4:1 F4:.5 Eb4:.5 | F4:1.5 Eb4:.5 Db4:1 C4:1 | Db4:.75 Db4:.25 Db4:1 C4:1 Ab3:1 |"
           "F4:1.5 Eb4:.5 Db4:.75 Db4:.25 Db4:1")
HITS36 = [(0, 1.2), (1.5, 1.2), (3, 0.6)]
SHAKU_OUT = "r:4 | Ab5:1.5 Bb5:.5 Ab5:2 | G5:1 Eb5:1 C5:2 | r:4"

# ---------------------------------------------------------------- parts
cb = S.part('cb', 50, 48, hum_ms=6, sf2=SF_MARC)
cbs = S.part('cbs', 50, 49, hum_ms=6)       # basses slow (drone)
vc = S.part('vc', 40, 48, hum_ms=6, sf2=SF_MARC)
va = S.part('va', 30, 48, hum_ms=6, sf2=SF_MARC)
for p_ in (cb, vc, va):
    p_.nrpn = [(38, -2600), (34, -1200)]
v1 = S.part('vln1', 20, 48, hum_ms=6)
v2 = S.part('vln2', 25, 48, hum_ms=6)
vt = S.part('vtrem', 20, 44, hum_ms=4)      # violins tremolo
lt = S.part('ltrem', 40, 44, hum_ms=4)      # celli tremolo
hn = S.part('hn', 0, 60, hum_ms=6)
tp = S.part('tpt', 0, 56, hum_ms=5)
tb = S.part('tbn', 0, 57, hum_ms=5)
tu = S.part('tuba', 0, 58, hum_ms=5)
sh = S.part('shaku', 0, 77, hum_ms=4, vel_jit=2)
sm = S.part('shami', 0, 106, hum_ms=4, vel_jit=6)
ch = S.part('choir', 0, 52, vel_jit=3)
ti = S.part('timp', 0, 47, hum_ms=2, vel_jit=3)
tk = S.part('taiko', 0, 116, hum_ms=2, vel_jit=5)
kit = S.part('tkit', 0, 48, kit=True, hum_ms=2, vel_jit=4)
cy = S.part('cym', 0, 58, kit=True, hum_ms=0, vel_jit=0)
rc = S.part('rcym', 0, 119, hum_ms=0, vel_jit=0)
# assault (climax) parts: very short release so 16ths / gallop articulate
v2r = S.part('vln2run', 25, 48, hum_ms=4, sf2=SF_MARC)
var_ = S.part('varun', 30, 48, hum_ms=4, sf2=SF_MARC)
vcg = S.part('vcgal', 40, 48, hum_ms=4, sf2=SF_MARC)
for p_ in (v2r, var_, vcg):
    p_.nrpn = [(38, -3800), (34, -1800)]
sn = S.part('snare', 0, 48, kit=True, hum_ms=3, vel_jit=6)
tka = S.part('taiko_as', 0, 116, hum_ms=2, vel_jit=5)


def lo_root(cn, lo):
    r = chord(cn)['root']
    base = N(lo)
    return base + ((r - base) % 12)


ACC = [114, 76, 90, 80, 100, 76, 92, 84]


def ostinato(bars, vmul=1.0, viola=True):
    for t, d, cn in chord_iter(S, chart, bars):
        r = lo_root(cn, 'G1')
        if r < N('C2'):
            r += 12
        tonic = chord(cn)['root'] == pc('C')
        pat = [0, 0, 12, 0, 1, 0, 12, -2] if tonic else [0, 0, 12, 0, 0, 0, 12, 0]
        rm = lo_root(cn, 'G2')
        for k in range(int(round(d * 2))):
            vv = int(ACC[k] * vmul)
            vc.note(t + 0.5 * k, 0.4, r + pat[k], vv)
            if viola:
                c = chord(cn)
                th = third_of(c)
                va.note(t + 0.5 * k, 0.4, rm + (7 if k % 2 == 0 else 12 + (th if k in (3, 7) else 0)), int(vv * 0.82))
        for k in range(int(round(d / 2))):
            cb.note(t + 2 * k, 1.4, r, int((110 - 14 * k) * vmul))


# ---------------------------------------------------------------- strings
# intro drone + tremolo swell
cbs.note(b(1), 12.1, N('C2'), 86)
cbs.note(b(4), 4.1, N('Db2'), 96)
cbs.expr([(b(1), 70), (b(3), 96), (b(4, 3.9), 118)])
lt.note(b(1), 12.1, N('C3'), 80)
lt.note(b(1), 12.1, N('G2'), 76)
lt.note(b(4), 4.1, N('Db3'), 92)
lt.note(b(4), 4.1, N('Ab2'), 88)
lt.expr([(b(1), 46), (b(3), 80), (b(4, 3.9), 120)])
ostinato(range(5, 13), 0.95)
ostinato(range(13, 21), 1.0)
for t, d, cn in chord_iter(S, chart, range(21, 29)):
    r = lo_root(cn, 'G1')
    if r < N('C2'):
        r += 12
    cbs.note(t, d + 0.1, r, 92)
    vc.note(t, 2.05, r + 12, 88)
    vc.note(t + 2, 2.05, r + 12, 82)
cbs.expr([(b(21), 100), (b(28, 3.9), 120)])
cbs.expr([(b(37), 108), (b(39), 96), (b(40, 3.9), 72)])
# outro: drone
cbs.note(b(37), 4.1, N('C2'), 96)
cbs.note(b(38), 4.1, N('Db2'), 92)
cbs.note(b(39), 8.1, N('C2'), 88)
lt.note(b(39), 8.1, N('C3'), 70)
lt.note(b(39), 8.1, N('G2'), 66)
lt.expr([(b(39), 90), (b(40, 3.9), 52)])
for p_ in (vc, va, cb):
    p_.expr([(b(5), 100), (b(13), 108), (b(20, 3.9), 112), (b(21), 100), (b(29), 124), (b(36, 3.9), 124),
             (b(37), 100), (b(38, 3.9), 86)])
for t, d, cn in chord_iter(S, chart, [37, 38]):
    r = lo_root(cn, 'G1')
    r = r + 12 if r < N('C2') else r
    for k in (0, 3, 6):
        vc.note(t + 0.5 * k, 0.6, r, 100 - 4 * k)

# high tremolo (A', B, climax)
for t, d, cn in chord_iter(S, chart, range(13, 21)):
    vt.chord(t, d + 0.05, voicing(cn, 2, N('C5'), N('C6')), 84)
for t, d, cn in chord_iter(S, chart, range(21, 29)):
    vt.chord(t, d + 0.05, voicing(cn, 2, N('Ab4'), N('Ab5')), 70)
vt.expr([(b(13), 70), (b(16, 3.9), 96), (b(17), 84), (b(20, 3.9), 108),
         (b(21), 60), (b(26), 76), (b(28, 3.9), 110)])

# violins: B melody, climax
v1.line(b(21), MEL_B, v=106, leg=1.05)
v2.line(b(21), MEL_B, v=94, leg=1.05, tr=-12)
v1.expr([(b(21), 108), (b(24, 3.9), 114), (b(25), 110), (b(28, 3.9), 126)])
v2.expr([(b(21), 104), (b(28, 3.9), 120)])
v1.line(b(29), MEL_CLX, v=108, leg=1.03, tr=12)
for p_, d_ in HITS36:
    v1.note(b(36, p_), d_, N('C5'), 112)
v1.chord(b(37), 2.0, [N('C5'), N('G5')], 116)
v1.expr([(b(29), 122), (b(36, 3.9), 124), (b(37), 124), (b(37, 2), 96)])


def seg_at(bar, beat):
    for t_, d_, cn_ in chord_iter(S, chart, [bar]):
        if t_ - 1e-6 <= b(bar, beat) < t_ + d_ - 1e-6:
            return cn_
    raise ValueError((bar, beat))


# 16th-note spiccato drive: violins race ABOVE the brass theme, violas an octave+ below; accents 3+3+2
RUN_P = [12, 7, 12, 'T', 12, 7, 'T', 12]
RUN_V = [112, 72, 80, 104, 74, 82, 104, 86]
for bar in range(29, 37):
    boost = 6 if bar >= 33 else 0
    for k in range(16):
        if bar == 36 and k >= 12:
            break
        cn = seg_at(bar, 0.25 * k)
        iv = RUN_P[k % 8]
        iv = 12 + third_of(chord(cn)) if iv == 'T' else iv
        v2r.note(b(bar) + 0.25 * k, 0.2, lo_root(cn, 'G4') + iv, RUN_V[k % 8] + boost)
        var_.note(b(bar) + 0.25 * k, 0.2, lo_root(cn, 'G3') + iv - 12, RUN_V[k % 8] + boost - 6)
# run-up into the assault (bar 28, G: harmonic-minor scale) and into the landing (bar 36 beat 4)
for k, nm in enumerate('G4 Ab4 B4 C5 D5 Eb5 F5 G5'.split()):
    v2r.note(b(28, 2) + 0.25 * k, 0.2, N(nm), 70 + 6 * k)
    var_.note(b(28, 2) + 0.25 * k, 0.2, N(nm) - 12, 66 + 6 * k)
for k, nm in enumerate('G4 Ab4 Bb4 B4'.split()):
    v2r.note(b(36, 3) + 0.25 * k, 0.2, N(nm) + 12, 96 + 6 * k)
    var_.note(b(36, 3) + 0.25 * k, 0.2, N(nm) - 12, 92 + 6 * k)
v2r.note(b(37), 1.0, N('C6'), 118)
var_.note(b(37), 1.0, N('C4'), 114)
for p_ in (v2r, var_):
    p_.expr([(b(28, 2), 100), (b(29), 112), (b(33), 118), (b(36, 3.9), 124)])

# galloping celli (8th + two 16ths per beat) and basses on every beat
GAL = [(0.0, 0.42), (0.5, 0.2), (0.75, 0.2)]
GAL_V = [116, 80, 90]
for bar in range(29, 37):
    boost = 5 if bar >= 33 else 0
    for beat in range(4):
        if bar == 36 and beat == 3:
            break
        cn = seg_at(bar, beat)
        r = lo_root(cn, 'C2')
        tonic = chord(cn)['root'] == pc('C')
        first = r + (12 if beat in (1, 3) else (1 if (beat == 2 and tonic) else 0))
        pitches = [first, r, r + 12 if beat == 3 else r]
        for (o, d_), pch, vv in zip(GAL, pitches, GAL_V):
            vcg.note(b(bar, beat + o), d_, pch, vv + boost + (4 if beat == 0 else 0))
        rb = lo_root(cn, 'G1')
        rb = rb + 12 if rb < N('C2') else rb
        cb.note(b(bar, beat), 0.8, rb, [118, 100, 110, 100][beat] + boost)
for k, nm in enumerate('G2 Ab2 Bb2 B2'.split()):
    vcg.note(b(36, 3) + 0.25 * k, 0.2, N(nm), 98 + 6 * k)
cb.note(b(37), 2.0, N('C2'), 122)
vcg.expr([(b(29), 116), (b(33), 122), (b(36, 3.9), 124)])


# ---------------------------------------------------------------- brass
tb.line(b(3), "[C3,G3]:4 | [Db3,Ab3]:4", v=92, leg=1.02)
tu.line(b(3), "C2:4 | Db2:4", v=90, leg=1.02)
hn.line(b(4), "[Db4,F4,Ab4]:4", v=92, leg=1.02)
tb.expr([(b(3), 60), (b(4, 3.9), 124)])
tu.expr([(b(3), 60), (b(4, 3.9), 120)])
hn.expr([(b(4), 70), (b(4, 3.9), 122)])
hn.line(b(5), MEL, v=104, leg=1.03)
hn.line(b(13), MEL, v=108, leg=1.03)
hn.expr([(b(5), 108), (b(12, 3.9), 112), (b(13), 116), (b(20, 3.9), 120)])
tp.line(b(17), MEL_2ND, v=100, leg=1.03, tr=12)
tp.line(b(16, 3), "G4:.25 G4:.25 C5:.5", v=96)
tp.expr([(b(16, 3), 104), (b(17), 112), (b(20, 3.9), 116)])
# B: horn calls answering the violins
hn.line(b(21), "r:3 C4:.5 F4:.5 | r:4 | r:3 Bb3:.5 Eb4:.5 | r:4 | r:3 C4:.5 F4:.5 | r:4 | r:2 Ab3:.5 C4:.5 Eb4:1 | [G3,B3,D4]:4",
        v=100, leg=1.02)
tp.line(b(28), "G4:1 B4:1 D5:1 G5:.5 G5:.5", v=100, leg=1.0)
tp.expr([(b(28), 96), (b(28, 3.9), 120)])
# climax
tp.line(b(29), MEL_CLX, v=114, leg=1.02, tr=12)
for p_, d_ in HITS36:
    tp.note(b(36, p_), d_ * 0.85, N('C5'), 118)
tp.chord(b(37), 2.0, [N('C5'), N('Eb5'), N('G5')], 118)
tp.expr([(b(29), 124), (b(36, 3.9), 124), (b(37), 124), (b(37, 2), 90)])
hn.line(b(29), MEL_CLX, v=112, leg=1.02)
for p_, d_ in HITS36:
    hn.note(b(36, p_), d_ * 0.85, N('C4'), 116)
hn.chord(b(37), 4.0, [N('C4'), N('G4')], 114)
hn.line(b(38), "[Db4,Ab4]:4 | [C4,G4]:4", v=84, leg=1.03)
hn.expr([(b(21), 104), (b(28, 3.9), 120), (b(29), 124), (b(36, 3.9), 124)])
hn.expr([(b(37), 124), (b(37, 3), 98), (b(39, 3.9), 70)])
for t, d, cn in chord_iter(S, chart, range(5, 21)):
    vs = voicing(cn, 3, N('C2'), N('Bb3'))
    vel = 84
    r = lo_root(cn, 'G1')
    r = r + 12 if r < N('C2') else r
    for k in range(int(round(d / 2))):
        tb.chord(t + 2 * k, 1.4, vs, vel - 8 * k)
        tu.note(t + 2 * k, 1.4, r, vel - 8 * k)
for t, d, cn in chord_iter(S, chart, range(21, 29)):
    vs = voicing(cn, 3, N('C2'), N('Bb3'))
    tb.chord(t, d * 0.95, vs, 54)
# assault: 3+3+2 punches (+ pickup from bar 33), bar 36 hits, bar 37 landing
for bar in range(29, 36):
    pos = [(0, 0.5, 102), (1.5, 0.5, 96), (3, 0.5, 98)] + ([(3.5, 0.3, 86)] if bar >= 33 else [])
    for p_, d_, vv in pos:
        cn = seg_at(bar, p_)
        vs = voicing(cn, 3, N('C2'), N('Bb3'))
        r = lo_root(cn, 'G1')
        r = r + 12 if r < N('C2') else r
        tb.chord(b(bar, p_), d_, vs, vv)
        tu.note(b(bar, p_), d_, r, vv - 4)
vs = voicing('Cm', 3, N('C2'), N('Bb3'))
for p_, d_ in HITS36:
    tb.chord(b(36, p_), d_ * 0.75, vs, 110)
    tu.note(b(36, p_), d_ * 0.75, N('C2'), 108)
tb.chord(b(37), 2.5, vs, 118)
tu.note(b(37), 2.5, N('C2'), 114)
tb.expr([(b(5), 104), (b(21), 90), (b(28, 3.9), 120), (b(29), 124), (b(37, 2.5), 124)])
tu.expr([(b(5), 100), (b(21), 90), (b(29), 118), (b(36, 3.9), 118)])

# ---------------------------------------------------------------- shakuhachi / shamisen / choir
wind_phrase(sh, S, b(1), SHAKU_INTRO, v=94, scoop=0.8, vib=0.16, vib_rate=4.6, exp_lo=80, exp_hi=120, fall=0.6)
wind_phrase(sh, S, b(37), SHAKU_OUT, v=90, scoop=0.8, vib=0.16, vib_rate=4.4, exp_lo=76, exp_hi=116, fall=0.6,
            end_exp=50)
SH_PAT = [0, 0, 12, 0, 7, 0, 12, 7, 0, 0, 12, 0, 7, 12, 7, 12]
SH_VEL = [104, 66, 84, 70, 96, 66, 84, 74, 100, 66, 84, 70, 96, 80, 76, 88]
for t, d, cn in chord_iter(S, chart, range(21, 29)):
    r = lo_root(cn, 'F3')
    for k in range(16):
        sm.note(t + 0.25 * k, 0.3, r + SH_PAT[k], SH_VEL[k])
sm.expr([(b(21), 92), (b(28, 3.9), 116)])

pad(ch, S, chart, range(13, 21), 4, N('G3'), N('C5'), v=78)
pad(ch, S, chart, range(25, 29), 4, N('G3'), N('C5'), v=70)
pad(ch, S, chart, range(29, 36), 4, N('G3'), N('Eb5'), v=88)
cm_v = voicing('Cm', 4, N('G3'), N('Eb5'))
for p_, d_ in HITS36:
    ch.chord(b(36, p_), d_, cm_v, 100)
ch.chord(b(37), 3.0, cm_v, 104)
ch.expr([(b(13), 70), (b(20, 3.9), 104), (b(25), 60), (b(28, 3.9), 110), (b(29), 112), (b(36, 3.9), 116),
         (b(37), 116), (b(37, 3), 70)])

# ---------------------------------------------------------------- percussion
BIG, MID, SMALL = N('D3'), N('A3'), N('F4')


def groove(bar, v=1.0, fill=False, light=False):
    t0 = b(bar)
    st = lambda k: t0 + k * 0.25
    for k in (0, 6, 8, 14):
        tk.note(st(k), 1.2, BIG, int((120 if k in (0, 8) else 102) * v))
    kit.note(st(0), 1.2, 87, int(108 * v))
    kit.note(st(8), 1.2, 87, int(96 * v))
    if light:
        return
    for k in (3, 11, 12):
        tk.note(st(k), 0.5, MID, int(88 * v))
        kit.note(st(k), 0.5, 86, int(78 * v))
    for k in (2, 4, 10, 13, 15):
        tk.note(st(k), 0.3, SMALL, int(58 * v))
    if fill:
        for k in range(10, 16):
            tk.note(st(k), 0.25, MID if k < 13 else SMALL, int((72 + 6 * (k - 10)) * v))


for bar in (1, 2, 3):
    tk.note(b(bar), 2.0, BIG, 104 + 4 * bar)
    kit.note(b(bar), 2.0, 87, 100)
    tk.note(b(bar, 2), 1.5, BIG, 92 + 4 * bar)
    tk.note(b(bar, 3.5), 0.5, MID, 70 + 6 * bar)
for k in range(16):
    tk.note(b(4) + 0.25 * k, 0.25, MID if k < 8 else SMALL, 60 + 3 * k)
tk.note(b(4), 1.0, BIG, 110)
for bar in range(5, 29):
    if 21 <= bar <= 28:
        groove(bar, 0.85, light=True)
        for k in (2, 4, 10, 12):
            tk.note(b(bar) + 0.25 * k, 0.3, SMALL, 62)
        continue
    groove(bar, 0.95 if bar < 13 else 1.0, fill=(bar % 4 == 0))
# bar 28: 16th fill launching the assault
for k in range(8, 16):
    tk.note(b(28) + 0.25 * k, 0.25, MID if k < 12 else SMALL, 72 + 5 * (k - 8))


def assault(bar, boost=0, fill=False):
    st = lambda k: b(bar) + 0.25 * k
    for k, v in ((0, 118), (4, 104), (8, 114), (12, 104), (14, 94)):
        tka.note(st(k), 1.0, BIG, v + boost)
    kit.note(st(0), 1.0, 87, 108 + boost)
    kit.note(st(8), 1.0, 87, 98 + boost)
    for k in (2, 6, 10, 15):
        tka.note(st(k), 0.4, MID, 86 + boost)
        kit.note(st(k), 0.4, 86, 72 + boost)
    for k in range(16):
        tka.note(st(k), 0.2, SMALL, (76 if k in (0, 3, 6, 8, 11, 14) else 52) + boost)
    if fill:
        for k in range(12, 16):
            tka.note(st(k), 0.25, MID, 80 + 6 * (k - 12) + boost)


for bar in range(29, 36):
    assault(bar, 6 if bar >= 33 else 0, fill=(bar in (32, 35)))
for p_ in (0, 1.5, 3):
    tka.note(b(36, p_), 1.0, BIG, 124)
    kit.note(b(36, p_), 1.0, 87, 116)
for k, v in ((13, 80), (14, 92), (15, 104)):
    tka.note(b(36) + 0.25 * k, 0.25, SMALL, v)

# snare: continuous 16ths in the assault, roll in bar 28, hits in bar 36
SN_V = [96, 40, 52, 64, 88, 40, 52, 64, 96, 40, 52, 64, 88, 52, 70, 84]
for k in range(16):
    sn.note(b(28, 2) + 0.125 * k, 0.12, 38, int(36 + 64 * k / 15))
for bar in range(29, 36):
    bst = 8 if bar >= 33 else 0
    for k in range(16):
        sn.note(b(bar) + 0.25 * k, 0.2, 38, SN_V[k] + bst)
for p_ in (0, 1.5, 3):
    sn.note(b(36, p_), 0.3, 38, 112)
for k, v in ((13, 74), (14, 88), (15, 102)):
    sn.note(b(36) + 0.25 * k, 0.2, 38, v)
sn.note(b(37), 0.5, 38, 112)

for bar, v in ((37, 124), (38, 100), (39, 90), (40, 80)):
    tk.note(b(bar), 2.0, BIG, v)
    kit.note(b(bar), 2.0, 87, v - 6)
    tk.note(b(bar, 2), 1.5, BIG, v - 14)
for bar in list(range(5, 21, 2)) + list(range(29, 37, 1)):
    kit.note(b(bar), 1.5, 36, 96)

# timpani
roll(ti, b(3), 4.0, N('C2'), 40, 76, spb=spb, rate_s=0.06)
roll(ti, b(4), 4.0, N('Db2'), 70, 100, spb=spb, rate_s=0.055)
TIMP = {'Cm': 'C2', 'Db': 'Db2', 'Ab': 'Ab1', 'Bbm': 'F2', 'Fm': 'F2', 'Eb': 'Eb2', 'G': 'G2'}
for bar in range(5, 21):
    nm = TIMP[chart[bar][0] if isinstance(chart[bar], list) else chart[bar]]
    ti.note(b(bar), 1.0, N(nm), 108 if bar >= 29 else 100)
    ti.note(b(bar, 2), 1.0, N(nm), 92 if bar >= 29 else 84)
    if bar % 2 == 0:
        ti.note(b(bar, 3.5), 0.5, N(nm), 88)
roll(ti, b(28), 4.0, N('G2'), 50, 118, spb=spb, rate_s=0.055)
for bar in range(29, 36):
    if bar < 33:
        for p_, vv in ((0, 110), (2, 94)):
            ti.note(b(bar, p_), 1.0, N(TIMP[seg_at(bar, p_)]), vv)
        if bar % 2 == 0:
            ti.note(b(bar, 3.5), 0.25, N(TIMP[seg_at(bar, 3.5)]), 86)
            ti.note(b(bar, 3.75), 0.25, N(TIMP[seg_at(bar, 3.75)]), 94)
    else:
        for p_, vv in ((0, 112), (1, 96), (2, 106), (3, 96)):
            ti.note(b(bar, p_), 0.8, N(TIMP[seg_at(bar, p_)]), vv)
        ti.note(b(bar, 3.5), 0.25, N(TIMP[seg_at(bar, 3.5)]), 92)
for p_ in (0, 1.5, 3):
    ti.note(b(36, p_), 1.0, N('C2'), 116)
ti.note(b(37), 1.5, N('C2'), 120)
ti.note(b(38), 1.5, N('Db2'), 90)
roll(ti, b(39, 2), 6.0, N('C2'), 50, 30, spb=spb, rate_s=0.065)

# cymbals
cy.note(b(5), 4, 72, 108)
cy.note(b(13), 4, 72, 112)
cy.note(b(21), 4, 74, 90)
cy.note(b(29), 6, 72, 122)
cy.note(b(31), 3, 74, 90)
cy.note(b(33), 4, 72, 116)
cy.note(b(35), 3, 74, 92)
cy.note(b(37), 6, 72, 122)
rc.note(b(4, 4 - 2.06 / spb), 2.6, 60, 96)
rc.note(b(28, 4 - 2.06 / spb), 2.6, 60, 104)
rc.note(b(36, 4 - 2.06 / spb), 2.6, 60, 88)

# ---------------------------------------------------------------- synth layers
bell = synth_bell(f0=98.0, dur=11.0, seed=9)
place_layer(S, 'bell', b(1), bell, dict(gain=-12, rev=-6, hp=60))
place_layer(S, 'bell', b(3), bell, dict(gain=-15, rev=-6, hp=60))
place_layer(S, 'bell', b(38), bell, dict(gain=-13, rev=-6, hp=60))
place_layer(S, 'bell', b(40), bell, dict(gain=-16, rev=-6, hp=60))
gong = synth_gong(f0=84, dur=9.0, bright=1.1, seed=12)
place_layer(S, 'gong', b(5), gong, dict(gain=-13, rev=-8, hp=70))
place_layer(S, 'gong', b(29), gong, dict(gain=-10, rev=-8, hp=70))
place_layer(S, 'gong', b(37), gong, dict(gain=-9, rev=-8, hp=70))
th = synth_thump(f_hi=100, f_lo=48, decay=0.4, dur=1.4, seed=8)
for bar in list(range(1, 21)) + list(range(29, 41)):
    g0 = -18 if bar == 37 else (-23 if 29 <= bar <= 36 else -22)
    place_layer(S, 'thump', b(bar), th, dict(gain=g0, rev=-16, hp=42))
    if 5 <= bar <= 35:
        place_layer(S, 'thump', b(bar, 2), th, dict(gain=-26 if bar >= 29 else -25, rev=-16, hp=42))

MIX = {
    'cb': dict(gain=1, pan=0.42, width=0.6, rev=-14, lp=4500),
    'cbs': dict(gain=-3, pan=0.4, width=0.6, rev=-12, lp=4500),
    'vc': dict(gain=3.5, pan=0.3, width=0.6, rev=-12, hp=45),
    'va': dict(gain=0, pan=0.15, width=0.6, rev=-12, hp=110),
    'vln1': dict(gain=2.5, pan=-0.38, width=0.7, rev=-9, hp=160),
    'vln2': dict(gain=-1, pan=-0.2, width=0.7, rev=-9, hp=130),
    'vtrem': dict(gain=-7, pan=-0.3, width=0.8, rev=-9, hp=200),
    'ltrem': dict(gain=-3, pan=0.3, width=0.6, rev=-11, hp=40),
    'hn': dict(gain=5, pan=-0.12, width=0.5, rev=-8, hp=70),
    'tpt': dict(gain=2.5, pan=0.15, width=0.4, rev=-8, hp=150, peq=[(2500, 2.0, 1.0)]),
    'tbn': dict(gain=-6, pan=0.3, width=0.5, rev=-10, hp=60),
    'tuba': dict(gain=-8, pan=0.38, width=0.4, rev=-12, lp=2500),
    'shaku': dict(gain=3.5, pan=0.1, width=0.4, rev=-6, hp=200),
    'shami': dict(gain=-3, pan=-0.25, width=0.6, rev=-11, hp=150),
    'choir': dict(gain=-4, pan=0.0, width=1.0, rev=-6, hp=120),
    'timp': dict(gain=-6, pan=0.1, width=0.5, rev=-12, hp=48),
    'taiko': dict(gain=-3, pan=0.0, width=0.7, rev=-12, hp=55, peq=[(1800, 2.0, 1.0)]),
    'tkit': dict(gain=-5, pan=0.0, width=0.8, rev=-12, hp=55),
    'cym': dict(gain=-8, pan=0.05, width=1.0, rev=-11, hp=300),
    'rcym': dict(gain=-10, pan=0.0, width=1.0, rev=-12, hp=300),
    'vln2run': dict(gain=6, pan=-0.24, width=0.7, rev=-13, hp=200),
    'varun': dict(gain=3.5, pan=0.12, width=0.6, rev=-13, hp=120),
    'vcgal': dict(gain=6, pan=0.3, width=0.6, rev=-14, hp=45),
    'snare': dict(gain=5, pan=0.08, width=0.6, rev=-15, hp=150),
    'taiko_as': dict(gain=3, pan=0.0, width=0.7, rev=-14, hp=55, peq=[(1800, 2.0, 1.0)]),
}

if __name__ == '__main__':
    import time
    rdir = os.path.join(WORK, 'render', 'shiro')
    t0 = time.time()
    only = sys.argv[1].split(',') if len(sys.argv) > 1 and sys.argv[1] != 'all' else None
    if '--mixonly' not in sys.argv:
        os.makedirs(os.path.join(WORK, 'out'), exist_ok=True)
        S.render(rdir, jobs=2, only=only)
        print('render', round(time.time() - t0, 1), 's')
    ir = make_ir(rt_low=2.6, rt_mid=2.2, rt_high=1.2, length=3.6, predelay=0.024, seed=31, lp=11000)
    loop, info, _ = mix_song(S, rdir, MIX, ir, rev_return_db=-1.5, target_lufs=-16.0,
                             master=dict(level=dict(strength=0.35, win=3.0, smooth=4.0),
                                         eq=dict(ls=(90, -2.5), peq=[(400, -1.5, 0.9)], hs=(5000, 3.0)),
                                         comp=dict(thr_db=-19, ratio=2.0, att=0.015, rel=0.2)),
                             out_wav=os.path.join(WORK, 'out', 'shiro_loop.wav'))
    print('total', round(time.time() - t0, 1), 's')
