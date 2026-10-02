-- An optional later-journey branch after the original Meizhuang brush duel.
local function prepareBrush()
 if browser_journey_get('cycle')<2 then return end
 local t=JY.Thing[199]
 if t['名称']~='铁笔' then
  for key in pairs(CC.Thing_S) do if key~='代号' then t[key]=JY.Thing[112][key] end end
  t['使用人']=-1
 end
 t['名称']='铁笔';t['名称2']='铁笔';t['物品说明']='梅庄旧铁笔，锋钝而势沉。'
 t['加攻击力']=8;t['加轻功']=3;t['需攻击力']=0;t['需御剑能力']=0;t['需特殊兵器']=20
end
local sourceLoad=LoadRecord
LoadRecord=function(...) local result=sourceLoad(...);prepareBrush();return result end
local function brushRoom()
 if instruct_18(199) then return true end
 for i=1,CC.MyThingNum do if JY.Base['物品'..i]<0 then return true end end
 return false
end
local function lessonRoom()
 local free=false
 for i=1,10 do
  local id=JY.Person[0]['武功'..i]
  if id==80 then return false,'你已学过判官笔，不必重头再学。' end
  if id==0 then free=true end
 end
 return free,free and '' or '十门武功已满，不能再添一门。不会覆盖已学武功。'
end
-- Oral instruction uses the existing training pool and skill fields in r.grp.
-- No synthetic manual or second experience balance is needed.
BrowserBrushStudy=function(pid)
 if pid~=0 or browser_journey_get('cycle')<2 or browser_journey_get('meizhuang')~='lesson' then return nil end
 local p=JY.Person[pid]
 for i=1,10 do if p['武功'..i]==80 then
  local raw=p['武功等级'..i];local level=math.floor(raw/100)+1
  local cost=math.max(1,7-math.floor(p['资质']/15))*120*level
  return {slot=i,level=level,progress=raw%100,cost=cost,points=p['修炼点数'],maxed=level>=10,eligible=level<10 and p['生命']>0 and p['修炼点数']>=cost}
 end end
end
BrowserStudyBrush=function(pid)
 if JY.Status~=GAME_MMAP then return end
 local study=BrowserBrushStudy(pid)
 if not study or not study.eligible then return end
 local p=JY.Person[pid];local book=p['修炼物品']
 local shared=book>=0 and '这些点数与'..JY.Thing[book]['名称']..'共用，研习后该秘籍进度也会减少。' or '这些点数来自战斗所得。'
 if not DrawStrBoxYesNo(-1,-1,'研习判官笔：'..study.level..'级升至'..(study.level+1)..'级。消耗修炼点数'..study.cost..'，余'..(study.points-study.cost)..'。'..shared..'是否研习？',C_WHITE,CC.DefaultFont) then return end
 p['修炼点数']=p['修炼点数']-study.cost
 p['武功等级'..study.slot]=math.min(900,p['武功等级'..study.slot]+100)
 DrawStrBoxWaitKey('凝神演笔，点画渐熟。判官笔升为'..(study.level+1)..'级。',C_WHITE,CC.DefaultFont)
end
local sourceEvent=oldCallEvent
oldCallEvent=function(id)
 sourceEvent(id)
 if browser_journey_get('cycle')<2 or JY.SubScene~=55 or not ({[256]=true,[262]=true,[267]=true,[272]=true})[id] then return end
 local done=browser_journey_get('meizhuang')
 if done=='brush' or done=='lesson' then
  TalkEx(done=='brush' and '铁笔可还趁手？兵刃不过死物，点画间的分寸，还须自己去悟。' or '临敌练手，闲时养意。将交手所得细细咀嚼，笔法自会长进。行路歇脚时，也可独自研习。',32,0)
  return
 end
 if not instruct_18(179) then
  TalkEx('上次那幅率意帖，老夫仍有几处未曾看透。你若还留着，得闲带来，咱们平心静气地论一回笔法。',32,0)
  return
 end
 TalkEx('前回只顾争一口气，倒把笔中趣味搁下了。你肯借帖让我细看，我便陪你再拆几招。赢了，或取一枝旧铁笔，或学些点画的入门功夫，任你择一。',32,0)
 local lesson,reason=lessonRoom();local room=brushRoom()
 local pick=ShowMenu({{room and '取铁笔：攻击+8、轻功+3；装备需特殊兵器20' or '取铁笔：行囊已满，须先腾一格',nil,room and 1 or 0},{lesson and '学判官笔：主角习得1级招式，占一格武功' or '学判官笔：'..reason,nil,lesson and 1 or 0},{'改日再来',nil,1}},3,1,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE)
 if pick~=1 and pick~=2 then return end
 if pick==1 and not room then DrawStrBoxWaitKey('行囊已满，请先腾一格。');return end
 if pick==2 and not lesson then DrawStrBoxWaitKey(reason);return end
 local promise=pick==1 and '胜后领取铁笔；特殊兵器不足20，也可先收下，日后再装备。' or '胜后由主角学判官笔，从1级练起；不会覆盖已有武功。'
 if not DrawStrBoxYesNo(-1,-1,promise..'这一程只能择一。书帖当场归还，不影响梅庄旧事。现在由主角单人切磋？',C_WHITE,CC.DefaultFont) then return end
 TalkEx('好，先看老夫这一笔。落处须稳，转折却不可滞住！',32,0)
 local won=WarMain(44,0)
 instruct_13()
 if not won then TalkEx('收笔，收笔！锋芒虽足，气息还欠些从容。你歇息好了，咱们再试。书帖你收好。',32,0);return end
 if pick==1 then
  if not brushRoom() then DrawStrBoxWaitKey('行囊已满，此次不作选择。腾出空位后可再来切磋。');return end
  prepareBrush();instruct_2(199,1);browser_journey_reward('meizhuang','brush')
  TalkEx('这枝旧铁笔送你。不是什么神兵，贵在收放由心。帖已看过，原物奉还。',32,0)
 else
  local free,why=lessonRoom();if not free then DrawStrBoxWaitKey(why);return end
  -- Original instruct_33 overwrites slot 10 when full, so guard it explicitly.
  instruct_33(0,80,0);browser_journey_reward('meizhuang','lesson')
  TalkEx('横画藏劲，转折留势。老夫只替你开个头，其余须靠自己练去。书帖你仍带着。',32,0)
  DrawStrBoxWaitKey('大地图点击主角头像，可用战斗所得的修炼点数研习判官笔。与当前秘籍共用点数，每次提升一级，最高十级。',C_WHITE,CC.DefaultFont)
 end
end
