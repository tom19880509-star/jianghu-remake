// 笑傲一线 · 已知线索（Claude 2026-09-28）。
// 只读 S/D、行囊与队伍，推出玩家「已经听过、已经做过」的线索；界面由 Codex 的公共手札渲染接入，本文件不碰 DOM。
// 不写存档、不加字段、不开地图、不指路；文字转述 dialogue-remaster.json 里实际播放的对白（本链原脚本未被重制替换）。
// 判据出处（原脚本行号）、各阶段实档与夹具见 reviews/claude-xiaoao-clues-20260928.md。

const HAN = '〇一二三四五六七八九';

// 判据写成闭包：后一步成立即蕴含前一步。梅庄各关都有只开不关的地图格（S 层 1），优先读它；
// 40/3（令狐冲）会被离队 E966/归队 E967 与武林帖 E932（instruct_59）改写，57/1、29/1、31/0 会被 E322 改写。
export function xiaoaoFlags({ dv, sv, inventory = [], party = [] }) {
  const has = (id) => inventory.some((x) => x && x.id === id && x.num > 0);
  const inParty = (id) => party.some((p) => p && p.id === id);
  const post932 = dv(25, 24, 2) !== 933;
  const book = has(151) || dv(83, 18, 5) === 4664;                      // E320:139 得书 / E1008:8 圣堂归位
  // 梅庄（严格线性：E247→E248→E251→E253→E254→E258→E259→E264→E269→E271→E276→E275）
  const meizhuangOver = dv(55, 20, 1) === 0; // E275:45，四友战后对白938已说赶回黑木崖
  const dungeon = (dv(82, 1, 1) === 0 && dv(82, 1, 2) === -1) || dv(55, 24, 4) === 275 || dv(55, 20, 1) === 0; // E276:36,48 / E275:45
  const invited = dungeon || has(161) || dv(55, 9, 2) === 281;           // E271:38（红钥匙从不消耗）/ E271:34
  const qinDone = invited || [265, 270].includes(dv(55, 13, 2)) || dv(55, 0, 4) === 269;  // E264:39,43 / E269:14
  const huangMet = qinDone || dv(55, 13, 2) === 260;                     // E259:20
  const qiDone = qinDone || sv(55, 37, 34, 1) === 0;                     // E258:37
  const heibaiMet = qiDone || dv(55, 9, 2) === 255;                      // E254:12
  const shuDone = heibaiMet || sv(55, 21, 34, 1) === 0;                  // E253:48
  const tubiMet = shuDone || dv(55, 6, 2) === 252 || dv(55, 8, 2) === 280;  // E251:14,16
  const huaDone = tubiMet || sv(55, 37, 42, 1) === 0 || dv(55, 8, 2) === 253;  // E248:37,38
  const danqingMet = huaDone || dv(55, 3, 2) === 250;                    // E247:10
  const meiOpen = danqingMet || sv(55, 30, 47, 1) === 0;                 // E239:10（只有 E238 会挂出 E239）
  const wineTaken = dv(55, 4, 2) === -1;                                 // E249:2
  // 令狐冲（悦来客栈 40/3）与思过崖
  const fengArmed = dv(81, 1, 4) === -1 || dv(81, 2, 2) === 284;         // E283:8,7（须令狐冲在队）
  const jiujian = has(79) || (fengArmed && dv(81, 2, 2) === -1);         // E284:66,61；79 从不消耗、不可卖
  const pathFound = dv(81, 0, 4) === -1;                                 // E282:4（可在 E283 之后）
  const joined = inParty(35) || fengArmed || jiujian                     // E242:39 / E243:23 入队签名 f8=-1；E932 清成 f8=0
    || (dv(40, 3, 1) === 0 && dv(40, 3, 2) === -1 && dv(40, 3, 8) === -1)
    || dv(40, 3, 2) === 967 || dv(40, 3, 1) === -1;                      // E966:4 离队 / E967:23 归队
  const gaveJade = joined || dv(40, 3, 2) === 243 || (!has(127) && dv(69, 9, 5) === 3500);  // E242:11；127 唯一来源 E921、唯一去处 E242
  const gavePear = gaveJade || dv(40, 3, 3) === 242 || (!has(126) && wineTaken);            // E241:9；126 唯一来源 E249、唯一去处 E241
  const gaveDao = gavePear || meiOpen || dv(40, 3, 2) === 237 || dv(40, 2, 2) === 239;       // E238:9,10
  const metLhc = gaveDao || dv(40, 3, 3) === 238;                        // E236:4
  const shaodao = dv(40, 2, 3) === 234 || [246, 239].includes(dv(40, 2, 2)) || has(194) || gaveDao;  // E233:8 听过烧刀子
  // 五岳：嵩山 27/0 第 4 格原值 198，E195/E170/E176/E232 各加一；E202 置 215，大会结束置 -1。
  const c = dv(27, 0, 4);
  const assembly = c === -1;
  const armed = assembly || c === 215;
  const yue = armed || [196, 197].includes(dv(57, 1, 2));               // E195:56 / E218:43
  const dingxian = armed || [171, 173].includes(dv(31, 0, 2));          // E170:20 / E218:26
  const tianmen = armed || [177, 179].includes(dv(29, 1, 2));           // E176:25 / E218:33
  const feibin = armed || (dv(58, 14, 1) === 0 && dv(58, 14, 9) === 49 && dv(58, 14, 10) === 53);  // E232:12
  const hengHall = feibin || dv(58, 14, 2) === 232 || dv(58, 6, 4) === -1;  // E187-189
  const plot = dv(58, 22, 1) === 0 && dv(58, 22, 9) === 45;             // E225-231 听过谋害刘正风
  const hengGate = hengHall || [182, 183, 221].includes(dv(58, 0, 2));  // E180:10 / E181、E182 / E218:39
  const guard = armed && dv(27, 1, 1) === 0;                            // E204:18
  return {
    // 本链写入都保留这几格的 x/y；不是原版数据就不显示。
    sane: dv(40, 3, 9) === 32 && dv(40, 3, 10) === 19 && dv(55, 3, 9) === 13 && dv(55, 3, 10) === 40
      && dv(27, 0, 9) === 56 && dv(27, 0, 10) === 42 && dv(81, 2, 9) === 16 && dv(81, 2, 10) === 36,
    post932, book, meizhuangOver, meiOpen, danqingMet, huaDone, tubiMet, shuDone, heibaiMet, qiDone, huangMet, qinDone, invited, dungeon,
    metLhc, shaodao, gaveDao, gavePear, gaveJade, joined, pathFound, fengArmed, jiujian,
    count: c >= 198 && c <= 202 ? c - 198 : null, assembly, armed, yue, dingxian, tianmen, hengGate, hengHall, plot, feibin, guard,
  };
}

// talks：本条转述的对白编号，每组任一句听过即可（测试用原脚本实跑核对）；界面不显示。
const row = (key, done, title, text = '', source = '', talks = []) => ({ key, done, title, text, source, talks });

export function deriveXiaoaoClues(ctx) {
  if (!ctx || !ctx.loaded) return [];
  const f = xiaoaoFlags(ctx);
  // 数据不是原版，或武林帖在取书前出现（原版到不了）：整块不显示。
  if (!f.sane || (f.post932 && !f.book)) return [];
  const rows = [];
  // 悦来令狐：武林帖清掉 40/3 之后只认得出「已入队」，其余阶段分不清，宁可不列。
  if (f.metLhc && (!f.post932 || f.joined)) {
    const src = '令狐冲 · 悦来客栈';
    rows.push(f.joined ? row('linghu', true, '令狐冲与我结伴同游，共寻天下好酒', '', src, [[783]])
      : f.gaveJade ? row('linghu', false, '令狐冲收下翡翠杯',
        '翡翠杯配梨花酒，令狐冲说这份情他记下了。他已不在华山门下，个中曲折，一时也说不清。', src, [[777], [779]])
      : f.gavePear ? row('linghu', false, '令狐冲说梨花酒该配翡翠杯',
        '令狐冲赞梨花酒酒味极好，只可惜少了股芳冽之气，若能以翡翠杯盛之而饮，那更是醇美无比。', src, [[776]])
      : f.gaveDao ? row('linghu', false, '令狐冲嫌烧刀子少了余味',
        '令狐冲喝了烧刀子，说够烈，入喉却少了些余味；要痛痛快快喝上一场，还欠点意思。', src, [[775]])
      : row('linghu', false, '悦来客栈的令狐冲',
        '令狐冲说，若是来请酒的，便先坐下，别的慢慢再说。' + (f.shaodao ? '小二说本店的烧刀子远近驰名。' : ''),
        src, f.shaodao ? [[774], [772]] : [[774]]));
  }
  // 梅庄拜访：丹青生那一关。不说《谿山行旅图》从何而来。
  if (f.meiOpen) {
    rows.push(f.huaDone ? row('mei', true, '丹青生看过《谿山行旅图》，许我自取梨花酒', '', '丹青生 · 梅庄', [[802], [811]])
      : f.danqingMet ? row('mei', false, '梅庄四庄主丹青生',
        '丹青生说，他的酒不是谁开口都能讨去的：好画值得一杯，好身手也值得一杯。', '丹青生 · 梅庄', [[799]])
      : row('mei', false, '杭州梅庄的美酒', '悦来客栈的小二说，杭州多佳酿，梅庄之美酒更是首屈一指。', '小二 · 悦来客栈', [[786], [787]]));
  }
  // 梅庄四友（书、棋、琴）：秃笔翁、黑白子想要什么只在重复交谈里说（818、839，不留痕），不写；各件书画从何而来一概不提。
  if (f.huaDone) {
    const wager = f.shuDone && !f.qinDone ? '我与梅庄约定：庄中只要有一位胜得了我，我带来的书画一并奉上。' : '';
    rows.push(f.qinDone ? row('siyou', true, '梅庄四友都已领教：书画棋琴四关已过', '', '黄钟公 · 梅庄', [[864]])
      : f.huangMet ? row('siyou', false, '大庄主黄钟公', wager
        + '黄钟公说梅庄四友早已不问江湖声名。我暗想他道号黄钟，想必雅好音律，寻常言语请不动他，除非拿得出一部失传的琴谱。',
        '黄钟公 · 梅庄', [[830, 841], [852], [855], [856]])
      : f.qiDone ? row('siyou', false, '只等大庄主赐教', wager
        + '黑白子见了《呕血棋谱》想借去抄录。我已领教过二庄主的武功，便在庄中恭候大庄主。', '黑白子 · 梅庄', [[840], [841], [847]])
      : f.heibaiMet ? row('siyou', false, '二庄主黑白子', wager + '二庄主黑白子劝住两位兄弟，请我先回。', '黑白子 · 梅庄', [[830], [835], [838]])
      : f.shuDone ? row('siyou', false, '与梅庄的赌约',
        '秃笔翁认出张旭《率意帖》真迹。' + wager + '他们去求二庄主帮忙。', '秃笔翁 · 梅庄', [[820], [830], [833]])
      : f.tubiMet ? row('siyou', false, '三庄主秃笔翁', '三庄主秃笔翁见了我，没有替四弟出头抢画，把我送出了门。', '秃笔翁 · 梅庄', [[813], [816], [817]])
      : row('siyou', false, '梅庄三庄主', '丹青生说要去请三哥来。', '丹青生 · 梅庄', [[811]]));
  }
  // 黑白子之约：地洞与钥匙只在 E271 亲口说过之后出现；地洞里是谁，任何阶段都不写。
  if (f.invited) {
    rows.push(f.dungeon ? row('yueding', true, '梅庄地洞之约已了', '', '梅庄')
      : row('yueding', false, '黑白子引见的朋友',
        '黑白子旧约重提：庄中另有一位朋友要与我较量，此人一向把自己关在梅庄下的地洞中。他给了我一把钥匙，说地洞入口在一间摆有四张椅子和一张桌子的房间里。',
        '黑白子 · 梅庄', [[880], [882], [884]]));
  }
  if (f.meizhuangOver && !f.book) {
    rows.push(row('heimu', false, '梅庄四友赶回黑木崖',
      '四友承认奉日月神教之命看守地牢。黄钟公说，要赶回黑木崖，向东方教主报告此事。',
      '梅庄四友', [[937], [938]]));
  }
  // 华山思过崖：风清扬、独孤九剑要到 E284 之后才出现；E283 静默挂出人物时也不点名。
  if (f.joined || f.pathFound || f.jiujian) {
    rows.push(f.jiujian ? row('siguo', true, '思过崖上，风清扬太师叔传了令狐冲独孤九剑', '', '风清扬 · 思过崖', [[945], [954]])
      : row('siguo', false, f.joined ? '华山背面的隐秘地方' : '华山后山的小路',
        (f.joined ? '令狐冲说他在华山时发现过一处隐秘地方，入口就在华山背面。' : '')
          + (f.pathFound ? '一条隐密的小路竟通到华山后山，不知藏有什么玄机。' : ''),
        f.joined ? '令狐冲' : '华山后山', [...(f.joined ? [[783]] : []), ...(f.pathFound ? [[940]] : [])]));
  }
  // 五岳并派：只写各派当面说过的话；不写前置计数、谁在背后、魔教诸事。E322 若在大会前改写了华山/泰山/恒山，相应句子自然不出现。
  if (f.yue || f.dingxian || f.tianmen || f.hengGate || f.armed) {
    if (f.assembly) {
      rows.push(row('wuyue', true, '嵩山大会已毕：岳不群暂且执掌五岳派门户', '', '岳不群 · 嵩山', [[742]]));
    } else {
      const parts = [], talks = [];
      if (f.yue) { parts.push('华山岳不群说，五岳剑派将在下月十五于嵩山开会商议并派；左冷禅野心极大，想五派归一、由他自任掌门。岳先生说嵩山大会上他将尽力而为。'); talks.push([673], [681], [687]); }
      if (f.dingxian) { parts.push('恒山定闲师太坚拒并派。'); talks.push([627]); }
      if (f.tianmen) { parts.push('泰山派也已登门交过手。'); talks.push([635], [638]); }
      if (f.feibin) { parts.push('在衡山撞破嵩山弟子谋害刘正风一家，打退了费彬。'); talks.push([768], [769]); }
      else if (f.hengHall) {
        parts.push('衡山莫大先生回绝了嵩山派的费彬，费彬仍请他届时到嵩山赴会。' + (f.plot ? '又听见嵩山弟子商量要抓刘正风一家老小。' : ''));
        talks.push([652], [655], ...(f.plot ? [[767]] : []));
      } else if (f.hengGate) { parts.push('衡山刘正风将要金盆洗手，观礼须出示请帖。'); talks.push([643], [645]); }
      if (f.guard) { parts.push('嵩山弟子说，今日正是五岳剑派并派的大日子。'); talks.push([698]); }
      rows.push(row('wuyue', false, '五岳并派', parts.join('') || '五岳剑派并派一事，已向几派当面问过。', '五岳剑派', talks));
    }
  }
  if (f.book) rows.push(row('book', true, '已寻得《笑傲江湖》'));
  return rows;
}

// 供公共手札抬头使用，与 condorSummary、feihuSummary 同形：{label, count}。取书之前不出现书名。
export function xiaoaoSummary(rows) {
  const open = rows.filter((r) => !r.done).length;
  const has = (k) => rows.some((r) => r.key === k);
  const label = has('book') ? '笑傲江湖' : has('linghu') ? '令狐冲' : has('mei') ? '梅庄' : has('siguo') ? '华山' : has('wuyue') ? '五岳剑派' : '';
  return { label: label ? `已知线索 · ${label}` : '已知线索', count: open ? `未了 ${HAN[open] || open}` : '皆已了结' };
}
