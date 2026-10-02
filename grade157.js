// Copyright 2026 Tom (tom19880509-star)
// SPDX-License-Identifier: Apache-2.0
// Attribution: Jianghu Remake / 江湖重绘, created and directed by Tom.
// 品第与朱批 157 · 纯显示层（editorial/品第与朱批157.md 一、七节）。
// 颜色只读 grade 与 mark 两个字段；威力档从不参与，也不从本文件推回去。
// 不进存档、不碰底表、不影响任何战斗数值。这里不 import JSON：图鉴页不经打包直接加载本文件。
export const GRADE_KEYS = Object.freeze(['juexue', 'shangcheng', 'mingjia', 'xunchang', 'pending']);
const NAMES = {
  martial: {juexue: '绝学', shangcheng: '上乘', mingjia: '名家', xunchang: '寻常'},
  item: {juexue: '神兵', shangcheng: '名器', mingjia: '精制', xunchang: '寻常'},
  medicine: {juexue: '奇药', shangcheng: '名药', mingjia: '良药', xunchang: '寻常'},
  treasure: {juexue: '奇珍', shangcheng: '珍物', mingjia: '精制', xunchang: '寻常'},
};
export const COST_SOURCES = Object.freeze({novel: '原著', work: '本作', both: '原著·本作'});
const NONE = Object.freeze({tone: '', label: '', note: '', mark: '', quest: '', costs: Object.freeze([])});

// info：图鉴条目或 item-grade-data 的一行。seen：此处是否算「见过」（七·三）。
// 未见、待核一律同一种灰，且不出朱批与档名——玩家看不出两者区别。
export function gradeView(info, {seen = false, axis = 'martial'} = {}) {
  if (!info || (info.grade === undefined && info.mark === undefined)) return NONE; // 表外之物：不上色也不变灰
  if (!seen) return {...NONE, tone: 'unseen'};
  const quest = info.quest ? '剧情要物' : '';
  if (info.mark === 'tianshu') return {...NONE, tone: 'tianshu', mark: '天书', quest};
  const label = (NAMES[axis] || NAMES.martial)[info.grade];
  if (!label) return {...NONE, tone: 'unseen', quest};
  const costs = (info.costs || []).filter(c => c && c.status !== 'pending' && String(c.text || '').trim() && COST_SOURCES[c.source])
    .map(c => ({text: c.text, source: COST_SOURCES[c.source]}));
  // gradeNote records editorial uncertainty; it is not player-facing item lore.
  return {tone: info.grade, label, note: '', mark: '', quest, costs};
}

// 行囊类界面的着色范围：战斗技能选单与战中行囊一律不着色（七·二）；商店要逐件判「见过」。
export function collectionGradeMode(model) {
  if (!model || model.kind !== 'item' || model.battle) return 'off';
  return model.shop ? 'shop' : 'owned';
}

// 秘籍（类型2）跟随所传武学，其余查物品表。details 取运行时物品数据，二周目 198/199 因此按周目取值。
export function itemGradeInfo(id, details, table, martialEntry) {
  if (details && details['类型'] === 2) {
    const e = martialEntry?.({bookId: id, skillId: details['练出武功'] >= 0 ? details['练出武功'] : undefined});
    return e ? {info: e, axis: 'martial'} : null;
  }
  const row = table?.items?.[String(id)];
  return row ? {info: row, axis: details?.['类型'] === 3 ? 'medicine' : details?.['类型'] === 0 ? 'treasure' : 'item'} : null;
}

// 图鉴页本身不读存档；「见过」名单只收同源父页发来的这一种消息。
export function readSeen(data) {
  if (!data || data.type !== 'martial-catalog-seen') return null;
  const ids = v => new Set((Array.isArray(v) ? v : []).filter(n => Number.isInteger(n) && n >= 0 && n < 1000));
  return {skills: ids(data.skills), books: ids(data.books)};
}
export function entrySeen(entry, seen) {
  return !!seen && (entry.nativeSkillId != null && seen.skills.has(entry.nativeSkillId) || entry.nativeBookId != null && seen.books.has(entry.nativeBookId));
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const badges = v => [v.label && v.label + (v.note ? `（${v.note}）` : ''), v.mark, v.quest].filter(Boolean);
// —— 字符串版（图鉴页用 innerHTML 模板）——
export const gradeAttrs = v => v.tone ? ` class="grade-name" data-grade="${v.tone}"` : '';
export const gradeBadgeHTML = v => badges(v).map(t => `<span class="grade-badge">${esc(t)}</span>`).join('');
export const gradeCostsHTML = v => v.costs.length ? `<div class="grade-costs" role="note" aria-label="朱批">${v.costs.map(c => `<p class="grade-cost">${esc(c.text)}<small>${esc(c.source)}</small></p>`).join('')}</div>` : '';
// —— DOM 版（行囊、人物页）——
const make = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if (text !== undefined) n.textContent = text; return n; };
export function paintGrade(node, v) {
  if (!node || !v) return node;
  if (v.tone) { node.classList.add('grade-name'); node.dataset.grade = v.tone; }
  return node;
}
export const gradeBadges = v => v ? badges(v).map(t => make('span', 'grade-badge', t)) : [];
export function appendGradeCosts(parent, v) {
  if (!parent || !v?.costs.length) return null;
  const box = make('div', 'grade-costs'); box.setAttribute('role', 'note'); box.setAttribute('aria-label', '朱批');
  for (const c of v.costs) { const p = make('p', 'grade-cost', c.text); p.append(make('small', '', c.source)); box.append(p); }
  parent.append(box); return box;
}
