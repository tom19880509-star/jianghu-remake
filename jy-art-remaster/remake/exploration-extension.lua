-- Enter normally, including source entry coordinates, music and pass events.
-- FOX_CONFESSION_167_BEGIN
-- E28 alone dismisses Yan Ji with slot 1's trigger flag=-1.
-- E24 can later rewrite talk=-1 to 29; neither talk ID undoes the confession.
-- Read the existing event record, including old saves; do not infer from a spent herb.
do
 local known={
  [114]='苗前辈，我爹当真伤在你剑下？',
  [116]='胡大哥且慢。阎基下毒的事，你我都已听明白了，先让苗大侠说完。',
  [117]='可我爹终究伤在他剑下！这一剑的前因后果，我总得问个明白。',
  [118]='阎基已亲口承认：他图谋胡大侠手中的《雪山飞狐》，在你剑上暗下毒药，想等两败俱伤，再坐收渔利。只是你与胡大侠既是知交，当初为何要比试？',
  [120]='胡大哥，下毒的经过已经查清。可两位前辈当年如何交手，阎基未必说得真切，还得听苗大侠亲口讲。',
  [121]='苗前辈，我爹当年的刀法，究竟输在何处？',
  [123]='苗大侠，剑上之毒的来由，我们已经查到了。',
  [124]='哦？你们查到了什么？',
  [125]='阎基已亲口承认：他图谋胡大侠手中的《雪山飞狐》，在你剑上暗下毒药，想等两败俱伤，再坐收渔利。只是你与胡大侠既是知交，当初为何要比试？',
  [126]='胡大侠的儿子胡斐也在场，下毒的经过他已听阎基亲口说过。可当年比武的原委，他还未听你说起。今日这番话，我会转告他。',
  [128]='他虽已知道下毒的是阎基，可一提起亡父，心中仍难平静。这一剑的前因后果，只怕还得你亲口对他说。'
 }
 local sourceTalk=instruct_1
 instruct_1=function(id,head,flag,...)
  if known[id] and JY.SubScene==24 and GetD(50,1,1)==-1 then
   return TalkEx(known[id],head,flag)
  end
  return sourceTalk(id,head,flag,...)
 end
end
-- FOX_CONFESSION_167_END

-- YANJI_ORDER_BEGIN
-- 阎基居 50/1 的对话号：E20→21，E25→26，E27（胡斐在队进门）→28 待对质，E28 胜后 f1=-1 且对话清为 -1。
-- 原 E24 丹药柜无条件改成 29：E27 后先开柜会盖掉 28，E28 从此触发不了；E28 胜后开柜，已退场的阎基留下对话 29。
-- 药柜奖励与其余写入照原脚本，只在开柜后和进阎基居时把这一格改回：已退场→-1；E27 已走（50/5 路过已清）而对话是 21/29→28。
-- 已卡旧档与幽灵旧档，下次进阎基居即自然恢复；胡斐不在队时 E28 原样只说一句，对质仍待胡斐同来。
do
 local function repairYanji()
  local talk=GetD(50,1,2)
  if GetD(50,1,1)==-1 then
   if talk~=-1 then SetD(50,1,2,-1) end
  elseif GetD(50,5,4)==-1 and (talk==21 or talk==29) then
   SetD(50,1,2,28)
  end
 end
 local sourceYanjiEvent=oldCallEvent
 oldCallEvent=function(id,...)
  local result=table.pack(sourceYanjiEvent(id,...))
  if id==24 and JY.SubScene==50 then repairYanji() end
  return table.unpack(result,1,result.n)
 end
 local sourceYanjiInit=Init_SMap
 Init_SMap=function(...)
  local result=table.pack(sourceYanjiInit(...))
  if JY.SubScene==50 then repairYanji() end
  return table.unpack(result,1,result.n)
 end
end
-- YANJI_ORDER_END

-- YITIAN_REVISIT_BEGIN
-- 冰火岛出口 E67（72/3 路过，E65 挂上后从不清除）每次离岛都把光明顶 11/94 重写为谢逊回教对话 109。
-- 原版因此：E109 之后重访冰火岛再找谢逊，E109 重跑，灵蛇岛 73/2 计数多加一次，E108 轮不到，E105 挂不出来；
-- E105 或 E115 之后重访，则把圣火阵 115 或取书后的 121 改回 109。
-- 11/94 只有 E67/E109/E105/E115 会写，原值 -1：E67 跑过一次后，重跑时保留 11/94 原样；72/2 照原脚本清空。
-- 已受影响的旧档：进灵蛇岛时，计数（E108 之前为 106 起，只有 E95、E109 各加一）多于应有值就收回：
-- 应有值 = 106 + 1（E109 已做，多计只可能来自它）+ 1（仅当 E95 确已做过）。E95 未做时收回 107，留给 E95 自己补上 108。
-- E109 若已在岛上误跑，73/2 会是对话 110、路过 0，一并收回。E108 已跑（计数格清空）则不动。
-- 进光明顶时，若 E105/E115 已做而 11/94 被改回 109/110，恢复为 115/121。
do
 -- E95 是否做过：44/0、44/1 在 E95 之前只会是 92–95、-1/123（E92/E93/E103/E104）；E95 写 96/97；
 -- 其后胡青牛 E96 入队清空、E956 离队 957、E957 归队第 1 格 -1，王难姑 E97/E958/E959 同理。
 -- E932 也会清空这两格，但它要十四书齐全，取书之后才到，此时不修计数。
 local function butterflyHeard()
  if instruct_16(16) or instruct_16(17) then return true end
  for e=0,1 do
   local talk,flag=GetD(44,e,2),GetD(44,e,1)
   if talk==96 or talk==97 or talk==957 or talk==959 or flag==-1 or (flag==0 and talk==-1) then return true end
  end
  return false
 end
 local sourceRevisitEvent=oldCallEvent
 oldCallEvent=function(id,...)
  if id==67 and JY.SubScene==72 and GetD(11,94,2)>0 then
   local keep={}
   for i=0,7 do keep[i]=GetD(11,94,i) end
   local result=table.pack(sourceRevisitEvent(id,...))
   for i=0,7 do SetD(11,94,i,keep[i]) end
   return table.unpack(result,1,result.n)
  end
  return sourceRevisitEvent(id,...)
 end
 local sourceRevisitInit=Init_SMap
 Init_SMap=function(...)
  local result=table.pack(sourceRevisitInit(...))
  if JY.SubScene==73 and GetD(25,24,2)==933 then
   local walk,stray=GetD(73,2,4),GetD(73,2,2)==110
   local due=butterflyHeard() and 108 or 107
   if stray or walk>due then SetD(73,2,4,due) end
   if stray then SetD(73,2,2,-1) end
  elseif JY.SubScene==11 and (GetD(11,94,2)==109 or GetD(11,94,2)==110) then
   local won=GetD(11,90,2)==117 or GetD(11,101,2)==122
   if won or GetD(11,90,2)==111 or GetD(11,101,2)==116 then
    SetD(11,94,0,1);SetD(11,94,1,1);SetD(11,94,2,won and 121 or 115);SetD(11,94,3,-1);SetD(11,94,4,-1)
   end
  end
  return table.unpack(result,1,result.n)
 end
end
-- YITIAN_REVISIT_END

-- SHEDIAO_REPEAT_BEGIN
-- 黑龙潭出口 E432（21/3 路过，E423 挂上后从不清除）每次出潭都重写一灯居 47/0 为 429、百花谷 20/4 为周伯通 412、20/13 为瑛姑 415。
-- 原版因此：一灯随 E430 去了百花谷后，47/0 留下看不见的 429，再谈即重跑 E429/E430，每次品德 +2；
-- 已学互搏的 413、周伯通入队或武林帖清空的 20/4 都被改回 412，再谈即第二次授书 91。
-- 首次出潭时 21/1 必是瑛姑的 423（E423 不改它，E432 才清空，此后无人再写）：首次照原脚本；重跑时这三格保留原样，潭内清格与贴图照跑。
-- 已受影响的旧档只按事件记录与已持有的 91（唯一来源 E412）修回，不凭缺少物品推断：
-- 进一灯居时，20/14 已是 414（E430 唯一写入）而 47/0 仍是 429，清回 E430 之后的空格；进百花谷时，20/4 是 412 而已持有 91，改回 E412 之后的 413。
-- 已多得的 91、已加的品德不收回。
do
 local KEEP={{47,0},{20,4},{20,13}}
 local sourceExitEvent=oldCallEvent
 oldCallEvent=function(id,...)
  if id==432 and JY.SubScene==21 and GetD(21,1,2)~=423 then
   local keep={}
   for n,v in ipairs(KEEP) do keep[n]={};for i=0,7 do keep[n][i]=GetD(v[1],v[2],i) end end
   local result=table.pack(sourceExitEvent(id,...))
   for n,v in ipairs(KEEP) do for i=0,7 do SetD(v[1],v[2],i,keep[n][i]) end end
   return table.unpack(result,1,result.n)
  end
  return sourceExitEvent(id,...)
 end
 local sourceExitInit=Init_SMap
 Init_SMap=function(...)
  local result=table.pack(sourceExitInit(...))
  if JY.SubScene==47 and GetD(47,0,2)==429 and GetD(20,14,2)==414 then SetD(47,0,2,-1)
  elseif JY.SubScene==20 and GetD(20,4,2)==412 and instruct_18(91) then SetD(20,4,2,413) end
  return table.unpack(result,1,result.n)
 end
end
-- SHEDIAO_REPEAT_END

-- PINGYIZHI_CHEST_BEGIN
-- 平一指居 E303（田伯光一事了结后与平一指交谈，原 E307/E308 把 30/0 写成 303）把四只药柜换成不扣品德的取用版：
-- 30/1→887、30/2→888、30/3→889；第四项判的是 30/4 是否已空，写入却落在 30/2（原脚本笔误，应为 30/4→890）。
-- 原版因此：① 30/2 未取时，888（药材一百、智慧果二）当场被 890 盖掉；② 只要 30/4 未取，每次与他交谈
-- （答“没事逛逛”或队伍已满，人仍留在居中）都把已空的 30/2 重新挂成 890，回阳五龙膏×3 可无限领取；
-- ③ 30/4 始终是扣一点品德的 886。这里只把这一条写入改回 30/4，其余写入、对白、入队与品德照原脚本。
-- 旧档：30/2 已被挂成 890 的，下次交谈照原脚本第一项先写回 888，30/4 改挂 890；若此前已取过 888，
-- 可能再得一次——记录区分不出，接受这一次性余量，不凭物品推断。2026-10-02 全部 output/ 导出均未到 303。
do
 local sourcePingEvent=oldCallEvent
 oldCallEvent=function(id,...)
  if id~=303 or JY.SubScene~=30 then return sourcePingEvent(id,...) end
  local write=instruct_3
  instruct_3=function(s,d,v0,v1,v2,...)
   if s==-2 and d==2 and v2==890 then d=4 end
   return write(s,d,v0,v1,v2,...)
  end
  local r=table.pack(pcall(sourcePingEvent,id,...))
  instruct_3=write
  if not r[1] then error(r[2],0) end
  return table.unpack(r,2,r.n)
 end
end
-- PINGYIZHI_CHEST_END

-- LINGXIAO_DUEL_173_BEGIN
-- Both hall tiles start a forced protagonist-only duel (war59), fatal on loss.
-- Declining before the native event leaves its walk triggers and rewards intact.
do
 local sourceHallEvent=oldCallEvent
 oldCallEvent=function(id,...)
  if JY.SubScene==39 and (id==343 or id==344) then
   if not DrawStrBoxYesNo(-1,-1,'争取赏善罚恶令，须由主角独自与白万剑比试，同伴不能代战。若败，需读取上次住宿存档。是否上前？（可先离开整备，日后再来）',C_WHITE,CC.DefaultFont) then return end
  end
  return sourceHallEvent(id,...)
 end
end
-- LINGXIAO_DUEL_173_END

-- SONGSHAN_DUEL_345_BEGIN
-- A nearby-item path can cross either conference tile. Let players prepare
-- before the native cutscene commits them to four forced solo duels.
-- 原版 E202 按当时令狐冲是否在队，把 27/56、27/57 挂成主角版 E206/E214 或令狐版 E219/E220，此后不再变。
-- 两版只差出战者（war30–33 主角 / war34–37 令狐）、令狐两句（743/744）与主角版声望 +15，其余写入相同；
-- 56 格对应 206/219（走 y=29），57 格对应 214/220（y=28）。入场前让玩家选主角出战、令狐冲出战（确在队时）或先行整备，
-- 按选择在同一格调用对应原事件：对白、四场战斗、胜负与各自奖励照原脚本；先行整备不触发比剑、不改 S/D。
do
 local ENTRY={[206]={206,219},[219]={206,219},[214]={214,220},[220]={214,220}}
 local pendingCare=nil
 local sourceCare=BrowserCareMenuInfo
 BrowserCareMenuInfo=function(items)
  if pendingCare and items==pendingCare.items then return pendingCare.info end
  if sourceCare then return sourceCare(items) end
 end
 local function vitals(pid)
  local p=JY.Person[pid]
  return string.format('气血 %d/%d · 内力 %d/%d',p['生命'],p['生命最大值'],p['内力'],p['内力最大值'])
 end
 local sourceConferenceEvent=oldCallEvent
 oldCallEvent=function(id,...)
  local pair=JY.SubScene==27 and ENTRY[id]
  if pair then
   local linghu=instruct_16(35)
   local items={{'主角出战 · '..vitals(0),nil,1}}
   if linghu then items[2]={'令狐冲出战 · '..vitals(35),nil,1} end
   items[#items+1]={'先行整备',nil,1}
   pendingCare={items=items,info={title='嵩山比剑 · 选择出战',kicker='比剑夺帅',
    detail='入场后由选中者独自连战四场，同伴不能代战；若败，需读取上次住宿存档。也可先离开整备，日后再来。'}}
   local ok,n=pcall(ShowMenu,items,#items,#items,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_ORANGE)
   pendingCare=nil
   if not ok then error(n,0) end
   if n==1 then return sourceConferenceEvent(pair[1],...) end
   if linghu and n==2 then return sourceConferenceEvent(pair[2],...) end
   -- Passing events run after stepping onto the gate. Step back outside so
   -- preparing/Esc cannot walk onward from that same tile and skip the duel.
   instruct_19(42,pair[1]==206 and 29 or 28)
   return
  end
  return sourceConferenceEvent(id,...)
 end
end
-- SONGSHAN_DUEL_345_END

-- 只替换有实际代价的战斗确认，选择及事件结果仍走原脚本。
do
 local sourceSparEvent=oldCallEvent
 oldCallEvent=function(id,...)
  local prompt
  if (id==130 and JY.SubScene==34) or (id==141 and JY.SubScene==68) then
   prompt='与掌门过招练功：胜则得经验，但每场品德会减一；败则身死，需读取上次住宿存档。是否过招？'
  elseif (id==426 or id==427) and JY.SubScene==47 then
   prompt='是否依瑛姑之意，向一灯下杀手？这不是切磋：动手便损一分品德，获胜将取其性命，再损十分品德。选择“否”可罢手离开。'
  end
  if prompt then
   local f5=instruct_5
   instruct_5=function() return DrawStrBoxYesNo(-1,-1,prompt,C_WHITE,CC.DefaultFont) end
   local r=table.pack(pcall(sourceSparEvent,id,...))
   instruct_5=f5
   if not r[1] then error(r[2],0) end
   return table.unpack(r,2,r.n)
  end
  return sourceSparEvent(id,...)
 end
end

do
 local init=Init_SMap
 Init_SMap=function(...)
  local result=table.pack(init(...))
  if JY.Status==GAME_SMAP and JY.SubScene>=0 then browser_visit_scene(JY.SubScene) end
  return table.unpack(result,1,result.n)
 end
 local world=Game_MMap
 Game_MMap=function(...)
  local id=browser_take_travel()
  if id<0 then return world(...) end
  if JY.Status~=GAME_MMAP or (JY.CurrentD or -1)>=0 or browserMenuDepth>0 or not browser_has_visited(id) then
   browser_travel_notice('此刻无法赶路，请先结束当前交谈或事件。');return
  end
  local s=JY.Scene[id]
  if not s then browser_travel_notice('尚未亲历此地。');return end
  local entrance=nil
  for _,n in ipairs({1,2}) do
   local x,y=s['外景入口X'..n],s['外景入口Y'..n]
   if x and y and x>0 and y>0 and CanEnterScene(x,y)==id then
    for dir=0,3 do
     local px,py=x-CC.DirectX[dir+1],y-CC.DirectY[dir+1]
     if px>=10 and py>=10 and px<=CC.MWidth-10 and py<=CC.MHeight-10 and CanEnterScene(px,py)<0 and lib.GetMMap(px,py,3)==0 and lib.GetMMap(px,py,4)==0 then
      entrance={x=px,y=py,key=({VK_UP,VK_RIGHT,VK_LEFT,VK_DOWN})[dir+1]};break
     end
    end
   end
   if entrance then break end
  end
  if not entrance then browser_travel_notice('此地暂不可达，请先满足开放或轻功条件。');return end
  JY.Base['人X']=entrance.x;JY.Base['人Y']=entrance.y
  local read=lib.GetKey
  lib.GetKey=function()lib.GetKey=read;return entrance.key end
  local result=table.pack(pcall(world,...))
  lib.GetKey=read
  if not result[1] then error(result[2],0) end
  return table.unpack(result,2,result.n)
 end
end

-- 155 first-test pacing, pending Tom's ruling. Three source gates read the protagonist's BASE
-- attack: 金蛇剑 E640 (75), 张三丰太极剑 E157 (80), 高昌石门 E655 (90). In growth mode base attack only
-- rises with level-ups (about +2.5 a level, roughly 66 by the end of a normal first journey) because
-- manuals no longer add attack, so 碧血剑 and 白马啸西风 could not be finished. Only these exact
-- protagonist checks are eased; classic mode and every other instruct_29 call keep the source rule.
do
 local sourceAttackGate=instruct_29
 BrowserHeroAttackGates={[75]=60,[80]=63,[90]=65}
 instruct_29=function(pid,vmin,vmax,...)
  local eased=pid==0 and BrowserHeroAttackGates[vmin]
  if eased and BrowserGrowthEnabled and BrowserGrowthEnabled(0) then return sourceAttackGate(pid,eased,vmax,...) end
  return sourceAttackGate(pid,vmin,vmax,...)
 end
end

-- 155d: at 黑木崖 the source E320 lets 任我行 fight along only while the party has a free slot (war57);
-- a full party gets war54 without him, which real play and the combat155d model both show is far harder.
-- Nothing in the source says so. After the 黑木令牌 E317 opens the climb, a full party hears one inner line.
do
 local sourceHeimuEvent=oldCallEvent
 oldCallEvent=function(id,...)
  local result=table.pack(sourceHeimuEvent(id,...))
  if id==317 and JY.SubScene==26 and GetD(26,82,2)==318 and GetD(26,46,4)==320 and JY.Base['队伍'..CC.TeamNum]>=0 then
   TalkEx('＜黄钟公他们急着回崖上报信，任前辈多半也要来找东方不败算这笔旧账。崖上若遇见他，身边留个位置，或许能与他并肩一战。＞',0,1)
  end
  return table.unpack(result,1,result.n)
 end
end

-- 悦来客栈柜子 E245：源事件白拿 1000 两随即 instruct_37(-10)，独行或队中无正派同伴时全程静默（growth 的提示只在正派队友好感变动时才说）。只补一句。
do
 local sourceCabinetEvent=oldCallEvent
 oldCallEvent=function(id,...)
  local before=(id==245 and JY.SubScene==40 and JY.Person and JY.Person[0]) and JY.Person[0]['品德'] or nil
  local result=table.pack(sourceCabinetEvent(id,...))
  if before and JY.Person[0]['品德']<before then
   TalkEx('＜柜子里的银两是店家的。这样拿走，终究有亏德行。＞（品德'..(JY.Person[0]['品德']-before)..'）',0,1)
  end
  return table.unpack(result,1,result.n)
 end
end

-- 光明顶战后 E89 静默把崆峒 34/0、崑仑 68/7 改成可反复重打的练功战 E130/E141，领帖前玩家无从得知。事后补一句传闻。
do
 local sourcePeaceEvent=oldCallEvent
 oldCallEvent=function(id,...)
  local result=table.pack(sourcePeaceEvent(id,...))
  if id==89 and GetD(34,0,2)==130 and GetD(68,7,2)==141 then
   TalkEx('＜下山时听几名弟子议论：这一仗之后，崆峒唐掌门与崑仑何掌门都放了话，往后有人登门讨教，肯陪着过几招练练手。＞',0,1)
  end
  return table.unpack(result,1,result.n)
 end
end

-- 155d: source instruct_58 restores the protagonist between the five tournament groups only while 受伤程度<50 and
-- 中毒程度<=0, and a loss there is death. Nothing says so. Showing the 武林帖 at the gate (E935) while poisoned or
-- badly hurt now asks once; declining leaves the letter and the gate as they were.
do
 local sourceTournamentGate=oldCallEvent
 oldCallEvent=function(id,...)
  local p=JY.Person and JY.Person[0]
  if id==935 and JY.SubScene==25 and p and ((p['中毒程度'] or 0)>0 or (p['受伤程度'] or 0)>=50) then
   local what=(p['中毒程度'] or 0)>0 and '余毒未清' or '伤势未愈'
   if not DrawStrBoxYesNo(-1,-1,'少侠'..what..'。大会每三场虽可歇息，带着伤毒却调不回气血，一败便是性命之忧。仍要进场么？',C_WHITE,CC.DefaultFont) then return end
  end
  return sourceTournamentGate(id,...)
 end
end

-- 155f (reviews/combat155f-hall-heal-money.md, 实玩): after the 武林帖 the protagonist fights alone to the end and
-- needs about 13-16 full-restore salves (2600-3200 silver); 实玩 had to strip chests and sell every spare manual.
-- First journey in growth mode only: the letter carries 1000 silver of travel money (E932), and winning the tournament
-- (source instruct_58 hands over the staff) adds a 1200-silver purse. Both source events run once; nothing is stored.
do
 local function firstJourneyGrowth()
  local cycle=type(browser_journey_get)=='function' and tonumber(browser_journey_get('cycle')) or 1
  return cycle<2 and BrowserGrowthEnabled and BrowserGrowthEnabled(0)
 end
 -- 155g: later journeys get no tournament purse, yet the solo stretch needs more salve (reviews/combat155g-cycle2.md).
 -- Letter purse: 1000 on a first journey, 800 afterwards; the tournament purse stays first-journey only.
 local function letterPurse()
  if not (BrowserGrowthEnabled and BrowserGrowthEnabled(0)) then return 0 end
  local cycle=type(browser_journey_get)=='function' and tonumber(browser_journey_get('cycle')) or 1
  return cycle<2 and 1000 or 800
 end
 local function held(id)
  local n=0
  for i=1,CC.MyThingNum do if JY.Base['物品'..i]==id then n=n+(JY.Base['物品数量'..i] or 0) end end
  return n
 end
 local sourceLetterEvent=oldCallEvent
 oldCallEvent=function(id,...)
  local before=id==932 and held(189)
  local result=table.pack(sourceLetterEvent(id,...))
  local purse=id==932 and held(189)>before and letterPurse() or 0
  if purse>0 then
   DrawStrBoxWaitKey('请帖里还夹着一张银票，附言写着：路途遥远，聊备赴会盘缠。')
   instruct_2(174,purse)
  end
  return table.unpack(result,1,result.n)
 end
 local sourceTournament=instruct_58
 instruct_58=function(...)
  local before=held(143)
  local result=table.pack(sourceTournament(...))
  if held(143)>before and firstJourneyGrowth() then
   DrawStrBoxWaitKey('大会依例奉上彩头：一千二百两银票，供新任盟主添置行装。')
   instruct_2(174,1200)
  end
  return table.unpack(result,1,result.n)
 end
end

-- 155o (../../分析报告/Claude成果审查与推进计划-20260918.md 第二节第 2 条)：无量山洞的早期死亡陷阱。
-- 源流程：玉像 E484 需队中有段誉，磕首千遍后得北冥神功与凌波微步，同时把洞口三格 (45,29/30/31) 装上
-- 走过即触发的 E486 莽牯朱蛤（war78），而 E486 战败直接 instruct_15 死亡。洞内不能住宿存档，出口
-- (49,29/30/31) 在朱蛤之东，主角 1 级、段誉 2 级的正常早期队伍在这里战败就是整程作废。155i 只加了
-- 「洞口 · 有异响」的寻路提示，提示出现时出口已被战斗占住，等于没有退路。
-- 这里补两道，都不削弱朱蛤本身，胜利奖励（莽牯朱蛤、声望3）仍只有打赢才拿得到：
--   一、磕首之前先给预兆并允许退出，玩家可以不在此刻惊动它，日后再来；
--   二、真撞上时战前可选退走，战败改为脱身回洞口而不是死亡。脱身不发奖励，洞口三格仍然armed。
-- 引擎在 War_EndPersonData 里对我方“输赢都有”地回到生命上限的 1/5、体力至少 10，所以脱身后不必补血。
do
 local atToad=false
 local function inTeam(pid) for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then return true end end return false end
 local function toadArmed() return GetD(42,3,4)==486 end
 local function slipOut()
  if inTeam(53) then
   TalkEx('拉住我的袖子，别放手！',53,1)
   TalkEx('＜段誉脚下踏的正是那册凌波微步上的步子，忽东忽西，竟贴着石壁从那怪物身侧绕了过去。＞',0,1)
  else
   TalkEx('＜腥风扑面，睁不开眼，只能贴着石壁一步步退回洞口。＞',0,1)
  end
  instruct_19(48,30)
  -- 156 审查：脱身之后洞口三格仍 armed，洞里的人（E530 之后段誉、王语嫣住进来）在「循路前往」
  -- 里点得到却永远走不到。不改朱蛤也不改奖励，只把「里头仍旧过不去」说明白。
  DrawStrBoxWaitKey('一行人退到洞口，惊魂未定。那怪物没有追出来，洞里仍旧腥气逼人——不打过它，就进不去里头。')
 end
 local sourceCaveEvent=oldCallEvent
 oldCallEvent=function(id,...)
  if id==484 and JY.SubScene==42 and inTeam(53) and not toadArmed() then
   TalkEx('这洞里腥气愈来愈重，方才进来时还没有。',53,1)
   TalkEx('＜洞口那边有什么东西在挪动，窸窸窣窣的。此刻退出去还来得及；再耽搁下去，出洞时只怕要和它撞个正着。＞',0,1)
   if not DrawStrBoxYesNo(-1,-1,'仍要留下细看这尊玉像么？',C_WHITE,CC.DefaultFont) then
    TalkEx('段兄，这石像改日再看，先出洞要紧。',0,1)
    return
   end
  end
  if id~=486 or JY.SubScene~=42 then return sourceCaveEvent(id,...) end
  atToad=true
  local result=table.pack(sourceCaveEvent(id,...))
  atToad=false
  return table.unpack(result,1,result.n)
 end
 local sourceToadWar=instruct_6
 instruct_6=function(warid,...)
  if atToad and warid==78 then
   -- The crossing event runs on the same boundary tile in both directions.
   local ask=inTeam(53)
    and '段誉低声道：“这畜生不好惹。若不想硬拼，我带你退到洞口，日后再来。”\n\n要上前与它拼一场么？（选“否”先退开）'
    or '腥风扑面，那怪物正堵着去路。硬闯恐有凶险，也可沿石壁退到洞口，日后再来。\n\n要上前与它拼一场么？（选“否”先退开）'
   if not DrawStrBoxYesNo(-1,-1,ask,C_WHITE,CC.DefaultFont) then return false end
  end
  return sourceToadWar(warid,...)
 end
 local sourceCaveDeath=instruct_15
 instruct_15=function(...)
  if not atToad then return sourceCaveDeath(...) end
  slipOut()
 end
end
