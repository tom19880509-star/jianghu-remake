// New-campaign growth records. Existing saves have no growth field and keep
// their original rules. Learned attack ranks remain in the original r record.
import { MARTIAL_BOOKS, MAX_MARTIAL_SKILL_ID } from './martial-identities.js';
export const GROWTH_INTERNALS=Object.freeze([39,40,41,42,43,44,92,93,94,95]);
export const GROWTH_HEART_FOCUS=Object.freeze([...GROWTH_INTERNALS,63,64]);
export const GROWTH_NON_ATTACK=Object.freeze([39,40,41,42,43,44,45,46,47,88,89,90,91,92,93,94,95]);
export const GROWTH_ROOTS=Object.freeze(['mp','agility','fist','sword','blade','special','throw']);
const record=(value,label)=>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error(label+'记录不完整。');return value;};
const integer=(n,min,max,label)=>{if(!Number.isInteger(n)||n<min||n>max)throw Error(label+'记录不完整。');return n;};
export function normalizeGrowthPerson(raw){
 const v=record(raw,'人物修为');
 const out={signature:integer(v.signature,0,MAX_MARTIAL_SKILL_ID,'拿手武学'),internal:integer(v.internal,0,199,'主运心法'),roots:{},inherent:{},nature:integer(v.nature,0,2,'固有内力性质'),learnedBooks:{},paid:{},taught:{},relearnPaid:{}};
 record(v.roots,'自身根基');for(const key of GROWTH_ROOTS)out.roots[key]=integer(v.roots[key],0,key==='mp'?999:100,'自身根基');
 record(v.inherent,'初始修为');for(const key of GROWTH_ROOTS)out.inherent[key]=integer(v.inherent[key],0,key==='mp'?999:100,'初始修为');
 record(v.learnedBooks,'已修法门');for(const [key,rank] of Object.entries(v.learnedBooks)){
  if(!GROWTH_NON_ATTACK.map(String).includes(key))throw Error('已修法门编号不完整。');
  out.learnedBooks[key]=integer(rank,1,key==='91'?1:10,'已修境界');
 }
 record(v.paid,'个人研习投入');for(const [key,paid] of Object.entries(v.paid)){
  if(!/^(0|[1-9]\d*)$/.test(key)||!(MARTIAL_BOOKS[key]?.counts||key==='198'))throw Error('个人研习投入的秘籍编号不完整。');
  out.paid[key]=integer(paid,0,100000000,'个人研习投入');
 }
 record(v.taught,'曾学法门');for(const [key,held] of Object.entries(v.taught)){
  const match=/^(skill|book):([1-9]\d*)$/.exec(key);
  if(!match||held!==true||(match[1]==='skill'?Number(match[2])>MAX_MARTIAL_SKILL_ID:!GROWTH_NON_ATTACK.includes(Number(match[2]))))throw Error('曾学法门记录不完整。');
  out.taught[key]=true;
 }
 record(v.relearnPaid,'重学投入');for(const [key,paid] of Object.entries(v.relearnPaid)){
  if(!/^[1-9]\d*$/.test(key)||Number(key)>MAX_MARTIAL_SKILL_ID||!out.taught['skill:'+key])throw Error('重学投入记录不完整。');
  out.relearnPaid[key]=integer(paid,0,100000000,'重学投入');
 }
 if(v.practice!==undefined){
  const p=record(v.practice,'双修');
  const valid=id=>Number.isInteger(id)&&(id===0||id<0&&id>=-MAX_MARTIAL_SKILL_ID||MARTIAL_BOOKS[id]?.counts||id===198);
  // Keep accepting old drain arts in martial: Lua migrates the focus with a
  // visible notice while preserving all personal XP and physical ownership.
  if(!valid(p.martial)||!valid(p.heart)||p.martial>0&&GROWTH_INTERNALS.includes(p.martial)||p.heart!==0&&!GROWTH_HEART_FOCUS.includes(p.heart)||typeof p.outer!=='boolean')throw Error('双修法门记录不完整。');
  out.practice={martial:p.martial,heart:p.heart,outer:p.outer,odd:integer(p.odd,0,1,'双修分配'),progress:{}};
  for(const [key,value]of Object.entries(record(p.progress,'个人修炼进度'))){
   if(key!=='outer:41'&&(!/^-?[1-9]\d*$/.test(key)||!valid(Number(key))))throw Error('个人修炼进度编号不完整。');
   const r=record(value,'个人修炼进度');out.practice.progress[key]={xp:integer(r.xp,0,100000000,'修炼进度'),paid:integer(r.paid,0,100000000,'实际修炼投入')};
  }
 }
 if(v.aptitude!==undefined)out.aptitude=integer(v.aptitude,0,100,'初始资质');
 if(v.extraRanks!==undefined){
  out.extraRanks={};record(v.extraRanks,'高层修为');
  for(const [key,rank]of Object.entries(v.extraRanks)){
   if(key!=='18'||!out.taught['skill:18'])throw Error('高层修为缺少对应传承。');
   out.extraRanks[key]=integer(rank,11,13,'龙象层数');
  }
 }
 if(v.entryRanks!==undefined){out.entryRanks={};record(v.entryRanks,'旁通境界');for(const [key,rank]of Object.entries(v.entryRanks)){if(!/^[1-9]\d*$/.test(key)||Number(key)>MAX_MARTIAL_SKILL_ID)throw Error('旁通武学编号不完整。');out.entryRanks[key]=integer(rank,2,3,'旁通境界');}}
 if(v.luohan!==undefined){
  const l=record(v.luohan,'泥偶修为');if(!['outer','inner'].includes(l.layer))throw Error('泥偶内外层记录不完整。');
  out.luohan={layer:l.layer,base:integer(l.base,0,40,'泥偶根基'),basePaid:integer(l.basePaid,0,100000000,'泥偶根基投入'),credit:integer(l.credit,0,100000000,'内层修炼抵扣')};
  if(out.luohan.base!==0&&out.luohan.base!==40)throw Error('泥偶根基记录不完整。');
  if(l.layer==='outer'&&l.credit!==0)throw Error('未转修内层不能留存内层抵扣。');
 }
 if(v.qi!==undefined){
  const q=record(v.qi,'异气与悟法');
  out.qi={foreign:integer(q.foreign,0,100,'异气负担'),paid:integer(q.paid,0,100000000,'调息耗用')};
  for(const key of ['guided','healed','entrusted','wounded','insight']){if(typeof q[key]!=='boolean')throw Error('异气与悟法记录不完整。');out.qi[key]=q[key];}
  if(q.insight&&(!q.entrusted||!q.wounded||!q.guided))throw Error('悟法经历不完整。');
 }
 if(v.leftGear!==undefined){
  // ui155b: gear handed back at the last departure, offered once on rejoining (growth-extension.lua).
  const g=record(v.leftGear,'离队行装');out.leftGear={};
  for(const key of ['weapon','armor'])if(g[key]!==undefined)out.leftGear[key]=integer(g[key],0,999,'离队行装');
  for(const key of ['coat','boots'])if(g[key]!==undefined){if(typeof g[key]!=='string'||!/^[a-z]{1,24}$/.test(g[key]))throw Error('离队行装记录不完整。');out.leftGear[key]=g[key];}
  if(!Object.keys(out.leftGear).length)delete out.leftGear;
 }
 if(v.bonds!==undefined){
  // 155 affinity: only on the hero record carried by an ending's echo. Companions who
  // reached 知己 in that cycle; the next cycle keeps just this 似曾相识 mark, never values.
  out.bonds=companionSet(v.bonds,'似曾相识');if(!Object.keys(out.bonds).length)delete out.bonds;
 }
 if(out.internal!==0&&(!GROWTH_INTERNALS.includes(out.internal)||!out.learnedBooks[out.internal]))throw Error('尚未练成的心法不能主运。');
 return out;
}
// 155 队友好感 v1 (editorial/好感度系统v1_155.md; rules live in growth-extension.lua).
// Lua tables reach this normaliser as objects, so every set is a {key:true} map.
export const AFFINITY_COMPANIONS=Object.freeze([1,2,9,16,17,25,28,29,35,36,37,38,44,45,47,48,49,51,53,54,58,59,61,63,76]);
// resident: lives in 小虾米居; promised: comes once their own concern is settled; declined: said no this cycle.
export const AFFINITY_HOME=Object.freeze(['resident','promised','declined']);
const IDENTITY=/^(skill|book):([1-9]\d*)$/;
function companionSet(raw,label){
 const out={};for(const [key,held] of Object.entries(record(raw,label))){
  if(!AFFINITY_COMPANIONS.map(String).includes(key)||held!==true)throw Error(label+'记录不完整。');out[key]=true;
 }
 return out;
}
function identityKey(key,label){
 const m=IDENTITY.exec(key);if(!m||(m[1]==='skill'?Number(m[2])>MAX_MARTIAL_SKILL_ID:!(MARTIAL_BOOKS[m[2]]?.counts||m[2]==='198')))throw Error(label+'记录不完整。');
 return key;
}
export function normalizeAffinity(raw){
 const v=record(raw,'队友好感');if(v.version!==1)throw Error('队友好感记录版本不兼容。');
 const out={version:1,persons:{},slots:{},caps:{},aptitude:{},familiar:{}};
 for(const [key,value] of Object.entries(record(v.persons,'队友好感'))){
  if(!AFFINITY_COMPANIONS.map(String).includes(key))throw Error('好感人物编号不完整。');
  const p=record(value,'队友好感');
  const person={value:integer(p.value,0,100,'好感'),joined:p.joined,wins:integer(p.wins,0,100,'同行战绩'),bond:p.bond,events:{}};
  if(typeof p.joined!=='boolean'||typeof p.bond!=='boolean')throw Error('队友好感记录不完整。');
  for(const [event,held] of Object.entries(record(p.events,'心结事件'))){if(!/^[1-9]\d{0,3}$/.test(event)||held!==true)throw Error('心结事件记录不完整。');person.events[event]=true;}
  if(p.taught!==undefined){if(typeof p.taught!=='string')throw Error('好感传授记录不完整。');person.taught=identityKey(p.taught,'好感传授');}
  // 155b (optional, absent in v1 records): 邀请入住山居 answer, and 令狐冲's 思过崖 剑理演示 already shown.
  if(p.home!==undefined){if(!AFFINITY_HOME.includes(p.home))throw Error('入住山居记录不完整。');person.home=p.home;}
  if(p.demo!==undefined){if(p.demo!==true)throw Error('演示剑理记录不完整。');person.demo=true;}
  // 156（可选，旧档没有）：本程因品德下跌而扣掉的好感总额，品德回升时按它封顶退还，退完即删。
  if(p.moralLost!==undefined)person.moralLost=integer(p.moralLost,1,10000,'品德折损');
  out.persons[key]=person;
 }
 for(const [key,held] of Object.entries(record(v.slots,'好感传授名额'))){if(held!==true)throw Error('好感传授名额记录不完整。');out.slots[identityKey(key,'好感传授名额')]=true;}
 if(Object.keys(out.slots).length>3)throw Error('好感传授名额超过三门。');
 for(const [key,value] of Object.entries(record(v.caps,'一招半式'))){
  const c=record(value,'一招半式');
  if(!out.slots[key])throw Error('一招半式缺少对应传授。');
  if(!AFFINITY_COMPANIONS.includes(c.teacher))throw Error('一招半式传授者不完整。');
  out.caps[key]={rank:integer(c.rank,1,12,'一招半式'),teacher:c.teacher,from:integer(c.from,1,13,'一招半式')};
 }
 for(const [key,value] of Object.entries(record(v.aptitude,'资质指点'))){
  const a=record(value,'资质指点');
  if(!GROWTH_NON_ATTACK.map(String).includes(key)&&!MARTIAL_BOOKS[key]?.counts)throw Error('资质指点的秘籍编号不完整。');
  if(!AFFINITY_COMPANIONS.includes(a.teacher))throw Error('资质指点传授者不完整。');
  out.aptitude[key]={rank:integer(a.rank,0,100,'资质指点'),teacher:a.teacher};
 }
 out.familiar=companionSet(v.familiar,'似曾相识');
 // 155 多周目完整传承 (legacy-extension.lua): the complete inheritances this cycle's hero has received
 // (第一批 思过崖风清扬 独孤九剑, 侠客岛石壁 太玄神功; 第二批 无量山洞段誉 六脉神剑, 绝情谷底杨过 黯然销魂掌).
 // 第二批不新增字段. Optional and absent in every earlier record, so their
 // normalised bytes stay the same; a complete inheritance lifts the 一招半式 ceiling, so the two never coexist.
 if(v.legacy!==undefined){
  const legacy={};
  for(const [key,held] of Object.entries(record(v.legacy,'完整传承'))){
   if(held!==true)throw Error('完整传承记录不完整。');
   const id=identityKey(key,'完整传承');
   if(out.caps[id])throw Error('完整传承与一招半式不能并存。');
   legacy[id]=true;
  }
  if(Object.keys(legacy).length)out.legacy=legacy;
 }
 return out;
}
export function normalizeGrowth(raw){
 const v=record(raw,'重制成长');if(v.version!==1)throw Error('此成长规则版本尚不兼容。');
 const out={version:1,persons:{}};record(v.persons,'人物成长');
 for(const [key,value] of Object.entries(v.persons)){
  if(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>319)throw Error('人物成长编号不完整。');
  out.persons[key]=normalizeGrowthPerson(value);
 }
 if(v.luohan!==undefined){
  const l=record(v.luohan,'木罗汉见闻');if(l.version!==1||typeof l.revealed!=='boolean'||typeof l.legacy!=='boolean')throw Error('木罗汉见闻记录不完整。');
  out.luohan={version:1,first:integer(l.first,-1,319,'泥偶首位修满者'),revealed:l.revealed,legacy:l.legacy};
  if(l.first>=0&&!out.persons[l.first])throw Error('泥偶首位修满者记录不完整。');
 }
 if(v.yijinRoad!==undefined){
  const q=record(v.yijinRoad,'行路善缘');
  if(!['pending','carrying','good'].includes(q.entrusted)||!['pending','good'].includes(q.wounded))throw Error('行路善缘记录不完整。');
  out.yijinRoad={entrusted:q.entrusted,wounded:q.wounded};
 }
 // Absent in every save before 155 affinity: nothing is added, so their normalised bytes stay the same.
 if(v.affinity!==undefined)out.affinity=normalizeAffinity(v.affinity);
 return out;
}
export const newGrowth=()=>({version:1,persons:{},luohan:{version:1,first:-1,revealed:false,legacy:false}});
