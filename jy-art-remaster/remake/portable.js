// Transfer the original three save buffers; graphics preferences never alter them.
import {normalizeJourney,normalizeProfile,mergeProfiles,readProfile,PROFILE_KEY,journeyLabel,bindJourneyEcho} from './journey.js';
const sizes = { r: 114242, s: 4915200, d: 440000 };
const stamp = (date) => new Date(date).toLocaleString("zh-CN", {hour12:false});
// Q1 2026-10-02：别的版本写下、本版读不懂的存档位（更新或回退后）不再拖垮整个菜单：标为暂不兼容，
// 仍可原样导出，带到能读它的设备；另两位照常导出。读得懂的存档与原先逐字相同。
const labelOf = (save) => { try { return journeyLabel(normalizeJourney(save.journey)); } catch { return "本版本暂不兼容，可原样导出"; } };
const journeyForExport = (journey) => { try { return normalizeJourney(journey); } catch { return journey; } };
const profileForExport = async (db) => { try { const p = await readProfile(db); return p.highestClearedCycle ? p : null; } catch { return null; } };
function base64(data) {
  const a = new Uint8Array(data), chunks = [];
  for (let i = 0; i < a.length; i += 8192) chunks.push(String.fromCharCode(...a.subarray(i, i + 8192)));
  return btoa(chunks.join(""));
}
export function decodePortableSave(raw) {
  if (raw?.format !== "jy-remake-save" || raw.version !== 1 || !Number.isFinite(raw.date) || raw.date <= 0)
    throw Error("这不是本游戏导出的存档文件。");
  const save = { date: raw.date };
  for (const [key, length] of Object.entries(sizes)) {
    const text = raw[key];
    if (typeof text !== "string" || text.length !== Math.ceil(length / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text))
      throw Error("存档不完整，请从原设备重新导出。");
    save[key] = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
    if (save[key].length !== length) throw Error("存档版本或大小不匹配。");
  }
  if(raw.journey!==undefined)save.journey=normalizeJourney(raw.journey);
  if(raw.journeyProfile!==undefined)save.journeyProfile=normalizeProfile(raw.journeyProfile);
  // The file's own past is fixed before merging this device's completion profile.
  if(save.journey)bindJourneyEcho(save.journey,save.journeyProfile);
  return save;
}
export function mountPortableMenu(db, { graphicsMode, beforeOpen, getCombatRules, setCombatRules, getBattleView = () => ({zoom:'near', grid:true}), setBattleView = () => {} }) {
  const modal = document.createElement("dialog");
  modal.id = "portable-menu";
  modal.setAttribute("aria-labelledby", "portable-title");
  modal.innerHTML = `
    <div class="portable-heading"><h2 id="portable-title">存档与画面</h2><button id="portable-close" aria-label="关闭存档与画面">关闭</button></div>
    <div id="portable-options">
    <section class="save-guide" aria-label="保存进度的方法"><h3>保存进度 · 先歇一晚</h3><p>回家点击卧榻，或向客栈掌柜选择住宿。醒来完成对话后会出现三个存档位，选一个保存。</p><p>家中休息免费；江湖图可传送到已探索的住处。路上不会自动保存。</p><p id="portable-last-save" role="status"></p></section>
    <h3>备份与换设备</h3><p>下方「导出」只备份上次保存的进度，不会保存正在玩的这一刻。电脑和手机各有三个存档位；换设备时导出文件，再在另一台设备导入。</p>
    <label for="portable-slot">要使用的存档位</label><select id="portable-slot"></select>
    <button id="portable-export">导出此存档</button>
    <button id="portable-export-local" hidden>保存到本机工程 output/</button>
    <hr><label for="portable-file">从另一台设备带来的存档</label>
    <input id="portable-file" type="file" accept=".json,application/json">
    <p id="portable-file-info">请选择本游戏导出的 .jy-save.json 文件。</p>
    <button id="portable-import" disabled>导入到所选存档位并返回首页</button>
    <hr><label for="portable-art">画面</label>
    <select id="portable-art"><option value="classic">流畅 · 重绘人物与经典地图（手机默认）</option><option value="remaster">重绘 · 新人物与已完成的新场景</option></select>
    <p>两种画面都显示已完成的新人物与头像，使用相同的剧情和存档。重绘场景首次载入较慢。</p>
    <button id="portable-apply">切换画面并返回首页</button>
    <hr><label for="portable-combat">战斗规则</label>
    <select id="portable-combat"><option value="enhanced">身法会心 · 默认</option><option value="classic">经典 · 保持原版规则</option></select>
    <p>身法会心（默认）：轻功差距与招式等级影响闪避，熟练招式更易会心（伤害×1.35）。敌我规则相同，名角单挑因此偶有失手；内功、暗器、用毒与治疗保持原规则。战斗外切换，立即生效。选「经典」即回到原版无闪避无会心的算法。</p>
    <hr><label for="portable-zoom">战斗镜头</label>
    <select id="portable-zoom"><option value="near">拉近 · 默认（人物更大）</option><option value="standard">标准 · 一屏看更多战场</option></select>
    <label for="portable-grid">战斗网格</label>
    <select id="portable-grid"><option value="on">显示 · 默认（便于数格子）</option><option value="off">隐藏</option></select>
    <p>镜头从下一场战斗开始生效；网格即时生效，出招动画时自动隐去。</p>
    <p id="portable-feedback" role="status" aria-live="polite"></p></div>
    <section id="portable-confirm" hidden aria-labelledby="portable-confirm-title">
      <h3 id="portable-confirm-title">请确认</h3>
      <p id="portable-confirm-text"></p>
      <div class="portable-confirm-actions"><button id="portable-confirm-no">取消，继续游玩</button><button id="portable-confirm-yes">确认</button></div>
    </section>`;
  document.querySelector("#stage").append(modal);
  const q = (id) => modal.querySelector(id);
  let saves = {}, incoming = null, reading = 0, refreshRevision = 0;
  let confirmResolve = null, confirmFocus = null;
  function finishConfirmation(accepted) {
    if (!confirmResolve) return;
    const resolve = confirmResolve;
    confirmResolve = null;
    q("#portable-confirm").hidden = true;
    q("#portable-options").hidden = false;
    if (modal.open) (confirmFocus?.disabled ? q("#portable-close") : confirmFocus)?.focus();
    resolve(accepted);
  }
  function askConfirmation(text, label) {
    return new Promise(resolve => {
      confirmResolve = resolve; confirmFocus = document.activeElement;
      q("#portable-confirm-text").textContent = text;
      q("#portable-confirm-yes").textContent = label;
      q("#portable-options").hidden = true;
      q("#portable-confirm").hidden = false;
      q("#portable-confirm-no").focus();
    });
  }
  q("#portable-confirm-no").onclick = () => finishConfirmation(false);
  q("#portable-confirm-yes").onclick = () => finishConfirmation(true);
  modal.addEventListener("cancel", event => {
    if (confirmResolve) { event.preventDefault(); finishConfirmation(false); }
  });
  modal.addEventListener("close", () => finishConfirmation(false));
  const get = (slot) => new Promise((resolve, reject) => {
    const r = db.transaction("slots").objectStore("slots").get(slot);
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
  const feedback = (text) => { q("#portable-feedback").textContent = text; };
  const selection = () => q("#portable-slot").value;
  async function refresh() {
    const revision = ++refreshRevision;
    let selected = selection();
    q("#portable-slot").disabled = q("#portable-export").disabled = q("#portable-export-local").disabled = true;
    let loaded;
    try {
      loaded = Object.fromEntries(await Promise.all(["1", "2", "3"].map(async (slot) => [slot, await get(slot)])));
    } catch (error) {
      if (revision === refreshRevision) throw error;
      return;
    }
    // Closing and reopening can leave an older read pending; only the latest refresh owns the controls.
    if (revision !== refreshRevision) return;
    saves = loaded;
    if (!selected) selected = ["1", "2", "3"].filter(slot => saves[slot]).sort((a,b) => (saves[b].date || 0) - (saves[a].date || 0))[0] || "1";
    q("#portable-slot").replaceChildren(...["1", "2", "3"].map((slot) => {
      const opt = document.createElement("option");
      opt.value = slot; opt.textContent = `进度${["", "一", "二", "三"][slot]} · ${saves[slot] ? stamp(saves[slot].date)+' · '+labelOf(saves[slot]) : "空"}`;
      return opt;
    }));
    const latest=Object.values(saves).filter(Boolean).sort((a,b)=>(b.date||0)-(a.date||0))[0];
    q('#portable-last-save').textContent=latest?`本浏览器最近保存：${stamp(latest.date)}`:'本浏览器还没有保存过进度，请先住宿保存。';
    q("#portable-slot").value = selected;
    q("#portable-slot").disabled = false;
    q("#portable-export").disabled = !saves[selected];
    q("#portable-export-local").disabled = !saves[selected];
  }
  document.querySelector("#portable").onclick = async () => {
    beforeOpen();
    q("#portable-art").value = graphicsMode;
    q("#portable-combat").value = getCombatRules();
    const view = getBattleView();q("#portable-zoom").value = view.zoom;q("#portable-grid").value = view.grid ? "on" : "off";
    feedback("");
    modal.showModal();
    try { await refresh(); } catch { feedback("读取存档失败，请关闭后重试。"); }
  };
  q("#portable-combat").onchange=()=>{setCombatRules(q("#portable-combat").value);feedback(q("#portable-combat").value==='enhanced'?'已启用身法会心试玩规则。':'已恢复经典战斗规则。');};
  q("#portable-zoom").onchange=()=>{setBattleView({zoom:q("#portable-zoom").value});feedback(q("#portable-zoom").value==='near'?'下一场战斗起镜头拉近。':'下一场战斗起恢复标准镜头。');};
  q("#portable-grid").onchange=()=>{setBattleView({grid:q("#portable-grid").value==='on'});feedback(q("#portable-grid").value==='on'?'已显示战斗网格。':'已隐藏战斗网格。');};
  q("#portable-close").onclick = () => { finishConfirmation(false); modal.close(); };
  q("#portable-slot").onchange = () => { q("#portable-export").disabled = q("#portable-export-local").disabled = !saves[selection()]; };
  // Same serialisation as the download export; only offered on the loopback page and only on an explicit click.
  const buildExport = async slot => {
    const save = await get(slot);
    if (!save) throw Error("此存档位为空，请先在游戏中保存。");
    const out = {format:"jy-remake-save", version:1, date:save.date};
    if(save.journey)out.journey=journeyForExport(save.journey);
    const profile=await profileForExport(db);if(profile)out.journeyProfile=profile;
    for (const key of Object.keys(sizes)) out[key] = base64(save[key]);
    return out;
  };
  if (["127.0.0.1","localhost"].includes(location.hostname)) {
    q("#portable-export-local").hidden = false;
    q("#portable-export-local").onclick = async () => {
      const button = q("#portable-export-local"); button.disabled = true;
      try {
        const slot = selection(), out = await buildExport(slot);
        feedback("正在写入本机工程…");
        const r = await fetch("/remake/local-save-export?slot=" + slot, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(out)});
        const info = await r.json().catch(() => ({}));
        if (!r.ok || !info.ok) throw Error(info.error || ("本机保存失败（" + r.status + "）"));
        feedback("已保存到本机工程：" + info.path + "（" + info.bytes + " 字节）");
      } catch (e) { feedback(e.message || "本机保存失败，请重试。"); }
      finally { button.disabled = q("#portable-slot").disabled || !saves[selection()]; }
    };
  }
  q("#portable-export").onclick = async () => {
    try {
      const slot = selection(), save = await get(slot);
      if (!save) throw Error("此存档位为空，请先在游戏中保存。");
      const out = {format:"jy-remake-save", version:1, date:save.date};
      if(save.journey)out.journey=journeyForExport(save.journey);
      const profile=await profileForExport(db);if(profile)out.journeyProfile=profile;
      for (const key of Object.keys(sizes)) out[key] = base64(save[key]);
      const url = URL.createObjectURL(new Blob([JSON.stringify(out)], {type:"application/json"}));
      const a = document.createElement("a");
      // 文件名日期按本地时区，与界面「存档时间」一致
      const d = new Date(save.date), day = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      a.href = url; a.download = `江湖重绘-进度${["", "一", "二", "三"][slot]}-${day}.jy-save.json`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      feedback("已向浏览器请求下载上次保存的进度。请在设备的下载列表确认 .jy-save.json 文件已保存，再通过 AirDrop、聊天或文件传到另一台设备。");
    } catch (e) { feedback(e.message || "导出失败，请重试。"); }
  };
  q("#portable-file").onchange = async () => {
    const revision = ++reading, file = q("#portable-file").files[0];
    incoming = null; q("#portable-import").disabled = true;
    if (!file) return;
    q("#portable-file-info").textContent = "正在检查存档…";
    try {
      if (file.size > 9_000_000) throw Error("文件过大，请选择单个游戏存档。");
      // Q1 2026-10-02：传输中断的半截存档原先也报「不是本游戏存档」，玩家会以为选错了文件。
      const text = await file.text();
      let raw; try { raw = JSON.parse(text); } catch { throw Error(/^\s*\{\s*"format"\s*:\s*"jy-remake-save"/.test(text) ? "存档文件不完整，可能是传输中断，请从原设备重新导出。" : "这不是本游戏导出的存档文件。"); }
      const decoded = decodePortableSave(raw);
      if (revision !== reading) return;
      incoming = decoded;
      q("#portable-file-info").textContent = `存档时间：${stamp(incoming.date)} · ${journeyLabel(normalizeJourney(incoming.journey))}。导入只替换所选的一个存档位，并合并已有通关记录。`;
      q("#portable-import").disabled = false;
    } catch (e) { if (revision === reading) q("#portable-file-info").textContent = e.message || "无法读取存档。"; }
  };
  q("#portable-import").onclick = async () => {
    if (!incoming) return;
    const slot = selection(), payload = incoming;
    q("#portable-import").disabled = true;
    try {
      const old = await get(slot);
      if (!await askConfirmation(`导入到进度${slot}${old ? `，替换 ${stamp(old.date)} 的存档` : "（空位）"}，然后返回首页。当前尚未保存的进度会丢失。`, "确认导入")) return;
      const merged=mergeProfiles(await readProfile(db),payload.journeyProfile);
      await new Promise((resolve, reject) => {
        const tx = db.transaction("slots", "readwrite");
        tx.objectStore("slots").put(payload, slot);
        tx.objectStore("slots").put(merged,PROFILE_KEY);
        tx.oncomplete = resolve;
        tx.onabort = tx.onerror = () => reject(tx.error || Error("存档未能写入"));
      });
      location.reload();
    } catch (e) { feedback(e.message || "导入失败，原存档保留。"); }
    finally { q("#portable-import").disabled = !incoming; }
  };
  q("#portable-apply").onclick = async () => {
    const art = q("#portable-art").value;
    if (art === graphicsMode) { feedback("已在使用这套画面。"); return; }
    if (!await askConfirmation("切换画面需要返回首页。已保存的进度会保留，当前未保存的进度会丢失。", "确认切换")) return;
    try { localStorage.setItem("jy-graphics", art); } catch {}
    const url = new URL(location.href); url.searchParams.set("art", art); location.href = url;
  };
}
