#!/usr/bin/env python3
"""Generate Siren Shore's original looping camp-aquatic score."""

from __future__ import annotations

import argparse
import math
import random
import struct
import subprocess
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "games/siren-shore/assets/siren-score.mp3"
RATE = 44_100
DURATION = 96.0
TEMPO = 104.0
BEAT = 60.0 / TEMPO

CHORDS = [
    (48, 55, 60, 64),  # Cmaj7
    (45, 52, 57, 60),  # Am7
    (41, 48, 53, 57),  # Fmaj7
    (43, 50, 55, 59),  # G7
    (46, 53, 58, 62),  # Bbmaj7: theatrical side-eye
    (43, 50, 55, 59),
    (45, 52, 57, 60),
    (41, 48, 53, 57),
]
MELODY = [72, 76, 79, 81, 79, 76, 74, 72, 69, 72, 76, 77, 76, 72, 69, 67,
          72, 74, 76, 79, 81, 83, 81, 79, 77, 76, 74, 72, 71, 72, 74, 76]


def hz(midi: int) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def triangle(phase: float) -> float:
    return 2.0 * abs(2.0 * (phase - math.floor(phase + 0.5))) - 1.0


def envelope(position: float, length: float, attack: float = 0.02, release: float = 0.22) -> float:
    return min(1.0, position / attack) * min(1.0, max(0.0, length - position) / release)


def synth_frame(t: float, rng: random.Random) -> tuple[float, float]:
    beat_number = t / BEAT
    beat_phase = beat_number % 1.0
    bar = int(beat_number // 4)
    chord = CHORDS[bar % len(CHORDS)]
    phrase = (bar // len(CHORDS)) % 4

    # Wide, moving harmony: unmistakably musical rather than an ambient drone.
    left = right = 0.0
    for index, note in enumerate(chord):
        frequency = hz(note)
        shimmer = 1.0 + 0.0018 * math.sin(2 * math.pi * (0.07 + index * 0.013) * t)
        voice = math.sin(2 * math.pi * frequency * shimmer * t + index * 0.8)
        voice += 0.28 * math.sin(2 * math.pi * frequency * 2.0 * t + index)
        pan = -0.65 + index * 0.42
        left += voice * (1.0 - pan) * 0.035
        right += voice * (1.0 + pan) * 0.035

    # Elastic bass follows roots with octave jumps every other bar.
    bass_note = chord[0] - 12 + (12 if int(beat_number) % 8 == 7 else 0)
    bass = triangle(hz(bass_note) * t) * (0.16 + 0.05 * math.sin(math.pi * beat_phase))
    left += bass * 0.92
    right += bass * 0.84

    # Four-on-the-floor pulse kept restrained enough for long play.
    kick_t = beat_phase * BEAT
    kick_freq = 48 + 75 * math.exp(-kick_t * 18)
    kick = math.sin(2 * math.pi * kick_freq * kick_t) * math.exp(-kick_t * 14) * 0.34
    left += kick
    right += kick

    # Off-beat bubble percussion and a tiny deterministic hiss.
    eighth_phase = (beat_number * 2) % 1.0
    if int(beat_number * 2) % 2:
        bubble_t = eighth_phase * (BEAT / 2)
        bubble = math.sin(2 * math.pi * (930 - bubble_t * 1400) * bubble_t) * math.exp(-bubble_t * 34) * 0.12
        left += bubble * 0.65
        right += bubble

    # Plucked arpeggio makes the harmony readable.
    sixteenth = int(beat_number * 4)
    arp_note = chord[sixteenth % len(chord)] + 12 + (12 if phrase == 2 else 0)
    arp_t = (beat_number * 4 % 1.0) * (BEAT / 4)
    arp = triangle(hz(arp_note) * t) * envelope(arp_t, BEAT / 4, 0.005, 0.09) * 0.11
    left += arp * (0.7 if sixteenth % 2 else 1.0)
    right += arp * (1.0 if sixteenth % 2 else 0.7)

    # A recurring hook enters after the first eight bars, then changes register.
    if bar >= 8:
        melody_index = int(beat_number * 2) % len(MELODY)
        melody_note = MELODY[melody_index] + (12 if phrase == 3 and melody_index % 8 == 6 else 0)
        note_t = eighth_phase * (BEAT / 2)
        lead = math.sin(2 * math.pi * hz(melody_note) * t)
        lead += 0.24 * math.sin(2 * math.pi * hz(melody_note) * 2 * t)
        lead *= envelope(note_t, BEAT / 2, 0.018, 0.14) * 0.13
        pan = math.sin(melody_index * 1.7) * 0.45
        left += lead * (1 - pan)
        right += lead * (1 + pan)

    # A theatrical crash every eight bars: the musical equivalent of entering a room.
    cycle_t = (beat_number % 32) * BEAT
    if cycle_t < 1.4:
        wash = (rng.random() * 2 - 1) * math.exp(-cycle_t * 2.8) * 0.035
        left += wash
        right -= wash * 0.6

    # Gentle master movement and soft clipping.
    master = 0.72 + 0.06 * math.sin(2 * math.pi * t / 24)
    return math.tanh(left * master), math.tanh(right * master)


def generate(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    rng = random.Random(1987)
    with tempfile.TemporaryDirectory() as directory:
        wav_path = Path(directory) / "siren-score.wav"
        with wave.open(str(wav_path), "wb") as audio:
            audio.setnchannels(2)
            audio.setsampwidth(2)
            audio.setframerate(RATE)
            chunk = bytearray()
            for frame in range(int(DURATION * RATE)):
                left, right = synth_frame(frame / RATE, rng)
                chunk.extend(struct.pack("<hh", int(left * 29_000), int(right * 29_000)))
                if len(chunk) >= 262_144:
                    audio.writeframesraw(chunk)
                    chunk.clear()
            if chunk:
                audio.writeframesraw(chunk)
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path),
            "-codec:a", "libmp3lame", "-b:a", "64k", "-ar", str(RATE), "-ac", "2", str(output),
        ], check=True)


def check(output: Path) -> None:
    if not output.exists() or output.stat().st_size < 500_000:
        raise SystemExit("Siren score is missing or implausibly small")
    subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", str(output)], check=True, stdout=subprocess.DEVNULL)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    check(OUTPUT) if args.check else generate(OUTPUT)
