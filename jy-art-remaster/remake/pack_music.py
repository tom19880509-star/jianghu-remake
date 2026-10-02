from pathlib import Path
import json
H=Path(__file__).resolve().parent; tracks={}
def vl(data,i):
 n=0
 while i<len(data):
  v=data[i];i+=1;n=(n<<7)|(v&127)
  if not v&128:return n,i
 raise ValueError('Truncated delta time')
for f in sorted((H.parent.parent/'jy-dos-reference/sound').glob('game*.mid')):
 b=f.read_bytes();assert b[:4]==b'MThd',f
 division=int.from_bytes(b[12:14],'big');assert division<32768
 p=8+int.from_bytes(b[4:8],'big');ev=[]
 while p+8<=len(b):
  assert b[p:p+4]==b'MTrk',(f,p);size=int.from_bytes(b[p+4:p+8],'big');data=b[p+8:p+8+size];p+=8+size;i=0;tick=0;running=0
  while i<len(data):
   delta,i=vl(data,i);tick+=delta
   if i>=len(data):break
   if data[i]&128:status=data[i];i+=1
   else:status=running
   if status<240:running=status
   if status==255:
    tag=data[i];i+=1;n,i=vl(data,i)
    if tag==81:ev.append([tick,'tempo',int.from_bytes(data[i:i+n],'big')])
    i+=n
    if tag==47:break
   elif status in (240,247):n,i=vl(data,i);i+=n
   else:
    kind=status&240;ch=status&15;length=1 if kind in (192,208) else 2;msg=data[i:i+length];i+=length
    if len(msg)<length:break
    if kind==192:ev.append([tick,'program',ch,msg[0]])
    elif kind in (128,144):ev.append([tick,'on' if kind==144 and msg[1]>0 else 'off',ch,*msg])
 ev.sort(key=lambda x:x[0]);tempo=500000;last=0;t=0;active={};program=[0]*16;notes=[]
 for e in ev:
  t+=(e[0]-last)*tempo/division/1e6;last=e[0];kind=e[1]
  if kind=='tempo':tempo=e[2]
  elif kind=='program':program[e[2]]=e[3]
  elif kind=='on':active.setdefault((e[2],e[3]),[]).append((t,e[4],program[e[2]]))
  else:
   a=active.get((e[2],e[3]),[])
   if a:
    st,vel,prog=a.pop(0)
    if e[2]!=9 and t>st:notes.append([round(st,4),e[3],round(min(10,t-st),4),vel,prog])
 notes.sort();tracks[f.name]={'duration':round(max(t,max((n[0]+n[2] for n in notes),default=0))+.6,3),'notes':notes}
(H/'music.js').write_text('globalThis.JY_MUSIC='+json.dumps(tracks,separators=(',',':'))+';')
print('Original scores:',len(tracks),'notes:',sum(len(t['notes']) for t in tracks.values()))
