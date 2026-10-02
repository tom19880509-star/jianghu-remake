import {SIGNATURE_CATALOG} from './signature-catalog.js';
import {paintPaperDoll} from './equipment-art.js';
import {loadHeroWeaponArt} from './hero-weapon-art.js';
import {loadCharacterAtlas} from './character-atlas.js';
import {loadCombatArt} from './combat-art.js';
import {loadHeroSprites,drawBattleActor,setBattleEquipment,drawWheelVolley} from './sprites.js';
import {signatureLayers,measureCasterPose,loadSignatureArt} from './signature-effects.js';
import {paintCombatEffect} from './effects.js';
import {vfxShake} from './combat-vfx.js';
// vfx 394: same layered renderer and real geometry as battle — native effect frame counts (CC.Effect via
// 武功动画), a typical in-range distance, a normal level, the battle sole drop and grid 24×12.
const EFFECT_COUNT={20:9,24:19,25:17,30:17,57:19,58:12,63:15,66:8};
const DISTANCE={20:2,24:2,25:2,30:4,57:3,58:2,63:1,66:3};
const c=document.querySelector('canvas'),g=c.getContext('2d'),slider=document.querySelector('#frame');
let skill=location.hash==='#meridian'?30:25,direction=1,playing=true,time=0,last=0;
const names={25:'降龙十八掌 · 金龙随掌而出，落点收为金色掌劲',63:'血刀大法 · 暗红刀气，细亮刀锋',30:'六脉神剑 · 有剑锋、无实体，半透明剑身，尾部散气',66:'火焰刀 · 火焰附着刀身，随挥刀起落，收招即熄'};
Object.assign(names,{25:'降龙十八掌 · 掌心窜出的小金龙，咬中即散',63:'血刀大法 · 贴刃血色刀气，不出一格',30:'六脉神剑 · 指尖半透明剑气，无实体箭头',66:'火焰刀 · 空手火焰沿手刀；实际持单刀时焰衣贴刃',20:'太极拳 · 脚下阴阳图，掌前阴阳二气',24:'黯然销魂掌 · 原大扇形苍灰水墨掌劲',49:'玉女素心剑 · 双色剑光交叠',57:'玄铁剑法 · 贴地厚短剑压，几块碎石',58:'太极剑法 · 脚下阴阳图，剑尖新月接一刺',60:'辟邪剑法 · 红紫掠影，迅疾收锋',61:'独孤九剑 · 错落破招剑芒',87:'打狗棍法 · 碧色棍影，扫挑相随'});
for(const [id,entry]of Object.entries(SIGNATURE_CATALOG))if(!names[id])names[id]=entry.name+' · 随武功施展';
const extra=document.querySelector('#extra-art');
extra.replaceChildren(new Option('更多武功',''));
for(const [id,entry]of Object.entries(SIGNATURE_CATALOG))if(![25,63,30,66].includes(+id))extra.add(new Option(entry.name,id));

function selectSkill(id){skill=id;time=0;document.querySelectorAll('[data-skill]').forEach(x=>x.setAttribute('aria-pressed',String(+x.dataset.skill===skill)));extra.value=[25,63,30,66].includes(skill)?'':String(skill);}
document.querySelectorAll('[data-skill]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.skill===skill)));
document.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>selectSkill(+b.dataset.skill));
extra.onchange=()=>{if(extra.value)selectSkill(+extra.value);};
document.querySelector('#direction').onchange=e=>{direction=+e.target.value;};
document.querySelector('#play').onclick=e=>{playing=!playing;e.target.textContent=playing?'暂停':'播放';};
slider.oninput=()=>{playing=false;time=+slider.value*70;document.querySelector('#play').textContent='播放';};
await Promise.all([loadCharacterAtlas(),loadCombatArt(),loadHeroSprites(),loadSignatureArt(),loadHeroWeaponArt()]);
for(const fig of document.querySelectorAll('[data-held-weapon]'))paintPaperDoll(fig,0,+fig.dataset.heldWeapon);
function draw(now){
  if(last&&playing)time+=Math.min(80,now-last);last=now;
  const n=EFFECT_COUNT[skill]||14,armed=[2,3,4].includes(SIGNATURE_CATALOG[skill]?.type)&&![27,28,29,66,74,75,76,79,83,84,88,91].includes(skill);
  const start=armed?88:40,count=armed?11:12,contact=armed?9:10,total=contact+n+4;
  slider.max=String(total-1);
  // 按毫秒算小数帧（与实战 vfxPic 帧间插值一致）；拖动逐帧滑块时仍停在整帧。
  const ft=(time/70)%total,frame=Math.floor(ft),back=[3,2,1,0][direction];
  const step=[[0,-1],[1,0],[-1,0],[0,1]][direction],dist=DISTANCE[skill]||2,HW=24,HH=12;
  const tx=HW*(step[0]-step[1])*dist,ty=HH*(step[0]+step[1])*dist,sx=-tx/2,sy=-ty/2;
  const type=SIGNATURE_CATALOG[skill]?.type||1;
  const weapon=skill===66?-1:skill===63?115:skill===57?106:skill===87?'dog-staff':skill===54?110:armed?(type===3?116:type===4?'wood-staff':112):-1;
  const fx=ft-contact,reduced=document.querySelector('#reduced').checked,pic=fx>=0&&fx<n?fx+1:null;
  const v={pid:0,skill,skillType:type,kind:type,weapon,direction,level:500,targetX:step[0]*dist,targetY:step[1]*dist,
    first:0,count:n,frameStart:start,frameCount:count,contactFrame:contact,lastFrame:contact+n-1,sourceFrame:Math.min(frame,contact+n-1),reducedMotion:reduced};
  const equipment={pid:0,held:weapon,carried:weapon,offhand:-1};
  setBattleEquipment(0,v.weapon,v.weapon);g.fillStyle='#c8c8ac';g.fillRect(0,0,800,400);
  const shake=pic===null?{x:0,y:0}:vfxShake(v,pic,{reducedMotion:reduced});
  g.save();g.translate(400+shake.x*2,200+shake.y*2);g.scale(2,2);g.imageSmoothingEnabled=false;
  for(let y=-5;y<=5;y++)for(let x=-5;x<=5;x++){
    const px=HW*(x-y),py=HH*(x+y);
    g.beginPath();g.moveTo(px,py-HH);g.lineTo(px+HW,py);g.lineTo(px,py+HH);g.lineTo(px-HW,py);g.closePath();
    g.fillStyle=(x+y)%2?'#b8bfa050':'#d9d7b14d';g.fill();g.strokeStyle='#64755b38';g.lineWidth=.5;g.stroke();
  }
  const acting=frame<contact+n,cid=start+direction*count+Math.min(count-1,frame);
  const actor=(t,X,Y)=>drawBattleActor(t,acting?'fight000':'wmap',acting?cid:2553+direction,X,Y+3,acting?v:null,null,equipment);
  const target=()=>drawBattleActor(g,'wmap',2553+9*4+back,sx+tx,sy+ty+3,null,null);
  const pose=acting?measureCasterPose(`preview:${cid}:${frame}:${weapon}`,actor):null;
  const L=frame<contact+n?signatureLayers(g,v,pic,{cx:0,cy:0,ox:sx,oy:sy,hw:HW,hh:HH,aim:{x:v.targetX,y:v.targetY},pose,equipment,reducedMotion:reduced}):null;
  L?.ground();
  // depth order as in battle: whoever stands further back first, with the cast slots between them
  const front=ty>0;
  const hit=()=>{if(pic!==null)paintCombatEffect(g,v,pic,sx+tx,sy+ty,{sx,sy,reducedMotion:reduced});};
  if(front){L?.at(0,0,0);actor(g,sx,sy);L?.at(v.targetX,v.targetY,2);target();hit();}
  else{L?.at(v.targetX,v.targetY,2);target();hit();L?.at(0,0,0);actor(g,sx,sy);}
  L?.end();
  drawWheelVolley(g,v,pic??-1,sx,sy,sx+tx,sy+ty);
  g.restore();slider.value=String(frame);document.querySelector('#note').textContent=names[skill];requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
