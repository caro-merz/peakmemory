"""Procedural sound effects for the reel (no music – that is added in Instagram)."""
from __future__ import annotations

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
rng = np.random.default_rng(7)


def _env(n: int, attack: float, release_curve: float = 3.0) -> np.ndarray:
    a = max(1, int(attack * SR))
    env = np.ones(n)
    env[:a] = np.linspace(0, 1, a) ** 2
    tail = np.linspace(1, 0, n - a) ** release_curve if n > a else []
    env[a:] = tail
    return env


def _band(signal: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), signal)


def whoosh(duration: float = 0.45, lo: float = 300, hi: float = 4500, rise: float = 0.55, gain: float = 0.5) -> np.ndarray:
    """Filtered noise sweeping up then down – used for cuts and phone moves."""
    n = int(duration * SR)
    noise = rng.normal(0, 1, n)
    out = np.zeros(n)
    block = 512
    for start in range(0, n, block):
        t = start / n
        p = t / rise if t < rise else 1 - (t - rise) / (1 - rise)
        centre = lo * (hi / lo) ** max(0.0, min(1.0, p))
        seg = noise[max(0, start - 2048):start + block]
        filt = _band(seg, centre * 0.6, min(centre * 1.6, SR / 2 - 100))
        out[start:start + block] = filt[-len(out[start:start + block]):]
    shape = np.sin(np.linspace(0, np.pi, n)) ** 1.6
    return out * shape * gain / (np.abs(out).max() + 1e-9)


def pop(freq: float = 720, duration: float = 0.09, gain: float = 0.35) -> np.ndarray:
    """Soft bubbly pop for text reveals and list items."""
    n = int(duration * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 0.6 * np.exp(-t * 60))
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * _env(n, 0.003, 2.5) * gain


def click(gain: float = 0.35) -> np.ndarray:
    """Short UI tap."""
    n = int(0.03 * SR)
    noise = _band(rng.normal(0, 1, n), 1800, 6000)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 1400 * t) * np.exp(-t * 180)
    sig = noise / (np.abs(noise).max() + 1e-9) * np.exp(-t * 260) * 0.6 + body * 0.6
    return sig * gain


def thump(gain: float = 0.6) -> np.ndarray:
    """Low drop impact (files landing)."""
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    f = 55 + 110 * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    tap = np.pad(click(0.25), (0, n - int(0.03 * SR)))
    return body * gain + tap


def chime(notes=(1318.5, 1760.0, 2637.0), spacing: float = 0.07, duration: float = 1.1, gain: float = 0.22) -> np.ndarray:
    """Bell-like arpeggio for 'preview ready' and the end card."""
    n = int((duration + spacing * len(notes)) * SR)
    out = np.zeros(n)
    for i, f in enumerate(notes):
        m = int(duration * SR)
        t = np.arange(m) / SR
        tone = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 6)) * np.exp(-t * 4.5)
        tone *= _env(m, 0.004, 1.0) ** 0.2
        s = int(i * spacing * SR)
        out[s:s + m] += tone
    return out * gain / (np.abs(out).max() + 1e-9)


def swish(gain: float = 0.28, pitch: float = 1.0) -> np.ndarray:
    return whoosh(0.28, 900 * pitch, 7000, rise=0.4, gain=gain)


def mix(events: list[tuple[float, np.ndarray, float]], duration: float) -> np.ndarray:
    """events: (time s, mono signal, pan -1..1) -> int16 stereo array shaped (2, n)."""
    n = int(duration * SR)
    out = np.zeros((2, n))
    for time, sig, pan in events:
        s = int(time * SR)
        if s >= n:
            continue
        sig = sig[: n - s]
        left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        out[0, s:s + len(sig)] += sig * left * 1.414
        out[1, s:s + len(sig)] += sig * right * 1.414
    fade = int(0.4 * SR)
    out[:, -fade:] *= np.linspace(1, 0, fade)
    out *= 0.95 / (np.abs(out).max() + 1e-9)
    out = np.tanh(out * 1.2) * 0.92  # normalise, then gentle limiter
    return (out * 32767).astype(np.int16)
