// Match complete original furniture footprints. Missing or altered parts keep
// the original tiles, so story-controlled scene changes remain visible.
import interior from "./furniture-interior.json" with { type: "json" };
const groups = new Map([
  [
    1235,
    {
      index: 0,
      parts: [
        [1237, 0, -2],
        [1236, 0, -1],
        [1235, 0, 0],
      ],
      bounds: [73, 70, 18, 70],
    },
  ],
  [
    1242,
    {
      index: 1,
      parts: [
        [1239, -1, -1],
        [1240, 0, -1],
        [1241, -1, 0],
        [1242, 0, 0],
      ],
      bounds: [56, 49, 31, 51],
    },
  ],
  [
    1231,
    {
      index: 2,
      parts: [
        [1229, -1, -1],
        [1230, 0, -1],
        [1232, -1, 0],
        [1231, 0, 0],
      ],
      bounds: [62, 47, 31, 53],
    },
  ],
  [
    1343,
    {
      index: 3,
      parts: [
        [1344, 0, -1],
        [1342, -1, 0],
        [1343, 0, 0],
      ],
      bounds: [56, 48, 27, 52],
    },
  ],
]);
const singles = new Map([
  [1223, [4, 28, 64, 11, 67]],
  [1250, [5, 32, 36, 15, 38]],
  [1337, [5, 34, 37, 16, 39]],
  [1277, [6, 32, 47, 13, 51]],
  [1247, [7, 33, 34, 16, 41]],
  [1251, [8, 26, 27, 13, 30]],
  [1338, [8, 28, 28, 14, 31]],
]);
export const furnitureShapes = new Map([
  ...groups,
  ...[...singles].map(([id, value]) => [
    id,
    { index: value[0], bounds: value.slice(1), parts: [[id, 0, 0]] },
  ]),
  ...interior,
]);
// Use the source scene's diagonal depth order for tea sets and seated actors.
for (const group of furnitureShapes.values()) {
  group.file ??= "furniture-home-v1.png";
  group.occluder ??= [0, 4, 6].includes(group.index);
  group.parts.sort((a, b) => a[1] + a[2] - b[1] - b[2] || a[1] - b[1]);
}
export function planFurniture(scene, cells, read, layer = 1) {
  const plan = new Map();
  if (scene < 0 || scene >= 84) return plan;
  for (const { x, y } of cells) {
    const id = read(x, y, layer) / 2;
    const group = furnitureShapes.get(id);
    if (!group || (group.layer ?? 1) !== layer || (group.scenes && !group.scenes.includes(scene)))
      continue;
    const heightLayer = layer === 2 ? 5 : 4,
      z = read(x, y, heightLayer);
    if (
      !group.parts.every(([part, dx, dy, dz = 0]) => {
        const px = x + dx,
          py = y + dy;
        return (
          px >= 0 &&
          px < 64 &&
          py >= 0 &&
          py < 64 &&
          read(px, py, layer) === part * 2 &&
          read(px, py, heightLayer) === z + dz
        );
      })
    )
      continue;
    for (let part = 0; part < group.parts.length; part++) {
      const [, dx, dy] = group.parts[part];
      plan.set((y + dy) * 64 + x + dx, {
        shape: id,
        part,
        index: group.index,
        file: group.file,
        occluder: group.occluder,
        bounds: group.bounds,
        parts: group.parts,
        leader: dx === 0 && dy === 0,
      });
    }
  }
  return plan;
}

// A room's furniture does not change as the camera pans. Include the entire
// map so a visible part still finds its leader just outside the viewport.
// Keep only the current room; SetS scenery edits and LoadSMap invalidate it.
export function createFurniturePlanner() {
  const cells = Array.from({ length: 64 * 64 }, (_, i) => ({ x: i % 64, y: i >> 6 }));
  cells.sort((a, b) => a.x + a.y - b.x - b.y || a.x - b.x);
  let cached;
  return (scene, revision, read) => {
    if (!cached || cached.scene !== scene || cached.revision !== revision) {
      cached = {
        scene, revision,
        solid: planFurniture(scene, cells, read),
        decoration: planFurniture(scene, cells, read, 2),
      };
    }
    return cached;
  };
}
