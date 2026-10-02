import {appendMartialLore,appendRequirements,martialEntry} from './martial-lore.js';
import ITEM_GRADES from './item-grade-data.json' with {type:'json'};
import {gradeView,collectionGradeMode,itemGradeInfo,paintGrade,gradeBadges,appendGradeCosts} from './grade157.js';
import {itemPicture,hasItemArt} from './item-art.js';
import {ARMOR_LORE} from './equipment-art.js';
import {martialCategory} from './martial-identities.js';
import {drawWeaponRack,hasWeaponModel} from './weapon-models.js';
import {battleSkillText} from './battle-preview-text.js';
// Device-local favourites; never stored inside the original game records.
const PREF_KEY='jy-action-preferences-v1';
export function createActionPreferences(storage) {
 let data={};try {const parsed=JSON.parse(storage?.getItem(PREF_KEY)||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))data=parsed;}catch{}
 const key=(kind,person,id)=>`${kind}:${kind==='skill'?person:0}:${id}`;
 const get=(kind,person,id)=>{const v=data[key(kind,person,id)];return {pin:v?.pin===true,count:Number.isFinite(v?.count)?Math.max(0,Math.min(10000,v.count)):0,last:Number.isFinite(v?.last)?v.last:0};};
 const save=()=>{try{storage?.setItem(PREF_KEY,JSON.stringify(data));}catch{}};
 return {get,record(kind,person,id){const k=key(kind,person,id),v=get(kind,person,id);data[k]={...v,count:Math.min(10000,v.count+1),last:Date.now()};save();},
  pin(kind,person,id){const k=key(kind,person,id),v=get(kind,person,id);data[k]={...v,pin:!v.pin};save();},
  forget(kind,person,id){delete data[key(kind,person,id)];save();},
  sort(rows,kind,person){return rows.map((r,i)=>({r,i,p:get(kind,person,r.id)})).sort((a,b)=>Number(b.p.pin)-Number(a.p.pin)||b.p.count-a.p.count||b.p.last-a.p.last||a.i-b.i).map(x=>x.r);}};
}
const categories=['剧情','装备','秘籍','药品','暗器'];
export function itemEffects(t) {
 if(t.growthRule)return [t.growthDescription];
 if(t.customEffect)return [t.customEffect];
 const parts=[];
 for(const [key,label] of [['加生命','气血'],['加内力','内力'],['加体力','体力'],['加生命最大值','气血上限'],['加内力最大值','内力上限'],['加攻击力','攻击'],['加防御力','防御'],['加轻功','轻功'],['加医疗能力','医疗'],['加用毒能力','用毒'],['加解毒能力','解毒能力'],['加抗毒能力','抗毒'],['加拳掌功夫','拳掌'],['加御剑能力','御剑'],['加耍刀技巧','耍刀'],['加特殊兵器','特殊兵器'],['加暗器技巧','暗器'],['加武学常识','武学常识'],['加攻击带毒','攻击带毒']]) {
  const n=t[key]||0;if(!n)continue;
  if(t['类型']===4&&key==='加生命')parts.push('暗器威力 '+Math.abs(n));
  else parts.push(n>=5000&&(key==='加生命'||key==='加内力')?label+'补满':label+(n>0?' +':' ')+n);
 }
 if(t['加中毒解毒']<0)parts.push('解毒 '+Math.floor(-t['加中毒解毒']/2));
 if(t['加中毒解毒']>0)parts.push((t['类型']===4?'淬毒 ':'带毒 ')+t['加中毒解毒']);
 if(t['改变内力性质']===2)parts.push('调和阴阳内力');
 return parts;
}
export function itemRequirements(t,label,people) {
 if(![1,2].includes(t['类型']))return [];
 const rows=[];
 if(t['仅修炼人物']>=0)rows.push('仅限'+label(people[t['仅修炼人物']]?.['姓名']||'指定人物'));
 if(t['需内力性质']!==2)rows.push((t['需内力性质']===0?'阴性':'阳性')+'或调和内力');
 for(const field of ['内力','攻击力','轻功','用毒能力','医疗能力','解毒能力','拳掌功夫','御剑能力','耍刀技巧','特殊兵器','暗器技巧','资质']){
  const n=t['需'+field];if(n)rows.push((field==='内力'?'内力上限':field)+(n<0?' ≤ ':' ≥ ')+Math.abs(n));
 }
 return rows;
}
// ui156 隐藏资格: some manuals are discoveries. Their pages may say a character
// cannot learn them yet, never why. Lua keeps deciding; only the wording shown
// on the character sheet, the pack and the loadout list is filtered here.
// `pattern` also covers the keyless "reason" line practice-extension appends.
export const HIDDEN_BOOK_CONDITIONS={91:{keys:['资质','dual'],pattern:/资质|心性|郭靖|小龙女|周伯通/}};
export function maskRequirements(rows,bookId) {
 const list=Object.values(rows||{}).filter(Boolean);
 const rule=HIDDEN_BOOK_CONDITIONS[bookId];if(!rule)return list;
 let unmet=false;
 const kept=list.filter(r=>{
  if(!(rule.keys.includes(r.key)||rule.pattern.test(String(r.text||''))))return true;
  if(!r.met)unmet=true;return false;
 });
 if(unmet)kept.push({key:'hidden',text:'尚不可学',met:false});
 return kept;
}
export function maskReason(text,bookId) {
 const rule=HIDDEN_BOOK_CONDITIONS[bookId];
 return rule&&rule.pattern.test(String(text||''))?'尚不可学':text;
}
export function medicineNotice(t) {
 return t?.useReason||(t?.['类型']===3&&!t.customUse&&itemEffects(t).length===0?'当前版本未设置药效，暂不可使用。':'');
}
// Shop batches (ui155b): Lua settles every piece on its own and stays the authority;
// these helpers only bound the request the page may send. `max` comes from Lua
// (silver, stock and bag room); older callers without it fall back to silver and stock.
export const SHOP_BULK_LIMIT=99;
export function shopQuantityCap(row,money) {
 if(!row||row.disabled)return 1;
 const bySilver=row.price>0?Math.floor((money||0)/row.price):SHOP_BULK_LIMIT,byStock=row.unlimited?SHOP_BULK_LIMIT:(row.num||0);
 const cap=Number.isInteger(row.max)?row.max:Math.min(bySilver,byStock);
 return Math.max(1,Math.min(SHOP_BULK_LIMIT,cap));
}
export function shopQuantity(wanted,cap) {
 return Math.max(1,Math.min(cap,Number.isFinite(wanted)?Math.floor(wanted):cap));
}
// One piece keeps the original numeric answer; a batch travels as "<id>x<count>".
export const shopAnswer=(id,quantity)=>quantity>1?`${id}x${quantity}`:id;
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
// ui394 手机 QA F2：战斗选招的兵器说明是逐招拼出来的，同一句（「空手施展：…」「拳掌功夫 36：…」）
// 在每一行重复，手机上一屏只露 1.5 招。两招以上共有、且带「某某：」抬头的句子只在招式列表末尾写一次，
// 对应的行只留抬头作小签（如「空手施展」「拳掌功夫 36」），哪句管哪招仍看得出；只属一招的句子照旧整句留在该行。
export function splitSkillNotes(rows) {
 const parts=row=>[...new Set((String(row?.note||'').match(/[^。]+。?/g)||[]).map(s=>s.trim()).filter(Boolean))];
 const head=s=>{const i=s.indexOf('：');return i>0&&i<=12?s.slice(0,i):'';};
 const count=new Map();for(const row of rows)for(const s of parts(row))count.set(s,(count.get(s)||0)+1);
 const shared=[...count.keys()].filter(s=>count.get(s)>1&&head(s));
 const own=new Map(rows.map(row=>{const p=parts(row);return [row,{tags:p.filter(s=>shared.includes(s)).map(head),note:p.filter(s=>!shared.includes(s)).join('')}];}));
 return {shared,own};
}
// Battle bag order: medicines with a clear use first (气血 → 内力/体力 → 解毒),
// then darts; anything that cannot be used right now sinks to the bottom even
// if it was pinned. Pins and real usage still lead within the usable group.
export function itemPurposeRank(t) {
 if(!t||medicineNotice(t))return 9;
 if(t['类型']===3){
  if(t['加生命']>0||t.customUse)return 0;
  if(t['加内力']>0||t['加体力']>0)return 1;
  if(t['加中毒解毒']<0)return 2;
  return 3;
 }
 return t['类型']===4?4:5;
}
export function battleItemOrder(rows,item,sort) {
 const ranked=rows.map((r,i)=>({r,i,k:itemPurposeRank(item(r))})).sort((a,b)=>a.k-b.k||a.i-b.i);
 const sorted=sort(ranked.map(x=>x.r)),rank=new Map(ranked.map(x=>[x.r,x.k]));
 return sorted.filter(r=>rank.get(r)!==9).concat(sorted.filter(r=>rank.get(r)===9));
}
function itemDescription(text) {
 const paragraph=el('p','item-description'),copy=String(text??'');
 let end=0;
 // Keep map coordinates together on narrow screens without changing source text.
 for(const match of copy.matchAll(/[（(]\s*([0-9０-９]{1,3})\s*[，,]\s*([0-9０-９]{1,3})\s*[）)]/g)) {
  paragraph.append(document.createTextNode(copy.slice(end,match.index)));
  paragraph.append(el('span','item-coordinates',`（${match[1].normalize('NFKC')}，${match[2].normalize('NFKC')}）`));
  end=match.index+match[0].length;
 }
 paragraph.append(document.createTextNode(copy.slice(end)));
 return paragraph;
}
export function mountCollectionUI({content,label,beforeOpen,preferences}) {
 const panel=el('dialog','collection-panel');panel.id='collection-menu';panel.setAttribute('aria-labelledby','collection-title');
 document.querySelector('#stage').append(panel);
 const item=row=>row.details||content.items[row.id];
 const description=row=>row.id===186
  ? '南贤与北丑爱食此果。可当面赠予，换取江湖线索；不直接增加人物资质或修炼心得。'
  : ARMOR_LORE[row.id]||(row.details?row.details['物品说明']:label(content.items[row.id]['物品说明']));
 let finish=null,answer=-1,model=null,selected=null,filter='all',query='',quantity=1,quantityFor=null;
 const close=value=>{answer=value;panel.close();};
 // 157 品第：只是名字着色与朱批，不改任何数值。战斗技能选单与战中行囊不着色；货摊上摆出来的货就是玩家正看着的，算见过。
 const gradeOf=row=>{
  const mode=collectionGradeMode(model);if(mode==='off')return null;
  const t=item(row),found=itemGradeInfo(row.id,t,ITEM_GRADES,o=>martialEntry({...o,name:t?.loreName||row.name}));if(!found)return null;
  return {...gradeView(found.info,{seen:true,axis:found.axis}),seen:true};
 };
 panel.addEventListener('close',()=>{document.body.classList.remove('collection-open');beforeOpen();const done=finish;finish=null;model=null;done?.(answer);document.querySelector('#game').focus();});
 panel.addEventListener('cancel',()=>{answer=-1;});
 const icon=(id,large=false,rowName=null)=>{
  const alt=rowName||label(content.items[id]?.['名称']||'物品');
  // 家中兵器架的选单仍画成木架陈列；其余一律用 item-art 的去底像素图，只按 40 的整倍数放大。
  if(model.displayWeapons&&hasWeaponModel(id)){
   const canvas=el('canvas',large?'item-illustration':'item-icon');canvas.width=canvas.height=large?192:96;
   canvas.setAttribute('role','img');canvas.setAttribute('aria-label',alt+' · 木架陈列');
   const g=canvas.getContext('2d'),scale=canvas.width/80;g.scale(scale,scale);drawWeaponRack(g,id,40,60);return canvas;
  }
  if(hasItemArt(id))return itemPicture(id,large?120:80,{className:large?'item-illustration item-art':'item-icon item-art',alt});
  const im=el('img',large?'item-illustration':'item-icon');im.src=`assets/items/${id}.png`;im.alt=alt;im.width=im.height=large?120:80;return im;
 };
 function star(row) {
  const pinned=preferences.get(model.kind,model.person,row.id).pin;
  const b=el('button','collection-star',pinned?'★':'☆');b.type='button';b.setAttribute('aria-label',(pinned?'取消常用 ':'设为常用 ')+row.name);b.setAttribute('aria-pressed',String(pinned));
  b.onclick=()=>{preferences.pin(model.kind,model.person,row.id);renderList();renderDetails();};return b;
 }
 function visibleRows(){
  const sort=rows=>preferences.sort(rows,model.kind,model.person);
  return (model.battle&&model.kind==='item'?battleItemOrder(model.rows,item,sort):sort(model.rows)).filter(r=>{
   if(query&&!r.name.toLowerCase().includes(query.toLowerCase()))return false;
   const t=item(r);
   if(filter==='sellable')return !r.disabled;
   if(filter==='protected')return !!r.disabled;
   if(filter==='pinned')return preferences.get(model.kind,model.person,r.id).pin;
   if(filter==='hp')return t['类型']===3&&t['加生命']>0;
   if(filter==='mp')return t['类型']===3&&(t['加内力']>0||t['加体力']>0);
   if(filter==='poison')return t['类型']===3&&t['加中毒解毒']<0;
   return filter==='all'||t['类型']===Number(filter);
  });
 }
 function renderList(){
  const list=panel.querySelector('.collection-list');list.replaceChildren();
  const rows=visibleRows();
  if(!rows.some(r=>r.id===selected))selected=rows[0]?.id??null;
  const notes=model.kind==='skill'?splitSkillNotes(rows):null;
  for(const row of rows){
   const wrap=el('div','collection-entry');wrap.dataset.id=row.id;
   const b=el('button','collection-select');b.type='button';b.dataset.id=row.id;
   b.setAttribute('aria-label',row.name+(row.num?' ×'+row.num:''));b.setAttribute('aria-pressed',String(row.id===selected));
   if(model.kind==='item')b.append(icon(row.id,false,row.name));
   const copy=el('span','collection-copy'),grade=model.kind==='item'?gradeOf(row):null;copy.append(paintGrade(el('strong','',row.name),grade),...gradeBadges(grade));
   if(model.kind==='skill'){
    const own=notes.own.get(row);
    if(own.tags.length){const tags=el('span','skill-note-tags');tags.append(...own.tags.map(t=>el('small','note-tag',t)));copy.append(tags);}
    const tactical=battleSkillText(row.preview,row.enabled);
    if(row.summary)copy.append(el('small','',row.summary));
    else if(tactical){
     copy.append(el('small','',`${row.ordinary?'基础动作':`${row.level}${row.rankUnit??'级'}`} · ${tactical.cost} · ${tactical.scope}`));
     copy.append(el('small','skill-coverage'+(row.preview.maxTargets>0?'':' unreachable'),tactical.coverage));
     if(tactical.warning)copy.append(el('small','item-note',tactical.warning));
    }
    else copy.append(el('small','',row.ordinary?`基础动作 · 内力 ${row.cost} · 近身 ${row.range}格`:`${row.level}${row.rankUnit??'级'} · 内力 ${row.cost} · ${['点攻','直线','十字','范围'][row.shape]} ${row.range}格`));
    if(own.note)copy.append(el('small','item-note',own.note));
    if(!row.enabled)copy.append(el('small','unavailable',row.disabledReason||(model.stamina<10?'体力不足':'内力不足')));
    b.disabled=!row.enabled;
   }else{
    copy.append(el('small','',model.trade?(row.reason||`${categories[item(row)['类型']]} · ${model.trade==='sell'?'收购':'赎回'} ${row.price} 两 · ×${row.num}`):model.shop?`${categories[item(row)['类型']]} · ${row.price} 两 · ${row.unlimited?(row.staple?'常备':'现做'):row.num>0?'余 '+row.num:'售罄'}`:model.battle?(medicineNotice(item(row))||itemEffects(item(row)).slice(0,2).join(' · ')||description(row)):`${categories[item(row)['类型']]} · ${row.num===undefined?row.tags||'':`×${row.num}`}`));
    if(model.battle)copy.append(el('span','item-count','×'+row.num));
   }
   b.append(copy);
   b.onclick=()=>{if(model.kind==='skill')return close(row.slot);selected=row.id;for(const x of list.querySelectorAll('.collection-select'))x.setAttribute('aria-pressed',String(+x.dataset.id===selected));renderDetails();};
   wrap.append(b,star(row));list.append(wrap);
  }
  // 共有说明放在招式之后：先看得到能出哪几招，行内小签对应这里的整句。
  if(notes?.shared.length){const box=el('div','skill-shared-notes');box.append(el('small','skill-shared-title','小签说明'),...notes.shared.map(s=>el('small','item-note',s)));list.append(box);}
  if(!rows.length)list.append(el('p','collection-empty',filter==='pinned'?'尚未设定常用，点物品旁的 ☆ 即可置前。':filter==='sellable'&&!query?'没有可出售的闲置物品，可在「暂不收」查看缘由。':filter==='protected'&&!query?'这批物件小宝都能收购。':'没有符合的物品。'));
 }
 function renderDetails(){
  const pane=panel.querySelector('.collection-detail');if(!pane)return;
  pane.replaceChildren();const row=model.rows.find(r=>r.id===selected);
  const use=panel.querySelector('.collection-use');use.disabled=!row||row.disabled;
  const bulk=panel.querySelector('.shop-quantity');
  if(bulk){
   if(quantityFor!==selected){quantity=1;quantityFor=selected;}
   const cap=row?shopQuantityCap(row,model.money):1;quantity=shopQuantity(quantity,cap);
   bulk.querySelector('.shop-quantity-value').textContent=String(quantity);
   for(const b of bulk.querySelectorAll('button')){
    const to=b.dataset.to;
    b.disabled=!row||row.disabled||(to==='less'?quantity<=1:to==='more'?quantity>=cap:to==='most'?cap<=1||quantity>=cap:Number(to)>cap||Number(to)===quantity);
   }
  }
  if(!row){use.textContent='选择物品';return;}
  const t=item(row),name=row.name;
  const medicineWarning=medicineNotice(t);
  if(medicineWarning&&!model.shop)use.disabled=true;
  if(!model.battle)pane.append(icon(row.id,true,name));
  const grade=gradeOf(row);pane.append(paintGrade(el('h3','',name),grade),...gradeBadges(grade));
  if(model.trade)pane.append(el('p','item-owner',`${model.trade==='sell'?'收购':'赎回'} ${row.price} 两 · 银两 ${model.money}`));
  if(model.shop)pane.append(el('p','item-owner',`售价 ${row.price} 两 · 现有 ${model.money} 两 · ${row.unlimited?(row.goods?'常备货品，不限件数':row.staple?'常备药品，不限件数':'现做饭食'):'剩余 '+row.num+' 件'}`));
  if(row.owner||row.tags)pane.append(el('p','item-owner',row.tags||(row.owner+'持有')));
  const effects=itemEffects(t);
  if(medicineWarning)pane.append(el('p','unavailable',medicineWarning));
  if(!model.battle&&!model.shop&&t['类型']!==2)pane.append(itemDescription(description(row)));
  if(!model.battle&&t['类型']===2){pane.append(el('p','item-category',martialCategory(row.id)));appendMartialLore(pane,{bookId:row.id,name:t.loreName||name,seen:!!grade?.seen});}
  else if(grade)appendGradeCosts(pane,grade);
  const canonNote=!model.battle&&ITEM_GRADES.items[row.id]?.note;if(canonNote)pane.append(el('p','item-canon-note',canonNote));
  if(effects.length&&!model.battle)pane.append(el('h4','',t['类型']===2?'修炼收益':t['类型']===1?'装备效果':'物品效果'));
  const facts=el('div','item-effects');for(const effect of effects)facts.append(el('span','',effect));pane.append(facts);
  if(model.shop&&t['类型']!==2)pane.append(itemDescription(description(row)));
  if(!model.battle){
   if(t['类型']===2&&t['练出武功']>=0)pane.append(el('p','',`可修炼：${label(content.skills[t['练出武功']]?.['名称']||'')}`));
   const req=itemRequirements(t,label,content.people);
   const learners=Object.values(row.learners||{});
   if(learners.length){
    const caption=el('label','study-person-label','按修炼者核对：'),select=el('select','study-person');
    for(const person of learners){const opt=el('option','',person.name);opt.value=person.id;select.append(opt);}
    select.value=String(learners.some(p=>p.id===model.studyPerson)?model.studyPerson:learners[0].id);
    select.onchange=()=>{model.studyPerson=Number(select.value);renderDetails();};caption.append(select);pane.append(caption);
    const person=learners.find(p=>String(p.id)===select.value);appendRequirements(pane,maskRequirements(person.requirements,row.id),{name:person.name});
   }else if(req.length){pane.append(el('h4','','装备 / 修炼条件'));pane.append(el('p','item-requirements',req.join(' · ')));}

   if(t['类型']===3&&t['加生命']>0&&t['加生命']<5000)pane.append(el('small','item-note','疗伤数值受伤势影响，并有少许浮动。'));
   if(t['类型']===4)pane.append(el('small','item-note','须在战斗中选定目标使用。实际伤害取决于暗器技巧与敌人伤势；中毒程度还受敌人抗毒能力影响。'));
  }
  if(row.disabled)pane.append(el('p','unavailable',row.reason|| (model.shop?(row.num<=0?'此物已售罄':'银两不足'):row.current?'已配备此物':'当前人物条件不足')));
  use.textContent=model.verb|| (model.trade?`${model.trade==='sell'?'出售':'赎回'}一件 · ${row.price} 两`:model.shop?(bulk&&quantity>1?`购买 ${quantity} 件 · 共 ${quantity*row.price} 两`:`购买一件 · ${row.price} 两`):model.action?`${model.action==='book'?'修炼':'装备'} · ${name}`:model.battle?`${t['类型']===4?'选取目标':'使用'} · ${name}`:[ '使用此物','选择装备者','选择修炼者','选择使用者','使用此物' ][t['类型']]||'使用此物');
  if(medicineWarning&&!model.shop)use.textContent='暂不可使用';
 }
 function render(){
  panel.className='collection-panel'+(model.battle?' compact':'')+(model.shop?' shop-picker':'')+(model.kind==='skill'?' skill-picker':'');
  panel.replaceChildren();
  const heading=el('div','collection-heading'),title=el('h2','',model.title|| (model.shop?(model.title||'小宝货摊'):model.kind==='skill'?model.name+' · 招式':model.action?model.name+' · '+({weapon:'兵器',armor:'防具',book:'秘籍'}[model.action]):model.battle?'战中行囊':'行囊'));title.id='collection-title';
  const back=el('button','collection-close','×');back.type='button';back.setAttribute('aria-label','返回游戏');back.onclick=()=>close(-1);heading.append(title,back);panel.append(heading);
  if(model.kind==='skill')panel.append(el('p','collection-caption',`内力 ${model.mp} · 常用优先，选招后确认目标`));
  else{
   const nav=el('div','collection-tabs');nav.setAttribute('aria-label','物品分类');
   const tabs=model.displayWeapons?[['all','兵器'],['pinned','常用']]:model.trade==='sell'?[['sellable',`可出售 ${model.rows.filter(r=>!r.disabled).length}`],['2','秘籍'],['1','装备'],['protected',`暂不收 ${model.rows.filter(r=>r.disabled).length}`],['all','全部']]:model.trade==='redeem'?[['all','全部'],['2','秘籍'],['1','装备']]:model.battle?[['all','全部'],['hp','补血'],['mp','回气'],['poison','解毒'],['4','暗器'],['pinned','常用']]:model.action?[['all','全部'],['pinned','常用']]:[['all','全部'],['3','药品'],['1','装备'],['2','秘籍'],['0','剧情'],['4','暗器'],['pinned','常用']];
   for(const [value,name]of tabs){const b=el('button','',name);b.type='button';b.setAttribute('aria-pressed',String(filter===value));b.onclick=()=>{filter=value;for(const x of nav.children)x.setAttribute('aria-pressed',String(x===b));renderList();renderDetails();};nav.append(b);}panel.append(nav);
   if(!model.battle){const search=el('input','collection-search');search.type='search';search.placeholder='寻找物品…';search.setAttribute('aria-label','寻找物品');search.oninput=()=>{query=search.value;renderList();renderDetails();};panel.append(search);}
  }
  const body=el('div','collection-body');body.append(el('div','collection-list'));if(model.kind==='item')body.append(el('section','collection-detail'));panel.append(body);
  const footer=el('div','collection-footer');
  const cancel=el('button','','返回');cancel.type='button';cancel.onclick=()=>close(-1);footer.append(cancel);
  if(model.kind==='item'){
   if(model.shop&&model.bulk){
    footer.classList.add('with-quantity');
    const group=el('div','shop-quantity');group.setAttribute('role','group');group.setAttribute('aria-label','购买数量');
    const step=(text,to,name)=>{const b=el('button','',text);b.type='button';b.dataset.to=to;b.setAttribute('aria-label',name);b.onclick=()=>{quantity=to==='less'?quantity-1:to==='more'?quantity+1:to==='most'?Infinity:Number(to);renderDetails();};return b;};
    const value=el('output','shop-quantity-value','1');value.setAttribute('aria-live','polite');value.setAttribute('aria-label','件数');
    group.append(step('－','less','减少一件'),value,step('＋','more','增加一件'),step('×1','1','买一件'),step('×5','5','买五件'),step('×10','10','买十件'),step('最多','most','按银两、存货与行囊买到上限'));
    footer.append(group);
   }
   const use=el('button','collection-use','选择物品');use.type='button';use.onclick=()=>{if(!use.disabled&&selected!==null&&!model.rows.find(r=>r.id===selected)?.disabled)close(model.shop&&model.bulk?shopAnswer(selected,quantity):selected);};footer.append(use);
  }
  panel.append(footer);renderList();renderDetails();
 }
 return {show(data){beforeOpen();answer=-1;model={kind:'item',person:0,...data};filter=model.trade==='sell'?'sellable':'all';query='';selected=null;quantity=1;quantityFor=null;render();document.body.classList.add('collection-open');panel.showModal();panel.querySelector('.collection-select:not(:disabled)')?.focus();return new Promise(resolve=>{finish=resolve;});}};
}
