#!/usr/bin/env python3
"""Voice a lesson with Kokoro TTS (local, free) and write timings for the video.

    python3 scripts/tts.py 12              # voice lesson 12
    python3 scripts/tts.py 12 --estimate   # no TTS: estimate timings (for stills / quick checks)

Writes public/audio/L0012/<scene>.wav and public/audio/L0012/timings.json.
Each scene is read in one take for natural intonation; caption + "beat" timings come from
the pauses between lines (located with each line also read separately). If a pause can't be
found, that scene falls back to stitching the separately read lines (--stitched forces it).
Also generates the sound effects and ambient music bed into public/ if missing.

A line can also be a short piece of music instead of speech, so the video plays what the
narration talks about: {"text": "♪ caption", "notes": "Bb4:1 F5:3 r:1/2 Bb3+D4+F4:2",
"bpm": 100, "instrument": "brass"}. See synth_notes() for the notation.
"""

import argparse
import hashlib
import json
import math
import re
from fractions import Fraction
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
# Music lines: a short melody or chord progression synthesized in place of speech.
# ---------------------------------------------------------------------------

MUSIC_GAP = 0.45  # seconds of silence around a music line, so it doesn't run into speech
MUSIC_PEAK = 0.55  # quieter peak than speech (0.89): sustained tones sound louder
INSTRUMENTS = ("piano", "brass", "strings", "pure")
_NOTE = re.compile(r"^([A-Ga-g])([#b]?)(-?\d)$")
_STEP = {"c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}


def is_music(line) -> bool:
    return isinstance(line, dict) and "notes" in line


def midi_of(name: str) -> int:
    """Scientific pitch name → MIDI number: C4 (middle C) = 60, A4 = 69, Bb3 = 58, F#5 = 78."""
    m = _NOTE.match(name.strip())
    if not m:
        raise ValueError(f"bad note name {name!r}: use a letter, optional # or b, and an octave, e.g. Bb4")
    letter, acc, octave = m.groups()
    return 12 * (int(octave) + 1) + _STEP[letter.lower()] + {"#": 1, "b": -1, "": 0}[acc]


def parse_notes(spec: str) -> list[tuple[float, list[int]]]:
    """'Bb4:1 F5:3 r:1/2 Bb3+D4+F4:2' → [(beats, [midi, …]), …]; an empty list is a rest.
    Each token is PITCH:BEATS (beats may be a fraction like 1/3 or 0.5; default 1),
    chords join pitches with +, and r is a rest."""
    events = []
    for tok in spec.split():
        pitch, _, beats = tok.partition(":")
        dur = float(Fraction(beats)) if beats else 1.0
        if dur <= 0:
            raise ValueError(f"bad duration in {tok!r}")
        events.append((dur, [] if pitch.lower() == "r" else [midi_of(p) for p in pitch.split("+")]))
    if not events:
        raise ValueError("empty notes")
    return events


def music_duration(line) -> float:
    bpm = float(line.get("bpm", 100))
    return sum(b for b, _ in parse_notes(line["notes"])) * 60 / bpm + 0.35  # + release tail


def _tone(freq: float, dur: float, instrument: str, sr: int) -> np.ndarray:
    """One note of `dur` seconds plus a short release, by additive synthesis."""
    rel = 0.35 if instrument == "piano" else 0.2
    n = int((dur + rel) * sr)
    t = np.arange(n) / sr
    vib = 1.0
    if instrument in ("strings", "brass"):
        depth = 0.004 if instrument == "strings" else 0.0025
        vib = 1 + depth * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.25) / 0.3, 0, 1)
    phase = 2 * np.pi * np.cumsum(freq * vib) / sr
    if instrument == "pure":
        wave = np.sin(phase)
        env = np.minimum(1, t / 0.01)
    elif instrument == "piano":
        wave = sum(np.sin(k * phase) * np.exp(-t * (1.2 + 0.7 * k)) / k**1.3 for k in range(1, 9))
        env = np.minimum(1, t / 0.004)
    elif instrument == "brass":
        bright = np.clip(t / 0.08, 0, 1)  # high partials bloom in, like a horn's attack
        wave = sum(np.sin(k * phase) / k * (bright if k > 3 else 1) for k in range(1, 13) if k * freq < 9000)
        env = np.minimum(1, t / 0.035)
    else:  # strings: two slightly detuned sawtooth-ish voices
        phase2 = phase * 1.003
        wave = sum((np.sin(k * phase) + np.sin(k * phase2)) / (2 * k) for k in range(1, 11) if k * freq < 9000)
        env = np.minimum(1, t / 0.12)
    release = np.where(t < dur, 1, np.clip((dur + rel - t) / rel, 0, 1))
    return wave * env * release


def synth_notes(line, sr: int) -> tuple[np.ndarray, list[dict]]:
    """Render a music line. Returns the samples and the notes as [{"t", "d", "midi"}]
    (seconds from the line start), which the video uses to light up notes as they sound."""
    bpm = float(line.get("bpm", 100))
    instrument = line.get("instrument", "piano")
    if instrument not in INSTRUMENTS:
        raise ValueError(f"unknown instrument {instrument!r}: one of {', '.join(INSTRUMENTS)}")
    events = parse_notes(line["notes"])
    beat = 60 / bpm
    total = music_duration(line)
    out = np.zeros(int(total * sr) + sr)
    notes, cursor = [], 0.0
    for beats, pitches in events:
        dur = beats * beat
        if pitches:
            notes.append({"t": round(cursor, 3), "d": round(dur, 3), "midi": pitches})
            for m in pitches:
                tone = _tone(440 * 2 ** ((m - 69) / 12), dur, instrument, sr) / max(1, len(pitches)) ** 0.5
                s0 = int(cursor * sr)
                out[s0 : s0 + len(tone)] += tone[: len(out) - s0]
        cursor += dur
    out = out[: int(total * sr)]
    out = np.convolve(out, np.ones(3) / 3, "same")  # take the edge off the highest partials
    return out / (np.abs(out).max() or 1) * MUSIC_PEAK, notes


def speak_run(kokoro, says: list[str], voice: str, speed: float, lang: str, stitched: bool):
    """Voice consecutive spoken lines. Returns (audio or None, sample rate, [(start, end)], mode)."""
    sr, chunks, spans, cursor = 24000, [], [], 0.0
    for i, say in enumerate(says):
        if kokoro is None:
            size = len(say.split()) / WORDS_PER_SEC if spaced(voice) else len(say.replace(" ", "")) / CHARS_PER_SEC
            dur = max(1.2, size)
        else:
            samples, sr = kokoro.create(say, voice=voice, speed=speed, lang=lang)
            samples = trim(np.asarray(samples, dtype=np.float32), sr)
            dur = len(samples) / sr
            chunks.append(samples)
            if i < len(says) - 1:
                chunks.append(np.zeros(int(GAP * sr), dtype=np.float32))
        spans.append((cursor, cursor + dur))
        cursor += dur + (GAP if i < len(says) - 1 else 0)
    if kokoro is None:
        return None, sr, spans, "estimate"
    audio, mode = np.concatenate(chunks), "stitched"
    if not stitched and len(says) > 1:
        # Read the run in one take for natural intonation; keep per-line timings by
        # finding the pauses between lines.
        take, sr = kokoro.create(" ".join(says), voice=voice, speed=speed, lang=lang)
        take = trim(np.asarray(take, dtype=np.float32), sr)
        found = align_one_take(take, sr, [b - a for a, b in spans])
        if found is not None:
            audio, mode, spans = take, "one take", found
    return audio / (np.abs(audio).max() or 1) * 0.89, sr, spans, mode

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
        json.dumps([meta["scenes"], voice, lang, speed, args.estimate, args.stitched, "one-take-v1", "music-v1"], sort_keys=True).encode()
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
        # Consecutive spoken lines are voiced together; each music line is synthesized on its own.
        groups: list[list] = []
        for line in scene["lines"]:
            if is_music(line) or not groups or is_music(groups[-1][0]):
                groups.append([line])
            else:
                groups[-1].append(line)
        sr = 24000
        lines, parts, modes, cursor = [], [], [], 0.0
        for gi, group in enumerate(groups):
            music = is_music(group[0])
            if gi > 0:
                gap = MUSIC_GAP if music or is_music(groups[gi - 1][0]) else GAP
                parts.append(np.zeros(int(gap * sr), dtype=np.float32))
                cursor += gap
            if music:
                line = group[0]
                if kokoro is None:
                    dur, notes = music_duration(line), synth_notes(line, 8000)[1]
                else:
                    audio, notes = synth_notes(line, sr)
                    parts.append(audio.astype(np.float32))
                    dur = len(audio) / sr
                lines.append({"text": line["text"], "start": round(cursor, 3), "end": round(cursor + dur, 3), "music": True, "notes": notes})
                modes.append("music")
                cursor += dur
                continue
            texts = [line_text(l)[0] for l in group]
            audio, sr, spans, mode = speak_run(kokoro, [line_text(l)[1] for l in group], voice, speed, lang, args.stitched)
            if audio is not None:
                parts.append(audio.astype(np.float32))
                dur = len(audio) / sr
            else:
                dur = spans[-1][1]
            lines += [{"text": t, "start": round(cursor + a, 3), "end": round(cursor + b, 3)} for t, (a, b) in zip(texts, spans)]
            modes.append(mode)
            cursor += dur
        file = None
        if kokoro is not None and parts:
            write_wav(out / f"{scene['id']}.wav", np.concatenate(parts), sr)
            file = f"audio/L{n:04d}/{scene['id']}.wav"
        scenes.append({"id": scene["id"], "file": file, "duration": round(cursor, 3), "lines": lines})
        print(f"  {scene['id']:<20} {cursor:5.1f}s  ({' + '.join(dict.fromkeys(modes))})", flush=True)

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
