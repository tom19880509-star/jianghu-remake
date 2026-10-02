import {STARTER_WEAPONS,NPC_WEAPONS} from './starter-equipment.js';
// All coordinates are drawing units, not canonical physical measurements.
// Battle hands and home racks resolve the same model by real item identity.
export const WEAPON_MODELS={
 'wood-sword':{name:'练武木剑',family:'sword',length:39,width:4,metal:'#917453',edge:'#be9a66',grip:'#65543c',guard:'#99774d'},
 woodcutter:{name:'柴刀',family:'blade',length:30,width:8,metal:'#737c78',edge:'#bdc2af',grip:'#785636',guard:'#66513b'},
 dagger:{name:'护身短刃',family:'sword',length:25,width:4,metal:'#96a29b',edge:'#d2d6be',grip:'#704e36',guard:'#978567'},
 'wood-staff':{name:'行脚木杖',family:'staff',length:66,width:3,metal:'#786440',edge:'#aa9362',grip:'#5a4932'},
 'bamboo-flute':{name:'竹箫',family:'staff',length:41,width:3,metal:'#a99a63',edge:'#d0c690',grip:'#847a4e'},
 'small-hoe':{name:'采药短锄',family:'hoe',length:36,width:3,metal:'#747e72',edge:'#b3b9a7',grip:'#816944',guard:'#747e72'},
 'iron-shears':{name:'铁剪',family:'shears',length:41,width:4,metal:'#747f7b',edge:'#b9c0ac',grip:'#6c5240'},
 'plain-whip':{name:'旧皮鞭',family:'whip',length:61,width:2,metal:'#806047',edge:'#b48a5c',grip:'#68513d'},
 sword:{name:'普通直剑',family:'sword',length:43,width:3,metal:'#bcc7c1',edge:'#eef0dd',grip:'#756344',guard:'#b5a278'},
 blade:{name:'普通单刀',family:'blade',length:45,width:6,metal:'#879d9b',edge:'#e1e6d0',grip:'#71533b',guard:'#a68b52'},
 heavy:{name:'玄铁剑',family:'heavy',length:54,width:9,metal:'#313b3d',edge:'#666c63',grip:'#332c24',guard:'#615444'},
 yitian:{name:'倚天剑',family:'sword',length:51,width:3.4,metal:'#bed3d2',edge:'#fffbe6',grip:'#425e51',guard:'#c9ab69'},
 tulong:{name:'屠龙刀',family:'blade',length:55,width:11,metal:'#333b3a',edge:'#9da593',grip:'#5a3029',guard:'#a78347'},
 blood:{name:'血刀',family:'blade',length:48,width:5,metal:'#a69e93',edge:'#e0d9c3',grip:'#773c31',guard:'#a9915e',mark:'#8f4741'},
 'dog-staff':{name:'打狗棒',family:'staff',length:81,width:3,metal:'#49754c',edge:'#99ad6e',grip:'#3c5936'},
 'gold-snake':{name:'金蛇剑',family:'snake',length:45,width:5,metal:'#c8a151',edge:'#ffe4a0',grip:'#69502e',guard:'#d3aa59'},
 'iron-brush':{name:'判官笔',family:'brush',length:26,width:3,metal:'#465752',edge:'#8b9785',grip:'#5b5139',guard:'#a8966c'},
 'moda-needle':{name:'莫大琴中细剑',family:'sword',length:42,width:1.5,metal:'#acbcb8',edge:'#f1eee0',grip:'#684a37',guard:'#8c7660'},
};
export const WEAPON_MODEL_BY_ITEM={106:'heavy',107:'sword',108:'sword',109:'yitian',110:'gold-snake',111:'sword',112:'sword',113:'sword',114:'sword',115:'blood',116:'blade',117:'tulong',118:'blade',119:'blade',192:'sword',199:'iron-brush'};
for(const [id,kit]of Object.entries({...STARTER_WEAPONS,...NPC_WEAPONS}))WEAPON_MODEL_BY_ITEM[id]=kit.model;
export const weaponModelKey=id=>typeof id==='string'&&WEAPON_MODELS[id]?id:WEAPON_MODEL_BY_ITEM[id]??null;
export const weaponModel=id=>WEAPON_MODELS[weaponModelKey(id)]??null;
export const hasWeaponModel=id=>weaponModel(id)!==null;
function shape(g,points,fill,stroke='#252f28'){
 g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=.85;g.stroke();}
}
function drawGoldSnake(g,m){
 // A usable jian with one shallow serpentine wave, a green blood groove and
 // the novel's forked snake-tongue tip. The small curl is the tail/pommel.
 const L=m.length;
 shape(g,[[-12,-2],[5,-2],[5,2],[-12,2]],m.grip);
 g.strokeStyle=m.guard;g.lineWidth=2;g.beginPath();
 g.moveTo(-11,-1);g.bezierCurveTo(-16,-4,-17,3,-11,4);g.stroke();
 g.beginPath();
 g.moveTo(5,-2);g.bezierCurveTo(12,-4,16,-4,22,-1);
 g.bezierCurveTo(29,2,32,-3,39,-2);
 g.lineTo(L,-5);g.lineTo(L-2,-1);g.lineTo(L-5,0);
 g.lineTo(L-2,1);g.lineTo(L,4);g.lineTo(39,2);
 g.bezierCurveTo(32,1,29,6,22,3);
 g.bezierCurveTo(16,0,12,2,5,3);g.closePath();
 g.fillStyle=m.metal;g.fill();g.strokeStyle='#4f3f27';g.lineWidth=.9;g.stroke();
 g.strokeStyle=m.edge;g.lineWidth=1.15;g.beginPath();
 g.moveTo(7,-1);g.bezierCurveTo(15,-3,17,-2,22,0);
 g.bezierCurveTo(29,3,32,-2,39,-1);g.stroke();
 g.strokeStyle='#375e4d';g.lineWidth=.7;g.beginPath();
 g.moveTo(9,1);g.bezierCurveTo(16,-1,18,1,23,2);
 g.bezierCurveTo(30,4,33,0,40,0);g.stroke();
 shape(g,[[3,-5],[6,-4],[8,-1],[6,3],[3,5],[1,1]],m.guard,'#5b482c');
 g.fillStyle='#365d4b';g.fillRect(5,-1,1.8,1.8);
}
// ORIGIN CONTRACT (156B, answering reviews/actor156-interface-requests.md R1).
// (x,y) is the FIST CENTRE. +x runs out along the blade, so the guard sits just
// AHEAD of the caller's point, at +3..+7, and the handle trails BEHIND it to the
// family's butt:
//   sword / blade / heavy / snake / brush  -12   (grip -12..+5, blade +5..+L)
//   whip   -10      hoe   -13      shears  -14
//   staff  -0.38*length  (not a constant: 15.6 for the flute, 30.8 for the
//                         dog-beating staff — drawWeaponRack relies on the same
//                         two numbers, so keep them in step.)
// gripGap clips |x|<=4 so drawn fingers can close over the handle; hero-weapon-rig
// leaves it off and lets sprites.js repaint the real knuckles instead. Placement
// tables therefore aim at the hand, never at the guard and never at the pommel.
export function drawWeaponModel(g,id,x,y,angle=0,scale=1,{gripGap=false}={}){
 const m=weaponModel(id);if(!m)return false;
 g.save();g.translate(x,y);g.rotate(angle);g.scale(scale,scale);
 if(gripGap){g.beginPath();g.rect(-110,-35,106,70);g.rect(4,-35,110,70);g.clip();}
 const L=m.length,w=m.width;
 if(m.family==='whip'){
  shape(g,[[-10,-2],[6,-2],[6,2],[-10,2]],m.grip);
  g.strokeStyle=m.metal;g.lineWidth=2;g.beginPath();g.moveTo(6,0);for(const [px,py]of [[22,-7],[34,-4],[44,6],[L,8]])g.lineTo(px,py);g.stroke();
 }else if(m.family==='hoe'){
  shape(g,[[-13,-2],[L,-2],[L,2],[-13,2]],m.grip);
  shape(g,[[L-5,-3],[L+3,-3],[L+1,13],[L-9,17],[L-7,8]],m.metal);
 }else if(m.family==='shears'){
  shape(g,[[-12,-8],[4,-2],[L,-5],[L-7,0],[4,2],[-12,9],[-14,5],[-1,0],[-14,-4]],m.metal);
  shape(g,[[4,-2],[L,5],[L-7,8],[4,2]],m.metal);
 }else if(m.family==='staff'){
  shape(g,[[-L*.38,-w/2],[L*.62,-w/2],[L*.62,w/2],[-L*.38,w/2]],m.metal);
  g.fillStyle=m.edge;g.fillRect(-L*.38,-w/2,L, .7);
  g.fillStyle='#354d32';for(let a=-L*.38+7;a<L*.62;a+=13)g.fillRect(a,-w/2-.5,2,w+1);
 }else if(m.family==='snake'){
  drawGoldSnake(g,m);
 }else{
  shape(g,[[-12,-2.5],[5,-2.5],[5,2.5],[-12,2.5]],m.grip);
  g.strokeStyle=m.guard||m.edge;g.lineWidth=1;for(let a=-9;a<3;a+=3){g.beginPath();g.moveTo(a,-2);g.lineTo(a+2,2);g.stroke();}
  if(m.family==='brush')shape(g,[[5,-w/2],[L-6,-w/2],[L,0],[L-6,w/2],[5,w/2]],m.metal);
  else if(m.family==='heavy')shape(g,[[5,-w/2],[L-5,-w/2],[L-1,-3],[L,0],[L-1,3],[L-5,w/2],[5,w/2]],m.metal);
  else if(m.family==='blade')shape(g,[[5,-w*.35],[L*.55,-w*.45],[L*.85,-w*.9],[L,-w*.85],[L-5,w*.45],[L*.6,w*.65],[5,w*.38]],m.metal);
  else shape(g,[[5,-w/2],[L-8,-w/2],[L,0],[L-8,w/2],[5,w/2]],m.metal);
  g.strokeStyle=m.edge;g.lineWidth=.8;g.beginPath();g.moveTo(7,0);g.lineTo(L-5,m.family==='blade'?-1:0);g.stroke();
  if(m.family!=='brush')shape(g,[[3,-w/2-2],[6,-w/2-2],[7,w/2+2],[3,w/2+2]],m.guard);
  if(m.mark){g.strokeStyle=m.mark;g.lineWidth=1.1;g.beginPath();g.moveTo(10,1);g.lineTo(L*.72,0);g.stroke();}
 }
 g.restore();return true;
}
export function drawWeaponRack(g,id,x,y){
 g.save();g.translate(x,y);
 // A low wooden base with two upturned supports, viewed from above at 2.5D.
 shape(g,[[-32,-8],[22,-2],[33,-8],[-21,-14]],'#65503a');
 shape(g,[[-32,-8],[22,-2],[22,2],[-32,-4]],'#3d3025');
 for(const px of [-19,17]){
  shape(g,[[px-3,-8],[px-3,-30],[px-6,-33],[px-6,-37],[px-2,-36],[px+1,-30],[px+4,-34],[px+7,-33],[px+4,-27],[px+2,-25],[px+2,-6]],'#4b3828');
  g.strokeStyle='#9c7850';g.lineWidth=1;g.beginPath();g.moveTo(px-2,-27);g.lineTo(px-2,-10);g.stroke();
 }
 const m=weaponModel(id);if(m){const s=Math.min(.86,60/(m.family==='staff'?m.length:m.length+12));const from=m.family==='staff'?-m.length*.38:-12;const to=m.family==='staff'?m.length*.62:m.length;drawWeaponModel(g,id,-(from+to)*s/2,-30,.11,s);}
 g.restore();
}
