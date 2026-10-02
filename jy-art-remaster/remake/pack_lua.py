from pathlib import Path
import json,base64,struct
H=Path(__file__).resolve().parent;S=H.parent.parent/'jy-dos-reference';files={}
for p in [S/'config.lua',*list((S/'script').rglob('*.lua')),*[S/'data'/x for x in ['ranger.grp','ranger.idx','allsin.grp','alldef.grp','war.sta','warfld.grp','warfld.idx']]]:
 files[str(p.relative_to(S))]=base64.b64encode(p.read_bytes()).decode()
# Browser charset encoder table; keep byte-count-based source strings intact in VM.
chars=set()
for a in range(0x81,0xff):
 for b in range(0x40,0xff):
  try:chars.add(bytes([a,b]).decode('cp950'))
  except UnicodeDecodeError:pass
  try:chars.add(bytes([a,b]).decode('gb18030'))
  except UnicodeDecodeError:pass
for p in (S/'script').rglob('*.lua'):
 try:chars.update(p.read_bytes().decode('gb18030'))
 except UnicodeDecodeError:pass
enc={}
for codec in ['gb18030','cp950']:
 enc[codec]={}
 for c in chars:
  if ord(c)<128:continue
  try:enc[codec][c]=list(c.encode(codec))
  except UnicodeEncodeError:pass
(H/'lua-files.js').write_text('globalThis.JY_FILES='+json.dumps(files,separators=(',',':'))+';globalThis.JY_ENCODERS='+json.dumps(enc,ensure_ascii=False,separators=(',',':'))+';')
print('Packed',len(files),'source files, byte strings preserved')

raw=(S/'hzmb.dat').read_bytes();at=0;maps=[{},{}]
for a in range(0x81,0xff):
 for b in range(0x40,0xff):
  if b==0x7f:continue
  u,v=struct.unpack_from('<HH',raw,at);at+=4;maps[1][a*256+b]=v
for a in range(0xa0,0xff):
 for b in range(0x40,0xff):
  if not (b<=0x7e or b>=0xa1):continue
  u,v=struct.unpack_from('<HH',raw,at);at+=4;maps[0][a*256+b]=v
with (H/'lua-files.js').open('a') as f:f.write('globalThis.JY_CHARSET='+json.dumps(maps,separators=(',',':'))+';')
