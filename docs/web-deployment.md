# LiveGalGame 网页部署与使用

此分支只维护网页版本，不再构建 Electron 安装程序、Android APK 或 Python 语音后端。界面保留原来的导航、角色、历史对话、配置和复盘设计；AI 建议位于历史对话页。不需要麦克风、录音、模型下载或桌面悬浮窗。

## 1. 准备环境

部署机器安装 Docker Engine 和 Docker Compose 插件；Windows 可使用支持 Linux 容器的 Docker Desktop。启动 Docker 后，在仓库根目录检查：

```powershell
docker version
docker compose version
```

容器会提供 Node.js 和所需依赖，宿主机无需额外安装 pnpm、Node.js 或 Python。首次构建需要联网下载基础镜像和依赖。构建阶段可能用 Python/C++ 工具编译 SQLite 原生依赖，它们不会成为应用的语音功能，也不会装入最终运行镜像。

## 2. 启动

```powershell
cd D:\code\LiveGalGame_gc
git switch web-deploy
docker compose up -d --build
docker compose ps
docker compose logs --tail 100 livegalgame
```

本机访问 http://localhost:7456 。同一局域网的电脑访问 `http://部署机器的局域网IP:7456`，例如 `http://192.168.1.100:7456`。Windows 可用 `ipconfig` 查看 IPv4 地址。若其他电脑无法访问，检查是否在同一网络，并在宿主机防火墙中允许可信局域网访问 TCP 7456。

这是单用户、共享数据库的本地部署，沿用原项目无账户的使用方式；同一实例的访问者共享角色、记录和 LLM 配置。只应开放给可信局域网，不要直接映射到公网。API 密钥保存在服务端数据卷中，不写入镜像或前端构建；设置页有管理密钥的能力，因此能访问页面的人也具有管理权限。

## 3. 使用

1. 打开“设置”，添加兼容 OpenAI API 的 LLM 配置，填写服务地址、模型和自己的密钥，测试连接并设为默认。可分别为对话建议和复盘指定配置。
2. 打开“角色管理”创建角色，查看已有角色画像。
3. 打开“历史对话”选择已有会话，查看文字记录，使用原有建议卡片生成、复制和采用建议，也可生成复盘、查看剧情树。
4. 新数据库会按原项目逻辑加载示例角色和会话，方便体验。后续接入 QQ/微信前，本版本不会自动收取聊天消息，也不提供手动输入框。空会话不会凭空产生真实聊天记录。

云端 AI 功能仍需相应服务和有效配置；网页容器化不包含免费 AI 服务。容器内的 `localhost` 指容器自身；若 LLM 服务运行在 Windows 宿主机，可在服务地址中使用 `host.docker.internal` 并确认宿主服务允许相应访问。

通过普通 HTTP 局域网 IP 访问时，部分浏览器不开放现代剪贴板 API；复制按钮会使用兼容方式，若浏览器仍拒绝则显示错误，也可以选中文字手动复制。

## 4. 数据、备份与恢复

SQLite 数据库位于容器 `/app/data/livegalgame.db`，由 Compose 的 `livegalgame-data` 命名卷持久化。`docker compose restart`、重新构建、普通 `docker compose down` 不会删除命名卷。

停机后备份整个数据目录，避免遗漏 SQLite 的 WAL 文件：

```powershell
docker compose stop livegalgame
docker compose cp livegalgame:/app/data ./livegalgame-backup
docker compose start livegalgame
```

备份包含会话和 LLM 密钥，应妥善保存，不要提交到仓库。

迁移旧桌面数据库时，先退出旧程序，再复制其数据库及同目录存在的 `livegalgame.db-wal`、`livegalgame.db-shm` 到备份目录。停止网页服务后，用 `docker compose cp ./旧数据备份/. livegalgame:/app/data/` 导入，再启动；覆盖前先备份网页端现有数据。旧录音文件无需复制，旧音频表不会再被调用。确保导入文件可由容器 node 用户读写。

**不要执行 `docker compose down -v`，除非确实要永久删除此实例的数据卷。**

## 5. 更新与停止

```powershell
# 更新代码并备份数据后，重新构建启动
docker compose up -d --build

# 停止并移除容器，保留数据卷
docker compose down
```

若 7456 已被占用，可把 `compose.yaml` 的映射左侧改为其他宿主端口，例如 `7457:7456`，然后访问 7457。

## 6. 不使用 Docker 的开发方式

本次本机验证包括前端构建、隔离 HTTP/SQLite/AI 集成测试，以及 Chrome 无头浏览器操作检查。当前环境未安装 Docker，未实测镜像构建和容器启动；仓库 CI 已配置 Compose 构建、启动及健康检查，但交付时未触发或核实远程 CI 结果。

使用 Node.js 22 和 pnpm 9.15.9，在 `desktop` 目录执行：

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

访问 http://localhost:7456 。开发热更新时，在两个终端分别运行 `pnpm run dev:server` 和 `pnpm dev`，访问 http://localhost:5173 ，Vite 会代理 API 到 7456。`pnpm test` 使用临时数据库和隔离的本机测试服务，不调用真实外部 AI，结束后自动清理测试数据。

如果复用了旧 Electron 的 node_modules，SQLite 二进制可能不匹配 Node.js；需重新安装依赖或执行 `pnpm rebuild better-sqlite3`。
