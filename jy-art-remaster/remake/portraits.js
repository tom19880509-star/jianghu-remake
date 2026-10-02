import { characterRaster, reducedSource } from './character-atlas.js';
// Display windows into approved concept sheets; original bitmap files stay unchanged.
// No horizontal reflection: asymmetric costume and Yang Guo's right-arm loss remain intact.
export const PORTRAITS = {
  // Display-only identity, never a JY.Person record or an original shared elder head.
  12000: ["../remake/assets/wangji-seated-v2-blue.png", [1223, 1286], [290, 12, 550, 687]],
  111: ["../remake/assets/weixiaobao-young-adult-four-directions-v6.png", [1254, 1254], [280, 18, 180, 225]],
  11: ["杨逍-光明左使白衣书生-v1.png", [1536, 1024], [375, 140, 230, 288]],
  93: ["../remake/assets/beggar-scene-v1.png", [1536, 1024], [132, 87, 136, 170]],
  50: ["乔峰-丐帮帮主-双姿态-v1.png", [1536, 1024], [225, 65, 400, 500]],
  51: ["慕容复-出剑姿态清空腰鞘-v3.png", [1694, 928], [430, 135, 250, 320]],
  54: ["袁承志-海外隐居-双姿态-v1.png", [1536, 1024], [280, 35, 320, 400]],
  41: ["../remake/assets/xiake-envoy-portraits-v1.png", [1536, 1024], [235, 32, 370, 462]],
  42: ["../remake/assets/xiake-envoy-portraits-v1.png", [1536, 1024], [980, 28, 370, 462]],
  35: ["../remake/assets/linghu-portrait-background-v1.png", [1536, 1024], [180, 180, 167, 209]],
  38: ["../remake/assets/shi-potian-portraits-v1.png", [1536, 1024], [890, 85, 565, 706]],
  112: ["../remake/assets/huo-qingtong-npc-v1.png", [1536, 1024], [285, 70, 560, 700]],
  66: ["../remake/assets/yinggu-portrait-v1.png", [1254, 1254], [125, 0, 1003, 1254]],
  71: ["../remake/assets/hongantong-portrait-v1.png", [1114, 1411], [0, 0, 1114, 1392]],
  67: ["../remake/assets/qiuqianren-portrait-v2.png", [1120, 1404], [0, 0, 1120, 1400]],
  39: ["../remake/assets/long-island-master-portrait-v1.png", [1120, 1404], [0, 0, 1120, 1400]],
  40: ["../remake/assets/mu-island-master-portrait-v1.png", [1120, 1404], [0, 0, 1120, 1400]],
  43: ["../remake/assets/baiwanjian-portrait-v1.png", [1122, 1402], [0, 0, 1122, 1402]],
  44: ["../remake/assets/yue-laosan-portrait-v1.png", [1122, 1402], [0, 0, 1122, 1402]],
  15: ["../remake/assets/jinhua-popo-portrait-v2.png", [1122, 1402], [0, 0, 1122, 1402]],
  61: ["../remake/assets/ouyangke-portrait-v1.png", [1122, 1402], [0, 0, 1122, 1402]],
  70: ["../remake/assets/xuanci-portrait-v1.png", [1122, 1402], [0, 0, 1122, 1402]],
  68: ["../remake/assets/qiuchuji-portrait-v1.png", [1122, 1402], [0, 0, 1122, 1402]],
  20: ["../remake/assets/moda-portrait-v1.png", [1122, 1402], [0, 0, 1122, 1402]],
  52: ["../remake/assets/suxinghe-portrait-v1.png", [1122, 1402], [0, 0, 1122, 1402]],
  25: ["../remake/assets/lanfenghuang-portrait-v1.png", [1199, 1312], [0, 0, 1199, 1312]],
  7: ["../remake/assets/hetaichong-portrait-v1.png", [1145, 1374], [0, 0, 1145, 1374]],
  28: ["../remake/assets/pingyizhi-portrait-v1.png", [1089, 1445], [0, 0, 1089, 1445]],
  45: ["../remake/assets/xuemuhua-portrait-v1.png", [1036, 1518], [0, 0, 1036, 1518]],
  16: ["../remake/assets/huqingniu-portrait-v1.png", [1036, 1518], [0, 0, 1036, 1518]],
  17: ["../remake/assets/wangnangu-butterfly-portrait-v2-transparent.png", [1223, 1286], [0, 0, 1223, 1286]],
  76: ["王语嫣-燕子坞藕色纱衫-双姿态-v1.png", [1536, 1024], [268, 30, 360, 450]],
  21: ["../remake/assets/dingxian-hengshan-portrait-v1-transparent.png", [1223, 1286], [0, 0, 1223, 1286]],
  23: ["../remake/assets/tianmen-portrait-v2.png", [1145, 1374], [0, 0, 1145, 1374]],
  31: ["../remake/assets/danqingsheng-mei-manor-portrait-v1-transparent.png", [1122, 1402], [0, 0, 1122, 1402]],
  32: ["../remake/assets/tubiweng-sourcecorrected-portrait32-64x64.png", [64, 64], [0, 0, 64, 64]],
  33: ["../remake/assets/heibaizi-mei-manor-portrait-v3-64x64.png", [64, 64], [0, 0, 64, 64]],
  34: ["../remake/assets/huangzhonggong-mei-manor-portrait-v1-transparent.png", [1274, 1234], [0, 0, 1274, 1234]],
  8: ["../remake/assets/tangwenliang-kongtong-portrait-v1-transparent.png", [1199, 1312], [0, 0, 1199, 1312]],
  10: ["../remake/assets/fanyao-guangming-portrait-v2-transparent.png", [1312, 1199], [0, 0, 1312, 1199]],
  73: ["../remake/assets/nanxian-scholar-scene-v2-purple.png", [1024, 1536], [270, 8, 500, 625]],
  74: ["../remake/assets/beichou-northern-hermit-portrait-v2-transparent.png", [1216, 1294], [0, 0, 1216, 1294]],
  72: ["../remake/assets/kongbala-pili-hall-portrait-v1.png", [1254, 1254], [0, 0, 1254, 1254]],
  62: ["金轮法王-原著凹顶-头像-v1.png", [1122, 1402], [0, 0, 1122, 1402]],
  104: ["../remake/assets/condor-npc-v1.png", [1536, 1024], [90, 5, 260, 325]],
  98: ["../remake/assets/cave-serpent-v1.png", [1536, 1024], [55, 246, 176, 220]],
  64: ["周伯通-百花谷须发半黑-双姿态-v2.png", [1536, 1024], [300, 35, 280, 350]],
  99: ["大雪怪-雪洞守卫-头像-v1.png", [1122, 1402], [0, 0, 1122, 1402]],
  5: ["张三丰-武当传艺-双姿态-v1.png", [1536, 1024], [300, 30, 295, 369]],
  37: ["狄云-获救后右手缺指-双姿态-v1.png", [1536, 1024], [275, 45, 255, 319]],
  9: ["张无忌-昆仑初遇-双姿态-v1.png", [1536, 1024], [295, 45, 275, 344]],
  13: ["谢逊-冰火岛盲目持屠龙-双姿态-v1.png", [1672, 941], [380, 60, 335, 419]],
  24: ["余沧海-青城掌门-双姿态-v1.png", [1536, 1024], [215, 80, 570, 712]],
  // This is source head 86 shared by Qingcheng people 211..220, not person 86.
  86: ["青城弟子-绿褐衣装-双姿态-v1.png", [1536, 1024], [240, 75, 450, 562]],
  29: ["田伯光-华服快刀-画像底色-v2.png", [1536, 1024], [90, 160, 300, 375]],
  36: ["林平之-清除多余牢具-v2.png", [1536, 1024], [275, 85, 300, 375]],
  2: ["程灵素-清瘦稀发修正-双姿态-v5.png", [1586, 992], [360, 78, 300, 375]],
  3: ["苗人凤-中毒与治愈-双时期-v1.png", [1672, 941], [430, 70, 300, 375]],
  4: ["阎基-黑帽蓝衣-双姿态-v1.png", [1536, 1024], [325, 70, 325, 406]],
  1: ["胡斐-寻谱青年-双姿态-v1.png", [1731, 909], [280, 75, 355, 444]],
  53: ["段誉-大理出游-双姿态-v1.png", [1536, 1024], [275, 90, 400, 500]],
  55: ["郭靖-成年大侠-双姿态-v2.png", [1536, 1024], [185, 20, 425, 531]],
  56: ["黄蓉-成年帮主-双姿态-v2.png", [1536, 1024], [250, 35, 385, 481]],
  58: ["杨过-玄铁重剑校正版-双姿态-v4.png", [1536, 1024], [220, 15, 430, 538]],
  59: ["小龙女-绝情谷重逢-双姿态-v1.png", [1536, 1024], [220, 30, 420, 525]],
};
const directPortraitHeads = new Set([51,73,111,12000]);
const canvasPortraits = new Map();
const keyedPortraitBackgrounds = new Map();
const canvasPortraitLoads = new Map();
function portraitEntry(head, appearance) {
  const p = PORTRAITS[head];
  if ((head === 41 || head === 42) && appearance === "island")
    return [p[0], p[1], [p[2][0], p[2][1] + 505, p[2][2], p[2][3]]];
  if (head === 38 && appearance === "ill") return [p[0], p[1], [180, 85, 565, 706]];
  // Both states are windows into the approved sheet, never mirrored.
  return head === 3 && appearance === "cured" ? [p[0], p[1], [1110, 70, 300, 375]] : p;
}
export async function loadCanvasPortraits(heads = [0, ...Object.keys(PORTRAITS).map(Number)]) {
  await Promise.all(
    heads.filter(head => head === 0 || PORTRAITS[head]).map((head) => {
      if (canvasPortraitLoads.has(head)) return canvasPortraitLoads.get(head);
      const loading = (async () => {
      const im = new Image();
      im.src =
        head === 0 ? "assets/xiaoxiami-portrait-v2.png" : "../characters/" + PORTRAITS[head][0];
      await im.decode();
      if (head === 93) {
        // Render the sprite-sheet portrait onto the same warm paper as other
        // portraits. Chroma removal is display-only; the PNG stays untouched.
        const canvas = document.createElement("canvas");
        canvas.width = im.width;
        canvas.height = im.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(im, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const r = pixels.data[i],
            g = pixels.data[i + 1],
            b = pixels.data[i + 2];
          if (r - g > 18 && b - g > 18) {
            pixels.data[i] = 231;
            pixels.data[i + 1] = 222;
            pixels.data[i + 2] = 202;
            pixels.data[i + 3] = 255;
          }
        }
        ctx.putImageData(pixels, 0, 0);
        canvasPortraits.set(head, canvas);
        keyedPortraitBackgrounds.set(head, canvas.toDataURL());
        return;
      }
      canvasPortraits.set(head, im);
      })().catch(() => null);
      canvasPortraitLoads.set(head, loading);
      return loading;
    }),
  );
}
// clarity 394: painted heads are drawn smoothed (big originals via one cached 2x copy);
// the canvas default is nearest. 64x64 pixel-art sources keep the context's setting.
function drawPainted(ctx, src, sx, sy, sw, sh, x, y, width, height) {
  if ((src.naturalWidth || src.width) <= 128) return ctx.drawImage(src, sx, sy, sw, sh, x, y, width, height);
  const r = reducedSource(src, sx, sy, sw, sh, width / sw), on = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(r || src, r ? 0 : sx, r ? 0 : sy, r ? r.width : sw, r ? r.height : sh, x, y, width, height);
  ctx.imageSmoothingEnabled = on;
}
export function drawCanvasPortrait(ctx, head, x, y, width, height, appearance) {
  const cached=directPortraitHeads.has(head)?null:characterRaster('portrait:'+head+(appearance?':'+appearance:''))||characterRaster('portrait:'+head);
  if(cached){const [sx,sy,sw,sh]=cached.frame;drawPainted(ctx,cached.canvas,sx,sy,sw,sh,x,y,width,height);return true;}
  const im = canvasPortraits.get(head);
  if (!im) void loadCanvasPortraits([head]);
  if (!im) return false;
  let [sx, sy, sw, sh] =
    head === 0 ? [0, 0, im.width, im.height] : portraitEntry(head, appearance)[2];
  const ratio = width / height;
  if (sw / sh > ratio) {
    const wanted = sh * ratio;
    sx += (sw - wanted) / 2;
    sw = wanted;
  } else sh = sw / ratio;
  drawPainted(ctx, im, sx, sy, sw, sh, x, y, width, height);
  return true;
}
export function paintPortrait(element, head, appearance) {
  element.classList.remove("painted-portrait", "pixel-portrait");
  const cached=directPortraitHeads.has(head)?null:characterRaster('portrait:'+head+(appearance?':'+appearance:''))||characterRaster('portrait:'+head);
  if(cached){const [x,y,w,h]=cached.frame,im=cached.canvas;element.classList.add('painted-portrait');element.style.backgroundImage=`url('${im.src}')`;element.style.backgroundSize=`${im.width/w*100}% ${im.height/h*100}%`;element.style.backgroundPosition=`${x/(im.width-w)*100}% ${y/(im.height-h)*100}%`;return;}
  const p = portraitEntry(head, appearance);
  if (!p) return;
  const [file, [width, height], [x, y, w, h]] = p;
  element.classList.add("painted-portrait");
  // clarity 394: 64x64 source-style portraits (32, 33) are pixel art; they keep nearest scaling.
  if (width <= 128) element.classList.add("pixel-portrait");
  element.style.backgroundImage = keyedPortraitBackgrounds.has(head)
    ? `url('${keyedPortraitBackgrounds.get(head)}')`
    : `url('../characters/${file}')`;
  element.style.backgroundSize = `${(width / w) * 100}% auto`;
  element.style.backgroundPosition = `${width === w ? 50 : (x / (width - w)) * 100}% ${height === h ? 50 : (y / (height - h)) * 100}%`;
}
