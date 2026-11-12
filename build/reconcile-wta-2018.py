"""Offline, edition-scoped reconciliation of two independently published draws.
Requires pypdf. Inputs are pinned/hashed beside the report; no Live Tennis calls.
Every bracket branch, winner and set score must match before producing references.
"""
import csv,json,re,unicodedata,hashlib,datetime
from pathlib import Path
from collections import Counter
from pypdf import PdfReader
ROOT=Path('data/archive/references/wta-2018-completion')
fold=lambda s: ''.join(c for c in unicodedata.normalize('NFKD',s).lower() if c.isascii() and c.isalnum())
signature=lambda s: ''.join(sorted(fold(s)))
rows=list(csv.DictReader((ROOT/'sackmann.csv').open()))
for archived in json.loads((ROOT/'manifest.json').read_text()):
 if 'sha256' in archived:
  assert hashlib.sha256((ROOT/archived['name']).read_bytes()).hexdigest()==archived['sha256'],('changed source',archived['name'])
aliases=json.loads(Path('lib/player-name-aliases.json').read_text())
canonical=lambda s:aliases.get(re.sub(r'\s+',' ',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower().replace('-',' ')).strip(),s)
refs=[];proofs=[]
source='https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/83733587353df8a41f2fd4f516147d5aa83f5a8d/wta/wta_matches_2018.csv'
rounds=['R128','R64','R32','R16','QF','SF','F']
labels=dict(zip(rounds,['Ronda de 128','Ronda de 64','Ronda de 32','Octavos de final','Cuartos de final','Semifinal','Final']))
score_pattern=r'(?:\d+/\d+(?:\(\d+\))?(?:\s+|$))+(?:Ab|RET)?|\bWO\b'
def normalized_score(s):
 s=s.strip().replace('W/O','WO').replace('Ab','RET').replace('–','-').replace('/','-')
 s=re.sub(r'\s+',' ',s)
 return s
for event,slug,code,surface in [('Australian Open','australian-open','901','hard'),('Roland Garros','roland-garros','903','clay')]:
 season=[x for x in rows if x['tourney_name']==event]
 assert len(season)==127
 participants={x[k] for x in season for k in ['winner_name','loser_name']};assert len(participants)==128
 by_signature={signature(p):p for p in participants};assert len(by_signature)==128
 for official,archived in [('Catherine Bellis','Catherine Cartan Bellis'),('Alison Riske','Alison Riske Amritraj'),('Viktoria Kuzmova','Viktoria Hruncakova'),('Daria Gavrilova','Daria Saville'),('Kateryna Kozlova','Kateryna Baindl'),('Ekaterina Makarova','Kate Makarova'),('Mirjana Lucic Baroni','Mirjana Lucic'),('Anna Karolina Schmiedlova','Anna Schmiedlova'),('Duan Yingying','Ying Ying Duan')]:
  if archived in participants:by_signature[signature(official)]=archived
 entrant_pages=[];scores_by_round={r:[] for r in rounds};raw_pages=[]
 for pi,page in enumerate(PdfReader(ROOT/(slug+'.pdf')).pages):
  raw=[]
  page.extract_text(visitor_text=lambda t,c,m,f,s:raw.append((m[4],m[5],t.strip())) if t.strip() else None)
  raw_pages.append(raw)
  # Read entrants from the left edge of the official bracket, preserving top/bottom halves.
  entrants=[]
  if event=='Roland Garros':
   for line in page.extract_text(extraction_mode='layout').splitlines():
    match=re.match(r'^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .\-\'’]+?)\s{2,}([A-Z]{3})\b',line)
    if match:
     name=by_signature.get(signature(match[1]))
     assert name,('unknown entrant',match[1]);entrants.append(name)
  else:
   for t in page.extract_text(extraction_mode='layout').splitlines():
    match=re.match(r'^\s*\d+\.\s*(?:(?:WC|Q|LL):\s*)?(.+?)\s*\([A-Z]{3}\)',t)
    if match:
     name=by_signature.get(signature(re.sub(r'^\d+\.\s*','',match[1])));assert name,('unknown entrant',match[1]);
     if name not in entrants:entrants.append(name)
  assert len(entrants)==64,(event,pi,'entrant count',len(entrants));entrant_pages.append(entrants)
  found=[]
  for x,y,t in raw:
   if event=='Roland Garros':
    if not (y>20 and y<550):continue
    rnd='R128' if 300<x<320 else 'R64' if 400<x<430 else 'R32' if 495<x<520 else 'R16' if 590<x<620 else ('F' if y<60 and pi==0 else 'SF' if 200<y<350 else 'QF') if 680<x<710 else None
   else:
    if not 60<y<710:continue
    rnd='R128' if x<180 else 'R64' if 225<x<240 else 'R32' if 295<x<310 else 'R16' if 380<x<390 else ('SF' if 350<y<450 else 'QF') if 470<x<475 and y<600 else 'F' if 340<x<360 and y<80 and pi==0 else None
   if not rnd:continue
   # Match score must be at the end of a text object (AO sometimes includes the entrant).
   match=re.search(r'(\d+/\d+(?:\(\d+\))?(?:\s+\d+/\d+(?:\(\d+\))?)*(?:\s+Ab)?|\bWO)\s*$',t)
   if not match:continue
   score=normalized_score(match[1]);key=(rnd,round(y,0),score)
   if key in found:continue
   found.append(key)
  for rnd in rounds:scores_by_round[rnd].extend([(pi,y,s) for r,y,s in sorted(found,key=lambda v:-v[1]) if r==rnd])
 # Pair the official entrants through each bracket branch and compare the independently published CSV result.
 current=entrant_pages[0]+entrant_pages[1]
 event_proofs=[]
 for rnd in rounds:
  expected=len(current)//2;official=scores_by_round[rnd];assert len(official)==expected,(event,rnd,len(official),expected)
  winners=[]
  for i in range(expected):
   a,b=current[i*2:i*2+2]
   match=[x for x in season if x['round']==rnd and {x['winner_name'],x['loser_name']}=={a,b}]
   assert len(match)==1,(event,rnd,a,b)
   row=match[0];pi,y,score=official[i]
   assert normalized_score(row['score'])==score,(event,rnd,a,b,row['score'],score)
   winners.append(row['winner_name'])
   status='Walkover' if score=='WO' else 'Retired' if score.endswith('RET') else 'Finished'
   result='' if status=='Walkover' else re.sub(r'\s+RET$','',score).replace('-','–')
   date=row['tourney_date'];date=f'{date[:4]}-{date[4:6]}-{date[6:8]}'
   id=f'wta-2018-{slug}-{row["match_num"]}'
   refs.append({'id':id,'tour':'wta','year':2018,'tournament':event,'category':'Grand Slam','surface':surface,'format':'BO3','first':canonical(row['winner_name']),'second':canonical(row['loser_name']),'round':labels[rnd],'date':date,'dateLabel':'Semana del torneo','score':result,'status':status,'source':f'https://wtafiles.wtatennis.com/pdf/draws/2018/{code}/MDS.pdf','corroboration':source,'reviewedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()})
   event_proofs.append({'id':id,'round':rnd,'first':row['winner_name'],'second':row['loser_name'],'score':score,'pdfPage':pi+1,'pdfY':y,'bracketSlot':i+1,'csvMatchNumber':row['match_num']})
  current=winners
 assert len(event_proofs)==127 and len(current)==1
 champion_label='C. Wozniacki' if event=='Australian Open' else 'S.HALEP'
 champion_window=(lambda x,y:340<x<360 and 75<y<85) if event=='Australian Open' else (lambda x,y:680<x<710 and 35<y<40)
 assert any(champion_window(x,y) and champion_label in t for x,y,t in raw_pages[0]),('official champion missing',event)
 assert current[0]==('Caroline Wozniacki' if event=='Australian Open' else 'Simona Halep')
 proofs.append({'event':event,'tour':'wta','year':2018,'fixtures':127,'roundCounts':dict(Counter(p['round'] for p in event_proofs)),'champion':current[0],'matches':event_proofs})
Path('lib/verified-wta-2018-completion.json').write_text(json.dumps(refs,ensure_ascii=False,indent=2)+'\n')
(ROOT/'verified-draws.json').write_text(json.dumps({'sources':json.loads((ROOT/'manifest.json').read_text()),'editions':proofs,'liveTennisCalls':0,'datePolicy':'CSV gives tournament week only. Never claim exact match date or infer duration/statistics.'},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'verifiedFixtures':len(refs),'editions':[{k:v for k,v in p.items() if k!='matches'} for p in proofs]},ensure_ascii=False))
