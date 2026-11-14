import sys, re, json, pymupdf
d=pymupdf.open(sys.argv[1])
CHK={'☒':False,'🗹':True,'☐':False,'☑':True}
qs=[]; section=None; cur=None; state=None; headers=[]
skip=re.compile(r'^(Staatsbürgerlicher Test|Einbürgerungstest Kanton Aargau|gültig ab .*|\d+)$')
for pi,p in enumerate(d):
    lines=[]
    for b in p.get_text("dict")["blocks"]:
        for l in b.get("lines",[]):
            t=''.join(s["text"] for s in l["spans"]).strip()
            if t: lines.append((l["bbox"],t))
    glyphs=[(bb,t) for bb,t in lines if t in CHK]
    text=[(bb,t) for bb,t in lines if t not in CHK]
    text.sort(key=lambda x:(round(x[0][1]),x[0][0]))
    imgs=[ (img[0], p.get_image_bbox(img)) for img in p.get_images(full=True)]
    pageopts=[]
    for bb,t in text:
        x=bb[0]
        if skip.match(t) and x<70 and (bb[1]<190 or bb[1]>790): continue
        m=re.match(r'^(\d+)\.?\s*$',t)
        if m and x<80:
            cur={'n':int(m.group(1)),'section':section,'q':'','opts':[],'page':pi+1,'y':bb[1]}; qs.append(cur); state='q'; continue
        m=re.match(r'^([A-F])\.\s+(.*)$',t)
        if m and x>85 and cur:
            o={'t':m.group(2),'ok':None,'y':(bb[1]+bb[3])/2,'page':pi+1}; cur['opts'].append(o); pageopts.append(o); state='o'; continue
        if state=='q' and cur:
            cur['q']=(cur['q']+' '+t).strip(); continue
        if state=='o' and x>85 and cur:
            cur['opts'][-1]['t']+=' '+t; continue
        section=t if (state!='h') else section+' '+t; state='h'; headers.append((pi+1,t))
    for bb,g in glyphs:
        yc=(bb[1]+bb[3])/2
        if not pageopts: print('orphan glyph p',pi+1); continue
        o=min(pageopts,key=lambda o:abs(o['y']-yc))
        if abs(o['y']-yc)>8: print('far glyph p',pi+1,yc,o['t'][:30])
        o['ok']=CHK[g]
    for xref,ib in imgs:
        # attach to question on this page whose y is closest above image
        cand=[q for q in qs if q['page']==pi+1 and q['y']<ib.y0] or [q for q in qs if q['page']==pi+1]
        if cand:
            q=max(cand,key=lambda q:q['y']); q.setdefault('img',[]).append({'xref':xref,'page':pi+1})
        else: print('image no question p',pi+1)
for q in qs:
    q['code']=None
    m=re.match(r'^([\d.]+\d)\.?\s+(.*)$',q['q'])
    if m: q['code'],q['q']=m.group(1),m.group(2)
    nok=sum(1 for o in q['opts'] if o['ok'])
    if nok!=1 or len(q['opts'])!=4 or any(o['ok'] is None for o in q['opts']): print('CHECK',q['n'],len(q['opts']),nok,q['q'][:60])
print('questions',len(qs)); print('sections',sorted(set(q['section'] for q in qs),key=str))
json.dump(qs,open(sys.argv[2],'w',encoding='utf-8'),ensure_ascii=False,indent=1)
