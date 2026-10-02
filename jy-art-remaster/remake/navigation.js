export const DIRECTIONS = [
  [0, -1, 273],
  [1, 0, 275],
  [-1, 0, 276],
  [0, 1, 274],
];

export function stickStep(sequence, index, x, y, pass) {
  const desired = sequence[index % sequence.length];
  // A screen-axis gesture alternates two map axes. Skip its blocked half at a
  // wall; never add a direction the player did not ask for or bypass collision.
  if (sequence.length < 2 || !pass) return desired;
  for (let i = 0; i < sequence.length; i++) {
    const key = sequence[(index + i) % sequence.length],
      [dx, dy] = DIRECTIONS.find(d => d[2] === key);
    if (pass(x + dx, y + dy)) return key;
  }
  return desired;
}
export function pathfind(start, goals, size, pass) {
  const key = (x, y) => y * size + x,
    targets = new Set(goals.map((p) => key(...p))),
    from = new Int32Array(size * size).fill(-1),
    queue = [key(...start)];
  from[queue[0]] = queue[0];
  let found = -1;
  for (let at = 0; at < queue.length; at++) {
    const n = queue[at],
      x = n % size,
      y = Math.floor(n / size);
    if (targets.has(n)) {
      found = n;
      break;
    }
    for (const [dx, dy] of DIRECTIONS) {
      const nx = x + dx,
        ny = y + dy,
        k = key(nx, ny);
      if (nx < 1 || ny < 1 || nx >= size - 1 || ny >= size - 1 || from[k] !== -1 || !pass(nx, ny))
        continue;
      from[k] = n;
      queue.push(k);
    }
  }
  if (found === -1) return null;
  const route = [];
  while (from[found] !== found) {
    const p = from[found],
      x = found % size,
      y = Math.floor(found / size),
      px = p % size,
      py = Math.floor(p / size);
    route.push({ x, y, key: DIRECTIONS.find(([dx, dy]) => dx === x - px && dy === y - py)[2] });
    found = p;
  }
  return route.reverse();
}
export function isWater(n) {
  return [
    [0x166, 0x16a],
    [0x176, 0x17c],
    [0x1ca, 0x1d0],
    [0x1fa, 0x262],
    [0x332, 0x338],
    [0x346, 0x346],
    [0x3a6, 0x3a8],
    [0x3f8, 0x3fe],
    [0x52c, 0x544],
  ].some(([a, b]) => n >= a && n <= b && (n - a) % 2 === 0);
}
