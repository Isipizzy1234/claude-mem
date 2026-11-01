#!/usr/bin/env python3
"""Narration for a vote-series episode: Kokoro TTS line by line + word timings.

Each line is synthesised on its own, its silence trimmed, and the lines are
joined into one track. Line boundaries are therefore exact. Word times inside a
line come from the phoneme count of each word, snapped to the pauses the voice
actually makes at punctuation (no transcription model needed; works offline).

usage: python3 voice.py --lines lines.json --out-dir <project>/assets \
          [--voice am_michael] [--speed 1.1] [--lang en-us] [--gap 0.07]
lines.json: [{"id": "s01-0", "text": "Thirty days.", "pauseAfter": 0.0}, ...]
writes: <out-dir>/voice.wav and <out-dir>/timing.json
"""
import argparse
import json
import os
import re
import subprocess
import sys
import wave

import numpy as np

CACHE = os.path.expanduser("~/.cache/hyperframes/tts")
MODEL = os.path.join(CACHE, "models", "kokoro-v1.0.onnx")
VOICES = os.path.join(CACHE, "voices", "voices-v1.0.bin")
FRAME = 0.01  # analysis hop, seconds
PUNCT_END = re.compile(r"[,.;:!?—…]+[\"')\]]*$")


def ensure_model():
    if os.path.exists(MODEL) and os.path.exists(VOICES):
        return
    # Let the HyperFrames CLI download the model once.
    tmp = os.path.join(os.getcwd(), ".warmup.wav")
    subprocess.run(["npx", "hyperframes", "tts", "warm up", "-o", tmp], check=True)
    if os.path.exists(tmp):
        os.remove(tmp)


def frames_db(x, sr):
    hop = int(sr * FRAME)
    n = len(x) // hop
    if n == 0:
        return np.array([-120.0])
    seg = x[: n * hop].reshape(n, hop)
    rms = np.sqrt(np.mean(seg ** 2, axis=1) + 1e-12)
    return 20 * np.log10(rms + 1e-12)


def voiced_regions(x, sr, min_pause=0.11):
    db = frames_db(x, sr)
    thr = max(db.max() - 38.0, -55.0)
    voiced = db > thr
    idx = np.where(voiced)[0]
    if len(idx) == 0:
        return 0.0, len(x) / sr, []
    first, last = idx[0], idx[-1]
    pauses = []
    run_start = None
    for i in range(first, last + 1):
        if not voiced[i]:
            if run_start is None:
                run_start = i
        else:
            if run_start is not None and (i - run_start) * FRAME >= min_pause:
                pauses.append((run_start * FRAME, i * FRAME))
            run_start = None
    return first * FRAME, (last + 1) * FRAME, pauses


def clean_word(w):
    return re.sub(r"[^\w'$%.,-]", "", w).strip(".,") or w


def word_weights(kokoro, words, lang):
    out = []
    for w in words:
        cw = clean_word(w)
        try:
            ph = kokoro.tokenizer.phonemize(cw, lang)
            n = len(re.sub(r"\s", "", ph))
        except Exception:
            n = len(cw)
        out.append(max(2, n))
    return out


def distribute(words, weights, t0, t1):
    total = float(sum(weights)) or 1.0
    res, t = [], t0
    for w, k in zip(words, weights):
        d = (t1 - t0) * k / total
        res.append({"text": w, "start": round(t, 3), "end": round(t + d, 3)})
        t += d
    return res


def time_words_w(eng, text, v0, v1, pauses):
    words = text.split()
    if not words:
        return []
    weights = eng.weights(words)
    # groups split at punctuation
    groups, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        if PUNCT_END.search(w) and i < len(words) - 1:
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    need = len(groups) - 1
    if need > 0 and len(pauses) >= need:
        chosen = sorted(sorted(pauses, key=lambda p: p[1] - p[0], reverse=True)[:need])
        bounds = [v0] + [x for p in chosen for x in p] + [v1]
        res = []
        for gi, g in enumerate(groups):
            a, b = bounds[gi * 2], bounds[gi * 2 + 1]
            res += distribute([words[i] for i in g], [weights[i] for i in g], a, b)
        return res
    # fallback: one region, punctuation adds a little weight for the pause
    adj = [w + (3 if PUNCT_END.search(words[i]) else 0) for i, w in enumerate(weights)]
    return distribute(words, adj, v0, v1)


HERE = os.path.dirname(os.path.abspath(__file__))


def heygen_script():
    cands = [os.path.join(HERE, "..", "..", "media-use", "audio", "scripts", "heygen-tts.mjs")]
    npx = os.path.expanduser("~/.npm/_npx")
    if os.path.isdir(npx):
        for d in os.listdir(npx):
            cands.append(os.path.join(npx, d, "node_modules", "hyperframes", "dist", "skills", "media-use", "audio", "scripts", "heygen-tts.mjs"))
    for c in cands:
        if os.path.exists(c):
            return os.path.abspath(c)
    sys.exit("heygen-tts.mjs not found: install the HyperFrames skills (npx skills add heygen-com/hyperframes --agent claude-code -y)")


def read_wav_any(path, sr=24000):
    """Decode any audio file to mono float32 at sr via ffmpeg."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0, sr


class Kokoro_:
    def __init__(self, lang):
        ensure_model()
        from kokoro_onnx import Kokoro
        self.k = Kokoro(MODEL, VOICES)
        self.lang = lang

    def synth(self, text, voice, speed, tmpdir, idx):
        samples, sr = self.k.create(text, voice=voice, speed=speed, lang=self.lang)
        return np.asarray(samples, dtype=np.float32), sr, None

    def weights(self, words):
        return word_weights(self.k, words, self.lang)


class HeyGen_:
    """HeyGen Starfish voices: any language, word timestamps from the API."""

    def __init__(self, lang):
        self.script = heygen_script()
        self.lang = lang.split("-")[0]

    def synth(self, text, voice, speed, tmpdir, idx):
        wav = os.path.join(tmpdir, f"line{idx:03d}.wav")
        wj = os.path.join(tmpdir, f"line{idx:03d}.words.json")
        cmd = ["node", self.script, text, "-o", wav, "--words", wj, "--lang", self.lang, "--speed", str(speed)]
        if voice and voice not in ("auto", "default"):
            cmd += ["--voice", voice]
        subprocess.run(cmd, check=True)
        samples, sr = read_wav_any(wav)
        words = None
        if os.path.exists(wj):
            raw = json.load(open(wj))
            raw = raw.get("words", raw) if isinstance(raw, dict) else raw
            words = [{"text": w["text"], "start": float(w["start"]), "end": float(w["end"])} for w in raw if str(w.get("text", "")).strip()]
        return samples, sr, words

    def weights(self, words):
        return [max(2, len(clean_word(w))) for w in words]


class Silent_:
    """Draft timing without audio (for previews before a voice is available)."""

    def __init__(self, lang):
        self.lang = lang

    def synth(self, text, voice, speed, tmpdir, idx):
        sr = 24000
        words = text.split()
        dur, t, out = 0.0, 0.05, []
        for w in words:
            d = (0.07 * len(clean_word(w)) + 0.09) / speed
            out.append({"text": w, "start": t, "end": t + d})
            t += d + (0.22 / speed if PUNCT_END.search(w) else 0.0)
        dur = t + 0.05
        return np.zeros(int(dur * sr), dtype=np.float32), sr, out

    def weights(self, words):
        return [max(2, len(clean_word(w))) for w in words]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lines", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--provider", default="kokoro", choices=["kokoro", "heygen", "silent"])
    ap.add_argument("--voice", default="am_michael")
    ap.add_argument("--speed", type=float, default=1.1)
    ap.add_argument("--lang", default="en-us")
    ap.add_argument("--gap", type=float, default=0.07)
    ap.add_argument("--lead", type=float, default=0.15)
    a = ap.parse_args()

    eng = {"kokoro": Kokoro_, "heygen": HeyGen_, "silent": Silent_}[a.provider](a.lang)
    lines = json.load(open(a.lines))
    tmpdir = os.path.join(a.out_dir, ".voice-lines")
    os.makedirs(tmpdir, exist_ok=True)
    sr_out = None
    chunks = []
    t = a.lead
    out_lines = []
    pad = 0.03
    for i, ln in enumerate(lines):
        text = ln["text"].strip()
        samples, sr, api_words = eng.synth(text, ln.get("voice", a.voice), ln.get("speed", a.speed), tmpdir, i)
        if sr_out and sr != sr_out:
            samples = np.interp(np.arange(0, len(samples), sr / sr_out), np.arange(len(samples)), samples).astype(np.float32)
            sr = sr_out
        sr_out = sr_out or sr
        if a.provider == "silent":
            v0, v1, pauses = api_words[0]["start"], api_words[-1]["end"], []
        else:
            v0, v1, pauses = voiced_regions(samples, sr)
        s0 = max(0.0, v0 - pad)
        s1 = min(len(samples) / sr, v1 + pad)
        clip = samples[int(s0 * sr): int(s1 * sr)]
        if api_words:
            words = [{"text": w["text"], "start": round(w["start"] - s0, 3), "end": round(w["end"] - s0, 3)} for w in api_words]
        else:
            words = time_words_w(eng, text, v0 - s0, v1 - s0, [(p0 - s0, p1 - s0) for p0, p1 in pauses])
        for w in words:
            w["start"] = round(w["start"] + t, 3)
            w["end"] = round(w["end"] + t, 3)
        dur = len(clip) / sr
        out_lines.append({"id": ln["id"], "text": text, "start": round(t, 3), "end": round(t + dur, 3), "words": words})
        chunks.append(clip)
        gap = a.gap + float(ln.get("pauseAfter", 0) or 0)
        chunks.append(np.zeros(int(gap * sr), dtype=np.float32))
        t += dur + gap
        print(f"  {ln['id']:>8}  {dur:5.2f}s  {text}", file=sys.stderr)

    audio = np.concatenate([np.zeros(int(a.lead * sr_out), dtype=np.float32)] + chunks)
    peak = float(np.max(np.abs(audio))) or 1.0
    silent = a.provider == "silent"
    audio = audio / peak * 0.89  # about -1 dBFS peak
    os.makedirs(a.out_dir, exist_ok=True)
    wav_path = os.path.join(a.out_dir, "voice.wav")
    with wave.open(wav_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr_out)
        wf.writeframes((audio * 32767).astype(np.int16).tobytes())
    # Loudness for social video: about -15 LUFS integrated, true peak <= -1.5 dBTP.
    # Linear gain only (dynamic=false) so the word timings stay valid.
    tmp = wav_path + ".norm.wav"
    r = subprocess.CompletedProcess([], 1) if silent else subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav_path, "-af", "loudnorm=I=-15:TP=-1.5:LRA=11:linear=true", "-ar", str(sr_out), tmp])
    if r.returncode == 0 and os.path.exists(tmp):
        os.replace(tmp, wav_path)
    elif not silent:
        print("  ! ffmpeg loudnorm failed; voice left at peak-normalised level", file=sys.stderr)
    timing = {"provider": a.provider, "sampleRate": sr_out, "total": round(len(audio) / sr_out, 3), "voice": a.voice, "speed": a.speed, "lines": out_lines}
    json.dump(timing, open(os.path.join(a.out_dir, "timing.json"), "w"), indent=1)
    print(f"voice.wav {timing['total']}s, {len(out_lines)} lines", file=sys.stderr)


if __name__ == "__main__":
    main()
