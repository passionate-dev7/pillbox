#!/usr/bin/env python3
"""Split a beat's vpath into timed image segments.

Grammar: "first.png" (single image, unchanged) or a pipe-separated list where
every entry after the first carries "@start_seconds":

    a.png|b.png@12.63|a.png@16.95

Segment 0 always starts at t=0. Prints one tab-separated row per segment to
stdout: path, start, duration (duration computed from the next segment's
start, or the beat total for the last one).

Switch times ("@start_seconds") are authored against the narration line's
declared duration (timeline.tsv audio_sec); pass ORIG_ASEC and EFF_ASEC to
rescale them onto the actual post-silence-trim timing the same way
cue_filter.py does.

Usage: parse_vpath.py VPATH TOTAL_DUR [ORIG_ASEC EFF_ASEC]
"""
import sys


def main():
    vpath, total_dur = sys.argv[1], float(sys.argv[2])
    scale = 1.0
    if len(sys.argv) >= 5:
        orig_asec, eff_asec = float(sys.argv[3]), float(sys.argv[4])
        if orig_asec > 0 and eff_asec > 0:
            scale = eff_asec / orig_asec
    parts = vpath.split("|")
    segs = []
    for i, part in enumerate(parts):
        if "@" in part:
            path, start = part.rsplit("@", 1)
            start = min(float(start) * scale, total_dur)
        else:
            path, start = part, 0.0
        segs.append((path, start))
    segs.sort(key=lambda s: s[1])
    for i, (path, start) in enumerate(segs):
        end = segs[i + 1][1] if i + 1 < len(segs) else total_dur
        dur = max(0.05, end - start)
        print(f"{path}\t{start}\t{dur}")


if __name__ == "__main__":
    main()
