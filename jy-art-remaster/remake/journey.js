import {isEquipmentItem,normalizeStarterGrants} from './starter-equipment.js';
import { normalizeHomestead } from './homestead.js';
import { normalizeRestLocation } from './rest-save.js';
import { normalizeCreation } from './character-creation.js';
import { normalizeExplored } from './exploration.js';
import { newGrowth, normalizeGrowth, normalizeGrowthPerson } from './growth.js';
import { MAX_MARTIAL_SKILL_ID } from './martial-identities.js';
import { normalizeTeaching } from './teaching.js';
import { normalizePastime } from './pastime.js';
// Optional remake metadata. Original r/s/d records retain their byte layout.
import { normalizeMastery } from './mastery.js';
import { normalizeOutfit, normalizeWorn } from './outfit.js';
import { normalizeOffhand } from './offhand.js';
export const PROFILE_KEY='journey-profile';
export const LEGACIES=[
 {id:'fist',name:'拳理旧识',detail:'初始拳掌功夫 +5。'},
 {id:'footwork',name:'步履轻熟',detail:'初始轻功 +5；不额外继承等级和装备。'},
 {id:'supplies',name:'行囊余资',detail:'初始银两 +100；沿途药品与兵器自行寻访。'},
];
// 157（Tom 2026-09-23「多周目继承上一轮回的武功但不继承物品」，比例与名额按主会话推荐拍板）：
// 新周目从上一程通关快照 profile.echo.skills（主角十个武功格）里挑 K 门招式带入，境界减半；
// 物品、银两、等级、属性、内功修为一概不继承——内力回到开局值，balance-combat.lua 的 affordableRank
// 会把耗内高的绝学自动降重，所以带入的是「记忆」，不是「身体」。
// K 随周目 +1、封顶 6：新成长模式的十门名额（growth-core.lua:175）招式与内功共用，全带就一格不剩。
// 92 九阳神功现为纯内功，是唯一会练出武功格的非招式书（95→92，本轮扫 MARTIAL_BOOKS 确认），不可承继。
export const inheritSlots=cycle=>cycle<2?0:Math.min(6,cycle+1);
export const inheritLevel=level=>Math.floor(level/2);
const NON_INHERITABLE=new Set([92]);
export function inheritableSkills(echo){return (echo?.skills||[]).filter(s=>s.id>0&&!NON_INHERITABLE.has(s.id));}
function normalizeInherit(raw,cycle){
 if(!Array.isArray(raw)||raw.length>inheritSlots(cycle))throw Error('承继武学记录不完整。');
 const seen=new Set();
 return raw.map(s=>{
  if(!Number.isInteger(s?.id)||s.id<1||s.id>MAX_MARTIAL_SKILL_ID||NON_INHERITABLE.has(s.id)||seen.has(s.id)||!Number.isInteger(s.level)||s.level<0||s.level>inheritLevel(999))throw Error('承继武学记录不完整。');
  seen.add(s.id);return {id:s.id,level:s.level};
 });
}
export function normalizeProfile(raw){
 if(raw==null)return {version:1,highestClearedCycle:0};
 if(raw.version!==1||!Number.isInteger(raw.highestClearedCycle)||raw.highestClearedCycle<0||raw.highestClearedCycle>998)throw Error('江湖传承记录格式不兼容。');
 const p={version:1,highestClearedCycle:raw.highestClearedCycle};
 if(raw.echoMastered!==undefined){if(typeof raw.echoMastered!=='boolean')throw Error('试炼记录格式不兼容。');p.echoMastered=raw.echoMastered;}
 if(raw.echo!=null)p.echo=normalizeEcho(raw.echo);
 if(raw.echoes!==undefined)p.echoes=normalizeEchoes(raw.echoes);
 if(raw.homecoming!==undefined)p.homecoming=normalizeHomecoming(raw.homecoming);
 if(raw.cleared!==undefined)p.cleared=normalizeCleared(raw.cleared);
 return p;
}
// 155o 身世全解：通关档案记下“善线／恶线”各自最近一次通关发生在第几程。可选字段，旧档没有。
export function normalizeCleared(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('通关方向记录格式不兼容。');
 const out={};
 for(const [k,v] of Object.entries(raw)){if(!['good','evil'].includes(k)||!Number.isInteger(v)||v<1||v>998)throw Error('通关方向记录格式不兼容。');out[k]=v;}
 if(!Object.keys(out).length)throw Error('通关方向记录格式不兼容。');
 return out;
}
// Before 155o, a completed profile kept its latest ending as an echo but had no
// direction ledger. Read only that proven ending; neither the current cycle nor
// current morality proves an earlier clear. Plain decoding remains unchanged.
export function clearedDirections(profile){
 const p=normalizeProfile(profile),done={...(p.cleared||{})},e=p.echo;
 if(e&&e.cycle<=p.highestClearedCycle&&!Object.entries(done).some(([k,v])=>k!==e.alignment&&v===e.cycle)){
  done[e.alignment]=Math.max(done[e.alignment]||0,e.cycle);
 }
 return done;
}
// Two genuine ending snapshots, not living shadows or additional clear grants.
export function normalizeEchoes(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('历程身影记录格式不兼容。');
 const out={};
 for(const [direction,value] of Object.entries(raw)){
  if(!['good','evil'].includes(direction))throw Error('历程身影方向不兼容。');
  const echo=normalizeEcho(value);if(echo.alignment!==direction)throw Error('历程身影方向不一致。');
  out[direction]=echo;
 }
 return out;
}
export function endingEchoes(profile){
 const p=normalizeProfile(profile),out={};
 for(const e of [...Object.values(p.echoes||{}),p.echo].filter(Boolean)){
  if(e.cycle>p.highestClearedCycle||Object.entries(p.cleared||{}).some(([k,v])=>k!==e.alignment&&v===e.cycle))continue;
  if(!out[e.alignment]||e.cycle>=out[e.alignment].cycle)out[e.alignment]=e;
 }
 return out;
}
// Read-only, called only during E1017 after the native campaign has reached its
// ending. The Lua caller must still win any required echo BEFORE revealing.
// Actual profile writes remain in journey-complete; retries grant nothing early.
export function endingRevelationReady(profile,journey,alignment,trueEnding=true){
 const j=normalizeJourney(journey);
 if(!trueEnding||j.trial||['chapter','trial'].includes(j.origin)||!['good','evil'].includes(alignment))return false;
 const done=clearedDirections(profile);done[alignment]=j.cycle;
 return !!done.good&&!!done.evil;
}
// 155d 归路：通关档案记下“回去/留下”各自最近一次发生在第几程。可选字段，旧档没有。
export function normalizeHomecoming(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('归路记录格式不兼容。');
 const out={};
 for(const [k,v] of Object.entries(raw)){if(!['return','stay'].includes(k)||!Number.isInteger(v)||v<1||v>998)throw Error('归路记录格式不兼容。');out[k]=v;}
 if(!Object.keys(out).length)throw Error('归路记录格式不兼容。');
 return out;
}
export function normalizeEcho(raw){
 if(!raw||raw.version!==1||!Number.isInteger(raw.cycle)||raw.cycle<1||raw.cycle>998||!['good','evil'].includes(raw.alignment)||!Array.isArray(raw.skills)||raw.skills.length>10)throw Error('前世身影记录不完整。');
 const fields=['等级','生命增长','生命最大值','内力最大值','内力性质','攻击力','防御力','轻功','拳掌功夫','御剑能力','耍刀技巧','特殊兵器','暗器技巧','医疗能力','用毒能力','解毒能力','抗毒能力','武学常识','攻击带毒','左右互搏'];
 const stats={};for(const k of fields){const v=raw.stats?.[k];if(!Number.isInteger(v)||v<0||v>32767)throw Error('前世身影属性不完整。');stats[k]=v;}
 const skills=raw.skills.map(s=>{if(!Number.isInteger(s.id)||s.id<0||s.id>MAX_MARTIAL_SKILL_ID||!Number.isInteger(s.level)||s.level<0||s.level>999)throw Error('前世武功记录不完整。');return {id:s.id,level:s.level};});
 const gear={};for(const k of ['weapon','armor']){const id=raw.gear?.[k];if(!Number.isInteger(id)||id!==-1&&!(k==='weapon'?isEquipmentItem(id):id>=0&&id<=199))throw Error('前世兵器记录不完整。');gear[k]=id;}
 if(raw.gear.outfit)gear.outfit=normalizeWorn(raw.gear.outfit);
 return {version:1,cycle:raw.cycle,alignment:raw.alignment,stats,skills,gear,...(raw.growth?{growth:normalizeGrowthPerson(raw.growth)}:{})};
}
export function difficultyFor(cycle){
 if(cycle<=1)return {hp:.90,attack:.95,label:'初入江湖 · 稍宽容'};
 const extra=Math.max(0,cycle-2),r=x=>Math.round(x*100)/100;
 // 157 承前世武学后二至七周目加码（editorial/多周目继承157.md 4.4 逐点实测：二周目继承玩家四场合计 74%/76%，
 // 低于旧二周目不继承的 82%）。与旧曲线逐项取大：七周目两线重合（1.40/1.15），八周目起仍走旧曲线
 // 1.6/1.2 封顶——报告建议八周目起封在 1.40/1.15，但那会比现状易，与「二周目及以后不得变易」冲突，待 Tom 裁。
 const hp=r(Math.max(Math.min(1.40,1.10+extra*.06),Math.min(1.6,1+extra*.08)));
 const attack=r(Math.max(Math.min(1.15,1.05+extra*.02),Math.min(1.2,1+extra*.03)));
 return {hp,attack,label:cycle===2?'再入江湖 · 稍强于原版':`第 ${cycle} 周目 · 渐进挑战`};
}
// One ordered acquaintance per save; old ready/used saves keep their entitlement.
const DISPERSAL_NEXT={asked:'wine',wine:'mending',mending:'patched',patched:'errand',errand:'bowl',bowl:'returned',returned:'home',home:'ready'};
export function advanceDispersalQuest(journey,step){
 if(journey.trial||journey.dispersalUsed)return false;
 const next=journey.dispersalQuest?DISPERSAL_NEXT[journey.dispersalQuest]:'asked';
 if(step!==next)return false;
 journey.dispersalQuest=step;return true;
}
export function normalizeJourney(raw){
 if(raw==null)return {version:1,cycle:1,trial:false,origin:'classic',legacy:'none',kongming:false};
 if(raw.version!==1||!Number.isInteger(raw.cycle)||raw.cycle<1||raw.cycle>999||typeof raw.trial!=='boolean'||!['classic','legacy','chapter','trial'].includes(raw.origin)||!['none',...LEGACIES.map(x=>x.id)].includes(raw.legacy)||typeof raw.kongming!=='boolean')throw Error('此存档的周目记录不完整，未导入。');
 if((raw.origin==='trial'||raw.origin==='chapter')&&!raw.trial)throw Error('试玩存档的周目标记不完整。');
 if(raw.echoWon!==undefined&&typeof raw.echoWon!=='boolean')throw Error('试炼记录格式不兼容。');
 if(raw.meizhuang!==undefined&&!['brush','lesson'].includes(raw.meizhuang))throw Error('梅庄机缘记录格式不兼容。');
 if(raw.innAid!==undefined&&!['doctor','medicine'].includes(raw.innAid))throw Error('河洛问诊记录格式不兼容。');
 if(raw.innRested!==undefined&&(typeof raw.innRested!=='boolean'||raw.innRested&&!raw.innAid))throw Error('客栈休整记录格式不兼容。');
 if(raw.dispersalUsed!==undefined&&typeof raw.dispersalUsed!=='boolean')throw Error('散功记录格式不兼容。');
  if(raw.dispersalQuest!==undefined&&![...Object.keys(DISPERSAL_NEXT),'ready'].includes(raw.dispersalQuest))throw Error('温酒之约记录格式不兼容。');
  if(raw.luohanRevealed!==undefined&&typeof raw.luohanRevealed!=='boolean')throw Error('木罗汉见闻记录格式不兼容。');
 if(raw.growth && (raw.trial || raw.mastery))throw Error('新成长须从正常新开局开始，不能混用论武试验记录。');
 if(raw.mastery && (!raw.trial || raw.origin!=='trial'))throw Error('论武试玩不能作为正式周目导入。');
 if(raw.echoSpent!==undefined&&typeof raw.echoSpent!=='boolean')throw Error('旧影记录格式不兼容。');
 if(raw.inherit!==undefined&&raw.trial)throw Error('独立试玩不承继前世武学。');
 const inherit=raw.inherit===undefined?undefined:normalizeInherit(raw.inherit,raw.cycle);
 if(raw.storyRewards!==undefined){
  if(!raw.storyRewards||typeof raw.storyRewards!=='object'||Array.isArray(raw.storyRewards)||Object.entries(raw.storyRewards).some(([key,value])=>!['jinlun','xiexun'].includes(key)||value!==true))throw Error('剧情赠书记录格式不兼容。');
 }
 const echo=raw.echo===undefined||raw.trial?undefined:raw.echo===null?null:normalizeEcho(raw.echo);
 if(echo&&echo.cycle>=raw.cycle)throw Error('旧影周目不得晚于当前周目。');
 return {version:1,cycle:raw.cycle,trial:raw.trial,origin:raw.origin,legacy:raw.legacy,kongming:raw.kongming,...(raw.offhand!==undefined?{offhand:normalizeOffhand(raw.offhand)}:{}),...(raw.starterGrants!==undefined?{starterGrants:normalizeStarterGrants(raw.starterGrants)}:{}),...(raw.rest!==undefined?{rest:normalizeRestLocation(raw.rest)}:{}),...(raw.creation!==undefined?{creation:normalizeCreation(raw.creation)}:{}),...(raw.explored!==undefined?{explored:normalizeExplored(raw.explored)}:{}),...(raw.echoWon?{echoWon:true}:{}),...(echo!==undefined?{echo}:{}),...(raw.echoSpent&&echo?{echoSpent:true}:{}),...(raw.storyRewards?{storyRewards:{...raw.storyRewards}}:{}),...(raw.meizhuang?{meizhuang:raw.meizhuang}:{}),...(raw.innAid?{innAid:raw.innAid}:{}),...(raw.innRested?{innRested:true}:{}),...(raw.dispersalUsed?{dispersalUsed:true}:{}),...(raw.dispersalQuest?{dispersalQuest:raw.dispersalQuest}:{}),...(raw.luohanRevealed?{luohanRevealed:true}:{}),...(inherit?.length?{inherit}:{}),...(raw.growth?{growth:normalizeGrowth(raw.growth)}:{}),...(raw.mastery?{mastery:normalizeMastery(raw.mastery)}:{}),...(raw.homestead!=null?{homestead:normalizeHomestead(raw.homestead)}:{}),...(raw.outfit?{outfit:normalizeOutfit(raw.outfit)}:{}),...(raw.teaching!=null?{teaching:normalizeTeaching(raw.teaching)}:{}),...(raw.pastime!=null?{pastime:normalizePastime(raw.pastime)}:{})};
}
export function newJourney(profile,legacy,trial=false,picks=[]){
 const p=normalizeProfile(profile);
 if(!LEGACIES.some(x=>x.id===legacy))throw Error('请先选择一项传承。');
 if(!trial&&p.highestClearedCycle<1)throw Error('走过圣堂石门、完成这一程结局后，才能开启正式的新周目。');
 const cycle=trial?2:p.highestClearedCycle+1;
 let inherit;
 if(picks.length){
  if(trial)throw Error('独立试玩不承继前世武学。');
  const pool=new Map(inheritableSkills(p.echo&&p.echo.cycle<cycle?p.echo:null).map(s=>[s.id,s]));
  inherit=picks.map(id=>{const s=pool.get(id);if(!s)throw Error('所选武学不在上一程的通关记录里。');return {id,level:inheritLevel(s.level)};});
 }
 return normalizeJourney({version:1,cycle,trial,origin:trial?'trial':'legacy',legacy,kongming:false,...(inherit?{inherit}:{}),...(!trial&&p.echo?.growth?{growth:newGrowth()}:{}),...(trial?{}:{echo:p.echo&&p.echo.cycle<p.highestClearedCycle+1?p.echo:null})});
}
export function bindJourneyEcho(journey,profile){
 if(journey.trial||journey.echo!==undefined)return journey;
 const e=normalizeProfile(profile).echo;
 journey.echo=e&&e.cycle<journey.cycle?e:null;return journey;
}
export function completeJourney(profile,journey,trueEnding,echo,homecoming){
 const p=normalizeProfile(profile),j=normalizeJourney(journey);
 if(!trueEnding||j.trial||['chapter','trial'].includes(j.origin))return p;
 const next={...p,highestClearedCycle:Math.max(p.highestClearedCycle,Math.min(998,j.cycle))};
 if(homecoming==='return'||homecoming==='stay')next.homecoming={...(p.homecoming||{}),[homecoming]:Math.min(998,j.cycle)};
 if(echo&&['good','evil'].includes(echo.alignment)){
  const done=clearedDirections(p);
  next.cleared={...done,[echo.alignment]:Math.max(done[echo.alignment]||0,Math.min(998,j.cycle))};
  const history=endingEchoes(p),snapshot=normalizeEcho({...echo,cycle:Math.min(998,j.cycle)});
  if(!history[echo.alignment]||snapshot.cycle>=history[echo.alignment].cycle)history[echo.alignment]=snapshot;
  next.echoes=history;
 }
 if(j.echoWon)next.echoMastered=true;
 if(echo&&j.cycle>=p.highestClearedCycle)next.echo=normalizeEcho({...echo,cycle:Math.min(998,j.cycle)});
 return next;
}
export function mergeProfiles(a,b){
 const x=normalizeProfile(a),y=normalizeProfile(b);
 const next=y.highestClearedCycle>x.highestClearedCycle||y.highestClearedCycle===x.highestClearedCycle&&y.echo?y:x;
 const merged=x.echoMastered||y.echoMastered?{...next,echoMastered:true}:next;
 const home={...(x.homecoming||{})};
 for(const [k,v] of Object.entries(y.homecoming||{}))home[k]=Math.max(home[k]||0,v);
 // Collect both profiles before selecting an echo, otherwise importing a newer
 // opposite ending would discard the old profile's only evidence of its route.
 const done=clearedDirections(x);
 for(const [k,v] of Object.entries(clearedDirections(y)))done[k]=Math.max(done[k]||0,v);
 const history=endingEchoes(x);
 for(const [k,e] of Object.entries(endingEchoes(y)))if(!history[k]||e.cycle>=history[k].cycle)history[k]=e;
 const withEchoes=Object.keys(history).length?{...merged,echoes:history}:merged;
 const out=Object.keys(home).length?{...withEchoes,homecoming:home}:withEchoes;
 return Object.keys(done).length?{...out,cleared:done}:out;
}
export const journeyLabel=j=>j.trial?'江湖新篇 · 独立试玩':j.cycle>1?`第 ${j.cycle} 周目`:'初入江湖';
export const homecomingNote=p=>p.homecoming?'\n归路：'+[['return','回去'],['stay','留下']].filter(([k])=>p.homecoming[k]).map(([k,l])=>`第 ${p.homecoming[k]} 程${l}`).join('；')+'。再入江湖是从同一起点另走一程，不改已作的选择。':'';
export function readProfile(db){return new Promise((resolve,reject)=>{const r=db.transaction('slots').objectStore('slots').get(PROFILE_KEY);r.onsuccess=()=>{try{resolve(normalizeProfile(r.result));}catch(e){reject(e);}};r.onerror=()=>reject(r.error);});}
export function writeProfile(db,profile){return new Promise((resolve,reject)=>{const tx=db.transaction('slots','readwrite');tx.objectStore('slots').put(normalizeProfile(profile),PROFILE_KEY);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('通关记录未能保存。'));});}
