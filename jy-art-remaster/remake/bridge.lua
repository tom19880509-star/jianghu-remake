-- Browser presentation and Lua 5.1 compatibility; original game logic stays in source files.
dofile=function(path) local f,e=load(browser_source(path),'@'..path); if not f then error(e) end; return f() end
local oldmodf=math.modf
math.modf=function(n) local i,f=oldmodf(n); return math.tointeger(i) or i,f end
math.mod=function(a,b) return a%b end
math.pow=function(a,b) return a^b end
math.atan2=function(a,b) return math.atan(a,b) end
unpack=table.unpack
os.remove=function() return true end
os.time=function() return browser_epoch() end
collectgarbage=function() return 0 end

dofile('config.lua')
CONFIG.Width,CONFIG.Height=lib.GetViewport(); CONFIG.Type=1; CONFIG.OSCharSet=0
CONFIG.FastShowScreen=0;CONFIG.KeyRepeat=1;CONFIG.CleanMemory=0
CONFIG.KeyRepeatInterval=30
CONFIG.FontName='Songti SC'
dofile('script/jymain.lua')
IncludeFile()
local originalConst=SetGlobalConst
SetGlobalConst=function() originalConst(); CC.NewPersonName='小虾米'; CC.Frame=65; CC.AnimationFrame=90 end
GenTalkIdx=function() end
ReadTalk=function(id) return browser_talk(id) end
local function browserTalk(s,head,flag,id,name)
 Cls();ShowScreen()
 if name then coroutine.yield('talk',s,flag==2 and -1 or (head or -1),flag or 0,id,name)
 else coroutine.yield('talk',s,flag==2 and -1 or (head or -1),flag or 0,id) end
 Cls()
end
TalkEx=function(s,head,flag,name) return browserTalk(s,head,flag,nil,name) end
instruct_1=function(id,head,flag)
 local s=ReadTalk(id)
 if s~=nil then return browserTalk(s,head,flag,id) end
end
DrawStrBoxWaitKey=function(s,color,size) coroutine.yield('notice',s);Cls() end
DrawStrBoxYesNo=function(x,y,s,color,size,esc) return coroutine.yield('yesno',s)==1 end
-- REST_REPORT_BEGIN
-- Describe the original recovery result; never change its gates, cost or cure poison.
local sourceAskRest=instruct_11
instruct_11=function(...)
 local blocked={}
 for i=1,CC.TeamNum do
  local pid=JY.Base['队伍'..i]
  if pid>=0 then
   local p=JY.Person[pid];local reasons={}
   if p['中毒程度']>0 then reasons[#reasons+1]='中毒'..p['中毒程度'] end
   if p['受伤程度']>=33 then reasons[#reasons+1]='伤势'..p['受伤程度'] end
   if #reasons>0 then blocked[#blocked+1]=p['姓名']..'（'..table.concat(reasons,'、')..'）' end
  end
 end
 if #blocked==0 then return sourceAskRest(...) end
 Cls()
 return DrawStrBoxYesNo(-1,-1,'这些同伴须先解毒或疗伤，单靠歇息不能恢复：'..table.concat(blocked,'、')..'。\n仍要休息吗？睡醒后可选择保存进度。',C_ORANGE,CC.DefaultFont)
end
local sourceRest=instruct_12
instruct_12=function()
 local before={}
 for i=1,CC.TeamNum do local pid=JY.Base['队伍'..i];if pid>=0 then local p=JY.Person[pid];before[pid]={p['生命'],p['内力'],p['体力'],p['受伤程度']} end end
 local result=table.pack(sourceRest())
 local blocked,recovered={},{};local poison,injury=false,false
 for i=1,CC.TeamNum do
  local pid=JY.Base['队伍'..i]
  if pid>=0 then
   local p=JY.Person[pid];local reasons={}
   if p['中毒程度']>0 then reasons[#reasons+1]='中毒'..p['中毒程度'];poison=true end
   if p['受伤程度']>=33 then reasons[#reasons+1]='伤势'..p['受伤程度'];injury=true end
   if #reasons>0 then blocked[#blocked+1]=p['姓名']..'（'..table.concat(reasons,'、')..'）'
   elseif before[pid] and (p['生命']~=before[pid][1] or p['内力']~=before[pid][2] or p['体力']~=before[pid][3] or p['受伤程度']~=before[pid][4]) then recovered[#recovered+1]=p['姓名'] end
  end
 end
 if #blocked>0 then
  local help={}
  if poison then help[#help+1]='先从物品栏使用解毒药，或请同行者解毒。' end
  if injury then help[#help+1]='先服疗伤药或请同行者医疗，将伤势降至33以下。' end
  -- The rest itself still happens for everyone else; say so, instead of implying the whole rest was refused.
  DrawStrBoxWaitKey('这一觉没能调息：'..table.concat(blocked,'、')..'。\n'..table.concat(help)..'处理好伤毒后再歇一晚，便能恢复。'..(#recovered>0 and ('\n其余同伴已恢复：'..table.concat(recovered,'、')..'。') or ''))
 end
 return table.unpack(result,1,result.n)
end
-- REST_REPORT_END
-- Manual medicine use previously drew an invisible source box and waited for
-- a key, swallowing the first movement command. Keep its effects/consumption
-- in the original functions and present the actual changes as a DOM notice.
UseThing_Type3=function(id)
 local pid=-1
 if JY.Status==GAME_MMAP or JY.Status==GAME_SMAP then
  local r=SelectTeamMenu(CC.MainSubMenuX,CC.MainSubMenuY+CC.SingleLineHeight)
  if r>0 then pid=JY.Base['队伍'..r] end
 elseif JY.Status==GAME_WMAP then pid=WAR.Person[WAR.CurID]['人物编号'] end
 if pid>=0 then
  local fields={'生命','生命最大值','受伤程度','中毒程度','体力','内力','内力最大值','内力性质','攻击力','防御力','轻功','医疗能力','用毒能力','解毒能力','抗毒能力','拳掌功夫','御剑能力','耍刀技巧','特殊兵器','暗器技巧','武学常识','攻击带毒'}
  local before={};for _,k in ipairs(fields) do before[k]=JY.Person[pid][k] end
  local used=UseThingEffect(id,pid)==1
  local lines={JY.Person[pid]['姓名']..'使用'..JY.Thing[id]['名称']}
  for _,k in ipairs(fields) do
   local after=JY.Person[pid][k]
   if after~=before[k] then lines[#lines+1]=string.format('%s %d → %d',k,before[k],after) end
  end
  -- 395 Q5 P5-2：原版药效全满时返回 0，不耗药也不提示；但「加生命」一支先减了受伤程度，满血带伤时可反复白治伤。
  -- 有任何数值变化就按已服用结算；毫无变化才说明原因，药留在行囊、不占回合。
  if used or #lines>1 then
   instruct_32(id,-1)
   coroutine.yield('notice',table.concat(lines,'\n'));Cls()
  else
   coroutine.yield('notice',JY.Person[pid]['姓名']..'眼下用不上'..JY.Thing[id]['名称']..'：相应数值已满，药仍留在行囊。');Cls()
   return 0
  end
 end
 return 1
end
local browserMenuDepth=0
local browserPartyOpen=false
-- Keep each callback, disabled item and returned source index; presentation uses DOM.
ShowMenu=function(items,num,numShow,x1,y1,x2,y2,box,esc,size,color,selectColor)
 if JY.Status==GAME_START and num==3 and items[1][1]=='进度一' and browser_has_save(4) then
  items[4]={'神雕篇试玩',nil,1};num=4
 end
 -- Native GameOver menu: the fourth row ends the run (GAME_END), it never
 -- rests at home. Relabel only; indices, callbacks and behaviour untouched.
 if num==4 and items[1] and items[2] and items[3] and items[4]
  and items[1][1]=='载入进度一' and items[2][1]=='载入进度二' and items[3][1]=='载入进度三' and items[4][1]=='回家睡觉去' then
  items[4][1]='结束本次游玩（不保存）'
 end
 for i=1,num do items[i][4]=i end
 local shop=BrowserShopMenuInfo and BrowserShopMenuInfo(items,num) or nil
 if shop then
  local selected=coroutine.yield('shop',shop)
  for _,row in ipairs(shop.items) do
   if row.id==selected and not row.disabled and items[row.slot][3]>0 then return row.slot end
  end
  return 0
 end
 local care=BrowserCareMenuInfo and BrowserCareMenuInfo(items) or nil
 while true do
  local shortcuts=BrowserRepeatInfo and BrowserRepeatInfo(items) or nil
  local choice=coroutine.yield('menu',items,num,esc,shortcuts,care)
  if choice=='repeat' then
   if shortcuts and shortcuts.enabled then BrowserRepeatSlot=shortcuts.slot;choice=2 else choice=nil end
  end
  if choice==0 and esc==1 then return 0 end
  if choice and items[choice] and items[choice][3]>0 then
   if items[choice][2]==nil then return choice end
   local r=items[choice][2](items,choice)
   if r==1 then return -choice end
  end
 end
end
local browserMenu=ShowMenu
ShowMenu=function(...)
 browserMenuDepth=browserMenuDepth+1
 local result=table.pack(pcall(browserMenu,...))
 browserMenuDepth=browserMenuDepth-1
 if not result[1] then error(result[2],0) end
 return table.unpack(result,2,result.n)
end
ShowMenu2=ShowMenu
-- IncludeFile is invoked again by JY_Main_sub: keep presentation overrides installed.
IncludeFile=function() end
-- Preserve Lua 5.1 numeric conversion at presentation boundaries.
Rnd=function(i) return math.random(math.max(1,math.floor(i)))-1 end
local sourceFormat=string.format
string.format=function(fmt,...)
 local args=table.pack(...);local pos=1;local arg=1;local parts={};local start=1
 while true do
  local at=string.find(fmt,'%',pos,true);if not at then break end
  if string.sub(fmt,at+1,at+1)=='%' then pos=at+2
  else
   local tail=string.sub(fmt,at);local full,kind=string.match(tail,'^(%%[-+ #0]*%d*%.?%d*([a-zA-Z]))')
   if not full then break end
   if string.find('cdiouxX',kind,1,true) and type(args[arg])=='number' then args[arg]=math.modf(args[arg]) end
   -- Fengari's padded %s path decodes UTF-8; original names are GB18030.
   -- Apply Lua 5.1 byte width/precision here, then use its raw-byte %s path.
   if kind=='s' and #full>2 and arg<=args.n then
    local flags,width=string.match(full,'^%%([-+ #0]*)(%d*)')
    local precision=string.match(full,'%.(%d*)')
    if #width<=2 and (precision==nil or #precision<=2) then
     local s=tostring(args[arg])
     if precision~=nil then s=string.sub(s,1,tonumber(precision) or 0) end
     local pad=string.rep(' ',math.max(0,(tonumber(width) or 0)-#s))
     args[arg]=string.find(flags,'-',1,true) and (s..pad) or (pad..s)
     parts[#parts+1]=string.sub(fmt,start,at-1);parts[#parts+1]='%s';start=at+#full
    end
   end
   arg=arg+1;pos=at+#full
  end
 end
 if #parts>0 then parts[#parts+1]=string.sub(fmt,start);fmt=table.concat(parts) end
 return sourceFormat(fmt,table.unpack(args,1,args.n))
end
local sourceKey=lib.GetKey
lib.GetKey=function()
 local key=sourceKey()
 if key==-7001 then
  local pid=lib.TakePartyRequest()
  if (JY.Status==GAME_MMAP or JY.Status==GAME_SMAP) and (JY.CurrentD or -1)<0 and browserMenuDepth==0 then
   browserPartyOpen=true
   local result=table.pack(pcall(BrowserPartyMenu,pid))
   browserPartyOpen=false
   if not result[1] then error(result[2],0) end
  end
  key=-1
 elseif key==-7002 then
  local action=lib.TakeFieldRequest()
  if (JY.Status==GAME_MMAP or JY.Status==GAME_SMAP) and (JY.CurrentD or -1)<0 and browserMenuDepth==0 then
   browserPartyOpen=true
   local result=table.pack(pcall(function()
    if action==1 then Menu_Thing() elseif action==2 then Menu_Doctor() elseif action==3 then Menu_DecPoison() elseif action==4 then Menu_ReadRecord() elseif action==5 then Menu_Exit() end
   end))
   browserPartyOpen=false
   if not result[1] then error(result[2],0) end
  end
  key=-1
 end
 coroutine.yield('delay',0);return key
end
local sourceInitScene=Init_SMap
Init_SMap=function(showname) return sourceInitScene(0) end
-- Manual attack selection uses the source's legal centres and source marking.
-- Thrown items share nearest-foe selection. Movement, medicine and automatic/
-- enemy attacks retain their original paths.
do
 local sourceSelectMove=War_SelectMove
 local sourceMoveMenu=War_MoveMenu
 local selectionKind='target'
 local attackAim=nil
 War_MoveMenu=function(...)
  selectionKind='move'
  local result=table.pack(sourceMoveMenu(...))
  selectionKind='target'
  return table.unpack(result,1,result.n)
 end
 local function nearestCentre(p,aim)
  local px,py=p['坐标X'],p['坐标Y'];local enemies={}
  for i=0,WAR.PersonNum-1 do
   local e=WAR.Person[i]
   if e['死亡']~=true and e['我方']~=p['我方'] then
    enemies[#enemies+1]={x=e['坐标X'],y=e['坐标Y'],id=i,d=math.abs(e['坐标X']-px)+math.abs(e['坐标Y']-py)}
   end
  end
  table.sort(enemies,function(a,b)return a.d<b.d or (a.d==b.d and a.id<b.id)end)
  local radius=aim.kind=='area' and JY.Wugong[aim.skill]['杀伤范围'..aim.level] or 0
  for _,e in ipairs(enemies)do
   if GetWarMap(e.x,e.y,3)<128 then return e.x,e.y end
   -- A foe outside the centre-selection distance can still be inside an area.
   -- Choose its nearest legal centre, never place the cursor on an illegal tile.
   local bx,by,bd=nil,nil,math.huge
   for y=math.max(1,e.y-radius),math.min(62,e.y+radius)do
    for x=math.max(1,e.x-radius),math.min(62,e.x+radius)do
     local d=math.abs(x-e.x)+math.abs(y-e.y)
     if GetWarMap(x,y,3)<128 and d<bd then bx,by,bd=x,y,d end
    end
   end
   if bx then return bx,by end
  end
  return px,py
 end
 War_SelectMove=function()
  local p=WAR.Person[WAR.CurID];local px,py=p['坐标X'],p['坐标Y']
  if not attackAim or selectionKind=='move' then
   lib.BeginBattleSelection(selectionKind,WAR.CurID,px,py)
   local result=table.pack(sourceSelectMove());lib.EndBattleSelection()
   return table.unpack(result,1,result.n)
  end
  local aim=attackAim;local x,y=nearestCentre(p,aim);local facing=p['人方向']
  lib.BeginBattleSelection(aim.kind,WAR.CurID,x,y,px,py,aim.thrown==true)
  local result=table.pack(pcall(function()
   while true do
    CleanWarMap(4,0);WAR.EffectXY={}
    -- Explicit coordinates make these original functions mark only; they do
    -- not spend resources or deal damage. Keep facing unchanged until commit.
    aim.mark(aim.skill,aim.level,x,y);p['人方向']=facing
    WarDrawMap(1,x,y);ShowScreen()
    local key=WaitKey();local nx,ny=x,y
    if key==VK_UP then ny=y-1 elseif key==VK_DOWN then ny=y+1
    elseif key==VK_LEFT then nx=x-1 elseif key==VK_RIGHT then nx=x+1
    elseif key==VK_SPACE or key==VK_RETURN then return x,y
    elseif key==VK_ESCAPE then return nil end
    if nx>=1 and ny>=1 and nx<63 and ny<63 and GetWarMap(nx,ny,3)<128 then x,y=nx,ny end
   end
  end))
  p['人方向']=facing;CleanWarMap(4,0);WAR.EffectXY={};lib.EndBattleSelection()
  if not result[1]then error(result[2],0)end
  return table.unpack(result,2,result.n)
 end
 local function wrap(mark,kind)
  return function(skill,level,x,y)
   if x~=nil or y~=nil then return mark(skill,level,x,y)end
   local old=attackAim;attackAim={skill=skill,level=level,mark=mark,kind=kind}
   local result=table.pack(pcall(mark,skill,level,x,y));attackAim=old
   if not result[1]then error(result[2],0)end
   return table.unpack(result,2,result.n)
  end
 end
 War_FightSelectType0=wrap(War_FightSelectType0,'target')
 War_FightSelectType3=wrap(War_FightSelectType3,'area')
 -- The native thrown menu also calls War_SelectMove, otherwise starting on self.
 -- Keep its real reach and executor; only seed the cursor, with no skill effects.
 local sourceExecuteMenu=War_ExecuteMenu
 War_ExecuteMenu=function(flag,...)
  if flag~=4 then return sourceExecuteMenu(flag,...) end
  local old=attackAim;attackAim={kind='target',thrown=true,mark=function()end}
  local result=table.pack(pcall(sourceExecuteMenu,flag,...));attackAim=old
  if not result[1]then error(result[2],0)end
  return table.unpack(result,2,result.n)
 end
end
-- A line attack used to wait for one arrow and ignore Escape. Present its
-- original four directions and range before committing the source attack.
local sourceLineAttack=War_FightSelectType1
local cancelledLineAttack={}
BrowserCancelledCross=cancelledLineAttack
War_FightSelectType1=function(skill,level,x,y)
 if x~=nil or y~=nil then return sourceLineAttack(skill,level,x,y) end
 -- Source direction order (0 东北 1 东南 2 西北 3 西南) with browser arrow codes up/right/left/down.
 local directions={{0,-1,273},{1,0,275},{-1,0,276},{0,1,274}}
 local arrows={};for i,d in ipairs(directions) do arrows[d[3]]=i end
 local p=WAR.Person[WAR.CurID];local px,py=p['坐标X'],p['坐标Y']
 local facing=p['人方向']
 local current=(tonumber(facing) or 0)+1;if not directions[current] then current=1 end
 -- Start on the nearest opposing fighter actually reached by a straight ray.
 local best=math.huge;local reach=JY.Wugong[skill]['移动范围'..level]
 for i=0,WAR.PersonNum-1 do
  local e=WAR.Person[i];local dx,dy=e['坐标X']-px,e['坐标Y']-py
  local distance=math.abs(dx)+math.abs(dy)
  if e['死亡']~=true and e['我方']~=p['我方'] and distance>0 and distance<=reach and distance<best and (dx==0 or dy==0) then
   current=dx>0 and 2 or dx<0 and 3 or dy>0 and 4 or 1;best=distance
  end
 end
 local function preview()
  -- The source x/y branch only sets 人方向, WAR.EffectXY and layer 4; costs happen later in War_Fight_Sub.
  CleanWarMap(4,0);WAR.EffectXY={}
  local d=directions[current]
  sourceLineAttack(skill,level,px+d[1],py+d[2])
  p['人方向']=facing
  lib.DrawWarMap(3,px,py,px+d[1],py+d[2],0);ShowScreen()
 end
 lib.BeginBattleSelection('line',WAR.CurID,px+directions[current][1],py+directions[current][2],px,py)
 local ok,err=pcall(function()
  preview()
  while true do
   local key=lib.GetKey()
   if arrows[key] then current=arrows[key];preview()
   elseif key==32 or key==13 then return
   elseif key==27 then error(cancelledLineAttack,0) end
  end
 end)
 lib.EndBattleSelection()
 if not ok then error(err,0) end
 -- Commit through the same source call the enemy/auto path uses; War_Fight_Sub continues unchanged.
 local d=directions[current]
 return sourceLineAttack(skill,level,px+d[1],py+d[2])
end
local sourceFightSub=War_Fight_Sub
War_Fight_Sub=function(...)
 local args=table.pack(...);local p=JY.Person[WAR.Person[args[1]]['人物编号']];local skill=p['武功'..args[2]];local w=JY.Wugong[skill]
 lib.BeginSkillAim(skill,math.floor(p['武功等级'..args[2]]/100)+1,w['伤害类型']==1 and (w['攻击范围']==0 or w['攻击范围']==3),skill==28 and BrowserBalanceEnabled and BrowserBalanceEnabled() and BrowserBalanceQi and BrowserBalanceQi(WAR.Person[args[1]]['人物编号']) or -1,BrowserWeaponHint and BrowserWeaponHint(WAR.Person[args[1]]['人物编号'],skill) or '',BrowserBattleSkillPreview and BrowserBattleSkillPreview(args[1],args[2]) or nil,BrowserDualAimPass and BrowserDualAimPass(WAR.Person[args[1]]['人物编号']) or 0,w['消耗内力点数'])
 local result=table.pack(pcall(sourceFightSub,...))
 lib.EndSkillAim()
 if not result[1] then
  -- Cancellation happens before damage, experience, MP or stamina changes.
  if result[2]==cancelledLineAttack then CleanWarMap(4,0);WAR.EffectXY={};return 0 end
  error(result[2],0)
 end
 return table.unpack(result,2,result.n)
end
-- Observe original combat presentation without changing rules, damage or timing.
local sourceShowFight=War_ShowFight
War_ShowFight=function(pid,skill,kind,level,x,y,effect)
 local first=0;for i=0,effect-1 do first=first+CC.Effect[i] end
 local frameStart=0;for i=0,math.max(0,kind)-1 do frameStart=frameStart+4*JY.Person[pid]['出招动画帧数'..i+1] end
 local frameCount=kind>=0 and JY.Person[pid]['出招动画帧数'..kind+1] or 0
 local contactFrame=kind>=0 and JY.Person[pid]['出招动画延迟'..kind+1] or 0
 -- 157：末位多传一个招式实名。底表只有 0..92，运行时补建的 93「家传辟邪剑法」在 content.js 里查不到，
 -- 界面若按编号去查底表会取到 nil（头顶报招与状态栏都会当场抛）。名称一律以 JY.Wugong 为准。
 local artName=JY.Wugong[skill] and JY.Wugong[skill]['名称'] or ''
 lib.BeginFightVisual(pid,skill,kind,level,x,y,effect,first,CC.Effect[effect],WAR.Person[WAR.CurID]['人方向'],BrowserHeldWeapon and BrowserHeldWeapon(pid) or JY.Person[pid]['武器'],frameStart,frameCount,contactFrame,contactFrame+CC.Effect[effect]-1,artName)
 -- 闪避时原版把点数 -0 飘成「+0」，像回血；气血伤害下 0 只来自闪避，飘字改写为「闪避」。
 local drawString=DrawString
 -- 头顶血条贴在人物头上；原版伤害数字从格心上方 67 升到 95，正好穿过血条，整体再抬 2.25 个半格高，从血条上方升起。
 DrawString=function(sx,sy,s,...) if s=='+0' and WAR.Effect==2 then s='闪避' end
  if type(s)=='string' and (s:match('^[+-]%d+$') or s=='闪避') then sy=sy-math.floor(CC.YScale*2.25) end
  return drawString(sx,sy,s,...) end
 local result=table.pack(pcall(sourceShowFight,pid,skill,kind,level,x,y,effect))
 DrawString=drawString
 lib.EndFightVisual()
 if not result[1] then error(result[2],0) end
 return table.unpack(result,2,result.n)
end
local sourcePersonPic=WarCalPersonPic
WarCalPersonPic=function(id)
 local p=JY.Person[WAR.Person[id]['人物编号']]
 lib.SetBattleEquipment(p['头像代号'],BrowserHeldWeapon and BrowserHeldWeapon(WAR.Person[id]['人物编号']) or p['武器'],p['武器'],WAR.Person[id]['人物编号'],BrowserOffhandWeapon and BrowserOffhandWeapon(WAR.Person[id]['人物编号']) or -1)
 return sourcePersonPic(id)
end
local sourceDrawScene=lib.DrawSMap
lib.DrawSMap=function(sid,...)
 local pid=sid==0 and 1 or (sid==4 and 9 or nil)
 if pid and JY.Person and JY.Person[pid] then
  local p=JY.Person[pid];lib.SetBattleEquipment(p['头像代号'],p['武器'])
 end
 return sourceDrawScene(sid,...)
end
local sourceDrawWarMap=lib.DrawWarMap
local animatedWalker=nil
local function isBeggarFighter(pid) return pid and pid>=271 and pid<=280 end
lib.DrawWarMap=function(...)
 if not animatedWalker then return sourceDrawWarMap(...) end
 -- Eight-phase strides need four poses per tile; retain the same total
 -- presentation delay so a normal two-tile move shows both leading feet.
 -- The source still chooses the path, spends movement points and places actors.
 local poses=(animatedWalker==0 or animatedWalker==9 or animatedWalker==59 or animatedWalker==35 or animatedWalker==38 or animatedWalker==50 or isBeggarFighter(animatedWalker)) and 4 or 2
 for i=1,poses do
  local delay=math.floor(CC.Frame*2*i/poses)-math.floor(CC.Frame*2*(i-1)/poses)
  sourceDrawWarMap(...);ShowScreen();lib.Delay(delay)
  lib.AdvanceMovementVisual()
 end
end
local sourceMovePerson=War_MovePerson
War_MovePerson=function(x,y)
 local p=WAR.Person[WAR.CurID]
 local pid=p['人物编号']
 local weapon=JY.Person[pid]['武器']
 local actor=lib.BattleActorIdentity(pid)
 animatedWalker=(actor==0 or ((pid==2 or pid==9 or pid==35 or pid==38 or pid==50 or pid==59 or pid==62 or pid==77 or isBeggarFighter(pid)) and (weapon==-1 or BrowserStarterWeapon(weapon))) or (pid==37 and weapon==115)) and actor or nil
 lib.BeginMovementVisual(p['人物编号'],p['坐标X'],p['坐标Y'])
 local result=table.pack(sourceMovePerson(x,y))
 animatedWalker=nil
 lib.EndMovementVisual()
 return table.unpack(result,1,result.n)
end
-- Character management runs in the original coroutine and uses original item
-- functions. The browser never writes equipment, training points or inventory.
local function browserTeamSlot(pid)
 for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then return i end end
end
local function browserOwned(id)
 for i=1,CC.MyThingNum do if JY.Base['物品'..i]==id and JY.Base['物品数量'..i]>0 then return true end end
 return false
end
-- NORMAL_STUDY_BEGIN
-- Keep earned personal study points in the original save field. Crafting
-- progress still follows the source book-switch rules; trials keep their rules.
local function normalStudyEnabled() return browser_journey_get('trial')~=true end
local sourceAddStudyPoints=AddPersonAttrib
AddPersonAttrib=function(pid,key,value)
 -- This source field is signed 16-bit, despite its original 60000 limit.
 if normalStudyEnabled() and key=='修炼点数' and value>0 then value=math.max(0,math.min(value,32767-JY.Person[pid][key])) end
 return sourceAddStudyPoints(pid,key,value)
end
local function normalStudyHasRoom(pid,book)
 local art=JY.Thing[book]['练出武功'];if art<0 then return true end
 for i=1,10 do local id=JY.Person[pid]['武功'..i];if id==0 or id==art then return true end end
 return false
end
local sourceStudyBook=War_PersonTrainBook
War_PersonTrainBook=function(pid)
 local p=JY.Person[pid];local points=p['修炼点数'];local cost=TrainNeedExp(pid)
 if normalStudyEnabled() and browserTeamSlot(pid) and p['修炼物品']>=0 and not normalStudyHasRoom(pid,p['修炼物品']) then return end
 local carry=normalStudyEnabled() and browserTeamSlot(pid) and p['修炼物品']>=0 and cost>0 and cost<math.huge and points>=cost
 local result=table.pack(sourceStudyBook(pid))
 if carry then p['修炼点数']=points-cost end
 return table.unpack(result,1,result.n)
end
-- Leaving changes the travelling roster, not the person's earned knowledge.
-- Original item/crafting release still applies; a new journey loads fresh data.
local sourceLeaveWithStudy=instruct_21
instruct_21=function(pid,...)
 local p=JY.Person[pid]
 local keep=normalStudyEnabled() and browserTeamSlot(pid) and p~=nil
 local points=keep and p['修炼点数'] or nil
 local result=table.pack(sourceLeaveWithStudy(pid,...))
 if keep then p['修炼点数']=points end
 return table.unpack(result,1,result.n)
end
local sourceChooseStudy=UseThing_Type2
UseThing_Type2=function(id)
 if not normalStudyEnabled() then return sourceChooseStudy(id) end
 local points={}
 for i=1,CC.TeamNum do local pid=JY.Base['队伍'..i];if pid>=0 then points[pid]=JY.Person[pid]['修炼点数'] end end
 local owner=JY.Thing[id]['使用人'];if owner>=0 then points[owner]=JY.Person[owner]['修炼点数'] end
 local result=table.pack(pcall(sourceChooseStudy,id))
 for pid,value in pairs(points) do JY.Person[pid]['修炼点数']=value end
 if not result[1] then error(result[2],0) end
 return table.unpack(result,2,result.n)
end
local function browserNormalStudy(pid)
 if not normalStudyEnabled() then return nil end
 local p=JY.Person[pid];local book=p['修炼物品'];local t=book>=0 and JY.Thing[book] or nil
 local cost=TrainNeedExp(pid)
 local growthReason=t and BrowserGrowthStudyReason and BrowserGrowthStudyReason(pid,book) or ''
 local credited=cost==0 and BrowserGrowthStudyCredit and BrowserGrowthStudyCredit(pid,book)>0
 local reason=not t and '先选择秘籍' or p['生命']<=0 and '先休整恢复气血' or not browserOwned(book) and '秘籍不在行囊中' or t['使用人']~=pid and '尚未配好秘籍' or growthReason~='' and growthReason or not CanUseThing(book,pid) and '尚未满足修炼条件' or not normalStudyHasRoom(pid,book) and '已学十招，不能再添新招' or cost==math.huge and '已练至十级' or cost<=0 and not credited and '此书不能研习' or p['修炼点数']<cost and ('还需 '..(cost-p['修炼点数'])..' 点') or ''
 return {cost=cost==math.huge and -1 or cost,eligible=reason=='',reason=reason}
end
local function browserStudyOnce(pid)
 local study=browserNormalStudy(pid)
 if not study or not study.eligible then return end
 local p=JY.Person[pid]
 local book=p['修炼物品'];local name=BrowserGrowthBookName and BrowserGrowthBookName(pid,book,true) or JY.Thing[book]['名称']
 local detail=book==41 and BrowserGrowthStudyPreview and BrowserGrowthEnabled(pid) and BrowserGrowthStudyPreview(pid) or ''
 if DrawStrBoxYesNo(-1,-1,'用'..study.cost..'点修炼心得研习'..name..'？余下心得保留。'..detail,C_WHITE,CC.DefaultFont) then
  local current=browserNormalStudy(pid)
  if current and current.eligible then War_PersonTrainBook(pid) end
 end
end
-- NORMAL_STUDY_END
local function browserItem(id,pid)
 local t=id and id>=0 and JY.Thing[id] or nil
 local effects={};if t then for _,k in ipairs({'攻击力','防御力','轻功'}) do local n=t['加'..k] or 0;if n~=0 then effects[#effects+1]=k..string.format('%+d',n) end end end
 return {id=t and id or -1,name=t and (pid and BrowserGrowthBookName and BrowserGrowthBookName(pid,id,true) or t['名称']) or '未配备',description=t and t['物品说明'] or '',effects=table.concat(effects,' · '),stats={attack=t and t['加攻击力'] or 0,defense=t and t['加防御力'] or 0,agility=t and t['加轻功'] or 0}}
end
local function browserDeparture(pid)
 if pid==0 or JY.Status~=GAME_MMAP or not browserTeamSlot(pid) then return nil end
 for _,entry in ipairs(CC.PersonExit) do if entry[1]==pid then return entry[2] end end
end
local function browserPerson(pid)
 if BrowserPracticePerson then BrowserPracticePerson(pid) end
 local p=JY.Person[pid];local skills={}
 for i=1,10 do local id=p['武功'..i];if id>0 and not (id==92 and BrowserBalanceEnabled and BrowserBalanceEnabled()) then
  local w=JY.Wugong[id];local level=math.floor(p['武功等级'..i]/100)+1
  -- 157：防御性兜底。正常链上 93「家传辟邪剑招」由 growth-extension.lua:31-45 在每次 LoadRecord 后补建
  -- （reviews/art157-family-sword.md 已证：新局、读档、成长／经典两种规则下都存在）。万一日后有人放出
  -- 底表外的编号，这里**不吞掉、不崩**，换成看得见的占位，人物页照常打开并把编号摆在界面上。
  if w==nil then
   skills[#skills+1]={id=id,name='（未知武学 '..id..'）',level=level,maxRank=10,rankUnit='级',
    cost=0,range=0,shape=0,requirements=nil,power=0,kind=0,technique=''}
  else
  local info=BrowserGrowthSkillInfo and BrowserGrowthSkillInfo(pid,id);local requirements
  for book=39,95 do if JY.Thing[book]['练出武功']==id then requirements=BrowserStudyRequirements(pid,book);break end end
  skills[#skills+1]={id=id,name=w['名称'],level=info and info.rank or level,maxRank=info and info.maxRank or 10,rankUnit=info and info.rankUnit or '级',cost=info and info.cost or math.floor((level+1)/2)*w['消耗内力点数'],range=w['移动范围'..level],shape=w['攻击范围'],requirements=requirements,power=info and info.power or w['攻击力'..level],kind=w['武功类型'],technique=BrowserWeaponHint and BrowserWeaponHint(pid,id) or ''}
  end
 end end
 local attrs={}
 for _,k in ipairs({'攻击力','防御力','轻功'}) do
  local v=p[k]
  for _,field in ipairs({'武器','防具'}) do local id=p[field];if id>=0 then v=v+(JY.Thing[id]['加'..k] or 0) end end
  attrs[k]=v
 end
 if BrowserBalanceEnabled and BrowserBalanceEnabled() then for _,k in ipairs({'拳掌功夫','御剑能力','耍刀技巧','特殊兵器'})do attrs[k]=p[k] end end
 attrs['资质']=p['资质']
 attrs['内力属性']=({[0]='阴性',[1]='阳性',[2]='调和'})[p['内力性质']] or '未知'
 local outfit=BrowserOutfitPerson(pid);attrs['防御力']=attrs['防御力']+outfit.defense
 if outfit.agility~=0 then attrs['战斗轻功']=attrs['轻功']+outfit.agility end
 local needed=TrainNeedExp(pid)
 return {outfit=outfit,id=pid,canLeave=browserDeparture(pid)~=nil,name=p['姓名'],head=p['头像代号'],level=p['等级'],hp=p['生命'],maxhp=p['生命最大值'],mp=p['内力'],maxmp=p['内力最大值'],stamina=p['体力'],injury=p['受伤程度'],poison=p['中毒程度'],attrs=attrs,skills=skills,
  nature=p['内力性质'],studyRequirements=p['修炼物品']>=0 and BrowserStudyRequirements(pid,p['修炼物品'],true) or {},weapon=browserItem(p['武器']),canOffhand=BrowserOffhandSlot and BrowserOffhandSlot(pid) or false,offhand=browserItem(BrowserOffhandWeapon and BrowserOffhandWeapon(pid) or -1),armor=browserItem(p['防具']),book=browserItem(p['修炼物品'],pid),points=p['修炼点数'],needed=needed==math.huge and -1 or needed,normalStudy=browserNormalStudy(pid),brushStudy=BrowserBrushStudy(pid),mastery=BrowserMasteryPerson(pid),growth=BrowserGrowthPerson(pid),teaching=BrowserTeachingPerson(pid)}
end
BrowserPartyPerson=browserPerson
-- 395 S7 R2：人物页原先只能「换」主手兵器与原版护甲，不能「卸」；想把兵器卖回给小宝得先另买一件顶上。
-- 卸下与原版换装（UseThing_Type1）同一写法：旧物 使用人=-1、人物栏位=-1，物品本就一直留在行囊里。
-- 随人入队、不在行囊里的那一件先收进行囊（与 outfit-extension setSlot 收原护甲同理），行囊满则不卸并说明。
-- 副手只在主手是同类轻兵器时成立（combo-extension canOffhand），卸主手时把副手预留一并收起，免得那件兵器仍被标成「副手预留」。
local function browserUnequip(pid,field)
 local p=JY.Person[pid];local old=p and p[field] or -1
 if old<0 then return false end
 local owned,room=false,false
 for i=1,CC.MyThingNum do
  if JY.Base['物品'..i]==old and JY.Base['物品数量'..i]>0 then owned=true end
  if JY.Base['物品'..i]==-1 then room=true end
 end
 if not owned then
  if not room then DrawStrBoxWaitKey('行囊已满，腾出位置后才能收好'..JY.Thing[old]['名称']..'。',C_WHITE,CC.DefaultFont);return false end
  instruct_32(old,1)
 end
 JY.Thing[old]['使用人']=-1;p[field]=-1
 if field=='武器' and BrowserOffhandEquip then BrowserOffhandEquip(pid,-1) end
 return true
end
BrowserPartyMenu=function(pid)
 local slot=browserTeamSlot(pid)
 if not slot then return end
 while (JY.Status==GAME_MMAP or JY.Status==GAME_SMAP) and browserTeamSlot(pid) do
  local action=coroutine.yield('party',browserPerson(pid))
  if action=='leave' then
   local event=browserDeparture(pid)
   if event and DrawStrBoxYesNo(-1,-1,'是否请'..JY.Person[pid]['姓名']..'暂时离队？所学与心得保留，随身装备与秘籍交回行囊。',C_WHITE,CC.DefaultFont) then
    oldCallEvent(event);Cls();return
   end
  elseif BrowserOutfitAction(pid,action) then
  elseif BrowserMasteryAction(pid,action) then
  elseif BrowserGrowthAction(pid,action) then
  elseif BrowserTeachingAction(pid,action) then
  elseif action=='brush-study' then
   BrowserStudyBrush(pid)
  elseif action=='normal-study' then
   browserStudyOnce(pid)
  elseif action=='offhand' then
   if BrowserOffhandSlot and BrowserOffhandSlot(pid) then
    local current=BrowserOffhandWeapon(pid)
    local rows={{id=-1,name='卸下副手',description='收起副手兵器；主手和已学武功不变。',stats={attack=0,defense=0,agility=0},eligible=current>=0,current=current<0,tags=current<0 and '当前空手' or '收起副手'}}
    local allowed={}
    for i=1,CC.MyThingNum do
     local id=JY.Base['物品'..i];local t=id>=0 and JY.Thing[id] or nil
     if t and JY.Base['物品数量'..i]>0 and t['类型']==1 and t['装备类型']==0 then
      local row=browserItem(id);row.details=BrowserItemDetails(id);row.description=t['物品说明'];row.stats={attack=0,defense=0,agility=0}
      row.current=id==current;row.eligible=not row.current and BrowserOffhandCanEquip(pid,id)
      row.tags=row.current and '已配副手' or (id==106 or id==117) and '过重，只能独持' or row.eligible and '可配副手' or '与主手不合或已被使用'
      rows[#rows+1]=row;allowed[id]=true
     end
    end
    local selected=coroutine.yield('party-items',{person=browserPerson(pid),action='offhand',items=rows})
    if type(selected)=='number' and (selected==-1 or allowed[selected]) then BrowserOffhandEquip(pid,selected) end
   end
  else
  if action~='weapon' and action~='armor' and action~='book' then return end
  local rows={};local allowed={};local field=action=='weapon' and '武器' or action=='armor' and '防具' or '修炼物品'
  for i=1,CC.MyThingNum do
   local id=JY.Base['物品'..i];local t=id>=0 and JY.Thing[id] or nil
   if t and JY.Base['物品数量'..i]>0 and ((action=='book' and t['类型']==2) or (action~='book' and t['类型']==1 and t['装备类型']==(action=='weapon' and 0 or 1))) then
    local owner=t['使用人'];local current=JY.Person[pid][field]==id
    local eligible=CanUseThing(id,pid) and JY.Person[pid]['生命']>0
    local offhandUsers={};local getOffhand=rawget(_G,'browser_offhand_get')
    if action=='weapon' and owner<0 and getOffhand then
     for other=0,(JY.PersonNum or 0)-1 do
      if getOffhand(other)==id and JY.Person[other] then offhandUsers[#offhandUsers+1]=JY.Person[other]['姓名'] end
     end
    end
    local offhandNames=table.concat(offhandUsers,'、')
    local tags=current and '已配备' or owner>=0 and JY.Person[owner]['姓名']..'持有' or offhandNames~='' and offhandNames..'副手预留' or ''
    local changes={}
    for _,k in ipairs({'攻击力','防御力','轻功'}) do local n=t['加'..k] or 0;if n~=0 then changes[#changes+1]=k..string.format('%+d',n) end end
    rows[#rows+1]={id=id,name=action=='book' and BrowserGrowthBookName and BrowserGrowthBookName(pid,id,true) or t['名称'],details=BrowserItemDetails(id),requirements=BrowserStudyRequirements(pid,id),description=t['物品说明'],tags=tags,owner=not current and owner>=0 and JY.Person[owner]['姓名'] or '',offhandUsers=offhandNames,changes=table.concat(changes,' · '),stats=browserItem(id).stats,eligible=eligible and not current,current=current}
    allowed[id]=true
   end
  end
  if action=='weapon' or action=='armor' then
   -- 395 S7 R2：排在最前的「卸下」一行；对比栏照常显示卸下后攻防轻功的变化。
   local worn=JY.Person[pid][field];local alive=JY.Person[pid]['生命']>0
   local coat=action=='armor' and worn<0 and BrowserOutfitWorn and (BrowserOutfitWorn(pid) or {}).coat
   local coatOff=coat and rawget(_G,'BrowserOutfitUnequip') or nil
   local removable=worn>=0 or coatOff~=nil
   local paired=action=='weapon' and BrowserOffhandWeapon and BrowserOffhandWeapon(pid)>=0
   local description=action=='weapon' and ('收起主手兵器，放回行囊；已学武功不变。'..(paired and '副手须与主手同类才能用，随之一并收起。' or '')..'需要兵器的招式要等再配兵器才能施展。')
    or (coat and '收起所穿衣履，放回行囊。' or '脱下护甲，放回行囊；已学武功不变。')
   local tags=action=='weapon' and (worn>=0 and '放回行囊' or '当前空手')
    or (worn>=0 and '放回行囊' or coatOff and '收起衣履' or coat and '衣履可直接换穿' or '未穿衣甲')
   table.insert(rows,1,{id=-1,name=action=='weapon' and '卸下兵器' or '卸下衣甲',description=description,stats={attack=0,defense=0,agility=0},
    eligible=removable and alive,current=not removable,tags=tags})
   allowed[-1]=true
  end
  if action=='armor' then
   for _,row in ipairs(BrowserOutfitRows(pid,'coat')) do rows[#rows+1]=row end
   for id=120,123 do if not allowed[id] then local row=browserItem(id);row.details=BrowserItemDetails(id);row.current=JY.Person[pid]['防具']==id;row.unowned=not row.current;row.eligible=false;row.tags=row.current and '已穿戴' or '尚未入囊';rows[#rows+1]=row end end
  end
  local selected=coroutine.yield('party-items',{person=browserPerson(pid),action=action,items=rows})
  if action=='armor' and type(selected)=='string' then BrowserOutfitEquip(pid,'coat',selected) end
  if selected==-1 and allowed[-1] and JY.Person[pid]['生命']>0 then
   if field=='防具' and JY.Person[pid]['防具']<0 then local off=rawget(_G,'BrowserOutfitUnequip');if off then off(pid,'coat') end
   else browserUnequip(pid,field) end
   Cls();ShowScreen()
  end
  if type(selected)=='number' and allowed[selected] and browserOwned(selected) and JY.Person[pid]['生命']>0 and JY.Person[pid][field]~=selected then
   local proceed=true
   if action=='book' and JY.Person[pid]['修炼物品']>=0 then
    proceed=DrawStrBoxYesNo(-1,-1,normalStudyEnabled() and '换书保留本人修炼心得和已学武功，炼药制物进度重新开始。是否继续？' or '更换秘籍会清空当前修炼点数，已学武功保留。是否继续？',C_WHITE,CC.DefaultFont)
   end
   if proceed then
    local originalSelect=SelectTeamMenu
    SelectTeamMenu=function() return browserTeamSlot(pid) or 0 end
    local result=table.pack(pcall(action=='book' and UseThing_Type2 or UseThing_Type1,selected))
    SelectTeamMenu=originalSelect
    if not result[1] then error(result[2],0) end
    Cls();ShowScreen()
   end
  end
  end
 end
end
-- Own combat status is presented beside the compact action column.
local sourceWarHead=WarShowHead
WarShowHead=function()
 if not WAR.Person[WAR.CurID]['我方'] then return sourceWarHead() end
end
-- COMBAT_EXTENSION
-- Read-only browser status, no mutation API.
BrowserSnapshot=function()
 local s={status=JY.Status,scene=JY.SubScene,event=JY.CurrentD,menuOpen=browserMenuDepth>0 or browserPartyOpen}
 s.autoFight=JY.Status==GAME_WMAP and WAR.AutoFight==1
 if JY.PersonNum>0 then
  s.x=JY.Base['人X1'];s.y=JY.Base['人Y1'];s.direction=JY.Base['人方向'];s.worldX=JY.Base['人X'];s.worldY=JY.Base['人Y'];s.party={};s.inventory={}
  s.unlocked=JY.Scene[0]['进入条件']==0
  s.place=JY.SubScene>=0 and JY.Scene[JY.SubScene]['名称'] or '江湖'
  for i=1,6 do local p=JY.Base['队伍'..i];if p>=0 then local sk={};for n=1,10 do local w=JY.Person[p]['武功'..n];if w and w>0 then sk[#sk+1]=w end end;s.party[#s.party+1]={skills=sk,id=p,name=JY.Person[p]['姓名'],hp=JY.Person[p]['生命'],maxhp=JY.Person[p]['生命最大值'],mp=JY.Person[p]['内力'],maxmp=JY.Person[p]['内力最大值'],level=JY.Person[p]['等级'],agility=JY.Person[p]['轻功'],head=JY.Person[p]['头像代号'],injury=JY.Person[p]['受伤程度'],poison=JY.Person[p]['中毒程度'],stamina=JY.Person[p]['体力'],weapon=JY.Person[p]['武器'],armor=JY.Person[p]['防具'],book=JY.Person[p]['修炼物品']} end end
  for i=1,200 do local id=JY.Base['物品'..i];if id>=0 then s.inventory[#s.inventory+1]={id=id,name=JY.Thing[id]['名称'],num=JY.Base['物品数量'..i]} end end
  s.morality=JY.Person[0]['品德'];s.reputation=JY.Person[0]['声望'];s.stats={}
  for _,k in ipairs({'攻击力','防御力','轻功','资质','医疗能力','拳掌功夫','御剑能力','耍刀技巧'}) do s.stats[k]=JY.Person[0][k] end
  s.training={}
  -- 395 Q6 P6-1：s.training 没有任何 JS 在读，走路时却每步为全队重算研习信息（实测约占主线程两成）。
  -- 只在 QA 显式设置 BrowserSnapshotTraining 时计算；修炼的同步仍由载入、开战与人物页各自完成。
  if rawget(_G,'BrowserSnapshotTraining') and JY.Status~=GAME_WMAP then
   for i=1,6 do
    local id=JY.Base['队伍'..i]
    if id>=0 then
     local p=JY.Person[id];local item=p['修炼物品'];local need=TrainNeedExp(id)
     local art=item>=0 and JY.Thing[item]['练出武功'] or -1;local level=0
     if art>=0 then for n=1,10 do if p['武功'..n]==art then level=math.floor(p['武功等级'..n]/100)+1;break end end end
     local grown=BrowserGrowthStudyRank and BrowserGrowthStudyRank(id,item)
     local bookName=item>=0 and (BrowserGrowthBookName and BrowserGrowthBookName(id,item,true) or JY.Thing[item]['名称']) or ''
     local rankInfo=BrowserGrowthRankInfo and BrowserGrowthRankInfo(id,item)
     local dual=BrowserPracticePerson and BrowserPracticePerson(id)
     if dual then
      for _,kind in ipairs({'martial','heart'})do local r=dual[kind];s.training[#s.training+1]={id=id,name=p['姓名']..(kind=='heart' and ' · 心法' or ' · 武功'),book=r.id~=0 and r.name or '',points=math.floor(r.progress),needed=r.cost,art=r.id~=0 and r.name or '',level=r.rank,maxRank=r.maxRank,rankUnit=r.rankUnit} end
     else
     s.training[#s.training+1]={id=id,name=p['姓名'],book=bookName,points=p['修炼点数'],needed=need==math.huge and -1 or need,art=art>=0 and JY.Wugong[art]['名称'] or grown and bookName or '',level=grown or level,maxRank=rankInfo and rankInfo.maxRank or 10,rankUnit=rankInfo and rankInfo.rankUnit or '级'}
     end
    end
   end
  end
 end
 if JY.Status==GAME_MMAP then
  s.destinations={}
  for id=0,JY.SceneNum-1 do local q=JY.Scene[id];if q['外景入口X1']>0 and q['外景入口Y1']>0 then s.destinations[#s.destinations+1]={id=id,name=q['名称'],x=q['外景入口X1'],y=q['外景入口Y1'],x2=q['外景入口X2'],y2=q['外景入口Y2'],condition=q['进入条件']} end end
 end
 if JY.Status==GAME_WMAP and WAR.CurID and WAR.Person[WAR.CurID] then
  s.combatants={}
  for i=0,WAR.PersonNum-1 do local q=WAR.Person[i];local p=JY.Person[q['人物编号']];s.combatants[#s.combatants+1]={id=q['人物编号'],name=p['姓名'],head=p['头像代号'],agility=p['轻功']+(p['武器']>=0 and JY.Thing[p['武器']]['加轻功'] or 0)+(p['防具']>=0 and JY.Thing[p['防具']]['加轻功'] or 0),knowledge=p['武学常识'],maxmp=p['内力最大值'],stamina=p['体力'],side=q['我方'],x=q['坐标X'],y=q['坐标Y'],direction=q['人方向'],dead=q['死亡'],hp=p['生命'],maxhp=p['生命最大值'],mp=p['内力'],poison=p['中毒程度'],injury=p['受伤程度']}
   local pm=rawget(_G,'BrowserPoisonMedInfo')
   pm=type(pm)=='function' and pm(q['人物编号']) or nil
   if pm then local c=s.combatants[#s.combatants]
    c.stack=pm.nextStack;c.tick=pm.tick;c.guard=pm.guard;c.shed=pm.shed;c.immune=pm.immune;c.thorn=pm.thorn end
  end
  s.party={}
  for i=0,WAR.PersonNum-1 do if WAR.Person[i]['我方'] then local id=WAR.Person[i]['人物编号'];local p=JY.Person[id];s.party[#s.party+1]={id=id,name=p['姓名'],hp=p['生命'],maxhp=p['生命最大值'],mp=p['内力'],maxmp=p['内力最大值'],level=p['等级'],head=p['头像代号'],stamina=p['体力'],injury=p['受伤程度'],poison=p['中毒程度']} end end
  s.combat={current=WAR.CurID,side=WAR.Person[WAR.CurID]['我方'],x=WAR.Person[WAR.CurID]['坐标X'],y=WAR.Person[WAR.CurID]['坐标Y'],moves=WAR.Person[WAR.CurID]['移动步数']} end
 return s
end
-- UI_EXTENSION
local originalReadRecord=Menu_ReadRecord
local originalLoadRecord=LoadRecord
LoadRecord=function(id)
 if id==4 then
  CC.R_IDXFilename[4]=CC.R_IDXFilename[0]
  CC.R_GRPFilename[4]=CONFIG.DataPath..'r4.grp'
  CC.S_Filename[4]=CONFIG.DataPath..'s4.grp'
  CC.D_Filename[4]=CONFIG.DataPath..'d4.grp'
 end
 local result=table.pack(originalLoadRecord(id))
 BrowserInstallStarterItems()
 return table.unpack(result,1,result.n)
end
Menu_ReadRecord=function()
 local menu={{'进度一',nil,browser_has_save(1) and 1 or 0},{'进度二',nil,browser_has_save(2) and 1 or 0},{'进度三',nil,browser_has_save(3) and 1 or 0}}
 if not browser_has_save(1) and not browser_has_save(2) and not browser_has_save(3) then DrawStrBoxWaitKey('尚无存档，请先开始江湖。'); return 0 end
 local r=ShowMenu(menu,3,0,0,0,0,0,1,1,24,0,0)
 if r>0 then LoadRecord(r);JY.Status=GAME_FIRSTMMAP;return 1 end
 return 0
end
-- CREATION_EXTENSION
-- JOURNEY_EXTENSION
-- ZHOU_EXTENSION
-- MEI_EXTENSION
-- PASTIME_EXTENSION
-- INN_EXTENSION
-- ECHO_EXTENSION
-- OUTFIT_EXTENSION
-- TEACHING_EXTENSION
-- MASTERY_EXTENSION
-- OPENING_EXTENSION
-- TIANBO_EXTENSION
-- LINPING_EXTENSION
-- MURONG_EXTENSION
-- GROWTH_EXTENSION
-- SIGNATURE_EXTENSION
-- TOOSIMPLE_EXTENSION
-- WEAPON_EXTENSION
-- HOMESTEAD_EXTENSION
-- GARDEN_EXTENSION
-- EXPLORATION_EXTENSION
-- REST_SAVE_EXTENSION
-- STARTER_EXTENSION
-- BACKSTORY_EXTENSION
-- LEGACY_EXTENSION
-- POISONMED_EXTENSION
-- ARTFX_EXTENSION
-- JIUYANG_EXTENSION
-- THROWN_EXTENSION
-- MARRIAGE_EXTENSION
-- DARKPATH_EXTENSION
-- EXPSHARE_EXTENSION
-- NPCINNER_EXTENSION
-- 186: Tom's post-combat recovery rule. Run only on an actual battle settlement,
-- after the original rewards/recovery. Do not heal HP/MP, revive, or save here.
;(function()
 local settleBattle=War_EndPersonData
 -- 只清战中新增的异气：剧情种下的（令狐冲八道异种真气）留给易筋线化解。
 local qiBefore={}
 local battle=WarMain
 WarMain=function(...)
  qiBefore={}
  for i=1,CC.TeamNum do
   local pid=JY.Base['队伍'..i];if pid and pid>=0 then qiBefore[pid]=BrowserGrowthForeignQi(pid) end
  end
  return battle(...)
 end
 War_EndPersonData=function(...)
  local result=table.pack(settleBattle(...))
  local ids={}
  for i=1,CC.TeamNum do
   local pid=JY.Base['队伍'..i];if pid and pid>=0 then ids[pid]=true end
  end
  for i=0,(WAR.PersonNum or 0)-1 do
   local u=WAR.Person[i];if u then ids[u['人物编号']]=true end
  end
  for pid in pairs(ids) do
   local p=JY.Person[pid]
   if p then p['受伤程度']=0;p['中毒程度']=0 end
   local keep=qiBefore[pid] or 0
   if BrowserGrowthForeignQi(pid)>keep then BrowserGrowthCommitQi(pid,keep) end
  end
  return table.unpack(result,1,result.n)
 end
end)()
-- Native floating damage and picture clips must use the same battle projection.
do
 local sourceBattle=WarMain
 WarMain=function(...)
  local x,y=CC.XScale,CC.YScale;CC.XScale,CC.YScale=lib.BattleGrid()
  local result=table.pack(pcall(sourceBattle,...));CC.XScale,CC.YScale=x,y
  if not result[1]then error(result[2],0)end
  return table.unpack(result,2,result.n)
 end
end
-- The base roster used another sect's art for these rank-and-file fighters.
-- Match only the original skill so a customized save is left alone.
do
 local corrections={
  {91,100,39,47},
  {241,250,33,44},
  {281,290,63,11},
 }
 local function alignFactionArts()
  for _,row in ipairs(corrections) do
   for pid=row[1],row[2] do
    local p=JY.Person[pid]
    -- Legacy person names arrive as source-encoded bytes, so only the fixed
    -- original pid and the unchanged mistaken skill are reliable here.
    if p and p['武功1']==row[3] then p['武功1']=row[4] end
   end
  end
 end
 local load=LoadRecord
 LoadRecord=function(...)
  local result=table.pack(load(...));alignFactionArts()
  return table.unpack(result,1,result.n)
 end
 local start=NewGame
 NewGame=function(...)
  local result=table.pack(start(...));alignFactionArts()
  return table.unpack(result,1,result.n)
 end
end
if browser_test_battle()>=0 then
 SetGlobalConst();SetGlobal();JY.Status=GAME_START;SetModify();NewGame();JY.SubScene=0;JY.Status=GAME_SMAP;Init_SMap(0)
 if browser_test_aim() then
  local p=JY.Person[0];p['生命最大值']=900;p['生命']=900;p['内力最大值']=900;p['内力']=900;p['轻功']=150;p['体力']=100
  for slot,id in ipairs({92,30,1,45})do p['武功'..slot]=id;p['武功等级'..slot]=900 end
  DrawStrBoxWaitKey('选格与范围测试：主角临时配备九阳、六脉等招式，仅检查战斗操作，不计正式进度。')
 elseif browser_test_fixture() then
  local p=JY.Person[0];p['等级']=10;p['经验']=0;p['生命最大值']=450;p['生命']=240;p['内力最大值']=400;p['内力']=300;p['攻击力']=80;p['防御力']=80;p['轻功']=80;p['受伤程度']=17;p['中毒程度']=20;p['体力']=50;p['武功等级1']=999;instruct_32(11,2);instruct_32(3,2)
  DrawStrBoxWaitKey('胜利结算测试：主角使用加强数值，只验证用药和胜利结算，不代表正式游戏难度。')
 else DrawStrBoxWaitKey('战斗适配测试：此处仅检验原版战斗，不计入故事进度。') end
 local won=WarMain(browser_test_battle(),1);browser_battle_result(won)
 DrawStrBoxWaitKey((won and '战斗测试：胜利返回。' or '战斗测试：战败返回。')..string.format('\n战后伤势 %d · 中毒 %d\n气血 %d/%d · 内力 %d/%d',JY.Person[0]['受伤程度'],JY.Person[0]['中毒程度'],JY.Person[0]['生命'],JY.Person[0]['生命最大值'],JY.Person[0]['内力'],JY.Person[0]['内力最大值']))
elseif browser_test_scene()>=0 then
 -- 开发用场景巡检（?scene-test=场景号&at=x,y）：新局底板直接进场景，走原版 Game_Cycle，出口、事件都照原规则；不计入任何存档。
 SetGlobalConst();SetGlobal();JY.Status=GAME_START;SetModify();NewGame()
 local sid,x,y=browser_test_scene()
 if x<0 or y<0 then x,y=JY.Scene[sid]['入口X'],JY.Scene[sid]['入口Y'] end
 JY.SubScene=sid;JY.Base['人X1']=x;JY.Base['人Y1']=y;JY.MyPic=CC.NewPersonPic
 -- 大地图位置保留新局默认（不放在入口格上，否则出门即被原版大地图循环重新带进去）。
 JY.Status=GAME_SMAP;JY.MMAPMusic=-1;Init_SMap(0)
 Game_Cycle()
else JY_Main_sub() end
