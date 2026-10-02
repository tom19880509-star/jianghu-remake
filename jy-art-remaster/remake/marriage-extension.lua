-- 157 多周目婚姻（考据与设计：editorial/多周目婚姻157.md；需别人配合的接线：reviews/marriage157-patch-suggestions.md）
-- 只新增本层自有的全局与一个存档位标：不改原版脚本、不新增事件号、不新增存档字段、不加任何数值加成。
--
-- 三条口径都直接沿用现成的东西，不另造一套：
--   ① 「关系达到最高」＝好感层自己的满好感判据。读 BrowserAffinityLegacy(pid) 的 {value,max}，
--      要求 value>=max（growth-extension.lua 的 RULES.max=100，即「生死之交」那一档）；
--      这与该层 check() 里的 need(r.value>=RULES.max,'好感未满…') 和 canInvite 用的是同一个数，
--      本层不自带阈值、不自带计数，好感层若未合并则恒无候选。
--   ② 「多周目才开放」＝ browser_journey_get('cycle')>=2 且 browser_journey_get('trial')~=true。
--      journey.js newJourney() 里非试玩一支写着 cycle=highestClearedCycle+1 且 highestClearedCycle<1 直接抛错，
--      engine.js 首页那一行也写着 disabled: journeyProfile.highestClearedCycle<1——
--      所以「cycle>=2 且非试玩」等价于「至少已正式通关一次」，即第二程起。
--      试玩分支（trial/chapter）同样拿 cycle=2，必须由 trial 这一条挡掉，否则独立试玩里也能成亲。
--   ③ 「一程只能娶一个」＝位标一经写入就不再接受第二次；新周目由 LoadRecord(0) 重读原版 alldef.grp，
--      位标自然归零，所以「一程一次」不需要任何清理代码。
--
-- D 位标：南贤居(64) 事件格 185 第8栏。
--   · 原版该格十一栏全为 0（tests/marriage157-vows.test.mjs 逐栏读 data/alldef.grp 断言）；
--   · 场景 64 的地图第3层只指向 0/1/2 三格，没有任何格子指向 185（同测试断言）；
--   · 引擎只在第2栏>0 时才把一格列入「附近」，本层只写第8栏。
--   · 已占用的邻居：199 身世、198 易筋、197 田伯光。本层取 185，与那一串递减序号拉开距离，
--     免得与并行的林平之／慕容复／黑化线三个子任务撞位。
--   存法：第8栏 ＝ 配偶人物编号 + 1（0 ＝ 本程未婚）。婚姻对象要存的是一个人物编号而不只是一个位，
--   这里用「pid+1」让同一个 int16 同时记住「有没有」与「是谁」：不占第二格、不新增存档字段，
--   D 表本来就是定长 440000 字节随存档保存，compat155-saves 的字节布局一字不动。
--
-- 入口在小虾米居(70)：由 homestead-extension.lua 的家园菜单按「可选层自带一行、自带处理函数」的现成办法追加
--   （与 garden-extension 的 BrowserGardenMenu 同法，补丁见 reviews/marriage157-patch-suggestions.md）。
--   本层不包 oldCallEvent、不接管任何原版事件，因此不会挡住排在后面的任何一层。
--
-- 名单的依据逐条写在 editorial/多周目婚姻157.md 第二节，可婚三人、明确禁止六人、待 Tom 裁定三人。
-- 本层只认白名单 BRIDES：底表的「性别」栏不足以判（东方不败在本作底表里记作性别 1，原著是男子；
-- 金花婆婆记作性别 0，原著是女子且是韩千叶之妻），所以性别栏只作附加条件，谁能娶一律看白名单。
BrowserMarriageSpouse=false
BrowserMarriageCheck=false
BrowserMarriageLabel=false
BrowserMarriageMenu=false
;(function()
 local REG_SCENE,REG_SLOT,REG_FIELD=64,185,8
 local HOME=70                                     -- 小虾米居

 -- ===== 一、可婚三人（原著出现过、全书未写婚配；依据见 editorial/多周目婚姻157.md 第二节）=====
 --  2 程灵素《飞狐外传》：与胡斐以兄妹相称，全书未写婚配，为救胡斐吸毒而亡。
 -- 25 蓝凤凰《笑傲江湖》：五仙教（本作称五毒教）教主，全书未写她与任何人婚配。
 -- 63 程英 《神雕侠侣》：与杨过、陆无双结为义兄妹，终身未嫁，晚年与陆无双隐居。
 local BRIDES={[2]=true,[25]=true,[63]=true}

 -- ===== 二、不可婚：原著已有伴侣，或另有原著明写的障碍（后者标〔待Tom裁定〕，本层一律不放行）=====
 -- 这些句子是玩家真会看到的一行旁白，写成「你没有说出口」，不替角色编台词、不给谁安排原著没有的关系。
 local WHY={
  [6]='灭绝师太出身佛门、是峨嵋掌门，与孤鸿子的婚约也随他一同断了。这一句你没有说出口。',
  [15]='金花婆婆当年千里奔走，为的是她自己的丈夫。这一句你没有说出口。',
  [17]='王难姑是蝶谷医仙胡青牛的妻子。这一句你没有说出口。',
  [21]='定闲师太是出家人，一生只有恒山。这一句你没有说出口。',
  [27]='东方不败不是女子，那一位的事也不在此列。这一句你没有说出口。',
  [47]='阿紫的心思一直在别处，那件事还没有着落。这一句你没有说出口。',
  [56]='黄蓉是郭大侠的妻子。这一句你连想也没有想。',
  [59]='小龙女是杨过的妻子。这一句你连想也没有想。',
  [66]='瑛姑等的那个人在百花谷，她已经等了几十年。这一句你没有说出口。',
  [76]='王语嫣心里装着的是另一个人，早有归处。这一句你没有说出口。',
 }

 local function narrate(t) if type(DrawStrBoxWaitKey)=='function' then DrawStrBoxWaitKey(t) end end
 local function head(pid) local p=JY.Person[pid];return (p and p['头像代号']) or pid end
 local function hero(t) TalkEx(t,0,1) end
 local function her(pid,t) TalkEx(t,head(pid),0) end
 local function name(pid) local p=JY.Person[pid];return (p and p['姓名']) or ('第'..pid..'人') end
 local function choose(rows) return ShowMenu(rows,#rows,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE) end
 local function confirm(t) return DrawStrBoxYesNo(-1,-1,t,C_WHITE,CC.DefaultFont)==true end
 local function inTeam(pid)
  for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then return true end end
  return false
 end

 -- 位标读写：第8栏 ＝ 配偶人物编号 + 1。
 local function mark()
  if type(GetD)~='function' then return 0 end
  local v=GetD(REG_SCENE,REG_SLOT,REG_FIELD)
  return (type(v)=='number' and v>0) and v or 0
 end
 local function spouse() local v=mark();return v>0 and (v-1) or nil end
 local function setSpouse(pid) if type(SetD)=='function' then SetD(REG_SCENE,REG_SLOT,REG_FIELD,pid+1) end end

 -- 多周目：非试玩且 cycle>=2。跨层一律 rawget 探测，未接入 journey 层时恒为 false。
 local function multiCycle()
  local get=rawget(_G,'browser_journey_get')
  if type(get)~='function' then return false end
  if get('trial')==true then return false end
  return (tonumber(get('cycle')) or 1)>=2
 end

 -- 满好感：直接问好感层，不自带阈值。好感层未合并、旧档无好感记录时返回 nil ＝ 无候选。
 local function full(pid)
  local read=rawget(_G,'BrowserAffinityLegacy')
  if type(read)~='function' then return false end
  local ok,r=pcall(read,pid)
  if not ok or type(r)~='table' then return false end
  return type(r.value)=='number' and type(r.max)=='number' and r.max>0 and r.value>=r.max
 end

 -- ===== 三、判定 =====
 -- 返回 ok, reason。reason 是给玩家看的一行；测试也直接读它。
 local function check(pid)
  if not multiCycle() then return false,'这一程还轮不到想这些。' end
  local p=JY.Person[pid]
  if not p then return false,'此人不在江湖上。' end
  local married=spouse()
  -- 已婚之后再遇到别人：先答这一条，所以玩家看到的是「已有约在先」，而不是那个人的考据理由。
  if married~=nil then
   if married==pid then return false,'你与'..name(pid)..'已经是一家人了。' end
   return false,'你与'..name(married)..'已有约在先。'..name(pid)..'的事到了嘴边，你只说了句别的。'
  end
  if JY.Person[0]['性别']~=0 then return false,'你已走上另一条路，这件事不必再提。' end
  if WHY[pid] then return false,WHY[pid] end
  if p['性别']~=1 then return false,'此人并非女子。' end
  if not BRIDES[pid] then return false,'这一位的归宿，原著里没有定准；本作也不替她定。' end
  if not full(pid) then return false,name(pid)..'与你还不到生死之交。' end
  if not inTeam(pid) then return false,name(pid)..'此刻不在你身边。' end
  return true,nil
 end
 BrowserMarriageCheck=check
 BrowserMarriageSpouse=function() return spouse() end

 -- ===== 四、三场提亲。都写得克制：她们各自原著里的那个人没有被抹掉，也没有被点名。=====
 local VOWS={}

 VOWS[2]=function()
  narrate('程灵素正在碾药。药碾一来一回，声音很匀。')
  hero('灵素，有一句话我想了很久。')
  her(2,'你想很久的话，多半不是好话。')
  hero('这一句是。我想请你留下来——不是替我配药，是同我过日子。')
  narrate('她把碾里的药碾完了，才停手抬头。')
  her(2,'我相貌平常，脾气也不好，会的只有药。你想清楚了？')
  hero('想清楚了。')
  her(2,'那我也同你说清一件事。我从前有过一个人，那件事我没有忘，也不打算忘。')
  hero('我没让你忘。')
  narrate('她把碾好的药倒进纸包，折了三折，收进袖里，手稳得和平日一样。')
  her(2,'好。那就这样。')
 end

 VOWS[25]=function()
  narrate('蓝凤凰在院里晒她那几只竹筒，一只一只摆开，像摆棋。')
  hero('凤凰，我想同你成亲。')
  her(25,'（笑）你可知道跟我们苗家的女子成亲是什么规矩？')
  hero('不知道。你说。')
  her(25,'规矩是女子自己选。选中了是一辈子，选错了也是一辈子，没人替你改口。')
  narrate('她解下腰间一只小竹筒，倒出半盏，自己先喝了一口，把剩下的推过来。')
  her(25,'喝了这半盏，我的毒、我的虫、我教里那些麻烦事，往后都有你一份。')
  narrate('你接过来喝了。酒里有股说不上来的辛味，下喉却是暖的。')
  her(25,'好。往后苗疆那条路上，没人敢拦你。')
 end

 VOWS[63]=function()
  narrate('程英在窗下写字。见你进来，伸手把纸按住了。')
  hero('写的什么？')
  her(63,'旧句子。八个字，写过很多遍了。')
  narrate('你没有去看。她自己把纸折起来，压在砚台底下。')
  hero('程姑娘，我想请你嫁给我。')
  narrate('她把笔搁回笔山上，过了好一会儿才开口。')
  her(63,'你知道那八个字是写给谁的。')
  hero('知道。我没有要你把它烧了。')
  her(63,'……我也不打算烧。')
  narrate('她推开半扇窗。风把砚台底下那张纸的边角掀起来，又落回去。')
  her(63,'那就一起过罢。日子长，慢慢写别的。')
 end

 -- 婚后在院中坐一会儿。只有一句，没有数值、没有加成、不改队伍、不改任何人物字段。
 local AFTER={
  [2]='程灵素在廊下分药。她把治刀伤的一格挪到最上面，说这样你伸手就够得着。',
  [25]='蓝凤凰把竹筒挨个翻了个面，说日头好，虫子也要晒。她没回头，却知道你站在门口。',
  [63]='程英在院里煮水。水开了她也不急着提，只说再等一会儿，味道才出得来。',
 }

 local function together(pid)
  narrate(AFTER[pid] or (name(pid)..'在院中做着自己的事。你没有打扰，只在檐下坐了一会儿。'))
 end

 local function propose(pid)
  local ok,why=check(pid)
  if not ok then narrate(why);return end
  if not confirm('向'..name(pid)..'提亲？这一程只此一次，此后不再向旁人开口。') then return end
  local again=check(pid)                            -- 确认框之间不该有变化，仍再查一次
  if not again then return end
  VOWS[pid]()
  setSpouse(pid)
  narrate('这一程的江湖还长，只是往后回到这院子，总有个人在。')
 end

 -- ===== 五、家园菜单里的一行 =====
 local function here() return JY.SubScene==HOME and JY.Status==GAME_SMAP and multiCycle() end

 -- 队中所有女眷（按底表性别栏）且已满好感者。列出来而不是只列可婚的三人：
 -- 玩家选中不可婚的那一位时，当场把理由说给他听，这比让那一行凭空消失更说得清。
 local function nearby()
  local list={}
  for i=1,CC.TeamNum do
   local pid=JY.Base['队伍'..i]
   if type(pid)=='number' and pid>0 and JY.Person[pid] and JY.Person[pid]['性别']==1 and full(pid) then list[#list+1]=pid end
  end
  return list
 end

 -- 返回家园菜单该显示的一行；没有可谈的人就返回 nil，那一行整个不出现（彩蛋不预告）。
 BrowserMarriageLabel=function()
  if not here() then return nil end
  local s=spouse()
  if s~=nil and JY.Person[s] then return '归宿 · '..name(s) end
  if #nearby()==0 then return nil end
  return '结为连理'
 end

 BrowserMarriageMenu=function()
  if not here() then return end
  while true do
   local s=spouse()
   local rows,pids={},{}
   if s~=nil and JY.Person[s] then rows[1]={name(s)..' · 在院中坐一会儿',nil,1};pids[1]=s end
   for _,pid in ipairs(nearby()) do
    if pid~=s then rows[#rows+1]={name(pid),nil,1};pids[#rows]=pid end
   end
   if #rows==0 then return end
   local pick=choose(rows)
   local pid=pids[pick]
   if pid==nil then return end
   if pid==s then together(pid) else propose(pid) end
  end
 end
end)()
