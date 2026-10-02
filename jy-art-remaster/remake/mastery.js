// Optional independent trial metadata; original binary records are unchanged.
export const MASTERY_V3_BOOKS=[84,58,95,39,45,54,67,68,69,70,71];
export const MASTERY_V4_BOOKS=[...MASTERY_V3_BOOKS,43];
export function normalizeMastery(raw) {
  if (!raw || ![1,2,3,4].includes(raw.version) || !(raw.version>=2?[0,20,67]:[20,67]).includes(raw.signature) || !(raw.version===4?[0,39,43,95]:raw.version===3?[0,39,95]:[0,95]).includes(raw.internal)) throw Error('论武试玩的修炼配置不完整。');
  const out={version:raw.version,signature:raw.signature,internal:raw.internal};
  for (const [key,min,max] of [['internalRank',raw.version>=2?0:1,10],['baseMP',0,999],['studySpent',0,100000000],['practice',0,100000000]]) {
    if (!Number.isInteger(raw[key]) || raw[key]<min || raw[key]>max) throw Error('论武试玩的修炼记录不完整。');
    out[key]=raw[key];
  }
  if(raw.version>=2){
    if(raw.internal===95&&raw.internalRank===0)throw Error('尚未修成九阳，不能设为主运心法。');
    if(!raw.perBookPaid||typeof raw.perBookPaid!=='object'||Array.isArray(raw.perBookPaid))throw Error('逐门修炼投入记录不完整，不能据此计算改练返还。');
    const ids=raw.version>=3?(raw.version===4?MASTERY_V4_BOOKS:MASTERY_V3_BOOKS).map(String):['58','84','95'];
    if(Object.keys(raw.perBookPaid).some(k=>!ids.includes(k)))throw Error('论武试玩包含尚未支持的逐门投入。');
    out.perBookPaid={};let sum=0;
    for(const id of ids){const paid=raw.perBookPaid[id];if(!Number.isInteger(paid)||paid<0||paid>100000000)throw Error('逐门修炼投入记录不完整，不能据此计算改练返还。');out.perBookPaid[id]=paid;sum+=paid;}
    if(sum>out.studySpent)throw Error('逐门投入超过累计修炼投入。');
    const base=raw.rootBase;
    if(!base||!Number.isInteger(base.fist)||!Number.isInteger(base.blade)||base.fist<0||base.fist>100||base.blade<0||base.blade>100)throw Error('人物自身拳刀根基记录不完整。');
    out.rootBase={fist:base.fist,blade:base.blade};
  }
  if(raw.version>=3){
    if(!raw.learnedBooks||typeof raw.learnedBooks!=='object'||Array.isArray(raw.learnedBooks))throw Error('已修内功与轻功记录不完整。');
    out.learnedBooks={};
    for(const [id,rank] of Object.entries(raw.learnedBooks)){
      if(!(raw.version===4?['39','45','43']:['39','45']).includes(id)||!Number.isInteger(rank)||rank<1||rank>10)throw Error('已修内功与轻功境界不完整。');
      out.learnedBooks[id]=rank;
    }
    if(raw.internal===39&&!out.learnedBooks['39'])throw Error('尚未修成紫霞，不能设为主运心法。');
    if(!Number.isInteger(raw.baseAgility)||raw.baseAgility<0||raw.baseAgility>100)throw Error('人物自身轻功记录不完整。');
    out.baseAgility=raw.baseAgility;
  }
  if(raw.version===4){
    if(raw.internal===43&&!out.learnedBooks['43'])throw Error('尚未修成易筋经，不能设为主运心法。');
    const story=raw.yijin;
    if(!story||!['pending','good','evil'].includes(story.entrusted)||!['pending','good','evil'].includes(story.wounded)||typeof story.insight!=='boolean')throw Error('行路悟法记录不完整。');
    if(story.insight&&(story.entrusted!=='good'||story.wounded!=='good'))throw Error('悟法记录缺少本人亲历善行。');
    out.yijin={entrusted:story.entrusted,wounded:story.wounded,insight:story.insight};
  }
  return out;
}
export const newMastery=(version=4)=>normalizeMastery({version,signature:67,internal:0,internalRank:1,baseMP:120,studySpent:0,practice:0,perBookPaid:Object.fromEntries((version===4?MASTERY_V4_BOOKS:MASTERY_V3_BOOKS).map(id=>[id,0])),rootBase:{fist:40,blade:40},learnedBooks:{},baseAgility:55,...(version===4?{yijin:{entrusted:'pending',wounded:'pending',insight:false}}:{})});
