import {isEquipmentItem} from './starter-equipment.js';
// Save-local possessions: storage and buyback never alter the original record layout.
export function normalizeHomestead(raw) {
  if (raw == null) return {version:1,room:0,display:{},pawn:{},sold:{},best:0};
  if(raw.version!==1||![0,1,2].includes(raw.room)||!Number.isInteger(raw.best)||raw.best<0||raw.best>9)throw Error('山居记录不完整。');
  const out={version:1,room:raw.room,display:{},pawn:{},sold:{},best:raw.best};
  for(const [key,v] of Object.entries(raw.display||{})){
    if(!/^[1-6]$/.test(key)||Number(key)>(raw.room===2?6:raw.room===1?3:0)||!Number.isInteger(v?.id)||!isEquipmentItem(v.id)||typeof v?.copy!=='boolean')throw Error('藏品记录不完整。');
    if(Object.values(out.display).some(x=>x.id===v.id))throw Error('同一藏品不能占用两个展架。');
    out.display[key]={id:v.id,copy:v.copy};
  }
  for(const field of ['pawn','sold'])for(const [key,n] of Object.entries(raw[field]||{})){
    if(!/^(0|[1-9]\d{0,2})$/.test(key)||!isEquipmentItem(+key)||!Number.isInteger(n)||n<0||n>10)throw Error('小宝收购记录不完整。');
    if(n)out[field][key]=n;
  }
  // 156 厢房与药圃。两个键都是可选的，缺席时一个字节也不写，所以 155 及更早的存档规范化前后逐字节不变。
  if(raw.wing!==undefined)out.wing=normalizeWing(raw.wing);
  if(raw.garden!==undefined)out.garden=normalizeGarden(raw.garden);
  return out;
}
// 四间厢房：built 是已营建的间数，rooms 记各间住客的原版人物代号（1..76，与好感层同一套编号）。
// 住客名单仍归好感层所有，这里只记“谁住第几间”，一人不能占两间。
export const WING_ROOMS=4;
export function normalizeWing(raw){
  if(!Number.isInteger(raw?.built)||raw.built<0||raw.built>WING_ROOMS)throw Error('厢房记录不完整。');
  const out={built:raw.built,rooms:{}};
  for(const [key,pid] of Object.entries(raw.rooms||{})){
    if(!/^[1-4]$/.test(key)||Number(key)>raw.built||!Number.isInteger(pid)||pid<1||pid>76)throw Error('厢房住客记录不完整。');
    if(Object.values(out.rooms).includes(pid))throw Error('同一位住客不能占用两间厢房。');
    out.rooms[key]=pid;
  }
  return out;
}
// 药圃：plots 是已开辟的畦数；trip 是“出门一趟再回家”的计数（作物按趟成熟，睡觉不算，防止在家刷）；
// out 是本周目累计产出件数（硬上限）；beds 记各畦的作物与播种时的趟号；
// made 记各配方本周目已做次数；work 记本趟已制作次数（换趟自动作废）。
// GARDEN_OUT_CAP 是折银两，不是件数：全程剧情银两只有 13050 两（经济组解码 46 份存档），封顶取四分之一。
export const GARDEN_PLOTS=6, GARDEN_CROPS=6, GARDEN_OUT_CAP=3000;
// made 同时记作物与配方的本周目次数，键名与 garden-extension.lua 的 CROPS／RECIPES 一一对应。
export const GARDEN_TALLY=['herb','nitre','ginseng','gall','reishi','honey',
  'balm','antidote','niuhuang','jinniu','zhenxin','heiyu','thorn','jade','wine','congee'];
export function normalizeGarden(raw){
  const int=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
  if(!int(raw?.plots,0,GARDEN_PLOTS)||!int(raw?.trip,0,9999)||!int(raw?.out,0,GARDEN_OUT_CAP))throw Error('药圃记录不完整。');
  const out={plots:raw.plots,trip:raw.trip,out:raw.out,beds:{},made:{},work:{trip:0,n:0}};
  for(const [key,v] of Object.entries(raw.beds||{})){
    if(!/^[1-6]$/.test(key)||Number(key)>raw.plots||!int(v?.crop,1,GARDEN_CROPS)||!int(v?.trip,0,raw.trip))throw Error('药畦记录不完整。');
    out.beds[key]={crop:v.crop,trip:v.trip};
  }
  for(const [key,n] of Object.entries(raw.made||{})){
    if(!GARDEN_TALLY.includes(key)||!int(n,0,99))throw Error('配方记录不完整。');
    if(n)out.made[key]=n;
  }
  if(raw.work!==undefined){
    if(!int(raw.work?.trip,0,raw.trip)||!int(raw.work?.n,0,9))throw Error('本趟制作记录不完整。');
    out.work={trip:raw.work.trip,n:raw.work.n};
  }
  return out;
}
export const throwPoints=position=>Math.abs(position-50)<=6?3:Math.abs(position-50)<=15?1:0;
export function playPitchPot(stage,best=0){
  return new Promise(resolve=>{
    const panel=document.createElement('dialog');panel.className='pitch-panel';panel.setAttribute('aria-label','山居投壶');
    panel.innerHTML='<h2>竹庭投壶</h2><p>三矢一局，权作歇脚。游标到壶口时，点击「投矢」或按空格。</p><div class="pitch-scene"><span class="pitch-bamboo">竹影摇窗</span><span class="pitch-pot" aria-hidden="true">壶</span></div><div class="pitch-track"><span class="pitch-rim"></span><span class="pitch-mouth"></span><i></i></div><p class="pitch-score" role="status"></p><p class="pitch-note">入壶三分，擦沿一分。只记佳绩，无银两与属性奖励。</p><div class="pitch-actions"><button class="pitch-throw">投矢</button><button class="pitch-leave">收矢离开</button></div>';
    stage.append(panel);panel.showModal();
    const marker=panel.querySelector('i'),score=panel.querySelector('.pitch-score'),hit=panel.querySelector('.pitch-throw');
    let count=0,total=0,position=0,start=performance.now(),raf,ended=false;
    score.textContent=`第 1 矢 · 本局 0 分 · 佳绩 ${best} 分`;
    const animate=now=>{position=(Math.sin((now-start)/580)+1)*50;marker.style.left=position+'%';raf=requestAnimationFrame(animate);};
    raf=requestAnimationFrame(animate);
    const throwArrow=()=>{
      if(count>=3||ended)return;
      const points=throwPoints(position);total+=points;count++;
      score.textContent=`${points===3?'投中壶口':points===1?'擦过壶沿':'落在青石上'} · 已投 ${count}/3 矢 · ${total} 分`;
      if(count===3){cancelAnimationFrame(raf);hit.disabled=true;score.textContent+=` · 本程佳绩 ${Math.max(best,total)} 分`;}
    };
    hit.onclick=throwArrow;
    panel.onkeydown=e=>{if(e.code==='Space'&&!e.repeat){e.preventDefault();throwArrow();}};
    panel.querySelector('.pitch-leave').onclick=()=>panel.close();
    panel.onclose=()=>{ended=true;cancelAnimationFrame(raf);panel.remove();resolve(count===3?total:-1);};
    hit.focus();
  });
}
