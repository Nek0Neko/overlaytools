# Apex Legends 自定义比赛叠加层工具

Apex Legends 自定义比赛的实时数据叠加层工具，用于在直播/录制的观察者视角上显示实时排名、队伍信息、玩家数据等。

![排行榜](https://github.com/ndekopon/overlaytools/assets/92087784/ad3d606b-e488-4755-9ada-aebd3a677d40)
![物品数量](https://github.com/user-attachments/assets/34e46c97-3906-434b-9018-4f4b7792dfd5)
![比赛结果](https://github.com/ndekopon/overlaytools/assets/92087784/b06ccc4e-476b-452e-98ab-3260bd5aa429)

## 功能特点

- **叠加层显示**
  - 实时排行榜（排名、积分、击杀数）
  - 队伍横幅（队伍名称、排名）
  - 玩家横幅（玩家名称、传说角色）
  - 持有物品显示（医疗物品、手雷等）
  - 队伍击杀数统计
  - 当前比赛场数
  - 冠军队伍展示
  - 队伍淘汰/复活信息
  - 比赛结果统计

- **管理面板**
  - 实时数据查看（支持镜头切换）
  - 比赛结果查看与修正
  - 游戏内聊天发送
  - 队伍名称设置
  - 叠加层显示切换
  - 积分计算方式配置

## 系统要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10/11 (x64) |
| Apex Legends 语言 | English 或 简体中文 |
| WebView2 | [下载地址](https://developer.microsoft.com/zh-cn/microsoft-edge/webview2/consumer/) |

## 安装与配置

### 1. 下载并解压

从 [Releases](../../releases) 页面下载最新版本，解压到任意目录。

### 2. 配置 Apex Legends LiveAPI

在 Apex Legends 启动项中添加以下参数：

```
+cl_liveapi_enabled 1 +cl_liveapi_ws_servers "ws://127.0.0.1:7777"
```

**Steam 设置方法：**
1. 右键点击游戏 → 属性
2. 在「启动选项」中添加上述参数

**EA App 设置方法：**
1. 点击游戏设置图标 → 属性
2. 在「高级启动选项」中添加上述参数

### 3. 启动程序

1. 运行 `apexliveapi_proxy.exe`
2. 程序会自动启动 WebSocket 服务器
3. 打开浏览器访问 `http://127.0.0.1:20080` 进入管理面板

### 4. OBS 配置

在 OBS 中添加「浏览器」源：

| 叠加层 | URL | 建议尺寸 |
|--------|-----|----------|
| 排行榜 | `http://127.0.0.1:20080/overlays/leaderboard.html` | 1920×1080 |
| 地图排行榜 | `http://127.0.0.1:20080/overlays/mapleaderboard.html` | 1920×1080 |
| 队伍横幅 | `http://127.0.0.1:20080/overlays/teambanner.html` | 1920×1080 |
| 玩家横幅 | `http://127.0.0.1:20080/overlays/playerbanner.html` | 1920×1080 |
| 持有物品 | `http://127.0.0.1:20080/overlays/owneditems.html` | 1920×1080 |
| 队伍击杀 | `http://127.0.0.1:20080/overlays/teamkills.html` | 1920×1080 |
| 比赛结果 | `http://127.0.0.1:20080/overlays/singleresult.html` | 1920×1080 |
| 综合结果 | `http://127.0.0.1:20080/overlays/totalresult.html` | 1920×1080 |

## 目录结构

```
overlaytools/
├── apexliveapi_proxy.exe    # 主程序
├── htdocs/                   # Web 资源目录
│   ├── index.html           # 原版管理面板
│   ├── admin/               # 新版 Vue 管理面板源码
│   ├── dist/                # 新版管理面板构建输出
│   ├── overlays/            # 叠加层 HTML/CSS
│   ├── custom-overlays/     # 自定义叠加层（可自行修改）
│   └── samples/             # 自定义示例
└── config.json              # 配置文件（首次运行后生成）
```

## 开发说明

### 新版管理面板 (Vue 3 + Element Plus)

新版管理面板使用 Vue 3 + Element Plus 构建，提供更现代化的 UI 体验。

**技术栈：**
- Vue 3 (Composition API)
- Element Plus (UI 组件库)
- Pinia (状态管理)
- Vue Router (路由)
- Vue I18n (国际化)
- TypeScript
- Vite (构建工具)

**开发模式：**

```bash
cd htdocs/admin
npm install
npm run dev
```

开发服务器将在 `http://localhost:3000` 启动。

**生产构建：**

```bash
cd htdocs/admin
npm run build
```

构建输出将生成到 `htdocs/dist/` 目录。

## 自定义叠加层

### 修改样式

在 `htdocs/custom-overlays/` 目录下创建或修改 CSS 文件：

```css
/* 示例：修改排行榜背景颜色 */
.leaderboard {
    background-color: rgba(0, 0, 0, 0.8);
}
```

### 自定义队伍图片

参考 `htdocs/samples/teambanner-with-teamimage/` 示例：

1. 将队伍图片放入 `htdocs/team-images/` 目录
2. 在 `custom-overlays/teambanner-append.css` 中配置映射：

```css
.teamimage[data-camera-team-name="YourTeamName"] {
    background-image: url('team-images/your-team.png');
}
```

## 常见问题

**Q: 程序无法连接到游戏？**
- 确认 Apex Legends 启动参数配置正确
- 确认游戏和程序在同一台电脑上运行
- 检查防火墙是否阻止了连接

**Q: OBS 中叠加层不显示？**
- 确认浏览器源 URL 正确
- 尝试在浏览器源设置中勾选「当场景激活时刷新浏览器」
- 检查 OBS 浏览器源的宽高设置

**Q: 如何切换语言？**
- 在管理面板右下角点击 `[en]` 或 `[zh]` 切换语言

## 参考项目

本项目基于 [ndekopon/overlaytools](https://github.com/ndekopon/overlaytools) 进行修改和汉化。

感谢原作者 [nDekopon](https://twitter.com/ndekopon) 的开源贡献。

## 许可证

[MIT License](LICENSE)
