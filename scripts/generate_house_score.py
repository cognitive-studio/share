#!/usr/bin/env python3
"""Render the original chamber-horror cue used by the survival game."""

from pathlib import Path
import subprocess
import tempfile
import wave

import numpy as np


SAMPLE_RATE = 44_100
DURATION = 64.0
BAR = 4.0
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "quizzes/youre-next-survival/assets/house-score.mp3"
RNG = np.random.default_rng(731)


def time_axis(duration=DURATION):
    return np.arange(int(SAMPLE_RATE * duration), dtype=np.float64) / SAMPLE_RATE


def add_tone(track, start, duration, frequency, gain, character="string", pan=0.0):
    begin = int(start * SAMPLE_RATE)
    length = min(int(duration * SAMPLE_RATE), len(track) - begin)
    if length <= 0:
        return
    t = np.arange(length, dtype=np.float64) / SAMPLE_RATE
    attack = np.minimum(1.0, t / (0.035 if character == "bell" else 0.38))
    release = np.minimum(1.0, (duration - t) / (0.16 if character == "bell" else 0.72))
    envelope = np.clip(attack * release, 0.0, 1.0)

    if character == "bell":
        envelope *= np.exp(-3.2 * t / max(duration, 0.01))
        signal = (
            np.sin(2 * np.pi * frequency * t)
            + 0.42 * np.sin(2 * np.pi * frequency * 2.01 * t)
            + 0.16 * np.sin(2 * np.pi * frequency * 3.97 * t)
        )
    else:
        vibrato = 1.0 + 0.0023 * np.sin(2 * np.pi * 4.7 * t)
        phase = 2 * np.pi * frequency * np.cumsum(vibrato) / SAMPLE_RATE
        signal = (
            np.sin(phase)
            + 0.34 * np.sin(2 * phase + 0.3)
            + 0.15 * np.sin(3 * phase + 0.8)
            + 0.07 * np.sin(5 * phase)
        )

    left = np.sqrt((1.0 - pan) / 2.0)
    right = np.sqrt((1.0 + pan) / 2.0)
    rendered = gain * envelope * signal
    track[begin:begin + length, 0] += rendered * left
    track[begin:begin + length, 1] += rendered * right


def add_heartbeat(track, start, gain):
    duration = 0.42
    begin = int(start * SAMPLE_RATE)
    length = min(int(duration * SAMPLE_RATE), len(track) - begin)
    if length <= 0:
        return
    t = np.arange(length, dtype=np.float64) / SAMPLE_RATE
    frequency = 76 - 42 * (t / duration)
    phase = 2 * np.pi * np.cumsum(frequency) / SAMPLE_RATE
    signal = np.sin(phase) * np.exp(-11 * t) * gain
    signal += RNG.normal(0, 1, length) * np.exp(-28 * t) * gain * 0.08
    track[begin:begin + length, 0] += signal * 0.72
    track[begin:begin + length, 1] += signal * 0.72


def add_metal(track, start, gain, pan):
    duration = 2.2
    begin = int(start * SAMPLE_RATE)
    length = min(int(duration * SAMPLE_RATE), len(track) - begin)
    if length <= 0:
        return
    t = np.arange(length, dtype=np.float64) / SAMPLE_RATE
    noise = RNG.normal(0, 1, length)
    bright = np.concatenate(([0.0], np.diff(noise)))
    ring = np.sin(2 * np.pi * 713 * t) + 0.5 * np.sin(2 * np.pi * 1187 * t)
    signal = (0.26 * bright + ring) * np.exp(-2.9 * t) * gain
    left = np.sqrt((1.0 - pan) / 2.0)
    right = np.sqrt((1.0 + pan) / 2.0)
    track[begin:begin + length, 0] += signal * left
    track[begin:begin + length, 1] += signal * right


def render():
    track = np.zeros((int(SAMPLE_RATE * DURATION), 2), dtype=np.float64)
    roots = [73.42, 58.27, 77.78, 55.00]
    fifths = [110.00, 87.31, 116.54, 82.41]

    for bar in range(16):
        root = roots[bar % 4]
        fifth = fifths[bar % 4]
        start = bar * BAR
        arc = 0.72 + 0.24 * np.sin(np.pi * bar / 15)
        add_tone(track, start, BAR + 0.8, root, 0.105 * arc, pan=-0.32)
        add_tone(track, start, BAR + 0.8, root * 2, 0.038 * arc, pan=0.34)
        add_tone(track, start, BAR + 0.8, fifth, 0.047 * arc, pan=0.08)

        if bar % 2 == 0:
            motif = [293.66, 277.18, 220.00]
            for index, note in enumerate(motif):
                add_tone(track, start + 0.55 + index * 0.72, 1.45, note, 0.056, "bell", pan=(-0.4 + index * 0.4))

        if 3 <= bar <= 14:
            pressure = 0.055 + (bar / 15) * 0.055
            add_heartbeat(track, start + 0.06, pressure)
            add_heartbeat(track, start + 0.62, pressure * 0.72)

        if 7 <= bar <= 14:
            ostinato = [146.83, 110.00, 155.56, 116.54]
            for beat, note in enumerate(ostinato):
                add_tone(track, start + beat, 0.72, note, 0.027 + bar * 0.0014, "bell", pan=(-0.22 if beat % 2 == 0 else 0.22))

    for start, gain, pan in [(15.7, 0.035, -0.6), (31.65, 0.055, 0.62), (47.55, 0.072, -0.5), (59.7, 0.048, 0.45)]:
        add_metal(track, start, gain, pan)

    # Air and bow texture: quiet, high-passed noise moving slowly across stereo.
    t = time_axis()
    noise = RNG.normal(0, 1, len(t))
    high = np.concatenate(([0.0], np.diff(noise)))
    breath = high * (0.0045 + 0.002 * np.sin(2 * np.pi * t / 16))
    track[:, 0] += breath * (0.85 + 0.15 * np.sin(2 * np.pi * t / 11))
    track[:, 1] += breath * (0.85 - 0.15 * np.sin(2 * np.pi * t / 11))

    # Small-room reflections keep the cue cinematic without washing out the motif.
    dry = track.copy()
    for delay, level in [(0.071, 0.18), (0.131, 0.13), (0.223, 0.085), (0.347, 0.055)]:
        offset = int(delay * SAMPLE_RATE)
        track[offset:, 0] += dry[:-offset, 1] * level
        track[offset:, 1] += dry[:-offset, 0] * level

    fade = int(0.45 * SAMPLE_RATE)
    track[:fade] *= np.linspace(0, 1, fade)[:, None]
    track[-fade:] *= np.linspace(1, 0, fade)[:, None]
    track = np.tanh(track * 1.65)
    peak = np.max(np.abs(track))
    track = track / max(peak, 1e-9) * 0.89
    pcm = np.int16(track * 32767)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as directory:
        wav_path = Path(directory) / "house-score.wav"
        with wave.open(str(wav_path), "wb") as wav:
            wav.setnchannels(2)
            wav.setsampwidth(2)
            wav.setframerate(SAMPLE_RATE)
            wav.writeframes(pcm.tobytes())
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_path),
            "-codec:a", "libmp3lame", "-b:a", "160k",
            "-metadata", "title=The House Is Listening",
            "-metadata", "artist=Cognitive Studio",
            str(OUTPUT),
        ], check=True)

    print(OUTPUT)


if __name__ == "__main__":
    render()
