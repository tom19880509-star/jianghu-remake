// Original generated PNGs are kept intact. Crop coordinates only select atlas
// cells when painting; they do not regenerate or flatten the alpha artwork.
const sheets = new Map();
const pending = new Map();
const atlases = ['core', 'sword', 'elemental', 'elements', 'streams', 'martial'];
// Bounds measured from the alpha channel, with a small transparent margin.
const regions = {
  frost:["elements", 90, 130, 460, 438],
  toxin:["elements", 701, 161, 494, 420],
  solar:["elements", 81, 710, 493, 468],
  empty:["elements", 700, 745, 481, 423],
  snake:["streams", 97, 171, 510, 380],
  ink:["streams", 711, 137, 439, 427],
  sound:["streams", 105, 745, 480, 401],
  drain:["streams", 712, 760, 460, 376],
  impact:["martial", 92, 110, 457, 437],
  thunder:["martial", 696, 141, 450, 439],
  stars:["martial", 128, 727, 426, 420],
  claw:["martial", 703, 725, 464, 421],
  taijiFloor:['core',55,57,542,531],
  taiji:['core',655,47,577,560],
  heavy:['core',39,682,580,509],
  sorrow:['core',646,651,590,569],
  dugu:['sword',25,196,602,326],
  jadePair:['sword',654,99,593,463],
  bixie:['sword',13,678,614,489],
  staff:['sword',637,668,611,515],
  dragon:['elemental',87,236,536,282],
  blood:['elemental',751,163,437,403],
  meridian:['elemental',59,862,527,212],
  flame:['elemental',686,846,524,216],
};
export async function loadSignatureArt(){
  return Promise.all(atlases.map(name=>{
    if(sheets.has(name))return true;
    if(pending.has(name))return pending.get(name);
    const task=(async()=>{
      try{
        const im=new Image();im.src=`assets/signature-${name}-${['core','sword','elemental'].includes(name)?'v3':'v4'}.png`;
        await im.decode();sheets.set(name,im);return true;
      }catch{return false;}finally{pending.delete(name);}
    })();
    pending.set(name,task);return task;
  }));
}
// Height / width of a painted cell. Callers size by ONE side and derive the other
// from this, so a painted motif is never stretched (vfx 394: the old fixed boxes
// squeezed or stretched every motif by 0.69×–1.78×).
export const textureAspect=name=>{const r=regions[name];return r?r[4]/r[3]:1;};
export function paintSignatureTexture(g,name,x,y,width,height){
  const r=regions[name],im=r&&sheets.get(r[0]);
  if(!im)return false;
  g.save();g.imageSmoothingEnabled=true;
  g.drawImage(im,r[1],r[2],r[3],r[4],x,y,width,height);
  g.restore();return true;
}

// ---- Brush primitives (vfx 394) -------------------------------------------------------------
// Hand-built qi strokes for the redrawn signature arts: tapered ribbons, dry-brush hairs and
// hard-edged chips in flat value layers (edge → mid → core). No textures are scaled, nothing is
// additive, and every stroke is a pure function of its inputs and seed, so paused frames repeat.
export function seeded(seed){
  let s=(seed>>>0)||1;
  return()=>{s=(s+0x6D2B79F5)>>>0;let r=Math.imul(s^s>>>15,1|s);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296;};
}
const clamp01=x=>x<0?0:x>1?1:x;
// Cubic Bézier sampled to a polyline.
export function bezier(p0,p1,p2,p3,n=18){
  const out=[];
  for(let i=0;i<=n;i++){const s=i/n,q=1-s,a=q*q*q,b=3*q*q*s,c=3*q*s*s,d=s*s*s;
    out.push([a*p0[0]+b*p1[0]+c*p2[0]+d*p3[0],a*p0[1]+b*p1[1]+c*p2[1]+d*p3[1]]);}
  return out;
}
// Ellipse arc on screen (rx, ry) from angle a0 to a1.
export function arcPoints(cx,cy,rx,ry,a0,a1,n=18){
  const out=[];for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;out.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]);}return out;
}
function lengths(pts){const L=[0];for(let i=1;i<pts.length;i++)L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));return L;}
export function pathLength(pts){const L=lengths(pts);return L[L.length-1];}
// Point and unit tangent at arc-length fraction s.
export function pointAt(pts,s){
  const L=lengths(pts),total=L[L.length-1]||1,d=clamp01(s)*total;
  let i=1;while(i<pts.length-1&&L[i]<d)i++;
  const a=pts[i-1],b=pts[i],seg=(L[i]-L[i-1])||1,u=(d-L[i-1])/seg;
  const tx=(b[0]-a[0])/seg,ty=(b[1]-a[1])/seg;
  return {x:a[0]+(b[0]-a[0])*u,y:a[1]+(b[1]-a[1])*u,tx,ty};
}
// Sub-polyline between arc-length fractions a < b (resampled to n segments).
export function slice(pts,a,b,n=16){
  a=clamp01(a);b=clamp01(b);if(b<=a)return [];
  const out=[];for(let i=0;i<=n;i++){const p=pointAt(pts,a+(b-a)*i/n);out.push([p.x,p.y]);}return out;
}
// Displace a polyline sideways by f(s) (screen px), e.g. a serpentine wobble.
export function wobble(pts,f){
  const L=lengths(pts),total=L[L.length-1]||1;
  return pts.map((p,i)=>{
    const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||1;
    const k=f(L[i]/total);return [p[0]-dy/d*k,p[1]+dx/d*k];
  });
}
function edges(pts,hw,rough,seed){
  const L=lengths(pts),total=L[L.length-1]||1,rnd=rough?seeded(seed):null,left=[],right=[];
  for(let i=0;i<pts.length;i++){
    const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];
    let dx=b[0]-a[0],dy=b[1]-a[1];const d=Math.hypot(dx,dy)||1;dx/=d;dy/=d;
    const s=L[i]/total,w=Math.max(0,hw(s,i));
    const kl=rnd?1+rough*(rnd()-.5)*2:1,kr=rnd?1+rough*(rnd()-.5)*2:1;
    left.push([pts[i][0]-dy*w*kl,pts[i][1]+dx*w*kl]);right.push([pts[i][0]+dy*w*kr,pts[i][1]-dx*w*kr]);
  }
  return {left,right};
}
// Tapered brush ribbon. hw(s) is the half width at arc-length fraction s; rough>0 frays the
// edges like a loaded brush dragged on paper.
export function ribbon(g,pts,hw,{color='#fff',alpha=1,rough=0,seed=1}={}){
  if(!pts||pts.length<2||!(alpha>.005))return;
  const {left,right}=edges(pts,hw,rough,seed);
  g.save();g.globalAlpha*=clamp01(alpha);g.fillStyle=color;g.beginPath();
  g.moveTo(left[0][0],left[0][1]);for(let i=1;i<left.length;i++)g.lineTo(left[i][0],left[i][1]);
  for(let i=right.length-1;i>=0;i--)g.lineTo(right[i][0],right[i][1]);
  g.closePath();g.fill();g.restore();
}
// Dry-brush hairs: n thin strands spread across the ribbon width, each broken at seeded points.
// keep = fraction of each strand that stays inked (lower = drier, more broken).
export function fibers(g,pts,hw,{color='#fff',alpha=1,n=4,width=.6,seed=1,keep=.8,from=0,to=1}={}){
  if(!pts||pts.length<2||!(alpha>.005)||n<1)return;
  const rnd=seeded(seed);
  g.save();g.globalAlpha*=clamp01(alpha);g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';
  for(let k=0;k<n;k++){
    const off=n===1?0:(k/(n-1))*2-1,a=from+(to-from)*rnd()*(1-keep)*.6,b=to-(to-from)*rnd()*(1-keep)*.8;
    const sub=slice(pts,a,b,12);if(sub.length<2)continue;
    const span=b-a,{left}=edges(sub,s=>hw(a+span*s)*off,0,0);
    // A gap in the middle of a hair reads as dry brush.
    const gap=rnd()<1-keep?Math.floor(3+rnd()*6):-1;
    g.beginPath();g.moveTo(left[0][0],left[0][1]);
    for(let i=1;i<left.length;i++){if(i===gap||i===gap+1)g.moveTo(left[i][0],left[i][1]);else g.lineTo(left[i][0],left[i][1]);}
    g.stroke();
  }
  g.restore();
}
// Hard-edged chip / shard (rock, paper ash, blood drop), centre snapped to the art pixel grid
// (the battle figures are painted at two texels per logical pixel).
export const snap=v=>Math.round(v*2)/2;
export function chip(g,x,y,size,rot,color,alpha=1,sides=4){
  if(!(alpha>.01&&size>.2))return;
  x=snap(x);y=snap(y);
  g.save();g.globalAlpha*=clamp01(alpha);g.fillStyle=color;g.beginPath();
  for(let i=0;i<sides;i++){const a=rot+i*Math.PI*2/sides,r=size*(i%2?.62:1);
    i?g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r*.8):g.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r*.8);}
  g.closePath();g.fill();g.restore();
}
// Flat filled ellipse (ground decal / dust) — solid value, no gradient halo.
export function blot(g,x,y,rx,ry,color,alpha=1){
  if(!(alpha>.01&&rx>.2&&ry>.1))return;
  g.save();g.globalAlpha*=clamp01(alpha);g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();g.restore();
}
// Hard-edged starburst (impact peak). Points alternate long/short; drawn as one flat shape.
export function burst(g,x,y,r,color,alpha=1,{points=8,inner=.35,rot=0,squash=.8,seed=0}={}){
  if(!(alpha>.01&&r>.3))return;
  const rnd=seed?seeded(seed):null;
  g.save();g.globalAlpha*=clamp01(alpha);g.fillStyle=color;g.beginPath();
  for(let i=0;i<points*2;i++){const a=rot+i*Math.PI/points,rr=(i%2?r*inner:r*(rnd?.7+.5*rnd():1));
    const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr*squash;i?g.lineTo(px,py):g.moveTo(px,py);}
  g.closePath();g.fill();g.restore();
}

// ---- Brush-stroke renderer (vfx 394 final art round) ----------------------------------------
// One stroke = a path (TAIL first, HEAD last) with a half-width profile hw(s). It is painted as many thin
// bristles with jittered offsets, lengths and alpha: overlapping and solid near the head, separating into
// streaks and breaking up toward the tail (dry brush). Across the stroke a colour ramp runs from a 1 px hot
// edge (lead side) through the body colour to a darker same-hue ink on the trailing side — that ink is the
// value contrast. No outline, no closed shape, no flat fill. Pure function of its inputs and seed.
const hexRGB=c=>{c=String(c).replace('#','');if(c.length===3)c=[...c].map(x=>x+x).join('');return [0,2,4].map(i=>parseInt(c.slice(i,i+2),16)||0);};
export const mix=(a,b,t)=>{const A=hexRGB(a),B=hexRGB(b);return '#'+A.map((v,i)=>Math.max(0,Math.min(255,Math.round(v+(B[i]-v)*t))).toString(16).padStart(2,'0')).join('');};
export const tone=(body,ink)=>({edge:mix(body,'#ffffff',.7),body,ink:ink??mix(body,'#0a0806',.6)});
const ramp01=x=>x<0?0:x>1?1:x;
export function brush(g,pts,hw,{colors,alpha=1,seed=1,n=null,dry=.45,fade=0,lead='up',overlap=1.9,tailAlpha=.3,range=null,edgeShare=.1,inkShare=.36}={}){
  if(!pts||pts.length<2||!(alpha>.01))return;
  const C=colors||tone('#888888'),L=lengths(pts),total=L[L.length-1]||0;if(total<.3)return;
  const M=Math.max(8,Math.min(42,Math.round(total/1.3))),S=[];
  for(let i=0;i<=M;i++){const p=pointAt(pts,i/M);let nx=-p.ty,ny=p.tx;
    if(lead==='up'?ny>0||(ny===0&&nx>0):lead==='down'?ny<0||(ny===0&&nx<0):Array.isArray(lead)?nx*lead[0]+ny*lead[1]<0:false){nx=-nx;ny=-ny;}
    S.push({x:p.x,y:p.y,nx,ny});}
  const G=s=>range?range[0]+(range[1]-range[0])*s:s;
  let wmax=0;for(let i=0;i<=M;i++)wmax=Math.max(wmax,hw(G(i/M)));if(!(wmax>.05))return;
  const N=n??Math.max(4,Math.min(16,Math.round(wmax*2.4))),rnd=seeded(seed);
  const aAt=(s,k)=>alpha*(tailAlpha+(1-tailAlpha)*Math.pow(s,.75))*(1-fade*.65)*k;
  g.save();g.globalAlpha=1;
  for(let k=0;k<N;k++){
    const o=-1+2*(k+.5)/N+(rnd()-.5)*1.1/N,edge=o>1-2*edgeShare,inkSide=o<-1+2*inkShare;
    const col=edge?C.edge:inkSide?(rnd()<.25?C.body:C.ink):(rnd()<.1?mix(C.body,C.edge,.3):rnd()<.18?mix(C.body,C.ink,.3):C.body);
    const rgb=hexRGB(col).join(','),ak=1;
    const outer=Math.abs(o)>.7;
    const start=ramp01(rnd()*dry*.5+fade*(.35+.65*rnd())+(outer?rnd()*.15:0)),end=1-(outer?rnd()*.12:0);
    const ph=rnd()*6.283,fq=2.2+rnd()*3.4,ph2=rnd()*6.283,wob=(rnd()-.5)*.5,wk=.65+.7*rnd(),fq2=4+rnd()*6;
    const thr=s=>dry*.95*Math.pow(1-s,1.4)+fade*.6*(1-s*.5);
    let run=[];
    const flush=()=>{
      if(run.length>1){const A0=run[0],A1=run[run.length-1],a0=aAt(A0.s,ak),a1=aAt(A1.s,ak);
        if(Math.max(a0,a1)>.01){
          const gr=g.createLinearGradient?.((A0.lx+A0.rx)/2,(A0.ly+A0.ry)/2,(A1.lx+A1.rx)/2,(A1.ly+A1.ry)/2);
          if(gr?.addColorStop){gr.addColorStop(0,`rgba(${rgb},${Math.min(1,a0)})`);gr.addColorStop(1,`rgba(${rgb},${Math.min(1,a1)})`);g.fillStyle=gr;g.globalAlpha=1;}
          else{g.fillStyle=col;g.globalAlpha=Math.min(1,(a0+a1)/2);}
          g.beginPath();run.forEach((r,i)=>i?g.lineTo(r.lx,r.ly):g.moveTo(r.lx,r.ly));for(let i=run.length-1;i>=0;i--)g.lineTo(run[i].rx,run[i].ry);g.closePath();g.fill();}}
      run=[];};
    for(let i=0;i<=M;i++){
      const s=i/M,sg=G(s);
      const on=s>=start&&s<=end&&(.5+.5*Math.sin(fq*s*6.283+ph)*Math.cos(fq*.6*s*6.283+ph2))>=thr(s);
      if(!on){flush();continue;}
      const h=hw(sg);if(!(h>.02)){flush();continue;}
      // lateral wander and width breathing make the hairs cross and part like a real brush
      const off=(o+wob*Math.sin(s*fq2+ph2)*(1-.5*s))*h,bw=Math.max(.16,h/N*wk*(.55+(overlap-.55)*Math.pow(s,.6))*(.8+.35*Math.sin(s*fq2*1.3+ph)));
      const q=S[i];run.push({s,lx:q.x+q.nx*(off+bw),ly:q.y+q.ny*(off+bw),rx:q.x+q.nx*(off-bw),ry:q.y+q.ny*(off-bw)});
    }
    flush();
  }
  g.restore();
}
// Short dabs (dust, scorch, ink pool): a few dry horizontal strokes — never a flat ellipse.
export function dab(g,x,y,rx,ry,colors,alpha=1,seed=1,{count=4}={}){
  if(!(alpha>.01&&rx>.3))return;const rnd=seeded(seed);
  for(let i=0;i<count;i++){const yy=y+(rnd()-.5)*ry*1.6,w=rx*(.6+.5*rnd()),xx=x+(rnd()-.5)*rx*.5;
    brush(g,[[xx-w,yy+(rnd()-.5)*ry*.4],[xx+w,yy]],s=>ry*.55*Math.sin(Math.PI*Math.min(1,s*.9+.05))+.2,{colors,alpha,seed:seed*7+i,dry:.55,tailAlpha:.45,n:5});}
}
// Supersampled layer: everything drawn by fn lands in an offscreen canvas at ~3 device px per logical px
// covering the logical rectangle [x0,y0,x1,y1], then is downsampled onto g with smoothing, so the brush
// bristles sit inside the pixel art instead of aliasing. Falls back to drawing directly (tests, no DOM).
let layerCanvas=null;
export function brushLayer(g,[x0,y0,x1,y1],fn){
  const m=g.getTransform?.(),doc=globalThis.document;
  if(!m||!doc?.createElement||![m.a,m.b,m.c,m.d,m.e,m.f].every(Number.isFinite)||!g.drawImage){fn(g);return;}
  const xs=[],ys=[];for(const [x,y] of [[x0,y0],[x1,y0],[x0,y1],[x1,y1]]){xs.push(m.a*x+m.c*y+m.e);ys.push(m.b*x+m.d*y+m.f);}
  const bx=Math.floor(Math.min(...xs)),by=Math.floor(Math.min(...ys)),bw=Math.ceil(Math.max(...xs))-bx,bh=Math.ceil(Math.max(...ys))-by;
  const dev=Math.hypot(m.a,m.b)||1,k=Math.max(1,Math.min(2.5,3/dev));
  const W=Math.ceil(bw*k),H=Math.ceil(bh*k);if(!(W>0&&H>0)||W*H>9e6){fn(g);return;}
  layerCanvas||=doc.createElement('canvas');
  if(layerCanvas.width<W)layerCanvas.width=W;if(layerCanvas.height<H)layerCanvas.height=H;
  const t=layerCanvas.getContext('2d');if(!t){fn(g);return;}
  t.setTransform(1,0,0,1,0,0);t.globalAlpha=1;t.globalCompositeOperation='source-over';t.clearRect(0,0,W,H);
  t.setTransform(k*m.a,k*m.b,k*m.c,k*m.d,k*(m.e-bx),k*(m.f-by));t.imageSmoothingEnabled=true;
  fn(t);
  g.save();g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  g.drawImage(layerCanvas,0,0,W,H,bx,by,bw,bh);g.restore();
}
