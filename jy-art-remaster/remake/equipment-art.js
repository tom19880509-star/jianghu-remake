import {paintHeroWeaponArt} from './hero-weapon-art.js';
import {provisionIcon} from './provision-art.js';
import {WEAPON_PIXELS} from './item-pixels.js';
import {itemPicture,hasItemArt,registerDrawnItem} from './item-art.js';
import {combatRaster} from './combat-art.js';
import {characterRaster,poseKey,characterFigure,drawResampled} from './character-atlas.js';

// Reuse the actual in-game actor, without mirroring asymmetric characters.
// clarity 394: the backing store follows devicePixelRatio (layout stays in the canvas's
// original attribute size); the figure comes from the higher-resolution bake of the same
// source cell once loaded, else the battle raster, and is resampled smoothly. It used to
// be the ~104 px raster enlarged 2.4x with nearest sampling, then CSS-pixelated again.
const figureBounds=new Map();
export function paintPaperDoll(canvas,head,weapon=-1) {
 if(!canvas.dataset.dollWidth){canvas.dataset.dollWidth=canvas.width;canvas.dataset.dollHeight=canvas.height;}
 const W=+canvas.dataset.dollWidth,H=+canvas.dataset.dollHeight,k=Math.min(3,Math.max(1,globalThis.devicePixelRatio||1));
 if(canvas.width!==Math.round(W*k)||canvas.height!==Math.round(H*k)){canvas.width=Math.round(W*k);canvas.height=Math.round(H*k);}
 const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(k,0,0,k,0,0);
 const id=head+':'+weapon;canvas.dataset.doll=id;
 if(paintHeroWeaponArt(canvas,head,weapon,W,H))return true;
 const fit=(sw,sh)=>{const scale=Math.min(190/sw,250/sh);return [(W-sw*scale)/2,H-sh*scale-22,sw*scale,sh*scale];};
 const hd=characterFigure(head,()=>{if(canvas.dataset.doll===id)paintPaperDoll(canvas,head,weapon);});
 if(hd){drawResampled(ctx,hd,0,0,hd.naturalWidth,hd.naturalHeight,...fit(hd.naturalWidth,hd.naturalHeight),k);return true;}
 const r=combatRaster({actor:head,direction:1,neutral:true})||characterRaster(poseKey({actor:head,direction:1,phase:0}));
 if(!r)return false;
 let [sx,sy,sw,sh]=r.frame;
 if(!figureBounds.has(head)){
  const scratch=document.createElement('canvas');scratch.width=sw;scratch.height=sh;const g=scratch.getContext('2d');g.drawImage(r.canvas,sx,sy,sw,sh,0,0,sw,sh);const pixels=g.getImageData(0,0,sw,sh).data;let x1=sw,y1=sh,x2=0,y2=0;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(pixels[(y*sw+x)*4+3]>24){x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y);}
  figureBounds.set(head,x1<=x2?[sx+x1,sy+y1,x2-x1+1,y2-y1+1]:[sx,sy,sw,sh]);
 }
 [sx,sy,sw,sh]=figureBounds.get(head);
 drawResampled(ctx,r.canvas,sx,sy,sw,sh,...fit(sw,sh),k);
 return true;
}
const paths={
 weapon:'M42 8L15 38l5 5L49 15l2-10z M12 35l12 12 M16 43L8 51 M6 49l5 5',
 offhand:'M42 8L15 38l5 5L49 15l2-10z M12 35l12 12 M16 43L8 51 M6 49l5 5',
 armor:'M20 9l-12 9 6 12 5-3-2 28h30l-2-28 5 3 6-12-12-9-6 7h-12z M26 10l6 11 6-11 M32 21v33 M20 37h25',
 boots:'M15 9h14l-1 28 13 7 2 8H10v-11l4-8z M34 10h13l-1 26 11 7 1 7H47 M15 18h14 M10 47h32',
 book:'M12 10h33l7 5v40H17l-5-5z M17 15h35 M17 15v40 M25 24h17 M25 31h17 M25 38h10 M12 10l5 5',
 internal:'M32 7a25 25 0 1 0 0 50a25 25 0 1 0 0-50 M32 7c-18 0-18 25 0 25s18 25 0 25 M32 16v2 M32 46v2',
};
// Existing icon system: cloth, leather and padded clothes keep distinct silhouettes.
const outfitIcons={
 budao:{color:'#637e88',trim:'#d4cba9',shape:'M22 8l-12 9 5 14 7-3-5 29h30l-5-29 7 3 5-14-12-9-10 7z',detail:'M22 8l15 19-13 10 M42 8L27 27 M23 31h19 M24 38l-2 15 M39 37l4 16'},
 duanda:{color:'#a67b48',trim:'#e3cd92',shape:'M23 10l-14 9 6 13 7-4-2 22h24l-2-22 7 4 6-13-14-9-9 8z',detail:'M23 10l13 17-12 13 M41 10L29 26 M21 39h22 M32 40l8 10'},
 paddedrobe:{color:'#687b62',trim:'#dfcfa8',shape:'M23 8L9 17l4 17 7-3-3 26h30l-3-26 7 3 4-17-14-9-9 8z',detail:'M23 8l13 16-9 12v21 M41 8L30 23 M20 40h24 M21 47h21 M22 52h21 M14 22l5 2 M45 24l6-2'},
 leathercoat:{color:'#795348',trim:'#c69b6e',shape:'M23 9l-12 9 5 13 7-4-3 26h24l-3-26 7 4 5-13-12-9-9 8z',detail:'M23 9l9 17 9-17 M24 26h16 M23 34h18 M22 42h20 M28 27v14 M36 27v14 M25 49h5 M35 49h5'},
 clothboots:{color:'#647587',trim:'#d1c4a4',shape:'M15 28h15v12l10 5 1 8H9v-9l5-7z M36 24h14v13l9 6v7H44l-2-7-7-4z',detail:'M15 30h14 M11 47h25 M9 53h32 M37 27h12 M46 46h12'},
 leatherboots:{color:'#966342',trim:'#dac299',shape:paths.boots,detail:'M16 19l10 5-11 4 11 5 M36 19l9 5-9 4 9 5 M12 47h27 M48 45h8'},
 travelboots:{color:'#5c5d4c',trim:'#cab381',shape:'M15 13h14l-1 25 13 7 1 10H9V43l5-10z M35 13h13l-1 23 10 8v9H46l-3-10-8-4z',detail:'M15 20h13 M15 28h13 M10 49h30 M9 55h33 M36 20h11 M36 28h11 M47 49h10'},
};
// 墨韵纸本（2026-09-27）：原版没有图的物品登记画法，由 item-art 做成与原图同格的像素图。
// 兵器（入队兵器、NPC 兵器、铁笔）在 40 格上逐像素画（item-pixels.js）；衣履与客栈吃食用下面的 SVG 造型压成像素。
// 只登记，不在此处碰 DOM。
for (const id of Object.keys(WEAPON_PIXELS).map(Number)) registerDrawnItem(id, {pixels: WEAPON_PIXELS[id]});
// 物品图专用的衣履造型：长袍有长身宽袖、交领与腰带；短打短身窄袖束腰；软革劲装合身、胸前系带。
const OUTFIT_ART = {
 budao:{color:'#6f8a92',trim:'#e4dcc0',sash:'#3e5a62',shape:'M24 6l-13 7-5 18 7 2 4-9 1 36h28l1-36 4 9 7-2-5-18-13-7-8 6z',detail:'M24 6l8 14 8-14 M32 20v40 M18 34h28'},
 duanda:{color:'#a67b48',trim:'#e3cd92',sash:'#6b4a2a',shape:'M24 12l-10 6 3 13 5-2v21h20V29l5 2 3-13-10-6-8 7z',detail:'M24 12l8 11 8-11 M32 23v27 M22 36h20'},
 paddedrobe:{color:'#687b62',trim:'#dfcfa8',sash:'#44533f',shape:'M23 6L9 14 4 33l8 2 4-9 1 34h30l1-34 4 9 8-2-5-19-14-8-9 7z',detail:'M23 6l9 13 9-13 M32 19v41 M17 30h30 M18 38h28 M18 46h28 M18 54h28'},
 leathercoat:{color:'#7d5646',trim:'#c69b6e',sash:'#4d3329',shape:'M24 10l-10 5 2 13 5-2-1 26h24l-1-26 5 2 2-13-10-5-8 6z',detail:'M24 10l8 10 8-10 M32 20v32 M27 26l10 4 M27 32l10 4 M27 38l10 4'},
 clothboots:{...outfitIcons.clothboots, color:'#4d6178', trim:'#e0d6bc'}, leatherboots:outfitIcons.leatherboots, travelboots:outfitIcons.travelboots,
};
for (const [key, o] of Object.entries(OUTFIT_ART)) {
 const sash = o.sash ? `<path d="M${key==='duanda'?'22 36h20':key==='leathercoat'?'21 44h22':'17 36h30'}" stroke="${o.sash}" stroke-width="4" fill="none"/>` : '';
 // 各件按实际身长给格：长袍 31、软革劲装 27、短打 23、鞋 26（布履原来太小像石块）。
 registerDrawnItem('outfit:' + key, {box: {budao: 31, paddedrobe: 31, leathercoat: 27, duanda: 23}[key] ?? 26, svg: () =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g stroke-linecap="round" stroke-linejoin="round"><path d="${o.shape}" fill="${o.color}" stroke="#534b36" stroke-width="1.6"/><path d="${o.detail}" fill="none" stroke="${o.trim}" stroke-width="1.7"/>${sash}</g></svg>`});
}
// 客栈吃食：馒头不画热气（压成像素后像两根触须），粥碗照旧。
registerDrawnItem(401, {box: 24, svg: () => '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><g stroke="#594b39" stroke-width="1.4" stroke-linejoin="round"><ellipse cx="48" cy="76" rx="36" ry="10" fill="#9b744c"/><path d="M19 65c-4-21 12-39 29-39 23 0 33 24 29 39-4 18-54 18-58 0z" fill="#efdfb9"/><path d="M34 34q3 5 4 14m10-20v16m11-10l-4 12" fill="none" stroke="#cfb785"/></g></svg>'});
registerDrawnItem(402, {box: 24, svg: () => { const n = provisionIcon(402); n.setAttribute('width', '96'); n.setAttribute('height', '96'); return new XMLSerializer().serializeToString(n); }});
export function gearIcon(kind,id) {
 // 物品一律走 item-art：原版图去底、新物品压像素。武功没有秘籍时 artId 为 0，画秘籍线描，不再误用 0 号醉生梦死酒。
 if (!(id === 0 && kind === 'book') && hasItemArt(id)) return itemPicture(id, 40, {className: 'gear-icon item-art'});
 const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 64 64');s.setAttribute('aria-hidden','true');s.classList.add('gear-icon');
 const path=document.createElementNS(s.namespaceURI,'path');path.setAttribute('d',paths[kind]||paths.book);path.setAttribute('fill','#c4ae7330');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','2.2');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');s.append(path);return s;
}
export const ARMOR_LORE={
 120:'桃花岛的护身宝甲，细密软甲中藏有倒刺。黄蓉曾凭它抵挡利刃，却仍受过高手掌力所伤。当前装备效果以面板为准。',
 121:'金丝编织的贴身护衣，可藏于外袍之下。轻巧贴体，随身护住要害。',
 122:'乌蚕丝织成的护衣，外表柔薄，却坚韧难断。穿在衣内，仍可行动自如。',
 123:'以厚实鳄皮制成的护甲，朴实耐用。行走江湖，可作寻得宝甲前的护身之物。',
};
