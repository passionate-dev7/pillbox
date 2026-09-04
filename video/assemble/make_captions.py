#!/usr/bin/env python3
"""Split a narration line into an .srt caption track.

Wraps text into lines of at most MAX_CHARS characters, pairs wrapped lines
into two-line caption chunks, and times each chunk proportionally to its
share of the total character count across the given audio duration.

Usage:
    make_captions.py OUTPUT.srt DURATION_SECONDS "full narration text"
"""
import sys

MAX_CHARS = 42
MIN_CHUNK_SEC = 0.6


def wrap(text, max_chars):
    words = text.split()
    lines = []
    cur = ""
    for w in words:
        cand = (cur + " " + w).strip()
        if len(cand) <= max_chars:
            cur = cand
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def pair(lines):
    chunks = []
    for i in range(0, len(lines), 2):
        chunks.append(lines[i:i + 2])
    return chunks


def srt_time(t):
    if t < 0:
        t = 0.0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    if ms == 1000:
        ms = 0
        s += 1
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    if len(sys.argv) != 4:
        sys.exit("usage: make_captions.py OUTPUT.srt DURATION_SECONDS TEXT")
    out_path, dur_s, text = sys.argv[1], float(sys.argv[2]), sys.argv[3]

    lines = wrap(text, MAX_CHARS)
    if not lines:
        open(out_path, "w").close()
        return

    chunks = pair(lines)
    weights = [max(len("\n".join(c)), 1) for c in chunks]
    total_w = sum(weights)

    raw = [dur_s * w / total_w for w in weights]

    # Enforce a minimum chunk duration by clamping and redistributing the
    # deficit from the chunks with the most slack, proportional to their size.
    durations = raw[:]
    deficit = 0.0
    free_idx = []
    for i, d in enumerate(durations):
        if d < MIN_CHUNK_SEC:
            deficit += MIN_CHUNK_SEC - d
            durations[i] = MIN_CHUNK_SEC
        else:
            free_idx.append(i)
    if deficit > 0 and free_idx:
        free_total = sum(durations[i] for i in free_idx)
        if free_total > deficit:
            for i in free_idx:
                durations[i] -= deficit * (durations[i] / free_total)

    # Final rescale so chunks sum exactly to dur_s (guards float drift).
    total_d = sum(durations)
    scale = dur_s / total_d if total_d > 0 else 1.0
    durations = [d * scale for d in durations]

    cues = []
    t = 0.0
    for chunk, d in zip(chunks, durations):
        start, end = t, t + d
        cues.append((start, end, "\n".join(chunk)))
        t = end

    with open(out_path, "w") as f:
        for i, (start, end, text_block) in enumerate(cues, 1):
            f.write(f"{i}\n{srt_time(start)} --> {srt_time(end)}\n{text_block}\n\n")


if __name__ == "__main__":
    main()
