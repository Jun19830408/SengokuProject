import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from lib import load, SR
def yin(x, fmin=150, fmax=1400, win=2048, hop=512, thr=0.15):
    taus = np.arange(int(SR/fmax), int(SR/fmin))
    out=[]
    for s in range(0, len(x)-win-taus[-1], hop):
        fr = x[s:s+win+taus[-1]]
        if np.sqrt(np.mean(fr[:win]**2)) < 1e-3: out.append(np.nan); continue
        d = np.array([np.sum((fr[:win]-fr[t:t+win])**2) for t in taus])
        cm = d*np.arange(1,len(d)+1)/np.maximum(np.cumsum(d),1e-12)
        idx = np.where(cm<thr)[0]
        if len(idx)==0: out.append(np.nan); continue
        i=idx[0]
        while i+1<len(cm) and cm[i+1]<cm[i]: i+=1
        if 0<i<len(cm)-1:
            a,b,c=cm[i-1],cm[i],cm[i+1]; i=i+0.5*(a-c)/(a-2*b+c)
        out.append(SR/(taus[0]+i))
    return np.array(out)
