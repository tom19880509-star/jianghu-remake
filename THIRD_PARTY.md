# 来源与未包含内容

核对时间：2026-10-03（新西兰时间）。本文件说明本地完整游戏的依赖，**列出来源不等于获得再发行许可**。

| 来源 | 本地用途 | 本包处理 |
| --- | --- | --- |
| [ZhanruiLiang/jinyong-legend](https://github.com/ZhanruiLiang/jinyong-legend) | 实际浏览器游戏使用的 JY_SDL_LUA 脚本、旧对白和二进制地图／人物数据底板 | 本地根目录未见明确许可证；GitHub 元数据 license 为 null。原文件和转换产物均不包含 |
| [scarsty/jysdl-bh](https://github.com/scarsty/jysdl-bh) | 旧引擎参考；README 署游泳的鱼、蓝烟清及后续维护者 | 根目录未见明确许可证；不包含此工程代码 |
| 文泉驿点阵宋体及 [AmusementClub 转换版](https://github.com/AmusementClub/WenQuanYi-Bitmap-Song-TTF) | 完整游戏的像素宋体，GPL v2 加字体嵌入例外 | 本包不含字体；以后打包必须携带对应许可及作者说明 |
| [Fengari](https://github.com/fengari-lua/fengari) | 完整游戏的浏览器 Lua 运行时 | 本包不含依赖副本；后续若使用须保留其 MIT 许可 |
| 金庸小说、经典电视剧和原版游戏 | 世界观、人物及造型的研究参考 | 不主张相应权利，不转授这些权利 |

`content.js` 是对旧游戏数据和对白的转换，`lua-files.js` 包含打包后的旧 Lua 与数据，`music.js` 来自原游戏 MIDI；改成 JSON、Base64 或新音色不使它们变成我们的原创，因此均不包含。整包编译产物也不包含。

《金庸群侠传X》／jyxr 等另有仓库曾作为技术和玩法参考，但不是当前浏览器运行底板；不能把它们的 GPL 或其它许可证直接套在当前底板上。

本包的十五个 JS 模块、一份配套装备配置和一个回归检查是独立新增部分。没有附带图片、音轨、游戏存档、账户信息或内部审查记录。后续加入素材时逐项保留来源和原许可；许可未明确的内容继续留在本地。
