# 江湖重绘 · Jianghu Remake

**项目发起、设计与制作：Tom（[tom19880509-star](https://github.com/tom19880509-star)）。**

在开源《金庸群侠传》Lua 复刻底板上制作的武侠浏览器游戏，支持电脑和手机横屏。以剧情、探索和武学搭配为主，逐步升级人物、战斗动作、特效、界面和地图。开发使用 Codex 与 Claude 辅助工具。

**[在线试玩](https://jianghu-remake-play.tomzhai.chatgpt.site/remake/)**

## 公开内容

`jy-art-remaster/remake/` 收录当前游戏的浏览器引擎、战斗与成长规则、武学数值、剧情扩展、队伍与装备界面、触屏操作、配乐播放、存档和构建源码，以及本轮尚未包含在网站素材包中的人物图。根目录原有独立模块保留，方便单独使用。

原版 Lua 脚本、地图数据和 MIDI 从同一个开源底板取得，保留原文件与声明。较大的已公开人物、地图贴图、音轨和章节资源由 `prepare.py` 从现有试玩网站取得；资源清单随仓库提供。**GitHub ZIP 中没有重复塞入全部运行素材，首次运行需要准备资源。** 网站素材下载会验证清单中的哈希；若网站更新导致不匹配，需要同步更新清单。

不包含玩家存档、私人文件、账号信息、内部协作记录和开发截图。

## 本地运行

需要 Python 3.10+、Node.js 20.10+ 和 npm。先下载本仓库，进入解压目录，然后执行：

```sh
python3 -m pip install -r requirements.txt
python3 prepare.py
cd jy-art-remaster/remake
npm install
python3 export_content.py
python3 pack_music.py
npm run build
npm start
```

电脑打开 `http://127.0.0.1:5409/remake/`。同一 Wi-Fi 的手机可使用：

```sh
python3 launch.py 5409 --lan --no-open
```

启动后会显示手机地址。若已有完整项目目录，可用 `python3 prepare.py --from-existing /path/to/jy-art-remaster` 准备本地素材，避免重复下载。此命令不会复制存档。

## 免费使用与署名

本项目新增代码与原创重制绘图采用 [Apache-2.0](LICENSE)，允许免费使用、修改、再发行及商业使用。再发行请保留适用版权、作者署名、许可证和 [NOTICE](NOTICE)，并标明修改。

推荐署名：

> 江湖重绘 · 项目发起、设计与制作：Tom（tom19880509-star）。基于游泳的鱼编写的金庸群侠传 Lua 复刻及相关开源项目。开发工具辅助：Codex、Claude。

原版脚本、地图、音乐、字体和第三方运行库保留原作者声明及各自许可，不因打包成为 Tom 原创，也不统一改成 Apache-2.0。阅读 [THIRD_PARTY.md](THIRD_PARTY.md)。小说、电视剧及原游戏的相关权利属于原权利人，本项目不转授这些权利。

## 验证与贡献

```sh
npm test
```

上述检查是现有门口遮挡、格子投影、摇杆与寻路回归，不能代表完整主线、多周目或手机真机均已验收。贡献请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，保持人物时期、武器形态与原著设定一致，避免破坏已有存档。
