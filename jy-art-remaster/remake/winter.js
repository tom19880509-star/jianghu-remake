// Paint on source alpha and relief masks; paths, snow banks and collision remain
// the original map. The rock quadrant is not used: it looks like paving stones.
const snowTiles = new Set([393, 394, 395, 396, 469, 470, 471]);
const sourcePixels = new Map(),
  painted = new Map();
let texture, houseTexture;
const houseWalls = new Set([
  1557, 1558, 1559, 1560, 1563, 1569, 1571, 1572, 1573, 1574, 1575, 1576, 1580, 1581, 1582, 1585,
  1586,
]);
async function loadTexture(file) {
  const im = new Image();
  im.src = "assets/" + file;
  await im.decode();
  const canvas = document.createElement("canvas");
  canvas.width = im.width;
  canvas.height = im.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(im, 0, 0);
  return {
    data: ctx.getImageData(0, 0, im.width, im.height).data,
    width: im.width,
    size: Math.floor(im.width / 2),
  };
}
export async function loadWinter() {
  [texture, houseTexture] = await Promise.all([
    loadTexture("materials-winter-v1.png"),
    loadTexture("materials-winter-house-v1.png"),
  ]);
}
const mod = (x, n) => ((Math.floor(x) % n) + n) % n;
function texel(kind, u, v, material = texture) {
  const { size, width } = material;
  const x = mod(u, size) + (["earth", "packed", "plaster"].includes(kind) ? size : 0);
  const y = mod(v, size) + (["earth", "brick"].includes(kind) ? size : 0);
  return (y * width + x) * 4;
}
export function paintWinter(ctx, pack, id, atlas, frame, px, py, x, y, home = false, prop = false) {
  if (!texture || !["smap", "wmap"].includes(pack) || !frame || !atlas.naturalWidth) return false;
  const edge = id >= 337 && id <= 398;
  const earth = home && id >= 31 && id <= 34;
  const floor = home && pack === "smap" && [588, 589, 679, 680, 681, 682].includes(id);
  const wall = home && pack === "smap" && houseWalls.has(id);
  if (prop ? !(id >= 1790 && id <= 1803) && !wall : !(snowTiles.has(id) || edge || earth || floor))
    return false;
  const sourceKey = `${pack}:${id}`,
    key = `${sourceKey}:${x}:${y}:${prop}`;
  const [, sx, sy, w, h, xo, yo] = frame;
  if (!painted.has(key)) {
    if (!sourcePixels.has(sourceKey)) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      g.drawImage(atlas, sx, sy, w, h, 0, 0, w, h);
      sourcePixels.set(sourceKey, g.getImageData(0, 0, w, h).data);
    }
    const raw = sourcePixels.get(sourceKey),
      c = document.createElement("canvas");
    // Derive each column's slope and base from the original opaque wall outline,
    // including corner pieces. The new materials do not fill window/door holes.
    const tops = [],
      bottoms = [];
    if (wall)
      for (let xx = 0; xx < w; xx++) {
        const ys = [];
        for (let yy = 0; yy < h; yy++) if (raw[(yy * w + xx) * 4 + 3]) ys.push(yy);
        tops[xx] = ys[0] ?? 0;
        bottoms[xx] = ys.at(-1) ?? h;
      }
    c.width = w * 2;
    c.height = h * 2;
    const g = c.getContext("2d"),
      data = g.createImageData(c.width, c.height);
    const wx = 18 * (x - y) - xo,
      wy = 9 * (x + y) - yo;
    for (let j = 0; j < c.height; j++)
      for (let i = 0; i < c.width; i++) {
        const p = (Math.floor(j / 2) * w + Math.floor(i / 2)) * 4;
        const q = (j * c.width + i) * 4;
        const r = raw[p],
          green = raw[p + 1],
          b = raw[p + 2],
          a = raw[p + 3];
        if (!a) continue;
        const column = Math.floor(i / 2),
          row = j / 2;
        const white =
          Math.min(r, green, b) > 150 &&
          Math.max(r, green, b) - Math.min(r, green, b) < 32 &&
          (!wall || row > bottoms[column] - 8);
        const soil = !prop && r > green * 1.12 && green > b * 1.16;
        const plaster =
          wall &&
          !white &&
          Math.min(r, green, b) > 85 &&
          Math.max(r, green, b) - Math.min(r, green, b) < 38;
        const brick = wall && row > bottoms[column] - 15 && r > green * 1.3 && r > b * 1.8;
        if ((floor && !white) || plaster || brick) {
          const kind = floor ? "wood" : brick ? "brick" : "plaster";
          const gx = (wx + i / 2) / 36 + (wy + j / 2) / 18,
            gy = (wy + j / 2) / 18 - (wx + i / 2) / 36;
          const left = Math.max(0, column - 3),
            right = Math.min(w - 1, column + 3);
          const slope = wall
            ? Math.max(-0.5, Math.min(0.5, (tops[right] - tops[left]) / Math.max(1, right - left)))
            : 0;
          const u = floor ? gx * 128 : (column + x * 18) * 8;
          const v = floor ? gy * 128 : (row - slope * column + y * 3) * 8;
          const t = texel(kind, u, v, houseTexture);
          const shade = floor ? 0.95 : brick ? 0.58 + r / 410 : 0.52 + (r + green + b) / 1140;
          for (let channel = 0; channel < 3; channel++) {
            const value = houseTexture.data[t + channel];
            data.data[q + channel] =
              (floor ? value * 0.72 + [135, 126, 113][channel] * 0.28 : value) * shade;
          }
        } else if (white || soil) {
          const kind = soil ? "earth" : snowTiles.has(id) && id !== 471 ? "packed" : "snow";
          const gx = (wx + i / 2) / 36 + (wy + j / 2) / 18;
          const gy = (wy + j / 2) / 18 - (wx + i / 2) / 36;
          const t = texel(kind, gx * 70, gy * 70);
          const shade = soil ? 0.62 + r / 560 : 0.68 + Math.max(r, green, b) / 800;
          for (let channel = 0; channel < 3; channel++) {
            const color = soil
              ? texture.data[t + channel]
              : texture.data[t + channel] * 0.28 + [236, 240, 238][channel] * 0.72;
            data.data[q + channel] = color * shade;
          }
        } else if (prop && !wall && pack === "wmap" && Math.max(r, green, b) < 110) {
          // 雪堆暗面画成背阴雪纹，白顶已并入地面，纯黑会成悬浮黑斑。
          const gx = (wx + i / 2) / 36 + (wy + j / 2) / 18,
            gy = (wy + j / 2) / 18 - (wx + i / 2) / 36;
          const t = texel("snow", gx * 70, gy * 70);
          const shade = 0.42 + Math.max(r, green, b) / 300;
          for (let channel = 0; channel < 3; channel++)
            data.data[q + channel] = (texture.data[t + channel] * 0.28 + [200, 210, 222][channel] * 0.72) * shade;
        } else {
          data.data[q] = r;
          data.data[q + 1] = green;
          data.data[q + 2] = b;
        }
        data.data[q + 3] = a;
      }
    g.putImageData(data, 0, 0);
    if (painted.size >= 8192) painted.clear();
    painted.set(key, c);
  }
  ctx.drawImage(painted.get(key), px - xo, py - yo, w, h);
  return true;
}
