-- 157 慕容复彩蛋：天龙线的另一种归宿（editorial/慕容复彩蛋157.md，接线补丁见 reviews/murong157-patch-suggestions.md）
-- 只在扩展层包住原事件：不改 oldevent_*.lua、不新增事件号、不新增存档字段、不改别人的文件。
--
-- 考据结论（读码，详见 editorial 第一节）：
--   ·「结拜」在原版 1018 个 oldevent_*.lua 与 old_talk.lua 里 **一处也没有**（结拜／义结／金兰 全为 0 命中），
--     remake 各层也没有。所以 Tom 说的「代替段誉」指的是原著里段誉与乔峰的结义，不是某个可替换的游戏事件；
--     数据上没有可替换的对象 → **只能新增平行支，且既有内容一字不动**。
--   · 原版全作没有辽宋战事：契丹只出现在乔峰身世那 5 个事件里，辽国/大宋/雁门关/边关/外敌 全部 0 命中。
--     所以「抗击外敌」不做成战役，只挂在两处现成文本上：E514 玄慈说破慕容博假传音讯挑起汉辽相斗、
--     E466 郭靖「为国为民，侠之大者／戍守襄阳」。不编造原版不存在的战役。
--   · 乔峰(50) 原版根本不能入队（全脚本无 instruct_10(50)），他只在丐帮场景里出现。
--
-- 本层接五个既有事件，**四个下调 sourceEvent 只加句子**，只有 E530 的彩蛋支整段接管：
--   E514 少林（玄慈 1857 那五个省略号之后）  → 记 XUANCI，其余逐字照原版
--   E466 桃花岛（郭靖 1590 之后）            → 记 GUOJING，其余逐字照原版
--   E530 丐帮（原版 1950 之前给一次选择）    → 选「不插手」／ESC 逃逸 = 原版整段照跑；选「交信」= 彩蛋支
--   E529 丐帮复访（2199 之后）               → 结义后义兄弟那一问，每程一次
--   E932 领武林帖（instruct_59 全员离队之前）→ 分别：放弃复国 / 婚事 / 去向
--
-- 位标：南贤居(64) 事件格 **190** 第 8 栏（与身世层 199、易筋层 198、田伯光层 197 同法；
--   故意跳开 196，把 196–191 留给并行的林平之彩蛋，减少撞号）。
--   原版 data/alldef.grp 中 (64,190,*) 十一栏全为 0〔已核，测试断言〕；场景 64 的 S 表第 3 层
--   （事件槽索引层）出现过的值只有 {1,2}，没有任何格子指向 190 号槽；引擎只在第 2 栏 >0 时
--   才把一格列入「附近」，本层只写第 8 栏。旧档此栏为 0 ＝ 一件都没发生；新周目随事件表清零。
;(function()
 local REG_SCENE,REG_SLOT,REG_FIELD=64,190,8
 local XUANCI,GUOJING,SWORN,REVISIT,FAREWELL=1,2,4,8,16
 local MURONG,QIAO,DUAN,YUYAN,XUANCI_PID,GUOJING_PID=51,50,53,76,70,55
 local LETTER,BOOK=183,147                        -- 带头大哥书信 / 天龙八部
 local MORAL_GATE=70                              -- 结义的品德门槛（沿用 E511/E513 玄慈自己的 70–100 线）
 local FAME,MORAL=3,3                             -- 结义那一拍的声望与品德：与被替代的那一支逐点相同，不做成刷子
 local YANZI,DUAN_SPRITE=52,6314                  -- 燕子坞场景号 / 段誉在场时原版摆的贴图
 local ABORT={}                                   -- 只用来从 E530 中途退出（等同原脚本的 do return end）

 local function flags() local v=GetD(REG_SCENE,REG_SLOT,REG_FIELD);return (type(v)=='number' and v>0) and v or 0 end
 local function has(bit) return math.floor(flags()/bit)%2==1 end
 local function mark(bit) if not has(bit) then SetD(REG_SCENE,REG_SLOT,REG_FIELD,flags()+bit) end end
 local function head(pid) local p=JY.Person[pid];return (p and p['头像代号']) or pid end
 local function who(pid) local p=JY.Person[pid];return p and p['姓名'] or nil end
 local function inTeam(pid) for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then return true end end return false end
 local function holds(id) return type(instruct_43)=='function' and instruct_43(id)==true end
 local function narrate(t) DrawStrBoxWaitKey(t) end
 local function hero(t) TalkEx(t,0,1) end
 local function murong(t) TalkEx(t,head(MURONG),0) end
 local function qiao(t) TalkEx(t,head(QIAO),0) end
 local function xuanci(t) TalkEx(t,head(XUANCI_PID),0) end
 local function guojing(t) TalkEx(t,head(GUOJING_PID),0) end
 -- 王语嫣的头像代号是 109（原版显示「???」），所以她每一句都显式传人物表里的姓名，不靠头像代号。
 local function yuyan(t) TalkEx(t,head(YUYAN),0,who(YUYAN)) end
 local function choose(rows) return ShowMenu(rows,#rows,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE) end

 -- 包住某个原事件，在指定的原对白号之后插一段；其余逐字照跑。
 local function after(tid,inject,source,id,...)
  local f1=instruct_1
  instruct_1=function(n,...)
   local r=table.pack(f1(n,...))
   if n==tid then inject() end
   return table.unpack(r,1,r.n)
  end
  local ok,err=pcall(source,id,...)
  instruct_1=f1
  if not ok then error(err,0) end
 end

 -- ============ 环① 少林 E514：玄慈当面说破慕容博 ============
 -- 原版 1857 是慕容复的「．．．．．」——整条线最好的挂点，那五个点是原脚本自己留下的空白。
 -- 不写他「早就知道」：原著里慕容博诈死、慕容复何时得知另有说法〔待核〕，所以这里按「他此刻第一次听见」写。
 -- 玄慈补的那句只沿用同一事件里他自己说过的「我亏欠乔峰一家人实在太多了」，不写人数、不写地名。
 local function atShaolin()
  narrate('（那一串省略号里，慕容复没有出声。他的手按在剑柄上，指节发白——要辩，便是承认这件事需要辩。）')
  murong('方丈这话，可有凭据。')
  xuanci('老衲亲手做下的事，还用什么凭据。乔峰的父亲、母亲，都在那一夜。你父亲一句话，老衲当作了军情。')
  narrate('（慕容复没有问第二句。他转身要走，走出两步又停下。）')
  murong('我慕容氏几十代人，图的是把丢掉的东西拿回来。')
  murong('从没有人跟我算过，为了拿回来，路上要先摆下多少人。')
  narrate('（他说完便下了石阶。那句话不像是对方丈说的，也不像是对你说的。）')
  instruct_0()
  mark(XUANCI)
 end

 -- ============ 环② 桃花岛 E466：郭靖那一课 ============
 -- 原版 1590 就是「为国为民，侠之大者」＋「敬我早年为国为民，奋不顾身地戍守襄阳」，
 -- 是全作唯一一处正面讲守边的文本。两人用同一个「国」字，说的不是同一件事。
 local function atPeach()
  narrate('（郭靖说完，堂上没有人接话。慕容复站在最后，一直没有开口。）')
  murong('郭大侠这「为国为民」四个字，说的是哪一国、哪一民？')
  guojing('……我不大会说话。我只知道襄阳城墙底下埋着的人，有汉人，也有别处来的。城破了，他们的家一样没了。')
  murong('那若是一国本来就已经没了呢。')
  guojing('那便更该守住眼前这一座城。没了的，谁也追不回来；眼前这座城里的人，还活着。')
  narrate('（慕容复没有再问。出岛的船上，他站在船尾看海，一句话也没说。）')
  instruct_0()
  mark(GUOJING)
 end

 -- ============ 环③ 丐帮 E530：结义 ============
 -- 触发条件（全部读既有 D 表、物品与品德，不新增字段）：
 --   ①慕容复在队；②段誉够不着那个位置（不在队，且本场景格24 贴图 ≠ 6314——原版摆段誉用的就是这一格）；
 --   ③囊中仍有带头大哥书信 183（E531 第一件事就是消耗它，所以「还在」＝一次都没用过）；
 --   ④囊中有天龙八部 147（＝E528 凭本事赢来的）；⑤品德 ≥ MORAL_GATE；⑥位标 XUANCI 已置。
 -- 条件②是 Tom 那句「慕容复**代替**段誉」在数据上唯一说得通的实现：段誉在场，原版归宿优先，彩蛋不开。
 local function eligible()
  local scene=JY.SubScene
  return inTeam(MURONG) and not inTeam(DUAN)
   and GetD(scene,24,5)~=DUAN_SPRITE
   and holds(LETTER) and holds(BOOK)
   and JY.Person[0]['品德']>=MORAL_GATE
   and has(XUANCI) and not has(SWORN)
 end

 -- 他不是在这一拍放弃复国：他是把「毁掉乔峰」换成「得到乔峰」，仍旧是算计，而且自己把账当众算给对方听。
 -- 这一环必须写成算计，否则后面就没有可磨的东西（见 editorial 第三节）。
 local function sworn()
  narrate('（你把那封信从怀里取出来。纸被体温捂软了，折痕上有一层汗。丐帮上下几十双眼睛盯着这只手。）')
  hero('慕容公子，这封信是你带我去取的。取的时候你说过，它值一个乔峰。')
  hero('书已在我囊中，我没有用它。剩下这一张纸，你要，就拿去。')
  murong('……阁下这是什么意思。')
  hero('没什么意思。你自己拿主意。')
  narrate('（慕容复接了。他把信展开看了一眼——不是看内容，那上头的字他早已背熟——是看纸上有没有被人动过的折痕。）')
  qiao('那是什么？')
  murong('一封三十年前写的信。写信的人如今还在少林寺里坐着。')
  qiao('与我有关？')
  murong('与阁下这一生都有关。')
  narrate('（他说到这里停住了。厅上没有人出声，火盆里的炭爆了一响。）')
  murong('……烧了罢。')
  instruct_32(LETTER,-1)
  narrate('（纸卷起来，先黑后亮。乔峰上前一步又停住——那一步是要抢，停住是因为不知道抢来做什么。）')
  qiao('你为什么烧它？')
  murong('阁下不必谢我。我不是给你面子，是算过了。')
  qiao('算什么？')
  murong('毁一个乔峰，我得一个空名；得一个乔峰，将来用得着的地方，比一张纸多。')
  murong('我慕容复一辈子做的都是这种账。今日这一笔，我算得清楚，说得也清楚。')
  narrate('（他说完才转过头来，像是要看这句话把对面的人得罪成什么样子。）')
  qiao('哈哈！——好一个算得清楚。')
  murong('阁下不恼？')
  qiao('恼什么。天下人待乔某好，十个里有九个先算过账。你把账摆在桌面上算，已经强过那九个。')
  narrate('（乔峰提起一坛酒，在阶石上一磕，磕开了泥封。）')
  qiao('「北乔峰、南慕容」叫了这些年，今日头一回见面。你替乔某烧了一张纸，乔某请你喝一坛酒。')
  murong('一坛酒换一封信。阁下这买卖做得亏。')
  qiao('那就不作买卖。你我结为兄弟——往后你的账我替你算，我的仗你替我打。这样算不算不亏？')
  narrate('（厅上静了一息。慕容复的手在袖中攥了一下又松开。他这一生听过无数人开口，没有一个人开口是要与他平分什么。）')
  murong('……阁下当真。')
  qiao('乔某说话，从来只说一遍。')
  -- 不写香案、黄纸、三跪九叩：用乔峰自己的方式。原著里乔峰与段誉的结义也起于斗酒〔待核回目〕，
  -- 而游戏内 E525 乔峰第一句招呼就是「咱们喝酒」，这一条有本作文本支撑。年岁差不写数字〔待核〕。
  narrate('（没有香案，没有黄纸。乔峰先饮了一口，把酒坛递过去。慕容复接过来，站着把剩下的半坛喝完了。）')
  qiao('乔某虚长几岁，托个大。')
  murong('……兄长。')
  narrate('（他叫得很生硬，像一个从没学过这两个字的人，第一次把它念出口。）')
  if inTeam(YUYAN) then
   narrate('（廊下的姑娘一直没有出声。她看着表哥把那封信投进火里，看了很久——燕子坞的书她都读过，那封信原本做什么用，她比谁都清楚。）')
   yuyan('表哥……')
   murong('（没有回头）今日的事，不必写进家谱。')
   yuyan('家谱上早该少写几笔了。')
  end
  narrate('（他为自己找了一个说得过去的理由，才肯做这件事。可这件事到底是做了。）')
  -- 收束：与原版同一支一样把摆出来的贴图撤掉（他与她回到队伍里，不留在丐帮站着）。
  -- 格22 原版开场必设，故必撤；格23 只在原版真的摆过（贴图 6298）时才撤——原版在没摆的那一支里
  -- 也是一格都不碰的，照它的样子来，D 表差异最小。
  -- **不动** 燕子坞 52/1 与 52/2，**不让任何人离队**——这正是与既有结局的分岔处。
  instruct_14()
  instruct_3(-2,22,0,0,-1,-1,-1,-1,-1,-1,-2,-2,-2)
  if GetD(JY.SubScene,23,5)==6298 then instruct_3(-2,23,0,0,-1,-1,-1,-1,-1,-1,-2,-2,-2) end
  instruct_0()
  instruct_13()
  instruct_56(FAME)
  instruct_37(MORAL)
  mark(SWORN)
 end

 -- 包住 E530：原版 1946–1949 照播，只在主角 1950（「那，恕在下得罪了」）之前给一次选择。
 -- 选「不插手」与 ESC 逃逸都下调原版整段：揭发→战斗85→离队→王语嫣归宿，既有结局一字不动。
 local function gangHall(source,id,...)
  local f1=instruct_1
  local fire=false
  instruct_1=function(tid,...)
   if tid==1950 and not fire and eligible() then
    local pick=choose({{'把带头大哥书信取出来，交到慕容公子手里',nil,1},
                       {'不插手，看他要做什么',nil,1}})
    if pick==1 then fire=true;error(ABORT) end
   end
   return f1(tid,...)
  end
  local ok,err=pcall(source,id,...)
  instruct_1=f1
  if not ok and err~=ABORT then error(err,0) end
  if fire then sworn() end
 end

 -- ============ 环④ 丐帮复访 E529：义兄弟那一问 ============
 -- 「抗击外敌」的种子，同时明写它不是排契丹——乔峰本人就是契丹人，是他的义兄。
 local function atGangAgain()
  if not has(REVISIT) then
   narrate('（乔峰正坐在阶上补一只破碗。见你们进来，把碗往旁边一搁。）')
   qiao('兄弟，上回那坛酒你只喝了半坛。')
   murong('剩下的半坛，兄长自己喝了。')
   qiao('哈哈，记性倒好。')
   narrate('（慕容复没有笑。他看着阶下丐帮弟子来来去去，看了一会儿。）')
   murong('我有一句话，问过就不再问。')
   qiao('说。')
   murong('北边若真起了兵，丐帮往哪边站？')
   narrate('（厅上安静下来。这句话在这里问，问的是什么，人人都明白。）')
   qiao('往挨打的那边站。')
   murong('不问是哪一边的人？')
   qiao('乔某这条命就是这么捡回来的。挨打的时候，谁问过乔某是哪一边的人。')
   narrate('（慕容复点了点头，说了声「我记下了」，此后一路再没开口。）')
   mark(REVISIT)
  else
   qiao('碗补好了，酒也还在。兄弟，你来得少了。')
  end
  instruct_0()
 end

 -- ============ 环⑤ 领武林帖 E932：分别 ============
 -- 只有话，不给任何数值：不加物品、不加银两、不动品德声望。玉玺与世系图表只在旁白里出现，不作为物品发放。
 -- 「只结义、不成婚」的改法（若 Tom 按 editorial §4.2 另有裁定）：删掉下面 WEDDING 标注的两段即可，其余不动。
 local function farewell()
  narrate('（请帖压在桌角。屋里的人都知道这意味着什么——接下来那一程，谁也帮不上。）')
  if not has(GUOJING) then
   -- 短版：结义之情成立，但「放弃复国」没有被磨够，就不许诺它。Tom 说过「不圆满但成立」也算数。
   murong('这封帖子上的名字只有一个。我就不送了。')
   hero('往后呢？')
   murong('我姓慕容。我这一姓要做的事，还没有做完。')
   narrate('（他顿了顿，又添了一句。）')
   murong('只是有一桩：我如今是有兄长的人了。要做的事里头，有一件我已经划掉——不再去动他。')
   narrate('（他抱了抱拳，转身出门。你没有问他划掉的是哪一件。）')
   instruct_0()
   mark(FAREWELL)
   return
  end
  murong('这封帖子上的名字，只有一个。')
  hero('是。')
  murong('那我就不送了。')
  narrate('（他从怀里取出两样东西放在桌上：一方旧玉玺，边角磕过；一卷图表，头一页写着「大燕慕容氏世系」。）')
  murong('这两样，我带了半辈子。带着它们的时候，我看谁都先看能不能用。')
  murong('那一夜在少林，方丈说的话我没有辩，因为辩不动。这些日子我一路想：家父那一句话摆下去的人里，有乔峰的父亲、母亲，有那一夜死的人，也有我自己。')
  murong('我这一姓要的那张椅子，若真坐上去了，底下也是这么堆起来的。')
  hero('那你往后做什么？')
  murong('往北。边上的事我懂。')
  murong('我父亲当年拿一句假话，能叫两边打起来。我如今拿真话，或许能叫两边少打一场。')
  murong('宋人若用得着我，我就在军前当个使得动的人；用不着，我就在关口守着，看有没有人再来假传一次音讯。')
  murong('我不再是要复什么国的人了。我只是一个知道那条路通到哪里的人。')
  murong('兄长那边我已经去过信。他说等边关的风紧起来，他就来。')
  if inTeam(YUYAN) then
   -- WEDDING（其一）
   yuyan('表哥这一去，几时回来。')
   murong('不回来了。燕子坞的书你都读过；那些书往后也不必替我读了。')
   narrate('（她走到桌边，把那卷图表卷好，用自己的丝绦系住。）')
   yuyan('那我带着。你不看，我替你收着——不是替慕容氏收，是替你收。')
   murong('……关外苦。')
   yuyan('燕子坞的日子我过腻了。你要走的那条路，我这辈子头一回听你说得这样明白。')
   narrate('（慕容复没有再推。他把玉玺留在桌上，只接过了那卷图表——那是她系的。）')
   murong('等你从华山回来，来关外找我们。那时你若还愿意喝酒，我请。')
   narrate('（他们走的时候天还没亮。桌上留下一方玉玺，你没有动它。）')
  else
   -- WEDDING（其二）：她不在队时不当场断言婚事，只写成一句未竟之言，不替玩家做没做过的事。
   murong('还有一件事，拖了十几年没说。我先回一趟燕子坞。')
   hero('说什么？')
   murong('一句她等了十几年、我一直觉得不急的话。')
   narrate('（他把那卷图表也放回桌上，走得很快，像是怕自己改主意。桌上留下一方玉玺、一卷世系，你没有动它们。）')
  end
  instruct_0()
  mark(FAREWELL)
 end

 -- E932 领武林帖：在原版 instruct_59（全员离队）之前说完。分别这一拍必须排在人散之前。
 local function letterDay(source,id,...)
  local f59=instruct_59
  instruct_59=function(...) farewell();return f59(...) end
  local ok,err=pcall(source,id,...)
  instruct_59=f59
  if not ok then error(err,0) end
 end

 -- ============ 接线 ============
 -- 只有真会做事的那几种情形才包；其余原样下调，不加一层 pcall。
 local sourceEvent=oldCallEvent
 local function dispatch(id,...)
  if id==514 and inTeam(MURONG) and not has(XUANCI) then return after(1857,atShaolin,sourceEvent,id,...) end
  if id==466 and inTeam(MURONG) and not has(GUOJING) then return after(1590,atPeach,sourceEvent,id,...) end
  if id==530 and inTeam(MURONG) and not has(SWORN) then return gangHall(sourceEvent,id,...) end
  if id==529 and inTeam(MURONG) and has(SWORN) then return after(2199,atGangAgain,sourceEvent,id,...) end
  if id==932 and inTeam(MURONG) and has(SWORN) and not has(FAREWELL)
   and type(instruct_59)=='function' then return letterDay(sourceEvent,id,...) end
  return sourceEvent(id,...)
 end
 oldCallEvent=function(...) return dispatch(...) end

 -- 供其他层按需读取（跨层一律 rawget 探测，本层未合并时无副作用）。加载期赋值，不是运行时新建全局。
 BrowserMurongEgg=function() return flags() end
end)()
