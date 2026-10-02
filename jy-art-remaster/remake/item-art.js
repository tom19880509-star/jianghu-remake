// 物品图 · 墨韵纸本（Tom 2026-09-27：界面与物品图要和谐、有美感、合武侠）。
// 原版 200 张物品图（assets/items，受保护，不改文件）每张都带赭红底 #6c2400 与两像素斜面框，
// 压在宣纸面板上很突兀。这里在运行时抠掉框与底，只留原版像素画，摆在界面的纸托上。
// 原版没有图的物品：入队兵器与铁笔在 40 格上逐像素画（item-pixels.js）；衣履与客栈吃食由 SVG 压成 40 格像素，
// 颜色贴回原图调色板。十四天书原图全同，盖书名首字朱印；91/92 与 198 的原图重复或是占位，换个色调。
// 显示只按 40 的整倍数（40 / 80 / 120 / 160），像素不糊。
// 本模块顶层不碰 DOM、Image、window：collection-ui 会在 node 的假 DOM 里加载它。
import {paintWeaponPixels} from './item-pixels.js';
// 墨影取暖褐（与保留下来的原投影同一色调，不显冷灰）。
const SIZE = 40, BG = [108, 36, 0], INK = [58, 22, 6];
// 原版画在赭红底上的投影色（由深到浅），抠底后按「墨影」处理。
const SHADOWS = [[44, 8, 0, .5], [60, 12, 0, .42], [76, 20, 0, .34], [92, 28, 0, .26]];
// 这些图的主体本身用了底色（字迹、暗部、缝隙里的描线），只去掉与边框相连的底，封闭处保留原样。
// 审查逐像素核过：0/2/21/29/58/86/91/92/125/130/132/142/158 的封闭底色是画面，94/197 同理。
const KEEP_ENCLOSED = new Set([0, 2, 21, 29, 58, 86, 91, 92, 94, 125, 130, 132, 142, 158, 197]);
// 钥匙的投影是一圈暗边围着一块底色：抠底后只剩空心的影框。这几把钥匙把「影框＋框内底色」整块当墨影。
const HOLLOW_SHADOW = new Set([161, 162, 163, 164, 165, 166, 167, 168, 169, 170]);
export const TIANSHU_SEALS = {144:'飞',145:'雪',146:'连',147:'天',148:'射',149:'白',150:'鹿',151:'笑',152:'书',153:'神',154:'侠',155:'倚',156:'碧',157:'鸳'};
// 原图重复或占位：以另一张原图换色调代替。92 乾坤大挪移写在羊皮上，调成浅羊皮色；198 是 Lua 借 54 号复制的「空明拳札」。
const DERIVED = {92: {from: 92, tone: 'sheepskin'}, 198: {from: 54, hue: 200}};
const cache = new Map(), waiting = new Map(), sources = new Map();
let preparing = null;
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

export function itemArtKey(id) {
  if (typeof id === 'string') return id.startsWith('outfit:') ? id : 'outfit:' + id;
  return Number.isInteger(id) ? String(id) : null;
}
export function hasOriginalPicture(id) { return Number.isInteger(id) && id >= 0 && id < 200 && id !== 199; }
// 代码画的物品：由 equipment-art 在开局时登记画法。source 可以是 {pixels: 兵器规格}、{svg, box} 或 SVG 字串。
export function registerDrawnItem(key, source) { sources.set(String(key), source); }
export function hasItemArt(id) { const key = itemArtKey(id); return !!key && (hasOriginalPicture(id) || sources.has(key)); }

export function itemPicture(id, size = SIZE, {className = 'item-art', alt = ''} = {}) {
  const key = itemArtKey(id), img = document.createElement('img');
  img.className = className; img.alt = alt; img.width = img.height = size;
  img.setAttribute('draggable', 'false'); img.dataset.art = key ?? '';
  const ready = key && cache.get(key);
  if (ready) img.src = ready;
  else {
    // 抠图完成前先用原图（有赭红底）或透明占位，完成后原地换上。
    img.src = hasOriginalPicture(id) ? `assets/items/${DERIVED[id]?.from ?? id}.png` : BLANK;
    if (key) { if (!waiting.has(key)) waiting.set(key, new Set()); waiting.get(key).add(img); }
    if (key && preparing === null && typeof Image === 'function' && typeof window === 'object') queueMicrotask(() => prepareItemArt());
  }
  return img;
}

function settle(key, url) {
  cache.set(key, url);
  for (const img of waiting.get(key) || []) img.src = url;
  waiting.delete(key);
}
function load(src) {
  return new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = src; });
}
function canvas(size = SIZE) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }
const ctx = c => c.getContext('2d', {willReadFrequently: true});
const isInk = (p, i) => p[i] === INK[0] && p[i + 1] === INK[1] && p[i + 2] === INK[2];
const shadowAt = (p, i) => SHADOWS.find(s => p[i] === s[0] && p[i + 1] === s[1] && p[i + 2] === s[2]);
function toHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > .5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl(h, s, l) {
  if (!s) return [l, l, l].map(v => Math.round(v * 255));
  const q = l < .5 ? l * (1 + s) : l + s - l * s, t = 2 * l - q;
  const f = x => { x = (x + 1) % 1; return x < 1 / 6 ? t + (q - t) * 6 * x : x < .5 ? q : x < 2 / 3 ? t + (q - t) * (2 / 3 - x) * 6 : t; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255));
}
// 换色调：投影与墨影不动，只改物件本身。
export function retone(p, {hue = 0, tone} = {}) {
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3] || isInk(p, i) || shadowAt(p, i)) continue;
    let [h, s, l] = toHsl(p[i], p[i + 1], p[i + 2]);
    if (tone === 'sheepskin') { s *= .25; l = l + (1 - l) * .35; h = 30 / 360; }
    else h = (h + hue / 360) % 1;
    [p[i], p[i + 1], p[i + 2]] = fromHsl(h, s, l);
  }
  return p;
}
// 原图抠底（纯函数，直接改 40×40 的 RGBA 数组；测试用真 PNG 跑它）：
// 1 去两像素框；2 去赭红底（KEEP_ENCLOSED 只去与框相连的底）；
// 3 投影：与物件不相连的整块投影改成半透明墨影，钥匙的空心影框连同框内底色一起改；与物件相连的投影保持原色（有些物件自己用这几种颜色）。
// 原图过小的几件（千年冰蚕等）保持原大：审查认为那就是原作的比例。
export function keyPixels(p, id) {
  const at = (x, y) => (y * SIZE + x) * 4;
  const isBg = i => p[i] === BG[0] && p[i + 1] === BG[1] && p[i + 2] === BG[2] && p[i + 3];
  const hollow = HOLLOW_SHADOW.has(id), keepEnclosed = KEEP_ENCLOSED.has(id) || hollow;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = at(x, y);
    if (Math.min(x, y, SIZE - 1 - x, SIZE - 1 - y) < 2) p[i + 3] = 0;
  }
  const stack = [];
  for (let k = 2; k < SIZE - 2; k++) stack.push([k, 2], [k, SIZE - 3], [2, k], [SIZE - 3, k]);
  while (stack.length) {
    const [x, y] = stack.pop(); if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue;
    const i = at(x, y); if (!isBg(i)) continue;
    p[i + 3] = 0; stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  // 封闭在图里的底色：两格以上的空处（戒指孔、辐条缝）抠空；只有一格、四面都是画面的是笔触间的点，留原色，免得挖出纸白小点。
  if (!keepEnclosed) {
    const done = new Uint8Array(SIZE * SIZE);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      if (done[y * SIZE + x] || !isBg(at(x, y))) continue;
      const cells = [], queue = [[x, y]]; done[y * SIZE + x] = 1;
      while (queue.length) {
        const [cx, cy] = queue.pop(); cells.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE || done[ny * SIZE + nx] || !isBg(at(nx, ny))) continue;
          done[ny * SIZE + nx] = 1; queue.push([nx, ny]);
        }
      }
      if (cells.length > 1) for (const [cx, cy] of cells) p[at(cx, cy) + 3] = 0;
    }
  }
  const inShadow = i => p[i + 3] && (shadowAt(p, i) || (hollow && isBg(i)));
  const seen = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    if (seen[y * SIZE + x] || !inShadow(at(x, y))) continue;
    const cells = [], queue = [[x, y]]; let touchesArt = false; seen[y * SIZE + x] = 1;
    while (queue.length) {
      const [cx, cy] = queue.pop(); cells.push([cx, cy]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
        const j = at(nx, ny); if (!p[j + 3]) continue;
        if (inShadow(j)) { if (!seen[ny * SIZE + nx]) { seen[ny * SIZE + nx] = 1; queue.push([nx, ny]); } }
        else touchesArt = true;
      }
    }
    // 钥匙：只有含投影色的那块才是影子；只被金属围住的纯底色（钥匙圈的孔）照样抠空。
    const hasShadow = cells.some(([cx, cy]) => shadowAt(p, at(cx, cy)));
    if (!hasShadow) { for (const [cx, cy] of cells) p[at(cx, cy) + 3] = 0; continue; }
    if (touchesArt && !hollow) continue;
    for (const [cx, cy] of cells) {
      const i = at(cx, cy), a = shadowAt(p, i)?.[3] ?? .2;
      p[i] = INK[0]; p[i + 1] = INK[1]; p[i + 2] = INK[2]; p[i + 3] = Math.round(a * 255);
    }
  }
  return p;
}
function keyOriginal(im, id) {
  const c = canvas(), g = ctx(c); g.drawImage(im, 0, 0);
  const data = g.getImageData(0, 0, SIZE, SIZE); keyPixels(data.data, id);
  return {c, g, data};
}
// 天书：右下角一方朱印，印文是书名首字（飞雪连天射白鹿，笑书神侠倚碧鸳）。
// 字先在小画布上以整像素画出、按透明度二值化，再居中贴进印面，笔画不糊、不压印边。
function stampSeal(g, glyph) {
  g.fillStyle = '#7a2418'; g.fillRect(24, 24, 15, 15);
  g.fillStyle = '#a2382a'; g.fillRect(25, 25, 13, 13);
  const scratch = canvas(16), sg = ctx(scratch);
  sg.fillStyle = '#000'; sg.font = '12px "Jianghu Song Small", "Songti SC", serif'; sg.textAlign = 'left'; sg.textBaseline = 'top';
  sg.fillText(glyph, 1, 1);
  const px = sg.getImageData(0, 0, 16, 16).data;
  let x1 = 16, y1 = 16, x2 = -1, y2 = -1;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (px[(y * 16 + x) * 4 + 3] >= 128) { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); }
  if (x2 < 0) return;
  const w = Math.min(11, x2 - x1 + 1), h = Math.min(11, y2 - y1 + 1), ox = 25 + Math.floor((13 - w) / 2), oy = 25 + Math.floor((13 - h) / 2);
  g.fillStyle = '#f6e7cf';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[((y1 + y) * 16 + x1 + x) * 4 + 3] >= 128) g.fillRect(ox + x, oy + y, 1, 1);
}

// 原图的调色板：200 张原版物品图（去底去框后）用到的 224 种颜色，离线取出写在这里，代码画的物品颜色贴过去，与原图同一套颜料。
// 内嵌而不是运行时收集：代码画的物品不必等 199 张原图下载完。
const PALETTE_HEX = '0000000000340000540018000028000404740404980438000848040c0c0c0c0cb81414d8145808180c0c181414181818181c081c0c001c68102004002018002020fc241414242020242424242c102470a4280c002878182c08002c24183028003084b834140034201c342c2c3434343434fc343818348cd83888243c0c003c3024401c044048204098cc440044442c28443c384440004444444848f84898304c00004c14004c240050000050005050280450382c50383450402c50484450505050580050582c54a43454b0e05844345c1c005c30085c5cf860046060300060444060545060606060683860b040644c38680400683c0c68544068780068c0e86c00046c605c6c6c6c6c78446cc048700c7070544c7070f8744000784814785c4478644c78d0587c2c007c70687c7c7c7c88547c94008014808060588400048410008454208484f888540488685088785888880088e46c8c3c088c70648c80788c8c8c8c986490642c942c9494e0f8985028988c649898f89c00049c4c1c9c68089c743c9c745c9c80709c90889c9c049c9c9c9ca874a42400a4582ca84ca8a88850ac6030ac9080aca098acacacacacf8acb888b00408b08068b0d4f0b46434b48010b4b410b89c68bc6cbcbc7848bc9c94bca878bcb0acbcbcbcbcc898c00c1cc03c00c06c3cc0c0f8c40810c48c74c4b088c89814c8c834cc9064cca08cccb4a0ccc4bcccccccccd8acd07844d098d0d4d4f8d81418d8b4a4d8d0b4dc1428dc5800dc844cdcc0b4dcd4d0dcdc64dcdcdce0b420e4ccc0e4f0f8e8202ce83840e8c8e8ec5054ec9054ecc828ecd050ece8e4ecececf0686cf0d878f48084f4e4a4f4f484f89c9cf8f0ccfc384cfc7c00fc9410fc989cfc9c60fca470fcac24fcac80fcb490fcb8b8fcc03cfcc0a0fcc8b0fcd4c0fcd860fcec84fcf8a8fcfcfc';
const palette = [], nearest = new Map();
for (let i = 0; i < PALETTE_HEX.length; i += 6) palette.push([0, 2, 4].map(k => parseInt(PALETTE_HEX.slice(i + k, i + k + 2), 16)));
function snap(p) {
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] !== 255) continue;
    const k = (p[i] << 16) | (p[i + 1] << 8) | p[i + 2];
    let c = nearest.get(k);
    if (c === undefined) {
      let best = Infinity, q0 = null;
      for (const q of palette) { const d = (q[0] - p[i]) ** 2 * 3 + (q[1] - p[i + 1]) ** 2 * 4 + (q[2] - p[i + 2]) ** 2 * 2; if (d < best) { best = d; q0 = q; } }
      // 只收拢相近的色（抗锯齿留下的深浅差），布料的青、绿等本色离调色板太远就保留，不洗成灰。
      c = best <= 900 ? q0 : null; nearest.set(k, c);
    }
    if (c) { p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; }
  }
  return p;
}
// 描边：实心像素外一圈，用相邻实心像素的颜色压暗（×0.45），不是统一墨色。
function outline(p, solid) {
  const add = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    if (solid[y * SIZE + x]) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE || !solid[ny * SIZE + nx]) continue;
      const j = (ny * SIZE + nx) * 4; add.push([(y * SIZE + x) * 4, p[j] * .45, p[j + 1] * .45, p[j + 2] * .45]); break;
    }
  }
  for (const [i, r, g, b] of add) { p[i] = r; p[i + 1] = g; p[i + 2] = b; p[i + 3] = 255; }
}
// SVG 画的物品 → 40 格像素：只缩不放，放进 box 格（衣约 26、鞋约 22、吃食约 24），底边对齐，脚下一抹墨影。
function pixelize(draw, box = 34) {
  const big = canvas(160), bg = ctx(big); draw(bg, 160);
  const src = bg.getImageData(0, 0, 160, 160).data;
  let x1 = 160, y1 = 160, x2 = -1, y2 = -1;
  for (let y = 0; y < 160; y++) for (let x = 0; x < 160; x++) if (src[(y * 160 + x) * 4 + 3] > 24) { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); }
  const c = canvas(), g = ctx(c);
  if (x2 < 0) return c;
  const w = x2 - x1 + 1, h = y2 - y1 + 1, s = Math.min(box / w, box / h), dw = Math.round(w * s), dh = Math.round(h * s);
  const left = Math.round((SIZE - dw) / 2), top = SIZE - 5 - dh;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(big, x1, y1, w, h, left, top, dw, dh);
  const data = g.getImageData(0, 0, SIZE, SIZE), p = data.data, solid = new Uint8Array(SIZE * SIZE);
  // getImageData 给的是未预乘的颜色：只二值化透明度，不再放大颜色。
  for (let k = 0; k < SIZE * SIZE; k++) { if (p[k * 4 + 3] >= 110) { solid[k] = 1; p[k * 4 + 3] = 255; } else p[k * 4 + 3] = 0; }
  snap(p); outline(p, solid);
  // 脚下墨影：底边下两行的扁椭圆，与原图投影同一位置感。
  const cx = SIZE / 2, rx = Math.max(5, dw * .42), baseY = top + dh + 1;
  for (let y = baseY; y < baseY + 2 && y < SIZE; y++) for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) {
    const i = (y * SIZE + x) * 4; if (x < 0 || x >= SIZE || p[i + 3]) continue;
    const t = Math.abs(x - cx) / rx; if (t > 1) continue;
    p[i] = INK[0]; p[i + 1] = INK[1]; p[i + 2] = INK[2]; p[i + 3] = Math.round((y === baseY ? .34 : .2) * 255 * (1 - t * t * .6));
  }
  g.putImageData(data, 0, 0); return c;
}
async function drawnPicture(source) {
  if (source && source.pixels) {
    const c = canvas(), g = ctx(c), data = g.createImageData(SIZE, SIZE);
    paintWeaponPixels(data.data, source.pixels); g.putImageData(data, 0, 0); return c;
  }
  if (typeof source === 'function') return pixelize(source);
  const svg = typeof source === 'string' ? source : source.svg(), box = typeof source === 'object' ? source.box : undefined;
  const im = await load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  return pixelize((g, n) => g.drawImage(im, 0, 0, n, n), box);
}

// 开局后在后台跑一次：抠好全部原图，画好全部代码物品。失败的留原图，不影响游戏。
export function prepareItemArt() {
  if (preparing) return preparing;
  if (typeof Image !== 'function' || typeof document !== 'object') return Promise.resolve();
  const pause = () => new Promise(r => setTimeout(r));
  preparing = (async () => {
    try { await document.fonts?.load?.('12px "Jianghu Song Small"'); } catch {}
    // 代码画的物品不用下载，先画；每件之间让一下主线程，不卡开局。
    for (const [key, source] of sources) {
      await pause();
      try { settle(key, (await drawnPicture(source)).toDataURL()); }
      catch {
        // 画不出（个别浏览器画不了 SVG）就退回矢量原图，不留空白。
        const svg = typeof source === 'string' ? source : typeof source?.svg === 'function' ? source.svg() : null;
        if (svg) settle(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)); else waiting.delete(key);
      }
    }
    const originals = [];
    for (let id = 0; id < 200; id++) if (hasOriginalPicture(id)) originals.push(id);
    for (let k = 0; k < originals.length; k += 20) {
      await pause();
      await Promise.all(originals.slice(k, k + 20).map(async id => {
        try {
          const derived = DERIVED[id], im = await load(`assets/items/${derived?.from ?? id}.png`);
          const {c, g, data} = keyOriginal(im, derived?.from ?? id);
          if (derived) retone(data.data, derived);
          g.putImageData(data, 0, 0);
          if (TIANSHU_SEALS[id]) stampSeal(g, TIANSHU_SEALS[id]);
          settle(String(id), c.toDataURL());
        } catch { waiting.delete(String(id)); }   // 失败就留着带底的原图
      }));
    }
  })();
  return preparing;
}
