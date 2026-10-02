// Compact display rasters baked from approved source artwork; source PNGs stay intact.
import manifest from './character-atlas.json';
const pages = new Map();
export const poseKey = p => ['pose',p.actor??0,p.direction,p.phase??0,...['walk','hurt','care','taixuan','stance','heroIdle','npc'].map(k=>+!!p[k])].join(':');
export async function loadCharacterAtlas() {
 await Promise.all(manifest.pages.map(async (file,i)=>{const im=new Image();im.src='assets/'+file+(manifest.versions?.[i]?'?v='+manifest.versions[i]:'');await im.decode();pages.set(file,im);}));
}
export function characterRaster(key) {
 const row=manifest.frames[key];if(!row)return null;
 const [page,sx,sy,w,h,ax,ay,scale]=row,canvas=pages.get(manifest.pages[page]);
 return canvas?{canvas,frame:[sx,sy,w,h,ax,ay],scale}:null;
}
export const hasCharacterAtlas=()=>pages.size>0;
// clarity 394: status-page figures (manifest.figures, baked by bakeClarityFigures from the
// same source cell as the standing south-east pose). Loaded on first request only; until
// then callers draw the atlas raster and get `onload` once to repaint.
const figures=new Map();
export function characterFigure(head,onload){
 const row=manifest.figures?.[head];if(!row)return null;
 let f=figures.get(head);
 if(!f){
  const im=new Image();f={im,ready:false,failed:false,waiters:[]};figures.set(head,f);
  im.onload=()=>{f.ready=im.naturalWidth>0;for(const w of f.waiters.splice(0))w();};
  im.onerror=()=>{f.failed=true;f.waiters.length=0;};
  im.src='assets/'+row[0]+'?v='+row[1];
 }
 if(f.ready)return f.im;
 if(onload&&!f.failed&&!f.waiters.includes(onload))f.waiters.push(onload);
 return null;
}
export const characterArtStats=()=>({pages:pages.size,frames:Object.keys(manifest.frames).length,bytes:manifest.bytes||0,heads:manifest.heads||[]});
// clarity 394: painted art reduced by more than half is pre-filtered by successive
// halvings (each one an exact 2×2 average under bilinear sampling), so no browser
// skips source pixels the way a single nearest/bilinear draw at 0.06–0.4× does.
// The source rectangle always maps onto the full destination rectangle: geometry,
// anchors and foot lines are unchanged; only the sampling changes.
export function drawResampled(g,src,sx,sy,sw,sh,dx,dy,dw,dh,k=1){
 let s=src,x=sx,y=sy,w=sw,h=sh;const tw=Math.abs(dw*k),th=Math.abs(dh*k);
 while(w>=tw*2&&h>=th*2&&w>=4&&h>=4){
  const c=document.createElement('canvas');c.width=Math.ceil(w/2);c.height=Math.ceil(h/2);
  const cg=c.getContext('2d');cg.imageSmoothingEnabled=true;cg.imageSmoothingQuality='high';
  cg.drawImage(s,x,y,w,h,0,0,c.width,c.height);s=c;x=0;y=0;w=c.width;h=c.height;
 }
 const on=g.imageSmoothingEnabled,q=g.imageSmoothingQuality;
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(s,x,y,w,h,dx,dy,dw,dh);
 g.imageSmoothingEnabled=on;g.imageSmoothingQuality=q;
}
// Per-frame draws of a full source sheet at scale < .5 reuse one reduced copy at the
// atlas convention (2 raster px per logical px); callers draw it into the same rect.
const reducedCopies=new WeakMap();
export function reducedSource(im,sx,sy,sw,sh,scale){
 if(!(scale<.5)||!im)return null;
 let rows=reducedCopies.get(im);if(!rows)reducedCopies.set(im,rows=new Map());
 const key=[sx,sy,sw,sh,scale].join(',');let c=rows.get(key);
 if(!c){c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(sw*scale*2));c.height=Math.max(1,Math.ceil(sh*scale*2));drawResampled(c.getContext('2d'),im,sx,sy,sw,sh,0,0,c.width,c.height);rows.set(key,c);}
 return c;
}
