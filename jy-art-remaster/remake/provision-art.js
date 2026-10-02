// Original illustrations in the game's existing SVG icon vocabulary.
// These are inventory pictures, not additions to the native item/save tables.
export const PROVISIONS={
 0:{shape:'pills',seal:'酒',color:'#947653',text:'一坛封好的醉生梦死酒。是江湖人物偏爱的酒物，具体用途须留意交谈。'},
 2:{shape:'pills',seal:'还魂',color:'#687990',text:'战中急救用的药液，可使本场已倒下的同伴重新起身，并恢复全部气血；不会补充内力。',effects:['仅限战斗中 · 复起同伴','气血恢复至上限']},
 1:{shape:'pills',seal:'气',color:'#927347',text:'小丸收在随身药瓶里，赶路乏力时服用，补足体力。'},
 3:{shape:'pills',seal:'还',color:'#815a42',text:'行旅常备的小还丹，药瓶以麻绳封口，宜在受伤后服用。'},
 4:{shape:'pills',seal:'玉',color:'#5b7770',text:'深色药丸藏在青瓷瓶中，供行走江湖时疗伤之用。'},
 5:{shape:'powder',seal:'玉真',color:'#698073',text:'以油纸包裹的疗伤药散，扎紧封口，免得行囊颠簸时洒落。'},
 10:{shape:'powder',seal:'运功',color:'#927845',text:'纸封的药散，运功调息时服用，补充消耗的内力。'},
 11:{shape:'root',seal:'参',color:'#90704c',text:'药铺常见的干参，根须完整，以细绳扎成一束。此物是普通人参。'},
 12:{shape:'pills',seal:'云',color:'#899483',text:'白云熊胆丸装在素瓷药瓶中，补充内力，方便随身携带。'},
 21:{shape:'pills',seal:'济',color:'#74855b',text:'寻常解毒丸药，备在行囊里，应付江湖中初浅毒伤。'},
 22:{shape:'pills',seal:'连',color:'#ba9450',text:'黄连解毒丸，药瓶系一根黄绳，免与疗伤丸药混淆。'},
 23:{shape:'pills',seal:'心',color:'#657c91',text:'装在蓝灰瓷瓶里的解毒丹丸。中毒深浅不同，所需用量也不同。'},
 401:{shape:'bun',text:'客栈蒸笼里取出的热馒头，粗粮扎实，垫一垫肚子再赶路。'},
 402:{shape:'porridge',text:'一碗温粥，米香清淡，补些气血与体力，不能代替疗伤解毒的药。'},
};
export function provisionIcon(id){
 const p=PROVISIONS[id];if(!p)return null;
 const n=document.createElementNS('http://www.w3.org/2000/svg','svg');n.setAttribute('viewBox','0 0 96 96');n.setAttribute('aria-hidden','true');n.classList.add('gear-icon');
 const ink='#594b39',paper='#e6d4a7';
 const shapes={
 pills:`<path d="M37 17h22v14c0 5 15 9 15 22v23c0 9-52 9-52 0V53c0-13 15-17 15-22z" fill="${p.color}"/><path d="M34 13h28v9H34z" fill="#866341"/><path d="M31 47q16 4 34 0v26q-16 4-34 0z" fill="${paper}"/><path d="M28 53v17M32 37l5-4" stroke="#e4ddc0" stroke-width="3"/><circle cx="75" cy="83" r="5" fill="#694732"/><circle cx="62" cy="85" r="4" fill="#947246"/>`,
 powder:`<path d="M20 32l28-14 29 14-3 47-26 8-29-10z" fill="${paper}"/><path d="M20 32l28 13 29-13M48 45v41M20 52l28 12 27-10" fill="none" stroke="${p.color}" stroke-width="3"/><path d="M27 39h36v19H27z" fill="#e8dfc1"/>`,
 root:'<path d="M48 24q-16 13-12 30l9 10 5-11 8-9 2-16z" fill="#c9a56d"/><path d="M40 59l-9 12-6 13m7-15l-13 5m31-20l3 18 13 13m-11-15l13-4M43 29l-5-13 3-8m11 20l9-16" fill="none" stroke="#9c764b" stroke-width="3"/><path d="M32 44l29-3m-29 7l28-3" stroke="#8b4e37" stroke-width="3"/>',
 bun:'<ellipse cx="48" cy="76" rx="36" ry="10" fill="#9b744c"/><path d="M19 65c-4-21 12-39 29-39 23 0 33 24 29 39-4 18-54 18-58 0z" fill="#efdfb9"/><path d="M34 34q3 5 4 14m10-20v16m11-10l-4 12" fill="none" stroke="#cfb785"/><path d="M38 9q-8 7 0 14m19-17q-8 8 0 14" fill="none" stroke="#b9b69b"/>',
 porridge:'<ellipse cx="48" cy="52" rx="35" ry="15" fill="#e1d7b6"/><path d="M14 53q3 32 34 32t34-32q-35 22-68 0z" fill="#6a8580"/><ellipse cx="48" cy="53" rx="28" ry="10" fill="#ece0b8"/><path d="M32 52l8 2m5-7l7 2m5 7l8-2M23 64q25 13 49 0" fill="none" stroke="#c2b084" stroke-width="2"/><path d="M56 44L81 17" stroke="#8d7048" stroke-width="5"/>',
 };
 n.innerHTML=`<ellipse cx="48" cy="86" rx="32" ry="5" fill="#55442b18"/><g stroke="${ink}" stroke-width="1.4" stroke-linejoin="round">${shapes[p.shape]}</g>${p.seal?`<text x="48" y="${p.shape==='powder'?53:66}" text-anchor="middle" fill="#634831" font-family="serif" font-size="${p.seal.length>1?12:20}">${p.seal}</text>`:''}`;return n;
}
