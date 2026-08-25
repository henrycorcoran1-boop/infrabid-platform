import json, collections, openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import sys, os
# Stage 2 of 2. Renders the derived JSON from derive_costs.py into the formatted workbook.
#   python3 build_workbook.py [work_dir] [output.xlsx]
B = (sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))).rstrip("/") + "/"
out=json.load(open(B+"out.json")); res=json.load(open(B+"res.json")); pre=json.load(open(B+"pre.json"))
OUT = sys.argv[2] if len(sys.argv) > 2 else B+"Spons_Civil_Engineering_Derived_Costs.xlsx"

FONT="Arial"
MONEY='£#,##0.00;-£#,##0.00;"–"'
HDR_F=PatternFill("solid",fgColor="1F3864"); HDR_T=Font(name=FONT,sz=10,bold=True,color="FFFFFF")
TITLE=Font(name=FONT,sz=14,bold=True,color="1F3864")
SUB_F=Font(name=FONT,sz=10,italic=True,color="595959")
BODY=Font(name=FONT,sz=10)
THIN=Side(style="thin",color="D9D9D9"); BOX=Border(left=THIN,right=THIN,top=THIN,bottom=THIN)
CONF_FILL={"High":"E2EFDA","Medium-High":"EAF3E0","Medium":"FFF2CC","Low":"FCE4D6","All-in (not split)":"E7E6E6","None":"F2F2F2"}
FLAG_FILL=PatternFill("solid",fgColor="FCE4D6")

wb=openpyxl.Workbook(); wb.remove(wb.active)

def header(ws,cols,title,subtitle):
    ws.cell(1,1,title).font=TITLE
    ws.cell(2,1,subtitle).font=SUB_F
    for i,(h,w,fmt,al) in enumerate(cols,1):
        c=ws.cell(4,i,h); c.fill=HDR_F; c.font=HDR_T
        c.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True); c.border=BOX
        ws.column_dimensions[get_column_letter(i)].width=w
    ws.row_dimensions[4].height=30
    ws.freeze_panes=ws.cell(5,1)

def write(ws,cols,data,start=5,wrap=True):
    for ri,row in enumerate(data,start):
        for ci,(val,(h,w,fmt,al)) in enumerate(zip(row,cols),1):
            c=ws.cell(ri,ci,val); c.font=BODY; c.border=BOX
            if fmt: c.number_format=fmt
            c.alignment=Alignment(horizontal=al,vertical="top",wrap_text=(wrap and al=="left" and w>=40))
    ws.auto_filter.ref=f"A4:{get_column_letter(len(cols))}{start+len(data)-1}"

# ---------------- 1. DERIVED RATES ----------------
ws=wb.create_sheet("Derived Rates")
cols=[("Ref",7,"0","center"),("Page",11,None,"left"),("Class",30,None,"left"),("Section",30,None,"left"),
      ("Sub-heading",42,None,"left"),("Item",52,None,"left"),("Unit",8,None,"center"),
      ("Gang hrs",9,"0.00","right"),("Labour £",12,MONEY,"right"),("Plant £",12,MONEY,"right"),
      ("Material £",12,MONEY,"right"),("Sub-contract £",13,MONEY,"right"),("DERIVED COST £",15,MONEY,"right"),
      ("Derivation basis",30,None,"left"),("Confidence",15,None,"center"),
      ("Published rate £ (superseded)",15,MONEY,"right"),("Variance £",11,MONEY,"right"),
      ("Flag",26,None,"left"),("Derivation note",95,None,"left")]
header(ws,cols,"Derived Cost Build-up — Spon's Civil Engineering Rates",
       "Cost of each item derived from Labour + Plant + Material (+ Sub-contract where the source publishes an all-in specialist rate). "
       "Preliminaries / CESMM Class A General Items are excluded — see the 'Preliminaries (Excluded)' sheet.")
data=[]
for o in out:
    data.append([o['src'],o['page'],o['cls'],o['sec'],o['sub'],o['item'],o['unit'],o['gh'],
                 o['L'],o['P'],o['M'],o['SC'],None,o['basis'],o['conf'],o['pub'],None,(o['flag'] or None),o['note']])
write(ws,cols,data,wrap=False)
n=len(data)
for i in range(n):
    r=5+i
    ws.cell(r,13,f"=ROUND(SUM(I{r}:L{r}),2)")
    ws.cell(r,17,f"=IF(P{r}=\"\",\"\",ROUND(M{r}-P{r},2))")
    ws.cell(r,13).font=Font(name=FONT,sz=10,bold=True); ws.cell(r,13).number_format=MONEY
    ws.cell(r,13).border=BOX; ws.cell(r,13).alignment=Alignment(horizontal="right",vertical="top")
    ws.row_dimensions[r].height=13
    ws.cell(r,17).number_format=MONEY; ws.cell(r,17).font=BODY; ws.cell(r,17).border=BOX
    ws.cell(r,17).alignment=Alignment(horizontal="right",vertical="top")
    cf=CONF_FILL.get(out[i]['conf'])
    if cf: ws.cell(r,15).fill=PatternFill("solid",fgColor=cf)
    if out[i]['flag']: ws.cell(r,18).fill=FLAG_FILL

# ---------------- 2. REVIEW QUEUE ----------------
ws2=wb.create_sheet("Review Queue")
rq=[o for o in out if o['flag']]
header(ws2,cols,"Review Queue — items needing a human check",
       f"{len(rq)} of {len(out)} derived items. These are carried in 'Derived Rates' at the values shown; review before relying on them.")
write(ws2,cols,[[o['src'],o['page'],o['cls'],o['sec'],o['sub'],o['item'],o['unit'],o['gh'],
                 o['L'],o['P'],o['M'],o['SC'],o['derived'],o['basis'],o['conf'],o['pub'],
                 (round(o['derived']-o['pub'],2) if o['pub'] is not None else None),o['flag'],o['note']] for o in rq])

# ---------------- 3. RESOURCE RATES ----------------
ws3=wb.create_sheet("Resource Rates")
rcols=[("Ref",7,"0","center"),("Page",11,None,"left"),("Class",30,None,"left"),("Resource type",22,None,"left"),
       ("Gang / plant spread",46,None,"left"),("Resource",52,None,"left"),
       ("Labour £/hr",12,MONEY,"right"),("Plant £/hr",12,MONEY,"right"),("Material £",12,MONEY,"right")]
header(ws3,rcols,"Resource Rates — labour gang and plant build-ups",
       "The hourly labour-gang and plant rates published in the source. These are cost INPUTS, not priceable items, "
       "and are excluded from 'Derived Rates'. Rows reading 'Total Gang Rate/Hour' or 'Total Rate/Hour' are the composite rates.")
write(ws3,rcols,[[r[12],r[0],r[1],r[2],r[3],r[4],r[6],r[7],r[8]] for r in res],wrap=False)
for i,r in enumerate(res):
    if 'total' in str(r[4]).lower():
        for c in range(1,10):
            ws3.cell(5+i,c).font=Font(name=FONT,sz=10,bold=True)
            ws3.cell(5+i,c).fill=PatternFill("solid",fgColor="EDEDED")

# ---------------- 4. PRELIMINARIES (EXCLUDED) ----------------
ws4=wb.create_sheet("Preliminaries (Excluded)")
pcols=[("Ref",7,"0","center"),("Page",11,None,"left"),("Class",30,None,"left"),("Section",30,None,"left"),
       ("Sub-heading",42,None,"left"),("Item",56,None,"left"),("Unit",8,None,"center"),("Gang hrs",9,"0.00","right"),
       ("Labour £",12,MONEY,"right"),("Plant £",12,MONEY,"right"),("Material £",12,MONEY,"right"),
       ("Published rate £",14,MONEY,"right")]
header(ws4,pcols,"Preliminaries — CESMM Class A: General Items (EXCLUDED from the derivation)",
       "Excluded as requested. Retained here unchanged so they can be brought back in later — preliminaries are normally "
       "priced as a project-level allowance rather than built into unit rates.")
write(ws4,pcols,[[r[12],r[0],r[1],r[2],r[3],r[4],r[9],r[5],r[6],r[7],r[8],r[10]] for r in pre])

# ---------------- 5. METHOD & RECONCILIATION ----------------
ws5=wb.create_sheet("Method & Reconciliation")
ws5.column_dimensions['A'].width=4
ws5.column_dimensions['B'].width=46
ws5.column_dimensions['C'].width=14
ws5.column_dimensions['D'].width=14
ws5.column_dimensions['E'].width=104
ws5.cell(1,2,"Method & Reconciliation").font=TITLE
ws5.cell(2,2,"How each item's cost was derived, and how the derived costs reconcile to the source.").font=SUB_F
row=4
def h2(t):
    global row
    c=ws5.cell(row,2,t); c.font=Font(name=FONT,sz=11,bold=True,color="FFFFFF"); c.fill=HDR_F
    for cc in range(2,6):
        ws5.cell(row,cc).fill=HDR_F; ws5.cell(row,cc).border=BOX
    ws5.cell(row,2,t).font=Font(name=FONT,sz=11,bold=True,color="FFFFFF")
    row+=1
def line(b,c=None,d=None,e=None,bold=False):
    global row
    f=Font(name=FONT,sz=10,bold=bold)
    for col,val,fmt,al in ((2,b,None,"left"),(3,c,None,"right"),(4,d,None,"right"),(5,e,None,"left")):
        cell=ws5.cell(row,col,val); cell.font=f; cell.border=BOX
        cell.alignment=Alignment(horizontal=al,vertical="top",wrap_text=(col==5))
    row+=1

h2("What changed")
line("The source's published all-in rate has been removed as the cost figure.",None,None,
     "It is retained on 'Derived Rates' column P, greyed as 'Published rate £ (superseded)', purely so every derivation can be audited. Delete column P if you want it gone entirely.")
line("Cost is now built up as Labour + Plant + Material.",None,None,
     "Column M 'DERIVED COST £' is a live formula =ROUND(SUM(I:L),2). Edit any component and the cost recalculates.")
line("A fourth column, Sub-contract £, carries specialist packages.",None,None,
     "Some CESMM classes are published only as all-in specialist rates with no build-up in the source. Splitting them into L/P/M would be invention, so the rate is carried whole in Sub-contract and flagged.")
line("Preliminaries excluded.",None,None,
     "CESMM Class A: General Items (53 items) moved to 'Preliminaries (Excluded)'.")
line("Resource build-ups separated.",None,None,
     "543 rows that looked like rates are actually labour-gang and plant hourly build-ups (the inputs behind the rates). Moved to 'Resource Rates' so they are not double-counted as priceable items.")
row+=1

h2("Derivation basis — counts")
line("Basis","Items","% of items","What it means",bold=True)
tot=len(out)
order=["Stated build-up","Material recovered as residual","Stated components + specialist balance",
       "Apportioned (sub-heading)","Apportioned (section)","Apportioned (class)","All-in specialist rate",
       "All-in (no comparable build-ups)","Stated components (no published total)","No data"]
expl={
 "Stated build-up":"Labour, plant and material all published and reconciling to the published rate. Cost is taken straight from the build-up.",
 "Material recovered as residual":"Labour and plant published, material column missing from the source, but the published rate contains it. Material = rate − labour − plant. Verified against identical operations in the same section that do carry a material figure.",
 "Stated components + specialist balance":"Published plant (and sometimes labour) retained as real; the remaining balance of a specialist all-in rate is not broken down at source and sits in Sub-contract.",
 "Apportioned (sub-heading)":"No build-up published. Rate split using the median labour/plant/material shares of 3+ comparable build-ups in the same sub-heading.",
 "Apportioned (section)":"As above, using 5+ comparable build-ups in the same section.",
 "Apportioned (class)":"As above, using 10+ comparable build-ups elsewhere in the same CESMM class. Weakest apportionment — all such rows are in the Review Queue.",
 "All-in specialist rate":"Classes B, C, D, M, P and T (ground investigation, geotechnical processes, demolition, structural metalwork, piling, tunnelling) plus testing and professional-services sections. Spon's publishes these as sub-contract packages with no build-up, so the whole rate sits in Sub-contract, unsplit.",
 "All-in (no comparable build-ups)":"No build-up and nothing comparable to apportion from.",
 "Stated components (no published total)":"Components published without an all-in rate; cost is their sum.",
 "No data":"Neither a rate nor a build-up in the source."}
cnt=collections.Counter(o['basis'] for o in out)
for b in order:
    if cnt.get(b):
        line(b,cnt[b],f"{100*cnt[b]/tot:.1f}%",expl[b])
line("TOTAL",tot,"100.0%",None,bold=True)
row+=1

h2("Confidence")
line("Confidence","Items","% of items","Basis",bold=True)
cc=collections.Counter(o['conf'] for o in out)
cexp={"High":"Cost is the source's own published build-up.",
      "Medium-High":"One component recovered arithmetically and cross-checked against comparable items.",
      "Medium":"Apportioned from close comparables, or a specialist rate with real published components.",
      "Low":"Apportioned from class-level comparables only — treat as indicative.",
      "All-in (not split)":"Total cost is correct and equals the published rate; the labour/plant/material split does not exist in the source and has not been invented.",
      "None":"No cost available."}
for k in ["High","Medium-High","Medium","Low","All-in (not split)","None"]:
    if cc.get(k):
        line(k,cc[k],f"{100*cc[k]/tot:.1f}%",cexp[k])
        ws5.cell(row-1,2).fill=PatternFill("solid",fgColor=CONF_FILL[k])
row+=1

h2("Reconciliation to source (live formulas over 'Derived Rates')")
line("Check","Value","","Expected",bold=True)
last=4+n
checks=[("Priceable items carried",f"=COUNTA('Derived Rates'!A5:A{last})","3,793 — every non-preliminary, non-resource rate row"),
        ("Control total — sum of all derived costs",f"=ROUND(SUM('Derived Rates'!M5:M{last}),2)","RECONCILIATION ONLY — this adds together rates in different units (£/m, £/nr, £/m3), so it is not a project cost. Its only purpose is to prove that no cost was lost or invented in the derivation."),
        ("Control total — sum of published rates",f"=ROUND(SUM('Derived Rates'!P5:P{last}),2),","The same sum over the superseded published rates."),
        ("Total variance (derived − published)",f"=ROUND(SUM('Derived Rates'!M5:M{last})-SUM('Derived Rates'!P5:P{last}),2)","£0.00 — the derivation reallocates cost, it does not change it"),
        ("Items where derived ≠ published (>1p)",f"=COUNTIF('Derived Rates'!Q5:Q{last},\">0.01\")+COUNTIF('Derived Rates'!Q5:Q{last},\"<-0.01\")","0 — every item should reconcile"),
        ("Total Labour",f"=ROUND(SUM('Derived Rates'!I5:I{last}),2)",""),
        ("Total Plant",f"=ROUND(SUM('Derived Rates'!J5:J{last}),2)",""),
        ("Total Material",f"=ROUND(SUM('Derived Rates'!K5:K{last}),2)",""),
        ("Total Sub-contract (unsplit specialist)",f"=ROUND(SUM('Derived Rates'!L5:L{last}),2)",""),
        ("Items flagged for review",f"=COUNTIF('Derived Rates'!R5:R{last},\"?*\")","Listed on the 'Review Queue' sheet")]
for lbl,f,note in checks:
    f=f.rstrip(',')
    line(lbl,None,None,note)
    c=ws5.cell(row-1,3,f); c.font=Font(name=FONT,sz=10,bold=True); c.border=BOX
    c.number_format=MONEY if ("cost" in lbl.lower() or "Total" in lbl or "rate" in lbl.lower() or "variance" in lbl.lower()) and "Items" not in lbl else "#,##0"
    c.alignment=Alignment(horizontal="right")
row+=1

h2("Cost mix where the source publishes a real build-up")
line("Resource","Share","","Basis",bold=True)
sb=[o for o in out if o['basis']=="Stated build-up" and o['derived']<100000]
tsb=sum(o['derived'] for o in sb)
for k,lbl in (('L','Labour'),('P','Plant'),('M','Material')):
    line(lbl,None,None,None)
    c=ws5.cell(row-1,3,round(sum(o[k] for o in sb)/tsb,4)); c.number_format="0.0%"
    c.font=Font(name=FONT,sz=10,bold=True); c.border=BOX; c.alignment=Alignment(horizontal="right")
ws5.cell(row-3,5,f"Measured across the {len(sb):,} items the source builds up in full, excluding a handful of very large "
                 f"rail-track lump sums that would otherwise dominate. This is the meaningful cost mix for this book.").font=Font(name=FONT,sz=10)
ws5.cell(row-3,5).alignment=Alignment(horizontal="left",vertical="top",wrap_text=True)
line("Note on the whole-file mix",None,None,
     "Across all 3,793 items, sub-contract is ~94% of the control total. That figure is an artefact of a few very large "
     "specialist lump sums (tunnel shafts, viaduct piers) and is not a useful mix — use the shares above instead.")
row+=1

h2("Caveats")
cav=[f"Source is an OCR extraction of Spon's Civil Engineering and Highway Works Price Book, so some figures are mis-read. "
     f"{sum(1 for o in out if o['flag']=='Probable source error — verify')} rows are an order of magnitude out of line with their class and are flagged 'Probable source error'; "
     f"{sum(1 for o in out if o['flag']=='Outlier vs comparable items')} more sit far from comparable items; "
     f"{sum(1 for o in out if o['flag']=='High value — verify')} are very large unit rates worth checking. Scanning error may remain elsewhere.",
          "Rates are net cost — the source's published rate already excludes oncosts and profit, which Spon's adds separately. Nothing here carries overhead, profit, or preliminaries.",
          "Apportioned splits are statistical, not quoted. They preserve the correct total cost but the labour/plant/material shares are estimates from comparable items.",
          "Sub-contract rows are correct in total. They are not zero-labour items — the labour simply sits inside a specialist's price.",
          "Gang hours are carried through unchanged from the source as supporting information."]
for t in cav:
    line("•",None,None,t)

for s in wb.worksheets: s.sheet_view.showGridLines=False
wb.save(OUT); print("saved",OUT,"rows:",n)
