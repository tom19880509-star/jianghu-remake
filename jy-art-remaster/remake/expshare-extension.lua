-- EXPSHARE_EXTENSION : 多人战斗的**战斗基础经验**改为递减分配，不再平分（157）
--
-- Tom 2026-09-21：「目前多人战斗经验怎么分的？能不能像魔兽世界一样多人战斗单人获得经验递减
--                  但不是平分，而是每个人获得的经验略少一点。每多一人上场就略少一点。」
--
-- 量化依据、候选曲线、逐节点等级差与护栏实测：editorial/经验分配157.md。
-- 接线补丁（bridge.lua 占位 + build.mjs 清单）：reviews/expshare157-patch-suggestions.md，由主会话合。
--
-- ────────────────── 只改哪一段 ──────────────────
-- 一场战斗打完，每个人身上的经验由两部分组成：
--   ① **个人打击经验**（战斗中即时累加，**本层一个字不碰**）
--        jymain.lua:5286  War_Fight_Sub       每次出招 +2
--        jymain.lua:5793  War_WugongHurtLife  每次打中 +floor(伤害/5)     （本作由 combat-extension.lua:115 接管同式）
--        jymain.lua:5797  War_WugongHurtLife  打死敌人 +敌人等级×10        （同上 :119）
--        jymain.lua:5969  War_AnqiHurt        暗器命中 +1
--      另有 poisonmed-extension / thrown-extension 各自的加法，同样不碰。
--   ② **战斗基础经验**（战后一次性，只有胜利才有，**本层只改这一段**）
--        jymain.lua:4342-4351  每个我方 +math.modf(WAR.Data['经验'] / liveNum)
--
-- ────────────────── 做法与「为什么不会重复加」 ──────────────────
-- 基础经验在**整条链路上只有一个加法点**（上面 :4348 那一行），它读两样东西：`WAR.Data['经验']`
-- 与就地算出的 `liveNum`。本层因此**不自己加任何经验**，只在调用原版**之前**把 `WAR.Data['经验']`
-- 预乘成 `perHead × liveNum`，调用原版，再**还原**。原版那一行算出来的恰好是
--     math.modf( (perHead×liveNum) / liveNum ) = perHead = floor(基础池 × f(N))
-- 因为只是换掉那一行读到的数，**加法仍然只发生一次**；本层没有第二个写 `经验` 的地方
-- （全文件 grep `经验` 只有 `WAR.Data['经验']` 的读、写、还原三处）。
-- 还原是必须的：`WAR.Data` 是 war.sta 那张表，跨战斗复用；不还原会一场比一场放大。
-- 同一 `WAR.Data` 连续结算两次必须给出相同增量——`tests/expshare157-share.test.mjs` 钉住了这条。
--
-- ────────────────── liveNum 到底是什么（实测订正） ──────────────────
-- 注释与交接件常写「liveNum ＝ 我方存活人数」。**实测不是。**
-- 原版在算 liveNum 之前，先跑一段「我方人员参数恢复，**输赢都有**」（jymain.lua:4319-4328）：
--     if JY.Person[pid]['生命'] < JY.Person[pid]['生命最大值']/5 then
--        JY.Person[pid]['生命'] = math.modf(JY.Person[pid]['生命最大值']/5) end
-- 于是到 :4335-4339 时**每个上场同伴的 生命 都已经 >0**，liveNum **等于上场人数**，
-- 倒下的同伴照样拿满一份。唯一例外是 `生命最大值 < 5` 的退化人物（floor(/5)=0），本作没有
-- 这样的可入队同伴，但本层照样复刻，免得日后有人加了这种人物时口径分叉。
-- 这正好就是 Tom 说的「每多一人**上场**就略少一点」。
-- 本层在原版**之前**运行，那时回血还没发生，所以不能直接数 `生命>0`，必须按同一条式子
-- 复算「回血之后是否 >0」——`allyCount()` 就是那四行，与原版逐字对应。
--
-- ────────────────── 曲线 ──────────────────
--     每人所得 = floor( 基础池 × N^-k )      N ＝ 上场人数
--   k=1   ⇒ 六人 0.167，**与出厂逐位相同**（f(N)=1/N 就是平分）
--   k=0.7 ⇒ 六人 0.285，基础池全队总量 1.71×（温和，**本层落地档**）
--   k=0.5 ⇒ 六人 0.408，2.45×（中档）
--   k=0.2 ⇒ 六人 0.699，4.19×（Tom 口述的魔兽档）
--
-- **落地默认是 k=0.7 ＋ heroExempt=true**，理由是实测，不是偏好：
--   ·「所有人一起涨」的三档全部越难度口径。只要主角到武道大会前多 1 级，
--     一周目 war130（苗人鳳）就从 10/48 跳到 28/48（极难→健康）、
--     二周目 war116 从 13/48 跳到 23/48、war119 从 25/48 跳到 34/48。
--     不涨级的安全上界是 k=0.98——六人每人只多 4%，等于没做。
--   ·「主角照旧、只让同伴递减」在八个整队场上**一周目二周目胜率一格未动**，
--     保留率 +2~6pp；主角单挑格（圣堂 133/134、武道大会十场）面板一格没变，
--     结构上与出厂逐位相同。
-- 全套数据、判据与「没做的」见 editorial/经验分配157.md。
-- **k 与 heroExempt 都是平衡值，不是原著也不是 Tom 定死的数**：谁改了敌方底表、成长曲线
-- 或难度块，这两个旋钮要重新扫。Tom 的原话是「每个人」，heroExempt 与那句话有出入，
-- 报告第六节把这条差异明写给他定。
--
-- ────────────────── 存档 ──────────────────
-- 经验 与 修炼点数／物品修炼点数 本来就是正常游戏进程写入存档的字段。本层**只改「本场战斗结算时加多少」**：
-- 不读旧档、不回溯、不改任何已有数值，也不新增存档字段。对已有存档，下一场战斗起按新式子结算，
-- 之前攒下的点数原样保留。心得（修炼点数）是 `经验×8/10`（jymain.lua:4358-4360），所以**经验变多，
-- 心得同比变多**——这是本改动的主要副作用，不是意外，见报告第三节。
-- 两个上限由原版 AddPersonAttrib 兜着：经验 60000（＝ CC.Exp[30]）、修炼点数 32767（存档是有符号 16 位）。
;(function()
 -- Register before SetGlobal initializes JY; battle settlement runs afterwards.
 if type(War_EndPersonData)~='function' then return end

 local M={
  enabled=true,     -- 总开关。关掉时本层**完全不介入**（直接走原版），与出厂逐位相同。
  k=0.7,            -- f(N)=N^-k。k=1 即出厂平分。
  heroExempt=true,  -- 主角（人物编号 0）那一份是否照旧 floor(池/N)。
 }
 BrowserExpShare=M

 -- f(N)：一个人在 N 人上场的战斗里拿到基础池的几分之几。
 function M.factor(n)
  if type(n)~='number' or n<=1 then return 1 end
  return n^(-M.k)
 end

 -- 复刻原版 liveNum：**回血之后**仍然 生命>0 的我方人数（见文件头「liveNum 到底是什么」）。
 local function allyCount()
  if type(WAR)~='table' or type(WAR.Person)~='table' then return 0 end
  local n=0
  for i=0,(WAR.PersonNum or 0)-1 do
   local unit=WAR.Person[i]
   if unit and unit['我方']==true then
    local p=JY.Person[unit['人物编号']]
    if p then
     local life=p['生命']
     -- jymain.lua:4322-4324 逐字：低于 1/5 上限就抬到 floor(1/5 上限)。
     if life<p['生命最大值']/5 then life=math.floor(p['生命最大值']/5) end
     if life>0 then n=n+1 end
    end
   end
  end
  return n
 end

 local original=War_EndPersonData
 War_EndPersonData=function(isexp,warStatus,...)
  -- 只有「开关开着 ＋ 打赢了 ＋ 基础池是正数 ＋ 不止一人上场」这四条同时成立才介入；
  -- 任何一条不成立都原样放行，连 WAR.Data 都不碰。
  if not M.enabled or warStatus~=1 or type(WAR)~='table' or type(WAR.Data)~='table' then
   return original(isexp,warStatus,...)
  end
  local purse=WAR.Data['经验']
  if type(purse)~='number' or purse<=0 then return original(isexp,warStatus,...) end
  local n=allyCount()
  if n<=1 then return original(isexp,warStatus,...) end

  local perHead=math.floor(purse*M.factor(n))
  local shipShare=math.floor(purse/n)        -- 出厂那一份（＝原版 :4348 会算出来的数）
  if perHead==shipShare then return original(isexp,warStatus,...) end  -- 没有差别就一个字段都不碰

  -- ① 基础池预乘：原版 :4348 那一行算出来的就是 perHead。
  WAR.Data['经验']=perHead*n
  -- ② 主角豁免（heroExempt）：把差额从主角那个累加器里**先扣掉**，原版加完 perHead 之后
  --    他净得 shipShare。心得在 :4358-4360 读的是**同一个累加器**，所以自动跟着走，
  --    不需要第二次修正——加法仍然只发生一次。
  --    为什么要这个旋钮：实测三档曲线只要让主角到武道大会前多 1 级，一周目 war130 就从
  --    10/48 跳到 28/48、二周目 war116 从 13/48 跳到 23/48（越了难度口径）；
  --    而「主角照旧、只让同伴递减」在八个整队场上一周目二周目胜率一格未动。
  --    详见 editorial/经验分配157.md 第五、六节。
  local heroIdx,heroExp
  if M.heroExempt then
   for i=0,(WAR.PersonNum or 0)-1 do
    local u=WAR.Person[i]
    if u and u['我方']==true and u['人物编号']==0 then
     heroIdx,heroExp=i,u['经验']
     u['经验']=u['经验']-(perHead-shipShare)
     break
    end
   end
  end
  -- pcall 只为保证「无论原版走哪条路、出不出错，本层动过的两个字段一定还原」；错误原样抛回去。
  local ok,err=pcall(original,isexp,warStatus,...)
  WAR.Data['经验']=purse
  if not ok then
   if heroIdx then WAR.Person[heroIdx]['经验']=heroExp end
   error(err,0)
  end
 end
end)()
