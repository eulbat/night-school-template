#!/usr/bin/env python3
"""Voice a lesson with Kokoro TTS (local, free) and write timings for the video.

    python3 scripts/tts.py 12              # voice lesson 12
    python3 scripts/tts.py 12 --estimate   # no TTS: estimate timings (for stills / quick checks)

Writes public/audio/L0012/<scene>.wav and public/audio/L0012/timings.json.
Each scene is read in one take for natural intonation; caption + "beat" timings come from
the pauses between lines (located with each line also read separately). If a pause can't be
found, that scene falls back to stitching the separately read lines (--stitched forces it).
Also generates the sound effects and ambient music bed into public/ if missing.
"""

import argparse
import hashlib
import json
import math
import sys
import urllib.request
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "models"
MODEL_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
MODEL_FILES = ["kokoro-v1.0.onnx", "voices-v1.0.bin"]
DEFAULT_VOICE = "am_michael"
GAP = 0.32  # seconds of silence between lines
WORDS_PER_SEC = 2.6  # used by --estimate
CHARS_PER_SEC = 6.0  # the same, for languages written without spaces (Japanese, Chinese)
LANGUAGES = json.loads((ROOT / "src" / "kit" / "languages.json").read_text())


def find_lesson(arg: str) -> Path:
    p = Path(arg)
    if p.is_dir():
        return p
    n = int(arg)
    matches = sorted((ROOT / "lessons").glob(f"{n:04d}-*"))
    if not matches:
        sys.exit(f"No lesson folder lessons/{n:04d}-*")
    return matches[0]


def track_voice(track: str) -> str | None:
    """The voice set for a track in curriculum.json (each topic has its own narrator)."""
    tracks = json.loads((ROOT / "curriculum" / "curriculum.json").read_text())["tracks"]
    return tracks.get(track, {}).get("voice")


def default_voice() -> str:
    """The first voice of the curriculum's language (DEFAULT_VOICE for English)."""
    language = json.loads((ROOT / "curriculum" / "curriculum.json").read_text()).get("language", "en")
    return DEFAULT_VOICE if language == "en" else LANGUAGES[language]["voices"][0]


def voice_lang(voice: str) -> str:
    """Kokoro voice ids start with a language letter ('a' American English, 'f' French…);
    src/kit/languages.json maps it to the espeak-ng pronunciation code."""
    for lang in LANGUAGES.values():
        if voice[0] in lang["pronunciation"]:
            return lang["pronunciation"][voice[0]]
    sys.exit(f"Unknown voice {voice}: see src/kit/languages.json")


def spaced(voice: str) -> bool:
    """False for languages written without spaces between words."""
    return next((l.get("spaces", True) for l in LANGUAGES.values() if voice[0] in l["pronunciation"]), True)


def write_wav(path: Path, samples: np.ndarray, sr: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(samples, -1, 1)
    pcm = (pcm * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def ensure_models() -> None:
    MODELS.mkdir(exist_ok=True)
    for f in MODEL_FILES:
        dest = MODELS / f
        if not dest.exists():
            print(f"downloading {f} …", flush=True)
            urllib.request.urlretrieve(MODEL_URL + f, dest)


def line_text(line):
    """A line is "text" or {"text": caption, "say": how to pronounce it}."""
    if isinstance(line, str):
        return line, line
    return line["text"], line.get("say", line["text"])


def trim(samples: np.ndarray, sr: int, thresh=0.01) -> np.ndarray:
    idx = np.where(np.abs(samples) > thresh)[0]
    if len(idx) == 0:
        return samples
    pad = int(0.04 * sr)
    return samples[max(0, idx[0] - pad) : min(len(samples), idx[-1] + pad)]


def pauses(samples: np.ndarray, sr: int, min_len=0.2) -> list[tuple[float, float]]:
    """Quiet stretches (start, end) in seconds inside the audio, longest-first candidates for line breaks."""
    win = int(0.01 * sr)
    n = len(samples) // win
    rms = np.sqrt((samples[: n * win].reshape(n, win) ** 2).mean(axis=1))
    quiet = rms < 0.04 * np.percentile(rms, 95)
    runs, i = [], 0
    while i < n:
        j = i
        while j < n and quiet[j]:
            j += 1
        if j > i and (j - i) * 0.01 >= min_len and i > 0 and j < n:
            runs.append((i * 0.01, j * 0.01))
        i = max(j, i + 1)
    return runs


def align_one_take(samples: np.ndarray, sr: int, line_durs: list[float]) -> list[tuple[float, float]] | None:
    """Split a scene read in one take into per-line (start, end) times.

    Each line break is the longest pause near where it is expected, predicted from the
    lengths of the lines read separately and re-anchored after every break so errors
    don't accumulate. Returns None when a break can't be found (caller falls back to
    stitching separately read lines)."""
    total = len(samples) / sr
    runs = pauses(samples, sr)
    spans, cursor, used = [], 0.0, -1
    for i in range(len(line_durs) - 1):
        rest = sum(line_durs[i:])
        expected = cursor + line_durs[i] * (total - cursor) / rest
        best, score = None, -1e9
        for k, (a, b) in enumerate(runs):
            mid = (a + b) / 2
            if k <= used or a <= cursor + 0.5 or abs(mid - expected) > 1.5:
                continue
            sc = (b - a) - 0.4 * abs(mid - expected)
            if sc > score:
                best, score = k, sc
        if best is None:
            return None
        a, b = runs[best]
        spans.append((cursor, a))
        cursor, used = b, best
    spans.append((cursor, total))
    return spans


# ---------------------------------------------------------------------------
# Sound design: tiny synthesized SFX + an ambient pad, so no assets are needed.
# ---------------------------------------------------------------------------

SR_FX = 44100


def _env(n, attack, release_curve):
    t = np.linspace(0, 1, n)
    a = np.minimum(1, t / max(attack, 1e-6))
    return a * release_curve(t)


def make_sfx(out: Path) -> None:
    rng = np.random.default_rng(7)
    fx = {}
    # pop: falling sine blip
    n = int(0.11 * SR_FX)
    t = np.arange(n) / SR_FX
    f = np.linspace(950, 260, n)
    fx["pop"] = np.sin(2 * np.pi * np.cumsum(f) / SR_FX) * np.exp(-t * 38) * 0.9
    # click: short filtered noise tick
    n = int(0.03 * SR_FX)
    noise = rng.standard_normal(n)
    fx["click"] = np.convolve(noise, np.ones(6) / 6, "same") * np.exp(-np.arange(n) / SR_FX * 160) * 0.8
    # whoosh: noise with a sweeping one-pole low-pass and a rise/fall envelope
    n = int(0.6 * SR_FX)
    noise = rng.standard_normal(n)
    y = np.zeros(n)
    acc = 0.0
    cut = np.concatenate([np.linspace(0.02, 0.25, n // 2), np.linspace(0.25, 0.03, n - n // 2)])
    for i in range(n):
        acc += cut[i] * (noise[i] - acc)
        y[i] = acc
    env = np.sin(np.linspace(0, np.pi, n)) ** 2
    fx["whoosh"] = y / (np.abs(y).max() + 1e-9) * env * 0.8
    # ding: bell partials
    n = int(1.4 * SR_FX)
    t = np.arange(n) / SR_FX
    bell = sum(a * np.sin(2 * np.pi * fr * t) * np.exp(-t * d) for fr, a, d in [(1046.5, 1, 3), (2093, 0.35, 5), (3136, 0.15, 8), (1568, 0.2, 4)])
    fx["ding"] = bell / np.abs(bell).max() * 0.7
    # swell: soft rising major chord
    n = int(2.2 * SR_FX)
    t = np.arange(n) / SR_FX
    chord = sum(np.sin(2 * np.pi * fr * t) for fr in [261.6, 329.6, 392.0, 523.3])
    env = np.minimum(1, t / 1.2) * np.exp(-np.maximum(0, t - 1.2) * 3)
    fx["swell"] = chord / 4 * env * 0.7
    for name, s in fx.items():
        write_wav(out / f"{name}.wav", s, SR_FX)


def make_music(path: Path) -> None:
    """A slow, warm Am–F–C–G pad, ~96 s, crossfaded to loop seamlessly."""
    sr = 22050
    seg = 12.0
    chords = [
        [110.0, 164.8, 220.0, 261.6, 329.6],  # Am
        [87.3, 130.8, 174.6, 220.0, 261.6],  # F
        [130.8, 196.0, 261.6, 329.6, 392.0],  # C
        [98.0, 146.8, 196.0, 246.9, 293.7],  # G
    ] * 2
    xf = 3.0
    total = seg * len(chords)
    n = int((total + xf) * sr)
    out = np.zeros(n)
    t_all = np.arange(n) / sr
    for i, ch in enumerate(chords):
        start = i * seg - xf / 2
        s0 = max(0, int(start * sr))
        s1 = min(n, int((start + seg + xf) * sr))
        t = t_all[s0:s1]
        local = t - start
        env = np.clip(local / xf, 0, 1) * np.clip((seg + xf - local) / xf, 0, 1)
        env = np.sin(env * np.pi / 2) ** 2
        tone = np.zeros_like(t)
        for k, fr in enumerate(ch):
            det = 1 + (0.0025 if k % 2 else -0.0025)
            lfo = 0.75 + 0.25 * np.sin(2 * np.pi * (0.07 + 0.02 * k) * t + k)
            tone += (np.sin(2 * np.pi * fr * t) + 0.5 * np.sin(2 * np.pi * fr * det * t) + 0.12 * np.sin(4 * np.pi * fr * t)) * lfo
        out[s0:s1] += tone * env
    # shimmer
    out += 0.08 * np.sin(2 * np.pi * 880 * t_all) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t_all)) ** 4
    # loop crossfade: fold the tail into the head
    m = int(xf * sr)
    body = out[: n - m].copy()
    fade = np.linspace(0, 1, m)
    body[:m] = body[:m] * fade + out[n - m :] * (1 - fade)
    body = np.convolve(body, np.ones(5) / 5, "same")  # gentle low-pass
    body = body / np.abs(body).max() * 0.6
    write_wav(path, body, sr)


def ensure_sound_design() -> None:
    sfx = ROOT / "public" / "sfx"
    if not (sfx / "swell.wav").exists():
        make_sfx(sfx)
    music = ROOT / "public" / "music" / "ambient.wav"
    if not music.exists():
        make_music(music)


# ---------------------------------------------------------------------------


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("lesson")
    ap.add_argument("--estimate", action="store_true", help="skip TTS, estimate durations from word count")
    ap.add_argument("--voice", default=None)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--stitched", action="store_true", help="read each line separately (old behaviour) instead of one take per scene")
    args = ap.parse_args()

    ensure_sound_design()

    ldir = find_lesson(args.lesson)
    meta = json.loads((ldir / "lesson.json").read_text())
    n = meta["number"]
    voice = args.voice or meta.get("voice") or track_voice(meta["track"]) or default_voice()
    lang = voice_lang(voice)
    speed = float(meta.get("speed", 1.0))
    out = ROOT / "public" / "audio" / f"L{n:04d}"
    out.mkdir(parents=True, exist_ok=True)

    digest = hashlib.sha256(
        json.dumps([meta["scenes"], voice, lang, speed, args.estimate, args.stitched, "one-take-v1"], sort_keys=True).encode()
    ).hexdigest()
    stamp = out / ".hash"
    if not args.force and stamp.exists() and stamp.read_text() == digest and (out / "timings.json").exists():
        print(f"L{n:04d}: audio up to date")
        return

    kokoro = None
    if not args.estimate:
        ensure_models()
        import os

        from kokoro_onnx import Kokoro
        from kokoro_onnx.config import EspeakConfig

        # The espeak-ng bundled with kokoro-onnx can ignore its data path on some
        # platforms; CI points these at a system espeak-ng install instead.
        espeak = None
        if os.environ.get("KOKORO_ESPEAK_LIB") or os.environ.get("KOKORO_ESPEAK_DATA"):
            espeak = EspeakConfig(lib_path=os.environ.get("KOKORO_ESPEAK_LIB"), data_path=os.environ.get("KOKORO_ESPEAK_DATA"))
        kokoro = Kokoro(str(MODELS / MODEL_FILES[0]), str(MODELS / MODEL_FILES[1]), espeak_config=espeak)

    scenes = []
    for scene in meta["scenes"]:
        lines = []
        cursor = 0.0
        chunks = []
        sr = 24000
        says = [line_text(line)[1] for line in scene["lines"]]
        for i, line in enumerate(scene["lines"]):
            text, say = line_text(line)
            if kokoro is None:
                size = len(say.split()) / WORDS_PER_SEC if spaced(voice) else len(say.replace(" ", "")) / CHARS_PER_SEC
                dur = max(1.2, size)
            else:
                samples, sr = kokoro.create(say, voice=voice, speed=speed, lang=lang)
                samples = trim(np.asarray(samples, dtype=np.float32), sr)
                dur = len(samples) / sr
                chunks.append(samples)
                if i < len(scene["lines"]) - 1:
                    chunks.append(np.zeros(int(GAP * sr), dtype=np.float32))
            lines.append({"text": text, "start": round(cursor, 3), "end": round(cursor + dur, 3)})
            cursor += dur + (GAP if i < len(scene["lines"]) - 1 else 0)
        audio = np.concatenate(chunks) if chunks else None
        mode = "estimate" if kokoro is None else "stitched"
        if kokoro is not None and not args.stitched and len(says) > 1:
            # Read the whole scene in one take for natural intonation; keep per-line
            # timings by finding the pauses between lines.
            take, sr = kokoro.create(" ".join(says), voice=voice, speed=speed, lang=lang)
            take = trim(np.asarray(take, dtype=np.float32), sr)
            spans = align_one_take(take, sr, [l["end"] - l["start"] for l in lines])
            if spans is not None:
                audio, mode = take, "one take"
                lines = [{"text": l["text"], "start": round(a, 3), "end": round(b, 3)} for l, (a, b) in zip(lines, spans)]
                cursor = len(take) / sr
        file = None
        if audio is not None:
            peak = np.abs(audio).max() or 1
            audio = audio / peak * 0.89
            write_wav(out / f"{scene['id']}.wav", audio, sr)
            file = f"audio/L{n:04d}/{scene['id']}.wav"
        scenes.append({"id": scene["id"], "file": file, "duration": round(cursor, 3), "lines": lines})
        print(f"  {scene['id']:<20} {cursor:5.1f}s  ({mode})", flush=True)

    timings = {
        "lesson": n,
        "title": meta["title"],
        "subtitle": meta.get("subtitle", ""),
        "track": meta["track"],
        "objectives": meta.get("objectives", []),
        "scenes": scenes,
    }
    (out / "timings.json").write_text(json.dumps(timings, indent=2))
    stamp.write_text(digest)
    total = sum(s["duration"] for s in scenes)
    print(f"L{n:04d}: {len(scenes)} scenes, {total / 60:.1f} min of narration{' (estimated)' if args.estimate else ''}")


if __name__ == "__main__":
    main()
