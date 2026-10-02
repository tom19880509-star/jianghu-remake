-- NPCINNER_EXTENSION : 软猬甲改由黄蓉给 ＋ 敌方 NPC 按剧情吃内功被动（157 丁）
--
-- Tom 2026-09-22 两条裁定：
--   「软猬甲获取难度增加，从黄蓉处获得（要符合剧情）。NPC角色也按照剧情给他们内功，
--     比如十大恶人十大善人都有自己学的内功。」
-- 考据、方案、逐格实测与「没做的」写在 editorial/NPC内功与软猬甲157.md；
-- 接线补丁（bridge.lua 一行占位 ＋ build.mjs 一行）写在 reviews/npcinner157-patch-suggestions.md。
--
-- 本文件三块，互相独立、可分别关（BrowserRuanwei.enabled / BrowserNpcInner.enabled / BrowserRenwoxingCanon.enabled）：
--   A 软猬甲 120：从小宝货摊上**下架**（只读代理，不写存档字节），改成桃花島黄蓉亲手给；
--   B 敌方 NPC 的内功被动：包住 BrowserGrowthBattleConfig，在它返回 nil 且此人正作为**敌方单位**
--     站在场上时补一份只读的合成 cfg。现成的七个 BrowserHeartRank 调用点一行都不改。
--
-- 六条硬约束（都已遵守）：
--  ① **不新增任何事件号、物品条目、秘籍条目、武学条目**。A 只用现成的 75 桃花島 D2（黄蓉）
--     与现成的三个事件号 468／471／475；B 只用秘籍表里已有的 39／43／94／95。
--  ② **存档零影响**（A 的赠甲除外，那是本件的目的）：
--     · A 的下架是把 JY.Shop[sid] **整张表换成只读代理**，代理只盖住「軟蝟甲那一格的库存」这一个键，
--       其余键读写一律转发到真表 ⇒ 别的格照常买、照常落盘，軟蝟甲那一格**一个字节都没动**。
--       出了 instruct_64 立刻换回来（pcall 保证异常路径也换回来）。
--       **旧档不回溯没收**：已经买到的人手里那件原样保留，本层不认、不查、不删。
--     · B 一个字节都不写：合成 cfg 是临时表，战斗外恒为 nil，人物页／图鉴／存档读不到它。
--  ③ **不覆盖任何真记录**：B 只在 prior 返回 nil 的缝里补；队友、回响、有成长记录的人一律原样透传。
--  ④ 不碰共享核心：bridge.lua／engine.js／build.mjs／生成物／content.js／poisonmed-extension.lua／
--     artfx-extension.lua／martial-balance.js／toosimple-extension.lua／jiuyang-extension.lua 都没动。
--  ⑤ 严格全局：四个新全局（BrowserRuanwei、BrowserNpcInner、BrowserRuanweiGive、BrowserRenwoxingCanon）都在加载期赋值。
--  ①′ C 块（2026-09-29，任我行）是①的唯一例外：战斗期间临时建一行运行时武学 260「掌力」，不进底表、
--     不落盘，出战即删；编号 260 远离武学上限 93 与秘籍 39–95／198（B 块的 94 是秘籍九陰真經，不是武学）。
--  ⑦ **依据强度必须可机读**：本作代用的条目挂 N.borrowed 与 N.note，合成 cfg 上带 cfg.borrowed。
--  ⑥ 200 local 上限：本文件整体包在一个 do 块里，只向外露上面四个名字。
--
-- **加载顺序**：必须排在最后一批。
--   · A 要包在 HOMESTEAD_EXTENSION（bridge.lua:686）与 OUTFIT_EXTENSION（:675）的 instruct_64 **外面**
--     —— 货摊的商品表是 outfit 的 goodsShop(WEI) 遍历 JY.Shop 拼出来的，本层必须是最外层那一圈；
--     同时要在 OUTFIT_EXTENSION 的 EventExecute 包裹外面，黄蓉那一格才轮得到本层。
--   · B 要排在 GROWTH_EXTENSION（:682，含 growth-extension 与 practice-extension 两层
--     BrowserGrowthBattleConfig）之后，否则 prior 抓到的是半成品。
--   建议插在 `-- EXPSHARE_EXTENSION`（:699）之后，即扩展清单的末尾。
;(function()

-- ============================================================================
-- A. 软猬甲 120：货摊下架 ＋ 桃花島黄蓉亲手给
-- ============================================================================
-- **现状**（本轮机读，证据逐条写在 editorial/NPC内功与软猬甲157.md 二·一）：
--   全作 120 只有一条获取途径 —— 小宝货摊第 3 家（JY.Shop[2] 的第 4 格，800 两、库存 1）。
--   1018 条事件里没有任何一条 instruct_2/32/41/18/43/4 碰过 120；320 个人里没有一个携带或装备它。
--   那家货摊的原始落点是 CC.ShopScene[2].sceneid=40 悅來客棧；outfit-extension 的 fixedWei()
--   把小宝钉在了场景 1 河洛客棧，goodsShop(WEI) 又**遍历全部五家**货摊拼商品表，
--   所以真机上它现在是在**河洛客棧**卖 —— editorial/品第与朱批157.md 七·三·3 记的「悦来客栈」
--   说的是原始数据的落点，不是现在玩家看到的地方。两处都要改口径。
--
-- **新落点：桃花島（场景 75）黄蓉那一格（D2）**。这一格是现成的：
--   事件 466 第一次见郭靖黄蓉；此后黄蓉那一格的终局有两个 —— 468（品德路，郭靖黄蓉直接赠《射鵰英雄传》）
--   与 471（战斗路，先胜 war76 郭靖、再胜 war77 黄蓉「我也想领教一下」才拿到书）。
--   本层挂在这两个终局上，给完把 talk 换成同样是黄蓉口吻的现成事件 475，所以**是一次性的，且不新增事件号**。
--
-- **难度确实提高了**（这是裁定的原话）：改之前是开局就能走到河洛客棧、攒够 800 两即得；
--   改之后必须走到桃花島并把那条线走完 —— 要么**打赢郭靖与黄蓉两场单挑**（war76/77），
--   要么**当场品德≥90**（品德会掉，所以是活门槛，不是一次性开关）。
--
-- **原著依据**（《射雕》本机有三联／新修两路底本，本文做了版本对读；出处与短引见考据件三·二）：
--   · 桃花岛镇岛之宝，黄药师给了女儿：《射雕》回十一梅超风「师父的软猬甲自然给了她」、
--     回十二洪七公「你老子的软猬甲当然给了你」（SDA／SDB／SDL 三路全有，逐字相同）。
--   · **「胜了就是你的」有原文**：回十七周伯通转述黄药师以镇岛之宝为赌注 ——
--     「桃花島這件鎮島之寶就是你的」。本层战斗路照的就是这一条。
--   · **黄蓉会把甲让给自己认的人**：回二十九她把甲取下垫在郭靖肩头救他；
--     《神雕》回三十二甲已在郭芙身上（「我身上有軟蝟甲」）。本层品德路照的是这一条。
 local ARMOR=120                 -- 軟蝟甲
 local ISLAND,RONG=75,2          -- 桃花島 / 黄蓉所在的 D 格
 local RONG_HEAD=56              -- 黄蓉的对话头像（原版事件 466/468/471/475 用的就是 56）
 local GOOD_MORAL=90             -- 品德路的活门槛，与原版事件 466/469 的 instruct_28(0,90,100) 同一条线
 local WON_TALK,MORAL_TALK,AFTER=471,468,475
 local LINE_WON='你能从我桃花岛上取走这本书，这副软猬甲也该有个配得上的主人。它生满倒刺，刀剑不入，'..
  '只是护不住震劲，别拿它托大。'
 local LINE_MORAL='郭大侠的话你既记住了，这副软猬甲你带着。当年我爹爹把它给了我，我也曾拿它替靖哥哥挡过一回。'..
  '它护得住皮肉，护不住心性——你自己掂量。'

 local R={enabled=true}
 BrowserRuanwei=R

 -- A1 · 货摊改单（Tom 2026-09-22 软猬甲 ＋ 2026-09-23 龙象／七伤／「只卖非绝学」三条）------
 --
 -- **三格的现状**（本轮机读，出处逐条写在 editorial/NPC内功与软猬甲157.md 七·一）：
 --   · 120 軟蝟甲      shop2 第4格 800 两 库存1（原始落点 场景40 悅來客棧）
 --   · 59  龍象般若功  shop0 第5格 700 两 库存1（原始落点 场景1  河洛客棧）——**品第是绝学（juexue）**
 --   · 55  七傷拳譜    shop3 第5格 250 两 库存1（原始落点 场景60 龍門客棧）
 --   小宝已被 outfit-extension 的 fixedWei() 钉死在场景 1 河洛客棧，而 goodsShop(WEI)
 --   **遍历全部五家货摊**拼商品表 ⇒ 这三格玩家其实都是在河洛那一摊上看到的。
 --
 -- **改法**（与软猬甲同一套只读代理，**一个存档字节都不写**）：
 --   hide  只把「那一格的库存」读成 0 ⇒ 玩家看到售罄；
 --   swap  把「那一格的商品号」读成另一本，**价钱与库存一概不动** ⇒ 同一格、同一价、换一本书。
 -- swap 而不是 hide 的理由：hide 会在货摊上留一行永远售罄的绝学，正是朱批 676 说的那种攻略式剧透；
 -- swap 把那一格让给一本**非绝学**，Tom 的「韦小宝卖一些非绝学类武功」也就同时成立了。
 --
 -- **换上去的两本怎么选**（都是底表现有条目，一条新条目都没造；品第读 martial-catalog-data.json）：
 --   · 59 龍象（绝学·700 两）→ **54 鐵掌拳譜**（上乘·tier3·十重 620·每段耗内 5·无门槛·**拳掌类**）。
 --     价钱一分不动（仍 700）。**选它是实测选出来的，不是推的**：本轮在早期整队场上把主角多一门五重
 --     逐本量过（n=24×两种子，见报告七·五）——70 七星劍譜 把 war38 从 20/48 推到 **29/48**（明显变顺，
 --     **所以第一版的 70 被否掉了**）；54 鐵掌拳譜 是 21/48（＋1，噪声内）。
 --     它是拳掌类，而前期主角拿的是 114 周公劍（御剑63／拳掌26），用不出来；后期走拳掌的人才用得上。
 --   · 55 七傷（上乘·250 两）→ **68 泰山十八盤**（名家·tier2·十重 361·每段耗内 3＝120·无门槛）。
 --     价钱一分不动（仍 250）。实测**逐字段与不加它完全相同**（20/48→20/48）——它五重 181
 --     还不如主角原有的 89 松風劍法八重 184，选招器根本不会选它；它是给「一开局就想练剑」的人的便宜入门书。
 --   两本都**不是** tier2／耗内 2 那一族（71 兩儀／82 反兩儀刀／83 狂風刀／86／87，每点内力 220），
 --   那一族是前期性价比之王，本轮一本都没往货摊上加。
 --   **一条教训写下来**：「每点内力」这个指标在**前期是错的**。早期整队场只打十来回合、主角出手十来次，
 --   内力根本不是约束，**每一击的威力才是**——所以 70 七星（五重 310）比 71 兩儀（五重 220）更顺，
 --   哪怕它的每点内力只有两仪的 56%。本轮据此推翻了自己的第一版进货单。
 --
 -- **71 兩儀劍法 本轮不动**：它 300 两、无门槛、十重 440、每段耗内 2，确实是前期性价比之王，
 --   但那是**既有缺陷**，不是本轮改出来的；提价属于体验改动，应由 Tom 裁。实测与两档候选价见报告七·三。
 local STALL={
  [120]={hide=true},
  [59]={swap=54},
  [55]={swap=68,price=150},   -- 395 S4-B 试价：泰山十八盘（换进七伤那一格）250→150，二档门派秘籍同价
  [71]={price=150},            -- 395 S4-B 试价：两仪剑法 300→150（门槛仍是 攻40／御剑40／资质50）
  [85]={price=300},            -- 395 S4-B 试价：霹雳刀法 600→300（门槛仍是 耍刀50／资质50）
 }
 -- JY.Shop[sid] 在原版里是一张**恒空**的表，读写全走 metatable 打到 JY.Data_Shop 的字节上
 -- （jymain.lua:1671-1683）。所以「把整张表换成代理」既不会丢数据，也不会碰到那几个字节：
 -- 存档时写出去的是 JY.Data_Shop，代理根本不在那条路上。
 local function stallPlan()
  if type(JY)~='table' or type(JY.Shop)~='table' then return nil end
  local plan,any=nil,false
  for sid=0,(JY.ShopNum or 0)-1 do
   local shop=JY.Shop[sid]
   if shop then
    for slot=1,5 do
     local ok,id=pcall(function() return shop['物品'..slot] end)
     local rule=ok and id and STALL[id]
     if rule then
      plan=plan or {};plan[sid]=plan[sid] or {};plan[sid][slot]=rule;any=true
     end
    end
   end
  end
  return any and plan or nil
 end
 local function proxyFor(shop,rules)
  local proxy=setmetatable({},{
   __index=function(_,k)
    if type(k)=='string' then
     for slot,rule in pairs(rules) do
      if k=='物品价格'..slot then return rule.price or shop[k] end  -- 395 S4-B：只有写了 price 的格改价，其余一概不动
      if rule.swap and k=='物品'..slot then return rule.swap end
      if rule.hide and k=='物品数量'..slot then return 0 end
     end
    end
    return shop[k]
   end,
   __newindex=function(_,k,v) shop[k]=v end})
  return proxy
 end
 -- 395 S4-B：货摊上「此刻实际卖什么、卖多少钱」的只读查询（小宝收购价与图鉴同读这一份，不另写一张价目表）。
 -- 返回该物品在货摊上的最低实际售价；藏起（hide）或不在货摊上则 nil。不改 JY.Shop、不写存档。
 BrowserStallPrice=function(id)
  local plan=R.enabled and stallPlan() or nil;local best=nil
  for sid=0,(JY.ShopNum or 0)-1 do
   local shop=JY.Shop[sid]
   if shop then for slot=1,5 do
    local real=shop['物品'..slot];local rule=plan and plan[sid] and plan[sid][slot]
    local item=rule and rule.swap or real
    local hidden=rule and rule.hide
    local price=rule and rule.price or shop['物品价格'..slot]
    if item==id and not hidden and (price or 0)>0 then best=math.min(best or 32767,price) end
   end end
  end
  return best
 end
 if type(instruct_64)=='function' then
  local sourceStall=instruct_64
  instruct_64=function(...)
   local plan=R.enabled and stallPlan() or nil
   if not plan then return sourceStall(...) end
   local saved={}
   for sid in pairs(plan) do
    local rules=plan[sid]
    saved[sid]=JY.Shop[sid]
    JY.Shop[sid]=proxyFor(saved[sid],rules)
   end
   local r=table.pack(pcall(sourceStall,...))
   for sid,real in pairs(saved) do JY.Shop[sid]=real end
   if not r[1] then error(r[2],0) end
   return table.unpack(r,2,r.n)
  end
 end

 -- A2 · 剧情掉落：桃花島黄蓉给软猬甲 ／ 打赢金轮拾得龙象 ／ 打赢明教得七伤拳谱 -----------
 --
 -- 三条都不新增事件号；赢下原事件之后，赠书可在同一刻或战后回访领取。
 -- 领取记录随周目保存，防止赠书卖掉后重复领取。
 --
 -- 金轮（Tom：「获取方式也改为从金轮法王处获取，但是经验要求增加，更符合剧情越往后越难」）：
 --   场景 **16 金輪寺** 的 **D3**，talk **631** —— 原版 oldevent_631 是「金轮法王，快将可兰经交出来」
 --   ⇒ 打 war100（金轮＋十名番僧）⇒ 赢了给 159 可兰经、+8 声望，并把自己那一格改成 **632**。
 --   本层在同一处拾得一本 **59 龍象般若功**，法王不会无故主动传功。选 war100 而不是 war122（武道大会）或 war133（圣堂）的理由：
 --     ① war122／war120 这些武道大会的场次由 instruct_58 驱动，**不经过 D* 与事件号**，没有位标可挂；
 --     ② war133 是全剧终局，在那里给一本要从头练的秘籍，玩家已经没有地方用它了；
 --     ③ war100 是原著金轮法王正面交手的那一场，且它本来就有「赢了给东西」的现成结构。
 --   ⚠ Tom 那句「经验要求增加」落在 `martial-balance.js` 的 `books[59].baseCost`／曲线上，
 --      **那一份另一路在改，本层没碰**；接线写在 reviews/npcinner157-patch-suggestions.md P6。
 --
 -- 谢逊（Tom：「七伤拳改为从谢逊处获取，这样更符合剧情」）：
 --   场景 **11 光明頂** 的 **D94**，talk **115** —— 原版 oldevent_115 是谢逊「少侠准备好要破我明教之
 --   『光明圣火阵』了吗？」⇒ 打 war15（范遙／楊逍／金花婆婆／殷天正／謝遜／韋一笑）⇒
 --   赢了给 155 倚天屠龙记、+10 声望，并把谢逊那一格改成 **121**（「武林中人心险恶，小兄弟路上得多注意点」）。
 --   本层在同一处再给一本 **55 七傷拳譜**。
 --   原著依据：《倚天》回八冰火岛谢逊授的是**拳诀**、回二十张无忌忆诵、回二十一高吟总诀一拳震碎松树。
 --   **文案要对得上**：张无忌开局自带的七伤拳五重是 jiuyang-extension 播种的「谢逊口授」，不走秘籍；
 --   这里给玩家的是**拳谱**，两者不冲突，台词里点明了这一层。
 local DROPS={
  [631]={key='jinlun',after=632,item=59,scene=16,d=3,
   lines={
    {head=62,side=0,text='《可兰经》就在案上。今日是本座输了，改日再向你讨教。'},
    {head=0,side=1,text='番僧只顾搀扶法王退去，没瞧见方才被掌力震裂的经匣夹层。我拾起滑出的《龙象般若功》旧抄：前几层批注密密，往后渐稀，末三层只余经文。'},
   }},
  [115]={key='xiexun',after=121,item=55,scene=11,d=94,head=13,
   line='这部《七伤拳谱》，你也拿去。当年我在冰火岛上只口授过拳诀，没给过谁一个字的谱子——'..
        '七伤者，先伤己而后伤人。你若不先把内功练稳，这拳伤的是你自己。'},
 }

 -- 「已经有一件」要查三处：行囊、任何人身上穿着的、任何人随身携带的。
 -- 这一查同时兜住两件事：① 本层的赠予是一次性的；② **旧档在货摊上买过的人不会凭空多出第二件**。
 local function owned(id)
  if type(JY)~='table' then return false end
  if type(JY.Base)=='table' then
   for i=1,(CC and CC.MyThingNum or 200) do
    if JY.Base['物品'..i]==id and (JY.Base['物品数量'..i] or 0)>0 then return true end
   end
  end
  if type(JY.Person)=='table' then
   for pid=0,(CC and CC.PersonNum or 0)-1 do
    local p=JY.Person[pid]
    if p then
     if p['防具']==id or p['武器']==id then return true end
     for k=1,4 do if p['携带物品'..k]==id then return true end end
    end
   end
  end
  return false
 end
 local function moral()
  local p=JY.Person and JY.Person[0]
  return p and (p['品德'] or 0) or 0
 end
 local function hand(id,head,line,lines)
  if type(instruct_2)~='function' then return false end
  if owned(id) then return false end
  if type(TalkEx)=='function' then
   if lines then
    for _,part in ipairs(lines) do TalkEx(part.text,part.head,part.side) end
   elseif line then TalkEx(line,head,0) end
  end
  instruct_2(id,1)
  return owned(id)
 end
 local function deliver(row)
  if type(browser_story_reward)=='function' and browser_story_reward(row.key,'get') then return false end
  if owned(row.item) then
   if type(browser_story_reward)=='function' then browser_story_reward(row.key,'claim') end
   return false
  end
  if not hand(row.item,row.head,row.line,row.lines) then return false end
  if type(browser_story_reward)=='function' then browser_story_reward(row.key,'claim') end
  return true
 end
 -- 只读查询，供界面、测试与仿真台核对。
 R.status=function()
  local plan=stallPlan();local rows={}
  if plan then for sid,rules in pairs(plan) do for slot,rule in pairs(rules) do
   rows[#rows+1]={shop=sid,slot=slot,hide=rule.hide,swap=rule.swap,price=rule.price}
  end end end
  return {stall=rows,armorOwned=owned(ARMOR),moral=moral(),
   talk=(type(GetD)=='function' and GetD(ISLAND,RONG,2) or nil),enabled=R.enabled}
 end
 local function give(id,flag)
  if not R.enabled then return end
  if flag~=1 or id~=RONG then return end
  if type(JY)~='table' or JY.SubScene~=ISLAND then return end
  if type(GAME_SMAP)=='number' and JY.Status~=GAME_SMAP then return end
  if type(GetD)~='function' or type(SetD)~='function' or type(instruct_2)~='function' then return end
  local talk=GetD(ISLAND,RONG,2)
  if talk~=WON_TALK and talk~=MORAL_TALK then return end
  if talk==MORAL_TALK and moral()<GOOD_MORAL then return end
  -- 「已经有一件」这一道闸只在 hand() 里，**这里不重复查**：重复的守卫看着稳妥，
  -- 实际上会让两处各自失效都测不出来。没给成就不改 talk。
  if hand(ARMOR,RONG_HEAD,talk==WON_TALK and LINE_WON or LINE_MORAL) then
   SetD(ISLAND,RONG,2,AFTER)
  end
 end
 BrowserRuanweiGive=give            -- 只读入口，供测试与主会话手工核对
 if type(EventExecute)=='function' then
  local sourceEvent=EventExecute
  EventExecute=function(id,flag,...)
   local armorBefore=(R.enabled and type(GetD)=='function') and GetD(ISLAND,RONG,2) or nil
   local dropBefore=nil
   if R.enabled and type(GetD)=='function' and type(JY)=='table' and JY.SubScene then
    local t=GetD(JY.SubScene,id,2)
    if t and DROPS[t] then dropBefore=t end
   end
   local r=table.pack(pcall(sourceEvent,id,flag,...))
   if not r[1] then error(r[2],0) end
   -- 原事件先照常跑完（那些角色的原话不能被吞掉），再看要不要给。
   if dropBefore then
    local row=DROPS[dropBefore]
    local after=GetD(JY.SubScene,id,2)
    -- 三道闸：① 原事件必须把 talk 改成它赢了才会改的那一个（输了／不打都不会改）；
    --        ② 场景与 D 格必须对得上；③ 玩家手里不能已经有那本书。
    if after~=row.after then dropBefore=nil end
    if JY.SubScene~=row.scene then dropBefore=nil end
    if id~=row.d then dropBefore=nil end
    if dropBefore then deliver(row) end
   elseif flag==1 then
    -- Older saves may have won while a long-lived page still ran the previous
    -- build. Their original event is already at its post-victory talk number.
    for _,row in pairs(DROPS) do
     if JY.SubScene==row.scene and id==row.d and GetD(row.scene,row.d,2)==row.after then
      deliver(row);break
     end
    end
   end
   if armorBefore==nil or armorBefore==GetD(ISLAND,RONG,2) then give(id,flag) end
   return table.unpack(r,2,r.n)
  end
 end

 -- A3 · 金轮法王配上龙象般若功 ------------------------------------------------
 -- **底表现状**：62 金輪法王 武功栏里只有 88 五輪大法十重（十重 422、每段耗内 7），
 -- 等级25／攻88／防95／内676／拳掌87／资质60，`修炼物品=-1`——**他根本不会龙象**。
 -- 而龙象般若功在原著里正是他的看家功夫（《神雕》回三十七、三十八）。
 --
 -- **重数**：见 editorial/NPC内功与软猬甲157.md 七·二的重扫。重数是平衡值，不是原著数字。
 -- 写法照 signature／toosimple／jiuyang 三层：**只在 NewGame 播种，已存档一个字节都不碰**，
 -- 且有 pristine 守卫——武功栏里只要有一处对不上原版现值就**整条跳过**。
 local JINLUN_RANK=8
 R.jinlunLevel=(JINLUN_RANK-1)*100
 local SEED={
  [62]={arts={{2,18,(JINLUN_RANK-1)*100}},
        was={['武功1']=88,['武功等级1']=900}},
 }
 local function pristine(p,row)
  for k,v in pairs(row.was) do if p[k]~=v then return false end end
  -- 要播的那一格必须是空的（这同时保证重复播种不会落地第二次）
  for _,art in ipairs(row.arts) do if (p['武功'..art[1]] or 0)~=0 then return false end end
  -- 其余槽位也必须全空：别的层先动过手就整条跳过
  local top=0;for _,art in ipairs(row.arts) do if art[1]>top then top=art[1] end end
  for i=top+1,10 do if (p['武功'..i] or 0)~=0 then return false end end
  return true
 end
 local function seedOne(pid,row)
  local p=JY.Person and JY.Person[pid]
  if not p then return false end
  if not pristine(p,row) then return false end
  for _,art in ipairs(row.arts) do
   p['武功'..art[1]]=art[2];p['武功等级'..art[1]]=art[3]
  end
  return true
 end
 R.seed=function()
  local applied=0
  for pid,row in pairs(SEED) do if seedOne(pid,row) then applied=applied+#row.arts end end
  return {applied=applied,rank=JINLUN_RANK}
 end
 if type(NewGame)=='function' then
  local sourceNewGame=NewGame
  NewGame=function(...)
   local result=table.pack(sourceNewGame(...))
   if R.enabled then R.seed() end
   return table.unpack(result,1,result.n)
  end
 end

-- ============================================================================
-- B. 敌方 NPC 的内功被动
-- ============================================================================
-- **现状**：内功是秘籍（39–95），不占武功栏；境界记在成长层的 learnedBooks 里。
--   balance-core.lua:176 的 BrowserHeartRank(cfg,id) 只在 cfg 非 nil 时才有数，而
--   growth-extension.lua:560 的 BrowserGrowthBattleConfig 对**没有成长记录的人一律返回 nil**
--   ⇒ 敌方 NPC 现在一门内功被动都吃不到。这就是要补的那一格。
--
-- **机制取的是「合成 cfg」这一套**（三套候选的取舍写在考据件四·三）：
--   包住 BrowserGrowthBattleConfig，只在它返回 nil、本层表里有这个人、且这个人**此刻正作为敌方单位
--   站在场上**时，补一份临时的只读 cfg。好处是七个现成调用点（紫霞39／小无相40／神照42／易筋43／
--   洗髓44／乾坤92／九阴94／九阳95）一行都不用改，口径自动与玩家侧一致，
--   也自动满足 Tom 同日的另一条裁定「内功多学多强」（internalRanks 一次给全，被动全生效）。
--   代价是它**只在战斗里成立**：人物页、图鉴、存档都读不到 —— 这正是存档零影响要的。
--
-- **谁上表**：只放「原著实写了内功名目、且本作秘籍表里已经有对应条目」的人。
--   对不上的一律进考据件的「待裁清单」，**不造新条目**。十大恶人／十大善人二十人里只有四个人对得上，
--   第五个是表外但同样是①档、且真的会作为敌人出场的 48 游坦之。逐人依据见考据件三·一。
 local N={enabled=true}
 BrowserNpcInner=N
 N.books={
  -- 19 岳不群 · 紫霞神功 ＝ 秘籍 39 紫霞秘笈。《笑傲》回五木高峰「果然是华山派的‘紫霞功’」、
  --    回七「亲身领略过岳不群『紫霞神功』的厉害」。①档、正面实写、还是他的招牌。
  --    **八重不是十重**：回十九他把紫霞传给令狐冲时藏了后半部，全书没有一处写他练到顶；
  --    而且他的底表面板（Lv16／攻74／内350）在十大恶人里是倒数第三，给满会把 war56／war116 推过头。
  [19]={['39']=8},
  -- 60 欧阳锋 · 逆练九阴 ＝ 秘籍 94 九陰真經。《射雕》回十九他当面逼问郭靖真经出处、
  --    回三十五起照黄蓉的假经练到疯癫；《神雕》回二「逆练九阴」四字是明文。
  --    **九重不是十重**：他练的是**假经**，第二次华山论剑赢在「疯」不在「全」，
  --    留一重给郭靖、周伯通的真经。
  [60]={['94']=9},
  -- 55 郭靖 · 九陰真經。《射雕》回十六起周伯通口授、回三十一一灯译总纲，全书最扎实的一条。十重。
  [55]={['94']=10},
  -- 64 周伯通 · 九陰真經。同上，他是原书里唯一「背得出全本」的人（回十六「背得滚瓜烂熟」）。十重。
  --    他的 左右互搏（秘籍 91）已经在底表的 `左右互搏=1` 上，本层不重复给。
  [64]={['94']=10},
  -- **48 游坦之 本轮撤下，不是遗漏**：《天龙》回二十八原文明写他练的**不是**易筋经 ——
  --    「與《易筋經》並不相干」，是油布书上药草隐字显出的《欲三摩地断行成就神足经》。
  --    神足经在本作只存在于 martial-catalog-data.json（没有 nativeBookId），秘籍表 39–95 里没有条目，
  --    按「对不上就不造新条目」的规矩进考据件的待裁清单。
  --
  -- ===== 以下三条是 Tom 2026-09-23 的裁定（原话见考据件三·三）=====
  --   「不用硬造，张三丰给他9重九阳，左冷禅给8重九阴，丘处机给个6重九阳或者九阴？具体给多少你看着来。」
  -- 三条都**只用现成的秘籍条目**（94 九陰真經、95 九陽真經），一条新条目都没造。
  -- **但三条的依据强度不同，必须分开写**（见下面的 N.borrowed）：
  --
  -- 5 張三豐 · 九陽真經（95）九重。**①档，有原著依据**：
  --   《倚天》回二「張君寶曾自《九陽真經》學得心法」（YT／YT2 各 1，全书仅此一处正面实写）；
  --   回十六张无忌自述来历：「太師父的師父覺遠大師學得《九陽真經》」，觉远圆寂前背诵经文，
  --   张三丰、郭襄、无色「三人各自記得一部分」；同回出现门派功法名「武當九陽功」（YT／YT2 各 3）。
  --   **九重不是十重**：原文明写他只记得**一部分**，十重要留给练到全本的人。
  --   《倚天》两路底本逐字相同（是同一底本的两份拷贝），所以版本状态〔待核〕。
  --   注：他自己那门「純陽無極功」（回十，YT／YT2 各 2）在本作**没有**秘籍条目，本轮不造。
  [5]={['95']=9},
  -- 22 左冷禪 · 九陰真經（94）八重。**本作代用，不是原著断言**：
  --   他原著实写的是**寒冰真氣**（《笑傲》回二十七「修練了十餘年的『寒冰真氣』」，XA 9 次），
  --   而寒冰真气在本作**没有秘籍条目**（13 寒冰神掌只是武功栏的招式）。
  --   九阴与他在原著里**毫无关系**——所以任何会给玩家看的文案都必须带 N.note(22) 那句免责。
  [22]={['94']=8},
  -- 68 丘處機 · 九陰真經（94）六重。**本作代用，不是原著断言**：
  --   选九阴而不是九阳，理由是**全真一脉与九阴确有原著关联**：《射雕》回三十九丘处机本人说
  --   「我師重陽真人獨魁群雄，奪得真經」（SDA／SDB／SDL 各 1）；回十七他亲自访查真经下卷的去向
  --   并告知周伯通。九阳与全真则毫无瓜葛。
  --   **但全书没有一处写他本人修习九阴**（本轮把《射雕》《神雕》五路底本里「丘处机」与「九阴」
  --   在 120 字窗内的全部共现逐条读过：回四、回十七、回二十五、回三十九……**全是他在查、在说、在讲古**，
  --   没有一条是他在练）——所以这一条同样是代用，同样要带免责句。
  --   **六重**是三条里最低的：代用条目宁可给低，且他的底表（Lv21／攻80／内400）本来就不是顶档。
  [68]={['94']=6},
 }
 -- **哪几条是「本作代用」**。Tom 2026-09-23 的文案纪律：
 --   「在实现注释、editorial、以及任何会进游戏的文案里，必须写明『本作代用，不表示原著中此人习此内功』；
 --     图鉴与战报不得声称原著如此。」
 -- 本层没有自己的界面文案，所以把这面旗子与免责句**做成只读接口**：
 -- 图鉴／战报／人物页要显示敌人的内功时，必须先查 BrowserNpcInner.borrowed[pid] 或 note(pid)。
 -- 合成 cfg 上也带同一面旗子（cfg.borrowed），拿到 cfg 的一方不必再查表。
 N.borrowed={[22]=true,[68]=true}
 N.note=function(pid)
  if not N.borrowed[pid] or not N.books[pid] then return nil end
  return '本作代用：此人的这门内功由本作指派，不表示原著中此人习此内功。'
 end
 -- 易筋经（43）的护体分支保留在 build() 里：本轮表里没有人练它，但表随时会加人，
 -- 而 balance-core.lua:151 的七重封顶口径必须由本层自己守住（测试用注入的方式逐条核过）。
 -- 「此刻正作为敌方单位站在场上」——这一条把本层完全关在战斗里。
 local function onField(pid)
  if type(WAR)~='table' or type(WAR.Person)~='table' then return false end
  for i=0,(WAR.PersonNum or 0)-1 do
   local u=WAR.Person[i]
   if u and u['人物编号']==pid then
    if u['我方']==true then return false end
    return true
   end
  end
  return false
 end
 local function build(pid)
  local row=N.books[pid];if not row then return nil end
  local ranks,top,topRank={},0,0
  for k,rank in pairs(row) do
   local id=tonumber(k)
   if id and rank and rank>0 then
    ranks[tostring(id)]=rank
    if rank>topRank then top,topRank=id,rank end
   end
  end
  if topRank<=0 then return nil end
  -- 易筋经护体与 balance-core.lua:151 同一条口径（七重封顶、每重 .008）。
  local yijin=ranks['43'] or 0
  local guard=yijin>0 and math.min(yijin,7)*.008 or 0
  return {npcInner=true,version=1,internalRanks=ranks,internal=top,internalRank=topRank,
   borrowed=N.borrowed[pid]==true or nil,
   yijinGuard=guard,signature=nil,signatureRank=0,huRank=0,
   taiChiRank=0,taiChiReduction=0,taiChiCost=0,taiChiNormalCost=0}
 end
 N.config=build                       -- 只读：不查在不在场，供测试与图鉴核对
 N.list=function()
  local copy={}
  for pid,row in pairs(N.books) do
   local row2={};for k,v in pairs(row) do row2[k]=v end
   copy[pid]=row2
  end
  return copy
 end
 local prior=BrowserGrowthBattleConfig
 N.prior=function(pid) if type(prior)=='function' then return prior(pid) end;return nil end
 BrowserGrowthBattleConfig=function(pid,...)
  local cfg=type(prior)=='function' and prior(pid,...) or nil
  if cfg then return cfg end
  if not N.enabled then return cfg end
  if not N.books[pid] then return cfg end
  if not onField(pid) then return nil end
  return build(pid)
 end
end)()

-- ============================================================================
-- C. 任我行 26：底表的 13 寒冰神掌 → 战斗期换成无专名掌法「掌力」（2026-09-29）
-- ============================================================================
-- 原著（证据与版本状况见 reviews/claude-renwoxing-canon-20260928.md）：任我行有名目的武功只有吸星大法
-- （《笑傲》回21／22／27／31）；他实写的掌、剑都没有专名（回27 与方证对掌，自称「日月教正宗功夫」）；
-- 寒冰真气／寒冰神掌是左冷禅的（回27 左冷禅以寒冰真气反冻任我行；回34 左冷禅自称自创掌法）。
-- 原版底表把 13 同挂在 22 左冷禅与 26 任我行名下。13 的锁招（artfx FX[13]）、冰系特效（signature-catalog "13"）
-- 与寒毒 6 都按武功编号生效，只改显示名等于照送他一门假冰功，所以这里换编号。
-- 做法照 thrown-extension 的 CANON：JY.Person 字段直写存档字节，只在一场战斗之内套用、出战无条件还原：
--   · WarMain 期间把 26 手里的 13 换成运行时武学 260，28 吸星大法原位不动；战后换回 13 并删掉 260 这一行。
--   · 260 照抄当时的 13 行（拳掌类、形状、射程、杀伤范围、耗内不变），名称「掌力」（描述词，不是原著招名），
--     去掉寒毒，动画改用中性掌法 27（与 2、3、7、14 等共用）。成长规则下十重威力取项目自己的 tier3 面攻无毒曲线
--     （与 6／14／52／68／88／91 相同，十重 422；13 的 371 正是这条曲线扣掉寒毒折价后的值），经典规则下保留 13 的原版威力。
--   · 260 从不写进底表、成长、传功、回响记录：26 只在 E320 事件里临时入队，成长记录在入队时（战前）已按 13／28 建好；
--     成长的武学名次按「所在格的等级」取，所以仍是十重。
--   · 守卫：26 手里没有 13，或 JY.Wugong[260] 已被占用，就整条跳过、什么都不改；22 左冷禅与 13 行本身一字不动。
;(function()
 local RW,ICE,PALM,ANIM=26,13,260,27
 local POWER={51,84,122,165,211,257,304,346,384,422}
 local R={enabled=true,id=PALM,name='掌力',
  note='本作设定：原著未给任我行的掌法起名，「掌力」是描述性称呼，不是原著招名；寒冰神掌归左冷禅。'}
 BrowserRenwoxingCanon=R
 local slots,row=nil,nil
 function R.apply()
  if slots or not R.enabled or type(JY)~='table' or not JY.Person or not JY.Wugong then return false end
  local p=JY.Person[RW];local src=JY.Wugong[ICE]
  if not p or not src or JY.Wugong[PALM]~=nil then return false end
  local s={}
  for i=1,10 do if p['武功'..i]==ICE then s[#s+1]=i end end
  if #s==0 then return false end
  local w={}
  for f in pairs(CC.Wugong_S) do w[f]=src[f] end
  w['代号']=PALM;w['名称']=R.name;w['敌人中毒点数']=0;w['武功动画&音效']=ANIM
  local balanced=rawget(_G,'BrowserBalanceEnabled')
  if balanced and balanced() then for r=1,10 do w['攻击力'..r]=POWER[r] end end
  JY.Wugong[PALM]=w;row=w
  for _,i in ipairs(s) do p['武功'..i]=PALM end
  slots=s
  return true
 end
 function R.restore()
  if not slots then return end
  local p=JY.Person and JY.Person[RW]
  if p then for _,i in ipairs(slots) do if p['武功'..i]==PALM then p['武功'..i]=ICE end end end
  if JY.Wugong and JY.Wugong[PALM]==row then JY.Wugong[PALM]=nil end
  slots,row=nil,nil
 end
 function R.active() return slots~=nil end
 -- 吸内（2026-09-29，Tom：「让掌力命中时顺带吸内」）：原著吸星正是对掌时发动（回27）。
 -- 「掌力」每真打出一次伤害，就按吸星十重同一公式（balance-combat 的 28 分支：12+7×重数，不超过对方现有内力，
 -- 也不超过其内力上限两成加 10）的 R.drain 倍从被击者吸内；范围招各人各算。他收回的份额与异气反噬照吸星：
 -- 回补一半，异气 ≥60 只回补四分之一并受内伤，≥100 不回补。只在成长规则下生效；R.drain=0 即关闭。
 -- 取 0.05（十重每击吸 4 点）：只换掌力时圣堂 war133 一周目后期由 30.7% 升到 45.3%（明显变易），
 -- 0.05 回到 31.8%，其余任我行出场各格与只换掌力持平（qa/claude-renwoxing-drain.sim.mjs，非实玩）。
 R.drain=0.05
 local function siphon(target,rank)
  local B=rawget(_G,'BrowserMartialBalance')
  if R.drain<=0 or not (B and B.enabled and B.qi and B.foreign) then return end
  local u,tu=WAR.Person[WAR.CurID],WAR.Person[target]
  if not u or not tu then return end
  local pid,eid=u['人物编号'],tu['人物编号'];local e=JY.Person[eid]
  local amount=math.floor(R.drain*math.min(e['内力'],12+rank*7,math.floor(e['内力最大值']*.2)+10))
  if amount<=0 then return end
  local actual=-AddPersonAttrib(eid,'内力',-amount)
  if actual<=0 then return end
  local burden=math.min(100,B.qi(pid)+math.ceil(actual/8));B.foreign[pid]=burden
  local commit=rawget(_G,'BrowserGrowthCommitQi');if commit then commit(pid,burden) end
  if burden>=60 then AddPersonAttrib(pid,'受伤程度',burden>=90 and 2 or 1) end
  AddPersonAttrib(pid,'内力',math.floor(actual*(burden>=100 and 0 or burden>=60 and .25 or .5)))
 end
 if type(War_WugongHurtLife)=='function' then
  local sourceHurt=War_WugongHurtLife
  War_WugongHurtLife=function(target,skill,level,...)
   local hurt=sourceHurt(target,skill,level,...)
   if skill==PALM and slots and type(hurt)=='number' and hurt>0 then siphon(target,level) end
   return hurt
  end
 end
 if type(WarMain)=='function' then
  local sourceWarMain=WarMain
  WarMain=function(...)
   local mine=R.apply()
   local out=table.pack(pcall(sourceWarMain,...))
   if mine then R.restore() end
   if not out[1] then error(out[2],0) end
   return table.unpack(out,2,out.n)
  end
 end
end)()
