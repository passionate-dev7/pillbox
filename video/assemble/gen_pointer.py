#!/usr/bin/env python3
"""Generate a hand-drawn-style pointer arrow PNG for diagram-beat overlays.

Ink #0A0A0A stroke with a paper-colored (#F2EFE9) 2px outline behind it, at
roughly 90px arrow length. Drawn supersampled 4x then downsampled with
LANCZOS for a smooth anti-aliased hand-drawn look. Tip (the point that should
land on the target element) is recorded as TIP_X, TIP_Y in sprite pixel
space -- overlay placement subtracts this offset from the target coordinate.
"""
import math
from PIL import Image, ImageDraw

SS = 4  # supersample factor
CANVAS = 150 * SS
INK = (10, 10, 10, 255)
PAPER = (242, 239, 233, 255)

# Arrow runs from the tail (upper-left) to the tip (lower-right), with a
# slight hand-drawn bow in the middle.
TAIL = (28, 22)
MID_CTRL = (58, 52)
TIP = (108, 108)


def bezier(p0, p1, p2, n=60):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
        pts.append((x, y))
    return pts


def scaled(pts):
    return [(x * SS, y * SS) for x, y in pts]


def stroke_path(draw, pts, width, color):
    w = max(1, int(round(width)))
    draw.line(pts, fill=color, width=w, joint="curve")
    r = w / 2
    for p in (pts[0], pts[-1]):
        draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)


def arrowhead_points(tip, direction, size):
    ang = math.atan2(direction[1], direction[0])
    spread = math.radians(28)
    left = (
        tip[0] - size * math.cos(ang - spread),
        tip[1] - size * math.sin(ang - spread),
    )
    right = (
        tip[0] - size * math.cos(ang + spread),
        tip[1] - size * math.sin(ang + spread),
    )
    back = (
        tip[0] - size * 0.55 * math.cos(ang),
        tip[1] - size * 0.55 * math.sin(ang),
    )
    return [tip, left, back, right, tip]


def main():
    img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    shaft = bezier(TAIL, MID_CTRL, TIP, n=60)
    dx = TIP[0] - shaft[-3][0]
    dy = TIP[1] - shaft[-3][1]

    head = arrowhead_points(TIP, (dx, dy), size=26)

    shaft_s = scaled(shaft)
    head_s = scaled(head)

    ink_w = 7 * SS
    paper_w = ink_w + 4 * SS

    # paper outline first (shaft + head), then ink on top
    stroke_path(draw, shaft_s, paper_w, PAPER)
    draw.line(head_s, fill=PAPER, width=paper_w, joint="curve")
    draw.polygon(head_s, fill=PAPER)

    stroke_path(draw, shaft_s, ink_w, INK)
    draw.line(head_s, fill=INK, width=ink_w, joint="curve")
    draw.polygon(head_s, fill=INK)

    out = img.resize((150, 150), Image.LANCZOS)
    out_path = "assemble/assets/pointer.png"
    out.save(out_path)
    print(f"wrote {out_path}  tip=({TIP[0]},{TIP[1]})  size=150x150")


if __name__ == "__main__":
    main()
