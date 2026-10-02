-- Independent mastery trial. The hero owns real learned ranks in the original
-- record; only active internal rank, base MP and investment live in metadata.
local mastery=nil
local masteryFrozen=nil
local books={[84]=67,[58]=20,[95]=92,[39]=-1,[45]=-1,[54]=11,[67]=89,[68]=45,[69]=46,[70]=53,[71]=47,[43]=-1}
local function bookIds()
 if mastery and mastery.version==4 then return {84,58,95,39,45,54,67,68,69,70,71,43} end
 return mastery and mastery.version>=3 and {84,58,95,39,45,54,67,68,69,70,71} or {84,58,95}
end
local function supported(book)
 for _,id in ipairs(bookIds()) do if id==book then return true end end
 return false
end
local function enabled(pid) return pid==0 and mastery~=nil end
local function saveMastery() if mastery then browser_mastery_save(mastery) end end
-- The older isolated cultivation trial has its own metadata. Echo practice
-- must restore this too, rather than keeping proficiency from repeated duels.
do
 local function copy(value)
  if type(value)~='table' then return value end
  local out={};for k,v in pairs(value) do out[k]=copy(v) end;return out
 end
 BrowserMasteryBattleCheckpoint=function()
  local saved=copy(mastery)
  return function() mastery=copy(saved);saveMastery() end
 end
end
local function slotFor(skill)
 -- Empty slots are 0; signature 0 (收起拿手) must never resolve to a slot.
 if not skill or skill<=0 then return nil end
 for i=1,10 do if JY.Person[0]['武功'..i]==skill then return i end end
end
local function rankOf(skill)
 local i=slotFor(skill);return i and math.min(10,math.floor(JY.Person[0]['武功等级'..i]/100)+1) or 0
end
local function nonAttackRank(book) return mastery and mastery.learnedBooks and mastery.learnedBooks[tostring(book)] or 0 end
local function learnedIdentities()
 local ids={}
 for i=1,10 do local skill=JY.Person[0]['武功'..i];if skill>0 then ids['skill:'..skill]=true end end
 if mastery.internalRank>0 then ids['skill:92']=true end
 for _,book in ipairs({39,45,43}) do if nonAttackRank(book)>0 then ids['book:'..book]=true end end
 local count=0;for _ in pairs(ids) do count=count+1 end
 return ids,count
end
local function learningFull(book)
 if not mastery or mastery.version<3 or not supported(book) then return false end
 local ids,count=learnedIdentities()
 local identity=books[book]>0 and 'skill:'..books[book] or 'book:'..book
 return not ids[identity] and count>=10
end
local function applyRoots()
 if not mastery then return end
 local p=JY.Person[0]
 if mastery.version>=2 then
  p['耍刀技巧']=math.min(100,mastery.rootBase.blade+math.max(0,rankOf(67)-1)*4)
  p['拳掌功夫']=math.min(100,mastery.rootBase.fist+math.max(0,rankOf(20)-1)*4)
  return
 end
 p['耍刀技巧']=math.max(p['耍刀技巧'],40+(rankOf(67)-1)*4)
 p['拳掌功夫']=math.max(p['拳掌功夫'],40+(rankOf(20)-1)*4)
end
local function applyInternal()
 if not mastery then return end
 local p=JY.Person[0]
 local bonus=mastery.internal==95 and 15*mastery.internalRank or mastery.internal==39 and 10*nonAttackRank(39) or mastery.internal==43 and 12*nonAttackRank(43) or 0
 p['内力最大值']=math.min(CC.PersonAttribMax['内力最大值'],mastery.baseMP+bonus)
 p['内力']=math.min(p['内力'],p['内力最大值'])
end
local function applyLightness()
 if mastery and mastery.version>=3 then JY.Person[0]['轻功']=math.min(100,mastery.baseAgility+3*nonAttackRank(45)) end
end
local function rootReason(book)
 if book~=43 or not mastery or mastery.version~=4 then return '' end
 local p=JY.Person[0]
 if mastery.baseMP<100 then return '自身内力上限须达100' end
 if p['攻击力']<60 then return '攻击力须达60' end
 if p['内力性质']~=1 and p['内力性质']~=2 then return '须阳性或调和内力' end
 return ''
end
local function yijinGuard()
 if not mastery or mastery.version~=4 or mastery.internal~=43 or not mastery.yijin.insight then return 0 end
 local rank=nonAttackRank(43)
 if rank<8 then return 0 end
 local fraction=math.max(0,math.min(1,(JY.Person[0]['品德']-50)/20))
 return math.floor((rank==8 and 6 or rank==9 and 8 or 10)*fraction)
end
local function trainingCost(book)
 if not supported(book) or learningFull(book) or rootReason(book)~='' then return math.huge end
 local rank=book==95 and mastery.internalRank or books[book]<0 and nonAttackRank(book) or rankOf(books[book])
 if rank>=10 or JY.Thing[book]['需经验']<=0 then return math.huge end
 return (7-math.floor(JY.Person[0]['资质']/15))*JY.Thing[book]['需经验']*math.max(1,rank)
end
local function owned(book)
 for i=1,CC.MyThingNum do if JY.Base['物品'..i]==book and JY.Base['物品数量'..i]>0 then return true end end
 return false
end
local function chooseBook(book)
 local p=JY.Person[0];local old=p['修炼物品']
 if mastery.version>=2 and not owned(book) then DrawStrBoxWaitKey('行囊中没有'..JY.Thing[book]['名称']..'，不能选修。');return false end
 if old>=0 then JY.Thing[old]['使用人']=-1 end
 p['修炼物品']=book;JY.Thing[book]['使用人']=0
 return true
end
local function trainOne()
 local p=JY.Person[0];local book=p['修炼物品'];local cost=trainingCost(book)
 if cost==math.huge or p['修炼点数']<cost then return false end
 local i=slotFor(books[book]);local created=false
 if not i and books[book]>0 then
  -- v2 re-learning after 散功: paid entry creates rank 1 in the first free
  -- original slot (level 0, no leftover experience). A full sheet fails
  -- before any charge. Never a free gift; cost at rank 0 equals rank 1.
  if mastery.version<2 then return false end
  for k=1,10 do if p['武功'..k]==0 then i=k;break end end
  if not i then DrawStrBoxWaitKey('武功栏已满，无法重学'..JY.Thing[book]['名称']..'。');return false end
  p['武功'..i]=books[book];p['武功等级'..i]=0;created=true
 end
 p['修炼点数']=p['修炼点数']-cost;mastery.studySpent=mastery.studySpent+cost
 if mastery.version>=2 then mastery.perBookPaid[tostring(book)]=mastery.perBookPaid[tostring(book)]+cost end
 if books[book]<0 then mastery.learnedBooks[tostring(book)]=nonAttackRank(book)+1
 elseif book==95 then
  mastery.internalRank=mastery.internalRank+1
  -- Studying the same book advances its attack without charging twice. Using
  -- the attack alone never invents an attained internal cultivation rank.
  p['武功等级'..i]=math.max(p['武功等级'..i],(mastery.internalRank-1)*100)
 elseif not created then p['武功等级'..i]=math.min(999,p['武功等级'..i]+100) end
 -- A deep single art supplies its own root proficiency; no unrelated books
 -- are required to unlock continued training. No per-book HP/ATK/DEF stack.
 applyRoots()
 applyInternal();applyLightness();saveMastery()
 DrawStrBoxWaitKey(JY.Thing[book]['名称']..'研习有进。已用'..cost..'点，余'..p['修炼点数']..'点。')
 return true
end
local function startSample()
 local p=JY.Person[0]
 for i=1,CC.TeamNum do JY.Base['队伍'..i]=i==1 and 0 or -1 end
 for i=1,CC.MyThingNum do JY.Base['物品'..i]=-1;JY.Base['物品数量'..i]=0 end
 for i=0,JY.ThingNum-1 do JY.Thing[i]['使用人']=-1 end
 for i=1,10 do p['武功'..i]=0;p['武功等级'..i]=0 end
 for i,skill in ipairs({67,20,92}) do p['武功'..i]=skill end
 local stats={['等级']=8,['经验']=0,['生命最大值']=240,['生命']=240,['内力最大值']=120,['内力']=120,['生命增长']=5,['体力']=100,['内力性质']=1,['攻击力']=70,['防御力']=55,['轻功']=55,['资质']=45,['拳掌功夫']=40,['耍刀技巧']=40,['御剑能力']=20,['特殊兵器']=20,['暗器技巧']=20,['医疗能力']=0,['用毒能力']=0,['解毒能力']=0,['抗毒能力']=0,['武学常识']=0,['攻击带毒']=0,['左右互搏']=0,['受伤程度']=0,['中毒程度']=0,['修炼点数']=12600,['修炼物品']=-1,['武器']=-1,['防具']=-1,['品德']=50}
 for k,v in pairs(stats) do p[k]=v end
 if mastery.version>=2 then mastery.rootBase={fist=p['拳掌功夫'],blade=p['耍刀技巧']} end
 if mastery.version>=3 then mastery.baseAgility=p['轻功'] end
 for _,book in ipairs(bookIds()) do instruct_32(book,1) end
 chooseBook(84);p['姓名']='小虾米';JY.Base['人X']=223;JY.Base['人Y']=187
 applyInternal();saveMastery()
end
local loadRecord=LoadRecord
LoadRecord=function(id)
 local result=loadRecord(id)
 mastery=browser_mastery_state();masteryFrozen=nil
 if browser_mastery_start() then startSample() else applyInternal();applyRoots();applyLightness() end
 return result
end
local addAttrib=AddPersonAttrib
AddPersonAttrib=function(pid,field,value)
 if enabled(pid) and mastery.version>=3 and field=='轻功' then
  local before=JY.Person[pid][field]
  mastery.baseAgility=math.max(0,math.min(100,mastery.baseAgility+value));applyLightness();saveMastery()
  local n=JY.Person[pid][field]-before
  return n,n>0 and string.format('%s 增加 %d',field,n) or n<0 and string.format('%s 减少 %d',field,-n) or ''
 end
 if enabled(pid) and mastery.version>=2 and (field=='拳掌功夫' or field=='耍刀技巧') then
  local before=JY.Person[pid][field]
  local result=table.pack(addAttrib(pid,field,value))
  local key=field=='拳掌功夫' and 'fist' or 'blade'
  mastery.rootBase[key]=math.max(0,math.min(100,mastery.rootBase[key]+result[1]))
  applyRoots();saveMastery()
  local actual=JY.Person[pid][field]-before
  if actual~=result[1] then result[1]=actual;result[2]=actual>0 and string.format('%s 增加 %d',field,actual) or actual<0 and string.format('%s 减少 %d',field,-actual) or '' end
  return table.unpack(result,1,result.n)
 end
 if not enabled(pid) or field~='内力最大值' then return addAttrib(pid,field,value) end
 local old=JY.Person[0]['内力最大值']
 mastery.baseMP=math.max(0,math.min(CC.PersonAttribMax[field],mastery.baseMP+value))
 applyInternal();saveMastery()
 local n=JY.Person[0][field]-old
 return n,n>0 and string.format('%s 增加 %d',field,n) or n<0 and string.format('%s 减少 %d',field,-n) or ''
end
local needExp=TrainNeedExp
TrainNeedExp=function(pid) if enabled(pid) then return trainingCost(JY.Person[pid]['修炼物品']) end;return needExp(pid) end
local trainBook=War_PersonTrainBook
War_PersonTrainBook=function(pid) if enabled(pid) then return trainOne() end;return trainBook(pid) end
local canUse=CanUseThing
CanUseThing=function(id,pid)
 if enabled(pid) and JY.Thing[id]['类型']==2 then return supported(id) and rootReason(id)=='' end
 return canUse(id,pid)
end
local itemDetails=BrowserItemDetails
BrowserItemDetails=function(id)
 local data=itemDetails(id)
 if mastery and supported(id) then
  for _,key in ipairs({'加生命最大值','加内力最大值','加攻击力','加防御力','加轻功','加拳掌功夫','加耍刀技巧'}) do data[key]=0 end
  if id==43 then data['需资质']=0;data['改变内力性质']=0 end
  data['物品说明']='论武研习：只提升本门进境，不逐本叠加攻防与气血。'..(id==95 and '九阳每重提供15内力上限，仅主运生效；同书招式同步进境。' or id==43 and '每重提供12内力上限，仅主运生效。基础研习不锁品德；护体须易筋八重、主运、两次亲历善行并悟法，品德70全效、50以下不生效。8/9/10重护体6/8/10点，仅受敌方武功时临时增加防御。资质只影响研习成本。' or id==39 and '紫霞每重提供10内力上限，仅主运生效，与九阳互斥。' or id==45 and '梯云每重提供3轻功，散功后移除。' or (id==84 or id==58) and '本门根基随真实修为提高。' or '招式沿原引擎进境增强，不提供全身被动属性。')..'换书保留修炼点，切换心法不恢复内力。'
 end
 return data
end
-- The inventory's original "use manual" route must obey the same study pool
-- and no-reset rule as the character sheet.
local useBook=UseThing_Type2
UseThing_Type2=function(id)
 if not mastery then return useBook(id) end
 local index=SelectTeamMenu();if index<=0 then return 0 end
 local pid=JY.Base['队伍'..index]
 if pid==0 then
  if supported(id) then chooseBook(id) else DrawStrBoxWaitKey('此秘籍尚未列入本次论武试练。') end
  return 1
 end
 local select=SelectTeamMenu;SelectTeamMenu=function() return index end
 local result=table.pack(pcall(useBook,id));SelectTeamMenu=select
 if not result[1] then error(result[2],0) end
 return table.unpack(result,2,result.n)
end
BrowserMasteryBattleConfig=function(pid) if enabled(pid) then return masteryFrozen end end
local warMain=WarMain
WarMain=function(...)
 local previous=masteryFrozen
 if mastery then masteryFrozen={version=mastery.version,signature=mastery.signature,signatureRank=rankOf(mastery.signature),internal=mastery.internal,internalRank=mastery.internalRank,taiChiRank=rankOf(20),yijinGuard=yijinGuard(),yijinRank=nonAttackRank(43),morality=JY.Person[0]['品德'],insight=mastery.yijin and mastery.yijin.insight or false} end
 local result=table.pack(pcall(warMain,...));masteryFrozen=previous
 if not result[1] then error(result[2],0) end
 return table.unpack(result,2,result.n)
end
local fightSub=War_Fight_Sub
War_Fight_Sub=function(...)
 if not mastery then return fightSub(...) end
 local before=0;for i=1,10 do before=before+JY.Person[0]['武功等级'..i] end
 local result=table.pack(pcall(fightSub,...))
 local after=0;for i=1,10 do after=after+JY.Person[0]['武功等级'..i] end
 mastery.practice=mastery.practice+math.max(0,after-before);applyRoots();saveMastery()
 if not result[1] then error(result[2],0) end
 return table.unpack(result,2,result.n)
end
local function learnedRank(book)
 if books[book]<0 then return nonAttackRank(book) end
 local rank=rankOf(books[book])
 if book==95 then rank=math.max(rank,mastery.internalRank) end
 return rank
end
local function refundFor(book)
 local paid=mastery.perBookPaid and mastery.perBookPaid[tostring(book)] or 0
 local rank=learnedRank(book)
 if rank<=0 or paid<=0 then return 0 end
 local refund=rank<=3 and paid or math.floor(paid*70/100)
 if mastery.version==4 then refund=math.min(refund,math.max(0,32767-JY.Person[0]['修炼点数'])) end
 return refund
end
-- 散功: remove the art from the original sheet (slots compact), refund only
-- this book's own paid investment (gift ranks and practice are never
-- refunded), keep lifetime studySpent, reset perBookPaid, and release the
-- selected manual so the original after-battle training cannot re-learn it.
local function forgetBook(book)
 local p=JY.Person[0];local skill=books[book];local refund=refundFor(book)
 local i=slotFor(skill)
 if i then
  for k=i,9 do p['武功'..k]=p['武功'..(k+1)];p['武功等级'..k]=p['武功等级'..(k+1)] end
  p['武功10']=0;p['武功等级10']=0
 end
 if mastery.signature==skill then mastery.signature=0 end
 if book==95 then if mastery.internal==95 then mastery.internal=0 end;mastery.internalRank=0 end
 if books[book]<0 then mastery.learnedBooks[tostring(book)]=nil end
 if mastery.internal==book then mastery.internal=0 end
 if p['修炼物品']==book then p['修炼物品']=-1;JY.Thing[book]['使用人']=-1 end
 p['修炼点数']=p['修炼点数']+refund
 mastery.perBookPaid[tostring(book)]=0
 applyRoots();applyInternal();applyLightness();saveMastery()
 if skill>0 and type(BrowserClearSkillUse)=='function' then BrowserClearSkillUse(0,skill) end
 return refund
end
BrowserMasteryPerson=function(pid)
 if not enabled(pid) then return nil end
 local p=JY.Person[0];local cost=trainingCost(p['修炼物品'])
 local canForget=false
 if mastery.version>=2 then for _,id in ipairs(bookIds()) do if learnedRank(id)>0 then canForget=true end end end
 local studyReason=p['修炼物品']<0 and '未选修炼书' or learningFull(p['修炼物品']) and '已学十门，可继续精修已有武学' or rootReason(p['修炼物品'])~='' and rootReason(p['修炼物品']) or cost==math.huge and '已练至十级' or p['修炼点数']<cost and '修炼点不足' or ''
 local rank=rankOf(67);local taiChiRank=rankOf(20)
 local reduction=mastery.internal==95 and math.max(0,math.floor(math.min(mastery.internalRank,taiChiRank)/3)) or 0
 -- The adapter reduces the cost base; the original engine multiplies it by
 -- the attained attack tier. Show the final per-strike cost, not the base.
 local costBase=JY.Wugong[20]['消耗内力点数'];local costTier=math.floor((taiChiRank+1)/2)
 local _,total=learnedIdentities();local learned,investments={},{}
 for _,id in ipairs(bookIds()) do
  if books[id]<0 and nonAttackRank(id)>0 then learned[tostring(id)]={bookId=id,name=JY.Thing[id]['名称'],rank=nonAttackRank(id),effect=id==39 and '主运时每重增加10内力上限，与其他心法互斥。' or id==43 and '主运每重增加12内力上限。八重起、亲历两次善行并悟法后可护体；品德70全效、50以下无护体。散功移除境界增益，善行经历保留。' or '每重增加3轻功，散功后移除。'} end
  investments[tostring(id)]={name=JY.Thing[id]['名称'],paid=mastery.perBookPaid and mastery.perBookPaid[tostring(id)] or 0}
 end
 return {yijin=mastery.yijin and {rank=nonAttackRank(43),morality=p['品德'],guard=yijinGuard(),entrusted=mastery.yijin.entrusted,wounded=mastery.yijin.wounded,insight=mastery.yijin.insight} or nil,version=mastery.version,totalLearned=total,learnedBooks=learned,investments=investments,baseAgility=mastery.baseAgility,lightnessBonus=mastery.version>=3 and p['轻功']-mastery.baseAgility or 0,jiuyangRank=mastery.internalRank,
  investment=mastery.perBookPaid,signature=mastery.signature>0 and JY.Wugong[mastery.signature]['名称'] or '未设拿手',canForget=canForget,studyReason=studyReason,internal=mastery.internal==95 and '九阳心法' or mastery.internal==39 and '紫霞心法' or mastery.internal==43 and '易筋经' or '未主运',internalRank=(mastery.internal==39 or mastery.internal==43) and nonAttackRank(mastery.internal) or mastery.internalRank,baseMP=mastery.baseMP,bonus=p['内力最大值']-mastery.baseMP,spent=mastery.studySpent,practice=mastery.practice,cost=cost==math.huge and -1 or cost,
  huEffect=mastery.signature==67 and rank>=8 and (rank==8 and 6 or rank==9 and 8 or 10) or 0,taiChiReduction=reduction,
  taiChiNormalCost=costTier*costBase,taiChiCost=costTier*math.max(1,costBase-reduction),canStudy=cost~=math.huge and p['修炼点数']>=cost}
end
local function spar()
 local status,scene=JY.Status,JY.SubScene
 local stopped,rounds=false,0
 local funcs={ShowMenu=ShowMenu,War_PersonLostLife=War_PersonLostLife,War_isEnd=War_isEnd,War_Manual=War_Manual,War_Auto=War_Auto,DrawStrBoxWaitKey=DrawStrBoxWaitKey}
 ShowMenu=function(items,num,...)
  if JY.Status==GAME_WMAP and num==10 and items[1][1]=='移动' then items[11]={'离开切磋',function() stopped=true;return 1 end,1};num=11 end
  return funcs.ShowMenu(items,num,...)
 end
 War_PersonLostLife=function() funcs.War_PersonLostLife();rounds=rounds+1;if rounds>=40 then stopped=true end end
 War_isEnd=function() if stopped then return 2 end;return funcs.War_isEnd() end
 War_Manual=function(...) if stopped then return 1 end;return funcs.War_Manual(...) end
 War_Auto=function(...) if stopped then return 1 end;return funcs.War_Auto(...) end
 DrawStrBoxWaitKey=function(s,...) if s=='战斗失败' then s=stopped and '切磋已结束。' or '此次切磋未胜，可休整后再来。' end;return funcs.DrawStrBoxWaitKey(s,...) end
 JY.SubScene=0;JY.Status=GAME_SMAP
 local result=table.pack(pcall(WarMain,0,1))
 for k,v in pairs(funcs) do _G[k]=v end
 JY.Status=status;JY.SubScene=scene;Cls();ShowScreen()
 if not result[1] then error(result[2],0) end
end
-- Three short encounters in the opt-in trial, using its existing dialogue UI.
-- No original plot event, inventory item or non-trial save is changed.
local function yijinStory()
 if mastery.version~=4 or masteryFrozen or JY.Status==GAME_WMAP then return end
 local q=mastery.yijin
 local labels={pending='尚未经历',good='已行善举',evil='已负此事'}
 local n=ShowMenu({{'归还托付 · '..labels[q.entrusted],nil,1},{'救助伤者 · '..labels[q.wounded],nil,1},{'荒寺问经 · '..(q.insight and '已悟法' or '尚未悟法'),nil,1},{'返回',nil,1}},4,0,0,0,0,0,1,1,24,0,0)
 if n==1 or n==2 then
  local key=n==1 and 'entrusted' or 'wounded'
  if q[key]~='pending' then DrawStrBoxWaitKey(q[key]=='good' and '此事已有善果，重访不再增加品德。' or '此事已辜负他人，本周目无法重来。易筋经的基础研习仍可继续。');return end
  if n==1 then
   TalkEx('客栈遭袭之后，一位受伤的老旅人托你，将故人的遗物送到邻舍女儿手中。',-1,0)
   TalkEx('老旅人：我伤成这样，只怕误了归期。烦你将包裹平安送到她手里。',-1,0)
  else
   TalkEx('客栈外，一名随行牵马的少年受伤倒地。店家认得他，知道他没有参与伤人。手边放着可用于包扎的干净布条。',-1,0)
   TalkEx('旅人：他虽没动手，终究是跟那伙人来的！\n\n少年：我只是替他们牵马……别丢下我。',-1,0)
  end
  local choice=ShowMenu({{n==1 and '原样交还遗物 · 品德增加10' or '留下救治少年 · 品德增加10',nil,1},{n==1 and '谎称失落，私自侵占 · 品德减少10，本周目无法悟法' or '趁伤抢走家书 · 品德减少10，本周目无法悟法',nil,1},{'暂缓此事 · 无奖罚，稍后可来',nil,1}},3,0,0,0,0,0,1,1,24,0,0)
  if choice~=1 and choice~=2 then return end
  q[key]=choice==1 and 'good' or 'evil'
  AddPersonAttrib(0,'品德',choice==1 and 10 or -10);saveMastery()
  if choice==2 then
   TalkEx(n==1 and '姑娘等不到父亲的遗物，默默合上了门。你明知有负所托。' or '你取走少年的家书。店家斥责一声，将无力阻止你的少年扶进屋中。',-1,0)
  elseif n==1 then
   TalkEx('姑娘：这笛子……是爹常带着的。原来他还惦记着家。\n\n'..JY.Person[0]['姓名']..'：东西平安送到，我也就放心了。',-1,0)
   TalkEx('姑娘：家中没有贵重之物，这点心意……\n\n'..JY.Person[0]['姓名']..'：留着过日子吧。我答应的是送到你手里。',-1,0)
  else
   TalkEx(JY.Person[0]['姓名']..'：伤人的有伤人的账，不能算在一个孩子身上。\n\n你用现场的布条替少年包扎，店家答应留他养伤。',-1,0)
  end
  DrawStrBoxWaitKey('此事已记下，品德现为'..JY.Person[0]['品德']..'。没有新增武学、装备或额外酬金。')
 elseif n==3 then
  if q.insight then DrawStrBoxWaitKey('你记得老僧的话：能伤人，不等于该伤人。悟法经历仍在，护体还须本人的易筋境界、主运与品德相合。');return end
  if q.entrusted~='good' or q.wounded~='good' then DrawStrBoxWaitKey('老僧：施主不必急问经义，先顾眼前的人。\n须亲自完成归还托付与救助伤者两次善举，方可在此悟法。');return end
  TalkEx('荒寺老僧曾在客栈挂单。\n\n老僧：店家和邻舍都说，你送还了故人的遗物，也救了他们不愿救的人。',-1,0)
  TalkEx(JY.Person[0]['姓名']..'：我连自己的来处也记不清，只知道这两件事该做。\n\n老僧：若有一日，你武功高了，人人都怕你呢？',-1,0)
  local choice=ShowMenu({{'那更该收住手。能伤人，不等于该伤人。',nil,1},{'我仍想凭此争个天下第一。',nil,1},{'我还想不明白，暂且告辞。',nil,1}},3,0,0,0,0,0,1,1,24,0,0)
  if choice==1 then
   q.insight=true;saveMastery()
   TalkEx('老僧：记住今日这句话。往后翻经练功，再慢慢体会。',-1,0)
   DrawStrBoxWaitKey('悟法经历已记下。未获得秘籍或修为；护体须本人易筋八重以上并主运，品德70全效，50以下不生效。')
  elseif choice==2 then TalkEx('老僧：经书不会替人拿主意。施主，往后还得由自己守住这双手。',-1,0) end
 end
end
BrowserMasteryAction=function(pid,action)
 if not enabled(pid) then return false end
 if action=='mastery-signature' then
  if mastery.version>=2 then
   local menu,vals={},{}
   if rankOf(67)>0 then menu[#menu+1]={'胡家刀法 · 八级起见专精',nil,1};vals[#vals+1]=67 end
   if rankOf(20)>0 then menu[#menu+1]={'太极拳 · 九阳相辅',nil,1};vals[#vals+1]=20 end
   menu[#menu+1]={'收起拿手',nil,1};vals[#vals+1]=0
   local n=ShowMenu(menu,#menu,0,0,0,0,0,1,1,24,0,0)
   if n>0 then mastery.signature=vals[n];saveMastery() end
  else
   local n=ShowMenu({{'胡家刀法 · 八级起见专精',nil,1},{'太极拳 · 九阳相辅',nil,1}},2,0,0,0,0,0,1,1,24,0,0)
   if n>0 then mastery.signature=n==1 and 67 or 20;saveMastery() end
  end
 elseif action=='mastery-internal' then
  if mastery.version>=2 then
   local menu,vals={},{}
   if mastery.internalRank>0 then menu[#menu+1]={'九阳心法 · 每重增加15内力上限',nil,1};vals[#vals+1]=95 end
   if mastery.version>=3 and nonAttackRank(39)>0 then menu[#menu+1]={'紫霞心法 · 每重增加10内力上限',nil,1};vals[#vals+1]=39 end
   if mastery.version==4 and nonAttackRank(43)>0 then menu[#menu+1]={'易筋经 · 每重增加12内力上限，八重起可悟法护体',nil,1};vals[#vals+1]=43 end
   menu[#menu+1]={'收功 · 恢复自身内力上限',nil,1};vals[#vals+1]=0
   local n=ShowMenu(menu,#menu,0,0,0,0,0,1,1,24,0,0)
   if n>0 then mastery.internal=vals[n];applyInternal();saveMastery() end
  else
   local n=ShowMenu({{'九阳心法 · 每重增加15内力上限',nil,1},{'收功 · 恢复自身内力上限',nil,1}},2,0,0,0,0,0,1,1,24,0,0)
   if n>0 then mastery.internal=n==1 and 95 or 0;applyInternal();saveMastery() end
  end
 elseif action=='book' then
  local menu={};local ids=bookIds()
  for _,id in ipairs(ids) do local c=trainingCost(id);menu[#menu+1]={JY.Thing[id]['名称']..(learningFull(id) and ' · 已学十门' or rootReason(id)~='' and ' · '..rootReason(id) or c==math.huge and ' · 已练至十级' or ' · 下重需'..c..'点'),nil,1} end
  local n=ShowMenu(menu,#menu,0,0,0,0,0,1,1,24,0,0);if n>0 then chooseBook(ids[n]) end
 elseif action=='mastery-forget' then
  if mastery.version<2 then return false end
  if masteryFrozen or JY.Status==GAME_WMAP then DrawStrBoxWaitKey('战斗之中不能散功。');return true end
  local menu,ids={},{}
  for _,id in ipairs(bookIds()) do
   local rank=learnedRank(id)
   if rank>0 then ids[#ids+1]=id;menu[#menu+1]={JY.Thing[id]['名称']..' · 现'..rank..'重 已投'..mastery.perBookPaid[tostring(id)]..'点 可退'..refundFor(id)..'点',nil,1} end
  end
  if #ids==0 then DrawStrBoxWaitKey('尚无已学的可散之功。');return true end
  local n=ShowMenu(menu,#menu,0,0,0,0,0,1,1,24,0,0)
  if n<=0 then return true end
  local book=ids[n];local skill=books[book];local paid=mastery.perBookPaid[tostring(book)];local refund=refundFor(book)
  -- The original record stores this field as signed16 despite a higher source cap.
  if JY.Person[0]['修炼点数']+refund>32767 then DrawStrBoxWaitKey('返还后修炼点超过当前可存上限32767。请先研习消耗一些点数；此次没有散功。');return true end
  local lose=(mastery.version==4 and '返还受32767点上限限制，超出不保留；' or '')..'失去'..learnedRank(book)..'重修为与'..(paid-refund)..'点投入'..(mastery.signature==skill and '，撤销拿手' or '')..(book==95 and mastery.internal==95 and '，同时收功' or '')
  lose=lose..(book==95 and '；九阳心法与招式一并散去' or book==39 and '；紫霞境界与主运增益一并去除' or book==43 and '；易筋境界、主运增益与护体一并去除，善行经历保留' or book==45 and '；梯云轻功增益一并去除' or '；本门研习根基与相辅一并去除')
  if mastery.internal==book then lose=lose..'，内力上限回到'..mastery.baseMP end
  local c=ShowMenu({{'取消',nil,1},{'确认散功 · 退'..refund..'点，'..lose,nil,1}},2,0,0,0,0,0,1,1,24,0,0)
  if c==2 then
   local got=forgetBook(book)
   DrawStrBoxWaitKey(JY.Thing[book]['名称']..'已散功，返还'..got..'点修炼点，余'..JY.Person[0]['修炼点数']..'点。重学须付点从头修起。')
  end
 elseif action=='mastery-yijin' then yijinStory()
 elseif action=='mastery-supply' then
  if mastery.version~=4 or masteryFrozen or JY.Status==GAME_WMAP then return false end
  JY.Person[0]['修炼点数']=32767
  DrawStrBoxWaitKey('独立试验点数已补至32767。仅供比较修炼路线；不是正式奖励，不增加已学境界或累计研习投入。')
 elseif action=='mastery-study' then trainOne()
 elseif action=='mastery-rest' then
  local p=JY.Person[0];p['生命']=p['生命最大值'];p['内力']=p['内力最大值'];p['体力']=100;p['受伤程度']=0;p['中毒程度']=0
 elseif action=='mastery-spar' then spar()
 else return false end
 return true
end
