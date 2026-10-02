-- Per-person new-campaign cultivation core. Installed only for explicit growth
-- records; no sample resources, UI, or original scripts are created here.
return function(env)
 local JY,CC,growth=env.JY,env.CC,env.growth
 local balance=env.balance
 local nonAttack={[39]=true,[40]=true,[41]=true,[42]=true,[43]=true,[44]=true,[45]=true,[46]=true,[47]=true,[88]=true,[89]=true,[90]=true,[91]=true,[92]=true,[93]=true,[94]=true,[95]=true}
 local fields={mp='内力最大值',agility='轻功',fist='拳掌功夫',sword='御剑能力',blade='耍刀技巧',special='特殊兵器',throw='暗器技巧'}
 local rootKinds={[1]='fist',[2]='sword',[3]='blade',[4]='special'}
 -- Only verified later source transmissions reserve a place. Already-held
 -- identities consume their normal place; an upgrade never reserves a second.
 local inheritances={[35]={'skill:61'},[38]={'skill:23'},[49]={'skill:15'},[53]={'skill:29','book:47'},[58]={'skill:24'}}
 local api={}
 function api.qi(pid)
  local m=api.ensure(pid);if not m then return nil end
  -- Absence in an old save proves no foreign qi: never infer it from injuries
  -- or from the number of learned arts.
  if not m.qi then m.qi={foreign=0,paid=0,guided=false,healed=false,entrusted=false,wounded=false,insight=false} end
  return m.qi
 end
 function api.qiTreatment(pid)
  local q=api.qi(pid);local m=api.ensure(pid);local r=api.rank(pid,43)
  local floor=r>=8 and q.guided and 0 or r>=5 and 10 or 30
  local amount=math.max(0,math.min(q.foreign-floor,r>=8 and 30 or r>=5 and 15 or 8))
  local cost=math.max(70,math.ceil(100*(1.7-(m.aptitude or JY.Person[pid]['资质'])/100)))
  local reason=''
  if JY.Person[pid]['生命']<=0 then reason='先休整恢复气血'
  elseif q.foreign==0 then reason='气息无碍，无须额外调息'
  elseif r==0 then reason='尚未学会易筋经，可寻少林经义线索'
  elseif not m.practice and m.internal~=43 then reason='须先主运易筋经'
  elseif amount==0 then reason=r<5 and '须易筋五重，方能进一步梳理异气' or r<8 and '须易筋八重，方能化解余下郁气' or '尚需请教少林扫地老僧的运气法门'
  elseif JY.Person[pid]['修炼点数']<cost then reason='还需'..(cost-JY.Person[pid]['修炼点数'])..'点心得' end
  return {foreign=q.foreign,amount=amount,cost=cost,reason=reason,rank=r,guided=q.guided,healed=q.healed,insight=q.insight,entrusted=q.entrusted,wounded=q.wounded}
 end
 function api.relieveQi(pid)
  local q=api.qi(pid);local m=api.ensure(pid);local r=api.rank(pid,43)
  if r==0 or not m.practice and m.internal~=43 or JY.Person[pid]['生命']<=0 then return 0 end
  local floor=r>=8 and q.guided and 0 or r>=5 and 10 or 30
  local amount=math.max(0,math.min(q.foreign-floor,r>=8 and 30 or r>=5 and 15 or 8))
  q.foreign=q.foreign-amount
  if amount>0 and q.foreign==0 then q.healed=true end
  return amount
 end
 function api.treatQi(pid)
  local info=api.qiTreatment(pid);if info.reason~='' then return false,info end
  local amount=api.relieveQi(pid);if amount<=0 then return false,info end
  JY.Person[pid]['修炼点数']=JY.Person[pid]['修炼点数']-info.cost
  local q=api.qi(pid);q.paid=math.min(100000000,q.paid+info.cost)
  return true,amount,info.cost
 end
 function api.prepareLuohan(legacyRevealed)
  if not balance then return nil end
  if not growth.luohan then
   local unknown=legacyRevealed==true
   for _,m in pairs(growth.persons)do if (m.learnedBooks['41'] or 0)>=10 then unknown=true end end
   -- Old saves never recorded the order of completion. Keep their actual
   -- cultivation, but do not invent a recipient of the unique permanent boon.
   growth.luohan={version=1,first=-1,revealed=legacyRevealed==true,legacy=unknown}
  end
  return growth.luohan
 end
 function api.luohanPerson(pid)
  local m=api.ensure(pid)
  if not m.luohan then m.luohan={layer='outer',base=0,basePaid=0,credit=0} end
  return m.luohan
 end
 function api.luohanInner(pid)
  local m=api.ensure(pid);return m and m.luohan and m.luohan.layer=='inner' or false
 end
 function api.luohanTransition(pid)
  local m=api.ensure(pid)
  return balance~=nil and growth.luohan and growth.luohan.revealed and not api.luohanInner(pid) and not (m.practice and m.practice.outer)
 end
 function api.studyRank(pid,book)
  return book==41 and api.luohanTransition(pid) and 0 or api.rank(pid,book)
 end
 function api.bookProfile(pid,book,study)
  local profile=balance and balance.data.books[book]
  if book==41 and profile and (api.luohanInner(pid) or study and api.luohanTransition(pid)) then return profile.inner end
  return profile
 end
 function api.bookName(pid,book,study)
  if book==41 and balance then
   return (api.luohanInner(pid) or study and api.luohanTransition(pid)) and '罗汉伏魔神功' or '泥偶基础内功'
  end
  return book>0 and JY.Thing[book]['名称'] or '未主运'
 end
 function api.studyCredit(pid,book)
  if book~=41 or not balance then return 0 end
  local m=api.ensure(pid);local l=m.luohan
  local partial=m.practice and m.practice.progress['outer:41']
  return (l and l.credit or 0)+(api.luohanTransition(pid) and ((m.paid['41'] or 0)+(partial and partial.paid or 0)) or 0)
 end
 function api.luohanReveal(pid)
  local state=api.prepareLuohan(false);local m=api.ensure(pid)
  if not state or state.revealed or api.luohanInner(pid) or api.rank(pid,41)<10 then return false end
  if state.first~=pid and not (state.legacy and state.first==-1) then return false end
  state.revealed=true
  if state.first==pid then
   local l=api.luohanPerson(pid);l.base=40;l.basePaid=m.paid['41'] or 0
   m.learnedBooks['41']=nil;m.paid['41']=nil
   if m.practice and m.practice.heart==41 then m.practice.heart=0 end
   if m.practice then m.practice.progress['outer:41']=nil end
   if m.internal==41 then m.internal=0 end
   if JY.Person[pid]['修炼物品']==41 then JY.Person[pid]['修炼物品']=-1 end
   if JY.Thing[41]['使用人']==pid then JY.Thing[41]['使用人']=-1 end
   api.apply(pid)
  end
  return true,state.first==pid
 end
 local function validBook(book) return book>=39 and book<=95 or book==198 and JY.Thing[book] and JY.Thing[book]['练出武功']==21 end
 local function craft(book) return book>=48 and book<=53 end
 local function slot(pid,skill)
  if not skill or skill<=0 then return nil end
  for i=1,10 do if JY.Person[pid]['武功'..i]==skill then return i end end
 end
 local function attackRank(pid,skill)
  local i=slot(pid,skill);local rank=i and math.min(10,math.floor(JY.Person[pid]['武功等级'..i]/100)+1) or 0
  local m=growth.persons[tostring(pid)]
  return balance and rank==10 and skill==18 and m and m.extraRanks and m.extraRanks['18'] or rank
 end
 -- Real source Jiuyang: an existing attack form 92 with no cultivation history is
 -- recognised as manual 95 at the rank its actual level already proves. Nothing is
 -- paid, no internal art is chosen, and any prior 95/92 history (learned, taught,
 -- paid or relearned) means the record is already settled, so a forgotten art
 -- never comes back through ensure.
 local function adoptJiuyang(pid,m)
  if m.learnedBooks['95'] or m.taught['book:95'] or m.paid['95'] or m.relearnPaid['92'] then return false end
  if not slot(pid,92) then return false end
  m.learnedBooks['95']=attackRank(pid,92);m.taught['book:95']=true;m.taught['skill:92']=true
  return true
 end
 function api.ensure(pid)
  if not growth or not JY.Person[pid] then return nil end
  local key=tostring(pid);local m=growth.persons[key]
  if not m then
   local p=JY.Person[pid];m={signature=0,internal=0,roots={},inherent={},nature=p['内力性质'] or 0,learnedBooks={},paid={},taught={},relearnPaid={}}
   if balance then m.aptitude=p['资质'];m.entryRanks={} end
   for k,f in pairs(fields) do m.roots[k]=p[f];m.inherent[k]=0 end
   -- This is a real source ability, unlike guessing an internal rank from MP.
   if p['左右互搏']==1 then m.learnedBooks['91']=1;m.taught['book:91']=true end
   for i=1,10 do local skill=p['武功'..i];if skill>0 then m.taught['skill:'..skill]=true end end
   growth.persons[key]=m
   -- Preserve the source character exactly on first adoption; future changes
   -- are relative to this native foundation, including lost learned ranks.
   local initial=api.rootBonuses(pid);for k in pairs(fields) do m.inherent[k]=initial[k] end
  end
  if balance then
   m.aptitude=m.aptitude or JY.Person[pid]['资质'];m.entryRanks=m.entryRanks or {}
   -- Only former ranks beyond the novel's ceiling merge into layer seven.
   -- Keep literal paid history, so save/load cannot mint a second refund.
   if m.learnedBooks['92'] and m.learnedBooks['92']>7 then m.learnedBooks['92']=7 end
  end
  adoptJiuyang(pid,m)
  return m
 end
 function api.identities(pid)
  local ids,count={},0;local m=api.ensure(pid);if not m then return ids,count end
  for i=1,10 do local skill=JY.Person[pid]['武功'..i];if skill>0 then ids['skill:'..skill]=true end end
  for key,rank in pairs(m.learnedBooks) do if rank>0 then ids[key=='95' and 'skill:92' or 'book:'..key]=true end end
  for _ in pairs(ids) do count=count+1 end;return ids,count
 end
 function api.reservations(pid)
  local ids=api.identities(pid);local rows={}
  for _,id in ipairs(inheritances[pid] or {}) do
   if not ids[id] then
    local skill=tonumber(id:match('^skill:(%d+)$'));local book=tonumber(id:match('^book:(%d+)$'))
    rows[#rows+1]={id=id,name=skill and JY.Wugong[skill]['名称'] or JY.Thing[book]['名称']}
   end
  end
  return rows
 end
 function api.learningReason(pid,id)
  local ids,count=api.identities(pid)
  if ids[id] then return '' end
  if count>=10 then return '已学十门，不能再学新功；原有武学与待领传承保留' end
  local reserved=api.reservations(pid);local names={}
  for _,r in ipairs(reserved) do if r.id==id then return '' end;names[#names+1]=r.name end
  if count+#reserved>=10 then return '其余名额已为本命传承预留：'..table.concat(names,'、')..'；仍最多十门' end
  return ''
 end
 function api.canLearnSkill(pid,skill)
  return api.learningReason(pid,'skill:'..skill)==''
 end
 function api.rank(pid,book)
  local m=api.ensure(pid);if not m or not validBook(book) then return 0 end
  if nonAttack[book] then return m.learnedBooks[tostring(book)] or 0 end
  return attackRank(pid,JY.Thing[book]['练出武功'])
 end
 function api.maxRank(book)
  local profile=balance and balance.data.books[book]
  return profile and profile.maxRank or (book==91 and 1 or 10)
 end
 function api.rankUnit(book)
  local profile=balance and balance.data.books[book]
  return profile and profile.rankUnit or '级'
 end
 -- 155 affinity teaching (editorial/好感度系统v1_155.md). Only the hero receives
 -- companion teachings; the record lives in growth.affinity for this cycle.
 -- slots[identity]: the art occupies one of the three affinity places.
 -- caps[identity]: "一招半式" ceiling = min(rank, max(teacher rank then, teacher
 -- rank now)). It is bound to the hero's own record of the art, so studying with
 -- a manual, relearning after dispersal, battle practice or another teacher never
 -- lifts it; only a future complete-inheritance story may clear caps[identity].
 function api.affinityGranted(pid,identity)
  local a=pid==0 and growth.affinity
  return a and a.slots and identity and a.slots[identity]==true or false
 end
 function api.affinityCap(pid,identity)
  local a=pid==0 and growth.affinity;local c=a and a.caps and identity and a.caps[identity]
  if type(c)~='table' then return nil end
  local skill=tonumber(string.match(identity,'^skill:(%d+)$'))
  local now=skill and JY.Person[c.teacher] and attackRank(c.teacher,skill) or 0
  return math.max(1,math.min(c.rank,math.max(c.from or 1,now)))
 end
 function api.requirements(pid,book)
  local rows={};local p=JY.Person[pid];local m=api.ensure(pid)
  local function add(key,text,met) rows[#rows+1]={key=key,text=text,met=met} end
  if not m or not validBook(book) then add('book','此物不能研习',false);return rows end
  add('health','气血大于0（当前 '..p['生命']..'）',p['生命']>0)
  if craft(book) then return rows end
  if book==91 then
   local qualified=pid==55 or pid==59 or pid==64 or pid==0 and (balance and m.aptitude or p['资质'])<=45
   add('dual',pid==0 and '左右互搏心性：初始资质不高于45（初始 '..(balance and m.aptitude or p['资质'])..'）' or '左右互搏：须郭靖、小龙女、周伯通等心性适合之人',qualified)
  end
  local skill=JY.Thing[book]['练出武功'];local id=book==95 and 'skill:92' or skill>0 and 'skill:'..skill or 'book:'..book
  -- A signature inheritance is a game access rule, never a claim of biological
  -- exclusivity. Preserve earlier saves that already learned the same art.
  -- 155: a hero taught by Yang Guo through affinity keeps that qualification.
  if balance and (book==61 or book==77) then
   local granted=api.affinityGranted(pid,id)
   add('inheritance',granted and '本版传承：杨过亲授（好感传授）' or '本版传承：杨过；此前已学者可继续精修',pid==58 or api.rank(pid,book)>0 or granted)
  end
  local reason=api.learningReason(pid,id)
  add('slots',reason~='' and reason or '十门武学名额：可继续研习；本命传承仍预留',reason=='')
  local rank=api.studyRank(pid,book);local cap=api.maxRank(book)
  local limit=api.affinityCap(pid,id)
  if limit then add('affinity','一招半式：至多修至'..limit..api.rankUnit(book)..'（当前 '..rank..'），完整传承须日后机缘',rank<limit) end
  add('rank','当前 '..rank..' / '..cap..api.rankUnit(book)..(rank>=cap and '，已修至上限' or '，尚可精进'),rank<cap)
  return rows
 end
 function api.reason(pid,book)
  for _,row in ipairs(api.requirements(pid,book)) do if not row.met then return row.text end end
  return ''
 end
 local function entryCost(pid,base,skill,book)
  local cost=base*math.max(1,7-math.floor(JY.Person[pid]['资质']/15))
  -- 156：散功重学与无谱入门也走统一入门心得；有书号就先按书上的定额算。
  if balance then
   local profile=book and balance.data.books[book] or balance.data.skills[skill] or {baseCost=base,curve='steady'}
   cost=balance.cost(profile.entryCost and {baseCost=profile.entryCost,curve='steady'} or profile,JY.Person[pid]['资质'],1)
  end
  -- An introductory sword form should be usable after its first earned manual.
  -- Refinement still pays the full aptitude/rank cost; relearning pays this too.
  return skill==89 and math.min(cost,20) or cost
 end
 function api.fullCost(pid,book)
  if api.reason(pid,book)~='' then return math.huge end
  if balance and balance.data.books[book] and not craft(book) then
   local profile=api.bookProfile(pid,book,true)
   -- 156 统一入门心得：零级入门改用调整表的定额，资质系数照旧（借 balance.cost 的 steady[1]=1，不另写公式）；
   -- 一重之后一格不改，仍是 baseCost × 资质系数 × costSteps，也不重算历史支出（115 已定）。
   local entry=api.studyRank(pid,book)==0 and profile.entryCost
    and balance.cost({baseCost=profile.entryCost,curve='steady'},JY.Person[pid]['资质'],1)
   if book==67 and api.rank(pid,book)==0 then return math.min(20,entry or 20) end
   if entry then return entry end
   return balance.cost(profile,JY.Person[pid]['资质'],api.studyRank(pid,book)+1)
  end
  local t=JY.Thing[book];local factor=math.max(1,7-math.floor(JY.Person[pid]['资质']/15))
  if t['需经验']<=0 then return math.huge end
  if not craft(book) and api.rank(pid,book)==0 then return entryCost(pid,t['需经验'],t['练出武功'],book) end
  return factor*t['需经验']*(craft(book) and 2 or math.max(1,api.rank(pid,book)))
 end
 function api.cost(pid,book) return math.max(0,api.fullCost(pid,book)-api.studyCredit(pid,book)) end
 function api.rootBonuses(pid,withoutBook)
  local m=api.ensure(pid);local b={fist=0,sword=0,blade=0,special=0,throw=0,agility=0,mp=0};if not m then return b end
  for i=1,10 do
   local skill=JY.Person[pid]['武功'..i];local w=skill>0 and JY.Wugong[skill] or nil;local key=w and rootKinds[w['武功类型']]
   if key then b[key]=math.max(b[key],math.max(0,math.min(10,attackRank(pid,skill))-1)*4) end
  end
  -- Only the strongest attained footwork / hidden-weapon foundation applies.
  for _,book in ipairs({45,46,47}) do b.agility=math.max(b.agility,api.rank(pid,book)*JY.Thing[book]['加轻功']) end
  for _,book in ipairs({88,89,90}) do b.throw=math.max(b.throw,api.rank(pid,book)*JY.Thing[book]['加暗器技巧']) end
  if balance then
   b.agility=0;b.throw=0
   for _,book in ipairs({45,46,47})do local r=api.rank(pid,book);if r>0 then b.agility=math.max(b.agility,balance.data.books[book].agility[r])end end
   for _,book in ipairs({88,89,90})do local r=api.rank(pid,book);if r>0 then b.throw=math.max(b.throw,balance.data.books[book].throw[r])end end
  end
  -- 157（Tom 2026-09-23「龙象般若功也该同时增加内力，不然消耗太大」）：59 龍象般若功是内外兼修的佛门神功，
  -- books[59] 已给 mp 曲线（十三层 160，与紫霞／小无相同档、低于易筋经与九阳真经的 200）。
  -- **这张键表是那条被遍历的表**，不把 59 列进来，上面那条裁定等于没做（实测 rootBonuses().mp＝0）。
  local mpPerRank={[39]=10,[40]=15,[41]=15,[42]=15,[43]=12,[44]=15,[59]=12,[92]=0,[93]=15,[94]=15,[95]=15}
  b.mp=(mpPerRank[m.internal] or 0)*api.rank(pid,m.internal)
  if balance then
   local profile=api.bookProfile(pid,m.internal);local rank=api.rank(pid,m.internal)
   if profile and rank>0 then b.mp=profile.mp[rank] or 0 end
   if m.internal==93 then b.agility=math.max(b.agility,math.floor(rank*.8))end
  end
  if balance and m.practice then
   local sum,strongest=0,0
   for book in pairs(mpPerRank)do
    local profile=api.bookProfile(pid,book);local rank=api.rank(pid,book)
    local contribution=book~=withoutBook and profile and rank>0 and (profile.mp[rank] or 0) or 0
    sum=sum+contribution;strongest=math.max(strongest,contribution)
   end
   -- 157（Tom 2026-09-22 裁定）：「多门内功不取较强值，可以叠加，只是内力有最大上限……
   -- 不然玩家费劲练一门内功只有一半收益，挫折太大。」⇒ 各门足额相加，**不再是「最强全额＋其余各半」**。
   -- 封顶不在这里：api.apply 一律按 CC.PersonAttribMax['内力最大值']（999）夹，所以上限本来就守着。
   b.mp=sum
   b.agility=math.max(b.agility,math.floor(api.rank(pid,93)*.8))
  end
  b.mp=b.mp+(m.luohan and m.luohan.base or 0)
  for k in pairs(fields) do b[k]=b[k]-(m.inherent[k] or 0) end
  return b
 end
 function api.apply(pid)
  local m=api.ensure(pid);if not m then return end
  local p=JY.Person[pid];local b=api.rootBonuses(pid)
  for k,f in pairs(fields) do p[f]=math.max(0,math.min(CC.PersonAttribMax[f],m.roots[k]+b[k])) end
  p['内力']=math.min(p['内力'],p['内力最大值'])
  p['左右互搏']=m.learnedBooks['91'] and 1 or 0
  local harmonized=m.practice and (api.rank(pid,40)>0 or api.luohanInner(pid) and api.rank(pid,41)>=5)
  p['内力性质']=harmonized and 2 or (m.internal==40 or m.internal==41 and (not balance or api.luohanInner(pid) and api.rank(pid,41)>=5)) and 2 or m.nature
 end
 -- The caller must verify event 484's completed scene record. Register the
 -- actual introductory transmission, never infer six ranks from +30 agility.
 -- Absorb only the new derived bonus so source rewards are not added twice.
 function api.adoptLingbo(pid)
  if pid~=53 or not slot(pid,29) then return false end
  local m=api.ensure(pid);if not m or m.learnedBooks['47'] or m.taught['book:47'] or m.paid['47'] then return false end
  if api.learningReason(pid,'book:47')~='' then return false end
  local before=api.rootBonuses(pid).agility
  m.learnedBooks['47']=1;m.taught['book:47']=true
  m.inherent.agility=(m.inherent.agility or 0)+api.rootBonuses(pid).agility-before
  api.apply(pid);return true
 end
 -- The Wuji seed replaced native Jiuyang (92, raw 50) with Seven Injuries
 -- before growth could adopt it. Recover that proven first rank only after
 -- practice exists, so the native MP is not counted again by the shared pool.
 function api.restoreWujiJiuyang(pid)
  if pid~=9 or not balance then return false end
  local p=JY.Person[pid];local m=growth.persons[tostring(pid)]
  if not p or not m or not m.practice or p['武功1']~=2 or p['武功等级1']~=400
   or p['武功2']~=6 or p['武功等级2']~=400 or p['抗毒能力']~=40 or p['用毒能力']~=30 then return false end
  for i=3,10 do if p['武功'..i]~=0 then return false end end
  if m.learnedBooks['95']~=nil or m.taught['book:95']~=nil or m.taught['skill:92']~=nil
   or m.paid['95']~=nil or m.relearnPaid['92']~=nil or m.practice.progress['95']~=nil then return false end
  local before=api.rootBonuses(pid).mp
  m.learnedBooks['95']=1;m.taught['book:95']=true;m.taught['skill:92']=true
  m.inherent.mp=(m.inherent.mp or 0)+api.rootBonuses(pid).mp-before
  return true
 end
 function api.setSignature(pid,skill)
  local m=api.ensure(pid);if not m or skill~=0 and not slot(pid,skill) then return false end
  m.signature=skill;return true
 end
 function api.setInternal(pid,book)
  local m=api.ensure(pid);local allowed={[39]=true,[40]=true,[41]=true,[42]=true,[43]=true,[44]=true,[92]=true,[93]=true,[94]=true,[95]=true}
  if not m or book~=0 and (not allowed[book] or api.rank(pid,book)<=0) then return false end
  m.internal=book;api.apply(pid);return true
 end
 function api.addBase(pid,field,amount)
  for key,f in pairs(fields) do
   if f==field then
    local m=api.ensure(pid);if not m then return nil end
    local before=JY.Person[pid][f]
    m.roots[key]=math.max(0,math.min(CC.PersonAttribMax[f],m.roots[key]+amount));api.apply(pid)
    return JY.Person[pid][f]-before
   end
  end
  return nil
 end
 function api.entryRank(pid,book)
  if not balance then return 1 end
  local m=api.ensure(pid);local profile=balance.data.books[book]
  if not profile or nonAttack[book] or api.rank(pid,book)>0 or m.taught[api.identity(book)] then return 1 end
  local skill=JY.Thing[book]['练出武功'];local art=balance.data.skills[skill]
  local key=art and rootKinds[JY.Wugong[skill]['武功类型']]
  local apt=JY.Person[pid]['资质'];local base=key and m.roots[key] or 0
  if not key or apt<65 or base<50 then return 1 end
  -- Genuine depth only: subtract previously gifted entry ranks before using
  -- another art as evidence. Do not use equipment or derived root bonuses.
  local depth=0
  for i=1,10 do
   local other=JY.Person[pid]['武功'..i];local w=other>0 and JY.Wugong[other]
   if w and rootKinds[w['武功类型']]==key then
    depth=math.max(depth,attackRank(pid,other)-math.max(0,(m.entryRanks[tostring(other)] or 1)-1))
   end
  end
  if depth<5 then return 1 end
  return math.min(profile.entryMax,apt>=85 and base>=75 and depth>=7 and 3 or 2)
 end
 function api.train(pid,book,practice)
  if book==41 and balance then api.prepareLuohan(false) end
  local m=api.ensure(pid);local p=JY.Person[pid];local cost=api.cost(pid,book)
  if craft(book) or cost==math.huge or p['修炼点数']<cost then return false end
  local full=api.fullCost(pid,book)
  -- The adapter must first check owned manual, holder and original CanUseThing.
  local entry=api.entryRank(pid,book)
  local limit=api.affinityCap(pid,api.identity(book));if limit then entry=math.min(entry,limit) end
  local skill=JY.Thing[book]['练出武功'];local i=slot(pid,skill);local created=false
  if skill>0 and not i then
   for k=1,10 do if p['武功'..k]==0 then i=k;break end end
   if not i then return false end
   p['武功'..i]=skill;p['武功等级'..i]=0;created=true
  end
  if book==41 and balance then
   local credit=api.studyCredit(pid,book);local l=api.luohanPerson(pid)
   if api.luohanTransition(pid) then
    -- Only an explicit successful study changes this person's old basis into
    -- the inner art. All actual outer spending stays tied to this same manual.
    m.learnedBooks['41']=nil;m.paid['41']=nil;l.layer='inner'
    if m.practice then m.practice.progress['outer:41']=nil end
   end
   l.credit=math.max(0,credit-full)
  end
  p['修炼点数']=p['修炼点数']-cost;m.paid[tostring(book)]=(m.paid[tostring(book)] or 0)+full
  if nonAttack[book] then
   m.learnedBooks[tostring(book)]=api.rank(pid,book)+1
   if book==95 then p['武功等级'..i]=math.max(p['武功等级'..i],(m.learnedBooks['95']-1)*100) end
  elseif balance and skill==18 and attackRank(pid,skill)>=10 then
   m.extraRanks=m.extraRanks or {};m.extraRanks['18']=attackRank(pid,skill)+1
  elseif not created then p['武功等级'..i]=math.min(999,p['武功等级'..i]+100)
  elseif entry>1 then p['武功等级'..i]=(entry-1)*100;m.entryRanks[tostring(skill)]=entry end
  api.recordTaught(pid,api.identity(book))
  -- Remember an actual Jiuyang cultivation separately from its attack form.
  if book==95 then api.recordTaught(pid,'book:95') end
  if book==41 and balance and not api.luohanInner(pid) and api.rank(pid,41)==10 and not growth.luohan.legacy and growth.luohan.first==-1 and (not practice or practice.manual) then growth.luohan.first=pid end
  -- Real paid practice can settle some qi, but choosing a book, resting or
  -- levelling another art never does. At rank ten, explicit treatment remains.
  if book==43 then api.relieveQi(pid) end
  api.apply(pid);return true,cost
 end
 function api.identity(book)
  if not validBook(book) or craft(book) then return nil end
  local skill=JY.Thing[book]['练出武功'];return skill>0 and 'skill:'..skill or 'book:'..book
 end
 function api.recordTaught(pid,identity)
  local m=api.ensure(pid);if not m or type(identity)~='string' then return false end
  local skill=tonumber(string.match(identity,'^skill:(%d+)$'))
  local book=tonumber(string.match(identity,'^book:(%d+)$'))
  if not (skill and slot(pid,skill) or book and nonAttack[book] and api.rank(pid,book)>0) then return false end
  m.taught[identity]=true;return true
 end
 function api.relearnReason(pid,skill)
  local m=api.ensure(pid)
  if not m then return '此人物沿用原有成长' end
  if type(skill)~='number' or skill<1 or skill%1~=0 or not JY.Wugong[skill] then return '未知招式不能重学' end
  if not m.taught['skill:'..skill] then return '此人未曾学过此招' end
  if slot(pid,skill) then return '已会此招，可继续精修' end
  if JY.Person[pid]['生命']<=0 then return '先休整恢复气血' end
  local reason=api.learningReason(pid,'skill:'..skill);if reason~='' then return reason end
  return ''
 end
 function api.relearnCost(pid,skill)
  if api.relearnReason(pid,skill)~='' then return math.huge end
  -- Explicit first-pass cost for source arts with no physical manual.
  local base=80;local from=nil
  for book=39,198 do
   if api.identity(book)=='skill:'..skill and JY.Thing[book]['需经验']>0 then base=JY.Thing[book]['需经验'];from=book;break end
  end
  return entryCost(pid,base,skill,from)
 end
 function api.mustPayForGrant(pid,skill)
  local m=api.ensure(pid)
  return m~=nil and m.taught['skill:'..tostring(skill)]==true and not slot(pid,skill)
 end
 function api.relearn(pid,skill)
  local cost=api.relearnCost(pid,skill);local p=JY.Person[pid]
  if cost==math.huge or p['修炼点数']<cost then return false end
  local i;for n=1,10 do if p['武功'..n]==0 then i=n;break end end
  if not i then return false end
  local m=api.ensure(pid);p['武功'..i]=skill;p['武功等级'..i]=0
  p['修炼点数']=p['修炼点数']-cost;m.relearnPaid[tostring(skill)]=(m.relearnPaid[tostring(skill)] or 0)+cost
  -- Attack-only recollection never invents an internal rank, including skill92.
  api.apply(pid);return true,cost
 end
 function api.relearnBook(pid,book)
  local m=api.ensure(pid)
  if not m or not nonAttack[book] or not m.taught['book:'..book] or api.rank(pid,book)>0 then return false end
  if book==41 and api.luohanTransition(pid) then return false end
  -- The runtime adapter must recheck personal learning conditions. Prior real
  -- learning replaces the need to possess a physical manual, not those gates.
  return api.train(pid,book)
 end
 function api.forgetInfo(pid,identity)
  local m=api.ensure(pid);local ids=api.identities(pid);if not m or not ids[identity] then return nil end
  local skill=tonumber(string.match(identity,'^skill:(%d+)$'));local book=tonumber(string.match(identity,'^book:(%d+)$'))
  local rank=skill and attackRank(pid,skill) or api.rank(pid,book);local paid=0;local books={}
  for b=39,198 do
   if api.identity(b)==identity then
    books[#books+1]=b;paid=paid+(m.paid[tostring(b)] or 0)
    if b==95 then rank=math.max(rank,api.rank(pid,95)) end
   end
  end
  if skill then paid=paid+(m.relearnPaid[tostring(skill)] or 0) end
  if book==41 and m.luohan then paid=paid+m.luohan.credit end
  local wanted=book==91 and math.floor(paid*0.7) or rank<=3 and paid or math.floor(paid*0.7)
  return {identity=identity,skill=skill,book=book,rank=rank,paid=paid,books=books,refund=math.min(wanted,math.max(0,32767-JY.Person[pid]['修炼点数']))}
 end
 function api.forget(pid,identity,opts)
  local info=api.forgetInfo(pid,identity);if not info then return false end
  if opts and opts.refund==false then info.refund=0 end
  local m=api.ensure(pid);local p=JY.Person[pid]
  api.recordTaught(pid,identity)
  if info.skill==92 and api.rank(pid,95)>0 then api.recordTaught(pid,'book:95') end
  if info.skill then
   local kept={};for i=1,10 do if p['武功'..i]>0 and p['武功'..i]~=info.skill then kept[#kept+1]={p['武功'..i],p['武功等级'..i]} end end
   for i=1,10 do p['武功'..i]=kept[i] and kept[i][1] or 0;p['武功等级'..i]=kept[i] and kept[i][2] or 0 end
   if m.signature==info.skill then m.signature=0 end
  end
  for _,book in ipairs(info.books) do
   m.learnedBooks[tostring(book)]=nil;m.paid[tostring(book)]=nil
   if m.internal==book then m.internal=0 end
   if p['修炼物品']==book then p['修炼物品']=-1;if JY.Thing[book]['使用人']==pid then JY.Thing[book]['使用人']=-1 end end
  end
  if info.skill then m.relearnPaid[tostring(info.skill)]=nil end
  if info.skill and m.extraRanks then m.extraRanks[tostring(info.skill)]=nil end
  if info.book==41 and m.luohan then m.luohan.credit=0 end
  p['修炼点数']=p['修炼点数']+info.refund;api.apply(pid)
  return true,info
 end
 -- One selected identity, once per cycle through the existing elder quest.
 -- The caller supplies the identity explicitly; no selection never means all.
 function api.dispersalInfo(pid,identity)
  if pid~=0 then return nil end
  local m=api.ensure(pid);if not m then return nil end
  local ids,count=api.identities(pid);if count==0 or identity and not ids[identity] then return nil end
  local skills,paid={},0
  for id in pairs(ids) do if not identity or identity==id then
   local info=api.forgetInfo(pid,id);paid=paid+info.paid
   local profile=balance and (info.skill and balance.data.skills[info.skill] or api.bookProfile(pid,info.book))
   skills[#skills+1]={identity=id,skill=info.skill,book=info.book,books=info.books,rank=info.rank,paid=info.paid,rankUnit=profile and profile.rankUnit or '级',name=info.skill and JY.Wugong[info.skill]['名称'] or api.bookName(pid,info.book)}
  end end
  table.sort(skills,function(x,y)return x.identity<y.identity end)
  local points=JY.Person[pid]['修炼点数']
  return {pid=pid,count=#skills,skills=skills,paid=paid,rate=0,expected=0,refund=0,points=points,after=points}
 end
 function api.disperse(pid,identity)
  if not identity then return false end
  local info=api.dispersalInfo(pid,identity);if not info then return false end
  local ok=api.forget(pid,identity,{refund=false});if not ok then return false end
  return true,info
 end
 api.slot=slot;api.attackRank=attackRank;api.craft=craft;api.validBook=validBook
 return api
end
