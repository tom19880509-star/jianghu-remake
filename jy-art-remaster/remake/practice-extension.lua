-- Installed after ordinary growth; classic and isolated trial saves pass through.
do
 local makePractice=(function()
-- PRACTICE_CORE
 end)()
 local currentApi,practice
 local function use(pid)
  if not active(pid) or not BrowserMartialBalance or not BrowserMartialBalance.enabled then return nil end
  if currentApi~=api then
   currentApi=api;practice=makePractice{JY=JY,CC=CC,api=api,growth=growth,balance=BrowserMartialBalance,owned=owned,canLearn=canUse}
  end
  return practice
 end
 local function benefits(pid,id)
  local P=use(pid);local b=P and P.benefits(pid,id);if not b then return nil end
  local r=b.rank;local effects={};local cfg=BrowserGrowthBattleConfig(pid)
  local function add(s)effects[#effects+1]=s end
  if r>0 then
   if id==39 then add('第三次攻击起，招式威力 +'..string.format('%.1f',r*.8)..'%；与九阴取较强值')
   elseif id==40 then add('内性调和，可兼修阴阳');add('外功每段基耗 -'..math.floor(r/5)..'，本门减至最低2点；原本不超过2点的不变');add('太极拳还可继续获得九阳相辅减耗')
   elseif id==41 then add(api.luohanInner(pid) and (r>=5 and '已调和阴阳' or '修至五重后调和阴阳') or '基础吐纳，当前不调和阴阳')
   elseif id==42 then add('武功造成的伤势减少 '..(r*3)..'%（不等同气血减伤）')
   elseif id==43 then add('当前护体减伤 '..string.format('%.1f',(cfg and cfg.yijinGuard or 0)*100)..'%');add('调息化解异气的条件见武学页')
   elseif id==44 then add('武功附毒量减少 '..(r*3)..'%；与九阳取较强值')
   elseif id==92 then local p=BrowserMartialBalance.data.books[id];add('受敌方武功时护体防御 +'..(p.guard[r] or 0))
   elseif id==93 then add('轻功根基 '..math.floor(r*.8)..'；与轻功秘籍取高，不叠加')
   elseif id==94 then add('外功威力 +'..string.format('%.1f',r*.8)..'%；与紫霞取较强值')
   elseif id==95 then
    -- Read the same live passive values as combat; do not duplicate its balance constants.
    local passive=BrowserJiuyang and BrowserJiuyang(pid)
    if passive then
     add('各门武功威力 +'..string.format('%.1f',(passive.power or 0)*100)..'%')
     add('受敌方武功时防御 +'..(passive.defence or 0)..' · 临敌抗毒 +'..(passive.resist or 0))
    end
    add('武功附毒量减少 '..(r*4)..'%；与洗髓取较强值');if cfg and cfg.taiChiReduction>0 then add('太极拳每击耗内 '..cfg.taiChiNormalCost..' → '..cfg.taiChiCost)end
   elseif id==63 or id==64 then
    add('主动吸内至多 '..(12+r*7)..'点，还受敌方余内与内力上限限制')
    add(id==63 and '北冥回补实际吸取量的80%，不增加内力上限' or '吸星通常回补实际吸取量的50%；异气累积会降低回补并造成伤势')
   end
  end
  b.currentEffects=effects;return b
 end
 local function state(pid)
  local P=use(pid);if not P then return nil end
  P.sync(pid);local r=P.ensure(pid)
  local heart=P.info(pid,r.heart);heart.benefits=benefits(pid,r.heart)
  return {martial=P.info(pid,r.martial),heart=heart,points=JY.Person[pid]['修炼点数'],notice=P.notices[pid]}
 end
 BrowserPracticePerson=state
 local priorConfig=BrowserGrowthBattleConfig
 BrowserGrowthBattleConfig=function(pid)
  local P=use(pid);if P and team(pid) and not api.ensure(pid).practice then P.sync(pid)end
  return priorConfig(pid)
 end
 local priorPerson=BrowserGrowthPerson
 BrowserGrowthPerson=function(pid)
  local s=state(pid);local info=priorPerson(pid)
  if info and s then info.practice=s;info.studyPreview='';info.effect='具有内力根基的已练内功共同积累内力：各门足额相加，内力上限仍按人物上限封顶。北冥、吸星保留主动吸内，当前不额外增加内力上限。护体、调和等已练成的能力持续生效；同类效果取较强者。修炼栏只决定本次研习，不关闭其他本领。同源相济：同门武学或心法已修至五级以上，每门使同源新法加速12%（修满16%）；同源最高境界高出三级以上再加20%，合计上限由该类兵器根基与资质决定（至少20%）。武功栏见效快，招式威力当场可用；心法栏积累慢，内力与同源加速长期共享，秘籍转交也不失。双修则心得对半分入两栏。'
   local cfg=BrowserGrowthBattleConfig(pid);info.huEffect=(cfg.huRank or 0)>=8 and ((cfg.huRank-7)*2+4) or 0
   for _,row in ipairs(info.learned)do if row.book then row.benefits=benefits(pid,row.book)end end
  end
  return info
 end
 local function select(pid,kind)
  local P=use(pid);if not P then return end
  local r=P.ensure(pid);local rows={{id='none',name='暂不修炼',eligible=true,tags='保留已学境界和进度；另一门可修炼时，心得集中投入另一门'}};local allowed={}
  local seen={}
  local function add(id,physical)
   if not P.valid(id) or P.kind(id)~=kind then return end
   local key=(physical and 'manual:' or 'memory:')..id;if seen[key]then return end;seen[key]=true
   local info=P.info(pid,id);local reason=P.reason(pid,id,physical)
   local owner=id>0 and JY.Thing[id]['使用人'] or -1
   local name=info.name;local shownRank=info.rank
   if id==41 and physical and growth.luohan and growth.luohan.revealed then name='罗汉伏魔神功';if not api.luohanInner(pid)then shownRank=0 end end
   local requirements={}
   if reason~='' and id>0 and BrowserStudyRequirements then requirements=BrowserStudyRequirements(pid,id) end
   requirements[#requirements+1]={text=reason~='' and reason or (physical and '已满足研习条件；可参照秘籍修炼，选定不会立即学成' or '已经学会，可凭记忆继续研习'),met=reason==''}
   rows[#rows+1]={id=key,artId=id>0 and id or 0,book=info.book,skill=info.skill,name=name,tags=(physical and '携带秘籍 · 修炼+50%' or '凭记忆修炼')..' · '..shownRank..'/'..info.maxRank..info.rankUnit..((info.crossTrain or 0)>0 and ' · 触类旁通+'..info.crossTrain..'%' or ''),description='学习所得留在本人身上。转交秘籍仅改变参照加速，不移交境界或进度。',owner=physical and owner>=0 and owner~=pid and JY.Person[owner]['姓名'] or '',requirements=requirements,eligible=reason=='',current=r[kind]==id and (physical==P.held(pid,id)),benefits=benefits(pid,id),practice=true}
   allowed[key]={id=id,physical=physical}
  end
  local p=JY.Person[pid]
  for i=1,10 do if p['武功'..i]>0 then add(P.bookFor(p['武功'..i]),false) end end
  for id in pairs(api.ensure(pid).learnedBooks)do add(tonumber(id),false) end
  for i=1,CC.MyThingNum do local id=JY.Base['物品'..i];if id>=0 and JY.Base['物品数量'..i]>0 then add(id,true) end end
  local choice=coroutine.yield('party-items',{person=BrowserPartyPerson(pid),action='book',practiceKind=kind,items=rows})
  if choice=='none' then P.choose(pid,0,false,kind);persist();return end
  local target=allowed[choice];if not target then return end
  local id=target.id
  if target.physical then
   local owner=JY.Thing[id]['使用人']
   if owner>=0 and owner~=pid and not confirm('将秘籍交给'..p['姓名']..'参照？'..JY.Person[owner]['姓名']..'已学的本领与修炼进度保留，仍可凭记忆修炼。')then return end
   if CC.Shemale and CC.Shemale[id]==1 and p['性别']==0 and P.rank(pid,id)==0 then
    -- 157：Tom 裁定「自宫总得付出点代价」，代价要让玩家在挥刀之前看见。跨层探测，darkpath 未合并时 warn 为空串、逐字退化成原文。
    local hint=rawget(_G,'BrowserDarkPathWarning');local warn=type(hint)=='function' and hint(pid) or ''
    if not confirm('此法须先自宫，是否仍要修炼？'..warn)then return end
    p['性别']=2
    local told=rawget(_G,'BrowserDarkPathGelded');if type(told)=='function' then told(pid) end
   end
  end
  if P.choose(pid,id,target.physical,kind) then persist() end
 end
 local priorAction=BrowserGrowthAction
 BrowserGrowthAction=function(pid,action)
  local P=use(pid)
  if P and (action=='practice-martial' or action=='practice-heart' or action=='practice-train' or action=='growth-signature' or action=='growth-internal' or action=='normal-study') then
   if (JY.Status~=GAME_MMAP and JY.Status~=GAME_SMAP) or not team(pid)then return true end
   if action=='practice-train' or action=='normal-study' then
    local n,l=P.train(pid);persist();DrawStrBoxWaitKey((n>0 or l>0) and '研习耗用'..n..'点心得，进度分别留存。'..(l>0 and '共精进'..l..'次。' or '') or '尚无可投入的心得，或所选法门暂不能精进。')
   else select(pid,(action=='practice-heart' or action=='growth-internal') and 'heart' or 'martial') end
   return true
  end
  return priorAction(pid,action)
 end
 local priorTrain=War_PersonTrainBook
 War_PersonTrainBook=function(pid)
  local P=use(pid);if not P then return priorTrain(pid) end
  if not team(pid)then return end
  local n,l=P.train(pid);if n>0 or l>0 then persist();if l>0 then DrawStrBoxWaitKey(JY.Person[pid]['姓名']..'武学有所精进。')end end
  -- Medicine crafting remains a separate source mechanic.
  local book=JY.Person[pid]['修炼物品'];if book>=0 and api.craft(book) then return priorTrain(pid) end
 end
 local priorUse=UseThing_Type2
 UseThing_Type2=function(id)
  if not api or not practice and not use(0) or not api.validBook(id) or api.craft(id)then return priorUse(id)end
  local n=SelectTeamMenu(CC.MainSubMenuX,CC.MainSubMenuY);local pid=n>0 and JY.Base['队伍'..n] or -1
  if pid<0 then return 0 end
  local P=use(pid);local reason=P.reason(pid,id,true)
  if reason~='' then DrawStrBoxWaitKey(reason);return 0 end
  local owner=JY.Thing[id]['使用人']
  if owner>=0 and owner~=pid and not confirm('转交秘籍？原持有者已学武学与进度保留，仍可凭记忆修炼。')then return 0 end
  if CC.Shemale and CC.Shemale[id]==1 and JY.Person[pid]['性别']==0 and P.rank(pid,id)==0 then
   local hint=rawget(_G,'BrowserDarkPathWarning');local warn=type(hint)=='function' and hint(pid) or ''
   if not confirm('此法须先自宫，是否仍要修炼？'..warn)then return 0 end;JY.Person[pid]['性别']=2
   local told=rawget(_G,'BrowserDarkPathGelded');if type(told)=='function' then told(pid) end
  end
  if P.choose(pid,id,true,P.kind(id))then persist();return 1 end;return 0
 end
 local priorDetails=BrowserItemDetails
 BrowserItemDetails=function(id)
  local t=priorDetails(id);local P=use(0)
  if P and P.valid(id) and P.kind(id)=='heart' then
   local profile=BrowserMartialBalance.data.books[id];if id==41 and growth.luohan and growth.luohan.revealed then profile=profile.inner end
   t.growthDescription='练成后的内力与已达境界的特殊能力持续保留，心法栏只决定重点修炼。各门练成的内力增益足额相加，达到人物上限后不再增加；同类特殊效果取较强值。'..(profile and profile.effect or '')
   if id==63 or id==64 then t.growthDescription='此法在内功栏修炼，战斗中仍可主动运功吸内；境界只保存在原有招式中，不额外占一门，也不因换栏增加内力上限。' end
   if id==41 then t.growthDescription=t.growthDescription..'泥偶永久根基仅归实物修满并拂泥的首位修炼者；凭记忆修满不会获得永久奖励。' end
  end
  return t
 end
 local priorLoad=LoadRecord
 LoadRecord=function(id)
  local out=table.pack(priorLoad(id))
  if api then for key in pairs(growth.persons)do local pid=tonumber(key);local P=use(pid);if P then P.sync(pid)end end end
  return table.unpack(out,1,out.n)
 end
 -- Native departure knows only one study item; return both physical manuals.
 -- Keep the person's chosen arts and unfinished progress for memory practice.
 local priorLeave=instruct_21
 instruct_21=function(pid,...)
  local P=team(pid) and use(pid)
  local result=table.pack(priorLeave(pid,...))
  if P and not team(pid) then
   for book=39,198 do if P.valid(book) and P.held(pid,book) then JY.Thing[book]['使用人']=-1 end end
   P.sync(pid);persist()
  end
  return table.unpack(result,1,result.n)
 end
 local priorDisperse=BrowserGrowthDisperse
 BrowserGrowthDisperse=function(pid,identity)
  local P=use(pid)
  local ok,info=priorDisperse(pid,identity)
  if ok and P then
   local r=P.ensure(pid);local selected=info.skills[1]
   for _,book in ipairs(selected.books) do
    if P.held(pid,book) then JY.Thing[book]['使用人']=-1 end
    r.progress[tostring(book)]=nil
    if book==41 then r.progress['outer:41']=nil end
    if r.martial==book then r.martial=0 end
    if r.heart==book then r.heart=0 end
   end
   if selected.skill then
    r.progress[tostring(-selected.skill)]=nil
    if r.martial==-selected.skill then r.martial=0 end
   end
   P.sync(pid);persist()
  end
  return ok,info
 end
end
