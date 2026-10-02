import {STARTER_WEAPONS} from './starter-equipment.js';
import {OUTFITS} from './outfit.js';
import {PROVISIONS} from './provision-art.js';
import {gearIcon} from './equipment-art.js';
import {itemEffects} from './collection-ui.js';
const lore={sword:'剑身平直，双面开刃。是行走江湖最常见的佩剑，适合施展寻常剑招。',blade:'单面开刃的寻常刀具，刀背厚实，握柄牢靠，劈砍利落。',woodcutter:'短刃厚背，木柄经年磨得光滑。原为砍柴削枝之用，也能临时防身。',dagger:'刃短易藏，取用方便，近身时才显出灵便。', 'wood-sword':'木制剑身不设利刃，供初学者演练剑招，练功重在架势与分寸。','wood-staff':'结实木料削成的长棍，没有雕饰，既可支撑山路，也可迎敌。','plain-whip':'熟皮编成长鞭，卷起可挂腰间，出手须留回旋余地。','bamboo-flute':'竹管开孔，色泽朴素，平日吹奏，也可施展适合短棍的招式。','small-hoe':'木柄配短铁锄头，原是采药掘根的家什，急难时可作防身之用。','iron-shears':'铁制双刃交合，以铆钉贯接，形制与刀剑迥异。'};
export function commonCatalog(content,label){
 const seen=new Set(),rows=[];
 for(const [id,w]of Object.entries(STARTER_WEAPONS)){
  if(seen.has(w.name))continue;seen.add(w.name);
  rows.push({id:+id,kind:'weapon',group:'兵器',name:w.name,description:lore[w.model],effects:[`攻击 +${w.attack}`],source:'部分同伴入队时自带；装备只增强适用的兵器招式。'});
 }
 for(const id of [111,112,113,114,118,119]){const t=content.items[id];rows.push({id,kind:'weapon',group:'兵器',name:label(t['名称']),description:id<118?'江湖行路所用的直剑，剑刃、护手与握柄俱全。各柄兵器的攻守长处不同，择合手者佩用。':'江湖刀客使用的单刀，单面开刃。临阵威力与轻便程度，以兵器的实际加成为准。',effects:itemEffects(t),source:'通过探索或相应商店获得；获取路线留待行路时发现。'});}
 for(const [id,p]of Object.entries(PROVISIONS)){
  const t=content.items[id];if(!t)continue;
  rows.push({id:+id,kind:'medicine',group:+id>=400||+id===0?'吃食':'补品',name:+id>=400?t['名称']:label(t['名称']),description:p.text,effects:p.effects||itemEffects(t),source:+id===0?'开局随身携带；具体用途须留意交谈。':+id>=400?'向客栈掌柜购买。':'可通过探索或相应商店获得；出售种类以商店实际货品为准。'});
 }
 for(const [id,o]of Object.entries(OUTFITS))rows.push({id:'outfit:'+id,kind:o.slot==='boots'?'boots':'armor',group:'衣履',name:o.name,description:o.description,effects:[o.defense&&`防御 +${o.defense}`,o.agility&&`战斗轻功 ${o.agility>0?'+':''}${o.agility}`].filter(Boolean),source:`韦小宝出售 · ${o.price} 两。`});
 return rows;
}
export function mountItemCatalog({content,label,beforeOpen}){
 const d=document.createElement('dialog');d.id='item-catalog';d.setAttribute('aria-labelledby','item-catalog-title');
 d.innerHTML='<header><div><small>行走江湖 · 常备之物</small><h2 id="item-catalog-title">百物图鉴</h2></div><button aria-label="关闭百物图鉴">×</button></header><div class="catalog-toolbar"><nav aria-label="物品类别"></nav><input type="search" aria-label="搜索百物图鉴" placeholder="寻一件物品…"></div><div class="catalog-body"><div class="catalog-list"></div><article class="catalog-detail" aria-live="polite"></article></div>';
 document.querySelector('#stage').append(d);const rows=commonCatalog(content,label),list=d.querySelector('.catalog-list'),detail=d.querySelector('article');let group='全部',selected;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
 function choose(r){selected=r;for(const b of list.children)b.setAttribute('aria-pressed',String(b.dataset.id===String(r.id)));detail.replaceChildren();const art=el('div','catalog-art');art.append(gearIcon(r.kind,r.id));detail.append(art,el('small','catalog-category',r.group+' · 行路常备'),el('h3','',r.name),el('p','',r.description));const effects=el('div','catalog-effects');for(const s of r.effects)effects.append(el('span','',s));detail.append(effects,el('p','catalog-source',r.source),el('small','catalog-note','图鉴只供查阅；使用效果以当前人物与战斗状态为准。'));detail.scrollTop=0;}
 function render(){const term=d.querySelector('input').value.trim();const visible=rows.filter(r=>(group==='全部'||r.group===group)&&r.name.includes(term));list.replaceChildren();for(const r of visible){const b=el('button','');b.dataset.id=r.id;b.append(gearIcon(r.kind,r.id),el('span','',r.name));b.onclick=()=>choose(r);list.append(b);}if(visible.length)choose(visible.find(r=>r.id===selected?.id)||visible[0]);else detail.replaceChildren(el('p','','未找到这件物品。换个名称再找找。'));}
 for(const name of ['全部','兵器','衣履','补品','吃食']){const b=el('button','',name);b.setAttribute('aria-pressed',String(name===group));b.onclick=()=>{group=name;for(const x of b.parentElement.children)x.setAttribute('aria-pressed',String(x===b));render();};d.querySelector('nav').append(b);}
 d.querySelector('input').oninput=render;d.querySelector('header button').onclick=()=>d.close();d.addEventListener('close',beforeOpen);
 return {open(){beforeOpen();render();d.showModal();}};
}
