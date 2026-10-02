import DATA from './martial-lore-data.js';
import {gradeView,appendGradeCosts} from './grade157.js';
const entries=DATA.entries;
// 同一套查法供来由文案与品第共用（157）：秘籍条目优先，其次招式，最后按名。
export function martialEntry({bookId,skillId,name,entry}={}) {
 if(bookId===198)skillId=21;
 const inner=bookId===41&&String(name||'').includes('罗汉伏魔');
 return entry||(inner?entries.find(e=>e.name==='罗汉伏魔神功'):entries.find(e=>bookId!=null&&e.nativeBookId===bookId&&e.nativeStage!=='inner'))||entries.find(e=>skillId!=null&&e.nativeSkillId===skillId)||entries.find(e=>e.name===name)||null;
}
export function martialLore(options={}) {
 const e=martialEntry(options);
 if(!e)return null;
 const text=e.lore||`${e.name}收录于${e.origin==='mod'?'爱好者 MOD':e.origin==='novel'?'现有原著核对目录':'旧版游戏'}。目前尚未核定同名原著武学的完整师承，暂不编写创始人或传授故事。`;
 const transmission=e.transmission||(e.nativeBookId!=null?'研习传承 · 是否可练，以选定人物的实际条件为准。':'此条为招式或候选记录，收录不等于已获得传授。');
 const sources=(e.sourceKeys||[]).map(k=>DATA.sources[k]).filter(s=>s?.url);
 return {name:e.name,text,transmission,sources};
}
const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
// options.seen：调用处确认玩家已见过（已学、在修、已入行囊）才出朱批；缺省一律不出（七·三）。
export function appendMartialLore(parent,options) {
 const info=martialLore(options);if(!info)return;
 const box=el('section','martial-lore');box.append(el('h4','','武学来由'),el('p','',info.text),el('p','martial-transmission',info.transmission));
 appendGradeCosts(box,gradeView(martialEntry(options),{seen:options?.seen===true}));
 parent.append(box);return box;
}
export function appendRequirements(parent,rows,{name='',title='修炼所需条件'}={}) {
 rows=Object.values(rows||{}).filter(Boolean);if(!rows.length)return;
 const box=el('section','martial-requirements');box.append(el('h4','',title+(name?' · '+name:'')));
 const list=el('ul','requirement-list');
 for(const row of rows){const line=el('li',row.met?'requirement-met':'requirement-unmet',(row.met?'✓ ':'未满足 · ')+row.text);line.dataset.met=String(!!row.met);line.dataset.requirement=row.key||'';list.append(line);}
 box.append(list);parent.append(box);return box;
}
