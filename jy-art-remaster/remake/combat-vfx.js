// Layered combat VFX around the painted signature textures (signature-effects.js).
// Every frame is a pure function of the native effect clock t∈[0,1] plus a seed derived
// from the art and the cell: pausing, scrubbing and replays draw identical frames.
// Presentation only — never damage, range, targets or extra strikes.
//
// Timeline (t=0 is the caster's native contact frame, bridge.lua War_ShowFight):
//   release  0 → .22   bloom at the striking hand, ground pulse under the caster
//   travel   .08→ .5   (signature-effects.js: anchored at the real hand, layered by depth)
//   impact   .50→ .92  flash, shock ring and element particles on every affected cell
//   linger   .58→ 1    embers / frost / mist / ink settling and fading
// vfx 394: the white peak (flash / pin / rays) lasts at most two native frames and is painted BEHIND the
// struck fighter (layer 'behind', called from the depth-sorted signature layers) so the silhouette stays
// readable; the per-cell call from the engine paints only the coloured accents in front. The eight
// hand-built arts (signature-effects.js REDRAWN_ARTS) paint their own release/impact and keep only shake here.
import {SIGNATURE_CATALOG} from './signature-catalog.js';
import lore from './martial-lore-data.js';

const TAU=Math.PI*2, clamp=(x,a=0,b=1)=>x<a?a:x>b?b:x, easeOut=u=>1-(1-clamp(u))**3;
export const VFX_HIT=.5;
const GRADE_WEIGHT={juexue:1,shangcheng:.84,pending:.8,mingjia:.7,xunchang:.58};
const GRADE=Object.fromEntries((lore?.entries||[]).filter(e=>Number.isInteger(e.nativeSkillId)).map(e=>[e.nativeSkillId,e.grade]));
// Runtime-built 93 家传辟邪剑法 is not in the native table; it shares 辟邪's standing.
GRADE[93]=GRADE[93]||'shangcheng';

// vfx 394: mid-saturation, value-led colours that sit with the hand-painted pixel art (no electric neon).
const PALETTE={
  gold:{core:'#fff2cc',glow:'#dcae52',ring:'#e2c27c',spark:['#f0d48c','#c99636','#fff2cc']},
  fire:{core:'#fff2cc',glow:'#e2682a',ring:'#e88a4a',spark:['#f5b843','#c8501e','#f8d58a']},
  frost:{core:'#f4fbfc',glow:'#9cc8d6',ring:'#bcdbe4',spark:['#dceff4','#8fbccb','#ffffff'],mist:'#cfe4ea'},
  toxin:{core:'#eef6d8',glow:'#8daf58',ring:'#a4c072',spark:['#bcd48a','#86679e','#dce9b4'],mist:'#6f8a48'},
  jade:{core:'#f2fbf6',glow:'#7cc4aa',ring:'#a2d8c4',spark:['#cdebdc','#86c9b0','#ffffff']},
  ivory:{core:'#ffffff',glow:'#e8dcb8',ring:'#ece0c0',spark:['#fbf6e8','#dccfa8','#ffffff']},
  steel:{core:'#ffffff',glow:'#bcc8d4',ring:'#cdd5de',spark:['#eef1f6','#aab6c4','#ecdcaa']},
  crimson:{core:'#fbe4e6',glow:'#b83a4a',ring:'#cc5e6c',spark:['#e898a2','#9c2436','#f6d4d8'],mist:'#6e1a26'},
  violet:{core:'#f6eaf8',glow:'#a46ac0',ring:'#bc90d0',spark:['#d8b4e8','#c86a8e','#f2def6']},
  ink:{core:'#e9f0ee',glow:'#5a6e74',ring:'#6a7e84',spark:['#8a9ca0','#2c3a3e','#b8c8ca'],mist:'#2a363a'},
  teal:{core:'#eefaf8',glow:'#5fb3a8',ring:'#84c8be',spark:['#b2e2da','#4ea096','#e8f8f6']},
  earth:{core:'#fbf0da',glow:'#d6ae74',ring:'#d0b088',spark:['#ecd4a8','#b8925c','#faecd2'],mist:'#9a8466'},
  slate:{core:'#eceff2',glow:'#8e9aa8',ring:'#a2acb8',spark:['#c8ced6','#727c88','#e4d8bc'],mist:'#6a635a'},
  storm:{core:'#ffffff',glow:'#93a9d0',ring:'#b2c2de',spark:['#e2e9f4','#9fb4d6','#f6efc8']},
  bamboo:{core:'#f4fae6',glow:'#9cbc62',ring:'#b2cc84',spark:['#d2e6a8','#98bc5c','#f6f0bc']},
  sound:{core:'#fcf8e8',glow:'#e2cc8c',ring:'#e8d6a6',spark:['#f6ecca','#d8c08a']},
};
// Components per phase. `shake` is the base screen-shake amplitude in logical px.
const RECIPE={
  impact:{pal:'earth',hit:['flash','ring','dust','sparks'],shake:1.3},
  empty:{pal:'ivory',hit:['ripple','flash','ring'],shake:.9},
  toxin:{pal:'toxin',hit:['flash','mist','bubbles','ring'],after:['mist'],shake:.7},
  solar:{pal:'gold',cast:['burst'],hit:['flash','rays','ring','sparks'],after:['motes'],shake:2.1},
  frost:{pal:'frost',cast:['puff'],hit:['flash','shards','ring','mist'],after:['motes','decal'],shake:1.4},
  claw:{flash:.6,pal:'crimson',hit:['claws','sparks','flash'],shake:1.2},
  finger:{flash:.6,pal:'gold',hit:['pin','ring','sparks'],shake:.9},
  taiji:{pal:'ivory',hit:[],shake:.8},
  taixuan:{pal:'storm',cast:['burst'],hit:['stars','rays','ring','flash'],after:['motes'],shake:1.4},
  sorrow:{pal:'slate',hit:[],shake:1.6},
  dragon:{pal:'gold',hit:[],shake:3},
  bixie:{flash:.6,pal:'violet',cast:['burst'],hit:['slashes','flash','sparks'],shake:1.6},
  drain:{pal:'teal',hit:['stream','implode'],shake:.5},
  meridian:{pal:'jade',hit:[],shake:1.2},
  sword:{flash:.6,pal:'steel',hit:['slash','sparks','flash'],shake:1},
  jadePair:{flash:.6,pal:'jade',cast:['burst'],hit:['slash2','petals','flash'],shake:1},
  ink:{pal:'ink',hit:['splat','mist','flash'],after:['decal'],shake:.9},
  stars:{flash:.6,pal:'ivory',cast:['burst'],hit:['stars','slash','flash'],shake:1.2},
  snake:{flash:.6,pal:'gold',hit:['wave','sparks','flash'],shake:1.2},
  heavy:{pal:'slate',hit:[],shake:3.4},
  taijiSword:{pal:'ivory',hit:[],shake:1},
  dugu:{flash:.6,pal:'ivory',cast:['burst'],hit:['pins','sparks','stars','flash'],shake:1.7},
  blade:{flash:.6,pal:'steel',hit:['cleave','sparks','flash'],shake:1.4},
  blood:{pal:'crimson',hit:[],shake:2},
  flame:{pal:'fire',hit:[],shake:1.5},
  thunder:{pal:'storm',hit:['bolt','flash','sparks','ring'],shake:2.6},
  staffBasic:{flash:.6,pal:'earth',hit:['sweep','dust','flash'],shake:1.1},
  whip:{flash:.6,pal:'earth',hit:['sweep','sparks','flash'],shake:1},
  staff:{flash:.6,pal:'bamboo',cast:['burst'],hit:['sweep','sparks','flash','ring'],shake:1.4},
  fireJet:{pal:'fire',hit:['flash','embers','ring'],shake:1.3},
  sound:{pal:'sound',cast:['ripple'],hit:['ripple','flash'],shake:1.9},
  wheel:{flash:.6,pal:'steel',hit:['sparks','flash'],shake:1.1},
};
const kindOf=v=>SIGNATURE_CATALOG[v?.skill]?.kind;
// Arts painted by their own hand-built painter in signature-effects.js keep only their shake here (by skill id,
// so 49 does not change the other paired-sword arts that share its kind).
const RECIPE_BY_SKILL={49:{pal:'jade',hit:[],shake:1},60:{pal:'violet',hit:[],shake:1.4},61:{pal:'steel',hit:[],shake:1.5},87:{pal:'bamboo',hit:[],shake:1.3}};
// vfx 395 batches: arts now painted by their family painter in signature-effects.js (by art id) — the shared layer
// keeps only their kind's palette and shake (no second slash / spark set on top of the brush strokes).
export const FAMILY_PAINTED=new Set([31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,50,51,52,53,54,55,56,59,89,93,62,64,65,67,68,
  1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,21,22,23,26,75,76,79,84,
  69,77,78,80,82,71,72,81,83,91,70,73,85,86]);
export function vfxRecipe(v){
  if(FAMILY_PAINTED.has(v?.skill)){const r=RECIPE[kindOf(v)];return r?{pal:r.pal,hit:[],shake:r.shake}:null;}
  return RECIPE_BY_SKILL[v?.skill]||RECIPE[kindOf(v)]||null;}
export function vfxGlowColor(v){return PALETTE[vfxRecipe(v)?.pal]?.glow||'#f3e7c2';}
// 0.4 … 1.15: grade × mastered rank. `level` arrives as the native 0..999 level or a 1..10 rank.
export function vfxIntensity(v){
  const lv=Number(v?.level)||0,rank=clamp(lv>10?Math.floor(lv/100)+1:Math.max(1,lv),1,10);
  return (GRADE_WEIGHT[GRADE[v?.skill]]??.7)*(.72+.03*rank)*(v?.skill===0?.8:1);
}
function phase(v,pic){
  if(!v||v.kind<0||(v.skill===0&&v.kind===0)||!RECIPE[kindOf(v)]||!(v.count>0)||!Number.isFinite(v.first)||!Number.isFinite(pic))return null;
  const f=pic-v.first-1;
  return f>=0&&f<v.count?clamp(f/Math.max(1,v.count-1)):null;
}
function rng(seed){let s=(seed>>>0)||1;return()=>{s=(s+0x6D2B79F5)>>>0;let r=Math.imul(s^s>>>15,1|s);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296;};}
const fade=c=>c.length===7?c+'00':c;
// vfx 394 language (reference-notes §0): value, not glow. No additive radial halos — a "glow" is a flat,
// hard-edged burst (colour body, small core), painted at most a moment; rings on the floor are dark,
// flattened ink marks; sparks are plain strokes in the palette.
function glow(g,x,y,r,color,alpha,core){
  if(!(alpha>.01&&r>.5))return;
  r*=.62;// the flat shape reads as large as the old soft halo did
  g.save();g.globalAlpha*=clamp(alpha);g.fillStyle=color;g.beginPath();
  for(let i=0;i<16;i++){const a=i*Math.PI/8+.2,rr=i%2?r*.42:r;g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.8);}
  g.closePath();g.fill();
  if(core){g.fillStyle=core;g.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8+.2,rr=(i%2?.42:1)*r*.45;g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.8);}g.closePath();g.fill();}
  g.restore();
}
function ellipseRing(g,x,y,rx,color,width,alpha){
  if(!(alpha>.01&&rx>.5&&width>.05))return;
  g.save();g.globalAlpha*=clamp(alpha)*.45;g.strokeStyle='#2a2620';g.lineWidth=Math.min(1.6,width);
  g.beginPath();g.ellipse(x,y,rx,rx*.5,0,0,TAU);g.stroke();g.restore();
}
function spark(g,x0,y0,x1,y1,color,width,alpha){
  if(!(alpha>.01))return;
  g.save();g.globalAlpha*=clamp(alpha);g.strokeStyle=color;g.lineWidth=width*.8;g.lineCap='round';
  g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();g.restore();
}
function blob(g,x,y,r,color,alpha){
  if(!(alpha>.01&&r>.3))return;
  g.save();g.globalAlpha*=clamp(alpha);
  const gr=g.createRadialGradient?.(x,y,0,x,y,r);
  if(gr?.addColorStop){gr.addColorStop(0,color);gr.addColorStop(1,fade(color));g.fillStyle=gr;}else g.fillStyle=color;
  g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.restore();
}
// Blade-shaped arc on the ground-tilted plane: sharp at both ends, widest mid-sweep, revealed along its path.
function crescent(g,x,y,r,a0,sweep,width,color,alpha,reveal=1){
  const rev=clamp(reveal);if(!(alpha>.01&&r>1&&rev>0))return;
  g.save();g.globalAlpha*=clamp(alpha);g.fillStyle=color;g.beginPath();
  for(let i=0;i<=16;i++){const s=i/16*rev,a=a0+sweep*s;g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r*.55);}
  for(let i=16;i>=0;i--){const s=i/16*rev,a=a0+sweep*s,rr=r-width*Math.sin(Math.PI*s);g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.55);}
  g.closePath();g.fill();g.restore();
}
function star(g,x,y,r,color,alpha,rot=0){
  if(!(alpha>.01&&r>.3))return;
  g.save();g.globalAlpha*=clamp(alpha);g.fillStyle=color;g.translate(x,y);g.rotate(rot);
  g.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?r*.22:r;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr*.8);}g.closePath();g.fill();g.restore();
}

// ---- impact components: (g, ctx) where ctx={x,y,u,I,pal,rand,angle,crit,cells,sx,sy} ---------------
const HIT={
  // Brief (~2 native frames) and sized below the body so the struck fighter stays readable.
  flash(g,c){const u=c.fu,k=(c.crit?1.2:1)*c.flash;if(u>=1)return;
    glow(g,c.x,c.y-28,(9+9*c.I)*k*(.8+.3*easeOut(u)),c.pal.glow,(1-u)**1.6*.6*c.I,c.pal.core);
    glow(g,c.x,c.y-28,(3.5+3.5*c.I)*k,c.pal.core,(1-clamp(u*1.4))**2*.85*c.I);},
  ring(g,c){const u=clamp(c.u*1.25);ellipseRing(g,c.x,c.y,(9+27*c.I)*easeOut(u),c.pal.ring,(3.2*c.I)*(1-u)+.4,(1-u)**1.3);},
  ring2(g,c){const u=clamp((c.u-.14)*1.3);ellipseRing(g,c.x,c.y,(14+34*c.I)*easeOut(u),c.pal.glow,2.4*(1-u)+.3,(1-u)**1.5*.8);},
  sparks(g,c){const n=Math.round((7+13*c.I)*(c.crit?1.5:1)/c.spread);
    for(let i=0;i<n;i++){const a=c.rand()*TAU,sp=(22+30*c.rand())*c.I,up=-6-14*c.rand(),u=clamp(c.u*1.3-c.rand()*.15);
      const d=sp*easeOut(u),x=c.x+Math.cos(a)*d,y=c.y-26+Math.sin(a)*d*.6+up*u+18*u*u,tail=5+6*(1-u);
      spark(g,x-Math.cos(a)*tail,y-Math.sin(a)*tail*.6,x,y,c.pal.spark[i%c.pal.spark.length],1.3+c.rand(),(1-u)**1.2);}},
  dust(g,c){const n=Math.round(6/c.spread)+2;
    for(let i=0;i<n;i++){const a=Math.PI+c.rand()*Math.PI,d=(8+18*c.I)*easeOut(c.u),u=c.u;
      blob(g,c.x+Math.cos(a)*d*1.4,c.y-2+Math.sin(a)*d*.4-6*u,(5+6*c.rand())*(0.6+u),c.pal.mist||c.pal.ring,(1-u)**1.4*.45);}},
  mist(g,c){const n=Math.round(7/c.spread)+2;
    for(let i=0;i<n;i++){const a=c.rand()*TAU,d=(6+14*c.rand())*easeOut(c.u),u=c.u;
      blob(g,c.x+Math.cos(a)*d*1.2,c.y-10+Math.sin(a)*d*.4-6*u,(5+5*c.rand())*(.5+u),c.pal.mist||c.pal.glow,(1-u)**1.4*.3);}},
  bubbles(g,c){const n=Math.round(6/c.spread)+2;
    for(let i=0;i<n;i++){const u=clamp(c.u*1.2-c.rand()*.3),x=c.x+(c.rand()-.5)*26,y=c.y-14-u*(20+14*c.rand());
      g.save();g.globalAlpha*=(1-u)*.8;g.strokeStyle=c.pal.spark[i%3];g.lineWidth=1;g.beginPath();g.arc(x,y,1.5+2.5*c.rand(),0,TAU);g.stroke();g.restore();}},
  shards(g,c){const n=Math.round((3+3*c.I)/c.spread)+1;
    for(let i=0;i<n;i++){const a=-Math.PI*c.rand(),sp=(16+26*c.rand())*c.I,u=clamp(c.u*1.2),d=sp*easeOut(u);
      const x=c.x+Math.cos(a)*d,y=c.y-24+Math.sin(a)*d*.7+22*u*u,s=2.5+3*c.rand();
      g.save();g.globalAlpha*=(1-u)**1.1;g.translate(x,y);g.rotate(a+u*4*(c.rand()-.5));
      g.fillStyle=c.pal.spark[i%3];g.beginPath();g.moveTo(s*1.6,0);g.lineTo(-s*.6,s*.55);g.lineTo(-s*.6,-s*.55);g.closePath();g.fill();
      g.strokeStyle=c.pal.core;g.lineWidth=.6;g.stroke();g.restore();}},
  rays(g,c){const n=7+Math.round(3*c.I),u=clamp(c.fu*.7),r0=5,r1=(16+18*c.I)*(.6+.6*easeOut(u*1.6));if(u>=1)return;
    g.save();g.globalAlpha*=(1-u)**1.5*.85;g.fillStyle=c.pal.glow;
    for(let i=0;i<n;i++){const a=i/n*TAU+c.rand()*.3,w=.07+.05*c.rand(),r=r1*(.7+.4*c.rand());
      g.beginPath();g.moveTo(c.x+Math.cos(a-w)*r0,c.y-26+Math.sin(a-w)*r0*.7);g.lineTo(c.x+Math.cos(a)*r,c.y-26+Math.sin(a)*r*.7);g.lineTo(c.x+Math.cos(a+w)*r0,c.y-26+Math.sin(a+w)*r0*.7);g.fill();}
    g.restore();},
  ripple(g,c){for(let i=0;i<3;i++){const u=clamp(c.u*1.3-i*.16);if(u<=0)continue;
    g.save();g.globalAlpha*=(1-u)**1.4*.8;g.strokeStyle=c.pal.ring;g.lineWidth=2*(1-u)+.4;
    g.beginPath();g.ellipse(c.x,c.y-24,(8+22*c.I)*easeOut(u),(10+24*c.I)*easeOut(u)*.72,0,0,TAU);g.stroke();g.restore();}},
  claws(g,c){for(let i=0;i<3;i++){const u=clamp(c.u*2.2-i*.12);if(u<=0)continue;
    const off=(i-1)*6;g.save();g.translate(c.x+off,c.y-28+off*.4);g.rotate(-.7);
    crescent(g,0,0,15+6*c.I,-1.1,1.6,3,c.pal.glow,(1-clamp(c.u*1.4))*.95,u*1.6);g.restore();}},
  slash(g,c){const u=c.u;crescent(g,c.x,c.y-28,17+10*c.I,c.angle-1.2,2.1,3.6*c.I+1,c.pal.core,(1-u)**1.3,u*3.2);
    crescent(g,c.x,c.y-28,19+11*c.I,c.angle-1.25,2.15,6*c.I,c.pal.glow,(1-u)**1.6*.55,u*3.2);},
  slash2(g,c){HIT.slash(g,c);const u=clamp(c.u-.1);crescent(g,c.x,c.y-26,16+9*c.I,c.angle+2.2,-2,3*c.I+1,c.pal.spark[0],(1-u)**1.3,u*3.2);},
  slashes(g,c){for(let i=0;i<4;i++){const u=clamp(c.u*1.6-i*.1);if(u<=0)continue;const a=c.angle+(i%2?.9:-.6)+i*.25;
    crescent(g,c.x+(i-1.5)*4,c.y-26-(i%2)*6,14+8*c.I,a-1,1.9,2.6,i%2?c.pal.spark[1]:c.pal.glow,(1-u)**1.2,u*3.5);}},
  cleave(g,c){const u=c.u;crescent(g,c.x,c.y-22,24+12*c.I,c.angle-1.5,2.6,5*c.I+2,c.pal.glow,(1-u)**1.3*.95,u*3);
    crescent(g,c.x,c.y-22,23+12*c.I,c.angle-1.45,2.5,1.6,c.pal.core,(1-u)**1.2,u*3);},
  wave(g,c){const u=c.u;g.save();g.globalAlpha*=(1-u)**1.2;g.strokeStyle=c.pal.glow;g.lineWidth=2.4*c.I+.8;g.lineCap='round';
    g.beginPath();for(let i=0;i<=16;i++){const s=i/16,x=c.x-18+36*s,y=c.y-26+Math.sin(s*TAU*1.5+u*9)*6*(1-s*.4);i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();g.restore();},
  sweep(g,c){const u=c.u;crescent(g,c.x,c.y-12,22+10*c.I,Math.PI*.1,Math.PI*.9,4*c.I+1.5,c.pal.glow,(1-u)**1.3*.9,u*3);
    crescent(g,c.x,c.y-12,21+10*c.I,Math.PI*.12,Math.PI*.86,1.2,c.pal.core,(1-u)**1.2,u*3);},
  swirl(g,c){const u=c.u;g.save();g.globalAlpha*=(1-u)**1.2*.9;g.lineWidth=2.2;
    for(let k=0;k<2;k++){g.strokeStyle=k?'#e8e2cf':'#fff';g.beginPath();for(let i=0;i<=24;i++){const s=i/24,a=s*TAU*.9+u*5+k*Math.PI,r=(4+16*s)*(0.6+.5*easeOut(u))*c.I;
      const x=c.x+Math.cos(a)*r,y=c.y-24+Math.sin(a)*r*.6;i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}g.restore();},
  pin(g,c){const u=clamp(c.fu);if(u>=1)return;star(g,c.x,c.y-28,(10+10*c.I)*(1-u*.5),c.pal.core,(1-u)**1.4,u*.8);glow(g,c.x,c.y-28,12+8*c.I,c.pal.glow,(1-u)*.8*c.I);},
  pins(g,c){for(let i=0;i<3;i++){const u=clamp(c.fu*1.25+.05-i*.12);if(u<=0||u>=1)continue;const x=c.x+(i-1)*7,y=c.y-30+((i*37)%11-5);
    star(g,x,y,(9+8*c.I)*(1-u*.4),c.pal.core,(1-u)**1.2,i*.5);glow(g,x,y,10+6*c.I,c.pal.glow,(1-u)*.7);}},
  stars(g,c){const n=Math.round(3/c.spread)+1;for(let i=0;i<n;i++){const u=clamp(c.u*1.4-c.rand()*.3),a=c.rand()*TAU,d=(10+16*c.rand())*easeOut(u);
    star(g,c.x+Math.cos(a)*d,c.y-28+Math.sin(a)*d*.6-8*u,3+3*c.rand(),c.pal.spark[i%3],(1-u)**1.1,c.rand()*3);}},
  petals(g,c){const n=Math.round(6/c.spread)+2;for(let i=0;i<n;i++){const u=clamp(c.u*1.1-c.rand()*.2),a=c.rand()*TAU,d=(10+18*c.rand())*easeOut(u);
    g.save();g.globalAlpha*=(1-u)*.9;g.translate(c.x+Math.cos(a)*d,c.y-26+Math.sin(a)*d*.5+14*u*u);g.rotate(a+u*3);g.fillStyle=c.pal.spark[i%3];
    g.beginPath();g.ellipse(0,0,3.2,1.4,0,0,TAU);g.fill();g.restore();}},
  splat(g,c){const n=Math.round(8/c.spread)+3;for(let i=0;i<n;i++){const u=clamp(c.u*1.5),a=c.rand()*TAU,d=(6+18*c.rand())*easeOut(u);
    blob(g,c.x+Math.cos(a)*d,c.y-22+Math.sin(a)*d*.55+10*u*u,(2+4*c.rand())*(1-u*.3),c.pal.mist,(1-clamp(c.u))**.8*.85);}},
  debris(g,c){const n=Math.round(7/c.spread)+2;for(let i=0;i<n;i++){const a=-Math.PI*(.1+.8*c.rand()),sp=(18+22*c.rand())*c.I,u=clamp(c.u*1.2),d=sp*u;
    const x=c.x+Math.cos(a)*d,y=c.y-4+Math.sin(a)*d+40*u*u,s=1.6+2.4*c.rand();
    g.save();g.globalAlpha*=(1-u)**.8;g.fillStyle=c.pal.spark[1];g.fillRect(x-s/2,y-s/2,s,s);g.restore();}},
  embers(g,c){const n=Math.round((6+8*c.I)/c.spread)+2;for(let i=0;i<n;i++){const u=clamp(c.u*1.1-c.rand()*.2),x=c.x+(c.rand()-.5)*30*(0.4+u),y=c.y-20-u*(22+18*c.rand());
    glow(g,x,y,2.2+2*c.rand(),c.pal.spark[i%3],(1-u)**1.1);}},
  bolt(g,c){const u=clamp(c.u*1.8);if(u>=1)return;const flick=(Math.floor(c.u*14)%2)?.55:1;
    g.save();g.globalAlpha*=(1-u)**1.2*flick;g.lineCap='round';g.lineJoin='round';
    const pts=[[c.x+(c.rand()-.5)*10,c.y-150]];for(let i=1;i<=7;i++)pts.push([c.x+(c.rand()-.5)*(22-i*2.5),c.y-150+i*(124/7)]);
    for(const [w,col] of [[6*c.I+2,c.pal.glow],[1.8,c.pal.core]]){g.strokeStyle=col;g.lineWidth=w;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
    g.restore();glow(g,c.x,c.y-26,26*c.I,c.pal.glow,(1-u)*.7,c.pal.core);},
  stream(g,c){const n=Math.round(10/c.spread)+3,sx=c.sx??c.x,sy=(c.sy??c.y);
    for(let i=0;i<n;i++){const u=clamp(c.u*1.3-i/n*.6);if(u<=0||u>=1)continue;
      const mx=(c.x+sx)/2+(c.rand()-.5)*30,my=Math.min(c.y,sy)-40-20*c.rand(),q=1-u;
      const x=q*q*c.x+2*q*u*mx+u*u*sx,y=q*q*(c.y-26)+2*q*u*my+u*u*(sy-26);
      glow(g,x,y,3+2*c.rand(),c.pal.spark[i%3],Math.sin(Math.PI*u)*.95);}},
  implode(g,c){const u=clamp(c.u*1.2);ellipseRing(g,c.x,c.y-2,(30*c.I)*(1-easeOut(u))+3,c.pal.ring,2*(1-u)+.4,(1-u)*.9);},
};
const LINGER={
  motes(g,c){HIT.embers(g,{...c,rand:rng(c.seed+901)});},
  embers(g,c){HIT.embers(g,{...c,rand:rng(c.seed+902)});},
  mist(g,c){HIT.mist(g,{...c,u:.3+.7*c.u,rand:rng(c.seed+903)});},
  dust(g,c){HIT.dust(g,{...c,u:.25+.75*c.u,rand:rng(c.seed+904)});},
  decal(g,c){g.save();g.globalAlpha*=(1-c.u)**1.3*.38;g.fillStyle=c.pal.mist||c.pal.glow;g.beginPath();g.ellipse(c.x,c.y,14+10*c.I,(14+10*c.I)*.45,0,0,TAU);g.fill();g.restore();},
};

// Once per cast at the caster (and between caster and aim for beams).
export function paintVfxCast(g,v,pic,sx,sy,tx,ty,{reducedMotion=false,hand=null}={}){
  const t=phase(v,pic),r=vfxRecipe(v);if(t===null||![sx,sy,tx,ty].every(Number.isFinite))return false;
  const pal=PALETTE[r.pal],I=vfxIntensity(v),dx=tx-sx,dy=ty-sy,len=Math.hypot(dx,dy)||1;
  // Release point: the real striking hand when the caller measured it (vfx 394), else the old estimate.
  const hx=Number.isFinite(hand?.x)?hand.x:sx+dx/len*12,hy=Number.isFinite(hand?.y)?hand.y:sy+dy/len*6-28;
  g.save();
  const u=clamp(t/.16);
  if(u<1&&(r.hit.length||r.cast)){
    glow(g,hx,hy,(6+8*I)*(.6+.6*easeOut(u)),pal.glow,(1-u)**1.5*.7*I,pal.core);
    if(I>.78&&!reducedMotion)ellipseRing(g,sx,sy,(8+18*I)*easeOut(u),pal.ring,2*(1-u)+.3,(1-u)*.7);
    for(const part of r.cast||[]){
      if(part==='burst'&&!reducedMotion){const rand=rng(v.skill*131+7);for(let i=0;i<8;i++){const a=rand()*TAU,d=(8+10*rand())*easeOut(u);
        spark(g,hx+Math.cos(a)*d*.4,hy+Math.sin(a)*d*.3,hx+Math.cos(a)*d,hy+Math.sin(a)*d*.6,pal.spark[i%3],1.2,(1-u)*.9);}}
      if(part==='puff')blob(g,hx,hy,(8+8*I)*(.5+u),pal.mist||pal.glow,(1-u)*.5);
      if(part==='ripple')for(let i=0;i<2;i++){const w=clamp(u*1.4-i*.3);ellipseRing(g,hx,hy+6,(8+16*I)*easeOut(w),pal.ring,1.5*(1-w)+.3,(1-w)*.8);}
    }
  }
  if((r.cast||[]).includes('beam')){
    // A straight qi line from the hand to the aim; reveal, hold, then collapse into the impact.
    const b=clamp((t-.06)/.5);if(b>0&&b<1){const reach=reducedMotion?1:easeOut(b*1.8),ex=hx+(tx-hx)*reach,ey=hy+(ty-26-hy)*reach,a=(1-clamp((b-.55)/.45));
      g.save();g.lineCap='round';
      for(const [w,col,al] of [[7*I+2,pal.glow,.45],[2.4,pal.core,.95]]){g.globalAlpha=al*a;g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(hx,hy);g.lineTo(ex,ey);g.stroke();}
      g.restore();}
  }
  g.restore();return true;
}
// Every affected cell. `outcome` is the native result for the unit standing there (hit/critical/dodge).
const PEAK=new Set(['flash','rays','pin','pins']);
export function paintVfxImpact(g,v,pic,x,y,{outcome=null,cells=1,cellX=0,cellY=0,sx,sy,reducedMotion=false,occupied=true,layer='front'}={}){
  const t=phase(v,pic),r=vfxRecipe(v);if(t===null||![x,y].every(Number.isFinite))return false;
  if(t<VFX_HIT)return true;
  const pal=PALETTE[r.pal],I=vfxIntensity(v),seed=(v.skill*131+cellX*17+cellY*7919)>>>0;
  const angle=[-Math.PI/6,Math.PI/6,-5*Math.PI/6,5*Math.PI/6][v.direction]??0,spread=Math.max(1,Math.sqrt(cells));
  // fu: 0→1 over the first two native frames after the hit (the white peak).
  const fu=clamp((t-VFX_HIT)*Math.max(1,v.count-1)/2);
  const base={x,y,I,pal,angle,spread,crit:outcome==='critical',sx,sy,seed,flash:r.flash??1,fu};
  if(layer==='behind'){
    if(outcome==='dodge'||!occupied)return true;
    g.save();for(const part of r.hit)if(PEAK.has(part))HIT[part]?.(g,{...base,u:clamp((t-VFX_HIT)/.42),rand:rng(seed+part.length*977+part.charCodeAt(0))});
    g.restore();return true;
  }
  g.save();
  if(outcome==='dodge'){
    // The blow finds only air: a thin wind streak past the fighter, no burst, no shake.
    const u=clamp((t-VFX_HIT)/.3);spark(g,x-18+36*easeOut(u),y-34,x-6+36*easeOut(u),y-30,'#eef2ea',1.4,(1-u)*.8);
    g.restore();return true;
  }
  const u=clamp((t-VFX_HIT)/.42);
  if(!occupied){
    // 157: an empty cell inside the footprint only shows where the blow passed — one faint ground ripple.
    // vfx 394: a thin, plain (non-additive) ink ring, so it never reads as a selection marker; the hand-built
    // arts mark their own footprint (scorch, scrape) and skip it.
    if(u<1&&r.hit.length){g.save();g.globalAlpha*=clamp((1-u)**1.5*.28);g.strokeStyle=pal.mist||'#4a4a40';g.lineWidth=.8;
      g.beginPath();g.ellipse(x,y,(7+10*I)*easeOut(u),(7+10*I)*easeOut(u)*.5,0,0,TAU);g.stroke();g.restore();}
    g.restore();return true;
  }
  if(u<1)for(const part of r.hit){if(PEAK.has(part)||reducedMotion&&['sparks','shards','debris','bolt','stream'].includes(part))continue;
    HIT[part]?.(g,{...base,u,rand:rng(seed+part.length*977+part.charCodeAt(0))});}
  const w=clamp((t-.58)/.42);
  if(w>0&&!reducedMotion)for(const part of r.after||[])LINGER[part]?.(g,{...base,u:w});
  g.restore();return true;
}
// A struck fighter recoils away from the blow and flashes briefly (every fighter, not only the few with
// painted hurt poses). push is 0…1 of the recoil distance, flash 0…1 of an additive re-draw.
export function vfxHitReaction(v,pic,{crit=false,reducedMotion=false}={}){
  const t=phase(v,pic);if(t===null||t<VFX_HIT)return {push:0,flash:0};
  const u=clamp((t-VFX_HIT)/.3);if(u>=1)return {push:0,flash:0};
  // flash: the outline behind the struck body lasts exactly one native frame, ≤.35 (engine.js hitOutline).
  const f=(t-VFX_HIT)*Math.max(1,v.count-1);
  return {push:reducedMotion?0:Math.sin(Math.PI*u)*(1-u*.35)*(crit?1.6:1),flash:f<1?(crit?.35:.26):0};
}
// Whole-view shake, decaying after the hit. Never while reduced motion is requested.
export function vfxShake(v,pic,{reducedMotion=false,crit=false,cells=1}={}){
  const t=phase(v,pic),r=vfxRecipe(v);if(t===null||reducedMotion||t<VFX_HIT)return {x:0,y:0};
  const u=clamp((t-VFX_HIT)/.26);if(u>=1)return {x:0,y:0};
  const A=r.shake*vfxIntensity(v)*(crit?1.5:1)*Math.min(1.35,1+.06*(cells-1))*(1-u)**2;
  return {x:A*Math.sin(u*Math.PI*7),y:A*.55*Math.cos(u*Math.PI*5.5)};
}
