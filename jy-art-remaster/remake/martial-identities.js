// Source-bound identities for the future combined learning limit.
// Owned manuals do not constitute learned arts; existing saves are not migrated here.
export const FAMILY_SWORD_ID = 93;
export const MAX_MARTIAL_SKILL_ID = FAMILY_SWORD_ID;
// The early family form has the original basic sword's combat parameters.
// Its identity is distinct from both Di Yun's art and the complete Bixie art.
export function installNativeMartialArts(skills) {
  skills[FAMILY_SWORD_ID] = {...skills[31], '代号': FAMILY_SWORD_ID, '名称': '家传辟邪剑法'};
  return skills[FAMILY_SWORD_ID];
}
export const MARTIAL_BOOKS = Object.freeze({
  "39": {
    "bookId": 39,
    "name": "紫霞秘笈",
    "identity": "book:39",
    "kind": "internal",
    "counts": true
  },
  "40": {
    "bookId": 40,
    "name": "小無相功",
    "identity": "book:40",
    "kind": "internal",
    "counts": true
  },
  "41": {
    "bookId": 41,
    "name": "十八泥偶",
    "identity": "book:41",
    "kind": "internal",
    "counts": true
  },
  "42": {
    "bookId": 42,
    "name": "神照經",
    "identity": "book:42",
    "kind": "internal",
    "counts": true
  },
  "43": {
    "bookId": 43,
    "name": "易筋經",
    "identity": "book:43",
    "kind": "internal",
    "counts": true
  },
  "44": {
    "bookId": 44,
    "name": "洗髓經",
    "identity": "book:44",
    "kind": "internal",
    "counts": true
  },
  "45": {
    "bookId": 45,
    "name": "梯云縱心法",
    "identity": "book:45",
    "kind": "lightness",
    "counts": true
  },
  "46": {
    "bookId": 46,
    "name": "神行百變",
    "identity": "book:46",
    "kind": "lightness",
    "counts": true
  },
  "47": {
    "bookId": 47,
    "name": "凌波微步",
    "identity": "book:47",
    "kind": "lightness",
    "counts": true
  },
  "48": {
    "bookId": 48,
    "name": "子午針灸經",
    "identity": null,
    "kind": "craft",
    "counts": false
  },
  "49": {
    "bookId": 49,
    "name": "華陀內昭圖",
    "identity": null,
    "kind": "craft",
    "counts": false
  },
  "50": {
    "bookId": 50,
    "name": "胡青牛醫書",
    "identity": null,
    "kind": "craft",
    "counts": false
  },
  "51": {
    "bookId": 51,
    "name": "五毒秘傳",
    "identity": null,
    "kind": "craft",
    "counts": false
  },
  "52": {
    "bookId": 52,
    "name": "毒經",
    "identity": null,
    "kind": "craft",
    "counts": false
  },
  "53": {
    "bookId": 53,
    "name": "藥王神篇",
    "identity": null,
    "kind": "craft",
    "counts": false
  },
  "54": {
    "bookId": 54,
    "name": "鐵掌拳譜",
    "identity": "skill:11",
    "kind": "attack",
    "counts": true
  },
  "55": {
    "bookId": 55,
    "name": "七傷拳譜",
    "identity": "skill:6",
    "kind": "attack",
    "counts": true
  },
  "56": {
    "bookId": 56,
    "name": "天山六陽掌",
    "identity": "skill:15",
    "kind": "attack",
    "counts": true
  },
  "57": {
    "bookId": 57,
    "name": "玄冥神掌",
    "identity": "skill:16",
    "kind": "attack",
    "counts": true
  },
  "58": {
    "bookId": 58,
    "name": "太極拳經",
    "identity": "skill:20",
    "kind": "attack",
    "counts": true
  },
  "59": {
    "bookId": 59,
    "name": "龍象般若功",
    "identity": "skill:18",
    "kind": "attack",
    "counts": true
  },
  "60": {
    "bookId": 60,
    "name": "太玄經",
    "identity": "skill:23",
    "kind": "attack",
    "counts": true
  },
  "61": {
    "bookId": 61,
    "name": "黯然銷魂掌",
    "identity": "skill:24",
    "kind": "attack",
    "counts": true
  },
  "62": {
    "bookId": 62,
    "name": "降龍十八掌",
    "identity": "skill:25",
    "kind": "attack",
    "counts": true
  },
  "63": {
    "bookId": 63,
    "name": "北冥神功",
    "identity": "skill:29",
    "kind": "attack",
    "counts": true
  },
  "64": {
    "bookId": 64,
    "name": "吸星大法",
    "identity": "skill:28",
    "kind": "attack",
    "counts": true
  },
  "65": {
    "bookId": 65,
    "name": "神木王鼎",
    "identity": "skill:27",
    "kind": "attack",
    "counts": true
  },
  "66": {
    "bookId": 66,
    "name": "六脈神劍譜",
    "identity": "skill:30",
    "kind": "attack",
    "counts": true
  },
  "67": {
    "bookId": 67,
    "name": "松風劍譜",
    "identity": "skill:89",
    "kind": "attack",
    "counts": true
  },
  "68": {
    "bookId": 68,
    "name": "泰山十八盤",
    "identity": "skill:45",
    "kind": "attack",
    "counts": true
  },
  "69": {
    "bookId": 69,
    "name": "回峰落雁劍法",
    "identity": "skill:46",
    "kind": "attack",
    "counts": true
  },
  "70": {
    "bookId": 70,
    "name": "七星劍譜",
    "identity": "skill:53",
    "kind": "attack",
    "counts": true
  },
  "71": {
    "bookId": 71,
    "name": "兩儀劍法",
    "identity": "skill:47",
    "kind": "attack",
    "counts": true
  },
  "72": {
    "bookId": 72,
    "name": "金蛇秘笈",
    "identity": "skill:54",
    "kind": "attack",
    "counts": true
  },
  "73": {
    "bookId": 73,
    "name": "玉女素心劍法",
    "identity": "skill:49",
    "kind": "attack",
    "counts": true
  },
  "74": {
    "bookId": 74,
    "name": "苗家劍法",
    "identity": "skill:55",
    "kind": "attack",
    "counts": true
  },
  "75": {
    "bookId": 75,
    "name": "太極劍法",
    "identity": "skill:58",
    "kind": "attack",
    "counts": true
  },
  "76": {
    "bookId": 76,
    "name": "達摩劍譜",
    "identity": "skill:59",
    "kind": "attack",
    "counts": true
  },
  "77": {
    "bookId": 77,
    "name": "玄鐵劍法",
    "identity": "skill:57",
    "kind": "attack",
    "counts": true
  },
  "78": {
    "bookId": 78,
    "name": "辟邪劍譜",
    "identity": "skill:60",
    "kind": "attack",
    "counts": true
  },
  "79": {
    "bookId": 79,
    "name": "獨孤九劍",
    "identity": "skill:61",
    "kind": "attack",
    "counts": true
  },
  "80": {
    "bookId": 80,
    "name": "血刀經",
    "identity": "skill:63",
    "kind": "attack",
    "counts": true
  },
  "81": {
    "bookId": 81,
    "name": "火焰刀法",
    "identity": "skill:66",
    "kind": "attack",
    "counts": true
  },
  "82": {
    "bookId": 82,
    "name": "反兩儀刀法",
    "identity": "skill:65",
    "kind": "attack",
    "counts": true
  },
  "83": {
    "bookId": 83,
    "name": "狂風刀法",
    "identity": "skill:64",
    "kind": "attack",
    "counts": true
  },
  "84": {
    "bookId": 84,
    "name": "胡家刀法",
    "identity": "skill:67",
    "kind": "attack",
    "counts": true
  },
  "85": {
    "bookId": 85,
    "name": "霹靂刀法",
    "identity": "skill:68",
    "kind": "attack",
    "counts": true
  },
  "86": {
    "bookId": 86,
    "name": "毒龍鞭法",
    "identity": "skill:77",
    "kind": "attack",
    "counts": true
  },
  "87": {
    "bookId": 87,
    "name": "黃沙萬里鞭法",
    "identity": "skill:78",
    "kind": "attack",
    "counts": true
  },
  "88": {
    "bookId": 88,
    "name": "滿天花雨",
    "identity": "book:88",
    "kind": "combat-technique",
    "counts": true
  },
  "89": {
    "bookId": 89,
    "name": "霹靂秘笈",
    "identity": "book:89",
    "kind": "combat-technique",
    "counts": true
  },
  "90": {
    "bookId": 90,
    "name": "含沙射影",
    "identity": "book:90",
    "kind": "combat-technique",
    "counts": true
  },
  "91": {
    "bookId": 91,
    "name": "左右互搏之術",
    "identity": "book:91",
    "kind": "special",
    "counts": true
  },
  "92": {
    "bookId": 92,
    "name": "乾坤大挪移",
    "identity": "book:92",
    "kind": "special",
    "counts": true
  },
  "93": {
    "bookId": 93,
    "name": "葵花寶典",
    "identity": "book:93",
    "kind": "internal",
    "counts": true
  },
  "94": {
    "bookId": 94,
    "name": "九陰真經",
    "identity": "book:94",
    "kind": "special",
    "counts": true
  },
  "95": {
    "bookId": 95,
    "name": "九陽真經",
    "identity": "skill:92",
    "kind": "internal",
    "counts": true
  }
});
export const MARTIAL_CATEGORY_LABELS=Object.freeze({attack:'招式秘籍',internal:'内功心法',lightness:'轻功身法',special:'特殊法门',craft:'医毒典籍','combat-technique':'暗器技法'});
export function martialCategory(bookId){if(bookId===63||bookId===64)return '内功 · 主动吸内';return MARTIAL_CATEGORY_LABELS[MARTIAL_BOOKS[bookId]?.kind]||'';}
// Call only with actual learned records, never the inventory or action-picker rows.
export function learnedMartialIdentities(skills=[],learnedBooks=[]){
 const result=new Set();
 for(const s of skills){
  if(!Number.isInteger(s.id)||s.id<0||s.id>MAX_MARTIAL_SKILL_ID||!Number.isInteger(s.level)||s.level<0||s.level>999)throw Error('已学招式记录不完整');
  if(s.id>0)result.add('skill:'+s.id);
 }
 for(const b of learnedBooks){
  const row=MARTIAL_BOOKS[b.bookId];
  if(!row||!Number.isInteger(b.rank)||b.rank<0||b.rank>10)throw Error('已修法门记录不完整');
  if(b.rank>0&&row.counts)result.add(row.identity);
 }
 return [...result];
}
export function canLearnMartialBook(bookId,skills=[],learnedBooks=[]){
 const row=MARTIAL_BOOKS[bookId];if(!row)throw Error('未知修炼物品');
 const learned=learnedMartialIdentities(skills,learnedBooks);
 return !row.counts||learned.includes(row.identity)||learned.length<10;
}
