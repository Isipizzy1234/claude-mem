#!/usr/bin/env python3
"""Kokoro TTS with voice blending, per-line speed and a broadcast vocal chain.

    python3 tts.py --voice am_puck:0.6,am_fenrir:0.4 --speed 1.12 --fx punch \
                   --text "And it works!" --out line.wav

--voice   one voice id, or a blend "id:weight,id:weight" (weights are normalised)
--speed   speaking rate (1.0 = normal)
--fx      none | punch | hype  (punch = presence EQ + compression + limiter, sounds
          like a hyped commentator mic instead of a flat read)

Uses the Kokoro model that `npx hyperframes tts` downloads to
~/.cache/hyperframes/tts (run that once if the files are missing).
"""
import argparse, os, subprocess, sys, tempfile
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

CACHE = os.path.expanduser("~/.cache/hyperframes/tts")
MODEL = os.path.join(CACHE, "models", "kokoro-v1.0.onnx")
VOICES = os.path.join(CACHE, "voices", "voices-v1.0.bin")

FX = {
    "none": None,
    # high-pass rumble, cut mud, lift presence + air, firm compression, limiter
    "punch": ",".join([
        "highpass=f=75",
        "equalizer=f=220:t=q:w=1.2:g=-2.5",
        "equalizer=f=3300:t=q:w=1.4:g=4",
        "equalizer=f=8500:t=q:w=1.0:g=2.5",
        "acompressor=threshold=-22dB:ratio=4:attack=4:release=70:makeup=5",
        "alimiter=limit=0.89:attack=2:release=40",
    ]),
    # hype = punch + slightly higher, brighter and denser: an excited commentator
    "hype": ",".join([
        "highpass=f=85",
        "rubberband=pitch=1.035:formant=preserved",
        "equalizer=f=250:t=q:w=1.2:g=-3",
        "equalizer=f=2800:t=q:w=1.2:g=5",
        "equalizer=f=9000:t=q:w=1.0:g=3",
        "aexciter=amount=1.5:drive=6:blend=0:freq=3500",
        "acompressor=threshold=-26dB:ratio=6:attack=3:release=60:makeup=7",
        "asoftclip=type=tanh:threshold=0.9",
        "alimiter=limit=0.8:attack=2:release=40",
    ]),
}


def style_for(k: Kokoro, spec: str):
    parts = [p for p in spec.split(",") if p]
    if len(parts) == 1 and ":" not in parts[0]:
        return parts[0]
    total, mix = 0.0, None
    for p in parts:
        vid, w = (p.split(":") + ["1"])[:2]
        w = float(w)
        s = k.get_voice_style(vid) * w
        mix = s if mix is None else mix + s
        total += w
    return mix / total


def lang_for(spec: str):
    first = spec.split(",")[0].split(":")[0]
    return "en-gb" if first.startswith("b") else "en-us"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="am_michael")
    ap.add_argument("--speed", type=float, default=1.05)
    ap.add_argument("--fx", default="punch", choices=list(FX))
    ap.add_argument("--text", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    if not (os.path.exists(MODEL) and os.path.exists(VOICES)):
        sys.exit("Kokoro model missing: run `npx hyperframes tts \"hello\" -o /tmp/x.wav` once to download it")
    k = Kokoro(MODEL, VOICES)
    samples, sr = k.create(a.text, voice=style_for(k, a.voice), speed=a.speed, lang=lang_for(a.voice))
    # trim leading/trailing silence so beats start on the word
    thr = 0.01 * np.max(np.abs(samples))
    idx = np.where(np.abs(samples) > thr)[0]
    if len(idx):
        samples = samples[max(0, idx[0] - int(0.03 * sr)): idx[-1] + int(0.12 * sr)]

    chain = FX[a.fx]
    if not chain:
        sf.write(a.out, samples, sr)
        return
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, samples, sr)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp.name, "-af", chain, "-ar", "48000", a.out], check=True)
    os.unlink(tmp.name)


if __name__ == "__main__":
    main()
