import {martialLore} from './martial-lore.js';
import {martialSchool,SCHOOL_LABELS} from './martial-schools.js';
import {candidateProfile,rankCost,aptitudeFactor} from './martial-balance.js';
import {gradeView,readSeen,entrySeen,gradeAttrs,gradeBadgeHTML,gradeCostsHTML} from './grade157.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kinds={fist:'拳掌指爪',sword:'剑法',blade:'刀法',special:'奇门兵器',internal:'内功',lightness:'轻功',support:'其他法门'};
// 157：tier 是威力档，标签不再借用品第的「上乘」「绝学」二字，免得与品第同词两义。
const tiers=['','威力一档','威力二档','威力三档','威力四档'];const curves={steady:'循序精进',early:'初见锋芒',late:'厚积后劲'};
// ui156 隐藏资格：图鉴不写明何人可学、以什么为凭，只说须按具体人物核对。
// 核对档 assets/data/martial-catalog.json 保持原文不动。
const HIDDEN_ACCESS={'zuo-you-hu-bo':['心性法门，原著中并非人人练得成。','是否合适须在游戏中按具体人物核对；目录不写明条件。']};
const [catalog,balance]=await Promise.all(['assets/data/martial-catalog.json','assets/data/martial-balance.json'].map(p=>fetch(p,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('武典读取失败');return r.json();})));
const entries=catalog.entries;
$('kind').replaceChildren(new Option('全部门类',''),...Object.entries(SCHOOL_LABELS).map(([k,n])=>new Option(n,k)));
// 157 品第：图鉴页不读存档。「见过」名单只由同源父页（游戏）发来；收到之前一律灰字、不示朱批。
let seen=null;const view=e=>gradeView(e,{seen:entrySeen(e,seen)});
let current=entries.find(e=>e.nativeBookId===39)||entries[0];let compare=[current.id,entries.find(e=>e.nativeBookId===41)?.id,entries.find(e=>e.nativeBookId===95)?.id].filter(Boolean);
// 156：已在扩展层实装、但底表没有招式/秘籍编号的剧情身份（神足经是游坦之本人的内功，不出独立秘籍）。
const RUNTIME=new Set(['shen-zu-jing']);
const native=e=>RUNTIME.has(e.id)||e.nativeSkillId!==null&&e.nativeSkillId!==undefined||e.nativeBookId!==null&&e.nativeBookId!==undefined;
const nativeProfile=e=>e.nativeStage==='inner'?balance.books[e.nativeBookId]?.inner:balance.books[e.nativeBookId]??balance.skills[e.nativeSkillId];
const profile=e=>nativeProfile(e)??candidateProfile(e);
const values=p=>p.power?.length?p.power:p.mp?.length?p.mp:p.agility?.length?p.agility:p.throw?.length?p.throw:[];
const unit=p=>p.power?.length?'招式威力':p.mp?.length?'主运内力贡献':p.agility?.length?'轻功贡献':p.throw?.length?'暗器根基贡献':'独立机制';
// 156 统一入门心得：一重按 entryCost 定额×资质系数（与 growth-core.lua api.fullCost 同一口径），松风再封顶 20。
function cost(e,p,apt,next){if(next===1&&p.entryCost!==undefined){const entry=rankCost({baseCost:p.entryCost,curve:'steady'},apt,1);return e.nativeBookId===67?Math.min(20,entry):entry;}return e.nativeBookId===67&&next===1?20:rankCost(p,apt,next);}
function list(){
 const query=$('search').value.trim().toLowerCase(),kind=$('kind').value,state=$('state').value;
 const rows=entries.filter(e=>(!kind||martialSchool(e)===kind)&&(!query||[e.name,...(e.aliases||[])].some(n=>n.toLowerCase().includes(query)))&&(!state||state==='native'&&native(e)||state==='candidate'&&!native(e)||state==='novel'&&e.origin==='novel'));
 $('count').textContent=`${rows.length} / ${entries.length} 门 · 可点选察看`;
 $('list').innerHTML=rows.map(e=>`<button role="listitem" class="art-row ${e.id===current.id?'selected':''}" data-id="${esc(e.id)}"><b${gradeAttrs(view(e))}>${esc(e.name)}</b><small>${SCHOOL_LABELS[martialSchool(e)]||kinds[e.kind]} · ${RUNTIME.has(e.id)?'剧情身份':native(e)?'已有游戏身份':'扩展候选'}${view(e).label?' · '+view(e).label:''}</small></button>`).join('')||'<p class="note">未找到此名，可试试别称。</p>';
}
function drawCurve(vals,rankUnit){
 if(!vals.length)return '<p class="note">此类法门须逐项设计用途，不以空造伤害值充数。</p>';
 const max=Math.max(...vals,1),pts=vals.map((n,i)=>[38+i*450/Math.max(1,vals.length-1),140-n/max*105]);
 return `<svg class="curve" viewBox="0 0 520 175" role="img" aria-label="1至${vals.length}${rankUnit}的成长曲线，最高${max}"><path class="grid" d="M38 35H488M38 87H488M38 140H488"/><text x="4" y="39">${max}</text><text x="18" y="144">0</text><path class="fill" d="M38 140 L${pts.map(p=>p.join(' ')).join(' L')} L488 140Z"/><path class="line" d="M${pts.map(p=>p.join(' ')).join(' L')}"/>${pts.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="3" fill="#3d6051"/><text x="${x-3}" y="163">${i+1}</text>`).join('')}</svg>`;
}
function detail(){
 const e=current,p=profile(e),vals=values(p),actual=nativeProfile(e),lore=martialLore({entry:e});
 const v=view(e),vTitle=gradeAttrs(v),vBadges=gradeBadgeHTML(v),vCosts=gradeCostsHTML(v); // 只由 gradeView 决定，未见/待核时后两者为空
 const links=(e.sourceKeys||[]).map(k=>catalog.sources[k]).filter(Boolean).map(s=>s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`:esc(s.title)).join(' · ');
 const from=e.origin==='novel'?'已列原著核对依据':e.origin==='mod'?'MOD 收录，原著身份待逐项核对':'原版保留，原著身份待核';
 const title=p.power?.length?'招式威力，不等于最终伤害':unit(p);
 const ceiling=p.maxRank??10,label=p.rankUnit??'级',middle=Math.ceil(ceiling/2);
 const costAtMax=p.mpStep===undefined?null:Math.floor((Math.min(ceiling,10)+1)/2)*(p.mpStep+2*Math.max(0,ceiling-10)); // 157 龙象末三层耗内 +2/层，同 balance-combat.lua:19
 $('detail').innerHTML=`<div class="eyebrow">${actual?'现有规则 · 本地数值已接入':RUNTIME.has(e.id)?'剧情身份 · 已接入主线，无独立秘籍':native(e)?'既有辅助法门 · 沿原规则，数值对照仅为候选':'扩展候选 · 尚未接入主线'}</div><div class="title-row"><h2${vTitle}>${esc(e.name)}</h2><button id="compare-add">${compare.includes(e.id)?'已在对照中':'加入对照'}</button></div><div class="tags"><span class="tag">${SCHOOL_LABELS[martialSchool(e)]||kinds[e.kind]}</span><span class="tag">${tiers[p.tier]}</span><span class="tag">${curves[p.curve]}</span>${vBadges}</div>${vCosts}<h3>武学来由</h3><p>${esc(lore.text)}</p><p class="note">${esc(lore.transmission)}</p><h3>修炼所需条件</h3><p>${esc(e.studyRequirements?.join(' · ')||'尚无可研习秘籍；须待具体传授剧情接入后再定条件。')}</p><p class="note">数值门槛为本版规则；选定队伍人物后，可在游戏内逐项核对。目录不读取个人存档。</p><p>${esc(HIDDEN_ACCESS[e.id]?HIDDEN_ACCESS[e.id][0]:(e.canonNote||'').replace(/\blate\b/g,'厚积后劲'))}</p><p class="note">${esc(HIDDEN_ACCESS[e.id]?HIDDEN_ACCESS[e.id][1]:e.accessNote)}</p><p>${esc(p.effect||'招式效果沿现有范围与命中规则；高境界仍需真实修炼。')}</p><div class="metrics"><div class="metric"><small>${esc(title)} · 1${label}</small><strong>${vals[0]??'—'}</strong></div><div class="metric"><small>${middle}${label}</small><strong>${vals[middle-1]??'—'}</strong></div><div class="metric"><small>${ceiling}${label} · 上限</small><strong>${vals[ceiling-1]??'—'}</strong></div>${costAtMax!==null?`<div class="metric"><small>${ceiling}${label}单次耗内</small><strong>${costAtMax}</strong></div>`:''}</div>${drawCurve(vals,label)}<p class="note">${from}。${actual?'有游戏身份不等于人人可学；原有角色、秘籍与剧情条件仍须满足。':RUNTIME.has(e.id)?'获取剧情已实装，无独立秘籍可研习。':'数值为候选预算；新动画、专属效果、获取剧情尚未实装。'}</p><div class="sources">资料：${links}</div>`;
 $('compare-add').onclick=()=>{if(compare.includes(e.id))return;if(compare.length>=3)compare.shift();compare.push(e.id);detail();comparison();};
}
function comparison(){
 const apt=Number($('apt').value),budget=Math.max(0,Math.min(100000,Number($('budget').value)||0));$('apt-value').textContent=apt;
 $('comparison').innerHTML='<table><thead><tr><th>武学</th><th>可修境界</th><th>实际投入</th><th>当前贡献</th><th></th></tr></thead><tbody>'+compare.map(id=>{
  const e=entries.find(e=>e.id===id),p=profile(e);let spent=0,rank=0;
  while(rank<(p.maxRank||10)){const n=cost(e,p,apt,rank+1);if(spent+n>budget)break;spent+=n;rank++;}
  const val=values(p)[rank-1];return `<tr><td>${esc(e.name)}</td><td>${rank}/${p.maxRank??10}${p.rankUnit??'级'}</td><td>${spent}</td><td>${val??'—'} ${rank&&val!==undefined?unit(p):''}</td><td><button class="remove" data-remove="${esc(id)}" aria-label="移除${esc(e.name)}">×</button></td></tr>`;
 }).join('')+'</tbody></table><p>本资质修炼系数 '+aptitudeFactor(apt).toFixed(2)+'。上限十门、预留本命传承照常；比较器不会赠予武功或改动存档。</p>';
}
$('list').onclick=e=>{const id=e.target.closest('[data-id]')?.dataset.id;if(id){current=entries.find(e=>e.id===id);list();detail();}};
$('comparison').onclick=e=>{const id=e.target.closest('[data-remove]')?.dataset.remove;if(id){compare=compare.filter(v=>v!==id);comparison();detail();}};
for(const id of ['search','kind','state'])$(id).addEventListener('input',list);
for(const id of ['apt','budget'])$(id).addEventListener('input',comparison);
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==window.parent)return;const next=readSeen(event.data);if(next){seen=next;list();detail();}});
if(window.parent!==window)window.parent.postMessage({type:'martial-catalog-ready'},location.origin);
$('back').onclick=()=>{if(window.parent!==window)window.parent.postMessage({type:'close-martial-catalog'},location.origin);else location.href='./';};
list();detail();comparison();
