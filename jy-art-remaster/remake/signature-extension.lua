-- SIGNATURE_EXTENSION : 名角绝学补齐（第一批）
--
-- Tom 2026-09-18：「游戏里面著名角色不管正派还是反派都把自己绝学加上。」
-- 依据表在 editorial/名角绝学补齐157.md（六路考据＋逐路对抗核查，核查驳回 65 条）。
--
-- 本层新局补狄云躺尸剑法、欧阳锋灵蛇拳、乔峰/洪七公打狗棒法；岳不群与左冷禅另层处理。
-- 不新增武学记录，不改变存档结构。
--
-- 158 更正：原先“名角不按时期分段解锁”的注释不符合已定剧情成长与预留名额规则。
-- 段誉北冥、虚竹天山六阳、石破天太玄分别已有 E484、E536/E581、E363 授艺，
-- 仍由这些事件授予，不在新局提前播种。之前的加载期 JY 守卫让本层实际上未安装；
-- 现在修正注册时序，同时撤掉这三条未真正生效的提前授艺。
--
-- 三条硬约束（都已遵守）：
--  ① 武学表 93 条已满（ranger.idx 的武功块 12648 字节 ÷ 136 ＝ 93，装载循环 0..92）。
--     不扩展序列化块；其他层的运行时虚拟条目不等于扩展存档。本层只用底表已有条目。
--  ② JY.Person 的字段直接落进存档字节，所以只在 NewGame 里播种；已存档的人物一个字节都不碰。
--  ③ 守卫用「原版新局里的精确现值」：武功1 与等级须完全吻合、其余槽位须全空，否则整条跳过。
--     任何一方改了底表或别的层先动过手，本层就什么也不做。
;(function()
 -- JY is created later by SetGlobal; register now and read it only inside NewGame.
 if type(NewGame)~='function' then return end

 -- pid = { art=要补的底表代号, level=起手等级值, slot1=原版武功1, lv1=原版武功等级1, why=依据摘要 }
 -- 起手等级一律与他自己现有那门持平或更低，不凭空抬高战力。
 local SEED={
  -- 狄云 37：归属纠正。《连城诀》回1 戚长发亲授躺尸剑法，言达平当场纠正「是唐诗」并讲「孤鸿海上来」。
  -- 血刀大法是他后来在藏边被迫所得，反而先于家传剑法进了底表。220 威力，低阶。
  [37]={art=31,level=300,slot1=63,lv1=300},
  -- 158d：乔峰任帮主时已承汪剑通所授棒法（《天龙》回16）；洪七公为传功者
  -- （《射雕》回21、《神雕》回11）。两人各补底表87，不提前授予虚竹或主角。
  -- 十重是游戏精通档，不是小说明写的十层；降龙仍保留原样。出招须经过真实持械闸门，
  -- 不在这里生成唯一打狗棒，NPC借用寻常棍的既有机制仍负责入场及战后还原。
  -- 底表乔峰特殊兵器仅35，与精通丐帮棒法的配置不相称；新局改为70。
  -- 70是本作平衡值，不是原著数值。原字段已被其他配置改过则整条跳过。
  [50]={art=87,level=900,slot1=25,lv1=900,root=70,wasRoot=35},
  [69]={art=87,level=900,slot1=25,lv1=900},
  -- 欧阳锋 60：《射雕》回21 燃船对洪七公，原文写他潜心苦练、原拟留到二次华山一举压倒诸人，
  -- 被洪七公以擒拿手当场破去。Tom 2026-09-18 点名要补的就是这一门。
  -- 以下为 rev156 历史模拟依据，不能当成本次修正加载后的新实战结论。
  -- **八重、且当时意图是战斗中性**：原版 War_AutoSelectWugong 的权重是 (攻击力×3＋该重威力)/2，
  -- 并把权重低于「最高权重的一半」的招**整门清零**。按 rev156 运行时值：他攻击力 99，
  -- 蛤蟆功十重权重 526.0 ⇒ 门槛 263.00；灵蛇拳八重权重 (99×3+155)/2 = 226.0 < 263.00 ⇒ 被清零。
  -- 攻击力全周目上界 floor(99×1.2)=118 仍 < 十重临界 126，所以**任何周目都不会过线**。
  -- 也就是说这一条是**图鉴与归属纠正，不是战力改动**；实测 war133 四档面板×三档重数全部 0pp、
  -- war128 三档逐位相同。落地记录按平衡组要求写成条件句：**它不生效是因为权重在门槛之下**，
  -- 而不是「测出来是零」——谁日后调高了他的攻击力或这门的威力，这句话就不再成立。
  [60]={art=4,level=700,slot1=22,lv1=900},
 }

 local applied=false

 local function pristine(p,slot1,lv1)
  if p['武功1']~=slot1 or p['武功等级1']~=lv1 then return false end
  for i=2,10 do if p['武功'..i]~=0 then return false end end
  return true
 end

 local function seed()
  applied=false
  for pid,row in pairs(SEED) do
   local p=JY.Person[pid]
   if p and pristine(p,row.slot1,row.lv1) and (not row.root or p['特殊兵器']==row.wasRoot) then
    p['武功2']=row.art;p['武功等级2']=row.level;applied=true
    if row.root then p['特殊兵器']=row.root end
   end
  end
 end

 -- 只在新局播种。本层排在 GROWTH 之后加载 ⇒ 本包裹在外层 ⇒ 先跑完好感层自己的模板播种，
 -- 再轮到这里；两边动的人不重叠（好感层动的是 13 谢逊、36 林平之、46 丁春秋、58 杨过）。
 local sourceNewGame=NewGame
 NewGame=function(...)
  local result=table.pack(sourceNewGame(...))
  seed()
  return table.unpack(result,1,result.n)
 end

 -- 只读查询，供测试与界面核对；加载期赋值，不违反严格全局。
 BrowserSignatureArts=function()
  local out={}
  for pid,row in pairs(SEED) do
   local p=JY.Person[pid]
   out[tostring(pid)]={art=row.art,level=row.level,
    present=p~=nil and p['武功2']==row.art or false}
  end
  out.applied=applied
  return out
 end
end)()
