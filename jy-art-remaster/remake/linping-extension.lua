-- 157 林平之 · 多周目彩蛋（editorial/林平之彩蛋157.md，补丁见 reviews/linping157-patch-suggestions.md）
-- Tom 2026-09-18：若主角已取得紫霞神功，可让林平之放弃修炼辟邪剑谱，改以华山剑法＋紫霞神功击败余沧海；
-- 不屠整派，只令余沧海一人自尽；正道结局是与岳灵珊厮守，并在岳不群身败名裂后接任华山掌门。
--
-- 这是彩蛋：不进首页、不进提示文案、不写攻略。加的是可选分支——不选它，全程与现在逐字节相同。
--
-- 原链形状〔逐字读 oldevent_286/288/289/290/291/295/296/297/312/313/315/322/332/968/969 与 data/alldef.grp〕：
--   福威镖局(56)格1：286 初遇(战斗48) → 298 → 288／289 回报噩耗 → 314；56/2 踏入 312→290 或 313→291。
--   E289 就是辟邪那条路定下来的一刻：instruct_35(36,0,60,100)＋instruct_41(36,78,1)＋instruct_63(36,2)。
--   E290／E291 入队一律 instruct_37(−4)；E296（青城 36/4，须他在队）战斗51 胜后清空 36/0–4（整派消失），声望+3。
--   E968 请他先回镳局＝离队并把 56/1 写回 969；E969 重邀本就不扣品德。
--   战斗51「平之復仇」自动选择参战人1＝36 —— 原版这一仗本来就是林平之一个人打，敌人是余沧海＋5 名青城弟子。
--
-- 本层只包六个事件，六处都照常下调 source（不整段接管，不挡任何一层）：
--   E289 在遗训那一句(987)之后加一个二选一；选「劝住他」则压掉上面三条指令、并把 56/2 的踏入事件写 312 而非 313。
--   E290 把原版的是／否换成三选一；「上华山」这一支不走 instruct_37(−4)，改给华山剑法十级与紫霞入门（内力上限+10）。
--   E296 战斗51 只留余沧海一人（临时改 WAR.Data，战斗数据每战由 WarLoad 重载、不入存档），胜后只清 36/4。
--   E315 青城弟子换一句（掌门已死，原句「要杀要剐随你」会当场穿帮）。
--   E332 华山派（E322 黑木崖揭穿岳不群之后才存在）：原版两句照播，之后接接掌那一幕。
--   E969 福威镖局重邀：只换词，入队、队满 175、不扣品德全部照原版。
--
-- 「已放弃辟邪」怎么不新增存档字段地查出来：借南贤居(64)事件格 196 第8栏作位标
--   （与身世层 199、易筋层 198、田伯光层 197 同法）。原版该格 11 栏全为 0〔读 data/alldef.grp 与 content.js
--   的 eventData 双向核实〕，场景 64 地图第3层最大值为 2（没有一格指向 196），全部 1018 个原事件里
--   没有一条 instruct_3 写场景 64、也没有一条写 190–199 号格。引擎只在第2栏>0 时才列入「附近」，本层只写第8栏。
--   随正常存档的事件表保存；旧档此栏为 0 ＝ 一切照原样；新周目随原事件表重置。
;(function()
 local REG_SCENE,REG_SLOT,REG_FIELD=64,196,8
 local RENOUNCE,HUASHAN,SPARED,MASTER=1,2,4,8
 local LIN,YU,YUE=36,24,19
 local QING_HEAD,HUA_HEAD=86,81                       -- 青城弟子 211–220 共用头像 86；華山弟子 164/169/170 共用头像 81
 local ZIXIA,SWORD_ART,BIXIE_ART=39,37,60            -- 紫霞秘笈(物品)／华山剑法(武功)／辟邪剑法(武功)
 local FUWEI,FSLOT=56,1                              -- 福威镖局 · 格1（林平之那一格，贴图 5862/5886/5862）
 local QING=36                                       -- 青城派
 local HUA=57                                        -- 华山派
 local DUEL=51                                       -- 战斗「平之復仇」
 local solo=false                                    -- 只在彩蛋的那一仗里为真

 local function flags() local v=GetD(REG_SCENE,REG_SLOT,REG_FIELD);return (type(v)=='number' and v>0) and v or 0 end
 local function has(bit) return math.floor(flags()/bit)%2==1 end
 local function mark(bit) if not has(bit) then SetD(REG_SCENE,REG_SLOT,REG_FIELD,flags()+bit) end end
 local function head(pid) local p=JY.Person[pid];return (p and p['头像代号']) or pid end
 local function hero(t) TalkEx(t,0,1) end
 local function lin(t) TalkEx(t,head(LIN),0) end
 local function yu(t) TalkEx(t,head(YU),0) end
 local function yue(t) TalkEx(t,head(YUE),0) end
 local function qpupil(t) TalkEx(t,QING_HEAD,0) end
 local function hpupil(t) TalkEx(t,HUA_HEAD,0) end
 local function narrate(t) DrawStrBoxWaitKey(t) end
 local function choose(rows) return ShowMenu(rows,#rows,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE) end
 local function inTeam(pid) for i=1,CC.TeamNum do if JY.Base['队伍'..i]==pid then return true end end return false end
 local function owned(id)
  for i=1,CC.MyThingNum do if JY.Base['物品'..i]==id and (JY.Base['物品数量'..i] or 0)>0 then return true end end
  return false
 end
 local function knows(pid,skill)
  local p=JY.Person[pid];if not p then return false end
  for i=1,10 do if p['武功'..i]==skill then return true end end
  return false
 end

 -- 「主角取得紫霞神功」：游戏里没有一门叫紫霞神功的武功编号，紫霞是心法书 39，有重数。
 -- 主判据＝成长层现成的只读接口（跨层一律 rawget 探测，未合并／经典档时返回 nil）。
 -- 兜底＝囊中有《紫霞秘笈》且它的「使用人」是主角（原版 UseThing_Type2 选人修炼时就写这一栏，秘籍不消耗）。
 local function zixia()
  local f=rawget(_G,'BrowserGrowthStudyRank')
  local rank=type(f)=='function' and f(0,ZIXIA) or nil
  if type(rank)=='number' then return rank>=1 end
  local t=JY.Thing[ZIXIA]
  return owned(ZIXIA) and t~=nil and t['使用人']==0
 end
 -- 彩蛋只在他还没走上辟邪那条路时开着：E291（已找到真剑谱）永远没有这一支。
 local function open() return zixia() and not knows(LIN,BIXIE_ART) end
 -- 「岳不群身败名裂」在原版没有对应事件。最接近的一拍是 E322（黑木崖当众斥他伪君子、战斗56、声望+12），
 -- 它把华山派 57/0 与 57/1 的交谈事件写成 332 —— 全脚本只有 E322 写这个值〔grep 核实〕。
 local function disgraced() return GetD(HUA,0,2)==332 end

 -- ============ 一、E289 · 遗训那一刻（劝住他，或照实说） ============

 local function renounce()
  hero('林兄，令尊临终托人捎这句话，不是要你去取什么。他是要你别去。')
  lin('少侠这是什么意思？那是我林家祖传之物，我爹连死都记着它。')
  hero('他记着的是那句遗训。「不得翻看，否则后患无穷」——这后半句才是他要你听的。')
  lin('可我拿什么报仇？我这身功夫，连青城派的门都进不去。我爹一招一式教出来的七十二路辟邪剑法，他自己使了一辈子，还不是让人绑了去。')
  hero('那正是我要说的。你爹使了一辈子，救不了自己；余沧海抢了一辈子，抢到的是一口空地窖。这本书到今天为止，害的全是自己人。')
  narrate('林平之没有接话。院子里那块「福威镖局」的匾斜挂着，风一过就晃一下，木头上的裂缝比昨天又长了些。')
  lin('……少侠既这么说，总得给我一条别的路。')
  hero('我有一门内功，华山派的。名叫紫霞。我练到过第一重，知道它是怎么起头的——起头很慢，慢得叫人生气。')
  lin('慢？')
  hero('慢。可它不要你先剁掉半个自己。')
  narrate('他低头看了很久自己的手。那双手上还有昨夜握剑磨出的血口，没上药。')
  lin('我记下了。地窖我不去。')
  mark(RENOUNCE)
 end

 -- 包住 E289：只在原版第 987 句（把侯人雄带来的遗训原样转述）之后加一个二选一。
 -- 选「劝住他」＝压掉 instruct_35／instruct_41／instruct_63 三条，并把 56/2 的踏入事件由 313 改写为 312
 -- （于是接上的是 E290「他还没有剑谱」那一支，而不是 E291「真的剑谱被我找到了」）。
 -- 56/1→314、36/3→315、品德 +2 一条不少。
 local function bequest(source,id,...)
  local f1,f3,f35,f41,f63=instruct_1,instruct_3,instruct_35,instruct_41,instruct_63
  local picked=false
  instruct_1=function(tid,...)
   local r=table.pack(f1(tid,...))
   if tid==987 then
    instruct_0()
    if choose({{'话带到了，别的我不多说',nil,1},{'话带到了 —— 可那口地窖，你别去开',nil,1}})==2 then
     picked=true;renounce()
    end
   end
   return table.unpack(r,1,r.n)
  end
  instruct_3=function(sc,d,v0,v1,v2,v3,v4,...)
   if picked and d==2 and v4==313 then return f3(sc,d,v0,v1,v2,v3,312,...) end
   return f3(sc,d,v0,v1,v2,v3,v4,...)
  end
  instruct_35=function(pid,...) if picked and pid==LIN then return end;return f35(pid,...) end
  instruct_41=function(pid,...) if picked and pid==LIN then return end;return f41(pid,...) end
  instruct_63=function(pid,...) if picked and pid==LIN then return end;return f63(pid,...) end
  local ok,err=pcall(source,id,...)
  instruct_1,instruct_3,instruct_35,instruct_41,instruct_63=f1,f3,f35,f41,f63
  if not ok then error(err,0) end
 end

 -- ============ 二、E290 · 只取一人，先上华山 ============

 -- 华山剑法写进空着的武功槽（第一格留着他爹亲传的家传剑招）；紫霞只传口诀，结算＝《紫霞秘笈》原版那一条
 -- 「加内力最大值 10」。25→35 正好跨过 books[39] 的「需内力30」门槛（jymain:2417 CanUseThing 比的是内力最大值），
 -- 他的内力性质是 0（阴），与「需内力性质0」相合 —— 此后玩家**可以**在修炼界面把秘笈交给他做心法，
 -- practice-core 现成的「紫霞与华山剑学相辅 +15%」当场生效。本层不替玩家做这件事，也不写成长／修炼的任何记录。
 local function huashanGrant()
  local p=JY.Person[LIN];local slot=-1
  for i=1,10 do if p['武功'..i]==SWORD_ART then slot=i-1;break end end
  if slot<0 then for i=2,10 do if p['武功'..i]==0 then slot=i-1;break end end end
  if slot<0 then slot=1 end
  instruct_35(LIN,slot,SWORD_ART,900)                -- 华山剑法十级（tier1 封顶 220，远不及辟邪一级的 315）
  AddPersonAttrib(LIN,'内力最大值',10)
  AddPersonAttrib(LIN,'内力',10)
  mark(HUASHAN)
 end

 local function persuade()
  hero('血债是余沧海欠的。青城派门下几百口人，替他递过一次茶的，也要一起偿命？')
  lin('他们围了我家的门，杀了我家的人。')
  hero('围门的那几个，你自己数得出名字。数不出的那些，与你我一样是被人差遣的。你今日杀满门，明日就轮到有人来杀你林家的满门——你爹娘是怎么死的，忘了？')
  narrate('林平之握剑的手紧了一下，又松开。')
  lin('……那我拿什么去打他？余沧海是青城派掌门，我连他一招都接不住。')
  hero('拿华山的剑，和华山的内功。我在华山后山的一口箱子里得过一部《紫霞秘笈》，练出过第一重。紫霞起头慢，配的是华山剑法——一路一路都是正经功夫，没有一招是要你先断了自己的。')
  lin('华山派……岳先生肯收我？')
  hero('他好名。一个走投无路又肯下苦功的少年递上门去，他没有不收的道理。往后你自己看他这个人，我不替他打包票。')
  lin('我只求一件事——学成之前，别叫我去见余沧海。我怕我忍不住。')
  hero('忍得住才叫报仇，忍不住那叫送命。')
 end

 local function comeBack()
  narrate('此后许多时日，你在江湖上来去。华山那边只来过一封信，字迹端正得过了头，说「已拜入岳先生门下，日日在思过崖下练剑，勿念」。')
  narrate('再见到他时，是在福威镖局的旧门口。他瘦了，站得比从前直，腰间那柄长剑换了新的穗子。')
  lin('少侠。华山剑法我练完了，全套七十二路，师父说我用功得像不要命。')
  hero('紫霞呢？')
  lin('师父说内功急不得，我才刚摸着门。倒是少侠当日说的那句「起头很慢」，我如今懂了。')
  hero('懂了就好。走罢——只取一个人。')
  lin('只取一个人。')
  huashanGrant()
 end

 -- 包住 E290：把原版那一句「是否要求加入」换成三选一。
 -- 1＝原版同去（杀光青城派，仍扣 −4）；3＝原版拒绝（「凡事慢慢来」）；2＝彩蛋。
 -- 彩蛋支只换 990／991 两句、压掉 instruct_37(−4)，其余（队满 175、变黑、清格、36/3→315、instruct_10）全照原版。
 local function pledge(source,id,...)
  local f1,f9,f37=instruct_1,instruct_9,instruct_37
  local pick=0
  instruct_9=function()
   instruct_0()
   pick=choose({{'同去 —— 青城派满门，一个不留',nil,1},
                {'同去 —— 但只取余沧海一人；先随我上一趟华山',nil,1},
                {'林兄别急，凡事慢慢来',nil,1}})
   return pick==1 or pick==2
  end
  instruct_1=function(tid,...)
   if pick==2 and tid==990 then persuade();return end
   if pick==2 and tid==991 then comeBack();return end
   return f1(tid,...)
  end
  instruct_37=function(v,...) if pick==2 and v==-4 then return end;return f37(v,...) end
  local ok,err=pcall(source,id,...)
  instruct_1,instruct_9,instruct_37=f1,f9,f37
  if not ok then error(err,0) end
 end

 -- ============ 三、E296 · 青城派，只取一人 ============

 local function afterDuel()
  narrate('最后一剑挑飞了他手里的兵刃。剑尖停在他咽喉前三寸，停住了，没有再往前。')
  lin('我爹娘是被你杀的。这一剑我收了 —— 不是饶你，是不肯用你那套法子。')
  yu('小畜生……你倒学得一副好嘴脸。')
  lin('你要的那本书，我没有去取。你抢了半辈子，抢的是一口空地窖。')
  narrate('余沧海怔了很久。他捡起地上那柄兵刃，反手横在自己颈上。青城派几个弟子远远看着，没有一个敢上前。')
  hero('……林兄。')
  lin('让他自己了断罢。我爹娘的账，到此为止。')
  narrate('松风观的钟在山门外响了一记，是丧钟。院子还在，人也还在，只是掌门的位子空了。')
  mark(SPARED)
 end

 -- 包住 E296：换掉战前(1025)与战后(1026)两句；战斗 51 照打（战败仍是原版 instruct_15(83)），
 -- 只把 WAR.Data 的敌人2–6 临时撤下；胜后压掉清空 36/0–3 那四条，只让 36/4（余沧海那一格）照原样清掉。
 local function revenge(source,id,...)
  local f1,f3,f6=instruct_1,instruct_3,instruct_6
  local won=false
  instruct_1=function(tid,...)
   if tid==1025 then lin('余沧海。今日我只找你一个。你门下的人退开，我不杀他们。');return end
   if tid==1026 and won then afterDuel();return end
   return f1(tid,...)
  end
  instruct_6=function(warid,...)
   if warid~=DUEL then return f6(warid,...) end
   solo=true
   local r=table.pack(pcall(f6,warid,...))
   solo=false
   if not r[1] then error(r[2],0) end
   won=r[2]==true
   return table.unpack(r,2,r.n)
  end
  instruct_3=function(sc,d,v0,v1,...)
   if won and sc==-2 and type(d)=='number' and d>=0 and d<=3 and v0==0 and v1==0 then return end
   return f3(sc,d,v0,v1,...)
  end
  local ok,err=pcall(source,id,...)
  instruct_1,instruct_3,instruct_6=f1,f3,f6
  if not ok then error(err,0) end
 end

 -- ============ 四、E315 · 青城弟子（只取一人之后） ============
 -- 原版这一格借头像 86 重播余沧海那句「哼！废话少说，要杀要剐随你」。掌门已死，再说这句就穿帮。
 local function bystander(source,id,...)
  local f1=instruct_1
  instruct_1=function(tid,...)
   if tid==1014 then
    qpupil('我们掌门……自己了断了。观里的事，如今是几位师兄轮着管。')
    qpupil('那位林公子走的时候说，青城派与福威镖局的账清了。少侠请自便，我们不拦。')
    return
   end
   return f1(tid,...)
  end
  local ok,err=pcall(source,id,...)
  instruct_1=f1
  if not ok then error(err,0) end
 end

 -- ============ 五、E332 · 华山接掌 ============

 local function succession()
  narrate('山门里外站着不少华山弟子，没有一个应声。')
  lin('师父。')
  yue('……你还叫我师父。')
  lin('叫了三年，一时改不过口。弟子只问一句：黑木崖上那些话，是不是真的？')
  yue('（半晌）你要问的不是这个。你要问的是那本书。')
  lin('是。弟子当年有一部《辟邪剑谱》可取，没有去取。师父若肯说一句「我也没有取」，弟子今日就送师父下山。')
  narrate('岳不群没有说话。他的手一直按在剑柄上，指节发白，那柄剑始终没有拔出来。')
  yue('华山派……你们自己看着办罢。')
  narrate('他从西边侧门走的，没有回头。弟子们让开一条道，等他走远了，才一齐转过身来看着林平之。')
  lin('我入门最晚，本领也不是最好的。掌门这个位子，我坐着不合规矩。')
  narrate('说话的是一个抱着扫帚的少年弟子：「林师兄，师姐说了，她只认你。」')
  lin('……她在哪儿？')
  narrate('那少年往思过崖的方向指了指。岩壁下摆着两个蒲团，一个上面搁着剑穗，红的。')
  lin('少侠，我少年时想过很多回，报了仇之后该做什么。想来想去，一件也没想着。')
  hero('如今想着了？')
  lin('想着了。修坟、修匾、把华山剑法一路一路教下去。再有——她不爱听人说剑，爱听人说福州的荔枝。我得学着说些别的。')
  narrate('他说这话时，脸上那点长年绷着的东西松开了。你在他身上第一次看见这个。')
  instruct_0()
  if choose({{'华山的事要紧，你留下',nil,1},{'掌门也做得，再陪我走一程',nil,1}})==1 then
   lin('多谢少侠。我先回一趟福州，把那块斜了三年的匾摘下来，再回华山。少侠若有用得着我的地方，去福威镖局找我 —— 那地方我总要留着。')
   instruct_21(LIN)
   -- 与原版 E968「请他先回镳局」逐字同一行：人回到福威镖局格1，日后可照原版 E969 重邀。
   instruct_3(FUWEI,FSLOT,1,1,969,-1,-1,5862,5886,5862,0,-2,-2)
  else
   lin('走。山上的事我交代得下去。')
   narrate('那少年弟子跑出老远，还在后面喊：「林师兄！师姐问你几时回来！」林平之应了一声，没说几时。')
  end
  mark(MASTER)
 end

 -- 包住 E332：原版那两句照播 —— 那本来就是一个被当众揭穿之后还在嘴硬的人说的话 —— 之后才接接掌那一幕。
 local function huashan(source,id,...)
  local ok,err=pcall(source,id,...)
  if not ok then error(err,0) end
  if not inTeam(LIN) then
   if not has(MASTER) then
    narrate('一名华山弟子在阶下扫落叶，见你看着岳不群的背影，低声说了一句。')
    hpupil('少侠，山上的事已经换了人管。那位林师兄，眼下在福州。')
   end
   return
  end
  if has(MASTER) then return end
  instruct_0()
  succession()
 end

 -- ============ 六、E969 · 福威镖局重邀（只换词） ============
 local function reunion(source,id,...)
  local f1=instruct_1
  local master=has(MASTER)
  instruct_1=function(tid,...)
   if tid==2753 then
    if master then
     narrate('镖局门口新换了一块木牌，写着「华山派驻闽办事处」，字写得端正，落款是他自己。')
     lin('公子。这块牌子难看得很，我知道。师姐说难看就难看，先挂着。')
     hero('她在福州？')
     lin('在。她说福威镖局的院子比华山暖和，冬天肯在这边住。她还说，等我把华山剑法教出十个徒弟来，就随我姓林 —— 我没敢答话，怕说错一个字。')
     narrate('他说完自己笑了。那笑很轻，像怕把什么吹散了。')
    else
     narrate('镖局的门开着。院里搭了架子，两个泥水匠正把那块「福威镖局」的匾往上抬。')
     lin('公子来得巧。这块匾斜了三年，今日总算能挂正。')
     hero('青城那边呢？')
     lin('松风观还在。他们每年清明往我爹娘坟上送一炷香，我也收了。我不要他们的命，可这炷香他们得送。')
    end
    return
   end
   return f1(tid,...)
  end
  local ok,err=pcall(source,id,...)
  instruct_1=f1
  if not ok then error(err,0) end
 end

 -- ============ 七、接线 ============

 -- 战斗数据每战由 WarLoad 从文件重载，不进存档（SaveRecord 只落 Base／Person／Thing／Scene／Wugong／Shop 与 S/D 图）。
 -- 所以这里改的是这一仗的临时台账，不是永久数据；solo 只在彩蛋的那一仗里为真。
 local sourceWarLoad=WarLoad
 WarLoad=function(warid,...)
  local result=table.pack(sourceWarLoad(warid,...))
  if solo and warid==DUEL and type(WAR)=='table' and type(WAR.Data)=='table' then
   for i=2,20 do
    local key='敌人'..i
    if type(WAR.Data[key])=='number' and WAR.Data[key]>0 then WAR.Data[key]=-1 end
   end
  end
  return table.unpack(result,1,result.n)
 end

 local sourceEvent=oldCallEvent
 local function dispatch(id,...)
  local scene=JY.SubScene
  if scene==FUWEI then
   if id==289 and open() then return bequest(sourceEvent,id,...) end
   if id==290 and open() then return pledge(sourceEvent,id,...) end
   if id==969 and has(SPARED) then return reunion(sourceEvent,id,...) end
  elseif scene==QING then
   if id==296 and has(HUASHAN) and inTeam(LIN) then return revenge(sourceEvent,id,...) end
   if id==315 and has(SPARED) then return bystander(sourceEvent,id,...) end
  elseif scene==HUA then
   if id==332 and has(SPARED) and disgraced() then return huashan(sourceEvent,id,...) end
  end
  return sourceEvent(id,...)
 end
 oldCallEvent=function(...) return dispatch(...) end

 -- 供其他层按需读取（跨层一律 rawget 探测，本层未合并时无副作用）。
 BrowserLinpingPath=function()
  return {renounced=has(RENOUNCE),huashan=has(HUASHAN),spared=has(SPARED),master=has(MASTER)}
 end
end)()
