-- 157 黑化线与组队门槛（editorial/黑化线与组队门槛157.md，接线补丁见 reviews/darkpath157-patch-suggestions.md）
-- Tom 2026-09-18：①狄云、杨过各一条**可选**黑化支；②令狐冲与张无忌不该被正派门槛挡住；
-- ③主角一旦修练辟邪剑法或葵花宝典，不能与任何女性角色组队。
--
-- 只在扩展层包住原事件与原指令：不改 oldevent_*.lua、不新增事件号、不新增存档字段、不改任何数值。
-- 本层的 oldCallEvent 包装**永远下调 source**，不整段接管任何事件——好感层排在外层仍收得到全部心结与渊源。
--
-- 【第（二）条的现状：没有门槛，所以本层对令狐冲(35)与张无忌(9)一行都不写】
--   读码核实：令狐冲三支入队 E242／E243／E967、张无忌三支 E71／E72／E955，**没有一处 instruct_28（判断品德）**；
--   E242 只要翡翠杯(127)、E71 只要一撮金毛(181)，两件都是纯拾取（E921／E68），而且入队末尾还各加品德 +3／+2。
--   重制层里 instruct_28 一次都没有被调用或改写；包过 instruct_10 的四处（growth-extension 129/188/1143、
--   starter-equipment 52、tianbo、zhou）全是入队之后的记账，没有一处会拒绝入队。**没有要修的东西。**
--   全作真正存在的品德门槛是：虚竹≥75、程英≥65、狄云≥60、段誉≥40、阿紫／游坦之≤40、欧阳克须队中有女性。
--   这四条本层一条都不动（Tom 只点名了令狐冲与张无忌）——唯一的例外是狄云那条，见下 §二 的黑化支。
--
-- 【位标】南贤居(64) 事件格 194 第8栏。原版该格十一栏全为 0〔读 data/alldef.grp 核实，测试里逐栏断言〕，
--   场景里没有格子指向它，引擎只在第2栏>0 时才列入「附近」，本层只写第8栏。
--   特意跳开 195／196，留给并行的林平之／慕容复两个彩蛋子任务（199 身世、198 易筋、197 田伯光已占）。
--   随正常存档的事件表保存；旧档此栏为 0 ＝ 三条支全未开，一切照原样。
;(function()
 local REG_SCENE,REG_SLOT,REG_FIELD=64,194,8
 local DIYUN_SEED,DIYUN_DARK,YANG_SEED,YANG_DARK,YANG_DEED,RULE_TOLD=1,2,4,8,16,32
 -- 2026-09-30 杨过去襄阳的真实离场：ROAD＝已动身（点头时不在队，或点头后被请离队），BACK＝主角住过一宿、他已回来。
 -- 同一栏再加两位，旧档此两位恒为 0；YANG_DEED 已置的旧档一字不动。
 local YANG_ROAD,YANG_BACK=64,128
 local REST_PLACES={[1]=true,[3]=true,[40]=true,[60]=true,[61]=true,[70]=true}   -- 与 rest-save-extension 的歇宿地点同一组
 local DIYUN,YANG=37,58

 -- 自宫之后，**已经在队**的女性怎么办。Tom 2026-09-18 已裁定规则本身不改（「条件不用改。毒医路线可以先学会
 -- 医毒再自宫就没问题……自宫总得付出点代价」），已在队的怎么处理仍由制作端定，取舍见 editorial 第 4.3 节。
 --   'leave' 当场礼貌离队（默认）——走原版 instruct_21，各自说一句话再走，不凭空消失
 --   'keep'  只拒绝新入队，已在队的留着
 -- 用 'leave' 时必须同时合并补丁第 3 节（把代价写进自宫那句 confirm）；现有文案一个字也没提这件事。
 local DEPARTURE='leave'

 local function num(v) return type(v)=='number' and v or 0 end
 local function flags() local v=GetD(REG_SCENE,REG_SLOT,REG_FIELD);v=num(v);return v>0 and v or 0 end
 local function has(bit) return math.floor(flags()/bit)%2==1 end
 local function mark(bit) if not has(bit) then SetD(REG_SCENE,REG_SLOT,REG_FIELD,flags()+bit) end end
 local function unmark(bit) if has(bit) then SetD(REG_SCENE,REG_SLOT,REG_FIELD,flags()-bit) end end
 local function head(pid) local p=JY.Person[pid];return (p and p['头像代号']) or pid end
 local function hero(t) TalkEx(t,0,1) end
 local function say(pid,t) TalkEx(t,head(pid),0) end
 local function narrate(t) DrawStrBoxWaitKey(t) end
 local function blank() if type(instruct_0)=='function' then instruct_0() end end
 local function inTeam(pid) for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then return true end end return false end
 local function choose(rows) return ShowMenu(rows,#rows,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE) end

 -- ============================================================
 -- 〇、「很恶的恶行」的可判定口径（依据见 editorial 第 2.3 节）
 -- ============================================================
 -- 本作唯一能拿来判定恶行的痕迹是 instruct_37(v)（增加品德，jymain:3586）。全量统计 1018 个事件共 92 处负品德：
 --   −1×66（多在 E832–E923 的市井小恶）、−2×5、−3×3、−4×3、−5×5、−6×6、−10×3、−14×1。
 -- 好感层已有同一套词汇：RULES.moralDrop=3＝「一次 −3 或更差」算标志性邪行。这里再加一档：
 --   **很恶的恶行 ＝ 本程发生过一次 ≤ −5 的折损（事件要素） 且 当前品德 < 20（数值要素）**。
 -- 事件要素只活在本次运行内（不新增存档字段）；读档后退化为只看品德——宁可放过，不可错杀。
 local HEAVY,WICKED_MORAL=-5,20
 local heavy=false
 local function wicked()
  local p=JY.Person[0]
  return heavy and p~=nil and num(p['品德'])<WICKED_MORAL
 end
 if type(instruct_37)=='function' then
  local sourceMoral=instruct_37
  instruct_37=function(v,...)
   if type(v)=='number' and v<=HEAVY then heavy=true end
   return sourceMoral(v,...)
  end
 end
 -- 事件要素不进存档，所以读档时必须复位：读回来的那一程未必做过这件事。
 -- 复位之后只剩数值要素（品德 < 20）——宁可放过，不可错杀。
 if type(LoadRecord)=='function' then
  local sourceLoad=LoadRecord
  LoadRecord=function(...)
   heavy=false
   local r=table.pack(sourceLoad(...))
   return table.unpack(r,1,r.n)
  end
 end

 -- ============================================================
 -- 一、主角自宫之后不与女性组队（Tom 第（三）条）
 -- ============================================================
 -- 底层事实：CC.Person_S['性别']={28,0,2}（人物档第28字节，随存档保存），0 男／1 女／**2 已自宫**；
 --   CC.Shemale={[78]=1,[93]=1}＝辟邪剑谱与葵花宝典。主角写成 2 只有两条路：
 --   practice-extension.lua:61-63（人物界面选书）与 :96-98（直接用书），都判 性别==0 才 confirm。
 --   instruct_63（设置性别）全作只用过一次，写的是林平之（E289）。所以 JY.Person[0]['性别']==2
 --   ⟺ 主角为了修这两本书自宫过——判定唯一、无歧义、已在存档里，不必新增字段。
 -- 本条**只约束主角**：数女性用原版 instruct_42（只数 性别==1），田伯光阉后写的是 2，不进这个计数，
 --   他阉后可直修辟邪葵花那一条由 tianbo-extension 实现，本层一行不碰。
 local function eunuch() local p=JY.Person[0];return p~=nil and num(p['性别'])==2 end
 -- **明确名单，不单看「性别」栏。** 底表里性别为 1 的共 12 人，其中**东方不败(27) 是数据与原著不符**：
 -- 原著他是男子（自宫修习葵花宝典之后才作女装），本作底表却把「性别」记成 1。这是数据问题，不是我们写错，
 -- 也不该由这条规则去坐实它（口径同本作对金蛇锥「原著写它喂毒、本作底表未给毒性」的处理：单列说明、不改数据）。
 -- 所以这里用名单：程灵素2、灭绝6、王难姑17、定闲21、蓝凤凰25、阿紫47、黄蓉56、小龙女59、程英63、瑛姑66、王语嫣76。
 -- 其中只有 2、17、25、47、59、63、76 七人全作有 instruct_10（招得到），其余四人本来就招不到。
 -- 注：原版 instruct_42（队伍中是否有女性）仍按「性别==1」数，会把东方不败算进去；但他全作没有入队事件，
 -- 永远不可能在队里，所以这条差异在游戏中不可达，本层也不去改原版指令。
 local WOMEN={[2]=true,[6]=true,[17]=true,[21]=true,[25]=true,[47]=true,[56]=true,[59]=true,[63]=true,[66]=true,[76]=true}
 local function female(pid) return WOMEN[pid]==true end
 local function barred(pid) return eunuch() and female(pid) end
 -- 这条规则**只管「组队」**：不回溯剥夺玩家已经学到的东西。已学的用毒／医疗武学、已拿到的传承秘籍、
 -- 已记的好感，一律原样保留——本层从不写 JY.Person 的武功／能力栏，也不动好感记录与行囊。
 -- 想走毒医路线的玩家，先把医毒与相关传承拿到手，再决定要不要挥这一刀；顺序自己安排，这本身就是代价的一部分。

 local REFUSAL={
  [2]='公子身上那股药气不对。我闻得出来——那不是伤，是你自己下的手。这样的人，我不同行。',
  [17]='我这辈子什么样的方子都见过。为一部书自断根本的，我见过三个，没一个活成人样。你自己走罢。',
  [25]='我们苗疆的人不忌讳这些。可你这一刀是冲着女人来的——你怕我们，才拿刀剁了自己。我不跟怕我的人走。',
  [47]='咦？你……（她盯着看了半晌，忽然笑起来）你居然真练那个。我才不要跟你一路，无趣死了。',
  [59]='你和过儿不一样。我不与你同行。',
  [63]='……恕难从命。公子的事，程英不便多问，也不便同行。',
  [76]='我表哥书房里那些图谱，写过这两门的来历。既然公子已经练了，那就不必再说什么了。',
 }
 -- 已在队的女性辞行时说的话（与「拒绝入队」分开写：一个是没走过路的人，一个是同行过一程的人）。
 local FAREWELL={
  [2]='这些天的伤都是我包的，我知道你身上添了什么。公子保重，药方我留在箱子里了。',
  [17]='我不骂你。人各有各的执念，我自己也有过。只是往后你的伤，得另找人看了。',
  [25]='一路上的酒是好酒。可这一条路我陪不到底了——你自己走罢，路上当心毒虫。',
  [47]='本来还想看看你能走到哪一步呢。算了，这下真没意思了。我走啦。',
  [59]='我要回古墓去了。你待我们不薄，我记着。',
  [63]='这些日子多谢照拂。程英言尽于此，就此别过。',
  [76]='表哥常说，人各有各的路。公子的路我跟不上了。那几册武功图谱，我抄了一份留下。',
 }
 local function refuse(pid,leaving)
  say(pid,(leaving and FAREWELL[pid]) or REFUSAL[pid] or
   (leaving and '同行一程，多谢照拂。就此别过。' or '你的事我听说了。这一程，恕不奉陪。'))
  blank()
  if not has(RULE_TOLD) then
   narrate('你已不是那个能与女子同行江湖的人了。这条路是你自己走上的，往后也只能自己走。')
   mark(RULE_TOLD)
  end
 end

 -- 事件号 → 该事件依次加入的人物（读 oldevent_*.lua 全量检索 instruct_10 得到；顺序即脚本内的出现顺序）。
 -- 这 18 个事件涵盖本作全部 7 名可入队女性（程灵素2、王难姑17、蓝凤凰25、阿紫47、小龙女59、程英63、王语嫣76）；
 -- 其余 5 名女性（灭绝6、定闲21、东方不败27、黄蓉56、瑛姑66）全作没有 instruct_10，本来就招不到。
 local JOINS={[42]={2},[953]={2},[97]={17},[959]={17},[616]={25},[617]={25},[961]={25},
  [561]={47,48},[979]={47},[440]={59},[441]={59},[993]={59},[402]={63},[403]={63},[997]={63},
  [495]={76},[594]={76},[999]={76}}
 -- E561 是唯一一个「女的先入队、男的跟着」的事件（阿紫47 → 游坦之48），而且阿紫这一支若走
 -- 「队伍已满」的回绝路就整段 do return，游坦之再也轮不到。**这条规则只约束主角、不该连累队友**，
 -- 所以 E561 不走那条优雅回绝路，改由下面的 instruct_10 兜底拦（代价是阿紫那一格照原样清掉——
 -- 反正她此后永远进不了队；游坦之照常可入队，只把那句「阿紫姑娘你别丢下我」换掉）。
 local MIXED={[561]=true}

 -- 优雅回绝：原版每一支入队都自带一条「队伍已满」的退路（instruct_20 为真 → 说对白 175 → return），
 -- 那条路**不清格、不变黑、不加入**。让 instruct_20 对被挡住的那个人返回真，事件就走它自己写好的退路，
 -- 我们只把 175 那句换成她自己的话。一个钩子，零副作用。
 local function gracefulRefusal(list,source,id,...)
  local f20,f1=instruct_20,instruct_1
  local n,pending=0,nil
  instruct_20=function(...)
   n=n+1
   if f20(...) then return true end                      -- 队伍真满：照原版说 175，不夺她的词
   -- 这 17 支每支只加一个人（E561 是唯一的两人支，走 mixedRefusal），所以单人支一律认 list[1]，
   -- 不靠「第几次问队满」去数——那样一旦脚本里有第二处队满判断就会错位。
   local pid=(#list==1) and list[1] or list[n]
   if pid and barred(pid) then pending=pid;return true end
   return false
  end
  instruct_1=function(tid,...)
   if tid==175 and pending then local pid=pending;pending=nil;refuse(pid);return end
   return f1(tid,...)
  end
  local ok,err=pcall(source,id,...)
  instruct_20,instruct_1=f20,f1
  if not ok then error(err,0) end
 end

 -- E561：照原样跑，只在真要加入阿紫那一刻拦下，并把游坦之那句求情换成对得上的话。
 local function mixedRefusal(source,id,...)
  local f1,f37=instruct_1,instruct_37
  local dropped=false
  instruct_37=function(v,...)
   if not dropped and v==-2 then dropped=true;return end  -- 阿紫没入队，她那一支的 −2 不该结算
   return f37(v,...)
  end
  instruct_1=function(tid,...)
   if tid==2127 then
    say(48,'阿紫姑娘不肯跟少侠走……那、那我呢？我这副样子，本来也没人肯要。')
    return
   end
   return f1(tid,...)
  end
  local ok,err=pcall(source,id,...)
  instruct_1,instruct_37=f1,f37
  if not ok then error(err,0) end
 end

 -- 兜底闸口：今后任何一条入队路径（含日后新增的）都走 jymain:3104 的 instruct_10。
 -- 上面的优雅回绝已经覆盖了现有 18 个事件，这里只是保证规则不被绕过。
 local sourceJoin=instruct_10
 instruct_10=function(pid,...)
  if barred(pid) then refuse(pid);return end
  return sourceJoin(pid,...)
 end

 -- 已在队的女性：**当场礼貌离队，不是凭空消失**。放在**事件边界**做，不在事件中途、也不在读档中途。
 -- 离队走原版 instruct_21（practice-extension.lua:119 已包过它——归还实体秘籍并 sync；本层排在它外面，
 -- 所以那一层照常跑）。兵器、防具与实体秘籍按原规则归公，**玩家已学的本领与进度一律不动**。
 -- 口径 'keep' 时这一段整段不跑。
 local function sweep()
  if DEPARTURE~='leave' or not eunuch() then return end
  if type(instruct_42)=='function' and not instruct_42() then return end
  local gone={}
  for i=CC.TeamNum,1,-1 do
   local pid=JY.Base['队伍'..i]
   if pid and pid>0 and female(pid) then gone[#gone+1]=pid end
  end
  if #gone==0 then return end
  local names={}
  for i,pid in ipairs(gone) do names[i]=JY.Person[pid]['姓名'] end
  narrate('你那一刀的事，瞒不了几日。到了这一天，队里的几位姑娘各自来向你辞行。')
  for _,pid in ipairs(gone) do refuse(pid,true);instruct_21(pid) end
  narrate(table.concat(names,'、')..'收拾了行装，先后出门，都没有回头。'..
   '兵刃、防身之物与随身的秘籍都留在了行囊里；你自己学到手的本领，一样也没有少。')
 end

 -- ============================================================
 -- 二、狄云黑化：「不幸之人不必永远不幸」（可选支）
 -- ============================================================
 -- 前因全部是原版自带的，不必新编一句往事：
 --   E599 对白 2225／2229 是狄云自己讲的一整串磨难——为万震山祝寿被诬勾结盗匪、下狱数年、师父死、
 --   师妹嫁了万师兄、狱中丁典传神照经、越狱后丁典被府尹下毒害死、他又被番僧捉来关在天宁寺。
 --   实物证据也是现成的：他的底表本来就会「血刀大法」三级（content.js people[37] 武功1=63/等级300）。
 --   那把刀是在藏边雪谷里落到他手上的，他不想要，江湖也不问他想不想要〔待核回目〕。
 -- 两道口，各要玩家主动点头一次；任何一次选另一项都一字不留地回原路。
 local function diyunSeed()
  narrate('他说完了，也就不再说话。牢里那点光从他背后照过来，看不清脸。')
  local pick=choose({{'这笔账，总有清的一天。',nil,1},{'那些人，现在都还好好活着。',nil,1}})
  if pick~=2 then
   if pick==1 then
    say(DIYUN,'清？……兄台是好人，好人才这么想。')
    narrate('他没有再往下说，低头去揉那只被夹棍夹坏的手。')
    blank()
   end
   return false
  end
  hero('那些人，现在都还好好活着。')
  say(DIYUN,'……')
  hero('万震山在荆州，你师妹在他家里，那个府尹还坐在那把椅子上。你在这儿。')
  say(DIYUN,'兄台这话，是要我做什么？')
  hero('我什么也不要你做。我只是说一句你已经知道的话。')
  narrate('狄云没有答。过了很久，他才把那只坏手从袖子里抽出来，摊在膝上看。那只右手五指俱残，是当年在万家遭陷害时留下的伤。')
  blank()
  mark(DIYUN_SEED)
  return true
 end

 -- 口二：天宁寺取出《连城诀》之后。好感层的心结（KNOTS pid=37 event=644）排在外层，
 -- 他那句「我看一眼就够了」会先播完，这一段正好接着问下去。
 local function diyunDecide()
  hero('够了？')
  say(DIYUN,'兄台听见了。')
  hero('我不信。')
  narrate('狄云没有接。他看的不是你，是你手里那卷东西——那是把他师父、两位师伯、他师妹，还有他自己，一个一个都填进去的东西。')
  say(DIYUN,'我在牢里数过。一千八百多天，我数过三遍。头一遍数的是冤枉，第二遍数的是我师妹，第三遍……第三遍我不数了。')
  hero('第三遍你数的是什么？')
  say(DIYUN,'我数我背上那把刀。')
  narrate('他说的是血刀。那把刀是在藏边的雪谷里落到他手上的，他不想要，江湖也不问他想不想要——从那以后，人人都叫他血刀老祖的传人。')
  say(DIYUN,'我这条命，清白过，没人信；背了刀，人人都信。兄台说，这是谁的错？')
  local pick=choose({{'刀放下罢。你不是他们说的那个人。',nil,1},{'你要的是那把刀，不是这卷书。',nil,1}})
  if pick~=2 then
   hero('刀放下罢。你不是他们说的那个人。')
   say(DIYUN,'……兄台是第一个这么跟我说话的人。')
   narrate('他把手从刀柄上拿开，在衣襟上擦了两下，像是刚碰过什么脏东西。这一晚他睡得很沉。')
   blank()
   unmark(DIYUN_SEED)                                    -- 劝住了就是劝住了；要重来得自己再问一次
   return
  end
  hero('你要的是那把刀，不是这卷书。')
  say(DIYUN,'兄台看得明白。')
  narrate('他伸手把刀从背上解下来，横放在膝头。这是他头一回不是为了打架而去碰它。')
  say(DIYUN,'我不杀无辜的人。这一条我不改——我在牢里发过誓，谁再冤枉一个人，我先要谁的命。')
  hero('那你要谁的命？')
  say(DIYUN,'要那些把冤枉当本事使的人的命。至于江湖上怎么叫我，随他们。反正从前我干干净净，他们也没少叫。')
  narrate('他把刀重新背上，绳结打得比从前紧。往后同行的日子里，他不再说「我这个不幸之人」那句话了。')
  blank()
  mark(DIYUN_DARK)
 end

 -- E644 之后：他在队才问得起来。口一没走过也不至于走进死路——补问一次，仍要两次点头。
 local function diyunAfterBook(source,id,...)
  local ok,err=pcall(source,id,...)
  if not ok then error(err,0) end
  if has(DIYUN_DARK) or not inTeam(DIYUN) then return end
  if not has(DIYUN_SEED) then
   narrate('狄云把那卷东西还回来之后，就一直站在门边没动。')
   local pick=choose({{'走罢，这地方不必久留。',nil,1},{'那些人，现在都还好好活着。',nil,1}})
   if pick~=2 then return end
   hero('那些人，现在都还好好活着。')
   say(DIYUN,'……我知道。')
   mark(DIYUN_SEED)
  end
  diyunDecide()
 end

 -- 黑化之后的入队：E600／E940 那条「品德 60–100」对他失效（他不再拿主角的品德挑人），
 -- 入队也不再 instruct_37(+3)——跟着一个自认血刀传人的人走，江湖不会因此高看你。
 -- **底线**：主角若真做过很恶的恶行（§〇 口径），他当场说穿并拒绝。
 local function diyunDarkJoin(source,id,...)
  local f28,f1,f37=instruct_28,instruct_1,instruct_37
  local bad=wicked()
  instruct_28=function(pid,lo,hi,...)
   if pid==0 and lo==60 and hi==100 then return not bad end
   return f28(pid,lo,hi,...)
  end
  instruct_1=function(tid,...)
   if tid==2236 then
    narrate('狄云看了你很久，手一直没离开刀柄。')
    say(DIYUN,'我背这把刀，是因为世上有人把冤枉当本事使。你做的那些事，我在牢里听过一模一样的。')
    say(DIYUN,'你我不是一路的。你走罢。')
    return
   end
   if tid==2235 then
    say(DIYUN,'从前我怕连累人，所以不敢跟人走。如今我不怕了——该怕的是别人。')
    say(DIYUN,'兄台若不嫌，狄某跟你走一趟。')
    return
   end
   return f1(tid,...)
  end
  instruct_37=function(v,...) if v==3 then return end;return f37(v,...) end
  local ok,err=pcall(source,id,...)
  instruct_28,instruct_1,instruct_37=f28,f1,f37
  if not ok then error(err,0) end
 end

 -- ============================================================
 -- 三、杨过黑化：「那只手的账」（可选支）
 -- ============================================================
 -- 【必须写明的改编声明】原著里郭芙确实斩断了杨过右臂，但杨过此后数次有机会杀她而终究没有下手，
 --   襄阳城下反而救过她〔待核回目〕。**「失手重伤郭芙」是本作的 if 支，不是原著事实。**
 -- 【实现约束】郭芙在本作里**根本不存在**：320 条人物记录里没有她，1018 个事件里「郭芙／断臂／右臂」
 --   一次都没出现；全作唯一提到这件事的是 E394 对白 1270（主角那句粗话，连名字都没点）。
 --   断臂在本作时间线上已经发生在开场之前。所以这件事**只能由杨过自己追述**——
 --   不演出郭芙、不新建人物、不加战斗，一句也不写成原著。
 -- 2026-09-30 按实际场景适配：原版 E436（绝情谷底重逢）清掉神鵰穴 (7,6)，把他与龙儿一起安置到古墓 18；
 -- E990 也按龙儿是否还在谷底（80/1 贴图 6068）决定送回神鵰穴还是古墓。所以本支在古墓播＝已经重逢，
 -- 在神鵰穴播＝十六年之约尚未到、龙儿未回：古墓里不写洞、石台、大鵰，也不写「等龙儿回来」。
 local function atTomb() return JY and JY.SubScene==18 end
 local function yangSeed()
  local tomb=atTomb()
  local pick=choose({{tomb and '杨兄保重，与龙姑娘好好过日子。' or '杨兄保重，等龙姑娘回来。',nil,1},{'杨兄，那只手的账，我想再问一句。',nil,1}})
  if pick~=2 then
   -- 神鵰穴：约期未满，是盼着十六年之约，不是已熬满十六年。
   if pick==1 then say(YANG,tomb and '好。兄弟也保重。' or '等得。她约我十六年后相见，我便一日一日数着盼。');blank() end
   return false
  end
  hero('杨兄，那只手的账，我想再问一句。')
  say(YANG,'……你问罢。')
  hero('断你手的那个人，如今在哪里？')
  narrate('杨过没有立刻答。他左手按在剑上，那把剑重得很，按着按着，指节都白了。')
  -- 2026-09-30：本作没有交代郭芙的婚事，不说「嫁了人」。
  say(YANG,'在襄阳。好好地活着，城里人都敬她是郭大侠的千金，出门还有人替她牵马。')
  hero('你去过？')
  say(YANG,'去过。站在她家门外，站了一夜。')
  hero('然后呢？')
  say(YANG,'然后我回来了。我告诉自己：她是郭伯伯的女儿，郭伯伯待我不薄。')
  narrate('他说这句话的时候，像在背一段早就背熟了的东西。')
  blank()
  mark(YANG_SEED)
  return true
 end

 -- fresh＝同一次对话里紧接着口一（E396/E397/E991 刚问完那只手的账）；否则是上回逃开了口二、这回他自己再提。
 -- 2026-09-30：两种都不说「来得正好」「这些天」——同一次里他刚说完，下回再提也未必隔了几天。
 local function yangDecide(fresh)
  if fresh then
   say(YANG,'你既问到这里，我也问你一句。')
  else
   say(YANG,'兄弟，上回你问起那只手的账。我也有一句话，还没问你。')
  end
  hero('杨兄说。')
  say(YANG,'我想再去一趟襄阳。你劝不劝我？')
  narrate('他问得很平常，像在问天要不要下雨。可他左手一直搭在剑柄上，没有放下来过。')
  local pick=choose({{'别去。这一去，你就回不来了。',nil,1},{'我陪你去。该讨的话，总得讨。',nil,1}})
  if pick==1 then
   hero('别去。这一去，你就回不来了。')
   say(YANG,'……回不来的是我，还是她？')
   hero('都是。')
   narrate('杨过沉了很久，把手从剑柄上挪开。那只手一路挪到空荡荡的右袖上，停住了。')
   say(YANG,'好。我不去。')
   blank()
   unmark(YANG_SEED)                                     -- 劝住了；玩家要重来得自己再问一次
   return
  end
  if pick~=2 then return end                             -- 逃开菜单＝还没拿定主意，位标留着，下回他自己再提
  hero('我陪你去。该讨的话，总得讨。')
  say(YANG,'讨话。对，我只是去讨一句话。')
  narrate('他把剑从背上解下来，握在左手里掂了掂。那是玄铁重剑，寻常人连提都提不动。')
  say(YANG,'兄弟你记着——我只要一句话。她若肯说一声「我错了」，这事便了了。')
  if inTeam(YANG) then
   -- 原版刚把他招进队（E396／E397／E991 同一次）：不凭空离队，等主角请他回去歇着（E990）时再动身。
   say(YANG,'这一趟我自己去。只是兄弟眼下还用得着我，我不走；哪天你让我回去歇着，我再动身。')
   blank()
   mark(YANG_DARK)
   return
  end
  say(YANG,'这一趟我自己去，今夜就动身。')
  say(YANG,'你先去忙你的，找个地方歇上一宿再来——等我回来，说给你听。')
  blank()
  mark(YANG_DARK);mark(YANG_ROAD)
 end

 -- 追述：没有选项。写出「失手」而非蓄意（左手、重剑、只想格开），也写出他自己不肯拿「失手」脱身；
 -- 他的过法是不辩解、不认她该得、也不让别人替他辩，最后落在他最在意的地方。
 local function yangDeed()
  -- 2026-09-30：玩家可能一转身就再来交谈，只写「他已从襄阳回来」，不写隔了多久；原「埋了三个月、第九十天」改成回来路上的事。
  -- 同日：按实际回访场景适配（神鵰穴 7／古墓 18，见 atTomb）；悔意主体一字不动。
  local tomb=atTomb()
  narrate(tomb and '再见到杨过时，他已从襄阳回来了。墓室里比外头冷得多。杨过坐在石床边，剑横在膝头，剑上裹着布，布是新的。'
   or '再见到杨过时，他已从襄阳回来了。洞里比上回冷。杨过坐在石台上，剑横在膝头，剑上裹着布，布是新的。')
  say(YANG,'兄弟坐。我把那趟事说给你听，说完你要走要留，随你。')
  say(YANG,'我到襄阳的时候是午后。她在城楼下，见了我就拔剑——她那把剑我认得，是她娘给的。')
  hero('你没有拔剑？')
  say(YANG,'我用左手去格。我这只手使惯了重剑，掂不准分寸。')
  narrate('他说到这里停了，把膝上那把剑往边上推了推，像是嫌它挨得太近。')
  say(YANG,'我只想把她的剑磕开。可那一下过去，她的右臂就垂下来了。')
  hero('……人呢？')
  say(YANG,'活着。骨头碎了，接不回去了。')
  narrate(tomb and '墓室里安静了很久，静得只听见自己的呼吸。' or '洞里安静了很久，远处那头大鵰在叫。')
  hero('杨兄，那是失手。')
  say(YANG,'兄弟这句话，我等了一路。可我自己不肯信。')
  say(YANG,'因为我在她手臂垂下来的那一瞬，心里松了一下。就那么一下。我到现在还记得。')
  narrate('他把裹剑的布解开一角，又裹回去。')
  say(YANG,'回来的路上，我把这剑埋了。走出没几步，又折回去挖了出来——不是舍不得，是怕。我怕哪天有人拿它去做我做过的事，而我连去拦的力气都没有。')
  hero('你打算怎么办？')
  say(YANG,'不怎么办。这件事我不辩，也不认她该得。我做了，我担着。')
  hero('要不要我去替你说一句？')
  say(YANG,'不要。你替我说了，这事就成了别人的事。')
  narrate('末了，他又叫住你，说了一句。')                -- 追述之后接原版再邀，不写「临走」
  say(YANG,tomb and '还有一桩。这件事……我不打算告诉龙儿。' or '还有一桩。等龙儿回来，这件事……我不打算告诉她。')
  say(YANG,'兄弟，我头一回有事瞒着她。')
  -- 2026-10-01 实玩：追述后紧接原版再邀（E397／E991 他问近况，E438 主角问古墓起居），话题转得太陡；补一句收住，不改原版各句。
  narrate('说完这些，他把剑搁到一边，像是把这件事也一并搁下了。')
  blank()
  unmark(YANG_BACK);mark(YANG_DEED)
 end

 -- 已动身、主角还没住过一宿：原地再谈只见他收拾行装，不走原版再邀（正出门的人招不进队）。
 local function yangPacking()
  narrate('杨过正把玄铁重剑裹进布里，行装已经收拾停当。')
  say(YANG,'兄弟，我今夜就动身去襄阳。你先去忙你的，歇过一宿再来。')
  blank()
 end

 -- 挂在 E396（断肠草救活）／E397（再访）／E991（客栈重邀）**整段跑完之后**：
 -- 原版那三段一字不改地先跑完，入队、品德 +3、事件表与不加本层时完全相同。
 -- E396 的前置是「断肠草真的解了情花之毒」：没带断肠草时原版 instruct_4 直接 return，一句话也不说，
 -- 那时候还没有前因，本层也不该开口。以他那句 1297（「我杨某这条命是少侠你救回来的」）为准。
 local function yangAfter(source,id,...)
  local cured=(id~=396)
  local f1=instruct_1
  if id==396 then
   instruct_1=function(tid,...)
    if tid==1297 then cured=true end
    return f1(tid,...)
   end
  end
  local ok,err=pcall(source,id,...)
  instruct_1=f1
  if not ok then error(err,0) end
  if not cured then return end
  if has(YANG_DARK) then return end                       -- 已点头的各段由 yangEvent 在原版之前处理
  if has(YANG_SEED) then yangDecide(false);return end
  if yangSeed() then yangDecide(true) end                -- 同一次里也要再点一次头，绝不会误触
 end

 -- 点头之后、追述之前，他在洞里（或古墓）时的再谈（E397／E991），在原版之前处理：
 --   已回来（BACK）：先追述，再照跑原版再邀；
 --   其余（已动身，或旧档里点过头却没有动身位）：只见他收拾行装、今夜动身，原版再邀不跑。
 -- 已追述（DEED）的旧档与新档都直接走原版。
 -- 2026-09-30：原版 E436（谷底重逢）把他从神鵰穴移到古墓 (18,0)，对白改为 E438（古墓初谈并问入队，无物品）。
 -- 已点头未追述时 E438 同样按上面两条处理；其余情况 E438 原样直通（不在古墓补问「那只手的账」）。
 local function yangEvent(source,id,...)
  if (id==397 or id==991 or id==438) and has(YANG_DARK) and not has(YANG_DEED) then
   if has(YANG_BACK) then
    yangDeed()
    return source(id,...)
   end
   mark(YANG_ROAD)
   yangPacking()
   return
  end
  if id==438 then return source(id,...) end
  return yangAfter(source,id,...)
 end

 -- 点头时他在队、未动身：原版 E436 在队那一支让他随龙儿离队回古墓（instruct_21，不经 E990）。照原剧情先送龙儿回去；
 -- 他在道别（1473）之后、场景变黑（该支第一次 instruct_14）之前，人还在眼前时交代安顿后去襄阳，离队后置 ROAD。
 -- 此后在古墓与别处一样：没住过一宿只收拾行装，住过一宿回访先追述。
 -- 不在队时 E436 走另一支（他不在场），ROAD／BACK 原样带到古墓，由 E438 接续；未点头或已追述时 E436 与原版一致。
 local function yangReunion(source,id,...)
  if not (inTeam(YANG) and has(YANG_DARK) and not has(YANG_DEED) and not has(YANG_ROAD) and not has(YANG_BACK)) then return source(id,...) end
  local fade,told=instruct_14,false
  instruct_14=function(...)
   if not told then
    told=true
    say(YANG,'兄弟，还有一句。襄阳那一趟我没忘——等龙儿在古墓安顿下来，我便动身。你歇过一宿，再来古墓找我。')
    blank()
   end
   return fade(...)
  end
  local ok,err=pcall(source,id,...)
  instruct_14=fade
  if not ok then error(err,0) end
  if told and not inTeam(YANG) then mark(YANG_ROAD) end
 end

 -- 点头时他正在队中：主角请他离队（原版 E990，照跑）那一刻才动身。
 local function yangLeave(source,id,...)
  local ok,err=pcall(source,id,...)
  if not ok then error(err,0) end
  if has(YANG_DARK) and not has(YANG_DEED) and not has(YANG_ROAD) and not has(YANG_BACK) and not inTeam(YANG) then
   say(YANG,'正好。我先去一趟襄阳，回头再回去。兄弟歇过一宿再来找我。')
   blank()
   mark(YANG_ROAD)
  end
 end

 -- 住宿：只有在歇宿地点（客栈、家中）真的睡了一宿（原版 instruct_12）才算；剧情里别处的疗伤不算。
 -- 歇宿地点都不是他所在的神鵰穴或古墓，所以住过一宿也就离过场。
 if type(instruct_12)=='function' then
  local rest=instruct_12
  instruct_12=function(...)
   local r=table.pack(rest(...))
   if has(YANG_ROAD) and JY and JY.Status==GAME_SMAP and REST_PLACES[JY.SubScene] then unmark(YANG_ROAD);mark(YANG_BACK) end
   return table.unpack(r,1,r.n)
  end
 end

 -- ============================================================
 -- 四、接线
 -- ============================================================
 local sourceEvent=oldCallEvent
 local function dispatch(id,...)
  sweep()
  if eunuch() then
   local list=JOINS[id]
   if list and not MIXED[id] then
    for _,pid in ipairs(list) do
     if barred(pid) then return gracefulRefusal(list,sourceEvent,id,...) end
    end
   elseif list and MIXED[id] and barred(list[1]) then
    return mixedRefusal(sourceEvent,id,...)
   end
  end
  if id==599 then
   -- 口一：他讲完 2233（「路旁有个石头，写着 ３６４２７９」）之后、原版问入队之前。
   local f1=instruct_1
   instruct_1=function(tid,...)
    local r=table.pack(f1(tid,...))
    if tid==2233 then diyunSeed() end
    return table.unpack(r,1,r.n)
   end
   local ok,err=pcall(sourceEvent,id,...)
   instruct_1=f1
   if not ok then error(err,0) end
   return
  end
  if id==644 then return diyunAfterBook(sourceEvent,id,...) end
  if has(DIYUN_DARK) and (id==600 or id==940) then return diyunDarkJoin(sourceEvent,id,...) end
  if id==396 or id==397 or id==991 or id==438 then return yangEvent(sourceEvent,id,...) end
  if id==990 then return yangLeave(sourceEvent,id,...) end
  if id==436 then return yangReunion(sourceEvent,id,...) end
  return sourceEvent(id,...)
 end
 oldCallEvent=function(...) return dispatch(...) end

 -- 对外只读（跨层一律 rawget 探测，本层未合并时无副作用）。全部在加载期赋值，不触 __newindex=error。
 BrowserDiyunDark=function() return has(DIYUN_DARK) end
 BrowserYangDark=function() return has(YANG_DARK) end
 BrowserDarkPathWicked=function() return wicked() end
 BrowserDarkPathPolicy=function() return DEPARTURE end
 -- 供 practice-extension 的补丁按需调用（跨层一律 rawget 探测；本层未合并时那两句退化成原文，行为逐字不变）。
 -- Warning：接在「此法须先自宫，是否仍要修炼？」后面，把这一刀真正的代价说清——现有文案一个字也没提。
 BrowserDarkPathWarning=function(pid)
  if pid~=0 then return '' end
  local names={}
  for i=1,CC.TeamNum do
   local p=JY.Base['队伍'..i]
   if p and p>0 and female(p) then names[#names+1]=JY.Person[p]['姓名'] end
  end
  local tail='此后再无女子肯与你同行。'
  if DEPARTURE=='leave' and #names>0 then tail=tail..'队中的'..table.concat(names,'、')..'今日便会离去。' end
  return tail
 end
 -- Gelded：主角刚自宫那一刻调一次，'leave' 口径下当场结算（不调也行，本层在事件边界自己会扫）。
 BrowserDarkPathGelded=function(pid) if pid==0 then sweep() end end
 BrowserDarkPathSetPolicy=function(v) if v=='keep' or v=='leave' then DEPARTURE=v end;return DEPARTURE end
 BrowserDarkPathState=function()
  return {slot={REG_SCENE,REG_SLOT,REG_FIELD},flags=flags(),policy=DEPARTURE,eunuch=eunuch(),
   diyunSeed=has(DIYUN_SEED),diyunDark=has(DIYUN_DARK),
   yangSeed=has(YANG_SEED),yangDark=has(YANG_DARK),yangDeed=has(YANG_DEED),yangRoad=has(YANG_ROAD),yangBack=has(YANG_BACK),ruleTold=has(RULE_TOLD)}
 end
end)()
