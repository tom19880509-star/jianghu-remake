// Signature martial-art effects. Native clocks/targets remain authoritative; everything here is
// presentation, never damage, range, MP or extra strikes. Visuals bind to the MARTIAL-ART ID.
//
// vfx 394 redo (claude-vfx-redo-20261001/production-notes.md):
//  • Anchors: qi leaves the caster's REAL striking hand / blade tip, measured from the pose the engine
//    actually draws this frame (measureCasterPose), not a fixed chest point 12 px behind the fist.
//  • Layers: one cast is split into ground / behind-caster / over-caster / between-fighters (mid) /
//    behind-each-struck-fighter (cell) / front slots, inserted into the engine's depth-sorted actor loop,
//    so neither the caster nor the target is painted over by a full-screen motif.
//  • Left-facing casts are mirrored, never rotated ~180° (no belly-up dragon, no hanging fire).
//  • Sizes come from the real distance and footprint: nothing extends behind the caster or past the target.
//  • Beats: 起势 wind-up on the source's pre-contact actor frames → 发力 release at contact → 命中 at the
//    shared VFX_HIT moment with a white peak of at most two native frames → 消散 dry-brush dissipation.
//  • The eight representative arts (25 30 20 58 57 63 66 24) are hand-built brush shapes in flat value
//    layers; the remaining arts keep their painted atlas motif, now anchored, mirrored and never stretched.
import {paintHandBlade} from './flame-blade.js';
import {paintSignatureTexture,textureAspect,seeded,bezier,arcPoints,pathLength,pointAt,slice,wobble,ribbon,fibers,chip,blot,burst,brush,dab,brushLayer,mix,tone} from './signature-art.js';
export {loadSignatureArt} from './signature-art.js';
import {SIGNATURE_CATALOG} from './signature-catalog.js';
import {vfxIntensity,vfxGlowColor,VFX_HIT,paintVfxCast,paintVfxImpact} from './combat-vfx.js';
import {flameCoatWeapon,coherentBinding} from './combat-animation.js';
import {heroWeaponPlacement} from './hero-weapon-rig.js';
import {weaponModel} from './weapon-models.js';
export const SIGNATURE_ARTS=Object.freeze(Object.fromEntries(Object.entries(SIGNATURE_CATALOG).map(([id,v])=>[id,v.kind])));
// Hand-built in vfx 394 (by martial-art id; each owns a unique kind in the catalog).
export const REDRAWN_ARTS=Object.freeze([20,24,25,30,57,58,63,66]);
// Same language extended (vfx 394 revision round): 独孤九剑, 辟邪剑法, 打狗棍法, 玉女素心剑.
export const EXTENDED_ARTS=Object.freeze([49,60,61,87]);
// Facing → grid step, the same table as the source's CC.DirectX / CC.DirectY.
const FACING=[[0,-1],[1,0],[-1,0],[0,1]];
const ANGLE=[-Math.PI/6,Math.PI/6,-5*Math.PI/6,5*Math.PI/6];
export function signatureTarget(v,cx,cy,cells){
  let target={x:v.targetX,y:v.targetY};
  // 十字招原版不带瞄准点（玩家路径为 nil→0,0，AI 路径为自身格），按施术者朝向取一臂。
  const shape=SIGNATURE_CATALOG[v.skill]?.shape;
  if(shape!==1&&shape!==2){
    // 157: a target nothing could reach (the live game can pass 0,0) aims at the nearest struck cell instead.
    if(cells.length&&Math.abs(target.x-cx)+Math.abs(target.y-cy)>12){
      // 395: an area art's footprint is a diamond centred on the aim, so its centroid IS the aim. (The nearest
      // footprint cell was the caster's own cell whenever the caster stood inside its own area — the player path
      // passes 0,0 — and the whole cast was then painted on the caster's back.)
      if(shape===3&&cells.length>1){
        const mx=Math.round(cells.reduce((s,c)=>s+c.x,0)/cells.length),my=Math.round(cells.reduce((s,c)=>s+c.y,0)/cells.length);
        target={x:mx,y:my};
      }else{
        let best=null,d=Infinity;for(const c of cells){const k=Math.abs(c.x-cx)+Math.abs(c.y-cy);if(k<d){d=k;best=c;}}
        if(best)target={x:best.x,y:best.y};
      }
    }
    return target;
  }
  // Native line attacks pass the adjacent direction cell, not the far endpoint — and in the live game often 0,0
  // (157: the aim then flew off-screen). Take the direction from that cell when it is adjacent, else from facing.
  // Follow only the actual damage footprint in that direction; never invent range.
  let dx=target.x-cx,dy=target.y-cy;
  if(Math.abs(dx)+Math.abs(dy)!==1){
    const f=FACING[v.direction];if(!f)return target;
    [dx,dy]=f;target={x:cx+dx,y:cy+dy};
  }
  let far=dx*dx+dy*dy;
  for(const {x,y} of cells){
    const rx=x-cx,ry=y-cy,d=rx*rx+ry*ry;
    if(rx*dy===ry*dx && rx*dx+ry*dy>0 && d>far){target={x,y};far=d;}
  }
  return target;
}
export function signaturePhase(v, pic) {
  if (!v || (v.skill===0&&v.kind===0) || v.kind < 0 || !SIGNATURE_ARTS[v.skill] || !Number.isFinite(v.first) || !(v.count > 0)) return null;
  const frame=pic-v.first-1;
  // The engine interpolates between native frames (fractional pic); never overshoot the last frame.
  return Number.isFinite(frame) && frame>=0 && frame<v.count ? Math.min(1,frame/Math.max(1,v.count-1)) : null;
}
// 起势: the source draws only the actor's own frames before contact (effect frame −1). 0 < w ≤ 1 over them.
// Plain strikes (普通攻击 / 'impact' fists) gather nothing.
export function signatureWindup(v){
  if(!v||v.kind<0||(v.skill===0&&v.kind===0)||!SIGNATURE_ARTS[v.skill]||SIGNATURE_ARTS[v.skill]==='impact')return null;
  const c=v.contactFrame,f=v.sourceFrame;
  if(!(c>0)||!Number.isFinite(f)||f<0||f>=c)return null;
  return (f+1)/c;
}
// Legacy straight-line helper (kept for callers/tests that still read it).
export function signaturePath(v,pic,sx,sy,tx,ty,reduced=false) {
  const t=signaturePhase(v,pic);
  if(t===null || ![sx,sy,tx,ty].every(Number.isFinite))return null;
  const dx=tx-sx,dy=ty-sy,length=Math.hypot(dx,dy);
  const angle=length>.01?Math.atan2(dy,dx):ANGLE[v.direction]??0;
  const travel=reduced?1:Math.min(1,t/.58);
  return {t,angle,length,x:sx+dx*travel,y:sy+dy*travel-28,
    alpha:Math.min(1,(t+.08)*7)*Math.min(1,(1-t)*5)};
}

// ---- Anchors -------------------------------------------------------------------------------
// The caster's pose as actually drawn this frame, measured once per pose in a small offscreen probe
// (the same approach as the engine's figureOf). Coordinates are logical px relative to the foot point
// the engine draws at. reachE/W = the most forward opaque pixel above the knees: the fist, the fingers
// or the weapon tip, whichever the art really shows.
const poseCache=new Map(),PW=256,PH=208,FOOT=176;let probe=null;
export function measureCasterPose(key,draw){
  if(poseCache.has(key)){const p=poseCache.get(key);poseCache.delete(key);poseCache.set(key,p);return p;}
  const doc=globalThis.document;if(typeof draw!=='function'||!doc?.createElement)return null;
  probe||=doc.createElement('canvas');probe.width=PW;probe.height=PH;
  const t=probe.getContext('2d',{willReadFrequently:true});if(!t?.getImageData)return null;
  t.setTransform(1,0,0,1,0,0);t.clearRect(0,0,PW,PH);t.setTransform(2,0,0,2,PW/2,FOOT);
  try{draw(t,0,0);}catch{return null;}finally{t.setTransform(1,0,0,1,0,0);}
  const d=t.getImageData(0,0,PW,PH).data;
  let top=Infinity,bottom=-Infinity,left=Infinity,right=-Infinity,eX=-Infinity,eY=0,eN=0,wX=Infinity,wY=0,wN=0;
  for(let py=0;py<PH;py++)for(let px=0;px<PW;px++){
    if(d[(py*PW+px)*4+3]<110)continue;
    const x=(px-PW/2)/2,y=(py-FOOT)/2;
    if(y<top)top=y;if(y>bottom)bottom=y;if(x<left)left=x;if(x>right)right=x;
    if(y>-10)continue;
    if(x>eX+.75){eX=x;eY=y;eN=1;}else if(x>=eX-.75){eY+=y;eN++;}
    if(x<wX-.75){wX=x;wY=y;wN=1;}else if(x<=wX+.75){wY+=y;wN++;}
  }
  if(!Number.isFinite(top)||!eN||!wN)return null;// art not decoded yet: retry next frame
  const pose={top,bottom,left,right,reachE:[eX,eY/eN],reachW:[wX,wY/wN]};
  poseCache.set(key,pose);if(poseCache.size>96)poseCache.delete(poseCache.keys().next().value);
  return pose;
}
// Without a measured pose (tests, previews before art decodes): the hero's measured contact fists
// (audit §8, +3 battle sole drop). Deliberately the same for every caster — appearance binds to the art.
const FALLBACK_REACH=[[24.8,-39.5],[23.8,-34],[-24.5,-40.5],[-23.5,-34]];
// Blade lines (grip → tip, logical px from the foot point) for casters whose weapon is part of the art.
// The hero: from the real weapon rig (hero-weapon-rig.js grip + angle, model length). Raw/remade sheets:
// measured per frame (claude-vfx-redo-20261001/harness measureBlades + visual check of every pose).
const DI_BLADE=[// 狄云 blood sabre, fight037: [dir][phase] = [gripX,gripY,tipX,tipY]
  [[9,-26,24,-48],[19,-40,6,-55],[21,-29,43,-10],[11,-23,32,-6]],
  [[-10,-27,11.5,-10],[-15,-26.5,0,-54],[8,-23,34,-6.5],[-9,-23,15,-9]],
  [[17.5,-43,5,-58],[19,-44,1,-59],[-21,-47,-46,-54],[19,-44,1,-57]],
  [[-1,-21,-30,-10],[-10,-52,18,-45],[-14,-23.5,-34,-4],[4,-17,-26,-10]],
];
const BLADES={fight037:id=>{if(!(id>=0&&id<40))return null;const n=id%10,b=DI_BLADE[Math.floor(id/10)][n<2?0:n<4?1:n<8?2:3];return {grip:[b[0],b[1]],tip:[b[2],b[3]]};}};
export function bladeLine(v,actor,equipment){
  if(!actor||!Number.isFinite(actor.id))return null;
  if(actor.pack==='fight000'&&(v?.artActor??v?.pid)===0){
    const pose=coherentBinding('fight000',actor.id,v,null,equipment),p=pose&&heroWeaponPlacement(pose),m=p&&weaponModel(p.id);
    if(!p||p.behind||!m||!Number.isFinite(p.angle))return null;
    const gx=(p.x-96)*.5,gy=(p.y-128)*.5,L=m.length*.5;
    return {grip:[gx,gy],tip:[gx+Math.cos(p.angle)*L,gy+Math.sin(p.angle)*L]};
  }
  return BLADES[actor.pack]?.(actor.id)??null;
}
export function castAnchors(v,sx,sy,tx,ty,pose,blade=null){
  const d=Number.isInteger(v?.direction)&&v.direction>=0&&v.direction<4?v.direction:(tx>=sx?(ty<sy?0:1):(ty<sy?2:3));
  const k=d<2?1:-1,top=Number.isFinite(pose?.top)?pose.top:-53;
  let reach=pose?(k>0?pose.reachE:pose.reachW):null;
  if(!reach||!reach.every(Number.isFinite)||Math.abs(reach[0])>60)reach=FALLBACK_REACH[d];
  const D=Math.hypot(tx-sx,ty-sy);
  const B=blade&&{grip:{x:sx+blade.grip[0],y:sy+blade.grip[1]},tip:{x:sx+blade.tip[0],y:sy+blade.tip[1]}};
  return {d,k,back:d===0||d===2,top,D,S:{x:sx,y:sy},T:{x:tx,y:ty},H:{x:sx+reach[0],y:sy+reach[1]},blade:B,
    shoulder:{x:sx+k*2,y:sy+top*.7},targetFront:ty>sy+.5,cells:D/26.83};
}

// ---- small helpers ---------------------------------------------------------------------------
const clamp=(x,a=0,b=1)=>x<a?a:x>b?b:x;
const ease=u=>1-(1-clamp(u))**3,smooth=u=>{u=clamp(u);return u*u*(3-2*u);};
const ramp=(x,a,b)=>clamp((x-a)/(b-a));
const norm=(x,y)=>{const l=Math.hypot(x,y)||1;return [x/l,y/l];};
// Mirrored screen frame: local +x along (ux,uy), local −y on the screen-up side. Never upside down.
function frame(g,x,y,ux,uy){[ux,uy]=norm(ux,uy);let nx=-uy,ny=ux;if(ny<0||(ny===0&&nx>0)){nx=-nx;ny=-ny;}g.transform(ux,uy,nx,ny,x,y);}
// The white impact peak: at most two native frames from the shared hit moment.
const peakU=c=>c.t===null||c.t<VFX_HIT?null:(()=>{const u=(c.t-VFX_HIT)/(1.5*c.ft);return u<1?u:null;})();
const afterHit=(c,len=.45)=>c.t===null||c.t<VFX_HIT?null:clamp((c.t-VFX_HIT)/len);
// Converging wisps into the striking hand (起势).
function gather(g,H,w,seed,{color,ink,count=3,radius=13,width=1.2,squash=.8}={}){
  const a0=smooth(w*1.4);if(!(a0>.02))return;
  for(let i=0;i<count;i++){
    const start=i*Math.PI*2/count+w*3.4+seed%7,r=radius*(1-w*.82)+3;
    const pts=arcPoints(H.x,H.y,r,r*squash,start,start+1.05,8).map(([x,y],j)=>{const k=1-j/8*.55;return [H.x+(x-H.x)*k,H.y+(y-H.y)*k];});
    if(ink)ribbon(g,pts,s=>width*(1-s)*.95+.35,{color:ink,alpha:.55*a0});
    ribbon(g,pts,s=>width*(1-s)*.8+.15,{color,alpha:.9*a0});
  }
}
function leaf(g,x,y,len,rot,color,alpha){
  if(!(alpha>.02))return;
  g.save();g.globalAlpha*=clamp(alpha);g.fillStyle=color;g.translate(x,y);g.rotate(rot);
  g.beginPath();g.moveTo(-len,0);g.quadraticCurveTo(0,-len*.45,len,0);g.quadraticCurveTo(0,len*.45,-len,0);g.fill();g.restore();
}

// ---- shared brush language (vfx 394 final art round) ------------------------------------------------
// Every effect body is a brush stroke (signature-art.js brush): bristles with jittered offsets, lengths and
// alpha; across the stroke a 1 px hot edge → body → same-hue ink on the trailing side; along it the head is
// opaque and the tail fragments beat by beat. No black outlines, no closed rings or badges, no flat fills.
// Each layer slot is rendered into a supersampled offscreen layer and downsampled (brushLayer).
const facingVec=A=>[Math.cos(ANGLE[A.d]),Math.sin(ANGLE[A.d])];
// Adjacent with the foe standing in front: the foe hides everything between the two bodies, so the strike is
// drawn in the front slot (over the foe, below its face) instead of the mid slot.
const adjFront=c=>c.A.targetFront&&c.A.D<34;
const upNormal=(ux,uy)=>{let nx=uy,ny=-ux;if(ny>0||(ny===0&&nx<0)){nx=-nx;ny=-ny;}return [nx,ny];};// screen-up side
function grow(pts,d){const cx=pts.reduce((s,p)=>s+p[0],0)/pts.length,cy=pts.reduce((s,p)=>s+p[1],0)/pts.length;
  return pts.map(([x,y])=>{const dx=x-cx,dy=y-cy,l=Math.hypot(dx,dy)||1;return [x+dx/l*d,y+dy/l*d];});}
function poly(g,pts,color,alpha=1){// tiny details only (an eye), never an effect body
  if(!(alpha>.01)||!pts||pts.length<3)return;
  g.save();g.globalAlpha*=clamp(alpha);g.fillStyle=color;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();g.restore();
}
// Legacy helper names used by the extended arts, now brush-rendered (no ink outline).
function inked(g,pts,hw,color,{ink,alpha=1,seed=1}={}){brush(g,pts,hw,{colors:tone(color,ink?mix(ink,color,.35):undefined),alpha,seed,dry:.4});}
const pal3=p=>({edge:p.edge&&p.edge.length===7&&!p.core?p.edge:(p.core||p.mid||mix(p.body,'#ffffff',.7)),body:p.body,ink:p.ink});
// Impact peak (≤1.5 native frames, behind the struck figure): short radiating brush flicks, dense at the
// centre, breaking outward — not a filled star.
function flare(g,x,y,r,colors,alpha,seed){
  if(!(alpha>.02))return;const rnd=seeded(seed);
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2+rnd()*.6,l=r*(.55+.55*rnd());
    brush(g,[[x+Math.cos(a)*l,y+Math.sin(a)*l*.8],[x+Math.cos(a)*1.2,y+Math.sin(a)*1]],s=>.3+1.3*s,{colors,alpha,seed:seed+i,n:4,dry:.35,tailAlpha:.25});}
}

// ---- 降龙十八掌 25: a small GOLD dragon of brush strokes, out of the palm --------------------------------
const DRAGON={edge:'#fff0bd',body:'#d4962c',ink:'#6a3d0c',mane:'#a65c18',eye:'#e3521b'};
const DRAGON_C={edge:DRAGON.edge,body:DRAGON.body,ink:DRAGON.ink},MANE_C={edge:'#e8b25e',body:DRAGON.mane,ink:'#4a280a'};
// Ranged: a low S from the palm; the snout stops at the foe's near edge (near shoulder/chest, below the face).
// Adjacent, foe in front: it hooks down and back from the fist through the gap between the bodies and bites the
// foe's near side at waist height. Adjacent, foe behind: it drives through at waist height and the head comes out
// the open far side below the face. Never behind the foe's head, never across the face.
function dragonPath(c){
  const {A}=c,k=A.k,H=A.H,T=A.T,adjacent=A.D<34;let pts;
  if(adjacent&&A.targetFront){const E=[T.x-k*13,T.y-25];pts=bezier([H.x,H.y],[H.x-k*10,H.y+10],[E[0]-k*14,E[1]+4],E,28);}
  else if(adjacent){const E=[T.x+k*13,T.y-21];pts=bezier([H.x,H.y],[H.x+k*3,H.y+9],[E[0]-k*10,E[1]+3],E,28);}
  else{
    const near=[T.x-k*9,T.y-27],[ux,uy]=norm(near[0]-H.x,near[1]-H.y),E=[near[0]-ux*13,near[1]-uy*13],L=Math.hypot(E[0]-H.x,E[1]-H.y);
    pts=wobble(bezier([H.x,H.y],[H.x+ux*L*.33,H.y+uy*L*.33-4],[E[0]-k*L*.3,E[1]-2],E,28),
      s=>Math.sin(s*Math.PI*2.4)*4*Math.sin(Math.PI*Math.min(1,s*1.1))*(1-s*s));
  }
  pts.adjacent=adjacent;return pts;
}
// Head ≈15×10 in local frame (facing +x, −y = screen up): a wedge of strokes from the back of the skull to the
// snout, a darker lower jaw with a 2 px mouth gap, two back-swept horn strokes, an ochre mane of three flicks,
// an orange eye. Edges come from the bristles, value from the ink side of each stroke.
function dragonHead(g,x,y,ux,uy,alpha,scale,seed){
  g.save();frame(g,x,y,ux,uy);g.scale(scale,scale);
  for(const [tx,ty,i] of [[-10,-6.5,0],[-11,-1,1],[-8.5,4,2]])
    brush(g,[[tx,ty],[-1.5,ty*.25-1]],s=>.35+1.9*s,{colors:MANE_C,alpha,seed:seed+i,n:5,dry:.6,tailAlpha:.25});
  brush(g,[[-10,-11.5],[1,-4.4]],s=>.3+1*s,{colors:{edge:'#b9853e',body:'#4e2e10',ink:'#241304'},alpha,seed:seed+5,n:4,dry:.3,tailAlpha:.45});
  brush(g,[[-6,-12.5],[2.8,-4.8]],s=>.3+1*s,{colors:{edge:'#b9853e',body:'#4e2e10',ink:'#241304'},alpha,seed:seed+6,n:4,dry:.3,tailAlpha:.45});
  // skull → snout wedge (dense, little dryness: the head is the solid end of the dragon)
  brush(g,[[13.4,-1.1],[6.5,-2.8],[-4,-2.4]],s=>.5+3.6*Math.pow(s,.7),{colors:{edge:'#fff4cc',body:'#e0a032',ink:'#3e2206'},alpha,seed:seed+7,n:12,dry:.06,tailAlpha:1,overlap:2.2,inkShare:.45,edgeShare:.12,lead:[1,-.6]});
  // lower jaw, darker, a mouth gap above it toward the front
  brush(g,[[11.5,3.6],[4,3.2],[-2.5,2.6]],s=>.4+1.6*s,{colors:{edge:'#e8b25e',body:'#8a5212',ink:'#2e1804'},alpha,seed:seed+8,n:8,dry:.08,tailAlpha:1,overlap:2.2,inkShare:.5});
  g.globalAlpha=alpha;g.fillStyle='#3a1e06';g.beginPath();g.ellipse(3.8,-3.2,1.25,.85,-.2,0,Math.PI*2);g.fill();
  g.fillStyle=DRAGON.eye;g.beginPath();g.ellipse(4,-3.2,.75,.55,-.2,0,Math.PI*2);g.fill();
  // whiskers: two thin dry strokes
  brush(g,[[18,-4.5],[12,-1.5]],s=>.2+.45*s,{colors:DRAGON_C,alpha:.9*alpha,seed:seed+9,n:2,dry:.3});
  brush(g,[[16,6.5],[10.5,3.8]],s=>.2+.45*s,{colors:DRAGON_C,alpha:.9*alpha,seed:seed+10,n:2,dry:.3});
  g.restore();
}
function paintDragon(c,{body=true,head=true}={}){
  const {g,t,reduced}=c,pts=dragonPath(c),len=pathLength(pts),win=Math.min(1,36/Math.max(1,len));
  // 发力: the tail holds at the fist for two native frames while the body grows out of it, then darts.
  const hold=2*c.ft,grown=reduced?1:ease(t/(hold+c.ft));
  const sh=reduced?1:t<hold?win*grown:Math.min(1,win+(1-win)*smooth((t-hold)/(VFX_HIT-hold)));
  const u=t>=VFX_HIT?(t-VFX_HIT)/c.ft:null;// native frames after the bite
  const s0=Math.max(0,sh-win)+(u===null?0:win*.85*ease(u/4));// cools and draws into the foe, tail first
  if(body&&sh-s0>.012){
    const raw=slice(pts,s0,sh,22),seg=wobble(raw,x=>Math.sin((x*1.3-t*5)*Math.PI)*1.1*(1-x));
    const B=x=>clamp((s0+(sh-s0)*x-(sh-win))/win);// 0 tail … 1 neck
    const thin=u===null?1:1-.6*ease(u/3),hw=x=>(1.3+2.6*Math.pow(B(x),.7))*thin;
    const cool=u===null?0:clamp(u/3);
    const col={edge:mix(DRAGON.edge,'#c9a878',cool),body:mix(DRAGON.body,'#7a5a30',cool),ink:mix(DRAGON.ink,'#3a2a18',cool)};
    brush(g,seg,hw,{colors:col,alpha:u===null?1:1-.35*cool,seed:c.seed+1,n:12,dry:.45,fade:u===null?0:clamp(u/5),overlap:2,tailAlpha:.25});
    if(u===null)for(const s of [.48,.66,.84]){const p=pointAt(seg,s),[nx,ny]=upNormal(p.tx,p.ty),h=hw(s)+.4;
      brush(g,[[p.x+nx*(h+3.4)-p.tx*3.6,p.y+ny*(h+3.4)-p.ty*3.6],[p.x+nx*h+p.tx*.6,p.y+ny*h+p.ty*.6]],q=>.25+1*q,{colors:MANE_C,seed:c.seed+Math.round(s*50),n:3,dry:.3,tailAlpha:.4});}
  }
  if(head&&t>c.ft*.5&&(u===null||u<1.2)){const p=pointAt(pts,sh),ang=Math.atan2(p.ty,p.tx),lim=.6;
    const a2=Math.abs(Math.cos(ang))<Math.cos(lim)?(p.tx>=0?Math.sign(p.ty)*lim:Math.PI-Math.sign(p.ty)*lim):ang;
    dragonHead(g,p.x,p.y,Math.cos(a2),Math.sin(a2),u===null?1:1-clamp(u-.2),.8+.35*grown,c.seed+20);}
}
const DUST={edge:'#d9c9a4',body:'#8f7a58',ink:'#4a3c28'};
const dragon={
  ground(c){
    const {g,A,w}=c;
    if(w!==null){const a=smooth(w*1.3)*.75;for(let i=0;i<5;i++){const ang=Math.PI*(.08+i*.2),r=9+6*w;
      brush(g,[[A.S.x+Math.cos(ang)*r,A.S.y+Math.sin(ang)*r*.42],[A.S.x+Math.cos(ang)*r*.55,A.S.y+Math.sin(ang)*r*.24]],s=>.3+.9*s,{colors:DUST,alpha:a,seed:c.seed+i,n:3,dry:.4});}}
    const u=afterHit(c,.5);if(u!==null&&u<1)dab(g,A.T.x,A.T.y,8+4*ease(u),2.4,DUST,.55*(1-u),c.seed+3);
  },
  mid(c){
    const {g,A,w,t}=c;
    if(w!==null){gather(g,A.H,w,c.seed,{color:DRAGON.body,ink:DRAGON.ink,radius:16,width:1.6});return;}
    const pts=dragonPath(c);if(pts.adjacent)return;
    paintDragon(c,{body:true,head:!A.targetFront});
    const r=t/(2*c.ft);if(r<1)flare(g,A.H.x,A.H.y,7,DRAGON_C,1-r,c.seed+40);
  },
  front(c){
    const {g,A,t}=c;if(t===null)return;const pts=dragonPath(c);
    if(pts.adjacent){paintDragon(c);const r=t/(2*c.ft);if(r<1)flare(g,A.H.x,A.H.y,6.5,DRAGON_C,1-r,c.seed+40);}
    else if(A.targetFront)paintDragon(c,{body:false,head:true});
  },
  cell(c,px,py,{aim}){
    const {g}=c,u=peakU(c);
    if(u!==null)flare(g,px,py-29,13,DRAGON_C,1-u,c.seed+21);
    const v=afterHit(c,.36);if(v!==null&&v<1&&aim&&!c.reduced){const rnd=seeded(c.seed+33);
      for(let i=0;i<4;i++){const ang=-Math.PI*(.12+.76*rnd()),sp=10+10*rnd(),x=px+Math.cos(ang)*sp*ease(v),y=py-30+Math.sin(ang)*sp*ease(v)*.8+16*v*v;
        chip(g,x,y,1.9,rnd()*3,v<.4?DRAGON.edge:DRAGON.body,1-v*v,3);}}
  },
};

// ---- 六脉神剑 30: semi-transparent sword qi from the fingertip — thin, sharp front; faint behind ------------
const JADE={edge:'#f2fffa',body:'#82cfb8',ink:'#2c6a5a'};
function qiBlade(g,pts,reveal,tail,{hw=2.3,alpha=1,pal=JADE,seed=7}={}){
  if(reveal-tail<.01)return;
  const seg=slice(pts,tail,reveal,20),span=reveal-tail;
  const prof=x=>{const S=tail+span*x;return hw*(.12+.88*(S<.66?Math.pow(S/.66,.9):Math.pow(Math.max(0,1-S)/.34,.8)));};
  brush(g,seg,prof,{colors:pal3(pal),alpha:.95*alpha,seed,n:7,dry:.45,tailAlpha:.12,overlap:1.5});
  // the leading third: denser and higher-contrast (ink side deeper), the tail stays faint
  const lead0=Math.max(tail,reveal-span*.36);if(reveal-lead0>.02)brush(g,slice(pts,lead0,reveal,10),x=>prof((lead0-tail)/span+x*(reveal-lead0)/span),
    {colors:{edge:pal3(pal).edge,body:pal.body,ink:mix(pal.ink,'#000000',.35)},alpha:alpha,seed:seed+50,n:7,dry:.15,tailAlpha:.55,overlap:2,inkShare:.42});
}
function meridianLine(c){
  const {A}=c,f=facingVec(A);let E=[A.T.x-A.k*2,A.T.y-28];
  if(Math.hypot(E[0]-A.H.x,E[1]-A.H.y)<22)E=[A.H.x+f[0]*24,A.H.y+f[1]*24+4];// adjacent: a short blade into the chest
  return E;
}
function paintMeridian(c){
  const {g,A,t,reduced}=c;
  const E=meridianLine(c),dx=E[0]-A.H.x,dy=E[1]-A.H.y,L=Math.hypot(dx,dy),[nx,ny]=upNormal(dx/L,dy/L);
  const fade=1-ramp(t,.78,1),thin=1-.7*ramp(t,.52,.74);
  const main=bezier([A.H.x,A.H.y],[A.H.x+dx*.33,A.H.y+dy*.33],[A.H.x+dx*.66,A.H.y+dy*.66],E,18);
  const rev=reduced?1:ease(t/(1.4*c.ft)),tail=reduced?0:ease((t-.56)/.2);
  for(const sg of [1,-1]){const st=[A.H.x+dx*.3+nx*4.5*sg,A.H.y+dy*.3+ny*4.5*sg];
    const echo=bezier(st,[st[0]+(E[0]-st[0])*.4+nx*2*sg,st[1]+(E[1]-st[1])*.4+ny*2*sg],[E[0]-dx*.15,E[1]-dy*.15],E,12);
    qiBlade(g,echo,reduced?1:ease((t-.08)/(1.4*c.ft)),tail,{hw:1.2*thin,alpha:.45*fade,seed:c.seed+(sg>0?3:4)});}
  qiBlade(g,main,rev,tail,{hw:3*thin,alpha:fade,seed:c.seed+2});
  const f=t/c.ft;if(f<1)flare(g,A.H.x,A.H.y,4,JADE,1-f,c.seed+5);
}
const meridian={
  mid(c){
    const {g,A,w}=c;
    if(w!==null){const rnd=seeded(c.seed),a=smooth(w*1.3);
      for(let i=0;i<4;i++){const ang=-Math.PI/2+(rnd()-.5)*2.8,r0=14*(1-w)+5;
        brush(g,[[A.H.x+Math.cos(ang)*r0,A.H.y+Math.sin(ang)*r0*.8],[A.H.x+Math.cos(ang)*r0*.3,A.H.y+Math.sin(ang)*r0*.24]],s=>.2+.6*s,{colors:JADE,alpha:a,seed:c.seed+i,n:3,dry:.35});}
      flare(g,A.H.x,A.H.y,1.5+2*w,JADE,a,c.seed+9);return;}
    if(!adjFront(c))paintMeridian(c);
  },
  front(c){if(c.t!==null&&adjFront(c))paintMeridian(c);},
  // hit mark at the chest (not the mouth): a short X of two flicks, 1.5 frames
  hit(c,px,py){
    const {g}=c,u=peakU(c);if(u===null)return;
    brush(g,[[px-5,py-31],[px+5,py-23]],s=>.3+1*Math.sin(Math.PI*s),{colors:JADE,alpha:1-u,seed:c.seed+11,n:4,dry:.2});
    brush(g,[[px-5,py-23],[px+5,py-31]],s=>.3+1*Math.sin(Math.PI*s),{colors:JADE,alpha:1-u,seed:c.seed+12,n:4,dry:.2});
  },
};

// ---- 太极拳 20 / 太极剑法 58 ------------------------------------------------------------------------
const TAIJI={ink:'#141b17',ivory:'#efe8d0',yin:'#22302b',yang:'#f4f1e2',jade:'#cfe5da'};
const YANG_C={edge:'#ffffff',body:'#ebe5d0',ink:'#8f8a76'},YIN_C={edge:'#7f8d84',body:'#2a3430',ink:'#0c1210'};
// the wrap's yang strand keeps a deeper ink side, so it still separates from pale robes and white hair
const YANG_TAIJI={edge:'#ffffff',body:'#f6f1e0',ink:'#5c5646'};
const YIN_WRAP={edge:'#8a978e',body:'#34403a',ink:'#0e1512'};
const SWORD_C={edge:'#ffffff',body:'#cde3d8',ink:'#55776a'};
// Unit-circle yin-yang, rotated in the floor plane by theta (computed points: the decal itself is never
// rotated in screen space, so it keeps its 2:1 floor perspective). The floor diagram is unchanged.
function yinYang(g,R,theta,alpha){
  const P=(x,y)=>{const c=Math.cos(theta),s=Math.sin(theta);return [(x*c-y*s)*R,(x*s+y*c)*R*.5];};
  const arc=(cx,cy,r,a0,a1,n)=>{const out=[];for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;out.push(P(cx+Math.cos(a)*r,cy+Math.sin(a)*r));}return out;};
  const fill=(pts,color,a)=>{g.save();g.globalAlpha*=a;g.fillStyle=color;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();g.restore();};
  fill(arc(0,0,1,0,Math.PI*2,40),TAIJI.ivory,.52*alpha);
  fill([...arc(0,0,1,-Math.PI/2,Math.PI/2,20),...arc(0,.5,.5,Math.PI/2,Math.PI*1.5,12),...arc(0,-.5,.5,Math.PI/2,-Math.PI/2,12)],TAIJI.ink,.72*alpha);
  fill(arc(0,.5,.14,0,Math.PI*2,10),TAIJI.ivory,.85*alpha);
  fill(arc(0,-.5,.14,0,Math.PI*2,10),TAIJI.ink,.85*alpha);
}
function taijiFloor(c){
  const {g,t,w,A}=c,a=t===null?smooth(w*1.25):1-ramp(t,.74,1);if(!(a>.02))return;
  // Turns slowly in its own floor plane, never more than ~30° over the whole cast (reference-notes §6.1).
  const spin=-.24*(w??1)-.26*(t??0);
  g.save();g.translate(A.S.x,A.S.y);
  // Dry-brush ink rim in three strokes; the gaps travel with the spin.
  g.globalAlpha*=a*.62;g.strokeStyle=TAIJI.ink;g.lineWidth=1.2;g.lineCap='round';
  for(let i=0;i<3;i++){const a0=spin+i*2.09+.22;g.beginPath();g.ellipse(0,0,29,14.5,0,a0,a0+1.62);g.stroke();}
  g.globalAlpha/= .62;yinYang(g,24.5,spin,1);
  g.restore();
}
// vfx 395 phone pass: the push WRAPS the foe. Two open strands — yang ivory and yin ink — chase each other half a
// turn apart round the foe's hips (the two fish in motion, never a closed badge); the front halves are painted in
// front of the foe, the back halves behind it; at the hit they open outward and break up. Being two-tone, one of
// them always reads against light robes, dark robes, grass or sand, and the ends clear the silhouette on both
// sides, so the turn reads at 0.76 CSS px per logical px. Hip height only: no face is ever crossed.
// S6 phone pass (2026-10-02): at 844×390 DPR3 (2.28 device px per logical px) the wrap measured 4.8–6.6 logical px
// at its thickest and read as a hairline. Now: belly ≈ 10 logical px (under one head), a wine-ink underlay 1 px proud
// of the colour on both sides so the ivory strand separates from pale robes and sand, a longer open turn (1.45π) so
// the 承 reads as a spiral, and the yin strand at 0.85 of the yang width. Height, slots and face rule unchanged.
const WRAP={rx:21,ry:8,lift:18,turn:Math.PI*2*1.2,len:Math.PI*1.45};
const WRAP_INK={edge:'#2b2f2a',body:'#1a1f1b',ink:'#0a0d0b'};
// a solid dark band under a coloured stroke: same path, a little wider, almost no dryness
function inkUnder(g,pts,hw,alpha,seed,extra={}){brush(g,pts,s=>hw(s)*1.22+.6,{colors:WRAP_INK,alpha,seed,n:7,dry:.04,overlap:2.6,tailAlpha:.3,inkShare:.5,edgeShare:0,...extra});}
const wrapNear=c=>c.A.D<34;// adjacent: the force is already at the foe, no travelling approach
function wrapStart(c){return wrapNear(c)?c.ft*.25:.5*VFX_HIT;}
function wrapStrand(c,which){
  const {A,t}=c;if(t===null)return null;
  const t0=wrapStart(c),u=t>VFX_HIT?clamp((t-VFX_HIT)/(3*c.ft)):0;if(u>=1||t<t0)return null;
  const head=(t<=VFX_HIT?ease((t-t0)/(VFX_HIT-t0))*.85:.85+.15*u)*WRAP.turn;if(!(head>.08))return null;
  const k=A.k,C=[A.T.x,A.T.y-WRAP.lift],near=k>0?Math.PI:0,dir=-k;// enters on the side facing the caster, round the front first
  const tail=Math.max(0,head-WRAP.len),phase=which?Math.PI:0,open=1+.35*ease(u),N=28,pts=[];
  for(let i=0;i<=N;i++){const th=tail+(head-tail)*i/N,a=near+phase+dir*th,rho=(.88+.14*th/WRAP.turn)*open;
    // a short helix: yang settles from the waist to the hip, yin rises from the hip
    pts.push([C[0]+Math.cos(a)*WRAP.rx*rho,C[1]+Math.sin(a)*WRAP.ry*rho+(which?2.5:-2.5)*(1-th/WRAP.turn),Math.sin(a)]);}
  return {pts,u};
}
// front=true paints the parts nearer the camera than the foe (in front of it), false the parts behind it; each piece
// keeps the stroke's global taper (solid head, dry tail) through brush's range.
function paintWrap(c,front){
  for(const which of [0,1]){const s=wrapStrand(c,which);if(!s)continue;
    // yang leads (full width); yin is the thinner shadow strand, so the pair reads as a turn, not a dark sickle
    const P=s.pts,N=P.length-1,kw=which?.85:1,hw=x=>(.8+4.4*Math.pow(x,.7))*(x>.9?.55+.45*(1-x)/.1:1)*kw;
    let i=0;while(i<N){
      const f=P[i][2]+P[i+1][2]>0;let j=i+1;while(j<N&&(P[j][2]+P[j+1][2]>0)===f)j++;
      if(f===front){const pts=P.slice(i,j+1).map(p=>[p[0],p[1]]),a=1-s.u*s.u,range=[i/N,j/N];
        // ink underlay (the yang strand needs it against pale robes; the yin strand gets a lighter one for its rim)
        inkUnder(c.g,pts,hw,(which?.3:.55)*a,c.seed+90+which*7+(front?0:3),{fade:s.u*.8,range});
        brush(c.g,pts,hw,{colors:which?YIN_WRAP:YANG_TAIJI,alpha:a,seed:c.seed+60+which*7+(front?0:3),
          n:13,dry:.1+.3*s.u,fade:s.u*.8,tailAlpha:.2,overlap:2.3,inkShare:.44,edgeShare:.12,range});}
      i=j;}
  }
}
// Ranged only: the two strands leave the fist twisted together and run into the wrap's entry on the near side.
function taijiPath(c){
  const {A}=c,E=[A.T.x-A.k*WRAP.rx*.88,A.T.y-WRAP.lift-2.5];
  const dx=E[0]-A.H.x,dy=E[1]-A.H.y,[nx,ny]=upNormal(...norm(dx,dy));
  return bezier([A.H.x,A.H.y],[A.H.x+dx*.35+nx*7,A.H.y+dy*.35+ny*7],[A.H.x+dx*.7-nx*5,A.H.y+dy*.7-ny*5],E,22);
}
// Broken two-tone qi turning with the palm: short open arcs, solid at the leading end, faint tail.
function palmSwirl(c,cx,cy,r,lead,alpha){
  const {g}=c;
  for(const [off,col,sd] of [[0,YANG_C,1],[Math.PI,YIN_C,2]]){
    const a1=lead+off,pts=arcPoints(cx,cy,r,r*.7,a1-1.7,a1,12);
    brush(g,pts,s=>.6+3.4*Math.pow(s,.8),{colors:col,alpha,seed:c.seed+sd,n:9,dry:.4,tailAlpha:.15,inkShare:.42});
  }
}
const taiji={
  ground(c){taijiFloor(c);const u=afterHit(c,.42);if(u!==null&&u<1){const {g,A}=c;
    for(let i=0;i<3;i++){const a0=i*2.1+u*2;brush(g,arcPoints(A.T.x,A.T.y,9+10*ease(u),(9+10*ease(u))*.45,a0,a0+1.3,8),s=>.2+.6*s,{colors:YIN_C,alpha:.6*(1-u),seed:c.seed+40+i,n:3,dry:.5});}}},
  over(c){// qi turning round the palm through the wind-up and the release
    const {A,w,t}=c,[fx,fy]=norm(A.H.x-A.shoulder.x,A.H.y-A.shoulder.y),cx=A.H.x-fx*4,cy=A.H.y-fy*4;
    if(w!==null)palmSwirl(c,cx,cy,11,w*7,smooth(w*1.4));
    else if(t<2*c.ft)palmSwirl(c,cx,cy,11,7+t*30,1-t/(2*c.ft));
  },
  mid(c){// ranged: the two strands leave the fist twisted together and run into the wrap (adjacent: none needed)
    const {t}=c;if(t===null||wrapNear(c)||t<c.ft*.5)return;
    const pts=taijiPath(c),tA=wrapStart(c)+c.ft*.6,len=.45,q=clamp((t-c.ft*.5)/(tA-c.ft*.5))*(1+len);if(q>=1+len)return;
    for(const [lag,col,off,sd] of [[0,YANG_TAIJI,2,1],[.08,YIN_C,-2,2]]){
      const h=q-lag,a=Math.max(0,h-len),b=Math.min(1,h);if(b-a<=.02)continue;
      const seg=slice(pts,a,b,16),base=seg.map(([x,y],i)=>{const p=pointAt(seg,i/(seg.length-1)),[nx,ny]=upNormal(p.tx,p.ty);return [x+nx*off,y+ny*off];});
      const wpts=wobble(base,s=>2.6*Math.sin(s*Math.PI*2+(off>0?0:Math.PI))),whw=s=>.8+4.2*Math.pow(s,.7);
      if(off>0)inkUnder(c.g,wpts,whw,.5,c.seed+sd+30);
      brush(c.g,wpts,whw,{colors:col,seed:c.seed+sd,n:13,dry:.16,tailAlpha:.15,overlap:2.3,inkShare:.44,edgeShare:.12});
    }
  },
  // behind the foe: the back halves of the wrap, and the short white peak (≤1.5 frames)
  cell(c,px,py,{aim}){
    if(aim!==false)paintWrap(c,false);
    const u=peakU(c);if(u!==null)flare(c.g,px,py-29,9,YANG_C,.95*(1-u),c.seed+21);
  },
  // in front of the foe: the front halves of the wrap
  hit(c){paintWrap(c,true);},
};
// 太极剑: one crescent trailing the sword tip round the body — 2→5→2 px, the head at the tip solid, the tail faint
// and breaking up; front and back halves in their depth slots; then a thrust along the blade to the chest
// (adjacent, ≤0.6 cell) or a short travelling crescent at range.
function arcPieces(cx,cy,rx,ry,a0,a1,n=30){
  const back=[],front=[];let cur=null,side=null;
  for(let i=0;i<=n;i++){const s=i/n,a=a0+(a1-a0)*s,p=[cx+Math.cos(a)*rx,cy+Math.sin(a)*ry,s],sd=Math.sin(a)<0?'back':'front';
    if(sd!==side){if(cur&&cur.length>1)(side==='back'?back:front).push(cur);const prev=cur?.at(-1);cur=prev?[prev]:[];side=sd;}cur.push(p);}
  if(cur&&cur.length>1)(side==='back'?back:front).push(cur);
  return {back,front};
}
const swordTip=c=>c.A.blade?c.A.blade.tip:c.A.H;
function swordCrescent(c,half){
  const {g,A,t,w}=c,C={x:A.S.x,y:A.S.y-28},tip=swordTip(c);
  const R=clamp(Math.hypot(tip.x-C.x,(tip.y-C.y)*2),14,24),a1=Math.atan2((tip.y-C.y)*2,tip.x-C.x);
  let span,alpha;
  if(w!==null){span=Math.PI*.95*smooth(w*1.15);alpha=smooth(w*1.6);}
  else{if(t>.36)return;span=Math.PI*.95;alpha=1-ramp(t,.14,.36);}
  if(span<.05)return;
  const a0=a1+A.k*span,thin=w!==null?1:1-.5*ramp(t,.1,.32);// trails behind the tip
  const hw=S=>(.6+2*Math.sin(Math.PI*Math.min(1,S*.9+.08)))*thin;
  for(const piece of arcPieces(C.x,C.y,R,R*.5,a0,a1,34)[half]){
    const pts=piece.map(p=>[p[0],p[1]]),s0=piece[0][2],s1=piece.at(-1)[2];
    brush(g,pts,hw,{colors:SWORD_C,alpha,seed:c.seed+(half==='back'?1:2),n:6,dry:.6,tailAlpha:.08,range:[s0,s1],fade:w!==null?0:ramp(t,.1,.36)});
  }
}
function swordThrust(c){
  const {g,A,t}=c;if(t===null)return;
  const tip=swordTip(c),chest=[A.T.x-A.k*4,A.T.y-30],dist=Math.hypot(chest[0]-tip.x,chest[1]-tip.y);
  const fade=1-ramp(t,VFX_HIT,VFX_HIT+3*c.ft);if(!(fade>.02))return;
  if(dist<=34){// straight along the blade, ≤0.6 cell, ending at the chest
    const g0=A.blade?A.blade.grip:A.H,[ux,uy]=norm(tip.x-g0.x||A.k,tip.y-g0.y),Lt=29,rev=c.reduced?1:ease(t/(1.2*c.ft));
    const k=(chest[0]-g0.x)*ux+(chest[1]-g0.y)*uy,E=[g0.x+ux*Math.max(8,k),g0.y+uy*Math.max(8,k)],S=[E[0]-ux*Lt,E[1]-uy*Lt];
    brush(g,[S,[S[0]+(E[0]-S[0])*rev,S[1]+(E[1]-S[1])*rev]],s=>.4+2.6*Math.pow(s,.6)*(s>.9?(1-s)*10:1),{colors:SWORD_C,alpha:fade,seed:c.seed+5,n:8,dry:.45,tailAlpha:.12});
  }else{// a short travelling crescent, tip → chest
    const s=smooth(t/VFX_HIT),x=tip.x+(chest[0]-tip.x)*s,y=tip.y+(chest[1]-tip.y)*s,[ux,uy]=norm(chest[0]-tip.x,chest[1]-tip.y),[nx,ny]=upNormal(ux,uy);
    const pts=[];for(let i=0;i<=12;i++){const q=i/12-.5,b=Math.cos(q*Math.PI)*5;pts.push([x+nx*q*20+ux*b,y+ny*q*20+uy*b]);}
    brush(g,pts,q=>.3+2.2*Math.sin(Math.PI*clamp(q*.9+.05)),{colors:SWORD_C,alpha:fade,seed:c.seed+6,n:6,dry:.45,lead:[ux,uy],tailAlpha:.3});
  }
}
const taijiSword={
  ground:taiji.ground,
  behind(c){swordCrescent(c,'back');},
  over(c){swordCrescent(c,'front');},
  mid(c){if(!adjFront(c))swordThrust(c);},
  front(c){if(adjFront(c))swordThrust(c);},
  hit(c,px,py){
    const u=peakU(c);if(u===null)return;
    brush(c.g,arcPoints(px,py-29,9,6,c.A.k>0?-2.3:-.85,c.A.k>0?-.25:1.2,10),s=>.3+1.5*Math.sin(Math.PI*s),{colors:SWORD_C,alpha:1-u,seed:c.seed+9,n:5,dry:.3});
  },
};

// ---- 玄铁剑法 57: heavy pressure as heavy dry-brush ink — a ground wedge under the blade tip, a furrow, cracks --
const IRON={edge:'#e6dbc0',body:'#3a332b',ink:'#100c09'},CRACK={edge:'#5a4c3a',body:'#241c14',ink:'#0c0806'};
const ROCK={lit:'#ad9a72',dark:'#463b2f'};
function heavyGeometry(c){
  const {A}=c;let gx=A.T.x-A.S.x,gy=2*(A.T.y-A.S.y);
  if(Math.hypot(gx,gy)<1){gx=Math.cos(ANGLE[A.d]);gy=2*Math.sin(ANGLE[A.d]);}
  const Dg=Math.hypot(gx,gy),[ux,uy]=norm(gx,gy);
  return {ux,uy,Dg,toS:(x,y)=>[A.S.x+x,A.S.y+y*.5]};
}
// ground distance of the point under the blade tip (adjacent: in front of the foe's near feet)
function heavyAnchor(c){
  const {A}=c,G=heavyGeometry(c),tipX=(A.blade?A.blade.tip.x:A.H.x)-A.S.x;
  const along=clamp(Math.abs(G.ux)>.05?tipX/G.ux:G.Dg*.5,10,Math.max(10,G.Dg-14));
  return {G,along};
}
// The standing pressure wedge: a heavy brush stroke along the ground arc, ≈0.8 cell long, ≈12 px tall at the
// belly; the pale lip is the stroke's lead (top) edge, the ink its foot.
function paintWedge(g,c,G,along,h,alpha){
  if(!(alpha>.02&&h>.3))return;
  const rho=30,span=.86,ang=Math.atan2(G.uy,G.ux),cx=G.ux*(along-rho),cy=G.uy*(along-rho),mid=[];
  for(let i=0;i<=22;i++){const s=i/22,a=ang-span+2*span*s,[x,y]=G.toS(cx+Math.cos(a)*rho,cy+Math.sin(a)*rho);mid.push([x,y-h*.5*Math.pow(Math.sin(Math.PI*s),.75)]);}
  brush(g,mid,s=>.6+h*.5*Math.pow(Math.sin(Math.PI*clamp(s*.94+.03)),.75),{colors:IRON,alpha,seed:c.seed+1,n:14,dry:.4,tailAlpha:.35,overlap:1.6,edgeShare:.08,inkShare:.42});
}
function heavyFurrow(c){// front of the furrow travels from the wedge to the foe's feet
  const {t,reduced}=c,{G,along}=heavyAnchor(c),stop=Math.max(along+2,G.Dg-6);
  const p=reduced?1:smooth(ramp(t,1.5*c.ft,VFX_HIT));return {G,along,front:along+(stop-along)*p,p};
}
const heavy={
  ground(c){
    const {g,A,t,w}=c;
    if(w!==null){const a=smooth(w*1.2);// pressure: broken dark arcs tighten under the caster, pebbles tremble
      for(let i=0;i<4;i++){const r=9+5*w+(i%2)*5,a0=i*1.7+w;brush(g,arcPoints(A.S.x,A.S.y,r,r*.45,a0,a0+1.4,10),s=>.25+.7*s,{colors:CRACK,alpha:.6*a,seed:c.seed+i,n:3,dry:.55});}
      const rnd=seeded(c.seed);for(let i=0;i<5;i++){const ang=Math.PI*(.1+.8*rnd())+(i%2?Math.PI:0),r=7+9*rnd();
        chip(g,A.S.x+Math.cos(ang)*r,A.S.y+Math.sin(ang)*r*.45-Math.abs(Math.sin(w*Math.PI*3+i))*2.4*w,1.5+.7*rnd(),rnd()*3,i%2?ROCK.lit:ROCK.dark,.95*a,4);}
      return;}
    // the furrow: heavy dry ink dragged from the caster to the front, dusty lead edge
    const F=heavyFurrow(c),fade=1-ramp(t,.62,.95);
    if(F.front>10&&fade>.02){const pts=[];for(let i=0;i<=14;i++){const d=8+(F.front-8)*i/14;pts.push(F.G.toS(F.G.ux*d,F.G.uy*d));}
      brush(g,pts,s=>1.2+3.8*Math.pow(s,.8),{colors:{edge:'#cdb894',body:'#3a2e22',ink:'#120d09'},alpha:.9*fade,seed:c.seed+2,n:12,dry:.5,tailAlpha:.35});}
    // crack decal at the foe's feet, 20–24 px, 7 dry ink lines — fades last
    const u=afterHit(c,.5);if(u!==null){const r2=seeded(c.seed+7),a=(1-ramp(t,.82,1))*ease(u*4);
      for(let i=0;i<7;i++){const ang=Math.PI*2*i/7+r2()*.5,l=8+4*r2();
        brush(g,[[A.T.x+Math.cos(ang)*l,A.T.y+Math.sin(ang)*l*.45],[A.T.x+Math.cos(ang)*l*.5+r2()-.5,A.T.y+Math.sin(ang)*l*.22],[A.T.x,A.T.y]],s=>.2+.8*s,{colors:CRACK,alpha:.9*a,seed:c.seed+60+i,n:3,dry:.3});}}
  },
  mid(c){
    const {g,A,t,w}=c;
    if(w!==null){if(w<.4)return;const a=smooth((w-.4)*2.5);
      for(let i=0;i<3;i++){const x=A.H.x-A.k*(2+i*5),y=A.H.y-3-i*1.5;
        brush(g,[[x+.6,y+4],[x-.8,y+1],[x+1.2,y-2],[x-.4,y-5]],s=>.2+.6*Math.sin(Math.PI*s),{colors:CRACK,alpha:.7*a,seed:c.seed+80+i,n:3,dry:.5});}
      return;}
    const {G,along}=heavyAnchor(c),rise=c.reduced?1:ease(t/(1.5*c.ft)),sink=1-ease(ramp(t,VFX_HIT,VFX_HIT+3*c.ft));
    if(!adjFront(c))paintWedge(g,c,G,along,12*rise*sink,1-ramp(t,.6,.8));
    // the furrow's raised front: a short heavy dab of earth, ploughing to the feet
    const F=heavyFurrow(c);if(F.p>0&&F.p<1&&!c.reduced){const [x,y]=G.toS(G.ux*F.front,G.uy*F.front);
      brush(g,[[x-G.uy*6,y+G.ux*3],[x,y-6.5],[x+G.uy*6,y-G.ux*3]],s=>1+2.2*Math.sin(Math.PI*s),{colors:{edge:'#d6c39c',body:'#5a4630',ink:'#1a120b'},seed:c.seed+90,n:7,dry:.35});
      dab(g,x-G.ux*4,y-3,5,2.4,DUST,.6,c.seed+91,{count:3});}
    // 承: two-tone chips (3–5 px) at knee height
    const r=ramp(t,1.5*c.ft,VFX_HIT);if(r>0&&r<1&&!c.reduced){const rnd=seeded(c.seed+11);
      for(let i=0;i<4;i++){const d=along+(F.front-along)*rnd(),[x,y]=G.toS(G.ux*d,G.uy*d),k=Math.sin(Math.PI*clamp(r*1.4-rnd()*.3)),sz=1.6+.9*rnd();
        chip(g,x+(rnd()-.5)*6,y-8-8*k,sz,rnd()*3,i%2?ROCK.lit:ROCK.dark,1-r*r,4);chip(g,x-.4,y-8.5-8*k,sz*.5,rnd()*3,ROCK.lit,1-r*r,4);}}
  },
  front(c){// adjacent with the foe in front: the wedge stands in front of the foe's near feet
    const {g,t}=c;if(t===null||!adjFront(c))return;const {G,along}=heavyAnchor(c),rise=c.reduced?1:ease(t/(1.5*c.ft)),sink=1-ease(ramp(t,VFX_HIT,VFX_HIT+3*c.ft));
    paintWedge(g,c,G,along,12*rise*sink,1-ramp(t,.6,.8));
  },
  cell(c,px,py,{aim}){
    const {g}=c,u=afterHit(c,.45);if(u===null||u>=1||!aim||c.reduced)return;
    const rnd=seeded(c.seed+17);// 中: 4–5 two-tone chips at knee height
    for(let i=0;i<5;i++){const ang=-Math.PI*(.1+.8*rnd()),sp=10+12*rnd(),x=px+Math.cos(ang)*sp*u,y=py-10+Math.sin(ang)*sp*u*1.1+30*u*u,sz=1.6+1*rnd(),rot=rnd()*3+u*6;
      chip(g,x,y,sz,rot,i%2?ROCK.lit:ROCK.dark,1-u*u,4);chip(g,x-.4,y-.5,sz*.5,rot,ROCK.lit,1-u*u,4);}
  },
  // a head-sized dust puff over the foe's shins, held for two beats, then thinning
  hit(c,px,py){
    const {g,t}=c;if(t===null||t<VFX_HIT)return;const f=(t-VFX_HIT)/c.ft;if(f>=4)return;const a=f<2?1:1-(f-2)/2;
    dab(g,px,py-5-f*.8,9+f,4+f*.4,DUST,.85*a,c.seed+23,{count:5});
  },
};

// ---- vfx 395 group motifs (shared by the weapon / fist groups; geometry in the struck foe's frame) --------------
// M1 斩痕新月 torso slash: a crescent laid across the struck body between chest and thigh — falling (near chest →
// far hip) or rising (near hip → far chest), sagging toward the camera; both ends clear the silhouette; it never
// rises above the chest line, so no face is crossed. Default: falling when the foe stands in front of the caster,
// rising when it stands behind (the side away from a weapon's contact line in the real poses).
function slashPath(c,{rising=!c.A.targetFront,lift=0,span=1}={}){
  const {A}=c,k=A.k,T=A.T,w=14*span;
  const [P0,P3]=rising?[[T.x-k*w,T.y-14-lift],[T.x+k*w,T.y-28-lift]]:[[T.x-k*(w+1),T.y-29-lift],[T.x+k*w,T.y-14-lift]];
  return bezier(P0,[P0[0]+k*5,P0[1]+(rising?6:11)],[P3[0]-k*10,P3[1]+(rising?10:6)],P3,22);
}
function slashStroke(c,pts,pal,{alpha=1,fade=0,reveal=1,width=1,seed=2,lead='down'}={}){
  const r=clamp(reveal);if(!(alpha>.02)||r<.05)return;
  brush(c.g,r<1?slice(pts,0,r,22):pts,s=>(.5+3.4*Math.pow(Math.sin(Math.PI*clamp(s*.9+.05)),.8)*(.5+.5*s))*width,
    {colors:pal,alpha,seed:c.seed+seed,n:13,dry:.16+.45*fade,fade,tailAlpha:.45,overlap:2.1,edgeShare:.09,inkShare:.44,lead,range:[0,r]});
}
// M2 刺 thrust qi: a straight tapered stroke whose solid head lands ON an opening of the foe's body; the dry tail
// trails back toward the caster. Revealed tail → head over one native frame.
function thrustStroke(c,S,E,pal,{alpha=1,fade=0,reveal=1,width=1,seed=5}={}){
  const r=clamp(reveal);if(!(alpha>.02)||r<.05)return;
  const pts=[S,[S[0]+(E[0]-S[0])*r,S[1]+(E[1]-S[1])*r]];
  brush(c.g,pts,s=>(.35+2.7*Math.pow(s,.6)*(s>.88?.35+.65*(1-s)/.12:1))*width,{colors:pal,alpha,seed:c.seed+seed,n:9,dry:.3+.4*fade,fade,tailAlpha:.12,inkShare:.42,overlap:2,range:[0,r]});
}
// M3 点 glint: a one-frame X of two short brush flicks (impact accent; ≤1.5 native frames; never a filled star).
function glintX(c,x,y,r,pal,alpha,seed=9,w=1){
  if(!(alpha>.02))return;
  brush(c.g,[[x-r,y-r*.8],[x+r,y+r*.8]],s=>(.3+1.2*Math.sin(Math.PI*s))*w,{colors:pal,alpha,seed:c.seed+seed,n:4+(w>1?2:0),dry:.2,inkShare:.42});
  brush(c.g,[[x-r,y+r*.8],[x+r,y-r*.8]],s=>(.3+1.2*Math.sin(Math.PI*s))*w,{colors:pal,alpha,seed:c.seed+seed+1,n:4+(w>1?2:0),dry:.2,inkShare:.42});
}
// M4 扫 ground sweep: a low arc skimming the foe's shins/feet from the near side round the front (staff and leg arts).
function sweepPath(c,{r=18,h=4}={}){
  const {A}=c,k=A.k,C=[A.T.x,A.T.y-h],a0=k>0?Math.PI*1.02:-Math.PI*.02,a1=k>0?Math.PI*.12:Math.PI*.88;
  return arcPoints(C[0],C[1],r,r*.36,a0,a1,18);
}
// Both faces stay clear: everything painted over the fighters is clipped out of an ellipse round each head.
const faceWindows=(c,g)=>{const {A}=c;g.beginPath();g.rect(A.S.x-200,A.S.y-200,400,320);g.ellipse(A.T.x,A.T.y-44,9,10,0,0,Math.PI*2);
  g.ellipse(A.S.x+A.k,A.S.y-45,8,9,0,0,Math.PI*2);g.clip('evenodd');};

// ---- 血刀大法 63: the real sabre stays visible; blood qi hugs the OUTSIDE of its edge, sweeps at the peak, and
// breaks into dark-red threads in the recovery — never a bigger red blade --------------------------------------
const BLOOD={edge:'#ff9aa8',body:'#b81f34',ink:'#4a0814'},BLOOD_DARK={edge:'#c0485a',body:'#6e1220',ink:'#2a050b'};
function bladeScreen(c){
  const {A}=c;if(A.blade)return A.blade;
  return {grip:{x:A.shoulder.x+(A.H.x-A.shoulder.x)*.45,y:A.shoulder.y+(A.H.y-A.shoulder.y)*.45},tip:A.H};
}
// vfx 395: a hairline (≈2 px) of red hugging the outside of the cutting edge, mid-blade → the tip, never past it:
// at phone scale the old 5–6 px leaf along the steel read as a second, bigger red blade (it is the steel that
// must read, and the slash beside the foe that carries the art).
function edgeQi(c,alpha){
  if(!(alpha>.02))return;
  const {g}=c,B=bladeScreen(c),dx=B.tip.x-B.grip.x,dy=B.tip.y-B.grip.y,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L;
  let [nx,ny]=upNormal(ux,uy);nx=-nx;ny=-ny;// outside the cutting (lower) edge
  const off=2.2,pts=[[B.grip.x+ux*L*.4+nx*off,B.grip.y+uy*L*.4+ny*off],[B.tip.x-ux*1.5+nx*off*.6,B.tip.y-uy*1.5+ny*off*.6]];
  brush(g,pts,s=>.5+1.1*Math.sin(Math.PI*Math.min(1,s*.85+.1)),{colors:BLOOD,alpha,seed:c.seed+1,n:6,dry:.3,lead:[nx,ny],tailAlpha:.4,edgeShare:.12,inkShare:.42});
}
// The readable element at the peak: a crescent trailing the sabre TIP through the air along the swing — about
// 0.8 cell long, 5–6 px at the belly — held a few px OUTSIDE the tip's circle so it never merges with the steel
// into a "bigger red blade". Crimson body, wine-black ink on the trailing side, 1 px pale hot edge on the lead.
// It sits beside the struck target between shoulder and hip, never over the face.
// vfx 395 phone pass: the crescent is laid across the struck foe's body between chest and thigh — a falling cut
// (near chest → far hip) when the foe stands in front, a rising one (near hip → far chest) when the foe stands behind
// — always on the side of the body AWAY from the steel's contact line, so it is never read as a bigger red blade.
// Belly ≈7 px (was 5), sagging toward the camera, solid crimson with a deep wine-ink trailing side and a 1 px pale
// lead edge; both ends clear the silhouette. It snaps in on the contact frame, holds three frames, then cools and
// breaks into dark-red threads until the hit, where the shoulder cut takes over.
const BLOOD_SLASH={edge:'#ffd2d8',body:'#bc1f36',ink:'#33040d'};
// S6 phone pass (2026-10-02): the crescent measured 4.4–5.7 logical px at its thickest (DPR3 phone) — too thin beside
// the steel. Now ≈10 px at the belly (width 1.35), a wine-black underlay 1 px proud on both sides so it holds on grey
// robes and sand, and a thinner leading echo a few px ahead on the swing side (起→承 motion). Same path, same height
// band (chest…thigh), both faces still windowed, still on the side away from the steel.
const BLOOD_UNDER={edge:'#3a0810',body:'#2a050b',ink:'#160206'};
function bloodSweep(c,alpha,fade=0,reveal=1){
  const pal=fade>0?{edge:mix(BLOOD_SLASH.edge,BLOOD_DARK.edge,fade),body:mix(BLOOD_SLASH.body,BLOOD_DARK.body,fade),ink:mix(BLOOD_SLASH.ink,BLOOD_DARK.ink,fade)}:BLOOD_SLASH;
  const pts=slashPath(c),r=clamp(reveal),k=c.A.k,up=!c.A.targetFront;
  if(r>=.05&&alpha>.02){
    // underlay: the same crescent, a touch wider, nearly solid
    brush(c.g,r<1?slice(pts,0,r,22):pts,s=>(.5+3.4*Math.pow(Math.sin(Math.PI*clamp(s*.9+.05)),.8)*(.5+.5*s))*1.35*1.2+.7,
      {colors:BLOOD_UNDER,alpha:alpha*(.6-.3*fade),seed:c.seed+21,n:8,dry:.05+.3*fade,fade,tailAlpha:.35,overlap:2.6,inkShare:.5,edgeShare:0,range:[0,r]});
    // leading echo: a thinner crescent 4 px ahead along the swing (above for a falling cut, below for a rising one)
    if(fade<.6){const off=up?4:-4,echo=pts.map(([x,y])=>[x+k*1.5,y+off]);
      slashStroke(c,echo,pal,{alpha:alpha*.45*(1-fade),fade:.25+fade*.5,reveal:Math.min(1,r*1.08),width:.6,seed:23,lead:up?'up':'down'});}
  }
  slashStroke(c,pts,pal,{alpha,fade,reveal,width:1.35});
}
const faceWindow=faceWindows;
function sweepPhase(c){// snaps in on the contact frame, holds three frames, then cools into dark-red threads by the hit
  const f=c.t/c.ft;if(f<4.5)bloodSweep(c,1,0,c.reduced?1:ease((f+.5)/1.2));else if(f<9)bloodSweep(c,1-.75*(f-4.5)/4.5,clamp((f-4.5)/4.5));
}
const blood={
  over(c){
    const {A,t,w}=c,g=c.g;g.save();
    // a foe standing behind keeps a clear window over its head (and the caster over its own)
    if(!A.targetFront)faceWindow(c,g);
    if(w!==null)edgeQi(c,.85*ramp(w,.4,1));
    else{
      const f=t/c.ft;
      if(f<1.6)edgeQi(c,1-f/1.6);                             // the edge stays red only through the cut
      if(!adjFront(c))sweepPhase(c);                           // the sweep (adjacent foe in front: front slot)
    }
    g.restore();
  },
  front(c){// adjacent with the foe in front: the sweep swings in front of the foe's near side, face kept clear
    if(c.t===null||!adjFront(c))return;const g=c.g;g.save();faceWindow(c,g);sweepPhase(c);g.restore();
  },
  mid(c){
    const {g,A,t}=c;if(t===null||c.reduced)return;
    // 395: the dark beads flick off the far end of the slash (hip height), never from a tip that may sit at a face
    const r=ramp(t,VFX_HIT-c.ft,VFX_HIT+3*c.ft);if(!(r>0&&r<1))return;const E=slashPath(c).at(-1),rnd=seeded(c.seed+3);
    for(let i=0;i<3;i++){const sp=5+6*rnd(),x=E[0]+A.k*sp*r+(rnd()-.5)*3,y=E[1]-(4+3*rnd())*r+14*r*r;
      chip(g,x,y,1.1,rnd()*3,i%2?BLOOD_DARK.body:BLOOD.body,1-r*r,6);}
  },
  // one 2–3 px diagonal cut across the near shoulder, cooling white → red → dark red → ink, plus dark beads
  hit(c,px,py){
    const {g,A,t}=c;if(t===null||t<VFX_HIT)return;const f=(t-VFX_HIT)/c.ft;if(f>=4)return;
    const N=[px-A.k*7,py-30],step=Math.floor(f);
    const body=[BLOOD.edge,BLOOD.body,BLOOD_DARK.body,'#2a1416'][step];
    brush(g,[[N[0]+A.k*5,N[1]-5],[N[0]-A.k*4,N[1]+6]],s=>.35+1.1*Math.sin(Math.PI*Math.min(1,s*.9+.05)),{colors:tone(body),alpha:1-.15*step,seed:c.seed+40,n:5,dry:.3,fade:step*.2});
    if(!c.reduced){const rnd=seeded(c.seed+41),v=clamp(f/4);for(let i=0;i<3;i++){const x=N[0]-A.k*(4+5*rnd())*v-A.k*2,y=N[1]+2+(rnd()-.5)*6+10*v*v;
      chip(g,x,y,1.1,rnd()*3,BLOOD_DARK.ink,1-v,6);}}
  },
};

// ---- 火焰刀法 66: fire on the hand-blade (or the carried sabre's B coat), a low brush-stroke flame-blade along the
// line to the foe, and a scorch strip through the cells actually struck. ------------------------------------
const FIRE={edge:'#fff1c4',body:'#e4682a',ink:'#7a1c0c'},FIRE_HOT={edge:'#fffbe8',body:'#f6bd45',ink:'#c0461a'},CHAR={edge:'#5a4436',body:'#2a1e16',ink:'#0e0907'};
function flameLine(c){
  const {A}=c,[ux,uy]=norm(A.T.x-A.S.x,A.T.y-A.S.y),cell=26.83;
  const n=Math.max(1,Math.round(A.D/cell));return {ux,uy,n,from:[A.S.x+ux*cell*.55,A.S.y+uy*cell*.55],to:[A.T.x+ux*cell*.35,A.T.y+uy*cell*.35]};
}
// A tongue of flame: root (head, opaque) on its base, tip (tail) rising and swept back, breaking up.
function tongue(g,bx,by,h,back,colors,alpha,seed,w=1.6){
  const tip=[bx+back*h*.55,by-h],mid=[bx+back*h*.12,by-h*.55];
  brush(g,bezier(tip,[tip[0]-back*h*.12,tip[1]+h*.25],mid,[bx,by],8),s=>.2+w*Math.pow(s,.8),{colors,alpha,seed,n:5,dry:.55,tailAlpha:.2,lead:[back,0]});
}
function flameCrescent(c){// 1–2 native frames, a low brush-stroke flame-blade travelling to the foe
  const {g,A,t}=c,t0=VFX_HIT-2*c.ft;if(t<t0||t>VFX_HIT+.6*c.ft)return;
  const s=clamp((t-t0)/(2*c.ft)),fade=t>VFX_HIT?1-(t-VFX_HIT)/(.6*c.ft):1;
  const start=[A.H.x,A.H.y],end=[A.T.x-A.k*7,A.T.y-17],q=ease(s);
  const x=start[0]+(end[0]-start[0])*q,y=start[1]+(end[1]-start[1])*q;
  const [ux,uy]=norm(end[0]-start[0],end[1]-start[1]),[nx,ny]=upNormal(ux,uy);
  // the blade: one curved stroke across the travel line, bulging forward; hot edge on the leading side
  const arc=[];for(let i=0;i<=14;i++){const k=.5-i/14,b=Math.cos(k*Math.PI)*4.5;arc.push([x+nx*k*15+ux*b,y+ny*k*15+uy*b]);}
  brush(g,arc,s2=>.4+2.7*Math.sin(Math.PI*clamp(s2*.92+.04)),{colors:FIRE,alpha:fade,seed:c.seed+1,n:9,dry:.35,lead:[ux,uy],tailAlpha:.45});
  // back-swept licks trailing it, rising
  for(let i=0;i<4;i++){const k=(i-1.5)*.26,bx=x+nx*k*12-ux*1.5,by=y+ny*k*12-uy*1.5,L=6+4*((i*7)%3)/2;
    brush(g,bezier([bx-ux*L,by-uy*L-4.5],[bx-ux*L*.8,by-uy*L*.8-2],[bx-ux*L*.4,by-uy*L*.4-2.5],[bx,by],8),s2=>.2+1.5*Math.pow(s2,.8),{colors:i%2?FIRE_HOT:FIRE,alpha:fade,seed:c.seed+10+i,n:4,dry:.55,tailAlpha:.15});}
}
const flame={
  ground(c){// scorch strip through the struck cells: appears as the flame-blade passes, fades last
    const {g,t}=c;if(t===null)return;const L=flameLine(c),t0=VFX_HIT-2*c.ft,rev=c.reduced?1:ease((t-t0)/(2*c.ft));if(rev<=0)return;
    const a=1-ramp(t,.8,1);
    brush(g,slice([L.from,L.to],0,rev,18),s=>1.6+1.4*Math.sin(s*9)*.5+1,{colors:CHAR,alpha:.75*a,seed:c.seed+2,n:8,dry:.6,tailAlpha:.5,lead:'up'});
    const rnd=seeded(c.seed+2);for(let i=0;i<5;i++){const s=rnd()*rev,x=L.from[0]+(L.to[0]-L.from[0])*s,y=L.from[1]+(L.to[1]-L.from[1])*s;
      chip(g,x+(rnd()-.5)*4,y-.5,.9,0,i%2?FIRE_HOT.body:FIRE.body,a*Math.abs(Math.sin(t*23+i)),4);}
  },
  over(c){
    const {g,A,t,w,coat}=c;if(coat)return;// a carried sabre burns inside the weapon rig instead
    const [fx,fy]=norm(A.H.x-A.shoulder.x,A.H.y-A.shoulder.y);
    const life=w!==null?ease((w-.3)/.7):(t<.4?1:t<.6?1-.3*ramp(t,.4,.6):.7*(1-ramp(t,.6,.95)));
    paintHandBlade(g,A.H.x-fx*1.5,A.H.y-fy*1.5,fx,fy,life,c.v.sourceFrame??0,{reducedMotion:c.reduced});
  },
  mid(c){if(c.t!==null&&!adjFront(c))flameCrescent(c);},
  front(c){if(c.t!==null&&adjFront(c))flameCrescent(c);},
  // each struck fighter: ragged tongues on the side that took the cut (≤ half a cell), cooling white → yellow →
  // orange → brown smoke, plus a scorch at the feet
  hit(c,px,py){
    const {g,A,t}=c;if(t===null||t<VFX_HIT)return;const f=(t-VFX_HIT)/c.ft;if(f>=5)return;
    const step=Math.min(4,Math.floor(f)),cols=[FIRE_HOT,FIRE_HOT,FIRE,{edge:'#c86a3a',body:'#7a2c16',ink:'#3a140a'},{edge:'#8a7a6a',body:'#4a3a30',ink:'#221a14'}][step];
    const rnd=seeded(c.seed+(px|0)*7+(py|0)),side=px-A.k*7;
    for(let i=0;i<4;i++){const x=side+(rnd()-.5)*9,y=py-10-rnd()*18,h=(6+6*rnd())*(step<3?1:.7);
      tongue(g,x,y,h,-A.k,cols,step<4?.95:.6,c.seed+60+i,1.4+.6*rnd());}
  },
  cell(c,px,py){
    const {g,t}=c;if(t===null||t<VFX_HIT)return;
    dab(g,px,py,9,2.6,CHAR,.55*(1-ramp(t,.75,1)),c.seed+70,{count:4});
  },
};

// ---- 黯然销魂掌 24: ONE continuous pale-grey palm-qi surface — the original LARGE fan — from the palm to the foe,
// with a few internal dry-brush forks; an ink root at the palm; a faint grey pool under the struck foe ------------
const SORROW_C={edge:'#f2f2ec',body:'#b2b6b0',ink:'#5a5e5c'},SORROW_ROOT={edge:'#8a8e8a',body:'#4a4e4c',ink:'#1e2020'};
const SORROW_LEAF=['#3f423f','#5d605b','#2f312f'];
function sorrowFan(c){
  const {A}=c,O=[A.H.x-A.k*1,A.H.y],chest=[A.T.x,A.T.y-30];let [ux,uy]=norm(chest[0]-O[0],chest[1]-O[1]);
  const dist=Math.hypot(chest[0]-O[0],chest[1]-O[1]),adjacent=A.D<34;
  if(dist<14)[ux,uy]=facingVec(A);
  // Adjacent (the palm is already at the foe): the fan runs level at chest height through the foe to its far
  // side — axis nearly horizontal toward the foe, so no ray climbs past the head line and the far edge stops
  // at the foe's own cell.
  if(adjacent){const f=facingVec(A);[ux,uy]=norm(f[0],Math.max(f[1],.12));}
  const L=adjacent?30:clamp(dist+12,34,78),spread=adjacent?.52:.48;
  return {O,ux,uy,L,spread,adjacent,head:[A.T.x,A.T.y-46]};
}
function paintSorrow(c,alpha,{window=false}={}){
  const {g,t}=c;if(t===null||!(alpha>.02))return;
  const F=sorrowFan(c),N=11,rnd=seeded(c.seed),u=afterHit(c,.5)??0,fade=1-ramp(t,.64,1);
  g.save();
  if(window){g.beginPath();g.rect(F.O[0]-200,F.O[1]-200,400,400);g.arc(F.head[0],F.head[1],8.5,0,Math.PI*2);g.clip('evenodd');}
  const cs=Math.cos,sn=Math.sin,dir=a=>[F.ux*cs(a)-F.uy*sn(a),F.ux*sn(a)+F.uy*cs(a)],dGam=2*F.spread/(N-1);
  for(let i=0;i<N;i++){
    // strokes overlap their neighbours, so the fan reads as one surface; length/grow jitter keeps the rim ragged
    const gam=-F.spread+dGam*i+(rnd()-.5)*.05,center=Math.abs(i-(N-1)/2)/((N-1)/2);
    const grow=c.reduced?1:ease((t-center*.05)/.22),len=F.L*(.84+.16*rnd()-.08*center)*grow;if(!(len>3)){rnd();continue;}
    const d0=dir(gam*.3),d2=dir(gam);
    const pts=bezier([F.O[0]+d0[0]*2,F.O[1]+d0[1]*2],[F.O[0]+d0[0]*len*.3,F.O[1]+d0[1]*len*.3],[F.O[0]+d2[0]*len*.7,F.O[1]+d2[1]*len*.7],[F.O[0]+d2[0]*len,F.O[1]+d2[1]*len],14);
    const hw=s=>.8+(len*s)*dGam*.62+.8*Math.sin(Math.PI*s);
    brush(g,pts,hw,{colors:SORROW_C,alpha:alpha*fade*(.85-.15*center),seed:c.seed+i*13,n:8,dry:i%4===1?.6:.35,fade:u*.75,tailAlpha:.6,overlap:2,lead:[-d2[1],d2[0]]});
  }
  g.restore();
}
const sorrow={
  ground(c){// a pale grey ink pool under the struck foe, slower to fade than anything in the air
    const u=afterHit(c,.5);if(u===null||u>=1)return;
    dab(c.g,c.A.T.x,c.A.T.y,8+6*ease(u*2),2.6,SORROW_ROOT,.45*(1-u),c.seed+3);
  },
  mid(c){
    const {g,A,t,w}=c;
    if(w!==null){gather(g,A.H,w,c.seed,{color:SORROW_C.body,ink:SORROW_ROOT.ink,count:3,radius:14,width:1.6});
      const rnd=seeded(c.seed);leaf(g,A.H.x-A.k*(6+6*w),A.H.y-8+6*w,2,w*4+rnd(),SORROW_LEAF[0],.85*smooth(w*1.5));return;}
    // dark ink root at the palm (≈0.25 cell)
    const F=sorrowFan(c),a=1-ramp(t,.4,.7);
    if(a>.02)for(let i=0;i<4;i++){const gm=(i-1.5)*.35,d=[F.ux*Math.cos(gm)-F.uy*Math.sin(gm),F.ux*Math.sin(gm)+F.uy*Math.cos(gm)];
      brush(g,[[F.O[0]+d[0]*9,F.O[1]+d[1]*9],[F.O[0]-d[0]*1,F.O[1]-d[1]*1]],s=>.5+2.2*s,{colors:SORROW_ROOT,alpha:.9*a,seed:c.seed+100+i,n:5,dry:.5});}
    const u=afterHit(c,.5)??0;
    for(let i=0;i<3;i++){const r2=seeded(c.seed+200+i),gam=(r2()-.5)*2*F.spread,dist=F.L*(.45+.45*r2())*ease(t/VFX_HIT);
      const ca=Math.cos(gam),sa=Math.sin(gam),x=F.O[0]+(F.ux*ca-F.uy*sa)*dist,y=F.O[1]+(F.ux*sa+F.uy*ca)*dist+12*u*u;
      leaf(g,x,y,2.2,t*7+i*1.7,SORROW_LEAF[i%3],1-ramp(t,.72,1));}
  },
  // the surface passes BEHIND the struck foe at full strength; the part over the foe is repeated in front at low
  // opacity with a clear window over the head, so both outlines stay readable
  aim(c){paintSorrow(c,1);},
  front(c){paintSorrow(c,.5,{window:true});},
  cell(c,px,py){
    const u=peakU(c);if(u===null)return;
    flare(c.g,px,py-29,11,SORROW_C,.9*(1-u),c.seed+7);
  },
};

// ---- every other art: its painted atlas motif, anchored at the hand, mirrored, never stretched -------
function imprint(g,name,x,y,w,angle,alpha){
  const h=w*textureAspect(name);g.save();g.translate(x,y);
  if(Math.cos(angle)<0){g.scale(-1,1);g.rotate(Math.PI-angle);}else g.rotate(angle);
  g.globalAlpha*=alpha;paintSignatureTexture(g,name,-w/2,-h/2,w,h);g.restore();
}
const MOTIF={impact:'impact',sword:'taiji',blade:'empty',staffBasic:'staff',whip:'staff',frost:'frost',toxin:'toxin',
  solar:'solar',empty:'empty',taixuan:'empty',drain:'drain',ink:'ink',snake:'snake',stars:'stars',thunder:'thunder',
  sound:'sound',claw:'claw',fireJet:'flame',jadePair:'jadePair',staff:'staff',dugu:'dugu',bixie:'bixie'};
const SWEEP=new Set(['sword','blade','staffBasic','whip','ink','snake','stars','thunder','jadePair','staff','bixie']);
const GOLD_NEEDLE={ink:'#4a3110',body:'#d9a845',mid:'#f3d78f',core:'#fffaf0'};
const generic={
  mid(c){
    const {g,v,A,t,w,kind}=c;
    if(w!==null){if(kind!=='wheel')gather(g,A.H,w,c.seed,{color:vfxGlowColor(v),count:3,radius:11,width:1});return;}
    if(kind==='wheel')return;// the actor-independent native wheel volley paints once per cast
    const E={x:A.T.x-A.k*4,y:A.T.y-30},dx=E.x-A.H.x,dy=E.y-A.H.y,L=Math.hypot(dx,dy);
    const angle=L>.5?Math.atan2(dy,dx):ANGLE[A.d]??0,q=ease(t/.7),adv=c.reduced?1:ease(t/VFX_HIT);
    const alpha=Math.min(1,(t+.08)*7)*Math.min(1,(1-t)*5),cap=w0=>Math.min(w0,Math.max(22,L*.9+14));
    if(kind==='finger'){// 一阳指: one golden needle of qi from the fingertip (no squashed sun disc)
      qiBlade(g,[[A.H.x,A.H.y],[E.x,E.y]],c.reduced?1:ease(t/.3),ease((t-.35)/.3),{hw:2.2,pal:GOLD_NEEDLE,alpha});return;}
    const name=MOTIF[kind];if(!name)return;
    g.save();g.globalAlpha*=alpha;
    if(kind==='drain'||v.skill===27){// absorption (吸星/北冥, and 化功 dissolving the foe's force) runs from the opponent BACK to the hand
      imprint(g,name,E.x+(A.H.x-E.x)*adv,E.y+(A.H.y-E.y)*adv,cap(40),angle+Math.PI,.75);
    }else if(kind==='impact'||kind==='claw'){
      imprint(g,name,E.x,E.y+4,cap(kind==='impact'?24:34)*(.75+.25*q),angle,.66);
    }else if(kind==='dugu'){
      // Revealed along its own axis from the hand; slides, never stretches.
      const len=46;g.save();frame(g,A.H.x,A.H.y,dx||Math.cos(angle),dy||Math.sin(angle));
      const along=Math.max(0,Math.min(L-len*.5,L*adv-len*.5));g.beginPath();g.rect(0,-16,Math.max(1,L*adv+2),32);g.clip();
      paintSignatureTexture(g,name,along,-len*textureAspect(name)/2,len,len*textureAspect(name));g.restore();
    }else if(SWEEP.has(kind)){
      const reach=.12+.78*adv,size=cap(kind==='whip'?48:kind==='jadePair'||kind==='staff'||kind==='bixie'?44:40);
      imprint(g,name,A.H.x+dx*reach,A.H.y+dy*reach,size,angle-.3+.6*q,kind==='sword'||kind==='blade'?.55:.72);
    }else if(kind==='sound'){
      imprint(g,name,A.H.x+dx*adv,A.H.y+dy*adv,cap(34+q*10),angle,.65);
    }else{
      imprint(g,name,A.H.x+dx*adv,A.H.y+dy*adv,cap(kind==='taixuan'?42:kind==='fireJet'?44:36),angle,.7);
      if(kind==='taixuan')imprint(g,'stars',A.H.x+dx*adv,A.H.y+dy*adv,cap(30),angle+.5,.35);
    }
    g.restore();
  },
  cell(c,px,py,{x,y,outcome}){
    if(c.t===null)return;
    paintVfxImpact(c.g,c.v,c.pic,px,py,{layer:'behind',outcome,cells:c.geo.fxCells??1,cellX:x,cellY:y,sx:c.A.S.x,sy:c.A.S.y,reducedMotion:c.reduced});
  },
  front(c){
    if(c.t===null)return;
    paintVfxCast(c.g,c.v,c.pic,c.A.S.x,c.A.S.y,c.A.T.x,c.A.T.y,{reducedMotion:c.reduced,hand:c.A.H});
  },
};
const PAINTERS={dragon,meridian,taiji,taijiSword,heavy,blood,flame,sorrow};
// ---- vfx 394/395 extension: 61 独孤九剑 · 60 辟邪剑法 · 87 打狗棍法 · 49 玉女素心剑 (bound by martial-art id) ----
// vfx 395 (after the first real casts): rebuilt on the shared motifs so they read at phone scale — bodies 5–7 px,
// brush strokes with an ink trailing side (no ribbon outlines), the readable element ON the foe between chest and
// thigh (front slot, both faces clipped clear), travelling parts in the mid slot. Native effect frame counts:
// 61 → 13 (shape 3, area), 60 → 16, 87 → 15 (range 2), 49 → 18.
const weaponTip=c=>c.A.blade?c.A.blade.tip:c.A.H;
const onFoe=(c,f)=>{const g=c.g;g.save();faceWindows(c,g);try{f();}finally{g.restore();}};
// 独孤九剑 · 破招: three steel thrusts, one native frame apart, each landing on an opening of the foe — near shoulder
// (beside, not on, the head), waist, knee — the last exactly on the shared hit. Each landing pins an X on that
// opening, and the three Xs stay together until a frame after the hit (三处破绽, the readable element), then dry
// out. Steel-blue body + navy ink, so it separates from pale robes and dark ground alike. Every other fighter caught
// in the area gets one X.
const STEEL_C={edge:'#f4f8fb',body:'#7d97b0',ink:'#121a24'};
// foe in front: openings on its near side; foe behind (the caster's own body covers that side): on its open middle
function duguOpenings(c){const {A}=c,k=A.k,T=A.T;return A.targetFront?[[T.x-k*12,T.y-34],[T.x-k*11,T.y-24],[T.x-k*9,T.y-12]]:[[T.x+k*5,T.y-33],[T.x+k*8,T.y-24],[T.x+k*5,T.y-13]];}
function duguThrusts(c){
  const {A,t,reduced}=c;if(t===null)return;
  const tip=weaponTip(c),O=duguOpenings(c);
  for(let i=0;i<3;i++){
    const t1=VFX_HIT-(2-i)*c.ft,tau=t-(t1-c.ft);if(tau<0)continue;// revealed over the frame before it lands
    // short thrusts straight in from the caster's side (a slight fan), never a beam from a tip that may sit at a face
    const E=O[i],[ux,uy]=norm(A.k,(i-1)*.3+(tip.y>E[1]?.15:-.15)),L=20,S=[E[0]-ux*L,E[1]-uy*L],u=(tau-2*c.ft)/(2*c.ft);if(u>=1)continue;
    thrustStroke(c,S,E,STEEL_C,{reveal:reduced?1:ease(tau/c.ft),alpha:u>0?1-u:1,fade:u>0?u:0,width:1.4,seed:5+i});
    if(tau>=c.ft){const x=ramp(t,VFX_HIT+c.ft,VFX_HIT+3*c.ft);if(x<1)glintX(c,E[0],E[1],4.8,STEEL_C,1-x,20+i*2,1.45);}
  }
}
// 独孤九剑 is an AREA art (shape 3): the openings are pierced on EVERY fighter actually struck (hit slot, in front
// of each struck foe), never on the aim cell itself — the player's aim cell may be empty or hold an ally.
const duguPainter={
  mid(c){const {w}=c;if(w===null)return;const tip=weaponTip(c),a=smooth(w*1.3);
    for(let i=0;i<3;i++){const ang=-Math.PI/2+(i-1)*.9+w*2,r=7-5*w;glintX(c,tip.x+Math.cos(ang)*r,tip.y+Math.sin(ang)*r,1.2+.8*w,STEEL_C,a,30+i*2);}},
  hit(c){if(c.t!==null)onFoe(c,()=>duguThrusts(c));},
};
// 辟邪剑法 · 迅疾: nothing, then — in one native frame, on the hit — a sharp crimson-violet zigzag flicks across the
// foe's body (chest → hip, the face clear) with two fading after-images trailing toward the caster, and needle
// pricks converging on the chest for 1.5 frames. Thin, fast, gone in four frames.
const BIXIE_C={edge:'#fde0f0',body:'#a12a63',ink:'#2a0a1e'},BIXIE_GHOST={edge:'#e6a9c9',body:'#7a3a62',ink:'#2a0a1e'};
function bixieZig(c){const {A}=c,k=A.k,T=A.T;return [[T.x-k*17,T.y-31],[T.x-k*4,T.y-25],[T.x-k*9,T.y-21],[T.x+k*6,T.y-16],[T.x+k*1,T.y-13],[T.x+k*14,T.y-9]];}
function bixieDash(c){
  const {A,t}=c;if(t===null)return;const f=(t-VFX_HIT)/c.ft+1;if(f<0||f>=4.5)return;
  const pts=bixieZig(c),fade=f<2.5?0:clamp((f-2.5)/2),alpha=1-.8*fade;
  for(let k=2;k>=1;k--){const back=k*4.5,a=alpha*(.5/k);// after-images first (behind the live flick)
    brush(c.g,pts.map(([x,y])=>[x-A.k*back,y-back*.35]),s=>(.4+2*Math.sin(Math.PI*clamp(s*.9+.05)))*.8,{colors:BIXIE_GHOST,alpha:a,seed:c.seed+40+k,n:7,dry:.5,fade:.3+fade*.5,tailAlpha:.2,inkShare:.4});}
  brush(c.g,pts,s=>.45+3*Math.sin(Math.PI*clamp(s*.9+.05)),{colors:BIXIE_C,alpha,seed:c.seed+40,n:11,dry:.14+.4*fade,fade,tailAlpha:.35,inkShare:.44,overlap:2.1,lead:'up'});
  const u=peakU(c);if(u!==null){const C=[A.T.x-A.k*4,A.T.y-27];// needle pricks
    for(let i=0;i<4;i++){const a=(i-1.5)*.55+(A.k>0?Math.PI:0),L=9+2*(i%2);
      brush(c.g,[[C[0]+Math.cos(a)*L,C[1]+Math.sin(a)*L*.7],[C[0]+Math.cos(a)*2,C[1]+Math.sin(a)*1.4]],s=>.2+.75*s,{colors:BIXIE_C,alpha:1-u,seed:c.seed+50+i,n:3,dry:.15});}}
}
const bixiePainter={
  mid(c){const {w}=c;if(w===null)return;const tip=weaponTip(c),a=smooth(w*1.4);glintX(c,tip.x,tip.y,1.4+1.6*w,BIXIE_C,a,60);},
  front(c){if(c.t!==null)onFoe(c,()=>bixieDash(c));},
};
// 打狗棍法 · 绊/挑 (staff group motifs M4 + rising flick): a low jade sweep skims the foe's shins (绊), then the staff
// shadow flicks up the near side from knee to waist (挑) with one fainter echo (棒影); leaves and dust after the hit.
const DOG_C={edge:'#e4f4c4',body:'#4f9550',ink:'#0e2614'},DOG_ECHO={edge:'#c8e6a8',body:'#6aa86a',ink:'#18361e'};
function dogStrokes(c){
  const {A,t,reduced}=c;if(t===null)return;const k=A.k,T=A.T;
  const s1=reduced?1:ease(ramp(t,0,.22)),a1=1-ramp(t,.32,.48);// 绊
  if(s1>0&&a1>0){const pts=sweepPath(c,{r:19,h:4});
    brush(c.g,slice(pts,0,s1,18),s=>.5+3.2*Math.pow(Math.sin(Math.PI*clamp(s*.9+.05)),.8)*(.45+.55*s),{colors:DOG_C,alpha:a1,seed:c.seed+70,n:11,dry:.2,tailAlpha:.3,inkShare:.42,overlap:2,lead:'down',range:[0,s1]});}
  const s2=reduced?1:ease(ramp(t,.26,.44)),a2=1-ramp(t,.58,.76);// 挑
  if(s2>0&&a2>0){const B=[T.x-k*13,T.y-8],E=[T.x-k*7,T.y-30],P=bezier(B,[B[0]-k*6,B[1]-9],[E[0]-k*9,E[1]+5],E,16);
    const echo=P.map(([x,y],i)=>[x-k*5,y+1.5+i*.12]);
    brush(c.g,slice(echo,0,s2,16),s=>(.4+2*Math.pow(s,.6))*.8,{colors:DOG_ECHO,alpha:.55*a2,seed:c.seed+72,n:7,dry:.45,tailAlpha:.15,inkShare:.4,range:[0,s2]});
    brush(c.g,slice(P,0,s2,16),s=>.5+3*Math.pow(s,.6)*(s>.9?.5+.5*(1-s)/.1:1),{colors:DOG_C,alpha:a2,seed:c.seed+71,n:11,dry:.18,tailAlpha:.2,inkShare:.44,overlap:2.1,range:[0,s2]});}
}
const dogPainter={
  ground(c){const u=afterHit(c,.45);if(u===null||u>=1)return;const {g,A}=c;
    dab(g,A.T.x-A.k*6,A.T.y-1,9+4*ease(u),2.4,DUST,.55*(1-u),c.seed+3);},
  mid(c){const {g,w,A}=c;if(w!==null)gather(g,A.H,w,c.seed,{color:DOG_C.body,ink:DOG_C.ink,radius:12,width:1.4});},
  front(c){if(c.t!==null)onFoe(c,()=>dogStrokes(c));},
  cell(c,px,py,{aim}){const v=afterHit(c,.4);if(v===null||v>=1||!aim||c.reduced)return;const rnd=seeded(c.seed+5);
    for(let i=0;i<3;i++){const x=px+(rnd()-.5)*18,y=py-12-v*(10+8*rnd());leaf(c.g,x,y,2.2,v*6+i,i%2?DOG_C.body:DOG_C.ink,1-v);}},
};
// 玉女素心剑 · 双剑合璧: two crescents laid across the foe's body in an X — jade falling, pale rose rising one native
// frame later — held through the hit, then a few two-tone petals drift down.
const JADE_C={edge:'#effff8',body:'#4fae88',ink:'#0d3324'},ROSE_C={edge:'#fff0f4',body:'#d9879f',ink:'#3a1424'};
function jadeCross(c){
  const {A,t,reduced}=c;if(t===null)return;const fade=ramp(t,VFX_HIT+c.ft,VFX_HIT+4*c.ft);if(fade>=1)return;
  for(const [pal,t0,rising,sd] of [[JADE_C,0,false,80],[ROSE_C,c.ft,true,82]]){
    const r=reduced?1:ease(ramp(t,t0,t0+1.6*c.ft));if(r<=0)continue;
    slashStroke(c,slashPath(c,{rising,span:.9,lift:2}),pal,{reveal:r,alpha:1-.85*fade,fade,width:.95,seed:sd,lead:rising?'up':'down'});
  }
  const v=afterHit(c,.42);if(v!==null&&v<1&&!c.reduced){const rnd=seeded(c.seed+9),C=[A.T.x-A.k*3,A.T.y-26];
    for(let i=0;i<4;i++){const x=C[0]+(rnd()-.5)*20,y=C[1]+v*(14+8*rnd());leaf(c.g,x,y,1.9,v*5+i,i%2?ROSE_C.body:JADE_C.body,1-v);}}
}
const jadePainter={
  mid(c){const {w}=c;if(w===null)return;const tip=weaponTip(c),a=smooth(w*1.3);glintX(c,tip.x,tip.y,1.3+1.5*w,w<.5?JADE_C:ROSE_C,a,90);},
  front(c){if(c.t!==null)onFoe(c,()=>jadeCross(c));},
};
// ---- vfx 395 batches: the remaining attack arts, family by family, on the shared motifs (bound by art id) ---------
// One painter per weapon family, configured per art: palette (edge / body / ink — value contrast comes from the ink
// side, never from glow), form, width, accent. Shared rules: wind-up glint at the real tip or fist; the readable
// element ON the foe between chest and knee (front slot, both faces windowed); ranged casts send a short qi stroke
// from the tip that lands on the hit; every other struck fighter gets one short accent; dry-brush dissipation.
const FAM_PAL={
  steel:{edge:'#f2f6fa',body:'#7b8ea2',ink:'#10151b'},   slate:{edge:'#e4e8ec',body:'#5f6b78',ink:'#11151a'},
  azure:{edge:'#f0f8ff',body:'#6a96bf',ink:'#10223a'},   frost:{edge:'#ffffff',body:'#a9d4e2',ink:'#1c3f4c'},
  pine:{edge:'#e8f2dc',body:'#5e8c62',ink:'#122416'},    jade:{edge:'#effff8',body:'#5fb592',ink:'#0f3326'},
  violet:{edge:'#f3eafa',body:'#8f78b4',ink:'#22163a'},  rose:{edge:'#fff0f4',body:'#d488a2',ink:'#3a1424'},
  ochre:{edge:'#fbefd2',body:'#a47634',ink:'#2a1a06'},   gold:{edge:'#fff4cf',body:'#d2a23e',ink:'#3e2808'},
  ink:{edge:'#c9d0cc',body:'#3c4440',ink:'#0b0e0c'},     ivory:{edge:'#ffffff',body:'#e6dfc8',ink:'#5a5444'},
  crimson:{edge:'#ffd6dc',body:'#a8263e',ink:'#2e0610'}, teal:{edge:'#e6fbf6',body:'#4f9c92',ink:'#0c2a26'},
  ember:{edge:'#fff0c8',body:'#d0703a',ink:'#3e1606'},   bamboo:{edge:'#eef6d4',body:'#86a85a',ink:'#1e2a10'},
};
// Sword family forms. Every form is built from M1 (slash) / M2 (thrust) / M3 (glint) in the foe's own frame.
function swordForm(c,cfg,r,alpha,fade){
  const P=FAM_PAL[cfg.pal],P2=FAM_PAL[cfg.pal2||cfg.pal],w=cfg.w??1,{A}=c,k=A.k,T=A.T,sd=cfg.seed??0;
  const S=(pts,pal,o={})=>slashStroke(c,pts,pal,{reveal:r,alpha,fade,width:w,seed:sd+(o.seed||0),lead:o.lead||'down',...o});
  switch(cfg.form){
    case 'rising':S(slashPath(c,{rising:true}),P,{lead:'up'});break;
    case 'cross':S(slashPath(c,{rising:false,span:.9}),P,{width:w*.85});
      if(r>.5)S(slashPath(c,{rising:true,span:.9}),P2,{reveal:(r-.5)*2,width:w*.85,seed:3,lead:'up'});break;
    case 'thrust':{const E=[T.x-k*12,T.y-27],S0=[E[0]-k*22,E[1]+(A.targetFront?-3:3)];
      thrustStroke(c,S0,E,P,{reveal:r,alpha,fade,width:1.3*w,seed:sd+5});break;}
    case 'triple':for(let i=0;i<3;i++){const ri=clamp(r*3-i*.8);if(ri<=0)continue;
      S(slashPath(c,{rising:cfg.up?true:i%2===1,span:.62,lift:[7,-1,-9][i]}),i===1?P2:P,{reveal:ri,width:w*.7,seed:7+i,lead:cfg.up||i%2?'up':'down'});}break;
    case 'sweep':{const P0=[T.x-k*18,T.y-23],P3=[T.x+k*17,T.y-21],pts=bezier(P0,[P0[0]+k*8,P0[1]+9],[P3[0]-k*8,P3[1]+9],P3,22);
      S(pts,P,{lead:'down'});
      if(r>.3)S(pts.map(([x,y],i)=>[x-k*2,y+5+Math.sin(i/22*Math.PI)*2]),P2,{reveal:(r-.3)/.7,width:w*.55,alpha:alpha*.6,seed:4});break;}
    // sabre forms (刀): heavier, wider, with an earthy follow-through
    case 'cleave':S(slashPath(c,{span:1.05}),P,{width:w*1.2});break;
    case 'whirl':{// 狂风: two level sweeps cross in front of the foe — chest and thigh — like a gust turning
      const sw=(y0,y1,dir)=>bezier([T.x-k*dir*18,T.y-y0],[T.x-k*dir*8,T.y-y0+8],[T.x+k*dir*8,T.y-y1+8],[T.x+k*dir*18,T.y-y1],22);
      S(sw(28,24,1),P,{width:w*.85});if(r>.4)S(sw(14,18,-1),P2,{reveal:(r-.4)/.6,width:w*.75,seed:3,lead:'up'});break;}
    case 'thunder':{// 霹雳: a falling cut that breaks into a jagged crack of light down the foe's body
      S(slashPath(c,{span:1}),P,{width:w});
      if(r>.5){const z=[[T.x-k*8,T.y-33],[T.x+k*1,T.y-27],[T.x-k*4,T.y-22],[T.x+k*6,T.y-15],[T.x+k*1,T.y-10]];
        brush(c.g,z,s=>.35+1.6*Math.sin(Math.PI*clamp(s*.9+.05)),{colors:P2,alpha,seed:c.seed+sd+9,n:7,dry:.12+.4*fade,fade,tailAlpha:.4,inkShare:.4,range:[0,clamp((r-.5)*2)]});}
      break;}
    case 'lash':{// whip: one long wavy lash from the tip that snaps across the foe's near side, an X at the snap
      if(c.A.D<34){S(slashPath(c,{span:1.05}),P,{width:w*.75});if(r>.95)glintX(c,T.x-k*9,T.y-26,3.4,P2,alpha*(1-fade),sd+12,1.2);break;}// adjacent: the lash wraps across the body
      const t0=weaponTip(c),tip={x:t0.x,y:Math.max(t0.y,T.y-34)},E=[T.x-k*9,T.y-26],L=Math.hypot(E[0]-tip.x,E[1]-tip.y)||1,[ux,uy]=[(E[0]-tip.x)/L,(E[1]-tip.y)/L];// never starts above the foe's chest line
      const pts=[];for(let i=0;i<=24;i++){const q=i/24,amp=Math.sin(q*Math.PI*2.5)*4*(1-q*.6);pts.push([tip.x+(E[0]-tip.x)*q-uy*amp,tip.y+(E[1]-tip.y)*q+ux*amp]);}
      brush(c.g,slice(pts,0,r,24),s=>(.35+1.9*Math.pow(s,.7))*w,{colors:P,alpha,seed:c.seed+sd+8,n:8,dry:.25+.35*fade,fade,tailAlpha:.2,inkShare:.42,range:[0,r]});
      if(r>.95)glintX(c,E[0],E[1],3.4,P2,alpha*(1-fade),sd+12,1.2);break;}
    default:S(slashPath(c),P);
  }
}
function famAccent(c,cfg,u){// u: 0..1 after the hit
  const P=FAM_PAL[cfg.pal],P2=FAM_PAL[cfg.pal2||cfg.pal],{A}=c,T=A.T,k=A.k,rnd=seeded(c.seed+(cfg.seed??0)+77);
  if(cfg.accent==='petals'||cfg.accent==='leaves'){for(let i=0;i<4;i++){const x=T.x-k*3+(rnd()-.5)*22,y=T.y-28+u*(14+8*rnd());leaf(c.g,x,y,1.9,u*5+i,i%2?P2.body:P.body,1-u);}}
  else if(cfg.accent==='notes'){for(let i=0;i<2;i++){const x=T.x+k*(10+i*5),y=T.y-25-u*6-i*2;
      brush(c.g,arcPoints(x,y,3,3,-.5+u*2,2.6+u*2,8),s=>.25+.9*s,{colors:P2,alpha:1-u,seed:c.seed+90+i,n:3,dry:.2});}}
  else if(cfg.accent==='dust')dab(c.g,T.x-k*4,T.y-1,9+5*ease(u),2.6,DUST,.6*(1-u),c.seed+95);
  else if(cfg.accent==='ink'){for(let i=0;i<5;i++)chip(c.g,T.x-k*(rnd()*14-2),T.y-30+rnd()*20+u*6,1.2+rnd(),rnd()*3,i%2?P.ink:P.body,1-u,6);}
  else if(cfg.accent==='chips'){for(let i=0;i<4;i++){const ang=-Math.PI*(.15+.7*rnd()),sp=8+10*rnd();
      chip(c.g,T.x-k*6+Math.cos(ang)*sp*u,T.y-14+Math.sin(ang)*sp*u+16*u*u,1.6,rnd()*3,i%2?P.edge:P.body,1-u*u,3);}}
  else if(cfg.accent==='stars'){for(let i=0;i<3;i++)glintX(c,T.x-k*(4+rnd()*12),T.y-34+rnd()*22,2.4,P,1-u,110+i);}
}
// Shared clock for family arts: contact → reveal over ~1.2 native frames (ranged: lands on the hit after a short
// travelling qi), held to the hit, then dries over 3.5 frames; the accent plays over the 3 frames after the hit.
function famClock(c){
  const {t,reduced}=c;if(t===null)return null;const near=c.A.D<34,t0=near?0:VFX_HIT-1.4*c.ft;
  const r=reduced?1:ease(ramp(t,t0,t0+1.2*c.ft)),fade=ramp(t,VFX_HIT+.5*c.ft,VFX_HIT+4*c.ft);
  return r>0&&fade<1?{r,fade,alpha:1-.85*fade,near}:null;
}
// ranged: a short qi stroke (≈26 px window) runs from the tip to the foe's chest and lands on the hit
function famTravel(c,P,w=1){
  const {t,A}=c;if(t===null||A.D<34)return;const tip=weaponTip(c),E=[A.T.x-A.k*10,A.T.y-28],tA=VFX_HIT-.4*c.ft;
  if(t>tA+c.ft)return;const L=Math.hypot(E[0]-tip.x,E[1]-tip.y)||1,q=ease(clamp(t/tA)),head=q,tail=Math.max(0,q-Math.min(.6,26/L));
  const S=[tip.x+(E[0]-tip.x)*tail,tip.y+(E[1]-tip.y)*tail],H=[tip.x+(E[0]-tip.x)*head,tip.y+(E[1]-tip.y)*head];
  const a=t>tA?1-(t-tA)/c.ft:1;thrustStroke(c,S,H,P,{alpha:a,width:.85*w,seed:31});
}
// Area arts (native shape 3): the player's aim cell may be empty or hold an ally, so the readable form is painted on
// every fighter actually struck (hit slot, in front of that fighter) and nothing body-level sits on the aim cell.
const isArea=id=>SIGNATURE_CATALOG[id]?.shape===3;
function familySlots(cfg,form,accent){
  const area=isArea(cfg.seed),body=c=>{const k=famClock(c);if(!k)return;onFoe(c,()=>{form(c,cfg,k.r,k.alpha,k.fade);const u=afterHit(c,3*c.ft);if(u!==null&&u<1&&!c.reduced&&cfg.accent)accent(c,cfg,u);});};
  return area?{front(){},hit:body,area:true}:{front:body,hitFrom:VFX_HIT,area:false};
}
function swordPainter(cfg){
  const P=FAM_PAL[cfg.pal],S=familySlots(cfg,swordForm,famAccent);
  return {
    hitFrom:S.hitFrom,
    mid(c){const {w}=c;if(w!==null){const tip=weaponTip(c),a=smooth(w*1.4);glintX(c,tip.x,tip.y,1.2+1.4*w,P,a,60);return;}famTravel(c,P,cfg.w);},
    front:S.front,
    // single-target / line arts: every struck fighter gets one short X at the chest at the hit (≤1.5 native frames)
    hit:S.area?S.hit:(c,px,py)=>{const u=peakU(c);if(u===null)return;glintX(c,px-c.A.k*4,py-27,3.6,P,.9*(1-u),70,1.15);},
  };
}
// Sword and sabre family table (art id → look). Schools keep a colour; forms are shared.
const SWORD_ARTS={
  31:{pal:'steel',form:'slash',w:.9},                         // 躺尸剑法 (唐诗剑法): plain, honest cut
  32:{pal:'teal',form:'triple',accent:'stars'},               // 青城剑法: quick, triple
  33:{pal:'frost',form:'sweep',pal2:'ivory',accent:'chips'},  // 冰雪剑法: a cold sweep, ice chips
  34:{pal:'azure',form:'cross',pal2:'ivory',w:.85},           // 恒山剑法: soft cross
  35:{pal:'ochre',form:'slash',w:1.15,accent:'dust'},         // 泰山剑法: heavy, rock dust
  36:{pal:'violet',form:'triple',pal2:'slate'},               // 衡山剑法: 百变千幻, three shifting cuts
  37:{pal:'violet',form:'rising',accent:'stars'},             // 华山剑法
  38:{pal:'slate',form:'slash',w:1.2,accent:'dust'},          // 嵩山剑法: heavy, dark
  39:{pal:'azure',form:'thrust'},                             // 全真剑法 (line): straight Taoist thrust
  40:{pal:'steel',form:'cross',pal2:'azure'},                 // 峨嵋剑法
  41:{pal:'ivory',form:'sweep',pal2:'jade'},                  // 武当剑法 (line): round sweep
  42:{pal:'rose',form:'cross',pal2:'violet',accent:'petals'}, // 万花剑法
  43:{pal:'ink',form:'slash',w:1.1,accent:'ink'},             // 泼墨剑法: ink splash
  44:{pal:'frost',form:'triple',pal2:'ivory'},                // 雪山剑法
  45:{pal:'ochre',form:'rising',w:1.1,accent:'dust'},         // 泰山十八盘 (cross shape)
  46:{pal:'slate',form:'rising',pal2:'ivory'},                // 回峰落雁剑 (line)
  47:{pal:'ivory',form:'cross',pal2:'ink'},                   // 两仪剑法: ivory and ink
  48:{pal:'teal',form:'triple',up:true,pal2:'jade'},          // 太岳三青峰 (line): three rising peaks
  50:{pal:'jade',form:'sweep',pal2:'ivory'},                  // 逍遥剑法
  51:{pal:'violet',form:'cross',pal2:'azure'},                // 慕容剑法
  52:{pal:'steel',form:'slash',w:1.25,accent:'chips'},        // 倚天剑法 (area)
  53:{pal:'azure',form:'thrust',pal2:'ivory',accent:'stars'}, // 七星剑法
  54:{pal:'gold',form:'sweep',pal2:'ochre'},                  // 金蛇剑法: a gold snake sweep
  55:{pal:'steel',form:'slash',w:1.15,accent:'chips'},        // 苗家剑法
  56:{pal:'jade',form:'rising',pal2:'ivory',accent:'notes'},  // 玉箫剑法: jade rising cut, flute notes
  59:{pal:'gold',form:'slash',w:1.1,accent:'dust'},           // 达摩剑法 (line)
  89:{pal:'pine',form:'sweep',pal2:'ivory'},                  // 松风剑法 (line): pine-wind sweep
  93:{pal:'crimson',form:'triple',pal2:'violet'},             // 家传辟邪剑法
  // sabre family (刀) — same painter, heavier forms
  62:{pal:'steel',form:'cleave',accent:'chips'},              // 西瓜刀法: a plain heavy chop
  64:{pal:'slate',form:'whirl',pal2:'ivory',accent:'dust'},   // 狂风刀法: two crossing gust sweeps
  65:{pal:'ink',form:'cross',pal2:'ivory',w:1.1},             // 反两仪刀法: ink and ivory, heavier than 两仪剑
  67:{pal:'ember',form:'cross',pal2:'steel',w:1.05,accent:'chips'}, // 胡家刀法: fierce rising-falling pair, warm steel
  68:{pal:'azure',form:'thunder',pal2:'ivory',accent:'dust'}, // 霹雳刀法 (area): cut + jagged crack
  // special weapons on the same forms
  69:{pal:'teal',form:'cross',pal2:'steel',w:.9},             // 神龙双勾: two hooked cuts
  77:{pal:'pine',form:'lash',pal2:'violet',accent:'toxin'},   // 毒龙鞭法
  78:{pal:'ochre',form:'lash',pal2:'gold',accent:'dust'},     // 黄沙万里鞭
  80:{pal:'ink',form:'thrust',pal2:'ivory',accent:'ink'},     // 判官笔: an ink stab, ink flecks
  82:{pal:'steel',form:'cross',pal2:'slate',w:.9},            // 大剪刀: shears
};
// Fist / palm / finger / claw family (and the beasts): the force lands ON the foe's near side.
//  palm   掌 — three nested open arcs of pressure rolling into the foe (")))"), the inner one solid, the outer dry
//  fist   拳 — one short heavy punch stroke into the chest + a burst of brush flicks at the contact
//  claw   爪 — three short parallel rakes across the torso
//  needle 指 — a thin qi needle from the fingertip into the chest (finger arts)
//  needles   — several needles converging on the chest from different angles (葵花)
//  blast  (area arts) — the palm at the aim plus a low dust ring; every other struck foe gets a smaller palm
function palmArcs(c,P,P2,r,alpha,fade,{lift=0,size=1,seed=0,w=1}={}){
  const {A}=c,k=A.k,T=A.T,base=k>0?0:Math.PI;
  for(let i=0;i<3;i++){const ri=clamp(r*3-i*.7);if(ri<=0)continue;
    const cx=T.x-k*(20-i*5.5)*size,cy=T.y-24-lift,R=(7+i*4.5)*size,span=.95+i*.1;
    const pts=arcPoints(cx,cy,R*.75,R*.88,base-span*ri,base+span*ri,12);// stays below the chest line
    brush(c.g,pts,s=>(.5+[4.6,3.2,2.3][i]*Math.sin(Math.PI*clamp(s*.9+.05)))*w,{colors:i===1?P2:P,alpha:alpha*(1-i*.15),seed:c.seed+seed+i,n:i?9:13,dry:i?.15+.15*i+.35*fade:.06+.35*fade,fade,tailAlpha:.5,inkShare:.42,lead:k>0?[1,0]:[-1,0]});}
}
function fistForm(c,cfg,r,alpha,fade){
  const P=FAM_PAL[cfg.pal],P2=FAM_PAL[cfg.pal2||cfg.pal],w=cfg.w??1,{A}=c,k=A.k,T=A.T,sd=cfg.seed??0,lift=cfg.low?-10:0;
  switch(cfg.form){
    case 'fist':{const E=[T.x-k*10,T.y-27-lift],S0=[E[0]-k*15,E[1]+1];thrustStroke(c,S0,E,P,{reveal:r,alpha,fade,width:1.7*w,seed:sd+5});
      if(r>.6&&fade<.5)flare(c.g,E[0]+k*1,E[1],9*w,P2,(1-fade*2)*alpha,c.seed+sd+6);break;}
    case 'claw':for(let i=0;i<3;i++){const ri=clamp(r*2.2-i*.4);if(ri<=0)continue;
      slashStroke(c,slashPath(c,{span:.55,lift:[6,0,-6][i]-lift}),P,{reveal:ri,alpha,fade,width:.55*w,seed:sd+10+i});}break;
    case 'needle':{const E=[T.x-k*9,T.y-28-lift],S0=[E[0]-k*24,E[1]+(A.targetFront?-2:2)];thrustStroke(c,S0,E,P,{reveal:r,alpha,fade,width:.95*w,seed:sd+5});
      if(r>.8)glintX(c,E[0],E[1],2.6,P2,alpha*(1-fade),sd+20);break;}
    case 'needles':{const C=[T.x-k*6,T.y-27];for(let i=0;i<5;i++){const a=(i-2)*.42+(k>0?Math.PI:0),L=17,ri=clamp(r*2-i*.2);if(ri<=0)continue;
      thrustStroke(c,[C[0]+Math.cos(a)*L,C[1]+Math.sin(a)*L*.75],C,i%2?P2:P,{reveal:ri,alpha,fade,width:.6*w,seed:sd+30+i});}break;}
    default:palmArcs(c,P,P2,r,alpha,fade,{lift,size:(cfg.size??1)*(cfg.form==='blast'?1.12:1),seed:sd,w});
  }
}
function fistAccent(c,cfg,u){
  const P=FAM_PAL[cfg.pal],P2=FAM_PAL[cfg.pal2||cfg.pal],{A}=c,T=A.T,k=A.k,rnd=seeded(c.seed+(cfg.seed??0)+55);
  if(cfg.accent==='frost'){for(let i=0;i<4;i++){const ang=-Math.PI*(.15+.7*rnd()),sp=7+9*rnd();
      chip(c.g,T.x-k*8+Math.cos(ang)*sp*u,T.y-24+Math.sin(ang)*sp*u+14*u*u,1.5,rnd()*3,i%2?P.edge:P.body,1-u*u,3);}}
  else if(cfg.accent==='toxin'){for(let i=0;i<3;i++)brush(c.g,bezier([T.x-k*(10-i*6),T.y-12-u*4],[T.x-k*(12-i*6),T.y-20-u*8],[T.x-k*(6-i*6),T.y-24-u*10],[T.x-k*(9-i*6),T.y-30-u*12],8),
      s=>.3+1.1*s,{colors:i%2?P2:P,alpha:(1-u)*.85,seed:c.seed+70+i,n:4,dry:.5,tailAlpha:.2});}
  else if(cfg.accent==='gold'){for(let i=0;i<3;i++)glintX(c,T.x-k*(2+rnd()*14),T.y-32+rnd()*20-u*6,2,P,1-u,80+i);}
  else famAccent(c,cfg,u);
}
function fistPainter(cfg){
  const P=FAM_PAL[cfg.pal],S=familySlots(cfg,fistForm,fistAccent);
  return {
    hitFrom:S.hitFrom,
    mid(c){const {w,A}=c;if(w!==null){if(cfg.form!=='needle')gather(c.g,A.H,w,c.seed,{color:P.body,ink:P.ink,radius:12,width:1.3});else glintX(c,A.H.x,A.H.y,1+1.4*w,P,smooth(w*1.4),60);return;}
      famTravel(c,P,cfg.form==='needle'?.8:1.1);},
    ground(c){if(cfg.form!=='blast'&&!cfg.area)return;const u=afterHit(c,.5);if(u===null||u>=1)return;dab(c.g,c.A.T.x,c.A.T.y,10+8*ease(u),2.8,DUST,.55*(1-u),c.seed+5);},
    front:S.front,
    // area arts: the full form on every struck foe; single/line arts: a short flare at the peak on each struck foe
    hit:S.area?S.hit:(c,px,py)=>{const u=peakU(c);if(u===null)return;flare(c.g,px-c.A.k*6,py-27,6,FAM_PAL[cfg.pal2||cfg.pal],.85*(1-u),c.seed+71);},
  };
}
const FIST_ARTS={
  1:{pal:'ochre',form:'fist',pal2:'ivory',accent:'dust'},   // 野球拳
  2:{pal:'azure',form:'fist',pal2:'ivory'},                   // 武当长拳
  3:{pal:'gold',form:'fist',pal2:'ochre',accent:'dust'},     // 罗汉拳
  4:{pal:'teal',form:'fist',pal2:'jade'},                     // 灵蛇拳 (line)
  5:{pal:'pine',form:'palm',pal2:'violet',accent:'toxin'},    // 神王毒掌
  6:{pal:'crimson',form:'blast',pal2:'gold',accent:'dust'},  // 七伤拳 (area)
  7:{pal:'azure',form:'palm',pal2:'ivory'},                   // 混元掌
  8:{pal:'frost',form:'palm',pal2:'ivory',accent:'frost'},    // 寒冰绵掌 (line)
  9:{pal:'ochre',form:'claw',area:true,accent:'dust'},       // 鹰爪功 (area)
  10:{pal:'jade',form:'palm',pal2:'ivory'},                   // 逍遥掌
  11:{pal:'slate',form:'palm',pal2:'steel',w:1.15,accent:'dust'}, // 铁掌
  12:{pal:'violet',form:'needle',pal2:'ivory'},               // 幻阴指 (line)
  13:{pal:'frost',form:'blast',pal2:'ivory',accent:'frost'},  // 寒冰神掌 (area)
  14:{pal:'ivory',form:'blast',pal2:'gold',accent:'gold'},    // 千手如来掌 (area): ivory palms, gold glints
  15:{pal:'gold',form:'palm',pal2:'ember',accent:'gold'},     // 天山六阳掌
  16:{pal:'ink',form:'palm',pal2:'frost',accent:'frost'},     // 玄冥神掌
  17:{pal:'frost',form:'palm',pal2:'pine',accent:'toxin'},    // 冰蚕毒掌
  18:{pal:'ivory',form:'blast',pal2:'gold',w:1.15,accent:'dust'}, // 龙象般若功 (area): ivory force ringed in gold
  19:{pal:'gold',form:'needle',pal2:'ivory'},                 // 一阳指 (line): golden needle
  21:{pal:'azure',form:'palm',pal2:'ivory',size:.9},          // 空明拳: light, empty-handed
  22:{pal:'pine',form:'palm',pal2:'ochre',low:true,w:1.15,accent:'dust'}, // 蛤蟆功 (line): low crouching blast
  23:{pal:'azure',form:'blast',pal2:'ivory',accent:'stars'},  // 太玄神功 (area)
  26:{pal:'crimson',form:'needles',pal2:'violet',area:true},  // 葵花神功 (area): needles
  75:{pal:'pine',form:'claw',pal2:'slate'},                   // 鳄鱼
  76:{pal:'pine',form:'claw',pal2:'violet',accent:'toxin'},   // 大蜘蛛
  79:{pal:'frost',form:'claw',pal2:'ivory',accent:'frost'},   // 雪怪
  84:{pal:'pine',form:'claw',pal2:'ochre'},                   // 大蟒蛇
  71:{pal:'slate',form:'fist',pal2:'ivory',accent:'dust'},    // 怪异武器
  72:{pal:'steel',form:'needle',pal2:'ivory'},                // 链心弹: a chain dart
  81:{pal:'ink',form:'fist',pal2:'ivory',accent:'chips'},     // 持棋盘
  83:{pal:'ochre',form:'palm',pal2:'ivory'},                  // 持瑶琴 (line): rings of sound
  91:{pal:'ochre',form:'blast',pal2:'ivory'},                 // 狮子吼 (area): rings of sound on every foe
};
// Staff family (棍杖) on M4: sweep — a low sweep across the shins then a rising flick (the 打狗棍 pattern);
// smash — the staff-shadow comes down past the foe's near shoulder (outside the head) to the ground, cracks and
// dust; whirl — a level swing round the waist followed by the low sweep.
function staffForm(c,cfg,r,alpha,fade){
  const P=FAM_PAL[cfg.pal],P2=FAM_PAL[cfg.pal2||cfg.pal],w=cfg.w??1,{A}=c,k=A.k,T=A.T,sd=cfg.seed??0;
  const low=()=>brush(c.g,slice(sweepPath(c,{r:19,h:4}),0,r,18),s=>(.5+3*Math.pow(Math.sin(Math.PI*clamp(s*.9+.05)),.8)*(.45+.55*s))*w,
    {colors:P,alpha,seed:c.seed+sd+1,n:11,dry:.2+.35*fade,fade,tailAlpha:.3,inkShare:.42,overlap:2,lead:'down',range:[0,r]});
  if(cfg.form==='smash'){const B=[T.x-k*15,T.y-36],E=[T.x-k*5,T.y-2],pts=bezier(B,[B[0]+k*2,B[1]+10],[E[0]-k*4,E[1]-12],E,16);
    brush(c.g,slice(pts,0,r,16),s=>(.5+3.2*Math.pow(s,.6)*(s>.92?.5+.5*(1-s)/.08:1))*w,{colors:P,alpha,seed:c.seed+sd+2,n:11,dry:.18+.35*fade,fade,tailAlpha:.25,inkShare:.44,overlap:2.1,range:[0,r]});
    if(r>.9){const rnd=seeded(c.seed+sd+3);for(let i=0;i<5;i++){const a=Math.PI*(.05+.9*rnd()),l=6+4*rnd();
      brush(c.g,[[E[0]+Math.cos(a)*l,E[1]+Math.sin(a)*l*.4],[E[0],E[1]]],q=>.2+.7*q,{colors:CRACK,alpha:alpha*.9,seed:c.seed+sd+40+i,n:3,dry:.3});}}}
  else if(cfg.form==='whirl'){const sw=bezier([T.x-k*19,T.y-24],[T.x-k*8,T.y-15],[T.x+k*8,T.y-15],[T.x+k*19,T.y-22],20);
    brush(c.g,slice(sw,0,clamp(r*1.6),20),s=>(.5+2.8*Math.sin(Math.PI*clamp(s*.9+.05)))*w,{colors:P,alpha,seed:c.seed+sd+4,n:10,dry:.2+.35*fade,fade,tailAlpha:.35,inkShare:.42,lead:'down',range:[0,clamp(r*1.6)]});
    if(r>.5){const r2=clamp((r-.5)*2);brush(c.g,slice(sweepPath(c,{r:18,h:3}),0,r2,18),s=>(.4+2.2*Math.sin(Math.PI*clamp(s*.9+.05)))*w,{colors:P2,alpha:alpha*.85,seed:c.seed+sd+5,n:8,dry:.3+.3*fade,fade,tailAlpha:.3,inkShare:.4,range:[0,r2]});}}
  else{low();if(r>.55){const r2=clamp((r-.55)/.45),B=[T.x-k*13,T.y-8],E=[T.x-k*7,T.y-30],P3=bezier(B,[B[0]-k*6,B[1]-9],[E[0]-k*9,E[1]+5],E,16);
    brush(c.g,slice(P3,0,r2,16),s=>(.5+2.9*Math.pow(s,.6)*(s>.9?.5+.5*(1-s)/.1:1))*w,{colors:P2,alpha,seed:c.seed+sd+6,n:10,dry:.18+.35*fade,fade,tailAlpha:.2,inkShare:.44,range:[0,r2]});}}
}
function staffPainter(cfg){
  const P=FAM_PAL[cfg.pal],S=familySlots(cfg,staffForm,famAccent);
  return {
    hitFrom:S.hitFrom,
    mid(c){const {w,A}=c;if(w!==null){gather(c.g,A.H,w,c.seed,{color:P.body,ink:P.ink,radius:12,width:1.4});return;}famTravel(c,P,1);},
    ground(c){const u=afterHit(c,.45);if(u===null||u>=1)return;dab(c.g,c.A.T.x-c.A.k*5,c.A.T.y-1,9+5*ease(u),2.5,DUST,.55*(1-u),c.seed+3);},
    front:S.front,
    hit:S.area?S.hit:(c,px,py)=>{const u=peakU(c);if(u===null)return;flare(c.g,px-c.A.k*6,py-22,6,FAM_PAL[cfg.pal2||cfg.pal],.85*(1-u),c.seed+71);},
  };
}
const STAFF_ARTS={
  70:{pal:'ochre',form:'whirl',pal2:'gold',accent:'dust'},   // 大轮杖法
  73:{pal:'bamboo',form:'sweep',pal2:'pine'},                 // 叫化棍法: the beggar staff, plain
  85:{pal:'gold',form:'smash',pal2:'ochre',accent:'petals'},  // 金花杖法: golden smash, gold-flower petals
  86:{pal:'pine',form:'whirl',pal2:'ochre',accent:'dust'},    // 神龙鹿杖 (area)
};
const PAINTERS_BY_SKILL={61:duguPainter,60:bixiePainter,87:dogPainter,49:jadePainter};
for(const [id,cfg] of Object.entries(SWORD_ARTS))PAINTERS_BY_SKILL[id]=swordPainter({...cfg,seed:+id});
for(const [id,cfg] of Object.entries(FIST_ARTS))PAINTERS_BY_SKILL[id]=fistPainter({...cfg,seed:+id});
for(const [id,cfg] of Object.entries(STAFF_ARTS))PAINTERS_BY_SKILL[id]=staffPainter({...cfg,seed:+id});
// Arts drawn by a family painter here (the shared impact layer in combat-vfx.js keeps only their shake).
export const FAMILY_ARTS=Object.freeze([...Object.keys(SWORD_ARTS),...Object.keys(FIST_ARTS),...Object.keys(STAFF_ARTS)].map(Number));



const strikeAnchors=new Map();
// ---- Layer orchestration ---------------------------------------------------------------------
// geo: {cx,cy,ox,oy,hw,hh,aim,pose,equipment,outcome(x,y),fxCells,reducedMotion} from the engine, or
// {sx,sy,tx,ty,...} from previews. pic === null means "before contact" (wind-up from v.sourceFrame).
// Usage in the depth-sorted actor loop:  L.ground() → for each cell L.at(x,y,layer4) → L.end().
export function signatureLayers(g,v,pic,geo={}){
  const kind=SIGNATURE_ARTS[v?.skill];if(!kind||!g)return null;
  const t=pic==null?null:signaturePhase(v,pic),w=pic==null?signatureWindup(v):null;
  if(t===null&&w===null)return null;
  const {cx=0,cy=0,hw=24,hh=12,aim=null}=geo,ox=geo.ox??geo.sx??0,oy=geo.oy??geo.sy??0;
  const scr=(x,y)=>[ox+hw*((x-cx)-(y-cy)),oy+hh*((x-cx)+(y-cy))];
  const sx=geo.sx??ox,sy=geo.sy??oy;let tx=geo.tx,ty=geo.ty;
  if(aim&&Number.isFinite(aim.x)&&Number.isFinite(aim.y))[tx,ty]=scr(aim.x,aim.y);
  if(!Number.isFinite(tx)||!Number.isFinite(ty)){tx=sx;ty=sy;}
  if(![sx,sy].every(Number.isFinite))return null;
  const A=castAnchors(v,sx,sy,tx,ty,geo.pose,bladeLine(v,geo.actor,geo.equipment)),n=Math.max(2,v.count||2);
  // The release point is frozen at the strike: after the hit the actor recovers to guard, but the force that
  // already left the hand (fan, tail, dissolving qi) must not follow the arm back.
  const castKey=`${v.pid}:${v.skill}:${v.direction}:${v.first}:${v.frameStart}:${v.targetX},${v.targetY}`;
  // Only the primary (measured) pass records; secondary calls (per-cell hits) read the recorded strike.
  const k=strikeAnchors.get(castKey),measured=!!(geo.pose||geo.actor),same=k&&k.S.x===A.S.x&&k.S.y===A.S.y;
  if(measured&&(t===null||t<=VFX_HIT)){strikeAnchors.set(castKey,{H:A.H,blade:A.blade,S:A.S});if(strikeAnchors.size>16)strikeAnchors.delete(strikeAnchors.keys().next().value);}
  else if(same&&(t>VFX_HIT||!measured)){A.H=k.H;A.blade=k.blade;}
  const painter=PAINTERS_BY_SKILL[v.skill]||PAINTERS[kind]||generic;
  const c={g,v,t,w,pic,kind,A,geo,I:vfxIntensity(v),n,ft:1/(n-1),reduced:!!geo.reducedMotion,
    seed:((v.skill|0)*131+(A.d|0)*17+7)>>>0,coat:geo.equipment!==undefined&&flameCoatWeapon(v,geo.equipment)!=null};
  const dc=cx+cy,dt=aim?aim.x+aim.y:dc+(ty>sy+.5?1:ty<sy-.5?-1:0),mid=(dc+dt)/2;
  let behind=false,overDue=false,over=false,midDone=false,aimDone=false;
  // Each slot renders into the supersampled brush layer over the caster..target area, then is downsampled.
  const region=[Math.min(A.S.x,A.T.x,A.H.x)-72,Math.min(A.S.y,A.T.y)-112,Math.max(A.S.x,A.T.x,A.H.x)+72,Math.max(A.S.y,A.T.y)+30];
  const run=(slot,...args)=>{const f=painter[slot];if(!f)return;
    brushLayer(g,region,t=>{const g0=c.g;c.g=t;t.save();try{f(c,...args);}finally{t.restore();c.g=g0;}});};
  const flushOver=()=>{if(overDue&&!over){over=true;run('over');}};
  return {
    context:c,
    ground(){run('ground');},
    at(x,y,layer4=0){
      flushOver();
      if(!midDone&&x+y>=mid){midDone=true;run('mid');}
      const isAim=!!aim&&aim.x===x&&aim.y===y;
      if(t!==null&&(isAim||layer4>=2)){const outcome=geo.outcome?.(x,y)??null,[px,py]=scr(x,y);
        // aim: the part of a cast that travels BEHIND the chosen foe (drawn right before that cell's actor).
        if(isAim&&!aimDone){aimDone=true;run('aim',px,py,{x,y,outcome,struck:layer4>=2});}
        if(layer4>=2&&outcome!=='dodge')run('cell',px,py,{x,y,outcome,aim:isAim});}
      if(x===cx&&y===cy&&!behind){behind=true;run('behind');overDue=true;}
    },
    end(){
      if(!behind){behind=true;run('behind');overDue=true;}
      flushOver();if(!midDone){midDone=true;run('mid');}
      if(!aimDone&&t!==null){aimDone=true;run('aim',tx,ty,{x:aim?.x,y:aim?.y,outcome:null,struck:true});}
      run('front');
    },
    // Per struck cell, in FRONT of its fighter (engine: effects.js paintCombatEffect after the actor).
    hit(px,py,info={}){if(t!==null&&info.outcome!=='dodge')run('hit',px,py,info);},
    // Single-call form for previews: every slot in depth order for one caster/target pair.
    paintAll({ground=false,cell=true}={}){
      if(ground)run('ground');
      const front=A.targetFront;
      run('behind');run('over');
      const hit=()=>{if(t===null)return;run('aim',tx,ty,{x:0,y:0,outcome:null,struck:true});if(cell)run('cell',tx,ty,{x:0,y:0,outcome:null,aim:true});};
      if(!front)hit();
      run('mid');
      if(front)hit();
      if(t!==null&&cell)run('hit',tx,ty,{outcome:null});
      run('front');
    },
  };
}
// Cut marks in front of one struck fighter (thin, at most three native frames). Called per affected
// cell after that cell's actor; sx/sy is the caster's foot point.
export function paintSignatureHit(g,v,pic,x,y,{sx,sy,outcome=null,reducedMotion=false,cellX,cellY}={}){
  const kind=SIGNATURE_ARTS[v?.skill],painter=PAINTERS_BY_SKILL[v?.skill]||PAINTERS[kind],t=signaturePhase(v,pic);
  if(!painter?.hit||t===null||(painter.hitFrom!=null&&t<painter.hitFrom))return false;// peak-only accents: nothing before the hit
  const L=signatureLayers(g,v,pic,{sx:Number.isFinite(sx)?sx:x,sy:Number.isFinite(sy)?sy:y,tx:x,ty:y,reducedMotion});
  // aim: whether this struck cell is the art's chosen aim (area arts mark the other fighters differently)
  L?.hit(x,y,{outcome,aim:!Number.isFinite(cellX)||cellX===v.targetX&&cellY===v.targetY});return !!L;
}
// Floor layer for previews/legacy callers: drawn after terrain, before every actor.
export function paintSignatureGround(g,v,pic,sx,sy,{reducedMotion=false,tx,ty,pose}={}){
  if(!v||signaturePhase(v,pic)===null||![sx,sy].every(Number.isFinite))return false;
  const kind=SIGNATURE_ARTS[v.skill];if(!PAINTERS[kind]?.ground)return false;
  const L=signatureLayers(g,v,pic,{sx,sy,tx:tx??sx,ty:ty??sy,reducedMotion,pose});
  if(!L)return false;L.ground();return true;
}
// Single-call cast for previews/legacy callers (no depth sorting available there).
export function paintSignatureCast(g,v,pic,sx,sy,tx,ty,opts={}){
  if(signaturePhase(v,pic)===null||![sx,sy,tx,ty].every(Number.isFinite))return false;
  const L=signatureLayers(g,v,pic,{sx,sy,tx,ty,reducedMotion:opts.reducedMotion,pose:opts.pose,equipment:opts.equipment});
  if(!L)return false;L.paintAll({cell:opts.cell!==false});return true;
}
export function paintSignatureContact(g,v,pic,x,y){
  const t=signaturePhase(v,pic);if(t===null)return false;
  if(v.skill===66||t<.55)return true;
  // Short local impact accents, not another complete motif on every affected tile.
  const contactColors={25:'#ecd49e',63:'#d77883',30:'#d5ebe2',20:'#b2c6b3',24:'#a9aca6',49:'#c4dfce',57:'#b9ab90',58:'#b2c6b3',60:'#c984ab',61:'#eadcb1',87:'#adbd76'};
  const q=(t-.55)/.45,angle=ANGLE[v.direction]??0;
  g.save();g.translate(x,y-25);g.rotate(angle);g.globalAlpha*=Math.sin(Math.PI*q)*.38;
  g.strokeStyle=contactColors[v.skill]||({frost:'#b3d5db',toxin:'#929b7e',solar:'#e7d092',drain:'#a9cdc2',ink:'#7c8f87',sound:'#d0c8a2'}[SIGNATURE_ARTS[v.skill]]||'#d6d2b6');g.lineWidth=.8;g.lineCap='round';
  for(const sign of [-1,1]){
    g.beginPath();g.moveTo(1,sign*2);g.quadraticCurveTo(5+q*4,sign*4,8+q*5,sign*(5+q*3));g.stroke();
  }
  g.restore();return true;
}
