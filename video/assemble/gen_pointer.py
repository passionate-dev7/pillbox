#!/usr/bin/env python3
"""macOS-style arrow cursor sprite, 300x300 canvas, tip at (216,216) so the existing cue_filter
tip math (0.72 ratio) still lands the hotspot on the target. Black fill, white outline, soft drop
shadow. Big enough to read at 1080p."""
import sys
from PIL import Image, ImageDraw, ImageFilter
SS=4; C=300*SS
# classic arrow cursor outline in a 0..1 unit box (tip at 0,0), from the standard macOS shape
pts=[(0,0),(0,0.80),(0.19,0.64),(0.31,0.94),(0.44,0.89),(0.32,0.60),(0.56,0.60)]
size=150.0  # px of the unit box in the 300 canvas
tip=(216,216); off=(tip[0]-0,tip[1]-0)
# we want the tip at (216,216) and the body extending up-left: flip both axes
poly=[(tip[0]-x*size, tip[1]-y*size) for x,y in pts]
img=Image.new("RGBA",(C,C),(0,0,0,0))
sh=Image.new("RGBA",(C,C),(0,0,0,0)); d=ImageDraw.Draw(sh)
d.polygon([(x*SS+6*SS,y*SS+8*SS) for x,y in poly],fill=(0,0,0,110))
sh=sh.filter(ImageFilter.GaussianBlur(10*SS))
img.alpha_composite(sh)
d=ImageDraw.Draw(img)
d.polygon([(x*SS,y*SS) for x,y in poly],fill=(255,255,255,255),outline=(255,255,255,255),width=9*SS)
d.line([(x*SS,y*SS) for x,y in poly+[poly[0]]],fill=(255,255,255,255),width=9*SS,joint="curve")
d.polygon([(x*SS,y*SS) for x,y in poly],fill=(17,17,17,255))
img.resize((300,300),Image.LANCZOS).save(sys.argv[1]); print("wrote",sys.argv[1])
