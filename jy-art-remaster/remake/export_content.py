"""Read original data; emit browser content and decoded pixel atlases. Never edits sources."""
from pathlib import Path
import re, json, struct, base64, hashlib, io
from PIL import Image
HERE=Path(__file__).resolve().parent
SOURCE=HERE.parent.parent/'jy-dos-reference'
D=SOURCE/'data'; C=(SOURCE/'script/jyconst.lua').read_bytes().decode('gb18030')
out=HERE/'assets';out.mkdir(exist_ok=True)
def text(b):
 try:return b.split(b'\0')[0].decode('cp950')
 except UnicodeDecodeError:return b.split(b'\0')[0].decode('big5hkscs',errors='replace')
def records(raw,size,kind,loops={}):
 fields={m[0]:(int(m[1]),int(m[2]),int(m[3])) for m in re.findall(r'CC\.'+kind+r'_S\["([^"]+)"\]\s*=\s*\{(\d+),(\d+),(\d+)\}',C)}
 for prefix,(offset,count,step) in loops.items():
  for i in range(count):fields[prefix+str(i+1)]=(offset+i*step,0,2)
 return [{k:(text(raw[s+o:s+o+n]) if typ==2 else int.from_bytes(raw[s+o:s+o+n],'little',signed=typ==0)) for k,(o,typ,n) in fields.items()} for s in range(0,len(raw),size)]
B=(D/'ranger.grp').read_bytes();ix=struct.unpack('<6I',(D/'ranger.idx').read_bytes()); starts=[0]+list(ix)
base=records(B[:ix[0]],ix[0],'Base',{'队伍':(24,6,2),'物品':(36,200,4),'物品数量':(38,200,4)})[0]
people=records(B[ix[0]:ix[1]],182,'Person',{'武功':(126,10,2),'武功等级':(146,10,2),'携带物品':(166,4,2),'携带物品数量':(174,4,2)})
items=records(B[ix[1]:ix[2]],190,'Thing',{'练出物品':(170,5,2),'需要物品数量':(180,5,2)})
scenes=records(B[ix[2]:ix[3]],52,'Scene');skills=records(B[ix[3]:ix[4]],136,'Wugong',{k:(v,10,2) for k,v in [('攻击力',36),('移动范围',56),('杀伤范围',76),('加内力',96),('杀内力',116)]})
shops=records(B[ix[4]:ix[5]],30,'Shop',{'物品':(0,5,2),'物品数量':(10,5,2),'物品价格':(20,5,2)})
wars=records((D/'war.sta').read_bytes(),186,'WarData',dict([('手动选择参战人',(18,6,2)),('自动选择参战人',(30,6,2)),('我方X',(42,6,2)),('我方Y',(54,6,2)),('敌人',(66,20,2)),('敌方X',(106,20,2)),('敌方Y',(146,20,2))]))
# Strictly parse the small, complete event grammar; unknown syntax is an error.
events={};used={};sourcehash={}
for p in sorted((SOURCE/'script/oldevent').glob('oldevent_*.lua')):
 raw=p.read_bytes();sourcehash[p.name]=hashlib.sha256(raw).hexdigest(); lines=[re.sub(r'--.*','',l).strip() for l in raw.decode('gb18030').splitlines()];root=[];stack=[];cur=root
 for line in filter(None,lines):
  if line in ('do return; end','return;'):cur.append(['return']);continue
  if line=='else':
   assert stack,line
   node,parent=stack[-1];cur=node[4];continue
  if line=='end':node,cur=stack.pop();continue
  m=re.fullmatch(r'if instruct_(\d+)\(([-\d, ]*)\)\s*==\s*(true|false) then',line)
  if m:
   op=int(m[1]);args=[int(x) for x in m[2].split(',') if x.strip()];node=[op,args,m[3]=='true',[],[]];cur.append(node);stack.append((node,cur));cur=node[3]
  else:
   m=re.fullmatch(r'instruct_(\d+)\(([-\d, ]*)\);',line)
   if not m:raise ValueError(f'{p.name}: {line}')
   op=int(m[1]);args=[int(x) for x in m[2].split(',') if x.strip()];cur.append([op,args])
  used[op]=used.get(op,0)+1
 assert not stack,p
 events[int(re.search(r'\d+',p.name)[0])]=root
rawtalk=(SOURCE/'script/old_talk.lua').read_bytes().decode('gb18030');talk={int(a):b for a,b in re.findall(r'oldtalk\[(\d+)\]\s*=\s*\[==\[(.*?)\]==\];',rawtalk,re.S)}
assert len(events)==1018 and len(talk)>2500
blob=lambda p:base64.b64encode((D/p).read_bytes()).decode()
content=dict(schema=1,base=base,people=people,items=items,scenes=scenes,skills=skills,shops=shops,wars=wars,events=events,talk=talk,sceneData=blob('allsin.grp'),eventData=blob('alldef.grp'),warData=blob('warfld.grp'),warIndex=list(struct.unpack('<'+'I'*((D/'warfld.idx').stat().st_size//4),(D/'warfld.idx').read_bytes())),world={p:blob(p+'.002') for p in ['earth','surface','building','buildx','buildy']})
(HERE/'content.js').write_text('globalThis.JY_CONTENT='+json.dumps(content,ensure_ascii=False,separators=(',',':'))+';')
# Retain source palette and anchor points. Generated new artwork is not altered here.
palette=(D/'mmap.col').read_bytes();pal=[tuple(min(255,c*4) for c in palette[i:i+3])+(255,) for i in range(0,768,3)]
manifest={};missing=[]
for pack in ['smap','mmap','wmap','hdgrp','eft']+[p.stem for p in sorted(D.glob('fight*.grp'))]:
 raw=(D/(pack+'.grp')).read_bytes();idx=(0,)+struct.unpack('<'+'I'*((D/(pack+'.idx')).stat().st_size//4),(D/(pack+'.idx')).read_bytes());page=0;x=y=rowh=0;atlas=Image.new('RGBA',(2048,2048));meta={}
 for n in range(len(idx)-1):
  data=raw[idx[n]:idx[n+1]]
  if len(data)<8:continue
  if data.startswith(b'\x89PNG'):
   im=Image.open(io.BytesIO(data)).convert('RGBA');xo,yo=im.width//2,im.height//2
  else:
   w,h,xo,yo=struct.unpack('<4h',data[:8])
   if not 0<w<2048 or not 0<h<2048:missing.append([pack,n]);continue
   im=Image.new('RGBA',(w,h));px=im.load();p=8
   try:
    for yy in range(h):
     if p>=len(data):break
     start=p;row=data[p];p+=1
     if row==0:continue
     xx=0
     while p<len(data):
      xx+=data[p]
      if xx>=w:break
      p+=1;solid=data[p];p+=1
      for k in range(solid):
       if xx<w:px[xx,yy]=pal[data[p]]
       p+=1;xx+=1
      if xx>=w or p-start>=row:break
   except (IndexError,ValueError):missing.append([pack,n])
  w,h=im.size
  if x+w>2048:x=0;y+=rowh+2;rowh=0
  if y+h>2048:atlas.save(out/f'{pack}-{page}.png');page+=1;atlas=Image.new('RGBA',(2048,2048));x=y=rowh=0
  atlas.alpha_composite(im,(x,y));meta[n]=[page,x,y,w,h,xo,yo];x+=w+2;rowh=max(rowh,h)
 atlas.save(out/f'{pack}-{page}.png');manifest[pack]={'pages':page+1,'frames':meta}
(HERE/'atlas.js').write_text('globalThis.JY_ATLAS='+json.dumps(manifest,separators=(',',':'))+';')
report={'source':'jy-dos-reference (read-only)','events':len(events),'dialogues':len(talk),'scenes':len(scenes),'people':len(people),'items':len(items),'skills':len(skills),'wars':len(wars),'instructions':used,'source_missing_tiles':missing,'event_sha256':sourcehash,'scope':'Converted source content, not proof that all stories are playable or all artwork remastered.'}
(HERE/'content-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print({k:v for k,v in report.items() if k not in ['event_sha256','instructions','source_missing_tiles']});print('Atlas pages:',{k:v['pages'] for k,v in manifest.items()},'malformed frames',len(missing))
