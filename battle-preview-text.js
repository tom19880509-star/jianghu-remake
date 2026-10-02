// Copyright 2026 Tom (tom19880509-star)
// SPDX-License-Identifier: Apache-2.0
// Attribution: Jianghu Remake / 江湖重绘, created and directed by Tom.
// Display only. Lua supplies current cost and reachable coverage; this module
// never estimates damage, changes selection, or derives rules from the atlas.
export function battleSkillText(preview, enabled = true) {
  if (!preview) return null;
  const {shape, range, radius, costMin, costMax, maxTargets, weakened, minCost, mp} = preview;
  const area = 2 * radius + 1;
  const scope = shape === 3 ? `射程 ${range} 格 · 群攻 ${area}×${area} 格`
    : shape === 2 ? `十字 · 各向 ${range} 格`
    : shape === 1 ? `直线 ${range} 格` : `射程 ${range} 格 · 单体`;
  // 394：禁用且现有内力不到一级耗内时，写施展门槛与现有内力；封顶后的 costMin 就是现有内力，不能标成「耗内」。
  const short = enabled === false && minCost > 0 && mp < minCost;
  return {
    scope,
    cost: short ? `至少需内力 ${minCost} · 现有 ${mp}`
      : enabled === false && weakened && costMax === 0 ? '内力不足' : `耗内 ${costMin === costMax ? costMin : `${costMin}–${costMax}`}`,
    coverage: maxTargets > 0 ? `当前站位最多覆盖 ${maxTargets} 人` : '当前站位无敌可及',
    warning: enabled !== false && weakened ? '内力不足以全力施展 · 威力下降' : '',
  };
}
