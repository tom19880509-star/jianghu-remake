import manifest from './combat-art.json';
import {coherentStride} from './coherent-walk.js';
import {drawResampled} from './character-atlas.js';
const pages=new Map(),strides=new Map(),normalized=new Map();
export async function loadCombatArt() {
 await Promise.all(Object.entries(manifest.actors).map(async ([id,spec])=>{
  const im=new Image();im.src='assets/'+spec.file+'?v='+spec.version;await im.decode();pages.set(id,im);
 }));
}
export function combatRaster(pose) {
 const yang=pose.actor===58&&pose.yangFrame!==undefined;
 const key=yang?'58-'+['ne','se','nw','sw'][pose.direction]:pose.handFrame!==undefined ? '0-handling' : pose.actor===51 ? '51' : pose.actor===31&&pose.direction===2 ? pose.neutral||pose.walk?'31-left-neutral':'31-left' : pose.neutral||pose.walk ? pose.actor+'-neutral' : pose.artSet||String(pose.actor);
 const source=pages.get(key), spec=manifest.actors[key];if(!source||!spec)return null;
 let beat=yang?pose.yangFrame:pose.handFrame??(pose.neutral||pose.walk?0:pose.beat);
 if(key==='51')beat=beat>0?1:0;
 if(key==='7'||key==='10'||key==='15'||key==='31'||key==='31-left'||key==='32'||key==='33'||key==='34'||key==='44'||key==='61'||key==='67'||key==='68'||key==='70')beat=0;
 if(key==='0'&&pose.direction===0&&beat===1)beat=0;

 let raster={canvas:source,frame:spec.frames[yang?0:pose.direction][beat],scale:.5};
 if(spec.normalize){
  const id=key+':'+pose.direction+':'+beat,n=spec.normalize;
  if(!normalized.has(id)){
   const c=document.createElement('canvas');c.width=n.width;c.height=n.height;const g=c.getContext('2d');
   const [sx,sy,w,h,ax,ay]=raster.frame;
   // clarity 394: same destination rect as before; the .14–.65 reduction is now filtered
   // (successive halvings) instead of nearest-sampled, which dropped 3 of every 4–7 source px.
   drawResampled(g,source,sx,sy,w,h,n.ax-ax*n.scale,n.ay-ay*n.scale,w*n.scale,h*n.scale);
   normalized.set(id,{canvas:c,frame:[0,0,n.width,n.height,n.ax,n.ay],scale:.5});
  }
  raster=normalized.get(id);
 }
 if(!pose.walk)return raster;
 const phase=((pose.phase??0)%8+8)%8,cache=key+':'+pose.direction+':'+beat+':'+phase+':'+(pose.walkJoint??'default');
 if(!strides.has(cache))strides.set(cache,coherentStride(raster,pose.actor,pose.direction,phase/8,pose.walkJoint));
 return strides.get(cache);
}
export const combatArtStats=()=>({actors:[0,7,9,10,15,31,32,33,34,44,51,58,59,61,67,68,70].filter(id=>id===58?['ne','se','nw','sw'].every(d=>pages.has('58-'+d)):id===31?['31','31-neutral','31-left','31-left-neutral'].every(d=>pages.has(d)):[7,10,15,32,33,34,44,61,67,68,70].includes(id)?[String(id),id+'-neutral'].every(d=>pages.has(d)):pages.has(String(id))),sets:[...pages.keys()],revision:manifest.revision});
