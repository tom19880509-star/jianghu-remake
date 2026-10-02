-- New-game cultivation; absence of a growth record leaves legacy and trial rules intact.
local makeGrowth=(function()
-- GROWTH_CORE
end)()
local growth,api=nil,nil
-- 395 S3：暂借作「影」的人物格可以不止一个（归途第二段两道影借 65/66）。按人物编号各记各的前程成长：
-- 值为该影的成长快照；false 表示此格正借作影、但这份快照没有成长记录——仍屏蔽这个编号本人的成长档
--（单影 BrowserEchoDuel 借 64 周伯通时靠这一条，不能让影借到周伯通自己的内功与成长）。
local echoes={}
local mingScope=nil
-- 155f D1 (reviews/journey155f-regression.md): no roots snapshot while NewGame runs; the HUD refresh during the
-- creation yield used to fix raw ranger stats before the chosen ones and the 旧梦留痕 bonus were written.
BrowserGrowthNewGameSetup=false            -- declared at load: the browser bridge rejects undeclared globals later
local function active(pid) return api~=nil and not BrowserGrowthNewGameSetup and echoes[pid]==nil and JY.Person[pid]~=nil end
local function team(pid)
 for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then return true end end
 return false
end
local function persist() if growth then browser_growth_save(growth) end end
-- An echo duel restores the native records, but absorption and battle growth
-- also write this separate cultivation table. Preserve it without replacing
-- the table captured by growth/practice closures. Ordinary battles never call
-- this checkpoint and retain their real progression and foreign-qi costs.
do
 local function copy(value)
  if type(value)~='table' then return value end
  local out={};for k,v in pairs(value) do out[k]=copy(v) end;return out
 end
 local function restore(target,saved)
  for k in pairs(target) do if saved[k]==nil then target[k]=nil end end
  for k,v in pairs(saved) do
   if type(v)=='table' and type(target[k])=='table' then restore(target[k],v)
   else target[k]=copy(v) end
  end
 end
 BrowserGrowthBattleCheckpoint=function()
  local current=growth;local saved=copy(current)
  return function()
   if current then restore(current,saved);persist() end
  end
 end
end
local function owned(book)
 for i=1,CC.MyThingNum do if JY.Base['物品'..i]==book and JY.Base['物品数量'..i]>0 then return true end end
 return false
end
do
local function settleLingbo()
 if api and type(GetD)=='function' and GetD(42,1,2)==485 and api.adoptLingbo(53) then persist();return true end
end
local sourceEvent=oldCallEvent
oldCallEvent=function(id,...)
 local result=table.pack(sourceEvent(id,...))
 if id==484 and settleLingbo() then
  DrawStrBoxWaitKey('段誉已领会北冥神功与凌波微步。已学本领会保留；想继续精进，可在人物武学页选择研习。')
 end
 return table.unpack(result,1,result.n)
end
local function installFamilySword()
 -- Supplemental definition only: keep the original R file offsets and count.
 -- Native rows use metatables, so copy the struct's fields explicitly.
 local sword={}
 for field in pairs(CC.Wugong_S) do sword[field]=JY.Wugong[31][field] end
 sword['代号']=93;sword['名称']='家传辟邪剑法'
 JY.Wugong[93]=sword
end
local loaded=LoadRecord
LoadRecord=function(id)
 -- Clear the previous rule before loading another original save.
 growth=nil;api=nil;echoes={};mingScope=nil
 if BrowserMartialBalance then BrowserMartialBalance.install(false)end
 local result=loaded(id)
 installFamilySword()
 growth=browser_growth_state()
 if BrowserMartialBalance then BrowserMartialBalance.install(growth~=nil)end
 if growth then
  api=makeGrowth{JY=JY,CC=CC,growth=growth,balance=BrowserMartialBalance}
  api.prepareLuohan(type(browser_journey_get)=='function' and browser_journey_get('luohanRevealed')==true)
  -- Recalculate existing records immediately on load; a fresh new game still
  -- snapshots only after the original randomisation has finished.
  if BrowserMartialBalance then for key in pairs(growth.persons)do local pid=tonumber(key);if JY.Person[pid]then api.apply(pid)end end end
  -- 157（Tom 2026-09-22）：九阳 92 已改纯内功，旧档里仍把它挂在武功栏的人在这里让出那一格。
  -- 迁移自带两道闸（成长记录里的九阳重数须 ≥ 栏里那一门的重数），不满足就整个人跳过，不会误删；
  -- 不调它也不会坏，只是人物页会多显示一门空壳招式，直到下一次进战斗或研习时才让格。
  if type(BrowserJiuyangMigrate)=='function' then BrowserJiuyangMigrate() end
 end
 settleLingbo()
 return result
end
end
do
local function seedYoungYang()
 -- Apply only to an untouched, never-adopted source NPC. An older player's
 -- learned arts, paid cultivation and reunion reward are never removed.
 local p=JY.Person[58]
 if not api or not p or growth.persons['58'] or p['武功1']~=57 or p['武功等级1']~=500 then return end
 local reunited=p['武功2']==24 and p['武功等级2']==0
 for i=reunited and 3 or 2,10 do if p['武功'..i]~=0 then return end end
 local arts={{57,800},{22,100},{39,100},{56,100},{87,100}}
 if reunited then arts[6]={24,0} end
 for i=1,10 do p['武功'..i]=arts[i] and arts[i][1] or 0;p['武功等级'..i]=arts[i] and arts[i][2] or 0 end
end
local sourceYangEvent=oldCallEvent
oldCallEvent=function(id,...)
 -- A first reunion without Yang in the travelling party still uses the same
 -- source NPC baseline before the original scripted grant adopts his record.
 if id==436 then seedYoungYang() end
 return sourceYangEvent(id,...)
end
local newGame=NewGame
NewGame=function(...)
 BrowserGrowthNewGameSetup=true
 local result=table.pack(newGame(...))
 BrowserGrowthNewGameSetup=false
 if api then
  -- Early cave encounter: heavy sword mastered, older arts usable. The palm
  -- remains the original reunion's later grant (event 436, either branch).
  seedYoungYang()
  -- Xie Xun's native second art is the lion's roar, not Zhang Wuji's Jiuyang.
  -- As with Yang Guo, only seed untouched new-game data before any ensure.
  local xx=JY.Person[13]
  if xx and not growth.persons['13'] and xx['武功1']==6 and xx['武功等级1']==900 and xx['武功2']==92 and xx['武功等级2']==900 then
   local pristine=true
   for i=3,10 do if xx['武功'..i]~=0 then pristine=false;break end end
   if pristine then xx['武功2']=91 end
  end
  -- The young Lin knows his family's forms, before receiving the full manual.
  -- Tom 2026-09-19：林平之开局即带家传辟邪剑法（93）＋华山剑法（37）；E289 自宫时辟邪 60 同槽取代家传
  -- （instruct_35 包裹见下），华山剑法保留。林平之彩蛋的「上华山」支在同一格升到十级。
  local lin=JY.Person[36]
  if lin and not growth.persons['36'] and lin['武功1']==31 and lin['武功等级1']==0 then
   local pristine=true
   for i=2,10 do if lin['武功'..i]~=0 then pristine=false;break end end
   if pristine then lin['武功1']=93;lin['性别']=0;lin['武功2']=37;lin['武功等级2']=0 end
  end
  -- Revised-edition Ding knows Xiaowuxiang. Rank 1 is a game starting value,
  -- not a claim about the novel. Only seed a fresh template; the saved record
  -- carries it afterwards. No selected internal art or extra native attributes.
  local ding=JY.Person[46]
  if ding and not growth.persons['46'] and ding['武功1']==17 and ding['武功等级1']==900 and ding['武功2']==27 and ding['武功等级2']==900 then
   local pristine=true
   for i=3,10 do if ding['武功'..i]~=0 then pristine=false;break end end
   if pristine then
    local m=api.ensure(46)
    m.learnedBooks['40']=1;m.taught['book:40']=true
   end
  end
  -- The rescuer leaves three ordinary healing pills in fresh new-growth starts.
  -- Keep item 2: its custom script revives fallen allies, rather than healing.
  -- LoadRecord never grants this supply to an existing save.
  local healingSlot,emptySlot
  for i=1,CC.MyThingNum do
   if JY.Base['物品'..i]==3 then healingSlot=i end
   if not emptySlot and JY.Base['物品'..i]<0 then emptySlot=i end
  end
  if healingSlot then JY.Base['物品数量'..healingSlot]=JY.Base['物品数量'..healingSlot]+3
  elseif emptySlot then JY.Base['物品'..emptySlot]=3;JY.Base['物品数量'..emptySlot]=3 end
  for i=1,CC.TeamNum do local pid=JY.Base['队伍'..i];if pid>=0 then api.ensure(pid) end end
  persist()
 end
 return table.unpack(result,1,result.n)
end
local joined=instruct_10
instruct_10=function(pid,...)
 local result=table.pack(joined(pid,...))
 if active(pid) and team(pid) then
  if pid==58 then seedYoungYang() end
  api.ensure(pid);persist()
 end
 return table.unpack(result,1,result.n)
end
end
-- 155b: a returning companion may put the gear of the last departure back on.
-- Leaving still hands weapon, armour, coat and boots to the shared bag. What was
-- worn is noted on the growth person record (leftGear, saved with the journey once
-- growth.js keeps the field). On rejoining, the pieces that are still in the bag and
-- worn by nobody are offered once; "yes" equips them through the ordinary equip
-- functions. Saves without a note, classic saves and trials are never asked.
do
 local function noteGear(pid)
  local p=JY.Person[pid];local gear={}
  if p['武器']>=0 then gear.weapon=p['武器'] end
  if p['防具']>=0 then gear.armor=p['防具'] end
  local worn=BrowserOutfitWorn and BrowserOutfitWorn(pid)
  if worn then gear.coat=worn.coat;gear.boots=worn.boots end
  return next(gear) and gear or nil
 end
 local leave=instruct_21
 instruct_21=function(pid,...)
  local travelling=active(pid) and team(pid)
  local gear=travelling and noteGear(pid) or nil
  local result=table.pack(leave(pid,...))
  if travelling and not team(pid) then api.ensure(pid).leftGear=gear;persist() end
  return table.unpack(result,1,result.n)
 end
 local function offers(pid,gear)
  local p=JY.Person[pid];local list={}
  if p['生命']<=0 then return list end
  for _,spec in ipairs({{'weapon','武器',0},{'armor','防具',1}})do
   local id=gear[spec[1]];local t=type(id)=='number' and JY.Thing[id] or nil
   if t and p[spec[2]]<0 and t['类型']==1 and t['装备类型']==spec[3] and t['使用人']<0 and owned(id) and CanUseThing(id,pid) then
    list[#list+1]={name=t['名称'],item=id}
   end
  end
  for _,slot in ipairs({'coat','boots'})do
   local id=gear[slot]
   if type(id)=='string' and BrowserOutfitRows and (slot~='coat' or p['防具']<0) then
    for _,row in ipairs(BrowserOutfitRows(pid,slot))do
     if row.artId==id and row.eligible and row.owner=='' then list[#list+1]={name=row.name,slot=slot,outfit=id} end
    end
   end
  end
  return list
 end
 local function wear(pid,piece)
  if piece.outfit then BrowserOutfitEquip(pid,piece.slot,'outfit:'..piece.outfit);return end
  local slot=0;for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then slot=i;break end end
  local select=SelectTeamMenu;SelectTeamMenu=function() return slot end
  local ok,err=pcall(UseThing_Type1,piece.item);SelectTeamMenu=select
  if not ok then error(err,0) end
 end
 local rejoin=instruct_10
 instruct_10=function(pid,...)
  local result=table.pack(rejoin(pid,...))
  local m=active(pid) and team(pid) and growth.persons[tostring(pid)] or nil
  local gear=m and m.leftGear
  if type(gear)=='table' then
   m.leftGear=nil                                   -- asked at most once per departure
   local list=offers(pid,gear)
   if #list>0 then
    local names={};for i,piece in ipairs(list)do names[i]=piece.name end
    if DrawStrBoxYesNo(-1,-1,'是否让'..JY.Person[pid]['姓名']..'重新配上'..table.concat(names,'、')..'？这是离队时交回行囊的行装。',C_WHITE,CC.DefaultFont) then
     for _,piece in ipairs(list)do wear(pid,piece) end
     if type(Cls)=='function' then Cls() end
    end
   end
   persist()
  end
  return table.unpack(result,1,result.n)
 end
end
local setSkill=instruct_35
instruct_35=function(pid,index,skill,level,...)
 -- Source event 115 resets this slot before the Ming Cult challenge. Preserve
 -- only the already-corrected new-campaign loadout; old saves stay untouched.
  if pid==13 and index==1 and skill==92 and level==900 and active(pid) and JY.Person[13]['武功2']==91 then skill=91 end
 -- Source event 289 supplies the missing transmission. Upgrade the same art
 -- without discarding actual practice or adding a second learned identity.
 if pid==36 and index==0 and skill==60 and level==100 and active(pid) and JY.Person[36]['武功1']==93 then
  level=math.max(level,JY.Person[36]['武功等级1'])
  local result=table.pack(setSkill(pid,index,skill,level,...))
  local m=growth.persons['36']
  if m then
   m.taught['skill:93']=nil;m.taught['skill:60']=true
   if m.signature==93 then m.signature=60 end
   if m.relearnPaid['93'] then
    m.relearnPaid['60']=(m.relearnPaid['60'] or 0)+m.relearnPaid['93'];m.relearnPaid['93']=nil
   end
   persist()
  end
  return table.unpack(result,1,result.n)
 end
  return setSkill(pid,index,skill,level,...)
end
-- Source event 115 grants six opponents extra HP before every challenge.
-- Failed attempts must not permanently strengthen the next attempt.
do
local function undoMingLife(scope)
 for pid,delta in pairs(scope.grants) do
  local p=JY.Person[pid]
  p['生命最大值']=p['生命最大值']-delta
  p['生命']=math.min(p['生命'],p['生命最大值'])
 end
 scope.grants={}
end
local sourceEvent=oldCallEvent
oldCallEvent=function(id,...)
 if id~=115 or not api then return sourceEvent(id,...) end
 local previous=mingScope
 local scope={grants={},tracking=true};mingScope=scope
 local result=table.pack(pcall(sourceEvent,id,...))
 if not result[1] and not scope.won then undoMingLife(scope) end
 mingScope=previous
 if not result[1] then error(result[2],0) end
 return table.unpack(result,2,result.n)
end
local addLife=instruct_48
instruct_48=function(pid,value,...)
 local scope=mingScope
 local p=scope and scope.tracking and pid>=10 and pid<=15 and value==200 and JY.Person[pid] or nil
 local before=p and p['生命最大值']
 local result=table.pack(addLife(pid,value,...))
 if p then
  -- Record the actual grant: e.g. 850 -> 999 adds 149, not 200.
  local delta=p['生命最大值']-before
  if delta>0 then scope.grants[pid]=(scope.grants[pid] or 0)+delta end
 end
 return table.unpack(result,1,result.n)
end
local sourceWar=instruct_6
instruct_6=function(warid,...)
 local scope=mingScope
 if not scope or not scope.tracking or warid~=15 then return sourceWar(warid,...) end
 scope.tracking=false
 local result=table.pack(sourceWar(warid,...))
 -- Match the source event's exact failure condition; preserve all return values.
 scope.won=result[1]~=false
 if not scope.won then undoMingLife(scope) end
 return table.unpack(result,1,result.n)
end
end
local saveRecord=SaveRecord
SaveRecord=function(...)
 persist();return saveRecord(...)
end
local addAttribute=AddPersonAttrib
AddPersonAttrib=function(pid,field,value)
 if active(pid) and value~=0 then
  local actual=api.addBase(pid,field,value)
  if actual~=nil then
   persist();return actual,actual==0 and '' or string.format('%s %s %d',field,actual>0 and '增加' or '减少',math.abs(actual))
  end
 end
 return addAttribute(pid,field,value)
end
local setNature=instruct_49
instruct_49=function(pid,value)
 local result=setNature(pid,value);if active(pid) then api.ensure(pid).nature=value;api.apply(pid);persist() end;return result
end
BrowserGrowthBookRequirements=function(pid,book) return active(pid) and api.validBook(book) and api.requirements(pid,book) or nil end
BrowserGrowthStudyReason=function(pid,book) return active(pid) and api.validBook(book) and api.reason(pid,book) or '' end
local originalCanUse=CanUseThing
local function canUse(book,pid)
 local t=JY.Thing[book]
 local profile=BrowserMartialBalance and BrowserMartialBalance.data.books[book]
 -- 155: a companion's single-art aptitude pointer (段誉 → 凌波微步 50) lowers only this gate.
 local eased=active(pid) and BrowserAffinityAptitude and BrowserAffinityAptitude(pid,book)
 -- 156 首批：折算后的秘籍门槛。JY.Thing 的字段直写存档字节（SaveRecord 会把 JY.Data_Thing 落盘），
 -- 所以只能临时改、算完立刻原样还回去，绝不能像 balance-core 换 JY.Wugong 那样永久赋值。
 -- 156：门槛是这本书的属性，不是某个人的成长记录，所以按 api 是否装上判断，而不是 active(pid)——
 -- 否则界面（BrowserItemDetails 无条件套用）与判定会对不上（gate parity）。
 local gates=api~=nil and profile and profile.gates
 -- 门槛只拦零级入门：已入门者不再受门类根骨那几项限制，免得旧成长档被卡在半途（调整表本意是不拦精修）。
 if gates and JY.Person[pid] and api.rank(pid,book)>0 then
  local entryOnly={}
  for field,v in pairs(gates) do
   if field~='需拳掌功夫' and field~='需御剑能力' and field~='需耍刀技巧' and field~='需特殊兵器' then entryOnly[field]=v end
  end
  gates=next(entryOnly) and entryOnly or nil
 end
 if not (gates or active(pid) and (profile and profile.removeAptitude or eased)) then return originalCanUse(book,pid)end
 local saved={}
 if gates then for field,v in pairs(gates) do saved[field]=t[field];t[field]=v end end
 local old=t['需资质']
 if profile and profile.removeAptitude or eased then
  t['需资质']=profile and profile.removeAptitude and 0 or math.min(old,eased)
 end
 local result=table.pack(pcall(originalCanUse,book,pid))
 t['需资质']=old;for field,v in pairs(saved) do t[field]=v end
 if not result[1]then error(result[2],0)end;return table.unpack(result,2,result.n)
end
CanUseThing=function(book,pid)
 if not canUse(book,pid) then return false end
 return not active(pid) or not api.validBook(book) or api.reason(pid,book)==''
end
local needExp=TrainNeedExp
TrainNeedExp=function(pid)
 local book=JY.Person[pid]['修炼物品']
 if active(pid) and book>=0 and api.validBook(book) and not api.craft(book) then return api.cost(pid,book) end
 return needExp(pid)
end
local trainBook=War_PersonTrainBook
War_PersonTrainBook=function(pid)
 local p=JY.Person[pid];local book=p['修炼物品']
 if not active(pid) or book<0 or not api.validBook(book) or api.craft(book) then return trainBook(pid) end
 if not team(pid) or not owned(book) or JY.Thing[book]['使用人']~=pid or not CanUseThing(book,pid) then return end
 local ok,cost=api.train(pid,book)
 if ok then persist();DrawStrBoxWaitKey(p['姓名']..'研习'..api.bookName(pid,book)..'至'..api.rank(pid,book)..api.rankUnit(book)..'，耗费'..cost..'点心得。') end
end
BrowserGrowthCanLearn=function(pid,skill)
 return not active(pid) or api.canLearnSkill(pid,skill) and not api.mustPayForGrant(pid,skill)
end
BrowserGrowthRecordTaught=function(pid,skill)
 if active(pid) then api.recordTaught(pid,'skill:'..skill);api.apply(pid);persist() end
end
BrowserGrowthNeedsRelearn=function(pid,skill) return active(pid) and api.mustPayForGrant(pid,skill) end
BrowserGrowthEnabled=function(pid) return active(pid) end
-- Selected-art forgetting, protagonist only. Per-cycle once and NPC-location checks
-- belong to the dedicated NPC layer; no extra flags are kept here.
local function dispersalAllowed(pid) return pid==0 and active(pid) and team(pid) end
BrowserGrowthDispersalInfo=function(pid,identity) return dispersalAllowed(pid) and api.dispersalInfo(pid,identity) or nil end
BrowserGrowthDisperse=function(pid,identity)
 if not dispersalAllowed(pid) then return false end
 local ok,info=api.disperse(pid,identity);if not ok then return false end
 if BrowserClearSkillUse then for _,s in ipairs(info.skills) do if s.skill then BrowserClearSkillUse(pid,s.skill) end end end
 persist();return true,info
end
local function skillName(id) return id>0 and JY.Wugong[id]['名称'] or '未选定' end
local function bookName(id,pid,study) return api.bookName(pid,id,study) end
local function menu(rows) return ShowMenu(rows,#rows,0,0,0,0,0,1,1,24,0,0) end
local function confirm(text) return DrawStrBoxYesNo(-1,-1,text,C_WHITE,CC.DefaultFont) end
BrowserGrowthBookName=function(pid,book,study) return active(pid) and api.bookName(pid,book,study) or nil end
BrowserGrowthStudyRank=function(pid,book) return active(pid) and api.validBook(book) and api.studyRank(pid,book) or nil end
BrowserGrowthRankInfo=function(pid,book)
 if not active(pid) or not api.validBook(book) then return nil end
 return {maxRank=api.maxRank(book),rankUnit=api.rankUnit(book)}
end
BrowserGrowthSkillRank=function(pid,skill)
 local echo=echoes[pid]
 if echo~=nil then
  local p=JY.Person[pid];if not p then return 0 end
  for i=1,10 do if p['武功'..i]==skill then
   local rank=math.min(10,math.floor(p['武功等级'..i]/100)+1)
   return rank==10 and skill==18 and echo and echo.extraRanks and echo.extraRanks['18'] or rank
  end end
  return 0
 end
 return active(pid) and api.attackRank(pid,skill) or 0
end
BrowserGrowthSkillInfo=function(pid,skill)
 if not active(pid) and not BrowserGrowthIsEcho(pid) or not BrowserMartialBalance then return nil end
 local profile=BrowserMartialBalance.data.skills[skill]
 if not profile or not profile.maxRank then return nil end
 local rank=BrowserGrowthSkillRank(pid,skill);local step=JY.Wugong[skill]['消耗内力点数']
 if rank>10 then
  local cfg=BrowserGrowthBattleConfig(pid)
  -- 157：末三层威力 612→900（+47%）而耗内原本只 +1/层（+17.6%），结果是「越练越划算」，与「代价换威力」相反。
  -- 改成 +2/层（十一 19／十二 21／十三 23，一击 95/105/115），每点内力从 9.0 拉回 7.8，与十层的 7.2 接近。
  step=math.max(2,profile.mpStep+(rank-10)*2-(cfg and math.floor((BrowserHeartRank and BrowserHeartRank(cfg,40) or cfg.internal==40 and cfg.internalRank or 0)/5) or 0))
 end
 return {rank=rank,maxRank=profile.maxRank,rankUnit=profile.rankUnit,power=profile.power[rank],cost=math.floor((math.min(rank,10)+1)/2)*step}
end
BrowserGrowthStudyCredit=function(pid,book) return active(pid) and api.studyCredit(pid,book) or 0 end
BrowserGrowthStudyPreview=function(pid)
 local book=JY.Person[pid]['修炼物品'];if book<0 or not api.validBook(book) or api.craft(book) then return '' end
 if book==41 and BrowserMartialBalance then
  local transition=api.luohanTransition(pid);local credit=api.studyCredit(pid,41)
  return bookName(41,pid,true)..'：'..(transition and (api.rank(pid,41)>0 and '下一次研习将转入内层一重，原外层境界由内层替代；若正在主运，内力贡献会按新境界重算。' or '下一次研习将从内层一重入门，练成后须选为主运才能发挥心法功效。') or '按当前境界精修。')..(credit>0 and ('原有投入尚可抵扣本门'..credit..'点；本次还需'..api.cost(pid,41)..'点心得。') or '')
 end
 return bookName(book,pid,true)..'：上限'..api.maxRank(book)..api.rankUnit(book)..'。'..(api.rank(pid,book)==0 and ('初学预计'..api.entryRank(pid,book)..api.rankUnit(book)..'，旁通不计为付费投入。') or '精修按当前境界付费。')
end
BrowserLuohanState=function()return api and growth.luohan end
BrowserLuohanReady=function(pid)
 if not api or not BrowserMartialBalance then return false end
 local l=growth.luohan
 return l and not l.revealed and (l.first==pid or l.legacy and l.first==-1) and not api.luohanInner(pid) and api.rank(pid,41)>=10
end
BrowserLuohanReveal=function(pid)
 if not api then return false end
 local ok,reward=api.luohanReveal(pid)
 if ok then persist();browser_luohan_reveal() end
 return ok,reward
end
BrowserGrowthForeignQi=function(pid)
 -- 395：与 BattleConfig 同一读口径——false 哨兵（借作影、无快照）屏蔽本人成长档，异气读 0，不退回真人的异气。
 local m=echoes[pid];if m==nil then m=growth and growth.persons[tostring(pid)] elseif m==false then m=nil end
 return m and m.qi and m.qi.foreign or 0
end
BrowserGrowthCommitQi=function(pid,value)
 if not active(pid) or not team(pid) then return end
 local q=api.qi(pid);local before=q.foreign
 q.foreign=math.max(0,math.min(100,value))
 -- 156 审查：由外部一次清零也是真正的化解，与 relieveQi 同口径记下，免得异气再涨就能再领一次奖励。
 if before>0 and q.foreign==0 then q.healed=true end
 persist()
end
BrowserYijinRoad=function()
 if not api or browser_journey_get and browser_journey_get('trial')==true then return nil end
 if not growth.yijinRoad then growth.yijinRoad={entrusted='pending',wounded='pending'} end
 return growth.yijinRoad
end
BrowserYijinDeed=function(kind,value)
 local road=BrowserYijinRoad();if not road then return false end
 local allowed=kind=='entrusted' and (road.entrusted=='pending' and value=='carrying' or road.entrusted=='carrying' and value=='good') or kind=='wounded' and road.wounded=='pending' and value=='good'
 if not allowed then return false end
 road[kind]=value
 if value=='good' then
  for i=1,CC.TeamNum do local pid=JY.Base['队伍'..i];if pid and pid>=0 and JY.Person[pid]['生命']>0 then api.qi(pid)[kind]=true end end
 end
 persist();return true
end
BrowserYijinPerson=function(pid)
 return active(pid) and team(pid) and api.qiTreatment(pid) or nil
end
BrowserYijinGuide=function(pid,insight)
 if not active(pid) or not team(pid) or JY.Person[pid]['生命']<=0 or api.rank(pid,43)==0 then return false end
 local q=api.qi(pid)
 if insight then
  if not q.guided or not q.entrusted or not q.wounded or q.insight then return false end
  q.insight=true
 else q.guided=true end
 persist();return true
end
BrowserGrowthPerson=function(pid)
 if not active(pid) then return nil end
 local m=api.ensure(pid);local ids,count=api.identities(pid);local b=api.rootBonuses(pid)
 local learned={}
 for id in pairs(ids) do
  local info=api.forgetInfo(pid,id);local skill=info.skill
  -- Display the preserved Nine Yang identity as cultivation, not an attack.
  -- Its historical skill:92 key remains unchanged for saves and slot counting.
  if skill==92 then skill=nil;info.book=95 end
  local profile=BrowserMartialBalance and (skill and BrowserMartialBalance.data.skills[skill] or api.bookProfile(pid,info.book))
  learned[#learned+1]={effect=profile and profile.effect,contribution=not skill and profile and profile.mp and profile.mp[info.rank] or nil,id=id,book=info.book,skill=skill,requirements=info.book and BrowserStudyRequirements and BrowserStudyRequirements(pid,info.book) or nil,name=skill and skillName(skill) or bookName(info.book,pid),rank=info.rank,maxRank=profile and profile.maxRank or 10,rankUnit=profile and profile.rankUnit or '级',refund=info.refund,paid=info.paid}
 end
 table.sort(learned,function(a,b) return a.id<b.id end)
 local cfg=BrowserGrowthBattleConfig(pid)
 return {version=1,count=count,reserved=api.reservations(pid),signature=skillName(m.signature),internal=bookName(m.internal,pid),internalRank=api.rank(pid,m.internal),internalMaxRank=api.maxRank(m.internal),internalRankUnit=api.rankUnit(m.internal),baseMP=m.roots.mp,bonusMP=b.mp,learned=learned,luohanBase=m.luohan and m.luohan.base or 0,luohanCredit=api.studyCredit(pid,41),
  huEffect=m.signature==67 and api.attackRank(pid,67)>=8 and ((api.attackRank(pid,67)-7)*2+4) or 0,taiChiReduction=cfg.taiChiReduction,taiChiCost=cfg.taiChiCost,taiChiNormalCost=cfg.taiChiNormalCost,
  effect=BrowserGrowthInternalText(pid),studyPreview=BrowserGrowthStudyPreview(pid),
  roadHint=pid==0 and growth.yijinRoad and growth.yijinRoad.entrusted=='carrying' and '行路托付：将河洛老镖师的家书与旧木簪送往有间客栈，向掌柜询问周姑娘。' or nil,
  qi=(m.qi and m.qi.foreign>0 or api.rank(pid,43)>0 or api.slot(pid,28)) and api.qiTreatment(pid) or nil}
end
BrowserGrowthAction=function(pid,action)
 if type(action)~='string' or string.sub(action,1,7)~='growth-' or not active(pid) then return false end
 if (JY.Status~=GAME_MMAP and JY.Status~=GAME_SMAP) or not team(pid) then return true end
 local p=JY.Person[pid];if p['生命']<=0 then DrawStrBoxWaitKey('先休整恢复气血，再调整修为。');return true end
 local m=api.ensure(pid)
 if action=='growth-qi' then
  local info=api.qiTreatment(pid)
  if info.reason~='' then DrawStrBoxWaitKey(info.reason)
  elseif confirm('潜心调息，耗费'..info.cost..'点心得，梳理'..info.amount..'点异气？\n不恢复气血或内力；调息心得用于疗伤，不计散功返还。') then
   local ok,amount,cost=api.treatQi(pid)
   if ok then persist();DrawStrBoxWaitKey(p['姓名']..'凝神调息，异气减轻'..amount..'，耗费'..cost..'点心得。'..(api.qi(pid).foreign==0 and '这股郁气已散，日后强吸外气仍须谨慎。' or '余下郁气还须循序化解。'))end
  end
 elseif action=='growth-signature' then
  local rows,skills={{'暂不选定拿手武学',nil,1}},{0}
  for i=1,10 do local s=p['武功'..i];if s>0 then local info=BrowserGrowthSkillInfo(pid,s);rows[#rows+1]={skillName(s)..' · '..api.attackRank(pid,s)..(info and info.rankUnit or '级'),nil,1};skills[#skills+1]=s end end
  local n=menu(rows);if n>0 then api.setSignature(pid,skills[n]);persist() end
 elseif action=='growth-internal' then
  local rows,books={{'收起主运心法',nil,1}},{0}
  for _,book in ipairs({39,40,41,42,43,44,92,93,94,95}) do local rank=api.rank(pid,book);if rank>0 then rows[#rows+1]={bookName(book,pid)..' · '..rank..'/'..api.maxRank(book)..api.rankUnit(book),nil,1};books[#books+1]=book end end
  local n=menu(rows);if n>0 then api.setInternal(pid,books[n]);persist() end
 elseif action=='growth-forget' then
  -- Forgetting is handled only through the elder quest, not the character panel.
  DrawStrBoxWaitKey('此处只能安排修炼，不能遗忘武学。')
 elseif action=='growth-relearn' then
  local rows,arts={},{}
  for identity in pairs(m.taught) do
   local skill=tonumber(identity:match('^skill:(%d+)$'));local book=tonumber(identity:match('^book:(%d+)$'))
   -- Real Jiuyang cultivation and its attack form are presented once.
   if not (skill==92 and m.taught['book:95']) then
    local missing=skill and not api.slot(pid,skill) or book and api.rank(pid,book)==0
    if missing then
     local cost=skill and api.relearnCost(pid,skill) or api.cost(pid,book)
     local reason=skill and api.relearnReason(pid,skill) or api.reason(pid,book)
     if book and not canUse(book,pid) then reason='尚未满足此门根基条件' end
     if book==41 and api.luohanTransition(pid) then reason='内层尚未修成，须持木罗汉研习入门' end
     if reason=='' and p['修炼点数']<cost then reason='还需'..(cost-p['修炼点数'])..'点心得' end
     local name=skill and skillName(skill) or bookName(book,pid)
     rows[#rows+1]={name..' · '..(reason=='' and '入门需'..cost..'点' or reason),nil,1};arts[#arts+1]={skill=skill,book=book,cost=cost,reason=reason,name=name}
    end
   end
  end
  if #rows==0 then DrawStrBoxWaitKey('没有散去过的武学。');return true end
  local n=menu(rows);local r=arts[n]
  if r then
   if r.reason~='' then DrawStrBoxWaitKey(r.reason)
   elseif confirm('以'..r.cost..'点心得重学'..r.name..'，从一重重新练起？') then
    local ok
    if r.skill then ok=api.relearn(pid,r.skill)
    elseif canUse(r.book,pid) then ok=api.relearnBook(pid,r.book) end
    if ok then persist() end
   end
  end
 end
 return true
end
BrowserGrowthIsEcho=function(pid) local e=echoes[pid];return e~=nil and e~=false end
BrowserGrowthHasOrdinary=function(pid) return active(pid) or BrowserGrowthIsEcho(pid) end
-- (pid,record) 借一格作影并挂上它自己的成长快照（record 为 nil 时只屏蔽本人成长档）；可连借几格，各不相扰。
-- (nil,nil) 一次清空全部影格——单影决斗与归途战结束、失败、取消、出错时都走这一句。
BrowserGrowthSetEcho=function(pid,record) if pid==nil then echoes={} else echoes[pid]=record or false end end
BrowserGrowthBattleConfig=function(pid)
 local m=echoes[pid];if m==nil then m=growth and growth.persons[tostring(pid)] elseif m==false then m=nil end
 if not m then return nil end
 local function rank(skill) for i=1,10 do if JY.Person[pid]['武功'..i]==skill then return math.min(10,math.floor(JY.Person[pid]['武功等级'..i]/100)+1) end end;return 0 end
 local tr=rank(20);local ir=m.learnedBooks[tostring(m.internal)] or 0
 if m.internal==92 then ir=math.min(7,ir) end
 local jiuyang=m.practice and (m.learnedBooks['95'] or 0) or m.internal==95 and ir or 0
 local reduction=math.floor(math.min(tr,jiuyang)/3)
 -- Combat applies Xiaowuxiang before Jiuyang. The live row may already be
 -- temporarily discounted inside those wrappers; preview from the stable table.
 local B=BrowserMartialBalance;local art=B and B.enabled and B.data.skills[20]
 local base=art and art.mpStep or JY.Wugong[20]['消耗内力点数']
 if art and art.damageType==0 and base>2 then
  local xiaowu=m.practice and (m.learnedBooks['40'] or 0) or m.internal==40 and ir or 0
  base=math.max(2,base-math.floor(xiaowu/5))
 end
 local guard=0
 local yijin=m.practice and (m.learnedBooks['43'] or 0) or m.internal==43 and ir or 0
 if yijin>0 then
  guard=math.min(yijin,7)*.008
  if m.qi and m.qi.insight then guard=guard+math.max(0,yijin-7)*.008*math.max(0,math.min(1,((JY.Person[pid]['品德'] or 50)-50)/20))end
 end
 return {growth=true,version=1,internalRanks=m.practice and m.learnedBooks or nil,huRank=m.practice and rank(67) or nil,signature=m.signature,signatureRank=rank(m.signature),internal=m.internal,internalRank=ir,yijinGuard=guard,taiChiRank=tr,taiChiReduction=reduction,taiChiCost=math.floor((tr+1)/2)*math.max(1,base-reduction),taiChiNormalCost=math.floor((tr+1)/2)*base}
end
BrowserGrowthInternalText=function(pid)
 local m=api.ensure(pid);local rank=api.rank(pid,m.internal)
 if rank<=0 then return '尚未主运心法。学成后可在战外自由选择，切换不恢复气血或内力。' end
 if BrowserMartialBalance then
  local profile=api.bookProfile(pid,m.internal)
  if profile then return bookName(m.internal,pid)..' '..rank..'/'..api.maxRank(m.internal)..api.rankUnit(m.internal)..'：主运内力贡献'..(profile.mp[rank] or 0)..'。'..profile.effect..(m.internal==40 and '可兼修阴阳；收功恢复本来内性。' or m.internal==43 and '当前护体减伤'..string.format('%.1f',BrowserGrowthBattleConfig(pid).yijinGuard*100)..'%。' or '')end
 end
 return bookName(m.internal,pid)..' '..rank..'重：主运内力上限增加'..api.rootBonuses(pid).mp..'。'..((m.internal==40 or m.internal==41) and '调和阴阳，可满足阴阳两类修炼条件；收功后恢复本来内性。' or '')..(m.internal==92 and '临敌挪劲，每重增加1点护体防御，只在受敌方武功时生效。' or '')
end
local fight=War_Fight_Sub
War_Fight_Sub=function(id,...)
 local result=table.pack(fight(id,...));local pid=WAR.Person[id]['人物编号']
 if active(pid) and team(pid) then api.apply(pid);persist() end
 return table.unpack(result,1,result.n)
end

BrowserGrowthEcho=function(pid) return growth and growth.persons[tostring(pid)] or nil end

local hurt=War_WugongHurtLife
War_WugongHurtLife=function(target,skill,level)
 local u=WAR.Person[target];local a=WAR.Person[WAR.CurID]
 local cfg=u and (u['我方'] or BrowserGrowthIsEcho(u['人物编号'])) and BrowserGrowthBattleConfig(u['人物编号']) or nil
 local rank=BrowserHeartRank and BrowserHeartRank(cfg,92) or cfg and cfg.internal==92 and cfg.internalRank or 0
 local profile=BrowserMartialBalance and BrowserMartialBalance.data.books[92]
 local bonus=profile and profile.guard and profile.guard[rank] or rank
 if bonus<=0 or not a or u['我方']==a['我方'] then return hurt(target,skill,level) end
 local p=JY.Person[u['人物编号']];local def=p['防御力'];p['防御力']=def+bonus
 local result=table.pack(pcall(hurt,target,skill,level));p['防御力']=def
 if not result[1] then error(result[2],0) end;return table.unpack(result,2,result.n)
end

local itemDetails=BrowserItemDetails
local useThing=UseThing
UseThing=function(id)
 if api and id==0 then
  DrawStrBoxWaitKey('此酒不能使人遗忘武学，仍留在行囊中。')
  return 0
 end
 return useThing(id)
end
BrowserItemDetails=function(id)
 local t=itemDetails(id)
 if api and id==0 then
  t.useReason='此酒不能使人遗忘武学。'
  t.customEffect='此酒仍留在行囊，不能用来遗忘武学。'
 end
 if api and api.validBook(id) and not api.craft(id) then
  local name=JY.Thing[id]['名称'];local description
  if id==91 then description='左右互搏占一门；只传周伯通、郭靖、小龙女及资质不高于45的主角。当前沿用同招再出，异招组合尚在制作。'
  elseif id>=45 and id<=47 then description='按实际境界提升轻功；同类身法只取最高贡献，不逐本叠加。'
  elseif id>=88 and id<=90 then description='按实际境界提升暗器根基；同类法门只取最高贡献，不逐本叠加。'
  elseif JY.Thing[id]['练出武功']>0 and id~=95 then description='修炼提高本招境界；同类兵器根基随最高修为成长，不逐本叠加攻防或气血。'
  else description='内功按实际境界成长，选为主运后发挥；不会因收藏或逐本修炼永久叠加攻防。' end
  if id==41 and BrowserMartialBalance then
   local l=growth.luohan
   description=l and l.revealed and '内层须重新研习，不继承外层境界。旧外层修炼投入可抵扣本门费用；首位修满者已保留的永久根基不作抵扣。' or '外层为基础内功，主运十重最多贡献40内力，不自动调和阴阳。修满后可在家中或客栈歇宿时细察泥偶。'
  end
  if id==67 then description=description..'松风入门所需心得较少，具体数值见所选人物的修炼进度；一重之后按资质与境界逐级精修，仍须满足剑术门槛。' end
  if BrowserMartialBalance then
   local profile=BrowserMartialBalance.data.books[id]
   if id==41 and growth.luohan and growth.luohan.revealed then profile=profile.inner end
   if profile then
    description=description..'修炼上限'..profile.maxRank..(profile.rankUnit or '级')..'。修炼曲线：'..({steady='循序精进',early='初见锋芒',quick3='速成陡进',late='厚积后劲'})[profile.curve]..'。'..profile.effect
    -- 156：t 是 BrowserItemDetails 返回的普通副本，改它不写存档字节。BrowserStudyRequirements 正是
    -- 经这里取门槛，所以要与 canUse 同一条规则：门槛只拦零级入门，本书的研习者若已入门，
    -- 门类根骨那几项还原成底表原值（否则界面比判定更严，gate parity 会红）。
    if profile.gates then for field,v in pairs(profile.gates) do t[field]=v end end
    if profile.removeAptitude then t['需资质']=0 end
   end
   -- 395 Q3：旧句写「异招组合尚未接入」，但战斗菜单的「左右互搏」一行（ui-extension War_FightMenu → BrowserRunDualAction）
   -- 早已可选两门招式；句子按 balance-combat / combo-extension 的现行门槛重写，不改任何判定。
   if id==91 then description='左右互搏限适合之人，占一门。须有六级以上的合用招式：自动战斗时同招连出两击；手动可在武功菜单「左右互搏」一行先后选两门招式（同源第二招退还两成五内力，互补招式另加8%，两招都要兵器而只有一件时第二招减一成）。每击75%伤害、各自耗内。手动点选单招、内力不足两击、整片范围招、吸内或带毒招式、普通拳脚，以及持玄铁剑或屠龙刀时，都只出一击。'end
  end
  t.loreName=api.bookName(0,id,true);t.growthDescription=description;t.growthRule=true
  if id==91 then t['需资质']=0 end
 end
 return t
end

-- 155 队友好感 v1 (editorial/好感度系统v1_155.md). New-growth saves only: classic,
-- trial and echo runs never read or write it. Values belong to this cycle; a new
-- cycle starts from zero and keeps only the 似曾相识 mark (companions who reached
-- 知己 last cycle), which changes a first-meeting detail and nothing else.
-- Every tunable number and list is in RULES / KNOTS / RIGHTEOUS / LESSONS below.
-- 155b: a function scope rather than a do block, so these locals do not count toward the bundle's
-- 200-local limit of the main chunk (build.mjs concatenates every extension into one chunk).
;(function()
 local RULES={
  max=100,                                  -- 满好感: one of the conditions for 请教武学
  tiers={{0,'陌生'},{20,'相识'},{40,'同道'},{60,'知己'},{85,'生死之交'}},
  bond=60,                                  -- reaching 知己 leaves next cycle a 似曾相识 mark
  join=15,                                  -- first join in this cycle (once)
  win=2,winCap=40,                          -- each victory with the companion in the party; per-cycle cap
  knot=50,                                  -- the companion's own story event (KNOTS), once
  tie=20,                                   -- 155d 同行渊源 (TIES): a shorter scene out of that companion's own past, once
  moralDrop=3,moralFactor=2,moralMax=20,    -- one moral change of -3 or worse: in-party righteous companions lose 2x, at most 20
  slots=3,                                  -- hero's affinity-taught arts per cycle; relearning the same art takes none; dispersal refunds none
 }
 local LINES={'还在打量你的为人，言语间客气而疏远。','与你同行过一段，觉得你还算靠得住。','已把你当作志同道合的同伴，遇事愿听你的主意。','视你为知己，许多心事愿与你说。','与你生死相托，你开口的事，从不推辞。'}
 -- Same list as growth.js AFFINITY_COMPANIONS: the 25 companions with a source departure/rejoin pair.
 local COMPANION={}
 for _,pid in ipairs({1,2,9,16,17,25,28,29,35,36,37,38,44,45,47,48,49,51,53,54,58,59,61,63,76}) do COMPANION[pid]=true end
 -- 正派 companions who mind a clearly worse deed of the hero.
 local RIGHTEOUS_BASE={[1]=true,[2]=true,[9]=true,[35]=true,[37]=true,[38]=true,[45]=true,[49]=true,[53]=true,[54]=true,[58]=true,[63]=true}
 -- 157：狄云／杨过走了可选黑化支之后，不再按正派扣好感（editorial/黑化线与组队门槛157.md 第三节）。
 -- 跨层探测；darkpath 层未合并时两个函数都不存在，这张表与原来逐字相同。
 -- 全工程只有 :1204 一处按编号索引它，没有任何地方 pairs() 遍历，所以用 __index 代理是安全的（已 grep 核过）。
 local RIGHTEOUS=setmetatable({},{__index=function(_,pid)
  if pid==37 then local f=rawget(_G,'BrowserDiyunDark');if type(f)=='function' and f() then return nil end end
  if pid==58 then local f=rawget(_G,'BrowserYangDark');if type(f)=='function' and f() then return nil end end
  return RIGHTEOUS_BASE[pid]
 end})
 local function knows(pid,skill)
  local p=JY.Person[pid];if not p then return false end
  for i=1,10 do if p['武功'..i]==skill then return true end end
  return false
 end
 -- 155d: the source D table is the evidence a source event leaves behind. Always an equality test against the
 -- value that event writes, never “~= the initial value”, so an unread D table can never look like a finished event.
 local function atD(scene,id,field,value) return type(GetD)=='function' and GetD(scene,id,field)==value end
 -- 156 田伯光二选一：那一战有「杀」与「阉」两种收场，两种都把平一指居格0写成 303，所以 done 判不出是哪一种。
 -- 跨层探测；tianbo-extension 未合并时恒为 false，行为与现在完全一致。
 local function tianboGelded() local f=rawget(_G,'BrowserTianboGelded');return type(f)=='function' and f()==true end
 -- Several source events overwrite their own D marker again when the companion is finally recruited, so
 -- “this companion has travelled with the hero at some point” is the remaining proof for those beats. It is
 -- only used where the recruit event is unreachable before the beat (E42 药王庄, E96/E97 蝴蝶谷, E290 福威镖局,
 -- E556 薛慕华居, E402 程瑛居 — all read out of the source scripts).
 local function seen(pid) return team(pid) or (growth~=nil and growth.persons[tostring(pid)]~=nil) end
 local say                                  -- defined with the teaching lines below; story beats play through it too
 -- Knot events, checked against oldevent_*.lua. done() reads only lasting evidence the
 -- source event itself leaves (a unique reward or a scripted art). A knot counts when it
 -- completes with the companion in the party; bound=true events concern the companion in
 -- either branch. An event completed without them is still spent for this cycle.
 local KNOTS={
  {pid=1,event=33,done=function() return owned(144) end},                  -- 苗人凤居：胡苗对决（须胡斐在队），飞狐外传唯一来源
  {pid=9,event=65,done=function() return owned(117) end},                  -- 冰火岛：以成昆首级了结谢逊之仇，屠龙刀唯一来源
  {pid=35,event=284,done=function() return knows(35,61) or owned(79) end}, -- 思过崖：风清扬传剑（须令狐冲在队）
  {pid=38,event=363,done=function() return knows(38,23) or owned(154) end},-- 侠客岛：石壁悟太玄（须石破天在队）
  {pid=49,event=546,done=function() return type(GetD)=='function' and GetD(35,0,2)==590 end}, -- 星宿海：为苏星河、无崖子除丁春秋
  {pid=53,event=484,done=function() return knows(53,29) end},              -- 无量山洞：玉像前得北冥（须段誉在队）
  {pid=58,event=436,bound=true,done=function() return knows(58,24) end},   -- 绝情谷底：与小龙女重逢（两支皆算）
  -- 155c 浡泥岛：三道考验。E636/E637 只在品德≥80 时交出碧血剑并把本格改为 E638，E638 才请得动他同行
  -- （邪路一支改 E639，不能入队），所以“袁承志已入队”本身就是仁义考验已过的持久证据。入队即计。
  {pid=54,event=638,done=function() return team(54) or growth.persons['54']~=nil end},
  -- ===== 155d（B 批·主要队友）=====
  -- 十位正常一周目最可能同行、v1–155c 却无心结（上限 55）的队友，各补一个心结。全部复用原版事件，
  -- 不新增事件号、不改原脚本；逐个读码核对过触发条件与事件本身留下的痕迹（editorial 第十四节有逐人依据）。
  -- done 只用等值判断（绝不用 == -1），免得空 D 表误判；无痕迹可查者不写 done，只在本程实际发生时计。
  -- infer=false：原事件本身并不要求此人在队，旧档无从证明他当时同行，故不做旧档推断。
  {pid=2,event=33,infer=false,done=function() return owned(144) end,                  -- 苗人凤居：带程灵素同去，看胡斐与苗人凤了断父辈血仇（她正是解苗人凤眼毒的人）
   lines={{2,'苗大侠的眼睛是我解的毒，胡大哥的刀是我看着磨的。今日这一场，我原是不想看的。'},{0,'那你为何还是来了？'},
    {2,'总得有人在旁边守着。刀上见了血，还得有人替他们包扎。'},
    {-1,'（一战既罢，程灵素默不作声地收好药箱，把两副金创药分放在两人手边，谁也没多说一句。）'}}},
  {pid=16,event=95,bound=true,done=function() return atD(44,0,2,96) end,              -- 蝴蝶谷：夫妇重逢，胡青牛毁去“非我明教之人不救”的誓
   proof=function() return atD(44,0,2,96) or seen(16) end,                            -- （E96 招他同行只在 E95 之后才有，所以旧档里“他曾同行”同样算数）
   lines={{16,'那条“非我明教之人不救”的誓，今日我自己毁了。少侠，你是头一个知道的。'},{0,'行医本就是救人。'},
    {16,'话是这么说。医家一执拗起来，比病还难治。'},
    {-1,'（胡青牛把立誓的那块木牌取下来，折作两段，丢进药炉底下的火里。）'}}},
  {pid=17,event=95,bound=true,done=function() return atD(44,0,2,96) end,              -- 同上：王难姑自此收手，不再以人命作彩头
   proof=function() return atD(44,0,2,96) or seen(17) end,
   lines={{17,'我与师兄斗了半辈子医毒，把多少人的性命当成了彩头。这笔账，我今日才算过明白。'},
    {0,'前辈肯说这句话，已不容易。'},{17,'往后我这一身毒，只对该用的人用。'}}},
  {pid=25,event=611,infer=false,done=function() return owned(150) end,                -- 神龙教：带蓝凤凰同回神龙岛，与洪教主算这笔借刀杀人的帐
   lines={{25,'洪教主，五毒教的教主是我蓝凤凰，不是你手里的傀儡。'},
    {-1,'（蓝凤凰袖中五条小蛇一齐游了出来，绕着神龙教的香案转了一圈，又乖乖回到她手上。）'},
    {25,'这一趟若没有公子同来，我一个人闯进来，只怕出不去了。'},{0,'你一个人也闯得，只是不必一个人闯。'}}},
  {pid=36,event=296,                                                                  -- 青城派：原事件本身要求林平之在队（无他则余沧海只答一句），war51 胜后灭青城派
   lines={{36,'爹，娘，余沧海死了。福威镖局这笔血债，儿子讨回来了。'},
    {-1,'（林平之把剑插回鞘里，手抖得厉害，站在原地半晌没动。）'},
    {0,'你要哭就哭罢，这里没有外人。'},{36,'……多谢。'}}},
  {pid=37,event=644,infer=false,done=function() return owned(146) end,                -- 天宁寺：带狄云在场取出连城诀——毁了他半生的正是这卷东西
   lines={{0,'狄兄，这就是让你在牢里关了几年的东西。'},
    {37,'我师父、万师伯、言师伯……都是为了这个。'},
    {-1,'（狄云接过去看了很久，又还了回来，手心里全是汗。）'},{37,'兄台收着罢。我看一眼就够了。'}}},
  {pid=45,event=537,                                                                  -- 擂鼓山：原事件本身要求薛慕华在队（无他则苏星河只与主角说话）
   lines={{45,'师父三十年不能开口说话，弟子连一声“师父”都不敢叫出来。'},{0,'今日叫得出了。'},
    {45,'是。多谢少侠带老朽走这一趟。'},
    {-1,'（薛慕华替苏星河诊了脉，写了方子，来回改了三遍才肯放下笔。）'}}},
  {pid=47,event=546,infer=false,done=function() return atD(35,0,2,590) end,           -- 星宿海：带阿紫回师门，看着丁春秋伏诛（她当年偷神木王鼎叛出星宿派）
   lines={{-1,'（丁春秋倒下时，阿紫没有笑，也没有走近，只把神木王鼎抱得更紧了些。）'},
    {47,'他死了。以后再没有人拿毒虫吓唬我了。'},{0,'嗯。'},
    {47,'你别以为我会谢你。……不过这一趟，算你没白带我来。'}}},
  {pid=59,event=436,bound=true,done=function() return knows(58,24) end,               -- 绝情谷底：与杨过重逢，两支皆算（杨过的心结同一事件）
   fade=true,                                                                         -- 2026-10-01：在该事件第一次黑场之前、她还在眼前时说（见 knotEvent）
   lines={{59,'困在谷底时，我只怕再也见不着过儿。是你找到了那条路。'},{0,'我只是带路。'},
    {59,'带路也是恩。我不大会说话，你记着这句就好。'}}},
  {pid=63,event=416,                                                                  -- 黑水潭：原事件本身要求程英在队，她以五行奇门破局，才开出黑龙潭这条路（进出是一对开合事件，D 表不留痕）
   lines={{63,'这潭子是照五行生克排的，看着无路，其实每一步都留了口子。'},
    {-1,'（程英拾起几枚石子，在岸边排出潭中阵势，又指了指芦苇间几处浅滩。依她所指细看，水下果然隐约露出可供落脚的石脊。）'},
    {0,'程姑娘这一手，比什么武功都管用。'},
    {63,'公子过奖。家师说过，天下的局都是人排的；排得出的，总拆得开。'}}},
  -- ===== 156：平一指、岳老三。两人善线可走且几乎零道德代价（平一指入队 −1、岳老三 0）；
  -- 155d 14.7 把他们判成「没有第二段自己的戏」与「拜师白送」，与脚本不符（editorial/队友支线156.md 第一节）。
  -- 156 田伯光二选一：同一件事两种收场，同挂 E307／E308、同一个 done。两条只差 when，互斥，恰好写下一条。
  -- （两条共用 r.events['307'] 这一个键；when 为假的那条 finished 不成立，不会抢先把键写掉。）
  {pid=28,event=307,also={308},bound=true,                                            -- 田伯光居 · 杀：替平一指了断这桩私怨（战斗53胜，声望+4）
   done=function() return atD(30,0,2,303) end,                                        -- 平一指居格0=303，全脚本仅 E307／E308 写入
   when=function() return not tianboGelded() end,
   proof=function() return atD(30,0,2,303) or seen(28) end,                           -- E303 入队唯一前置就是这一战，所以「他曾同行」同样算数
   lines={{0,'这一刀不是替你一个人还的。'},
    {-1,'（田伯光倒下的地方，那张大床空着。你把他的刀收了，想起平一指说过「手一软，该死的死不了」——原来他那条规矩，是对着这样一个人立的。）'},
    {-1,'（回河洛的路上，你没走快，也没走慢。有些话，得当面说给他听。）'}}},
  {pid=28,event=307,also={308},bound=true,                                            -- 田伯光居 · 阉：同样了结那桩托付，只是留了他一条命
   done=function() return atD(30,0,2,303) end,
   when=function() return tianboGelded() end,
   proof=function() return atD(30,0,2,303) or seen(28) end,
   lines={{0,'这一刀我收住了。该还的，换一样还。'},
    {-1,'（那张大床还在。田伯光背过身去坐着，没再看它一眼；你把他的刀搁回他手边，他没伸手。）'},
    {-1,'（回河洛的路上，你想起平一指说过「手一软，该死的死不了」。你这一手不算软，可到底不是他要的那一下。）'}}},
  {pid=44,event=568,bound=true,                                                       -- 万鳄岛：打赢他，他践诺认师——他这一生争的就是个名次，如今自己把名次让了
   proof=function() return atD(77,0,2,569) or seen(44) end,                           -- 不写 done：E568 用当前格自改，格0 仅由 E974 重邀反证；判错只会少推断一次，不会误加分
   -- 156 审核：原样删掉两句复述（原版 E568 刚说过），并且他**不让名次**——《天龙八部》里他认了师父之后
   -- 照样死咬「岳老二」，到少室山还在跟叶二娘争。让的只有师徒名分。
   lines={{-1,'（他把那对大剪刀往地上一杵，端端正正跪下磕了个头，磕完抬眼看你，等着你说句什么。）'},
    {44,'磕头归磕头，名次归名次——在外头我还是岳老二。可在你跟前，我只是徒弟。你说往东，我绝不往西。'}}},
  -- ===== 156 邪线五人（editorial/邪线五人156.md）。五人补齐之前，25 名队友里正好是邪路的全部队伍
  -- 只有一句似曾相识旁白。五拍全部复用原版事件，不新增事件号、不改原脚本、不新增存档字段。
  -- 这五拍一律不写 done：原事件的持久痕迹（九剑谱79、射鵰148、GetD 590）都是“主角自己也能拿到”的东西，
  -- 拿来当 done 就会重演狄云 E602 那次事故（顺手开箱烧掉一拍）。改用 when 判支、用 present 判在场：
  -- 人不在就不结算、也不烧掉，日后带他再来照算。
  -- 157 审核：这一拍原来没有 done／when／bound，finished 恒真、present 只看 team(29)。
  -- 于是「令狐冲先回家、换田伯光进队再踩那一格」时，原版 E284 只让风清扬说一句「．．．．．」就 return，
  -- 本作却照样把整段演完——令狐冲凭空出现说话，独孤九剑也没传。把注释里那句要求真正落到代码上。
  {pid=29,event=284,infer=false,                                                      -- 华山思过崖：风清扬传毕九剑，令狐冲与他走三招（须两人同时在队，且这一场真的传了剑）
   when=function() return team(35) and (knows(35,61) or owned(79)) end,               -- 与同事件上令狐冲那一拍同口径：九剑61 由完整跑完时的 instruct_33 写下，早退支恒假
   lines={{35,'田兄的刀快，我在这崖上领教过。方才那几路我刚学，手生得很，你陪我走三招。'},
    {29,'三招？令狐兄，你我动手，从来没有三招之内的道理。'},
    {-1,'（三招之内，田伯光的刀脱手，落在石缝里。他自己弯腰捡起来，没让令狐冲伸手。）'},
    {29,'输了就是输了。刀是我的，话也是我的：这崖上，往后我不来了。'},
    {35,'田兄要来，我照样拿酒招呼。'},
    {0,'你们两个，倒像相熟已久。'},
    {29,'相熟谈不上。只是从头到尾，他没说过一句「你这种人」。'}}},
  {pid=48,event=546,infer=false,when=function() return atD(35,0,2,590) end,           -- 星宿海：丁春秋伏诛（须他在队）。此事件已是虚竹49与阿紫47的一拍，BEATS 支持一事件多人
   -- 157 审核：这一句原来与阿紫那拍（同挂 E546）同从「丁春秋倒下」起笔，两段旁白连着播，句式撞车。换个切入点，信息不变。
   lines={{-1,'（众人散开时，他始终站在阿紫侧后半步。星宿派的弟子哄然跪倒，铁罩上那两个孔一动不动。）'},
    {48,'阿紫姑娘往后……不必再怕这个人了。'},
    {0,'你替她走了这一趟。'},
    {48,'不算替。她要的东西，小的一样也拿不出来；只有这个人，小的总算是看着他倒下了。'}}},
  {pid=51,event=573,also={494},infer=false,                                           -- 燕子坞：他说出慕容氏世世代代奔的是什么，并请你同上少林（须他在队，即这一支谈成）
   lines={{51,'你既肯与我同去，有一句话我先说明白：我帮你，不是要交你这个朋友。'},
    {0,'公子说得直。'},
    {51,'我慕容家世世代代奔波，到我这一辈，只剩一个人、一个姓。朋友是养不起的东西。'},
    {-1,'（他说完便去收那卷图表，一页一页对着光看，看得比方才那块玉还仔细。）'}}},
  {pid=61,event=466,also={469},infer=false,when=function() return owned(148) end,     -- 桃花岛：带他上东邪的岛取走射鵰英雄传148（须他在队）。桃花岛场景号原脚本只用 -2，故以囊中之书为判据
   lines={{61,'桃花岛。我叔父这辈子提过三个地方，头一个就是这里。'},
    {0,'他来过？'},
    {61,'来过。回去以后半年没说话。我那时还小，只记得他把院里的花全铲了。'},
    {-1,'（欧阳克没有进厅，站在石径尽头，手里那把折扇一直没有打开。）'},
    {61,'走罢。今日这一趟，够我回去跟叔父说三年了。'}}},
  -- 157 审核：原版 E530 两支收尾都执行 instruct_21(76)（oldevent_530 Label10／Label12），事件返回时 team(76) 已经是假，
  -- 而这一条既无 bound 也无 done，present 恒假 ⇒ 这一拍永远结算不到，她的好感封顶 75、到不了「生死之交」。
  -- 补 bound=true（与 pid=51 E493、pid=61 E444 同口径：事件本身就演她，不靠 team 判在场）；
  -- when 保留不动——495／594 正是那两支各自写下的痕迹，足以把「她在场的那一幕」与别的支分开，不会误触。
  {pid=76,event=530,infer=false,bound=true,                                           -- 丐帮：慕容复被拦下之后。两支皆算：独自回燕子坞(52/2=495)、与段誉同去无量山洞(42/6=594)
   when=function() return atD(52,2,2,495) or atD(42,6,2,594) end,
   -- 原事件已演完她独自返燕子坞或与段誉同赴无量山洞，不让离场人物再回来重复告别。
   lines={{-1,'（王姑娘的身影渐渐远去。想起她方才那番话，你不禁叹息：慕容公子的复国旧梦，她终究是等不醒的。）'}}},
 }
 -- 155d 同行渊源（TIES，+20）：此人自己的一段来历，主角亲历的一小幕。与心结同一套触发机制，只是分值较轻。
 -- done 是“这一刻刚发生”的判据，proof 是旧档推断的判据（有几处原版事件会在招募时把自己那格再改一次，
 -- 所以旧档只剩“此人曾同行”可查；用它是因为原版的招募事件必定排在这一拍之后）。
 -- 没写 done 的几条要么无持久痕迹（E539 星宿派弟子只是一句话），要么靠 when 判支（E93 须无忌在队、
 -- E402 须谈罢请她同行）；这几条不做旧档推断，而且此人不在时不算作废——免得路过搭一句话就把这一拍烧掉。
 local TIES={
  {pid=2,event=41,bound=true,done=function() return atD(49,2,2,42) end,               -- 药王庄：七心海棠归庄，药王庄那笔烂帐了了
   proof=function() return atD(49,2,2,42) or seen(2) end,                              -- （E42 请她同行只在 E41 之后才有）
   lines={{2,'这一株七心海棠，总算回了药王庄。往后再有人拿它害人，我也好去讨个说法。'},{0,'姑娘费心了。'},
    {-1,'（程灵素把那株海棠收进乌木匣，锁好，钥匙贴身收起。她做这些事时手很稳，眼睛却红了一下。）'}}},
  {pid=16,event=93,bound=true,when=function() return team(9) end,                     -- 蝴蝶谷：须带张无忌同去，胡青牛才认得出人，也才肯说出妻子被掳（无忌不在则只有“还不快滚”一句）
   lines={{16,'无忌这孩子，当年抱来时瘦得只剩一把骨头。你肯带着他走江湖，胡某记你一份人情。'},
    {0,'前辈言重了。'},{16,'言重不言重，往后自然见得着。'}}},
  {pid=17,event=103,also={104},bound=true,done=function() return atD(44,1,2,123) end, -- 灵蛇岛：把她从金花婆婆手里接出来（E103 无人引路、E104 受胡青牛所托，两支都是同一场救人）
   proof=function() return atD(44,1,2,123) or atD(44,0,2,96) or seen(17) end,          -- （E95 蝴蝶谷重逢只在救回她之后才有）
   lines={{17,'岛上那几日，我把自己的毒都数了一遍，偏偏一味也用不上。'},{0,'前辈受苦了。'},
    {17,'苦倒不苦。只是想起我那师兄，怕他一个人又不肯好好吃饭。'}}},
  {pid=25,event=616,bound=true,done=function() return atD(37,0,2,619) end,            -- 五毒教：她道破神龙教借刀杀人的算计
   lines={{25,'公子，你差一点就成了旁人手里的刀。'},{0,'我确实是差了一点。'},
    {25,'苗疆的规矩，看错了人就得认。你认得爽快，我便信你一回。'}}},
  {pid=36,event=288,also={289},bound=true,done=function() return atD(56,1,2,314) end, -- 福威镖局：你把林震南的死讯带回去，他当场立誓
   proof=function() return atD(56,1,2,314) or atD(56,1,2,290) or seen(36) end,         -- （E312→E290 请他同行也只在这之后）
   lines={{-1,'（林平之在厅上跪了很久。那块“福威镖局”的匾额斜斜挂着，谁也没去扶。）'},
    {36,'我爹娘的仇，我自己报。可是……以我现在的功夫，连青城派的门都进不去。'},
    {0,'那就一起去。'},{36,'这句话我记下了。'}}},
  -- 156 审查：原先这条挂 done=owned(160)，于是玩家在救出狄云之前顺手开了麻溪铺山洞那只箱子，
  -- 这一拍就被记成「本程已结算」而一分不给，狄云的两拍 85 永久掉成一拍 65。改成与 E537／E539／E416
  -- 同口径：人不在就不结算、也不烧掉，日后带他再来照算。
  {pid=37,event=602,infer=false,                                                      -- 麻溪铺山洞：带狄云回他与师妹儿时常去的旧地（那块写着数目字的石头就是他说的）
   lines={{37,'就是这儿。路旁那块写着数目字的石头还在，一点没变。'},
    {-1,'（狄云蹲下去，用袖子把石头上的字擦了擦，又把手缩了回来。）'},
    {37,'小时候我和师妹在这洞里躲雨，她说长大了要在洞口种一棵桃树。'},{0,'……那就让它先空着。'}}},
  {pid=45,event=555,bound=true,done=function() return atD(54,0,2,556) end,            -- 薛慕华居：七宝指环认掌门
   proof=function() return atD(54,0,2,556) or seen(45) end,                            -- （E556 请他同行只在 E555 之后才有）
   lines={{45,'这指环一出来，老朽这几十年的心气，一下子就散了。'},{0,'先生可是不信？'},
    {45,'信。只是没料到师父留的这一步棋，落在了一个后生手里。少侠队中若有人伤了，只管叫我。'}}},
  {pid=47,event=539,                                                                  -- 星宿海：原事件有“小师妹，你居然还敢回来”这一支，只在阿紫同行时出现
   lines={{47,'哼，一个个都这么神气。当年我偷了神木王鼎跑出来，他们连追都不敢追。'},
    {0,'你怕不怕？'},{47,'我才不怕。……你站近一点。'}}},
  {pid=59,event=442,infer=false,done=function() return owned(94) end,                 -- 古墓：石壁上的玉女心经与九阴真经，是她师门的来处
   lines={{59,'这些字是我师祖林朝英刻的。旁边那些小字，是王重阳后来添的。'},
    {0,'两位前辈原来是这样说话的。'},{59,'嗯。他们谁也不肯先开口，只好刻在石头上。'}}},
  {pid=63,event=402,also={403},bound=true,when=function() return seen(63) end,         -- 程瑛居：她自陈是黄岛主门下，只学得奇门五行看路的本事；原版在同一个事件里请她同行，
   -- 156 审查：原版 E402 在 instruct_9 之前就把该格改成 403，所以初见时没带走她（答否／品德不足
   -- ／队伍已满）之后，再来跑的是 E403，本拍原本永久作废。E403 同样有 instruct_9＋品德 65＋入队，
   -- 挂上 also 之后招募成功即补记，key 仍是 '402'，不新增事件号也不改原脚本。
   lines={{-1,'（程英说起“奇门五行”时语气很淡，末了在桌上用茶水画了个圈，又抹去了。）'},
    {63,'家师是东邪，我学不来他的武功，只学了点看路的本事。公子若遇上走不通的地方，不妨记着我。'},
    {0,'我记下了。'}}},
  -- ===== 156 =====
  {pid=28,event=301,bound=true,                                                       -- 平一指居：他自道「医一人，杀一人」的规矩，末了才提出那桩托付
   done=function() return atD(30,0,2,300) or atD(30,0,2,302) end,                      -- 该格由 301 改为 300（未开口请他同行）或 302（已受托）
   proof=function() return atD(30,0,2,300) or atD(30,0,2,302) or atD(30,0,2,303) or seen(28) end,
   -- 156 审核：原版 1029 刚把这条规矩念完，这里不再原样复述一遍，改为承接。
   lines={{28,'你既背得出，就该知道这规矩不是唬人的。'},
    {0,'先生行医，为何要立这样一条规矩？'},
    {28,'不立，手就软。手一软，该死的死不了，不该死的也活不成。'},
    {-1,'（平一指把脉枕收进药箱，扣好铜扣，指节在箱盖上停了一停，没再说下去。）'}}},
  {pid=44,event=567,bound=true,infer=false,                                           -- 万鳄潭：浮石与鳄群都是他排下的门户；E568 他开口第一句正是「过得了我的万鳄潭」
   lines={{0,'潭上这些浮石排得有讲究，踩错一块就是一嘴鳄鱼。'},
    {-1,'（鳄群退回水里之后，你才看清那些浮石是照着一路一路摆的——有人在这潭上花了很多工夫，摆完了，就守在对岸等人过来。）'}}},
  -- ===== 156 邪线五人 =====
  -- 田伯光在全部 1036 个脚本里只出现在 E300–E308、E964、E965〔读码〕，没有第二个属于他自己的场面，
  -- 所以这一拍只能挂在初见那间屋子上。不写 done、不写 bound：只有他真的入了队才结算（instruct_10(29)
  -- 在事件内已经跑过，后处理时 team(29) 为真），没谈成就原样留着，下次再来照算；「替平一指杀了他」
  -- 那一支 team(29) 恒假，自然不会给一个已经死了的人加分。四条入队支（E304/E306/E307/E308）都算。
  {pid=29,event=304,also={306,307,308},                                               -- 田伯光居（场景59格0）：入队谈成时他自陈「万里独行」的由来与自己那条不改口的规矩
   lines={{29,'兄弟，丑话说在前头。江湖上叫我万里独行，不是因为我脚程快，是因为没人肯跟我同路。'},
    {0,'那你为何肯跟我同路？'},
    {29,'你没跟我讲道理。讲道理的那些人，刀还没拔就先念一段经，我听不下去。'},
    {-1,'（他把刀横过来在袖口上蹭了两下。刀背上有一道豁口，他蹭得很仔细，像是这豁口比刀刃还要紧。）'},
    {29,'还有一句：我田伯光说出口的话，从来不改。你哪日要我走，说一声就是。'}}},
  {pid=48,event=557,also={588,589},bound=true,                                        -- 破庙（场景62）：主角打退星宿派与铁丑之后，他自陈冰蚕的出处（原版 2105 本就是他说的）
   proof=function() return atD(62,3,2,558) or atD(62,3,2,561) or seen(48) or seen(47) end,
   lines={{48,'公子方才救的是阿紫姑娘，不是小的。小的不值当。'},                       -- 不写 done：bound=true 时 present 恒真，done 只会多一层 before 比对的风险
    {0,'我出手的时候，没分谁值当谁不值当。'},
    {48,'那也谢过公子。那冰蚕的事，公子别听阿紫姑娘的——是小的自己贪，自己吸的，怨不得旁人。'},
    {-1,'（他说这话时始终侧着身子，脸朝着阿紫站的那个方向；阿紫一句也没往这边看。）'}}},
  {pid=51,event=493,bound=true,done=function() return atD(52,1,2,572) end,            -- 燕子坞（场景52格1）：交出大燕传国玉玺，他当场食言、再要世系图表（原版 1753／1755）
   proof=function() return atD(52,1,2,572) or atD(52,1,2,494) or atD(52,1,2,985) or seen(51) end,
   lines={{51,'阁下别急着恼。玉玺是真的，我的话也是真的——只是话要分几次说，才作得了数。'},
    {0,'慕容公子这是把在下当作可以分几次使唤的人。'},
    {51,'我自小学的就是这个。家父临终只交代一句：燕国的事，一步都不能错。'},
    {-1,'（他把玉玺捧在手里看了很久，看的不是玉，是底下那几个字。廊下那位姑娘要上前，被他一个眼色止住了。）'}}},
  -- 157 审核：原来的 done 判 69/0 或 69/1 写成 445，可那是「没有当场入队」才留下的痕迹；
  -- 玩家当场答应入队时走的是另一支，done 恒假 ⇒ 答应入队反而拿不到这一拍。bound=true 时 present 恒真，
  -- 而 E444 一旦跑完必然已念过原版 1563–1571（war69 打输是 instruct_15(83) 直接 game over，没有「没念就跑完」的支），
  -- 所以不需要 done 兜底；与 pid=44 的 E568 同口径，只留 proof 供旧档推断。
  {pid=61,event=444,bound=true,                                                       -- 白驼山（场景69）：war69 输给你之后，他自报白驼山少主与叔父（原版 1563–1571）
   proof=function() return atD(69,0,2,445) or atD(69,1,2,445) or seen(61) end,
   lines={{61,'输了就是输了，我欧阳克认。白驼山的规矩：认输的人，不许再提上一场。'},
    {0,'白驼山还有规矩？'},
    {61,'当然有。我叔父定的——出门在外，白驼山的人可以横，不能露怯；可以输，不能赖。'},
    {-1,'（他把折扇收起来，两手规规矩矩背在身后，站得笔直。这个姿势他大约练了很多年。）'}}},
  -- 王语嫣这一拍她还没入队，原版此处一律以头像代号 109 显示「???」。四句全部写成旁白且不出现姓名，
  -- 所以无论 JY.Person[76]['头像代号'] 是不是 109，都不会提前把名字打出来（companion156 2.4 的核对因此不再是前置）。
  {pid=76,event=573,bound=true,done=function() return atD(51,14,2,527) end,           -- 燕子坞：她当着表哥的面顶了一句（原版 1786→1787「住嘴！」）
   proof=function() return atD(51,14,2,527) or seen(76) end,                          -- E573:末 把丐帮(51)格14 改为 527／531，全脚本唯一写入
   -- 157 审核：慕容复那拍（同挂 E573）末句已经写过「他去收那卷图表」，这里不再复述他的动作，直接落到她身上。
   lines={{-1,'（屋里只剩收拾图表的窸窣声。廊下那位姑娘还站在原处——方才顶撞的那一句，没有一个人接。）'},
    {0,'姑娘方才那句，在下听见了。'},
    {-1,'（她摇了摇头，意思是不必提。走到门口又停住，低声补了一句：各家的招式我大都记得，公子若遇上说不出名目的路数，不妨说来听听。）'}}},
 }
 -- One event can carry several people's beats (E33 胡斐＋程灵素, E95 胡青牛＋王难姑, E436 杨过＋小龙女,
 -- E546 虚竹＋阿紫), and one beat can hang on either of two source events (E103/E104, E288/E289).
 local BEATS={}
 local function register(list,value)
  for _,k in ipairs(list) do
   k.value=k.value or value
   local ids={k.event};for _,id in ipairs(k.also or {}) do ids[#ids+1]=id end
   for _,id in ipairs(ids) do BEATS[id]=BEATS[id] or {};local row=BEATS[id];row[#row+1]=k end
  end
 end
 register(KNOTS,RULES.knot);register(TIES,RULES.tie)
 -- 六脉神剑“已学上乘内功”名单：九阳真经95、易筋经43、九阴真经94、小无相功40、神照经42、
 -- 北冥神功（招式29）、罗汉伏魔神功（泥偶内层41）。神照经算：连城诀中以内力深厚、起死回生著称，
 -- 本作与九阳同列第四档。不算：乾坤大挪移92（挪移法门，非内力根基）、葵花宝典93（阴柔速成，
 -- 与一阳指正大一路相悖）、紫霞秘笈39与洗髓经44（本作第三档）、泥偶外层41。
 local UPPER={95,43,94,40,42}
 local function knowsUpper()
  for _,book in ipairs(UPPER) do if api.rank(0,book)>0 then return true end end
  return api.attackRank(0,29)>0 or api.luohanInner(0) and api.rank(0,41)>0
 end
 -- Lines are 155b first drafts (editorial/好感度系统v1_155.md 第十节). {speaker pid, text}; speaker -1 is narration.
 -- lines: the teaching itself (after the confirmation); after: the teacher's remark once the art is learned.
 -- place (令狐冲): the lesson opens only after the 思过崖 demonstration, played there with him in the party.
 local LESSONS={
  [58]={{skill=57,book=77,kind='full',lines={{58,'重剑无锋，大巧不工。这路剑法不在招式花巧，而在力随心生。你且接我三剑，记住这股劲。'},{0,'……好沉的剑意。'},{58,'往后慢慢磨罢。剑是死的，力道是你自己的。'}},after={58,'练熟了也莫到处显摆。重剑是拿来护人的，不是拿来吓唬人的。'}}},
  [35]={{skill=61,book=79,kind='partial',sword=50,
   place={scene=81,name='华山思过崖',lack='要讲九剑，得去华山后山的思过崖。崖洞石壁上刻着不少剑招，正好拿来给你比划。',lines={
    {35,'当年我在这崖上面壁，闷得发慌，倒在后洞石壁上看了不少各派剑招。'},
    {35,'你瞧这一路：出剑之前，肩头先沉，手腕后缩。高手也好，庸手也罢，一招之出，总有些征兆。'},
    {0,'……征兆在他出手之前？'},
    {35,'正是。太师叔说要料敌机先。看准他下一步，便不必与他拆招，只攻他非救不可之处。'},
    {-1,'（令狐冲折了一根树枝，对着石壁上的剑招逐一比划，每一下都点在出招人破绽将露未露之处。）'},
    {0,'原来剑招不是拿来记的。'},
    {35,'哈哈，你比我当年灵光。只是我自己也只学到皮毛，能教你的，不过一招半式。'}}},
   lines={{35,'好，你既看明白了，我便把破剑式里的几路变化说与你听。悟得几分，全凭你自己。'},{0,'多谢令狐兄。'}},
   after={35,'今日这一课，可值一坛好酒。下回路过酒家，你请。'}}},
  [53]={
   {skill=30,book=66,kind='partial',mp=600,internal=true,lines={{53,'六脉剑气以内力为本，我这几路也是时灵时不灵。少商剑最是古朴，你先试着引气至拇指。'},{0,'指尖……果然有些发热。'},{53,'你内力比我当年扎实，只是剑气难收，切莫在人前逞强。'}},after={53,'剑气伤人，兄弟慎用。伯父常说，武功是护身的，不是逞强的。'}},
   {book=47,kind='aptitude',aptitude=50,lines={{53,'这步法按易经六十四卦的方位走，先记步子，再调呼吸。'},{53,'别一口气走完，免得气血翻涌。'}},after={53,'说来惭愧，这步法我多半是拿来逃命的。'}},
  },
  [1]={{skill=67,book=84,kind='full',lines={{1,'胡家刀法讲究一个快字，却又不能只图快。这是我胡家的刀诀，你是自家兄弟，教你无妨。'},{0,'……我记下了。'},{1,'刀谱上的字是死的，出刀要看对手。先把起手几式练熟。'}},after={1,'练刀辛苦，莫偷懒。哪天让我瞧瞧你的刀快不快。'}}},
  [9]={
   {skill=92,book=95,kind='full',lines={{9,'九阳真经的心法，是我在昆仑山谷中得来的，也算机缘。先从调息练起，不可急于求成。'}},after={9,'练功时若觉得周身发烫，便停一停，莫要硬撑。'}},
   {skill=2,kind='full',fist=10,lines={{9,'太师父教的长拳，最能扎根基。一拳一式，贵在不急。'}},after={9,'太师父说过，拳招学会了，还要学会几时不出拳。'}},
  },
  [49]={{skill=3,kind='full',fist=10,lines={{49,'小僧在少林所学不多，这套罗汉拳是入门的功夫，大哥莫嫌粗浅。'}},after={49,'师父说，罗汉拳练的是心定。拳打得慢些不打紧，心不能乱。'}}},
  -- 155c: 混元掌 has no manual anywhere (穆人清 taught it to 袁承志, 《碧血剑》3), so this adds no second road to a book.
  -- Full like 武当长拳／罗汉拳 (tier 2); 拳掌≥20 is a suggested value. Other companions: editorial 第十二节.
  [54]={{skill=7,kind='full',fist=20,lines={{54,'这路混元掌，是当年师父在华山上一掌一掌教我的。掌上练的是外功，练得久了，内力也跟着长起来。'},{54,'你站稳了，一掌推出去，不求快，只求劲力送到尽头。'},{0,'……掌力送到尽处，丹田里竟跟着一热。'},{54,'这便对了。每日走上几遍，莫要心急。'}},after={54,'混元掌练的是一口正气。练成了，莫拿它去欺负人。'}}},
 }
 -- 155b per-companion voice. views: the character-page line per tier (shown as 姓名＋句子, like LINES);
 -- ask: greeting when 请教武学 opens; lack: when a condition is missing; done: after their one art;
 -- note: character-page line once taught. invite (邀请入住山居): answer yes / wait (comes once ready()) / no,
 -- by the companion's own concern; home: talk in 小虾米居, contest: the same after the 武林帖 (E932).
 -- Companions without an entry use LINES and politely decline; only these (155c: with 袁承志, eight) can reach 100.
 local PEOPLE={
  [58]={views={'独臂负在身后，冷眼瞧你，话不多说半句。','偶尔与你说几句俏皮话，看得出已不把你当外人。','说你这人不装腔作势，对他的脾气，遇事肯与你商量。','把你当兄弟，肯说起古墓里的日子，说起龙儿时神色也柔和了。','说你的事便是他杨过的事，谁要动你，先问过他手里的重剑。'},
   ask='想学我的剑？我这点本事，大半是在山谷里跟雕兄过招逼出来的。你说罢。',lack='你眼下还接不住这剑。该练的根基先练扎实，再来找我。',done='能教的我都教了，剩下的功夫，得你自己去磨。',note='杨过隔些日子便要试试你剑上的力道。',
   invite={answer='no',reply={{58,'兄弟的心意，我领了。只是我和龙儿分开得太久，如今只想守着她过些清静日子。'},{58,'你几时想来看我们，只管来寻，门总给你留着。'}}}},
  [35]={views={'嘻嘻哈哈与你说笑，心里却还没把你当朋友。','说你酒量虽浅，为人倒还爽快。','与你称兄道弟，有好酒总记得分你一碗。','把你当知交，肯说起华山上的小师妹，也说起思过崖面壁的日子。','说你是他令狐冲过命的朋友，有酒同醉，有难同当。'},
   ask='我这点剑法是太师叔所传，他老人家不喜张扬。不过你是自己人，说说也无妨。',lack='你先别急。九剑不是蛮练得来的，该有的底子，总得先有。',done='我肚里那点九剑，能说的都说给你了。再多，我也没参透。',note='令狐冲说起九剑时，总要补一句“我自己也没参透”。',
   invite={answer='wait',book=151,wait={{35,'住到你那里去？好是好。只是五岳剑派、黑木崖那一摊子事还没个了局，我放心不下。'},{35,'等这些事有了分晓，我提着酒来找你。'}},reply={{35,'江湖上那些事，总算有了分晓。你那里若有酒，我便去住上一阵。没有也不打紧，我自己带。'}},arrive='令狐冲提着一坛酒，如约住进了小虾米居。'},
   home={{35,'你回来得正好，这坛酒我忍了三天没开。'}},contest={{35,'华山的大会，我这华山弃徒就不去凑热闹了。你放手去打，我在家里温好酒等你。'}}},
  [53]={views={'客客气气向你作揖，说话文绉绉的，并不多谈自家的事。','说你待人有礼，是个谈得来的朋友。','与你说古论今，兴致来时还要吟上两句诗。','把你当知己，连无量山洞里那尊玉像的事也肯与你说。','说与你是生死之交，你若有难，他那时灵时不灵的剑气也要替你拼上一拼。'},
   ask='我原不爱学武，这几门功夫都是阴差阳错得来的。兄弟若用得着，我知道的都说给你听。',lack='这功夫急不得。兄弟且把根基养厚些，否则伤了自己，倒是我的罪过。',done='在下能传的已经传了，再多，我自己也摸不着门路。',note='段誉逢人便说你学东西比他快得多。',
   invite={answer='wait',book=147,wait={{53,'兄弟盛情，在下感激。只是燕子坞那边，王姑娘的事我实在放心不下。'},{53,'等这桩心事有个着落，再来府上叨扰。'}},reply={{53,'心事总算有了着落。正想寻个清静处读几卷书，兄弟家的竹林若容得下一张书案，在下便来住些日子。'}},arrive='段誉带着几卷书，如约住进了小虾米居。'},
   home={{53,'兄弟回来了？我刚读到一处妙句，正愁无人可说。'}},contest={{53,'大会上刀剑无眼，兄弟务必小心。我帮不上手，就在家里替你念几遍经罢。'}}},
  [1]={views={'抱着刀打量你，话说得直，却不肯多谈自家的事。','说你这人还算硬气，遇事不躲。','与你称兄道弟，路见不平总拉你一道去管。','把你当知己，说起了父亲胡一刀与苗大侠的那桩旧事。','说你是他胡斐过命的兄弟，刀山火海，一句话的事。'},
   ask='兄弟要学刀？胡家刀法向来不传外人。不过你不是外人。',lack='先别急着学。你手上的底子还撑不住这路刀，练扎实了再来。',done='胡家的刀诀我已经教了，余下的，全看你肯下多少苦功。',note='胡斐隔三岔五便要与你拆几招刀法。',
   invite={answer='yes',reply={{1,'我在关外那间屋子，冬天雪能埋到门槛，一个人守着也没意思。去就去，只一件——你那院子得容得下我练刀。'}}},
   home={{1,'兄弟回来了？正好，我在院里练了半日刀，手上还热着，陪我拆两招再喝酒。'}},contest={{1,'这大会是你一个人的事，我不去添乱。打赢了回来喝酒，打输了也回来喝酒。'}}},
  [9]={views={'待你温和有礼，只是心里还存着几分防备，不多说自己的来历。','见你受了伤总要替你把把脉，说你是个厚道人。','与你无话不谈，说起医理药性来滔滔不绝。','把你当知己，肯说起冰火岛上的义父和武当山的太师父。','说冰火岛那件事他一辈子记着，你有什么事，他绝不推辞。'},
   ask='公子想学什么？我会的功夫杂得很，多半是机缘巧合得来。能教的，我尽量教。',lack='练功最忌心急。公子眼下还差些火候，勉强练了，只怕伤及经脉。',done='我已教过公子一门，再教，便要乱了公子自己的路数。',note='张无忌时常替你把脉，看你内息练得如何。',
   invite={answer='wait',book=155,wait={{9,'公子的好意，我心领了。只是光明顶上的事还没个了结，教中兄弟都在等我。'},{9,'等这些事安顿好了，我一定来。'}},reply={{9,'教中的事总算安顿好了。说实话，我倒羡慕公子这样的清静日子。你若不嫌我整日捣鼓草药，我便来住下。'}},arrive='张无忌背着一篓草药，如约住进了小虾米居。'},
   home={{9,'公子回来了，先让我看看有没有受伤。'}},contest={{9,'大会上高手云集，公子若受了内伤，千万别硬撑。我在家里备着药，等你回来。'}}},
  [49]={views={'双手合十，唤你一声施主，说话小心翼翼。','说你是个好人，只是见你出手时，总要低声念一句佛。','已改口唤你大哥，遇事肯听你拿主意。','把你当知己，悄悄说起珍珑棋局和那位老前辈传功的事，说到一半又念阿弥陀佛。','说大哥待他恩重如山，他虽是出家人，也愿舍了性命相护。'},
   ask='小僧……小僧会的功夫，大半是老前辈硬塞给我的，说不清来路。只有少林的入门拳法，是规规矩矩学来的。',lack='大哥莫急，师父说练拳先练心。底子不够，小僧也不敢乱教。',done='小僧会教的，只有这一路拳。再教，便要误人子弟了。',note='虚竹做早课时，总要拉你把罗汉拳走上一遍。',
   invite={answer='yes',reply={{49,'出家人云游四方，到处挂单。大哥家里若有一间空屋，小僧便在那里挂单罢。只是小僧吃素，莫要为我费心。'}}},
   home={{49,'阿弥陀佛，大哥平安回来就好。小僧煮了一锅青菜豆腐。'}},contest={{49,'比武总要伤人，小僧就不去了。大哥出手时……能留情处，便留几分情。'}}},
  [54]={views={'话不多，眼光却一直落在你的行事上，像是那第三道考验还没考完。','说你行事还守得住分寸，路上肯与你说几句华山上的旧事。','与你议论江湖是非时直言不讳，遇到不平事，总等你一道出手。','把你当知己，肯说起师父穆人清，也说起金蛇洞里那位前辈留下的遗物。','说他避世多年，肯为之再入江湖的，只有你这个小兄弟。'},
   ask='小兄弟想学什么？袁某会的多是笨功夫，要一天一天磨出来，急不得。',lack='根基还浅。混元掌由外练内，底子不够就硬练，只会伤了自己。先去把拳脚磨一磨。',done='袁某能教的已经教了。往后是打是练，全看你自己。',note='袁承志每日清早都要看你把混元掌走上几遍。',
   invite={answer='no',reply={{54,'小兄弟的心意，袁某领了。只是我在海外住惯了清静，这一趟江湖走完，还是回浡泥岛去。'},{54,'你几时渡海来，岛上总有一碗酒等着你。'}}}},
  -- 155n（审计 P3a）：石破天有语音无传授是明确半成品。太玄神功按合议归 C 类不传，所以只补看法句与一句明说。
  [38]={views={'跟着你走，也不大问要去哪里。你说停，他就停。','把你给的干粮分一半揣着，说留给路上遇见的人。','听说要打架，先挡在你前头，回头才想起问打的是谁。','夜里守着火堆不肯睡，说你睡熟了他才敢打盹。','说他这辈子就认得几个人，你是不会骗他的那一个。'},
   ask='好兄弟要学什么？我……我不大会教人。',lack='我念的那些字，自己也说不上来是什么意思。',done='我念的那些字，自己也说不上来是什么意思，教不了你。',note='石破天蹲在阶前，一笔一画照着墙上的影子比划。',
   invite={answer='yes',reply={{38,'好啊！我从小跟妈妈住在山里，后来也不知道哪里才算是家。好兄弟你那里要是有地方，我就去住。我会劈柴，也会烧饭。'}}},
   home={{38,'好兄弟，你回来啦！今天院子外头跑过一条黄狗，我还以为是小黄。'}},contest={{38,'大会的事我不大懂，可你一定要平平安安回来。我在门口等你。'}}},
  -- ===== 155d（B 批）：十位主要队友。本批不新增传授（理由见 editorial 第十二节 12.3），
  -- 所以这里只有五档看法句、入住回应与家中台词；ask/lack/done/note 留白，请教按钮照旧不出现。
  [2]={views={'说话不紧不慢，字字有分寸，只是从不提自己的事。','肯替你查看伤处，末了添一句“下回小心些”。','路上遇着草药必采，说迟早要用在你身上。','把你当知己，肯说起师父毒手药王，也说起药王庄那些烂帐。','说你的性命也算她半条，你若出事，她这一身本事就白学了。'},
   invite={answer='yes',reply={{2,'药王庄的烂帐了了，师父也不在了，我留在这里不过是守着一屋子药。你那处若有间空屋，我把药炉搬过去。'}}},
   home={{2,'回来了？把手伸出来我瞧瞧。'}},contest={{2,'大会上人多手杂，防身的药我配了三包，放在你行囊最上头。'}}},
  [16]={views={'看你一眼便知你近来睡得好不好，问诊之外一句闲话也无。','肯替你把脉开方，说你这体格还算经得起折腾。','与你论起医理便收不住口，药箱也肯让你翻。','把你当知己，连当年立誓不救外人的缘由也肯细说。','说你救的是他一家，往后你身上的病痛，他管到底。'},
   invite={answer='no',reply={{16,'少侠好意，胡某心领。只是病人找得到蝴蝶谷，未必找得到你那里。'},{16,'我这把年纪，挪不动了。你若有恙，来谷里便是。'}}}},
  [17]={views={'打量你时先看你的手，像在估摸你经不经得起她的毒。','肯把解药先递给你，说“省得你乱吃东西”。','与你说起用毒的分寸，说毒与药原本是一回事。','把你当知己，肯说起她与师兄斗了半辈子的那些旧事。','说这世上肯把她的话听完的人不多，你是其中一个。'},
   invite={answer='no',reply={{17,'我那师兄一个人在蝴蝶谷，不出三日就要把药园糟蹋了。我还是回去看着他。'}}}},
  [25]={views={'笑吟吟地看你，话里带钩，句句都在试你。','肯敬你一碗五宝花蜜酒，说你喝得倒也爽快。','遇着险处总走在你前头，说她的蛊虫探得出深浅。','把你当知己，肯说起苗疆的规矩，也说起五毒教那些旧仇。','说苗家女子认准一个人便是一辈子，你这朋友她认了。'},
   invite={answer='no',reply={{25,'公子这是要把一教之主拐走么？苗疆那几千号人，可不答应。'},{25,'你几时来五毒教，我给你留一坛好酒。'}}}},
  [36]={views={'眼神总落在别处，客气得很，防备也重。','肯与你练几趟剑，输了也不恼。','把福威镖局的旧事说与你听，说到一半便停住。','把你当知己，肯说起爹娘，也肯说起自己夜里睡不着。','说他这条命是你从青城派手里拿回来的，你要用，只管开口。'},
   invite={answer='no',reply={{36,'多谢。只是福州那边，爹娘的坟还没修，镖局的匾还斜挂着。'},{36,'那些事，得我自己去做。'}}}},
  [37]={views={'低着头跟在你身后，问一句答一句，怕给你惹上麻烦。','肯把干粮分你一半，说自己吃得少。','走夜路时抢在你前头，说他皮糙肉厚。','把你当知己，肯说起狱中的丁大哥，也肯说起湘西那个山洞。','说这辈子没人这样待过他，你的事就是他的事。'},
   invite={answer='yes',reply={{37,'我这人走到哪里都要连累人……你既不嫌，我就去。劈柴挑水的粗活，交给我。'}}},
   home={{37,'兄台回来了。院里的柴我劈好了，水也挑满了。'}},contest={{37,'我不会说吉利话。你……早些回来。'}}},
  [45]={views={'拱手作揖，客套周到，行医的规矩半点不肯少。','替你调理伤势时肯多说几句，说你恢复得比常人快。','与你论医论药，肯把自己写坏的方子也拿出来给你看。','把你当知己，肯说起师父苏星河，也说起逍遥派那段公案。','说少侠若有难，他这“阎王敌”的名头便替你挡上一挡。'},
   invite={answer='wait',book=147,wait={{45,'少侠盛情，老朽记下了。只是师叔既已接掌门户，托付下来的事尚未了结，老朽这做师侄的不好先去躲清闲。'},{45,'等这桩了了，老朽便来。'}},
    reply={{45,'逍遥派的门户总算清了。少侠家中若容得下一间药庐，老朽便来叨扰。'}},arrive='薛慕华挑着两只药箱，如约住进了小虾米居。'},
   home={{45,'少侠回来了，且坐下让老朽看看脉。'}},contest={{45,'比武场上最怕的不是外伤，是内伤。老朽在家备着药，少侠只管去。'}}},
  [47]={views={'斜着眼打量你，嘴上不饶人，偏偏又不肯走远。','捉弄了你两回，见你不恼，反倒有些没趣。','路上什么都要问你一句，问完又添一句“我才不是关心你”。','把你当知己，肯说起星宿海那些年，也说起她偷神木王鼎的事。','嘴上仍旧刻薄，你若受了伤，她比谁都急。'},
   invite={answer='no',reply={{47,'住到你那儿去？我才不。你那地方连个热闹也没有。'},{47,'……不过你哪天病得起不来床，我大概会去看你一眼。'}}}},
  [59]={views={'神色淡淡的，你说十句她答一句，也不觉得失礼。','记住了你的名字，路上遇着蜂群会提醒你避开。','肯与你说起古墓里的日子，说得很慢，一件一件。','把你当知己，肯说起独居绝情谷底时的心事。','说你于她与过儿有恩，你要她做的事，她不会推辞。'},
   invite={answer='no',reply={{59,'多谢你。只是我与过儿说好了，往后不再分开。'},{59,'你若想来，古墓的门是开着的。'}}}},
  [63]={views={'举止娴静，说话客气，问什么答什么，不多一字。','肯替你画沿途的地形图，说画着也不费事。','遇上看不明白的布局总先看你一眼，等你开口再说。','把你当知己，肯说起师父黄岛主，也说起一个人住惯了的清静。','说她本以为一辈子就这样过去了，是你让她多走了这许多路。'},
   invite={answer='yes',reply={{63,'我一个人在这儿住惯了，也闷惯了。公子既然开口，我便去住些日子。'}}},
   home={{63,'公子回来了。我在院里摆了几块石子，你进门时绕开了，可见是记住了。'}},contest={{63,'大会上的路我替你想不了，人心的路也一样。公子自己留神。'}}},
  -- ===== 156：本批不新增传授，ask/lack/done/note 一律留白，请教按钮照旧不出现 =====
  [28]={views={'诊过你的脉便再无别话，连句寒暄也懒得敷衍。','肯多问一句你伤在何处，说你这身子还经得起折腾。','替你配药时会讲明分量与忌口，讲完又补一句「记不住就别乱吃」。','把你当知己，肯说起那条规矩是为谁立的，也说起自己医不了的那几回。','说他这一生只信规矩，如今多信一个人；你若躺下了，他这「杀人名医」四个字便只剩前两个不认。'},
   invite={answer='no',reply={{28,'搬去你那里？不成。我这屋子死过人，也活过人，规矩是在这屋里立的，挪出去就立不住了。'},{28,'你哪日伤了、病了，自己走得动就走过来；走不动，叫人来喊我。'}}}},
  [44]={views={'瞪着眼上下打量你，嘴里还在嘀咕排名的事。','跟在你后头走，隔一阵便要问一句「师父，咱们几时再打一架」。','路上遇着硬手先冲上去，打完了回头讨一句好。','把你当知己，肯说起他为「老二」「老三」两个字跟人拼过多少回命。','说他这辈子只跪过一个人，师父的话就是话，你说往东他绝不往西。'},
   invite={answer='yes',reply={{44,'师父叫住哪儿就住哪儿，徒弟还能挑地方？'},{44,'万鳄岛那潭子我托人看着。你那院子若有恶客上门，交给我。'}}},
   home={{44,'师父回来啦！院门口我守了一天，一个生人也没放进来。'}},
   contest={{44,'大会我不去。去了人家又要念我的名次，念得我火起，反倒坏你的事。你只管打，打输了回来我替你出气。'}}},
  -- ===== 156 邪线五人：本批不新增传授，ask/lack/done/note 一律留白，请教按钮照旧不出现（canAsk=false）。
  -- 五人各自的说话方式必须分得开：田伯光油滑直白、游坦之自称「小的」、慕容复句句掂量、
  -- 欧阳克摆少主的款、王语嫣只在说武学时多话。一句恭顺语气也不要加。
  [29]={views={'斜眼打量你，话里带着试探，末了问一句「兄弟，你到底想干什么」。','肯把酒葫芦先递给你，说你这人还算痛快。','路上遇着拦道的先亮刀，打完了回头问你留不留活口。','把你当知己，肯说起江湖上没人肯与他同路的那些年。','说他这一辈子答应过的事没有一件反悔；你开口要他做的，他做。'},
   invite={answer='yes',reply={{29,'住你那儿？行啊。不过丑话说在前头：我在你家住着，方圆三十里内我不动手。'},{29,'出了三十里，你管不着，我也不跟你说。'}}},
   home={{29,'回来啦。院门口那条路我走熟了，三十里内太平得很。'}},
   contest={{29,'大会我不去。我这名头往场子里一站，你还没打就先输了三成。'}}},
  [48]={views={'低着头站在阿紫身后，你问十句他答一句。','肯替你背东西，说他力气还使得。','遇着险处先挡在前头，挡完了先看阿紫在不在。','把你当知己，肯说起铁罩底下那张脸，也肯说起冰蚕是怎么吸进去的。','说他这条命早不算数了，你若用得着只管使；只有一件事他不肯听——不许难为阿紫姑娘。'},
   invite={answer='no',reply={{48,'小的不能去。阿紫姑娘在哪儿，小的就在哪儿。'},{48,'公子哪天寻不着人使唤，捎个信，小的赶过去。'}}}},
  [51]={views={'还礼还得周全，眼睛却在算你身上有几分可用。','肯与你谈两句家世来历，谈完便把话头收住。','遇上大事先问你的主意，问完自己另有一套。','把你当知己，肯说起慕容氏几十代人奔的是什么，说完又添一句「与阁下无干」。','说这一程他少算计了一个人，就是你；至于这算不算交情，他不肯说。'},
   invite={answer='no',reply={{51,'多谢。只是在下若住进别人家的屋檐下，燕国的事就真的没人提了。'},{51,'阁下若有用得着慕容氏的地方，捎个信到燕子坞——只要不误我的正事。'}}}},
  [61]={views={'摇着折扇打量你，话说得漂亮，句句不落实处。','肯与你论几路掌法，输了就把扇子收起来。','路上遇着硬手先报白驼山的名号，报完才动手。','把你当知己，肯说起叔父定下的那些规矩，也说起自己守不住的那几条。','说白驼山的人认下的交情不改口，你开口的事他不推；至于要他改脾性，那是另一回事。'},
   invite={answer='no',reply={{61,'公子这是要白驼山的少主住到别人屋檐下？传出去我叔父的脸往哪儿搁。'},{61,'你若上西域来，白驼山的门开着，酒也管够。'}}}},
  [76]={views={'客客气气应一声，多余的话一句也没有。','见你使错了招式会提醒一句，提完便不再多说。','肯替你拆解遇上的各家路数，说到武学才多说几句。','把你当知己，肯说起表哥，也肯说起自己记得那么多招式却一招也使不出。','说公子肯听她把一路剑法讲完，这在她是头一回；你要问的，她知无不言。'},
   invite={answer='no',reply={{76,'多谢公子。只是我认得的那些武学都在书上，书在燕子坞，我离不得太久。'},{76,'公子若遇上说不出名目的招式，写下来捎给我，我替公子查。'}}}},
 }
 -- 155c 似曾相识: one narration per companion on the first join of a cycle when last cycle reached 知己.
 -- A gesture only: no value, promise, romance or residence comes back, and nobody says "have we met"
 -- (the first-meeting dialogue belongs to the backstory layer). Written to fit every first-join event.
 local FAMILIAR={
  [1]='（胡斐收好了刀，顺手替你提起行囊，走出两步才一愣，像是这件事他从前做惯了。）',
  [2]='（程灵素收拾药箱时，不问一声便多包了一份金创药放在你手边，包好了才想起，你并没有受伤。）',
  [9]='（张无忌上路前替你搭了搭脉，指下停了一停，神色有些恍惚，仿佛这脉象他早就摸熟了。）',
  [16]='（胡青牛打量你片刻，随手开了一张调理气血的方子递来。落笔之快，连他自己也皱起了眉。）',
  [17]='（王难姑分药粉时，把最烈的一包挑出来收回自己囊中，嘴里念叨“这包你拿不稳”，说完自己也怔了怔。）',
  [25]='（蓝凤凰斟了一碗五宝花蜜酒递来，见你接得毫不迟疑，眉梢一挑，笑意里多了几分说不清的熟稔。）',
  [28]='（平一指一路少言。你还未出手，他指间已捏好了一撮止血的药粉。）',
  [29]='（田伯光出门时顺手把酒葫芦抛给你，抛完才觉得古怪：自己几时对生人这样大方过。）',
  [35]='（令狐冲替你斟酒，倒得不多不少，正合你的酒量。他盯着酒碗，一时竟忘了喝。）',
  [36]='（林平之向来防人三分，随你出门时却只落后半步。这点松懈，连他自己也没有察觉。）',
  [37]='（狄云吃过太多冤枉，见人总要先躲一躲；跟在你身后时，却一次也没有回头张望。）',
  [38]='（石破天跟着你走了几步，忽然咧嘴一笑。他也说不上为什么，只觉得跟着你走路，心里就不慌。）',
  [44]='（岳老三嘴里骂骂咧咧，脚下却不知不觉落后你半步，站得规规矩矩，倒像做惯了徒弟。）',
  [45]='（薛慕华替你看过气色，提笔记医案时不假思索，一气写完，再读一遍竟无一字要改。他搁下笔，发了会儿怔。）',
  [47]='（阿紫一路东张西望，捉弄了这个又捉弄那个，偏偏没捉弄你。她自己想了想，也说不出是为什么。）',
  [48]='（游坦之一双眼只跟着阿紫，你走近时，他却不像对旁人那样缩头躲闪。）',
  [49]='（虚竹合十行礼，抬头看你时眉眼一松，像迷路许久的人，忽然认出了一段走过的山路。）',
  [51]='（慕容复看人，向来先掂量于复国有几分用处；看你时却少了几分盘算。这一瞬的松懈被他自己察觉了，暗暗皱起了眉。）',
  [53]='（段誉一路说古论今，说到兴头上转头看你，神情像是早知道你听这些不会嫌他啰嗦。）',
  [54]='（袁承志离岛时回望了一眼，再看向你，神色间有几分放心，仿佛早料到这趟江湖要与你同走。）',
  [58]='（杨过走在你身侧，风吹起空荡荡的袖管，他却没有像对旁人那样侧身遮掩。）',
  [59]='（小龙女素来不爱与生人同行，出门却没有多问一句，只静静跟在你身后，仿佛这条路本就该由你来领。）',
  [61]='（欧阳克摇着折扇打量你，一句轻浮话到了嘴边又咽了回去，只干笑一声，像是早在你手上吃过亏。）',
  [63]='（程英出门前在屋前随手摆了几块石子，回身时见你已绕开了阵眼，她轻轻“咦”了一声，却没有多问。）',
  [76]='（王语嫣随口说起各家武学，说到一处，看了你一眼便略过不讲，倒像早知道你懂得。）',
 }
 -- Rows of BrowserStudyRequirements that describe access rather than the learner's
 -- conditions: the teaching itself is the access, and slots/caps are checked here.
 local ACCESS_ROWS={person=true,inheritance=true,slots=true,rank=true,affinity=true,other=true,experience=true,health=true}
 local canInvite                            -- defined with 邀请入住 below; the full-affinity notice needs it too
 local function state() return api~=nil and growth~=nil and growth.affinity or nil end
 local function record(pid)
  local a=state();if not a or not COMPANION[pid] then return nil end
  local key=tostring(pid);local r=a.persons[key]
  if not r then r={value=0,joined=false,wins=0,bond=false,events={}};a.persons[key]=r end
  return r
 end
 -- 155n（审计 P3b）：实玩一周目三个传授名额一个没用——满好感只写在人物页里，没人会去翻。
 -- 好感刚满的那一次当场说一句，指向人物页；每程每人一次，只在本次运行内记，不写存档。
 local fullNotice=nil
 -- 156 审查：提示原本在 add() 里当场弹出，于是「已是生死之交」这条框会抢在触发它的那段心结对白之前，
 -- 读起来像先宣布结果再演过程。改为记下待播，由调用点在对白说完之后再冲掉。
 local pendingFull=nil
 local function flushFull() local pid=pendingFull;pendingFull=nil;if pid and fullNotice then fullNotice(pid) end end
 local function add(pid,delta)
  local r=record(pid);if not r then return 0 end
  local before=r.value;r.value=math.max(0,math.min(RULES.max,r.value+delta))
  -- 155d: a beat can be lived through before this companion ever travels with you (E41 药王庄, E95 蝴蝶谷…),
  -- so the 知己 mark — the only thing a cycle leaves behind — waits until they have actually joined.
  if r.joined and r.value>=RULES.bond then r.bond=true end
  local gained=r.value-before
  if gained>0 and r.value>=RULES.max and fullNotice then pendingFull=pid end
  return gained
 end
 local function tier(value)
  local index=1;for i,row in ipairs(RULES.tiers) do if value>=row[1] then index=i end end
  return index,RULES.tiers[index][2]
 end
 -- Old growth saves have no record: start from what the source world already proves,
 -- i.e. who has joined (in the party or holding a growth record) and which knot events
 -- are complete. Past victories and moral history are unknown and are not invented.
 local function prepare(fresh)
  if not api or not growth then return nil end
  if growth.affinity then return growth.affinity end
  growth.affinity={version=1,persons={},slots={},caps={},aptitude={},familiar={}}
  -- A new game (LoadRecord(0)) has nobody recruited and no finished event to read.
  if fresh then return growth.affinity end
  for pid in pairs(COMPANION) do
   if team(pid) or growth.persons[tostring(pid)] then local r=record(pid);r.joined=true;add(pid,RULES.join);flushFull() end
  end
  -- 155d: only beats whose source event itself needs that companion present (or needs nobody) can be inferred;
  -- the rest are marked infer=false, because an old save cannot prove who was walking beside the hero that day.
  for _,list in ipairs({KNOTS,TIES}) do
   for _,k in ipairs(list) do
    local proof=k.proof or k.done
    if proof and k.infer~=false and proof() then
     local r=record(k.pid);r.events[tostring(k.event)]=true
     if r.joined then add(k.pid,k.value);flushFull() end
    end
   end
  end
  return growth.affinity
 end
 BrowserAffinityPrepare=prepare
 BrowserAffinityRules=function() return RULES,KNOTS,LESSONS,PEOPLE,FAMILIAR,TIES end
 local loaded=LoadRecord
 LoadRecord=function(id,...)
  local result=table.pack(loaded(id,...))
  prepare(id==0)
  return table.unpack(result,1,result.n)
 end
 local started=NewGame
 NewGame=function(...)
  local result=table.pack(started(...))
  local a=prepare(true)
  if a and type(browser_echo_record)=='function' then
   local echo=browser_echo_record(false)
   local bonds=type(echo)=='table' and type(echo.growth)=='table' and echo.growth.bonds
   if type(bonds)=='table' then
    for key,held in pairs(bonds) do local pid=tonumber(key);if held==true and COMPANION[pid] then a.familiar[tostring(pid)]=true end end
   end
   persist()
  end
  return table.unpack(result,1,result.n)
 end
 -- The ending's echo carries the hero record; add only who reached 知己 (never values).
 local echoRecord=BrowserGrowthEcho
 BrowserGrowthEcho=function(pid)
  local m=echoRecord(pid);local a=pid==0 and m and state()
  if not a then return m end
  local bonds,any={},false
  for key,r in pairs(a.persons) do if r.bond==true then bonds[key]=true;any=true end end
  if not any then return m end
  local copy={};for k,v in pairs(m) do copy[k]=v end;copy.bonds=bonds
  return copy
 end
 local joinParty=instruct_10
 instruct_10=function(pid,...)
  local was=team(pid)
  local result=table.pack(joinParty(pid,...))
  local a=state()
  if a and COMPANION[pid] and not was and team(pid) then
   local r=record(pid)
   if not r.joined then
    r.joined=true;add(pid,RULES.join);flushFull()
    -- 155c: a per-companion narration (FAMILIAR) replaces the one generic line.
    if a.familiar[tostring(pid)] and FAMILIAR[pid] and type(DrawStrBoxWaitKey)=='function' then DrawStrBoxWaitKey(FAMILIAR[pid]) end
   end
   persist()
  end
  return table.unpack(result,1,result.n)
 end
 if type(WarMain)=='function' then
  local war=WarMain
  WarMain=function(...)
   local result=table.pack(war(...))
   if result[1] and state() and next(echoes)==nil then
    for i=1,CC.TeamNum do
     local pid=JY.Base['队伍'..i]
     if pid and pid>0 and COMPANION[pid] then
      local r=record(pid);local gain=math.min(RULES.win,RULES.winCap-r.wins)
      if gain>0 then r.wins=r.wins+gain;add(pid,gain);flushFull() end
     end
    end
    persist()
   end
   return table.unpack(result,1,result.n)
  end
 end
 if type(instruct_37)=='function' then
  local moral=instruct_37
  -- 156 审核：这一钩原来只罚不补、而且全程静默——两次标志性邪行就能把正派队友的好感砸穿，
  -- 玩家既不知道是谁掉了、掉了多少，也没有任何挽回的余地，等于把「品德低」直接判成「坏人」。
  -- 改两处：①品德回升同样按系数补回，最多补到本程因品德掉过的总额（记在好感记录自己的 moralLost 上，
  -- 可选字段、旧档没有也照常跑）；②加减都出一句提示，说清是谁、多少、为什么。
  instruct_37=function(v,...)
   local before=JY.Person[0]['品德']
   local result=table.pack(moral(v,...))
   local delta=JY.Person[0]['品德']-before
   if math.abs(delta)>=RULES.moralDrop and state() then
    local amount=math.min(RULES.moralMax,math.abs(delta)*RULES.moralFactor)
    local names,moved={},0
    for i=1,CC.TeamNum do
     local pid=JY.Base['队伍'..i]
     if pid and pid>0 and RIGHTEOUS[pid] then
      local r=record(pid)
      if r then
       local lost=r.moralLost or 0
       local step=amount
       if delta>=0 then step=math.min(step,lost) end
       -- 157 审核：原来在调用 add 之前就无条件 lost=lost+step 记满，可 add 会把好感钳在 0..100。
       -- 于是「账上记了 24、实际只掉了 15」，回升时按 24 退 ⇒ 作过恶又回头的队友比一路行善的还高，
       -- 与本钩自己的注释「最多补到本程因品德掉过的总额」正相反，也把邪行变成了后期刷好感的前置。
       -- 改成按 add 的实际返回值记账（add 返回 r.value-before），账面与实际就永远对得上。
       local moved1=step>0 and add(pid,delta<0 and -step or step) or 0
       if delta<0 then lost=lost+math.abs(moved1) else lost=lost-math.abs(moved1) end
       -- 字段只在真有折损时存在：归零就删掉，旧档与从未掉过品德的存档逐字节不变。
       r.moralLost=lost>0 and lost or nil
       if moved1~=0 then
        moved=moved+1;names[#names+1]=JY.Person[pid]['姓名']
       end
      end
     end
    end
    if moved>0 then
     -- 157 审核：只有一名正派队友时，「都看在眼里，各自疏远了些」是病句。按人数分写。
     local who=table.concat(names,'、')
     local text
     if delta<0 then
      text=#names>1 and ('你方才的作为，'..who..'都看在眼里，各自疏远了些。') or ('你方才的作为，'..who..'看在眼里，神色淡了些。')
     else
      text=#names>1 and (who..'看出你这一程在往回走，各自缓和了些。') or (who..'看出你这一程在往回走，神色缓和了些。')
     end
     DrawStrBoxWaitKey(text..'（品德'..(delta<0 and '' or '+')..delta..'）')
    end
    persist()
   end
   return table.unpack(result,1,result.n)
  end
 end
 local knotEvent=oldCallEvent
 oldCallEvent=function(id,...)
  local list=state() and BEATS[id]
  local before={}
  -- 156 审查：原版 instruct_15 的 game over 菜单会在事件中途 LoadRecord 并继续执行下去（E296 青城
  -- 战败即是），后处理若照跑，就会把心结结算到「刚读进来的那份存档」上——那份档里余沧海还活着，
  -- 林平之却已白拿 50 点、心结记为已用。读档会重建 growth 与 affinity 表，所以比对表身份即可挡住。
  local table0=state()
  if list then for i,k in ipairs(list) do before[i]=k.done~=nil and k.done() end end
  -- 2026-10-01：fade=true 的心结（E436 小龙女）原在整段事件之后才说——那时已黑场、她已回古墓、主角独白也播完。
  -- 改在该事件第一次 instruct_14（场景变黑）之前说；条件与下方事件后结算同一组（done 的证据 instruct_33
  -- 要到黑场后才写，所以这里只看「事前未完成」），计分仍只在事件走完后由下方照旧结算。黑化层的同类包装在
  -- 本层外面，所以次序是：道别 → 她这几句 → 杨过交代襄阳（若有）→ 黑场。事件里没有黑场时退回事件后再说。
  local spoken,fade={},nil
  if list then for _,k in ipairs(list) do if k.fade and k.lines then fade=instruct_14 end end end
  local result
  if fade then
   local told=false
   instruct_14=function(...)
    if not told then
     told=true
     for i,k in ipairs(list) do
      local r=k.fade and k.lines and state()==table0 and record(k.pid)
      if r and not r.events[tostring(k.event)] and not before[i] and (k.when==nil or k.when())
       and (k.bound==true or team(k.pid)) and r.value<RULES.max then say(k.lines);spoken[i]=true end
     end
    end
    return fade(...)
   end
   local packed=table.pack(pcall(knotEvent,id,...))
   instruct_14=fade
   if not packed[1] then error(packed[2],0) end
   result=table.pack(table.unpack(packed,2,packed.n))
  else
   result=table.pack(knotEvent(id,...))
  end
  if list and state() and state()==table0 then
   local wrote=false
   for i,k in ipairs(list) do
    local r=record(k.pid);local key=tostring(k.event)
    if r and not r.events[key] then
     local finished=(k.done==nil or (not before[i] and k.done())) and (k.when==nil or k.when())
     local present=k.bound==true or team(k.pid)
     -- A beat with lasting evidence is spent even when the companion was elsewhere (v1 rule). A beat without
     -- it (E537 擂鼓山, E539 星宿海) is only taken when they are actually there, so an idle chat never burns it.
     if finished and (present or k.done~=nil) then
      r.events[key]=true;wrote=true
      if present and add(k.pid,k.value)>0 then if not spoken[i] then say(k.lines) end;flushFull() end
     end
    end
   end
   if wrote then persist() end
  end
  return table.unpack(result,1,result.n)
 end
 -- Battle proficiency is the one rank source outside study: it stops at the same ceiling.
 local fightSub=War_Fight_Sub
 War_Fight_Sub=function(id,slot,...)
  local unit=WAR and WAR.Person and WAR.Person[id];local pid=unit and unit['人物编号']
  local p=pid==0 and type(slot)=='number' and slot>=1 and slot<=10 and JY.Person[0] or nil
  local limit=p and state() and p['武功'..slot]>0 and api.affinityCap(0,'skill:'..p['武功'..slot]) or nil
  local before,top=limit and p['武功等级'..slot],limit and limit*100-1
  if limit and before<=top and before>top-2 then p['武功等级'..slot]=top-2 end
  local result=table.pack(pcall(fightSub,id,slot,...))
  if limit then p['武功等级'..slot]=math.min(math.max(p['武功等级'..slot],before),math.max(before,top)) end
  if not result[1] then error(result[2],0) end
  return table.unpack(result,2,result.n)
 end
 BrowserAffinityAptitude=function(pid,book)
  local a=pid==0 and state();local g=a and a.aptitude[tostring(book)]
  return type(g)=='table' and g.rank or nil
 end
 -- 155 完整传承剧情接口（legacy-extension.lua：第一批思过崖风清扬、侠客岛石壁；第二批无量山洞六脉、绝情谷底黯然）。
 -- 读：此人本程好感与“似曾相识”，以及主角对该武学的一招半式上限、本程是否已得完整传承、是否曾学过。
 -- parted：本程曾达知己、此刻却不在身边的同伴（第二批黯然销魂掌的“别离”门槛，只读不写）。
 BrowserAffinityLegacy=function(pid,identity)
  local a=state();if not a then return nil end
  local r=pid and a.persons[tostring(pid)]
  local parted=false
  for other in pairs(COMPANION) do
   local o=a.persons[tostring(other)]
   if o and o.bond==true and not team(other) then parted=true;break end
  end
  return {value=r and r.value or 0,max=RULES.max,familiar=pid~=nil and a.familiar[tostring(pid)]==true,
   cap=identity and api.affinityCap(0,identity) or nil,parted=parted,
   done=identity~=nil and a.legacy~=nil and a.legacy[identity]==true,
   taught=identity~=nil and api.ensure(0).taught[identity]==true}
 end
 -- 写：只由完整传承剧情调用。记下本程已得的完整传承，并解除这一门的一招半式上限
 -- （凭书、散功重学、换老师、战斗熟练都不解除）。好感传授名额不退，与“散功不退名额”同一口径。
 BrowserAffinityLegacyGrant=function(identity)
  local a=state();if not a or type(identity)~='string' then return false end
  a.legacy=a.legacy or {};a.legacy[identity]=true;a.caps[identity]=nil;persist();return true
 end
 local studyRows=BrowserStudyRequirements
 if type(studyRows)=='function' then
  local ROOT_ROWS={['拳掌功夫']=true,['御剑能力']=true,['耍刀技巧']=true,['特殊兵器']=true}
  BrowserStudyRequirements=function(pid,id,...)
   local rows=studyRows(pid,id,...)
   -- 156：BrowserItemDetails 给的是这本书的入门门槛（它不知道学习者是谁）。canUse 的规则是
   -- 「门槛只拦零级入门」，所以这一份按人显示的要把已入门者的门类根骨行按底表原值重算，
   -- 否则界面比判定更严（gate parity）。底表原值就在 JY.Thing 里，本层从不永久改它。
   local profile=api~=nil and BrowserMartialBalance and BrowserMartialBalance.data.books[id]
   if type(rows)=='table' and profile and profile.gates and JY.Person[pid] and api.rank(pid,id)>0 then
    local keep={}
    for _,row in ipairs(rows) do
     local field=row.key
     if field and ROOT_ROWS[field] and profile.gates['需'..field] then
      local n=JY.Thing[id]['需'..field] or 0
      if n~=0 then
       local current=JY.Person[pid][field] or 0
       row.text=field..(n<0 and ' ≤ ' or ' ≥ ')..math.abs(n)..'（当前 '..current..'）'
       row.met=n<0 and current<=-n or n>0 and current>=n
       keep[#keep+1]=row
      end
     else keep[#keep+1]=row end
    end
    rows=keep
   end
   local a=pid==0 and state();local g=a and a.aptitude[tostring(id)]
   if type(g)=='table' and type(rows)=='table' then
    local now=JY.Person[pid]['资质']
    for _,row in ipairs(rows) do if row.key=='资质' then row.text='资质 ≥ '..g.rank..'（'..JY.Person[g.teacher]['姓名']..'指点；当前 '..now..'）';row.met=now>=g.rank end end
   end
   return rows
  end
 end
 local function lessonName(l)
  return l.kind=='aptitude' and JY.Thing[l.book]['名称']..'（资质指点）' or JY.Wugong[l.skill]['名称']
 end
 local function identityOf(l) return l.skill and 'skill:'..l.skill or nil end
 -- Returns missing[] (empty when ready) or nil,blocked when this lesson cannot be given at all.
 local function check(teacher,l)
  local a=state();local r=record(teacher);local hero=JY.Person[0];local miss={}
  local function need(ok,text) if not ok then miss[#miss+1]=text end end
  if l.kind=='aptitude' then
   if a.aptitude[tostring(l.book)] then return nil,'已得指点' end
   if api.rank(0,l.book)>0 then return nil,'已经练成' end
   need(r.value>=RULES.max,'好感未满（当前 '..r.value..' / '..RULES.max..'）')
   return miss
  end
  local identity=identityOf(l);local m=api.ensure(0)
  if r.taught then return nil,r.taught==identity and '已经传授' or '本程已传过一门' end
  if api.slot(0,l.skill) then return nil,'已经学会' end
  if m.taught[identity] or l.skill==92 and m.taught['book:95'] then return nil,'曾经学过，可在人物页“重拾旧学”' end
  if api.attackRank(teacher,l.skill)<=0 then return nil,JY.Person[teacher]['姓名']..'尚未练成' end
  need(r.value>=RULES.max,'好感未满（当前 '..r.value..' / '..RULES.max..'）')
  local used=0;for _ in pairs(a.slots) do used=used+1 end
  need(a.slots[identity]==true or used<RULES.slots,'好感传授名额已满（'..used..' / '..RULES.slots..'）')
  local reason=api.learningReason(0,identity);need(reason=='',reason)
  need(hero['生命']>0,'先休整恢复气血')
  -- 课目自带的拳掌/御剑/内力上限门槛与本书同一属性的门槛是并列必需（两条都要满足），
  -- 提示里只列更严的那一条；判定不变：较严的一条满足时较宽的一条必然满足，反之亦然。
  -- 书的门槛按 BrowserItemDetails 取（与 BrowserStudyRequirements 同源；传授时本人尚未入门，折算门槛照用）。
  -- 书上若是「≤」上限（负值）则不是同一种条件，两条都列。本人已学会时本函数前面已返回，折算门槛与行内一致。
  local lessonGate={['拳掌功夫']=l.fist,['御剑能力']=l.sword,['内力']=l.mp}
  local bookGate=l.book and BrowserItemDetails and BrowserItemDetails(l.book) or {}
  local function gates(field) return lessonGate[field],bookGate['需'..field] or 0 end
  local function showBookRow(field) local n,g=gates(field);return not (n and g>0 and n>g) end
  local function showLessonRow(field) local n,g=gates(field);return n~=nil and not (g>0 and g>=n) end
  if l.book and BrowserStudyRequirements then
   for _,row in ipairs(BrowserStudyRequirements(0,l.book)) do
    if not row.met and not ACCESS_ROWS[row.key] and showBookRow(row.key) then need(false,row.text) end
   end
  end
  if showLessonRow('拳掌功夫') then need(hero['拳掌功夫']>=l.fist,'拳掌功夫 ≥ '..l.fist..'（当前 '..hero['拳掌功夫']..'）') end
  if showLessonRow('御剑能力') then need(hero['御剑能力']>=l.sword,'御剑能力 ≥ '..l.sword..'（当前 '..hero['御剑能力']..'）') end
  if showLessonRow('内力') then need(hero['内力最大值']>=l.mp,'内力上限常态值 ≥ '..l.mp..'（当前 '..hero['内力最大值']..'，不计临时增益）') end
  if l.internal then need(knowsUpper(),'须已学上乘内功（九阳、易筋、九阴、小无相、神照、北冥或罗汉伏魔）') end
  if l.place then need(r.demo==true,'与'..JY.Person[teacher]['姓名']..'同上'..l.place.name..'，请他当场演示剑理') end
  return miss
 end
 say=function(lines)
  for _,line in ipairs(lines or {}) do
   if line[1]<0 then DrawStrBoxWaitKey(line[2]) elseif type(TalkEx)=='function' then TalkEx(line[2],JY.Person[line[1]]['头像代号'],line[1]==0 and 1 or 0) end
  end
 end
 local function offers(teacher)
  local a=state();local lessons=a and COMPANION[teacher] and LESSONS[teacher]
  local r=lessons and a.persons[tostring(teacher)]
  if not r or r.value<RULES.max then return 0 end
  local n=0;for _,l in ipairs(lessons) do local miss=check(teacher,l);if miss then n=n+1 end end
  return n
 end
 BrowserAffinityOffers=offers
 do
  local shownFull={}
  fullNotice=function(pid)
   if shownFull[pid] then return end
   local lessons=offers(pid)
   -- 155d: ten of the newly reachable companions have nothing to teach (editorial 第十二节), so the notice now
   -- also fires for them and points at 邀请入住 instead; without it 满好感 would again be invisible in play.
   if lessons<=0 and not canInvite(pid) then return end
   shownFull[pid]=true
   local name=JY.Person[pid]['姓名'];local her=JY.Person[pid]['性别']==1 and '她' or '他'
   if lessons>0 then
    local a=state();local used=0;for _ in pairs(a and a.slots or {}) do used=used+1 end
    DrawStrBoxWaitKey(name..'与你已是生死之交。在人物页可向'..her..'请教武学（本程传授名额已用 '..used..' / '..RULES.slots..'）。')
   else
    DrawStrBoxWaitKey(name..'与你已是生死之交。在人物页可邀'..her..'入住小虾米居。')
   end
  end
 end
 local function ask(teacher)
  local a=state();local lessons=a and LESSONS[teacher]
  if not lessons then return end
  local name=JY.Person[teacher]['姓名'];local rows,states={},{};local voice=PEOPLE[teacher] or {}
  if voice.ask then say({{teacher,voice.ask}}) end
  for i,l in ipairs(lessons) do
   local miss,blocked=check(teacher,l);states[i]={miss=miss,blocked=blocked}
   local tag=blocked or #miss>0 and '条件未满' or l.kind=='full' and '完整传授' or l.kind=='partial' and '一招半式' or '不占名额'
   rows[i]={lessonName(l)..' · '..tag,nil,1}
  end
  local n=menu(rows);local l=lessons[n];local s=states[n]
  if not l then return end
  if s.blocked then
   if voice.done and record(teacher).taught then say({{teacher,voice.done}}) end
   DrawStrBoxWaitKey(lessonName(l)..'：'..s.blocked);return
  end
  -- 155b 地点剧情: at the place, with the teacher travelling and affinity full, the demonstration plays first
  -- (whatever the hero still lacks); only then is the lesson itself open. Elsewhere he names the place.
  local r=record(teacher)
  if l.place and not r.demo then
   if JY.Status==GAME_SMAP and JY.SubScene==l.place.scene and team(teacher) and r.value>=RULES.max then
    say(l.place.lines);r.demo=true;persist();s={miss=check(teacher,l)}
   else say({{teacher,l.place.lack}}) end
  elseif #s.miss>0 and voice.lack then say({{teacher,voice.lack}}) end
  if #s.miss>0 then DrawStrBoxWaitKey('向'..name..'请教'..lessonName(l)..'，尚欠：'..table.concat(s.miss,'；'));return end
  local identity=identityOf(l);local used=0;for _ in pairs(a.slots) do used=used+1 end
  local top=l.skill and ((BrowserMartialBalance and BrowserMartialBalance.data.skills[l.skill] or {}).maxRank or 10)-1
  local ceiling=l.kind=='partial' and math.min(top,math.max(1,api.attackRank(teacher,l.skill))) or nil
  local text=l.kind=='aptitude' and '请'..name..'指点'..JY.Thing[l.book]['名称']..'的要诀？只把这一门的资质门槛放宽到'..l.aptitude..'，不改实际资质、不占好感传授名额；研习仍须持书。'
   or '请'..name..'传授'..lessonName(l)..(ceiling and '（一招半式：眼下至多修至'..ceiling..'级，随'..name..'的修为放宽，最高'..top..'级）' or '（完整传授）')..'？'..(a.slots[identity] and '' or '占用好感传授名额（已用 '..used..' / '..RULES.slots..'），散功不退。')..'每位同伴一程只传一门。'
  if not confirm(text) then return end
  say(l.lines)
  if l.kind=='aptitude' then
   a.aptitude[tostring(l.book)]={rank=l.aptitude,teacher=teacher};persist()
   DrawStrBoxWaitKey('得'..name..'指点：'..JY.Thing[l.book]['名称']..'资质达到'..l.aptitude..'即可研习（当前 '..JY.Person[0]['资质']..'）。')
   say({l.after})
   return
  end
  instruct_33(0,l.skill,1)
  if not api.slot(0,l.skill) then DrawStrBoxWaitKey('此番未能领会，好感传授名额与'..name..'的一门传授均未占用。');return end
  record(teacher).taught=identity;a.slots[identity]=true
  if l.kind=='partial' then
   a.caps[identity]={rank=top,teacher=teacher,from=math.max(1,api.attackRank(teacher,l.skill))}
  end
  api.recordTaught(0,identity);api.apply(0);persist()
  local cap=api.affinityCap(0,identity)
  DrawStrBoxWaitKey(JY.Person[0]['姓名']..'学会'..lessonName(l)..'（1级）。'..(cap and '一招半式：至多修至'..cap..'级，完整传承须日后机缘。' or '可在人物武学页选入武功栏修炼。'))
  say({l.after})
 end
 BrowserAffinityAsk=ask
 -- 155b 邀请入住山居 (editorial/好感度系统v1_155.md 第十节). Full affinity; the answer follows PEOPLE[pid].invite.
 -- persons[pid].home: resident / promised (moves in once the concern is settled, i.e. that book is in the bag) /
 -- declined. Moving in never touches the party: departure and rejoining stay the source events. Residents talk
 -- at home (札记 → 与山居住客叙话). The 武林帖 (E932 → source instruct_59) still sends everyone away and clears
 -- their old spots; residents simply stay in 小虾米居 and never fight. After it, full-affinity friends who can
 -- no longer be found may be invited by letter from home.
 local function invitation(pid)
  return (PEOPLE[pid] or {}).invite or {answer='no',reply={{pid,'多谢相邀。只是我另有牵挂，暂且不便。'}}}
 end
 -- 武道大会 slot 24 talk: 933 before the 武林帖 (same test as outfit-extension), 934 while holding it,
 -- -1 once the 帖 was shown at the gate (E935) and the tournament fought. contest=true asks for 934 only.
 local function afterInvitation(contest)
  local v=type(GetD)=='function' and GetD(25,24,2)
  if type(v)~='number' then return false end
  if contest then return v==934 end
  return v~=933
 end
 local function arrivals()
  local a=state();local came={}
  for pid=1,76 do
   local r=a and COMPANION[pid] and a.persons[tostring(pid)];local inv=invitation(pid)
   if r and r.home=='promised' and inv.book and owned(inv.book) then r.home='resident';came[#came+1]=inv.arrive or JY.Person[pid]['姓名']..'如约住进了小虾米居。' end
  end
  if #came>0 then persist() end
  return came
 end
 canInvite=function(pid)
  local a=state();local r=a and COMPANION[pid] and a.persons[tostring(pid)]
  return r~=nil and r~=false and r.value>=RULES.max and r.home==nil and next(echoes)==nil
 end
 local function invite(pid,letter)
  if not canInvite(pid) then return end
  local r=record(pid);local inv=invitation(pid);local name=JY.Person[pid]['姓名'];local answer=inv.answer
  if answer=='wait' and owned(inv.book) then answer='yes' end
  if letter then say({{-1,'（你在灯下写了一封短信，托人送往'..name..'的旧处，邀其来小居同住。）'},{-1,'（过了些时日，'..name..'的回信到了。）'}})
  else say({{0,'我那处小居屋舍简陋，倒还清静。若不嫌弃，闲时来住些日子如何？'}}) end
  if answer=='yes' then
   say(inv.reply);if not letter then say({{0,'那便说定了。'}}) end
   r.home='resident'
   DrawStrBoxWaitKey(name..'住进了小虾米居。'..(letter and '在家中即可与其叙话。' or '回家翻阅行路札记，可与住客叙话；入住不改队伍，结伴同行仍往其旧处相邀。'))
  elseif answer=='wait' then
   say(inv.wait);if not letter then say({{0,'好，我等你。'}}) end
   r.home='promised'
   DrawStrBoxWaitKey(name..'答应日后来小虾米居同住：待寻得《'..JY.Thing[inv.book]['名称']..'》，便会如约前来。')
  else
   say(inv.reply);if not letter then say({{0,'……我明白。保重。'}}) end
   r.home='declined'
  end
  persist()
 end
 local function residents()
  local a=state();local list={}
  for pid=1,76 do local r=a and COMPANION[pid] and a.persons[tostring(pid)];if r and r.home=='resident' then list[#list+1]=pid end end
  return list
 end
 local function letters()
  local list={}
  if afterInvitation() then for pid=1,76 do if canInvite(pid) and not team(pid) then list[#list+1]=pid end end end
  return list
 end
 -- For the homestead menus: residents (counting promised ones now ready) and letter invitations available.
 BrowserAffinityResidents=function()
  local a=state();if not a or next(echoes)~=nil then return 0,0 end
  local n=#residents()
  for pid=1,76 do local r=COMPANION[pid] and a.persons[tostring(pid)];local inv=invitation(pid);if r and r.home=='promised' and owned(inv.book) then n=n+1 end end
  return n,#letters()
 end
 local function visit(pid)
  local voice=PEOPLE[pid] or {}
  say(afterInvitation(true) and voice.contest or voice.home or {{pid,'你回来了。'}})
  if offers(pid)>0 and menu({{'请教武学',nil,1},{'告辞',nil,1}})==1 then ask(pid) end
 end
 BrowserAffinityHome=function()
  if not state() or next(echoes)~=nil or JY.SubScene~=70 then return end
  for _,text in ipairs(arrivals()) do DrawStrBoxWaitKey(text) end
  while true do
   local rows,picks={},{}
   for _,pid in ipairs(residents()) do
    -- Rows stay enabled (the browser hides disabled rows); a travelling resident just answers in one line.
    rows[#rows+1]={JY.Person[pid]['姓名']..(team(pid) and ' · 正随你同行' or ' · 住在山居'),nil,1};picks[#rows]={pid,false}
   end
   for _,pid in ipairs(letters()) do rows[#rows+1]={'修书邀请 · '..JY.Person[pid]['姓名'],nil,1};picks[#rows]={pid,true} end
   if #rows==0 then return end
   local pick=picks[menu(rows)]
   if not pick then return end
   if pick[2] then invite(pick[1],true)
   elseif team(pick[1]) then DrawStrBoxWaitKey(JY.Person[pick[1]]['姓名']..'正随你同行，有话路上说便是。')
   else visit(pick[1]) end
  end
 end
 if type(instruct_59)=='function' then
  local farewell=instruct_59
  instruct_59=function(...)
   local result=table.pack(farewell(...))
   if state() then
    arrivals()
    local names={};for _,pid in ipairs(residents()) do names[#names+1]=JY.Person[pid]['姓名'] end
    if #names>0 then DrawStrBoxWaitKey(table.concat(names,'、')..'住在小虾米居，不随你赴会；回到家中仍可叙话。') end
   end
   return table.unpack(result,1,result.n)
  end
 end
 local person=BrowserGrowthPerson
 BrowserGrowthPerson=function(pid)
  local info=person(pid);local a=info and state()
  if not a then return info end
  if pid==0 then
   local arts,pointers,used={},{},0
   for identity in pairs(a.slots) do
    used=used+1;local skill=tonumber(string.match(identity,'^skill:(%d+)$'));local teacher
    for key,r in pairs(a.persons) do if r.taught==identity then teacher=tonumber(key) end end
    arts[#arts+1]={name=skill and JY.Wugong[skill]['名称'] or identity,teacher=teacher and JY.Person[teacher]['姓名'] or '',cap=api.affinityCap(0,identity)}
   end
   for book,g in pairs(a.aptitude) do pointers[#pointers+1]={name=JY.Thing[tonumber(book)]['名称'],teacher=JY.Person[g.teacher]['姓名'],aptitude=g.rank} end
   table.sort(arts,function(x,y) return x.name<y.name end)
   info.affinity={hero=true,used=used,max=RULES.slots,arts=arts,pointers=pointers}
  elseif COMPANION[pid] then
   local r=a.persons[tostring(pid)];local value=r and r.value or 0;local index,title=tier(value)
   local taught=r and r.taught and tonumber(string.match(r.taught,'^skill:(%d+)$'))
   local voice=PEOPLE[pid] or {};local inv=invitation(pid);local home=r and r.home
   local homeNote=home=='resident' and '住在小虾米居。' or home=='declined' and '婉拒了入住山居。'
    or home=='promised' and (owned(inv.book) and '已如约动身，回小虾米居便能见到。' or '答应寻得《'..JY.Thing[inv.book]['名称']..'》后来小虾米居同住。') or nil
   info.affinity={value=value,max=RULES.max,tier=title,tierIndex=index,line=voice.views and voice.views[index] or LINES[index],familiar=a.familiar[tostring(pid)]==true,taught=taught and JY.Wugong[taught]['名称'] or nil,taughtLine=taught and voice.note or nil,canAsk=team(pid) and offers(pid)>0,
    home=home,homeNote=homeNote,canInvite=team(pid) and canInvite(pid)}
  end
  return info
 end
 local action=BrowserGrowthAction
 BrowserGrowthAction=function(pid,name)
  if name~='affinity-teach' and name~='affinity-invite' then return action(pid,name) end
  if not active(pid) or (JY.Status~=GAME_MMAP and JY.Status~=GAME_SMAP) or not team(pid) then return true end
  if name=='affinity-invite' then invite(pid) elseif offers(pid)>0 then ask(pid) end
  return true
 end
 -- At a companion's own rejoin spot (source departure event + 1), the talk menu offers
 -- 请教武学 once affinity is full and a lesson remains (155b: 邀请入住 while not yet answered); 照常交谈 runs the source event.
 local function residence(id)
  if not state() or not CC.PersonExit or type(GetD)~='function' then return nil end
  local talk=GetD(JY.SubScene,id,2)
  for _,row in ipairs(CC.PersonExit) do
   if talk==row[2]+1 and not team(row[1]) and (offers(row[1])>0 or canInvite(row[1])) then
    local x=JY.Base['人X1']+CC.DirectX[JY.Base['人方向']+1];local y=JY.Base['人Y1']+CC.DirectY[JY.Base['人方向']+1]
    if type(GetS)~='function' or GetS(JY.SubScene,x,y,3)==id then return row[1] end
   end
  end
  return nil
 end
 if type(EventExecute)=='function' then
  local execute=EventExecute
  EventExecute=function(id,flag,...)
   local teacher=flag==1 and JY.Status==GAME_SMAP and residence(id)
   if teacher then
    -- 155b: 邀请入住 joins 请教武学 here; 照常交谈 still runs the source rejoin talk.
    local rows,acts={{'照常交谈',nil,1}},{'talk'}
    if offers(teacher)>0 then rows[#rows+1]={'请教武学',nil,1};acts[#rows]='teach' end
    if canInvite(teacher) then rows[#rows+1]={'邀请入住',nil,1};acts[#rows]='invite' end
    local act=acts[menu(rows)]
    if act=='teach' then ask(teacher);return elseif act=='invite' then invite(teacher);return elseif act~='talk' then return end
   end
   return execute(id,flag,...)
  end
 end
end)()
