import {appendMartialLore,appendRequirements,martialEntry} from './martial-lore.js';
import ITEM_GRADES from './item-grade-data.json' with {type:'json'};
import {gradeView,itemGradeInfo,paintGrade,gradeBadges,appendGradeCosts} from './grade157.js';
import {itemEffects,itemRequirements,maskRequirements,maskReason} from './collection-ui.js';
import {paintPaperDoll,gearIcon,ARMOR_LORE} from './equipment-art.js';
import {martialCategory} from './martial-identities.js';
// UI only. All changes are returned to the suspended original Lua item flow.
const HAN_DIGITS='〇一二三四五六七八九';
// 1–99 写作汉字数（十二、二十七），用于级数小印；其余照写阿拉伯数字。
export function hanNumber(n){n=Math.trunc(Number(n)||0);if(n<=0||n>=100)return String(n);if(n<10)return HAN_DIGITS[n];const t=Math.floor(n/10),u=n%10;return (t>1?HAN_DIGITS[t]:'')+'十'+(u?HAN_DIGITS[u]:'');}
export function mountPartyUI({ onChoose, portrait, beforeOpen, content, label }) {
  const stage = document.querySelector('#stage'), rail = document.querySelector('#party-rail');
  const scrollHint = document.createElement('p');
  scrollHint.id = 'party-scroll-hint';scrollHint.hidden = true;stage.append(scrollHint);
  rail.setAttribute('aria-describedby', scrollHint.id);
  function refreshScrollHint() {
    scrollHint.hidden = rail.hidden || rail.clientHeight === 0 || rail.scrollHeight <= rail.clientHeight + 2;
    if (scrollHint.hidden) return;
    const box = rail.getBoundingClientRect(), stageBox = stage.getBoundingClientRect();
    const bottom = rail.scrollTop + rail.clientHeight >= rail.scrollHeight - 2;
    scrollHint.textContent = `${bottom ? '↑ 上滑查看' : '↓ 下滑查看'} · 共 ${rail.children.length} 人`;
    scrollHint.style.left = `${box.left - stageBox.left}px`;
    scrollHint.style.top = `${box.bottom - stageBox.top + 3}px`;
    scrollHint.style.width = `${box.width}px`;
  }
  rail.addEventListener('scroll', refreshScrollHint, {passive:true});
  new ResizeObserver(refreshScrollHint).observe(rail);
  window.addEventListener('resize', refreshScrollHint, {passive:true});
  const panel = document.createElement('dialog'); panel.id = 'party-details';
  panel.setAttribute('aria-labelledby', 'party-name');
  panel.innerHTML = `<header class="party-heading"><div id="party-face" role="img"></div><div><small>江湖人物志</small><h2 id="party-name"></h2></div><button id="party-leave" hidden>离队</button><button id="party-close" aria-label="关闭人物详情" autofocus>×</button></header>
  <nav class="party-tabs" aria-label="人物界面"><button data-tab="gear" aria-pressed="true">穿戴</button><button data-tab="arts" aria-pressed="false">武学</button><button data-tab="stats" aria-pressed="false">属性</button><button data-tab="bond" aria-pressed="false">交情</button></nav>
  <div class="party-layout"><section class="paper-doll"><div class="doll-medallion"><span class="doll-seal">侠</span><canvas width="220" height="290" id="party-figure" role="img"></canvas><div id="party-figure-fallback"></div></div><div class="equipment-slots"></div><p class="doll-caption">人物常服 · 装备以栏位为准</p></section>
  <section class="party-information"><div class="party-section-title">气息与身况</div><div id="party-vitals"></div><dl id="party-combat-stats"></dl><p id="party-condition"></p><section class="gear-description" aria-live="polite"></section></section>
  <section class="party-attribute-sheet" hidden><div class="party-section-title">人物属性</div><div id="party-attributes"></div><p class="attribute-footnote">攻防已计入穿戴；兵器是否适用，以出招时的武功为准。</p></section><section class="party-relations" hidden><div class="party-section-title">同行之谊</div><p class="bond-empty">独行可以快意，结伴也有江湖。与同伴并肩历练，慢慢结下交情。</p></section><section class="party-loadout" hidden></section><section class="party-cultivation" hidden><div id="party-study-card"></div><div class="study-heading"><h3>修炼心法与秘籍</h3><button id="party-change-book">更换秘籍</button></div><button id="normal-study" hidden></button><p id="party-training-note"></p><h3 class="learned-heading">所学武功</h3><div id="party-arts"></div></section></div>`;
  stage.append(panel);
  const masteryBox=document.createElement('section');masteryBox.id='mastery-training';masteryBox.hidden=true;
  panel.querySelector('.learned-heading').before(masteryBox);
  const q = s => panel.querySelector(s);
  // Match the source's round-start movement budget, including current injury.
  // Equipment changes only the preview; temporary battle effects stay on the board.
  const battleAgility=person=>person.attrs['战斗轻功']??person.attrs['轻功'];
  const travelSteps=(person,agility=battleAgility(person))=>Math.max(0,Math.trunc(agility/15)-Math.trunc((person.injury||0)/40));
  // 157 品第：人物页上的兵器、衣甲、秘籍与武学都已在队伍手里或已学会，算「见过」；
  // 只有「宝甲图鉴」里尚未入囊的甲按未见处理。纯显示，不改任何数值。
  const artGrade=(o,seen)=>gradeView(martialEntry(o),{seen});
  const itemGrade=(id,details,seen)=>{const f=typeof id==='number'&&id>=0?itemGradeInfo(id,details||content.items[id],ITEM_GRADES,martialEntry):null;return f?gradeView(f.info,{seen,axis:f.axis}):null;};
  let finish = null, choice = 'back', signature = '', lastPerson=-1, activeTab='gear';
  const tabs=panel.querySelectorAll('[data-tab]');
  function selectTab(tab) { activeTab=tab;panel.dataset.tab=tab;for(const b of tabs)b.setAttribute('aria-pressed',String(b.dataset.tab===tab));q('.party-information').hidden=tab!=='gear';q('.party-cultivation').hidden=tab!=='arts';q('.party-attribute-sheet').hidden=tab!=='stats';q('.paper-doll').hidden=tab!=='gear';q('.party-relations').hidden=tab!=='bond'; }
  for(const b of tabs)b.onclick=()=>selectTab(b.dataset.tab);
  q('#party-change-book').onclick=()=>settle('book');q('#party-leave').onclick=()=>settle('leave');
  function settle(value) { choice = value; panel.close(); }
  q('#party-close').onclick = () => settle(panel.dataset.choosing==='true'?0:'back');
  panel.addEventListener('close', () => {
    document.body.classList.remove('party-open');
    beforeOpen(); const resolve = finish; finish = null; resolve?.(choice);
  });
  panel.addEventListener('cancel', () => { choice = panel.dataset.choosing==='true'?0:'back'; });
  function update(party, enabled, exploring) {
    rail.hidden = !exploring;
    const sig = JSON.stringify([party, enabled]); if (sig === signature) return; signature = sig;
    for (const container of [rail, document.querySelector('#party')]) {
      container.replaceChildren(...party.map(p => {
        const b = document.createElement('button'); b.className = 'member'; b.disabled = !enabled;
        b.dataset.person = p.id;
        // 墨韵纸本：级数盖朱印（汉字数），气、内条旁写现值；伤、毒作小印放在名字一行，不再另起一行把牌子撑高。
        b.setAttribute('aria-label', `${p.name}，${p.level}级，气血 ${p.hp}/${p.maxhp}，内力 ${p.mp}/${p.maxmp}${p.injury?`，受伤 ${p.injury}`:''}${p.poison?`，中毒 ${p.poison}`:''}，查看装备与修炼`);
        const name = document.createElement('span'); name.className = 'member-name';
        const called = document.createElement('span'); called.className = 'member-called'; called.textContent = p.name;
        const level = document.createElement('small'); level.className = 'member-level'; level.textContent = hanNumber(p.level); level.title = `${p.level}级`;
        name.append(called, level);
        const face = document.createElement('span'); face.className = 'member-face'; face.setAttribute('aria-hidden','true'); portrait(face,p.head);
        // 伤、毒小印压在头像下角，不占名字一行（名字在窄屏上不再被挤成省略号）。
        for (const [kind, value, glyph] of [['injury', p.injury, '伤'], ['poison', p.poison, '毒']]) if (value) {
          const mark = document.createElement('small'); mark.className = 'member-mark'; mark.dataset.kind = kind; mark.textContent = glyph;
          mark.title = `${kind === 'injury' ? '受伤' : '中毒'} ${value}`; face.append(mark);
        }
        const info = document.createElement('span'); info.className = 'member-info'; info.append(name); b.append(face,info);
        for (const [label, now, max, type] of [['气',p.hp,p.maxhp,'hp'],['内',p.mp,p.maxmp,'mp']]) {
          const row = document.createElement('span'); row.className = 'member-meter';
          const text = document.createElement('small'); text.textContent = label;
          const bar = document.createElement('span'); bar.className = `meter ${type}`;
          const ratio = now / Math.max(1,max), fill = document.createElement('i'); fill.style.width = `${Math.max(0,Math.min(100,ratio * 100))}%`;
          if (type === 'hp' && ratio <= .3) row.dataset.low = 'true';
          const value = document.createElement('small'); value.className = 'meter-value'; value.textContent = now;
          bar.append(fill); row.append(text,bar,value); info.append(row);
        }
        b.onclick = () => onChoose(p.id); return b;
      }));
    }
    requestAnimationFrame(refreshScrollHint);
  }
  function appendBenefits(box,b) {
    if(!b)return;
    const wrap=document.createElement('section');wrap.className='internal-benefits';
    const title=document.createElement('strong');title.textContent=(b.name||'此门内功')+' · 当前收益';wrap.append(title);
    const amount=document.createElement('p');amount.textContent=b.rank>0?(b.activeDrain?'主动运功生效 · 当前不增加内力上限':`内力上限贡献 +${b.mp} · 本人当前上限 ${b.capacity}`):'尚未练成，当前属性加成为 0。';wrap.append(amount);
    for(const text of Object.values(b.currentEffects||{})){const row=document.createElement('p');row.textContent=text;wrap.append(row);}
    const rule=document.createElement('small');rule.textContent=b.activeDrain?'仍可从战斗招式中施展。提高境界强化吸内，修炼栏位不改变已经学会的招式。':`本门当前境界的内力增益为 +${b.standalone}，与其他已练内功足额相加。上方贡献是扣除本门前后的实际差值；达到人物内力上限后，各门贡献不能简单相加。转交秘籍不移除已学收益。`;const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='收益如何计算';detail.append(summary,rule);wrap.append(detail);box.append(wrap);
  }
  function renderLoadout(person,selection,coat,boots) {
    const pane=q('.party-loadout'),action=selection.action,kind=action==='armor'?'armor':action==='offhand'?'weapon':action;
    const current=action==='armor'?coat:action==='boots'?boots:person[action];
    const names={weapon:'兵器',offhand:'副手',armor:'衣甲',boots:'足具',book:'秘籍'};
    // ui156: practice rows carry a string key in id and the real manual in artId.
    const bookOf=row=>action==='book'?(typeof row.artId==='number'?row.artId:typeof row.id==='number'?row.id:null):null;
    const rowGrade=row=>action==='book'?artGrade({bookId:bookOf(row)??undefined,skillId:row.skill,name:row.name},!row.unowned):itemGrade(row.artId??row.id,row.details,!row.unowned);
    q('.party-information').hidden=true;q('.party-cultivation').hidden=true;q('.party-attribute-sheet').hidden=true;q('.party-relations').hidden=true;q('.paper-doll').hidden=false;
    const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const heading=el('div','loadout-heading'),back=el('button','loadout-back','‹ 返回人物');back.onclick=()=>settle(0);
    heading.append(el('h3','',selection.practiceKind?`选择${selection.practiceKind==='heart'?'内功':'武功'}`:`更换${names[action]}`),back);pane.append(heading);
    const rows=Object.values(selection.items||{}),list=el('div','loadout-list'),detail=el('section','loadout-detail'),apply=el('button','loadout-apply','选择装备');
    let selected=null,library=false;
    function select(row){
      selected=row;for(const b of list.children)b.setAttribute('aria-pressed',String(b.dataset.id===String(row.id)));
      detail.replaceChildren();const grade=rowGrade(row),top=el('div','loadout-item-heading');top.append(gearIcon(kind,row.artId??row.id),paintGrade(el('h3','',row.name),grade));detail.append(top,...gradeBadges(grade));
      if(action==='book'&&row.requirements)appendRequirements(detail,Object.values(maskRequirements(row.requirements,bookOf(row))).filter(Boolean).sort((a,b)=>Number(!!a.met)-Number(!!b.met)),{name:person.name,title:'修炼所需条件'});
      // ui394 手机 QA F6：兵器/衣甲的条件与秘籍同样「未满足」排前；有未满足项时整块提到对比之前，
      // 手机上不用下滑就看得到穿不上的原因。全部满足时仍放在末尾，先看加成对比。
      const gearReq=action!=='offhand'&&action!=='book'&&!!row.requirements,gearUnmet=gearReq&&Object.values(row.requirements).some(r=>r&&!r.met);
      const gearRequirements=()=>appendRequirements(detail,Object.values(maskRequirements(row.requirements,bookOf(row))).filter(Boolean).sort((a,b)=>Number(!!a.met)-Number(!!b.met)),{name:person.name,title:'装备所需条件'});
      if(gearUnmet)gearRequirements();
      if(row.tags)detail.append(el('small','loadout-owner',row.tags));
      if(row.offhandUsers)detail.append(el('p','loadout-requirements',`此物已由${row.offhandUsers}预留作副手。改为主手穿戴后，原副手配置暂不生效；副手不增加装备属性。`));
      if(row.owner){const loss=Object.entries(row.stats||{}).filter(([,v])=>v!==0).map(([k,v])=>`${({attack:'攻击',defense:'防御',agility:'战斗轻功'})[k]} ${-v>0?'+':''}${-v}`).join(' · ');detail.append(el('p','loadout-requirements',action==='book'?`转交后，${row.owner}保留所学与进度，仍可凭记忆修炼；失去秘籍参照加速。`:`转交后，${row.owner}将卸下此物${loss?'（'+loss+'）':''}。`));}
      const lore=el('p','',ARMOR_LORE[row.artId??row.id]||row.description||row.details?.['物品说明']||'江湖行装，备于行囊，随时可换。');
      if(action==='offhand')detail.append(el('p','loadout-requirements','副手只供左右互搏时持械，不触发此兵器的装备属性与代价；须与主手同类，玄铁剑与屠龙刀只能独持。'));
      else if(action!=='book'){
        const comparison=el('div','loadout-comparison');
        for(const [key,name] of [['attack','攻击'],['defense','防御'],['agility','战斗轻功']]){
          const old=current?.stats?.[key]||0,next=row.stats?.[key]||0,delta=next-old;
          if(old===0&&next===0)continue;
          const line=el('span','',`${name} ${old} → ${next} `);const change=el('b',delta>0?'gain':delta<0?'loss':'',delta===0?'不变':`${delta>0?'+':''}${delta}`);line.append(change);comparison.append(line);
        }
        detail.append(el('small','comparison-label','本栏装备加成对比'),comparison);
        const agilityChange=(row.stats?.agility||0)-(current?.stats?.agility||0);
        if(agilityChange!==0){
          const before=travelSteps(person),after=travelSteps(person,battleAgility(person)+agilityChange);
          detail.append(el('p','loadout-movement',`每回合移步 ${before} → ${after} 格（按当前伤势）`));
          detail.append(el('small','','临战身法与减速会影响步数，以战场亮格为准。'));
        }
      }else if(row.practice){
        detail.append(el('p','manual-category','选定只是安排研习，不会立即学会或升级。战后自动投入心得，也可返回点「潜心修炼」。'));
      }else if(row.details){
        detail.append(el('small','manual-category',martialCategory(row.artId??row.id)));
        const benefits=itemEffects(row.details);if(benefits.length)detail.append(el('p','',`练成后：${benefits.join(' · ')}`));
        detail.append(el('small','','秘籍用于修炼，放入栏位并不会立即获得加成。'));
      }
      if(action==='book'){
        appendMartialLore(detail,{bookId:row.book??row.id,skillId:row.skill,name:row.name,seen:!row.unowned});
      }else{detail.append(lore);if(action!=='offhand')appendGradeCosts(detail,grade);}detail.scrollTop=0;
      appendBenefits(detail,row.benefits);
      if(gearReq){if(!gearUnmet)gearRequirements();}else if(action!=='offhand'&&!row.requirements&&row.details){const requirements=itemRequirements(row.details,label,content.people);if(requirements.length)detail.append(el('p','loadout-requirements','所需条件：'+requirements.join(' · ')));}
      if(row.unowned)detail.append(el('p','loadout-requirements','尚未获得，可在江湖中寻访。图鉴查看不会获得或穿戴此物。'));
      else if(!row.eligible&&!row.current&&!Object.values(row.requirements||{}).some(r=>r&&!r.met))detail.append(el('p','loadout-requirements','当前无法使用：请核对人物条件与气血。'));
      apply.disabled=!row.eligible;apply.textContent=row.unowned?'尚未获得':selection.practiceKind&&row.id==='none'?'暂不修炼此栏':row.id===-1&&(action==='weapon'||action==='armor')?(row.current?row.tags:row.name):row.current?(action==='offhand'?'已配副手':row.practice?'正在研习':'已穿戴 / 研习'):action==='offhand'&&row.id<0?'卸下副手':(row.practice?'选作研习 · ':action==='book'?'研习 · ':action==='offhand'?'配副手 · ':row.name==='卸下'?'':'穿戴 · ')+row.name;
    }
    function renderList(){
      list.replaceChildren();const visible=rows.filter(r=>!!r.unowned===library);
      // Keep the selected study visible; show usable manuals before unmet ones.
      if(action==='book')visible.sort((a,b)=>Number(!!b.current)-Number(!!a.current)||Number(!!b.eligible)-Number(!!a.eligible));
      for(const row of visible){
        // ui156: 兵器/衣甲/足具 used to say nothing about a row you cannot equip.
        // The row now carries the same 条件未满足 mark the manuals have, in red;
        // which condition failed stays in the detail pane, and for manuals whose
        // qualification is a discovery it is masked there too.
        const state=row.unowned?'unowned':row.current?'current':row.eligible?'ok':'unmet';
        const status=action==='book'?(row.current?'正在研习':row.eligible?'可研习':'条件未满足'):state==='unmet'?'条件未满足':'';
        const tags=[row.tags,action==='book'?status:''].filter(Boolean).join(' · ')||(action==='book'?'秘籍':'行囊中');
        const b=el('button','loadout-item');b.dataset.id=row.id;b.dataset.state=state;
        b.setAttribute('aria-label',[row.name,tags,action==='book'?'':status].filter(Boolean).join(' · '));
        // ui394 F6：「某某持有」之类只是归属，不再随整行标红；状态单放进 .loadout-state，红色只给「条件未满足」。
        // 秘籍行仍是同一行「标签 · 状态」，装备行照旧另起一行。
        const copy=el('span','');copy.append(paintGrade(el('strong','',row.name),rowGrade(row)));
        if(action==='book'){const line=el('small','',row.tags?row.tags+' · ':'');line.append(el('span','loadout-state',status));copy.append(line);}
        else{copy.append(el('small','',tags));if(status)copy.append(el('small','loadout-state',status));}
        b.append(gearIcon(kind,row.artId??row.id),copy);b.onclick=()=>select(row);list.append(b);
      }
      if(visible.length)select(visible.find(r=>r.id===selected?.id)||visible.find(r=>r.current)||visible[0]);
      else {list.append(el('p','','行囊中尚无可更换的'+names[action]+'。衣履可向河洛客栈的韦小宝购置。'));detail.replaceChildren();apply.disabled=true;apply.textContent='尚无可选装备';}
    }
    if(rows.some(r=>r.unowned)){
      const filters=el('div','loadout-filters');for(const [value,name] of [[false,'行囊'],[true,'宝甲图鉴']]){const b=el('button','',name);b.setAttribute('aria-pressed',String(!value));b.onclick=()=>{library=value;for(const x of filters.children)x.setAttribute('aria-pressed',String(x===b));renderList();};filters.append(b);}pane.append(filters);
    }
    const body=el('div','loadout-scroll');body.append(list,detail);pane.append(body,apply);apply.onclick=()=>{if(selected?.eligible)settle(selected.id);};renderList();
    for(const b of q('.equipment-slots').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.slot===action));
  }
  function show(person,selection=null) {
    beforeOpen(); choice = selection?0:'back'; panel.dataset.person = person.id;panel.dataset.choosing=String(!!selection);q('.party-loadout').hidden=!selection;q('.party-tabs').hidden=!!selection;q('.party-loadout').replaceChildren();
    q('#party-close').textContent=selection?'‹':'×';q('#party-leave').hidden=!!selection||!person.canLeave;
    q('#party-close').setAttribute('aria-label',selection?'返回人物详情':'关闭人物详情');
    portrait(q('#party-face'), person.head); q('#party-face').setAttribute('aria-label',person.name+'头像');
    // 人物志抬头：名字后接与队伍栏同式的朱砂级数印（汉字数），读屏仍念「N级」。
    { const seal=document.createElement('small');seal.className='party-level';seal.textContent=`${hanNumber(person.level)}级`;seal.setAttribute('aria-label',`${person.level}级`);q('#party-name').replaceChildren(person.name,seal); }
    if(lastPerson!==person.id)activeTab='gear';lastPerson=person.id;selectTab(activeTab);
    const figure=q('#party-figure'),fallback=q('#party-figure-fallback');
    const hasFigure=paintPaperDoll(figure,person.head,person.weapon?.id??-1);figure.hidden=!hasFigure;fallback.hidden=hasFigure;
    figure.setAttribute('aria-label',person.name+'全身形象');if(!hasFigure)portrait(fallback,person.head);
    q('#party-vitals').replaceChildren(...[['气血',person.hp,person.maxhp,'hp'],['内力',person.mp,person.maxmp,'mp'],['体力',person.stamina,100,'stamina']].map(([label,n,max,key])=>{
      const row=document.createElement('div');row.className='vital-row vital-'+key;const text=document.createElement('span');text.textContent=label;const num=document.createElement('b');num.textContent=`${n} / ${max}`;const bar=document.createElement('i');bar.style.setProperty('--fill',Math.max(0,Math.min(100,n/Math.max(1,max)*100))+'%');row.append(text,num,bar);return row;
    }));
    // ui394 手机 QA F8：秘籍与兵器条件核对的是不计穿戴的「自身」攻击力、轻功（ui-extension BrowserStudyRequirements 读 p[field]），
    // 这里原先只写含装备的总数。两者不同时并写「84（自身 69）」：总数由 Lua 给出，减去同一份兵器、防具加成即自身值。
    const gearStat=k=>(person.weapon?.stats?.[k]||0)+(person.armor?.stats?.[k]||0);
    const baseValue={'攻击力':person.attrs['攻击力']-gearStat('attack'),'轻功':person.attrs['轻功']-gearStat('agility'),'战斗轻功':person.attrs['轻功']-gearStat('agility')};
    const attrRow=(name,value)=>{const row=document.createElement('div');row.className='attribute-row';const n=document.createElement('dt');n.textContent=name;const v=document.createElement('dd');v.textContent=value;
      const base=baseValue[name];if(Number.isFinite(base)&&base!==value){const s=document.createElement('small');s.className='attr-base';s.textContent=`（自身 ${base}）`;v.append(s);}
      row.append(n,v);return row;};
    q('#party-combat-stats').replaceChildren(...['攻击力','防御力',person.attrs['战斗轻功']!=null?'战斗轻功':'轻功'].map(name=>attrRow(name,person.attrs[name])));
    const groups=[['临敌本领',['攻击力','防御力',person.attrs['战斗轻功']!=null?'战斗轻功':'轻功']],['武学根基',['拳掌功夫','御剑能力','耍刀技巧','特殊兵器']],['自身修为',['内力属性','资质']]];
    const used=new Set([...groups.flatMap(([,names])=>names),'轻功','战斗轻功']);const extra=Object.keys(person.attrs).filter(name=>!used.has(name));if(extra.length)groups.push(['其他本领',extra]);
    q('#party-attributes').replaceChildren(...groups.map(([title,names])=>{const box=document.createElement('section');box.className='attribute-group';const h=document.createElement('h3');h.textContent=title;const dl=document.createElement('dl');for(const name of names)if(person.attrs[name]!=null)dl.append(attrRow(name,person.attrs[name]));box.append(h,dl);return box;}).filter(box=>box.querySelector('dl').children.length));
    q('#party-attributes .attribute-group dl').append(attrRow('常态移步',`${travelSteps(person)} 格`));
    q('.attribute-footnote').textContent='攻防与轻功已计入穿戴；括号里的「自身」不计穿戴，秘籍与兵器条件按它核对。兵器是否适用，以出招时的武功为准。移步为每回合步数，已计入当前伤势，临战变化以战场亮格为准。';
    q('#party-condition').textContent = [person.injury>0 && `伤势 ${person.injury}`,person.poison>0 && `中毒 ${person.poison}`].filter(Boolean).join('　') || '气息平稳 · 无伤无毒';
    // 155 队友好感: a companion's tier and view of the hero; 请教武学 only when Lua offers it.
    let affinityBox=q('#party-affinity');
    if(!affinityBox){affinityBox=document.createElement('section');affinityBox.id='party-affinity';affinityBox.className='affinity-card';q('.party-relations').append(affinityBox);}
    const bond=person.growth?.affinity;affinityBox.replaceChildren();affinityBox.hidden=!bond||!!bond.hero;q('.bond-empty').hidden=!!bond&&!bond.hero;
    if(bond&&!bond.hero){
      const head=document.createElement('div');head.className='affinity-heading';
      const title=document.createElement('strong');title.textContent=`好感 · ${bond.tier}`;
      const count=document.createElement('b');count.textContent=`${bond.value} / ${bond.max}`;
      const meter=document.createElement('i');meter.style.setProperty('--fill',Math.max(0,Math.min(100,bond.value/Math.max(1,bond.max)*100))+'%');
      head.append(title,count,meter);affinityBox.dataset.tier=String(bond.tierIndex||1);
      const view=document.createElement('p');view.textContent=`${person.name}${bond.line}`;affinityBox.append(head,view);
      if(bond.familiar){const mark=document.createElement('small');mark.className='affinity-familiar';mark.textContent='似曾相识';affinityBox.append(mark);}
      if(bond.taught){const note=document.createElement('small');note.textContent=`本程已传你${bond.taught}。${bond.taughtLine||''}`;affinityBox.append(note);}
      // 155b: 入住山居 state, and 邀请入住 beside 请教武学 (Lua decides both; the page only offers them).
      if(bond.homeNote){const note=document.createElement('small');note.className='affinity-home';note.dataset.home=bond.home||'';note.textContent=bond.homeNote;affinityBox.append(note);}
      const actions=document.createElement('div');actions.className='affinity-actions';
      if(bond.canAsk){const ask=document.createElement('button');ask.textContent='请教武学';ask.dataset.affinity='teach';ask.disabled=person.hp<=0;ask.onclick=()=>settle('affinity-teach');actions.append(ask);}
      if(bond.canInvite){const invite=document.createElement('button');invite.textContent='邀请入住';invite.dataset.affinity='invite';invite.onclick=()=>settle('affinity-invite');actions.append(invite);}
      if(actions.children.length)affinityBox.append(actions);
    }
    const worn=person.outfit||{},coat=worn.coat?.id?worn.coat:person.armor,boots=worn.boots||{id:'',name:'未配备'};
    const practice=person.growth?.practice;
    let migration=q('#practice-migration');if(!migration){migration=document.createElement('p');migration.id='practice-migration';migration.className='practice-migration';q('.party-information').prepend(migration);}
    migration.hidden=!practice?.notice;migration.textContent=practice?.notice||'';
    const slots=[['weapon','兵器',person.weapon],...(person.canOffhand?[['offhand','副手',person.offhand]]:[]),['armor','衣甲',coat],['boots','足具',boots],...(person.growth?.practice?[]:[['book','旧制研习',person.book]])];
    function showGear(key,label,item) {
      const box=q('.gear-description');box.replaceChildren();
      const heading=document.createElement('h3');heading.textContent=label+' · '+(item.name||'未配备');heading.prepend(gearIcon(key,item.id));
      const note=document.createElement('p');note.textContent=key==='offhand'?'左右互搏时可在另一手持一件同类轻兵器；副手不额外叠加装备属性，玄铁剑与屠龙刀只能独持。':ARMOR_LORE[item.id]||item.description||(key==='boots'?'布履与快靴可向河洛客栈的韦小宝购置，穿戴后增加战斗中的先手轻功与移动能力。':key==='book'?'此进度使用经典或章节试玩规则，只能携带一本研习秘籍。标题页的「新游戏 · 一梦入江湖」使用武功、内功双修。':'选择行囊中已有的装备。衣甲与江湖衣装共用一个部位。');
      if(key==='book'&&item.id>=0)note.textContent=martialCategory(item.id)+' · '+note.textContent;
      const effects=document.createElement('p');effects.className='gear-effects';effects.textContent=key==='offhand'?(item.id>=0?'已配副手 · 仅在适合的互搏组合中生效':'尚未配副手；仍可一手兵器、一手拳掌互搏。'):item.effects||((typeof item.id==='number'&&item.id>=0)?'装备效果已计入上方属性。':'尚未穿戴，不增加属性。');
      if(key==='book')effects.textContent=person.book.id>=0?`研习 ${person.points} / ${person.needed<0?'已达上限':person.needed}`:'尚未选择修炼秘籍';
      const actions=document.createElement('div');actions.className='gear-actions';
      const change=document.createElement('button');change.id='party-gear-change';change.textContent=key==='book'?'更换秘籍':'更换'+label;change.disabled=person.hp<=0;change.onclick=()=>settle(key);actions.append(change);
      
      if(key==='book'){const view=document.createElement('button');view.textContent='查看武学';view.onclick=()=>selectTab('arts');actions.append(view);}
      const lore=document.createElement('details'),caption=document.createElement('summary');caption.textContent='物品来由';lore.append(caption,note);box.append(heading,effects,actions,lore);if(key!=='book'&&key!=='offhand')appendGradeCosts(box,itemGrade(item.id,null,true));if(key==='book'&&item.id>=0){appendMartialLore(box,{bookId:item.id,name:item.name,seen:true});appendRequirements(box,maskRequirements(person.studyRequirements,item.id),{name:person.name});}
      for(const b of q('.equipment-slots').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.slot===key));
    }
    q('.equipment-slots').replaceChildren(...slots.map(([key,label,item])=>{
      const b=document.createElement('button');b.dataset.slot=key;b.setAttribute('aria-label',label+' '+(item.name||'未配备'));
      const small=document.createElement('small');small.textContent=label;
      const name=document.createElement('strong');name.textContent=item.name||'未配备';
      paintGrade(name,key==='book'?(item.id>=0?artGrade({bookId:item.id,name:item.name},true):null):itemGrade(item.id,null,true));
      const effect=document.createElement('span');effect.className='slot-effect';
      effect.textContent=key==='book'?martialCategory(item.id):key==='offhand'?(item.id>=0?'双持':'待配'):Object.entries(item.stats||{}).filter(([,v])=>v!==0).map(([k,v])=>`${({attack:'攻',defense:'防',agility:'轻'})[k]}${v>0?'+':''}${v}`).join(' ');
      if(key!=='book')effect.replaceChildren(...effect.textContent.split(' ').filter(Boolean).map(text=>{const stat=document.createElement('span');stat.textContent=text;return stat;}));
      b.append(small,gearIcon(key,item.id),name,effect);b.onclick=()=>{if(selection)return;selectTab('gear');showGear(key,label,item);q('.gear-description').scrollIntoView({block:'nearest'});};b.disabled=!!selection;return b;
    }));
    if(practice){
      const pair=document.createElement('section');pair.className='equipment-study';pair.setAttribute('aria-label','武功与内功修炼');
      for(const [key,label]of [['martial','武功'],['heart','内功']]){
        const r=practice[key],button=document.createElement('button');button.dataset.slot='practice-'+key;button.disabled=!!selection;
        const title=document.createElement('small');title.textContent=label;
        const name=document.createElement('strong');name.textContent=r.id?r.name:'未选择';
        const rank=document.createElement('span');rank.className='slot-effect';rank.textContent=r.id?`${r.rank}/${r.maxRank}${r.rankUnit}`:'点击选择';button.append(title,name,rank);
        button.onclick=()=>{
          const box=q('.gear-description');box.replaceChildren();const h=document.createElement('h3');h.textContent=label+' · '+name.textContent;box.append(h);
          if(r.id){const note=document.createElement('p');note.textContent=`${rank.textContent} · ${r.held?'携带秘籍':'凭记忆修炼'} · 修炼速度 ${r.speed}%`;box.append(note);appendBenefits(box,r.benefits);}
          const actions=document.createElement('div');actions.className='gear-actions';
          const change=document.createElement('button');change.textContent='更换'+label;change.disabled=person.hp<=0;change.onclick=()=>settle('practice-'+key);
          const view=document.createElement('button');view.textContent='查看修炼进度';view.onclick=()=>selectTab('arts');actions.append(change,view);const benefits=box.querySelector('.internal-benefits');if(benefits)benefits.before(actions);else box.append(actions);
          for(const b of q('.equipment-slots').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));
          box.scrollIntoView({block:'nearest'});
        };pair.append(button);
      }
      q('.equipment-slots').append(pair);
    }
    showGear('armor','衣甲',coat);
    q('#party-training-note').textContent = person.book.id>=0 ? `修炼进度 ${person.points} / ${person.needed<0?'已达上限':person.needed}。更换秘籍会清空当前修炼点数，已学武功保留。` : '选择行囊中的秘籍开始修炼。已学武功会保留。';
    const normal=person.normalStudy,normalButton=q('#normal-study');normalButton.hidden=!normal;
    if(normal){
      q('#party-training-note').textContent=`可用心得 ${person.points} / 32767。战斗结算后积累，研习只扣本次所需；换书或暂别队伍都保留各自心得，炼药制物进度重新开始。人物等级与招式进境分别成长。`;
      normalButton.textContent=normal.eligible?`研习一次 · ${normal.cost}点`:maskReason(normal.reason,person.book.id);
      normalButton.disabled=!normal.eligible;normalButton.onclick=()=>settle('normal-study');
    }
    let growthBox=q('#growth-training');
    if(!growthBox){growthBox=document.createElement('section');growthBox.id='growth-training';q('#party-study-card').before(growthBox);}
    growthBox.replaceChildren();growthBox.hidden=!person.growth;
    if(practice?.notice){const note=document.createElement('p');note.className='practice-migration';note.textContent=practice.notice;growthBox.append(note);}
    if(person.growth){
      const m=person.growth,heading=document.createElement('h3');heading.textContent=`自身修为 · 已学 ${m.count} / 10 门`;
      const reserved=Object.values(m.reserved||{}),inheritance=document.createElement('details');inheritance.className='mastery-effects';inheritance.hidden=!reserved.length;
      inheritance.textContent=`本命传承预留 ${reserved.length} 门：${reserved.map(r=>r.name).join('、')}。须经剧情或修炼领会，占用十门之内的名额。${m.count+reserved.length>10?'旧档原有武学保留，未领会的传承暂不追加。':''}`;
      if(reserved.length){const title=document.createElement('summary');title.textContent=`尚待领会的本命传承 · ${reserved.length}门`;inheritance.prepend(title);}
      let trainAction=null;const controls=document.createElement('div');controls.className='mastery-choices';
      if(m.practice){
        controls.className='practice-slots';
        for(const [key,label]of [['martial','武功'],['heart','内功']]){
          const r=m.practice[key],card=document.createElement('section');card.className='practice-slot';
          const b=document.createElement('button');b.className='practice-select';b.disabled=person.hp<=0;b.onclick=()=>settle('practice-'+key);
          const title=document.createElement('small');title.textContent=label+' · 更换';const name=document.createElement('strong');name.textContent=r.name;if(r.id)paintGrade(name,artGrade({bookId:r.book,skillId:r.skill,name:r.name},true));b.append(title,name);card.append(b);
          if(r.id){
            const rank=document.createElement('p');rank.className='practice-rank';rank.textContent=`${r.rank} / ${r.maxRank}${r.rankUnit}${r.limit?` · 一招半式至${r.limit}`:''} · ${r.held?'有谱参照':'凭记忆修炼'} · 速度${r.speed}%`;
            const progress=document.createElement('progress');progress.max=Math.max(1,r.cost);progress.value=r.rank>=r.maxRank&&r.cost<0?progress.max:Math.min(progress.max,r.progress);progress.setAttribute('aria-label',label+'修炼进度');
            const note=document.createElement('small');note.textContent=maskReason(r.reason,r.book)||`${r.proof?'对照泥偶，印证练法 · ':''}进度 ${Math.floor(r.progress)} / ${r.cost}${r.synergy?' · '+r.synergy:''}`;
            card.append(rank,progress,note);appendBenefits(card,r.benefits);
            const facts=document.createElement('details'),summary=document.createElement('summary');summary.textContent='来由与修炼说明';facts.append(summary);appendMartialLore(facts,{bookId:r.book,skillId:r.skill,name:r.name,seen:true});card.append(facts);
          }
          controls.append(card);
        }
        const train=document.createElement('button');train.className='practice-train';train.textContent=`潜心修炼 · 最多${person.points}点`;train.disabled=person.hp<=0||![m.practice.martial,m.practice.heart].some(r=>r.eligible&&(person.points>0||r.progress>=r.cost));train.onclick=()=>settle('practice-train');trainAction=train;
      }else for(const [action,label]of [['growth-signature',`拿手：${m.signature}`],['growth-internal',`主运：${m.internal}`]]){
        const b=document.createElement('button');b.textContent=label;b.onclick=()=>settle(action);b.disabled=person.hp<=0;controls.append(b);
      }
      const recall=document.createElement('button');recall.textContent='重拾旧学';recall.onclick=()=>settle('growth-relearn');recall.disabled=person.hp<=0;
      const detail=document.createElement('details'),summary=document.createElement('summary');detail.className='cultivation-effects';summary.textContent='内功与相辅功效';const text=document.createElement('p');text.className='mastery-effects';text.textContent=m.effect+(m.studyPreview?'\n'+m.studyPreview:'')+'\n'+(m.huEffect?`胡刀拿手：八重起忽略对手自身防御，当前 ${m.huEffect} 点。`:'胡刀拿手练至八重起，可凝劲破防。')+'\n'+(m.taiChiReduction?`九阳与太极相辅：当前每击耗内 ${m.taiChiNormalCost} → ${m.taiChiCost}。`:'九阳主运与太极均修至三重起，可省出招内力。');
      if(m.practice)text.textContent=m.effect+(m.huEffect?` 胡刀八重起凝劲破防，当前 ${m.huEffect} 点。`:'')+(m.taiChiReduction?` 九阳与太极相辅：每击耗内 ${m.taiChiNormalCost} → ${m.taiChiCost}。`:'');
      detail.append(summary,text);
      const footer=document.createElement('div');footer.className='cultivation-footer';footer.append(detail,recall);
      const top=document.createElement('div');top.className='cultivation-heading';top.append(heading);if(trainAction)top.append(trainAction);growthBox.append(top,inheritance,controls,footer);
      const a=m.affinity,taughtRows=a?.hero?[...Object.values(a.arts||{}).map(r=>`${r.name} · ${r.teacher}所传${r.cap?` · 一招半式，至多 ${r.cap} 级`:' · 完整传授'}`),...Object.values(a.pointers||{}).map(r=>`${r.name} · ${r.teacher}指点，资质 ${r.aptitude} 即可研习（不占名额）`)]:[];
      if(taughtRows.length){
        // Shown once a companion has actually taught something; nothing is announced before that.
        const taught=document.createElement('details');taught.className='mastery-effects affinity-taught';
        const title=document.createElement('summary');title.textContent=`同伴传授 · 已用 ${a.used} / ${a.max} 门`;taught.append(title);
        for(const text of taughtRows){const line=document.createElement('p');line.textContent=text;taught.append(line);}
        growthBox.append(taught);
      }
      if(m.luohanBase||m.luohanCredit){const note=document.createElement('p');note.className='mastery-effects';note.textContent=[m.luohanBase?`泥偶根基：永久保留 ${m.luohanBase} 点内力上限，不占所学名额。`:'',m.luohanCredit?`本门旧有投入尚可抵扣 ${m.luohanCredit} 点罗汉伏魔修炼费用。`:''].filter(Boolean).join(' ');growthBox.append(note);}
      if(m.qi){
        const qi=m.qi,note=document.createElement('p');note.className='mastery-effects';
        note.textContent=`异气 ${qi.foreign} / 100 · ${qi.foreign===0?(qi.healed?'郁气已散':'气息无碍'):qi.foreign>=90?'气脉相冲':qi.foreign>=60?'气息紊乱':'尚可调理'}。吸星可积异气，普通兼修不会；用药、住宿不会消除这项异气。`;
        if(qi.rank)note.textContent+=` 易筋 ${qi.rank}重；${qi.guided?'已得运气指点':'尚待请教经义'}，${qi.insight?'已有悟法体会':'尚未悟法'}。`;
        const action=document.createElement('button');action.textContent=qi.reason||`潜心调息 · ${qi.cost}点心得，异气减${qi.amount}`;action.disabled=!!qi.reason;action.onclick=()=>settle('growth-qi');
        growthBox.append(note,action);
      }
    }
    masteryBox.replaceChildren();masteryBox.hidden=!person.mastery;
    if(person.mastery){
      const m=person.mastery;
      q('#party-training-note').textContent=`可用修炼点 ${person.points} · 累计研习 ${m.spent} · 实战熟练增长 ${m.practice}。更换本批秘籍保留点数，不逐本叠加攻防、气血。`;
      const choices=document.createElement('div');choices.className='mastery-choices';
      for(const [action,label,value] of [['mastery-signature','拿手武学',m.signature],['mastery-internal','主运心法',`${m.internal}${m.internal==='未主运'?'':` · ${m.internalRank}重`}`]]){
        const b=document.createElement('button');b.dataset.mastery=action;b.textContent=`${label}：${value}　更换 ›`;b.onclick=()=>settle(action);choices.append(b);
      }
      const note=document.createElement('p');note.className='mastery-effects';
      note.textContent=`九阳已修 ${m.jiuyangRank??m.internalRank} 重；自身内力上限 ${m.baseMP}，主运增益 ${m.bonus}。\n胡刀专精：${m.huEffect?`忽略对手自身防御 ${m.huEffect} 点`:'设为拿手且练至八级后生效'}。\n太极相辅：${m.taiChiReduction?`当前进境每击耗内 ${m.taiChiNormalCost} → ${m.taiChiCost}，进境提高时随之调整`:'主运九阳，心法和太极均至三级起省内'}。切换不补气血或内力，进战后配置固定。`;
      if(m.yijin){const y=m.yijin,done=v=>v==='good'?'已完成':v==='evil'?'已辜负':'未完成';note.textContent+=`\n易筋 ${y.rank}重 · 品德 ${y.morality} · 护体 ${y.guard}点防御。\n归还托付：${done(y.entrusted)}；救助伤者：${done(y.wounded)}；悟法：${y.insight?'已领悟':'尚未领悟'}。\n护体须易筋八重并主运、亲历两善举且悟法；品德70全效、50以下无效。只抵御敌方武功，8/9/10重上限6/8/10点。`}
      if(m.version>=3)note.textContent+=`\n自身轻功 ${m.baseAgility}，梯云增益 ${m.lightnessBonus}；${m.version===4?'紫霞、九阳与易筋只能主运其一':'紫霞与九阳只能主运其一'}。`;
      const buttons=document.createElement('div');buttons.className='mastery-actions';
      for(const [action,label,disabled] of [['mastery-study',m.cost<0?(person.book.id<0?'先选择秘籍':maskReason(m.studyReason,person.book.id)||'已练至十级'):`研习一次 · ${m.cost}点`,!m.canStudy],['mastery-rest','论武休整',false],['mastery-spar','与胡斐切磋',person.hp<=0],...(m.version===4?[['mastery-yijin','行路悟法',false],['mastery-supply','试验点数补给',false]]:[])]){
        const b=document.createElement('button');b.dataset.mastery=action;b.textContent=label;b.disabled=disabled;b.onclick=()=>settle(action);buttons.append(b);
      }
      const caption=document.createElement('small');caption.textContent=m.version===4?'独立论武：本批12本秘籍，外功、内功、轻功合计最多学10门。易筋根基须自身内力100、攻击60、阳性或调和；资质影响费用，品德不锁基础修炼。行路悟法是三段原创选择，仅此试验可补给点数。散功返还最多补至32767，超出不保留，确认前显示实际返还。切磋与休整沿原流程。':m.version>=3?'独立论武：本批开放11本秘籍作比较，外功、内功、轻功合计最多学10门。藏书不占名额，医毒书不在本批。切磋可离场，最多四十回合，休整免费。':'独立论武样板：切磋用原战斗与成长结算，可离场，最多四十回合。休整仅在此试玩免费。';
      masteryBox.append(choices,note,buttons,caption);
      const investment=document.createElement(m.version>=3?'details':'p');investment.className='mastery-investment';
      investment.textContent=m.investment?`个人研习投入：胡家刀法 ${m.investment['84']} · 太极拳 ${m.investment['58']} · 九阳 ${m.investment['95']} 点。自带的一重修为不计入，实战熟练另记。`:'此旧试玩档只有累计投入，不能推算逐门返还。';
      if(m.version>=3){investment.textContent=Object.values(m.investments||{}).map(row=>`${row.name} ${row.paid}点`).join(' · ');const heading=document.createElement('summary');heading.textContent='查看逐门研习投入';investment.prepend(heading);}
      masteryBox.append(investment);
    }
    const arts=Object.values(person.skills||{});
    const studyCard=q('#party-study-card');studyCard.replaceChildren();
    const studyArt=gearIcon('book',person.book.id),studyCopy=document.createElement('div');
    studyCopy.innerHTML='<small>当前研习</small><h3></h3><progress max="100"></progress>';
    studyCopy.querySelector('h3').textContent=person.book.id>=0?person.book.name:'尚未选定秘籍';
    if(person.book.id>=0)paintGrade(studyCopy.querySelector('h3'),artGrade({bookId:person.book.id,name:person.book.name},true));
    studyCopy.querySelector('small').textContent=person.book.id>=0?'当前研习 · '+martialCategory(person.book.id):'当前研习';
    studyCopy.querySelector('progress').value=person.needed>0?Math.min(100,person.points/person.needed*100):0;
    studyCopy.querySelector('progress').setAttribute('aria-label','当前秘籍修炼进度');studyCard.append(studyArt,studyCopy);if(person.book.id>=0){const facts=document.createElement('details');facts.className='study-lore';const summary=document.createElement('summary');summary.textContent='来由与修炼条件';facts.append(summary);appendMartialLore(facts,{bookId:person.book.id,name:person.book.name,seen:true});appendRequirements(facts,maskRequirements(person.studyRequirements,person.book.id),{name:person.name});studyCard.append(facts);}
    q('.learned-heading').textContent=person.growth?`已学武学 · ${person.growth.count} / 10 门`:person.mastery?.version>=3?`已学武学 · ${person.mastery.totalLearned} / 10 门（含内功与轻功）`:`${person.mastery?'所学武功':'已学招式'} · ${arts.length} / 10`;
    q('#party-arts').replaceChildren(...arts.map(s=>{
      const e=document.createElement('button');e.className='art-card';e.type='button';e.setAttribute('aria-expanded','false');
      const title=document.createElement('strong');title.textContent=s.name;
      const rank=document.createElement('small');rank.textContent=`${s.level} / ${s.maxRank??10} ${s.rankUnit??'级'}`;
      const marks=document.createElement('span');marks.className='art-ranks';marks.setAttribute('aria-hidden','true');for(let i=1;i<=(s.maxRank??10);i++){const mark=document.createElement('i');mark.classList.toggle('filled',i<=s.level);marks.append(mark);}
      const detail=document.createElement('span');detail.className='art-detail';detail.hidden=true;
      detail.textContent=`每击基础耗内 ${s.cost??0} · ${['点攻','直线','十字','范围'][s.shape]||'招式'} · 招式范围 ${s.range??0} 格。实战耗内与威力随当时修为、站位及相辅效果变化。${s.technique?' '+s.technique:''}`;
      appendBenefits(detail,Object.values(person.growth?.learned||{}).find(r=>r.skill===s.id)?.benefits);
      const bookId=content.items.findIndex(t=>t?.['类型']===2&&t['练出武功']===s.id);paintGrade(title,artGrade({skillId:s.id,bookId:bookId>=0?bookId:undefined},true));appendMartialLore(detail,{skillId:s.id,bookId:bookId>=0?bookId:undefined,seen:true});appendRequirements(detail,maskRequirements(s.requirements,bookId>=0?bookId:undefined),{name:person.name});
      e.append(gearIcon('book',bookId),title,rank,marks,detail);e.onclick=()=>{const open=detail.hidden;for(const other of q('#party-arts').querySelectorAll('.art-card')){other.setAttribute('aria-expanded','false');const d=other.querySelector('.art-detail');if(d)d.hidden=true;}detail.hidden=!open;e.setAttribute('aria-expanded',String(open));};return e;
    }));
    if(!arts.length&&!Object.values(person.growth?.learned||{}).some(r=>!r.skill)&&!Object.keys(person.mastery?.learnedBooks||{}).length){const empty=document.createElement('p');empty.textContent=Object.keys(person.mastery?.learnedBooks||{}).length?'尚未修成招式，切磋时仍可使用普通拳脚。':'尚未习得武功，先从一本秘籍开始。';q('#party-arts').append(empty);}
    for(const b of [...Object.values(person.mastery?.learnedBooks||{}),...Object.values(person.growth?.learned||{}).filter(r=>!r.skill).map(r=>({...r,bookId:r.book}))]){
      const card=document.createElement('button');card.className='art-card';card.type='button';card.dataset.learnedBook=b.bookId;card.setAttribute('aria-expanded','false');
      const name=document.createElement('strong');name.textContent=b.name;paintGrade(name,artGrade({bookId:b.bookId,name:b.name},true));
      const rank=document.createElement('small');rank.textContent=`${b.rank} / ${b.maxRank??10} ${b.rankUnit??'重'}`;
      const kind=document.createElement('span');kind.className='manual-category';kind.textContent=martialCategory(b.bookId);
      const detail=document.createElement('span');detail.className='art-detail';detail.hidden=true;detail.textContent=b.effect||'';appendBenefits(detail,b.benefits);appendMartialLore(detail,{bookId:b.bookId,name:b.name,seen:true});appendRequirements(detail,maskRequirements(b.requirements,b.bookId),{name:person.name});
      card.append(gearIcon('book',b.bookId),name,rank,kind,detail);card.onclick=()=>{const open=detail.hidden;for(const other of q('#party-arts').querySelectorAll('.art-card')){other.setAttribute('aria-expanded','false');const d=other.querySelector('.art-detail');if(d)d.hidden=true;}detail.hidden=!open;card.setAttribute('aria-expanded',String(open));};q('#party-arts').append(card);
    }
    const dual=!!person.growth?.practice;
    q('#party-study-card').hidden=dual;q('.study-heading').hidden=dual;
    if(dual){normalButton.hidden=true;q('#party-training-note').textContent='战后自动研习；手动修炼也会投入现有心得。两门可练时平分，仅一门可练则集中投入；未用尽的心得保留。';}
    if(selection)renderLoadout(person,selection,coat,boots);
    if(person.teaching){
      const box=document.createElement('section');box.className='teaching-record';
      const title=document.createElement('h3');title.textContent='江湖传功';box.append(title);
      for(const g of Object.values(person.teaching.grants||{})){
        const row=document.createElement('p');row.textContent=`${g.name} · ${g.known?'已领会':g.received?'已受传授 · 修为已散':person.teaching.full?'待领会 · 可选择一门旧招改习':'尚未领会'}`;box.append(row);
      }
      if(Object.values(person.teaching.grants||{}).some(g=>g.learnable)){
        const b=document.createElement('button');b.textContent=person.teaching.full?'选择旧招改习':'领会传功';b.dataset.teaching='receive';b.onclick=()=>settle('teaching-receive');box.append(b);
      }
      const note=document.createElement('small');note.textContent='传授的招意留存于此。已领会的武功不会重复赠送修为。';box.append(note);q('#party-arts').append(box);
    }
    const study=person.brushStudy;
    if(study){
      const box=document.createElement('div');box.className='brush-study';
      const note=document.createElement('p');
      note.textContent=study.maxed?'判官笔已达十级。':`实战熟练 ${study.progress}/100；也可消耗 ${study.cost} 修炼点数升至 ${study.level+1} 级。当前 ${study.points} 点，与修炼秘籍共用；战斗后获得。`;
      box.append(note);
      if(!study.maxed){const b=document.createElement('button');b.id='brush-study';b.disabled=!study.eligible;b.textContent=study.points<study.cost?`还需 ${study.cost-study.points} 点`:'研习判官笔';b.onclick=()=>settle('brush-study');box.append(b);}
      q('#party-arts').append(box);
    }
    document.body.classList.add('party-open'); panel.showModal();panel.scrollTop=0;q('#party-close').focus({preventScroll:true});q('.party-cultivation').scrollTop=0;q('.party-information').scrollTop=0;q('.party-attribute-sheet').scrollTop=0;
    return new Promise(resolve=>{finish=resolve;});
  }
  return {update, show,chooseItems:data=>show(data.person,data)};
}
