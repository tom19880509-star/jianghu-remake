// 倚天 · 明教一线已知线索（Claude 2026-09-28）。
// 只读 S/D、行囊与队伍，推出玩家「已经听过、已经见过」的线索；界面由 Codex 的公共手札渲染接入，本文件不碰 DOM。
// 不写存档、不加字段、不开地图、不指路；文字转述 dialogue-remaster.json 里实际播放的对白（本链原脚本未被重制替换）。
// 判据出处（原脚本行号）、各阶段实档与夹具见 reviews/claude-yitian-clues-20260928.md。

// 主线严格有序：E77→E76→E79→E90→E81→E82→E89→E61→E91→E65→E67→E109→E108→E105→E115（→E1012 圣堂）。
// 判据写成闭包：后一步成立即蕴含前一步。E932 不碰 11/12/13/72/73/9/83；E65/E67 会抹掉 72/2，E67 每次离开冰火岛都会把 11/94 改回 109。
export function yitianFlags({ dv, sv, inventory = [] }) {
  const has = (id) => inventory.some((x) => x && x.id === id && x.num > 0);
  const post932 = dv(25, 24, 2) !== 933;
  const placed = dv(83, 22, 5) === 4664;                                 // E1012:8 圣堂归位
  const bookD = dv(11, 90, 2) === 117 || dv(11, 101, 2) === 122 || dv(11, 94, 2) === 121;  // E115:35-40 破阵
  const bookWon = placed || has(155) || bookD;                           // 155 唯一来源 E115:60，唯一去处 E1012:7
  const dragon = bookWon || dv(11, 90, 2) === 111 || dv(11, 101, 2) === 116 || dv(11, 94, 2) === 115
    || (dv(73, 0, 0) === 0 && dv(73, 0, 2) === -1);                      // E105:28-34
  const xieBack = dragon || dv(11, 94, 2) === 110;                       // E109:44（E67 重触发会改回 109，只会少显示）
  const xieLeft = xieBack || dv(11, 94, 2) === 109 || dv(72, 2, 1) === -1;  // E67:3 / :2
  const headGiven = xieLeft || dv(72, 3, 4) === 67 || dv(72, 2, 2) === 66;  // E65:18 / :17
  const chengDead = headGiven || dv(9, 1, 1) === 0 || has(191);          // E91:15 / :23
  const tokenUsed = chengDead || dv(72, 2, 3) === 65 || dv(9, 0, 4) === 91;  // E61:22 / :23
  const siege = tokenUsed || dv(11, 85, 2) === 87 || dv(11, 96, 4) === -1;   // E89:8 / E82:154
  const gate = siege || dv(11, 1, 0) === 0 || dv(11, 4, 5) === 5454;     // E81:23 / :25
  const bones = gate || dv(13, 0, 2) === -1 || dv(13, 1, 2) === -1 || sv(11, 29, 47, 1) === 0 || dv(11, 0, 4) === 81;  // E90:9-11,16
  const tunnel = bones || dv(12, 12, 2) === -1 || sv(12, 29, 22, 1) === 0;   // E79:4 / :2（静默，只凭所见）
  const yang = tunnel || dv(12, 0, 2) === -1 || dv(12, 11, 2) === 80 || sv(12, 28, 24, 1) === 0;  // E76:84-87
  const guards = yang || (dv(12, 1, 1) === 0 && dv(12, 1, 2) === -1);   // E77:12
  const longmen = dv(60, 0, 2) === 500;                                  // E501:18 龙门客栈传闻（E89 之后会被改写）
  const xieMet = xieLeft || dv(72, 0, 4) === -1 || dv(72, 1, 4) === -1 || [74, 63, 64, 66].includes(dv(72, 2, 2));  // E59
  return {
    // 本链所有写入（含 instruct_59）都保留这几格的 x/y；不是原版数据就不显示。
    sane: dv(12, 0, 9) === 20 && dv(12, 0, 10) === 32 && dv(13, 0, 9) === 10 && dv(13, 0, 10) === 25
      && dv(11, 94, 9) === 31 && dv(11, 94, 10) === 14 && dv(72, 2, 9) === 15 && dv(72, 2, 10) === 39,
    post932, placed, bookD, bookWon, dragon, xieBack, xieLeft, headGiven, chengDead, tokenUsed, siege, gate,
    bones, tunnel, yang, guards, longmen, xieMet,
  };
}

// talks：本条转述的对白编号，每组任一句听过即可（测试用原脚本实跑核对）；界面不显示。
const row = (key, done, title, text = '', source = '', talks = []) => ({ key, done, title, text, source, talks });

export function deriveYitianClues(ctx) {
  if (!ctx || !ctx.loaded) return [];
  const f = yitianFlags(ctx);
  // 数据不是原版，或武林帖在取书前出现（原版到不了）：整块不显示。
  if (!f.sane || (f.post932 && !f.bookWon)) return [];
  const rows = [];
  // 明教分舵初访。厨子那句（284/285，E80 不写任何状态）无法证明听过，任何阶段都不转述。
  if (f.guards) {
    rows.push(f.yang ? row('fenduo', true, '在明教分舵与光明左使杨逍交过手', '', '杨逍 · 明教分舵', [[260], [265]])
      : row('fenduo', false, '明教分舵', '明教分舵戒备森严，守门的教众把我当成六大派的探子，二话不说便动起手来。', '明教分舵', [[253], [255]]));
  }
  // 成昆：名字与恩怨都在 E76 里亲口说出；藏身之处在 E91 之前不写。
  if (f.yang) {
    if (f.chengDead) rows.push(row('chengkun', true, '成昆作恶多端，已经伏诛', '', '成昆居', [[342]]));
    else {
      let text = '混元霹雳手成昆是谢法王的师父。他自承激得谢逊四处杀人，再让各派查明凶手是明教谢逊，好借六大派之手踏平光明顶；他恨阳顶天夺了他认定的终身伴侣。交手之后，这老贼逃了。';
      const talks = [[270], [271], [274], [276], [283]];
      if (f.siege) { text += '我在光明顶上，当着六大派说破了他从中挑拨的来龙去脉。'; talks.push([308]); }
      if (f.tokenUsed) { text += '谢逊说，成昆一日不死，他一日不回明教。'; talks.push([210]); }
      rows.push(row('chengkun', false, '成昆', text, '成昆 · 明教分舵', talks));
    }
  }
  // 暗道与遗书：E79 静默打开，只写所见；遗骨是谁、羊皮卷是什么，要到 E90 读信之后。
  if (f.tunnel) {
    rows.push(f.bones ? row('didao', true, '暗道尽头：阳顶天夫妇的遗骨与遗书', '', '明教地道', [[336], [337]])
      : row('didao', false, '分舵里的暗道', '在明教分舵里发现一条暗道，不知通往何处。', '明教分舵'));
  }
  // 光明顶之围。
  if (f.yang || f.longmen) {
    if (f.siege) rows.push(row('guangming', true, '光明顶上说破成昆的挑拨，六大派暂且罢手', '', '光明顶', [[308], [311]]));
    else {
      const parts = [], talks = [];
      if (f.longmen && !f.yang) { parts.push('龙门客栈里有人悄声说，六个门派的弟子来到西域，是冲着明教、要围攻光明顶。'); talks.push([2176]); }
      if (f.yang) { parts.push('成昆说六大派此刻想必已攻上光明顶，杨逍赶回援救。六大派围山，正门多半走不通，得另寻一条上山的路。'); talks.push([276], [277], [283]); }
      if (f.gate) { parts.push('到了光明顶下，鹰王等人把我当成六大派的后援，动起手来；六大派已攻上顶去。'); talks.push([288], [291], [293]); }
      rows.push(row('guangming', false, '六大派围攻光明顶', parts.join(''), f.yang ? '杨逍 · 明教分舵' : '龙门客栈', talks));
    }
  }
  // 谢逊：冰火岛上听到的、光明顶上托付的、铁焰令之后的。屠龙刀的秘密、号令天下之说都不写。
  if (f.xieMet || f.siege) {
    if (f.headGiven) rows.push(row('xiexun', true, '谢逊答应回明教，并把屠龙刀送给了我', '', '谢逊 · 冰火岛', [[225], [227]]));
    else {
      const parts = [], talks = [];
      if (f.xieMet) { parts.push('冰火岛上有位自称谢逊的盲眼前辈，把我当成觊觎屠龙刀的贼子。'); talks.push([199]); }
      if (f.tokenUsed) { parts.push('谢逊摸出铁焰令，听我说了光明顶的经过；但成昆一日不死，他一日不回明教。'); talks.push([204], [207], [210]); }
      else if (f.siege) { parts.push('明教要全力寻找谢法王；他们给我一块铁焰令，说谢法王双目失明，寻到他时让他摸一摸此令。'); talks.push([323], [330]); }
      rows.push(row('xiexun', false, '谢逊', parts.join(''), f.siege ? '明教 · 光明顶' : '冰火岛', talks));
    }
  }
  // 《倚天屠龙记》：杨逍说在明教；光明圣火阵与紫衫龙王要到谢逊回教之后。持有此书不等于亲见破阵。
  if (f.yang || f.bookWon) {
    if (f.bookWon) {
      rows.push(row('book', true, f.bookD ? '破了光明圣火阵，寻得《倚天屠龙记》' : '已寻得《倚天屠龙记》', '', '明教 · 光明顶', f.bookD ? [[462]] : []));
    } else {
      let text, talks;
      if (f.dragon) {
        text = '灵蛇岛上的婆婆正是紫衫龙王，她要我上光明顶见识光明圣火阵。';
        talks = [[417], [418], [419], [429]];
      } else if (f.xieBack) {
        text = '谢逊回到光明顶，把书找了出来；可依明教历代教主的规定，要取走此书须破光明圣火阵。此阵还差紫衫龙王一人，她出走后隐居在东海的小岛上。蝴蝶谷胡先生夫妇和那岛上的婆婆打过交道，不妨先去谷里问问。';
        talks = [[435], [441], [443], [447], [449], [450]];
      } else {
        text = '杨逍一眼看出我要找的是《倚天屠龙记》，此书果真在明教。';
        talks = [[258], [259]];
        if (f.siege) { text += '光明顶上又听说，此书是明教镇教之宝，因阳教主突然消失而下落不明；等找到谢法王、整顿好教务，明教会全力搜寻。'; talks.push([325], [327], [328]); }
      }
      rows.push(row('book', false, '《倚天屠龙记》', text, '明教', talks));
    }
  }
  return rows;
}

// 供公共手札抬头使用，与 condor/feihu/xiaoao 同形：{label, count}。
const HAN = '〇一二三四五六七八九';
export function yitianSummary(rows) {
  const open = rows.filter((r) => !r.done).length;
  const has = (k) => rows.some((r) => r.key === k);
  const label = rows.some((r) => r.key === 'book' && r.done) ? '倚天屠龙记'
    : has('fenduo') || has('guangming') ? '明教' : has('xiexun') ? '谢逊' : '';
  return { label: label ? `已知线索 · ${label}` : '已知线索', count: open ? `未了 ${HAN[open] || open}` : '皆已了结' };
}
