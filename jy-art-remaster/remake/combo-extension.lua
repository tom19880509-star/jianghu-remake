-- 156 · 组合层：同源与互补是两套不同收益，左右互搏的手部占用、真双持最小切片、
-- 玉女素心合璧都挂在这里。只包裹既有全局，不改原版脚本、不新增原事件号。
-- 三条硬性约束：
--  1) 同源给的是资源（第二招退内力），互补／合璧给的是威力，两者不同时计；
--  2) 一招上的组合增威取最强一项、上限 +10%，绝不层层相乘，所以连击、暴击、
--     本命绝学都不会被组合层再乘一遍，组合永远是选择而非必选；
--  3) 左右互搏的资格与招式门槛只写一份，玩家手动、R 记忆和 AI 走同一套。
-- 所有新全局都在本闭包（加载期）赋值；跨层一律 rawget(_G,...) 探测。
;(function()
 local CAP=1.10        -- 组合增威上限：任何一招最多 +10%
 local COMPLEMENT=1.08 -- 互补／合璧单项 +8%（择一，不相乘）
 local HAND=.9         -- 手部冲突：只有一件兵器却两招都要兵器，第二招 -10%
 local REFUND=.25      -- 同源：第二招退还两成五内力（下限 1 点）
 local TWO_HANDED={[106]=true,[117]=true} -- 玄铁剑、屠龙刀只能独持
 local plan=nil        -- 当前左右互搏动作的两招计划；战斗结束或异常一律清空

 -- 同源＝同一渊源的招式衔接。只收原著渊源明确的几支，宁缺毋滥。
 local lineage={
  [2]='武当',[20]='武当',[41]='武当',[58]='武当',
  [3]='少林',[59]='少林',
  [19]='大理段氏',[30]='大理段氏',
  [26]='葵花辟邪',[60]='葵花辟邪',[93]='葵花辟邪',
  [35]='泰山',[45]='泰山',
  [36]='衡山',[46]='衡山',
  [25]='丐帮',[87]='丐帮',
  [10]='逍遥',[15]='逍遥',[50]='逍遥',[56]='逍遥',
 }
 -- 互补＝不同渊源、原著明写互相补短的两门。两条都可逐字追到原著场景。
 local complement={
  ['21:25']='空明拳以柔、降龙掌以刚，郭靖左右互搏正是此配',
  ['39:49']='全真剑法与玉女心法本为合璧，一人分使即玉女素心剑',
 }
 local function key(a,b) if a>b then a,b=b,a end;return a..':'..b end
 local function probe(name) return rawget(_G,name) end
 local function on()
  local f=probe('BrowserBalanceEnabled');return f~=nil and f()==true
 end

 -- ---- 左右互搏：唯一一份资格与招式门槛 ----------------------------------
 -- 人物资格。杨过原著断右臂，永不开放；其余沿用 growth 的书 91 条件行。
 local function actorOk(pid)
  local p=JY.Person[pid]
  if not p or pid==58 then return false end
  if p['左右互搏']~=1 then return false end
  if (p['攻击带毒'] or 0)>0 then return false end     -- 招式带毒时不宜分使两路
  if TWO_HANDED[p['武器']] then return false end       -- 沉重兵器不可分使
  if pid==0 then
   local req=probe('BrowserGrowthBookRequirements');req=req and req(0,91)
   if not req then return false end
   for _,row in ipairs(req) do if row.key=='dual' then return row.met==true end end
   return false
  end
  return pid==55 or pid==59 or pid==64
 end
 -- The equipment place remains visible after learning, even while a heavy
 -- main weapon temporarily makes the two-hand technique unavailable.
 BrowserOffhandSlot=function(pid)
  local p=JY.Person[pid]
  return on() and p~=nil and p['左右互搏']==1 and pid~=58 and (pid==0 or pid==55 or pid==59 or pid==64)
 end
 -- 招式门槛：真实六级以上、非吸内、非附毒、非整片范围，且兵器真的合用。
 local function artOk(pid,slot)
  if type(slot)~='number' or slot<1 or slot>10 then return false end
  local p=JY.Person[pid];local skill=p and p['武功'..slot]
  if not skill or skill<=0 or skill==57 then return false end -- 重剑剑法不分使
  if math.floor((p['武功等级'..slot] or 0)/100)+1<6 then return false end
  local B=probe('BrowserMartialBalance')
  local art=B and B.data and B.data.skills[skill];local w=JY.Wugong[skill]
  if not art or not w then return false end
  if art.damageType~=0 or (art.poison or 0)>0 then return false end
  local shape=w['攻击范围']
  if shape~=0 and shape~=1 and shape~=2 then return false end
  local info=probe('BrowserTechniqueInfo');info=info and info(pid,skill)
  if not info or not info.allowed then return false end
  if info.emptyHand then return true end
  return (info.required=='sword' or info.required=='blade' or info.required=='flute') and info.compatibility==1
 end

 -- ---- 真双持副手 --------------------------------------------------------
 -- The player explicitly reserves one owned, unassigned light weapon. Native
 -- 人物.武器 remains the sole stat-bearing weapon; offhand never stacks stats.
 local function owned(id)
  for i=1,(CC.MyThingNum or 0)do if JY.Base['物品'..i]==id then return JY.Base['物品数量'..i] or 0 end end
  return 0
 end
 local function canOffhand(pid,id)
  if not on() or not actorOk(pid) or type(id)~='number' or id<0 or TWO_HANDED[id] then return false end
  local p=JY.Person[pid];local main=p['武器'];local fam=probe('BrowserWeaponFamily')
  if main<0 or TWO_HANDED[main] or id==main or not fam then return false end
  local hand=fam(id);if hand~='sword' and hand~='blade' and hand~='flute' then return false end
  if fam(main)~=hand then return false end -- current two-pass rules use one weapon family
  local t=JY.Thing[id]
  if not t or t['类型']~=1 or t['装备类型']~=0 or (t['使用人'] or -1)>=0 then return false end
  local left=owned(id);local get=probe('browser_offhand_get')
  if get then for other=0,(JY.PersonNum or 0)-1 do
   if other~=pid and get(other)==id then left=left-1 end
  end end
  return left>0
 end
 BrowserOffhandCanEquip=canOffhand
 BrowserOffhandWeapon=function(pid)
  local get=probe('browser_offhand_get');local id=get and get(pid) or -1
  return canOffhand(pid,id) and id or -1
 end
 BrowserOffhandEquip=function(pid,id)
  local set=probe('browser_offhand_set');if not set or not JY.Person[pid] then return false end
  if id==-1 then set(pid,-1);return true end
  if not canOffhand(pid,id) then return false end
  set(pid,id);return true
 end
 local function offHand(pid,need)
  if not need or need=='' then return nil end
  local id=BrowserOffhandWeapon(pid);if id<0 then return nil end
  local fam=probe('BrowserWeaponFamily');local f=fam and fam(id)
  if f==need or (need=='flute' and f=='sword') or (need=='sword' and f=='flute') then return id end
  return nil
 end
 -- 两招各占一只手：一手兵器一手空手＝干净分工；两招都要兵器时必须真有第二件
 -- 兵器，否则就是一件兵器两手轮转，第二招折减。
 local function handPlan(pid,k1,k2)
  local info=probe('BrowserTechniqueInfo')
  local a=info and info(pid,k1);local b=info and info(pid,k2)
  if not a or not b then return {conflict=false} end
  if a.emptyHand and b.emptyHand then return {conflict=false,mode='双手空手'} end
  if a.emptyHand or b.emptyHand then return {conflict=false,mode='一手兵器、一手空手'} end
  local second=b.emptyHand and '' or b.required
  local off=offHand(pid,second)
  if off then return {conflict=false,mode='真双持',off=off,offName=JY.Thing[off]['名称']} end
  return {conflict=true,mode='一件兵器两手轮转'}
 end

 -- ---- 玉女素心：双人合璧 ------------------------------------------------
 -- 一人分使 39＋49 走互补表；两人并肩时相邻友军已习另一门即成合璧。
 local function mate(pid,skill)
  local other=skill==49 and 39 or skill==39 and 49 or nil
  if not other then return nil end
  local W=probe('WAR');if not W or not W.Person then return nil end
  local me=nil
  for i=0,(W.PersonNum or 0)-1 do local u=W.Person[i];if u and u['人物编号']==pid then me=u end end
  if not me then return nil end
  local info=probe('BrowserTechniqueInfo')
  for i=0,(W.PersonNum or 0)-1 do
   local u=W.Person[i]
   if u and u['死亡']~=true and u['我方']==me['我方'] and u['人物编号']~=pid then
    local d=math.abs((u['坐标X'] or 0)-(me['坐标X'] or 0))+math.abs((u['坐标Y'] or 0)-(me['坐标Y'] or 0))
    if d==1 then
     local q=JY.Person[u['人物编号']]
     for s=1,10 do
      if q and q['武功'..s]==other then
       local r=info and info(u['人物编号'],other)
       if not r or r.allowed then return u['人物编号'] end
      end
     end
    end
   end
  end
  return nil
 end

 -- ---- 对外查询 ----------------------------------------------------------
 -- 纯查询：不改任何状态。返回单一乘数，威力只在这里乘一次。
 BrowserComboInfo=function(pid,skill)
  if not on() or type(skill)~='number' or skill<=0 or not JY.Person[pid] then return nil end
  local bonus,note,partner=1,nil,nil
  if plan and plan.pid==pid then
   if skill==plan.skill1 then partner=plan.skill2 elseif skill==plan.skill2 then partner=plan.skill1 end
  end
  if partner and partner~=skill then
   local why=complement[key(skill,partner)]
   if why then bonus=COMPLEMENT;note='互补：'..why end
  end
  if bonus<COMPLEMENT and (skill==49 or skill==39) then
   local who=mate(pid,skill)
   if who then bonus=COMPLEMENT;note='玉女素心合璧：与'..(JY.Person[who]['姓名'] or '同伴')..'并肩' end
  end
  if bonus>CAP then bonus=CAP end
  local penalty=1
  if plan and plan.pid==pid and (plan.pass or 0)>=2 and plan.conflict then
   penalty=HAND;note=(note and note..'；' or '')..'手部冲突：只有一件兵器，两招轮转'
  end
  return {multiplier=bonus*penalty,bonus=bonus,penalty=penalty,note=note,partner=partner,
   lineage=lineage[skill],sameOrigin=partner~=nil and partner~=skill and lineage[skill]~=nil and lineage[skill]==lineage[partner]}
 end
 BrowserComboMultiplier=function(pid,skill)
  local r=BrowserComboInfo(pid,skill);return r and r.multiplier or 1
 end
 BrowserComboLineage=function(skill) return lineage[skill] end
 BrowserComboRules=function()
  return {cap=CAP,complement=COMPLEMENT,hand=HAND,refund=REFUND,lineage=lineage,pairs=complement}
 end
 -- 同一套门槛的公开入口：UI、R 记忆、AI 与测试都问这里。
 BrowserDualGate=function(pid,slot)
  if not on() then return false end
  if slot==nil then return actorOk(pid) end
  return actorOk(pid) and artOk(pid,slot)
 end
 BrowserDualWieldInfo=function(pid,slot1,slot2)
  local p=JY.Person[pid];if not p or not on() then return nil end
  if type(slot1)~='number' or type(slot2)~='number' then return nil end
  local k1,k2=p['武功'..slot1],p['武功'..slot2]
  if not k1 or not k2 or k1<=0 or k2<=0 then return nil end
  local h=handPlan(pid,k1,k2)
  return {mode=h.mode,conflict=h.conflict==true,off=h.off,offName=h.offName,
   sameOrigin=k1~=k2 and lineage[k1]~=nil and lineage[k1]==lineage[k2],
   complement=complement[key(k1,k2)]}
 end
 -- Only the second committed visual pass holds the reserved offhand. Native
 -- attack and item attributes still belong to the unchanged main weapon.
 BrowserDualVisualWeapon=function(pid,skill)
  if plan and plan.pid==pid and plan.pass==2 and plan.skill2==skill and plan.off then return plan.off end
  return nil
 end
 BrowserDualAimPass=function(pid)
  return plan and plan.pid==pid and plan.pass or 0
 end

 -- ---- 动作包裹 ----------------------------------------------------------
 local function refund(d)
  if not d or d.skill1==d.skill2 then return end          -- 同招再出不算衔接
  local a,b=lineage[d.skill1],lineage[d.skill2]
  if a==nil or a~=b then return end
  local p=JY.Person[d.pid];local w=JY.Wugong[d.skill2]
  if not p or not w then return end
  local level=math.min(10,math.max(1,math.floor((p['武功等级'..d.slot2] or 0)/100)+1))
  local back=math.max(1,math.floor(REFUND*math.floor((level+1)/2)*w['消耗内力点数']))
  AddPersonAttrib(d.pid,'内力',back)
 end
 local run=probe('BrowserRunDualAction')
 if run then
  BrowserRunDualAction=function(id,slot1,slot2)
   local W=probe('WAR');local u=W and W.Person and W.Person[id]
   local pid=u and u['人物编号'];local p=pid and JY.Person[pid]
   local previous=plan
   if p and type(slot1)=='number' and type(slot2)=='number' and slot1>=1 and slot1<=10 and slot2>=1 and slot2<=10 then
    local k1,k2=p['武功'..slot1],p['武功'..slot2]
    local hand=handPlan(pid,k1,k2)
    plan={pid=pid,slot1=slot1,slot2=slot2,skill1=k1,skill2=k2,pass=0,conflict=hand.conflict==true,off=hand.off}
   else plan=nil end
   local r=table.pack(pcall(run,id,slot1,slot2))
   local done=plan;plan=previous
   if not r[1] then error(r[2],0) end
   if done and r[3]==2 then refund(done) end             -- 两招都真的打出才退内力
   return table.unpack(r,2,r.n)
  end
 end
 -- AI 与玩家同一套门槛：原生“左右互搏”标志在任何不合条件的出手上都要落下，
 -- 无论这一击来自敌方 AI、我方自动战斗还是手动点击。
 local fight=War_Fight_Sub
 War_Fight_Sub=function(id,slot,...)
  local W=probe('WAR');local u=W and W.Person and W.Person[id]
  local pid=u and u['人物编号'];local p=pid and JY.Person[pid]
  local seg=probe('BrowserDualSegmentActive');local inside=seg and seg()==pid
  if inside and plan and plan.pid==pid then plan.pass=(plan.pass or 0)+1 end
  if on() and p and not inside and p['左右互搏']==1
     and not (slot~=11 and actorOk(pid) and artOk(pid,slot)) then
   local kept=p['左右互搏'];p['左右互搏']=0
   local r=table.pack(pcall(fight,id,slot,...));p['左右互搏']=kept
   if not r[1] then error(r[2],0) end
   return table.unpack(r,2,r.n)
  end
  return fight(id,slot,...)
 end
 local war=WarMain
 WarMain=function(...)
  plan=nil
  local r=table.pack(pcall(war,...));plan=nil
  if not r[1] then error(r[2],0) end
  return table.unpack(r,2,r.n)
 end
end)()
