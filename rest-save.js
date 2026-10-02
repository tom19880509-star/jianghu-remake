// Copyright 2026 Tom (tom19880509-star)
// SPDX-License-Identifier: Apache-2.0
// Attribution: Jianghu Remake / 江湖重绘, created and directed by Tom.
// The native event supplies its price before it performs the actual payment.
export function lodgingPrompt(question, price, silver) {
  if (!Number.isInteger(price) || price < 0 || !Number.isInteger(silver) || silver < 0) return null;
  const fee=price===0?'家中歇宿免费。':`本次房钱 ${price} 两 · 现有 ${silver} 两。`;
  if (silver<price) return {
    text:`${fee}\n还差 ${price-silver} 两，暂时无法住宿。\n可从江湖图前往已探索的家中，点击卧榻免费休息并保存。`,
    choices:[{label:'暂不住宿',value:0}],
  };
  const body=question.includes('是否住宿')
    ? (price===0?'在家中睡上一觉？睡醒后可选择保存进度。':'在此住上一宿？睡醒后可选择保存进度。')
    : question; // Keep the native warning about poisoned or seriously injured allies.
  return {text:`${fee}\n\n${body}`,choices:[{label:price===0?'歇宿':'付房钱歇宿',value:1},{label:'暂不住宿',value:0}]};
}

// Sleep locations travel with the existing optional journey data, never in R/S/D.
export function normalizeRestLocation(raw) {
  if (!raw || ![1,3,40,60,61,70,83].includes(raw.scene) ||
      !['x','y'].every(k => Number.isInteger(raw[k]) && raw[k]>=1 && raw[k]<=62) ||
      !Number.isInteger(raw.direction) || raw.direction<0 || raw.direction>3)
    throw Error('歇宿位置记录不完整。');
  return {scene:raw.scene,x:raw.x,y:raw.y,direction:raw.direction};
}

export async function chooseRestSave(db, dialog, place, describe) {
  for (;;) {
    let saves;
    try {
      saves = await Promise.all(['1','2','3'].map(slot => new Promise((resolve,reject) => {
        const r=db.transaction('slots').objectStore('slots').get(slot);
        r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
      })));
    } catch {
      // 156 审查：门前这一次既没歇宿也没付房钱，客栈口径的说明会自相矛盾。
      const doorRetry = place==='归梦之门前';
      if (await dialog('存档暂不可读',doorRetry?'石台上的记录一时读不出来。可再试一次；这一次机会还在。':'已经歇息过了。可重试读取存档位，无须再付房钱。',[
        {label:'重试',value:1},{label:'暂不保存',value:0}])===1) continue;
      return 0;
    }
    // describe 由引擎给出与首页「载入进度」同一套文字（地点、周目、等级……），缺席或读不出时退回只报时间。
    const labels=saves.map((s,i)=>`进度${['一','二','三'][i]} · ${s?new Date(s.date).toLocaleString('zh-CN',{hour12:false}):'空位'}`)
      .map((label,i)=>saves[i]&&describe?.(i+1)||label);
    const door=place==='归梦之门前';
    const slot=await dialog(door?'圣堂记录 · 保存进度':'歇宿 · 保存进度',door?'石台已经把这一刻记下。可在决定之前留一份进度，日后读回便回到这扇门前。\n选择暂不保存则保留原来的存档，本程仍可再来一次。':`${place}，一宿已过。请选择存档位，记下此刻的行程。\n读档后会回到这里；选择暂不保存则保留原来的存档。`,[
      ...labels.map((label,i)=>({label,value:i+1})),{label:'暂不保存',value:0}],{menu:true});
    if (![1,2,3].includes(slot)) return 0;
    if (!saves[slot-1] || await dialog('替换这份进度？',`${labels[slot-1]}\n将用${door?'门前这一刻':'本次歇宿后'}的进度替换。`,[
      {label:'返回选择',value:0},{label:'保存到这里',value:1}],{guard:350})===1) return slot;
  }
}

export async function saveRestWithRetry(write, dialog) {
  for (;;) {
    try { await write(); return true; }
    catch {
      if (await dialog('尚未存好','本机暂时未能写入，原存档仍保留。可腾出空间后重试，无须再付房钱；若继续游玩，当前行程尚未保存。',[
        {label:'重试保存',value:1},{label:'暂不保存，继续游玩',value:0}])!==1) return false;
    }
  }
}
