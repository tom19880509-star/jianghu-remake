// Equipment-screen illustrations only. Battle bodies and weapons stay separate.
export const HERO_WEAPON_ART=Object.freeze({
  110:'hero-gold-snake-v2.png',106:'hero-heavy-sword-v1.png',115:'hero-blood-saber-v1.png',
});
const pictures=new Map();
export const heroWeaponArtFile=(head,item)=>head===0?HERO_WEAPON_ART[item]||null:null;
export async function loadHeroWeaponArt(){
  await Promise.all(Object.values(HERO_WEAPON_ART).map(async file=>{
    if(pictures.has(file))return;
    const im=new Image();im.src='assets/'+file;
    try{await im.decode();pictures.set(file,im);}catch{/* Standard figure remains available. */}
  }));
}
// clarity 394: width/height are the layout size when the caller has scaled the context for
// devicePixelRatio; 'high' asks for a filtered (mipmapped) reduction of the 1024x1536 art.
export function paintHeroWeaponArt(canvas,head,item,width=canvas.width,height=canvas.height){
  const im=pictures.get(heroWeaponArtFile(head,item));if(!im)return false;
  const g=canvas.getContext('2d'),scale=Math.min((width-12)/im.width,(height-12)/im.height);
  g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  g.drawImage(im,(width-im.width*scale)/2,height-im.height*scale-6,im.width*scale,im.height*scale);
  g.restore();return true;
}
