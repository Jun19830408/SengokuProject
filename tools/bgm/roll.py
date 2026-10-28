# -*- coding: utf-8 -*-
"""piano-roll plot of a Song's score for visual checking"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']


def plot(S, chart, bars, out, skip=(), title=''):
    cmap = plt.get_cmap('tab20')
    parts = [p for p in S.parts if p.name not in skip and not p.kit]
    fig, ax = plt.subplots(figsize=(26, 14))
    b0, b1 = bars
    t0, t1 = S.b(b0), S.b(b1 + 1)
    lo, hi = 127, 0
    for i, p in enumerate(parts):
        col = cmap(i % 20)
        for (t, d, pi, v, ch) in p.notes:
            if t + d < t0 or t > t1:
                continue
            lo, hi = min(lo, pi), max(hi, pi)
            ax.add_patch(Rectangle((t, pi - 0.4), d, 0.8, color=col, alpha=0.35 + 0.5 * v / 127, lw=0))
        ax.plot([], [], color=col, lw=6, label=p.name)
    for bar in range(b0, b1 + 2):
        ax.axvline(S.b(bar), color='k', lw=0.6, alpha=0.5)
        if bar <= b1 and bar in chart:
            c = chart[bar]
            lab = ' '.join(c) if isinstance(c, list) else c
            ax.text(S.b(bar) + 0.1, hi + 1.5, f'{bar}:{lab}', fontsize=10)
    for pch in range(lo - 1, hi + 2):
        if pch % 12 == 0:
            ax.axhline(pch, color='gray', lw=0.5, alpha=0.4)
    ax.set_yticks([p for p in range(lo - 1, hi + 2) if p % 12 in (0, 2, 5, 7, 9)])
    ax.set_yticklabels([f'{NAMES[p % 12]}{p // 12 - 1}' for p in range(lo - 1, hi + 2) if p % 12 in (0, 2, 5, 7, 9)],
                       fontsize=8)
    ax.set_xlim(t0, t1)
    ax.set_ylim(lo - 1, hi + 3)
    ax.legend(loc='upper left', bbox_to_anchor=(1.0, 1.0), fontsize=10)
    ax.set_title(title)
    fig.tight_layout()
    fig.savefig(out, dpi=55)
