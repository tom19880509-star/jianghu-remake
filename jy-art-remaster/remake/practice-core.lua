-- Two focused arts, with personal progress and separately held physical books.
return function(env)
 local JY,CC,api,B=env.JY,env.CC,env.api,env.balance
 local P={};local hearts={[39]=true,[40]=true,[41]=true,[42]=true,[43]=true,[44]=true,[92]=true,[93]=true,[94]=true,[95]=true}
 -- Cultivation focus is independent of native attack identity and MP curves.
 local drainHearts={[63]=true,[64]=true};P.notices={}
 -- 156 渊源表：小而明确，只收原著与本作已认的同门同源，不做“全门派皆可互通”的推测。
 -- 一门武学只属一个渊源；表外的武学没有触类旁通，也不因此变弱。
 -- 395：书67 松风剑谱原文「四川青城之劍法」，归青城，不吃华山（紫霞/独孤）同源加速；青城目前表内只此一门。
 local lineage={[39]='huashan',[67]='qingcheng',[79]='huashan',
  [45]='wudang',[58]='wudang',[75]='wudang',[95]='wudang',
  [41]='shaolin',[43]='shaolin',[44]='shaolin',[76]='shaolin',
  [40]='xiaoyao',[47]='xiaoyao',[56]='xiaoyao',[63]='xiaoyao',
  [62]='gaibang',[61]='gumu',[73]='gumu',[77]='gumu',
  [78]='kuihua',[93]='kuihua',[68]='wuyue',[69]='wuyue',
  [74]='hudao',[84]='hudao',[71]='liangyi',[82]='liangyi'}
 -- 无秘籍、只能凭记忆修炼的招式，按招式编号归源。
 local skillLineage={[37]='huashan',[48]='huashan',[2]='wudang',[41]='wudang',
  [3]='shaolin',[14]='shaolin',[10]='xiaoyao',[50]='xiaoyao',
  [73]='gaibang',[87]='gaibang',[26]='kuihua',
  [34]='wuyue',[35]='wuyue',[36]='wuyue',[38]='wuyue'}
 local rootKind={[1]='fist',[2]='sword',[3]='blade',[4]='special'}
 local artMap,bookOfSkill
 function P.valid(id)return type(id)=='number' and id%1==0 and (id<0 and id>=-93 and JY.Wugong[-id]~=nil or id>0 and api.validBook(id) and not api.craft(id))end
 function P.kind(id)return (hearts[id] or drainHearts[id]) and 'heart' or 'martial'end
 function P.bookFor(skill)
  if skill==92 then return 95 end
  for b=39,198 do if api.validBook(b) and not api.craft(b) and JY.Thing[b]['练出武功']==skill then return b end end
  return -skill
 end
 function P.rank(pid,id)return id<0 and api.attackRank(pid,-id) or id>0 and api.rank(pid,id) or 0 end
 function P.held(pid,id)return id>0 and env.owned(id) and JY.Thing[id]['使用人']==pid end
 function P.ensure(pid)
  local m=api.ensure(pid)
  if not m.practice then
   local p=JY.Person[pid];local old=p['修炼物品'];local r={martial=0,heart=m.internal,outer=not api.luohanInner(pid),progress={},odd=0}
   if m.signature>0 and api.slot(pid,m.signature) then local id=P.bookFor(m.signature);if not hearts[id] then r.martial=id end end
   -- Native -1 means no manual; it is not the new memory identity for skill 1.
   if old>=0 and P.valid(old) then r[hearts[old] and 'heart' or 'martial']=old end
   m.practice=r
  end
  api.restoreWujiJiuyang(pid)
  local r=m.practice
  if drainHearts[r.martial] then
   local id=r.martial;local name=JY.Thing[id]['名称']
   if r.heart==0 then r.heart=id;P.notices[pid]=name..'现归内功修炼栏，武功栏可另选一门招式。'
   else P.notices[pid]=name..'现归内功修炼栏；已保留原选内功，武功栏请重新选择。' end
   r.martial=0
   P.notices[pid]=P.notices[pid]..'原有境界、秘籍归属与修炼进度均保留，仍可在战斗中主动运功。'
  end
  return m.practice
 end
 function P.key(pid,id)
  local r=P.ensure(pid);return id==41 and r.outer and 'outer:41' or tostring(id)
 end
 function P.name(pid,id)
  if id==0 then return '未选择' end
  local skill=id<0 and -id or not hearts[id] and JY.Thing[id]['练出武功'] or 0
  return skill>0 and JY.Wugong[skill]['名称'] or api.bookName(pid,id,true)
 end
 function P.sync(pid)
  local r=P.ensure(pid);local m=api.ensure(pid)
  -- Repair an old empty-manual sentinel without touching any learned art/XP.
  if r.martial<0 and P.rank(pid,r.martial)==0 then r.martial=0 end
  m.internal=hearts[r.heart] and P.rank(pid,r.heart)>0 and r.heart or 0
  -- Old signature-dependent benefits follow the one martial focus; no third switch.
  m.signature=r.martial<0 and -r.martial or r.martial>0 and math.max(0,JY.Thing[r.martial]['练出武功']) or 0
  local p=JY.Person[pid];local old=p['修炼物品']
  if not (old>=0 and api.craft(old) and P.held(pid,old)) then
   p['修炼物品']=P.held(pid,r.martial) and r.martial or P.held(pid,r.heart) and r.heart or -1
  end
  api.apply(pid)
 end
 function P.reason(pid,id,physical)
  if not P.valid(id) then return '此法不能研习' end
  if JY.Person[pid]['生命']<=0 then return '先休整恢复气血' end
  local known=P.rank(pid,id)>0
  local innerEntry=id==41 and physical and env.growth.luohan and env.growth.luohan.revealed and not api.luohanInner(pid)
  if innerEntry then
   local r=P.ensure(pid);local outer=r.outer;r.outer=false
   local allowed=env.owned(id) and env.canLearn(id,pid);local reason=api.reason(pid,id);r.outer=outer
   return not allowed and '内层入门须持有木罗汉并满足修炼条件' or reason
  end
  if known then return '' end
  if CC.Shemale and CC.Shemale[id]==1 and JY.Person[pid]['性别']==1 then return '此人不合本门修炼条件' end
  if id<0 then return '尚未学会此招，须先得传授' end
  if not physical or not env.owned(id) then return '初学须持有秘籍或先得传授' end
  if not env.canLearn(id,pid) then return '尚未满足本门修炼条件' end
  return api.reason(pid,id)
 end
 function P.choose(pid,id,physical,kind)
  if kind~='martial' and kind~='heart' then return false end
  local r=P.ensure(pid)
  if id~=0 and (P.kind(id)~=kind or P.reason(pid,id,physical)~='') then return false end
  for b=39,198 do if P.valid(b) and P.kind(b)==kind and P.held(pid,b) then JY.Thing[b]['使用人']=-1 end end
  if physical and id>0 then
   local owner=JY.Thing[id]['使用人'];JY.Thing[id]['使用人']=pid
   if owner>=0 and owner~=pid and JY.Person[owner] then P.ensure(owner);P.sync(owner) end
  end
  r[kind]=id
  if id==41 then r.outer=not (physical and env.growth.luohan and env.growth.luohan.revealed) and not api.luohanInner(pid) end
  P.sync(pid);P.notices[pid]=nil;return true
 end
 -- Small, explicit compatibility table. No speculative all-school synergy.
 function P.synergy(pid)
  local r=P.ensure(pid)
  if P.rank(pid,r.heart)<=0 or P.rank(pid,r.martial)<=0 then return 0,'' end
  local art=r.martial<0 and -r.martial or r.martial>0 and JY.Thing[r.martial]['练出武功'] or 0
  if r.heart==39 and (art==37 or art==48) then return 15,'紫霞与华山剑学相辅' end
  if r.heart==95 and (art==2 or art==20 or art==41 or art==58) then return 15,'九阳与武当武学相辅' end
  if r.heart==93 and art==60 then return 15,'葵花与辟邪同源' end
  return 0,''
 end
 -- Build the identity->lineage map once per api instance. Skill identities win
 -- over book ids, so a manual and its remembered art are the same source.
 local function lineageMap()
  if artMap then return artMap end
  artMap={};bookOfSkill={}
  for book,key in pairs(lineage) do
   local skill=api.validBook(book) and not api.craft(book) and JY.Thing[book]['练出武功'] or -1
   if skill>0 then artMap['skill:'..skill]=key;bookOfSkill[skill]=book else artMap['book:'..book]=key end
  end
  for skill,key in pairs(skillLineage) do artMap['skill:'..skill]=key end
  return artMap
 end
 function P.lineage(id)
  local map=lineageMap()
  if id<0 then return map['skill:'..(-id)] end
  if id>0 and api.validBook(id) and not api.craft(id) then
   local skill=JY.Thing[id]['练出武功']
   return skill>0 and map['skill:'..skill] or map['book:'..id]
  end
  return nil
 end
 -- Same-source arts this person has really attained. Only a fifth rank counts:
 -- a first glance at a manual is not a foundation another art can lean on.
 function P.lineageKin(pid,id)
  local key=P.lineage(id);if not key then return 0,0,0 end
  local map=lineageMap();local m=api.ensure(pid);local p=JY.Person[pid]
  local mine=id>0 and api.identity(id) or id<0 and 'skill:'..(-id) or nil
  local seen={};local total,count,best=0,0,0
  local function add(ident,rank,cap)
   if not ident or ident==mine or seen[ident] or rank<5 then return end
   seen[ident]=true;count=count+1;if rank>best then best=rank end
   total=total+(rank>=cap and 16 or 12)
  end
  for book,at in pairs(m.learnedBooks) do
   local b=tonumber(book)
   if b and lineage[b]==key then add(api.identity(b) or ('book:'..b),math.max(at,api.rank(pid,b)),api.maxRank(b)) end
  end
  for i=1,10 do
   local skill=p['武功'..i]
   if skill>0 and map['skill:'..skill]==key then
    local b=bookOfSkill[skill]
    add('skill:'..skill,api.attackRank(pid,skill),b and api.maxRank(b) or ((B.data.skills[skill] or {}).maxRank or 10))
   end
  end
  return total,count,best
 end
 -- The ceiling, not the gain, is where aptitude and weapon grounding enter, and
 -- grounding means the person's OWN root, never the bonus their arts already give:
 -- otherwise the same ranks would both raise and be raised by the ceiling. A
 -- low-aptitude, low-root character still reaches the floor of twenty by practising.
 function P.lineageCap(pid,id)
  local m=api.ensure(pid);local apt=math.max(0,math.min(100,JY.Person[pid]['资质']));local base=apt
  local skill=id<0 and -id or id>0 and api.validBook(id) and not api.craft(id) and JY.Thing[id]['练出武功'] or 0
  local kind=skill>0 and JY.Wugong[skill] and rootKind[JY.Wugong[skill]['武功类型']]
  if kind and m and m.roots[kind] then base=math.max(0,math.min(100,m.roots[kind])) end
  return math.max(20,math.min(45,20+math.floor(base/5)+math.floor(apt/20)))
 end
 function P.crossTrain(pid,id)
  if id==0 or not P.lineage(id) then return 0,'' end
  local kin,count,best=P.lineageKin(pid,id)
  local catch=best>=P.rank(pid,id)+3 and 20 or 0
  local cap=P.lineageCap(pid,id);local total=math.min(cap,kin+catch)
  if total<=0 then return 0,'' end
  return total,'触类旁通'..(count>0 and '·同源'..count..'门' or '')..(catch>0 and '·趁热打铁' or '')..' +'..total..'%（上限'..cap..'%）'
 end
 -- Display the actual marginal capacity after shared foundations and the cap.
 -- This is a read-only counterfactual, not a temporary forget/relearn operation.
 function P.benefits(pid,id)
  if P.kind(id)~='heart' then return nil end
  local r=P.rank(pid,id);local profile=api.bookProfile(pid,id);local m=api.ensure(pid)
  local limit=CC.PersonAttribMax['内力最大值']
  local current=math.max(0,math.min(limit,m.roots.mp+api.rootBonuses(pid).mp))
  local without=math.max(0,math.min(limit,m.roots.mp+api.rootBonuses(pid,id).mp))
  -- After discovery, a zero-rank reader sees the newly available inner art.
  -- Existing outer learners still see the benefits of their actual outer rank.
  local name=id==41 and r==0 and env.growth.luohan and env.growth.luohan.revealed and '罗汉伏魔神功' or api.bookName(pid,id)
  return {name=name,rank=r,capacity=current,mp=math.max(0,current-without),standalone=r>0 and profile and profile.mp[r] or 0,activeDrain=drainHearts[id]==true,effect=profile and profile.effect or ''}
 end
 function P.info(pid,id)
  local r=P.ensure(pid);local known=P.rank(pid,id);local cap=id<0 and ((B.data.skills[-id] or {}).maxRank or 10) or id>0 and api.maxRank(id) or 10
  local manual=P.held(pid,id);local bonus,note=P.synergy(pid)
  local cross,crossNote=P.crossTrain(pid,id);local speed=100+(manual and 50 or 0)+bonus+cross
  if crossNote~='' then note=note~='' and note..' · '..crossNote or crossNote end
  local state=id==41 and env.growth.luohan or nil
  local proof=id==41 and r.outer and known>=10 and manual and state and not state.revealed and not state.legacy and state.first==-1
  local reason=id==0 and '先选择一门研习' or P.reason(pid,id,manual)
  local cost=math.huge
  -- 155 affinity "一招半式": the same ceiling for manual and memory practice.
  local limit=id~=0 and api.affinityCap and api.affinityCap(pid,id<0 and 'skill:'..(-id) or api.identity(id)) or nil
  if reason=='' then
   if proof then cost=B.cost(B.data.books[41],JY.Person[pid]['资质'],10)
   elseif known>=cap and not (id==41 and api.luohanTransition(pid)) then reason='已修至上限'
   elseif limit and known>=limit then reason='一招半式：至多'..limit..'级，完整传承须日后机缘'
   elseif id<0 then cost=B.cost(B.data.skills[-id] or {baseCost=80,curve='steady'},JY.Person[pid]['资质'],known+1)
   else cost=api.cost(pid,id) end
  end
  local key=P.key(pid,id);local progress=r.progress[key] or {xp=0,paid=0}
  return {id=id,book=id>0 and id or nil,skill=id<0 and -id or id>0 and math.max(0,JY.Thing[id]['练出武功']) or nil,name=P.name(pid,id),rank=known,maxRank=cap,rankUnit=id>0 and api.rankUnit(id) or '级',held=manual,speed=speed,synergy=note,lineage=P.lineage(id),crossTrain=cross,reason=reason,cost=cost==math.huge and -1 or cost,progress=progress.xp/100,proof=proof==true,key=key,limit=limit,benefits=P.benefits(pid,id),eligible=reason=='' and cost~=math.huge}
 end
 function P.spend(pid,id,budget)
  local r=P.ensure(pid);local p=JY.Person[pid];local spent,levels=0,0
  for _=1,20 do
   local info=P.info(pid,id);if not info.eligible then break end
   local rec=r.progress[info.key] or {xp=0,paid=0};r.progress[info.key]=rec
   local need=math.max(0,math.ceil((info.cost*100-rec.xp)/info.speed));local use=math.min(need,budget-spent)
   rec.xp=rec.xp+use*info.speed;rec.paid=rec.paid+use;spent=spent+use
   if rec.xp<info.cost*100 then break end
   local paid=rec.paid;local ok=false
   if info.proof then
    env.growth.luohan.first=pid;api.ensure(pid).paid['41']=(api.ensure(pid).paid['41'] or 0)+paid;ok=true
   elseif id<0 then
    local m=api.ensure(pid);local i=api.slot(pid,-id)
    if i then
     if -id==18 and info.rank>=10 then m.extraRanks=m.extraRanks or {};m.extraRanks['18']=info.rank+1 else p['武功等级'..i]=math.min(999,p['武功等级'..i]+100) end
     m.relearnPaid[tostring(-id)]=(m.relearnPaid[tostring(-id)] or 0)+paid;ok=true
    end
   else
    local pool=p['修炼点数'];p['修炼点数']=info.cost
    ok=api.train(pid,id,{manual=info.held});p['修炼点数']=pool
    if ok then local m=api.ensure(pid);m.paid[tostring(id)]=(m.paid[tostring(id)] or 0)-info.cost+paid end
   end
   if not ok then break end
   rec.xp=math.max(0,rec.xp-info.cost*100);rec.paid=0;levels=levels+1;P.sync(pid)
   if spent>=budget then break end
  end
  return spent,levels
 end
 function P.train(pid)
  local r=P.ensure(pid);local p=JY.Person[pid];P.sync(pid)
  local list={};for _,kind in ipairs({'martial','heart'})do if P.info(pid,r[kind]).eligible then list[#list+1]=r[kind] end end
  local pool=p['修炼点数'];if #list==0 then return 0,0 end
  local budgets={pool};if #list==2 then budgets={math.floor(pool/2),math.floor(pool/2)};budgets[r.odd+1]=budgets[r.odd+1]+pool%2;r.odd=(r.odd+pool%2)%2 end
  local spent,levels=0,0
  for i,id in ipairs(list)do local n,l=P.spend(pid,id,budgets[i]);spent=spent+n;levels=levels+l end
  -- At a ceiling or a newly learned tenth identity, send unspent points to the
  -- remaining eligible focus; never duplicate the original pool.
  for _,id in ipairs(list)do if spent<pool then local n,l=P.spend(pid,id,pool-spent);spent=spent+n;levels=levels+l end end
  p['修炼点数']=pool-spent;P.sync(pid);return spent,levels
 end
 function P.pendingPaid(pid)local n=0;for _,r in pairs(P.ensure(pid).progress)do n=n+r.paid end;return n end
 return P
end
