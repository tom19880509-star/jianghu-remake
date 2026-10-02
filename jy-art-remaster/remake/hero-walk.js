// Use only the four independently painted neutral poses, never the repeated
// leading-foot poses on the generated sheet. Ground anchors stay fixed.
export const HERO_SHEET = 'xiaoxiami-pixel-trial-poses-v1.png';
export const HERO_FRAMES = [[350,17,97,247],[345,283,99,252],[343,555,104,251],[344,823,97,253]];
const rigs = [
 {hip:174,knee:214,ankle:244,split:[[398,174],[398,215],[394,239],[395,264]],
  arms:[[[350,126],[370,126],[369,151],[374,178],[348,178]],[[426,129],[449,127],[449,183],[429,183],[425,154]]]},
 {hip:443,knee:485,ankle:514,split:[[397,443],[396,475],[394,493],[392,506],[397,514],[405,521],[405,535]],
  arms:[[[343,400],[368,400],[365,419],[368,451],[341,451]],[[425,399],[447,397],[447,449],[426,449],[424,420]]]},
 {hip:714,knee:758,ankle:785,split:[[394,714],[396,750],[395,774],[397,792],[397,807]],
  arms:[[[340,670],[364,670],[361,688],[367,720],[338,720]],[[425,671],[449,666],[449,716],[427,716],[425,688]]]},
 {hip:984,knee:1026,ankle:1055,split:[[392,984],[391,1022],[391,1041],[393,1056],[384,1076]],
  arms:[[[340,939],[363,939],[360,953],[365,984],[338,984]],[[418,936],[445,933],[447,988],[417,988],[416,954]]]},
];
const axes=[[1,-.5],[1,.5],[-1,-.5],[-1,.5]];
const surface=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
function polygon(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
// Exactly one supporting leg, opposite legs half a cycle apart. The support
// foot travels steadily backward; only the returning foot lifts at the knee.
export function heroGait(direction,phase,moving=true){
 const axis=axes[direction],p=((phase%1)+1)%1;
 const bodyY=moving?-.45*(1-Math.cos(p*Math.PI*4)):0;
 const feet=[0,1].map(i=>{
  const t=(p+i*.5)%1,support=t<.5,u=(t-.5)*2;
  const along=moving?(support?4.5*(1-4*t):4.5*(-1+2*(u*u*(3-2*u)))):0;
  const lift=moving&&!support?2.3*Math.sin(u*Math.PI):0;
  return {x:along*axis[0],y:along*axis[1]-lift,lift,support,along};
 });
 return {bodyY,feet,phase:p,moving};
}
export function buildHeroWalk(sheets){
 const sheet=sheets.get(HERO_SHEET);
 if(!sheet)throw new Error('主角四向素材未载入');
 const prepared=HERO_FRAMES.map(([sx,sy,w,h],direction)=>{
  const r=rigs[direction],local=pts=>pts.map(([x,y])=>[x-sx,y-sy]);
  const base=surface(w,h);base.getContext('2d').drawImage(sheet,sx,sy,w,h,0,0,w,h);
  const hip=r.hip-sy,split=local(r.split);
  const legShapes=[[[0,hip],...split,[0,h]],[[w,hip],[w,h],...split.slice().reverse()]],arms=r.arms.map(local);
  const mask=points=>{const c=surface(w,h),g=c.getContext('2d');polygon(g,points);g.clip();g.drawImage(base,0,0);return c;};
  const legs=legShapes.map(shape=>{const c=mask(shape),g=c.getContext('2d');g.globalCompositeOperation='destination-out';arms.forEach(a=>{polygon(g,a);g.fill();});return c;});
  const body=surface(w,h),bg=body.getContext('2d');bg.drawImage(base,0,0);bg.globalCompositeOperation='destination-out';
  [...legShapes,...arms].forEach(a=>{polygon(bg,a);bg.fill();});
  return {w,h,hip,knee:r.knee-sy,ankle:r.ankle-sy,base,body,legs,arms:arms.map(mask),armPivots:arms.map(a=>Math.min(...a.map(p=>p[1])))};
 });
 const pose=(direction,phase,moving)=>{
  const r=prepared[direction],gait=heroGait(direction,phase,moving),scale=52/r.h;
  const c=surface(48*3,64*3),g=c.getContext('2d');g.scale(3,3);g.translate(24-r.w*scale/2,56-52);g.scale(scale,scale);g.imageSmoothingEnabled=false;
  if(!moving)g.drawImage(r.base,0,0);
  else {
   const shifts=gait.feet.map(f=>({hip:[0,gait.bodyY/scale],knee:[(f.x*.43+axes[direction][0]*f.lift*.3)/scale,(f.y*.38-f.lift*.35+gait.bodyY*.5)/scale],ankle:[f.x/scale,f.y/scale]}));
   const order=[0,1].sort((a,b)=>shifts[a].ankle[1]-shifts[b].ankle[1]);
   for(const i of order){
    const k=shifts[i],bands=[[r.hip,r.knee,k.hip,k.knee],[r.knee,r.ankle,k.knee,k.ankle],[r.ankle,r.h,k.ankle,k.ankle]];
    for(const [a,b,da,db] of bands){
     const dx=(db[0]-da[0])/(b-a),dy=(db[1]-da[1])/(b-a);
     g.save();g.transform(1,0,dx,1+dy,da[0]-dx*a,da[1]-dy*a);
     const top=Math.max(r.hip,a-.35),bottom=Math.min(r.h,b+.35);
     g.drawImage(r.legs[i],0,top,r.w,bottom-top,0,top,r.w,bottom-top);g.restore();
    }
   }
   g.drawImage(r.body,0,gait.bodyY/scale);
   r.arms.forEach((arm,i)=>{
    const pivot=r.armPivots[i],length=Math.max(1,r.hip-pivot),f=gait.feet[i];
    const dx=-f.x*.36/scale,dy=-f.along*axes[direction][1]*.22/scale;
    g.save();g.transform(1,0,dx/length,1+dy/length,-dx*pivot/length,gait.bodyY/scale-dy*pivot/length);g.drawImage(arm,0,0);g.restore();
   });
  }
  return {canvas:c,frame:[0,0,c.width,c.height,24*3,56*3],scale:1/3,gait};
 };
 const sequence=n=>Array.from({length:4},(_,d)=>Array.from({length:n},(_,i)=>pose(d,i/n,true)));
 return {stand:Array.from({length:4},(_,d)=>pose(d,0,false)),smooth:sequence(12),explore:sequence(6),battle:sequence(8)};
}
