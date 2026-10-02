import {heroGait} from './hero-walk.js';
// Animate the lower legs of the SAME neutral figure; never swap costume sheets,
// mirror an actor, or rotate the entire sprite. One foot supports, one recovers.
export function coherentStride(raster,actor,direction,phase,jointOverride) {
 if(actor===0)return heroStride(raster,direction,phase);
 const [sx,sy,w,h,ax,ay]=raster.frame,base=document.createElement('canvas');base.width=w;base.height=h;
 const bg=base.getContext('2d');bg.drawImage(raster.canvas,sx,sy,w,h,0,0,w,h);
 const out=document.createElement('canvas');out.width=w;out.height=h;const g=out.getContext('2d');g.imageSmoothingEnabled=false;
 const gait=heroGait(direction,phase,true),joint=jointOverride??(actor===59?111:96),bob=gait.bodyY*.65*2;
 g.drawImage(base,0,0,w,joint+1,0,bob,w,joint+1);
 const order=[0,1].sort((a,b)=>gait.feet[a].y-gait.feet[b].y);
 for(const leg of order){
  const x=leg?ax:0,width=leg?w-ax:ax,f=gait.feet[leg],length=ay-joint;
  const amplitude=actor===59?.5:.8,dx=f.x*2*amplitude,dy=f.y*2*amplitude;
  // Linear bend below the knee/hem; preserve the upper silhouette and hands.
  g.save();g.transform(1,0,dx/length,1+(dy-bob)/length,-dx*joint/length,bob-(dy-bob)*joint/length);
  g.drawImage(base,x,joint,width,ay-joint,x,joint,width,ay-joint);g.restore();
 }
 return {canvas:out,frame:[0,0,w,h,ax,ay],scale:raster.scale};
}

// Hero-neutral-v2 has short trousers and visible boots. Bend at the actual knee,
// then translate the whole boot; shearing it from the hem made the toes splay.
export function heroStride(raster,direction,phase) {
 const [sx,sy,w,h,ax,ay]=raster.frame;
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 const gait=heroGait(direction,phase,true),hip=92,knee=109,ankle=119;
 const bob=gait.bodyY*.65,split=ax+[-2,-1,1,1][direction];
 const feet=gait.feet.map(f=>({x:f.x*.72,y:f.y*.8}));
 for(const leg of [0,1].sort((a,b)=>feet[a].y-feet[b].y)){
  const x=leg?split:0,width=leg?w-split:split,f=feet[leg];
  const bands=[[hip,knee,{x:0,y:bob},{x:f.x*.4,y:f.y*.35}],
   [knee,ankle,{x:f.x*.4,y:f.y*.35},f],[ankle,h,f,f]];
  for(const [top,bottom,a,b]of bands){
   const dx=(b.x-a.x)/(bottom-top),dy=(b.y-a.y)/(bottom-top);
   g.save();g.transform(1,0,dx,1+dy,a.x-dx*top,a.y-dy*top);
   g.drawImage(raster.canvas,sx+x,sy+top,width,bottom-top,x,top,width,bottom-top);g.restore();
  }
 }
 g.drawImage(raster.canvas,sx,sy,w,hip+1,0,bob,w,hip+1);
 return {canvas:c,frame:[0,0,w,h,ax,ay],scale:raster.scale};
}
