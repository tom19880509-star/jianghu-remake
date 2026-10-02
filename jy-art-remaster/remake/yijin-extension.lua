-- Original optional road encounters, using real innkeepers and the existing
-- Shaolin sweeping elder. They do not replace source plots or grant a manual.
;(function()
 local function menu(rows)return ShowMenu(rows,#rows,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE)end
 local function amount(id)
  for i=1,CC.MyThingNum do if JY.Base['物品'..i]==id then return JY.Base['物品数量'..i] or 0 end end
  return 0
 end
 local function merit()
  for i=1,CC.TeamNum do local pid=JY.Base['队伍'..i];if pid and pid>=0 and JY.Person[pid]['生命']>0 then AddPersonAttrib(pid,'品德',5)end end
 end
 BrowserYijinKeeper=function()
  local road=BrowserYijinRoad and BrowserYijinRoad();if not road then return end
  if JY.SubScene==1 then
   if road.entrusted=='pending' then
    TalkEx('前些日子，一位老镖师伤重住在店里，临终前留下一封家书和妻子的旧木簪。他女儿如今投亲在有间客栈。人已不在，这点念想，总该送到。',105,0)
    if menu({{'应承送往有间客栈',nil,1},{'眼下不便，容后再来',nil,1}})==1 and BrowserYijinDeed('entrusted','carrying') then
     TalkEx('我将包裹交给客官。请让有间客栈的掌柜转告周姑娘，就说是她父亲托付的旧物。',105,0)
     DrawStrBoxWaitKey('已接下托付：前往有间客栈，找掌柜询问周姑娘。')
    end
   elseif road.entrusted=='carrying' then TalkEx('周姑娘住在有间客栈。旧物送到，她心里多少能有个着落。',105,0)
   elseif road.entrusted=='good' then TalkEx('有间客栈捎了信来，多谢诸位守住这份托付。送回去的东西不值钱，可有些人等的就是这一点念想。',105,0)
   end
  elseif JY.SubScene==3 then
   if road.entrusted~='carrying' then TalkEx(road.entrusted=='good' and '周姑娘将那封信收进了贴身衣袋。她说，往后遇上过路的苦人，也愿搭一把手。' or '后院住着位从南边来的姑娘，常打听父亲的音讯。若从河洛来，不妨替她留个心。',105,0);return end
   TalkEx('周姑娘见到包裹上的结法，眼圈便红了。她取出二十两碎银，说要酬谢诸位跑这一趟。',-1,0)
   local r=menu({{'原样交还，婉谢酬银',nil,1},{'暂且收好，稍后交还',nil,1}})
   if r==1 and BrowserYijinDeed('entrusted','good') then
    merit();TalkEx('包裹原封交到姑娘手中。她摩挲着那支旧簪，许久没有说话。',-1,0)
    DrawStrBoxWaitKey('同行且健在者记下这次守诺，品德各增5。未获得秘籍、银两或心得。')
   end
  elseif JY.SubScene==40 then
   if road.wounded=='good' then TalkEx('后院那少年已经能走动了。他说等伤好便回乡，不再替人望风带路。',105,0);return end
   TalkEx('后院躺着个牵马的少年，曾替一伙恶客引路，昨夜却被他们打伤。我问明白了，他未曾参与伤人，只为挣口饭吃。郎中已经看过，还缺一味成药。',105,0)
   local rows,ids={},{}
   for id=3,8 do if amount(id)>0 then rows[#rows+1]={'交一份'..JY.Thing[id]['名称']..'救治',nil,1};ids[#ids+1]=id end end
   rows[#rows+1]={'先去筹药',nil,1}
   local id=ids[menu(rows)];if not id or amount(id)<=0 then return end
   if not DrawStrBoxYesNo(-1,-1,'交出'..JY.Thing[id]['名称']..'一份救治少年？此善行每程仅记一次；不返还药品，不赠修为。',C_WHITE,CC.DefaultFont)then return end
   if amount(id)>0 and BrowserYijinDeed('wounded','good')then
    instruct_32(id,-1);merit()
    TalkEx('你将药交给郎中，又替少年掖好薄被。伤人的有伤人的账，不该算在一个未动过刀的孩子身上。',-1,0)
    DrawStrBoxWaitKey('同行且健在者亲历这次救助，品德各增5。行路善缘不会由后来入队的人追领。')
   end
  end
 end
 local original=oldCallEvent
 oldCallEvent=function(id,...)
  local result=table.pack(original(id,...))
  if id~=516 or JY.SubScene~=28 or not BrowserYijinRoad or not BrowserYijinRoad() then return table.unpack(result,1,result.n)end
  local rows,ids={},{}
  for i=1,CC.TeamNum do
   local pid=JY.Base['队伍'..i]
   if pid and pid>=0 then
    local info=BrowserYijinPerson(pid)
    if info and info.rank>0 and JY.Person[pid]['生命']>0 then rows[#rows+1]={JY.Person[pid]['姓名']..'请教经义',nil,1};ids[#ids+1]=pid end
   end
  end
  if #ids==0 then return table.unpack(result,1,result.n)end
  rows[#rows+1]={'不扰老人清扫',nil,1};local pid=ids[menu(rows)]
  if not pid then return table.unpack(result,1,result.n)end
  local info=BrowserYijinPerson(pid)
  if not info.guided and BrowserYijinGuide(pid,false)then
   TalkEx('不同炉火炼出的铁，硬凑在一处，怎能算一把好剑？你这口气也是如此。莫急着驱使它，先依经中次第，慢慢使它归于一处。',110,0)
   DrawStrBoxWaitKey('记下运气法门。易筋八重起，主运研习或耗费心得调息可化解最后的异气；此次交谈本身不消除异气、不赠修为。')
  end
  if info.insight then TalkEx('扫的是落叶，不是树根。武功也是这个道理，莫把护人的本事，练成非要伤人的执念。',110,0)
  elseif info.entrusted and info.wounded then
   TalkEx('听你说起一路所见，所守的不过一封旧信、一条无辜的性命。这些事既不替你扬名，也不教你添一分功力。你还愿做么？',110,0)
   if menu({{'旁人的苦处，总不能只拿输赢来算',nil,1},{'我还未想明白，容我再想想',nil,1}})==1 and BrowserYijinGuide(pid,true)then
    TalkEx('老人拄着扫帚，微微一笑：经就在你手上，再读时，或许同从前有些不同。',-1,0)
    DrawStrBoxWaitKey(JY.Person[pid]['姓名']..'有所领悟。八重后的易筋护体还须本人主运与心境相合，品德70时完整发挥；所学境界与治疗成果不会因品德改变而失去。')
   end
  else TalkEx('经文不必一口气读完。先看清眼前的人，莫只看他与自己有无用处。走些路，见些事，再来谈罢。',110,0)end
  return table.unpack(result,1,result.n)
 end
end)()

-- 神足经（游坦之）、易筋经的少林独立传授与令狐冲疗伤。原著依据、版本取舍与首测值依据见
-- editorial/神足与易筋_原著与实现155.md。只在扩展层包既有事件，不改原版脚本，不新增原事件号。
;(function()
 local LINGHU,TIEZHOU=35,48
 local SZ_BASE,SZ_STEP=386,60            -- 游坦之原生内力最大值；神足二、三阶各加。一阶＝原生根基，不重复结算
 local QI_SEED,HEAL_MP,MERIT=70,80,60    -- 令狐冲入队时的异种真气；易筋导气后恢复的内力最大值；少林授经所需品德
 -- 156 审查：神足阶段原先按内力最大值的绝对阈值判，游坦之在队打几场仗升级就跨过三阶线，
 -- 少林点破那一项永久消失；少林导气也没有一次性标记，异气只要重新涨起来就能再领一次 +80，
 -- 可一路刷到 999。改为记在存档里的位标（沿用身世层的做法，场景64 槽198 第8栏，原版全零）。
 local YJ_SCENE,YJ_SLOT,YJ_FIELD=64,198,8
 local SZ2,SZ3,HEALED=1,2,4
 local function yflags() local v=type(GetD)=='function' and GetD(YJ_SCENE,YJ_SLOT,YJ_FIELD) or 0;return type(v)=='number' and v>0 and v or 0 end
 local function yhas(bit) return yflags()%(bit*2)>=bit end
 local function ymark(bit) if not yhas(bit) and type(SetD)=='function' then SetD(YJ_SCENE,YJ_SLOT,YJ_FIELD,yflags()+bit) end end
 local function menu(rows)return ShowMenu(rows,#rows,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE)end
 local function inTeam(pid)
  for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then return true end end
  return false
 end
 local function maxMP(pid)return JY.Person[pid] and JY.Person[pid]['内力最大值'] or 0 end
 local function qi(pid)return BrowserGrowthForeignQi and BrowserGrowthForeignQi(pid) or 0 end
 local function growthOn(pid)return BrowserGrowthEnabled~=nil and BrowserGrowthEnabled(pid)==true end
 local function heroRank()return BrowserGrowthStudyRank and BrowserGrowthStudyRank(0,43) or 0 end
 local function ownsYijin()
  for i=1,CC.MyThingNum do if JY.Base['物品'..i]==43 and (JY.Base['物品数量'..i] or 0)>0 then return true end end
  return false
 end
 local function deeds()
  local r=BrowserYijinRoad and BrowserYijinRoad()
  return r~=nil and r.entrusted=='good' and r.wounded=='good'
 end
 -- 神足经按游坦之实际内力根基判档，写回成长层 roots.mp，随存档保留。
 local function shenzuStage()
  if yhas(SZ3) then return 3 end
  local v=maxMP(TIEZHOU)
  -- 位标之前的存档没有 SZ2：只能沿用当年的内力线兜底（含它原有的缺陷）。
  -- 一旦本程记下了 SZ2，判档就只看位标，游坦之在队升级不再把三阶的窗口推掉。
  if yhas(SZ2) then return 2 end
  if v>=SZ_BASE+SZ_STEP*2 then return 3 end
  if v>=SZ_BASE+SZ_STEP then return 2 end
  return 1
 end
 -- 少林写就的汉文经义一册；已持有或主角已入门都不再给，不赠境界、心得与招式。
 local function grantYijin()
  if ownsYijin() or heroRank()>0 or type(instruct_2)~='function' then return false end
  instruct_2(43,1)
  DrawStrBoxWaitKey('老僧以汉文写就一册经义交到你手上。只是一部可研习的秘籍，没有境界、心得或招式随之而来。')
  return true
 end
 -- 156 审核：这几句是经 TalkEx(…,110,0) 当作老僧自己的话播出去的，所以不能把旁白（「老僧摇头：」）
 -- 和品德数值塞进他的对白框；数值另用 DrawStrBoxWaitKey 补一行。自称统一为「老衲」。
 local function yijinReason()
  if ownsYijin() or heroRank()>0 then return '经义已在你身边，先去研习。' end
  if JY.Person[0]['品德']<MERIT then return '这部经落在不该落的手里，便是害人。你的心性，还差些火候。' end
  if not deeds() then return '口说无凭。你且先去替不相干的人办两件不长功力的事——河洛老镖师托付的旧物，和悦来客栈那个牵马的少年。' end
  return ''
 end
 local function yijinNote()
  if ownsYijin() or heroRank()>0 then return nil end
  if JY.Person[0]['品德']<MERIT then return '少林授经：品德须'..MERIT..'，当前'..JY.Person[0]['品德']..'。' end
  return nil
 end
 local original=oldCallEvent
 oldCallEvent=function(id,...)
  local result=table.pack(original(id,...))
  -- 旧档与论武试炼档没有本批内容：与既有行路善缘同一判据，不改它们的读法。
  if not (BrowserYijinRoad and BrowserYijinRoad()) then return table.unpack(result,1,result.n)end
  -- 破庙：对铁丑用千年冰蚕之后（原事件 E560 把破庙场景格3的第2项改写为 E561）。善恶两线都走得到，无品德门槛。
  if id==560 and type(GetD)=='function' and GetD(62,3,2)==561 then
   TalkEx('这经上的字，我一个也不识得。倒是拿水一浇，纸上便显出些天竺和尚的图形来。我照着描画的姿势坐，身上就有股气自己会走。',TIEZHOU,0)
   TalkEx('（那是梵文。听闻少林寺失落过一部经书，正是这般模样——可他练的，分明不是经上的字，是字底下那些图形。）',-1,0)
   if shenzuStage()<2 and JY.Person[TIEZHOU] then
    AddPersonAttrib(TIEZHOU,'内力最大值',SZ_STEP);ymark(SZ2)
    DrawStrBoxWaitKey('铁丑所练名为神足经：天竺瑜伽秘术，藏在那册易筋经里，遇湿显形、干则隐没。得了千年冰蚕，寒毒与这路内功相辅，他的根基又进一层。神足经不吸他人内力，也不生异气。')
   end
  end
  -- 令狐冲入队：种因。原版给他的内力最大值 65 本身就是「内力近废」的表达，不再另加惩罚。
  if (id==242 or id==243) and inTeam(LINGHU) and growthOn(LINGHU) and qi(LINGHU)==0 and maxMP(LINGHU)<100 then
   if BrowserGrowthCommitQi then
    BrowserGrowthCommitQi(LINGHU,QI_SEED)
    TalkEx('我这条命是捡回来的。桃谷六仙与不戒大师先后替我「疗伤」，各家真气在我身子里冲撞不休，八道异种真气，谁也不服谁。',LINGHU,0)
    DrawStrBoxWaitKey('令狐冲身负异种真气。人物页可见他的异气；化解此症须少林易筋经，寻常汤药无用。')
   end
  end
  -- 平一指：求医。只是路标，不是关卡；没招到他也能往少林去。
  if id==303 and inTeam(LINGHU) and qi(LINGHU)>0 then
   TalkEx('伤我医得，病我医得。这个我医不得——八道真气互不相容，我一动手，便是再添一道。天下能解此症者，唯少林易筋经。',28,0)
   DrawStrBoxWaitKey('平一指诊而无方：令狐冲的异种真气须往少林求解。')
  end
  -- 少林扫地老僧：神足点破、易筋授经、为令狐冲导气。三项各自按条件出现，条件不齐时不列。
  if id~=516 or JY.SubScene~=28 then return table.unpack(result,1,result.n)end
  local rows,acts={},{}
  if inTeam(TIEZHOU) and shenzuStage()==2 then rows[#rows+1]={'请老僧看铁丑所练',nil,1};acts[#acts+1]='shenzu' end
  if inTeam(LINGHU) and growthOn(LINGHU) and qi(LINGHU)>0 and not yhas(HEALED) then rows[#rows+1]={'求老僧救令狐冲的伤',nil,1};acts[#acts+1]='heal' end
  if not (ownsYijin() or heroRank()>0) then rows[#rows+1]={'求少林易筋经义',nil,1};acts[#acts+1]='yijin' end
  if #acts==0 then return table.unpack(result,1,result.n)end
  rows[#rows+1]={'不扰老人清扫',nil,1}
  local act=acts[menu(rows)]
  if act=='shenzu' then
   TalkEx('你练的不是易筋经。那册子是梵文，你一个字也没认得；你照的是字底下的图形——摩伽陀国的瑜伽法门，天竺高僧所留，叫做神足经。与本寺这部经，原是两回事。',110,0)
   TalkEx('两回事？我只当是一本书。',TIEZHOU,0)
   TalkEx('一本书上抄了两样东西罢了。你既照图入了门，往下便顺着图走，莫回头去认那些字。',110,0)
   if shenzuStage()==2 then
    AddPersonAttrib(TIEZHOU,'内力最大值',SZ_STEP);ymark(SZ3)
    DrawStrBoxWaitKey('神足经第三阶：身份就此点明。游坦之内力根基再进一层。此经不随书传给旁人，冰蚕奇遇也不会复制；主角与其他队友暂不开放研习。')
   end
  elseif act=='heal' then
   if JY.Person[0]['品德']<MERIT then
    TalkEx('救人是好事。只是这部经出了山门，往后是救人还是害人，老衲得先看清楚递经的人。',110,0)
    DrawStrBoxWaitKey('少林不肯出手：主角品德须'..MERIT..'（当前'..JY.Person[0]['品德']..'）。')
   else
    TalkEx('八道真气各据一隅，硬拆是拆不开的。老衲以本寺经中的法子替他理一理，让它们肯挨着走。',110,0)
    TalkEx('此后呢？',0,1)
    TalkEx('此后是他自己的事。这经是慢功，化得尽化不尽，看他往后几年愿不愿意坐得住。',110,0)
    if BrowserGrowthCommitQi then BrowserGrowthCommitQi(LINGHU,0)end
    AddPersonAttrib(LINGHU,'内力最大值',HEAL_MP);ymark(HEALED)
    DrawStrBoxWaitKey('令狐冲的异种真气尽数化去，内力最大值恢复'..HEAL_MP..'点。原著中这是数年的慢功，本作只取其结果；余下的内力仍须他照常修炼。')
    -- 为救人已把经义取出，主角由此得研习资格。这一路不再另要行路两善——它与「求少林易筋经义」
    -- 是两条代价不同的路：这一条的代价是找到翡翠杯、招到令狐冲并带他上少林。
    if grantYijin() then TalkEx('经既已出了藏经阁，便不必再收回去。你要看，就拿去看罢——记着是为了解结，不是为了赢人。',110,0)end
   end
  elseif act=='yijin' then
   local reason=yijinReason()
   if reason~='' then TalkEx(reason,110,0);local note=yijinNote();if note then DrawStrBoxWaitKey(note) end
   else
    TalkEx('这部经本寺秘而不宣，非因藏私，是怕它落在只想快些赢人的手上。你这一路，替死人送了一封信，替陌路少年出了一份药，两件都不长功力。',110,0)
    TalkEx('老衲不收你做弟子，也不必你改换门庭。经上的梵文你未必读得来，老衲写成汉文与你，只一句：练它是为了解人身上的结，不是为了打赢谁。',110,0)
    grantYijin()
   end
  end
  return table.unpack(result,1,result.n)
 end
end)()
