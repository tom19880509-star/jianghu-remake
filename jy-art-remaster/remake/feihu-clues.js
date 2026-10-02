// 飞狐支线 · 已知线索（Claude 2026-09-28）。
// 只读 S/D、行囊与队伍，推出玩家「已经听过、已经做过」的线索；界面由 Codex 的公共手札渲染接入，本文件不碰 DOM。
// 不写存档、不加字段、不开地图、不指路；文字转述 dialogue-remaster.json 里实际播放的对白（本链原脚本未被重制替换）。
// 判据出处（原脚本行号）、各阶段实档与夹具见 reviews/claude-feihu-clues-20260928.md。

const HAN = '〇一二三四五六七八九';

// 阎基线（E20→E22→E10→E27→E28）与苗人凤线（E30→E35，E36/E37→E39）可任意交错，在 E41 汇合，再 E32、E33。
// 判据写成闭包：后一步成立即蕴含前一步。0/0、49/2 与队伍会被离队（E950/E952）、归队和武林帖（E932 instruct_59）改写，
// 只在 post932 保护下使用，或由下游证据兜底。
export function feihuFlags({ dv, sv, inventory = [], party = [] }) {
  const has = (id) => inventory.some((x) => x && x.id === id && x.num > 0);
  const inParty = (id) => party.some((p) => p && p.id === id);
  const post932 = dv(25, 24, 2) !== 933;
  const duelDone = dv(24, 8, 2) === 34;                                 // E33:29 胜后
  const cured = duelDone || dv(24, 8, 2) === 33;                        // E32:17
  const gave = cured || has(137) || inParty(2)                          // 137 唯一来源 E41:10；程灵素只经 E42/E953 入队
    || (!post932 && ([42, 953].includes(dv(49, 2, 2)) || dv(49, 2, 1) === -1));  // E41:11 / E952:4 / E42:28、E953
  const asked = gave || (!post932 && dv(49, 2, 2) === 40);             // E39:48
  const yanDone = dv(50, 1, 1) === -1 || gave;                          // E28:34 是唯一的 f1=-1；158 唯一来源 E28:37
  const saved = dv(24, 0, 4) === -1 || sv(49, 28, 37, 1) === 0 || asked;  // E30:59 / E30:55；E39 要等 E30 开栅栏
  const heardE10 = yanDone || inParty(1) || dv(50, 5, 4) === -1          // E27:8 须胡斐在队
    || (!post932 && ([11, 951].includes(dv(0, 0, 2)) || dv(0, 0, 1) === -1))  // E10:7 / E950:4 / E10:50、E11、E951
    || (dv(50, 2, 2) === -1 && !has(133));                              // 两页刀法：E22 唯一给，E10:9 唯一收
  return {
    // 本链所有 instruct_3 与 instruct_59 都保留 x/y；不是原版数据就不显示。
    sane: dv(24, 8, 9) === 17 && dv(24, 8, 10) === 23 && dv(50, 1, 9) === 18 && dv(50, 1, 10) === 21
      && dv(49, 2, 9) === 29 && dv(49, 2, 10) === 22 && dv(0, 0, 9) === 24 && dv(0, 0, 10) === 19,
    post932, heardE10, saved, asked, yanDone, gave, cured, duelDone,
    begonia: has(158),                                                  // 158 类型 0，小宝不收，唯一去处 E41:7
    faint: dv(49, 1, 4) === 38,                                         // E37:18 昏倒过一次；带花通过是 -1，不留痕
  };
}

// talks：本条转述的对白编号，每组任一句听过即可（测试用原脚本实跑核对）；界面不显示。
const row = (key, done, title, text = '', source = '', talks = []) => ({ key, done, title, text, source, talks });

export function deriveFeihuClues(ctx) {
  if (!ctx || !ctx.loaded) return [];
  const f = feihuFlags(ctx);
  // 什么都没听过、数据不是原版、或武林帖在取书前出现（原版到不了）：整块不显示。
  if (!f.sane || !(f.heardE10 || f.saved) || (f.post932 && !f.duelDone)) return [];
  const rows = [];
  // 救苗求药（E30）：不提程灵素、药王已故、七心海棠、阎基、赠书与冷月宝刀。
  if (f.saved) {
    rows.push(f.asked
      ? row('miao', true, '到药王庄求药：毒手药王已经过世', '', '程灵素 · 药王庄', [[151]])
      : row('miao', false, '苗人凤双眼中毒',
        '神龙教众上门围攻苗人凤，说田归农从毒手药王那儿弄来断肠草粉末，毒瞎了他的双眼。我说要去求毒手药王救治，苗人凤说那是徒劳往返，听说此人在洞庭湖畔隐居。'
          + (f.faint ? '药王庄外的红树丛香气浓得叫人发昏，我一走近便昏了过去，醒来已不在原处。' : ''),
        '苗人凤 · 苗人凤居', [[86], [89], [97], [98], [100], ...(f.faint ? [[139], [140]] : [])]));
  }
  // 程灵素查海棠 → 归还海棠（E39/E41）：阎基那一战之前，不提持有人。
  if (f.asked) {
    rows.push(f.gave
      ? row('cheng', true, '七心海棠已交还程灵素，换得解药', '', '程灵素 · 药王庄', [[168]])
      : row('cheng', false, '替程灵素寻回七心海棠',
        '药王庄的程灵素说，她师父毒手药王已经过世，断肠草的毒倒不难解；解药可以给我，但要先替她找回七心海棠。此物被她姜师兄盗走，如今不知流落何处，多半落在惯于滥施毒药、迷药害人的家伙手里。'
          + (f.begonia ? '阎基亮出的那株七心海棠，如今就在我行囊里。' : ''),
        '程灵素 · 药王庄', [[151], [153], [155], [161], [163], [165], ...(f.begonia ? [[82]] : [])]));
  }
  // 带胡斐重访阎基（E10 → E28）：了结前不提跌打医生、喂毒、七心海棠、胡一刀与各处方位。
  if (f.heardE10) {
    rows.push(f.yanDone
      ? row('yanji', true, '阎基供认：当年在苗人凤剑上喂毒的正是他', '', '阎基 · 阎基居', [[78], [80]])
      : row('yanji', false, '胡斐要找阎基问明旧账',
        '我把在阎基家中找到的两页刀法交给胡斐，他认出正是胡氏刀谱的总诀。平四叔说过，偷刀谱的人也牵涉他父亲之死，这笔旧账他要向阎基、苗人凤问个明白。胡斐说：先去见阎基，把偷谱和他父亲遇害的事问清，再去找苗人凤。',
        '胡斐 · 胡斐居', [[25], [26], [28]]));
  }
  // 先打了阎基、还没见过程灵素：只记物品本身，不提程灵素、药王庄、解药与治眼。
  if (f.begonia && !f.asked) {
    rows.push(row('begonia', false, '阎基的七心海棠',
      '与阎基交手时，他亮出这天下至毒的「七心海棠」，一战之后落到我手里。行囊里记着：此物炼制后奇毒无比，天下之最。',
      '阎基居 · 行囊', [[82]]));
  }
  // 治眼（E32）：不提约战、赠书与冷月宝刀。
  if (f.gave) {
    rows.push(f.cured
      ? row('cure', true, '苗人凤双眼已治好', '', '苗人凤 · 苗人凤居', [[103], [105]])
      : row('cure', false, '苗人凤眼毒解药', '程灵素依约给了解药。行囊里记着：可医治断肠草粉末所制之毒。', '程灵素 · 药王庄', [[168]]));
  }
  // 胡斐约战 → 取书（E32 两支都许了书 → E33）：冷月宝刀要到胜后才出现。
  if (f.cured) {
    rows.push(f.duelDone
      ? row('duel', true, '胡斐一战了结父仇，苗人凤赠冷月宝刀与《飞狐外传》', '', '苗人凤 · 苗人凤居', [[131], [132], [134], [138]])
      : row('duel', false, '苗人凤等胡斐来比武',
        '苗人凤说起十八年前的旧事：他剑伤好友胡一刀，兵刃上却被人喂了剧毒，胡一刀因此不治。他盼胡斐练好胡家刀法来打败他，到那时《飞狐外传》一并奉上；刀法练好了，随时可去找他。',
        '苗人凤 · 苗人凤居', [[109], [113], [122, 129]]));
  }
  return rows;
}

// 供公共手札抬头使用，与 condorSummary 同形：{label, count}。
export function feihuSummary(rows) {
  const open = rows.filter((r) => !r.done).length;
  const done = rows.some((r) => r.key === 'duel' && r.done);
  return {
    label: done ? '已知线索 · 飞狐外传' : rows.some((r) => r.key === 'yanji') ? '已知线索 · 胡斐'
      : rows.some((r) => r.key === 'miao') ? '已知线索 · 苗人凤' : '已知线索',
    count: open ? `未了 ${HAN[open] || open}` : '皆已了结',
  };
}
