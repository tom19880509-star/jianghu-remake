-- Optional duel uses a temporary copy; no original records or source events change.
local function copyRecord(record,schema)
 local out={};for k in pairs(schema) do out[k]=record[k] end;return out
end
local function restoreRecord(record,values)
 for k,v in pairs(values) do record[k]=v end
end
local function fillResources(p)
 p['生命']=p['生命最大值'];p['内力']=p['内力最大值'];p['体力']=100;p['受伤程度']=0;p['中毒程度']=0
end
-- 155o 终章重接：atDoor=true 表示这一战发生在归梦之门的“归路”里，胜后主角仍清醒站在门前，
-- 由他自己决定回去／留下；胜后收束因此分两套，绝不替玩家先走完最后一步。
BrowserEchoDuel=function(record,trial,atDoor)
 local enemy=64 -- Existing actor storage is restored before any source scene resumes.
 local heroBefore=copyRecord(JY.Person[0],CC.Person_S)
 local enemyBefore=copyRecord(JY.Person[enemy],CC.Person_S)
 local baseBefore=copyRecord(JY.Base,CC.Base_S)
 local status,scene=JY.Status,JY.SubScene
 local growthCheckpoint=rawget(_G,'BrowserGrowthBattleCheckpoint')
 local masteryCheckpoint=rawget(_G,'BrowserMasteryBattleCheckpoint')
 local restoreGrowth=type(growthCheckpoint)=='function' and growthCheckpoint()
 local restoreMastery=type(masteryCheckpoint)=='function' and masteryCheckpoint()
 local function restoreCultivation()
  if restoreGrowth then restoreGrowth() end
  if restoreMastery then restoreMastery() end
 end
 local hero,p=JY.Person[0],JY.Person[enemy]
 for k,v in pairs(heroBefore) do if k~='代号' then p[k]=v end end
 if record then
  for k,v in pairs(record.stats) do p[k]=v end
  for i=1,10 do p['武功'..i]=0;p['武功等级'..i]=0 end
  for i,s in ipairs(record.skills) do p['武功'..i]=s.id;p['武功等级'..i]=s.level end
  p['武器']=record.gear.weapon;p['防具']=record.gear.armor
 end
 p['头像代号']=0;p['修炼物品']=-1
 local realRecord=record~=nil and not trial
 local evil=(record and record.alignment=='evil') or (not record and hero['品德']>50)
 p['姓名']=realRecord and '神秘人' or (evil and '恶念之影' or '侠义之影')
 p['品德']=evil and 0 or 100
 for i=1,4 do p['携带物品'..i]=-1;p['携带物品数量'..i]=0 end
 if BrowserGrowthSetEcho then BrowserGrowthSetEcho(enemy,record and record.growth or nil) end
 fillResources(hero);fillResources(p)
 if (not (BrowserGrowthHasOrdinary and BrowserGrowthHasOrdinary(0)) and War_GetMinNeiLi(0)>hero['内力最大值']) or (not (BrowserGrowthHasOrdinary and BrowserGrowthHasOrdinary(enemy)) and War_GetMinNeiLi(enemy)>p['内力最大值']) then
  if BrowserGrowthSetEcho then BrowserGrowthSetEcho(nil,nil) end
  restoreRecord(hero,heroBefore);restoreRecord(p,enemyBefore)
  restoreCultivation()
  DrawStrBoxWaitKey('这一道身影尚无能够施展的招式，暂不作比试。原进度不受影响。')
  browser_echo_result('unavailable',trial);return false
 end
 local rounds,heals,stopped=0,0,false
 local functions={WarLoad=WarLoad,War_EndPersonData=War_EndPersonData,War_ThinkDrug=War_ThinkDrug,War_ThinkDoctor=War_ThinkDoctor,War_AutoDoctor=War_AutoDoctor,War_AutoMove=War_AutoMove,War_Manual=War_Manual,War_Auto=War_Auto,War_PersonLostLife=War_PersonLostLife,War_isEnd=War_isEnd,ShowMenu=ShowMenu,DrawStrBoxWaitKey=DrawStrBoxWaitKey,WarShowHead=WarShowHead,ShowPersonStatus_sub=ShowPersonStatus_sub}
 local function isEcho() return WAR.Person[WAR.CurID] and WAR.Person[WAR.CurID]['人物编号']==enemy end
 WarLoad=function(id)
  functions.WarLoad(id)
  for i=1,6 do WAR.Data['自动选择参战人'..i]=i==1 and 0 or -1;WAR.Data['手动选择参战人'..i]=-1 end
  for i=1,20 do WAR.Data['敌人'..i]=i==1 and enemy or -1 end
  WAR.Data['经验']=0
 end
 -- Training and inventory changes are restored; no regular battle XP is awarded.
 War_EndPersonData=function() end
 War_ThinkDrug=function(flag) if isEcho() then return -1 end;return functions.War_ThinkDrug(flag) end
 War_ThinkDoctor=function() if isEcho() and heals>=3 then return -1 end;return functions.War_ThinkDoctor() end
 War_AutoDoctor=function() if isEcho() then heals=heals+1 end;return functions.War_AutoDoctor() end
 -- In a duel there is no extra target to gain by shuffling between equally
 -- effective tiles. Use the source range check and stay put if it can hit.
 War_AutoMove=function(slot)
  local unit=WAR.Person[WAR.CurID];local actor=JY.Person[unit['人物编号']]
  local skill=actor['武功'..slot];local level=math.modf(actor['武功等级'..slot]/100)+1
  if War_AutoCalMaxEnemy(unit['坐标X'],unit['坐标Y'],skill,level)>0 then return 1 end
  return functions.War_AutoMove(slot)
 end
 War_PersonLostLife=function() functions.War_PersonLostLife();rounds=rounds+1;browser_echo_progress(rounds);if rounds>=40 then stopped=true end end
 -- The source loop checks War_isEnd only after an action. Once the round
 -- limit is reached, return directly to that check without another turn or
 -- manual prompt. The original battle loop and its cleanup still run.
 War_Manual=function(...) if stopped then return 1 end;return functions.War_Manual(...) end
 War_Auto=function(...) if stopped then return 1 end;return functions.War_Auto(...) end
 War_isEnd=function() if stopped then return 2 end;return functions.War_isEnd() end
 ShowMenu=function(items,num,...)
  if JY.Status==GAME_WMAP and num==10 and items[1][1]=='移动' then
   items[11]={trial and '离开试炼' or '退出此战',function() stopped=true;return 1 end,1};num=11
  end
  return functions.ShowMenu(items,num,...)
 end
 DrawStrBoxWaitKey=function(s,...)
  if s=='战斗失败' then
   if stopped then s=rounds>=40 and (trial and '已达四十回合，试炼结束。' or '已达四十回合，此战作罢。') or (trial and '已离开试炼。' or '你已退出此战。')
   else s=trial and '胜败只在一念，无须挂怀。' or '你败下阵来。' end
  end
  return functions.DrawStrBoxWaitKey(s,...)
 end
 -- Portrait context: tell the renderer whose head is being drawn; restored by the functions loop.
 local function withPortrait(id,fn,...)
  if browser_echo_portrait then browser_echo_portrait(id) end
  local r=table.pack(pcall(fn,...))
  if browser_echo_portrait then browser_echo_portrait(-1) end
  if not r[1] then error(r[2],0) end
  return table.unpack(r,2,r.n)
 end
 WarShowHead=function(...) return withPortrait(WAR.Person[WAR.CurID]['人物编号'],functions.WarShowHead,...) end
 ShowPersonStatus_sub=function(id,...) return withPortrait(id,functions.ShowPersonStatus_sub,id,...) end
 BrowserOutfitEcho(enemy,record and (record.gear.outfit or {}) or (BrowserOutfitWorn(0) or {}))
 browser_echo_visual(enemy,p['姓名'],trial,false,realRecord)
 -- 回合计数从第 1 回合起就交给引擎（标签「试炼／交锋 n/40」只在有计数时显示；归途终战不计四十回合，不报进度）。
 browser_echo_progress(0)
 local result=table.pack(pcall(WarMain,135,0))
 BrowserOutfitEcho(enemy,nil)
 if BrowserGrowthSetEcho then BrowserGrowthSetEcho(nil,nil) end
 for k,v in pairs(functions) do _G[k]=v end
 restoreRecord(JY.Person[0],heroBefore);restoreRecord(JY.Person[enemy],enemyBefore);restoreRecord(JY.Base,baseBefore)
 JY.Status=status;JY.SubScene=scene
 restoreCultivation()
 browser_echo_visual(-1,'',trial,false,realRecord)
 if not result[1] then error(result[2],0) end
 local won=result[2] and not stopped
 local outcome=stopped and (rounds>=40 and 'timeout' or 'withdrawn') or result[2] and 'won' or 'lost'
 browser_echo_result(outcome,trial,rounds)
 if trial then
  DrawStrBoxWaitKey('【练习】独立练习结束，人物与行囊已恢复原状。此次不计正式通关或称号，也不揭示任何身世。')
 elseif won and realRecord then
  browser_echo_visual(enemy,'昔日的你',trial,true,realRecord)
  DrawStrBoxWaitKey('神秘人面上的墨影渐渐散去。那张脸，竟与你一模一样。')
  TalkEx('上一回走到这扇门前的人，是我。',0,0)
  -- Post-duel dialogue. Title of head 0 is taken from the visual name; no state is written.
  local heroName=JY.Person[0]['姓名']
  local function shadow(t) browser_echo_visual(enemy,'昔日的你',false,true,true);TalkEx(t,0,0) end
  local function me(t) browser_echo_visual(enemy,heroName,false,true,true);TalkEx(t,0,1) end
  if record.alignment=='evil' then
   shadow('别这样看我。我拦你，不是为了拦住你这个人。')
   me('那是为了什么？')
   shadow('你看看这江湖。为一部书，为一句旧怨，昨日同席的人今日便能拔刀。依我看，不是他们不肯停，是没有一个人能叫他们都停。')
   me('所以你要做那个人。')
   shadow('我便要做。肯坐下的，让他们坐下；不肯的，让他们跪下。就算统不成，叫他们联手来恨我，也好过彼此相杀。')
   me('他们恨够了你之后呢？')
   shadow('……至少有我在，刀便都对着我。')
   me('我许不了天下不争。可若有一天，他们不靠你也肯停手，你退不退？')
   shadow('他们不会。……你也不会懂。你不过是又走了一程，凭什么替我收场？')
   me('胜负已分。往后的路，让活着的人去走。')
   shadow('活着的人？凭什么你还有一生，我却只能散在这道门里！我还没有走完——既然你非要把我留在过去，那便谁也别想走出去！')
   if atDoor then
    -- 归路已经打开：他仍要抹掉这一生，可门框上的纹路先把那点墨光收了进去。主角清醒站着，最后一步留给他自己。
    DrawStrBoxWaitKey('门上残余的墨纹猛然向内收拢。他没有再凝出兵刃，而是把维系残影的最后一念也烧了进去。墨光扑来，你听见身后门框上的纹路一声轻响。')
    DrawStrBoxWaitKey('那点墨光没有落在你身上。门已经开着，门框上一圈一圈的纹路把它吸了进去，像吸掉一口陈年旧气。战中被打裂的墨纹一寸寸崩开；他想再聚拢，手臂却先化开了。')
    shadow('不……怎么会……只差……')
    me('你要抹掉的那一生，我还没有走完。')
    DrawStrBoxWaitKey('墨色散尽，门前再无第二道身影。你仍站在原处：名字、面孔、这一程说过的每一句话，一样也没有少。')
    DrawStrBoxWaitKey('门光重新照直了。灯下那人还没有抬头，像是没有听见门外的动静。')
   else
    DrawStrBoxWaitKey('门上残余的墨纹猛然向内收拢。他没有再凝出兵刃，而是把维系残影的最后一念也烧了进去。墨光扑来，战中被打裂的纹路一寸寸崩开；他想再聚拢，手臂却先化开了。')
    shadow('不……怎么会……只差……')
    me('我……还不能停在这里。')
    DrawStrBoxWaitKey('墨色散尽，门前再无第二道身影。名字、面孔、这一程交谈的声音相继断去，你仍有呼吸；熟悉的站势撑了一瞬，余势将你震入身后已开的门光。')
    DrawStrBoxWaitKey('归梦之门在身后合上。眼前只剩黑暗。你还活着，只是再想不起自己是谁。')
   end
  else
   me('你败了。还不走？')
   shadow('败了。可我总怕少守一天，就有人走到这里，却没人肯伸手。')
   me('你救得完么？')
   shadow('救不完。只是没想到，这一次拦下的，会是你。')
   me('我走到哪里，都是我自己的路。')
   shadow('你可还记得，最初想成为什么样的人？')
   me('记得。可我已经走到这里。')
   shadow('是。所以我劝不了你，也替不了你。')
   if atDoor then
    -- 救赎的念头照旧说出口，但它输了，便不再替主角作主：把最后一点光用来撑住门，让他自己选。
    DrawStrBoxWaitKey('那道身影低头看了一眼自己将尽的形体，把最后一点光按在门框的纹路上。')
    shadow('我本想把这一生从你身上抹去，再送你走一程。方才那一战，我就是为此而来。')
    me('现在呢？')
    shadow('现在我输了。输了的人，没有资格替你决定。')
    me('那你这点心念还留着做什么？')
    shadow('撑住这扇门。往后怎么走，你自己选。')
    DrawStrBoxWaitKey('门光稳住了，不再摇晃。他的形体一点一点淡下去。')
    shadow('若有一天你想回头，别等到无路可退才回头。')
    me('……我记下了。')
    -- 156 审核：消散挪到最后一格——上一句原本先宣布「连轮廓也没有剩下」，他却又带着头像说了一句。
    DrawStrBoxWaitKey('最后连轮廓也没有剩下，门前再无第二道身影。门光照进来，灯下那人还没有抬头。')
   else
    DrawStrBoxWaitKey('你抽回被门光照到的手，转身向外。那道身影低头看了一眼自己将尽的形体，把最后一点光融进门内。你回身欲挡，面前已没有能够击中的形体。')
    shadow('我这点心念，还能护你回去。醒来以后，你会忘了这一生。')
    me('凭什么替我决定？')
    shadow('我不知道这样能不能救你。可眼看着你这样走下去，我做不到。你做过的事留在这世上，谁也抹不去；若再来一回你还是如此，那便是我没能救回你。可你还活着，总还有别的路。')
    me('……你呢？')
    shadow('我就送到这里。')
    DrawStrBoxWaitKey('声音先远去，面孔褪成轮廓，连自己取的名字也想不起来。那只手先散，最后一点光护着你穿过门光，随后彻底消失，再无一点残影留下。')
    DrawStrBoxWaitKey('归梦之门在身后合上。眼前只剩黑暗。你还活着，只是再想不起自己是谁。')
   end
  end
  -- Both scripts end with the shadow's last strength spent; only now is the bound echo consumed.
  if browser_echo_spend then browser_echo_spend() end
  browser_echo_visual(-1,'',trial,false,realRecord)
 else
  DrawStrBoxWaitKey(won and '你已照见本心。完成这一程结局后，将留下同名纪念称号，不增加属性。' or '那道身影退回门影里，门仍在原处。这一程还没有走完：胜过他，才谈得上往后的路。')
 end
 return won
end
local sourceCycle=Game_Cycle
Game_Cycle=function(...)
 local mode=browser_echo_trial()
 if mode~='' then
 local status,scene=JY.Status,JY.SubScene
 JY.SubScene=20;JY.Status=GAME_SMAP
  local record=mode=='record' and browser_echo_record(true) or nil
  if mode=='record' and not record then DrawStrBoxWaitKey('本机尚无真实通关身影，请先完成一程江湖，或选择明确标记的配置样板。')
  else BrowserEchoDuel(record,true) end
  JY.Status=status;JY.SubScene=scene
 end
 return sourceCycle(...)
end
-- 155o · 门前必战（Tom 2026-09-18 裁定）：符合正式旧影条件时，必须先战胜旧影，才能走完这一程。
-- 资格沿用既有规则：本程绑定一份真实前程记录（browser_echo_record(false)，练习样板与首程没有），
-- 且该记录的善恶与本程当前立场相反；本程已经胜过（echoWon）或旧影已经耗尽（echoSpent 时记录为空）则不再重复。
-- BrowserEchoFinalDue：只判资格，不出对白、不开战，供身世层决定门前是否需要破例存档。
BrowserEchoFinalDue=function()
 if browser_journey_get('echoWon')==true then return false end
 local record=browser_echo_record(false)
 if not record then return false end
 return record.alignment==(JY.Person[0]['品德']>50 and 'evil' or 'good')
end
-- BrowserEchoFinal(atDoor)：返回 true＝可以继续（无资格旧影／本程已胜出／此刻刚胜出）；
-- false＝战败、退出或不应战，本程不得记通关，也不得进入去留。战前仍不揭底。
BrowserEchoFinal=function(atDoor)
 if browser_journey_get('echoWon')==true then return true end
 if not BrowserEchoFinalDue() then return true end
 local record=browser_echo_record(false)
 TalkEx('旧梦随水而来，门影里立着一个神秘人。他不言来历，只横身挡在门前。',0,1)
 -- 与圣堂石台的扫描同一种光纹（身世层的门前仪式），只作呼应，不点破来历。
 TalkEx('＜他抬手时，指间浮起一圈细光。圣堂石台扫过我的时候，也是这样的光纹。＞',0,1)
 TalkEx('＜他不肯让路。这条路，只能从他身上过去。＞',0,1)
 while DrawStrBoxYesNo(-1,-1,'与神秘人一战？双方满状态，对方无药、医疗至多三次，休息照常，四十回合为限。\n这一战必须胜出才能走完这一程：战败、退出或此刻不战，都不记通关，也不能决定往后的路。门仍在此，可稍后再来。',C_WHITE,CC.DefaultFont) do
  if BrowserEchoDuel(record,false,atDoor) then return true end
 end
 DrawStrBoxWaitKey('你退开一步。那道身影并不追来，只把手按在门框上。\n\n这一程还没有走完：胜过他，才谈得上往后的路。')
 return false
end
local sourceEnding=instruct_62
instruct_62=function(...)
 -- 身世归路打开时，门前必战已在归路里打完（胜出记 echoWon，此处直接放行）；没有归路的路线在这里把关。
 if not BrowserEchoFinal(false) then return end
 return sourceEnding(...)
end
-- ==== 归途终战（S2 2026-10-02 终版，接 backstory-extension 的 BrowserHomecomingWar 调用点）====
-- 选择「回去」后才打；返回 true＝胜出（身世层接 goBack 与 browser_homecoming('return')），false＝战败／不去（回到去留菜单，
-- 门前进度、旧影与通关档案都不动）。门里出现的是圣堂积下的武学留形（总体剧本提案第四节）：十大善人／十大恶人各用自己的招式
-- 与轮廓，不代表本人反目；两程真实通关留下的身手只作阵容收束，不复活人格、不再揭面、不再抹忆。
-- 同一战场三段连战（Tom 既定范围：二十位全部登场，不二十二人同屏）：一波群雄留形十位（弱半）、二波群雄留形十位（强半）、
-- 两程之影（通关档案 echoes 里真实的善影／恶影，各挂自己的成长快照；只有一程记录时，那一道影加两位再度凝出的群雄）。
-- 名单上正在同行的人不站到对面：其留形借无人用的人物格装成，名字叫「某某留形」，战斗编号仍是借格，画面按本人（引擎展示别名）。
-- 应邀者走正常入队（instruct_10，含离队行装 leftGear 的「重新配上」询问）、任何出口都走正常离队（instruct_21，行装归公并重记）。
-- 动身时门光为主角与应邀者回满气血内力、清伤毒（圣堂内室封闭后已无歇处，门前存档带着圣堂一战的残血）；没打赢或出错时
-- 把这些人的气血内力伤毒还原到动身前，战斗里吃掉的药照原规则算用掉。段间不存档，战后结算走原 War_EndPersonData 与 186 规则，
-- 本战基础经验为零，不调用 browser_echo_result／spend。三段我方受击系数 ×.3／×.12／×.25（balance-core B.homecomingTaken，S4 实测起点）。
;(function()
 local COMPANIONS={1,2,9,16,17,25,28,29,35,36,37,38,44,45,47,48,49,51,53,54,58,59,61,63,76}
 local SLOTS={65,66}                            -- 两道影暂借的人物格：不在两张名单，也不是同伴；战后逐字段还原
 local CLONE_POOL={81,82,83,84,85}              -- 同行者留形暂借的少林弟子格：不在名单、非同伴、无剧情事件；最多队伍上限 5 格
 -- 两波群雄（弱半先上；表内次序即站位次序，前五恶后五善）。强弱按 balance-core 155f 的六位十级宗师与等级／气血划分，由 S4 复核。
 local WAVES={
  {8,7,19,51,22, 3,68,70,57,56},               -- 一波：唐文亮 何太冲 岳不群 慕容复 左冷禅 ｜ 苗人凤 丘处机 玄慈 黄药师 黄蓉
  {67,71,62,60,26, 50,5,69,55,64},             -- 二波：裘千仞 洪教主 金轮法王 欧阳锋 任我行 ｜ 乔峰 张三丰 洪七公 郭靖 周伯通
 }
 local REFORM={64,26}                           -- 只有一程快照时，第三段再度凝出的两位（各名单最强：周伯通、任我行）
 local TAKEN={.3,.12,.25}                       -- 一波／二波／两影 我方受击系数
 -- 395 S4 实测（418 真实资源、段间门光、种子 1–24）：独行时二波强半十位在 ×.12 下是墙（0/19，段间回满也一样），
 -- 只对独行把二波改为 ×.05 → 独行全程 17/24、约 29 回合；五人队与其余两段不动（五人全程 24/24）。
 local SOLO_TAKEN2=.05
 local FORM={[8]='唐文亮',[7]='何太冲',[19]='岳不群',[51]='慕容复',[22]='左冷禅',[3]='苗人凤',[68]='丘处机',[70]='玄慈',[57]='黄药师',[56]='黄蓉',
  [67]='裘千仞',[71]='洪教主',[62]='金轮法王',[60]='欧阳锋',[26]='任我行',[50]='乔峰',[5]='张三丰',[69]='洪七公',[55]='郭靖',[64]='周伯通'}
 local MAX_PICK=5
 -- 应邀一句：各人自己的口吻，不重复“兄弟我来助你”。
 local LINES={
  [1]='胡斐在，刀便在。走罢。',[2]='药囊我带全了。你只管往前打，伤了有我。',[9]='你教过我何谓一诺。这一程，我送你到门口。',
  [16]='老夫不动手，只替你们把伤治着。谁倒下，先拖到我身边来。',[17]='用毒的事交给我。你只管别踩进我的毒里。',
  [25]='五毒教的人不送空话。要走，先把这群影子送走。',[28]='一指平不了天下，平你一人的伤总行。去罢。',
  [29]='田某生平不做好人，陪朋友打一架，还是做得的。',[35]='剑在手里，酒在后头。打完这一场，再喝一碗。',
  [36]='林某欠你的，今日还。',[37]='我这一辈子都在等人伸手。这回，换我伸手。',[38]='大哥，我不懂这些影子是什么，我只知道站在你这边。',
  [44]='老三的剪刀，剪影子也使得！',[45]='医者不该上阵，可薛某今日破一回例。',[47]='哼，你要走便走。走之前，先让我玩够这些影子。',
  [48]='我……我跟着你。',[49]='阿弥陀佛。小僧不杀生；影子不是生，打得。',[51]='慕容复不欠人情。今日这一战，便算还清。',
  [53]='六脉神剑灵不灵，我也说不准。总之，我站你身边。',[54]='金蛇剑法，今日替你开路。',[58]='一臂足矣。你走你的路，我替你挡这一程。',
  [59]='过儿去，我便去。',[61]='欧阳克平生只为自己出手，这回算破例。',[63]='我不多说什么。我在你身后。',
  [76]='各家招式我都记得。哪一路有破绽，我说与你听。',
 }
 local function inTeam(pid) for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then return true end end return false end
 local function menu(rows) return ShowMenu(rows,#rows,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE) end
 local function ask(text) return DrawStrBoxYesNo(-1,-1,text,C_WHITE,CC.DefaultFont) end
 local function narrate(t) DrawStrBoxWaitKey(t) end
 local function hero(t) TalkEx(t,0,1) end
 local function say(head,t) TalkEx(t,head,0) end
 local function alias(pid,shown) if type(lib)=='table' and type(lib.SetDisplayAlias)=='function' then lib.SetDisplayAlias(pid,shown) end end
 -- 本程好感达知己（affinity.persons[pid].bond，入队后到过 60）者；上一程的似曾相识不算。按好感高低、编号排序。
 local function candidates()
  local g=type(browser_growth_state)=='function' and browser_growth_state() or nil
  local a=type(g)=='table' and g.affinity;local rows={}
  if type(a)=='table' and type(a.persons)=='table' then
   for _,pid in ipairs(COMPANIONS) do
    local r=a.persons[tostring(pid)];local p=JY.Person[pid]
    if type(r)=='table' and r.bond==true and r.joined==true and p and (p['生命'] or 0)>0 then rows[#rows+1]={pid=pid,value=tonumber(r.value) or 0} end
   end
  end
  table.sort(rows,function(x,y) if x.value~=y.value then return x.value>y.value end;return x.pid<y.pid end)
  return rows
 end
 -- 真实通关快照：browser_echo_record(true,dir) 按方向返回 endingEchoes；以 alignment 核对方向，不符即视为该方向无记录。
 local function snapshot(dir)
  if type(browser_echo_record)~='function' then return nil end
  local r=browser_echo_record(true,dir)
  if type(r)=='table' and r.alignment==dir and type(r.stats)=='table' and type(r.skills)=='table' and type(r.gear)=='table' then return r end
  return nil
 end
 -- 借一格人物：记下每个被改写的字段（含原本不存在的键），还原时逐键写回，不依赖 CC.Person_S 是否齐全。
 local function borrow(slot)
  local p=JY.Person[slot];local before,seen={},{}
  local function keep(k) if not seen[k] then seen[k]=true;before[k]=p[k] end end
  for k in pairs(CC.Person_S) do keep(k) end
  for k in pairs(p) do keep(k) end
  local function set(k,v) keep(k);p[k]=v end
  return set,function() for k in pairs(seen) do p[k]=before[k] end end
 end
 -- 把一份通关快照装进暂借格（与 BrowserEchoDuel 同一套字段），返回还原函数。
 local function dress(slot,record,withGrowth)
  local set,restoreSlot=borrow(slot);local p=JY.Person[slot]
  for k,v in pairs(JY.Person[0]) do if k~='代号' then set(k,v) end end
  for k,v in pairs(record.stats) do set(k,v) end
  for i=1,10 do set('武功'..i,0);set('武功等级'..i,0) end
  for i,s in ipairs(record.skills) do if i<=10 then set('武功'..i,s.id);set('武功等级'..i,s.level) end end
  set('武器',record.gear.weapon);set('防具',record.gear.armor)
  set('头像代号',0);set('修炼物品',-1)
  local evil=record.alignment=='evil'
  set('姓名',evil and '恶念之影' or '侠义之影');set('品德',evil and 0 or 100)
  for i=1,4 do set('携带物品'..i,-1);set('携带物品数量'..i,0) end
  set('生命',p['生命最大值']);set('内力',p['内力最大值']);set('体力',100);set('受伤程度',0);set('中毒程度',0)
  -- 395 S3/S2：两道影各挂自己的成长快照（growth-extension 按人物编号分记影格）。
  if withGrowth and BrowserGrowthSetEcho then BrowserGrowthSetEcho(slot,record.growth or nil) end
  if BrowserOutfitEcho then BrowserOutfitEcho(slot,record.gear.outfit or {}) end
  return function()
   if withGrowth and BrowserGrowthSetEcho then BrowserGrowthSetEcho(nil,nil) end
   if BrowserOutfitEcho then BrowserOutfitEcho(slot,nil) end
   restoreSlot()
  end
 end
 -- 名单上正在同行的人装成留形：借一格，逐字段复制本人（头像、武功、兵器、面板都是他自己的），名字「某某留形」，满状态，不带药；
 -- 战斗编号仍是借格（伤害、站位、结算都按借格算），引擎展示别名让立绘与重制出招按本人画；战后别名清掉、借格还原。
 -- 成长层按人物编号记的内功加成与装束不随克隆（留形略弱于本人，S4 平衡时计入）。
 local function clone(slot,pid)
  local set,restoreSlot=borrow(slot);local src=JY.Person[pid];local p=JY.Person[slot]
  for k in pairs(CC.Person_S) do if k~='代号' then set(k,src[k]) end end
  for k,v in pairs(src) do if k~='代号' then set(k,v) end end
  set('姓名',(FORM[pid] or '无名')..'留形');set('修炼物品',-1)
  for i=1,4 do set('携带物品'..i,-1);set('携带物品数量'..i,0) end
  set('生命',p['生命最大值']);set('内力',p['内力最大值']);set('体力',100);set('受伤程度',0);set('中毒程度',0)
  alias(slot,pid)
  return function() alias(slot,-1);restoreSlot() end
 end
 -- 站位：原战 133/134 只用我方第 1 格（主角独战），war.sta 里我方 2-6 格有两格落在地图 25 南侧被墙隔开的死角（隔离实战复现：
 -- 双方永远够不着）。这里显式站位，全在 y=24..29 主场带：主角 (27,25) 居中，同伴环绕，敌方 12 格分列两翼。
 local ALLY_POS={{27,25},{26,24},{28,24},{26,26},{28,26},{27,27}}
 local ENEMY_POS={{22,26},{24,26},{30,26},{32,26},{22,24},{32,24},{22,28},{32,28},{20,25},{34,25},{20,27},{34,27}}
 -- 一段战斗：沿用原 WarMain（含 bridge 的 186 结算与 journey 的难度包装），只改参战名单、站位、基础经验与本段受击系数。
 local FALLEN={}
 -- 段间门光：每胜一段，主角与仍站着的应邀者回满气血内力、清伤毒（门前药囊无从补充，S4 实测五人队第三段因此不再缺内力）。
 local function refill(allies) for _,pid in ipairs(allies) do if not FALLEN[pid] then local p=JY.Person[pid];p['生命']=p['生命最大值'];p['内力']=p['内力最大值'];p['受伤程度']=0;p['中毒程度']=0 end end end
 local function stage(base,allies,enemies,taken)
  local sourceLoad=WarLoad
  WarLoad=function(id)
   sourceLoad(id)
   for i=1,6 do
    WAR.Data['自动选择参战人'..i]=allies[i] or -1;WAR.Data['手动选择参战人'..i]=-1
    WAR.Data['我方X'..i]=ALLY_POS[i][1];WAR.Data['我方Y'..i]=ALLY_POS[i][2]
   end
   for i=1,20 do
    WAR.Data['敌人'..i]=enemies[i] or -1
    local at=ENEMY_POS[i];if at then WAR.Data['敌方X'..i]=at[1];WAR.Data['敌方Y'..i]=at[2] end
   end
   WAR.Data['经验']=0
  end
  -- 归途专用受击系数（balance-core B.homecomingTaken）：只在本段战斗期间打开，pcall 后无论胜败都还原原值。
  local BM=rawget(_G,'BrowserMartialBalance');local was
  if type(BM)=='table' then was=BM.homecomingTaken;BM.homecoming=true;BM.homecomingTaken=taken end
  local result=table.pack(pcall(WarMain,base,0))
  if type(BM)=='table' then BM.homecoming=false;BM.homecomingTaken=was end
  -- 记下本段倒下的我方（段间门光只抚平仍站着的人；倒下的照原 186 规则抬到上限的 1/5）。
  FALLEN={}
  if result[1] and type(WAR)=='table' and type(WAR.Person)=='table' then
   for i=0,(WAR.PersonNum or 0)-1 do local u=WAR.Person[i];if u and u['我方'] and u['死亡'] then FALLEN[u['人物编号']]=true end end
  end
  WarLoad=sourceLoad
  if not result[1] then error(result[2],0) end
  return result[2]==true
 end
 local VITALS={'生命','内力','受伤程度','中毒程度'}
 local function vitals(list) local out={};for _,pid in ipairs(list) do local p=JY.Person[pid];local v={};for _,k in ipairs(VITALS) do v[k]=p[k] end;out[pid]=v end;return out end
 local LOSS='你倒在门前。墨影却不追来，只在门光里慢慢退回去。灯下那人仍在翻书，像是在等。'
 local function fight(base,good,allies,order)
  local taken={[0]=true};for _,pid in ipairs(allies) do taken[pid]=true end;for _,s in ipairs(SLOTS) do taken[s]=true end
  local restore={}
  local function unwind() for i=#restore,1,-1 do restore[i]() end;restore={} end
  local status,scene=JY.Status,JY.SubScene
  local ok,won=pcall(function()
   for w,list in ipairs(WAVES) do
    if w==2 then
     narrate('第一批留形散尽，门光再亮，身上的伤与耗去的内力又被抚平。这回走出来的身法，你在江湖上一一见过：降龙、太极、蛤蟆功、吸星……没有一路留余地。')
     hero('＜来的都是成名的招。＞')
    end
    -- 名单上的人若正在我方同行，借克隆池一格装成他的留形；池用尽（理论上限 5）则该位空缺。
    local roster,poolAt={},0
    for _,pid in ipairs(list) do
     if taken[pid] then
      poolAt=poolAt+1;local slot=CLONE_POOL[poolAt]
      if slot then restore[#restore+1]=clone(slot,pid);roster[#roster+1]=slot end
     elseif JY.Person[pid] then roster[#roster+1]=pid end
    end
    local won=stage(base,allies,roster,(w==2 and #allies==1) and SOLO_TAKEN2 or TAKEN[w])
    unwind();JY.Status=status;JY.SubScene=scene
    if not won then narrate(LOSS);hero('＜门还在。再来一回。＞');return false end
    refill(allies)
   end
   -- 第三段：两程之影。先核对真实快照，只有一程记录时补两位再度凝出的群雄。
   local goodEcho,evilEcho=snapshot('good'),snapshot('evil')
   local second,primary={},nil
   for _,dir in ipairs({good and 'evil' or 'good',good and 'good' or 'evil'}) do
    local rec;if dir=='good' then rec=goodEcho else rec=evilEcho end   -- 不用 and/or：goodEcho 为 nil 时会错落到恶影
    if rec then
     local slot=SLOTS[#second+1]
     restore[#restore+1]=dress(slot,rec,true)
     if primary==nil then primary=slot end
     second[#second+1]=slot
    end
   end
   local extra=''
   if #second<2 then
    for _,pid in ipairs(REFORM) do if not taken[pid] and JY.Person[pid] then second[#second+1]=pid end end
    extra=#second>0 and '，身后还跟着两道再度凝出的轮廓' or ''
   end
   if #second==0 then
    -- 没有任何通关快照（只在夹具或损坏档案里可能）：群影已散，直接放行。
    narrate('群影散尽。门框上的纹路照得通明，再没有什么挡在门前。');return true
   end
   narrate('群影散尽，门光一暗，又亮，身上的伤与耗去的内力再一次被抚平。'..((goodEcho and evilEcho) and '两道墨影自门中走出，各自起手，止在不同的架势' or '一道墨影自门中走出，起手止在你熟悉的架势')..extra..'。没有声音回答你。')
   hero(goodEcho and evilEcho and '＜这两路身法……我都认得。＞' or '＜这一路身法……我认得。＞')
   hero('这一次，路由我自己走。')
   -- 第二影编号只在真有两道影时才传（隔离实战复现：曾把补位的群雄当成第二影，描边与主角立绘映射都错）。
   if primary then browser_echo_visual(primary,JY.Person[primary]['姓名'],false,true,true,(goodEcho and evilEcho) and SLOTS[2] or -1) end
   local won=stage(base,allies,second,TAKEN[3])
   if primary then browser_echo_visual(-1,'',false,true,true) end
   unwind();JY.Status=status;JY.SubScene=scene
   if not won then
    narrate('最后一道墨影在你倒下时停了手，退回门光里。灯下那人仍在翻书，像是在等。')
    hero('＜门还在。再来一回。＞');return false
   end
   narrate('最后一道墨影散在门光里。门框上的纹路照得通明，再没有什么挡在门前。')
   if #order>0 then narrate('同来的人站在门光外。没有人说再见，只是都没有走。') end
   return true
  end)
  -- 任何出口（含出错）：影位、借格、展示别名、影视觉都还原。
  unwind();alias(-1,-1)
  if type(browser_echo_visual)=='function' then browser_echo_visual(-1,'',false,true,true) end
  JY.Status=status;JY.SubScene=scene
  if not ok then error(won,0) end
  return won==true
 end
 BrowserHomecomingWar=function()
  if type(browser_journey_get)=='function' and browser_journey_get('trial')==true then return false end
  local good=JY.Person[0]['品德']>50
  local base=good and 133 or 134                 -- 与本程圣堂之战同一张场地
  narrate('门光里浮出一道道身影：十大善人、十大恶人的轮廓，各自摆着熟悉的起手式。它们没有来历，是圣堂积下的交手痕迹，随归路一同显了出来。')
  say(73,'门里留下的只是招式。它们没有来历，也没有话要同你说。')
  say(74,'竖一根：影子不讲情面。你的朋友，都在你身后。')
  -- 邀人：至多五位，各人一句；不邀也可独行。「不去了」回到去留菜单。
  local rows=candidates();local picked,order={},{}
  if #rows==0 then
   narrate('没有人同你走这一段。门光里只有你一个人的影子。')
  else
   hero('＜谁肯送我这一段？＞')
   while true do
    local items,n={},0
    for _,r in ipairs(rows) do n=n+1;items[n]={JY.Person[r.pid]['姓名']..(picked[r.pid] and ' · 已应邀' or ''),nil,1} end
    items[n+1]={#order>0 and '动身' or '独自动身',nil,1};items[n+2]={'不去了',nil,1}
    local pick=menu(items)
    if pick==n+2 or pick<=0 then
     narrate('你退回门前。归路的光还亮着，并不催你。');return false
    elseif pick==n+1 then
     if ask(#order>0 and '带着应邀的同伴走进门光？' or '不邀任何人，独自走进门光？') then break end
    else
     local pid=rows[pick].pid
     if picked[pid] then
      picked[pid]=nil;for i,v in ipairs(order) do if v==pid then table.remove(order,i);break end end
     elseif #order>=MAX_PICK then narrate('同行至多五人。')
     else picked[pid]=true;order[#order+1]=pid;say(JY.Person[pid]['头像代号'],LINES[pid] or '我同你去。') end
    end
   end
  end
  -- 应邀者正常入队（离队行装若还在行囊、无人穿戴，由原规则问一次「重新配上」）；入队被拒的（如黑化线闸口）不上阵。
  local joined,allies={},{0}
  local ok,won=pcall(function()
   for _,pid in ipairs(order) do
    if not inTeam(pid) then instruct_10(pid);if inTeam(pid) then joined[#joined+1]=pid end end
    if inTeam(pid) then allies[#allies+1]=pid end
   end
   local before=vitals(allies)
   narrate(#allies>1 and '门光漫过众人。圣堂一战留在身上的伤、耗去的内力，都被这道光慢慢抚平了。' or '门光漫过全身。圣堂一战留在身上的伤、耗去的内力，都被这道光慢慢抚平了。')
   for _,pid in ipairs(allies) do local p=JY.Person[pid];p['生命']=p['生命最大值'];p['内力']=p['内力最大值'];p['受伤程度']=0;p['中毒程度']=0 end
   local result=table.pack(pcall(fight,base,good,allies,order))
   if not (result[1] and result[2]==true) then
    for pid,v in pairs(before) do local p=JY.Person[pid];for k,x in pairs(v) do p[k]=x end end
   end
   if not result[1] then error(result[2],0) end
   return result[2]==true
  end)
  -- 任何出口：应邀者照原规则离队（兵器、防具、衣履、秘籍归公，并重记离队行装）。
  for i=#joined,1,-1 do if inTeam(joined[i]) then instruct_21(joined[i]) end end
  if not ok then error(won,0) end
  return won==true
 end
end)()
