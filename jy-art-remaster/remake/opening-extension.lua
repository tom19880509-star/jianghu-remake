-- The tutorial keeps the original home event and reward records. No save migration.
local openingSourceEvent=oldCallEvent
local function readNote(id) instruct_1(id,114,0) end
instruct_51=function()
 local groups={
  {'重读留笺',{2526,2544}},
  {'行走与交谈',{2547}},
  {'箱匣与行囊',{2548,2555}},
  {'装备与修炼',{2558,2554}},
  {'疗伤与休息',{2552,2562}},
  {'同伴与行事',{2553,2560,2563}},
  {'保存与换设备',{2551}}
 }
 while true do
  local menu={};for i,entry in ipairs(groups) do menu[i]={entry[1],nil,1} end
  menu[#menu+1]={'合上札记',nil,1}
  local r=ShowMenu(menu,#menu,0,0,0,0,0,1,1,CC.DefaultFont,C_WHITE,C_WHITE)
  if not r or r<1 or r>#groups then return end
  for _,id in ipairs(groups[r][2]) do readNote(id) end
 end
end
oldCallEvent=function(id)
 if id~=691 or JY.SubScene~=70 then return openingSourceEvent(id) end
 -- No mascot materialization or legacy comic animation. The same cell holds a note.
 instruct_1(2520,0,1)
 JY.MyCurrentPic=0;JY.MyPic=GetMyPic()
 instruct_1(2521,0,1)
 instruct_1(2523,0,1)
 readNote(2526)
 readNote(2544)
 instruct_1(2545,0,1)
 instruct_1(2546,0,1)
 -- Identical completion flags to source 691; every cabinet remains source-controlled.
 instruct_3(-2,0,0,0,-1,-1,-1,-1,-1,-1,-2,-2,-2)
 instruct_3(-2,1,-2,-2,692,-1,-1,-2,-2,-2,-2,-2,-2)
 DrawStrBoxWaitKey('先点屋中木柜，带上盘缠和药物。点地面行走；手机可用左下摇杆，电脑可用方向键或 WASD。卧榻歇宿可恢复气血、内力并选择存档。再去对面客栈问路、拜访南贤；江湖图只记录已到访的地方，可点选返回。')
end
