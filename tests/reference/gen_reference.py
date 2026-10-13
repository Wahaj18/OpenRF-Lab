"""Independent reference values for the OpenRF-Lab regression tests.

Everything here is computed from first principles with numpy/scipy, never with
the app's own code. Run `python3 tests/reference/gen_reference.py` to refresh
tests/reference/reference.json.
"""
import json, math
import numpy as np
from scipy import signal
from scipy.signal import windows

out = {}

# ---------------------------------------------------------------- analyzer
# Analyzer model: real IF samples at fs = 2.5*span, one-sided power per bin,
# Gaussian RBW filter (-3 dB at ±RBW/2), detectors over 800 display points.
def analyzer_trace(span, center, rbw, tones, window='hann'):
    fs = 2.5 * span
    n = 256
    while n < 8 * fs / rbw and n < 65536:
        n *= 2
    bin_hz = fs / n
    if_origin = center - span / 2 - 0.1 * span
    t = np.arange(n) / fs
    x = np.zeros(n)
    for f, p in tones:
        x += math.sqrt(2) * 10 ** (p / 20) * np.sin(2 * np.pi * (f - if_origin) * t)
    w = signal.get_window(window, n, fftbins=False)
    X = np.fft.rfft(x * w)
    pw = 2 * np.abs(X) ** 2 / (n * np.sum(w ** 2))
    first = round(0.1 * span / bin_hz); last = round(1.1 * span / bin_hz)
    rbw_bins = max(rbw, 8 * bin_hz) / bin_hz
    reach = math.ceil(2 * rbw_bins)
    j = np.arange(-reach, reach + 1)
    kern = 2.0 ** (-(2 * j / rbw_bins) ** 2)
    filt = np.convolve(pw, kern, mode='same')[first:last + 1]
    return 10 * np.log10(np.maximum(filt, 1e-15)), bin_hz

span, center, rbw = 100e6, 2.437e9, 300e3
tones = [(2.40e9, -20.0), (2.437e9, -45.0), (2.47e9, -70.0)]
tr, bin_hz = analyzer_trace(span, center, rbw, tones)
freqs = center - span / 2 + np.arange(len(tr)) * bin_hz
ref_tones = []
for f, p in tones:
    sel = np.abs(freqs - f) < 3 * rbw
    i = np.argmax(np.where(sel, tr, -999))
    lvl = tr[i]
    thr = lvl - 3
    # 3 dB width of the trace around this tone (linear interpolation)
    l = i
    while tr[l - 1] >= thr: l -= 1
    r = i
    while tr[r + 1] >= thr: r += 1
    left = l - (tr[l] - thr) / (tr[l] - tr[l - 1]); right = r + (tr[r] - thr) / (tr[r] - tr[r + 1])
    ref_tones.append({'freq': f, 'powerDbm': p, 'peakDbm': float(lvl), 'peakFreq': float(freqs[i]), 'bw3dB': float((right - left) * bin_hz)})
# N dB bandwidth case with display points much finer than the RBW
trN, binN = analyzer_trace(10e6, 1e9, 300e3, [(1.0002e9, -30.0)])
i = int(np.argmax(trN)); thr = trN[i] - 3; l = i
while trN[l - 1] >= thr: l -= 1
r = i
while trN[r + 1] >= thr: r += 1
ndb = ((r + (trN[r] - thr) / (trN[r] - trN[r + 1])) - (l - (trN[l] - thr) / (trN[l] - trN[l - 1]))) * binN
out['analyzerNdb'] = {'span': 10e6, 'center': 1e9, 'rbw': 300e3, 'tone': 1.0002e9, 'bw3dB': float(ndb)}
out['analyzer'] = {'span': span, 'center': center, 'rbw': rbw, 'tones': ref_tones,
                   'enbwFactor': math.sqrt(math.pi / (4 * math.log(2)))}

# AWGN: total power P over 0..fs/2 → density P/(fs/2); RMS reading = density·ENBW
noise_cases = []
for rbw_ in [100e3, 300e3, 1e6, 3e6]:
    fs = 2.5 * span
    density = 10 ** (-60 / 10) / (fs / 2)
    noise_cases.append({'rbw': rbw_, 'rmsDbm': 10 * math.log10(density * rbw_ * math.sqrt(math.pi / (4 * math.log(2))))})
out['analyzerNoise'] = {'span': span, 'noisePowerDbm': -60, 'cases': noise_cases}

# Detectors on a fixed array: 24 points into 6 buckets
rng = np.random.default_rng(7)
arr = np.round(rng.uniform(-90, -10, 24), 3)
# Display point i sits at i/(D-1) of the span; its bucket is the bins within
# ±(L/D)/2 of that position (rounded), the sample detector takes the centre bin.
L_, D_ = len(arr), 6
r_ = L_ / D_
buckets = []
for i in range(D_):
    c_ = i * (L_ - 1) / (D_ - 1)
    s_ = max(0, int(np.floor(c_ - r_ / 2 + 0.5))); e_ = max(s_ + 1, min(L_, int(np.floor(c_ + r_ / 2 + 0.5))))
    buckets.append((arr[s_:e_], arr[min(L_ - 1, int(np.floor(c_ + 0.5)))]))
out['detectors'] = {
    'input': arr.tolist(),
    'peak': [float(b.max()) for b, _ in buckets], 'negPeak': [float(b.min()) for b, _ in buckets],
    'sample': [float(c) for _, c in buckets], 'average': [float(b.mean()) for b, _ in buckets],
    'rms': [float(10 * np.log10(np.mean(10 ** (b / 10)))) for b, _ in buckets],
}
# Trace modes over 5 sweeps of 8 points
sweeps = np.round(rng.uniform(-80, -20, (5, 8)), 3)
out['traceModes'] = {
    'sweeps': sweeps.tolist(),
    'maxHold': sweeps.max(0).tolist(), 'minHold': sweeps.min(0).tolist(),
    'average': (10 * np.log10((10 ** (sweeps / 10)).mean(0))).tolist(),
    'add': (10 * np.log10(10 ** (sweeps[0] / 10) + 10 ** (sweeps[1] / 10))).tolist(),
    'subtract': (sweeps[0] - sweeps[1]).tolist(),
}

# ---------------------------------------------------------------- waveform
fs, N, f0, A = 8192, 1024, 64.0, 1.0
t = np.arange(N) / fs
def harm(x):
    w = windows.hann(N, sym=False)
    X = np.fft.rfft(x * w)
    amp = np.abs(X) / w.sum() * 2
    amp[0] /= 2
    return [float(20 * np.log10(max(amp[int(round(k * f0 * N / fs))], 1e-12))) for k in range(0, 8)]
wf = {'fs': fs, 'N': N, 'f0': f0,
      'square': harm(A * signal.square(2 * np.pi * f0 * t, 0.5)),
      'sawtooth': harm(A * signal.sawtooth(2 * np.pi * f0 * t)),
      'triangle': harm(A * signal.sawtooth(2 * np.pi * f0 * t, 0.5)),
      'pulse25': harm(A * (signal.square(2 * np.pi * f0 * t, 0.25) + 1) / 2),
      'sine': harm(A * np.sin(2 * np.pi * f0 * t)),
      # analytic Fourier-series amplitudes, harmonics 1..7
      'squareTheory': [float(20 * np.log10(4 / (np.pi * k))) if k % 2 else None for k in range(1, 8)],
      'sawTheory': [float(20 * np.log10(2 / (np.pi * k))) for k in range(1, 8)],
      'triTheory': [float(20 * np.log10(8 / (np.pi ** 2 * k ** 2))) if k % 2 else None for k in range(1, 8)],
      'pulse25Theory': [float(20 * np.log10(2 * 0.25 * abs(np.sinc(k * 0.25)) + 1e-30)) for k in range(1, 8)],
      }
# chirp: instantaneous frequency from f0 to 4 f0 over the record
fc0 = 200.0
x = signal.chirp(t, f0=fc0, t1=N / fs, f1=4 * fc0, method='linear', phi=-90)
wf['chirp'] = {'f0': fc0, 'f1': 4 * fc0, 'samples': x[:64].tolist()}
out['waveform'] = wf

# ---------------------------------------------------------------- modulation
def qam(m):
    s = int(math.isqrt(m)); lv = np.arange(s) - (s - 1) / 2
    pts = np.array([complex(i, q) for q in lv for i in lv])
    return pts / np.sqrt(np.mean(np.abs(pts) ** 2))
out['modulation'] = {
    'qam16': [[p.real, p.imag] for p in qam(16)],
    'qam64Corner': [qam(64)[-1].real, qam(64)[-1].imag],
    'qam256Corner': [qam(256)[-1].real, qam(256)[-1].imag],
    'evmVsSnr': [{'snr': s, 'evmRms': math.sqrt(10 ** (-s / 10))} for s in [10, 20, 30]],
    'carson': {'beta': 2.0, 'fm': 100.0, 'bw': 2 * (2.0 + 1) * 100.0},
}
# FM tone, beta=2: fraction of power within Carson bandwidth (Bessel sum)
from scipy.special import jv
beta = 2.0
out['modulation']['carsonPowerFraction'] = float(jv(0, beta) ** 2 + 2 * sum(jv(k, beta) ** 2 for k in range(1, 4)))
out['modulation']['fmBessel'] = [float(abs(jv(k, beta))) for k in range(0, 5)]

# ---------------------------------------------------------------- filters
fsF = 8192
wmap = {'rectangular': 'boxcar', 'hann': 'hann', 'hamming': 'hamming', 'blackman': 'blackman',
        'kaiser': ('kaiser', 5.0), 'flat-top': 'flattop'}
filt = []
for ftype in ['lowpass', 'highpass', 'bandpass', 'bandstop']:
    for wname, sw in wmap.items():
        taps = 51
        if ftype in ('lowpass', 'highpass'):
            cut = 1000
        else:
            cut = [1000, 2000]
        h = signal.firwin(taps, cut, window=sw, pass_zero=ftype in ('lowpass', 'bandstop'), fs=fsF)
        w, H = signal.freqz(h, worN=512, fs=fsF)
        _, gd = signal.group_delay((h, 1), w=512, fs=fsF)
        filt.append({'type': ftype, 'window': wname, 'taps': taps, 'h': h.tolist(),
                     'magDb': (20 * np.log10(np.maximum(np.abs(H), 1e-30))).tolist(),
                     'phase': np.angle(H).tolist()})
out['filters'] = filt
# -6 dB point and stopband attenuation (lowpass 1 kHz, 101 taps)
atten = {}
for wname, sw in wmap.items():
    h = signal.firwin(101, 1000, window=sw, fs=fsF)
    w, H = signal.freqz(h, worN=8192, fs=fsF)
    mag = 20 * np.log10(np.maximum(np.abs(H), 1e-30))
    i6 = np.argmax(mag < -6.0206)
    f6 = w[i6 - 1] + (w[i6] - w[i6 - 1]) * (-6.0206 - mag[i6 - 1]) / (mag[i6] - mag[i6 - 1])
    stop = float(-mag[w >= 1600].max())
    atten[wname] = {'f6dB': float(f6), 'stopbandAttenDb': stop}
out['filterWindows'] = atten

# ---------------------------------------------------------------- channelizer
M, L, fsC = 8, 64, 8192
proto = signal.firwin(L, 1 / M, window='hamming', scale=False)
n = np.arange(1024)
rng2 = np.random.default_rng(3)
xin = np.sin(2 * np.pi * (3 * fsC / M + fsC / (4 * M)) * n / fsC) + 0.5 * np.sin(2 * np.pi * (1 * fsC / M) * n / fsC)
ch_pow = []
for c in range(M):
    y = signal.lfilter(proto, 1, xin * np.exp(-2j * np.pi * c * n / M))[::M]
    ch_pow.append(float(10 * np.log10(np.mean(np.abs(y) ** 2))))
w, H = signal.freqz(proto, worN=128, fs=fsC, whole=False)
out['channelizer'] = {'M': M, 'L': L, 'fs': fsC, 'input': xin.tolist(), 'channelPowerDb': ch_pow,
                      'protoMagDb': (20 * np.log10(np.maximum(np.abs(H), 1e-12))).tolist(),
                      'multPoly': 1024 * (L / M + math.log2(M)), 'multBrute': 1024 * M * L}

# ---------------------------------------------------------------- antenna
def directivity_db(F, psi=np.linspace(0, np.pi, 200001)):
    f2 = F(psi) ** 2
    return float(10 * np.log10(2 * f2.max() / np.trapezoid(f2 * np.sin(psi), psi)))
def hpbw(F, lo=-np.pi, hi=np.pi):
    th = np.linspace(lo, hi, 720001); p = 20 * np.log10(np.maximum(np.abs(F(th)), 1e-30)); p -= p.max()
    i = np.argmax(p); l = i
    while p[l] >= -3: l -= 1
    r = i
    while p[r] >= -3: r += 1
    return float(np.degrees(th[r] - th[l]))
def sll(F, lo, hi):
    th = np.linspace(lo, hi, 720001); p = 20 * np.log10(np.maximum(np.abs(F(th)), 1e-30)); p -= p.max()
    i = np.argmax(p); l = i
    while l > 0 and p[l - 1] <= p[l]: l -= 1
    r = i
    while r < len(p) - 1 and p[r + 1] <= p[r]: r += 1
    rest = np.concatenate([p[:l], p[r + 1:]])
    return float(rest.max()) if len(rest) else None
dip = lambda th: np.where(np.abs(np.sin(th)) < 1e-9, 0, np.cos(np.pi / 2 * np.cos(th)) / np.where(np.abs(np.sin(th)) < 1e-9, 1, np.sin(th)))
patch = lambda th: np.where(np.abs(th) <= np.pi / 2, np.cos(th), 0)
horn = lambda th: np.exp(-(np.log(2) / 2) * (2 * th / np.radians(20)) ** 2)
def af(wts, d, scan):
    def F(th):
        k = np.arange(len(wts))[:, None]
        return np.abs((wts[:, None] * np.exp(1j * 2 * np.pi * d * k * (np.sin(th) - np.sin(scan)))).sum(0))
    return F
ant = {
    'dipole': {'hpbw': hpbw(dip, 0, np.pi), 'directivity': directivity_db(dip)},
    'patch': {'hpbw': hpbw(patch), 'directivity': directivity_db(patch)},
    'horn': {'hpbw': hpbw(horn), 'directivity': directivity_db(horn)},
    'arrays': [],
}
for N_, d, taper, sl, scan in [(8, 0.5, 'uniform', -25, 0), (16, 0.5, 'uniform', -25, 30), (16, 0.5, 'chebyshev', -30, 0),
                               (16, 0.5, 'taylor', -30, 0), (8, 0.5, 'chebyshev', -25, 20), (12, 0.5, 'taylor', -25, 0)]:
    wts = np.ones(N_) if taper == 'uniform' else (windows.chebwin(N_, -sl) if taper == 'chebyshev' else windows.taylor(N_, nbar=4, sll=-sl, norm=True))
    F = af(wts, d, np.radians(scan))
    th = np.linspace(-np.pi / 2, np.pi / 2, 360001)
    ant['arrays'].append({'n': N_, 'spacing': d, 'taper': taper, 'sll': sl, 'scan': scan, 'weights': wts.tolist(),
                          'hpbw': hpbw(F, -np.pi / 2, np.pi / 2), 'sllDb': sll(F, -np.pi / 2, np.pi / 2),
                          'peakDeg': float(np.degrees(th[np.argmax(F(th))])),
                          'directivity': directivity_db(lambda psi: F(np.pi / 2 - psi))})
out['antenna'] = ant

# ---------------------------------------------------------------- calculators
c = 299792458.0; k = 1.380649e-23
out['calculators'] = {
    'fspl_2p4GHz_1km': float(20 * np.log10(4 * np.pi * 1000 * 2.4e9 / c)),
    'thermal_290K_1MHz': float(10 * np.log10(k * 290 * 1e6 / 1e-3)),
    'nf_cascade': float(10 * np.log10(10 ** 0.2 + (10 ** 0.5 - 1) / 10 ** 1.5 + (10 ** 1.0 - 1) / 10 ** 2.5)),
    'fresnel1_2p4GHz_1km_mid': float(np.sqrt(c / 2.4e9 * 500 * 500 / 1000)),
    'eirp': 20 + 6 - 2,
    'wavelength_915MHz': c / 915e6,
}
json.dump(out, open(__file__.replace('gen_reference.py', 'reference.json'), 'w'))
print('ok')
