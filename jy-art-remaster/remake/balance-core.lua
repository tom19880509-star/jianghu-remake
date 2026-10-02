-- Data is generated from martial-balance.js by the normal build.
BrowserMartialBalance=(function()
 local data=(function()
-- BALANCE_DATA
 end)()
 local B={data=data,enabled=false,combat=nil,turns={},foreign={}}
 local function clamp(v,a,b)return math.max(a,math.min(b,v))end
 function B.cost(profile,apt,rank)
  local factor=clamp(1.7-clamp(apt,0,100)/100,.7,1.7)
  local steps=profile.costSteps or data.costSteps[profile.curve]
  return math.max(1,math.ceil(profile.baseCost*factor*steps[clamp(rank,1,#steps)]))
 end
 function B.install(on)
  B.enabled=on==true;B.combat=nil;B.turns={};B.foreign={}
  if not B.enabled then return end
  for id,art in pairs(data.skills) do
   local src=JY.Wugong[id]
   if src then
    local w={};for field in pairs(CC.Wugong_S)do w[field]=src[field]end
    w['消耗内力点数']=art.mpStep;w['敌人中毒点数']=art.poison
    if id==66 then w['武功类型']=1 end -- Flame Blade is projected palm force.
    for r=1,10 do w['攻击力'..r]=art.power[r]end
    JY.Wugong[id]=w
   end
  end
 end
 -- 张无忌(9)本命为七伤拳：拳诀得自谢逊（《倚天》回8，回21 光明顶施展）；原指的 92 九阳招式自 157 丙起威力归零。
 local affinities={[1]={[67]=true},[3]={[55]=true},[5]={[20]=true,[58]=true},[9]={[6]=true},[29]={[64]=true},[35]={[61]=true},[36]={[60]=true},[37]={[63]=true},[38]={[23]=true},[49]={[15]=true},[50]={[25]=true,[87]=true},[53]={[30]=true},[54]={[54]=true},[55]={[25]=true},[56]={[87]=true},[57]={[56]=true},[58]={[57]=true,[24]=true},[59]={[49]=true},[60]={[22]=true},[62]={[18]=true,[88]=true},[64]={[21]=true},[69]={[25]=true,[87]=true}}
 function B.affinity(pid,skill)
  if not B.enabled or BrowserGrowthIsEcho and BrowserGrowthIsEcho(pid) then return 0 end
  return affinities[pid] and affinities[pid][skill] and data.skills[skill] and data.skills[skill].damageType==0 and 15 or 0
 end
 function B.damage(pid,eid,skill,rank,power)
  if not B.enabled then return power end
  local actual=BrowserGrowthSkillRank and BrowserGrowthSkillRank(pid,skill) or rank
  if skill==18 and actual>10 and rank>=10 then power=data.skills[18].power[actual] end
  local cfg=BrowserGrowthBattleConfig and BrowserGrowthBattleConfig(pid)
  if cfg then
   local zixia=(B.turns[pid] or 0)>=2 and BrowserHeartRank(cfg,39)*.008 or 0
   local jiuyin=(cfg.internalRanks or skill==cfg.signature) and BrowserHeartRank(cfg,94)*.008 or 0
   power=power*(1+math.max(zixia,jiuyin))
  end
  return power*(1+B.affinity(pid,skill)/100)
 end
 -- 155 glancing blow. The source line (F-3*def)*2/3 is a cliff: below it every
 -- attacker gets the same Rnd(10)+1 floor, so attack, art rank and weapon fit
 -- return nothing against a well-defended opponent. This smooth lower branch
 -- 2*rate*F^3/(F+3def)^2 is strictly increasing in F and decreasing in defence.
 -- It equals rate*F/2 at F=3def and only wins while F < ~1.3*3def; above that
 -- the source line is larger and results are unchanged. A value, not a source
 -- figure. glanceRate=0 restores the source floor exactly.
 B.glanceRate=.2
 -- 155b: the branch exists to give the PLAYER's attack, rank and weapon investment a return.
 -- Whole-battle runs (qa/pacing155-party-wars-sim) showed that letting enemies glance too makes
 -- crowded first-journey fights harder than 154 (every foe that sat on the floor hits ~40% harder;
 -- 六大派 win rate 42% -> 19%, still 29% at half rate, 39% at zero). So on the lenient first journey
 -- enemies glance at firstJourneyEnemyGlance x the player's rate = 0: their damage is the 154
 -- result draw for draw. From the second journey on they use the full rate (first-batch symmetry).
 -- (.5 = half rate, 1 = symmetric everywhere.) enemyGlanceRate, when set, overrides every journey.
 -- glanceRate=0 still switches the whole branch off; the closed form keeps both sides monotone.
 B.firstJourneyEnemyGlance=0;B.enemyGlanceRate=nil
 function B.sideGlanceRate(ally)
  if ally or B.glanceRate<=0 then return B.glanceRate end
  if B.enemyGlanceRate then return B.enemyGlanceRate end
  local cycle=type(browser_journey_get)=='function' and tonumber(browser_journey_get('cycle')) or 1
  return cycle>=2 and B.glanceRate or B.glanceRate*B.firstJourneyEnemyGlance
 end
 function B.glance(fightnum,defence3,rate)
  rate=rate or B.glanceRate
  if not B.enabled or rate<=0 or fightnum<=0 then return 0 end
  local total=fightnum+math.max(0,defence3)
  return 2*rate*fightnum*fightnum*fightnum/(total*total)
 end
 -- 155: the rebalanced tables compress damage, so a carried 150-life potion is
 -- worth many more hits than in the source. Each non-party combatant may use
 -- only a few life potions per battle: one on the lenient first journey, two
 -- afterwards. enemyHealUses overrides (0 restores the unlimited source AI).
 B.enemyHealUses=nil;B.healUses={}
 function B.enemyHealBudget()
  if B.enemyHealUses then return B.enemyHealUses end
  local cycle=type(browser_journey_get)=='function' and tonumber(browser_journey_get('cycle')) or 1
  return cycle>=2 and 2 or 1
 end
 -- 155c: forced protagonist duels on the lenient first journey. A war whose war.sta
 -- roster is the protagonist alone (auto slot 1 = 0, every other auto and manual slot
 -- empty: 嵩山比剑 30-33, 梅庄 43-46, 乔峰 83, 慕容复 85, 武道大会 102-131, 圣堂
 -- 133/134, and the optional 灭绝 20, 张三丰 22, 白万剑 59, 郭靖 76) cannot lean on
 -- the party, while the protagonist grows only by levels and two practice slots.
 -- Whole-battle runs (qa/pacing155-hero-solo) had top-tier opponents drop a level-22
 -- protagonist in two blows (乔峰, 郭靖, 周伯通: gauntlet clear <=30% at any plan,
 -- 圣堂 1-v-10 0% even at level 30). There, on the first journey only, damage an
 -- opponent deals to the protagonist is multiplied by firstJourneySoloTaken; his own
 -- damage, experience and every other battle are unchanged. A value, not a source
 -- figure; 1 switches it off. Second journey on: source damage.
 B.firstJourneySoloTaken=.6
 function B.soloDuel()
  local d=WAR and WAR.Data
  if type(d)~='table' or d['自动选择参战人1']~=0 then return false end
  for i=1,6 do
   if i>1 and (d['自动选择参战人'..i] or -1)>=0 or (d['手动选择参战人'..i] or -1)>=0 then return false end
  end
  return true
 end
 -- 155d: 圣堂 1-v-10 (war133 十大恶人, war134 十大善人). Ten opponents strike between two of the protagonist's turns,
 -- so at x.6 a level-24 protagonist still dropped in two rounds (qa/pacing155-combat155d: 24级 达摩十级 0%). These two
 -- rosters use their own first-journey factor instead of firstJourneySoloTaken. firstJourneySoloTaken=1 still switches
 -- every forced-duel easing off; removing a war from this table gives it the shared factor again. A value, not a source figure.
 -- 155f: war134 (十大善人, 品德<=50) fields six rank-ten masters of 攻94-99 (郭靖/洪七公/乔峰 降龙, 周伯通 空明拳, 张三丰 太极,
 -- 黄蓉 打狗棍) where war133 has two real hitters (欧阳锋, 裘千仞): at x.35 the protagonist fell in round 1-5 at L26-32 with the
 -- salves unused (0/40 per cell). Under the 155e danger healing .1 matched war133 at x.35 level for level (L26 黑玉×10
 -- 90% vs 78%, L28-32 100%, 黑玉 5.6 vs 6.4 at L30; .12 gave 40/85/100%). qa/pacing155-combat155f, reviews/combat155f-*.
 B.firstJourneySoloTakenWar={[133]=.35,[134]=.1}
 -- 155g: 二周目起主角仍然要单挑同一批原版名单，但本作成长模式的顶就是 30 级、攻98/防100、满血 647。
 -- 圣堂 1 对 10 在 ×1 下，一个敌方回合就是 331（war133）到 647（war134）伤害：第 1-2 回合倒下，黑玉断续膏
 -- 来不及喝（每局 0.0 瓶），任何等级、招式、药量都是 0%（qa/pacing155-cycle2-20260918）。所以二周目起
 -- 用另一张表：通用 .7（一周目 .6）、圣堂 .5/.15（一周目 .35/.1），每一项都比一周目严，而且二周目还同时
 -- 背着敌方擦伤、回血 2 次、末级增幅与难度复原。值的落点选在“带完整传承过得去、不带过不去”上：
 -- 圣堂133 独孤九剑十级 100% 对 达摩剑法十级 0%；圣堂134 95% 对 15%；武道大会 26 级 85% 对 55%。
 -- 都是值，不是源数据；置 1 或留空即关掉该周目的减免。三周目及以后沿用这张表（难度加码走 difficultyFor）。
 B.laterJourneySoloTaken=.7
 -- 157：承前世武学后二周目敌方 ×1.10/×1.05（journey.js difficultyFor），圣堂134 也被乘上：满级主角（九阴＋九阳十重）
 -- 从 27/48 掉到 11/48。.15→.14 实测回到 26/48（editorial/多周目继承157.md 4.6，qa/inherit157-st134-n48-s1.json）。
 B.laterJourneySoloTakenWar={[133]=.5,[134]=.14}
 -- 395 S2/S4 归途终战：两段对我方任何人（含独行主角、含旧影出手）受击一律 ×homecomingTaken，不再按品德查圣堂 133/134 表。
 -- S4 台子（种子 1–24）：现行独行 5/24、带队 0–2/24 全是墙；×.3 时独行 23/24、强/中队 24/24 无人倒、弱队全胜但倒 4.8 人、药 12.8。
 -- 只是一个数，圣堂 war133/134 本身一个数不动；置 1 即关。标记由 echo-extension 的归途 stage() 在 WarMain 前后设置/清除。
 B.homecomingTaken=.3
 B.homecoming=false
 local function warSide(id)
  if not (WAR and WAR.Person) then return nil end
  for i=0,(WAR.PersonNum or 0)-1 do local u=WAR.Person[i];if u and u['人物编号']==id then return u['我方']==true end end
  return nil
 end
 function B.soloTaken(pid,eid)
  if B.enabled and B.homecoming and pid~=eid and (B.homecomingTaken or 1)<1 and warSide(eid)==true and warSide(pid)==false then return B.homecomingTaken end
  if not B.enabled or eid~=0 or pid==0 then return 1 end
  if BrowserGrowthIsEcho and BrowserGrowthIsEcho(pid) or not B.soloDuel() then return 1 end
  local cycle=type(browser_journey_get)=='function' and tonumber(browser_journey_get('cycle')) or 1
  local shared,wars
  if cycle>=2 then shared,wars=B.laterJourneySoloTaken,B.laterJourneySoloTakenWar
  else shared,wars=B.firstJourneySoloTaken,B.firstJourneySoloTakenWar end
  if (shared or 1)>=1 then return 1 end
  local war=WAR.Data['代号'];local own=wars and war and wars[war]
  return own or shared
 end
 -- 155d: 黑木崖 war54/57. With a party of about level 20 (six, or five plus 任我行) the whole-battle runs lost mostly
 -- to 东方不败 himself: about 75% of all enemy damage (葵花神功, area, acting first at 轻功99), then one full
 -- 天王保命丹. On the first journey damage he deals is multiplied by this factor; his life, defence, speed, potion and
 -- every other enemy stay as they are, and nothing is stored. Keyed by person: 东方不败 fights only in war54/57.
 -- .85 rather than .9: the real six of the 9/18 01:01 save lag the protagonist (13-19), and at +2 levels war54 was
 -- 12% -> 30% at .9 but 57% at .85 (qa/pacing155-combat155d). A value, not a source figure; an empty table (or 1)
 -- switches it off. Second journey on: source damage.
 B.firstJourneyFoeDealt={[27]=.85}
 function B.foeDealt(pid)
  local f=B.enabled and B.firstJourneyFoeDealt and B.firstJourneyFoeDealt[pid]
  if not f or f>=1 then return 1 end
  local u=WAR and WAR.Person and WAR.CurID and WAR.Person[WAR.CurID]
  if not u or u['人物编号']~=pid or u['我方']==true or BrowserGrowthIsEcho and BrowserGrowthIsEcho(pid) then return 1 end
  local cycle=type(browser_journey_get)=='function' and tonumber(browser_journey_get('cycle')) or 1
  return cycle>=2 and 1 or f
 end
 function B.hurt(pid,eid,hurt)
  if not B.enabled then return hurt end
  local cfg=BrowserGrowthBattleConfig and BrowserGrowthBattleConfig(eid)
  if BrowserHeartRank(cfg,43)>0 then hurt=hurt*(1-(cfg.yijinGuard or math.min(BrowserHeartRank(cfg,43),7)*.008))end
  if B.combat and B.combat.pid==pid and B.combat.dual then hurt=hurt*.75 end
  hurt=hurt*B.soloTaken(pid,eid)*B.foeDealt(pid)
  return math.max(1,math.floor(hurt))
 end
 function B.injury(eid,n)
  local c=BrowserGrowthBattleConfig and BrowserGrowthBattleConfig(eid)
  if B.enabled and BrowserHeartRank(c,42)>0 then return math.floor(n*(1-BrowserHeartRank(c,42)*.03))end
  return n
 end
 function B.poison(eid,n)
  n=math.min(6,n)
  local c=BrowserGrowthBattleConfig and BrowserGrowthBattleConfig(eid)
  if c then n=math.floor(n*(1-math.max(BrowserHeartRank(c,44)*.03,BrowserHeartRank(c,95)*.04)))end
  return n
 end
 function B.qi(pid)
  if not B.enabled then return 0 end
  return B.foreign[pid] or BrowserGrowthForeignQi and BrowserGrowthForeignQi(pid) or 0
 end
 return B
end)()
BrowserBalanceEnabled=function()return BrowserMartialBalance.enabled end
BrowserBalanceQi=function(pid)return BrowserMartialBalance.qi(pid)end

BrowserHeartRank=function(cfg,id)
 if not cfg then return 0 end
 if cfg.internalRanks then return cfg.internalRanks[tostring(id)] or 0 end
 return cfg.internal==id and cfg.internalRank or 0
end
