# -*- coding: utf-8 -*-
"""per-section loudness of a 'lead' group vs the rest (approximate, from stems with cfg gains)"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import pyloudnorm as pyln

def section_balance(S, rdir, cfg, sections, leads=None):
    m = pyln.Meter(SR)
    Lb = int(round(S.L * S.spb * SR))
    bar_s = S.spb * S.bpb
    spans = [(int((b0 - 1) * bar_s * SR), int(b1 * bar_s * SR)) for (b0, b1, lead) in sections]
    Ls = [np.zeros((z - a, 2)) for a, z in spans]
    Rs = [np.zeros((z - a, 2)) for a, z in spans]
    # one stem at a time (cycle 2 only), so long pieces with many stems fit in memory
    for p in S.parts:
        x, _ = sf.read(os.path.join(rdir, p.name + '.wav'), start=Lb, stop=2 * Lb, always_2d=True)
        x = (np.repeat(x, 2, 1) if x.shape[1] == 1 else x) * 10 ** (cfg.get(p.name, {}).get('gain', 0) / 20)
        for i, ((a, z), (b0, b1, lead)) in enumerate(zip(spans, sections)):
            (Ls if p.name in lead else Rs)[i] += x[a:z]
    for i, (b0, b1, lead) in enumerate(sections):
        L, R = Ls[i], Rs[i]
        try:
            ll, lr = m.integrated_loudness(L), m.integrated_loudness(R)
        except Exception as e:
            ll, lr = float('nan'), float('nan')
        print(f'bars {b0:2d}-{b1:2d} lead={"+".join(lead):18s} lead {ll:6.1f}  rest {lr:6.1f}  diff {ll - lr:+5.1f} LU')
