-- Mastery trial combat adapter: hero 0 in standalone trial only. Save-and-delegate; no UI/R/dodge/crit changes.
local masterySavedManual=War_Manual
local masterySavedAuto=War_Auto
local masterySavedFightSub=War_Fight_Sub
local masterySavedHurtLife=War_WugongHurtLife
local masterySavedMinimum=War_GetMinNeiLi
local masterySavedAutoSelect=War_AutoSelectWugong
local masteryTaiChiScope={depth=0,orig=nil}   -- 太极拳20成本临时覆盖作用域（仅最外层生效）
local masteryAutoDepth=0

local function masteryConfig()
    if type(BrowserMasteryBattleConfig)~="function" then return nil end
    if WAR==nil or WAR.Person==nil or WAR.CurID==nil or WAR.Person[WAR.CurID]==nil then return nil end
    local pid=WAR.Person[WAR.CurID]["人物编号"]
    local unit=WAR.Person[WAR.CurID]
    if (unit["我方"] or (BrowserGrowthIsEcho and BrowserGrowthIsEcho(pid))) and type(BrowserGrowthBattleConfig)=="function" then
        local cfg=BrowserGrowthBattleConfig(pid);if cfg then return cfg end
    end
    if pid~=0 then return nil end
    local cfg=BrowserMasteryBattleConfig(pid)
    if type(cfg)~="table" then return nil end
    return cfg
end

-- Slot 11 is a transient table field, outside the ten binary learned slots.
-- rawset bypasses the original struct metatable; no game record is overwritten.
BrowserOrdinaryStrike=function(pid)
    local cfg=masteryConfig()
    if not cfg or (not cfg.growth and (pid~=0 or (cfg.version~=2 and cfg.version~=3 and cfg.version~=4))) or not (WAR.Person[WAR.CurID]['我方'] or BrowserGrowthIsEcho and BrowserGrowthIsEcho(pid)) or WAR.Person[WAR.CurID]['人物编号']~=pid then return nil end
    return {id=-1,slot=11,name='普通拳脚',level=1,cost=0,range=1,shape=0,ordinary=true,enabled=JY.Person[pid]['体力']>=10}
end

War_GetMinNeiLi=function(pid)
    if BrowserOrdinaryStrike(pid) then
        -- Keep the manual fallback, but let the original AI recover enough MP
        -- for a learned art instead of repeatedly using weak ordinary blows.
        local cfg=masteryConfig()
        if masteryAutoDepth>0 and cfg and cfg.growth then
            local minimum=masterySavedMinimum(pid)
            local capacity=tonumber(JY.Person[pid]['内力最大值']) or 0
            if minimum>=0 and minimum<=capacity then return minimum end
        end
        -- No reachable learned art: ordinary strikes remain usable; never
        -- make a character rest forever toward an impossible MP requirement.
        return 0
    end
    return masterySavedMinimum(pid)
end

War_AutoSelectWugong=function(...)
    local selected=masterySavedAutoSelect(...)
    local unit=WAR.Person[WAR.CurID]
    local row=BrowserOrdinaryStrike(unit["人物编号"])
    -- The source assigns drains weight even when every living foe is empty.
    -- Only discard that useless allied Auto pick; keep normal damage choices
    -- and manual/classic behaviour. Prefer an available learned damage art.
    if masteryAutoDepth>0 and WAR.AutoFight==1 and unit['我方']==true and row and row.enabled and selected>0 then
        local p=JY.Person[unit['人物编号']]
        local w=JY.Wugong[p['武功'..selected] or 0]
        if w and w['伤害类型']==1 then
            local hasEnemy=false
            for i=0,WAR.PersonNum-1 do
                local other=WAR.Person[i];local foe=JY.Person[other['人物编号']]
                if other['我方']~=unit['我方'] and not other['死亡'] and foe['生命']>0 then
                    if foe['内力']>0 then return selected end
                    hasEnemy=true
                end
            end
            if hasEnemy then
                -- Availability only: the outer balance picker may have baked
                -- power cells already, and applies its normal art floor next.
                -- Do not rescore/rebake or temporarily edit learned slots.
                for slot=1,10 do
                    local id=p['武功'..slot];local art=id and id>0 and JY.Wugong[id]
                    if art and art['伤害类型']==0 and art['消耗内力点数']<=p['内力']
                        and (not BrowserCanUseTechnique or BrowserCanUseTechnique(unit['人物编号'],id)) then return slot end
                end
                selected=-1
            end
        end
    end
    if selected<=0 and row and row.enabled then return row.slot end
    return selected
end

-- 试点B：九阳95 + 太极拳20，以较弱者 floor(min/3) 减每段消耗，至少1
local function masteryTaiChiReduce(cfg)
    if cfg==nil then return 0 end
    local ir=BrowserHeartRank and BrowserHeartRank(cfg,95) or cfg.internal==95 and (tonumber(cfg.internalRank) or 0) or 0
    if ir==0 then return 0 end
    local tr=tonumber(cfg.taiChiRank) or 0
    local r=math.floor(math.min(ir,tr)/3)
    if r<1 then return 0 end
    return r
end

local function masteryEnter()
    local s=masteryTaiChiScope
    s.depth=s.depth+1
    if s.depth>1 then return end            -- 嵌套（手动->自动->出招）不重复覆盖
    local row=BrowserOrdinaryStrike(WAR.Person[WAR.CurID]["人物编号"])
    if row then
        local p=JY.Person[WAR.Person[WAR.CurID]["人物编号"]]
        s.ordinary={person=p,skill=rawget(p,'武功11'),level=rawget(p,'武功等级11')}
        rawset(p,'武功11',1);rawset(p,'武功等级11',0)
    end
    local r=masteryTaiChiReduce(masteryConfig())
    if r<=0 or JY.Wugong==nil or JY.Wugong[20]==nil then return end
    s.orig=JY.Wugong[20]["消耗内力点数"]
    JY.Wugong[20]["消耗内力点数"]=math.max(1,s.orig-r)
end

local function masteryLeave()
    local s=masteryTaiChiScope
    s.depth=s.depth-1
    if s.depth>0 then return end
    s.depth=0
    if s.ordinary then
        local old=s.ordinary
        rawset(old.person,'武功11',old.skill);rawset(old.person,'武功等级11',old.level)
        s.ordinary=nil
    end
    if s.orig~=nil then
        JY.Wugong[20]["消耗内力点数"]=s.orig
        s.orig=nil
    end
end

local function masteryRun(fn,...)
    masteryEnter()
    local res=table.pack(pcall(fn,...))     -- Fengari pcall 可 yield
    masteryLeave()
    if not res[1] then error(res[2],0) end
    return table.unpack(res,2,res.n)
end

function War_Manual(...) return masteryRun(masterySavedManual,...) end
function War_Auto(...)
    masteryAutoDepth=masteryAutoDepth+1
    local result=table.pack(pcall(masteryRun,masterySavedAuto,...))
    masteryAutoDepth=masteryAutoDepth-1
    if not result[1] then error(result[2],0) end
    return table.unpack(result,2,result.n)
end
function War_Fight_Sub(id,slot,...)
    if slot==11 then
        local row=BrowserOrdinaryStrike(WAR.Person[id]['人物编号'])
        if id~=WAR.CurID or not row or not row.enabled then return 0 end
        -- Each ordinary strike is rank 1, including repeated manual/auto actions.
        -- The outer scope restores the original raw values after success/cancel/error.
        local result=table.pack(pcall(masteryRun,masterySavedFightSub,id,slot,...))
        if masteryTaiChiScope.ordinary then rawset(masteryTaiChiScope.ordinary.person,'武功等级11',0) end
        if not result[1] then error(result[2],0) end
        return table.unpack(result,2,result.n)
    end
    return masteryRun(masterySavedFightSub,id,slot,...)
end

-- 试点A：胡家刀法67，签名等级>=8，且经原MP校验后有效出招等级>=8 时忽略对手自身基础防御 6/8/10
local function masteryHuDaoReduce(cfg,pid,wugong,level)
    if cfg==nil or wugong~=67 or not cfg.huRank and cfg.signature~=67 then return 0 end
    local huRank=cfg.huRank or tonumber(cfg.signatureRank) or 0
    if huRank<8 then return 0 end
    local cost=JY.Wugong[wugong]["消耗内力点数"]
    local mp=JY.Person[pid]["内力"]
    while level>0 and math.modf((level+1)/2)*cost>mp do level=level-1 end   -- 与原降级循环一致
    if level<=0 then level=1 end
    level=math.min(level,huRank)
    if level>=10 then return 10 elseif level==9 then return 8 elseif level==8 then return 6 end
    return 0
end

function War_WugongHurtLife(emenyid,wugong,level)
    local cfg=masteryConfig()
    if cfg==nil then return masterySavedHurtLife(emenyid,wugong,level) end
    local pid=WAR.Person[WAR.CurID]["人物编号"]
    local reduce=masteryHuDaoReduce(cfg,pid,wugong,level)
    if reduce<=0 then return masterySavedHurtLife(emenyid,wugong,level) end
    local eid=WAR.Person[emenyid]["人物编号"]
    local p=JY.Person[eid]
    local orig=p["防御力"]
    p["防御力"]=orig-math.min(reduce,math.max(0,orig))   -- 最多减其自身基础防御，不涉及装备
    local res=table.pack(pcall(masterySavedHurtLife,emenyid,wugong,level))
    p["防御力"]=orig
    if not res[1] then error(res[2],0) end
    return table.unpack(res,2,res.n)
end

-- Yijin protects its actual bearer while the ORIGINAL calculation settles HP,
-- injury, poison and XP. Never heal back damage after a death/XP decision.
local masteryBeforeYijin=War_WugongHurtLife
War_WugongHurtLife=function(target,skill,level)
 local defender=WAR and WAR.Person and WAR.Person[target]
 local attacker=WAR and WAR.Person and WAR.Person[WAR.CurID]
 local cfg=defender and defender['人物编号']==0 and defender['我方'] and attacker and not attacker['我方'] and type(BrowserMasteryBattleConfig)=='function' and BrowserMasteryBattleConfig(0) or nil
 local bonus=cfg and cfg.version==4 and cfg.yijinGuard or 0
 if not bonus or bonus<=0 then return masteryBeforeYijin(target,skill,level) end
 local p=JY.Person[0];local original=p['防御力']
 p['防御力']=original+bonus
 local result=table.pack(pcall(masteryBeforeYijin,target,skill,level))
 p['防御力']=original
 if not result[1] then error(result[2],0) end
 return table.unpack(result,2,result.n)
end
