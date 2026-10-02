// The five original price signs keep their event IDs and physical map cells.
export const INN_SIGNS = {
  1: { event: 2, talk: 668, name: '河洛客栈', x:15, y:34 },
  3: { event: 13, talk: 663, name: '有间客栈', x:15, y:34 },
  40: { event: 0, talk: 244, name: '悦来客栈', x:16, y:35 },
  60: { event: 11, talk: 504, name: '龙门客栈', x:16, y:35 },
  61: { event: 5, talk: 482, name: '高昇客栈', x:15, y:34 },
};
export const innSign = (scene, event, talk) => {
  const sign = INN_SIGNS[scene];
  return sign?.event === event && sign.talk === talk ? sign : null;
};
// Source signs consist of two physical wall tiles beside the interactive cell.
// Suppress their art only while that same source sign is present; keep S/D intact.
export function originalInnBoardPart(scene,x,y,picture,talk) {
  const s=INN_SIGNS[scene];
  return !!s && s.talk===talk && x===s.x &&
    ((y===s.y-1 && picture===3242) || (y===s.y+1 && picture===3240));
}
export const INN_BOARD_BOUNDS = [62, 110, 31, 96];
export function drawInnBoard(ctx, x, y) {
  ctx.save();ctx.translate(Math.round(x),Math.round(y));
  ctx.transform(1,-.5,0,1,0,0);
  ctx.fillStyle='#3b2c20';ctx.fillRect(-29,-79,5,78);ctx.fillRect(24,-79,5,78);
  ctx.fillStyle='#b58a54';ctx.fillRect(-29,-79,2,77);ctx.fillRect(24,-79,2,77);
  ctx.fillStyle='#271b16';ctx.fillRect(-28,-69,56,65);
  ctx.fillStyle='#81583a';ctx.fillRect(-25,-66,50,59);
  ctx.fillStyle='#543922';
  for(let i=0;i<5;i++)ctx.fillRect(-23+i*10,-65,1,56);
  ctx.fillStyle='#c29657';ctx.fillRect(-27,-69,54,3);ctx.fillRect(-28,-8,56,4);
  ctx.fillStyle='#e9d3a1';ctx.fillRect(-22,-61,44,14);
  ctx.font='bold 11px "Songti SC",serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#442c22';ctx.fillText('江湖告示',0,-54);
  ctx.fillStyle='#f0e0b5';ctx.fillRect(-21,-43,24,30);
  ctx.fillStyle='#d6be87';ctx.fillRect(6,-41,15,20);
  ctx.fillStyle='#95774b';
  for(let i=0;i<5;i++)ctx.fillRect(-17,-37+i*4,15-(i%2)*3,1);
  for(let i=0;i<3;i++)ctx.fillRect(9,-35+i*4,9,1);
  ctx.fillStyle='#a14d3b';ctx.fillRect(-3,-20,4,4);ctx.fillRect(16,-28,3,3);
  ctx.fillStyle='#d2b470';ctx.fillRect(-23,-64,2,2);ctx.fillRect(21,-64,2,2);
  ctx.restore();
}
export async function showInnBoard(dialog, data) {
  const rows=Object.values(data.rows||{});
  while(true) {
    const pick=await dialog(data.name+' · 江湖告示','行客寄语，掌柜代贴。传闻未必尽实，路上还须亲自求证。',[
      ...rows.map((row,i)=>({label:row.title,note:row.tag,value:i+1})),
      {label:'收起告示',value:0},
    ],{menu:true,kicker:'客栈 · 风闻'});
    const row=rows[pick-1];if(!row)return;
    await dialog(row.title,row.text,[{label:'返回告示',value:1}],{menu:true,kicker:row.tag});
  }
}
