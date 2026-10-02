// Visits are per save and per playthrough, never inferred from unlocked gates.
export function normalizeExplored(raw){
 if(!Array.isArray(raw)||raw.length>84||raw.some(id=>!Number.isInteger(id)||id<0||id>=84))throw Error('江湖图到访记录不完整。');
 return [...new Set(raw)].sort((a,b)=>a-b);
}
export function recordVisit(journey,id){
 if(!Number.isInteger(id)||id<0||id>=84)return;
 journey.explored=normalizeExplored([...(journey.explored||[]).filter(x=>x!==id),id]);
}
export function exploredDestinations(snapshot,journey){
 const visited=new Set(journey.explored||[]);
 return Object.values(snapshot.destinations||{}).filter(d=>visited.has(d.id)).sort((a,b)=>Math.abs(a.x-snapshot.worldX)+Math.abs(a.y-snapshot.worldY)-Math.abs(b.x-snapshot.worldX)-Math.abs(b.y-snapshot.worldY));
}
// Reuse the atlas name indoors; only visited names participate in disambiguation.
export function destinationLabel(destination,visited,entrances){
 if(!visited.some(other=>other.id!==destination.id&&other.name===destination.name))return destination.name;
 const landmark=d=>{
  const near=entrances.filter(o=>o.name!==d.name)
   .sort((a,b)=>Math.abs(a.x-d.x)+Math.abs(a.y-d.y)-Math.abs(b.x-d.x)-Math.abs(b.y-d.y))[0];
  return near?`${near.name}一带`:`${d.x}，${d.y}`;
 };
 const area=landmark(destination);
 const shared=visited.some(other=>other.id!==destination.id&&other.name===destination.name&&landmark(other)===area);
 return `${destination.name} · ${area}${shared?` · ${destination.x}，${destination.y}`:''}`;
}
