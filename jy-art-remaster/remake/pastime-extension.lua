-- 156 · 生活技能层：琴棋书画酒钓六艺，以及由它们提供的“另一条过剧情的路”。
-- 三条硬性约束：
--  1) 只包既有全局（oldCallEvent／instruct_6／instruct_12／LoadRecord），
--     不改原版脚本、不新增原事件号；原事件的对话、场景改写、声望一律照常执行。
--  2) 小游戏只用既有菜单与问答原语（ShowMenu／DrawStrBoxYesNo／DrawStrBoxWaitKey／TalkEx），
--     全程回合制、无计时、无手速，键鼠与触屏走的是同一套菜单，自然都能玩。
--  3) 绝不制造新卡关点：小游戏随时可以不玩、可以认输，输了就按原路打原版那一仗。
-- 存档字段 pastime 为可选；引擎补丁未合并时经 rawget 探测读到 nil，退化为本次游玩内有效，
-- 玩法完全不变，旧档也不会多出任何字段。
BrowserPastimeLevel=false
;(function()
 local PRACTICE_CAP=3
 local LEVEL_CAP=5
 local FISH_PER_REST=3
 local FISH_SELL_CAP=500
 local FISH_BAIT_CAP=3
 local MONEY=174
 local state=nil

 local function probe(name) return rawget(_G,name) end
 local function clamp(n,lo,hi)
  if type(n)~='number' then return lo end
  n=math.floor(n);if n<lo then return lo end;if n>hi then return hi end;return n
 end
 local function load()
  if state then return state end
  state={practice={},fish={left=FISH_PER_REST,sold=0,bait=0}}
  local reader=probe('browser_pastime_state')
  local raw=reader and reader() or nil
  if type(raw)=='table' then
   if type(raw.practice)=='table' then
    for art,rank in pairs(raw.practice) do state.practice[art]=clamp(rank,0,PRACTICE_CAP) end
   end
   if type(raw.fish)=='table' then
    state.fish.left=clamp(raw.fish.left or FISH_PER_REST,0,FISH_PER_REST)
    state.fish.sold=clamp(raw.fish.sold or 0,0,FISH_SELL_CAP)
    state.fish.bait=clamp(raw.fish.bait or 0,0,FISH_BAIT_CAP)
   end
  end
  return state
 end
 local function save()
  local writer=probe('browser_pastime_save')
  if writer then writer({version=1,practice=state.practice,fish=state.fish}) end
 end
 -- 等级 = 练得（入档，上限3）+ 资质／声望折算（不入档，随人物自然变化，上限2），合计封顶5。
 local function level(art)
  local s=load();local p=JY.Person[0]
  local innate=math.min(2,math.floor(math.max(0,p['资质'])/40)+(p['声望']>=300 and 1 or 0))
  return math.min(LEVEL_CAP,(s.practice[art] or 0)+innate)
 end
 local function practise(art)
  local s=load()
  if (s.practice[art] or 0)>=PRACTICE_CAP then return false end
  s.practice[art]=(s.practice[art] or 0)+1;save();return true
 end
 BrowserPastimeLevel=function(art) return level(art) end

 local function choose(items)
  return ShowMenu(items,#items,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE)
 end

 -- ── 酒 · 论杯 ────────────────────────────────────────────────────────────
 -- 原著依据：《笑傲江湖》第十四回，祖千秋于黄河舟中为令狐冲论酒具；
 -- 第十九回，令狐冲正是以这套酒器之学折服梅庄四庄主丹青生。
 -- 本作取舍：把原版“出示《谿山行旅图》即开打”的一仗，改成先斗酒具、后论输赢。
 local CUPS={
  {'汾酒','玉杯','唐人诗云「玉碗盛来琥珀光」，玉杯能增酒色。'},
  {'关外白酒','犀角杯','酒味极好，只少一股芳冽之气；犀角杯盛之，便醇美无比。'},
  {'葡萄酒','夜光杯','「葡萄美酒夜光杯」，葡萄酒作碧色，非夜光杯不能显其艳。'},
  {'高粱酒','青铜爵','高粱乃最古之酒，当用青铜酒爵，始有古意。'},
  {'米酒','大斗','米酒其味虽美，失之于甜，须用大斗饮之，方显气概。'},
  {'百草美酒','古藤杯','采百草浸酒，当用百年古藤雕成之杯，方不辜负那一股生气。'},
  {'绍兴状元红','古瓷杯','须用古瓷杯，最好是北宋瓷杯。'},
  {'梨花酒','翡翠杯','白乐天有句「青旗沽酒趁梨花」，杭州梨花酒自当用翡翠杯。'},
 }
 local function cupRound(index,hint,retry)
  local answer=CUPS[index]
  -- 娴熟（酒艺2级起）少一个干扰项，这就是技能在小游戏里的全部作用：降低难度，不代打。
  -- 干扰项用“先洗牌再取前几个”，不用“抽到重复就重抽”：抽签法的轮数取决于 Rnd 的质量，
  -- 这里的轮数必须是有界的。
  local pool={}
  for i=1,#CUPS do if i~=index then pool[#pool+1]=CUPS[i][2] end end
  for i=#pool,2,-1 do local j=Rnd(i)+1;pool[i],pool[j]=pool[j],pool[i] end
  local rows={{answer[2],nil,1}}
  for i=1,(hint and 2 or 3) do rows[#rows+1]={pool[i],nil,1} end
  -- 再洗一次：正解不总在第一项，但不靠手速，只靠是否读过那一段。
  for i=#rows,2,-1 do local j=Rnd(i)+1;rows[i],rows[j]=rows[j],rows[i] end
  rows[#rows+1]={'认输，不猜了',nil,1}
  TalkEx('这一坛是'..answer[1]..'。少侠说说，该用什么杯子？',31,0)
  local pick=choose(rows)
  if pick<=0 or rows[pick][1]=='认输，不猜了' then return false end
  if rows[pick][1]==answer[2] then
   DrawStrBoxWaitKey(answer[1]..'配'..answer[2]..'，正是。'..answer[3],C_WHITE,CC.DefaultFont)
   return true
  end
  if retry then
   DrawStrBoxWaitKey('丹青生摇头：「差了一层。再想想。」（酒艺娴熟，许你重答一回。）',C_WHITE,CC.DefaultFont)
   return cupRound(index,hint,false)
  end
  DrawStrBoxWaitKey('丹青生摇头：「'..answer[1]..'该用'..answer[2]..'。」'..answer[3],C_WHITE,CC.DefaultFont)
  return false
 end
 local function wineGame()
  local rank=level('jiu')
  TalkEx('喝酒？你小子懂酒么。我这里三坛陈酿，你说得出该用什么杯子，我便信你是懂的；说不出，咱们还是动手痛快。',31,0)
  if not DrawStrBoxYesNo(-1,-1,'与丹青生论杯：三问答对两问即算胜，胜了这一场不必动手。\n不限时，可随时认输改为比武，输了也只是照原样比武，不会卡住。\n现在开始？',C_WHITE,CC.DefaultFont) then return false end
  -- 同理：洗牌后取前三坛，轮数有界，也不必用 # 去数一张带洞的表。
  local order,right={},0
  for i=1,#CUPS do order[i]=i end
  for i=#order,2,-1 do local j=Rnd(i)+1;order[i],order[j]=order[j],order[i] end
  for n=1,3 do if cupRound(order[n],rank>=2,rank>=4) then right=right+1 end end
  if right<2 then
   TalkEx('三问只中'..right..'问，也罢。酒是喝不成了，手底下见真章罢！',31,0)
   return false
  end
  TalkEx('好！好！三问中了'..right..'问，少侠是真懂酒的。既是同道，还打什么？这一坛归你，画也请你自己收着。',31,0)
  if practise('jiu') then DrawStrBoxWaitKey('酒艺长进一层。（生活技能可在与人论艺时派上用场。）',C_WHITE,CC.DefaultFont) end
  return true
 end

 -- ── 梅庄四友：小游戏赢了就免掉那一仗，输了走原路 ─────────────────────────
 -- 原版：事件248／253／258／264 各接一场硬仗（战斗43／44／45／46），败则 instruct_15(83) 身死。
 -- 做法：只在原事件执行期间临时接管 instruct_6；赢了当作“不战而胜”返回 true，
 -- 原事件后面的对白、instruct_3 场景改写与声望照旧，剧情推进一模一样。
 local MEI={[248]={43,wineGame,'jiu'},[253]={44,nil,'shu'},[258]={45,nil,'qi'},[264]={46,nil,'qin'}}
 local sourceEvent=oldCallEvent
 oldCallEvent=function(id)
  local plan=MEI[id]
  if not plan or JY.SubScene~=55 or not plan[2] then return sourceEvent(id) end
  local sourceWar=instruct_6
  local sourceTalk=instruct_1
  local wineWon=false
  instruct_1=function(line,head,side,...)
   if wineWon then
    if line==809 then return TalkEx('论酒器也有这般见识，难得！好酒遇上知音，才不算白藏。',head,side) end
    if line==810 then return TalkEx('四庄主抬爱。在下不过记得几句前人说过的话，今日还得尝您珍藏的好酒。',head,side) end
    if line==811 then return TalkEx('身后那坛梨花酒，自取一壶便是。你且稍候，我去请三哥来，也让他见见这位新朋友。',head,side) end
   end
   return sourceTalk(line,head,side,...)
  end
  instruct_6=function(warid,...)
   if warid~=plan[1] then return sourceWar(warid,...) end
   instruct_6=sourceWar
   local ok,won=pcall(plan[2])
   if ok and won then wineWon=true;return true end
   return sourceWar(warid,...)
  end
  local ok,err=pcall(sourceEvent,id)
  instruct_6=sourceWar
  instruct_1=sourceTalk
  if not ok then error(err,0) end
 end

 -- ── 钓鱼 ────────────────────────────────────────────────────────────────
 -- 独立小游戏，回合制遛鱼：鱼的动作有固定应法，规则当场写明，读得懂就赢得了，不比手速。
 -- 三道闸保证它不会变成刷钱机器：每次歇宿只有三竿；每程卖鱼所得银两封顶；饵料不可囤积。
 local SPOTS={
  {'近岸浅滩',3,20,'水浅鱼小，最稳妥。'},
  {'柳荫深潭',5,40,'潭深藏大鱼，力道也大。'},
  {'石梁急流',7,70,'急流里多是好鱼，十竿九空。'},
 }
 local MOVES={
  {'猛地一挣，竿梢直弯下去','放线'},
  {'顺着水势侧游开去','稳竿'},
  {'沉住不动，线上只剩死沉','收线'},
 }
 local function playFish(spot)
  local rank=level('diao')
  local s=load()
  local need=math.max(4,spot[2]*2-rank)
  local progress=s.fish.bait>0 and 2 or 0
  if s.fish.bait>0 then s.fish.bait=s.fish.bait-1 end
  s.fish.left=s.fish.left-1;save()
  local tension=0
  DrawStrBoxWaitKey('抛竿入水。遛鱼之法：鱼挣则放线，鱼游则稳竿，鱼顿则收线。\n应对得法进两分，错了线上多两分张力；张力满六分便断线。\n需进'..need..'分收竿。'..(progress>0 and '（用了一份饵料，先得两分。）' or ''),C_WHITE,CC.DefaultFont)
  for _=1,6 do
   if progress>=need or tension>=6 then break end
   local move=MOVES[Rnd(#MOVES)+1]
   TalkEx('水下一动：'..move[1]..'。',-1,2)
   local pick=choose({{'收线',nil,1},{'放线',nil,1},{'稳竿',nil,1},{'弃竿走人',nil,1}})
   if pick<=0 or pick==4 then DrawStrBoxWaitKey('收了竿，由它去罢。',C_WHITE,CC.DefaultFont);return nil end
   local said=({'收线','放线','稳竿'})[pick]
   if said==move[2] then
    progress=progress+2
    DrawStrBoxWaitKey('应得正是时候。已进'..math.min(progress,need)..'／'..need..'分，张力'..tension..'／6。',C_WHITE,CC.DefaultFont)
   else
    tension=tension+(rank>=3 and 1 or 2)
    DrawStrBoxWaitKey('这一下应错了，该'..move[2]..'。已进'..progress..'／'..need..'分，张力'..tension..'／6。',C_WHITE,CC.DefaultFont)
   end
  end
  if progress<need or tension>=6 then
   DrawStrBoxWaitKey(tension>=6 and '啪的一声，线断了。今日这一竿算是白下。' or '鱼终究没能拉上来，摇尾去了。',C_WHITE,CC.DefaultFont)
   return nil
  end
  if practise('diao') then DrawStrBoxWaitKey('钓技长进一层。',C_WHITE,CC.DefaultFont) end
  return spot[3]+rank*5
 end
 local function keepFish(worth)
  local s=load()
  local room=FISH_SELL_CAP-s.fish.sold
  local price=math.min(worth,room)
  local sellable=price>0
  while true do
   local pick=choose({
    {'当场烤了 · 全队体力+15、气血+10',nil,1},
    {sellable and ('卖给渔家 · 得银两'..price..'（本程还可卖'..room..'）') or '卖给渔家 · 本程卖鱼已达五百两上限',nil,sellable and 1 or 0},
    {s.fish.bait<FISH_BAIT_CAP and ('留作饵料 · 现有'..s.fish.bait..'／'..FISH_BAIT_CAP) or ('留作饵料 · 已满'..FISH_BAIT_CAP..'份'),nil,s.fish.bait<FISH_BAIT_CAP and 1 or 0},
   })
   if pick==1 then
    for i=1,CC.TeamNum do
     local pid=JY.Base['队伍'..i]
     if pid>=0 and JY.Person[pid]['生命']>0 then AddPersonAttrib(pid,'体力',15);AddPersonAttrib(pid,'生命',10) end
    end
    DrawStrBoxWaitKey('就着河边生了火，鱼烤得焦香。众人歇了一口气。',C_WHITE,CC.DefaultFont);return
   elseif pick==2 and sellable then
    s.fish.sold=s.fish.sold+price;save();instruct_2(MONEY,price)
    DrawStrBoxWaitKey('渔家接过鱼，数了'..price..'两银子。（本程卖鱼所得至多五百两，卖满便不再收。）',C_WHITE,CC.DefaultFont);return
   elseif pick==3 and s.fish.bait<FISH_BAIT_CAP then
    s.fish.bait=s.fish.bait+1;save()
    DrawStrBoxWaitKey('留下做饵，下回抛竿先占两分便宜。现有饵料'..s.fish.bait..'／'..FISH_BAIT_CAP..'份。',C_WHITE,CC.DefaultFont);return
   elseif pick<=0 then return end
  end
 end
 local function fishing()
  local s=load()
  while s.fish.left>0 do
   local rows={}
   for i,spot in ipairs(SPOTS) do rows[i]={spot[1]..' · 需进'..math.max(4,spot[2]*2-level('diao'))..'分，约值'..(spot[3]+level('diao')*5)..'两 · '..spot[4],nil,1} end
   rows[#rows+1]={'收竿回去 · 今日还剩'..s.fish.left..'竿',nil,1}
   local pick=choose(rows)
   if pick<=0 or pick>#SPOTS then return end
   local worth=playFish(SPOTS[pick])
   if worth then keepFish(worth) end
  end
  DrawStrBoxWaitKey('今日的竿数用完了。歇过一夜，再来。',C_WHITE,CC.DefaultFont)
 end
 -- 只在真正的歇宿处（家中卧榻与客栈，与 rest-save 层同一份场景表）问一句；
 -- 剧情里别处调用 instruct_12 疗伤时，不该冒出一个钓鱼菜单。
 local PLACES={[1]=true,[3]=true,[40]=true,[60]=true,[61]=true,[70]=true}
 local sourceRest=instruct_12
 instruct_12=function(...)
  local result=table.pack(sourceRest(...))
  if JY.Status~=GAME_SMAP or not PLACES[JY.SubScene] then return table.unpack(result,1,result.n) end
  local s=load()
  s.fish.left=FISH_PER_REST;save()
  if DrawStrBoxYesNo(-1,-1,'醒来天色尚早，水边有人在下钓。同去垂几竿？\n今日'..FISH_PER_REST..'竿，回合制遛鱼，不限时。'..(s.fish.bait>0 and ('现有饵料'..s.fish.bait..'份。') or ''),C_WHITE,CC.DefaultFont) then
   local ok,err=pcall(fishing)
   if not ok then error(err,0) end
  end
  return table.unpack(result,1,result.n)
 end

 -- 换存档即换一套生活技能记录，不让上一局的进度串到下一局。
 local sourceLoad=LoadRecord
 LoadRecord=function(...) state=nil;return sourceLoad(...) end
end)()
