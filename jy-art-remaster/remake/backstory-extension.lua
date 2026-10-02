-- 155 身世剧情第一批 · “醒”组（editorial/身世剧情_第一批155.md）＋155c 第二批 · “疑”组（editorial/身世剧情_第二批155.md）。
-- 只在原事件之前、之后或两句原对白之间加台词：原事件照常整段执行，事件链、战斗、奖励、队伍不变。
-- 已播记录：借南贤居(64)事件格199第8栏作位标。该格原数据全为0，场景里没有格子指向它，
-- 原脚本与其他重制层都不写它，引擎只在第2栏>0时才列入“附近”。随正常存档的事件表保存，
-- 旧档此栏为0＝都没播过；新周目随原事件表重置，与每程重新失忆醒来一致。不新增存档字段。
-- 疑组只读三样已有记录作“前程”证据：通关周目数、旧影记录、好感层的似曾相识标记；每条都另有不靠前程的途径或说明。
-- 155c：整层改为函数作用域（原为 do 块），局部变量不占主块 200 个 local 名额。
-- 155d 第三批 · “归”组（editorial/身世剧情_第三批155.md）：南贤讲完当年＋手抄小册（E822）、北丑清醒一夜（E827）、
-- 圣堂送行（E1016）与归梦之门归路（E1017，2958 之后）。仍只用本程位标作证据。选定回去/留下时，本事件余下部分里
-- 不再邀旧影、留下不播入门动画（临时替换，事件结束即还原）；选择结果与门前存档只经引擎可选钩子（rawget，未合并时无副作用）。
;(function()
 local REG_SCENE,REG_SLOT,REG_FIELD=64,199,8
 local STONE,NANXIAN,BEICHOU_BACK,BEICHOU_LIFE=1,2,4,8
 local FAMILIAR,BEICHOU_KNOWS,QINGYI,PAGE,INN_KNEE=16,32,64,128,256
 -- 156 审查：门前必战未胜时这一程不结束，门还能再按，而「取出残石对纹」原本没有位标，
 -- 于是主角每按一次门都重新「第一次认出」这道纹路。补一个位标，与其余节拍同口径。
 local DOOR=8192
 local BOOK=154                                   -- 《侠客行》
 local function flags() local v=GetD(REG_SCENE,REG_SLOT,REG_FIELD);return v>0 and v or 0 end
 local function has(bit) return math.floor(flags()/bit)%2==1 end
 local function mark(bit) if not has(bit) then SetD(REG_SCENE,REG_SLOT,REG_FIELD,flags()+bit) end end
 local function unmark(bit) if has(bit) then SetD(REG_SCENE,REG_SLOT,REG_FIELD,flags()-bit) end end
 local function hero(text,name) TalkEx(text,0,1,name) end
 local function say(head,text) TalkEx(text,head,0) end
 local function narrate(text) DrawStrBoxWaitKey(text) end
 local function qingyi(text) TalkEx(text,-1,0,'青衣旅人') end
 local function inTeam(pid) for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then return true end end return false end
 local function owned(id)
  for i=1,CC.MyThingNum do if JY.Base['物品'..i]==id and (JY.Base['物品数量'..i] or 0)>0 then return true end end
  return false
 end

 -- Run the source event unchanged; after the listed talk ids, play a few extra lines.
 local function withLinesAfter(after,event,...)
  local sourceTalk=instruct_1
  instruct_1=function(id,...)
   local result=table.pack(sourceTalk(id,...))
   if after[id] then after[id]() end
   return table.unpack(result,1,result.n)
  end
  local result=table.pack(pcall(event,...))
  instruct_1=sourceTalk
  if not result[1] then error(result[2],0) end
  return table.unpack(result,2,result.n)
 end

 -- 醒1 · 主角的家 E691，札记末页(2544)之后、握拳(2545)之前。
 local function stoneAtWaking()
  hero('枕边还搁着一块残石，巴掌大小，断口参差。石面刻着几圈纹路，绕了几绕，又回到起处。','失忆的青年')
  hero('留笺上没提它。是救我的人一并捡回来的，还是我昏倒时便带在身上？\n\n＜握在掌心，竟不觉得生分。＞先收好吧。','失忆的青年')
  mark(STONE)
 end

 -- 醒2 · 南贤初见 E821，主角说只有留笺(2568)之后；只在本程确实见过残石时出现。
 local function stoneToNanxian()
  if not has(STONE) then return end
  hero('……不对，还有一样。醒来时枕边搁着这块残石，上头刻着纹路。')
  narrate('南贤接过残石，就着窗光看了片刻，指腹在纹路上停了一停，才递还给你。')
  say(73,'是块老石头了。收好，莫弄丢。')
 end

 -- 醒3 · 南贤补讲那个后生：初见 E821 在“为何肯说这些”(2587)之后；旧档已过初见的，在再访 E822 补讲一次。
 local function youngMan(opening)
  say(73,opening)
  hero('莫非便是金先生？')
  say(73,'不是。他另有名姓，名头远不及金先生。在这一带住过些年月，也交了几个朋友。')
  hero('后来呢？')
  say(73,'后来，他回去了。')
  hero('回去？回到哪里去？')
  say(73,'那是他的事，老朽不便替他说。……人老了，话就多，说远了。')
  mark(NANXIAN)
 end
 local FIRST_OPENING='说来这也不是头一回。三十年前那几年，也有个后生冒冒失失寻到老朽门上，言谈古怪，问东问西。'
 local LATER_OPENING='上回你问老朽为何肯指路，还有半句没说。三十年前那几年，也有个后生冒冒失失寻到老朽门上，言谈古怪，问东问西。'

 -- 醒4 · 北丑居 E827：初见之后再次进门，头一回交谈时先见他过日子的一幕，再接原对白(2600)。
 local function beichouLife()
  narrate('北丑没去摆弄桌上的水晶球，正盘腿坐在炉边，就着火光缝一副棉护膝。针脚歪歪扭扭，线头咬了又咬。')
  say(74,'少年哎，来得巧。帮我瞧瞧，这针脚还看得过去么？')
  hero('前辈这是给谁缝的？')
  say(74,'有间客栈的老掌柜。腿上落了寒，一到腊月便疼得下不了炕。头一年喝他的酒，顺口许了他一副护膝；许了，便年年缝一副送去。')
  hero('顺口许下的，也年年作数？')
  say(74,'秘密记混了不打紧，答应人的事可混不得。\n\n我在这儿住了这许多年，他的酒也赊了这许多年。哪年缝不出这副护膝，我都没脸去喝。')
  hero('前辈说这话的时候，倒清醒得很。')
  say(74,'嘘——清醒不值钱。去年那副缝歪了，老掌柜照样穿了一冬，逢人便说是北丑绣的花。')
  narrate('他把护膝卷好揣进怀里，往炉膛添了两块柴，这才眯起眼睛，打量你手里有没有智慧果。')
  mark(BEICHOU_LIFE)
 end

 -- 醒5 · 圣堂归梦之门 E1017，原句(2958)之前；只在本程确实见过残石时出现。
 local function doorPattern()
  narrate('石门门框上刻着一圈纹路，绕了几绕，又回到起处。')
  hero('这纹路……')
  narrate('你取出醒来那日枕边的残石。石上的纹，一笔一笔，都与门框上的对得上。')
  hero('＜醒来之前的事，原来与这扇门脱不了干系。＞')
  mark(DOOR)
 end

 -- ==== 155c 疑组：门怎样运作，我不是第一个 ====

 -- 前程证据（只读）：已有通关周目，或本程绑定着一份真实旧影记录。
 local function priorRun()
  if type(browser_journey_get)=='function' and (tonumber(browser_journey_get('cycle')) or 0)>=2 then return true end
  return type(browser_echo_record)=='function' and browser_echo_record(false)~=nil
 end

 -- 疑1 · 似曾相识：上一程成了知己的人（好感层写 affinity.familiar，本层只读），本程头一回见面、
 -- 且这一趟没有入队时，事件末尾主角一句。同一事件里入队的，由好感层的入队旁白承接，本层不说。每程一次。
 local FAMILIAR_LINE='＜方才那人……我是不是在哪里见过？＞\n\n可醒来以后，分明是头一回相见。'
 -- 与 growth.js AFFINITY_COMPANIONS 同表（tests/backstory155c-voice 核对）。
 local COMPANIONS={1,2,9,16,17,25,28,29,35,36,37,38,44,45,47,48,49,51,53,54,58,59,61,63,76}
 local heard=nil                                  -- 当前事件里开过口、当时不在队的同伴
 local sourceTalk=instruct_1
 instruct_1=function(id,head,...)
  if heard and type(head)=='number' and head>0 then
   for _,pid in ipairs(COMPANIONS) do
    local p=JY.Person[pid]
    if p and p['头像代号']==head then if not inTeam(pid) then heard[#heard+1]=pid end;break end
   end
  end
  return sourceTalk(id,head,...)
 end
 local function familiarAfter(spoke)
  if #spoke==0 or has(FAMILIAR) or type(browser_growth_state)~='function' then return end
  local g=browser_growth_state();local a=type(g)=='table' and g.affinity
  if type(a)~='table' or type(a.familiar)~='table' then return end
  for _,pid in ipairs(spoke) do
   local key=tostring(pid);local r=type(a.persons)=='table' and a.persons[key]
   if a.familiar[key]==true and not (type(r)=='table' and r.joined==true) and not inTeam(pid) then
    hero(FAMILIAR_LINE);mark(FAMILIAR);return
   end
  end
 end

 -- 疑2 · 北丑认人（E827，见过他过日子之后的交谈）。证据：有前程→“你又来了”；否则须已听南贤讲过后生→“腔调像一个人”。
 -- 北丑的话分三样：竖一根＝亲眼见的，竖两根＝残页上写的，竖三根＝记得好像。
 local function beichouKnows()
  if priorRun() then
   narrate('北丑正往炉膛里添柴，一抬眼看见你，那根柴便停在了半空。')
   say(74,'少年哎……你又来了。')
   hero('晚辈先前来过，还替前辈瞧过护膝的针脚。')
   say(74,'不是那一回。是更早，早得……')
   narrate('他话说一半，忽然竖起三根手指，在你眼前晃了晃。')
   say(74,'我李丑说话，你得分三样听。竖一根，是我亲眼见的；竖两根，是残页上写的；竖三根，是我记得好像。')
   say(74,'“你又来了”这一句，竖三根。\n\n竖两根的是：残页上写过一个人，在路旁醒来，前尘往事一概不记得，后来寻齐十四部书，一直走到圣堂那扇门前。写的是不是你，残页上没署名。')
  else
   narrate('北丑拿火钳拨着炉灰，听你说了几句话，忽然停了手。')
   say(74,'少年哎，你这说话的腔调，像一个人。')
   hero('像谁？')
   say(74,'三十年前那个后生。也是这样客客气气，一口一个前辈，心里的主意却大得很。')
   narrate('他竖起一根手指，在你眼前晃了晃。')
   say(74,'我李丑说话，你得分三样听。竖一根，是我亲眼见的；竖两根，是残页上写的；竖三根，是我记得好像。方才那句，竖一根。')
  end
  say(74,'还有一句，也竖一根，你记牢了：我也不是这地方的人。我是打门外头进来的，比关外还远。')
  hero('门外？哪一扇门？')
  say(74,'竖两根：残页上写，过了那扇门的人，往事散去，手上的功夫倒还留得几分。')
  hero('＜往事散去，功夫留得几分……醒来那日，几式拳路竟还使得出来。＞')
  say(74,'竖三根：我记得好像，门那边夜里点灯，是不用添油的。')
  say(74,'……记不清喽。家乡的事一年比一年记得少，倒是这雪地里谁家的狗叫什么名字，一只也忘不了。')
  if has(NANXIAN) then
   hero('南贤前辈说的那个后生，也是打门外头来的？')
   say(74,'南贤那老头子的事，你问南贤去。')
  end
  narrate('他转过身去拨炉火，半晌才回过头来，又是那副腔调。')
  mark(BEICHOU_KNOWS)
 end

 -- 疑3 · 青衣旅人坦白受托（主角的家 E931，睡醒一句 2844 之后）。证据：已听南贤讲过后生；残石两句只在本程见过残石时有。
 local function qingyiVisit()
  narrate('炉上温着一壶水。门边坐着个青衣人，风尘仆仆，见你醒了，起身往炉里添了一把柴。')
  hero('阁下是……')
  qingyi('醒了？那日在溪边路旁把你背回来的，是我。')
  hero('原来是恩公。留笺上没有署名，晚辈一直不知该向谁道谢。')
  qingyi('不必。受人之托，算不得恩。')
  hero('受人之托？')
  qingyi('南贤先生托我守着溪边那块断了的界石。守了些年头，那日才见界石底下倒着个人。')
  hero('南贤前辈早知道会有人倒在那里？')
  qingyi('先生只说，也许有，也许一辈子也等不到。为什么，我没问。')
  if has(STONE) then
   hero('枕边那块刻着纹路的残石……')
   qingyi('是那界石上崩下来的。攥在你手里，背你回来一路，没松开过。')
  end
  qingyi('往后的事，你去问先生。该说多少，他自有分寸。')
  narrate('青衣人倒了一碗温水搁在案上，拱一拱手，推门去了。')
  hero('＜那块界石底下，从前也倒过别人么？＞')
  mark(QINGYI)
 end

 -- 疑4 · 《侠客行》残页：取得该书的那个事件之后；本层合并前已得书的旧档，改在家中睡醒后翻出。
 -- 笔迹只起疑；两行字只提出另一种读法，不替写字的人下结论（Codex 第五轮）。
 local function pageFound(atHome)
  if atHome then narrate('你检点行囊，《侠客行》里滑出一张折起的纸。纸薄而白，与书页全不相同，缺了小半边。')
  else narrate('那本《侠客行》里夹着一张折起的纸。纸薄而白，与书页全不相同，缺了小半边。') end
  narrate('纸上印着几行小字，排得比刻本还齐，说的是三十年间各派掌门奉令去了侠客岛，没有一个回来。页边空白处，另有人手写了两行。')
  narrate('上一行字大，笔力透到纸背：“换了我，也不回来！”\n\n下一行字小而工整：“今夜不去。”')
  hero('＜笔画细而匀，不见一点飞白，不像是毛笔写的。字也省了许多笔画……偏偏我一眼就认得。＞')
  hero('＜像是同一个人写的。上一行年少气盛；下一行，倒像隔了许多年。＞')
  hero('＜今夜不去……＞\n\n不知怎的，读到这四个字，心里没来由地一沉，像是等过谁，一直等到天亮。')
  hero('＜可上一行说不回来，下一行说不去。若两行说的是同一个地方……＞')
  hero('＜两样读法都说得通。究竟是哪一样，只有写字的人自己知道。＞')
  if inTeam(38) then
   say(38,'大哥，纸上写的什么？我不识字，只瞧见你看了好半天。')
   hero('几句旁人的心事。……收着罢。')
  end
  narrate('你把残页折好，夹回书里。')
  mark(PAGE)
 end

 -- 醒4 第二途径 · 有间客栈 E658 掌柜招呼(773)之后：已见过北丑、却还没见过他缝护膝的，由老掌柜说起。
 local function innKnee()
  narrate('老掌柜从柜台后绕出来，腿脚有些不利索，两边膝头各裹着一副棉护膝，针脚歪歪扭扭。')
  hero('掌柜的腿脚不便？')
  say(105,'老寒腿，一到腊月便疼。这护膝是北丑缝的——客倌见过那位吧？疯是疯了点，可年年腊月都送一副来，没断过。')
  say(105,'您瞧这朵花，他说是缝歪了，我偏说是绣的。酒钱他赊了一大本，护膝却从没晚过一天。')
  hero('＜北丑前辈……原来是这样过日子的。＞')
  mark(INN_KNEE)
 end

 local function homeNight()                      -- 一次睡醒最多一幕：青衣旅人在先，旧档残页在后
  -- 155g (Claude, per Tom's delegation): pacing, not a journey lock. The traveller comes after the first of the fourteen
  -- books is in hand, so a first journey does not meet him the night after the first talk with 南贤.
  local firstBook=false;for id=144,157 do if owned(id) then firstBook=true;break end end
  if has(NANXIAN) and not has(QINGYI) and firstBook then return qingyiVisit end
  if not has(PAGE) and owned(BOOK) then return function() pageFound(true) end end
 end
 local function innKneeDue()
  if has(BEICHOU_LIFE) or has(INN_KNEE) then return false end
  local talk=GetD(6,1,2);return talk>0 and talk~=826
 end

 -- 【记录与读取接口 · 身世完全解锁】Tom 2026-09-18：善线与恶线各正式通关至少一次，身世来历才完全解锁。
 -- 本批只做接口：通关方向由通关档案记（journey.js／engine.js 的补丁见 reviews/echo155-patch-suggestions.md C 组），
 -- 此处只读已完成的历史；159 门前尾声另按历史与本程真实结局判断，不提前发通关。
 -- 补丁未合并时 rawget 读到 nil，两项都返回 false，与本批之前完全一致。
 BrowserBackstoryUnlock=function()
  local f=rawget(_G,'browser_journey_cleared')
  if type(f)~='function' then return false,false end
  return f('good')==true,f('evil')==true
 end

 -- ==== 155d 归组：两个前辈，两种答案 ====
 -- SCAN：圣堂门前那一次系统扫描并真的存成过（随存档保存，读回不重播）。
 local TELLS,NOTEBOOK,NIGHT,SCAN=512,1024,2048,4096
 local function father(text) TalkEx(text,-1,0,'父亲') end
 local function mother(text) TalkEx(text,-1,0,'母亲') end
 local function ask(text) return DrawStrBoxYesNo(-1,-1,text,C_WHITE,CC.DefaultFont) end
 -- 疑组结论：北丑认人、青衣旅人、残页三条中任两条；似曾相识可顶替其中一条（旧影终章在终局之后，本程来不及顶替）。
 local function doubtDone()
  local n=0;for _,bit in ipairs({BEICHOU_KNOWS,QINGYI,PAGE,FAMILIAR}) do if has(bit) then n=n+1 end end
  return n>=2
 end
 -- 小册开放：本程带着残石见过南贤、读过残页，疑组成立；不靠周目数自动补线索。
 local function tellsDue() return has(STONE) and has(NANXIAN) and has(PAGE) and doubtDone() and not has(TELLS) end
 -- 归路：归1、归2 与北丑清醒一夜都已播（北丑一夜须先有认人，认人须先见他过日子）。
 local function returnReady() return has(STONE) and has(TELLS) and has(NOTEBOOK) and has(NIGHT) end

 -- 归1 · 南贤讲完当年（再访 E822，原句 2594 之后）：两人同来，一留一回；父亲临走立下有条件的托付。
 local function nanxianTells()
  narrate('你把《侠客行》里那页残页取出来，摊在南贤面前。南贤就着灯看了许久，指腹在页边那两行字上停了一停。')
  say(73,'这字，老朽见过。……有些话，老朽等了三十年，今日该说完了。')
  say(73,'三十年前寻到老朽门上的，不是一个后生，是两个。他们说，是打一扇门外头进来的。')
  if has(BEICHOU_KNOWS) then hero('门外头……北丑前辈也这样说过。') else hero('门外头？') end
  say(73,'两人在这一带住了几年。一个爱说爱笑，走到哪里都有酒喝；一个话少，心思重，也交了朋友，也许过约。')
  say(73,'爱说笑的那个留了下来，就住在北边雪地里，如今人人叫他北丑。')
  hero('那话少的那个呢？')
  say(73,'回去了。他说门那边有个人在等他，等不得。去圣堂的前一晚，他只来跟老朽辞了行。')
  say(73,'临走托了老朽一件事：日后若有人从溪边界石底下醒来，手里攥着界石上崩下的碎石，便把一样东西交给那人，再替他带一句话。')
  say(73,'老朽便托人守着溪边。一守三十年，也不知道会不会有人来。')
  hero('晚辈醒来那日，手里攥着的，正是那样一块碎石。')
  say(73,'是不是他说的那个人，看过那样东西再说。')
  -- 157 审核：两线通关的那一段原本写在这里，位置与内容都不对——①南贤上一句刚说「看过那样东西再说」，
  -- 明说要先验过册子才认人、才带话，这一段却抢在册子拿出来之前就把话带了，他同时在「不肯说」和「已经说了」；
  -- ②它以「他托老朽带的话是」起头，而归2 里南贤又用同一句起头带出「两边都是真的」，同一个人同一次托付
  -- 带出两句不同的话，玩家分不清父亲到底留了哪句。已整体挪进归2 的「两边都是真的」之后，作为同一句话的后半截。
  mark(TELLS)
 end

 -- 159：小册只确认旧物和来处，不在中程凭笔迹提前认亲；已听线索位照常保留。
 local function nanxianNotebook()
  narrate('南贤从床头木箱底下取出一本小册子。纸已发黄，用麻线订着，边角磨得起了毛。')
  say(73,'就是这个。他说带不走，又舍不得烧，便搁在老朽这里。')
  narrate('册子里抄的是这一带的山路、药名、各家客栈的酒价，字小而工整，与残页上那行“今夜不去”一个样子。许多页的页角，都折成了小小的三角。')
  hero('＜页角折成三角……＞')
  narrate('指尖压住折痕的一刻，你仿佛闻见一股旧书的气味。有人在灯下翻书，手指停在页角；再想看清，那人却隐在光背后。')
  hero('＜字认得，这个习惯也熟。可写字的人，究竟是谁？＞')
  say(73,'他托老朽带的话是：两边都是真的。')
  hero('两边……都是真的。')
  say(73,'老朽只管带话。这话怎么听，是你自己的事。册子你收着罢。')
  narrate('你把小册与残页放在一起。纸边正好接上，来处仍隔着一层雾。')
  mark(NOTEBOOK)
 end

 -- 归3 · 北丑清醒的一夜（E827，认人之后再交谈）：为何留下、得失、为何想留你作伴；父亲没当面告别。
 -- 留人之约只做对白，不开战斗：应与不应都听得完，也都不定去留。
 local function beichouNight()
  narrate('天已黑透。北丑没有缝护膝，也没有拨炉火，只坐在门槛上看雪，脚边搁着一坛酒。')
  say(74,'南贤那老头子，都跟你说了？')
  hero('说了。三十年前进门的，是两个人。')
  narrate('北丑竖起一根手指，这一回没有晃。')
  say(74,'竖一根：我跟他一道进的门。那年在这雪地里喝酒，说好了，谁要走，先当面说一声。')
  say(74,'竖一根：他去圣堂的前一晚，去见了南贤，没来见我。第二天我追到圣堂，门已经合上了。')
  hero('前辈怨他么？')
  say(74,'怨过。后来想，他若真来当面说，我拦不拦？准拦。拦不住，就打一架。……这一架，他大概也想到了。')
  hero('前辈为何留下？')
  say(74,'竖一根：这边有酒，有朋友，有人等着我的护膝。门那边……竖三根，记不清喽。只记得在那边，没什么人等我。')
  say(74,'得了一冬一冬的雪，一个一个的朋友；丢了家乡。捡了半辈子残页，捡回来的，全是别人的事。')
  hero('前辈想留晚辈作伴？')
  say(74,'想。这雪地里，打门外头进来的，就我一个。你一走，又剩我一个。')
  say(74,'少年哎，接我三招。接不住，就留下来陪我喝酒。')
  if ask('应北丑三招之约？此处不开战斗；应与不应，都能听他说完，也都不定去留。') then
   narrate('第一招掌风扑面，你侧身让过；第二招他抢进半步，你架住了。第三招到了你面前，却停住了。')
   say(74,'罢了。拿三招就想留人，我李丑成什么人了。')
  else
   hero('晚辈不接。去留的事，不该拿招式来定。')
   say(74,'……好。不接就不接。')
  end
  say(74,'说好了：你要走，先当面跟我说一声。')
  hero('晚辈答应。')
  hero('前辈，那页残页上的字……')
  say(74,'别人的字，我不看。')
  narrate('他把酒坛往你怀里一塞，起身进了屋。再出来时，又是那副腔调。')
  mark(NIGHT)
 end

 -- 圣堂送行 E1016（南贤临别 2956 之后）：去留未定，先当面对北丑说一声。
 local function sendOff()
  hero('北丑前辈，晚辈答应过的：若要走，先当面说一声。门后头走还是不走，眼下还说不准，今日先来说这一回。')
  say(74,'竖一根：听见了。……这一声，我收下了。')
  narrate('他别过脸去，揪着林厨子问今晚炖什么。南贤看了你一眼，没有说话。')
 end

 -- 知己去向（好感层记录只读）：到了知己的人按好感高低至多三位；住进山居的、约好了结旧事再来的、各有牵挂的，各一种写法。
 local KIN={
  back={resident='{名}仍住在山居。你那间屋子，{名}一直没让人动过。',promised='{名}了结旧事后到过山居，留下一封信，又去办自己的事了。',apart='{名}照旧过自己的日子。只是有一回喝酒，多摆了一只碗。',none='一路相识的人，各有各的去处。'},
  stay={resident='{名}没有问你为何留下，只把檐下那把竹椅往炉边挪了挪。往后的冬天，{名}仍住在山居，也仍常出门办自己的事。',promised='{名}的旧事还没了。听说你留下，托人捎来一句：了结之后，山居见。',apart='{名}有自己的牵挂要去了结。临别时说，往后路过，总要来讨一碗酒。',none='一路相识的人，各有各的日子。你留下，并没有替谁定下该往哪里去。'},
 }
 local function kinLines(kind)
  local g=type(browser_growth_state)=='function' and browser_growth_state() or nil;local a=type(g)=='table' and g.affinity;local rows={}
  if type(a)=='table' and type(a.persons)=='table' then
   for _,pid in ipairs(COMPANIONS) do
    local r=a.persons[tostring(pid)]
    if type(r)=='table' and r.bond==true then rows[#rows+1]={pid=pid,value=tonumber(r.value) or 0,home=r.home} end
   end
  end
  if #rows==0 then narrate(KIN[kind].none);return end
  table.sort(rows,function(x,y) if x.value~=y.value then return x.value>y.value end;return x.pid<y.pid end)
  for i=1,math.min(3,#rows) do
   local r=rows[i];local key=(r.home=='resident' or r.home=='promised') and r.home or 'apart'
   narrate((KIN[kind][key]:gsub('{名}',JY.Person[r.pid]['姓名'])))
  end
 end

 -- 回去：批注旁添一行，带着留笺醒在书房。移除已废弃的住院缺席矛盾，江湖后日谈在前。
 local function goBack()
  hero('爸，我回去。')
  father('灯我不关。')
  narrate('你取出残页，在那两行字底下添了一行：“今夜回来。”')
  narrate('门光合拢以前，你摸出醒来那日案上那封留笺，攥进了手心。')
  narrate('你走以后，南贤把册子的事说给青衣人听，青衣人仍常去溪边坐坐。北丑照旧年年缝护膝，那年冬天多缝了一副，没说是给谁的。')
  kinLines('back')
  narrate('醒来时天刚亮。你躺在书房地板上，身边是装了一半的纸箱，手心里攥着一封没有署名的留笺。')
  narrate('《侠客行》摊在身旁。那一页的页边有三行字，最底下一行是你的笔迹：“今夜回来。”')
  narrate('父亲靠在椅子上睡着了，灯还亮着。你一动，他就醒了。')
  father('回来了。')
  hero('回来了。')
  father('那边的事，你慢慢说。')
  hero('先烧壶水吧。话有些长。')
  narrate('父亲应了一声，伸手扶住桌沿。你这才看见，茶杯里的水早已凉透了。')
  narrate('他起身去厨房烧水。你把留笺夹进书里，夹在那三行字旁边。')
 end

 -- 留下：门封上，南贤北丑各有反应，知己各有去处；现实后日谈同等分量——父亲读到那行字，头一回对旁人讲起三十年前。
 local function stayHere()
  hero('爸，我留下。')
  father('……嗯。你妈那边，我去说。')
  narrate('你取出残页，在那两行字底下添了一行：“我留下。爸，保重。”')
  narrate('门光一寸一寸收拢，灯影、书墙、那张花白的脸，最后都合进了石门的纹路里。门封上了。')
  narrate('你回到南贤居时，天已经黑了。')
  say(73,'留下了。……册子你收好，那是他的。')
  narrate('北丑听说了，拎着一坛酒来敲门。')
  say(74,'竖一根：留下来，可不是为了陪我。……酒钱各付各的。')
  kinLines('stay')
  narrate('门那边，第八天早上，书房的灯还亮着。')
  narrate('父亲对着《侠客行》那一页坐了一夜。那两行字底下，多了一行：“我留下。爸，保重。”')
  narrate('吃早饭时，他放下筷子，对母亲说：“三十年前，我去过一个地方。”')
  narrate('他说了很久。说那边的雪，说一个姓李的朋友，说自己走的时候，没去当面告别。')
  mother('这些年，怎么从没听你说起？')
  father('总想着，往后有空再说。')
  mother('那就从头说。我听着。')
  father('好。从头说。')
  narrate('那套书，他没有再装箱。《侠客行》放回了书架，那一页的页角，折成了一个小小的三角。')
 end

 -- 【接口点 · 回现实终战】Tom 2026-09-18：选择“回去”时将来要加一场最终之战，参战队友从好感达标者中选，
 -- 涉及十大善人、十大恶人与善恶之影。叙事与战斗结构仍在研究（见 ../../分析报告/总体剧本提案-善恶两程与归途终战-20260918.md，
 -- 只读参考，本批不据此实现）：不写二十二人同屏、不加第三轮、不动既有圣堂之战 E1015。
 -- 本批只留这一处调用点：将来那一层把全局 BrowserHomecomingWar 定义成函数即可接上，返回 false＝没打赢，回到去留菜单。
 -- 没有终战不能当作已胜出；不写回去结局，也不消耗去留机会。
 local function homecomingWar()
  local war=rawget(_G,'BrowserHomecomingWar')
  if type(war)~='function' then
   narrate('【归路未通】返回现实的最终之战尚未开放，当前不能完成回去结局。你可以选择留下，或保留门前进度，待后续内容接通后再来。')
   return false
  end
  return war()==true
 end
 local function chooseRoad()
  while true do
   local pick=ShowMenu({{'回去',nil,1},{'留下',nil,1},{'还不能决定',nil,1}},3,0,0,0,0,0,1,0,CC.DefaultFont,C_WHITE,C_WHITE)
   if pick==1 and ask('决定回去？选定以后门便封上，这一程不能再改。') and homecomingWar() then return 'return' end
   if pick==2 and ask('决定留下？选定以后门便封上，这一程不能再改。') then return 'stay' end
   -- S2 395：身世已解锁时「还不能决定」先退回门前：不播结局、不记去留与通关、不封门，门前胜出记录照旧，可再来选。
   if pick==3 and ask('暂不决定，先退回门前？') then return 'later' end
  end
 end

 -- 门前破例存档（rest-save 层的补丁，未合并时 rawget 读到 nil，无副作用）：
 -- 位置固定在“最终不可退流程之前”——说明完规则、旧影未战之前，读回即回到这扇门前。
 -- 返回 true 才算真的存成（玩家选了存档位并保存成功）；取消、失败或补丁未合并都返回 false。
 local function doorSave()
  local f=rawget(_G,'BrowserDoorSave')
  if type(f)~='function' then return false end
  return f()==true
 end
 -- 155o 圣堂「系统扫描」（Tom 2026-09-18）：结局前这一次破例保存做成圣堂独有的仪式。
 -- 只用在归梦之门前，家中与客栈的普通歇宿不扫描。提示用平静、简短、略显陌生的系统措辞；
 -- 初次不明说前世、复制人格或善恶之影，只留“每次在圣堂停下，系统都会把你记下一次”的暗示。
 -- 位标 SCAN 在保存之前写下，随这份存档一起存进去：读回这份档不重播这段演出，也不再破例存第二次。
 -- 取消、保存失败或补丁未合并都不显示“已封存”，位标退回，本程机会仍在，下次走到门前照样再来一次。
 -- 扫描只留数据：不计善恶通关，不生成也不复活旧影；旧影仍按真实前程、善恶相反与一次耗尽的原规则。
 local function templeScan()
  if has(SCAN) then return end
  narrate('石门两侧的石台次第亮起，台面上浮出一圈浅浅的刻痕。\n\n【此处可以保存当前的进度。】')
  narrate('圣堂记录启动。')
  narrate('全身扫描中……')
  narrate('一道细光自足下缓缓扫过全身。衣衫、兵器和人的轮廓短暂映在石面上；四下里乐声压低，只剩一点清冷的鸣声。')
  narrate('基础属性记录完成。')
  narrate('武学与战斗数据记录完成。')
  mark(SCAN)
  if doorSave() then
   narrate('本次记录已封存。')
   narrate('你已经能够动身。往旁边挪开一步，石面上那个人形却迟了一息才散去。')
   hero('＜每一回走到这里，圣堂都把我记下一次。记下的那些，后来都去了哪里？＞')
  else
   unmark(SCAN)
   narrate('石台的细光收回台面，鸣声也停了。这一次没有封存。')
   hero('＜再走到这里时，它还会再记一次。＞')
  end
 end
 -- 归路 · 归梦之门（E1017，原句 2958 之后）：先说明时日与封门规则，存一次档，
 -- 再由门前必战把关（符合正式旧影条件时必须先战胜），胜后才双向告别、择路。
 local function returnRoad()
  templeScan()
  -- 只在真实 E1017 的尾声判资格。当前方向可供本次收束判断；写档仍由原 instruct_62 完成。
  local ready=rawget(_G,'browser_ending_revelation')
  local revealed=type(ready)=='function' and ready(JY.Person[0]['品德']>50 and 'good' or 'evil')==true
  if not revealed then
   local due=BrowserEchoFinalDue()
   if not BrowserEchoFinal(false) then return 'blocked' end
   if not due then
    narrate('石门深处透出一点灯光，像一页尚未翻开的书。你将残页收入怀中，回望这一程走来的路。')
    hero('＜见过的人，做过的事，总不能一笔抹去。至于我从哪里来……还欠着一个答案。＞')
    narrate('风从门内吹来。你握紧残石，迈过门槛。身后的江湖渐远，这一程到此为止。')
   end
   return 'defer'
  end
  narrate('你握紧残石，门框上的纹路一圈一圈亮了起来。门里不是黑的：一间屋子，四壁是书，桌上一盏灯。')
  narrate('那盏灯没有火苗，也不用添油。')
  narrate('【归路】门只开这一回。门那边已是第七天，往后不再多过。回去：江湖这一程到此为止；留下：门就此封上，从此住在这边。选定以后，这一程不能再改；决定之前的存档仍可读回。')
  narrate('【归路】若还有未了之事，也可暂不决定，先退回门前，想定了再来。封门之后，首页的「再入江湖」仍可从同一起点另走一程——那是另一种可能，不改这一程的选择。')
  -- 门前必战由 echo-extension 判定资格并执行；未胜（战败／退出／不应战）就不进入告别与去留，这一程也不记通关。
  local echoWasDue=BrowserEchoFinalDue()
  if not BrowserEchoFinal(true) then return 'blocked' end
  if not echoWasDue then
   narrate('门光里终于看清：灯下坐着一个人，背对着门，头发花白，头没有抬。')
  end
  narrate('灯下那只手翻过一页书，仍在页角折出一个小三角。小册、残页与两程旧事忽然接在一起；记忆里的面孔，终于清楚了。')
  hero('……爸。')
  narrate('那人抬起头。隔着门光，他看了你很久。')
  father('……是你。')
  father('第七天了。你妈以为你出了远门，我没跟她说实话。每天夜里，我就在这儿坐着。')
  hero('我在这边，好好的。有人救过我，有人教过我功夫，也有人等着我去喝酒。')
  father('三十年前，我也在那边。你妈怀着你，我就回来了。这件事，我从没跟你说过。')
  hero('从前听你说起山里的雪，我只当是书里看来的。')
  father('有些是。也有些，是亲眼见过的。')
  narrate('他望向你身后的石阶，似乎想问那位旧友，又把话收了回去，等你先说。')
  local choice=chooseRoad()
  if choice=='return' then goBack() elseif choice=='stay' then stayHere()
  else narrate('你没有答话，往后退了一步。门那边的灯没有灭，门框上的纹路慢慢暗下去，像是还在等你。') end
  return choice
 end

 -- 选定回去/留下：记下选择（引擎钩子，可选），留下不播入门动画；门前必战未胜则本事件不进入结局。
 -- 旧影不必再临时屏蔽：胜出后 echoWon 已记下，instruct_62 的把关会直接放行，不会重邀、不会重复消耗。
 -- 事件结束（含出错经 pcall）立即还原 instruct_44 与 instruct_62。
 local function atDoor(sourceEvent,id,...)
  local animate,ending=instruct_44,instruct_62
  local result=table.pack(pcall(withLinesAfter,{[2958]=function()
   local choice=returnRoad()
   if choice=='blocked' then instruct_62=function() end;return end
   if choice=='defer' then return end
   -- 退回门前：本次事件余下的入门动画与原结局（instruct_44／instruct_62）都不播；事件结束（含出错）由下方统一还原。
   if choice=='later' then instruct_44=function() end;instruct_62=function() end;return end
   local hook=rawget(_G,'browser_homecoming');if type(hook)=='function' then hook(choice) end
   -- 156 审查：「回去」原本保留原版入门动画，于是它排在 goBack() 把现实那半段全讲完之后才播，
   -- 顺序反了（goBack 里已经交代过门光合拢与穿门）。「还不能决定」仍照原样播动画。
   if choice=='stay' or choice=='return' then instruct_44=function() end end
  end},sourceEvent,id,...))
  instruct_44,instruct_62=animate,ending
  if not result[1] then error(result[2],0) end
  return table.unpack(result,2,result.n)
 end

 local sourceEvent=oldCallEvent
 local function dispatch(id,...)
  local scene=JY.SubScene
  if id==691 and scene==70 then return withLinesAfter({[2544]=stoneAtWaking},sourceEvent,id,...) end
  if id==821 and scene==64 then
   return withLinesAfter({[2568]=stoneToNanxian,[2587]=function() youngMan(FIRST_OPENING) end},sourceEvent,id,...)
  end
  if id==822 and scene==64 and not has(NANXIAN) then
   local result=table.pack(sourceEvent(id,...))
   youngMan(LATER_OPENING)
   return table.unpack(result,1,result.n)
  end
  if id==822 and scene==64 and tellsDue() then
   local result=table.pack(sourceEvent(id,...))
   nanxianTells();nanxianNotebook()
   return table.unpack(result,1,result.n)
  end
  if id==827 and scene==6 then
   if has(BEICHOU_BACK) and not has(BEICHOU_LIFE) then beichouLife()
   elseif has(BEICHOU_LIFE) and not has(BEICHOU_KNOWS) and (priorRun() or has(NANXIAN)) then beichouKnows()
   elseif has(BEICHOU_KNOWS) and has(NOTEBOOK) and not has(NIGHT) then beichouNight() end
  end
  if id==931 and scene==70 then
   local night=homeNight()
   if night then return withLinesAfter({[2844]=night},sourceEvent,id,...) end
  end
  if id==658 and scene==3 and innKneeDue() then return withLinesAfter({[773]=innKnee},sourceEvent,id,...) end
  if id==1016 and scene==83 and returnReady() then return withLinesAfter({[2956]=sendOff},sourceEvent,id,...) end
  if id==1017 and scene==83 then
   if has(STONE) and not has(DOOR) then doorPattern() end
   if returnReady() then return atDoor(sourceEvent,id,...) end
   -- 每条正式结局都在不可退之前给一次门前扫描保存，不以身世线索或待战旧影为保存资格。
   -- SCAN仍只在实际保存成功后保留；旧影由instruct_62把关，普通结局沿用失忆过门的收束。
   return withLinesAfter({[2958]=templeScan},sourceEvent,id,...)
  end
  return sourceEvent(id,...)
 end
 oldCallEvent=function(id,...)
  local spoke,outer={},heard
  local hadBook=has(PAGE) or owned(BOOK)
  heard=spoke
  local result=table.pack(pcall(dispatch,id,...))
  heard=outer
  if not result[1] then error(result[2],0) end
  if not hadBook and not has(PAGE) and owned(BOOK) then pageFound(false) end
  familiarAfter(spoke)
  return table.unpack(result,2,result.n)
 end

 -- 进北丑居时他已见过主角（交谈事件已是827），才算“再访”；初见那一趟不算。
 local sourceInitScene=Init_SMap
 Init_SMap=function(...)
  local result=table.pack(sourceInitScene(...))
  if JY.SubScene==6 and GetD(6,1,2)==827 then mark(BEICHOU_BACK) end
  return table.unpack(result,1,result.n)
 end
end)()
