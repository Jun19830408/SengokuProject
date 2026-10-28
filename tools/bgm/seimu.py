# -*- coding: utf-8 -*-
"""政務フェーズ BGM 「天下静謐」  75 BPM, 4/4, 40 bars (=128 s), D minor / minyo pentatonic."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

S = Song('seimu', bpm=75, bars=40)
b = S.b

chart = {1: 'D5', 2: 'D5', 3: 'Bb/D', 4: ['C/D', 'Dm'],
         5: 'Dm', 6: 'Bb', 7: 'F/A', 8: 'C', 9: 'Dm', 10: 'F', 11: ['Bb', 'C'], 12: 'Dm',
         13: 'Dm', 14: 'Bb', 15: 'F/A', 16: 'C', 17: 'Dm', 18: 'F', 19: ['Bb', 'C'], 20: ['Dm', 'C'],
         21: 'F', 22: 'C/E', 23: 'Dm7', 24: 'Bb', 25: 'Gm7', 26: 'F/A', 27: 'Bb', 28: [('Csus4', 3), ('C', 1)],
         29: 'Dm', 30: 'Bb', 31: 'F/A', 32: 'C', 33: 'Dm', 34: 'F', 35: ['Bb', 'C'], 36: 'Dm',
         37: 'Bb', 38: 'C', 39: 'Dm', 40: 'D5'}

BASS = {1: 'D2', 2: 'D2', 3: 'D2', 4: 'D2',
        5: 'D2', 6: 'Bb1', 7: 'A1', 8: 'C2', 9: 'D2', 10: 'F2', 11: ['Bb1', 'C2'], 12: 'D2',
        13: 'D2', 14: 'Bb1', 15: 'A1', 16: 'C2', 17: 'D2', 18: 'F2', 19: ['Bb1', 'C2'], 20: ['D2', 'C2'],
        21: 'F2', 22: 'E2', 23: 'D2', 24: 'Bb1', 25: 'G1', 26: 'A1', 27: 'Bb1', 28: 'C2',
        37: 'Bb1', 38: 'C2', 39: 'D2', 40: 'D2'}
for k in range(29, 37):
    BASS[k] = BASS[k - 24]

# ---------------------------------------------------------------- themes (original)
MEL_A = ("A4:1 D5:1.5 C5:.5 D5:1 | F5:1.5 G5:.5 F5:1 D5:1 | C5:1.5 D5:.5 C5:1 A4:1 | G4:3 A4:.5 C5:.5 |"
         "D5:2 F5:1 G5:1 | A5:1.5 G5:.5 F5:1 D5:1 | F5:1.5 D5:.5 C5:1 A4:.5 C5:.5 | D5:4")
MEL_B1 = "A4:1.5 C5:.5 F5:2 | E5:1.5 D5:.5 C5:2 | D5:1.5 F5:.5 A5:1 G5:1 | F5:3 D5:1"
MEL_B2 = "D5:1.5 F5:.5 G5:2 | A5:1.5 G5:.5 F5:1 C5:1 | D5:1 F5:1 G5:1 Bb5:1 | G5:2 F5:1 E5:1"
HORN_CALL = "A3:1 D4:2 C4:.5 A3:.5 | D4:3 r:1"
HORN_A2 = "F4:4 | D4:2 F4:2 | C4:4 | E4:4 | F4:2 A4:2 | C5:2 A4:2 | F4:2 E4:2 | D4:2 E4:2"
CELLO_A2 = ("D3:1 F3:1 A3:2 | Bb3:2 A3:1 F3:1 | A3:2 G3:1 F3:1 | E3:2 G3:2 | A3:2 F3:1 D3:1 |"
            "F3:2 A3:1 C4:1 | D4:2 C4:2 | A3:2 G3:2")
CELLO_B = "A3:4 | G3:4 | F3:4 | F3:4 | Bb3:4 | A3:4 | D4:4 | C4:4"
SHAKU_CODA = "r:4 | G4:1 A4:1 C5:2 | A4:1 D5:1.5 C5:.5 D5:1 | A4:4"
MINYO = {pc('D'), pc('F'), pc('G'), pc('A'), pc('C')}

# ---------------------------------------------------------------- parts
cb = S.part('cb', 50, 49)
vc = S.part('vc', 40, 49)
vcf = S.part('vcf', 40, 48)
pd = S.part('pad', 0, 49)
v1 = S.part('vln1', 20, 48)
v2 = S.part('vln2', 25, 48)
hn = S.part('hn', 0, 60)
tp = S.part('tpt', 0, 56)
tb = S.part('tbn', 0, 57)
tu = S.part('tuba', 0, 58)
sh = S.part('shaku', 0, 77, hum_ms=4, vel_jit=2)
fl = S.part('fl', 0, 73, vel_jit=3)
ob = S.part('ob', 0, 68, vel_jit=3)
ko = S.part('koto', 0, 107, hum_ms=8)
hp = S.part('harp', 0, 46, hum_ms=6)
ti = S.part('timp', 0, 47, hum_ms=3, vel_jit=3)
tk = S.part('taiko', 0, 116, hum_ms=3, vel_jit=4)
kit = S.part('tkit', 0, 48, kit=True, hum_ms=3, vel_jit=4)
cy = S.part('cym', 0, 58, kit=True, hum_ms=0, vel_jit=0)
rc = S.part('rcym', 0, 119, hum_ms=0, vel_jit=0)
ch = S.part('choir', 0, 52, vel_jit=3)

# ---------------------------------------------------------------- bass / celli
# intro drone
cb.note(b(1), 8.1, N('D2'), 70)
cb.note(b(3), 8.1, N('D2'), 74)
cb.expr([(b(1), 52), (b(2, 2), 84), (b(4), 72), (b(4, 3), 88)])
vc.note(b(1), 8.1, N('A2'), 66)
vc.note(b(3), 4.1, N('F2'), 70)
vc.note(b(4), 2.1, N('G2'), 70)
vc.note(b(4, 2), 2.1, N('A2'), 72)
vc.expr([(b(1), 50), (b(2, 2), 80), (b(4), 70), (b(4, 3), 86)])
# A1 / A2 / B / climax / coda
bassline(cb, S, BASS, range(5, 13), v=78)
bassline(cb, S, BASS, range(13, 21), v=84)
bassline(cb, S, BASS, range(21, 29), v=80)
bassline(cb, S, BASS, range(29, 37), v=104)
bassline(cb, S, BASS, range(37, 41), v=74)
cb.expr([(b(5), 86), (b(12, 3), 92), (b(13), 96), (b(20, 3), 100), (b(21), 90), (b(27), 96), (b(28, 3), 112),
         (b(29), 118), (b(36, 3), 118), (b(37), 96), (b(39), 84), (b(40, 3), 60)])
bassline(vc, S, BASS, range(5, 13), v=74, tr=12)
vc.line(b(21), CELLO_B, v=74, leg=1.04)
bassline(vc, S, BASS, range(29, 37), v=100, tr=12, reart=2)
vc.line(b(37), "Bb2:4 | C3:4 | D3:4 | A2:4", v=70, leg=1.04)
vc.expr([(b(5), 84), (b(12, 3), 90), (b(21), 86), (b(28, 3), 104), (b(29), 116), (b(36, 3), 116),
         (b(37), 92), (b(40, 3), 66)])
vcf.line(b(13), CELLO_A2, v=84, leg=1.05)
vcf.expr([(b(13), 92), (b(16), 104), (b(18), 110), (b(20, 3), 98)])

# ---------------------------------------------------------------- string pad
prev = pad(pd, S, chart, [3, 4], 3, N('D3'), N('A4'), v=62)
prev = pad(pd, S, chart, range(5, 13), 4, N('D3'), N('A4'), v=70, prev=None, center=N('F3') + 4)
prev = pad(pd, S, chart, range(13, 21), 2, N('A3'), N('F4'), v=60, prev=None)
prev = pad(pd, S, chart, range(21, 29), 4, N('F3'), N('C5'), v=70, prev=None)
prev = pad(pd, S, chart, range(29, 37), 4, N('D3'), N('D5'), v=92, prev=None)
prev = pad(pd, S, chart, range(37, 40), 3, N('D3'), N('A4'), v=64, prev=None)
pd.chord(b(40), 4.2, [N('D3'), N('A3'), N('D4')], v=58)
pd.expr([(b(3), 48), (b(4), 74), (b(4, 3), 84),
         (b(5), 78), (b(8), 86), (b(9), 80), (b(10), 92), (b(12, 3), 80),
         (b(13), 62), (b(20, 3), 70),
         (b(21), 78), (b(24), 86), (b(26), 88), (b(27), 96), (b(28, 3), 116),
         (b(29), 112), (b(33), 112), (b(34), 120), (b(36, 3), 110),
         (b(37), 86), (b(39), 72), (b(40, 3), 40)])

# ---------------------------------------------------------------- melodies
# A1: shakuhachi
wind_phrase(sh, S, b(5), MEL_A, v=92, scoop=0.6, vib=0.14, vib_rate=4.6, exp_lo=78, exp_hi=118, fall=0.35)
# coda fragment
wind_phrase(sh, S, b(37), SHAKU_CODA, v=82, scoop=0.6, vib=0.14, vib_rate=4.4, exp_lo=64, exp_hi=100, fall=0.5,
            end_exp=34)

# A2: violins (+ octave below)
v1.line(b(13), MEL_A, v=90, leg=1.06)
v2.line(b(13), MEL_A, v=68, leg=1.06, tr=-12)
for p_, base in ((v1, 0), (v2, -8)):
    p_.expr([(b(13), 88 + base), (b(16), 100 + base), (b(17), 96 + base), (b(18), 112 + base), (b(20), 104 + base),
             (b(20, 3.8), 80 + base)])
# B: oboe then violins + flute
wind_phrase(ob, S, b(21), MEL_B1, v=88, scoop=0.0, vib=0.0, exp_lo=84, exp_hi=114, long_beats=1.9)
v1.line(b(25), MEL_B2, v=88, leg=1.06)
v1.expr([(b(25), 86), (b(27), 104), (b(28, 3.8), 118)])
wind_phrase(fl, S, b(25), MEL_B2, v=80, vib=0.06, exp_lo=80, exp_hi=106, long_beats=1.9)
# climax: octave-stacked theme
v1.line(b(29), MEL_A, v=104, leg=1.05, tr=12)
v2.line(b(29), MEL_A, v=98, leg=1.05)
v1.expr([(b(29), 120), (b(36, 3), 118), (b(37), 90)])
v2.expr([(b(29), 116), (b(36, 3), 112), (b(37), 90)])
tp.line(b(28, 3), "E4:.5 G4:.5", v=86)
tp.line(b(29), MEL_A, v=100, leg=1.02)
tp.expr([(b(28, 3), 96), (b(29), 108), (b(34), 118), (b(36, 3), 104)])
wind_phrase(fl, S, b(29), MEL_A, v=72, tr=12, vib=0.05, exp_lo=86, exp_hi=104, long_beats=1.9)

# horns
hn.line(b(2), HORN_CALL, v=78, leg=1.03)
hn.expr([(b(2), 76), (b(2, 2), 98), (b(3), 92), (b(3, 3), 60)])
hn.line(b(11), "[D4,F4]:2 [E4,G4]:2 | [F4,A4]:4", v=66, leg=1.05)
hn.expr([(b(11), 60), (b(12), 84), (b(12, 3.8), 50)])
hn.line(b(13), HORN_A2, v=82, leg=1.04)
hn.expr([(b(13), 86), (b(16), 96), (b(18), 106), (b(20, 3.8), 92)])
prev_h = pad(hn, S, chart, range(25, 29), 2, N('A3'), N('F4'), v=72)
hn.expr([(b(25), 70), (b(27), 92), (b(28, 3.8), 114)])
hn.line(b(29), MEL_A, v=102, leg=1.03, tr=-12)
hn.expr([(b(29), 116), (b(36, 3), 112)])
hn.line(b(37), "[D4,F4]:4 | [E4,G4]:4", v=62, leg=1.05)
hn.expr([(b(37), 80), (b(38, 3.8), 46)])

# trombones / tuba (climax)
pad(tb, S, chart, range(29, 37), 3, N('F2'), N('D4'), v=88)
tb.expr([(b(27), 60), (b(28, 3.8), 96), (b(29), 104), (b(36, 3), 100)])
pad(tb, S, chart, [27, 28], 3, N('F2'), N('D4'), v=70)
bassline(tu, S, BASS, range(29, 37), v=96)
tu.expr([(b(29), 110), (b(36, 3), 104)])

# choir
pad(ch, S, chart, [27, 28], 4, N('A3'), N('D5'), v=70)
pad(ch, S, chart, range(29, 37), 4, N('A3'), N('D5'), v=86)
ch.expr([(b(27), 50), (b(28, 3.8), 100), (b(29), 104), (b(34), 112), (b(36, 3), 100)])

# ---------------------------------------------------------------- koto / harp
for t, d, cn in chord_iter(S, chart, [1, 2, 3, 4]):
    arp(ko, t, d, cn, v=58, ring=1.8)
gl = scale_run(MINYO, N('D4'), N('D6'))
gliss(ko, b(4, 3), 0.9, gl, v=66, ring=1.2)
for t, d, cn in chord_iter(S, chart, range(5, 13)):
    arp(ko, t, d, cn, v=64, lo=N('A2'), ring=1.7)
gliss(ko, b(12, 3), 0.9, gl, v=64, ring=1.2)
for t, d, cn in chord_iter(S, chart, range(13, 21)):
    arp(ko, t, d, cn, v=52, pat=(0, 12, 7, 'T'), step=1.0, ring=1.8)
for t, d, cn in chord_iter(S, chart, range(29, 37)):
    c = chord(cn)
    r = N('D4') + ((c['root'] - N('D4')) % 12)
    for k in range(int(d // 2)):
        ko.chord(t + 2 * k, 1.5, [r, r + 12], v=88)
        ko.note(t + 2 * k + 1, 1.0, r + 7, 74)
gliss(ko, b(36, 3), 0.9, gl, v=70, ring=1.2)
for t, d, cn in chord_iter(S, chart, [39, 40]):
    arp(ko, t, d, cn, v=54, ring=1.8)
ko.expr([(b(1), 112), (b(12, 3), 112), (b(13), 96), (b(29), 120), (b(37), 104)])
# layer: MuseScore koto (long ring) + GeneralUser koto (sharper pluck, better low register)
ko2 = S.part('koto2', 0, 107, sf2=SF_GU, hum_ms=8)
for (t_, d_, p_, v_, c_) in list(ko.notes):
    if p_ < 60:
        ko2.note(t_, d_, p_, v_ + 4)
    else:
        ko2.note(t_, d_, p_, v_ - 8)
ko.notes = [(t_, d_, p_, (v_ - 16 if p_ < 60 else v_), c_) for (t_, d_, p_, v_, c_) in ko.notes]
ko2.ccs = list(ko.ccs)

for t, d, cn in chord_iter(S, chart, range(21, 29)):
    arp(hp, t, d, cn, v=56, pat=(0, 7, 12, 'T', 19, 'T', 12, 7), lo=N('F2'), ring=1.4, accent=6)
gliss(hp, b(28, 3), 0.95, scale_run({pc(x) for x in 'C D E F G A'.split()} | {pc('Bb')}, N('C3'), N('C6')), v=64, ring=2.0)
for t, d, cn in chord_iter(S, chart, range(29, 37)):
    arp(hp, t, d, cn, v=66, pat=(0, 7, 12, 'T', 19, 24, 'T2', 24), lo=N('D3'), ring=1.0, accent=6)
for t, d, cn in chord_iter(S, chart, range(37, 40)):
    arp(hp, t, d, cn, v=50, pat=(0, 7, 12, 'T', 19, 'T', 12, 7), lo=N('F2'), ring=1.4, accent=4)
hp.expr([(b(21), 110), (b(29), 120), (b(37), 100)])

# ---------------------------------------------------------------- percussion
spb = S.spb
roll(ti, b(1), 3.5, N('D2'), 22, 40, spb=spb, shape='swell')
roll(ti, b(4, 1), 3.0, N('D2'), 28, 70, spb=spb)
ti.note(b(5), 2.0, N('D2'), 76)
roll(ti, b(12, 2), 2.0, N('D2'), 26, 56, spb=spb)
ti.note(b(13), 2.0, N('D2'), 72)
ti.note(b(17), 2.0, N('D2'), 76)
roll(ti, b(20, 2), 2.0, N('C2'), 30, 66, spb=spb)
ti.note(b(21), 2.0, N('F2'), 66)
roll(ti, b(28), 4.0, N('C2'), 32, 92, spb=spb)
TIMP_CL = {29: 'D2', 30: 'F2', 31: 'A2', 32: 'G2', 33: 'D2', 34: 'F2', 35: ['F2', 'G2'], 36: 'D2'}
for bar in range(29, 37):
    nm = TIMP_CL[bar]
    if isinstance(nm, list):
        ti.note(b(bar), 1.5, N(nm[0]), 104)
        ti.note(b(bar, 2), 0.5, N(nm[1]), 86)
        ti.note(b(bar, 3), 0.5, N(nm[1]), 96)
        ti.note(b(bar, 3.5), 0.5, N(nm[1]), 92)
    else:
        ti.note(b(bar), 1.5, N(nm), 106)
        ti.note(b(bar, 2.5), 0.5, N(nm), 82)
        ti.note(b(bar, 3), 1.0, N(nm), 96)
roll(ti, b(36, 1), 3.0, N('D2'), 78, 40, spb=spb)
roll(ti, b(40, 1), 3.0, N('D2'), 20, 36, spb=spb, shape='swell')

# taiko (Taiko Drum patch: low pitch = big drum) + kit taiko hits
BIG, MID, SMALL = N('C3'), N('G3'), N('D4')
tk.note(b(1), 2, BIG, 52)
kit.note(b(1), 2, 87, 42)
for bar, v in ((5, 66), (9, 64), (13, 74), (17, 76)):
    tk.note(b(bar), 2, BIG, v)
    kit.note(b(bar), 2, 87, v - 8)
for bar in (12, 20):
    tk.note(b(bar, 3), 0.5, MID, 50)
    tk.note(b(bar, 3.5), 0.5, MID, 60)
for bar in range(29, 37):
    tk.note(b(bar), 2, BIG, 112)
    kit.note(b(bar), 2, 87, 104)
    tk.note(b(bar, 2), 1, MID, 90)
    tk.note(b(bar, 3.5), 0.5, SMALL, 72)
    if bar in (32, 36):
        tk.note(b(bar, 3), 0.25, SMALL, 70)
        tk.note(b(bar, 3.25), 0.25, SMALL, 76)
tk.note(b(37), 2, BIG, 74)
kit.note(b(37), 2, 87, 60)
kit.note(b(29), 3, 36, 96)
kit.note(b(33), 3, 36, 90)

# cymbals
rc.note(b(28, 4 - 2.06 / spb), 2.6, 60, 92)
cy.note(b(29), 6, 72, 112)
cy.note(b(33), 6, 72, 96)
cy.note(b(36, 3.5), 0.5, 74, 60)

# ---------------------------------------------------------------- synth layers
th = synth_thump(f_hi=96, f_lo=50, decay=0.45, dur=1.8, seed=2)
place_layer(S, 'thump', b(1), th, dict(gain=-24, rev=-14, hp=38))
for bar in range(29, 37):
    place_layer(S, 'thump', b(bar), th, dict(gain=-15, rev=-16, hp=38))
for bar in (5, 9, 13, 17, 37):
    place_layer(S, 'thump', b(bar), th, dict(gain=-21, rev=-14, hp=38))

# ---------------------------------------------------------------- mix
MIX = {
    'cb': dict(gain=-1, pan=0.42, width=0.6, rev=-12, lp=4000),
    'vc': dict(gain=-1, pan=0.32, width=0.6, rev=-12, hp=50),
    'vcf': dict(gain=0, pan=0.3, width=0.6, rev=-11, hp=60),
    'pad': dict(gain=-3, pan=0.0, width=1.0, rev=-9, hp=100, peq=[(420, -2.0, 1.0)]),
    'vln1': dict(gain=2, pan=-0.38, width=0.7, rev=-9, hp=150),
    'vln2': dict(gain=-1, pan=-0.18, width=0.7, rev=-9, hp=120),
    'hn': dict(gain=-0.5, pan=-0.12, width=0.5, rev=-6, hp=70),
    'tpt': dict(gain=-2, pan=0.15, width=0.4, rev=-7, hp=150),
    'tbn': dict(gain=-5, pan=0.32, width=0.5, rev=-7, hp=60),
    'tuba': dict(gain=-5, pan=0.4, width=0.4, rev=-9, lp=3000),
    'shaku': dict(gain=2.5, pan=0.08, width=0.4, rev=-6, hp=180),
    'fl': dict(gain=-1.5, pan=-0.05, width=0.4, rev=-7, hp=250),
    'ob': dict(gain=-1, pan=0.05, width=0.4, rev=-7, hp=180),
    'koto': dict(gain=1, pan=-0.22, width=0.7, rev=-9, hp=120, lp=11000),
    'koto2': dict(gain=1, pan=-0.18, width=0.7, rev=-9, hp=110, lp=11000),
    'harp': dict(gain=-3, pan=-0.45, width=0.7, rev=-8, hp=60),
    'timp': dict(gain=-5, pan=0.1, width=0.5, rev=-10, hp=48),
    'taiko': dict(gain=-2, pan=0.0, width=0.6, rev=-11, hp=45),
    'tkit': dict(gain=-4, pan=0.0, width=0.7, rev=-11, hp=45),
    'cym': dict(gain=-8, pan=0.05, width=1.0, rev=-10, hp=300),
    'rcym': dict(gain=-10, pan=0.0, width=1.0, rev=-12, hp=300),
    'choir': dict(gain=-4, pan=0.0, width=1.0, rev=-5, hp=120),
}

if __name__ == '__main__':
    import time
    rdir = os.path.join(WORK, 'render', 'seimu')
    t0 = time.time()
    only = sys.argv[1].split(',') if len(sys.argv) > 1 and sys.argv[1] != 'all' else None
    if '--mixonly' not in sys.argv:
        os.makedirs(os.path.join(WORK, 'out'), exist_ok=True)
        S.render(rdir, jobs=2, only=only)
        print('render', round(time.time() - t0, 1), 's')
    ir = make_ir(rt_low=2.7, rt_mid=2.4, rt_high=1.4, length=3.8, predelay=0.026, seed=11, lp=11500)
    loop, info, _ = mix_song(S, rdir, MIX, ir, rev_return_db=-1.0, target_lufs=-17.0,
                             master=dict(level=dict(strength=0.4, win=3.0, smooth=5.0),
                                         eq=dict(ls=(70, -2.5), peq=[(400, -1.5, 0.9)], hs=(5000, 3.5))),
                             out_wav=os.path.join(WORK, 'out', 'seimu_loop.wav'))
    print('total', round(time.time() - t0, 1), 's')
