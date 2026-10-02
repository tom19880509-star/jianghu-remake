-- Runtime rows extend the item lookup, not the fixed 200-record R layout.
-- Each recruit's ordinary weapon has its own ID, so native single-owner
-- equipment and transfer rules still apply. Grants are once per journey.
;(function()
 local kits={}
 for pid,kit in pairs(browser_starter_kits())do kits[tonumber(pid)]=kit end
 local grants={}
 local function isKit(id)
  local kit=kits[id-300];return kit and not kit.native
 end
 BrowserStarterWeapon=function(id)return type(id)=='number' and isKit(id)==true end
 BrowserInstallStarterItems=function()
  for id,t in pairs(browser_extra_items())do JY.Thing[tonumber(id)]=t end
  for pid=0,JY.PersonNum-1 do local id=JY.Person[pid]['武器'];if BrowserStarterWeapon(id)then JY.Thing[id]['使用人']=pid end end
 end
 local function inTeam(pid)
  for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then return true end end
  return false
 end
 local function amount(id)
  for i=1,CC.MyThingNum do if JY.Base['物品'..i]==id then return JY.Base['物品数量'..i]end end
  return 0
 end
 local function seed(pid)
  local kit=kits[pid];local p=kit and JY.Person[pid]
  if not p or grants[tostring(pid)] or not inTeam(pid) then return end
  if p['武器']>=0 then grants[tostring(pid)]=true;return end
  local id=kit.native or 300+pid
  if kit.native then
   -- Never manufacture an additional named sword on an old unequipped Yang.
   if amount(id)>0 and JY.Thing[id]['使用人']<0 then p['武器']=id;JY.Thing[id]['使用人']=pid end
   grants[tostring(pid)]=true;return
  end
  if amount(id)==0 then
   local room=false;for i=1,CC.MyThingNum do if JY.Base['物品'..i]<0 then room=true;break end end
   if not room then return end
   instruct_32(id,1)
  end
  if JY.Thing[id]['使用人']<0 then p['武器']=id;JY.Thing[id]['使用人']=pid end
  grants[tostring(pid)]=true
 end
 local function seedPair(pid)
  if pid~=59 or grants['59-pair'] or not inTeam(59) then return end
  if amount(415)==0 then
   local room=false;for i=1,CC.MyThingNum do if JY.Base['物品'..i]<0 then room=true;break end end
   if not room then return end
   instruct_32(415,1)
  end
  if BrowserOffhandEquip then BrowserOffhandEquip(59,415) end
  grants['59-pair']=true
 end
 local function persist()browser_starter_save(grants)end
 local load=LoadRecord
 LoadRecord=function(...)
  local result=table.pack(load(...));grants=browser_starter_state() or {}
  if browser_journey_get('trial')~=true then
   for i=1,CC.TeamNum do local pid=JY.Base['队伍'..i];if pid>=0 then seed(pid);seedPair(pid)end end
   persist()
  end
  return table.unpack(result,1,result.n)
 end
 local join=instruct_10
 instruct_10=function(pid,...)
  local result=table.pack(join(pid,...))
  if browser_journey_get('trial')~=true then seed(pid);seedPair(pid);persist()end
  return table.unpack(result,1,result.n)
 end
end)()
