// Copyright 2026 Tom (tom19880509-star)
// SPDX-License-Identifier: Apache-2.0
// Attribution: Jianghu Remake / 江湖重绘, created and directed by Tom.
import {isEquipmentItem} from './starter-equipment.js';

// Optional journey metadata: native person records retain their single weapon
// field and unchanged byte layout. The offhand never adds a second item bonus.
export function normalizeOffhand(raw={}) {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('副手装备记录不完整。');
 const out={};
 for(const [key,id] of Object.entries(raw)){
  const pid=Number(key);
  if(!Number.isInteger(pid)||pid<0||pid>=320||String(pid)!==key||!isEquipmentItem(id)||[106,117].includes(id))throw Error('副手装备记录不完整。');
  out[key]=id;
 }
 return out;
}
