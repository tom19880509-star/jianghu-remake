-- ARTFX_EXTENSION : 武学效果层 · 第一条载体（157，2026-09-21）
--
-- Tom 2026-09-21：「左冷禅原著里面学的是假辟邪剑法，所以还是不要让他用辟邪剑法了，
--                   他的寒冰掌法加点伤害和减速更符合原著吧。」
-- 本层只做那句话里的「减速」，而且**只做一条效果、只挂一个载体**（13 寒冰神掌）。
-- 规格照 editorial/武学效果v2-157.md 1.1 第 2 行「锁招（绊住脚）」与 1.4 概率式，一个字没改：
--   · 锁招 ＝ 移动步数 0，仍可原地出手／吃药／医疗（**不是点穴**，小签不许写「点穴」二字）
--   · p = clamp( p0(品第) × (0.55 + 0.05 × 名义重数) × 内力项 , 0 , 0.35 )
--     内力项 = clamp( ((攻方内力最大值+60)/(守方内力最大值+60))^1.5 , 0.15 , 1.60 )   ← 唯一抗性轴
--   · 门槛：名义重数 ≥8；一周目宽容：cycle<2 且施术者是敌方 且 名义重数≥10 ⇒ 重数按 9 计
--     （与 balance-combat.lua 的 plainTenth 同口径）
--   · 持续 ＝ 固定 1 次行动；解开后免疫 1 次行动；一场同一人被锁总次数 ≤3
--   · 被锁的这一次行动**不拿休息守势**（`poisonmed-extension.lua:196-201` 的 −35%）
--   · 敌我规则一致（Tom 已裁定敌人可以对主角用）
--
-- **原著依据（分档写清，不许编）**
--  · 效果的来处是**左冷禅的寒冰真气**：①档，`editorial/名角绝学补齐157.md:112` 与
--    `editorial/多武学分工157-原著分工.md:98` 两处独立记着同一条——《笑傲江湖》回27 少林寺，他以十余年
--    寒冰真气**故意让任我行吸去、再反灌天池穴令其冻僵**，回28 雪地发作。**「冻住穴道／冻僵」正是本效果
--    要表达的东西。**
--  · **〔待核〕**：本轮**没有原著文本可现场复核**（本机语料目录下查无《笑傲江湖》底本），上述两条是转引
--    项目内既有考据件；且 `名角绝学补齐157.md:383` 自己记着《笑傲》只有单一底本。**逐字短引留空，不编。**
--  · **载体是 13 寒冰神掌，不是寒冰真气**：项目已定这两条**不合并**
--    （`主要NPC武学逐人排查.md:30`、`martial-catalog-data.json` 的 `han-bing-zhen-qi` 条、
--     `品第与朱批157.md:576`）。13 这个名字本身是⑤档（旧版所造名，`武学效果v2-157.md:304`）。
--    **所以：效果的意象①档、载体与数值⑤档（本作设定）。图鉴文案必须照这个分档写。**
--  · 与 `武学效果v2-157.md` 的一处差异，写在明处：那份稿子给 13 的主效果是**余毒**（2.2 表第 304 行），
--    没有给它锁招；本层按 Tom 2026-09-21 的指令加上锁招作**次效果**，余毒那条不动（底表毒点 6 照旧）。
--
-- **约束**
--  · 自成 `;(function() … end)()` 闭包，**不进 `balance-combat.lua`**（主会话另一路正在那里实现
--    「按局面选招」`B.situPick`，会撞车），也不进 `poisonmed-extension.lua`（那个 do 块块尾只剩 4 个 local）。
--  · 战斗内状态表，**存档零影响**：只写 `WAR.Person[i]['移动步数']`（战斗结构），
--    `JY.Person` 一个字段都不碰。
--  · 总开关 `BrowserArtFx.enabled=false` ⇒ 与现状**逐位相同**（不建状态、不改步数、不碰守势、返回值原样）。
--  · **加载顺序要求**：本层必须排在 `-- POISONMED_EXTENSION` **之后**，否则「禁休息守势」那一条无效
--    （见下面 restMenu 的注释）。接线写在 reviews/zuoleng157-patch-suggestions.md。
;(function()
 if type(War_WugongHurtLife)~='function' then return end

 -- 载体表：武功代号 -> { p0=按品第的基准概率 }
 -- 13 寒冰神掌的品第 2026-09-21 由**寻常改判上乘**（回原著核实：回34 左冷禅自称「这是在下自创的掌法」；
 -- 所指之物「寒冰真气」回27／28／29／39 共 9 处，回27「一瞬之间，任我行全身为之冻僵」、回33「阴寒掌力十分厉害」、
 -- 回38 中者「手臂酸麻」——原 canonNote 的「作用待核」是明确错判，已改）。锁招上乘档 p0 = .21（`武学效果v2-157.md:156`）。
 -- 品第是显示轴、不是 tier；本层只跟着品第表走，不自设数值。
 -- ⚠ 连带：26 任我行也持本门十重且内力 860，他的锁招率涨得比左冷禅还多；而「任我行持寒冰神掌」本身已被
 -- `editorial/名角绝学补齐157.md:168` 判为原著错配，正另行处理，不在本层绕开。
 local FX={[13]={p0=.21}}

 local S={enabled=true,cap=.35,floor=0,minRank=8,lockCap=3,immune=1,lock=FX,
          mpLo=.15,mpHi=1.60,mpPow=1.5,mpPad=60,rankBase=.55,rankStep=.05}
 BrowserArtFx=S

 -- 战斗内状态（每场清空）：pid -> 下一次行动会被锁／剩余免疫次数／本场已被锁次数
 local locked,immune,count={},{},{}
 -- 「这一次行动正处在被锁状态」——只在该人的行动窗口内为真，用来禁掉这一次的休息守势
 local lockedNow=nil
 local inAction=false

 local function clampv(v,a,b) return math.max(a,math.min(b,v)) end
 local function mpOf(pid)
  local p=JY.Person[pid];return p and math.max(0,p['内力最大值'] or 0) or 0
 end
 local function isEcho(pid)
  return BrowserGrowthIsEcho~=nil and BrowserGrowthIsEcho(pid)==true
 end
 local function cycleNow()
  return type(browser_journey_get)=='function' and (tonumber(browser_journey_get('cycle')) or 1) or 1
 end
 local function actorIsFoe()
  local u=WAR and WAR.Person and WAR.CurID and WAR.Person[WAR.CurID]
  return u~=nil and u['我方']~=true
 end

 -- 概率式（1.4）。rank 是**名义重数**（武功等级/100+1），不是按内力降过的实际重数。
 BrowserArtFxChance=function(pid,eid,skill,rank)
  local row=S.enabled and skill and S.lock[skill]
  if not row or type(rank)~='number' then return 0 end
  if isEcho(pid) or isEcho(eid) then return 0 end
  local r=math.min(10,math.max(1,math.floor(rank)))
  if r<S.minRank then return 0 end
  -- 一周目宽容：与 balance-combat.lua 的 plainTenth 同口径，敌方十重按九重算
  if r>=10 and cycleNow()<2 and actorIsFoe() then r=9 end
  local mp=clampv(((mpOf(pid)+S.mpPad)/(mpOf(eid)+S.mpPad))^S.mpPow,S.mpLo,S.mpHi)
  return clampv(row.p0*(S.rankBase+S.rankStep*r)*mp,S.floor,S.cap)
 end

 BrowserArtFxState=function(pid)
  return {locked=locked[pid]==true,immune=immune[pid] or 0,count=count[pid] or 0}
 end

 local function reset()
  locked={};immune={};count={};lockedNow=nil;inAction=false
 end
 -- Clear lock/slow immediately when combat ends, not only at the next entry.
 local finishCombat=War_EndPersonData
 War_EndPersonData=function(...)
  local result=table.pack(finishCombat(...));reset()
  return table.unpack(result,1,result.n)
 end

 -- 每场战斗开头清空（WarSelectEnemy 是原版的战斗初始化入口，WarMain 与台子都走它）
 local sourceSelect=WarSelectEnemy
 if type(sourceSelect)=='function' then
  WarSelectEnemy=function(...)
   reset()
   return sourceSelect(...)
  end
 end

 -- 命中后掷锁。包在最外层的武功伤害上；只有真打出伤害才掷。
 local sourceHurt=War_WugongHurtLife
 War_WugongHurtLife=function(target,skill,level,...)
  local hurt=sourceHurt(target,skill,level,...)
  if not S.enabled or type(hurt)~='number' or hurt<=0 then return hurt end
  local u=WAR and WAR.Person and WAR.CurID and WAR.Person[WAR.CurID]
  local tu=WAR and WAR.Person and WAR.Person[target]
  if not u or not tu then return hurt end
  local pid,eid=u['人物编号'],tu['人物编号']
  local p=BrowserArtFxChance(pid,eid,skill,level)
  if p<=0 then return hurt end
  -- 免疫期内照样掷骰会白耗随机流，所以先看闸再掷：免疫、已锁、已到上限都直接不掷。
  if (immune[eid] or 0)>0 or locked[eid] or (count[eid] or 0)>=S.lockCap then return hurt end
  if Rnd(10000)<math.floor(p*10000) then
   locked[eid]=true;count[eid]=(count[eid] or 0)+1
  end
  return hurt
 end

 -- 行动入口：消耗锁 / 消耗免疫。锁招 ＝ 这一次行动走不动，但照常出手，所以**必须把行动透传下去**。
 -- War_Auto 与 War_Manual 都包（原版 WarMain 按「我方且手动」二选一调用）；inAction 防止台子里
 -- War_Manual→War_Auto 的转调把同一次行动算两遍。
 local function enterAction()
  if not S.enabled or inAction then return false end
  local u=WAR and WAR.Person and WAR.CurID and WAR.Person[WAR.CurID]
  if not u then return false end
  local pid=u['人物编号']
  if locked[pid] then
   locked[pid]=nil;immune[pid]=S.immune
   u['移动步数']=0;lockedNow=pid
   return true
  end
  if (immune[pid] or 0)>0 then immune[pid]=immune[pid]-1 end
  lockedNow=nil
  return true
 end
 local function leaveAction() lockedNow=nil end
 local function wrapAction(fn)
  return function(...)
   local mine=enterAction()
   if mine then inAction=true end
   local r=table.pack(pcall(fn,...))
   if mine then inAction=false;leaveAction() end
   if not r[1] then error(r[2],0) end
   return table.unpack(r,2,r.n)
  end
 end
 if type(War_Auto)=='function' then War_Auto=wrapAction(War_Auto) end
 if type(War_Manual)=='function' then War_Manual=wrapAction(War_Manual) end

 -- 禁掉「被锁的这一次行动」的休息守势。
 -- `poisonmed-extension.lua:196-201` 在它自己的 War_RestMenu 包裹里写 `if T.enabled then guard[pid]=true end`，
 -- guard 是它的 local，外面拿不到；能拿到的只有 `BrowserPoisonMedTuning`（＝它的 T）。
 -- 所以这里在调用内层之前把 T.enabled 暂时置 false、调用后立刻还原——**本层必须加载在 poisonmed 之后**，
 -- 否则这个包裹在它的内侧，它照样会把 guard 设上。
 -- 为什么要禁：`武学效果v2-157.md` 1.1 实测，单挑里 61–86% 的被锁回合会落进 War_RestMenu，
 -- 而护栏格里锁招全是**敌方点主角**，那道 −35% 是白送给主角的（＝把仗变简单，与本效果的方向相反）。
 local sourceRest=War_RestMenu
 if type(sourceRest)=='function' then
  War_RestMenu=function(...)
   local u=WAR and WAR.Person and WAR.CurID and WAR.Person[WAR.CurID]
   if not S.enabled or lockedNow==nil or not u or u['人物编号']~=lockedNow
      or type(BrowserPoisonMedTuning)~='table' then
    return sourceRest(...)
   end
   local was=BrowserPoisonMedTuning.enabled
   BrowserPoisonMedTuning.enabled=false
   local r=table.pack(pcall(sourceRest,...))
   BrowserPoisonMedTuning.enabled=was
   if not r[1] then error(r[2],0) end
   return table.unpack(r,2,r.n)
  end
 end
end)()

-- ============================================================================================
-- ARTFX_EXTENSION · 第二条载体（157，2026-09-22）：乾坤大挪移与斗转星移的「一部分反伤」
--
-- Tom 2026-09-22（本轮最高依据，**推翻了旧裁定「无凭空反伤」**）：
--   「乾坤大挪移和斗转星移应该带一部分反伤，这样符合原著。
--     如果做成转移伤害又太复杂。还是反伤好做。」
--
-- **原著依据（分档写清，短引 ≤15 字，查不实一律〔待核〕，不许编）**
--  语料：《倚天屠龙记》40 回本 `scratchpad/yt/01.txt`–`40.txt`（＋41 后记）；
--        《天龙八部》50 回本 `scratchpad/tlclean/tl01.txt`–`tl50.txt`（本轮逐回去换行后重数）。
--        两部都属**通行本体系的网络电子本**，新修版与连载版本轮一处也没查到 ⇒
--        **版本状态一律〔待核〕**，不得写成「三个版本都有」（口径同 editorial/欧阳锋武学考157.md）。
--
--  · **乾坤大挪移＝引已发之劲（①档，一手核到）**
--    《倚天》回19「祸起萧墙破金汤」：叙述者解说此功先激发自身潜力，再「**牵引挪移敌劲**」，
--    说起来也只是「**四两拨千斤**」；同回杨逍以一敌五时「**并不出多少力气**」，只把韦一笑与四散人的
--    掌力互相引去，自己「**隔山观虎斗**」。⇒ **这门功夫的力从对手来，不从自己来**，正是本层的上界规矩。
--    《倚天》回22「群雄归心约三章」：宋青书四式「花开并蒂」尽数打在自己身上，原文写它们均给张无忌以
--    乾坤大挪移功夫「**挪移到了他自己身上**」。
--    ⇒ **「还到出手人自己身上」在原著里有一手实写**，不是只会转嫁第三者。旧裁定
--    （`martial-balance.js` books[92].effect「本作只做减伤、不做反伤……引劲伤人本作尚未实现」）
--    说的是「本作尚未实现」，不是「原著没有」；本轮把这一半补上。**那句文案须改，见
--    reviews/reflect157-patch-suggestions.md（本层不动 martial-balance.js）。**
--  · **别把它做成压过九阳的东西（①档，一手核到）**
--    《倚天》回20 叙述者写天下诸般内功「**皆不逾九阳神功之藩篱**」；同回又把练九阳比作
--    「**积蓄山洪**」、把练乾坤大挪移比作「**凿开宣泄的通道**」，一难一易；
--    并点明创制此心法的高人内力虽强，却「**未到相当于九阳神功的地步**」。
--    ⇒ 本层**七层封顶 7/50 = .14，低于九阳护体反震 thornInnerRate = 3/20 = .15**，这是硬约束。
--  · **七层，不是九层（项目既有定案，与 catalog 一致）**：回20 张无忌留下一十九句不练，
--    原文点明那十九句是那位高人「**单凭空想而想错了的**」。`martial-balance.js` 里 `Object.assign(books[92],{maxRank:7,…})` 的
--    七层设定 与 `martial-catalog-data.json` 的 `qian-kun-da-nuo-yi` 都已按七层写。
--  · **斗转星移＝借力打力、反击到对方自身（①档，一手核到）**
--    《天龙》回33「奈天昏地暗 斗转星移」：原文说姑苏慕容家这门绝技是「**借力打力之技**」，
--    外人只见「**以彼之道，还施彼身**」；不论对方使什么功夫，都能转移力道、「**反击到对方自身**」；
--    其中道理「**全在反弹两字**」，并以石墙作比——「**出手越重，拳头上所受力道越大**」。⇒ **回敬量与这一击的伤害成正比**，正是本层的比例式。
--  · **慕容复本人做不满（①档，一手核到，也是本层唯一的原著级破绽）**
--    同回：他「**未能臻至登峰造极之境**」，遇上丁春秋这等第一流高手，
--    他便「**无法…反拨回去伤害对方**」，只能转嫁给旁边的星宿弟子。
--    回36 又写这门功夫「**并不多使自力**」，接虚竹与童姥的下堕之力时他自己一交坐倒。
--    ⇒ 本层的**内力项只减不增**（上夹 1）：对方内力越高于他，回敬比例越低；
--      他内力 242 是圣堂十恶里最低的一个，对后期主角（978）只剩基准的约六分之一。
--  · **不做万能反伤（项目既有底线，本轮考据支持）**：少林藏经阁那一场萧峰的降龙掌力
--    与慕容复的斗转星移被扫地僧隔开，「能不能接住顶级掌力」原著**故意没打完**
--    （`editorial/毒医暗器与护体线157.md` 4.2；`武学专精与相辅设计.md:236` 早有同一条底线）。
--    本层因此给了三道闸：内力项、`cap`（攻方生命最大值的 1/20）、「不超过这一击」。
--  · **「推气换劲」「还施水阁」「琅嬛」三个词本层与文案一律不用**（`毒医暗器与护体线157.md`
--    3B-7／4.4 已判二手待核）；回33 那段「**转移到了另一人身上**」是一手的，但本轮**不做转嫁**
--    （Tom：转移伤害太复杂）。
--
-- **形态选择：斗转星移走 (c) 人物专属状态，不走 (a) 秘籍、不走 (b) 运行时武功条目**
--  ① 原著就是人物专属：回33 写慕容复「**得父亲亲传**」，父子在参合庄地窖里秘密苦练拆招，外人全无知闻。做成谁都能捡的秘籍反而离原著更远。
--  ② (b) 的先例（93 家传辟邪剑招，`reviews/art157-family-sword.md`）要动 growth-extension.lua
--     建条目、要 balance 曲线、要获取事件；而 `editorial/毒医暗器与护体线157.md` 4.4 已查明
--     「还施水阁」全项目零命中＝**新场景**，且 `editorial/慕容复彩蛋157.md` 的范围由 Tom 原话
--     限定为「结拜／抗辽／成婚」三件，**加一门可练武学是扩范围，须先报 Tom**。本层不扩。
--  ③ (c) 零新条目、零新事件、零新存档字节，且**敌我一致自动成立**：慕容复 51 在圣堂 133 与
--     war85 是敌人，在彩蛋线里入队是我方，同一条按人物编号的规则两边同时生效。
--     `martial-catalog-data.json` 的 `dou-zhuan-xing-yi` 仍保持 nativeSkillId／nativeBookId 为 null
--     ——**本层没有给它建武功号或秘籍号，那两个 null 仍然是实话，不必改**。
--
-- **规格**（2026-09-22 第二轮：合并规则由「取大」改为「叠加 ＋ 两道总上限」）
--   合计反伤 = min( Σ各通道比例项 , floor(攻方生命最大值 × cap) , floor(这一击伤害 × rateCap) )
--   本层 rate = 载体基准 × 内力项
--     载体基准：乾坤大挪移 = 层数 × 1/50（1..7 层 ⇒ .02/.04/.06/.08/.10/.12/.14）
--               斗转星移   = 1/5（慕容复 51 本人；绝学档，与软猬甲同档基准）
--               同一人兼有两者时**相加**
--     内力项   = clamp( ((守方内力最大值+60)/(攻方内力最大值+60))^1.5 , .15 , **1** )
--               ← 与 1.4 节锁招那条同式同常数，唯一差别是**上夹 1：只减不增**
--   门槛与门：与软猬甲反震同一套——贴身一格、守方还站着、攻方还站着、双方不同边。
--   **与软猬甲／护体内功反震：叠加**（Tom 2026-09-22 第二轮：「反伤可以叠加。」）。
--     实现：本层读「攻方这一击已经掉了多少血」＝内层已取走的那一份，把自己那一份**加上去**，
--     合计被两道上限接住后只补差额。不复算 poisonmed 的公式，所以那三个比例值怎么改本层自动跟随。
--   **两道总上限各管一件事**：
--     · `cap`（攻方生命最大值 × 1/20，**跟随 thornCap，一个数都不抬**）管绝对值，
--       防「一击把攻方打掉一大截」。这条与这一击由几条通道产生无关，所以叠加只发生在比例那一层；
--       上限咬到的那些格与合并之前**逐位相同**。
--     · `rateCap`（这一击 × 1/4）管比例，防「三条通道加起来把这一击还回去一大半」。
--       它严格 > 全表最大的单条通道 .20 ⇒ **只带一条通道的人逐位不变**；
--       .20＋.14＝.34 被接成 .25，叠加仍比单穿软猬甲多两成五。
--       **它是实测出来的最小收口值**：不设它时二周目圣堂 134 late+ 从 12/144 抬到 20/144（+2.4σ，踩线），
--       收到 1/4 回到 11/144；收到 1/5 则乾坤在穿软猬甲时加成归零，等于把「可以叠加」作废。
--   ⚠ **护栏不再是恒等式**：取大时期「合计上界恒等于最大的那一条」是结构保证；叠加之后
--     守住二周目护栏的是 `rateCap` 这一个常数。谁要动它、或动 poisonmed 的三个比例值、
--     或动 `bookStep`，都**必须重跑 editorial/反伤157.md 5.5 那两格**。
--   **品第**：两门在 `martial-catalog-data.json` 里都是 `grade: juexue`，所以品第**不区分**它们；
--     区分靠层数（乾坤）与人物（慕容复）。这与「品第只影响效果不影响伤害」不冲突——
--     本层改的是效果强度，一个伤害数都没碰。
--
-- **约束**
--  · 自成闭包，**不进** poisonmed／balance-combat／toosimple，只**读** `BrowserPoisonMedTuning.thornCap`。
--  · 本层**不掷骰**：反伤是确定值（与软猬甲同性质），所以开关开关都不动随机流，A/B 可直接并读。
--  · 战斗内状态只有两张计数表（探针用），`WarSelectEnemy` 进场清、`War_EndPersonData` 出场清；
--    落到存档的只有 `生命`（与软猬甲反震同一条既有路径），**没有任何新存档字段**。
--  · 总开关 `BrowserArtReflect.enabled=false` ⇒ 与现状**逐位相同**（直接透传，不读血、不写表）。
--  · 加载顺序：本块排在上面的锁招块之后、因而也在 `-- POISONMED_EXTENSION` 之后，
--    这是「读得到软猬甲已经取走多少」的前提。bridge.lua:693-694 现状已满足，不必改接线。
;(function()
 if type(War_WugongHurtLife)~='function' then return end

 local S={enabled=true,
  book=92,bookMax=7,bookStep=1/50,        -- 乾坤大挪移：秘籍 92，七层，每层 1/50
  murong=51,murongRate=1/5,               -- 斗转星移：慕容复本人
  mpLo=.15,mpHi=1,mpPow=1.5,mpPad=60,     -- 内力项，只减不增
  cap=1/20,                               -- 绝对上限：攻方生命最大值的一份（与 thornCap 同口径）
  -- **合计比例上限**（叠加的那道总上限，Tom 2026-09-22 第二轮裁定要求「给出并实现总上限」）：
  -- 合计反伤不得超过这一击的四分之一。真正会咬人的是比例这一层，不是 cap 那一层
  -- （editorial/反震上限157.md 已证 cap 在 boss 身上从不生效）。
  -- **为什么取 1/4**：
  --  ① 它必须 **> 全表最大的单条通道 .20（软猬甲）**，否则这道总上限会反过来削已有的软猬甲，
  --     那是越界改别人的东西。1/4 是 .20 之上最小的四分之一档，**任何单条通道都碰不到它**
  --     ⇒ 只带一条通道的人，行为与合并之前**逐位相同**。
  --  ② 它给叠加留了实打实的空间：软猬甲 .20 ＋ 乾坤七层 .14 ＝ .34 被接成 .25，
  --     比单穿软猬甲仍多两成五，叠加看得见。
  --  ③ 它是实测出来的最小收口值：不设上限时二周目圣堂 134 late+ 从 12/144 抬到 20/144
  --     （+5.6pp，+2.4σ，**踩「二周目不得变弱」那条线**）；收到 1/4 回到 3/48＝base；
  --     再收到 1/5 则乾坤在穿软猬甲时加成归零，等于把 Tom 的「可以叠加」作废。
  --     逐格数字见 editorial/反伤157.md 6.6。
  rateCap=1/4,
  reach=1}
 -- 绝对上限跟着 poisonmed 的 thornCap 走：157 已专题扫过那个值并裁定不动
 -- （editorial/反震上限157.md），这里只跟随，不另立一个数。
 if type(BrowserPoisonMedTuning)=='table' and type(BrowserPoisonMedTuning.thornCap)=='number' then
  S.cap=BrowserPoisonMedTuning.thornCap
 end
 BrowserArtReflect=S

 -- 战斗内计数（只读探针与仿真台用；不落存档，每场清空）
 local hits,paid={},{}

 local function clampv(v,a,b) return math.max(a,math.min(b,v)) end
 local function mpOf(pid)
  local p=JY.Person[pid];return p and math.max(0,p['内力最大值'] or 0) or 0
 end
 -- 载体基准：只问「这个人会不会」，**一个字都不问他在哪一边**（敌我一致）。
 -- 乾坤大挪移的层数读 growth 的 learnedBooks（BrowserHeartRank），所以二周目的「神秘人」
 -- （echo-extension 把上一周目的成长记录挂到敌方身上）持有它时照样反伤给玩家。
 local function baseRate(pid)
  local r=0
  if pid==S.murong then r=r+S.murongRate end
  if type(BrowserHeartRank)=='function' and type(BrowserGrowthBattleConfig)=='function' then
   local rank=BrowserHeartRank(BrowserGrowthBattleConfig(pid),S.book) or 0
   rank=math.min(S.bookMax,math.max(0,math.floor(rank)))
   if rank>0 then r=r+rank*S.bookStep end
  end
  return r
 end

 -- 只读查询：pid 的反伤比例。aid 省略（或非数字）时报**基准**，不带内力项。
 BrowserArtReflectRate=function(pid,aid)
  if not S.enabled then return 0 end
  local base=baseRate(pid)
  if base<=0 then return 0 end
  if type(aid)~='number' then return base end
  return base*clampv(((mpOf(pid)+S.mpPad)/(mpOf(aid)+S.mpPad))^S.mpPow,S.mpLo,S.mpHi)
 end
 BrowserArtReflectState=function(pid)
  return {hits=hits[pid] or 0,paid=paid[pid] or 0}
 end

 local function reset() hits={};paid={} end
 if type(War_EndPersonData)=='function' then
  local finishCombat=War_EndPersonData
  War_EndPersonData=function(...)
   local r=table.pack(finishCombat(...));reset()
   return table.unpack(r,1,r.n)
  end
 end
 if type(WarSelectEnemy)=='function' then
  local sourceSelect=WarSelectEnemy
  WarSelectEnemy=function(...)
   reset()
   return sourceSelect(...)
  end
 end

 local sourceHurt=War_WugongHurtLife
 War_WugongHurtLife=function(target,skill,level,...)
  if not S.enabled then return sourceHurt(target,skill,level,...) end
  local u=WAR and WAR.Person and WAR.CurID and WAR.Person[WAR.CurID]
  local tu=WAR and WAR.Person and WAR.Person[target]
  if not u or not tu then return sourceHurt(target,skill,level,...) end
  local aid,pid=u['人物编号'],tu['人物编号']
  local ap,dp=JY.Person[aid],JY.Person[pid]
  if not ap or not dp then return sourceHurt(target,skill,level,...) end
  -- 攻方在这一击之前的血。内层链（含 poisonmed 的软猬甲／护体反震）只会从这里扣，
  -- 所以调用前后的差，就是这一击已被别的反震通道取走的那一份——不复算它的公式。
  local before=ap['生命'] or 0
  local hurt=sourceHurt(target,skill,level,...)
  if type(hurt)~='number' or hurt<=0 then return hurt end
  if u['我方']==tu['我方'] then return hurt end            -- 同一边（左右互搏之类）不反伤
  if (dp['生命'] or 0)<=0 then return hurt end             -- 守方已经倒下，引不动劲
  if (ap['生命'] or 0)<=0 then return hurt end             -- 攻方已被软猬甲反震打倒，不再补刀
  if math.abs((u['坐标X'] or 0)-(tu['坐标X'] or 0))
    +math.abs((u['坐标Y'] or 0)-(tu['坐标Y'] or 0))>S.reach then return hurt end
  local rate=BrowserArtReflectRate(pid,aid)
  if rate<=0 then return hurt end
  local want=math.floor(hurt*rate)
  local taken=math.max(0,before-(ap['生命'] or 0))
  -- **叠加**（Tom 2026-09-22 第二轮裁定，推翻上一轮的「取大」）：比例项相加。
  local total=taken+want
  -- 合计总上限。**用的还是 thornCap 那一个数，不是每条通道各给一份**：
  -- 这条上限防的是「一击把攻方打掉一大截」（editorial/反震上限157.md §5-2），
  -- 它关心攻方的存活，与这一击由几条通道产生无关，所以叠加只发生在比例项那一层，
  -- 绝对值那一层一个数都不抬 —— 上限咬到的那些格与合并之前逐位相同。
  local cap=math.floor((ap['生命最大值'] or 0)*S.cap)
  if cap>0 and total>cap then total=cap end
  local share=math.floor(hurt*math.min(1,S.rateCap))       -- 备用收口：合计占这一击的比例上限
  if total>share then total=share end                      -- 不凭空生力：合计绝不超过这一击
  local extra=total-taken
  if extra<=0 then return hurt end
  local real=-AddPersonAttrib(aid,'生命',-extra)
  hits[pid]=(hits[pid] or 0)+1;paid[pid]=(paid[pid] or 0)+real
  -- 记账与软猬甲反震同一套（poisonmed-extension.lua 的 thorn 段，现为 :242-253）：回敬的五分之一记经验，
  -- 反伤致死再补一份击杀经验。tu['经验'] 是战斗结构，不落存档。
  tu['经验']=(tu['经验'] or 0)+math.floor(real/5)
  if (ap['生命'] or 0)<=0 then
   ap['生命']=0;tu['经验']=tu['经验']+(ap['等级'] or 0)*10
  end
  return hurt
 end
end)()
