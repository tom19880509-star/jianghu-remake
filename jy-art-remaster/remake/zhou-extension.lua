-- New-journey companion, using the existing person, party and scene records.
local ZHOU_EXIT=2000 -- Extension dispatch only; original events end at 1018.
local function withZhou()
 return instruct_16(64)
end
local function canInviteZhou()
 return browser_journey_get('cycle')>=2 and browser_journey_get('kongming')
  and GetD(20,13,2)==415 and GetD(20,5,2)==410 and GetD(25,24,2)==933
end
local function showZhou(visible)
 if visible then instruct_3(20,4,1,1,413,-1,-1,6154,6154,6154,0,-2,-2)
 else instruct_3(20,4,0,0,-1,-1,-1,-1,-1,-1,0,-2,-2) end
end
local function prepareZhou()
 -- Reconcile only our registrations when switching between save slots.
 for i=#CC.PersonExit,1,-1 do if CC.PersonExit[i][1]==64 and CC.PersonExit[i][2]==ZHOU_EXIT then table.remove(CC.PersonExit,i) end end
 for i=#CC.AllPersonExit,1,-1 do if CC.AllPersonExit[i][1]==20 and CC.AllPersonExit[i][2]==4 then table.remove(CC.AllPersonExit,i) end end
 if browser_journey_get('cycle')>=2 then
  CC.PersonExit[#CC.PersonExit+1]={64,ZHOU_EXIT}
  CC.AllPersonExit[#CC.AllPersonExit+1]={20,4}
  if canInviteZhou() then showZhou(not withZhou()) end
 end
end
local sourceLoad=LoadRecord
LoadRecord=function(...)
 local result=sourceLoad(...);prepareZhou();return result
end
local sourceLeave=instruct_21
instruct_21=function(pid)
 local wasHere=pid==64 and withZhou()
 sourceLeave(pid)
 if wasHere then showZhou(canInviteZhou()) end
end
local function inviteZhou()
 if withZhou() or not canInviteZhou() then return end
 if instruct_20() then
  TalkEx('哎哟，你这一路已够热闹啦！先到大地图与一位朋友道别，再来百花谷找我。说定了，可不许偷偷溜走！',64,0)
  return
 end
 TalkEx('好玩，好玩！路上碰着稀奇招数，可得让我先瞧瞧。等你收到武林帖，要独自赴会时，我便回谷里陪瑛姑。',64,0)
 -- These supplies belong to the original opponent AI, not a recruitment gift.
 -- Keep them on the NPC without feeding them through the party inventory.
 local p=JY.Person[64];local carried={}
 for i=1,4 do carried[i]={p['携带物品'..i],p['携带物品数量'..i]};p['携带物品'..i]=-1;p['携带物品数量'..i]=0 end
 local joined=table.pack(pcall(instruct_10,64))
 for i,v in ipairs(carried) do p['携带物品'..i]=v[1];p['携带物品数量'..i]=v[2] end
 if not joined[1] then error(joined[2],0) end
 if withZhou() then showZhou(false);DrawStrBoxWaitKey('周伯通加入队伍。可在大地图点击头像，查看兵器与修炼。') end
end
local sourceEvent=oldCallEvent
oldCallEvent=function(id)
 if id==ZHOU_EXIT then
  if withZhou() and DrawStrBoxYesNo(-1,-1,'请周伯通先回百花谷？兵器、防具与秘籍归还行囊，未完成的修炼点数清空，已学武功保留。',C_WHITE,CC.DefaultFont) then
   TalkEx('我先回谷里看看蜂儿。等你想出新招，再来找我玩！',64,0)
   instruct_21(64)
  end
  return
 end
 if id==415 and canInviteZhou() and withZhou() then
  TalkEx('他一说起拆招，便忘了时辰。你们路上多加小心，也提醒他，谷里的蜂儿还等着他回来。',66,0)
  return
 end
 if id==413 and canInviteZhou() then
  if withZhou() then return end
  TalkEx('拳诀可想明白了？在谷里拆招好玩，出门见识新功夫，想来也好玩得紧！',64,0)
  local choice=ShowMenu({{'邀周伯通同游',nil,1},{'切磋武艺',nil,1},{'改日再来',nil,1}},3,1,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE)
  if choice==1 then inviteZhou();return end
  if choice~=2 then return end
  return sourceEvent(id)
 end
 sourceEvent(id)
 if id==413 and canInviteZhou() and not withZhou() then
  if DrawStrBoxYesNo(-1,-1,'空明拳诀已得。邀周伯通一道闯荡江湖？',C_WHITE,CC.DefaultFont) then inviteZhou() end
 end
end
