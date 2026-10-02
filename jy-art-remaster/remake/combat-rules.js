// One probability function serves both the target preview and Lua's resolution.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function combatChances(attackAgility,defendAgility,level,knowledge=0){
 const mastery=clamp(Math.floor(level),1,10);
 const evade=clamp(8+clamp((defendAgility-attackAgility)*.1,-4,4)-(mastery-1)*.5,0,15);
 const critical=clamp(5+(mastery-1)*.5+clamp(knowledge*.02,0,2),5,12);
 return {hit:100-evade,evade,critical,multiplier:1.35};
}
