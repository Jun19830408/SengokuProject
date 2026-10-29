# -*- coding: utf-8 -*-
"""per-section loudness of a 'lead' group vs the rest (approximate, from stems with cfg gains)"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import pyloudnorm as pyln

def section_balance(S, rdir, cfg, sections, leads):
    m = pyln.Meter(SR)
    Lb = int(round(S.L * S.spb * SR))
    stems = {}
    for p in S.parts:
        x = load(os.path.join(rdir, p.name + '.wav'))[Lb:2 * Lb]
        c = cfg.get(p.name, {})
        stems[p.name] = x * 10 ** (c.get('gain', 0) / 20)
    bar_s = S.spb * S.bpb
    for (b0, b1, lead) in sections:
        a, z = int((b0 - 1) * bar_s * SR), int(b1 * bar_s * SR)
        L = sum(stems[n][a:z] for n in lead if n in stems)
        R = sum(stems[n][a:z] for n in stems if n not in lead)
        try:
            ll, lr = m.integrated_loudness(L), m.integrated_loudness(R)
        except Exception as e:
            ll, lr = float('nan'), float('nan')
        print(f'bars {b0:2d}-{b1:2d} lead={"+".join(lead):18s} lead {ll:6.1f}  rest {lr:6.1f}  diff {ll - lr:+5.1f} LU')
