#!/usr/bin/env python3
"""Big bold pointer arrow for diagram overlays. Straight thick shaft, large head,
fill colour from argv[1] (hex), white outline. Tail upper-left, tip lower-right.
Tip is at (216,216) on a 300x300 canvas (same 0.72 ratio the cue filter expects)."""
import sys, math
from PIL import Image, ImageDraw
SS=4; C=300*SS
FILL=tuple(int(sys.argv[1].lstrip('#')[i:i+2],16) for i in (0,2,4))+(255,)
OUT=(255,255,255,255)
TAIL=(40,40); TIP=(216,216)
ang=math.atan2(TIP[1]-TAIL[1],TIP[0]-TAIL[0])
def pt(p,d,a): return (p[0]+d*math.cos(a),p[1]+d*math.sin(a))
head_len=88; head_half=52; shaft_half=17
base=pt(TIP,-head_len,ang)
left=pt(base,head_half,ang-math.pi/2); right=pt(base,head_half,ang+math.pi/2)
sl=pt(base,shaft_half,ang-math.pi/2); sr=pt(base,shaft_half,ang+math.pi/2)
tl=pt(TAIL,shaft_half,ang-math.pi/2); tr=pt(TAIL,shaft_half,ang+math.pi/2)
poly=[TIP,left,sl,tl,tr,sr,right]
img=Image.new("RGBA",(C,C),(0,0,0,0)); d=ImageDraw.Draw(img)
S=lambda ps:[(x*SS,y*SS) for x,y in ps]
d.polygon(S(poly),fill=OUT,outline=OUT,width=8*SS)
d.line(S(poly+[TIP]),fill=OUT,width=8*SS,joint="curve")
d.polygon(S(poly),fill=FILL)
img.resize((300,300),Image.LANCZOS).save(sys.argv[2]); print("wrote",sys.argv[2])
