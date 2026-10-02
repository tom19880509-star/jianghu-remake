// New painted water follows source terrain pixels; banks and collision are unchanged.
let texture;
const tiles = new Map();
// Batched mode for terrain-cache rebuilds (engine.js drawGround). Re-rendering one shared scratch canvas per
// tile forced a GPU upload + sync on every draw (~0.44 ms each; hundreds of sea tiles made a ~0.5 s hitch every
// few steps on the world map). In a batch we only record where each tile's static grey mask lands, then lay the
// world-registered texture once over the whole cache: the same pixels, a few full-canvas operations.
let batch = null, layer = null, masks = null;
export function beginWaterBatch() { batch = []; }
export function flushWaterBatch(target) {
  const list = batch;
  batch = null;
  if (!list?.length || !texture) return;
  const {width: W, height: H} = target.canvas;
  if (!layer || layer.width !== W || layer.height !== H) {
    layer = Object.assign(document.createElement("canvas"), {width: W, height: H});
    masks = Object.assign(document.createElement("canvas"), {width: W, height: H});
  }
  const m = masks.getContext("2d"), w = layer.getContext("2d");
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.clearRect(0, 0, W, H);
  m.imageSmoothingEnabled = false;
  for (const r of list) { m.setTransform(r.matrix); m.drawImage(r.mask, r.x, r.y); }
  m.setTransform(1, 0, 0, 1, 0, 0);
  // Every tile of one rebuild shares the same world→cache mapping; texture pixels sit at world·(256/width).
  const pattern = w.createPattern(texture, "repeat");
  pattern.setTransform(list[0].world.scale(256 / texture.width));
  w.setTransform(1, 0, 0, 1, 0, 0);
  w.imageSmoothingEnabled = false;
  w.globalCompositeOperation = "copy";
  w.drawImage(masks, 0, 0);
  w.globalCompositeOperation = "source-in";
  w.fillStyle = pattern;
  w.fillRect(0, 0, W, H);
  w.globalCompositeOperation = "multiply";
  w.drawImage(masks, 0, 0);
  w.globalCompositeOperation = "source-over";
  target.save();
  target.setTransform(1, 0, 0, 1, 0, 0);
  target.drawImage(layer, 0, 0);
  target.restore();
}
export async function loadWater() {
  texture = new Image();
  texture.src = "assets/water-jade-v1.png";
  await texture.decode();
}
export function paintWater(ctx, pack, id, atlas, frame, px, py, tx, ty) {
  if (!texture || !frame || !atlas.complete || !atlas.naturalWidth) return;
  const key = pack + ":" + id;
  let t = tiles.get(key);
  const [, sx, sy, w, h, xo, yo] = frame;
  if (t === undefined) {
    const mask = document.createElement("canvas");
    mask.width = w;
    mask.height = h;
    const m = mask.getContext("2d");
    m.drawImage(atlas, sx, sy, w, h, 0, 0, w, h);
    const data = m.getImageData(0, 0, w, h);
    let count = 0;
    for (let i = 0; i < data.data.length; i += 4) {
      const [r, g, b, a] = data.data.subarray(i, i + 4);
      const water = b > 90 && b > r * 1.35 && b > g * 1.25;
      // 原版水面的冷色高光 (176,212,240)/(228,240,248) 也收进蒙版，否则新水纹上留孤立白点；
      // 高光不计数，没有真水像素的图块（道具图标等）不会因此被刷成水。
      if (a && (water || (b >= 200 && b > g && g > r && r >= 150 && b - r >= 20))) {
        data.data[i] = data.data[i + 1] = data.data[i + 2] = b;
        if (water) count++;
      } else data.data[i + 3] = 0;
    }
    if (!count) {
      tiles.set(key, null);
      return;
    }
    m.putImageData(data, 0, 0);
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const draw = out.getContext("2d");
    draw.imageSmoothingEnabled = false;
    t = { mask, out, draw, pattern: draw.createPattern(texture, "repeat") };
    tiles.set(key, t);
  }
  if (!t) return;
  if (batch) {
    const matrix = ctx.getTransform();
    // world pixel (18(tx−ty), 9(tx+ty)) is this tile's anchor (px, py) in the target's local space.
    batch.push({mask: t.mask, matrix, x: px - xo, y: py - yo,
      world: matrix.translate(px - 18 * (tx - ty), py - 9 * (tx + ty))});
    return;
  }
  const { draw, pattern, out, mask } = t,
    scale = 256 / texture.width;
  // Register texture in world pixels, so camera movement cannot make it slide under the banks.
  const worldX = 18 * (tx - ty) - xo,
    worldY = 9 * (tx + ty) - yo;
  pattern.setTransform(new DOMMatrix([scale, 0, 0, scale, -worldX, -worldY]));
  draw.clearRect(0, 0, w, h);
  draw.globalCompositeOperation = "source-over";
  draw.fillStyle = pattern;
  draw.fillRect(0, 0, w, h);
  draw.globalCompositeOperation = "multiply";
  draw.drawImage(mask, 0, 0);
  draw.globalCompositeOperation = "destination-in";
  draw.drawImage(mask, 0, 0);
  draw.globalCompositeOperation = "source-over";
  ctx.drawImage(out, px - xo, py - yo);
}
