import {drawWeaponRack,weaponModel} from './weapon-models.js';
import {loadCharacterAtlas} from './character-atlas.js';
import {loadCombatArt} from './combat-art.js';
import {loadHeroSprites,loadBaiBattleSprites,loadModaBattleSprites,drawBattleActor,setBattleEquipment,setWeaponHandlingVisual,readCombatPoses} from './sprites.js';
const specs={0:{name:'小虾米',kind:1,start:40,count:12,contact:10,weapon:-1,skill:1},9:{name:'张无忌',kind:1,start:56,count:10,contact:8,weapon:-1,skill:2},10:{name:'范遥',kind:1,start:0,count:12,contact:8,weapon:-1,skill:10},15:{name:'金花婆婆',kind:4,start:0,count:12,contact:8,weapon:-1,skill:85},44:{name:'岳老三',kind:4,start:0,count:12,contact:8,weapon:-1,skill:82},61:{name:'欧阳克',kind:1,start:0,count:12,contact:8,weapon:-1,skill:4},67:{name:'裘千仞',kind:1,start:0,count:12,contact:8,weapon:-1,skill:11},70:{name:'玄慈',kind:1,start:0,count:12,contact:8,weapon:-1,skill:14},68:{name:'丘处机',kind:2,start:0,count:12,contact:8,weapon:-1,skill:53},7:{name:'何太冲',kind:2,start:0,count:12,contact:8,weapon:-1,skill:47},59:{name:'小龙女',kind:2,start:0,count:9,contact:4,weapon:359,offhand:415,skill:49},58:{name:'杨过',kind:2,start:52,count:12,contact:5,weapon:106,skill:57},43:{name:'白万剑',kind:2,start:0,count:12,contact:8,weapon:410,skill:44},20:{name:'莫大',kind:2,start:0,count:12,contact:8,weapon:-1,skill:46},31:{name:'丹青生',kind:2,start:0,count:12,contact:8,weapon:410,skill:43},32:{name:'秃笔翁',kind:4,start:0,count:12,contact:8,weapon:-1,skill:80},33:{name:'黑白子',kind:4,start:0,count:12,contact:8,weapon:-1,skill:81},34:{name:'黄钟公',kind:4,start:0,count:12,contact:8,weapon:-1,skill:83},51:{name:'慕容复',kind:2,start:0,count:12,contact:8,weapon:351,skill:51}};
let selectedWeapon=112;
const weaponSelect=document.querySelector('#weapon-select');
weaponSelect.onchange=()=>{selectedWeapon=weaponSelect.value==='dog-staff'?'dog-staff':Number(weaponSelect.value);};
let action='sword',actor=0,playing=true,slow=false,time=0,prev=0,loaded=false;
const c=document.querySelector('canvas'),g=c.getContext('2d');
const info=document.querySelector('#note');
function syncActions(){
 weaponSelect.disabled=actor!==0;
 if(['sword','brush','handling','sword-walk'].includes(action)&&actor!==0)action='attack';
 if(['yang-palm','yang-walk'].includes(action)&&actor!==58)action='attack';
 for(const b of document.querySelectorAll('[data-action]')){b.disabled=['sword','brush','handling','sword-walk'].includes(b.dataset.action)&&actor!==0||['yang-palm','yang-walk'].includes(b.dataset.action)&&actor!==58;b.setAttribute('aria-pressed',String(b.dataset.action===action));}
}
for(const b of document.querySelectorAll('[data-actor]'))b.onclick=()=>{actor=+b.dataset.actor;time=0;for(const x of document.querySelectorAll('[data-actor]'))x.setAttribute('aria-pressed',String(x===b));syncActions();};
for(const b of document.querySelectorAll('[data-action]'))b.onclick=()=>{action=b.dataset.action;time=0;for(const x of document.querySelectorAll('[data-action]'))x.setAttribute('aria-pressed',String(x===b));};
document.querySelector('#play').onclick=e=>{playing=!playing;e.target.textContent=playing?'暂停':'播放';};
document.querySelector('#step').onclick=()=>{playing=false;time+=70;document.querySelector('#play').textContent='播放';};
document.querySelector('#slow').onclick=e=>{slow=!slow;e.target.textContent=slow?'恢复常速':'慢放';};
await Promise.all([loadCharacterAtlas(),loadCombatArt(),loadHeroSprites(),loadBaiBattleSprites(),loadModaBattleSprites()]);loaded=true;syncActions();
function draw(now){
 if(prev&&playing)time+=Math.min(80,now-prev)*(slow?.4:1);prev=now;
 const s=actor===58&&action==='yang-palm'?{...specs[58],kind:1,start:0,count:13,contact:6,skill:24}:actor===0&&action==='brush'?{...specs[0],kind:4,start:176,count:15,contact:10,skill:80,weapon:199}:actor===0&&['sword','handling','sword-walk'].includes(action)?{...specs[0],start:88,count:11,contact:9,weapon:selectedWeapon,kind:weaponModel(selectedWeapon)?.family==='staff'?4:weaponModel(selectedWeapon)?.family==='blade'?3:2,skill:weaponModel(selectedWeapon)?.family==='staff'?87:89}:specs[actor],last=s.contact+12,phase=time%(last*70+1000),baseFrame=Math.floor(Math.max(0,phase-500)/70);
 let f=baseFrame,attacking=['attack','sword','brush'].includes(action)&&phase>=500&&f<=last;
 let handFrame=null,held=s.weapon;
 if(action==='handling'){
  const t=time%3200;attacking=t>=850&&t<2110;f=Math.floor(Math.max(0,t-850)/70);
  held=t<500||t>=2610?-1:selectedWeapon;
  if(t>=500&&t<700)handFrame=Math.min(4,Math.floor((t-500)/40));
  if(t>=2410&&t<2610)handFrame=4-Math.min(4,Math.floor((t-2410)/40));
 }
 if(action==='yang-palm'){
  const t=time%3400;held=t<500||t>=2700?106:-1;attacking=t>=950&&t<2280;f=Math.floor(Math.max(0,t-950)/70);
  if(t>=500&&t<800)handFrame=4-Math.min(4,Math.floor((t-500)/60));
  if(t>=2400&&t<2700)handFrame=Math.min(4,Math.floor((t-2400)/60));
 }
 if(action==='yang-walk')held=-1;
 setWeaponHandlingVisual(handFrame===null?null:{pid:actor,sourcePid:actor,frame:handFrame});
 g.fillStyle='#d9d2b8';g.fillRect(0,0,c.width,c.height);g.textAlign='center';g.font='16px serif';g.fillStyle='#514c3a';
 for(let d=0;d<4;d++){
  const x=112+(d%2)*224,y=172+Math.floor(d/2)*206;g.strokeStyle='#9b99784d';g.beginPath();g.moveTo(x-46,y-12);g.lineTo(x,y-35);g.lineTo(x+46,y-12);g.lineTo(x,y+11);g.closePath();g.stroke();
  g.fillText(['东北 · 背向','东南 · 正向','西北 · 背向','西南 · 正向'][d],x,y+37);
  const v={pid:actor,direction:d,kind:s.kind,weapon:held,skill:s.skill,frameStart:s.start,frameCount:s.count,contactFrame:s.contact,lastFrame:last,sourceFrame:f};
  setBattleEquipment(actor,held,s.weapon,s.offhand??-1);g.save();g.translate(x,y);const zoom=actor===58?1.65:2;g.scale(zoom,zoom);
  drawBattleActor(g,attacking?'fight'+String(actor).padStart(3,'0'):'wmap',attacking?s.start+d*s.count+Math.min(s.count-1,f):2553+actor*4+d,0,0,v,['walk','sword-walk','yang-walk'].includes(action)?{pid:actor,phase:Math.floor(time/100)%8}:null);g.restore();
 }
 if(actor===0){g.save();g.translate(224,207);drawWeaponRack(g,selectedWeapon,0,0);g.restore();}
 info.textContent=actor===0?'人物动作与兵器分开绘制，战斗和木架共用所选外观。普通兵器共用模型，名兵各有形制。打狗棒这里只试看外观，尚未加入获取剧情；不会改变正式存档。':actor===58?'杨过仍使用已核过的断右臂、左手重剑与掌势。此次分层先用于主角。':actor===43?'白万剑四向战斗人物与佩剑分层绘制；此处仅预览普通直剑，不改正式存档。':actor===20?'莫大待机持胡琴，回峰落雁剑出招时显示独立的琴中细剑；人物战斗底板已接入，未改武器数据。':actor===31?'丹青生梅庄立像与战斗四向沿用同一衣冠；出招身体与佩剑分层，未改原战斗数据。':actor===32?'秃笔翁的四向护势、走动与判官笔出招沿用梅庄矮胖、光顶、墨染蓝袍的形象；短笔为分层道具，原战斗数值不变。':actor===33?'黑白子的四向护势、走动和持棋盘出招使用同一黑袍人物；棋盘为分层道具，未改原战斗数值。':actor===51?'慕容复燕子坞剧情、四向战斗、走动和慕容剑法沿用同一衣冠；手中剑为独立模型，此页不修改存档。':'此角色沿用现有动作，本次未替换。';
 if(actor===34)info.textContent='黄钟公依梅庄抚琴坐像改为同脸四向战斗图；背琴站立、行走，持瑶琴出招。此处只预览人物动作，不改原武功效果。';
 if(actor===10)info.textContent='范遥沿用光明顶毁容后同脸、披发与褐袍形象；四向护势、走动和原逍遥掌出招使用同一人物图，不改武功数值。';
 if(actor===15)info.textContent='金花婆婆沿用灵蛇岛伪装期的银发、整洁素灰袍和曲杖；四向护势、走动与金花杖法出招同形，不改变招式效果。';
 if(actor===61)info.textContent='欧阳克沿用白驼山初见时的白金长袍、折扇与双腿健全造型；折扇留在右手，原灵蛇拳由左手施展，不改武功数值。';
 if(actor===44)info.textContent='岳老三沿用万鳄岛的黄褐衣、秃额辫发与鳄嘴大剪刀；四向护势、合成走动和原大剪刀招式同形，不改武功数值。';
 if(actor===67)info.textContent='裘千仞沿用铁掌山尚未出家时的棕褐衣与束发造型；四向护势、合成走动和原铁掌出招同形，不改武功数值。';
 if(actor===70)info.textContent='玄慈沿用少林寺黄袍、赤褐袈裟与灰须的方丈形象；四向合掌待机、合成走动和千手如来掌出招同形，不改武功数值。';
 if(actor===68)info.textContent='丘处机沿用重阳宫灰袍黄领、道冠与佩剑形象；四向持剑护势、合成走动和原七星剑法出剑同形，不改武功数值。';
 if(actor===7)info.textContent='何太冲沿用昆仑派金黄袍、青绿饰边与方饰道冠；四向持剑护势、合成走动和原两仪剑法出剑同形，不改武功数值。';
 if(actor===59)info.textContent='小龙女以素柄长剑与素柄副剑演示玉女双剑；只有实际装备两把普通直剑时才使用这套双剑图。此页不修改存档。';
 window.COMBAT_PREVIEW={actor,action,frame:f,attacking,loaded,poses:readCombatPoses()};requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
