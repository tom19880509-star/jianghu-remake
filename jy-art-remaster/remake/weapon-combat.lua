-- Shared weapon requirements, discipline bonuses and temporary hand state.
-- Equipment gates run before target selection, costs, proficiency or damage.
;(function()
 local hands={};local action=nil
 local function eligible(pid)
  return BrowserBalanceEnabled and BrowserBalanceEnabled() and JY.Person[pid]~=nil
 end
 local families=type(browser_weapon_families)=='function' and browser_weapon_families() or {}
 local fields={[1]='拳掌功夫',[2]='御剑能力',[3]='耍刀技巧',[4]='特殊兵器'}
 local staffs={[70]=true,[73]=true,[85]=true,[86]=true,[87]=true}
 local noRoot={[0]=true,[27]=true,[28]=true,[29]=true,[74]=true,[75]=true,[76]=true,[79]=true,[84]=true,[90]=true,[91]=true}
 -- Heavy Iron Sword (item 106) keeps its own item row (attack/defence/agility).
 -- 156 per-art adaptation. heavy[id] applies while 106 is the held weapon,
 -- light[id] while a heavy-born art is swung with any other blade:
 --  · 57 玄铁剑法 is the art that sword was made for (重剑无锋、大巧不工):
 --    +15% with it, -15% with an ordinary sword.
 --  · 60 辟邪剑法 and 49 玉女素心剑 are explicitly fast, light forms: -25%.
 --  · Every other sword art stays neutral on purpose, 61 独孤九剑 included
 --    (源著明言料敌机先、不滞于兵刃), so the heavy sword is not a blanket
 --    penalty on swordplay.
 -- The multipliers are this build's balance values, not source figures.
 -- 156 平衡验证 F1：玄铁剑法配玄铁剑本来已经拿着原版 CC.ExtraOffense{106,57,+100} 的攻击加成，
 -- 再叠一层 +15% 就比同面板同耗内的降龙高出 43%（qa/balance156-core-20260918）。逐招适配保留，
 -- 但对同一对「兵器×招式」不重复计价：原版已经奖过的那一格改为中性 1.0，代价侧（换轻剑 -15%）照旧。
 -- 于是「此剑法为此剑而设」仍然成立——它体现在换错兵器要挨罚，而不是在原版加成上再加一层。
 local heavy={[60]=.75,[49]=.75}   -- 57 不在此表：配玄铁走原版 +100，不另加乘数（见上注）
 local light={[57]=.85}
 local HEAVY_SWORD=106
 -- 气劲: force projected from the body itself. Never gated by a weapon and
 -- never adapted by one; Flame Blade is palm force, Six Meridians is sword
 -- force, and the source category of 30 is already 1.
 local qi={[30]=true,[66]=true}
 local function category(skill)
  local w=JY.Wugong[skill];if not w then return nil end
  return qi[skill] and 1 or w['武功类型']
 end
 local function required(skill)
  if skill==56 then return 'flute' end
  local kind=category(skill)
  if kind==2 then return 'sword' elseif kind==3 then return 'blade' end
  if staffs[skill] then return 'staff' end
  if skill==77 or skill==78 then return 'whip' end
 end
 local function family(id)
  local f=families[tostring(id)] or families[id]
  if f then return f end
  -- Native weapon rows also work in the classic test fixtures.
  if id>=106 and id<=114 or id==192 then return 'sword' end
  if id>=115 and id<=119 then return 'blade' end
 end
 local function emptyHand(skill)
  return qi[skill]==true or category(skill)==1 or skill==27 or skill==28 or skill==29 or skill==91
 end
 -- Read-only views other layers (combo-extension) and the tests share, so the
 -- weapon table is stated in exactly one place.
 BrowserWeaponFamily=function(id)return family(id) end
 BrowserWeaponAdapt=function(skill)
  return {required=required(skill) or '',emptyHand=emptyHand(skill),qi=qi[skill]==true,heavy=heavy[skill],light=light[skill]}
 end
 BrowserTechniqueInfo=function(pid,skill)
  local w=JY.Wugong[skill];if not eligible(pid) or not w then return nil end
  local needed=required(skill);local weapon=JY.Person[pid]['武器'];local held=family(weapon)
  local r={allowed=true,compatibility=1,bonus=0,emptyHand=emptyHand(skill),required=needed or ''}
  if needed then
   local correct=held==needed or needed=='sword' and held=='flute' and skill==56 or needed=='flute' and held=='sword'
   local substitute=(needed=='sword' and held=='blade') or (needed=='blade' and held=='sword')
   if substitute then r.compatibility=.7;r.weaponNote='刀剑代用：招式威力降低30%。'
   elseif not correct then
    r.allowed=false;r.reason=weapon<0 and '未装备兵器' or '兵器不合用'
    local name=({sword='剑（刀可勉强代用）',blade='刀（剑可勉强代用）',staff='棍杖',whip='软鞭',flute='箫或剑'})[needed]
    r.weaponNote=r.reason..'：须装备'..name..'。'
   end
   if r.allowed and weapon==HEAVY_SWORD and heavy[skill] then
    r.heavy=heavy[skill];r.compatibility=r.compatibility*r.heavy
    local pct=math.floor(math.abs(1-r.heavy)*100+.5)
    r.weaponNote=(r.weaponNote or '')..(r.heavy>1 and ('玄铁重剑：此剑法本为重剑所创，招式威力+'..pct..'%。')
     or ('玄铁重剑：此剑法倚仗轻捷，招式威力降低'..pct..'%。'))
   elseif r.allowed and weapon~=HEAVY_SWORD and light[skill] then
    r.heavy=light[skill];r.compatibility=r.compatibility*r.heavy
    r.weaponNote=(r.weaponNote or '')..'非重剑：此剑法倚仗沉雄，招式威力降低'..math.floor((1-r.heavy)*100+.5)..'%。'
   end
  end
  local field=not noRoot[skill] and fields[category(skill)] or nil
  if field then
   r.root=field;r.value=math.max(0,math.min(100,JY.Person[pid][field] or 0));r.bonus=r.value*.2
   r.rootNote=field..' '..r.value..'：招式威力+'..string.format('%.1f',r.bonus)..'%。'
  end
  return r
 end
 BrowserCanUseTechnique=function(pid,skill)
  local r=BrowserTechniqueInfo(pid,skill);return not r or r.allowed
 end
 BrowserTechniquePower=function(pid,skill,power)
  local r=BrowserTechniqueInfo(pid,skill)
  if not r then return power end
  if not r.allowed then return 0 end
  -- Single multiplication point for the combination layer, so 同源/互补/合击
  -- and hand conflicts can never quietly stack on top of each other.
  local combo=rawget(_G,'BrowserComboMultiplier')
  return power*(1+r.bonus/100)*r.compatibility*(combo and combo(pid,skill) or 1)
 end
 BrowserHeldWeapon=function(pid)
  local weapon=JY.Person[pid]['武器'];local state=hands[pid]
  if eligible(pid) and state and state.carried==weapon then return state.held end
  return weapon
 end
 BrowserWeaponHint=function(pid,skill)
  local r=BrowserTechniqueInfo(pid,skill);if not r then return nil end
  local affinity=BrowserMartialBalance and BrowserMartialBalance.affinity and BrowserMartialBalance.affinity(pid,skill) or 0
  local note=(r.weaponNote or '')..(affinity>0 and '本命绝学：招式威力+'..affinity..'%。' or '')
  if r.allowed and r.emptyHand and JY.Person[pid]['武器']>=0 then note=note..'空手施展：不计兵器攻防，负重仍在。' end
  if qi[skill] then note=note..'气劲离体：不依兵器，也不受重剑逐招适配影响。' end
  local combo=rawget(_G,'BrowserComboInfo');local c=combo and combo(pid,skill)
  if c and c.note then note=note..c.note..'。' end
  return note..(r.rootNote or '')
 end
 local function commit(pid,skill)
  if not action or action.pid~=pid or action.skill~=skill or action.committed then return end
  action.committed=true
  local weapon=JY.Person[pid]['武器'];local previous=BrowserHeldWeapon(pid)
  local dualVisual=rawget(_G,'BrowserDualVisualWeapon')
  local secondHand=dualVisual and dualVisual(pid,skill) or nil
  hands[pid]={carried=weapon,held=emptyHand(skill) and -1 or secondHand or weapon}
  local held=hands[pid].held
  if lib.SetBattleEquipment then lib.SetBattleEquipment(JY.Person[pid]['头像代号'],held,weapon,pid,BrowserOffhandWeapon and BrowserOffhandWeapon(pid) or -1)end
  if previous~=held and lib.BeginWeaponHandling and lib.BeginWeaponHandling(pid,previous,held,weapon) then
   local result=table.pack(pcall(function()
    for frame=0,4 do
     lib.WeaponHandlingFrame(held<0 and 4-frame or frame)
     WarDrawMap(0);ShowScreen();lib.Delay(pid==58 and 60 or 40)
    end
   end))
   lib.EndWeaponHandling()
   if not result[1]then error(result[2],0)end
  end
 end
 local fight=War_Fight_Sub
 War_Fight_Sub=function(id,slot,...)
  local pid=WAR.Person[id]['人物编号']
  if not eligible(pid) then return fight(id,slot,...) end
  local skill=slot==11 and 1 or JY.Person[pid]['武功'..slot]
  if not BrowserCanUseTechnique(pid,skill) then return 0 end
  local before=action
  action={pid=pid,skill=skill}
  local result=table.pack(pcall(fight,id,slot,...));action=before
  if not result[1] then error(result[2],0) end
  return table.unpack(result,2,result.n)
 end
 -- Native damage runs AFTER target confirmation and BEFORE presentation.
 -- Selection/hover never passes here. Empty-area attacks commit at ShowFight.
 local life,drain,show=War_WugongHurtLife,War_WugongHurtNeili,War_ShowFight
 War_WugongHurtLife=function(target,skill,...)
  commit(WAR.Person[WAR.CurID]['人物编号'],skill)
  return life(target,skill,...)
 end
 War_WugongHurtNeili=function(target,skill,...)
  commit(WAR.Person[WAR.CurID]['人物编号'],skill)
  return drain(target,skill,...)
 end
 War_ShowFight=function(pid,skill,...)
  commit(pid,skill)
  return show(pid,skill,...)
 end
 -- The original enemy records often omit equipment despite weapon attacks.
 -- Give non-party combatants zero-stat ordinary props for this battle only.
 -- Never replace player loadouts, recorded echoes, or existing named weapons.
 local borrowed={}
 local function restoreProps()
  for pid,id in pairs(borrowed)do JY.Person[pid]['武器']=id end;borrowed={}
 end
 local selectEnemy=WarSelectEnemy
 WarSelectEnemy=function(...)
  local result=table.pack(selectEnemy(...))
  if BrowserBalanceEnabled and BrowserBalanceEnabled() then
   local party={};for i=1,CC.TeamNum do party[JY.Base['队伍'..i]]=true end
   -- 157：原版强制出战的同伴（war34–37 令狐冲、war51 林平之，war.sta 自动选择参战人）输了即 game over，
   -- 而原版没有兵器闸门。若玩家把他的剑换走了，他会拿不出剑法、任何练度都打不过（reviews/forcedloss157-report.md 五）。
   -- 这类人按非队员对待，只在本场借一件寻常兵器，战后照旧还原；主角（编号 0）与玩家自选的出战人不动。
   for i=1,6 do local a=WAR.Data and WAR.Data['自动选择参战人'..i];if a and a>0 then party[a]=nil end end
   for i=0,WAR.PersonNum-1 do
    local pid=WAR.Person[i]['人物编号'];local p=JY.Person[pid]
    if p and p['武器']<0 and not party[pid] and not (BrowserGrowthIsEcho and BrowserGrowthIsEcho(pid)) then
     local selected,best=nil,-1
     for slot=1,10 do local id=p['武功'..slot];local need=id and id>0 and required(id)
      if need then local rank=math.min(10,math.floor((p['武功等级'..slot] or 0)/100)+1);local score=JY.Wugong[id]['攻击力'..rank] or 0
       if score>best then selected,best=need,score end
      end
     end
     local weapon=({sword=410,blade=411,staff=412,whip=413,flute=414})[selected]
     if weapon and JY.Thing[weapon] then borrowed[pid]=p['武器'];p['武器']=weapon end
    end
   end
  end
  return table.unpack(result,1,result.n)
 end
 local minimum=War_GetMinNeiLi
 War_GetMinNeiLi=function(pid)
  if not eligible(pid) then return minimum(pid) end
  local best=math.huge
  for i=1,10 do local skill=JY.Person[pid]['武功'..i]
   if skill and skill>0 and BrowserCanUseTechnique(pid,skill) then best=math.min(best,JY.Wugong[skill]['消耗内力点数']) end
  end
  if minimum(pid)==0 or best==math.huge and BrowserOrdinaryStrike and BrowserOrdinaryStrike(pid) then return 0 end
  return best
 end
 local autoSelect=War_AutoSelectWugong
 War_AutoSelectWugong=function(...)
  local slot=autoSelect(...);local pid=WAR.Person[WAR.CurID]['人物编号'];local p=JY.Person[pid]
  if not eligible(pid) or slot==11 or slot and slot>0 and BrowserCanUseTechnique(pid,p['武功'..slot]) then return slot end
  local best,chosen=-1,-1
  for i=1,10 do local id=p['武功'..i];local w=id and id>0 and JY.Wugong[id]
   if w and p['体力']>=10 and p['内力']>=w['消耗内力点数'] and BrowserCanUseTechnique(pid,id) then
    local rank=math.min(10,math.floor((p['武功等级'..i] or 0)/100)+1)
    local score=w['伤害类型']==1 and 10 or BrowserTechniquePower(pid,id,w['攻击力'..rank])
    if score>best then best,chosen=score,i end
   end
  end
  if chosen>0 then return chosen end
  local row=BrowserOrdinaryStrike and BrowserOrdinaryStrike(pid)
  return row and row.enabled and row.slot or -1
 end
 local war=WarMain
 WarMain=function(...)
  restoreProps();hands={};action=nil
  local result=table.pack(pcall(war,...));restoreProps();hands={};action=nil
  if not result[1] then error(result[2],0) end
  return table.unpack(result,2,result.n)
 end
end)()
