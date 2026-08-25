import openpyxl, collections, statistics, re
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

import sys, os
# Stage 1 of 2. Reads the raw Spon's extract, derives a Labour/Plant/Material/Sub-contract
# cost for every priceable item, and writes the intermediate JSON that build_workbook.py renders.
#   python3 derive_costs.py <source.xlsx> [work_dir]
SRC = sys.argv[1] if len(sys.argv) > 1 else "Spons_Civil_Engineering_Rates.xlsx"
WORK = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.abspath(__file__))
os.makedirs(WORK, exist_ok=True)

wb=openpyxl.load_workbook(SRC, data_only=False); ws=wb["Rates"]
rows=[[ws.cell(r,c).value for c in range(1,13)]+[r] for r in range(2,ws.max_row+1)]
def N(v): return v if isinstance(v,(int,float)) else None
def S(v): return str(v).strip() if v is not None else ""

PAGE,CLS,SEC,SUB,ITEM,GH,LAB,PLT,MAT,UNIT,TOT,RT,SRCROW = range(13)

def cls_letter(c):
    m=re.match(r'CLASS\s+([A-Z])\s*:',S(c)); return m.group(1) if m else ""

# Classes published by Spon's as all-in specialist / sub-contract packages
SPECIALIST={'B','C','D','M','P','T'}
# Bought-in service sections: testing / professional services -> no L/P/M split exists
SERVICE=re.compile(r'\b(TEST|TESTS|TESTING|PROFESSIONAL SERVICES|LABORATORY)\b', re.I)

allrates=[r for r in rows if r[RT]=='Rate']
is_res   =lambda r: 'RESOURCE' in S(r[SEC]).upper()
resource =[r for r in allrates if is_res(r)]
prelim   =[r for r in allrates if not is_res(r) and cls_letter(r[CLS])=='A']
items    =[r for r in allrates if not is_res(r) and cls_letter(r[CLS])!='A']

TOL=0.05
def parts(r): return N(r[LAB]), N(r[PLT]), N(r[MAT]), N(r[TOT])
def is_donor(r):
    l,p,m,t=parts(r)
    if t is None or t<=0 or all(v is None for v in (l,p,m)): return False
    return abs((l or 0)+(p or 0)+(m or 0)-t)<=TOL

donors=[r for r in items if is_donor(r)]
K_SUB=lambda r:(S(r[CLS]),S(r[SEC]),S(r[SUB])); K_SEC=lambda r:(S(r[CLS]),S(r[SEC])); K_CLS=lambda r:(S(r[CLS]),)
DON={}
for lvl,kf in (('sub',K_SUB),('sec',K_SEC),('cls',K_CLS)):
    d=collections.defaultdict(list)
    for r in donors: d[kf(r)].append(r)
    DON[lvl]=d

def ratio_from(group):
    """Median of per-row L/P/M shares, renormalised to 1."""
    sh=[[],[],[]]
    for r in group:
        l,p,m,t=parts(r); tot=(l or 0)+(p or 0)+(m or 0)
        if tot<=0: continue
        for i,v in enumerate((l or 0,p or 0,m or 0)): sh[i].append(v/tot)
    if not sh[0]: return None
    med=[statistics.median(x) for x in sh]; s=sum(med)
    if s<=0: return None
    return [x/s for x in med]

MIN={'sub':3,'sec':5,'cls':10}
def pick_ratio(r):
    for lvl,kf,label in (('sub',K_SUB,'sub-heading'),('sec',K_SEC,'section'),('cls',K_CLS,'class')):
        g=DON[lvl].get(kf(r),[])
        if len(g)>=MIN[lvl]:
            rt=ratio_from(g)
            if rt: return rt,label,len(g)
    return None,None,0

out=[]
for r in items:
    l,p,m,t=parts(r); L=P=M=SC=0.0
    flag=""; note=""
    cl=cls_letter(r[CLS]); spec = cl in SPECIALIST or bool(SERVICE.search(S(r[SEC])))
    has=[v for v in (l,p,m) if v is not None]
    s=sum(v or 0 for v in (l,p,m))

    if not has:
        if t is None:
            basis, conf = "No data", "None"
            note="No published rate and no build-up in source."
            flag="No cost"
        elif spec:
            SC=t; basis="All-in specialist rate"; conf="All-in (not split)"
            note="Source publishes a specialist/sub-contract all-in rate; no labour/plant/material build-up exists to derive from."
        else:
            rt,label,n=pick_ratio(r)
            if rt:
                L,P,M=[t*x for x in rt]
                basis=f"Apportioned ({label})"
                conf={"sub-heading":"Medium","section":"Medium","class":"Low"}[label]
                note=f"Split from published rate using median L/P/M shares of {n} comparable build-ups at {label} level ({rt[0]*100:.0f}/{rt[1]*100:.0f}/{rt[2]*100:.0f})."
                if label=="class": flag="Apportioned at class level"
            else:
                SC=t; basis="All-in (no comparable build-ups)"; conf="All-in (not split)"
                note="No comparable build-ups in source to apportion from."
                flag="No build-up evidence"
    elif t is None:
        L,P,M=(l or 0),(p or 0),(m or 0)
        basis="Stated components (no published total)"; conf="Medium"
    elif abs(s-t)<=TOL:
        L,P,M=(l or 0),(p or 0),(m or 0)
        basis="Stated build-up"; conf="High"
        note="Labour + plant + material as published; reconciles to the published rate."
    elif s < t-TOL:
        resid=t-s; blanks=[c for c,v in (('Labour',l),('Plant',p),('Material',m)) if v is None]
        L,P,M=(l or 0),(p or 0),(m or 0)
        if spec:
            SC=resid; basis="Stated components + specialist balance"; conf="Medium"
            note=(f"Published plant/labour retained; the £{resid:,.2f} balance of the specialist all-in rate "
                  f"is not broken down in the source.")
            if resid > s*3: flag="Large unexplained balance"
        elif blanks==['Material']:
            M=resid; basis="Material recovered as residual"; conf="Medium-High"
            note=(f"Material column missing in source; recovered as published rate less labour and plant "
                  f"(£{resid:,.2f}). Verified against comparable items in the same section.")
        else:
            SC=resid; basis="Unallocated residual"; conf="Low"
            note=f"£{resid:,.2f} of the published rate is not attributable to a stated component."
            flag="Unallocated residual"
    else:
        L,P,M=(l or 0),(p or 0),(m or 0)
        basis="Stated build-up"; conf="High"
        note="Components exceed the published rate by £%.2f (source rounding)."%(s-t)

    out.append(dict(src=r[SRCROW],page=S(r[PAGE]),cls=S(r[CLS]),sec=S(r[SEC]),sub=S(r[SUB]),
                    item=S(r[ITEM]),unit=S(r[UNIT]),gh=N(r[GH]),L=round(L,2),P=round(P,2),
                    M=round(M,2),SC=round(SC,2),derived=round(L+P+M+SC,2),basis=basis,conf=conf,
                    pub=t,flag=flag,note=note))

# ---- data-quality flagging ----
# (a) far from the median of directly comparable items
grp=collections.defaultdict(list)
for o in out: grp[(o['cls'],o['sec'],o['sub'],o['unit'])].append(o)
for g in grp.values():
    vals=[o['derived'] for o in g if o['derived']>0]
    if len(vals)<4: continue
    med=statistics.median(vals)
    if med<=0: continue
    for o in g:
        if o['derived']>0 and (o['derived']>25*med or o['derived']<med/25) and not o['flag']:
            o['flag']="Outlier vs comparable items"
            o['note']=(o['note']+" ").strip()+f" Derived cost is far from the median of comparable items in this group (£{med:,.2f}) — check the source figure."

# (b) a single value an order of magnitude above everything else in its class = likely OCR digit error
cg=collections.defaultdict(list)
for o in out: cg[o['cls']].append(o)
for g in cg.values():
    if len(g)<20: continue
    s=sorted(g,key=lambda o:-o['derived'])
    if s[1]['derived']>0 and s[0]['derived']>=10*s[1]['derived']:
        s[0]['flag']="Probable source error — verify"
        s[0]['note']=(s[0]['note']+" ").strip()+(
            f" This is {s[0]['derived']/s[1]['derived']:.0f}x the next highest item in the class "
            f"(£{s[1]['derived']:,.2f}) and out of line with comparable rates in the same section — "
            f"likely a mis-read digit in the source scan. Verify before use.")

# (c) very large unit rates are worth a human look either way
for o in out:
    if o['derived']>=250000 and not o['flag']:
        o['flag']="High value — verify"
        o['note']=(o['note']+" ").strip()+" Unit rate of £250,000 or more — plausible for major specialist works but worth verifying against the source."

print("items",len(out),"resource",len(resource),"prelim",len(prelim))
print(collections.Counter(o['basis'] for o in out))
print(collections.Counter(o['conf'] for o in out))
print("flagged:",collections.Counter(o['flag'] for o in out if o['flag']))
import json; json.dump(out,open(os.path.join(WORK,'out.json'),'w'))
json.dump([[S(r[c]) if c not in (GH,LAB,PLT,MAT,TOT) else N(r[c]) for c in range(12)]+[r[SRCROW]] for r in resource],
          open(os.path.join(WORK,'res.json'),'w'))
json.dump([[S(r[c]) if c not in (GH,LAB,PLT,MAT,TOT) else N(r[c]) for c in range(12)]+[r[SRCROW]] for r in prelim],
          open(os.path.join(WORK,'pre.json'),'w'))
