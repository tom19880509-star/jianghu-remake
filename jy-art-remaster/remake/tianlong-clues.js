// 天龙一线 · 已知线索（Claude 2026-09-28）：无量山洞、段誉与王语嫣、燕子坞慕容、丐帮取书。
// 只读 S/D、行囊与队伍，推出玩家「已经听过、已经见过」的线索；界面由 Codex 的公共手札渲染接入，本文件不碰 DOM。
// 不写存档、不加字段、不开地图、不指路；文字转述 dialogue-remaster.json 里实际播放的对白（本链原脚本未被重制替换）。
// 判据出处（原脚本行号）、各阶段实档与夹具见 reviews/claude-tianlong-clues-20260928.md。

// 真实先后：E476 高昇初见 → E484 无量玉像（开燕子坞院门）→ E487 → E493（玉玺）→ E573（世系表，无条件挂出丐帮 527/531）；
// 丐帮 E523 打狗阵可在 E573 前后；取书二选一：E527→E528 胜（书 529），或少林书信 E531（51/14 清空）；E528 胜后出口 E530 必经。
// 判据写成闭包：后一步成立即蕴含前一步。52/1、52/2、61/0、61/8 会被离队/归队与武林帖 E932 改写，只作补充证据。
export function tianlongFlags({ dv, sv, inventory = [], party = [] }) {
  const has = (id) => inventory.some((x) => x && x.id === id && x.num > 0);
  const inParty = (id) => party.some((p) => p && p.id === id);
  const post932 = dv(25, 24, 2) !== 933;
  const placed = dv(83, 14, 5) === 4664;                                 // E1004:8 圣堂归位
  const bookFoul = (dv(51, 14, 1) === 0 && dv(51, 14, 2) === -1) || dv(51, 2, 2) === 532;  // E531:33 / :57
  const bookFair = dv(51, 14, 2) === 529;                                // E528:31
  const bookWon = placed || has(147) || bookFair || bookFoul;            // 147 来源 E528:30 / E531:36，去处 E1004:7
  const exitDone = dv(51, 20, 1) === 0 || dv(51, 21, 1) === 0;           // E530:15-16
  const sworn = (Math.max(0, dv(64, 190, 8)) & 4) !== 0;                 // 重制结义分支（murong-extension）：慕容复留队，不算击退
  const lovers = dv(51, 24, 1) === 0;                                    // E530:128 段誉与王语嫣同去无量山洞
  const challenge = bookFair || dv(51, 14, 2) === 528;                   // E527:22
  const pointed = bookWon || challenge || dv(51, 14, 2) === 527 || dv(51, 14, 3) === 531;  // E573:66（E514:49 也需先有 E573）
  const met525 = dv(51, 14, 2) === 526;                                  // E525:42 见过乔峰本人（1925 自称乔峰），会被 E573 覆盖
  const qiaoMet = pointed || met525;                                     // 全名：见过本人，或慕容复说出「丐帮帮主乔峰」（E573 1768）
  const gate = dv(51, 1, 1) === 0 || challenge || bookWon || met525;     // E523:37 / E580；乔峰须破阵后才走得到
  const gateLost = !gate && dv(51, 1, 2) === 580;                        // E523:27
  const letter = [512, 578, 518].includes(dv(28, 12, 2)) || has(183) || bookFoul;          // E511/E513/E515 带慕容复
  const chest = dv(52, 4, 5) === 2612 || has(178);                       // E496:8/10（梅庄用掉 178 后箱图仍在）
  const seal = pointed || dv(52, 1, 2) === 572 || dv(52, 1, 3) === 573 || has(166) || chest;  // E493:31/32
  const murongMet = seal || dv(52, 1, 2) === 489 || dv(52, 1, 3) === 493 || dv(52, 2, 2) === 490;  // E487:74-75/99-100
  const duanStayed = dv(52, 3, 1) !== 3;                                 // E491:19（E492/E530 改为 0；E932 不碰）
  const jade = murongMet || duanStayed || dv(42, 1, 2) === 485 || sv(52, 27, 29, 1) === 0;  // E484:66/73 燕子坞院门
  const duanJoined = jade || inParty(53) || dv(61, 8, 1) !== 8;          // E476:57 / E477 / E986 / E987 / E932
  const duanMet = duanJoined || dv(61, 0, 2) !== 476;                    // E476:28
  return {
    // 本链所有写入（含 instruct_59）都保留这几格的 x/y；不是原版数据就不显示。
    sane: dv(61, 0, 9) === 19 && dv(61, 0, 10) === 18 && dv(52, 1, 9) === 18 && dv(52, 1, 10) === 26
      && dv(52, 3, 9) === 20 && dv(52, 3, 10) === 24 && dv(51, 14, 9) === 12 && dv(51, 14, 10) === 29
      && dv(42, 1, 9) === 18 && dv(42, 1, 10) === 20 && dv(83, 14, 9) === 26 && dv(83, 14, 10) === 23,
    post932, placed, bookFoul, bookFair, bookWon, exitDone, sworn, lovers, challenge, pointed, qiaoMet, gate, gateLost,
    letter, chest, seal, murongMet, duanStayed, jade, duanJoined, duanMet,
    duanBack: dv(52, 3, 1) === 0 && !lovers,                             // E492:30 王语嫣在队时段誉归队
  };
}

// talks：本条转述的对白编号，每组任一句听过即可（测试用原脚本实跑核对）；界面不显示。
const row = (key, done, title, text = '', source = '', talks = []) => ({ key, done, title, text, source, talks });

export function deriveTianlongClues(ctx) {
  if (!ctx || !ctx.loaded) return [];
  const f = tianlongFlags(ctx);
  // 数据不是原版，或武林帖在取书前出现（原版到不了）：整块不显示。
  if (!f.sane || (f.post932 && !f.bookWon)) return [];
  const rows = [];
  // 段誉与无量山洞。玉像是谁、院门已开都不写。
  if (f.duanMet) {
    rows.push(f.jade ? row('wuliang', true, '随段誉进了无量山洞，在玉像前得到北冥神功与凌波微步', '', '无量山洞', [[1673], [1682]])
      : row('wuliang', false, '段誉想去无量山',
        '高昇客栈遇到离家出走的段誉：他不肯学武，听人说往西有座无量山，风景清幽，正打算去走一趟。',
        '段誉 · 高昇客栈', [[1648], [1650], [1652]]));
  }
  // 燕子坞慕容：书名《天龙八部》从这里（1709）才出现；玉玺、世系表在哪里本线从未说过。
  if (f.murongMet) {
    if (f.pointed) {
      rows.push(f.exitDone && !f.sworn
        ? row('murong', true, '慕容复在丐帮出口拦路，要揭发乔峰的身份，已被击退', '', '慕容复 · 丐帮', [[1947], [1949], [1951]])
        : row('murong', true, '慕容复说出《天龙八部》在丐帮帮主乔峰手里', '', '慕容复 · 燕子坞', [[1767], [1768], [1771]]));
    } else if (f.seal) {
      rows.push(row('murong', false, '慕容复要的大燕皇帝世系谱表',
        '燕子坞的慕容复知道《天龙八部》的下落。我交了传国玉玺，他又说没有大燕皇帝世系谱表，别人不会信他是王孙后代，要我找来才肯说。他还给了一把钥匙，说他房间箱子里有本旷世棋谱。'
          + (f.chest ? '箱中的棋谱已经取出。' : ''),
        '慕容复 · 燕子坞', [[1709], [1753], [1755], [2170]]));
    } else {
      rows.push(row('murong', false, '慕容复与《天龙八部》',
        '燕子坞的慕容复说他知道《天龙八部》的下落，要我先找来大燕国的传国玉玺。他的表妹王语嫣熟读各派武功。',
        '慕容复 · 燕子坞', [[1709], [1715], [1719], [1726]]));
    }
  }
  // 丐帮乔峰。称呼只用已听到的：打狗阵弟子只说「帮主」（1903/1908），破阵后说「乔帮主」（1907），
  // 见过本人（E525）或慕容复说出「丐帮帮主乔峰」（E573 1768）之后才用全名。书信线只说「关乎身世」，任何阶段不写「契丹」。
  if (f.pointed || f.gate || f.gateLost) {
    if (f.bookWon) {
      rows.push(row('gaibang', true, f.bookFoul ? '出示少林书信，乔峰辞去帮主之位，交出《天龙八部》'
        : f.bookFair ? '凭一己之力胜过乔峰，得到《天龙八部》' : '已得到《天龙八部》', '', '乔峰 · 丐帮',
        f.bookFoul ? [[1973]] : f.bookFair ? [[1941]] : []));
    } else {
      const parts = [], talks = [];
      if (f.pointed) {
        parts.push('慕容复说《天龙八部》在丐帮帮主乔峰手里；他还说知道乔峰一个足以身败名裂的秘密，要先上少林寺拿一样东西，邀我同去。');
        talks.push([1767], [1768], [1779], [1781]);
      }
      if (f.challenge) {
        parts.push('乔峰说此书是丐帮镇帮之宝，先辈留下规矩：谁能凭一己之力胜过本帮的降龙十八掌，便双手奉上；准备好了再去知会他。');
        talks.push([1934], [1936], [1938]);
      } else if (f.gate) { parts.push('破了丐帮的打狗阵，乔帮主就在里面。'); talks.push([1907]); }
      else if (f.gateLost) { parts.push('丐帮弟子摆下打狗阵，说我的功夫还不配见他们帮主。'); talks.push([1903], [1908]); }
      rows.push(row('gaibang', false, f.qiaoMet ? '丐帮帮主乔峰' : f.gate ? '丐帮乔帮主' : '丐帮打狗阵', parts.join(''), '丐帮', talks));
    }
  }
  if (f.letter && !f.bookWon) {
    rows.push(row('letter', false, '少林的书信', '少林玄慈交出一封当年武林前辈草拟的信件，关乎乔峰的身世。', '玄慈 · 少林寺', [[1835], [1849]]));
  }
  // 段誉与王语嫣的去留。
  if (f.duanStayed || f.lovers) {
    rows.push(f.lovers ? row('duanyu', true, '段誉与王语嫣同往无量山洞，去看那尊像极了她的玉像', '', '王语嫣 · 丐帮', [[1958], [1960]])
      : f.duanBack ? row('duanyu', true, '段誉为了王姑娘，又回到队中', '', '段誉 · 燕子坞', [[1746], [1747]])
      : row('duanyu', false, '段誉留在燕子坞',
        '段誉在燕子坞不肯再走，说要留下来服侍神仙姊姊；我劝他王姑娘喜欢的是她表哥，他心意已决。', '段誉 · 燕子坞', [[1742], [1743], [1744]]));
  }
  return rows;
}

// 供公共手札抬头使用，与 condor/feihu/xiaoao/yitian 同形：{label, count}。
const HAN = '〇一二三四五六七八九';
export function tianlongSummary(rows) {
  const open = rows.filter((r) => !r.done).length;
  const has = (k) => rows.some((r) => r.key === k);
  const label = rows.some((r) => r.key === 'gaibang' && r.done) ? '天龙八部'
    : has('gaibang') ? '丐帮' : has('murong') ? '燕子坞' : has('wuliang') ? '段誉' : '';
  return { label: label ? `已知线索 · ${label}` : '已知线索', count: open ? `未了 ${HAN[open] || open}` : '皆已了结' };
}
