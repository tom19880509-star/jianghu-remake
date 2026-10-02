// One numeric source for the local campaign and the optional martial catalogue.
// Values are game design, never claimed as numbers from the novels.
export const BALANCE_REVISION=157;
// 157 丙 (2026-09-22, Tom「九阳改纯内力／邪门武功最终收益略弱于顶级正派武功」): 三处改动，逐条依据写在
// editorial/九阳与邪路157.md。
//  ① 92 九陽神功 不再是攻击招式（威力全 0、每段耗内 0），境界与增益改由 books.95 九陽真經 承担。
//     依据是《倚天》回16 叙述者「纯系内功与武学要旨，**没半招攻防的招数**」（editorial/内功原著核157.md
//     二·表一、editorial/张无忌前期武学157.md 三）。底表第 93 条一行不动，只把它的威力归零。
//  ② books.95 增三项**战斗内临时**被动（抗毒／防御／全武功增伤），见 JIUYANG。三项都不写人物面板、
//     不落存档；数值上限逐条卡在易筋经（43，十重护体 10 点）与九阴真经（94，十重增伤 8%）之下或齐平，
//     因为原著**没有跨书排名**（内功原著核157.md 三·A 组只给出书内比较）。
//  ③ 末级上限 LAST_RANK_CAP：绝学十重不再由曲线形状决定高低。**一到九重一格都不动**。
export const LAST_RANK_REVISION=157;
// 156 (2026-09-18, MOD 首批调整表落地): 门槛与入门心得按 editorial/MOD对照与首批调整表156.md 第二节的三条折算
// 换值 —— 门类根骨 = 逐梦2026 门槛 ×0.5（5 取整）、需内力 = ×0.1（10 取整）、入门心得 = 逐梦需经验 ÷4（5 取整）。
// 十级威力曲线、四档 baseCost、costSteps 与 LAST_RANK_BONUS 全部不动；只有火焰刀法（skill 66）每段耗内 6→8，
// 作为它已经生效的「空手可用、豁免刀剑代用 70%」的对价（balance-core.lua B.install 的 武功类型=1 与
// weapon-combat.lua 的 qi={30,66} 早已合并，代价一直没付）。新增的 gates / entryCost 是数据，须由
// reviews/mod156b-patch-suggestions.md 的两处接线才生效；未接线前它们不改变任何战斗数字。
// 155 (Tom 2026-09-18, 绝学末级增幅): a tier-4 art's LAST rank pays more. Rank-ten power = rank nine + LAST_RANK_BONUS x
// the average step from rank one to rank nine, (rank9 - rank1)/8. Ranks one to nine are unchanged; drain arts stay 0;
// 龙象般若功 (13 layers) keeps its own paid 11-13 extension and is not boosted at rank ten. The value before this payoff
// is kept as plainTenth: first-journey enemies still strike with it (balance-combat.lua B.firstJourneyEnemyLastRank).
// A design value, not a source figure; 0 switches the payoff off (rebuild).
export const LAST_RANK_BONUS=2;
// 157 丙：**末级上限**。LAST_RANK_BONUS 加的是 (九重−一重)/4，这一段对三条曲线几乎一样大
// （steady .1975×cap、quick3 .175×cap、late .195×cap），所以十重的高低其实是九重的高低被原样放大：
// steady 九重 .91 ＞ quick3 .90 ＞ late .84 ⇒ 玉女素心剑／打狗棒法 997 高过降龙十八掌 932 达 7%。
// 那是副作用，不是设计（editorial/威力梯度157.md 没有任何一条要求 steady 收顶更高）。本表把十重钉死成
// 「上限系数 × 该门的 maxPower」，于是曲线只决定**多快到顶**，不再决定**顶在哪里**：
//   · late／steady／early ＝ 1.035 —— 恰好等于 late 现行的十重（.84＋.195），**late 那一档逐位不动**；
//   · quick3 ＝ .945 —— 速成邪路（26 葵花神功、60 辟邪劍法）的十重比同形状的顶级正派武功低约 8.7%
//     （辟邪 851 对降龙 932、葵花 578 对独孤 633），这是 Tom 2026-09-22「走歪路投机取巧但最终不及
//     正派一步一个脚印」的落点。**一重到九重一格都不动**（辟邪一重仍 180 ＝ 降龙一重 54 的 3.3 倍），
//     所以 toosimple-extension 里岳不群的辟邪九重不需要重定——本轮已重扫复核，见报告第三节。
// 都是设计值，不是原著数字。把某一档写成 null 即等于取消该档的上限。
// **单位是千分比，不是小数**：900×1.035 在浮点里是 931.4999999999999，四舍五入会掉到 931，
// 把 late 那一档从「逐位不动」变成「每门少一点」。写成整数千分比后 900×1035/1000 ＝ 931.5 精确可表示。
// 157 丙″：`quick3` 这一档**故意不再列在这里**。它下面只有 26 葵花与 60 辟邪两门，而 Tom 第三轮
// 已经给这两门各自定了十重（658／920），逐门上限压过曲线上限 ⇒ 写一个 quick3 的曲线值也没人读得到，
// 留着就是死旋钮。删掉之后它落到默认的 1035（与 late 同档）：万一日后新增第三门 quick3 武功而忘了
// 给它逐门值，它拿到的是一个正常档位，而不是悄悄继承「邪路专用」的 945。
// tests/jiuyang157-balance.test.mjs 有一条断言守着「每一门 quick3 武功都必须在逐门表里」。
export const LAST_RANK_CAP={steady:1035,early:1035,late:1035};
// **157 丙″（Tom 2026-09-22 第三轮，两条原话：「辟邪 调整到920」、「葵花退回原来的 658。」）**
// 按曲线给的上限是一刀切：quick3 的 945‰ 会同时落在 60 辟邪与 26 葵花身上。Tom 要两门**分别定**，
// 所以这里把上限从「按曲线给」细化成「**按武功给**」——即报告 3.5 列过的候选丙，影响面仍然可以逐门枚举
// （下表两行就是全部；不在表里的门一律走曲线上限，一个数都不动）。
//   60 辟邪劍法 851 → **920** ＝ 降龙十八掌 932 的 **98.7%**，「略弱于顶级正派」仍成立（从低 8.7% 收到低 1.3%）。
//   26 葵花神功 578 → **658** ＝ **出厂值原样退回**（曲线自然值是 674，这条上限把它压回 658）。
// **一重与九重两门都不动**（辟邪 86/810、葵花 59/551）——九重不动 ⇒ 岳不群那一格不必重扫；
// 一重不退 ⇒ Tom「绝学入门高一点、不用高太多」那条裁定照旧生效，本次只动十重。
// 两门的 plainTenth 都回到各自的 maxPower（900／612），即两门都重新拿回「绝学末级增幅」那份收益，
// 与降龙 900/932 同构。
// ⚠ **一条必须写明的后果**：葵花 658 ＞ 独孤九剑 633（两门同为 shape 3，可直接并读）。
//    Tom 第一轮点名「最终收益略弱于……独孤九剑」那一条，**辟邪成立、葵花不再成立**。
//    这是第三轮裁定的直接结果，不是本层自作主张；已写进 editorial/九阳与邪路157.md 第十一节请 Tom 复核。
export const LAST_RANK_CAP_ART={60:920,26:658};
// **157 丁（Tom 2026-09-23，看过前 30 名的表之后）**：「空明拳和玉女素心剑太高，太玄神功太低，铁掌略高。」
// 这四门要动的不是第十重那一格，而是**整条曲线的上限**（持有者大多不在十重：小龙女玉女八重、
// 石破天与主角的太玄从 1 级练起），所以用 maxPower 的逐门覆盖，而不是 LAST_RANK_CAP_ART。
// 两张表各管一段、都逐门可枚举：ART_MAX_POWER 定「这门武功的满级基准」，LAST_RANK_CAP_ART 只定第十重那一格。
// 逐条依据（回目＋短引＋档位）写在 editorial/九阳与邪路157.md 第十六节，这里只留一句摘要：
//   1 野球拳   760  ——（115 已定）不给它白送一个 2000 威力的收尾。
//  21 空明拳   765  —— 900×0.85。《射雕》回18 叙述者：「要旨原在"以空而明"」；拳诀「刚不可久，柔不可守」；
//                     回22 洪七公：「若说与西毒拚斗，却尚远为不足」；《神雕》回34：「"空明拳"的一味阴柔」。①档。
//                     原著把它写成柔、虚、不足以伤敌的一门，与降龙并列全表第一说不过去。
//  49 玉女素心劍 720 —— 900×0.80。《神雕》回18 叙述者：单人分开使时「分成两截，威力立减」；
//                     「真谛在于使剑的两人心心相印」。①档。**它的优势该由合击承担**（combo-extension），
//                     本轮不实现效果层，方案写在 reviews/wuji157-patch-suggestions.md P9。
//  23 太玄神功  700 —— 612×1.144。《侠客行》回20：「'侠客行'一诗共二十四句，即有二十四间石室图解」，
//                     石破天看图解而「内力流动不息，如川之行」；回21 叙述者：「石破天雄浑之极的内力」、
//                     丁不四认他「武功远在石清夫妇之上」。①档。
//                     ⚠「太玄神功」四字是**原版游戏取的名（⑤档）**，全库零命中；所指之物（《太玄经》石壁图解）
//                     才是①档。图鉴文案**不得声称原著有此名**，这一条沿用既有裁定。
//  11 鐵掌     620  —— **本轮不动，理由见报告第十六·4**：它不是个别偏高，而是与另外七门 tier3 并列在同一个
//                     上限上；真正偏高的是「每点内力买到的威力」124（全表第二），而那一轴一压就直接削弱
//                     圣堂133 的裘千仞。压威力与「一周目不得明显变简单」冲突，实测见报告。
export const ART_MAX_POWER={1:760,21:765,49:720,23:700};
// 157 丙：九阳真经改纯内功之后的三项被动，**Lua 层与测试都读这一份，不许两处各写一遍**。
// 三项都是战斗内临时值：抗毒与防御在读数的那一刻临时加、读完立刻还原；增伤挂在 BrowserTechniquePower 上。
// **157 丙′ 返工（Tom 2026-09-22 第二轮）**：「我说的伤害增益是九阳增加所有武功的伤害，不是伤害免疫增加。」
// ⇒ **增伤是九阳的本体，防御与抗毒是附带，不得喧宾夺主**。增伤已经顶在「不超过九阴真经」的天花板上
// （九阴满级 8%，balance-core 的 `jiuyin=BrowserHeartRank(cfg,94)*.008`），抬不上去，所以重排只能是
// **把防御与抗毒让出预算**：防御 8→4、抗毒 50→30，增伤 8% 一格不动。总强度严格低于返工前那一版。
//  · powerMax .08 —— 与九阴真经「外功招式威力最多增加8%」同档同斜率，**不更高**。
//    Tom「内功多学多强是对的」⇒ 它与九阴／紫霞**叠加**，叠加上界 1.08×1.08＝1.1664。
//  · defenceMax 4 —— 返工前是 8。低于易筋经十重护体的 10 点（原著没有跨书排名，只能并列或稍低），
//    现在连它的一半都不到，「有感但不显眼」。实测归因见报告第九节：防御是三项里第二重的一项。
//  · resistMax 30 —— 返工前是 50。与张无忌订正后的底表抗毒 40 合计 **70**，恰好是 poisonmed 的
//    `shedResist`（每轮自行退毒），而不再是 `immuneResist` 90（硬免疫）。**A 件那个 40 仍然成立**，
//    映射从「凑满免疫线」换成「凑满自行退毒线」——这其实更贴原著：《倚天》回23 的「诸毒不侵」是叙述者
//    的概括，本作把它拆成「所受附毒 −40%（既有）＋ 每轮自行退毒」，不是引擎级硬免疫。
//    （**不得写成「百毒不侵」——那四字在《倚天》零命中**，见 editorial/内功原著核157.md 二·表二。）
//    副作用是刻意的：主角底表抗毒 22，满级后 52 ＜ 70 ⇒ **这一项不再白送全员退毒**，只有本就有抗毒
//    根基的人（张无忌 40）才够得着那条线。
export const JIUYANG={skill:92,book:95,
 passive:{defencePerRank:.4,defenceMax:4,resistPerRank:3,resistMax:30,powerPerRank:.008,powerMax:.08}};
export const CURVES={
 steady:[.12,.20,.29,.39,.50,.61,.72,.82,.91,1],
 early:[.35,.47,.59,.69,.77,.84,.90,.94,.98,1],
 late:[.06,.10,.16,.23,.32,.43,.55,.69,.84,1],
 // 157 乙′（Tom 2026-09-21「学会绝学就无脑通关」之裁）：速成类（26 葵花／60 辟邪）原用 early 的一重 .35，
 // 使「刚入门的绝学」压过「练满十重的门派武功」（315 > 220，比值 1.43）——四份参照里唯一越线的一份
 // （原版 0.90、逐梦 2026 0.52，见 editorial/参考数值157.md）。乙′ 把一重压到 .20（辟邪 180）。
 //
 // **157 丙′ 返工（Tom 2026-09-22 第二轮，推翻乙′ 的隐含前提「一重高是绝学的读感」）**：
 //   「辟邪一重威力这么高的话，还需要玩家练其他武功吗？我说的是绝学入门伤害高一点，但是不用高太多，
 //     主要还是绝学的特效比普通武功要好，比如攻击距离，范围，几率点穴等。」
 // 一重 .20→**.096**：辟邪 180→**86**、葵花 122→**59**，各自是同档正派绝学一重（降龙 54／独孤 37）的
 // **1.6 倍**，而不是原来的 3.3 倍；对 tier1 门派武功一重 31 是 2.8 倍，对 tier3 的 74 是 1.16 倍。
 // **九重 .90 与十重都一格不动**（辟邪 810／851、葵花 551／578）：
 //   ① 十重是 Tom 已裁的「歪路最终不及正派」，不得推翻（第三轮把辟邪那一格从 851 抬到 920，葵花不动）；
 //   ② 九重不动 ⇒ toosimple-extension 里岳不群的辟邪**九重**仍然有效，war116 不必重扫（157w 那个坑）。
 // 压缩后 quick3 相对 late 仍然**每一重都更高**（速成对比的正确参照是同为 tier4 的降龙那条 late 线）；
 // 相对 steady 则每一重都不高——**邪路不及正派，这正是 Tom 要的读感**。
 // 让出来的那部分优势改由「特效」承担（攻击距离／范围／几率点穴），清单与可行性见
 // editorial/九阳与邪路157.md 第十节与 reviews/wuji157-patch-suggestions.md P8。
 quick3:[.096,.19,.29,.39,.49,.60,.70,.80,.90,1],
};
// 157 乙′：quick3 的学习费用照抄 early（本方案只改威力曲线与耗内，**不改学习费用**）。
// 漏了这一条，B.cost 与 rankCost 会按曲线名取到 nil ——人物页「修炼曲线」那一行当场崩。
export const COST_STEPS={steady:[1,1,2,3,4,5,6,7,8,10],early:[2,2,3,4,5,6,7,8,9,10],quick3:[2,2,3,4,5,6,7,8,9,10],late:[1,1,2,3,4,6,8,11,15,20]};
export const aptitudeFactor=apt=>Math.max(.7,Math.min(1.7,1.7-Math.max(0,Math.min(100,apt))/100));
export const rankCost=(profile,apt,nextRank)=>{
 const steps=profile.costSteps??COST_STEPS[profile.curve];
 return Math.max(1,Math.ceil(profile.baseCost*aptitudeFactor(apt)*steps[Math.min(steps.length,Math.max(1,nextRank))-1]));
};
const resample=(values,length)=>Array.from({length},(_,i)=>{
 const x=i*(values.length-1)/Math.max(1,length-1),a=Math.floor(x),b=Math.min(values.length-1,a+1);
 return values[a]+(values[b]-values[a])*(x-a);
});
export const curveValue=(cap,curve,rank)=>Math.round(cap*CURVES[curve][Math.min(10,Math.max(1,rank))-1]);
const set=s=>new Set(s.split(',').map(Number));
const TOP=set('1,18,20,21,22,23,24,25,26,29,30,49,57,58,60,61,87,92');
const UPPER=set('6,11,12,13,14,15,16,17,19,27,28,48,51,52,53,54,55,56,59,63,66,67,68,83,88,91');
const BASIC=set('2,3,4,31,32,33,34,35,36,37,38,40,44,62,69,70,71,72,73,89,93');
const NON_HUMAN=set('0,74,75,76,79,84,90');
const LATE=set('1,18,20,21,23,24,25,30,57,58,61,92');
const EARLY=set('26,60');
const INTERNALS={
 39:{tier:3,curve:'late',cap:160,effect:'后劲：学成后，已交战的第三次及以后攻击，招式威力提高最多8%（**本作设定**：原著只写紫霞是华山气宗内功，未写「第三击起加威」这类机制）。'},
 40:{tier:4,curve:'steady',cap:160,effect:'拟运：五重、十重时外功每段耗内各减1，至少2；不影响吸内及普通拳脚。'},
 41:{tier:1,curve:'steady',cap:40,effect:'外层泥偶为基础内功，十重内力贡献基准40，不调和阴阳。'},
 42:{tier:4,curve:'late',cap:190,effect:'归元：被武功击中造成的伤势最多减轻30%；不自动复活。'},
 43:{tier:4,curve:'late',cap:200,effect:'护体前七重每重减伤0.8%；八重起的后段护体须亲历善行并悟法，品德70全效、50以下不生效，总计最多8%（**品德这道门槛是本作设定**；原著《天龙》回二十九说的是佛缘与勘破我相人相，不是善恶值）。依经研习可梳理吸星异气，八重并得少林老僧指点后可化尽余气；不等于阴阳兼修。'},
 44:{tier:3,curve:'late',cap:160,effect:'澄脉：武功附加的中毒量最多减轻30%；原游戏保留项，非自动认定原著绝学（**「洗髓經」三字十三部正文零命中**，唯一出处是新修版《天龙》的作者注，且是在谈现实中的少林寺）。'},
 // 157 丙订正（Tom 2026-09-22「乾坤大挪移和斗转星移应该带一部分反伤」，推翻旧的「无凭空反伤」）：
 // 反伤已由 artfx-extension.lua 落地（报告 editorial/反伤157.md），本行文案随实现改，不再写「不做反伤」。
 // **硬不等式（三方各自实测并钉死，改数值前先读这一行）**：乾坤七层 7/50＝.14 ＜ 九阳护体反震 3/20＝.15
 // ＜ 软猬甲倒刺 1/5＝.20。依据是《倚天》回20 叙述者「要知天下诸般内功，皆不逾九阳神功之藩篱」。
 // JIUYANG 的三项被动里**没有任何反震项**，所以本轮九阳改纯内功不触碰这条不等式。
 92:{tier:4,curve:'late',cap:100,effect:'共七层；临敌挪劲防御依次为1、2、3、5、6、8、10点。第七层知止存真，不强练有误口诀。另可回敬一部分来劲：按层数递进，第七层为攻方这一击的一成四，且只回敬**已发之劲**的一部分、不凭空生力（《倚天》回十九杨逍以挪移引韦一笑与四散人的掌力相攻）；**可与软猬甲倒刺、护体内功的反震相加**（Tom 2026-09-22 裁定「反伤可以叠加」，推翻此前的取大写法），但合计不超过**这一击的四分之一**，另沿用护体反震的单次绝对上限（攻方气血上限的二十分之一）。那个四分之一是**测出来的护栏**：纯叠加会让二周目圣堂十大善人后期从 12/144 抬到 20/144（＋2.4σ，违反「二周目不得变弱」），收到四分之一后回到 11/144。这一成四低于九阳护体的一成五，也低于软猬甲的两成。'},
 // 注意：上一行的 92 是**秘籍**乾坤大挪移；下面 95 才是九阳真经，它挂的**招式**代号也是 92，两者不是一回事。
 93:{tier:4,curve:'early',cap:150,effect:'疾行：学成后最多增加8点轻功；体质与传承沿现有剧情条件。'},
 94:{tier:4,curve:'late',cap:190,effect:'精微：外功招式威力最多增加8%；与紫霞同类增威取较强值。'},
 // 157 丙：九阳真经＝**纯内功**，不再驱动招式（原著《倚天》回16 叙述者：「纯系内功与武学要旨，没半招
 // 攻防的招数」）。原有的附毒减免保留，另加三项战斗内临时被动，数值见 JIUYANG。
 95:{tier:4,curve:'late',cap:200,effect:'护身纯内功，本身不出招。**本门的正业是增伤**：自身各门武功威力最多增加8%，逐重递增。另有两项附带的临敌护体——受敌方武功时防御力最多临时增加4点、抗毒能力最多临时增加30点；连同原有的「所受武功附毒量最多减轻40%」，合起来就是《倚天》回二十三所记的诸毒不侵。三项都只在战斗中生效，不写入人物面板。与太极拳原有节省内力相辅保留；与其他已练内功的同类效果各自生效。本作不再给它招式威力，原招式条目只留作境界记录。'},
};
// 156 首批 20 门：秘籍门槛折算表。键名照抄本作底表（不是逐梦的字段名），值直接写回 JY.Thing 的同名字段，
// 所以 CanUseThing 与 ui-extension 的 BrowserStudyRequirements 读到的是同一份值，不需要第二套判定。
// 需内力性质 0=阴、1=阳、2=不限（与底表一致）；需内力 读「内力最大值」（143 已定）。
// 列出的 19 本里有两处是折算后恰好不变、特意写出来以便复核：辟邪 需御剑能力 20（逐梦 40×0.5）、
// 玄铁 需御剑能力 50（100×0.5）、龙象 需拳掌功夫 60。吸星大法（64）逐梦本来就只有需经验，故不列门槛。
// 玄铁(77)、龙象(59) 的 removeAptitude 是 143 已定，本表不碰 需资质。
export const BOOK_GATES={
 39:{'需内力':30,'需内力性质':0},                       // 紫霞秘笈：逐梦 需内力300、阴
 55:{'需内力':25,'需拳掌功夫':30},        // 七伤拳谱：外功的旧需内力减半。157（2026-09-22）撤掉「需内力性质=0（阴）」——
 // content.js 的 items[55] 自己写的是 2（不限），原依据只有逐梦 MOD 一条，而本项目不拿 MOD 当原著；
 // 原著侧也不支持：谢逊在冰火岛传的是拳诀（《倚天》回8、回20），回21 张无忌「五行之气调阴阳」一拳震碎松树，全程无阴阳门槛。
 58:{'需内力':15,'需拳掌功夫':35},                       // 太极拳经：逐梦 拳掌70
 59:{'需内力':140,'需拳掌功夫':60},                      // 龙象般若功：逐梦 需内力1350
 62:{'需内力':100,'需拳掌功夫':70},                      // 降龙十八掌：逐梦 拳掌140；外功不该是内力门槛最高的一档
 // 156 主会话定案：折算得来的 需内力 950 会把本作已实装的「六脉一招半式」（legacy-extension 的无量山洞传承）
 // 整条挡死——legacy155／155b 两个测试当场变红。那不是取舍，是把做好的内容封掉。只取指爪折算的 70，
 // 需内力这一项按原样不动；逐梦的 9800 是它自己那套内力体系的数，本作内力上限 999，照搬没有意义。
 66:{'需拳掌功夫':70},                                   // 六脉神剑谱：逐梦 指爪140（本作并入拳掌）→70
 67:{'需御剑能力':10},                                   // 松风剑谱：逐梦 剑20，跨度的下端
 74:{'需内力性质':2,'需御剑能力':50},                    // 苗家剑法：去掉 DOS 遗留的阳性要求；逐梦 剑100
 77:{'需内力':50,'需御剑能力':50},                       // 玄铁剑法
 78:{'需御剑能力':20},                                   // 辟邪剑谱：折算后不变
 79:{'需御剑能力':70,'需资质':40},                       // 独孤九剑：逐梦 剑140、资质80
 80:{'需耍刀技巧':15},                                   // 血刀经：逐梦 刀30，低门槛＋陡曲线
 81:{'需耍刀技巧':70},                                   // 火焰刀法：逐梦 刀140、阳（阳性保留）
 84:{'需耍刀技巧':70},                                   // 胡家刀法：逐梦 刀140
 86:{'需特殊兵器':10},                                   // 毒龙鞭法：逐梦 特殊兵器20
 87:{'需特殊兵器':35},                                   // 黄沙万里鞭法：逐梦 特殊兵器70
 92:{'需内力':200,'需资质':25},                          // 乾坤大挪移：难在内力积累，不在天生资质
 95:{'需内力':200},                                      // 九阳真经：逐梦 需内力2000、阳（阳性保留）
};
// 156 统一入门心得（R3）：零级入门的定额，仍按资质系数浮动；一重之后照旧逐级付费，不重算历史支出（115 已定）。
// 打狗棒法在本作没有秘籍，它那一份记在 skills[87] 上，供丐帮授业事件读。
export const ENTRY_COST={67:5,86:10,39:35,58:35,87:35,80:40,64:50,74:50,77:50,78:50,81:50,84:50,55:55,79:55,59:65,92:65,62:70,66:70,95:75};
// 156：首批 20 门的招式说明。只写当前数值确实做到的事，不预告未接线的特色（balance156-findings F5：
// 面攻绝学在界面上「单体弱」，玩家看不出它群战最划算，这一条正是补给玩家看的）。
const ART_NOTES={
 6:'片杀：一击可及数人，人越多越划算；每段耗内高于同档的单点招式。',
 20:'厚积后劲，十级方见全力；与九阳神功相辅时另有省内力的既有效果。',
 25:'至刚至阳的掌法，厚积后劲；须阳性或调和内力。',
 28:'吸内不伤敌血：同一场里吸得越多异气越重，回气渐衰并增伤；本场所生异气战后自行平复，剧情所种异气须依易筋经研习化解。',
 30:'无形剑气，空手即可施展，不受刀剑代用的威力折减；每段耗内为全表最高之一。',
 55:'循序精进的重剑路子，不限内力属性。',
 57:'重剑无锋，厚积后劲；配玄铁重剑另有原版兵器加成。',
 60:'初见锋芒：一级即有可观威力，后段增长收窄；招式只及贴身一格。',
 61:'整片范围：单挑时面板威力与耗内都不好看，群战一次可及数人，每点内力的收益反而是全表最高。',
 63:'低门槛的速成刀法，十五点耍刀根基即可入门，成长靠后段堆叠。',
 66:'以内力发刀气，空手即可施展，不受刀剑代用的威力折减；代价是每段耗内高于同档刀法。',
 67:'循序精进，耗内适中；与苗家剑法招招相对。',
 77:'低门槛鞭法，耗内极低。',
 78:'鞭法，招式及远有限；须实际持鞭。',
 87:'棍法，须实际持棍杖方能施展。',
 89:'入门剑法，耗内极低；练满可为御剑根基添三十六点，是够到高阶剑学门槛的正路。',
 92:'纯内功，不作招式出手（《倚天》回十六：没半招攻防的招数）；境界与临敌增益记在九陽真經上。',
};
export function makeNativeBalance(C,{lastRankBonus=LAST_RANK_BONUS}={}){
 const skills={},books={};
 for(const row of C.skills){
  const id=row.id??row['代号'];if(NON_HUMAN.has(id)||id>93)continue;
  const tier=TOP.has(id)?4:UPPER.has(id)?3:BASIC.has(id)?1:2;
  const curve=EARLY.has(id)?'quick3':LATE.has(id)?'late':'steady';
  // 157 丙：92 九陽神功与吸内类武功走同一条「没有威力曲线」的路。它不是被削弱，是**形态判错的订正**：
  // 原版底表给它 shape 3 的群伤曲线，与《倚天》回16 正文直接抵触。底表那一行仍在（武学表 93 条不动），
  // 旧档里挂着它的人也不会报错——它只是不再产生伤害，境界改由 books.95 承担。
  const shape=row['攻击范围'];const drain=row['伤害类型']===1||id===JIUYANG.skill;
  const factor=[1,.86,.82,.68][shape]??1;
  // 157 乙′ 轴③：前两档上限 220/400→260/440，**tier3 620／tier4 900 一格不动**。唯一目的是放行
  // balance-combat.lua 的剔除线 `F_i < F_max/2`：左冷禅嵩山十重 F 124.9→147.7 > 门槛 138，从「任何重数
  // 都不出手」变成实测出手 18.6%（慕容复回峰落雁同理 0%→16.8%）。压顶是反面教材：无差别压顶会把二周目
  // 圣堂 134 late+ 从 4/48 推到 42–48/48（editorial/威力梯度157.md 3.5 的六套反证）。
  // 157 丁：逐门满级基准覆盖（ART_MAX_POWER）。不在表里的门一律走 档位×形状系数，一个数都不动。
  let maxPower=ART_MAX_POWER[id]??Math.round([0,260,440,620,900][tier]*factor);
  // 156（MOD 与原著对照）：形状系数按底表的攻击范围加价，独孤九剑底表恰好是 3，于是被算成全表最贵
  // （mpStep 11，与龙象、太玄并列），与原著「无招胜有招、不恃内力」和逐梦江湖行 1.20 的耗内 5 都相反。
  // 只给它一条具名例外，威力曲线（late 37→633）一格不动；其余武学的公式照旧。
  // 156：火焰刀法（66）以内力发刀气，balance-core.lua 的 武功类型=1 与 weapon-combat.lua 的 qi={30,66} 早已
  // 让它空手可用、豁免刀剑代用的 70% 折减；这条便宜一直没有对价。每段耗内 6→8 就是那个对价，威力不动。
  const LOW_DRAIN={61:6,66:8};
  // 157 乙′ 轴②：基向量 [0,2,3,5,8]→[0,1,2,5,12]（tier3 不动）。本作原本每点内力买到的威力 tier1 110、
  // tier4 116——绝学既强又不贵，是四份参照里唯一持平的（逐梦 1:0.08、原版 1:1.12）。改后为 260/220/124/78
  // ＝1:0.50，耗内倍差 4×→12×。**绝学是杀招不是饭碗**：长仗里内力见底后必须换普通武功（实测 149 回合的
  // 绝学/门派出手比 92/8→23/77）。代价已知并接受：以单门 tier4 为唯一主攻的打法在超长仗里会打空内力。
  const mpStep=drain?0:id===1?6:LOW_DRAIN[id]??Math.ceil([0,1,2,5,12][tier]*(shape===3?1.35:shape===0?1:1.15));
  // 157：蛤蟆功（22）曾被单独抹成 0，且原来没有任何注释。Tom 2026-09-18 裁定「蛤蟆功本身也带毒，
  // 这样可以简化部分角色的设计」——特例取消，它和别的带毒招式走同一条规则。
  // 底表给它 敌人中毒点数=50，是全表唯一的两位数（其余 3~10），那个 50 是**原版游戏自己的数、不是金庸写的**；
  // 这里照样按封顶 6 计（与神王毒掌、寒冰神掌同档），威力随规则降 12%——不开特例、不给它高出别人一头的毒。
  const poison=Math.min(6,row['敌人中毒点数']||0);
  if(poison)maxPower=Math.round(maxPower*(1-.02*poison));
  const power=CURVES[curve].map(v=>drain?0:Math.round(maxPower*v));
  skills[id]={id,name:row['名称'],tier,curve,baseCost:[0,35,65,110,170][tier],shape,mpStep,poison,power,
   damageType:row['伤害类型'],range:Array.from({length:10},(_,i)=>row['移动范围'+(i+1)]),area:Array.from({length:10},(_,i)=>row['杀伤范围'+(i+1)]),
   entryMax:tier<=2?3:tier===3?2:1,...(ART_NOTES[id]?{effect:ART_NOTES[id]}:{})};
  if(tier===4&&!drain&&id!==18&&lastRankBonus>0){
   // 157 丙：末级增幅照旧算，再压到 LAST_RANK_CAP 给的那条顶。上限低于曲线自带的十重时（quick3 的两门），
   // plainTenth 与 tenth 一起落到同一个数——邪路从此**没有**绝学末级增幅那份额外收益，
   // 一周目敌方（balance-combat 的 firstJourneyEnemyLastRank 读 plainTenth）与玩家拿到的是同一个值。
   const ceiling=LAST_RANK_CAP_ART[id]??Math.round(maxPower*(LAST_RANK_CAP[curve]??LAST_RANK_CAP.late)/1000);
   const plainTenth=Math.min(power[9],ceiling);
   const tenth=Math.min(Math.round(power[8]+lastRankBonus*(power[8]-power[0])/8),ceiling);
   if(tenth!==power[9]||plainTenth!==power[9])Object.assign(skills[id],{plainTenth,power:[...power.slice(0,9),tenth]});
  }
 }
 // Extra native family forms are not the complete Bixie transmission.
 if(!skills[93])skills[93]={...structuredClone(skills[31]),id:93,name:'家传辟邪剑法'};
 // 156：打狗棒法在本作没有秘籍（93 门里 58 门无书），门槛无处可挂，只能接在丐帮授业事件的判定上。
 // 这里只是把「授业时该查什么」写成数据；补不补一本秘籍是叙事问题，本批不擅自加书。
 if(skills[87])Object.assign(skills[87],{entryCost:50,gates:{'需特殊兵器':70}});
 // Keep attained ranks 1–10 and native combat tables intact. The three later
 // ranks require explicit paid study; each adds only 4% of rank-ten power.
 // **157 丁（Tom 2026-09-23：「龙象般若功最后三种层提高伤害，最终达到900左右」＋「也该同时增加内力」）**
 // 末三层从「各 +4%」（636/661/685）改成**等差 +96**：708 / 804 / **900**。十层 612 一格不动。
 // 为什么威力等差、代价等比——这两条都来自《神雕》回37 叙述者那一段（①档）：
 //   「密宗中至高无上的护法神功」「共分十三层」「第二层比第一层加深一倍……第三层又比第二层加深一倍」
 //   「**如此成倍递增，越是往后，越难进展**」「待到第五层以后……往往便须三十年以上苦功」
 //   「密宗一门……**从未有一人练到十层以上**」「若有人得享千岁高龄，最终必臻第十三层境界」
 // 原著写死的是**难度成倍递增**，没说威力成倍递增。所以：**代价 ×2 递增（28→56→112），威力等差 +96**。
 // 两者相除就是 Tom 要的「越往后越难」：每层买到的 96 点威力，分别要付 28／56／112 单位心得
 // ——**同样一层，后一层的性价比正好是前一层的一半**。
 // 正邪判定（与「邪功最终略弱于顶级正派」那条裁定的关系）：**龙象是正派武学**，回37 叙述者原话是
 // 「密宗中至高无上的**护法神功**」，佛门护法，持有者是反派不等于武功是邪派；而且它要在十层之后
 // 再付 196 单位心得（1→10 全程才 71 单位），是全表**最循序渐进**的一门，与「速成歪路」正相反。
 // 900 仍低于降龙十八掌 932，不与那条裁定冲突。
 const dragon=skills[18],tenth=dragon.power[9],DRAGON_STEP=96;
 Object.assign(dragon,{maxRank:13,rankUnit:'层',
  power:[...dragon.power,...[1,2,3].map(n=>tenth+DRAGON_STEP*n)],
  costSteps:[...COST_STEPS.late,28,56,112],
  effect:'共十三层，密宗护法神功，内外兼修。十层以后须继续研习，十一至十三层各较上一层增加'+DRAGON_STEP+'点招式威力，至十三层'+(tenth+DRAGON_STEP*3)+'；每层所需心得较上一层加倍，且每段耗内递增。修习本功另增内力上限，按层数递进。增长数值为游戏设计，逐层加倍的难度本于原著。'});
 // 内功秘籍境界按「重」计，与效果文案（五重/十重）及承前世对白同一口径；乾坤（92）随后仍改为「层」。
 for(const row of C.items){
  const id=row.id??row['代号'];if(!(id>=39&&id<=95)||id>=48&&id<=53)continue;
  const skill=skills[row['练出武功']];const inner=INTERNALS[id];
  const tier=inner?.tier??(id>=45&&id<=47?id-43:id>=88&&id<=90?2:id===91?4:skill?.tier??2);
  const curve=inner?.curve??skill?.curve??'steady';
  books[id]={id,name:row['名称'],skill:row['练出武功'],tier,curve,
   baseCost:inner?[0,30,60,110,170][tier]:id===91?500:skill?.baseCost??[0,35,65,110,170][tier],
   maxRank:id===91?1:skill?.maxRank??10,rankUnit:inner?'重':skill?.rankUnit??'级',mp:inner?CURVES[curve].map(v=>Math.round(v*inner.cap)):[],effect:inner?.effect??skill?.effect??'',
   ...(skill?.costSteps?{costSteps:skill.costSteps}:{}),
   entryMax:skill?.entryMax??1,
   agility:id>=45&&id<=47?CURVES[curve].map(v=>Math.round(v*({45:24,46:32,47:40}[id]))):[],
   throw:id>=88&&id<=90?CURVES[curve].map(v=>Math.round(v*({88:20,89:30,90:25}[id]))):[],
   ...(skill&&id!==95?{power:skill.power,mpStep:skill.mpStep,shape:skill.shape,damageType:skill.damageType}:{}),
   // These old aptitude gates are not blanket talent bans supported by the novels.
   removeAptitude:[43,59,61,77].includes(id),
   // 156 首批：折算后的秘籍门槛与统一入门心得。两者都是既有字段换值，不新增判定层。
   ...(BOOK_GATES[id]?{gates:{...BOOK_GATES[id]}}:{}),
   ...(ENTRY_COST[id]?{entryCost:ENTRY_COST[id]}:{}),
   // 157 丙：九阳真经的三项临敌被动随数据一起生成，jiuyang-extension.lua 直接读
   // BrowserMartialBalance.data.books[95].passive，两边不会各写一份常数。
   ...(id===JIUYANG.book?{passive:{...JIUYANG.passive}}:{}),
  };
 }
 // 157 丁（Tom：「既然如此龙象般若功也该同时增加内力，不然消耗太大」）：
 // 龙象是**武功书**不是内功书，所以不进 INTERNALS，但它按层数贡献内力上限。
 // 满层 160 ＝ 紫霞秘笈／小无相功／洗髓經／神照經 那一档，**低于易筋经与九阳真经的 200**
 // （Tom 只说低于 200；取 160 是为了落在既有的一档上，而不是另造一个数）。
 // 依据：《神雕》回37 叙述者「密宗中至高无上的护法神功」——护法神功是内外兼修，不是纯外功；
 // 本作原先只给它伤害、不给内力，与这句不符，而十三层一击 100 点内力又是全表最贵。
 // ⚠ **接线警告**：`growth-core.lua:288` 的 mpPerRank 表**不含 59**，而 144 双栏那一支是
 // `for book in pairs(mpPerRank)` 遍历**那张表的键**来合并内力贡献的 ⇒ **只加这里的 mp[] 不会生效**。
 // 那张表归 GROWTH 那一束，本轮不改；补丁写在 reviews/wuji157-patch-suggestions.md P10，
 // 实测见 editorial/九阳与邪路157.md 第十八节（**实测过，不是推断**）。
 if(books[59])books[59].mp=resample(CURVES.late,13).map(v=>Math.round(v*160));
 books[41].inner={...books[41],name:'罗汉伏魔神功',tier:3,curve:'late',baseCost:110,
  mp:CURVES.late.map(v=>Math.round(v*160)),effect:'澄心：修至五重即能调和阴阳；十重内力贡献基准160。更换修炼对象不失去调和能力。'};
 Object.assign(books[92],{maxRank:7,rankUnit:'层',mp:resample(books[92].mp,7).map(Math.round),
  // Sum remains 71 cost units, as for the previous ten-rank late curve.
  costSteps:[1,2,4,7,12,19,26],guard:[1,2,3,5,6,8,10]});
 return {revision:BALANCE_REVISION,curves:CURVES,costSteps:COST_STEPS,skills,books};
}
export function applyArtNumbers(rows,balance){
 for(const [id,art] of Object.entries(balance.skills)){
  const row=rows[id];if(!row)continue;
  row['消耗内力点数']=art.mpStep;row['敌人中毒点数']=art.poison;
  art.power.slice(0,10).forEach((v,i)=>row['攻击力'+(i+1)]=v);
 }
}
// Candidate-only numerical envelope; acquisition, novel authenticity and a
// completed combat implementation remain separately labelled in the catalogue.
export function candidateProfile(entry){
 const tier=Math.max(1,Math.min(4,entry.tier||2));const curve=entry.curve in CURVES?entry.curve:'steady';
 const kind=entry.kind;
 const baseCost=[0,35,65,110,170][tier];
 if(kind==='internal'){
  const maxRank=entry.id==='yu-nu-xin-jing'?9:10,rankUnit=maxRank===9?'段':'重';
  return {tier,curve,baseCost,maxRank,rankUnit,mp:resample(CURVES[curve],maxRank).map(v=>Math.round(v*[0,40,100,160,200][tier])),
   costSteps:resample(COST_STEPS[curve],maxRank),effect:'候选内力贡献基准，专属机制及剧情尚未接入'};
 }
 if(kind==='lightness')return {tier,curve,baseCost,agility:CURVES[curve].map(v=>Math.round(v*[0,12,20,30,40][tier])),effect:'候选身法，按最强贡献计算，不逐门叠加'};
 if(kind==='support')return {tier,curve,baseCost,effect:'非直接伤害技：逐项设计触发条件、上限和冷却，暂不伪造统一伤害数值'};
 // 157 乙′：与已接入武学的单点档位同步（上限 [0,260,440,620,900]、耗内基向量 [0,1,2,5,12]）。
 return {tier,curve,baseCost,mpStep:[0,1,2,5,12][tier],power:CURVES[curve].map(v=>Math.round(v*[0,260,440,620,900][tier])),shape:0,effect:'单体数值基准；范围、附毒、吸内或连击须从此预算折减'};
}
