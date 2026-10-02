import {INN_SIGNS,innSign,originalInnBoardPart,drawInnBoard,showInnBoard,INN_BOARD_BOUNDS} from './inn-noticeboard.js';
import {loadHeroWeaponArt} from './hero-weapon-art.js';
import {prepareItemArt} from './item-art.js';
import {STARTER_KITS,EXTRA_ITEM_IDS,INN_FOOD,installStarterItems,normalizeStarterGrants} from './starter-equipment.js';
import { normalizeHomestead, playPitchPot } from './homestead.js';
import {normalizeRestLocation,chooseRestSave,saveRestWithRetry,lodgingPrompt} from './rest-save.js';
import {drawWeaponRack,hasWeaponModel,WEAPON_MODEL_BY_ITEM,weaponModel} from './weapon-models.js';
import { showCharacterCreation, creationAttributes } from './character-creation.js';
import { recordVisit, exploredDestinations, destinationLabel } from './exploration.js';
import {makeNativeBalance,applyArtNumbers} from './martial-balance.js';
import { normalizeTeaching } from './teaching.js';
import { normalizePastime } from './pastime.js';
import {normalizeOutfit} from './outfit.js';
import {normalizeOffhand} from './offhand.js';
import { mountAudioSettings } from "./audio-settings.js";
import { mountCondorClues, mountClueList } from './condor-clues.js';
import { deriveFeihuClues, feihuSummary } from './feihu-clues.js';
import { deriveXiaoaoClues, xiaoaoSummary } from './xiaoao-clues.js';
import { deriveYitianClues, yitianSummary } from './yitian-clues.js';
import { deriveTianlongClues, tianlongSummary } from './tianlong-clues.js';
import { deriveShediaoClues, shediaoSummary } from './shediao-clues.js';
import { mountLandscapePreference } from "./orientation.js";
import { newGrowth, normalizeGrowth } from './growth.js';
import { newMastery,normalizeMastery } from './mastery.js';
import { LEGACIES,normalizeJourney,normalizeProfile,newJourney,completeJourney,journeyLabel,homecomingNote,difficultyFor,readProfile,writeProfile,bindJourneyEcho,advanceDispersalQuest,endingEchoes } from './journey.js';
// 157 承前世武学另起一行导入：上一行是 reviews/backstory155d-patch-suggestions.md E1 的合并判据，须保持原样。
import { inheritSlots,inheritLevel,inheritableSkills } from './journey.js';
import { clearedDirections,endingRevelationReady } from './journey.js';
import { combatChances } from './combat-rules.js';
import { dialogueText } from './dialogue.js';
import { loadCharacterAtlas,characterArtStats } from './character-atlas.js';
import { loadCombatArt,combatArtStats } from './combat-art.js';
import { hasHeroWeaponArt, heldStrikeFrame } from './combat-animation.js';
import { mountItemCatalog } from './item-catalog.js';
import { mountPartyUI, hanNumber } from "./party-ui.js";
import { mountCollectionUI, createActionPreferences } from './collection-ui.js';
import { battleSkillText } from './battle-preview-text.js';
import { createOcclusionTester } from "./occlusion.js";
import { gameViewport, screenToTile, raisedTileAt, battleFigureAt, BATTLE_GRID, CLASSIC_GRID } from "./viewport.js";
import { isBeggarFighter } from "./beggar-walk.js";
import { JianghuAudio } from "./audio.js";
import { mountPortableMenu } from "./portable.js";
import { StepMotion } from "./locomotion.js";
import { paintPortrait, loadCanvasPortraits, drawCanvasPortrait } from "./portraits.js";
import {
  loadRemasterSprites,
  loadHeroSprites,
  loadModaBattleSprites,
  loadWangjiSprite,
  drawHero,
  drawProp,
  drawBattleActor,
  drawBattleHurt,
  drawWheelVolley,
  drawSceneActor,
  hasHuangQinArt,
  drawGoldPull,
  battleSpriteSize,
  readCombatPoses,
  setBattleEquipment,
  setWeaponHandlingVisual,
  propSpriteBounds,
  furnitureAvailable,
  drawFurnitureSprite,
  furniturePartBounds,
  readFurnitureRaster,
} from "./sprites.js";
import { createFurniturePlanner } from "./furniture.js";
import { paintCombatEffect, isFiveWheelVisual } from "./effects.js";
import { signatureLayers, measureCasterPose, signatureTarget, loadSignatureArt } from './signature-effects.js';
import { vfxShake, vfxHitReaction, vfxRecipe, VFX_HIT } from './combat-vfx.js';
import { loadWater, paintWater, beginWaterBatch, flushWaterBatch } from "./water.js";
import { loadMaterials, paintMaterial, clearMaterialCache } from "./materials.js";
import { loadWinter, paintWinter } from "./winter.js";
import { pathfind, isWater, DIRECTIONS, stickStep } from "./navigation.js";
import { mountJoystick } from "./joystick.js";
import { lua, lauxlib, lualib, to_luastring } from "fengari";
import { installNativeMartialArts } from './martial-identities.js';
const $ = (s) => document.querySelector(s),
  C = globalThis.JY_CONTENT,
  A = globalThis.JY_ATLAS;
// 本机巡检走真实场景循环，但不接入正常存档。公开地址上的同名参数无效。
function sceneInspection(href) {
  const url = new URL(href), value = url.searchParams.get("scene-test");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && url.protocol !== "file:") return null;
  if (!/^\d+$/.test(value || "")) return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id < 0 || id >= 84) return null;
  const at = (url.searchParams.get("at") || "").split(",").map(Number);
  const valid = at.length === 2 && at.every(n => Number.isInteger(n) && n >= 1 && n <= 62);
  return {id, x:valid ? at[0] : -1, y:valid ? at[1] : -1};
}
const sceneTest = sceneInspection(location.href);
installNativeMartialArts(C.skills);
const classicArtNumbers=structuredClone(C.skills);
const nativeBalance=makeNativeBalance(C);
installStarterItems(C.items);
const decode = new TextDecoder("gb18030");
let preferredArt;
try { preferredArt = localStorage.getItem("jy-graphics"); } catch {}
const graphicsMode = (new URLSearchParams(location.search).get("art") || preferredArt ||
  (matchMedia("(pointer:coarse)").matches ? "classic" : "remaster")) === "classic" ? "classic" : "remaster";
const remastered = graphicsMode === "remaster";
document.body.dataset.graphics = graphicsMode;
const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
  enc = (s, kind = "gb18030") =>
    Uint8Array.from(
      [...String(s)].flatMap((c) =>
        c.charCodeAt(0) < 128 ? [c.charCodeAt(0)] : JY_ENCODERS[kind][c] || [63],
      ),
    );
const files = new Map(Object.entries(JY_FILES).map(([k, v]) => [k, bytes(v)])),
  norm = (s) => s.replace(/^\.\//, "");
const journeySlots=new Map();
// 155o 存档位信息（../../分析报告 第六条）：首页原本只显示「进度一／二／三」。
// 存档的 r 缓冲就是原版 ranger 结构，基本数据 836 字节在前、人物记录每 182 字节（CC.Person_S['等级']={30,0,2}，
// CC.Base_S 的 队伍 在 24+i*2、物品 在 36+i*4、数量 38+i*4），所以已有存档也能就地读出等级与天书数，不必等下次保存。
const slotDates=new Map();
const BOOK_IDS=[144,145,146,147,148,149,150,151,152,153,154,155,156,157];
function slotSummary(slot){
 const raw=files.get('data/r'+slot+'.grp');if(!raw)return null;
 const j=journeySlots.get(String(slot)),date=slotDates.get(String(slot));
 const out={cycle:j&&j.cycle||1,trial:!!(j&&j.trial),date};
 const scene=j&&j.rest&&j.rest.scene;
 // 156 审查：原版场景名是 Big5 繁体，和别处一样要过 sourceLabel，否则首页写成「高昇客棧」。
 // content.js 的 70 仍是原版「主角的家」，游戏内（Lua 场景名、江湖图、歇宿）统一叫小虾米居。
 out.place=scene==null||!C.scenes[scene]?null:scene===70?'小虾米居':sourceLabel(C.scenes[scene]['名称']);
 try{
  const v=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
  out.level=v.getInt16(836+30,true);
  let party=0;for(let i=0;i<6;i++)if(v.getInt16(24+i*2,true)>=0)party++;
  out.party=party;
  const carried=new Set();for(let i=0;i<200;i++)if(v.getInt16(38+i*4,true)>0)carried.add(v.getInt16(36+i*4,true));
  // 圣堂 E1001–1014 将书移出背包，并在本存档 D83/11–24 的图号字段写入4664。
  // 与游戏内手札同样按每部书的「携带或归位」计一次，不把归位误报成丢失。
  const savedD=files.get('data/d'+slot+'.grp'),placed=Array(14).fill(false);
  if(savedD&&savedD.byteLength>=(83*200+25)*22){
   const d=new DataView(savedD.buffer,savedD.byteOffset,savedD.byteLength);
   for(let i=0;i<14;i++)placed[i]=d.getInt16((83*200+11+i)*22+10,true)===4664;
  }
  out.books=BOOK_IDS.filter((id,i)=>carried.has(id)||placed[i]).length;
  out.placed=placed.filter(Boolean).length;
 }catch{/* 旧档或缓冲异常时只报周目、地点与时间 */}
 return out;
}
const slotLabel=(slot,base)=>{
 const s=slotSummary(slot);if(!s)return base+' · 空位';
 const bits=[s.place||'江湖', s.trial?'试玩':`第 ${s.cycle} 程`];
 if(s.level!=null)bits.push(`${s.level} 级`+(s.party>1?` · ${s.party} 人`:' · 独行'));
 if(s.books!=null)bits.push(`天书 ${s.books}/14`);
 if(s.placed)bits.push(`已归位 ${s.placed}`);
 if(s.date)bits.push(new Date(s.date).toLocaleString('zh-CN',{hour12:false,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}));
 return base+' · '+bits.join(' · ');
};
let journey=normalizeJourney(),journeyProfile=normalizeProfile(),pendingJourney=null,pendingChapterJourney=null,journeyFinished=false;
let pendingEchoTrial='',echoVisual=null,echoResult=null,echoPortraitId=-1;
// S2 395 展示别名：归途终战借格装成的「某某留形」（战斗编号＝借格）按本人画立绘、走位与重制出招；Lua 每个出口都清空。
const displayAlias=new Map();
const actorFor=pid=>echoVisual&&(echoVisual.enemyId===pid||echoVisual.extraId===pid)?0:(displayAlias.get(pid)??pid);
let pendingMasteryStart=false;
let pendingHomecoming='';   // 155d 归路：本程终局选定的 return/stay（backstory-extension.lua 经 browser_homecoming 告知）
async function chooseJourney(){
 const choice=await dialog('再入江湖',`已记录通关：${journeyProfile.highestClearedCycle} 程。${journeyProfile.echoMastered?'\n江湖留名：照见本心。':''}${homecomingNote(journeyProfile)}\n新周目从小虾米的家开始，等级、装备与剧情重新成长。\n新增机缘：百花谷旧事已了、求得空明拳札后，可邀周伯通同游，直至武林帖到来。`,[
  {label:journeyProfile.highestClearedCycle?`开启第 ${journeyProfile.highestClearedCycle+1} 周目`:'正式新周目 · 通关后开启',value:'new',disabled:journeyProfile.highestClearedCycle<1},
  {label:'新周目开局 · 独立试玩',value:'trial'},
  {label:'百花谷新篇 · 队伍试玩',value:'baihua'},
  {label:'梅庄笔缘 · 二选一试玩',value:'mei'},
  {label:'河洛问诊 · 同伴试玩',value:'inn'},
  {label:'门影试炼 · 独立练习',value:'echo'},
  {label:'论武修炼 · 专精试玩',value:'mastery'},
  {label:'返回',value:'back'},
 ],{menu:true});
 if(choice==='back')return null;
 if(choice==='mastery'){
  const ok=await dialog('论武修炼','小虾米带着一级胡家刀法、太极拳和九阳开始论武，共有12600修炼点。行囊另备紫霞、梯云纵、易筋经等九本秘籍，须实际研习才算学会。外功、内功与轻功合计最多十门，藏书不占名额；可选择精修已有武学。\n点击左侧头像安排修炼、选择拿手与主运心法，再与胡斐切磋。本批十二门开放比较，学习不逐本叠加攻防与气血，切换不恢复内力。紫霞、九阳与易筋经只能主运其一，梯云按实际境界增加轻功。易筋基础修炼不锁品德，八重起须亲历善行并悟法，方能发挥护体。人物页可体验三段选择，也可补给试验点数至32767比较高阶修炼，补给不是正式奖励。本次是独立试验，可另存、导出，不改变正式旧档。',[{label:'进入论武试玩',value:1},{label:'返回',value:0}],{menu:true});
  if(!ok)return null;
  pendingChapterJourney=normalizeJourney({version:1,cycle:1,trial:true,origin:'trial',legacy:'none',kongming:false,mastery:newMastery()});pendingMasteryStart=true;return 'mastery-chapter';
 }
 if(choice==='inn'){
  const ok=await dialog('河洛问诊','用原八书队伍试玩：进入眼前的河洛客栈，与店小二交谈；原打听消息时，给他一两银子，再谈即可遇到问诊小事。可请医者诊治，或自选一枚解毒药；救人后再找小二，能免费休整一次。此为原创短支线，独立试玩不记正式通关。',[{label:'进入试玩',value:1},{label:'返回',value:0}],{menu:true});
  if(!ok)return null;
  pendingChapterJourney=normalizeJourney({version:1,cycle:2,trial:true,origin:'chapter',legacy:'none',kongming:false});return 'eight-books-chapter';
 }
 if(choice==='mei'){
  const ok=await dialog('梅庄笔缘','用原梅庄三场切磋后的队伍试玩。前往梅庄，与秃笔翁借帖论笔，主角再单人切磋一次，可择铁笔或判官笔法。铁笔可给队友装备；笔法由主角从1级学起，武功已满不会覆盖旧招。每程择一。此为独立试玩，可另存空位，不记正式通关。',[{label:'进入试玩',value:1},{label:'返回',value:0}],{menu:true});
  if(!ok)return null;
  pendingChapterJourney=normalizeJourney({version:1,cycle:2,trial:true,origin:'chapter',legacy:'none',kongming:false});return 'mei-brush-chapter';
 }
 if(choice==='echo'){
  const mode=await dialog('门影试炼','用八书时期的小虾米与配置样板或本机留存的身影独立练习。\n双方满气血、内力起战；身影不携带药品，医疗最多三次，休息恢复照常。四十回合未分胜负便结束，可随时退出。试炼结束还原开战前状态，不获得正式称号。',[
   {label:'八书配置样板 · 非真实前世',value:'sample'},
   {label:journeyProfile.echo?'挑战本机通关记录中的身影':'本机尚无通关身影',value:'record',disabled:!journeyProfile.echo},
   {label:'返回',value:'back'},
  ],{menu:true});
  if(mode==='back')return null;
  pendingEchoTrial=mode;
  pendingChapterJourney=normalizeJourney({version:1,cycle:2,trial:true,origin:'chapter',legacy:'none',kongming:false});return 'eight-books-chapter';
 }
 if(choice==='baihua'){
  const ok=await dialog('百花谷新篇','以八书队伍试玩新增支线。百花谷旧事已了后，与老顽童切磋求取空明拳札，还可邀请他同游。队伍满员时，先到大地图与一位同伴道别。此为独立试玩，可另存空位，不计正式通关。',[{label:'进入试玩',value:1},{label:'返回',value:0}],{menu:true});
  if(!ok)return null;
  pendingChapterJourney=normalizeJourney({version:1,cycle:2,trial:true,origin:'chapter',legacy:'none',kongming:false});return 'eight-books-chapter';
 }
 const legacy=await dialog('旧梦留痕','这一程只选一项。等级、内力、物品与天书都从头开始。'+(choice==='trial'?'\n独立试玩不会发放正式通关记录，也不承继前世武学。':''),LEGACIES.map(x=>({label:x.name+' · '+x.detail,value:x.id})).concat([{label:'返回',value:'back'}]),{menu:true});
 if(legacy==='back')return null;
 // 157：承前世武学（journey.js inheritSlots 注释）。一门一门挑，可重选；一门不带也行。
 const picks=[];
 if(choice!=='trial'){
  const cycle=journeyProfile.highestClearedCycle+1,echo=journeyProfile.echo&&journeyProfile.echo.cycle<cycle?journeyProfile.echo:null;
  const pool=inheritableSkills(echo),room=Math.min(inheritSlots(cycle),pool.length);
  const rank=level=>Math.min(10,Math.floor(level/100)+1);
  const name=id=>sourceLabel(C.skills[id]?.['名称']||'')||(id===93?'家传辟邪剑法':'武功'+id);
  // 只改显示：龙象十重以上的真实层数记在 echo.growth.extraRanks（growth-core attackRank），旧 echo 没有就照基础等级；承继结算仍按 inheritLevel。
  const unit=id=>id===18?'层':'重';
  const was=s=>{const extra=echo?.growth?.extraRanks?.['18'];return s.id===18&&rank(s.level)===10&&Number.isInteger(extra)&&extra>10?extra:rank(s.level);};
  while(picks.length<room){
   const v=await dialog('承前世武学',`上一程的武功可择 ${inheritSlots(cycle)} 门带入此程，境界减半，承继至多五重（龙象至多五层）；内力从头练起，耗内重的绝学起初只能以低重施展。还可再选 ${room-picks.length} 门。`,
    pool.filter(s=>!picks.includes(s.id)).map(s=>({label:`${name(s.id)} · ${was(s)}${unit(s.id)} → ${rank(inheritLevel(s.level))}${unit(s.id)}`,value:'s'+s.id}))
     .concat([{label:picks.length?'就这些':'一门都不带',value:'done'}],picks.length?[{label:'重选',value:'reset'}]:[]),{menu:true});
   if(v==='done')break;
   if(v==='reset'){picks.length=0;continue;}
   picks.push(Number(String(v).slice(1)));
  }
 }
 pendingJourney=newJourney(journeyProfile,legacy,choice==='trial',picks);return 1;
}
// Use the game's own Big5-to-GB table for metadata labels as well as Lua dialogue.
const sourceLabel = (label) => {
  const input = enc(label, "cp950"),
    output = [];
  for (let i = 0; i < input.length; i++) {
    if (input[i] < 128) output.push(input[i]);
    else {
      const value = JY_CHARSET[0][input[i] * 256 + input[++i]] || 0x3f3f;
      output.push(value & 255, value >> 8);
    }
  }
  return decode.decode(Uint8Array.from(output)).replace(/^程瑛居$/, "程英居");
};
// Indoor snapshots omit destinations. Keep the same source entrances for labels only;
// access conditions and travel still come from the live world snapshot.
const sceneEntrances=Object.entries(C.scenes).map(([id,s])=>({id:Number(id),name:sourceLabel(s['名称']),x:s['外景入口X1'],y:s['外景入口Y1']})).filter(s=>s.x>0&&s.y>0);
const personName = (head) => {
  // Original head 80 is shared by a cook and Mingjiao fighters (301..310).
  // In the branch scene, source events 77/78 address the disciples.
  if (head === 80 && lastSnapshot.scene === 12) return "明教弟子";
  // Guangming Peak event 87 addresses the same shared portrait as Mingjiao followers.
  if (head === 80 && lastSnapshot.scene === 11) return "明教教众";
  // Kongtong events 124/125 reuse head 79 for the sect's disciples.
  if (head === 79 && lastSnapshot.scene === 34) return "崆峒弟子";
  const special = {
    0: "小虾米",
    104: "神雕",
    105: "客栈掌柜",
    106: "店小二",
    111: "韦小宝",
    112: "霍青桐",
    113: "回部族人",
    114: "行路札记",
  };
  const found = C.people.find((p) => p["头像代号"] === head);
  return special[head] || (found && sourceLabel(found["姓名"]));
};
// 天龙：说话人通名之前，对话抬头只用已听到的称呼。段誉 1650 才通名；王语嫣 1726 由慕容复介绍；
// 慕容复在 E487/E489 只被称作慕容公子（1694），全名到 E493 的 1753 才说出；乔峰在 E525 到 1925 才自称。
const unintroducedName = (talk, head) =>
  head === 53 && talk === 1648 ? "年轻公子" :
  head === 109 && (talk === 1693 || talk === 1723) ? "燕子坞姑娘" :
  head === 51 && talk >= 1695 && talk <= 1741 ? "慕容公子" :
  head === 50 && talk >= 1912 && talk <= 1923 ? "乔帮主" : null;
const cv = $("#game"),
  ctx = cv.getContext("2d"),
  surface = document.createElement("canvas");
// Expand the view to the screen's aspect ratio without cropping or stretching tiles.
// clarity 394: the phone default (classic map + remade people) rendered at 1 canvas px per
// logical px, so the 2x character art was halved and the browser then stretched the canvas
// 1.6-1.8x. Allow up to 1.25x (still capped by devicePixelRatio and gameViewport's 4 MP);
// 1.5 was measured sharper by little more at ~1.4x the battle frame time (review clarity394).
const CLASSIC_DETAIL = 1.25;
let view = gameViewport(cv.clientWidth, cv.clientHeight, remastered ? 2 : CLASSIC_DETAIL, devicePixelRatio);
let g = surface.getContext("2d");
function sizeSurfaces() {
  surface.width = cv.width = Math.round(view.width * view.scale);
  surface.height = cv.height = Math.round(view.height * view.scale);
  g.setTransform(cv.width / view.width, 0, 0, cv.height / view.height, 0, 0);
  g.imageSmoothingEnabled = false;
}
sizeSurfaces();
const titleImage = new Image();
titleImage.src = "../demo/assets/home.png";
let S = bytes(C.sceneData),
  D = bytes(C.eventData),
  war = new Int16Array(6 * 4096),
  mode = "title",
  camera = { x: 0, y: 0 },
  currentScene = 70,
  currentBattleMap = -1,
  clip = null,
  dead = false;
let sceneView = new DataView(S.buffer, S.byteOffset, S.byteLength),
  eventView = new DataView(D.buffer, D.byteOffset, D.byteLength);
const world = Object.fromEntries(
  Object.entries(C.world).map(([k, v]) => [k, new Int16Array(bytes(v).buffer)]),
);
const packIds = { 0: "smap", 1: "hdgrp" },
  images = new Map(),
  keys = [],
  events = [],
  luaErrors = [];
let mapRevision = 0,
  routeState = null,
  routeNoticeUntil = 0,
  tapMarker = null,
  routeNotice = "",
  nearbySignature = "",
  L,
  co,
  db,
  pendingAsset = null,
  pendingSave = null,
  lastSaveOK = false,
  saveFileBackup = null,
  lastSnapshot = {},
  linghuJadeAccepted = false,
  currentDialog = null,
  running = false,
  handleTimer = 0,
  lastFrameArgs = null;
let fightVisual = null;
let heldKey = null;
// 395 S7 R2：自动寻路途中，场景里的路过事件（入门独白等）弹出对白会经 stopInput() 清掉路线，读完主角就停在半路。
// 对白开始时记下原目标，事件结束、仍在同一场景同一状态时由 nextKey() 从当前格重新寻路续走；最多续两次。
// 新的点按 / 附近 / 交互、摇杆、方向键、失焦与切后台、换场景、开面板都经 stopInput() 或这里的清除作废它；战斗对白不记。
let resumeRoute = null;
let pendingFastTravel = -1;
let joystick = null, battleSelection = null, inputContext = "", inputHudSignature = "";
let sceneTargets = [];
// 157（Tom 2026-09-20 裁定）：命中与闪避改为默认开启；「经典」保留为设置里的可选项。
// 玩家自己选过就照他选的（含选回经典）；没选过、读不到 localStorage 时一律 enhanced。
let combatRules='enhanced';try{combatRules=localStorage.getItem('jy-combat-rules')==='classic'?'classic':'enhanced';}catch{}
// 157（Tom 2026-09-24）：战斗镜头默认拉近 1.25 倍（人物原先只占屏高约 1/15），可在「存档与画面」改回标准看全场；
// 网格可关。镜头在每场战斗开始（lib.BattleGrid）时定下，整场画面、点选、伤害数字与对外格子参数同一个值。
let battleZoomPref='near',battleGridPref=true;
try{battleZoomPref=localStorage.getItem('jy-battle-zoom')==='standard'?'standard':'near';battleGridPref=localStorage.getItem('jy-battle-grid')!=='off';}catch{}
let battleZoom=1;
const zoomedBattleGrid=()=>({...BATTLE_GRID,halfWidth:BATTLE_GRID.halfWidth*battleZoom,halfHeight:BATTLE_GRID.halfHeight*battleZoom});
let pendingAttack=null,pendingOutcomes=[];const combatOutcomeLog=[];
const battleUnitEquipment=new Map();let weaponHandlingVisual=null;
function targetChances(target){
 const actor=controlledFighter();if(combatRules!=='enhanced'||!pendingAttack||pendingAttack.drain||!actor||!target||actor.side===target.side)return null;
 // 耗内以 Lua 在出招当时传来的实际值为准（bridge.lua War_Fight_Sub 的第 8 参）：成长规则的平衡耗内、小无相减耗、
 // 龙象末层加耗、太极减耗、普通拳脚置 0 都已在外层作用域套上，与真打降重（combat-extension）读的是同一行同一时刻。
 // 静态底表只在旧接口缺第 8 参时兼容。
 let level=pendingAttack.level;const cost=pendingAttack.cost??C.skills[pendingAttack.skill]?.['消耗内力点数']??0;
 while(level>1&&Math.floor((level+1)/2)*cost>actor.mp)level--;
 return combatChances(actor.agility,target.agility,level,actor.knowledge);
}
let pendingPartyMember = null;
let pendingFieldAction = null;
let battlePulseRequest = 0, lastBattlePaint = 0, battleFeedbackFrames = 0;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let terrainRevision = 0;
let sceneryRevision = 0;
const sceneFurniture = createFurniturePlanner();
let groundCache = null;
const walkMotion = new StepMotion();
let motionRequest = 0;
let wheelVolley = null;
let chapterLoadPending = false;
let chapterPreview = null;
let battleSpeed = 1;
let movementVisual = null;
const effectFrames = [];
let occlusions = [];
const prepareOcclusion = createOcclusionTester();
let furnitureDraws = [];
const getfile = (name) => {
  const key = norm(name);
  if (files.has(key)) return files.get(key);
  if (/^data\/r[123]\.idx$/.test(key)) return files.get("data/ranger.idx");
  throw Error("缺少资源或存档：" + key);
};
const sv = (sid, x, y, l) => {
  if (sid < 0 || sid >= 84 || x < 0 || x >= 64 || y < 0 || y >= 64) return 0;
  return sceneView.getInt16(2 * ((sid * 6 + l) * 4096 + y * 64 + x), true);
};
const dv = (sid, id, l) => {
  if (sid < 0 || sid >= 84 || id < 0 || id >= 200) return -1;
  return eventView.getInt16(2 * ((sid * 200 + id) * 11 + l), true);
};
const portraitAppearance = (head) =>
  head===26 && mode==="scene" && currentScene===82 && dv(82,1,5)===6078
    ? "prison"
    : (head === 41 || head === 42) && mode === "scene" && currentScene === 74
    ? "island"
    : head === 38 &&
        mode === "scene" &&
        currentScene === 38 &&
        [5154, 5156, 5158, 5160, 5162, 5164].includes(dv(38, 0, 5))
      ? "ill"
      : head === 3 && mode === "scene" && currentScene === 24 && dv(24, 8, 5) !== 5216
        ? "poisoned"
        : "cured";
const wv = (x, y, l) => (x < 0 || x >= 64 || y < 0 || y >= 64 ? 128 : war[l * 4096 + y * 64 + x]);
function tableValue(T, index, depth = 0) {
  index = lua.lua_absindex(T, index);
  let type = lua.lua_type(T, index);
  if (type === lua.LUA_TSTRING) return decode.decode(lua.lua_tolstring(T, index));
  if (type === lua.LUA_TNUMBER) return lua.lua_tonumber(T, index);
  if (type === lua.LUA_TBOOLEAN) return lua.lua_toboolean(T, index);
  // The depth cap only guards against cycles. Outfit choices nest requirement rows at depth 6,
  // and a truncated row used to reach the party sheet as null and stop the game.
  if (type !== lua.LUA_TTABLE || depth > 9) return null;
  const o = {};
  lua.lua_pushnil(T);
  while (lua.lua_next(T, index)) {
    o[tableValue(T, -2, depth + 1)] = tableValue(T, -1, depth + 1);
    lua.lua_pop(T, 1);
  }
  return o;
}
function snapshot() {
  if (!L) return {};
  try {
    const top = lua.lua_gettop(L);
    lua.lua_getglobal(L, to_luastring("BrowserSnapshot"));
    if (!lua.lua_isfunction(L, -1)) {
      lua.lua_settop(L, top);
      return lastSnapshot;
    }
    const r = lua.lua_pcall(L, 0, 1, 0);
    if (r !== lua.LUA_OK) {
      lua.lua_settop(L, top);
      return lastSnapshot;
    }
    const s = tableValue(L, -1);
    lua.lua_settop(L, top);
    // Correct the source map typo in display snapshots; original save bytes remain unchanged.
    if (s.scene === 45) s.place = "程英居";
    for (const d of Object.values(s.destinations || {})) if (d.id === 45) d.name = "程英居";
    return s;
  } catch {
    return lastSnapshot;
  }
}
function updateHud() {
  lastSnapshot = snapshot();
  const s = lastSnapshot;
  const context = `${s.status}:${s.scene}`;
  if (context !== inputContext) { stopInput(); inputContext = context; }
  refreshNearby();
  updateInputHud();
  document.body.dataset.status = s.status ?? 0;
  $("#training").disabled = !canExplore() || ![2, 4].includes(s.status);
  for(const button of document.querySelectorAll("[data-field-action]"))button.disabled=!(canExplore() && [2,4].includes(s.status));
  $("#nearby-menu").disabled = !canExplore() || s.status !== 4;
  $("#portable").disabled = !db || s.status === 5;
  $("#atlas-map").textContent = s.status === 5 ? `演出 ×${battleSpeed}` : "江湖图";
  $("#atlas-map").title = s.status === 5 ? "点击切换 1、2、3 倍演出速度" : "前往已探索的地点";
  $("#manual-battle").hidden = s.status !== 5 || !s.autoFight || !!currentDialog || !!document.querySelector('dialog[open]');
  updateTurnOrder(s);
  const entrance=s.status===4&&sceneEntrances.find(d=>d.id===s.scene);
  $("#place").textContent = s.status === 2 ? "山河万里 · 江湖" : entrance
    ? destinationLabel({...entrance,name:s.place||entrance.name},sceneEntrances.filter(d=>d.id===s.scene||(journey.explored||[]).includes(d.id)),sceneEntrances)
    : s.place || "一梦入江湖";
  const routeHint = $("#route-notice");
  routeHint.hidden = ![2, 4].includes(s.status) || Date.now() >= routeNoticeUntil ||
    !!currentDialog || !!document.querySelector("dialog[open]");
  if (!routeHint.hidden && routeHint.textContent !== routeNotice) routeHint.textContent = routeNotice;
  $("#scene-note").textContent =
    [2, 4].includes(s.status) && Date.now() < routeNoticeUntil
      ? routeNotice
      : s.status === 5
        ? fightVisual?.skill > 0
          ? (fightVisual.pid === 0 ? "小虾米" : sourceLabel(C.people[fightVisual.pid]["姓名"])) +
            " · " +
            (fightVisual.artName || sourceLabel(C.skills[fightVisual.skill]?.["名称"] || ""))
          : battleSelection ? "战棋 · 摇杆或点亮格预选，确认后行动" : "战棋 · 选择招式与进退"
        : s.status === 2
          ? `江湖行路 · ${s.worldX}，${s.worldY}`
          : s.x !== undefined
            ? "点地面行走 · 点人物或箱子走近查看"
            : "江湖重绘";
  const party = Object.values(s.party || {});
  partyUI.update(party, canExplore() && [2, 4].includes(s.status) && !currentDialog, [2,4].includes(s.status));
  const inv = Object.values(s.inventory || {});
  const clueContext = {loaded: [2, 4, 5].includes(s.status), dv, sv, inventory: inv, party, affinity: journey.growth?.affinity};
  condorClues.update(clueContext);
  feihuClues.update(clueContext);
  xiaoaoClues.update(clueContext);
  yitianClues.update(clueContext);
  tianlongClues.update(clueContext);
  shediaoClues.update(clueContext);
  const hasItem = (id) => inv.some((x) => x.id === id && x.num > 0);
  const homePurseWaiting = !hasItem(174) && (dv(70, 6, 2) === 693 || dv(70, 7, 2) === 700);
  // Original temple events 1001–1014 remove each book from inventory and
  // mark scene 83 slots 11–24 with picture 4664. Count each book only once.
  const placedBooks = Array.from({ length: 14 }, (_, i) => dv(83, 11 + i, 5) === 4664);
  const placed = placedBooks.filter(Boolean).length;
  const books = placedBooks.filter((isPlaced, i) => isPlaced || hasItem(144 + i)).length;
  $("#bookcount").textContent = `天书　${books ? hanNumber(books) : "〇"} / 十四${placed ? ` · 已归位 ${hanNumber(placed)}` : ""}`;
  $("#records").textContent =
    s.morality === undefined
      ? "原版故事，逐步重绘。"
      : `品德 ${s.morality}　声望 ${s.reputation}\n银两 ${inv.find((x) => x.id === 174)?.num || 0}`;
  let objective;
  if (s.status === 7 && events.includes("oldevent_1017.lua")) {
    objective = pendingHomecoming==='stay' ? "归路已定：留在江湖。门已封上，可返回首页。" : pendingHomecoming==='return' ? "归路已定：回去。门已封上，可返回首页。" : "十四天书之旅已完成，一梦归来。可返回首页，继续体验其他江湖路线。";
  } else if (placed === 14) {
    objective = hasItem(143)
      ? "圣堂告别已毕。前往归梦之门，走完这一程。"
      : sv(83, 18, 25, 1) > 0 && sv(83, 18, 26, 1) > 0
        ? "最终挑战已过。沿圣堂左侧向下走，与故人告别。"
        : s.scene === 83
          ? "十四天书已经归位，沿圣堂新开启的通道寻找归途。"
          : "十四天书已经归位。从江湖图前往霹雳堂，再经地下入口回到圣堂。";
  } else if (s.scene === 83) {
    objective = "从“附近”选择天书台，走近后打开“物品 → 剧情物品”，使用对应天书。";
  } else if (hasItem(164)) {
    objective = dv(76, 5, 3) === 685
      ? "用绿钥匙打开霹雳堂内的门，再调查门后房间，寻找圣堂入口。"
      : dv(76, 6, 2) === 688
        ? "霹雳堂的门已打开。调查门后房间的机关，寻找地下入口。"
        : "霹雳堂的地下入口已打开，从“附近 → 循路深入”进入圣堂。";
  } else if (hasItem(143)) {
    // Source E678 (first talk) arms E686 as 孔八拉's use-item event; only showing him the staff yields the green key.
    objective = dv(76, 1, 3) === 686
      ? "孔八拉的父亲与金先生有旧。走近他，打开“物品 → 剧情物品”，向他出示武林神杖。"
      : "已取得武林神杖，去霹雳堂向孔八拉打听圣堂的下落。";
  } else if (hasItem(189)) {
    objective = "携武林帖参加华山武道大会，争取取得武林神杖。";
  } else if (books === 14) {
    // 155d: the source letter needs 声望 200; the required chain alone ends near 198. Name the gap and the
    // optional villain fights that are still armed (source events, all 败=死) so the player is not left guessing.
    const ways = [];
    if (dv(48, 0, 2) === 450) ways.push("铁掌山裘千仞");
    if (dv(35, 0, 2) === 546) ways.push(dv(35, 3, 2) === 551 ? "星宿海丁春秋（门人挡路，须先随虚竹去擂鼓山）" : "星宿海丁春秋");
    if (dv(26, 0, 2) === 321 || dv(26, 1, 2) === 321) ways.push("黑木崖向任我行讨《葵花宝典》");
    objective = s.reputation >= 200
      ? "十四天书已齐。回家查看邀请；领取后将独自赴会，直到圣堂都无人同行。圣堂一战对手不止一位，宜先备好能顾及多人的武功、装备与药品。"
      : `十四天书已齐。声望还差 ${200 - s.reputation} 点，武林大会才会发来邀请。` +
        (ways.length ? `可挑战：${ways.join("、")}（败则身死，先存档）。` : "继续行走江湖、行侠仗义。");
  } else if (dv(40, 7, 2) === 14 && dv(40, 7, 5) === 6410 && !party.some((p) => p.id === 38)) {
    objective = "石破天已经下山。腾出队伍位置后，可去悦来客栈邀他同行。";
  } else if (!books && !s.unlocked && dv(1, 1, 2) === 667) {
    // 首程：店小二 E666 指路后把自己的事件改成 667（原版 instruct_3）；南贤 E821 开放场景 0 之前目标栏原本不变。
    objective = "店小二指了路：出客栈往西南走，路边圆形记号附近是南贤住处。先向他请教江湖消息；江湖图可重返你已经到访的地方。";
  } else if (journey.cycle === 1 && !journey.trial && s.unlocked && !books &&
      !party.some(p => p.id !== 0) && dv(61, 0, 2) === 476 &&
      (journey.explored || []).every(id => [70, 1, 64].includes(id))) {
    // 只给尚未另择去处的新手一句建议；到访别处、结伴或见过段誉即退回通用目标，不以招募成功为条件。
    objective = "若暂无线索，可去南贤居地图左上方的高昇客栈听听江湖见闻，也可自行寻访。";
  } else {
    objective = books
      ? `已寻得${hanNumber(books)}部天书，尚余${hanNumber(14 - books)}部。循着手札中的见闻，继续探寻身世与归途。`
      : s.unlocked
        ? "循着江湖见闻寻访天书，探寻身世与归途。已知线索记在下方手札。"
      : homePurseWaiting
        ? (s.scene === 70 && s.status === 4 ? "先打开屋中木柜，带上盘缠和药物，再去对面客栈问路。" : "身上还没带盘缠，先回小虾米居打开木柜，再到客栈问路。") + "卧榻可免费歇宿，恢复气血、内力并存档。"
        : "到对面河洛客栈找店小二问路，寻找南贤。家中卧榻可免费恢复气血、内力并存档。";
  }
  // 未带盘缠且家中银柜仍可取时先指回家；问路后指南贤，拜访后让玩家自行探索。
  const guideScene = !books && !s.unlocked ? (dv(1, 1, 2) === 667 ? 64 : homePurseWaiting ? 70 : 1) : -1, guide = C.scenes?.[guideScene];
  openingGuide = guide ? {x: guide["外景入口X1"], y: guide["外景入口Y1"], label: guideScene === 64 ? "南贤居" : guideScene === 70 ? "小虾米居" : "河洛客栈"} : null;
  $("#objective").textContent = objective;
}
function loadPage(pack, page) {
  const key = pack + "-" + page;
  if (images.has(key)) return images.get(key);
  const im = new Image();
  images.set(key, im);
  im.src = "assets/" + key + ".png";
  im.onload = () => {
    if (lastFrameArgs && !currentDialog) {
      render(...lastFrameArgs);
      present();
    }
  };
  return im;
}
function pic(pack, n, x, y, absolute = false, actorMovement = movementVisual, target = g, equipment) {
  if (pack === "hdgrp" && echoVisual?.realRecord && !echoVisual.revealed && echoPortraitId === echoVisual.enemyId) {
    // Only while source WarShowHead/ShowPersonStatus_sub draws the shadow's own head; hero keeps real head 0 elsewhere.
    const hp = A[pack]?.frames[Math.floor(n)];
    if (hp) drawMaskedPortrait(target, x - (absolute ? 0 : hp[5]), y - (absolute ? 0 : hp[6]), hp[3], hp[4]);
    return;
  }
  if (!absolute && drawBattleActor(target, pack, Math.floor(n), x, y + (mode === "battle" ? BATTLE_SOLE_DROP : 0), fightVisual, actorMovement,equipment))
    return;
  if (!absolute && drawProp(target, pack, Math.floor(n), x, y)) return;
  const p = A[pack]?.frames[Math.floor(n)];
  if (!p) return;
  if (
    pack === "hdgrp" &&
    drawCanvasPortrait(
      target,
      Math.floor(n),
      x - (absolute ? 0 : p[5]),
      y - (absolute ? 0 : p[6]),
      p[3],
      p[4],
      portraitAppearance(Math.floor(n)),
    )
  )
    return;
  const [page, sx, sy, w, h, xo, yo] = p,
    im = loadPage(pack, page);
  if (!im.complete || !im.naturalWidth) return;
  target.drawImage(im, sx, sy, w, h, x - (absolute ? 0 : xo), y - (absolute ? 0 : yo), w, h);
}
function drawMaskedPortrait(t, x, y, w, h) {
  // Neutral hooded silhouette; no facial features, no reference to any real head id.
  const cx = x + w / 2, s = Math.min(w, h);
  t.save();
  t.fillStyle = "#1a1c22"; t.fillRect(x, y, w, h);
  t.fillStyle = "#3a3d47";
  t.beginPath(); t.moveTo(cx - s * .38, y + h); t.quadraticCurveTo(cx - s * .42, y + s * .22, cx, y + s * .1); t.quadraticCurveTo(cx + s * .42, y + s * .22, cx + s * .38, y + h); t.closePath(); t.fill();
  t.fillStyle = "#0e0f13";
  t.beginPath(); t.ellipse(cx, y + s * .46, s * .17, s * .21, 0, 0, Math.PI * 2); t.fill();
  t.strokeStyle = "#91b9d6"; t.lineWidth = 1;
  t.beginPath(); t.moveTo(cx - s * .1, y + s * .43); t.lineTo(cx + s * .1, y + s * .43); t.stroke();
  t.restore();
}
let inkCanvas;
function inkMasked(left, top, w, h, draw) {
  // Draw the unit into a small offscreen canvas sized to the actual frame, then source-in an ink fill so only the silhouette remains.
  inkCanvas ||= document.createElement("canvas");
  if (inkCanvas.width < w) inkCanvas.width = w;
  if (inkCanvas.height < h) inkCanvas.height = h;
  const o = inkCanvas.getContext("2d");
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = "source-over";
  o.clearRect(0, 0, inkCanvas.width, inkCanvas.height);
  o.translate(-left, -top);
  draw(o);
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = "source-in";
  o.fillStyle = "#1a1c22";
  o.fillRect(0, 0, w, h);
  o.globalCompositeOperation = "source-over";
  g.drawImage(inkCanvas, 0, 0, w, h, left, top, w, h);
}
// vfx 394: the struck figure's silhouette in one flat colour, drawn at four 1 px offsets behind the body.
function hitOutline(left, top, w, h, draw, color, alpha) {
  inkCanvas ||= document.createElement("canvas");
  if (inkCanvas.width < w) inkCanvas.width = w;
  if (inkCanvas.height < h) inkCanvas.height = h;
  const o = inkCanvas.getContext("2d");
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = "source-over";
  o.clearRect(0, 0, inkCanvas.width, inkCanvas.height);
  o.translate(-left, -top);
  draw(o);
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = "source-in";
  o.fillStyle = color;
  o.fillRect(0, 0, w, h);
  o.globalCompositeOperation = "source-over";
  g.save();g.globalAlpha *= Math.min(.35, alpha);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(inkCanvas, 0, 0, w, h, left + dx, top + dy, w, h);
  g.restore();
}
function diamond(x, y, fill, stroke, inset = 1) {
  const grid = mode === "battle" ? BATTLE_GRID : CLASSIC_GRID;
  const hw = grid.halfWidth * inset, hh = grid.halfHeight * inset;
  g.beginPath();
  g.moveTo(x, y - hh);
  g.lineTo(x + hw, y);
  g.lineTo(x, y + hh);
  g.lineTo(x - hw, y);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = mode === "battle" ? 1.15 : 0.65;
    g.stroke();
  }
}
// ui394 手机 QA F4：攻击格原是 #f2b75a70 淡金填色加同色细边，压在浅沙地上几乎看不见。
// 改为稍深的琥珀填色，外描一道暗褐边、内叠一道亮金边：沙地上靠暗边、草地上靠亮边，都看得清；不加外发光。
// 范围中心格与单体目标格（唯一亮格）用更亮更粗的一档。
function attackCell(x, y, strong) {
  const hw = BATTLE_GRID.halfWidth * .94, hh = BATTLE_GRID.halfHeight * .94;
  g.save();
  g.beginPath();
  g.moveTo(x, y - hh);
  g.lineTo(x + hw, y);
  g.lineTo(x, y + hh);
  g.lineTo(x - hw, y);
  g.closePath();
  g.fillStyle = strong ? "#ffc35aa6" : "#eaa1408a";
  g.fill();
  g.lineJoin = "round";
  g.strokeStyle = "rgba(62,30,6,.85)";
  g.lineWidth = strong ? 3.4 : 2.8;
  g.stroke();
  g.strokeStyle = strong ? "#fff3c2" : "#ffd889";
  g.lineWidth = strong ? 1.6 : 1.2;
  g.stroke();
  g.restore();
}
function groundPic(pack, id, px, py, x, y, scene = -1) {
  const frame = A[pack]?.frames[Math.floor(id)];
  if (
    frame &&
    paintWinter(
      g,
      pack,
      id,
      loadPage(pack, frame[0]),
      frame,
      px,
      py,
      x,
      y,
      scene === 0 || (pack === "wmap" && currentBattleMap === 0),
    )
  )
    return;
  if (
    !(
      (pack === "smap" || pack === "wmap") &&
      frame &&
      paintMaterial(
        g,
        pack === "wmap"
          ? currentBattleMap === 1 && lastSnapshot.scene === 37
            ? 37
            : currentBattleMap === 24 && lastSnapshot.scene === 51
            ? 51
            : ({ 1: 50, 2: 24, 3: 12, 5: 56, 16: 5, 17: 7, 22: 36, 24: 63 }[currentBattleMap] ?? -1)
          : scene,
        id,
        loadPage(pack, frame[0]),
        frame,
        px,
        py,
        x,
        y,
      )
    )
  )
    pic(pack, id, px, py);
  if (frame) paintWater(g, pack, id, loadPage(pack, frame[0]), frame, px, py, x, y);
}
// Tom 2026-09-27：场景补缺。原版地图边角常留一两格地面、建筑、空中三层皆空的格子，画出来是黑洞、
// 夹在地面间的黑线，边上的零碎地块也因此像浮在空中。只在绘制时补：空格沿 x 或 y 方向所在的空段
// 不超过 3 格、两端都是地面，就借四邻（不够再取空段两端）最常见的非水地面图补上。通行与事件仍按原数据。
// window.__jyRawGround = true 可临时看回原样（仅供对照截图）。
let groundPatch = null;
function patchedGround(sid) {
  const key = `${sid}:${terrainRevision}:${sceneryRevision}`;
  if (groundPatch?.key === key) return groundPatch.cells;
  const ground = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 64 ? sv(sid, x, y, 0) : 0;
  const empty = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 64 &&
    sv(sid, x, y, 0) <= 0 && sv(sid, x, y, 1) <= 0 && sv(sid, x, y, 2) <= 0;
  const cells = new Int16Array(4096);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    cells[y * 64 + x] = ground(x, y);
    if (!empty(x, y)) continue;
    const ends = [];
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      let a = 1, b = 1;
      while (a <= 3 && empty(x - dx * a, y - dy * a)) a++;
      while (b <= 3 && empty(x + dx * b, y + dy * b)) b++;
      const l = ground(x - dx * a, y - dy * a), r = ground(x + dx * b, y + dy * b);
      if (a + b - 1 <= 3 && l > 0 && r > 0) ends.push(l, r);
    }
    // 贴着水的缺口不补：补进去的是带岸线的过渡图块，会在水面上留下一截浮岸（审查确认的唯一回退）。
    if (!ends.length || DIRECTIONS.some(([dx, dy]) => isWater(ground(x + dx, y + dy))) || ends.some(isWater)) continue;
    const near = DIRECTIONS.map(([dx, dy]) => ground(x + dx, y + dy)).filter(n => n > 0);
    const pick = [near, ends].map(list => list.filter(n => !isWater(n))).find(list => list.length);
    if (!pick) continue;
    const count = new Map();
    for (const n of pick) count.set(n, (count.get(n) || 0) + 1);
    cells[y * 64 + x] = [...count].sort((p, q) => q[1] - p[1])[0][0];
  }
  groundPatch = {key, cells};
  return cells;
}
function drawGround(kind, pack, sid, cx, cy, cells, viewX, viewY) {
  const margin = kind === "battle" ? 128 : 96, scale = view.scale;
  const {halfWidth:hw, halfHeight:hh, terrainScale, mapOffsetY} = kind === "battle" ? BATTLE_GRID : CLASSIC_GRID;
  const res = scale * (kind === "battle" ? battleZoom : 1);
  const rawGround = window.__jyRawGround === true;
  const key = `${kind}:${sid}:${currentBattleMap}:${terrainRevision}:${kind === "scene" ? sceneryRevision : 0}:${rawGround}:${view.width}:${view.height}:${res}`;
  let shiftX = groundCache ? hw * (groundCache.cx - cx - groundCache.cy + cy) : 0;
  let shiftY = groundCache ? hh * (groundCache.cx - cx + groundCache.cy - cy) : 0;
  if (!groundCache || groundCache.key !== key || Math.abs(shiftX) > 54 || Math.abs(shiftY) > 54) {
    const canvas = groundCache?.canvas || document.createElement("canvas");
    canvas.width = (view.width + margin * 2) * res;
    canvas.height = (view.height + margin * 2) * res;
    const terrain = canvas.getContext("2d");
    terrain.scale(res, res);
    terrain.translate(margin, margin);
    terrain.imageSmoothingEnabled = false;
    const screen = g, patch = kind === "scene" && !rawGround ? patchedGround(sid) : null;
    try {
      g = terrain;
      // 157：水面按整张缓存一次合成（water.js 注释）。地面全部画完再合成水，最后才画地表物，
      // 水就不会盖到岩石与岸边装饰上。
      beginWaterBatch();
      for (const {x, y, px, py} of cells) {
        const n = kind === "world" ? world.earth[y * 480 + x] : kind === "scene" ? (patch && x >= 0 && y >= 0 && x < 64 && y < 64 ? patch[y * 64 + x] : sv(sid,x,y,0)) : wv(x,y,0);
        if (n > 0) {
          g.save();
          g.translate(px-viewX,py-viewY+mapOffsetY);g.scale(terrainScale,terrainScale);
          groundPic(pack,n / 2,0,0,x,y,kind === "scene" ? sid : -1);
          g.restore();
        }
      }
      flushWaterBatch(terrain);
      if (kind === "world") {
        beginWaterBatch();
        for (const {x, y, px, py} of cells) {
          const n = world.surface[y * 480 + x];
          if (n > 0) groundPic(pack,n / 2,px-viewX,py-viewY,x,y);
        }
        flushWaterBatch(terrain);
      }
    } finally { flushWaterBatch(terrain); g = screen; }
    groundCache = {canvas, key, cx, cy};
    shiftX = shiftY = 0;
  }
  g.drawImage(groundCache.canvas, -margin + shiftX + viewX, -margin + shiftY + viewY,
    view.width + margin * 2, view.height + margin * 2);
}
function scenePic(id, px, py, x, y, sid, target = g) {
  const frame = A.smap?.frames[Math.floor(id)];
  if (
    frame &&
    paintWinter(target, "smap", id, loadPage("smap", frame[0]), frame, px, py, x, y, sid === 0, true)
  )
    return;
  if (!(frame && paintMaterial(target, sid, id, loadPage("smap", frame[0]), frame, px, py, x, y, true)))
    pic("smap", id, px, py, false, movementVisual, target);
}
function oldHuangDeskPart(x, y, layer, n) {
  if (y !== 32) return false;
  return layer === 1
    ? (x === 38 && n === 2926) || (x === 39 && n === 2928) || (x === 40 && n === 2930)
    : (x === 39 && n === 4958) || (x === 40 && n === 4960);
}
function sceneOverlays(sid, x, y, px, py, furniture, occludes, heroPic, replaceHuangDesk) {
  const original = sv(sid, x, y, 2),
    n = replaceHuangDesk && oldHuangDeskPart(x, y, 2, original) ? 0 : original,
    event = sv(sid, x, y, 3),
    z = sv(sid, x, y, 4);
  if (n > 0) {
    const overlayZ = sv(sid, x, y, 5);
    if (furniture) {
      // Test this rendered piece only. A front piece must not also fade the
      // pieces behind the actor, or empty regions of the shared object bounds.
      const b = furniturePartBounds(furniture.shape, furniture.part);
      const faded = furniture.occluder && occludes(x, y, b, px, py - overlayZ,
        target => drawFurnitureSprite(target, furniture.shape, furniture.part, px, py - overlayZ));
      g.save();
      if (faded) {
        g.globalAlpha = 0.34;
        occlusions.push({ id: n / 2, x, y, layer: 2 });
      }
      drawFurnitureSprite(g, furniture.shape, furniture.part, px, py - overlayZ);
      g.restore();
      furnitureDraws.push({
        index: furniture.index,
        file: furniture.file,
        id: n / 2,
        x,
        y,
        part: furniture.part,
        leader: furniture.leader,
        layer: 2,
        faded: !!faded,
      });
    } else {
      const bounds = propSpriteBounds("smap", n / 2) || A.smap.frames[n / 2]?.slice(3, 7);
      const faded = occludes(x, y, bounds, px, py - overlayZ,
        target => scenePic(n / 2, px, py - overlayZ, x, y, sid, target));
      g.save();
      if (faded) { g.globalAlpha = 0.34; occlusions.push({id:n / 2, x, y, layer:2}); }
      scenePic(n / 2, px, py - overlayZ, x, y, sid);
      g.restore();
    }
  }
  if (sid===70 && journey.homestead?.room && event>=190 && event<=195 && dv(sid,event,2)===12811+event) {
    const entry=journey.homestead.display?.[event-189],id=entry&&hasWeaponModel(entry.id)?entry.id:null;
    const draw=target=>drawWeaponRack(target,id,px,py-z);
    const faded=occludes(x,y,[68,44,34,40],px,py-z,draw);
    g.save();if(faded){g.globalAlpha=.34;occlusions.push({id:'weapon-rack',x,y});}draw(g);g.restore();return;
  }
  if (event >= 0 && innSign(sid,event,dv(sid,event,2))) {
    const paint=target=>drawInnBoard(target,px,py-z);
    const faded=occludes(x,y,INN_BOARD_BOUNDS,px,py-z,paint);
    g.save();if(faded)g.globalAlpha=.34;paint(g);g.restore();return;
  }
  if (event >= 0) {
    // The later standing portrait replaces the seated two-tile figure in Mei Manor.
    if (sid === 55 && (event === 5 || event === 6) && dv(sid, 8, 0) === 1 && dv(sid, 8, 7) === 6048) return;
    const p = dv(sid, event, 7);
    const linked =
      sid === 46
        ? { sourcePull: heroPic >= 3932 && heroPic <= 3982 }
        : sid === 7
          ? { condor: dv(sid, 4, 7) / 2, serpent: dv(sid, 5, 7) / 2 }
          : sid === 16
            ? {
                jinlun: [2, 3, 4].every(
                  (e) =>
                    dv(sid, e, 7) === (3404 + e) * 2 &&
                    dv(sid, e, 9) === 27 + e &&
                    dv(sid, e, 10) === 11 &&
                    sv(sid, 27 + e, 11, 3) === e &&
                    sv(sid, 27 + e, 11, 4) === 4,
                ),
              }
            : sid === 40
              ? {
                  linghuJade: dv(sid, 3, 2) === 243 || linghuJadeAccepted,
                  shiSeated: [7, 8].every(
                    (e) =>
                      dv(sid, e, 7) === (3198 + e) * 2 &&
                      dv(sid, e, 9) === 24 + e &&
                      dv(sid, e, 10) === 22 &&
                      sv(sid, 24 + e, 22, 3) === e &&
                      sv(sid, 24 + e, 22, 4) === 4,
                  ),
                }
              : null;
    if (p > 0 && !drawSceneActor(g, sid, event, p / 2, px, py - z, {...linked,head:sceneTargets.find(t=>t.id===event&&t.sourcePic===p)?.head,name:sceneTargets.find(t=>t.id===event)?.name}))
      scenePic(p / 2, px, py - z, x, y, sid);
  }
}
function render(kind, ...args) {
  lastFrameArgs = [kind, ...args];
  const now = performance.now();
  if (kind === "world") walkMotion.update({map:kind, x:args[0],y:args[1],cx:args[0],cy:args[1],pic:args[2]}, now);
  else if (kind === "scene") walkMotion.update({map:`scene:${args[0]}`,x:args[1],y:args[2],cx:args[1]+args[3],cy:args[2]+args[4],pic:args[5]}, now);
  else walkMotion.clear();
  paintFrame(kind, ...args);
  if (walkMotion.sample(now)?.active && !motionRequest && !document.hidden)
    motionRequest = requestAnimationFrame(animateWalk);
  if (kind === "battle" && args[0] === 4 && args[5] >= 0 && fightVisual && !reducedMotion.matches && !vfxRequest && !document.hidden)
    vfxRequest = requestAnimationFrame(animateFightVfx);
}
// 157：出招期间原生帧约 14 帧/秒；在两帧之间按实测帧长插值重绘（≤30 帧/秒），直到 Lua 送来下一帧或特效结束。
// 只是同一组参数重画，与等待操作时的 animateBattlePulse 同理，不推进任何规则。
const vfxClock = {pic: NaN, at: 0, dur: 70};
let vfxRequest = 0, lastVfxPaint = 0;
function vfxPic(pic) {
  const now = performance.now();
  if (pic !== vfxClock.pic) {
    if (pic === vfxClock.pic + 1 && now - vfxClock.at < 400) vfxClock.dur = Math.max(35, Math.min(160, now - vfxClock.at));
    vfxClock.pic = pic; vfxClock.at = now;
  }
  return reducedMotion.matches ? pic : pic + Math.min(.95, (now - vfxClock.at) / vfxClock.dur);
}
function animateFightVfx(now) {
  vfxRequest = 0;
  const a = lastFrameArgs;
  if (dead || document.hidden || !fightVisual || a?.[0] !== "battle" || a[1] !== 4 || !(a[6] >= 0)) return;
  if (now - vfxClock.at > vfxClock.dur * 1.2) return; // Lua is late or finished: hold the last pose.
  if (now - lastVfxPaint >= 33) { lastVfxPaint = now; paintFrame(...a); present(); }
  vfxRequest = requestAnimationFrame(animateFightVfx);
}
function animateWalk() {
  motionRequest = 0;
  if (dead || currentDialog || document.hidden || !["world","scene"].includes(mode)) return;
  paintFrame(...lastFrameArgs);
  present();
  if (walkMotion.sample(performance.now())?.active) motionRequest = requestAnimationFrame(animateWalk);
}
function paintFrame(kind, ...args) {
  occlusions = [];
  furnitureDraws = [];
  wheelVolley = null;
  mode = kind;
  g.save();
  g.fillStyle = "#1b2b21";
  g.fillRect(0, 0, view.width, view.height);
  if (kind === "title") {
    const grad = g.createLinearGradient(0, 0, view.width, view.height);
    grad.addColorStop(0, "#526451");
    grad.addColorStop(1, "#132c25");
    g.fillStyle = grad;
    g.fillRect(0, 0, view.width, view.height);
    if (titleImage.complete && titleImage.naturalWidth) {
      const scale = Math.max(view.width / titleImage.width, view.height / titleImage.height);
      g.drawImage(
        titleImage,
        (view.width - titleImage.width * scale) / 2,
        (view.height - titleImage.height * scale) / 2,
        titleImage.width * scale,
        titleImage.height * scale,
      );
      g.fillStyle = "#19352750";
      g.fillRect(0, 0, view.width, view.height);
    }
    g.restore();
    return;
  }
  let cx,
    cy,
    hero,
    sid,
    flag = 0,
    v1,
    v2,
    v3,
    fxPic = null,
    zoomedFrame = false;
  if (kind === "scene") {
    [sid, cx, cy, v1, v2, hero] = args;
    currentScene = sid;
    cx += v1;
    cy += v2;
  } else if (kind === "world") {
    [cx, cy, hero] = args;
  } else {
    [flag, cx, cy, v1, v2, v3] = args;
    // 157：出招特效走帧间插值的时钟（vfxPic），并在命中后按招式轻重做一次衰减震屏（减少动效时为 0）。
    if (flag === 4 && v3 >= 0 && fightVisual) {
      fxPic = vfxPic(v3 / 2);
      const s = vfxShake(fightVisual, fxPic, {reducedMotion: reducedMotion.matches,
        crit: pendingOutcomes.some(o => o.kind === 'critical'), cells: pendingOutcomes.length || 1});
      if (s.x || s.y) g.translate(s.x, s.y);
    }
    if (battleZoom !== 1) { g.save(); zoomedFrame = true; g.translate(view.centerX, view.centerY); g.scale(battleZoom, battleZoom); g.translate(-view.centerX, -view.centerY); }
    if (movementVisual && (movementVisual.x !== cx || movementVisual.y !== cy)) {
      movementVisual.fromX = movementVisual.x;
      movementVisual.fromY = movementVisual.y;
      movementVisual.tilePhase = 0;
      movementVisual.x = cx;
      movementVisual.y = cy;
      movementVisual.step++;
    }
  }
  const {halfWidth:hw, halfHeight:hh, terrainScale} = kind === "battle" ? BATTLE_GRID : CLASSIC_GRID;
  camera = { x: cx, y: cy };
  // Interpolate the presentation of the registered eight-phase tile movement.
  // Integer map coordinates, path decisions and movement costs stay in Lua.
  let viewX = 0,
    viewY = 0;
  const walk = ["world", "scene"].includes(kind) ? walkMotion.sample(performance.now()) : null;
  let heroOffsetX = 0, heroOffsetY = 0;
  if (walk) {
    viewX = hw * (cx - walk.cx - cy + walk.cy);
    viewY = hh * (cx - walk.cx + cy - walk.cy);
    const hx = kind === "scene" ? cx - v1 : cx, hy = kind === "scene" ? cy - v2 : cy;
    heroOffsetX = hw * (walk.x - hx - walk.y + hy);
    heroOffsetY = hh * (walk.x - hx + walk.y - hy);
    camera = {x:walk.cx,y:walk.cy};
    if (!remastered && hero >= 2501 && hero < 2529)
      hero = 2501 + Math.floor((hero - 2501) / 7) * 7 + (walk.active ? 1 + Math.floor(walk.phase * 6) : 0);
  }
  if (
    kind === "battle" &&
    ([0, 9, 58, 59, 35, 50].includes(movementVisual?.pid) || isBeggarFighter(movementVisual?.pid)) &&
    movementVisual.fromX !== undefined
  ) {
    const remaining = 1 - (movementVisual.tilePhase + 1) / 4;
    const dx = (movementVisual.fromX - cx) * remaining;
    const dy = (movementVisual.fromY - cy) * remaining;
    viewX = -hw * (dx - dy);
    viewY = -hh * (dx + dy);
    movementVisual.viewOffset = [viewX, viewY];
  }
  let cells = [];
  const marginX = kind === "battle" ? 240 : 180, marginY = kind === "battle" ? 250 : 190;
  // 战斗镜头以屏幕中心放大 battleZoom 倍，实际可见的逻辑区域四边各缩进 inset；裁剪按可见区域算，边距不变。
  const insetX = kind === "battle" ? view.centerX * (1 - 1 / battleZoom) : 0, insetY = kind === "battle" ? view.centerY * (1 - 1 / battleZoom) : 0;
  const reach = Math.ceil((view.centerX + marginX) / (hw*2) + (view.centerY + marginY) / (hh*2));
  for (let dy = -reach; dy <= reach; dy++)
    for (let dx = -reach; dx <= reach; dx++) {
      const x = cx + dx,
        y = cy + dy,
        px = view.centerX + hw * (dx - dy) + viewX,
        py = view.centerY + hh * (dx + dy) + viewY;
      if (px < insetX - marginX || px > view.width - insetX + marginX || py < insetY - 100 || py > view.height - insetY + marginY) continue;
      if (
        x < 0 ||
        y < 0 ||
        x >= (kind === "world" ? 480 : 64) ||
        y >= (kind === "world" ? 480 : 64)
      )
        continue;
      cells.push({ x, y, px, py });
    }
  cells.sort((a, b) => a.x + a.y - b.x - b.y || a.x - b.x);
  const pack = kind === "world" ? "mmap" : kind === "scene" ? "smap" : "wmap";
  const furniturePlans =
    kind === "scene" && furnitureAvailable()
      ? sceneFurniture(sid, sceneryRevision, (x, y, layer) => sv(sid, x, y, layer))
      : null;
  const furniturePlan = furniturePlans?.solid, decorationPlan = furniturePlans?.decoration;
  const hx = kind === "scene" ? cx - v1 : cx,
    hy = kind === "scene" ? cy - v2 : cy;
  const heroPosition = hero >= 0 && kind !== "battle" ? [hx, hy,
    view.centerX + hw * (hx - cx - hy + cy) + viewX + heroOffsetX,
    view.centerY + hh * (hx - cx + hy - cy) + viewY + heroOffsetY -
      (kind === "scene" ? sv(sid, hx, hy, 4) : 0)] : null;
  const heroOccludes = prepareOcclusion(heroPosition, target => {
    const [, , px, py] = heroPosition;
    if (kind === "scene" && drawGoldPull(target, sid, hero, px - heroOffsetX, py - heroOffsetY)) return;
    if (!drawHero(target, hero, px, py, kind === "world", walk))
      pic(pack, hero, px, py, false, movementVisual, target);
  }, kind === "world" ? 0.75 : 1);
  // Register a fighter's actual drawn pose as we reach it in depth order.
  // Scenery encountered earlier is behind that fighter and cannot fade for it.
  const battleOccludes = [];
  drawGround(kind, pack, sid, cx, cy, cells, viewX, viewY);
  // vfx 394: one cast = depth-sorted layers (floor / behind and over the caster / between the fighters /
  // behind and in front of each struck fighter / front), anchored at the caster's actually drawn pose;
  // the wind-up (v3 < 0, actor frames before contact) is drawn too.
  const vfxLayers = kind === "battle" && flag === 4 && fightVisual ? battleVfxLayers(cx, cy, v1, v2, v3, fxPic, cells, hw, hh) : null;
  vfxLayers?.ground();
  // 157（Tom 2026-09-24「地面要不要用半透明网格」）：可站立的地面格画一层淡网格，便于判断彼此距离；
  // 选格时略亮，出招动画（flag 4）时隐去不抢画面。亮线下垫一道暗线，深浅地面都看得见。
  if (kind === "battle" && flag !== 4 && battleGridPref) {
    const a = battleSelection || flag === 1 || flag === 2 || flag === 3 ? .26 : .18;
    g.save();g.beginPath();
    for (const { x, y, px, py } of cells) if (wv(x, y, 0) > 0 && wv(x, y, 1) <= 0) {
      // 回到起点用 lineTo 而非 closePath：Chrome 里上千个 closePath 子路径随数量平方变慢。
      g.moveTo(px, py - hh);g.lineTo(px + hw, py);g.lineTo(px, py + hh);g.lineTo(px - hw, py);g.lineTo(px, py - hh);
    }
    g.lineWidth = 1.2;g.strokeStyle = `rgba(0,0,0,${a * .75})`;g.translate(0, .7);g.stroke();
    g.translate(0, -.7);g.strokeStyle = `rgba(255,246,222,${a})`;g.stroke();g.restore();
  }
  for (const { x, y, px, py } of cells) {
    if (kind === "battle" && (flag === 1 || flag === 2) && wv(x, y, 3) < 128)
      diamond(px, py, x === v1 && y === v2 ? "#ffdda7b0" : "#aed2b744", "#d3e7ba99");
    // Mark the same layer that the source damage resolver will consume.
    if (kind === "battle" && isAttackPreview() && !battleSelection.locked && wv(x, y, 4) > 0) {
      const center = battleSelection.kind === "area" && x === v1 && y === v2;
      attackCell(px, py, center || battleSelection.kind === "target");
    }
    // 157：脚下分敌我——同伴青绿、敌人暗红（原先敌我同一个灰网点菱形，分不清）。
    if (kind === "battle" && wv(x,y,2) >= 0) {
      const c = lastSnapshot.combatants?.[wv(x,y,2) + 1];
      if (c && !c.dead) {
        // Tom 2026-09-25：脚下不再画圈（人会像站在圈上），敌我色改由接地阴影和头顶血条带出，见 footShadow。
      }
    }
  }
  // 粒子预算只按被命中的格均分（层 4：2=伤命、3=伤内力），空格只画淡波纹不占预算；与 vfxShake 用命中数的口径一致。
  const fxCells = kind === "battle" && fxPic !== null ? cells.filter(({x, y}) => wv(x, y, 4) >= 2).length || 1 : 1;
  const replaceHuangDesk = kind === "scene" && sid === 55 && hasHuangQinArt() &&
    dv(55, 13, 7) >= 5810 && dv(55, 13, 7) <= 5834 && sv(55, 39, 32, 3) === 13;
  // 头顶一层（血条、行动箭头、招式名、会心/闪避）在所有人物与特效之后统一画，前排人物不会挡住后排的血条。
  const overheads = [];
  for (const { x, y, px, py } of cells) {
    vfxLayers?.at(x, y, wv(x, y, 4));
    if (kind === "world") {
      const n = world.building[y * 480 + x];
      if (n > 0) {
        const faded = heroOccludes(x, y, A.mmap.frames[n / 2]?.slice(3, 7), px, py,
          target => pic(pack, n / 2, px, py, false, movementVisual, target));
        g.save();
        if (faded) { g.globalAlpha = 0.34; occlusions.push({id:n / 2, x, y, layer:"world"}); }
        pic(pack, n / 2, px, py);
        g.restore();
      }
      if (x === cx && y === cy && hero >= 0 && !drawHero(g, hero, px+heroOffsetX, py+heroOffsetY, true, walk))
        pic(pack, hero, px+heroOffsetX, py+heroOffsetY);
      continue;
    }
    if (kind === "scene") {
      const z = sv(sid, x, y, 4),
        n = sv(sid, x, y, 1);
      const furniture = furniturePlan?.get(y * 64 + x);
      const sign=INN_SIGNS[sid],replaceSign=sign && originalInnBoardPart(sid,x,y,n,dv(sid,sign.event,2));
      if (n > 0 && !replaceSign && !(replaceHuangDesk && oldHuangDeskPart(x, y, 1, n))) {
        const id = n / 2,
          frame = A.smap.frames[id],
          bounds = furniture
            ? furniturePartBounds(furniture.shape, furniture.part)
            : propSpriteBounds("smap", id) || frame?.slice(3, 7);
        const obscures = heroOccludes(x, y, bounds, px, py - z, target => {
          if (furniture) drawFurnitureSprite(target, furniture.shape, furniture.part, px, py - z);
          else scenePic(id, px, py - z, x, y, sid, target);
        });
        g.save();
        if (obscures) {
          g.globalAlpha = 0.34;
          occlusions.push({ id, x, y });
        }
        if (furniture) {
          drawFurnitureSprite(g, furniture.shape, furniture.part, px, py - z);
          furnitureDraws.push({
            index: furniture.index,
            file: furniture.file,
            id,
            x,
            y,
            part: furniture.part,
            leader: furniture.leader,
            faded: Boolean(obscures),
          });
        } else scenePic(id, px, py - z, x, y, sid);
        g.restore();
      }
      sceneOverlays(
        sid,
        x,
        y,
        px,
        py,
        decorationPlan?.get(y * 64 + x),
        heroOccludes,
        hero,
        replaceHuangDesk,
      );
      if (x === cx - v1 && y === cy - v2 && hero >= 0) {
        if (!drawGoldPull(g, sid, hero, px, py - z) && !drawHero(g, hero, px+heroOffsetX, py-z+heroOffsetY, false, walk))
          pic(pack, hero, px+heroOffsetX, py-z+heroOffsetY);
      }
      continue;
    }
    const n = wv(x, y, 1);
    if (n > 0) {
      // 墙与摆设随地面一起下移 mapOffsetY（viewport.js 注释），遮挡判定也用同一位置。
      const oy = py + BATTLE_GRID.mapOffsetY;
      const id = n / 2,
        frame = A[pack]?.frames[id];
      const bounds = (propSpriteBounds(pack, id) || frame?.slice(3, 7))?.map(n => n * terrainScale);
      const paintObject = target => {
        if (
          !(
            frame &&
            paintWinter(
              target,
              pack,
              id,
              loadPage(pack, frame[0]),
              frame,
              px,
              oy,
              x,
              y,
              currentBattleMap === 0,
              true,
            )
          ) &&
          !(
            frame &&
            paintMaterial(
              target,
              currentBattleMap === 1 && lastSnapshot.scene === 37
                ? 37
                : currentBattleMap === 24 && lastSnapshot.scene === 51
                ? 51
                : ({ 1: 50, 2: 24, 3: 12, 5: 56, 16: 5, 17: 7, 22: 36, 24: 63 }[currentBattleMap] ?? -1),
              id,
              loadPage(pack, frame[0]),
              frame,
              px,
              oy,
              x,
              y,
              true,
            )
          )
        )
          pic(pack, id, px, oy, false, movementVisual, target);
      };
      const drawObject = target => {
        target.save();target.translate(px,oy);target.scale(terrainScale,terrainScale);target.translate(-px,-oy);
        paintObject(target);target.restore();
      };
      const obscures = battleOccludes.some(test => test(x, y, bounds, px, oy, drawObject));
      g.save();
      if (obscures) {
        g.globalAlpha = 0.34;
        occlusions.push({ id, x, y });
      }
      drawObject(g);
      g.restore();
    }
    if (wv(x, y, 2) >= 0) {
      let p = wv(x, y, 5);
      const moving =
        ([0, 9, 58, 59, 35, 50].includes(movementVisual?.pid) || isBeggarFighter(movementVisual?.pid)) &&
        x === cx &&
        y === cy;
      const actorX = px - (moving ? viewX : 0),
        actorY = py - (moving ? viewY : 0);
      const unit = wv(x,y,2), active = lastSnapshot.combat?.side && unit === lastSnapshot.combat.current;
      const combatant=lastSnapshot.combatants?.[unit+1];
      const equipment=battleUnitEquipment.get(combatant?.id);
      const selected = !!battleSelection && !battleSelection.locked && (
        isAttackPreview() ? !!combatant && !combatant.dead && combatant.side !== lastSnapshot.combat?.side && wv(x,y,4)>0 :
        battleSelection.kind === 'target' && !battleSelection.message && battleSelection.cursor.x === x && battleSelection.cursor.y === y);
      const shadow=!!combatant && (!!echoVisual && (echoVisual.enemyId===combatant.id||echoVisual.extraId===combatant.id) || displayAlias.has(combatant.id));
      const outcome=flag===4?pendingOutcomes.find(o=>o.id===combatant?.id):null;
      // 157：结算先于动画，命中相位（有重制特效时为 VFX_HIT 撞击帧，原生特效为第 0 帧）之前不泄底血量与会心/闪避。
      const hitFrame = fightVisual && fightVisual.kind >= 0 && !(fightVisual.skill === 0 && fightVisual.kind === 0) && vfxRecipe(fightVisual) ? (fightVisual.count - 1) * VFX_HIT : 0;
      const landed = flag === 4 && v3 >= 0 && !!fightVisual && (fxPic ?? v3 / 2) - fightVisual.first - 1 >= hitFrame;
      const frame = A[pack]?.frames[Math.floor(p/2)];
      const size = battleSpriteSize(pack, Math.floor(p/2), fightVisual, null,equipment);
      const height = Math.max(32, (size ? size[3] : frame?.[6]) || 60), fig = figureOf(pack, Math.floor(p/2), equipment, height), head = fig.head;
      actorCue(actorX,actorY,active,selected,head);
      footShadow(actorX, actorY, combatant ? (combatant.side ? 1 : 0) : -1, fig);
      g.save();
      if(shadow){g.globalAlpha=.86;g.shadowColor='#91b9d6';g.shadowBlur=4;}
      if(active && battleFeedbackActive() && !reducedMotion.matches) {
        g.translate(actorX,actorY);g.scale(1,1+Math.sin(performance.now()/430)*.018);g.translate(-actorX,-actorY);
      }
      if(outcome?.kind==='dodge'&&landed)g.translate(reducedMotion.matches?0:Math.sin(performance.now()/80)*3,0);
      // 157：受击后仰——被打中的人都往远离出招者的方向一顿再回位，并闪白一下（原先只有三名角色有受击姿势）。
      // 内力命中（层 4=3：化功/吸星/北冥）同样后仰闪白；受击姿势 drawBattleHurt 仍只给生命命中。
      const hitReact = flag === 4 && v3 >= 0 && fightVisual && (wv(x, y, 4) === 2 || wv(x, y, 4) === 3) && outcome?.kind !== 'dodge'
        ? vfxHitReaction(fightVisual, fxPic ?? v3 / 2, {crit: outcome?.kind === 'critical', reducedMotion: reducedMotion.matches}) : null;
      if (hitReact?.push) {
        const dx = actorX - view.centerX, dy = actorY - view.centerY, d = Math.hypot(dx, dy) || 1;
        g.translate(dx / d * 5 * hitReact.push, dy / d * 2.5 * hitReact.push);
      }
      if(selected) { g.shadowColor='rgba(255,223,140,.85)';g.shadowBlur=10+(reducedMotion.matches?0:Math.sin(performance.now()/320)*3); }
      const drawUnit = (t) => {
        if (flag === 4 && x === cx && y === cy && v2 > 0) pic(packIds[v2] || "wmap", heldStrikeFrame(fightVisual, v1 / 2), px, py, false, movementVisual, t,equipment);
        else if (
          p >= 0 &&
          !drawBattleHurt(
            t,
            pack,
            p / 2,
            actorX,
            actorY + BATTLE_SOLE_DROP,
            flag === 4 && v3 >= 0 && wv(x, y, 4) === 2 && outcome?.kind!=='dodge',
            fightVisual ? v3 / 2 - fightVisual.first - 1 - Math.ceil(hitFrame) : -1,
          )
        )
          // Shared head93 is used by eight opponents in this battle. Only the
          // source current tile receives movement; the others retain their stance.
          pic(pack, p / 2, actorX, actorY, false, x === cx && y === cy ? movementVisual : null, t,equipment);
      };
      if (shadow && echoVisual?.realRecord && !echoVisual.revealed) {
        // Bounds follow whatever drawUnit will actually draw: attack frame (flag 4, v2/v1) or stance frame.
        const attack = flag === 4 && x === cx && y === cy && v2 > 0;
        const mPack = attack ? packIds[v2] || "wmap" : pack, mId = Math.floor((attack ? v1 : p) / 2);
        const mFrame = A[mPack]?.frames[mId];
        const [mw, mh, mx, my] = battleSpriteSize(mPack, mId, fightVisual, x === cx && y === cy ? movementVisual : null,equipment) || (mFrame ? [mFrame[3], mFrame[4], mFrame[5], mFrame[6]] : [48, 64, 24, 60]);
        const mX = attack ? px : actorX, mY = attack ? py : actorY, pad = 12;
        inkMasked(Math.floor(mX - mx - pad), Math.floor(mY - my - pad), Math.ceil(mw + pad * 2), Math.ceil(mh + pad * 2), drawUnit);
      } else {
        // vfx 394: hit/crit feedback is a one-native-frame thin outline BEHIND the body (≤.35), never a white wash.
        if (hitReact?.flash > .02) {
          const hbPack = pack, hbId = Math.floor(p / 2), hbFrame = A[hbPack]?.frames[hbId];
          const [hbw, hbh, hbx, hby] = battleSpriteSize(hbPack, hbId, fightVisual, null, equipment) || (hbFrame ? [hbFrame[3], hbFrame[4], hbFrame[5], hbFrame[6]] : [48, 64, 24, 60]);
          hitOutline(Math.floor(actorX - hbx - 4), Math.floor(actorY - hby - 4), Math.ceil(hbw + 8), Math.ceil(hbh + 8), drawUnit, outcome?.kind === 'critical' ? '#e8b64a' : '#efe4c8', hitReact.flash);
        }
        drawUnit(g);
      }
      g.restore();
      battleOccludes.push(prepareOcclusion([x, y, actorX, actorY], drawUnit));
      if(shadow){g.save();g.strokeStyle='#91b9d6aa';g.beginPath();g.ellipse(actorX,actorY,12,5,0,0,Math.PI*2);g.stroke();g.restore();}
      overheads.push(() => {
      actorArrow(actorX, actorY, active, selected, head);
      // 157：细血条颜色分敌我，三成血以下转色。Tom 2026-09-25 改到头顶：脚下只留接地的东西，不再垫一条血条。
      // 墨韵纸本（Tom 2026-09-27）：漆底泥金细框，与界面漆牌同一做法；我方石绿、敌方朱砂，三成以下我方藤黄、敌方橘色。
      // 敌我两色明暗也拉开（不只靠红绿色相），色弱也分得清。条高 4px，上沿一道亮线。
      if (combatant && !combatant.dead && combatant.maxhp > 0) {
        const w = 26, h = 4, bx = Math.round(actorX - w / 2), by = Math.round(actorY - head - 8);
        let r = Math.max(0, Math.min(1, combatant.hp / combatant.maxhp));
        if (outcome && !landed && Number.isFinite(outcome.before)) r = Math.max(0, Math.min(1, outcome.before / combatant.maxhp));
        const [base, hi] = BATTLE_BAR[combatant.side ? (r > .3 ? 'ally' : 'allyLow') : (r > .3 ? 'foe' : 'foeLow')];
        const fill = Math.round(w * r);
        g.save();
        g.fillStyle = BATTLE_BAR.rim; g.fillRect(bx - 2, by - 2, w + 4, h + 4);
        g.fillStyle = BATTLE_BAR.track; g.fillRect(bx - 1, by - 1, w + 2, h + 2);
        if (fill > 0) { g.fillStyle = base; g.fillRect(bx, by, fill, h); g.fillStyle = hi; g.fillRect(bx, by, fill, 1); }
        g.restore();
      }
      // 157（Tom 2026-09-20）：出招时在**出招者**头顶报一声招式名，像戏里那样。
      // 只报武功，不报普通攻击（编号 0）与暗器（kind<0）；随动画淡出，减少动效时不位移。
      if(fightVisual&&fightVisual.skill>0&&fightVisual.kind>=0&&fightVisual.artName&&combatant&&combatant.id===fightVisual.pid){
        const age=performance.now()-(fightVisual.calloutAt||0),life=1400;
        if(age<life){
          const fade=Math.min(1,Math.max(0,(life-age)/420)),rise=reducedMotion.matches?0:Math.min(10,age/60);
          g.save();g.globalAlpha=fade;g.font='13px "Jianghu Song Small",serif';g.textAlign='center';
          g.strokeStyle='#18342b';g.lineWidth=3;g.fillStyle='#f4e6c4';
          const ty=actorY-head-(outcome&&outcome.kind!=='hit'?28:15)-rise;
          g.strokeText(fightVisual.artName,actorX,ty);g.fillText(fightVisual.artName,actorX,ty);g.restore();
        }
      }
      if(outcome&&outcome.kind!=='hit'&&landed){g.save();g.font='12px "Jianghu Song Small",serif';g.textAlign='center';g.strokeStyle='#18342b';g.lineWidth=3;g.fillStyle=outcome.kind==='critical'?'#ffdb82':'#b8e1dc';const label=outcome.kind==='critical'?'会心':'闪避';g.strokeText(label,actorX,actorY-head-12);g.fillText(label,actorX,actorY-head-12);g.restore();}
      });
      if (flag === 3 && wv(x, y, 4) > 1) diamond(px, py, "#db7e5133", "#dcb28d");
    }
    if (flag === 4 && v3 >= 0 && wv(x, y, 4) > 0) {
      const unit = wv(x, y, 2), hitId = unit >= 0 ? lastSnapshot.combatants?.[unit + 1]?.id : undefined;
      const remade = paintCombatEffect(g, fightVisual, fxPic ?? v3 / 2, px, py, {
        outcome: pendingOutcomes.find(o => o.id === hitId)?.kind ?? null, cells: fxCells, cellX: x, cellY: y,
        sx: view.centerX, sy: view.centerY, reducedMotion: reducedMotion.matches, occupied: wv(x, y, 4) >= 2});
      if (!remade) pic("eft", v3 / 2, px, py);
      if (fightVisual && effectFrames.at(-1)?.pic !== v3 / 2) {
        effectFrames.push({
          pid: fightVisual.pid,
          skill: fightVisual.skill,
          pic: v3 / 2,
          first: fightVisual.first,
          remade,
        });
        if (effectFrames.length > 60) effectFrames.shift();
      }
    }
  }
  if (kind === "battle" && flag === 4 && v3 >= 0 && fightVisual) {
    const dx = fightVisual.targetX - cx,
      dy = fightVisual.targetY - cy;
    wheelVolley = drawWheelVolley(
      g,
      fightVisual,
      v3 / 2,
      view.centerX,
      view.centerY,
      view.centerX + hw * (dx - dy),
      view.centerY + hh * (dx + dy),
    );
  }
  // Once per cast, outside the affected-cell loop (area attacks must not spawn one dragon per tile):
  // the slots not reached in depth order, then the front slot. Native clock and actual aim point.
  vfxLayers?.end();
  for (const drawOverhead of overheads) drawOverhead();
  if (kind === "world" && openingGuide) drawOpeningGuide(cx, cy, viewX, viewY, hw, hh);
  if (zoomedFrame) g.restore();
  // The lighting pass does not alter collision or the source artwork.
  // 光心随逻辑视口取值（960×640 时即原 640,100 / 600,100 / 800），竖屏、超宽屏不再偏心或大片平色。
  const sunY = view.height * 5 / 32;
  const sun = g.createRadialGradient(view.width * 2 / 3, sunY, 30, view.width * 5 / 8, sunY, Math.max(view.width, view.height) * 5 / 6);
  sun.addColorStop(0, "#fff0b515");
  sun.addColorStop(1, "#0620181a");
  g.fillStyle = sun;
  g.fillRect(0, 0, view.width, view.height);
  g.restore();
}
function present() {
  scheduleBattlePulse();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(surface, 0, 0);
  if (tapMarker && tapMarker.mode === mode && tapMarker.scene === currentScene &&
      performance.now() < tapMarker.until && !currentDialog) {
    const x = view.centerX + 18 * (tapMarker.x - camera.x - tapMarker.y + camera.y),
      // 场景格有台阶高度（z=36 的高台），与地面、raisedTileAt 同样减去；大地图无高度。
      y = view.centerY + 9 * (tapMarker.x - camera.x + tapMarker.y - camera.y) -
        (mode === "scene" ? sv(currentScene, tapMarker.x, tapMarker.y, 4) : 0);
    ctx.save();
    ctx.scale(cv.width / view.width, cv.height / view.height);
    ctx.strokeStyle = tapMarker.blocked ? "#da9b80" : "#f0dba0";
    ctx.fillStyle = tapMarker.blocked ? "#da9b8028" : "#f0dba028";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
function controlledFighter() { return lastSnapshot.combatants?.[(lastSnapshot.combat?.current ?? -1) + 1]; }
// 156 用毒／医疗：毒发层数与守势只在一场战斗里有意义，数值一律由 BrowserPoisonMedInfo 算好，
// 这里只负责排版。字段缺失时返回空串。
function poisonMedLine(p) {
  if (!p) return "";
  const out = [];
  if (p.poison > 0) out.push(`毒发 ${p.poison}` + (p.stack ? ` · 第 ${p.stack} 层` : "") +
    (p.tick ? ` · 本轮 -${p.tick}` : "") + (p.shed ? ` · 自行退毒 ${p.shed}` : ""));
  if (p.guard) out.push("守势 · 本轮受招减伤");
  return out.length ? "\n" + out.join("\n") : "";
}
function battleFeedbackActive() {
  return mode === "battle" && lastSnapshot.combat?.side && !movementVisual && !fightVisual &&
    !document.hidden && !document.querySelector("dialog[open]") &&
    (!!currentDialog?.battle || !!battleSelection && !battleSelection.locked);
}
function scheduleBattlePulse() {
  if (!reducedMotion.matches && battleFeedbackActive() && !battlePulseRequest)
    battlePulseRequest = requestAnimationFrame(animateBattlePulse);
}
function animateBattlePulse(now) {
  battlePulseRequest = 0;
  if (!battleFeedbackActive()) return;
  // Only repaint while waiting for a manual decision, capped at 16 fps.
  if (now - lastBattlePaint >= 62.5 && lastFrameArgs?.[0] === "battle") {
    lastBattlePaint = now; battleFeedbackFrames++;
    paintFrame(...lastFrameArgs); present();
  }
  scheduleBattlePulse();
}
let openingGuide = null;
// 新手不知道客栈、南贤在哪：目标入口在画面内就在上方点一个金色小标和地名，在画面外就在屏边放箭头指过去。
function drawOpeningGuide(cx, cy, viewX, viewY, hw, hh) {
  const {x, y, label} = openingGuide, dx = x - cx, dy = y - cy;
  const px = view.centerX + hw * (dx - dy) + viewX, py = view.centerY + hh * (dx + dy) + viewY;
  // 地图逻辑画布在手机横屏会缩到约六成；路牌按屏幕字号画，避免 13px 缩成 8px。
  const uiScale = Math.max(1, view.width / (cv.clientWidth || view.width));
  const bob = reducedMotion.matches ? 0 : Math.sin(performance.now() / 260) * 3, m = 28 * uiScale, topInset = 56 * uiScale;
  g.save();g.font = '12px "Jianghu Song Small",serif';g.textAlign = 'center';g.lineJoin = 'round';
  g.strokeStyle = '#18342b';g.fillStyle = '#f3dc98';
  if (px > m && px < view.width - m && py > topInset + 20 * uiScale && py < view.height - m) {
    g.translate(px, py);g.scale(uiScale, uiScale);
    const top = -24 + bob;
    g.lineWidth = 2.5;g.beginPath();g.moveTo(-10, top - 13);g.lineTo(10, top - 13);g.lineTo(0, top + 2);g.closePath();g.stroke();g.fill();
    g.lineWidth = 3;g.strokeText(label, 0, top - 18);g.fillStyle = '#f4e6c4';g.fillText(label, 0, top - 18);
  } else {
    // 画面外：在内圈（避开左上队伍栏、左下摇杆、右下交互键）边上放一个带方向的深色牌子，明确是指引而不是地名。
    const ang = Math.atan2(py - view.centerY, px - view.centerX), c = Math.cos(ang), n = Math.sin(ang);
    const L = 170 * uiScale, R = view.width - 140 * uiScale, T = 84 * uiScale, B = view.height - 110 * uiScale;
    const tx = c > 0 ? (R - view.centerX) / c : c < 0 ? (L - view.centerX) / c : Infinity;
    const ty = n > 0 ? (B - view.centerY) / n : n < 0 ? (T - view.centerY) / n : Infinity;
    const t = Math.min(tx, ty), ex = view.centerX + c * t + c * bob * uiScale, ey = view.centerY + n * t + n * bob * uiScale;
    const arrow = "→↘↓↙←↖↑↗"[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8], text = `${arrow} ${label}`;
    g.translate(ex, ey);g.scale(uiScale, uiScale);
    g.font = '13px "Jianghu Song Small",serif';
    const w = g.measureText(text).width + 18, h = 22;
    g.fillStyle = 'rgba(18,30,25,.86)';g.strokeStyle = 'rgba(243,220,152,.85)';g.lineWidth = 1.5;
    g.beginPath();g.roundRect(-w / 2, -h / 2, w, h, 4);g.fill();g.stroke();
    g.fillStyle = '#f3dc98';g.textBaseline = 'middle';g.fillText(text, 0, 1);
  }
  g.restore();
}
function actorCue(x, y, active, target, height) {
  if (!active && !target) return;
  const wave = reducedMotion.matches ? .5 : (Math.sin(performance.now()/320)+1)/2;
  g.save();
  if (target) {
    const glow=g.createRadialGradient(x,y-height*.45,3,x,y-height*.45,height*.8);
    glow.addColorStop(0,`rgba(255,221,136,${.12+wave*.14})`);glow.addColorStop(1,'#ffdc8000');
    g.fillStyle=glow;g.fillRect(x-height,y-height*1.35,height*2,height*1.6);
  }
  // 157：当前行动者改白金色呼吸圈，与同伴的青绿脚环、目标的橙金圈都分得开。
  // 当前行动者靠头顶箭头与出手顺序条标出，脚下不画呼吸圈（Tom 2026-09-25）。箭头见 actorArrow，随头顶一层最后画。
  g.restore();
}
// 战斗头顶血条的配色（墨韵纸本）：[底色, 上沿亮线]；框用泥金、槽用黛漆。
const BATTLE_BAR = {
  ally: ['#5f9e6e', '#9fcea6'], allyLow: ['#c9a13f', '#ecd08a'],
  foe: ['#b8412c', '#e0775c'], foeLow: ['#d9722f', '#f3a067'],
  rim: '#8f7645', track: '#16241f',
};
function actorArrow(x, y, active, target, height) {
  if (!active && !target) return;
  const wave = reducedMotion.matches ? .5 : (Math.sin(performance.now()/320)+1)/2;
  g.save();g.fillStyle=target?'#ffe3a8':'#fff4d0';g.beginPath();
  const top=y-height-13-(reducedMotion.matches?0:wave*3); // 让出头顶血条
  g.moveTo(x-5,top-5);g.lineTo(x+5,top-5);g.lineTo(x,top+2);g.closePath();g.fill();g.restore();
}
// 人物实际轮廓：重制人物图的帧顶给兵器、动作留了空白，按帧高放头顶血条会悬空一截；
// 脚下影子也要跟着各人的站姿宽度走，跨步大的人脚伸出固定大小的影子外，看着像浮着。
// 按站姿实际不透明像素量一次（离屏小画布）：头顶高度、最低 5px（脚）的左右范围；按人物图与装备缓存，图还没载入时先用帧高、不缓存。
const figures = new Map();
let figureProbe = null;
function figureOf(pack, id, equipment, fallback) {
  const key = `${pack}:${id}:${equipment ? JSON.stringify(equipment) : ''}`;
  if (figures.has(key)) return figures.get(key);
  figureProbe ||= document.createElement('canvas');figureProbe.width = 160;figureProbe.height = 200;
  const t = figureProbe.getContext('2d', {willReadFrequently: true});
  pic(pack, id, 80, 180, false, null, t, equipment);
  const d = t.getImageData(0, 0, 160, 200).data, solid = (x, y) => d[(y * 160 + x) * 4 + 3] > 100;
  let top = -1, bottom = -1, left = 160, right = -1;
  for (let y = 0; y < 200 && top < 0; y++) for (let x = 0; x < 160; x++) if (solid(x, y)) { top = y; break; }
  if (top < 0) return {head: fallback, left: -8, right: 8};
  for (let y = 199; y >= 0 && bottom < 0; y--) for (let x = 0; x < 160; x++) if (solid(x, y)) { bottom = y; break; }
  for (let y = Math.max(top, bottom - 5); y <= bottom; y++) for (let x = 0; x < 160; x++) if (solid(x, y)) { left = Math.min(left, x); right = Math.max(right, x); }
  const f = {head: Math.max(24, 180 - top), left: left - 80, right: right - 80};
  figures.set(key, f);
  return f;
}
// vfx 394：本帧出招特效的分层对象。施术者实际画出的姿势按姿势离屏量一次（signature-effects.js measureCasterPose），
// 气劲从真实拳锋、指尖或刃尖发出；目标沿用原生作用格（signatureTarget），不改射程。
function battleVfxLayers(cx, cy, v1, v2, v3, fxPic, cells, hw, hh) {
  const struck = cells.filter(({x, y}) => wv(x, y, 4) > 0);
  const aim = signatureTarget(fightVisual, cx, cy, struck);
  const caster = lastSnapshot.combatants?.[wv(cx, cy, 2) + 1], equipment = battleUnitEquipment.get(caster?.id), actorPack = packIds[v2] || "wmap";
  const actorId = v2 > 0 ? heldStrikeFrame(fightVisual, v1 / 2) : -1;
  const pose = v2 > 0 ? measureCasterPose(`${actorPack}:${actorId}:${fightVisual.sourceFrame}:${JSON.stringify(equipment ?? null)}`,
    (t, X, Y) => pic(actorPack, actorId, X, Y, false, movementVisual, t, equipment)) : null;
  return signatureLayers(g, fightVisual, v3 >= 0 ? fxPic : null, {cx, cy, ox: view.centerX, oy: view.centerY, hw, hh, aim, pose, equipment, actor: {pack: actorPack, id: actorId},
    fxCells: struck.filter(({x, y}) => wv(x, y, 4) >= 2).length || 1, reducedMotion: reducedMotion.matches,
    outcome: (x, y) => pendingOutcomes.find(o => o.id === lastSnapshot.combatants?.[wv(x, y, 2) + 1]?.id)?.kind ?? null});
}
// sprites.js drawRegisteredActor 把重制人物鞋底画在锚点上方 3px（剧情场景、主角兵器层共用，那边不改）。
// 战斗里调 drawBattleActor／drawBattleHurt 时锚点下移同样 3px，鞋底正好落在格心，人站在格子正中（Tom 2026-09-25「偏上面」）。
// 原版人物图不走这两处，本来就在格心。若日后 sprites.js 自己做了战斗基线，这里改回 0。
const BATTLE_SOLE_DROP = 3;
// 接地阴影以鞋底为准；战斗里鞋底已落格心，故为 0。
const FOOT_LIFT = 0;
// 战场接地阴影：原版人物图不带影子，重制图自带的影子也小而淡，人像浮在格子上。
// 画在脚环之上、人像之下，半径不出本格菱形，不压到邻格的人。
function footShadow(x, y, side, fig) {
  // 敌我色藏在影子里：我方暗青、敌方暗红，其余中性；鞋底再压一小块更深的接触影，让脚真正「落」在地上。
  // 宽度跟站姿走（两脚外沿各留 5px），限制在本格里；中心随两脚中点稍作偏移。
  const hw = BATTLE_GRID.halfWidth, hh = BATTLE_GRID.halfHeight, span = fig ? fig.right - fig.left : 16;
  const mid = fig ? Math.max(-6, Math.min(6, (fig.left + fig.right) / 2)) : 0;
  const r = Math.max(hw * .42, Math.min(hw * .75, span / 2 + 5)), tint = side === 1 ? '8,40,34' : side === 0 ? '52,14,10' : '14,16,10';
  g.save();g.translate(x + mid, y - FOOT_LIFT + 1);g.scale(1, hh * .42 / (hw * .5));
  const shade = g.createRadialGradient(0, 0, 0, 0, 0, r);
  shade.addColorStop(0, `rgba(${tint},.62)`);shade.addColorStop(.55, `rgba(${tint},.34)`);shade.addColorStop(1, `rgba(${tint},0)`);
  g.fillStyle = shade;g.beginPath();g.arc(0, 0, r, 0, Math.PI * 2);g.fill();g.restore();
  g.save();g.fillStyle = 'rgba(8,8,6,.32)';g.beginPath();g.ellipse(x + mid, y - FOOT_LIFT + .5, Math.max(hw * .28, Math.min(hw * .6, span / 2 + 1)), hh * .16, 0, 0, Math.PI * 2);g.fill();g.restore();
}
// 157（Tom 2026-09-24）：出手顺序条。原版开战时按轻功排一次（WarPersonSort），之后每回合按
// WAR.Person 的顺序轮流出手，「等待」把当前者挪到队尾（War_WaitMenu）——快照里的 combatants 就是这个顺序，
// 所以从当前行动者往后循环，跳过阵亡者即可，跨过队尾处标「下轮」。
let turnOrderKey = "";
function updateTurnOrder(s) {
  const el = $("#turn-order");
  if (!el) return;
  // combatants 来自 Lua 表：键 1..N 对应 WAR.Person[0..N-1]（与引擎别处 combatants[unit + 1] 同一约定）。
  const src = s.status === 5 && s.combatants ? s.combatants : {}, cur = s.combat?.current;
  const list = Array.from({length: Object.keys(src).length}, (_, i) => src[i + 1]);
  if (!list.length || !Number.isInteger(cur) || !list[cur]) { el.hidden = true; turnOrderKey = ""; return; }
  const rows = [];
  for (let k = 0; k < list.length && rows.length < 8; k++) {
    const i = (cur + k) % list.length, c = list[i];
    if (!c || c.dead) continue;
    rows.push({c, now: k === 0, wrap: k > 0 && i < cur && !rows.some(r => r.wrap)});
  }
  const key = rows.map(r => `${r.c.id}:${r.c.side ? 1 : 0}:${r.now ? 1 : 0}:${r.wrap ? 1 : 0}`).join(",");
  el.hidden = false;
  if (key === turnOrderKey) return;
  turnOrderKey = key;
  el.replaceChildren(...rows.flatMap(({c, now, wrap}) => {
    const out = [];
    if (wrap) { const w = document.createElement("span"); w.className = "turn-wrap"; w.textContent = "下轮"; out.push(w); }
    const b = document.createElement("span");
    b.className = "turn-face " + (c.side ? "ally" : "foe") + (now ? " now" : "");
    b.title = (now ? "正在行动：" : "") + (c.name || "");
    const face = document.createElement("i"); portraitOn(face, c.head); b.append(face);
    out.push(b);
    return out;
  }));
}
function portraitOn(element, head) {
  element.removeAttribute('style'); element.classList.remove('painted-portrait');
  element.style.backgroundImage=head===0&&remastered ? "url('assets/xiaoxiami-portrait-v2.png')" : `url('../references/portraits/head-${String(head).padStart(3,'0')}.png')`;
  paintPortrait(element,head,portraitAppearance(head));
}
function requestPartyMember(id) {
  if (!canExplore() || ![2, 4].includes(lastSnapshot.status) || currentDialog) return;
  closeDrawer(); stopInput(); pendingPartyMember=id;
}
const partyUI = mountPartyUI({onChoose:requestPartyMember, portrait:portraitOn, beforeOpen:stopInput,content:C,label:sourceLabel});
const condorClues = mountCondorClues($("#objective"));
const feihuClues = mountClueList(condorClues.el, {id: 'feihu-clues', derive: deriveFeihuClues, summarize: feihuSummary});
const xiaoaoClues = mountClueList(feihuClues.el, {id: 'xiaoao-clues', derive: deriveXiaoaoClues, summarize: xiaoaoSummary});
const yitianClues = mountClueList(xiaoaoClues.el, {id: 'yitian-clues', derive: deriveYitianClues, summarize: yitianSummary});
const tianlongClues = mountClueList(yitianClues.el, {id: 'tianlong-clues', derive: deriveTianlongClues, summarize: tianlongSummary});
const shediaoClues = mountClueList(tianlongClues.el, {id: 'shediao-clues', derive: deriveShediaoClues, summarize: shediaoSummary});
let preferenceStorage;try {preferenceStorage=window.localStorage;}catch{}
const actionPreferences=createActionPreferences(preferenceStorage);
const collectionUI=mountCollectionUI({content:C,label:sourceLabel,beforeOpen:stopInput,preferences:actionPreferences});
function queueKey(k) {
  routeState = null;
  resumeRoute = null;
  if (battleSelection) {
    if (k === 32 || k === 13) { confirmBattle(); return; }
    if (k === 27) { cancelBattle(); return; }
    if (battleSelection.locked) return;
    battleSelection.path = null;
    battleSelection.sent = null;
    battleSelection.target = null;
    battleSelection.message = "";
    battleSelection.hint = "";
  }
  keys.push(k);
  if (keys.length > 12) keys.shift();
}
function canExplore() {
  return [2, 4].includes(lastSnapshot.status) && !lastSnapshot.menuOpen && (lastSnapshot.event ?? -1) < 0;
}
function stopInput() {
  // Resize/blur can discard a confirm or cancel before Lua consumes it.
  // Release that queued intent with its key; never unlock an action that
  // Lua has already received, since it may still be applying its effects.
  const releaseSelection = battleSelection?.locked && keys.some(k => k === 32 || k === 27);
  heldKey = null;
  joystick?.cancel();
  keys.length = 0;
  routeState = null;
  resumeRoute = null;
  if (battleSelection) {
    battleSelection.path = null; battleSelection.sent = null;
    if (releaseSelection) {
      battleSelection.locked = false;
      battleSelection.target = null;
      battleSelection.message = "";
      updateInputHud();
    }
  }
}
function routeFailure(message) {
  stopInput();
  routeNotice = message;
  routeNoticeUntil = Date.now() + 5000;
  $("#scene-note").textContent = message;
}
function adjacentTarget() {
  if (!canExplore() || lastSnapshot.status !== 4) return null;
  const s = lastSnapshot, d = [[0,-1],[1,0],[-1,0],[0,1]][s.direction];
  return sceneTargets.filter(t => Math.abs(t.x-s.x)+Math.abs(t.y-s.y) === 1 &&
    dv(s.scene,t.id,2)>0 && sv(s.scene,t.x,t.y,3)===t.id)
    .sort((a,b) => Number(!!d && b.x===s.x+d[0] && b.y===s.y+d[1]) - Number(!!d && a.x===s.x+d[0] && a.y===s.y+d[1]))[0];
}
function updateInputHud() {
  const target = adjacentTarget(), aim = battleSelection,
    foes = isAttackPreview() ? previewTargets() : [],
    emptyAttack = isAttackPreview() && foes.length === 0,
    throwFoes = aim?.hostile ? thrownTargets() : [],
    invalidThrow = !!aim?.hostile && !throwFoes.some(p=>p.x===aim.cursor.x && p.y===aim.cursor.y),
    pictureConfirm = mode === "title" && lastSnapshot.status > 0,
    available = !currentDialog && (canExplore() || !!aim || pictureConfirm),
    waiting = !!aim && (aim.locked || !!aim.message || aim.inFlight || keys.length>0 || !!aim.sent || !!aim.path?.length ||
      !!aim.target && (aim.target.x!==aim.cursor.x || aim.target.y!==aim.cursor.y)),
    label = pictureConfirm ? "继续" : aim ? aim.kind === "move" ? "移动到此" : aim.kind === "line" ? "确认方向" : aim.kind === "area" || aim.kind === "cross" ? "确认出招" : "确认目标" : target ? `${target.name} · 交互` : "交互";
  const sig = JSON.stringify([available,label,!!aim,waiting,aim?.cursor,aim?.target,aim?.message,aim?.hint,aim?.hostile,invalidThrow,throwFoes.map(p=>p.id+":"+p.hp),isAttackPreview() ? previewTargets().map((p) => p.id + ":" + p.hp) : null]);
  if (sig === inputHudSignature) return;
  inputHudSignature = sig;
  $("#joystick").setAttribute("aria-disabled", String(!available || pictureConfirm || !!aim?.locked || aim?.kind === "cross"));
  $("#joystick").setAttribute("aria-label", aim ? "选格摇杆，拖动预选位置，确认后行动" : "移动摇杆，拖动行走，松手停止");
  $("#stick-label").textContent = aim?.kind === "cross" ? "范围" : aim ? "选格" : lastSnapshot.status===5 ? "等待" : "行走";
  $("#touch-confirm").textContent = label;
  $("#touch-confirm").disabled = !available || waiting || emptyAttack || invalidThrow;
  $("#battle-selection").hidden = !aim || !!currentDialog;
  $("#battle-confirm").textContent = aim?.kind === "move" ? "移动到此" : aim?.kind === "line" ? "确认方向" : aim?.kind === "area" || aim?.kind === "cross" ? "确认出招" : "确认目标";
  $("#battle-confirm").disabled = waiting || emptyAttack || invalidThrow;
  const selected = aim?.kind==='target' ? Object.values(lastSnapshot.combatants||{}).find(p=>!p.dead&&p.x===aim.cursor.x&&p.y===aim.cursor.y) : null;
  const chance=targetChances(selected),prediction=chance?` · 命中 ${chance.hit.toFixed(1)}% · 会心 ${chance.critical.toFixed(1)}%`:'';
  const line = aim?.kind === "line" ? lineDirection(aim.origin, aim.cursor.x, aim.cursor.y) : null;
  const area = aim?.kind === "area" || aim?.kind === "cross";
  if (aim) $("#battle-selection-note").textContent = aim.message || (invalidThrow && !waiting ?
    (throwFoes.length ? "请选择射程内的敌人 · 暗器不能用于自己或同伴" : "暗器射程内没有敌人 · 可取消后移动或等待") : emptyAttack && !waiting ?
    "攻击范围内没有敌人 · 可重新选格，或取消后移动" : area ?
    `${aim.kind === "area" ? "金色格为攻击范围" : "十字范围 · 以自身为中心"} · ${foes.length ? `敌 ${foes.length} 人：${foes.slice(0,3).map(p=>p.name).join("、")}${foes.length>3?"…":""}` : "范围内无敌"} · ${waiting ? "正在选格" : "确认后出招"}` : line ? `直线 · ${line[3]} · ${foes.length ? `敌 ${foes.length} 人：${foes.slice(0, 3).map((p) => p.name).join("、")}${foes.length > 3 ? "…" : ""}` : "线上无敌"} · ${waiting ? "正在换向" : "点格、方向键或摇杆换向，确认方向后出招"}` :
    selected ? `目标：${selected.name} · ${selected.side?'己方':'敌方'} · 气血 ${selected.hp}/${selected.maxhp}${prediction}${selected.immune?' · 百毒不侵':selected.poison>0?` · 毒 ${selected.poison}（第 ${selected.stack||1} 层，本轮 -${selected.tick||0}）`:''} · 确认后出招` :
    `${aim.kind === "move" ? "选择落点" : "选择目标"} · ${aim.cursor.x}，${aim.cursor.y} · ${waiting ? "正在选格" : "点亮格或推摇杆，再确认"}`);
  if (aim && !aim.message && pendingAttack?.skill===28 && pendingAttack.qi>=0)
    $("#battle-selection-note").textContent+=` · 异气${pendingAttack.qi}/100；吸后满60反噬，满100不回气`;
  // Full weapon and attribute explanations remain in the skill picker.
  // Targeting keeps space for the board, costs, coverage and immediate risks.
  const tactical=battleSkillText(pendingAttack?.preview);
  if (aim && !aim.message && tactical)
    $("#battle-selection-note").textContent=`${tactical.cost} · ${tactical.scope}${tactical.warning?' · '+tactical.warning:''} · ${$("#battle-selection-note").textContent}`;
  if (aim && pendingAttack?.dualPass)
    $("#battle-selection-note").textContent=`左右互搏·第${pendingAttack.dualPass===2?'二':'一'}招选目标 · ${$("#battle-selection-note").textContent}`;
  // ui394 F5：误点的提示；只有当前选格仍可确认时才写「已保留原…」，射程内无敌等情形照旧由后面的说明交代。
  if (aim?.hint && !aim.message) {
    const kept = waiting || emptyAttack || invalidThrow ? "" : `，已保留原${aim.kind === "move" ? "落点" : aim.kind === "line" ? "方向" : "目标"}`;
    $("#battle-selection-note").textContent=`${aim.hint}${kept} · ${$("#battle-selection-note").textContent}`;
  }
}
function confirmBattle() {
  const s = battleSelection;
  if (!s || s.locked || s.message || s.inFlight || s.sent || s.path?.length || keys.length) return;
  if (s.target && (s.cursor.x !== s.target.x || s.cursor.y !== s.target.y)) return;
  // Touch, click, Return and Space share the same manual-attack guard.
  // An ally-centred area attack is valid when its affected cells contain a foe.
  if (isAttackPreview() && previewTargets().length === 0) return;
  if (s.hostile && !thrownTargets().some(p=>p.x===s.cursor.x && p.y===s.cursor.y)) return;
  stopInput();
  s.locked = true;
  keys.push(32);
  updateInputHud();
}
function cancelBattle() {
  if (!battleSelection || battleSelection.locked) return;
  stopInput();
  battleSelection.locked = true;
  keys.push(27);
  updateInputHud();
}
// Source direction order: 0 东北(0,-1) 1 东南(1,0) 2 西北(-1,0) 3 西南(0,1); arrow codes as nextKey emits them. Lua owns the chosen direction.
const LINE_DIRECTIONS = [[0, -1, 273, "东北 ↗"], [1, 0, 275, "东南 ↘"], [-1, 0, 276, "西北 ↖"], [0, 1, 274, "西南 ↙"]];
function lineDirection(origin, x, y) {
  if (!origin) return null;
  const dx = x - origin.x, dy = y - origin.y;
  if ((dx === 0 && dy === 0) || Math.abs(dx) === Math.abs(dy)) return null;
  const [sx, sy] = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
  return LINE_DIRECTIONS.find((d) => d[0] === sx && d[1] === sy) || null;
}
// Read-only: source layer-4 cells of the previewed line; opposing fighters on them, attacker excluded by origin coordinates.
function isAttackPreview() {
  return !!battleSelection && !!pendingAttack && ["target","area","line","cross"].includes(battleSelection.kind);
}
function thrownTargets() {
  const side = lastSnapshot.combat?.side;
  return Object.values(lastSnapshot.combatants || {}).filter(p=>!p.dead && p.side!==side && wv(p.x,p.y,3)<128);
}
function previewCells() {
  const cells = [];
  if (isAttackPreview()) for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (wv(x, y, 4) > 0) cells.push({x, y});
  return cells;
}
function previewTargets() {
  const o = battleSelection?.origin, side = lastSnapshot.combat?.side;
  return Object.values(lastSnapshot.combatants || {}).filter((p) => !p.dead && p.side !== side && !(o && p.x === o.x && p.y === o.y) && wv(p.x, p.y, 4) > 0);
}
function selectBattleTile(x, y) {
  const s = battleSelection;
  if (!s || s.locked) return;
  if (s.kind === "cross") return;
  if (s.kind === "line") {
    // A tap only picks one of the source's four directions; Lua re-marks the preview from that arrow.
    const d = lineDirection(s.origin, x, y);
    // ui394 手机 QA F5：误点只给提示（s.hint），不写阻断用的 s.message——光标与 Lua 的亮格都没动，
    // 上一个有效方向/目标仍亮着，也仍可确认；以前这里把「确认」灰掉，旧目标却还高亮。
    if (!d) { s.hint = "请点四条直线方向上的格子"; updateInputHud(); return; }
    stopInput();
    s.message = ""; s.hint = "";
    keys.push(d[2]);
    updateInputHud();
    return;
  }
  if (x<1 || y<1 || x>=63 || y>=63 || wv(x,y,3)>=128) {
    s.hint = "此格不在可选范围内";
    updateInputHud();
    return;
  }
  stopInput();
  s.target = {x,y}; s.message = ""; s.hint = "";
  // Build after any arrow already consumed by Lua has reached the next draw.
  s.path = null;
  updateInputHud();
}
function interact() {
  // Source ending/death pictures wait for a key while the scene event remains
  // active. Their confirmation must bypass the exploration-only input guard.
  if (mode === "title" && lastSnapshot.status > 0) { stopInput(); queueKey(32); return; }
  if (battleSelection) return confirmBattle();
  if (!canExplore()) { if (![2,4].includes(lastSnapshot.status)) queueKey(32); return; }
  const target = adjacentTarget();
  if (target) travel(target.x,target.y,target.id);
  else { stopInput(); queueKey(32); }
}
function bindTable(name, defs) {
  lua.lua_newtable(L);
  for (const [n, f] of Object.entries(defs)) {
    lua.lua_pushjsfunction(L, (T) => {
      try {
        return f(T) || 0;
      } catch (e) {
        if (!(e instanceof Error)) throw e;
        lua.lua_pushstring(T, enc(String(e.message)));
        return lua.lua_error(T);
      }
    });
    lua.lua_setfield(L, -2, to_luastring(n));
  }
  lua.lua_setglobal(L, to_luastring(name));
}
const num = (T, i) => lua.lua_tonumber(T, i),
  str = (T, i) => decode.decode(lua.lua_tolstring(T, i) || new Uint8Array()),
  raw = (T, i) => lua.lua_tolstring(T, i) || new Uint8Array(),
  buf = (T, i) => lua.lua_touserdata(T, i),
  push = (T, n) => {
    lua.lua_pushinteger(T, Math.trunc(n));
    return 1;
  };
function setGlobal(name, fn) {
  lua.lua_pushjsfunction(L, fn);
  lua.lua_setglobal(L, to_luastring(name));
}
function fail(e) {
  dead = true;
  fightVisual = movementVisual = null;
  luaErrors.push(String(e));
  $("#loading").hidden = false;
  $("#loading").style.display = "grid";
  $("#loading").textContent = "运行遇到问题：" + e;
  $("#loading").classList.add("error");
  console.error(e);
}
function closeOverlay() {
  scorePlayer.setDucked(false);
  currentDialog = null;
  document.body.classList.remove("dialog-open");
  $("#overlay").hidden = true;
  $("#portrait").removeAttribute("style");
  $("#portrait").classList.remove("painted-portrait");
  $("#choices").className = "";
  $("#game").focus();
}
function updateTalkHint() {
  if (!currentDialog?.talk) return;
  const text = $("#dialog-text"),
    more = text.scrollTop + text.clientHeight < text.scrollHeight - 2;
  $("#choices button").textContent = more ? "下页 ↓" : "继续 ›";
  $("#dialog-hint").textContent = more ? "轻触翻页 · 也可上滑阅读" : "轻触对话继续";
}
function advanceTalk() {
  const active = currentDialog;
  if (!active?.talk || performance.now() < active.readyAt) return;
  const text = $("#dialog-text");
  if (text.scrollTop + text.clientHeight < text.scrollHeight - 2) {
    // Leave one line in view so a paragraph never disappears between pages.
    text.scrollTop += Math.max(1, text.clientHeight - parseFloat(getComputedStyle(text).lineHeight));
    updateTalkHint();
  } else {
    talkClosedAt = performance.now();
    closeOverlay();
    active.resolve(active.options[0].value);
  }
}
$("#dialog-text").addEventListener("scroll", updateTalkHint, { passive: true });
new ResizeObserver(updateTalkHint).observe($("#dialog-text"));
let dialogPointer = null;
let talkClosedAt = 0;
$("#dialog").addEventListener("pointerdown", (e) => {
  dialogPointer = { x: e.clientX, y: e.clientY, active: currentDialog };
});
$("#dialog").addEventListener("click", (e) => {
  if (e.target.closest("button") || !dialogPointer || dialogPointer.active !== currentDialog ||
      Math.hypot(e.clientX - dialogPointer.x, e.clientY - dialogPointer.y) > 10 ||
      !window.getSelection().isCollapsed) return;
  advanceTalk();
});
function dialog(title, text, options, { head = -1, kicker = "江湖见闻", menu = false, talk = false, battle = false, short = false, guard = 0 } = {}) {
  closeDrawer();
  return new Promise((resolve) => {
    // `mine` keeps a handler left over from an earlier dialog from closing a newer one.
    const mine = currentDialog = { resolve, options, talk, battle, readyAt: performance.now() + 180, armedAt: performance.now() + guard };
    scorePlayer.setDucked(talk);
    document.body.classList.add("dialog-open");
    const interrupted = battle ? null : routeState, carried = battle ? null : resumeRoute;
    stopInput();
    // 记下被打断时所在的格（已到达的上一格或刚发出的这一步）；事件若把人挪走，就不续走。
    const here = interrupted && (interrupted.status === 2 ? [lastSnapshot.worldX, lastSnapshot.worldY] : [lastSnapshot.x, lastSnapshot.y]);
    resumeRoute = interrupted && (interrupted.resumes || 0) < 2 ? {x: interrupted.x, y: interrupted.y, event: interrupted.event,
      alternatives: interrupted.alternatives || null, scene: interrupted.scene, status: interrupted.status, resumes: (interrupted.resumes || 0) + 1,
      at: [here, interrupted.sent && [interrupted.sent.x, interrupted.sent.y]].filter(Boolean)} : carried;
    updateInputHud();
    $("#overlay").hidden = false;
    $("#overlay").dataset.kind = talk ? "talk" : battle ? "battle" : menu ? (short ? "short-menu" : "menu") : "choice";
    $("#dialog-hint").hidden = !talk;
    $("#dialog-title").textContent = title;
    $("#dialog-kicker").textContent = kicker;
    $("#dialog-text").textContent = text;
    const echoExit=battle&&echoVisual?options.find(o=>o.label==='离开试炼'):null;
    $("#overlay").dataset.echo=echoExit?'true':'false';
    $("#echo-exit").hidden=!echoExit;
    $("#echo-exit").onclick=()=>{if(currentDialog===mine&&echoExit){closeOverlay();resolve(echoExit.value);}};
    $("#dialog-text").scrollTop = 0;
    $("#dialog").scrollTop = 0;
    $("#choices").className = menu ? "menu-list" : "";
    $("#portrait").removeAttribute("style");
    if (head >= 0 && head !== 114 && head !== 12000) {
      $("#portrait").style.backgroundImage =
        head === 0 && remastered
          ? "url('assets/xiaoxiami-portrait-v2.png')"
          : `url('../references/portraits/head-${String(head).padStart(3, "0")}.png')`;
    }
    paintPortrait($("#portrait"), head === 114 ? -1 : head, portraitAppearance(head));
    $("#choices").replaceChildren(
      ...options.filter(o=>o!==echoExit).map((o, i) => {
        const b = document.createElement("button");
        b.textContent = o.label;
        b.disabled = !!o.disabled;
        if (o.note) b.title = o.note;
        if(o.value==='repeat'){b.classList.add('repeat-action');b.dataset.shortcut='r';b.title='R：再用上一招，重新确认目标';
          // ui394 F3：键位提示单放一个 span，触屏（pointer:coarse）由 style.css 隐去，免得「[R]」把这一格挤成两行。
          if(o.label.endsWith(' [R]')){b.textContent=o.label.slice(0,-4);const k=document.createElement('span');k.className='key-hint';k.textContent=' [R]';b.append(k);}}
        // ui394 F3：「再用」以外有九项以上时短横屏改排三列（style.css），两字以外的长项（如「攻击 · 内力不足」）占满一行。
        else if(battle&&[...String(o.label)].length>2)b.classList.add('long-choice');
        b.onclick = () => {
          // guard：确认框刚弹出时忽略点击，免得双击/连点把上一层的点选直接落成确认（Q1 2026-10-02）。
          if (currentDialog !== mine || performance.now() < mine.armedAt) return;
          if (talk) return advanceTalk();
          closeOverlay();
          resolve(o.value);
        };
        return b;
      }),
    );
    $("#choices").scrollTop = 0;
    updateTalkHint();
    $("#choices button:not(:disabled)")?.focus();
    // 矮屏下 focus 会把整个 #dialog 滚到底（如操作指引），确认框改回从开头读起；按钮仍保持焦点。
    if ($("#overlay").dataset.kind === "choice") $("#dialog").scrollTop = 0;
    scheduleBattlePulse();
  });
}
// 空闲时原版主循环每 65ms 一次 lib.Delay，每次都跑 BrowserSnapshot 要占 8–11% 单核。只有“纯 delay、
// 300ms 内没有按键、画面与地图数据未变、非战斗”时才限流到每 200ms 一次；其余 yield 一律立即刷新。
let lastHudAt = 0, lastHudMark = "", lastKeyAt = 0;
function hudIdle(status, values) {
  const now = performance.now(), mark = `${mode}:${currentScene}:${mapRevision}:${terrainRevision}`;
  const idle = status === lua.LUA_YIELD && str(co, 1) === "delay" && !values.length && mode !== "battle" &&
    mark === lastHudMark && now - lastKeyAt >= 300 && now - lastHudAt < 200;
  if (!idle) { lastHudAt = now; lastHudMark = mark; }
  return idle;
}
async function resume(values = []) {
  if (dead || running) return;
  if (currentDialog) {
    handleTimer = setTimeout(() => resume(values), 50);
    return;
  }
  running = true;
  try {
    for (const v of values) {
      if (typeof v === "number") lua.lua_pushinteger(co, v);
      else if (typeof v === "boolean") lua.lua_pushboolean(co, v);
      else lua.lua_pushstring(co, enc(v));
    }
    const status = lua.lua_resume(co, L, values.length);
    if (!hudIdle(status, values)) updateHud();
    running = false;
    if (status === lua.LUA_YIELD) {
      const kind = str(co, 1),
        a = [];
      for (let i = 2; i <= lua.lua_gettop(co); i++) a.push(tableValue(co, i));
      lua.lua_settop(co, 0);
      if (kind === "delay") {
        const delay = Math.min(5000, Math.max(12, a[0] || 20));
        handleTimer = setTimeout(
          () => resume(),
          lastSnapshot.status === 5 ? Math.max(12, delay / battleSpeed) : delay,
        );
      } else if (kind === 'character-create') {
        stopInput();closeDrawer();currentDialog={creation:true};document.body.classList.add('dialog-open');updateInputHud();
        journey.creation=await showCharacterCreation($('#stage'));
        closeOverlay();resume();
      } else if (kind === 'pitch-pot') {
        stopInput();closeDrawer();document.body.classList.add('collection-open');
        const score=await playPitchPot($('#stage'),a[0]?.best||0);
        document.body.classList.remove('collection-open');stopInput();$('#game').focus();resume([score]);
      } else if (kind === 'outfit-choice') {
        const data=a[0];
        resume([await partyUI.chooseItems({person:data.person,action:data.slot==='coat'?'armor':'boots',items:Object.values(data.options||{})})]);
      } else if (kind === "party") {
        const choice = await partyUI.show(a[0]);
        resume([choice]);
      } else if (kind === 'party-items') {
        resume([await partyUI.chooseItems(a[0])]);
      } else if (kind === 'items' || kind === 'skills' || kind === 'shop' || kind === 'party-items') {
        const data=a[0];
        const model=kind==='party-items'?{kind:'item',name:data.person.name,action:data.action,rows:Object.values(data.items||{}).map(r=>({...r,disabled:!r.eligible}))}:
          kind==='skills'?{...data,kind:'skill',battle:true,rows:Object.values(data.skills||{})}:{...data,kind:'item',shop:kind==='shop',rows:Object.values(data.items||{})};
        resume([await collectionUI.show(model)]);

      } else if (kind === "inn-board") {
        await showInnBoard(dialog,a[0]);resume();
      } else if (kind === "talk" || kind === "notice") {
        // 原版事件 452 把裘千仞的 talk 1637 挂在主角头像 0 上；按事件 450 同一人改回 67。
        const head = a[3] === 1637 && a[1] === 0 ? 67 : (a[1] ?? -1);
        const speaker = typeof a[4] === "string" && a[4] ? a[4] : "";
        const displayHead = head === -1 && (speaker === "醉老头" || speaker === "忘机散人") ? 12000 : head;
        const name = speaker || (echoVisual?.revealed && head === 0 ? echoVisual.name : head === 0 && a[3] >= 2520 && a[3] <= 2546 ? "失忆的青年" : unintroducedName(a[3], head) || personName(head) || "江湖见闻");
        const v = await dialog(
          kind === "talk" ? name : "所得所闻",
          (kind === "talk" ? dialogueText(a[3], String(a[0] || "")) : String(a[0] || ""))
            .replace(/\*{2,}/g, "\n\n")
            .replace(/\*/g, ""),
          [{ label: "继续", value: 1 }],
          { head: displayHead, kicker: head === 114 ? "山居 · 留笺" : kind === "talk" ? "江湖人物" : "行囊 · 见闻", talk: true },
        );
        resume([v]);
      } else if (kind === "yesno") {
        const lodging=lodgingPrompt(String(a[0] || ""),a[1],a[2]);
        let question = lodging?.text || dialogueText(null, String(a[0] || "是否继续？"));
        if (!lodging && /是否(?:在此)?住宿/.test(question)) {
          question = lastSnapshot.scene===70 ? "在家中睡上一觉？睡醒后可选择保存进度，家中歇宿不收银两。" : "是否在此住上一宿？睡醒后可选择保存进度。";
          // Original instruct_12 only restores unpoisoned allies with injury < 33.
          const needTreatment = Object.values(lastSnapshot.party || {})
            .filter(p => p.poison > 0 || p.injury >= 33)
            .map(p => `${p.name}（${[p.poison > 0 && "中毒", p.injury >= 33 && "重伤"].filter(Boolean).join("、")}）`);
          if (needTreatment.length) question += `\n\n${needTreatment.join("、")}暂时无法通过住宿恢复。请先在江湖菜单中解毒、医疗，或使用药品。`;
        }
        const v = await dialog("请君决断", question, lodging?.choices || [
          { label: "是", value: 1 },
          { label: "否", value: 0 },
        ]);
        resume([v]);
      } else if (kind === "menu" || kind === "lineaim") {
        const rows = a[0] || {},
          opts = [];
        const care = kind === 'menu' ? a[4] : null;
        const notebookMenu = lastSnapshot.scene === 70 && rows[1]?.[1] === '重读留笺';
        const startMenu =
          lastSnapshot.status === 0 && rows[1]?.[1] === "重新开始" && rows[2]?.[1] === "载入进度";
        // The original load flow reads an extra in-memory record after the explicit chapter choice.
        if (chapterLoadPending && lastSnapshot.status === 0 && rows[1]?.[1] === "进度一") {
          chapterLoadPending = false;
          resume([4]);
          return;
        }
        for (let i = 1; i <= a[1]; i++) {
          if (rows[i] && rows[i][3] > 0) {
            const label = rows[i][1] || "继续";
            const unavailable =
              (lastSnapshot.status === 0 &&
                label === "载入进度" &&
                !["1", "2", "3"].some((n) => files.has("data/r" + n + ".grp"))) ||
              ([0, 6].includes(lastSnapshot.status) &&
                /^(载入)?进度[一二三]$/.test(label) &&
                !files.has("data/r" + i + ".grp"));
            const slotRow = [0, 6].includes(lastSnapshot.status) && /^(载入)?进度[一二三]$/.test(label);
            opts.push({ label: care?.labels?.[i] || (slotRow && !unavailable ? slotLabel(i, label) : label), value: i, disabled: unavailable });
          } else if (kind === 'menu' && i === 2 && a[3]?.attack) {
            opts.push({ label: a[3].attack, value: 2, disabled: true });
          }
        }
        const chapterOptions = [
            { label: "十四书齐 · 赴武林大会", value: "fourteen-books-chapter" },
            { label: "圣堂终战 · 药品备妥", value: "final-temple-chapter" },
            { label: "八书续游 · 群侠同行", value: "eight-books-chapter" },
            { label: "倚天 · 赶赴光明顶", value: "mingjiao-tunnel-chapter" },
            { label: "雪山飞狐 · 宝藏归来", value: "xueshan-chapter" },
            { label: "神雕篇试玩", value: "condor-chapter" },
            { label: "倚天 · 明教分舵", value: "mingjiao-chapter" },
            { label: "倚天 · 杨逍会面", value: "yang-xiao-chapter" },
            { label: "鹿鼎 · 五毒教探路", value: "wudu-chapter" },
            { label: "侠客行 · 摩天崖", value: "xiake-chapter" },
            { label: "侠客行 · 侠客岛", value: "xiake-island-chapter" },
            { label: "笑傲 · 令狐冲入队", value: "linghu-chapter" },
            { label: "碧血剑 · 浡泥岛", value: "bi-xue-chapter" },
            { label: "碧血剑 · 金蛇山洞", value: "gold-snake-chapter" },
            { label: "天龙 · 丐帮打狗阵", value: "beggar-gate-chapter" },
            { label: "天龙 · 丐帮会友", value: "tianlong-beggar-chapter" },
            { label: "天龙 · 乔峰切磋", value: "qiao-duel-chapter" },
        ];
        // 155o：把本作的成长规则做成明确的默认新游戏入口，经典规则与章节试玩收进次级入口（../../分析报告 第六条）。
        if (startMenu) {
          const pick = v => opts.find(o => o.value === v);
          const load = pick(2), quit = pick(3);
          const ordered = [{label:"新游戏 · 一梦入江湖", value:"growth"}];
          if (load) ordered.push(load);
          // 156 审查：这一项曾按通关数隐藏，连带把 chooseJourney 里六个独立试玩入口（新周目试玩、
          // 百花谷、梅庄笔缘、河洛问诊、门影试炼、论武修炼）一起藏没了——论武与门影只在那里赋值，
          // 藏起来就完全不可达。改回无条件显示；未通关时它自己的第一项已带 disabled 并写明「通关后开启」。
          ordered.push({label:"再入江湖 · 多周目", value:"journey"});
          ordered.push({label:"其他玩法 · 经典规则与章节试玩", value:"more"}, {label:"存档 / 画面", value:"portable"});
          if (quit) ordered.push(quit);
          opts.length = 0; opts.push(...ordered);
        }
        if (a[2] === 1) opts.push({ label: "返回", value: 0 });
        if(a[3]?.available) opts.unshift({label:a[3].enabled?`再用 · ${a[3].name} [R]`:`再用 · ${a[3].name} · ${a[3].reason}`,value:'repeat',disabled:!a[3].enabled});
        const isStats = lastSnapshot.status === 0 && a[1] === 2;
        const details =
          kind === "lineaim"
            ? "确认方向后立即出招；点击返回或按 Esc 可取消。"
            : isStats
              ? "可接受这组属性，或选择“否”重新摇点。\n" +
                Object.entries(lastSnapshot.stats || {})
                  .map(([k, v]) => k + " " + v)
                  .join("　")
              : care?.detail || "";
        const fighter = lastSnapshot.status===5 && lastSnapshot.combat?.side ? controlledFighter() : null;
        if (fighter) {
          const current = lastSnapshot.combat?.current;
          const hasLaterFighter = Number.isInteger(current) && Object.entries(lastSnapshot.combatants || {})
            .some(([slot, person]) => Number(slot) > current + 1 && person && !person.dead);
          for (const option of opts) if (option.label === '等待') {
            option.label = hasLaterFighter ? '延后' : '队尾';
            option.disabled ||= !hasLaterFighter;
            option.note = '只调整本轮出手顺序；若要结束本次行动并恢复，请选择休息。';
          }
        }
        const shortMenu = kind === "menu" && lastSnapshot.status === 4 && !care && !notebookMenu && !details && opts.length >= 2 && opts.length <= 3;
        const showMenu = async () => {
          let selected = await dialog(
            kind === "lineaim"
              ? "选择出招方向"
              : lastSnapshot.status === 0
                ? isStats
                  ? "初入江湖"
                  : "一梦入江湖"
                : lastSnapshot.status === 5
                  ? fighter?.name || "招式与进退"
                  : notebookMenu ? "行路札记" : care?.title || "江湖行止",
            startMenu
              ? "在陌生山居醒来，循着线索探寻身世与十四天书。首周目敌人稍弱，方便熟悉江湖；通关后可开启新周目。\n「新游戏」用本作的成长规则；原版规则与各段章节试玩在「其他玩法」里。"
              : fighter ? `气血 ${fighter.hp}/${fighter.maxhp}\n内力 ${fighter.mp}/${fighter.maxmp}\n体力 ${fighter.stamina} · 步数 ${lastSnapshot.combat.moves}` + poisonMedLine(fighter) + (echoVisual?.rounds!=null?`\n${echoVisual.trial?'试炼':'交锋'} ${Math.min(40,echoVisual.rounds+1)}/40 回合`:'') + (details?'\n'+details:'') : details,
            opts,
            { menu: true, short: shortMenu, battle:!!fighter, head:fighter?.head??-1, kicker: fighter ? '当前行动' : care ? (care.kicker || '行旅调息') : lastSnapshot.status === 0 ? "江湖重绘 · 开发试玩" : "选择" },
          );
          while (startMenu && ["journey", "chapters", "portable", "growth", "more"].includes(selected)) {
            if (selected === "more") {
              const pickedMore = await dialog("其他玩法", "「经典规则」是原版的成长与研习规则，与本作的新游戏不同；章节试玩各自独立，不会覆盖存档。" +
                (journeyProfile.highestClearedCycle > 0 ? "" : "\n「再入江湖 · 多周目」要先正式通关一次才会出现在首页。"), [
                {label:"经典规则 · 原版成长", value:1},
                {label:"章节试玩", value:"chapters"},
                {label:"返回", value:0},
              ], {menu:true});
              if (!pickedMore) return showMenu();
              if (pickedMore === 1) return 1;
              selected = "chapters";
            }
            if(selected==='growth'){const ok=await dialog('新成长 · 从头游历','从失忆山居醒来，游历江湖，探寻身世与十四天书。武学上限、心得研习、轮回遗忘等细则，用到时可在「菜单 · 操作指引」查看。',[{label:'开始新成长',value:1},{label:'返回',value:0}],{menu:true});if(!ok)return showMenu();pendingJourney=normalizeJourney({...normalizeJourney(),growth:newGrowth()});return 1;}
            if(selected==='journey')return (await chooseJourney())??showMenu();
            if (selected === "portable") {
              $("#portable").click();
              await new Promise(resolve => $("#portable-menu").addEventListener("close", resolve, {once:true}));
              return showMenu();
            }
            selected = await dialog("章节试玩", "章节不会自动覆盖存档。若要留下试玩进度，请在家中或客栈歇宿后选择空位保存。", chapterOptions.concat([{label:"返回", value:0}]), {menu:true});
            if (selected === 0) return showMenu();
          }
          return selected;
        };
        let v = await showMenu();
        while (
          [
            "fourteen-books-chapter",
            "final-temple-chapter",
            "eight-books-chapter",
            "mingjiao-tunnel-chapter",
            "xueshan-chapter",
            "condor-chapter",
            "mingjiao-chapter",
            "yang-xiao-chapter",
            "wudu-chapter",
            "xiake-chapter",
            "xiake-island-chapter",
            "linghu-chapter",
            "bi-xue-chapter",
            "gold-snake-chapter",
            "tianlong-beggar-chapter",
            "beggar-gate-chapter",
            "qiao-duel-chapter",
            "mei-brush-chapter",
            "mastery-chapter",
          ].includes(v)
        ) {
          try {
            const chapter = {
              "mastery-chapter": "mastery",
              "mei-brush-chapter": "mei-brush",
              "fourteen-books-chapter": "fourteen-books-v1",
              "final-temple-chapter": "final-temple-v1",
              "eight-books-chapter": "eight-books-v1",
              "mingjiao-tunnel-chapter": "mingjiao-tunnel-v1",
              "xueshan-chapter": "xueshan-v1",
              "condor-chapter": "condor-v1",
              "mingjiao-chapter": "mingjiao-v1",
              "yang-xiao-chapter": "yang-xiao-v2",
              "wudu-chapter": "wudu-v1",
              "gold-snake-chapter": "gold-snake-v1",
              "beggar-gate-chapter": "beggar-gate-v1",
              "qiao-duel-chapter": "qiao-duel-v1",
              "tianlong-beggar-chapter": "tianlong-beggar-v1",
              "bi-xue-chapter": "bi-xue-v1",
              "xiake-island-chapter": "xiake-island-v1",
              "linghu-chapter": "linghu-v1",
              "xiake-chapter": "xiake-v1",
            }[v];
            const chapterFiles = await Promise.all(
              [
                ["r", 114242],
                ["s", 4915200],
                ["d", 440000],
              ].map(async ([key, length]) => {
                if(chapter==='mastery'){
                  const data=files.get(`data/${{r:"ranger",s:"allsin",d:"alldef"}[key]}.grp`);
                  if(!data || data.length!==length)throw Error('论武底板未完整载入');
                  return [key,data.slice()];
                }
                const response = await fetch(`chapters/${chapter}/${key}.grp`);
                if (!response.ok) throw Error("章节文件暂时不可用");
                const data = new Uint8Array(await response.arrayBuffer());
                if (data.length !== length) throw Error("章节文件未完整载入");
                return [key, data];
              }),
            );
            for (const [key, data] of chapterFiles) files.set(`data/${key}4.grp`, data);
            chapterPreview = chapter;
            chapterLoadPending = true;
            v = 2;
          } catch {
            pendingChapterJourney=null;pendingEchoTrial='';pendingMasteryStart=false;
            await dialog(
              "章节暂未载入",
              "试玩内容没有完整载入，请稍后再试，也可重新开始或载入自己的进度。",
              [{ label: "返回首页", value: 1 }],
            );
            v = await showMenu();
          }
        }
        resume([v]);
      } else if (kind === "journey-complete") {
        journeyFinished=true;
        const echo=a[0]?{...a[0],skills:Object.values(a[0].skills||{})}:undefined;
        const next=completeJourney(journeyProfile,journey,!sceneTest&&!chapterPreview&&!new URLSearchParams(location.search).has('battle-test'),echo,pendingHomecoming);
        if(JSON.stringify(next)!==JSON.stringify(journeyProfile)){
          try{await writeProfile(db,next);journeyProfile=next;}catch{await dialog('一梦归来','结局已完成，但本机未能保存传承记录，请检查剩余空间。',[{label:'继续',value:1}]);}
        }
        resume();
      } else if (kind === "asset") {
        await pendingAsset;
        pendingAsset = null;
        resume();
      } else if (kind === 'rest-save') {
        if (sceneTest) {
          await dialog('场景巡检','此页只供检查地图与交互，不保存进度。返回正常游戏后，仍可在家或客栈歇宿存档。',[{label:'继续巡检',value:0}],{menu:true});
          resume([0]);
        } else resume([await chooseRestSave(db,dialog,String(a[0]||'住处'),slot=>slotSummary(slot)&&slotLabel(slot,'进度'+['一','二','三'][slot-1]))]);
      } else if (kind === "save") {
        lastSaveOK = await saveRestWithRetry(pendingSave,dialog);
        pendingSave = null;
        if (!lastSaveOK && saveFileBackup) {
          for (const [key,data] of saveFileBackup) { if (data) files.set(key,data); else files.delete(key); }
        }
        saveFileBackup = null;
        // 156 审查：门前那一次不是歇宿，用客栈口径会和身世层刚说的「再走到这里时还会再记一次」打架。
        const atDoorSave = currentScene === 83;
        $("#save-status").textContent =
          lastSaveOK ? (atDoorSave ? "门前记录已封存 · " : "歇宿进度已保存 · ") +
          new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
          : (atDoorSave ? '本次未封存 · 再走到门前还可以再记一次' : '本次未保存 · 请下次歇宿时保存');
        resume();
      } else throw Error("未知等待类型 " + kind);
    } else if (status !== lua.LUA_OK) {
      throw Error(decode.decode(lua.lua_tolstring(co, -1)));
    } else {
      await dialog(
        journeyFinished ? (pendingHomecoming==='stay'?'归路 · 留下':pendingHomecoming==='return'?'归路 · 回去':"一梦归来") : "暂别江湖",
        journeyFinished ? (sceneTest||journey.trial||chapterPreview?'此次独立试玩已结束。可返回首页，继续探索江湖新篇。':pendingHomecoming?`门已封上，这一程选择了${pendingHomecoming==='stay'?'留下':'回去'}。已记录通关 ${journeyProfile.highestClearedCycle} 程；决定之前的存档仍可读回。\n首页「再入江湖」可从同一起点另走一程——那是另一种可能，不改这一程的选择。`:`这一程江湖已走完。已记录通关 ${journeyProfile.highestClearedCycle} 程，首页可选择「再入江湖」。`) : "本次运行已经结束。可返回首页读档继续。",
        [{ label: "返回首页", value: 1 }],
      );
      location.reload();
    }
  } catch (e) {
    running = false;
    fail(e?.message ?? String(e));
  }
}
function scenePass(x, y) {
  if (x < 1 || y < 1 || x > 62 || y > 62) return false;
  const e = sv(currentScene, x, y, 3);
  return (
    sv(currentScene, x, y, 1) <= 0 &&
    (e < 0 || dv(currentScene, e, 0) === 0) &&
    !isWater(sv(currentScene, x, y, 0))
  );
}
function sceneExits(sid) {
  const sc = C.scenes[sid];
  return sc ? [1, 2, 3].map(i => [sc["出口X" + i], sc["出口Y" + i]]).filter(([x, y]) => x > 0 && y > 0) : [];
}
// Tom 2026-09-27：门口辅助。场景里朝墙推方向（键盘、摇杆、方向钮），而侧边一两格就是门口（出口或紧贴出口的门洞）时，
// 这一步先横移对准门口，下一步照常前进。只改这一步的方向：不穿墙、不替玩家多走；前方有人或物件时照旧转身面对。
function doorAssist(key) {
  const d = DIRECTIONS.find(v => v[2] === key);
  if (!d || lastSnapshot.status !== 4 || battleSelection || !canExplore()) return key;
  const {x, y} = lastSnapshot, fx = x + d[0], fy = y + d[1];
  if (scenePass(fx, fy) || sv(currentScene, fx, fy, 3) >= 0) return key;
  const exits = sceneExits(currentScene);
  const door = (px, py) => exits.some(([ex, ey]) => Math.abs(ex - px) + Math.abs(ey - py) <= 1);
  for (let step = 1; step <= 2; step++)
    for (const side of [1, -1]) {
      const px = d[1] * side, py = -d[0] * side;
      let clear = true;
      // 侧移只在门内走：侧移格本身不能是出口，否则按上下键就被带出门（审查 P1）。
      for (let i = 1; i <= step; i++) clear = clear && scenePass(x + px * i, y + py * i) &&
        !exits.some(([ex, ey]) => ex === x + px * i && ey === y + py * i);
      if (clear && scenePass(x + px * step + d[0], y + py * step + d[1]) && door(x + px * step + d[0], y + py * step + d[1]))
        return DIRECTIONS.find(v => v[0] === px && v[1] === py)[2];
    }
  return key;
}
function worldEntrances(destination) {
  return [[destination.x, destination.y], [destination.x2, destination.y2]]
    .filter(([x, y]) => x > 0 && y > 0);
}
function worldPass(x, y) {
  return x >= 10 && y >= 10 && x <= 470 && y <= 470 &&
    world.buildx[y * 480 + x] === 0 && world.buildy[y * 480 + x] === 0;
}
function joystickKey(held) {
  if (!held.sequence) return held.key;
  if (battleSelection?.kind === "line" && held.sequence.length > 1) {
    // Stable line aim only: keep the current direction if the two-arrow push contains it, else its first arrow.
    const current = lineDirection(battleSelection.origin, battleSelection.cursor.x, battleSelection.cursor.y);
    held.index++;
    return current && held.sequence.includes(current[2]) ? current[2] : held.sequence[0];
  }
  if (!canExplore()) return held.sequence[held.index++ % held.sequence.length];
  const s = lastSnapshot, worldMode = s.status === 2;
  const pass = worldMode ? (x, y) => worldPass(x, y) ||
    Object.values(s.destinations || {}).some(d => d.condition !== 1 &&
      worldEntrances(d).some(p => p[0] === x && p[1] === y)) : scenePass;
  return stickStep(held.sequence, held.index++, worldMode ? s.worldX : s.x,
    worldMode ? s.worldY : s.y, pass);
}
function travel(x, y, event = null, alternatives = null) {
  if (currentDialog || !canExplore()) return false;
  stopInput();
  if (event !== null && (dv(currentScene,event,2)<=0 && dv(currentScene,event,3)<=0 || sv(currentScene,x,y,3)!==event ||
      dv(currentScene,event,9)!==x || dv(currentScene,event,10)!==y)) {
    routeFailure("目标已离开原位，请重新查看附近。 ");
    nearbySignature = "";
    refreshNearby();
    return false;
  }
  const worldMode = lastSnapshot.status === 2,
    start = worldMode
      ? [lastSnapshot.worldX, lastSnapshot.worldY]
      : [lastSnapshot.x, lastSnapshot.y];
  // A direction key also walks onto nonblocking items. Approach in a straight
  // final step so the original Space interaction finds the item in front.
  const approachItem = event !== null && !worldMode && scenePass(x, y);
  const facing = [[0,-1],[1,0],[-1,0],[0,1]][lastSnapshot.direction];
  if (event !== null && facing && start[0]+facing[0]===x && start[1]+facing[1]===y) {
    routeNoticeUntil = 0;
    keys.push(32);
    return true;
  }
  const approaches = approachItem
    ? DIRECTIONS.map(([dx, dy, key]) => ({
        from: [x - dx * 2, y - dy * 2],
        step: { x: x - dx, y: y - dy, key },
      })).filter(({ from, step }) =>
        [from, [step.x, step.y]].every(
          ([xx, yy]) => xx > 0 && yy > 0 && xx < 63 && yy < 63 && scenePass(xx, yy),
        ),
      )
    : [];
  const goals = approachItem
    ? approaches.map(({ from }) => from)
    : event === null
      ? alternatives || [[x, y]]
      : DIRECTIONS.map(([dx, dy]) => [x + dx, y + dy]).filter(([x, y]) => scenePass(x, y));
  // Only an original entrance may be a blocked final tile. Lua still checks
  // its story/lightness condition before entering; arbitrary walls never pass.
  const destination = worldMode && Object.values(lastSnapshot.destinations || {}).find(d =>
    worldEntrances(d).some(p => p[0] === x && p[1] === y));
  // 156B: the source refuses 进入条件 1 outright (CanEnterScene returns -1) and the building
  // tile blocks the step, so the party walks to the door and stands there until the 1.5s route
  // timeout reports "行走中断" — which reads as a broken entrance. Say the real reason instead.
  // 进入条件 2 同理：快照 party[].agility 即 bridge.lua 输出的基础轻功，与源码 CanEnterScene 口径相同。
  if (destination && destination.condition === 1) {
    const place = sourceLabel(C.scenes[destination.id]?.["名称"] || "此地");
    routeFailure(`${place}此刻进不去，门路尚未打开。`);
    return false;
  }
  if (destination && destination.condition === 2 &&
      !Object.values(lastSnapshot.party || {}).some(p => p.agility >= 70)) {
    const place = sourceLabel(C.scenes[destination.id]?.["名称"] || "此地");
    routeFailure(`${place}山势险峻，队中须有人轻功达到 70 方能登上。`);
    return false;
  }
  if (destination) goals.splice(0, goals.length, ...worldEntrances(destination));
  const route = pathfind(start, goals, worldMode ? 480 : 64, (xx, yy) =>
    worldMode ? worldPass(xx, yy) || (destination && goals.some(p => p[0] === xx && p[1] === yy))
      : scenePass(xx, yy));
  if (!route) {
    const wineBlocked = !worldMode && currentScene === 55 && event === 4 &&
      sv(55, 13, 40, 3) === 3 && dv(55, 3, 0) !== 0;
    // Source E238/E239 (Yuelai inn, Linghu's wine) opens this gate; nothing at the gate says so.
    const meiGateShut = !worldMode && currentScene === 55 && sv(55, 30, 47, 1) > 0 && start[1] >= 48 && y < 47;
    // 155f: only Wuliang cave E484 (Duan Yu at the jade statue) opens Yanziwu's pavilion door (52: 27,29).
    const yanziGateShut = !worldMode && currentScene === 52 && sv(52, 27, 29, 1) > 0 &&
      x >= 17 && x <= 26 && y >= 19 && y <= 39;
    // 155f: only Mingjiao tunnel E90 opens Guangmingding's gate row (11: 29,47), although E76 says to hurry there.
    const guangmingGateShut = !worldMode && currentScene === 11 && sv(11, 29, 47, 1) > 0 && start[1] >= 48 && y < 47;
    // Source E30 opens Yaowang's red-tree passage. An unopened story gate
    // cannot be resolved by repeatedly adjusting the joystick near the house.
    const yaowangGateShut = !worldMode && currentScene === 49 && sv(49, 28, 37, 1) > 0 && start[1] >= 37 && y < 37;
    const gaiGangGateShut = !worldMode && currentScene === 51 && event === 14 && dv(51, 0, 2) === 523;
    const caveTrailPending = !worldMode && currentScene === 10 &&
      [[25,375],[7,376],[14,377],[27,378]].some(([e,ev]) => dv(10,e,4) === ev);
    // 梅庄三道内门（E248 画、E253 书、E258 棋各开一道）。直接点门后的人像或暗门格而寻路失败时，
    // 按第一道未开的门说明，且只说玩家已听到的事：谁在门后、想要什么，都要等本人开口。
    const meiInner = !worldMode && currentScene === 55 && sv(55, 30, 47, 1) === 0 && !wineBlocked &&
      ([6, 7, 9, 10, 11, 13, 15, 16, 17, 18, 19].includes(event) || (event === null && x === 13 && y === 22));
    const meiInnerNote = !meiInner ? null
      : sv(55, 37, 42, 1) > 0 ? (dv(55, 3, 2) === 247 ? "庄里的门还关着，不妨先同迎客的主人交谈。"
        : "庄里的门还关着。丹青生说过：好画值得一杯，好身手也值得一杯。")
      : sv(55, 21, 34, 1) > 0 ? (dv(55, 6, 2) === 251 ? "通往内院的门还关着。丹青生去请他三哥了，不妨先见见这位三庄主。"
        : "通往内院的门还关着，一时进不去。不妨再去见见三庄主秃笔翁。")
      : sv(55, 37, 34, 1) > 0 ? (dv(55, 9, 2) === 254 ? "再往里的门还关着。秃笔翁和丹青生去求二哥帮忙了，不妨先见见这位二庄主。"
        : "再往里的门还关着，一时进不去。不妨再去见见二庄主黑白子。")
      : null;
    routeFailure(wineBlocked ? (dv(55, 3, 2) === 247 ? "迎客的主人挡在酒坛前，先同他交谈，另寻借酒的办法。"
        : "丹青生挡在酒坛前，先同他交谈，另寻借酒的办法。") :
      meiGateShut ? "梅庄大门紧闭，叩门无人应。悦来客栈里常有人谈起梅庄美酒，不妨先去那里打听。" :
      meiInnerNote ? meiInnerNote :
      yanziGateShut ? "燕子坞水榭院门紧锁，四面是水，叩门无人应。眼下无法入内，先去别处寻访，日后再来拜会。" :
      guangmingGateShut ? "光明顶山门紧闭，从正面上不去。明教分舵的厨子说过，阳教主常在房中凭空消失，那屋里或许另有密道。" :
      yaowangGateShut ? "庄外红树遮住了小径，一时寻不到入庄的路。不妨先到别处打听这座庄子的消息。" :
      gaiGangGateShut ? "丐帮弟子守着前路。先与入口的弟子交谈，按帮中规矩求见。" :
      caveTrailPending ? "洞内岔路曲折，前路尚未探明。可从“附近”选择“洞内石径 · 察看”，沿石径走近察看。" :
      "路被挡住了，请换一侧靠近，或用摇杆调整位置。 ");
    return false;
  }
  if (approachItem) {
    const end = route.length ? [route.at(-1).x, route.at(-1).y] : start;
    route.push(approaches.find(({ from }) => from[0] === end[0] && from[1] === end[1]).step);
  }
  routeNoticeUntil = 0;
  routeState = {
    route,
    scene: lastSnapshot.scene,
    status: lastSnapshot.status,
    event,
    x,
    y,
    alternatives,
    sent: null,
    turned: approachItem,
  };
  keys.length = 0;
  return true;
}
function nextKey() {
  if (document.querySelector("dialog[open]")) { stopInput(); return -1; }
  if (pendingPartyMember !== null) {
    if (canExplore() && [2, 4].includes(lastSnapshot.status)) return -7001;
    pendingPartyMember=null;
  }
  if(pendingFieldAction!==null){
    if(canExplore() && [2,4].includes(lastSnapshot.status))return -7002;
    pendingFieldAction=null;
  }
  const emit = key => {
    if (battleSelection && [273,274,275,276].includes(key)) battleSelection.inFlight = true;
    return key;
  };
  if (keys.length) return emit(doorAssist(keys.shift()));
  const aim = battleSelection;
  if (aim && !aim.locked && !aim.inFlight && aim.target) {
    if (aim.sent) {
      if (aim.cursor.x===aim.sent.x && aim.cursor.y===aim.sent.y) { aim.path.shift(); aim.sent=null; }
      else { aim.path=null;aim.sent=null;aim.target=null;aim.message="选格已停止，请重新选择。";updateInputHud();return -1; }
    }
    if (!aim.path) aim.path = pathfind([aim.cursor.x,aim.cursor.y],[[aim.target.x,aim.target.y]],64,(x,y)=>wv(x,y,3)<128);
    if (!aim.path) { aim.target=null;aim.message="无法选中此格，请改选亮格。";updateInputHud();return -1; }
    if (aim.path.length) { aim.sent=aim.path[0];return emit(aim.sent.key); }
    updateInputHud();
  }
  if (heldKey && !currentDialog && (canExplore() || (aim && !aim.locked && !aim.inFlight)) && performance.now() >= heldKey.nextAt) {
    heldKey.nextAt = performance.now() + 180;
    return emit(doorAssist(joystickKey(heldKey)));
  }
  if (resumeRoute && !routeState && !currentDialog && !keys.length && !heldKey && canExplore()) {
    const want = resumeRoute, s = lastSnapshot, p = s.status === 2 ? [s.worldX, s.worldY] : [s.x, s.y];
    resumeRoute = null;
    if (s.status === want.status && s.scene === want.scene && want.at.some(t => t[0] === p[0] && t[1] === p[1]) &&
        travel(want.x, want.y, want.event, want.alternatives) && routeState) routeState.resumes = want.resumes;
  }
  const r = routeState;
  if (!r || currentDialog) return -1;
  const s = snapshot();
  if (s.status !== r.status || s.scene !== r.scene) {
    routeState = null;
    return -1;
  }
  const p = s.status === 2 ? [s.worldX, s.worldY] : [s.x, s.y];
  if (r.event !== null && (dv(s.scene,r.event,2)<=0 && dv(s.scene,r.event,3)<=0 || sv(s.scene,r.x,r.y,3)!==r.event)) {
    routeFailure("目标已经离开，请重新查看附近人物。 ");
    return -1;
  }
  if (r.sent) {
    if (p[0] === r.sent.x && p[1] === r.sent.y) {
      r.sent = null;
      r.route.shift();
    } else if (Date.now() - r.sent.at > 1500) {
      routeFailure("行走中断，请重新点选目标或用摇杆调整。 ");
      return -1;
    } else return -1;
  }
  if (r.route.length) {
    r.sent = { ...r.route[0], at: Date.now() };
    return r.sent.key;
  }
  if (r.event !== null) {
    const direction = DIRECTIONS.find(([dx, dy]) => p[0] + dx === r.x && p[1] + dy === r.y);
    if (!direction) {
      routeFailure("尚未走到交谈位置，请换一侧靠近。 ");
      return -1;
    }
    const facing = [[0,-1],[1,0],[-1,0],[0,1]][s.direction];
    if (!r.turned && (!facing || p[0]+facing[0]!==r.x || p[1]+facing[1]!==r.y)) {
      r.turned = true;
      r.turnAt = Date.now();
      return direction[2];
    }
    if (!facing || p[0]+facing[0]!==r.x || p[1]+facing[1]!==r.y) {
      if (Date.now()-(r.turnAt || 0)>1500) routeFailure("尚未面向人物，请调整位置后交谈。 ");
      return -1;
    }
    routeState = null;
    return 32;
  }
  routeState = null;
  return -1;
}
// 155b discoverability (reviews/story155b-discoverability.md): scene -> [label, [[slot, walkEvent], ...], when?]
const WALK_HINTS = {
  // 山洞物品被原剧情中的蜘蛛群隔开；先引向仍有效的石径事件，不跨过守路者。
  10: [["洞内石径 · 察看", [[25, 375], [7, 376], [8, 376], [9, 376],
    [14, 377], [15, 377], [16, 377], [27, 378], [28, 378], [29, 378], [30, 378], [31, 378]]]],
  51: [["内院出口 · 留神", [[20, 530], [21, 530]]]],
  62: [["庙门内 · 人声", [[0, 557], [1, 557], [2, 557]]]],
  27: [["并派大会 · 连战", [[56, 206], [57, 214]]]],
  26: [["下崖路 · 留神", [[87, 322], [88, 322], [89, 322], [90, 322], [91, 322], [92, 322], [93, 322]]]],
  25: [["上擂台", [[72, 936]], () => dv(25, 24, 2) <= 0]],
  83: [["石门后 · 留神", [[4, 1015], [5, 1015]], () => Array.from({length: 14}, (_, i) => dv(83, 11 + i, 5)).every((p) => p === 4664)],
    // 155d: after E1015 the objective says to walk down the left side; E1016 (farewell) is a walk-over row with no talk event.
    ["左侧下行 · 故人", [[6, 1016], [7, 1016], [8, 1016], [9, 1016], [10, 1016]], () => sv(83, 18, 25, 1) > 0 && sv(83, 18, 26, 1) > 0]],
  11: [["六大派阵前", [[96, 82], [97, 82], [98, 82]], () => dv(11, 4, 5) === 5454]],
  9: [["成崑居深处", [[0, 91]]]],
  74: [["回石窟路口", [[4, 359], [5, 359], [6, 359]]]],
  39: [["大厅前 · 人声", [[12, 343], [13, 344]]]],
  // 155i (实玩): the jade statue E484 arms the cave mouth with E486 (war78 蟒牯朱蛤, 败=死). Nothing warns the player,
  // and a party that came here early dies on the way out. Neutral hint only; the source fight is unchanged.
  42: [["洞口 · 有异响", [[3, 486], [4, 486], [5, 486]]]],
};
function refreshNearby() {
  const s = lastSnapshot,
    sig = String(s.status) + ":" + s.scene + ":" + mapRevision;
  if (sig === nearbySignature) return;
  nearbySignature = sig;
  const area = $("#nearby");
  area.replaceChildren();
  sceneTargets = [];
  if (s.status !== 4) return;
  const title = document.createElement("small");
  title.textContent = "循路前往";
  area.append(title);
  // E271 tells the player about the hidden entrance. A physically opened
  // hatch also proves discovery, including old saves and manual exploration.
  const hiddenMeiHatch = s.scene === 55 && dv(55, 9, 2) !== 281 && sv(55, 13, 22, 1) > 0;
  const listedBeeEvents = new Set();
  for (let e = 0; e < 200; e++) {
    if (hiddenMeiHatch && e === 19) continue;
    // These original book platforms accept an item but have no talk event.
    // Expose the approach in Nearby; the original item menu still places it.
    const templeBook = s.scene === 83 && e >= 11 && e <= 24 &&
      dv(s.scene, e, 3) === 990 + e;
    if (dv(s.scene, e, 2) <= 0 && !templeBook) continue;
    const x = dv(s.scene, e, 9),
      y = dv(s.scene, e, 10);
    if (x < 1 || y < 1 || sv(s.scene, x, y, 3) !== e) continue;
    const ast = C.events[dv(s.scene, e, 2)] || [];
    // Name the figure by the first speaker on the NPC side (third talk argument is not 1); a companion's
    // opening line (慕容复 in 玄慈's E511, 张无忌 before 谢逊) used to label the NPC with the companion's name.
    let head = (ast.find((n) => n[0] === 1 && n[1][1] > 0 && n[1][2] !== 1) ?? ast.find((n) => n[0] === 1 && n[1][1] > 0))?.[1][1];
    const frame = dv(s.scene, e, 7);
    // After his introduction the shop script has no dialogue head to infer.
    if ([937, 938].includes(dv(s.scene, e, 2)) && frame === 8256) head = 111;
    // The poisoned Miao event contains only the hero's reply, but still targets Miao.
    if (
      s.scene === 24 &&
      ((e === 1 && frame === 5212) || (e === 8 && [5214, 5216].includes(frame)))
    )
      head = 3;
    // The reunion script begins with Wuji speaking, but this is still Xie Xun.
    if (s.scene === 72 && e === 2 && frame === 5292) head = 13;
    // Yang Guo speaks first in the valley reunion, but the target is Xiaolongnü.
    if (s.scene === 80 && e === 1 && frame === 6068) head = 59;
    // Guo and Huang share their opening conversation; name the NPC being approached.
    if (s.scene === 75 && e === 1 && frame === 6088) head = 55;
    if (s.scene === 75 && e === 2 && frame === 6090) head = 56;
    // The four friends introduce one another; label the person being approached.
    if (s.scene === 55) {
      const talk = dv(s.scene, e, 2);
      if ([6, 7].includes(e) && [251, 252].includes(talk)) head = 32;
      if (e === 8 && frame === 6048 && [253, 280].includes(talk)) head = 31;
      if (e === 9 && frame === 6062) head = 33;
      // E253 moves Tubi (6054) and Danqing (6050) beside the second master's door; both carry E254.
      if (e === 10 && frame === 6054 && talk === 254) head = 32;
    }
    // Linghu opens the sword lesson, but the figure on the cliff is Feng Qingyang.
    if (s.scene === 81 && e === 2 && frame === 5896) head = 30;
    // Lin speaks in the revenge branch, but the opponent here remains Yu Canghai.
    if (s.scene === 36 && e === 4 && frame === 5928) head = 24;
    // Shared island conversations begin with the other speaker. Name the actual figure.
    if (s.scene === 74) {
      if (e === 12 && frame === 5134) head = 39;
      if ((e === 3 && frame === 5136) || (e === 13 && frame === 5138)) head = 40;
      if (e === 11 && frame === 5954) head = 20;
    }
    // Duan speaks to this jade statue; the dialogue speaker is not its actor.
    const jadeStatue = s.scene === 42 && e === 1 && frame === 6548;
    if (jadeStatue) head = undefined;
    let name = jadeStatue ? "查看玉像" : [2466, 2490, 2492].includes(frame) ? "查看柜子" : personName(head);
    // Keep the reunion's identity reveal in the conversation, not the approach label.
    if (s.scene === 80 && e === 1 && dv(80, e, 2) === 436) name = "白衣女子";
    // E39 ends with her introduction and replaces itself with E40. Keep her
    // portrait and interaction, but let that conversation reveal her name.
    if (s.scene === 49 && e === 2 && dv(49, e, 2) === 39) name = "庄中姑娘";
    // 天龙：通名之前只用已听到的称呼。高昇 61/0、61/8 在 E476（1650 通名）前；燕子坞 52/1 在 E487 前、
    // E487 后到 E493（1753 说出全名）前；52/2 在 E487（1726 介绍）前；丐帮 51/14 在 E525/E573 前——
    // 打狗阵破了（1907「乔帮主」，51/1 第 1 格清零）才称乔帮主。
    if (s.scene === 61 && (e === 0 || e === 8) && dv(61, e, 2) === 476) name = "年轻公子";
    if (s.scene === 52 && e === 1 && dv(52, 1, 2) === 487) name = "燕子坞主人";
    if (s.scene === 52 && e === 1 && dv(52, 1, 2) === 489) name = "慕容公子";
    if (s.scene === 52 && e === 2 && dv(52, 2, 2) === 488) name = "燕子坞姑娘";
    if (s.scene === 51 && e === 14 && dv(51, 14, 2) === 525) name = dv(51, 1, 1) === 0 ? "乔帮主" : "丐帮帮主";
    // 梅庄 55：四位庄主各在一道门后（E239 大门、E248 画、E253 书、E258 棋各开一道），门开之前走不到、也没人提起，
    // 附近不列入口（地图上直接点人像仍走原入口）。门开后、本人通名前只用已听到的身份：迎客的丹青生称梅庄主人；
    // 丹青生说「去请三哥」→三庄主，秃笔翁说「去求二哥」→二庄主，「不知大庄主可肯赐教」→大庄主。
    // 看不见的半身格（55/7、55/15）与本身同一对白时只列一次。
    let meiUnreached = false, meiHalf = false;
    if (s.scene === 55) {
      const talk = dv(55, e, 2);
      const pending = (e === 3 && talk === 247 && [sv(55, 30, 47, 1), "梅庄主人"])
        || ([6, 7].includes(e) && talk === 251 && [sv(55, 37, 42, 1), "三庄主"])
        || (e === 9 && talk === 254 && [sv(55, 21, 34, 1), "二庄主"])
        || ([13, 15].includes(e) && talk === 259 && [sv(55, 37, 34, 1), "大庄主"]);
      if (pending) { name = pending[1]; meiUnreached = pending[0] > 0; }
      meiHalf = dv(55, e, 5) === -1 && ((e === 7 && talk === dv(55, 6, 2)) || (e === 15 && talk === dv(55, 13, 2)));
    }
    // 梅庄地洞 82：牢中人要在 E276 里才自报姓名。
    if (s.scene === 82 && e === 1 && dv(82, e, 2) === 276) name = "牢中人";
    // Bee objects share Zhou's conversation; they are not eight extra Zhou NPCs.
    const valleyBee = s.scene === 20 && e >= 5 && e <= 12 && frame >= 6256 && frame <= 6262 && [409, 410].includes(dv(s.scene, e, 2));
    if (valleyBee) name = "查看玉蜂";
    if (!name)
      name =
        dv(s.scene, e, 5) === 2490 ? "查看箱子" : ast.some((n) => n[0] === 2) ? "查看物品" : "察看";
    // The purple-key chest uses a short inspection dialogue, not an NPC greeting.
    if (s.scene === 52 && e === 4 && dv(52, e, 2) === 17 && dv(52, e, 3) === 496) {
      name = "上锁木箱";
      head = undefined;
    }
    if (s.scene === 55 && e === 19 && dv(55, e, 2) === 274) name = "查看房中机关";
    if (s.scene === 62 && e === 10 && [563, 565].includes(dv(62, e, 2))) { name = "查看墓碑"; head = undefined; }
    if (s.scene === 82 && e === 0 && dv(82, e, 2) > 0) name = "查看牢门";
    if (s.scene === 46 && dv(s.scene, e, 2) === 640 + e && e <= 2)
      name = ["石中金蛇剑", "石旁木箱", "洞中木箱"][e];
    if (s.scene === 6 && e === 0 && dv(6,e,2) === 15) name = '查看清水';
    if (innSign(s.scene,e,dv(s.scene,e,2))) {name='客栈公告栏';head=undefined;}
    if (s.scene===70 && e===199 && dv(70,e,2)===13000){name='山居营缮与投壶';head=undefined;}
    if (s.scene===70 && e>=190 && e<=195 && dv(70,e,2)===12811+e){const v=journey.homestead?.display?.[e-189];name='兵器架 · '+(v?(hasWeaponModel(v.id)?sourceLabel(C.items[v.id]['名称']):'旧藏物待取回'):'空架');head=undefined;}
    // 156 家园：厢房 180-183 与药畦 170-175 在「附近」里原本一律写成「察看」，按既有的
    // dv(scene,event,2) 对码写法给它们各自的名字。事件号与事件码一一对应，判错就不改名。
    if (s.scene===70 && e>=180 && e<=183 && dv(70,e,2)===12830+e){name='厢房 · 第'+(e-179)+'间';head=undefined;}
    if (s.scene===70 && e>=170 && e<=175 && dv(70,e,2)===12850+e){name='药畦 · 第'+(e-169)+'畦';head=undefined;}
    if (s.scene === 70 && e === 1) { name = '翻阅行路札记'; head = undefined; }
    if (s.scene === 70 && dv(70,e,2) === 931) name = '卧榻休息';
    if (s.scene === 70 && dv(70,e,2) === 932) name = '桌上请帖';
    if (s.scene === 63 && e === 0 && dv(63,e,2) === 605) name = '查看题字';
    if (templeBook) name = `天书台 · ${sourceLabel(C.items[133 + e]["名称"])}`;
    if (s.scene === 83 && e === 1 && dv(83, e, 2) === 1017) name = "归梦之门";
    if ([1, 3, 40].includes(s.scene) && e === 198 && dv(s.scene, e, 2) === 12000) { name = journey.dispersalQuest === "ready" || journey.dispersalUsed ? "忘机散人" : "醉老头"; head = 12000; }
    if (dv(s.scene,e,2)>0) sceneTargets.push({id:e,x,y,name,head,sourcePic:frame});
    // Eight bees repeat the same clue. Keep every map target, but one menu entry per active clue.
    if (valleyBee) {
      const clue = dv(s.scene, e, 2);
      if (listedBeeEvents.has(clue)) continue;
      listedBeeEvents.add(clue);
    }
    // 衡山派：原脚本 E322 把莫大两格原图 E10 (28,12)/E11 (29,12) 一并改成同一对白 331，右半格 E11 便也成了
    // 可谈事件。它是同一人物的相邻半身，不是第二个莫大；只合并「附近」入口，sceneTargets 与地图点按照旧。
    const modaRightHalf = s.scene === 58 && e === 11 && frame === 5702 && dv(58, 11, 2) === dv(58, 10, 2) &&
      dv(58, 10, 9) === 28 && dv(58, 10, 10) === 12 && sv(58, 28, 12, 3) === 10 && x === 29 && y === 12;
    // 高昇客栈的段誉坐像也分两格；两格都可交谈时，附近列表只保留有效的 D0，直接点像仍保留原入口。
    const duanUpperHalf = s.scene === 61 && e === 8 && frame === 6598 && dv(61, 0, 7) === 6596 &&
      [476, 477].includes(dv(61, 0, 2)) && dv(61, 8, 2) === dv(61, 0, 2) &&
      dv(61, 0, 9) === 19 && dv(61, 0, 10) === 18 && sv(61, 19, 18, 3) === 0 && x === 19 && y === 17;
    if (modaRightHalf || duanUpperHalf || meiUnreached || meiHalf) continue;
    const b = document.createElement("button");
    b.textContent = name;
    b.title = `${x}，${y}`;
    b.onclick = () => travel(x, y, e);
    area.append(b);
  }
  // Walk-over story cells carry no talk event, so the loop above never lists them. Show a neutral hint only
  // while the source event is armed; travel(x, y) walks onto the cell and the source walk-over check runs it.
  for (const [label, cells, when] of WALK_HINTS[s.scene] || []) {
    if (when && !when()) continue;
    const armed = cells
      .filter(([e, ev]) => dv(s.scene, e, 4) === ev && sv(s.scene, dv(s.scene, e, 9), dv(s.scene, e, 10), 3) === e)
      .map(([e]) => [dv(s.scene, e, 9), dv(s.scene, e, 10)]);
    if (!armed.length) continue;
    const b = document.createElement("button");
    b.textContent = label;
    b.title = armed.map(([x, y]) => `${x}，${y}`).join(" / ");
    b.onclick = () => travel(armed[0][0], armed[0][1], null, armed);
    area.append(b);
  }
  const sc = C.scenes[s.scene];
  const exits = Array.from({ length: 3 }, (_, i) => [
    sc["出口X" + (i + 1)],
    sc["出口Y" + (i + 1)],
  ]).filter(([x, y]) => x > 0 && y > 0);
  if (exits.length) {
    const b = document.createElement("button");
    b.textContent = "循路出门";
    b.onclick = () => travel(...exits[0], null, exits);
    area.append(b);
  }
  // Walk to the original portal; the source game still decides the transition.
  if (!hiddenMeiHatch && sc["跳转场景"] >= 0 && sc["跳转口X1"] > 0 && sc["跳转口Y1"] > 0) {
    const b = document.createElement("button");
    const x = sc["跳转口X1"], y = sc["跳转口Y1"];
    // E654 first opens the blocked Gaocang doorway. Only a second, walk-over
    // step into the now-clear portal changes scenes; keep those actions distinct.
    const doorClosed = s.scene === 15 && x === 19 && y === 21 &&
      sv(15, x, y, 1) > 0 && sv(15, x, y, 3) === 1 && dv(15, 1, 2) === 654;
    const meiHatchClosed = s.scene === 55 && x === 13 && y === 22 &&
      sv(55, x, y, 1) > 0 && sv(55, x, y, 3) === 19 && dv(55, 19, 2) === 274;
    b.textContent = meiHatchClosed ? "开启房中暗门" : doorClosed ? "开启暗门" : exits.length ? "循路深入" : "循路返回";
    const doorEvent = meiHatchClosed ? 19 : doorClosed ? 1 : null;
    b.onclick = () => travel(x, y, doorEvent);
    area.append(b);
  }
}
let mapPointer = null;
cv.addEventListener("pointerdown", (e) => {
  // The right thumb may tap while the left thumb is still on the stick.
  if ((!e.isPrimary && !$("#joystick").classList.contains("held")) || e.button!==0) return;
  mapPointer = {id:e.pointerId,x:e.clientX,y:e.clientY};
});
cv.addEventListener("pointercancel", () => { mapPointer=null; });
cv.addEventListener("pointerup", (e) => {
  const down=mapPointer; mapPointer=null;
  if (!down || down.id!==e.pointerId || Math.hypot(e.clientX-down.x,e.clientY-down.y)>10 ||
      currentDialog || document.querySelector("dialog[open]") || (!canExplore() && !battleSelection)) return;
  const r = cv.getBoundingClientRect(), scale = r.width / view.width;
  let {x, y, tx, ty} = screenToTile(e.clientX, e.clientY, r, view, camera, mode === "battle" ? zoomedBattleGrid() : CLASSIC_GRID);
  if (tx < 0 || tx > view.width || ty < 0 || ty > view.height) return;
  if (battleSelection) {
    // Area attacks aim at ground cells, including empty cells between enemies.
    // Body snapping here stole those centres from mouse and touch players.
    if (battleSelection.kind === "target") {
      // Fingers land on the body, not the foot tile. Only fighters on a legal
      // centre count; an attack aim prefers the opposing side.
      const pad = e.pointerType === "touch" ? 6 / scale : 2;
      const legal = Object.values(lastSnapshot.combatants || {}).filter(p => !p.dead && wv(p.x, p.y, 3) < 128);
      const foes = legal.filter(p => p.side !== lastSnapshot.combat?.side);
      const zg = {pad, grid: zoomedBattleGrid(), height: 60 * battleZoom, halfBody: 15 * battleZoom};
      const hit = (isAttackPreview() && battleFigureAt(tx, ty, view, camera, foes, zg)) ||
        battleFigureAt(tx, ty, view, camera, legal, zg);
      if (hit) ({x, y} = hit);
    } else if (battleSelection.kind === "line" && battleSelection.origin) {
      // A straight-line aim only needs a direction: a tap on an opposing body that stands on one of the four rays picks that ray.
      const pad = e.pointerType === "touch" ? 6 / scale : 2;
      const foes = Object.values(lastSnapshot.combatants || {}).filter(p => !p.dead && p.side !== lastSnapshot.combat?.side && lineDirection(battleSelection.origin, p.x, p.y));
      const hit = battleFigureAt(tx, ty, view, camera, foes, {pad, grid: zoomedBattleGrid(), height: 60 * battleZoom, halfBody: 15 * battleZoom});
      if (hit) ({x, y} = hit);
    }
    selectBattleTile(x,y); return;
  }
  if (mode === "scene") {
    const tile = raisedTileAt(tx, ty, view, camera, (x, y) => sv(currentScene, x, y, 4));
    if (tile) ({x, y} = tile);
  }
  let ev = mode === "scene" ? sv(currentScene, x, y, 3) : -1;
  if (mode === "scene") {
    // People are drawn above their foot tile. Hit the visible figure too,
    // with a small finger allowance, then use the existing original-map route.
    const hits = [], pad = e.pointerType === "touch" ? 6 / scale : 2;
    for (let id = 0; id < 200; id++) {
      const ex = dv(currentScene, id, 9), ey = dv(currentScene, id, 10),
        frame = A.smap.frames[dv(currentScene, id, 7) / 2],
        board = innSign(currentScene,id,dv(currentScene,id,2)),
        // 394 手机 QA F1：家中卧榻 D[70][10] 没有人物图，画面上的床由建筑层 (16..17,32..33) 四格拼成，
        // 点床身原先落到床后被挡的格子。给它一个与这四格合并范围相同的点击框，仍走原事件与现有寻路。
        homeBed = currentScene === 70 && id === 10;
      if (dv(currentScene, id, 2) <= 0 || ex < 0 || ey < 0 ||
          sv(currentScene, ex, ey, 3) !== id || (!frame && !board && !homeBed)) continue;
      const ax = view.centerX + 18 * (ex - camera.x - ey + camera.y),
        ay = view.centerY + 9 * (ex - camera.x + ey - camera.y) - sv(currentScene, ex, ey, 4),
        [w, h, ox, oy] = board ? INN_BOARD_BOUNDS : homeBed ? [56, 49, 31, 51] : currentScene === 70 && id === 1 ? [34, 23, 17, 22] : [1,3,40].includes(currentScene) && id===198 && dv(currentScene,id,2)===12000 ? [60,80,30,77] : frame.slice(3);
      if (tx >= ax - ox - pad && tx <= ax - ox + w + pad &&
          ty >= ay - oy - pad && ty <= ay - oy + h + pad)
        hits.push({ id, x: ex, y: ey, distance: Math.hypot(tx - (ax - ox + w / 2), ty - (ay - oy + h / 2)) });
    }
    hits.sort((a, b) => a.distance - b.distance || b.x + b.y - a.x - a.y);
    if (hits.length) ({ x, y, id: ev } = hits[0]);
  }
  let alternatives = null;
  if (mode === "world") {
    // Match a visible building to its original entrance, not the roof's ground
    // projection. Each destination can retain both source entrance cells.
    const hits = [];
    for (const d of Object.values(lastSnapshot.destinations || {})) {
      for (const [ex, ey] of worldEntrances(d)) {
        const index = ey * 480 + ex,
          bx = world.buildx[index] || ex, by = world.buildy[index] || ey,
          frame = A.mmap.frames[world.building[by * 480 + bx] / 2];
        if (!frame) continue;
        const px = view.centerX + 18 * (bx - camera.x - by + camera.y),
          py = view.centerY + 9 * (bx - camera.x + by - camera.y),
          [w, h, ax, ay] = frame.slice(3), pad = e.pointerType === "touch" ? 6 / scale : 2;
        if (tx >= px - ax - pad && tx <= px - ax + w + pad &&
            ty >= py - ay - pad && ty <= py - ay + h + pad)
          // Several portals can share one building sprite (e.g. Jueqing valley
          // and its bottom). Resolve that tie by the actual entrance, not the
          // identical artwork anchor; story access is still checked by travel.
          hits.push({x:ex, y:ey, depth:bx + by, distance:Math.hypot(
            tx-view.centerX-18*(ex-camera.x-ey+camera.y),
            ty-view.centerY-9*(ex-camera.x+ey-camera.y))});
      }
    }
    hits.sort((a,b) => b.depth-a.depth || a.distance-b.distance);
    if (hits.length) ({x, y} = hits[0]);
    const onEntrance = Object.values(lastSnapshot.destinations || {}).some(d =>
      worldEntrances(d).some(p => p[0] === x && p[1] === y));
    if (!hits.length && !onEntrance && !worldPass(x, y)) {
      // 点到路边树石：改走相邻的原版可走格（靠近点击处者优先），路仍由 pathfind 决定。
      // 不设场景图那种贴边阈值——点树格正中时四邻距离均为 2，阈值会让多数点击仍报受阻。
      // 入口格（原版全部 buildx/buildy≠0）不在此列，仍由 travel 按坐标识别进门。
      const candidates = DIRECTIONS.map(([dx, dy]) => ({x: x + dx, y: y + dy}))
        .filter(p => worldPass(p.x, p.y))
        .map(p => ({...p, distance:
          Math.abs(tx - view.centerX - 18 * (p.x - camera.x - p.y + camera.y)) / 18 +
          Math.abs(ty - view.centerY - 9 * (p.x - camera.x + p.y - camera.y)) / 9}))
        .sort((a, b) => a.distance - b.distance);
      if (candidates.length) { alternatives = candidates.map(p => [p.x, p.y]); ({x, y} = candidates[0]); }
    }
  } else if ((ev < 0 || dv(currentScene, ev, 2) <= 0) && !scenePass(x, y)) {
    // Small touch tolerance at a narrow opening, restricted to an adjacent
    // original walkable tile. The path still has to get there without a wall.
    const pad = e.pointerType === "touch" ? 7 / scale : 3;
    const candidates = DIRECTIONS.map(([dx,dy]) => ({x:x+dx,y:y+dy}))
      .filter(p => p.x > 0 && p.y > 0 && p.x < 63 && p.y < 63 && scenePass(p.x,p.y))
      .map(p => ({...p, distance:
        Math.abs(tx - view.centerX - 18*(p.x-camera.x-p.y+camera.y))/18 +
        Math.abs(ty - view.centerY - 9*(p.x-camera.x+p.y-camera.y) + sv(currentScene,p.x,p.y,4))/9}))
      .filter(p => p.distance <= 1 + pad/18).sort((a,b) => a.distance-b.distance);
    if (candidates.length) {
      alternatives = candidates.map(p => [p.x,p.y]);
      ({x, y} = candidates[0]); ev = -1;
    } else {
      // Tom 2026-09-27：点在紧贴出口的门框、门旁墙上时，改走原版出口格出门（只认一格，免得点关着的门反被带出去）。
      const near = sceneExits(currentScene).filter(([ex, ey]) => Math.max(Math.abs(ex - x), Math.abs(ey - y)) <= 1)
        .sort((a, b) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y));
      if (near.length) { alternatives = near; [x, y] = near[0]; ev = -1; }
    }
  }
  // 395 Q5 P5-1：手机连点同一处时，主角已在迈步、镜头在滚动，第二下常落到人物身后的挡格，
  // 把正走向人物的路线换成“路被挡住了”。路线仍在进行时，与上次已接受的点按相距 24px 内的重复点按只当同一意图。
  if (routeState && tapMarker && !tapMarker.blocked && tapMarker.scene === currentScene && tapMarker.mode === mode &&
      Math.hypot(e.clientX - tapMarker.cx, e.clientY - tapMarker.cy) <= 24) return;
  heldKey = null;
  // An opened portal cell (e.g. Meizhuang E274's passage) keeps its talk event; a tap there means walk in, not re-inspect.
  const portal = mode === "scene" && C.scenes[currentScene] && [1, 2].some(i =>
    C.scenes[currentScene]["跳转口X" + i] === x && C.scenes[currentScene]["跳转口Y" + i] === y) && scenePass(x, y);
  const accepted = travel(x, y, !portal && ev >= 0 && dv(currentScene, ev, 2) > 0 ? ev : null, alternatives);
  tapMarker = { x, y, mode, scene: currentScene, blocked: !accepted, until: performance.now() + 1100, cx: e.clientX, cy: e.clientY };
  present();
});
cv.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (battleSelection) cancelBattle();
  else if (!currentDialog && canExplore()) { drawerToggle.click(); }
});
function register() {
  bindTable("Byte", {
    create: (T) => {
      lua.lua_pushlightuserdata(T, new Uint8Array(num(T, 1)));
      return 1;
    },
    loadfile: (T) => {
      const b = buf(T, 1),
        src = getfile(str(T, 2)),
        offset = num(T, 3),
        length = num(T, 4);
      if (offset + length > src.length) throw Error("读取超出文件 " + str(T, 2));
      b.set(src.subarray(offset, offset + length));
    },
    savefile: (T) => {
      const key = norm(str(T, 2)),
        offset = num(T, 3),
        length = num(T, 4),
        old = files.get(key) || new Uint8Array(),
        next = new Uint8Array(Math.max(old.length, offset + length));
      next.set(old);
      next.set(buf(T, 1).subarray(0, length), offset);
      files.set(key, next);
    },
    get16: (T) => push(T, new DataView(buf(T, 1).buffer).getInt16(num(T, 2), true)),
    getu16: (T) => push(T, new DataView(buf(T, 1).buffer).getUint16(num(T, 2), true)),
    get32: (T) => push(T, new DataView(buf(T, 1).buffer).getUint32(num(T, 2), true)),
    set16: (T) => {
      new DataView(buf(T, 1).buffer).setInt16(num(T, 2), Math.trunc(num(T, 3)), true);
    },
    setu16: (T) => {
      new DataView(buf(T, 1).buffer).setUint16(num(T, 2), Math.trunc(num(T, 3)), true);
    },
    set32: (T) => {
      new DataView(buf(T, 1).buffer).setInt32(num(T, 2), Math.trunc(num(T, 3)), true);
    },
    getstr: (T) => {
      let b = buf(T, 1).slice(num(T, 2), num(T, 2) + num(T, 3)),
        end = b.indexOf(0);
      if (end >= 0) b = b.subarray(0, end);
      lua.lua_pushstring(T, b);
      return 1;
    },
    setstr: (T) => {
      const b = buf(T, 1),
        at = num(T, 2),
        length = num(T, 3);
      b.fill(0, at, at + length);
      b.set(raw(T, 4).subarray(0, length), at);
    },
  });
  bindTable("lib", {
    BattleGrid: T=>{battleZoom=battleZoomPref==='standard'?1:1.25;const z=zoomedBattleGrid();lua.lua_pushnumber(T,z.halfWidth);lua.lua_pushnumber(T,z.halfHeight);return 2;},
    EnhancedCombat:(T)=>{lua.lua_pushboolean(T,combatRules==='enhanced');return 1;},
    CombatChances:(T)=>{const c=combatChances(num(T,1),num(T,2),num(T,3),num(T,4));lua.lua_pushnumber(T,c.hit);lua.lua_pushnumber(T,c.critical);return 2;},
    BeginSkillAim:(T)=>{pendingAttack={skill:num(T,1),level:num(T,2),drain:lua.lua_toboolean(T,3),qi:lua.lua_gettop(T)>=4?num(T,4):-1,weaponHint:lua.lua_gettop(T)>=5?str(T,5):'',preview:lua.lua_gettop(T)>=6?tableValue(T,6):null,dualPass:lua.lua_gettop(T)>=7?num(T,7):0,cost:lua.lua_gettop(T)>=8&&!lua.lua_isnil(T,8)?num(T,8):null};pendingOutcomes=[];inputHudSignature='';},
    RecordUIUse:(T)=>{actionPreferences.record(str(T,1),num(T,2),num(T,3));},
    ForgetUIUse:(T)=>{actionPreferences.forget('skill',num(T,1),num(T,2));inputHudSignature='';},
    EndSkillAim:()=>{pendingAttack=null;inputHudSignature='';},
    CombatOutcome:(T)=>{const row={id:num(T,1),kind:str(T,2),damage:num(T,3),hit:num(T,4),critical:num(T,5)};row.before=Object.values(lastSnapshot.combatants||{}).find(c=>c?.id===row.id)?.hp;pendingOutcomes.push(row);combatOutcomeLog.push({...row});if(combatOutcomeLog.length>30)combatOutcomeLog.shift();},
    BeginBattleSelection: (T) => {
      stopInput();
      battleSelection = {kind:str(T,1),unit:num(T,2),cursor:{x:num(T,3),y:num(T,4)},origin:lua.lua_gettop(T)>=6?{x:num(T,5),y:num(T,6)}:null,hostile:lua.lua_gettop(T)>=7 && lua.lua_toboolean(T,7),target:null,path:null,sent:null,inFlight:false,locked:false,message:""};
      updateInputHud();
    },
    EndBattleSelection: () => {
      stopInput();
      battleSelection = null;
      updateInputHud();
    },
    SetBattleEquipment: (T) => {
      const head=num(T,1),held=num(T,2),carried=lua.lua_gettop(T)>=3?num(T,3):held,offhand=lua.lua_gettop(T)>=5?num(T,5):-1;
      setBattleEquipment(head,held,carried,offhand);
      const portraitId=lua.lua_gettop(T)>=4?num(T,4):head;
      void loadCanvasPortraits([portraitId]);
      if(lua.lua_gettop(T)>=4){const pid=num(T,4);battleUnitEquipment.set(pid,{pid,held,carried,offhand});}
    },
    BeginWeaponHandling: T=>{
      const sourcePid=num(T,1),pid=actorFor(sourcePid);
      const sets=combatArtStats().sets,carried=num(T,4);
      const allowed=pid===0&&hasHeroWeaponArt(carried)&&sets.includes('0-handling')||
        pid===58&&sourcePid===58&&carried===106&&['ne','se','nw','sw'].every(d=>sets.includes('58-'+d));
      if(allowed){weaponHandlingVisual={pid,sourcePid,frame:num(T,3)<0?4:0};setWeaponHandlingVisual(weaponHandlingVisual);}
      lua.lua_pushboolean(T,allowed);return 1;
    },
    WeaponHandlingFrame: T=>{if(weaponHandlingVisual){weaponHandlingVisual.frame=Math.max(0,Math.min(4,num(T,1)));setWeaponHandlingVisual(weaponHandlingVisual);}},
    EndWeaponHandling: ()=>{weaponHandlingVisual=null;setWeaponHandlingVisual(null);},
    BattleActorIdentity: T=>push(T,actorFor(num(T,1))),
    SetDisplayAlias: T=>{const pid=num(T,1),shown=num(T,2);if(pid<0)displayAlias.clear();else if(shown<0)displayAlias.delete(pid);else displayAlias.set(pid,shown);},
    BeginMovementVisual: (T) => {
      movementVisual = { pid: actorFor(num(T,1)), sourcePid:num(T,1), x: num(T, 2), y: num(T, 3), step: 0 };
      if (
        [0, 2, 9, 35, 37, 38, 50, 58, 59, 62].includes(movementVisual.pid) ||
        isBeggarFighter(movementVisual.pid)
      )
        movementVisual.phase = 0;
    },
    AdvanceMovementVisual: () => {
      if (
        [0, 2, 9, 35, 37, 38, 50, 58, 59, 62].includes(movementVisual?.pid) ||
        isBeggarFighter(movementVisual?.pid)
      )
        movementVisual.phase =
          (movementVisual.phase + 1) %
          ([0, 9, 58, 59, 35, 38, 50].includes(movementVisual.pid) || isBeggarFighter(movementVisual.pid)
            ? 8
            : 4);
      if ([0, 9, 58, 59, 35, 50].includes(movementVisual?.pid) || isBeggarFighter(movementVisual?.pid))
        movementVisual.tilePhase = Math.min(3, (movementVisual.tilePhase ?? 0) + 1);
    },
    EndMovementVisual: () => {
      movementVisual = null;
    },
    BeginFightVisual: (T) => {
      const values = Array.from({length:15},(_,i)=>num(T,i+1));
      const artName = lua.lua_gettop(T) >= 16 ? str(T, 16) : '';
      fightVisual = Object.fromEntries(
        [
          "pid",
          "skill",
          "kind",
          "level",
          "targetX",
          "targetY",
          "effect",
          "first",
          "count",
          "direction",
          "weapon",
          "frameStart",
          "frameCount",
          "contactFrame",
          "lastFrame",
        ].map((key, i) => [key, values[i]]),
      );
      // 157：招式名以 Lua 侧的 JY.Wugong 为准（底表只有 0..92，93 家传辟邪剑法是运行时补建的）。
      fightVisual.artName = artName || sourceLabel(C.skills[fightVisual.skill]?.['名称'] || '');
      fightVisual.calloutAt = performance.now();
      fightVisual.skillType=C.skills[fightVisual.skill]?.['武功类型']??fightVisual.kind;
      if(actorFor(fightVisual.pid)!==fightVisual.pid)fightVisual.artActor=actorFor(fightVisual.pid);
    },
    EndFightVisual: () => {
      pendingOutcomes=[];
      fightVisual = null;
    },
    Debug: (T) => {
      const s = str(T, 1);
      events.push(s);
      if (events.length > 200) events.shift();
    },
    GetTime: (T) => push(T, Math.floor(performance.now())),
    GetKey: (T) => { const k = nextKey(); if (k !== -1) lastKeyAt = performance.now(); return push(T, k); },
    TakeFieldRequest: (T) => {const action=pendingFieldAction;pendingFieldAction=null;return push(T,action??0);},
    TakePartyRequest: (T) => { const id=pendingPartyMember;pendingPartyMember=null;return push(T,id??-1); },
    Delay: (T) => {
      lua.lua_pushstring(T, to_luastring("delay"));
      lua.lua_pushinteger(T, Math.max(0, num(T, 1)));
      return lua.lua_yield(T, 2);
    },
    CharSet: (T) => {
      const table = JY_CHARSET[num(T, 2)],
        src = raw(T, 1),
        out = [];
      for (let i = 0; i < src.length; i++) {
        if (src[i] < 128) out.push(src[i]);
        else {
          const v = table[src[i] * 256 + src[++i]] || 0x3f3f;
          out.push(v & 255, v >> 8);
        }
      }
      lua.lua_pushstring(T, Uint8Array.from(out));
      return 1;
    },
    PicInit: () => {},
    PicLoadFile: (T) => {
      const pack = norm(str(T, 1)).split("/").at(-1).replace(".idx", "");
      packIds[num(T, 3)] = pack;
      if (!A[pack]) return;
      const imgs = Array.from({ length: A[pack].pages }, (_, i) => loadPage(pack, i));
      if (imgs.some((im) => !im.complete || !im.naturalWidth)) {
        pendingAsset = Promise.all(imgs.map((im) => im.decode()));
        lua.lua_pushstring(T, to_luastring("asset"));
        return lua.lua_yield(T, 1);
      }
    },
    PicGetXY: (T) => {
      const pack = packIds[num(T, 1)],
        id = Math.trunc(num(T, 2) / 2);
      const p = A[pack]?.frames[id],
        remade = battleSpriteSize(pack, id, fightVisual, movementVisual);
      for (const n of remade || (p ? [p[3], p[4], p[5], p[6]] : [0, 0, 0, 0]))
        lua.lua_pushinteger(T, n);
      return 4;
    },
    PicLoadCache: (T) => {
      pic(packIds[num(T, 1)], num(T, 2) / 2, num(T, 3), num(T, 4), num(T, 5) === 1);
    },
    LoadMMap: () => {},
    UnloadMMap: () => {},
    GetMMap: (T) => {
      const x = num(T, 1),
        y = num(T, 2),
        l = num(T, 3);
      return push(
        T,
        x >= 0 && y >= 0 && x < 480 && y < 480
          ? world[["earth", "surface", "building", "buildx", "buildy"][l]][y * 480 + x]
          : 0,
      );
    },
    LoadSMap: (T) => {
      linghuJadeAccepted = false;
      terrainRevision++;
      S = getfile(str(T, 1)).slice();
      D = getfile(str(T, 6)).slice();
      sceneView = new DataView(S.buffer, S.byteOffset, S.byteLength);
      eventView = new DataView(D.buffer, D.byteOffset, D.byteLength);
      sceneryRevision++;
      mapRevision++;
    },
    GetS: (T) => push(T, sv(num(T, 1), num(T, 2), num(T, 3), num(T, 4))),
    SetS: (T) => {
      const [s, x, y, l, v] = [1, 2, 3, 4, 5].map((i) => num(T, i));
      if (s < 0 || s >= 84 || x < 0 || x >= 64 || y < 0 || y >= 64 || l < 0 || l >= 6) return;
      if (l === 0) terrainRevision++;
      const offset = 2 * ((s * 6 + l) * 4096 + y * 64 + x);
      if ([1, 2, 4, 5].includes(l) && sceneView.getInt16(offset, true) !== v) sceneryRevision++;
      sceneView.setInt16(offset, v, true);
      mapRevision++;
    },
    GetD: (T) => push(T, dv(num(T, 1), num(T, 2), num(T, 3))),
    SetD: (T) => {
      const [s, id, l, v] = [1, 2, 3, 4].map((i) => num(T, i));
      if (s < 0 || s >= 84 || id < 0 || id >= 200 || l < 0 || l >= 11) return;
      eventView.setInt16(2 * ((s * 200 + id) * 11 + l), v, true);
      mapRevision++;
    },
    SaveSMap: (T) => {
      if (sceneTest) { lastSaveOK = false; return 0; }
      const sk = norm(str(T, 1)),
        dk = norm(str(T, 2));
      files.set(sk, S.slice());
      files.set(dk, D.slice());
      const slot = sk.match(/s([123])\.grp/)[1],
        payload = {
          r: getfile("data/r" + slot + ".grp").slice(),
          s: S.slice(),
          d: D.slice(),
          date: Date.now(),
          journey: normalizeJourney(journey),
        };
      $("#save-status").textContent = "正在保存…";
      lastSaveOK = false;
      pendingSave = () => new Promise((resolve, reject) => {
        const tx = db.transaction("slots", "readwrite");
        tx.objectStore("slots").put(payload, slot);
        tx.oncomplete = ()=>{journeySlots.set(slot,payload.journey);slotDates.set(slot,payload.date);resolve();};
        tx.onabort = tx.onerror = () => reject(tx.error || Error("存档未能写入，请检查设备剩余空间。"));
      });
      lua.lua_pushstring(T, to_luastring("save"));
      return lua.lua_yield(T, 1);
    },
    LoadWarMap: (T) => {
      const id = num(T, 3),
        index = getfile(str(T, 1)),
        rawdata = getfile(str(T, 2)),
        offset = id === 0 ? 0 : new DataView(index.buffer).getUint32((id - 1) * 4, true);
      terrainRevision++;
      currentBattleMap = id;
      clearMaterialCache();
      war = new Int16Array(6 * 4096);
      war.set(new Int16Array(rawdata.slice(offset, offset + 16384).buffer));
    },
    GetWarMap: (T) => push(T, wv(num(T, 1), num(T, 2), num(T, 3))),
    SetWarMap: (T) => {
      if (
        num(T, 1) < 0 ||
        num(T, 1) >= 64 ||
        num(T, 2) < 0 ||
        num(T, 2) >= 64 ||
        num(T, 3) < 0 ||
        num(T, 3) >= 6
      )
        return;
      if (num(T, 3) === 0) terrainRevision++;
      war[num(T, 3) * 4096 + num(T, 2) * 64 + num(T, 1)] = num(T, 4);
    },
    CleanWarMap: (T) => {
      if (num(T, 1) === 0) terrainRevision++;
      war.fill(num(T, 2), num(T, 1) * 4096, (num(T, 1) + 1) * 4096);
    },
    DrawSMap: (T) => render("scene", ...[1, 2, 3, 4, 5, 6].map((i) => num(T, i))),
    DrawMMap: (T) => render("world", ...[1, 2, 3].map((i) => num(T, i))),
    DrawWarMap: (T) => {
      const args=[1,2,3,4,5,6].map(i=>num(T,i));
      if(fightVisual && args[0]===4) {
        const f=fightVisual;
        f.sourceFrame=args[5]>=0 ? f.contactFrame+Math.max(0,args[5]/2-f.first-1)
          : Math.max(0,args[3]/2-f.frameStart-f.direction*f.frameCount);
      }
      if (battleSelection && ([1,2].includes(args[0]) || (["line","cross"].includes(battleSelection.kind) && args[0] === 3))) {
        battleSelection.cursor={x:args[3],y:args[4]};
        battleSelection.inFlight=false;
      }
      render("battle",...args);
      updateInputHud();
    },
    SetClip: (T) => {
      const [x, y, x2, y2] = [1, 2, 3, 4].map((i) => num(T, i));
      clip = x2 > x && y2 > y ? [x, y, x2 - x, y2 - y] : null;
    },
    FillColor: (T) => {
      let [x, y, w, h, color] = [1, 2, 3, 4, 5].map((i) => num(T, i));
      if (!w && !h) {
        x = y = 0;
        w = view.width;
        h = view.height;
      }
      g.fillStyle = "#" + Math.trunc(color).toString(16).padStart(6, "0");
      g.fillRect(x, y, w, h);
    },
    Background: (T) => {
      let [x, y, x2, y2, bright] = [1, 2, 3, 4, 5].map((i) => num(T, i));
      g.fillStyle = "#122820e8";
      g.fillRect(x, y, x2 - x, y2 - y);
    },
    DrawRect: (T) => {
      g.strokeStyle = "#bbae8077";
      g.lineWidth = 1;
      g.strokeRect(num(T, 1) + 0.5, num(T, 2) + 0.5, num(T, 3) - num(T, 1), num(T, 4) - num(T, 2));
    },
    DrawStr: (T) => {
      g.fillStyle = "#" + Math.trunc(num(T, 4)).toString(16).padStart(6, "0");
      const fontSize = num(T, 5) || 24;
      g.font = `${fontSize}px "${fontSize % 12 === 0 ? "Jianghu Song Small" : "Jianghu Song"}",serif`;
      g.textBaseline = "top";
      g.fillText(str(T, 3), num(T, 1), num(T, 2));
    },
    ShowSurface: () => present(),
    ShowSlow: () => present(),
    LoadPicture: (T) => {
      const file = str(T, 1);
      render("title");
      if (file.includes("dead")) {
        g.fillStyle = "#d7b5a0";
        g.font = '32px "Jianghu Song",serif';
        g.fillText("胜败乃江湖常事", view.centerX - 160, view.centerY - 45);
      }
      if (file.includes("end")) {
        g.fillStyle = "#dbc69a";
        g.font = '32px "Jianghu Song",serif';
        g.fillText(pendingHomecoming==='stay'?"十四天书 · 留在江湖":"十四天书 · 一梦归来", view.centerX - 200, view.centerY - 45);
      }
      present();
    },
    EnableKeyRepeat: () => {},
    GetViewport: (T) => { lua.lua_pushinteger(T, Math.round(view.width)); lua.lua_pushinteger(T, Math.round(view.height)); return 2; },
    FullScreen: () => {
      void landscapePreference.enterFullscreen();
    },
    PlayMPEG: () => {},
    PlayMIDI: (T) => {
      musicFile = str(T, 1);
      restartMusic();
    },
    PlayWAV: (T) => {
      sfx(str(T, 1));
    },
  });
  setGlobal("browser_source", (T) => {
    lua.lua_pushstring(T, getfile(str(T, 1)));
    return 1;
  });
  setGlobal('browser_journey_load',T=>{
    const id=num(T,1);
    if(id===0){journey=bindJourneyEcho(pendingJourney||normalizeJourney(),journeyProfile);pendingJourney=null;chapterPreview=null;}
    else if(id===4){journey=pendingChapterJourney||normalizeJourney({version:1,cycle:1,trial:true,origin:'chapter',legacy:'none',kongming:false});pendingChapterJourney=null;}
    else {journey=bindJourneyEcho(normalizeJourney(journeySlots.get(String(id))),journeyProfile);chapterPreview=null;}
    C.skills=structuredClone(classicArtNumbers);if(journey.growth)applyArtNumbers(C.skills,nativeBalance);
    // Original campaigns always begin at home; other historic visits cannot be reconstructed.
    if(id>0&&journey.explored===undefined)journey.explored=journey.trial?[]:[70];
    pendingFastTravel=-1;journeyFinished=false;pendingHomecoming='';displayAlias.clear();return 0;
  });
  setGlobal('browser_dispersal_quest',T=>{lua.lua_pushboolean(T,advanceDispersalQuest(journey,str(T,1)));return 1;});
  setGlobal('browser_luohan_reveal',T=>{const ok=!journey.trial&&!!journey.growth;if(ok)journey.luohanRevealed=true;lua.lua_pushboolean(T,ok);return 1;});
  setGlobal('browser_mark_dispersal',T=>{const ok=!journey.trial&&!journey.dispersalUsed&&journey.dispersalQuest==='ready';if(ok)journey.dispersalUsed=true;lua.lua_pushboolean(T,ok);return 1;});
  // 157：承继武学交给 journey-extension 的开局写入：返回 n, id1, lv1, id2, lv2 …（至多 6 门，13 个值）。
  setGlobal('browser_journey_inherit',T=>{const a=journey.inherit||[];lua.lua_pushinteger(T,a.length);for(const s of a){lua.lua_pushinteger(T,s.id);lua.lua_pushinteger(T,s.level);}return 1+2*a.length;});
  setGlobal('browser_journey_get',T=>{const v=journey[str(T,1)];if(typeof v==='string')lua.lua_pushstring(T,enc(v));else if(typeof v==='boolean')lua.lua_pushboolean(T,v);else lua.lua_pushinteger(T,v||0);return 1;});
  setGlobal('browser_story_reward',T=>{const key=str(T,1),action=str(T,2);if(['jinlun','xiexun'].includes(key)&&action==='claim')journey.storyRewards={...(journey.storyRewards||{}),[key]:true};lua.lua_pushboolean(T,!!journey.storyRewards?.[key]);return 1;});
  setGlobal('browser_journey_cleared',T=>{const k=str(T,1);lua.lua_pushboolean(T,!!clearedDirections(journeyProfile)[k]);return 1;});
  setGlobal('browser_ending_revelation',T=>{lua.lua_pushboolean(T,endingRevelationReady(journeyProfile,journey,str(T,1),!sceneTest&&!chapterPreview&&!new URLSearchParams(location.search).has('battle-test')));return 1;});
  setGlobal('browser_homecoming',T=>{const c=str(T,1);if((c==='return'||c==='stay')&&!journey.trial&&!chapterPreview)pendingHomecoming=c;return 0;});
  setGlobal('browser_journey_reward',T=>{if(journey.cycle>=2){const key=str(T,1);if(key==='kongming')journey.kongming=true;else if(key==='meizhuang'){const choice=str(T,2);if(['brush','lesson'].includes(choice)&&!journey.meizhuang)journey.meizhuang=choice;}else if(key==='inn-aid'){const choice=str(T,2);if(['doctor','medicine'].includes(choice)&&!journey.innAid)journey.innAid=choice;}else if(key==='inn-rest'&&journey.innAid)journey.innRested=true;}return 0;});
  const pushEcho=(T,v)=>{
    if(v===null||v===undefined)lua.lua_pushnil(T);
    else if(typeof v==='number')lua.lua_pushinteger(T,v);
    else if(typeof v==='boolean')lua.lua_pushboolean(T,v);
    else if(typeof v==='string')lua.lua_pushstring(T,enc(v));
    else {lua.lua_newtable(T);for(const [k,value] of Object.entries(v)){pushEcho(T,value);if(Array.isArray(v))lua.lua_rawseti(T,-2,Number(k)+1);else lua.lua_setfield(T,-2,enc(k));}}
  };
  setGlobal('browser_extra_items',T=>{pushEcho(T,Object.fromEntries(EXTRA_ITEM_IDS.map(id=>[id,C.items[id]])));return 1;});
  setGlobal('browser_inn_food',T=>{pushEcho(T,INN_FOOD);return 1;});
  setGlobal('browser_weapon_families',T=>{pushEcho(T,Object.fromEntries(Object.keys(WEAPON_MODEL_BY_ITEM).map(id=>[id,weaponModel(id).family==='heavy'||weaponModel(id).family==='snake'?'sword':id==='363'||id==='414'?'flute':weaponModel(id).family])));return 1;});
  setGlobal('browser_starter_kits',T=>{const kits={};for(const [pid,k] of Object.entries(STARTER_KITS))kits[pid]=k;pushEcho(T,kits);return 1;});
  setGlobal('browser_starter_state',T=>{pushEcho(T,journey.starterGrants||{});return 1;});
  setGlobal('browser_starter_save',T=>{journey.starterGrants=normalizeStarterGrants(tableValue(T,1));return 0;});
  setGlobal('browser_offhand_get',T=>{lua.lua_pushinteger(T,journey.offhand?.[String(num(T,1))]??-1);return 1;});
  setGlobal('browser_offhand_set',T=>{const pid=num(T,1),id=num(T,2),next={...(journey.offhand||{})};if(id<0)delete next[String(pid)];else next[String(pid)]=id;journey.offhand=normalizeOffhand(next);return 0;});
  setGlobal('browser_rest_state',T=>{pushEcho(T,journey.rest);return 1;});
  setGlobal('browser_rest_save',T=>{
    journey.rest=normalizeRestLocation({scene:num(T,1),x:num(T,2),y:num(T,3),direction:num(T,4)});
    const slot=num(T,5);
    saveFileBackup=['r','s','d'].map(k=>{const key=`data/${k}${slot}.grp`;return [key,files.get(key)?.slice()];});
    lastSaveOK=false;return 0;
  });
  setGlobal('browser_save_ok',T=>{lua.lua_pushboolean(T,lastSaveOK);return 1;});
  setGlobal('browser_creation_attributes',T=>{pushEcho(T,creationAttributes(journey.creation));return 1;});
  setGlobal('browser_visit_scene',T=>{recordVisit(journey,num(T,1));return 0;});
  setGlobal('browser_has_visited',T=>{lua.lua_pushboolean(T,(journey.explored||[]).includes(num(T,1)));return 1;});
  setGlobal('browser_take_travel',T=>{const id=pendingFastTravel;pendingFastTravel=-1;return push(T,id);});
  setGlobal('browser_travel_notice',T=>{routeFailure(str(T,1));return 0;});
  setGlobal('browser_homestead_state',T=>{pushEcho(T,normalizeHomestead(journey.homestead));return 1;});
  setGlobal('browser_homestead_save',T=>{journey.homestead=normalizeHomestead(tableValue(T,1));mapRevision++;return 0;});
  setGlobal('browser_outfit_state',T=>{pushEcho(T,journey.outfit);return 1;});
  setGlobal('browser_outfit_save',T=>{journey.outfit=normalizeOutfit(tableValue(T,1));return 0;});
  setGlobal('browser_teaching_state',T=>{pushEcho(T,journey.teaching);return 1;});
  setGlobal('browser_teaching_save',T=>{journey.teaching=normalizeTeaching(tableValue(T,1));return 0;});
  setGlobal('browser_pastime_state',T=>{pushEcho(T,journey.pastime);return 1;});
  setGlobal('browser_pastime_save',T=>{journey.pastime=normalizePastime(tableValue(T,1));return 0;});
  setGlobal('browser_growth_state',T=>{pushEcho(T,journey.growth);return 1;});
  setGlobal('browser_growth_save',T=>{if(journey.growth&&!journey.trial)journey.growth=normalizeGrowth(tableValue(T,1));return 0;});
  setGlobal('browser_mastery_state',T=>{pushEcho(T,journey.mastery);return 1;});
  setGlobal('browser_mastery_start',T=>{lua.lua_pushboolean(T,pendingMasteryStart&&!!journey.mastery);pendingMasteryStart=false;return 1;});
  setGlobal('browser_mastery_save',T=>{if(journey.trial&&journey.mastery)journey.mastery=normalizeMastery(tableValue(T,1));return 0;});
  setGlobal('browser_echo_trial',T=>{lua.lua_pushstring(T,enc(pendingEchoTrial));pendingEchoTrial='';return 1;});
  setGlobal('browser_echo_record',T=>{
    const trial=lua.lua_toboolean(T,1);
    if(trial&&lua.lua_gettop(T)>=2){const dir=str(T,2);pushEcho(T,endingEchoes(journeyProfile)[dir]||null);return 1;}
    if(trial){pushEcho(T,journeyProfile.echo||null);return 1;}
    const record=!journey.trial&&!journey.echoSpent?journey.echo:null;
    pushEcho(T,record&&record.cycle<journey.cycle?record:null);return 1;
  });
  setGlobal('browser_echo_spend',T=>{if(!journey.trial&&journey.echo&&journey.echoWon===true)journey.echoSpent=true;return 0;});
  setGlobal('browser_echo_visual',T=>{const id=num(T,1);echoVisual=id>=0?{enemyId:id,name:str(T,2),trial:lua.lua_toboolean(T,3),revealed:lua.lua_toboolean(T,4),realRecord:lua.lua_toboolean(T,5),extraId:lua.lua_gettop(T)>=6&&num(T,6)>=0?num(T,6):-1}:null;echoPortraitId=-1;fightVisual=movementVisual=null;return 0;});
  setGlobal('browser_echo_portrait',T=>{echoPortraitId=num(T,1);return 0;});
  setGlobal('browser_echo_progress',T=>{if(echoVisual)echoVisual.rounds=num(T,1);return 0;});
  setGlobal('browser_echo_result',T=>{echoResult={outcome:str(T,1),trial:lua.lua_toboolean(T,2),rounds:num(T,3)||0};if(echoResult.outcome==='won'&&!echoResult.trial&&!journey.trial)journey.echoWon=true;return 0;});
  setGlobal('browser_journey_difficulty',T=>{const d=echoVisual||new URLSearchParams(location.search).has('battle-test')?{hp:1,attack:1}:difficultyFor(journey.cycle);lua.lua_pushnumber(T,d.hp);lua.lua_pushnumber(T,d.attack);return 2;});
  setGlobal("browser_talk", (T) => {
    // Original talk777 runs only after event242 consumes the jade cup. This
    // transient appearance flag covers its drinking animation before D2=243.
    if (num(T, 1) === 777 && lastSnapshot.scene === 40) linghuJadeAccepted = true;
    const s = C.talk[num(T, 1)];
    if (s === undefined) throw Error("对话不存在 " + num(T, 1));
    lua.lua_pushstring(T, enc(s));
    return 1;
  });
  setGlobal("browser_test_battle", (T) => {
    const v = new URLSearchParams(location.search).get("battle-test");
    return push(T, v === null ? -1 : Math.max(0, Math.min(139, Number(v) || 0)));
  });
  // 本机限定，非法场景号回到正常首页；坐标无效时使用原入口。
  setGlobal("browser_test_scene", (T) => {
    if (!sceneTest) return push(T, -1);
    push(T, sceneTest.id);push(T, sceneTest.x);push(T, sceneTest.y);
    return 3;
  });
  setGlobal("browser_test_aim", (T) => {
    lua.lua_pushboolean(T, new URLSearchParams(location.search).get("fixture") === "aim");return 1;
  });
  setGlobal("browser_test_fixture", (T) => {
    lua.lua_pushboolean(T, new URLSearchParams(location.search).get("fixture") === "victory");
    return 1;
  });
  setGlobal("browser_battle_result", (T) => {
    events.push("BATTLE_RESULT:" + String(lua.lua_toboolean(T, 1)));
    return 0;
  });
  setGlobal("browser_epoch", (T) => push(T, Math.floor(Date.now() / 1000)));
  setGlobal("browser_has_save", (T) => {
    lua.lua_pushboolean(T, files.has("data/r" + num(T, 1) + ".grp"));
    return 1;
  });
}
// Original scene scores with sampled instruments, unlocked by a user gesture.
const scorePlayer = new JianghuAudio(globalThis.JY_MUSIC);
let musicOn = false,
  musicFile = "";
function restartMusic() {
  scorePlayer.select(musicFile);
}
function sfx(file) {
  const heavy =
    fightVisual?.weapon === 106 &&
    fightVisual.kind === 2 &&
    fightVisual.skill === 57;
  scorePlayer.effect(
    file,
    isFiveWheelVisual(fightVisual) ? "five-wheels" : heavy ? "heavy-sword" : undefined,
  );
}
async function toggleSound() {
  musicOn = await scorePlayer.toggle();
  refreshSound();
}
const refreshAudioSettings = mountAudioSettings($("#sound-settings"), scorePlayer, toggleSound);
function refreshSound() {
  musicOn = scorePlayer.enabled;
  $("#music").textContent = musicOn ? "♪ 配乐已开" : "♪ 配乐";
  $("#music").setAttribute("aria-pressed", String(musicOn));
  refreshAudioSettings();
}
scorePlayer.onChange = refreshSound;
$("#music").onclick = () => toggleSound().catch(() => {
  $("#music").textContent = "♪ 点此重试";
});
// Original auto combat checks Space/Return between combatants. Expose that
// existing control; do not mutate WAR, advance turns, or change battle rules.
$("#manual-battle").onclick = () => {
  if (lastSnapshot.status === 5 && lastSnapshot.autoFight && !currentDialog) queueKey(32);
};
$("#atlas-map").onclick = async () => {
  if (lastSnapshot.status === 5) {
    battleSpeed = (battleSpeed % 3) + 1;
    $("#atlas-map").textContent = `演出 ×${battleSpeed}`;
    return;
  }
  if (currentDialog) return;
  if (lastSnapshot.status !== 2) {
    await dialog("山河舆图", "走出此处，再展开江湖图寻找目的地。", [
      { label: "继续江湖", value: -1 },
    ]);
    return;
  }
  if(!canExplore())return;
  const dest = exploredDestinations(lastSnapshot,journey);
  const selected = await dialog(
    "山河舆图",
    "只记亲历之地。点击地点，即刻前往入口；尚未到访的地方不会出现在图上。\n剧情封锁与登崖条件依旧有效。",
    dest
      .map((d) => ({
        label:
          destinationLabel(d,dest,Object.values(lastSnapshot.destinations||{})) +
          (d.condition === 1
            ? " · 尚未开放"
            : d.condition === 2
              ? Object.values(lastSnapshot.party || {}).some((p) => p.agility >= 70)
                ? " · 可登崖"
                : " · 需轻功70"
              : ""),
        value: d.id,
        disabled: d.condition === 1 || d.condition === 2 && !Object.values(lastSnapshot.party||{}).some(p=>p.agility>=70),
      }))
      .concat([{ label: "返回", value: -1 }]),
    { menu: true },
  );
  const d = dest.find((x) => x.id === selected);
  if (d && canExplore() && lastSnapshot.status===2) {stopInput();pendingFastTravel=d.id;}
};
$("#nearby-menu").onclick = async () => {
  if (currentDialog || lastSnapshot.status !== 4) return;
  const nearby = [...$("#nearby").querySelectorAll("button")];
  const choice = await dialog("附近人物与出口", "选择目标后沿原地图自动行走。方向键可中断寻路。" +
    (nearby.some((b) => b.textContent.startsWith("天书台 ·")) ? "\n选择天书台后，在“物品 → 剧情物品”中使用对应天书。" : ""),
    nearby.map((b, i) => ({label: b.textContent, value: i})).concat([{label:"返回", value:-1}]), {menu:true});
  nearby[choice]?.click();
};
$("#training").onclick = () => requestPartyMember(0);
for(const button of document.querySelectorAll('[data-field-action]'))button.onclick=()=>{
 if(!canExplore()||![2,4].includes(lastSnapshot.status)||currentDialog)return;
 closeDrawer();stopInput();pendingFieldAction=Number(button.dataset.fieldAction);
};
const itemCatalog=mountItemCatalog({content:C,label:sourceLabel,beforeOpen:()=>{closeDrawer();stopInput();}});
$("#item-atlas").onclick=()=>itemCatalog.open();
$("#help").onclick = async () => {
  if (currentDialog) return;
  await dialog(
    "行走江湖",
    "当前目标：" + $("#objective").textContent + "\n\n" +
    "成长规则：每人所学外功、内功与轻功合计至多十门，研习须用本人挣得的心得；人物武学页可同时研习一门武功和一门心法，已学本领保留。主角每轮回可经特殊机缘遗忘一门武学，不返还心得；同行队友不能遗忘。原有存档继续沿用原规则。\n\n" +
    "点地面即可走过去；点人物或箱子会自动走近查看。靠近时右下角显示交互对象。金色圆圈标出落点。\n大地图与城镇：点击左侧队友姓名，查看装备、已学武功与修炼进度，在详情中更换装备或秘籍。\n手机：拖动左下摇杆行走，松手即停。摇杆按屏幕方向行走，横屏更方便。\n对话：轻触纸页翻页或继续，长台词也可上滑阅读；遇到选择时点选项。\n战斗结算后清除伤势、中毒、异气等负面状态；气血、内力消耗仍需补给。\n战斗：先选“移动”或招式，再用摇杆、方向键或点击亮格预选，按“移动到此／确认目标”行动；返回取消。点格不会直接出招。\n电脑：WASD／方向键，空格／E 交互，Enter 确认；Esc 或地图右键取消／菜单。\n“附近”可寻找人物、箱子和出口；“江湖图”可找地点。在家中卧榻或客栈睡觉后选择存档位。再用“存档 / 画面”导出已保存的进度或切换画面。",
    [{ label: "继续江湖", value: 1 }],
  );
};
const drawer = $("#hud-drawer"), drawerToggle = $("#hud-toggle");
function closeDrawer() { if (drawer.open) { stopInput(); drawer.close(); } }
drawerToggle.onclick = () => {
  stopInput();
  if (drawer.open) closeDrawer();
  else { drawer.showModal(); drawerToggle.setAttribute("aria-expanded", "true"); document.body.classList.add("hud-open"); }
};
$("#hud-close").onclick = closeDrawer;
drawer.addEventListener("close", () => {
  drawerToggle.setAttribute("aria-expanded", "false"); document.body.classList.remove("hud-open");
  scheduleBattlePulse();
});
drawer.addEventListener("click", e => {
  const r = drawer.getBoundingClientRect();
  if (e.target === drawer && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) closeDrawer();
});
drawer.addEventListener("click", e => {
  if (e.target.closest("nav button, #nearby button")) closeDrawer();
}, true);
const landscapePreference = mountLandscapePreference($("#stage"), () => { closeDrawer(); stopInput(); });

const keymap = {
  ArrowUp: 273,
  ArrowDown: 274,
  ArrowLeft: 276,
  ArrowRight: 275,
  w: 273,
  s: 274,
  a: 276,
  d: 275,
  " ": 32,
  Enter: 13,
  e: 32,
  Escape: 27,
  y: 121,
  n: 110,
};
window.addEventListener("keydown", (e) => {
  if (document.querySelector("dialog[open]")) return;
  if(e.code==='KeyR'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
    if(currentDialog?.battle){e.preventDefault();if(!e.repeat) $('#choices [data-shortcut="r"]:not(:disabled)')?.click();}
    return;
  }
  if (lastSnapshot.status === 5 && e.target?.id === "atlas-map" && ["Enter", " "].includes(e.key)) {
    e.preventDefault();
    if (!e.repeat) $("#atlas-map").click();
    return;
  }
  const k = keymap[e.key] ?? keymap[e.key.toLowerCase()]; // CapsLock/Shift 下大写字母也能走路与交互
  if (k === undefined) return;
  e.preventDefault();
  if (currentDialog) {
    if (e.repeat) return;
    const bs = [...$("#choices").querySelectorAll("button:not(:disabled)")];
    const i = bs.indexOf(document.activeElement);
    if (k === 273 || k === 276) bs[(i - 1 + bs.length) % bs.length]?.focus();
    else if (k === 274 || k === 275) bs[(i + 1) % bs.length]?.focus();
    else if (k === 13 || k === 32) {
      if (currentDialog.talk) advanceTalk();
      else if (document.activeElement?.tagName === "BUTTON") document.activeElement.click();
      else bs[0]?.click(); // 焦点在正文上时，确认默认（首个）选项
    }
    // 帮助、单按钮提示等确认框没有「返回」：唯一的按钮就是 Enter 会点的那个，Esc 同样关掉；Lua 菜单与是/否框不猜。
    else if (k === 27) (bs.find((b) => b.textContent === "返回") ||
      ($("#overlay").dataset.kind === "choice" && bs.length === 1 && $("#choices").childElementCount === 1 ? bs[0] : null))?.click();
    return;
  }
  if (e.repeat && [13,32,27].includes(k)) return;
  if(k===27 && canExplore() && [2,4].includes(lastSnapshot.status)){drawerToggle.click();return;}
  if (k===13 || k===32) { interact(); return; }
  heldKey=null;joystick?.cancel();
  // Keep one pending step: fast taps survive until Lua polls, while key repeat
  // cannot build a long walking queue during a slow frame.
  if ([273,274,275,276].includes(k)) keys.length=0;
  queueKey(k);
});
joystick = mountJoystick($("#joystick"), sequence => {
  if (currentDialog || document.querySelector("dialog[open]") || (!canExplore() && !battleSelection) || battleSelection?.locked || battleSelection?.kind === "cross") return;
  if (!sequence.length) {
    heldKey=null;keys.length=0;routeState=null;resumeRoute=null;
    if (battleSelection) { battleSelection.path=null;battleSelection.sent=null;battleSelection.target=null; }
    return;
  }
  if (heldKey?.sequence?.join()===sequence.join()) return;
  heldKey=null;keys.length=0;routeState=null;resumeRoute=null;
  if (battleSelection) { battleSelection.path=null;battleSelection.sent=null;battleSelection.target=null;battleSelection.message="";battleSelection.hint=""; }
  heldKey={sequence,index:0,nextAt:performance.now()+260};
  keys.push(joystickKey(heldKey));
}, () => { heldKey=null;keys.length=0; });
$("#battle-confirm").onclick = confirmBattle;
$("#battle-cancel").onclick = cancelBattle;
for (const b of document.querySelectorAll("[data-key]")) {
  const key = +b.dataset.key;
  b.addEventListener("pointerdown", (e) => {
    if (currentDialog || document.querySelector("dialog[open]")) return;
    // 对话刚收起，落在同位「交互」上的连点不再当作交互
    if (key===32 && performance.now() < talkClosedAt + 320) { e.preventDefault(); return; }
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    if (key===32) { interact(); return; }
    if (battleSelection && key===27) { cancelBattle(); return; }
    heldKey = null;
    joystick?.cancel();
    queueKey(key);
    if ([273, 274, 275, 276].includes(key)) heldKey = {key, pointer: e.pointerId, nextAt: performance.now() + 300};
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, (e) => { if (heldKey?.pointer === e.pointerId) heldKey = null; });
  b.onclick = (e) => { if (!e.detail && !currentDialog) { if(key===32)interact();else queueKey(key); } };
}
window.addEventListener("blur", () => {
  stopInput();
});
document.addEventListener("visibilitychange", () => {
  scorePlayer.setHidden(document.hidden);
  if (document.hidden) stopInput(); else scheduleBattlePulse();
});
reducedMotion.addEventListener("change", scheduleBattlePulse);
function resizeGame() {
  if (!joystick?.held?.()) stopInput(); // 摇杆仍被按住时，视口变化不该丢掉这次行走
  const next = gameViewport(cv.clientWidth, cv.clientHeight, remastered ? 2 : CLASSIC_DETAIL, devicePixelRatio);
  if (next.width === view.width && next.height === view.height && next.scale === view.scale) return;
  view = next; sizeSurfaces(); groundCache = null; clip = null;
  // Only presentation constants change. Never reset Lua state, turns or saves.
  if (L) {
    for (const [table, values] of Object.entries({CC:{ScreenW:view.width, ScreenH:view.height}, CONFIG:{Width:view.width, Height:view.height}})) {
      lua.lua_getglobal(L, to_luastring(table));
      if (lua.lua_istable(L, -1)) for (const [name, value] of Object.entries(values)) {
        lua.lua_pushinteger(L, Math.round(value)); lua.lua_setfield(L, -2, to_luastring(name));
      }
      lua.lua_pop(L, 1);
    }
  }
  if (lastFrameArgs) { paintFrame(...lastFrameArgs); present(); }
}
new ResizeObserver(resizeGame).observe($("#stage"));
window.readJYRemake = () => ({
  ...lastSnapshot,
  mode,
  graphicsMode,
  viewport: {...view, pixelWidth:cv.width, pixelHeight:cv.height},
  walking: walkMotion.sample(performance.now()),
  frame: lastFrameArgs?.slice(0, 7),
  dialog: currentDialog ? $("#dialog-title").textContent : null,
  errors: [...luaErrors],
  fightVisual,
  wheelVolley,
  movementVisual,
  echoVisual,
  displayAlias:Object.fromEntries(displayAlias),
  echoResult,
  effectFrames: [...effectFrames],
  occlusions: [...occlusions],
  furniture: [...furnitureDraws],
  furnitureRaster: readFurnitureRaster(),
  battleMap: currentBattleMap,
  battleGrid: {...zoomedBattleGrid(), zoom: battleZoom, camera: {...camera}},
  battleSpeed,
  battleSelection: battleSelection ? {kind:battleSelection.kind,cursor:{...battleSelection.cursor},origin:battleSelection.origin,target:battleSelection.target,locked:battleSelection.locked,inFlight:battleSelection.inFlight,pending:!!battleSelection.sent||!!battleSelection.path?.length,cells:isAttackPreview()?previewCells():null,targets:isAttackPreview()?previewTargets().map((p)=>p.id):null} : null,
  combatPoses: readCombatPoses(),
  characterArt: characterArtStats(),
  combatArt: combatArtStats(),
  combatRules,pendingAttack,combatOutcomes:combatOutcomeLog.slice(),
  artCallout:fightVisual?{pid:fightVisual.pid,skill:fightVisual.skill,name:fightVisual.artName}:null,
  battleFeedback: {frames:battleFeedbackFrames,active:mode==='battle'?controlledFighter()?.id:null,target:battleSelection?.kind==='target'?{...battleSelection.cursor}:null,reducedMotion:reducedMotion.matches},
  recentEvents: events.slice(-12),
  musicOn,
  chapterPreview,
  journey:{...journey,label:journeyLabel(journey),difficulty:difficultyFor(journey.cycle)},journeyProfile:{...journeyProfile},
  audio: {
    state: scorePlayer.context?.state || "not-started",
    voices: scorePlayer.active.size,
    file: musicFile,
    lastEffect: scorePlayer.lastEffect || null,
    mode: scorePlayer.mode, status: scorePlayer.status,
    musicVolume: scorePlayer.musicVolume, effectVolume: scorePlayer.effectVolume,
    ducked: scorePlayer.ducked, recording: scorePlayer.recording?.key || null,
    cachedTracks: scorePlayer.buffers.size,
    lastLoadError: scorePlayer.lastLoadError || null,
  },
  source: { events: 1018, scenes: 84, battles: 140 },
});
async function boot() {
  try {
    if (!sceneTest) {
      db = await new Promise((resolve, reject) => {
        const req = indexedDB.open("jy-remake-v1", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("slots");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      // Q1 2026-10-02：通关档案读不懂（别的版本写下）时按未通关开局，本机记录不动，直到本程通关才会写入。
      journeyProfile=await readProfile(db).catch(e=>{console.warn('通关记录暂不兼容：'+(e?.message||e));return normalizeProfile();});
      for (const slot of ["1", "2", "3"]) {
        const save = await new Promise((resolve, reject) => {
          const r = db.transaction("slots").objectStore("slots").get(slot);
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        if (save){
          // Q1 2026-10-02：一位读不懂（别的版本写下）只跳过这一位，原数据不动；另两位与「存档 / 画面」照常可用。
          let savedJourney,bind=false;
          try{savedJourney=normalizeJourney(save.journey);bind=!savedJourney.trial&&savedJourney.echo===undefined;
            if(bind)bindJourneyEcho(savedJourney,save.journeyProfile!==undefined?save.journeyProfile:journeyProfile);}
          catch(e){console.warn('存档位'+slot+'暂不兼容，已跳过，原数据保留：'+(e?.message||e));continue;}
          if(bind){
            // Persist only the optional binding, retaining the original date and all three buffers.
            await new Promise((resolve,reject)=>{
              const tx=db.transaction('slots','readwrite');
              tx.objectStore('slots').put({...save,journey:savedJourney},slot);
              tx.oncomplete=resolve;
              // 绑定只是可选记录：写不进（如空间满）不拦开局，下次歇宿保存时随存档写入。
              tx.onabort=tx.onerror=()=>{console.warn('旧影绑定未能写入，原存档仍保留。',tx.error);resolve();};
            });
          }
          journeySlots.set(slot,savedJourney);
          slotDates.set(slot,save.date);
          for (const k of ["r", "s", "d"]) files.set(`data/${k}${slot}.grp`, new Uint8Array(save[k]));
        }
      }
    } else {
      const notice = document.createElement('span');
      notice.id = 'scene-test-notice';notice.textContent = '场景巡检 · 不保存进度';
      $('#stage').append(notice);
      $('#save-status').textContent = notice.textContent;
      $('#portable').hidden = true;
      $('#system').hidden = true;
    }
    await Promise.all(
      ["smap", "mmap", "wmap", "hdgrp", "eft"].flatMap((p) =>
        Array.from(
          { length: A[p].pages },
          (_, i) =>
            new Promise((resolve) => {
              const im = loadPage(p, i);
              if (im.complete && im.naturalWidth) resolve();
              else {
                im.onload = resolve;
                im.onerror = () => {
                  fail("画面资源加载失败 " + p);
                  resolve();
                };
              }
            }),
        ),
      ),
    );
    await Promise.all([loadCharacterAtlas(),loadHeroSprites(),loadModaBattleSprites(),loadWangjiSprite(),loadCombatArt(),loadSignatureArt(),loadHeroWeaponArt(),
      // Canvas uses the same local fonts as the DOM; a failed font never blocks play.
      document.fonts.load('16px "Jianghu Song"').catch(()=>[]),
      document.fonts.load('12px "Jianghu Song Small"').catch(()=>[]),
    ]);
    if (remastered) await Promise.all([
      loadRemasterSprites(),
      loadWater(),
      loadMaterials(),
      loadWinter(),
      titleImage.decode(),
    ]);

    if (!sceneTest) mountPortableMenu(db, {graphicsMode, beforeOpen: stopInput,getCombatRules:()=>combatRules,setCombatRules:value=>{combatRules=value==='enhanced'?'enhanced':'classic';try{localStorage.setItem('jy-combat-rules',combatRules);}catch{} },
      getBattleView:()=>({zoom:battleZoomPref,grid:battleGridPref}),
      setBattleView:({zoom,grid})=>{
        if(zoom!==undefined){battleZoomPref=zoom==='standard'?'standard':'near';try{localStorage.setItem('jy-battle-zoom',battleZoomPref);}catch{}}
        if(grid!==undefined){battleGridPref=!!grid;try{localStorage.setItem('jy-battle-grid',battleGridPref?'on':'off');}catch{}}
      }});
    L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);
    register();
    co = lua.lua_newthread(L);
    const rc = lauxlib.luaL_loadbuffer(
      co,
      bytes(JY_BRIDGE),
      bytes(JY_BRIDGE).length,
      to_luastring("@browser-bridge"),
    );
    if (rc !== lua.LUA_OK) throw Error(decode.decode(lua.lua_tolstring(co, -1)));
    $("#loading").hidden = true;
    $("#loading").style.display = "none";
    // 物品图（去赭红底、新物品压像素）在后台备好，行囊第一次打开时已是新图。
    setTimeout(() => prepareItemArt(), 800);
    await resume();
  } catch (e) {
    fail(e?.message ?? String(e));
  }
}
boot();

// Read-only catalogue stays within the game viewport and never changes saves.
const martialAtlasDialog=document.getElementById('martial-catalog-dialog');
// 157 品第：图鉴页不读存档，由这里把「见过」名单（当前队伍所学招式、行囊与身上的秘籍）交给它；只读快照，不写任何东西。
const martialSeen=()=>{
 const party=Object.values(lastSnapshot.party||{}),bag=Object.values(lastSnapshot.inventory||{}).map(x=>x.id);
 const books=[...bag.filter(id=>C.items[id]?.['类型']===2),...party.map(p=>p.book)].filter(n=>Number.isInteger(n)&&n>=0);
 return {type:'martial-catalog-seen',skills:party.flatMap(p=>Object.values(p.skills||{})).filter(n=>Number.isInteger(n)&&n>0),books};
};
const postMartialSeen=()=>martialAtlasDialog.querySelector('iframe').contentWindow?.postMessage(martialSeen(),location.origin);
document.getElementById('martial-atlas').addEventListener('click',()=>{
 const frame=martialAtlasDialog.querySelector('iframe');if(!frame.getAttribute('src'))frame.src='martial-catalog.html';
 martialAtlasDialog.showModal();postMartialSeen();
});
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==martialAtlasDialog.querySelector('iframe').contentWindow)return;if(event.data?.type==='close-martial-catalog')martialAtlasDialog.close();else if(event.data?.type==='martial-catalog-ready')postMartialSeen();});
