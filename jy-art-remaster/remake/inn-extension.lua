-- Original short branch: an inn remembers how the party helped a traveller.
-- It grants no combat bonus and uses the source inn recovery rules.
local function amount(id)
 for i=1,CC.MyThingNum do if JY.Base['物品'..i]==id then return JY.Base['物品数量'..i] end end
 return 0
end
local function doctorReady(p)
 return p['生命']>0 and p['医疗能力']>=30 and p['解毒能力']>=40 and p['体力']>=10
end
local function choose(items)
 return ShowMenu(items,#items,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE)
end
local function rest()
 if browser_journey_get('innRested')==true then return end
 local recoverable,excluded=0,0
 for i=1,CC.TeamNum do
  local id=JY.Base['队伍'..i]
  if id>=0 then
   local p=JY.Person[id]
   if p['受伤程度']>=33 or p['中毒程度']>0 then excluded=excluded+1
   elseif p['生命']<p['生命最大值'] or p['内力']<p['内力最大值'] or p['体力']<100 or p['受伤程度']>0 then recoverable=recoverable+1 end
  end
 end
 if recoverable==0 then
  DrawStrBoxWaitKey('眼下没有能靠休整恢复的同伴。重伤或中毒须先治疗；这次免费休整仍为你留着。')
  return
 end
 local note=excluded>0 and ('另有'..excluded..'位同伴重伤或中毒，此次不能恢复。') or ''
 if not DrawStrBoxYesNo(-1,-1,'用掉本程的一次免费休整？'..recoverable..'位同伴可按客栈原规则恢复气血、内力、体力与轻伤。'..note..'不扣银两，也可留待下回。',C_WHITE,CC.DefaultFont) then return end
 instruct_12();browser_journey_reward('inn-rest')
 TalkEx('热饭送到，房间也收拾好了。诸位好生歇息，江湖再大，总得留些气力慢慢走。',106,0)
end
local sourceEvent=oldCallEvent
oldCallEvent=function(id)
 sourceEvent(id)
 if id~=667 or JY.SubScene~=1 or browser_journey_get('cycle')<2 then return end
 local done=browser_journey_get('innAid')
 if done=='doctor' or done=='medicine' then
  TalkEx(done=='doctor' and '那位行客已能下床了，临走还念着诸位诊治的恩情。原来行走江湖，除了好刀剑，也少不得一双救人的手。' or '那位行客服药后已缓过来了。他托我向诸位道谢，说这条命，是路上素不相识的朋友帮着捡回来的。',106,0)
  if browser_journey_get('innRested')~=true then rest() end
  return
 end
 TalkEx('客官且留步。后院有位行客中了毒，本地郎中说需解毒药，却一时寻不到。诸位若有精于医毒的朋友，或带着成药，还请搭把手。',106,0)
 local doctors,drugs={},{}
 for i=1,CC.TeamNum do
  local pid=JY.Base['队伍'..i]
  if pid>=0 and doctorReady(JY.Person[pid]) then doctors[#doctors+1]=pid end
 end
 for id=22,26 do if amount(id)>0 then drugs[#drugs+1]=id end end
 local route=choose({
  {#doctors>0 and '请同行医者诊治 · 耗体力10' or '请医者诊治 · 需医疗30、解毒40、体力10且健在',nil,#doctors>0 and 1 or 0},
  {#drugs>0 and '交一枚解毒药 · 自选成药' or '交解毒药 · 行囊暂无成药',nil,#drugs>0 and 1 or 0}
 })
 if route==1 and #doctors>0 then
  local menu={};for _,pid in ipairs(doctors) do local p=JY.Person[pid];menu[#menu+1]={p['姓名']..' · 医疗'..p['医疗能力']..'、解毒'..p['解毒能力']..'、体力'..p['体力'],nil,1} end
  local pid=doctors[choose(menu)];if not pid then return end
  local p=JY.Person[pid]
  if not DrawStrBoxYesNo(-1,-1,'由'..p['姓名']..'诊治？消耗体力10，不消耗药品。救助后获得本程一次免费客栈休整。',C_WHITE,CC.DefaultFont) then return end
  if not doctorReady(p) then return end
  p['体力']=p['体力']-10;browser_journey_reward('inn-aid','doctor')
  local line=pid==2 and '先莫忙着谢我。把灯移近些，我瞧瞧他的气色。救人须辨清病根，蛮使气力可不成。' or pid==9 and '劳烦备些清水，我进去看看。人还撑得住，咱们尽力便是。' or '劳烦引路，我先去瞧瞧。诊治须得细心，急也无用。'
  TalkEx(line,p['头像代号'],pid==0 and 1 or 0)
 elseif route==2 and #drugs>0 then
  local menu={};for _,drug in ipairs(drugs) do menu[#menu+1]={JY.Thing[drug]['名称']..' · 交1枚，现有'..amount(drug),nil,1} end
  local drug=drugs[choose(menu)];if not drug then return end
  if not DrawStrBoxYesNo(-1,-1,'交出'..JY.Thing[drug]['名称']..'一枚救助行客？救助后获得本程一次免费客栈休整。',C_WHITE,CC.DefaultFont) then return end
  if amount(drug)<1 then return end
  instruct_32(drug,-1);browser_journey_reward('inn-aid','medicine')
  TalkEx('这枚药你收好，请郎中照料那位客人。出门在外，谁没有个难处。',0,1)
 else return end
 TalkEx('多谢，多谢！那位客人已安稳下来。诸位下回找我，可免房钱歇一回；这份人情，小店记着。',106,0)
end

-- Reuse the original inn notices; the source event runs first (482 opens 483).
-- Reading news itself never changes inventory, exploration, rewards or quest stages.
do
 local signs={
  [1]={2,668,'河洛客栈',15,34},[3]={13,663,'有间客栈',15,34},
  [40]={0,244,'悦来客栈',16,35},[60]={11,504,'龙门客栈',16,35},
  [61]={5,482,'高昇客栈',15,34}
 }
 local localNews={
  [1]={'河洛铺面','店里的韦小宝做兵器、秘籍买卖，掌柜另备日常药品与酒食。出店往西南寻南贤，初来江湖的人，向他问路总比乱撞强。'},
  [3]={'北地行路','北地山路深长，切莫只凭一口锐气赶路。临行补足气力，伤药、解毒药各备一些；队中若有懂医的朋友，也好彼此照应。'},
  [40]={'酒客谈武','有老江湖说，绝招虽强，内息却不是无穷。行路时也莫丢了练熟的旧功，遇上缠斗，招稳、耗内少，往往比一味逞强管用。'},
  [60]={'龙门房价','西域行客渐多，掌柜已另议房钱。旧招牌上的五两不是眼下实价，投宿前务必问清，莫等住下才为银钱争执。'},
  [61]={'无量山路','本店小二熟悉无量山的路。想去那一带游历，可先向他问问；山中多有曲折，结伴备药，总比贸然独行妥当。'}
 }
 local function noticeRows(scene)
  local rows={{title='客栈须知',tag='店中告示',text='投宿歇息后可保存行程，也可恢复气血、内力与体力。身中毒伤或伤势沉重者，须先用药或请同行医者诊治，单靠睡觉不能治好。房钱以掌柜当面所说为准；回自家卧榻歇宿不收银两。'}}
  local function add(title,tag,text)if #rows<5 then rows[#rows+1]={title=title,tag=tag,text=text}end end
  local stage=browser_journey_get('dispersalQuest')
  if scene==1 and stage=='asked' then
   add('赊酒老丈','掌柜留言','告示旁那位白发老丈，又把酒账记岔了。客官若愿替他付一壶寻常温酒，来问掌柜便是；好酒不必买，老人家念叨的是那点暖意。')
  elseif scene==3 and stage=='mending' then
   add('借针补袖','掌柜留言','告示旁老丈的袖子破了，正找旧布针线。店里有些零碎针线，若有人愿替他付补衣工钱，可来与掌柜说一声。')
  elseif scene==40 and stage=='bowl' then
   add('旧碗认领','掌柜留言','白发老丈托人归还一只旧碗。饭钱不必再提，碗送回柜上就好；漂泊江湖的人，有时挂念的不过是一顿热饭。')
  end
  if GetD(44,0,2)==95 then
   add('蝴蝶谷近闻','行客传闻','听说蝴蝶谷那位夫人已经平安归来，谷中主人正候恩人重访。若你与此事有缘，得空不妨回谷问候；江湖路远，故人也值得惦记。')
  end
  if GetD(7,6,2)==395 and GetD(7,6,3)==396 and not instruct_18(153) then
   add('情花之困','行客传闻','有独臂少侠为情花之毒所困，寻常解药难解这场苦厄。绝情谷一带草木奇异，若已听闻此事，寻访时不妨多留心花木相生相克的门道。')
  end
  local news=localNews[scene];add(news[1],'近地见闻',news[2])
  return rows
 end
 local sourceSignEvent=oldCallEvent
 oldCallEvent=function(id)
  local scene=JY.SubScene
  local sign=signs[scene]
  local applies=sign and id==sign[2] and JY.Status==GAME_SMAP and GetD(scene,sign[1],2)==id
   and GetD(scene,sign[1],9)==sign[4] and GetD(scene,sign[1],10)==sign[5]
   and GetS(scene,sign[4],sign[5],3)==sign[1]
  sourceSignEvent(id)
  if applies and JY.SubScene==scene and JY.Status==GAME_SMAP then
   coroutine.yield('inn-board',{name=sign[3],rows=noticeRows(scene)})
  end
 end
end
