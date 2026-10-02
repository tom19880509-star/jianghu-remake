import { buildLayeredWalk } from "./di-walk.js";

// Use the same four approved standing faces as combat. Only the two lower
// cloth/leg layers move; each wheel stays attached to its original hand.
export function buildJinlunWalk(sheets, frames) {
  const rect = (x, y, right, bottom) => [
    [x, y],
    [right, y],
    [right, bottom],
    [x, bottom],
  ];
  const rows = [
    {
      hip: 266,
      soles: [309, 320],
      split: [
        [177, 266],
        [177, 290],
        [179, 324],
      ],
    },
    {
      hip: 566,
      soles: [625, 619],
      split: [
        [176, 566],
        [176, 594],
        [175, 629],
      ],
    },
    {
      hip: 875,
      soles: [916, 925],
      split: [
        [172, 875],
        [173, 898],
        [177, 929],
      ],
    },
    {
      hip: 1163,
      soles: [1211, 1224],
      split: [
        [177, 1163],
        [176, 1185],
        [173, 1228],
      ],
    },
  ];
  return buildLayeredWalk(
    rows.map((row, direction) => ({
      file: "jinlun-combat-v2.png",
      frameIndex: direction * 4,
      height: frames["jinlun-combat-v2.png"][direction * 4][3],
      drawHeight: 64,
      hips: [row.hip, row.hip],
      soles: row.soles,
      split: row.split,
      undercloth: rect(
        ...[
          [159, 266, 199, 282],
          [155, 566, 195, 590],
          [152, 875, 192, 895],
          [159, 1163, 195, 1188],
        ][direction],
      ),
      limit: 1254,
      timeline: [-1, 0, 1, 0],
      deltas:
        direction === 0 || direction === 3
          ? [
              [4.5, -2.25],
              [-4.5, 2.25],
            ]
          : [
              [4.5, 2.25],
              [-4.5, -2.25],
            ],
    })),
    sheets,
    frames,
  );
}
