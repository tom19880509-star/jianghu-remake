// Copyright 2026 Tom (tom19880509-star)
// SPDX-License-Identifier: Apache-2.0
// Attribution: Jianghu Remake / 江湖重绘, created and directed by Tom.
export function gameViewport(width, height, detail = 1, pixelRatio = 1) {
  const cssWidth = Math.max(1, width), cssHeight = Math.max(1, height);
  const fit = Math.min(cssWidth / 960, cssHeight / 640);
  const logicalWidth = cssWidth / fit, logicalHeight = cssHeight / fit;
  // Never allocate a huge retina canvas just because a phone is in portrait.
  const scale = Math.min(detail, Math.max(1, pixelRatio) * fit, Math.sqrt(4000000 / (logicalWidth * logicalHeight)));
  return { width: logicalWidth, height: logicalHeight,
    centerX: logicalWidth / 2, centerY: logicalHeight / 2, scale };
}
// mapOffsetY：原版地砖图块 36×18、锚点偏移 (18,17)——格子锚点 (px,py) 落在地砖菱形的**下尖角**，
// 菱形中心在锚点上方 8.5。原版的高亮格也是同偏移的图块，所以一直对缝；重制版的人物、站位格、移动与攻击
// 高亮都以锚点为中心，战斗里就整层比地砖低了近一个半格高，看起来踩在四块砖的接缝上。
// 战斗把地图层（地面＋墙与摆设）下移 8×terrainScale：图块上沿落在 py−halfHeight（整数像素），菱形中心≈锚点。
// 场景（CLASSIC）有台阶高度与已调好的走动，不在本次范围内，保持 0。
export const BATTLE_GRID = Object.freeze({halfWidth:24, halfHeight:12, terrainScale:4/3, mapOffsetY:8*4/3});
export const CLASSIC_GRID = Object.freeze({halfWidth:18, halfHeight:9, terrainScale:1, mapOffsetY:0});
export function screenToTile(clientX, clientY, rect, view, camera, grid = CLASSIC_GRID) {
  const tx = (clientX - rect.left) * view.width / rect.width;
  const ty = (clientY - rect.top) * view.height / rect.height;
  const px = tx - view.centerX, py = ty - view.centerY;
  return { tx, ty, x: Math.round(camera.x + (px / grid.halfWidth + py / grid.halfHeight) / 2),
    y: Math.round(camera.y + (py / grid.halfHeight - px / grid.halfWidth) / 2) };
}

// Resolve the diamond that was actually drawn, including raised thresholds.
// Prefer the frontmost ground tile where several heights project onto one point.
export function raisedTileAt(tx, ty, view, camera, heightAt) {
  let hit = null;
  for (let y = 1; y < 63; y++) for (let x = 1; x < 63; x++) {
    const px = view.centerX + 18 * (x - camera.x - y + camera.y),
      py = view.centerY + 9 * (x - camera.x + y - camera.y) - heightAt(x, y);
    const distance = Math.abs(tx - px) / 18 + Math.abs(ty - py) / 9;
    if (distance <= 1.0001 && (!hit || x + y > hit.x + hit.y ||
        (x + y === hit.x + hit.y && x > hit.x))) hit = {x, y};
  }
  return hit;
}

// Battle figures stand above their foot tile, so a finger on a fighter's body
// lands one or two cells behind it. Resolve the visible figure first (front
// fighter wins, like the draw order); callers still validate the returned cell
// against the source's legal-selection layer. Battle maps have no tile height.
export function battleFigureAt(tx, ty, view, camera, fighters, {pad = 0, height = 60, halfBody = 15, grid = BATTLE_GRID} = {}) {
  let hit = null;
  for (const f of fighters || []) {
    if (!f || f.dead) continue;
    const px = view.centerX + grid.halfWidth * (f.x - camera.x - f.y + camera.y),
      py = view.centerY + grid.halfHeight * (f.x - camera.x + f.y - camera.y);
    if (tx < px - halfBody - pad || tx > px + halfBody + pad ||
        ty < py - height - pad || ty > py + grid.halfHeight + pad) continue;
    if (!hit || f.x + f.y > hit.x + hit.y || (f.x + f.y === hit.x + hit.y && f.x > hit.x)) hit = f;
  }
  return hit;
}
