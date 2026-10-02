-- New games only. This runs before journey legacies and growth snapshots.
do
 local originalNewGame=NewGame
 NewGame=function()
  if browser_test_battle()>=0 then return originalNewGame() end
  LoadRecord(0)
  JY.Person[0]['姓名']=CC.NewPersonName
  coroutine.yield('character-create')
  local stats=browser_creation_attributes()
  assert(type(stats)=='table','Missing confirmed character creation')
  for key,value in pairs(stats) do JY.Person[0][key]=value end
 end
end
