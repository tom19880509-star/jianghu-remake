import {hasWeaponModel,weaponModel,weaponModelKey} from './weapon-models.js';
import {isStarterWeapon} from './starter-equipment.js';
import {SIGNATURE_CATALOG} from './signature-catalog.js';
// Presentation only. The original Lua contact/effect clock remains authoritative.
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const COHERENT_ACTORS = new Set([0, 7, 9, 10, 15, 31, 32, 33, 34, 44, 51, 58, 59, 61, 67, 68, 70]);
// Ordinary straight swords only. Named/curved/heavy weapons keep their art
// until an appropriate handling sheet exists; they never borrow this blade.
export const hasLightSwordArt = weapon => [111,112,113,114].includes(weapon);
export const hasHeroWeaponArt = hasWeaponModel;
export const xiaoLongNvPairedArt=equipment=>equipment?.pid===59&&
  weaponModelKey(equipment.carried)==='sword'&&weaponModelKey(equipment.offhand)==='sword';
// 155e (reviews/art155-patch-suggestions.md B1, 实机确认: 胡斐 胡家刀法 only reached phase 0): 141 gave companions an
// ordinary carried weapon and 142 lends unarmed enemies one per battle, so generated poses gated on "weapon === -1"
// were never reached. An ordinary prop of the family already painted in the art counts as the art's own; named weapons
// keep the source art until a matching sheet exists. Heads not listed are drawn empty-handed and take any loadout
// (their skill/kind conditions still decide whether a pose applies).
const PAINTED_WEAPON = {1:'blade', 4:'blade', 29:'blade', 3:'sword', 11:'sword', 35:'sword', 36:'sword', 93:'staff'};
const ordinaryProp = id => isStarterWeapon(id) || id >= 410 && id <= 414;
export const paintedLoadout = (head, weapon) => weapon == null || weapon < 0 || !PAINTED_WEAPON[head] ||
  ordinaryProp(weapon) && weaponModel(weapon)?.family === PAINTED_WEAPON[head];
// vfx 394 phase sync: a martial-art cast lands at the shared impact moment, half-way through the
// native effect frames (combat-vfx.js VFX_HIT). The striker holds the full extension until that
// moment, then recovers — instead of standing up while the qi is still in flight. `hold` is the number
// of source frames after contact to keep the strike; 0 keeps the original short recovery.
export const strikeHold = visual => visual && SIGNATURE_CATALOG[visual.skill] && Number.isFinite(visual.lastFrame) && Number.isFinite(visual.contactFrame)
  ? Math.max(0, Math.round((visual.lastFrame - visual.contactFrame) * .5)) : 0;
export function attackRecovery(contact, last, hold = 0) {
  contact = Math.max(2, contact);
  return hold > 1 ? Math.max(contact + 3, Math.min(last, contact + hold + 4)) : Math.max(contact + 3, Math.min(last, contact + 7));
}
export function attackBeat(frame, contact, last, hold = 0) {
  contact = Math.max(2, contact);
  const end = attackRecovery(contact, last, hold);
  const f = clamp(frame, 0, end);
  if (f <= contact) {
    const p=f/contact;
    return p<.18 ? 0 : p<.5 ? 1 : p<1 ? 2 : 3;
  }
  if (hold > 1) return f<contact+hold+.5 ? 3 : f<contact+hold+2.5 ? 2 : 0;
  return f<contact+1.5 ? 3 : f<contact+(end-contact)*.7 ? 2 : 0;
}
// Raw-art fighters (source fight sheets, e.g. 郭靖, 张三丰) have no beat binding: their native frames after
// contact already show the recovery, so the figure stood idle before the qi landed. Through the same hold
// window the attack frame shown is the contact (full-extension) frame. Coherent actors are unaffected (they
// pose from sourceFrame); the source clock, damage and frame data are untouched.
export function heldStrikeFrame(visual, id) {
  if (!visual || !Number.isFinite(id)) return id;
  const hold = strikeHold(visual), f = visual.sourceFrame, c = visual.contactFrame;
  if (!(hold > 1) || !Number.isFinite(f) || !Number.isFinite(c) || !(visual.frameCount > 0) || f <= c || f > c + hold) return id;
  const base = visual.frameStart + visual.direction * visual.frameCount, local = id - base;
  if (!Number.isInteger(local) || local < 0 || local >= visual.frameCount) return id;
  return base + Math.min(visual.frameCount - 1, c);
}
// 火焰刀法 is palm force (weapon-combat.lua qi). Only a sabre the hero really carries takes the approved
// B flame coat; anyone else — and the hero bare-handed or with a sword — burns along the hand-blade.
export const flameCoatWeapon = (visual, equipment) => (visual?.artActor ?? visual?.pid) === 0 && visual?.skill === 66 &&
  weaponModel(equipment?.carried)?.family === 'blade' ? equipment.carried : null;
export function coherentBinding(pack, id, visual, movement, equipment, handling) {
  const sourceHead = pack==='wmap' && id>=2553 && id<3009 ? Math.floor((id-2553)/4) : /^fight\d+$/.test(pack) ? Number(pack.slice(5)) : -1;
  // The DOS battle can draw a nonzero fighter through slot fight000. The
  // original damage/animation clock still names the real pid in visual;
  // resolve remade presentation from that identity, never from the borrowed
  // hero sheet. Explicit prior-self artActor=0 keeps its own hero disguise.
  const head = pack==='fight000' && sourceHead===0 && visual?.artActor==null &&
    visual?.pid!==0 && COHERENT_ACTORS.has(visual?.pid) ? visual.pid : sourceHead;
  if (!COHERENT_ACTORS.has(head)) return null;
  const direction = pack==='wmap' ? (id-2553)%4 : visual?.direction;
  if (!Number.isInteger(direction)||direction<0||direction>3) return null;
  // Her real paired swords use the existing independently drawn dual sheet.
  // This source-facing sheet has a distinct walk/strike clock from coherent art.
  if(head===59&&xiaoLongNvPairedArt(equipment))return null;
  if(head===58){
    // These sprites contain the real carried heavy sword. Never show it when
    // Yang has a different loadout, or lend his missing-arm art to another man.
    if(equipment?.pid!==58||equipment.carried!==106)return null;
    const ready=equipment.held<0?3:0;
    if(pack==='wmap'){
      const changing=handling?.pid===58&&handling.sourcePid===58;
      return {actor:58,direction,beat:0,coherent:true,yangFrame:changing?[3,3,2,1,0][handling.frame]:ready,
        walk:!changing&&movement?.pid===58,walkJoint:115,phase:movement?.phase??0};
    }
    if(visual?.pid!==58||visual.frameCount<=0)return null;
    const local=id-visual.frameStart-direction*visual.frameCount;
    if(local<0||local>=visual.frameCount)return null;
    const frame=visual.sourceFrame??local,contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
    const beat=attackBeat(frame,contact,visual.lastFrame??visual.frameCount-1,strikeHold(visual));
    const palm=(visual.skillType??visual.kind)===1&&visual.weapon<0;
    const heavy=(visual.skillType??visual.kind)===2&&visual.weapon===106;
    if(!palm&&!heavy)return null;
    // Keep the previously checked left-hand heavy-sword cuts. Only their start
    // and return use the same new ready figure as the stow/palm sequence.
    // motion395 S5 v2 (2026-10-02): NE has a real left-hand cut now — handling-sheet frame 6, the
    // frame-0 left forearm+fist+sword rotated rigidly about the elbow — shown on the contact+hold beat
    // only. The windup/approach beats keep the gathered raster that sprites.js draws for fight058 NE.
    if(heavy&&direction===0&&beat===3)return {actor:58,direction,beat,coherent:true,supported:true,yangFrame:6};
    if(heavy&&beat!==0)return null;
    return {actor:58,direction,beat,coherent:true,supported:true,
      yangFrame:palm?(beat===0?3:beat===3?5:4):0};
  }
  if(head===7){
    // Kunlun's He Taichong uses his golden robe and teal sash from the
    // scene portrait. The same slim sword stays in hand in guard and thrust.
    if(pack==='wmap')return {actor:7,direction,beat:0,coherent:true,neutral:true,
      walk:movement?.pid===7,phase:movement?.pid===7?(movement.phase??0):0,walkJoint:111};
    if(!visual||(visual.artActor??visual.pid)!==7||visual.frameCount<=0)return null;
    const local=id-visual.frameStart-direction*visual.frameCount;
    if(local<0||local>=visual.frameCount)return null;
    const ownSword=visual.skill===47&&(visual.skillType??visual.kind)===2;
    const frame=visual.sourceFrame??local,contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
    const beat=ownSword?attackBeat(frame,contact,visual.lastFrame??visual.frameCount-1,strikeHold(visual)):0;
    return {actor:7,direction,beat,coherent:true,supported:ownSword,
      action:[0,-2,2,5][beat],neutral:beat===0};
  }
  if(head===10){
    // Guangming Peak uses Fan Yao's scarred, loose-haired scene identity in
    // combat. His original sole attack is unarmed Xiaoyao Palm (skill 10).
    if(pack==='wmap')return {actor:10,direction,beat:0,coherent:true,neutral:true,
      walk:movement?.pid===10,phase:movement?.pid===10?(movement.phase??0):0,walkJoint:111};
    if(!visual||(visual.artActor??visual.pid)!==10||visual.frameCount<=0)return null;
    const local=id-visual.frameStart-direction*visual.frameCount;
    if(local<0||local>=visual.frameCount)return null;
    const ownPalm=visual.skill===10&&(visual.skillType??visual.kind)===1;
    const frame=visual.sourceFrame??local,contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
    const beat=ownPalm?attackBeat(frame,contact,visual.lastFrame??visual.frameCount-1,strikeHold(visual)):0;
    return {actor:10,direction,beat,coherent:true,supported:ownPalm,
      action:[0,-2,2,5][beat],neutral:beat===0};
  }
  if(head===15){
    // Her Ling Snake Island disguise uses the same bent posture and crooked
    // staff as the scene portrait. Only her own Golden Flower Staff skill
    // receives the thrust pose; other animations retain the guarded body.
    if(pack==='wmap')return {actor:15,direction,beat:0,coherent:true,neutral:true,
      walk:movement?.pid===15,phase:movement?.pid===15?(movement.phase??0):0,walkJoint:111};
    if(!visual||(visual.artActor??visual.pid)!==15||visual.frameCount<=0)return null;
    const local=id-visual.frameStart-direction*visual.frameCount;
    if(local<0||local>=visual.frameCount)return null;
    const ownStaff=visual.skill===85&&(visual.skillType??visual.kind)===4;
    const frame=visual.sourceFrame??local,contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
    const beat=ownStaff?attackBeat(frame,contact,visual.lastFrame??visual.frameCount-1,strikeHold(visual)):0;
    return {actor:15,direction,beat,coherent:true,supported:ownStaff,
      action:[0,-2,2,5][beat],neutral:beat===0};
  }
  if(head===61){
    // Ouyang Ke is shown before the boulder injury: white-gold robe, both
    // legs sound, fan retained in his right hand. His actual original attack
    // is unarmed Snake Fist (skill 4), not a strike with the decorative fan.
    if(pack==='wmap')return {actor:61,direction,beat:0,coherent:true,neutral:true,
      walk:movement?.pid===61,phase:movement?.pid===61?(movement.phase??0):0,walkJoint:111};
    if(!visual||(visual.artActor??visual.pid)!==61||visual.frameCount<=0)return null;
    const local=id-visual.frameStart-direction*visual.frameCount;
    if(local<0||local>=visual.frameCount)return null;
    const ownFist=visual.skill===4&&(visual.skillType??visual.kind)===1;
    const frame=visual.sourceFrame??local,contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
    const beat=ownFist?attackBeat(frame,contact,visual.lastFrame??visual.frameCount-1,strikeHold(visual)):0;
    return {actor:61,direction,beat,coherent:true,supported:ownFist,
      action:[0,-2,2,5][beat],neutral:beat===0};
  }
  if(head===44){
    // Wan'e Island's Yue Laosan carries his own crocodile-jaw shears in
    // all four facings. A recruited Yue with another equipped weapon must
    // not show the painted shears over that loadout.
    if(equipment?.pid===44&&equipment.carried>=0)return null;
    if(pack==='wmap')return {actor:44,direction,beat:0,coherent:true,neutral:true,
      walk:movement?.pid===44,phase:movement?.pid===44?(movement.phase??0):0,walkJoint:111};
    if(!visual||(visual.artActor??visual.pid)!==44||visual.frameCount<=0)return null;
    const local=id-visual.frameStart-direction*visual.frameCount;
    if(local<0||local>=visual.frameCount)return null;
    const ownShears=visual.skill===82&&(visual.skillType??visual.kind)===4;
    const frame=visual.sourceFrame??local,contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
    const beat=ownShears?attackBeat(frame,contact,visual.lastFrame??visual.frameCount-1,strikeHold(visual)):0;
    return {actor:44,direction,beat,coherent:true,supported:ownShears,
      action:[0,-2,2,5][beat],neutral:beat===0};
  }
  if(head===67){
    // Tiezhang Peak uses Qiu Qianren's pre-monastic brown-robed identity.
    // His original combat table teaches only Iron Palm (skill 11); effects
    // remain keyed to that martial art, while other skills keep his guard.
    if(pack==='wmap')return {actor:67,direction,beat:0,coherent:true,neutral:true,
      walk:movement?.pid===67,phase:movement?.pid===67?(movement.phase??0):0,walkJoint:111};
    if(!visual||(visual.artActor??visual.pid)!==67||visual.frameCount<=0)return null;
    const local=id-visual.frameStart-direction*visual.frameCount;
    if(local<0||local>=visual.frameCount)return null;
    const ownPalm=visual.skill===11&&(visual.skillType??visual.kind)===1;
    const frame=visual.sourceFrame??local,contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
    const beat=ownPalm?attackBeat(frame,contact,visual.lastFrame??visual.frameCount-1,strikeHold(visual)):0;
    return {actor:67,direction,beat,coherent:true,supported:ownPalm,
      action:[0,-2,2,5][beat],neutral:beat===0};
  }
  if(head===68){
    // Chongyang Palace's Daoist master keeps his gray and ochre scene
    // identity and one consistent jian. Only his original Seven-Star Sword
    // (skill 53) changes from the guarded pose to the thrust.
    if(pack==='wmap')return {actor:68,direction,beat:0,coherent:true,neutral:true,
      walk:movement?.pid===68,phase:movement?.pid===68?(movement.phase??0):0,walkJoint:111};
    if(!visual||(visual.artActor??visual.pid)!==68||visual.frameCount<=0)return null;
    const local=id-visual.frameStart-direction*visual.frameCount;
    if(local<0||local>=visual.frameCount)return null;
    const ownSword=visual.skill===53&&(visual.skillType??visual.kind)===2;
    const frame=visual.sourceFrame??local,contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
    const beat=ownSword?attackBeat(frame,contact,visual.lastFrame??visual.frameCount-1,strikeHold(visual)):0;
    return {actor:68,direction,beat,coherent:true,supported:ownSword,
      action:[0,-2,2,5][beat],neutral:beat===0};
  }
  if(head===70){
    // Shaolin's abbot retains the same saffron robe and red kasaya as his
    // scene portrait. Only his original Thousand-Hand Tathagata Palm (14)
    // changes his body from a guarded prayer pose to an open-palm thrust.
    if(pack==='wmap')return {actor:70,direction,beat:0,coherent:true,neutral:true,
      walk:movement?.pid===70,phase:movement?.pid===70?(movement.phase??0):0,walkJoint:111};
    if(!visual||(visual.artActor??visual.pid)!==70||visual.frameCount<=0)return null;
    const local=id-visual.frameStart-direction*visual.frameCount;
    if(local<0||local>=visual.frameCount)return null;
    const ownPalm=visual.skill===14&&(visual.skillType??visual.kind)===1;
    const frame=visual.sourceFrame??local,contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
    const beat=ownPalm?attackBeat(frame,contact,visual.lastFrame??visual.frameCount-1,strikeHold(visual)):0;
    return {actor:70,direction,beat,coherent:true,supported:ownPalm,
      action:[0,-2,2,5][beat],neutral:beat===0};
  }
  if(head===31){
    // Mei Manor's fourth master keeps the same robe and hair in dialogue and
    // combat. His sword is drawn separately; open-hand skills stay unarmed.
    if(pack==='wmap')return {actor:31,direction,beat:0,coherent:true,neutral:true,
      walk:movement?.pid===31,phase:movement?.pid===31?(movement.phase??0):0,
      walkJoint:113,heldWeapon:equipment?.held>=0?equipment.held:410};
    if(!visual||(visual.artActor??visual.pid)!==31||visual.frameCount<=0)return null;
    const local=id-visual.frameStart-direction*visual.frameCount;
    if(local<0||local>=visual.frameCount)return null;
    const frame=visual.sourceFrame??local,contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
    const beat=attackBeat(frame,contact,visual.lastFrame??visual.frameCount-1,strikeHold(visual));
    const sword=(visual.skillType??visual.kind)===2;
    return {actor:31,direction,beat,coherent:true,supported:true,action:[0,-2,2,5][beat],
      neutral:beat===0,heldWeapon:sword?(visual.weapon>=0?visual.weapon:equipment?.held>=0?equipment.held:410):-1};
  }
  if(head===32){
    // His ink-stained blue robe and bald crown are shared with the Mei Manor
    // scene; the short judge's brush is rendered as a separate prop.
    if(pack==='wmap')return {actor:32,direction,beat:0,coherent:true,neutral:true,
      walk:movement?.pid===32,phase:movement?.pid===32?(movement.phase??0):0,
      walkJoint:111,tubiBrush:true};
    if(!visual||(visual.artActor??visual.pid)!==32||visual.frameCount<=0)return null;
    const local=id-visual.frameStart-direction*visual.frameCount;
    if(local<0||local>=visual.frameCount)return null;
    const frame=visual.sourceFrame??local,contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
    const beat=attackBeat(frame,contact,visual.lastFrame??visual.frameCount-1,strikeHold(visual));
    return {actor:32,direction,beat,coherent:true,supported:true,action:[0,-2,2,5][beat],
      neutral:beat===0,tubiBrush:visual.skill===80};
  }
  if(head===33){
    // Hei Baizi's board is a separate prop. His body stays the same in the
    // manor and in combat; only the original "持棋盤" attack projects the board.
    if(pack==='wmap')return {actor:33,direction,beat:0,coherent:true,neutral:true,
      walk:movement?.pid===33,phase:movement?.pid===33?(movement.phase??0):0,
      walkJoint:113,goBoard:true};
    if(!visual||(visual.artActor??visual.pid)!==33||visual.frameCount<=0)return null;
    const local=id-visual.frameStart-direction*visual.frameCount;
    if(local<0||local>=visual.frameCount)return null;
    const frame=visual.sourceFrame??local,contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
    const beat=attackBeat(frame,contact,visual.lastFrame??visual.frameCount-1,strikeHold(visual));
    return {actor:33,direction,beat,coherent:true,supported:true,action:[0,-2,2,5][beat],
      neutral:beat===0,goBoard:true};
  }
  if(head===34){
    // The same cap, beard and bamboo-sleeved robe as the three-tile manor
    // scene. His guqin travels on his back and comes forward for the cast.
    if(pack==='wmap')return {actor:34,direction,beat:0,coherent:true,neutral:true,
      walk:movement?.pid===34,phase:movement?.pid===34?(movement.phase??0):0,
      walkJoint:111};
    if(!visual||(visual.artActor??visual.pid)!==34||visual.frameCount<=0)return null;
    const local=id-visual.frameStart-direction*visual.frameCount;
    if(local<0||local>=visual.frameCount)return null;
    const frame=visual.sourceFrame??local,contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
    const beat=attackBeat(frame,contact,visual.lastFrame??visual.frameCount-1,strikeHold(visual));
    return {actor:34,direction,beat,coherent:true,supported:true,
      neutral:beat===0,action:[0,-2,2,5][beat]};
  }
  if(head===51){
    // Murong Fu's scene, walk and fight art share one four-direction body sheet.
    // The blade is a separate model, so his actual equipment remains visible.
    if(pack==='wmap')return {actor:51,direction,beat:0,coherent:true,neutral:true,
      walk:movement?.pid===51,phase:movement?.pid===51?(movement.phase??0):0,
      walkJoint:111,heldWeapon:equipment?.held>=0?equipment.held:410};
    if(!visual||(visual.artActor??visual.pid)!==51||visual.frameCount<=0)return null;
    const local=id-visual.frameStart-direction*visual.frameCount;
    if(local<0||local>=visual.frameCount)return null;
    const frame=visual.sourceFrame??local,contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
    const beat=attackBeat(frame,contact,visual.lastFrame??visual.frameCount-1,strikeHold(visual));
    const sword=(visual.skillType??visual.kind)===2;
    return {actor:51,direction,beat,coherent:true,supported:true,action:[0,-2,2,5][beat],
      neutral:beat===0,heldWeapon:sword?(visual.weapon>=0?visual.weapon:equipment?.held>=0?equipment.held:410):-1};
  }
  if (pack==='wmap') {
    if(head===0 && hasHeroWeaponArt(equipment?.carried)) {
      const changing=handling?.pid===head&&handling.sourcePid===equipment.pid;
      return {actor:head,direction,beat:0,coherent:true,handFrame:changing?handling.frame:equipment.held<0?0:4,
        walk:!changing&&movement?.pid===head,walkJoint:115,phase:movement?.phase??0,carriedWeapon:equipment.carried,heldWeapon:equipment.held};
    }
    return {actor:head,direction,beat:0,coherent:true,neutral:true,
      walk:movement?.pid===head,phase:movement?.pid===head?(movement.phase??0):0};
  }
  // Head and person identity must BOTH match; a shared/stale visual cannot borrow a pose.
  if (!visual || (visual.artActor??visual.pid)!==head || visual.frameCount<=0) return null;
  const local=id-visual.frameStart-direction*visual.frameCount;
  if(local<0 || local>=visual.frameCount)return null;
  // Fire Blade is an unarmed qi technique in the rules (palm force). A sabre the hero really carries
  // keeps the approved flame coat in the weapon rig; otherwise the body strikes bare-handed and the
  // fire runs along the hand-blade (signature-effects.js) — never a lent steel blade (vfx 394).
  const flameWeapon=head===0?flameCoatWeapon(visual,equipment):null;
  const flameBlade=flameWeapon!=null;
  const flamePalm=head===0&&visual.skill===66&&!flameBlade;
  const skillType=flamePalm?1:visual.skillType??visual.kind;
  const sword=head===0&&(flameBlade||skillType===2||skillType===3&&hasWeaponModel(visual.weapon)||skillType===4&&weaponModel(visual.weapon)?.family==='staff');
  const displayedWeapon=flameBlade?flameWeapon:visual.weapon;
  const model=weaponModel(displayedWeapon);
  const lightGrip=sword&&['sword','blade','snake'].includes(model?.family)&&
    displayedWeapon!==106&&displayedWeapon!==117;
  const brush=head===0&&skillType===4&&visual.skill===80;
  const drain=head===0&&skillType===4&&[27,28,29].includes(visual.skill);
  const supported=head===59 ? skillType===2 : skillType===1||sword||brush||drain;
  const contactAt=visual.contactFrame??Math.floor(visual.frameCount*.65),lastAt=visual.lastFrame??visual.frameCount-1,hold=strikeHold(visual);
  const beat=supported ? attackBeat(visual.sourceFrame??local,contactAt,lastAt,hold) : 0;
  const neutral=!supported || (visual.sourceFrame??local)===0 || (visual.sourceFrame??local)>=(hold>1?attackRecovery(contactAt,lastAt,hold)+1:contactAt+7);
  const carriedSword=head===0&&hasHeroWeaponArt(equipment?.carried);
  return {actor:head,direction,beat,coherent:true,supported,kind:visual.kind,heldBrush:false,
    artSet:(sword&&!lightGrip)||brush?'0-sword':undefined,lightGrip,neutral,
    handFrame:carriedSword&&neutral?(skillType===1||drain||visual.weapon<0?0:4):undefined,
    scabbard:false,weaponAttack:sword||brush,carriedWeapon:head===0?equipment?.carried:undefined,
    flameBlade:flameBlade&&!neutral,flameFrame:visual.sourceFrame??local,reducedMotion:visual.reducedMotion,
    heldWeapon:head===0?(flameBlade&&!neutral?flameWeapon:skillType===1||drain?-1:visual.weapon):undefined};
}
