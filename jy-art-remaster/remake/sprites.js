import frames from "./sprite-frames.json";
import { furnitureShapes } from "./furniture.js";
import { buildDiWalk } from "./di-walk.js";
import { buildHeroWalk, HERO_SHEET } from "./hero-walk.js";
import { buildJinlunWalk } from "./jinlun-walk.js";
import { buildShiWalk } from "./shi-walk.js";
import { buildLinghuWalk } from "./linghu-walk.js";
import { buildQiaoWalk } from "./qiao-walk.js";
import { buildBeggarWalk, isBeggarFighter } from "./beggar-walk.js";
import { isFiveWheelVisual } from "./effects.js";
import { characterRaster, poseKey, hasCharacterAtlas, reducedSource } from './character-atlas.js';
import { coherentBinding, attackBeat, paintedLoadout, xiaoLongNvPairedArt, strikeHold } from './combat-animation.js';
import { combatRaster } from './combat-art.js';
import {paintHeroWeapon,heroWeaponPlacement} from './hero-weapon-rig.js';
import {drawWeaponModel,weaponModel} from './weapon-models.js';
const sheets = new Map();
const baiBattleSheets = new Set(['ne','se','nw','sw'].flatMap(direction=>
  ['guard','strike'].map(phase=>`baiwanjian-battle-body-${direction}-${phase}-55px.png`)));
const modaBattleSheet = 'moda-battle-body-four-directions-guard-strike-v1.png';
const nativeAlphaSheets = new Set([
  "huo-qingtong-npc-v1.png",
  "yinggu-concept-standing-seated-v1-transparent.png",
  "hongantong-concept-four-directions-v1-transparent.png",
  "qiuqianren-seated-v2-transparent.png",
  "long-mu-island-masters-concept-v1-transparent.png",
  "long-mu-island-masters-concept-v2-transparent.png",
  "baiwanjian-concept-four-directions-v3-transparent.png",
  "yue-laosan-scene-v1-transparent.png",
  "jinhua-popo-scene-v2-transparent.png",
  "ouyangke-scene-v1-transparent.png",
  "xuanci-scene-v1-transparent.png",
  "qiuchuji-scene-v1-transparent.png",
  "moda-scene-v1-transparent.png",
  "suxinghe-chess-v1-transparent.png",
  "lanfenghuang-scene-v1-transparent.png",
  "hetaichong-scene-v1-transparent.png",
  "pingyizhi-seated-v1-transparent.png",
  "kongbala-pili-hall-seated-v1-transparent.png",
  "xuemuhua-scene-v1-transparent.png",
  "huqingniu-scene-v2-transparent.png",
  "tianmen-scene-v2-transparent.png",
  "tianmen-seated-chair-v1-transparent.png",
  "danqingsheng-mei-manor-scene-v1-transparent.png",
  "tangwenliang-kongtong-scene-v1-transparent.png",
  "fanyao-guangming-scene-v2-transparent.png",
  "nanxian-scholar-scene-v2-purple.png",
  "beichou-northern-hermit-scene-v2-transparent.png",
  "wangnangu-butterfly-scene-v2-transparent.png",
  "wangyuyan-yanzhi-scene-v1-transparent.png",
  "murongfu-battle-body-four-directions-v1-transparent.png",
  "dingxian-hengshan-scene-v2-transparent.png",
  "huangzhonggong-mei-manor-qin-scene-v3-transparent.png",
  "condor-npc-v1.png",
  "tubiweng-sourcecorrected-standing-28x55.png",
  "tubiweng-sourcecorrected-seated-writing-48x61.png",
  "heibaizi-mei-manor-scene-v7-transparent.png",
  "cave-serpent-v1.png",
  "cave-serpent-defeated-v1.png",
]);
// Scene NPCs drawn straight from their source sheet until the next
// character-atlas bake folds them in; then they can leave this set.
const directNpcSheets = new Set(["yinggu-concept-standing-seated-v1-transparent.png", "hongantong-concept-four-directions-v1-transparent.png", "qiuqianren-seated-v2-transparent.png", "long-mu-island-masters-concept-v1-transparent.png", "long-mu-island-masters-concept-v2-transparent.png", "baiwanjian-concept-four-directions-v3-transparent.png", "yue-laosan-scene-v1-transparent.png", "jinhua-popo-scene-v2-transparent.png", "ouyangke-scene-v1-transparent.png", "xuanci-scene-v1-transparent.png", "qiuchuji-scene-v1-transparent.png", "moda-scene-v1-transparent.png", "suxinghe-chess-v1-transparent.png", "lanfenghuang-scene-v1-transparent.png", "hetaichong-scene-v1-transparent.png", "pingyizhi-seated-v1-transparent.png", "xuemuhua-scene-v1-transparent.png", "huqingniu-scene-v2-transparent.png", "tianmen-scene-v2-transparent.png", "danqingsheng-mei-manor-scene-v1-transparent.png", "tangwenliang-kongtong-scene-v1-transparent.png", "fanyao-guangming-scene-v2-transparent.png", "nanxian-scholar-scene-v2-purple.png", "beichou-northern-hermit-scene-v2-transparent.png", "wangnangu-butterfly-scene-v2-transparent.png", "dingxian-hengshan-scene-v2-transparent.png", "huangzhonggong-mei-manor-qin-scene-v3-transparent.png"]);
directNpcSheets.add("tubiweng-sourcecorrected-standing-28x55.png");
directNpcSheets.add("tubiweng-sourcecorrected-seated-writing-48x61.png");
directNpcSheets.add("heibaizi-mei-manor-scene-v7-transparent.png");
directNpcSheets.add("kongbala-pili-hall-seated-v1-transparent.png");
directNpcSheets.add("tianmen-seated-chair-v1-transparent.png");
directNpcSheets.add("wangyuyan-yanzhi-scene-v1-transparent.png");
directNpcSheets.add("murongfu-battle-body-four-directions-v1-transparent.png");
nativeAlphaSheets.add("weixiaobao-young-adult-four-directions-v6.png");
directNpcSheets.add("weixiaobao-young-adult-four-directions-v6.png");
const serpentFrames = [],
  animalRaster = [];
export const readAnimalRaster = () => animalRaster.map((row) => ({ ...row }));
let diWalk = [];
let heroWalk;
let wangjiSprite;
export async function loadWangjiSprite() {
  const im = new Image();
  im.src = 'assets/wangji-seated-v2-blue.png';
  await im.decode();
  wangjiSprite = im;
}
let jinlunWalk = [];
let shiWalk = [];
let linghuWalk = [];
let qiaoWalk = [];
let beggarWalk = [];
// Original whole plant ids, exact source bounds. Both scene and battle packs
// use these botanical objects; no placement, collision or event data changes.
const gardenPlants = new Map([
  [1394, [0, 95, 130, 51, 137]],
  [1395, [1, 86, 120, 44, 126]],
  [1396, [2, 96, 160, 48, 165]],
  [1397, [3, 95, 152, 46, 158]],
  [1398, [4, 96, 160, 48, 165]],
  [1399, [5, 95, 152, 46, 158]],
  [1143, [0, 33, 30, 15, 31]],
  [1144, [1, 33, 28, 17, 31]],
  [1150, [2, 23, 26, 4, 26]],
  [1152, [3, 32, 25, 13, 31]],
  [1153, [4, 31, 25, 18, 31]],
  [1154, [5, 33, 30, 15, 31]],
  [1155, [6, 33, 28, 17, 31]],
  [1156, [7, 33, 25, 15, 26]],
]);
const furniturePieces = new Map(),
  furnitureRaster = [];
const winterRocks = {
  1775: [0, 34, 20, 17, 24],
  1777: [1, 34, 20, 17, 23],
  1778: [2, 19, 16, 10, 22],
  1779: [3, 23, 17, 10, 22],
  1782: [3, 18, 15, 9, 18],
  1784: [4, 19, 14, 10, 17],
  1785: [3, 31, 14, 16, 19],
  1786: [5, 34, 17, 17, 21],
};

const combatPoses = [];
const battleEquipment = new Map();
const battleCarried = new Map();
const battleOffhand = new Map();
let weaponHandling=null;
export const setWeaponHandlingVisual = value => {weaponHandling=value;};
export const setBattleEquipment = (head, weapon, carried=weapon, offhand=-1) => {
  battleEquipment.set(head, weapon);
  battleCarried.set(head,carried);
  battleOffhand.set(head,offhand);
};
export const readCombatPoses = () => combatPoses.slice(-24);
export const furnitureAvailable = () => furniturePieces.size === furnitureShapes.size;
export const furniturePartBounds = (shape, part) => furniturePieces.get(shape)?.[part]?.bounds;
export const readFurnitureRaster = () => furnitureRaster.map((row) => ({ ...row }));
export function drawFurnitureSprite(ctx, shape, part, x, y) {
  const piece = furniturePieces.get(shape)?.[part];
  if (!piece) return false;
  const [w, h, ax, ay] = piece.bounds;
  if (w && h) ctx.drawImage(piece.canvas, x - ax, y - ay, w, h);
  return true;
}
// Chroma key at the rendering boundary; generated PNGs remain untouched on disk.
export async function loadHeroSprites() {
  const im = new Image();
  im.src = 'assets/' + HERO_SHEET;
  await im.decode();
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const pixels = g.getImageData(0, 0, c.width, c.height);
  for (let i=0; i<pixels.data.length; i+=4) {
    const [r, green, b] = pixels.data.subarray(i, i+3);
    if (r-green>18 && b-green>18) pixels.data[i+3]=0;
  }
  g.putImageData(pixels, 0, 0);
  // Keep this separate from the full remaster sheet map: classic mode should
  // not enable or load unrelated character and scenery replacements.
  heroWalk = buildHeroWalk(new Map([[HERO_SHEET, c]]));
}
export async function loadBaiBattleSprites() {
  await Promise.all([...baiBattleSheets].map(async (file) => {
    const im = new Image();
    im.src = 'assets/' + file;
    await im.decode();
    const canvas = document.createElement('canvas');
    canvas.width = im.width;
    canvas.height = im.height;
    canvas.getContext('2d').drawImage(im, 0, 0);
    sheets.set(file, canvas);
  }));
}
export async function loadModaBattleSprites() {
  const im = new Image();
  im.src = 'assets/' + modaBattleSheet;
  await im.decode();
  sheets.set(modaBattleSheet, im);
}
export async function loadRemasterSprites(authoring = false) {
  const furnitureFiles=new Set([...furnitureShapes.values()].map(spec=>spec.file));
  await Promise.all(
    [...new Set(Object.keys(frames).filter(file => authoring || furnitureFiles.has(file) || directNpcSheets.has(file) || /^(cabinet|trees|rocks|furniture|groundcover|temple-statues|gold-)/.test(file)))].map(async (file) => {
      const im = new Image();
      im.src = "assets/" + file;
      await im.decode();
      const canvas = document.createElement("canvas");
      canvas.width = im.width;
      canvas.height = im.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(im, 0, 0);
      const data = ctx.getImageData(0, 0, im.width, im.height);
      for (let i = 0; i < data.data.length; i += 4) {
        const [r, g, b] = data.data.subarray(i, i + 3);
        // Also key the dim and antialiased magenta between fine leaves.
        if (!nativeAlphaSheets.has(file) && r - g > 18 && b - g > 18) data.data[i + 3] = 0;
      }
      ctx.putImageData(data, 0, 0);
      sheets.set(file, canvas);
    }),
  );
  await loadBaiBattleSprites();
  if (authoring) {
  diWalk = buildDiWalk(sheets, frames);
  await loadHeroSprites();
  jinlunWalk = buildJinlunWalk(sheets, frames);
  shiWalk = buildShiWalk(sheets, frames);
  linghuWalk = buildLinghuWalk(sheets, frames);
  qiaoWalk = buildQiaoWalk(sheets, frames);
  beggarWalk = buildBeggarWalk(sheets, frames);
  unpackSerpentFrames();
  }
  await loadFurniturePieces();
}
// Long tails cross adjacent atlas rectangles. Unpack the connected animal in
// each rectangle once, so the neighbouring tail cannot enter its draw call.
// This only prepares rendering canvases; generated PNGs remain unchanged.
function unpackSerpentFrames() {
  serpentFrames.length = animalRaster.length = 0;
  const sheet = sheets.get("cave-serpent-v1.png");
  for (const [index, [sx, sy, w, h]] of frames["cave-serpent-v1.png"].entries()) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    g.drawImage(sheet, sx, sy, w, h, 0, 0, w, h);
    const data = g.getImageData(0, 0, w, h),
      seen = new Uint8Array(w * h);
    let largest = [];
    for (let i = 0; i < seen.length; i++) {
      if (seen[i] || data.data[i * 4 + 3] <= 16) continue;
      const q = [i];
      seen[i] = 1;
      for (let at = 0; at < q.length; at++) {
        const n = q[at],
          x = n % w;
        for (const k of [x ? n - 1 : -1, x < w - 1 ? n + 1 : -1, n - w, n + w]) {
          if (k < 0 || k >= seen.length || seen[k] || data.data[k * 4 + 3] <= 16) continue;
          seen[k] = 1;
          q.push(k);
        }
      }
      if (q.length > largest.length) largest = q;
    }
    const keep = new Uint8Array(w * h);
    for (const n of largest) {
      const x = n % w,
        y = Math.floor(n / w);
      for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++)
        for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) keep[yy * w + xx] = 1;
    }
    let excludedPixels = 0;
    for (let i = 0; i < keep.length; i++)
      if (!keep[i] && data.data[i * 4 + 3]) {
        data.data[i * 4 + 3] = 0;
        excludedPixels++;
      }
    g.putImageData(data, 0, 0);
    serpentFrames.push(c);
    animalRaster.push({ index, bodyPixels: largest.length, excludedPixels, width: w, height: h });
  }
}
async function loadFurniturePieces() {
  const atlas = globalThis.JY_ATLAS.smap.frames,
    pages = new Map();
  const pageIds = new Set(
    [...furnitureShapes.values()].flatMap((g) => g.parts.map(([id]) => atlas[id][0])),
  );
  await Promise.all(
    [...pageIds].map(async (id) => {
      const im = new Image();
      im.src = `assets/smap-${id}.png`;
      await im.decode();
      pages.set(id, im);
    }),
  );
  const scale = 2;
  for (const [shape, spec] of furnitureShapes) {
    const file = spec.file,
      [width, height, ax, ay] = spec.bounds,
      W = width * scale,
      H = height * scale;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const [sx, sy, sw, sh] = frames[file][spec.index],
      fit = Math.min(W / sw, H / sh);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      sheets.get(file),
      sx,
      sy,
      sw,
      sh,
      (W - sw * fit) / 2,
      H - sh * fit,
      sw * fit,
      sh * fit,
    );
    const painted = ctx.getImageData(0, 0, W, H);
    const owner = new Int16Array(W * H).fill(-1);
    // Source opacity identifies which original draw call owned each region.
    // New edges inherit the nearest source region; no new painted pixel is lost.
    for (let part = 0; part < spec.parts.length; part++) {
      const [id, dx, dy, dz = 0] = spec.parts[part],
        [page, x, y, w, h, xo, yo] = atlas[id];
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      g.drawImage(pages.get(page), x, y, w, h, 0, 0, w, h);
      const data = g.getImageData(0, 0, w, h).data;
      const ox = (18 * (dx - dy) - xo + ax) * scale,
        oy = (9 * (dx + dy) - dz - yo + ay) * scale;
      for (let py = 0; py < h; py++)
        for (let px = 0; px < w; px++) {
          if (!data[(py * w + px) * 4 + 3]) continue;
          for (let yy = 0; yy < scale; yy++)
            for (let xx = 0; xx < scale; xx++)
              owner[(oy + py * scale + yy) * W + ox + px * scale + xx] = part;
        }
    }
    const queue = new Uint32Array(owner.length);
    let tail = 0;
    for (let i = 0; i < owner.length; i++) if (owner[i] >= 0) queue[tail++] = i;
    for (let head = 0; head < tail; head++) {
      const i = queue[head],
        x = i % W,
        y = Math.floor(i / W);
      for (const n of [
        x ? i - 1 : -1,
        x < W - 1 ? i + 1 : -1,
        y ? i - W : -1,
        y < H - 1 ? i + W : -1,
      ])
        if (n >= 0 && owner[n] < 0) {
          owner[n] = owner[i];
          queue[tail++] = n;
        }
    }
    let paintedPixels = 0,
      copiedPixels = 0;
    for (let i = 3; i < painted.data.length; i += 4) if (painted.data[i]) paintedPixels++;
    const pieces = spec.parts.map(([, dx, dy, dz = 0], part) => {
      const pixels = ctx.createImageData(W, H);
      let left = W,
        top = H,
        right = -1,
        bottom = -1;
      for (let i = 0; i < owner.length; i++) {
        if (owner[i] !== part || !painted.data[i * 4 + 3]) continue;
        pixels.data.set(painted.data.subarray(i * 4, i * 4 + 4), i * 4);
        copiedPixels++;
        const x = i % W,
          y = Math.floor(i / W);
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
      const c = document.createElement("canvas");
      c.width = Math.max(1, right - left + 1);
      c.height = Math.max(1, bottom - top + 1);
      if (right < 0) return { canvas: c, bounds: [0, 0, 0, 0] };
      c.getContext("2d").putImageData(pixels, -left, -top);
      return {
        canvas: c,
        bounds: [
          c.width / scale,
          c.height / scale,
          ax + 18 * (dx - dy) - left / scale,
          ay + 9 * (dx + dy) - dz - top / scale,
        ],
      };
    });
    furniturePieces.set(shape, pieces);
    furnitureRaster.push({
      shape,
      file,
      pieces: pieces.length,
      paintedPixels,
      copiedPixels,
      unowned: owner.length - tail,
    });
  }
}
export function drawHero(ctx, pic, x, y, world = false, motion = null) {
  if (!heroWalk || pic < 2501 || pic >= 2529) return false;
  const direction = Math.floor((pic - 2501) / 7),
    step = (pic - 2501) % 7;
  const newFigure=combatRaster({actor:0,direction,neutral:true,walk:motion?motion.active:!!step,phase:motion?Math.floor(motion.phase*8)%8:Math.floor((step-1)*8/6)});
  const { canvas, frame: [sx, sy, w, h, ax, ay], scale: baseScale } = newFigure ||
    (motion ? (motion.active ? heroWalk.smooth[direction][Math.floor(motion.phase * 12) % 12] : heroWalk.stand[direction])
      : step ? heroWalk.explore[direction][step - 1] : heroWalk.stand[direction]);
  const scale = baseScale * (world ? 0.75 : 1);
  ctx.fillStyle = "#142c2359";
  ctx.beginPath();
  ctx.ellipse(x, y - 2, world ? 7 : 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(
    canvas,
    sx,
    sy,
    w,
    h,
    x - ax * scale,
    y - 3 - ay * scale,
    w * scale,
    h * scale,
  );
  return true;
}
// Register every pulling vignette by its stationary stone, not the moving hero.
const goldPullRocks = [
  [303.5, 397, 190],
  [725.5, 400, 210],
  [1146.5, 402, 206],
  [1570.5, 402, 211],
  [260.5, 822, 208],
  [761, 821, 190],
  [1217, 821, 185],
  [1634.5, 821, 187],
];
export function drawGoldPull(ctx, sid, pic, x, y) {
  const file = "gold-pull-v1.png",
    im = sheets.get(file);
  if (sid !== 46 || !Number.isInteger(pic) || pic < 3932 || pic > 3982 || !im) return false;
  const index =
    pic <= 3938
      ? 0
      : pic <= 3943
        ? 1
        : pic <= 3949
          ? 2
          : pic <= 3956
            ? 3
            : pic <= 3962
              ? 2
              : pic <= 3968
                ? 3
                : pic === 3969
                  ? 4
                  : pic === 3970
                    ? 5
                    : pic <= 3978
                      ? 6
                      : 7;
  const [sx, sy, w, h] = frames[file][index],
    [rockX, rockY, rockW] = goldPullRocks[index],
    scale = 37 / rockW;
  // The source event is one tile NE of the hero: (+18, -9), with bottom -3.
  ctx.drawImage(
    im,
    sx,
    sy,
    w,
    h,
    x + 18.5 + (sx - rockX) * scale,
    y - 12 + (sy - rockY) * scale,
    w * scale,
    h * scale,
  );
  return true;
}
const baiWeapon=held=>held<0?410:held;
function battleFrame(pack, id, visual, movement, equipment) {
  const head=pack==='wmap'?Math.floor((id-2553)/4):Number(pack.slice(5));
  const own=equipment??{pid:head,held:battleEquipment.get(head),carried:battleCarried.get(head),offhand:battleOffhand.get(head)};
  const coherent=coherentBinding(pack,id,visual,movement,own,weaponHandling);
  if(coherent && combatRaster(coherent))return coherent;
  if(pack==='fight000' && visual) return {...fallbackBattlePose(pack,id,visual,movement),actor:0,heroIdle:true};
  // Bai Wanjian has no permanent item in the source record, even though he
  // fights with Snow Mountain swordplay. Item 410 is a visual-only plain sword
  // when that record is empty; a real held sword retains its own model.
  if(pack==='wmap'&&id>=2725&&id<=2728&&own.pid===43&&weaponModel(baiWeapon(own.held))?.family==='sword')
    return {actor:43,direction:id-2725,phase:0,baiBattle:true,weapon:baiWeapon(own.held)};
  if(pack==='fight043'&&visual?.pid===43&&visual.skill===44&&visual.kind===2&&weaponModel(baiWeapon(visual.weapon))?.family==='sword'){
    const direction=visual.direction,local=id-visual.frameStart-direction*visual.frameCount;
    if(direction>=0&&direction<4&&local>=0&&local<visual.frameCount){
      const contact=visual.contactFrame||Math.floor(visual.frameCount*.65);
      return {actor:43,direction,phase:local>=Math.max(2,contact-2)&&local<=contact+1?1:0,baiBattle:true,weapon:baiWeapon(visual.weapon)};
    }
  }
  // Mo Da's erhu and concealed thin sword are render-only. His source record
  // has no equipped item; combat rules and inventory keep that original state.
  if(pack==='wmap'&&id>=2633&&id<=2636&&own.pid===20)
    return {actor:20,direction:id-2633,phase:0,modaBattle:true};
  if(pack==='fight020'&&visual?.pid===20&&visual.skill===46&&visual.kind===2){
    const direction=visual.direction,local=id-visual.frameStart-direction*visual.frameCount;
    if(direction>=0&&direction<4&&local>=0&&local<visual.frameCount){
      const contact=visual.contactFrame??Math.floor(visual.frameCount*.65);
      return {actor:20,direction,phase:local>=Math.max(2,contact-2)&&local<=contact+1?1:0,modaBattle:true};
    }
  }
  // Yang Xiao's original ordinary-sword equipment. Keep his 40 attack frames
  // until each new sword-hand transition is corrected; this registers ready only.
  if (pack === "wmap" && id >= 2597 && id <= 2600 && paintedLoadout(11, battleEquipment.get(11)))
    return { actor: 11, direction: id - 2597, phase: 0 };
  // Original head93: ordinary disciples 271..280, staff skill73, 9 frames/direction.
  if (pack === "wmap" && id >= 2925 && id <= 2928 && paintedLoadout(93, battleEquipment.get(93)))
    return {
      actor: 93,
      direction: id - 2925,
      phase: isBeggarFighter(movement?.pid) ? (movement.phase ?? movement.step % 8) : 0,
      walk: isBeggarFighter(movement?.pid),
    };
  if (
    pack === "fight093" &&
    id >= 0 &&
    id < 36 &&
    isBeggarFighter(visual?.pid) &&
    paintedLoadout(93, visual.weapon) &&
    visual.kind === 4 &&
    visual.skill === 73 &&
    visual.effect === 12
  ) {
    const n = id % 9;
    return {
      actor: 93,
      direction: Math.floor(id / 9),
      phase: n === 0 ? 0 : n < 4 ? 1 : n < 7 ? 2 : 3,
    };
  }
  // Head50 has only one original fist sequence: 14 frames per facing, contact8.
  if (pack === "wmap" && id >= 2753 && id <= 2756 && paintedLoadout(50, battleEquipment.get(50)))
    return {
      actor: 50,
      direction: id - 2753,
      phase: movement?.pid === 50 ? (movement.phase ?? movement.step % 8) : 0,
      walk: movement?.pid === 50,
    };
  if (
    pack === "fight050" &&
    id >= 0 &&
    id < 56 &&
    visual?.pid === 50 &&
    paintedLoadout(50, visual.weapon) &&
    visual.kind === 1 &&
    visual.skill === 25 &&
    visual.effect === 7
  ) {
    const n = id % 14;
    return {
      actor: 50,
      direction: Math.floor(id / 14),
      phase: n < 2 ? 0 : n < 7 ? 1 : n < 11 ? 2 : 3,
    };
  }
  // Original head35 is unique to Linghu Chong. Sword group16/contact11/sound8.
  // Early Huashan only: later Dugu skill61 and named equipment keep source art.
  if (pack === "wmap" && id >= 2693 && id <= 2696 && paintedLoadout(35, battleEquipment.get(35)))
    return {
      actor: 35,
      direction: id - 2693,
      phase: movement?.pid === 35 ? (movement.phase ?? movement.step % 8) : 0,
      walk: movement?.pid === 35,
    };
  if (
    pack === "fight035" &&
    id >= 0 &&
    id < 64 &&
    visual?.pid === 35 &&
    paintedLoadout(35, visual.weapon) &&
    visual.kind === 2 &&
    visual.skill === 37
  ) {
    const n = id % 16;
    return {
      actor: 35,
      direction: Math.floor(id / 16),
      phase: n < 3 ? 0 : n < 11 ? 1 : n < 14 ? 2 : 3,
    };
  }
  // Source person/head38: four 20-frame fist sequences; contact at 16.
  if (pack === "wmap" && id >= 2705 && id <= 2708 && paintedLoadout(38, battleEquipment.get(38))) {
    const walk = movement?.pid === 38;
    return {
      actor: 38,
      direction: id - 2705,
      phase: walk ? (movement.phase ?? movement.step % 8) : 0,
      walk,
    };
  }
  if (
    pack === "fight038" &&
    id >= 0 &&
    id < 80 &&
    visual?.pid === 38 &&
    paintedLoadout(38, visual.weapon) &&
    visual.kind === 1 &&
    (visual.skill === 3 || (visual.skill === 23 && visual.effect === 40))
  ) {
    const n = id % 20;
    return {
      actor: 38,
      direction: Math.floor(id / 20),
      phase: n < 3 ? 0 : n < 13 ? 1 : n < 18 ? 2 : 3,
      taixuan: visual.skill === 23,
    };
  }
  // Original head62: four ten-frame five-wheel sequences, unequipped only.
  if (pack === "wmap" && id >= 2801 && id <= 2804 && paintedLoadout(62, battleEquipment.get(62))) {
    const walk = movement?.pid === 62;
    return {
      actor: 62,
      direction: id - 2801,
      phase: walk ? (movement.phase ?? movement.step % 4) : 0,
      walk,
    };
  }
  if (pack === "fight062" && id >= 0 && id < 40 && isFiveWheelVisual(visual)) {
    const n = id % 10;
    return {
      actor: 62,
      direction: Math.floor(id / 10),
      phase: n < 2 ? 0 : n < 5 ? 1 : n < 8 ? 2 : 3,
    };
  }
  // Person 77 owns head 98. Head 77 is a human, and skill 84 is also used by
  // the toad: neither may inherit the serpent's art.
  if (pack === "wmap" && id >= 2945 && id <= 2948 && paintedLoadout(98, battleEquipment.get(98))) {
    const walk = movement?.pid === 77;
    return {
      actor: 77,
      direction: id - 2945,
      phase: walk ? (movement.phase ?? movement.step % 4) : 0,
      walk,
    };
  }
  if (
    pack === "fight098" &&
    id >= 0 &&
    id < 32 &&
    visual?.pid === 77 &&
    paintedLoadout(98, visual.weapon) &&
    visual.kind === 4 &&
    visual.skill === 84
  )
    return { actor: 77, direction: Math.floor(id / 8), phase: id % 8 < 2 ? 0 : id % 8 < 7 ? 1 : 2 };
  // Yang Guo's source sword group follows 52 fist frames. Heavy-sword art is
  // equipment-specific: his right arm stays absent in independently drawn views.
  if (pack === "wmap" && id >= 2785 && id <= 2788 && battleEquipment.get(58) === 106)
    return { actor: 58, direction: id - 2785, phase: 0 };
  if (
    pack === "fight058" &&
    id >= 52 &&
    id < 100 &&
    visual?.pid === 58 &&
    visual.weapon === 106 &&
    (visual.skillType ?? visual.kind) === 2
  ) {
    const n = (id - 52) % 12;
    const beat=attackBeat(visual.sourceFrame??n,visual.contactFrame??5,visual.lastFrame??11,strikeHold(visual));
    return {
      actor: 58,
      direction: Math.floor((id - 52) / 12),
      phase: beat===3 ? 2 : beat===0 ? 0 : 1,
    };
  }
  // Xiao Longnu already carries two ordinary swords in the unequipped source art.
  // The front-view repairs supply opposite strides; the back-view drafts do not,
  // so NE/NW step on their two same-leg strides (motion394 P2) instead of gliding.
  if (pack === "wmap" && id >= 2789 && id <= 2792 && xiaoLongNvPairedArt(own)) {
    const direction = id - 2789;
    const walk = movement?.pid === 59;
    return { actor: 59, direction, phase: walk ? (movement.phase ?? movement.step % 4) : 0, walk };
  }
  if (
    pack === "fight059" &&
    id >= 0 &&
    id < 36 &&
    visual?.pid === 59 &&
    xiaoLongNvPairedArt(own) &&
    visual.kind === 2 &&
    visual.skill === 49
  ) {
    const n = id % 9;
    return {
      actor: 59,
      direction: Math.floor(id / 9),
      phase: n < 2 ? 0 : n < 4 ? 1 : n < 8 ? 2 : 0,
    };
  }
  // Miao Renfeng uses head3 alone. His ordinary jian appearance is limited
  // to the unequipped source skill55: 13 frames/facing, original contact11.
  if (pack === "wmap" && id >= 2565 && id <= 2568 && paintedLoadout(3, battleEquipment.get(3)))
    return { actor: 3, direction: id - 2565, phase: 0 };
  if (
    pack === "fight003" &&
    id >= 0 &&
    id < 52 &&
    visual?.pid === 3 &&
    paintedLoadout(3, visual.weapon) &&
    visual.kind === 2 &&
    visual.skill === 55
  ) {
    const n = id % 13;
    return {
      actor: 3,
      direction: Math.floor(id / 13),
      phase: n < 3 ? 0 : n < 11 ? 1 : n === 11 ? 2 : 3,
    };
  }
  // Source people111..120 share the snow beast head99 and 12-frame fist group.
  if (pack === "wmap" && id >= 2949 && id <= 2952 && paintedLoadout(99, battleEquipment.get(99)))
    return { actor: 99, direction: id - 2949, phase: 0 };
  if (
    pack === "fight099" &&
    id >= 0 &&
    id < 48 &&
    visual?.pid >= 111 &&
    visual.pid <= 120 &&
    paintedLoadout(99, visual.weapon) &&
    visual.kind === 1 &&
    visual.skill === 79
  ) {
    const n = id % 12;
    return {
      actor: 99,
      direction: Math.floor(id / 12),
      phase: n < 2 ? 0 : n < 5 ? 1 : n < 9 ? 2 : 3,
    };
  }
  // Zhou Botong: four original 12-frame fist sequences; source contact 7/sound 3.
  if (pack === "wmap" && id >= 2809 && id <= 2812 && paintedLoadout(64, battleEquipment.get(64)))
    return { actor: 64, direction: id - 2809, phase: 0 };
  if (
    pack === "fight064" &&
    id >= 0 &&
    id < 48 &&
    visual?.pid === 64 &&
    paintedLoadout(64, visual.weapon) &&
    visual.kind === 1 &&
    visual.skill === 21
  ) {
    const n = id % 12;
    return {
      actor: 64,
      direction: Math.floor(id / 12),
      phase: n < 2 ? 0 : n < 7 ? 1 : n < 11 ? 2 : 0,
    };
  }
  // Zhang Sanfeng is the sole source person with head5. His original fist
  // group has 15 frames per facing, contact at 13 and sound at 11.
  if (pack === "wmap" && id >= 2573 && id <= 2576 && paintedLoadout(5, battleEquipment.get(5)))
    return { actor: 5, direction: id - 2573, phase: 0 };
  if (
    pack === "fight005" &&
    id >= 0 &&
    id < 60 &&
    visual?.pid === 5 &&
    paintedLoadout(5, visual.weapon) &&
    visual.kind === 1 &&
    visual.skill === 20
  ) {
    const n = id % 15;
    return {
      actor: 5,
      direction: Math.floor(id / 15),
      phase: n < 3 ? 0 : n < 13 ? 1 : n === 13 ? 2 : 3,
    };
  }
  // Di Yun's unique head37: the named blade appears only after item115 is equipped.
  if (pack === "wmap" && id >= 2701 && id <= 2704 && battleEquipment.get(37) === 115) {
    const walk = movement?.pid === 37;
    return {
      actor: 37,
      direction: id - 2701,
      phase: walk ? (movement.phase ?? movement.step % 4) : 0,
      walk,
    };
  }
  if (
    pack === "fight037" &&
    id >= 0 &&
    id < 40 &&
    visual?.pid === 37 &&
    visual.weapon === 115 &&
    visual.kind === 3 &&
    visual.skill === 63
  ) {
    const n = id % 10;
    return {
      actor: 37,
      direction: Math.floor(id / 10),
      phase: n < 2 ? 0 : n < 4 ? 1 : n < 8 ? 2 : 3,
    };
  }
  // Wuji's unique head 9. Only the approved Kunlun empty-hand appearance.
  if (pack === "wmap" && id >= 2589 && id <= 2592 && battleEquipment.get(9) === -1) {
    const direction = id - 2589;
    // The other three draft cycles repeat the same leading leg; keep their
    // standing art until actual alternating strides are available.
    const walk = movement?.pid === 9 && direction === 1;
    return {
      actor: 9,
      direction,
      phase: walk ? (movement.phase ?? movement.step % 4) : 0,
      walk,
      stance: !walk,
    };
  }
  // Four 14-frame utility sequences precede four 10-frame fist sequences.
  // Keep original contact delay 8, sound delay 6 and source effect 27.
  if (
    pack === "fight009" &&
    id >= 56 &&
    id < 96 &&
    visual?.pid === 9 &&
    visual.weapon === -1 &&
    visual.kind === 1 &&
    visual.skill === 2
  ) {
    const n = (id - 56) % 10;
    return {
      actor: 9,
      direction: Math.floor((id - 56) / 10),
      phase: n < 2 ? 0 : n < 8 ? 1 : n === 8 ? 2 : 3,
    };
  }
  // Original unique heads, unequipped initial skills only. Generated poses
  // preserve source 14/13-frame timing; new walking cycles are not yet drawn.
  for (const [actor, start, count, kind, skill] of [
    [29, 2669, 14, 3, 64],
    [36, 2697, 13, 2, 31],
  ]) {
    if (pack === "wmap" && id >= start && id < start + 4 && paintedLoadout(actor, battleEquipment.get(actor)))
      return { actor, direction: id - start, phase: 0 };
    if (
      pack === `fight${String(actor).padStart(3, "0")}` &&
      id >= 0 &&
      id < count * 4 &&
      visual?.pid === actor &&
      paintedLoadout(actor, visual.weapon) &&
      visual.kind === kind &&
      visual.skill === skill
    ) {
      const n = id % count,
        delay = actor === 29 ? 8 : 7;
      return {
        actor,
        direction: Math.floor(id / count),
        phase: n < 2 ? 0 : n < delay ? 1 : n < count - 2 ? 2 : 3,
      };
    }
  }
  // Cheng's source head 2 is unique. Preserve the original utility range
  // (four 8-frame facings) followed by four 10-frame ordinary palm attacks.
  if (pack === "wmap" && id >= 2561 && id <= 2564 && paintedLoadout(2, battleEquipment.get(2))) {
    const walk = movement?.pid === 2;
    return {
      actor: 2,
      direction: id - 2561,
      phase: walk ? (movement.phase ?? movement.step % 4) : 0,
      walk,
    };
  }
  if (pack === "fight002" && visual?.pid === 2 && paintedLoadout(2, visual.weapon)) {
    if (
      id >= 0 &&
      id < 32 &&
      visual.kind === 0 &&
      visual.skill === 0 &&
      [0, 30, 36].includes(visual.effect)
    ) {
      const n = id % 8;
      return {
        actor: 2,
        direction: Math.floor(id / 8),
        care: true,
        phase: n < 2 ? 0 : n < 6 ? 1 : n === 6 ? 2 : 3,
      };
    }
    if (id >= 32 && id < 72 && visual.kind === 1 && visual.skill === 90) {
      const n = (id - 32) % 10;
      return {
        actor: 2,
        direction: Math.floor((id - 32) / 10),
        phase: n < 2 ? 0 : n < 7 ? 1 : n < 9 ? 2 : 3,
      };
    }
  }
  if (pack === "wmap" && id >= 2569 && id <= 2572 && paintedLoadout(4, battleEquipment.get(4)))
    return { actor: 4, direction: id - 2569, phase: 0 };
  // Source Yan Ji: only the knife sequence exists, eight frames per facing,
  // with the original contact delay at frame seven. Do not accelerate the hit.
  if (
    pack === "fight004" &&
    id >= 0 &&
    id < 32 &&
    visual?.pid === 4 &&
    visual.kind === 3 &&
    visual.skill === 67 &&
    paintedLoadout(4, visual.weapon)
  )
    return { actor: 4, direction: Math.floor(id / 8), phase: id % 8 < 2 ? 0 : id % 8 < 7 ? 1 : 2 };
  // Duan Yu: head 53 is unique in the source. Only his unequipped appearance
  // and original skill 30 are covered; other equipped weapons/skills retain art.
  if (pack === "wmap" && id >= 2765 && id <= 2768 && paintedLoadout(53, battleEquipment.get(53))) {
    const walk = movement?.pid === 53;
    return { actor: 53, direction: id - 2765, phase: walk ? movement.step % 4 : 0, walk };
  }
  // Source person 53: healing 0 frames, fist 14 frames per facing, delay 8.
  if (
    pack === "fight053" &&
    id >= 0 &&
    id < 56 &&
    visual?.pid === 53 &&
    visual.skill === 30 &&
    visual.kind === 1 &&
    paintedLoadout(53, visual.weapon)
  ) {
    const frame = id % 14;
    return {
      actor: 53,
      direction: Math.floor(id / 14),
      phase: frame < 2 ? 0 : frame < 8 ? 1 : frame < 12 ? 2 : 3,
    };
  }
  // This is the young Hu Fei with an ordinary dao. Named equipped weapons keep
  // their source art until that specific weapon has a matching production sheet.
  if (pack === "wmap" && id >= 2557 && id <= 2560 && paintedLoadout(1, battleEquipment.get(1))) {
    const walking = movement?.pid === 1;
    // The draft contains only two useful poses per facing, not four distinct strides.
    return {
      actor: 1,
      direction: id - 2557,
      phase: walking ? movement.step % 2 : 0,
      walk: walking,
    };
  }
  if (
    pack === "fight001" &&
    id >= 0 &&
    id < 44 &&
    visual?.pid === 1 &&
    visual.kind === 3 &&
    paintedLoadout(1, visual.weapon)
  ) {
    const direction = Math.floor(id / 11),
      frame = id % 11;
    const phase = frame < 2 ? 0 : frame < 5 ? 1 : frame < 9 ? 2 : 3;
    return { actor: 1, direction, phase };
  }
  if (pack === "wmap" && id >= 2553 && id <= 2556) {
    const direction = id - 2553;
    if (movement?.pid === 0) {
      const phase = movement.phase ?? movement.step % 8;
      return { direction, phase, walk: true };
    }
    return { direction, phase: 0, heroIdle: true };
  }
  // The original fist range follows four 10-frame healing sequences. Keep other
  // martial arts on their source animation until their own gestures are drawn.
  if (pack === "fight000" && id >= 40 && id < 88 && visual?.skill === 1) {
    const direction = Math.floor((id - 40) / 12),
      phase = Math.floor(((id - 40) % 12) / 2);
    // SW follow-through still twists too far in the generated sheet; retain the
    // preceding valid contact pose instead of inserting the wrong facing.
    return { direction, phase: direction === 3 && phase === 4 ? 3 : phase };
  }
  return null;
}
function fallbackBattlePose(pack,id,visual,movement){
 const head=pack==='wmap'&&id>=2553&&id<3009?Math.floor((id-2553)/4):/^fight\d+$/.test(pack)?Number(pack.slice(5)):-1;
 // Baked actor 77 is person 77 (the serpent), not human head 77.
 if(head<0||head===77)return null;
 const actor=head===98?77:head,direction=pack==='wmap'?(id-2553)%4:visual?.direction??1;
 const base={actor,direction,phase:0};
 if(actor===0)base.heroIdle=true;
 if(!characterRaster('concept:'+head)&&!characterRaster(poseKey(base))&&![24,41,42,86,104,111,112].includes(head))return null;
 const count=visual?.frameCount||1,progress=pack.startsWith('fight')?((id-(visual?.frameStart||0))%count)/Math.max(1,count-1):0;
 return {...base,concept:!!characterRaster('concept:'+head),action:Math.sin(Math.PI*progress)*3};
}
function registeredFrame(pose) {
  if(pose.coherent)return combatRaster(pose);
  if(pose.baiBattle){
    const direction=['ne','se','nw','sw'][pose.direction],phase=pose.phase===1?'strike':'guard';
    return {file:`baiwanjian-battle-body-${direction}-${phase}-55px.png`,frame:[0,0,72,55,36,55],scale:1};
  }
  if(pose.modaBattle){
    const phase=pose.phase===1?1:0;
    return {file:modaBattleSheet,frame:[pose.direction*384,phase*512,384,512,192,phase?471:509],scale:phase?55/471:55/509};
  }
  if(pose.actor===58 && hasCharacterAtlas()) {
    const cached=characterRaster(poseKey(pose));
    if(cached)return groundedHeavyFrame(pose,cached);
  }
  // 156A slice, Shi Potian's walk only. His other states already stand at -3;
  // the remaining layered walkers (35/37/50/62/93) have the same drift and are
  // left untouched until this one has been watched frame by frame.
  if(pose.actor===38 && pose.walk && hasCharacterAtlas()) {
    const cached=characterRaster(poseKey(pose));
    if(cached)return groundedWalkFrame(pose,cached);
  }
  // 156B, Hu Fei's walk only: his sixteen step cells were all bound at 52/260
  // although they are 252~270 rows tall. His fist/sabre sets are separate sheets
  // and keep their own sizes.
  if(pose.actor===1 && pose.walk && hasCharacterAtlas()) {
    const cached=characterRaster(poseKey(pose));
    if(cached)return hufeiWalkFrame(pose,cached);
  }
  if([24,41,42,86,104,112].includes(pose.actor)){
    const [file,height,index]=({24:['yu-standing-v1.png',44,pose.direction],41:['zhangsan-envoy-v2.png',54,2],42:['lisi-envoy-v1.png',54,2],86:['qingcheng-standing-v1.png',52,pose.direction],104:['condor-npc-v1.png',56,0],112:['huo-qingtong-npc-v1.png',54,0]})[pose.actor];
    const raw=characterRaster('raw:'+file+':'+index);if(raw){const frame=[...raw.frame];frame[4]=frame[2]/2;frame[5]=frame[3];return {...raw,frame,scale:height/frame[3]};}
  }
  if(pose.actor===111) {
    const file='weixiaobao-young-adult-four-directions-v6.png',frame=frames[file][pose.direction];
    return sheets.has(file)?{file,frame,scale:58/frame[3]}:characterRaster('wei:'+pose.direction);
  }
  if(pose.concept) return characterRaster('concept:'+pose.actor+(pose.appearance?':'+pose.appearance:''));
  const cached=characterRaster(poseKey(pose));if(cached)return cached;
  if (pose.heroIdle && heroWalk) return heroWalk.stand[pose.direction];
  if (pose.actor === 11) {
    const file = "yang-xiao-fixes-v2.png";
    return { file, frame: frames[file][pose.direction + 4], scale: 52 / 236 };
  }
  if (pose.actor === 93) {
    if (pose.walk) return beggarWalk[pose.direction][pose.phase];
    const file = pose.hurt ? "beggar-motion-v1.png" : "beggar-combat-v1.png";
    return {
      file,
      frame: frames[file][pose.hurt ? pose.direction + 4 : pose.phase * 4 + pose.direction],
      scale: pose.hurt ? 54 / frames[file][pose.direction][3] : 54 / 234,
    };
  }
  if (pose.actor === 50) {
    if (pose.walk) return qiaoWalk[pose.direction][pose.phase];
    if (pose.hurt) {
      const file = "qiao-walk-hurt-v1.png";
      return {
        file,
        frame: frames[file][pose.direction + 4],
        scale: 58 / frames[file][pose.direction][3],
      };
    }
    // NW uses a separately drawn two-palm variation. The incorrect left-hand
    // correction draft is never adopted as a right-palm or named Kanglong pose.
    if ([1, 2].includes(pose.phase) && [1, 2].includes(pose.direction)) {
      const nw = pose.direction === 2;
      const file = nw ? "qiao-palm-nw-v3.png" : "qiao-palm-fixes-v2.png";
      return { file, frame: frames[file][pose.phase - 1], scale: 58 / (nw ? 750 : 450) };
    }
    const file = "qiao-palm-draft-v1.png";
    return {
      file,
      frame: frames[file][pose.direction * 4 + pose.phase],
      scale: 58 / [233, 235, 228, 248][pose.direction],
    };
  }
  if (pose.actor === 35) {
    if (pose.walk) return linghuWalk[pose.direction][pose.phase];
    if (pose.hurt) {
      const file = pose.direction === 2 ? "linghu-hurt-nw-v2.png" : "linghu-hurt-draft-v1.png";
      const frame = frames[file][pose.direction === 2 ? 0 : pose.direction];
      return { file, frame, scale: 54 / frame[3] };
    }
    const selection = [
      [
        ["draft-v1", 0, 213],
        ["details-v4", 0, 627],
        ["draft-v1", 2, 213],
        ["draft-v1", 3, 213],
      ],
      [
        ["draft-v1", 4, 217],
        ["draft-v1", 5, 217],
        ["fixes-v2", 6, 217],
        ["draft-v1", 7, 217],
      ],
      [
        ["west", 0, 339],
        ["west", 1, 339],
        ["details-v4", 1, 640],
        ["west", 3, 339],
      ],
      [
        ["west", 4, 322],
        ["gaze-v5", 0, 630],
        ["west", 6, 322],
        ["west", 7, 322],
      ],
    ];
    const [variant, index, bodyHeight] = selection[pose.direction][pose.phase];
    const file = variant === "west" ? "linghu-west-v3.png" : `linghu-sword-${variant}.png`;
    return { file, frame: frames[file][index], scale: 54 / bodyHeight };
  }
  if (pose.actor === 38) {
    if (pose.walk) return shiWalk[pose.direction][pose.phase];
    if (pose.taixuan) {
      // West v2 corrects only SW preparation/release. Its NW cells are not
      // adopted. NW here is a left-palm variation, not a right-hand sword pose.
      const corrected = pose.direction === 3 && [1, 2].includes(pose.phase);
      const file = corrected ? "shi-taixuan-west-v2.png" : "shi-taixuan-draft-v1.png";
      const index = corrected ? pose.phase + 1 : pose.direction * 4 + pose.phase;
      return {
        file,
        frame: frames[file][index],
        // Raised hands do not shorten the body; scale from head-to-feet height.
        scale: 54 / (corrected ? 368 : [218, 232, 218, 231][pose.direction]),
      };
    }
    const file = "shi-potian-boxing-v1.png";
    return {
      file,
      frame: frames[file][pose.direction * 4 + pose.phase],
      scale: 54 / frames[file][pose.direction * 4][3],
    };
  }
  if (pose.actor === 62) {
    if (pose.walk) return jinlunWalk[pose.direction][pose.phase];
    const index = pose.direction * 4 + pose.phase;
    // Only these three corrected cells from v3 are adopted. Its other cells
    // have unwanted recolours and must never replace the validated v2 poses.
    const file = [10, 11, 13].includes(index)
      ? "jinlun-combat-fixes-v3.png"
      : "jinlun-combat-v2.png";
    return {
      file,
      frame: frames[file][index],
      scale: 64 / frames["jinlun-combat-v2.png"][pose.direction * 4][3],
    };
  }
  if (pose.actor === 77) {
    const file = "cave-serpent-v1.png",
      index =
        pose.direction * 5 + (pose.walk ? [1, 2, 1, 2][pose.phase % 4] : [0, 3, 4][pose.phase]);
    const [, , w, h, ax, ay] = frames[file][index];
    return {
      file,
      canvas: serpentFrames[index],
      frame: [0, 0, w, h, ax, ay],
      scale: [46 / 227, 44 / 234, 46 / 230, 44 / 248][pose.direction],
    };
  }
  if (pose.actor === 58) {
    let file = "yang-heavy-main-v1.png",
      index,
      scale;
    if (pose.direction === 0) {
      file = "yang-heavy-repair-v1.png";
      index = 0;
      scale = 54 / 385;
      if (pose.phase > 0) {
        // Wrong-arm NE extensions are excluded. The valid left-arm gathered
        // pose covers both preparation/contact until its full cut is drawn.
        file = "yang-heavy-ne-gather-v1.png";
        scale = 54 / 787;
      }
    } else if (pose.direction === 1) {
      index = pose.phase === 2 ? 5 : 4;
      scale = 54 / 247;
    } else if (pose.direction === 2) {
      index = 6 + pose.phase;
      scale = 54 / 236;
    } else {
      file = "yang-heavy-repair-v1.png";
      index = 4;
      scale = 54 / 409;
      if (pose.phase === 2) {
        file = "yang-heavy-sw-cross-v2.png";
        index = 0;
        scale = 54 / 920;
      }
    }
    const frame = [...frames[file][index]];
    frame[5] -= [5, 6, 8, 6][pose.direction] / scale;
    return { file, frame, scale };
  }
  if (pose.actor === 59) {
    const main = "longnu-dual-sword-v1.png",
      repair = "longnu-dual-repair-v1.png";
    let file = main,
      index = pose.direction * 5;
    let scale = 51 / frames[main][index][3];
    if (pose.walk && pose.phase === 1) index++;
    else if (pose.walk && pose.phase === 3 && (pose.direction === 0 || pose.direction === 2)) index += 2;
    else if (pose.walk && pose.phase === 3) {
      file = repair;
      index = pose.direction * 2;
      scale = 51 / frames[repair][index + 1][3];
    } else if (!pose.walk && pose.phase === 1) {
      file = repair;
      index = pose.direction * 2 + 1;
      scale = 51 / frames[repair][index][3];
    } else if (!pose.walk && pose.phase === 2) index += 4;
    return { file, frame: frames[file][index], scale };
  }
  if (pose.actor === 64) {
    let file = "zhou-kongming-v2.png",
      index = pose.direction * 3 + pose.phase;
    let scale = 51 / frames[file][pose.direction * 3][3];
    if (pose.phase === 2 && pose.direction === 1) {
      file = "zhou-punch-cross-v1.png";
      index = 0;
      scale = 51 / frames[file][0][3];
    }
    // The NW draft extends the wrong arm. Keep its valid gathered right fist
    // until an anatomically sound extension is available; never mirror it.
    if (pose.phase === 2 && pose.direction === 2) index = 7;
    const frame = [...frames[file][index]];
    frame[5] -= [6, 4, 6, 4][pose.direction] / scale;
    return { file, frame, scale };
  }
  if (pose.actor === 3) {
    let file = "miao-sword-v1.png",
      index,
      scale;
    if (pose.direction === 0) {
      index = pose.phase;
      scale = 55 / 263;
    } else if (pose.direction === 1) {
      index = pose.phase === 1 ? 5 : 4;
      scale = 55 / 273;
      if (pose.phase === 2) {
        file = "miao-sword-se-point-v2.png";
        index = 0;
        scale = 55 / frames[file][0][3];
      }
    } else if (pose.direction === 2) {
      index = 6;
      scale = 55 / 244;
      if (pose.phase === 2) {
        file = "miao-sword-nw-parry-v2.png";
        index = 0;
        // Exclude the small blade tip above the crown from body calibration.
        scale = 55 / 925;
      }
    } else {
      file = "miao-sword-sw-guard-v1.png";
      index = 0;
      scale = 55 / frames[file][0][3];
      if (pose.phase === 2) {
        file = "miao-sword-v2.png";
        scale = 55 / 272;
      }
    }
    const frame = [...frames[file][index]];
    // Keep source standing toes at 0/-5px relative to the original grid point.
    frame[5] += [-3, 2, -3, 2][pose.direction] / scale;
    return { file, frame, scale };
  }
  if (pose.actor === 99) {
    const file = "snow-beast-v1.png",
      scale = 58 / frames[file][pose.direction * 4][3];
    const frame = [...frames[file][pose.direction * 4 + pose.phase]];
    // Source ape toes lie 2/3px below the grid anchor, unlike human stances.
    frame[5] -= [6, 5, 6, 5][pose.direction] / scale;
    return { file, frame, scale };
  }
  if (pose.actor === 5) {
    const file = "sanfeng-taiji-v2.png";
    return {
      file,
      frame: frames[file][pose.direction * 4 + pose.phase],
      scale: 56 / frames[file][pose.direction * 4][3],
    };
  }
  if (pose.actor === 37) {
    if (pose.walk) return diWalk[pose.direction][pose.phase];
    if (pose.direction === 3 && pose.phase === 1) {
      const file = "di-saber-sw-prep-v2.png";
      return { file, frame: frames[file][0], scale: 52 / 741 };
    }
    let file = [
      "di-saber-ne-v2.png",
      "di-saber-se-v2.png",
      "di-saber-nw-v4.png",
      "di-saber-sw-v2.png",
    ][pose.direction];
    let index = [
      [0, 1, 2, 3],
      [3, 1, 2, 3],
      [0, 1, 2, 3],
      [0, 0, 2, 3],
    ][pose.direction][pose.phase];
    // Exclude the hidden/impossible SE grip. SW has its own correctly facing
    // preparatory pose with a closed fingerless palm bandage.
    // NW v4 keeps the striking arm on the far right shoulder, without mirroring.
    if (pose.direction === 3 && pose.phase === 2) file = "di-saber-sw-v1.png";
    return { file, frame: frames[file][index], scale: 52 / [407, 426, 385, 403][pose.direction] };
  }
  if (pose.actor === 9) {
    if (pose.walk && pose.phase === 2) {
      const file = "wuji-step-opposite-v1.png";
      return { file, frame: frames[file][0], scale: 52 / 801 };
    }
    if (pose.stance || pose.walk) {
      const front = pose.direction === 1 || pose.direction === 3;
      const file = front ? "wuji-step-front-v1.png" : "wuji-step-back-v1.png";
      const start = front ? (pose.direction === 1 ? 0 : 5) : pose.direction === 0 ? 0 : 3;
      const index = pose.walk ? (pose.phase === 0 ? 1 : 4) : start;
      return { file, frame: frames[file][index], scale: 52 / frames[file][start][3] };
    }
    const file = "wuji-punch-v1.png";
    return {
      file,
      frame: frames[file][pose.direction * 4 + pose.phase],
      scale: 52 / frames[file][pose.direction * 4][3],
    };
  }
  if (pose.actor === 29) {
    const file =
      pose.direction < 2
        ? ["tian-saber-back-v1.png", "tian-saber-front-v1.png"][pose.direction]
        : "tian-saber-left-v2.png";
    const index = (pose.direction === 2 ? 4 : 0) + pose.phase;
    return { file, frame: frames[file][index], scale: 52 / [387, 378, 337, 353][pose.direction] };
  }
  if (pose.actor === 36) {
    if (pose.direction === 2) {
      const file = "lin-sword-nw-v2.png";
      return { file, frame: frames[file][pose.phase], scale: 52 / 525 };
    }
    // Exclude wrong-hand and torso-turn draft cells, without reflecting art.
    // NE/SW reuse guards; NW is a deliberately small shoulder/wrist action.
    const file = "lin-sword-v2.png";
    const index = [[0, 0, 2, 3], [4, 5, 6, 4], [], [15, 15, 14, 15]][pose.direction][pose.phase];
    return { file, frame: frames[file][index], scale: 52 / 283 };
  }
  if (pose.actor === 2) {
    if (pose.walk) {
      const front = pose.direction === 1 || pose.direction === 3;
      if (front && pose.phase === 3) {
        const file = "cheng-step-opposite-v4.png",
          frame = frames[file][(pose.direction - 1) / 2];
        return { file, frame, scale: 48 / frame[3] };
      }
      const file = front ? "cheng-step-front-v3.png" : "cheng-step-back-v3.png";
      const row = front ? (pose.direction - 1) / 2 : pose.direction / 2;
      return {
        file,
        frame: frames[file][row * 5 + [1, 2, 3, 4][pose.phase]],
        scale: 48 / frames[file][row * 5][3],
      };
    }
    const file = pose.care ? "cheng-care-v4.png" : "cheng-palm-v3.png";
    return {
      file,
      frame: frames[file][pose.direction * 4 + pose.phase],
      scale: 48 / frames[file][pose.direction * 4][3],
    };
  }
  if (pose.actor === 4) {
    if (!pose.npc) {
      const file = [
        "yanji-dao-back-v1.png",
        "yanji-dao-se-v1.png",
        "yanji-dao-nw-v1.png",
        "yanji-dao-sw-v1.png",
      ][pose.direction];
      return {
        file,
        frame: frames[file][pose.phase],
        scale: 52 / [313, 556, 502, 432][pose.direction],
      };
    }
    const file = "yanji-standing-v1.png";
    // The generated front-view columns are SW then SE, unlike the prompt.
    return { file, frame: frames[file][[0, 3, 2, 1][pose.direction]], scale: 52 / 655 };
  }
  if (pose.actor === 53) {
    if (pose.walk) {
      const file = "duanyu-step-v2.png";
      return { file, frame: frames[file][pose.direction * 4 + pose.phase], scale: 52 / 270 };
    }
    const cross = pose.direction === 1 || pose.direction === 2;
    const file = cross ? "duanyu-cross-v1.png" : "duanyu-finger-v1.png";
    const row = cross ? pose.direction - 1 : pose.direction;
    // NW draft preparation crosses the wrong shoulder: omit it. Recoil uses
    // the verified ready/preparation pose; no mirroring or wrong-hand frame.
    const phase =
      pose.direction === 2 && pose.phase === 1
        ? 0
        : pose.phase === 3
          ? pose.direction === 2
            ? 0
            : 1
          : pose.phase;
    return { file, frame: frames[file][row * 4 + phase], scale: 52 / (cross ? 412 : 272) };
  }
  if (pose.actor === 1 && pose.walk) {
    const file = "hufei-step-v1.png";
    return { file, frame: frames[file][pose.direction * 4 + pose.phase], scale: 52 / 260 };
  }
  if (pose.actor === 1) {
    const right = pose.direction < 2;
    const file = right ? "hufei-saber-right-v1.png" : "hufei-saber-left-v2.png";
    return {
      file,
      frame: frames[file][(pose.direction % 2) * 4 + pose.phase],
      scale: 52 / (right ? 238 : 363),
    };
  }
  if (pose.walk) {
    return heroWalk.battle[pose.direction][pose.phase];
  }
  const file = "xiaoxiami-punch-v2.png";
  return { file, frame: frames[file][pose.direction * 6 + pose.phase], scale: 52 / 220 };
}
export function battleSpriteSize(pack, id, visual, movement, equipment) {
  if (!hasCharacterAtlas() && !sheets.size && (!heroWalk || pack !== 'wmap' || id < 2553 || id > 2556)) return null;
  const pose = battleFrame(pack, id, visual, movement,equipment) || fallbackBattlePose(pack,id,visual,movement);
  if (!pose) return null;
  const {
    file,
    canvas,
    frame: [, , w, h, ax, ay],
    scale: s,
  } = registeredFrame(pose);
  if (!canvas && !sheets.has(file)) return null;
  return [Math.ceil(w * s), Math.ceil(h * s), Math.round(ax * s), Math.round(ay * s + 3)];
}
export function drawBattleActor(ctx, pack, id, x, y, visual, movement, equipment) {
  if (!hasCharacterAtlas() && !sheets.size && (!heroWalk || pack !== 'wmap' || id < 2553 || id > 2556)) return false;
  const pose = battleFrame(pack, id, visual, movement,equipment) || fallbackBattlePose(pack,id,visual,movement);
  if (!pose || !drawRegisteredActor(ctx, pose, x, y)) return false;
  const key = pose.coherent ? `coherent:${pose.actor}:${pose.direction}:${pose.beat}${pose.handFrame!==undefined?":hand:"+pose.handFrame:""}${pose.yangFrame!==undefined?":yang:"+pose.yangFrame:""}${pose.walk?":walk:"+pose.phase:pose.neutral?":idle":pose.heldBrush?":brush":pose.artSet?":sword":""}` : `${pose.walk ? "walk" + (pose.actor === 1 ? "-hufei" : pose.actor === 53 ? "-duanyu" : pose.actor === 2 ? "-cheng" : pose.actor === 9 ? "-wuji" : pose.actor === 35 ? "-linghu" : pose.actor === 50 ? "-qiao" : pose.actor === 93 ? "-beggar" : pose.actor === 37 ? "-di" : pose.actor === 59 ? "-longnu" : pose.actor === 77 ? "-serpent" : "") : pack}:${pose.direction}:${pose.phase}`;
  if (combatPoses.at(-1) !== key) {
    combatPoses.push(key);
    if (combatPoses.length > 24) combatPoses.shift();
  }
  return true;
}
// Source layer 4 = 2 is actual life damage. Never flinch for an empty
// attack square, healing or MP damage. The source still decides death.
export function drawBattleHurt(ctx, pack, id, x, y, lifeHit, effectPhase) {
  if (!hasCharacterAtlas() && !sheets.size) return false;
  if (!lifeHit || effectPhase < 0 || effectPhase > 3 || pack !== "wmap") return false;
  const actor =
    id >= 2693 && id <= 2696
      ? 35
      : id >= 2753 && id <= 2756
        ? 50
        : id >= 2925 && id <= 2928
          ? 93
          : -1;
  if (actor < 0 || !paintedLoadout(actor, battleEquipment.get(actor))) return false;
  const direction = id - (actor === 35 ? 2693 : actor === 50 ? 2753 : 2925);
  if (!drawRegisteredActor(ctx, { actor, direction, phase: 0, hurt: true }, x, y)) return false;
  const key = `hurt-${actor === 35 ? "linghu" : actor === 50 ? "qiao" : "beggar"}:${direction}:0`;
  if (combatPoses.at(-1) !== key) {
    combatPoses.push(key);
    if (combatPoses.length > 24) combatPoses.shift();
  }
  return true;
}
// Three individual physical projectiles share one original attack/effect clock.
// They are drawn once, not once per affected square. The two held wheels are
// already part of Jinlun's body sprites; damage and range remain in source Lua.
export function drawWheelVolley(ctx, visual, effectPic, fromX, fromY, targetX, targetY) {
  const file = "jinlun-flying-wheels-v1.png",
    im = sheets.get(file)||characterRaster('raw:'+file+':0')?.canvas;
  if (!isFiveWheelVisual(visual) || !im) return null;
  const frame = effectPic - visual.first - 1;
  if (frame < 0 || frame >= visual.count) return null;
  const t = frame / Math.max(1, visual.count - 1);
  const dx = targetX - fromX,
    dy = targetY - fromY,
    length = Math.hypot(dx, dy) || 1;
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const u = Math.max(0, Math.min(1, (t - i * 0.025) / (1 - i * 0.025)));
    const reach = Math.sin(Math.PI * u),
      bend = (i - 1) * 16 * reach;
    const x = fromX + dx * reach - (dy / length) * bend;
    const y = fromY + dy * reach + (dx / length) * bend - 31 - (9 + i * 3) * reach;
    const raster=characterRaster('raw:'+file+':'+i),size = [14, 15, 16][i],
      [sx, sy, w, h] = raster?.frame || frames[file][i];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * Math.PI * (3.4 + i * 0.3) + i * 0.8);
    ctx.scale(1, 0.55 + 0.35 * Math.abs(Math.cos(t * Math.PI * 2 + i)));
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(raster?.canvas||im, sx, sy, w, h, -size / 2, (-size * h) / w / 2, size, (size * h) / w);
    ctx.restore();
    rings.push({ material: ["silver", "copper", "lead"][i], x, y, size });
  }
  return { frame, rings };
}
// Bind this standing appearance to the actual Hu Fei event, not every shared tile.
const beggarEvents = [
  3137,
  3140,
  3133,
  3132,
  3132,
  3139,
  3136,
  3138,
  3140,
  3141,
  3139,
  3141,
  3132,
  3132,
  null,
  3139,
  3136,
  3140,
  3141,
  3137,
];
const beggarPoses = new Map([
  [3132, ["beggar-scene-v1.png", 0, [29, 54, 12, 56]]],
  [3133, ["beggar-scene-v1.png", 1, [29, 54, 16, 56]]],
  [3136, ["beggar-scene-v1.png", 2, [47, 40, 30, 39]]],
  [3137, ["beggar-scene-v1.png", 3, [47, 40, 16, 39]]],
  [3138, ["beggar-squat-se-v3.png", 0, [34, 40, 17, 38]]],
  [3139, ["beggar-squat-sw-v2.png", 0, [34, 40, 16, 38]]],
  // The native sheet's two rear views came in NW/NE order.
  [3140, ["beggar-scene-v1.png", 7, [39, 33, 17, 34]]],
  [3141, ["beggar-scene-v1.png", 6, [39, 33, 21, 34]]],
]);
export function hasHuangQinArt() {
  const file = "huangzhonggong-mei-manor-qin-scene-v3-transparent.png";
  return !!(characterRaster("raw:" + file + ":0")?.canvas || sheets.get(file));
}
export function drawSceneActor(ctx, sid, event, id, x, y, linked) {
  // Only the new inn event uses this seated elder; other original elders retain their art.
  if ([1, 3, 40].includes(sid) && event === 198 && linked?.head === 12000 && wangjiSprite) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    // Seated silhouette stays anchored at the feet; a slow tipsy sway, no marker revealing his identity.
    const sway=matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.sin(performance.now()/950)*.65;
    ctx.translate(Math.round(x),Math.round(y));ctx.rotate(sway*.012);
    ctx.fillStyle='#24232955';ctx.beginPath();ctx.ellipse(0,1,20,6,0,0,Math.PI*2);ctx.fill();
    ctx.drawImage(wangjiSprite,62,14,1120,1234,-28,-58,56,61);
    ctx.rotate(-sway*.012);
    ctx.fillStyle='#253038e8';ctx.fillRect(-24,-76,48,15);
    ctx.strokeStyle='#d8c798';ctx.lineWidth=.6;ctx.strokeRect(-24,-76,48,15);
    ctx.font='11px "Songti SC",serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#fff0c8';ctx.fillText(linked?.name==='忘机散人'?'忘机散人':'醉老头',0,-68);

    ctx.restore();
    return true;
  }
  // Home tutorial: a small writing stand occupies the original interaction cell.
  // Match the room's pixel-scale furniture; never draw the old mascot underneath.
  if (sid === 70 && event === 1) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    ctx.fillStyle = '#30271d44'; ctx.beginPath(); ctx.ellipse(0,1,16,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#49372a'; ctx.fillRect(-10,-9,3,10); ctx.fillRect(8,-9,3,10);
    ctx.fillStyle = '#806246'; ctx.beginPath(); ctx.moveTo(-16,-15); ctx.lineTo(3,-21); ctx.lineTo(17,-15); ctx.lineTo(-2,-9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#49372a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#dfcba0'; ctx.beginPath(); ctx.moveTo(-10,-15); ctx.lineTo(2,-19); ctx.lineTo(11,-15); ctx.lineTo(-1,-11); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#74624c';
    for (let i=0;i<3;i++) { ctx.beginPath();ctx.moveTo(-6+i*3,-15-i);ctx.lineTo(-1+i*3,-13-i);ctx.stroke(); }
    ctx.fillStyle='#8b5140';ctx.fillRect(3,-14,2,1);ctx.restore();return true;
  }
  if([9,59].includes(linked?.head)) {
    const direction=id>=2553+linked.head*4&&id<2557+linked.head*4?(id-2553)%4:1;
    const pose={actor:linked.head,direction,beat:0,neutral:true,coherent:true};
    if(combatRaster(pose))return drawRegisteredActor(ctx,pose,x,y);
  }
  if (!hasCharacterAtlas() && !sheets.size) return false;
  if (sid === 12 && event === 0 && id === 2670)
    return drawSourceNpc(ctx, "yang-xiao-fixes-v2.png", 3, [22, 57, 11, 59], x, y);
  if (sid === 46) {
    // The remade pulling vignette already includes the stone at its source anchor.
    if (event === 0 && (id === 2367 || id === 2368)) {
      if (linked?.sourcePull) return sheets.has("gold-pull-v1.png");
      return drawGoldSnakeProp(ctx, id === 2367 ? 0 : 1, x, y);
    }
    if ((event === 1 || event === 2) && (id === 1303 || id === 1304))
      return drawGoldSnakeProp(ctx, id === 1303 ? 3 : 4, x, y);
  }
  if (sid === 51 && beggarEvents[event] === id && beggarPoses.has(id))
    return drawSourceNpc(ctx, ...beggarPoses.get(id), x, y);
  if (sid === 51 && event === 14 && id === 3146)
    return drawSourceNpc(ctx, "qiao-palm-draft-v1.png", 4, [23, 56, 12, 58], x, y);
  // Yuan Chengzhi's island scene keeps its original facing and empty hands.
  // Only the SE cell is adopted here; other sheet views are preparation art.
  if (sid === 78 && event === 0 && id === 3409)
    return drawSourceNpc(ctx, "yuan-npc-v1.png", 1, [21, 56, 10, 58], x, y);
  // Xia Ke Xing envoys: source 2570..72 is the thin Li Si; 2573..75 is Zhang San.
  // Travel robes belong to Lingxiao; yellow/qing robes belong to the island welcome.
  // Keep the source event, direction and ground contact, including Zhang stepping aside.
  if (sid === 39 && event === 10 && id === 2572)
    return drawSourceNpc(ctx, "lisi-envoy-v1.png", 2, [21, 58, 10, 61], x, y);
  if (sid === 39 && event === 11 && id === 2575)
    return drawSourceNpc(ctx, "zhangsan-envoy-v2.png", 2, [28, 59, 13, 61], x, y);
  if (
    sid === 74 &&
    ((event === 0 && (id === 2573 || id === 2574)) || (event === 14 && id === 2574))
  )
    return drawSourceNpc(
      ctx,
      "zhangsan-envoy-v2.png",
      id === 2573 ? 3 : 4,
      id === 2573 ? [30, 59, 16, 61] : [30, 59, 13, 61],
      x,
      y,
    );
  if (sid === 74 && event === 1 && id === 2570)
    return drawSourceNpc(ctx, "lisi-envoy-v1.png", 3, [22, 59, 11, 61], x, y);
  if (sid === 74 && event === 15 && id === 2571)
    return drawSourceNpc(ctx, "lisi-envoy-v1.png", 4, [22, 59, 10, 61], x, y);
  if (sid === 40 && event === 3 && id >= 2861 && id <= 2874) {
    const n = id - 2861;
    const phase = n < 5 ? 0 : n === 5 ? 1 : n < 10 ? 2 : n < 12 ? 3 : 0;
    return drawSourceNpc(
      ctx,
      linked?.linghuJade ? "linghu-inn-jade-v2.png" : "linghu-inn-v1.png",
      phase,
      [32, 57, 13, 62],
      x,
      y,
    );
  }
  if (sid === 38 && event === 0) {
    if (id === 2576)
      return drawSourceNpc(ctx, "shi-potian-scene-v1.png", 3, [23, 54, 11, 57], x, y);
    if (id >= 2577 && id <= 2582) {
      const n = id - 2577,
        bounds = [
          [32, 33, 15, 25],
          [30, 34, 13, 26],
          [30, 34, 13, 26],
          [30, 35, 13, 27],
          [31, 33, 14, 25],
          [32, 33, 15, 25],
        ][n];
      return drawSourceNpc(ctx, "shi-potian-scene-v1.png", [0, 1, 1, 2, 2, 0][n], bounds, x, y);
    }
  }
  if (sid === 17 && event === 0 && id === 3405)
    return drawSourceNpc(ctx, "huo-qingtong-npc-v1.png", 0, [21, 52, 11, 54], x, y);
  // Yinggu (person 66): the standing figure of her concept sheet replaces source
  // pic 3079 where events 409/411/432 place her. Seated pose stays unregistered.
  if (((sid === 21 && event === 1) || (sid === 20 && event === 13)) && id === 3079)
    return drawSourceNpc(ctx, "yinggu-concept-standing-seated-v1-transparent.png", 0, [19, 54, 9, 56], x, y);
  // 神龙教原版事件 3 由洪教主（人物 71）对白脚本驱动，底图 6792/2。
  if (sid === 71 && event === 3 && id === 3396)
    return drawSourceNpc(ctx, "hongantong-concept-four-directions-v1-transparent.png", 0, [33, 53, 18, 52], x, y);
  // 铁掌山事件 0 的 6100/2 是尚未出家的裘千仞；慈恩姿态只作后期剧情储备。
  if (sid === 48 && event === 0 && id === 3050)
    return drawSourceNpc(ctx, "qiuqianren-seated-v2-transparent.png", 0, [33, 51, 18, 52], x, y);
  // 侠客岛原事件 2／3：黄袍龙岛主与青袍木岛主，不改共同对白脚本。
  if (sid === 74 && event === 2 && id === 2566)
    return drawSourceNpc(ctx, "long-mu-island-masters-concept-v1-transparent.png", 0, [24, 56, 10, 58], x, y);
  if (sid === 74 && event === 3 && id === 2568)
    return drawSourceNpc(ctx, "long-mu-island-masters-concept-v2-transparent.png", 0, [23, 56, 10, 59], x, y);
  // 凌霄城事件 9 的 5274/2 是白万剑。沿用原站位和对白，不改雪山派其他弟子。
  if (sid === 39 && event === 9 && id === 2637)
    return drawSourceNpc(ctx, "baiwanjian-concept-four-directions-v3-transparent.png", 1, [23, 57, 10, 59], x, y);
  // 万鳄岛事件 0 的 6414/2 是岳老三；保留其原站位和鳄嘴剪剧情。
  if (sid === 77 && event === 0 && id === 3207)
    return drawSourceNpc(ctx, "yue-laosan-scene-v1-transparent.png", 0, [29, 61, 12, 63], x, y);
  // 灵蛇岛事件 0 的 5288/2 是尚以老妇人身份示人的金花婆婆。
  if (sid === 73 && event === 0 && id === 2644)
    return drawSourceNpc(ctx, "jinhua-popo-scene-v2-transparent.png", 0, [24, 51, 12, 53], x, y);
  // 白驼山事件 0 原图 6080/2：欧阳克初见，双腿尚健、执折扇。
  if (sid === 69 && event === 0 && id === 3040)
    return drawSourceNpc(ctx, "ouyangke-scene-v1-transparent.png", 0, [31, 51, 18, 54], x, y);
  // 少林寺事件 12 的 5372/2 为方丈玄慈；只替换尚在主持寺务时期的立姿。
  if (sid === 28 && event === 12 && id === 2686)
    return drawSourceNpc(ctx, "xuanci-scene-v1-transparent.png", 0, [28, 56, 16, 58], x, y);
  // 重阳宫事件 0 的 6116/2 是丘处机；保留原站位和掌门对话。
  if (sid === 19 && event === 0 && id === 3058)
    return drawSourceNpc(ctx, "qiuchuji-scene-v1-transparent.png", 0, [22, 57, 10, 59], x, y);
  // 衡山派事件 10 的 5700/2 为莫大；琴中藏剑，此处只显示持琴站姿。
  if (sid === 58 && event === 10 && id === 2850)
    return drawSourceNpc(ctx, "moda-scene-v1-transparent.png", 0, [33, 53, 18, 52], x, y);
  // 擂鼓山事件 0 的 6340/2 是苏星河与珍珑石棋台；保留合体坐姿。
  if (sid === 53 && event === 0 && id === 3170)
    return drawSourceNpc(ctx, "suxinghe-chess-v1-transparent.png", 0, [33, 50, 18, 54], x, y);
  // 五毒教事件 5 在蓝凤凰登场时设为原图 6804/2；其他女子仍用各自原图。
  if (sid === 37 && event === 5 && id === 3402)
    return drawSourceNpc(ctx, "lanfenghuang-scene-v1-transparent.png", 0, [22, 52, 11, 54], x, y);
  // 崑侖派事件 7 的 5348/2 是何太冲初访站姿；不改弟子和后续战斗贴图。
  if (sid === 68 && event === 7 && id === 2674)
    return drawSourceNpc(ctx, "hetaichong-scene-v1-transparent.png", 0, [25, 55, 10, 57], x, y);
  // 侠客岛石壁事件 8 也是何太冲；沿用同一身份与衣色。
  if (sid === 74 && event === 8 && id === 2677)
    return drawSourceNpc(ctx, "hetaichong-scene-v1-transparent.png", 0, [27, 56, 10, 58], x, y);
  // 平一指居事件 0 原图 5904/2；连人带木椅替换，保留坐姿与对话触发。
  if (sid === 30 && event === 0 && id === 2952)
    return drawSourceNpc(ctx, "pingyizhi-seated-v1-transparent.png", 0, [37, 49, 19, 48], x, y);
  // 薛慕华居事件 0 原图 6416/2；只替换神医本人，旁边药铺事件保留原样。
  if (sid === 54 && event === 0 && id === 3208)
    return drawSourceNpc(ctx, "xuemuhua-scene-v1-transparent.png", 0, [35, 55, 18, 57], x, y);
  // 蝴蝶谷事件 0 的 5286/2 是胡青牛；只换本人站像，不动原事件、医馆和路口。
  if (sid === 44 && event === 0 && id === 2643)
    return drawSourceNpc(ctx, "huqingniu-scene-v2-transparent.png", 0, [23, 51, 11, 55], x, y);
  // 泰山派 D0/D1 是同一坐像与木椅的左右拼片，不是静物加站立人物。
  // 把合体坐像画在 D0；D1 仍保留原交谈脚本与点击位置，只略过旧右半片。
  if (sid === 29 && event === 0 && id === 2854)
    return drawSourceNpc(ctx, "tianmen-seated-chair-v1-transparent.png", 0, [75, 55, 28, 55], x, y);
  if (sid === 29 && event === 1 && id === 2855)
    return !!(characterRaster("raw:tianmen-seated-chair-v1-transparent.png:0")?.canvas || sheets.get("tianmen-seated-chair-v1-transparent.png"));
  // 梅庄事件 3 的 5750..5764/2 是丹青生原站姿动画；同一人物所有帧统一用新像，避免交谈时闪回旧像。
  if (sid === 55 && event === 3 && id >= 2875 && id <= 2882)
    return drawSourceNpc(ctx, "danqingsheng-mei-manor-scene-v1-transparent.png", 0, [28, 55, 11, 57], x, y);
  // 黑白子原站姿只在梅庄 D9 使用，棋枰和人物共用这一张图。
  if (sid === 55 && event === 9 && id === 3031)
    return drawSourceNpc(ctx, "heibaizi-mei-manor-scene-v7-transparent.png", 0, [40, 55, 20, 55], x, y);
  // 秃笔翁初见为站姿；后段人物与左前笔案合画一次，遮掉原 D6 案子。
  if (sid === 55 && event === 8 && id === 3024)
    return drawSourceNpc(ctx, "tubiweng-sourcecorrected-standing-28x55.png", 0, [28, 55, 14, 55], x, y);
  if (sid === 55 && event === 5 && id === 2883)
    return drawSourceNpc(ctx, "tubiweng-sourcecorrected-seated-writing-48x61.png", 0, [48, 61, 24, 61], x, y);
  if (sid === 55 && event === 6 && (id === 2884 || id === 2891))
    return !!(characterRaster("raw:tubiweng-sourcecorrected-seated-writing-48x61.png:0")?.canvas || sheets.get("tubiweng-sourcecorrected-seated-writing-48x61.png"));
  // 崆峒派事件 0 的 5364/2 是唐文亮；初见站位固定，不改六大派后续剧情。
  if (sid === 34 && event === 0 && id === 2682)
    return drawSourceNpc(ctx, "tangwenliang-kongtong-scene-v1-transparent.png", 0, [24, 49, 14, 56], x, y);
  // 光明顶范遥先在 D6，后移至 D90；两槽原图同为 5334/2。其他共用图 2667 的人物不换。
  if (sid === 11 && (event === 6 || event === 90) && id === 2667)
    return drawSourceNpc(ctx, "fanyao-guangming-scene-v2-transparent.png", 0, [25, 57, 10, 59], x, y);
  // 南贤居 D0 原图 5098/2，只替换南贤本人；旁侧 D1 及共用图 2549 均保留。
  if (sid === 64 && event === 0 && id === 2549)
    return drawSourceNpc(ctx, "nanxian-scholar-scene-v2-purple.png", 0, [26, 62, 13, 64], x, y);
  // 北丑居 D1 的三帧为北丑本人；仅替换此事件，不影响共享原图的其他场景。
  if (sid === 6 && event === 1 && (id === 3703 || id === 3718))
    return drawSourceNpc(ctx, "beichou-northern-hermit-scene-v2-transparent.png", 0, [31, 59, 14, 61], x, y);
  // 霹雳堂 D1 是孔八拉本人；左右两格仍由原场景家具绘制。
  if (sid === 76 && event === 1 && id === 3722)
    return drawSourceNpc(ctx, "kongbala-pili-hall-seated-v1-transparent.png", 0, [37, 52, 18, 52], x, y);
  // 灵蛇岛 D1 与获救后的蝴蝶谷 D1 均为王难姑本人，原图 5290/2。
  if ((sid === 73 || sid === 44) && event === 1 && id === 2645)
    return drawSourceNpc(ctx, "wangnangu-butterfly-scene-v2-transparent.png", 0, [23, 51, 12, 54], x, y);
  // 燕子坞 D2 的 6298/2 是王语嫣本人；保留原事件、碰撞和交谈。
  if (sid === 52 && event === 2 && id === 3149)
    return drawSourceNpc(ctx, "wangyuyan-yanzhi-scene-v1-transparent.png", 0, [25, 55, 12, 55], x, y);
  // 燕子坞 D1 原图 6300/2；剧情与战斗共用慕容复的同一衣冠和四向身形。
  if (sid === 52 && event === 1 && id === 3150)
    return drawSourceNpc(ctx, "murongfu-battle-body-four-directions-v1-transparent.png", 0, [45, 60, 22, 57], x, y);
  // 恒山派 D0 原图 5714/2：只替换活着主持恒山的定闲师太。
  if (sid === 31 && event === 0 && id === 2857)
    return drawSourceNpc(ctx, "dingxian-hengshan-scene-v2-transparent.png", 0, [31, 47, 18, 50], x, y);
  // 梅庄大庄主原图是 D12 琴案左段、D13 人琴中段、D14 琴案右段。
  // 新图保持三格的原宽度和人物偏右站位；只画一次，资源未载入时三格都回退原图。
  if (sid === 55 && event === 13 && id >= 2905 && id <= 2917)
    return drawSourceNpc(ctx, "huangzhonggong-mei-manor-qin-scene-v3-transparent.png", 0, [66, 65, 33, 60], x, y);
  if (sid === 55 && ((event === 12 && id >= 2892 && id <= 2904) || (event === 14 && id >= 2918 && id <= 2930)))
    return hasHuangQinArt();
  // The seated monk and chair occupy three original event tiles. Keep each
  // tile's depth position; only replace the complete source composition.
  if (sid === 16 && linked?.jinlun && event >= 2 && event <= 4 && id === 3404 + event)
    return drawFurnitureSprite(ctx, 3407, event - 2, x, y);
  if (sid === 40 && linked?.shiSeated && event >= 7 && event <= 8 && id === 3198 + event)
    return drawFurnitureSprite(ctx, 3205, event - 7, x, y);
  if (sid === 7) {
    if (event === 4 && id === 3097)
      return drawSourceNpc(ctx, "condor-npc-v1.png", 0, [33, 56, 13, 60], x, y);
    if (event === 5 && id === 3112)
      return drawSourceNpc(ctx, "cave-serpent-defeated-v1.png", 0, [49, 29, 28, 22], x, y);
    if (
      linked?.condor >= 3098 &&
      linked.condor <= 3100 &&
      linked.serpent >= 3105 &&
      linked.serpent <= 3111 &&
      ((event === 4 && id >= 3098 && id <= 3100) || (event === 5 && id >= 3105 && id <= 3111))
    ) {
      const cached=characterRaster("raw:condor-serpent-pair-v3.png:"+(linked.condor-3098));
      const im = cached?.canvas || sheets.get("condor-serpent-pair-v3.png");
      if (!im) return false;
      const [sx, sy, w, h] = (cached?.frame || frames["condor-serpent-pair-v3.png"][linked.condor - 3098]),
        scale = 54 / 479 * (cached ? frames["condor-serpent-pair-v3.png"][linked.condor-3098][3]/cached.frame[3] : 1);
      // Original two source tiles stay in their original draw order. Both
      // pieces use event 4's clock, never two differently timed body halves.
      const ox = x - (event === 5 ? 18 : 0),
        oy = y - (event === 5 ? 9 : 0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(event === 4 ? ox - 18 : ox, oy - 46, event === 4 ? 18 : 36, 55);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(
        im,
        sx,
        sy,
        w,
        h,
        ox + 9 - (w * scale) / 2,
        oy + 9 - h * scale,
        w * scale,
        h * scale,
      );
      ctx.restore();
      return true;
    }
  }
  if ((sid === 18 || sid === 80) && event === 1 && id === 3034)
    return drawSourceNpc(ctx, "tomb-couple-npc-v2.png", 0, [20, 53, 9, 55], x, y);
  if (sid === 18 && event === 0 && id === 3094)
    return drawSourceNpc(ctx, "tomb-couple-npc-v2.png", 1, [21, 57, 10, 59], x, y);
  if (sid === 20 && event === 4 && id === 3077)
    return drawSourceNpc(ctx, "zhou-kongming-v2.png", 3, [26, 56, 13, 58], x, y);
  // Yang Guo's original cave event changes from seated/poisoned to standing/cured.
  // Both separately drawn poses keep the right sleeve empty and left hand intact.
  if (sid === 7 && event === 6 && (id === 3095 || id === 3093))
    return drawSourceNpc(
      ctx,
      "yangguo-cave-v1.png",
      id === 3095 ? 0 : 1,
      id === 3095 ? [42, 41, 30, 39] : [21, 57, 11, 59],
      x,
      y,
    );
  if (sid === 5 && event >= 1 && event <= 5) {
    const spec = {
      2629: [4, 49, 58, 25, 56],
      2630: [12, 49, 58, 23, 56],
      2631: [0, 51, 58, 25, 55],
    }[id];
    // The new hunched silhouette is broader; keep original centre and ground contact.
    if (spec) return drawSourceNpc(ctx, "snow-beast-v1.png", spec[0], spec.slice(1), x, y);
  }
  if (sid === 43 && event === 4 && id === 2690)
    return drawSourceNpc(ctx, "sanfeng-taiji-v2.png", 4, [20, 56, 10, 59], x, y);
  if (sid === 8 && event === 8 && id === 3382)
    return drawSourceNpc(ctx, "di-prison-v2.png", 0, [39, 38, 17, 37], x, y);
  if (sid === 4 && event === 1 && id === 2642 && battleEquipment.get(9) === -1)
    return drawSourceNpc(ctx, "wuji-step-front-v1.png", 5, [25, 55, 13, 58], x, y);
  if (sid === 36 && event === 4 && id === 2964)
    // Short adult stature; preserve the original feet at y - 2.
    return drawSourceNpc(ctx, "yu-standing-v1.png", 1, [23, 44, 10, 46], x, y);
  if (sid === 36 && event >= 0 && event <= 3) {
    // Source NPC order is SE, SW, NE, NW, unlike battle order NE, SE, NW, SW.
    // Event 0 changes from 3020 to 3022 after war 49.
    const spec = {
      3019: [1, 24, 52, 10, 54],
      3020: [3, 24, 52, 13, 54],
      3022: [2, 27, 52, 10, 55],
    }[id];
    if (spec) return drawSourceNpc(ctx, "qingcheng-standing-v1.png", spec[0], spec.slice(1), x, y);
  }
  if (sid === 59 && event === 0 && id >= 2956 && id <= 2962)
    return drawSourceNpc(ctx, "tian-portrait-chair-v1.png", 1, [38, 69, 20, 71], x, y);
  if (sid === 56 && event === 1 && id >= 2931 && id <= 2943) {
    // Initial Fuwei courtyard event: retain its original animation clock.
    const n = id - 2931,
      phase = n < 2 ? 0 : n < 7 ? 1 : n < 11 ? 2 : 3;
    return drawRegisteredActor(ctx, { actor: 36, direction: 1, phase }, x, y);
  }
  // These original event sprites include their counter/armchair. Keep them
  // together so recruitment/cure removes or replaces the same original object.
  if (sid === 49 && event === 2 && id === 2605)
    return drawSourceNpc(ctx, "cheng-counter-v3.png", 0, [32, 56, 14, 57], x, y);
  if (sid === 24 && event === 1 && id === 2606)
    return drawSourceNpc(ctx, "miao-standing-sword-v3.png", 0, [29, 56, 14, 57], x, y);
  if (sid === 24 && event === 8 && (id === 2607 || id === 2608))
    return drawSourceNpc(
      ctx,
      "miao-npc-v2.png",
      id - 2606,
      id === 2607 ? [35, 50, 18, 49] : [34, 48, 18, 49],
      x,
      y,
    );
  if (sid === 50 && event === 1 && id === 2584)
    return drawRegisteredActor(ctx, { actor: 4, direction: 3, phase: 0, npc: true }, x, y);
  if(sid===82 && event===1 && id===3039 && characterRaster('concept:26:prison'))
    return drawRegisteredActor(ctx,{actor:26,direction:1,phase:0,concept:true,appearance:'prison'},x,y);
  // Inn patrons are seated compositions split across original event tiles.
  // A dialogue head identifies a speaker, not a whole standing body on each tile.
  // Keep native posture/furniture until a dedicated replacement above handles it.
  if ([1, 3, 40, 60, 61].includes(sid) && (
    (id >= 2545 && id <= 2547) ||
    (id >= 3142 && id <= 3145) || (id >= 3205 && id <= 3206) ||
    (id >= 3275 && id <= 3285) || (id >= 3290 && id <= 3293) ||
    (id >= 3298 && id <= 3299) || (id >= 3302 && id <= 3325)
  )) return false;
  if (sid !== 0 || event !== 0 || id !== 2583 || battleEquipment.get(1) !== -1) {
    const head=linked?.head;
    if(head===111 && id===4128) return drawCharacterStand(ctx,111,1,x,y);
    if(head>0 && id>=2500 && id<4128 && ![105,106].includes(head)) return drawCharacterStand(ctx,head,1,x,y);
    return false;
  }
  return drawRegisteredActor(ctx, { actor: 1, direction: 3, phase: 1, walk: true }, x, y);
}
function drawCharacterStand(ctx,head,direction,x,y){
 // Emei disciples keep their native human sprite; serpent art belongs to head 98.
 if(head===77)return false;
 const actor=head===98?77:head,concept=!!characterRaster('concept:'+head)||head===111;
 if(!concept&&!characterRaster(poseKey({actor,direction,phase:0}))&&![24,41,42,86,104,112].includes(head))return false;
 return drawRegisteredActor(ctx,{actor,direction,phase:0,concept},x,y);
}
function drawSourceNpc(ctx, file, index, [ow, oh, ox, oy], x, y) {
  const raster=characterRaster('raw:'+file+':'+index);
  const im = raster?.canvas || sheets.get(file);
  if (!im) return false;
  const [sx, sy, sw, sh] = raster?.frame || frames[file][index];
  // Preserve full source height for the broad-shouldered Qiao Feng and the
  // giant bird, whose new silhouettes are wider than the old narrow sprites.
  const scale = ["condor-npc-v1.png", "qiao-palm-draft-v1.png", "yinggu-concept-standing-seated-v1-transparent.png", "baiwanjian-concept-four-directions-v3-transparent.png", "yue-laosan-scene-v1-transparent.png", "ouyangke-scene-v1-transparent.png", "jinhua-popo-scene-v2-transparent.png", "suxinghe-chess-v1-transparent.png", "xuemuhua-scene-v1-transparent.png", "xuanci-scene-v1-transparent.png", "qiuchuji-scene-v1-transparent.png", "huqingniu-scene-v2-transparent.png", "tianmen-scene-v2-transparent.png", "tianmen-seated-chair-v1-transparent.png", "danqingsheng-mei-manor-scene-v1-transparent.png", "tangwenliang-kongtong-scene-v1-transparent.png", "fanyao-guangming-scene-v2-transparent.png", "nanxian-scholar-scene-v2-purple.png", "beichou-northern-hermit-scene-v2-transparent.png", "kongbala-pili-hall-seated-v1-transparent.png", "wangnangu-butterfly-scene-v2-transparent.png", "dingxian-hengshan-scene-v2-transparent.png", "huangzhonggong-mei-manor-qin-scene-v3-transparent.png"].includes(file)
      ? oh / sh
      : Math.min(ow / sw, oh / sh),
    w = sw * scale,
    h = sh * scale;
  const smoothing = ctx.imageSmoothingEnabled;
  // clarity 394 (display only): painted sheets drawn below .9 are smoothed, and below .5 they
  // come from one cached 2× copy; native 1:1 pixel sprites (scale ≥ .9) stay nearest.
  if (nativeAlphaSheets.has(file) || scale < .9) ctx.imageSmoothingEnabled = true;
  const reduced = reducedSource(im, sx, sy, sw, sh, scale);
  if (reduced) ctx.drawImage(reduced, 0, 0, reduced.width, reduced.height, x - ox + (ow - w) / 2, y - oy + oh - h, w, h);
  else ctx.drawImage(im, sx, sy, sw, sh, x - ox + (ow - w) / 2, y - oy + oh - h, w, h);
  ctx.imageSmoothingEnabled = smoothing;
  return true;
}
function drawGoldSnakeProp(ctx, index, x, y) {
  const file = "gold-snake-props-v3.png",
    im = sheets.get(file);
  if (!im) return false;
  const [sx, sy, w, h] = frames[file][index],
    stone = index < 2,
    // One scale per object keeps its base stable when the sword/lid changes.
    scale = stone ? 37 / 317 : 34 / 286,
    center = stone ? 0.5 : index === 3 ? 0 : 1,
    bottom = stone ? -3 : -1;
  ctx.drawImage(
    im,
    sx,
    sy,
    w,
    h,
    x + center - (w * scale) / 2,
    y + bottom - h * scale,
    w * scale,
    h * scale,
  );
  return true;
}
const heavyFootFrames=new Map(),walkFootFrames=new Map(),hufeiFootFrames=new Map();
// Lowest opaque row of an already baked cell: the shoe line the player sees.
// `left`/`right` describe only the bottom tenth, so they name the planted shoe,
// not the figure's own centre. `top` is the crown, weapon included.
function soleBounds(raster) {
  const [sx,sy,w,h]=raster.frame,c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(raster.canvas,sx,sy,w,h,0,0,w,h);
  const data=g.getImageData(0,0,w,h).data;
  const ink=new Array(h).fill(0);let total=0;
  for(let y=0;y<h;y++){let n=0;for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>96)n++;ink[y]=n;total+=n;}
  let bottom=h-1;while(bottom>0&&!ink[bottom])bottom--;
  let top=0;while(top<bottom&&!ink[top])top++;
  // 156B, reviews/actor156-patch-suggestions.md P2: yang-heavy-main-v1.png#6
  // carries a 10x1 near-black speck eight source rows under the real shoe, so
  // grounding on the lowest row alone shoved that whole frame 1.5px down into
  // the tile. A real shoe is joined to the legs above it; drop a tail that is
  // fenced off by blank rows and holds almost none of the ink. Swept over all
  // 1390 baked pose cells this fires on that one frame and nowhere else, which
  // is why it is a binding workaround and NOT a reason to skip cleaning the PNG.
  for(let guard=0;guard<4;guard++){
    let block=bottom;while(block>0&&ink[block-1])block--;
    if(!block)break;
    let above=block-1;while(above>0&&!ink[above])above--;
    if(!ink[above])break;
    let mass=0;for(let y=block;y<=bottom;y++)mass+=ink[y];
    if(mass>total*.01)break;
    bottom=above;
  }
  let left=w,right=0;
  for(let y=Math.max(0,bottom-Math.ceil(h*.1));y<=bottom;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>96){left=Math.min(left,x);right=Math.max(right,x);}
  return {bottom,left,right,top};
}
function groundedHeavyFrame(pose,raster) {
  const key=poseKey(pose);if(heavyFootFrames.has(key))return heavyFootFrames.get(key);
  const [sx,sy,w,h]=raster.frame,{bottom,left,right}=soleBounds(raster);
  // Both ready and attack now share the visible shoe baseline. No inherited
  // per-sheet toe-offset guesses and no horizontal reflection of Yang Guo.
  const result={...raster,frame:[sx,sy,w,h,(left+right)/2,bottom+1]};heavyFootFrames.set(key,result);return result;
}
// 156A: a layered walk animates the legs but keeps the neutral drawing's anchor,
// so the planted foot drifts. Measured on the baked cells, Shi Potian's foot
// lands anywhere from 0 to -5.5px against the tile centre while his own stance
// and both fist sets sit at -3, which reads as sinking through the grid ring.
// Re-anchor on the shoe line only: the horizontal anchor stays exactly as drawn,
// because a mid-stride bottom band holds one shoe and would drag him sideways.
function groundedWalkFrame(pose,raster) {
  const key=poseKey(pose);if(walkFootFrames.has(key))return walkFootFrames.get(key);
  const [sx,sy,w,h,ax]=raster.frame,{bottom}=soleBounds(raster);
  const result={...raster,frame:[sx,sy,w,h,ax,bottom+1]};walkFootFrames.set(key,result);return result;
}
// 156B, size BINDING correction for Hu Fei's walk — not a re-bake, and no new art.
// hufei-step-v1.png's sixteen cells are 252 to 270 source rows tall, but every one
// of them was bound at 52/260, so the baked cells stand 50.5 to 54.0 screen px and
// he loses 3.5px (7%) of himself on a turn. Rebind each cell to the 52px that the
// expression already declares, measured on its own ink, and re-anchor on its own
// shoe line. Measured head-to-shoe with the blade excluded, the four facings then
// land within 50.5~51.0 instead of 49.5~53.0. The source PNG is untouched; a real
// re-bake of character-atlas.json would let this helper go away.
function hufeiWalkFrame(pose,raster) {
  const key=poseKey(pose);if(hufeiFootFrames.has(key))return hufeiFootFrames.get(key);
  const [sx,sy,w,h,ax]=raster.frame,{bottom,top}=soleBounds(raster);
  const figure=bottom+1-top;
  const result=figure>0?{...raster,frame:[sx,sy,w,h,ax,bottom+1],scale:52/figure}:raster;
  hufeiFootFrames.set(key,result);return result;
}
function drawRegisteredActor(ctx, pose, x, y) {
  const {
    file,
    canvas,
    frame: [sx, sy, w, h, ax, ay],
    scale,
  } = registeredFrame(pose);
  const im = canvas || sheets.get(file);
  if (!im) return false;
  ctx.fillStyle = "#142c2359";
  ctx.beginPath();
  const toeOffset =
    pose.actor === 77
      ? 6
      : pose.actor === 58
        ? 0
        : pose.actor === 3 && (pose.direction === 1 || pose.direction === 3)
          ? -5
          : 0;
  ctx.ellipse(x, y - 2 + toeOffset, pose.actor === 77 ? 19 : 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Register at the planted feet, not the bounding-box centre of the extended fist.
  const smoothing = ctx.imageSmoothingEnabled;
  // clarity 394 (display only): painted rasters drawn below .9 (atlas and combat art hold 2 px
  // per logical px) are smoothed instead of nearest-sampled at the canvas's 0.6–1.25 ratio;
  // full sheets below .5 use one cached 2× copy. Native 1:1 rasters (scale ≥ .9) stay nearest.
  if (scale < .9 || [64, 59, 58, 77].includes(pose.actor)) ctx.imageSmoothingEnabled = true;
  const reduced = reducedSource(im, sx, sy, w, h, scale);
  const axis=[[1,-.5],[1,.5],[-1,-.5],[-1,.5]][pose.direction];
  if(pose.coherent&&pose.actor===0)paintHeroWeapon(ctx,pose,x-ax*scale,y-3-ay*scale,scale,true);
  ctx.drawImage(reduced || im, reduced ? 0 : sx, reduced ? 0 : sy, reduced ? reduced.width : w, reduced ? reduced.height : h, x - ax * scale+(pose.action||0)*axis[0], y - 3 - ay * scale+(pose.action||0)*axis[1], w * scale, h * scale);
  if(pose.coherent&&pose.actor===0){
    paintHeroWeapon(ctx,pose,x-ax*scale,y-3-ay*scale,scale,false);
    const grip=heroWeaponPlacement(pose);
    // Restore the body's own knuckles over the separate handle, not a blank gap.
    if(grip&&!grip.behind){const hx=grip.x-4,hy=grip.y-4;ctx.drawImage(im,sx+hx,sy+hy,8,8,x+(hx-ax)*scale,y-3+(hy-ay)*scale,8*scale,8*scale);}
  }
  if(pose.coherent&&pose.actor===31&&pose.heldWeapon>=0){
    const grip=pose.beat>0
      ? [[26,-45,-.72],[26,-46,-.76],[-24,-50,-2.39],[-31,-44,-2.39]][pose.direction]
      : [[7,-30,1.25],[7,-29,1.18],[-13,-40,-2.65],[-7,-29,1.89]][pose.direction];
    const advance=(pose.action||0)*axis[0],rise=(pose.action||0)*axis[1];
    drawWeaponModel(ctx,pose.heldWeapon,x+grip[0]+advance,y+grip[1]+rise,grip[2],.67,{gripGap:true});
  }
  if(pose.coherent&&pose.actor===32&&pose.tubiBrush){
    const grip=pose.beat>0
      ? [[18,-39,-.68],[17,-38,-.72],[-18,-39,-2.48],[-20,-40,-2.50]][pose.direction]
      : [[9,-29,1.18],[8,-29,1.2],[-10,-30,-2.63],[-12,-30,-2.55]][pose.direction];
    const advance=(pose.action||0)*axis[0],rise=(pose.action||0)*axis[1];
    drawWeaponModel(ctx,199,x+grip[0]+advance,y+grip[1]+rise,grip[2],.75,{gripGap:true});
  }
  if(pose.coherent&&pose.actor===33&&pose.goBoard){
    const left=pose.direction>=2,attack=pose.beat>0;
    const side=left?-1:1;
    drawHeiBaiziBoard(ctx,x+side*(attack?27:18)+(pose.action||0)*axis[0],
      y-(attack?35:28)+(pose.action||0)*axis[1],left,attack);
  }
  if(pose.coherent&&pose.actor===51&&pose.heldWeapon>=0){
    // His weapon remains a separate model; the open-hand pose also serves
    // palm skills, which correctly show no blade during the strike.
    const grip=pose.beat>0
      ? [[19,-37,-.40],[15,-39,-.42],[19,-38,-.40],[-16,-37,-2.72]][pose.direction]
      : [[8,-30,1.20],[1,-28,1.18],[6,-30,1.20],[-6,-29,1.94]][pose.direction];
    const advance=(pose.action||0)*axis[0],rise=(pose.action||0)*axis[1];
    const turn=pose.beat>0?[0,-.22,0,.18][pose.beat]*(pose.direction===3?-1:1):0;
    drawWeaponModel(ctx,pose.heldWeapon,x+grip[0]+advance,y+grip[1]+rise,grip[2]+turn,.68,{gripGap:true});
  }
  if(pose.baiBattle){
    // Grip coordinates refer to the 72×55 body cells; the sword is a distinct
    // model resolved from the battle's actual borrowed/equipped item identity.
    const grip=[[[18,14,-1.9],[15,20,-2.72]],[[53,15,-1.23],[60,20,-.49]],
      [[53,14,-1.2],[61,19,-.49]],[[23,15,-1.94],[18,20,-2.67]]][pose.direction][pose.phase===1?1:0];
    drawWeaponModel(ctx,pose.weapon,x-36+grip[0],y-58+grip[1],grip[2],.66);
  }
  if(pose.modaBattle){
    if(pose.phase===1){
      const grip=[[18,-40,-.4],[-7,-33,-2.55],[17,-40,-.4],[-17,-33,-2.55]][pose.direction];
      drawWeaponModel(ctx,'moda-needle',x+grip[0],y+grip[1],grip[2],.72);
    }else{
      const side=[[13,-30],[7,-30],[13,-30],[-7,-30]][pose.direction];
      drawModaHuqin(ctx,x+side[0],y+side[1]);
    }
  }
  ctx.imageSmoothingEnabled = smoothing;
  return true;
}
function drawHeiBaiziBoard(ctx,x,y,left,attack){
  // A separate, reusable board prop: the sprite sheet contains only his body.
  // The readable 3×3 grid represents a full go board at battle scale.
  ctx.save();ctx.translate(x,y);ctx.scale(left?-.55:.55,.55);ctx.rotate(attack?-.3:.18);
  ctx.fillStyle='#3b291f';ctx.fillRect(-12,-15,25,28);
  ctx.fillStyle='#a98658';ctx.fillRect(-10,-13,21,24);
  ctx.strokeStyle='#5f422e';ctx.lineWidth=.65;
  for(const at of [-5,0,5]){
    ctx.beginPath();ctx.moveTo(at,-10);ctx.lineTo(at,8);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-8,at-1);ctx.lineTo(9,at-1);ctx.stroke();
  }
  for(const [px,py,dark] of [[-5,-6,true],[0,-1,false],[5,4,true]]){
    ctx.beginPath();ctx.arc(px,py,1.9,0,Math.PI*2);
    ctx.fillStyle=dark?'#202523':'#eee6d0';ctx.fill();
  }
  ctx.restore();
}
function drawModaHuqin(ctx,x,y){
  ctx.save();ctx.translate(x,y);
  ctx.strokeStyle='#4c3227';ctx.lineWidth=2.1;
  ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(0,18);ctx.stroke();
  ctx.fillStyle='#603d2c';ctx.beginPath();
  for(const [i,[px,py]] of [[-4,15],[2,13],[5,16],[4,21],[-2,23],[-5,20]].entries())
    i?ctx.lineTo(px,py):ctx.moveTo(px,py);
  ctx.closePath();ctx.fill();
  ctx.fillStyle='#b19365';ctx.beginPath();ctx.ellipse(-1,18,3,3.5,-.2,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#a27a4e';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(5,-1);ctx.moveTo(0,4);ctx.lineTo(5,3);ctx.stroke();
  ctx.strokeStyle='#d7c9a2';ctx.lineWidth=.55;
  ctx.beginPath();ctx.moveTo(-1,-4);ctx.lineTo(-1,15);ctx.moveTo(1,-4);ctx.lineTo(1,15);ctx.stroke();
  ctx.strokeStyle='#674935';ctx.lineWidth=1.25;
  ctx.beginPath();ctx.moveTo(-10,7);ctx.lineTo(7,12);ctx.stroke();
  ctx.strokeStyle='#d9c8a1';ctx.lineWidth=.55;
  ctx.beginPath();ctx.moveTo(-10,7.7);ctx.lineTo(6,12.7);ctx.stroke();
  ctx.restore();
}
export function drawProp(ctx, pack, id, x, y) {
  if (!sheets.size) return false;
  const plant = ["smap", "wmap"].includes(pack) && gardenPlants.get(id);
  if (plant) {
    const file = id >= 1394 ? "trees-garden-v1.png" : "groundcover-garden-v1.png";
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const drawn = drawSourceNpc(ctx, file, plant[0], plant.slice(1), x, y);
    ctx.restore();
    return drawn;
  }
  // Interactive furniture lives in the source event layer as well as layer 1.
  // Only complete single-tile objects are eligible here; grouped fragments
  // must still pass planFurniture's whole-footprint check.
  if (pack === "smap" && furnitureShapes.get(id)?.parts.length === 1) {
    if (drawFurnitureSprite(ctx, id, 0, x, y)) return true;
  }
  const south = southTree(pack, id);
  if (south) {
    const im = sheets.get("trees-south-v1.png");
    if (!im) return false;
    const [sx, sy, w, h] = frames["trees-south-v1.png"][id - 1400];
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(im, sx, sy, w, h, x - south[2], y - south[3], south[0], south[1]);
    ctx.restore();
    return true;
  }
  const rock = winterRocks[id];
  if (["smap", "wmap"].includes(pack) && rock) {
    const file = "rocks-winter-v1.png",
      im = sheets.get(file);
    if (!im) return false;
    const [index, width, height, ax, ay] = rock;
    const [sx, sy, w, h] = frames[file][index];
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(im, sx, sy, w, h, x - ax, y - ay, width, height);
    ctx.restore();
    return true;
  }
  if (["smap", "wmap"].includes(pack) && id >= 1787 && id <= 1789) {
    const file = "trees-winter-v1.png",
      im = sheets.get(file);
    if (!im) return false;
    const [sx, sy, w, h, ax, ay] = frames[file][id - 1787];
    const height = [164, 151, 153][id - 1787],
      scale = height / h;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      im,
      sx,
      sy,
      w,
      h,
      x - ax * scale,
      y - [5, 5, 2][id - 1787] - ay * scale,
      w * scale,
      h * scale,
    );
    ctx.restore();
    return true;
  }
  if (pack === "smap" && [1400, 1401].includes(id)) {
    const file = "trees-home-v1.png",
      im = sheets.get(file);
    if (!im) return false;
    const [sx, sy, w, h] = frames[file][id - 1400];
    const height = id === 1400 ? 155 : 124,
      width = (height * w) / h;
    ctx.drawImage(
      im,
      sx,
      sy,
      w,
      h,
      x - width * (id === 1400 ? 0.5 : 0.39),
      y - height - 3,
      width,
      height,
    );
    return true;
  }
  const file = "cabinet-pair-v2.png",
    im = sheets.get(file);
  if (!im || pack !== "smap" || ![1245, 1246].includes(id)) return false;
  const [sx, sy, w, h] = frames[file][id - 1245],
    width = 30,
    height = (h / w) * width;
  ctx.drawImage(im, sx, sy, w, h, x - 11, y - 4 - height, width, height);
  return true;
}
export function propSpriteBounds(pack, id) {
  if (["smap", "wmap"].includes(pack) && id >= 1394 && gardenPlants.has(id))
    return gardenPlants.get(id).slice(1);
  const south = southTree(pack, id);
  if (south) return south;
  if (!["smap", "wmap"].includes(pack) || id < 1787 || id > 1789) return null;
  const [, , w, h, ax, ay] = frames["trees-winter-v1.png"][id - 1787];
  const height = [164, 151, 153][id - 1787],
    scale = height / h;
  return [w * scale, height, ax * scale, ay * scale + [5, 5, 2][id - 1787]];
}

function southTree(pack, id) {
  // Keep the previously selected home green trees in scene maps. The new six
  // trees cover battle maps; scene maps add the four original autumn variants.
  if (id < 1400 || id > 1405 || !(pack === "wmap" || (pack === "smap" && id >= 1402))) return null;
  const [, , w, h, ax, ay] = frames["trees-south-v1.png"][id - 1400];
  const height = [155, 124, 160, 140, 156, 136][id - 1400],
    scale = height / h;
  return [w * scale, height, ax * scale, ay * scale + [2, 3, 2, 3, 3, 3][id - 1400]];
}

// clarity 394, build-time only: the native source cell behind a standing south-east atlas
// pose, so the status-page figure can be baked at higher resolution from the same art.
export function characterFigureSource(head) {
 const r=registeredFrame({actor:head,direction:1,phase:0});
 return r&&{...r,source:r.canvas||sheets.get(r.file)||null};
}
// Build-time-only entry point: renders the same approved poses the game uses.
export function characterBakeEntries() {
 const entries=[];
 const add=(key,r)=>{
  if(!r?.frame)return;const source=r.canvas||sheets.get(r.file);if(!source)return;
  const [sx,sy,w,h,ax,ay]=r.frame,scale=r.scale;
  if(![w,h,scale].every(Number.isFinite)||w<=0||h<=0)return;
  const width=Math.max(1,Math.ceil(w*scale*2)),height=Math.max(1,Math.ceil(h*scale*2));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const g=canvas.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(source,sx,sy,w,h,0,0,width,height);
  entries.push({key,canvas,ax:ax*scale*2,ay:ay*scale*2,scale:.5});
 };
 const actors=[0,1,2,3,4,5,9,11,29,35,36,37,38,50,53,58,59,62,64,77,93,99];
 for(const actor of actors)for(let direction=0;direction<4;direction++)for(const flag of ['', 'walk','hurt','care','taixuan','stance','heroIdle','npc'])for(let phase=0;phase<8;phase++){
  if(flag==='heroIdle'&&actor!==0)continue;
  if(flag==='hurt'&&![35,50,93].includes(actor))continue;
  if(flag==='care'&&actor!==2||flag==='taixuan'&&actor!==38||flag==='stance'&&actor!==9||flag==='npc'&&actor!==4)continue;
  const pose={actor,direction,phase};if(flag)pose[flag]=true;
  try{add(poseKey(pose),registeredFrame(pose));}catch{}
 }
 for(const [file,rows] of Object.entries(frames)) {
  if(!["beggar-scene-v1.png", "beggar-squat-se-v3.png", "beggar-squat-sw-v2.png", "cave-serpent-defeated-v1.png", "cheng-counter-v3.png", "condor-npc-v1.png", "condor-serpent-pair-v3.png", "di-prison-v2.png", "gold-pull-v1.png", "huo-qingtong-npc-v1.png", "jinlun-flying-wheels-v1.png", "yinggu-concept-standing-seated-v1-transparent.png", "linghu-inn-jade-v2.png", "linghu-inn-v1.png", "lisi-envoy-v1.png", "miao-npc-v2.png", "miao-standing-sword-v3.png", "qiao-palm-draft-v1.png", "qingcheng-standing-v1.png", "sanfeng-taiji-v2.png", "shi-potian-scene-v1.png", "snow-beast-v1.png", "tian-portrait-chair-v1.png", "tomb-couple-npc-v2.png", "wuji-step-front-v1.png", "yang-xiao-fixes-v2.png", "yangguo-cave-v1.png", "yu-standing-v1.png", "yuan-npc-v1.png", "zhangsan-envoy-v2.png", "zhou-kongming-v2.png"].includes(file))continue;
  rows.forEach((frame,index)=>add('raw:'+file+':'+index,{file,frame,scale:Math.min(100/frame[2],80/frame[3])}));
 }
 return entries;
}
