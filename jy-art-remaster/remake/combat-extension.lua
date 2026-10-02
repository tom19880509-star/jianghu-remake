-- Optional body-evasion and critical trial. Classic delegates unchanged.
local sourceLifeHurt=War_WugongHurtLife
function War_WugongHurtLife(emenyid,wugong,level)
    local balanced=BrowserBalanceEnabled and BrowserBalanceEnabled()
    local enhanced=lib.EnhancedCombat()
    if not enhanced and not balanced then return sourceLifeHurt(emenyid,wugong,level) end             --计算武功伤害生命
    local pid=WAR.Person[WAR.CurID]["人物编号"];
    local eid=WAR.Person[emenyid]["人物编号"];
    local weapon=BrowserHeldWeapon and BrowserHeldWeapon(pid) or JY.Person[pid]['武器']
    local enemyWeapon=BrowserHeldWeapon and BrowserHeldWeapon(eid) or JY.Person[eid]['武器']

    --计算武学常识
    local mywuxue=0;
    local emenywuxue=0;
    for i=0,WAR.PersonNum-1 do
        local id =WAR.Person[i]["人物编号"]
        if WAR.Person[i]["死亡"]==false and JY.Person[id]["武学常识"]>80 then
            if WAR.Person[WAR.CurID]["我方"]==WAR.Person[i]["我方"] then
                mywuxue=mywuxue+JY.Person[id]["武学常识"];
            else
                emenywuxue=emenywuxue+JY.Person[id]["武学常识"];
            end
        end
    end

    --计算实际使用武功等级
    while true do
        if math.modf((level+1)/2)*JY.Wugong[wugong]["消耗内力点数"] > JY.Person[pid]["内力"] then
            level=level-1;
        else
            break;
        end
    end

    if level<=0 then     --防止出现左右互博时第一次攻击完毕，第二次攻击没有内力的情况。
	    level=1;
    end

    local function agility(p)
        local a=p['轻功'];for _,k in ipairs({'武器','防具'}) do local item=p[k];if item>=0 then a=a+(JY.Thing[item]['加轻功'] or 0) end end;return a
    end
    local hit,chance=100,0
    if enhanced then hit,chance=lib.CombatChances(agility(JY.Person[pid]),agility(JY.Person[eid]),level,JY.Person[pid]['武学常识']) end
    if enhanced and Rnd(10000)>=hit*100 then lib.CombatOutcome(eid,'dodge',0,hit,chance);return 0 end
    local critical=enhanced and Rnd(10000)<chance*100
    --武功武器配合增加攻击力
    local fightnum=0;
    for i,v in ipairs(CC.ExtraOffense) do
        if v[1]==weapon and v[2]==wugong then
            fightnum=v[3];
            break;
        end
    end

    --计算攻击力
    local power=JY.Wugong[wugong]["攻击力" .. level]
    if balanced then
      power=BrowserMartialBalance.damage(pid,eid,wugong,level,power)
      if BrowserTechniquePower then power=BrowserTechniquePower(pid,wugong,power) end
    end
    fightnum=fightnum+(JY.Person[pid]["攻击力"]*3+power)/2;

    if weapon>=0 then
        fightnum=fightnum+JY.Thing[weapon]["加攻击力"];
    end
    if JY.Person[pid]["防具"]>=0 then
        fightnum=fightnum+JY.Thing[JY.Person[pid]["防具"]]["加攻击力"];
    end
    fightnum=fightnum+mywuxue;

    --计算防御力
    local defencenum=JY.Person[eid]["防御力"];
    if enemyWeapon>=0 then
        defencenum=defencenum+JY.Thing[enemyWeapon]["加防御力"];
    end
    if JY.Person[eid]["防具"]>=0 then
        defencenum=defencenum+JY.Thing[JY.Person[eid]["防具"]]["加防御力"];
    end
    defencenum= defencenum+ emenywuxue;

    --计算实际伤害
    local hurt=(fightnum-3*defencenum)*2/3+Rnd(20)-Rnd(20);
    if hurt <0 then
        hurt=Rnd(10)+1;
    end
    if balanced and BrowserMartialBalance.glance then
        -- 155: smooth glancing branch on top of the source floor (nobody hits softer than 154); +-10% spread.
        -- 155b: the attacker's side picks the rate (first-journey enemies do not glance; see balance-core).
        local sideRate=BrowserMartialBalance.sideGlanceRate and BrowserMartialBalance.sideGlanceRate(WAR.Person[WAR.CurID]["我方"]==true) or nil
        local glance=BrowserMartialBalance.glance(fightnum,3*defencenum,sideRate)
        -- Draw the spread only when the branch can win, so clear hits keep the source random stream.
        if glance>0 and glance*1.1>hurt then hurt=math.max(hurt,glance*(90+Rnd(21))/100) end
    end
    hurt=hurt+JY.Person[pid]["体力"]/15+JY.Person[eid]["受伤程度"]/20;

    --考虑距离因素
    local offset=math.abs(WAR.Person[WAR.CurID]["坐标X"]-WAR.Person[emenyid]["坐标X"])+
                 math.abs(WAR.Person[WAR.CurID]["坐标Y"]-WAR.Person[emenyid]["坐标Y"]);

    if offset <10 then
        hurt=hurt*(100-(offset-1)*3)/100;
    else
        hurt=hurt*2/3;
    end

    hurt=math.modf(hurt);
    if hurt<=0 then
        hurt=Rnd(8)+1;
    end

    if balanced then hurt=BrowserMartialBalance.hurt(pid,eid,hurt)end
    local basehurt=hurt
    if critical then hurt=math.max(1,math.floor(hurt*1.35)) end
    JY.Person[eid]["生命"]=JY.Person[eid]["生命"]-hurt;
    WAR.Person[WAR.CurID]["经验"]=WAR.Person[WAR.CurID]["经验"]+math.modf(basehurt/5);

    if JY.Person[eid]["生命"]<0 then                 --打死敌人获得额外经验
        JY.Person[eid]["生命"]=0;
        WAR.Person[WAR.CurID]["经验"]=WAR.Person[WAR.CurID]["经验"]+JY.Person[eid]["等级"]*10;
    end

    AddPersonAttrib(eid,"受伤程度",balanced and BrowserMartialBalance.injury(eid,math.modf(basehurt/10)) or math.modf(basehurt/10));

    --敌人中毒点数
    local poisonnum=level*JY.Wugong[wugong]["敌人中毒点数"]+JY.Person[pid]["攻击带毒"];

    if JY.Person[eid]["抗毒能力"]< poisonnum and JY.Person[eid]["抗毒能力"]<90 then
         AddPersonAttrib(eid,"中毒程度",balanced and BrowserMartialBalance.poison(eid,math.modf(poisonnum/15)) or math.modf(poisonnum/15));
    end

    if enhanced then lib.CombatOutcome(eid,critical and 'critical' or 'hit',hurt,hit,chance)end
    return hurt;
end
