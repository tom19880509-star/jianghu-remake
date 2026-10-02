-- OUTFIT_EXTENSION : 江湖衣履 sidecar（不改原物品/原记录，不占198/199，不造第201件）
do
local unpack=unpack or table.unpack
local MONEY_ID,SHOP_HEAD=174,111
local ITEMS={
  budao={slot="coat",name="布道袍",desc="素布长袍，耐穿护身，不限门派。",def=3,agi=0,price=30},
  duanda={slot="coat",name="粗布短打",desc="利落短打，行动便捷。",def=2,agi=2,price=40},
  clothboots={slot="boots",name="布履",desc="寻常布履，走路轻省。",def=0,agi=2,price=20},
  leatherboots={slot="boots",name="薄底快靴",desc="软革薄底，束踝轻便，临阵落步更利落。",def=0,agi=4,price=80},
  paddedrobe={slot="coat",name="夹棉袍",desc="内絮棉层，厚实护身；临阵转身稍显沉重。",def=5,agi=-2,price=60},
  leathercoat={slot="coat",name="软革劲装",desc="熟革短衣，关节留有余地，护身与行走兼顾。",def=4,agi=0,price=90},
  travelboots={slot="boots",name="厚底行靴",desc="厚革包住足踝，重底抵挡磕碰；临阵进退不及薄底快靴。",def=2,agi=1,price=60},
}
local ORDER={"budao","duanda","clothboots","leatherboots","paddedrobe","leathercoat","travelboots"}
local SLOTS={"coat","boots"}
local state={version=1,owned={},wear={}}

local function effectText(it)
  local t={}
  if it.def~=0 then t[#t+1]=string.format("防御%+d",it.def) end
  if it.agi~=0 then t[#t+1]=string.format("战斗轻功%+d",it.agi) end
  return table.concat(t," ")
end
local function normalize(raw)              -- 防御性清洗：只认已购数量、每件一人、coat与原防具互斥
  local s={version=1,owned={},wear={}}
  if type(raw)~="table" then return s end
  if type(raw.owned)=="table" then for id in pairs(ITEMS) do local n=raw.owned[id]==true and 1 or tonumber(raw.owned[id]);if n and n>=1 and n<=6 and n==math.floor(n) then s.owned[id]=n==1 and true or n end end end
  local used={}
  if type(raw.wear)=="table" then
    for k,w in pairs(raw.wear) do
      local pid=tonumber(k)
      if pid and JY.Person[pid] and type(w)=="table" then
        local e={}
        for _,slot in ipairs(SLOTS) do
          local id=w[slot]
          if type(id)=="string" and ITEMS[id] and ITEMS[id].slot==slot and s.owned[id] and (used[id] or 0)<(s.owned[id]==true and 1 or s.owned[id]) then
            if slot~="coat" or JY.Person[pid]["防具"]<0 then e[slot]=id; used[id]=(used[id] or 0)+1 end
          end
        end
        if e.coat or e.boots then s.wear[tostring(pid)]=e end
      end
    end
  end
  return s
end
local function save() browser_outfit_save(state) end
local function wornBy(id)
  for k,w in pairs(state.wear) do if w.coat==id or w.boots==id then return tonumber(k) end end
  return nil
end
local function count(id)return state.owned[id]==true and 1 or (state.owned[id] or 0)end
local function spare(id)
 local n=count(id);for _,w in pairs(state.wear)do if w.coat==id or w.boots==id then n=n-1 end end
 return n
end
local function entry(pid,create)
  local k=tostring(pid)
  if not state.wear[k] and create then state.wear[k]={} end
  return state.wear[k]
end
local function setSlot(pid,slot,id)        -- id=nil 卸下；同一件只在一人身上（转交=前人自动脱）
  -- Some recruited people carry armor outside the shared bag. Keep it when
  -- replacing it; a full bag must fail before either wearer's gear changes.
  if id and slot=="coat" and JY.Person[pid]["防具"]>=0 then
    local old=JY.Person[pid]["防具"];local owned,room=false,false
    for i=1,CC.MyThingNum do
      if JY.Base["物品"..i]==old and JY.Base["物品数量"..i]>0 then owned=true end
      if JY.Base["物品"..i]==-1 then room=true end
    end
    if not owned then
      if not room then DrawStrBoxWaitKey("行囊已满，腾出位置后才能收好身上的护甲。",C_WHITE,CC.DefaultFont);return end
      instruct_32(old,1)
    end
  end
  if id then
    local prev=wornBy(id)
    if prev and prev~=pid and spare(id)<=0 then state.wear[tostring(prev)][slot]=nil end
    if slot=="coat" and JY.Person[pid]["防具"]>=0 then      -- 新衣甲与原防具互斥：卸原防具
      JY.Thing[JY.Person[pid]["防具"]]["使用人"]=-1
      JY.Person[pid]["防具"]=-1
    end
  end
  local e=entry(pid,true); e[slot]=id
  if not e.coat and not e.boots then state.wear[tostring(pid)]=nil end
  save()
end
local function inTeam(pid)
  for i=1,6 do if JY.Base["队伍"..i]==pid then return true end end
  return false
end
local function canChange(pid)              -- 大地图或场景空闲、队伍内、活着；战斗中不可换
  return (JY.Status==GAME_MMAP or JY.Status==GAME_SMAP) and pid~=nil and pid>=0 and JY.Person[pid]~=nil and inTeam(pid) and JY.Person[pid]["生命"]>0
end
local function syncCoats()                 -- 原防具>=0 的人自动脱 coat（不动HP/物品/属性）
  local changed=false
  for k,w in pairs(state.wear) do
    local pid=tonumber(k)
    if w.coat and (not pid or not JY.Person[pid] or JY.Person[pid]["防具"]>=0) then
      w.coat=nil; changed=true
      if not w.boots then state.wear[k]=nil end
    end
  end
  return changed
end
local function moneyCount()                -- 仅用于显示；字段名待Codex核对
  local ok,n=pcall(function()
    for i=1,CC.MyThingNum do
      if JY.Base["物品"..i]==MONEY_ID then return JY.Base["物品数量"..i] end
    end
    return 0
  end)
  if ok then return n end
  return nil
end
local function slotInfo(id)
  if id and ITEMS[id] then local it=ITEMS[id]; return {id=id,name=it.name,description=it.desc,effects=effectText(it),stats={attack=0,defense=it.def,agility=it.agi}} end
  return {id="",name="未配备",description="",effects="",stats={attack=0,defense=0,agility=0}}
end

function BrowserOutfitRows(pid,slot)
 local rows={}
 for _,id in ipairs(ORDER) do if state.owned[id] and ITEMS[id].slot==slot then
  local row=slotInfo(id);local current=(entry(pid) or {})[slot]==id;local owner=not current and spare(id)<=0 and wornBy(id) or nil;row.artId=id;row.id='outfit:'..id
  row.current=current;row.eligible=canChange(pid) and not row.current
  row.owner=owner and owner~=pid and JY.Person[owner]['姓名'] or ''
  row.tags=row.current and '已穿戴' or owner and (JY.Person[owner]['姓名']..'持有') or ('行囊余 '..spare(id)..' 件')
  rows[#rows+1]=row
 end end
 return rows
end
function BrowserOutfitEquip(pid,slot,value)
 if not canChange(pid) or type(value)~='string' then return end
 local id=value:match('^outfit:(.+)$')
 if id and state.owned[id] and ITEMS[id].slot==slot then setSlot(pid,slot,id) end
end
-- 395 S7 R2（可选）：人物页「卸下衣甲」收起所穿衣履，与足具选单里的「卸下」走同一个 setSlot。
function BrowserOutfitUnequip(pid,slot)
 if not canChange(pid) or (slot~='coat' and slot~='boots') or not (entry(pid) or {})[slot] then return false end
 setSlot(pid,slot,nil);return true
end

function BrowserOutfitPerson(pid)
  local p=JY.Person[pid]; local w=entry(pid) or {}
  local r={coat=slotInfo(w.coat),boots=slotInfo(w.boots),defense=0,agility=0}
  if not p then return r end
  local def,agi=0,0
  if w.coat and p["防具"]<0 then def=def+ITEMS[w.coat].def; agi=agi+ITEMS[w.coat].agi end
  if w.boots then def=def+ITEMS[w.boots].def; agi=agi+ITEMS[w.boots].agi end
  r.defense,r.agility=def,agi
  return r
end
function BrowserOutfitChoose(pid,slot)
  if slot~="coat" and slot~="boots" then return false end
  if not canChange(pid) then DrawStrBoxWaitKey("此时不能更换衣履",C_WHITE,CC.DefaultFont); return true end
  local menu,ids={},{}
  for _,id in ipairs(ORDER) do
    local it=ITEMS[id]
    if it.slot==slot and state.owned[id] then
      local who=(entry(pid) or {})[slot]==id and pid or spare(id)<=0 and wornBy(id) or nil; local tag=""
      if who==pid then tag="(已穿)" elseif who then tag="("..JY.Person[who]["姓名"]..")" end
      ids[#ids+1]=id
      menu[#menu+1]={string.format("%s %s%s",it.name,effectText(it),tag),nil,1}
    end
  end
  local cur=(entry(pid) or {})[slot]
  menu[#menu+1]={"卸下",nil,cur and 1 or 0}
  DrawStrBox(CC.MainSubMenuX,CC.MainSubMenuY,string.format("%s要换什么%s?",JY.Person[pid]["姓名"],slot=="coat" and "衣甲" or "足具"),C_WHITE,CC.DefaultFont)
  if #ids==0 and not cur then DrawStrBoxWaitKey("尚无这类衣履，可向河洛客栈的韦小宝购置。",C_WHITE,CC.DefaultFont);return true end
  local options={};local rows=BrowserOutfitRows(pid,slot)
  for i,row in ipairs(menu) do local item=rows[i] or {artId='',name='卸下',description='将当前衣履收回行囊。',stats={attack=0,defense=0,agility=0}};item.id=i;item.eligible=row[3]==1 and not item.current;options[i]=item end
  local r=coroutine.yield("outfit-choice",{person=BrowserPartyPerson and BrowserPartyPerson(pid),name=JY.Person[pid]["姓名"],head=JY.Person[pid]["头像代号"],slot=slot,options=options})
  if r>0 and r<=#ids then setSlot(pid,slot,ids[r])
  elseif r==#menu and cur then setSlot(pid,slot,nil) end
  return true
end
function BrowserOutfitAction(pid,action)
  if action=="outfit-coat" then return BrowserOutfitChoose(pid,"coat") end
  if action=="boots" then return BrowserOutfitChoose(pid,"boots") end
  return false
end

-- 读档隔离：先原函数，再读sidecar（新档/章节/新周目=空）
local orig_LoadRecord=LoadRecord
function LoadRecord(id)
  orig_LoadRecord(id)
  state=normalize(browser_outfit_state())
end
-- Departing allies return purchased clothes and footwear as well as native gear.
do
 local priorLeave=instruct_21
 instruct_21=function(pid,...)
  local wasInTeam=false
  for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then wasInTeam=true;break end end
  local result=table.pack(priorLeave(pid,...))
  if wasInTeam and state.wear[tostring(pid)] then
   local stillInTeam=false
   for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then stillInTeam=true;break end end
   if not stillInTeam then state.wear[tostring(pid)]=nil;save() end
  end
  return table.unpack(result,1,result.n)
 end
end
-- 原防具穿上 -> 自动脱 coat
local orig_UseThing_Type1=UseThing_Type1
function UseThing_Type1(id)
  local r=orig_UseThing_Type1(id)
  if syncCoats() then save() end
  return r
end
-- 战斗临时加成：加->pcall原函数->恢复，不写本体、不累计、返回值透传
local tempDepth={}
local echoWear={}
function BrowserOutfitEcho(pid,gear) echoWear[pid]=gear end
function BrowserOutfitWorn(pid)
 local w=entry(pid) or {};local copy={}
 for _,slot in ipairs(SLOTS) do if w[slot] and (slot~="coat" or JY.Person[pid]["防具"]<0) then copy[slot]=w[slot] end end
 return next(copy) and copy or nil
end
local function pack(...) return {n=select("#",...),...} end
local function withTemp(field,attr,useCoat,useBoots,fn,...)
  if tempDepth[attr] then return fn(...) end
  local saved={}
  local seen={}
  for i=0,(WAR.PersonNum or 0)-1 do
    local pid=WAR.Person[i]["人物编号"]; local p=not seen[pid] and JY.Person[pid]; seen[pid]=true
    local w=echoWear[pid] or state.wear[tostring(pid)] or {}
    if p then
      local add=0
      if useCoat and w.coat and p["防具"]<0 then add=add+ITEMS[w.coat][field] end
      if useBoots and w.boots then add=add+ITEMS[w.boots][field] end
      if add~=0 then local v=p[attr]; saved[#saved+1]={p,v}; p[attr]=math.min(32767,v+add) end
    end
  end
  tempDepth[attr]=true
  local res=pack(pcall(fn,...))
  tempDepth[attr]=nil
  for i=#saved,1,-1 do saved[i][1][attr]=saved[i][2] end
  if not res[1] then error(res[2],0) end
  return unpack(res,2,res.n)
end
local orig_WarPersonSort=WarPersonSort
function WarPersonSort(...) return withTemp("agi","轻功",true,true,orig_WarPersonSort,...) end
local orig_War_WugongHurtLife=War_WugongHurtLife
function War_WugongHurtLife(...) return withTemp("def","防御力",true,true,orig_War_WugongHurtLife,...) end

-- Local merchant split: shared original stock, stable Wei, supplies at innkeepers.
local function outfitShop(head)
  head=head or 105
  TalkEx(head==111 and "神兵宝甲贵，赶路总得先有件像样衣裳。布袍三十两，布履二十两，五十两便能配一身。先穿着，日后有了好物件再换。" or "出门的衣履，小店备了几件。客官看好再买，都是实价。",head,0)
  while true do
  local menu={}
  for i,id in ipairs(ORDER) do
    local it=ITEMS[id]
    if count(id)>=6 then menu[i]={string.format("%-12s %5s",it.name,"售罄"),nil,0}
    else menu[i]={string.format("%-12s %5d",it.name.."（余"..(6-count(id)).."）",it.price),nil,1} end
  end
  local available=false;for _,id in ipairs(ORDER) do if count(id)<6 then available=true end end
  if not available then DrawStrBoxWaitKey("这批衣履已售罄，诸位可在人物界面中相互转交。",C_WHITE,CC.DefaultFont);return end
  local x1=(CC.ScreenW-9*CC.DefaultFont-2*CC.MenuBorderPixel)/2
  local y1=(CC.ScreenH-5*CC.DefaultFont-4*CC.RowPixel-2*CC.MenuBorderPixel)/2
  local r=ShowMenu(menu,#ORDER,0,x1,y1,0,0,1,1,CC.DefaultFont,C_ORANGE,C_WHITE)
  local id=ORDER[r or 0]
  if not id or count(id)>=6 then return end
  local it=ITEMS[id]; local m=moneyCount()
  if not DrawStrBoxYesNo(-1,-1,string.format("%s\n%s\n%s\n售价 %d 两 · 现有 %d 两。是否购入？",it.name,it.desc,effectText(it),it.price,m or 0),C_WHITE,CC.DefaultFont) then return end
  if instruct_31(it.price)==false or (m and m<it.price) then
    TalkEx("客官的银两还不够，先留着也无妨。",head,0); return
  end
  instruct_32(MONEY_ID,-it.price)
  local n=count(id)+1;state.owned[id]=n==1 and true or n; save()
  TalkEx(string.format("%s收好，祝客官一路平安。",it.name),head,0)
  end
end
BrowserOutfitShop=outfitShop
-- Existing stock entries are referenced directly, so old purchases stay sold.
-- 155 (editorial/名医药铺155.md): keepers keep the basic tier; the stronger medicine and the
-- three one-piece restoratives are sold by famous healers from the SAME original stock slot,
-- so a count bought down before (天山雪莲 1 -> 0) stays down whoever sells it now.
local SUPPLIES={[1]=true,[5]=true,[13]=true}      -- 精气丸、玉真散、九花玉露丸
-- 156 经济基线（editorial/经济与起步156.md）：掌柜常备两味，不占原库存、不限件数。
-- 22 黄连解毒丸（源说明「民间常见之解毒丸」，解毒30）补的是基础解毒这一档——武林帖之前，
-- 掌柜处唯一能解毒的只有 13 九花玉露丸（50两，解毒50，本是回内力药），而低阶解毒药 21–25
-- 全无售处；开局自带的 3 枚宝济丸用完即断档。单点价比名医的 26 六阳正气丹（100两/90点＝1.11）
-- 略贵：35/30＝1.17，基础档不越过名医档。高级解毒（26、36）仍只归名医与武林帖后的代卖。
local STAPLES={[6]=75,[22]=35}                   -- 三黄宝腊丹、黄连解毒丸
local HEALER_ONLY={[7]=true,[8]=true,[9]=true,[16]=true,[19]=true,[20]=true,[26]=true,[28]=true,[35]=true,[36]=true}
-- [scene][event]: open = the healer's original talk event numbers after which he sells;
-- ring = talk events that add ringGoods. Choosing “照常交谈” always runs the original event.
local HEALERS={
 [44]={[0]={pid=16,open={[96]=true,[957]=true},goods={7,8,16,9},label='求购伤药',title='胡青牛 · 伤药',
  line='那条规矩既已作废，药庐便不再闭门。伤药是我亲手配的，只收药材本钱。'},
  [1]={pid=17,open={[97]=true,[959]=true},goods={26,36},label='求购解毒药',title='王难姑 · 解毒药',
  line='防毒解毒，找我比找我那师兄靠得住。稀罕的抗毒药只有一份，卖了便没有了。'}},
 [30]={[0]={pid=28,open={[301]=true,[302]=true,[303]=true,[963]=true},goods={16,9,19,28},label='求购药品',title='平一指 · 药柜',
  line='田伯光死了，我平一指说话算话。药钱一文不能少，蚀本生意我不做。',
  -- 155b (Tom: 其余看着设置): sells from the first visit at double price, so nobody must kill a former companion
  -- to buy medicine; the original price returns once 田伯光 is dealt with (303/963). Hidden while 田伯光 travels along.
  dear={[301]=true,[302]=true},dearMul=2,dearLine='医一人，杀一人，这规矩我没改。你没替我了却那桩心事，药钱便得加倍。',notWith=29}},
 [54]={[0]={pid=45,open={[553]=true,[554]=true,[556]=true,[977]=true},goods={7,8},extra={[14]=70},label='求购药品',title='薛慕华 · 药柜',
  line='行医之人，不问来路。寻常伤药阁下尽管挑，照价便是。',
  ring={[556]=true,[977]=true},ringGoods={16,19,20,28,35},ringLine='掌门有命，弟子不敢藏私。续命的丹药和几味珍药，少侠一并看看。'}},
 [49]={[2]={pid=2,open={[42]=true,[953]=true},goods={26,36},label='求购解药',title='程灵素 · 解药',
  line='药王庄的解药，照价拿去。可别像我那姜师兄，拿药去害人。'}},
}
local KEEPERS={[1]={0,664},[3]={0,658},[40]={1,235},[60]={1,502},[61]={4,480}}
-- 395 低阶首批（Tom/Codex 选定方案 a）：小宝货摊常备一样入门兵器——练武木剑（309，剑，攻+1，无装备门槛）40 两，
-- 开局 200 两盘缠买下还剩 160 给药与住宿。松风剑谱不在货摊上重复：它是福威镖局（场景 56 E4）正常赠送的那一本。
-- 不占原 JY.Shop 的 25 格、不限件数；回收价由 homestead price() 读同一张表。309 是张无忌同行时的寻常兵器，
-- 同一物品号只能一人装备：主角若持着，张无忌入队时便空手（他的武学全是拳掌，不受影响）。
local STALL_GOODS={[309]=40}   -- 方案 a：只卖木剑；松风剑谱仍是福威镖局（场景 56 E4）白送的那一本，不在货摊上重复
BrowserStallExtra=function(id) return STALL_GOODS[id] end
local INN,WEI={title='客栈补给',head=105},{title='小宝货摊',head=SHOP_HEAD,extra=STALL_GOODS,goods=true}
-- 货摊说明（collection-ui 以 row.tags 显示一行；秘籍另带 row.learners，界面按人列出真实研习条件，未满足的条目——含十门名额已满——
-- 照行囊里的样式标红）。每人一个状态：可入门（未学、名额与门槛都满足）／可精修（已学未满）／已满／暂不可学（写出第一条未满足的条件）。
-- 根基增量＝练满后的同类根基 − 现有同类根基（现有值把这门本身已有的重数也算进去，同类取最高），已满或已有更高同类时就是 +0。
-- 兵器、防具的门槛读 BrowserItemDetails（与 BrowserStudyRequirements 同源）的全部「需*」项，一条没有才写「无装备门槛」。
local SHAPE={[0]='单点',[1]='直线',[2]='十字',[3]='整片'}
local ROOT_FIELD={[1]='拳掌',[2]='御剑',[3]='耍刀',[4]='特殊兵器'}
local WEAPON={[2]='须持剑（刀可代用七成）',[3]='须持刀（剑可代用七成）'}
local GATE={{'内力','内力上限'},{'攻击力','攻击'},{'轻功','轻功'},{'用毒能力','用毒'},{'医疗能力','医疗'},{'解毒能力','解毒'},
 {'拳掌功夫','拳掌'},{'御剑能力','御剑'},{'耍刀技巧','耍刀'},{'特殊兵器','特殊兵器'},{'暗器技巧','暗器'},{'资质','资质'}}
local function stallTeam() local team={};for i=1,CC.TeamNum or 6 do local pid=JY.Base['队伍'..i];if pid and pid>=0 then team[#team+1]=pid end end;return team end
local function firstUnmet(rows) for _,row in ipairs(rows) do if not row.met then return row end end end
local function sameKindRoot(p,kind)      -- 与 growth-core rootBonuses 同式：同类各门 (min(10,重数)−1)×4 取最高
 local best=0
 for i=1,10 do local s=p['武功'..i];local w=s and s>0 and JY.Wugong[s]
  if w and w['武功类型']==kind then best=math.max(best,(math.min(10,math.floor((p['武功等级'..i] or 0)/100)+1)-1)*4) end
 end
 return best
end
local function stallNote(who,id)
 if who~=WEI then return nil end
 local t=JY.Thing[id];if not t then return nil end
 local team=stallTeam()
 if t['类型']==1 then
  local d=BrowserItemDetails and BrowserItemDetails(id) or t
  local gates={}
  for _,g in ipairs(GATE) do local n=d['需'..g[1]] or 0;if n~=0 then gates[#gates+1]=g[2]..(n<0 and ' ≤ ' or ' ≥ ')..math.abs(n) end end
  local nature=d['需内力性质'];if nature==0 or nature==1 then gates[#gates+1]=(nature==0 and '阴性' or '阳性')..'或调和内力' end
  local only=d['仅修炼人物'];if only and only>=0 and JY.Person[only] then gates[#gates+1]='限'..JY.Person[only]['姓名'] end
  local can={}
  for _,pid in ipairs(team) do local rows=BrowserStudyRequirements and BrowserStudyRequirements(pid,id) or {};if not firstUnmet(rows) then can[#can+1]=JY.Person[pid]['姓名'] end end
  local head
  if d['装备类型']==1 then head='防具'
  else local fam=BrowserWeaponFamily and BrowserWeaponFamily(id);head='兵器 · '..(fam=='sword' and '剑' or fam=='blade' and '刀' or '其他') end
  for _,k in ipairs({{'加攻击力','攻'},{'加防御力','防'},{'加轻功','轻功'}}) do local n=d[k[1]] or 0;if n~=0 then head=head..' · '..k[2]..(n>0 and ' +' or ' ')..n end end
  return head..' · '..(#gates==0 and '无装备门槛' or ('装备门槛：'..table.concat(gates,'、')))
   ..' · '..(#can>0 and ('现可装备：'..table.concat(can,'、')) or '队中暂无人可装备')..' · 同一件只能一人装备'
 end
 local skill=t['类型']==2 and t['练出武功'] or -1
 local w=skill>0 and JY.Wugong[skill];if not w then return nil end
 local B=rawget(_G,'BrowserMartialBalance');local art=B and B.enabled and B.data.skills[skill]
 local kind=w['武功类型'];local field=ROOT_FIELD[kind]
 local states,learners={},{}
 for _,pid in ipairs(team) do
  local p=JY.Person[pid];local rows=BrowserStudyRequirements and BrowserStudyRequirements(pid,id) or {}
  learners[#learners+1]={id=pid,name=p['姓名'],requirements=rows}
  local rank=BrowserGrowthStudyRank and BrowserGrowthStudyRank(pid,id)
  if not rank then rank=0;for i=1,10 do if p['武功'..i]==skill then rank=math.min(10,math.floor((p['武功等级'..i] or 0)/100)+1) end end end
  local info=BrowserGrowthRankInfo and BrowserGrowthRankInfo(pid,id);local cap=info and info.maxRank or 10
  local bad=firstUnmet(rows);local now=field and sameKindRoot(p,kind) or 0
  local gain=field and math.max(0,(math.min(10,cap)-1)*4-now)
  local state
  if rank>=cap then state='已满 '..rank..'/'..cap..(field and ('·'..field..'根基 +0') or '')
  elseif bad then state='暂不可学（'..bad.text..'）'
  else state=(rank>0 and ('可精修 '..rank..'/'..cap) or '可入门')..(field and ('·练满'..field..'根基 +'..gain) or '') end
  states[#states+1]=p['姓名']..' '..state
 end
 local parts={table.concat(states,'；')}
 parts[#parts+1]=WEAPON[kind] or '空手可用'
 local r1,r10=art and art.range and art.range[1] or w['移动范围1'],art and art.range and art.range[10] or w['移动范围10']
 local shape=w['攻击范围'];local area=shape==3 and art and art.area and art.area[10] or 0
 parts[#parts+1]=(SHAPE[shape] or '')..(shape==3 and '（十级 '..(area*2+1)..'×'..(area*2+1)..' 格）' or '')..' · 射程 '..r1..(r10~=r1 and ('–'..r10) or '')..' 格'
 local step=w['消耗内力点数'] or 0
 parts[#parts+1]='每击耗内 一级 '..step..'／十级 '..(5*step)
 parts[#parts+1]='入门占十门之一（同类根基只取最高一门）'
 return table.concat(parts,' · '),learners
end
-- 说明只是附注：任何一处数据缺失都不该让货摊打不开，所以货摊行经 pcall 取（逻辑由 lowtier395-s4b-stall 测试钉住）。
local function stallInfo(who,id) if who~=WEI then return nil end;local ok,text,learners=pcall(stallNote,who,id);if ok then return text,learners end end
BrowserStallNote=function(id) return stallNote(WEI,id) end   -- 只读：给测试与调试看同一份文字
-- 155d: the 武林帖 E932 runs source instruct_59, which clears every recruitable person's event (CC.AllPersonExit),
-- the five healers included, right before the solo 武道大会 and 圣堂. Once the letter is out (武道大会 slot 24 is no
-- longer the initial E933) keepers also sell 胡青牛's and 王难姑's goods from the same original slots and prices,
-- as medicine the healers left on consignment. Nothing changes before the letter.
local CONSIGNED={[7]=true,[8]=true,[9]=true,[16]=true,[26]=true,[36]=true}
local function consigned() local v=GetD(25,24,2);return v~=nil and v~=933 end
BrowserInnConsigned=consigned
-- 155b: the shop page may ask for several pieces at once ("<id>x<count>"). Every piece
-- still settles on its own with the same stock, silver and bag checks as a single
-- purchase, so a batch stops at the first piece that cannot be bought and the
-- keeper reports how many really changed hands.
local BULK_LIMIT=99
local function bagRoom(id)                 -- pieces of this item the bag can still take
 local free=false
 for i=1,CC.MyThingNum do
  local item,n=JY.Base['物品'..i],JY.Base['物品数量'..i] or 0
  if item==id then return math.max(0,32767-n) end
  if item==-1 then free=true end
 end
 return free and 32767 or 0
end
-- who: INN, WEI or a healer's {title,head,stock={[id]=true}} built from his current talk event.
local function goodsShop(who,foodOnly)
 local ordinary=who==INN
 while true do
  local rows,refs={},{};local money=moneyCount() or 0
  local consignment=ordinary and consigned()
  local function most(id,price,stock)      -- shown limit only; the purchase loop rechecks each piece
   local n=math.min(BULK_LIMIT,bagRoom(id),stock or BULK_LIMIT)
   if price>0 then n=math.min(n,math.floor(money/price)) end
   return math.max(0,n)
  end
  for sid=0,JY.ShopNum-1 do
   local shop=JY.Shop[sid]
   for slot=1,5 do
    local id=shop['物品'..slot]
    local sells=ordinary and (SUPPLIES[id] or consignment and CONSIGNED[id]) or who==WEI and not SUPPLIES[id] and not HEALER_ONLY[id] or who.stock and who.stock[id]
    if not foodOnly and sells then
     local n,price=shop['物品数量'..slot],shop['物品价格'..slot]*(who.mul or 1)
     rows[#rows+1]={id=id,name=JY.Thing[id]['名称'],num=n,price=price,max=most(id,price,n),disabled=n<=0 or price>money,details=BrowserItemDetails(id)}
     rows[#rows].tags,rows[#rows].learners=stallInfo(who,id)
     refs[id]={shop=shop,slot=slot,price=price}
    end
   end
  end
  if ordinary and foodOnly then for id,food in pairs(browser_inn_food())do
   id=tonumber(id);rows[#rows+1]={id=id,name=food.name,unlimited=true,price=food.price,max=most(id,food.price),disabled=food.price>money,details=BrowserItemDetails(id)}
   refs[id]={price=food.price,food=true}
  end end
  if not foodOnly and who.extra then for id,price in pairs(who.extra)do     -- healer's unlimited everyday stock
   rows[#rows+1]={id=id,name=JY.Thing[id]['名称'],unlimited=true,staple=true,goods=who.goods or nil,price=price,max=most(id,price),disabled=price>money,details=BrowserItemDetails(id)}
   rows[#rows].tags,rows[#rows].learners=stallInfo(who,id)
   refs[id]={price=price,food=true}
  end end
  if ordinary and not foodOnly then for id,price in pairs(STAPLES)do
   rows[#rows+1]={id=id,name=JY.Thing[id]['名称'],unlimited=true,staple=true,price=price,max=most(id,price),disabled=price>money,details=BrowserItemDetails(id)}
   refs[id]={price=price,food=true}
  end end
  local answer=coroutine.yield('shop',{items=rows,money=money,bulk=true,title=foodOnly and '客栈酒食' or who.title})
  local id,want=answer,1
  if type(answer)=='string' then
   local a,b=answer:match('^(%d+)x(%d+)$')
   id,want=tonumber(a),tonumber(b) or 0
  end
  local ref=refs[id]
  if not ref then return end
  want=math.min(BULK_LIMIT,math.floor(want))
  local key=ref.slot and ('物品数量'..ref.slot)
  local bought,stopped=0,nil
  while bought<want do
   if not ref.food and ref.shop[key]<=0 then stopped='货已售完' break end
   if (moneyCount() or 0)<ref.price then stopped='银两不足' break end
   if bagRoom(id)<=0 then stopped='行囊装不下了' break end
   instruct_32(MONEY_ID,-ref.price);instruct_32(id,1);if ref.shop then ref.shop[key]=ref.shop[key]-1 end
   bought=bought+1
  end
  if bought==0 then
   if stopped=='行囊装不下了' then DrawStrBoxWaitKey('行囊装不下了，先腾出位置再买。');return end
  elseif want==1 then
   -- 155e: a healer hands over medicine in his own voice; keepers and the Wei stall keep the shop phrasing.
   TalkEx(who.stock and '药收好。对症服用，伤重时莫要硬撑。' or '东西收好，客官再看看别的？',who.head,0)
  else
   local name=JY.Thing[id]['名称']
   local line=string.format(who.stock and '%s%d件，共%d两，拿好。' or '%s%d件，共%d两，客官收好。',name,bought,bought*ref.price)
   if bought<want then line=line..string.format('%s，余下%d件没能成交。',stopped,want-bought) end
   TalkEx(line..(who.stock and '还缺什么药？' or '再看看别的？'),who.head,0)
  end
 end
end
local function fixedWei()
 if not CC.ShopScene or not JY.SubScene then return end
 for sid=0,JY.ShopNum-1 do
  local cfg=CC.ShopScene[sid];local scene,ev=cfg.sceneid,cfg.d_shop
  local talk=GetD(scene,ev,2)
  if scene~=1 and (talk==937 or talk==938 or GetD(scene,ev,7)==8256) then
   for _,f in ipairs({2,3,4,5,6,7})do SetD(scene,ev,f,-1)end
   SetD(scene,ev,0,0)
  end
  for _,leave in ipairs(cfg.d_leave)do
   if GetD(scene,leave,4)==939 then SetD(scene,leave,4,-1)end
  end
 end
 -- 157：河洛客栈 19 号是原版留下的第二个韦小宝站像（图 8256、无对白、挡路，(10,14)）。原版脚本与本作各层都不引用它，
 -- 认不出是谁就一直画成旧像素小人。与上面清别家客栈同一写法：只在它仍是原样时清掉图与阻挡。
 if GetD(1,19,2)==0 and GetD(1,19,7)==8256 then
  for _,f in ipairs({5,6,7})do SetD(1,19,f,-1)end
  SetD(1,19,0,0)
 end
 local ev=CC.ShopScene[0].d_shop;local talk=GetD(1,ev,2)
 if talk<=0 or talk==937 or talk==938 then
  local row={1,ev,938,-1,-1,8256,8256,8256,0,28,30}
  for i,v in ipairs(row)do SetD(1,ev,i-1,v)end
  SetS(1,28,30,3,ev)
 end
end
local loadShop=LoadRecord
LoadRecord=function(...)local result=loadShop(...);fixedWei();return result end
local initShop=Init_SMap
Init_SMap=function(...)fixedWei();return initShop(...)end
instruct_65=function()fixedWei()end
instruct_64=function()
 if JY.SubScene~=1 then return end
 TalkEx('小宝如今就在河洛落脚啦。各处收来的稀罕物件，都摆在这儿；衣甲鞋履也能配齐；寻常酒食药材，找掌柜更便当。',SHOP_HEAD,0)
 goodsShop(WEI)
end
local function facing(id)
 local x,y,dir=JY.Base['人X1'],JY.Base['人Y1'],JY.Base['人方向']
 return type(dir)=='number' and dir>=0 and dir<=3 and x+CC.DirectX[dir+1]==GetD(JY.SubScene,id,9) and y+CC.DirectY[dir+1]==GetD(JY.SubScene,id,10)
end
local hinted=false                         -- the keeper names the healers once per loaded page
BrowserHealerShop=function(scene,ev)       -- nil unless this healer sells now; used by the event menu and tests
 local h=HEALERS[scene] and HEALERS[scene][ev];local talk=h and GetD(scene,ev,2)
 if not h or not h.open[talk] then return nil end
 if h.notWith then for i=1,(CC.TeamNum or 6)do if JY.Base['队伍'..i]==h.notWith then return nil end end end
 local ring=h.ring and h.ring[talk];local stock={}
 for _,id in ipairs(h.goods)do stock[id]=true end
 if ring then for _,id in ipairs(h.ringGoods)do stock[id]=true end end
 local dear=h.dear and h.dear[talk]
 return {title=h.title,head=h.pid,stock=stock,extra=h.extra,mul=dear and h.dearMul or 1,label=h.label,
  line=dear and h.dearLine or ring and h.ringLine or h.line}
end
local shopEvent=EventExecute
EventExecute=function(id,flag,...)
 local keeper=KEEPERS[JY.SubScene]
 if keeper and id==keeper[1] and flag==1 and JY.Status==GAME_SMAP and GetD(JY.SubScene,id,2)==keeper[2] then
  if facing(id) then
   while true do
    local rows={{'住店、酒食与当地消息',nil,1},{'药材与行路补给',nil,1},{'买些日常酒食',nil,1},{'打听那位醉老头',nil,1}}
    if BrowserYijinKeeper and BrowserYijinRoad() and (JY.SubScene==1 or JY.SubScene==3 or JY.SubScene==40) then rows[#rows+1]={'问问店中可有难事',nil,1}end
    local r=ShowMenu(rows,#rows,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE)
    if r==1 then return shopEvent(id,flag,...) end
    if r==2 then
     if consigned() then
      if hinted~='consigned' then hinted='consigned';TalkEx('胡先生夫妇离开前，托小店代卖一批伤药和解毒药，价钱照他们定的来。',105,0) end
     elseif not hinted then hinted=true;TalkEx('小店只备寻常伤药补品。续命疗伤的好药，得去名医府上求；柳宗镇的薛神医，寻常伤药倒肯卖。',105,0) end
     goodsShop(INN)
    elseif r==3 then goodsShop(INN,true)
    elseif r==4 and BrowserDispersalKeeper then BrowserDispersalKeeper()
    elseif r==5 and BrowserYijinKeeper then BrowserYijinKeeper()
    else return end
   end
  end
 end
 local healer=flag==1 and JY.Status==GAME_SMAP and BrowserHealerShop(JY.SubScene,id)
 if healer and facing(id) then
  local r=ShowMenu({{'照常交谈',nil,1},{healer.label,nil,1}},2,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE)
  if r==1 then return shopEvent(id,flag,...) end
  if r==2 then TalkEx(healer.line,healer.head,0);goodsShop(healer) end
  return
 end
 return shopEvent(id,flag,...)
end
end
