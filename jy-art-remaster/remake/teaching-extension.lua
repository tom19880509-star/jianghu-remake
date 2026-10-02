-- Per-save original scripted grants. No inference from existing learned arts.
local install=(function()
-- Reviewed pure teaching core; integration below owns persistence.
-- Wiring by Codex: local install = dofile('martial-teaching-core.lua'); instruct_33 = install(instruct_33, hooks)
-- Required hooks (validated at install; core never falls back to raw 武功1..10):
--   isEnabled(pid)->bool   rule active for this pid (NOT party membership)
--   known(pid,skill)->bool identity already held (level ignored)
--   canLearn(pid,skill)->bool caller checks its active learning rules; this legacy integration only checks attack slots
--   remember(pid,skill)    persist 授艺资格 by (pid,skill) only; idempotent; no money/items/story side effects
--   notice(kind,pid,skill,flag) kind='already_known'|'deferred'; called only when flag==0
local REQUIRED = { 'isEnabled', 'known', 'canLearn', 'remember', 'notice' }
local function InstallMartialTeaching(original, hooks)
  if type(original) ~= 'function' then error('InstallMartialTeaching: original must be a function', 2) end
  if type(hooks) ~= 'table' then error('InstallMartialTeaching: hooks table required', 2) end
  for _, n in ipairs(REQUIRED) do
    if type(hooks[n]) ~= 'function' then error('InstallMartialTeaching: missing hook [' .. n .. ']', 2) end
  end
  local isEnabled, known, canLearn, remember, notice = hooks.isEnabled, hooks.known, hooks.canLearn, hooks.remember, hooks.notice
  return function(personid, wugongid, flag, ...)
    if not isEnabled(personid) then
      return original(personid, wugongid, flag, ...)   -- disabled: original once, no record
    end
    -- enabled scripted teaching = legitimate 授艺: record FIRST, once per call, regardless of known/full/free,
    -- so 'learned but no 资格' can never occur (散功 relearn relies on it). Moving it after original() is
    -- possible for the free branch only; known/full branches must still remember.
    remember(personid, wugongid)
    if known(personid, wugongid) then
      if flag == 0 then notice('already_known', personid, wugongid, flag) end
      return                                            -- no duplicate, no level reset (581 retry)
    end
    if not canLearn(personid, wugongid) then
      if flag == 0 then notice('deferred', personid, wugongid, flag) end
      return                                            -- never overwrite 武功10; flag==1 (杨过 436) silent
    end
    return original(personid, wugongid, flag, ...)     -- free: original once; errors propagate
  end
end
return InstallMartialTeaching

end)()
local teaching=nil
local function key(pid,skill) return string.format('%d:%d',pid,skill) end
local function known(pid,skill)
 for i=1,10 do if JY.Person[pid]['武功'..i]==skill then return true end end
 return false
end
local function freeSlot(pid)
 for i=1,10 do if JY.Person[pid]['武功'..i]==0 then return i end end
end
local function save() browser_teaching_save(teaching) end
local function remember(pid,skill)
 local k=key(pid,skill)
 if not teaching.grants[k] then teaching.grants[k]={received=known(pid,skill) or (BrowserGrowthNeedsRelearn and BrowserGrowthNeedsRelearn(pid,skill)) or false};save() end
end
local loadRecord=LoadRecord
LoadRecord=function(id)
 local result=loadRecord(id)
 teaching=browser_teaching_state() or {version=1,grants={}}
 return result
end
local original=instruct_33
local grant=install(original,{
 isEnabled=function(pid) return teaching~=nil and pid>=0 and pid<JY.PersonNum end,
 known=known,
 -- Normal saves still use original attack slots. Combined martial identities
 -- and new-growth migration are separate unfinished work, not inferred here.
 canLearn=function(pid,skill) return freeSlot(pid)~=nil and (not BrowserGrowthCanLearn or BrowserGrowthCanLearn(pid,skill)) end,
 remember=remember,
 notice=function(kind,pid,skill)
  local name=JY.Wugong[skill]['名称']
  if BrowserGrowthNeedsRelearn and BrowserGrowthNeedsRelearn(pid,skill) then DrawStrBoxWaitKey(name..'曾经学过，散功后须在人物武学页付心得重学。');return end
  DrawStrBoxWaitKey(kind=='deferred' and (JY.Person[pid]['姓名']..'暂未能领会'..name..'。传功已记下，原有武功保留；可在人物武学页查看名额与修炼条件。') or (JY.Person[pid]['姓名']..'已领会'..name..'，原有修为保留。'))
 end
})
instruct_33=function(pid,skill,flag,...)
 local result=table.pack(grant(pid,skill,flag,...))
 if BrowserGrowthRecordTaught and known(pid,skill) then BrowserGrowthRecordTaught(pid,skill) end
 if teaching then
  local g=teaching.grants[key(pid,skill)]
  if g and not g.received and known(pid,skill) then g.received=true;save() end
 end
 return table.unpack(result,1,result.n)
end
local function rowsFor(pid)
 local rows={}
 if not teaching then return rows end
 local prefix=tostring(pid)..':'
 for k,g in pairs(teaching.grants) do
  if string.sub(k,1,#prefix)==prefix then
   local skill=tonumber(string.sub(k,#prefix+1));local has=known(pid,skill)
   rows[#rows+1]={skill=skill,name=JY.Wugong[skill]['名称'],known=has,received=g.received,learnable=not has and not g.received}
  end
 end
 table.sort(rows,function(a,b) return a.skill<b.skill end)
 return rows
end
BrowserTeachingPerson=function(pid)
 local rows=rowsFor(pid)
 if #rows==0 then return nil end
 local trialHero=BrowserMasteryPerson and BrowserMasteryPerson(pid)~=nil
 if trialHero then for _,r in ipairs(rows) do r.learnable=false end end
 return {grants=rows,full=freeSlot(pid)==nil}
end
BrowserTeachingAction=function(pid,action)
 if action~='teaching-receive' or not teaching then return false end
 if JY.Status~=GAME_MMAP and JY.Status~=GAME_SMAP then return true end
 -- This button only collects a previously deferred *first* gift. It cannot
 -- restore a forgotten art for free or bypass paid trial re-learning.
 if BrowserMasteryPerson and BrowserMasteryPerson(pid) then DrawStrBoxWaitKey('重学须按本门所需，重新投入修炼。');return true end
 local menu,ids={},{}
 for _,r in ipairs(rowsFor(pid)) do
  if not r.known and not r.received then menu[#menu+1]={r.name..' · 领会传功（入门）',nil,1};ids[#ids+1]=r.skill end
 end
 if #ids==0 then DrawStrBoxWaitKey('没有尚未领会的传功。');return true end
 local n=ShowMenu(menu,#menu,0,0,0,0,0,1,1,24,0,0)
 if n>0 then
  local k=key(pid,ids[n]);local g=teaching.grants[k]
  if g and not g.received and not known(pid,ids[n]) then
   if BrowserGrowthEnabled and BrowserGrowthEnabled(pid) and not BrowserGrowthCanLearn(pid,ids[n]) then DrawStrBoxWaitKey('本轮修为名额不足，或此功须付心得重学。传功资格保留；队友不能散功，主角仅能寻忘机散人整身散功。');return true end
   if not freeSlot(pid) then
    -- A full legacy sheet still has a real path: the player selects an art to
    -- relinquish for this unclaimed gift. Never choose/overwrite one for them.
    local p=JY.Person[pid];local options,skills,seen={},{},{}
    for i=1,10 do
     local old=p['武功'..i]
     if old>0 and not seen[old] then
      seen[old]=true;skills[#skills+1]=old
      options[#options+1]={JY.Wugong[old]['名称']..' · 放下此招以领会传功',nil,1}
     end
    end
    local selected=ShowMenu(options,#options,0,0,0,0,0,1,1,24,0,0)
    if selected<=0 then return true end
    local old=skills[selected]
    local message='放下'..JY.Wugong[old]['名称']..'，领会'..JY.Wugong[ids[n]]['名称']..'（入门）。旧功修为不折算修炼点；当前修炼点与固有属性保留。'
    local confirm=ShowMenu({{'取消，保留原有武功',nil,1},{message,nil,1}},2,0,0,0,0,0,1,1,24,0,0)
    if confirm~=2 then return true end
    local remain={}
    for i=1,10 do if p['武功'..i]~=old and p['武功'..i]>0 then remain[#remain+1]={p['武功'..i],p['武功等级'..i]} end end
    for i=1,10 do p['武功'..i]=remain[i] and remain[i][1] or 0;p['武功等级'..i]=remain[i] and remain[i][2] or 0 end
    local book=p['修炼物品']
    if book and book>=0 and JY.Thing[book]['练出武功']==old then p['修炼物品']=-1;JY.Thing[book]['使用人']=-1 end
    if BrowserClearSkillUse then BrowserClearSkillUse(pid,old) end
   end
   if freeSlot(pid) then instruct_33(pid,ids[n],0) end
  end
 end
 return true
end
