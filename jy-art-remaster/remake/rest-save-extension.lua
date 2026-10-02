-- Install last: an entire lodging event (payment, wake-up, side quest) must
-- finish before discoveries and saving. Healing elsewhere grants no save window.
(function()
 local places={[1]=true,[3]=true,[40]=true,[60]=true,[61]=true,[70]=true}
 local lodging={[235]=true,[480]=true,[502]=true,[575]=true,[658]=true,[664]=true,[931]=true,[667]=true}
 -- 定价（Tom 2026-10-02 裁定，保留各店差异）：source 是原事件脚本里的房钱，prices 是本版实收；不同的在事件运行期间改写（见下）。龙门旧招牌 575 从 20 改 5。
 local source={[235]=100,[480]=50,[502]=200,[575]=20,[658]=40,[664]=20}
 local prices={[235]=20,[480]=10,[502]=50,[575]=5,[658]=8,[664]=5,[931]=0}
 local scope=nil;local saving=false;local wake=nil
 local yesno=DrawStrBoxYesNo
 DrawStrBoxYesNo=function(x,y,text,...)
  if scope and scope.price~=nil and
   (text:find('是否住宿',1,true) or text:find('仍要休息吗',1,true)) then
   local silver=0
   for i=1,CC.MyThingNum do
    if JY.Base['物品'..i]==174 then silver=JY.Base['物品数量'..i] or 0;break end
   end
   return coroutine.yield('yesno',text,scope.price,silver)==1
  end
  return yesno(x,y,text,...)
 end
 local event=oldCallEvent;local rest=instruct_12;local save=SaveRecord
 local loadRecord=LoadRecord;local readMenu=Menu_ReadRecord;local cycle=Game_Cycle
 local function atRestPlace()return JY.Status==GAME_SMAP and places[JY.SubScene]==true end
 SaveRecord=function(id)
  if not saving or not atRestPlace() or (id~=1 and id~=2 and id~=3) then
   DrawStrBoxWaitKey('行路未歇，先寻一处落脚。在家中卧榻或客栈睡上一觉，便可保存进度。');return false
  end
  browser_rest_save(JY.SubScene,JY.Base['人X1'],JY.Base['人Y1'],JY.Base['人方向'],id)
  save(id)
  return browser_save_ok()
 end
 Menu_SaveRecord=function()
  if not saving or not atRestPlace() then
   DrawStrBoxWaitKey('进度须在家中或客栈歇宿后保存。家中卧榻不收银两；已探明的住处可从江湖图前往。');return 0
  end
  local id=coroutine.yield('rest-save',JY.Scene[JY.SubScene]['名称'])
  if id==1 or id==2 or id==3 then SaveRecord(id) end
  return 0
 end
 Menu_System=function()
  local rows={{'读取进度',Menu_ReadRecord,1},{'如何保存',Menu_SaveRecord,1},{'离开游戏',Menu_Exit,1}}
  local r=ShowMenu(rows,#rows,0,CC.MainSubMenuX,CC.MainSubMenuY,0,0,1,1,CC.DefaultFont,C_ORANGE,C_WHITE)
  return r and r<0 and 1 or 0
 end
 instruct_12=function(...)
  local result=table.pack(rest(...))
  if scope and scope.scene==JY.SubScene and atRestPlace() then scope.slept=true end
  return table.unpack(result,1,result.n)
 end
 oldCallEvent=function(id,...)
  local own=not scope and atRestPlace() and lodging[id] and
   (id~=931 or JY.SubScene==70) and (id~=667 or JY.SubScene==1)
  if own then scope={scene=JY.SubScene,slept=false,price=prices[id]} end
  local current=scope
  -- 定价：原事件脚本写死的房钱只在本次住宿事件运行期间改写（判银 instruct_31 与扣银 instruct_32 同改），事件结束即还原；原事件不改。
  local check,pay=instruct_31,instruct_32
  if own and source[id] and source[id]~=prices[id] then
   local old,new=source[id],prices[id]
   instruct_31=function(n,...) if n==old then n=new end return check(n,...) end
   instruct_32=function(thing,n,...) if thing==174 and n==-old then n=-new end return pay(thing,n,...) end
  end
  local result=table.pack(pcall(event,id,...))
  instruct_31,instruct_32=check,pay
  if own then scope=nil end
  if not result[1] then error(result[2],0) end
  if own and current.slept and atRestPlace() and current.scene==JY.SubScene then
   BrowserRestDiscovery()
   saving=true
   local finished=table.pack(pcall(Menu_SaveRecord))
   saving=false
   if not finished[1] then error(finished[2],0) end
  end
  return table.unpack(result,2,result.n)
 end
 -- 155o 圣堂门前破例存档：身世层演完系统扫描后经 rawget 调用；读档回到门前。
 -- 返回 true 才算真的存成（玩家选了存档位且写入成功）；取消或失败返回 false，身世层据此不显示“已封存”，本程机会不消耗。
 BrowserDoorSave=function()
  if JY.Status~=GAME_SMAP or JY.SubScene~=83 then return false end
  places[83]=true;saving=true
  local done=table.pack(pcall(function()
   local id=coroutine.yield('rest-save','归梦之门前')
   if id==1 or id==2 or id==3 then return SaveRecord(id)==true end
   return false
  end))
  saving=false;places[83]=nil
  if not done[1] then error(done[2],0) end
  return done[2]==true
 end
 LoadRecord=function(id)
  wake=nil
  local result=table.pack(loadRecord(id))
  if id>=1 and id<=3 then wake=browser_rest_state() end
  return table.unpack(result,1,result.n)
 end
 local function wakeHere()
  local point=wake;wake=nil
  if not point or not (places[point.scene] or point.scene==83) then return end
  JY.SubScene=point.scene;JY.Status=GAME_SMAP;JY.CurrentD=-1;JY.Darkness=0
  JY.Base['人X1']=point.x;JY.Base['人Y1']=point.y;JY.Base['人方向']=point.direction
  JY.MyCurrentPic=0;JY.MyPic=GetMyPic();JY.MMAPMusic=-1
  CleanMemory();if (JY.MmapMusic or -1)<0 then JY.MmapMusic=16 end;Init_SMap(0)
  -- Resume a settled room, not the event that originally led to the sleep.
  JY.OldDPass=GetS(JY.SubScene,point.x,point.y,3)
 end
 Menu_ReadRecord=function(...)
  local result=table.pack(readMenu(...));if result[1]==1 then wakeHere() end
  return table.unpack(result,1,result.n)
 end
 -- A fatal event reads directly from instruct_15 while Game_Cycle is already
 -- running. Finish the old scene's event cleanup before restoring the room;
 -- the title-only Game_Cycle entry hook will not run again after this read.
 local sceneCycle=Game_SMap
 Game_SMap=function(...)
  local result=table.pack(sceneCycle(...))
  if wake and JY.Status==GAME_FIRSTMMAP then wakeHere() end
  return table.unpack(result,1,result.n)
 end
 Game_Cycle=function(...)wakeHere();return cycle(...) end
end)()
