"""flag sustained minor-2nd / major-7th / tritone clashes between different pitched parts"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib
PERC = {'timp','taiko','tkit','cym','rcym'}
def run(modname, min_len=0.75, min_ov=0.5):
    m = importlib.import_module(modname); S = m.S
    notes=[]
    for p in S.parts:
        if p.kit or p.name in PERC: continue
        for (t,d,pi,v,ch) in p.notes:
            if d>=min_len: notes.append((t,t+d,pi,p.name,v))
    notes.sort()
    out=[]
    for i,a in enumerate(notes):
        for b in notes[i+1:]:
            if b[0]>=a[1]: break
            if a[3]==b[3]: continue
            ov=min(a[1],b[1])-max(a[0],b[0])
            if ov<min_ov: continue
            ic=abs(a[2]-b[2])%12
            if ic in (1,11):
                bar=int(max(a[0],b[0])//S.bpb)+1
                out.append((bar,round(max(a[0],b[0])%S.bpb,2),a[3],a[2],b[3],b[2],round(ov,2)))
    NM=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
    nn=lambda p:f'{NM[p%12]}{p//12-1}'
    seen=set()
    for o in out:
        key=(o[0],o[2],o[4],o[3]%12,o[5]%12)
        if key in seen: continue
        seen.add(key)
        print(f'{modname} bar {o[0]:2d} beat {o[1]:4}: {o[2]}:{nn(o[3])} vs {o[4]}:{nn(o[5])} overlap {o[6]}')
    print(modname,'total flagged',len(seen))
for mn in sys.argv[1:]: run(mn)
