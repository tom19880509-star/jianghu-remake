import kits from './starter-equipment.json' with {type:'json'};
export const STARTER_KITS=kits;
export const STARTER_WEAPONS=Object.fromEntries(Object.entries(kits).filter(([,kit])=>!kit.native).map(([pid,kit])=>[300+Number(pid),{...kit,person:Number(pid)}]));
export const NPC_WEAPONS={410:{name:'寻常长剑',model:'sword',attack:0},411:{name:'寻常单刀',model:'blade',attack:0},412:{name:'行脚长棍',model:'wood-staff',attack:0},413:{name:'寻常软鞭',model:'plain-whip',attack:0},414:{name:'竹箫',model:'bamboo-flute',attack:0},415:{name:'素柄副剑',model:'sword',attack:0}};
export const INN_FOOD={401:{name:'热馒头',price:5,hp:0,stamina:15},402:{name:'温粥',price:10,hp:15,stamina:10}};
export const EXTRA_ITEM_IDS=[...Object.keys(STARTER_WEAPONS),...Object.keys(NPC_WEAPONS),...Object.keys(INN_FOOD)];
export const isStarterWeapon=id=>Number.isInteger(id)&&Object.hasOwn(STARTER_WEAPONS,id);
export const isEquipmentItem=id=>Number.isInteger(id)&&(id>=0&&id<=199||isStarterWeapon(id)||Object.hasOwn(NPC_WEAPONS,id));
export function normalizeStarterGrants(raw={}) {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('同行兵器记录不完整。');
 const grants={};for(const [pid,yes]of Object.entries(raw)){
  if(!(Object.hasOwn(kits,pid)||pid==='59-pair')||yes!==true)throw Error('同行兵器记录不完整。');
  grants[pid]=true;
 }
 return grants;
}
export function installStarterItems(items) {
 for(const [id,kit]of Object.entries({...STARTER_WEAPONS,...NPC_WEAPONS})) {
  const t={...items[114]};
  for(const k of Object.keys(t))if(k.startsWith('加')||k.startsWith('需'))t[k]=0;
  Object.assign(t,{'代号':+id,'名称':kit.name,'名称2':kit.name,'物品说明':'同行时带来的寻常兵器，朴素耐用，可作行路防身之用。','类型':1,'装备类型':0,'使用人':-1,'练出武功':-1,'仅修炼人物':-1,'需内力性质':2,'加攻击力':kit.attack});
  items[id]=t;
 }
 for(const [id,food]of Object.entries(INN_FOOD)){
  const t={...items[1]};for(const k of Object.keys(t))if(k.startsWith('加'))t[k]=0;
  Object.assign(t,{'代号':+id,'名称':food.name,'名称2':food.name,'物品说明':'客栈备下的寻常饭食，暖胃充饥，略补行路的消耗；不能解毒或医治重伤。','类型':3,'装备类型':-1,'使用人':-1,'练出武功':-1,'加生命':food.hp,'加体力':food.stamina});items[id]=t;
 }
 return items;
}
