-- One temporary action scope: cancellation/errors restore MP costs and native
-- mutual flag. No persistent character or skill mutation during a battle.
do
 local B=BrowserMartialBalance
 local scopeDepth=0;local costs=nil
 local function enterCosts()
  scopeDepth=scopeDepth+1;if scopeDepth>1 or not B.enabled then return end
  local u=WAR and WAR.Person and WAR.Person[WAR.CurID]
  local cfg=u and BrowserGrowthBattleConfig and BrowserGrowthBattleConfig(u['人物编号'])
  local reduction=math.floor(BrowserHeartRank(cfg,40)/5)
  local dragon=u and BrowserGrowthSkillRank and BrowserGrowthSkillRank(u['人物编号'],18) or 0
  if reduction<=0 and dragon<=10 then return end
  costs={}
  for id,art in pairs(B.data.skills)do
   local w=JY.Wugong[id]
   if w and art.damageType==0 and w['消耗内力点数']>2 then
    -- 157：龙象末三层耗内 +2/层（与 growth-extension.lua:419-423 的人物页同一口径；两处必须一起改，
    -- 否则人物页写「一击 115」而真打只扣 100）。威力 612→900 是 +47%，耗内只 +1/层会变成「越练越划算」。
    costs[id]=w['消耗内力点数'];w['消耗内力点数']=math.max(2,costs[id]-reduction+(id==18 and math.max(0,dragon-10)*2 or 0))
   end
  end
 end
 local function leaveCosts()
  scopeDepth=math.max(0,scopeDepth-1);if scopeDepth>0 then return end
  if costs then for id,v in pairs(costs)do JY.Wugong[id]['消耗内力点数']=v end;costs=nil end
 end
 local function call(fn,...)
  local args=table.pack(...)
  local r=table.pack(pcall(function()enterCosts();return fn(table.unpack(args,1,args.n))end));leaveCosts()
  if not r[1]then error(r[2],0)end;return table.unpack(r,2,r.n)
 end
 local manual,auto,fight=War_Manual,War_Auto,War_Fight_Sub
 War_Manual=function(...)return call(manual,...)end
 War_Auto=function(...)return call(auto,...)end
 War_Fight_Sub=function(id,slot,...)
  local args=table.pack(...)
  if not B.enabled then return fight(id,slot,...)end
  local unit=WAR.Person[id];local p=JY.Person[unit['人物编号']];local pid=unit['人物编号']
  local skill=slot==11 and 1 or p['武功'..slot];local w=skill and JY.Wugong[skill]
  local oldFlag=p['左右互搏'];local oldContext=B.combat;local ordinaryCost,ordinaryPower
  local r=table.pack(pcall(function()
  enterCosts()
  if slot==11 then ordinaryCost=JY.Wugong[1]['消耗内力点数'];ordinaryPower=JY.Wugong[1]['攻击力1'];JY.Wugong[1]['消耗内力点数']=0;JY.Wugong[1]['攻击力1']=3 end
  local rank=slot==11 and 1 or math.min(10,math.floor((p['武功等级'..slot] or 0)/100)+1)
  -- The source adds proficiency before charging, so budget for a possible
  -- rank boundary on either strike, not merely the displayed rank.
  local rawLevel=slot==11 and 0 or p['武功等级'..slot] or 0
  local chargeRank=math.min(10,math.floor((rawLevel+6)/100)+1)
  local doubleCost=w and 2*math.floor((chargeRank+1)/2)*w['消耗内力点数'] or math.huge
  local dual
  if B.dualSegment and B.dualSegment.pid==pid then
   -- Planned dual-art segment: one real call per art, so suppress the
   -- native mutual-flag repeat but still grant the balanced 75% hit.
   p['左右互搏']=0
   dual=true
  else
   -- A manual click (ally, no aimed x/y, not AI autofight) never gets the
   -- legacy native double-hit; that path stays for AI/explicit x,y callers.
   -- Manual users reach a genuine dual output only via the mutual menu,
   -- which sets B.dualSegment before calling in here.
   local manualSingle=unit['我方']==true and args[1]==nil and args[2]==nil and WAR.AutoFight~=1
   dual=not manualSingle and oldFlag==1 and slot~=11 and w and w['伤害类型']==0 and w['攻击范围']~=3 and p['内力']>=doubleCost
   if not dual then p['左右互搏']=0 end
  end
  B.combat={pid=pid,dual=dual}
  return fight(id,slot,table.unpack(args,1,args.n))
  end))
  p['左右互搏']=oldFlag;B.combat=oldContext
  if ordinaryCost~=nil then JY.Wugong[1]['消耗内力点数']=ordinaryCost;JY.Wugong[1]['攻击力1']=ordinaryPower end
  leaveCosts()
  if not r[1]then error(r[2],0)end
  -- Skip the native per-call turn bump while a helper-driven dual segment
  -- for this actor is active; the helper below owns turn accounting for
  -- both of its passes so Zixia-style power never grows mid-action.
  if r[2]==1 and not(B.dualSegment and B.dualSegment.pid==pid) then
   B.turns[pid]=(B.turns[pid] or 0)+1
  end
  return table.unpack(r,2,r.n)
 end

 -- Two sequential real War_Fight_Sub passes sharing one carried weapon,
 -- gated by BrowserTechniqueInfo. Wired to the skill menu's 左右互搏 row
 -- and to R-repeat via BrowserRepeatSlot/BrowserRepeatInfo in ui-extension.lua.
 local function dualSlotOk(pid,p,slot)
  if slot==11 then return false end -- no ordinary/fist pass here
  local skill=p['武功'..slot]
  if not skill or skill<=0 or skill==57 then return false end -- exclude empty slot / heavy-sword art57
  local level=p['武功等级'..slot] or 0
  if math.floor(level/100)+1<6 then return false end -- real learned rank must be >=6
  local art=B.data.skills[skill];local w=JY.Wugong[skill]
  if not art or not w then return false end
  if art.damageType~=0 or (art.poison or 0)>0 then return false end -- no poison/drain
  local shape=w['攻击范围']
  if shape~=0 and shape~=1 and shape~=2 then return false end -- no block/AoE type3
  local info=BrowserTechniqueInfo and BrowserTechniqueInfo(pid,skill)
  if not info or not info.allowed then return false end
  if not(info.emptyHand or((info.required=='sword' or info.required=='blade' or info.required=='flute')and info.compatibility==1))then
   return false -- no staff/whip, no heavy/mismatched substitute weapon
  end
  return true,skill
 end
 local function dualBaseEligible(id)
  if not B.enabled then return nil end
  if id~=WAR.CurID then return nil end -- only the unit currently acting
  local unit=WAR and WAR.Person and WAR.Person[id]
  if not unit or unit['我方']~=true or unit['死亡']==true then return nil end
  local pid=unit['人物编号']
  if pid==58 then return nil end -- never Yang58
  -- WAR.Person carries no 血 field; liveness lives on JY.Person.生命.
  local p=JY.Person[pid]
  if not p or (p['生命'] or 0)<=0 then return nil end
  if p['左右互搏']~=1 then return nil end -- every eligible actor needs this
  -- Poison/two-handed weapons are visible-but-disabled reasons, not hidden rows: the
  -- person still has the split-attention talent, just currently blocked.
  local blockReason=nil
  if (p['攻击带毒'] or 0)>0 then blockReason='招式带毒时不宜分使两路武功'
  elseif p['武器']==106 or p['武器']==117 then blockReason='所持兵器不合，不可运使左右互搏' end
  if pid==0 then
   -- Only the generic hero checks the dual-book requirement row.
   local req=BrowserGrowthBookRequirements and BrowserGrowthBookRequirements(0,91)
   local met=false
   if req then for _,row in ipairs(req)do if row.key=='dual' and row.met then met=true end end end
   if not met then return nil end
  elseif not(pid==55 or pid==59 or pid==64) then
   return nil -- named users 55/59/64 need no hero0 book row; nobody else qualifies
  end
  return pid,p,unit,blockReason
 end
 -- Live-state eligibility, re-derived on every call (including the second
 -- pass) so nothing cached ever substitutes for a fresh check.
 local function dualEligible(id,firstSlot,secondSlot)
  local pid,p,unit,blockReason=dualBaseEligible(id)
  if not pid or blockReason then return nil end
  local ok1,skill1=dualSlotOk(pid,p,firstSlot)
  local ok2,skill2=dualSlotOk(pid,p,secondSlot)
  if not ok1 or not ok2 then return nil end
  return pid,p,unit,skill1,skill2
 end
 -- Read-only query: reports which actor (if any) is mid dual-segment.
 -- Never mutates; UI uses it only to avoid double-recording one pass as
 -- two separate 'last used' entries.
 function BrowserDualSegmentActive()
  return B.dualSegment and B.dualSegment.pid or nil
 end
 local function conservativeCost(p,slot,skill)
  local w=JY.Wugong[skill]
  local level=p['武功等级'..slot] or 0
  local rank=math.min(10,math.floor((level+6)/100)+1) -- pre-charge a possible rank bump
  return math.floor((rank+1)/2)*w['消耗内力点数']
 end
 local function validSlot(s)
  return type(s)=='number' and s==math.floor(s) and s>=1 and s<=10
 end
 -- Pure query: same conservativeCost/dualSlotOk gates as the real attack
 -- path, returns ok,cost,reason. Never mutates, never attacks.
 function BrowserDualPairCheck(id,slot1,slot2)
  local pid,p,unit,blockReason=dualBaseEligible(id)
  if not pid then return false,nil,'不可左右互搏' end
  if blockReason then return false,nil,blockReason end
  if not validSlot(slot1) or not validSlot(slot2) then return false,nil,'招式不合' end
  local ok1,skill1=dualSlotOk(pid,p,slot1)
  local ok2,skill2=dualSlotOk(pid,p,slot2)
  if not ok1 or not ok2 then return false,nil,'招式不合' end
  local cost=conservativeCost(p,slot1,skill1)+conservativeCost(p,slot2,skill2)
  if (p['体力'] or 0)<13 then return false,cost,'体力不足' end
  if (p['内力'] or 0)<cost then return false,cost,'内力不足' end
  return true,cost,nil
 end
 -- Pure query for the skill menu: nil hides the row entirely for a
 -- non-learner (no hidden aptitude hints). Otherwise reports per-slot
 -- eligibility for the two art pickers plus an overall disabled reason.
 function BrowserDualMenuInfo(id)
  local pid,p,unit,blockReason=dualBaseEligible(id)
  if not pid then return nil end
  if blockReason then
   return {pid=pid,mp=p['内力'],stamina=p['体力'],slots={},enabled=false,reason=blockReason}
  end
  local slots={};local any=false
  for i=1,10 do
   local ok=dualSlotOk(pid,p,i)
   slots[i]=ok or false
   if ok then any=true end
  end
  local reason=nil
  if not any then reason='未有可用的六级以上招式'
  elseif (p['体力'] or 0)<13 then reason='体力不足'
  else
   local affordable=false
   for i=1,10 do
    if slots[i] then
     for j=1,10 do
      if slots[j] then
       local ok=BrowserDualPairCheck(id,i,j)
       if ok then affordable=true;break end
      end
     end
    end
    if affordable then break end
   end
   if not affordable then reason='内力不足' end
  end
  return {pid=pid,mp=p['内力'],stamina=p['体力'],slots=slots,enabled=(reason==nil),reason=reason}
 end
 -- Reachable via the skill menu's 左右互搏 row and R-repeat (ui-extension.lua).
 function BrowserRunDualAction(id,firstSlot,secondSlot)
  if B.dualSegment then return 0,0 end -- reject nested/reentrant helper calls
  if not validSlot(firstSlot) or not validSlot(secondSlot) then return 0,0 end
  local prevSegment=B.dualSegment -- always nil here, but preserved on principle
  local pid,p,unit,skill1,skill2=dualEligible(id,firstSlot,secondSlot)
  if not pid then return 0,0 end
  if (p['体力'] or 0)<13 then return 0,0 end -- two passes, each source gate ~3
  -- Reserve BOTH conservative MP costs before the first attack is thrown,
  -- not merely the first art's cost.
  local cost1=conservativeCost(p,firstSlot,skill1)
  local cost2=conservativeCost(p,secondSlot,skill2)
  if (p['内力'] or 0)<cost1+cost2 then return 0,0 end
  local before=B.turns[pid] or 0
  local firstSucceeded=false
  local passes=0
  local ok,result=pcall(function()
   B.dualSegment={pid=pid}
   local r1=War_Fight_Sub(id,firstSlot,nil,nil) -- manual target, not guessed x/y
   B.dualSegment=prevSegment
   if r1~=1 then return 0 end -- canceled: no cost, no turn, no state change
   firstSucceeded=true;passes=1
   -- Revalidate only the second slot before the second pass: person,
   -- eligibility, living enemies and remaining resource. Revalidating the
   -- first slot again is unnecessary; passing the second slot in both
   -- positions checks exactly the second art's live eligibility.
   local pid2,p2,unit2,_,liveSkill2=dualEligible(id,secondSlot,secondSlot)
   local enemyAlive=false
   if pid2 then
    for i=0,(WAR.PersonNum or 0)-1 do
     local e=WAR.Person[i]
     if e and e['我方']~=unit['我方'] and e['死亡']~=true then
      local ep=JY.Person[e['人物编号']]
      if ep and (ep['生命'] or 0)>0 then enemyAlive=true break end
     end
    end
   end
   if not pid2 or not enemyAlive or (p2['体力'] or 0)<10
      or (p2['内力'] or 0)<conservativeCost(p2,secondSlot,liveSkill2) then
    return 1 -- first pass stands; no dead-body/underfunded second pass
   end
   B.dualSegment={pid=pid}
   local r2=War_Fight_Sub(id,secondSlot,nil,nil)
   B.dualSegment=prevSegment
   if r2==1 then passes=2 end
   return 1
  end)
  B.dualSegment=prevSegment
  -- Both passes must observe the pre-action turn count (Zixia-style power
  -- never grows mid-action); the single increment happens only once, after
  -- the whole action is decided, win or lose.
  if not ok then
   if firstSucceeded then B.turns[pid]=before+1 end
   error(result,0) -- first throws/cancels never count; second throwing still counts
  end
  if firstSucceeded then B.turns[pid]=before+1 end
  return result,passes
 end
 local sourceLife=War_WugongHurtLife
 War_WugongHurtLife=function(target,skill,rank)
  if B.dualSegment then
   local e=WAR.Person[target]
   local ep=e and JY.Person[e['人物编号']]
   if not e or e['死亡']==true or not ep or (ep['生命'] or 0)<=0 then
    return 0 -- no dead-body bonus damage/XP during a helper segment
   end
  end
  return sourceLife(target,skill,rank) -- weapon commit above still runs
 end

 -- 155 enemy life-potion budget (see balance-core). Counted when the source
 -- AI really eats one; refusal falls through to its doctor/attack choices.
 local sourceThinkDrug,sourceEatDrug=War_ThinkDrug,War_AutoEatDrug
 local function cappedEnemy(flag)
  local u=WAR and WAR.Person and WAR.Person[WAR.CurID]
  if not B.enabled or flag~=2 or B.enemyHealBudget()<=0 or not u or u['我方']==true then return nil end
  return u['人物编号']
 end
 if sourceThinkDrug and sourceEatDrug then
  War_ThinkDrug=function(flag)
   local pid=cappedEnemy(flag)
   if pid and (B.healUses[pid] or 0)>=B.enemyHealBudget() then return -1 end
   return sourceThinkDrug(flag)
  end
  War_AutoEatDrug=function(flag)
   local pid=cappedEnemy(flag);local before=pid and JY.Person[pid]['生命']
   local r=table.pack(sourceEatDrug(flag))
   if pid and JY.Person[pid]['生命']>before then B.healUses[pid]=(B.healUses[pid] or 0)+1 end
   return table.unpack(r,1,r.n)
  end
 end
 -- 155d: 自动·允许用药 in a long battle (实玩: the protagonist alone against 游坦之 drank 16 玉灵散). Source runs
 -- (qa/pacing155-combat155d, part drug) showed the potions were really needed under Auto: refusing more than N in one
 -- battle dropped that forced duel (败=死) from 100% to 5-53% at N=4-8, and taking them only below 35% health saved
 -- about one bottle in eighteen. What wastes them is the weak art (松风十级 23 per hit; 达摩剑法六级: 3 bottles, 11 rounds).
 -- So nothing is refused here: the first time in a battle that one of our units under Auto has taken allyHealHandBack
 -- high-grade life medicines (加生命 >= allyHealGrade: 玉灵散 and above, the 名医 stock), Auto is handed back to manual
 -- once, exactly as the 接回手动 button does, with a notice; the player may choose Auto again. Counted from the bag, per
 -- battle, nothing stored. A value, not a source figure; nil switches it off.
 B.allyHealHandBack=8;B.allyHealGrade=150;B.allyHeals={};B.allyHealNoticed=false
 local function highGradeStock()
  local n=0
  for i=1,CC.MyThingNum do
   local id=JY.Base['物品'..i];local t=id and id>=0 and JY.Thing[id]
   if t and t['类型']==3 and (t['加生命'] or 0)>=B.allyHealGrade then n=n+(JY.Base['物品数量'..i] or 0) end
  end
  return n
 end
 local allyEat=War_AutoEatDrug
 if allyEat then
  War_AutoEatDrug=function(flag)
   local u=WAR and WAR.Person and WAR.Person[WAR.CurID]
   if not B.enabled or not B.allyHealHandBack or flag~=2 or WAR.AutoFight~=1 or not u or u['我方']~=true then return allyEat(flag) end
   local before=highGradeStock()
   local r=table.pack(allyEat(flag))
   if highGradeStock()<before then
    local pid=u['人物编号'];B.allyHeals[pid]=(B.allyHeals[pid] or 0)+1
    if B.allyHeals[pid]>=B.allyHealHandBack and not B.allyHealNoticed and WAR.AutoFight==1 then
     B.allyHealNoticed=true;WAR.AutoFight=0
     DrawStrBoxWaitKey(string.format('%s本场已服%d剂上等伤药。自动战斗暂停，交回手动。',JY.Person[pid]['姓名'],B.allyHeals[pid]),C_WHITE,CC.DefaultFont)
    end
   end
   return table.unpack(r,1,r.n)
  end
 end
 -- 155c: allied auto-battle art choice. The source pick is random, weighted by
 -- (attack*3+power)/2, and drops only arts under half of the best such score; with
 -- the compressed 154 tables attack*3 dominates, so e.g. a rank-two 野球拳 (reach 1)
 -- stays in rotation beside 松风剑法十级 (reach 5) and walks its user to the front,
 -- where the source enemy AI (nearest target) focuses him. Under Auto only, an ally
 -- whose pick is worth less than allyArtFloor x the power of his strongest usable
 -- art takes that art instead. Enemies, manual turns and drain picks keep the source choice.
 -- A value, not a source figure (qa/pacing155-hero-exp: 五岳20人 war56 auto win
 -- 45% -> 97% at .75, 78% at .5); nil restores the source pick exactly.
 B.allyArtFloor=.75
 -- 157 A1 重排权重 (editorial/选招权重盲区157.md 第六节第 1 步). The source picker weighs an art by
 -- (attack*3 + 裸威力[名义重数])/2 and never sees the eleven multipliers this build puts on a real strike
 -- (本命亲和, 根骨, 兵器适配, 重剑逐招, CC.ExtraOffense, 组合层, 内力降重, 一周目 plainTenth, 九阴/紫霞,
 -- 胡家刀法, 龙象超十重); the weight and the real output can disagree by up to 53.6%, and CC.ExtraOffense is
 -- dead code in the source (jymain.lua:6393-6399 computes extranum and never uses it) while being the first
 -- term of the real fightnum. Rather than re-rank afterwards, let the source compute the right number itself:
 -- for the duration of that one call every damage art's power cell becomes P' = 2F - 3A, so the source's own
 -- (3A+P')/2 IS F, the real single-strike contribution. Its max/2 cut, its 攻击范围 term and its one Rnd draw
 -- stay exactly as they are; only the number they rank by changes.
 --   F = CC.ExtraOffense(手持兵器, 招) + BrowserTechniquePower(B.damage(..))/2   (combat-extension.lua:47-61)
 -- Three things this must get right, each with a real failure behind it:
 --  · F is computed at the rank actually thrown once MP is charged (combat-extension.lua:27-33) but written
 --    into the NOMINAL rank's cell, because that is the cell jymain.lua:6347-6348 reads. 79/80 廚師 七傷拳 is
 --    名义六重 / 实际四重, -36%: write the wrong cell and that case is not fixed at all.
 --  · balance-core install() replaces covered rows with plain Lua tables, where a write never reaches a save.
 --    Uncovered rows, and every row under install(false) (a player loading a source save with no growth state,
 --    growth-extension.lua:40-47), are still the jymain.lua:1651-1666 byte proxy, where the same write changes
 --    the save. Hence the B.enabled early return AND the per-cell rawget gate.
 --  · Restore newest first: the same art in two slots at the same rank saves the already-baked value the
 --    second time round, so a forward restore would leave it behind.
 -- Not a new mechanism: balance-combat.lua:25-29, :40-41/:67 and mastery-combat.lua:67-105 are the same
 -- enter -> pcall -> leave -> error(msg,0) shape. B.aiWeightBake=nil/false restores the 156 weights exactly.
 B.aiWeightBake=true
 local bakeSaved=nil
 -- Native damage reduces the effective rank when current MP cannot power the
 -- learned rank. Use that same rank in BOTH passes of the allied picker;
 -- otherwise its final preference can undo the resource-aware first pass.
 local function affordableRank(p,slot,w)
  local nominal=math.floor((p['武功等级'..slot] or 0)/100)+1
  local rank=math.min(10,nominal)
  while rank>1 and math.floor((rank+1)/2)*w['消耗内力点数']>p['内力'] do rank=rank-1 end
  return rank,nominal
 end
 -- Returns F itself (not the baked cell): F = CC.ExtraOffense + BrowserTechniquePower(B.damage(..))/2,
 -- at the rank actually thrown once MP is charged, plus the NOMINAL rank's cell name to write it into.
 -- bakeRun turns it into P' = 2F - 3A; situSelect below uses the same F as its damage term, so the
 -- two readers of "real single-strike output" can never drift apart.
 local function fightValue(pid,p,slot,id,w)
  local rank,nominal=affordableRank(p,slot,w)
  local power=w['攻击力'..rank]
  if type(power)~='number' then return nil end
  power=B.damage(pid,-1,id,rank,power)
  if BrowserTechniquePower then power=BrowserTechniquePower(pid,id,power)end
  local weapon=BrowserHeldWeapon and BrowserHeldWeapon(pid) or p['武器']
  local extra=0
  for _,v in ipairs(CC.ExtraOffense)do if v[1]==weapon and v[2]==id then extra=v[3];break end end
  return extra+power/2,'攻击力'..nominal
 end
 -- bakeRun(nil) is the leave step on its own, so the restore loop is written exactly once and WarMain
 -- below can take back a window that was suspended and never resumed.
 local function bakeRun(fn,...)
  if fn==nil then
   if bakeSaved then for i=#bakeSaved,1,-1 do local s=bakeSaved[i];s[1][s[2]]=s[3]end;bakeSaved=nil end
   return
  end
  local u=WAR and WAR.Person and WAR.CurID and WAR.Person[WAR.CurID]
  local p=u and JY.Person[u['人物编号']]
  if not B.enabled or not B.aiWeightBake or not p then return fn(...)end
  local pid=u['人物编号'];local saved={};bakeSaved=saved
  for i=1,10 do
   local id=p['武功'..i]
   if not id or id<=0 then break end
   local w=JY.Wugong[id]
   -- The same three gates the source applies before it reads a power cell (jymain.lua:6340-6348):
   -- a damage art whose one segment is affordable. Drains keep their fixed 10 and are never touched.
   if w and w['伤害类型']==0 and w['消耗内力点数']<=p['内力'] then
    local f,cell=fightValue(pid,p,i,id,w)
    if f and rawget(w,cell)~=nil then saved[#saved+1]={w,cell,rawget(w,cell)};w[cell]=2*f-3*p['攻击力'] end
   end
  end
  local r=table.pack(pcall(fn,...))
  bakeRun()
  if not r[1]then error(r[2],0)end
  return table.unpack(r,2,r.n)
 end
 -- 157 「按局面选招」· 第 0 批的选招器一半 (editorial/多武学分工157.md 第二节 2.1、第七节第 0 批)
 -- A1 (above) fixed WHICH NUMBER the source picker ranks by, but left two blind spots untouched, both of
 -- them exactly the two things Tom asked players to have to compute (2026-09-21 「精心计算内力和距离以及
 -- 尽可能让群伤多打几个人」):
 --  · 距离: jymain.lua:6390 drops an art under half the best score and jymain.lua:6401 then adds a reach
 --    term to the already-zeroed ones, but NOTHING asks whether this art can touch anybody THIS turn. An
 --    art picked out of reach walks its user forward and wastes the turn (岳不群 辟邪 51.5% wasted).
 --  · 群伤: the source's crowd term is 攻击范围 x factor x 杀伤范围 x 20 — paper shape, not the enemies
 --    actually standing in it.
 -- So the score becomes S = E x G (the design's third factor V — 用处价值: 奇袭/底牌/制人/守御 — is the
 -- EFFECT half of batch 0 and is NOT built here, i.e. V == 1 throughout):
 --   E = expected damage of one strike on the foe in front = max(5.5, (F + 1.5*攻击力 + 装备加攻 − 3*D_T)*2/3),
 --       then max'd with B.glance — the same main term combat-extension.lua:47-92 really settles with, and
 --       F is fightValue above, i.e. the rank left AFTER inner force is charged. Short on MP, a heavy art
 --       drops a rank or falls out of the candidate list entirely, and a cheap one outscores it.
 --   G = how many foes this art can reach this turn: 1+λ(H−1) when it reaches, 0 when it does not; when no
 --       art reaches anybody, G ranks by (移动范围+杀伤范围) so the longest reach walks in.
 -- Replaces the source max/2 cut with a θ cut on S and the reach term with H; keeps the source's single draw.
 -- Reads only; writes no JY.Person/JY.Wugong field, so a save cannot be touched on this path (the A1 bake
 -- window never even opens here). B.situPick=false is the shipped A1 behaviour, bit for bit.
 B.situPick=false
 B.situ={theta=.5,allyTheta=.75,gamma=2,lambda=.8,floor=5.5}
 local function situGear(p,pid,field)
  local v=0
  local wp=BrowserHeldWeapon and BrowserHeldWeapon(pid) or p['武器']
  if wp and wp>=0 and JY.Thing[wp] then v=v+(JY.Thing[wp][field] or 0) end
  local ar=p['防具']
  if ar and ar>=0 and JY.Thing[ar] then v=v+(JY.Thing[ar][field] or 0) end
  return v
 end
 -- Fast path, and an exact one: when every candidate shares shape/move scope/kill scope they all get the
 -- same G whatever the board looks like, and G then cancels out of both the θ cut (relative to max S) and
 -- the S^γ draw. So the whole geometry — one War_CalMoveStep plus one War_AutoCalMaxEnemyMap per shape,
 -- and that map itself walks a BFS per enemy — is skipped for the common one-art / one-shape fighter.
 -- That is nearly the whole roster: only five people in the shipped tables carry two damaging arts at all
 -- (5 張三豐, 9 張無忌, 13 謝遜, 51 慕容復, 54 袁承志). tests/situpick157-off proves it bit for bit.
 local function situSameShape(cands)
  local key=nil
  for _,c in ipairs(cands)do
   local k=c.w['攻击范围']..':'..(c.w['移动范围'..c.lv] or 0)..':'..(c.w['杀伤范围'..c.lv] or 0)
   if key==nil then key=k elseif k~=key then return false end
  end
  for _,c in ipairs(cands)do c.hits=1;c.scope=1 end
  return true
 end
 -- H: the same movement map and the same two engine calls War_AutoMove uses (jymain.lua:6460-6516), so an
 -- art scored as reaching really is one War_AutoMove can walk into position for. Arts sharing shape, move
 -- scope and kill scope are computed once. Area (3) is estimated by the foes standing within 杀伤范围 of the
 -- target, which is optimistic — the engine itself treats area as a point when it builds layer 4. A line (1)
 -- is re-checked direction by direction, because layer 4 counts all four directions into the same cell:
 -- three foes standing north, south and east of one square read as 3 there while one strike can only hit 1.
 -- Both calls only write the engine's scratch layers 3/4, which War_AutoMove rebuilds right after.
 local function situReach(cands,foes)
  local steps=WAR.Person[WAR.CurID]['移动步数'] or 0
  local move=War_CalMoveStep(WAR.CurID,steps,0)
  local cells,cn={},0
  for i=0,steps do
   local row=move[i]
   if not row or not row.num or row.num==0 then break end
   for j=1,row.num do cn=cn+1;cells[cn]={row.x[j],row.y[j]} end
  end
  local cache={}
  for _,c in ipairs(cands)do
   local shape=c.w['攻击范围'];local ms=c.w['移动范围'..c.lv] or 0;local fs=c.w['杀伤范围'..c.lv] or 0
   local key=shape..':'..ms..':'..fs
   local h=cache[key]
   if h==nil then
    War_AutoCalMaxEnemyMap(c.id,c.lv)
    h=0
    for k=1,cn do
     local x,y=cells[k][1],cells[k][2]
     local v=GetWarMap(x,y,4);local num=0
     if v>0 then
      if shape==0 or shape==3 then num=1
      elseif shape==2 then num=v
      else num=War_AutoCalMaxEnemy(x,y,c.id,c.lv)end
     end
     if num>h then h=num end
    end
    if shape==3 and h>0 and fs>0 then
     local m=1
     for _,a in ipairs(foes)do
      local k=0
      for _,b in ipairs(foes)do if math.abs(a['坐标X']-b['坐标X'])<=fs and math.abs(a['坐标Y']-b['坐标Y'])<=fs then k=k+1 end end
      if k>m then m=k end
     end
     h=m
    end
    cache[key]=h
   end
   c.hits=h;c.scope=ms+fs
  end
 end
 -- One pick. nil hands the turn back to the source path untouched (no damaging candidate, no living foe,
 -- everything scored zero) exactly as jymain.lua:6340-6348 would have reached the drain/fist fallbacks.
 local function situSelect(u,pid,p)
  local cands,n={},0
  for i=1,10 do
   local id=p['武功'..i]
   if not id or id<=0 then break end
   local w=JY.Wugong[id]
   -- The source's own three gates (jymain.lua:6340-6348) plus this build's weapon fit: a damaging art
   -- whose one segment is affordable. Drains and unusable weapons keep the source path.
   if w and w['伤害类型']==0 and w['消耗内力点数']<=p['内力']
      and (not BrowserCanUseTechnique or BrowserCanUseTechnique(pid,id))then
    n=n+1;cands[n]={slot=i,id=id,w=w,lv=math.min(10,math.floor((p['武功等级'..i] or 0)/100)+1)}
   end
  end
  if n==0 then return nil end
  local foes,fn={},0
  for k=0,(WAR.PersonNum or 0)-1 do
   local q=WAR.Person[k]
   if k~=WAR.CurID and q and q['死亡']==false and q['我方']~=u['我方'] then fn=fn+1;foes[fn]=q end
  end
  if fn==0 then return nil end
  -- T: the Manhattan-nearest living foe. War_AutoSelectEnemy's own answer is not available yet (it only
  -- runs inside War_AutoMove's stuck branch) and its 100-step BFS is not worth paying for every pick.
  local tgt,near=foes[1],math.huge
  for k=1,fn do
   local d=math.abs(foes[k]['坐标X']-u['坐标X'])+math.abs(foes[k]['坐标Y']-u['坐标Y'])
   if d<near then near,tgt=d,foes[k]end
  end
  if not situSameShape(cands) then situReach(cands,foes)end
  local eid=tgt['人物编号'];local q=JY.Person[eid]
  local atk=1.5*p['攻击力']+situGear(p,pid,'加攻击力')
  local def3=3*((q['防御力'] or 0)+situGear(q,eid,'加防御力'))
  local rate=B.sideGlanceRate and B.sideGlanceRate(u['我方']==true)or nil
  local anyHit,maxScope=false,0
  for k=1,n do
   local c=cands[k];c.F=fightValue(pid,p,c.slot,c.id,c.w) or 0
   if c.hits>0 then anyHit=true end
   if c.scope>maxScope then maxScope=c.scope end
  end
  local top=0
  for k=1,n do
   local c=cands[k]
   local e=(c.F+atk-def3)*2/3
   if e<=0 then e=B.situ.floor end -- cannot break through: the source floor Rnd(10)+1 averages 5.5
   if B.glance then local g=B.glance(c.F+atk,def3,rate);if g>e then e=g end end
   local g
   if anyHit then g=c.hits>0 and(1+B.situ.lambda*(c.hits-1))or 0
   else g=maxScope>0 and c.scope/maxScope or 1 end
   c.S=e*g
   if c.S>top then top=c.S end
  end
  if top<=0 then return nil end
  local theta=u['我方']==true and B.situ.allyTheta or B.situ.theta
  local total,pick,bw=0,nil,-1
  for k=1,n do
   local c=cands[k]
   c.W=c.S<theta*top and 0 or c.S^B.situ.gamma
   total=total+c.W
   if c.W>bw then bw,pick=c.W,c.slot end
  end
  if total<=0 then return nil end
  local v=Rnd(total);local acc=0 -- one draw, same as jymain.lua:6405-6424
  for k=1,n do
   local c=cands[k];acc=acc+c.W
   if c.W>0 and v<acc then return c.slot end
  end
  return pick
 end
 local sourcePick=War_AutoSelectWugong
 if sourcePick then
  War_AutoSelectWugong=function(...)
   local u=WAR and WAR.Person and WAR.Person[WAR.CurID]
   -- 按局面选招 runs INSTEAD of the source picker, so it also stands in for allyArtFloor's after-the-fact
   -- swap: the ally draw already ranks by real expected damage, at a stricter θ. 手动出招不经选招器.
   -- 前世身影 is excluded from batch 0 and keeps the A1 path. A throw inside falls back the same way;
   -- nothing has been written, so there is nothing to restore.
   if B.enabled and B.situPick and u and type(u['人物编号'])=='number'
      and(u['我方']~=true or WAR.AutoFight==1)
      and not(BrowserGrowthIsEcho and BrowserGrowthIsEcho(u['人物编号']))then
    local p=JY.Person[u['人物编号']]
    if p then
     local ok,slot=pcall(situSelect,u,u['人物编号'],p)
     if ok and type(slot)=='number' and slot>=1 and slot<=10 then return slot end
    end
   end
   -- Strictly around the source picker and strictly inside allyArtFloor: outside it, the power() recompute
   -- below would multiply B.damage x BrowserTechniquePower onto an already-baked cell and warp the allied
   -- draw squarely (喬峰 打狗/降龍 83.2% of the best art becomes 60.9%, i.e. it drops under the .75 floor).
   local slot=bakeRun(sourcePick,...)
   if not B.enabled or not B.allyArtFloor or WAR.AutoFight~=1 or not u or u['我方']~=true or type(slot)~='number' or slot<1 or slot>10 then return slot end
   local pid=u['人物编号'];local p=JY.Person[pid]
   local picked=JY.Wugong[p['武功'..slot] or 0]
   if not picked or picked['伤害类型']~=0 then return slot end -- inner-force drains keep their (rare) source draw
   local function power(i)
    local id=p['武功'..i];local w=id and id>0 and JY.Wugong[id]
    if not w or w['伤害类型']~=0 or p['内力']<w['消耗内力点数'] or BrowserCanUseTechnique and not BrowserCanUseTechnique(pid,id) then return -1 end
    local rank=affordableRank(p,i,w)
    local v=B.damage(pid,-1,id,rank,w['攻击力'..rank])
    return BrowserTechniquePower and BrowserTechniquePower(pid,id,v) or v
   end
   local best,top=-1,slot
   for i=1,10 do local v=power(i);if v>best then best,top=v,i end end
   if best>0 and power(slot)<best*B.allyArtFloor then return top end
   return slot
  end
 end
 -- 155d: last-rank payoff (martial-balance.js LAST_RANK_BONUS, BALANCE_REVISION 155). The table gives a tier-4 art's
 -- rank ten more power and keeps the value before it as plainTenth. On the lenient first journey an ENEMY striking at
 -- rank ten keeps plainTenth, so named masters who already sit at rank ten (葵花神功 612 -> 697, 蛤蟆功 774 -> 857)
 -- do not hit harder than in 155c; the player's side, allied NPCs included, gets the new value. From the second
 -- journey on both sides share the table, like the 155b glance: the later journeys are meant to be the source-strength
 -- game, and the full transmission stays worth chasing across journeys. true = shared on the first journey as well.
 -- Only journey.cycle is read; nothing is stored.
 B.firstJourneyEnemyLastRank=false
 local sourceDamage=B.damage
 B.damage=function(pid,eid,skill,rank,power)
  local art=B.enabled and not B.firstJourneyEnemyLastRank and rank>=10 and B.data.skills[skill]
  if art and art.plainTenth and type(power)=='number' then
   local u=WAR and WAR.Person and WAR.CurID and WAR.Person[WAR.CurID]
   if u and u['人物编号']==pid and u['我方']~=true and not(BrowserGrowthIsEcho and BrowserGrowthIsEcho(pid)) then
    local cycle=type(browser_journey_get)=='function' and tonumber(browser_journey_get('cycle')) or 1
    if cycle<2 then power=power*art.plainTenth/art.power[10] end
   end
  end
  return sourceDamage(pid,eid,skill,rank,power)
 end
 local sourceWar=WarMain
 WarMain=function(...)
  B.turns={};B.combat=nil;B.foreign={};B.healUses={};B.allyHeals={};B.allyHealNoticed=false
  local r=table.pack(pcall(sourceWar,...));B.turns={};B.combat=nil;B.foreign={};B.healUses={};B.allyHeals={};B.allyHealNoticed=false
  scopeDepth=1;leaveCosts();bakeRun()
  if not r[1]then error(r[2],0)end;return table.unpack(r,2,r.n)
 end
 -- 395 S4 候选（Claude 2026-10-02，接 Q3 P3）：化功大法 27「毒化内力」。原著星宿派化功大法以毒化去对方内力
 -- （《天龙》丁春秋），本作 27 却只是「比北冥多吸一成、自己一点不回」的第三套吸内（Q3 实测专吸打法回合拖长
 -- 15–20 倍、胜率反降）。候选：化功每次真吸到内力，就按吸走的量给目标上毒——
 --   剂量 = min(cap, floor(实吸/div))，再过 B.poison（洗髓／九阳减免、封顶 6，与带毒武功同一上限），
 --   最后走 poisonmed 的唯一上毒入口 BrowserPoisonMedApply(eid,剂量,实吸)：抗毒 ≥90 免疫，抗毒 ≥实吸 一点不上。
 -- 十重对内力上限 999 的目标：吸 92 → 毒 6；七重 68 → 4；四重 44 → 2；一重 20 → 1（且须目标抗毒低于实吸量）。北冥／吸星不变。
 -- 敌我同规：丁春秋（war86，化功十重、攻击带毒 90、抗毒 80）对玩家同样生效。数值是设计值，不是原著数字。
 -- enabled=false ＝ 出厂逐位不变；qa/claude-final-sprint-20261002/s4/ 有前后表，由主窗口决定是否置 true。
 B.huagongPoison={enabled=false,div=15,cap=6}
 local sourceDrain=War_WugongHurtNeili
 War_WugongHurtNeili=function(target,skill,rank)
  if not B.enabled or (skill~=27 and skill~=28 and skill~=29)then return sourceDrain(target,skill,rank)end
  local pid=WAR.Person[WAR.CurID]['人物编号'];local eid=WAR.Person[target]['人物编号']
  local p,e=JY.Person[pid],JY.Person[eid]
  local wanted=(skill==27 and 12+rank*8 or 12+rank*7)
  local amount=math.min(e['内力'],wanted,math.floor(e['内力最大值']*.2)+10)
  amount=math.max(0,amount)
  local actual=-AddPersonAttrib(eid,'内力',-amount)
  local hp=B.huagongPoison
  if skill==27 and actual>0 and hp and hp.enabled then
   local apply=rawget(_G,'BrowserPoisonMedApply')
   local dose=B.poison(eid,math.min(hp.cap,math.floor(actual/hp.div)))
   if apply and dose>0 then apply(eid,dose,actual) end
  end
  if skill~=27 and actual>0 then
   local factor=.8
   if skill==28 then
    local burden=math.min(100,B.qi(pid)+math.ceil(actual/8));B.foreign[pid]=burden
    if BrowserGrowthCommitQi then BrowserGrowthCommitQi(pid,burden)end
    factor=burden>=100 and 0 or burden>=60 and .25 or .5
    if burden>=60 then AddPersonAttrib(pid,'受伤程度',burden>=90 and 2 or 1)end
   end
   AddPersonAttrib(pid,'内力',math.floor(actual*factor))
  end
  -- No random permanent MP growth or recovery from an already-empty target.
  return actual
 end
end
