-- JIUYANG_EXTENSION : 九阳改纯内功、张无忌初始武学、旧档 92 归内功栏（157 丙）
--
-- Tom 2026-09-22 两条裁定：
--   「改，让张无忌初始就有武当长拳和七伤拳，都在5层左右吧。九阳改为纯内力但是附带其他属性增益和增伤
--     （比如满级抗毒高，增加防御，所有武功伤害增加）」
--   「内功多学多强是对的」（学过的被动全部生效）
-- 依据、数值扫描与双侧实测写在 editorial/九阳与邪路157.md；原著考据在 editorial/张无忌前期武学157.md
-- 与 editorial/内功原著核157.md（九阳「纯系内功与武学要旨，**没半招攻防的招数**」，《倚天》回16 叙述者）。
--
-- 本层三块，互相独立、可分别关：
--   A 新局播种 9 張無忌：武當長拳五重 ＋ 七傷拳五重，撤掉武功栏里的 92 九陽神功；
--     顺带按原著订正 抗毒能力 0→40（回23「诸毒不侵」）与 用毒能力 12→30（回14 毒菌，他前期唯一的杀敌战绩）。
--   B 九陽真經（秘籍 95）三项临敌被动：抗毒、防御、全武功增伤。数值全部读
--     BrowserMartialBalance.data.books[95].passive，**本文件不另写一份常数**。
--   C 旧档归栏：武功栏里还挂着 92 的人，在境界确实已记进内功（learnedBooks['95']）之后把那一格让出来。
--
-- 五条硬约束（都已遵守）：
--  ① 武学表 93 条已满。本层只用底表已有的 2 武當長拳 与 6 七傷拳，不新增第 94 条，也不删第 93 条。
--  ② JY.Person 的字段直接落进存档字节 ⇒ **A 只在 NewGame 播种，已存档一个字节都不碰**
--     （写法照抄 signature-extension.lua 与 toosimple-extension.lua 的 SEED＋pristine 结构）。
--  ③ B 的三项全是**临时值**：进函数前加、出函数立刻还原（写法照抄 growth-extension.lua 乾坤大挪移
--     那一段的 save→pcall→restore），人物面板与存档里**永远读不到**这三项。
--  ④ C **不回溯改存档**：只在确认「这个人的九阳境界已经记在内功栏」之后，才把那一格让出来；
--     没有成长记录的人（多数敌方 NPC）一律不动——他们手上的 92 已经威力为 0，选招器的 F=0 会自行剔除。
--  ⑤ 不碰共享核心：不改 bridge.lua／engine.js／build.mjs／生成物／content.js／balance-combat.lua／
--     artfx-extension.lua／poisonmed-extension.lua。本层要在真机生效需要在 bridge.lua 加一行
--     `-- JIUYANG_EXTENSION` 占位并在 build.mjs 接线，两处写在 reviews/wuji157-patch-suggestions.md。
--
-- **加载顺序**：必须排在 GROWTH_EXTENSION（bridge.lua:682，含 balance-core／growth-extension）、
--   WEAPON_EXTENSION（:685，BrowserTechniquePower 在那里定义）与 POISONMED_EXTENSION（:693）之后。
--   建议插在 `-- ARTFX_EXTENSION`（:694）之后。排早了会出两种错：BrowserTechniquePower 还不存在（增伤失效）、
--   或者本层的防御加成被 growth-extension 的乾坤大挪移包裹挡在外面（两者应当各自生效、按加法叠）。
-- **注意**：本层**不**在开头统一 `if type(NewGame)~='function' then return end`。
-- signature／toosimple 两层只做播种，没有 NewGame 就没事干；本层的 B 件是战斗内被动，
-- 与新局无关，只在装 NewGame 钩子那一处才检查它存在——否则在只有战斗环境的夹具里整层会被跳过。
;(function()

 -- ===================== A. 新局播种：9 張無忌 =====================
 -- 重数换算：等级值 = (重数-1)×100，与 signature/toosimple 两层一致（400 ＝ 五重）。
 --
 -- **为什么是五重，不是三重也不是十重**（重数是平衡值，不是原著数字）：
 --   · 武當長拳 tier1 steady，五重 130（十重 260）。原著回15 朱武连环庄他把三十二势「尽数使将出来」，
 --     但叙述者同段写「所出拳脚均无威力」——会全套、威力不足，正是曲线中段。底表原值三重 75 偏低。
 --   · 七傷拳 tier3 steady 群伤，五重 211（十重 422）。原著回8 谢逊只授**口诀**、回20 他才想起拳诀、
 --     回21 高吟总诀一拳震碎松树脉络——**有拳理、无对人拆招经验**，同样落在中段。
 --   · 两门同为五重，合计五重面板攻势 341，与他底表 等级3／攻53／内力217 的档位相称；
 --     换掉的 92 九陽神功一重原本只有 37 威力，所以这一笔净增约 +300，**全部发生在他当队友的时候**
 --     （本轮遍历 content.js 全部 140 场 wars，代号 9 一次都没有作为敌人出现，外溢恒为零）。
 --
 -- **两项属性订正的候选值与理由**（都不抬到离谱；底表 抗毒>0 的只有 33/320 人，非零中位数 50）：
 --   · 抗毒能力 0 → **40**。方向错的是 0：《倚天》回23 叙述者明写他「有九阳神功护体、**诸毒不侵**」。
 --     取 40 而不是 90，是因为「诸毒不侵」要靠九阳练到满级才成立——40（底表）＋50（九阳十重被动）＝90，
 --     恰好是 poisonmed 的 immuneResist 与原版附毒判定里那条 `抗毒能力<90` 的免疫线。
 --     他现在九阳只有一重，实际抗毒 45，离免疫还远。40 也低于 游坦之100／大蜘蛛99／欧阳锋89。
 --   · 用毒能力 12 → **30**。回14 他前期唯一的杀敌战绩就是《王难姑毒经》的毒菌（简捷、薛公远与两名华山弟子），
 --     且他「珍而重之」收好那本书。取 30 的三条界：①高于 poisonmed 给毒线记经验的门槛 20，
 --     否则这条线他永远练不起来；②低于他自己的 解毒48／医疗57——原著里医是两年师徒、毒只是捡来一本书；
 --     ③低于 五毒教徒56／阿紫55／蓝凤凰75／王难姑82／程灵素86，他不是毒道中人。
 local SEED={
  [9]={arts={{1,2,400},{2,6,400}},
       was={['武功1']=2,['武功等级1']=200,['武功2']=92,['武功等级2']=50},
       set={['抗毒能力']=40,['用毒能力']=30},
       wasSet={['抗毒能力']=0,['用毒能力']=12}},
 }
 local applied={arts=0,fields=0,migrated=0}

 local function pristine(p,row)
  for k,v in pairs(row.was) do if p[k]~=v then return false end end
  for k,v in pairs(row.wasSet or {}) do if p[k]~=v then return false end end
  -- 只有列明的槽位可以有东西，其余必须全空：别的层先动过手就整条跳过。
  local top=0;for _,a in ipairs(row.arts) do if a[1]>top then top=a[1] end end
  for i=top+1,10 do if p['武功'..i]~=0 then return false end end
  return true
 end

 local function seed()
  applied.arts=0;applied.fields=0
  for pid,row in pairs(SEED) do
   local p=JY.Person and JY.Person[pid]
   if p and pristine(p,row) then
    for _,a in ipairs(row.arts) do p['武功'..a[1]]=a[2];p['武功等级'..a[1]]=a[3];applied.arts=applied.arts+1 end
    for k,v in pairs(row.set) do p[k]=v;applied.fields=applied.fields+1 end
   end
  end
 end

 -- ===================== B/C 共用：九阳境界读数 =====================
 local BOOK=95
 local function passive()
  local b=type(BrowserMartialBalance)=='table' and BrowserMartialBalance.data
   and BrowserMartialBalance.data.books and BrowserMartialBalance.data.books[BOOK]
  return b and b.passive or nil
 end
 -- 与易筋经、九阴真经、紫霞秘笈同一条读法：BrowserHeartRank(BrowserGrowthBattleConfig(pid),95)。
 -- 因此「谁算练过九阳」的判定完全沿用既有规则（144 双栏下读 learnedBooks，旧规则下读主运心法），
 -- 本层不另立一套身份判定。
 local function rankOf(pid)
  if type(BrowserHeartRank)~='function' or type(BrowserGrowthBattleConfig)~='function' then return 0 end
  local r=BrowserHeartRank(BrowserGrowthBattleConfig(pid),BOOK) or 0
  if r<0 then r=0 elseif r>10 then r=10 end
  return math.floor(r)
 end
 local function defenceBonus(pid)
  local P=passive();local r=rankOf(pid)
  if not P or r<=0 then return 0 end
  return math.min(P.defenceMax,math.floor(r*P.defencePerRank))
 end
 local function resistBonus(pid)
  local P=passive();local r=rankOf(pid)
  if not P or r<=0 then return 0 end
  return math.min(P.resistMax,math.floor(r*P.resistPerRank))
 end
 local function powerBonus(pid)
  local P=passive();local r=rankOf(pid)
  if not P or r<=0 then return 0 end
  return math.min(P.powerMax,r*P.powerPerRank)
 end

 -- 只读查询，供界面、测试与仿真台核对；加载期赋值，不违反严格全局。
 BrowserJiuyang=function(pid)
  local P=passive()
  return {book=BOOK,rank=rankOf(pid),defence=defenceBonus(pid),resist=resistBonus(pid),
   power=powerBonus(pid),passive=P,applied=applied}
 end

 -- ===================== B1. 所有武功伤害增加 =====================
 -- 挂在 BrowserTechniquePower 上（weapon-combat.lua:93 定义），因为真实伤害（combat-extension.lua:59）、
 -- 选招权重（balance-combat.lua:379/604 的 aiWeightBake 与 situPick）与兵器适配评分（weapon-combat.lua:212）
 -- 读的都是这同一个函数——挂在这里，选招门槛与真实输出不会脱节。
 -- 与九阴真经／紫霞秘笈的关系是**叠加**（Tom 2026-09-22：「内功多学多强是对的」）：
 -- 那两门在 balance-core 的 B.damage 里已经互相取大，九阳这一层再乘一次，叠加上界 1.08×1.08＝1.1664。
 do
  local sourcePower=BrowserTechniquePower
  if type(sourcePower)=='function' then
   BrowserTechniquePower=function(pid,skill,power,...)
    local v=sourcePower(pid,skill,power,...)
    if type(v)~='number' then return v end
    local bonus=powerBonus(pid)
    if bonus<=0 then return v end
    return v*(1+bonus)
   end
  end
 end

 -- ===================== B2. 受敌方武功时临时增加防御与抗毒 =====================
 -- 写法与 growth-extension.lua 乾坤大挪移那一段同式：只动**被打的那个人**、只在这一次调用里加、
 -- 用 pcall 保证异常路径也还原。两层各自生效、按加法叠（乾坤挪劲最多 10 点 ＋ 九阳护体最多 8 点）。
 -- 抗毒在同一处加，是因为原版 War_WugongHurtLife 的附毒判定（combat-extension.lua 末段）读的正是
 -- `JY.Person[eid]['抗毒能力']`，且有一条写死的 `<90` 免疫线。
 do
  local sourceHurt=War_WugongHurtLife
  if type(sourceHurt)=='function' then
   War_WugongHurtLife=function(target,skill,level,...)
    local u=WAR and WAR.Person and WAR.Person[target]
    local a=WAR and WAR.Person and WAR.CurID and WAR.Person[WAR.CurID]
    local pid=u and u['人物编号']
    if not pid or not a or u['我方']==a['我方'] then return sourceHurt(target,skill,level,...) end
    local dBonus,rBonus=defenceBonus(pid),resistBonus(pid)
    if dBonus<=0 and rBonus<=0 then return sourceHurt(target,skill,level,...) end
    local p=JY.Person[pid];local def,res=p['防御力'],p['抗毒能力']
    p['防御力']=def+dBonus;p['抗毒能力']=res+rBonus
    local r=table.pack(pcall(sourceHurt,target,skill,level,...))
    p['防御力']=def;p['抗毒能力']=res
    if not r[1] then error(r[2],0) end
    return table.unpack(r,2,r.n)
   end
  end
 end

 -- ===================== B3. 对手主动下毒与每轮毒发 =====================
 -- War_PoisonHurt(下毒人, 中毒人) 由 poisonmed-extension 接管（该层排在本层之前），读 `抗毒能力`
 -- 判命中、剂量与 immuneResist；War_PersonLostLife 每轮按 `抗毒能力>=shedResist` 自行退毒。
 -- 两处都只临时加，调用完立刻还原。
 do
  local sourcePoison=War_PoisonHurt
  if type(sourcePoison)=='function' then
   War_PoisonHurt=function(pid,eid,...)
    local bonus=type(eid)=='number' and resistBonus(eid) or 0
    if bonus<=0 then return sourcePoison(pid,eid,...) end
    local p=JY.Person[eid];local res=p['抗毒能力']
    p['抗毒能力']=res+bonus
    local r=table.pack(pcall(sourcePoison,pid,eid,...))
    p['抗毒能力']=res
    if not r[1] then error(r[2],0) end
    return table.unpack(r,2,r.n)
   end
  end
  local sourceLost=War_PersonLostLife
  if type(sourceLost)=='function' then
   War_PersonLostLife=function(...)
    local saved={}
    for i=0,(WAR and WAR.PersonNum or 0)-1 do
     local u=WAR.Person[i]
     local pid=u and u['人物编号']
     local bonus=pid and resistBonus(pid) or 0
     if bonus>0 and saved[pid]==nil then
      local p=JY.Person[pid];saved[pid]=p['抗毒能力'];p['抗毒能力']=saved[pid]+bonus
     end
    end
    local r=table.pack(pcall(sourceLost,...))
    for pid,res in pairs(saved) do JY.Person[pid]['抗毒能力']=res end
    if not r[1] then error(r[2],0) end
    return table.unpack(r,2,r.n)
   end
  end
 end

 -- ===================== C. 旧档：武功栏里的 92 让出那一格 =====================
 -- 参考本地 166 把北冥／吸星归入内功栏的做法：**境界、修炼经验、投入与秘籍归属全部保留**，
 -- 改的只有「它占不占武功栏的一格」。与 166 的差别是九阳连主动招式都没有了，所以那一格可以整格让出。
 -- 安全闸两道，任何一道不满足就**整个人跳过**：
 --   ① 这个人必须有成长记录，并且 `BrowserHeartRank(cfg,95)` 已经 ≥ 他武功栏里那一门的重数
 --      —— growth-core 的 adoptJiuyang 会在 ensure 时把旧档的 92 认成 95 并记下重数，所以正常路径恒满足；
 --      读不到、或读到的重数更低，就说明境界还没落到内功栏，这时**绝不**动他的武功栏。
 --   ② 让格之后按原版规矩把后面的槽位往前压实：原版 War_AutoSelectWugong 第一个循环遇到空槽就
 --      `wugongnum=i-1;break`，中间留一格空会让后面的武功连被看见的机会都没有。
 local SKILL=92
 local function slotOf(p) for i=1,10 do if p['武功'..i]==SKILL then return i end end end
 local function migrate(pid)
  local p=JY.Person and JY.Person[pid];if not p then return false end
  local i=slotOf(p);if not i then return false end
  local slotRank=math.min(10,math.floor((p['武功等级'..i] or 0)/100)+1)
  if rankOf(pid)<slotRank then return false end
  local kept={}
  for k=1,10 do if p['武功'..k]>0 and p['武功'..k]~=SKILL then kept[#kept+1]={p['武功'..k],p['武功等级'..k]} end end
  for k=1,10 do
   p['武功'..k]=kept[k] and kept[k][1] or 0
   p['武功等级'..k]=kept[k] and kept[k][2] or 0
  end
  applied.migrated=applied.migrated+1
  return true
 end
 -- 只读／显式调用：主会话可在成长层读档后调一次，把全队一起归栏。
 BrowserJiuyangMigrate=function(pid)
  if type(pid)=='number' then return migrate(pid) end
  local n=0
  for i=1,(CC and CC.TeamNum or 6) do
   local who=JY.Base and JY.Base['队伍'..i]
   if who and who>=0 and migrate(who) then n=n+1 end
  end
  return n
 end

 -- 新局播种；播完顺手归栏（新局里只有张无忌可能挂着 92，而 A 已经把他那一格换掉了）。
 if type(NewGame)=='function' then
  local sourceNewGame=NewGame
  NewGame=function(...)
   local result=table.pack(sourceNewGame(...))
   seed()
   return table.unpack(result,1,result.n)
  end
 end
 -- 入场前归栏：这是玩家真正看得见 92 的地方（战斗武功菜单与选招器）。
 -- 放在 WarSelectEnemy 之前，与 toosimple 仿真台里「先写底表再放行」的时序一致。
 if type(WarSelectEnemy)=='function' then
  local sourceSelect=WarSelectEnemy
  WarSelectEnemy=function(...)
   BrowserJiuyangMigrate()
   return sourceSelect(...)
  end
 end
 -- 研习之后立刻归栏：`api.train` 对 nonAttack 的书仍会先占一格武功栏再把重数写进去
 -- （growth-core.lua 的 train：skill=92>0 ⇒ 找一个空格创建）。不在这里收，玩家学完九阳真经会在
 -- 人物页上看见一门空壳招式，直到下一场战斗才消失。两个入口都包：原版研习与 144 双栏的研习动作。
 if type(War_PersonTrainBook)=='function' then
  local sourceTrain=War_PersonTrainBook
  War_PersonTrainBook=function(pid,...)
   local r=table.pack(sourceTrain(pid,...))
   if type(pid)=='number' then migrate(pid) end
   return table.unpack(r,1,r.n)
  end
 end
 if type(BrowserGrowthAction)=='function' then
  local sourceAction=BrowserGrowthAction
  BrowserGrowthAction=function(pid,...)
   local r=table.pack(sourceAction(pid,...))
   if type(pid)=='number' then migrate(pid) end
   return table.unpack(r,1,r.n)
  end
 end

 -- 只读查询，供测试与界面核对。
 BrowserJiuyangSeed=function()
  local out={applied=applied}
  for pid,row in pairs(SEED) do
   local p=JY.Person and JY.Person[pid];local ok=p~=nil
   local list={}
   for _,a in ipairs(row.arts) do
    list[#list+1]={slot=a[1],art=a[2],level=a[3]}
    if not p or p['武功'..a[1]]~=a[2] or p['武功等级'..a[1]]~=a[3] then ok=false end
   end
   for k,v in pairs(row.set) do if not p or p[k]~=v then ok=false end end
   if p and slotOf(p) then ok=false end
   out[tostring(pid)]={arts=list,set=row.set,present=ok}
  end
  return out
 end
end)()
