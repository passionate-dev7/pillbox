#!/usr/bin/env python3
"""Build the ffmpeg filter_complex graph for a beat's pointer + highlight cues.

Usage:
    cue_filter.py CUES_TSV TOTAL_DUR [ORIG_ASEC EFF_ASEC]

Cue times in CUES_TSV are authored against the narration line's *declared*
duration (timeline.tsv's audio_sec column, word-position math against
narration/lines.txt). The wav actually used is trimmed of leading/trailing
silence first (see build_segment.sh), so the real spoken timing is slightly
shorter. When ORIG_ASEC and EFF_ASEC are given, every cue time is rescaled by
EFF_ASEC/ORIG_ASEC, except an end time that reaches or exceeds ORIG_ASEC
(the "hold to the end of the beat" sentinel), which snaps to TOTAL_DUR
instead so the last highlight still holds through the freeze/gap.

Reads a cues file (start_s, end_s, x,y,w,h, label -- tab separated, one row
per cue, already sorted by start_s) and prints a filter_complex script to
stdout that:

  - draws a rounded-corner-free accent-blue (#0039A6) rectangle, 3px stroke,
    no fill, for each cue between its start and end (a hard cut at each
    boundary stands in for the 0.25s fade -- acceptable per spec for a
    2-input overlay each step would require).
  - slides a pointer-arrow sprite ([1:v], pre-scaled to PTR_Wx PTR_H) so its
    tip lands just inside the top-left corner of each cue's box, linearly
    interpolating from the previous cue's tip position over 0.4s starting at
    each cue's start time, then holding.
  - the pointer is visible only from the first cue's start to the last
    cue's end.

Expects input [0:v] = base video, [1:v] = pointer sprite (looped, same or
longer duration than the base). Produces [vout].
"""
import sys

PTR_W, PTR_H = 260, 260
# tip position within the *scaled* pointer sprite (bottom-right, pointing
# down-right into the target corner) -- see gen_pointer.py TIP=(108,108) on
# a 150x150 canvas, scaled by PTR_W/150.
TIP_X = round(216 * PTR_W / 300, 1)
TIP_Y = round(216 * PTR_H / 300, 1)

BOX_COLOR = "0x24b47e"
BOX_THICK = 6
SLIDE_S = 0.4
# how far inside the box's top-left corner the arrow tip lands
INSET_FRAC = 0.14


def parse_cues(path):
    cues = []
    with open(path) as f:
        for line in f:
            line = line.rstrip("\n")
            if not line.strip() or line.startswith("#"):
                continue
            start, end, box, label = line.split("\t")
            x, y, w, h = (float(v) for v in box.split(","))
            cues.append(
                {
                    "start": float(start),
                    "end": float(end),
                    "x": x,
                    "y": y,
                    "w": w,
                    "h": h,
                    "label": label,
                }
            )
    cues.sort(key=lambda c: c["start"])
    return cues


def anchor(c):
    ax = c["x"] + INSET_FRAC * c["w"]
    ay = c["y"] + INSET_FRAC * c["h"]
    return ax, ay


def tip_target(c):
    ax, ay = anchor(c)
    return ax - TIP_X, ay - TIP_Y


def build_axis_expr(values, starts, key):
    """values[i] is the target coordinate for cue i; starts[i] its start time."""
    n = len(values)

    def seg_val(i):
        v = round(values[i][key], 1)
        if i == 0:
            return f"{v}"
        prev = round(values[i - 1][key], 1)
        s = starts[i]
        return f"if(lt(t,{s}+{SLIDE_S}),{prev}+({v}-{prev})*(t-{s})/{SLIDE_S},{v})"

    expr = f"{round(values[n - 1][key], 1)}" if n == 1 else seg_val(n - 1)
    for i in range(n - 2, -1, -1):
        expr = f"if(lt(t,{starts[i + 1]}),{seg_val(i)},{expr})"
    return expr


def rescale_cues(cues, orig_asec, eff_asec, total_dur):
    if orig_asec <= 0 or eff_asec <= 0:
        return cues
    scale = eff_asec / orig_asec
    for c in cues:
        c["start"] = round(c["start"] * scale, 3)
        c["end"] = round(total_dur, 3) if c["end"] >= orig_asec - 0.01 else round(c["end"] * scale, 3)
    return cues


def main():
    cues_path, total_dur = sys.argv[1], float(sys.argv[2])
    cues = parse_cues(cues_path)
    if not cues:
        print(f"[0:v]copy[vout]")
        return

    if len(sys.argv) >= 5:
        orig_asec, eff_asec = float(sys.argv[3]), float(sys.argv[4])
        cues = rescale_cues(cues, orig_asec, eff_asec, total_dur)

    # --- highlight drawboxes ---------------------------------------------
    drawboxes = []
    for c in cues:
        drawboxes.append(
            "drawbox=x={x}:y={y}:w={w}:h={h}:color={col}:t={t}:enable='between(t,{s},{e})'".format(
                x=round(c["x"]),
                y=round(c["y"]),
                w=round(c["w"]),
                h=round(c["h"]),
                col=BOX_COLOR,
                t=BOX_THICK,
                s=c["start"],
                e=c["end"],
            )
        )

    # --- pointer tip targets + slide expressions --------------------------
    targets = []
    for c in cues:
        tx, ty = tip_target(c)
        targets.append({"x": tx, "y": ty})
    starts = [c["start"] for c in cues]

    x_expr = build_axis_expr(targets, starts, "x")
    y_expr = build_axis_expr(targets, starts, "y")

    p_start = cues[0]["start"]
    p_end = cues[-1]["end"]

    graph = []
    graph.append(f"[0:v]{','.join(drawboxes)}[vb]")
    graph.append(f"[1:v]scale={PTR_W}:{PTR_H}[ptr]")
    graph.append(
        "[vb][ptr]overlay=x='{xe}':y='{ye}':enable='between(t,{s},{e})'[vout]".format(
            xe=x_expr, ye=y_expr, s=p_start, e=p_end
        )
    )
    print(";\n".join(graph))


if __name__ == "__main__":
    main()
