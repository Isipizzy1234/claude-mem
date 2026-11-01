#!/usr/bin/env python3
"""Generate the pitch-explainer foley set from seeded, filtered noise.

    python3 make_sfx.py <outDir>

Writes 48 kHz mono WAVs:
  crowd-loop.wav   20 s seamless stadium murmur bed (very low in the mix)
  whoosh-1..3.wav  soft air swishes for camera moves / runs
  kick.wav         leather-on-boot thud for passes and shots
  net.wav          ball rippling the net
  cheer.wav        crowd swell for a goal / big moment

Everything is noise shaped in the frequency domain (no tones, no music), seeded
so every run produces identical files. Needs only numpy.
"""
import sys, os, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(20261101)


def write(path, x, peak_db=-3.0):
    x = np.asarray(x, dtype=np.float64)
    m = np.max(np.abs(x)) or 1.0
    x = x / m * (10 ** (peak_db / 20))
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def shaped_noise(n, lo, hi, tilt=0.0):
    """White noise band-limited to [lo, hi] Hz with a spectral tilt (dB/oct)."""
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.zeros_like(f)
    band = (f >= lo) & (f <= hi)
    g[band] = 1.0
    # soft edges
    edge = 0.25
    g += np.where((f < lo) & (f > lo * (1 - edge)), (f - lo * (1 - edge)) / (lo * edge), 0)
    g += np.where((f > hi) & (f < hi * (1 + edge)), 1 - (f - hi) / (hi * edge), 0)
    if tilt:
        g *= np.power(np.maximum(f, 20) / 1000.0, tilt / 6.02)
    return np.fft.irfft(spec * g, n)


def smooth_env(n, rate_hz, depth, seed_shift=0):
    """Slow random amplitude movement (seeded)."""
    k = max(4, int(n / SR * rate_hz) + 4)
    pts = 1 + depth * (rng.random(k) * 2 - 1)
    xs = np.linspace(0, n, k)
    return np.interp(np.arange(n), xs, pts)


def crowd_loop(seconds=20.0):
    n = int(SR * seconds)
    # many murmuring "voices": band noise with independent slow envelopes
    x = np.zeros(n)
    for i in range(14):
        lo = 180 + 40 * i
        v = shaped_noise(n, lo, lo * 3.2, tilt=-3)
        x += v * smooth_env(n, 1.5 + i * 0.2, 0.6)
    x += 0.6 * shaped_noise(n, 60, 400, tilt=-4)  # stadium rumble
    x += 0.15 * shaped_noise(n, 2000, 6000, tilt=-6) * smooth_env(n, 3, 0.8)  # air
    # make it loop seamlessly: crossfade tail into head
    fade = int(SR * 1.0)
    ramp = np.linspace(0, 1, fade)
    x[:fade] = x[:fade] * ramp + x[-fade:] * (1 - ramp)
    return x[: n - fade]


def whoosh(dur=0.55, f0=350, f1=2600, f2=700):
    n = int(SR * dur)
    hop, win = 256, 1024
    noise = rng.standard_normal(n + win)
    out = np.zeros(n + win)
    w = np.hanning(win)
    f = np.fft.rfftfreq(win, 1 / SR)
    for s in range(0, n, hop):
        k = s / n
        # centre frequency rises then falls (the pass-by)
        fc = f0 + (f1 - f0) * np.sin(np.pi * min(1, k / 0.6) / 2) if k < 0.6 else f1 + (f2 - f1) * (k - 0.6) / 0.4
        g = np.exp(-0.5 * ((np.log2(np.maximum(f, 20)) - np.log2(fc)) / 0.9) ** 2)
        seg = np.fft.irfft(np.fft.rfft(noise[s : s + win] * w) * g, win)
        out[s : s + win] += seg * w
    out = out[:n]
    t = np.linspace(0, 1, n)
    env = np.sin(np.pi * np.clip(t, 0, 1)) ** 1.6 * (0.6 + 0.4 * t)
    return out * env


def kick():
    n = int(SR * 0.28)
    t = np.arange(n) / SR
    # body: low pitch-dropping thud made from very low band noise + decaying sine-ish pulse
    thud = shaped_noise(n, 40, 220, tilt=-2) * np.exp(-t * 28)
    pulse = np.sin(2 * np.pi * (95 * t - 60 * t * t)) * np.exp(-t * 35)
    slap = shaped_noise(n, 900, 5000) * np.exp(-t * 180)
    return 0.7 * thud / np.max(np.abs(thud)) + 0.6 * pulse + 0.35 * slap / np.max(np.abs(slap))


def net():
    n = int(SR * 0.9)
    t = np.arange(n) / SR
    rustle = shaped_noise(n, 700, 7000, tilt=-2)
    rattle = 0.55 + 0.45 * np.sin(2 * np.pi * 23 * t) * np.exp(-t * 4)
    env = (1 - np.exp(-t * 120)) * np.exp(-t * 5.5)
    thump = shaped_noise(n, 50, 260) * np.exp(-t * 30)
    return rustle * rattle * env + 0.5 * thump / np.max(np.abs(thump))


def cheer(dur=3.5):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for i in range(10):
        lo = 300 + 90 * i
        x += shaped_noise(n, lo, lo * 3.5, tilt=-2) * smooth_env(n, 6, 0.4)
    env = np.clip(t / 0.5, 0, 1) ** 1.5 * np.exp(-np.maximum(0, t - 0.9) * 0.9)
    return x * env


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    write(os.path.join(out, "crowd-loop.wav"), crowd_loop(), -6)
    write(os.path.join(out, "whoosh-1.wav"), whoosh(0.5, 350, 2600, 700))
    write(os.path.join(out, "whoosh-2.wav"), whoosh(0.62, 280, 2100, 600))
    write(os.path.join(out, "whoosh-3.wav"), whoosh(0.45, 420, 3000, 900))
    write(os.path.join(out, "kick.wav"), kick())
    write(os.path.join(out, "net.wav"), net())
    write(os.path.join(out, "cheer.wav"), cheer(), -4)
    print("sfx written to", out)


if __name__ == "__main__":
    main()
