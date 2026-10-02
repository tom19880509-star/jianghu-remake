import {drawWeaponModel,weaponModel} from './weapon-models.js';
import {heroGait} from './hero-walk.js';
import {paintBladeFire} from './flame-blade.js';
// Grips belong to BODY poses in normalized 192x144 space. Changing a blade
// definition never changes these points or the character/contact clock.
//
// 156B, R1 settled against weapon-models.js: a grip point is the FIST CENTRE,
// not the guard. drawWeaponModel puts the guard at +3..+7 and runs the handle
// back to the family's butt (-12 for sword/blade/heavy/snake/brush, -10 whip,
// -13 hoe, -14 shears, -0.38*length for staff); its gripGap clip keeps |x|<=4
// clear for fingers, and sprites.js repaints an 8x8 patch of the body centred
// on exactly this point. So the test for "does the hand hold it" is the ink in
// that 8-unit window, never the pommel ten units behind it.
//
// Measured against the body sheets on that definition, the two left-facing
// columns were mirrored from the right-facing ones (they sit within a few units
// of the reflection about x=96) although the NW/SW body art is drawn
// independently and does not mirror. Their fists therefore sat 6 to 14 units
// ahead of the drawn hand, worst on 0-sword SW where beats 0 and 3 held nothing
// at all. Each corrected column is shifted as ONE rigid slide along the blade
// axis, so every frame-to-frame motion inside a column is untouched: only the
// whole weapon moves back into the hand.
const strikes=[
 [[121,83,.51],[120,71,-.54],[139,59,-.29],[141,58,-.29]],
 // motion394: SE beat 3 centred on the extended fist (was 141,69, its lower-right rim).
 [[81,78,.43],[112,70,-.51],[123,71,-.20],[139,65,-.05]],
 // NW: column slid -6 along the shaft (was 74,84 / 76,74 / 56,58 / 49,53).
 [[79,81,2.64],[81,77,-2.54],[62,60,-2.83],[55,55,-2.88]],
 // SW: column slid -14 along the shaft (was 79,82 / 76,75 / 56,65 / 49,66).
 // motion394: beats 0 and 1 re-aimed at the drawn fist instead (was 91,75 /
 // 88,82). The slid points sat on the chest between the two guard fists and
 // 12 units under the clasped hands; angles are unchanged.
 [[99,82,2.63],[80,66,-2.60],[70,68,-2.95],[63,67,-3.04]],
];
// The ordinary/light sword-and-sabre body uses the hero's one-hand strike
// sheet. The free hand stays in guard instead of closing over the hilt.
const lightStrikes=[
 [[116,59,.54],[117,61,-.59],[137,53,-.30],[142,54,-.30]],
 [[116,66,.52],[117,68,-.43],[132,65,-.22],[140,65,-.07]],
 [[77,65,2.64],[79,65,-2.55],[58,52,-2.84],[51,50,-2.88]],
 // motion394: beats 2/3 centred on the extended fist (was 62,65 / 48,65,
 // which put the grip ahead of the knuckles).
 [[77,67,2.60],[77,66,2.48],[65,65,-2.95],[53,63,-3.04]],
];
// Ready and draw/stow: body-only versions of the five existing handling poses.
// motion394: the draw/stow in-between frames 1-3 sat 5-9px off the drawn hand
// (empty air beside the hip, the chest under a raised fist, the belt under
// the crossed hands). They now aim at the fist that the body sheet actually
// draws in each frame; angles are unchanged.
// Was NE 120,79 / 119,76 · SE 98,89 / 97,90 · NW 78,84 / 79,83 / 75,88 · SW 86,89 / 86,89 / 84,86.
const handling=[
 [[110,81,.57],[108,74,-2.35],[119,66,-1.48],[120,85,.57],[118,85,.57]],
 [[83,87,.52],[107,82,.75],[107,82,.47],[111,87,.54],[111,85,.54]],
 [[78,88,2.57],[77,69,-.75],[74,65,-1.66],[75,84,2.57],[73,88,2.57]],
 // SW: column slid -5 along the shaft (was 78,91 / 82,93 / 82,92 / 80,89 / 80,88).
 [[82,88,2.55],[83,79,2.35],[83,79,2.50],[74,85,2.55],[84,85,2.55]],
];
export function heroWeaponPlacement(pose){
 if(pose.actor!==0)return null;
 const d=pose.direction;
 if(!Number.isInteger(d)||d<0||d>3)return null;
 const carried=pose.carriedWeapon,held=pose.heldWeapon;
 if(!weaponModel(carried)&&!weaponModel(held))return null;
 const stowed=pose.handFrame===0||pose.handFrame===undefined&&!(pose.weaponAttack??false)&&held<0;
 if(stowed){
  const [x,y,a]=[[86,72,1.95],[104,79,1.10],[107,71,1.17],[105,79,1.10]][d];
  return {id:carried,x,y,angle:a,behind:true};
 }
 const id=pose.handFrame!==undefined?carried:held;
 if(!weaponModel(id))return null;
 const [x,y,angle]=pose.handFrame!==undefined?handling[d][pose.handFrame]:(pose.lightGrip?lightStrikes:strikes)[d][Math.min(3,pose.beat)];
 // motion394: the hero's walk (coherent-walk.js heroStride) lifts the upper body,
 // hands included, by bodyY*.65 raster units; *2 belonged to the non-hero stride
 // and floated the weapon twice as far as the fist that holds it.
 const bob=pose.walk?heroGait(d,(pose.phase??0)/8,true).bodyY*.65:0;
 return {id,x,y:y+bob,angle,behind:false};
}
// gripGap stays off on purpose: clipping the model would leave a bare notch in
// the handle, so sprites.js draws the weapon whole and then puts the body's own
// 8x8 of knuckles back on top of it. The old `gap` field nobody read is gone.
export function paintHeroWeapon(g,pose,x,y,scale,behind){
 const p=heroWeaponPlacement(pose);if(!p||p.behind!==behind)return;
 drawWeaponModel(g,p.id,x+p.x*scale,y+p.y*scale,p.angle,scale,{gripGap:false});
 if(pose.flameBlade&&!behind){
  const model=weaponModel(p.id);
  g.save();g.translate(x+p.x*scale,y+p.y*scale);g.rotate(p.angle);g.scale(scale,scale);
  paintBladeFire(g,model.length,model.width,pose.flameFrame,{reducedMotion:pose.reducedMotion??globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false});
  g.restore();
 }
}
