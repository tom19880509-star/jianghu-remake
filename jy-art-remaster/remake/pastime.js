// 156 · 生活技能（琴棋书画酒钓）与垂钓的存档记录。
// 全部为可选字段：旧档没有 pastime，规范化前后逐字节不变。
// 这里只做格式校验，小游戏规则一概留在 pastime-extension.lua，避免两处各写一份。
export const PASTIME_ARTS = ['qin', 'qi', 'shu', 'hua', 'jiu', 'diao'];
export const PASTIME_NAMES = { qin: '琴', qi: '棋', shu: '书', hua: '画', jiu: '酒', diao: '钓' };
// 练得部分的上限。等级还会由资质／声望补足，那部分不入档，随人物属性自然变化。
export const PASTIME_PRACTICE_CAP = 3;
export const PASTIME_LEVEL_CAP = 5;
// 垂钓的三道闸：每次歇宿只有这么多竿、每程卖鱼所得银两封顶、饵料不可囤积。
export const FISH_PER_REST = 3;
export const FISH_SELL_CAP = 500;
export const FISH_BAIT_CAP = 3;
const FISH_FIELDS = { left: FISH_PER_REST, sold: FISH_SELL_CAP, bait: FISH_BAIT_CAP };

export function normalizePastime(raw) {
  if (raw == null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw) || raw.version !== 1) throw Error('生活技能记录格式不兼容。');
  const practice = {};
  const source = raw.practice;
  if (source != null) {
    if (typeof source !== 'object' || Array.isArray(source)) throw Error('生活技能记录格式不兼容。');
    for (const [art, rank] of Object.entries(source)) {
      if (!PASTIME_ARTS.includes(art) || !Number.isInteger(rank) || rank < 0 || rank > PASTIME_PRACTICE_CAP) throw Error('生活技能记录格式不兼容。');
      if (rank) practice[art] = rank;
    }
  }
  const fish = {};
  const caught = raw.fish;
  if (caught != null) {
    if (typeof caught !== 'object' || Array.isArray(caught)) throw Error('垂钓记录格式不兼容。');
    for (const [field, value] of Object.entries(caught)) {
      if (!Object.hasOwn(FISH_FIELDS, field) || !Number.isInteger(value) || value < 0 || value > FISH_FIELDS[field]) throw Error('垂钓记录格式不兼容。');
      // Zero casts means this outing is spent; omitting it makes Lua grant three.
      fish[field] = value;
    }
  }
  return { version: 1, practice, fish };
}

// 等级 = 练得（入档，上限 3）+ 资质／声望折算（不入档，上限 2），合计封顶 5。
// 复用既有属性，不另立一套生活技能的成长曲线。
export const pastimeInnate = (aptitude, renown) =>
  Math.min(2, Math.floor(Math.max(0, aptitude) / 40) + (renown >= 300 ? 1 : 0));
export const pastimeLevel = (practice, aptitude, renown) =>
  Math.min(PASTIME_LEVEL_CAP, Math.min(PASTIME_PRACTICE_CAP, Math.max(0, practice)) + pastimeInnate(aptitude, renown));
