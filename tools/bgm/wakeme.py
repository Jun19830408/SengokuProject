# -*- coding: utf-8 -*-
"""天下分け目・大合戦 BGM 「天下決戦」  120 BPM, 4/4, 88 bars (=176 s).

静かな予兆から始まり、軍勢が集まり、最初の激突、寝返りの沈み、一段ずつ迫り上がる低音と
一瞬の静寂を経て、二段の頂点（ニ短調 → 短三度上のヘ短調）へ。決着の一撃（銅鑼）の後、
余燼から冒頭の予兆へ戻ってループする。

  主題（天下の主題）  D4 D D A | G F G A | D5 C Bb G | A ...   ホルン・トランペット
  宿命の動機          D A Bb A （五度下りて半音の溜息）          低弦・ファゴット・トロンボーン
  哀歌                都節（D Eb G A Bb）の尺八                   寝返りと余燼
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

S = Song('wakeme', bpm=120, bars=88)
b = S.b
spb = S.spb

# bar 7 of the theme holds the 4th over the dominant (D over A) and resolves: the pads follow (sus4 -> 3)
TH = ['Dm', 'F', 'Gm', 'A', 'Dm', 'Bb', [('Gm', 2), ('Asus4', 1), ('A', 1)], 'Dm']
TH_F = ['Fm', 'Ab', 'Bbm', 'C', 'Fm', 'Db', [('Bbm', 2), ('Csus4', 1), ('C', 1)], 'Fm']
chart = {k: 'D5' for k in range(1, 9)}
chart.update({9: 'Dm', 10: 'Dm', 11: 'Dm', 12: 'Dm', 13: 'Dm', 14: 'Dm', 15: 'Fm', 16: 'A',
              17: 'Dm', 18: 'Dm', 19: 'Fm', 20: 'Fm', 21: 'Gm', 22: 'Gm', 23: 'Bb', 24: 'A'})
for i, c in enumerate(TH):
    chart[25 + i] = c
    chart[33 + i] = c
    chart[57 + i] = c
chart.update({41: 'Dm', 42: 'Eb', 43: 'Dm', 44: 'Bbm', 45: 'Gm', 46: 'Eb', 47: 'A7', 48: 'A',
              49: 'Dm', 50: 'Eb', 51: 'F', 52: 'Gm', 53: 'A', 54: 'Bb', 55: 'C', 56: 'A/C#'})
for i, c in enumerate(TH_F):
    chart[65 + i] = c
chart.update({73: 'Fm', 74: 'Db', 75: 'Bbm', 76: 'C', 77: 'Bb', 78: 'A', 79: 'Dm', 80: 'Dm',
              81: 'Dm', 82: 'Bb', 83: 'Gm', 84: 'A', 85: 'Dm', 86: 'Eb/D', 87: 'Dm', 88: 'Dm'})

THEME = ("D4:1.5 D4:.25 D4:.25 A4:2 | G4:1 F4:.5 G4:.5 A4:2 | D5:1.5 C5:.5 Bb4:1 G4:1 | A4:4 |"
         "D4:1.5 D4:.25 D4:.25 A4:2 | Bb4:1 A4:.5 Bb4:.5 C5:2 | F5:1.5 E5:.5 D5:1 C#5:1 | D5:4")
LAMENT = ("A4:2 Bb4:1 A4:1 | G4:1.5 Eb4:.5 G4:1 Bb4:1 | A4:2.5 G4:.5 F4:1 | Db5:1.5 C5:.5 Bb4:2 |"
          "D5:2 Bb4:1 G4:1 | G4:1.5 Bb4:.5 Eb5:2 | C#5:1 E5:1 G5:1 E5:1 | A5:4")
D_MIN = {pc(x) for x in 'D E F G A Bb C'.split()}
D_HARM = {pc(x) for x in 'D E F G A Bb C#'.split()}
F_HARM = {pc(x) for x in 'F G Ab Bb C Db E'.split()}
# open (fifthless) chords for pads under the fate motif, so its sigh (b6 -> 5) never rubs against a held 5th
QUAL['m_no5'] = [0, 3]
QUAL['_no5'] = [0, 4]


def no5(name):
    """'Fm' -> 'Fm_no5', 'A' -> 'A_no5'; other qualities (7th, sus4, power) stay as they are."""
    if isinstance(name, list):
        return [no5(x) if isinstance(x, str) else (no5(x[0]), x[1]) for x in name]
    base = name.split('/')[0]
    k = 1
    while k < len(base) and base[k] in '#b':
        k += 1
    root, q = base[:k], base[k:]
    return root + 'm_no5' if q == 'm' else root + '_no5' if q == '' else name


def NO5(ch_):
    return {k: no5(v) for k, v in ch_.items()}

# ---------------------------------------------------------------- parts
MARC = [(38, -2600), (34, -1200)]
RUNR = [(38, -3800), (34, -1800)]
cbt = S.part('cbtrem', 50, 44, hum_ms=4)           # basses tremolo (drone)
cbs = S.part('cbs', 50, 49, hum_ms=6)              # basses slow
lt = S.part('ltrem', 40, 44, hum_ms=4)             # celli tremolo
vt = S.part('vtrem', 20, 44, hum_ms=4)             # violins tremolo (high)
vcs = S.part('vcs', 40, 49, hum_ms=6)              # celli slow (motif)
bsn = S.part('bsn', 0, 70, hum_ms=5, vel_jit=3)    # bassoon (motif)
cbp = S.part('cbpizz', 50, 45, hum_ms=5)           # basses pizzicato
vco = S.part('vc', 40, 48, hum_ms=5, sf2=SF_MARC)  # celli ostinato / gallop
vao = S.part('va', 30, 48, hum_ms=5, sf2=SF_MARC)  # violas ostinato / 16ths
v2o = S.part('vln2', 25, 48, hum_ms=5, sf2=SF_MARC)
v1r = S.part('vln1run', 20, 48, hum_ms=4, sf2=SF_MARC)
cbm = S.part('cb', 50, 48, hum_ms=5, sf2=SF_MARC)
for p_ in (vco, vao, v2o, cbm):
    p_.nrpn = MARC
v1r.nrpn = RUNR
v1 = S.part('vln1', 20, 48, hum_ms=6)              # legato: descant / theme
v2 = S.part('vln2leg', 25, 48, hum_ms=6)           # legato: theme in climaxes
hn = S.part('hn', 0, 60, hum_ms=6)
hora = S.part('hora', 0, 60, hum_ms=0, vel_jit=0)  # the conch-like horn call
tp = S.part('tpt', 0, 56, hum_ms=5)
tb = S.part('tbn', 0, 57, hum_ms=5)
tu = S.part('tuba', 0, 58, hum_ms=5)
fl = S.part('fl', 0, 73, hum_ms=4, vel_jit=3)
ch = S.part('choir', 0, 52, vel_jit=3)
chl = S.part('choirlo', 0, 52, vel_jit=3)          # low voices: the fate line
cho = S.part('oohs', 0, 53, vel_jit=3)
sh = S.part('shaku', 0, 77, hum_ms=4, vel_jit=2)
ko = S.part('koto', 0, 107, sf2=SF_GU, hum_ms=6)
sm = S.part('shami', 0, 106, hum_ms=4, vel_jit=6)
hp = S.part('harp', 0, 46, hum_ms=4)
ti = S.part('timp', 0, 47, hum_ms=2, vel_jit=3)
tk = S.part('taiko', 0, 116, hum_ms=2, vel_jit=5)
tka = S.part('taiko_as', 0, 116, hum_ms=2, vel_jit=5)
kit = S.part('tkit', 0, 48, kit=True, hum_ms=2, vel_jit=4)
sn = S.part('snare', 0, 48, kit=True, hum_ms=3, vel_jit=6)
cy = S.part('cym', 0, 58, kit=True, hum_ms=0, vel_jit=0)
rc = S.part('rcym', 0, 119, hum_ms=0, vel_jit=0)


def lo_root(cn, lo):
    r = chord(cn)['root']
    base = N(lo)
    return base + ((r - base) % 12)


def seg_at(bar, beat):
    for t_, d_, cn_ in chord_iter(S, chart, [bar]):
        if t_ - 1e-6 <= b(bar, beat) < t_ + d_ - 1e-6:
            return cn_
    raise ValueError((bar, beat))


def ost8(part, bars, lo='C2', tr=0, vmul=1.0, key=D_MIN, dur=0.42,
         vel=(104, 64, 72, 94, 64, 72, 92, 78), roots=None):
    """8th-note ostinato carrying the fate contour (root, fifth, minor-sixth sigh).
    The sigh is the minor sixth on minor chords (as in the horn motif), else the
    in-key sixth.  roots: optional {bar: midi} to force the register (rising bass)."""
    for t, d, cn in chord_iter(S, chart, bars):
        bar = int(t // S.bpb) + 1
        r = (roots[bar] if roots and bar in roots else lo_root(cn, lo)) + tr
        q = chord(cn)['q']
        minor = q.startswith('m') and not q.startswith('maj')
        nb = 8 if minor or ((r + 8) % 12) in key else 9
        pat = [0, 0, 0, 7, 0, 0, nb, 7]
        for k in range(int(round(d * 2))):
            part.note(t + 0.5 * k, dur, r + pat[k], int(vel[k] * vmul))


RUN_P = [12, 7, 12, 'T', 12, 7, 'T', 12]
RUN_V = [104, 66, 74, 96, 68, 76, 96, 80]


def run16(part, bars, lo='G4', tr=0, vmul=1.0, boost=0, upto=16):
    for bar in bars:
        for k in range(upto):
            cn = seg_at(bar, 0.25 * k)
            iv = RUN_P[k % 8]
            iv = 12 + third_of(chord(cn)) if iv == 'T' else iv
            part.note(b(bar) + 0.25 * k, 0.2, lo_root(cn, lo) + iv + tr, int((RUN_V[k % 8] + boost) * vmul))


def gallop(bars, boost=0, upto=4):
    for bar in bars:
        for beat in range(upto):
            cn = seg_at(bar, beat)
            r = lo_root(cn, 'C2')
            pitches = [r + (12 if beat in (1, 3) else 0), r, r + 12 if beat == 3 else r]
            for (o, d_), pch, vv in zip(((0.0, 0.42), (0.5, 0.2), (0.75, 0.2)), pitches, (116, 80, 90)):
                vco.note(b(bar, beat + o), d_, pch, vv + boost + (4 if beat == 0 else 0))


def bass4(bars, vel=(116, 98, 108, 98), boost=0, upto=4):
    for bar in bars:
        for beat in range(upto):
            cn = seg_at(bar, beat)
            r = lo_root(cn, 'G1')
            r = r + 12 if r < N('C2') else r
            cbm.note(b(bar, beat), 0.8, r, vel[beat] + boost)


def stabs(bars, vel=100, pos=((0, 0.5), (1.5, 0.5), (3, 0.5)), extra=None):
    for bar in bars:
        ps = list(pos) + (list(extra) if extra else [])
        for p_, d_ in ps:
            cn = seg_at(bar, p_)
            vs = voicing(cn, 3, N('C2'), N('Bb3'))
            r = lo_root(cn, 'G1')
            r = r + 12 if r < N('C2') else r
            vv = vel if p_ in (0, 1.5, 3) else vel - 12
            tb.chord(b(bar, p_), d_, vs, vv)
            tu.note(b(bar, p_), d_, r, vv - 6)


# ================================================================ A. 予兆 (1-8)
cbt.note(b(1), 16.1, N('D2'), 84)
cbt.expr([(b(1), 74), (b(3), 82), (b(5), 74), (b(7), 88), (b(8, 3.9), 76)])
lt.note(b(1), 16.1, N('A2'), 72)
lt.note(b(5), 8.1, N('D3'), 76)       # moves off A so the motif's A-Bb sigh below never rubs a held A
lt.note(b(7), 8.1, N('A3'), 78)       # ...and off D when the motif sighs Eb-D
lt.expr([(b(1), 48), (b(4), 70), (b(5), 62), (b(8, 3.9), 84)])
vt.note(b(4), 4.05, N('A5'), 60)
vt.note(b(5), 8.05, N('Bb5'), 62)
vt.note(b(7), 8.05, N('A5'), 62)
cho.chord(b(5), 8.1, [N('D4'), N('F4')], 60)
cho.chord(b(7), 8.1, [N('D4'), N('A4')], 62)
cho.expr([(b(5), 50), (b(8, 3.9), 64)])
wind_phrase(sh, S, b(1), "r:4 | A5:2 Bb5:1 A5:1 | G5:1.5 Eb5:.5 D5:2 | r:4", v=88, scoop=0.8, vib=0.15,
            vib_rate=4.4, exp_lo=72, exp_hi=110, fall=0.6)
for p_, v_ in ((vcs, 78), (bsn, 70)):
    p_.line(b(5), "D3:1.5 A2:.5 Bb2:1 A2:1 | D3:4 | D3:1.5 A2:.5 Bb2:1 A2:1 | Eb3:2 D3:2", v=v_, leg=1.04)
vcs.expr([(b(5), 84), (b(6), 100), (b(8, 3.9), 90)])
bsn.expr([(b(5), 88), (b(8, 3.9), 94)])

# ================================================================ B. 軍勢 (9-16)
ost8(vco, range(9, 17), lo='C2', tr=12, vmul=0.95)
ost8(vao, range(11, 17), lo='C3', tr=12, vmul=0.8)
for bar in range(9, 17):
    r = lo_root(chart[bar], 'G1')
    r = r + 12 if r < N('C2') else r
    cbp.note(b(bar), 1.0, r, 84 + (bar - 9) * 2)
    cbp.note(b(bar, 2), 1.0, r, 74 + (bar - 9) * 2)
vco.expr([(b(9), 88), (b(16, 3.9), 110)])
vao.expr([(b(11), 76), (b(16, 3.9), 100)])
hn.line(b(13), "D4:1.5 A3:.5 Bb3:1 A3:1 | D4:3 r:1 | F4:1.5 C4:.5 Db4:1 C4:1 | F4:2 E4:2", v=92, leg=1.03)
hn.expr([(b(13), 96), (b(14), 108), (b(15), 104), (b(16, 3.9), 116)])
pad(tb, S, NO5(chart), range(9, 17), 2, N('D2'), N('A3'), v=66)
tb.expr([(b(9), 72), (b(16, 3.9), 96)])
pad(cho, S, NO5(chart), range(9, 17), 3, N('C4'), N('F5'), v=66)
cho.expr([(b(9), 72), (b(16, 3.9), 96)])
for bar, nm in ((9, 'A5'), (11, 'A5'), (13, 'A5'), (15, 'Ab5'), (16, 'A5')):
    vt.note(b(bar), 8.05 if bar < 15 else 4.05, N(nm), 58)
vt.expr([(b(3), 60), (b(8), 72), (b(9), 62), (b(16, 3.9), 80)])

# ================================================================ C. 前哨 (17-24)
ost8(vco, range(17, 25), lo='C2', tr=12, vmul=0.92)
ost8(vao, range(17, 25), lo='C3', tr=12, vmul=0.84)
ost8(v2o, range(21, 25), lo='C4', tr=12, vmul=0.8)
run16(v1r, range(21, 25), lo='G4', vmul=0.86)
for bar in range(17, 25):
    for p_, vv in ((0, 104), (1.5, 92), (3, 98)):
        r = lo_root(seg_at(bar, p_), 'G1')
        cbm.note(b(bar, p_), 1.2, r + 12 if r < N('C2') else r, vv)
for p_ in (vco, vao, v2o, cbm):
    p_.expr([(b(17), 92), (b(24, 3.9), 116)])
v1r.expr([(b(21), 80), (b(24, 3.9), 112)])
hn.line(b(17), "D4:1.5 A3:.5 Bb3:1 A3:1 | D4:4 | F4:1.5 C4:.5 Db4:1 C4:1 | F4:4 |"
        "G4:1.5 D4:.5 Eb4:1 D4:1 | G4:4", v=98, leg=1.03)
hn.expr([(b(17), 96), (b(22, 3.9), 116)])
# conch-like call: one long horn tone that scoops up and wavers, then the clash
hora.note(b(23), 6.0, N('D4'), 116)
hora.bend(b(23) - 0.01, -1.6)
hora.bend_glide(b(23), b(23, 0.5), -1.6, 0.0, steps=10)
hora.vibrato(b(23, 0.6), b(23, 3.95), depth=0.12, rate=3.6, delay=0.3)
hora.bend_glide(b(24), b(24, 0.35), 0.0, -1.0, steps=8)          # D -> C# as the harmony turns to A
hora.vibrato(b(24, 0.4), b(24, 1.6), depth=0.1, rate=3.6, delay=0.15, base=-1.0)
hora.bend_glide(b(24, 1.6), b(24, 1.98), -1.0, -1.9, steps=8)
hora.bend(b(24, 2.05), 0.0)
hora.expr([(b(23), 70), (b(23, 1.0), 120), (b(24, 1.0), 116), (b(24, 1.95), 70)])
hn.line(b(23), "[Bb3,D4,F4]:4 | [A3,C#4,E4]:4", v=84, leg=1.02)
hn.expr([(b(23), 70), (b(24, 3.9), 112)])
pad(tb, S, NO5(chart), range(17, 25), 3, N('D2'), N('A3'), v=70)
tb.expr([(b(17), 76), (b(22), 96), (b(24, 3.9), 120)])
bassline(tu, S, {k: ['D2', 'D2', 'F2', 'F2', 'G2', 'G2', 'Bb1', 'A1'][k - 17] for k in range(17, 25)}, range(17, 25), v=74)
tu.expr([(b(17), 76), (b(24, 3.9), 116)])
pad(ch, S, NO5(chart), range(17, 25), 4, N('F3'), N('F5'), v=74)
ch.expr([(b(17), 60), (b(20), 84), (b(24, 3.9), 116)])
SH_PAT = [0, 0, 12, 0, 7, 0, 12, 7, 0, 0, 12, 0, 7, 12, 7, 12]
SH_VEL = [104, 66, 84, 70, 96, 66, 84, 74, 100, 66, 84, 70, 96, 80, 76, 88]
for t, d, cn in chord_iter(S, chart, range(21, 25)):
    r = lo_root(cn, 'F3')
    for k in range(int(d * 4)):
        sm.note(t + 0.25 * k, 0.3, r + SH_PAT[k], SH_VEL[k])
sm.expr([(b(21), 84), (b(24, 3.9), 118)])
gliss(hp, b(24, 3), 0.95, scale_run(D_HARM, N('C#3'), N('D6')), v=74, ring=1.6)

# ================================================================ D/E. 激突 (25-40)
hn.line(b(25), THEME, v=116, leg=1.02)
hn.line(b(33), THEME, v=110, leg=1.02)
hn.expr([(b(25), 122), (b(32, 3.9), 122), (b(33), 118), (b(40, 3.9), 116)])
tp.line(b(33), THEME, v=108, leg=1.02)
tp.expr([(b(33), 112), (b(40, 3.9), 116)])
tp.cc(b(25) - 0.1, 11, 112)
tp.chord(b(25), 1.0, [N('A4'), N('D5')], 104)
tp.chord(b(29), 1.0, [N('A4'), N('D5')], 104)
v1.line(b(25), "A5:4 | C6:4 | Bb5:4 | A5:4 | A5:4 | D6:4 | Bb5:2 A5:2 | A5:4", v=90, leg=1.04)
v1.line(b(33), THEME, v=104, leg=1.04, tr=12)
v1.expr([(b(25), 100), (b(32, 3.9), 108), (b(33), 116), (b(40, 3.9), 118)])
ost8(vco, range(25, 41), lo='C2', tr=12, vmul=1.0)
ost8(vao, range(25, 33), lo='C3', tr=12, vmul=0.92)
ost8(v2o, range(25, 33), lo='C4', tr=12, vmul=0.86)
run16(vao, range(33, 41), lo='G3', tr=-12, vmul=0.94)
run16(v2o, range(33, 41), lo='G3', vmul=0.9)
for p_ in (vco, vao, v2o, cbm):
    p_.expr([(b(25), 116), (b(40, 3.9), 122)])
for bar in range(25, 41):
    for p_, vv in ((0, 112), (1.5, 98), (3, 104)):
        r = lo_root(seg_at(bar, p_), 'G1')
        cbm.note(b(bar, p_), 1.2, r + 12 if r < N('C2') else r, vv)
stabs(range(25, 33), vel=90)
stabs(range(33, 41), vel=104, extra=((3.5, 0.3),))
tb.expr([(b(25), 112), (b(40, 3.9), 120)])
tu.expr([(b(25), 108), (b(40, 3.9), 116)])
pad(ch, S, chart, range(25, 41), 4, N('A3'), N('D5'), v=86)
ch.expr([(b(25), 100), (b(32, 3.9), 108), (b(33), 112), (b(40, 3.9), 116)])
gliss(hp, b(32, 3), 0.95, scale_run(D_MIN, N('D3'), N('D6')), v=76, ring=1.6)

# ================================================================ F. 寝返り (41-48)
t_ = b(41)
for nm, d_ in (('D2', 4), ('Eb2', 4), ('D2', 4), ('Db2', 4), ('D2', 4), ('Eb2', 4), ('A1', 8)):
    cbs.note(t_, d_ + 0.1, N(nm), 78 if nm != 'A1' else 84)     # bass sighs around D: Eb/Db neighbours
    t_ += d_
cbs.expr([(b(41), 64), (b(46, 3.9), 70), (b(47), 72), (b(48, 3.9), 108)])
for t, d, cn in chord_iter(S, chart, range(41, 47)):
    lt.chord(t, d + 0.05, voicing(cn, 2, N('D3'), N('D4')), 66)
lt.expr([(b(41), 72), (b(46, 3.9), 84)])
pad(cho, S, chart, range(41, 47), 3, N('C4'), N('C5'), v=58)
cho.expr([(b(41), 62), (b(46, 3.9), 76)])
wind_phrase(sh, S, b(41), LAMENT, v=92, scoop=0.7, vib=0.15, vib_rate=4.6, exp_lo=80, exp_hi=116, fall=0.45)
for t, d, cn in chord_iter(S, chart, range(41, 45)):
    arp(ko, t, d, cn, v=64, lo=N('A3'), ring=1.4)
for t, d, cn in chord_iter(S, chart, range(45, 47)):
    arp(ko, t, d, cn, v=68, pat=(0, 7, 12, 'T', 12, 7, 12, 'T'), step=0.25, lo=N('A3'), ring=1.0)
sm.expr([(b(42, 3.5), 92), (b(46, 3.9), 104)])
for bar in (43, 44, 45, 46):
    r = lo_root(chart[bar], 'F3')
    sm.note(b(bar), 0.4, r, 92)
    sm.note(b(bar, 2.5), 0.4, r + 12, 80)
tb.line(b(45), "G3:1.5 D3:.5 Eb3:1 D3:1 | Eb3:4", v=70, leg=1.03)
tb.expr([(b(41), 70), (b(46, 3.9), 84)])
ost8(vco, [47, 48], lo='C2', tr=12, vmul=0.9)
vco.expr([(b(47), 60), (b(48, 3.9), 116)])

# ================================================================ G. 迫り上がり (49-56)
RISE = {49: N('D2'), 50: N('Eb2'), 51: N('F2'), 52: N('G2'), 53: N('A2'), 54: N('Bb2'), 55: N('C3')}
for bar in range(49, 56):
    for k in range(8):
        cbm.note(b(bar) + 0.5 * k, 0.42, RISE[bar], 96 + (bar - 49) * 3 + (8 if k == 0 else 0))
for k in range(6):
    cbm.note(b(56) + 0.5 * k, 0.42, N('C#3'), 118)
ost8(vco, range(49, 56), roots=RISE, tr=12, vmul=1.0)
for k in range(6):
    vco.note(b(56) + 0.5 * k, 0.42, N('A2') + (12 if k % 2 else 0), 112)
run16(vao, range(49, 56), lo='G3', tr=-12, vmul=0.9)
run16(v2o, range(49, 56), lo='G3', vmul=0.9)
run16(v1r, range(53, 56), lo='G4', vmul=0.9)
for p_, base in ((vao, 'A3'), (v2o, 'A4'), (v1r, 'A4')):
    for k, iv in enumerate([0, 4, 7, 12, 7, 4, 7, 12, 16, 12, 16, 19]):
        p_.note(b(56) + 0.25 * k, 0.2, N(base) + iv, 100 + k * 2)
for p_ in (vco, vao, v2o, cbm, v1r):
    p_.expr([(b(49), 96), (b(55, 3.9), 124)])
MOTIF = [(0, 1.5, 0), (1.5, 0.5, -5), (2, 1, -4), (3, 1, -5)]
for bar in range(49, 53):
    r = lo_root(chart[bar], 'D4')
    for o, d_, iv in MOTIF:
        hn.note(b(bar, o), d_ * 1.02, r + iv, 104 + (bar - 49) * 3)
        tb.note(b(bar, o), d_ * 1.02, r + iv - 12, 98 + (bar - 49) * 3)
for bar in range(53, 56):
    r = lo_root(chart[bar], 'A3')
    for o, d_, iv in MOTIF:
        hn.note(b(bar, o), d_ * 1.02, r + iv + 12, 112)
        tb.note(b(bar, o), d_ * 1.02, r + iv, 108)
    rt = lo_root(chart[bar], 'G4')
    for k, o in enumerate((0, 0.5, 0.75, 1.5, 2, 2.5, 2.75, 3.5)):
        tp.note(b(bar, o), 0.22, rt + (7 if k in (3, 7) else 0), 98 + 4 * (bar - 53) + (8 if k in (0, 4) else 0))
tp.line(b(56), "A4:.5 A4:.25 A4:.25 C#5:.5 E5:.5 A5:1", v=118)
hn.line(b(56), "[E4,A4,C#5]:3", v=114)
tb.line(b(56), "[A2,E3,C#4]:3", v=114)
tu.line(b(56), "C#2:3", v=110)
tb.expr([(b(49), 104), (b(56, 2.9), 124)])
hn.expr([(b(49), 104), (b(56, 2.9), 124)])
tp.expr([(b(53), 108), (b(56, 2.9), 124)])
tu.expr([(b(49), 100), (b(56, 2.9), 120)])
pad(ch, S, NO5(chart), range(49, 56), 4, N('F3'), N('F5'), v=84)
ch.chord(b(56), 3.0, voicing('A', 4, N('A3'), N('E5')), 104)
ch.expr([(b(49), 80), (b(56, 2.9), 122)])

# ================================================================ H/I. 総力戦 (57-72)
for st_, tr_ in ((57, 0), (65, 3)):
    hn.line(b(st_), THEME, v=114, leg=1.02, tr=tr_ - (12 if tr_ else 0))
    tp.line(b(st_), THEME, v=116, leg=1.02, tr=tr_)
    v1.line(b(st_), THEME, v=110, leg=1.04, tr=tr_ + 12)
    v2.line(b(st_), THEME, v=104, leg=1.04, tr=tr_ + 12)
wind_phrase(fl, S, b(65), THEME, v=88, tr=15, vib=0.05, exp_lo=104, exp_hi=118, long_beats=1.9)
hn.expr([(b(57), 124), (b(72, 3.9), 124)])
tp.expr([(b(57), 124), (b(72, 3.9), 124)])
v1.expr([(b(57), 122), (b(72, 3.9), 124)])
v2.expr([(b(57), 116), (b(72, 3.9), 120)])
run16(vao, range(57, 65), lo='G3', tr=-12, vmul=0.96)
run16(vao, range(65, 73), lo='G3', tr=-12, vmul=1.0, boost=4)
vao.expr([(b(57), 120), (b(72, 3.9), 124)])
gallop(range(57, 73), boost=4)
vco.expr([(b(57), 120), (b(72, 3.9), 124)])
bass4(range(57, 73))
cbm.expr([(b(57), 122), (b(72, 3.9), 124)])
FATE1 = [('D3', 4), ('A2', 4), ('Bb2', 4), ('A2', 4), ('D3', 4), ('Bb2', 4), ('G2', 2), ('A2', 2), ('D3', 4)]
FATE2 = [('F3', 4), ('C3', 4), ('Db3', 4), ('C3', 4), ('F3', 4), ('Db3', 4), ('Bb2', 2), ('C3', 2), ('F3', 4)]
for st_, fate in ((57, FATE1), (65, FATE2)):
    t = b(st_)
    for nm, d_ in fate:
        tb.chord(t, d_ * 0.98, [N(nm), N(nm) + 12], 112)
        tu.note(t, d_ * 0.98, N(nm) - 12, 108)
        chl.chord(t, d_ * 1.0, [N(nm), N(nm) + 12], 96)        # men's voices chant the fate line
        t += d_
tb.expr([(b(57), 124), (b(72, 3.9), 124)])
tu.expr([(b(57), 120), (b(72, 3.9), 120)])
chl.expr([(b(57), 112), (b(72, 3.9), 116)])
pad(ch, S, chart, range(57, 73), 4, N('A3'), N('F5'), v=96)
ch.expr([(b(57), 112), (b(65), 118), (b(72, 3.9), 120)])
gliss(hp, b(64, 3), 0.95, scale_run(F_HARM, N('F3'), N('F6')), v=80, ring=1.6)
for bar in range(57, 73):
    for k in (0, 2):
        cn = seg_at(bar, k)
        r = N('D4') + ((chord(cn)['root'] - N('D4')) % 12)
        ko.chord(b(bar, k), 1.2, [r, r + 12], 92)

# ================================================================ J. 決着 (73-80)
tp.line(b(73), "F4:1.5 C4:.5 Db4:1 C4:1 | r:4 | Bb4:1.5 F4:.5 Gb4:1 F4:1 | C5:.5 C5:.25 C5:.25 E5:1 G5:2", v=124)
hn.line(b(73), "F4:1.5 C4:.5 Db4:1 C4:1 | r:4 | Bb3:1.5 F3:.5 Gb3:1 F3:1 | r:4", v=124)
tb.line(b(74), "Ab3:1.5 F3:.5 Db3:2", v=114)
chl.line(b(74), "[Ab3,Db4]:1.5 [F3,Ab3]:.5 [Db3,F3]:2", v=104)
tb.line(b(76), "C3:1.5 G2:.5 Ab2:1 G2:1", v=114)
tu.line(b(76), "C2:1.5 G1:.5 Ab1:1 G1:1", v=110)
run16(vao, range(73, 78), lo='G3', tr=-12, vmul=0.92)
run16(v2o, range(73, 78), lo='G3', vmul=0.92)
for p_, base in ((vao, 'A3'), (v2o, 'A4'), (v1r, 'A4')):          # A phrygian-dominant scale up to Bb
    for k, iv in enumerate([0, 1, 4, 5, 7, 8, 11, 12, 13, 16, 17, 19, 20, 23, 24, 25]):
        p_.note(b(78) + 0.25 * k, 0.2, N(base) + iv, 98 + k * 2)
gallop(range(73, 79), boost=6)
bass4(range(73, 79), boost=4)
for bar in (77,):
    tb.chord(b(bar), 3.9, voicing('Bb', 3, N('Bb2'), N('F4')), 112)
    hn.chord(b(bar), 3.9, [N('D4'), N('F4'), N('Bb4')], 112)
    tp.chord(b(bar), 3.9, [N('F4'), N('Bb4'), N('D5')], 110)
    tu.note(b(bar), 3.9, N('Bb1'), 110)
for p_, vs, vv in ((tb, [N('A2'), N('E3'), N('C#4')], 116), (hn, [N('E4'), N('A4'), N('C#5')], 116),
                   (tp, [N('A4'), N('C#5'), N('E5')], 116), (tu, [N('A1')], 112)):
    p_.chord(b(78), 3.9, vs, vv)
pad(ch, S, NO5(chart), range(73, 79), 4, N('F3'), N('F5'), v=92)
pad(v1, S, chart, range(73, 79), 2, N('A5'), N('A6'), v=96)
# bar 79: three tutti blows (3+3+2), bar 80: the final chord with the gong
HITS = [(0, 1.2), (1.5, 1.2), (3, 0.5)]
dm_hi = [N('D5'), N('F5'), N('A5'), N('D6')]
for p_, d_ in HITS:
    for part_, ps, vv in ((tp, [N('D5'), N('F5'), N('A5')], 120), (hn, [N('D4'), N('A4'), N('D5')], 118),
                          (tb, [N('D3'), N('A3'), N('F4')], 118), (tu, [N('D2')], 116), (v1, dm_hi, 116),
                          (v2, [N('A4'), N('D5'), N('F5')], 112), (ch, [N('D4'), N('F4'), N('A4'), N('D5')], 110),
                          (chl, [N('D3'), N('A3')], 108), (cbm, [N('D2')], 120), (vco, [N('D3')], 118)):
        part_.chord(b(79, p_), d_, ps, vv)
for p_, base in ((vao, 'A3'), (v2o, 'A4')):
    for k, nm in enumerate(['A', 'Bb', 'B', 'C#']):
        p_.note(b(79, 3.5) + 0.125 * k, 0.12, N(nm + base[-1]), 104 + 4 * k)
for part_, ps, vv in ((tp, [N('D5'), N('F5'), N('A5')], 124), (hn, [N('D4'), N('A4'), N('D5'), N('F5')], 122),
                      (tb, [N('D3'), N('A3'), N('F4')], 122), (tu, [N('D2')], 120), (v1, dm_hi, 120),
                      (v2, [N('A4'), N('D5'), N('F5')], 116), (ch, [N('D4'), N('F4'), N('A4'), N('D5')], 116),
                      (chl, [N('D3'), N('A3')], 112), (cbm, [N('D2')], 124), (vco, [N('D3')], 122),
                      (vao, [N('D4')], 118)):
    part_.chord(b(80), 2.0, ps, vv)
for p_ in (tp, hn, tb, tu, v1, v2, ch, chl):
    p_.expr([(b(78, 3.9), 124), (b(79), 124), (b(80, 1.5), 124), (b(80, 2.2), 70)])

# ================================================================ K. 余燼 (81-88)
cbs.note(b(81), 12.1, N('D2'), 70)
cbs.note(b(84), 4.1, N('A1'), 70)
cbs.note(b(85), 16.1, N('D2'), 68)
cbs.expr([(b(81), 78), (b(84), 72), (b(88, 3.9), 70)])
pad(cho, S, chart, range(81, 89), 3, N('C4'), N('C5'), v=58)
cho.expr([(b(81), 64), (b(84), 76), (b(88, 3.9), 72)])
wind_phrase(sh, S, b(81), "D5:2 C5:1 A4:1 | Bb4:1.5 A4:.5 F4:2 | G4:2 Bb4:1 D5:1 | A4:4", v=84, scoop=0.6,
            vib=0.15, vib_rate=4.3, exp_lo=66, exp_hi=104, fall=0.5, end_exp=46)
for t, d, cn in chord_iter(S, chart, range(81, 85)):
    arp(hp, t, d, cn, v=58, pat=(0, 7, 12, 'T', 19, 'T', 12, 7), lo=N('F2'), ring=1.4, accent=4)
for t, d, cn in chord_iter(S, chart, range(85, 89)):
    arp(ko, t, d, cn, v=70, pat=(0, 7, 12, 7), step=1.0, lo=N('A3'), ring=1.8)
cbt.note(b(85), 16.05, N('D2'), 74)
cbt.expr([(b(85), 64), (b(88, 3.9), 76)])
vt.note(b(85), 4.05, N('A5'), 56)
vt.note(b(86), 4.05, N('Bb5'), 56)
vt.note(b(87), 8.05, N('A5'), 56)
vt.expr([(b(81), 60), (b(88, 3.9), 72)])
for p_ in (hp, ko):
    p_.expr([(b(81), 104), (b(88, 3.9), 100)])

# ================================================================ percussion
BIG, MID, SMALL = N('D3'), N('A3'), N('F4')


def heartbeat(bar, v=62):
    tk.note(b(bar), 1.0, BIG, v)
    tk.note(b(bar, 0.5), 0.8, BIG, int(v * 0.72))
    kit.note(b(bar), 1.0, 87, int(v * 0.8))


def stalk(bar, v=1.0):
    tk.note(b(bar), 1.0, BIG, int(86 * v))
    tk.note(b(bar, 2.5), 0.8, BIG, int(72 * v))
    tk.note(b(bar, 3.5), 0.5, MID, int(62 * v))
    kit.note(b(bar), 1.0, 87, int(72 * v))


def build(bar, v=1.0):
    for p_, vv in ((0, 106), (1.5, 92), (3, 98)):
        tk.note(b(bar, p_), 1.0, BIG, int(vv * v))
    for p_ in (2, 3.5):
        tk.note(b(bar, p_), 0.5, MID, int(80 * v))
    for k in range(8):
        tk.note(b(bar) + 0.5 * k, 0.3, SMALL, int(50 * v))
    kit.note(b(bar), 1.0, 87, int(96 * v))


def groove(bar, v=1.0, fill=False):
    st = lambda k: b(bar) + k * 0.25
    for k in (0, 6, 12):
        tk.note(st(k), 1.0, BIG, int((118 if k == 0 else 104) * v))
    kit.note(st(0), 1.0, 87, int(104 * v))
    for k in (3, 9, 10, 14):
        tk.note(st(k), 0.5, MID, int(88 * v))
        kit.note(st(k), 0.5, 86, int(78 * v))
    for k in (2, 4, 8, 11, 13, 15):
        tk.note(st(k), 0.3, SMALL, int(60 * v))
    if fill:
        for k in range(8, 16):
            tk.note(st(k), 0.25, MID if k < 12 else SMALL, int((70 + 5 * (k - 8)) * v))


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


SN_V = [96, 40, 52, 64, 88, 40, 52, 64, 96, 40, 52, 64, 88, 52, 70, 84]


def snare16(bar, boost=0, upto=16):
    for k in range(upto):
        sn.note(b(bar) + 0.25 * k, 0.2, 38, max(20, SN_V[k] + boost))


def snare_roll(t, d, v0, v1):
    n = int(d / 0.125)
    for k in range(n):
        sn.note(t + 0.125 * k, 0.12, 38, int(v0 + (v1 - v0) * k / max(1, n - 1)))


for bar in range(1, 9):
    heartbeat(bar, 70 + (bar - 1) * 2)
for bar in range(9, 17):
    stalk(bar, 0.86 + 0.02 * (bar - 9))
for bar in range(17, 25):
    build(bar, 0.84 + 0.025 * (bar - 17))
for k in range(8, 16):
    tk.note(b(24) + 0.25 * k, 0.25, MID if k < 12 else SMALL, 76 + 5 * (k - 8))
for bar in range(25, 41):
    groove(bar, 0.96 if bar < 33 else 1.0, fill=(bar % 4 == 0))
for bar in range(41, 47):
    heartbeat(bar, 66)
for k in range(8):
    tk.note(b(47) + 0.5 * k, 0.4, MID, 60 + 2 * k)
for k in range(16):
    tk.note(b(48) + 0.25 * k, 0.25, MID if k < 8 else SMALL, 66 + 3 * k)
for bar in range(49, 56):
    st = lambda k, bar=bar: b(bar) + 0.25 * k
    for k in (0, 4, 8, 12):
        tka.note(st(k), 1.0, BIG, 96 + (bar - 49) * 4)
    for k in range(16):
        tka.note(st(k), 0.2, SMALL, (64 if k % 4 == 0 else 44) + (bar - 49) * 4)
    kit.note(st(0), 1.0, 87, 92 + (bar - 49) * 3)
for k in range(12):
    tka.note(b(56) + 0.25 * k, 0.25, MID if k < 8 else BIG, 96 + 2 * k)
for bar in range(57, 73):
    assault(bar, 6 if bar >= 65 else 0, fill=(bar in (60, 64, 68, 72)))
for bar in range(73, 79):
    assault(bar, 6, fill=(bar == 78))
for p_ in (0, 1.5, 3):
    tka.note(b(79, p_), 1.0, BIG, 124)
    kit.note(b(79, p_), 1.0, 87, 118)
for k, v in ((14, 96), (15, 110)):
    tka.note(b(79) + 0.25 * k, 0.25, SMALL, v)
tka.note(b(80), 2.0, BIG, 127)
kit.note(b(80), 2.0, 87, 124)
kit.note(b(80), 2.0, 36, 120)
for bar in range(85, 89):
    heartbeat(bar, 72 + (bar - 85) * 2)
for bar in list(range(25, 41, 2)) + list(range(57, 79)):
    kit.note(b(bar), 1.5, 36, 92)

for bar in range(51, 56):
    snare16(bar, boost=-30 + (bar - 51) * 8)
snare_roll(b(56), 3.0, 70, 112)
for bar in range(57, 79):
    snare16(bar, boost=0 if bar < 65 else 8)
for p_ in (0, 1.5, 3):
    sn.note(b(79, p_), 0.3, 38, 114)
snare_roll(b(79, 3.5), 0.5, 90, 116)
sn.note(b(80), 0.5, 38, 118)
snare_roll(b(24, 2), 2.0, 40, 100)

# timpani
TIMP = {'Dm': 'D2', 'F': 'F2', 'Gm': 'G2', 'A': 'A2', 'Asus4': 'A2', 'Csus4': 'C2', 'Bb': 'F2', 'Eb': 'Eb2', 'C': 'C2', 'Fm': 'F2',
        'Ab': 'Ab2', 'Bbm': 'F2', 'Db': 'Db2', 'A7': 'A2', 'A/C#': 'A2', 'Eb/D': 'D2', 'D5': 'D2'}
roll(ti, b(4), 4.0, N('D2'), 18, 38, spb=spb, rate_s=0.07, shape='swell')
roll(ti, b(8), 4.0, N('D2'), 22, 56, spb=spb, rate_s=0.07)
for bar in (9, 11, 13):
    ti.note(b(bar), 1.5, N('D2'), 56)
ti.note(b(15), 1.5, N('F2'), 62)
roll(ti, b(16), 4.0, N('A2'), 30, 76, spb=spb, rate_s=0.065)
for bar in (17, 19, 21, 23):
    ti.note(b(bar), 1.2, N(TIMP[chart[bar]]), 84)
roll(ti, b(24), 4.0, N('A2'), 50, 110, spb=spb, rate_s=0.06)
for bar in range(25, 41):
    nm = TIMP[seg_at(bar, 0)]
    ti.note(b(bar), 1.0, N(nm), 106)
    if bar >= 33:
        ti.note(b(bar, 1.5), 0.5, N(nm), 90)
        ti.note(b(bar, 3), 0.5, N(TIMP[seg_at(bar, 3)]), 96)
roll(ti, b(47), 8.0, N('A2'), 28, 104, spb=spb, rate_s=0.06)
for bar in range(49, 56):                       # the timpani climb with the bass: D Eb F G A Bb C
    for k in range(8):
        ti.note(b(bar) + 0.5 * k, 0.45, RISE[bar], 72 + (bar - 49) * 5 + (8 if k == 0 else 0))
roll(ti, b(56), 3.0, N('A2'), 90, 120, spb=spb, rate_s=0.055)
for bar in range(57, 73):
    for k in range(4):
        ti.note(b(bar, k), 0.8, N(TIMP[seg_at(bar, k)]), (112 if k == 0 else 96) + (4 if bar >= 65 else 0))
    if bar % 4 == 0:
        ti.note(b(bar, 3.5), 0.25, N(TIMP[seg_at(bar, 3.5)]), 96)
        ti.note(b(bar, 3.75), 0.25, N(TIMP[seg_at(bar, 3.75)]), 104)
for bar in range(73, 77):
    for p_ in (0, 1.5, 3):
        ti.note(b(bar, p_), 0.8, N(TIMP[seg_at(bar, p_)]), 110)
roll(ti, b(77), 4.0, N('F2'), 80, 110, spb=spb, rate_s=0.055)
roll(ti, b(78), 4.0, N('A2'), 90, 124, spb=spb, rate_s=0.05)
for p_ in (0, 1.5, 3):
    ti.note(b(79, p_), 1.0, N('D2'), 122)
ti.note(b(80), 2.0, N('D2'), 127)
roll(ti, b(88), 4.0, N('D2'), 26, 62, spb=spb, rate_s=0.07)

# cymbals
for bar, note_, v in ((25, 72, 112), (29, 74, 88), (33, 72, 118), (37, 74, 92), (57, 72, 124), (61, 74, 102),
                      (65, 72, 124), (69, 72, 110), (73, 74, 100), (77, 74, 96), (80, 72, 127)):
    cy.note(b(bar), 6, note_, v)
for bar in (24, 32, 55, 64, 78):
    rc.note(b(bar, 4 - 2.06 / spb), 2.6, 60, 92 if bar != 78 else 108)

# ================================================================ synthesized layers
gong = synth_gong(f0=78, dur=10.0, bright=1.1, seed=21)
place_layer(S, 'gong', b(1), gong, dict(gain=-22, rev=-8, hp=70))
place_layer(S, 'gong', b(25), gong, dict(gain=-12, rev=-8, hp=70))
place_layer(S, 'gong', b(57), gong, dict(gain=-8, rev=-8, hp=70))
place_layer(S, 'gong', b(65), gong, dict(gain=-12, rev=-8, hp=70))
place_layer(S, 'gong', b(80), gong, dict(gain=-7, rev=-7, hp=65))
rg = synth_gong(f0=70, dur=4.0, bright=1.3, seed=22)[::-1].copy()
rg *= np.linspace(0, 1, len(rg))[:, None] ** 1.5
for bar, g_ in ((5, -18), (49, -15)):
    place_layer(S, 'revgong', b(bar) - len(rg) / SR / spb, rg, dict(gain=g_, rev=-10, hp=80))
bell = synth_bell(f0=92.0, dur=11.0, seed=23)
place_layer(S, 'bell', b(81), bell, dict(gain=-14, rev=-6, hp=60))
place_layer(S, 'bell', b(83), bell, dict(gain=-18, rev=-6, hp=60))
th = synth_thump(f_hi=100, f_lo=48, decay=0.42, dur=1.5, seed=24)
for bar in [25, 33] + list(range(57, 73)):
    place_layer(S, 'thump', b(bar), th, dict(gain=-21 if bar not in (57, 65) else -16, rev=-16, hp=42))
for p_ in (0, 1.5, 3):
    place_layer(S, 'thump', b(79, p_), th, dict(gain=-18, rev=-16, hp=42))
place_layer(S, 'thump', b(80), th, dict(gain=-13, rev=-14, hp=40))

MIX = {
    'cbtrem': dict(gain=3, pan=0.4, width=0.6, rev=-11, lp=4500),
    'cbs': dict(gain=0, pan=0.4, width=0.6, rev=-11, lp=4500),
    'ltrem': dict(gain=1, pan=0.3, width=0.6, rev=-10, hp=40),
    'vtrem': dict(gain=-5, pan=-0.3, width=0.8, rev=-8, hp=300),
    'vcs': dict(gain=4, pan=0.3, width=0.6, rev=-10, hp=45),
    'bsn': dict(gain=1, pan=0.12, width=0.4, rev=-9, hp=60),
    'cbpizz': dict(gain=2, pan=0.42, width=0.6, rev=-11, hp=35),
    'vc': dict(gain=4, pan=0.3, width=0.6, rev=-13, hp=45),
    'va': dict(gain=2, pan=0.12, width=0.6, rev=-12, hp=110),
    'vln2': dict(gain=1, pan=-0.2, width=0.7, rev=-12, hp=150),
    'vln1run': dict(gain=2, pan=-0.36, width=0.7, rev=-12, hp=200),
    'cb': dict(gain=1, pan=0.42, width=0.6, rev=-14, lp=4500),
    'vln1': dict(gain=2, pan=-0.38, width=0.7, rev=-9, hp=160),
    'vln2leg': dict(gain=0, pan=-0.2, width=0.7, rev=-9, hp=140),
    'hn': dict(gain=4, pan=-0.12, width=0.5, rev=-8, hp=70),
    'hora': dict(gain=6, pan=-0.05, width=0.4, rev=-6, hp=70),
    'tpt': dict(gain=2, pan=0.15, width=0.4, rev=-8, hp=150, peq=[(2500, 2.0, 1.0)]),
    'tbn': dict(gain=-5, pan=0.3, width=0.5, rev=-10, hp=55),
    'tuba': dict(gain=-8, pan=0.38, width=0.4, rev=-12, lp=2500),
    'fl': dict(gain=-2, pan=-0.05, width=0.4, rev=-8, hp=300),
    'choir': dict(gain=-4, pan=0.0, width=1.0, rev=-6, hp=120),
    'choirlo': dict(gain=-5, pan=0.05, width=0.9, rev=-7, hp=70),
    'oohs': dict(gain=1, pan=0.0, width=1.0, rev=-5, hp=120),
    'shaku': dict(gain=3, pan=0.1, width=0.4, rev=-6, hp=200),
    'koto': dict(gain=-1, pan=-0.22, width=0.7, rev=-9, hp=120, lp=11000),
    'shami': dict(gain=-3, pan=-0.25, width=0.6, rev=-11, hp=150),
    'harp': dict(gain=-3, pan=-0.45, width=0.7, rev=-8, hp=60),
    'timp': dict(gain=-6, pan=0.1, width=0.5, rev=-12, hp=48),
    'taiko': dict(gain=-3, pan=0.0, width=0.7, rev=-12, hp=55, peq=[(1800, 2.0, 1.0)]),
    'taiko_as': dict(gain=2, pan=0.0, width=0.7, rev=-14, hp=55, peq=[(1800, 2.0, 1.0)]),
    'tkit': dict(gain=-5, pan=0.0, width=0.8, rev=-12, hp=55),
    'snare': dict(gain=3, pan=0.08, width=0.6, rev=-15, hp=150),
    'cym': dict(gain=-8, pan=0.05, width=1.0, rev=-11, hp=300),
    'rcym': dict(gain=-10, pan=0.0, width=1.0, rev=-12, hp=300),
}

if __name__ == '__main__':
    import time
    rdir = os.path.join(WORK, 'render', 'wakeme')
    t0 = time.time()
    only = sys.argv[1].split(',') if len(sys.argv) > 1 and sys.argv[1] != 'all' else None
    if '--mixonly' not in sys.argv:
        os.makedirs(os.path.join(WORK, 'out'), exist_ok=True)
        S.render(rdir, jobs=2, only=only)
        print('render', round(time.time() - t0, 1), 's')
    ir = make_ir(rt_low=2.7, rt_mid=2.3, rt_high=1.3, length=3.8, predelay=0.026, seed=41, lp=11500)
    loop, info, _ = mix_song(S, rdir, MIX, ir, rev_return_db=-1.5, target_lufs=-16.0,
                             master=dict(level=dict(strength=0.22, win=3.0, smooth=5.0),
                                         eq=dict(ls=(90, -2.5), peq=[(400, -1.5, 0.9)], hs=(5000, 3.0)),
                                         comp=dict(thr_db=-19, ratio=2.0, att=0.015, rel=0.2)),
                             out_wav=os.path.join(WORK, 'out', 'wakeme_loop.wav'))
    print('total', round(time.time() - t0, 1), 's')
