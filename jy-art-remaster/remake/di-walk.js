// Di Yun's generated strips repeat one leading leg. Animate the two leg layers
// from one approved facing instead; the upper body, injured hand and blade never flip.
const specs = [
  {
    file: "di-step-ne-v1.png",
    height: 538,
    hips: [390, 390],
    soles: [580, 548],
    deltas: [
      [9, -4.5],
      [-9, 4.5],
    ],
    split: [
      [319, 390],
      [313, 450],
      [320, 490],
      [340, 627],
    ],
    weapon: [
      [421, 356],
      [434, 371],
      [490, 408],
      [571, 440],
      [557, 445],
      [484, 421],
      [426, 386],
      [410, 377],
    ],
  },
  {
    file: "di-step-se-v1.png",
    height: 577,
    hips: [390, 390],
    soles: [558, 599],
    deltas: [
      [9, 4.5],
      [-9, -4.5],
    ],
    split: [
      [300, 390],
      [293, 453],
      [316, 501],
      [338, 627],
    ],
    weapon: [
      [204, 366],
      [216, 375],
      [284, 440],
      [371, 502],
      [435, 530],
      [426, 533],
      [368, 519],
      [290, 468],
      [205, 389],
      [199, 379],
    ],
  },
  {
    file: "di-step-nw-v2.png",
    height: 544,
    hips: [390, 390],
    soles: [571, 590],
    deltas: [
      [9, 4.5],
      [-9, -4.5],
    ],
    split: [
      [292, 390],
      [291, 450],
      [286, 500],
      [289, 627],
    ],
    weapon: [
      [420, 355],
      [438, 369],
      [520, 427],
      [625, 486],
      [610, 489],
      [512, 446],
      [430, 387],
      [416, 378],
    ],
  },
  {
    file: "di-step-sw-v1.png",
    height: 555,
    hips: [390, 390],
    soles: [591, 548],
    deltas: [
      [9, -4.5],
      [-9, 4.5],
    ],
    split: [
      [355, 390],
      [362, 440],
      [350, 491],
      [350, 627],
    ],
    weapon: [
      [216, 347],
      [225, 365],
      [184, 424],
      [125, 481],
      [49, 528],
      [44, 520],
      [108, 457],
      [164, 394],
      [202, 350],
    ],
  },
];
function surface(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function polygon(g, points, sx, sy) {
  g.beginPath();
  points.forEach(([x, y], i) => (i ? g.lineTo(x - sx, y - sy) : g.moveTo(x - sx, y - sy)));
  g.closePath();
}
export function buildDiWalk(sheets, frames) {
  return buildLayeredWalk(specs, sheets, frames);
}
export function buildLayeredWalk(specs, sheets, frames) {
  return specs.map((spec, direction) => {
    const [sx, sy, w, h, ax, ay] = frames[spec.file][spec.frameIndex ?? 0],
      s = (spec.drawHeight ?? 52) / spec.height,
      top = spec.hips[0],
      limit = spec.limit ?? 627,
      weapons = spec.weapon ? [spec.weapon] : [];
    const armSpecs = spec.arms ?? [];
    // Cover the entire lower silhouette so no old ankle fragment remains fixed.
    spec.legs = [
      [[0, top], ...spec.split, [0, limit]],
      [[limit, top], [limit, limit], ...spec.split.slice().reverse()],
    ];
    const base = surface(w, h),
      bg = base.getContext("2d");
    bg.drawImage(sheets.get(spec.file), sx, sy, w, h, 0, 0, w, h);
    const legs = spec.legs.map((shape, index) => {
      const c = surface(w, h),
        g = c.getContext("2d");
      polygon(g, shape, sx, sy);
      g.clip();
      g.drawImage(base, 0, 0);
      g.globalCompositeOperation = "destination-out";
      if (index) {
        polygon(g, spec.legs[0], sx, sy);
        g.fill();
      }
      for (const weapon of [...weapons, ...armSpecs.map((a) => a.shape)]) {
        polygon(g, weapon, sx, sy);
        g.fill();
      }
      return c;
    });
    const body = surface(w, h),
      g = body.getContext("2d");
    g.drawImage(base, 0, 0);
    g.globalCompositeOperation = "destination-out";
    for (const shape of spec.legs) {
      polygon(g, shape, sx, sy);
      g.fill();
    }
    const arms = armSpecs.map((arm) => {
      polygon(g, arm.shape, sx, sy);
      g.fill();
      const c = surface(w, h),
        a = c.getContext("2d");
      polygon(a, arm.shape, sx, sy);
      a.clip();
      a.drawImage(base, 0, 0);
      return c;
    });
    for (const weapon of weapons) {
      g.globalCompositeOperation = "source-over";
      g.save();
      polygon(g, weapon, sx, sy);
      g.clip();
      g.drawImage(base, 0, 0);
      g.restore();
    }
    const undercloth = spec.undercloth ? surface(w, h) : null;
    if (undercloth) {
      const g = undercloth.getContext("2d");
      polygon(g, spec.undercloth, sx, sy);
      g.clip();
      g.drawImage(base, 0, 0);
    }
    return (spec.timeline ?? [0, 0.5, 1, 0.5]).map((t, phase) => {
      const resolution = 4,
        marginX = 12,
        marginY = 9,
        c = surface(
          Math.ceil((w * s + 2 * marginX) * resolution),
          Math.ceil((h * s + 2 * marginY) * resolution),
        ),
        g = c.getContext("2d");
      g.scale(resolution, resolution);
      g.translate(marginX, marginY);
      g.scale(s, s);
      // A robe has cloth between the moving legs. Retain its central fold
      // behind them without retaining an unmoving ankle or shoe.
      if (undercloth) g.drawImage(undercloth, 0, 0);
      const swing = [0, 0, 1, 1][direction];
      const shifts = spec.deltas.map(([dx, dy], i) => [
        (dx * (spec.centered ? t - 0.5 : t)) / s,
        (dy * (spec.centered ? t - 0.5 : t) -
          (spec.lifts
            ? spec.lifts[i][phase]
            : (phase === 1 && i === swing) || (phase === 3 && i !== swing)
              ? 2
              : 0)) /
          s,
      ]);
      const order = [0, 1].sort(
        (a, b) => spec.soles[a] + shifts[a][1] - spec.soles[b] - shifts[b][1],
      );
      for (const i of order) {
        const hip = spec.hips[i] - sy,
          length = spec.soles[i] - spec.hips[i],
          dx = shifts[i][0],
          dy = shifts[i][1];
        g.save();
        g.transform(1, 0, dx / length, 1 + dy / length, (-dx * hip) / length, (-dy * hip) / length);
        g.drawImage(legs[i], 0, 0);
        g.restore();
      }
      g.drawImage(body, 0, 0);
      arms.forEach((arm, i) => {
        const a = armSpecs[i],
          px = a.pivot[0] - sx,
          py = a.pivot[1] - sy;
        g.save();
        g.translate(px, py);
        g.rotate(((t * 2 - 1) * a.swing * Math.PI) / 180);
        g.translate(-px, -py);
        g.drawImage(arm, 0, 0);
        g.restore();
      });
      return {
        canvas: c,
        frame: [
          0,
          0,
          c.width,
          c.height,
          resolution * (ax * s + marginX),
          resolution * (ay * s + marginY),
        ],
        scale: 1 / resolution,
      };
    });
  });
}
