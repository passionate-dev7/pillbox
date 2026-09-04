#!/usr/bin/env python3
"""Generate the three .excalidraw scenes for the Pillbox demo video.
Palette from this repo's DESIGN.md (Supabase-adapted: white/near-black/emerald).
A transparent 1920x1080 frame element makes the export bbox exactly 16:9 so
exportToBlob at 1920x1080 scale 1 is pixel-for-pixel."""
import json, random, sys, os

CANVAS="#ffffff"; INK="#171717"; MUTED="#707070"; SUBTLE="#9a9a9a"; HAIR="#c7c7c7"
ACCENT="#24b47e"; RELIABLE="#067647"; WATCH="#b54708"; OUT="#b42318"; SIM="#6b01c2"
W,H=1920,1080
rnd=random.Random(20260904); _n=[0]

def _base(kind,x,y,w,h,**kw):
    _n[0]+=1
    return {"id":f"e{_n[0]:03d}","type":kind,"x":round(x,2),"y":round(y,2),
      "width":round(w,2),"height":round(h,2),"angle":0,
      "strokeColor":kw.get("stroke",INK),"backgroundColor":kw.get("bg","transparent"),
      "fillStyle":kw.get("fillStyle","solid"),"strokeWidth":kw.get("strokeWidth",2),
      "strokeStyle":kw.get("strokeStyle","solid"),"roughness":1,"opacity":kw.get("opacity",100),
      "groupIds":[],"frameId":None,"index":f"a{_n[0]:03d}","roundness":None,
      "seed":rnd.randint(1,2**31),"version":1,"versionNonce":rnd.randint(1,2**31),
      "isDeleted":False,"boundElements":None,"updated":1756900000000,"link":None,"locked":False}

def rect(x,y,w,h,**kw): return _base("rectangle",x,y,w,h,**kw)
def ellipse(x,y,w,h,**kw): return _base("ellipse",x,y,w,h,**kw)

def line(x1,y1,x2,y2,**kw):
    e=_base("line",x1,y1,abs(x2-x1),abs(y2-y1),**kw)
    e.update({"points":[[0,0],[x2-x1,y2-y1]],"lastCommittedPoint":None,
      "startBinding":None,"endBinding":None,"startArrowhead":None,"endArrowhead":None})
    return e

def arrow(x1,y1,x2,y2,both=False,**kw):
    e=line(x1,y1,x2,y2,**kw)
    e["type"]="arrow"; e["endArrowhead"]="arrow"
    e["startArrowhead"]="arrow" if both else None; e["elbowed"]=False
    return e

CHAR_W=0.53
def text(s,x,y,size=24,color=INK,align="center",w=None):
    lines=s.split("\n")
    width=w if w is not None else max(len(l) for l in lines)*size*CHAR_W
    height=len(lines)*size*1.25
    left=x-width/2 if align=="center" else x
    e=_base("text",left,y,width,height,stroke=color,strokeWidth=1)
    e.update({"fontSize":size,"fontFamily":1,"text":s,"originalText":s,"textAlign":align,
      "verticalAlign":"top","containerId":None,"lineHeight":1.25,"autoResize":True})
    return e

def frame(): return rect(0,0,W,H,stroke="transparent",bg="transparent",strokeWidth=1)
def cross(cx,cy,r=17,color=OUT,sw=3):
    return [line(cx-r,cy-r,cx+r,cy+r,stroke=color,strokeWidth=sw),
            line(cx+r,cy-r,cx-r,cy+r,stroke=color,strokeWidth=sw)]
def eyebrow(t): return text(t,76,48,26,SUBTLE,align="left")

def scene_problem():
    el=[frame(),eyebrow("PILL ROUND  /  THE PROBLEM")]
    el.append(rect(76,130,700,760,stroke=INK,strokeWidth=2))
    el.append(text("DAD, 78",130,158,34,INK,align="left"))
    el.append(text("eleven prescriptions, four doctors",130,204,22,MUTED,align="left"))
    el.append(line(76,244,776,244,stroke=HAIR,strokeWidth=1))
    rows=[("warfarin","5 mg","Dr. Alvarez"),
          ("amiodarone","200 mg","Dr. Alvarez"),
          ("metoprolol","50 mg","Dr. Alvarez"),
          ("lisinopril","10 mg","Dr. Alvarez"),
          ("atorvastatin","40 mg","Dr. Chen"),
          ("metformin","500 mg","Dr. Chen"),
          ("levothyroxine","75 mcg","Dr. Chen"),
          ("omeprazole","20 mg","Dr. Chen"),
          ("sertraline","50 mg","Dr. Patel"),
          ("gabapentin","300 mg","Dr. Nakamura"),
          ("acetaminophen","500 mg","Dr. Nakamura")]
    y=266
    for i,(g,d,p) in enumerate(rows):
        rowc = OUT if g=="warfarin" else INK
        el.append(text(g,112,y,21,rowc,align="left"))
        el.append(text(d,388,y,19,MUTED,align="left"))
        el.append(text(p,540,y,17,SUBTLE,align="left"))
        y+=48
    el.append(text("hand-written grid, kept up to date by hand",130,858,19,MUTED,align="left"))
    el.append(rect(846,130,300,300,stroke=OUT,strokeWidth=3))
    el.append(text("NEW",996,158,30,OUT))
    el.append(text("ciprofloxacin",996,204,26,OUT))
    el.append(text("5th doctor, this week",996,248,19,MUTED))
    el+=cross(996,340,26,OUT,4)
    el.append(text("checked against\nwarfarin? nobody knows",996,392,19,MUTED))
    el.append(line(846,470,1146,470,stroke=HAIR,strokeWidth=2,strokeStyle="dashed"))
    el.append(ellipse(940,510,52,52,stroke=INK,strokeWidth=2))
    el.append(line(966,562,966,626,stroke=INK,strokeWidth=2))
    el.append(line(966,580,1020,598,stroke=INK,strokeWidth=2))
    el.append(line(966,626,1024,638,stroke=INK,strokeWidth=2))
    el.append(ellipse(918,616,96,96,stroke=INK,strokeWidth=2))
    el.append(text("CAREGIVER",966,722,26,INK))
    el.append(text("manages it from another city",966,756,19,MUTED))
    el.append(rect(1240,220,600,560,stroke=INK,strokeWidth=2))
    el.append(text("PHARMACIST",1540,252,30,INK))
    el.append(text("sees the same list, a different phone,\nzero shared context with the caregiver",1540,300,20,MUTED))
    el.append(text("?",1540,470,110,INK))
    el.append(text("Nobody joined the new drug to the old list before now",960,988,40,INK))
    return el

def scene_pipeline():
    el=[frame(),eyebrow("PILL ROUND  /  THE PIPELINE")]
    def src(y,title,sub,fig):
        o=[rect(76,y,430,176,stroke=INK,strokeWidth=2)]
        o.append(text(title,106,y+22,26,INK,align="left"))
        o.append(text(sub,106,y+62,20,MUTED,align="left"))
        o.append(text(fig,106,y+106,22,ACCENT,align="left"))
        return o
    el+=src(150,"DRUG LABELS","openFDA drug/label","64 generics  .  ~1,000 sentences")
    el+=src(400,"NDC DIRECTORY","openFDA drug/ndc","generic -> product identity")
    el+=src(650,"ENFORCEMENT","openFDA drug/enforcement","ongoing recalls, by generic")
    el.append(arrow(510,238,618,404,stroke=INK,strokeWidth=2))
    el.append(text("parses",576,248,22,ACCENT))
    el.append(arrow(510,488,618,512,stroke=INK,strokeWidth=2))
    el.append(text("joins",564,448,22,ACCENT))
    el.append(arrow(510,738,618,620,stroke=INK,strokeWidth=2))
    el.append(text("flags",560,726,22,ACCENT))
    el.append(rect(622,288,388,448,stroke=INK,strokeWidth=3))
    el.append(text("SENTENCE INDEX",816,312,28,INK))
    el.append(text("one row per label sentence",816,354,19,SUBTLE))
    el.append(text("verbatim text",658,406,21,MUTED,align="left"))
    el.append(text("section: boxed / contra / warn",658,448,21,MUTED,align="left"))
    el.append(text("set_id  (links to the label)",658,490,21,MUTED,align="left"))
    el.append(line(658,536,974,536,stroke=HAIR,strokeWidth=1))
    el.append(text("severity from section",658,552,19,SUBTLE,align="left"))
    el.append(text("BOXED",658,592,22,OUT,align="left"))
    el.append(text("CONTRA",790,592,22,WATCH,align="left"))
    el.append(text("WARNING",940,592,22,RELIABLE,align="left"))
    el.append(text("nothing here is paraphrased",658,660,20,SUBTLE,align="left"))
    el.append(arrow(1014,512,1106,512,stroke=INK,strokeWidth=2))
    el.append(text("registers",1060,462,22,ACCENT))
    el.append(rect(1110,300,360,424,stroke=INK,strokeWidth=3))
    el.append(text("TOOLS PER ROLE",1290,324,26,INK))
    el.append(text("caregiver  .  11 tools",1146,372,21,INK,align="left"))
    el.append(text("add_medication",1170,404,19,MUTED,align="left"))
    el.append(text("accept_change",1170,430,19,MUTED,align="left"))
    el.append(text("print_round_card",1170,456,19,MUTED,align="left"))
    el.append(line(1146,494,1436,494,stroke=HAIR,strokeWidth=1))
    el.append(text("pharmacist  .  9 tools",1146,510,21,INK,align="left"))
    el.append(text("propose_change",1170,542,19,MUTED,align="left"))
    el.append(text("add_counsel_note",1170,568,19,MUTED,align="left"))
    el.append(text("server enforces the split",1146,660,19,SUBTLE,align="left"))
    el.append(arrow(1470,512,1562,512,stroke=INK,strokeWidth=2))
    el.append(text("serves",1516,462,22,ACCENT))
    el.append(rect(1566,340,278,344,stroke=INK,strokeWidth=3))
    el.append(text("check_interactions",1705,364,23,INK))
    el.append(text("warfarin",1602,420,24,OUT,align="left"))
    el.append(text("ciprofloxacin",1602,452,20,MUTED,align="left"))
    el.append(text("QT-prolonging interaction,",1602,500,17,MUTED,align="left"))
    el.append(text("boxed warning section",1602,522,17,MUTED,align="left"))
    el.append(text("Every flag carries the query URL and set_id behind it",960,952,32,MUTED))
    return el

def scene_two():
    el=[frame(),eyebrow("PILL ROUND  /  TWO AGENTS, ONE PAGE")]
    el.append(rect(560,102,800,66,stroke=HAIR,strokeWidth=2))
    el.append(text("pillbox-care.vercel.app / t / <case>",960,120,26,INK))
    def window(x,title,sub,tools,gone,cx):
        o=[rect(x,232,700,556,stroke=INK,strokeWidth=3)]
        o.append(line(x,314,x+700,314,stroke=INK,strokeWidth=2))
        o.append(text(title,cx,250,40,INK))
        o.append(text(sub,cx,328,21,SUBTLE))
        y=380
        for t in tools:
            o.append(text(t,x+46,y,25,INK,align="left")); y+=44
        o.append(text(gone,x+46,y+4,25,SUBTLE,align="left"))
        gw=len(gone)*25*CHAR_W
        o.append(line(x+38,y+20,x+54+gw,y+20,stroke=OUT,strokeWidth=3))
        o.append(text("not registered for this role",x+46,y+40,19,OUT,align="left"))
        return o
    el+=window(76,"CAREGIVER","?k=<owner key>   .   11 tools registered",
        ["add_medication","check_interactions","accept_change",
         "report_side_effect","print_round_card","check_recalls"],
        "propose_change",426)
    el+=window(1144,"PHARMACIST","?k=<partner key>   .   9 tools registered",
        ["check_interactions","propose_change","add_counsel_note",
         "check_duplicate_therapy","check_geriatric_warnings","check_recalls"],
        "accept_change",1494)
    el.append(rect(856,420,208,208,stroke=ACCENT,strokeWidth=3))
    el.append(text("SHARED\nMED\nLIST",960,452,28,ACCENT))
    el.append(arrow(780,524,852,524,both=True,stroke=ACCENT,strokeWidth=2))
    el.append(arrow(1068,524,1140,524,both=True,stroke=ACCENT,strokeWidth=2))
    el.append(text("role is the link you hold, not a field you send",960,638,18,SUBTLE))
    el.append(arrow(960,668,960,872,stroke=ACCENT,strokeWidth=2))
    el.append(text("server re-checks every write, gate in the middle",960,880,28,ACCENT))
    el.append(text("Same page, different tools, verifiable in DevTools > Application > WebMCP",960,948,30,INK))
    return el

SCENES={"problem":scene_problem,"pipeline":scene_pipeline,"two-sessions":scene_two}

def main():
    outdir=sys.argv[1] if len(sys.argv)>1 else "."
    os.makedirs(outdir,exist_ok=True)
    for name,fn in SCENES.items():
        _n[0]=0
        scene={"type":"excalidraw","version":2,
          "source":"pillbox/video/diagrams/exrender/build_scenes.py",
          "elements":fn(),
          "appState":{"gridSize":None,"viewBackgroundColor":CANVAS,"exportBackground":True,
            "exportWithDarkMode":False,"exportEmbedScene":False,"exportScale":1},
          "files":{}}
        p=os.path.join(outdir,f"{name}.excalidraw")
        json.dump(scene,open(p,"w"),indent=1)
        print(p,len(scene["elements"]),"elements")

main()
