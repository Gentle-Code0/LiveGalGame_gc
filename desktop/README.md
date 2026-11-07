# LiveGalGame Web 源码

目录名 desktop 沿用原仓库布局，当前入口是 Node.js HTTP 服务。页面继续使用 React、Vite、原有图标字体和样式。

使用 Node.js 22 和 pnpm 9.15.9：

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

访问 http://localhost:7456 。默认监听 0.0.0.0:7456，可通过 HOST、PORT 修改。数据库默认在 desktop/data/livegalgame.db，通过 LIVEGALGAME_DB_PATH 可指定路径。数据库无法打开时启动失败，不会切换临时路径。

热更新：两个终端分别运行 `pnpm run dev:server` 与 `pnpm dev`，访问 http://localhost:5173 。Vite 将 /api 代理到 7456。

运行 `pnpm test` 执行隔离测试：临时目录、临时端口、无效占位密钥和本机模拟 AI 服务，无需真实账户，结束自动删除测试数据库。test 目录里的回归测试源码应保留。

## 职责

- src/renderer：原界面和浏览器接口适配，历史对话页承载建议卡片，没有录音、输入框或 HUD。
- src/server：静态文件、明确注册的 HTTP 操作、参数边界与流式事件，事件仅返回当前请求。
- src/core/modules：AI 建议、复盘、结构化记忆客户端及业务操作注册。
- src/db：SQLite、旧数据兼容、角色/会话/消息/建议/复盘数据。

前端 window.electronAPI 仅保留兼容名称，实际由 fetch 调用同源 HTTP 服务，不加载 Electron。建议流和复盘进度通过 NDJSON 返回。

本次不实现 QQ/微信连接器。可选记忆服务由 MEMORY_API_BASE_URL 配置，不配置时保持原来的空结果降级行为。此分支只维护网页分发，不再制作安装包或 APK。

详细教程见 [网页部署](../docs/web-deployment.md)。
