-- Opt-in new journeys. Original sources and the classic first run are unchanged.
local journeyLoad=LoadRecord
local function prepareKongming()
 if browser_journey_get('cycle')<2 then return end
 -- Slot 198 is labelled unused in the original; no original item instructions
 -- reference it. Only new journeys define the additional learnable manual.
 if JY.Thing[198]['名称']~='空明拳札' then
  for key in pairs(CC.Thing_S) do if key~='代号' then JY.Thing[198][key]=JY.Thing[54][key] end end
  JY.Thing[198]['使用人']=-1
 end
 local t=JY.Thing[198]
 t['名称']='空明拳札';t['名称2']='空明拳札';t['物品说明']='老顽童所授空明拳要诀，以虚御实，循序研习。'
 t['练出武功']=21;t['需内力']=100;t['需拳掌功夫']=40;t['需经验']=120
end
LoadRecord=function(id)
 local result=journeyLoad(id);browser_journey_load(id);prepareKongming();return result
end
local journeyNewGame=NewGame
NewGame=function()
 journeyNewGame()
 if browser_journey_get('cycle')>=2 then
  local boon=browser_journey_get('legacy')
  if boon=='fist' then JY.Person[0]['拳掌功夫']=JY.Person[0]['拳掌功夫']+5
  elseif boon=='footwork' then JY.Person[0]['轻功']=JY.Person[0]['轻功']+5
  elseif boon=='supplies' then instruct_32(174,100) end
  -- 157 承前世武学（journey.js inheritSlots）：境界已在 JS 端减半；已有同名招式取较高者，否则放进第一个空格。
  local r=type(browser_journey_inherit)=='function' and {browser_journey_inherit()} or {0}
  local p=JY.Person[0]
  for i=1,r[1] or 0 do
   local id,level=r[2*i],r[2*i+1];local at,free
   for k=1,10 do if p['武功'..k]==id then at=k elseif not free and p['武功'..k]<=0 then free=k end end
   if at then p['武功等级'..at]=math.max(p['武功等级'..at],level) elseif free then p['武功'..free]=id;p['武功等级'..free]=level end
  end
  if (r[1] or 0)>0 then
   TalkEx('旧梦依稀，江湖却要重新走过。昔日所学的几路武功还依稀记得，只是内力全失、身无长物，一切都要从头练起。',0,1)
  else
   TalkEx('旧梦依稀，江湖却要重新走过。昔日的身手尚须重练，那些未尽的机缘，也许还在前路等候。',0,1)
  end
 end
end
-- GAME_END also means quit/death; only the real time-machine ending grants a clear.
local journeyEnding=instruct_62
instruct_62=function(...)
 journeyEnding(...)
 local p=JY.Person[0];local echo={version=1,cycle=browser_journey_get('cycle'),alignment=p['品德']>50 and 'good' or 'evil',stats={},skills={},gear={weapon=p['武器'],armor=p['防具']}}
 echo.growth=BrowserGrowthEcho and BrowserGrowthEcho(0) or nil
 echo.gear.outfit=BrowserOutfitWorn and BrowserOutfitWorn(0) or nil
 for _,k in ipairs({'等级','生命增长','生命最大值','内力最大值','内力性质','攻击力','防御力','轻功','拳掌功夫','御剑能力','耍刀技巧','特殊兵器','暗器技巧','医疗能力','用毒能力','解毒能力','抗毒能力','武学常识','攻击带毒','左右互搏'}) do echo.stats[k]=p[k] or 0 end
 for i=1,10 do if p['武功'..i]>0 then echo.skills[#echo.skills+1]={id=p['武功'..i],level=p['武功等级'..i]} end end
 coroutine.yield('journey-complete',echo)
end
-- Difficulty changes are temporary combat parameters, never NPC growth data.
local originalEnemies=WarSelectEnemy
local enemyOriginal={}
local function restoreEnemies()
 for id,v in pairs(enemyOriginal) do JY.Person[id]['生命最大值']=v.hp;JY.Person[id]['攻击力']=v.attack end
 enemyOriginal={}
end
WarSelectEnemy=function()
 originalEnemies();enemyOriginal={}
 local hp,attack=browser_journey_difficulty()
 local allies={};for i=0,WAR.PersonNum-1 do if WAR.Person[i]['我方'] then allies[WAR.Person[i]['人物编号']]=true end end
 for i=0,WAR.PersonNum-1 do
  local unit=WAR.Person[i];local id=unit['人物编号'];local p=JY.Person[id]
  if not unit['我方'] and not allies[id] and not enemyOriginal[id] and (hp~=1 or attack~=1) then
   enemyOriginal[id]={hp=p['生命最大值'],attack=p['攻击力']}
   p['生命最大值']=math.max(1,math.floor(p['生命最大值']*hp));p['生命']=math.max(0,math.floor(p['生命']*hp));p['攻击力']=math.max(1,math.floor(p['攻击力']*attack))
  end
 end
end
local originalWarEnd=War_EndPersonData
War_EndPersonData=function(...)
 restoreEnemies();return originalWarEnd(...)
end
local journeyWar=WarMain
local wonBaihua=false
WarMain=function(id,...)
 local result=journeyWar(id,...)
 if id==135 and result then wonBaihua=true end
 return result
end
local journeyEvent=oldCallEvent
oldCallEvent=function(id)
 wonBaihua=false
 journeyEvent(id)
 -- Event 413 is reachable after the original reunion and mutual-combat gift.
 -- A fresh victory is required; repeat conversations cannot farm rewards.
 if id==413 and wonBaihua and browser_journey_get('cycle')>=2 and not browser_journey_get('kongming') then
  TalkEx('咦，你这几下倒有点意思！只顾使蛮劲可不好玩。来来来，我教你一个空字，你再陪我拆招！',64,0)
  if DrawStrBoxYesNo(-1,-1,'向周伯通请教空明拳？',C_WHITE,CC.DefaultFont) then
   local room=instruct_18(198)
   for i=1,CC.MyThingNum do if JY.Base['物品'..i]<0 then room=true;break end end
   if room then
    prepareKongming();instruct_2(198,1);browser_journey_reward('kongming')
    TalkEx('拳谱只是记个意思。真要明白空而不空，还得你自己慢慢琢磨。别学会了就不来找我玩啦！',64,0)
   else DrawStrBoxWaitKey('行囊已满，请先腾出一格，再来与老顽童切磋。') end
  end
 end
end
