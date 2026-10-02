// Effect dispatch is martial-art keyed. Character identity belongs only to pose binding.
// 157：命中格由 combat-vfx.js 分层绘制（闪光、冲击环、按属性的粒子、余韵）；opts 带本格的命中结果与范围格数。
import {paintVfxImpact} from './combat-vfx.js';
import {paintSignatureHit} from './signature-effects.js';
export const isFiveWheelVisual=v=>v?.skill===88&&v.kind===4;
export function paintCombatEffect(g,v,pic,x,y,opts){
  // vfx 394: hand-built cut marks (血刀/火焰刀/六脉/太极剑) in front of the struck fighter, then the shared layer.
  if(opts?.occupied!==false)paintSignatureHit(g,v,pic,x,y,opts);
  if(paintVfxImpact(g,v,pic,x,y,opts))return true;
  if(v?.kind===0&&v.skill===0&&[0,30,36].includes(v.effect))return paintMedicinalDose(g,v,pic,x,y);
  return false;
}
function paintMedicinalDose(ctx, visual, effectPic, x, y) {
  const frame = effectPic - visual.first - 1;
  if (frame < 0 || frame >= visual.count) return false;
  const t = frame / Math.max(1, visual.count - 1);
  const poison = visual.effect === 30;
  const color = poison ? "#908167" : visual.effect === 36 ? "#acbba0" : "#e0cfaa";
  ctx.save();
  ctx.translate(x, y - 25);
  ctx.globalAlpha *= Math.sin(Math.PI * t) * 0.62;
  ctx.fillStyle = color;
  for (let i = 0; i < 9; i++) {
    const a = i * 2.399;
    const radius = 3 + (i % 3) * 2 + t * 5;
    const px = Math.cos(a) * radius;
    const py = Math.sin(a) * radius * 0.55 + (poison ? 4 : -5) * t;
    ctx.fillRect(px, py, i % 3 === 0 ? 2 : 1, 1.4);
  }
  ctx.restore();
  return true;
}

