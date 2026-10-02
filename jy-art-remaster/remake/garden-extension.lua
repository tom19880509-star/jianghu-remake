-- 156 家园扩建与种植层：小虾米居的四间厢房、住客的活计、院西的药圃。
-- 五条硬性约束：
--  1) 只在扩展层包既有全局（oldCallEvent／Init_SMap／LoadRecord），不改原版脚本、不新增原事件号；
--     场景 70 的原版事件是 0–11，兵器架与营缮占 190–195、199，本层另取 170–175（药畦）与 180–183（厢房）。
--  2) 格位是读 content.js 的 sceneData 核过的：南廊 x22–42 / y37–39 与院西 x23–29 / y29–36
--     全段无原版事件、无建筑层、无空中层、无覆盖层，且都在原有院墙（y40 与 x43）之内。
--  3) 住客名单仍归好感层所有。本层只读 home=='resident'（住进来）与 home=='declined'（满好感但有牵挂，
--     人不来、方子寄来），一个字也不改好感记录，不调 instruct_10/21，不动队伍。
--  4) 存档新字段 wing／garden 都挂在既有的 homestead 记录里（homestead.js 规范化），可选；
--     旧档不碰这两个键，规范化前后逐字节不变。唯一的读写口是 BrowserHomesteadRecord／Commit。
--  5) 家园不能变成刷钱刷药的机器：作物按“出门一趟再回家”成熟（在家睡觉不算趟），
--     每畦一季只收一次，每趟至多制作 4 次，每味配方与每样作物各有本周目上限，
--     全园本周目累计产出**折银**封顶 3000 两（不是件数；经济组核出全程剧情银两只有 13050 两）。
--     园中所出一律卖不掉，没有产出→变现的回路。数值见 editorial/家园与种植156.md。
BrowserGardenMenu=false
BrowserGardenRoom=false
BrowserGardenBed=false
BrowserGardenRules=false
;(function()
 local MONEY,HERB,NITRE,HONEY,GALL=174,171,172,124,134
 -- OUT_CAP 是**折银**上限，不是件数：经济组解码 46 份存档核出全程剧情银两只有 13050 两、峰值 3310、终局 25，
 -- 本作后期是缺钱而非堆积。所以园中所出按各自折银累计，全周目封顶 3000 两——约当全程银两的四分之一，
 -- 也正好等于把家园整套建起来（厢房 2400＋药圃 600）花掉的钱：建家的银子换回等价的药，不多一分。
 -- 园中所出一律不可变卖（成品是类型 3／4，原料是类型 0，小宝只收类型 1／2），所以没有产出→变现的回路，
 -- 与小游戏组的钓鱼（每周目卖鱼封顶 500 两真银）不在同一条线上，不会叠成刷钱。
 local OUT_CAP,TRIP_CRAFT,PLOTS,ROOMS=3000,4,6,4
 local ROOM_COST={300,500,700,900}
 local PLOT_COST={200,150,250}
 local installed,away=nil,false

 -- 首测美术：都是场景 70 或百花谷里已经在用的贴图，只作占位，待美术组点验。
 local PIC_ROOM,PIC_BED,PIC_SPROUT,PIC_RIPE=3498,140,2336,2346

 local function probe(name)return rawget(_G,name)end
 local function rec(create)local f=probe('BrowserHomesteadRecord');return f and f(create) or nil end
 local function commit()local f=probe('BrowserHomesteadCommit');if f then f() end end
 local function amount(id)
  for i=1,CC.MyThingNum do if JY.Base['物品'..i]==id then return JY.Base['物品数量'..i] end end
  return 0
 end
 local function space(id)
  for i=1,CC.MyThingNum do if JY.Base['物品'..i]==id then return amount(id)<32767 end end
  for i=1,CC.MyThingNum do if JY.Base['物品'..i]==-1 then return true end end
  return false
 end
 local function books()local n=0;for id=144,157 do if amount(id)>0 then n=n+1 end end;return n end
 local function choose(rows)return ShowMenu(rows,#rows,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE)end
 local function say(text)DrawStrBoxWaitKey(text)end
 local function ask(text)return DrawStrBoxYesNo(-1,-1,text,C_WHITE,CC.DefaultFont)end
 local function name(pid)return JY.Person[pid] and JY.Person[pid]['姓名'] or '某人' end
 local function thing(id)return JY.Thing[id] and JY.Thing[id]['名称'] or ('物品'..id)end

 -- 好感层只读：住进来的人与“满好感却婉拒入住”的知交。婉拒本身就证明了满好感，
 -- 因为邀请入住只在好感满档时才出现，所以这里不必再自己算一遍好感数值。
 local function homes()
  local live,far={},{}
  local count=probe('BrowserAffinityResidents')
  if type(count)~='function' then return live,far end
  local n=count()
  local reader=probe('browser_growth_state');local g=reader and reader() or nil
  local persons=type(g)=='table' and type(g.affinity)=='table' and g.affinity.persons or nil
  if type(persons)~='table' then return live,far end
  for key,r in pairs(persons) do
   local pid=tonumber(key)
   if pid and pid>=1 and pid<=76 and type(r)=='table' then
    if r.home=='resident' and n>0 then live[pid]=true
    elseif r.home=='declined' then far[pid]=true end
   end
  end
  return live,far
 end
 -- 一个人“帮得上忙”有两种：住在山居（住客工坊），或人不来、把方子寄来（知交寄赠）。
 local function helps(live,far,pid)return live[pid]==true or far[pid]==true end
 local function anyHelp(live,far,list)
  for _,pid in ipairs(list) do if helps(live,far,pid) then return pid end end
  return nil
 end

 local HERBALISTS={2,45,9,16,28}
 local POISONERS={2,17,25}
 -- 逐人辅助技能：按各人原著身份配，不是按谁强。owner 是这门活计要指望的人。
 -- kind：resident=须住进来才做得成；letter=人不来也能寄方子来。
 local RECIPES={
  {key='balm',item=3,num=2,cost=20,need={{HERB,2}},cap=20,worth=20,gate='base',
   why='药圃一开，自家药炉就能配的伤药；不须任何剧情。'},
  {key='antidote',item=22,num=2,cost=20,need={{HERB,2}},cap=20,worth=35,gate='base',
   why='同上，黄连是院子里就有的寻常药。'},
  {key='niuhuang',item=25,num=1,cost=150,need={{HERB,4}},cap=6,worth=80,gate='one',who={16},kind='letter',
   why='与胡青牛好感满档（蝴蝶谷 E93 一段医道）后，他不肯挪窝，却把这张秘方写下来寄到山居。'},
  {key='jinniu',item=10,num=1,cost=120,need={{HERB,3}},cap=6,worth=40,gate='one',who={28},kind='letter',
   why='与平一指好感满档后，他说“我这屋子挪出去规矩就立不住”，人不来，治内伤的方子照寄。'},
  {key='zhenxin',item=18,num=1,cost=60,need={{HERB,3}},cap=6,worth=150,gate='one',who={45},kind='resident',
   why='薛慕华寻得《天龙八部》147、了了逍遥派门户之事后入住，两只药箱挑进厢房才配得出。'
     ..'镇心理气丸原版说明写的正是「名家配制」，不属任何门派，合他“阎王敌”的名头；原版全程只在 E841 给两份，商店不卖。'},
  {key='heiyu',item=9,num=1,cost=80,need={{HERB,4}},cap=4,worth=200,gate='one',who={9},kind='resident',book=50,
   why='张无忌寻得《倚天屠龙记》155 后入住，且行囊里有《胡青牛医书》50——原著里他的医术正是从这本书上得来，'
     ..'黑玉断续膏也正是《倚天》里接骨续筋的那一味。商店卖 200 两，所以家里配的要便宜些才有意思，一程只配四回。'},
  {key='thorn',item=102,num=3,cost=0,need={{GALL,1},{HERB,1}},cap=12,worth=30,gate='one',who=POISONERS,
   why='程灵素、王难姑、蓝凤凰任一位好感满档；住进来在毒室，婉拒的就把用毒的分寸写在信里。'},
  {key='jade',item=103,num=3,cost=0,need={{HONEY,1},{HERB,1}},cap=12,worth=50,gate='one',who={59},
   why='小龙女好感满档后婉拒入住（要与杨过同守古墓），却让人送来一箱玉蜂；有了蜂房才有蜂针。'},
  {key='wine',item=31,num=1,cost=200,need={{HONEY,3},{HERB,2}},cap=2,worth=300,gate='one',who={25},
   why='蓝凤凰好感满档。她回苗疆做她的教主，临行留下五宝花蜜酒的酿法。'},
  -- 故意不做「玉笛谁家听落梅」176：原版 E676 就是黄蓉亲手做这道菜的整段戏，要吃掉 138–142 五样肉料，
  -- 而这五样各自只有一处来源。家园层若也收这五样，就等于抢了原剧情的料，那一段再也演不成。
  {key='congee',item=32,num=1,cost=150,need={{HERB,4},{HONEY,1}},cap=1,worth=350,gate='one',who={56},kind='resident',
   why='黄蓉入住后掌勺。腊八粥原版说明是「珍奇花草制成」，正好出自自家园子，且商店不卖、原版只在 E353／E368 各给一份。'
     ..'它永久加内力上限，所以一程只许一碗。她眼下还不在好感层的可结交名册里，这一条现在解锁不了，已写进待合并补丁。'},
 }
 local CROPS={
  {key='herb',item=HERB,num=2,seed=10,trips=2,cap=80,worth=6,gate='base'},
  {key='nitre',item=NITRE,num=1,seed=15,trips=2,cap=40,worth=6,gate='base'},
  {key='ginseng',item=11,num=1,seed=60,trips=4,cap=12,worth=30,gate='base'},
  {key='gall',item=GALL,num=1,seed=30,trips=3,cap=12,worth=20,gate='one',who=POISONERS},
  {key='reishi',item=29,num=1,seed=120,trips=5,cap=2,worth=400,gate='one',who=HERBALISTS},
  {key='honey',item=HONEY,num=1,seed=80,trips=3,cap=6,worth=25,gate='one',who={59}},
 }
 BrowserGardenRules=function()return CROPS,RECIPES,ROOM_COST,PLOT_COST,OUT_CAP,TRIP_CRAFT end

 -- 一条活计能不能做：gate=base 恒真；gate=one 须 who 里至少一位帮得上忙，
 -- kind=resident 的还要求人真的住进来，book 的还要求那本书在行囊里。
 local function allowed(entry,live,far)
  if entry.gate=='base' then return true end
  local pid=nil
  for _,id in ipairs(entry.who or {}) do
   if entry.kind=='resident' then if live[id] then pid=id end else if helps(live,far,id) then pid=id end end
   if pid then break end
  end
  if not pid then return false,nil end
  if entry.book and amount(entry.book)<1 then return false,pid end
  return true,pid
 end
 local function tally(g,key)return g.made[key] or 0 end
 -- out 记折银，不记件数：一味药值多少两，按经济组已钉死的档位（黄连解毒丸 35、黑玉断续膏 200、
 -- 玉真散 0.75 两一点血）折算，见 editorial/家园与种植156.md。
 local function bump(g,key,n,worth)g.made[key]=tally(g,key)+n;g.out=math.min(OUT_CAP,g.out+n*worth)end

 -- ===== 场景 70 的格位（全部读码核过，见文件头第 2 条） =====
 local function roomX(n)return 23+(n-1)*5 end          -- 甲 23 乙 28 丙 33 丁 38，各占四格宽
 local function bedAt(n)return 24+((n-1)%3)*2,(n<=3) and 33 or 35 end
 local function event(id,code,x,y,pic)
  local row={1,id,code,-1,-1,pic,pic,pic,0,x,y}
  for i,v in ipairs(row)do SetD(70,id,i-1,v)end;SetS(70,x,y,3,id)
 end
 local function pave(x,y)
  SetS(70,x,y,0,1138);SetS(70,x,y,1,0);SetS(70,x,y,2,0);SetS(70,x,y,3,-1);SetS(70,x,y,4,4);SetS(70,x,y,5,0)
 end
 local function install()
  local s=rec(false);local g=s and s.garden;local w=s and s.wing
  local built=w and w.built or 0;local plots=g and g.plots or 0
  local mark=built*16+plots
  if installed==mark then return end
  for n=1,built do
   local x0=roomX(n)
   for x=x0,x0+3 do for y=37,39 do pave(x,y) end
    -- 北面砌墙，只在第二格留门；廊下两行是房内地面，玩家走到门口即可。
    if x~=x0+1 then SetS(70,x,37,1,(x%2==0) and 1504 or 1508) end
   end
   event(179+n,13009+n,x0+2,38,PIC_ROOM)
  end
  for n=1,plots do
   local x,y=bedAt(n)
   local bed=g and g.beds[tostring(n)]
   local crop=bed and CROPS[bed.crop] or nil
   local ripe=bed and crop and (g.trip-bed.trip)>=crop.trips
   event(169+n,13019+n,x,y,(not bed) and PIC_BED or (ripe and PIC_RIPE or PIC_SPROUT))
  end
  installed=mark;JY.D_Valid=nil
 end
 local function refresh()installed=nil;install()end

 -- 住客自动分房：按人物代号先后补进空屋，住客离开（本层不会主动让人离开）时腾空。
 local function seat(s,live)
  local w=s.wing;local taken={}
  for key,pid in pairs(w.rooms) do
   if tonumber(key)>w.built or not live[pid] then w.rooms[key]=nil else taken[pid]=true end
  end
  local order={};for pid in pairs(live) do order[#order+1]=pid end;table.sort(order)
  for _,pid in ipairs(order) do
   if not taken[pid] then
    for n=1,w.built do
     if not w.rooms[tostring(n)] then w.rooms[tostring(n)]=pid;taken[pid]=true;break end
    end
   end
  end
 end

 -- ===== 制作 =====
 local function costText(entry)
  local parts={}
  for _,pair in ipairs(entry.need) do parts[#parts+1]=thing(pair[1])..'×'..pair[2] end
  if entry.cost>0 then parts[#parts+1]=entry.cost..'两' end
  return table.concat(parts,'、')
 end
 local function craft(s,entry)
  local g=s.garden
  if type(g.work)~='table' or g.work.trip~=g.trip then g.work={trip=g.trip,n=0} end
  if g.work.n>=TRIP_CRAFT then say('今日的炉火已用了四回，药性都燥了。出门走一趟，回来再说。');return end
  if g.out>=OUT_CAP then say('家里存的药和毒已经够多了。江湖上的事，终究不是在自家院子里炼得出来的。');return end
  if tally(g,entry.key)>=entry.cap then say('这一味，本程已配到了尽头。');return end
  for _,pair in ipairs(entry.need) do
   if amount(pair[1])<pair[2] then say('还缺'..thing(pair[1])..'，凑够'..pair[2]..'份再来。');return end
  end
  if amount(MONEY)<entry.cost then say('工料钱还差一些。');return end
  if not space(entry.item) then say('行囊已满，先腾出一格。');return end
  if not ask('以'..costText(entry)..'，制'..thing(entry.item)..'×'..entry.num..'？') then return end
  for _,pair in ipairs(entry.need) do
   if amount(pair[1])<pair[2] then return end
  end
  if amount(MONEY)<entry.cost then return end
  for _,pair in ipairs(entry.need) do instruct_32(pair[1],-pair[2]) end
  if entry.cost>0 then instruct_32(MONEY,-entry.cost) end
  instruct_32(entry.item,entry.num)
  g.work.n=g.work.n+1;bump(g,entry.key,entry.num,entry.worth);commit()
  say('成了。'..thing(entry.item)..'×'..entry.num..'收进行囊。')
 end
 -- only 不为 nil 时只列这个人经手的活计（在他自己屋里问），否则列自家药炉上一切做得成的。
 local function workshop(s,only)
  local live,far=homes()
  while true do
   local rows,picks={},{}
   for _,entry in ipairs(RECIPES) do
    local ok,pid=allowed(entry,live,far)
    local mine=(only==nil) or (pid==only)
    if mine and (ok or only==nil) then
     local g=s.garden;local left=entry.cap-tally(g,entry.key)
     rows[#rows+1]={thing(entry.item)..' · '..costText(entry)..(ok and (' · 尚可'..left..'次') or ' · 方子未得'),nil,(ok and left>0) and 1 or 0}
     picks[#rows]=ok and left>0 and entry or nil
    end
   end
   if #rows==0 then say(only and '他眼下没有要你搭手的活计。' or '药炉是空的。先开辟药圃，或与懂药的朋友结下交情。');return end
   local pick=choose(rows)
   if not pick or not picks[pick] then return end
   craft(s,picks[pick])
  end
 end

 -- ===== 药畦 =====
 local function sow(s,n)
  local g=s.garden;local live,far=homes()
  local rows,picks={},{}
  for index,crop in ipairs(CROPS) do
   local ok=allowed(crop,live,far);local left=crop.cap-tally(g,crop.key)
   rows[#rows+1]={thing(crop.item)..' · 种子'..crop.seed..'两 · 出门'..crop.trips..'趟可收 · 本程尚可'..math.max(0,left)..'份',nil,(ok and left>0) and 1 or 0}
   picks[#rows]=(ok and left>0) and index or nil
  end
  local pick=choose(rows)
  local index=pick and picks[pick]
  local crop=index and CROPS[index]
  if not crop then return end
  if amount(MONEY)<crop.seed then say('种子钱还差一些。');return end
  if not ask('下'..thing(crop.item)..'的种，花'..crop.seed..'两。出门'..crop.trips..'趟回来便可采收。') then return end
  if amount(MONEY)<crop.seed then return end
  instruct_32(MONEY,-crop.seed)
  g.beds[tostring(n)]={crop=index,trip=g.trip}
  commit();refresh();say('土翻松了，种也下了。')
 end
 local function reap(s,n)
  local g=s.garden;local key=tostring(n);local bed=g.beds[key]
  local crop=bed and CROPS[bed.crop]
  if not crop then return end
  local waited=g.trip-bed.trip
  if waited<crop.trips then say(thing(crop.item)..'还嫩。再出门'..(crop.trips-waited)..'趟，回来就是时候了。');return end
  if g.out>=OUT_CAP then say('园子已经给得够多了。');return end
  if tally(g,crop.key)>=crop.cap then say('这一味本程收得够了，余下的留在地里作种。');return end
  if not space(crop.item) then say('行囊已满，先腾出一格再来收。');return end
  instruct_32(crop.item,crop.num)
  g.beds[key]=nil;bump(g,crop.key,crop.num,crop.worth);commit();refresh()
  say('收了'..thing(crop.item)..'×'..crop.num..'。畦子空出来了，可以再下一茬。')
 end
 BrowserGardenBed=function(n)
  local s=rec(false);local g=s and s.garden
  if not g or n<1 or n>g.plots then return end
  local bed=g.beds[tostring(n)]
  if bed then reap(s,n) else sow(s,n) end
 end

 -- ===== 厢房 =====
 BrowserGardenRoom=function(n)
  local s=rec(false);local w=s and s.wing
  if not w or n<1 or n>w.built then return end
  local live,far=homes();seat(s,live);commit()
  local pid=w.rooms[tostring(n)]
  if not pid then say('这间厢房扫得干净，被褥也晒过，只是还空着。好感满档的朋友答应入住，便会住进来。');return end
  local voice=probe('BrowserAffinityHome')
  local rows={{name(pid)..' · 说说话',nil,voice and 1 or 0},{'请'..name(pid)..'搭手做一件',nil,1}}
  local r=choose(rows)
  if r==1 and voice then voice()
  elseif r==2 then workshop(s,pid) end
 end

 -- ===== 营建 =====
 local function build(s)
  local w=s.wing;local n=w.built+1
  if n>ROOMS then say('四间厢房都起好了。再多，这院子就不像家了。');return end
  local live=homes();local guests=0;for _ in pairs(live) do guests=guests+1 end
  local cost=ROOM_COST[n]
  local why=nil
  if s.room<1 then why='先把藏珍室营建起来，工匠才肯为这一排厢房再来一趟。'
  elseif n==2 and guests<1 then why='头一间还空着。等有人真住进来，再起第二间不迟。'
  elseif n==3 and books()<4 then why='第三间要动院墙。待寻得四部天书、江湖上走开了，再说。'
  elseif n==4 and books()<8 then why='第四间在最东头，要接檐引水。待寻得八部天书再来。' end
  if why then say(why);return end
  if amount(MONEY)<cost then say('起这一间要'..cost..'两工料钱。先留些盘缠赶路也好。');return end
  if not ask('在南廊起第'..n..'间厢房，花'..cost..'两。不增加任何人物属性，只是多一处住得下人的屋子。要动工么？') then return end
  if amount(MONEY)<cost then return end
  instruct_32(MONEY,-cost);w.built=n;commit();refresh()
  say('新起的一间在南廊上，窗朝着院子。谁愿意来住，便住得下了。')
 end
 local function open(s)
  local g=s.garden
  if g.plots>=PLOTS then say('六畦已满，再开就要占了走道。');return end
  local live,far=homes()
  if g.plots==0 then
   if s.room<1 then say('先营建藏珍室，院子才理得出这一块地。');return end
   if not anyHelp(live,far,HERBALISTS) then say('地是现成的，只是没人懂药。与程灵素、薛慕华、张无忌、胡青牛、平一指中的任一位结下生死之交，才知道该下什么种。');return end
  end
  local cost=PLOT_COST[math.min(#PLOT_COST,math.floor(g.plots/2)+1)]
  if amount(MONEY)<cost then say('开畦、围篱、引水，要'..cost..'两。');return end
  if not ask((g.plots==0 and '在院西开两畦药圃，花' or '再开两畦，花')..cost..'两？') then return end
  if amount(MONEY)<cost then return end
  instruct_32(MONEY,-cost);g.plots=math.min(PLOTS,g.plots+2);commit();refresh()
  say('篱笆扎好了，水也引到畦边。走到畦上便可下种。')
 end
 BrowserGardenMenu=function()
  if JY.SubScene~=70 or JY.Status~=GAME_SMAP then return end
  local s=rec(true)
  if not s then return end
  local live=homes();seat(s,live)
  while true do
   local g,w=s.garden,s.wing
   local rows={
    {'营建厢房 · 已起'..w.built..'/'..ROOMS..'间'..(w.built<ROOMS and ('，下一间'..ROOM_COST[w.built+1]..'两') or ''),nil,w.built<ROOMS and 1 or 0},
    {(g.plots==0 and '开辟药圃 · 两畦' or ('开辟药圃 · 已有'..g.plots..'/'..PLOTS..'畦')),nil,g.plots<PLOTS and 1 or 0},
    {'自家药炉 · 配药与制毒',nil,g.plots>0 and 1 or 0},
    {'看看厢房与药圃的近况',nil,1},
   }
   local r=choose(rows)
   if r==1 then build(s)
   elseif r==2 then open(s)
   elseif r==3 and g.plots>0 then workshop(s,nil)
   elseif r==4 then
    local lived=0;for _ in pairs(w.rooms) do lived=lived+1 end
    say('厢房已起'..w.built..'间，住着'..lived..'人；药圃'..g.plots..'畦；出门回家已计'..g.trip..'趟；本程园中所出共'..g.out..'／'..OUT_CAP..'件。')
   else return end
  end
 end

 -- 一“趟”＝离开小虾米居、进过别处的场景、再回到家。在家卧榻睡多少觉都不算，
 -- 所以作物只会随真的出门走动而长，不会被在原地反复歇宿刷出来。
 local function tick()
  local s=rec(false);local g=s and s.garden
  if JY.SubScene~=70 then away=true;return end
  if not g or not away then return end
  away=false;g.trip=math.min(9999,g.trip+1);commit();refresh()
 end
 local source=oldCallEvent
 oldCallEvent=function(id,...)
  if JY.SubScene==70 and id>=13010 and id<=13013 then return BrowserGardenRoom(id-13009) end
  if JY.SubScene==70 and id>=13020 and id<=13025 then return BrowserGardenBed(id-13019) end
  return source(id,...)
 end
 local read=LoadRecord
 LoadRecord=function(...)local r=read(...);away=false;refresh();return r end
 local init=Init_SMap
 Init_SMap=function(...)tick();install();return init(...)end
end)()
