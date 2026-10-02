-- 156 暗器线：命中／距离／数量的真实代价，单体与群伤分开，毒一律挂回上一组的同一套结算。
-- 只包裹原版函数，不改原版数据、不新增存档字段，不新增原事件号。
-- 基线（读码核清，见 editorial/暗器线与西毒156.md）：
--   * War_AnqiHurt：伤害 = floor((加生命/档 - Rnd(5) - 暗器技巧*2)/3)，**必中**、无距离衰减；
--     受伤程度 += -伤害/4；毒 = limitX((加中毒解毒+暗器技巧)/2 - 抗毒, 0, 100) 直接加到中毒程度；
--   * War_ExecuteMenu(4)：可选格 = floor(暗器技巧/15)+1；War_ExecuteMenu_Sub(flag=4) 只扣 1 件物品，
--     **不收体力、不给经验**（flag 1/2/3 才收 2 点体力、给 1 点经验）；
--   * 原版 AI（War_Think／War_Auto）从不使用暗器，这条线是纯玩家侧的；
--   * 战后 War_EndPersonData 复原敌方中毒，毒不跨战积累。
-- 本层加的是：命中判定（暗器技巧 vs 轻功 vs 掷程）、体力与经验、单体／群伤分流、用毒联动的涂毒。
-- 毒**只有一个入口**：BrowserPoisonMedApply（poisonmed-extension.lua），层数、退毒、免疫全部沿用那一份。
BrowserThrownTuning=false
BrowserThrownInfo=false
BrowserThrownPlan=false
BrowserThrownCanon=false
do
 -- 首测值与依据见 editorial/暗器线与西毒156.md「首测值」一节；全部是本作的值，不是原版数据。
 local T={
  enabled=true,
  -- 命中：原版必中。这里按暗器技巧升、按目标轻功与掷程降。
  hitBase=60,hitScale=1/2,dodgeScale=1/3,distStep=5,hitMin=15,hitMax=95,
  -- 代价：原版扔暗器不收体力。体力不够就不让出手（不扣物品、不耗回合）。
  stamina=3,splashStamina=1,
  -- 品级（第二批，Tom／协调者裁定 5）：原版伤害被「暗器技巧×2/3」压倒，飛蝗石(-30) 与 霹靂彈(-100)
  -- 在暗器 47 时只差约 6 点，等于宣布暗器不是一条路。这里让品级真正生效：
  -- 以「威力 40」（飛刀）为 1.0，按威力等比缩放原版结果，两端夹住。
  -- 原版那条伤害公式仍是唯一一份，本层只做等比缩放，受伤程度按原版同一比例（伤害/4）跟着走。
  gradeBase=40,gradeMin=3/4,gradeMax=2,
  -- 用毒联动（涂毒）：用毒达门槛后，非爆炸类暗器自带毒；持《含沙射影》再浓一档。
  -- 门槛 40 与原版《毒經》52 的修炼门槛同值；毒本身走 BrowserPoisonMedApply。
  coatSkill=40,coatDiv=8,coatBook=90,coatBookDiv=6,
  -- 群伤一：爆炸。霹靂彈(101) 一颗炸开十字五格，**范围内不分敌我**，外圈减半，只耗 1 枚。
  blastThing=101,blastRate=1/2,
  -- 群伤二：手法，本线旗舰。持《滿天花雨》88 且暗器技巧达标者可群发，**3×3 九格**（含斜角）、
  -- **只打敌人**，外圈按 fanRate 折算，但**每个命中目标各耗 1 枚**——原著里一扬手就是十几枚金针，
  -- 不是一枚。洪七公正是为破欧阳锋叔侄的蛇阵才创的它，对付一群人本来就是它的本行。
  fanBook=88,fanSkill=40,fanRate=2/3,
  -- 经验：原版扔暗器一点经验也没有，这条线永远练不起来。
  hurtExpDiv=10,doseExpDiv=2,
  -- 原著核对后的底表修正（见 editorial/暗器线与西毒156.md 一.4）。关掉就完全回到原版面板。
  canon=true,
 }
 BrowserThrownTuning=T

 local RATE=1     -- 本次结算的威力比例（中心 1，外圈 blastRate／fanRate）；每次用完立即还原
 local LOG=nil    -- 本次投掷的战报，只活在一次行动里

 local function person(pid) return JY.Person[pid] end
 local function probe(name) return rawget(_G,name) end

 local function unitOf(pid)
  for i=0,(WAR.PersonNum or 0)-1 do
   local u=WAR.Person[i]
   if u and u['人物编号']==pid then return u,i end
  end
  return nil,nil
 end

 -- 掷程：原版已按 floor(暗器技巧/15)+1 限制可选格，这里只拿距离做命中衰减。
 local function distance(pid,eid)
  local a=unitOf(pid);local b=unitOf(eid)
  if not a or not b then return 1 end
  return math.abs(a['坐标X']-b['坐标X'])+math.abs(a['坐标Y']-b['坐标Y'])
 end

 local function hitChance(pid,eid)
  local skill=person(pid)['暗器技巧'] or 0
  local dodge=person(eid)['轻功'] or 0
  local dist=distance(pid,eid)
  local c=math.floor(T.hitBase+skill*T.hitScale-dodge*T.dodgeScale-math.max(0,dist-1)*T.distStep)
  if c<T.hitMin then c=T.hitMin elseif c>T.hitMax then c=T.hitMax end
  return c,dist
 end

 -- 涂毒：会配毒的人才在暗器上喂毒（《鹿鼎记》何铁手传韦小宝的「含沙射影」，针上原有剧毒）。
 -- 爆炸物喂不上毒，所以霹靂彈不吃这一档——否则它就是「群伤＋毒」的唯一最优解。
 local function coatDose(pid,thingid)
  if thingid==T.blastThing then return 0 end
  local use=person(pid)['用毒能力'] or 0
  if use<T.coatSkill then return 0 end
  local div=(instruct_18(T.coatBook) and T.coatBookDiv or T.coatDiv)
  local d=math.floor(use/div)
  if d<1 then d=1 end
  return d
 end

 -- 品级：以威力 40（飛刀）为 1.0。飛蝗石 0.75、金錢鏢 0.875、菩提子 1.125、玉蜂針 1.25、
 -- 冰魄銀針 1.75、金蛇錐/黑血神針 2.0、霹靂彈 2.0（封顶——它已经有群伤，不再叠威力）。
 local function grade(thingid)
  local t=JY.Thing[thingid];if not t then return 1 end
  local g=(-(t['加生命'] or 0))/T.gradeBase
  if g<T.gradeMin then g=T.gradeMin elseif g>T.gradeMax then g=T.gradeMax end
  return g
 end

 -- 群伤定性。爆炸看物品本身，手法看「持书 + 暗器技巧」；两者都不成立就是单体。
 local function spread(pid,thingid)
  if thingid==T.blastThing then return 'blast',T.blastRate,true end
  if instruct_18(T.fanBook) and (person(pid)['暗器技巧'] or 0)>=T.fanSkill then
   return 'fan',T.fanRate,false
  end
  return 'single',1,false
 end

 -- 等比缩放：原版 War_AnqiHurt 仍是唯一一份伤害公式，这里只把它的结果按「品级×外圈比例」缩放，
 -- 受伤程度按原版同一比例（伤害/4）跟着走，免得「血改了、伤势没改」。
 -- rate>1 就再多扣一截，rate<1 就退回一截；两个方向共用一份代码。
 local function scale(eid,delta,rate)
  if delta>=0 or rate==1 then return delta end
  local diff=math.floor(delta*rate)-delta
  if diff==0 then return delta end
  local real=AddPersonAttrib(eid,'生命',diff)
  local hurtAdj=math.floor(-real/4)
  if hurtAdj~=0 then AddPersonAttrib(eid,'受伤程度',hurtAdj) end
  return delta+real
 end

 -- 一次投掷对一个目标的全部结算。原版必中，这里先过命中；命中后伤害仍由原版算，
 -- 毒（物品自带的那份由原版直接加，涂上去的那份由 BrowserPoisonMedApply 加）只落在中毒程度上，
 -- 层数、退毒、百毒不侵全部沿用 poisonmed-extension 的那一份，本层不自造任何毒规则。
 local sourceAnqi=War_AnqiHurt
 War_AnqiHurt=function(pid,eid,thingid)
  if not T.enabled then return sourceAnqi(pid,eid,thingid) end
  local chance=hitChance(pid,eid)
  if LOG then LOG.shots=LOG.shots+1 end
  if Rnd(100)>=chance then
   if LOG then LOG.miss=LOG.miss+1 end
   return 0
  end
  local before=person(eid)['中毒程度'] or 0
  local ok,delta=pcall(sourceAnqi,pid,eid,thingid)
  if not ok then error(delta,0) end
  if type(delta)~='number' then delta=0 end
  delta=scale(eid,delta,grade(thingid)*RATE)
  local dose=coatDose(pid,thingid)
  if dose>0 then
   local apply=probe('BrowserPoisonMedApply')
   if apply then apply(eid,dose,person(pid)['用毒能力'] or 0) end
  end
  if LOG then
   LOG.hit=LOG.hit+1
   LOG.hurt=LOG.hurt-delta
   LOG.dose=LOG.dose+math.max(0,(person(eid)['中毒程度'] or 0)-before)
  end
  return delta
 end

 -- 爆炸是十字五格（四邻），滿天花雨是 3×3 九格（八邻）。中心由原版打，其余由本层补。
 -- 越界与空格自然跳过。
 local CROSS={{1,0},{-1,0},{0,1},{0,-1}}
 local RING={{1,0},{-1,0},{0,1},{0,-1},{1,1},{1,-1},{-1,1},{-1,-1}}
 local function neighbours(x,y,wide)
  local out={}
  for _,d in ipairs(wide and RING or CROSS) do
   local nx,ny=x+d[1],y+d[2]
   if nx>=0 and nx<(CC.WarWidth or 64) and ny>=0 and ny<(CC.WarHeight or 64) then
    local slot=GetWarMap(nx,ny,2)
    local u=(slot and slot>=0) and WAR.Person[slot] or nil
    -- 用坐标复核一次：地图层若给回意外的槽号，这一步把它挡掉。
    if u and u['死亡']==false and u['坐标X']==nx and u['坐标Y']==ny then out[#out+1]=u end
   end
  end
  return out
 end

 local function bagCount(id)
  for i=1,CC.MyThingNum do
   if JY.Base['物品'..i]==id then return JY.Base['物品数量'..i] or 0 end
  end
  return 0
 end

 -- 纯查询：这件暗器现在是什么定性、命中多少、涂多少毒、还剩几枚。界面与测试都读这一份。
 BrowserThrownInfo=function(pid,thingid,eid)
  local t=JY.Thing[thingid]
  if not t or t['类型']~=4 then return nil end
  local p=person(pid)
  if not p then return nil end
  local kind,rate,friendly=spread(pid,thingid)
  local info={kind=kind,rate=rate,friendlyFire=friendly,
   name=t['名称'],power=-(t['加生命'] or 0),venom=t['加中毒解毒'] or 0,
   need=t['需暗器技巧'] or 0,skill=p['暗器技巧'] or 0,
   usable=(p['暗器技巧'] or 0)>=(t['需暗器技巧'] or 0),
   reach=math.floor((p['暗器技巧'] or 0)/15)+1,
   stock=bagCount(thingid),stamina=T.stamina,grade=grade(thingid),
   coat=coatDose(pid,thingid),coatSkill=T.coatSkill,
   coatBook=instruct_18(T.coatBook),fanBook=instruct_18(T.fanBook),
   use=p['用毒能力'] or 0}
  if eid and person(eid) then
   local c,d=hitChance(pid,eid)
   info.chance=c;info.distance=d
  end
  return info
 end

 -- 纯查询：这一掷会打到谁、中心与外圈各是谁、会不会误伤。只读，不改任何状态。
 BrowserThrownPlan=function(pid,thingid,x,y)
  local kind,rate,friendly=spread(pid,thingid)
  local slot=GetWarMap(x,y,2)
  local centre=(slot and slot>=0) and WAR.Person[slot] or nil
  local plan={kind=kind,rate=rate,friendlyFire=friendly,centre=nil,outer={},cost=1}
  if centre then plan.centre=centre['人物编号'] end
  if kind=='single' or not centre then return plan end
  -- 打不打得着，看的是**投掷者**这一边：爆炸谁都炸，手法只找对面。
  local thrower=unitOf(pid)
  local side=thrower and thrower['我方']
  for _,u in ipairs(neighbours(x,y,kind=='fan')) do
   if kind=='blast' or u['我方']~=side then
    plan.outer[#plan.outer+1]=u['人物编号']
   end
  end
  if kind=='fan' then plan.cost=1+#plan.outer end
  return plan
 end

 -- 一次暗器行动：体力门槛 → 原版打中心 → 本层补外圈 → 收体力、给经验、报一行战报。
 local sourceExecSub=War_ExecuteMenu_Sub
 War_ExecuteMenu_Sub=function(x1,y1,flag,thingid)
  if not T.enabled or flag~=4 then return sourceExecSub(x1,y1,flag,thingid) end
  local u=WAR.Person[WAR.CurID]
  if not u then return sourceExecSub(x1,y1,flag,thingid) end
  -- Native flag=4 consumes an item even when its centre is a friendly unit.
  -- Reject an invalid centre before animation, costs, splash or random rolls.
  -- A bomb still harms friendly units around a valid enemy centre as before.
  local slot=GetWarMap(x1,y1,2)
  local target=slot and slot>=0 and WAR.Person[slot] or nil
  if not target or target['死亡']==true or target['我方']==u['我方'] then
   DrawStrBoxWaitKey('请选择敌方目标；本次未耗用暗器或体力。')
   return 0
  end
  local pid=u['人物编号']
  if (person(pid)['体力'] or 0)<T.stamina then
   DrawStrBoxWaitKey('气力不继，手上没准头，这一件暗器发不出去。')
   return 0
  end
  local kind,rate,friendly=spread(pid,thingid)
  LOG={shots=0,hit=0,miss=0,hurt=0,dose=0,spent=0,kills=0}
  RATE=1
  local ok,result=pcall(sourceExecSub,x1,y1,flag,thingid)
  RATE=1
  if not ok then LOG=nil;error(result,0) end
  if result~=1 then LOG=nil;return result end
  LOG.spent=1
  -- 外圈：爆炸不分敌我，手法只打敌人且每人各耗一枚。
  if kind~='single' then
   local slot=GetWarMap(x1,y1,2)
   local centre=(slot and slot>=0) and WAR.Person[slot] or nil
   if centre then
    local side=u['我方']
    RATE=rate
    for _,tu in ipairs(neighbours(x1,y1,kind=='fan')) do
     local go=(kind=='blast') or (tu['我方']~=side)
     if go and kind=='fan' then
      if bagCount(thingid)<1 then go=false end
     end
     if go then
      if kind=='fan' then instruct_32(thingid,-1);LOG.spent=LOG.spent+1 end
      War_AnqiHurt(pid,tu['人物编号'],thingid)
      AddPersonAttrib(pid,'体力',-T.splashStamina)
     end
    end
    RATE=1
   end
  end
  AddPersonAttrib(pid,'体力',-T.stamina)
  local gain=math.floor(LOG.hurt/T.hurtExpDiv)+math.floor(LOG.dose/T.doseExpDiv)
  if gain>0 then u['经验']=(u['经验'] or 0)+gain end
  local words
  if LOG.hit==0 then words='暗器尽数落空。'
  else
   words=string.format('%s：%d 发中 %d，共伤 %d',JY.Thing[thingid]['名称'],LOG.shots,LOG.hit,LOG.hurt)
   if LOG.dose>0 then words=words..'，另上毒 '..LOG.dose end
   if LOG.spent>1 then words=words..'（耗 '..LOG.spent..' 枚）' end
   words=words..'。'
  end
  DrawStrBoxWaitKey(words)
  LOG=nil
  return result
 end

 -- 原著核对后的底表修正。**`JY.Person` 的字段直写存档字节**，所以这里只在一场战斗之内临时套用、
 -- 出战无条件还原（与 poisonmed 临时改写攻防是同一个做法），绝不落盘：旧档规范化前后逐字节不变。
 -- 依据逐条见 editorial/暗器线与西毒156.md 一.4；抗毒 89 一个字不动（它卡在用毒组的免疫 90 与退毒 70 之间）。
 local CANON={
  -- 欧阳锋 60：杖头活蛇毒死过杨康与南希仁，「攻击带毒 0」与西毒不符（丁春秋 90、阿紫 93、游坦之 94）；
  -- 解毒 60 让他到用毒组的敌方逼毒门槛（>=40）之上，玩家的毒会被他逼掉一截；
  -- 用毒 75 与蓝凤凰同档——他能创化尸粉，但不及程灵素 86／王难姑 82 那样的药理专门家。
  [60]={['攻击带毒']=85,['解毒能力']=60,['用毒能力']=75},
  -- 欧阳克 61：白驼山驱蛇的人不可能不服解药，「抗毒 0」说不通；他的蛇阵也该让他出手带毒。
  -- 给的是叔父的一半上下（抗毒 40 < 欧阳锋 89，攻击带毒 30 < 85），少主不该与西毒齐平。
  [61]={['抗毒能力']=40,['攻击带毒']=30},
 }
 local saved=nil
 local function canonOn()
  if saved or not T.enabled or not T.canon then return end
  saved={}
  for pid,row in pairs(CANON) do
   local p=JY.Person[pid]
   if p then
    local keep={}
    for k,v in pairs(row) do keep[k]=p[k];p[k]=v end
    saved[pid]=keep
   end
  end
 end
 local function canonOff()
  if not saved then return end
  for pid,keep in pairs(saved) do
   local p=JY.Person[pid]
   if p then for k,v in pairs(keep) do p[k]=v end end
  end
  saved=nil
 end

 -- 纯查询：这一条修正现在是什么状态（原值／战斗内值／有没有正在套用）。只读。
 BrowserThrownCanon=function(pid)
  local row=CANON[pid]
  if not row then return nil end
  local p=JY.Person[pid];if not p then return nil end
  local out={pid=pid,name=p['姓名'],active=saved~=nil and saved[pid]~=nil,fields={}}
  for k,v in pairs(row) do
   out.fields[k]={canon=v,now=p[k],base=(saved and saved[pid] and saved[pid][k]) or p[k]}
  end
  return out
 end

 -- 一场战斗进出各清一次：比例、战报与底表修正都不该跨场活着。
 local sourceWarMain=WarMain
 WarMain=function(...)
  RATE=1;LOG=nil
  canonOn()
  local out=table.pack(pcall(sourceWarMain,...))
  canonOff()
  RATE=1;LOG=nil
  if not out[1] then error(out[2],0) end
  return table.unpack(out,2,out.n)
 end
end
