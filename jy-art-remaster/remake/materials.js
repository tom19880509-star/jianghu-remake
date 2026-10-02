import innAtlas from './assets/data/material-inn-atlas.json' with {type:'json'};
const innPages=new Map();
// Painted materials registered to the original tile geometry. The source masks
// retain shorelines, windows, doorway openings and every event-controlled tile.
const SCALE = 2;
// CC0 ground by rubberduck, registered to the original home map's grass mask.
// The previous material remains available for the visual comparison page.
const useCommunityGrass = new URLSearchParams(location.search).get("ground-preview") !== "original";
let communityGrass, communityDirt;
let material,
  courtyard,
  house,
  manorTexture,
  timberTexture,
  caveTexture,
  sharedTexture,
  templeTexture,
  vaultTexture,
  forestTexture,
  activeScene;
const manorInterior = new Set([857, 858, 859, 860, 861, 862, 864, 865, 870, 871]);
const manorTimber = new Set([
  852,
  853,
  854,
  855,
  856,
  ...manorInterior,
  902,
  903,
  906,
  913,
  919,
  921,
  1032,
  975,
  977,
  982,
  983,
]);
const manorPlaster = new Set([
  ...manorInterior,
  872,
  873,
  874,
  875,
  877,
  879,
  880,
  881,
  882,
  883,
  884,
  885,
  887,
  889,
  890,
]);
const manorBrick = new Set([2121, 2125, 2126, 2133, 2134]);
const manorPillars = new Set([
  852, 853, 855, 856, 974, 975, 976, 977, 978, 979, 980, 981, 982, 983, 984, 1024, 1025, 1026, 1027,
  2237, 2240,
]);
const manorPaving = new Set([514, 515, 566]);
const mingjiaoEarthEdges = new Set([531, 532, 533, 534, 536, 537, 538, 539, 542]);
const wuduPlaster = new Set(Array.from({ length: 15 }, (_, i) => 1557 + i));
const greyBrickWalls = new Set([
  919, 921, 922, 923, 924, 925, 926, 929, 930, 931, 932, 933, 934, 938, 949, 950, 951, 952, 964,
  965, 966,
]);
const plasterWalls = new Set([
  1816, 1817, 1822, 1823, 1824, 1825, 1827, 1828, 1829, 1830, 1831, 1832, 1833, 1834, 1835, 1836,
  1842, 1844, 1845, 1846, 1847, 1848, 1849,
]);
const picketFence = new Set([1519, 1520, 1521, 1522, 1523, 1524, 1525, 1548, 1549, 1550]);
const villagePaving = new Set([521, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531, 577]);
const brickWalls = new Set([
  808, 809, 810, 811, 812, 813, 814, 815, 817, 818, 819, 820, 829, 833, 834, 835, 893, 894,
]);
const timberFence = new Set([
  1505, 1506, 1507, 1508, 1509, 1510, 1511, 1512, 1513, 1515, 1554, 1555, 1556,
]);
const reverseWalls = new Set([808, 809, 829, 894, 1509, 1510, 1511, 1512, 1515, 1555]);
const cornerBricks = new Set([812, 813, 814, 817, 818, 819, 820]);
const sources = new Map(),
  ground = new Map(),
  walls = new Map();
const mod = (n, size) => ((n % size) + size) % size;
export function clearMaterialCache() {
  ground.clear();
  walls.clear();
  activeScene = undefined;
}
const bamboo = new Set([...Array.from({ length: 20 }, (_, i) => 748 + i), 781, 783, 788, 789]);
export async function loadMaterials({useAtlas=true}={}) {
  innPages.clear();
  if(useAtlas) await Promise.all(innAtlas.pages.map(async file=>{
    try{const image=new Image();image.src='assets/'+file;await image.decode();innPages.set(file,image);}catch{/* A missing prepared page falls back to the existing painter. */}
  }));
  [
    material,
    courtyard,
    house,
    manorTexture,
    timberTexture,
    caveTexture,
    sharedTexture,
    templeTexture,
    vaultTexture,
    forestTexture,
  ] = await Promise.all([
    readMaterial("materials-home-v1.png"),
    readMaterial("materials-courtyard-v1.png"),
    readMaterial("materials-winter-house-v1.png"),
    readMaterial("materials-manor-v1.png"),
    readMaterial("materials-timber-v1.png"),
    readMaterial("materials-cave-v1.png"),
    readMaterial("materials-shared-v1.png"),
    readMaterial("materials-temple-v1.png"),
    readMaterial("materials-vault-v1.png"),
    readMaterial("materials-beggar-forest-v1.png"),
  ]);
  if (useCommunityGrass) communityGrass = await readMaterial("community-grass-rubberduck.png");
  communityDirt = await readMaterial("community-dirt-rubberduck.png");
}
async function readMaterial(file) {
  const im = new Image();
  im.src = "assets/" + file;
  await im.decode();
  const c = document.createElement("canvas");
  c.width = im.width;
  c.height = im.height;
  const g = c.getContext("2d");
  g.drawImage(im, 0, 0);
  return {
    data: g.getImageData(0, 0, c.width, c.height).data,
    width: c.width,
    height: c.height,
    size: Math.floor(c.width / 2),
  };
}
function source(id, atlas, frame) {
  const key = `${atlas.src}:${id}`;
  if (sources.has(key)) return sources.get(key);
  const [, sx, sy, w, h] = frame;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.drawImage(atlas, sx, sy, w, h, 0, 0, w, h);
  const result = g.getImageData(0, 0, w, h).data;
  sources.set(key, result);
  return result;
}
function materialPixel(kind, u, v) {
  const { size, width } = material;
  const x = mod(Math.floor(u), size) + (kind === "stone" || kind === "earth" ? size : 0);
  const y = mod(Math.floor(v), size) + (kind === "bamboo" || kind === "earth" ? size : 0);
  return (y * width + x) * 4;
}
function courtyardPixel(kind, u, v) {
  const { size, width } = courtyard;
  const cx = mod(Math.floor(u), size) + (["brick", "grass"].includes(kind) ? size : 0);
  const cy = mod(Math.floor(v), size) + (["timber", "grass"].includes(kind) ? size : 0);
  return (cy * width + cx) * 4;
}
function communityGroundPixel(texture, u, v) {
  // The source sheet has twenty full 128x64 diamonds in its first 20 cells.
  // Recover the local diamond UV, then sample its native projection.
  const gx = u / (84 * 3),
    gy = v / (84 * 3);
  const a = mod(gx, 1),
    b = mod(gy, 1);
  const variant = mod(Math.floor(gx) * 17 + Math.floor(gy) * 11, 20);
  const x = (variant % 8) * 128 + Math.min(127, Math.floor(64 + (a - b) * 64));
  const y = Math.floor(variant / 8) * 64 + Math.min(63, Math.floor((a + b) * 32));
  const i = (y * texture.width + x) * 4;
  return texture.data[i + 3]
    ? i
    : ((Math.floor(variant / 8) * 64 + 32) * texture.width + (variant % 8) * 128 + 64) * 4;
}
function repaint(id, atlas, frame, x, y, wall, rural, village, manor, forest = false) {
  const [, , , w, h, xo, yo] = frame,
    raw = source(id, atlas, frame);
  const c = document.createElement("canvas");
  c.width = w * SCALE;
  c.height = h * SCALE;
  const g = c.getContext("2d"),
    out = g.createImageData(c.width, c.height);
  const wuduWall = activeScene === 37 && wuduPlaster.has(id);
  const homesteadWall = village && wall && (greyBrickWalls.has(id) || plasterWalls.has(id) || wuduWall);
  const tops = Array.from({ length: w }, (_, xx) => {
    for (let yy = 0; yy < h; yy++) if (raw[(yy * w + xx) * 4 + 3]) return yy;
    return 0;
  });
  const bottoms = manor
    ? Array.from({ length: w }, (_, xx) => {
        for (let yy = h - 1; yy >= 0; yy--) if (raw[(yy * w + xx) * 4 + 3]) return yy;
        return h - 1;
      })
    : null;
  // Match the source face lighting without enlarging its old moss streaks.
  const neutralCounts = new Map();
  if (manor && manorPlaster.has(id))
    for (let i = 0; i < raw.length; i += 4)
      if (raw[i + 3] && raw[i] > 80 && raw[i] === raw[i + 1] && raw[i] === raw[i + 2])
        neutralCounts.set(raw[i], (neutralCounts.get(raw[i]) || 0) + 1);
  const plasterTone = [...neutralCounts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 148;
  const wx = 18 * (x - y) - xo,
    wy = 9 * (x + y) - yo;
  for (let py = 0; py < c.height; py++)
    for (let px = 0; px < c.width; px++) {
      const i = (Math.floor(py / SCALE) * w + Math.floor(px / SCALE)) * 4;
      const o = (py * c.width + px) * 4;
      const r = raw[i],
        green = raw[i + 1],
        b = raw[i + 2],
        a = raw[i + 3];
      if (!a) continue;
      let kind,
        shade = 1,
        u,
        v;
      if (
        wall &&
        manor &&
        (manorPlaster.has(id) || manorBrick.has(id) || manorPillars.has(id) || manorTimber.has(id))
      ) {
        if (manorPlaster.has(id)) {
          // Repaint panel weathering too, while excluding roof and plinth bands.
          if (
            Math.min(r, green, b) > 40 &&
            Math.max(r, green, b) - Math.min(r, green, b) < 95 &&
            !([870, 871].includes(id) && r > 175) &&
            (r + green + b) / 3 > 76 &&
            py / SCALE > tops[Math.floor(px / SCALE)] + (manorInterior.has(id) ? 2 : 12) &&
            py / SCALE < bottoms[Math.floor(px / SCALE)] - (manorInterior.has(id) ? 8 : 4)
          ) {
            kind = "manorPlaster";
            shade = 0.47 + plasterTone / 410;
          }
        } else if (manorBrick.has(id)) {
          if (Math.min(r, green, b) > 35 && Math.max(r, green, b) - Math.min(r, green, b) < 85) {
            kind = "manorBrick";
            shade = 0.52 + (r + green + b) / 950;
          }
        } else if (
          manorPillars.has(id) &&
          ![2237, 2240].includes(id) &&
          r > 55 &&
          r > green * 2.8 &&
          r > b * 2.8
        ) {
          // Red lacquer only: latticework, gold signs and lettering stay intact.
          kind = "manorLacquer";
          shade = 0.32 + r / 240;
        }
        // Only the original brown wood receives fine grain. The source ink,
        // bright lattice accents, door voids and gate gold remain untouched.
        if (
          !kind &&
          manorTimber.has(id) &&
          r > 45 &&
          r < 170 &&
          green > r * 0.3 &&
          green < r * 0.9 &&
          b < green * 0.72
        ) {
          kind = "manorTimber";
          shade = 0.28 + (r + green + b) / 400;
        }
        u = (wx + px / SCALE) * 8;
        // Original lower silhouette supplies the wall plane and corner slopes.
        v = (py / SCALE - bottoms[Math.floor(px / SCALE)]) * 8;
      } else if (wall && rural) {
        const slope = reverseWalls.has(id) ? -0.5 : 0.5;
        if (homesteadWall) {
          // Only broad neutral masonry receives the material. Keep dark window
          // voids, thin lattice bars, colored door leaves and edge ink intact.
          let support = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const xx = Math.floor(px / SCALE) + dx,
                yy = Math.floor(py / SCALE) + dy;
              if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
              const q = (yy * w + xx) * 4,
                lo = Math.min(raw[q], raw[q + 1], raw[q + 2]),
                hi = Math.max(raw[q], raw[q + 1], raw[q + 2]);
              if (raw[q + 3] && lo > 68 && hi - lo < 32) support++;
            }
          if (
            Math.min(r, green, b) > 68 &&
            Math.max(r, green, b) - Math.min(r, green, b) < 32 &&
            support >= 6
          ) {
            kind = plasterWalls.has(id) || wuduWall ? "plaster" : "brick";
            shade = 0.44 + (r + green + b) / 930;
          }
        } else if (timberFence.has(id) || (village && picketFence.has(id))) {
          kind = "timber";
          shade = 0.42 + Math.min(0.72, (r + green + b) / 510);
        } else if (
          r > 65 &&
          green < r * 0.68 &&
          b < green * 0.8 &&
          b < 70 &&
          py / SCALE > 3 &&
          !(id === 835 && py / SCALE < 25)
        ) {
          // Preserve grey plinths, window voids, light wooden lattice and eaves.
          kind = "brick";
          shade = 0.68 + Math.min(0.4, (r + green) / 440);
        }
        u = (wx + px / SCALE) * 8;
        v = homesteadWall
          ? (py / SCALE - tops[Math.floor(px / SCALE)] + y * 3) * 8
          : cornerBricks.has(id)
            ? (wy + py / SCALE - 0.5 * Math.abs(px / SCALE - xo)) * 8
            : (wy + py / SCALE - slope * (wx + px / SCALE)) * 8;
      } else if (wall) {
        // Keep the dark lattice, wall ornaments and open parts of the source art.
        if (r > 75 && r > green * 1.04 && green > b * 1.2) {
          kind = "bamboo";
          shade = 0.58 + Math.min(1, (r + green) / 430) * 0.48;
          u = (px / SCALE + x * 18) * 8;
          const slope = [757, 758, 759, 760, 762, 765, 766, 767, 781, 783, 788].includes(id)
            ? -0.5
            : 0.5;
          v = (py / SCALE - (slope * px) / SCALE) * 6;
        }
      } else {
        if (manor && manorPaving.has(id)) {
          kind = "manorStone";
          shade = 0.45 + (r + green + b) / 1100;
        } else if ((rural && id === 588) || (village && villagePaving.has(id))) {
          kind = "paving";
          shade = village ? 0.38 + (r + green + b) / 1050 : 0.94;
        } else if ([569, 570, 571, 591].includes(id)) {
          kind = "stone";
          // Floor side faces stay dark; top surfaces take the new drawn slabs.
          const top = 1 + Math.abs(px / SCALE - w / 2) * 0.5;
          const bottom = 19 - Math.abs(px / SCALE - w / 2) * 0.5;
          shade = py / SCALE > bottom || py / SCALE < top ? 0.6 : id === 591 ? 1 : 0.88;
        } else if (id <= 104 || (activeScene === 12 && mingjiaoEarthEdges.has(id))) {
          if (green > b * 1.25 && r < green * 1.16) {
            kind = "grass";
            shade = 0.76 + Math.min(0.26, green / 440);
          } else if (r > green * 1.17 && r > b * 1.4) kind = "earth";
        }
        if (kind) {
          const gx = (wx + px / SCALE) / 36 + (wy + py / SCALE) / 18;
          const gy = (wy + py / SCALE) / 18 - (wx + px / SCALE) / 36;
          const density = forest
            ? kind === "grass"
              ? 30
              : 24
            : kind === "paving" || kind === "manorStone"
              ? 55
              : kind === "stone"
                ? 60
                : kind === "grass"
                  ? 84
                  : 42;
          u = gx * density;
          v = gy * density;
        }
      }
      if (kind) {
        if (communityGrass && [70, 12, 37].includes(activeScene) && !wall && kind === "grass") {
          const m = communityGroundPixel(communityGrass, u, v);
          // Wudu's source ground contains the fence and building contact shadows.
          // Carry those dark regions into the new texture so walls stay grounded.
          const shadow = activeScene === 37 ? Math.min(1, Math.max(0.45, green / 80)) : 1;
          for (let ch = 0; ch < 3; ch++)
            out.data[o + ch] = (communityGrass.data[m + ch] * shade * 0.76 + [67, 86, 53][ch] * 0.24) * shadow;
          out.data[o + 3] = a;
          continue;
        }
        if (communityDirt && [12, 37].includes(activeScene) && !wall && kind === "earth") {
          const m = communityGroundPixel(communityDirt, u, v);
          const shadow = activeScene === 37 ? Math.min(1, Math.max(0.48, (r + green + b) / 270)) : 1;
          for (let ch = 0; ch < 3; ch++)
            out.data[o + ch] = (communityDirt.data[m + ch] * 0.82 + [120, 100, 73][ch] * 0.18) * shadow;
          out.data[o + 3] = a;
          continue;
        }
        const ruralMaterial = rural && ["paving", "brick", "timber", "grass"].includes(kind);
        const forestMaterial = forest && ["grass", "earth"].includes(kind);
        const formal = kind.startsWith("manor");
        const texture = forestMaterial
          ? forestTexture
          : kind === "manorTimber"
            ? timberTexture
            : formal
              ? manorTexture
              : kind === "plaster"
                ? house
                : ruralMaterial
                  ? courtyard
                  : material;
        const m = forestMaterial
          ? (mod(Math.floor(v), forestTexture.size) * forestTexture.width +
              mod(Math.floor(u), forestTexture.size) +
              (kind === "earth" ? forestTexture.size : 0)) *
            4
          : kind === "manorTimber"
            ? (mod(Math.floor(v), timberTexture.height) * timberTexture.width +
                mod(Math.floor(u), timberTexture.width)) *
              4
            : formal
              ? ((mod(Math.floor(v), manorTexture.size) +
                  (["manorStone", "manorBrick"].includes(kind) ? manorTexture.size : 0)) *
                  manorTexture.width +
                  mod(Math.floor(u), manorTexture.size) +
                  (["manorLacquer", "manorBrick"].includes(kind) ? manorTexture.size : 0)) *
                4
              : kind === "plaster"
                ? (mod(Math.floor(v), house.size) * house.width +
                    house.size +
                    mod(Math.floor(u), house.size)) *
                  4
                : ruralMaterial
                  ? courtyardPixel(kind, u, v)
                  : materialPixel(kind, u, v);
        for (let ch = 0; ch < 3; ch++) {
          let value = texture.data[m + ch] * shade;
          // Keep warm masonry and face lighting from the source architecture.
          if (kind === "manorBrick") value = raw[i + ch] * 0.62 + value * 0.38;
          if (village && (kind === "paving" || (kind === "brick" && greyBrickWalls.has(id)))) {
            const grey =
              (texture.data[m] * 0.28 + texture.data[m + 1] * 0.52 + texture.data[m + 2] * 0.2) *
              shade;
            value = grey * 0.4 + ((r + green + b) / 3) * 0.6 + [4, 5, 6][ch];
          }
          out.data[o + ch] = kind === "grass" ? value * 0.62 + [67, 86, 53][ch] * 0.38 : value;
        }
      } else {
        out.data[o] = r;
        out.data[o + 1] = green;
        out.data[o + 2] = b;
      }
      out.data[o + 3] = a;
    }
  g.putImageData(out, 0, 0);
  return c;
}
// The five grey-rock cave maps share these source tiles. Keep solid black
// occluding tile 1941, props, stairs and event objects outside this recipe.
const greyCaves = new Set([5, 18, 41, 67, 72]);
// These original caves use the ochre rock family 1623..1701. The solid
// black cap 1702, stone furniture, passages and event objects stay separate.
const warmCaves = new Set([7, 10, 42, 46, 74]);
function repaintCave(id, atlas, frame, x, y, wall, warm) {
  const [, , , w, h, ax, ay] = frame,
    raw = source(id, atlas, frame);
  const c = document.createElement("canvas");
  c.width = w * SCALE;
  c.height = h * SCALE;
  const g = c.getContext("2d"),
    out = g.createImageData(c.width, c.height);
  const wx = 18 * (x - y) - ax,
    wy = 9 * (x + y) - ay;
  for (let yy = 0; yy < c.height; yy++)
    for (let xx = 0; xx < c.width; xx++) {
      const p = (Math.floor(yy / SCALE) * w + Math.floor(xx / SCALE)) * 4,
        q = (yy * c.width + xx) * 4;
      const a = raw[p + 3];
      if (!a) continue;
      const lum = (raw[p] + raw[p + 1] + raw[p + 2]) / 3;
      const sx = wx + xx / SCALE,
        sy = wy + yy / SCALE;
      const u = wall ? sx * 5 : (sx / 36 + sy / 18) * 100;
      const v = wall ? sy * 5 : (sy / 18 - sx / 36) * 100;
      const tx =
        mod(Math.floor(u), caveTexture.size) +
        (warm && (wall || (id >= 690 && id <= 693)) ? caveTexture.size : 0);
      const ty = mod(Math.floor(v), caveTexture.size) + (wall ? 0 : caveTexture.size);
      const t = (ty * caveTexture.width + tx) * 4;
      for (let ch = 0; ch < 3; ch++)
        out.data[q + ch] = wall
          ? lum < 18
            ? raw[p + ch]
            : caveTexture.data[t + ch] * (0.3 + lum / 220) * 0.8 + raw[p + ch] * 0.2
          : caveTexture.data[t + ch] * (0.72 + lum / 550);
      out.data[q + 3] = a;
    }
  g.putImageData(out, 0, 0);
  return c;
}
// The vault's source scripts move the iron leaf and rock jamb separately.
// Paint each original fragment in place, keeping the key slot, bars and alpha.
const vaultGateTiles = new Set([2230, 1842, 2030, 1847, 2032]);
const vaultChests = new Set([1749, 1750]);
function repaintVault(id, atlas, frame) {
  const [, , , w, h] = frame,
    raw = source(id, atlas, frame);
  const c = document.createElement("canvas");
  c.width = w * SCALE;
  c.height = h * SCALE;
  const g = c.getContext("2d"),
    out = g.createImageData(c.width, c.height);
  for (let yy = 0; yy < c.height; yy++)
    for (let xx = 0; xx < c.width; xx++) {
      const x = Math.floor(xx / SCALE),
        y = Math.floor(yy / SCALE);
      const p = (y * w + x) * 4,
        q = (yy * c.width + xx) * 4;
      if (!raw[p + 3]) continue;
      const r = raw[p],
        green = raw[p + 1],
        b = raw[p + 2],
        lum = (r + green + b) / 3;
      const chest = vaultChests.has(id);
      const brass = chest && r > 115 && green > r * 0.56 && b < green * 0.65;
      const iron = [1842, 1847, 2030].includes(id) || (id === 2032 && x >= 20);
      const col = brass || iron ? 1 : 0,
        row = chest ? 1 : 0;
      // Stay inside the painted quadrants, excluding the sheet's dividing lines.
      const span = vaultTexture.size - 32;
      const tx = col * vaultTexture.size + 16 + mod(xx * 5, span);
      const ty = row * vaultTexture.size + 16 + mod(yy * 5, span);
      const t = (ty * vaultTexture.width + tx) * 4;
      for (let ch = 0; ch < 3; ch++)
        out.data[q + ch] =
          lum < 35
            ? raw[p + ch]
            : raw[p + ch] * 0.55 + vaultTexture.data[t + ch] * (0.45 + lum / 210) * 0.45;
      out.data[q + 3] = raw[p + 3];
    }
  g.putImageData(out, 0, 0);
  return c;
}
const sharedFloors = new Set([
  514, 515, 516, 517, 565, 566, 567, 568, 569, 570, 571, 577, 578, 579, 580, 581, 582, 583, 584,
  585, 586, 587, 588, 589, 590, 591, 592,
]);
const islandFloors = new Set([531, 539, 623]);
function repaintIslandFloor(id, atlas, frame, x, y) {
  const [, , , w, h, ax, ay] = frame,
    raw = source(id, atlas, frame),
    c = document.createElement("canvas");
  c.width = w * SCALE;
  c.height = h * SCALE;
  const g = c.getContext("2d"),
    out = g.createImageData(c.width, c.height);
  const wx = 18 * (x - y) - ax,
    wy = 9 * (x + y) - ay;
  for (let yy = 0; yy < c.height; yy++)
    for (let xx = 0; xx < c.width; xx++) {
      const p = (Math.floor(yy / SCALE) * w + Math.floor(xx / SCALE)) * 4,
        q = (yy * c.width + xx) * 4,
        lum = (raw[p] + raw[p + 1] + raw[p + 2]) / 3;
      if (!raw[p + 3]) continue;
      const sx = wx + xx / SCALE,
        sy = wy + yy / SCALE;
      const u = (sx / 36 + sy / 18) * 90,
        v = (sy / 18 - sx / 36) * 90;
      // The source keeps plank joints, raised edges and the exact walkable footprint.
      if (lum < 28) {
        for (let ch = 0; ch < 3; ch++) out.data[q + ch] = raw[p + ch];
      } else if (id === 623) {
        const t =
          (mod(Math.floor(v), timberTexture.height) * timberTexture.width +
            mod(Math.floor(u), timberTexture.width)) *
          4;
        const grain =
          (timberTexture.data[t] + timberTexture.data[t + 1] + timberTexture.data[t + 2]) / 3;
        for (let ch = 0; ch < 3; ch++)
          out.data[q + ch] =
            raw[p + ch] * 0.35 +
            [110, 98, 78][ch] * (0.45 + lum / 190) * (0.86 + grain / 600) * 0.65;
      } else {
        const t = materialPixel("earth", u * 0.47, v * 0.47);
        for (let ch = 0; ch < 3; ch++)
          out.data[q + ch] = raw[p + ch] * 0.45 + material.data[t + ch] * (0.65 + lum / 300) * 0.55;
      }
      out.data[q + 3] = raw[p + 3];
    }
  g.putImageData(out, 0, 0);
  return c;
}
const formalWalls = new Set([...manorPlaster, ...manorBrick, ...manorPillars, ...manorTimber]);
const villageWalls = new Set([...greyBrickWalls, ...plasterWalls, ...picketFence]);
// Source cutaway architecture: these are wall-top eaves, not full roof meshes.
// Explicit IDs keep signs, barred doors, props and cave silhouettes out.
const glazedEaves = new Set([
  990, 991, 992, 993, 997, 998, 999, 1001, 1002, 1004, 1005, 1011, 1012, 1013, 1014, 1015, 1016,
  1017, 1018,
]);
const cutawayPlaster = new Set([
  836, 837, 838, 839, 840, 841, 843, 844, 845, 846, 847, 848, 1038, 1071, 1072, 1073, 1074, 1075,
  1076, 1078, 1079, 1080, 1081, 1082, 1083, 1084, 1085, 1086, 1092, 1094, 1095, 1096, 1097, 1098,
  1106, 1107, 1108, 1109, 1110, 1111, 1112,
]);
const eaveWalls = new Set([...glazedEaves, ...cutawayPlaster]);
const stainedPlaster = new Set([836, 837, 838, 839, 840, 841, 843, 844, 845, 846, 847, 848, 1038]);
const sharedWalls = new Set([
  ...formalWalls,
  ...villageWalls,
  ...brickWalls,
  ...timberFence,
  ...bamboo,
  ...eaveWalls,
]);
function repaintEaveWall(id, atlas, frame, x, y) {
  const [, , , w, h, ax, ay] = frame,
    raw = source(id, atlas, frame);
  const c = document.createElement("canvas");
  c.width = w * SCALE;
  c.height = h * SCALE;
  const g = c.getContext("2d"),
    out = g.createImageData(c.width, c.height);
  const tops = [],
    bottoms = [];
  for (let xx = 0; xx < w; xx++) {
    tops[xx] = h;
    bottoms[xx] = -1;
    for (let yy = 0; yy < h; yy++)
      if (raw[(yy * w + xx) * 4 + 3]) {
        tops[xx] = Math.min(tops[xx], yy);
        bottoms[xx] = yy;
      }
  }
  // Use each source column's dominant neutral paint to retain both corner faces,
  // replacing enlarged green streak pixels with finer painted wall weathering.
  const faceTones = stainedPlaster.has(id)
    ? Array.from({ length: w }, (_, xx) => {
        const counts = new Map();
        for (let yy = tops[xx] + 6; yy < bottoms[xx] - 6; yy++) {
          const p = (yy * w + xx) * 4,
            lo = Math.min(raw[p], raw[p + 1], raw[p + 2]),
            hi = Math.max(raw[p], raw[p + 1], raw[p + 2]);
          if (raw[p + 3] && lo > 55 && hi - lo < 25) {
            const tone = Math.round((raw[p] + raw[p + 1] + raw[p + 2]) / 3);
            counts.set(tone, (counts.get(tone) || 0) + 1);
          }
        }
        return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
      })
    : null;
  const roof = glazedEaves.has(id),
    wx = 18 * (x - y) - ax,
    wy = 9 * (x + y) - ay;
  for (let yy = 0; yy < c.height; yy++)
    for (let xx = 0; xx < c.width; xx++) {
      const sx = Math.floor(xx / SCALE),
        sy = Math.floor(yy / SCALE),
        p = (sy * w + sx) * 4,
        q = (yy * c.width + xx) * 4;
      if (!raw[p + 3]) continue;
      const r = raw[p],
        green = raw[p + 1],
        b = raw[p + 2],
        lum = (r + green + b) / 3;
      let kind;
      if (roof && green > r * 1.05 && green > b * 1.08 && green > 24) kind = "glaze";
      else if (
        faceTones?.[sx] &&
        sy > tops[sx] + 6 &&
        sy < bottoms[sx] - 6 &&
        Math.min(r, green, b) > 45 &&
        Math.max(r, green, b) - Math.min(r, green, b) < 95
      )
        kind = "plaster";
      else {
        // Broad surfaces only; thin lattice, window medallions and dark joint ink stay source.
        let support = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = sx + dx,
              ny = sy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const n = (ny * w + nx) * 4,
              lo = Math.min(raw[n], raw[n + 1], raw[n + 2]),
              hi = Math.max(raw[n], raw[n + 1], raw[n + 2]);
            if (
              raw[n + 3] &&
              lo > 45 &&
              hi - lo < 35 &&
              Math.abs((raw[n] + raw[n + 1] + raw[n + 2]) / 3 - lum) < 35
            )
              support++;
          }
        if (
          support >= 6 &&
          Math.min(r, green, b) > 45 &&
          Math.max(r, green, b) - Math.min(r, green, b) < 35
        ) {
          if (roof && sy > tops[sx] + 12) kind = "brick";
          else if (!roof && sy > tops[sx] + 6 && sy < bottoms[sx] - 6) kind = "plaster";
        }
      }
      if (kind) {
        const texture = kind === "plaster" ? manorTexture : sharedTexture;
        const u = mod(Math.floor((wx + xx / SCALE) * 7), texture.size);
        const v = mod(Math.floor((wy + yy / SCALE) * 7), texture.size);
        const t =
          ((v + (kind === "plaster" ? 0 : texture.size)) * texture.width +
            u +
            (kind === "glaze" ? texture.size : 0)) *
          4;
        const grain = (texture.data[t] + texture.data[t + 1] + texture.data[t + 2]) / 3;
        for (let ch = 0; ch < 3; ch++) {
          const sourceColor = kind === "plaster" && faceTones?.[sx] ? faceTones[sx] : raw[p + ch];
          const surfaceLum = kind === "plaster" && faceTones?.[sx] ? faceTones[sx] : lum;
          out.data[q + ch] =
            kind === "glaze"
              ? sourceColor * 0.6 + [0.91, 1.07, 0.75][ch] * lum * (0.72 + grain / 400) * 0.4
              : kind === "brick"
                ? sourceColor * 0.7 + texture.data[t + ch] * (0.3 + lum / 280) * 0.3
                : sourceColor * 0.45 + texture.data[t + ch] * (0.28 + surfaceLum / 280) * 0.55;
        }
      } else for (let ch = 0; ch < 3; ch++) out.data[q + ch] = raw[p + ch];
      out.data[q + 3] = raw[p + 3];
    }
  g.putImageData(out, 0, 0);
  return c;
}
function repaintSharedFloor(id, atlas, frame, x, y) {
  const [, , , w, h, ax, ay] = frame,
    raw = source(id, atlas, frame),
    c = document.createElement("canvas");
  c.width = w * SCALE;
  c.height = h * SCALE;
  const g = c.getContext("2d"),
    out = g.createImageData(c.width, c.height);
  const rug = id >= 579 && id <= 587,
    slate = [565, 566, 567, 568, 591, 592].includes(id);
  const wx = 18 * (x - y) - ax,
    wy = 9 * (x + y) - ay;
  for (let yy = 0; yy < c.height; yy++)
    for (let xx = 0; xx < c.width; xx++) {
      const p = (Math.floor(yy / SCALE) * w + Math.floor(xx / SCALE)) * 4,
        q = (yy * c.width + xx) * 4,
        a = raw[p + 3];
      if (!a) continue;
      const r = raw[p],
        green = raw[p + 1],
        b = raw[p + 2],
        lum = (r + green + b) / 3;
      // Golden borders and the raised edge under each carpet retain their source colors.
      if (rug && !(r > 40 && r > green * 2.8 && r > b * 2.8)) {
        for (let ch = 0; ch < 4; ch++) out.data[q + ch] = raw[p + ch];
        continue;
      }
      const sx = wx + xx / SCALE,
        sy = wy + yy / SCALE;
      const u = (sx / 36 + sy / 18) * 82,
        v = (sy / 18 - sx / 36) * 82;
      const tx = mod(Math.floor(u), sharedTexture.size) + (rug || slate ? 0 : sharedTexture.size);
      const ty = mod(Math.floor(v), sharedTexture.size) + (slate ? sharedTexture.size : 0),
        t = (ty * sharedTexture.width + tx) * 4;
      for (let ch = 0; ch < 3; ch++)
        out.data[q + ch] = rug
          ? sharedTexture.data[t + ch] * (0.33 + r / 255)
          : raw[p + ch] * 0.68 + sharedTexture.data[t + ch] * (0.3 + lum / 280) * 0.32;
      out.data[q + 3] = a;
    }
  g.putImageData(out, 0, 0);
  return c;
}
const templePosts = new Set([
  1024, 1026, 2148, 2149, 2150, 2151, 2152, 2153, 2154, 2155, 2156, 2157, 2158, 2298,
]);
const templeWalls = new Set([
  2116,
  2119,
  2121,
  2122,
  2123,
  2124,
  2125,
  2127,
  2128,
  2129,
  2130,
  2131,
  2132,
  2134,
  ...templePosts,
]);
// Complete the brick family used by the Mingjiao hall, including its door
// jambs and pierced walls. Source openings, plinths and face lighting remain.
const mingjiaoWalls = new Set([
  2116, 2118, 2119, 2121, 2122, 2123, 2124, 2125, 2126, 2127, 2128,
  2129, 2130, 2131, 2132, 2133, 2134, 2136, 2138, 2139, 2141,
]);
const mingjiaoDoors = new Set([2241, 2248, 2249, 2250]);
function repaintMingjiaoWall(id, atlas, frame, x, y) {
  const [, , , w, h, ax, ay] = frame, raw = source(id, atlas, frame);
  const c = document.createElement("canvas");
  c.width = w * SCALE;
  c.height = h * SCALE;
  const g = c.getContext("2d"), out = g.createImageData(c.width, c.height);
  const bottoms = Array.from({length:w}, (_, xx) => {
    for (let yy=h-1; yy>=0; yy--) if(raw[(yy*w+xx)*4+3]) return yy;
    return h-1;
  });
  const wx = 18*(x-y)-ax, wy = 9*(x+y)-ay, door = mingjiaoDoors.has(id);
  for (let yy=0; yy<c.height; yy++) for(let xx=0; xx<c.width; xx++) {
    const p=(Math.floor(yy/SCALE)*w+Math.floor(xx/SCALE))*4, q=(yy*c.width+xx)*4;
    for(let ch=0; ch<4; ch++) out.data[q+ch]=raw[p+ch];
    if(!raw[p+3]) continue;
    const r=raw[p], green=raw[p+1], b=raw[p+2], lum=(r+green+b)/3;
    const lacquer = door && r>40 && r>green*2.8 && r>b*2.8;
    const brick = !door && Math.min(r,green,b)>35 && Math.max(r,green,b)-Math.min(r,green,b)<85;
    const timber = !door && !brick && r>45 && r<170 && green>r*0.3 && green<r*0.9 && b<green*0.72;
    if(!lacquer && !brick && !timber) continue;
    const texture=timber ? timberTexture : manorTexture;
    const u=(wx+xx/SCALE)*8, v=(yy/SCALE-bottoms[Math.floor(xx/SCALE)])*8;
    const tx=mod(Math.floor(u),timber?texture.width:texture.size)+(timber?0:texture.size);
    const ty=mod(Math.floor(timber?(wy+yy/SCALE)*5:v),timber?texture.height:texture.size)+(brick?texture.size:0);
    const t=(ty*texture.width+tx)*4, shade=lacquer?0.32+r/240:timber?0.28+lum/135:0.52+lum/317;
    for(let ch=0;ch<3;ch++)
      out.data[q+ch]=raw[p+ch]*0.38+texture.data[t+ch]*shade*0.62;
  }
  g.putImageData(out,0,0);
  return c;
}
function repaintTemple(id, atlas, frame, x, y, wall) {
  const [, , , w, h, ax, ay] = frame,
    raw = source(id, atlas, frame);
  const c = document.createElement("canvas");
  c.width = w * SCALE;
  c.height = h * SCALE;
  const g = c.getContext("2d"),
    out = g.createImageData(c.width, c.height);
  const bottoms = Array.from({ length: w }, (_, xx) => {
    for (let yy = h - 1; yy >= 0; yy--) if (raw[(yy * w + xx) * 4 + 3]) return yy;
    return h - 1;
  });
  const wx = 18 * (x - y) - ax,
    wy = 9 * (x + y) - ay;
  for (let yy = 0; yy < c.height; yy++)
    for (let xx = 0; xx < c.width; xx++) {
      const p = (Math.floor(yy / SCALE) * w + Math.floor(xx / SCALE)) * 4,
        q = (yy * c.width + xx) * 4;
      const r = raw[p],
        green = raw[p + 1],
        b = raw[p + 2],
        alpha = raw[p + 3],
        lum = (r + green + b) / 3;
      if (!alpha) continue;
      let kind,
        texture = templeTexture,
        u,
        v,
        shade = 0.48 + lum / 260;
      if (wall) {
        // Retain the original holes, joints and cutaway outline, not just alpha.
        if (lum > 24) {
          kind = templePosts.has(id) || (r - green > 22 && green - b > 15) ? "timber" : "brick";
        }
        u = (wx + xx / SCALE) * 6;
        v = (yy / SCALE - bottoms[Math.floor(xx / SCALE)]) * 6;
        if (kind === "timber") {
          u = (wx + xx / SCALE) * 9;
          v = (wy + yy / SCALE) * 5;
        }
      } else {
        if (id >= 695 && id <= 698) kind = "stone";
        else if (green > b * 1.25 && r < green * 1.16) {
          kind = "grass";
          texture = courtyard;
          shade = 0.76 + Math.min(0.26, green / 440);
        } else if (r > green * 1.17 && r > b * 1.4) kind = "earth";
        const density = kind === "stone" ? 62 : kind === "grass" ? 84 : 55;
        u = ((wx + xx / SCALE) / 36 + (wy + yy / SCALE) / 18) * density;
        v = ((wy + yy / SCALE) / 18 - (wx + xx / SCALE) / 36) * density;
      }
      if (kind) {
        const tx =
          mod(Math.floor(u), texture.size) +
          (["timber", "earth", "grass"].includes(kind) ? texture.size : 0);
        const ty =
          mod(Math.floor(v), texture.size) +
          (["stone", "earth", "grass"].includes(kind) ? texture.size : 0);
        const t = (ty * texture.width + tx) * 4;
        for (let ch = 0; ch < 3; ch++) {
          const painted = texture.data[t + ch] * shade;
          out.data[q + ch] =
            kind === "grass"
              ? painted * 0.62 + [67, 86, 53][ch] * 0.38
              : wall
                ? raw[p + ch] * 0.48 + painted * 0.52
                : kind === "stone"
                  ? raw[p + ch] * 0.3 + painted * 0.7
                  : painted;
        }
      } else for (let ch = 0; ch < 3; ch++) out.data[q + ch] = raw[p + ch];
      out.data[q + 3] = alpha;
    }
  g.putImageData(out, 0, 0);
  return c;
}
export function paintMaterial(ctx, scene, id, atlas, frame, px, py, x, y, wall = false) {
  if (
    !material ||
    (![70, 1, 12, 24, 36, 37, 49, 50, 56, 59, 63, 78].includes(scene) &&
      !(scene === 51 && !wall) &&
      !greyCaves.has(scene) &&
      !warmCaves.has(scene) &&
      !(wall ? sharedWalls.has(id) : sharedFloors.has(id))) ||
    !frame ||
    !atlas.naturalWidth
  )
    return false;
  if (activeScene !== scene) {
    ground.clear();
    walls.clear();
    activeScene = scene;
  }
  // Registered prepared pixels retain the source tile, coordinate, alpha and
  // anchor. Edited/unregistered pieces continue through the procedural painter.
  const baked=scene===innAtlas.scene && innAtlas.tiles[`${wall?1:0}:${id}:${x}:${y}`];
  if(baked && baked.source.every((n,i)=>n===frame[i])){
    const page=innPages.get(innAtlas.pages[baked.page]);
    if(page){
      // Keep the original five-argument canvas blit. Direct atlas cropping can
      // choose neighbouring texels differently at fractional phone scales.
      const cache=wall?walls:ground,key=`${atlas.src}:${id}:${x}:${y}`;
      if(!cache.has(key)){
        const [sx,sy,w,h]=baked.rect,c=document.createElement('canvas');c.width=w;c.height=h;
        c.getContext('2d').drawImage(page,sx,sy,w,h,0,0,w,h);cache.set(key,c);
      }
      ctx.drawImage(cache.get(key),px-frame[5],py-frame[6],frame[3],frame[4]);return true;
    }
  }
  const cave =
    (greyCaves.has(scene) && (wall ? id >= 1862 && id <= 1940 : id >= 683 && id <= 686)) ||
    (warmCaves.has(scene) &&
      (wall ? id >= 1623 && id <= 1701 : (id >= 675 && id <= 678) || (id >= 690 && id <= 693)));
  const vault = scene === 5 && wall && (vaultGateTiles.has(id) || vaultChests.has(id));
  const sharedFloor = !wall && sharedFloors.has(id);
  const islandFloor = scene === 78 && !wall && islandFloors.has(id);
  const temple =
    scene === 63 && (wall ? templeWalls.has(id) : id <= 104 || (id >= 695 && id <= 698));
  const eave = wall && eaveWalls.has(id);
  const mingjiao = scene === 12 && wall && (mingjiaoWalls.has(id) || mingjiaoDoors.has(id));
  if (
    (greyCaves.has(scene) || warmCaves.has(scene)) &&
    !temple &&
    !vault &&
    !cave &&
    !sharedFloor &&
    !(wall && sharedWalls.has(id))
  )
    return false;
  const manor = scene === 36 || scene === 56 || scene === 59 || (wall && formalWalls.has(id));
  const village = scene === 24 || scene === 37 || scene === 49 || manor || (wall && villageWalls.has(id));
  const rural = scene === 50 || village || (wall && (brickWalls.has(id) || timberFence.has(id)));

  if (
    !temple &&
    !vault &&
    !cave &&
    !sharedFloor &&
    !islandFloor &&
    !eave &&
    !mingjiao &&
    (wall
      ? rural
        ? !brickWalls.has(id) &&
          !timberFence.has(id) &&
          !(
            manor &&
            (manorPlaster.has(id) ||
              manorBrick.has(id) ||
              manorPillars.has(id) ||
              manorTimber.has(id))
          ) &&
          !(village && (greyBrickWalls.has(id) || plasterWalls.has(id) || picketFence.has(id) || (scene === 37 && wuduPlaster.has(id))))
        : !bamboo.has(id)
      : !(
          id <= 104 ||
          (scene === 12 && mingjiaoEarthEdges.has(id)) ||
          (manor && manorPaving.has(id)) ||
          (village && villagePaving.has(id)) ||
          (rural ? id === 588 : [569, 570, 571, 591].includes(id))
        ))
  )
    return false;
  const cache = wall ? walls : ground,
    key = `${atlas.src}:${id}:${x}:${y}`;
  if (!cache.has(key))
    cache.set(
      key,
      mingjiao
        ? repaintMingjiaoWall(id, atlas, frame, x, y)
        : islandFloor
        ? repaintIslandFloor(id, atlas, frame, x, y)
        : vault
          ? repaintVault(id, atlas, frame)
          : temple
            ? repaintTemple(id, atlas, frame, x, y, wall)
            : eave
              ? repaintEaveWall(id, atlas, frame, x, y)
              : cave
                ? repaintCave(id, atlas, frame, x, y, wall, warmCaves.has(scene))
                : sharedFloor
                  ? repaintSharedFloor(id, atlas, frame, x, y)
                  : repaint(
                      id,
                      atlas,
                      frame,
                      x,
                      y,
                      wall,
                      rural,
                      village,
                      manor,
                      scene === 51 && !wall,
                    ),
    );
  const [, , , w, h, xo, yo] = frame;
  ctx.drawImage(cache.get(key), px - xo, py - yo, w, h);
  return true;
}
