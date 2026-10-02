// Browsing labels only: do not change native proficiency, power or learning slots.
export const SCHOOL_LABELS={fist:'拳掌',finger:'指爪擒拿',leg:'腿法',sword:'剑法',blade:'刀法',staff:'棍杖',special:'奇门兵器',sound:'音功',hidden:'暗器',internal:'内功',lightness:'轻功',support:'医毒与其他法门'};
const groups={
 finger:['鹰爪功','幻阴指','一阳指','六脉神剑','参合指','大力金刚指','大智无定指','弹指神通','多罗叶指','夺魄指','分筋错骨手','黑风指','九阴白骨爪','绝户虎爪手','兰花拂穴手','龙爪手','拈花指','凝血神爪','去烦恼指','三阴蜈蚣爪','天竺佛指','铁指诀','无相劫指','袖中指','玄天指','一指禅','摘星指'],
 leg:['旋风扫叶腿'],staff:['大轮杖法','叫化棍法','金花杖法','神龙鹿杖','打狗棒法','疯魔杖法','伏魔棍','伏魔杖法','灵蛇杖法','韦陀棍'],
 sound:['持瑶琴','狮子吼','七弦无形剑','阿碧的歌声','清心普善咒','笑傲江湖曲'],
 hidden:['满天花雨','霹雳秘笈','含沙射影','冰魄银针','黑血神针','金蛇锥','七伤摧魂针','生死符','袖箭','玉蜂针','枣核钉'],
 fist:['火焰刀','须弥山神掌']
};
const byName=new Map(Object.entries(groups).flatMap(([k,names])=>names.map(n=>[n,k])));
export function martialSchool(entry){return byName.get(entry.name)||entry.kind;}
