(function()
-- Dispersal NPC: ordered meetings at Heluo, Youjian, Yuelai, then a fixed Heluo return.
-- The existing core accepts one selected identity; this layer gates the quest and confirms the cost.
local NPC_SCENE,NPC_EVENT,NPC_TALK=1,198,12000
local NPC_POS={[1]={18,34},[3]={18,34},[40]={19,35}}
local NPC_NAME='忘机散人'
local NPC_D={1,198,12000,-1,-1,7406,7436,7406,0}
local HINT_MAIN='此处只能安排修炼，不能遗忘武学。'
local HINT_MATE='同伴不能散功，请慎择所学。'
local WINE_MSG='此酒不能使人遗忘武学，仍留在行囊中。'
local function jget(k) return browser_journey_get and browser_journey_get(k) end
local function isTrial() return jget('trial')==true end
local function isUsed() return jget('dispersalUsed')==true end
local function growthOn() return BrowserGrowthEnabled~=nil and BrowserGrowthEnabled(0)==true end
local function elderName() return (jget('dispersalQuest')=='ready' or isUsed()) and NPC_NAME or '醉老头' end
local function say(t) TalkEx(t,-1,0,elderName()) end
local function note(t) DrawStrBoxWaitKey(t) end
local function menu(rows) return ShowMenu(rows,#rows,0,0,0,0,0,1,1,24,0,0) end

-- Checked open cells beside the original inn notices; keep their interaction cells and doors clear.
local NPC_SCENES={1,3,40}
local function elderScene()
 local stage=jget('dispersalQuest')
 if stage=='mending' or stage=='patched' then return 3 end
 if stage=='errand' or stage=='bowl' or stage=='returned' then return 40 end
 return 1
end
local function slotEmpty(scene)
 for i=0,10 do if GetD(scene,NPC_EVENT,i)~=0 then return false end end
 return true
end
local function ensureNpc()
 local target=elderScene()
 for _,scene in ipairs(NPC_SCENES)do
  local ours=GetD(scene,NPC_EVENT,2)==NPC_TALK
  local x,y=table.unpack(NPC_POS[scene])
  local ox,oy=GetD(scene,NPC_EVENT,9),GetD(scene,NPC_EVENT,10)
  if scene~=target and ours then
   if GetS(scene,ox,oy,3)==NPC_EVENT then SetS(scene,ox,oy,3,-1)end
   for i=0,10 do SetD(scene,NPC_EVENT,i,0)end
  elseif scene==target and JY.SubScene==scene and (ours or slotEmpty(scene)) then
   local cell=GetS(scene,x,y,3)
   if (cell==-1 or cell==NPC_EVENT) and GetS(scene,x,y,1)<=0 then
    if ours and (ox~=x or oy~=y) and GetS(scene,ox,oy,3)==NPC_EVENT then SetS(scene,ox,oy,3,-1)end
    for i=0,8 do SetD(scene,NPC_EVENT,i,NPC_D[i+1])end
    SetD(scene,NPC_EVENT,9,x);SetD(scene,NPC_EVENT,10,y);SetS(scene,x,y,3,NPC_EVENT)
   end
  end
 end
end

local originalLoadRecord=LoadRecord
LoadRecord=function(...) local r=originalLoadRecord(...);ensureNpc();return r end
local originalInitSMap=Init_SMap
Init_SMap=function(...) ensureNpc();return originalInitSMap(...) end

-- Legacy saves expose only their real attack slots; do not invent inner arts.
local function oldInfo(identity)
 local p=JY.Person[0];local skills={}
 for i=1,10 do
  local id=p['武功'..i]
  if id>0 and (not identity or identity=='skill:'..id) then skills[#skills+1]={identity='skill:'..id,skill=id,name=JY.Wugong[id]['名称'],rank=math.floor((p['武功等级'..i] or 0)/100)+1,rankUnit='级'} end
 end
 return {pid=0,count=#skills,skills=skills,refund=0,points=p['修炼点数'],after=p['修炼点数'],old=true}
end
local function oldDisperse(identity)
 local info=oldInfo(identity);if info.count~=1 then return false end
 local p=JY.Person[0];local target=info.skills[1].skill;local kept={}
 for i=1,10 do local id=p['武功'..i];if id>0 and id~=target then kept[#kept+1]={id,p['武功等级'..i]} end end
 for i=1,10 do p['武功'..i]=kept[i] and kept[i][1] or 0;p['武功等级'..i]=kept[i] and kept[i][2] or 0 end
 if BrowserClearSkillUse then BrowserClearSkillUse(0,target) end
 local book=p['修炼物品'];local t=JY.Thing[book]
 if t and t['类型']==2 and t['练出武功']==target then
  if t['使用人']==0 then t['使用人']=-1 end
  p['修炼物品']=-1
 end
 return true
end
local function summary(info)
 local s=info.skills[1]
 local t1='将遗忘：'..s.name..' '..s.rank..(s.rankUnit or '级')..'。本门修为与未完成的修炼进度一并舍去，所占名额腾出。'
 local t2='不返还任何修炼心得。未花心得保留：'..info.points..' → '..info.points..'。本周目机会：1 → 0。'
 local t3='仅遗忘这一门，其他已学武学与修炼进度保留。秘籍仍在行囊，若再学须从头投入；本门原有功效随修为散去。已得的泥偶永久根基保留，伤毒与异气不因此消除。'
 return t1,t2,t3
end

-- Original side story; no canonical master or sect affiliation is asserted.
local STORY={
 meet={"少侠行行好！掌柜说我欠了三壶酒，我记得只有两壶半。余下半壶，怕是叫这破袖子偷喝了。","你别笑，我连自己多大年纪都忘了，哪里记得住这几笔酒账。","替我买壶寻常温酒吧，掌柜那里二十两一壶。好酒可别买，白糟蹋银子！"},
 remind={"酒呢？碗是空的，肚子也是空的，倒是掌柜的账本一天比一天厚。"},
 keeper_offer={"告示旁那老头又讨酒喝？赊账倒记不住，开坛的日子记得清楚。温酒一壶二十两，客官真要替他买？"},
 keeper_paid={"酒钱收讫，我让小二把温酒送到告示旁。客官去找老先生便是，不必再买一壶。"},
 wine_return={"你这份酒，我领情了。少侠，你瞧着倒有几分眼熟……罢了，许是又把欠我酒的人认错了。","酒壶在左，豆子在右……从前有个爱玩的老头，两边各玩各的，偏不打架。我一琢磨他怎么做到，酒就洒了。怪事，怪事！","这只破袖子又裂了。我往有间客栈找人补补去；路上若再碰见，坐下来分半碟豆子。"},
 ask_reason="你想要什么？是想把过去练过的东西放下，还是想重新走一条更顺的路？",
 reason_rebuild={"江湖里的纷争、爱恨，我也搅和过。谁负了谁，如今记不清了。若只惦记胜过旁人，换多少功夫也没用。","人都唤我忘机，听来清静，酒账却忘不掉。我能替你卸下一门旧功的行气习惯。招谱纵还记得，真要再练，也须重新下功夫。","十指各有所用，舍哪一门，你自己定。旧日苦功一概不还；气脉也只经得起这一回，莫当玩笑。"},
 reason_hesitate={"犹豫是好事，不犹豫的人老夫反而不敢碰。回去想清楚，什么时候来都行，酒老夫已经喝了，不必再买。"},
 ready={"你的经脉古怪，旁人用不了这个法子，你的同伴老夫也不会碰。只此一人，只此一回。","真要重新来过，先把代价听清。未下定决心，便不必勉强。"},
 success={"成了。这一门旧功已经卸下，旁的本领不受牵连。腾出的余地如何用，往后可要想清楚。这一程再不可散功。","这话我像是劝过谁……酒喝多了，话也混。走吧走吧，莫挡着我晒太阳。"},
}

local function lines(key,head,name)
 for _,line in ipairs(STORY[key] or {}) do TalkEx(line,head or -1,0,name or elderName()) end
end
local function questReady()
 local stage=jget('dispersalQuest')
 if JY.SubScene~=elderScene() then
  say('老头子也该动身了。往后的去处，我已告诉掌柜，回头再叙。');return false
 end
 if stage==nil or stage==0 then
  browser_dispersal_quest('asked');lines('meet');return false
 elseif stage=='asked' then lines('remind');return false
 elseif stage=='wine' then
  lines('wine_return');browser_dispersal_quest('mending');return false
 elseif stage=='mending' then
  say('又是你！替我问问掌柜，可有针线补这只袖子？布别用新的，怪可惜。');return false
 elseif stage=='patched' then
  say('这针脚比我那旧衣结实。来，坐，半碟豆子给你留着呢。')
  say('从前有个练剑的，后来连剑也懒得带。我问他拿什么切下酒菜，他瞧了我半晌，不肯答。')
  say('是谁？忘啦，也许是个木匠。我还得去悦来客栈还只碗，欠着人家的饭呢。')
  browser_dispersal_quest('errand');return false
 elseif stage=='errand' then
  say('这碗是悦来掌柜借我的。人家留过我一顿饭，银子早没了，碗总该还。劳你拿给他，可别换了酒。')
  browser_dispersal_quest('bowl');return false
 elseif stage=='bowl' then say('掌柜就在前厅，替我把旧碗还了；别的倒也没什么事。');return false
 elseif stage=='returned' then
  say('他还记得那顿饭？我倒只记得那天冷。来，今儿给你留了热的。')
  say('山上有个姓风的，酒钱结得痛快，人却比山还冷清。你认得？我说的是风掌柜！那铺子究竟姓不姓风来着……')
  say('这一路折腾够啦。我回河洛晒太阳，你得空来，陪老头子说说话。')
  browser_dispersal_quest('home');return false
 elseif stage=='home' then
  say('你这些日子，手总按着剑，话却少了。若是练功走得不合意，也不必硬撑给谁看。')
  say('把手伸过来。你这气脉倒有一线转圜。旧功若肯舍，我能替你重理；旁人却依样做不得。')
  say(STORY.ask_reason)
  local n=menu({{'容我再想一想',nil,1},{'愿舍一门旧功，另择所学',nil,1}})
  if n~=2 then lines('reason_hesitate');return false end
  lines('reason_rebuild');browser_dispersal_quest('ready')
 end
 return stage=='ready' or jget('dispersalQuest')=='ready'
end
local function amount(id)
 for i=1,CC.MyThingNum do if JY.Base['物品'..i]==id then return JY.Base['物品数量'..i] end end
 return 0
end
local function keeperWine()
 lines('keeper_offer',105,'客栈掌柜')
 local n=menu({{'先不买酒',nil,1},{'买一壶温酒 · 银两20',nil,amount(174)>=20 and 1 or 0},{'问住宿及其他事情',nil,1}})
 if n==3 then return false end
 if n~=2 then return true end
 if amount(174)<20 or isUsed() or isTrial() or jget('dispersalQuest')~='asked' then return true end
 instruct_32(174,-20);browser_dispersal_quest('wine')
 lines('keeper_paid',105,'客栈掌柜');return true
end

BrowserDispersalKeeper=function()
 local stage=jget('dispersalQuest')
 if isTrial() then TalkEx('醉老头的事，待诸位正经行走江湖再说。',105,0);return end
 if JY.SubScene==1 and stage=='asked' and not isUsed() then keeperWine();return end
 if JY.SubScene==3 and stage=='mending' then
  TalkEx('是那只破袖子？店里有旧布针线，补衣的工钱五两。替他付了，我让人补好。',105,0)
  local choice=menu({{'先不付钱',nil,1},{'付五两补衣',nil,amount(174)>=5 and 1 or 0}})
  if choice==2 and amount(174)>=5 and jget('dispersalQuest')=='mending' then
   instruct_32(174,-5);browser_dispersal_quest('patched');TalkEx('袖子补好了，去告示旁找他吧。他给你留了半碟豆子。',105,0)
  end
  return
 end
 if JY.SubScene==40 and stage=='bowl' then
  TalkEx('这碗还用得，我收下了。饭是我请他的，让他别惦记。你们在告示旁坐，我给添碗热汤。',105,0)
  browser_dispersal_quest('returned');return
 end
 local where=elderScene()==3 and '有间客栈' or elderScene()==40 and '悦来客栈' or '河洛客栈'
 TalkEx('听说他在'..where..'的告示旁歇脚。人倒不坏，就是酒账总记不清。',105,0)
end

local function NpcTalk()
 local p=JY.Person[0]
 if isTrial() then say('此处是论武试验之地，老夫只谈不办。散功之事，待正传再说。');return end
 if (p['生命'] or 0)<=0 then note('主角已无气息，无从散功。');return end
 if isUsed() then say('你的气脉已经散过一次，禁不起再伤。往后如何，全看你自己。');return end
 if not questReady() then return end
 local info
 if growthOn() then
  info=BrowserGrowthDispersalInfo(0)
  if info==nil then say('你身上并无可散之功，去吧。');return end
 else info=oldInfo() end
 if (info.count or 0)==0 then say('你身上并无可散之功，去吧。');return end
 lines('ready')
 local c=menu({{'选择要遗忘的武学',nil,1},{'告辞',nil,1}})
 if c~=1 then return end
 local rows={{'暂不遗忘',nil,1}}
 for _,art in ipairs(info.skills) do rows[#rows+1]={art.name..' · '..art.rank..(art.rankUnit or '级'),nil,1} end
 local selected=menu(rows);if selected<2 or not info.skills[selected-1] then return end
 local identity=info.skills[selected-1].identity
 info=info.old and oldInfo(identity) or BrowserGrowthDispersalInfo(0,identity)
 if not info or info.count~=1 then return end
 local t1,t2,t3=summary(info)
 note(t1);note(t2);note(t3)
 local ok=menu({{'再想想（取消）',nil,1},{'遗忘此门，不返心得',nil,1}})
 if ok~=2 then say('不急，想清楚再来。');return end
 local done
 if info.old then done=oldDisperse(identity) else done=BrowserGrowthDisperse(0,identity) end
 if not done then note('散功未成，一切照旧。');return end
 browser_mark_dispersal()
 lines('success')
end

-- Only flag1 (talk) on our own slot, with the player facing the real cell. Everything else returns to the original.
local function facing(xTarget,yTarget,eventId)
 local x,y,d=JY.Base['人X1'],JY.Base['人Y1'],JY.Base['人方向']
 if type(d)~='number' or d<0 or d>3 then return false end
 x=x+CC.DirectX[d+1];y=y+CC.DirectY[d+1]
 return x==xTarget and y==yTarget and GetS(JY.SubScene,xTarget,yTarget,3)==eventId
end
local originalEventExecute=EventExecute
EventExecute=function(id,flag,...)
 if (JY.SubScene==1 or JY.SubScene==3 or JY.SubScene==40) and id==NPC_EVENT and GetD(JY.SubScene,NPC_EVENT,2)==NPC_TALK then
  if JY.Status==GAME_SMAP and flag==1 and facing(GetD(JY.SubScene,NPC_EVENT,9),GetD(JY.SubScene,NPC_EVENT,10),NPC_EVENT) then NpcTalk() end
  return
 end
 return originalEventExecute(id,flag,...)
end

-- Close old entrances: wine, per-art menus. Nothing here calls the core.
local originalUseThing=UseThing
UseThing=function(id)
 if id==0 then note(WINE_MSG);return 0 end
 return originalUseThing(id)
end
local originalSetModify=SetModify
SetModify=function(...)
 local r=originalSetModify(...)
 if type(JY.ThingUseFunction)=='table' then JY.ThingUseFunction[0]=function() note(WINE_MSG);return 0 end end
 return r
end
local originalItemDetails=BrowserItemDetails
BrowserItemDetails=function(id)
 local t=originalItemDetails(id)
 if id==0 and type(t)=='table' then
  t.useReason='此酒不能使人遗忘武学。'
  t.customEffect='此酒仍留在行囊，不能用来遗忘武学。'
  t['物品说明']='醉生梦死酒。酒意散后，旧事未必能忘。'
 end
 return t
end
if BrowserMasteryAction then
 local originalMasteryAction=BrowserMasteryAction
 BrowserMasteryAction=function(pid,action)
  if action=='mastery-forget' then note('独立论武不办理遗忘武学。');return true end
  return originalMasteryAction(pid,action)
 end
end
if BrowserGrowthAction then
 local originalGrowthAction=BrowserGrowthAction
 BrowserGrowthAction=function(pid,action)
  if action=='growth-forget' then note(pid==0 and HINT_MAIN or HINT_MATE);return true end
  return originalGrowthAction(pid,action)
 end
end
-- Old-rule protagonist who dispersed everything may still use ordinary fists.
local originalHasOrdinary=BrowserGrowthHasOrdinary
BrowserGrowthHasOrdinary=function(pid)
 if pid==0 and not isTrial() and isUsed() and not growthOn() then return true end
 if originalHasOrdinary then return originalHasOrdinary(pid) end
 return false
end

end)()
