# -*- coding: utf-8 -*-
"""Shared idioms: koto / harp figures, pads, timpani rolls, wind phrasing."""
from lib import *


def chord_iter(S, chart, bars):
    for bar in bars:
        c = chart[bar]
        if isinstance(c, list):
            if isinstance(c[0], tuple):          # [(name, beats), ...]
                acc = 0.0
                for cn, d in c:
                    yield S.b(bar, acc), float(d), cn
                    acc += d
            else:
                d = S.bpb / len(c)
                for i, cn in enumerate(c):
                    yield S.b(bar, i * d), d, cn
        else:
            yield S.b(bar), float(S.bpb), c


def third_of(c):
    iv = c['ivs']
    if 3 in iv:
        return 3
    if 4 in iv:
        return 4
    if 5 in iv:
        return 5
    return 2


def arp(part, t, dur, cname, v=60, pat=(0, 7, 12, 7, 'T', 7, 12, 7), step=0.5, lo=57,
        ring=1.6, accent=8, vj=None):
    c = chord(cname)
    r = lo + ((c['root'] - lo) % 12)
    th = third_of(c)
    k = 0
    tt = t
    while tt < t + dur - 1e-6:
        iv = pat[k % len(pat)]
        if iv == 'T':
            iv = 12 + th
        elif iv == 't':
            iv = th
        elif iv == 'T2':
            iv = 24 + th
        part.note(tt, ring, r + iv, v + (accent if k % len(pat) == 0 else 0))
        tt += step
        k += 1


def gliss(part, t, d, pitches, v=70, ring=2.0, curve=1.0):
    n = len(pitches)
    for i, p in enumerate(pitches):
        x = (i / max(1, n - 1)) ** curve
        part.note(t + x * d, ring, p, v)


def scale_run(pcs, lo, hi):
    return [p for p in range(lo, hi + 1) if p % 12 in pcs]


def pad(part, S, chart, bars, n, lo, hi, v=70, overlap=0.15, prev=None, center=None):
    for t, d, cn in chord_iter(S, chart, bars):
        vc = voicing(cn, n, lo, hi, prev=prev, center=center)
        for p in vc:
            part.note(t, d + overlap, p, v)
        prev = vc
    return prev


def bassline(part, S, notes_by_bar, bars, v=80, tr=0, overlap=0.1, reart=None):
    for bar in bars:
        nb = notes_by_bar[bar]
        if isinstance(nb, str):
            nb = [nb]
        d = S.bpb / len(nb)
        for i, nm in enumerate(nb):
            t0 = S.b(bar, i * d)
            if reart:
                k = 0
                while k * reart < d - 1e-6:
                    part.note(t0 + k * reart, reart + overlap * 0.5, N(nm) + tr, v)
                    k += 1
            else:
                part.note(t0, d + overlap, N(nm) + tr, v)


def roll(part, t, d, p, v0, v1, rate_s=0.068, spb=0.8, ch_alt=True, ring=0.7, shape=None):
    """single-drum roll; alternate two channels so strokes ring through"""
    n = max(2, int(d * spb / rate_s))
    for k in range(n):
        x = k / (n - 1)
        if shape == 'swell':
            vv = v0 + (v1 - v0) * math.sin(math.pi * x)
        else:
            vv = v0 + (v1 - v0) * x
        part.note(t + k * d / n, ring, p, vv + ((k % 2) * 3 - 1), ch=(k % 2) if ch_alt else 0)


def wind_phrase(part, S, t, spec, v=90, tr=0, leg=1.02, scoop=0.0, vib=0.1, vib_rate=5.0,
                exp_lo=72, exp_hi=112, long_beats=1.4, fall=0.0, end_exp=None):
    """monophonic expressive line: CC11 per-note breath + vibrato + optional scoops"""
    items = seq(spec, tr) if isinstance(spec, str) else spec
    last_i = max(i for i, (ps, d) in enumerate(items) if ps)
    tt = t
    first = True
    for i, (ps, d) in enumerate(items):
        if ps:
            p = ps[0]
            part.note(tt, d * leg, p, v)
            if d >= long_beats:
                if i == last_i and end_exp is not None:
                    part.expr([(tt, exp_lo), (tt + d * 0.3, exp_hi), (tt + d * 0.55, exp_hi - 6), (tt + d * 0.97, end_exp)])
                else:
                    part.expr([(tt, exp_lo), (tt + d * 0.35, exp_hi), (tt + d * 0.8, exp_hi - 8), (tt + d, exp_hi - 18)])
                if vib > 0:
                    part.vibrato(tt + 0.02, tt + d * (0.84 if fall else 1.0), depth=vib, rate=vib_rate, delay=0.32)
                if fall:
                    part.bend_glide(tt + d * 0.86, tt + d * 0.99, 0, -fall, steps=6)
                    part.bend(tt + d, 0)
            else:
                part.cc(tt, 11, exp_hi - 6)
            if scoop and (first or d >= long_beats):
                part.bend(tt - 0.001, -scoop)
                part.bend_glide(tt, tt + min(0.25, d * 0.3), -scoop, 0, steps=8)
            first = False
        else:
            first = True
        tt += d
    return tt


def strings_phrase(part, t, spec, v=88, tr=0, leg=1.06, exp_pts=None):
    end = part.line(t, spec, v=v, leg=leg, tr=tr)
    if exp_pts:
        part.expr(exp_pts)
    return end
