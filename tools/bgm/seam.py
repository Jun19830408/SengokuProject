import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, soundfile as sf
from scipy import signal
def check(path):
    x,sr=sf.read(path,always_2d=True)
    # 1) sample jump at the wrap vs typical jumps
    d=np.abs(np.diff(x,axis=0)).max(1)
    wrap=np.abs(x[0]-x[-1]).max()
    print(f'{path}: len={len(x)/sr:.4f}s  wrap jump={wrap:.5f}  median jump={np.median(d):.5f}  p99.9 jump={np.percentile(d,99.9):.5f}')
    # 2) spectral flux at the wrap vs distribution
    y=np.concatenate([x[-sr*2:],x[:sr*2]]).mean(1)
    f,t,Z=signal.stft(y,sr,nperseg=1024,noverlap=768)
    A=np.abs(Z); flux=np.sum(np.maximum(0,np.diff(A,axis=1)),axis=0)
    mid=np.argmin(np.abs(t[1:]-2.0))
    print(f'   flux at wrap={flux[mid-2:mid+3].max():.3f}  median flux (±2s)={np.median(flux):.3f}  max={flux.max():.3f}')
    # 3) RMS just before vs after wrap (100 ms)
    n=int(0.1*sr)
    print(f'   rms end={20*np.log10(np.sqrt(np.mean(x[-n:]**2))):.1f} dB  rms start={20*np.log10(np.sqrt(np.mean(x[:n]**2))):.1f} dB')
if __name__=='__main__':
    for p in sys.argv[1:]: check(p)
