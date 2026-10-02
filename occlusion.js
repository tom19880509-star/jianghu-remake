// Copyright 2026 Tom (tom19880509-star)
// SPDX-License-Identifier: Apache-2.0
// Attribution: Jianghu Remake / 江湖重绘, created and directed by Tom.
// Screen bounds follow the visible body, including an in-between walking frame.
// 156B: the probe used to be half the drawn figure. The remastered walking and
// idle frames reach 24px either side of the foot anchor and 59px above it (the
// sheet reaches 56 and drawHero lifts it another 3); the original 2501..2528
// sprites stay inside that. A wall that hid only a shoulder, a sleeve or the top
// of the head therefore never faded. Widening only lets more candidates reach
// the pixel test below, which still decides, so nothing new fades by mistake.
// Keep the feet clear of the ground so floor trim does not fade unnecessarily.
export const BODY_HALF_WIDTH = 24, BODY_TOP = 59, BODY_FOOT_CLEARANCE = 5;
export function coversHero(bounds, x, y, hero, scale = 1) {
  if (!bounds || !hero) return false;
  const [w, h, ax, ay] = bounds, [, , hx, hy] = hero;
  return h > 16 && x - ax < hx + BODY_HALF_WIDTH * scale &&
    x - ax + w > hx - BODY_HALF_WIDTH * scale &&
    y - ay < hy - BODY_FOOT_CLEARANCE * scale && y - ay + h > hy - BODY_TOP * scale;
}

export function inFrontOfHero(x, y, hero) {
  return hero && (x + y > hero[0] + hero[1] ||
    (x + y === hero[0] + hero[1] && x > hero[0]));
}

// Bounds are only a cheap first pass. Empty corners of a mountain, a doorway,
// or a tree canopy must not make an otherwise visible actor fade its scenery.
// Test the pixels actually drawn, using two small reusable body-sized canvases.
export function createOcclusionTester(makeCanvas = () => document.createElement('canvas')) {
  let actorCanvas, objectCanvas;
  return (hero, drawActor, scale = 1) => {
    let body;
    return (x, y, bounds, px, py, drawObject) => {
      // Matches the renderer's diagonal order, including same-depth tile ties.
      // No sampling (or fading) of objects drawn behind the actor.
      if (!inFrontOfHero(x, y, hero) || !coversHero(bounds, px, py, hero, scale)) return false;
      // Sample exactly the box coversHero accepted, or a figure the bounds pass
      // let through would still be clipped away before its pixels are compared.
      const left = Math.floor(hero[2] - BODY_HALF_WIDTH * scale),
        top = Math.floor(hero[3] - BODY_TOP * scale);
      const width = Math.ceil(2 * BODY_HALF_WIDTH * scale),
        height = Math.ceil((BODY_TOP - BODY_FOOT_CLEARANCE) * scale);
      const prepare = canvas => {
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        const ctx = canvas.getContext('2d', {willReadFrequently: true});
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(-left, -top);
        return ctx;
      };
      const pixels = (canvas, draw) => {
        const ctx = prepare(canvas);
        try { draw(ctx); } finally { ctx.restore(); }
        return ctx.getImageData(0, 0, width, height).data;
      };
      actorCanvas ||= makeCanvas(); objectCanvas ||= makeCanvas();
      body ||= pixels(actorCanvas, drawActor);
      const object = pixels(objectCanvas, drawObject);
      for (let i = 3; i < body.length; i += 4) {
        if (body[i] > 64 && object[i] > 64) return true;
      }
      return false;
    };
  };
}
