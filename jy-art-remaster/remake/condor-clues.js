// 神雕支线 · 已知线索手札（Claude 2026-09-28）。
// 只读 S/D、行囊与队伍，推出玩家「已经听过、已经做过」的线索，放在江湖手札「此行记事」里，默认收合。
// 不写存档、不加人物或 journey 字段、不开地图、不指路；文字转述 dialogue-remaster.json 里实际播放的对白。
// 判据出处（原脚本行号）与各阶段实档见 reviews/claude-condor-clues-20260928.md。

const HAN = '〇一二三四五六七八九';
const BEES = [5, 6, 7, 8, 9, 10, 11, 12];

// 各判据只认原脚本里唯一的写入者；E932（武林帖）会清 7/6、18/0、18/1、80/1，所以涉及这几格的判据都带 post932 保护。
export function condorFlags({ dv, sv, inventory = [], party = [] }) {
  const has = (id) => inventory.some((x) => x && x.id === id && x.num > 0);
  const post932 = dv(25, 24, 2) !== 933;
  const yang = dv(7, 6, 2);
  const zhouMet = dv(20, 4, 2) !== 405;                                  // E405 405:18
  const wingsRead = BEES.some((e) => dv(20, e, 2) === 410);              // E409 409:47-54
  const beesOut = wingsRead || dv(20, 5, 2) === 409;                     // E408 408:12-19
  const honeyGiven = beesOut || (zhouMet && dv(20, 4, 3) !== 407);       // E407 407:14
  const valley = dv(80, 0, 4) === -1;                                    // E435 435:4
  const reunion = sv(18, 44, 30, 1) === 0 && sv(18, 44, 31, 1) === 0;    // E436 两支都拆古墓墙
  const cured = (!post932 && [397, 991, -1].includes(yang)) || has(124) || party.some((p) => p && p.id === 58)
    || honeyGiven || reunion;                                            // E396 396:24/58，124 唯一来源 396:37
  const met = (!post932 && yang !== 394) || cured;                       // E394 394:54
  const book = has(153) || dv(83, 20, 5) === 4664 || (reunion && dv(18, 4, 2) === -1);  // E443 / 天书归位
  const tombMet = reunion && !post932 && (dv(18, 0, 2) !== 438 || dv(18, 1, 2) !== 440); // E438/E440
  return {
    sane: dv(7, 6, 9) === 14 && dv(7, 6, 10) === 17,
    post932, met, herb: has(134), cured, zhouMet, honeyGiven, beesOut, wingsRead, valley, reunion, tombMet, book,
  };
}

// talks：本条转述的对白编号，每组任一句听过即可（测试用原脚本实跑核对）；不显示。
const row = (key, done, title, text = '', source = '', talks = []) => ({ key, done, title, text, source, talks });

export function deriveCondorClues(ctx) {
  if (!ctx || !ctx.loaded) return [];
  const f = condorFlags(ctx);
  // 未见杨过、数据不是原版、或武林帖已在重逢前清掉小龙女：整块不显示。
  if (!f.sane || !f.met || (f.post932 && !f.reunion)) return [];
  const rows = [];
  rows.push(f.cured
    ? row('poison', true, '以断肠草解了杨过的情花毒', '', '杨过 · 山洞', [[1292], [1297]])
    : row('poison', false, '杨过身中情花之毒',
      '情花只生在绝情谷，其毒唯有绝情丹能解，最后一颗已被他抛掉。我答应先去绝情谷看看情花，解毒的线索或许就在谷中。去绝情谷，须乘船顺黄河而上。',
      '杨过 · 山洞', [[1277], [1279], [1281], [1284], [1287]]));
  // 断肠草：只写物品本身（在哪采的、行囊怎么写），不说它能解毒——那是交草时才说出口的（1292）。
  if (!f.cured && f.herb) {
    rows.push(row('herb', false, '采得一株断肠草', '在绝情谷采得。行囊里记着：生于情花旁，本身即是剧毒。', '绝情谷 · 行囊'));
  }
  if (f.cured) {
    rows.push(f.honeyGiven
      ? row('honey', true, '玉蜂浆已送给周伯通', '', '周伯通 · 百花谷', [[1391]])
      : row('honey', false, '杨过相赠的玉蜂浆',
        '杨过解毒后赠我一瓶玉蜂浆，只说聊表心意，没说作何用处。' + (f.zhouMet ? '百花谷的周伯通说，他正在驯养蜜蜂，驯得不大顺手。' : ''),
        f.zhouMet ? '杨过 · 山洞　周伯通 · 百花谷' : '杨过 · 山洞', f.zhouMet ? [[1301], [1376]] : [[1301]]));
  }
  if (f.honeyGiven) {
    rows.push(f.reunion
      ? row('bees', true, '蜂翼上的字原是小龙女所刺', '', '绝情谷底', [[1464, 1486], [1465, 1487]])
      : f.wingsRead
        ? row('bees', false, '蜂翼上刺着字',
          '我在玉蜂翅上认出「情谷底」「我在绝」，周伯通说还见过「二午寺」「一山恶」。这些蜂不是他养的，是从北边山脉飞来的。',
          '周伯通 · 百花谷', [[1402], [1406], [1407, 1409], [1412]])
        // 蜂已放出但翅上的字还没看：只记周伯通收下蜂浆时的话，不出现任何刺字。
        : row('bees', false, '周伯通养蜂', '周伯通收下玉蜂浆，说再过一阵子，百花谷中便到处是蜜蜂飞舞。', '周伯通 · 百花谷', [[1390]]));
  }
  if (f.valley || f.reunion) {
    rows.push(f.reunion
      ? row('valley', true, '在绝情谷底与小龙女相见', '', '绝情谷底')
      : row('valley', false, '下到绝情谷底', '想不到竟有一条小路，通往这绝情谷底。', '绝情谷底', [[1449]]));
  }
  // 古墓之约：两种重逢分支都说了「回古墓、日后来找」；不给古墓方位（剧情里没人说过）。
  if (f.reunion) {
    rows.push(f.tombMet || f.book
      ? row('tomb', true, f.tombMet
        ? `已到古墓与杨过、小龙女相会${f.book ? '，寻得《神鵰侠侣》' : ''}`
        : '在古墓寻得《神鵰侠侣》', '', '古墓')
      : row('tomb', false, '古墓之约',
        '杨过与小龙女相约回古墓，嘱我日后有空到古墓找他们。我猜那本《神鵰侠侣》，说不定就在他们夫妇身上。',
        '绝情谷底', [[1471, 1493], [1474]]));
  }
  return rows;
}

export function condorSummary(rows) {
  const open = rows.filter((r) => !r.done).length;
  const reunion = rows.some((r) => r.key === 'tomb');
  return {
    label: `已知线索 · ${reunion ? '神鵰侠侣' : '杨过'}`,
    count: open ? `未了 ${HAN[open] || open}` : '皆已了结',
  };
}

// 挂在 #objective 之后；updateHud 每次都会调 update，签名不变就不碰 DOM，展开/收起由玩家自己决定。
export function mountCondorClues(anchor) {
  return mountClueList(anchor, { id: 'condor-clues', derive: deriveCondorClues, summarize: condorSummary });
}

// 两条已实现的天书线共用手札样式和收展行为，各自保留独立状态推导。
export function mountClueList(anchor, { id, derive, summarize }) {
  if (!anchor || !anchor.ownerDocument) return { el: null, update() {} };
  const doc = anchor.ownerDocument;
  const make = (tag, className, text) => {
    const n = doc.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const el = make('details', 'condor-clues');
  el.id = id;
  el.hidden = true;
  const label = make('span', 'condor-label');
  const count = make('span', 'condor-count');
  const summary = make('summary');
  const seal = make('span', 'condor-seal', '线');
  seal.setAttribute('aria-hidden', 'true');
  summary.append(seal, label, count);
  const list = make('ol');
  el.append(summary, list);
  anchor.after(el);
  let signature = null;
  return {
    el,
    update(ctx) {
      try {
        const rows = derive(ctx);
        const sig = rows.map((r) => `${r.key}:${r.done ? 1 : 0}:${r.title}:${r.text}`).join('|');
        if (sig === signature) return;
        signature = sig;
        el.hidden = !rows.length;
        if (!rows.length) { list.replaceChildren(); return; }
        const s = summarize(rows);
        label.textContent = s.label;
        count.textContent = s.count;
        list.replaceChildren(...rows.map((r) => {
          const li = make('li');
          li.dataset.clue = r.key;
          li.dataset.done = String(r.done);
          li.append(make('span', 'clue-title', r.title));
          if (r.text) li.append(make('p', 'clue-text', r.text));
          if (r.source) li.append(make('span', 'clue-source', r.source));
          return li;
        }));
      } catch {
        // 出错只收起本块，不能让 updateHud 抛错拖停游戏（engine resume 的 catch 会进错误画面）。
        signature = null;
        el.hidden = true;
      }
    },
  };
}
