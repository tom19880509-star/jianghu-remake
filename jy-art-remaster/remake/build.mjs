import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { makeNativeBalance } from './martial-balance.js';
execFileSync('python3', ['pack_lua.py'], { cwd: new URL('.', import.meta.url) });
const sourceText=await readFile(new URL('content.js',import.meta.url),'utf8');
const numeric=makeNativeBalance(JSON.parse(sourceText.slice(sourceText.indexOf('{'),sourceText.lastIndexOf('}')+1)));
const luaValue=v=>v===null?'nil':typeof v==='string'?JSON.stringify(v):typeof v!=='object'?String(v):'{'+Object.entries(v).map(([k,x])=>'['+(Array.isArray(v)?Number(k)+1:/^\d+$/.test(k)?k:JSON.stringify(k))+']='+luaValue(x)).join(',')+'}';
await writeFile(new URL('balance-data.lua',import.meta.url),'return '+luaValue(numeric));
await writeFile(new URL('martial-balance-data.json',import.meta.url),JSON.stringify(numeric,null,2)+'\n');
await mkdir(new URL('assets/data/',import.meta.url),{recursive:true});
await writeFile(new URL('assets/data/martial-balance.json',import.meta.url),JSON.stringify(numeric));
// The catalogue describes current runtime gates; it never evaluates a saved actor.
const loreCatalog=JSON.parse(await readFile(new URL('martial-catalog-data.json',import.meta.url),'utf8'));
const nativeContent=JSON.parse(sourceText.slice(sourceText.indexOf('{'),sourceText.lastIndexOf('}')+1));
// 底表人名是繁体，只覆盖现有 仅修炼人物；新增时补一行。
const SIMPLIFIED={'段譽':'段誉','令狐沖':'令狐冲','藍鳳凰':'蓝凤凰'};
for(const e of loreCatalog.entries){
 // 与 growth-extension.lua canUse 一致：折算门槛 gates 覆盖底表同名字段。
 const id=e.nativeBookId,base=id!=null?nativeContent.items[id]:null;if(!base)continue;
 const t={...base,...(numeric.books[id]?.gates||{})};
 const rows=[];
 if(t['仅修炼人物']>=0){const who=nativeContent.people[t['仅修炼人物']]['姓名'];rows.push('本版传承人：'+(SIMPLIFIED[who]||who));}
 if([61,77].includes(id))rows.push('本版传承：杨过；此前已学者可继续精修');
 rows.push(t['需内力性质']===2?'内力属性不限':(t['需内力性质']===0?'阴性':'阳性')+'或调和内力');
 for(const field of ['内力','攻击力','轻功','用毒能力','医疗能力','解毒能力','拳掌功夫','御剑能力','耍刀技巧','特殊兵器','暗器技巧','资质']){
  const n=t['需'+field];if(!n||field==='资质'&&(numeric.books[id]?.removeAptitude||id===91))continue;
  rows.push((field==='内力'?'内力上限':['攻击力','轻功'].includes(field)?'自身'+field:field)+(n<0?' ≤ ':' ≥ ')+Math.abs(n));
 }
 if(id===91)rows.push('须适合此法的心性；具体人物在游戏中核对');
 rows.push('气血大于0');if(id>=48&&id<=53)rows.push('医毒制物不占十门武学名额');else rows.push('新学须有武学名额（总计十门，预留传承在内）','精修须尚未达到本门上限');
 e.studyRequirements=rows;
}
await writeFile(new URL('assets/data/martial-catalog.json',import.meta.url),JSON.stringify(loreCatalog));
const loreRows=loreCatalog.entries.filter(e=>e.nativeBookId!=null||e.nativeSkillId!=null||['神足经','罗汉伏魔神功'].includes(e.name));
await writeFile(new URL('martial-lore-data.js',import.meta.url),'export default '+JSON.stringify({entries:loreRows,sources:loreCatalog.sources})+';\n');
const require = createRequire(import.meta.url),
  { build } = require("esbuild");
// Original scripts stay in GB bytes, including the compatibility layer.
execFileSync(
  "python3",
  [
    "-c",
    "from pathlib import Path; import json,base64; p=Path('bridge.lua'); Path('bridge-data.js').write_text('globalThis.JY_BRIDGE='+json.dumps(base64.b64encode(p.read_text().replace('-- UI_EXTENSION',Path('ui-extension.lua').read_text()).replace('-- COMBAT_EXTENSION',Path('combat-extension.lua').read_text()).replace('-- WEAPON_EXTENSION',Path('weapon-combat.lua').read_text()+Path('combo-extension.lua').read_text()).replace('-- CREATION_EXTENSION',Path('creation-extension.lua').read_text()).replace('-- HOMESTEAD_EXTENSION',Path('homestead-extension.lua').read_text()).replace('-- GARDEN_EXTENSION',Path('garden-extension.lua').read_text()).replace('-- EXPLORATION_EXTENSION',Path('exploration-extension.lua').read_text()).replace('-- REST_SAVE_EXTENSION',Path('rest-save-extension.lua').read_text()).replace('-- STARTER_EXTENSION',Path('starter-equipment.lua').read_text()).replace('-- BACKSTORY_EXTENSION',Path('backstory-extension.lua').read_text()).replace('-- LEGACY_EXTENSION',Path('legacy-extension.lua').read_text()).replace('-- POISONMED_EXTENSION',Path('poisonmed-extension.lua').read_text()).replace('-- ARTFX_EXTENSION',Path('artfx-extension.lua').read_text()).replace('-- JIUYANG_EXTENSION',Path('jiuyang-extension.lua').read_text()).replace('-- THROWN_EXTENSION',Path('thrown-extension.lua').read_text()).replace('-- MARRIAGE_EXTENSION',Path('marriage-extension.lua').read_text()).replace('-- DARKPATH_EXTENSION',Path('darkpath-extension.lua').read_text()).replace('-- EXPSHARE_EXTENSION',Path('expshare-extension.lua').read_text()).replace('-- NPCINNER_EXTENSION',Path('npcinner-extension.lua').read_text()).replace('-- JOURNEY_EXTENSION',Path('journey-extension.lua').read_text()).replace('-- ZHOU_EXTENSION',Path('zhou-extension.lua').read_text()).replace('-- MEI_EXTENSION',Path('mei-extension.lua').read_text()).replace('-- PASTIME_EXTENSION',Path('pastime-extension.lua').read_text()).replace('-- INN_EXTENSION',Path('inn-extension.lua').read_text()).replace('-- ECHO_EXTENSION',Path('echo-extension.lua').read_text()).replace('-- OUTFIT_EXTENSION',Path('outfit-extension.lua').read_text()).replace('-- TEACHING_EXTENSION',Path('teaching-extension.lua').read_text()).replace('-- MASTERY_EXTENSION',Path('mastery-extension.lua').read_text()+Path('mastery-combat.lua').read_text()).replace('-- OPENING_EXTENSION',Path('opening-extension.lua').read_text()).replace('-- SIGNATURE_EXTENSION',Path('signature-extension.lua').read_text()).replace('-- TOOSIMPLE_EXTENSION',Path('toosimple-extension.lua').read_text()).replace('-- TIANBO_EXTENSION',Path('tianbo-extension.lua').read_text()).replace('-- LINPING_EXTENSION',Path('linping-extension.lua').read_text()).replace('-- MURONG_EXTENSION',Path('murong-extension.lua').read_text()).replace('-- GROWTH_EXTENSION',Path('balance-core.lua').read_text().replace('-- BALANCE_DATA',Path('balance-data.lua').read_text())+Path('balance-combat.lua').read_text()+Path('growth-extension.lua').read_text().replace('-- GROWTH_CORE',Path('growth-core.lua').read_text())+Path('practice-extension.lua').read_text().replace('-- PRACTICE_CORE',Path('practice-core.lua').read_text())+Path('dispersal-extension.lua').read_text()+Path('luohan-extension.lua').read_text()+Path('yijin-extension.lua').read_text()).encode('gb18030')).decode())+';')",
  ],
  { cwd: new URL(".", import.meta.url) },
);
// Parse the complete assembled Lua chunk: isolated extension tests cannot catch
// the VM's 200-local limit across all concatenated modules.
{
  const {lua, lauxlib, to_luastring, to_jsstring} = require('fengari');
  const raw = await readFile(new URL('bridge-data.js', import.meta.url), 'utf8');
  const code = Buffer.from(JSON.parse(raw.slice(raw.indexOf('=') + 1, -1)), 'base64');
  const L = lauxlib.luaL_newstate();
  const status = lauxlib.luaL_loadbuffer(L, code, code.length, to_luastring('built-bridge'));
  const error = status === lua.LUA_OK ? null : to_jsstring(lua.lua_tostring(L, -1));
  lua.lua_close(L);
  if (error) throw new Error(error);
}
await build({
  entryPoints: [new URL("engine.js", import.meta.url).pathname],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  outfile: new URL("engine.bundle.js", import.meta.url).pathname,
  define: { process: "undefined", "process.env.FENGARICONF": '"{}"' },
});
// Local browsers can retain a fresh cached bundle after the HTML is reloaded.
// Version the two generated scripts so rebuilding actually loads the new game.
const indexPath = new URL("index.html", import.meta.url);
let index = await readFile(indexPath, "utf8");
for (const file of ["engine.bundle.js", "bridge-data.js", "lua-files.js"]) {
  const hash = createHash("sha256")
    .update(await readFile(new URL(file, import.meta.url)))
    .digest("hex")
    .slice(0, 12);
  index = index.replace(
    new RegExp(`src="${file.replaceAll(".", "\\.")}(?:\\?v=[^\"]*)?"`),
    `src="${file}?v=${hash}"`,
  );
}
const styleHash=createHash('sha256').update(await readFile(new URL('style.css',import.meta.url))).digest('hex').slice(0,12);
index=index.replace(/href="style\.css(?:\?v=[^"]*)?"/,`href="style.css?v=${styleHash}"`);
await writeFile(indexPath, index);
await build({
  entryPoints: [new URL('combat-preview.js',import.meta.url).pathname],bundle:true,
  format:'esm',platform:'browser',target:'es2022',outfile:new URL('combat-preview.bundle.js',import.meta.url).pathname,
});
const previewHash=createHash('sha256').update(await readFile(new URL('combat-preview.bundle.js',import.meta.url))).digest('hex').slice(0,12);
const previewPath=new URL('combat-preview.html',import.meta.url);
await writeFile(previewPath,(await readFile(previewPath,'utf8')).replace(/src="combat-preview\.bundle\.js(?:\?v=[^"]*)?"/,`src="combat-preview.bundle.js?v=${previewHash}"`));
await build({entryPoints:[new URL('signature-preview.js',import.meta.url).pathname],bundle:true,
  format:'esm',platform:'browser',target:'es2022',outfile:new URL('signature-preview.bundle.js',import.meta.url).pathname});
const signatureHash=createHash('sha256').update(await readFile(new URL('signature-preview.bundle.js',import.meta.url))).digest('hex').slice(0,12);
const signaturePath=new URL('signature-preview.html',import.meta.url);
await writeFile(signaturePath,(await readFile(signaturePath,'utf8')).replace(/src="signature-preview\.bundle\.js(?:\?v=[^"]*)?"/,`src="signature-preview.bundle.js?v=${signatureHash}"`));
console.log("Browser engine built.");
