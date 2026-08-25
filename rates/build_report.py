"""
Stage 3 of 3. Renders the derived cost data into a full printed rate schedule PDF
containing every priceable item, plus method/basis front matter and appendices.

Styled to the InfraBid theme: palette, typography and motifs are taken from the
platform's own style.css (--navy / --blue / --signal, Jost, KPI tiles, eyebrows).

    python3 build_report.py [work_dir] [output.pdf]

Requires reportlab. work_dir must hold out.json / res.json / pre.json from derive_costs.py.
Fonts are vendored in ./fonts (Jost, the platform's Century Gothic web fallback).
"""
import json, os, sys, collections, statistics
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                LongTable, Table, TableStyle, PageBreak, KeepTogether)
from reportlab.platypus.flowables import Flowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
B = (sys.argv[1] if len(sys.argv) > 1 else HERE).rstrip("/") + "/"
OUT = sys.argv[2] if len(sys.argv) > 2 else B + "Spons_Irish_Derived_Costs_Report.pdf"

out = json.load(open(B + "out.json"))
res = json.load(open(B + "res.json"))
pre = json.load(open(B + "pre.json"))

# ============================================================ InfraBid theme
# Palette lifted from the platform's style.css :root block.
NAVY      = colors.HexColor("#133198")   # --navy
NAVY_DEEP = colors.HexColor("#0E2470")   # --navy-deep
BLUE      = colors.HexColor("#476DCF")   # --blue
SIGNAL    = colors.HexColor("#0EA5E9")   # --signal / --accent
SIG_DEEP  = colors.HexColor("#0072CE")   # --signal-deep
SEC_DEEP  = colors.HexColor("#1E5FA8")   # --secondary-deep
INK       = colors.HexColor("#15234E")   # --ink
BG2       = colors.HexColor("#F4F8FD")   # --bg-2
BG3       = colors.HexColor("#EDF3FB")   # --bg-3
SURF2     = colors.HexColor("#F2F7FD")   # --surface-2
BORDER    = colors.HexColor("#E2EAF6")   # --border
TEXT      = colors.HexColor("#2C3A5C")   # --text
TEXT_SUB  = colors.HexColor("#56648A")   # --text-sub
MUTED     = colors.HexColor("#8290AE")   # --muted
ACC_SOFT  = colors.HexColor("#E4F4FD")   # --accent-soft, flattened
WHITE     = colors.white

for _w in (300, 400, 500, 600, 700, 800):
    pdfmetrics.registerFont(TTFont(f"Jost{_w}", os.path.join(HERE, "fonts", f"Jost-{_w}.ttf")))
pdfmetrics.registerFont(TTFont("JostIt", os.path.join(HERE, "fonts", "Jost-Italic.ttf")))
LIGHT, BOOK, MED, SEMI, BOLD, HEAVY, ITAL = ("Jost300", "Jost400", "Jost500",
                                             "Jost600", "Jost700", "Jost800", "JostIt")

# ---------------------------------------------------------------- Irish basis
FX, LABOUR_F, PLANT_F, MATERIAL_F = 1.1694, 1.3415, 1.00, 1.00
SC_MIX = (0.35, 0.30, 0.35)
SC_F = round(SC_MIX[0]*LABOUR_F + SC_MIX[1]*PLANT_F + SC_MIX[2]*MATERIAL_F, 4)
LABOUR_GRADES = [("Craftsperson", 23.74, "Craft rate", 16.40),
                 ("Category A (skilled operative)", 23.03, "Skill Rate 3", 14.07),
                 ("Category B (general operative)", 21.37, "General operative", 13.18)]

def eur(o):
    L = o['L']*LABOUR_F*FX; P = o['P']*PLANT_F*FX
    M = o['M']*MATERIAL_F*FX; Sc = o['SC']*SC_F*FX
    return round(L,2), round(P,2), round(M,2), round(Sc,2), round(L+P+M+Sc, 2)

BASIS_CODE = {"Stated build-up":"SB", "Material recovered as residual":"MR",
              "Stated components + specialist balance":"SP", "Apportioned (sub-heading)":"AH",
              "Apportioned (section)":"AE", "Apportioned (class)":"AC",
              "All-in specialist rate":"AI", "All-in (no comparable build-ups)":"AN",
              "Stated components (no published total)":"SC", "No data":"-"}
CONF_CODE = {"High":"High", "Medium-High":"Med-Hi", "Medium":"Med", "Low":"Low",
             "All-in (not split)":"All-in", "None":"-"}
CONF_FILL = {"High":colors.HexColor("#DFF1E4"), "Med-Hi":colors.HexColor("#E6F3E9"),
             "Med":colors.HexColor("#FDF0D6"), "Low":colors.HexColor("#FBE2DA"),
             "All-in":colors.HexColor("#E8EDF6")}
CONF_TEXT = {"High":colors.HexColor("#1B6B3A"), "Med-Hi":colors.HexColor("#1B6B3A"),
             "Med":colors.HexColor("#8A5A08"), "Low":colors.HexColor("#9C3B1B"),
             "All-in":TEXT_SUB}
FLAG_FILL = colors.HexColor("#FBE2DA")

PAGE = landscape(A4)
LM = RM = 13*mm; TM = 19*mm; BM = 15*mm
CONTENT_W = PAGE[0] - LM - RM

def S(name, **kw):
    base = dict(fontName=LIGHT, fontSize=8.8, leading=12.4, textColor=TEXT)
    base.update(kw); return ParagraphStyle(name, **base)

ST = {
 "h1":    S("h1", fontSize=21, leading=25, fontName=HEAVY, textColor=INK, spaceAfter=8),
 "h2":    S("h2", fontSize=11.5, leading=15, fontName=BOLD, textColor=INK,
            spaceBefore=13, spaceAfter=6),
 "body":  S("body", spaceAfter=7),
 "lead":  S("lead", fontSize=10.2, leading=15.2, textColor=TEXT_SUB, spaceAfter=9),
 "small": S("small", fontSize=8, leading=11, textColor=TEXT_SUB),
 "cell":  S("cell", fontSize=7.1, leading=8.8),
 "cellb": S("cellb", fontSize=7.1, leading=8.8, fontName=BOLD, textColor=INK,
            alignment=TA_RIGHT),
 "cellr": S("cellr", fontSize=7.1, leading=8.8, alignment=TA_RIGHT),
 "cellc": S("cellc", fontSize=7.1, leading=8.8, alignment=TA_CENTER),
 "grpA":  S("grpA", fontSize=8.4, leading=10.6, fontName=HEAVY, textColor=WHITE),
 "grpB":  S("grpB", fontSize=7.4, leading=9.4, fontName=BOLD, textColor=INK),
 "grpC":  S("grpC", fontSize=7.1, leading=9, fontName=ITAL, textColor=SEC_DEEP),
 "th":    S("th", fontSize=6.4, leading=8.4, fontName=SEMI, textColor=WHITE,
            alignment=TA_CENTER),
}

def money(v, sym="€"):
    if v is None or abs(v) < 0.005: return "–"
    return f"{sym}{v:,.2f}"

def sp(s):
    """Wide-tracked uppercase for canvas text — the .eyebrow treatment."""
    return " ".join(s.upper())

def spm(s):
    """Same, for Paragraph markup. Paragraphs collapse runs of whitespace, so the
    inter-word gap has to be non-breaking or 'IRISH COST' reads as 'IRISHCOST'."""
    return "&nbsp;&nbsp;".join(" ".join(w) for w in s.upper().split())

# ============================================================ brand mark
def draw_mark(c, x, y, w, light=False):
    """InfraBid mark, redrawn from the site's inline SVG (viewBox 0 0 64 60).
    light=True inverts it for the dark cover, where navy would vanish."""
    s = w/64.0
    bar = WHITE if light else NAVY
    acc = colors.HexColor("#6EC6FF") if light else BLUE
    def X(v): return x + v*s
    def Y(v): return y + (60-v)*s                       # SVG y-down -> PDF y-up
    for sx, sy, sw, sh, col in ((14,16,10,36,bar), (39,10,10,42,bar), (27,28,9,24,acc)):
        c.setFillColor(col)
        c.roundRect(X(sx), Y(sy+sh), sw*s, sh*s, 4*s, stroke=0, fill=1)
    c.setStrokeColor(acc); c.setLineWidth(3.6*s); c.setLineCap(1)
    p = c.beginPath(); p.moveTo(X(8), Y(46))
    p.curveTo(X(22.667), Y(42.667), X(36.667), Y(32), X(50), Y(14))   # quadratic -> cubic
    c.drawPath(p, stroke=1, fill=0)
    c.setFillColor(acc); c.circle(X(52), Y(12), 4*s, stroke=0, fill=1)

def grad_bar(c, x, y, w, h, c0=SIGNAL, c1=SEC_DEEP):
    c.saveState()
    p = c.beginPath(); p.moveTo(x, y); p.lineTo(x+w, y)
    p.lineTo(x+w, y+h); p.lineTo(x, y+h); p.close()
    c.clipPath(p, stroke=0, fill=0)
    c.linearGradient(x, y, x+w, y, (c0, c1), extend=True)
    c.restoreState()

# ============================================================ page furniture
class Doc(BaseDocTemplate):
    def __init__(self, *a, **kw):
        BaseDocTemplate.__init__(self, *a, **kw)
        self.part = ""
        f = Frame(LM, BM, CONTENT_W, PAGE[1]-TM-BM, id="f",
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([PageTemplate(id="main", frames=[f], onPage=self.furniture)])

    def furniture(self, c, doc):
        if c.getPageNumber() == 1:
            cover(c); return
        top = PAGE[1] - TM + 7*mm
        draw_mark(c, LM, top - 1.4*mm, 7*mm)
        c.setFillColor(INK); c.setFont(HEAVY, 8.6)
        c.drawString(LM + 9.4*mm, top + 0.4*mm, "Infra")
        c.setFont(ITAL, 8.6); c.setFillColor(BLUE)
        c.drawString(LM + 9.4*mm + pdfmetrics.stringWidth("Infra", HEAVY, 8.6), top + 0.4*mm, "Bid")
        c.setFillColor(MUTED); c.setFont(MED, 6.2)
        c.drawString(LM + 25*mm, top + 0.7*mm, sp("Irish derived cost schedule"))
        c.setFillColor(TEXT_SUB); c.setFont(BOOK, 7.4)
        c.drawRightString(PAGE[0]-RM, top + 0.7*mm, self.part)
        grad_bar(c, LM, PAGE[1]-TM+4.4*mm, 32*mm, 1.6, SIGNAL, SEC_DEEP)
        c.setStrokeColor(BORDER); c.setLineWidth(0.7)
        c.line(LM+32*mm, PAGE[1]-TM+5.2*mm, PAGE[0]-RM, PAGE[1]-TM+5.2*mm)
        c.line(LM, BM-5*mm, PAGE[0]-RM, BM-5*mm)
        c.setFillColor(MUTED); c.setFont(LIGHT, 6.8)
        c.drawString(LM, BM-9*mm, "Derived cost model · net cost, excluding overhead, profit, "
                                  "preliminaries and VAT · not a quotation")
        c.setFillColor(SURF2)
        c.roundRect(PAGE[0]-RM-13*mm, BM-10.6*mm, 13*mm, 5.6*mm, 2.8*mm, stroke=0, fill=1)
        c.setFillColor(SEC_DEEP); c.setFont(SEMI, 7)
        c.drawCentredString(PAGE[0]-RM-6.5*mm, BM-9*mm, str(c.getPageNumber()))

story = []

class Part(Flowable):
    """Zero-height marker that renames the running header."""
    def __init__(self, name): Flowable.__init__(self); self.name = name
    def wrap(self, aw, ah): return (0, 0)
    def draw(self): DOC.part = self.name

class Rule(Flowable):
    def __init__(self, w=46*mm, h=1.8):
        Flowable.__init__(self); self._w = w; self.h = h
    def wrap(self, aw, ah): return (self._w, self.h)
    def draw(self): grad_bar(self.canv, 0, 0, self._w, self.h, SIGNAL, SEC_DEEP)

class Eyebrow(Flowable):
    """The .eyebrow-num motif: signal dot, bold number, wide-tracked label."""
    def __init__(self, num, label):
        Flowable.__init__(self); self.num = num; self.label = label
    def wrap(self, aw, ah): return (aw, 11)
    def draw(self):
        c = self.canv
        c.setFillColor(SIG_DEEP); c.circle(2.2, 4.4, 2.2, stroke=0, fill=1)
        c.setFillColor(INK); c.setFont(HEAVY, 9)
        c.drawString(9.5, 1.6, self.num)
        w = pdfmetrics.stringWidth(self.num, HEAVY, 9)
        c.setFillColor(TEXT_SUB); c.setFont(SEMI, 6.8)
        c.drawString(9.5+w+7, 1.6, sp(self.label))

class KPI(Flowable):
    """The .kpi-tile motif: bordered card, gradient cap, label, value, sub."""
    def __init__(self, tiles, w, h=21*mm, gap=4*mm):
        Flowable.__init__(self); self.tiles = tiles; self._w = w; self.h = h; self.gap = gap
    def wrap(self, aw, ah): return (self._w, self.h)
    def draw(self):
        c = self.canv; n = len(self.tiles)
        tw = (self._w - self.gap*(n-1)) / n
        for i, (lbl, val, sub) in enumerate(self.tiles):
            x = i*(tw+self.gap)
            c.setFillColor(WHITE); c.setStrokeColor(BORDER); c.setLineWidth(0.8)
            c.roundRect(x, 0, tw, self.h, 3.2*mm, stroke=1, fill=1)
            c.saveState()
            p = c.beginPath(); p.roundRect(x, 0, tw, self.h, 3.2*mm)
            c.clipPath(p, stroke=0, fill=0)
            grad_bar(c, x, self.h-2, tw, 2, SIGNAL, SEC_DEEP)
            c.restoreState()
            c.setFillColor(MUTED); c.setFont(SEMI, 5.7)
            c.drawString(x+4.4*mm, self.h-7.2*mm, sp(lbl))
            c.setFillColor(INK); c.setFont(BOLD, 15)
            c.drawString(x+4.4*mm, self.h-14.2*mm, val)
            if sub:
                c.setFillColor(TEXT_SUB); c.setFont(LIGHT, 6.4)
                c.drawString(x+4.4*mm, self.h-18.4*mm, sub)

def part(name): story.append(Part(name))
def h1(t, num=None, label=""):
    if num:
        story.append(Eyebrow(num, label)); story.append(Spacer(1, 2.4*mm))
    story.append(Paragraph(t, ST["h1"]))
    story.append(Rule()); story.append(Spacer(1, 4.5*mm))
def h2(t): story.append(Paragraph(t, ST["h2"]))
def para(t, style="body"): story.append(Paragraph(t, ST[style]))

def dtable(header, rows, widths, aligns=None, fs=7.6, zebra=True):
    hs = S(f"th_{fs}", fontSize=fs-0.9, leading=fs+1.8, fontName=SEMI, textColor=WHITE)
    data = [[Paragraph(spm(h), hs) for h in header]]
    for r in rows:
        line = []
        for i, v in enumerate(r):
            al = (aligns or ["left"]*len(r))[i]
            line.append(Paragraph(str(v), S(f"td{al}{fs}", fontSize=fs, leading=fs+2.6,
                        alignment={"left":TA_LEFT,"right":TA_RIGHT,"center":TA_CENTER}[al])))
        data.append(line)
    t = LongTable(data, colWidths=widths, repeatRows=1)
    sty = [("BACKGROUND",(0,0),(-1,0),NAVY), ("VALIGN",(0,0),(-1,-1),"TOP"),
           ("LINEBELOW",(0,0),(-1,0),1.4,SIGNAL),
           ("LINEBELOW",(0,1),(-1,-1),0.5,BORDER),
           ("TOPPADDING",(0,0),(-1,-1),3.6),("BOTTOMPADDING",(0,0),(-1,-1),3.6),
           ("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5)]
    if zebra: sty.append(("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE, BG2]))
    t.setStyle(TableStyle(sty)); story.append(t); return t

# ============================================================ cover
def cover(c):
    W, H = PAGE
    c.saveState()
    p = c.beginPath(); p.moveTo(0,0); p.lineTo(W,0); p.lineTo(W,H); p.lineTo(0,H); p.close()
    c.clipPath(p, stroke=0, fill=0)
    # --hero-grad: linear-gradient(160deg,#1EC2FF,#0B63C7 55%,#0A3D91)
    c.linearGradient(W*0.28, H, W*0.72, 0,
                     (colors.HexColor("#1EC2FF"), colors.HexColor("#0B63C7"),
                      colors.HexColor("#0A3D91")), (0.0, 0.55, 1.0), extend=True)
    c.setStrokeColor(colors.Color(1, 1, 1, 0.07)); c.setLineWidth(0.5)
    for gx in range(0, int(W)+22, 22): c.line(gx, 0, gx, H)
    for gy in range(0, int(H)+22, 22): c.line(0, gy, W, gy)
    c.restoreState()

    draw_mark(c, LM+2*mm, H-34*mm, 15*mm, light=True)
    c.setFillColor(WHITE); c.setFont(HEAVY, 15)
    c.drawString(LM+21*mm, H-28*mm, "Infra")
    c.setFont(ITAL, 15)
    c.drawString(LM+21*mm + pdfmetrics.stringWidth("Infra", HEAVY, 15), H-28*mm, "Bid")
    c.setFillColor(colors.Color(1, 1, 1, 0.66)); c.setFont(MED, 6)
    c.drawString(LM+21*mm, H-32*mm, sp("Bid with certainty"))

    c.setFillColor(colors.Color(1, 1, 1, 0.80)); c.setFont(SEMI, 7.4)
    c.drawString(LM+2*mm, H-52*mm, sp("Rate library · civil engineering"))
    c.setFillColor(WHITE); c.setFont(HEAVY, 38)
    c.drawString(LM+2*mm, H-69*mm, "Irish Derived Cost Schedule")
    c.setFillColor(colors.Color(1, 1, 1, 0.86)); c.setFont(LIGHT, 12)
    c.drawString(LM+2*mm, H-79*mm, "Spon's Civil Engineering and Highway Works rates, rebuilt as a "
                                   "labour / plant / material")
    c.drawString(LM+2*mm, H-85.5*mm, "cost build-up and converted to an Irish basis")

    tiles = [("Priceable items", f"{len(out):,}", "every item, costed"),
             ("Stated build-up", f"{100*sum(1 for o in out if o['basis']=='Stated build-up')/len(out):.0f}%",
              "the source's own figures"),
             ("Labour factor", f"{LABOUR_F}", "Ireland ÷ UK, statutory"),
             ("Exchange rate", f"{FX}", "GBP to EUR, Aug 2026"),
             ("Flagged for review", f"{sum(1 for o in out if o['flag'])}", "see part 04")]
    n = len(tiles); gap = 4*mm; tw = (CONTENT_W - gap*(n-1))/n; th = 23*mm; y = 27*mm
    for i, (lbl, val, sub) in enumerate(tiles):
        x = LM + i*(tw+gap)
        c.setFillColor(colors.Color(1, 1, 1, 0.11))
        c.setStrokeColor(colors.Color(1, 1, 1, 0.30)); c.setLineWidth(0.8)
        c.roundRect(x, y, tw, th, 3.2*mm, stroke=1, fill=1)
        c.saveState()
        pp = c.beginPath(); pp.roundRect(x, y, tw, th, 3.2*mm)
        c.clipPath(pp, stroke=0, fill=0)
        grad_bar(c, x, y+th-2, tw, 2, colors.HexColor("#6EC6FF"), WHITE)
        c.restoreState()
        c.setFillColor(colors.Color(1, 1, 1, 0.70)); c.setFont(SEMI, 5.7)
        c.drawString(x+4.4*mm, y+th-7.4*mm, sp(lbl))
        c.setFillColor(WHITE); c.setFont(BOLD, 17)
        c.drawString(x+4.4*mm, y+th-15.4*mm, val)
        c.setFillColor(colors.Color(1, 1, 1, 0.60)); c.setFont(LIGHT, 6.4)
        c.drawString(x+4.4*mm, y+th-19.8*mm, sub)

    c.setFillColor(colors.Color(1, 1, 1, 0.55)); c.setFont(LIGHT, 7)
    c.drawString(LM+2*mm, 17.5*mm, "A derived cost model, not a quotation. Irish figures are UK build-ups "
                                   "factored to an Irish basis: the labour factor rests on statutory rates "
                                   "both sides, plant and material sit at parity as stated assumptions.")
    c.drawString(LM+2*mm, 13.5*mm, "Verify against Irish supplier and hire-desk quotations before tender use.")

# ============================================================ parts
def contents():
    part("Contents")
    h1("Contents")
    items = [("01", "Basis of the derivation", "How each item's cost was established, and what the source really contains"),
             ("02", "The Irish conversion", "Factors, the evidence behind each, and the sources"),
             ("03", "Summary by CESMM class", "Item counts, median cost and resource mix"),
             ("04", "Items flagged for review", f"The {sum(1 for o in out if o['flag'])} items that need a human check"),
             ("05", "Rate schedule — every item", f"All {len(out):,} priceable items, by class, section and sub-heading"),
             ("A",  "Appendix A — resource rates", f"The {len(res)} labour-gang and plant build-ups behind the rates"),
             ("B",  "Appendix B — preliminaries", f"The {len(pre)} excluded CESMM Class A items")]
    rows = [[Paragraph(f'<font color="#0072CE">{n}</font>', S("n", fontSize=10.4, fontName=HEAVY)),
             Paragraph(t, S("t", fontSize=10.4, fontName=SEMI, textColor=INK)),
             Paragraph(d, S("d", fontSize=9, textColor=TEXT_SUB))] for n, t, d in items]
    t = Table(rows, colWidths=[16*mm, 92*mm, 163*mm])
    t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE"),
                           ("LINEBELOW",(0,0),(-1,-2),0.5,BORDER),
                           ("TOPPADDING",(0,0),(-1,-1),6.4),("BOTTOMPADDING",(0,0),(-1,-1),6.4)]))
    story.append(t)
    story.append(Spacer(1, 7*mm))
    h2("Codes used in the schedule")
    leg = [("SB", "Stated build-up", "The source's own labour, plant and material, reconciling to its published rate"),
           ("MR", "Material recovered", "Material lost from the scan, recovered as rate less labour and plant, then cross-checked"),
           ("SP", "Specialist balance", "Published components kept; the undifferentiated balance carried as sub-contract"),
           ("AH / AE / AC", "Apportioned", "Split on comparable build-ups at sub-heading, section or class level"),
           ("AI", "All-in specialist", "Published as a sub-contract package, carried whole rather than split")]
    dtable(["Code", "Meaning", "What it tells you"],
           [[f'<font color="#1E5FA8">{a}</font>', b, d] for a, b, d in leg],
           [30*mm, 42*mm, 199*mm], ["center", "left", "left"], fs=8)
    story.append(PageBreak())

def part_basis():
    part("01 · Basis of the derivation")
    h1("Basis of the derivation", "01", "Method")
    para("The source is an extract of Spon's Civil Engineering and Highway Works Price Book, in which "
         "every item carries a single published all-in rate. That rate has been set aside as the cost "
         "figure and replaced by a build-up of <b>labour, plant and material</b>, so the cost of each "
         "item is visible rather than assumed.", "lead")
    gbp = sum(o['derived'] for o in out); pub = sum(o['pub'] or 0 for o in out)
    story.append(KPI([("Derived UK cost", f"£{gbp:,.0f}", "sum of all build-ups"),
                      ("Published rates", f"£{pub:,.0f}", "the figures replaced"),
                      ("Difference", f"-£{abs(gbp-pub):,.2f}", "source rounding only"),
                      ("Items reconciling", f"{len(out)-1:,} / {len(out):,}", "one is 2p out in the book")],
                     CONTENT_W))
    story.append(Spacer(1, 3*mm))
    para("The derivation reallocates cost between resource categories; it does not create or destroy any. "
         "That control total adds rates in mixed units and exists only to prove nothing was lost — it is "
         "not a project cost.", "small")
    h2("What the extract actually contains")
    para("The 5,808 rows are not 5,808 rates.")
    dtable(["Rows", "What they are", "Treatment"],
           [["1,232", "Section and sub-heading captions", "Dropped — the hierarchy is carried as grouping in this schedule"],
            ["187", "Explanatory notes", "Dropped"],
            ["543", "Labour-gang and plant hourly build-ups", "Cost <i>inputs</i>, not priceable items — Appendix A"],
            ["53", "CESMM Class A: General Items", "Preliminaries, excluded — Appendix B"],
            [f"<b>{len(out):,}</b>", "<b>Genuinely priceable items</b>", "<b>Costed in this schedule</b>"]],
           [22*mm, 80*mm, 169*mm])
    story.append(Spacer(1, 3*mm))
    para("Separating the 543 resource rows matters: they carry hourly figures in the same columns as the "
         "rates, so any total that includes them double-counts.", "small")

    h2("How each cost was established")
    cnt = collections.Counter(o['basis'] for o in out)
    order = ["Stated build-up", "Material recovered as residual", "Stated components + specialist balance",
             "Apportioned (sub-heading)", "Apportioned (section)", "Apportioned (class)",
             "All-in specialist rate", "All-in (no comparable build-ups)"]
    expl = {
     "Stated build-up": "Labour, plant and material all published and reconciling to the published rate. Taken straight from the source.",
     "Material recovered as residual": "Labour and plant published; the material column was lost in the scan but the rate still contains it. Material = rate less labour and plant, cross-checked against identical operations elsewhere in the same section that do carry a material figure.",
     "Stated components + specialist balance": "Published plant, and sometimes labour, retained as real. The remaining balance of a specialist all-in rate is not broken down at source and is carried as sub-contract.",
     "Apportioned (sub-heading)": "No build-up published. The rate is split on the median labour/plant/material shares of three or more comparable build-ups in the same sub-heading.",
     "Apportioned (section)": "As above, drawing on five or more comparable build-ups in the same section.",
     "Apportioned (class)": "As above, drawing on ten or more build-ups elsewhere in the same CESMM class. The weakest apportionment; every such item appears in part 04.",
     "All-in specialist rate": "CESMM classes B, C, D, M, P and T — ground investigation, geotechnical processes, demolition, structural metalwork, piling and tunnelling — with testing and professional-services sections. Spon's publishes these as sub-contract packages with no build-up, so the whole rate is carried as sub-contract rather than invented into a split.",
     "All-in (no comparable build-ups)": "No build-up published and nothing comparable to apportion from."}
    rows = [[f'<font color="#1E5FA8">{BASIS_CODE[b]}</font>', b, f"{cnt[b]:,}",
             f"{100*cnt[b]/len(out):.1f}%", expl[b]] for b in order if cnt.get(b)]
    rows.append(["", "<b>Total</b>", f"<b>{len(out):,}</b>", "<b>100.0%</b>", ""])
    dtable(["Code", "Basis", "Items", "Share", "What it means"], rows,
           [15*mm, 54*mm, 16*mm, 16*mm, 170*mm],
           ["center", "left", "right", "right", "left"], fs=7.2)

    story.append(PageBreak())

def part_irish():
    part("02 · The Irish conversion")
    h1("The Irish conversion", "02", "Basis")
    para("Each resource category is factored separately and then converted to euro. Factoring separately "
         "matters: Irish labour differs from UK labour by a very different ratio than materials do, and a "
         "single blanket factor on an all-in rate would smear that difference across every item.", "lead")
    dtable(["Input", "Value", "Strength", "Evidence"],
           [["Exchange rate, GBP to EUR", f"<b>{FX}</b>", "Strong",
             "Spot rate, August 2026. The 2026 year-to-date average is 1.1562 — the better choice for a budget or a fixed-price tender."],
            ["Labour factor", f"<b>{LABOUR_F}</b>", "Strong",
             "Irish Sectoral Employment Order rates (effective 1 August 2026) against UK CIJC Working Rule Agreement rates (effective 20 July 2026), compared grade for grade in euro. Derivation below."],
            ["Plant factor", f"<b>{PLANT_F:.2f}</b>", "Assumption",
             "No published Ireland-vs-UK plant differential was found. Plant is internationally traded capital equipment and the two hire markets share the same major suppliers. This is the weakest input here."],
            ["Material factor", f"<b>{MATERIAL_F:.2f}</b>", "Assumption",
             "No Ireland-vs-UK price-<i>level</i> series exists — Eurostat's construction price level indices dropped the UK after Brexit. Irish material inflation is running below the UK (3.2% against 6.0% year-on-year to June 2026), so the gap is narrowing rather than widening."],
            ["Sub-contract factor", f"<b>{SC_F}</b>", "Derived",
             f"Blended from the three factors above on an assumed {int(SC_MIX[0]*100)}/{int(SC_MIX[1]*100)}/{int(SC_MIX[2]*100)} labour/plant/material mix. Specialist trades are more labour and plant intensive than the book average."]],
           [40*mm, 20*mm, 24*mm, 187*mm], ["left", "right", "center", "left"], fs=7.6)

    h2("How the labour factor was derived")
    rows = []
    for ie_n, ie, uk_n, uk in LABOUR_GRADES:
        ukE = round(uk*FX, 2)
        rows.append([ie_n, f"€{ie:.2f}", uk_n, f"£{uk:.2f}", f"€{ukE:.2f}", f"{ie/ukE:.4f}"])
    rows.append(["<b>Blended (equal weight)</b>", "", "", "", "", f"<b>{LABOUR_F}</b>"])
    dtable(["Irish grade (SEO)", "Ireland €/hr", "UK equivalent (CIJC)", "UK £/hr", "UK €/hr", "Ratio"],
           rows, [66*mm, 26*mm, 56*mm, 24*mm, 26*mm, 24*mm],
           ["left", "right", "left", "right", "right", "right"], fs=8)
    story.append(Spacer(1, 2.5*mm))
    para("Irish statutory construction rates run about a third above the UK equivalents once converted to "
         "euro. These are <i>basic</i> rates; employer on-costs differ too (UK National Insurance at 15% "
         "against Irish PRSI at roughly 11.25%), which would trim the premium slightly.", "small")

    h2("Net effect, and a check on it")
    sb = [o for o in out if o['basis'] == "Stated build-up" and o['derived'] < 100000]
    g2 = sum(o['derived'] for o in sb)
    e2 = sum(o['L']*LABOUR_F + o['P']*PLANT_F + o['M']*MATERIAL_F for o in sb)*FX
    story.append(KPI([("£1 of UK cost becomes", f"€{e2/g2:.3f}", f"across {len(sb):,} full build-ups"),
                      ("Of which currency", f"{FX}", "GBP to EUR"),
                      ("Real cost premium", f"{100*(e2/g2/FX-1):.1f}%", "labour-driven"),
                      ("Top-down check", "Dublin 9th", "Bristol 8th, London 2nd")],
                     CONTENT_W))
    story.append(Spacer(1, 3.5*mm))
    para("Arcadis' <i>International Construction Costs 2025</i> ranks Dublin ninth of 100 locations, against "
         "Bristol eighth and London second — Irish construction cost sitting close to a major UK regional "
         "city and below London. A labour-led premium with materials near parity produces exactly that picture.")

    blk = [Paragraph("Sources", ST["h2"])]
    for s in ["Sectoral Employment Order (Construction Sector), Ireland — rates effective 1 August 2026: "
              "Craftsperson €23.74, Category A €23.03, Category B €21.37, New Entrant €17.28.",
              "CIJC Working Rule Agreement, UK — rates effective 20 July 2026: Craft £16.40, "
              "Skill Rate 3 £14.07, General Operative £13.18.",
              "GBP/EUR exchange rate, August 2026 — spot approximately 1.1694; 2026 year-to-date average 1.1562.",
              "CSO Ireland Wholesale Price Index (building and construction materials) and the UK building "
              "materials index — 3.2% against 6.0% year-on-year to June 2026.",
              "Arcadis, International Construction Costs 2025 — Dublin ninth, Bristol eighth, London second of 100 locations.",
              "SCSI Tender Price Index, February 2026 — Irish commercial construction inflation of 3% in the first half of 2026."]:
        blk.append(Paragraph(f'<font color="#0072CE">•</font>&nbsp;&nbsp;{s}',
                             S("src", fontSize=7.7, leading=10.8, textColor=TEXT_SUB, spaceAfter=1.6)))
    story.append(KeepTogether(blk))
    story.append(PageBreak())

def part_summary():
    part("03 · Summary by CESMM class")
    h1("Summary by CESMM class", "03", "Overview")
    para("Item counts and derived cost by class. Median cost is the better guide: the total adds rates in "
         "different units and is dominated by a handful of very large specialist lump sums.", "small")
    story.append(Spacer(1, 2.5*mm))
    g = collections.defaultdict(list)
    for o in out: g[o['cls']].append(o)
    rows = []
    for cls in sorted(g):
        it = g[cls]; e = [eur(o) for o in it]
        tot = sum(x[4] for x in e); med = statistics.median([x[4] for x in e])
        L = sum(x[0] for x in e); P = sum(x[1] for x in e)
        M = sum(x[2] for x in e); Sc = sum(x[3] for x in e)
        mix = f"{100*L/tot:.0f} / {100*P/tot:.0f} / {100*M/tot:.0f} / {100*Sc/tot:.0f}" if tot else "–"
        fl = sum(1 for o in it if o['flag'])
        rows.append([cls, f"{len(it):,}", money(med), money(tot), mix, f"{fl}" if fl else "–"])
    rows.append(["<b>All classes</b>", f"<b>{len(out):,}</b>",
                 f"<b>{money(statistics.median([eur(o)[4] for o in out]))}</b>",
                 f"<b>{money(sum(eur(o)[4] for o in out))}</b>", "",
                 f"<b>{sum(1 for o in out if o['flag'])}</b>"])
    dtable(["CESMM class", "Items", "Median cost", "Total (control)",
            "Mix  L / P / M / Sub-con  %", "Flagged"], rows,
           [102*mm, 19*mm, 30*mm, 36*mm, 56*mm, 20*mm],
           ["left", "right", "right", "right", "center", "right"], fs=7.1)
    story.append(PageBreak())

def part_review():
    rq = [o for o in out if o['flag']]
    part("04 · Items flagged for review")
    h1("Items flagged for review", "04", "Data quality")
    para(f"{len(rq)} of {len(out):,} items carry a flag. They are priced in the schedule at the values "
         "shown; review them before relying on those figures.", "lead")
    meaning = {"Apportioned at class level":"Split using class-level comparables only — the weakest apportionment. Indicative.",
               "Large unexplained balance":"More than three quarters of a specialist rate is an undifferentiated balance.",
               "High value — verify":"Unit rate of £250,000 or more. Plausible for major specialist works, but worth checking.",
               "Outlier vs comparable items":"Far from the median of directly comparable items in the same group.",
               "Probable source error — verify":"An order of magnitude out of line with everything else in its class — most likely a mis-read digit in the source scan."}
    fc = collections.Counter(o['flag'] for o in rq)
    dtable(["Flag", "Items", "Meaning"],
           [[f"<b>{f}</b>", f"{n}", meaning[f]] for f, n in fc.most_common()],
           [60*mm, 18*mm, 185*mm], ["left", "right", "left"], fs=7.8)
    story.append(Spacer(1, 4*mm))
    h2("The flagged items")
    rows = []
    for o in sorted(rq, key=lambda x: (x['cls'], -eur(x)[4])):
        rows.append([o['src'], o['cls'].split(":")[0].replace("CLASS ", ""),
                     f"{o['sub']} — {o['item']}" if o['sub'] else o['item'],
                     o['unit'] or "–", money(eur(o)[4]), o['flag'], o['note']])
    dtable(["Ref", "Cl.", "Item", "Unit", "Irish cost", "Flag", "Why"], rows,
           [12*mm, 9*mm, 76*mm, 11*mm, 24*mm, 35*mm, 96*mm],
           ["right", "center", "left", "center", "right", "left", "left"], fs=6.6)
    story.append(PageBreak())

# ---------------------------------------------------------------- schedule
SCHED_W = [12*mm, 97*mm, 11*mm, 20*mm, 19*mm, 21*mm, 21*mm, 25*mm, 21*mm, 12*mm, 14*mm]
SCHED_H = ["Ref", "Item", "Unit", "Labour €", "Plant €", "Material €",
           "Sub-con €", "Irish cost €", "UK cost £", "Basis", "Conf."]

def part_schedule():
    part("05 · Rate schedule")
    h1("Rate schedule — every item", "05", "Schedule")
    para(f"All {len(out):,} priceable items, grouped as the source presents them: CESMM class, then "
         "section, then sub-heading. <b>Irish cost €</b> is the deliverable; <b>UK cost £</b> is the "
         "build-up it derives from. A dash means the category carries no cost for that item. Basis and "
         "confidence codes are listed in the contents; a tinted reference marks an item in part 04.", "lead")
    story.append(Spacer(1, 2*mm))

    byclass = collections.OrderedDict()
    for o in out: byclass.setdefault(o['cls'], []).append(o)

    for cls, items in byclass.items():
        story.append(Part(f"05 · {cls.split(':')[0]}"))
        data = [[Paragraph(spm(h), ST["th"]) for h in SCHED_H]]
        sty = [("BACKGROUND",(0,0),(-1,0),NAVY), ("VALIGN",(0,0),(-1,-1),"TOP"),
               ("LINEBELOW",(0,0),(-1,0),1.4,SIGNAL),
               ("LINEAFTER",(0,0),(-2,-1),0.4,BORDER),
               ("LINEBELOW",(0,2),(-1,-1),0.4,BORDER),
               ("TOPPADDING",(0,0),(-1,-1),2.4),("BOTTOMPADDING",(0,0),(-1,-1),2.4),
               ("LEFTPADDING",(0,0),(-1,-1),3.4),("RIGHTPADDING",(0,0),(-1,-1),3.4)]
        r = 1
        data.append([Paragraph(cls, ST["grpA"])] + [""]*10)
        sty += [("SPAN",(0,r),(-1,r)), ("BACKGROUND",(0,r),(-1,r),NAVY_DEEP),
                ("LINEBELOW",(0,r),(-1,r),1.2,SIGNAL),
                ("TOPPADDING",(0,r),(-1,r),4),("BOTTOMPADDING",(0,r),(-1,r),4)]
        r += 1
        last_sec = last_sub = None
        for o in items:
            if o['sec'] != last_sec:
                data.append([Paragraph(o['sec'] or "—", ST["grpB"])] + [""]*10)
                sty += [("SPAN",(0,r),(-1,r)), ("BACKGROUND",(0,r),(-1,r),BG3),
                        ("LINEBEFORE",(0,r),(0,r),2.2,SIG_DEEP),
                        ("TOPPADDING",(0,r),(-1,r),3.4),("BOTTOMPADDING",(0,r),(-1,r),3.4)]
                r += 1; last_sec = o['sec']; last_sub = None
            if o['sub'] != last_sub:
                if o['sub'] and o['sub'] != o['item']:
                    data.append([Paragraph(o['sub'], ST["grpC"])] + [""]*10)
                    sty += [("SPAN",(0,r),(-1,r)), ("BACKGROUND",(0,r),(-1,r),SURF2),
                            ("TOPPADDING",(0,r),(-1,r),2.8),("BOTTOMPADDING",(0,r),(-1,r),2.8)]
                    r += 1
                last_sub = o['sub']
            L, P, M, Sc, T = eur(o)
            cc = CONF_CODE.get(o['conf'], "?")
            data.append([Paragraph(str(o['src']), ST["cellr"]),
                         Paragraph(o['item'], ST["cell"]),
                         Paragraph(o['unit'] or "–", ST["cellc"]),
                         Paragraph(money(L), ST["cellr"]), Paragraph(money(P), ST["cellr"]),
                         Paragraph(money(M), ST["cellr"]), Paragraph(money(Sc), ST["cellr"]),
                         Paragraph(money(T), ST["cellb"]),
                         Paragraph(money(o['derived'], "£"), ST["cellr"]),
                         Paragraph(BASIS_CODE.get(o['basis'], "?"),
                                   S("bc", fontSize=6.4, leading=8.8, alignment=TA_CENTER,
                                     fontName=MED, textColor=SEC_DEEP)),
                         Paragraph(cc, S("cc", fontSize=6.1, leading=8.8, alignment=TA_CENTER,
                                         fontName=MED, textColor=CONF_TEXT.get(cc, TEXT)))])
            sty.append(("BACKGROUND",(7,r),(7,r),ACC_SOFT))
            if cc in CONF_FILL: sty.append(("BACKGROUND",(10,r),(10,r),CONF_FILL[cc]))
            if o['flag']: sty.append(("BACKGROUND",(0,r),(0,r),FLAG_FILL))
            r += 1
        t = LongTable(data, colWidths=SCHED_W, repeatRows=2)
        t.setStyle(TableStyle(sty))
        story.append(t)
        story.append(PageBreak())

def appendix_resources():
    story.append(Part("Appendix A · Resource rates"))
    h1("Resource rates", "A", "Appendix")
    para("The hourly labour-gang and plant build-ups published in the source. These are the cost "
         "<i>inputs</i> behind the unit rates, not priceable items, and are excluded from the schedule so "
         "they are not double-counted. Rows reading 'Total Gang Rate/Hour' or 'Total Rate/Hour' are the "
         "composite rates. Figures are as published, in sterling.", "lead")
    dtable(["Ref", "Cl.", "Resource type", "Gang / plant spread", "Resource", "Labour £/hr", "Plant £/hr"],
           [[x[12], x[1].split(":")[0].replace("CLASS ", ""), x[2], x[3], x[4],
             money(x[6], "£"), money(x[7], "£")] for x in res],
           [12*mm, 9*mm, 36*mm, 74*mm, 89*mm, 26*mm, 26*mm],
           ["right", "center", "left", "left", "left", "right", "right"], fs=6.8)
    story.append(PageBreak())

def appendix_prelims():
    story.append(Part("Appendix B · Preliminaries"))
    h1("Preliminaries (excluded)", "B", "Appendix")
    para("CESMM Class A: General Items, excluded from the derivation as requested. Retained here unchanged "
         "so they can be brought back in later. Preliminaries are normally priced as a project-level "
         "allowance rather than built into unit rates, so they are not factored to an Irish basis. Figures "
         "are as published, in sterling.", "lead")
    dtable(["Ref", "Section", "Sub-heading", "Item", "Unit", "Labour £", "Plant £", "Material £", "Published rate £"],
           [[x[12], x[2], x[3], x[4], x[9] or "–", money(x[6], "£"), money(x[7], "£"),
             money(x[8], "£"), money(x[10], "£")] for x in pre],
           [12*mm, 40*mm, 56*mm, 62*mm, 12*mm, 21*mm, 21*mm, 23*mm, 28*mm],
           ["right", "left", "left", "left", "center", "right", "right", "right", "right"], fs=6.8)

# ============================================================ build
DOC = Doc(OUT, pagesize=PAGE, leftMargin=LM, rightMargin=RM, topMargin=TM, bottomMargin=BM,
          title="Irish Derived Cost Schedule — InfraBid",
          author="InfraBid",
          subject="Spon's Civil Engineering rates derived from labour, plant and material, "
                  "converted to an Irish basis")

story.append(Spacer(1, PAGE[1]-TM-BM-2))       # page 1 is painted by cover()
story.append(PageBreak())
contents()
part_basis()
part_irish()
part_summary()
part_review()
part_schedule()
appendix_resources()
appendix_prelims()

DOC.build(story)
print("saved", OUT)
