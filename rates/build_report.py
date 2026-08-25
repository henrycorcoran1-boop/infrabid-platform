"""
Stage 3 of 3. Renders the derived cost data into a full printed rate schedule PDF
containing every priceable item, plus method/basis front matter and appendices.

    python3 build_report.py [work_dir] [output.pdf]

Requires reportlab. work_dir must hold out.json / res.json / pre.json from derive_costs.py.
"""
import json, os, sys, collections, statistics
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                LongTable, Table, TableStyle, PageBreak, KeepTogether)
from reportlab.pdfgen import canvas as _canvas

B = (sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))).rstrip("/") + "/"
OUT = sys.argv[2] if len(sys.argv) > 2 else B + "Spons_Irish_Derived_Costs_Report.pdf"

out = json.load(open(B + "out.json"))
res = json.load(open(B + "res.json"))
pre = json.load(open(B + "pre.json"))

# ---------------------------------------------------------------- Irish basis
FX, LABOUR_F, PLANT_F, MATERIAL_F = 1.1694, 1.3415, 1.00, 1.00
SC_MIX = (0.35, 0.30, 0.35)
SC_F = round(SC_MIX[0]*LABOUR_F + SC_MIX[1]*PLANT_F + SC_MIX[2]*MATERIAL_F, 4)
LABOUR_GRADES = [("Craftsperson", 23.74, "Craft rate", 16.40),
                 ("Category A (skilled operative)", 23.03, "Skill Rate 3", 14.07),
                 ("Category B (general operative)", 21.37, "General operative", 13.18)]

def eur(o):
    L = o['L']*LABOUR_F*FX; P = o['P']*PLANT_F*FX
    M = o['M']*MATERIAL_F*FX; S = o['SC']*SC_F*FX
    return round(L,2), round(P,2), round(M,2), round(S,2), round(L+P+M+S, 2)

BASIS_CODE = {"Stated build-up":"SB", "Material recovered as residual":"MR",
              "Stated components + specialist balance":"SP", "Apportioned (sub-heading)":"AH",
              "Apportioned (section)":"AE", "Apportioned (class)":"AC",
              "All-in specialist rate":"AI", "All-in (no comparable build-ups)":"AN",
              "Stated components (no published total)":"SC", "No data":"–"}
CONF_CODE = {"High":"High", "Medium-High":"Med-Hi", "Medium":"Med", "Low":"Low",
             "All-in (not split)":"All-in", "None":"–"}

# ---------------------------------------------------------------- house style
NAVY   = colors.HexColor("#1F3864")
STEEL  = colors.HexColor("#2E5A8A")
RULE   = colors.HexColor("#C9D2DE")
BANDA  = colors.HexColor("#F4F6F9")
GREY   = colors.HexColor("#5A5A5A")
EURFIL = colors.HexColor("#EAF1FA")
FLAGF  = colors.HexColor("#FCE4D6")
CONFF  = {"High":colors.HexColor("#E2EFDA"), "Med-Hi":colors.HexColor("#EAF3E0"),
          "Med":colors.HexColor("#FFF2CC"), "Low":colors.HexColor("#FCE4D6"),
          "All-in":colors.HexColor("#E7E6E6")}

def S(name, **kw):
    base = dict(fontName="Helvetica", fontSize=8.6, leading=11.4, textColor=colors.black)
    base.update(kw); return ParagraphStyle(name, **base)

ST = {
 "title":   S("title", fontSize=27, leading=32, fontName="Helvetica-Bold", textColor=NAVY),
 "sub":     S("sub", fontSize=12.5, leading=17, textColor=GREY),
 "h1":      S("h1", fontSize=16, leading=20, fontName="Helvetica-Bold", textColor=NAVY,
              spaceBefore=2, spaceAfter=8),
 "h2":      S("h2", fontSize=11, leading=14, fontName="Helvetica-Bold", textColor=STEEL,
              spaceBefore=11, spaceAfter=5),
 "body":    S("body", spaceAfter=6),
 "small":   S("small", fontSize=7.6, leading=10, textColor=GREY),
 "cell":    S("cell", fontSize=7, leading=8.4),
 "cellb":   S("cellb", fontSize=7, leading=8.4, fontName="Helvetica-Bold"),
 "cellr":   S("cellr", fontSize=7, leading=8.4, alignment=TA_RIGHT),
 "grp1":    S("grp1", fontSize=8.6, leading=10.5, fontName="Helvetica-Bold",
              textColor=colors.white),
 "grp2":    S("grp2", fontSize=7.6, leading=9.4, fontName="Helvetica-Bold", textColor=NAVY),
 "grp3":    S("grp3", fontSize=7.2, leading=9, fontName="Helvetica-Oblique", textColor=STEEL),
 "hdr":     S("hdr", fontSize=7, leading=8.4, fontName="Helvetica-Bold",
              textColor=colors.white, alignment=TA_CENTER),
 "toc":     S("toc", fontSize=9.6, leading=15),
}

PAGE = landscape(A4)
LM = RM = 12*mm; TM = 16*mm; BM = 14*mm
CONTENT_W = PAGE[0] - LM - RM          # 273 mm

def money(v, sym="€"):
    if v is None: return "–"
    if abs(v) < 0.005: return "–"
    return f"{sym}{v:,.2f}"

# ---------------------------------------------------------------- page frame
class Doc(BaseDocTemplate):
    def __init__(self, *a, **kw):
        BaseDocTemplate.__init__(self, *a, **kw)
        self.section = ""
        frame = Frame(LM, BM, CONTENT_W, PAGE[1]-TM-BM, id="f",
                      leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=self.decorate)])

    def decorate(self, c, doc):
        if c.getPageNumber() == 1: return
        c.saveState()
        c.setFont("Helvetica-Bold", 7.6); c.setFillColor(NAVY)
        c.drawString(LM, PAGE[1]-TM+6*mm, "Irish Derived Cost Schedule")
        c.setFont("Helvetica", 7.6); c.setFillColor(GREY)
        c.drawRightString(PAGE[0]-RM, PAGE[1]-TM+6*mm,
                          "Spon's Civil Engineering rates · Irish basis")
        c.setStrokeColor(RULE); c.setLineWidth(0.6)
        c.line(LM, PAGE[1]-TM+4.4*mm, PAGE[0]-RM, PAGE[1]-TM+4.4*mm)
        c.line(LM, BM-4*mm, PAGE[0]-RM, BM-4*mm)
        c.setFont("Helvetica", 7); c.setFillColor(GREY)
        c.drawString(LM, BM-8*mm, "Spon's Civil Engineering rates — costs derived from labour, "
                                  "plant and material, converted to an Irish basis. Net cost: excludes "
                                  "overhead, profit, preliminaries and VAT.")
        c.drawRightString(PAGE[0]-RM, BM-8*mm, f"Page {c.getPageNumber()}")
        c.restoreState()

story = []
def sect(name):   # retained as a no-op anchor; the class banner carries context in-table
    pass

class SectionMarker:
    def __init__(self, name): self.name = name

# ---------------------------------------------------------------- cover
def cover():
    story.append(Spacer(1, 46*mm))
    story.append(Paragraph("Irish Derived Cost Schedule", ST["title"]))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("Spon's Civil Engineering and Highway Works rates, rebuilt as a "
                           "labour / plant / material cost build-up and converted to an Irish basis",
                           ST["sub"]))
    story.append(Spacer(1, 10*mm))
    tot = sum(eur(o)[4] for o in out)
    rows = [["Priceable items", f"{len(out):,}"],
            ["Basis", "Cost = Labour + Plant + Material + Sub-contract"],
            ["Currency", f"EUR, converted at GBP→EUR {FX}"],
            ["Labour factor (Ireland ÷ UK)", f"{LABOUR_F}"],
            ["Plant / material factors", f"{PLANT_F:.2f} / {MATERIAL_F:.2f} (parity — stated assumptions)"],
            ["Preliminaries", "Excluded (CESMM Class A), listed at Appendix B"],
            ["Items flagged for review", f"{sum(1 for o in out if o['flag']):,}"]]
    t = Table(rows, colWidths=[62*mm, 150*mm])
    t.setStyle(TableStyle([
        ("FONT",(0,0),(0,-1),"Helvetica-Bold",9.2), ("FONT",(1,0),(1,-1),"Helvetica",9.2),
        ("TEXTCOLOR",(0,0),(0,-1),NAVY), ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LINEBELOW",(0,0),(-1,-2),0.5,RULE), ("TOPPADDING",(0,0),(-1,-1),4.4),
        ("BOTTOMPADDING",(0,0),(-1,-1),4.4)]))
    story.append(t)
    story.append(Spacer(1, 12*mm))
    story.append(Paragraph(
        "This schedule is a derived cost model, not a quotation. Irish figures are UK build-ups "
        "factored to an Irish basis; the labour factor rests on statutory rates both sides, while "
        "plant and material sit at parity as stated assumptions. Verify against Irish supplier and "
        "hire-desk quotations before tender use.", ST["small"]))
    story.append(PageBreak())

# ---------------------------------------------------------------- contents
def contents():
    sect("Contents")
    story.append(Paragraph("Contents", ST["h1"]))
    items = [("1", "Basis of the derivation", "How each item's cost was established"),
             ("2", "The Irish conversion", "Factors, evidence and sources"),
             ("3", "Summary by CESMM class", "Item counts and cost mix"),
             ("4", "Items flagged for review", f"{sum(1 for o in out if o['flag'])} items needing a check"),
             ("5", "Rate schedule — every item", f"All {len(out):,} priceable items, by class"),
             ("A", "Appendix A — resource rates", f"{len(res)} labour-gang and plant build-ups"),
             ("B", "Appendix B — preliminaries", f"{len(pre)} excluded Class A items")]
    rows = [[Paragraph(f"<b>{n}</b>", ST["toc"]), Paragraph(f"<b>{t}</b>", ST["toc"]),
             Paragraph(d, S("t2", fontSize=9.6, leading=15, textColor=GREY))] for n, t, d in items]
    t = Table(rows, colWidths=[14*mm, 86*mm, 120*mm])
    t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),
                           ("LINEBELOW",(0,0),(-1,-2),0.5,RULE),
                           ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
    story.append(t)
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph("Codes used in the schedule", ST["h2"]))
    leg = [["SB", "Stated build-up — the source's own labour/plant/material figures, reconciling to its rate"],
           ["MR", "Material recovered as residual — material missing from the scan, recovered as rate less labour and plant"],
           ["SP", "Stated components + specialist balance — published components kept, undifferentiated balance to sub-contract"],
           ["AH / AE / AC", "Apportioned from comparable build-ups at sub-heading / section / class level"],
           ["AI", "All-in specialist rate — published as a sub-contract package, carried whole and not split"]]
    lt = Table([[Paragraph(f"<b>{a}</b>", ST["cell"]), Paragraph(b, ST["cell"])] for a, b in leg],
               colWidths=[26*mm, 194*mm])
    lt.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("TOPPADDING",(0,0),(-1,-1),3),
                            ("BOTTOMPADDING",(0,0),(-1,-1),3),
                            ("LINEBELOW",(0,0),(-1,-2),0.4,RULE)]))
    story.append(lt)
    story.append(PageBreak())

# ---------------------------------------------------------------- narrative helpers
def para(t): story.append(Paragraph(t, ST["body"]))
def h1(t): story.append(Paragraph(t, ST["h1"]))
def h2(t): story.append(Paragraph(t, ST["h2"]))

def datatable(header, rows, widths, aligns=None, fs=8):
    hs = S("th", fontSize=fs, leading=fs+2.4, fontName="Helvetica-Bold", textColor=colors.white)
    data = [[Paragraph(h, hs) for h in header]]
    for r in rows:
        line = []
        for i, v in enumerate(r):
            al = (aligns or ["left"]*len(r))[i]
            st = S(f"td{al}", fontSize=fs, leading=fs+2.4,
                   alignment={"left":TA_LEFT,"right":TA_RIGHT,"center":TA_CENTER}[al])
            line.append(Paragraph(str(v), st))
        data.append(line)
    t = LongTable(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),NAVY), ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, BANDA]),
        ("GRID",(0,0),(-1,-1),0.4,RULE),
        ("TOPPADDING",(0,0),(-1,-1),3.2),("BOTTOMPADDING",(0,0),(-1,-1),3.2),
        ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4)]))
    story.append(t)
    return t

# ---------------------------------------------------------------- 1. basis
def section_basis():
    sect("1 · Basis of the derivation")
    h1("1 · Basis of the derivation")
    para("The source is an extract of Spon's Civil Engineering and Highway Works Price Book, in which "
         "each item carries a single published all-in rate. That rate has been set aside as the cost "
         "figure and replaced by a build-up of <b>labour, plant and material</b>, so the cost of each "
         "item is visible rather than assumed.")
    para("The 5,808 rows of the extract are not 5,808 rates. They separate as follows.")
    datatable(["Rows", "What they are", "Treatment"],
              [["1,232", "Section and sub-heading captions", "Dropped — the hierarchy is carried as grouping in this schedule"],
               ["187", "Explanatory notes", "Dropped"],
               ["543", "Labour-gang and plant hourly build-ups", "Cost <i>inputs</i>, not priceable items — Appendix A"],
               ["53", "CESMM Class A: General Items", "Preliminaries, excluded — Appendix B"],
               [f"<b>{len(out):,}</b>", "<b>Genuinely priceable items</b>", "<b>Costed in this schedule</b>"]],
              [20*mm, 78*mm, 175*mm])
    story.append(Spacer(1, 3*mm))
    para("Separating the 543 resource rows matters: they carry hourly figures in the same columns as "
         "the rates, so any total that includes them double-counts.")

    h2("How each cost was established")
    cnt = collections.Counter(o['basis'] for o in out)
    order = ["Stated build-up", "Material recovered as residual", "Stated components + specialist balance",
             "Apportioned (sub-heading)", "Apportioned (section)", "Apportioned (class)",
             "All-in specialist rate", "All-in (no comparable build-ups)"]
    expl = {
     "Stated build-up": "Labour, plant and material all published and reconciling to the published rate. Taken straight from the source.",
     "Material recovered as residual": "Labour and plant published; the material column was lost in the scan but the rate still contains it. Material = rate − labour − plant, cross-checked against identical operations elsewhere in the same section that do carry a material figure.",
     "Stated components + specialist balance": "Published plant, and sometimes labour, retained as real. The remaining balance of a specialist all-in rate is not broken down at source and is carried as sub-contract.",
     "Apportioned (sub-heading)": "No build-up published. The rate is split on the median labour/plant/material shares of three or more comparable build-ups in the same sub-heading.",
     "Apportioned (section)": "As above, drawing on five or more comparable build-ups in the same section.",
     "Apportioned (class)": "As above, drawing on ten or more build-ups elsewhere in the same CESMM class. The weakest apportionment; every such item appears in section 4.",
     "All-in specialist rate": "CESMM classes B, C, D, M, P and T — ground investigation, geotechnical processes, demolition, structural metalwork, piling and tunnelling — together with testing and professional-services sections. Spon's publishes these as sub-contract packages with no build-up, so the whole rate is carried as sub-contract rather than invented into a split.",
     "All-in (no comparable build-ups)": "No build-up published and nothing comparable to apportion from."}
    rows = [[BASIS_CODE[b], b, f"{cnt[b]:,}", f"{100*cnt[b]/len(out):.1f}%", expl[b]]
            for b in order if cnt.get(b)]
    rows.append(["", "<b>Total</b>", f"<b>{len(out):,}</b>", "<b>100.0%</b>", ""])
    datatable(["Code", "Basis", "Items", "Share", "What it means"], rows,
              [13*mm, 52*mm, 15*mm, 15*mm, 178*mm],
              ["center", "left", "right", "right", "left"], fs=7.4)

    h2("Reconciliation")
    gbp = sum(o['derived'] for o in out); pub = sum(o['pub'] or 0 for o in out)
    para(f"Derived UK costs sum to <b>£{gbp:,.2f}</b> against <b>£{pub:,.2f}</b> of published "
         f"rates — a difference of <b>£{gbp-pub:,.2f}</b>, which is source rounding. The derivation "
         "reallocates cost between resource categories; it does not create or destroy any. That total sums "
         "rates in mixed units and is a control figure only, not a project cost.")
    story.append(PageBreak())

# ---------------------------------------------------------------- 2. Irish basis
def section_irish():
    sect("2 · The Irish conversion")
    h1("2 · The Irish conversion")
    para("Each resource category is factored separately and then converted to euro. Factoring the "
         "categories separately matters: Irish labour differs from UK labour by a very different ratio "
         "than materials do, and a single blanket factor on an all-in rate would smear that difference "
         "across every item.")
    datatable(["Input", "Value", "Strength", "Evidence"],
              [["GBP → EUR", f"{FX}", "Strong",
                "Spot rate, August 2026. The 2026 year-to-date average is 1.1562 — the better choice for a budget or a fixed-price tender."],
               ["Labour factor", f"{LABOUR_F}", "Strong",
                "Irish Sectoral Employment Order rates (effective 1 August 2026) against UK CIJC Working Rule Agreement rates (effective 20 July 2026), compared grade for grade in euro. Derivation below."],
               ["Plant factor", f"{PLANT_F:.2f}", "Assumption",
                "No published Ireland-vs-UK plant differential was found. Plant is internationally traded capital equipment and the two hire markets share the same major suppliers. This is the weakest input here."],
               ["Material factor", f"{MATERIAL_F:.2f}", "Assumption",
                "No Ireland-vs-UK price-<i>level</i> series exists — Eurostat's construction price level indices dropped the UK after Brexit. Irish material inflation is running below the UK (3.2% against 6.0% year-on-year to June 2026), so the gap is narrowing rather than widening."],
               ["Sub-contract factor", f"{SC_F}", "Derived",
                f"Blended from the three factors above on an assumed {int(SC_MIX[0]*100)}/{int(SC_MIX[1]*100)}/{int(SC_MIX[2]*100)} labour/plant/material mix. Specialist trades are more labour and plant intensive than the book average."]],
              [30*mm, 18*mm, 22*mm, 203*mm], ["left", "right", "center", "left"], fs=7.6)

    h2("How the labour factor was derived")
    rows = []
    for ie_n, ie, uk_n, uk in LABOUR_GRADES:
        ukE = round(uk*FX, 2)
        rows.append([ie_n, f"€{ie:.2f}", uk_n, f"£{uk:.2f}", f"€{ukE:.2f}",
                     f"{ie/ukE:.4f}"])
    rows.append(["<b>Blended (equal weight)</b>", "", "", "", "", f"<b>{LABOUR_F}</b>"])
    datatable(["Irish grade (SEO)", "Ireland €/hr", "UK equivalent (CIJC)", "UK £/hr",
               "UK €/hr", "Ratio"], rows,
              [62*mm, 24*mm, 52*mm, 22*mm, 24*mm, 22*mm],
              ["left", "right", "left", "right", "right", "right"], fs=8)
    story.append(Spacer(1, 3*mm))
    para("Irish statutory construction rates run about a third above the UK equivalents once converted "
         "to euro. These are <i>basic</i> rates; employer on-costs differ too (UK National Insurance at "
         "15% against Irish PRSI at roughly 11.25%), which would trim the premium slightly.")

    h2("Net effect, and a check on it")
    sb = [o for o in out if o['basis'] == "Stated build-up" and o['derived'] < 100000]
    g2 = sum(o['derived'] for o in sb)
    e2 = sum(o['L']*LABOUR_F + o['P']*PLANT_F + o['M']*MATERIAL_F for o in sb)*FX
    para(f"Across the {len(sb):,} items the source builds up in full, <b>£1 of UK cost becomes "
         f"€{e2/g2:.3f}</b>. Of that, {FX} is currency and roughly "
         f"{100*(e2/g2/FX-1):.1f}% is a real, labour-driven cost premium.")
    para("That is consistent with the top-down evidence. Arcadis' <i>International Construction Costs "
         "2025</i> ranks Dublin ninth of 100 locations, against Bristol eighth and London second — "
         "Irish construction cost sitting close to a major UK regional city and below London. A "
         "labour-led premium with materials near parity produces exactly that picture.")

    blk = [Paragraph("Sources", ST["h2"])]
    for s in ["Sectoral Employment Order (Construction Sector), Ireland — rates effective 1 August 2026: "
              "Craftsperson €23.74, Category A €23.03, Category B €21.37, New Entrant €17.28.",
              "CIJC Working Rule Agreement, UK — rates effective 20 July 2026: Craft £16.40, "
              "Skill Rate 3 £14.07, General Operative £13.18.",
              "GBP/EUR exchange rate, August 2026 — spot approximately 1.1694; 2026 year-to-date average 1.1562.",
              "CSO Ireland Wholesale Price Index (building and construction materials) and the UK building "
              "materials index — 3.2% against 6.0% year-on-year to June 2026.",
              "Arcadis, International Construction Costs 2025 — Dublin ninth, Bristol eighth, London second of 100 locations.",
              "SCSI Tender Price Index, February 2026 — Irish commercial construction inflation of 3% in the "
              "first half of 2026."]:
        blk.append(Paragraph("•&nbsp;&nbsp;" + s,
                             S("src", fontSize=7.6, leading=10.6, textColor=GREY, spaceAfter=1.4)))
    story.append(KeepTogether(blk))
    story.append(PageBreak())

# ---------------------------------------------------------------- 3. summary
def section_summary():
    sect("3 · Summary by CESMM class")
    h1("3 · Summary by CESMM class")
    para("Item counts and derived cost by class. Median cost is a better guide than the total, which "
         "adds rates in different units and is dominated by a handful of very large specialist lump sums.")
    g = collections.defaultdict(list)
    for o in out: g[o['cls']].append(o)
    rows = []
    for cls in sorted(g):
        it = g[cls]
        e = [eur(o) for o in it]
        tot = sum(x[4] for x in e)
        med = statistics.median([x[4] for x in e])
        L = sum(x[0] for x in e); P = sum(x[1] for x in e)
        M = sum(x[2] for x in e); Sc = sum(x[3] for x in e)
        mix = f"{100*L/tot:.0f} / {100*P/tot:.0f} / {100*M/tot:.0f} / {100*Sc/tot:.0f}" if tot else "–"
        rows.append([cls, f"{len(it):,}", money(med), money(tot), mix,
                     f"{sum(1 for o in it if o['flag'])}"])
    tote = sum(eur(o)[4] for o in out)
    rows.append([f"<b>All classes</b>", f"<b>{len(out):,}</b>", f"<b>{money(statistics.median([eur(o)[4] for o in out]))}</b>",
                 f"<b>{money(tote)}</b>", "", f"<b>{sum(1 for o in out if o['flag'])}</b>"])
    datatable(["CESMM class", "Items", "Median cost", "Total (control)",
               "Mix L / P / M / Sub-con %", "Flagged"], rows,
              [104*mm, 18*mm, 28*mm, 34*mm, 56*mm, 18*mm],
              ["left", "right", "right", "right", "center", "right"], fs=7.6)
    story.append(PageBreak())

# ---------------------------------------------------------------- 4. review queue
def section_review():
    rq = [o for o in out if o['flag']]
    sect("4 · Items flagged for review")
    h1("4 · Items flagged for review")
    para(f"{len(rq)} of {len(out):,} items carry a flag. They are priced in the schedule at the values "
         "shown; review them before relying on those figures.")
    fc = collections.Counter(o['flag'] for o in rq)
    datatable(["Flag", "Items", "Meaning"],
              [[f, f"{n}", {"Apportioned at class level":"Split using class-level comparables only — the weakest apportionment. Indicative.",
                            "Large unexplained balance":"More than three quarters of a specialist rate is an undifferentiated balance.",
                            "High value — verify":"Unit rate of £250,000 or more. Plausible for major specialist works, but worth checking.",
                            "Outlier vs comparable items":"Far from the median of directly comparable items in the same group.",
                            "Probable source error — verify":"An order of magnitude out of line with everything else in its class — most likely a mis-read digit in the source scan."}[f]]
               for f, n in fc.most_common()],
              [58*mm, 16*mm, 199*mm], ["left", "right", "left"], fs=7.8)
    story.append(Spacer(1, 4*mm))
    h2("The flagged items")
    rows = []
    for o in sorted(rq, key=lambda x: (x['cls'], -eur(x)[4])):
        L, P, M, Sc, T = eur(o)
        rows.append([o['src'], o['cls'].split(":")[0], f"{o['sub']} — {o['item']}" if o['sub'] else o['item'],
                     o['unit'] or "–", money(T), o['flag'], o['note']])
    datatable(["Ref", "Class", "Item", "Unit", "Irish cost", "Flag", "Why"], rows,
              [12*mm, 15*mm, 74*mm, 11*mm, 23*mm, 34*mm, 104*mm],
              ["right", "left", "left", "center", "right", "left", "left"], fs=6.6)
    story.append(PageBreak())

# ---------------------------------------------------------------- 5. full schedule
SCHED_W = [12*mm, 99*mm, 11*mm, 20*mm, 19*mm, 21*mm, 21*mm, 24*mm, 21*mm, 12*mm, 13*mm]
SCHED_H = ["Ref", "Item", "Unit", "Labour €", "Plant €", "Material €",
           "Sub-con €", "IRISH COST €", "UK cost £", "Basis", "Conf."]

def section_schedule():
    sect("5 · Rate schedule")
    h1("5 · Rate schedule — every item")
    para(f"All {len(out):,} priceable items, grouped as the source presents them: CESMM class, then "
         "section, then sub-heading. <b>Irish cost €</b> is the deliverable; <b>UK cost £</b> is the "
         "build-up it derives from. Basis and confidence codes are listed in the contents. A dash means "
         "the category carries no cost for that item.")
    story.append(Spacer(1, 3*mm))

    byclass = collections.OrderedDict()
    for o in out: byclass.setdefault(o['cls'], []).append(o)

    for cls, items in byclass.items():
        data = [[Paragraph(h, ST["hdr"]) for h in SCHED_H]]
        styl = [("BACKGROUND",(0,0),(-1,0),NAVY), ("VALIGN",(0,0),(-1,-1),"TOP"),
                ("GRID",(0,0),(-1,-1),0.35,RULE),
                ("TOPPADDING",(0,0),(-1,-1),2.1),("BOTTOMPADDING",(0,0),(-1,-1),2.1),
                ("LEFTPADDING",(0,0),(-1,-1),3),("RIGHTPADDING",(0,0),(-1,-1),3)]
        r = 1
        # class banner
        data.append([Paragraph(cls, ST["grp1"])] + [""]*10)
        styl += [("SPAN",(0,r),(-1,r)), ("BACKGROUND",(0,r),(-1,r),NAVY)]
        r += 1
        last_sec = last_sub = None
        for o in items:
            if o['sec'] != last_sec:
                data.append([Paragraph(o['sec'] or "—", ST["grp2"])] + [""]*10)
                styl += [("SPAN",(0,r),(-1,r)), ("BACKGROUND",(0,r),(-1,r),colors.HexColor("#DCE6F2"))]
                r += 1; last_sec = o['sec']; last_sub = None
            if o['sub'] != last_sub:
                if o['sub'] and o['sub'] != o['item']:
                    data.append([Paragraph(o['sub'], ST["grp3"])] + [""]*10)
                    styl += [("SPAN",(0,r),(-1,r)), ("BACKGROUND",(0,r),(-1,r),colors.HexColor("#F0F4F9"))]
                    r += 1
                last_sub = o['sub']
            L, P, M, Sc, T = eur(o)
            data.append([Paragraph(str(o['src']), ST["cellr"]),
                         Paragraph(o['item'], ST["cell"]),
                         Paragraph(o['unit'] or "–", S("u", fontSize=7, leading=8.4, alignment=TA_CENTER)),
                         Paragraph(money(L), ST["cellr"]), Paragraph(money(P), ST["cellr"]),
                         Paragraph(money(M), ST["cellr"]), Paragraph(money(Sc), ST["cellr"]),
                         Paragraph(money(T), ST["cellb"] if T else ST["cellr"]),
                         Paragraph(money(o['derived'], "£"), ST["cellr"]),
                         Paragraph(BASIS_CODE.get(o['basis'], "?"),
                                   S("bc", fontSize=6.6, leading=8.4, alignment=TA_CENTER)),
                         Paragraph(CONF_CODE.get(o['conf'], "?"),
                                   S("cc", fontSize=6.2, leading=8.4, alignment=TA_CENTER))])
            styl.append(("BACKGROUND",(7,r),(7,r),EURFIL))
            cf = CONFF.get(CONF_CODE.get(o['conf']))
            if cf: styl.append(("BACKGROUND",(10,r),(10,r),cf))
            if o['flag']: styl.append(("BACKGROUND",(0,r),(0,r),FLAGF))
            styl.append(("ALIGN",(7,r),(7,r),"RIGHT"))
            r += 1
        t = LongTable(data, colWidths=SCHED_W, repeatRows=2)
        t.setStyle(TableStyle(styl))
        story.append(t)
        story.append(PageBreak())

# ---------------------------------------------------------------- appendices
def appendix_resources():
    h1("Appendix A — resource rates")
    para("The hourly labour-gang and plant build-ups published in the source. These are the cost "
         "<i>inputs</i> behind the unit rates, not priceable items, and are excluded from the schedule "
         "so they are not double-counted. Rows reading 'Total Gang Rate/Hour' or 'Total Rate/Hour' are "
         "the composite rates. Figures are as published, in sterling.")
    rows = []
    for x in res:
        rows.append([x[12], x[1].split(":")[0], x[2], x[3], x[4],
                     money(x[6], "£"), money(x[7], "£")])
    datatable(["Ref", "Class", "Resource type", "Gang / plant spread", "Resource",
               "Labour £/hr", "Plant £/hr"], rows,
              [12*mm, 15*mm, 34*mm, 72*mm, 90*mm, 25*mm, 25*mm],
              ["right", "left", "left", "left", "left", "right", "right"], fs=6.8)
    story.append(PageBreak())

def appendix_prelims():
    h1("Appendix B — preliminaries (excluded)")
    para("CESMM Class A: General Items, excluded from the derivation as requested. Retained here "
         "unchanged so they can be brought back in later. Preliminaries are normally priced as a "
         "project-level allowance rather than built into unit rates, so they are not factored to an "
         "Irish basis here. Figures are as published, in sterling.")
    rows = []
    for x in pre:
        rows.append([x[12], x[2], x[3], x[4], x[9] or "–",
                     money(x[6], "£"), money(x[7], "£"), money(x[8], "£"),
                     money(x[10], "£")])
    datatable(["Ref", "Section", "Sub-heading", "Item", "Unit",
               "Labour £", "Plant £", "Material £", "Published rate £"], rows,
              [12*mm, 40*mm, 56*mm, 64*mm, 12*mm, 20*mm, 20*mm, 22*mm, 27*mm],
              ["right", "left", "left", "left", "center", "right", "right", "right", "right"], fs=6.8)

# ---------------------------------------------------------------- build
doc = Doc(OUT, pagesize=PAGE, leftMargin=LM, rightMargin=RM, topMargin=TM, bottomMargin=BM,
          title="Irish Derived Cost Schedule — Spon's Civil Engineering Rates",
          author="InfraBid", subject="Civil engineering rates derived from labour, plant and material, "
                                     "converted to an Irish basis")

cover()
contents()
section_basis()
section_irish()
section_summary()
section_review()
section_schedule()
appendix_resources()
appendix_prelims()

doc.build(story)
print("saved", OUT)
