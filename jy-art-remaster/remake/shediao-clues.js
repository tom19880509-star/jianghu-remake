// 射雕一线 · 已知线索（Claude 2026-09-28）：黑龙潭瑛姑、一灯的手帕、百花谷周伯通、瑛姑说出书的下落、桃花岛郭靖交书。
// 只读 D 与行囊，推出玩家「已经听过、已经见过」的线索；界面由 Codex 的公共手札渲染接入，本文件不碰 DOM。
// 不写存档、不加字段、不开地图、不给坐标与取书条件；文字转述 dialogue-remaster.json 里实际播放的对白。
// 判据出处（原脚本行号）、各阶段实档与夹具见 reviews/claude-shediao-clues-20260928.md。

// 真实先后：神雕 E409（21/1 挂出瑛姑）→ E417 瑛姑给手帕 → E426 一灯见手帕（罢手／战败 → E419；杀 → E420）；
// 好人线 E419 → 百花谷 E411 → E423 瑛姑说出书的下落 → 出潭 E432（→ 一灯 E429/E430、互搏 E412，先后随意）；
// 杀人线 E420 直接说出下落；两线都经 E465 上岛、E466/E469 取书（148）；书在圣堂 E1005 归位。
// 判据写成闭包：后一步成立即蕴含前一步。E432 挂在黑龙潭出口、每次出潭都重跑（改回 47/0=429、20/4=412），
// 所以这两格只认 E432 写不出的值；75/2 会被重制送软猬甲改写，第 7 格是动态帧，一律不读。
// 不读队伍：程英在不在队，D 表不留痕（E416/E434 一进一出即还原）。
// affinity（可选，默认没有）：成长存档的好感记录；persons['63'].events['416'] 只在 E416 带程英进潭时写入
// （growth-extension 程英黑水潭一拍），是「程英认路」唯一的持续证据。没传就不写程英那一条，其余不受影响。
export function shediaoFlags({ dv, inventory = [], affinity = null }) {
  const has = (id) => inventory.some((x) => x && x.id === id && x.num > 0);
  const y1 = dv(21, 1, 2), guo = dv(75, 1, 2), d47 = dv(47, 0, 2);
  const post932 = dv(25, 24, 2) !== 933;                                 // E932:8
  const placed = dv(83, 15, 5) === 4664;                                 // E1005:8 圣堂归位
  const bookGift = guo === 467;                                          // E466:47 / E469:7
  const bookFight = guo === 470;                                         // E469:50
  const bookWon = placed || has(148) || bookGift || bookFight;           // 148 来源 E466:46 / E469:6 / E469:49，去处 E1005:7
  const guoMet = bookWon || guo === 469;                                 // E466:52
  const arrived = guoMet || dv(75, 0, 4) === -1;                         // E465:4
  const toldGood = dv(21, 3, 4) === 432 || dv(20, 13, 2) === 415;        // E423:6（E432 不清）/ E432:7
  const toldEvil = y1 === 422;                                           // E420:6
  const told = toldGood || toldEvil || arrived;                          // 桃花岛只由 E420:7 / E423:7 打开
  const killed = toldEvil || y1 === 420 || dv(47, 0, 5) === 6226;        // E426:38-39 / E427:14-15
  const reconciled = dv(20, 14, 2) === 414 || dv(47, 1, 1) === 0 || d47 === 431;   // E430:3-4 / E429:12
  const dual = has(91) || dv(20, 4, 2) === 413;                          // E412:21-22（91 唯一来源；zhou-extension 只在 E413 胜后改 20/4）
  const persuaded = toldGood || y1 === 423 || [424, 433].includes(dv(21, 2, 2));  // E411:44-45 / E424:8
  const asked = persuaded || y1 === 421 || dv(20, 4, 2) === 411 || d47 === 428;   // E419:30-32
  const shown = killed || asked || told || y1 === 419 || d47 === 427;    // E426:26-27（罢手与战败同值，分不出）
  const met = shown || y1 === 418 || has(184) || dv(47, 0, 3) === 426;   // E417:46-48（184 唯一来源）
  return {
    // 本链所有写入（含 instruct_59、zhou-extension）都保留这几格的 x/y；不是原版数据就不显示。
    sane: [[21, 1, 21, 26], [21, 3, 57, 25], [47, 0, 18, 18], [47, 1, 36, 44], [20, 4, 27, 29], [20, 13, 25, 31],
      [20, 14, 31, 18], [75, 0, 28, 54], [75, 1, 25, 12], [83, 15, 28, 23]].every(([s, e, x, y]) => dv(s, e, 9) === x && dv(s, e, 10) === y),
    post932, placed, bookGift, bookFight, bookWon, guoMet, arrived, toldGood, toldEvil, told,
    killed, reconciled, dual, persuaded, asked, shown, met,
    chengRead: affinity?.persons?.['63']?.events?.['416'] === true,
  };
}

// talks：本条转述的对白编号，每组任一句听过即可（测试用原脚本实跑核对）；界面不显示。
const row = (key, done, title, text = '', source = '', talks = []) => ({ key, done, title, text, source, talks });
const BOOK = '《射鵰英雄传》';

export function deriveShediaoClues(ctx) {
  if (!ctx || !ctx.loaded) return [];
  const f = shediaoFlags(ctx);
  // 数据不是原版、还没见过瑛姑，或武林帖在取书前出现（原版到不了）：整块不显示。
  if (!f.sane || !f.met || (f.post932 && !f.bookWon)) return [];
  const rows = [];
  // 程英只用 1630 的意思；她在不在场见瑛姑（1308/1309）分不出，不写。
  if (f.chengRead) rows.push(row('cheng', true, '进黑龙潭时，程英看出这黑水潭是有人特意布局过的，难不倒她', '', '程英 · 黑龙潭', [[1630]]));
  // 瑛姑。坐标（1326/1345）任何阶段都不写，只说她告诉了入口所在。
  if (f.told) {
    rows.push(row('yinggu', true, f.toldEvil ? `段皇爷死后，瑛姑说出了${BOOK}的下落` : `周伯通来到黑龙潭后，瑛姑说出了${BOOK}的下落`,
      '', '瑛姑 · 黑龙潭', f.toldEvil ? [[1326]] : [[1345]]));
  } else if (f.killed) {
    rows.push(row('yinggu', false, '瑛姑答应的下落', `我已依瑛姑之意杀了段皇爷。她答应过，事成就告诉我${BOOK}的下落。`,
      '瑛姑 · 黑龙潭', [[1316], [1318]]));
  } else if (f.persuaded) {
    rows.push(row('yinggu', false, '周伯通去找瑛姑了',
      '在百花谷把瑛姑的事告诉了周伯通，他这才知道自己和瑛姑有过一个孩子；问明瑛姑住在黑龙潭，一转眼就不见了，多半是去找她。',
      '周伯通 · 百花谷', [[1429], [1430], [1433], [1434]]));
  } else if (f.asked) {
    rows.push(row('yinggu', false, '瑛姑要见周伯通',
      `我没有杀段皇爷，回去劝瑛姑放下这段仇，说她的孩儿并非段皇爷所杀。她答应只要把周伯通找来见她，就告诉我${BOOK}的下落。`,
      '瑛姑 · 黑龙潭', [[1337], [1342]]));
  } else {
    rows.push(row('yinggu', false, '瑛姑要我去杀段皇爷',
      `黑龙潭的神算子瑛姑知道${BOOK}的下落，要我去杀人称「南帝」的段皇爷，事成才肯说。她说出了黑龙潭往南有间竹屋，段皇爷就住在那里，`
        + '又给了我一条手帕，让我先拿给他看。问她为何要杀这位仁君，她只恨他眼睁睁看着她的孩儿死去、不肯伸手相救，末了却说要杀不杀随我。',
      '瑛姑 · 黑龙潭', [[1316], [1318], [1320], [1322], [1324]]));
  }
  // 一灯。E426 在动手问话之前已说完身份（1356/1361/1362）。罢手与战败同值，只写「没有取他性命」。
  if (f.shown) {
    rows.push(f.killed ? row('yideng', true, '依瑛姑之意，杀了一灯大师', '', '一灯 · 竹屋', [[1356]])
      : f.reconciled ? row('yideng', true, '告诉一灯大师，瑛姑与老顽童已破镜重圆', '', '一灯 · 竹屋', [[1369], [1370]])
      : row('yideng', false, '一灯大师就是段皇爷',
        '竹屋里的一灯和尚见了手帕，自认就是当年的段皇爷。瑛姑原是他的刘贵妃；她的孩子当年身受重伤，他见死不救，孩子因此死去，他从此出家。'
          + '他说天天等着瑛姑来亲手了结这场罪孽。我没有取他性命。',
        '一灯 · 竹屋', [[1356], [1360], [1362]]));
  }
  // 桃花岛郭靖。品德门槛、厨房柜子（1592 后半）都不写；黄蓉只在见过郭靖夫妇后出现。
  if (f.told) {
    const toldBy = f.toldEvil ? [1326] : [1345];
    if (f.bookWon) {
      rows.push(row('taohua', true, f.bookGift ? `郭靖夫妇把${BOOK}赠给了我` : f.bookFight ? `胜过郭靖与黄蓉，取得${BOOK}` : `已得到${BOOK}`,
        '', '郭靖 · 桃花岛', f.bookGift ? [[1593]] : f.bookFight ? [[1596], [1598]] : []));
    } else if (f.guoMet) {
      rows.push(row('taohua', false, '郭靖的条件',
        '在桃花岛见了郭靖夫妇。郭靖说，我若能行出一个侠客的样子，这本书便送我；若只想凭武功来取，须先胜过他。这回他没有把书交给我。',
        '郭靖 · 桃花岛', [[1592], [1594, 1603]]));
    } else {
      rows.push(row('taohua', false, `${BOOK}在桃花岛郭靖手上`,
        `瑛姑说${BOOK}在桃花岛郭靖手上。桃花岛是黄老邪按五行八卦布置的，一般人很难找到入口，她把入口所在告诉了我。`
          + (f.arrived ? '凭她所说，已登上了桃花岛。' : ''),
        '瑛姑 · 黑龙潭', f.arrived ? [toldBy, [1646]] : [toldBy]));
    }
  }
  // 互搏：只在已学到之后记一笔（E424 的许诺会被 E432 清掉，证据不持续，不写）。
  if (f.dual) rows.push(row('zhou', true, '周伯通在百花谷教了我左右互搏之术', '', '周伯通 · 百花谷', [[1437], [1442]]));
  return rows;
}

// 供公共手札抬头使用，与 condor/feihu/xiaoao/yitian/tianlong 同形：{label, count}。
const HAN = '〇一二三四五六七八九';
export function shediaoSummary(rows) {
  const open = rows.filter((r) => !r.done).length;
  const has = (k) => rows.some((r) => r.key === k);
  const label = rows.some((r) => r.key === 'taohua' && r.done) ? '射鵰英雄传' : has('taohua') ? '桃花岛' : has('yinggu') ? '瑛姑' : '';
  return { label: label ? `已知线索 · ${label}` : '已知线索', count: open ? `未了 ${HAN[open] || open}` : '皆已了结' };
}
