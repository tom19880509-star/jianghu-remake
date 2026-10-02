-- 156 田伯光：杀或阉，二选一（editorial/田伯光二选一156.md，补丁见 reviews/tianbo156-patch-suggestions.md）
-- 只在扩展层包住原事件：不改 oldevent_*.lua、不新增事件号、不新增存档字段。
--
-- 原链形状〔读码 oldevent_300/301/302/303/304/305/306/307/308/964/965〕：
--   平一指居(30)格0：301 初见 → 未开口请他同行 300／已受托 302 → 【只有 E307／E308 杀胜】写 303（入队，品德 −1）。
--   田伯光居(59)格0：304 初见 → 306 再访 → 打赢不杀 305；受平一指之托时 E301/E300 把该格改写为 307 → 不战则 308。
--   四条入队支（304／306／307／308）一律 instruct_10(29) ＋ instruct_37(−6)；E964 请他回家把该格改回 965（重邀，不扣品德）。
--   杀胜的持久痕迹：清掉 59/0（第0、1栏归零、第2–7栏 −1）＋ 平一指居 30/0 第2栏＝303 ＋ 层1(17,15) 贴图 2674 ＋ 声望 +4。
--
-- 本层只包 E307／E308 动手那一刻：把原版的「是否过招」换成三选一（杀／阉／收刀）。
--   杀＝原样走（战斗53胜，清格、30/0→303、贴图、声望+4，事后与原版逐字节相同）。
--   阉＝同样要打赢战斗53；胜后不落第二刀，改按原著的办法处置。压掉原版杀支里的「清格」与「换贴图」两条
--       （人还站在那里），其余两条（30/0→303、声望+4）照走，随后把 59/0 第2栏改回 308，此后这一格由本层接管。
--   收刀＝原样走（入队支仍扣 instruct_37(−6)）；战败仍是原版的 instruct_15(83)。
--
-- 156b（Tom 2026-09-18 追加）：阉之后他可以直接修辟邪剑谱(78)与葵花宝典(93)，不必再自宫一次——那一刀已经付过。
--   做法是在处置那一刻把他的「性别」写成原版表示「已自宫」的 2（见 geldResolve 处的注释），
--   practice-extension 与 practice-core 一行都不用改，主角与旁人的自宫前置逐字不变。
--
-- 「已阉」怎么不新增存档字段地查出来：借南贤居(64)事件格 197 第8栏作位标（与身世层 199、易筋层 198 同法，
--   原版该格 11 栏全为 0〔读 data/alldef.grp 核实〕，场景里没有格子指向它，引擎只在第2栏>0 时才列入「附近」，
--   本层只写第8栏）。随正常存档的事件表保存；旧档此栏为 0 ＝ 未阉，一切照原样。
--   另有一条不靠位标、单看原版 D 表也成立的佐证：30/0 第2栏＝303 且 59/0 第2栏＝308 且第0栏仍为 1，
--   在原版里不可能同时成立（写 303 的那一支同时把 59/0 清空），可供审核直接读存档核对。
;(function()
 local REG_SCENE,REG_SLOT,REG_FIELD=64,197,8
 local GELDED,MET=1,2
 local TIAN,PING=29,28
 local HOME,HSLOT=59,0                             -- 田伯光居 · 格0
 local CLINIC,CSLOT=30,0                           -- 平一指居 · 格0
 local ABORT={}                                    -- 只用来从 E303 中途退出（等同原脚本的 do return end）

 local function flags() local v=GetD(REG_SCENE,REG_SLOT,REG_FIELD);return (type(v)=='number' and v>0) and v or 0 end
 local function has(bit) return math.floor(flags()/bit)%2==1 end
 local function mark(bit) if not has(bit) then SetD(REG_SCENE,REG_SLOT,REG_FIELD,flags()+bit) end end
 local function head(pid) local p=JY.Person[pid];return (p and p['头像代号']) or pid end
 local function hero(t) TalkEx(t,0,1) end
 local function tian(t) TalkEx(t,head(TIAN),0) end
 local function ping(t) TalkEx(t,head(PING),0) end
 local function narrate(t) DrawStrBoxWaitKey(t) end
 local function inTeam(pid) for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then return true end end return false end
 local function choose(rows) return ShowMenu(rows,#rows,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE) end

 -- ============ 一、动手那一刻：杀 / 阉 / 收刀 ============

 -- 胜后不杀：处置本身，以及他当场的反应。原著里做这件事的是不戒和尚（《笑傲江湖》，为女儿之故，
 -- 阉田伯光、逼他为僧，法名「不可不戒」〔待核回目〕）；不戒不在本作，改由主角执行。
 -- 法名、不戒、恒山、仪琳一概不写——那些不是主角做的事，写了才是编造（editorial/邪线五人156.md 校验一节）。
 local function geldResolve()
  narrate('田伯光被你一刀劈得单膝跪地，刀脱手落在三尺外。他没去够那把刀，只抬眼看着你，等第二刀。')
  tian('动手罢。我这一路走下来，本来就该有这一刀。')
  hero('这一刀我不落。平一指要你的命，我给他另一样东西。')
  tian('……什么东西？')
  hero('你这一身能耐，大半用在一处上。那一处，今日就此了结。')
  narrate('他先是没听懂，随即懂了，挣得比方才动刀时还凶。你用他自己的腰带缚了他两腕。')
  narrate('事情做得很快。你拿他的刀在火上燎过，按住血，替他裹了三层。做完这些，你的手在抖；他倒不叫了。')
  tian('……你比杀人还狠。')
  hero('杀了你，平一指痛快。被你害过的那些人，一个也不会因此痛快。')
  tian('（喘了半晌）我田伯光横行万里，栽在你手里，认。可你既留我一条命——这条命往后怎么算？')
  hero('怎么算是你的事。我只管一件：你再害人，我再来。')
  narrate('他沉了很久，久到血在布上洇开一小片。')
  tian('好。我说出口的话从来不改，这句你也记着。')
  mark(GELDED)
  -- 原版就用「性别」这一栏记这件事：0 男、1 女、**2 已自宫**（CC.Person_S['性别']={28,0,2}，
  -- 随存档的人物档整块保存）。这不是本作的发明：原版人物数据里林平之（pid 36）本来就是 2，
  -- growth-extension 铺模板时特地把他退回 0（「在他拿到那本秘籍之前」），可见这一栏本就是持久的剧情状态。
  -- 田伯光这一刀已经付过，就照这一栏记下。于是 practice-extension 两处「须先自宫」的前置（都判 性别==0）
  -- 对他自然不成立，practice-core 只挡 性别==1，他便能直接修辟邪(78)与葵花(93)——不必再自宫一次。
  -- **只动他一个人**：主角与其余所有人的自宫前置一字不改。
  JY.Person[TIAN]['性别']=2
  SetD(HOME,HSLOT,2,308)                           -- 人还在，这一格此后由本层接管（不新增事件号）
 end

 -- 包住 E307／E308：只换原版那一句「是否与之过招」，其余照原脚本跑。
 local function duel(source,id,...)
  local f5,f6,f3,f17,f56=instruct_5,instruct_6,instruct_3,instruct_17,instruct_56
  local pick,won=0,false
  instruct_5=function()
   pick=choose({{'拔刀 —— 杀了他，平一指要的就是这条命',nil,1},
                {'拔刀 —— 不杀，去其势，叫他此生再害不得人',nil,1},
                {'收刀 —— 先听他把话说完',nil,1}})
   return pick==1 or pick==2
  end
  instruct_6=function(warid,...)                   -- 阉这一支同样要过战斗53，不能白拿
   local r=f6(warid,...)
   if r and pick==2 then won=true end
   return r
  end
  instruct_3=function(sc,d,v0,v1,v2,...)           -- 压掉杀支的「清掉田伯光居这一格」
   if won and sc==-2 and d==-2 and v0==0 and v1==0 and v2==-1 then return end
   return f3(sc,d,v0,v1,v2,...)
  end
  instruct_17=function(...) if won then return end;return f17(...) end   -- 人没走，贴图不换
  instruct_56=function(v)                          -- 杀支的末一条指令（声望+4）：两支同赏，随后接处置
   local r=f56(v)
   if won then won=false;geldResolve() end
   return r
  end
  local ok,err=pcall(source,id,...)
  instruct_5,instruct_6,instruct_3,instruct_17,instruct_56=f5,f6,f3,f17,f56
  if not ok then error(err,0) end
 end

 -- ============ 二、阉之后的田伯光 ============
 -- 不写成忽然变好：他不悔从前，只是做不成了；守信与认输本来就是他原有的东西
 -- （《笑傲江湖》他与令狐冲由敌成友，靠的正是不偷袭、认输就认输、说过的话算数〔待核回目〕）。

 local function joinLines()
  tian('跟你走？也好。我留在此处，早晚被人指指点点。')
  narrate('他把刀收进鞘里站起身，脚下还虚，扶了一把门框才站稳。')
  tian('说在前头：我不认你做主子，也不听你讲道理。你去哪儿我跟着；你要我杀谁，我先问一句凭什么。这样也成，你就带上我。')
 end

 -- 入队：与原版四条入队支同样的收束（变黑、清格、换贴图、加入），唯独免掉 instruct_37(−6)。
 -- 不是事后补回，是这一支根本不走那一条。未阉时本层不插手，原版照扣。
 local function joinGelded()
  if instruct_20() then instruct_1(175,head(TIAN),0);instruct_0();return end
  joinLines()
  instruct_14()
  instruct_3(-2,-2,0,0,-1,-1,-1,-1,-1,-1,-2,-2,-2)
  instruct_17(-2,1,17,15,2674)
  instruct_0()
  instruct_13()
  instruct_10(TIAN)
 end

 -- 阉之后头一回再进这间屋子（此后走短版开场）。
 local function afterGeld()
  if not has(MET) then
   narrate('门虚掩着。田伯光坐在门槛上，刀横在膝头，人瘦了一圈。屋里那张大床拆了，木料堆在墙角。')
   tian('来看我死了没有？')
   hero('来看你的话还算不算数。')
   tian('算。这些天我想明白一桩事：从前我拿刀逼人，是因为除了刀我一无所有。如今刀还在，人少了一半，反倒不那么急着拿它比划了。')
   narrate('他说得很平，像在说别人的事；说完自己笑了一声，那笑不好听。')
   tian('你别当我改邪归正。我不悔从前，我只是做不成了。做不成的事，认了便是。')
   hero('那你往后怎么过？')
   tian('先把伤养好。往后……江湖上有人欠我，也有我欠人的，一样一样清。')
   mark(MET)
  else
   narrate('田伯光正就着门槛削一根木头，削得极匀。见你进门，把刀往木墩上一插。')
   tian('又来了。刀还在，话也还在。')
  end
  instruct_0()
  if instruct_9() then joinGelded()
  else
   hero('我另有事，改日再来。')
   tian('随你。反正这些天我也走不远。')
   instruct_0()
  end
 end

 -- E964 请他先回家之后的重邀（原版 E965 整段是荤话，阉后照播会当场穿帮）。原版此支本就不扣品德。
 local function reinvite()
  narrate('田伯光在院里劈柴，一刀一根，落点极准。见你来，把斧子往木墩上一插。')
  tian('我说过，要用我时来家里找我。你来了。')
  instruct_0()
  if not instruct_9() then hero('路过，看你一眼。');tian('看完了就走罢，柴还没劈完。');instruct_0();return end
  if instruct_20() then instruct_1(175,head(TIAN),0);instruct_0();return end
  tian('走罢。我这儿也没什么可收拾的。')
  instruct_14()
  instruct_3(-2,-2,0,-1,-1,-1,-1,-1,-1,-1,-1,-2,-2)
  instruct_0()
  instruct_13()
  instruct_10(TIAN)
 end

 -- ============ 三、回平一指处交差 ============
 -- 他是「医一人，杀一人」的规矩人：杀这一支原样走（E303 不动）；阉这一支他的账算不平，
 -- 可他真正要的是「这人不能再害人」——所以先挑刀口，再自己把这句话说全。

 local function pingHeard()
  hero('田伯光那桩，了了。')
  ping('了了？我要的是一条命。')
  hero('命我没取。我去了他的势。他这辈子再害不了人。')
  narrate('平一指盯着你看了很久，久到药炉上的水开了又溢出来，他才伸手把炉子端下去。')
  ping('……刀口怎么处理的？')
  hero('拿火燎过刀，按住血，裹了三层。第二日去看，人没发热。')
  ping('（哼了一声）算你没把事情做成一半。这种伤，十个里有三个死在后头的热症上。那就不叫留他一命，叫慢着杀。')
 end

 local function pingYields()
  ping('我这条规矩是医一人、杀一人。你这一手既没医，也没杀，我的账算不平。')
  hero('先生要的若是他不能再害人，这一条我做到了。')
  narrate('平一指没有立刻答话。')
  ping('我要的本来就是这个。只是这句话，我自己说不出口。')
  ping('我平一指说话算话。走罢。')
  narrate('他收拾药箱时，把一副专治刀伤的膏药单挑出来，搁在最上面一格。谁也没提那是给谁备的。')
 end

 -- 把人带到他面前：他不拔刀（正说明托付确已了结），但也不同行。这一格留着 303，改日再来。
 local function pingRefuse()
  hero('田伯光那桩，了了。人就在门外。')
  ping('……你把他带来了。')
  hero('先生要的是他不能再害人。这一条已经办到。')
  ping('办到了。所以我今日没有拔刀。')
  narrate('平一指把药箱扣上，手在铜扣上按了很久。')
  ping('可我不与他同路。你叫他离了你的队伍，再来找我。这不是跟你讲条件——我一见他，就想起我女儿。')
 end

 -- 包住 E303：只换主角交差那一句(1042)与平一指应承那一句(1043)，
 -- 前面的药铺四格改写(887–890)、队满判断、加入与品德 −1 全部照原脚本。
 local function pingReport(source,id,...)
  local f1=instruct_1
  instruct_1=function(tid,...)
   if tid==1042 then
    if inTeam(TIAN) then pingRefuse();error(ABORT) end
    pingHeard();return
   end
   if tid==1043 then pingYields();return end
   return f1(tid,...)
  end
  local ok,err=pcall(source,id,...)
  instruct_1=f1
  if not ok and err~=ABORT then error(err,0) end
 end

 -- ============ 四、接线 ============
 local sourceEvent=oldCallEvent
 local function dispatch(id,...)
  local scene=JY.SubScene
  if has(GELDED) then
   if scene==HOME and (id==304 or id==306 or id==307 or id==308) then return afterGeld() end
   if scene==HOME and id==965 then return reinvite() end
   if scene==CLINIC and id==303 then return pingReport(sourceEvent,id,...) end
  elseif scene==HOME and (id==307 or id==308) then
   return duel(sourceEvent,id,...)
  end
  return sourceEvent(id,...)
 end
 oldCallEvent=function(...) return dispatch(...) end

 -- 供好感层等其他层按需读取（跨层一律 rawget 探测，未合并时无副作用）。
 BrowserTianboGelded=function() return has(GELDED) end
end)()
