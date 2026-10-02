-- The clay figures reveal their inner carving only after ten real ranks.
-- Source rest stays intact; the growth core owns the unique permanent reward.
local innScenes={[1]=true,[3]=true,[40]=true,[60]=true,[61]=true,[70]=true}
local function enabled()
 return browser_journey_get('trial')~=true and BrowserLuohanState and BrowserLuohanState()~=nil
end
local function ownerAtTen()
 for i=1,CC.TeamNum do
  local pid=JY.Base['队伍'..i];local p=pid and pid>=0 and JY.Person[pid]
  if p and BrowserLuohanReady(pid) and p['生命']>0 and p['中毒程度']==0 and p['受伤程度']==0 then return pid end
 end
end
local function ownsFigures()
 for i=1,CC.MyThingNum do if JY.Base['物品'..i]==41 and JY.Base['物品数量'..i]>0 then return true end end
 return false
end
local function discover()
 if not enabled() or JY.Status==GAME_WMAP or not innScenes[JY.SubScene] or BrowserLuohanState().revealed or not ownsFigures() then return end
 local pid=ownerAtTen();if not pid then return end
 local actor=JY.Person[pid];local side=pid==0 and 1 or 0
 TalkEx(pid==38 and '坏了……我才捏了一下，泥皮怎就掉了一块？' or '这泥偶练法已运转自如，收功时竟碰落了一片泥皮。',actor['头像代号'],side)
 DrawStrBoxWaitKey('裂口下面露出一线木纹，灯下隐约泛着油光。')
 DrawStrBoxWaitKey(BrowserLuohanState().first==pid and '拂去浮泥后，首位修满者的40点内力根基将永久保留，不再占所学名额。内层练法须另行研习；其余人的外层修为先保留，转修时原有投入可抵扣本门费用。' or '这份旧日记录未留下谁先修满，归属不明的永久根基不会补发。现有外层修为保留，转修内层时原有投入可抵扣本门费用。')
 local rows={{'拂去浮泥',nil,1},{'先收起来',nil,1}}
 if ShowMenu(rows,#rows,0,0,0,0,0,1,1,24,0,0)~=1 then return end
 local ok=BrowserLuohanReveal(pid);if not ok then return end
 TalkEx(pid==38 and '咦，里头这个在笑。黑道道也和外头的不一样。' or '彩泥下面竟是木罗汉，这些墨线另有路数。',actor['头像代号'],side)
 DrawStrBoxWaitKey('浮泥拂落，十八尊桐油木罗汉显出不同神态。周身墨线与外层练法不同，也没有穴位圈点。')
 TalkEx(pid==38 and '瞧着这个笑的，我心里倒静些。我再好好看看。' or '先收定心神，再细看这内里的运功路数。',actor['头像代号'],side)
 DrawStrBoxWaitKey('内层练法须重新选定：打开人物的「穿戴」页，在「内功」栏选择「罗汉伏魔神功」，方可继续研习。')
end
-- Called after the whole lodging event, once the party has woken up.
BrowserRestDiscovery=discover
local sourceDetails=BrowserItemDetails
BrowserItemDetails=function(id)
 local t=sourceDetails(id)
 if id~=41 or not enabled() then return t end
 if BrowserLuohanState().revealed then
  t['名称']='罗汉伏魔神功'
  t['物品说明']='彩泥下藏着十八尊桐油木罗汉，周身墨线别有练法。所藏为罗汉伏魔神功，须澄心静虑，细究其意。'
 else
  t['物品说明']='十八个彩泥小人，表面绘着运功路线。同行者将此物练至十重后，可在客栈休整时细看松动的泥皮。'
 end
 return t
end
