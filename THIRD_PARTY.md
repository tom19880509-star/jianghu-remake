# 来源与作者声明

更新：2026-10-03（新西兰时间）。

## 原版复刻底板

当前游戏实际使用 [ZhanruiLiang/jinyong-legend](https://github.com/ZhanruiLiang/jinyong-legend)，源快照 `89962d7fc2837c143e176c306d83b4e38dab6e77`。`prepare.py` 取得所需原版脚本、数据和 MIDI，保留文件内容。Tom 已说明这些资源来自既有开源下载。

其 `script/jymain.lua` 开头明确写有：

> 版权所无，敬请复制
> 您可以随意使用代码
> 本代码由游泳的鱼编写

**更正首批说明：** 最初只查了根目录 LICENSE 与 GitHub 许可字段，遗漏了脚本内的上述作者声明。“根目录无 LICENSE”不能据此认定脚本没有使用许可。原版代码依其原作者声明使用，不重新标为 Tom 原创。地图、旧对白、旧贴图和 MIDI 保留开源底板来源，不把上述代码声明扩大写成整套第三方素材的 Apache-2.0 授权。

[scarsty/jysdl-bh](https://github.com/scarsty/jysdl-bh) 为旧引擎参考；署名包括游泳的鱼、蓝烟清及后续维护者。当前浏览器运行依赖前述 Lua 底板，而非直接部署此引擎。

`content.js`、`lua-files.js`、`atlas.js` 和 `music.js` 是转换与打包产物；对应地图、对白、脚本、贴图和乐谱仍保留原来源。生成工具随仓库公开。金庸群侠传 X、jyxr 等是玩法与技术参考，不将其许可套在当前底板上。

## 第三方运行库与资源

- [Fengari](https://github.com/fengari-lua/fengari)：浏览器 Lua 运行时，MIT；由 npm 安装，保留依赖的 LICENSE。
- [esbuild](https://github.com/evanw/esbuild)：构建工具，MIT；由 npm 安装。
- 文泉驿点阵宋体与 [AmusementClub 转换版](https://github.com/AmusementClub/WenQuanYi-Bitmap-Song-TTF)：GPL v2 加字体嵌入例外；作者、来源及许可证随 `assets/fonts/` 提供。
- GeneralUser 音色与配乐制作：见 `assets/music/GeneralUser-LICENSE.txt` 和 `CREDITS.txt`；不把第三方音色或原曲署为 Tom 原创。
- 社区地面素材：见 `assets/community-grass-LICENSE.txt` 和 `assets/community-dirt-LICENSE.txt`。
- 已公开运行素材从本项目试玩站下载，资源哈希见 `runtime-assets.json`。此清单用于复现现有资源，不授予超过各来源许可的权利。

本项目的新增程序、美术和设计署 Tom；原作者署名同时保留。小说、电视剧、原游戏及其它第三方作品的权利不转授。
