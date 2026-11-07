# LiveGalGame Desktop

> 🖥️ Windows / macOS 桌面端 —— 让语音聊天也能像 GalGame 一样有字幕和选项

[← 返回主页](../README.md)

---

## 这是什么？

一个浮动在你聊天软件上方的智能助手窗口。它能：

- **实时显示字幕** —— 你说的话、对方说的话，全部转成文字
- **给出 AI 回复建议** —— 关键时刻告诉你该说什么
- **显示好感度变化** —— 让聊天效果可视化

半透明、置顶、可拖动，不干扰你正常使用任何聊天软件。

---

## 🎮 使用流程

### 1️⃣ 创建对话对象
点击"新建对话"，填写：
- 对方昵称
- 你们的关系
- 备注信息（比如对方的喜好）

> 💡 这些信息会帮助 AI 更懂你的场景

### 2️⃣ 启动浮动窗口
点击"开始对话"，一个小窗会出现在屏幕上：
- 半透明设计，不遮挡聊天界面
- 可以拖动到任意位置
- 始终置顶显示

### 3️⃣ 开始聊天
打开你的聊天软件（微信、QQ、Discord...），开始语音对话：
- 你说的话会实时转成文字显示
- 对方说的话也会被识别并显示
- 再也不用担心听漏或忘记

### 4️⃣ 获取 AI 建议
当对方问你问题或对话到了关键时刻：
- AI 会自动弹出回复建议
- 每个选项都带有情感标签（温柔/幽默/直接...）
- 还会预测这样说的效果

### 5️⃣ 看到反馈
选择一个回复说出来后：
- 好感度进度条会动态变化
- 比如：`❤️ 好感度: 50 → 70 (+20 ↗)`
- 把"聊得好"变成看得见的成就

---

## ✨ 设计亮点

| 特性 | 说明 |
|------|------|
| 🪟 场景化设计 | 浮动窗口完美融入你已有的聊天场景 |
| 🎮 游戏化体验 | 好感度预测和实时变化，让聊天像玩游戏 |
| 🧠 可解释 AI | 不只给建议，还告诉你为什么这样说更好 |
| 🔇 离线可用 | 语音识别本地运行，隐私有保障 |

---

## 🚀 快速开始

### 安装

```bash
git clone https://github.com/JStone2934/LiveGalGame.git
cd LiveGalGame/desktop
pnpm install
```

### 配置语音识别

```bash
# 安装 FunASR（推荐，中文识别效果最好，macOS 默认）
npm run setup-funasr
```
- Windows 也使用 FunASR ONNX，无需额外安装 faster-whisper。

### 启动

```bash
pnpm dev
```

---

## 💻 系统要求

### Windows 开发、断点调试和构建

用 VS Code 打开仓库根目录。前端 JavaScript/React 和 Electron 主进程调试使用 VS Code
内置 JavaScript 调试器，无需额外 Electron 插件。调试 Python 时安装 Microsoft 的
Python (`ms-python.python`) 和 Python Debugger (`ms-python.debugpy`)；Tailwind CSS
IntelliSense (`bradlc.vscode-tailwindcss`) 可选。

准备 Node.js 22 LTS、pnpm 9（与 CI 使用的 pnpm 主版本一致）、Python 3.10。
若 better-sqlite3 原生模块需要本地编译，安装 Visual Studio Build Tools 的
“使用 C++ 的桌面开发”工作负载及 Windows SDK；这不是 VS Code 扩展。

在 PowerShell 中执行：

```powershell
cd D:\code\LiveGalGame_gc\desktop
pnpm install --frozen-lockfile
pnpm run prepare:python
$env:ASR_PYTHON_PATH = "$PWD\python-env\Scripts\python.exe"
pnpm dev
```

`prepare:python` 创建 Python 环境并安装语音依赖，首次运行需要联网且下载量较大。
语音模型在应用的语音设置中下载，AI 建议需要在设置中配置相应服务。
只查看界面时可先运行 `pnpm dev`，但没有 Python 环境、模型或服务配置时，
不能据此判断语音和 AI 功能正常。不要只在浏览器里打开 Vite 地址试用，完整功能需要 Electron 的 IPC。

修改 `src/renderer` 下的 React/CSS 后，Vite 会热更新，可边操作窗口边修改。
按 `Ctrl+Shift+I` 打开 Electron 开发者工具，在 Elements 查看样式，在 Sources 设置前端断点。
修改 `src/main.js`、`src/core` 或 `src/preload.js` 后，退出并重新启动 Electron。

若要在 VS Code 中调试主进程，先停止 `pnpm dev`，在一个终端运行 `pnpm run dev:vite`，
然后把以下配置加入仓库根目录的 `.vscode/launch.json`（该目录被 Git 忽略）：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Desktop Electron 主进程",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/desktop",
      "runtimeExecutable": "${workspaceFolder}/desktop/node_modules/electron/dist/electron.exe",
      "args": ["."],
      "env": {
        "NODE_ENV": "development",
        "PYTHONIOENCODING": "utf-8",
        "ASR_PYTHON_PATH": "${workspaceFolder}/desktop/python-env/Scripts/python.exe"
      },
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

在主进程代码中设置断点，选择此配置后按 F5。前端断点仍在窗口开发者工具中设置。
主进程调试器不会自动调试 Python 子进程；Python 需要独立使用 Python Debugger，
并选择 `desktop/python-env/Scripts/python.exe` 解释器。

构建 Windows 安装包（在 `desktop` 目录执行）：

```powershell
pnpm run build:win
```

此命令先用 PyInstaller 打包 Python 后端，再构建 Vite 前端，最后用 electron-builder
生成 NSIS 安装程序，输出位于 `desktop/release/`。仅验证前端构建可运行
`pnpm run build:vite`，它不会生成安装包。无需生成安装包的本地生产模式试用可运行
`pnpm run start:client`，此模式仍使用本机开发依赖。

图标字体已存放在 `src/renderer/assets/fonts`，开发及打包后均从本地加载。
若再次看到 `dashboard`、`groups` 等字样，检查开发者工具 Network 中本地图标字体
是否成功加载，并确认运行的是最新构建。中文和普通英文字体仍有系统字体回退。

参考：[VS Code Node/Electron 调试](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)、
[Python 调试](https://code.visualstudio.com/docs/python/debugging)。

- **Windows**: 10 / 11
- **macOS**: 12.0+
- 需要麦克风权限
- Node.js 20+, Python 3.8+

---

## ❓ 常见问题

**听不到声音？**
- 检查系统麦克风权限
- 在应用设置中选择正确的音频输入设备

**识别不准确？**
- 调整麦克风距离（建议 20-30cm）
- 在安静环境下效果更好

**窗口挡住了聊天界面？**
- 拖动窗口到合适位置
- 可以调整窗口透明度

---

## 📦 桌面端发布规则（GitHub Actions）

桌面端发布使用 tag 触发，并区分 **预发布** 和 **正式发布**：

- **预发布（Prerelease）**：`vX.Y.Z-xxx`  
  例：`v0.1.0-beta.1`
- **正式发布（Release）**：`vX.Y.Z`  
  例：`v0.1.0`

Android 的发布已独立为 `android-v*` 标签，避免干扰桌面端发布。

示例：

```bash
# 预发布（会生成 GitHub Prerelease）
git tag v0.1.0-beta.1
git push origin v0.1.0-beta.1

# 正式发布（会生成 GitHub Release）
git tag v0.1.0
git push origin v0.1.0

# Android 发布（仅 Android 流程触发）
git tag android-v0.1.0
git push origin android-v0.1.0
```

> 说明：桌面端产物为 macOS `.dmg` 与 Windows `.exe`，不会生成 APK。

---

## 🧰 模型下载与缓存目录（HF / ModelScope）

应用内的语音识别模型（尤其是 FunASR ONNX）会在首次使用/点击下载时自动拉取，并缓存到本机磁盘。为了方便管理、并兼容 Windows / macOS 的默认目录差异，项目默认把缓存放到 Electron 的 `userData` 目录下（不同系统会自动选择合适位置）。

如果你希望把模型统一下载到自己指定的盘符/目录（例如放到大硬盘、NAS 挂载目录等），推荐通过环境变量覆盖：

- `ASR_CACHE_BASE`：ASR 缓存根目录（推荐只改这个）
- `HF_HOME`：HuggingFace 缓存根目录（高级用法）
- `ASR_CACHE_DIR`：HuggingFace hub 目录（高级用法）
- `MODELSCOPE_CACHE`：ModelScope 缓存根目录（注意：实际会写到 `<MODELSCOPE_CACHE>/hub`）

示例（macOS/Linux）：

```bash
ASR_CACHE_BASE=/data/livegalgame/asr-cache pnpm dev
```

示例（Windows PowerShell）：

```powershell
$env:ASR_CACHE_BASE="D:\\LiveGalGame\\asr-cache"; pnpm dev
```

如果你想手动使用 ModelScope CLI 把某个模型下载到指定位置（不走应用内下载），确实可以用：

```bash
modelscope download --model 'Qwen/Qwen2-7B' --local_dir /data/models/Qwen2-7B
```

但应用内的 FunASR 模型下载是由 `funasr_onnx` 触发的（不是直接下载单个 Qwen 模型），因此更推荐用上面的环境变量来统一管理缓存位置。

---

## 🔧 开发者指南

如果你想参与开发或了解技术细节，请查看项目源码：

- `src/main.js` - Electron 主进程
- `src/renderer/` - React 前端界面
- `src/asr/` - 语音识别服务
- `src/db/` - 本地数据存储

欢迎提交 PR！有问题请加 QQ 群：**1074602400**
