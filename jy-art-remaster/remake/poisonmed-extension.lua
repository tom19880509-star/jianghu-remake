-- 156 用毒／医疗／防御三条独立分支。只包裹原版函数，不改原版数据、不新增存档字段：
-- 进度全部落在原版属性（用毒／解毒／抗毒／医疗能力、中毒程度）与原版秘籍 48-53 的持有上，
-- 战斗内的层数与守势只活在一场战斗里（WarMain 进出各清一次）。
-- 基线（读码核清，见 editorial/用毒医疗分支156.md）：
--   * War_PoisonHurt = floor((用毒-抗毒)/4)，必中、无上限差异；
--   * War_PersonLostLife 每轮扣 floor(中毒/10)，且生命<=0 一律拉回 1 —— 原版毒永远打不死人；
--   * ExecDoctor／ExecDecPoison 本身已正常，战斗内只收 2 点体力；
--   * 原版 AI（敌我自动）从不用毒、不替人解毒医疗，只会自医；
--   * 6 本医毒秘籍里只有五毒秘传(51)能在商店4买到，其余五本无任何获得途径。
BrowserPoisonMedTuning=false
BrowserPoisonMedInfo=false
BrowserPoisonMedLegacy=false
BrowserPoisonMedApply=false
do
 -- 首测值与依据见 editorial/用毒医疗分支156.md「首测值」一节；全部是值，不是原版数据。
 local T={
  enabled=true,
  -- 用毒：命中随（用毒-抗毒）升降，剂量另加用毒本身的一份；抗毒分三段——
  -- >=90 百毒不侵（游坦之练冰蚕、大蜘蛛本是毒物），>=70 每轮自行退毒，其余按差值算。
  hitBase=50,hitScale=1/2,hitMin=5,hitMax=95,
  doseDiv=4,doseSelfDiv=20,
  immuneResist=90,
  shedResist=70,shedDiv=30,
  -- 毒伤：原版 floor(中毒/10) 之上按毒发层数累积，层数每轮加一、封顶 6。
  tickDiv=10,rampDiv=60,rampMax=6,
  foeLethal=true,
  -- 毒衰：中毒者出手更软、挨打更痛（临时改写，调用后立即还原）。
  weakAtkDiv=400,weakAtkCap=1/4,
  weakDefDiv=333,weakDefCap=3/10,
  -- 医疗／用毒的成长：不打人也要能升级，否则这两条线练不起来。
  doctorStamina=13,doctorExpDiv=10,poisonExpDiv=2,
  -- 防御：休息=守势，本轮受武功伤害减免；反震只在贴身且自己还站着时回敬。
  guardCut=7/20,
  -- 157 单点复核（数据见 editorial/反震上限157.md，扫描台 tests/thorncap157-scan.sim.mjs）：
  -- thornCap **不是**压死「毒＋医＋防」那条路线的闸，维持 1/20 不动。
  -- 真正决定回敬多少的一直是 thornArmorRate：反震＝min(伤害×rate, 攻方生命上限×cap)，
  -- 上限要削到东西得先挨够「生命上限×cap÷rate」点的单击——对生命上限 695 的洪教主是 174 点，
  -- 而战斗里的一击远到不了。实测：同样 12 局 war133，cap 从 1/20 抬到 1/12，反震总量只从
  -- 1218 涨到 1230（差 1%）；1/12、1/10、1/8、1/4、1/2 五档逐位相同，胜率与倒下回合一个数都不动（仍 0%）。
  -- 上限咬到的其实是生命上限低的杂兵；它是一道安全栏（防一击把攻击者打掉一大截），不是常态税。
  thornArmor=120,thornArmorRate=1/5,thornInnerRate=3/20,thornCap=1/20,
  thornYijin=8,thornJiuyang=5,
  -- 敌方解毒对抗：有解毒本事的敌人会自己逼毒。
  foeCureSkill=40,foeCurePoison=30,
 }
 BrowserPoisonMedTuning=T

 local stack={}   -- pid -> 毒发层数（仅本场）
 local guard={}   -- pid -> 本轮守势（仅本场）

 local function person(pid) return JY.Person[pid] end
 local function ally(u) return u and u['我方']==true end
 local function probe(name) return rawget(_G,name) end

 -- 反震来源：软猬甲（《射雕》内层倒刺，欧阳克抱之受伤）或护体内功已至指定重数
 -- （易筋经八重／九阳五重；《倚天》光明顶上九阳护体，敌人硬打反受其伤）。
 local function thornRate(pid)
  local p=person(pid);local rate=0
  if p['防具']==T.thornArmor then rate=T.thornArmorRate end
  local config=probe('BrowserGrowthBattleConfig');local heart=probe('BrowserHeartRank')
  if config and heart then
   local cfg=config(pid)
   if cfg then
    local yijin=heart(cfg,43) or 0;local jiuyang=heart(cfg,95) or 0
    if yijin>=T.thornYijin or jiuyang>=T.thornJiuyang then
     if T.thornInnerRate>rate then rate=T.thornInnerRate end
    end
   end
  end
  return rate
 end

 -- 毒杀与毒伤的经验记在我方用毒最高的人身上：他是下毒的人，
 -- 不给经验这条线就永远升不了级。
 local function creditPoisoner(amount)
  if amount<=0 then return end
  local best,bestUse=nil,-1
  for i=0,(WAR.PersonNum or 0)-1 do
   local u=WAR.Person[i]
   if ally(u) and u['死亡']~=true then
    local use=person(u['人物编号'])['用毒能力'] or 0
    if use>bestUse then best,bestUse=i,use end
   end
  end
  if best and bestUse>=20 then WAR.Person[best]['经验']=(WAR.Person[best]['经验'] or 0)+amount end
 end

 -- 每轮结算：原版的受伤掉血保留（仍不致死），毒伤按层数累积，
 -- 抗毒高的人每轮自然退毒，敌方可以被毒死，我方沿用原版 1 点保底。
 local sourceLost=War_PersonLostLife
 War_PersonLostLife=function()
  if not T.enabled then return sourceLost() end
  local died=false
  for i=0,(WAR.PersonNum or 0)-1 do
   local u=WAR.Person[i]
   if u and u['死亡']==false then
    local pid=u['人物编号'];local p=person(pid)
    local injury=p['受伤程度'] or 0
    if injury>0 then
     local dec=math.floor(injury/20)
     if p['生命']-dec<1 then dec=p['生命']-1 end
     if dec>0 then AddPersonAttrib(pid,'生命',-dec) end
    end
    local poison=p['中毒程度'] or 0
    if poison>0 then
     local n=(stack[pid] or 0)+1;if n>T.rampMax then n=T.rampMax end;stack[pid]=n
     local dec=math.floor(poison/T.tickDiv)+math.floor(poison*n/T.rampDiv)
     if dec>0 then
      local real=-AddPersonAttrib(pid,'生命',-dec)
      if not ally(u) then creditPoisoner(math.floor(real/5)) end
     end
     local resist=p['抗毒能力'] or 0
     if resist>=T.shedResist then AddPersonAttrib(pid,'中毒程度',-math.floor(resist/T.shedDiv)) end
    else
     stack[pid]=0
    end
    if p['生命']<=0 then
     if ally(u) or not T.foeLethal then p['生命']=1
     else p['生命']=0;u['死亡']=true;died=true;creditPoisoner((p['等级'] or 0)*10) end
    end
   end
  end
  -- 与 War_isEnd 同样的一步：毒毙的人不该继续占着格子。
  if died and type(WarSetPerson)=='function' then WarSetPerson() end
  guard={}
 end

 -- 用毒：抗毒 >=90 完全免疫（游坦之、大蜘蛛），80-89 只受一半（欧阳锋、丁春秋、蓝凤凰），
 -- 其余按（用毒-抗毒）定命中与剂量。原版必中、无档位，这里是本分支的核心改动。
 -- 上毒的唯一入口。任何机制要给人上毒都走这里——手动下毒、暗器带毒、带毒武功都一样，
 -- 于是「百毒不侵」和「抗毒挡下」的判定只有这一份，别人加新玩法时不会绕过去。
 -- eid 是人物编号；dose 是这一次要上的点数；useLevel 给了就再判一次原版的「抗毒>=用毒则一点也上不去」。
 -- 返回**实际**加上的中毒点数（0＝没上去）。每个 eid 各算各的，没有任何跨目标的共享状态。
 BrowserPoisonMedApply=function(eid,dose,useLevel)
  if not T.enabled then return 0 end
  local p=JY.Person[eid];if not p then return 0 end
  local resist=p['抗毒能力'] or 0
  if resist>=T.immuneResist then return 0 end            -- 百毒不侵：游坦之100、大蜘蛛99
  if useLevel and resist>=useLevel then return 0 end     -- 原版规则：抗毒 >= 用毒，一点也上不去
  dose=math.floor(tonumber(dose) or 0)
  if dose<1 then return 0 end
  return AddPersonAttrib(eid,'中毒程度',dose)
 end

 local sourcePoisonHurt=War_PoisonHurt
 War_PoisonHurt=function(pid,eid)
  if not T.enabled then return sourcePoisonHurt(pid,eid) end
  local use=person(pid)['用毒能力'] or 0
  local resist=person(eid)['抗毒能力'] or 0
  if resist>=T.immuneResist then return 0 end
  local base=use-resist
  if base<=0 then return 0 end
  local chance=math.floor(T.hitBase+base*T.hitScale)
  if chance<T.hitMin then chance=T.hitMin elseif chance>T.hitMax then chance=T.hitMax end
  if Rnd(100)>=chance then return 0 end
  local dose=math.floor(base/T.doseDiv)+math.floor(use/T.doseSelfDiv)
  if dose<1 then dose=1 end
  return BrowserPoisonMedApply(eid,dose,use)
 end

 -- 用毒与医疗的行动：原版只给 1 点经验、2 点体力；这里按实际见效给经验，
 -- 战斗内医疗另收体力（推宫过血），使「续航换伤害」真的要算账。
 local sourceExecSub=War_ExecuteMenu_Sub
 War_ExecuteMenu_Sub=function(x1,y1,flag,thingid)
  if not T.enabled or (flag~=1 and flag~=3) then return sourceExecSub(x1,y1,flag,thingid) end
  local u=WAR.Person[WAR.CurID]
  if not u then return sourceExecSub(x1,y1,flag,thingid) end
  local slot=GetWarMap(x1,y1,2)
  local target=slot and slot>=0 and WAR.Person[slot] and WAR.Person[slot]['人物编号'] or nil
  local before=target and (flag==1 and person(target)['中毒程度'] or person(target)['生命']) or 0
  local result=sourceExecSub(x1,y1,flag,thingid)
  if result==1 and target then
   local after=flag==1 and person(target)['中毒程度'] or person(target)['生命']
   local delta=after-before
   -- 额外体力只在推宫过血真的见效时收。原版对 flag 1/2/3 一律收 2 点、一律返回 1，
   -- 哪怕 ExecDoctor 因「体力<50」或「受伤>医疗+20」当场退回 0；
   -- 这 13 点要是跟着空手一次也收，医者会被自己的失败尝试拖垮（体力每轮只休息回 3-5 点）。
   if delta>0 then
    u['经验']=(u['经验'] or 0)+math.floor(delta/(flag==1 and T.poisonExpDiv or T.doctorExpDiv))
    if flag==3 then AddPersonAttrib(u['人物编号'],'体力',-T.doctorStamina) end
   end
  end
  return result
 end

 -- 解毒见效到清零时，毒发层数一并重来。
 local sourceDec=ExecDecPoison
 ExecDecPoison=function(id1,id2)
  local out=table.pack(sourceDec(id1,id2))
  if T.enabled and (person(id2)['中毒程度'] or 0)<=0 then stack[id2]=0 end
  return table.unpack(out,1,out.n)
 end

 -- 休息=守势：本轮内所受武功伤害减免，下一轮结算时清空。
 local sourceRest=War_RestMenu
 War_RestMenu=function(...)
  local out=table.pack(pcall(sourceRest,...))
  if T.enabled and WAR.Person[WAR.CurID] then guard[WAR.Person[WAR.CurID]['人物编号']]=true end
  if not out[1] then error(out[2],0) end
  return table.unpack(out,2,out.n)
 end

 -- 毒衰、守势与反震都挂在最外层的武功伤害上：临时改写攻防，调用后无条件还原。
 local sourceHurtLife=War_WugongHurtLife
 War_WugongHurtLife=function(target,skill,level)
  if not T.enabled then return sourceHurtLife(target,skill,level) end
  local u=WAR.Person[WAR.CurID];local tu=WAR.Person[target]
  if not u or not tu then return sourceHurtLife(target,skill,level) end
  local pid=u['人物编号'];local eid=tu['人物编号']
  local ap,dp=person(pid),person(eid)
  local atk,def=ap['攻击力'],dp['防御力']
  local poisonA=ap['中毒程度'] or 0
  local poisonD=dp['中毒程度'] or 0
  if poisonA>0 then
   local cut=poisonA/T.weakAtkDiv;if cut>T.weakAtkCap then cut=T.weakAtkCap end
   ap['攻击力']=math.max(1,math.floor(atk*(1-cut)))
  end
  if poisonD>0 then
   local cut=poisonD/T.weakDefDiv;if cut>T.weakDefCap then cut=T.weakDefCap end
   dp['防御力']=math.max(0,math.floor(def*(1-cut)))
  end
  local ok,hurt=pcall(sourceHurtLife,target,skill,level)
  ap['攻击力']=atk;dp['防御力']=def
  if not ok then error(hurt,0) end
  if type(hurt)~='number' or hurt<=0 then return hurt end
  -- 守势只减轻非致命的一击：已经被打倒的人不会因为守势复活，
  -- 攻击方的击杀经验也就不会被回滚。
  if guard[eid] and (dp['生命'] or 0)>0 then
   local back=math.floor(hurt*T.guardCut)
   if back>0 then
    dp['生命']=math.min(dp['生命最大值'],dp['生命']+back);hurt=hurt-back
    -- 原版在本函数里按整击的 hurt/10 记了受伤程度；这一击既然被卸掉一截，
    -- 受伤也要按同一比例退回去。否则守势挡得住血、挡不住伤势，
    -- 而受伤一旦过「医疗+20」就再也医不动，防御线会被自己的伤势闷死。
    local heal=math.floor(back/10)
    if heal>0 then AddPersonAttrib(eid,'受伤程度',-heal) end
   end
  end
  if ally(tu) and (dp['生命'] or 0)>0 then
   local dist=math.abs(u['坐标X']-tu['坐标X'])+math.abs(u['坐标Y']-tu['坐标Y'])
   if dist<=1 then
    local rate=thornRate(eid)
    if rate>0 then
     local thorn=math.floor(hurt*rate)
     local cap=math.floor((ap['生命最大值'] or 0)*T.thornCap)
     if cap>0 and thorn>cap then thorn=cap end
     if thorn>0 then
      local real=-AddPersonAttrib(pid,'生命',-thorn)
      tu['经验']=(tu['经验'] or 0)+math.floor(real/5)
      if (ap['生命'] or 0)<=0 then
       ap['生命']=0;tu['经验']=tu['经验']+(ap['等级'] or 0)*10
      end
     end
    end
   end
  end
  return hurt
 end

 -- 当前行动者的对面是否还有活人（只看同一回合的 WAR.Person，不读写存档）。
 local function foeLeft()
  local me=WAR.Person[WAR.CurID]
  if not me then return true end
  for i=0,WAR.PersonNum-1 do local o=WAR.Person[i];if o['我方']~=me['我方'] and not o['死亡'] then return true end end
  return false
 end

 -- 解毒与抗毒的对抗：原版 AI 从不解毒，于是毒对程灵素、王难姑、蓝凤凰、薛慕华
 -- 这类人也毫无阻力。有解毒本事的敌人现在会先运功逼毒。
 local sourceAuto=War_Auto
 War_Auto=function(...)
  if T.enabled then
   local u=WAR.Person[WAR.CurID]
   if u and not ally(u) then
    local pid=u['人物编号'];local p=person(pid)
    if (p['解毒能力'] or 0)>=T.foeCureSkill and (p['中毒程度'] or 0)>=T.foeCurePoison and (p['体力'] or 0)>=10 then
     local before=p['中毒程度']
     ExecDecPoison(pid,pid)
     if p['中毒程度']<before then
      AddPersonAttrib(pid,'体力',-2)
      DrawStrBoxWaitKey(string.format('%s运功逼毒，中毒 %d→%d。',p['姓名'],before,p['中毒程度']))
      return 0
     end
    end
   end
  end
  -- 2026-09-29（放在逼毒之后，敌方逼毒照旧）：本层让敌方可在回合末毒毙。原版 WarMain 只在单位行动之后查 War_isEnd（jymain.lua:4227），
  -- 回合末 War_PersonLostLife（:4245）之后不查；对面最后一人被毒死时，下一回合第一位若是自动行动，
  -- 原版 War_AutoMove 找不到可攻击的位置，拿最近敌人 -1 去取坐标（:6522、:6530）而报错。
  -- 对面已无活人就不再行动，交回循环，由紧接着的 War_isEnd 判定胜负。
  if not foeLeft() then return 0 end
  return sourceAuto(...)
 end
 -- 2026-10-01 隔离实玩：手动同理。回合末毒毙最后一人后，下一位手动单位原先仍弹出整套行动菜单（攻击处处「无敌可及」），
 -- 须再点一次休息才判胜。对面已无活人就不弹菜单，返回 0（非等待 7），同样交回循环判胜。
 local sourceManual=War_Manual
 War_Manual=function(...)
  if not foeLeft() then return 0 end
  return sourceManual(...)
 end

 local sourceWarMain=WarMain
 WarMain=function(...)
  stack={};guard={}
  local out=table.pack(pcall(sourceWarMain,...))
  stack={};guard={}
  if not out[1] then error(out[2],0) end
  return table.unpack(out,2,out.n)
 end

 -- 只读查询，供界面／测试核对当前一场的毒发层数与守势，不改任何状态。
 -- tick／shed／immune 都在这里算好：界面只管显示，公式永远只有这一份。
 BrowserPoisonMedInfo=function(pid)
  local p=JY.Person[pid]
  if not p then return nil end
  local poison=p['中毒程度'] or 0
  local resist=p['抗毒能力'] or 0
  local n=(stack[pid] or 0)+1;if n>T.rampMax then n=T.rampMax end
  local tick=poison>0 and (math.floor(poison/T.tickDiv)+math.floor(poison*n/T.rampDiv)) or 0
  local shed=(poison>0 and resist>=T.shedResist) and math.floor(resist/T.shedDiv) or 0
  return {poison=poison,stack=stack[pid] or 0,guard=guard[pid]==true,
   use=p['用毒能力'] or 0,cure=p['解毒能力'] or 0,resist=resist,doctor=p['医疗能力'] or 0,
   thorn=thornRate(pid),
   tick=tick,          -- 下一次回合结算会掉的血（已含层数）
   nextStack=poison>0 and n or 0,  -- 下一次结算时的层数
   maxStack=T.rampMax,
   shed=shed,          -- 抗毒>=70 每轮自行退掉的毒
   immune=resist>=T.immuneResist,
   guardCut=T.guardCut}
 end

 -- 传承：复用原版加入事件，给的是原版秘籍（48-53），存档天然记住，不新增字段。
 -- 157 更正：原注释写「这五本没有任何事件、商店或掉落给出」是错的——它们**就在传书人自己身上**
 -- （携带物品×1：程灵素 53、胡青牛 50、王难姑 52、平一指 49、薛慕华 48），入队「归公」时直接进行囊。
 -- 只有五毒秘传 51 确实无人携带，仅商店4 有售（300 文）。这一段的作用因此不是「凭空补书」，
 -- 而是**把那本悄悄进包的书还原成一幕交付**：讲明它从哪来、附上该有的赠益。
 local LEGACY={
  [42]={book=53,teacher=2},[953]={book=53,teacher=2},
  [96]={book=50,teacher=16},[957]={book=50,teacher=16},
  [97]={book=52,teacher=17},[959]={book=52,teacher=17},
  [616]={book=51,teacher=25},[617]={book=51,teacher=25},[961]={book=51,teacher=25},
  [303]={book=48,teacher=28},[963]={book=48,teacher=28},
  [556]={book=49,teacher=45},[977]={book=49,teacher=45},
 }
 local WORDS={
  [48]={'针灸之道，子午流注，说难也难，说易也易。','你既肯学，这本子午针灸经便归你。别把人医死了，算我头上。'},
  [49]={'医道不在奇巧，在于胆大心细。','华陀内昭图你拿去。看得懂几分，便有几分本事。'},
  [50]={'我这医书，从前只给自家人看。','难姑承你搭救，这本医书便送给你。行走江湖，能救人时，就多救一个。'},
  [51]={'我们苗疆的法子，外人听了要皱眉头。','五毒秘传给你。先叫蛊虫认过你的血，往后寻常毒物便伤你不得。'},
  [52]={'姓胡的只会医人，我偏要他知道，毒也是一门学问。','毒经拿去。记着：用毒的人，第一个要防的是自己。'},
  [53]={'师父传我的时候说，这门本事救人多，害人也多。','药王神篇给你。七心海棠的性子烈，你慢慢参详。'},
 }
 local BONUS={[51]={'抗毒能力',15,'蛊虫认过血，百毒渐渐近身不得。'},[53]={'解毒能力',10,'七心海棠的解法，你先记下一半。'}}

 -- 星宿派：六部典籍 48-53 已各归其主，而星宿派的毒本来也不是一部典籍。
 -- 原版里丁春秋(46) 全程无入队事件；阿紫(47) 的入队事件 561/979 只谈同行，给不出书。
 -- 读遍 oldevent 1018 个事件后，真正「存在且条件可达」的落点只有下面两个，都是原版自带的一次性事件：
 --   560 交千年冰蚕给阿紫：原版以 instruct_4(37) 触发、instruct_32(37,-1) 消耗，
 --       事后把事件槽改写成 561/562，天然只能成一次；而千年冰蚕全局仅 591 一只（782 是北丑给的位置提示）。
 --       这一步原版就已经是个真选择：冰蚕自己吃是「加抗毒能力 100」＝百毒不侵，交出去则换阿紫的毒功。
 --   546 星宿海胜丁春秋（原版战斗 86）：胜则把自身事件槽改写成 590，并 品德+10、声望+6。
 -- 给的是原版属性，不是书，也不新增存档字段。判定「原版真的走到了赏赐那一步」：
 -- 560 看冰蚕是否少了一只，546 看声望是否涨了——两者都只在成功分支上发生。
 -- 560 只给用毒（攻），不给抗毒：否则就把「吃掉冰蚕换百毒不侵」这个原版选择抹平了。
 local STAR={
  [560]={teacher=47,probe='thing',thing=37,gain={{'用毒能力',12}},
   talk='这冰蚕你倒舍得给我。也罢，我星宿派下毒的法子教你一手——毒不在猛，在乎快，*要人还没觉出不对，就已经站不住了。',
   note='阿紫把喂毒、催毒的诀窍说了一遍。'},
  [546]={teacher=46,probe='fame',gain={{'用毒能力',8},{'抗毒能力',10}},
   note='星宿老怪的毒囊与几页手书散落在地。你捡起来翻了翻，又就着解药服了一剂，*从此寻常毒物再难近身。'},
 }
 local function thingCount(id)
  local n=0
  for i=1,CC.MyThingNum do if JY.Base['物品'..i]==id then n=n+(JY.Base['物品数量'..i] or 0) end end
  return n
 end
 local function starMark(star)
  if star.probe=='thing' then return thingCount(star.thing) end
  return JY.Person[0]['声望'] or 0
 end
 local function starFired(star,mark)
  local now=starMark(star)
  if star.probe=='thing' then return now<mark end
  return now>mark
 end
 local function awardStar(star)
  if star.talk then TalkEx(star.talk,JY.Person[star.teacher]['头像代号'],0) end
  local parts={}
  for _,g in ipairs(star.gain) do
   AddPersonAttrib(0,g[1],g[2]);parts[#parts+1]=g[1]..'＋'..g[2]
  end
  DrawStrBoxWaitKey(star.note..'（'..table.concat(parts,'、')..'）')
 end

 local function bagRoom()
  for i=1,CC.MyThingNum do if JY.Base['物品'..i]<0 then return true end end
  return false
 end
 -- 纯查询：说明这一次为何能／不能受传，供测试与文档核对。
 BrowserPoisonMedLegacy=function(eventId)
  local star=STAR[eventId]
  if star then
   local gain={}
   for i,g in ipairs(star.gain) do gain[i]={field=g[1],amount=g[2],have=JY.Person[0][g[1]] or 0} end
   return {kind='star',teacher=star.teacher,name=JY.Person[star.teacher]['姓名'],
    probe=star.probe,thing=star.thing,gain=gain}
  end
  local row=LEGACY[eventId]
  if not row then return nil end
  local t=JY.Thing[row.book]
  local p=JY.Person[0]
  local need,field=0,nil
  for _,key in ipairs({'用毒能力','医疗能力','解毒能力'}) do
   local v=t['需'..key] or 0
   if v>need then need,field=v,key end
  end
  local owned=instruct_18(row.book)
  local inTeam=false
  for i=1,CC.TeamNum do if JY.Base['队伍'..i]==row.teacher then inTeam=true end end
  return {kind='book',book=row.book,name=t['名称'],teacher=row.teacher,field=field,need=need,
   have=field and (p[field] or 0) or 0,owned=owned,inTeam=inTeam,room=bagRoom(),
   eligible=(not owned) and inTeam and (not field or (p[field] or 0)>=need)}
 end
 local sourceEvent=oldCallEvent
 oldCallEvent=function(eventId)
  -- 星宿派两处落点：先记下原版事件的成败标记，原版跑完再看它有没有真的走到赏赐那一步。
  local star=T.enabled and STAR[eventId] or nil
  local mark=star and starMark(star) or 0
  -- 157 审核：这六本典籍里有五本**就在传书人自己身上**（携带物品×1：程灵素 53、胡青牛 50、王难姑 52、
  -- 平一指 49、薛慕华 48），而原版 instruct_10 入队时「个人物品归公」会把它们直接塞进行囊（jymain.lua:3120）。
  -- 于是事件跑完时 owned 必为真，eligible 恒假——42/953、96/957、97/959 三拍**从来没播过**，
  -- 303/963 与 556/977 也会在另一位先入队时被堵死；书凭空出现在行囊里，交付的那一幕一次也看不到。
  -- 只有蓝凤凰那一本 51 是活的（她携带的是 31/90/86/26，全表无人带 51）。
  -- 判据改成「**这一场之前**有没有这本书」：之前没有就该演这一幕；书若已由归公送到，就不再补发第二本。
  local pre=T.enabled and LEGACY[eventId] or nil
  local hadBook=pre~=nil and instruct_18(pre.book) or false
  sourceEvent(eventId)
  if star and starFired(star,mark) then awardStar(star) end
  if not T.enabled then return end
  local info=BrowserPoisonMedLegacy(eventId)
  if not info then return end
  local gateOk=(not info.field) or (info.have>=info.need)
  if hadBook or not info.inTeam then return end
  if not gateOk then
   -- 随同伴入队收下的书与研习资格分开说明，不补发典籍或提前给受传加成。
   if info.owned then
    DrawStrBoxWaitKey(string.format('%s的%s已收进行囊。\n研习需%s %d（你现在 %d）。可先收好，待根基进益再参详。',
     JY.Person[LEGACY[eventId].teacher]['姓名'],info.name,info.field,info.need,info.have))
   end
   return
  end
  local row=LEGACY[eventId];local words=WORDS[row.book]
  -- 书已经随「归公」进了行囊时不必再占一格；只有真要补发时才查行囊。
  local arrived=info.owned
  if not arrived and not info.room then
   DrawStrBoxWaitKey(JY.Person[row.teacher]['姓名']..'想传你一部医毒典籍，可你的行囊已满。腾出一格再来。')
   return
  end
  TalkEx(words[1],JY.Person[row.teacher]['头像代号'],0)
  if not DrawStrBoxYesNo(-1,-1,'受'..JY.Person[row.teacher]['姓名']..'一部'..info.name..'？',C_WHITE,CC.DefaultFont) then return end
  TalkEx(words[2],JY.Person[row.teacher]['头像代号'],0)
  if not arrived then instruct_2(row.book,1) end
  local bonus=BONUS[row.book]
  if bonus then
   AddPersonAttrib(0,bonus[1],bonus[2])
   DrawStrBoxWaitKey(bonus[3]..'（'..bonus[1]..'＋'..bonus[2]..'）')
  end
 end
end
