// 入队兵器与铁笔的物品图：直接在 40×40 格上逐像素画，与原版物品图同一种画法。
// 规则：柄在左下、尖朝右上，斜 45°；刃长按兵器实际长短（匕首约为长剑三分之二）；
// 描边用本色压暗而非统一墨色；同名兵器同图，不同名的剑、刀用剑穗、护手、刃色区分。
// 战斗里手持的兵器仍用 weapon-models 的画法，这里只画物品图，不改那边的几何与颜色。
// 纯像素运算，不碰 DOM：paintWeaponPixels 只往传入的 RGBA 数组里写。
const N = 40;
const rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const shade = (c, k) => c.map(v => Math.max(0, Math.min(255, Math.round(v * k))));
const lift = (c, k) => c.map(v => Math.max(0, Math.min(255, Math.round(v + (255 - v) * k))));

// id → 画法。family：sword 剑、blade 刀、dagger 匕、wood 木剑、chopper 柴刀、hoe 锄、shears 剪、whip 鞭、staff 棍、flute 箫、brush 笔。
// len 为柄尖总步数（每步斜走一格）。tassel 剑穗色；metal 刃色；grip 柄色；guard 护手色；rust 旧刃。
const STEEL = '#c9ccc2', EDGE = '#f4f1e4', WOOD = '#7a5a3a', LEATHER = '#6e4a30';
export const WEAPON_PIXELS = {
  301: {family: 'blade', len: 31, gripLen: 11, metal: STEEL, guard: '#9a7a45', tassel: '#a2382a'},     // 朴刀：长柄大刀
  302: {family: 'hoe', len: 25, metal: '#a9b0a4'},                                                    // 采药短锄
  316: {family: 'hoe', len: 29, metal: '#a9b0a4', big: true},                                         // 药锄
  345: {family: 'hoe', len: 25, metal: '#a9b0a4'},
  309: {family: 'wood', len: 27, metal: '#b08b5c', guard: '#8a6a40'},                                 // 练武木剑
  317: {family: 'dagger', len: 19, metal: STEEL, guard: '#978567'},                                   // 护身短匕
  328: {family: 'dagger', len: 19, metal: STEEL, guard: '#978567'},
  347: {family: 'dagger', len: 19, metal: STEEL, guard: '#978567'},
  348: {family: 'dagger', len: 19, metal: STEEL, guard: '#978567'},
  376: {family: 'dagger', len: 22, metal: STEEL, guard: '#b59a5a', tassel: '#3e6c91'},                // 护身短剑
  325: {family: 'whip', len: 30, metal: '#8a6446'},                                                   // 旧皮鞭
  413: {family: 'whip', len: 30, metal: LEATHER},                                                     // 寻常软鞭
  326: {family: 'sword', len: 29, metal: '#b4ab98', guard: '#8a7658', rust: true},                    // 旧长剑
  354: {family: 'sword', len: 29, metal: '#b4ab98', guard: '#8a7658', rust: true},
  335: {family: 'sword', len: 30, metal: '#b9d2da', guard: '#b5a278', tassel: '#3e6c91'},             // 青锋剑
  336: {family: 'sword', len: 30, metal: STEEL, guard: '#b5a278', tassel: '#a2382a'},                 // 镖行长剑
  351: {family: 'sword', len: 30, metal: '#dfe3dc', guard: '#c9a24e', tassel: '#c9a24e'},             // 精钢长剑
  353: {family: 'sword', len: 30, metal: '#9fb6bf', guard: '#8a8e84', tassel: '#2f6b66'},             // 青钢剑
  359: {family: 'sword', len: 30, metal: STEEL, guard: '#b5a278', grip: '#d8c9a0'},                   // 素柄长剑
  361: {family: 'sword', len: 30, metal: STEEL, guard: '#b5a278', tassel: '#4f7a55'},                 // 随身长剑
  364: {family: 'sword', len: 30, metal: '#b4ab98', guard: '#9c9c90', tassel: '#f0ece0', rust: true}, // 全真旧剑
  410: {family: 'sword', len: 30, metal: STEEL, guard: '#b5a278'},                                    // 寻常长剑
  415: {family: 'sword', len: 26, metal: STEEL, guard: '#b5a278', grip: '#d8c9a0'},                   // 素柄副剑
  329: {family: 'blade', len: 29, metal: STEEL, guard: '#a68b52', tassel: '#a2382a'},                 // 单刀
  411: {family: 'blade', len: 29, metal: STEEL, guard: '#a68b52'},                                    // 寻常单刀
  337: {family: 'blade', len: 29, metal: '#b4ab98', guard: '#8a7658', rust: true},                    // 旧单刀
  338: {family: 'chopper', len: 22, metal: '#9aa39d'},                                                // 柴刀
  344: {family: 'shears', len: 26, metal: '#aab3ad'},                                                 // 铁剪
  349: {family: 'staff', len: 32, metal: '#8a6a44'},                                                  // 行脚木棍
  412: {family: 'staff', len: 35, metal: '#8a6a44'},                                                  // 行脚长棍
  363: {family: 'flute', len: 24, metal: '#c8b772'},                                                  // 竹箫
  414: {family: 'flute', len: 24, metal: '#c8b772'},
  199: {family: 'brush', len: 26, metal: '#7d8a84'},                                                  // 铁笔（判官笔）
};

export function paintWeaponPixels(p, spec) {
  const put = (x, y, c, a = 255) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= N || y >= N) return; const i = (y * N + x) * 4; p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; p[i + 3] = a; };
  const solid = new Uint8Array(N * N), mark = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= N || y >= N) return; solid[y * N + x] = 1; put(x, y, c); };
  const metal = rgb(spec.metal), edge = spec.rust ? lift(metal, .25) : lift(metal, .55), body = spec.rust ? shade(metal, .82) : metal;
  const guard = rgb(spec.guard || '#9a7a45'), grip = rgb(spec.grip || '#5e4630'), wood = rgb(WOOD);
  // 柄端（左下）。整体上提两格，剑穗与柄头都落在 40 格之内；大锄再左移三格，刃口不出格。
  const L = Math.min(spec.len, 34), x0 = Math.round(20 - L / 2) - (spec.big ? 3 : 0), y0 = Math.round(20 + L / 2) - 1;
  const at = s => [x0 + s, y0 - s];                         // 沿斜线第 s 步
  const f = spec.family;
  const tassel = (s, colour) => { if (!colour) return; const c = rgb(colour), [x, y] = at(s); for (let k = 1; k <= 4; k++) mark(x - (k > 2 ? 1 : 0), y + k, k === 4 ? shade(c, .7) : c); };
  const grip2 = (from, to, c = grip) => { for (let s = from; s < to; s++) { const [x, y] = at(s); mark(x, y, (s & 1) ? shade(c, .75) : c); mark(x + 1, y, shade(c, .6)); } };
  const guardBar = (s, half = 2) => { const [x, y] = at(s); for (let k = -half; k <= half; k++) mark(x + k, y + k, k === -half ? lift(guard, .3) : guard); };

  if (f === 'sword' || f === 'dagger' || f === 'wood') {
    const g = f === 'dagger' ? 5 : 7;
    grip2(0, g, spec.grip ? rgb(spec.grip) : f === 'wood' ? shade(wood, .8) : grip);
    guardBar(g, f === 'dagger' ? 1 : 2);
    for (let s = g + 1; s < L; s++) {
      const [x, y] = at(s), tip = s >= L - 2;
      mark(x, y, f === 'wood' ? lift(body, .2) : edge);
      if (!tip) mark(x + 1, y, body);
      if (!tip && f === 'wood') mark(x + 1, y + 1, shade(body, .8));
    }
    const [px, py] = at(0); mark(px - 1, py + 1, shade(guard, .8));
    tassel(0, spec.tassel);
  } else if (f === 'blade' || f === 'chopper') {
    const g = spec.gripLen || 7;
    grip2(0, g); guardBar(g, 2);
    const wide = f === 'chopper' ? 4 : 3;
    for (let s = g + 1; s < L; s++) {
      const [x, y] = at(s), left = L - s;
      const w = f === 'chopper' ? (left <= 1 ? 2 : wide) : left <= 2 ? 1 : left <= 5 ? 2 : wide;
      mark(x, y, edge);                                   // 刃口在上
      for (let k = 1; k < w; k++) mark(x + k, y + (k > 1 ? 1 : 0), k === w - 1 ? shade(body, .78) : body);
    }
    tassel(0, spec.tassel);
  } else if (f === 'staff' || f === 'flute') {
    const c = rgb(spec.metal);
    for (let s = 0; s < L; s++) {
      const [x, y] = at(s);
      mark(x, y, lift(c, .25)); mark(x + 1, y, shade(c, .78));
      if (f === 'staff' && (s === 0 || s === L - 1)) { mark(x, y, rgb('#6f6a60')); mark(x + 1, y, rgb('#4f4b44')); }
      if (f === 'staff' && s === Math.round(L * .6)) mark(x + 1, y, shade(c, .55));
      if (f === 'flute' && s > 3 && s < L - 3 && s % 3 === 0) put(x, y, shade(c, .35));          // 按孔
      if (f === 'flute' && (s === 3 || s === L - 3)) { mark(x, y, shade(c, .7)); mark(x + 1, y, shade(c, .6)); }
    }
    if (f === 'flute') tassel(0, '#a2382a');
  } else if (f === 'hoe') {
    const handle = L - 3;
    for (let s = 0; s < handle; s++) { const [x, y] = at(s); mark(x, y, lift(wood, .2)); mark(x + 1, y, shade(wood, .8)); }
    // 锄刃：从柄头向右下伸出，由窄变宽的实心刃片，刃口一侧提亮。
    const [hx, hy] = at(handle - 1), blade = spec.big ? 8 : 7;
    for (let y = hy - 2; y <= hy + blade + 3; y++) for (let x = hx - 2; x <= hx + blade + 3; x++) {
      const t = ((x - hx) + (y - hy)) / 2 / blade;                    // 沿刃长方向 0..1
      if (t < 0 || t > 1) continue;
      const off = Math.abs((x - hx) - (y - hy)) / 2, half = .6 + t * (spec.big ? 2.4 : 1.9);
      if (off <= half) mark(x, y, t > .8 ? lift(metal, .45) : (x - hx) > (y - hy) ? body : shade(body, .85));
    }
    mark(hx, hy, shade(metal, .6));
  } else if (f === 'shears') {
    const pivot = Math.round(L * .45);
    for (let s = pivot; s < L; s++) { const [x, y] = at(s), spread = s < L - 2 ? 1 : 0; mark(x, y - spread, edge); mark(x + spread + 1, y, body); }
    for (let s = 3; s < pivot; s++) { const [x, y] = at(s); mark(x, y, body); mark(x + 1, y, shade(body, .8)); }
    const [rx, ry] = at(pivot); mark(rx, ry, rgb('#e9d9a0')); mark(rx + 1, ry, shade(body, .6));
    const ring = (cx, cy) => { for (const [dx, dy] of [[-1, -2], [0, -2], [1, -2], [2, -1], [2, 0], [2, 1], [1, 2], [0, 2], [-1, 2], [-2, 1], [-2, 0], [-2, -1]]) mark(cx + dx, cy + dy, shade(body, .72)); };
    const [ax, ay] = at(1); ring(ax - 2, ay - 1); ring(ax + 1, ay + 2);
  } else if (f === 'whip') {
    const c = rgb(spec.metal);
    for (let s = 0; s < 8; s++) { const [x, y] = at(s); mark(x, y, grip); mark(x + 1, y, shade(grip, .7)); }
    const [kx, ky] = at(8); mark(kx, ky, rgb('#a2382a')); mark(kx + 1, ky, rgb('#7a2a20'));
    // 鞭身：一道松松的 S，由粗到细。
    let prev = null;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const x = kx + 1 + 22 * t, y = ky - 4 - 14 * t + 7 * Math.sin(t * Math.PI * 1.6);
      const pt = [Math.round(x), Math.round(y)];
      if (prev && pt[0] === prev[0] && pt[1] === prev[1]) continue;
      mark(pt[0], pt[1], lift(c, .15)); if (t < .55) mark(pt[0], pt[1] + 1, shade(c, .75));
      prev = pt;
    }
  } else if (f === 'brush') {
    const c = rgb(spec.metal);
    for (let s = 0; s < L - 5; s++) { const [x, y] = at(s); mark(x, y, lift(c, .3)); mark(x + 1, y, shade(c, .75)); }
    const [rx, ry] = at(1); mark(rx - 1, ry, rgb('#c9a24e')); mark(rx + 1, ry + 1, rgb('#9a7a45'));   // 尾环
    const ink = rgb('#231d16'), tipBase = L - 5;
    for (let k = 0; k < 5; k++) {                                  // 笔头：先鼓后尖
      const [x, y] = at(tipBase + k), w = k < 3 ? 2 : 1;
      mark(x, y, k < 2 ? rgb('#4a3f31') : ink); if (w > 1) { mark(x + 1, y, ink); mark(x, y - 1, rgb('#4a3f31')); }
    }
  }
  // 描边：本色压暗，只描在实心像素外一圈，不压成统一墨色。
  const edgeCells = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (solid[y * N + x]) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N || !solid[ny * N + nx]) continue;
      const j = (ny * N + nx) * 4; edgeCells.push([x, y, shade([p[j], p[j + 1], p[j + 2]], .45)]); break;
    }
  }
  for (const [x, y, c] of edgeCells) put(x, y, c);
  return p;
}
