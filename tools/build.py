import json,sys,glob
S,OUT=sys.argv[1],sys.argv[2]
raw=json.load(open(S+'/raw.json',encoding='utf-8'))
es={}
for f in sorted(glob.glob(S+'/es_*.txt')):
    for line in open(f,encoding='utf-8'):
        p=line.rstrip('\n').split('|')
        if len(p)==6: es[int(p[0])]=p[1:]
SEC_ES={'Demokratie, Föderalismus':'Democracia y federalismo','Geschichte':'Historia, geografía y cultura','Rechtsstaat':'Estado de derecho','Sozialstaat':'Estado social','Zivilgesellschaft':'Sociedad civil'}
SEC_KEY={'Demokratie, Föderalismus':'demo','Geschichte':'gesch','Rechtsstaat':'recht','Sozialstaat':'sozial','Zivilgesellschaft':'zivil'}
q1=[];missing=[]
for x in raw:
    n=x['n']
    if n not in es: missing.append(n); continue
    ok=[i for i,o in enumerate(x['opts']) if o['ok']]
    q1.append({'id':f'ag{n}','n':n,'cat':SEC_KEY[x['section']],'code':x['code'],
      'de':{'q':x['q'],'a':[o['t'].strip() for o in x['opts']]},
      'es':{'q':es[n][0],'a':es[n][1:]},
      'ok':ok,'img':[i['file'] for i in x.get('img',[])]})
q2=[]
for i,line in enumerate(open(S+'/ch2.txt',encoding='utf-8')):
    p=line.rstrip('\n').split('|')
    q2.append({'id':f'x{i+1}','n':i+1,'cat':'strengelbach' if p[0]=='S' else 'alltag','de':{'q':p[2],'a':p[3:7]},'es':{'q':p[7],'a':p[8:12]},'ok':[int(p[1])],'src':p[12],'img':[]})
cats={'demo':['Demokratie & Föderalismus','Democracia y federalismo'],'sozial':['Sozialstaat','Estado social'],'recht':['Rechtsstaat','Estado de derecho'],'gesch':['Geschichte, Geografie & Kultur','Historia, geografía y cultura'],'zivil':['Zivilgesellschaft','Sociedad civil'],
 'strengelbach':['Gemeinde Strengelbach','Municipio de Strengelbach'],'alltag':['Alltag & Leben in der Schweiz','Vida cotidiana en Suiza']}
data={'version':'2025-09-29','chapters':[
 {'id':'ag','title':['Offizieller Übungstest Aargau','Prueba oficial de práctica de Argovia'],'questions':q1},
 {'id':'extra','title':['Strengelbach & Alltag (Einbürgerungsgespräch)','Strengelbach y vida cotidiana (entrevista de naturalización)'],'questions':q2}],
 'cats':cats,'exam':{'total':45,'pass':34,'minutes':40,'dist':{'demo':11,'sozial':5,'recht':10,'gesch':13,'zivil':6}}}
for k,v in data['exam']['dist'].items():
    print(k,v,'available',sum(1 for q in q1 if q['cat']==k))
open(OUT,'w',encoding='utf-8').write('window.APP_DATA = '+json.dumps(data,ensure_ascii=False)+';\n')
print('ch1',len(q1),'ch2',len(q2),'missing',missing,'multi-ok',[q['n'] for q in q1 if len(q['ok'])!=1])
