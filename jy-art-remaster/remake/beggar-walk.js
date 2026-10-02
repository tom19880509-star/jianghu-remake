import { buildLayeredWalk } from "./di-walk.js";

export const isBeggarFighter = (pid) => Number.isInteger(pid) && pid >= 271 && pid <= 280;

// Keep both gripping hands and the whole staff above the animated leg cut.
// Four independent facings; alternate soles without mirroring the character.
export function buildBeggarWalk(sheets, frames) {
  const splits = [198, 580, 968, 1323];
  const soles = [
    [438, 442],
    [452, 443],
    [452, 441],
    [442, 452],
  ];
  return buildLayeredWalk(
    splits.map((split, d) => ({
      file: "beggar-motion-v1.png",
      frameIndex: d,
      height: frames["beggar-motion-v1.png"][d][3],
      drawHeight: 54,
      hips: [340, 340],
      soles: soles[d],
      limit: 1536,
      split: [
        [split, 340],
        [split, 400],
        [split, 512],
      ],
      timeline: [0, 0.146, 0.5, 0.854, 1, 0.854, 0.5, 0.146],
      centered: true,
      lifts: [
        [0, 0.5, 1, 0.5, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0.5, 1, 0.5],
      ],
      deltas:
        d === 0 || d === 3
          ? [
              [4, -2],
              [-4, 2],
            ]
          : [
              [4, 2],
              [-4, -2],
            ],
    })),
    sheets,
    frames,
  );
}
