-- 155 多周目完整传承（第一批 editorial/多周目完整传承_第一批155.md；第二批 editorial/多周目完整传承_第二批155.md）
-- 四处完整传承，都接在原版事件之后，不改原事件、事件链、奖励与队伍：
--  · 华山思过崖（场景81）：E282→E283→E284 照常走完（风清扬传令狐冲独孤九剑、主角资质+5）之后，
--    崖后石洞里再有一场。风清扬始终不露面，只以声音考校；过了考校，解除主角对独孤九剑的
--    “一招半式”上限资格记录（好感层 caps），可循常法修到十级；主角本程若还没学过，则由他完整传授。
--  · 侠客岛石壁洞（场景74）：E353→…→E363 照常走完（石破天参透石壁、学会太玄神功、主角得侠客行154
--    与太玄经60）之后，重回洞中，在石破天提点下把“逐字求解”放下，改看图形与经脉去向，领悟太玄神功。
--    石破天自己的太玄事件一字未改；主角不是不识字，失忆只作一句呼应。
--  · 无量山洞（场景74 之外的场景42）：E484 照常走完（段誉玉像前磕首千遍、学会北冥神功29，主角得北冥63
--    与凌波47）之后，重回洞中。段誉六脉剑气断在指上，主角以内息相助接上，再答一问（剑气在经脉不在招式），
--    他便把天龙寺所记的六路去向说与主角，解除六脉神剑的一招半式上限。本作没有天龙寺场景，天龙寺由他口述。
--  · 绝情谷底（场景80）：E436 照常走完（杨龙重逢、杨过学会黯然销魂掌24 并离队回古墓）之后，重新招募
--    杨过再下谷底。门槛比前三处都高：须先得他完整的玄铁剑法并练到五级（重剑在先）、身边确有一位曾结知己
--    的同伴不在队（黯然者，别也），并付出一笔心得；答对“黯然销魂”四字的出处之后，由主角自己熬成。
--    难处全在门槛与心得，不做随机失手。杨过一周目仍只传玄铁剑法，好感传授表一字未改。
-- 触发都用已有记录，不读周目数：本程事实（原事件已完成、队友在队、好感满）＋一条前程证据
-- （好感层的“似曾相识”＝上一程与此人曾达知己）。理由、替代与待 Tom 裁定见底稿第三节。
-- 存档：只经好感层的 BrowserAffinityLegacyGrant 写 growth.affinity.legacy（可选字段，旧档没有此键；
-- 新周目随好感记录一并清零）。散功、重学、换老师、凭书都不会解除上限，只有这两场剧情解除。
-- 线索：条件未齐时，在同一处留一句提示（每次运行一次，不写存档，不剧透条件）。
;(function()
 local SIGUOYA,XIAKE=81,74                  -- 场景：华山思过崖、侠客岛石壁洞（原事件走完后场景已无事件格）
 local WULIANG,JUEQING=42,80                -- 场景：无量山洞（大理，段誉心结事件所在）、绝情谷底
 local LINGHU,FENG,SHI=35,30,38             -- 人物：令狐冲、风清扬、石破天
 local DUAN,YANG=53,58                      -- 人物：段誉、杨过
 local JIUJIAN,TAIXUAN=61,23                -- 招式：独孤九剑、太玄神功
 local LIUMAI,ANRAN,XUANTIE=30,24,57        -- 招式：六脉神剑、黯然销魂掌、玄铁剑法
 local BEIMING=29                           -- 北冥神功：全脚本只有 E484 授予段誉，用作“原事件已走完”的证据
 local JIUJIAN_BOOK,TAIXUAN_BOOK=79,60      -- 对应秘籍：独孤九剑谱、太玄经（本版人物锁不因此解除）
 local LIUMAI_BOOK,ANRAN_BOOK,XUANTIE_BOOK=66,61,77
 local MPGATE=600                           -- 六脉：内力上限常态值，与好感层一招半式同一门槛（原著“内力充沛”）
 local XUANTIE_RANK=5                       -- 黯然：须先有杨过完整的玄铁剑法并练到此级（原著先重剑、后创掌）
 local ANRAN_TOLL=2                         -- 黯然：心得代价＝黯然销魂掌谱所载入门经验的倍数（首测值）
 local shown={}                             -- 本次运行已给过的线索提示；只影响提示，不写存档
 local function team(pid)
  for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then return true end end
  return false
 end
 local function knows(pid,skill)
  local p=JY.Person[pid];if not p then return false end
  for i=1,10 do if p['武功'..i]==skill then return true end end
  return false
 end
 local function hero(text) TalkEx(text,0,1) end
 local function say(head,text) TalkEx(text,head,0) end
 local function narrate(text) DrawStrBoxWaitKey(text) end
 local function choose(rows) return ShowMenu(rows,#rows,0,0,0,0,0,1,1,24,0,0) end
 -- 好感层接口（growth-extension.lua）：读本程好感、似曾相识、一招半式上限与已得的完整传承。
 local function record(pid,identity)
  if type(BrowserAffinityLegacy)~='function' then return nil end
  return BrowserAffinityLegacy(pid,identity)
 end
 local function rank(skill) return type(BrowserGrowthSkillRank)=='function' and (BrowserGrowthSkillRank(0,skill) or 0) or 0 end
 -- 上限与单位都取自现行档次表（本作普通武学十级；单位随表走，不写死）。
 local function topRank(book)
  local info=type(BrowserGrowthRankInfo)=='function' and BrowserGrowthRankInfo(0,book) or nil
  return info and info.maxRank or 10,info and info.rankUnit or '级'
 end
 -- 结算：已会→只解除上限；曾学又散去→解除上限，仍须付心得重拾旧学（散功不能白得）；
 -- 未学且有名额→完整传授，学会一级；名额不足→不传、不记，可日后再来。
 local function bestow(skill,identity)
  if rank(skill)>0 then
   BrowserAffinityLegacyGrant(identity);return 'lifted'
  end
  if type(BrowserGrowthNeedsRelearn)=='function' and BrowserGrowthNeedsRelearn(0,skill) then
   BrowserAffinityLegacyGrant(identity);return 'relearn'
  end
  if type(BrowserGrowthCanLearn)=='function' and not BrowserGrowthCanLearn(0,skill) then return 'blocked' end
  instruct_33(0,skill,1)
  if rank(skill)<=0 then return 'blocked' end
  if type(BrowserGrowthRecordTaught)=='function' then BrowserGrowthRecordTaught(0,skill) end
  BrowserAffinityLegacyGrant(identity);return 'learned'
 end

 -- ==== 一 · 华山思过崖后洞：风清扬传完整独孤九剑 ====

 -- 考校两问：先看他能否料敌机先，再看他肯不肯忘招。答错只是“回去再想想”，不留记录，可再来。
 local function trial(partial)
  narrate('令狐冲会意，拔剑向你刺来。剑还未到，他肩头先沉了一沉。')
  say(FENG,'他这一剑，你怎么接？')
  local n=choose({{'照令狐兄说过的破剑式，一式一式与他拆解',nil,1},
   {'他肩头先沉，剑势必往左；不与他拆招，先攻他非救不可之处',nil,1},
   {'先退开半步，看清他的后招再说',nil,1}})
  if n~=2 then
   if n==1 then say(FENG,'拆解？他这一剑能变上三变，你拆得完么。')
   else say(FENG,'退？退到崖边，这一剑还是要接。') end
   say(FENG,'……回去再想想罢。')
   narrate('洞里再没有声息。')
   return false
  end
  hero('他肩头先沉，剑势必往左。我不与他拆招，先攻他非救不可的地方。')
  narrate('话音未落，令狐冲的剑锋偏了半寸，笑着收了手。')
  say(FENG,'嗯。冲儿那几句，你倒没有白听。')
  if partial then say(FENG,'再问你一句。冲儿说与你的那几路变化，你如今记得几成？')
  else say(FENG,'再问你一句。你学过的剑招，临敌之际记得几成？') end
  local m=choose({{partial and '一式一式都记着，不敢忘' or '一招一式都记得清楚',nil,1},
   {'记不全了。只剩下一股势子，和几处该出手的地方',nil,1}})
  if m~=2 then
   say(FENG,'记得牢，未必是好事。你且去把它忘一忘，再来见我。')
   narrate('洞里再没有声息。')
   return false
  end
  hero('记不全了。只剩下一股势子，和几处该出手的地方。')
  say(FENG,'好！剑招是死的，记得越牢，手脚越是缚住。忘得干净，才使得出活的来。')
  return true
 end

 local function fengLesson()
  local partial=rank(JIUJIAN)>0
  narrate('崖上风大。令狐冲领你绕到石壁后面，那里另有一个洞口，比外头低了半人高。')
  say(LINGHU,'当年我在这崖上面壁，闷得发慌，把壁上的剑招看了个遍。太师叔就是从这洞里走出来的。')
  hero('令狐兄可曾进去过？')
  say(LINGHU,'进去过，空空如也。可我总觉得……罢了，你自己瞧瞧。')
  narrate('洞里传出一个苍老的声音，不见其人。')
  say(FENG,'冲儿。我传你的剑法，你倒转手教了旁人。')
  if partial then say(LINGHU,'太师叔！……徒孙不敢瞒您。这位兄弟与我过命的交情，破剑式的几路变化，我说与他听了。')
  else say(LINGHU,'太师叔！……徒孙还不曾教他什么。只是这位兄弟与我过命的交情，徒孙想请太师叔看他一眼。') end
  say(FENG,'你自己还没参透，也敢教人。……小子，你上前来。')
  if not trial(partial) then return end
  say(FENG,'今日你我有缘，这套独孤九剑，我便与你说一遍。能悟多少，全看你自己的造化。')
  local result=bestow(JIUJIAN,'skill:'..JIUJIAN)
  if result=='blocked' then
   say(FENG,'……罢了。你身上的功夫已经装得太满，再塞一路进去，只会互相绊住。')
   say(FENG,'先舍一门，再来找我。')
   return
  end
  narrate('洞里的声音忽远忽近，说的多是对手将发未发时的那一点空隙，少有招式名目。令狐冲站在一旁，听得入神。')
  hero('＜他说的不是招式，是每一招将出未出时露的那一点破绽。＞')
  say(FENG,'总诀式、破剑式、破刀式……九式的名目记不住也不打紧，要旨只在一个悟字。')
  say(FENG,'往后自己好好用功。老夫要去了。')
  say(LINGHU,'太师叔！您……')
  narrate('洞中再无声息。风从石壁的刻痕间穿过，倒像是有人笑了一声。')
  local top,unit=topRank(JIUJIAN_BOOK)
  if result=='lifted' then
   narrate('风清扬亲授独孤九剑：一招半式之限已解，此后循常法可修至'..top..unit..'。')
  elseif result=='relearn' then
   narrate('风清扬亲授独孤九剑：一招半式之限已解。此功你曾学过又已散去，可在人物武学页付心得重拾旧学，重拾之后可修至'..top..unit..'。')
  else
   narrate(JY.Person[0]['姓名']..'学会独孤九剑（1级），占十门武学名额之一。此番是完整传承，不受一招半式之限，可修至'..top..unit..'。')
  end
  say(LINGHU,'他老人家肯开口，是看得起你。我参了这些年也只得皮毛，你可别辜负了。')
 end

 -- ==== 二 · 侠客岛石壁洞：放下逐字求解，领悟太玄神功 ====

 local function insight()
  narrate('你退开两步，不再去读那些注解，只看石壁上的图形：剑尖朝上，云气向前推涌，一笔一画都不像字，倒像是经脉上的去向。')
  narrate('看着看着，指尖忽然发热。那股热气顺着手臂往上走，与壁上那一条蝌蚪游动的去向一模一样。')
  hero('＜原来它们不是字。＞')
  local result=bestow(TAIXUAN,'skill:'..TAIXUAN)
  if result=='blocked' then
   hero('＜壁上的去向明明白白，可我已学满十门武学，一时无处安放。＞')
   say(SHI,'大哥，你眉头皱得好紧。要不咱们先出去罢。')
   return
  end
  narrate('你在壁前站了三日三夜。石破天守在洞口，替你挡了几回风。')
  say(SHI,'大哥！你可算醒了。你站着一动不动，我数了三天。龙岛主说你在悟功夫，我才没敢吵你。')
  hero('……是你让我把那些字放下的。')
  say(SHI,'我又没做什么呀。我只是说小蝌蚪好玩。')
  local top,unit=topRank(TAIXUAN_BOOK)
  if result=='relearn' then
   narrate('石壁之悟已成：太玄神功你曾学过又已散去，可在人物武学页付心得重拾旧学，重拾之后可修至'..top..unit..'。')
  else
   narrate(JY.Person[0]['姓名']..'学会太玄神功（1级），占十门武学名额之一。石壁所悟是完整传承，不受一招半式之限，可修至'..top..unit..'。')
  end
  say(SHI,'龙岛主说过，练成这门神功，千万别对人说。大哥你也别说出去。')
 end

 local function stoneWall()
  narrate('洞中的石壁还在，蝌蚪般的字一个挨着一个，字旁的注解密密麻麻，写满了石缝之间的空处。掌门们散尽了，洞里只剩风声。')
  hero('＜前人留下的注解写得极细。先从第一句读起。＞')
  narrate('你一个字一个字读下去。笔画绕来绕去，读到第三行，眼前便发起花来。')
  say(SHI,'大哥，你老看那些小字做什么？脸都白了。')
  for round=1,2 do
   local n=choose({{'按注解一句一句推敲下去',nil,1},{'问问石破天，他在看什么',nil,1}})
   if n==2 then
    say(SHI,'我看这条小蝌蚪呀。你瞧它尾巴翘着，像要往上游。我瞧着它的时候，这里就热起来。')
    narrate('他拍了拍自己的肩头。')
    hero('你不看旁边的注解？')
    say(SHI,'我不识字。大哥你识字，本该比我强得多才是。')
    hero('＜我识字。可我连自己是在哪里识的字，都想不起来。＞')
    hero('……那我也不看注解了。')
    insight()
    return
   end
   if round==1 then
    narrate('你按着注解再读一遍。字句愈发绕人，太阳穴突突地跳。')
    say(SHI,'大哥，歇一歇罢。这些小字我一个也不识得，看着倒不难受。')
   else
    narrate('你不肯放下那些注解，直读到眼前金星乱冒，只得扶着石壁退开。')
    hero('＜今日看不下去了。＞')
   end
  end
 end

 -- ==== 三 · 无量山洞：段誉以天龙寺所记，传完整六脉神剑 ====

 -- 本作没有天龙寺场景：八十四个场景里的寺院只有大轮寺8、金轮寺16、少林寺28、天宁寺63，其中天宁寺
 -- 只有一句“上面写着：天宁寺”的招牌、没有任何事件格，位置又紧挨主角的家，不在大理。大理境内只有
 -- 高昇客栈61 与无量山洞42，后者正是段誉心结事件 E484 所在，与第一批“落在心结事件的场景”同一口径。
 -- 天龙寺由段誉自己说进来：枯荣大师焚谱之后，世上再没有第二卷，只剩记得的人。
 -- 相助＋一问：先看主角能不能把内息送到断处，再看他认的是经脉还是招式。答错只是改日再说，不留记录。
 local function duanTrial()
  narrate('段誉在玉像前站了半晌，忽然屈指向石壁虚虚一划。指尖嗡的一声，却什么也没有出来。')
  say(DUAN,'又不成了。这六路剑气，十回里总有六七回是这样。')
  hero('段兄方才这一下，与你平日出手不同。')
  say(DUAN,'不同的不在手上，在气上。内息一滞，剑气就断在指头里，出不去。')
  say(DUAN,'你且看着，我再引一次。')
  local n=choose({{'退开两步替他掠阵，让他自己收气',nil,1},
   {'以掌心抵住他背心，把内息缓缓送过去，替他接上断处',nil,1},
   {'拦住他，让他先歇一歇，改日再引',nil,1}})
  if n~=2 then
   if n==3 then say(DUAN,'歇得再久，散着的气还是散的。')
   else say(DUAN,'又断在半路了。兄台看得见，却帮不上。') end
   say(DUAN,'……改日再说罢。')
   narrate('他把手收进袖里，洞中那盏残灯的灯芯爆了一下。')
   return false
  end
  hero('我以掌心抵住他背心，把内息缓缓送过去。')
  narrate('那道气在他背心一滞，随即顺着手臂往上走，到中指上嗤的一声，石壁上多了一道白痕。')
  say(DUAN,'成了！兄台送来的那道气，走的正是中冲那一路。')
  say(DUAN,'我再问一句：兄台方才送气，是照着我手上的招式送的，还是照着别的？')
  local m=choose({{'照你手上的招式，招到哪里，气就送到哪里',nil,1},
   {'照你背上那条经脉的去向。你手上如何出招，我并没有看',nil,1}})
  if m~=2 then
   say(DUAN,'那便还差一层。招式是死的，经脉是活的。兄台再想想。')
   narrate('他把灯挑亮了些，不再说话。')
   return false
  end
  hero('照你背上那条经脉的去向。你手上如何出招，我并没有看。')
  say(DUAN,'正是这话！六脉之要，全在这一句上。')
  return true
 end

 local function duanLesson()
  narrate('玉像还立在洞里，蒲团上那道裂口没有人补过。洞中点着一盏残灯，是谁留下的已不可考。')
  -- 原著“此功须内力充沛”，本作照合议取与好感层一招半式同一个数；不够时他当面说破，不写记录，可再来。
  if JY.Person[0]['内力最大值']<MPGATE then
   say(DUAN,'兄台的内力还浅了些。这六路剑气全靠内息催出来，底子不厚，引出来也接不住。')
   say(DUAN,'再养些时日，我们一同试。')
   narrate('六脉神剑须内力上限常态值达'..MPGATE..'，眼下只有'..JY.Person[0]['内力最大值']..'。这与请教一招半式时是同一个门槛。')
   return
  end
  if not duanTrial() then return end
  say(DUAN,'当年在天龙寺，枯荣大师与本因师伯他们六人各执一脉，让我在佛前把那卷图谱记熟。')
  say(DUAN,'记熟之后，枯荣大师一把火烧了它。他说这卷东西留在世上，只会招来刀兵。')
  say(DUAN,'如今天下再没有第二卷，只剩我这一副还记得的心肠。兄台与我生死同过几回，我说与你听。')
  local result=bestow(LIUMAI,'skill:'..LIUMAI)
  if result=='blocked' then
   say(DUAN,'……兄台身上的功夫装得太满，六路剑气无处安放，反要伤着自己。')
   say(DUAN,'先舍一门，再来找我。')
   return
  end
  narrate('他说的全是气该怎么走：少商在拇指，商阳在食指，中冲在中指……听到后来，你的指尖也一阵阵发麻。')
  hero('＜他说的不是剑招，是内息该走的那条路。＞')
  say(DUAN,'我这剑气时灵时不灵，是我自己接不上，不是这门功夫有毛病。兄台内力比我厚，未必会像我这样。')
  local top,unit=topRank(LIUMAI_BOOK)
  if result=='lifted' then
   narrate('段誉以天龙寺所记相授：一招半式之限已解，此后循常法可修至'..top..unit..'；剑气只照常耗用内力，不另设失手。')
  elseif result=='relearn' then
   narrate('段誉以天龙寺所记相授：一招半式之限已解。此功你曾学过又已散去，可在人物武学页付心得重拾旧学，重拾之后可修至'..top..unit..'。')
  else
   narrate(JY.Person[0]['姓名']..'学会六脉神剑（1级），占十门武学名额之一。此番是完整传承，不受一招半式之限，可修至'..top..unit..'。')
  end
  say(DUAN,'此事莫与外人说。天龙寺烧了那卷谱，本就是不愿它再传出去。')
 end

 -- ==== 四 · 绝情谷底：杨过点拨，主角自熬黯然销魂掌 ====

 -- 一问只问掌名的出处：黯然销魂者，唯别而已矣（江淹《别赋》）。答错只是让他再想想，不留记录。
 local function yangTrial()
  narrate('杨过在潭边坐下，把重剑横在膝上，久久不说话。')
  say(YANG,'你既开了口，我便问你一句：这四个字，你当它是什么意思？')
  local n=choose({{'黯然是情深，销魂是情到了极处',nil,1},
   {'黯然销魂者，唯别而已矣。说的是别离',nil,1},
   {'是伤心到了极处，出手便格外狠',nil,1}})
  if n~=2 then
   if n==3 then say(YANG,'伤心若能当掌力使，这世上的高手就太多了。')
   else say(YANG,'情深的人多得很，会这一路的却只我一个。') end
   say(YANG,'你再想想罢。想通了再来。')
   narrate('他把重剑收回身后，望着潭水，不再开口。')
   return false
  end
  hero('黯然销魂者，唯别而已矣。说的是别离。')
  say(YANG,'……是。江淹那篇《别赋》，开头便是这一句。')
  -- 2026-10-01：本作由玉蜂线索提前重逢（E436 已在十六年之约之前），不写「走了十六年」；与 E436 1471 同口径。
  say(YANG,'与龙儿分开的那些日子，我独自一个，把从前学过的东西一样样拆开，拼出来的就是它。')
  return true
 end

 local function yangLesson(r)
  narrate('潭水没有声息。崖上垂下来的藤蔓被人攀断过，断口早已发黑。')
  -- 门槛三条，缺一条他就当面说破：重剑在先（原著先得重剑，后于分离中自创此掌）、
  -- 身边确有别离（掌名出处）、付得出心得（这一门是自己熬出来的，不是听来的）。都不留记录，可再来。
  local base=rank(XUANTIE);local _,unit=topRank(XUANTIE_BOOK)
  if base<XUANTIE_RANK then
   if base<=0 then say(YANG,'我这一路掌法，是从重剑上磨出来的。你连重剑都还没接过，磨不出什么来。')
   else say(YANG,'你那路重剑还嫩，剑上的力道都没吃透。先练到'..XUANTIE_RANK..unit..'，再来与我说别的。') end
   return
  end
  if r.parted~=true then
   say(YANG,'你身边的人一个不缺，谁也没走。这门功夫要的不是这个。')
   say(YANG,'等你也尝过一回人在千里之外、想见却见不着的滋味，再来问我。')
   return
  end
  local toll=JY.Thing[ANRAN_BOOK]['需经验']*ANRAN_TOLL
  local own=JY.Person[0]['修炼点数']
  if own<toll then
   say(YANG,'这门功夫不是听几句便得的。你得把这些年练功攒下的心血，尽数熬进去。')
   narrate('熬成这一路要心得'..toll..'点，你身上只有'..own..'点，还差'..(toll-own)..'点。')
   return
  end
  if not yangTrial() then return end
  say(YANG,'我把这一路的起落说与你，剩下的你自己去熬。熬不出来，谁也帮不上。')
  narrate('他起身演了一遍。掌势不快，也不见凶狠，落到一半忽然收住，像是话说到一半又咽了回去。')
  hero('＜他收手的地方，正是最该出力的地方。＞')
  say(YANG,'你瞧出来了。这掌法不在打出去的那一下，在收回来的那一下。')
  local result=bestow(ANRAN,'skill:'..ANRAN)
  if result=='blocked' then
   say(YANG,'你身上的功夫已经满了。腾一门出来再说，我不急。')
   return
  end
  if result=='learned' then JY.Person[0]['修炼点数']=math.max(0,JY.Person[0]['修炼点数']-toll) end
  narrate('你在潭边坐了一夜。想起的人一个个走过，末了只剩下一片空。天亮时手上自己起了势。')
  hero('＜原来收住的那一下，才是最重的。＞')
  say(YANG,'成了。只是我劝你一句：这掌法使得越顺，说明你心里越苦。')
  say(YANG,'我倒盼着你一辈子使不顺它。')
  local top,tail=topRank(ANRAN_BOOK)
  if result=='learned' then
   narrate(JY.Person[0]['姓名']..'练成黯然销魂掌（1级），占十门武学名额之一，耗去心得'..toll..'点。此番是完整传承，不受一招半式之限，可修至'..top..tail..'。')
  elseif result=='relearn' then
   narrate('谷底所得已成：黯然销魂掌你曾学过又已散去，可在人物武学页付心得重拾旧学，重拾之后可修至'..top..tail..'。')
  else
   narrate('谷底所得已成：此后循常法可修至'..top..tail..'，不受一招半式之限。')
  end
 end

 -- ==== 触发与线索 ====

 -- 本程事实（原事件已完成、此人在队、好感满）＋前程证据（上一程曾与他结为知己）；本程已得则不再出现。
 local function ready(pid,skill,identity)
  local r=knows(pid,skill) and team(pid) and record(pid,identity) or nil
  return r~=nil and not r.done and r.value>=r.max and r.familiar==true
 end
 local function hint(key,text,pid,line)
  if shown[key] then return end
  shown[key]=true
  narrate(text)
  if team(pid) then say(pid,line) end
 end
 local function atSiguoya()
  local identity='skill:'..JIUJIAN;local r=record(LINGHU,identity)
  if not r or r.done or not knows(LINGHU,JIUJIAN) then return end
  if ready(LINGHU,JIUJIAN,identity) then fengLesson()
  -- 155n（审计 P4-A）：差的是“上一程的交情”时另说一句，免得玩家只当是本程操作不到位。
  elseif r.familiar~=true then hint('feng-cycle','石壁后面另有一个洞口，黑黢黢的。风从里头出来，带着一点凉——像是哪一程也吹过。',LINGHU,
   '这洞口我瞧着眼熟，可你我相识毕竟还浅。再走一程，或许就不同了。')
  else hint('feng','石壁后面另有一个洞口，黑黢黢的。风从里头出来，带着一点凉。',LINGHU,
   '当年太师叔便是从这洞里走出来的。他老人家的行藏，我至今也摸不着。') end
 end
 local function atXiake()
  local identity='skill:'..TAIXUAN;local r=record(SHI,identity)
  if not r or r.done or not knows(SHI,TAIXUAN) then return end
  if ready(SHI,TAIXUAN,identity) then stoneWall()
  else hint('stone','洞里的石壁还在，蝌蚪般的字一个挨着一个，字旁的注解密密麻麻。',SHI,
   '大哥，这些小蝌蚪好玩得很，你要不要也看看？') end
 end
 -- 段誉底表本来就带着六脉神剑，所以原事件的证据取北冥神功：全脚本只有 E484 把它授予段誉。
 local function atWuliang()
  local identity='skill:'..LIUMAI;local r=record(DUAN,identity)
  if not r or r.done or not knows(DUAN,BEIMING) then return end
  if ready(DUAN,BEIMING,identity) then duanLesson()
  else hint('duan','玉像前的蒲团裂着一道口子，草絮散了一地。洞里比外头暖些。',DUAN,
   '先前我在这里磕了一千个头。如今想来，倒像是有人早算准了我会来。') end
 end
 -- 黯然销魂掌只由 E436 授予杨过；他在那一场末尾离队回古墓（槽0 的 E438），须重新招募才谈得上这一幕。
 local function atJueqing()
  local identity='skill:'..ANRAN;local r=record(YANG,identity)
  if not r or r.done or not knows(YANG,ANRAN) then return end
  if ready(YANG,ANRAN,identity) then yangLesson(r)
  else hint('yang','潭边的水汽扑在脸上。石上有人坐过的印子，早被雨水洗淡了。',YANG,
   -- 2026-10-01：本作由玉蜂线索提前重逢，谁也没熬满十六年（157 审核时的「走了十六年」两处一并改）。
   -- 与 E436 1459「盼着十六年之约……原来你就在这谷底」同口径：约期未到，他只是数着日子盼。
   '那些日子我数着十六年之约过活，从没想过她就在这崖下，过的是这般光景。') end
 end

 -- 原事件走完之后，思过崖与绝情谷底再没有事件格，侠客岛只剩出洞那一格，无量山洞只剩玉像与硝石；
 -- 四幕都不动事件格，重回场景时由此另起一幕。原版 Init_SMap 先照常跑完，场景与场景名都已画出，再说话。
 -- 经典存档、论武试玩没有成长记录，record() 返回 nil，此层全不生效。
 local sourceInit=Init_SMap
 Init_SMap=function(...)
  local result=table.pack(sourceInit(...))
  if JY.Status==GAME_SMAP then
   if JY.SubScene==SIGUOYA then atSiguoya() elseif JY.SubScene==XIAKE then atXiake()
   elseif JY.SubScene==WULIANG then atWuliang() elseif JY.SubScene==JUEQING then atJueqing() end
  end
  return table.unpack(result,1,result.n)
 end
end)()
