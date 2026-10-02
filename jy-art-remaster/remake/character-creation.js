// One shared point-buy definition for the screen, save validation and Lua handoff.
export const CREATION_POINTS=16;
export const CREATION_STATS=[
 {id:'hp',name:'气血',field:'生命最大值',base:40,step:8,cap:8,hint:'承受伤势的根本'},
 {id:'mp',name:'内力',field:'内力最大值',base:30,step:10,cap:8,hint:'施展招式与运功的根本'},
 {id:'attack',name:'攻击',field:'攻击力',base:25,step:2,cap:8,hint:'提高出招伤害'},
 {id:'defense',name:'防御',field:'防御力',base:20,step:2,cap:8,hint:'减轻受到的伤害'},
 {id:'agility',name:'轻功',field:'轻功',base:25,step:2,cap:8,hint:'影响先后手与走位'},
 {id:'aptitude',name:'资质',field:'资质',base:30,step:5,cap:12,hint:'影响领悟快慢与研习耗用'},
];
export const balancedCreation=()=>({version:1,nature:1,points:{hp:2,mp:2,attack:3,defense:3,agility:2,aptitude:4}});
export function creationRemaining(v){return CREATION_POINTS-CREATION_STATS.reduce((n,s)=>n+(v.points[s.id]||0),0);}
export function normalizeCreation(v){
 if(v?.version!==1||![0,1].includes(v.nature)||!v.points)throw Error('开局加点记录不完整。');
 const points={};
 for(const s of CREATION_STATS){const n=v.points[s.id];if(!Number.isInteger(n)||n<0||n>s.cap)throw Error('开局加点超出范围。');points[s.id]=n;}
 const result={version:1,nature:v.nature,points};
 if(creationRemaining(result)!==0)throw Error('开局自由点总数不符。');
 return result;
}
export function creationAttributes(v){
 const record=normalizeCreation(v),stats={'内力性质':record.nature,'生命增长':5};
 for(const s of CREATION_STATS)stats[s.field]=s.base+record.points[s.id]*s.step;
 for(const k of ['医疗能力','用毒能力','解毒能力','抗毒能力','拳掌功夫','御剑能力','耍刀技巧','特殊兵器','暗器技巧'])stats[k]=25;
 stats['生命']=stats['生命最大值'];stats['内力']=stats['内力最大值'];return stats;
}
export function showCharacterCreation(stage){
 return new Promise(resolve=>{
  const shell=document.createElement('section');shell.id='character-creation';shell.setAttribute('role','dialog');shell.setAttribute('aria-modal','true');shell.setAttribute('aria-labelledby','creation-title');
  shell.innerHTML=`<div class="creation-sheet"><header class="creation-heading"><div><small>一梦初醒 · 自定根骨</small><h2 id="creation-title">初入江湖</h2></div><p>自由点 <strong id="creation-remaining" aria-live="polite">16</strong><span> / 16</span></p></header><div class="creation-scroll"><p class="creation-intro">十六点已按均衡分好，可直接启程；想偏重哪项，再自行增减。</p><div class="creation-columns" aria-hidden="true"><span>能力</span><span>基础</span><span>自由点</span><span>最终</span></div><div id="creation-stats"></div><div class="creation-nature"><span>内力性质</span><button data-nature="0" type="button">阴性</button><button data-nature="1" type="button">阳性</button><small>影响秘籍修炼条件，往后可遇机缘调和。</small></div><p id="creation-talent-note" role="status"></p><p class="creation-footnote">初始兵器、拳掌与医毒根基均为 25；气血成长为 5。此处只决定开局，日后仍靠修炼与历练成长。</p></div><footer class="creation-actions"><button data-preset="clear">清空加点</button><button data-preset="balanced">均衡分配</button><button id="creation-confirm">启程入江湖</button></footer></div>`;
  // 新手先别被加点挡在故事外：默认已按均衡分好，可直接启程；想专精再增减或清空。
  let draft=balancedCreation();
  const rows=new Map();
  for(const s of CREATION_STATS){
   const row=document.createElement('div');row.className='creation-row';row.dataset.stat=s.id;
   row.innerHTML=`<div><b>${s.name}</b><small>每点 +${s.step} · 最多 ${s.cap} 点 · ${s.hint}</small></div><span>${s.base}</span><div class="creation-stepper"><button aria-label="减少${s.name}自由点">−</button><output aria-label="${s.name}已分配点数">0</output><button aria-label="增加${s.name}自由点">＋</button></div><strong class="creation-total" aria-label="${s.name}最终数值">${s.base}</strong>`;
   const [minus,plus]=row.querySelectorAll('button');minus.onclick=()=>{if(draft.points[s.id]>0){draft.points[s.id]--;refresh();}};plus.onclick=()=>{if(creationRemaining(draft)>0&&draft.points[s.id]<s.cap){draft.points[s.id]++;refresh();}};
   rows.set(s.id,{row,minus,plus});shell.querySelector('#creation-stats').append(row);
  }
  const refresh=()=>{
   const left=creationRemaining(draft);shell.querySelector('#creation-remaining').textContent=left;
   for(const s of CREATION_STATS){const {row,minus,plus}=rows.get(s.id);row.querySelector('output').textContent=draft.points[s.id];row.querySelector('.creation-total').textContent=s.base+draft.points[s.id]*s.step;minus.disabled=draft.points[s.id]===0;plus.disabled=left===0||draft.points[s.id]===s.cap;}
   for(const b of shell.querySelectorAll('[data-nature]'))b.setAttribute('aria-pressed',String(Number(b.dataset.nature)===draft.nature));
   const apt=30+draft.points.aptitude*5;
   shell.querySelector('#creation-talent-note').textContent=`资质 ${apt}：影响参悟武学的快慢，较高的资质通常能节省修炼心得；根基与火候，仍须靠历练积累。`;
   const confirm=shell.querySelector('#creation-confirm');confirm.disabled=left!==0;confirm.textContent=left?`还可分配 ${left} 点`:'启程入江湖';
  };
  for(const b of shell.querySelectorAll('[data-nature]'))b.onclick=()=>{draft.nature=Number(b.dataset.nature);refresh();};
  shell.querySelector('[data-preset="clear"]').onclick=()=>{for(const s of CREATION_STATS)draft.points[s.id]=0;refresh();};
  shell.querySelector('[data-preset="balanced"]').onclick=()=>{draft.points=balancedCreation().points;refresh();};
  shell.querySelector('#creation-confirm').onclick=()=>{const record=normalizeCreation(draft);shell.remove();resolve(record);};
  // Keep keyboard focus and movement keys within the creation sheet.
  shell.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')e.preventDefault();if(e.key==='Tab'){const controls=[...shell.querySelectorAll('button:not(:disabled)')];const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  stage.append(shell);refresh();shell.querySelector('#creation-confirm').focus();
 });
}
