// Fire for 火焰刀法 (66). One material, two physical attachments, no projectile:
//  • paintBladeFire  — the approved "B" flowing coat (reviews/vfx-concepts/fire-blade-B-approved.png) on a
//    sabre the hero really carries. Called by the weapon rig in the blade's local coordinates (guard +5 → tip),
//    so it follows the same grip, angle and scale as the steel. Irregular licks hug BOTH edges from guard to tip,
//    always rise in WORLD up and trail behind the cut, and leave the steel midline readable.
//  • paintHandBlade  — bare-handed casters: brush tongues rooted on the pinky edge of the hand and the outer
//    forearm of whatever hand pose the actor actually shows. Never a steel blade.
// vfx 394 final art round: every tongue is a brush stroke (signature-art.js brush) — root opaque, tip breaking
// into bristles; hot near-white edge, orange body, deep-red ink on the trailing side; no outline, no flat fill.
import {brush,bezier} from './signature-art.js';
const FIRE={edge:'#fff1c4',body:'#e4682a',ink:'#7a1c0c'},HOT={edge:'#fffbe8',body:'#f6bd45',ink:'#c0461a'};
const clamp=(x,a=0,b=1)=>x<a?a:x>b?b:x;
const hash=i=>{const s=Math.sin(i*127.1+311.7)*43758.5453;return s-Math.floor(s);};
// Screen-up expressed in the current local coordinates (rig transforms rotate and may mirror).
function localUp(g){
  const m=g.getTransform?.();
  if(!m||!Number.isFinite(m.a)||!Number.isFinite(m.d))return [0,-1];
  const det=m.a*m.d-m.b*m.c;if(!det)return [0,-1];
  const x=m.c/det,y=-m.a/det,l=Math.hypot(x,y)||1;return [x/l,y/l];
}
// One tongue: root B on an edge running along E, rising along U, swept back (−E); the tip (stroke tail)
// breaks up, the root (stroke head) is solid.
function tongue(g,B,E,U,h,len,w,colors,alpha,seed,flick=0){
  const tip=[B[0]+U[0]*h-E[0]*len+U[0]*flick,B[1]+U[1]*h-E[1]*len+U[1]*flick];
  const c1=[B[0]+U[0]*h*.75-E[0]*len*.55,B[1]+U[1]*h*.75-E[1]*len*.55],c2=[B[0]+U[0]*h*.3-E[0]*len*.1,B[1]+U[1]*h*.3-E[1]*len*.1];
  brush(g,bezier(tip,c1,c2,B,9),s=>.15+w*Math.pow(s,.85),{colors,alpha,seed,n:5,dry:.55,tailAlpha:.18,lead:[E[0],E[1]]});
}
// Ignition along the source clock: grows from the guard during the wind-up (frames before contact), full
// through the cut, dies back after the blow. The hero sabre sheet strikes on frame 9.
function coatLife(frame){
  const ignite=clamp((frame+1)/9),fade=1-clamp((frame-12.5)/3.5);
  return Math.max(0,Math.min(ignite,fade));
}
export function paintBladeFire(g,length,width,frame=0,{reducedMotion=false}={}){
  const life=reducedMotion?1:coatLife(frame);if(!(life>.02))return;
  const U=localUp(g),phase=reducedMotion?0:frame*1.7,x0=5,x1=x0+(length-x0)*life,E=[1,0];
  // Model units: the rig draws the sabre at half scale, so 10 units ≈ 5 logical px.
  for(const side of [1,-1]){
    const edge=s=>side>0?width*(.42+.25*Math.sin(Math.PI*s)):-width*(.42+.42*s);
    const into=U[1]*(side>0?-1:1)>0,n=Math.max(3,Math.round((x1-x0)/8));
    for(let i=n-1;i>=0;i--){
      const s=(i+.35+.3*hash(i+side))/n,B=[x0+(x1-x0)*s,edge(s)],fl=reducedMotion?0:Math.sin(phase+i*2.3+side);
      const h=(side>0?12:8)*(.5+.7*s)*(.6+.6*hash(i*3+side))*(into?.3:1),len=(side>0?12:8)*(.6+.6*s)*(.6+.7*hash(i*5+side));
      tongue(g,B,E,U,h,len,(side>0?3.4:2.6)*(.8+.4*hash(i*7)),i%3?FIRE:HOT,side>0?1:.85,11+i*7+(side>0?0:3),fl*h*.15);
    }
  }
  // a thin hot glaze on the cutting edge, guard to the burning front (steel midline stays clear)
  brush(g,[[x0+1,width*.42],[(x0+x1)/2,width*.6],[x1-1,width*.36]],s=>.5+.4*Math.sin(Math.PI*s),{colors:HOT,alpha:.9*life,seed:3,n:3,dry:.25,lead:'down'});
}
// Bare-hand blade in SCREEN space. (ox,oy) is the front of the striking hand; (fx,fy) the unit forearm
// direction (elbow → fingers); life 0..1 the burn. 4–6 tongues of 3–10 px are rooted on the pinky edge of the
// hand and the outer forearm, swept back against the motion and rising, reaching at most ~4 px past the
// fingertips; white only as the 1 px hot edge of the strokes.
export function paintHandBlade(g,ox,oy,fx,fy,life=1,frame=0,{reducedMotion=false}={}){
  if(!(life>.02)||![ox,oy,fx,fy].every(Number.isFinite))return false;
  const l=Math.hypot(fx,fy)||1;fx/=l;fy/=l;
  let nx=-fy,ny=fx;if(ny<0||(ny===0&&nx>0)){nx=-nx;ny=-ny;}// lower (cutting, pinky-side) normal
  const P=(x,y)=>[ox+fx*x+nx*y,oy+fy*x+ny*y],phase=reducedMotion?0:frame*1.9;
  // a dry glaze along the hand-blade edge
  brush(g,[P(-14,1.2),P(-6,2),P(2,1.8),P(4.8,.8)],s=>.6+1*Math.sin(Math.PI*Math.min(1,s*.9+.08)),{colors:FIRE,alpha:life,seed:5,n:5,dry:.4,lead:'down'});
  // [along forearm, below edge, height]: varied 3–10 px, the tallest over the hand
  const roots=[[-13,1.4,5],[-9.5,1.7,8.5],[-6,2,10],[-2.5,2,7],[.8,1.7,9],[3.6,1.2,4]];
  for(let i=0;i<roots.length;i++){
    const [rx,ry,h0]=roots[i],fl=reducedMotion?0:Math.sin(phase+i*2.3)*.22+Math.sin(phase*1.7+i)*.1;
    const h=h0*life*(1+fl);if(h<1.2)continue;
    tongue(g,P(rx,ry),[fx,fy],[0,-1],h,h*(.5+.25*((i*37)%5)/4),1.6+h*.06,h0>6?HOT:FIRE,1,21+i*5);
  }
  return true;
}
