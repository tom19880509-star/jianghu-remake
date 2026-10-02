-- A small, walkable annex in the existing home (70), plus save-local collections.
-- 156: the wing rooms and the herb garden live in garden-extension.lua but share this one
-- homestead record, so there is exactly one reader and one writer of the save slot.
BrowserHomesteadRecord=false
BrowserHomesteadCommit=false
;(function()
 local state,installed=nil,nil
 local function load()state=browser_homestead_state() end
 local function save()browser_homestead_save(state)end
 -- create=true materialises the 156 sub-records. Called only from a real player action,
 -- so a 155 save that is merely loaded and put down again gains no new keys.
 BrowserHomesteadRecord=function(create)
  if not state then load() end
  if create then
   if not state.wing then state.wing={built=0,rooms={}} end
   if not state.garden then state.garden={plots=0,trip=0,out=0,beds={},made={},work={trip=0,n=0}} end
  end
  return state
 end
 BrowserHomesteadCommit=function()if state then save() end end
 local function amount(id)
  for i=1,CC.MyThingNum do if JY.Base['物品'..i]==id then return JY.Base['物品数量'..i] end end
  return 0
 end
 local function space(id)
  for i=1,CC.MyThingNum do local v=JY.Base['物品'..i];if v==id then return amount(id)<32767 end end
  for i=1,CC.MyThingNum do if JY.Base['物品'..i]==-1 then return true end end
  return false
 end
 local function owner(id)
  if JY.Thing[id]['使用人']>=0 then return true end
  for pid=0,JY.PersonNum-1 do local p=JY.Person[pid];if p['武器']==id or p['防具']==id or p['修炼物品']==id then return true end end
  return false
 end
 -- All original scripted checks/uses/consumption were scanned: weapon 106/110;
 -- type 0 covers other story objects. Mud and later source-edition keys are extra.
 local protected={[41]=true,[61]=true,[62]=true,[77]=true,[79]=true,[91]=true,[106]=true,[110]=true,[109]=true,[117]=true,[198]=true}
 local function keyItem(id)return protected[id] or JY.Thing[id]['类型']==0 or JY.Thing[id]['仅修炼人物']>=0 end
 local function eligible(id)return id>=0 and JY.Thing[id] and (JY.Thing[id]['类型']==1 or JY.Thing[id]['类型']==2) end
 local function price(id)
  if BrowserStarterWeapon and BrowserStarterWeapon(id) then return 5 end
  local minimum=nil
  for sid=0,JY.ShopNum-1 do for n=1,5 do local s=JY.Shop[sid];if s['物品'..n]==id and s['物品价格'..n]>0 then minimum=math.min(minimum or 32767,s['物品价格'..n]) end end end
  -- 395 S4-B：货摊此刻的实际售价（试价／换书格）与常备货品也算店价，回收仍取四分之一——买低卖高不成立。
  local stall=rawget(_G,'BrowserStallPrice');local v=stall and stall(id);if v then minimum=math.min(minimum or 32767,v) end
  local goods=rawget(_G,'BrowserStallExtra');v=goods and goods(id);if v then minimum=math.min(minimum or 32767,v) end
  return minimum and math.max(1,math.floor(minimum/4)) or (JY.Thing[id]['类型']==2 and 80 or 100)
 end
 local function collectible(id)return id>=0 and JY.Thing[id] and JY.Thing[id]['类型']==1 and JY.Thing[id]['装备类型']==0 end
 -- Older homes may contain manuals/armour. Return the real item exactly once;
 -- full bags keep a recoverable entry, hidden from the weapon display.
 local function migrateLegacy()
  local changed=false
  for slot,v in pairs(state.display)do
   if not collectible(v.id) then
    if v.copy then state.display[slot]=nil;changed=true
    elseif space(v.id) then instruct_32(v.id,1);state.display[slot]=nil;changed=true end
   end
  end
  if changed then save()end
 end
 local function pendingReturns()
  local n=0;for _,v in pairs(state.display)do if not collectible(v.id)then n=n+1 end end;return n
 end
 local function capacity()return state.room==2 and 6 or 3 end
 local function choose(rows)return ShowMenu(rows,#rows,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE)end
 local function books()local n=0;for id=144,157 do if amount(id)>0 then n=n+1 end end;return n end
 local function event(id,code,x,y,pic)
  local row={1,id,code,-1,-1,pic,pic,pic,0,x,y}
  for i,v in ipairs(row)do SetD(70,id,i-1,v)end;SetS(70,x,y,3,id)
 end
 local function install()
  if not state or installed==state.room then return end
  event(199,13000,29,26,3498)
  if state.room>0 then
   -- This rectangle has no original events, doors, chests or invite triggers.
   for y=28,36 do for x=30,38 do
    SetS(70,x,y,0,1138);SetS(70,x,y,1,0);SetS(70,x,y,2,0);SetS(70,x,y,3,-1);SetS(70,x,y,4,4);SetS(70,x,y,5,0)
    if y==28 then SetS(70,x,y,1,x%2==0 and 1504 or 1508)
    elseif x==30 and y~=32 then SetS(70,x,y,1,y%2==0 and 1514 or 1518)end
   end end
   -- A clear, level path joins the original house to the annex entrance.
   for x=24,30 do SetS(70,x,32,0,1138);SetS(70,x,32,4,4)end
   for n=1,capacity() do event(189+n,13000+n,32+((n-1)%3)*2,n<=3 and 29 or 35,2490)end
  end
  installed=state.room;JY.D_Valid=nil
 end
 local function shelf(slot)
  if state.room==0 or slot>capacity() then return end
  local current=state.display[tostring(slot)]
  if current then
   local id=current.id
   local result=coroutine.yield('items',{displayWeapons=collectible(id),title=(collectible(id) and '兵器架 · 第'..slot..'架' or '待取回的旧藏物'),verb=current.copy and '收起器形摹本' or '取回行囊',items={{id=id,name=JY.Thing[id]['名称'],num=1,details=BrowserItemDetails(id),tags=current.copy and ('藏品摹本 · 仅供观赏；'..(amount(id)>0 and '真品仍在行囊' or '真品已不在行囊')..'，不可凭摹本取物') or (collectible(id) and '真品陈列 · 取回后才能装备' or '旧藏物已撤下陈列，取回行囊即可照常使用')}}})
   if result~=id then return end
   if not current.copy and not space(id) then DrawStrBoxWaitKey('行囊已满，先腾出一格再取回。');return end
   if not current.copy then instruct_32(id,1)end
   state.display[tostring(slot)]=nil;save();return
  end
  local rows={}
  for i=1,CC.MyThingNum do local id=JY.Base['物品'..i]
   if collectible(id) and amount(id)>0 then
    local shown=false;for _,v in pairs(state.display)do if v.id==id then shown=true end end
    if not shown then local copy=keyItem(id) or owner(id);rows[#rows+1]={id=id,name=JY.Thing[id]['名称'],num=amount(id),details=BrowserItemDetails(id),tags=copy and '展其器形 · 真品随身' or '将一件兵器收入木架，暂离行囊'}end
   end
  end
  local id=coroutine.yield('items',{displayWeapons=true,title='挑选兵器 · 第'..slot..'架',verb='陈列一件',items=rows})
  local found=false;for _,r in ipairs(rows)do if r.id==id then found=true end end
  if not found or amount(id)<1 then return end
  local copy=keyItem(id) or owner(id)
  if not DrawStrBoxYesNo(-1,-1,copy and '留下器形摹本供观赏，真品仍随身，可照常装备或用于剧情。' or '将这件兵器收入木架？会离开行囊，回家取回后才能装备。',C_WHITE,CC.DefaultFont) then return end
  if amount(id)<1 then return end
  if not copy then instruct_32(id,-1)end
  state.display[tostring(slot)]={id=id,copy=copy};save()
 end
 -- 155b 队友入住 (growth-extension.lua): shown only when someone lives here or can be invited by letter.
 local function guestLabel()
  if type(BrowserAffinityResidents)~='function' or type(BrowserAffinityHome)~='function' then return nil end
  local residents,letters=BrowserAffinityResidents()
  return residents>0 and '山居住客 · 叙话' or letters>0 and '修书邀请知交' or nil
 end
 function BrowserHomestead()
  if JY.SubScene~=70 or JY.Status~=GAME_SMAP then return end
  migrateLegacy()
  while true do
   local n=books()
   local label=state.room==0 and (n>=1 and '营建藏珍室 · 三座兵器架，300两' or '藏珍室 · 寻得一部天书后可营建') or state.room==1 and (n>=4 and '增添兵器架 · 已寻四部天书，免工钱' or '藏珍室已建 · 四部天书后添至六架') or '藏珍室 · 六座兵器架已齐'
   local rows={{label,nil,1},{'竹庭投壶 · 三矢一局',nil,1},{'看看藏珍室里的兵器架',nil,state.room>0 and 1 or 0},{'取回旧藏物 · '..pendingReturns()..'件',nil,pendingReturns()>0 and 1 or 0}}
   -- Optional layers append their own row and their own handler, so the four rows above keep
   -- their numbers and the menu is unchanged wherever a layer is absent.
   local acts={}
   local guests=guestLabel();local garden=rawget(_G,'BrowserGardenMenu')
   -- 157 多周目婚姻：标题由本层自己给（未到多周目、没有合格候选时返回 nil，这一行整个不出现——彩蛋不预告）。
   local wed=rawget(_G,'BrowserMarriageLabel');wed=type(wed)=='function' and wed() or nil
   if guests then rows[#rows+1]={guests,nil,1};acts[#rows]=BrowserAffinityHome end
   if garden then rows[#rows+1]={'营建厢房与药圃',nil,1};acts[#rows]=garden end
   if wed then rows[#rows+1]={wed,nil,1};acts[#rows]=rawget(_G,'BrowserMarriageMenu') end
   local r=choose(rows)
   if r==1 and state.room==0 and n>=1 then
    if amount(174)<300 then DrawStrBoxWaitKey('营建需木料、工钱共三百两。先留些盘缠赶路也好。')
    elseif DrawStrBoxYesNo(-1,-1,'院中尚有一片空地，可添一间藏珍室。花费三百两，摆三座兵器架；不增加人物属性。要动工么？',C_WHITE,CC.DefaultFont) then
     if amount(174)>=300 then instruct_32(174,-300);state.room=1;save();install();DrawStrBoxWaitKey('竹壁已立，木架也擦拭干净。沿小径走入院东的新屋，便可安放一路所得的兵器。')end
    end
   elseif r==1 and state.room==1 and n>=4 then state.room=2;save();install();DrawStrBoxWaitKey('一路游历，积下不少值得纪念的兵器。替藏珍室再添三架，不另收工钱。')
   elseif r==1 then DrawStrBoxWaitKey(state.room==0 and '待寻得第一部天书，便可花三百两添建藏珍室。' or state.room==1 and '待寻得四部天书，再添三座兵器架；已有藏品照旧保留。' or '六座兵器架已齐，可把沿途所得的刀剑兵器安放其中，闲时看一看，也是一番乐趣。')
   elseif r==2 then local score=coroutine.yield('pitch-pot',{best=state.best});if score and score>=0 and score<=9 then state.best=math.max(state.best,score);save()end
   elseif r==3 and state.room>0 then
    local racks={};for slot=1,capacity() do local v=state.display[tostring(slot)];racks[#racks+1]={'第'..slot..'架 · '..(v and (collectible(v.id) and JY.Thing[v.id]['名称'] or '旧藏物待取回') or '空架'),nil,1}end
    local slot=choose(racks);if slot and slot>=1 and slot<=capacity()then shelf(slot)end
   elseif acts[r] then acts[r]()
   elseif r==4 and pendingReturns()>0 then
    local slots,rows={},{};for slot=1,capacity()do local v=state.display[tostring(slot)];if v and not collectible(v.id)then slots[#slots+1]=slot;rows[#rows+1]={JY.Thing[v.id]['名称']..' · 取回行囊',nil,1}end end
    local pick=choose(rows);if slots[pick]then shelf(slots[pick])end
   else return end
  end
 end
 local function trade(buyback)
  while true do
   local rows={}
   if buyback then
    for k,n in pairs(state.pawn)do local id=tonumber(k);if n>0 then local p=price(id);rows[#rows+1]={id=id,name=JY.Thing[id]['名称'],num=n,price=p+math.max(1,math.ceil(p/5)),details=BrowserItemDetails(id)}end end
    table.sort(rows,function(a,b)return a.id<b.id end)
   else
    for i=1,CC.MyThingNum do local id=JY.Base['物品'..i]
     if eligible(id) and amount(id)>0 then
      local reason=keyItem(id) and '关乎剧情或专属传承，小宝不收' or owner(id) and '有人正在装备或参研，先在人物页卸下' or (state.sold[tostring(id)] or 0)>=10 and '本程收购已足十件' or nil
      rows[#rows+1]={id=id,name=JY.Thing[id]['名称'],num=amount(id),price=price(id),disabled=reason~=nil,reason=reason,details=BrowserItemDetails(id)}
     end
    end
   end
   local id=coroutine.yield('items',{title=buyback and '小宝存货 · 赎回' or '小宝收购 · 闲置秘籍兵器',trade=buyback and 'redeem' or 'sell',money=amount(174),items=rows})
   local row=nil;for _,r in ipairs(rows)do if r.id==id then row=r end end
   if not row or row.disabled then return end
   local k=tostring(id)
   local text=buyback and ('花'..row.price..'两赎回一件'..row.name..'？') or ('出售一件'..row.name..'，收得'..row.price..'两？已学武功保留；出售秘籍后，继续参研须另有此书。本程可加两成价赎回，进入新周目后旧存货不保留。')
   if DrawStrBoxYesNo(-1,-1,text,C_WHITE,CC.DefaultFont)then
    if buyback then
     if (state.pawn[k] or 0)<1 then return end
     if amount(174)<row.price then DrawStrBoxWaitKey('银两不足，此物仍替你留着。')
     elseif not space(id) then DrawStrBoxWaitKey('行囊已满，先腾出位置。')
     else instruct_32(174,-row.price);instruct_32(id,1);state.pawn[k]=state.pawn[k]-1;save()end
    elseif amount(id)>0 and not keyItem(id) and not owner(id) and (state.sold[k] or 0)<10 then
     if amount(174)>32767-row.price or not space(174) then DrawStrBoxWaitKey('银囊已满，这笔买卖暂且缓缓。')
     else instruct_32(id,-1);instruct_32(174,row.price);state.pawn[k]=(state.pawn[k] or 0)+1;state.sold[k]=(state.sold[k] or 0)+1;save()end
    end
   end
  end
 end
 local shop=instruct_64
 instruct_64=function(...)
  if JY.SubScene~=1 then return shop(...)end
  TalkEx('好东西压在包底，也是委屈它。用不上的书和兵器，小宝替你寻个买主；舍不得了，加两成来赎，东西仍是那一件。牵着江湖大事的宝贝，你可自己收稳啦。',111,0)
  while true do local r=choose({{'看看稀罕货',nil,1},{'出售闲置秘籍与兵器',nil,1},{'赎回先前出售的物件',nil,1},{'平价衣甲与鞋履',nil,1}})
   if r==1 then shop(...)elseif r==2 then trade(false)elseif r==3 then trade(true)elseif r==4 then BrowserOutfitShop(111)else return end
  end
 end
 local note=instruct_51
 instruct_51=function(...)
  if JY.SubScene~=70 then return note(...)end
  local guests=guestLabel();local rows={{'翻阅行路札记',nil,1},{'山居营缮与投壶',nil,1}}
  if guests then rows[3]={guests,nil,1} end
  local r=choose(rows)
  if r==1 then return note(...)elseif r==2 then return BrowserHomestead()elseif r==3 and guests then return BrowserAffinityHome()end
 end
 local source=oldCallEvent
 oldCallEvent=function(id)
  if JY.SubScene==70 and id==13000 then return BrowserHomestead()end
  if JY.SubScene==70 and id>=13001 and id<=13006 then return shelf(id-13000)end
  return source(id)
 end
 local read=LoadRecord
 LoadRecord=function(...)local r=read(...);load();migrateLegacy();installed=nil;install();return r end
 local init=Init_SMap
 Init_SMap=function(...)if not state then load();migrateLegacy()end;install();return init(...)end
end)()
