// Extra clothes live with each save, outside the fixed original item records.
export const OUTFITS = {
  budao:{name:'布道袍',slot:'coat',defense:3,agility:0,price:30,description:'素布缝成的长袍，衣襟收束，便于行路。朴素耐穿，不限门派。'},
  duanda:{name:'粗布短打',slot:'coat',defense:2,agility:2,price:40,description:'短衣窄袖，扎紧腰带便可上路。护身稍薄，转身进退更利落。'},
  clothboots:{name:'布履',slot:'boots',defense:0,agility:2,price:20,description:'布面千层底，轻便合脚。踏遍山路，总要有一双稳当的鞋。'},
  leatherboots:{name:'薄底快靴',slot:'boots',defense:0,agility:4,price:80,description:'软革靴面配薄底，束住脚踝，落步轻捷。适合行路与临阵进退。'},
  paddedrobe:{name:'夹棉袍',slot:'coat',defense:5,agility:-2,price:60,description:'内絮棉层，厚实护身。挡风耐寒，临阵转身却稍显沉重。'},
  leathercoat:{name:'软革劲装',slot:'coat',defense:4,agility:0,price:90,description:'熟革缝制的短衣，关节留有余地。护身与行走兼顾，适合长途闯荡。'},
  travelboots:{name:'厚底行靴',slot:'boots',defense:2,agility:1,price:60,description:'厚革包住足踝，重底抵挡磕碰。护身胜过轻履，临阵进退却不及薄底快靴。'},
};
export function normalizeWorn(raw={}) {
  if(!raw||typeof raw!=='object')throw Error('衣履穿戴记录不完整。');
  const out={};
  for(const slot of ['coat','boots'])if(raw[slot]){
    if(OUTFITS[raw[slot]]?.slot!==slot)throw Error('衣履部位不匹配。');
    out[slot]=raw[slot];
  }
  return out;
}
export function normalizeOutfit(raw) {
  if(raw==null)return {version:1,owned:{},wear:{}};
  if(raw.version!==1||!raw.owned||!raw.wear)throw Error('衣履存档格式不兼容。');
  const owned={},wear={},used={};
  for(const [id,value] of Object.entries(raw.owned)){
    if(!OUTFITS[id]||!(value===true||Number.isInteger(value)&&value>=1&&value<=6))throw Error('衣履行囊记录不完整。');
    owned[id]=value===1?true:value;
  }
  for(const [id,value] of Object.entries(raw.wear)){
    if(!/^\d+$/.test(id)||+id>319)throw Error('衣履人物记录不完整。');
    const worn=normalizeWorn(value);
    for(const item of Object.values(worn)){
      used[item]=(used[item]||0)+1;
      if(!owned[item]||used[item]>(owned[item]===true?1:owned[item]))throw Error('这类衣履的件数不够分配。');
    }
    if(Object.keys(worn).length)wear[id]=worn;
  }
  return {version:1,owned,wear};
}
