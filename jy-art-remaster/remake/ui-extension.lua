do
-- Read-only current-position preview. Uses the source's flag=1 passability:
-- point/area centres go around buildings; rays and their affected cells do
-- not. Never call the marking selectors here: their map/facing writes would
-- disturb manual aim, R repeat and the second half of a dual action.
BrowserBattleSkillPreview=function(id,slot)
 local unit=WAR and WAR.Person and WAR.Person[id]
 local p=unit and JY.Person[unit['人物编号']]
 if not p then return nil end
 local ordinary=slot==11
 local skill=ordinary and 1 or p['武功'..slot]
 local w=skill and JY.Wugong[skill]
 if not w then return nil end
 local raw=ordinary and 0 or p['武功等级'..slot] or 0
 -- 159：龙象般若功 11-13 层记在 growth.extraRanks，武功等级本身停在 900-999。原版 War_Fight_Sub 的
 -- level=floor(等级/100)+1 因此最高 10：射程、杀伤范围和耗内倍数 floor((level+1)/2) 真打都按 10 级取表，
 -- 末三层只抬威力和每层 +2 的耗内步长（growth-extension BrowserGrowthSkillInfo 与 balance-combat enterCosts
 -- 同口径）。这里把「原版取表等级」与「界面层数」分开；耗内以 BrowserGrowthSkillInfo 为准，
 -- 这样无论是否处在 enterCosts 的临时改价作用域内，预览都与实际扣减一致。
 local native=math.min(10,math.floor(raw/100)+1)
 local info=not ordinary and BrowserGrowthSkillInfo and BrowserGrowthSkillInfo(unit['人物编号'],skill) or nil
 local rank=info and info.rank or native
 local shape=ordinary and 0 or w['攻击范围']
 local reach=ordinary and 1 or w['移动范围'..native] or 0
 local radius=shape==3 and (w['杀伤范围'..native] or 0) or 0
 local step=ordinary and 0 or w['消耗内力点数'] or 0
 local mp=math.max(0,p['内力'] or 0)
 -- The source charges AFTER adding 1..2 proficiency. Show a cost interval
 -- at a rank boundary, and the actual capped loss when MP is insufficient.
 local lo=math.min(10,math.floor((raw+(raw<900 and 1 or 0))/100)+1)
 local hi=math.min(10,math.floor((raw+(raw<900 and 2 or 0))/100)+1)
 local full=info and info.cost or math.floor((native+1)/2)*step
 local function costAt(r) return r==native and full or math.floor((r+1)/2)*step end
 local out={rank=rank,nativeRank=native,maxRank=info and info.maxRank or 10,rankUnit=info and info.rankUnit or '级',
  range=reach,radius=radius,shape=shape,fullCost=full,
  costMin=math.min(mp,costAt(lo)),costMax=math.min(mp,costAt(hi)),
  -- 394：施展门槛＝一级耗内 floor((1+1)/2)×步长，与 War_FightMenu 的「内力>=消耗内力点数」同读一格；
  -- 禁用行据此写「至少需内力 N · 现有 M」，不再把封顶后的现有内力当耗内显示。
  minCost=step,mp=mp,
  weakened=w['伤害类型']==0 and mp<full,maxTargets=0,reachableTargets=0}
 local ox,oy=unit['坐标X'],unit['坐标Y'];local foes={}
 for i=0,WAR.PersonNum-1 do
  local q=WAR.Person[i]
  if q and not q['死亡'] and q['我方']~=unit['我方'] and GetWarMap(q['坐标X'],q['坐标Y'],2)==i then
   foes[#foes+1]={x=q['坐标X'],y=q['坐标Y']}
  end
 end
 local reached={}
 local function count(cx,cy,dx,dy)
  local n=0
  for i,e in ipairs(foes)do
   local x,y=e.x-cx,e.y-cy;local d=math.abs(x)+math.abs(y);local hit
   if shape==0 then hit=x==0 and y==0
   elseif shape==3 then hit=math.abs(x)<=radius and math.abs(y)<=radius
   elseif shape==2 then hit=d>0 and d<=reach and (x==0 or y==0)
   else hit=d>0 and d<=reach and (dx==0 and x==0 and y*dy>0 or dy==0 and y==0 and x*dx>0)end
   if hit then n=n+1;reached[i]=true end
  end
  out.maxTargets=math.max(out.maxTargets,n)
 end
 if shape==1 then
  count(ox,oy,0,-1);count(ox,oy,1,0);count(ox,oy,-1,0);count(ox,oy,0,1)
 elseif shape==2 then count(ox,oy)
 else
  local queue={{x=ox,y=oy,d=0}};local seen={[oy*CC.WarWidth+ox]=true};local head=1
  while head<=#queue do
   local q=queue[head];head=head+1;count(q.x,q.y)
   if q.d<reach then
    for _,d in ipairs({{1,0},{-1,0},{0,1},{0,-1}})do
     local x,y=q.x+d[1],q.y+d[2];local key=y*CC.WarWidth+x
     if x>0 and y>0 and x<CC.WarWidth-1 and y<CC.WarHeight-1 and not seen[key] and War_CanMoveXY(x,y,1)then
      seen[key]=true;queue[#queue+1]={x=x,y=y,d=q.d+1}
     end
    end
   end
  end
 end
 for _ in pairs(reached)do out.reachableTargets=out.reachableTargets+1 end
 return out
end
-- End read-only current-position preview.
-- Keep source item effects, skill resolution and turn costs.
-- lastAction[pid] remembers the most recently COMPLETED manual attack for R:
-- either {kind='single',id=skillId or 'ordinary'} or {kind='dual',skill1=,skill2=}.
-- Slots are re-found by skill identity below, since a slot may move after
-- learning/forgetting; this table itself never touches the save file.
local lastAction={}
local function findSlotForSkill(p,skill)
 for i=1,10 do if p['武功'..i]==skill then return i end end
 return nil
end
local function dualArtRows(id,rows,slots)
 local candidates={}
 for _,row in ipairs(rows) do
  if row.id and row.id>0 and slots[row.slot] then candidates[#candidates+1]=row end
 end
 local out={}
 for _,row in ipairs(candidates) do
  -- Same art twice or two different arts are both approved pairs, so the
  -- partner search includes the row itself. The shared query owns the
  -- rules; its reason (e.g. 内力不足) is surfaced instead of a generic one.
  local enabled,reason=false,nil
  for _,other in ipairs(candidates) do
   local ok,_,why=BrowserDualPairCheck(id,row.slot,other.slot)
   if ok then enabled=true;reason=nil;break end
   reason=reason or why
  end
  out[#out+1]={id=row.id,slot=row.slot,name=row.name,level=row.level,maxRank=row.maxRank,rankUnit=row.rankUnit,cost=row.cost,range=row.range,shape=row.shape,preview=row.preview,note=row.note,enabled=enabled,disabledReason=(not enabled) and (reason or '无可搭配招式') or nil}
 end
 return out
end
BrowserRepeatSlot=false
BrowserClearSkillUse=function(pid,skill)
 local a=lastAction[pid]
 if a and ((a.kind=='single' and a.id==skill) or (a.kind=='dual' and (a.skill1==skill or a.skill2==skill))) then
  lastAction[pid]=nil;BrowserRepeatSlot=false
 end
 lib.ForgetUIUse(pid,skill)
end
BrowserRepeatInfo=function(items)
 if JY.Status~=GAME_WMAP or not WAR.Person[WAR.CurID] or not WAR.Person[WAR.CurID]['我方'] or not items[2] or items[2][2]~=War_FightMenu then return nil end
 local pid=WAR.Person[WAR.CurID]['人物编号'];local p=JY.Person[pid]
 -- Explain the source menu's unavailable attack without changing its gate.
 local attack=nil
 if items[2][3]<=0 then
  local minimum=War_GetMinNeiLi(pid)
  if minimum==math.huge then attack='未习得招式'
  elseif p['体力']<10 then attack='攻击 · 体力不足'
  elseif p['内力']<minimum then attack='攻击 · 内力不足'
  else attack='攻击 · 不可用' end
 end
 local a=lastAction[pid]
 if not a then return {available=false,attack=attack} end
 if a.kind=='dual' then
  local slot1=findSlotForSkill(p,a.skill1);local slot2=findSlotForSkill(p,a.skill2)
  if not slot1 or not slot2 then return {available=false,attack=attack} end
  local ok,cost,reason
  if BrowserDualPairCheck then ok,cost,reason=BrowserDualPairCheck(WAR.CurID,slot1,slot2) end
  local name=(JY.Wugong[a.skill1] and JY.Wugong[a.skill1]['名称'] or '?')..'+'..(JY.Wugong[a.skill2] and JY.Wugong[a.skill2]['名称'] or '?')
  return {available=true,id=-3,name=name,slot='dual',enabled=items[2][3]>0 and ok==true,reason=reason or '内力不足',attack=attack}
 end
 if a.id=='ordinary' then
  local row=type(BrowserOrdinaryStrike)=='function' and BrowserOrdinaryStrike(pid)
  if row then return {available=true,id=-1,name=row.name,slot=row.slot,enabled=row.enabled and items[2][3]>0,reason='体力不足',attack=attack} end
  return {available=false,attack=attack}
 end
 for i=1,10 do
  if p['武功'..i]==a.id then
   local requirement=BrowserTechniqueInfo and BrowserTechniqueInfo(pid,a.id)
   local enabled=items[2][3]>0 and p['内力']>=JY.Wugong[a.id]['消耗内力点数'] and p['体力']>=10 and (not requirement or requirement.allowed)
   return {available=true,id=a.id,name=JY.Wugong[a.id]['名称'],slot=i,enabled=enabled,reason=requirement and not requirement.allowed and requirement.reason or p['体力']<10 and '体力不足' or '内力不足',attack=attack}
  end
 end
 return {available=false,attack=attack}
end
-- Two-art picker: rows already exist from War_FightMenu's normal skill
-- scan, filtered to slots BrowserDualMenuInfo says are legal. Cancellation
-- at either step spends nothing (returns 0 before BrowserRunDualAction is
-- ever called). Only on a genuinely completed pair (passes==2) is the R
-- history recorded as a pair; a first-only pass records just that art.
local function chooseDualPair(q,p,rows,dualInfo)
 local pid=q['人物编号']
 local firstList=dualArtRows(WAR.CurID,rows,dualInfo.slots)
 local pick1=coroutine.yield('skills',{person=pid,name=p['姓名'],mp=p['内力'],stamina=p['体力'],title=p['姓名']..' · 左右互搏 · 第一招',skills=firstList})
 if not pick1 or not dualInfo.slots[pick1] then return 0 end
 -- The chosen first art must be an enabled picker row (affordable with
 -- some partner), not merely a legal slot.
 local firstOk=false
 for _,row in ipairs(firstList) do if row.slot==pick1 and row.enabled then firstOk=true end end
 if not firstOk then return 0 end
 local secondList={}
 for _,row in ipairs(firstList) do
  local ok,pairCost,reason=BrowserDualPairCheck(WAR.CurID,pick1,row.slot)
  local note=row.note or ''
  if pairCost then note=note..(note=='' and '' or '；')..'两招合计内力 '..pairCost end
  secondList[#secondList+1]={id=row.id,slot=row.slot,name=row.name,level=row.level,maxRank=row.maxRank,rankUnit=row.rankUnit,cost=row.cost,range=row.range,shape=row.shape,preview=row.preview,note=note,enabled=ok,disabledReason=reason}
 end
 local pick2=coroutine.yield('skills',{person=pid,name=p['姓名'],mp=p['内力'],stamina=p['体力'],title=p['姓名']..' · 左右互搏 · 第二招',skills=secondList})
 if not pick2 then return 0 end
 local ok2=false
 for _,row in ipairs(secondList) do if row.slot==pick2 and row.enabled then ok2=true end end
 if not ok2 then return 0 end
 local success,result,passes=pcall(function() WAR.ShowHead=0;return BrowserRunDualAction(WAR.CurID,pick1,pick2) end)
 pcall(function() WAR.ShowHead=1;Cls() end)
 if not success then error(result,0) end
 if result==1 then
  if passes==2 then lastAction[pid]={kind='dual',skill1=p['武功'..pick1],skill2=p['武功'..pick2]}
  else lastAction[pid]={kind='single',id=p['武功'..pick1]} end
 end
 return result
end
War_FightMenu=function()
 local q=WAR.Person[WAR.CurID];local p=JY.Person[q['人物编号']];local rows={};local valid={}
 for i=1,10 do
  local id=p['武功'..i]
  if id>0 then
   local w=JY.Wugong[id];local level=math.floor(p['武功等级'..i]/100)+1
   local requirement=BrowserTechniqueInfo and BrowserTechniqueInfo(q['人物编号'],id)
   local enabled=p['内力']>=w['消耗内力点数'] and p['体力']>=10 and (not requirement or requirement.allowed)
   local qi=id==28 and BrowserBalanceEnabled and BrowserBalanceEnabled() and BrowserBalanceQi and BrowserBalanceQi(q['人物编号'])
   local handNote=BrowserWeaponHint and BrowserWeaponHint(q['人物编号'],id)
   -- 395 S7 R2：经典规则（章节试玩、battle-test 等）没有兵器门槛，原版本就空手可出刀剑招；列表里却看不出，常被当成门槛失灵。
   -- 只在没有门槛、空手、且此招本属刀剑棍鞭箫时补一句；成长规则下门槛与「未装备兵器」原样不动。
   if not requirement and BrowserWeaponAdapt and (BrowserWeaponAdapt(id).required or '')~='' and (p['武器'] or -1)<0 then handNote='经典规则：空手亦可施展此招。' end
   local info=BrowserGrowthSkillInfo and BrowserGrowthSkillInfo(q['人物编号'],id)
   rows[#rows+1]={id=id,slot=i,name=w['名称'],level=info and info.rank or level,maxRank=info and info.maxRank or 10,rankUnit=info and info.rankUnit or '级',cost=info and info.cost or math.floor((level+1)/2)*w['消耗内力点数'],range=w['移动范围'..level],shape=w['攻击范围'],preview=BrowserBattleSkillPreview(WAR.CurID,i),enabled=enabled,disabledReason=requirement and not requirement.allowed and requirement.reason or nil,
    note=(qi and ('异气'..qi..'/100；本次吸取后达60则回气减半并受1伤，达90受2伤，满100不再回气。可取消择招；本场所生异气战后自行平复，剧情所种异气仍须易筋调理。') or '')..(handNote or '')}
   valid[i]=enabled
  end
 end
 local ordinary=type(BrowserOrdinaryStrike)=='function' and BrowserOrdinaryStrike(q['人物编号'])
 if ordinary then ordinary.preview=BrowserBattleSkillPreview(WAR.CurID,ordinary.slot);rows[#rows+1]=ordinary;valid[ordinary.slot]=ordinary.enabled end
 -- 左右互搏 row: hidden entirely (dualInfo==nil) for non-learners, no
 -- extra click cost for anyone else. Same core gates as R and the helper.
 local dualInfo=BrowserDualMenuInfo and BrowserDualMenuInfo(WAR.CurID)
 if dualInfo then
  rows[#rows+1]={id=-2,slot=12,name='左右互搏',summary='连出两招：每招七成五威力，分别耗内，共耗体力6。',enabled=dualInfo.enabled,disabledReason=dualInfo.reason}
  valid[12]=dualInfo.enabled
 end
 local r=BrowserRepeatSlot;BrowserRepeatSlot=false
 if r=='dual' then
  local a=lastAction[q['人物编号']]
  if a and a.kind=='dual' then
   local slot1=findSlotForSkill(p,a.skill1);local slot2=findSlotForSkill(p,a.skill2)
   if slot1 and slot2 then
    local ok=BrowserDualPairCheck(WAR.CurID,slot1,slot2)
    if ok then
     local success,result,passes=pcall(function() WAR.ShowHead=0;return BrowserRunDualAction(WAR.CurID,slot1,slot2) end)
     pcall(function() WAR.ShowHead=1;Cls() end)
     if not success then error(result,0) end
     if result==1 then
      if passes==2 then lastAction[q['人物编号']]={kind='dual',skill1=a.skill1,skill2=a.skill2}
      else lastAction[q['人物编号']]={kind='single',id=a.skill1} end
     end
     return result
    end
   end
  end
  return 0
 end
 if not r then
  if #rows==1 and rows[1].enabled then r=rows[1].slot
  else r=coroutine.yield('skills',{person=q['人物编号'],name=p['姓名'],mp=p['内力'],stamina=p['体力'],skills=rows}) end
 end
 if r==12 then
  if not valid[12] then return 0 end
  return chooseDualPair(q,p,rows,dualInfo)
 end
 if not r or not valid[r] then return 0 end
 local success,result=pcall(function() WAR.ShowHead=0;return War_Fight_Sub(WAR.CurID,r) end)
 pcall(function() WAR.ShowHead=1;Cls() end)
 if not success then error(result,0) end
 return result
end
local manualAim=false
local resolvedFight=War_Fight_Sub
War_Fight_Sub=function(id,slot,x,y)
 local q=WAR.Person[id];local pid=q['人物编号'];local skill=JY.Person[pid]['武功'..slot]
 manualAim=q['我方'] and x==nil and y==nil and WAR.AutoFight~=1
 local ok,result=pcall(resolvedFight,id,slot,x,y)
 manualAim=false
 if not ok then error(result,0) end
 if result==1 and q['我方'] and x==nil and y==nil and WAR.AutoFight~=1 then
  -- While a dual-segment helper pass for this actor is in flight, its own
  -- caller records the pair (or first-only) afterward; don't let each raw
  -- pass overwrite that with a phantom single entry. Usage recording,
  -- though, must still fire once per real segment so common-arts sorting
  -- learns actual use of both arts in the pair.
  if not (BrowserDualSegmentActive and BrowserDualSegmentActive()==pid) then
   lastAction[pid]={kind='single',id=slot==11 and 'ordinary' or skill}
  end
  lib.RecordUIUse('skill',pid,slot==11 and -1 or skill)
 end
 return result
end
-- Show the original cross cells before manual confirmation (also for R repeat).
local sourceCross=War_FightSelectType2
War_FightSelectType2=function(skill,level,...)
 sourceCross(skill,level,...)
 if manualAim then
  local q=WAR.Person[WAR.CurID];local x,y=q['坐标X'],q['坐标Y']
  lib.BeginBattleSelection('cross',WAR.CurID,x,y,x,y)
  lib.DrawWarMap(3,x,y,x,y,0);ShowScreen()
  local result=table.pack(pcall(function()
   while true do
    local key=lib.GetKey()
    if key==32 or key==13 then return
    elseif key==27 then error(BrowserCancelledCross,0)end
    lib.DrawWarMap(3,x,y,x,y,0);ShowScreen()
   end
  end))
  lib.EndBattleSelection()
  if not result[1]then error(result[2],0)end
 end
end
BrowserItemDetails=function(id)
 local data={}
 for key in pairs(CC.Thing_S) do data[key]=JY.Thing[id][key] end
 if JY.ThingUseFunction and JY.ThingUseFunction[id] then data.customUse=true end
 if id==0 and data.customUse then
  data.customEffect='战外忘记一门武功，永久损失50点气血上限；使用者气血上限须超过50。'
  if JY.Status==GAME_WMAP then data.useReason='战斗中不能饮酒散功。' end
 elseif id==2 and data.customUse then
  data.customEffect='战斗中救醒一名倒下的同伴，气血恢复至上限；不补充内力或体力。'
  if JY.Status~=GAME_WMAP then data.useReason='只可在战斗中救醒倒下的同伴。'
  else
   local fallen=false
   for i=0,WAR.PersonNum-1 do local p=WAR.Person[i];if p['我方'] and p['死亡'] then fallen=true;break end end
   if not fallen then data.useReason='暂无倒下的同伴，不能用作疗伤药。' end
  end
 end
 return data
end
-- The report reads the same live values as CanUseThing, not the initial DOS
-- character or displayed gear totals. Every unmet requirement remains visible.
BrowserStudyRequirements=function(pid,id,study)
 local p=JY.Person[pid];local t=BrowserItemDetails(id);local rows={}
 local function add(key,text,met) rows[#rows+1]={key=key,text=text,met=met} end
 local nature={[0]='阴性',[1]='阳性',[2]='调和'}
 if t['仅修炼人物'] and t['仅修炼人物']>=0 then
  local owner=t['仅修炼人物'];add('person','本版传承人：'..JY.Person[owner]['姓名']..'（当前 '..p['姓名']..'）',pid==owner)
 end
 local need=t['需内力性质']
 if need and need~=2 then add('nature','内力属性：'..(nature[need] or '未知')..'或调和（当前 '..(nature[p['内力性质']] or '未知')..'）',p['内力性质']==2 or p['内力性质']==need)
 else add('nature','内力属性不限（当前 '..(nature[p['内力性质']] or '未知')..'）',true) end
 for _,field in ipairs({'内力','攻击力','轻功','用毒能力','医疗能力','解毒能力','拳掌功夫','御剑能力','耍刀技巧','特殊兵器','暗器技巧','资质'})do
  local n=t['需'..field] or 0
  -- General inventory hides this discovery, but a chosen learner must see
  -- both the native current-value gate and the recorded initial disposition.
  if field=='资质' and id==91 then n=JY.Thing[id]['需资质'] or 0 end
  if n~=0 then
   local current=p[field=='内力' and '内力最大值' or field] or 0
   local title=field=='内力' and '内力上限' or field=='攻击力' and '自身攻击力' or field=='轻功' and '自身轻功' or field
   add(field,title..(n<0 and ' ≤ ' or ' ≥ ')..math.abs(n)..'（当前 '..current..'）',n<0 and current<=-n or n>0 and current>=n)
  end
 end
 local extra=BrowserGrowthBookRequirements and BrowserGrowthBookRequirements(pid,id)
 if extra then for _,row in ipairs(extra)do rows[#rows+1]=row end
 else add('health','气血大于0（当前 '..p['生命']..'）',p['生命']>0) end
 local failed=false;for _,row in ipairs(rows)do if not row.met then failed=true end end
 if not failed and not CanUseThing(id,pid) then add('other','尚未满足当前剧情的使用条件',false) end
 if study and p['修炼物品']==id then
  local cost=TrainNeedExp(pid)
  if cost and cost>0 and cost<math.huge then add('experience','本次研习心得 ≥ '..cost..'（当前 '..p['修炼点数']..'）',p['修炼点数']>=cost) end
 end
 return rows
end
local function itemRows(thing,num)
 local rows={}
 for i=0,CC.MyThingNum-1 do
  local id=thing[i];local t=id and id>=0 and JY.Thing[id] or nil
  if t and num[i]>0 then
   local owner=t['使用人'];local learners={}
   if t['类型']==2 and JY.Status~=GAME_WMAP then for slot=1,CC.TeamNum do local pid=JY.Base['队伍'..slot];if pid and pid>=0 then learners[#learners+1]={id=pid,name=JY.Person[pid]['姓名'],requirements=BrowserStudyRequirements(pid,id)} end end end
   rows[#rows+1]={id=id,name=t['名称'],num=num[i],learners=learners,owner=owner>=0 and JY.Person[owner]['姓名'] or '',details=BrowserItemDetails(id)}
  end
 end
 return rows
end
SelectThing=function(thing,num)
 local rows=itemRows(thing,num)
 if #rows==0 then DrawStrBoxWaitKey('行囊中没有此类物品。');return -1 end
 local id=coroutine.yield('items',{items=rows,battle=JY.Status==GAME_WMAP})
 for _,r in ipairs(rows) do if r.id==id then return id end end
 return -1
end
Menu_Thing=function()
 local thing={};local num={}
 for i=0,CC.MyThingNum-1 do thing[i]=JY.Base['物品'..i+1];num[i]=JY.Base['物品数量'..i+1] end
 local id=SelectThing(thing,num)
 if id>=0 then UseThing(id);return 1 end
 return 0
end
local originalUseThing=UseThing
local function quantity(id)
 for i=1,CC.MyThingNum do if JY.Base['物品'..i]==id then return JY.Base['物品数量'..i] end end
 return 0
end
UseThing=function(id)
 local before=quantity(id);local owner=JY.Thing[id]['使用人']
 local result=originalUseThing(id)
 if quantity(id)<before or JY.Thing[id]['使用人']~=owner then lib.RecordUIUse('item',0,id) end
 return result
end

-- SCENE_KNIFE_OFFER_BEGIN
-- Each handover still runs its original item event, including consumption,
-- dialogue, permissions and rewards. Only a carried, currently requested item
-- is offered when the player faces its recipient.
local sceneItemOffers={
 [0]={event=10,item=133,label='交还两页刀法'},
 [49]={event=41,item=158,label='交还七心海棠'},
 [24]={event=32,item=137,label='送上眼毒解药'},
 [4]={event=71,item=181,label='出示一撮金毛'},
 [38]={event=335,item=136,label='送上玄冰碧火酒',talk=334},
}
local sourceSceneItemEvent=EventExecute
EventExecute=function(id,flag)
 local offer=sceneItemOffers[JY.SubScene]
 if flag==1 and JY.Status==GAME_SMAP and offer and
    GetD(JY.SubScene,id,3)==offer.event and
    (offer.talk==nil or GetD(JY.SubScene,id,2)==offer.talk) and quantity(offer.item)>0 then
  local x=JY.Base['人X1']+CC.DirectX[JY.Base['人方向']+1]
  local y=JY.Base['人Y1']+CC.DirectY[JY.Base['人方向']+1]
  if GetS(JY.SubScene,x,y,3)==id then
   local choices={{offer.label,nil,1},{'照常交谈',nil,1}}
   local n=ShowMenu(choices,2,2,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_ORANGE)
   if n==1 then UseThing(offer.item);return end
   if n~=2 then return end
  end
 end
 return sourceSceneItemEvent(id,flag)
end
-- SCENE_KNIFE_OFFER_END
-- ITEM_EVENT_OFFER_BEGIN
-- 原版许多关节要「对人／物使用某件剧情物品」才推进（塞银两给店小二、智慧果向南贤换线索、钥匙开门、梅庄四宝……），
-- 新手看不出来。交谈、察看时，若对方的物品事件正等着你身上有的东西，就像上面的专门选单一样直接给出选项；
-- 选了照旧走原物品事件（含消耗、对白、奖励），也仍可从行囊使用。表由原版事件脚本的 instruct_4 整理：物品事件号 → 物品。
do
 local itemEvents={[10]={133},[16]={160},[32]={137},[41]={158},[53]={135},[61]={190},[65]={191},[71]={181},[181]={193},[234]={174},[238]={194},[241]={126},[242]={127},[248]={180},[253]={179},[258]={178},[264]={177},[279]={161},[317]={125},[335]={136},[342]={132},[350]={132},[396]={134},[407]={124},[426]={184},[462]={176},[493]={130},[496]={166},[531]={183},[555]={128},[560]={37},[564]={195},[573]={131},[592]={174},[598]={162},[603]={160},[604]={160},[622]={159},[647]={187},[648]={187},[649]={188},[650]={188},[666]={174},[680]={163},[681]={163},[685]={164},[686]={143},[701]={186},[702]={186},[703]={186},[704]={186},[705]={186},[706]={186},[707]={186},[708]={186},[709]={186},[710]={186},[711]={186},[712]={186},[713]={186},[714]={186},[715]={186},[716]={186},[717]={186},[718]={186},[719]={186},[720]={186},[721]={186},[722]={186},[723]={186},[724]={186},[725]={186},[726]={186},[727]={186},[728]={186},[729]={186},[730]={186},[731]={186},[732]={186},[733]={186},[734]={186},[735]={186},[736]={186},[737]={186},[738]={186},[739]={186},[740]={186},[741]={186},[742]={186},[743]={186},[744]={186},[745]={186},[746]={186},[747]={186},[748]={186},[749]={186},[750]={186},[751]={186},[752]={186},[753]={186},[754]={186},[755]={186},[756]={186},[757]={186},[758]={186},[759]={186},[760]={186},[761]={186},[762]={186},[763]={186},[764]={186},[765]={186},[766]={186},[767]={186},[768]={186},[769]={186},[770]={186},[771]={186},[772]={186},[773]={186},[774]={186},[775]={186},[776]={186},[777]={186},[778]={186},[779]={186},[780]={186},[781]={186},[782]={186},[783]={186},[784]={186},[785]={186},[786]={186},[787]={186},[788]={186},[789]={186},[790]={186},[791]={186},[792]={186},[793]={186},[794]={186},[795]={186},[796]={186},[797]={186},[798]={186},[799]={186},[800]={186},[830]={170},[831]={169},[914]={165},[935]={189},[942]={168},[943]={167},[1001]={144},[1002]={145},[1003]={146},[1004]={147},[1005]={148},[1006]={149},[1007]={150},[1008]={151},[1009]={152},[1010]={153},[1011]={154},[1012]={155},[1013]={156},[1014]={157}}
 local offerLabels={[186]='奉上一颗智慧果，请教线索'}
 local eventOfferLabels={[666]='打点茶钱 · 1两',[234]='买一壶烧刀子 · 10两',[592]='购买无量山消息 · 100两',[496]='用紫钥匙开锁',[564]='用铁铲挖掘'}
 local innerExecute=EventExecute
 EventExecute=function(id,flag)
  if flag==1 and JY.Status==GAME_SMAP then
   local event=GetD(JY.SubScene,id,3);local want=itemEvents[event];local offer=sceneItemOffers[JY.SubScene]
   if want and not(offer and offer.event==event) then
    local x=JY.Base['人X1']+CC.DirectX[JY.Base['人方向']+1]
    local y=JY.Base['人Y1']+CC.DirectY[JY.Base['人方向']+1]
    if GetS(JY.SubScene,x,y,3)==id then
     local choices,items={},{}
     for _,item in ipairs(want) do
      if quantity(item)>0 then items[#items+1]=item;choices[#choices+1]={eventOfferLabels[event] or offerLabels[item] or ('拿出'..JY.Thing[item]['名称']),nil,1} end
     end
     if #items>0 then
      choices[#choices+1]={event==496 and '查看箱锁' or event==564 and '查看碑文' or '照常交谈',nil,1}
      local n=ShowMenu(choices,#choices,#choices,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_ORANGE)
      if n>=1 and n<=#items then UseThing(items[n]);return end
      if n~=#choices then return end
     end
    end
   end
  end
  return innerExecute(id,flag)
 end
end
-- ITEM_EVENT_OFFER_END
-- DOORWAY_TWO_TILE_BEGIN
-- Tom 2026-09-27：单格门口难踩中。原版只认门外那一格出口；这 25 处门洞本身是一格宽的死胡同
-- （除出口外只连着门内一格），从门内走一步踏进门洞就当出门，门口便有两格可出。
-- 进场落点、事件瞬移不算（须是相邻一步）；门洞上有待触发的路过事件时让给事件；门洞若被剧情改成可旁通则不生效。
-- 表：场景 → {门洞X,门洞Y,出口X,出口Y}，由 allsin/alldef 原版数据算出。
do
 local doorways={[5]={17,48,17,49},[6]={20,38,20,39},[11]={29,48,29,49},[15]={35,26,36,26},[17]={19,19,19,20},[21]={56,25,57,25},[23]={48,36,49,36},[29]={55,28,56,28},[30]={25,43,25,44},[32]={27,45,27,46},[35]={21,46,21,47},[36]={29,44,29,45},[37]={43,26,44,26},[38]={55,36,56,36},[45]={25,42,25,43},[47]={36,43,36,44},[52]={55,28,56,28},[54]={45,31,46,31},[56]={46,28,47,28},[70]={44,29,45,29},[72]={21,46,21,47},[73]={49,24,50,24},[77]={48,36,49,36},[78]={26,35,26,36},[81]={54,28,54,27}}
 local sceneCycle=Game_SMap
 Game_SMap=function(...)
  local sid,x0,y0=JY.SubScene,JY.Base['人X1'],JY.Base['人Y1']
  local result=table.pack(sceneCycle(...))
  local d=doorways[sid]
  if d and JY.Status==GAME_SMAP and JY.SubScene==sid then
   local ax,ay,ex,ey=d[1],d[2],d[3],d[4]
   local sc=JY.Scene[sid]
   if JY.Base['人X1']==ax and JY.Base['人Y1']==ay and math.abs(x0-ax)+math.abs(y0-ay)==1 and
      ((sc['出口X1']==ex and sc['出口Y1']==ey) or (sc['出口X2']==ex and sc['出口Y2']==ey) or (sc['出口X3']==ex and sc['出口Y3']==ey)) then
    local open=0
    for i=1,4 do
     local nx,ny=ax+CC.DirectX[i],ay+CC.DirectY[i]
     if not(nx==ex and ny==ey) and SceneCanPass(nx,ny) then open=open+1 end
    end
    local e=GetS(sid,ax,ay,3)
    if open<=1 and not(e>=0 and GetD(sid,e,4)>0) and SceneCanPass(ex,ey) then
     -- 下一轮原版 Game_SMap 在出口格上照常出门（音乐、淡出、回大地图位置都不变）。
     JY.Base['人X1'],JY.Base['人Y1']=ex,ey
    end
   end
  end
  return table.unpack(result,1,result.n)
 end
end
-- DOORWAY_TWO_TILE_END

-- A newly loaded adventure does not inherit the previous save's last attack.
local sourceLoadRecordUI=LoadRecord
LoadRecord=function(...) lastAction={};BrowserRepeatSlot=false;return sourceLoadRecordUI(...) end
local sourceNewGameUI=NewGame
NewGame=function(...) lastAction={};BrowserRepeatSlot=false;return sourceNewGameUI(...) end

-- Restore the source healer/patient captions without changing its care rules.
local careContext=nil
local careText={
 doctor={
  {title='谁来施展医术',detail='先选施术者，再选需要疗伤的同伴。'},
  {title='为谁疗伤',detail='点选同伴后开始疗伤。'},
 },
 poison={
  {title='谁来解毒',detail='先选擅长解毒的同伴，再选中毒者。'},
  {title='为谁解毒',detail='点选同伴后开始解毒。'},
 },
}
BrowserCareMenuInfo=function(items)
 if not careContext then return nil end
 careContext.stage=careContext.stage+1
 local kind,stage=careContext.kind,careContext.stage
 local text=careText[kind][stage]
 if not text then return nil end
 local labels={}
 for slot=1,CC.TeamNum do
  if items[slot] and items[slot][3]>0 then
   local p=JY.Person[JY.Base['队伍'..slot]]
   local name=p['姓名']
   if stage==1 then
    local field=kind=='doctor' and '医疗能力' or '解毒能力'
    labels[slot]=string.format('%s · %s %d',name,kind=='doctor' and '医术' or '解毒',p[field])
   elseif kind=='doctor' then
    labels[slot]=string.format('%s · 气血 %d/%d · 伤势 %d',name,p['生命'],p['生命最大值'],p['受伤程度'])
   else
    labels[slot]=string.format('%s · 中毒 %d',name,p['中毒程度'])
   end
  end
 end
 return {title=text.title,detail=text.detail,labels=labels}
end
local function withCareMenu(kind,original)
 return function(...)
  local previous=careContext
  careContext={kind=kind,stage=0}
  local result=table.pack(pcall(original,...))
  careContext=previous
  if not result[1] then error(result[2],0) end
  return table.unpack(result,2,result.n)
 end
end
if type(Menu_Doctor)=='function' and type(Menu_DecPoison)=='function' then
 Menu_Doctor=withCareMenu('doctor',Menu_Doctor)
 Menu_DecPoison=withCareMenu('poison',Menu_DecPoison)
end

-- Out-of-battle care: show the patient's real before/after numbers instead of the
-- source '生命增加 N' / '中毒程度减少 N'. Source algorithms, Rnd calls and stamina
-- costs are untouched; battle callers (careContext==nil) pass straight through.
if type(ExecDoctor)=='function' and type(ExecDecPoison)=='function' then
 local sourceExecDoctor=ExecDoctor
 ExecDoctor=function(id1,id2)
  if not careContext or careContext.kind~='doctor' then return sourceExecDoctor(id1,id2) end
  local p=JY.Person[id2]
  local hp,hurt=p['生命'],p['受伤程度']
  local result=table.pack(sourceExecDoctor(id1,id2))
  local text
  if p['生命']==hp and p['受伤程度']==hurt then
   if hp>=p['生命最大值'] and hurt<=0 then
    text=p['姓名']..'\n气血已足，伤势已平。'
   else
    text=string.format('%s\n气血 %d/%d · 伤势 %d\n此番疗伤未见起色。',p['姓名'],hp,p['生命最大值'],hurt)
   end
  else
   text=string.format('%s\n气血 %d→%d/%d\n伤势 %d→%d',p['姓名'],hp,p['生命'],p['生命最大值'],hurt,p['受伤程度'])
   if p['受伤程度']>0 then text=text..' · 伤势未愈' end
  end
  careContext.result=text
  return table.unpack(result,1,result.n)
 end
 local sourceExecDecPoison=ExecDecPoison
 ExecDecPoison=function(id1,id2)
  if not careContext or careContext.kind~='poison' then return sourceExecDecPoison(id1,id2) end
  local p=JY.Person[id2]
  local poison=p['中毒程度']
  local result=table.pack(sourceExecDecPoison(id1,id2))
  local text
  if poison<=0 then text=string.format('%s 未中毒',p['姓名'])
  elseif p['中毒程度']==poison then text=string.format('%s 中毒 %d · 本次解毒无效',p['姓名'],poison)
  elseif p['中毒程度']>0 then text=string.format('%s\n中毒 %d→%d · 余毒尚存 %d',p['姓名'],poison,p['中毒程度'],p['中毒程度'])
  else text=string.format('%s\n中毒 %d→0 · 毒已清',p['姓名'],poison) end
  careContext.result=text
  return table.unpack(result,1,result.n)
 end
 -- Only the next notice inside the active care menu is replaced; the source menu
 -- calls DrawStrBoxWaitKey exactly once right after Exec*, so that is the result line.
 local sourceCareNotice=DrawStrBoxWaitKey
 DrawStrBoxWaitKey=function(s,...)
  if careContext and careContext.result then s=careContext.result;careContext.result=nil end
  return sourceCareNotice(s,...)
 end
end

-- 155b battle roster picker. The source WarSelectTeam menu used to appear under the
-- generic 江湖行止 heading. While that function runs, its menu is described through
-- the existing care channel of ShowMenu (title, detail, per-row labels, kicker);
-- the source rows, callbacks, toggling and the returned index are untouched.
-- WAR.SelectPerson: 0 not chosen, 1 required by this battle, 2 chosen by the player.
do
 local roster=nil
 local function describe(info)
  local chosen,labels=0,{}
  for slot=1,CC.TeamNum do
   local pid=JY.Base['队伍'..slot]
   if pid and pid>=0 then
    local p=JY.Person[pid];local state=WAR.SelectPerson[slot] or 0
    if state>0 then chosen=chosen+1 end
    labels[slot]=string.format('%s%s · 气血 %d/%d',state==1 and '【必战】' or state>0 and '【出战】' or '〔待命〕',p['姓名'],p['生命'],p['生命最大值'])
   end
  end
  labels[CC.TeamNum+1]='出战'
  info.title='选择出战 · 已选 '..chosen..' 人'
  info.detail=(roster and roster.opened>1 and chosen==0) and '至少选一人才能出战。点名字勾选，选好后点“出战”。' or '点名字勾选或取消，选好后点“出战”。标“必战”的同伴由本场剧情指定。'
  info.kicker='战前点将';info.labels=labels
  return info
 end
 local sourceSelectTeam=WarSelectTeam
 WarSelectTeam=function(...)
  local previous=roster;roster={opened=0}
  local result=table.pack(pcall(sourceSelectTeam,...));roster=previous
  if not result[1] then error(result[2],0) end
  return table.unpack(result,2,result.n)
 end
 -- The same table is sent again after every toggle, so refresh it in place.
 local sourceSelectMenu=WarSelectMenu
 WarSelectMenu=function(...)
  local result=table.pack(sourceSelectMenu(...))
  if roster and roster.info then describe(roster.info) end
  return table.unpack(result,1,result.n)
 end
 local sourceCareInfo=BrowserCareMenuInfo
 BrowserCareMenuInfo=function(items)
  local last=items and items[CC.TeamNum+1]
  if roster and last and last[2]==nil and items[1] and items[1][2]==WarSelectMenu then
   roster.opened=roster.opened+1;roster.info=describe({})
   return roster.info
  end
  return sourceCareInfo(items)
 end
end

-- 155b: once a battle is decided nobody is "fighting automatically" any more. The
-- source leaves WAR.AutoFight at 1 through the victory and experience notices, which
-- kept the 接回手动 button on screen; nothing reads the flag after the loop ends.
do
 local sourceIsEnd=War_isEnd
 War_isEnd=function(...)
  local status=sourceIsEnd(...)
  if status~=0 then WAR.AutoFight=0 end
  return status
 end
end

-- Ask once when the player starts Auto; retain the original full-auto option.
-- Refusing consumables still allows the source rest, attack and self-care AI.
local autoPreserveDrug=false
-- 155b frugal healing for OUR units under 自动·允许用药 (enemy AI, manual use and the
-- inner-force/stamina/antidote choices stay in the source functions):
--  * above half health no healing medicine is taken, which also stops the source
--    "injury over 50" branch from spending a +150 potion on a small gap;
--  * a medicine is only considered when at least two thirds of what it would restore
--    is really missing. What it restores follows the source formula (加生命 minus half
--    the injury) and cannot exceed the unit's full health, so a full-restore salve is
--    kept until the unit is down to a third;
--  * among those, the largest one that does not overshoot wins (no waste, most health
--    per turn); if every one overshoots, the smallest.
-- The source picked "the smallest medicine that fills the bar, else the largest". In the
-- 155b source-execution battles this rule keeps allies-down level with that behaviour; a
-- strict never-overshoot rule saved 10-38% potions but cost 0.2-1.2 more allies down per
-- large battle (reviews/ui155b-auto-drug-sim.md). First-cut thresholds, for Tom to confirm.
-- 155d/155e: alone on our side (forced duels, 武道大会, 圣堂) a loss is usually death. 实玩 the frugal rule let the
-- protagonist fall to 郭靖 with thirteen full-restore salves unused (one blow took about half the bar, and the pick
-- preferred smaller potions); a flat 60% line fixed that fight but drank twice as much and lost 圣堂 in both source
-- runs and 实玩 (reviews/combat155e-solo-drug.md). With a single living ally now: medicine only when the next exchange
-- could drop the unit, i.e. health <= max(1/3 of the bar, 1.15 x the larger of its last two losses between its own
-- Auto turns), and the medicine that restores the most (ties: the smaller one). Group battles keep the frugal rule.
local SOLO_FLOOR,SOLO_MARGIN=1/3,1.15
local function aloneOnOurSide()
 if not WAR or not WAR.PersonNum then return false end
 local n=0
 for i=0,WAR.PersonNum-1 do local q=WAR.Person[i];if q and q['我方']==true and not q['死亡'] then n=n+1 end end
 return n==1
end
local soloSeen={}                          -- per battle: life lost between a unit's own Auto turns (reset in WarSetGlobal)
local function soloLine(pid,full)
 local s=pid and soloSeen[pid];local d=s and math.max(s.l1 or 0,s.l2 or 0)*SOLO_MARGIN or 0
 return math.max(full*SOLO_FLOOR,d)
end
local function healLine(full,pid)return aloneOnOurSide() and soloLine(pid,full) or full/2 end
local function frugalHealingDrug(pid)
 local p=JY.Person[pid];local life,full=p['生命'],p['生命最大值']
 local solo=aloneOnOurSide()
 if full<=0 or life>(solo and soloLine(pid,full) or full/2) then return nil end
 local lost=full-life;local dull=math.modf((p['受伤程度'] or 0)/2)
 local fit,fitGain,least,leastGain,best,bestEff,bestGain
 for i=1,CC.MyThingNum do
  local id=JY.Base['物品'..i]
  local t=id and id>=0 and (JY.Base['物品数量'..i] or 0)>0 and JY.Thing[id] or nil
  if t and t['类型']==3 and (t['加生命'] or 0)>0 then
   local gain=math.min(full,math.max(5,t['加生命']-dull))
   if solo then
    local eff=math.min(gain,lost)
    if not bestEff or eff>bestEff or eff==bestEff and gain<bestGain then best,bestEff,bestGain=id,eff,gain end
   elseif lost*3>=gain*2 then
    if gain<=lost then
     if not fitGain or gain>fitGain then fit,fitGain=id,gain end
    elseif not leastGain or gain<leastGain then least,leastGain=id,gain end
   end
  end
 end
 if solo then return best end
 return fit or least
end
do
 local sourceAutoTurn=War_Auto
 War_Auto=function(...)
  local q=WAR.Person[WAR.CurID];local pid=q and q['我方']==true and q['人物编号']
  if pid then local s=soloSeen[pid];local life=JY.Person[pid]['生命'];if s and s.after and s.after>life then s.l2=s.l1;s.l1=s.after-life end end
  local r=table.pack(sourceAutoTurn(...))
  if pid then local s=soloSeen[pid] or {};soloSeen[pid]=s;s.after=JY.Person[pid]['生命'] end
  return table.unpack(r,1,r.n)
 end
end
local sourceThinkDrug=War_ThinkDrug
War_ThinkDrug=function(flag)
 local q=WAR.Person[WAR.CurID]
 if WAR.AutoFight==1 and q and q['我方']==true then
  if autoPreserveDrug then return -1 end
  if flag==2 and not frugalHealingDrug(q['人物编号']) then return -1 end
 end
 return sourceThinkDrug(flag)
end
local sourceAutoEatDrug=War_AutoEatDrug
War_AutoEatDrug=function(flag)
 local q=WAR.Person[WAR.CurID]
 if flag~=2 or WAR.AutoFight~=1 or not q or q['我方']~=true then return sourceAutoEatDrug(flag) end
 -- Same settlement as the source tail: real effect first, then one item leaves the bag.
 local pid=q['人物编号'];local id=frugalHealingDrug(pid)
 if id and UseThingEffect(id,pid)==1 then instruct_32(id,-1) end
 lib.Delay(500)
end
local sourceSetWarGlobal=WarSetGlobal
WarSetGlobal=function(...)
 autoPreserveDrug=false;soloSeen={}
 return sourceSetWarGlobal(...)
end
local sourceAutoMenu=War_AutoMenu
War_AutoMenu=function(...)
 local rows={{'自动 · 保留药品',nil,1},{'自动 · 允许用药',nil,1}}
 -- esc=1 supplies the browser's single Return button as well as Escape.
 local choice=ShowMenu(rows,2,2,0,0,0,0,0,1,0,0,0)
 if choice==1 then autoPreserveDrug=true
 elseif choice==2 then autoPreserveDrug=false
 else return 0 end
 return sourceAutoMenu(...)
end

-- An ally explicitly allowed to use supplies should not gamble on the
-- source's 25% healing roll at half health. Keep its drug selection, cost,
-- low-stamina priority, and all enemy/manual decisions in the source path.
do
 local sourceThink=War_Think
 War_Think=function(...)
  local q=WAR.Person[WAR.CurID]
  local p=q and JY.Person[q['人物编号']]
  if WAR.AutoFight==1 and not autoPreserveDrug and q and q['我方']==true and
     not q['死亡'] and p and p['生命']>0 and p['生命最大值']>0 and
     p['生命']<=healLine(p['生命最大值'],q['人物编号']) and p['体力']>=10 then
   local choice=War_ThinkDrug(2)
   if choice==2 then return choice end
  end
  local r=sourceThink(...)
  -- 358 起（重制规则，原版亦会前压）：武学常识>80 的我方活人让全队攻防都受益（War_WugongHurtLife 按活人计）。
  -- 自动时这样的队友（非主角、非独自一人、成长模式）若除普通攻擊(90)外没有能用的伤害武学，原版会让它走向敌阵用
  -- 普通攻擊，随即被击倒；改走原版的休息分支（War_Auto：War_AutoEscape 后 War_RestMenu），保持距离。学会真正能用的
  -- 伤害武学后照常出招；手动、敌方、经典模式、用药与其他结果不变。
  if r==1 and WAR.AutoFight==1 and q and q['我方']==true and p and q['人物编号']~=0
     and (p['武学常识'] or 0)>80 and not aloneOnOurSide() then
   local balanced=rawget(_G,'BrowserBalanceEnabled')
   if balanced and balanced() then
    local usable=rawget(_G,'BrowserCanUseTechnique')
    for i=1,10 do
     local id=p['武功'..i];local w=id and id>0 and JY.Wugong[id]
     if w and id~=90 and w['伤害类型']==0 and w['消耗内力点数']<=p['内力最大值']
        and (not usable or usable(q['人物编号'],id)) then return r end
    end
    return 0
   end
  end
  return r
 end
end

-- Allied Auto keeps the source attack-position score, preferring fewer steps
-- on ties. Point/area scores in layer 4 are only 0/1 in the original engine;
-- do not call AutoCalMaxEnemy for their hypothetical cells: it ignores x/y.
local sourceAutoMove=War_AutoMove
War_AutoMove=function(slot)
 local unit=WAR.Person[WAR.CurID]
 if not unit or not unit['我方'] then return sourceAutoMove(slot) end
 local p=JY.Person[unit['人物编号']]
 local skill=p['武功'..slot]
 if not skill or skill<=0 or not JY.Wugong[skill] then return sourceAutoMove(slot) end
 local level=math.modf(p['武功等级'..slot]/100)+1
 local shape=JY.Wugong[skill]['攻击范围']
 local steps=unit['移动步数']
 local reachable=War_CalMoveStep(WAR.CurID,steps,0)
 War_AutoCalMaxEnemyMap(skill,level)
 local best,bx,by,used=0,nil,nil,nil
 for i=0,steps do
  local row=reachable[i]
  if not row or not row.num or row.num==0 then break end
  for j=1,row.num do
   local x,y=row.x[j],row.y[j]
   local hits=GetWarMap(x,y,4)
   if shape==1 and hits>0 then hits=War_AutoCalMaxEnemy(x,y,skill,level) end
   if hits>best then best,bx,by,used=hits,x,y,i end
  end
 end
 if best<=0 then return sourceAutoMove(slot) end
 if used==0 then return 1 end
 -- Enemy range calculations overwrite layer 3; movement needs our own paths.
 War_CalMoveStep(WAR.CurID,steps,0)
 War_MovePerson(bx,by)
 return 1
end

-- Shop presentation: the original transaction still owns money, stock and travel.
local shopContext=nil
BrowserShopMenuInfo=function(items,num)
 if shopContext==nil or num~=5 or JY.SubScene~=CC.ShopScene[shopContext].sceneid then return nil end
 local shop=JY.Shop[shopContext];local money=0;local rows={}
 for i=1,CC.MyThingNum do
  if JY.Base['物品'..i]==CC.MoneyID then money=JY.Base['物品数量'..i];break end
 end
 for i=1,5 do
  local id=shop['物品'..i];local count=shop['物品数量'..i];local price=shop['物品价格'..i]
  rows[#rows+1]={id=id,slot=i,name=JY.Thing[id]['名称'],num=count,price=price,
   disabled=count<=0 or price>money,details=BrowserItemDetails(id)}
 end
 return {items=rows,money=money}
end
local sourceShopUI=instruct_64
instruct_64=function(...)
 local previous=shopContext;shopContext=nil
 for i=0,JY.ShopNum-1 do if CC.ShopScene[i].sceneid==JY.SubScene then shopContext=i;break end end
 local result=table.pack(pcall(sourceShopUI,...));shopContext=previous
 if not result[1] then error(result[2],0) end
 return table.unpack(result,2,result.n)
end
end
